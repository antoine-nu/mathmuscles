// Programme : niveaux scolaires → chapitres → corps d'armée.
// Chaque chapitre est incarné par un corps d'armée qui grossit avec les exercices réussis.

export type UnitKind = 'infantry' | 'spear' | 'archer' | 'knight' | 'scout' | 'siege' | 'monk'
export type BuildingKind = 'barracks' | 'range' | 'stable' | 'workshop' | 'monastery'

export interface Upgrade {
  id: string
  name: string
  description: string
}

/** Maison du village : forme un type d'unité (bâtiment, nom du corps, rangs, couleur, améliorations). */
export interface HouseDef {
  unit: UnitKind
  building: BuildingKind
  buildingName: string
  corpsName: string
  /** Noms des soldats aux rangs 1, 2 et 3 (le rang 0 est toujours le Villageois). */
  tierNames: [string, string, string]
  color: string
  upgrades: [Upgrade, Upgrade, Upgrade]
}

/** Sujet (chapitre du programme) : le joueur en choisit un par maison. */
export interface Subject {
  id: string
  title: string
  topics: string[]
  /** Grande partie du programme (« Nombres et calculs », « Géométrie »…), pour regrouper les choix. */
  domain: string
  /** Symbole peint sur les boucliers et bannières. */
  emblem: string
}

/** Une maison du village avec le sujet qui l'entraîne. L'identifiant est celui du sujet. */
export interface Chapter extends HouseDef, Subject {}

export interface Level {
  id: string
  label: string
  short: string
  era: string
  tagline: string
  /** Les 7 maisons, dans l'ordre des types d'unités. */
  houses: HouseDef[]
  /** Catalogue des sujets du niveau. */
  subjects: Subject[]
  /** Sujets proposés par défaut, un par maison (même ordre que houses). */
  defaults: string[]
  /** Palier de difficulté des exercices selon le nombre de crans terminés (0 à 5). */
  difficulty: number[]
  /** Maisons avec les sujets par défaut. */
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

// ── Maisons ─────────────────────────────────────────────────────────────
const house = (unit: UnitKind, building: BuildingKind, buildingName: string, corpsName: string, tierNames: [string, string, string], color: string, upgrades: HouseDef['upgrades']): HouseDef =>
  ({ unit, building, buildingName, corpsName, tierNames, color, upgrades })

const HOUSES_5E: HouseDef[] = [
  house('infantry', 'barracks', 'Caserne', 'Infanterie', ['Milicien', 'Homme d’armes', 'Champion'], '#2f5fb3', INFANTRY_UPGRADES),
  house('spear', 'barracks', 'Caserne des piquiers', 'Lanciers', ['Lancier', 'Piquier', 'Hallebardier'], '#b8362f', SPEAR_UPGRADES),
  house('archer', 'range', 'Camp de tir', 'Archers', ['Archer', 'Arbalétrier', 'Arbalétrier d’élite'], '#2f8f4e', ARCHER_UPGRADES),
  house('knight', 'stable', 'Écurie royale', 'Chevaliers', ['Écuyer', 'Chevalier', 'Paladin'], '#7a3fa8', CAVALRY_UPGRADES),
  house('scout', 'stable', 'Écurie', 'Éclaireurs', ['Éclaireur', 'Cavalier léger', 'Hussard'], '#d9862b', CAVALRY_UPGRADES),
  house('siege', 'workshop', 'Atelier de siège', 'Engins de siège', ['Bélier', 'Mangonneau', 'Trébuchet'], '#8a6a3c', SIEGE_UPGRADES),
  house('monk', 'monastery', 'Monastère', 'Moines', ['Novice', 'Moine', 'Abbé'], '#1f8a8a', MONK_UPGRADES),
]
const HOUSES_2NDE: HouseDef[] = [
  house('infantry', 'barracks', 'Caserne', 'Infanterie lourde', ['Homme d’armes', 'Épéiste', 'Champion'], '#2f5fb3', INFANTRY_UPGRADES),
  house('spear', 'barracks', 'Caserne des piquiers', 'Piquiers', ['Piquier', 'Hallebardier', 'Garde royale'], '#b8362f', SPEAR_UPGRADES),
  house('archer', 'range', 'Camp de tir', 'Arbalétriers', ['Arbalétrier', 'Archer long', 'Archer long d’élite'], '#2f8f4e', ARCHER_UPGRADES),
  house('knight', 'stable', 'Écurie royale', 'Chevaliers', ['Chevalier', 'Cavalier', 'Paladin'], '#7a3fa8', CAVALRY_UPGRADES),
  house('scout', 'stable', 'Écurie', 'Cavalerie légère', ['Cavalier léger', 'Hussard', 'Hussard d’élite'], '#d9862b', CAVALRY_UPGRADES),
  house('siege', 'workshop', 'Atelier de siège', 'Artillerie', ['Mangonneau', 'Onagre', 'Trébuchet'], '#8a6a3c', SIEGE_UPGRADES),
  house('monk', 'monastery', 'Monastère', 'Moines', ['Moine', 'Prieur', 'Abbé'], '#1f8a8a', MONK_UPGRADES),
]
const HOUSES_ADULTES: HouseDef[] = [
  house('infantry', 'barracks', 'Caserne impériale', 'Garde impériale', ['Épéiste', 'Champion', 'Garde impérial'], '#2f5fb3', INFANTRY_UPGRADES),
  house('spear', 'barracks', 'Caserne des piquiers', 'Hallebardiers', ['Piquier', 'Hallebardier', 'Hallebardier d’élite'], '#b8362f', SPEAR_UPGRADES),
  house('archer', 'range', 'Camp de tir', 'Archers longs', ['Archer long', 'Arbalétrier lourd', 'Maître archer'], '#2f8f4e', ARCHER_UPGRADES),
  house('knight', 'stable', 'Écurie royale', 'Paladins', ['Chevalier', 'Paladin', 'Grand maître'], '#7a3fa8', CAVALRY_UPGRADES),
  house('scout', 'stable', 'Écurie', 'Hussards', ['Cavalier léger', 'Hussard', 'Hussard ailé'], '#d9862b', CAVALRY_UPGRADES),
  house('siege', 'workshop', 'Atelier de siège', 'Artillerie lourde', ['Onagre', 'Trébuchet', 'Bombarde'], '#8a6a3c', SIEGE_UPGRADES),
  house('monk', 'monastery', 'Bibliothèque', 'Érudits', ['Copiste', 'Érudit', 'Grand savant'], '#1f8a8a', MONK_UPGRADES),
]

const HOUSES_MATERNELLE: HouseDef[] = [
  house('infantry', 'barracks', 'Caserne', 'Petits soldats', ['Petit soldat', 'Soldat', 'Champion'], '#2f5fb3', INFANTRY_UPGRADES),
  house('spear', 'barracks', 'Caserne des piquiers', 'Lanciers', ['Petit lancier', 'Lancier', 'Grand lancier'], '#b8362f', SPEAR_UPGRADES),
  house('archer', 'range', 'Camp de tir', 'Archers', ['Petit archer', 'Archer', 'Grand archer'], '#2f8f4e', ARCHER_UPGRADES),
  house('knight', 'stable', 'Écurie royale', 'Chevaliers', ['Petit chevalier', 'Chevalier', 'Grand chevalier'], '#7a3fa8', CAVALRY_UPGRADES),
  house('scout', 'stable', 'Écurie', 'Cavaliers', ['Poney', 'Cavalier', 'Grand cavalier'], '#d9862b', CAVALRY_UPGRADES),
  house('siege', 'workshop', 'Atelier', 'Catapultes', ['Petit bélier', 'Catapulte', 'Grande catapulte'], '#8a6a3c', SIEGE_UPGRADES),
  house('monk', 'monastery', 'Monastère', 'Moines', ['Petit moine', 'Moine', 'Sage'], '#1f8a8a', MONK_UPGRADES),
]

// ── Sujets ──────────────────────────────────────────────────────────────
const subject = (id: string, domain: string, title: string, emblem: string, topics: string[]): Subject => ({ id, domain, title, emblem, topics })

const MN = 'Les nombres', MF = 'Formes, grandeurs et suites', ML = 'Les lettres et l’espace'
const SUBJECTS_MATERNELLE: Subject[] = [
  subject('M-compter', MN, 'Compter', '3', ['Compter jusqu’à 10', 'Constellations du dé', 'Montrer une quantité']),
  subject('M-chiffres', MN, 'Les chiffres', '1', ['Reconnaître les chiffres', 'Chiffre et quantité', 'La comptine']),
  subject('M-quantites', MN, 'Plus, moins, autant', '+', ['Comparer des quantités', 'Autant', 'Ajouter, enlever']),
  subject('M-grandeurs', MF, 'Grand, petit, long, court', '↕', ['Plus grand, plus petit', 'Plus long, plus court', 'Ranger']),
  subject('M-formes', MF, 'Les formes', '△', ['Rond, carré, triangle, rectangle', 'Même forme', 'Intrus']),
  subject('M-suites', MF, 'Les suites', '●', ['Colliers de couleurs', 'Motifs de formes', 'Ce qui manque']),
  subject('M-lettres', ML, 'Les lettres', 'A', ['Reconnaître les lettres', 'Lettres et chiffres', 'Première lettre d’un mot']),
  subject('M-espace', ML, 'Se repérer et observer', '◎', ['Sur, sous, dans, devant…', 'Ombres', 'Intrus et dessins pareils']),
]
const NC = 'Nombres et calculs', EG = 'Espace et géométrie', GM = 'Grandeurs et mesures', OD = 'Données et probabilités'
const SUBJECTS_5E: Subject[] = [
  subject('5e-prio', NC, 'Enchaînements d’opérations', '×', ['Priorités opératoires', 'Parenthèses', 'Calcul mental']),
  subject('5e-rel', NC, 'Nombres relatifs', '±', ['Repérage', 'Comparaison', 'Addition et soustraction']),
  subject('5e-arith', NC, 'Arithmétique', '÷', ['Multiples et diviseurs', 'Critères de divisibilité', 'Nombres premiers', 'Division euclidienne']),
  subject('5e-frac', NC, 'Nombres en écriture fractionnaire', '½', ['Comparer', 'Simplifier', 'Additionner', 'Fraction d’une quantité']),
  subject('5e-puiss', NC, 'Puissances', '²', ['Carrés', 'Cubes']),
  subject('5e-lit', NC, 'Calcul littéral', 'x', ['Substituer', 'Réduire', 'Développer k(a + b)']),
  subject('5e-equa', NC, 'Équations', '=', ['Tester une solution', 'Résoudre ax + b = c', 'Mettre en équation']),
  subject('5e-geo', EG, 'Géométrie du triangle', '△', ['Somme des angles', 'Inégalité triangulaire', 'Droites remarquables']),
  subject('5e-angles', EG, 'Angles et parallélisme', '∥', ['Alternes-internes', 'Correspondants', 'Droites parallèles']),
  subject('5e-sym', EG, 'Symétries', '⇄', ['Symétrie axiale', 'Symétrie centrale']),
  subject('5e-para', EG, 'Parallélogrammes', '▱', ['Propriétés', 'Rectangle, losange, carré']),
  subject('5e-aires', GM, 'Périmètres, aires et volumes', 'π', ['Aires', 'Périmètres', 'Prismes et cylindres']),
  subject('5e-prop', GM, 'Proportionnalité et pourcentages', '%', ['Tableaux', 'Échelles', 'Pourcentages', 'Vitesses']),
  subject('5e-stat', OD, 'Statistiques', 'σ', ['Tableaux et graphiques', 'Moyenne', 'Fréquences']),
  subject('5e-proba', OD, 'Probabilités', 'P', ['Issues', 'Probabilités simples']),
]
const AL = 'Nombres et calculs', FN = 'Fonctions', GE = 'Géométrie', SP = 'Statistiques et probabilités'
const SUBJECTS_2NDE: Subject[] = [
  subject('2-ens', AL, 'Ensembles et logique', 'ℝ', ['ℕ, ℤ, 𝔻, ℚ, ℝ', 'Intervalles', 'Valeur absolue']),
  subject('2-nombres', AL, 'Nombres réels et arithmétique', '√', ['Puissances', 'Racines carrées', 'Multiples et diviseurs']),
  subject('2-lit', AL, 'Calcul littéral', 'x²', ['Développer', 'Factoriser', 'Identités remarquables']),
  subject('2-eq', AL, 'Équations et inéquations', '=', ['Premier degré', 'Produit nul', 'Tableaux de signes']),
  subject('2-fct', FN, 'Généralités sur les fonctions', 'ƒ', ['Image', 'Antécédent', 'Courbe']),
  subject('2-var', FN, 'Variations et extremums', '↗', ['Croissance', 'Tableau de variations', 'Maximum et minimum']),
  subject('2-ref', FN, 'Fonctions de référence', '⅟', ['Affine', 'Carré', 'Inverse', 'Racine carrée']),
  subject('2-vect', GE, 'Vecteurs', '→', ['Somme', 'Produit par un réel', 'Colinéarité']),
  subject('2-droites', GE, 'Repérage et droites', 'y', ['Coordonnées', 'Équations de droites', 'Systèmes']),
  subject('2-geo', GE, 'Problèmes de géométrie', '⊿', ['Pythagore', 'Thalès', 'Trigonométrie']),
  subject('2-stat', SP, 'Statistique descriptive', 'σ', ['Information chiffrée', 'Moyenne, médiane, quartiles', 'Écart-type']),
  subject('2-biv', SP, 'Statistiques bivariées', '⊞', ['Tableaux croisés', 'Fréquences conditionnelles']),
  subject('2-proba', SP, 'Probabilités', 'P', ['Loi de probabilité', 'Échantillonnage', 'Probabilités conditionnelles']),
]
const AG = 'Algèbre et géométrie', AN = 'Analyse', PR = 'Probabilités', AP = 'Algorithmique et logique', EX = 'Options'
const SUBJECTS_TERMINALE: Subject[] = [
  subject('T-denomb', AG, 'Combinatoire et dénombrement', '!', ['Arrangements', 'Permutations', 'Combinaisons']),
  subject('T-espace', AG, 'Géométrie dans l’espace', '⊥', ['Droites et plans', 'Orthogonalité', 'Produit scalaire']),
  subject('T-param', AG, 'Représentations paramétriques', 't', ['Droites paramétrées', 'Équations cartésiennes de plans']),
  subject('T-suites', AN, 'Suites', 'u', ['Récurrence', 'Limites de suites']),
  subject('T-limites', AN, 'Limites et continuité', '∞', ['Limites de fonctions', 'Continuité', 'Valeurs intermédiaires']),
  subject('T-derivee', AN, 'Dérivation et convexité', '′', ['Dérivées', 'Tangentes', 'Convexité']),
  subject('T-lntrig', AN, 'Logarithme et trigonométrie', 'ln', ['Logarithme népérien', 'Cosinus et sinus']),
  subject('T-primitives', AN, 'Primitives et équations différentielles', 'F', ['Primitives', 'y′ = ay + b']),
  subject('T-integrales', AN, 'Calcul intégral', '∫', ['Intégrales et aires', 'Intégration par parties']),
  subject('T-binom', PR, 'Loi binomiale', 'B', ['Schéma de Bernoulli', 'Loi binomiale']),
  subject('T-sommesva', PR, 'Sommes de variables aléatoires', 'E', ['Espérance', 'Variance', 'Échantillons']),
  subject('T-bienayme', PR, 'Concentration et grands nombres', '≈', ['Bienaymé-Tchebychev', 'Loi des grands nombres']),
  subject('T-python', AP, 'Algorithmique et Python', '>', ['Boucles', 'Conditions', 'Listes']),
  subject('T-logique', AP, 'Ensembles et logique', '∀', ['Quantificateurs', 'Implication', 'Ensembles']),
  subject('T-complexes', EX, 'Nombres complexes (expertes)', 'i', ['Forme algébrique', 'Module et argument']),
  subject('T-arith', EX, 'Arithmétique (expertes)', '≡', ['Congruences', 'PGCD', 'Nombres premiers']),
  subject('T-matrices', EX, 'Matrices et graphes (expertes)', 'M', ['Matrices', 'Graphes']),
  subject('T-complem', EX, 'Modèles (maths complémentaires)', 'e', ['Croissance exponentielle', 'Ajustements', 'Lois usuelles']),
]

function level(base: Omit<Level, 'chapters'>): Level {
  return { ...base, chapters: base.defaults.map((id, i) => merge(base.houses[i], base.subjects.find((s) => s.id === id)!)) }
}
const merge = (h: HouseDef, s: Subject): Chapter => ({ ...h, ...s })

export const LEVELS: Level[] = [
  level({
    id: 'maternelle', label: 'Maternelle', short: 'Mat.', era: 'Âge sombre',
    tagline: 'Compter, les formes, les lettres : de grandes images et une voix qui lit les consignes.',
    houses: HOUSES_MATERNELLE, subjects: SUBJECTS_MATERNELLE, difficulty: [1, 2, 3, 4, 5, 5],
    defaults: ['M-compter', 'M-chiffres', 'M-quantites', 'M-formes', 'M-suites', 'M-lettres', 'M-espace'],
  }),
  level({
    id: '5e', label: 'Cinquième', short: '5e', era: 'Âge féodal',
    tagline: 'Bâtis ton premier royaume : relatifs, fractions, premières lettres…',
    houses: HOUSES_5E, subjects: SUBJECTS_5E, difficulty: [1, 2, 3, 4, 5, 5],
    defaults: ['5e-prio', '5e-rel', '5e-frac', '5e-lit', '5e-prop', '5e-geo', '5e-stat'],
  }),
  level({
    id: '2nde', label: 'Seconde', short: '2nde', era: 'Âge des châteaux',
    tagline: 'Fortifie ton empire : fonctions, vecteurs, équations…',
    houses: HOUSES_2NDE, subjects: SUBJECTS_2NDE, difficulty: [1, 2, 3, 4, 5, 5],
    defaults: ['2-nombres', '2-eq', '2-fct', '2-lit', '2-droites', '2-vect', '2-stat'],
  }),
  level({
    id: 'adulte', label: 'Adultes · remise en jambes', short: 'Adulte', era: 'Âge impérial',
    tagline: 'Tout le programme de Terminale, en douceur : pour retrouver ses réflexes.',
    houses: HOUSES_ADULTES, subjects: SUBJECTS_TERMINALE, difficulty: [1, 1, 2, 2, 3, 3],
    defaults: ['T-suites', 'T-denomb', 'T-derivee', 'T-lntrig', 'T-binom', 'T-espace', 'T-logique'],
  }),
  level({
    id: 'expert', label: 'Adultes · aguerris', short: 'Expert', era: 'Âge impérial',
    tagline: 'Tout le programme de Terminale, options expertes comprises, à pleine difficulté.',
    houses: HOUSES_ADULTES, subjects: SUBJECTS_TERMINALE, difficulty: [2, 3, 4, 5, 5, 5],
    defaults: ['T-suites', 'T-denomb', 'T-integrales', 'T-derivee', 'T-binom', 'T-espace', 'T-complexes'],
  }),
]

/** Tous les sujets, par identifiant (un sujet peut servir à plusieurs niveaux). */
export const SUBJECTS = new Map<string, Subject>(LEVELS.flatMap((l) => l.subjects.map((s) => [s.id, s] as const)))
/** Niveau proposé par défaut (et repli pour un identifiant inconnu). */
export const DEFAULT_LEVEL = '5e'
export const levelById = (id: string): Level => LEVELS.find((l) => l.id === id) ?? LEVELS.find((l) => l.id === DEFAULT_LEVEL)!

/** Maisons d'un niveau avec les sujets choisis (selection[i] pour la maison i ; défaut sinon). */
export function chaptersFor(levelId: string, selection?: readonly string[]): Chapter[] {
  const lvl = levelById(levelId)
  return lvl.houses.map((h, i) => merge(h, SUBJECTS.get(selection?.[i] ?? lvl.defaults[i]) ?? SUBJECTS.get(lvl.defaults[i])!))
}

/** Maison d'un régiment (armée d'un joueur, éventuellement d'un autre niveau). */
export function chapterOf(levelId: string, subjectId: string, unit: UnitKind): Chapter {
  const lvl = levelById(levelId)
  const h = lvl.houses.find((x) => x.unit === unit) ?? lvl.houses[0]
  return merge(h, SUBJECTS.get(subjectId) ?? lvl.subjects[0])
}

export const UPCOMING_LEVELS = ['6e', '4e', '3e', '1re']

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

