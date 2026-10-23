// Programme : niveaux scolaires → chapitres → corps d'armée.
// Chaque chapitre est incarné par un corps d'armée qui grossit avec les exercices réussis.

export type UnitKind = 'infantry' | 'spear' | 'archer' | 'knight' | 'scout' | 'siege' | 'scholar'
export type BuildingKind = 'barracks' | 'range' | 'stable' | 'workshop' | 'library'

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

const INFANTRY_UPGRADES: Chapter['upgrades'] = [
  { id: 'mailles', name: 'Cotte de mailles', description: 'Armure renforcée : les soldats encaissent mieux.' },
  { id: 'forge', name: 'Forge', description: 'Lames trempées : +1 en attaque.' },
  { id: 'etendard', name: 'Étendard', description: 'Capes et bannières : le corps impressionne l’ennemi.' },
]
const ARCHER_UPGRADES: Chapter['upgrades'] = [
  { id: 'matelassee', name: 'Armure matelassée', description: 'Gambison épais pour les tireurs.' },
  { id: 'empennage', name: 'Empennage', description: 'Flèches plus précises : +1 portée.' },
  { id: 'balistique', name: 'Balistique', description: 'Les tirs anticipent la cible. Capes de maîtres-archers.' },
]
const CAVALRY_UPGRADES: Chapter['upgrades'] = [
  { id: 'barde', name: 'Barde', description: 'Armure de cheval aux couleurs du corps.' },
  { id: 'ferrage', name: 'Ferrage', description: 'Fers forgés : charge plus rapide.' },
  { id: 'chevalerie', name: 'Chevalerie', description: 'Capes et honneurs des ordres de chevalerie.' },
]
const SIEGE_UPGRADES: Chapter['upgrades'] = [
  { id: 'charpente', name: 'Charpente renforcée', description: 'Machines cerclées de fer.' },
  { id: 'chimie', name: 'Chimie', description: 'Projectiles enflammés : +1 attaque.' },
  { id: 'ingenieurs', name: 'Ingénieurs', description: 'Calculs de trajectoire : +1 portée.' },
]
const SCHOLAR_UPGRADES: Chapter['upgrades'] = [
  { id: 'enluminure', name: 'Enluminure', description: 'Manuscrits ornés d’or.' },
  { id: 'astrolabe', name: 'Astrolabe', description: 'Mesure du ciel et des chances.' },
  { id: 'sagesse', name: 'Sagesse', description: 'Robes de maîtres et bâtons d’or.' },
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
        upgrades: INFANTRY_UPGRADES,
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
        unit: 'scholar',
        building: 'library',
        buildingName: 'Bibliothèque',
        corpsName: 'Érudits',
        tierNames: ['Apprenti', 'Érudit', 'Grand Érudit'],
        color: '#1f8a8a',
        emblem: 'σ',
        upgrades: SCHOLAR_UPGRADES,
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
        upgrades: INFANTRY_UPGRADES,
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
        unit: 'scholar',
        building: 'library',
        buildingName: 'Université',
        corpsName: 'Érudits',
        tierNames: ['Érudit', 'Savant', 'Grand Savant'],
        color: '#1f8a8a',
        emblem: 'σ',
        upgrades: SCHOLAR_UPGRADES,
      },
    ],
  },
]

export const UPCOMING_LEVELS = ['6e', '4e', '3e', '1re', 'Tle']

// ── Règles de progression ──────────────────────────────────────────────
export const SERIES_SIZE = 5
export const POINTS_PER_LEVEL = 10 // 10 bonnes réponses = 1 cran de jauge (≈ 2 séries)
export const MAX_LEVEL = 5 // 5 crans → 50 bonnes réponses = corps au complet
export const MAX_POINTS = POINTS_PER_LEVEL * MAX_LEVEL
export const UPGRADE_THRESHOLD = 4 // une amélioration s'obtient avec ≥ 4/5 sur une série d'élite

/** Taille de l'armée affichée selon le cran de jauge. */
export const UNITS_PER_LEVEL = [1, 3, 5, 8, 11, 15]
/** Rang visuel du soldat selon le cran de jauge (0 = villageois). */
export const TIER_PER_LEVEL = [0, 1, 1, 2, 2, 3]

export function levelFromPoints(points: number): number {
  return Math.min(MAX_LEVEL, Math.floor(points / POINTS_PER_LEVEL))
}

export function unitName(chapter: Chapter, tier: number): string {
  return tier === 0 ? 'Villageois' : chapter.tierNames[tier - 1]
}

export function eraFromRatio(ratio: number): string {
  if (ratio >= 0.9) return 'Âge impérial'
  if (ratio >= 0.55) return 'Âge des châteaux'
  if (ratio >= 0.2) return 'Âge féodal'
  return 'Âge sombre'
}
