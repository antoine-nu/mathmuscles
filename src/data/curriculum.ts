// Programme : niveaux scolaires → chapitres → corps d'armée.
// Chaque chapitre est incarné par un corps d'armée qui grossit avec les exercices réussis.

export type UnitKind = 'infantry' | 'spear' | 'archer' | 'knight' | 'scout' | 'siege' | 'monk'
export type BuildingKind = 'barracks' | 'range' | 'stable' | 'workshop' | 'monastery'

export interface Upgrade {
  id: string
  name: string
  description: string
}

export interface Chapter {
  id: string
  title: string
  topics: string[]
  unit: UnitKind
  building: BuildingKind
  buildingName: string
  corpsName: string
  /** Noms des soldats aux rangs 1, 2 et 3 (le rang 0 est toujours le Villageois). */
  tierNames: [string, string, string]
  color: string
  /** Symbole peint sur les boucliers et bannières. */
  emblem: string
  upgrades: [Upgrade, Upgrade, Upgrade]
}

export interface Level {
  id: string
  label: string
  short: string
  era: string
  tagline: string
  chapters: Chapter[]
}

// Les améliorations ont un effet réel dans la bataille (voir battle/units.ts).
const INFANTRY_UPGRADES: Chapter['upgrades'] = [
  { id: 'mailles', name: 'Cotte de mailles', description: '+2 en armure.' },
  { id: 'forge', name: 'Forge', description: 'Lames trempées : +2 en attaque.' },
  { id: 'etendard', name: 'Étendard', description: 'Le corps marche fièrement : +15 % de vitesse et +10 % de points de vie.' },
]
const SPEAR_UPGRADES: Chapter['upgrades'] = [
  { id: 'mailles', name: 'Cotte de mailles', description: '+2 en armure.' },
  { id: 'forge', name: 'Forge', description: 'Fers de lance trempés : +2 en attaque.' },
  { id: 'piques', name: 'Piques longues', description: 'Frappent plus loin : +4 de bonus contre la cavalerie et allonge accrue.' },
]
const ARCHER_UPGRADES: Chapter['upgrades'] = [
  { id: 'matelassee', name: 'Armure matelassée', description: '+2 en armure.' },
  { id: 'empennage', name: 'Empennage', description: 'Flèches plus tranchantes : +2 en attaque.' },
  { id: 'balistique', name: 'Balistique', description: 'Les tirs anticipent la cible : +1,5 de portée.' },
]
const CAVALRY_UPGRADES: Chapter['upgrades'] = [
  { id: 'barde', name: 'Barde', description: 'Armure de cheval : +2 en armure.' },
  { id: 'trempe', name: 'Armes trempées', description: '+2 en attaque.' },
  { id: 'ferrage', name: 'Ferrage', description: 'Fers forgés : +20 % de vitesse.' },
]
const SIEGE_UPGRADES: Chapter['upgrades'] = [
  { id: 'charpente', name: 'Charpente renforcée', description: 'Machines cerclées de fer : +2 en armure et +20 points de vie.' },
  { id: 'chimie', name: 'Chimie', description: 'Projectiles enflammés : +6 en attaque.' },
  { id: 'ingenieurs', name: 'Ingénieurs', description: 'Calculs de trajectoire : +2 de portée.' },
]
const MONK_UPGRADES: Chapter['upgrades'] = [
  { id: 'saintete', name: 'Sainteté', description: '+20 points de vie.' },
  { id: 'redemption', name: 'Rédemption', description: '+10 points de pourcentage de chance de conversion.' },
  { id: 'illumination', name: 'Illumination', description: 'Conversion plus rapide et soins doublés.' },
]

export const LEVELS: Level[] = [
  {
    id: '5e',
    label: 'Cinquième',
    short: '5e',
    era: 'Âge féodal',
    tagline: 'Bâtis ton premier royaume : relatifs, fractions, premières lettres…',
    chapters: [
      {
        id: '5e-prio',
        title: 'Enchaînements d’opérations',
        topics: ['Priorités opératoires', 'Parenthèses', 'Calcul mental'],
        unit: 'infantry',
        building: 'barracks',
        buildingName: 'Caserne',
        corpsName: 'Infanterie',
        tierNames: ['Milicien', 'Homme d’armes', 'Champion'],
        color: '#2f5fb3',
        emblem: '×',
        upgrades: INFANTRY_UPGRADES,
      },
      {
        id: '5e-rel',
        title: 'Nombres relatifs',
        topics: ['Repérage', 'Addition', 'Soustraction'],
        unit: 'spear',
        building: 'barracks',
        buildingName: 'Caserne des piquiers',
        corpsName: 'Lanciers',
        tierNames: ['Lancier', 'Piquier', 'Hallebardier'],
        color: '#b8362f',
        emblem: '±',
        upgrades: SPEAR_UPGRADES,
      },
      {
        id: '5e-frac',
        title: 'Fractions',
        topics: ['Simplifier', 'Comparer', 'Additionner', 'Fraction d’une quantité'],
        unit: 'archer',
        building: 'range',
        buildingName: 'Camp de tir',
        corpsName: 'Archers',
        tierNames: ['Archer', 'Arbalétrier', 'Arbalétrier d’élite'],
        color: '#2f8f4e',
        emblem: '½',
        upgrades: ARCHER_UPGRADES,
      },
      {
        id: '5e-lit',
        title: 'Calcul littéral',
        topics: ['Substituer', 'Réduire', 'Développer k(a+b)', 'Tester une égalité'],
        unit: 'knight',
        building: 'stable',
        buildingName: 'Écurie royale',
        corpsName: 'Chevaliers',
        tierNames: ['Écuyer', 'Chevalier', 'Paladin'],
        color: '#7a3fa8',
        emblem: 'x',
        upgrades: CAVALRY_UPGRADES,
      },
      {
        id: '5e-prop',
        title: 'Proportionnalité',
        topics: ['Quatrième proportionnelle', 'Pourcentages', 'Vitesses'],
        unit: 'scout',
        building: 'stable',
        buildingName: 'Écurie',
        corpsName: 'Éclaireurs',
        tierNames: ['Éclaireur', 'Cavalier léger', 'Hussard'],
        color: '#d9862b',
        emblem: '%',
        upgrades: CAVALRY_UPGRADES,
      },
      {
        id: '5e-geo',
        title: 'Angles & triangles',
        topics: ['Somme des angles', 'Inégalité triangulaire', 'Parallélogrammes'],
        unit: 'siege',
        building: 'workshop',
        buildingName: 'Atelier de siège',
        corpsName: 'Engins de siège',
        tierNames: ['Bélier', 'Mangonneau', 'Trébuchet'],
        color: '#8a6a3c',
        emblem: '△',
        upgrades: SIEGE_UPGRADES,
      },
      {
        id: '5e-stat',
        title: 'Statistiques & probabilités',
        topics: ['Moyenne', 'Fréquences', 'Probabilités simples'],
        unit: 'monk',
        building: 'monastery',
        buildingName: 'Monastère',
        corpsName: 'Moines',
        tierNames: ['Novice', 'Moine', 'Abbé'],
        color: '#1f8a8a',
        emblem: 'σ',
        upgrades: MONK_UPGRADES,
      },
    ],
  },
  {
    id: '2nde',
    label: 'Seconde',
    short: '2nde',
    era: 'Âge des châteaux',
    tagline: 'Fortifie ton empire : fonctions, vecteurs, équations…',
    chapters: [
      {
        id: '2-nombres',
        title: 'Nombres & calculs',
        topics: ['Puissances', 'Racines carrées', 'Intervalles'],
        unit: 'infantry',
        building: 'barracks',
        buildingName: 'Caserne',
        corpsName: 'Infanterie lourde',
        tierNames: ['Homme d’armes', 'Épéiste', 'Champion'],
        color: '#2f5fb3',
        emblem: '√',
        upgrades: INFANTRY_UPGRADES,
      },
      {
        id: '2-lit',
        title: 'Calcul littéral',
        topics: ['Développer', 'Identités remarquables', 'Factoriser'],
        unit: 'knight',
        building: 'stable',
        buildingName: 'Écurie royale',
        corpsName: 'Chevaliers',
        tierNames: ['Chevalier', 'Cavalier', 'Paladin'],
        color: '#7a3fa8',
        emblem: 'x²',
        upgrades: CAVALRY_UPGRADES,
      },
      {
        id: '2-eq',
        title: 'Équations & inéquations',
        topics: ['Premier degré', 'Équation produit', 'Inéquations'],
        unit: 'spear',
        building: 'barracks',
        buildingName: 'Caserne des piquiers',
        corpsName: 'Piquiers',
        tierNames: ['Piquier', 'Hallebardier', 'Garde royale'],
        color: '#b8362f',
        emblem: '=',
        upgrades: SPEAR_UPGRADES,
      },
      {
        id: '2-fct',
        title: 'Fonctions',
        topics: ['Images', 'Antécédents', 'Fonctions de référence'],
        unit: 'archer',
        building: 'range',
        buildingName: 'Camp de tir',
        corpsName: 'Arbalétriers',
        tierNames: ['Arbalétrier', 'Archer long', 'Archer long d’élite'],
        color: '#2f8f4e',
        emblem: 'ƒ',
        upgrades: ARCHER_UPGRADES,
      },
      {
        id: '2-vect',
        title: 'Vecteurs & repérage',
        topics: ['Coordonnées', 'Milieu', 'Distance', 'Colinéarité'],
        unit: 'siege',
        building: 'workshop',
        buildingName: 'Atelier de siège',
        corpsName: 'Artillerie',
        tierNames: ['Mangonneau', 'Onagre', 'Trébuchet'],
        color: '#8a6a3c',
        emblem: '→',
        upgrades: SIEGE_UPGRADES,
      },
      {
        id: '2-droites',
        title: 'Droites & systèmes',
        topics: ['Coefficient directeur', 'Équation de droite', 'Systèmes 2×2'],
        unit: 'scout',
        building: 'stable',
        buildingName: 'Écurie',
        corpsName: 'Cavalerie légère',
        tierNames: ['Cavalier léger', 'Hussard', 'Hussard d’élite'],
        color: '#d9862b',
        emblem: 'y',
        upgrades: CAVALRY_UPGRADES,
      },
      {
        id: '2-stat',
        title: 'Statistiques & probabilités',
        topics: ['Moyenne pondérée', 'Évolutions en %', 'Probabilités'],
        unit: 'monk',
        building: 'monastery',
        buildingName: 'Monastère',
        corpsName: 'Moines',
        tierNames: ['Moine', 'Prieur', 'Abbé'],
        color: '#1f8a8a',
        emblem: 'σ',
        upgrades: MONK_UPGRADES,
      },
    ],
  },
]

export const UPCOMING_LEVELS = ['6e', '4e', '3e', '1re', 'Tle']

// ── Règles de progression ──────────────────────────────────────────────
// 1 bonne réponse = 1 point, quelle que soit la partie ; 10 points font un cran ; 5 crans par maison.
// Chaque unité coûte un certain nombre de bonnes réponses (voir UNIT_STATS) : la maison forme une unité
// à chaque fois que ce nombre est atteint, et toutes les unités formées partent au combat. Chaque maison
// commence avec un villageois, qui garde le camp jusqu'au premier soldat.
export const SERIES_SIZE = 5
export const POINTS_PER_LEVEL = 10
export const MAX_LEVEL = 5 // 5 crans par maison
export const MAX_POINTS = POINTS_PER_LEVEL * MAX_LEVEL

/** Rang des soldats selon le nombre de crans terminés : recrue, vétéran après le cran 3, élite après le cran 5.
 *  (Le rang 0, villageois, est celui du villageois qui garde un camp encore sans soldat.) */
export const TIER_PER_LEVEL = [1, 1, 1, 2, 2, 3]

export const maxPoints = (ppc = POINTS_PER_LEVEL) => ppc * MAX_LEVEL

export function levelFromPoints(points: number, ppc = POINTS_PER_LEVEL): number {
  return Math.min(MAX_LEVEL, Math.floor(points / ppc))
}

export const ROMAN = ['0', 'I', 'II', 'III', 'IV', 'V']

export function unitName(chapter: Chapter, tier: number): string {
  return tier === 0 ? 'Villageois' : chapter.tierNames[tier - 1]
}

// ── Âges ───────────────────────────────────────────────────────────────
export const AGES = ['Âge sombre', 'Âge féodal', 'Âge des châteaux', 'Âge impérial'] as const
export const AGE_SHORT = ['Sombre', 'Féodal', 'Châteaux', 'Impérial'] as const
/** Bonus de points de vie et d'attaque par âge atteint (sur toute l'armée). */
export const AGE_BONUS = 0.08
// Les crans sont numérotés de 1 à 5 ; levelFromPoints donne le nombre de crans terminés.
/** Crans terminés requis pour un problème de l'hôtel de ville à n points : le cran n. */
export const AGE_PROBLEM_CRAN = [0, 1, 2, 3]
/** Améliorations n = 1, 2, 3 : âge et cran requis. */
export const UPGRADE_AGE = [0, 1, 2, 3]
export const UPGRADE_CRAN = [0, 1, 2, 3]

export function ageFromPoints(agePoints: number, thresholds: readonly number[]): number {
  let age = 0
  while (age < thresholds.length && agePoints >= thresholds[age]) age++
  return age
}

