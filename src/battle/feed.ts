// Flux d'images de bataille : en local (simulation dans le navigateur, contre l'ordinateur ou côté hôte)
// ou à distance (l'invité reçoit des instantanés compacts de l'hôte et interpole entre eux).
import { Battle, DT, type BattleEvent, type BattleResult, type Side } from './sim'
import type { BattleKind } from './units'

export interface UnitMeta {
  id: number
  kind: BattleKind
  tier: number
  upgrades: number
  origin: Side
  regiment: string
  maxHp: number
}

export interface UnitFrame {
  id: number
  side: Side
  x: number
  y: number
  hp: number
  state: number
  swing: number
  facing: 1 | -1
  deadAt: number
  /** Cible d'un moine en prière (pour le rayon doré). */
  target: number
}

export interface ProjFrame {
  id: number
  kind: 'arrow' | 'stone'
  x0: number
  y0: number
  x1: number
  y1: number
  t0: number
  dur: number
}

export interface Frame {
  t: number
  units: UnitFrame[]
  projectiles: ProjFrame[]
  horn: [number, number]
  hornsUsed: [number, number]
}

export interface Feed {
  meta: UnitMeta[]
  /** Image courante (interpolée si besoin). */
  frame(): Frame
  /** Événements survenus depuis le dernier appel. */
  drain(): BattleEvent[]
  result(): BattleResult | null
}

export const metaOf = (b: Battle): UnitMeta[] =>
  b.units.map((u) => ({ id: u.id, kind: u.kind, tier: u.tier, upgrades: u.upgrades, origin: u.origin, regiment: u.regiment, maxHp: u.maxHp }))

export function frameOf(b: Battle): Frame {
  return {
    t: b.t,
    units: b.units.map((u) => ({ id: u.id, side: u.side, x: u.x, y: u.y, hp: u.hp, state: u.state, swing: u.swing, facing: u.facing, deadAt: u.deadAt, target: u.state === 3 ? u.target : 0 })),
    projectiles: b.projectiles.map((p) => ({ id: p.id, kind: p.kind, x0: p.x0, y0: p.y0, x1: p.x1, y1: p.y1, t0: p.t0, dur: p.dur })),
    horn: [...b.horn] as [number, number],
    hornsUsed: [...b.hornsUsed] as [number, number],
  }
}

/** Simulation exécutée ici ; avance au rythme du temps réel (× vitesse). */
export class LocalFeed implements Feed {
  meta: UnitMeta[]
  speed = 1
  running = false
  private acc = 0
  private cursor = 0
  constructor(public battle: Battle) {
    this.meta = metaOf(battle)
  }
  advance(realDt: number) {
    if (!this.running || this.battle.result) return
    this.acc += Math.min(0.25, realDt) * this.speed
    while (this.acc >= DT && !this.battle.result) {
      this.battle.step()
      this.acc -= DT
    }
  }
  frame() {
    return frameOf(this.battle)
  }
  drain() {
    const ev = this.battle.events.slice(this.cursor)
    this.cursor = this.battle.events.length
    return ev
  }
  /** Événements depuis un index donné (pour l'envoi réseau, indépendant de l'affichage). */
  eventsSince(i: number) {
    return this.battle.events.slice(i)
  }
  result() {
    return this.battle.result
  }
}

// ── Format réseau compact ──────────────────────────────────────────────
export interface Snapshot {
  t: number
  /** Par unité : id, camp, x×100, y×100, pv×10, état, élan×100, orientation, mort×100, cible. */
  u: number[]
  p: number[]
  h: [number, number]
  hu: [number, number]
  ev: BattleEvent[]
  res: BattleResult | null
}

const U_STRIDE = 10
const P_STRIDE = 8

export function encodeSnapshot(f: Frame, events: BattleEvent[], res: BattleResult | null): Snapshot {
  const u: number[] = []
  for (const x of f.units) u.push(x.id, x.side, Math.round(x.x * 100), Math.round(x.y * 100), Math.round(x.hp * 10), x.state, Math.round(Math.min(x.swing, 9) * 100), x.facing, Math.round(x.deadAt * 100), x.target)
  const p: number[] = []
  for (const x of f.projectiles) p.push(x.id, x.kind === 'stone' ? 1 : 0, Math.round(x.x0 * 100), Math.round(x.y0 * 100), Math.round(x.x1 * 100), Math.round(x.y1 * 100), Math.round(x.t0 * 1000), Math.round(x.dur * 1000))
  return { t: Math.round(f.t * 1000) / 1000, u, p, h: f.horn, hu: f.hornsUsed, ev: events, res }
}

export function decodeSnapshot(s: Snapshot): Frame {
  const units: UnitFrame[] = []
  for (let i = 0; i < s.u.length; i += U_STRIDE) {
    const a = s.u
    units.push({ id: a[i], side: a[i + 1] as Side, x: a[i + 2] / 100, y: a[i + 3] / 100, hp: a[i + 4] / 10, state: a[i + 5], swing: a[i + 6] / 100, facing: a[i + 7] as 1 | -1, deadAt: a[i + 8] / 100, target: a[i + 9] })
  }
  const projectiles: ProjFrame[] = []
  for (let i = 0; i < s.p.length; i += P_STRIDE) {
    const a = s.p
    projectiles.push({ id: a[i], kind: a[i + 1] ? 'stone' : 'arrow', x0: a[i + 2] / 100, y0: a[i + 3] / 100, x1: a[i + 4] / 100, y1: a[i + 5] / 100, t0: a[i + 6] / 1000, dur: a[i + 7] / 1000 })
  }
  return { t: s.t, units, projectiles, horn: s.h, hornsUsed: s.hu }
}

/** Côté invité : instantanés reçus de l'hôte, rendus avec un léger retard pour interpoler en douceur. */
export class RemoteFeed implements Feed {
  private prev: { frame: Frame; at: number } | null = null
  private last: { frame: Frame; at: number } | null = null
  private pending: BattleEvent[] = []
  private res: BattleResult | null = null
  /** `initial` : armées déployées (calculées sur place à partir des armées et de la graine), affichées pendant
   *  le compte à rebours avant que l'hôte n'envoie ses premières images. */
  constructor(public meta: UnitMeta[], private initial?: Frame) {}
  push(s: Snapshot) {
    this.prev = this.last
    this.last = { frame: decodeSnapshot(s), at: performance.now() }
    this.pending.push(...s.ev)
    if (s.res) this.res = s.res
  }
  frame(): Frame {
    if (!this.last) return this.initial ?? { t: 0, units: [], projectiles: [], horn: [-1, -1], hornsUsed: [0, 0] }
    if (!this.prev) return this.last.frame
    const span = Math.max(1, this.last.at - this.prev.at)
    const k = Math.min(1.25, (performance.now() - this.last.at) / span)
    const a = this.prev.frame, b = this.last.frame
    const byId = new Map(a.units.map((u) => [u.id, u]))
    const t = a.t + (b.t - a.t) * k
    return {
      ...b,
      t,
      units: b.units.map((u) => {
        const o = byId.get(u.id)
        if (!o || u.state === 2) return u
        const m = Math.min(1, k)
        return { ...u, x: o.x + (u.x - o.x) * m, y: o.y + (u.y - o.y) * m }
      }),
    }
  }
  drain() {
    const ev = this.pending
    this.pending = []
    return ev
  }
  result() {
    return this.res
  }
}
