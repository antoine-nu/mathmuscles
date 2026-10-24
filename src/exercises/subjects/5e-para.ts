// Parallélogrammes (5e) : côtés opposés, angles opposés et consécutifs, diagonales qui se coupent en leur milieu ;
// rectangle, losange, carré (diagonales, angles) ; calculs de longueurs, d'angles, de périmètres ; nature d'un quadrilatère.
import type { FigAngle, FigPoint, FigSegment, Figure, LabelPos } from '../figure'
import { choice, fmt, fresh, numeric, pick, randInt, variants, withMeta, type Exercise, type Maker, type SubjectContent } from '../utils'
import { prenom } from '../contexts'

// ── Petit moteur de figures (coordonnées mathématiques → cadre) ─────────
type Pt = [number, number]
const RED = '#b8362f'
const BLUE = '#2f5fb3'
const GREEN = '#2f8f4e'
const rad = (d: number) => (d * Math.PI) / 180
const polar = (r: number, d: number, o: Pt = [0, 0]): Pt => [o[0] + r * Math.cos(rad(d)), o[1] + r * Math.sin(rad(d))]
const norm = (d: number) => ((d % 360) + 360) % 360
const dirOf = (p: Pt, q: Pt) => norm((Math.atan2(q[1] - p[1], q[0] - p[0]) * 180) / Math.PI)
const POS: [LabelPos, number][] = [['e', 0], ['ne', 45], ['n', 90], ['nw', 135], ['w', 180], ['sw', 225], ['s', 270], ['se', 315]]
/** Position du nom d'un point la plus éloignée des directions occupées (traits, arcs). */
function bestPos(busy: number[]): LabelPos | undefined {
  if (!busy.length) return undefined
  let best: LabelPos = 'n', score = -1
  for (const [p, d] of POS) {
    const sc = Math.min(...busy.map((b) => { const x = norm(b - d); return Math.min(x, 360 - x) }))
    if (sc > score + 1e-9) { score = sc; best = p }
  }
  return best
}
/** Intersection des droites (P1P2) et (P3P4). */
function inter(p1: Pt, p2: Pt, p3: Pt, p4: Pt): Pt {
  const d = (p1[0] - p2[0]) * (p3[1] - p4[1]) - (p1[1] - p2[1]) * (p3[0] - p4[0])
  const a = p1[0] * p2[1] - p1[1] * p2[0], b = p3[0] * p4[1] - p3[1] * p4[0]
  return [(a * (p3[0] - p4[0]) - (p1[0] - p2[0]) * b) / d, (a * (p3[1] - p4[1]) - (p1[1] - p2[1]) * b) / d]
}
function onSeg(p: Pt, a: Pt, b: Pt) {
  const cr = (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0])
  const l = Math.hypot(b[0] - a[0], b[1] - a[1])
  const dot = (p[0] - a[0]) * (b[0] - a[0]) + (p[1] - a[1]) * (b[1] - a[1])
  return Math.abs(cr) / l < 1e-6 * Math.max(1, l) && dot > 1e-9 && dot < l * l - 1e-9
}
/** Arc d'angle ; `at` (0 à 1) place l'étiquette ailleurs que sur la bissectrice (quand une demi-droite y passe). */
interface Arc { v: string; a: string; b: string; label?: string; red?: boolean; right?: boolean; r?: number; color?: string; at?: number }
interface Spec {
  segs?: FigSegment[]
  arcs?: Arc[]
  hidden?: string[]
  labels?: Record<string, string>
  pos?: Partial<Record<string, LabelPos>>
  /** Textes en coordonnées mathématiques (dx, dy : décalage en pixels). */
  notes?: { at: Pt; text: string; dx?: number; dy?: number }[]
  polys?: { pts: string[]; fill: string }[]
  /** Cercles : centre (nom d'un point) et rayon en unités mathématiques. */
  circles?: { c: string; r: number; dashed?: boolean; color?: string }[]
  /** Lignes brisées en coordonnées mathématiques. */
  curves?: { pts: Pt[]; color?: string; dashed?: boolean; width?: number }[]
  caption?: string
  margin?: number
}
/** Construit une figure à l'échelle : points en coordonnées mathématiques, noms placés loin des traits. */
function build(raw: Record<string, Pt>, s: Spec = {}): Figure {
  const W = 320, H = 220, m = s.margin ?? 34
  const all = [...Object.values(raw), ...(s.curves ?? []).flatMap((c) => c.pts)]
  for (const c of s.circles ?? []) { const o = raw[c.c]; all.push([o[0] - c.r, o[1] - c.r], [o[0] + c.r, o[1] + c.r]) }
  const xs = all.map((p) => p[0]), ys = all.map((p) => p[1])
  const minX = Math.min(...xs), minY = Math.min(...ys)
  const spanX = Math.max(...xs) - minX || 1, spanY = Math.max(...ys) - minY || 1
  const k = Math.min((W - 2 * m) / spanX, (H - 2 * m) / spanY)
  const offX = (W - spanX * k) / 2, offY = (H - spanY * k) / 2
  const map = (p: Pt) => ({ x: offX + (p[0] - minX) * k, y: H - (offY + (p[1] - minY) * k) })
  const hidden = new Set(s.hidden ?? [])
  const segs = s.segs ?? [], arcs = s.arcs ?? []
  const points: Record<string, FigPoint> = {}
  for (const [name, p] of Object.entries(raw)) {
    const fp: FigPoint = map(p)
    if (hidden.has(name)) { fp.hidden = true; fp.label = '' } else {
      if (s.labels?.[name] !== undefined) fp.label = s.labels[name]
      const busy: number[] = []
      for (const sg of segs) {
        if (sg.color === 'transparent') continue
        const A = raw[sg.a], B = raw[sg.b]
        if (sg.a === name) busy.push(dirOf(p, B), ...(sg.extend ? [dirOf(B, p)] : []))
        else if (sg.b === name) busy.push(dirOf(p, A), ...(sg.extend ? [dirOf(A, p)] : []))
        else if (onSeg(p, A, B)) busy.push(dirOf(p, A), dirOf(p, B))
      }
      for (const a of arcs) {
        if (a.v !== name) continue
        const d1 = dirOf(p, raw[a.a])
        let d = norm(dirOf(p, raw[a.b]) - d1)
        if (d > 180) d -= 360
        busy.push(norm(d1 + d / 2))
      }
      fp.pos = s.pos?.[name] ?? bestPos(busy)
    }
    points[name] = fp
  }
  // étiquettes de segments → notes posées à l'extérieur, selon la largeur du texte
  const shown = Object.values(points).filter((q) => !q.hidden)
  const vis = shown.length ? shown : Object.values(points)
  const cx = vis.reduce((t, q) => t + q.x, 0) / Math.max(1, vis.length), cy = vis.reduce((t, q) => t + q.y, 0) / Math.max(1, vis.length)
  const notes: { x: number; y: number; text: string }[] = []
  const segments = segs.map((sg) => {
    if (!sg.label) return sg
    const a = points[sg.a], b = points[sg.b]
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1
    let nx = -(b.y - a.y) / len, ny = (b.x - a.x) / len
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2
    if ((mx - cx) * nx + (my - cy) * ny < 0) { nx = -nx; ny = -ny }
    const w = [...sg.label].reduce((t, ch) => t + (ch === ' ' ? 3.5 : 7.4), 0)
    const d = 5 + (w / 2) * Math.abs(nx) + 7 * Math.abs(ny)
    notes.push({ x: Math.min(W - w / 2 - 2, Math.max(w / 2 + 2, mx + nx * d)), y: Math.min(H - 4, Math.max(14, my + ny * d + 5)), text: sg.label })
    return { ...sg, label: undefined }
  })
  for (const n of s.notes ?? []) {
    const q = map(n.at)
    notes.push({ x: q.x + (n.dx ?? 0), y: q.y + (n.dy ?? 0) + 4, text: n.text })
  }
  const angles: FigAngle[] = arcs.map((a) => {
    if (a.at === undefined || !a.label) return { vertex: a.v, a: a.a, b: a.b, label: a.label, right: a.right, radius: a.r, color: a.red ? RED : a.color }
    const V = points[a.v], P = points[a.a], Q = points[a.b], r = a.r ?? 20
    const t1 = Math.atan2(P.y - V.y, P.x - V.x)
    let d = Math.atan2(Q.y - V.y, Q.x - V.x) - t1
    while (d > Math.PI) d -= 2 * Math.PI
    while (d < -Math.PI) d += 2 * Math.PI
    const t = t1 + d * a.at
    notes.push({ x: V.x + Math.cos(t) * (r + 15), y: V.y + Math.sin(t) * (r + 15) + 4, text: a.label })
    return { vertex: a.v, a: a.a, b: a.b, right: a.right, radius: a.r, color: a.red ? RED : a.color }
  })
  const circles = (s.circles ?? []).map((c) => ({ c: c.c, r: c.r * k, dashed: c.dashed, color: c.color }))
  const curves = (s.curves ?? []).map((c) => ({ ...c, pts: c.pts.map((p) => { const q = map(p); return [q.x, q.y] as [number, number] }) }))
  return { points, segments, angles, notes, polygons: s.polys, circles, curves, ...(s.caption ? { caption: s.caption } : {}) }
}

// ── Aides de rédaction ─────────────────────────────────────────────────
const deg = (n: number) => `${fmt(n)}°`
/** Nom d'angle avec accent circonflexe sur le sommet : xÔy, AB̂C. */
const ang = (a: string, o: string, b: string) => `${a}${o}̂${b}`
function retry(make: () => Exercise | null): Exercise {
  for (let i = 0; i < 5000; i++) {
    const ex = make()
    if (ex) return ex
  }
  throw new Error('tirage introuvable')
}
const fig = (ex: Exercise, figure: Figure): Exercise => withMeta(ex, { figure })
const titled = (title: string, ex: Exercise, figure?: Figure): Exercise => withMeta(ex, figure ? { title, figure } : { title })

// ── Quadrilatères ────────────────────────────────────────────────────────
const QN: [string, string, string, string][] = [['A', 'B', 'C', 'D'], ['E', 'F', 'G', 'H'], ['M', 'N', 'P', 'Q'], ['R', 'S', 'T', 'U'], ['K', 'L', 'M', 'N']]
const qn = () => pick(QN)
/** Noms de sommets qui n'utilisent pas les lettres réservées aux points ajoutés (E, F, K, O…). */
const qnFree = (used: string[]) => pick(QN.filter((q) => q.every((l) => !used.includes(l))))
/** Parallélogramme : base a (horizontale), côté b, angle al (en °) au premier sommet. */
function paraPts(a: number, b: number, al: number): [Pt, Pt, Pt, Pt] {
  const D = polar(b, al)
  return [[0, 0], [a, 0], [a + D[0], D[1]], D]
}
type Mark = 'tick' | 'tick2' | 'arrow' | 'arrow2'
interface QuadOpts {
  /** Étiquettes des côtés, dans l'ordre [N0N1], [N1N2], [N2N3], [N3N0]. */
  sides?: (string | undefined)[]
  marks?: (Mark | undefined)[]
  /** Angles droits codés aux sommets (indices 0 à 3). */
  right?: number[]
  /** Diagonales tracées (et centre nommé, s'il est donné). */
  diag?: string | boolean
  arcs?: Arc[]
  extra?: Record<string, Pt>
  segs?: FigSegment[]
  caption?: string
}
function quadFig(N: string[], P: Pt[], o: QuadOpts = {}): Figure {
  const raw: Record<string, Pt> = {}
  N.forEach((n, i) => { raw[n] = P[i] })
  // côtés [N2N3] et [N3N0] parcourus à l'envers : les flèches de parallélisme pointent dans le même sens
  const segs: FigSegment[] = N.map((n, i) => (i < 2 ? { a: n, b: N[i + 1] } : { a: N[(i + 1) % 4], b: n })).map((sg, i) => ({ ...sg, label: o.sides?.[i], mark: o.marks?.[i] }))
  const arcs: Arc[] = [...(o.arcs ?? [])]
  for (const i of o.right ?? []) arcs.push({ v: N[i], a: N[(i + 1) % 4], b: N[(i + 3) % 4], right: true })
  const hidden: string[] = []
  if (o.diag) {
    const O = typeof o.diag === 'string' ? o.diag : '_O'
    raw[O] = inter(P[0], P[2], P[1], P[3])
    if (typeof o.diag !== 'string') hidden.push(O)
    segs.push({ a: N[0], b: N[2], dashed: true }, { a: N[1], b: N[3], dashed: true })
  }
  Object.assign(raw, o.extra ?? {})
  return build(raw, { segs: [...segs, ...(o.segs ?? [])], arcs, hidden, caption: o.caption })
}
/** Codage « côtés opposés parallèles » d'un parallélogramme. */
const PAR_MARKS: Mark[] = ['arrow', 'arrow2', 'arrow', 'arrow2']
/** Mesure d'angle « dessinable » pour un parallélogramme non rectangle. */
function obl(lo = 40, hi = 140) {
  let v = randInt(lo, hi)
  while (Math.abs(v - 90) < 12) v = randInt(lo, hi)
  return v
}

// ═══ Palier 1 ═══════════════════════════════════════════════════════════
const p1Sides: Maker = variants(
  () => {
    const N = qn(), a = randInt(4, 15), b = randInt(2, 12), al = obl()
    return fig(numeric(`${N.join('')} est un parallélogramme avec ${N[0]}${N[1]} = ${a} cm et ${N[1]}${N[2]} = ${b} cm. Quel est son périmètre (en cm) ?`, 2 * (a + b), {
      explanation: `Les côtés opposés d'un parallélogramme ont la même longueur : ${N[2]}${N[3]} = ${a} cm et ${N[3]}${N[0]} = ${b} cm. Périmètre : 2 × (${a} + ${b}) = ${2 * (a + b)} cm.`,
    }), quadFig(N, paraPts(a * 0.4, b * 0.4, al), { sides: [`${a} cm`, `${b} cm`], marks: PAR_MARKS }))
  },
  fresh(() => {
    const N = qn(), a = randInt(4, 15), b = randInt(2, 12), al = obl()
    return fig(numeric(`Le parallélogramme ${N.join('')} a un périmètre de ${2 * (a + b)} cm, et ${N[0]}${N[1]} = ${a} cm. Combien mesure le côté [${N[1]}${N[2]}] (en cm) ?`, b, {
      explanation: `Le demi-périmètre vaut ${2 * (a + b)} ÷ 2 = ${a + b} cm, c'est ${N[0]}${N[1]} + ${N[1]}${N[2]}. Donc ${N[1]}${N[2]} = ${a + b} − ${a} = ${b} cm.`,
    }), quadFig(N, paraPts(a * 0.4, b * 0.4, al), { sides: [`${a} cm`, '?'], marks: PAR_MARKS }))
  }),
  () => {
    const N = qn(), c = randInt(3, 15), al = obl(50, 130)
    return fig(numeric(`${N.join('')} est un losange de côté ${c} cm. Quel est son périmètre (en cm) ?`, 4 * c, {
      explanation: `Les quatre côtés d'un losange ont la même longueur : 4 × ${c} = ${4 * c} cm.`,
    }), quadFig(N, paraPts(c * 0.4, c * 0.4, al), { sides: [`${c} cm`], marks: ['tick', 'tick', 'tick', 'tick'] }))
  },
  fresh(() => {
    const N = qn(), c = randInt(3, 15)
    return fig(numeric(`Un carré ${N.join('')} a un périmètre de ${4 * c} cm. Combien mesure son côté (en cm) ?`, c, {
      explanation: `Les quatre côtés d'un carré sont égaux : ${4 * c} ÷ 4 = ${c} cm.`,
    }), quadFig(N, paraPts(2, 2, 90), { marks: ['tick', 'tick', 'tick', 'tick'], right: [0] }))
  }),
  () => {
    const N = qn(), L = randInt(5, 15), l = randInt(2, L - 2)
    return fig(numeric(`Le rectangle ${N.join('')} mesure ${L} cm de long et ${l} cm de large. Quel est son périmètre (en cm) ?`, 2 * (L + l), {
      explanation: `Un rectangle est un parallélogramme : ses côtés opposés sont égaux. P = 2 × (${L} + ${l}) = ${2 * (L + l)} cm.`,
    }), quadFig(N, paraPts(L * 0.4, l * 0.4, 90), { sides: [`${L} cm`, `${l} cm`], right: [0, 1, 2, 3] }))
  },
)

/** Angle connu en N[k], angle cherché en N[q] dans un parallélogramme. */
function paraAngle(k: number, q: number, style: number): Exercise {
  const N = qn(), al = obl(45, 135)
  const vals = [al, 180 - al, al, 180 - al], v = vals[k], ans = vals[q]
  const opp = (k + 2) % 4 === q
  const prompt = [
    `${N.join('')} est un parallélogramme et l'angle en ${N[k]} mesure ${v}°. Combien mesure l'angle en ${N[q]} (en °) ?`,
    `Dans le parallélogramme ${N.join('')}, ${ang(N[(k + 3) % 4], N[k], N[(k + 1) % 4])} = ${v}°. Calcule ${ang(N[(q + 3) % 4], N[q], N[(q + 1) % 4])} (en °).`,
    `Sur la figure, ${N.join('')} est un parallélogramme. L'angle marqué en ${N[k]} vaut ${v}°. Quelle est la mesure de l'angle marqué « ? » en ${N[q]} (en °) ?`,
  ][style % 3]
  return fig(numeric(prompt, ans, {
    explanation: opp ? `Dans un parallélogramme, deux angles opposés ont la même mesure : ${ans}°.` : `Dans un parallélogramme, deux angles consécutifs sont supplémentaires : 180 − ${v} = ${ans}°.`,
  }), quadFig(N, paraPts(2.6, 1.8, al), { marks: PAR_MARKS, arcs: [{ v: N[k], a: N[(k + 1) % 4], b: N[(k + 3) % 4], label: deg(v) }, { v: N[q], a: N[(q + 1) % 4], b: N[(q + 3) % 4], label: '?', red: true }] }))
}
const p1Angles: Maker = variants(
  () => { const k = randInt(0, 3); return paraAngle(k, (k + 1) % 4, randInt(0, 2)) },
  () => { const k = randInt(0, 3); return paraAngle(k, (k + 3) % 4, randInt(0, 2)) },
  () => { const k = randInt(0, 3); return paraAngle(k, (k + 2) % 4, randInt(0, 2)) },
  () => { const k = randInt(0, 3); return paraAngle(k, (k + pick([1, 3])) % 4, randInt(0, 2)) },
  () => {
    const N = qn(), al = obl(45, 135)
    return fig(numeric(`${N.join('')} est un parallélogramme et ${ang(N[3], N[0], N[1])} = ${al}°. Quelle est la somme des angles en ${N[1]} et en ${N[3]} (en °) ?`, 2 * (180 - al), {
      explanation: `Les angles en ${N[1]} et en ${N[3]} sont consécutifs à l'angle en ${N[0]}, donc supplémentaires de ${al}° : chacun mesure ${180 - al}°. Somme : 2 × ${180 - al} = ${2 * (180 - al)}°.`,
    }), quadFig(N, paraPts(2.6, 1.8, al), { marks: PAR_MARKS, arcs: [{ v: N[0], a: N[1], b: N[3], label: deg(al) }] }))
  },
)

const p1Diagonals: Maker = variants(
  () => {
    const N = qn(), d = 2 * randInt(3, 15), al = obl()
    return fig(numeric(`${N.join('')} est un parallélogramme de centre O et la diagonale [${N[0]}${N[2]}] mesure ${d} cm. Combien mesure O${N[0]} (en cm) ?`, d / 2, {
      explanation: `Les diagonales d'un parallélogramme se coupent en leur milieu : O${N[0]} = ${d} ÷ 2 = ${d / 2} cm.`,
    }), quadFig(N, paraPts(2.8, 1.8, al), { diag: 'O', marks: PAR_MARKS }))
  },
  () => {
    const N = qn(), h = randInt(3, 25) / 2, al = obl()
    return fig(numeric(`Dans le parallélogramme ${N.join('')} de centre O, O${N[1]} = ${fmt(h)} cm. Quelle est la longueur de la diagonale [${N[1]}${N[3]}] (en cm) ?`, 2 * h, {
      explanation: `O est le milieu de [${N[1]}${N[3]}] : ${N[1]}${N[3]} = 2 × ${fmt(h)} = ${fmt(2 * h)} cm.`,
    }), quadFig(N, paraPts(2.8, 1.8, al), { diag: 'O', marks: PAR_MARKS }))
  },
  () => {
    const N = qn(), d = 2 * randInt(4, 15), L = 3, l = 1.8
    return fig(numeric(`${N.join('')} est un rectangle de centre O et la diagonale [${N[0]}${N[2]}] mesure ${d} cm. Combien mesure O${N[1]} (en cm) ?`, d / 2, {
      explanation: `Les diagonales d'un rectangle ont la même longueur et se coupent en leur milieu : ${N[1]}${N[3]} = ${d} cm, donc O${N[1]} = ${d} ÷ 2 = ${d / 2} cm.`,
    }), quadFig(N, paraPts(L, l, 90), { diag: 'O', right: [0, 1, 2, 3] }))
  },
  () => {
    const N = qn(), h = randInt(3, 15), L = 3, l = 1.8
    return fig(numeric(`${N.join('')} est un rectangle de centre O, avec O${N[0]} = ${h} cm. Quelle est la longueur de la diagonale [${N[1]}${N[3]}] (en cm) ?`, 2 * h, {
      explanation: `${N[0]}${N[2]} = 2 × ${h} = ${2 * h} cm (O est le milieu). Les diagonales d'un rectangle ont la même longueur : ${N[1]}${N[3]} = ${2 * h} cm.`,
    }), quadFig(N, paraPts(L, l, 90), { diag: 'O', right: [0, 1, 2, 3] }))
  },
)

const NATURES = ['parallélogramme', 'rectangle', 'losange', 'carré'] as const
type Nature = (typeof NATURES)[number]
/** Figure codée d'un quadrilatère de nature donnée. */
function natureFig(N: string[], nat: Nature, code: 'sides' | 'diag'): Figure {
  const al = obl(55, 125)
  const P = nat === 'carré' ? paraPts(2, 2, 90) : nat === 'rectangle' ? paraPts(3, 1.8, 90) : nat === 'losange' ? paraPts(2, 2, al) : paraPts(2.8, 1.7, al)
  if (code === 'sides') {
    const marks: (Mark | undefined)[] = nat === 'losange' || nat === 'carré' ? ['tick', 'tick', 'tick', 'tick'] : PAR_MARKS
    return quadFig(N, P, { marks, right: nat === 'rectangle' || nat === 'carré' ? [0] : [] })
  }
  const O = inter(P[0], P[2], P[1], P[3])
  const raw: Record<string, Pt> = { O }
  N.forEach((n, i) => { raw[n] = P[i] })
  const eqLen = nat === 'rectangle' || nat === 'carré', perp = nat === 'losange' || nat === 'carré'
  const segs: FigSegment[] = N.map((n, i) => ({ a: n, b: N[(i + 1) % 4] }))
  for (let i = 0; i < 4; i++) segs.push({ a: 'O', b: N[i], mark: eqLen ? 'tick' : i % 2 === 0 ? 'tick' : 'tick2' })
  return build(raw, { segs, arcs: perp ? [{ v: 'O', a: N[0], b: N[1], right: true }] : [] })
}
const NATURE_WHY: Record<Nature, string> = {
  parallélogramme: 'ses diagonales se coupent en leur milieu (ou : ses côtés opposés sont parallèles), sans autre propriété codée',
  rectangle: 'c’est un parallélogramme qui a un angle droit (ou dont les diagonales ont la même longueur)',
  losange: 'c’est un parallélogramme qui a deux côtés consécutifs de même longueur (ou dont les diagonales sont perpendiculaires)',
  carré: 'c’est à la fois un rectangle et un losange',
}
function natureEx(nat: Nature, code: 'sides' | 'diag'): Exercise {
  const N = qn()
  return fig(choice(pick([
    `D'après le codage de la figure, quelle est la nature exacte du quadrilatère ${N.join('')} ?`,
    `Observe le codage. Quel est le nom le plus précis du quadrilatère ${N.join('')} ?`,
    `${code === 'diag' ? 'Les diagonales du quadrilatère' : 'Le quadrilatère'} ${N.join('')} ${code === 'diag' ? 'sont codées sur la figure' : 'est codé sur la figure'}. Quelle est sa nature exacte ?`,
  ]), nat, [...NATURES], `${N.join('')} est un ${nat} : ${NATURE_WHY[nat]}.`), natureFig(N, nat, code))
}
const p1Nature: Maker = variants(
  () => natureEx(pick(NATURES), 'sides'),
  () => natureEx(pick(NATURES), 'diag'),
  () => natureEx(pick(['rectangle', 'losange'] as const), 'diag'),
  () => natureEx(pick(['carré', 'parallélogramme'] as const), pick(['sides', 'diag'] as const)),
)

// ═══ Palier 2 ═══════════════════════════════════════════════════════════
const p2Perimeters: Maker = variants(
  fresh(() => {
    const N = qn(), b = randInt(2, 9), k = pick([2, 3]), a = k * b, al = obl()
    return fig(numeric(`Dans le parallélogramme ${N.join('')}, le côté [${N[0]}${N[1]}] est ${k === 2 ? 'deux' : 'trois'} fois plus long que [${N[1]}${N[2]}], et le périmètre vaut ${2 * (a + b)} cm. Combien mesure ${N[1]}${N[2]} (en cm) ?`, b, {
      explanation: `Le demi-périmètre vaut ${a + b} cm = ${N[0]}${N[1]} + ${N[1]}${N[2]} = ${k} × ${N[1]}${N[2]} + ${N[1]}${N[2]} = ${k + 1} × ${N[1]}${N[2]}. Donc ${N[1]}${N[2]} = ${a + b} ÷ ${k + 1} = ${b} cm.`,
    }), quadFig(N, paraPts(a * 0.3, b * 0.3, al), { marks: PAR_MARKS }))
  }),
  fresh(() => {
    const N = qn(), b = randInt(2, 10), d = randInt(1, 6), a = b + d, al = obl()
    return fig(numeric(`Le parallélogramme ${N.join('')} a un périmètre de ${2 * (a + b)} cm, et ${N[0]}${N[1]} mesure ${d} cm de plus que ${N[1]}${N[2]}. Combien mesure ${N[0]}${N[1]} (en cm) ?`, a, {
      explanation: `Demi-périmètre : ${a + b} cm. Sans l'écart de ${d} cm, il reste ${a + b - d} cm à partager en deux : ${N[1]}${N[2]} = ${b} cm, et ${N[0]}${N[1]} = ${b} + ${d} = ${a} cm.`,
    }), quadFig(N, paraPts(a * 0.3, b * 0.3, al), { marks: PAR_MARKS }))
  }),
  fresh(() => {
    const N = qn(), L = randInt(5, 15), l = randInt(2, L - 1)
    return fig(numeric(`Un rectangle ${N.join('')} a un périmètre de ${2 * (L + l)} cm et une largeur de ${l} cm. Quelle est sa longueur (en cm) ?`, L, {
      explanation: `Demi-périmètre : ${2 * (L + l)} ÷ 2 = ${L + l} cm. Longueur : ${L + l} − ${l} = ${L} cm.`,
    }), quadFig(N, paraPts(L * 0.3, l * 0.3, 90), { sides: ['?', `${l} cm`], right: [0, 1, 2, 3] }))
  }),
  () => {
    const c = randInt(3, 12), n = randInt(2, 4)
    return fig(numeric(`On assemble ${n} losanges identiques de côté ${c} cm, posés côte à côte en partageant un côté, pour former une frise (voir la figure). Quel est le périmètre de la frise (en cm) ?`, (2 * n + 2) * c, {
      explanation: `La frise a ${n} côtés en haut, ${n} en bas et un côté à chaque bout : ${2 * n + 2} côtés de ${c} cm. Périmètre : ${2 * n + 2} × ${c} = ${(2 * n + 2) * c} cm.`,
    }), friezeFig(n))
  },
)
/** Frise de n losanges accolés. */
function friezeFig(n: number): Figure {
  const raw: Record<string, Pt> = {}, segs: FigSegment[] = [], hidden: string[] = []
  const D = polar(1.6, 60)
  for (let i = 0; i <= n; i++) {
    raw[`b${i}`] = [1.6 * i, 0]; raw[`t${i}`] = [1.6 * i + D[0], D[1]]; hidden.push(`b${i}`, `t${i}`)
    segs.push({ a: `b${i}`, b: `t${i}`, mark: 'tick' })
    if (i < n) segs.push({ a: `b${i}`, b: `b${i + 1}`, mark: 'tick' }, { a: `t${i}`, b: `t${i + 1}`, mark: 'tick' })
  }
  return build(raw, { segs, hidden, polys: [{ pts: [`b0`, `b${n}`, `t${n}`, `t0`], fill: '#e2b85c' }] })
}

const p2AngleRel: Maker = variants(
  () => {
    const N = qn(), k = pick([2, 3, 4, 5]), small = 180 / (k + 1), big = k * small, askBig = Math.random() < 0.5
    return fig(numeric(`Dans le parallélogramme ${N.join('')}, l'angle en ${N[0]} est ${k} fois plus grand que l'angle en ${N[1]}. Combien mesure l'angle en ${askBig ? N[0] : N[1]} (en °) ?`, askBig ? big : small, {
      explanation: `Les angles en ${N[0]} et ${N[1]} sont consécutifs, donc supplémentaires : ${N[1]} + ${k} × ${N[1]} = ${k + 1} × ${N[1]} = 180°. L'angle en ${N[1]} mesure 180 ÷ ${k + 1} = ${small}° et celui en ${N[0]} ${k} × ${small} = ${big}°.`,
    }), quadFig(N, paraPts(2.6, 1.8, big), { marks: PAR_MARKS, arcs: [{ v: N[askBig ? 0 : 1], a: N[askBig ? 1 : 2], b: N[askBig ? 3 : 0], label: '?', red: true }] }))
  },
  () => {
    const N = qn(), d = 2 * randInt(10, 50), small = (180 - d) / 2, big = small + d
    return fig(numeric(`Dans le parallélogramme ${N.join('')}, l'angle en ${N[1]} mesure ${d}° de plus que l'angle en ${N[0]}. Combien mesure l'angle en ${N[2]} (en °) ?`, small, {
      explanation: `Les angles en ${N[0]} et ${N[1]} sont supplémentaires : ${N[0]} = (180 − ${d}) ÷ 2 = ${small}° et ${N[1]} = ${big}°. L'angle en ${N[2]} est opposé à celui en ${N[0]} : ${small}°.`,
    }), quadFig(N, paraPts(2.6, 1.8, small), { marks: PAR_MARKS, arcs: [{ v: N[2], a: N[3], b: N[1], label: '?', red: true }] }))
  },
  fresh(() => {
    const N = qn(), al = obl(45, 135)
    return fig(numeric(`Dans le parallélogramme ${N.join('')}, la somme des angles en ${N[0]} et en ${N[2]} vaut ${2 * al}°. Combien mesure l'angle en ${N[3]} (en °) ?`, 180 - al, {
      explanation: `Les angles en ${N[0]} et ${N[2]} sont opposés, donc égaux : ${2 * al} ÷ 2 = ${al}° chacun. L'angle en ${N[3]} est consécutif à celui en ${N[0]} : 180 − ${al} = ${180 - al}°.`,
    }), quadFig(N, paraPts(2.6, 1.8, al), { marks: PAR_MARKS, arcs: [{ v: N[3], a: N[0], b: N[2], label: '?', red: true }] }))
  }),
  fresh(() => {
    const N = qn(), al = obl(45, 135)
    return fig(numeric(`Les angles en ${N[1]}, ${N[2]} et ${N[3]} du parallélogramme ${N.join('')} ont pour somme ${360 - al}°. Combien mesure l'angle en ${N[1]} (en °) ?`, 180 - al, {
      explanation: `La somme des quatre angles d'un quadrilatère vaut 360° : l'angle en ${N[0]} mesure 360 − ${360 - al} = ${al}°. L'angle en ${N[1]} lui est consécutif : 180 − ${al} = ${180 - al}°.`,
    }), quadFig(N, paraPts(2.6, 1.8, al), { marks: PAR_MARKS, arcs: [{ v: N[1], a: N[2], b: N[0], label: '?', red: true }] }))
  }),
)

/** Diagonales du losange (perpendiculaires) et du rectangle (triangles isocèles). */
const p2DiagAngles: Maker = variants(
  () => {
    const N = qn(), h = randInt(20, 70), w = 1.8
    const P: Pt[] = [[-w, 0], [0, -w * Math.tan(rad(h))], [w, 0], [0, w * Math.tan(rad(h))]]
    return fig(numeric(`${N.join('')} est un losange de centre O. L'angle ${ang('O', N[0], N[1])} mesure ${h}°. Combien mesure l'angle ${ang('O', N[1], N[0])} (en °) ?`, 90 - h, {
      explanation: `Les diagonales d'un losange sont perpendiculaires : le triangle ${N[0]}O${N[1]} est rectangle en O. ${ang('O', N[1], N[0])} = 90 − ${h} = ${90 - h}°.`,
    }), quadFig(N, P, { diag: 'O', marks: ['tick', 'tick', 'tick', 'tick'], arcs: [{ v: N[0], a: 'O', b: N[1], label: deg(h), r: 26 }, { v: N[1], a: 'O', b: N[0], label: '?', red: true }, { v: 'O', a: N[0], b: N[1], right: true }] }))
  },
  () => {
    const N = qn(), h = randInt(20, 70), w = 1.8
    const P: Pt[] = [[-w, 0], [0, -w * Math.tan(rad(h))], [w, 0], [0, w * Math.tan(rad(h))]]
    return fig(numeric(`${N.join('')} est un losange de centre O. L'angle ${ang(N[3], N[0], N[1])} mesure ${2 * h}°. Combien mesure l'angle ${ang(N[0], N[1], 'O')} (en °) ?`, 90 - h, {
      explanation: `La diagonale (${N[0]}${N[2]}) est un axe de symétrie du losange : elle partage l'angle en ${N[0]} en deux, ${ang('O', N[0], N[1])} = ${h}°. Les diagonales sont perpendiculaires : dans le triangle ${N[0]}O${N[1]} rectangle en O, ${ang(N[0], N[1], 'O')} = 90 − ${h} = ${90 - h}°.`,
    }), quadFig(N, P, { diag: 'O', marks: ['tick', 'tick', 'tick', 'tick'], arcs: [{ v: N[0], a: N[1], b: N[3], label: deg(2 * h), r: 24 }, { v: N[1], a: 'O', b: N[0], label: '?', red: true }] }))
  },
  () => {
    const N = qn(), h = randInt(25, 65), L = 3, l = L * Math.tan(rad(h))
    return fig(numeric(`${N.join('')} est un rectangle de centre O. L'angle ${ang('O', N[0], N[1])} mesure ${h}°. Combien mesure l'angle ${ang(N[0], 'O', N[1])} (en °) ?`, 180 - 2 * h, {
      explanation: `Les diagonales d'un rectangle ont la même longueur et se coupent en leur milieu : O${N[0]} = O${N[1]}. Le triangle ${N[0]}O${N[1]} est isocèle en O : ${ang('O', N[1], N[0])} = ${h}°, donc ${ang(N[0], 'O', N[1])} = 180 − 2 × ${h} = ${180 - 2 * h}°.`,
    }), quadFig(N, paraPts(L, l, 90), { diag: 'O', right: [0, 1, 2, 3], arcs: [{ v: N[0], a: N[2], b: N[1], label: deg(h), r: 30 }, { v: 'O', a: N[0], b: N[1], label: '?', red: true }] }))
  },
  () => {
    const N = qn(), t = 2 * randInt(30, 75), h = (180 - t) / 2, L = 3, l = L * Math.tan(rad(h))
    return fig(numeric(`${N.join('')} est un rectangle de centre O, et l'angle ${ang(N[0], 'O', N[1])} formé par les diagonales mesure ${t}°. Combien mesure l'angle ${ang('O', N[0], N[1])} (en °) ?`, h, {
      explanation: `O${N[0]} = O${N[1]} (diagonales de même longueur, qui se coupent en leur milieu) : le triangle ${N[0]}O${N[1]} est isocèle en O. ${ang('O', N[0], N[1])} = (180 − ${t}) ÷ 2 = ${h}°.`,
    }), quadFig(N, paraPts(L, l, 90), { diag: 'O', right: [0, 1, 2, 3], arcs: [{ v: 'O', a: N[0], b: N[1], label: deg(t) }, { v: N[0], a: N[2], b: N[1], label: '?', red: true, r: 30 }] }))
  },
)

const PROPS: { text: (N: string) => string; nat: Nature | 'aucun'; why: string }[] = [
  { text: (N) => `un parallélogramme ${N} dont les diagonales ont la même longueur`, nat: 'rectangle', why: 'un parallélogramme dont les diagonales ont la même longueur est un rectangle' },
  { text: (N) => `un parallélogramme ${N} qui a un angle droit`, nat: 'rectangle', why: 'un parallélogramme qui a un angle droit est un rectangle' },
  { text: (N) => `un parallélogramme ${N} dont les diagonales sont perpendiculaires`, nat: 'losange', why: 'un parallélogramme dont les diagonales sont perpendiculaires est un losange' },
  { text: (N) => `un parallélogramme ${N} qui a deux côtés consécutifs de même longueur`, nat: 'losange', why: 'un parallélogramme qui a deux côtés consécutifs égaux est un losange' },
  { text: (N) => `un parallélogramme ${N} dont les diagonales sont perpendiculaires et de même longueur`, nat: 'carré', why: 'diagonales de même longueur : rectangle ; perpendiculaires : losange ; les deux : carré' },
  { text: (N) => `un rectangle ${N} qui a deux côtés consécutifs de même longueur`, nat: 'carré', why: 'un rectangle qui est aussi un losange est un carré' },
  { text: (N) => `un losange ${N} qui a un angle droit`, nat: 'carré', why: 'un losange qui est aussi un rectangle est un carré' },
  { text: (N) => `un quadrilatère ${N} dont les diagonales se coupent en leur milieu`, nat: 'parallélogramme', why: 'un quadrilatère dont les diagonales ont le même milieu est un parallélogramme' },
  { text: (N) => `un quadrilatère ${N} dont les côtés opposés sont parallèles deux à deux`, nat: 'parallélogramme', why: 'c’est la définition du parallélogramme' },
  { text: (N) => `un quadrilatère ${N} qui a trois angles droits`, nat: 'rectangle', why: 'le quatrième angle mesure 360 − 3 × 90 = 90° : il a quatre angles droits' },
  { text: (N) => `un quadrilatère ${N} dont les quatre côtés ont la même longueur`, nat: 'losange', why: 'un quadrilatère qui a quatre côtés égaux est un losange' },
]
function propNature(filter: (n: Nature | 'aucun') => boolean): Exercise {
  const p = pick(PROPS.filter((x) => filter(x.nat))), N = qn().join('')
  return choice(pick([
    `Quelle est la nature exacte de ${p.text(N)} ?`,
    `On sait que ${N} est ${p.text(N).replace(` ${N}`, '')}. Quel est le nom le plus précis de ${N} ?`,
    `Complète : ${p.text(N)} est un…`,
  ]), p.nat as Nature, [...NATURES], `${N} est un ${p.nat} : ${p.why}.`)
}
const p2Props: Maker = variants(
  () => propNature((n) => n === 'rectangle'),
  () => propNature((n) => n === 'losange'),
  () => propNature((n) => n === 'carré'),
  () => propNature((n) => n === 'parallélogramme'),
  () => propNature(() => true),
)

// ═══ Palier 3 ═══════════════════════════════════════════════════════════
/** Parallélogramme et sa diagonale [BD] : angles alternes-internes et triangle. */
function diagTriangle(q: number): Exercise | null {
  const a = randInt(55, 125), b = randInt(20, 70), x = 180 - a - b
  if (x < 20 || Math.abs(a - 90) < 6) return null
  const AD = (5 * Math.sin(rad(b))) / Math.sin(rad(a + b))
  if (AD < 2.2 || AD > 5.5) return null
  const N = qn(), [A, B, C, D] = N
  const P = paraPts(5, AD, a)
  const base = { marks: PAR_MARKS, segs: [{ a: B, b: D }] as FigSegment[] }
  if (q === 0) {
    return fig(numeric(`${N.join('')} est un parallélogramme et on trace la diagonale [${B}${D}]. ${ang(D, A, B)} = ${a}° et ${ang(A, B, D)} = ${b}°. Combien mesure l'angle ${ang(D, B, C)} (en °) ?`, x, {
      explanation: `Dans le triangle ${A}${B}${D} : ${ang(A, D, B)} = 180 − ${a} − ${b} = ${x}°. (${A}${D}) // (${B}${C}) sont coupées par (${B}${D}) : ${ang(A, D, B)} et ${ang(D, B, C)} sont alternes-internes, donc égaux : ${x}°.`,
    }), quadFig(N, P, { ...base, arcs: [{ v: A, a: B, b: D, label: deg(a) }, { v: B, a: A, b: D, label: deg(b), r: 26 }, { v: B, a: D, b: C, label: '?', red: true, r: 18 }] }))
  }
  if (q === 1) {
    return fig(numeric(`Dans le parallélogramme ${N.join('')}, on trace la diagonale [${B}${D}]. On sait que ${ang(A, B, D)} = ${b}° et ${ang(D, B, C)} = ${x}°. Combien mesure l'angle ${ang(D, A, B)} (en °) ?`, a, {
      explanation: `${ang(A, B, C)} = ${b} + ${x} = ${b + x}°. Les angles en ${A} et ${B} sont consécutifs, donc supplémentaires : ${ang(D, A, B)} = 180 − ${b + x} = ${a}°.`,
    }), quadFig(N, P, { ...base, arcs: [{ v: B, a: A, b: D, label: deg(b), r: 26 }, { v: B, a: D, b: C, label: deg(x), r: 18 }, { v: A, a: B, b: D, label: '?', red: true }] }))
  }
  return fig(numeric(`${N.join('')} est un parallélogramme de diagonale [${B}${D}]. ${ang(B, C, D)} = ${a}° et ${ang(C, D, B)} = ${b}°. Combien mesure l'angle ${ang(A, D, B)} (en °) ?`, x, {
    explanation: `Dans le triangle ${B}${C}${D} : ${ang(C, B, D)} = 180 − ${a} − ${b} = ${x}°. (${A}${D}) // (${B}${C}) : ${ang(A, D, B)} et ${ang(C, B, D)} sont alternes-internes, donc ${ang(A, D, B)} = ${x}°.`,
  }), quadFig(N, P, { ...base, arcs: [{ v: C, a: D, b: B, label: deg(a) }, { v: D, a: B, b: C, label: deg(b), r: 26 }, { v: D, a: A, b: B, label: '?', red: true, r: 18 }] }))
}
const p3DiagTriangle: Maker = variants(
  () => retry(() => diagTriangle(0)),
  () => retry(() => diagTriangle(1)),
  () => retry(() => diagTriangle(2)),
  () => retry(() => diagTriangle(0)),
)

/** Rectangle : triangle formé par les demi-diagonales. */
const p3Rectangle: Maker = variants(
  () => {
    const N = qn(), d = 2 * randInt(3, 12), L = 3 * Math.sqrt(3), l = 3
    return fig(numeric(`${N.join('')} est un rectangle de centre O, de diagonale ${d} cm, et l'angle ${ang(N[0], 'O', N[3])} mesure 60°. Combien mesure le côté [${N[0]}${N[3]}] (en cm) ?`, d / 2, {
      explanation: `O${N[0]} = O${N[3]} = ${d} ÷ 2 = ${d / 2} cm (diagonales de même longueur, qui se coupent en leur milieu). Le triangle ${N[0]}O${N[3]} est isocèle en O avec un angle de 60° : ses deux autres angles mesurent (180 − 60) ÷ 2 = 60°. Il est équilatéral : ${N[0]}${N[3]} = ${d / 2} cm.`,
    }), quadFig(N, paraPts(L, l, 90), { diag: 'O', right: [0, 1, 2, 3], arcs: [{ v: 'O', a: N[3], b: N[0], label: '60°' }], sides: [undefined, undefined, undefined, '?'] }))
  },
  () => {
    const N = qn(), h = randInt(25, 65), L = 3, l = L * Math.tan(rad(h))
    return fig(numeric(`${N.join('')} est un rectangle de centre O. L'angle ${ang(N[2], N[0], N[1])} mesure ${h}°. Combien mesure l'angle ${ang(N[0], 'O', N[3])} (en °) ?`, 2 * h, {
      explanation: `Dans le triangle ${N[0]}O${N[1]}, isocèle en O : ${ang(N[0], 'O', N[1])} = 180 − 2 × ${h} = ${180 - 2 * h}°. Les angles ${ang(N[0], 'O', N[1])} et ${ang(N[0], 'O', N[3])} sont supplémentaires (${N[1]}, O, ${N[3]} alignés) : ${ang(N[0], 'O', N[3])} = 180 − ${180 - 2 * h} = ${2 * h}°.`,
    }), quadFig(N, paraPts(L, l, 90), { diag: 'O', right: [0, 1, 2, 3], arcs: [{ v: N[0], a: N[2], b: N[1], label: deg(h), r: 30 }, { v: 'O', a: N[3], b: N[0], label: '?', red: true }] }))
  },
  () => {
    const N = qn(), h = randInt(25, 65), L = 3, l = L * Math.tan(rad(h))
    return fig(numeric(`${N.join('')} est un rectangle de centre O et ${ang(N[2], N[0], N[1])} = ${h}°. Combien mesure l'angle ${ang(N[0], N[2], N[3])} (en °) ?`, h, {
      explanation: `(${N[0]}${N[1]}) // (${N[3]}${N[2]}) sont coupées par la diagonale (${N[0]}${N[2]}) : ${ang(N[1], N[0], N[2])} et ${ang(N[0], N[2], N[3])} sont alternes-internes, donc égaux : ${h}°.`,
    }), quadFig(N, paraPts(L, l, 90), { diag: 'O', right: [0, 1, 2, 3], arcs: [{ v: N[0], a: N[2], b: N[1], label: deg(h), r: 30 }, { v: N[2], a: N[3], b: N[0], label: '?', red: true, r: 30 }] }))
  },
  () => {
    const N = qn(), h = randInt(25, 65), L = 3, l = L * Math.tan(rad(h))
    return fig(numeric(`${N.join('')} est un rectangle de centre O. L'angle ${ang(N[2], N[0], N[1])} mesure ${h}°. Combien mesure l'angle ${ang('O', N[1], N[2])} (en °) ?`, 90 - h, {
      explanation: `Le triangle ${N[0]}O${N[1]} est isocèle en O : ${ang('O', N[1], N[0])} = ${h}°. L'angle en ${N[1]} est droit : ${ang('O', N[1], N[2])} = 90 − ${h} = ${90 - h}°.`,
    }), quadFig(N, paraPts(L, l, 90), { diag: 'O', right: [0, 2, 3], arcs: [{ v: N[0], a: N[2], b: N[1], label: deg(h), r: 30 }, { v: N[1], a: 'O', b: N[2], label: '?', red: true }] }))
  },
)

/** Losange : diagonales, angles, périmètre. */
const p3Rhombus: Maker = variants(
  () => {
    const N = qn(), al = 2 * randInt(25, 60), w = 1.8
    const P: Pt[] = [[-w, 0], [0, -w * Math.tan(rad(al / 2))], [w, 0], [0, w * Math.tan(rad(al / 2))]]
    return fig(numeric(`${N.join('')} est un losange et l'angle ${ang(N[3], N[0], N[1])} mesure ${al}°. Combien mesure l'angle ${ang(N[0], N[1], N[2])} (en °) ?`, 180 - al, {
      explanation: `Un losange est un parallélogramme : deux angles consécutifs sont supplémentaires. ${ang(N[0], N[1], N[2])} = 180 − ${al} = ${180 - al}°.`,
    }), quadFig(N, P, { marks: ['tick', 'tick', 'tick', 'tick'], arcs: [{ v: N[0], a: N[1], b: N[3], label: deg(al) }, { v: N[1], a: N[0], b: N[2], label: '?', red: true }] }))
  },
  () => {
    const N = qn(), al = 2 * randInt(25, 60), w = 1.8
    const P: Pt[] = [[-w, 0], [0, -w * Math.tan(rad(al / 2))], [w, 0], [0, w * Math.tan(rad(al / 2))]]
    return fig(numeric(`${N.join('')} est un losange de centre O et ${ang(N[3], N[0], N[1])} = ${al}°. Combien mesure l'angle ${ang(N[0], N[3], 'O')} (en °) ?`, 90 - al / 2, {
      explanation: `La diagonale (${N[0]}${N[2]}) partage l'angle en ${N[0]} en deux : ${ang('O', N[0], N[3])} = ${al / 2}°. Les diagonales sont perpendiculaires : dans le triangle ${N[0]}O${N[3]} rectangle en O, ${ang(N[0], N[3], 'O')} = 90 − ${al / 2} = ${90 - al / 2}°.`,
    }), quadFig(N, P, { diag: 'O', marks: ['tick', 'tick', 'tick', 'tick'], arcs: [{ v: N[0], a: N[1], b: N[3], label: deg(al), r: 26 }, { v: N[3], a: N[0], b: 'O', label: '?', red: true }] }))
  },
  () => {
    const N = qn(), c = randInt(3, 12)
    const Q: Pt[] = [[0, 0], polar(2, -30), [2 * Math.cos(rad(30)) * 2, 0], polar(2, 30)]
    return fig(numeric(`${N.join('')} est un losange de côté ${c} cm, et son angle en ${N[1]} mesure 120°. Combien mesure la diagonale [${N[1]}${N[3]}] (en cm) ?`, c, {
      explanation: `L'angle en ${N[0]} est supplémentaire de l'angle en ${N[1]} : 180 − 120 = 60°. Le triangle ${N[0]}${N[1]}${N[3]} est isocèle en ${N[0]} (${N[0]}${N[1]} = ${N[0]}${N[3]}) avec un angle de 60° : il est équilatéral. Donc ${N[1]}${N[3]} = ${c} cm.`,
    }), quadFig(N, Q, { marks: ['tick', 'tick', 'tick', 'tick'], segs: [{ a: N[1], b: N[3], dashed: true }], arcs: [{ v: N[1], a: N[2], b: N[0], label: '120°', at: 0.25 }] }))
  },
  fresh(() => {
    const N = qn(), c = randInt(3, 12), al = obl(50, 130)
    return fig(numeric(`Le périmètre du losange ${N.join('')} est ${4 * c} cm. Combien mesure ${N[1]}${N[2]} (en cm) ?`, c, {
      explanation: `Les quatre côtés d'un losange sont égaux : ${4 * c} ÷ 4 = ${c} cm.`,
    }), quadFig(N, paraPts(2, 2, al), { marks: ['tick', 'tick', 'tick', 'tick'] }))
  }),
)

/** Relation entre côtés et périmètres de figures composées. */
const p3Compose: Maker = variants(
  fresh(() => {
    const a = randInt(4, 12), b = randInt(2, 8), N = ['A', 'B', 'C', 'D'], al = obl()
    const P = paraPts(a * 0.3, b * 0.3, al), E: Pt = [P[1][0] + a * 0.3, 0], F: Pt = [P[2][0] + a * 0.3, P[2][1]]
    return fig(numeric(`Deux parallélogrammes identiques ABCD et BEFC, de côtés ${a} cm et ${b} cm, sont accolés le long de [BC] (voir la figure). Quel est le périmètre du grand parallélogramme AEFD (en cm) ?`, 2 * (2 * a + b), {
      explanation: `AE = AB + BE = ${a} + ${a} = ${2 * a} cm, DF = ${2 * a} cm, AD = EF = ${b} cm. Périmètre : 2 × (${2 * a} + ${b}) = ${2 * (2 * a + b)} cm.`,
    }), quadFig(N, P, { sides: [`${a} cm`, undefined, undefined, `${b} cm`], extra: { E, F }, segs: [{ a: 'B', b: 'E' }, { a: 'E', b: 'F' }, { a: 'F', b: 'C' }] }))
  }),
  fresh(() => {
    const c = randInt(3, 9), k = randInt(2, 4)
    return fig(numeric(`On accole ${k} carrés identiques de côté ${c} cm en ligne pour former un rectangle. Quel est le périmètre de ce rectangle (en cm) ?`, 2 * (k * c + c), {
      explanation: `Le rectangle mesure ${k} × ${c} = ${k * c} cm sur ${c} cm. Périmètre : 2 × (${k * c} + ${c}) = ${2 * (k * c + c)} cm.`,
    }), squaresRow(k))
  }),
  fresh(() => {
    const L = randInt(6, 14), l = randInt(2, L - 2), N = qn()
    return fig(numeric(`On découpe un rectangle de ${L} cm sur ${l} cm en deux rectangles égaux, en coupant ses longueurs en leur milieu. Quel est le périmètre de chacun des petits rectangles (en cm) ?`, 2 * (L / 2 + l), {
      explanation: `Chaque petit rectangle mesure ${fmt(L / 2)} cm sur ${l} cm. Périmètre : 2 × (${fmt(L / 2)} + ${l}) = ${fmt(2 * (L / 2 + l))} cm.`,
    }), quadFig(N, paraPts(L * 0.3, l * 0.3, 90), { sides: [`${L} cm`, `${l} cm`], right: [0], extra: { _m: [L * 0.15, 0], _n: [L * 0.15, l * 0.3] }, segs: [{ a: '_m', b: '_n', dashed: true }] }))
  }),
  fresh(() => {
    const N = qn(), b = randInt(2, 8), a = randInt(b + 1, 14), al = obl()
    return fig(numeric(`Le parallélogramme ${N.join('')} a un périmètre de ${2 * (a + b)} cm et ${N[2]}${N[3]} = ${a} cm. Combien mesure ${N[3]}${N[0]} (en cm) ?`, b, {
      explanation: `${N[0]}${N[1]} = ${N[2]}${N[3]} = ${a} cm (côtés opposés). Demi-périmètre : ${a + b} cm = ${N[0]}${N[1]} + ${N[3]}${N[0]}, donc ${N[3]}${N[0]} = ${a + b} − ${a} = ${b} cm.`,
    }), quadFig(N, paraPts(a * 0.3, b * 0.3, al), { sides: [undefined, undefined, `${a} cm`, '?'], marks: PAR_MARKS }))
  }),
)
function squaresRow(k: number): Figure {
  const raw: Record<string, Pt> = {}, segs: FigSegment[] = [], hidden: string[] = []
  for (let i = 0; i <= k; i++) {
    raw[`b${i}`] = [i, 0]; raw[`t${i}`] = [i, 1]; hidden.push(`b${i}`, `t${i}`)
    segs.push({ a: `b${i}`, b: `t${i}` })
    if (i < k) segs.push({ a: `b${i}`, b: `b${i + 1}` }, { a: `t${i}`, b: `t${i + 1}` })
  }
  return build(raw, { segs, hidden, polys: [{ pts: ['b0', `b${k}`, `t${k}`, 't0'], fill: '#e2b85c' }] })
}

// ═══ Palier 4 ═══════════════════════════════════════════════════════════
/** Parallélogramme et triangle isocèle : E sur [DC] avec AE = AD. */
function isoInPara(q: number): Exercise | null {
  const a = randInt(100, 140), m = 3, L = randInt(55, 75) / 10, N = qnFree(['E']), [A, B, C, D] = N
  const P = paraPts(L, m, a), DE = 2 * m * Math.cos(rad(180 - a))
  if (DE > L - 0.8) return null
  const E: Pt = [P[3][0] + DE, P[3][1]]
  const e = 180 - a, dae = 2 * a - 180
  const asks = [
    { arc: { v: A, a: D, b: 'E', label: '?', red: true, r: 26 } as Arc, ans: dae, t: ang(D, A, 'E') },
    { arc: { v: A, a: 'E', b: B, label: '?', red: true, r: 26 } as Arc, ans: e, t: ang('E', A, B) },
    { arc: { v: 'E', a: A, b: C, label: '?', red: true } as Arc, ans: 180 - e, t: ang(A, 'E', C) },
  ][q]
  return fig(numeric(`${N.join('')} est un parallélogramme et ${ang(A, B, C)} = ${e}°. Le point E est sur le côté [${D}${C}] et vérifie ${A}E = ${A}${D}. Combien mesure l'angle ${asks.t} (en °) ?`, asks.ans, {
    explanation: `Angles opposés : ${ang(A, D, C)} = ${ang(A, B, C)} = ${e}°. Le triangle ${A}${D}E est isocèle en ${A} : ${ang(A, 'E', D)} = ${ang(A, D, 'E')} = ${e}°${q === 0 ? `, donc ${ang(D, A, 'E')} = 180 − 2 × ${e} = ${dae}°.` : q === 1 ? `. (${A}${B}) // (${D}${C}) coupées par (${A}E) : ${ang('E', A, B)} et ${ang(A, 'E', D)} sont alternes-internes, donc ${ang('E', A, B)} = ${e}°.` : `. Les angles ${ang(A, 'E', D)} et ${ang(A, 'E', C)} sont supplémentaires : ${ang(A, 'E', C)} = 180 − ${e} = ${180 - e}°.`}`,
  }), quadFig(N, P, { extra: { E }, segs: [{ a: A, b: 'E', mark: 'tick' }, { a: D, b: A, mark: 'tick', color: 'transparent' }], arcs: [{ v: B, a: C, b: A, label: deg(e) }, asks.arc] }))
}
const p4Iso: Maker = variants(
  () => retry(() => isoInPara(0)),
  () => retry(() => isoInPara(1)),
  () => retry(() => isoInPara(2)),
  () => retry(() => isoInPara(0)),
)

/** Bissectrice de l'angle en A qui coupe [DC] en E : ADE isocèle. */
function bisectorPara(q: number): Exercise | null {
  const ad = randInt(3, 8), ab = ad + randInt(2, 6), al = obl(50, 130), N = qnFree(['E']), [A, B, C, D] = N
  const P = paraPts(ab * 0.45, ad * 0.45, al), E: Pt = [P[3][0] + ad * 0.45, P[3][1]]
  const raw = { E }
  if (q === 0) {
    return fig(numeric(`${N.join('')} est un parallélogramme avec ${A}${B} = ${ab} cm et ${A}${D} = ${ad} cm. La bissectrice de l'angle ${ang(D, A, B)} coupe [${D}${C}] en E. Combien mesure E${C} (en cm) ?`, ab - ad, {
      explanation: `(${A}${B}) // (${D}${C}) : ${ang(D, 'E', A)} = ${ang('E', A, B)} (alternes-internes) = ${ang(D, A, 'E')} (bissectrice). Le triangle ${A}${D}E est isocèle en ${D} : ${D}E = ${A}${D} = ${ad} cm. Puis ${D}${C} = ${A}${B} = ${ab} cm, donc E${C} = ${ab} − ${ad} = ${ab - ad} cm.`,
    }), quadFig(N, P, { extra: raw, sides: [`${ab} cm`, undefined, undefined, `${ad} cm`], segs: [{ a: A, b: 'E', color: BLUE }], arcs: [{ v: A, a: B, b: 'E', r: 24, color: BLUE }, { v: A, a: 'E', b: D, r: 28, color: BLUE }] }))
  }
  if (q === 1) {
    return fig(numeric(`${N.join('')} est un parallélogramme et ${ang(D, A, B)} = ${al}°. La bissectrice de l'angle ${ang(D, A, B)} coupe [${D}${C}] en E. Combien mesure l'angle ${ang(A, 'E', D)} (en °) ?`, al / 2, {
      explanation: `La bissectrice donne ${ang('E', A, B)} = ${al} ÷ 2 = ${fmt(al / 2)}°. (${A}${B}) // (${D}${C}) coupées par (${A}E) : ${ang(A, 'E', D)} et ${ang('E', A, B)} sont alternes-internes, donc ${ang(A, 'E', D)} = ${fmt(al / 2)}°.`,
    }), quadFig(N, P, { extra: raw, segs: [{ a: A, b: 'E', color: BLUE }], arcs: [{ v: A, a: B, b: D, label: deg(al), r: 18 }, { v: 'E', a: A, b: D, label: '?', red: true }] }))
  }
  return fig(numeric(`${N.join('')} est un parallélogramme avec ${A}${D} = ${ad} cm. La bissectrice de l'angle ${ang(D, A, B)} coupe [${D}${C}] en E, et E${C} = ${ab - ad} cm. Combien mesure ${A}${B} (en cm) ?`, ab, {
    explanation: `Alternes-internes et bissectrice : ${ang(D, 'E', A)} = ${ang('E', A, B)} = ${ang(D, A, 'E')}, donc ${A}${D}E est isocèle en ${D} et ${D}E = ${ad} cm. ${A}${B} = ${D}${C} = ${D}E + E${C} = ${ad} + ${ab - ad} = ${ab} cm.`,
  }), quadFig(N, P, { extra: raw, sides: ['?', undefined, undefined, `${ad} cm`], segs: [{ a: A, b: 'E', color: BLUE }] }))
}
const p4Bisector: Maker = variants(
  () => retry(() => bisectorPara(0)),
  () => retry(() => bisectorPara(1)),
  () => retry(() => bisectorPara(2)),
  () => retry(() => bisectorPara(0)),
)

/** Carré et triangle équilatéral (intérieur ou extérieur). */
function squareEqui(out: boolean, q: number, names?: [string, string, string, string]): Exercise {
  const N = names ?? qnFree(['E']), [A, B, C, D] = N
  const P = paraPts(4, 4, 90), E = polar(4, out ? -60 : 60)
  const dae = out ? 150 : 30, ade = (180 - dae) / 2
  const asks = [
    { arc: { v: 'E', a: A, b: D, label: '?', red: true } as Arc, ans: ade, t: ang(A, 'E', D) },
    { arc: { v: D, a: C, b: 'E', label: '?', red: true } as Arc, ans: 90 - ade, t: ang(C, D, 'E') },
    { arc: { v: A, a: D, b: 'E', label: '?', red: true, r: 26, at: 0.3 } as Arc, ans: dae, t: ang(D, A, 'E') },
  ][q]
  return fig(numeric(`${N.join('')} est un carré. Le triangle ${A}${B}E est équilatéral, et E est ${out ? 'à l’extérieur' : 'à l’intérieur'} du carré. Combien mesure l'angle ${asks.t} (en °) ?`, asks.ans, {
    explanation: `${ang(D, A, 'E')} = ${out ? '90 + 60 = 150' : '90 − 60 = 30'}°. ${A}E = ${A}${B} = ${A}${D} : le triangle ${A}${D}E est isocèle en ${A}${q === 2 ? '.' : `, donc ${ang(A, D, 'E')} = ${ang(A, 'E', D)} = (180 − ${dae}) ÷ 2 = ${ade}°.${q === 1 ? ` Enfin ${ang(C, D, 'E')} = 90 − ${ade} = ${90 - ade}°.` : ''}`}`,
  }), quadFig(N, P, { marks: ['tick', 'tick', 'tick', 'tick'], right: [2], extra: { E }, segs: [{ a: A, b: 'E', mark: 'tick' }, { a: B, b: 'E', mark: 'tick' }, { a: D, b: 'E' }], arcs: [asks.arc] }))
}
const p4Square: Maker = variants(
  () => squareEqui(false, 0),
  () => squareEqui(true, 0),
  () => squareEqui(false, 1),
  () => squareEqui(pick([true, false]), 2),
)

/** Reconnaître la nature exacte à partir de données (avec piège). */
const NAT5 = ['parallélogramme', 'rectangle', 'losange', 'carré', 'on ne peut pas conclure'] as const
function dataNature(kind: number): Exercise {
  const N = qn(), [A, B, C, D] = N, Q = N.join('')
  const a = randInt(4, 12), b = randInt(2, 12), al = obl(50, 130)
  const cases: { text: string; nat: (typeof NAT5)[number]; why: string }[] = [
    { text: `${Q} est un quadrilatère avec ${A}${B} = ${C}${D} = ${a} cm, ${B}${C} = ${D}${A} = ${a + 2} cm et ${ang(D, A, B)} = 90°.`, nat: 'rectangle', why: `ses côtés opposés sont égaux deux à deux : c'est un parallélogramme ; il a un angle droit : c'est un rectangle (ses côtés consécutifs ne sont pas égaux, ce n'est pas un carré).` },
    { text: `Les diagonales du quadrilatère ${Q} se coupent en leur milieu O, avec O${A} = O${B} = ${fmt(a / 2)} cm.`, nat: 'rectangle', why: `les diagonales ont le même milieu (parallélogramme) et la même longueur ${a} cm : c'est un rectangle (rien ne dit qu'elles sont perpendiculaires).` },
    { text: `${Q} est un parallélogramme avec ${A}${B} = ${b} cm, ${B}${C} = ${b} cm et ${ang(A, B, C)} = ${al}°.`, nat: 'losange', why: `un parallélogramme avec deux côtés consécutifs égaux est un losange ; son angle n'est pas droit, ce n'est pas un carré.` },
    { text: `${Q} est un losange et ses diagonales [${A}${C}] et [${B}${D}] mesurent toutes les deux ${a} cm.`, nat: 'carré', why: `un losange est un parallélogramme ; ses diagonales ont la même longueur : c'est aussi un rectangle. C'est donc un carré.` },
    { text: `${Q} est un quadrilatère avec ${A}${B} = ${C}${D} = ${a} cm.`, nat: 'on ne peut pas conclure', why: `deux côtés opposés de même longueur ne suffisent pas (un trapèze isocèle a aussi cette propriété).` },
    { text: `${Q} est un quadrilatère dont les angles mesurent ${al}°, ${180 - al}°, ${al}° et ${180 - al}° (dans l'ordre ${A}, ${B}, ${C}, ${D}).`, nat: 'parallélogramme', why: `ses angles opposés sont égaux deux à deux (et ses angles consécutifs supplémentaires) : c'est un parallélogramme, sans angle droit ni côtés égaux connus.` },
    { text: `${Q} est un quadrilatère dont les diagonales sont perpendiculaires.`, nat: 'on ne peut pas conclure', why: `sans savoir que les diagonales se coupent en leur milieu, on ne peut rien dire (un cerf-volant a des diagonales perpendiculaires).` },
    { text: `${Q} est un rectangle dont les diagonales sont perpendiculaires.`, nat: 'carré', why: `un rectangle dont les diagonales sont perpendiculaires est aussi un losange : c'est un carré.` },
  ]
  const c = cases[kind % cases.length]
  return choice(`${c.text} Quelle est la nature exacte de ${Q} ?`, c.nat, [...NAT5].filter((x) => x !== c.nat).slice(0, 4), `Réponse : ${c.nat}. En effet, ${c.why}`)
}
const p4Nature: Maker = variants(
  () => dataNature(pick([0, 1])),
  () => dataNature(pick([2, 3])),
  () => dataNature(pick([4, 6])),
  () => dataNature(pick([5, 7])),
)

// ═══ Palier 5 ═══════════════════════════════════════════════════════════
/** Bissectrices de deux angles consécutifs : elles se coupent à angle droit. */
function twoBisectors(q: number): Exercise | null {
  const al = 2 * Math.round(obl(50, 130) / 2), N = qnFree(['K']), [A, B, C, D] = N
  const ab = 4, ad = 2.6, P = paraPts(ab, ad, al)
  const dA = polar(1, al / 2), dB = polar(1, 180 - (180 - al) / 2)
  const K = inter(P[0], [dA[0], dA[1]], P[1], [P[1][0] + dB[0], dB[1]])
  if (K[1] > P[3][1] - 0.2) return null
  const asks = [
    { arc: { v: 'K', a: A, b: B, label: '?', red: true } as Arc, ans: 90, t: `l'angle ${ang(A, 'K', B)}`, why: '' },
    { arc: { v: B, a: A, b: 'K', label: '?', red: true } as Arc, ans: (180 - al) / 2, t: `l'angle ${ang(A, B, 'K')}`, why: '' },
    { arc: { v: 'K', a: A, b: B, label: '?', red: true } as Arc, ans: 90, t: `l'angle ${ang(A, 'K', B)}`, why: '' },
  ][q]
  if (q === 2) {
    return fig(numeric(`${N.join('')} est un parallélogramme quelconque. Les bissectrices des angles ${ang(D, A, B)} et ${ang(A, B, C)} se coupent en K. Sans connaître les angles du parallélogramme, que vaut toujours l'angle ${ang(A, 'K', B)} (en °) ?`, 90, {
      explanation: `Les angles en ${A} et ${B} sont supplémentaires : ${A} + ${B} = 180°. Les bissectrices en prennent la moitié : ${ang('K', A, B)} + ${ang('K', B, A)} = 90°. Dans le triangle ${A}K${B} : ${ang(A, 'K', B)} = 180 − 90 = 90°.`,
    }), quadFig(N, P, { marks: PAR_MARKS, extra: { K }, segs: [{ a: A, b: 'K', color: BLUE }, { a: B, b: 'K', color: BLUE }], arcs: [asks.arc] }))
  }
  return fig(numeric(`${N.join('')} est un parallélogramme et ${ang(D, A, B)} = ${al}°. Les bissectrices des angles ${ang(D, A, B)} et ${ang(A, B, C)} se coupent en K. Combien mesure ${asks.t} (en °) ?`, asks.ans, {
    explanation: `${ang(A, B, C)} = 180 − ${al} = ${180 - al}° (angles consécutifs). Bissectrices : ${ang('K', A, B)} = ${fmt(al / 2)}° et ${ang('K', B, A)} = ${fmt((180 - al) / 2)}°.${q === 0 ? ` Dans le triangle ${A}K${B} : ${ang(A, 'K', B)} = 180 − ${fmt(al / 2)} − ${fmt((180 - al) / 2)} = 90°.` : ''}`,
  }), quadFig(N, P, { marks: PAR_MARKS, extra: { K }, segs: [{ a: A, b: 'K', color: BLUE }, { a: B, b: 'K', color: BLUE }], arcs: [{ v: A, a: B, b: D, label: deg(al), r: 18 }, asks.arc] }))
}
const p5Bisectors: Maker = variants(
  () => retry(() => twoBisectors(0)),
  () => retry(() => twoBisectors(1)),
  () => retry(() => twoBisectors(2)),
  () => retry(() => twoBisectors(1)),
)

/** Deux bissectrices (en A et en B) qui coupent [DC] en E et F. */
function bisectorsEF(q: number): Exercise | null {
  const ad = randInt(2, 6), ab = 2 * ad + randInt(1, 6), al = obl(55, 125), N = qnFree(['E', 'F']), [A, B, C, D] = N
  const k = 0.42, P = paraPts(ab * k, ad * k, al)
  const E: Pt = [P[3][0] + ad * k, P[3][1]], F: Pt = [P[2][0] - ad * k, P[2][1]]
  const ef = ab - 2 * ad
  if (q === 0) {
    return fig(numeric(`${N.join('')} est un parallélogramme avec ${A}${B} = ${ab} cm et ${A}${D} = ${ad} cm. Les bissectrices des angles en ${A} et en ${B} coupent [${D}${C}] en E et F. Combien mesure EF (en cm) ?`, ef, {
      explanation: `Bissectrice + alternes-internes : le triangle ${A}${D}E est isocèle en ${D}, donc ${D}E = ${ad} cm. De même, ${B}${C}F est isocèle en ${C} : ${C}F = ${B}${C} = ${ad} cm. ${D}${C} = ${ab} cm, donc EF = ${ab} − ${ad} − ${ad} = ${ef} cm.`,
    }), quadFig(N, P, { extra: { E, F }, sides: [`${ab} cm`, undefined, undefined, `${ad} cm`], segs: [{ a: A, b: 'E', color: BLUE }, { a: B, b: 'F', color: BLUE }] }))
  }
  return fig(numeric(`${N.join('')} est un parallélogramme avec ${A}${D} = ${ad} cm. Les bissectrices des angles en ${A} et en ${B} coupent [${D}${C}] en E et F, et EF = ${ef} cm. Quel est le périmètre de ${N.join('')} (en cm) ?`, 2 * (ab + ad), {
    explanation: `Les triangles ${A}${D}E et ${B}${C}F sont isocèles (bissectrices et angles alternes-internes) : ${D}E = ${C}F = ${ad} cm. ${D}${C} = ${ad} + ${ef} + ${ad} = ${ab} cm. Périmètre : 2 × (${ab} + ${ad}) = ${2 * (ab + ad)} cm.`,
  }), quadFig(N, P, { extra: { E, F }, sides: [undefined, undefined, undefined, `${ad} cm`], segs: [{ a: A, b: 'E', color: BLUE }, { a: B, b: 'F', color: BLUE }] }))
}
const p5EF: Maker = variants(
  () => retry(() => bisectorsEF(0)),
  () => retry(() => bisectorsEF(1)),
  () => retry(() => bisectorsEF(0)),
)

/** Parallélogramme ABCD avec BD = BC : triangle isocèle. */
function bdEqualsBc(q: number): Exercise | null {
  const a = randInt(50, 80), N = qnFree([]), [A, B, C, D] = N
  // angle en A = a ; on veut BD = BC = AD : triangle ABD isocèle en D avec angle ABD = a
  const ad = 2.4, ab = 2 * ad * Math.cos(rad(a))
  if (ab < 1.6) return null
  const P = paraPts(ab, ad, a)
  const asks = [
    { arc: { v: B, a: D, b: C, label: '?', red: true, r: 22 } as Arc, ans: 180 - 2 * a, t: ang(D, B, C) },
    { arc: { v: B, a: A, b: D, label: '?', red: true, r: 22 } as Arc, ans: a, t: ang(A, B, D) },
    { arc: { v: D, a: A, b: B, label: '?', red: true } as Arc, ans: 180 - 2 * a, t: ang(A, D, B) },
  ][q]
  return fig(numeric(`${N.join('')} est un parallélogramme tel que ${B}${D} = ${B}${C}, et ${ang(D, A, B)} = ${a}°. Combien mesure l'angle ${asks.t} (en °) ?`, asks.ans, {
    explanation: `Angles opposés : ${ang(B, C, D)} = ${a}°. Le triangle ${B}${C}${D} est isocèle en ${B} : ${ang(B, D, C)} = ${a}° et ${ang(D, B, C)} = 180 − 2 × ${a} = ${180 - 2 * a}°.${q === 1 ? ` (${A}${B}) // (${D}${C}) : ${ang(A, B, D)} et ${ang(B, D, C)} sont alternes-internes, donc ${ang(A, B, D)} = ${a}°.` : q === 2 ? ` (${A}${D}) // (${B}${C}) : ${ang(A, D, B)} et ${ang(D, B, C)} sont alternes-internes, donc ${ang(A, D, B)} = ${180 - 2 * a}°.` : ''}`,
  }), quadFig(N, P, { segs: [{ a: B, b: D, mark: 'tick' }, { a: C, b: B, mark: 'tick', color: 'transparent' }], arcs: [{ v: A, a: B, b: D, label: deg(a) }, asks.arc] }))
}
const p5Iso: Maker = variants(
  () => retry(() => bdEqualsBc(0)),
  () => retry(() => bdEqualsBc(2)),
  () => retry(() => bdEqualsBc(0)),
  () => retry(() => bdEqualsBc(2)),
  () => retry(() => bdEqualsBc(1)),
)

/** Rectangle : angle entre les diagonales et angles aux sommets. */
function rectDiag(q: number): Exercise {
  const t = 2 * randInt(30, 75), N = qnFree(['O']), [A, B, C] = N
  // t = angle BOC (diagonales) ; triangle BOC isocèle en O : OBC = OCB = (180 − t)/2 ; angle ACB = (180 − t)/2
  const h = (180 - t) / 2
  const L = 3, l = L * Math.tan(rad(90 - h))
  const P: Pt[] = paraPts(L, l, 90)
  const asks = [
    { arc: { v: C, a: A, b: B, label: '?', red: true, r: 30 } as Arc, ans: h, t: ang(A, C, B) },
    { arc: { v: A, a: B, b: C, label: '?', red: true, r: 30 } as Arc, ans: 90 - h, t: ang(B, A, C) },
    { arc: { v: 'O', a: A, b: B, label: '?', red: true } as Arc, ans: 180 - t, t: ang(A, 'O', B) },
  ][q]
  return fig(numeric(`${N.join('')} est un rectangle de centre O, et l'angle ${ang(B, 'O', C)} formé par ses diagonales mesure ${t}°. Combien mesure l'angle ${asks.t} (en °) ?`, asks.ans, {
    explanation: q === 2
      ? `${ang(A, 'O', B)} et ${ang(B, 'O', C)} sont supplémentaires (${A}, O, ${C} alignés) : 180 − ${t} = ${180 - t}°.`
      : `O${B} = O${C} (diagonales égales qui se coupent en leur milieu) : ${B}O${C} est isocèle en O, donc ${ang('O', C, B)} = (180 − ${t}) ÷ 2 = ${h}°, c'est ${ang(A, C, B)}.${q === 1 ? ` Dans le triangle ${A}${B}${C} rectangle en ${B} : ${ang(B, A, C)} = 90 − ${h} = ${90 - h}°.` : ''}`,
  }), quadFig(N, P, { diag: 'O', right: [0, 1, 2, 3].filter((i) => i !== (q === 1 ? 0 : 2)), arcs: [{ v: 'O', a: B, b: C, label: deg(t) }, asks.arc] }))
}
const p5Rect: Maker = variants(() => rectDiag(0), () => rectDiag(1), () => rectDiag(2), () => rectDiag(0))

// ═══ Problèmes d'amélioration ═══════════════════════════════════════════
const up1: Maker[] = [
  () => {
    const d = randInt(60, 160), wOk = Math.random() < 0.5, d2 = wOk ? d : d + pick([-1, 1]) * randInt(2, 6)
    const L = 3, l = 2
    return withMeta(choice(`Un menuisier fabrique un cadre de fenêtre. Il a vérifié que les côtés opposés sont égaux deux à deux : c'est un parallélogramme. Il mesure ensuite les diagonales : ${d} cm et ${d2} cm. Le cadre est-il rectangulaire ?`, wOk ? 'Oui' : 'Non', ['Oui', 'Non'],
      wOk ? `Un parallélogramme dont les diagonales ont la même longueur est un rectangle : le cadre est rectangulaire.` : `Si le cadre était un rectangle, ses diagonales auraient la même longueur. Or ${d} ≠ ${d2} : il n'est pas rectangulaire.`),
    { title: 'Le cadre de la fenêtre', figure: quadFig(['A', 'B', 'C', 'D'], paraPts(L, l, wOk ? 90 : 84), { diag: true, marks: PAR_MARKS }) })
  },
  () => {
    const c = randInt(8, 25), al = 2 * randInt(20, 35), N = ['A', 'B', 'C', 'D']
    const q = randInt(0, 1)
    return withMeta(numeric(q === 0
      ? `Le vitrail d'une lanterne a la forme d'un losange ABCD de côté ${c} cm, dont l'angle ${ang('D', 'A', 'B')} mesure ${al}°. On entoure le vitrail d'un filet de plomb. Quelle longueur de plomb faut-il (en cm) ?`
      : `Le vitrail d'une lanterne a la forme d'un losange ABCD dont l'angle ${ang('D', 'A', 'B')} mesure ${al}°. Combien mesure l'angle ${ang('A', 'B', 'C')} (en °) ?`, q === 0 ? 4 * c : 180 - al, {
      explanation: q === 0 ? `Les quatre côtés du losange sont égaux : 4 × ${c} = ${4 * c} cm.` : `Un losange est un parallélogramme : ses angles consécutifs sont supplémentaires, 180 − ${al} = ${180 - al}°.`,
    }), { title: 'Le losange de la lanterne', figure: quadFig(N, paraPts(2.2, 2.2, al), { marks: ['tick', 'tick', 'tick', 'tick'], sides: q === 0 ? [`${c} cm`] : [], arcs: [{ v: 'A', a: 'B', b: 'D', label: deg(al), r: 26 }, ...(q === 1 ? [{ v: 'B', a: 'C', b: 'A', label: '?', red: true }] : [])] }) })
  },
  () => retry(() => {
    const k = pick([2, 3, 4]), extra = 5 * randInt(1, 4), N = qn()
    // A = k × B + extra ; A + B = 180
    const b = (180 - extra) / (k + 1)
    if (!Number.isInteger(b)) return null
    const a = 180 - b
    return withMeta(numeric(`Dans le parallélogramme ${N.join('')}, l'angle en ${N[0]} mesure ${extra}° de plus que ${k} fois l'angle en ${N[1]}. Combien mesure l'angle en ${N[2]} (en °) ?`, a, {
      explanation: `Les angles en ${N[0]} et ${N[1]} sont supplémentaires : ${k} × ${N[1]} + ${extra} + ${N[1]} = 180, soit ${k + 1} × ${N[1]} = ${180 - extra}, donc ${N[1]} = ${b}°. L'angle en ${N[0]} vaut ${a}°, et l'angle en ${N[2]}, opposé à celui en ${N[0]}, aussi : ${a}°.`,
    }), { title: 'Les angles liés', figure: quadFig(N, paraPts(2.6, 1.8, a), { marks: PAR_MARKS, arcs: [{ v: N[2], a: N[3], b: N[1], label: '?', red: true }] }) })
  }),
]
const up2: Maker[] = [
  () => withMeta(retry(() => bisectorPara(pick([0, 2]))), { title: 'La bissectrice' }),
  () => withMeta(squareEqui(pick([true, false]), pick([0, 1])), { title: 'Le carré et le triangle équilatéral' }),
  () => withMeta(rectDiag(pick([0, 1])), { title: 'Les diagonales du rectangle' }),
]
const up3: Maker[] = [
  () => withMeta(retry(() => bisectorsEF(pick([0, 1]))), { title: 'Les deux bissectrices' }),
  () => withMeta(retry(() => bdEqualsBc(pick([0, 1, 2]))), { title: 'Le parallélogramme et l’isocèle' }),
  () => {
    const c = randInt(4, 15), N = qn(), Q: Pt[] = [[0, 0], polar(2, -30), [2 * Math.cos(rad(30)) * 2, 0], polar(2, 30)]
    const q = randInt(0, 1)
    return withMeta(numeric(q === 0
      ? `${N.join('')} est un losange de périmètre ${4 * c} cm, dont l'angle en ${N[0]} mesure 60°. Combien mesure la diagonale [${N[1]}${N[3]}] (en cm) ?`
      : `${N.join('')} est un losange dont l'angle en ${N[0]} mesure 60° et dont la diagonale [${N[1]}${N[3]}] mesure ${c} cm. Quel est son périmètre (en cm) ?`, q === 0 ? c : 4 * c, {
      explanation: `${N[0]}${N[1]} = ${N[0]}${N[3]} : le triangle ${N[0]}${N[1]}${N[3]} est isocèle en ${N[0]} avec un angle de 60°, ses autres angles mesurent (180 − 60) ÷ 2 = 60° : il est équilatéral. ${q === 0 ? `Le côté vaut ${4 * c} ÷ 4 = ${c} cm, donc ${N[1]}${N[3]} = ${c} cm.` : `Le côté vaut donc ${c} cm et le périmètre 4 × ${c} = ${4 * c} cm.`}`,
    }), { title: 'Le losange à 60°', figure: quadFig(N, Q, { marks: ['tick', 'tick', 'tick', 'tick'], segs: [{ a: N[1], b: N[3], dashed: true }], arcs: [{ v: N[0], a: N[1], b: N[3], label: '60°' }] }) })
  },
]

// ═══ Problèmes de l'hôtel de ville ══════════════════════════════════════
function field(): Exercise {
  const a = randInt(30, 90), b = randInt(15, 50), price = randInt(3, 9), al = obl(55, 125)
  const who = prenom()
  return titled('Le champ en parallélogramme', numeric(`Le champ de ${who} a la forme d'un parallélogramme dont deux côtés consécutifs mesurent ${a} m et ${b} m. ${who} veut l'entourer d'une clôture à ${price} écus le mètre. Combien va-t-elle coûter (en écus) ?`, 2 * (a + b) * price, {
    explanation: `Côtés opposés égaux : périmètre = 2 × (${a} + ${b}) = ${2 * (a + b)} m. Prix : ${2 * (a + b)} × ${price} = ${2 * (a + b) * price} écus.`,
  }), quadFig(['A', 'B', 'C', 'D'], paraPts(a * 0.05, b * 0.05, al), { sides: [`${a} m`, `${b} m`] }))
}
function rhombusTiles(): Exercise {
  const n = pick([3, 5, 6, 8, 9, 10, 12]), al = 360 / n
  const raw: Record<string, Pt> = { O: [0, 0] }, segs: FigSegment[] = [], hidden: string[] = ['O']
  const polys: { pts: string[]; fill: string }[] = []
  const show = Math.min(n, 3)
  for (let i = 0; i < show; i++) {
    const u = polar(2, i * al), v = polar(2, (i + 1) * al)
    raw[`u${i}`] = u; raw[`v${i}`] = v; raw[`w${i}`] = [u[0] + v[0], u[1] + v[1]]
    hidden.push(`u${i}`, `v${i}`, `w${i}`)
    segs.push({ a: 'O', b: `u${i}` }, { a: `u${i}`, b: `w${i}` }, { a: `w${i}`, b: `v${i}` }, { a: `v${i}`, b: 'O' })
    polys.push({ pts: ['O', `u${i}`, `w${i}`, `v${i}`], fill: i % 2 ? '#d98c5f' : '#e2b85c' })
  }
  const q = randInt(0, 1)
  return titled('Le dallage en losanges', numeric(q === 0
    ? `Un carreleur pose des carreaux en forme de losange autour d'un point, sans trou ni chevauchement : chaque carreau a un angle de ${fmt(al)}° au point central. Combien de carreaux faut-il pour faire le tour complet ?`
    : `Autour d'un point, on pose ${n} carreaux identiques en forme de losange, par un de leurs sommets, qui font exactement le tour complet. Combien mesure le plus grand angle de chaque carreau (en °) ?`, q === 0 ? n : Math.max(180 - al, al), {
    explanation: q === 0 ? `Le tour complet mesure 360° : 360 ÷ ${fmt(al)} = ${n} carreaux.` : `L'angle au centre de chaque carreau vaut 360 ÷ ${n} = ${fmt(al)}°. Dans un losange, deux angles consécutifs sont supplémentaires : l'autre angle mesure 180 − ${fmt(al)} = ${fmt(180 - al)}°. Le plus grand vaut ${fmt(Math.max(180 - al, al))}°.`,
  }), build(raw, { segs, hidden, polys }))
}
function braceFrame(): Exercise {
  const oa = randInt(20, 70), N = ['A', 'B', 'C', 'D']
  return titled('Les traverses du cadre', numeric(`Un cadre de tableau rectangulaire ABCD est renforcé par ses deux diagonales en bois, qui se croisent en O. On mesure OA = ${oa} cm. Quelle longueur de bois faut-il pour les deux diagonales (en cm) ?`, 4 * oa, {
    explanation: `Les diagonales d'un rectangle se coupent en leur milieu : AC = 2 × ${oa} = ${2 * oa} cm. Elles ont la même longueur : BD = ${2 * oa} cm. Total : 2 × ${2 * oa} = ${4 * oa} cm.`,
  }), quadFig(N, paraPts(3.2, 2, 90), { diag: 'O', right: [0, 1, 2, 3] }))
}
const age1: Maker[] = [field, rhombusTiles, braceFrame]

function shelf(): Exercise {
  const a = obl(50, 80), N = ['A', 'B', 'C', 'D'], q = randInt(0, 2)
  const asks = [
    { t: `l'angle ${ang('A', 'B', 'C')}`, ans: 180 - a, arc: { v: 'B', a: 'C', b: 'A', label: '?', red: true } as Arc },
    { t: `l'angle ${ang('B', 'C', 'D')}`, ans: a, arc: { v: 'C', a: 'D', b: 'B', label: '?', red: true } as Arc },
    { t: `la somme des angles ${ang('A', 'B', 'C')} et ${ang('C', 'D', 'A')}`, ans: 2 * (180 - a), arc: { v: 'B', a: 'C', b: 'A', label: '?', red: true } as Arc },
  ][q]
  return titled('L’étagère pliante', numeric(`Une étagère pliante est formée de quatre barres articulées : les barres opposées restent parallèles, ABCD est donc toujours un parallélogramme. On la règle pour que l'angle ${ang('D', 'A', 'B')} mesure ${a}°. Combien mesure ${asks.t} (en °) ?`, asks.ans, {
    explanation: `Dans le parallélogramme, deux angles consécutifs sont supplémentaires et deux angles opposés sont égaux : ${ang('A', 'B', 'C')} = ${ang('C', 'D', 'A')} = 180 − ${a} = ${180 - a}° et ${ang('B', 'C', 'D')} = ${a}°.${q === 2 ? ` Somme : 2 × ${180 - a} = ${2 * (180 - a)}°.` : ''}`,
  }), quadFig(N, paraPts(3, 2, a), { marks: PAR_MARKS, arcs: [{ v: 'A', a: 'B', b: 'D', label: deg(a) }, asks.arc] }))
}
function lazyTongs(): Exercise {
  const al = 2 * randInt(20, 40), n = randInt(3, 5), c = randInt(4, 10)
  // chaîne de n losanges de côté c, d'angle al (ouverture) : longueur totale = n × grande diagonale ? on demande l'angle
  const raw: Record<string, Pt> = {}, segs: FigSegment[] = [], hidden: string[] = []
  const h = Math.sin(rad(al / 2)), w = Math.cos(rad(al / 2))
  for (let i = 0; i <= n; i++) {
    raw[`m${i}`] = [2 * w * i, 0]; hidden.push(`m${i}`)
    if (i < n) { raw[`t${i}`] = [2 * w * i + w, h]; raw[`b${i}`] = [2 * w * i + w, -h]; hidden.push(`t${i}`, `b${i}`); segs.push({ a: `m${i}`, b: `t${i}` }, { a: `t${i}`, b: `m${i + 1}` }, { a: `m${i}`, b: `b${i}` }, { a: `b${i}`, b: `m${i + 1}` }) }
  }
  const q = randInt(0, 1)
  return titled('La grille extensible', numeric(q === 0
    ? `Une grille extensible est formée de ${n} losanges articulés, alignés pointe contre pointe. Chaque losange a un angle de ${al}° à ses deux pointes alignées. Combien mesurent ses deux autres angles (en °) ?`
    : `Une grille extensible est formée de ${n} losanges de côté ${c} cm, alignés pointe contre pointe. Quelle est la longueur totale de baguette utilisée pour fabriquer les côtés de tous les losanges (en cm) ?`, q === 0 ? 180 - al : 4 * n * c, {
    explanation: q === 0 ? `Dans un losange, deux angles consécutifs sont supplémentaires : 180 − ${al} = ${180 - al}°.` : `Chaque losange a 4 côtés de ${c} cm : ${n} × 4 × ${c} = ${4 * n * c} cm.`,
  }), build(raw, { segs, hidden, arcs: [{ v: 'm0', a: 't0', b: 'b0', label: q === 0 ? deg(al) : undefined }, ...(q === 0 ? [{ v: 't1', a: 'm1', b: 'm2', label: '?', red: true }] : [])] }))
}
function tilesAround(): Exercise | null {
  const a = randInt(95, 140), b = randInt(95, 140), c = 360 - a - b
  if (c < 80 || c > 165 || a === b) return null
  const raw: Record<string, Pt> = { O: [0, 0], u: polar(2, 90), v: polar(2, 90 + a), w: polar(2, 90 + a + b) }
  const P = (p: Pt, q: Pt): Pt => [p[0] + q[0], p[1] + q[1]]
  raw.x = P(raw.u, raw.v); raw.y = P(raw.v, raw.w); raw.z = P(raw.w, raw.u)
  return titled('La mosaïque', numeric(`Une mosaïque est formée de trois pièces en forme de losange, posées autour du point central O sans trou ni chevauchement. Deux d'entre elles ont des angles de ${a}° et ${b}° en O. Quel est l'angle en O de la troisième pièce (en °) ?`, c, {
    explanation: `Les angles autour du point O font un tour complet, 360° : 360 − ${a} − ${b} = ${c}°.`,
  }), build(raw, { segs: [{ a: 'O', b: 'u' }, { a: 'u', b: 'x' }, { a: 'x', b: 'v' }, { a: 'v', b: 'O' }, { a: 'v', b: 'y' }, { a: 'y', b: 'w' }, { a: 'w', b: 'O' }, { a: 'w', b: 'z' }, { a: 'z', b: 'u' }], labels: { O: '' }, hidden: Object.keys(raw).filter((k) => k !== 'O'), polys: [{ pts: ['O', 'u', 'x', 'v'], fill: '#e2b85c' }, { pts: ['O', 'v', 'y', 'w'], fill: '#d98c5f' }, { pts: ['O', 'w', 'z', 'u'], fill: '#c9d8a0' }], arcs: [{ v: 'O', a: 'u', b: 'v', label: deg(a) }, { v: 'O', a: 'v', b: 'w', label: deg(b) }, { v: 'O', a: 'w', b: 'u', label: '?', red: true }] }))
}
const age2: Maker[] = [shelf, lazyTongs, () => retry(tilesAround)]

function gardenPath(): Exercise | null {
  const q = randInt(0, 1), ad = randInt(10, 30), ab = (q === 1 ? 2 * ad : ad) + randInt(6, 24), al = obl(55, 125), N = ['A', 'B', 'C', 'D']
  const k = 3 / ab, P = paraPts(ab * k, ad * k, al), E: Pt = [P[3][0] + ad * k, P[3][1]], F: Pt = [P[2][0] - ad * k, P[2][1]]
  if (ad * k < 0.6) return null
  const why = `(AB) // (DC) : ${ang('D', 'E', 'A')} = ${ang('E', 'A', 'B')} (alternes-internes) = ${ang('D', 'A', 'E')} (bissectrice). Le triangle ADE est isocèle en D : DE = AD = ${ad} m.`
  return titled('L’allée du jardin', numeric(q === 0
    ? `Un jardin a la forme d'un parallélogramme ABCD avec AB = ${ab} m et AD = ${ad} m. Une allée droite part de A en partageant l'angle ${ang('D', 'A', 'B')} en deux angles égaux, et rejoint le côté [DC] en E. Quelle est la longueur EC (en m) ?`
    : `Un jardin a la forme d'un parallélogramme ABCD avec AB = ${ab} m et AD = ${ad} m. Deux allées suivent les bissectrices des angles en A et en B ; elles atteignent le côté [DC] en E et en F. Quelle distance sépare E et F (en m) ?`, q === 0 ? ab - ad : ab - 2 * ad, {
    explanation: q === 0 ? `${why} DC = AB = ${ab} m, donc EC = ${ab} − ${ad} = ${ab - ad} m.` : `${why} De même, BCF est isocèle en C : CF = BC = ${ad} m. DC = ${ab} m, donc EF = ${ab} − ${ad} − ${ad} = ${ab - 2 * ad} m.`,
  }), quadFig(N, P, { extra: q === 0 ? { E } : { E, F }, sides: [`${ab} m`, undefined, undefined, `${ad} m`], segs: [{ a: 'A', b: 'E', color: GREEN }, ...(q === 1 ? [{ a: 'B', b: 'F', color: GREEN }] : [])] }))
}
function blazonSquare(): Exercise {
  const ex = squareEqui(Math.random() < 0.5, randInt(0, 2), ['A', 'B', 'C', 'D'])
  const ctx = pick(['Un blason a la forme d’un carré ; on y a peint', 'Un vitrail carré est décoré par', 'Un carreau de faïence carré porte', 'Le drapeau d’une compagnie est un carré qui porte'])
  return withMeta({ ...ex, prompt: `${ctx} un triangle équilatéral construit sur un côté (voir la figure). ${ex.prompt}` }, { title: 'Le blason au triangle' })
}
function tongsAngles(): Exercise {
  const al = 2 * randInt(15, 35), n = 3
  const raw: Record<string, Pt> = {}, segs: FigSegment[] = [], hidden: string[] = []
  const h = Math.sin(rad(al / 2)), w = Math.cos(rad(al / 2))
  for (let i = 0; i <= n; i++) {
    raw[`m${i}`] = [2 * w * i, 0]; hidden.push(`m${i}`)
    if (i < n) { raw[`t${i}`] = [2 * w * i + w, h]; raw[`b${i}`] = [2 * w * i + w, -h]; hidden.push(`t${i}`, `b${i}`); segs.push({ a: `m${i}`, b: `t${i}` }, { a: `t${i}`, b: `m${i + 1}` }, { a: `m${i}`, b: `b${i}` }, { a: `b${i}`, b: `m${i + 1}` }) }
  }
  // angle entre deux barres qui se croisent en m1 : angle t0 m1 t1 = 180 − al (angle plat moins…)
  return titled('Le pantographe', numeric(`Un pantographe est formé de losanges articulés alignés pointe contre pointe. Chaque losange a un angle de ${al}° à ses pointes alignées. Au point où deux losanges se touchent, quel angle forment les deux barres du haut (en °) ?`, 180 - al, {
    explanation: `Au point de contact, les deux barres du haut font chacune un angle de ${al / 2}° avec l'alignement des pointes (la diagonale partage l'angle de ${al}° en deux : c'est un axe de symétrie du losange). L'angle cherché complète ces deux angles pour former un angle plat : 180 − ${al / 2} − ${al / 2} = ${180 - al}°.`,
  }), build(raw, { segs, hidden, arcs: [{ v: 'm0', a: 't0', b: 'b0', label: deg(al) }, { v: 'm1', a: 't0', b: 't1', label: '?', red: true }] }))
}
const age3: Maker[] = [() => retry(gardenPath), blazonSquare, tongsAngles]

export const CONTENT: SubjectContent | null = {
  tiers: [
    [p1Sides, p1Angles, p1Diagonals, p1Nature],
    [p2Perimeters, p2AngleRel, p2DiagAngles, p2Props],
    [p3DiagTriangle, p3Rectangle, p3Rhombus, p3Compose],
    [p4Iso, p4Bisector, p4Square, p4Nature],
    [p5Bisectors, p5EF, p5Iso, p5Rect],
  ],
  upgrades: [up1, up2, up3],
  age: [age1, age2, age3],
}
