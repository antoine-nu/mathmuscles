// Figures de géométrie déclaratives, dessinées sur le parchemin (voir components/FigureView.tsx).
// On décrit des points en coordonnées « mathématiques » (y vers le haut) ; fitPoints() les place
// dans le cadre de dessin. Les figures ne sont pas à l'échelle sauf mention contraire.

export type LabelPos = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'

export interface FigPoint {
  x: number
  y: number
  /** Nom affiché (par défaut : la clé du point). Chaîne vide = pas de nom. */
  label?: string
  /** Position du nom autour du point (par défaut : à l'opposé du centre de la figure). */
  pos?: LabelPos
  /** Ne pas dessiner le point (utile pour des points de construction). */
  hidden?: boolean
}

export interface FigSegment {
  a: string
  b: string
  /** Texte posé au milieu du segment, côté extérieur (ex. « 6 cm », « x »). */
  label?: string
  dashed?: boolean
  /** Prolonge le segment des deux côtés pour figurer une droite (en unités du cadre). */
  extend?: number
  /** Codage : 1 ou 2 petits traits (longueurs égales), ou une flèche (droites parallèles). */
  mark?: 'tick' | 'tick2' | 'arrow' | 'arrow2'
  color?: string
}

export interface FigAngle {
  /** Sommet de l'angle, puis un point sur chacun des deux côtés. */
  vertex: string
  a: string
  b: string
  label?: string
  /** Angle droit : petit carré au lieu d'un arc. */
  right?: boolean
  /** Couleur de l'arc (par défaut encre). Utile pour distinguer l'angle cherché. */
  color?: string
  /** Rayon de l'arc (par défaut 20). */
  radius?: number
}

export interface Figure {
  /** Taille du cadre de dessin (par défaut 320 × 220). */
  w?: number
  h?: number
  points: Record<string, FigPoint>
  segments?: FigSegment[]
  angles?: FigAngle[]
  /** Polygones remplis (zones colorées, ex. une aire à calculer). */
  polygons?: { pts: string[]; fill: string }[]
  /** Textes libres (coordonnées du cadre). */
  notes?: { x: number; y: number; text: string }[]
  /** Légende sous la figure (par défaut « La figure n'est pas à l'échelle. »). */
  caption?: string
}

export const FIG_W = 320
export const FIG_H = 220

/**
 * Place des points donnés en coordonnées mathématiques (y vers le haut) dans le cadre,
 * en conservant les proportions et en laissant une marge pour les noms.
 */
export function fitPoints(raw: Record<string, [number, number]>, w = FIG_W, h = FIG_H, margin = 34): Record<string, FigPoint> {
  const xs = Object.values(raw).map((p) => p[0])
  const ys = Object.values(raw).map((p) => p[1])
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys)
  const spanX = maxX - minX || 1, spanY = maxY - minY || 1
  const k = Math.min((w - 2 * margin) / spanX, (h - 2 * margin) / spanY)
  const offX = (w - spanX * k) / 2, offY = (h - spanY * k) / 2
  const out: Record<string, FigPoint> = {}
  for (const [name, [x, y]] of Object.entries(raw)) {
    out[name] = { x: offX + (x - minX) * k, y: h - (offY + (y - minY) * k) }
  }
  return out
}

/** Coordonnées d'un triangle ABC à partir de ses angles en A et B (en degrés), base AB horizontale. */
export function triangleFromAngles(angleA: number, angleB: number, base = 6): Record<'A' | 'B' | 'C', [number, number]> {
  const a = (angleA * Math.PI) / 180, b = (angleB * Math.PI) / 180
  // C est à l'intersection des demi-droites issues de A (angle a) et de B (angle π − b).
  const t = (base * Math.sin(b)) / Math.sin(a + b)
  return { A: [0, 0], B: [base, 0], C: [t * Math.cos(a), t * Math.sin(a)] }
}

/** Triangle avec noms de sommets au choix et étiquettes facultatives sur côtés et angles. */
export function triangleFigure(opts: {
  names?: [string, string, string]
  /** Angles « réels » en A et B pour la forme du dessin (défaut 60° / 50°). */
  shape?: [number, number]
  sides?: Partial<Record<'AB' | 'BC' | 'CA', string>>
  angles?: Partial<Record<'A' | 'B' | 'C', string>>
  /** Sommet portant un angle droit (forme ajustée automatiquement). */
  right?: 'A' | 'B' | 'C'
  /** Angle à mettre en évidence (couleur) : l'angle cherché. */
  highlight?: 'A' | 'B' | 'C'
  marks?: Partial<Record<'AB' | 'BC' | 'CA', 'tick' | 'tick2'>>
}): Figure {
  const [nA, nB, nC] = opts.names ?? ['A', 'B', 'C']
  let shape = opts.shape ?? [60, 50]
  if (opts.right === 'A') shape = [90, shape[1] === 50 ? 40 : shape[1]]
  if (opts.right === 'B') shape = [shape[0] === 60 ? 50 : shape[0], 90]
  let raw = triangleFromAngles(shape[0], shape[1])
  if (opts.right === 'C') {
    raw = { A: [0, 0], B: [6, 0], C: [6 * 0.36, 6 * 0.48] } // angle droit en C (cercle de diamètre AB)
  }
  const pts = fitPoints({ [nA]: raw.A, [nB]: raw.B, [nC]: raw.C })
  const key = { A: nA, B: nB, C: nC }
  const seg = (s: 'AB' | 'BC' | 'CA'): FigSegment => ({
    a: key[s[0] as 'A'], b: key[s[1] as 'A'], label: opts.sides?.[s], mark: opts.marks?.[s],
  })
  const other = { A: ['B', 'C'], B: ['C', 'A'], C: ['A', 'B'] } as const
  const angles: FigAngle[] = []
  for (const v of ['A', 'B', 'C'] as const) {
    const label = opts.angles?.[v]
    const right = opts.right === v
    if (label || right || opts.highlight === v) {
      angles.push({
        vertex: key[v], a: key[other[v][0]], b: key[other[v][1]], label, right,
        color: opts.highlight === v ? '#b8362f' : undefined,
      })
    }
  }
  return { points: pts, segments: [seg('AB'), seg('BC'), seg('CA')], angles }
}

/**
 * Deux droites parallèles coupées par une sécante.
 * Points : sur la droite du haut U1–U2, celle du bas D1–D2, sécante S1–S2, intersections I (haut) et J (bas).
 * `known` et `asked` désignent des angles par leur position : coin (ex. 'I-ne' = angle en I entre la direction
 * nord-est de la sécante et l'est de la droite du haut).
 */
export function parallelsFigure(opts: {
  /** Inclinaison de la sécante, en degrés par rapport à l'horizontale (défaut 62°). */
  tilt?: number
  known: { at: 'I' | 'J'; corner: 'ne' | 'nw' | 'se' | 'sw'; label: string }
  asked: { at: 'I' | 'J'; corner: 'ne' | 'nw' | 'se' | 'sw'; label: string }
  lineNames?: [string, string]
}): Figure {
  const t = ((opts.tilt ?? 62) * Math.PI) / 180
  const W = FIG_W
  const yTop = 70, yBot = 160
  const cx = W / 2
  const dx = (yBot - yTop) / Math.tan(t)
  const I = { x: cx + dx / 2, y: yTop }, J = { x: cx - dx / 2, y: yBot }
  const ux = Math.cos(t), uy = -Math.sin(t) // direction « montante » de la sécante (écran)
  const points: Record<string, FigPoint> = {
    U1: { x: 20, y: yTop, hidden: true, label: '' }, U2: { x: W - 20, y: yTop, hidden: true, label: '' },
    D1: { x: 20, y: yBot, hidden: true, label: '' }, D2: { x: W - 20, y: yBot, hidden: true, label: '' },
    S1: { x: J.x - ux * 50, y: J.y - uy * 50, hidden: true, label: '' },
    S2: { x: I.x + ux * 50, y: I.y + uy * 50, hidden: true, label: '' },
    I: { ...I, label: 'I', pos: 'nw' }, J: { ...J, label: 'J', pos: 'se' },
    // points auxiliaires pour orienter les angles
    Ie: { x: I.x + 40, y: I.y, hidden: true, label: '' }, Iw: { x: I.x - 40, y: I.y, hidden: true, label: '' },
    Je: { x: J.x + 40, y: J.y, hidden: true, label: '' }, Jw: { x: J.x - 40, y: J.y, hidden: true, label: '' },
    Iu: { x: I.x + ux * 40, y: I.y + uy * 40, hidden: true, label: '' }, Id: { x: I.x - ux * 40, y: I.y - uy * 40, hidden: true, label: '' },
    Ju: { x: J.x + ux * 40, y: J.y + uy * 40, hidden: true, label: '' }, Jd: { x: J.x - ux * 40, y: J.y - uy * 40, hidden: true, label: '' },
  }
  const angle = (spec: { at: 'I' | 'J'; corner: 'ne' | 'nw' | 'se' | 'sw'; label: string }, color?: string): FigAngle => {
    const P = spec.at
    const horiz = spec.corner.endsWith('e') ? `${P}e` : `${P}w`
    const sec = spec.corner.startsWith('n') ? `${P}u` : `${P}d`
    return { vertex: P, a: horiz, b: sec, label: spec.label, color, radius: 22 }
  }
  const [n1, n2] = opts.lineNames ?? ['(d)', '(d′)']
  return {
    points,
    segments: [
      { a: 'U1', b: 'U2', mark: 'arrow' }, { a: 'D1', b: 'D2', mark: 'arrow' }, { a: 'S1', b: 'S2' },
    ],
    angles: [angle(opts.known), angle(opts.asked, '#b8362f')],
    notes: [{ x: W - 28, y: yTop - 8, text: n1 }, { x: W - 28, y: yBot - 8, text: n2 }],
  }
}

/**
 * Configuration de Thalès : A sommet, M et B sur une demi-droite, N et C sur l'autre, (MN) // (BC).
 * `butterfly` = configuration « papillon » (M et N de l'autre côté de A).
 */
export function thalesFigure(opts: {
  names?: { A?: string; M?: string; N?: string; B?: string; C?: string }
  /** Rapport AM/AB utilisé pour le dessin (défaut 0,45). */
  ratio?: number
  butterfly?: boolean
  labels?: Partial<Record<'AM' | 'AB' | 'AN' | 'AC' | 'MN' | 'BC' | 'MB' | 'NC', string>>
}): Figure {
  const n = { A: 'A', M: 'M', N: 'N', B: 'B', C: 'C', ...opts.names }
  const k = opts.ratio ?? 0.45
  const B: [number, number] = [8, 1], C: [number, number] = [6.5, 5.5], A: [number, number] = [0, 2]
  const s = opts.butterfly ? -k : k
  const M: [number, number] = [A[0] + (B[0] - A[0]) * s, A[1] + (B[1] - A[1]) * s]
  const N: [number, number] = [A[0] + (C[0] - A[0]) * s, A[1] + (C[1] - A[1]) * s]
  const pts = fitPoints({ [n.A]: A, [n.M]: M, [n.N]: N, [n.B]: B, [n.C]: C })
  const L = opts.labels ?? {}
  const segments: FigSegment[] = opts.butterfly
    ? [
        { a: n.M, b: n.B }, { a: n.N, b: n.C },
        { a: n.M, b: n.N, label: L.MN, mark: 'arrow' }, { a: n.B, b: n.C, label: L.BC, mark: 'arrow' },
        { a: n.A, b: n.M, label: L.AM, color: 'transparent' }, { a: n.A, b: n.B, label: L.AB, color: 'transparent' },
        { a: n.A, b: n.N, label: L.AN, color: 'transparent' }, { a: n.A, b: n.C, label: L.AC, color: 'transparent' },
      ]
    : [
        { a: n.A, b: n.B, label: L.AB }, { a: n.A, b: n.C, label: L.AC },
        { a: n.M, b: n.N, label: L.MN, mark: 'arrow' }, { a: n.B, b: n.C, label: L.BC, mark: 'arrow' },
        { a: n.A, b: n.M, label: L.AM, color: 'transparent' }, { a: n.A, b: n.N, label: L.AN, color: 'transparent' },
        { a: n.M, b: n.B, label: L.MB, color: 'transparent' }, { a: n.N, b: n.C, label: L.NC, color: 'transparent' },
      ]
  return { points: pts, segments }
}
