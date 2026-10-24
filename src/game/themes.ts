// Thèmes de carte : chaque partie tire un décor (plaine, côte et montagnes, désert, hiver, automne).
// Le village et le champ de la bataille finale partagent le même thème.

export type ThemeId = 'plaine' | 'cote' | 'desert' | 'hiver' | 'automne'
export type TreeKind = 'pine' | 'oak' | 'palm' | 'cactus' | 'bare'

export interface MapTheme {
  id: ThemeId
  name: string
  /** Couleurs des tuiles du sol (du plus sombre au plus clair, à peu près). */
  ground: string[]
  /** Brins d'herbe dessinés sur les tuiles. */
  blades: boolean
  /** Petites touches de couleur au sol (fleurs, feuilles mortes, cailloux…). */
  specks: string[]
  /** Chemins : bord et centre. */
  path: [string, string]
  /** Place de l'hôtel de ville. */
  plaza: string
  /** Falaises du bord de la carte (face gauche, face droite). */
  cliff: [string, string]
  /** Arbres et leur fréquence relative. */
  trees: [TreeKind, number][]
  /** Couleurs du feuillage (4 nuances). */
  leaves: string[]
  /** Neige sur les sapins. */
  snow: boolean
  /** Étang (ou oasis, ou lac gelé). */
  water: { rim: string; deep: string; light: string; frozen?: boolean }
  /** Mer d'un côté de la carte, montagnes de l'autre. */
  sea: boolean
  mountains: boolean
  /** Buissons, gibier… */
  bushes: boolean
  deer: boolean
  /** Fond derrière la carte. */
  backdrop: string
  /** Sol du champ de bataille. */
  battle: {
    clear: string
    base: [string, string]
    blobs: [string, number, number, number][]
    blades: [string, string] | null
    pebbles: string[]
    /** Mares au milieu du champ (eau, reflets, roseaux) ; null = aucune. */
    pools: [string, string, string] | null
  }
}

const GREEN_BATTLE: MapTheme['battle'] = {
  clear: '#4f7a2e',
  base: ['#5f8a36', '#6f9a3c'],
  blobs: [['#7fa84a', 26, 6, 0.5], ['#4f7a2e', 22, 5, 0.35], ['#a3865a', 12, 5, 0.55], ['#b8955c', 10, 3, 0.45]],
  blades: ['rgba(40, 70, 25, 0.5)', 'rgba(140, 180, 80, 0.5)'],
  pebbles: ['#8d8f8c', '#8d8f8c', '#f3e37c'],
  pools: ['rgba(70, 110, 90, 0.55)', 'rgba(120, 170, 170, 0.45)', '#3f5f2a'],
}

export const THEMES: Record<ThemeId, MapTheme> = {
  plaine: {
    id: 'plaine', name: 'Plaine verdoyante',
    ground: ['#6f9a3c', '#77a142', '#68923a', '#80a84a', '#5f8a36'], blades: true, specks: ['#f3e37c', '#f4f1ea'],
    path: ['#9a7a4a', '#b8955c'], plaza: '#a78656', cliff: ['#7a5532', '#5c3e22'],
    trees: [['pine', 0.65], ['oak', 0.35]], leaves: ['#4f7a2e', '#5a8434', '#46702a', '#628a38'], snow: false,
    water: { rim: '#c9b27a', deep: '#3f7fa8', light: '#5598c0' }, sea: false, mountains: false, bushes: true, deer: true,
    backdrop: 'radial-gradient(ellipse at 50% 50%, #1c140b, #0b0704 75%)',
    battle: GREEN_BATTLE,
  },
  cote: {
    id: 'cote', name: 'Mer et montagnes',
    ground: ['#6a9640', '#729e46', '#64903c', '#7aa64c', '#5c8838'], blades: true, specks: ['#f4f1ea', '#c9d8f0'],
    path: ['#9a7a4a', '#b8955c'], plaza: '#a78656', cliff: ['#7a6a5a', '#5c5044'],
    trees: [['pine', 0.8], ['oak', 0.2]], leaves: ['#3f6b30', '#4a7636', '#365f2c', '#527e3a'], snow: false,
    water: { rim: '#c9b27a', deep: '#3f7fa8', light: '#5598c0' }, sea: true, mountains: true, bushes: true, deer: true,
    backdrop: 'radial-gradient(ellipse at 30% 60%, #12324a, #0b0704 75%)',
    battle: { ...GREEN_BATTLE, blobs: [['#7aa64c', 24, 6, 0.5], ['#5c8838', 20, 5, 0.35], ['#9a9488', 14, 4, 0.5], ['#b8955c', 8, 3, 0.4]], pebbles: ['#8d8f8c', '#8d8f8c', '#a9a59b'] },
  },
  desert: {
    id: 'desert', name: 'Désert',
    ground: ['#d6b574', '#dcbd80', '#cfac6a', '#e3c78e', '#c9a463'], blades: false, specks: ['#b8935a', '#a07a48', '#efe0b8'],
    path: ['#b0884e', '#c49a5e'], plaza: '#c29a62', cliff: ['#b98a52', '#9a6e3e'],
    trees: [['palm', 0.55], ['cactus', 0.45]], leaves: ['#5e8a34', '#6a963a', '#557e30', '#729e40'], snow: false,
    water: { rim: '#7aa04a', deep: '#2f86a8', light: '#4aa6c4' }, sea: false, mountains: false, bushes: false, deer: false,
    backdrop: 'radial-gradient(ellipse at 50% 50%, #2a1c0c, #0b0704 75%)',
    battle: {
      clear: '#c9a463', base: ['#d2b070', '#dcbd80'],
      blobs: [['#e6cd96', 26, 7, 0.5], ['#c19a5c', 22, 5, 0.4], ['#b08a52', 10, 4, 0.4], ['#efe0b8', 12, 3, 0.4]],
      blades: null, pebbles: ['#a07a48', '#8a6a40', '#efe0b8'], pools: null,
    },
  },
  hiver: {
    id: 'hiver', name: 'Hiver',
    ground: ['#e6edf1', '#eff4f7', '#dde6ec', '#f5f8fa', '#d4dfe6'], blades: false, specks: ['#ffffff', '#c3d2dc'],
    path: ['#a7a59e', '#c2c3be'], plaza: '#b9bcb8', cliff: ['#8a8f96', '#6c727a'],
    trees: [['pine', 0.8], ['bare', 0.2]], leaves: ['#2c4f3a', '#33573f', '#284a36', '#3a5f45'], snow: true,
    water: { rim: '#f2f6f8', deep: '#9cc4dc', light: '#d4e8f4', frozen: true }, sea: false, mountains: true, bushes: false, deer: true,
    backdrop: 'radial-gradient(ellipse at 50% 50%, #1c2430, #07090c 75%)',
    battle: {
      clear: '#dde6ec', base: ['#e6edf1', '#f2f6f8'],
      blobs: [['#ffffff', 26, 7, 0.6], ['#c9d6df', 22, 5, 0.35], ['#a9a49c', 8, 3, 0.2], ['#b7c4cc', 10, 3, 0.3]],
      blades: null, pebbles: ['#8d8f8c', '#a9b6c0', '#ffffff'],
      pools: ['rgba(150, 190, 215, 0.6)', 'rgba(225, 240, 250, 0.7)', '#8aa0ae'],
    },
  },
  automne: {
    id: 'automne', name: 'Automne',
    ground: ['#8a9a40', '#94a246', '#80903a', '#a0a84e', '#768836'], blades: true, specks: ['#d9822b', '#c0452a', '#e8b84a'],
    path: ['#94704a', '#ad8a5c'], plaza: '#a07e54', cliff: ['#7a5532', '#5c3e22'],
    trees: [['oak', 0.7], ['pine', 0.3]], leaves: ['#d9822b', '#c0552a', '#e0a83a', '#a8452a'], snow: false,
    water: { rim: '#b8a06e', deep: '#3a6f8e', light: '#4f88a8' }, sea: false, mountains: false, bushes: true, deer: true,
    backdrop: 'radial-gradient(ellipse at 50% 50%, #241608, #0b0704 75%)',
    battle: {
      ...GREEN_BATTLE, clear: '#768836', base: ['#80903a', '#8a9a40'],
      blobs: [['#a0a84e', 24, 6, 0.5], ['#6e7e30', 20, 5, 0.35], ['#a3865a', 12, 5, 0.55], ['#d9822b', 16, 2, 0.35]],
      blades: ['rgba(80, 70, 25, 0.5)', 'rgba(190, 160, 80, 0.5)'], pebbles: ['#d9822b', '#c0452a', '#e8b84a'],
    },
  },
}

export const THEME_IDS = Object.keys(THEMES) as ThemeId[]
export const randomTheme = (): ThemeId => THEME_IDS[Math.floor(Math.random() * THEME_IDS.length)]
export const themeOf = (id: string | undefined): MapTheme => THEMES[(id as ThemeId) ?? 'plaine'] ?? THEMES.plaine
