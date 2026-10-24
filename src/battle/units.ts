// Grille des unités : caractéristiques de base, rangs, améliorations, âges.
// Les valeurs ont été ajustées par le tournoi automatique (scripts/balance.ts).
import { AGE_BONUS, TIER_PER_LEVEL, levelFromPoints, type UnitKind } from '../data/curriculum'

export type BattleKind = UnitKind | 'villager'
export type UnitClass = 'infantry' | 'cavalry' | 'archer' | 'siege' | 'monk' | 'villager'

export interface UnitStats {
  label: string
  /** Bonnes réponses nécessaires pour former une unité. */
  cost: number
  hp: number
  attack: number
  /** Armure contre les coups au corps à corps. */
  armor: number
  /** Armure contre les flèches. */
  pierce: number
  /** Nature des dégâts infligés. */
  dmg: 'melee' | 'pierce' | 'siege'
  /** Portée d'attaque (mètres) ; ~1 = corps à corps. */
  range: number
  /** Portée minimale (engins de siège). */
  minRange?: number
  /** Vitesse de déplacement (mètres / seconde). */
  speed: number
  /** Temps entre deux attaques (secondes). */
  reload: number
  /** Rayon des dégâts de zone (engins de siège). */
  splash?: number
  /** Bonus de dégâts contre certaines classes. */
  bonus?: Partial<Record<UnitClass, number>>
  cls: UnitClass
  /** Moines : chance de conversion par tentative, durée d'une tentative, soin par seconde. */
  convert?: { chance: number; channel: number; cooldown: number; heal: number }
  /** Rayon du corps (m), pour l'espacement. */
  radius: number
}

export const UNIT_STATS: Record<BattleKind, UnitStats> = {
  villager: { label: 'Villageois', cost: 1, hp: 25, attack: 3, armor: 0, pierce: 0, dmg: 'melee', range: 0.9, speed: 1.0, reload: 1.5, cls: 'villager', radius: 0.45 },
  infantry: { label: 'Infanterie', cost: 1, hp: 50, attack: 7, armor: 1, pierce: 0, dmg: 'melee', range: 0.9, speed: 1.0, reload: 1.5, cls: 'infantry', bonus: { siege: 5, monk: 3 }, radius: 0.45 },
  spear: { label: 'Lanciers', cost: 1, hp: 38, attack: 4, armor: 0, pierce: 0, dmg: 'melee', range: 1.3, speed: 1.0, reload: 1.5, cls: 'infantry', bonus: { cavalry: 12, siege: 6, monk: 4 }, radius: 0.45 },
  archer: { label: 'Archers', cost: 1, hp: 33, attack: 5, armor: 0, pierce: 0, dmg: 'pierce', range: 9, speed: 0.95, reload: 1.8, cls: 'archer', bonus: { infantry: 3, monk: 3 }, radius: 0.42 },
  scout: { label: 'Éclaireurs', cost: 1, hp: 76, attack: 7, armor: 1, pierce: 2, dmg: 'melee', range: 1.0, speed: 1.8, reload: 1.8, cls: 'cavalry', bonus: { archer: 5, siege: 10, monk: 13 }, radius: 0.7 },
  knight: { label: 'Chevaliers', cost: 2, hp: 145, attack: 11, armor: 2, pierce: 2, dmg: 'melee', range: 1.0, speed: 1.4, reload: 1.8, cls: 'cavalry', radius: 0.75 },
  siege: { label: 'Engins de siège', cost: 3, hp: 70, attack: 16, armor: 1, pierce: 6, dmg: 'siege', range: 20, minRange: 3, speed: 0.6, reload: 6, splash: 1.8, cls: 'siege', bonus: { archer: 6, infantry: 4, cavalry: 2 }, radius: 0.9 },
  monk: { label: 'Moines', cost: 2, hp: 48, attack: 0, armor: 0, pierce: 0, dmg: 'melee', range: 6, speed: 0.8, reload: 0, cls: 'monk', convert: { chance: 0.37, channel: 3.5, cooldown: 7, heal: 1.8 }, radius: 0.42 },
}

/** Rangs (1 = recrue, 2 = vétéran, 3 = élite) : multiplicateur de PV, bonus d'attaque et d'armure. */
const TIER_MOD = [
  { hp: 1, attack: 0, armor: 0, pierce: 0 },
  { hp: 1, attack: 0, armor: 0, pierce: 0 },
  { hp: 1.3, attack: 2, armor: 1, pierce: 1 },
  { hp: 1.6, attack: 4, armor: 2, pierce: 2 },
]

export interface Combatant extends UnitStats {
  kind: BattleKind
  tier: number
  upgrades: number
}

/** Caractéristiques effectives d'une unité selon son rang, ses améliorations et l'âge de son camp. */
export function combatant(kind: BattleKind, tier: number, upgrades: number, age: number): Combatant {
  const realKind: BattleKind = tier === 0 ? 'villager' : kind
  const base = UNIT_STATS[realKind]
  const t = TIER_MOD[tier] ?? TIER_MOD[1]
  const s: Combatant = {
    ...base,
    bonus: { ...base.bonus },
    convert: base.convert && { ...base.convert },
    kind: realKind, tier, upgrades,
    hp: base.hp * t.hp,
    attack: base.attack > 0 ? base.attack + t.attack : 0,
    armor: base.armor + t.armor,
    pierce: base.pierce + t.pierce,
  }
  if (realKind !== 'villager') applyUpgrades(s, realKind, upgrades)
  const ageMul = 1 + AGE_BONUS * age
  s.hp = Math.round(s.hp * ageMul)
  s.attack = Math.round(s.attack * ageMul * 10) / 10
  return s
}

function applyUpgrades(s: Combatant, kind: BattleKind, n: number) {
  if (kind === 'monk') {
    if (n >= 1) s.hp += 20
    if (n >= 2 && s.convert) s.convert.chance += 0.1
    if (n >= 3 && s.convert) { s.convert.channel *= 0.7; s.convert.heal *= 2 }
    return
  }
  if (kind === 'siege') {
    if (n >= 1) { s.armor += 2; s.pierce += 2; s.hp += 20 }
    if (n >= 2) s.attack += 6
    if (n >= 3) s.range += 2
    return
  }
  // Tous les autres : armure, puis attaque, puis effet propre.
  if (n >= 1) { s.armor += 2; s.pierce += 1 }
  if (n >= 2) s.attack += 2
  if (n >= 3) {
    if (kind === 'infantry') { s.speed *= 1.15; s.hp *= 1.1 }
    if (kind === 'spear') { s.bonus = { ...s.bonus, cavalry: (s.bonus?.cavalry ?? 0) + 4 }; s.range += 0.3 }
    if (kind === 'archer') s.range += 1.5
    if (kind === 'knight' || kind === 'scout') s.speed *= 1.2
  }
}

/** Bonnes réponses par unité pour une maison : tant qu'elle est au cran 0, elle forme des villageois (1 chacun). */
export function unitCost(kind: UnitKind, points: number): number {
  return TIER_PER_LEVEL[levelFromPoints(points)] === 0 ? 1 : UNIT_STATS[kind].cost
}

/** Nombre d'unités formées par une maison : une unité toutes les « coût » bonnes réponses. */
export function figuresFor(kind: UnitKind, points: number): number {
  return Math.floor(points / unitCost(kind, points))
}

/** Bonnes réponses manquantes avant la prochaine unité. */
export function pointsToNextUnit(kind: UnitKind, points: number): number {
  const cost = unitCost(kind, points)
  return cost - (points % cost)
}

/** Forces et faiblesses (issues du tournoi d'équilibrage, à coût égal). */
export const COUNTERS: Record<UnitKind, { strong: UnitKind[]; weak: UnitKind[] }> = {
  infantry: { strong: ['spear', 'siege'], weak: ['archer', 'scout', 'knight', 'monk'] },
  spear: { strong: ['knight', 'scout', 'siege'], weak: ['infantry', 'archer', 'monk'] },
  archer: { strong: ['infantry', 'spear', 'monk'], weak: ['scout', 'knight', 'siege'] },
  scout: { strong: ['infantry', 'archer', 'siege', 'monk'], weak: ['spear', 'knight'] },
  knight: { strong: ['infantry', 'archer', 'scout', 'siege'], weak: ['spear', 'monk'] },
  siege: { strong: ['archer', 'monk'], weak: ['infantry', 'spear', 'scout', 'knight'] },
  monk: { strong: ['infantry', 'spear', 'knight'], weak: ['archer', 'scout', 'siege'] },
}

const KIND_NAMES: Record<UnitKind, string> = {
  infantry: 'infanterie', spear: 'lanciers', archer: 'archers', scout: 'éclaireurs', knight: 'chevaliers', siege: 'engins de siège', monk: 'moines',
}
export const kindName = (k: UnitKind) => KIND_NAMES[k]

/** Forces et faiblesses en toutes lettres (panneau de commande). */
export const MATCHUPS = Object.fromEntries(
  (Object.keys(COUNTERS) as UnitKind[]).map((k) => [k, { strong: COUNTERS[k].strong.map(kindName).join(', '), weak: COUNTERS[k].weak.map(kindName).join(', ') }]),
) as Record<UnitKind, { strong: string; weak: string }>

/** Particularité de chaque unité, en une ligne. */
export const SPECIALS: Record<UnitKind, string> = {
  infantry: 'Solide et polyvalente ; +5 contre les engins de siège.',
  spear: '+12 contre la cavalerie : le cauchemar des chevaliers.',
  archer: 'Tire de loin (9 m) ; +3 contre les fantassins.',
  scout: 'La plus rapide ; +5 contre les archers, +10 contre le siège, +13 contre les moines.',
  knight: 'Charge lourde : beaucoup de points de vie et d’attaque.',
  siege: 'Artillerie : tire à 20 m, dégâts de zone (3 ennemis au plus), mais très lente et fragile au contact.',
  monk: 'Ne frappe pas : convertit l’ennemi (37 % par prière) et soigne ses alliés.',
}
