// Géométrie dans l’espace (Terminale) : vecteurs et coordonnées, colinéarité, coplanarité, positions relatives,
// produit scalaire (calcul, norme, angle, orthogonalité), projeté orthogonal, distance d’un point à un plan.
// Public adulte : palier 1 = rappel guidé, palier 3 = exercice standard de Terminale, palier 5 = exigeant.
// Les aides exportées (triplets, perspective cavalière…) servent aussi au sujet T-param.
import {
  F, choice, fmt, fracText, fraction, fresh, gcd, numeric, pair, par, parseNumber, pick, poly, radical, randInt, randNonZero,
  sameNumber, shuffle, solutionSet, term, variants, withMeta,
  type Exercise, type Ladder, type SubjectContent, type Tiers,
} from '../utils'
import { fitPoints, type FigSegment, type Figure, type LabelPos } from '../figure'
import { prenom } from '../contexts'

// ── Aides : vecteurs de l’espace ─────────────────────────────────────────
export type V3 = [number, number, number]
/** Triplet de coordonnées : (1 ; −2 ; 3). */
export const t3 = (v: V3) => `(${fmt(v[0])} ; ${fmt(v[1])} ; ${fmt(v[2])})`
export const add3 = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
export const sub3 = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
export const mul3 = (k: number, a: V3): V3 => [k * a[0], k * a[1], k * a[2]]
export const dot3 = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
export const cross3 = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
export const n2 = (a: V3) => dot3(a, a)
export const isZero3 = (a: V3) => a.every((c) => Math.abs(c) < 1e-9)
export const det3 = (a: V3, b: V3, c: V3) => dot3(cross3(a, b), c)
/** Point aléatoire à coordonnées entières dans [−k ; k]. */
export const rp = (k = 5): V3 => [randInt(-k, k), randInt(-k, k), randInt(-k, k)]
/** Vecteur non nul aléatoire. */
export const rnz = (k = 5): V3 => retry(() => { const v = rp(k); return isZero3(v) ? null : v })
/** Vecteur « réduit » : coordonnées entières premières entre elles. */
export const reduce3 = (v: V3): V3 => {
  const g = gcd(gcd(Math.abs(v[0]), Math.abs(v[1])), Math.abs(v[2])) || 1
  return [v[0] / g, v[1] / g, v[2] / g]
}
/** Somme de termes écrits, sans les termes vides : « a + b + c » (ou 0). */
export const sumOf = (terms: string[]) => terms.filter(Boolean).join(' + ') || '0'
/** Produit scalaire détaillé, sans les produits nuls : 2 × (−1) + (−3) × 4. */
export const dotTxt = (u: V3, v: V3) => sumOf([0, 1, 2].filter((i) => u[i] !== 0 && v[i] !== 0).map((i, k) => `${k === 0 ? fmt(u[i]) : par(u[i])} × ${par(v[i])}`))
/** « calcul = résultat » (seulement le résultat si tous les produits sont nuls). */
export const dotEq = (u: V3, v: V3) => (dotTxt(u, v) === '0' ? '0' : `${dotTxt(u, v)} = ${fmt(dot3(u, v))}`)
/** Somme de carrés détaillée : (−2)² + 3² + 6² (sans les carrés nuls). */
export const sqTxt = (u: V3) => sumOf(u.filter((c) => c !== 0).map((c) => `${par(c)}²`))
/** Fraction empilée n/d, suivie de sa forme réduite si elle se simplifie : {10/5} = 2. */
export const frac = (n: number, d: number) => {
  const raw = F(fmt(n), fmt(d)), g = gcd(Math.abs(n), Math.abs(d)) || 1
  if (g === 1 && Math.abs(d) !== 1) return raw
  const t = fracText(n, d)
  return `${raw} = ${t.includes('/') ? F(fmt(n / g), fmt(d / g)) : t}`
}
/** « a + b » (« a » si b = 0) et « a − b » (« a » si b = 0). */
export const plus = (a: number, b: number) => (b === 0 ? fmt(a) : `${fmt(a)} + ${par(b)}`)
export const minus = (a: number, b: number) => (b === 0 ? fmt(a) : `${fmt(a)} − ${par(b)}`)
/** Monôme, entre parenthèses s’il est négatif : 3m, m, (−2m). */
export const mono = (c: number, v: string) => (c < 0 ? `(${term(c, v, true)})` : term(c, v, true))
const diffTxt = (b: V3, a: V3) => `(${minus(b[0], a[0])} ; ${minus(b[1], a[1])} ; ${minus(b[2], a[2])})`
const sumTxt = (a: V3, b: V3) => `(${plus(a[0], b[0])} ; ${plus(a[1], b[1])} ; ${plus(a[2], b[2])})`
/** « A + t AB⃗ » avec le bon signe : A − 2AB⃗. */
const plusVec = (P: string, t: number, v: string) => `${P} ${t < 0 ? '−' : '+'} ${Math.abs(t) === 1 ? '' : fmt(Math.abs(t))}${v}`

/** Relance le tirage tant qu’il ne donne pas une configuration « propre ». */
export function retry<R>(gen: () => R | null | undefined | false, tries = 4000): R {
  for (let i = 0; i < tries; i++) {
    const r = gen()
    if (r) return r
  }
  throw new Error('tirage impossible')
}

/** √n écrit k√m (ou entier). */
export function rootParts(n: number): [number, number] {
  let k = 1, m = n
  for (let d = 2; d * d <= m; d++) while (m % (d * d) === 0) { m /= d * d; k *= d }
  return [k, m]
}
export const rootText = (n: number) => {
  const [k, m] = rootParts(n)
  return m === 1 ? fmt(k) : `${k === 1 ? '' : k}√${m}`
}
/** Réponse exacte √n : entier si n est un carré parfait, sinon a√b. */
export function exactRoot(prompt: string, n: number, explanation: string): Exercise {
  const [k, m] = rootParts(n)
  return m === 1 ? numeric(prompt, k, { explanation }) : radical(prompt, k, m, { explanation })
}

/** Lit « (1 ; −2 ; 3) », « 1;-2;3 », « (1, -2, 3) », « 1 −2 3 », « u⃗ = (…) », « H(…) ». */
export function parseTriplet(raw: string): V3 | null {
  let s = raw.trim().replace(/[−–—]/g, '-').replace(/⃗/g, '').replace(/[xyz]\s*=/gi, '')
  s = s.replace(/^[A-Za-z′']*\s*=?\s*/, '').trim()
  s = s.replace(/^[([{]\s*/, '').replace(/\s*[)\]}]$/, '').replace(/([;,(]\s*[+-])\s+/g, '$1').replace(/^([+-])\s+/, '$1')
  // séparateurs possibles : « ; », puis « , », puis espaces (on garde la première lecture valable)
  for (const parts of [s.split(';'), s.split(','), s.trim().split(/\s+/)]) {
    if (parts.length !== 3 || parts.some((p) => /\S\s+\S/.test(p.trim()))) continue
    const v = parts.map((p) => parseNumber(p))
    if (!v.some((x) => Number.isNaN(x))) return [v[0], v[1], v[2]]
  }
  return null
}

const TRIPLET_KEYS = ['(', ';', ')', '−', '/']
/** Réponse : triplet de coordonnées (point ou vecteur). */
export function triplet(prompt: string, v: V3, opts: { explanation: string; hint?: string }): Exercise {
  return {
    prompt, kind: 'input', answer: t3(v), explanation: opts.explanation,
    inputHint: opts.hint ?? 'Forme (x ; y ; z)',
    format: 'un triplet (x ; y ; z), par exemple (1 ; −2 ; 3)',
    keypad: TRIPLET_KEYS,
    isValid: (s) => parseTriplet(s) !== null,
    check: (s) => {
      const p = parseTriplet(s)
      return !!p && p.every((c, i) => sameNumber(c, v[i]))
    },
  }
}

/** Réponse : un vecteur non nul colinéaire à v (directeur ou normal) ; tout multiple non nul est accepté. */
export function direction(prompt: string, v: V3, opts: { explanation: string }): Exercise {
  const ok = (p: V3 | null) => !!p && !isZero3(p) && cross3(p, v).every((c) => Math.abs(c) < 1e-6 * Math.max(1, n2(p) * n2(v)))
  return {
    prompt, kind: 'input', answer: t3(v), explanation: opts.explanation,
    inputHint: 'Forme (a ; b ; c)',
    format: 'les coordonnées d’un vecteur (a ; b ; c), par exemple (1 ; −2 ; 3)',
    keypad: TRIPLET_KEYS,
    isValid: (s) => parseTriplet(s) !== null,
    diagnose: (s) => (parseTriplet(s) && isZero3(parseTriplet(s)!) ? 'Le vecteur nul ne convient pas : il ne donne aucune direction.' : undefined),
    check: (s) => ok(parseTriplet(s)),
  }
}

// ── Aides : figures en perspective cavalière ─────────────────────────────
export const RED = '#b8362f'
export const BLUE = '#5b8fc7'
export const GOLD = '#d9a441'
export const GREEN = '#6aa86a'
export const AXIS = '#9c8a6c'

export interface PerspOpts {
  labels?: Record<string, string>
  pos?: Record<string, LabelPos>
  hidden?: string[]
  caption?: string
  polygons?: { pts: string[]; fill: string }[]
  notes?: { at: V3; text: string }[]
  w?: number
  h?: number
  margin?: number
  /** Coefficient de fuite (défaut 0,5) et angle de fuite en degrés (défaut 35°). */
  k?: number
  deg?: number
}

/** Figure en perspective cavalière : x vers la droite, y en fuite (oblique), z vers le haut. */
export function persp(pts: Record<string, V3>, segments: FigSegment[], o: PerspOpts = {}): Figure {
  const k = o.k ?? 0.5, a = ((o.deg ?? 35) * Math.PI) / 180
  const proj = (p: V3): [number, number] => [p[0] + k * p[1] * Math.cos(a), p[2] + k * p[1] * Math.sin(a)]
  const raw: Record<string, [number, number]> = {}
  for (const [n, p] of Object.entries(pts)) raw[n] = proj(p)
  o.notes?.forEach((n, i) => { raw[`__n${i}`] = proj(n.at) })
  const w = o.w ?? 320, h = o.h ?? 220
  const fp = fitPoints(raw, w, h, o.margin ?? 30)
  const notes = o.notes?.map((n, i) => {
    const p = fp[`__n${i}`]
    delete fp[`__n${i}`]
    return { x: p.x, y: p.y + 5, text: n.text }
  })
  for (const [n, p] of Object.entries(fp)) {
    if (o.labels && n in o.labels) p.label = o.labels[n]
    if (o.pos?.[n]) p.pos = o.pos[n]
    if (n.startsWith('_') || o.hidden?.includes(n)) { p.hidden = true; p.label = '' }
  }
  const fig: Figure = { points: fp, segments, polygons: o.polygons, notes, caption: o.caption }
  if (o.w) fig.w = w
  if (o.h) fig.h = h
  return fig
}

/** Cube unité ABCDEFGH : ABCD en bas, E au-dessus de A… Repère naturel (A ; AB⃗, AD⃗, AE⃗). */
export const CUBE: Record<string, V3> = {
  A: [0, 0, 0], B: [1, 0, 0], C: [1, 1, 0], D: [0, 1, 0], E: [0, 0, 1], F: [1, 0, 1], G: [1, 1, 1], H: [0, 1, 1],
}
const VERTS = Object.keys(CUBE)
const EDGES: [string, string][] = [
  ['A', 'B'], ['B', 'C'], ['C', 'D'], ['D', 'A'], ['E', 'F'], ['F', 'G'], ['G', 'H'], ['H', 'E'],
  ['A', 'E'], ['B', 'F'], ['C', 'G'], ['D', 'H'],
]
/** Arêtes cachées : celles qui partent de D (sommet arrière, en bas à gauche). */
const BOX_SEGS: FigSegment[] = EDGES.map(([a, b]) => ({ a, b, dashed: a === 'D' || b === 'D' }))
const BOX_POS: Record<string, LabelPos> = { A: 'sw', B: 'se', C: 'e', D: 'nw', E: 'w', F: 'e', G: 'ne', H: 'nw' }

/** Pavé droit (ou cube) ABCDEFGH en perspective, avec points et segments supplémentaires. */
export function boxFig(dims: V3 = [1, 1, 1], o: PerspOpts & { extra?: Record<string, V3>; segs?: FigSegment[] } = {}): Figure {
  const pts: Record<string, V3> = {}
  for (const [n, p] of Object.entries(CUBE)) pts[n] = [p[0] * dims[0], p[1] * dims[1], p[2] * dims[2]]
  Object.assign(pts, o.extra)
  return persp(pts, [...BOX_SEGS, ...(o.segs ?? [])], { ...o, pos: { ...BOX_POS, ...o.pos } })
}
const cubeAt = (n: string, a = 1): V3 => mul3(a, CUBE[n])

/** Repère (O ; i⃗, j⃗, k⃗) en perspective, avec des points et leurs « pieds » (projetés sur le plan horizontal). */
export function axesFig(pts: Record<string, V3>, segs: FigSegment[] = [], o: PerspOpts & { R?: V3; feet?: boolean } = {}): Figure {
  const all = Object.values(pts)
  const R: V3 = o.R ?? [
    Math.max(2, ...all.map((p) => p[0])) + 1, Math.max(2, ...all.map((p) => p[1])) + 1, Math.max(2, ...all.map((p) => p[2])) + 1,
  ]
  const P: Record<string, V3> = { O: [0, 0, 0], _x: [R[0], 0, 0], _y: [0, R[1], 0], _z: [0, 0, R[2]], ...pts }
  const S: FigSegment[] = [
    { a: 'O', b: '_x', head: true, color: AXIS }, { a: 'O', b: '_y', head: true, color: AXIS }, { a: 'O', b: '_z', head: true, color: AXIS },
  ]
  if (o.feet !== false) {
    for (const [n, p] of Object.entries(pts)) {
      if (n.startsWith('_') || p[2] === 0) continue
      P[`_f${n}`] = [p[0], p[1], 0]
      S.push({ a: n, b: `_f${n}`, dashed: true, color: AXIS })
    }
  }
  return persp(P, [...S, ...segs], {
    ...o, pos: { O: 'sw', ...o.pos },
    notes: [{ at: [R[0] + 0.5, 0, -0.3], text: 'x' }, { at: [0, R[1] + 0.6, 0.2], text: 'y' }, { at: [0.35, 0, R[2] + 0.2], text: 'z' }, ...(o.notes ?? [])],
  })
}

/**
 * Schéma de principe : un plan (parallélogramme), des points posés dessus (coordonnées locales 0..1),
 * et éventuellement un point M au-dessus, relié à son projeté orthogonal H (angle droit).
 */
export function planeSketch(o: { on?: Record<string, [number, number]>; above?: string; foot?: string; name?: string; caption?: string; ray?: string; inLine?: boolean }): Figure {
  const loc = (p: [number, number]): [number, number] => [p[0] * 6 + p[1] * 2.4, p[1] * 2.6]
  const raw: Record<string, [number, number]> = { _p1: [0, 0], _p2: [6, 0], _p3: [8.4, 2.6], _p4: [2.4, 2.6] }
  for (const [n, p] of Object.entries(o.on ?? {})) raw[n] = loc(p)
  const segs: FigSegment[] = [{ a: '_p1', b: '_p2' }, { a: '_p2', b: '_p3' }, { a: '_p3', b: '_p4' }, { a: '_p4', b: '_p1' }]
  const angles: Figure['angles'] = []
  if (o.above) {
    const f = o.foot ?? 'H', H = loc([0.5, 0.45])
    raw[f] = H; raw[o.above] = [H[0], H[1] + 3.6]; raw._r = [H[0] + 1, H[1]]
    segs.push({ a: o.above, b: f, dashed: true, color: RED })
    angles.push({ vertex: f, a: o.above, b: '_r', right: true })
  }
  if (o.ray && raw[o.ray]) {
    raw._s = [raw[o.ray][0] - 2.6, raw[o.ray][1] + 3.4]
    segs.push({ a: '_s', b: o.ray, color: RED, head: true })
  }
  if (o.inLine) {
    raw._l1 = loc([0.12, 0.2]); raw._l2 = loc([0.88, 0.45])
    segs.push({ a: '_l1', b: '_l2', color: BLUE })
  }
  if (o.name) raw._name = loc([0.86, 0.82])
  const pts = fitPoints(raw, 320, 220, 30)
  for (const [n, p] of Object.entries(pts)) if (n.startsWith('_')) { p.hidden = true; p.label = '' }
  const notes = o.name ? [{ x: pts._name.x, y: pts._name.y, text: o.name }] : undefined
  if (o.above) { pts[o.above].pos = 'n'; pts[o.foot ?? 'H'].pos = 'sw' }
  return { points: pts, segments: segs, angles, polygons: [{ pts: ['_p1', '_p2', '_p3', '_p4'], fill: GOLD }], notes, caption: o.caption ?? 'Schéma de principe, pas à l’échelle.' }
}

// ── Banques de vecteurs ──────────────────────────────────────────────────
/** Vecteurs à norme entière (avant permutation et signes). */
const INT_VECS: V3[] = [
  [1, 2, 2], [2, 3, 6], [1, 4, 8], [4, 4, 7], [2, 6, 9], [6, 6, 7], [3, 4, 12], [2, 10, 11], [4, 8, 8], [2, 5, 14],
  [0, 3, 4], [0, 6, 8], [0, 5, 12], [3, 6, 6], [8, 9, 12], [0, 4, 3], [2, 4, 4],
]
/** Permutation des coordonnées et signes aléatoires. */
export function scramble(v: V3): V3 {
  const s = shuffle([0, 1, 2])
  return [v[s[0]], v[s[1]], v[s[2]]].map((c) => (Math.random() < 0.5 ? -c : c)) as V3
}
/** Vecteur de norme entière, coordonnées au plus `max` en valeur absolue. */
export const intNormVec = (max = 12): V3 => scramble(pick(INT_VECS.filter((v) => Math.max(...v) <= max)))
/** Petits vecteurs normaux « commodes » : norme entière. */
export const NICE_NORMALS: V3[] = [[1, 2, 2], [2, 1, 2], [2, 2, 1], [0, 3, 4], [3, 0, 4], [4, 3, 0], [2, 3, 6], [6, 2, 3], [1, 4, 8], [0, 0, 1], [0, 1, 0], [1, 0, 0]]
/** Vecteurs non nuls à petites coordonnées, orthogonaux à n. */
export function orthoTo(n: V3, k = 4): V3[] {
  const out: V3[] = []
  for (let x = -k; x <= k; x++) for (let y = -k; y <= k; y++) for (let z = -k; z <= k; z++) {
    const v: V3 = [x, y, z]
    if (!isZero3(v) && dot3(v, n) === 0) out.push(v)
  }
  return out
}
/** Deux vecteurs non colinéaires orthogonaux à n. */
export function planeBasis(n: V3, k = 4): [V3, V3] {
  const cand = orthoTo(n, k), u = pick(cand)
  for (let i = 0; i < 60; i++) {
    const v = pick(cand)
    if (!isZero3(cross3(u, v))) return [u, v]
  }
  return [u, reduce3(cross3(n, u))]
}

const REPS = [
  'Dans un repère orthonormé de l’espace,',
  'L’espace est muni d’un repère orthonormé (O ; i⃗, j⃗, k⃗) ;',
  'Dans l’espace rapporté à un repère orthonormé,',
]
const rep = () => pick(REPS)
const LETTERS = ['I', 'J', 'K', 'M', 'N', 'P']

/** Combinaison linéaire lisible : 2u⃗ − 3v⃗. */
const lc = (pairs: [number, string][]) => pairs.reduce((s, [c, v]) => s + (c === 0 ? '' : term(c, v, s === '')), '')

// ════════════════════════════════════════════════════════════════════════
// Palier 1 — rappels guidés
// ════════════════════════════════════════════════════════════════════════

// Coordonnées d’un vecteur, translation
const coordVec = variants(
  () => {
    const a = rp(), b = rp()
    return triplet(`${rep()} on donne A${t3(a)} et B${t3(b)}. Quelles sont les coordonnées du vecteur AB⃗ ?`, sub3(b, a), {
      explanation: `AB⃗(x_B − x_A ; y_B − y_A ; z_B − z_A) = ${diffTxt(b, a)} = ${t3(sub3(b, a))}.`,
    })
  },
  () => {
    const a = rp(), b = rp()
    return triplet(`On donne les points A${t3(a)} et B${t3(b)}. Quelles sont les coordonnées du vecteur BA⃗ ?`, sub3(a, b), {
      explanation: `BA⃗(x_A − x_B ; y_A − y_B ; z_A − z_B) = ${diffTxt(a, b)} = ${t3(sub3(a, b))}.`,
    })
  },
  () => {
    const a: V3 = [randInt(-8, 8), randInt(-8, 8), randInt(0, 6)], b: V3 = [randInt(-8, 8), randInt(-8, 8), randInt(0, 9)]
    return triplet(`Un drone décolle du point A${t3(a)} et se pose au point B${t3(b)} (unité : le mètre). Donne les coordonnées du vecteur de son déplacement.`, sub3(b, a), {
      explanation: `Le déplacement est le vecteur AB⃗ = ${diffTxt(b, a)} = ${t3(sub3(b, a))}.`,
    })
  },
  () => {
    const a = rp(), u = rnz()
    return triplet(`Le point B est l’image du point A${t3(a)} par la translation de vecteur u⃗${t3(u)}. Quelles sont les coordonnées de B ?`, add3(a, u), {
      explanation: `AB⃗ = u⃗, donc B = A + u⃗ : ${sumTxt(a, u)} = ${t3(add3(a, u))}.`,
    })
  },
  () => {
    const b = rp(), u = rnz()
    return triplet(`On sait que B${t3(b)} et que le vecteur AB⃗ a pour coordonnées ${t3(u)}. Quelles sont les coordonnées du point A ?`, sub3(b, u), {
      explanation: `x_B − x_A = ${fmt(u[0])} donne x_A = ${fmt(b[0])} − ${par(u[0])}, et de même pour y et z : A${t3(sub3(b, u))}.`,
    })
  },
)

// Milieu d’un segment
const midTxt = (a: V3, b: V3) => `(${F(plus(a[0], b[0]), 2)} ; ${F(plus(a[1], b[1]), 2)} ; ${F(plus(a[2], b[2]), 2)})`
const midpoint = variants(
  () => {
    const a = rp(6), b = rp(6), m = mul3(0.5, add3(a, b))
    return triplet(`${rep()} on donne A${t3(a)} et B${t3(b)}. Quelles sont les coordonnées du milieu I du segment [AB] ?`, m, {
      explanation: `I(${F('x_A + x_B', 2)} ; ${F('y_A + y_B', 2)} ; ${F('z_A + z_B', 2)}) = ${midTxt(a, b)} = ${t3(m)}.`,
    })
  },
  () => {
    const a = rp(6), b = rp(6), m = mul3(0.5, add3(a, b))
    return triplet(`Une sphère a pour diamètre le segment [AB], avec A${t3(a)} et B${t3(b)}. Quelles sont les coordonnées de son centre Ω ?`, m, {
      explanation: `Le centre est le milieu de [AB] : ${midTxt(a, b)} = ${t3(m)}.`,
    })
  },
  () => {
    const a = rp(5), i = rp(5), b = sub3(mul3(2, i), a)
    return triplet(`I${t3(i)} est le milieu du segment [AB], et A${t3(a)}. Quelles sont les coordonnées de B ?`, b, {
      explanation: `x_I = ${F('x_A + x_B', 2)} donne x_B = 2x_I − x_A = 2 × ${par(i[0])} − ${par(a[0])} = ${fmt(b[0])} ; de même y_B = ${fmt(b[1])} et z_B = ${fmt(b[2])}. B${t3(b)}.`,
    })
  },
  () => {
    const a = rp(6), c = rp(6), m = mul3(0.5, add3(a, c))
    return triplet(`ABCD est un parallélogramme de l’espace, avec A${t3(a)} et C${t3(c)}. Quelles sont les coordonnées de son centre K ?`, m, {
      explanation: `Les diagonales d’un parallélogramme se coupent en leur milieu : K est le milieu de [AC], ${midTxt(a, c)} = ${t3(m)}.`,
    })
  },
)

// Lecture de coordonnées dans un cube
const CUBE_REP = 'On se place dans le repère (A ; AB⃗, AD⃗, AE⃗).'
const FACES = [['A', 'B', 'C', 'D'], ['E', 'F', 'G', 'H'], ['A', 'B', 'F', 'E'], ['D', 'C', 'G', 'H'], ['A', 'D', 'H', 'E'], ['B', 'C', 'G', 'F']]
const cubeRead = variants(
  () => {
    const v = pick(VERTS.filter((n) => n !== 'A'))
    return withMeta(triplet(`ABCDEFGH est un cube. ${CUBE_REP} Quelles sont les coordonnées du sommet ${v} ?`, CUBE[v], {
      explanation: `On part de A et on suit AB⃗ (1re coordonnée), AD⃗ (2e), AE⃗ (3e) : ${v}${t3(CUBE[v])}.`,
    }), { figure: boxFig() })
  },
  () => {
    const [p, q] = pick(EDGES), L = pick(LETTERS), m = mul3(0.5, add3(CUBE[p], CUBE[q]))
    return withMeta(triplet(`ABCDEFGH est un cube et ${L} est le milieu de l’arête [${p}${q}]. ${CUBE_REP} Quelles sont les coordonnées de ${L} ?`, m, {
      explanation: `${p}${t3(CUBE[p])} et ${q}${t3(CUBE[q])} : le milieu a pour coordonnées les moyennes, ${L}${t3(m)}.`,
    }), { figure: boxFig([1, 1, 1], { extra: { [L]: m }, pos: { [L]: 'n' } }) })
  },
  () => {
    const f = pick(FACES), L = pick(LETTERS), m = mul3(0.25, f.map((n) => CUBE[n]).reduce(add3, [0, 0, 0] as V3))
    const name = f.join('')
    return withMeta(triplet(`ABCDEFGH est un cube et ${L} est le centre de la face ${name}. ${CUBE_REP} Quelles sont les coordonnées de ${L} ?`, m, {
      explanation: `${L} est le milieu de la diagonale [${f[0]}${f[2]}] de la face : ${f[0]}${t3(CUBE[f[0]])}, ${f[2]}${t3(CUBE[f[2]])}, donc ${L}${t3(m)}.`,
    }), { figure: boxFig([1, 1, 1], { extra: { [L]: m }, segs: [{ a: f[0], b: f[2], dashed: true, color: BLUE }], pos: { [L]: 'n' } }) })
  },
  () => {
    const [p, q] = shuffle(VERTS)
    const v = sub3(CUBE[q], CUBE[p])
    return withMeta(triplet(`ABCDEFGH est un cube. ${CUBE_REP} Quelles sont les coordonnées du vecteur ${p}${q}⃗ ?`, v, {
      explanation: `${p}${t3(CUBE[p])} et ${q}${t3(CUBE[q])} : ${p}${q}⃗ = ${diffTxt(CUBE[q], CUBE[p])} = ${t3(v)}.`,
    }), { figure: boxFig([1, 1, 1], { segs: [{ a: p, b: q, head: true, color: RED }] }) })
  },
  () => {
    const d: V3 = [randInt(2, 6), randInt(2, 5), randInt(2, 6)], v = pick(['C', 'F', 'G', 'H'])
    return withMeta(triplet(`ABCDEFGH est un pavé droit avec AB = ${d[0]}, AD = ${d[1]} et AE = ${d[2]}. On se place dans le repère orthonormé (A ; i⃗, j⃗, k⃗) où i⃗, j⃗ et k⃗ ont la direction et le sens de AB⃗, AD⃗ et AE⃗. Quelles sont les coordonnées de ${v} ?`, cubeAt(v).map((c, i) => c * d[i]) as V3, {
      explanation: `AB⃗ = ${d[0]}i⃗, AD⃗ = ${d[1]}j⃗, AE⃗ = ${d[2]}k⃗ ; on suit les arêtes depuis A : ${v}${t3(cubeAt(v).map((c, i) => c * d[i]) as V3)}.`,
    }), { figure: boxFig(d) })
  },
)

// Combinaisons linéaires
const combo = variants(
  () => {
    const u = rp(4), v = rp(4)
    const a = pick([-3, -2, 2, 3]), b = pick([-3, -2, -1, 1, 2, 3])
    const r = add3(mul3(a, u), mul3(b, v))
    return triplet(`u⃗${t3(u)} et v⃗${t3(v)}. Quelles sont les coordonnées du vecteur ${lc([[a, 'u⃗'], [b, 'v⃗']])} ?`, r, {
      explanation: `On calcule coordonnée par coordonnée : ${fmt(a)} × ${par(u[0])} + ${par(b)} × ${par(v[0])} = ${fmt(r[0])}, puis ${fmt(r[1])} et ${fmt(r[2])}. Résultat ${t3(r)}.`,
    })
  },
  () => {
    const u = rp(5), v = rp(5), w = rp(5), r = add3(sub3(u, v), w)
    return triplet(`u⃗${t3(u)}, v⃗${t3(v)} et w⃗${t3(w)}. Quelles sont les coordonnées de u⃗ − v⃗ + w⃗ ?`, r, {
      explanation: `On calcule coordonnée par coordonnée : ${[0, 1, 2].map((i) => `${['x', 'y', 'z'][i]} : ${minus(u[i], v[i])}${w[i] ? ` + ${par(w[i])}` : ''} = ${fmt(r[i])}`).join(' ; ')}. Résultat ${t3(r)}.`,
    })
  },
  () => {
    const u = rp(5), v = rp(5)
    return triplet(`u⃗${t3(u)} et v⃗${t3(v)}. Trouve les coordonnées du vecteur w⃗ tel que u⃗ + w⃗ = v⃗.`, sub3(v, u), {
      explanation: `w⃗ = v⃗ − u⃗ = ${diffTxt(v, u)} = ${t3(sub3(v, u))}.`,
    })
  },
  () => {
    const u = mul3(2, rp(4)), k = pick([-1, 1]) * 0.5, r = mul3(k, u)
    return triplet(`u⃗${t3(u)}. Quelles sont les coordonnées du vecteur ${k < 0 ? '−' : ''}${F(1, 2)}u⃗ ?`, r, {
      explanation: `On multiplie chaque coordonnée par ${k < 0 ? '−' : ''}${F(1, 2)} : ${t3(r)}.`,
    })
  },
)

// ════════════════════════════════════════════════════════════════════════
// Palier 2
// ════════════════════════════════════════════════════════════════════════

// Norme et distance
const normDist = fresh(variants(
  () => {
    const u = intNormVec()
    return numeric(`${rep()} calcule la norme du vecteur u⃗${t3(u)}.`, Math.sqrt(n2(u)), {
      explanation: `‖u⃗‖ = √{${sqTxt(u)}} = √{${n2(u)}} = ${Math.sqrt(n2(u))}.`,
    })
  },
  () => {
    const a = rp(4), u = intNormVec(), b = add3(a, u)
    return numeric(`${rep()} on donne A${t3(a)} et B${t3(b)}. Calcule la distance AB.`, Math.sqrt(n2(u)), {
      explanation: `AB⃗${t3(u)}, donc AB = √{${sqTxt(u)}} = √{${n2(u)}} = ${Math.sqrt(n2(u))}.`,
    })
  },
  () => {
    const a = rp(4), u = intNormVec(), b = add3(a, u)
    return numeric(`${rep()} la sphère de centre Ω${t3(a)} passe par le point M${t3(b)}. Quel est son rayon ?`, Math.sqrt(n2(u)), {
      explanation: `Le rayon est ΩM : ΩM⃗${t3(u)}, ΩM = √{${n2(u)}} = ${Math.sqrt(n2(u))}.`,
    })
  },
  () => {
    const a: V3 = [randInt(0, 5), randInt(0, 5), randInt(8, 15)], u = intNormVec(), b = add3(a, u)
    if (b[2] < 0) return normDistFallback(a, u)
    return numeric(`Une tyrolienne est tendue en ligne droite entre le point de départ A${t3(a)} et le point d’arrivée B${t3(b)} (repère orthonormé, unité : le mètre). Quelle est sa longueur ?`, Math.sqrt(n2(u)), {
      explanation: `AB⃗${t3(u)}, donc AB = √{${sqTxt(u)}} = √{${n2(u)}} = ${Math.sqrt(n2(u))} m.`,
    })
  },
  () => {
    const a = rp(4), b = rp(4), u = sub3(b, a)
    return numeric(`${rep()} on donne A${t3(a)} et B${t3(b)}. Calcule AB² (le carré de la distance AB).`, n2(u), {
      explanation: `AB⃗${t3(u)}, donc AB² = ${sqTxt(u)} = ${n2(u)}.`,
    })
  },
))
function normDistFallback(a: V3, u: V3): Exercise {
  const b = add3(a, u)
  return numeric(`${rep()} on donne A${t3(a)} et B${t3(b)}. Calcule la distance AB.`, Math.sqrt(n2(u)), {
    explanation: `AB⃗${t3(u)}, donc AB = √{${sqTxt(u)}} = √{${n2(u)}} = ${Math.sqrt(n2(u))}.`,
  })
}

// Produit scalaire en coordonnées
const dotCoord = variants(
  fresh(() => {
    const u = rp(5), v = rp(5)
    return numeric(`${rep()} calcule le produit scalaire u⃗ · v⃗, avec u⃗${t3(u)} et v⃗${t3(v)}.`, dot3(u, v), {
      explanation: `u⃗ · v⃗ = xx′ + yy′ + zz′ = ${dotEq(u, v)}.`,
    })
  }),
  fresh(() => {
    const a = rp(4), b = rp(4), c = rp(4), u = sub3(b, a), v = sub3(c, a)
    return numeric(`${rep()} on donne A${t3(a)}, B${t3(b)} et C${t3(c)}. Calcule AB⃗ · AC⃗.`, dot3(u, v), {
      explanation: `AB⃗${t3(u)} et AC⃗${t3(v)}, donc AB⃗ · AC⃗ = ${dotEq(u, v)}.`,
    })
  }),
  fresh(() => {
    const u = rp(4), v = rp(4), k = pick([-3, -2, 2, 3])
    return numeric(`u⃗${t3(u)} et v⃗${t3(v)} dans un repère orthonormé. Calcule (${fmt(k)}u⃗) · v⃗.`, k * dot3(u, v), {
      explanation: `u⃗ · v⃗ = ${dotEq(u, v)}, et (${fmt(k)}u⃗) · v⃗ = ${fmt(k)} × (u⃗ · v⃗) = ${fmt(k)} × ${par(dot3(u, v))} = ${fmt(k * dot3(u, v))}.`,
    })
  }),
  () => {
    const yes = Math.random() < 0.5
    const [u, v] = retry(() => {
      const u = rnz(4), v = rnz(4)
      return (dot3(u, v) === 0) === yes && !isZero3(cross3(u, v)) && u.filter((c) => c !== 0).length >= 2 ? [u, v] : null
    })
    return choice(`${rep()} les vecteurs u⃗${t3(u)} et v⃗${t3(v)} sont-ils orthogonaux ?`, yes ? 'Oui' : 'Non', [yes ? 'Non' : 'Oui'],
      `u⃗ · v⃗ = ${dotEq(u, v)}${yes ? ' : produit scalaire nul, les vecteurs sont orthogonaux.' : ' ≠ 0 : ils ne sont pas orthogonaux.'}`)
  },
)

// Colinéarité, points alignés
const colin = variants(
  fresh(() => {
    const u = retry(() => { const u = rp(4); return u.every((c) => c !== 0) ? u : null })
    const k = pick([-3, -2, 2, 3]), i = randInt(0, 2), v = mul3(k, u)
    const known = [0, 1, 2].filter((j) => j !== i)
    const vs = v.map((c, j) => (j === i ? 'm' : fmt(c))).join(' ; ')
    return numeric(`Pour quelle valeur du réel m les vecteurs u⃗${t3(u)} et v⃗(${vs}) sont-ils colinéaires ?`, v[i], {
      explanation: `Les coordonnées connues donnent ${fmt(v[known[0]])} = k × ${par(u[known[0]])}, donc v⃗ = ${fmt(k)}u⃗ (et ${fmt(v[known[1]])} = ${fmt(k)} × ${par(u[known[1]])} confirme). Alors m = ${fmt(k)} × ${par(u[i])} = ${fmt(v[i])}.`,
    })
  }),
  () => {
    const u = retry(() => { const u = mul3(2, rp(3)); return u.filter((c) => c !== 0).length >= 2 ? u : null })
    const [p, q] = pick([[1, 2], [-1, 2], [3, 2], [-3, 2], [2, 1], [-2, 1], [-3, 1], [3, 1]])
    const v = mul3(p / q, u)
    return fraction(`Le vecteur v⃗${t3(v)} est colinéaire à u⃗${t3(u)}. Trouve le réel k tel que v⃗ = k u⃗.`, p, q, {
      explanation: `On compare une coordonnée non nulle : k = ${F(fmt(v[u.findIndex((c) => c !== 0)]), par(u.find((c) => c !== 0)!))} = ${fmt(p / q)} (les autres coordonnées le confirment).`,
    })
  },
  fresh(() => {
    const [a, b, t] = retry(() => {
      const a = rp(4), b = rp(4), t = pick([-2, -1, 2, 3])
      return b[0] !== a[0] ? [a, b, t] as [V3, V3, number] : null
    })
    const c = add3(a, mul3(t, sub3(b, a)))
    return numeric(`On donne A${t3(a)}, B${t3(b)} et C(${fmt(c[0])} ; ${fmt(c[1])} ; z). Pour quelle valeur de z les points A, B et C sont-ils alignés ?`, c[2], {
      explanation: `AB⃗${t3(sub3(b, a))}. Si AC⃗ = t AB⃗, l’abscisse donne ${minus(c[0], a[0])} = t × ${par(b[0] - a[0])}, soit t = ${fmt(t)} (l’ordonnée le confirme). Alors z = ${fmt(a[2])} + ${par(t)} × ${par(b[2] - a[2])} = ${fmt(c[2])}.`,
    })
  }),
  () => {
    const yes = Math.random() < 0.5
    const a = rp(4), b = retry(() => { const b = rp(4); return isZero3(sub3(b, a)) ? null : b })
    const t = pick([-2, -1, 2, 3]), off = yes ? [0, 0, 0] : scramble([0, 0, randNonZero(-2, 2)])
    const c = add3(add3(a, mul3(t, sub3(b, a))), off as V3)
    const ab = sub3(b, a), ac = sub3(c, a)
    return choice(`Les points A${t3(a)}, B${t3(b)} et C${t3(c)} sont-ils alignés ?`, yes ? 'Oui' : 'Non', [yes ? 'Non' : 'Oui'],
      `AB⃗${t3(ab)} et AC⃗${t3(ac)}. ${yes ? `AC⃗ = ${fmt(t)}AB⃗ : vecteurs colinéaires, les points sont alignés.` : 'Aucun réel k ne vérifie AC⃗ = k AB⃗ sur les trois coordonnées à la fois : les points ne sont pas alignés.'}`)
  },
)

// Positions relatives dans le cube
type Kind = 'parallèles' | 'sécantes' | 'non coplanaires'
function lineKind(p: string, q: string, r: string, s: string): Kind | 'confondues' {
  const d1 = sub3(CUBE[q], CUBE[p]), d2 = sub3(CUBE[s], CUBE[r])
  if (isZero3(cross3(d1, d2))) return isZero3(cross3(d1, sub3(CUBE[r], CUBE[p]))) ? 'confondues' : 'parallèles'
  return Math.abs(det3(d1, d2, sub3(CUBE[r], CUBE[p]))) < 1e-9 ? 'sécantes' : 'non coplanaires'
}
const nameOf = (v: V3) => VERTS.find((n) => isZero3(sub3(CUBE[n], v)))
function interLines(p: string, q: string, r: string, s: string): V3 {
  const d1 = sub3(CUBE[q], CUBE[p]), d2 = sub3(CUBE[s], CUBE[r]), c = cross3(d1, d2)
  const t = dot3(cross3(sub3(CUBE[r], CUBE[p]), d2), c) / n2(c)
  return add3(CUBE[p], mul3(t, d1))
}
const linePair = () => { const s = shuffle(VERTS); return [s[0], s[1], s[2], s[3]] }
const cubeLines = (segs: FigSegment[]) => ({ figure: boxFig([1, 1, 1], { segs }) })
const positions = variants(
  ...(['parallèles', 'sécantes', 'non coplanaires'] as Kind[]).map((want) => () => {
    const [p, q, r, s] = retry(() => { const l = linePair(); return lineKind(l[0], l[1], l[2], l[3]) === want ? l : null })
    const d1 = sub3(CUBE[q], CUBE[p]), d2 = sub3(CUBE[s], CUBE[r])
    let expl: string
    if (want === 'parallèles') {
      const k = d2.find((c) => c !== 0)! / d1[d2.findIndex((c) => c !== 0)]
      expl = `Dans le repère (A ; AB⃗, AD⃗, AE⃗) : ${p}${q}⃗${t3(d1)} et ${r}${s}⃗${t3(d2)}, donc ${r}${s}⃗ = ${fmt(k)}${p}${q}⃗. Les vecteurs directeurs sont colinéaires : les droites sont parallèles (et distinctes).`
    } else if (want === 'sécantes') {
      const I = interLines(p, q, r, s), nm = nameOf(I)
      expl = `Les deux droites sont dans un même plan et ne sont pas parallèles : elles se coupent ${nm ? `en ${nm}` : `au point de coordonnées ${t3(I)} dans le repère (A ; AB⃗, AD⃗, AE⃗)`}.`
    } else {
      expl = `Dans le repère (A ; AB⃗, AD⃗, AE⃗) : ${p}${q}⃗${t3(d1)} et ${r}${s}⃗${t3(d2)} ne sont pas colinéaires (pas parallèles), et le système ${p} + t·${p}${q}⃗ = ${r} + t′·${r}${s}⃗ n’a pas de solution (pas de point commun) : aucun plan ne contient les deux droites.`
    }
    return withMeta(choice(`ABCDEFGH est un cube. Les droites (${p}${q}) et (${r}${s}) sont :`, want, (['parallèles', 'sécantes', 'non coplanaires'] as Kind[]).filter((k) => k !== want), expl),
      cubeLines([{ a: p, b: q, color: RED, extend: 16 }, { a: r, b: s, color: BLUE, extend: 16 }]))
  }),
  () => {
    const want = pick(['contenue dans le plan', 'strictement parallèle au plan', 'sécante au plan'])
    const [p, q, a, b, c] = retry(() => {
      const s = shuffle(VERTS), [p, q] = s, [a, b, c] = shuffle(VERTS)
      const n = cross3(sub3(CUBE[b], CUBE[a]), sub3(CUBE[c], CUBE[a]))
      if (isZero3(n)) return null
      const d = sub3(CUBE[q], CUBE[p])
      const k = dot3(d, n) !== 0 ? 'sécante au plan' : dot3(sub3(CUBE[p], CUBE[a]), n) === 0 ? 'contenue dans le plan' : 'strictement parallèle au plan'
      return k === want ? [p, q, a, b, c] : null
    })
    const n = reduce3(cross3(sub3(CUBE[b], CUBE[a]), sub3(CUBE[c], CUBE[a]))), d = sub3(CUBE[q], CUBE[p])
    const expl = `Dans le repère (A ; AB⃗, AD⃗, AE⃗), n⃗${t3(n)} est orthogonal à ${a}${b}⃗ et ${a}${c}⃗ : il est normal au plan (${a}${b}${c}). ${p}${q}⃗${t3(d)} et ${p}${q}⃗ · n⃗ = ${fmt(dot3(d, n))}. ` +
      (want === 'sécante au plan' ? 'Ce produit n’est pas nul : la droite coupe le plan en un point.'
        : `Produit nul : la droite est parallèle au plan ; ${p} ${want === 'contenue dans le plan' ? 'est' : 'n’est pas'} dans le plan, donc elle y est ${want === 'contenue dans le plan' ? 'contenue' : 'strictement parallèle'}.`)
    return withMeta(choice(`ABCDEFGH est un cube. Par rapport au plan (${a}${b}${c}), la droite (${p}${q}) est :`, want, ['contenue dans le plan', 'strictement parallèle au plan', 'sécante au plan'], expl),
      { figure: boxFig([1, 1, 1], { segs: [{ a: p, b: q, color: RED, extend: 16 }], polygons: [{ pts: [a, b, c], fill: GOLD }] }) })
  },
)

// ════════════════════════════════════════════════════════════════════════
// Palier 3 — exercices standard
// ════════════════════════════════════════════════════════════════════════

// Orthogonalité avec un paramètre
const orthoParam = fresh(variants(
  () => {
    const [u, v, i] = retry(() => {
      const u = rp(5), v = rp(5), i = randInt(0, 2)
      if (v[i] === 0) return null
      const rest = dot3(u, v) - u[i] * v[i]
      if (rest % v[i] !== 0) return null
      u[i] = -rest / v[i]
      return Math.abs(u[i]) <= 12 ? [u, v, i] as [V3, V3, number] : null
    })
    const us = u.map((c, j) => (j === i ? 'm' : fmt(c))).join(' ; ')
    const parts = [0, 1, 2].map((j) => (j === i ? mono(v[j], 'm') : u[j] * v[j] === 0 ? '' : `${par(u[j])} × ${par(v[j])}`))
    return numeric(`${rep()} pour quelle valeur de m les vecteurs u⃗(${us}) et v⃗${t3(v)} sont-ils orthogonaux ?`, u[i], {
      explanation: `u⃗ · v⃗ = ${sumOf(parts)} = 0 ⇔ ${term(v[i], 'm', true)} = ${fmt(-(dot3(u, v) - u[i] * v[i]))} ⇔ m = ${fmt(u[i])}.`,
    })
  },
  () => {
    const [a, b, c, i] = retry(() => {
      const a = rp(4), b = rp(4), c = rp(4), i = randInt(0, 2), u = sub3(b, a)
      if (u[i] === 0 || isZero3(u)) return null
      const v = sub3(c, a), rest = dot3(u, v) - u[i] * v[i]
      if (rest % u[i] !== 0) return null
      c[i] = a[i] - rest / u[i]
      return Math.abs(c[i]) <= 12 ? [a, b, c, i] as [V3, V3, V3, number] : null
    })
    const u = sub3(b, a), v = sub3(c, a)
    const cs = c.map((x, j) => (j === i ? 'm' : fmt(x))).join(' ; ')
    const mi = a[i] === 0 ? 'm' : `(m ${a[i] < 0 ? '+' : '−'} ${Math.abs(a[i])})`
    const rest = dot3(u, v) - u[i] * v[i]
    const terms = [0, 1, 2].map((j) => (j === i ? `${par(u[i])} × ${mi}` : u[j] * v[j] === 0 ? '' : `${par(u[j])} × ${par(v[j])}`))
    return numeric(`${rep()} on donne A${t3(a)}, B${t3(b)} et C(${cs}). Pour quelle valeur de m le triangle ABC est-il rectangle en A ?`, c[i], {
      explanation: `Il faut AB⃗ · AC⃗ = 0, avec AB⃗${t3(u)} et AC⃗(${v.map((x, j) => (j === i ? mi.replace(/[()]/g, '') : fmt(x))).join(' ; ')}). ${sumOf(terms)} = 0 ⇔ ${term(u[i], 'm', true)} = ${fmt(u[i] * a[i] - rest)} ⇔ m = ${fmt(c[i])}.`,
    })
  },
  () => {
    const [u, v, w, m] = retry(() => {
      const u = rp(4), v = rp(4), w = rp(4), vw = dot3(v, w), uw = dot3(u, w)
      if (vw === 0 || uw % vw !== 0 || uw === 0) return null
      return [u, v, w, -uw / vw] as [V3, V3, V3, number]
    })
    return numeric(`${rep()} u⃗${t3(u)}, v⃗${t3(v)} et w⃗${t3(w)}. Pour quel réel m le vecteur u⃗ + m v⃗ est-il orthogonal à w⃗ ?`, m, {
      explanation: `(u⃗ + m v⃗) · w⃗ = u⃗ · w⃗ + m (v⃗ · w⃗) = ${fmt(dot3(u, w))} + ${mono(dot3(v, w), 'm')} = 0, donc m = ${fmt(m)}.`,
    })
  },
))

// Angle par le produit scalaire
const NICE_PAIRS: [V3, V3][] = [
  [[1, 1, 0], [0, 1, 1]], [[1, 1, 0], [0, -1, 1]], [[1, 0, 0], [1, 1, 0]], [[1, 0, 0], [-1, 1, 0]],
  [[1, 0, 1], [1, 1, 0]], [[1, -1, 0], [0, 1, -1]], [[1, 0, 1], [0, 0, 1]], [[1, 2, 2], [2, -2, 1]],
  [[2, 1, 2], [0, 0, 3]], [[1, 1, 0], [2, 0, 0]],
]
function anglePair(): [V3, V3, number] {
  return retry(() => {
    const [u0, v0] = pick(NICE_PAIRS), s = shuffle([0, 1, 2]), sg = [0, 1, 2].map(() => (Math.random() < 0.5 ? -1 : 1))
    const f = (w: V3): V3 => [sg[0] * w[s[0]], sg[1] * w[s[1]], sg[2] * w[s[2]]]
    const u = mul3(randInt(1, 3), f(u0)), v = mul3(randInt(1, 3), f(v0))
    const cos = dot3(u, v) / Math.sqrt(n2(u) * n2(v))
    const deg = Math.round((Math.acos(Math.max(-1, Math.min(1, cos))) * 180) / Math.PI)
    return [45, 60, 90, 120, 135].includes(deg) ? [u, v, deg] : null
  })
}
const COS_TXT: Record<number, string> = { 45: `${F('√2', 2)}`, 60: F(1, 2), 90: '0', 120: `−${F(1, 2)}`, 135: `−${F('√2', 2)}` }
const angleNice = fresh(variants(
  () => {
    const [u, v, deg] = anglePair()
    return numeric(`${rep()} u⃗${t3(u)} et v⃗${t3(v)}. Quelle est la mesure en degrés de l’angle entre u⃗ et v⃗ ?`, deg, {
      explanation: `cos θ = ${F('u⃗ · v⃗', '‖u⃗‖ × ‖v⃗‖')} = ${F(fmt(dot3(u, v)), `${rootText(n2(u))} × ${rootText(n2(v))}`)} = ${COS_TXT[deg]}, donc θ = ${deg}°.`,
    })
  },
  () => {
    const [u, v, deg] = anglePair(), a = rp(3), b = add3(a, u), c = add3(a, v)
    return numeric(`${rep()} on donne A${t3(a)}, B${t3(b)} et C${t3(c)}. Quelle est la mesure en degrés de l’angle géométrique BAC ?`, deg, {
      explanation: `AB⃗${t3(u)}, AC⃗${t3(v)}. cos(BAC) = ${F('AB⃗ · AC⃗', 'AB × AC')} = ${F(fmt(dot3(u, v)), `${rootText(n2(u))} × ${rootText(n2(v))}`)} = ${COS_TXT[deg]}, donc l’angle mesure ${deg}°.`,
    })
  },
  () => {
    const [u, v, deg] = retry(() => { const r = anglePair(); return r[2] === 60 || r[2] === 120 || r[2] === 90 ? r : null })
    const c = dot3(u, v) / Math.sqrt(n2(u) * n2(v))
    return fraction(`${rep()} u⃗${t3(u)} et v⃗${t3(v)}. Calcule le cosinus de l’angle entre u⃗ et v⃗.`, Math.round(c * 2), 2, {
      explanation: `cos θ = ${F('u⃗ · v⃗', '‖u⃗‖ × ‖v⃗‖')} = ${F(fmt(dot3(u, v)), `${rootText(n2(u))} × ${rootText(n2(v))}`)} = ${COS_TXT[deg]}.`,
    })
  },
  () => {
    const [p, q, r, deg] = retry(() => {
      const [p, q, r] = shuffle(VERTS)
      const u = sub3(CUBE[q], CUBE[p]), v = sub3(CUBE[r], CUBE[p])
      const cos = dot3(u, v) / Math.sqrt(n2(u) * n2(v))
      const deg = Math.round((Math.acos(cos) * 180) / Math.PI)
      return [45, 60, 90].includes(deg) && Math.abs(Math.cos((deg * Math.PI) / 180) - cos) < 1e-9 && (deg !== 90 || Math.random() < 0.3) ? [p, q, r, deg] as [string, string, string, number] : null
    })
    const u = sub3(CUBE[q], CUBE[p]), v = sub3(CUBE[r], CUBE[p])
    return withMeta(numeric(`ABCDEFGH est un cube. Quelle est la mesure en degrés de l’angle entre les vecteurs ${p}${q}⃗ et ${p}${r}⃗ ?`, deg, {
      explanation: `Dans le repère (A ; AB⃗, AD⃗, AE⃗) : ${p}${q}⃗${t3(u)}, ${p}${r}⃗${t3(v)}. cos θ = ${F(fmt(dot3(u, v)), `${rootText(n2(u))} × ${rootText(n2(v))}`)} = ${COS_TXT[deg]}, donc θ = ${deg}°.`,
    }), cubeLines([{ a: p, b: q, color: RED, head: true }, { a: p, b: r, color: BLUE, head: true }]))
  },
))

// Produit scalaire dans un cube ou un pavé
function boxDot(dims: V3) {
  return retry(() => {
    const [p, q, r, s] = linePair()
    const P = (n: string) => CUBE[n].map((c, i) => c * dims[i]) as V3
    const u = sub3(P(q), P(p)), v = sub3(P(s), P(r))
    return [p, q, r, s, u, v, dot3(u, v)] as [string, string, string, string, V3, V3, number]
  })
}
const dotBox = fresh(variants(
  () => {
    const a = randInt(1, 6), [p, q, r, s, u, v, d] = boxDot([a, a, a])
    return withMeta(numeric(`ABCDEFGH est un cube d’arête ${a}. Calcule le produit scalaire ${p}${q}⃗ · ${r}${s}⃗.`, d, {
      explanation: `Repère orthonormé d’origine A, axes portés par (AB), (AD), (AE), unité 1 : ${p}${q}⃗${t3(u)}, ${r}${s}⃗${t3(v)}, donc ${p}${q}⃗ · ${r}${s}⃗ = ${dotEq(u, v)}.`,
    }), cubeLines([{ a: p, b: q, color: RED, head: true }, { a: r, b: s, color: BLUE, head: true }]))
  },
  () => {
    const dims: V3 = [randInt(2, 6), randInt(1, 4), randInt(2, 5)], [p, q, r, s, u, v, d] = boxDot(dims)
    return withMeta(numeric(`ABCDEFGH est un pavé droit avec AB = ${dims[0]}, AD = ${dims[1]} et AE = ${dims[2]}. Calcule ${p}${q}⃗ · ${r}${s}⃗.`, d, {
      explanation: `Dans le repère orthonormé d’origine A dont les axes portent [AB], [AD], [AE] : ${p}${q}⃗${t3(u)}, ${r}${s}⃗${t3(v)}, donc le produit vaut ${dotEq(u, v)}.`,
    }), { figure: boxFig(dims, { segs: [{ a: p, b: q, color: RED, head: true }, { a: r, b: s, color: BLUE, head: true }] }) })
  },
  () => {
    const a = randInt(2, 6), [p, q, r] = retry(() => { const [p, q, r] = shuffle(VERTS); return p !== q ? [p, q, r] : null })
    const u = mul3(a, sub3(CUBE[q], CUBE[p])), v = mul3(a, sub3(CUBE[r], CUBE[p]))
    return withMeta(numeric(`ABCDEFGH est un cube d’arête ${a}. Calcule ${p}${q}⃗ · ${p}${r}⃗.`, dot3(u, v), {
      explanation: `Avec le repère orthonormé d’origine A et d’axes (AB), (AD), (AE) : ${p}${q}⃗${t3(u)}, ${p}${r}⃗${t3(v)}, produit ${dotEq(u, v)}.`,
    }), cubeLines([{ a: p, b: q, color: RED, head: true }, { a: p, b: r, color: BLUE, head: true }]))
  },
))

// Décomposition, coplanarité de vecteurs
function decomp(): [V3, V3, number, number] {
  return retry(() => {
    const u = rp(3), v = rp(3), a = randNonZero(-3, 3), b = randNonZero(-3, 3)
    return !isZero3(cross3(u, v)) && u[0] * v[1] - u[1] * v[0] !== 0 ? [u, v, a, b] : null
  })
}
const coplan = variants(
  () => {
    const [u, v, a, b] = decomp(), w = add3(mul3(a, u), mul3(b, v))
    return pair(`u⃗${t3(u)}, v⃗${t3(v)} et w⃗${t3(w)}. Trouve les réels a et b tels que w⃗ = a u⃗ + b v⃗ (réponse (a ; b)).`, a, b, {
      explanation: `Les deux premières coordonnées donnent le système ${poly([u[0], 'a'], [v[0], 'b'])} = ${fmt(w[0])} et ${poly([u[1], 'a'], [v[1], 'b'])} = ${fmt(w[1])}, de solution a = ${fmt(a)}, b = ${fmt(b)} ; la 3e coordonnée vérifie : ${sumOf([u[2] ? `${fmt(a)} × ${par(u[2])}` : '', v[2] ? `${par(b)} × ${par(v[2])}` : ''])} = ${fmt(w[2])}.`,
    })
  },
  () => {
    const [u, v, a, b] = decomp(), A = rp(3), B = add3(A, u), C = add3(A, v), D = add3(A, add3(mul3(a, u), mul3(b, v)))
    return pair(`On donne A${t3(A)}, B${t3(B)}, C${t3(C)} et D${t3(D)}. Trouve les réels a et b tels que AD⃗ = a AB⃗ + b AC⃗ (réponse (a ; b)).`, a, b, {
      explanation: `AB⃗${t3(u)}, AC⃗${t3(v)}, AD⃗${t3(sub3(D, A))}. Les abscisses et ordonnées donnent a = ${fmt(a)} et b = ${fmt(b)}, et la cote le confirme : les quatre points sont coplanaires.`,
    })
  },
  fresh(() => {
    const [u, v, a, b] = decomp(), w = add3(mul3(a, u), mul3(b, v))
    return numeric(`u⃗${t3(u)}, v⃗${t3(v)} et w⃗(${fmt(w[0])} ; ${fmt(w[1])} ; z). Pour quelle valeur de z les trois vecteurs sont-ils coplanaires ?`, w[2], {
      explanation: `On cherche w⃗ = a u⃗ + b v⃗. Les deux premières coordonnées donnent a = ${fmt(a)} et b = ${fmt(b)} ; alors z = ${sumOf([u[2] ? `${fmt(a)} × ${par(u[2])}` : '', v[2] ? `${par(b)} × ${par(v[2])}` : ''])} = ${fmt(w[2])}.`,
    })
  }),
)

// ════════════════════════════════════════════════════════════════════════
// Palier 4
// ════════════════════════════════════════════════════════════════════════

// Vecteur normal à un plan
function normalSetup(): { n: V3; u: V3; v: V3; i: number } {
  return retry(() => {
    const n = rnz(3)
    const i = randInt(0, 2)
    if (n[i] === 0) return null
    const [u, v] = planeBasis(n, 3)
    const j = [0, 1, 2].filter((k) => k !== i)
    if (u[j[0]] * v[j[1]] - u[j[1]] * v[j[0]] === 0) return null
    return { n, u, v, i }
  })
}
const normalVec = variants(
  () => {
    const { n, u, v, i } = normalSetup()
    const ns = n.map((c, k) => (k === i ? fmt(c) : ['a', 'b', 'c'][k])).join(' ; ')
    const unk = ['a', 'b', 'c'].filter((_, k) => k !== i).join(' et ')
    return triplet(`${rep()} u⃗${t3(u)} et v⃗${t3(v)}. Trouve ${unk} pour que le vecteur n⃗(${ns}) soit orthogonal à u⃗ et à v⃗ ; donne n⃗.`, n, {
      explanation: `n⃗ · u⃗ = 0 et n⃗ · v⃗ = 0 forment un système de deux équations à deux inconnues ; on trouve n⃗${t3(n)}. Vérification : ${dotTxt(n, u)} = 0 et ${dotTxt(n, v)} = 0.`,
    })
  },
  () => {
    const { n, u, v, i } = normalSetup(), A = rp(3), B = add3(A, u), C = add3(A, v)
    const ns = n.map((c, k) => (k === i ? fmt(c) : ['a', 'b', 'c'][k])).join(' ; ')
    return triplet(`${rep()} on donne A${t3(A)}, B${t3(B)} et C${t3(C)}. Le vecteur n⃗(${ns}) est normal au plan (ABC). Donne ses coordonnées.`, n, {
      explanation: `n⃗ est normal à (ABC) s’il est orthogonal à AB⃗${t3(u)} et AC⃗${t3(v)} : n⃗ · AB⃗ = 0 et n⃗ · AC⃗ = 0 donnent n⃗${t3(n)}.`,
    })
  },
  () => {
    const { n, u, v } = normalSetup(), A = rp(3), B = add3(A, u), C = add3(A, v), r = reduce3(n)
    return direction(`${rep()} on donne A${t3(A)}, B${t3(B)} et C${t3(C)}. Donne un vecteur normal au plan (ABC).`, r, {
      explanation: `On cherche n⃗(a ; b ; c) avec n⃗ · AB⃗ = 0 et n⃗ · AC⃗ = 0, où AB⃗${t3(u)} et AC⃗${t3(v)}. En fixant une coordonnée, on trouve par exemple n⃗${t3(r)} (tout vecteur non nul colinéaire convient).`,
    })
  },
)

// Distance d’un point à un plan (point et vecteur normal donnés)
const distPlane = variants(
  () => {
    const n = scramble(pick(NICE_NORMALS)), N = Math.sqrt(n2(n)), A = rp(4), w = retry(() => { const w = rp(4); return dot3(w, n) ? w : null }), M = add3(A, w), d = Math.abs(dot3(w, n))
    return fraction(`${rep()} le plan P passe par A${t3(A)} et a pour vecteur normal n⃗${t3(n)}. Quelle est la distance du point M${t3(M)} au plan P ?`, d, N, {
      explanation: `d = ${F('|AM⃗ · n⃗|', '‖n⃗‖')}. AM⃗${t3(w)}, AM⃗ · n⃗ = ${dotEq(w, n)} et ‖n⃗‖ = ${fmt(N)}, donc d = ${frac(d, N)}.`,
    })
  },
  () => {
    const n = scramble(pick(NICE_NORMALS)), N = Math.sqrt(n2(n)), A = retry(() => { const A = rp(5); return dot3(A, n) ? A : null }), d = Math.abs(dot3(A, n))
    return fraction(`${rep()} quelle est la distance de l’origine O au plan passant par A${t3(A)} et de vecteur normal n⃗${t3(n)} ?`, d, N, {
      explanation: `d = ${F('|AO⃗ · n⃗|', '‖n⃗‖')} ; AO⃗${t3(mul3(-1, A))}, AO⃗ · n⃗ = ${fmt(-dot3(A, n))}, ‖n⃗‖ = ${fmt(N)}, donc d = ${frac(d, N)}.`,
    })
  },
  () => {
    const n = scramble(pick(NICE_NORMALS.slice(0, 9))), N = Math.sqrt(n2(n)), A: V3 = [randInt(0, 6), randInt(0, 6), randInt(4, 8)]
    const w: V3 = retry(() => { const w: V3 = [randInt(-3, 3), randInt(-3, 3), randInt(3, 8)]; return dot3(w, n) ? w : null }), M = add3(A, w), d = Math.abs(dot3(w, n))
    return fraction(`Un drone vole au point M${t3(M)}. Le pan d’un toit est modélisé par le plan passant par A${t3(A)} de vecteur normal n⃗${t3(n)} (repère orthonormé, unité : le mètre). À quelle distance du toit est le drone ?`, d, N, {
      explanation: `d = ${F('|AM⃗ · n⃗|', '‖n⃗‖')} avec AM⃗${t3(w)} : AM⃗ · n⃗ = ${fmt(dot3(w, n))}, ‖n⃗‖ = ${fmt(N)}, donc d = ${frac(d, N)} m.`,
    })
  },
)

// Produit scalaire, normes et angles (formules)
const normFormulas = fresh(variants(
  () => {
    const a = randInt(2, 9), b = randInt(1, 5) * 2, deg = pick([60, 120])
    const v = (a * b) / 2 * (deg === 60 ? 1 : -1)
    return numeric(`‖u⃗‖ = ${a}, ‖v⃗‖ = ${b} et l’angle entre u⃗ et v⃗ mesure ${deg}°. Calcule u⃗ · v⃗.`, v, {
      explanation: `u⃗ · v⃗ = ‖u⃗‖ × ‖v⃗‖ × cos θ = ${a} × ${b} × ${deg === 60 ? F(1, 2) : `(−${F(1, 2)})`} = ${fmt(v)}.`,
    })
  },
  () => {
    const a = randInt(2, 8), b = randInt(2, 8), p = randInt(-Math.min(12, a * b - 1), Math.min(12, a * b - 1))
    return numeric(`‖u⃗‖ = ${a}, ‖v⃗‖ = ${b} et u⃗ · v⃗ = ${fmt(p)}. Calcule ‖u⃗ + v⃗‖².`, a * a + 2 * p + b * b, {
      explanation: `‖u⃗ + v⃗‖² = ‖u⃗‖² + 2 u⃗ · v⃗ + ‖v⃗‖² = ${a * a} + 2 × ${par(p)} + ${b * b} = ${fmt(a * a + 2 * p + b * b)}.`,
    })
  },
  () => {
    const a = randInt(2, 8), b = randInt(2, 8), p = randInt(-Math.min(10, a * b - 1), Math.min(10, a * b - 1)), s = a * a + 2 * p + b * b
    return numeric(`On sait que ‖u⃗‖ = ${a}, ‖v⃗‖ = ${b} et ‖u⃗ + v⃗‖² = ${s}. Calcule u⃗ · v⃗.`, p, {
      explanation: `‖u⃗ + v⃗‖² = ‖u⃗‖² + 2 u⃗ · v⃗ + ‖v⃗‖², donc u⃗ · v⃗ = ${F(`${s} − ${a * a} − ${b * b}`, 2)} = ${fmt(p)}.`,
    })
  },
  () => {
    const a = randInt(2, 8), b = randInt(1, 4) * 2
    const r = a * a + b * b - a * b
    return numeric(`‖u⃗‖ = ${a}, ‖v⃗‖ = ${b} et l’angle entre u⃗ et v⃗ mesure 60°. Calcule ‖u⃗ − v⃗‖².`, r, {
      explanation: `u⃗ · v⃗ = ${a} × ${b} × ${F(1, 2)} = ${fmt((a * b) / 2)} ; ‖u⃗ − v⃗‖² = ‖u⃗‖² − 2 u⃗ · v⃗ + ‖v⃗‖² = ${a * a} − ${fmt(a * b)} + ${b * b} = ${fmt(r)}.`,
    })
  },
))

// Point d’un plan (ABC) : coplanarité de quatre points
const coplanPts = variants(
  fresh(() => {
    const [u, v, s, t] = decomp(), A = rp(3), B = add3(A, u), C = add3(A, v), D = add3(A, add3(mul3(s, u), mul3(t, v)))
    const n = reduce3(cross3(u, v))
    if (n[2] === 0) return coplanZ(A, B, C, D, u, v, s, t)
    return numeric(`${rep()} on donne A${t3(A)}, B${t3(B)}, C${t3(C)}, et n⃗${t3(n)} est normal au plan (ABC). Pour quelle valeur de z le point D(${fmt(D[0])} ; ${fmt(D[1])} ; z) appartient-il au plan (ABC) ?`, D[2], {
      explanation: `D ∈ (ABC) ⇔ AD⃗ · n⃗ = 0 ⇔ ${sumOf([n[0] * (D[0] - A[0]) ? `${par(n[0])} × ${par(D[0] - A[0])}` : '', n[1] * (D[1] - A[1]) ? `${par(n[1])} × ${par(D[1] - A[1])}` : '', `${par(n[2])}(${A[2] === 0 ? 'z' : `z ${A[2] < 0 ? '+' : '−'} ${Math.abs(A[2])}`})`])} = 0 ⇔ z = ${fmt(D[2])}.`,
    })
  }),
  fresh(() => {
    const [u, v, s, t] = decomp(), A = rp(3), B = add3(A, u), C = add3(A, v), D = add3(A, add3(mul3(s, u), mul3(t, v)))
    return coplanZ(A, B, C, D, u, v, s, t)
  }),
  () => {
    const yes = Math.random() < 0.5
    const [u, v, s, t] = decomp(), A = rp(3), B = add3(A, u), C = add3(A, v)
    const D = add3(add3(A, add3(mul3(s, u), mul3(t, v))), yes ? [0, 0, 0] : [0, 0, randNonZero(-2, 2)])
    const n = reduce3(cross3(u, v)), w = sub3(D, A)
    if (!yes && dot3(n, w) === 0) return coplanZ(A, B, C, add3(A, add3(mul3(s, u), mul3(t, v))), u, v, s, t)
    return choice(`Les points A${t3(A)}, B${t3(B)}, C${t3(C)} et D${t3(D)} sont-ils coplanaires ?`, yes ? 'Oui' : 'Non', [yes ? 'Non' : 'Oui'],
      `n⃗${t3(n)} est orthogonal à AB⃗${t3(u)} et AC⃗${t3(v)} : il est normal à (ABC). AD⃗${t3(w)} et AD⃗ · n⃗ = ${fmt(dot3(w, n))}${yes ? ' : D est dans le plan (ABC), les points sont coplanaires.' : ' ≠ 0 : D n’est pas dans le plan (ABC).'}`)
  },
)
function coplanZ(A: V3, B: V3, C: V3, D: V3, u: V3, v: V3, s: number, t: number): Exercise {
  return numeric(`On donne A${t3(A)}, B${t3(B)} et C${t3(C)}. Pour quelle valeur de z le point D(${fmt(D[0])} ; ${fmt(D[1])} ; z) est-il dans le plan (ABC) ?`, D[2], {
    explanation: `On cherche AD⃗ = s AB⃗ + t AC⃗ avec AB⃗${t3(u)}, AC⃗${t3(v)}. Abscisse et ordonnée : s = ${fmt(s)}, t = ${fmt(t)}. Cote : z = ${sumOf([fmt(A[2]), u[2] ? `${par(s)} × ${par(u[2])}` : '', v[2] ? `${par(t)} × ${par(v[2])}` : ''])} = ${fmt(D[2])}.`,
  })
}

// ════════════════════════════════════════════════════════════════════════
// Palier 5 — exigeant
// ════════════════════════════════════════════════════════════════════════

// Projeté orthogonal sur une droite
function projLine() {
  return retry(() => {
    const d = rnz(3), A = rp(3), t = pick([-2, -1, 1, 2, 3])
    const ws = orthoTo(d, 3).filter((w) => n2(w) <= 30)
    if (!ws.length) return null
    const w = pick(ws), H = add3(A, mul3(t, d)), M = add3(H, w)
    return { d, A, B: add3(A, d), t, w, H, M }
  })
}
const projOnLine = variants(
  () => {
    const { d, A, B, t, H, M } = projLine()
    return triplet(`${rep()} on donne A${t3(A)}, B${t3(B)} et M${t3(M)}. Quelles sont les coordonnées du projeté orthogonal H de M sur la droite (AB) ?`, H, {
      explanation: `H = A + t AB⃗ avec t = ${F('AM⃗ · AB⃗', 'AB²')}. AB⃗${t3(d)}, AM⃗${t3(sub3(M, A))} : t = ${F(fmt(dot3(sub3(M, A), d)), fmt(n2(d)))} = ${fmt(t)}, donc H${t3(H)}.`,
    })
  },
  () => {
    const { d, A, B, t, M } = projLine()
    return numeric(`${rep()} on donne A${t3(A)}, B${t3(B)} et M${t3(M)}. Le projeté orthogonal H de M sur (AB) vérifie AH⃗ = t AB⃗. Que vaut t ?`, t, {
      explanation: `HM⃗ ⊥ AB⃗ donne AM⃗ · AB⃗ = t AB², donc t = ${F(fmt(dot3(sub3(M, A), d)), fmt(n2(d)))} = ${fmt(t)}.`,
    })
  },
  () => {
    const { d, A, B, t, w, M } = projLine()
    return exactRoot(`${rep()} on donne A${t3(A)}, B${t3(B)} et M${t3(M)}. Calcule la distance du point M à la droite (AB) (valeur exacte).`, n2(w),
      `Le projeté H de M sur (AB) : t = ${F('AM⃗ · AB⃗', 'AB²')} = ${F(fmt(dot3(sub3(M, A), d)), fmt(n2(d)))} = ${fmt(t)}, H${t3(add3(A, mul3(t, d)))}. Puis MH⃗${t3(mul3(-1, w))} et MH = √{${n2(w)}} = ${rootText(n2(w))}.`)
  },
  () => {
    const { d, A, B, t, H, M } = projLine()
    return triplet(`Une route rectiligne passe par les points A${t3(A)} et B${t3(B)}. Une ferme est située en M${t3(M)} (repère orthonormé, unité : 100 m). En quel point de la route faut-il construire le chemin d’accès le plus court ?`, H, {
      explanation: `Le chemin le plus court est perpendiculaire à la route : c’est le projeté orthogonal H de M sur (AB). t = ${F('AM⃗ · AB⃗', 'AB²')} = ${F(fmt(dot3(sub3(M, A), d)), fmt(n2(d)))} = ${fmt(t)}, donc H = ${plusVec('A', t, 'AB⃗')} = ${t3(H)}.`,
    })
  },
)

// Projeté orthogonal sur un plan, symétrique
function projPlane() {
  return retry(() => {
    const n = rnz(2), A = rp(3)
    const ws = orthoTo(n, 3)
    const H = add3(A, pick(ws)), k = pick([-2, -1, 1, 2]), M = add3(H, mul3(k, n))
    return Math.max(...M.map(Math.abs)) <= 10 ? { n, A, H, k, M } : null
  })
}
const projOnPlane = variants(
  () => {
    const { n, A, H, k, M } = projPlane()
    return triplet(`${rep()} le plan P passe par A${t3(A)} et a pour vecteur normal n⃗${t3(n)}. Quelles sont les coordonnées du projeté orthogonal H du point M${t3(M)} sur P ?`, H, {
      explanation: `H = M + λn⃗ avec AH⃗ · n⃗ = 0 : (AM⃗ + λn⃗) · n⃗ = 0, donc λ = −${F('AM⃗ · n⃗', '‖n⃗‖²')} = −${F(fmt(dot3(sub3(M, A), n)), fmt(n2(n)))} = ${fmt(-k)}. H${t3(H)}.`,
    })
  },
  () => {
    const { n, A, H, k, M } = projPlane(), S = sub3(mul3(2, H), M)
    return triplet(`${rep()} le plan P passe par A${t3(A)} et a pour vecteur normal n⃗${t3(n)}. Quelles sont les coordonnées du symétrique M′ du point M${t3(M)} par rapport à P ?`, S, {
      explanation: `Projeté H = M + λn⃗ avec λ = −${F('AM⃗ · n⃗', '‖n⃗‖²')} = ${fmt(-k)}, soit H${t3(H)} ; M′ = M + 2λn⃗ (H milieu de [MM′]) : M′${t3(S)}.`,
    })
  },
  () => {
    const { n, A, k, M } = projPlane()
    return exactRoot(`${rep()} le plan P passe par A${t3(A)} et a pour vecteur normal n⃗${t3(n)}. Quelle est la distance du point M${t3(M)} au plan P (valeur exacte) ?`, k * k * n2(n),
      `d = ${F('|AM⃗ · n⃗|', '‖n⃗‖')} = ${F(fmt(Math.abs(dot3(sub3(M, A), n))), rootText(n2(n)))} = ${rootText(k * k * n2(n))}.`)
  },
)

// Angle arrondi au degré dans un pavé
const angleBox = variants(
  ...[0, 1, 2].map((mode) => () => {
    const dims: V3 = mode === 0 ? [randInt(2, 6), randInt(2, 6), randInt(2, 6)] : (() => { const a = randInt(2, 6); return [a, a, a] as V3 })()
    const P = (n: string) => CUBE[n].map((c, i) => c * dims[i]) as V3
    const [p, q, r, deg] = retry(() => {
      const [p, q, r] = shuffle(VERTS)
      const u = sub3(P(q), P(p)), v = sub3(P(r), P(p)), c = dot3(u, v) / Math.sqrt(n2(u) * n2(v))
      const x = (Math.acos(c) * 180) / Math.PI
      if (Math.abs(x - Math.round(x)) < 1e-6 || Math.abs(x - Math.round(x)) > 0.4) return null
      if (mode === 2 && !(n2(u) === 3 * dims[0] ** 2 || n2(v) === 3 * dims[0] ** 2)) return null
      return [p, q, r, Math.round(x)] as [string, string, string, number]
    })
    const u = sub3(P(q), P(p)), v = sub3(P(r), P(p))
    const what = mode === 0 ? `un pavé droit avec AB = ${dims[0]}, AD = ${dims[1]} et AE = ${dims[2]}` : `un cube d’arête ${dims[0]}`
    return withMeta(numeric(`ABCDEFGH est ${what}. Donne la mesure, arrondie au degré, de l’angle géométrique ${q}${p}${r} (sommet ${p}).`, deg, {
      explanation: `Repère orthonormé d’origine A, axes (AB), (AD), (AE) : ${p}${q}⃗${t3(u)}, ${p}${r}⃗${t3(v)}. cos = ${F(fmt(dot3(u, v)), `√${n2(u)} × √${n2(v)}`)} ≈ ${fmt(Math.round((dot3(u, v) / Math.sqrt(n2(u) * n2(v))) * 1000) / 1000)}, d’où un angle d’environ ${deg}°.`,
    }), { figure: boxFig(dims, { segs: [{ a: p, b: q, color: RED }, { a: p, b: r, color: BLUE }] }) })
  }),
)

// Distance d’un point à un plan défini par trois points
const distABC = variants(
  () => {
    const n = scramble(pick(NICE_NORMALS.slice(0, 9))), N = Math.sqrt(n2(n)), [u, v] = planeBasis(n, 3)
    const A = rp(3), B = add3(A, u), C = add3(A, v), w = retry(() => { const w = rp(4); return dot3(w, n) !== 0 ? w : null }), M = add3(A, w)
    const nn = n
    return fraction(`${rep()} on donne A${t3(A)}, B${t3(B)}, C${t3(C)} et M${t3(M)}. Calcule la distance du point M au plan (ABC).`, Math.abs(dot3(w, nn)), N, {
      explanation: `Un vecteur normal à (ABC) (orthogonal à AB⃗${t3(u)} et AC⃗${t3(v)}) est n⃗${t3(nn)}, de norme ${fmt(N)}. AM⃗${t3(w)}, AM⃗ · n⃗ = ${fmt(dot3(w, nn))}, donc d = ${frac(Math.abs(dot3(w, nn)), N)}.`,
    })
  },
  () => {
    const m = randInt(1, 3), a = 3 * m
    const [tri, V] = retry(() => {
      const tri = shuffle(VERTS).slice(0, 3)
      const ok = [[0, 1], [1, 2], [0, 2]].every(([i, j]) => n2(sub3(CUBE[tri[i]], CUBE[tri[j]])) === 2)
      if (!ok) return null
      const V = pick(VERTS.filter((x) => !tri.includes(x)))
      const nn = cross3(sub3(CUBE[tri[1]], CUBE[tri[0]]), sub3(CUBE[tri[2]], CUBE[tri[0]]))
      return dot3(nn, sub3(CUBE[V], CUBE[tri[0]])) !== 0 ? [tri, V] as [string[], string] : null
    })
    const nn = reduce3(cross3(sub3(CUBE[tri[1]], CUBE[tri[0]]), sub3(CUBE[tri[2]], CUBE[tri[0]])))
    const k = Math.abs(dot3(nn, sub3(CUBE[V], CUBE[tri[0]])))
    return withMeta(radical(`ABCDEFGH est un cube d’arête ${a}. Calcule la distance du sommet ${V} au plan (${tri.join('')}) (forme a√b).`, k * m, 3, {
      explanation: `Repère (A ; AB⃗, AD⃗, AE⃗) puis on multiplie par ${a} : n⃗${t3(nn)} est normal à (${tri.join('')}) (orthogonal à ${tri[0]}${tri[1]}⃗ et ${tri[0]}${tri[2]}⃗), ‖n⃗‖ = √3. Dans le cube unité, d = ${F(k, '√3')} ; pour l’arête ${a} : d = ${F(k * a, '√3')} = ${k * m === 1 ? '' : k * m}√3.`,
    }), { figure: boxFig([1, 1, 1], { polygons: [{ pts: tri, fill: GOLD }] }) })
  },
  () => {
    const n = scramble(pick(NICE_NORMALS.slice(0, 9))), N = Math.sqrt(n2(n)), [u, v] = planeBasis(n, 3)
    const A = rp(3), B = add3(A, u), C = add3(A, v)
    const nn = n, d = Math.abs(dot3(A, nn))
    if (d === 0) return distPlane()
    return fraction(`${rep()} on donne A${t3(A)}, B${t3(B)} et C${t3(C)}. Quelle est la distance de l’origine O au plan (ABC) ?`, d, N, {
      explanation: `n⃗${t3(nn)} est orthogonal à AB⃗${t3(u)} et AC⃗${t3(v)} : il est normal à (ABC), ‖n⃗‖ = ${fmt(N)}. AO⃗ · n⃗ = ${fmt(-dot3(A, nn))}, donc d = ${frac(d, N)}.`,
    })
  },
)

// ════════════════════════════════════════════════════════════════════════
// Problèmes d’amélioration (généralisation)
// ════════════════════════════════════════════════════════════════════════

const T = (title: string, ex: Exercise, figure?: Figure): Exercise => withMeta(ex, figure ? { title, figure } : { title })

const upgrades: Ladder = [
  [
    // Orthogonalité : équation du second degré en m
    () => {
      const [r1, r2] = retry(() => { const a = randInt(-5, 5), b = randInt(-5, 5); return a !== b && a * b !== 0 && a + b !== 0 ? [a, b] : null })
      // u(m ; a ; b) · v(m ; c ; m) = m² + bm + ac, qu’on veut égal à (m − r1)(m − r2)
      const b = -(r1 + r2), pq = r1 * r2
      const [a, c] = retry(() => { const a = randNonZero(-6, 6); return pq % a === 0 ? [a, pq / a] : null })
      const D = b * b - 4 * pq
      const ex = solutionSet(`${rep()} pour quelles valeurs du réel m les vecteurs u⃗(m ; ${fmt(a)} ; ${fmt(b)}) et v⃗(m ; ${fmt(c)} ; m) sont-ils orthogonaux ? (valeurs séparées par ;)`, [r1, r2], {
        explanation: `u⃗ · v⃗ = m × m + ${par(a)} × ${par(c)} + ${par(b)} × m = ${poly([1, 'm²'], [b, 'm'], [pq, ''])}. Δ = ${D} = ${Math.sqrt(D)}², d’où m = ${fmt(Math.min(r1, r2))} ou m = ${fmt(Math.max(r1, r2))}.`,
      })
      return { ...ex, answer: `${fmt(Math.min(r1, r2))} ; ${fmt(Math.max(r1, r2))}` }
    },
    // Point de l’axe équidistant de deux points
    () => {
      const [A, B, x] = retry(() => {
        const A = rp(5), B = rp(5), dx = B[0] - A[0]
        if (dx === 0) return null
        const num = n2(B) - n2(A)
        return num % (2 * dx) === 0 && num !== 0 ? [A, B, num / (2 * dx)] as [V3, V3, number] : null
      })
      return numeric(`${rep()} on donne A${t3(A)} et B${t3(B)}. Le point M(x ; 0 ; 0) de l’axe des abscisses est à égale distance de A et de B. Que vaut x ?`, x, {
        explanation: `MA² = MB² ⇔ ${sumOf([`(x − ${par(A[0])})²`, A[1] * A[1] + A[2] * A[2] ? String(A[1] * A[1] + A[2] * A[2]) : ''])} = ${sumOf([`(x − ${par(B[0])})²`, B[1] * B[1] + B[2] * B[2] ? String(B[1] * B[1] + B[2] * B[2]) : ''])}. Les x² s’éliminent : ${fmt(2 * (B[0] - A[0]))}x = ${fmt(n2(B) - n2(A))}, donc x = ${fmt(x)}.`,
      })
    },
    // Sphère de diamètre [AB] : ensemble des M tels que MA⃗ · MB⃗ = 0
    () => {
      const A = rp(4), u = mul3(2, intNormVec(7)), B = add3(A, u), r = Math.sqrt(n2(u)) / 2
      return numeric(`${rep()} on donne A${t3(A)} et B${t3(B)}. L’ensemble des points M tels que MA⃗ · MB⃗ = 0 est une sphère. Quel est son rayon ?`, r, {
        explanation: `MA⃗ · MB⃗ = 0 ⇔ l’angle AMB est droit (ou M = A ou B) : c’est la sphère de diamètre [AB]. AB⃗${t3(u)}, AB = √{${n2(u)}} = ${fmt(2 * r)}, donc le rayon vaut ${fmt(r)}.`,
      })
    },
  ],
  [
    // Produit scalaire de diagonales dans un cube d’arête quelconque
    () => {
      const [p, q, r, s] = retry(() => { const l = linePair(); const d = dot3(sub3(CUBE[l[1]], CUBE[l[0]]), sub3(CUBE[l[3]], CUBE[l[2]])); return d !== 0 && n2(sub3(CUBE[l[1]], CUBE[l[0]])) > 1 ? l : null })
      const u = sub3(CUBE[q], CUBE[p]), v = sub3(CUBE[s], CUBE[r]), k = dot3(u, v)
      return T('Pour tout cube', numeric(`ABCDEFGH est un cube d’arête a (a > 0). On a ${p}${q}⃗ · ${r}${s}⃗ = k a². Que vaut k ?`, k, {
        explanation: `Dans le repère orthonormé (A ; ${F(1, 'a')}AB⃗, ${F(1, 'a')}AD⃗, ${F(1, 'a')}AE⃗), chaque coordonnée est multipliée par a : ${p}${q}⃗ = a${t3(u)} et ${r}${s}⃗ = a${t3(v)}, donc le produit vaut a² × (${dotTxt(u, v)}) = ${k === 1 ? '' : k === -1 ? '−' : fmt(k)}a².`,
      }), boxFig([1, 1, 1], { segs: [{ a: p, b: q, color: RED, head: true }, { a: r, b: s, color: BLUE, head: true }] }))
    },
    // Cosinus de l’angle entre deux grandes diagonales d’un pavé
    () => {
      const [a, b, c] = retry(() => { const d = [randInt(1, 6), randInt(1, 6), randInt(1, 6)]; return new Set(d).size >= 2 ? d : null })
      const num = -a * a + b * b + c * c, den = a * a + b * b + c * c
      return T('Les diagonales du coffre', fraction(`ABCDEFGH est un pavé droit avec AB = ${a}, AD = ${b} et AE = ${c}. Calcule le cosinus de l’angle entre les vecteurs AG⃗ et BH⃗.`, num, den, {
        explanation: `Repère orthonormé d’origine A : AG⃗(${a} ; ${b} ; ${c}) et BH⃗(−${a} ; ${b} ; ${c}). AG⃗ · BH⃗ = −${a * a} + ${b * b} + ${c * c} = ${fmt(num)} ; AG = BH = √{${den}}. cos θ = ${frac(num, den)}.`,
      }), boxFig([a, b, c], { segs: [{ a: 'A', b: 'G', color: RED, head: true }, { a: 'B', b: 'H', color: BLUE, head: true }] }))
    },
    // Aire d’un triangle par le produit scalaire
    () => {
      const [A, u, v] = retry(() => {
        const u = rnz(3), v = rnz(3), A = rp(3)
        const g = n2(u) * n2(v) - dot3(u, v) ** 2
        return g > 0 && rootParts(g)[1] === 1 ? [A, u, v] as [V3, V3, V3] : null
      })
      const B = add3(A, u), C = add3(A, v), g = n2(u) * n2(v) - dot3(u, v) ** 2, area = Math.sqrt(g) / 2
      return T('L’aire sans hauteur', numeric(`${rep()} on donne A${t3(A)}, B${t3(B)} et C${t3(C)}. On admet que l’aire du triangle ABC vaut ${F(1, 2)}√{AB² × AC² − (AB⃗ · AC⃗)²}. Calcule cette aire.`, area, {
        explanation: `AB⃗${t3(u)}, AC⃗${t3(v)} : AB² = ${n2(u)}, AC² = ${n2(v)}, AB⃗ · AC⃗ = ${fmt(dot3(u, v))}. Aire = ${F(1, 2)}√{${n2(u)} × ${n2(v)} − ${dot3(u, v) ** 2}} = ${F(1, 2)}√{${g}} = ${fmt(area)}.`,
      }))
    },
  ],
  [
    // Volume d’un tétraèdre : base × hauteur (distance au plan)
    () => {
      const n = scramble(pick(NICE_NORMALS.slice(0, 6)))
      const [u, v] = retry(() => { const u = pick(orthoTo(n, 2)), v = reduce3(cross3(n, u)); return Math.max(...v.map(Math.abs)) <= 8 ? [u, v] : null })
      const A = rp(3), B = add3(A, u), C = add3(A, v)
      const D = retry(() => { const D = add3(A, add3(mul3(randNonZero(-2, 2), n), pick(orthoTo(n, 2)))); return Math.max(...D.map(Math.abs)) <= 12 ? D : null })
      const N = Math.sqrt(n2(n)), s = Math.round(Math.sqrt(n2(u) * n2(v))), lam = s / N, h = Math.abs(dot3(sub3(D, A), n))
      return T('Le volume du tétraèdre', fraction(`${rep()} on donne A${t3(A)}, B${t3(B)}, C${t3(C)} et D${t3(D)}. Vérifie que le triangle ABC est rectangle en A, puis calcule le volume du tétraèdre ABCD (V = ${F(1, 3)} × aire de base × hauteur).`, lam * h, 6, {
        explanation: `AB⃗${t3(u)} · AC⃗${t3(v)} = 0 : ABC est rectangle en A, d’aire ${F(1, 2)} × √{${n2(u)}} × √{${n2(v)}} = ${F(1, 2)} × √{${n2(u) * n2(v)}} = ${fmt(s / 2)}. n⃗${t3(n)} est orthogonal à AB⃗ et AC⃗ (normal à (ABC)), ‖n⃗‖ = ${fmt(N)}, AD⃗${t3(sub3(D, A))} : hauteur = ${F('|AD⃗ · n⃗|', '‖n⃗‖')} = ${frac(h, N)}. V = ${F(1, 3)} × ${fmt(s / 2)} × ${F(h, N)} = ${frac(lam * h, 6)}.`,
      }))
    },
    // Distance entre deux plans parallèles
    () => {
      const n = scramble(pick(NICE_NORMALS.slice(0, 9))), N = Math.sqrt(n2(n)), A = rp(4)
      const B = retry(() => { const B = rp(4); return dot3(sub3(B, A), n) !== 0 ? B : null }), d = Math.abs(dot3(sub3(B, A), n))
      return T('Deux étages', fraction(`${rep()} deux plans parallèles P et P′ ont pour vecteur normal n⃗${t3(n)} ; P passe par A${t3(A)} et P′ par B${t3(B)}. Quelle est la distance entre ces deux plans ?`, d, N, {
        explanation: `C’est la distance de B au plan P : ${F('|AB⃗ · n⃗|', '‖n⃗‖')} = ${frac(d, N)} (AB⃗${t3(sub3(B, A))}, ‖n⃗‖ = ${fmt(N)}).`,
      }))
    },
    // Sphère circonscrite à un tétraèdre trirectangle
    () => {
      const v = scramble(pick(INT_VECS.filter((w) => w.every((c) => c > 0) && Math.max(...w) <= 9))).map(Math.abs) as V3
      const [a, b, c] = mul3(2, v), r = Math.sqrt(n2(v))
      const ask = pick(['centre', 'rayon'])
      const fig = persp({ O: [0, 0, 0], A: [a, 0, 0], B: [0, b, 0], C: [0, 0, c] }, [
        { a: 'O', b: 'A' }, { a: 'O', b: 'B', dashed: true }, { a: 'O', b: 'C' }, { a: 'A', b: 'B' }, { a: 'B', b: 'C' }, { a: 'C', b: 'A' },
      ], { pos: { O: 'sw', A: 'se', B: 'ne', C: 'n' } })
      const base = `Dans un repère orthonormé, on donne O(0 ; 0 ; 0), A(${a} ; 0 ; 0), B(0 ; ${b} ; 0) et C(0 ; 0 ; ${c}). Une sphère passe par les quatre points O, A, B et C.`
      const expl = `Le centre Ω(x ; y ; z) vérifie ΩO = ΩA, ΩO = ΩB, ΩO = ΩC. ΩO² = ΩA² ⇔ x² = (x − ${a})² ⇔ x = ${a / 2} ; de même y = ${b / 2}, z = ${c / 2}. Ω(${a / 2} ; ${b / 2} ; ${c / 2})`
      return T('La sphère des quatre sommets', ask === 'centre'
        ? triplet(`${base} Quelles sont les coordonnées de son centre Ω ?`, [a / 2, b / 2, c / 2], { explanation: `${expl}.` })
        : numeric(`${base} Quel est son rayon ?`, r, { explanation: `${expl}, rayon ΩO = √{${sqTxt(v)}} = √{${n2(v)}} = ${fmt(r)}.` }), fig)
    },
  ],
]

// ════════════════════════════════════════════════════════════════════════
// Problèmes de l’hôtel de ville
// ════════════════════════════════════════════════════════════════════════

const PYR_FACES: [string, string][] = [['A', 'B'], ['B', 'C'], ['C', 'D'], ['D', 'A']]
const age: Ladder = [
  [
    () => {
      const k = pick([1, 1, 2])
      const v = mul3(k, scramble(pick(INT_VECS.filter((w) => w.every((c) => c > 0) && Math.max(...w) <= 12))).map(Math.abs) as V3)
      const [a, b, c] = v, L = Math.sqrt(n2(v))
      return T('Le câble du donjon', numeric(`Le donjon a la forme d’un pavé droit ABCDEFGH de ${a} m de long (AB), ${b} m de large (AD) et ${c} m de haut (AE). On tend un câble du coin A, au sol, jusqu’au coin G, au sommet opposé. Quelle est la longueur du câble (en m) ?`, L, {
        explanation: `Repère orthonormé d’origine A (unité le mètre) : G(${a} ; ${b} ; ${c}), donc AG = √{${a}² + ${b}² + ${c}²} = √{${n2(v)}} = ${fmt(L)} m.`,
      }), boxFig([a, b, c], { segs: [{ a: 'A', b: 'G', color: RED }] }))
    },
    () => {
      const A: V3 = [randInt(0, 4), randInt(0, 4), randInt(1, 4)]
      const u = retry(() => { const u = intNormVec(9); return A[2] + u[2] >= 1 && A[0] + u[0] >= 0 && A[1] + u[1] >= 0 ? u : null }), B = add3(A, u)
      return T('Le vol du faucon', numeric(`${prenom()} lâche son faucon depuis le point A${t3(A)} ; l’oiseau file en ligne droite jusqu’à un perchoir situé au point B${t3(B)} (repère orthonormé, unité : 10 m). Quelle distance a-t-il parcourue, en mètres ?`, Math.sqrt(n2(u)) * 10, {
        explanation: `AB⃗${t3(u)}, AB = √{${sqTxt(u)}} = √{${n2(u)}} = ${Math.sqrt(n2(u))} unités, soit ${Math.sqrt(n2(u)) * 10} m.`,
      }), axesFig({ A, B }, [{ a: 'A', b: 'B', color: RED, head: true }], { caption: 'Repère orthonormé ; pointillés : projection sur le sol. La figure n’est pas à l’échelle.' }))
    },
    () => {
      const a = randInt(2, 6) * 2, b = randInt(2, 5) * 2, c = randInt(2, 6) * 2
      const what = pick([
        { t: 'Le lustre de la grande salle', q: 'on suspend un lustre au centre K du plafond EFGH', P: [a / 2, b / 2, c] as V3, s: ['E', 'G'] },
        { t: 'La lanterne du cellier', q: 'on suspend une lanterne au centre K de la salle (milieu de [AG])', P: [a / 2, b / 2, c / 2] as V3, s: ['A', 'G'] },
        { t: 'Le blason du mur', q: 'on accroche un blason au centre K du mur ABFE', P: [a / 2, 0, c / 2] as V3, s: ['A', 'F'] },
        { t: 'La torche du mur du fond', q: 'on fixe une torche au centre K du mur DCGH', P: [a / 2, b, c / 2] as V3, s: ['D', 'G'] },
      ])
      const at = (n: string) => cubeAt(n).map((x, i) => x * [a, b, c][i]) as V3
      return T(what.t, triplet(`Une salle a la forme d’un pavé droit ABCDEFGH avec AB = ${a} m, AD = ${b} m et AE = ${c} m ; ${what.q}. Dans le repère orthonormé d’origine A dont les axes portent [AB], [AD] et [AE] (unité : le mètre), quelles sont les coordonnées de K ?`, what.P, {
        explanation: `${what.s[0]}${t3(at(what.s[0]))} et ${what.s[1]}${t3(at(what.s[1]))} ; K est le milieu de [${what.s.join('')}] : K${t3(what.P)}.`,
      }), boxFig([a, b, c], { extra: { K: what.P }, segs: [{ a: what.s[0], b: what.s[1], dashed: true, color: BLUE }], pos: { K: 'n' } }))
    },
  ],
  [
    () => {
      const [h, a, b, x] = retry(() => {
        const h = randInt(3, 9), a = randInt(2, 8), b = randInt(2, 8)
        const x = (Math.acos((h * h) / Math.sqrt((a * a + h * h) * (b * b + h * h))) * 180) / Math.PI
        return Math.abs(x - Math.round(x)) < 0.4 ? [h, a, b, x] : null
      })
      const S: V3 = [0, 0, h], A: V3 = [a, 0, 0], B: V3 = [0, b, 0], u = sub3(A, S), v = sub3(B, S), c = dot3(u, v) / Math.sqrt(n2(u) * n2(v))
      return T('Les haubans du mât', numeric(`Un mât vertical [OS] de ${h} m est planté au point O. Deux haubans le relient, depuis son sommet S, aux piquets A et B plantés au sol, avec OA = ${a} m, OB = ${b} m et l’angle AOB droit. Quelle est la mesure de l’angle ASB entre les deux haubans, arrondie au degré ?`, Math.round(x), {
        explanation: `Repère orthonormé d’origine O : S(0 ; 0 ; ${h}), A(${a} ; 0 ; 0), B(0 ; ${b} ; 0). SA⃗${t3(u)}, SB⃗${t3(v)}, SA⃗ · SB⃗ = ${dot3(u, v)}. cos(ASB) = ${F(dot3(u, v), `√${n2(u)} × √${n2(v)}`)} ≈ ${fmt(Math.round(c * 1000) / 1000)}, donc ASB ≈ ${Math.round(x)}°.`,
      }), persp({ O: [0, 0, 0], S, A, B }, [
        { a: 'O', b: 'S', color: '#7a5a2c' }, { a: 'S', b: 'A', color: RED }, { a: 'S', b: 'B', color: RED }, { a: 'O', b: 'A', dashed: true }, { a: 'O', b: 'B', dashed: true },
      ], { pos: { O: 'sw', S: 'n', A: 'se', B: 'e' } }))
    },
    () => {
      const [A, B, C, x] = retry(() => {
        const A: V3 = [randInt(0, 3), randInt(0, 3), 0], B: V3 = [randInt(4, 8), randInt(0, 4), 0], C: V3 = [randInt(0, 6), randInt(3, 6), randInt(2, 5)]
        const u = sub3(B, A), v = sub3(C, A)
        if (dot3(u, v) === 0) return null
        const x = (Math.acos(dot3(u, v) / Math.sqrt(n2(u) * n2(v))) * 180) / Math.PI
        return Math.abs(x - Math.round(x)) < 0.4 ? [A, B, C, x] as [V3, V3, V3, number] : null
      })
      const u = sub3(B, A), v = sub3(C, A)
      return T('La voile triangulaire', numeric(`Une voile triangulaire est tendue entre les points A${t3(A)}, B${t3(B)} et C${t3(C)} (repère orthonormé, unité : le mètre). Quelle est la mesure de l’angle de la voile au sommet A, arrondie au degré ?`, Math.round(x), {
        explanation: `AB⃗${t3(u)}, AC⃗${t3(v)}, AB⃗ · AC⃗ = ${fmt(dot3(u, v))}. cos(BAC) = ${F(fmt(dot3(u, v)), `√${n2(u)} × √${n2(v)}`)} ≈ ${fmt(Math.round((dot3(u, v) / Math.sqrt(n2(u) * n2(v))) * 1000) / 1000)}, d’où environ ${Math.round(x)}°.`,
      }), axesFig({ A, B, C }, [{ a: 'A', b: 'B', color: RED }, { a: 'B', b: 'C', color: RED }, { a: 'C', b: 'A', color: RED }], { polygons: [{ pts: ['A', 'B', 'C'], fill: GOLD }] }))
    },
    () => {
      const [u, v, i, m] = retry(() => {
        const u: V3 = [randInt(-4, 4), randInt(-4, 4), randInt(1, 4)], i = randInt(0, 1)
        if (u[i] === 0) return null
        const v: V3 = [randInt(-4, 4), randInt(-4, 4), randInt(1, 5)]
        const rest = dot3(u, v) - u[i] * v[i]
        if (rest === 0 || rest % u[i] !== 0 || Math.abs(rest / u[i]) > 9) return null
        v[i] = -rest / u[i]
        return [u, v, i, v[i]] as [V3, V3, number, number]
      })
      const vs = v.map((c, j) => (j === i ? 'm' : fmt(c))).join(' ; ')
      return T('La charpente', numeric(`Dans la charpente d’une grange, une poutre est dirigée par le vecteur u⃗${t3(u)}. Une jambe de force doit lui être perpendiculaire et être dirigée par v⃗(${vs}) (repère orthonormé). Quelle valeur faut-il donner à m ?`, m, {
        explanation: `Perpendiculaires ⇔ u⃗ · v⃗ = 0 : ${sumOf([0, 1, 2].map((j) => (j === i ? mono(u[j], 'm') : u[j] * v[j] === 0 ? '' : `${par(u[j])} × ${par(v[j])}`)))} = 0, donc m = ${fmt(m)}.`,
      }), persp({ _o: [0, 0, 0], _u: u, _v: v }, [
        { a: '_o', b: '_u', color: '#7a5a2c', head: true }, { a: '_o', b: '_v', color: RED, head: true },
      ], { notes: [{ at: mul3(1.15, u), text: 'u' }, { at: mul3(1.15, v), text: 'v' }], caption: 'La poutre (u⃗) et la jambe de force (v⃗), avec la bonne valeur de m.' }))
    },
  ],
  [
    () => {
      const n = scramble(pick(NICE_NORMALS.slice(0, 9))), N = Math.sqrt(n2(n)), [u, v] = planeBasis(n, 3)
      const A: V3 = [randInt(0, 3), randInt(0, 3), randInt(0, 3)], B = add3(A, u), C = add3(A, v)
      const w = retry(() => { const w = rp(4); return dot3(w, n) !== 0 ? w : null }), M = add3(A, w)
      return T('Le rayon du mage', fraction(`Un mage place son cristal au point M${t3(M)}. Un mur plat passe par les points A${t3(A)}, B${t3(B)} et C${t3(C)} (repère orthonormé, unité : le mètre). Le rayon qu’il lance frappe le mur perpendiculairement. Quelle longueur parcourt le rayon jusqu’au mur ?`, Math.abs(dot3(w, n)), N, {
        explanation: `C’est la distance de M au plan (ABC). n⃗${t3(n)} est orthogonal à AB⃗${t3(u)} et AC⃗${t3(v)}, ‖n⃗‖ = ${fmt(N)}. AM⃗${t3(w)} et d = ${F('|AM⃗ · n⃗|', '‖n⃗‖')} = ${frac(Math.abs(dot3(w, n)), N)} m.`,
      }), planeSketch({ on: { A: [0.12, 0.25], B: [0.75, 0.15], C: [0.2, 0.8] }, above: 'M', name: 'mur', caption: 'Le mur (en jaune), le cristal M et le point H où le rayon frappe le mur. Schéma de principe.' }))
    },
    () => {
      const [a, h] = pick([[3, 4], [4, 3], [6, 8], [8, 6], [5, 12], [12, 5], [9, 12]] as [number, number][])
      const P: Record<string, V3> = { A: [-a, -a, 0], B: [a, -a, 0], C: [a, a, 0], D: [-a, a, 0], O: [0, 0, 0], S: [0, 0, h] }
      const [p, q] = pick(PYR_FACES), n = reduce3(cross3(sub3(P[q], P[p]), sub3(P.S, P[p]))), L = Math.sqrt(a * a + h * h)
      return T('La pyramide du pharaon', fraction(`Une pyramide régulière SABCD a pour base le carré ABCD de côté ${2 * a} m, de centre O, et pour hauteur OS = ${h} m. Quelle est la distance (en m) du centre O de la base à la face S${p}${q} ?`, a * h, L, {
        explanation: `Repère orthonormé d’origine O, axes parallèles aux côtés : ${p}${t3(P[p])}, ${q}${t3(P[q])}, S(0 ; 0 ; ${h}). n⃗${t3(n)} est orthogonal à ${p}${q}⃗ et ${p}S⃗ : il est normal à la face. d = ${F(`|O${p}⃗ · n⃗|`, '‖n⃗‖')} = ${F(Math.abs(dot3(P[p], n)), `√${n2(n)}`)} = ${F(Math.abs(dot3(P[p], n)), Math.sqrt(n2(n)))} = ${fmt((a * h) / L)} m.`,
      }), persp(P, [
        { a: 'A', b: 'B' }, { a: 'B', b: 'C' }, { a: 'C', b: 'D', dashed: true }, { a: 'D', b: 'A', dashed: true },
        { a: 'S', b: 'A' }, { a: 'S', b: 'B' }, { a: 'S', b: 'C' }, { a: 'S', b: 'D', dashed: true }, { a: 'S', b: 'O', dashed: true },
      ], { pos: { A: 'sw', B: 'se', C: 'e', D: 'nw', O: 's', S: 'n' }, polygons: [{ pts: ['S', p, q], fill: GOLD }] }))
    },
    () => {
      const [legs, k] = pick([[[6, 6, 3], 1], [[12, 12, 6], 2], [[18, 18, 9], 3]] as [number[], number][])
      const [a, b, c] = shuffle(legs), V = (a * b * c) / 6
      const fig = persp({ O: [0, 0, 0], A: [a, 0, 0], B: [0, b, 0], C: [0, 0, c] }, [
        { a: 'O', b: 'A' }, { a: 'O', b: 'B', dashed: true }, { a: 'O', b: 'C' }, { a: 'A', b: 'B' }, { a: 'B', b: 'C' }, { a: 'C', b: 'A' },
      ], { pos: { O: 'sw', A: 'se', B: 'ne', C: 'n' }, polygons: [{ pts: ['A', 'B', 'C'], fill: GOLD }] })
      const base = `Un reliquaire a la forme du tétraèdre OABC, coin d’une boîte : les arêtes [OA], [OB] et [OC] sont deux à deux perpendiculaires, avec OA = ${a} cm, OB = ${b} cm et OC = ${c} cm.`
      const dTxt = `${k === 1 ? '' : k}√6`
      if (Math.random() < 0.5) {
        return T('Le reliquaire', radical(`${base} Calcule la distance de O à la face ABC (forme a√b, en cm).`, k, 6, {
          explanation: `Repère orthonormé d’origine O : le plan (ABC) a pour équation ${F('x', a)} + ${F('y', b)} + ${F('z', c)} = 1, de vecteur normal n⃗(${F(1, a)} ; ${F(1, b)} ; ${F(1, c)}). d = ${F(1, '‖n⃗‖')} avec ‖n⃗‖² = ${F(1, a * a)} + ${F(1, b * b)} + ${F(1, c * c)} = ${F(1, 6 * k * k)} : d = √{${6 * k * k}} = ${dTxt} cm.`,
        }), fig)
      }
      return T('Le reliquaire', radical(`${base} On admet que la distance de O à la face ABC vaut ${dTxt} cm. Quelle est l’aire de la face ABC (forme a√b, en cm²) ?`, 9 * k * k, 6, {
        explanation: `Volume avec la base OAB et la hauteur OC : V = ${F(1, 3)} × ${F(`${a} × ${b}`, 2)} × ${c} = ${fmt(V)} cm³. Avec la base ABC et la hauteur ${dTxt} : ${fmt(V)} = ${F(1, 3)} × aire × ${dTxt}, donc aire = ${F(3 * V, dTxt)} = ${9 * k * k}√6 cm².`,
      }), fig)
    },
  ],
]

const tiers: Tiers = [
  [coordVec, midpoint, cubeRead, combo],
  [normDist, dotCoord, colin, positions],
  [orthoParam, angleNice, dotBox, coplan],
  [normalVec, distPlane, normFormulas, coplanPts],
  [projOnLine, projOnPlane, angleBox, distABC],
]

export const CONTENT: SubjectContent | null = { tiers, upgrades, age }
