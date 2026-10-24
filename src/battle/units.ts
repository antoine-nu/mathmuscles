// Grille des unités : caractéristiques de base, rangs, améliorations, âges.
// Les valeurs ont été ajustées par le tournoi automatique (scripts/balance.ts).
import { AGE_BONUS, type UnitKind } from '../data/curriculum'

export type BattleKind = UnitKind | 'villager'
export type UnitClass = 'infantry' | 'cavalry' | 'archer' | 'siege' | 'monk' | 'villager'

export interface UnitStats {
  label: string
  /** Part d'effectif consommée par une unité (1 = un soldat à pied). */
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
  infantry: { label: 'Infanterie', cost: 1, hp: 55, attack: 7, armor: 1, pierce: 0, dmg: 'melee', range: 0.9, speed: 1.0, reload: 1.5, cls: 'infantry', bonus: { siege: 5, monk: 3 }, radius: 0.45 },
  spear: { label: 'Lanciers', cost: 1, hp: 45, attack: 4, armor: 0, pierce: 0, dmg: 'melee', range: 1.3, speed: 1.0, reload: 1.5, cls: 'infantry', bonus: { cavalry: 12, siege: 6, monk: 4 }, radius: 0.45 },
  archer: { label: 'Archers', cost: 1, hp: 30, attack: 5, armor: 0, pierce: 0, dmg: 'pierce', range: 9, speed: 0.95, reload: 1.8, cls: 'archer', bonus: { infantry: 3, monk: 3 }, radius: 0.42 },
  scout: { label: 'Éclaireurs', cost: 1.25, hp: 88, attack: 8, armor: 1, pierce: 2, dmg: 'melee', range: 1.0, speed: 1.8, reload: 1.8, cls: 'cavalry', bonus: { archer: 6, siege: 12, monk: 10 }, radius: 0.7 },
  knight: { label: 'Chevaliers', cost: 2, hp: 140, attack: 11, armor: 2, pierce: 2, dmg: 'melee', range: 1.0, speed: 1.4, reload: 1.8, cls: 'cavalry', radius: 0.75 },
  siege: { label: 'Engins de siège', cost: 3, hp: 70, attack: 22, armor: 1, pierce: 6, dmg: 'siege', range: 11, minRange: 2.5, speed: 0.5, reload: 5, splash: 1.8, cls: 'siege', bonus: { archer: 6, infantry: 4, cavalry: 2 }, radius: 0.9 },
  monk: { label: 'Moines', cost: 2, hp: 40, attack: 0, armor: 0, pierce: 0, dmg: 'melee', range: 6, speed: 0.8, reload: 0, cls: 'monk', convert: { chance: 0.35, channel: 3.5, cooldown: 7, heal: 1.5 }, radius: 0.42 },
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

/** Nombre de figurines pour un effectif donné (les unités coûteuses viennent en moins grand nombre). */
export function figuresFor(kind: UnitKind, tier: number, soldiers: number): number {
  if (tier === 0) return soldiers
  return Math.max(1, Math.round(soldiers / UNIT_STATS[kind].cost))
}

/** Forces et faiblesses, pour l'affichage (panneau de commande, aide). */
export const MATCHUPS: Record<UnitKind, { strong: string; weak: string }> = {
  infantry: { strong: 'lanciers, éclaireurs, moines', weak: 'archers, chevaliers, engins de siège' },
  spear: { strong: 'chevaliers, éclaireurs, engins de siège', weak: 'infanterie, archers, moines' },
  archer: { strong: 'infanterie, lanciers, moines', weak: 'éclaireurs, chevaliers, engins de siège' },
  scout: { strong: 'archers, engins de siège, moines', weak: 'infanterie, lanciers, chevaliers' },
  knight: { strong: 'infanterie, archers, éclaireurs', weak: 'lanciers, moines' },
  siege: { strong: 'masses de fantassins et d’archers', weak: 'lanciers, éclaireurs, moines' },
  monk: { strong: 'chevaliers, lanciers, engins de siège (conversion)', weak: 'infanterie, archers, éclaireurs' },
}
