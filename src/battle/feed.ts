// Flux d'images de bataille : simulation dans le navigateur (contre l'ordinateur, ou en duel des deux côtés).
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
  /** On ne calcule pas au-delà de cet instant (duel, côté invité : si des messages tardent, on attend plutôt que
   *  de calculer une autre bataille que l'hôte). */
  limit = Infinity
  private acc = 0
  private cursor = 0
  constructor(public battle: Battle) {
    this.meta = metaOf(battle)
  }
  advance(realDt: number) {
    if (!this.running || this.battle.result) return
    this.acc += Math.min(0.25, realDt) * this.speed
    while (this.acc >= DT && !this.battle.result && this.battle.t + DT <= this.limit + 1e-9) {
      this.battle.step()
      this.acc -= DT
    }
    // bloqué par la limite : on garde au plus une demi-seconde de retard à rattraper
    this.acc = Math.min(this.acc, 0.5)
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

/**
 * Duel entre camarades : chaque ordinateur calcule la même bataille (mêmes armées, même graine, mêmes cors aux
 * mêmes instants). L'invité la déroule avec un léger retard pour recevoir à temps les cors programmés par l'hôte ;
 * le résultat de l'hôte fait foi s'il arrive.
 */
export class LockstepFeed extends LocalFeed {
  hostResult: BattleResult | null = null
  constructor(battle: Battle) {
    super(battle)
    // instant de bataille jusqu'où l'hôte garantit qu'aucun cor ne reste à recevoir (voir LocalFeed.limit)
    this.limit = 0
  }
  result() {
    const own = this.battle.result
    // contrôle en développement : les deux calculs doivent aboutir au même résultat
    if (import.meta.env.DEV && own && this.hostResult && !this.checked) {
      this.checked = true
      const same = JSON.stringify(own) === JSON.stringify(this.hostResult)
      console.info(same ? 'lockstep: même résultat que l’hôte' : 'lockstep: DÉSACCORD avec l’hôte')
    }
    if (this.hostResult) return own || this.battle.t >= this.hostResult.duration + 3 ? this.hostResult : null
    return own
  }
  private checked = false
}
