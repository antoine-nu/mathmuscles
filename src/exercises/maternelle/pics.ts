// Images des exercices de maternelle : l'enfant ne lit pas encore, tout passe par le dessin (et la voix).
// Une image (Pic) est une petite description sérialisable, dessinée en SVG par components/PicView.tsx.

/** Objets dessinés (avec leur nom, pour la consigne lue à voix haute et pour les mots en capitales). */
export const THINGS = {
  pomme: { sing: 'pomme', plur: 'pommes', art: 'une', word: 'POMME' },
  etoile: { sing: 'étoile', plur: 'étoiles', art: 'une', word: 'ETOILE' },
  poisson: { sing: 'poisson', plur: 'poissons', art: 'un', word: 'POISSON' },
  fleur: { sing: 'fleur', plur: 'fleurs', art: 'une', word: 'FLEUR' },
  ballon: { sing: 'ballon', plur: 'ballons', art: 'un', word: 'BALLON' },
  coeur: { sing: 'cœur', plur: 'cœurs', art: 'un', word: 'COEUR' },
  soleil: { sing: 'soleil', plur: 'soleils', art: 'un', word: 'SOLEIL' },
  champignon: { sing: 'champignon', plur: 'champignons', art: 'un', word: 'CHAMPIGNON' },
  voiture: { sing: 'voiture', plur: 'voitures', art: 'une', word: 'VOITURE' },
  maison: { sing: 'maison', plur: 'maisons', art: 'une', word: 'MAISON' },
  arbre: { sing: 'arbre', plur: 'arbres', art: 'un', word: 'ARBRE' },
  lune: { sing: 'lune', plur: 'lunes', art: 'une', word: 'LUNE' },
} as const
export type Thing = keyof typeof THINGS
export const THING_IDS = Object.keys(THINGS) as Thing[]

export type Shape = 'rond' | 'carre' | 'triangle' | 'rectangle' | 'losange' | 'ovale'
export const SHAPES: Record<Shape, { name: string; art: 'le' | 'la' | "l'" }> = {
  rond: { name: 'rond', art: 'le' },
  carre: { name: 'carré', art: 'le' },
  triangle: { name: 'triangle', art: 'le' },
  rectangle: { name: 'rectangle', art: 'le' },
  losange: { name: 'losange', art: 'le' },
  ovale: { name: 'ovale', art: "l'" },
}

/** Couleurs franches, faciles à nommer. */
export const COLORS = {
  rouge: '#e0392b',
  bleu: '#2f6fd6',
  jaune: '#f2c418',
  vert: '#2fa84f',
  orange: '#f08a1c',
  violet: '#8e44c4',
} as const
export type ColorName = keyof typeof COLORS
export const COLOR_IDS = Object.keys(COLORS) as ColorName[]

/** Un objet placé dans une boîte de 200 × 150 (x, y : centre ; s : échelle, 1 ≈ 36 px). */
export interface Placed {
  thing: Thing
  x: number
  y: number
  s: number
  color?: ColorName
  /** Objet retiré (barré), pour les problèmes « on en enlève ». */
  gone?: boolean
}

export type Relation = 'dessus' | 'dessous' | 'dedans' | 'a-cote' | 'devant' | 'derriere'

export type Pic =
  /** Une collection d'objets (déjà placés). */
  | { t: 'set'; items: Placed[] }
  /** Un seul objet, grand ; en ombre noire si silhouette. */
  | { t: 'thing'; thing: Thing; color?: ColorName; silhouette?: boolean; flip?: boolean; s?: number }
  /** Un chiffre (ou nombre) écrit en grand. */
  | { t: 'digit'; n: number }
  /** Une lettre ou un mot (capitales d'imprimerie ou script). */
  | { t: 'text'; text: string; font?: 'cap' | 'script' }
  /** Une image et son mot écrit dessous. */
  | { t: 'word'; thing: Thing }
  /** Une forme géométrique. */
  | { t: 'shape'; shape: Shape; color: ColorName; s?: number; rot?: number }
  /** Une face de dé (1 à 6). */
  | { t: 'dice'; n: number }
  /** Une suite d'images ; hole : case vide marquée « ? ». */
  | { t: 'row'; items: Pic[]; hole?: number }
  /** Une barre (crayon) de longueur relative 0..1, qui commence en `from` (0..0.4, décalée pour obliger à comparer). */
  | { t: 'bar'; len: number; color: ColorName; from?: number }
  /** Une tour de n cubes (size : hauteur d'un cube, 14 par défaut ; des cubes de tailles différentes obligent à compter). */
  | { t: 'tower'; n: number; color: ColorName; size?: number }
  /** Des mains qui montrent n doigts (une main jusqu'à 5, deux mains au-delà). */
  | { t: 'hands'; n: number }
  /** Boîte de 10 (cadre 2 × 5) remplie de n jetons ; deux boîtes au-delà de 10. */
  | { t: 'frame'; n: number; color: ColorName }
  /** Une balance : le côté le plus lourd penche. */
  | { t: 'balance'; left: Thing; right: Thing; heavier: 'left' | 'right' }
  /** Un verre rempli à `level` (0..1). */
  | { t: 'glass'; level: number }
  /** Une planche percée d'un trou en forme de `shape` (le jeu d'encastrement). */
  | { t: 'hole'; shape: Shape; rot?: number }
  /** Une scène : un objet placé par rapport à une boîte. */
  | { t: 'scene'; rel: Relation; thing: Thing }
  /** Un signe (« ? », « = », « → ») pour les pictogrammes de consigne. */
  | { t: 'mark'; ch: string }

/** Ce qui fait d'un exercice un exercice de maternelle (réponse à choisir parmi des images). */
export interface KidSpec {
  /** Consigne lue à voix haute (et écrite en petit pour l'adulte qui accompagne). */
  say: string
  /** Image principale (facultative). */
  scene?: Pic
  /** Les réponses possibles, en images (dans l'ordre des choix « 0 », « 1 »…). */
  options: Pic[]
}

// ── Placement des objets ───────────────────────────────────────────────
const rnd = (a: number, b: number) => a + Math.random() * (b - a)

/** n objets éparpillés sans se chevaucher dans la boîte 200 × 150 (le plus gros possible). */
export function scatter(n: number, things: (i: number) => { thing: Thing; color?: ColorName; s?: number }): Placed[] {
  const s = n <= 2 ? 1.6 : n <= 4 ? 1.35 : n <= 6 ? 1.15 : n <= 10 ? 0.95 : 0.78
  const minD = 42 * s
  const out: Placed[] = []
  for (let i = 0; i < n; i++) {
    const t = things(i)
    const r = 21 * s * (t.s ?? 1)
    let best = { x: 100, y: 75, d: -1 }
    for (let k = 0; k < 80; k++) {
      const x = rnd(r + 2, 198 - r), y = rnd(r + 2, 148 - r)
      const d = Math.min(999, ...out.map((p) => Math.hypot(p.x - x, p.y - y)))
      if (d > best.d) best = { x, y, d }
      if (d >= minD * Math.max(1, t.s ?? 1)) break
    }
    out.push({ thing: t.thing, color: t.color, x: best.x, y: best.y, s: (t.s ?? 1) * s })
  }
  return out
}

/** n objets alignés (sur deux rangées au-delà de 5). */
export function line(n: number, things: (i: number) => { thing: Thing; color?: ColorName; s?: number }): Placed[] {
  const rows = n > 5 ? 2 : 1
  const perRow = Math.ceil(n / rows)
  const gap = Math.min(190 / perRow, 62)
  const s = Math.min(1.35, gap / 44)
  return Array.from({ length: n }, (_, i) => {
    const r = Math.floor(i / perRow), c = i % perRow
    const t = things(i)
    return { thing: t.thing, color: t.color, s: (t.s ?? 1) * s, x: 100 + (c - (perRow - 1) / 2) * gap, y: rows === 1 ? 75 : 42 + r * 66 }
  })
}

/** Disposition « constellation de dé » (jusqu'à 10 : deux faces). */
export function dice(n: number, thing: Thing, color?: ColorName): Placed[] {
  const big = n <= 6
  const face = (k: number, ox: number): [number, number][] => {
    const p: Record<number, [number, number][]> = {
      1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]], 4: [[-1, -1], [1, -1], [-1, 1], [1, 1]],
      5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]], 6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]],
    }
    return p[k].map(([x, y]) => [ox + x * (big ? 34 : 24), 75 + y * (big ? 46 : 44)])
  }
  const pts = big ? face(n, 100) : [...face(5, 50), ...face(n - 5, 150)]
  return pts.map(([x, y]) => ({ thing, color, x, y, s: big ? 1.35 : 0.8 }))
}
