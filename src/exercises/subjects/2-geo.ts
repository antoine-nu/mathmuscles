// Problèmes de géométrie (2nde) : configurations du plan, théorème de Pythagore (et réciproque),
// théorème de Thalès (et réciproque, configuration papillon), trigonométrie dans le triangle rectangle,
// aires et périmètres associés. Presque chaque exercice a son schéma, construit à partir des données tirées.
import {
  choice, expression, fmt, fracText, gcd, fraction, fresh, numeric, parseNumber, pick, radical, randInt, shuffle, variants, withMeta,
  type Exercise, type Ladder, type Maker, type SubjectContent, type Tiers,
} from '../utils'
import { fitPoints, type FigAngle, type FigSegment, type Figure, type LabelPos } from '../figure'
import { prenom } from '../contexts'

// ── Aides locales ───────────────────────────────────────────────────────
type Pt = [number, number]
type Raw = Record<string, Pt>

const RED = '#b8362f'
const GOLD = '#d9a441'
const BLUE = '#5b8fc7'
const GREEN = '#6aa86a'

/** Problème titré, avec figure facultative. */
const T = (title: string, ex: Exercise, figure?: Figure): Exercise => withMeta(ex, figure ? { title, figure } : { title })
/** Exercice accompagné d'une figure. */
const W = (ex: Exercise, figure: Figure): Exercise => withMeta(ex, { figure })
/** Modèle d'entraînement : plusieurs variantes, sans réponse écrite dans l'énoncé. */
const model = (...makers: Maker[]): Maker => fresh(variants(...makers))

/** Relance le tirage tant qu'il ne donne pas des nombres « propres ». */
function retry<R>(gen: () => R | null | undefined | false): R {
  for (let i = 0; i < 5000; i++) {
    const r = gen()
    if (r) return r
  }
  throw new Error('Tirage impossible')
}

const r6 = (v: number) => Math.round(v * 1e6) / 1e6
const rnd = (v: number, d = 1) => Math.round(v * 10 ** d) / 10 ** d
const isInt = (v: number) => Math.abs(v - Math.round(v)) < 1e-9
const isDec = (v: number, d = 1) => isInt(r6(v * 10 ** d))
const rad = (d: number) => (d * Math.PI) / 180
const deg = (r: number) => (r * 180) / Math.PI
/** Carré écrit proprement (décimaux compris). */
const sq = (v: number) => fmt(r6(v * v))
/** Angle géométrique : AB̂C. */
const hat = (a: string, b: string, c: string) => `${a}${b}̂${c}`
const L = (v: number, u: string) => `${fmt(v)} ${u}`

/** Réponse arrondie : on accepte toute valeur à moins de 0,6 unité du dernier rang demandé. */
function approx(prompt: string, exact: number, d: number, explanation: string): Exercise {
  const shown = rnd(exact, d)
  const base = numeric(prompt, shown, {
    explanation,
    inputHint: d === 0 ? 'Valeur arrondie à l’unité' : d === 1 ? 'Valeur arrondie au dixième' : 'Valeur arrondie au centième',
  })
  return {
    ...base,
    check: (v) => {
      const x = parseNumber(v)
      return !Number.isNaN(x) && Math.abs(x - exact) <= 0.6 * 10 ** -d + 1e-9
    },
  }
}

interface FreeOpts {
  segments?: FigSegment[]
  angles?: FigAngle[]
  polygons?: { pts: string[]; fill: string }[]
  labels?: Record<string, string>
  pos?: Record<string, LabelPos>
  hidden?: string[]
  notes?: { at: Pt; text: string }[]
  caption?: string
  w?: number
  h?: number
  margin?: number
  /** Étiquette du segment « AB » placée à l'opposé du point donné. */
  away?: Record<string, string>
  /** Étiquettes placées du côté intérieur (vers le point donné dans `away`, ou vers le centre). */
  inside?: string[]
}

/** Figure libre en coordonnées mathématiques, cadrée automatiquement. Les clés commençant par _ sont cachées. */
function free(raw: Raw, o: FreeOpts = {}): Figure {
  const ext: Raw = { ...raw }
  o.notes?.forEach((n, i) => { ext[`__n${i}`] = n.at })
  const w = o.w ?? 320, h = o.h ?? 220
  const pts = fitPoints(ext, w, h, o.margin ?? 44)
  const notes = o.notes?.map((n, i) => {
    const p = pts[`__n${i}`]
    delete pts[`__n${i}`]
    return { x: p.x, y: p.y + 5, text: n.text }
  })
  for (const [k, p] of Object.entries(pts)) {
    if (o.labels && k in o.labels) p.label = o.labels[k]
    if (o.pos?.[k]) p.pos = o.pos[k]
    if (k.startsWith('_') || o.hidden?.includes(k)) { p.hidden = true; p.label = '' }
  }
  const fig: Figure = { points: pts, segments: o.segments, angles: o.angles, polygons: o.polygons, notes, caption: o.caption }
  if (o.w) fig.w = w
  if (o.h) fig.h = h
  return labelNotes(fig, o.away, o.inside)
}

const DIRS: LabelPos[] = ['e', 'se', 's', 'sw', 'w', 'nw', 'n', 'ne']
/** Position du nom d'un point dans la direction (dx ; dy) du cadre (y vers le bas). */
const posFrom = (dx: number, dy: number): LabelPos => DIRS[Math.round(((Math.atan2(dy, dx) + 2 * Math.PI) % (2 * Math.PI)) / (Math.PI / 4)) % 8]
const OFF: Record<LabelPos, [number, number]> = { n: [0, -10], s: [0, 16], e: [10, 5], w: [-10, 5], ne: [8, -7], nw: [-8, -7], se: [8, 15], sw: [-8, 15] }
type Box = [number, number, number, number]
const overlap = (a: Box, b: Box) => a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3]

/**
 * Remplace les étiquettes des segments par des notes placées du côté extérieur de la figure (ou à l'opposé du point
 * indiqué dans `away`), décalées selon la largeur du texte, en évitant les noms des points et les autres étiquettes.
 */
function labelNotes(fig: Figure, away: Record<string, string> = {}, inside: string[] = []): Figure {
  const w = fig.w ?? 320, h = fig.h ?? 220, pts = fig.points
  const all = Object.values(pts)
  const vis = all.filter((p) => !p.hidden).length >= 2 ? all.filter((p) => !p.hidden) : all
  const cx = vis.reduce((s, p) => s + p.x, 0) / Math.max(1, vis.length)
  const cy = vis.reduce((s, p) => s + p.y, 0) / Math.max(1, vis.length)
  // boîtes occupées : points et leurs noms (position fixée ici, comme le ferait le rendu)
  const busy: Box[] = []
  for (const p of all) {
    if (p.hidden) continue
    busy.push([p.x - 3, p.y - 3, p.x + 3, p.y + 3])
    const label = p.label ?? ''
    if (!label) continue
    p.pos = p.pos ?? posFrom(p.x - cx, p.y - cy)
    const [ox, oy] = OFF[p.pos], bx = p.x + ox, by = p.y + oy, tw = 9 * [...label].length
    const x0 = p.pos === 'e' || p.pos === 'ne' || p.pos === 'se' ? bx : p.pos === 'w' || p.pos === 'nw' || p.pos === 'sw' ? bx - tw : bx - tw / 2
    busy.push([x0, by - 12, x0 + tw, by + 2])
  }
  for (const n of fig.notes ?? []) {
    const half = 3.9 * [...n.text].length
    busy.push([n.x - half, n.y - 11, n.x + half, n.y + 2])
  }
  const extra: { x: number; y: number; text: string }[] = []
  const segments = fig.segments?.map((s) => {
    const a = pts[s.a], b = pts[s.b]
    if (!s.label || !a || !b) return s
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1
    const ux = (b.x - a.x) / len, uy = (b.y - a.y) / len
    let nx = -uy, ny = ux
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2
    const ref = pts[away[s.a + s.b] ?? away[s.b + s.a] ?? ''] ?? { x: cx, y: cy }
    if ((mx - ref.x) * nx + (my - ref.y) * ny < 0) { nx = -nx; ny = -ny }
    if (inside.includes(s.a + s.b) || inside.includes(s.b + s.a)) { nx = -nx; ny = -ny }
    const half = 3.9 * [...s.label].length
    const place = (t: number, extraD: number, side: number): [number, number] => {
      const px = mx + ux * t * len, py = my + uy * t * len
      const x = Math.min(w - half - 3, Math.max(half + 3, px + side * nx * ((Math.abs(nx) < 0.3 ? 13 : 9 + half) + extraD)))
      return [x, Math.min(h - 4, Math.max(14, py + side * ny * (13 + extraD) + 5))]
    }
    let best = place(0, 0, 1), fewest = Infinity
    search: for (const [extraD, side] of [[0, 1], [8, 1], [16, 1], [0, -1], [8, -1]]) {
      for (const t of [0, 0.12, -0.12, 0.24, -0.24, 0.34, -0.34, 0.42, -0.42]) {
        const [x, y] = place(t, extraD, side)
        const box: Box = [x - half, y - 11, x + half, y + 2]
        const hits = busy.filter((bb) => overlap(bb, box)).length
        if (hits < fewest) { fewest = hits; best = [x, y] }
        if (!hits) break search
      }
    }
    busy.push([best[0] - half, best[1] - 11, best[0] + half, best[1] + 2])
    extra.push({ x: best[0], y: best[1], text: s.label })
    return { ...s, label: undefined }
  })
  const notes = [...(fig.notes ?? []), ...extra]
  return { ...fig, segments, notes: notes.length ? notes : undefined }
}

/** Rotation (en degrés) et symétrie éventuelle d'un ensemble de points, pour varier l'orientation des figures. */
function orient(raw: Raw, turn: number, mirror = false): Raw {
  const t = rad(turn), c = Math.cos(t), s = Math.sin(t)
  const out: Raw = {}
  for (const [k, [x, y0]] of Object.entries(raw)) {
    const y = mirror ? -y0 : y0
    out[k] = [x * c - y * s, x * s + y * c]
  }
  return out
}
const randomOrient = (raw: Raw): Raw => orient(raw, pick([0, 0, 90, 180, 270, 20, -20]), Math.random() < 0.5)

const TRI_NAMES: [string, string, string][] = [
  ['A', 'B', 'C'], ['D', 'E', 'F'], ['E', 'F', 'G'], ['R', 'S', 'T'], ['K', 'L', 'M'], ['M', 'N', 'P'], ['I', 'J', 'K'], ['P', 'Q', 'R'], ['U', 'V', 'W'],
]
/** Trois noms de sommets, dans un ordre au hasard. */
const names3 = () => shuffle([...pick(TRI_NAMES)]) as [string, string, string]
const QUAD_NAMES: [string, string, string, string][] = [['A', 'B', 'C', 'D'], ['E', 'F', 'G', 'H'], ['K', 'L', 'M', 'N'], ['P', 'Q', 'R', 'S'], ['R', 'S', 'T', 'U']]
const names4 = () => pick(QUAD_NAMES)
const unit = () => pick(['cm', 'cm', 'm', 'dm', 'mm'])

/** Triplets pythagoriciens de base (côtés de l'angle droit, hypoténuse). */
const BASES: [number, number, number][] = [[3, 4, 5], [5, 12, 13], [8, 15, 17], [20, 21, 29]]
/** Triplet (a ; b ; c) avec a² + b² = c², éventuellement décimal. */
function triple(max = 40, decimal = false): [number, number, number] {
  return retry(() => {
    const b = pick(BASES)
    const k = decimal ? pick([0.5, 1.5, 2.5, 0.2, 0.4, 0.6, 0.3]) : randInt(1, 9)
    const t = b.map((x) => r6(x * k))
    if (t[2] > max || (!decimal && t[2] < 5)) return null
    return Math.random() < 0.5 ? [t[0], t[1], t[2]] : [t[1], t[0], t[2]]
  })
}

/** Les trois angles (en degrés) d'un triangle de côtés a = BC, b = CA, c = AB : [Â, B̂, Ĉ]. */
function anglesOf(a: number, b: number, c: number): [number, number, number] {
  const A = deg(Math.acos((b * b + c * c - a * a) / (2 * b * c)))
  const B = deg(Math.acos((a * a + c * c - b * b) / (2 * a * c)))
  return [A, B, 180 - A - B]
}
/** Triangle non aplati dont tous les angles dépassent `min` degrés. */
function goodTri(a: number, b: number, c: number, min = 28): boolean {
  if (a + b <= c || b + c <= a || a + c <= b) return false
  return anglesOf(a, b, c).every((t) => t >= min)
}
/** Coordonnées A, B, C d'un triangle de côtés BC = a, CA = b, AB = c (base AB horizontale). */
function triFromSides(a: number, b: number, c: number): { A: Pt; B: Pt; C: Pt } {
  const x = (b * b + c * c - a * a) / (2 * c)
  return { A: [0, 0], B: [c, 0], C: [x, Math.sqrt(Math.max(0, b * b - x * x))] }
}

type Side = 'RP' | 'RQ' | 'PQ'
/**
 * Triangle RPQ rectangle en R, de côtés de l'angle droit RP = p et RQ = q (dessin fidèle aux proportions).
 * `angle` met en évidence l'angle aigu en P ou en Q.
 */
function rightTri(n: [string, string, string], p: number, q: number, o: {
  sides?: Partial<Record<Side, string>>
  red?: Side[]
  angle?: { at: 'P' | 'Q'; label?: string }
  fixed?: boolean
  labels?: Record<string, string>
  hidden?: string[]
} = {}): Figure {
  const [R, P, Q] = n
  const ratio = Math.min(2.8, Math.max(0.36, q / p))
  let raw: Raw = { [R]: [0, 0], [P]: [1, 0], [Q]: [0, ratio] }
  if (!o.fixed) {
    if (Math.random() < 0.2) {
      // hypoténuse horizontale, angle droit en haut
      const t = Math.atan2(ratio, -1)
      raw = orient(raw, -deg(t) + 180, false)
      if (raw[R][1] < raw[P][1]) raw = orient(raw, 0, true)
    } else raw = randomOrient(raw)
  }
  const seg = (a: string, b: string, s: Side): FigSegment => ({ a, b, label: o.sides?.[s], color: o.red?.includes(s) ? RED : undefined })
  const angles: FigAngle[] = [{ vertex: R, a: P, b: Q, right: true }]
  if (o.angle) {
    const V = o.angle.at === 'P' ? P : Q
    angles.push({ vertex: V, a: R, b: V === P ? Q : P, label: o.angle.label, color: RED, radius: 24 })
  }
  return free(raw, { segments: [seg(R, P, 'RP'), seg(R, Q, 'RQ'), seg(P, Q, 'PQ')], angles, labels: o.labels, hidden: o.hidden })
}

/** Triangle quelconque de côtés BC = a, CA = b, AB = c, noms au choix. */
function sidesTri(n: [string, string, string], a: number, b: number, c: number, lab: { a?: string; b?: string; c?: string }): Figure {
  const { A, B, C } = triFromSides(a, b, c)
  const raw = randomOrient({ [n[0]]: A, [n[1]]: B, [n[2]]: C })
  return free(raw, {
    segments: [{ a: n[1], b: n[2], label: lab.a }, { a: n[2], b: n[0], label: lab.b }, { a: n[0], b: n[1], label: lab.c }],
  })
}

/** Rectangle n0 n1 n2 n3 de longueur l1 (n0n1) et largeur l2 (n1n2), avec sa diagonale [n0n2]. */
function rectFig(n: [string, string, string, string], l1: number, l2: number, lab: { l1?: string; l2?: string; d?: string }, redDiag = true): Figure {
  const ratio = Math.min(1.6, Math.max(0.35, l2 / l1))
  const raw = orient({ [n[0]]: [0, 0], [n[1]]: [1, 0], [n[2]]: [1, ratio], [n[3]]: [0, ratio] }, pick([0, 0, 180]), false)
  return free(raw, {
    segments: [
      { a: n[0], b: n[1], label: lab.l1 }, { a: n[1], b: n[2], label: lab.l2 }, { a: n[2], b: n[3] }, { a: n[3], b: n[0] },
      { a: n[0], b: n[2], label: lab.d, color: redDiag ? RED : undefined, dashed: !redDiag },
    ],
    angles: [{ vertex: n[1], a: n[0], b: n[2], right: true }],
    away: { [n[0] + n[2]]: n[1] },
  })
}

// ── Thalès ──────────────────────────────────────────────────────────────
interface TN { A: string; M: string; N: string; B: string; C: string }
const THALES_NAMES: TN[] = [
  { A: 'A', M: 'M', N: 'N', B: 'B', C: 'C' }, { A: 'O', M: 'E', N: 'F', B: 'G', C: 'H' }, { A: 'S', M: 'R', N: 'T', B: 'U', C: 'V' },
  { A: 'K', M: 'I', N: 'J', B: 'L', C: 'P' }, { A: 'D', M: 'E', N: 'F', B: 'G', C: 'H' }, { A: 'P', M: 'R', N: 'S', B: 'T', C: 'U' },
]
interface Th { AB: number; AC: number; BC: number; k: number; AM: number; AN: number; MN: number; MB: number; NC: number }
const KS: [number, number][] = [[1, 2], [1, 3], [2, 3], [1, 4], [3, 4], [2, 5], [3, 5], [4, 5]]
/** Rapports pour la configuration papillon (petit triangle assez grand pour être lisible). */
const KB: [number, number][] = [[1, 2], [2, 3], [3, 4], [2, 5], [3, 5], [4, 5]]
/** Configuration de Thalès à longueurs entières (rapport k = AM/AB). */
function thalesData(max = 30, ks = KS): Th {
  return retry(() => {
    const [p, q] = pick(ks)
    const u = randInt(2, 7), v = randInt(2, 7), w = randInt(2, 7)
    const AB = q * u, AC = q * v, BC = q * w
    if (Math.max(AB, AC, BC) > max || !goodTri(BC, AC, AB, 30)) return null
    const AM = p * u, AN = p * v, MN = p * w
    return { AB, AC, BC, k: p / q, AM, AN, MN, MB: AB - AM, NC: AC - AN }
  })
}
type TK = 'AM' | 'AB' | 'AN' | 'AC' | 'MN' | 'BC' | 'MB' | 'NC'
/** Figure de Thalès fidèle aux longueurs (triangle ou papillon), étiquettes au choix, longueur cherchée en rouge. */
function thalesFig(n: TN, d: { AB: number; AC: number; BC: number; k: number }, butterfly: boolean, lab: Partial<Record<TK, string>>, red?: TK, kN?: number): Figure {
  const { B, C } = triFromSides(d.BC, d.AC, d.AB)
  const s = butterfly ? -d.k : d.k
  const sN = (butterfly ? -1 : 1) * (kN ?? d.k)
  const raw = orient({ [n.A]: [0, 0], [n.B]: B, [n.C]: C, [n.M]: [s * B[0], s * B[1]], [n.N]: [sN * C[0], sN * C[1]] }, pick([0, 0, 180, 15, -15, 165]), Math.random() < 0.5)
  const col = (k: TK) => (red === k ? RED : undefined)
  const segs: FigSegment[] = butterfly
    ? [
        { a: n.A, b: n.M, label: lab.AM, color: col('AM') }, { a: n.A, b: n.B, label: lab.AB, color: col('AB') },
        { a: n.A, b: n.N, label: lab.AN, color: col('AN') }, { a: n.A, b: n.C, label: lab.AC, color: col('AC') },
        { a: n.M, b: n.N, label: lab.MN, mark: 'arrow', color: col('MN') }, { a: n.B, b: n.C, label: lab.BC, mark: 'arrow', color: col('BC') },
      ]
    : [
        { a: n.A, b: n.M, label: lab.AM, color: col('AM') }, { a: n.M, b: n.B, label: lab.MB, color: col('MB') },
        { a: n.A, b: n.N, label: lab.AN, color: col('AN') }, { a: n.N, b: n.C, label: lab.NC, color: col('NC') },
        { a: n.M, b: n.N, label: lab.MN, mark: 'arrow', color: col('MN') }, { a: n.B, b: n.C, label: lab.BC, mark: 'arrow', color: col('BC') },
        ...(lab.AB ? [{ a: n.A, b: n.B, label: lab.AB, color: 'transparent' }] : []),
        ...(lab.AC ? [{ a: n.A, b: n.C, label: lab.AC, color: 'transparent' }] : []),
      ]
  const away: Record<string, string> = butterfly
    ? { [n.A + n.M]: n.N, [n.A + n.N]: n.M, [n.A + n.B]: n.C, [n.A + n.C]: n.B, [n.M + n.N]: n.A, [n.B + n.C]: n.A }
    : {
        [n.A + n.M]: n.C, [n.M + n.B]: n.C, [n.A + n.B]: n.C, [n.A + n.N]: n.B, [n.N + n.C]: n.B, [n.A + n.C]: n.B,
        [n.B + n.C]: n.A, [n.M + n.N]: d.k <= 0.55 ? n.A : n.B,
      }
  const inside: string[] = []
  if (!butterfly && lab.AB && (lab.AM || lab.MB)) inside.push(n.A + n.B)
  if (!butterfly && lab.AC && (lab.AN || lab.NC)) inside.push(n.A + n.C)
  const pos: Record<string, LabelPos> = {}
  if (butterfly) {
    // nom du centre dans un secteur latéral
    const [ax, ay] = raw[n.A], [mx, my] = raw[n.M], [cx, cy] = raw[n.C]
    const lm = Math.hypot(mx - ax, my - ay) || 1, lc = Math.hypot(cx - ax, cy - ay) || 1
    pos[n.A] = posFrom((mx - ax) / lm + (cx - ax) / lc, -((my - ay) / lm + (cy - ay) / lc))
  } else {
    // noms de M et N à l'intérieur du trapèze (bissectrice), loin des étiquettes extérieures
    const bis = (P: string, U: string, V: string) => {
      const [px, py] = raw[P], [ux, uy] = raw[U], [vx, vy] = raw[V]
      const lu = Math.hypot(ux - px, uy - py) || 1, lv = Math.hypot(vx - px, vy - py) || 1
      return posFrom((ux - px) / lu + (vx - px) / lv, -((uy - py) / lu + (vy - py) / lv))
    }
    /** Direction perpendiculaire à (PU), du côté opposé à V. */
    const out = (P: string, U: string, V: string) => {
      const [px, py] = raw[P], [ux, uy] = raw[U], [vx, vy] = raw[V]
      let nx = -(uy - py), ny = ux - px
      if (nx * (vx - px) + ny * (vy - py) > 0) { nx = -nx; ny = -ny }
      return posFrom(nx, -ny)
    }
    pos[n.M] = inside.includes(n.A + n.B) ? out(n.M, n.B, n.C) : bis(n.M, n.B, n.N)
    pos[n.N] = inside.includes(n.A + n.C) ? out(n.N, n.C, n.B) : bis(n.N, n.C, n.M)
  }
  return free(raw, { segments: segs, away, inside, pos, margin: 40 })
}
const thalesHyp = (n: TN, butterfly: boolean) => butterfly
  ? `Les points ${n.M}, ${n.A}, ${n.B} sont alignés, ainsi que les points ${n.N}, ${n.A}, ${n.C}, et les droites (${n.M}${n.N}) et (${n.B}${n.C}) sont parallèles.`
  : `Le point ${n.M} est sur le segment [${n.A}${n.B}], le point ${n.N} sur le segment [${n.A}${n.C}], et les droites (${n.M}${n.N}) et (${n.B}${n.C}) sont parallèles.`
const thalesRatios = (n: TN) => `${'{'}${n.A}${n.M}/${n.A}${n.B}} = ${'{'}${n.A}${n.N}/${n.A}${n.C}} = ${'{'}${n.M}${n.N}/${n.B}${n.C}}`
const frac = (a: string | number, b: string | number) => `{${a}/${b}}`

// ═════════════════════════════════════════════════════════════════════════
// Entraînement
// ═════════════════════════════════════════════════════════════════════════

// ── Palier 1 ────────────────────────────────────────────────────────────
const pythExplHyp = (R: string, P: string, Q: string, a: number, b: number, c: number, u: string) =>
  `Le triangle ${R}${P}${Q} est rectangle en ${R}, d'hypoténuse [${P}${Q}]. D'après le théorème de Pythagore : ${P}${Q}² = ${R}${P}² + ${R}${Q}² = ${sq(a)} + ${sq(b)} = ${sq(c)}, donc ${P}${Q} = √${sq(c)} = ${L(c, u)}.`
const pythExplLeg = (R: string, P: string, Q: string, a: number, b: number, c: number, u: string) =>
  `Le triangle ${R}${P}${Q} est rectangle en ${R}, d'hypoténuse [${P}${Q}]. D'après le théorème de Pythagore : ${P}${Q}² = ${R}${P}² + ${R}${Q}², donc ${R}${Q}² = ${P}${Q}² − ${R}${P}² = ${sq(c)} − ${sq(a)} = ${sq(b)} et ${R}${Q} = √${sq(b)} = ${L(b, u)}.`

// Pythagore : calcul de l'hypoténuse
const p1Hyp = model(
  () => {
    const [a, b, c] = triple(), [R, P, Q] = names3(), u = unit()
    return W(numeric(`Le triangle ${R}${P}${Q} est rectangle en ${R}, avec ${R}${P} = ${L(a, u)} et ${R}${Q} = ${L(b, u)}. Calcule la longueur ${P}${Q} (en ${u}).`, c, {
      explanation: pythExplHyp(R, P, Q, a, b, c, u),
    }), rightTri([R, P, Q], a, b, { sides: { RP: L(a, u), RQ: L(b, u), PQ: '?' }, red: ['PQ'] }))
  },
  () => {
    const [a, b, c] = triple(), [R, P, Q] = names3(), u = unit()
    return W(numeric(`Sur la figure, le triangle ${R}${P}${Q} est rectangle en ${R}. À l'aide des longueurs indiquées, calcule la longueur de l'hypoténuse [${P}${Q}] (en ${u}).`, c, {
      explanation: pythExplHyp(R, P, Q, a, b, c, u),
    }), rightTri([R, P, Q], a, b, { sides: { RP: L(a, u), RQ: L(b, u), PQ: '?' }, red: ['PQ'] }))
  },
  () => {
    const [a, b, c] = triple(), n = names4(), u = unit()
    const [l1, l2] = a >= b ? [a, b] : [b, a]
    return W(numeric(`Le rectangle ${n.join('')} a pour longueur ${n[0]}${n[1]} = ${L(l1, u)} et pour largeur ${n[1]}${n[2]} = ${L(l2, u)}. Calcule la longueur de sa diagonale [${n[0]}${n[2]}] (en ${u}).`, c, {
      explanation: `Le triangle ${n[0]}${n[1]}${n[2]} est rectangle en ${n[1]}. D'après le théorème de Pythagore : ${n[0]}${n[2]}² = ${sq(l1)} + ${sq(l2)} = ${sq(c)}, donc ${n[0]}${n[2]} = ${L(c, u)}.`,
    }), rectFig(n, l1, l2, { l1: L(l1, u), l2: L(l2, u), d: '?' }))
  },
  () => {
    const [a, b, c] = triple(10, true)
    const [l1, l2] = a >= b ? [a, b] : [b, a]
    const ctx = pick([
      { s: `Un portail rectangulaire mesure ${L(l1, 'm')} de large et ${L(l2, 'm')} de haut. Pour le rigidifier, le charpentier cloue une planche selon une diagonale. Quelle est la longueur de cette planche (en m) ?`, w: 'la planche' },
      { s: `Une tapisserie rectangulaire du château mesure ${L(l1, 'm')} sur ${L(l2, 'm')}. On tend un galon doré d'un coin au coin opposé. Quelle longueur de galon faut-il (en m) ?`, w: 'le galon' },
      { s: `Un champ rectangulaire mesure ${L(l1, 'hm')} sur ${L(l2, 'hm')}. Un berger le traverse en ligne droite d'un coin au coin opposé. Quelle distance parcourt-il (en hm) ?`, w: 'le trajet' },
    ])
    const n = names4()
    return W(numeric(ctx.s, c, {
      explanation: `La diagonale partage le rectangle en deux triangles rectangles. D'après le théorème de Pythagore : d² = ${sq(l1)} + ${sq(l2)} = ${sq(c)}, donc d = √${sq(c)} = ${fmt(c)}.`,
    }), rectFig(n, l1, l2, { l1: fmt(l1), l2: fmt(l2), d: '?' }))
  },
)

// Pythagore : calcul d'un côté de l'angle droit
const p1Leg = model(
  () => {
    const [a, b, c] = triple(), [R, P, Q] = names3(), u = unit()
    return W(numeric(`Le triangle ${R}${P}${Q} est rectangle en ${R}, avec ${P}${Q} = ${L(c, u)} et ${R}${P} = ${L(a, u)}. Calcule la longueur ${R}${Q} (en ${u}).`, b, {
      explanation: pythExplLeg(R, P, Q, a, b, c, u),
    }), rightTri([R, P, Q], a, b, { sides: { RP: L(a, u), PQ: L(c, u), RQ: '?' }, red: ['RQ'] }))
  },
  () => {
    const [a, b, c] = triple(), [R, P, Q] = names3(), u = unit()
    return W(numeric(`Sur la figure, le triangle ${R}${P}${Q} est rectangle en ${R}. Calcule la longueur ${R}${Q} (en ${u}) à l'aide des longueurs indiquées.`, b, {
      explanation: pythExplLeg(R, P, Q, a, b, c, u),
    }), rightTri([R, P, Q], a, b, { sides: { RP: L(a, u), PQ: L(c, u), RQ: '?' }, red: ['RQ'] }))
  },
  () => {
    const [a, b, c] = triple(10, true)
    const [d, h] = a < b ? [a, b] : [b, a]
    return W(numeric(`Une échelle de ${L(c, 'm')} est appuyée contre un mur vertical. Son pied est posé sur le sol horizontal, à ${L(d, 'm')} du pied du mur. À quelle hauteur le haut de l'échelle touche-t-il le mur (en m) ?`, h, {
      explanation: `Le mur, le sol et l'échelle forment un triangle rectangle d'hypoténuse l'échelle. D'après le théorème de Pythagore : h² = ${sq(c)} − ${sq(d)} = ${sq(h)}, donc h = ${L(h, 'm')}.`,
    }), rightTri(['O', 'P', 'H'], d, h, { fixed: true, sides: { RP: L(d, 'm'), PQ: L(c, 'm'), RQ: '?' }, red: ['RQ'], labels: { O: '', P: '', H: '' } }))
  },
  () => {
    const [a, b, c] = triple(), n = names4(), u = unit()
    const [l1, l2] = a >= b ? [a, b] : [b, a]
    return W(numeric(`La diagonale [${n[0]}${n[2]}] du rectangle ${n.join('')} mesure ${L(c, u)} et sa longueur ${n[0]}${n[1]} mesure ${L(l1, u)}. Calcule sa largeur ${n[1]}${n[2]} (en ${u}).`, l2, {
      explanation: `Le triangle ${n[0]}${n[1]}${n[2]} est rectangle en ${n[1]}. D'après le théorème de Pythagore : ${n[1]}${n[2]}² = ${sq(c)} − ${sq(l1)} = ${sq(l2)}, donc ${n[1]}${n[2]} = ${L(l2, u)}.`,
    }), rectFig(n, l1, l2, { l1: L(l1, u), l2: '?', d: L(c, u) }, false))
  },
  () => {
    const [a, b, c] = triple(30)
    const [d, h] = a < b ? [a, b] : [b, a]
    return W(numeric(`Un hauban de ${L(c, 'm')} relie le sommet d'un mât vertical à un piquet planté dans le sol horizontal, à ${L(d, 'm')} du pied du mât. Quelle est la hauteur du mât (en m) ?`, h, {
      explanation: `Le mât, le sol et le hauban forment un triangle rectangle d'hypoténuse le hauban : h² = ${sq(c)} − ${sq(d)} = ${sq(h)}, donc h = ${L(h, 'm')}.`,
    }), rightTri(['O', 'P', 'H'], d, h, { fixed: true, sides: { RP: L(d, 'm'), PQ: L(c, 'm'), RQ: '?' }, red: ['RQ'], labels: { O: '', P: '', H: '' } }))
  },
)

// Thalès (triangle) : une longueur par proportionnalité
function thalesDirect(butterfly: boolean): Exercise {
  const d = butterfly ? thalesData(24, KB) : thalesData(30), n = pick(THALES_NAMES), u = unit()
  const asks = [
    { give: ['AM', 'AB', 'AC'], ask: 'AN', v: d.AN, how: `${n.A}${n.N} = ${frac(`${d.AM} × ${d.AC}`, d.AB)}` },
    { give: ['AM', 'AB', 'BC'], ask: 'MN', v: d.MN, how: `${n.M}${n.N} = ${frac(`${d.AM} × ${d.BC}`, d.AB)}` },
    { give: ['AN', 'AC', 'MN'], ask: 'BC', v: d.BC, how: `${n.B}${n.C} = ${frac(`${d.MN} × ${d.AC}`, d.AN)}` },
    { give: ['AN', 'AC', 'AB'], ask: 'AM', v: d.AM, how: `${n.A}${n.M} = ${frac(`${d.AN} × ${d.AB}`, d.AC)}` },
    { give: ['AM', 'MN', 'BC'], ask: 'AB', v: d.AB, how: `${n.A}${n.B} = ${frac(`${d.AM} × ${d.BC}`, d.MN)}` },
  ] as const
  const q = pick(asks)
  const nm = (k: string) => k.split('').map((c) => n[c as keyof TN]).join('')
  const val = (k: string) => d[k as keyof Th]
  const lab: Partial<Record<TK, string>> = { [q.ask]: '?' }
  for (const g of q.give) lab[g as TK] = L(val(g), u)
  const data = q.give.map((g) => `${nm(g)} = ${L(val(g), u)}`).join(', ')
  return W(numeric(`${thalesHyp(n, butterfly)} On donne ${data}. Calcule ${nm(q.ask)} (en ${u}).`, q.v, {
    explanation: `D'après le théorème de Thalès : ${thalesRatios(n)}. Donc ${q.how} = ${L(q.v, u)}.`,
  }), thalesFig(n, d, butterfly, lab, q.ask as TK))
}
const p1Thales = model(
  () => thalesDirect(false),
  () => {
    const d = thalesData(), n = pick(THALES_NAMES), u = unit()
    return W(numeric(`Sur la figure, les droites (${n.M}${n.N}) et (${n.B}${n.C}) sont parallèles, avec ${n.M} sur [${n.A}${n.B}] et ${n.N} sur [${n.A}${n.C}]. Utilise les longueurs indiquées pour calculer ${n.M}${n.N} (en ${u}).`, d.MN, {
      explanation: `D'après le théorème de Thalès : ${frac(`${n.A}${n.M}`, `${n.A}${n.B}`)} = ${frac(`${n.M}${n.N}`, `${n.B}${n.C}`)}, donc ${n.M}${n.N} = ${frac(`${d.AM} × ${d.BC}`, d.AB)} = ${L(d.MN, u)}.`,
    }), thalesFig(n, d, false, { AM: L(d.AM, u), AB: L(d.AB, u), BC: L(d.BC, u), MN: '?' }, 'MN'))
  },
  () => {
    const d = thalesData(), n = pick(THALES_NAMES), u = unit()
    const ctx = pick([
      `Sur le plan d'une charpente, les poutres (${n.M}${n.N}) et (${n.B}${n.C}) sont parallèles ; ${n.M} est sur [${n.A}${n.B}] et ${n.N} sur [${n.A}${n.C}].`,
      `Sur le schéma d'une étagère en triangle, les planches (${n.M}${n.N}) et (${n.B}${n.C}) sont parallèles ; ${n.M} est sur [${n.A}${n.B}] et ${n.N} sur [${n.A}${n.C}].`,
      `Une voile triangulaire ${n.A}${n.B}${n.C} est renforcée par une latte [${n.M}${n.N}] parallèle à [${n.B}${n.C}], avec ${n.M} sur [${n.A}${n.B}] et ${n.N} sur [${n.A}${n.C}].`,
    ])
    return W(numeric(`${ctx} On a ${n.A}${n.N} = ${L(d.AN, u)}, ${n.A}${n.C} = ${L(d.AC, u)} et ${n.B}${n.C} = ${L(d.BC, u)}. Quelle est la longueur ${n.M}${n.N} (en ${u}) ?`, d.MN, {
      explanation: `D'après le théorème de Thalès : ${frac(`${n.A}${n.N}`, `${n.A}${n.C}`)} = ${frac(`${n.M}${n.N}`, `${n.B}${n.C}`)}, donc ${n.M}${n.N} = ${frac(`${d.AN} × ${d.BC}`, d.AC)} = ${L(d.MN, u)}.`,
    }), thalesFig(n, d, false, { AN: L(d.AN, u), AC: L(d.AC, u), BC: L(d.BC, u), MN: '?' }, 'MN'))
  },
)

// Rapports trigonométriques dans un triangle rectangle à côtés entiers
const p1Ratios = model(
  ...(['cos', 'sin', 'tan'] as const).map((f) => () => {
    const [a, b, c] = triple(30), [R, P, Q] = names3(), u = unit()
    const atP = Math.random() < 0.5
    const adj = atP ? a : b, opp = atP ? b : a
    const ang = atP ? hat(R, P, Q) : hat(R, Q, P)
    const [num, den, word] = f === 'cos' ? [adj, c, 'côté adjacent ÷ hypoténuse'] : f === 'sin' ? [opp, c, 'côté opposé ÷ hypoténuse'] : [opp, adj, 'côté opposé ÷ côté adjacent']
    const sideName = (x: number) => (x === c ? `${P}${Q}` : x === a ? `${R}${P}` : `${R}${Q}`)
    return W(fraction(`Le triangle ${R}${P}${Q} est rectangle en ${R}, avec ${R}${P} = ${L(a, u)}, ${R}${Q} = ${L(b, u)} et ${P}${Q} = ${L(c, u)}. Donne la valeur exacte de ${f} ${ang} (fraction ou décimal).`, num, den, {
      explanation: `${f} ${ang} = ${word} = ${frac(sideName(num), sideName(den))} = ${frac(fmt(num), fmt(den))}${fracText(num, den) === `${num}/${den}` ? '' : ` = ${fracText(num, den)}`}.`,
    }), rightTri([R, P, Q], a, b, { sides: { RP: fmt(a), RQ: fmt(b), PQ: fmt(c) }, angle: { at: atP ? 'P' : 'Q' } }))
  }),
  () => {
    const [a, b, c] = triple(30), [R, P, Q] = names3()
    return W(fraction(`Sur la figure, le triangle ${R}${P}${Q} est rectangle en ${R}. Calcule la tangente de l'angle marqué en rouge, ${hat(R, P, Q)} (fraction ou décimal).`, b, a, {
      explanation: `tan ${hat(R, P, Q)} = côté opposé ÷ côté adjacent = ${frac(`${R}${Q}`, `${R}${P}`)} = ${frac(fmt(b), fmt(a))} = ${fracText(b, a)}.`,
    }), rightTri([R, P, Q], a, b, { sides: { RP: fmt(a), RQ: fmt(b), PQ: fmt(c) }, angle: { at: 'P' } }))
  },
)

// Aire et périmètre d'un triangle rectangle
const p1Area = model(
  () => {
    const [a, b, c] = triple(30), [R, P, Q] = names3(), u = unit()
    return W(numeric(`Le triangle ${R}${P}${Q} est rectangle en ${R}, avec ${R}${P} = ${L(a, u)} et ${R}${Q} = ${L(b, u)}. Calcule son aire (en ${u}²).`, r6((a * b) / 2), {
      explanation: `Dans un triangle rectangle, les côtés de l'angle droit sont base et hauteur : aire = ${frac(`${fmt(a)} × ${fmt(b)}`, 2)} = ${fmt(r6((a * b) / 2))} ${u}².`,
    }), rightTri([R, P, Q], a, b, { sides: { RP: L(a, u), RQ: L(b, u), PQ: L(c, u) } }))
  },
  () => {
    const [a, b, c] = triple(30), [R, P, Q] = names3(), u = unit()
    return W(numeric(`Sur la figure, le triangle ${R}${P}${Q} est rectangle en ${R}. Calcule son périmètre (en ${u}).`, r6(a + b + c), {
      explanation: `Périmètre = ${fmt(a)} + ${fmt(b)} + ${fmt(c)} = ${L(r6(a + b + c), u)}.`,
    }), rightTri([R, P, Q], a, b, { sides: { RP: L(a, u), RQ: L(b, u), PQ: L(c, u) } }))
  },
  () => {
    const [a, b] = triple(30), [R, P, Q] = names3(), u = unit()
    const A = r6((a * b) / 2)
    return W(numeric(`Le triangle ${R}${P}${Q} est rectangle en ${R}. Son aire vaut ${fmt(A)} ${u}² et ${R}${P} = ${L(a, u)}. Calcule ${R}${Q} (en ${u}).`, b, {
      explanation: `Aire = ${frac(`${R}${P} × ${R}${Q}`, 2)}, donc ${R}${Q} = ${frac(`2 × ${fmt(A)}`, fmt(a))} = ${L(b, u)}.`,
    }), rightTri([R, P, Q], a, b, { sides: { RP: L(a, u), RQ: '?' }, red: ['RQ'] }))
  },
  () => {
    const [a, b] = triple(30), n = names4(), u = unit()
    const [l1, l2] = a >= b ? [a, b] : [b, a]
    return W(numeric(`Le rectangle ${n.join('')} mesure ${L(l1, u)} sur ${L(l2, u)}. Sa diagonale [${n[0]}${n[2]}] le partage en deux triangles. Calcule l'aire du triangle ${n[0]}${n[1]}${n[2]} (en ${u}²).`, r6((l1 * l2) / 2), {
      explanation: `Le triangle ${n[0]}${n[1]}${n[2]} est rectangle en ${n[1]} : aire = ${frac(`${fmt(l1)} × ${fmt(l2)}`, 2)} = ${fmt(r6((l1 * l2) / 2))} ${u}² (la moitié du rectangle).`,
    }), rectFig(n, l1, l2, { l1: L(l1, u), l2: L(l2, u) }, false))
  },
)

// ── Palier 2 ────────────────────────────────────────────────────────────
// Pythagore avec résultat arrondi
const p2PythRound = model(
  () => retry(() => {
    const a = randInt(2, 15), b = randInt(2, 15), [R, P, Q] = names3(), u = unit()
    const c = Math.sqrt(a * a + b * b)
    if (isInt(c) || b / a > 2.6 || a / b > 2.6) return null
    return W(approx(`Le triangle ${R}${P}${Q} est rectangle en ${R}, avec ${R}${P} = ${L(a, u)} et ${R}${Q} = ${L(b, u)}. Calcule ${P}${Q}, arrondie au dixième (en ${u}).`, c, 1,
      `D'après le théorème de Pythagore : ${P}${Q}² = ${a * a} + ${b * b} = ${a * a + b * b}, donc ${P}${Q} = √${a * a + b * b} ≈ ${fmt(rnd(c))} ${u}.`),
    rightTri([R, P, Q], a, b, { sides: { RP: L(a, u), RQ: L(b, u), PQ: '?' }, red: ['PQ'] }))
  }),
  () => retry(() => {
    const c = randInt(6, 20), a = randInt(2, c - 1), [R, P, Q] = names3(), u = unit()
    const b = Math.sqrt(c * c - a * a)
    if (isInt(b) || b / a > 2.6 || a / b > 2.6) return null
    return W(approx(`Le triangle ${R}${P}${Q} est rectangle en ${R}, avec ${P}${Q} = ${L(c, u)} et ${R}${P} = ${L(a, u)}. Calcule ${R}${Q}, arrondie au dixième (en ${u}).`, b, 1,
      `D'après le théorème de Pythagore : ${R}${Q}² = ${P}${Q}² − ${R}${P}² = ${c * c} − ${a * a} = ${c * c - a * a}, donc ${R}${Q} = √${c * c - a * a} ≈ ${fmt(rnd(b))} ${u}.`),
    rightTri([R, P, Q], a, b, { sides: { RP: L(a, u), PQ: L(c, u), RQ: '?' }, red: ['RQ'] }))
  }),
  () => {
    const s = randInt(3, 25), n = names4(), u = unit()
    const dg = s * Math.SQRT2
    return W(approx(`Le carré ${n.join('')} a pour côté ${L(s, u)}. Calcule la longueur de sa diagonale [${n[0]}${n[2]}], arrondie au dixième (en ${u}).`, dg, 1,
      `Le triangle ${n[0]}${n[1]}${n[2]} est rectangle isocèle en ${n[1]} : ${n[0]}${n[2]}² = ${s * s} + ${s * s} = ${2 * s * s}, donc ${n[0]}${n[2]} = √${2 * s * s} ≈ ${fmt(rnd(dg))} ${u}.`),
    rectFig(n, s, s, { l1: L(s, u), l2: L(s, u), d: '?' }))
  },
  () => retry(() => {
    const Lg = randInt(30, 90) / 10, d = randInt(8, 25) / 10
    const h = Math.sqrt(Lg * Lg - d * d)
    if (d > Lg / 2.2 || isDec(h, 2)) return null
    return W(approx(`Une échelle de ${L(Lg, 'm')} est appuyée contre un mur vertical, son pied à ${L(d, 'm')} du mur. À quelle hauteur arrive le haut de l'échelle ? Donne une valeur arrondie au dixième de mètre.`, h, 1,
      `Triangle rectangle au pied du mur, d'hypoténuse l'échelle : h² = ${sq(Lg)} − ${sq(d)} = ${fmt(r6(Lg * Lg - d * d))}, donc h ≈ ${fmt(rnd(h))} m.`),
    rightTri(['O', 'P', 'H'], d, h, { fixed: true, sides: { RP: L(d, 'm'), PQ: L(Lg, 'm'), RQ: '?' }, red: ['RQ'], labels: { O: '', P: '', H: '' } }))
  }),
  () => retry(() => {
    const w = randInt(40, 120), hgt = randInt(25, 80)
    const dg = Math.sqrt(w * w + hgt * hgt)
    if (isInt(dg) || w < hgt) return null
    const n = names4()
    return W(approx(`L'écran rectangulaire d'une télévision mesure ${w} cm de large et ${hgt} cm de haut. Quelle est la longueur de sa diagonale, arrondie au centimètre ?`, dg, 0,
      `La diagonale est l'hypoténuse d'un triangle rectangle : d² = ${w * w} + ${hgt * hgt} = ${w * w + hgt * hgt}, donc d ≈ ${fmt(rnd(dg, 0))} cm.`),
    rectFig(n, w, hgt, { l1: `${w} cm`, l2: `${hgt} cm`, d: '?' }))
  }),
)

const ANG = () => randInt(22, 68)
const pickLen = () => (Math.random() < 0.7 ? randInt(3, 20) : randInt(25, 120) / 10)
/** Côté adjacent (RP) et opposé (RQ) à l'angle en P, d'hypoténuse PQ. */
interface Trig { R: string; P: string; Q: string; t: number; adj: number; opp: number; hyp: number }
function trig(t: number, known: 'adj' | 'opp' | 'hyp', v: number): Trig {
  const [R, P, Q] = names3()
  const r = rad(t)
  const hyp = known === 'hyp' ? v : known === 'adj' ? v / Math.cos(r) : v / Math.sin(r)
  return { R, P, Q, t, hyp, adj: hyp * Math.cos(r), opp: hyp * Math.sin(r) }
}
const trigIntro = (g: Trig) => `Le triangle ${g.R}${g.P}${g.Q} est rectangle en ${g.R} et ${hat(g.R, g.P, g.Q)} = ${g.t}°.`
const trigFig = (g: Trig, lab: Partial<Record<Side, string>>, red: Side) =>
  rightTri([g.R, g.P, g.Q], g.adj, g.opp, { sides: lab, red: [red], angle: { at: 'P', label: `${g.t}°` } })

// Trigonométrie : une longueur par multiplication
const p2TrigMul = model(
  () => {
    const g = trig(ANG(), 'hyp', pickLen()), u = unit()
    return W(approx(`${trigIntro(g)} On donne ${g.P}${g.Q} = ${L(g.hyp, u)}. Calcule ${g.R}${g.P}, arrondie au dixième (en ${u}).`, g.adj, 1,
      `${g.R}${g.P} est le côté adjacent à l'angle, ${g.P}${g.Q} l'hypoténuse : cos ${hat(g.R, g.P, g.Q)} = ${frac(`${g.R}${g.P}`, `${g.P}${g.Q}`)}, donc ${g.R}${g.P} = ${fmt(g.hyp)} × cos ${g.t}° ≈ ${fmt(rnd(g.adj))} ${u}.`),
    trigFig(g, { PQ: L(g.hyp, u), RP: '?' }, 'RP'))
  },
  () => {
    const g = trig(ANG(), 'hyp', pickLen()), u = unit()
    return W(approx(`${trigIntro(g)} On donne ${g.P}${g.Q} = ${L(g.hyp, u)}. Calcule ${g.R}${g.Q}, arrondie au dixième (en ${u}).`, g.opp, 1,
      `${g.R}${g.Q} est le côté opposé à l'angle, ${g.P}${g.Q} l'hypoténuse : sin ${hat(g.R, g.P, g.Q)} = ${frac(`${g.R}${g.Q}`, `${g.P}${g.Q}`)}, donc ${g.R}${g.Q} = ${fmt(g.hyp)} × sin ${g.t}° ≈ ${fmt(rnd(g.opp))} ${u}.`),
    trigFig(g, { PQ: L(g.hyp, u), RQ: '?' }, 'RQ'))
  },
  () => {
    const g = trig(ANG(), 'adj', pickLen()), u = unit()
    return W(approx(`${trigIntro(g)} On donne ${g.R}${g.P} = ${L(g.adj, u)}. Calcule ${g.R}${g.Q}, arrondie au dixième (en ${u}).`, g.opp, 1,
      `${g.R}${g.Q} est le côté opposé, ${g.R}${g.P} le côté adjacent : tan ${hat(g.R, g.P, g.Q)} = ${frac(`${g.R}${g.Q}`, `${g.R}${g.P}`)}, donc ${g.R}${g.Q} = ${fmt(g.adj)} × tan ${g.t}° ≈ ${fmt(rnd(g.opp))} ${u}.`),
    trigFig(g, { RP: L(g.adj, u), RQ: '?' }, 'RQ'))
  },
  () => {
    const t = randInt(22, 45), Lg = randInt(25, 60) / 10
    const g = trig(t, 'hyp', Lg)
    const ctx = pick([
      { s: `Un toboggan rectiligne de ${L(Lg, 'm')} de long fait un angle de ${t}° avec le sol horizontal. À quelle hauteur se trouve son sommet ?` },
      { s: `Une rampe de chargement de ${L(Lg, 'm')} fait un angle de ${t}° avec le sol horizontal. De quelle hauteur permet-elle de monter ?` },
      { s: `Un pont-levis de ${L(Lg, 'm')} est relevé et fait un angle de ${t}° avec l'horizontale. À quelle hauteur se trouve son extrémité, au-dessus de l'axe ?` },
    ])
    return W(approx(`${ctx.s} Donne une valeur arrondie au dixième de mètre.`, g.opp, 1,
      `On a un triangle rectangle d'hypoténuse ${L(Lg, 'm')} : hauteur = ${fmt(Lg)} × sin ${t}° ≈ ${fmt(rnd(g.opp))} m.`),
    rightTri(['O', 'P', 'H'], g.adj, g.opp, { fixed: true, sides: { PQ: L(Lg, 'm'), RQ: '?' }, red: ['RQ'], angle: { at: 'P', label: `${t}°` }, labels: { O: '', P: '', H: '' } }))
  },
  () => {
    const t = randInt(25, 55), d = randInt(8, 40)
    const g = trig(t, 'adj', d)
    const what = pick(['d’un arbre', 'd’une tour', 'd’un clocher', 'd’une falaise'])
    return W(approx(`Couché au sol, à ${d} m du pied ${what}, on voit son sommet sous un angle de ${t}° avec l'horizontale. Quelle est sa hauteur, arrondie au dixième de mètre ?`, g.opp, 1,
      `Le triangle formé est rectangle au pied : tan ${t}° = ${frac('hauteur', d)}, donc hauteur = ${d} × tan ${t}° ≈ ${fmt(rnd(g.opp))} m.`),
    rightTri(['O', 'P', 'H'], g.adj, g.opp, { fixed: true, sides: { RP: `${d} m`, RQ: '?' }, red: ['RQ'], angle: { at: 'P', label: `${t}°` }, labels: { O: '', P: '', H: '' } }))
  },
)

// Thalès avec somme ou différence de longueurs
const p2Thales = model(
  () => {
    const d = thalesData(), n = pick(THALES_NAMES), u = unit()
    return W(numeric(`${thalesHyp(n, false)} On donne ${n.A}${n.M} = ${L(d.AM, u)}, ${n.M}${n.B} = ${L(d.MB, u)} et ${n.A}${n.N} = ${L(d.AN, u)}. Calcule ${n.A}${n.C} (en ${u}).`, d.AC, {
      explanation: `${n.A}${n.B} = ${d.AM} + ${d.MB} = ${d.AB}. D'après le théorème de Thalès : ${frac(`${n.A}${n.M}`, `${n.A}${n.B}`)} = ${frac(`${n.A}${n.N}`, `${n.A}${n.C}`)}, donc ${n.A}${n.C} = ${frac(`${d.AN} × ${d.AB}`, d.AM)} = ${L(d.AC, u)}.`,
    }), thalesFig(n, d, false, { AM: L(d.AM, u), MB: L(d.MB, u), AN: L(d.AN, u), AC: '?' }, 'AC'))
  },
  () => {
    const d = thalesData(), n = pick(THALES_NAMES), u = unit()
    return W(numeric(`${thalesHyp(n, false)} On donne ${n.A}${n.M} = ${L(d.AM, u)}, ${n.A}${n.B} = ${L(d.AB, u)} et ${n.A}${n.C} = ${L(d.AC, u)}. Calcule ${n.N}${n.C} (en ${u}).`, d.NC, {
      explanation: `D'après le théorème de Thalès : ${n.A}${n.N} = ${frac(`${d.AM} × ${d.AC}`, d.AB)} = ${d.AN}, donc ${n.N}${n.C} = ${n.A}${n.C} − ${n.A}${n.N} = ${d.AC} − ${d.AN} = ${L(d.NC, u)}.`,
    }), thalesFig(n, d, false, { AM: L(d.AM, u), AB: L(d.AB, u), AC: L(d.AC, u), NC: '?' }, 'NC'))
  },
  () => {
    const d = thalesData(), n = pick(THALES_NAMES), u = unit()
    return W(numeric(`${thalesHyp(n, false)} On donne ${n.A}${n.M} = ${L(d.AM, u)}, ${n.M}${n.B} = ${L(d.MB, u)} et ${n.B}${n.C} = ${L(d.BC, u)}. Calcule ${n.M}${n.N} (en ${u}).`, d.MN, {
      explanation: `${n.A}${n.B} = ${d.AM} + ${d.MB} = ${d.AB}. D'après le théorème de Thalès : ${frac(`${n.M}${n.N}`, `${n.B}${n.C}`)} = ${frac(`${n.A}${n.M}`, `${n.A}${n.B}`)}, donc ${n.M}${n.N} = ${frac(`${d.BC} × ${d.AM}`, d.AB)} = ${L(d.MN, u)}.`,
    }), thalesFig(n, d, false, { AM: L(d.AM, u), MB: L(d.MB, u), BC: L(d.BC, u), MN: '?' }, 'MN'))
  },
  () => {
    const d = thalesData(), n = pick(THALES_NAMES), u = unit()
    return W(numeric(`${thalesHyp(n, false)} On donne ${n.A}${n.N} = ${L(d.AN, u)}, ${n.N}${n.C} = ${L(d.NC, u)} et ${n.M}${n.N} = ${L(d.MN, u)}. Calcule ${n.B}${n.C} (en ${u}).`, d.BC, {
      explanation: `${n.A}${n.C} = ${d.AN} + ${d.NC} = ${d.AC}. D'après le théorème de Thalès : ${frac(`${n.B}${n.C}`, `${n.M}${n.N}`)} = ${frac(`${n.A}${n.C}`, `${n.A}${n.N}`)}, donc ${n.B}${n.C} = ${frac(`${d.MN} × ${d.AC}`, d.AN)} = ${L(d.BC, u)}.`,
    }), thalesFig(n, d, false, { AN: L(d.AN, u), NC: L(d.NC, u), MN: L(d.MN, u), BC: '?' }, 'BC'))
  },
)

// Réciproque de Pythagore (QCM : en quel sommet le triangle est-il rectangle ?)
const p2Converse = model(
  ...[0, 1, 2].map(() => () => {
    const n = names3(), u = unit()
    const right = Math.random() < 0.55
    const [a0, b0, c0] = triple(Math.random() < 0.5 ? 30 : 12, Math.random() < 0.3)
    let c = c0
    if (!right) c = r6(c0 + pick([-1, 1]) * (isInt(c0) ? 1 : 0.1))
    // le plus grand côté est opposé au sommet n[0]
    const sides = { [`${n[1]}${n[2]}`]: c, [`${n[0]}${n[1]}`]: a0, [`${n[2]}${n[0]}`]: b0 }
    const order = shuffle(Object.keys(sides))
    const data = order.map((k) => `${k} = ${L(sides[k], u)}`).join(', ')
    const correct = right ? `Oui, rectangle en ${n[0]}` : 'Non, il n’est pas rectangle'
    const diff = r6(c * c - a0 * a0 - b0 * b0)
    return W(choice(`Le triangle ${n.join('')} a pour côtés ${data}. Est-il rectangle ?`, correct,
      [`Oui, rectangle en ${n[1]}`, `Oui, rectangle en ${n[2]}`, right ? 'Non, il n’est pas rectangle' : `Oui, rectangle en ${n[0]}`],
      `Le plus grand côté est [${n[1]}${n[2]}]. On compare : ${n[1]}${n[2]}² = ${sq(c)} et ${n[0]}${n[1]}² + ${n[2]}${n[0]}² = ${sq(a0)} + ${sq(b0)} = ${fmt(r6(a0 * a0 + b0 * b0))}. ${diff === 0 ? `Il y a égalité : d'après la réciproque du théorème de Pythagore, le triangle est rectangle en ${n[0]}.` : `Ces nombres sont différents : d'après le théorème de Pythagore (contraposée), le triangle n'est pas rectangle.`}`),
    sidesTri(n, c, b0, a0, { a: fmt(c), b: fmt(b0), c: fmt(a0) }))
  }),
)

// Choisir la bonne relation
const p2Method = model(
  ...(['cos', 'sin', 'tan', 'pyth'] as const).map((kind) => () => {
    const [R, P, Q] = names3()
    const A = hat(R, P, Q)
    const C = {
      cos: `le cosinus de ${A}`, sin: `le sinus de ${A}`, tan: `la tangente de ${A}`, pyth: 'le théorème de Pythagore',
    }
    const situations = {
      cos: pick([
        { k: `${P}${Q} et l'angle ${A}`, s: `${R}${P}`, why: `${R}${P} est adjacent à ${A} et ${P}${Q} est l'hypoténuse` },
        { k: `${R}${P} et l'angle ${A}`, s: `${P}${Q}`, why: `${R}${P} est adjacent à ${A} et ${P}${Q} est l'hypoténuse` },
      ]),
      sin: pick([
        { k: `${P}${Q} et l'angle ${A}`, s: `${R}${Q}`, why: `${R}${Q} est opposé à ${A} et ${P}${Q} est l'hypoténuse` },
        { k: `${R}${Q} et l'angle ${A}`, s: `${P}${Q}`, why: `${R}${Q} est opposé à ${A} et ${P}${Q} est l'hypoténuse` },
      ]),
      tan: pick([
        { k: `${R}${P} et l'angle ${A}`, s: `${R}${Q}`, why: `${R}${Q} est opposé à ${A} et ${R}${P} lui est adjacent` },
        { k: `${R}${Q} et l'angle ${A}`, s: `${R}${P}`, why: `${R}${Q} est opposé à ${A} et ${R}${P} lui est adjacent` },
      ]),
      pyth: pick([
        { k: `${R}${P} et ${R}${Q}`, s: `${P}${Q}`, why: 'on connaît deux côtés et on cherche le troisième, sans angle' },
        { k: `${P}${Q} et ${R}${Q}`, s: `${R}${P}`, why: 'on connaît deux côtés et on cherche le troisième, sans angle' },
      ]),
    }
    const s = situations[kind]
    return W(choice(`Le triangle ${R}${P}${Q} est rectangle en ${R}. On connaît ${s.k}, et on cherche ${s.s}. Quel outil utiliser ?`, C[kind],
      Object.values(C).filter((v) => v !== C[kind]), `On utilise ${C[kind]} : ${s.why}.`),
    rightTri([R, P, Q], 1, randInt(6, 14) / 10, { angle: { at: 'P' } }))
  }),
)

// ── Palier 3 ────────────────────────────────────────────────────────────
// Trigonométrie : calcul d'un angle
const p3Angle = model(
  () => retry(() => {
    const hyp = randInt(5, 20), adj = randInt(2, hyp - 1), [R, P, Q] = names3(), u = unit()
    const t = deg(Math.acos(adj / hyp))
    if (t < 22 || t > 68) return null
    return W(approx(`Le triangle ${R}${P}${Q} est rectangle en ${R}, avec ${R}${P} = ${L(adj, u)} et ${P}${Q} = ${L(hyp, u)}. Calcule la mesure de l'angle ${hat(R, P, Q)}, arrondie au degré.`, t, 0,
      `cos ${hat(R, P, Q)} = ${frac(`${R}${P}`, `${P}${Q}`)} = ${frac(adj, hyp)}. À la calculatrice (touche arccos ou cos⁻¹) : ${hat(R, P, Q)} ≈ ${fmt(rnd(t, 0))}°.`),
    rightTri([R, P, Q], adj, hyp * Math.sin(rad(t)), { sides: { RP: L(adj, u), PQ: L(hyp, u) }, angle: { at: 'P', label: '?' } }))
  }),
  () => retry(() => {
    const hyp = randInt(5, 20), opp = randInt(2, hyp - 1), [R, P, Q] = names3(), u = unit()
    const t = deg(Math.asin(opp / hyp))
    if (t < 22 || t > 68) return null
    return W(approx(`Le triangle ${R}${P}${Q} est rectangle en ${R}, avec ${R}${Q} = ${L(opp, u)} et ${P}${Q} = ${L(hyp, u)}. Calcule la mesure de l'angle ${hat(R, P, Q)}, arrondie au degré.`, t, 0,
      `sin ${hat(R, P, Q)} = ${frac(`${R}${Q}`, `${P}${Q}`)} = ${frac(opp, hyp)}. À la calculatrice (arcsin ou sin⁻¹) : ${hat(R, P, Q)} ≈ ${fmt(rnd(t, 0))}°.`),
    rightTri([R, P, Q], hyp * Math.cos(rad(t)), opp, { sides: { RQ: L(opp, u), PQ: L(hyp, u) }, angle: { at: 'P', label: '?' } }))
  }),
  () => retry(() => {
    const adj = randInt(3, 20), opp = randInt(3, 20), [R, P, Q] = names3(), u = unit()
    const t = deg(Math.atan(opp / adj))
    if (t < 22 || t > 68 || adj === opp) return null
    return W(approx(`Le triangle ${R}${P}${Q} est rectangle en ${R}, avec ${R}${P} = ${L(adj, u)} et ${R}${Q} = ${L(opp, u)}. Calcule la mesure de l'angle ${hat(R, P, Q)}, arrondie au degré.`, t, 0,
      `tan ${hat(R, P, Q)} = ${frac(`${R}${Q}`, `${R}${P}`)} = ${frac(opp, adj)}. À la calculatrice (arctan ou tan⁻¹) : ${hat(R, P, Q)} ≈ ${fmt(rnd(t, 0))}°.`),
    rightTri([R, P, Q], adj, opp, { sides: { RP: L(adj, u), RQ: L(opp, u) }, angle: { at: 'P', label: '?' } }))
  }),
  () => retry(() => {
    const Lg = randInt(30, 80) / 10, d = randInt(8, 30) / 10
    const t = deg(Math.acos(d / Lg))
    if (t < 55 || t > 80) return null
    return W(approx(`Une échelle de ${L(Lg, 'm')} est appuyée contre un mur vertical ; son pied est à ${L(d, 'm')} du mur. Quel angle fait-elle avec le sol ? Arrondis au degré.`, t, 0,
      `Dans le triangle rectangle au pied du mur : cos α = ${frac('côté adjacent', 'hypoténuse')} = ${frac(fmt(d), fmt(Lg))}, donc α ≈ ${fmt(rnd(t, 0))}°.`),
    rightTri(['O', 'P', 'H'], d, Math.sqrt(Lg * Lg - d * d), { fixed: true, sides: { RP: L(d, 'm'), PQ: L(Lg, 'm') }, angle: { at: 'P', label: '?' }, labels: { O: '', P: '', H: '' } }))
  }),
  () => retry(() => {
    const run = randInt(4, 12), rise = randInt(2, 9)
    const t = deg(Math.atan(rise / run))
    if (t < 15 || t > 50) return null
    const ctx = pick([
      `Le toit d'un appentis monte de ${rise} dm sur une avancée horizontale de ${run} dm.`,
      `Une route de montagne s'élève de ${rise} m pour ${run} m parcourus à l'horizontale.`,
      `Une rampe de skate s'élève de ${rise} dm sur une longueur au sol de ${run} dm.`,
    ])
    return W(approx(`${ctx} Quel angle fait la pente avec l'horizontale ? Arrondis au degré.`, t, 0,
      `tan α = ${frac('dénivelé', 'distance horizontale')} = ${frac(rise, run)}, donc α ≈ ${fmt(rnd(t, 0))}°.`),
    rightTri(['O', 'P', 'H'], run, rise, { fixed: true, sides: { RP: fmt(run), RQ: fmt(rise) }, angle: { at: 'P', label: '?' }, labels: { O: '', P: '', H: '' } }))
  }),
)

// Trigonométrie : une longueur par division
const p3TrigDiv = model(
  () => {
    const g = trig(ANG(), 'adj', pickLen()), u = unit()
    return W(approx(`${trigIntro(g)} On donne ${g.R}${g.P} = ${L(g.adj, u)}. Calcule l'hypoténuse ${g.P}${g.Q}, arrondie au dixième (en ${u}).`, g.hyp, 1,
      `cos ${hat(g.R, g.P, g.Q)} = ${frac(`${g.R}${g.P}`, `${g.P}${g.Q}`)}, donc ${g.P}${g.Q} = ${frac(`${g.R}${g.P}`, `cos ${g.t}°`)} = ${frac(fmt(g.adj), `cos ${g.t}°`)} ≈ ${fmt(rnd(g.hyp))} ${u}.`),
    trigFig(g, { RP: L(g.adj, u), PQ: '?' }, 'PQ'))
  },
  () => {
    const g = trig(ANG(), 'opp', pickLen()), u = unit()
    return W(approx(`${trigIntro(g)} On donne ${g.R}${g.Q} = ${L(g.opp, u)}. Calcule l'hypoténuse ${g.P}${g.Q}, arrondie au dixième (en ${u}).`, g.hyp, 1,
      `sin ${hat(g.R, g.P, g.Q)} = ${frac(`${g.R}${g.Q}`, `${g.P}${g.Q}`)}, donc ${g.P}${g.Q} = ${frac(`${g.R}${g.Q}`, `sin ${g.t}°`)} = ${frac(fmt(g.opp), `sin ${g.t}°`)} ≈ ${fmt(rnd(g.hyp))} ${u}.`),
    trigFig(g, { RQ: L(g.opp, u), PQ: '?' }, 'PQ'))
  },
  () => {
    const g = trig(ANG(), 'opp', pickLen()), u = unit()
    return W(approx(`${trigIntro(g)} On donne ${g.R}${g.Q} = ${L(g.opp, u)}. Calcule ${g.R}${g.P}, arrondie au dixième (en ${u}).`, g.adj, 1,
      `tan ${hat(g.R, g.P, g.Q)} = ${frac(`${g.R}${g.Q}`, `${g.R}${g.P}`)}, donc ${g.R}${g.P} = ${frac(`${g.R}${g.Q}`, `tan ${g.t}°`)} = ${frac(fmt(g.opp), `tan ${g.t}°`)} ≈ ${fmt(rnd(g.adj))} ${u}.`),
    trigFig(g, { RQ: L(g.opp, u), RP: '?' }, 'RP'))
  },
  () => {
    const t = randInt(60, 75), h = randInt(30, 90) / 10
    const g = trig(t, 'opp', h)
    return W(approx(`Pour être stable, une échelle doit faire un angle de ${t}° avec le sol horizontal. Quelle doit être sa longueur pour que son sommet atteigne une fenêtre située à ${L(h, 'm')} de hauteur ? Arrondis au dixième de mètre.`, g.hyp, 1,
      `sin ${t}° = ${frac('hauteur', 'longueur')}, donc longueur = ${frac(fmt(h), `sin ${t}°`)} ≈ ${fmt(rnd(g.hyp))} m.`),
    rightTri(['O', 'P', 'H'], g.adj, g.opp, { fixed: true, sides: { RQ: L(h, 'm'), PQ: '?' }, red: ['PQ'], angle: { at: 'P', label: `${t}°` }, labels: { O: '', P: '', H: '' } }))
  },
  () => {
    const t = randInt(20, 50), h = randInt(15, 60)
    const g = trig(t, 'opp', h)
    const what = pick(['un donjon', 'un phare', 'une tour de guet'])
    return W(approx(`Depuis un point du sol, on voit le sommet d’${what} de ${h} m de haut sous un angle de ${t}° avec l'horizontale. À quelle distance du pied se trouve-t-on ? Arrondis au dixième de mètre.`, g.adj, 1,
      `tan ${t}° = ${frac('hauteur', 'distance')}, donc distance = ${frac(h, `tan ${t}°`)} ≈ ${fmt(rnd(g.adj))} m.`),
    rightTri(['O', 'P', 'H'], g.adj, g.opp, { fixed: true, sides: { RQ: `${h} m`, RP: '?' }, red: ['RP'], angle: { at: 'P', label: `${t}°` }, labels: { O: '', P: '', H: '' } }))
  },
)

// Thalès : configuration papillon
const p3Butterfly = model(
  () => thalesDirect(true),
  () => {
    const d = thalesData(24, KB), n = pick(THALES_NAMES), u = unit()
    return W(numeric(`Sur la figure, les droites (${n.M}${n.B}) et (${n.N}${n.C}) se coupent en ${n.A}, et (${n.M}${n.N}) est parallèle à (${n.B}${n.C}). Avec les longueurs indiquées, calcule ${n.B}${n.C} (en ${u}).`, d.BC, {
      explanation: `Configuration « papillon » : d'après le théorème de Thalès, ${frac(`${n.A}${n.M}`, `${n.A}${n.B}`)} = ${frac(`${n.M}${n.N}`, `${n.B}${n.C}`)}, donc ${n.B}${n.C} = ${frac(`${d.MN} × ${d.AB}`, d.AM)} = ${L(d.BC, u)}.`,
    }), thalesFig(n, d, true, { AM: L(d.AM, u), AB: L(d.AB, u), MN: L(d.MN, u), BC: '?' }, 'BC'))
  },
  () => {
    const d = thalesData(24, KB), n = pick(THALES_NAMES), u = unit()
    return W(numeric(`${thalesHyp(n, true)} On donne ${n.M}${n.B} = ${L(d.AM + d.AB, u)}, ${n.A}${n.M} = ${L(d.AM, u)} et ${n.A}${n.C} = ${L(d.AC, u)}. Calcule ${n.A}${n.N} (en ${u}).`, d.AN, {
      explanation: `${n.A} est entre ${n.M} et ${n.B} : ${n.A}${n.B} = ${d.AM + d.AB} − ${d.AM} = ${d.AB}. D'après le théorème de Thalès : ${frac(`${n.A}${n.N}`, `${n.A}${n.C}`)} = ${frac(`${n.A}${n.M}`, `${n.A}${n.B}`)}, donc ${n.A}${n.N} = ${frac(`${d.AC} × ${d.AM}`, d.AB)} = ${L(d.AN, u)}.`,
    }), thalesFig(n, d, true, { AM: L(d.AM, u), AC: L(d.AC, u), AN: '?' }, 'AN'))
  },
)

// Réciproque de Thalès
const p3ThalesConv = model(
  ...[false, true, false].map((butterfly) => () => retry(() => {
    const d = butterfly ? thalesData(24, KB) : thalesData(30), n = pick(THALES_NAMES), u = unit()
    const para = Math.random() < 0.5
    const AN = para ? d.AN : d.AN + pick([-1, 1])
    if (AN <= 0 || AN >= d.AC + (butterfly ? 30 : 0)) return null
    const r1 = d.AM / d.AB, r2 = AN / d.AC
    const showMB = !butterfly && Math.random() < 0.5
    const data = showMB
      ? `${n.A}${n.M} = ${L(d.AM, u)}, ${n.M}${n.B} = ${L(d.MB, u)}, ${n.A}${n.N} = ${L(AN, u)} et ${n.A}${n.C} = ${L(d.AC, u)}`
      : `${n.A}${n.M} = ${L(d.AM, u)}, ${n.A}${n.B} = ${L(d.AB, u)}, ${n.A}${n.N} = ${L(AN, u)} et ${n.A}${n.C} = ${L(d.AC, u)}`
    const align = butterfly
      ? `Les points ${n.M}, ${n.A}, ${n.B} sont alignés dans cet ordre, ainsi que ${n.N}, ${n.A}, ${n.C}.`
      : `Les points ${n.A}, ${n.M}, ${n.B} sont alignés dans cet ordre, ainsi que ${n.A}, ${n.N}, ${n.C}.`
    const yes = 'Oui, elles sont parallèles'
    const no = 'Non, elles ne sont pas parallèles'
    const lab: Partial<Record<TK, string>> = showMB ? { AM: fmt(d.AM), MB: fmt(d.MB), AN: fmt(AN), AC: fmt(d.AC) } : { AM: fmt(d.AM), AB: fmt(d.AB), AN: fmt(AN), AC: fmt(d.AC) }
    const fig = thalesFig(n, d, butterfly, lab, undefined, AN / d.AC)
    fig.segments = fig.segments?.map((s) => ({ ...s, mark: undefined }))
    return W(choice(`${align} On donne ${data}. Les droites (${n.M}${n.N}) et (${n.B}${n.C}) sont-elles parallèles ?`, para ? yes : no, [para ? no : yes],
      `${showMB ? `${n.A}${n.B} = ${d.AM} + ${d.MB} = ${d.AB}. ` : ''}On compare ${frac(`${n.A}${n.M}`, `${n.A}${n.B}`)} = ${frac(d.AM, d.AB)} = ${fracText(d.AM, d.AB)} et ${frac(`${n.A}${n.N}`, `${n.A}${n.C}`)} = ${frac(AN, d.AC)} = ${fracText(AN, d.AC)}. ${Math.abs(r1 - r2) < 1e-9 ? `Les rapports sont égaux et les points sont dans le même ordre : d'après la réciproque du théorème de Thalès, les droites sont parallèles.` : `Les rapports sont différents : d'après le théorème de Thalès, les droites ne sont pas parallèles.`}`),
    fig)
  })),
)

// Pythagore au service d'une aire ou d'un périmètre
const p3PythArea = model(
  () => {
    const [a, b, c] = triple(30), [R, P, Q] = names3(), u = unit()
    return W(numeric(`Le triangle ${R}${P}${Q} est rectangle en ${R}, avec ${P}${Q} = ${L(c, u)} et ${R}${P} = ${L(a, u)}. Calcule son aire (en ${u}²).`, r6((a * b) / 2), {
      explanation: `Pythagore : ${R}${Q}² = ${sq(c)} − ${sq(a)} = ${sq(b)}, donc ${R}${Q} = ${fmt(b)}. Aire = ${frac(`${fmt(a)} × ${fmt(b)}`, 2)} = ${fmt(r6((a * b) / 2))} ${u}².`,
    }), rightTri([R, P, Q], a, b, { sides: { RP: L(a, u), PQ: L(c, u) } }))
  },
  () => {
    const [a, b, c] = triple(30), [R, P, Q] = names3(), u = unit()
    return W(numeric(`Le triangle ${R}${P}${Q} est rectangle en ${R}, avec ${R}${P} = ${L(a, u)} et ${R}${Q} = ${L(b, u)}. Calcule son périmètre (en ${u}).`, r6(a + b + c), {
      explanation: `Pythagore : ${P}${Q}² = ${sq(a)} + ${sq(b)} = ${sq(c)}, donc ${P}${Q} = ${fmt(c)}. Périmètre = ${fmt(a)} + ${fmt(b)} + ${fmt(c)} = ${L(r6(a + b + c), u)}.`,
    }), rightTri([R, P, Q], a, b, { sides: { RP: L(a, u), RQ: L(b, u) } }))
  },
  () => {
    const [a, b, c] = triple(30), [A, B, C] = names3(), u = unit()
    // isocèle en A : base 2a, côtés égaux c, hauteur b
    const raw = randomOrient({ [A]: [0, b], [B]: [-a, 0], [C]: [a, 0], H: [0, 0] })
    return W(numeric(`Le triangle ${A}${B}${C} est isocèle en ${A}, avec ${A}${B} = ${A}${C} = ${L(c, u)} et ${B}${C} = ${L(2 * a, u)}. Le point H est le milieu de [${B}${C}]. Calcule l'aire du triangle ${A}${B}${C} (en ${u}²).`, r6(a * b), {
      explanation: `Dans un triangle isocèle, la médiane [${A}H] est aussi la hauteur : ${A}H${B} est rectangle en H, avec ${B}H = ${fmt(a)}. Pythagore : ${A}H² = ${sq(c)} − ${sq(a)} = ${sq(b)}, donc ${A}H = ${fmt(b)}. Aire = ${frac(`${fmt(2 * a)} × ${fmt(b)}`, 2)} = ${fmt(r6(a * b))} ${u}².`,
    }), free(raw, {
      segments: [{ a: A, b: B, label: L(c, u), mark: 'tick' }, { a: A, b: C, label: L(c, u), mark: 'tick' }, { a: B, b: 'H', mark: 'tick2' }, { a: 'H', b: C, mark: 'tick2' }, { a: A, b: 'H', dashed: true }],
      angles: [{ vertex: 'H', a: C, b: A, right: true }],
    }))
  },
  () => {
    const [a, b, c] = triple(30), n = names4(), u = unit()
    // losange de demi-diagonales a et b
    const raw = randomOrient({ [n[0]]: [-a, 0], [n[1]]: [0, -b], [n[2]]: [a, 0], [n[3]]: [0, b], O: [0, 0] })
    return W(numeric(`Les diagonales du losange ${n.join('')} se coupent en O et mesurent ${n[0]}${n[2]} = ${L(2 * a, u)} et ${n[1]}${n[3]} = ${L(2 * b, u)}. Calcule le périmètre du losange (en ${u}).`, r6(4 * c), {
      explanation: `Les diagonales d'un losange se coupent en leur milieu et sont perpendiculaires : O${n[0]}${n[1]} est rectangle en O, avec O${n[0]} = ${fmt(a)} et O${n[1]} = ${fmt(b)}. Pythagore : ${n[0]}${n[1]}² = ${sq(a)} + ${sq(b)} = ${sq(c)}, donc ${n[0]}${n[1]} = ${fmt(c)} et le périmètre vaut 4 × ${fmt(c)} = ${L(r6(4 * c), u)}.`,
    }), free(raw, {
      segments: [
        { a: n[0], b: n[1] }, { a: n[1], b: n[2] }, { a: n[2], b: n[3] }, { a: n[3], b: n[0] },
        { a: n[0], b: n[2], dashed: true }, { a: n[1], b: n[3], dashed: true },
      ],
      angles: [{ vertex: 'O', a: n[2], b: n[3], right: true }],
    }))
  },
)

// ── Palier 4 ────────────────────────────────────────────────────────────
function sqrtParts(n: number): [number, number] {
  let k = 1, m = n
  for (let d = 2; d * d <= m; d++) while (m % (d * d) === 0) { m /= d * d; k *= d }
  return [k, m]
}
/** Réponse exacte √n (entier si n est un carré parfait, sinon a√b). */
function exactRoot(prompt: string, n: number, explanation: string): Exercise {
  const [k, m] = sqrtParts(n)
  return m === 1 ? numeric(prompt, k, { explanation }) : radical(prompt, k, m, { explanation })
}
const rootText = (n: number) => {
  const [k, m] = sqrtParts(n)
  return m === 1 ? fmt(k) : `${k === 1 ? '' : k}√${m}`
}

// Valeurs exactes avec Pythagore
const p4Exact = model(
  () => retry(() => {
    const a = randInt(1, 9), b = randInt(1, 9), [R, P, Q] = names3(), u = unit()
    const s = a * a + b * b, [k, m] = sqrtParts(s)
    if (m === 1 || k === 1 || b / a > 2.6 || a / b > 2.6) return null
    return W(exactRoot(`Le triangle ${R}${P}${Q} est rectangle en ${R}, avec ${R}${P} = ${L(a, u)} et ${R}${Q} = ${L(b, u)}. Donne la valeur exacte de ${P}${Q} sous la forme a√b.`, s,
      `Pythagore : ${P}${Q}² = ${a * a} + ${b * b} = ${s}, donc ${P}${Q} = √${s} = ${rootText(s)} ${u}.`),
    rightTri([R, P, Q], a, b, { sides: { RP: L(a, u), RQ: L(b, u), PQ: '?' }, red: ['PQ'] }))
  }),
  () => retry(() => {
    const c = randInt(4, 12), a = randInt(1, c - 1), [R, P, Q] = names3(), u = unit()
    const s = c * c - a * a, [k, m] = sqrtParts(s)
    if (m === 1 || k === 1) return null
    const b = Math.sqrt(s)
    if (b / a > 2.6 || a / b > 2.6) return null
    return W(exactRoot(`Le triangle ${R}${P}${Q} est rectangle en ${R}, avec ${P}${Q} = ${L(c, u)} et ${R}${P} = ${L(a, u)}. Donne la valeur exacte de ${R}${Q} sous la forme a√b.`, s,
      `Pythagore : ${R}${Q}² = ${c * c} − ${a * a} = ${s}, donc ${R}${Q} = √${s} = ${rootText(s)} ${u}.`),
    rightTri([R, P, Q], a, b, { sides: { RP: L(a, u), PQ: L(c, u), RQ: '?' }, red: ['RQ'] }))
  }),
  () => {
    const s = randInt(2, 12), n = names4(), u = unit()
    return W(radical(`Le carré ${n.join('')} a pour côté ${L(s, u)}. Donne la valeur exacte de la longueur de sa diagonale, sous la forme a√b.`, s, 2, {
      explanation: `Pythagore dans le triangle ${n[0]}${n[1]}${n[2]} rectangle en ${n[1]} : d² = ${s * s} + ${s * s} = ${2 * s * s}, donc d = √${2 * s * s} = ${s === 1 ? '' : s}√2 ${u}.`,
    }), rectFig(n, s, s, { l1: L(s, u), l2: L(s, u), d: '?' }))
  },
  () => {
    const k = randInt(1, 9), side = 2 * k, [A, B, C] = names3(), u = unit()
    const raw = randomOrient({ [A]: [0, Math.sqrt(3)], [B]: [-1, 0], [C]: [1, 0], H: [0, 0] })
    return W(radical(`Le triangle ${A}${B}${C} est équilatéral de côté ${L(side, u)}, et H est le milieu de [${B}${C}]. Donne la valeur exacte de la hauteur ${A}H, sous la forme a√b.`, k, 3, {
      explanation: `${A}H${B} est rectangle en H avec ${B}H = ${k}. Pythagore : ${A}H² = ${side * side} − ${k * k} = ${3 * k * k}, donc ${A}H = √${3 * k * k} = ${k === 1 ? '' : k}√3 ${u}.`,
    }), free(raw, {
      segments: [{ a: A, b: B, label: L(side, u) }, { a: B, b: C }, { a: C, b: A }, { a: A, b: 'H', dashed: true, label: '?', color: RED }],
      angles: [{ vertex: 'H', a: C, b: A, right: true }],
    }))
  },
)

/** Cerf-volant : sol, main à la hauteur e (exagérée), fil de longueur Lg incliné de t degrés. */
function kiteFig(Lg: number, t: number, e: number): Figure {
  const c = Math.cos(rad(t)), sn = Math.sin(rad(t)), up = Math.max(e, Lg * sn * 0.12)
  return free({ G: [0, 0], M: [0, up], K: [Lg * c, up + Lg * sn], J: [Lg * c, up], S: [Lg * c, 0] }, {
    labels: { G: '', M: '', K: '', J: '', S: '' },
    segments: [
      { a: 'G', b: 'S' }, { a: 'G', b: 'M', label: L(e, 'm') }, { a: 'M', b: 'K', label: `${Lg} m`, color: GOLD },
      { a: 'M', b: 'J', dashed: true }, { a: 'S', b: 'K', dashed: true, label: '?', color: RED },
    ],
    angles: [{ vertex: 'M', a: 'J', b: 'K', label: `${t}°` }, { vertex: 'J', a: 'M', b: 'K', right: true }],
    away: { SK: 'M', GM: 'K' },
    caption: 'La hauteur de la main est exagérée sur le dessin.',
  })
}

// Trigonométrie en deux étapes
const p4Trig2 = model(
  () => {
    const t = randInt(20, 50), d = randInt(10, 40), e = randInt(14, 18) / 10
    const h = d * Math.tan(rad(t)) + e
    const who = prenom()
    return W(approx(`${who} se tient debout à ${d} m du pied d'une tour, les yeux à ${L(e, 'm')} du sol, et voit le sommet de la tour sous un angle de ${t}° au-dessus de l'horizontale. Quelle est la hauteur de la tour, arrondie au dixième de mètre ?`, h, 1,
      `Au-dessus du niveau des yeux : ${d} × tan ${t}° ≈ ${fmt(rnd(d * Math.tan(rad(t)), 2))} m. On ajoute la hauteur des yeux : h ≈ ${fmt(rnd(h))} m.`),
    free({ _g0: [-2, 0], F: [0, 0], Y: [0, e * 2], P: [d, e * 2], S: [d, d * Math.tan(rad(t)) + e * 2], B: [d, 0] }, {
      labels: { F: '', Y: '', P: '', S: '', B: '' },
      segments: [{ a: '_g0', b: 'B' }, { a: 'F', b: 'Y', label: L(e, 'm') }, { a: 'Y', b: 'P', dashed: true, label: `${d} m` }, { a: 'Y', b: 'S', color: BLUE }, { a: 'B', b: 'S', label: '?', color: RED }],
      angles: [{ vertex: 'Y', a: 'P', b: 'S', label: `${t}°` }, { vertex: 'P', a: 'Y', b: 'S', right: true }],
      caption: 'Le dessin exagère la hauteur des yeux.',
    }))
  },
  () => {
    const t = randInt(25, 65), Lg = randInt(20, 60), e = randInt(8, 15) / 10
    const h = Lg * Math.sin(rad(t)) + e
    return W(approx(`Un cerf-volant est retenu par un fil tendu de ${Lg} m, qui fait un angle de ${t}° avec l'horizontale. La main qui tient le fil est à ${L(e, 'm')} du sol. À quelle altitude vole le cerf-volant ? Arrondis au dixième de mètre.`, h, 1,
      `Au-dessus de la main : ${Lg} × sin ${t}° ≈ ${fmt(rnd(Lg * Math.sin(rad(t)), 2))} m. Altitude ≈ ${fmt(rnd(Lg * Math.sin(rad(t)), 2))} + ${fmt(e)} ≈ ${fmt(rnd(h))} m.`),
    kiteFig(Lg, t, e))
  },
  () => {
    const g = trig(ANG(), 'adj', randInt(3, 15)), u = unit()
    const per = g.adj + g.opp + g.hyp
    return W(approx(`${trigIntro(g)} On donne ${g.R}${g.P} = ${L(g.adj, u)}. Calcule le périmètre du triangle, arrondi au dixième (en ${u}).`, per, 1,
      `${g.R}${g.Q} = ${fmt(g.adj)} × tan ${g.t}° ≈ ${fmt(rnd(g.opp, 2))} et ${g.P}${g.Q} = ${frac(fmt(g.adj), `cos ${g.t}°`)} ≈ ${fmt(rnd(g.hyp, 2))}. Périmètre ≈ ${fmt(g.adj)} + ${fmt(rnd(g.opp, 2))} + ${fmt(rnd(g.hyp, 2))} ≈ ${fmt(rnd(per))} ${u}.`),
    trigFig(g, { RP: L(g.adj, u) }, 'PQ'))
  },
  () => {
    const g = trig(ANG(), 'hyp', randInt(4, 20)), u = unit()
    const A = (g.adj * g.opp) / 2
    return W(approx(`${trigIntro(g)} On donne ${g.P}${g.Q} = ${L(g.hyp, u)}. Calcule l'aire du triangle, arrondie au dixième (en ${u}²).`, A, 1,
      `${g.R}${g.P} = ${fmt(g.hyp)} × cos ${g.t}° ≈ ${fmt(rnd(g.adj, 2))} et ${g.R}${g.Q} = ${fmt(g.hyp)} × sin ${g.t}° ≈ ${fmt(rnd(g.opp, 2))}. Aire = ${frac(`${g.R}${g.P} × ${g.R}${g.Q}`, 2)} ≈ ${fmt(rnd(A))} ${u}².`),
    rightTri([g.R, g.P, g.Q], g.adj, g.opp, { sides: { PQ: L(g.hyp, u) }, angle: { at: 'P', label: `${g.t}°` } }))
  },
)

// Thalès puis périmètre ou aire
const p4ThalesMeasure = model(
  () => {
    const d = thalesData(), n = pick(THALES_NAMES), u = unit()
    const per = d.AM + d.AN + d.MN
    return W(numeric(`${thalesHyp(n, false)} Le triangle ${n.A}${n.B}${n.C} a pour côtés ${n.A}${n.B} = ${L(d.AB, u)}, ${n.A}${n.C} = ${L(d.AC, u)} et ${n.B}${n.C} = ${L(d.BC, u)}, et ${n.A}${n.M} = ${L(d.AM, u)}. Calcule le périmètre du triangle ${n.A}${n.M}${n.N} (en ${u}).`, per, {
      explanation: `Thalès : le coefficient de réduction est ${frac(`${n.A}${n.M}`, `${n.A}${n.B}`)} = ${frac(d.AM, d.AB)} = ${fracText(d.AM, d.AB)}. Donc ${n.A}${n.N} = ${d.AN} et ${n.M}${n.N} = ${d.MN}, et le périmètre vaut ${d.AM} + ${d.AN} + ${d.MN} = ${L(per, u)}.`,
    }), thalesFig(n, d, false, { AM: L(d.AM, u), AB: L(d.AB, u), AC: L(d.AC, u), BC: L(d.BC, u) }))
  },
  () => {
    const d = thalesData(), n = pick(THALES_NAMES), u = unit()
    const per = d.MB + d.BC + d.NC + d.MN
    return W(numeric(`${thalesHyp(n, false)} On donne ${n.A}${n.B} = ${L(d.AB, u)}, ${n.A}${n.C} = ${L(d.AC, u)}, ${n.B}${n.C} = ${L(d.BC, u)} et ${n.A}${n.M} = ${L(d.AM, u)}. Calcule le périmètre du trapèze ${n.M}${n.B}${n.C}${n.N} (en ${u}).`, per, {
      explanation: `Thalès : ${n.A}${n.N} = ${frac(`${d.AM} × ${d.AC}`, d.AB)} = ${d.AN} et ${n.M}${n.N} = ${frac(`${d.AM} × ${d.BC}`, d.AB)} = ${d.MN}. Puis ${n.M}${n.B} = ${d.MB} et ${n.N}${n.C} = ${d.NC}. Périmètre : ${d.MB} + ${d.BC} + ${d.NC} + ${d.MN} = ${L(per, u)}.`,
    }), thalesFig(n, d, false, { AM: L(d.AM, u), AB: L(d.AB, u), AC: L(d.AC, u), BC: L(d.BC, u) }))
  },
  () => {
    const d = thalesData(30, [[1, 2], [1, 3], [2, 3], [1, 4], [3, 4], [2, 5], [3, 5]]), n = pick(THALES_NAMES), u = unit()
    const kn = d.AM / gcd(d.AM, d.AB), kd = d.AB / gcd(d.AM, d.AB)
    const A = kd * kd * randInt(2, 9)
    const a = (A * kn * kn) / (kd * kd)
    return W(numeric(`${thalesHyp(n, false)} On sait que ${n.A}${n.M} = ${L(d.AM, u)}, ${n.A}${n.B} = ${L(d.AB, u)} et que l'aire du triangle ${n.A}${n.B}${n.C} vaut ${A} ${u}². Calcule l'aire du triangle ${n.A}${n.M}${n.N} (en ${u}²).`, a, {
      explanation: `Le triangle ${n.A}${n.M}${n.N} est une réduction de ${n.A}${n.B}${n.C} de rapport k = ${frac(d.AM, d.AB)} = ${fracText(kn, kd)}. Les aires sont multipliées par k² = ${fracText(kn * kn, kd * kd)} : ${A} × ${frac(kn * kn, kd * kd)} = ${fmt(a)} ${u}².`,
    }), (() => {
      const f = thalesFig(n, d, false, { AM: L(d.AM, u), AB: L(d.AB, u) })
      f.polygons = [{ pts: [n.A, n.M, n.N], fill: GOLD }]
      return f
    })())
  },
  () => {
    const d = thalesData(24, KB), n = pick(THALES_NAMES), u = unit()
    const per = d.AM + d.AN + d.MN
    return W(numeric(`${thalesHyp(n, true)} On donne ${n.A}${n.B} = ${L(d.AB, u)}, ${n.A}${n.C} = ${L(d.AC, u)}, ${n.B}${n.C} = ${L(d.BC, u)} et ${n.A}${n.M} = ${L(d.AM, u)}. Calcule le périmètre du triangle ${n.A}${n.M}${n.N} (en ${u}).`, per, {
      explanation: `Papillon : d'après Thalès, ${n.A}${n.N} = ${frac(`${d.AM} × ${d.AC}`, d.AB)} = ${d.AN} et ${n.M}${n.N} = ${frac(`${d.AM} × ${d.BC}`, d.AB)} = ${d.MN}. Périmètre : ${d.AM} + ${d.AN} + ${d.MN} = ${L(per, u)}.`,
    }), thalesFig(n, d, true, { AM: L(d.AM, u), AB: L(d.AB, u), AC: L(d.AC, u), BC: L(d.BC, u) }))
  },
)

/** Triangle ABC (A, B sur l'horizontale) avec le pied H de la hauteur issue de C. */
function altitudeFig(n: [string, string, string], AB: number, AC: number, tA: number, lab: { AB?: string; AC?: string; CH?: string; AH?: string; HB?: string }, red?: 'CH' | 'AH' | 'HB'): Figure {
  const [A, B, C] = n
  const cx = AC * Math.cos(rad(tA)), cy = AC * Math.sin(rad(tA))
  const raw = orient({ [A]: [0, 0], [B]: [AB, 0], [C]: [cx, cy], H: [cx, 0] }, 0, Math.random() < 0.5)
  return free(raw, {
    segments: [
      { a: A, b: 'H', label: lab.AH, color: red === 'AH' ? RED : undefined }, { a: 'H', b: B, label: lab.HB, color: red === 'HB' ? RED : undefined },
      { a: A, b: C, label: lab.AC }, { a: B, b: C }, { a: C, b: 'H', dashed: true, label: lab.CH, color: red === 'CH' ? RED : undefined },
      ...(lab.AB ? [{ a: A, b: B, label: lab.AB, color: 'transparent' }] : []),
    ],
    angles: [{ vertex: 'H', a: B, b: C, right: true }, { vertex: A, a: B, b: C, label: `${tA}°` }],
    away: { [`${C}H`]: B, [`${A}${B}`]: C },
    inside: lab.AB && (lab.AH || lab.HB) ? [`${A}${B}`] : [],
  })
}

// Hauteur d'un triangle quelconque et trigonométrie
const p4Altitude = model(
  () => retry(() => {
    const tA = randInt(30, 70), AC = randInt(4, 15), AB = randInt(6, 20), n = names3(), u = unit()
    const ah = AC * Math.cos(rad(tA))
    if (ah > AB - 1.5) return null
    const ch = AC * Math.sin(rad(tA))
    return W(approx(`Dans le triangle ${n.join('')}, ${hat(n[2], n[0], n[1])} = ${tA}° et ${n[0]}${n[2]} = ${L(AC, u)}. H est le pied de la hauteur issue de ${n[2]}. Calcule ${n[2]}H, arrondie au dixième (en ${u}).`, ch, 1,
      `Le triangle ${n[0]}H${n[2]} est rectangle en H : sin ${tA}° = ${frac(`${n[2]}H`, `${n[0]}${n[2]}`)}, donc ${n[2]}H = ${AC} × sin ${tA}° ≈ ${fmt(rnd(ch))} ${u}.`),
    altitudeFig(n, AB, AC, tA, { AC: L(AC, u), CH: '?' }, 'CH'))
  }),
  () => retry(() => {
    const tA = randInt(30, 70), AC = randInt(4, 15), AB = randInt(6, 20), n = names3(), u = unit()
    const ah = AC * Math.cos(rad(tA))
    if (ah > AB - 1.5) return null
    return W(approx(`Dans le triangle ${n.join('')}, ${hat(n[2], n[0], n[1])} = ${tA}°, ${n[0]}${n[1]} = ${L(AB, u)} et ${n[0]}${n[2]} = ${L(AC, u)}. H est le pied de la hauteur issue de ${n[2]}. Calcule H${n[1]}, arrondie au dixième (en ${u}).`, AB - ah, 1,
      `Dans ${n[0]}H${n[2]} rectangle en H : ${n[0]}H = ${AC} × cos ${tA}° ≈ ${fmt(rnd(ah, 2))}. Donc H${n[1]} = ${AB} − ${n[0]}H ≈ ${fmt(rnd(AB - ah))} ${u}.`),
    altitudeFig(n, AB, AC, tA, { AB: L(AB, u), AC: L(AC, u) }, 'HB'))
  }),
  () => retry(() => {
    const tA = randInt(30, 70), AC = randInt(4, 15), AB = randInt(6, 20), n = names3(), u = unit()
    const ah = AC * Math.cos(rad(tA))
    if (ah > AB - 1.5) return null
    const ch = AC * Math.sin(rad(tA)), A = (AB * ch) / 2
    return W(approx(`Dans le triangle ${n.join('')}, ${hat(n[2], n[0], n[1])} = ${tA}°, ${n[0]}${n[1]} = ${L(AB, u)} et ${n[0]}${n[2]} = ${L(AC, u)}. En traçant la hauteur [${n[2]}H], calcule l'aire du triangle, arrondie au dixième (en ${u}²).`, A, 1,
      `${n[2]}H = ${AC} × sin ${tA}° ≈ ${fmt(rnd(ch, 2))}. Aire = ${frac(`${n[0]}${n[1]} × ${n[2]}H`, 2)} ≈ ${frac(`${AB} × ${fmt(rnd(ch, 2))}`, 2)} ≈ ${fmt(rnd(A))} ${u}².`),
    altitudeFig(n, AB, AC, tA, { AB: L(AB, u), AC: L(AC, u) }))
  }),
)

/** Triangle isocèle en A (sommet en haut), base [BC], hauteur [AH]. */
function isoFig(n: [string, string, string], half: number, h: number, lab: { side?: string; base?: string; h?: string }, angle?: { at: 'A' | 'B'; label: string }): Figure {
  const [A, B, C] = n
  const raw = { [A]: [0, h] as Pt, [B]: [-half, 0] as Pt, [C]: [half, 0] as Pt, H: [0, 0] as Pt }
  const angles: FigAngle[] = [{ vertex: 'H', a: B, b: A, right: true }]
  if (angle) angles.push(angle.at === 'A' ? { vertex: A, a: B, b: C, label: angle.label, color: RED, radius: 22 } : { vertex: B, a: C, b: A, label: angle.label, color: RED, radius: 22 })
  return free(raw, {
    segments: [
      { a: A, b: B, label: lab.side, mark: 'tick' }, { a: A, b: C, mark: 'tick' }, { a: B, b: C, color: 'transparent', label: lab.base },
      { a: B, b: 'H' }, { a: 'H', b: C }, { a: A, b: 'H', dashed: true, label: lab.h },
    ],
    angles,
    pos: { H: 'ne' },
    away: { [A + 'H']: C },
  })
}

// Triangle isocèle : angles et hauteur
const p4Iso = model(
  () => retry(() => {
    const s = randInt(5, 20), b = randInt(4, 2 * s - 2), n = names3(), u = unit()
    const tB = deg(Math.acos(b / 2 / s))
    if (tB < 25 || tB > 72) return null
    return W(approx(`Le triangle ${n.join('')} est isocèle en ${n[0]}, avec ${n[0]}${n[1]} = ${n[0]}${n[2]} = ${L(s, u)} et ${n[1]}${n[2]} = ${L(b, u)}. Calcule la mesure de l'angle ${hat(n[0], n[1], n[2])}, arrondie au degré.`, tB, 0,
      `Soit H le milieu de [${n[1]}${n[2]}] : la hauteur [${n[0]}H] coupe la base en deux, ${n[1]}H = ${fmt(b / 2)}. Dans ${n[0]}H${n[1]} rectangle en H : cos ${hat(n[0], n[1], n[2])} = ${frac(fmt(b / 2), s)}, donc l'angle mesure environ ${fmt(rnd(tB, 0))}°.`),
    isoFig(n, b / 2, Math.sqrt(s * s - (b * b) / 4), { side: L(s, u), base: L(b, u) }, { at: 'B', label: '?' }))
  }),
  () => retry(() => {
    const s = randInt(5, 20), b = randInt(4, 2 * s - 2), n = names3(), u = unit()
    const tA = 2 * deg(Math.asin(b / 2 / s))
    if (tA < 30 || tA > 120) return null
    return W(approx(`Le triangle ${n.join('')} est isocèle en ${n[0]}, avec ${n[0]}${n[1]} = ${n[0]}${n[2]} = ${L(s, u)} et ${n[1]}${n[2]} = ${L(b, u)}. Calcule la mesure de l'angle au sommet ${hat(n[1], n[0], n[2])}, arrondie au degré.`, tA, 0,
      `Avec H milieu de [${n[1]}${n[2]}], la hauteur [${n[0]}H] est aussi bissectrice. Dans ${n[0]}H${n[1]} : sin ${hat(n[1], n[0], 'H')} = ${frac(fmt(b / 2), s)}, d'où ${hat(n[1], n[0], 'H')} ≈ ${fmt(rnd(tA / 2, 2))}° et ${hat(n[1], n[0], n[2])} ≈ ${fmt(rnd(tA, 0))}°.`),
    isoFig(n, b / 2, Math.sqrt(s * s - (b * b) / 4), { side: L(s, u), base: L(b, u) }, { at: 'A', label: '?' }))
  }),
  () => retry(() => {
    const t = randInt(30, 70), b = randInt(4, 20), n = names3(), u = unit()
    const h = (b / 2) * Math.tan(rad(t))
    return W(approx(`Le triangle ${n.join('')} est isocèle en ${n[0]}, de base ${n[1]}${n[2]} = ${L(b, u)}, avec ${hat(n[0], n[1], n[2])} = ${t}°. Calcule sa hauteur ${n[0]}H issue de ${n[0]}, arrondie au dixième (en ${u}).`, h, 1,
      `H est le milieu de [${n[1]}${n[2]}], donc ${n[1]}H = ${fmt(b / 2)}. Dans ${n[0]}H${n[1]} rectangle en H : ${n[0]}H = ${fmt(b / 2)} × tan ${t}° ≈ ${fmt(rnd(h))} ${u}.`),
    isoFig(n, b / 2, h, { base: L(b, u), h: '?' }, { at: 'B', label: `${t}°` }))
  }),
  () => retry(() => {
    const t = randInt(30, 70), s = randInt(4, 20), n = names3(), u = unit()
    const half = s * Math.cos(rad(t)), h = s * Math.sin(rad(t))
    const A = half * h
    return W(approx(`Le triangle ${n.join('')} est isocèle en ${n[0]}, avec ${n[0]}${n[1]} = ${n[0]}${n[2]} = ${L(s, u)} et ${hat(n[0], n[1], n[2])} = ${t}°. Calcule son aire, arrondie au dixième (en ${u}²).`, A, 1,
      `Avec H milieu de [${n[1]}${n[2]}] : ${n[1]}H = ${s} × cos ${t}° ≈ ${fmt(rnd(half, 2))} et ${n[0]}H = ${s} × sin ${t}° ≈ ${fmt(rnd(h, 2))}. Aire = ${frac(`${n[1]}${n[2]} × ${n[0]}H`, 2)} = ${n[1]}H × ${n[0]}H ≈ ${fmt(rnd(A))} ${u}².`),
    isoFig(n, half, h, { side: L(s, u) }, { at: 'B', label: `${t}°` }))
  }),
)

// ── Palier 5 ────────────────────────────────────────────────────────────
// Thalès et Pythagore enchaînés
const p5ThalesPyth = model(
  () => retry(() => {
    const [a, b, c] = triple(40), [p, q] = pick(KS), n = pick(THALES_NAMES), u = unit()
    if (!isInt((c * p) / q) || !isInt((a * p) / q)) return null
    const AM = (a * p) / q, MN = (c * p) / q
    const raw = orient({ [n.A]: [0, 0], [n.B]: [a, 0], [n.C]: [0, b], [n.M]: [AM, 0], [n.N]: [0, (b * p) / q] }, pick([0, 90, 180, 270]), Math.random() < 0.5)
    return W(numeric(`Le triangle ${n.A}${n.B}${n.C} est rectangle en ${n.A}, avec ${n.A}${n.B} = ${L(a, u)} et ${n.A}${n.C} = ${L(b, u)}. Le point ${n.M} est sur [${n.A}${n.B}] avec ${n.A}${n.M} = ${L(AM, u)}, et la parallèle à (${n.B}${n.C}) passant par ${n.M} coupe [${n.A}${n.C}] en ${n.N}. Calcule ${n.M}${n.N} (en ${u}).`, MN, {
      explanation: `Pythagore dans ${n.A}${n.B}${n.C} : ${n.B}${n.C}² = ${a * a} + ${b * b} = ${c * c}, donc ${n.B}${n.C} = ${c}. Thalès : ${n.M}${n.N} = ${n.B}${n.C} × ${frac(`${n.A}${n.M}`, `${n.A}${n.B}`)} = ${c} × ${frac(fmt(AM), a)} = ${L(MN, u)}.`,
    }), free(raw, {
      segments: [
        { a: n.A, b: n.M, label: L(AM, u) }, { a: n.M, b: n.B }, { a: n.A, b: n.C, label: L(b, u) }, { a: n.B, b: n.C, mark: 'arrow' },
        { a: n.M, b: n.N, mark: 'arrow', color: RED, label: '?' }, { a: n.A, b: n.B, color: 'transparent', label: L(a, u) },
      ],
      angles: [{ vertex: n.A, a: n.B, b: n.C, right: true }],
      away: { [n.A + n.M]: n.C, [n.A + n.C]: n.B, [n.M + n.N]: n.A, [n.A + n.B]: n.C },
      inside: [n.A + n.B],
    }))
  }),
  () => retry(() => {
    const [a, b, c] = triple(40), [p, q] = pick(KS), n = pick(THALES_NAMES), u = unit()
    const AN = (b * p) / q, NC = b - AN, MN = (c * p) / q
    if (!isInt(AN) || !isInt(MN)) return null
    const raw = orient({ [n.A]: [0, 0], [n.B]: [a, 0], [n.C]: [0, b], [n.M]: [(a * p) / q, 0], [n.N]: [0, AN] }, pick([0, 90, 180, 270]), Math.random() < 0.5)
    return W(numeric(`Le triangle ${n.A}${n.B}${n.C} est rectangle en ${n.A}, avec ${n.A}${n.B} = ${L(a, u)} et ${n.B}${n.C} = ${L(c, u)}. ${n.N} est le point de [${n.A}${n.C}] tel que ${n.N}${n.C} = ${L(NC, u)}, et ${n.M} est sur [${n.A}${n.B}] avec (${n.M}${n.N}) parallèle à (${n.B}${n.C}). Calcule ${n.M}${n.N} (en ${u}).`, MN, {
      explanation: `Pythagore : ${n.A}${n.C}² = ${c * c} − ${a * a} = ${b * b}, donc ${n.A}${n.C} = ${b} et ${n.A}${n.N} = ${b} − ${NC} = ${AN}. Thalès : ${n.M}${n.N} = ${n.B}${n.C} × ${frac(`${n.A}${n.N}`, `${n.A}${n.C}`)} = ${c} × ${frac(AN, b)} = ${L(MN, u)}.`,
    }), free(raw, {
      segments: [
        { a: n.A, b: n.M }, { a: n.M, b: n.B }, { a: n.A, b: n.N }, { a: n.N, b: n.C, label: L(NC, u) }, { a: n.B, b: n.C, mark: 'arrow', label: L(c, u) },
        { a: n.M, b: n.N, mark: 'arrow', color: RED, label: '?' }, { a: n.A, b: n.B, color: 'transparent', label: L(a, u) },
      ],
      angles: [{ vertex: n.A, a: n.B, b: n.C, right: true }],
      away: { [n.N + n.C]: n.B, [n.B + n.C]: n.A, [n.M + n.N]: n.A, [n.A + n.B]: n.C },
    }))
  }),
  () => retry(() => {
    const n = pick(THALES_NAMES), u = unit()
    // papillon dont le grand triangle est rectangle en A : AB, AC, BC forment un triplet
    const [a, b, c] = triple(30), [p, q] = pick(KS)
    if (!isInt((a * p) / q) || !isInt((b * p) / q)) return null
    const AM = (a * p) / q, AN = (b * p) / q
    return W(numeric(`Les droites (${n.M}${n.B}) et (${n.N}${n.C}) se coupent en ${n.A}, perpendiculairement. On a ${n.A}${n.B} = ${L(a, u)}, ${n.A}${n.C} = ${L(b, u)}, ${n.A}${n.M} = ${L(AM, u)}, et (${n.M}${n.N}) est parallèle à (${n.B}${n.C}). Calcule ${n.M}${n.N} (en ${u}).`, r6((c * p) / q), {
      explanation: `Pythagore dans ${n.A}${n.B}${n.C} rectangle en ${n.A} : ${n.B}${n.C}² = ${a * a} + ${b * b} = ${c * c}, donc ${n.B}${n.C} = ${c}. Papillon de Thalès : ${n.M}${n.N} = ${c} × ${frac(fmt(AM), a)} = ${L(r6((c * p) / q), u)}.`,
    }), free(orient({ [n.A]: [0, 0], [n.B]: [a, 0], [n.C]: [0, b], [n.M]: [-AM, 0], [n.N]: [0, -AN] }, pick([0, 30, -30, 180]), Math.random() < 0.5), {
      segments: [
        { a: n.M, b: n.A, label: L(AM, u) }, { a: n.A, b: n.B, label: L(a, u) }, { a: n.N, b: n.A }, { a: n.A, b: n.C, label: L(b, u) },
        { a: n.B, b: n.C, mark: 'arrow' }, { a: n.M, b: n.N, mark: 'arrow', color: RED, label: '?' },
      ],
      angles: [{ vertex: n.A, a: n.B, b: n.C, right: true }],
      away: { [n.M + n.A]: n.N, [n.A + n.B]: n.C, [n.A + n.C]: n.B, [n.M + n.N]: n.A },
    }))
  }),
)

// Trapèze rectangle : Pythagore puis aire ou périmètre
const p5Trapeze = model(
  ...(['area', 'per', 'side'] as const).map((kind) => () => {
    const [a, b, c] = triple(30), n = names4(), u = unit()
    // ABCD trapèze rectangle en A et D : AB grande base, DC petite base, hauteur AD = h, oblique BC = c, AB − DC = a
    const small = randInt(2, 12), big = small + a, h = b
    const raw = orient({ [n[0]]: [0, 0], [n[1]]: [big, 0], [n[2]]: [small, h], [n[3]]: [0, h], _H: [small, 0] }, 0, Math.random() < 0.5)
    const area = ((big + small) * h) / 2
    const per = big + small + h + c
    const segs = (lab: { h?: string; c?: string }): FigSegment[] => [
      { a: n[0], b: n[1], label: L(big, u) }, { a: n[1], b: n[2], label: lab.c }, { a: n[2], b: n[3], label: L(small, u) }, { a: n[3], b: n[0], label: lab.h },
      { a: n[2], b: '_H', dashed: true },
    ]
    const angles: FigAngle[] = [{ vertex: n[0], a: n[1], b: n[3], right: true }, { vertex: n[3], a: n[0], b: n[2], right: true }]
    if (kind === 'area') {
      return W(numeric(`${n.join('')} est un trapèze rectangle en ${n[0]} et ${n[3]}, de bases ${n[0]}${n[1]} = ${L(big, u)} et ${n[3]}${n[2]} = ${L(small, u)}, avec ${n[1]}${n[2]} = ${L(c, u)}. Calcule son aire (en ${u}²).`, area, {
        explanation: `Soit H le pied de la hauteur issue de ${n[2]} : H${n[1]} = ${big} − ${small} = ${a}. Pythagore dans ${n[2]}H${n[1]} : ${n[2]}H² = ${c * c} − ${a * a} = ${b * b}, donc la hauteur vaut ${b}. Aire = ${frac(`(${big} + ${small}) × ${b}`, 2)} = ${fmt(area)} ${u}².`,
      }), free(raw, { segments: segs({ c: L(c, u) }), angles }))
    }
    if (kind === 'per') {
      return W(numeric(`${n.join('')} est un trapèze rectangle en ${n[0]} et ${n[3]}, de bases ${n[0]}${n[1]} = ${L(big, u)} et ${n[3]}${n[2]} = ${L(small, u)}, et de hauteur ${n[0]}${n[3]} = ${L(h, u)}. Calcule son périmètre (en ${u}).`, per, {
        explanation: `Soit H le pied de la hauteur issue de ${n[2]} : ${n[2]}H = ${h} et H${n[1]} = ${big} − ${small} = ${a}. Pythagore : ${n[1]}${n[2]}² = ${h * h} + ${a * a} = ${c * c}, donc ${n[1]}${n[2]} = ${c}. Périmètre = ${big} + ${c} + ${small} + ${h} = ${L(per, u)}.`,
      }), free(raw, { segments: segs({ h: L(h, u) }), angles }))
    }
    return W(numeric(`${n.join('')} est un trapèze rectangle en ${n[0]} et ${n[3]}, d'aire ${fmt(area)} ${u}², de bases ${n[0]}${n[1]} = ${L(big, u)} et ${n[3]}${n[2]} = ${L(small, u)}. Calcule la longueur du côté oblique ${n[1]}${n[2]} (en ${u}).`, c, {
      explanation: `Aire = ${frac(`(${big} + ${small}) × h`, 2)} = ${fmt(area)}, donc h = ${frac(`2 × ${fmt(area)}`, big + small)} = ${h}. Avec H pied de la hauteur issue de ${n[2]} : H${n[1]} = ${a}. Pythagore : ${n[1]}${n[2]}² = ${h * h} + ${a * a} = ${c * c}, donc ${n[1]}${n[2]} = ${L(c, u)}.`,
    }), free(raw, { segments: segs({ c: '?' }), angles }))
  }),
)

// Deux angles de dépression
const p5Depression = model(
  ...[
    { who: 'Du sommet d’une falaise', obj: ['un premier bateau', 'un second bateau'], q: 'Quelle distance sépare les deux bateaux' },
    { who: 'Du haut d’un phare', obj: ['une bouée rouge', 'une bouée verte'], q: 'Quelle distance sépare les deux bouées' },
    { who: 'Depuis le chemin de ronde d’une tour', obj: ['un chariot', 'un cavalier'], q: 'Quelle distance sépare le chariot du cavalier' },
  ].map((ctx) => () => retry(() => {
    const h = randInt(20, 80), a1 = randInt(35, 60), a2 = randInt(16, a1 - 10)
    const d1 = h / Math.tan(rad(a1)), d2 = h / Math.tan(rad(a2))
    const dist = d2 - d1
    const near = 'P', far = 'Q'
    return W(approx(`${ctx.who}, à ${h} m au-dessus du sol (ou de la mer), on voit ${ctx.obj[0]} sous un angle de ${a1}° et ${ctx.obj[1]} sous un angle de ${a2}° en dessous de l'horizontale. Les deux sont alignés avec le pied, du même côté. ${ctx.q} ? Arrondis au mètre.`, dist, 0,
      `L'angle sous l'horizontale se retrouve au sol (angles alternes-internes). Distances au pied : ${frac(h, `tan ${a1}°`)} ≈ ${fmt(rnd(d1, 1))} m et ${frac(h, `tan ${a2}°`)} ≈ ${fmt(rnd(d2, 1))} m. Écart ≈ ${fmt(rnd(dist, 0))} m.`),
    free({ O: [0, 0], S: [0, h], [near]: [d1, 0], [far]: [d2, 0], _h: [d2, h] }, {
      labels: { O: '', S: '', [near]: '', [far]: '' },
      segments: [{ a: 'O', b: far }, { a: 'O', b: 'S', label: `${h} m` }, { a: 'S', b: near, color: BLUE }, { a: 'S', b: far, color: BLUE }, { a: 'S', b: '_h', dashed: true }, { a: near, b: far, label: '?', color: RED }],
      angles: [{ vertex: near, a: 'O', b: 'S', label: `${a1}°`, radius: 22 }, { vertex: far, a: 'O', b: 'S', label: `${a2}°`, radius: 30 }, { vertex: 'O', a: near, b: 'S', right: true }],
      away: { [near + far]: 'S' },
      caption: 'Les angles sous l’horizontale se retrouvent au sol (angles alternes-internes).',
    }))
  })),
)

// Aire par la trigonométrie (½ab sin)
const p5TrigArea = model(
  () => retry(() => {
    const a = randInt(4, 15), b = randInt(4, 15), t = randInt(25, 80), n = names3(), u = unit()
    const A = 0.5 * a * b * Math.sin(rad(t))
    if (b * Math.cos(rad(t)) > a - 1) return null
    return W(approx(`Dans le triangle ${n.join('')}, ${n[0]}${n[1]} = ${L(a, u)}, ${n[0]}${n[2]} = ${L(b, u)} et ${hat(n[1], n[0], n[2])} = ${t}°. Calcule l'aire du triangle, arrondie au dixième (en ${u}²).`, A, 1,
      `La hauteur issue de ${n[2]} mesure ${b} × sin ${t}° ≈ ${fmt(rnd(b * Math.sin(rad(t)), 2))}. Aire = ${frac(`${a} × ${b} × sin ${t}°`, 2)} ≈ ${fmt(rnd(A))} ${u}².`),
    altitudeFig(n, a, b, t, { AB: L(a, u), AC: L(b, u) }))
  }),
  () => {
    const a = randInt(4, 15), b = randInt(3, 10), t = randInt(30, 75), n = names4(), u = unit()
    const A = a * b * Math.sin(rad(t))
    const ox = b * Math.cos(rad(t)), oy = b * Math.sin(rad(t))
    return W(approx(`Le parallélogramme ${n.join('')} a pour côtés ${n[0]}${n[1]} = ${L(a, u)} et ${n[0]}${n[3]} = ${L(b, u)}, avec ${hat(n[1], n[0], n[3])} = ${t}°. Calcule son aire, arrondie au dixième (en ${u}²).`, A, 1,
      `La hauteur relative à [${n[0]}${n[1]}] mesure ${b} × sin ${t}° ≈ ${fmt(rnd(oy, 2))}. Aire = base × hauteur ≈ ${a} × ${fmt(rnd(oy, 2))} ≈ ${fmt(rnd(A))} ${u}².`),
    free({ [n[0]]: [0, 0], [n[1]]: [a, 0], [n[2]]: [a + ox, oy], [n[3]]: [ox, oy], H: [ox, 0] }, {
      segments: [{ a: n[0], b: n[1], label: L(a, u) }, { a: n[1], b: n[2] }, { a: n[2], b: n[3] }, { a: n[3], b: n[0], label: L(b, u) }, { a: n[3], b: 'H', dashed: true }],
      angles: [{ vertex: n[0], a: n[1], b: n[3], label: `${t}°` }, { vertex: 'H', a: n[1], b: n[3], right: true }],
      hidden: ['H'],
      polygons: [{ pts: [n[0], n[1], n[2], n[3]], fill: GREEN }],
    }))
  },
  () => {
    const s = randInt(4, 15), t = randInt(30, 120), n = names3(), u = unit()
    const A = 0.5 * s * s * Math.sin(rad(t))
    const half = s * Math.sin(rad(t / 2)), h = s * Math.cos(rad(t / 2))
    return W(approx(`Le triangle ${n.join('')} est isocèle en ${n[0]}, avec ${n[0]}${n[1]} = ${n[0]}${n[2]} = ${L(s, u)} et un angle au sommet ${hat(n[1], n[0], n[2])} = ${t}°. Calcule son aire, arrondie au dixième (en ${u}²).`, A, 1,
      `La hauteur issue de ${n[1]} sur (${n[0]}${n[2]}) mesure ${s} × sin ${t}° ; aire = ${frac(`${s} × ${s} × sin ${t}°`, 2)} ≈ ${fmt(rnd(A))} ${u}². (On peut aussi passer par la hauteur issue de ${n[0]} : ${s} × cos ${fmt(t / 2)}° ≈ ${fmt(rnd(h, 2))}, et la demi-base ${s} × sin ${fmt(t / 2)}° ≈ ${fmt(rnd(half, 2))}.)`),
    isoFig(n, half, h, { side: L(s, u) }, { at: 'A', label: `${t}°` }))
  },
)

// Thalès et aires : la bande du trapèze
const p5ThalesArea = model(
  () => {
    const d = thalesData(30, [[1, 2], [1, 3], [2, 3], [1, 4], [3, 4], [2, 5], [3, 5]]), n = pick(THALES_NAMES), u = unit()
    const kn = d.AM / gcd(d.AM, d.AB), kd = d.AB / gcd(d.AM, d.AB)
    const A = kd * kd * randInt(2, 6)
    const small = (A * kn * kn) / (kd * kd)
    const f = thalesFig(n, d, false, { AM: L(d.AM, u), AB: L(d.AB, u) })
    f.polygons = [{ pts: [n.M, n.B, n.C, n.N], fill: GOLD }]
    return W(numeric(`${thalesHyp(n, false)} On sait que ${n.A}${n.M} = ${L(d.AM, u)}, ${n.A}${n.B} = ${L(d.AB, u)}, et que le triangle ${n.A}${n.B}${n.C} a une aire de ${A} ${u}². Calcule l'aire du trapèze ${n.M}${n.B}${n.C}${n.N} (en ${u}²).`, A - small, {
      explanation: `${n.A}${n.M}${n.N} est une réduction de ${n.A}${n.B}${n.C} de rapport k = ${fracText(kn, kd)}, donc son aire vaut ${A} × ${frac(kn * kn, kd * kd)} = ${fmt(small)} ${u}². Aire du trapèze : ${A} − ${fmt(small)} = ${fmt(A - small)} ${u}².`,
    }), f)
  },
  () => {
    const d = thalesData(30, [[1, 2], [1, 3], [2, 3], [1, 4], [3, 4], [2, 5], [3, 5]]), n = pick(THALES_NAMES), u = unit()
    const kn = d.AM / gcd(d.AM, d.AB), kd = d.AB / gcd(d.AM, d.AB)
    const small = kn * kn * randInt(2, 6)
    const A = (small * kd * kd) / (kn * kn)
    const f = thalesFig(n, d, false, { AM: L(d.AM, u), MB: L(d.MB, u) })
    f.polygons = [{ pts: [n.A, n.M, n.N], fill: GOLD }]
    return W(numeric(`${thalesHyp(n, false)} On sait que ${n.A}${n.M} = ${L(d.AM, u)}, ${n.M}${n.B} = ${L(d.MB, u)} et que le triangle ${n.A}${n.M}${n.N} a une aire de ${fmt(small)} ${u}². Calcule l'aire du triangle ${n.A}${n.B}${n.C} (en ${u}²).`, A, {
      explanation: `${n.A}${n.B} = ${d.AM} + ${d.MB} = ${d.AB}. ${n.A}${n.B}${n.C} est un agrandissement de ${n.A}${n.M}${n.N} de rapport ${frac(d.AB, d.AM)} = ${fracText(kd, kn)}, donc les aires sont multipliées par ${fracText(kd * kd, kn * kn)} : ${fmt(small)} × ${frac(kd * kd, kn * kn)} = ${fmt(A)} ${u}².`,
    }), f)
  },
  () => {
    const d = thalesData(24, KB), n = pick(THALES_NAMES), u = unit()
    const kn = d.AM / gcd(d.AM, d.AB), kd = d.AB / gcd(d.AM, d.AB)
    const A = kd * kd * randInt(2, 6)
    const small = (A * kn * kn) / (kd * kd)
    const f = thalesFig(n, d, true, { AM: L(d.AM, u), AB: L(d.AB, u) })
    f.polygons = [{ pts: [n.A, n.M, n.N], fill: GOLD }, { pts: [n.A, n.B, n.C], fill: GREEN }]
    return W(numeric(`${thalesHyp(n, true)} On donne ${n.A}${n.M} = ${L(d.AM, u)} et ${n.A}${n.B} = ${L(d.AB, u)}. Le triangle ${n.A}${n.B}${n.C} a une aire de ${A} ${u}². Calcule l'aire totale des deux triangles du « papillon » (en ${u}²).`, A + small, {
      explanation: `${n.A}${n.M}${n.N} est une réduction de ${n.A}${n.B}${n.C} de rapport ${fracText(kn, kd)} : son aire vaut ${A} × ${frac(kn * kn, kd * kd)} = ${fmt(small)} ${u}². Total : ${A} + ${fmt(small)} = ${fmt(A + small)} ${u}².`,
    }), f)
  },
)

const tiers: Tiers = [
  [p1Hyp, p1Leg, p1Thales, p1Ratios, p1Area],
  [p2PythRound, p2TrigMul, p2Thales, p2Converse, p2Method],
  [p3Angle, p3TrigDiv, p3Butterfly, p3ThalesConv, p3PythArea],
  [p4Exact, p4Trig2, p4ThalesMeasure, p4Altitude, p4Iso],
  [p5ThalesPyth, p5Trapeze, p5Depression, p5TrigArea, p5ThalesArea],
]

// ═════════════════════════════════════════════════════════════════════════
// Problèmes d'amélioration (généralisation)
// ═════════════════════════════════════════════════════════════════════════
const upgrades: Ladder = [
  [
    // cos² + sin² = 1
    () => {
      const [a, b, c] = pick(BASES), [R, P, Q] = names3()
      const fromCos = Math.random() < 0.5
      const [given, want] = fromCos ? [a, b] : [b, a]
      return T('cos² + sin² = 1', fraction(`Dans le triangle ${R}${P}${Q} rectangle en ${R}, on sait que ${fromCos ? 'cos' : 'sin'} ${hat(R, P, Q)} = ${frac(given, c)}, sans connaître les longueurs. Sachant que (cos x)² + (sin x)² = 1 pour tout angle aigu x, calcule ${fromCos ? 'sin' : 'cos'} ${hat(R, P, Q)}.`, want, c, {
        explanation: `(${fromCos ? 'sin' : 'cos'} ${hat(R, P, Q)})² = 1 − (${frac(given, c)})² = ${frac(c * c - given * given, c * c)}. Comme ${c * c - given * given} = ${want}², et que le nombre cherché est positif, il vaut ${frac(want, c)}.`,
      }), rightTri([R, P, Q], a, b, { angle: { at: 'P' } }))
    },
    // Pythagore littéral
    () => {
      const k = randInt(1, 7), [R, P, Q] = names3()
      const v = pick(['hyp', 'leg', 'double'] as const)
      if (v === 'hyp') {
        return T('Pythagore avec des lettres', expression(`Le triangle ${R}${P}${Q} est rectangle en ${R}, avec ${R}${P} = x et ${R}${Q} = x + ${k} (x > 0). Exprime ${P}${Q}² en fonction de x, sous forme développée et réduite.`, `2x^2 + ${2 * k}x + ${k * k}`, 'developed', {
          explanation: `Pythagore : ${P}${Q}² = x² + (x + ${k})² = x² + x² + ${2 * k}x + ${k * k} = 2x² + ${2 * k}x + ${k * k}.`,
        }), rightTri([R, P, Q], 1, 1.4, { sides: { RP: 'x', RQ: `x + ${k}`, PQ: '?' }, red: ['PQ'] }))
      }
      if (v === 'leg') {
        return T('Pythagore avec des lettres', expression(`Le triangle ${R}${P}${Q} est rectangle en ${R}, avec ${R}${P} = x et ${P}${Q} = x + ${k} (x > 0). Exprime ${R}${Q}² en fonction de x, sous forme développée et réduite.`, `${2 * k}x + ${k * k}`, 'developed', {
          explanation: `Pythagore : ${R}${Q}² = (x + ${k})² − x² = x² + ${2 * k}x + ${k * k} − x² = ${2 * k}x + ${k * k}.`,
        }), rightTri([R, P, Q], 1, 1.1, { sides: { RP: 'x', PQ: `x + ${k}`, RQ: '?' }, red: ['RQ'] }))
      }
      return T('Pythagore avec des lettres', expression(`Le triangle ${R}${P}${Q} est rectangle en ${R}, avec ${R}${P} = x et ${R}${Q} = 2x + ${k} (x > 0). Exprime ${P}${Q}² en fonction de x, sous forme développée et réduite.`, `5x^2 + ${4 * k}x + ${k * k}`, 'developed', {
        explanation: `Pythagore : ${P}${Q}² = x² + (2x + ${k})² = x² + 4x² + ${4 * k}x + ${k * k} = 5x² + ${4 * k}x + ${k * k}.`,
      }), rightTri([R, P, Q], 1, 2.2, { sides: { RP: 'x', RQ: `2x + ${k}`, PQ: '?' }, red: ['PQ'] }))
    },
    // Agrandissement / réduction : effet sur les aires
    () => {
      const [p, q] = pick([[1, 2], [1, 3], [2, 3], [3, 4], [2, 5], [3, 5], [4, 5], [3, 2], [5, 2], [4, 3]] as [number, number][])
      const d = thalesData(30, [[1, 2], [2, 3], [3, 4], [2, 5]]), n = pick(THALES_NAMES)
      const reduce = p < q
      return T('L’effet sur les aires', fraction(`Dans une configuration de Thalès, le triangle ${n.A}${n.M}${n.N} est ${reduce ? 'une réduction' : 'un agrandissement'} du triangle ${n.A}${n.B}${n.C} : toutes ses longueurs sont celles de ${n.A}${n.B}${n.C} multipliées par ${frac(p, q)}. Par quel nombre l'aire de ${n.A}${n.B}${n.C} est-elle multipliée pour obtenir celle de ${n.A}${n.M}${n.N} ?`, p * p, q * q, {
        explanation: `Une aire est le produit de deux longueurs : elle est multipliée par k² = (${frac(p, q)})² = ${frac(p * p, q * q)}.`,
      }), thalesFig(n, d, false, {}))
    },
  ],
  [
    // Triangle rectangle à côtés x, x + d inconnus
    () => retry(() => {
      const dd = randInt(1, 5), a = randInt(dd + 2, 20)
      if ((a * a - dd * dd) % (2 * dd) !== 0) return null
      const x = (a * a - dd * dd) / (2 * dd)
      if (x < 3 || x > 80) return null
      const [R, P, Q] = names3()
      return T('Le côté manquant', numeric(`Le triangle ${R}${P}${Q} est rectangle en ${R}. On sait que ${R}${P} = ${a} cm et que l'hypoténuse mesure ${dd} cm de plus que ${R}${Q}. Calcule ${R}${Q} (en cm).`, x, {
        explanation: `Avec ${R}${Q} = x : (x + ${dd})² = x² + ${a}², soit x² + ${2 * dd}x + ${dd * dd} = x² + ${a * a}, donc ${2 * dd}x = ${a * a - dd * dd} et x = ${x}.`,
      }), rightTri([R, P, Q], a, x, { sides: { RP: `${a} cm`, RQ: 'x', PQ: `x + ${dd}` } }))
    }),
    // Réciproque de Thalès : trouver la longueur qui rend les droites parallèles
    () => {
      const d = thalesData(), n = pick(THALES_NAMES)
      const ask = pick(['AN', 'NC'] as const)
      const v = ask === 'AN' ? d.AN : d.NC
      return T('Rendre les droites parallèles', numeric(`Les points ${n.A}, ${n.M}, ${n.B} sont alignés dans cet ordre, ainsi que ${n.A}, ${n.N}, ${n.C}. On a ${n.A}${n.M} = ${d.AM} cm, ${n.M}${n.B} = ${d.MB} cm et ${n.A}${n.C} = ${d.AC} cm. Quelle doit être la longueur ${ask === 'AN' ? `${n.A}${n.N}` : `${n.N}${n.C}`} (en cm) pour que (${n.M}${n.N}) soit parallèle à (${n.B}${n.C}) ?`, v, {
        explanation: `D'après la réciproque du théorème de Thalès, il faut ${frac(`${n.A}${n.N}`, `${n.A}${n.C}`)} = ${frac(`${n.A}${n.M}`, `${n.A}${n.B}`)} = ${frac(d.AM, d.AB)}, donc ${n.A}${n.N} = ${frac(`${d.AC} × ${d.AM}`, d.AB)} = ${d.AN}${ask === 'NC' ? ` et ${n.N}${n.C} = ${d.AC} − ${d.AN} = ${d.NC}` : ''} cm.`,
      }), (() => {
        const f = thalesFig(n, d, false, { AM: `${d.AM}`, MB: `${d.MB}`, AC: `${d.AC}`, [ask]: '?' } as Partial<Record<TK, string>>, ask)
        f.segments = f.segments?.map((s) => ({ ...s, mark: undefined }))
        return f
      })())
    },
    // tan connue → cos et sin
    () => {
      const [a, b, c] = pick(BASES), [R, P, Q] = names3()
      const ask = pick(['cos', 'sin'] as const)
      return T('De la tangente au cosinus', fraction(`Dans le triangle ${R}${P}${Q} rectangle en ${R}, tan ${hat(R, P, Q)} = ${frac(b, a)}. En posant ${R}${P} = ${a}k et ${R}${Q} = ${b}k, calcule la valeur exacte de ${ask} ${hat(R, P, Q)}.`, ask === 'cos' ? a : b, c, {
        explanation: `Pythagore : ${P}${Q}² = (${a}k)² + (${b}k)² = ${c * c}k², donc ${P}${Q} = ${c}k. Alors ${ask} ${hat(R, P, Q)} = ${ask === 'cos' ? frac(`${a}k`, `${c}k`) : frac(`${b}k`, `${c}k`)} = ${frac(ask === 'cos' ? a : b, c)}.`,
      }), rightTri([R, P, Q], a, b, { sides: { RP: `${a}k`, RQ: `${b}k` }, angle: { at: 'P' } }))
    },
  ],
  [
    // Hauteur d'une tour par deux visées
    () => retry(() => {
      const a1 = randInt(20, 35), a2 = randInt(a1 + 10, 65), d = randInt(15, 60)
      const h = d / (1 / Math.tan(rad(a1)) - 1 / Math.tan(rad(a2)))
      if (h > 150) return null
      const x = h / Math.tan(rad(a2))
      return T('Deux visées', approx(`On ne peut pas approcher le pied d'une tour. D'un point A, on voit son sommet sous un angle de ${a1}° ; en avançant de ${d} m vers la tour jusqu'au point B, on le voit sous un angle de ${a2}°. Quelle est la hauteur h de la tour, arrondie au dixième de mètre ? (Exprime les distances au pied en fonction de h.)`, h, 1,
        `Si H est le pied de la tour : AH = ${frac('h', `tan ${a1}°`)} et BH = ${frac('h', `tan ${a2}°`)}. Or AH − BH = ${d}, donc h × (${frac(1, `tan ${a1}°`)} − ${frac(1, `tan ${a2}°`)}) = ${d} et h ≈ ${fmt(rnd(h))} m.`),
      free({ A: [-(x + d), 0], B: [-x, 0], H: [0, 0], S: [0, h] }, {
        segments: [{ a: 'A', b: 'H' }, { a: 'H', b: 'S', label: 'h', color: RED }, { a: 'A', b: 'S', color: BLUE }, { a: 'B', b: 'S', color: BLUE }, { a: 'A', b: 'B', label: `${d} m`, color: 'transparent' }],
        angles: [{ vertex: 'A', a: 'H', b: 'S', label: `${a1}°`, radius: 34 }, { vertex: 'B', a: 'H', b: 'S', label: `${a2}°` }, { vertex: 'H', a: 'A', b: 'S', right: true }],
        away: { AB: 'S' },
      }))
    }),
    // Aire d'un polygone régulier
    () => {
      const nSides = pick([5, 6, 8, 10, 12]), r = randInt(3, 12)
      const A = (nSides / 2) * r * r * Math.sin(rad(360 / nSides))
      const name = { 5: 'pentagone', 6: 'hexagone', 8: 'octogone', 10: 'décagone', 12: 'dodécagone' }[nSides]
      const raw: Raw = { O: [0, 0] }
      for (let i = 0; i < nSides; i++) raw[`_${i}`] = [r * Math.cos(rad(90 + (360 * i) / nSides)), r * Math.sin(rad(90 + (360 * i) / nSides))]
      const segs: FigSegment[] = []
      for (let i = 0; i < nSides; i++) segs.push({ a: `_${i}`, b: `_${(i + 1) % nSides}` })
      segs.push({ a: 'O', b: '_0', label: `${r} cm` }, { a: 'O', b: '_1', dashed: true })
      return T('La rosace régulière', approx(`Un ${name} régulier est inscrit dans un cercle de centre O et de rayon ${r} cm. En le découpant en ${nSides} triangles isocèles de sommet O, calcule son aire, arrondie au dixième de cm².`, A, 1,
        `Chaque triangle a deux côtés de ${r} cm et un angle au sommet de 360° ÷ ${nSides} = ${fmt(r6(360 / nSides))}°. Son aire vaut ${frac(`${r} × ${r} × sin ${fmt(r6(360 / nSides))}°`, 2)} (hauteur ${r} × sin ${fmt(r6(360 / nSides))}°). Total : ${nSides} × ${frac(`${r * r} × sin ${fmt(r6(360 / nSides))}°`, 2)} ≈ ${fmt(rnd(A))} cm².`),
      free(raw, { segments: segs, angles: [{ vertex: 'O', a: '_0', b: '_1', label: `${fmt(r6(360 / nSides))}°` }], polygons: [{ pts: Object.keys(raw).filter((k) => k !== 'O'), fill: GOLD }] }))
    },
    // Diagonale d'un pavé : deux fois Pythagore
    () => retry(() => {
      const a = randInt(2, 9), b = randInt(1, 7), c = randInt(2, 8)
      const s = a * a + b * b + c * c, [k, m] = sqrtParts(s)
      if (m === 1 || k === 1) return null
      const ctx = pick([
        { t: 'La baguette dans le coffre', s: 'Un coffre a la forme d’un pavé droit ABCDEFGH', u: 'dm', q: 'la longueur de la plus longue baguette rectiligne que l’on peut y ranger, du coin A au coin G' },
        { t: 'Le rayon laser', s: 'Une salle a la forme d’un pavé droit ABCDEFGH', u: 'm', q: 'la longueur d’un rayon laser tendu du coin A au coin G' },
      ])
      const o = 0.6
      const raw: Raw = { A: [0, 0], B: [a, 0], C: [a + b * o, b * o], D: [b * o, b * o], E: [0, c], F: [a, c], G: [a + b * o, c + b * o], H: [b * o, c + b * o] }
      return T(ctx.t, radical(`${ctx.s}, avec AB = ${a} ${ctx.u}, BC = ${b} ${ctx.u} et AE = ${c} ${ctx.u}. Calcule ${ctx.q}, sous la forme a√b.`, k, m, {
        explanation: `ABC est rectangle en B : AC² = ${a * a} + ${b * b} = ${a * a + b * b}. ACG est rectangle en C : AG² = AC² + CG² = ${a * a + b * b} + ${c * c} = ${s}. Donc AG = √${s} = ${k}√${m} ${ctx.u}.`,
      }), free(raw, {
        segments: [
          { a: 'A', b: 'B', label: `${a}` }, { a: 'B', b: 'C', label: `${b}` }, { a: 'C', b: 'D', dashed: true }, { a: 'D', b: 'A', dashed: true },
          { a: 'E', b: 'F' }, { a: 'F', b: 'G' }, { a: 'G', b: 'H' }, { a: 'H', b: 'E' },
          { a: 'A', b: 'E', label: `${c}` }, { a: 'B', b: 'F' }, { a: 'C', b: 'G' }, { a: 'D', b: 'H', dashed: true },
          { a: 'A', b: 'C', dashed: true, color: BLUE }, { a: 'A', b: 'G', color: RED },
        ],
      }))
    }),
  ],
]

// ═════════════════════════════════════════════════════════════════════════
// Problèmes de l'hôtel de ville
// ═════════════════════════════════════════════════════════════════════════
const age: Ladder = [
  [
    // L'échelle du rempart
    () => retry(() => {
      const Lg = randInt(40, 90) / 10, d = randInt(10, 25) / 10, wall = randInt(30, 80) / 10
      const h = Math.sqrt(Lg * Lg - d * d)
      if (isDec(h, 2) || d > Lg / 2.5) return null
      const ok = h >= wall
      return T('L’échelle du rempart', approx(`Pour l'assaut, un soldat appuie une échelle de ${L(Lg, 'm')} contre le rempart vertical du château, en posant son pied sur le sol horizontal à ${L(d, 'm')} du mur. Le haut du rempart est à ${L(wall, 'm')}. À quelle hauteur arrive le haut de l'échelle (arrondie au centimètre, en m) ? ${ok ? 'Le soldat pourra-t-il atteindre le haut du mur ?' : 'Suffira-t-elle ?'}`, h, 2,
        `Le mur et le sol forment un angle droit, l'échelle est l'hypoténuse : h² = ${sq(Lg)} − ${sq(d)} = ${fmt(r6(Lg * Lg - d * d))}, donc h ≈ ${fmt(rnd(h, 2))} m. ${ok ? `C'est au moins ${fmt(wall)} m : l'échelle atteint le haut du rempart.` : `C'est moins que ${fmt(wall)} m : l'échelle est trop courte.`}`),
      free({ O: [0, 0], P: [d, 0], H: [0, h], _top: [0, Math.max(wall, h) * 1.05], _g: [d * 1.6, 0], _w: [-d * 1.2, 0] }, {
        labels: { O: '', P: '', H: '' },
        segments: [{ a: '_w', b: '_g' }, { a: 'O', b: '_top', color: GOLD }, { a: 'P', b: 'H', label: L(Lg, 'm'), color: RED }, { a: 'O', b: 'P', label: L(d, 'm') }],
        angles: [{ vertex: 'O', a: 'P', b: 'H', right: true }],
        notes: [{ at: [-d * 0.5, Math.max(wall, h) * 0.6], text: 'mur' }],
      }))
    }),
    // L'ombre du donjon
    () => retry(() => {
      const s = pick([1, 1.5, 2, 2.5]), a = pick([1.2, 1.5, 2, 2.4, 2.5, 3, 4]), m = randInt(3, 9)
      const b = r6(a * m), H = r6(s * m)
      if (!isDec(H, 1) || !isDec(b, 1)) return null
      const who = prenom()
      return T('L’ombre du donjon', numeric(`Pour mesurer la hauteur du donjon, ${who} plante verticalement un bâton de ${L(s, 'm')}. Au même moment, l'ombre du bâton mesure ${L(a, 'm')} et celle du donjon ${L(b, 'm')}, les deux ombres se terminant au même point. Les rayons du soleil sont parallèles. Quelle est la hauteur du donjon (en m) ?`, H, {
        explanation: `Le bâton et le donjon sont verticaux, donc parallèles : on a une configuration de Thalès de sommet le bout des ombres. ${frac('H', fmt(s))} = ${frac(fmt(b), fmt(a))}, donc H = ${fmt(s)} × ${frac(fmt(b), fmt(a))} = ${fmt(H)} m.`,
      }), free({ E: [0, 0], S0: [a, 0], S1: [a, s], T0: [b, 0], T1: [b, H], _d0: [0, -H * 0.22], _d1: [b, -H * 0.22] }, {
        labels: { E: '', S0: '', S1: '', T0: '', T1: '' },
        segments: [
          { a: 'E', b: 'T0' }, { a: 'S0', b: 'S1', label: L(s, 'm'), color: GOLD }, { a: 'T0', b: 'T1', label: '?', color: RED },
          { a: 'E', b: 'T1', dashed: true, color: GOLD }, { a: 'E', b: 'S0', label: L(a, 'm'), color: 'transparent' },
          { a: '_d0', b: '_d1', label: `ombre du donjon : ${L(b, 'm')}`, dashed: true },
        ],
        away: { ES0: 'S1', _d0_d1: 'T1' },
        margin: 30,
      }))
    }),
    // La rampe du pont-levis
    () => retry(() => {
      const h = randInt(5, 25) / 10, d = randInt(30, 120) / 10
      const t = deg(Math.atan(h / d))
      if (t < 8 || t > 30) return null
      const max = pick([15, 20])
      return T('La rampe du pont-levis', approx(`Le pont-levis abaissé forme une rampe qui monte de ${L(h, 'm')} sur une distance horizontale de ${L(d, 'm')}. Les chevaux de trait refusent les pentes de plus de ${max}°. Calcule l'angle de la rampe avec l'horizontale, arrondi au degré.`, t, 0,
        `tan α = ${frac(fmt(h), fmt(d))}, donc α ≈ ${fmt(rnd(t, 0))}°. ${t <= max ? `C'est moins de ${max}° : les chevaux passeront.` : `C'est plus de ${max}° : les chevaux refuseront.`}`),
      rightTri(['O', 'P', 'H'], d, h, { fixed: true, sides: { RP: L(d, 'm'), RQ: L(h, 'm') }, angle: { at: 'P', label: '?' }, labels: { O: '', P: '', H: '' } }))
    }),
  ],
  [
    // La tyrolienne
    () => retry(() => {
      const h1 = randInt(14, 30), h2 = randInt(3, h1 - 6), d = randInt(25, 60)
      const cable = Math.sqrt(d * d + (h1 - h2) ** 2)
      return T('La tyrolienne', approx(`Une tyrolienne relie le haut d'une tour de ${h1} m au haut d'un arbre de ${h2} m. Les pieds de la tour et de l'arbre sont sur un sol horizontal, à ${d} m l'un de l'autre. Le câble est tendu en ligne droite. Quelle est sa longueur, arrondie au dixième de mètre ?`, cable, 1,
        `On trace l'horizontale passant par le haut de l'arbre : on obtient un triangle rectangle de côtés ${d} m et ${h1} − ${h2} = ${h1 - h2} m. Pythagore : L² = ${d * d} + ${(h1 - h2) ** 2} = ${d * d + (h1 - h2) ** 2}, donc L ≈ ${fmt(rnd(cable))} m.`),
      free({ T0: [0, 0], T1: [0, h1], A0: [d, 0], A1: [d, h2], K: [0, h2] }, {
        labels: { T0: '', T1: '', A0: '', A1: '', K: '' },
        segments: [
          { a: 'T0', b: 'A0', label: `${d} m` }, { a: 'T0', b: 'T1', label: `${h1} m`, color: GOLD }, { a: 'A0', b: 'A1', label: `${h2} m`, color: GREEN },
          { a: 'T1', b: 'A1', color: RED, label: '?' }, { a: 'K', b: 'A1', dashed: true },
        ],
        angles: [{ vertex: 'K', a: 'A1', b: 'T1', right: true }],
        away: { T0A0: 'T1', T1A1: 'T0' },
      }))
    }),
    // La largeur de la rivière
    () => {
      const d = thalesData(30, [[1, 2], [2, 3], [2, 5], [3, 5]]), n = { A: 'O', M: 'M', N: 'N', B: 'B', C: 'C' }
      return T('La largeur de la rivière', numeric(`Pour mesurer la largeur BC d'une rivière sans la traverser, l'arpenteur repère deux arbres B et C sur la rive d'en face. De son côté, il plante des piquets O, M et N tels que M, O, B soient alignés, N, O, C alignés, et (MN) parallèle à la rive (BC). Il mesure OM = ${d.AM} m, OB = ${d.AB} m et MN = ${d.MN} m. Quelle est la distance BC entre les deux arbres (en m) ?`, d.BC, {
        explanation: `Configuration papillon de centre O avec (MN) // (BC). Thalès : ${frac('MN', 'BC')} = ${frac('OM', 'OB')} = ${frac(d.AM, d.AB)} (rapport ${fracText(d.AM, d.AB)}), donc BC = ${frac(`${d.MN} × ${d.AB}`, d.AM)} = ${d.BC} m.`,
      }), thalesFig(n, d, true, { AM: `${d.AM} m`, AB: `${d.AB} m`, MN: `${d.MN} m`, BC: '?' }, 'BC'))
    },
    // Le champ du meunier
    () => {
      const [a, b, c] = triple(40), k = pick([5, 10, 10, 20]), price = randInt(3, 9)
      const A = a * k, B = b * k, C = c * k
      const per = A + B + C
      return T('La clôture du champ', numeric(`Le meunier possède un champ en forme de triangle rectangle. Les deux côtés de l'angle droit longent deux chemins et mesurent ${A} m et ${B} m ; le troisième côté borde la rivière. Il veut clôturer tout le champ avec une barrière qui coûte ${price} écus le mètre. Combien va-t-il payer (en écus) ?`, per * price, {
        explanation: `Pythagore : le côté le long de la rivière mesure √(${A}² + ${B}²) = √${C * C} = ${C} m. Périmètre : ${A} + ${B} + ${C} = ${per} m. Coût : ${per} × ${price} = ${per * price} écus.`,
      }), free({ R: [0, 0], P: [A, 0], Q: [0, B] }, {
        labels: { R: '', P: '', Q: '' },
        segments: [{ a: 'R', b: 'P', label: `${A} m` }, { a: 'R', b: 'Q', label: `${B} m` }, { a: 'P', b: 'Q', color: BLUE, label: 'rivière' }],
        angles: [{ vertex: 'R', a: 'P', b: 'Q', right: true }],
        polygons: [{ pts: ['R', 'P', 'Q'], fill: GREEN }],
      }))
    },
    // Le cerf-volant
    () => {
      const t = randInt(30, 65), Lg = randInt(25, 80), e = randInt(10, 16) / 10
      const h = Lg * Math.sin(rad(t)) + e
      const who = prenom()
      return T('Le cerf-volant', approx(`${who} fait voler un cerf-volant. Le fil, bien tendu, mesure ${Lg} m et fait un angle de ${t}° avec l'horizontale ; la main qui le tient est à ${L(e, 'm')} du sol. À quelle altitude se trouve le cerf-volant, arrondie au dixième de mètre ?`, h, 1,
        `Au-dessus de la main : ${Lg} × sin ${t}° ≈ ${fmt(rnd(Lg * Math.sin(rad(t)), 2))} m. On ajoute ${fmt(e)} m : altitude ≈ ${fmt(rnd(h))} m.`),
      kiteFig(Lg, t, e))
    },
  ],
  [
    // Les deux bateaux
    () => retry(() => {
      const h = randInt(30, 90), a1 = randInt(30, 55), a2 = randInt(14, a1 - 10)
      const d1 = h / Math.tan(rad(a1)), d2 = h / Math.tan(rad(a2))
      return T('Les deux navires', approx(`Du haut d'un phare, à ${h} m au-dessus de la mer, la gardienne voit deux navires alignés avec le pied du phare. Elle les voit sous des angles de ${a1}° et de ${a2}° en dessous de l'horizontale. Quelle distance sépare les deux navires ? Arrondis au mètre.`, d2 - d1, 0,
        `Les angles sous l'horizontale se retrouvent au niveau de la mer (alternes-internes). Distance du pied au premier navire : ${frac(h, `tan ${a1}°`)} ≈ ${fmt(rnd(d1, 1))} m ; au second : ${frac(h, `tan ${a2}°`)} ≈ ${fmt(rnd(d2, 1))} m. Écart ≈ ${fmt(rnd(d2 - d1, 0))} m.`),
      free({ O: [0, 0], S: [0, h], P: [d1, 0], Q: [d2, 0], _h: [d2, h] }, {
        labels: { O: '', S: '', P: 'N₁', Q: 'N₂' },
        segments: [{ a: 'O', b: 'Q' }, { a: 'O', b: 'S', label: `${h} m`, color: GOLD }, { a: 'S', b: 'P', color: BLUE }, { a: 'S', b: 'Q', color: BLUE }, { a: 'S', b: '_h', dashed: true }],
        angles: [{ vertex: 'P', a: 'O', b: 'S', label: `${a1}°`, radius: 22 }, { vertex: 'Q', a: 'O', b: 'S', label: `${a2}°`, radius: 30 }, { vertex: 'O', a: 'P', b: 'S', right: true }],
        caption: 'Les angles sous l’horizontale se retrouvent au niveau de la mer (alternes-internes).',
      }))
    }),
    // Le toit de la grange
    () => {
      const span = randInt(6, 14), t = randInt(25, 45), depth = randInt(8, 20)
      const rafter = span / 2 / Math.cos(rad(t))
      const area = 2 * rafter * depth
      return T('Le toit de la grange', approx(`Le toit d'une grange a deux pans identiques. Vu de face, c'est un triangle isocèle de base ${span} m (la largeur de la grange), et chaque pan fait un angle de ${t}° avec l'horizontale. La grange mesure ${depth} m de long. Quelle surface de tuiles faut-il pour couvrir les deux pans ? Arrondis au m².`, area, 0,
        `La hauteur issue du faîte coupe la base en deux : demi-base ${fmt(span / 2)} m. Longueur d'un pan : ${frac(fmt(span / 2), `cos ${t}°`)} ≈ ${fmt(rnd(rafter, 2))} m. Chaque pan est un rectangle de ${fmt(rnd(rafter, 2))} m sur ${depth} m : surface ≈ 2 × ${fmt(rnd(rafter, 2))} × ${depth} ≈ ${fmt(rnd(area, 0))} m².`),
      isoFig(['F', 'G', 'D'], span / 2, (span / 2) * Math.tan(rad(t)), { base: `${span} m`, side: '?' }, { at: 'B', label: `${t}°` }))
    },
    // La tour inaccessible
    () => retry(() => {
      const a1 = randInt(20, 35), a2 = randInt(a1 + 10, 60), d = randInt(20, 60)
      const h = d / (1 / Math.tan(rad(a1)) - 1 / Math.tan(rad(a2)))
      if (h > 120) return null
      const x = h / Math.tan(rad(a2))
      return T('La tour de l’autre rive', approx(`Une tour se dresse de l'autre côté d'un fossé rempli d'eau. D'un point A, l'ingénieur voit le sommet sous un angle de ${a1}° avec l'horizontale ; il avance de ${d} m en direction de la tour jusqu'en B et le voit alors sous ${a2}°. Quelle est la hauteur de la tour, arrondie au dixième de mètre ?`, h, 1,
        `Avec H le pied de la tour et h sa hauteur : AH = ${frac('h', `tan ${a1}°`)} et BH = ${frac('h', `tan ${a2}°`)}. Comme AH − BH = ${d} : h = ${d} ÷ (${frac(1, `tan ${a1}°`)} − ${frac(1, `tan ${a2}°`)}) ≈ ${fmt(rnd(h))} m.`),
      free({ A: [-(x + d), 0], B: [-x, 0], H: [0, 0], S: [0, h] }, {
        segments: [{ a: 'A', b: 'H' }, { a: 'H', b: 'S', label: '?', color: RED }, { a: 'A', b: 'S', color: BLUE }, { a: 'B', b: 'S', color: BLUE }, { a: 'A', b: 'B', label: `${d} m`, color: 'transparent' }],
        angles: [{ vertex: 'A', a: 'H', b: 'S', label: `${a1}°`, radius: 34 }, { vertex: 'B', a: 'H', b: 'S', label: `${a2}°` }, { vertex: 'H', a: 'A', b: 'S', right: true }],
        away: { AB: 'S' },
      }))
    }),
    // La voile bicolore
    () => retry(() => {
      const [a, b] = triple(16, Math.random() < 0.4), [p, q] = pick([[1, 2], [2, 3], [1, 3], [3, 4], [2, 5], [3, 5], [4, 5]] as [number, number][])
      const h = Math.max(a, b), w = Math.min(a, b)
      const A = (h * w) / 2, small = (A * p * p) / (q * q)
      if (!isDec(small, 2)) return null
      const cut = r6((h * p) / q)
      if (r6(small) === cut || r6(small) === r6(A)) return null
      return T('La voile bicolore', numeric(`La voile d'un navire est un triangle ABC rectangle en A : le mât [AB] mesure ${fmt(h)} m et la bôme [AC] ${fmt(w)} m. On la coud en deux couleurs le long d'une couture [MN] parallèle à [BC], avec M sur le mât à ${fmt(cut)} m de A et N sur la bôme. Quelle est l'aire de la partie AMN (en m²) ?`, small, {
        explanation: `Aire de la voile : ${frac(`${fmt(h)} × ${fmt(w)}`, 2)} = ${fmt(A)} m². Thalès : AMN est une réduction de ABC de rapport ${frac('AM', 'AB')} = ${frac(fmt(cut), fmt(h))} = ${fracText(p, q)}, donc son aire vaut ${fmt(A)} × ${frac(p * p, q * q)} = ${fmt(small)} m².`,
      }), free({ A: [0, 0], B: [0, h], C: [w, 0], M: [0, cut], N: [(w * p) / q, 0] }, {
        segments: [
          { a: 'A', b: 'M', label: `${fmt(cut)} m` }, { a: 'M', b: 'B' }, { a: 'A', b: 'N' }, { a: 'N', b: 'C' }, { a: 'B', b: 'C', mark: 'arrow' }, { a: 'M', b: 'N', mark: 'arrow', color: RED },
          { a: 'A', b: 'B', color: 'transparent', label: `${fmt(h)} m` }, { a: 'A', b: 'C', color: 'transparent', label: `${fmt(w)} m` },
        ],
        angles: [{ vertex: 'A', a: 'C', b: 'B', right: true }],
        polygons: [{ pts: ['A', 'M', 'N'], fill: GOLD }, { pts: ['M', 'B', 'C', 'N'], fill: BLUE }],
        away: { AM: 'C', AB: 'C', AC: 'B' },
        pos: { M: 'e', N: 'ne', A: 'sw' },
      }))
    }),
  ],
]

export const CONTENT: SubjectContent | null = { tiers, upgrades, age }
