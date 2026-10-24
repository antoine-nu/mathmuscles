// Simulation de bataille : déploiement, ciblage, déplacements (avec un peu d'aléatoire et d'espacement),
// combats au contact, tirs, dégâts de zone, conversions et soins des moines, cor de guerre.
// Pure (aucune dépendance au DOM) et déterministe à partir d'une graine : le même calcul sert à l'écran,
// au réseau (l'hôte simule, l'invité reçoit des images) et au tournoi d'équilibrage.
import type { ArmySpec } from '../game/state'
import { UNIT_STATS, combatant, type BattleKind, type Combatant, type UnitClass } from './units'

export const FIELD_W = 64
export const FIELD_H = 40
export const DT = 0.05
export const MAX_DURATION = 150
const SPLASH_MAX = 3
export const HORN_DURATION = 5
export const HORN_MAX = 3

export type Side = 0 | 1

export interface BUnit {
  id: number
  side: Side
  /** Camp d'origine (avant une éventuelle conversion). */
  origin: Side
  regiment: string
  kind: BattleKind
  tier: number
  upgrades: number
  s: Combatant
  x: number
  y: number
  hp: number
  maxHp: number
  target: number
  cooldown: number
  retarget: number
  /** 0 marche/attente, 1 frappe, 2 mort, 3 prière (conversion). */
  state: number
  /** Temps depuis la dernière frappe (animation). */
  swing: number
  facing: 1 | -1
  deadAt: number
  channel: number
  convertCd: number
  phase: number
  kills: number
  conversions: number
  /** Unité qui l'a tuée ou convertie (0 si aucune). */
  lostTo: number
}

export interface Projectile {
  id: number
  kind: 'arrow' | 'stone'
  side: Side
  from: number
  target: number
  x0: number
  y0: number
  x1: number
  y1: number
  t0: number
  dur: number
  damage: number
  bonus: Partial<Record<UnitClass, number>>
  splash: number
  dmg: Combatant['dmg']
}

export type BattleEvent =
  | { t: number; type: 'death'; id: number }
  | { t: number; type: 'convert'; id: number; by: number; side: Side }
  | { t: number; type: 'horn'; side: Side }
  | { t: number; type: 'impact'; x: number; y: number; big: boolean }

export interface BattleResult {
  winner: Side | -1
  duration: number
  survivors: [number, number]
  losses: [number, number]
  conversions: [number, number]
  /** Régiment le plus meurtrier de chaque camp. */
  heroes: [string | null, string | null]
  /** Bilan par régiment, pour comprendre la bataille après coup. */
  regiments: [RegimentReport[], RegimentReport[]]
}

export interface RegimentReport {
  /** Identifiant du régiment (chapitre). */
  id: string
  deployed: number
  survived: number
  /** Ennemis tués et convertis par ce régiment. */
  kills: number
  /** Régiment ennemi qui lui a fait le plus de pertes, et combien. */
  nemesis: string | null
  nemesisCount: number
}

/** Générateur pseudo-aléatoire reproductible (mulberry32). */
export function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const LINE_OF: Record<BattleKind, 'front' | 'mid' | 'back' | 'flank'> = {
  villager: 'front', infantry: 'front', spear: 'front', archer: 'mid', siege: 'back', monk: 'back', knight: 'flank', scout: 'flank',
}

export class Battle {
  t = 0
  units: BUnit[] = []
  projectiles: Projectile[] = []
  events: BattleEvent[] = []
  horn: [number, number] = [-1, -1]
  hornsUsed: [number, number] = [0, 0]
  result: BattleResult | null = null
  private rand: () => number
  private nextProj = 1
  private grid = new Map<number, BUnit[]>()

  constructor(armies: [ArmySpec, ArmySpec], seed: number) {
    this.rand = rng(seed)
    let id = 1
    armies.forEach((army, sideIdx) => {
      const side = sideIdx as Side
      const groups: Record<'front' | 'mid' | 'back' | 'flank', BUnit[]> = { front: [], mid: [], back: [], flank: [] }
      for (const reg of army.regiments) {
        for (let i = 0; i < reg.figures; i++) {
          const kind: BattleKind = reg.tier === 0 ? 'villager' : reg.kind
          const s = combatant(reg.kind, reg.tier, reg.upgrades, army.age)
          const u: BUnit = {
            id: id++, side, origin: side, regiment: reg.chapterId, kind, tier: reg.tier, upgrades: reg.upgrades, s,
            x: 0, y: 0, hp: s.hp, maxHp: s.hp, target: -1, cooldown: this.rand() * s.reload, retarget: this.rand() * 0.5,
            state: 0, swing: 9, facing: side === 0 ? 1 : -1, deadAt: 0, channel: 0, convertCd: 0,
            phase: this.rand() * Math.PI * 2, kills: 0, conversions: 0, lostTo: 0,
          }
          groups[LINE_OF[kind]].push(u)
          this.units.push(u)
        }
      }
      this.deploy(side, groups)
    })
  }

  /** Déploiement à la manière d'AoE : fantassins devant, tireurs derrière, siège et moines au fond, cavalerie sur les ailes. */
  private deploy(side: Side, g: Record<'front' | 'mid' | 'back' | 'flank', BUnit[]>) {
    const mirror = (x: number) => (side === 0 ? x : FIELD_W - x)
    const block = (list: BUnit[], x0: number, yMid: number, maxRows: number, spacing: number) => {
      const rows = Math.min(maxRows, Math.max(1, list.length))
      list.forEach((u, i) => {
        const col = Math.floor(i / rows)
        const row = i % rows
        const n = Math.min(rows, list.length - col * rows)
        const y = yMid + (row - (n - 1) / 2) * spacing
        u.x = mirror(x0 - col * spacing) + (this.rand() - 0.5) * 0.5
        u.y = y + (this.rand() - 0.5) * 0.5
      })
    }
    block(g.front, 17, FIELD_H / 2, 16, 1.35)
    block(g.mid, 12, FIELD_H / 2, 16, 1.25)
    block(g.back, 9, FIELD_H / 2, 10, 1.9)
    const top = g.flank.filter((_, i) => i % 2 === 0)
    const bottom = g.flank.filter((_, i) => i % 2 === 1)
    block(top, 14, 7, 4, 1.7)
    block(bottom, 14, FIELD_H - 7, 4, 1.7)
  }

  alive(side?: Side) {
    return this.units.filter((u) => u.state !== 2 && (side === undefined || u.side === side))
  }

  blowHorn(side: Side): boolean {
    if (this.result || this.hornsUsed[side] >= HORN_MAX) return false
    this.hornsUsed[side]++
    this.horn[side] = this.t + HORN_DURATION
    this.events.push({ t: this.t, type: 'horn', side })
    return true
  }

  // ── Boucle ──
  step() {
    if (this.result) return
    this.t += DT
    this.buildGrid()
    for (const u of this.units) if (u.state !== 2) this.think(u)
    this.updateProjectiles()
    this.checkEnd()
  }

  run(maxT = MAX_DURATION + 1) {
    while (!this.result && this.t < maxT) this.step()
    return this.result
  }

  private cell(x: number, y: number) {
    return Math.floor(x / 2) * 1000 + Math.floor(y / 2)
  }

  private buildGrid() {
    this.grid.clear()
    for (const u of this.units) {
      if (u.state === 2) continue
      const k = this.cell(u.x, u.y)
      const list = this.grid.get(k)
      if (list) list.push(u)
      else this.grid.set(k, [u])
    }
  }

  private neighbors(x: number, y: number, r: number): BUnit[] {
    const out: BUnit[] = []
    const c0 = Math.floor((x - r) / 2), c1 = Math.floor((x + r) / 2)
    const r0 = Math.floor((y - r) / 2), r1 = Math.floor((y + r) / 2)
    for (let cx = c0; cx <= c1; cx++) for (let cy = r0; cy <= r1; cy++) {
      const list = this.grid.get(cx * 1000 + cy)
      if (list) for (const u of list) out.push(u)
    }
    return out
  }

  private byId(id: number): BUnit | undefined {
    return this.units[id - 1]
  }

  private bonusAgainst(attacker: Combatant, target: BUnit): number {
    return attacker.bonus?.[target.s.cls] ?? 0
  }

  private pickTarget(u: BUnit): number {
    const foes = this.units.filter((e) => e.state !== 2 && e.side !== u.side)
    if (!foes.length) return -1
    // nombre d'attaquants déjà sur chaque cible, pour étaler les combats
    const pressure = new Map<number, number>()
    for (const a of this.units) if (a.state !== 2 && a.side === u.side && a.target > 0) pressure.set(a.target, (pressure.get(a.target) ?? 0) + 1)
    let best = -1, bestScore = Infinity
    for (const e of foes) {
      const d = Math.hypot(e.x - u.x, e.y - u.y)
      let pref = 1 + this.bonusAgainst(u.s, e) / 8
      if (u.kind === 'monk') pref = e.kind === 'knight' || e.kind === 'siege' ? 2.2 : e.kind === 'monk' ? 0.01 : 1
      if (u.kind === 'siege') pref *= 1 + this.neighbors(e.x, e.y, 2.2).filter((n) => n.side !== u.side).length * 0.25
      const score = (d * (1 + 0.18 * (pressure.get(e.id) ?? 0))) / pref + this.rand() * 0.8
      if (score < bestScore) { bestScore = score; best = e.id }
    }
    return best
  }

  private think(u: BUnit) {
    const s = u.s
    u.swing += DT
    u.retarget -= DT
    if (u.convertCd > 0) u.convertCd -= DT
    let target = u.target > 0 ? this.byId(u.target) : undefined
    if (!target || target.state === 2 || target.side === u.side || u.retarget <= 0) {
      u.target = this.pickTarget(u)
      u.retarget = 0.45 + this.rand() * 0.3
      target = u.target > 0 ? this.byId(u.target) : undefined
      if (!target) { u.state = 0; return }
    }
    const dx = target.x - u.x, dy = target.y - u.y
    const dist = Math.hypot(dx, dy) || 0.001
    const reach = s.range + s.radius + target.s.radius
    u.facing = dx >= 0 ? 1 : -1

    // Moines : prière de conversion, sinon soins.
    if (u.kind === 'monk' && s.convert) {
      const c = s.convert
      if (u.convertCd <= 0 && dist <= reach && target.kind !== 'monk') {
        u.state = 3
        u.channel += DT
        if (u.channel >= c.channel) {
          u.channel = 0
          u.convertCd = c.cooldown
          if (this.rand() < c.chance) {
            target.side = u.side
            if (!target.lostTo) target.lostTo = u.id
            target.target = -1
            target.retarget = 0
            u.conversions++
            this.events.push({ t: this.t, type: 'convert', id: target.id, by: u.id, side: u.side })
          }
        }
        return
      }
      u.channel = 0
      u.state = 0
      if (u.convertCd > 0) {
        // soigne l'allié le plus blessé à proximité
        const hurt = this.neighbors(u.x, u.y, 4).filter((a) => a.side === u.side && a.state !== 2 && a.hp < a.maxHp && a.kind !== 'siege')
        hurt.sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)
        if (hurt[0]) hurt[0].hp = Math.min(hurt[0].maxHp, hurt[0].hp + c.heal * DT * 4)
      }
      const keep = u.convertCd > 0 ? s.range + 3 : reach - 0.3
      this.move(u, dx / dist, dy / dist, dist > keep ? 1 : dist < keep - 1.5 ? -0.6 : 0)
      return
    }

    const tooClose = s.minRange !== undefined && dist < s.minRange
    if (dist <= reach && !tooClose) {
      u.state = 1
      this.move(u, 0, 0, 0)
      u.cooldown -= DT
      if (u.cooldown <= 0) {
        u.cooldown = s.reload * (0.9 + this.rand() * 0.2)
        u.swing = 0
        this.attack(u, target, dist)
      }
      return
    }
    u.state = 0
    // Les tireurs tiennent leur position face à une troupe de mêlée qui charge : ils la laissent venir.
    const ranged = s.range > 2
    const charging = target.state === 0 && target.s.range <= 2 && target.target > 0 && this.byId(target.target)?.side === u.side
    // l'artillerie avance jusqu'à portée de tir, puis reste en batterie
    const hold = u.kind === 'siege' ? dist < s.range + 1 : ranged && charging && dist < s.range + 14
    this.move(u, dx / dist, dy / dist, tooClose ? -0.7 : hold ? 0 : 1)
  }

  private move(u: BUnit, nx: number, ny: number, dir: number) {
    const buff = this.horn[u.side] > this.t ? 1.12 : 1
    const speed = u.s.speed * buff
    // errance perpendiculaire : les troupes ne marchent pas au cordeau
    const wobble = Math.sin(this.t * 1.7 + u.phase) * 0.35
    let vx = (nx - ny * wobble) * speed * dir
    let vy = (ny + nx * wobble) * speed * dir
    // séparation : on évite de s'empiler
    for (const o of this.neighbors(u.x, u.y, 2)) {
      if (o === u) continue
      const ox = u.x - o.x, oy = u.y - o.y
      const d = Math.hypot(ox, oy) || 0.01
      const min = (u.s.radius + o.s.radius) * 1.05
      if (d < min) {
        const push = ((min - d) / min) * (o.side === u.side ? 2.2 : 3)
        vx += (ox / d) * push
        vy += (oy / d) * push
      }
    }
    u.x = Math.max(1, Math.min(FIELD_W - 1, u.x + vx * DT))
    u.y = Math.max(1, Math.min(FIELD_H - 1, u.y + vy * DT))
  }

  private damageOf(attacker: { side: Side }, attack: number, bonus: Partial<Record<UnitClass, number>>, target: BUnit, dmg: Combatant['dmg']) {
    const horn = this.horn[attacker.side] > this.t ? 1.25 : 1
    const armor = dmg === 'pierce' ? target.s.pierce : dmg === 'siege' ? target.s.armor / 2 : target.s.armor
    const raw = attack + (bonus[target.s.cls] ?? 0) - armor
    return Math.max(1, raw) * (0.8 + this.rand() * 0.4) * horn
  }

  private hit(target: BUnit, dmg: number, attackerId: number) {
    if (target.state === 2) return
    target.hp -= dmg
    if (target.hp <= 0) {
      target.hp = 0
      target.state = 2
      target.deadAt = this.t
      const killer = this.byId(attackerId)
      if (killer) killer.kills++
      if (!target.lostTo) target.lostTo = attackerId
      this.events.push({ t: this.t, type: 'death', id: target.id })
    }
  }

  private attack(u: BUnit, target: BUnit, dist: number) {
    const s = u.s
    if (u.kind === 'archer' || u.kind === 'siege') {
      const stone = u.kind === 'siege'
      const lead = stone ? 0 : 0.3
      this.projectiles.push({
        id: this.nextProj++, kind: stone ? 'stone' : 'arrow', side: u.side, from: u.id, target: target.id,
        x0: u.x, y0: u.y, x1: target.x + (this.rand() - 0.5) * lead, y1: target.y + (this.rand() - 0.5) * lead,
        t0: this.t, dur: dist / (stone ? 9 : 15) + 0.15, damage: s.attack, bonus: s.bonus ?? {}, splash: s.splash ?? 0, dmg: s.dmg,
      })
      return
    }
    this.hit(target, this.damageOf(u, s.attack, s.bonus ?? {}, target, s.dmg), u.id)
  }

  private updateProjectiles() {
    const keep: Projectile[] = []
    for (const p of this.projectiles) {
      if (this.t < p.t0 + p.dur) { keep.push(p); continue }
      if (p.kind === 'arrow') {
        const target = this.byId(p.target)
        // la flèche touche si la cible est encore à proximité du point visé
        if (target && target.state !== 2 && target.side !== p.side && Math.hypot(target.x - p.x1, target.y - p.y1) < 1.6 && this.rand() < 0.92) {
          this.hit(target, this.damageOf(p, p.damage, p.bonus, target, p.dmg), p.from)
        }
      } else {
        this.events.push({ t: this.t, type: 'impact', x: p.x1, y: p.y1, big: true })
        // la zone touche au plus SPLASH_MAX ennemis (les plus proches du point d'impact) : sinon l'artillerie
        // devient écrasante contre les très grandes armées serrées
        const hits: { e: BUnit; d: number }[] = []
        for (const e of this.neighbors(p.x1, p.y1, p.splash + 1)) {
          if (e.side === p.side || e.state === 2) continue
          const d = Math.hypot(e.x - p.x1, e.y - p.y1)
          if (d <= p.splash + e.s.radius) hits.push({ e, d })
        }
        hits.sort((a, b) => a.d - b.d)
        for (const { e, d } of hits.slice(0, SPLASH_MAX)) {
          const fall = d <= 0.8 ? 1 : 0.6
          this.hit(e, this.damageOf(p, p.damage, p.bonus, e, p.dmg) * fall, p.from)
        }
      }
    }
    this.projectiles = keep
  }

  private value(side: Side) {
    return this.units.reduce((s, u) => (u.state !== 2 && u.side === side ? s + UNIT_STATS[u.kind].cost * (0.35 + 0.65 * (u.hp / u.maxHp)) : s), 0)
  }

  private checkEnd() {
    const a = this.alive(0).length, b = this.alive(1).length
    let winner: Side | -1 | null = null
    if (a === 0 || b === 0) winner = a === 0 && b === 0 ? -1 : a === 0 ? 1 : 0
    else if (this.t >= MAX_DURATION) {
      const va = this.value(0), vb = this.value(1)
      winner = Math.abs(va - vb) < 0.01 ? -1 : va > vb ? 0 : 1
    }
    if (winner === null) return
    const losses: [number, number] = [0, 0]
    const conv: [number, number] = [0, 0]
    const kills: [Map<string, number>, Map<string, number>] = [new Map(), new Map()]
    for (const u of this.units) {
      if (u.state === 2 || u.side !== u.origin) losses[u.origin]++
      conv[u.side] += u.conversions
      kills[u.origin].set(u.regiment, (kills[u.origin].get(u.regiment) ?? 0) + u.kills + u.conversions)
    }
    const hero = (m: Map<string, number>) => {
      let best: string | null = null, n = 0
      for (const [k, v] of m) if (v > n) { n = v; best = k }
      return best
    }
    this.result = { winner, duration: this.t, survivors: [a, b], losses, conversions: conv, heroes: [hero(kills[0]), hero(kills[1])], regiments: [this.report(0), this.report(1)] }
  }

  private report(side: Side): RegimentReport[] {
    const out = new Map<string, RegimentReport & { by: Map<string, number> }>()
    for (const u of this.units) {
      if (u.origin !== side) continue
      let r = out.get(u.regiment)
      if (!r) out.set(u.regiment, (r = { id: u.regiment, deployed: 0, survived: 0, kills: 0, nemesis: null, nemesisCount: 0, by: new Map() }))
      r.deployed++
      r.kills += u.kills + u.conversions
      const lost = u.state === 2 || u.side !== u.origin
      if (!lost) r.survived++
      const killer = lost && u.lostTo ? this.byId(u.lostTo) : undefined
      if (killer && killer.origin !== side) r.by.set(killer.regiment, (r.by.get(killer.regiment) ?? 0) + 1)
    }
    return [...out.values()].map(({ by, ...r }) => {
      for (const [id, n] of by) if (n > r.nemesisCount) { r.nemesis = id; r.nemesisCount = n }
      return r
    })
  }
}
