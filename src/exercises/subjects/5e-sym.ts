// Symétries axiale et centrale (5e) : image d'un point (quadrillage, repère), conservation des longueurs, des angles
// et des aires, axes et centres de symétrie des figures usuelles, symétrique d'un segment, d'une droite, d'un cercle.
import { graphFigure, type FigAngle, type FigPoint, type FigSegment, type Figure, type GraphWindow, type LabelPos } from '../figure'
import { choice, fmt, fresh, numeric, pair, par, pick, randInt, randNonZero, variants, withMeta, type Exercise, type Maker, type SubjectContent } from '../utils'
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
/** Mesure « dessinable » : pas trop proche de l'angle droit. */
function niceAngle(lo = 35, hi = 145) {
  let v = randInt(lo, hi)
  while (Math.abs(v - 90) < 12) v = randInt(lo, hi)
  return v
}


// ── Repère quadrillé ─────────────────────────────────────────────────────
const W0: GraphWindow = { xMin: -6, xMax: 6, yMin: -4, yMax: 4 }
function repere(win: Partial<GraphWindow> = {}) {
  const g = graphFigure({ ...W0, ...win })
  const F = g.figure
  const pt = (n: string, x: number, y: number, o: { pos?: LabelPos; hide?: boolean; label?: string } = {}) => {
    const [px, py] = g.at(x, y)
    F.points[n] = o.hide ? { x: px, y: py, hidden: true, label: '' } : { x: px, y: py, label: o.label ?? n, pos: o.pos ?? (x >= (g.figure.axes?.xMax ?? 6) - 1 ? 'nw' : 'ne') }
  }
  const seg = (a: string, b: string, o: Omit<FigSegment, 'a' | 'b'> = {}) => { F.segments!.push({ a, b, ...o }) }
  /** Droite passant par deux points (coordonnées mathématiques). */
  const line = (id: string, p: Pt, q: Pt, o: Omit<FigSegment, 'a' | 'b'> = {}) => { pt(`${id}1`, p[0], p[1], { hide: true }); pt(`${id}2`, q[0], q[1], { hide: true }); seg(`${id}1`, `${id}2`, o) }
  const poly = (names: string[], fill: string) => { (F.polygons ??= []).push({ pts: names, fill }) }
  return { g, F, pt, seg, line, poly, note: g.note }
}
const co = (x: number, y: number) => `(${fmt(x)} ; ${fmt(y)})`
/** « (a + b) ÷ 2 », écrit proprement. */
const half = (a: number, b: number): string => (b === 0 ? `${fmt(a)} ÷ 2` : `(${fmt(a)} + ${par(b)}) ÷ 2`)
const same = (p: Pt, q: Pt) => p[0] === q[0] && p[1] === q[1]
const inWin = (x: number, y: number, w: GraphWindow = W0) => x > w.xMin && x < w.xMax && y > w.yMin && y < w.yMax
/** Point au hasard du repère (coordonnées entières, non nulles). */
const rp = (mx = 5, my = 3): Pt => [randNonZero(-mx, mx), randNonZero(-my, my)]
const PRIME = (n: string) => `${n}′`

// ── Figures usuelles (axes et centre de symétrie) ─────────────────────────
interface Shape { art: string; strokes: Pt[][]; closed: boolean; axes: number; center: boolean; why: string }
const regular = (n: number, r = 2): Pt[] => Array.from({ length: n }, (_, i) => polar(r, 90 + (360 / n) * i))
const SHAPES: Record<'quad' | 'tri' | 'reg' | 'letter', Shape[]> = {
  quad: [
    { art: 'un carré', strokes: [[[0, 0], [2, 0], [2, 2], [0, 2]]], closed: true, axes: 4, center: true, why: 'les 2 médiatrices des côtés et les 2 diagonales' },
    { art: 'un rectangle (qui n’est pas un carré)', strokes: [[[0, 0], [3.2, 0], [3.2, 1.8], [0, 1.8]]], closed: true, axes: 2, center: true, why: 'les 2 médiatrices des côtés (les diagonales ne sont pas des axes)' },
    { art: 'un losange (qui n’est pas un carré)', strokes: [[[0, 0], [1.6, 1], [0, 2], [-1.6, 1]]], closed: true, axes: 2, center: true, why: 'ses 2 diagonales' },
    { art: 'un parallélogramme quelconque', strokes: [[[0, 0], [3, 0], [3.9, 1.7], [0.9, 1.7]]], closed: true, axes: 0, center: true, why: 'aucune droite ne le replie sur lui-même' },
    { art: 'un trapèze isocèle', strokes: [[[0, 0], [3.4, 0], [2.5, 1.6], [0.9, 1.6]]], closed: true, axes: 1, center: false, why: 'la médiatrice commune de ses deux bases' },
    { art: 'un cerf-volant', strokes: [[[0, 1.2], [1.1, 0], [0, -2.4], [-1.1, 0]]], closed: true, axes: 1, center: false, why: 'la diagonale qui joint les deux sommets « pointus »' },
  ],
  tri: [
    { art: 'un triangle équilatéral', strokes: [regular(3)], closed: true, axes: 3, center: false, why: 'les 3 médiatrices de ses côtés (qui passent par les sommets)' },
    { art: 'un triangle isocèle (non équilatéral)', strokes: [[[0, 0], [2.4, 0], [1.2, 2.8]]], closed: true, axes: 1, center: false, why: 'la médiatrice de la base, qui passe par le sommet principal' },
    { art: 'un triangle rectangle isocèle', strokes: [[[0, 0], [2.4, 0], [0, 2.4]]], closed: true, axes: 1, center: false, why: 'la médiatrice de l’hypoténuse, qui passe par le sommet de l’angle droit' },
    { art: 'un triangle quelconque', strokes: [[[0, 0], [3, 0], [2.1, 1.8]]], closed: true, axes: 0, center: false, why: 'aucune droite ne le replie sur lui-même' },
  ],
  reg: [
    { art: 'un pentagone régulier', strokes: [regular(5)], closed: true, axes: 5, center: false, why: 'les 5 droites qui joignent un sommet au milieu du côté opposé' },
    { art: 'un hexagone régulier', strokes: [regular(6)], closed: true, axes: 6, center: true, why: '3 droites joignant deux sommets opposés et 3 droites joignant les milieux de deux côtés opposés' },
    { art: 'un octogone régulier', strokes: [regular(8)], closed: true, axes: 8, center: true, why: '4 droites joignant deux sommets opposés et 4 droites joignant les milieux de deux côtés opposés' },
    { art: 'un carré', strokes: [regular(4)], closed: true, axes: 4, center: true, why: 'les 2 diagonales et les 2 médiatrices des côtés' },
  ],
  letter: [
    { art: 'la lettre H', strokes: [[[0, 0], [0, 3]], [[2, 0], [2, 3]], [[0, 1.5], [2, 1.5]]], closed: false, axes: 2, center: true, why: 'un axe vertical et un axe horizontal' },
    { art: 'la lettre X', strokes: [[[0, 0], [2, 3]], [[0, 3], [2, 0]]], closed: false, axes: 2, center: true, why: 'un axe vertical et un axe horizontal' },
    { art: 'la lettre A', strokes: [[[0, 0], [1, 3], [2, 0]], [[0.5, 1.5], [1.5, 1.5]]], closed: false, axes: 1, center: false, why: 'un axe vertical' },
    { art: 'la lettre T', strokes: [[[0, 3], [2, 3]], [[1, 3], [1, 0]]], closed: false, axes: 1, center: false, why: 'un axe vertical' },
    { art: 'la lettre E', strokes: [[[2, 3], [0, 3], [0, 0], [2, 0]], [[0, 1.5], [1.5, 1.5]]], closed: false, axes: 1, center: false, why: 'un axe horizontal' },
    { art: 'la lettre N', strokes: [[[0, 0], [0, 3], [2, 0], [2, 3]]], closed: false, axes: 0, center: true, why: 'aucun axe, mais un demi-tour autour de son milieu la laisse inchangée' },
    { art: 'la lettre Z', strokes: [[[0, 3], [2, 3], [0, 0], [2, 0]]], closed: false, axes: 0, center: true, why: 'aucun axe, mais un demi-tour autour de son milieu la laisse inchangée' },
    { art: 'la lettre M', strokes: [[[0, 0], [0, 3], [1, 1.4], [2, 3], [2, 0]]], closed: false, axes: 1, center: false, why: 'un axe vertical' },
    { art: 'la lettre V', strokes: [[[0, 3], [1, 0], [2, 3]]], closed: false, axes: 1, center: false, why: 'un axe vertical' },
    { art: 'la lettre K', strokes: [[[0, 0], [0, 3]], [[2, 3], [0, 1.5], [2, 0]]], closed: false, axes: 1, center: false, why: 'un axe horizontal' },
    { art: 'la lettre L', strokes: [[[0, 3], [0, 0], [1.6, 0]]], closed: false, axes: 0, center: false, why: 'aucun axe (les deux branches n’ont pas la même longueur)' },
    { art: 'la lettre F', strokes: [[[1.6, 3], [0, 3], [0, 0]], [[0, 1.5], [1.2, 1.5]]], closed: false, axes: 0, center: false, why: 'aucun axe' },
  ],
}
function shapeFig(sh: Shape, rot = 0): Figure {
  const raw: Record<string, Pt> = {}, segs: FigSegment[] = [], names: string[] = []
  sh.strokes.forEach((st, i) => {
    st.forEach((p, j) => {
      const q = rot ? polar(Math.hypot(p[0], p[1]), (Math.atan2(p[1], p[0]) * 180) / Math.PI + rot) : p
      raw[`s${i}_${j}`] = q
      if (i === 0) names.push(`s${i}_${j}`)
      if (j > 0) segs.push({ a: `s${i}_${j - 1}`, b: `s${i}_${j}` })
    })
    if (sh.closed) segs.push({ a: `s${i}_${st.length - 1}`, b: `s${i}_0` })
  })
  return build(raw, { segs, hidden: Object.keys(raw), polys: sh.closed ? [{ pts: names, fill: '#e2b85c' }] : undefined, margin: 40, caption: '' })
}

// ── Droite graduée ───────────────────────────────────────────────────────
function numberLine(lo: number, hi: number, pts: [string, number][]): Figure {
  const raw: Record<string, Pt> = { _a: [lo - 0.7, 0], _b: [hi + 0.7, 0] }
  const segs: FigSegment[] = [{ a: '_a', b: '_b', head: true }]
  const hidden = ['_a', '_b'], notes: { at: Pt; text: string; dy?: number }[] = []
  for (let x = lo; x <= hi; x++) {
    raw[`t${x}`] = [x, 0.18]; raw[`u${x}`] = [x, -0.18]; hidden.push(`t${x}`, `u${x}`)
    segs.push({ a: `t${x}`, b: `u${x}` })
    notes.push({ at: [x, 0], text: fmt(x), dy: 16 })
  }
  const pos: Record<string, LabelPos> = {}
  for (const [n, x] of pts) { raw[n] = [x, 0]; pos[n] = 'n' }
  return build(raw, { segs, hidden, notes, pos, margin: 22, caption: '' })
}

// ── Deux triangles symétriques ──────────────────────────────────────────
type SymKind = 'centrale' | 'axiale'
/** Triangle ABC (angles a en A, b en B) et son image A′B′C′ par une symétrie centrale (centre O) ou axiale (axe (d)). */
function twinTriangles(a: number, b: number, kind: SymKind, arcs: Arc[], sides: Partial<Record<string, string>> = {}): Figure {
  const t = triangleFromAngles(a, b, 4)
  const raw: Record<string, Pt> = { A: t.A, B: t.B, C: t.C }
  const segs: FigSegment[] = []
  if (kind === 'centrale') {
    const O: Pt = [4.7, t.C[1] * 0.5]
    const im = (p: Pt): Pt => [2 * O[0] - p[0], 2 * O[1] - p[1]]
    Object.assign(raw, { O, 'A′': im(t.A), 'B′': im(t.B), 'C′': im(t.C) })
    segs.push({ a: 'A', b: 'A′', dashed: true })
  } else {
    // triangle « debout » (base [AB] verticale) à gauche de l'axe vertical (d)
    const up = (p: Pt): Pt => [-p[1], p[0]]
    Object.assign(raw, { A: up(t.A), B: up(t.B), C: up(t.C) })
    const xa = 1.3
    const im = (p: Pt): Pt => [2 * xa - p[0], p[1]]
    Object.assign(raw, { 'A′': im(raw.A), 'B′': im(raw.B), 'C′': im(raw.C), d1: [xa, -0.5], d2: [xa, 5] })
    segs.push({ a: 'd1', b: 'd2', dashed: true, color: BLUE })
  }
  for (const [p, q] of [['A', 'B'], ['B', 'C'], ['C', 'A']]) {
    segs.push({ a: p, b: q, label: sides[`${p}${q}`] }, { a: `${p}′`, b: `${q}′`, label: sides[`${p}′${q}′`] })
  }
  return build(raw, { segs, arcs, hidden: kind === 'axiale' ? ['d1', 'd2'] : [], notes: kind === 'axiale' ? [{ at: raw.d2, text: '(d)', dy: -8 }] : [], pos: kind === 'axiale' ? { A: 'sw', B: 'nw', 'A′': 'se', 'B′': 'ne' } : {} })
}
function triangleFromAngles(angleA: number, angleB: number, base = 6): Record<'A' | 'B' | 'C', Pt> {
  const a = rad(angleA), b = rad(angleB)
  const t = (base * Math.sin(b)) / Math.sin(a + b)
  return { A: [0, 0], B: [base, 0], C: [t * Math.cos(a), t * Math.sin(a)] }
}

// ═══ Palier 1 ═══════════════════════════════════════════════════════════
const p1Lengths: Maker = variants(
  () => {
    const d = randInt(3, 25) / 2, P = pick(['A', 'M', 'R', 'K'])
    return numeric(pick([
      `${PRIME(P)} est le symétrique de ${P} par rapport au point O, et O${P} = ${fmt(d)} cm. Quelle est la longueur ${P}${PRIME(P)} (en cm) ?`,
      `On construit le symétrique ${PRIME(P)} du point ${P} par rapport à O. Sachant que ${P}O = ${fmt(d)} cm, combien mesure le segment [${P}${PRIME(P)}] (en cm) ?`,
    ]), 2 * d, { explanation: `O est le milieu de [${P}${PRIME(P)}] : ${P}${PRIME(P)} = 2 × ${fmt(d)} = ${fmt(2 * d)} cm.` })
  },
  () => {
    const d = randInt(3, 25) / 2, P = pick(['B', 'N', 'S', 'E'])
    return numeric(`${PRIME(P)} est le symétrique de ${P} par rapport au point O, et ${P}${PRIME(P)} = ${fmt(2 * d)} cm. Quelle est la longueur O${PRIME(P)} (en cm) ?`, d, {
      explanation: `O est le milieu de [${P}${PRIME(P)}] : O${PRIME(P)} = ${fmt(2 * d)} ÷ 2 = ${fmt(d)} cm.`,
    })
  },
  () => {
    const a = randInt(40, 80), b = randInt(40, 70), [x, y, z] = [randInt(3, 9), randInt(3, 9), randInt(3, 9)]
    const kind: SymKind = pick(['centrale', 'axiale'])
    return fig(numeric(`Le triangle A′B′C′ est le symétrique du triangle ABC par rapport ${kind === 'centrale' ? 'au point O' : 'à la droite (d)'}. On sait que AB = ${x} cm, BC = ${y} cm et CA = ${z} cm. Quel est le périmètre du triangle A′B′C′ (en cm) ?`, x + y + z, {
      explanation: `La symétrie ${kind} conserve les longueurs : A′B′ = ${x} cm, B′C′ = ${y} cm, C′A′ = ${z} cm. Périmètre : ${x} + ${y} + ${z} = ${x + y + z} cm.`,
    }), twinTriangles(a, b, kind, [], { AB: `${x} cm`, BC: `${y} cm`, CA: `${z} cm` }))
  },
  fresh(() => {
    const o = randInt(-3, 4), a = o + randNonZero(-4, 4)
    const lo = Math.min(a, 2 * o - a, o) - 1, hi = Math.max(a, 2 * o - a, o) + 1
    return fig(numeric(`Sur la droite graduée, le point O a pour abscisse ${fmt(o)} et le point A a pour abscisse ${fmt(a)}. Quelle est l'abscisse du point A′, symétrique de A par rapport à O ?`, 2 * o - a, {
      explanation: `A est à ${Math.abs(a - o)} unité${Math.abs(a - o) > 1 ? 's' : ''} de O, ${a > o ? 'à droite' : 'à gauche'}. A′ est à la même distance de l'autre côté : ${fmt(o)} ${a > o ? '−' : '+'} ${Math.abs(a - o)} = ${fmt(2 * o - a)}.`,
    }), numberLine(lo, hi, [['O', o], ['A', a]]))
  }),
)

/** Symétrique d'un point par rapport à l'origine ou à un axe du repère. */
function coordSym(kind: 'O' | 'x' | 'y', reverse = false): Exercise {
  const [x, y] = rp(), P = pick(['A', 'B', 'M', 'E', 'K'])
  const [ix, iy] = kind === 'O' ? [-x, -y] : kind === 'x' ? [x, -y] : [-x, y]
  const R = repere()
  const shown = reverse ? [ix, iy] : [x, y], shownName = reverse ? PRIME(P) : P
  R.pt(shownName, shown[0], shown[1])
  const by = kind === 'O' ? 'à l’origine O du repère' : kind === 'x' ? 'à l’axe des abscisses' : 'à l’axe des ordonnées'
  const rule = kind === 'O' ? 'les deux coordonnées changent de signe' : kind === 'x' ? 'l’abscisse ne change pas, l’ordonnée change de signe' : 'l’ordonnée ne change pas, l’abscisse change de signe'
  const ans = reverse ? [x, y] : [ix, iy]
  const prompt = reverse
    ? `Le point ${PRIME(P)} placé sur la figure est le symétrique d'un point ${P} par rapport ${by}. Quelles sont les coordonnées de ${P} ?`
    : pick([
      `Lis les coordonnées du point ${P} sur la figure. Quelles sont les coordonnées de son symétrique ${PRIME(P)} par rapport ${by} ?`,
      `On a placé le point ${P}${co(x, y)} dans le repère. Donne les coordonnées de son symétrique ${PRIME(P)} par rapport ${by}.`,
    ])
  return withMeta(pair(prompt, ans[0], ans[1], {
    explanation: `${reverse ? `${PRIME(P)}${co(ix, iy)}. Les points ${P} et ${PRIME(P)} sont symétriques l'un de l'autre : ` : `${P}${co(x, y)}. Par la symétrie par rapport ${by}, `}${rule} : ${reverse ? P : PRIME(P)}${co(ans[0], ans[1])}.`,
  }), { figure: R.F })
}
const p1Coords: Maker = variants(
  () => coordSym('O'),
  () => coordSym('O'),
  () => coordSym('x'),
  () => coordSym('y'),
  () => coordSym('O', true),
)

function axesCount(family: keyof typeof SHAPES): Exercise {
  const sh = pick(SHAPES[family]), rot = family === 'letter' ? 0 : pick([0, 0, randInt(-25, 25)])
  const prompt = family === 'letter'
    ? pick([`Combien d'axes de symétrie possède ${sh.art}, dessinée ci-dessous ?`, `Observe ${sh.art} ci-dessous. Combien a-t-elle d'axes de symétrie ?`])
    : pick([`La figure ci-dessous est ${sh.art}. Combien possède-t-elle d'axes de symétrie ?`, `Combien d'axes de symétrie possède ${sh.art} (voir la figure) ?`, `On a dessiné ${sh.art}. Quel est son nombre d'axes de symétrie ?`])
  return fig(numeric(prompt, sh.axes, { explanation: `${sh.axes === 0 ? 'Aucun axe' : `${sh.axes} axe${sh.axes > 1 ? 's' : ''}`} : ${sh.why}.` }), shapeFig(sh, rot))
}
const p1Axes: Maker = variants(
  () => axesCount('quad'),
  () => axesCount('tri'),
  () => axesCount('reg'),
  () => axesCount('letter'),
  () => axesCount('letter'),
)
const YES = 'Oui'
const NO = 'Non'
function hasCenter(family: keyof typeof SHAPES): Exercise {
  const sh = pick(SHAPES[family])
  const prompt = pick([
    `La figure ci-dessous (${sh.art}) possède-t-elle un centre de symétrie ?`,
    `${sh.art.charAt(0).toUpperCase()}${sh.art.slice(1)} ${family === 'letter' ? 'a-t-elle' : 'a-t-il'} un centre de symétrie ? (voir la figure)`,
    `Existe-t-il un point O tel que ${sh.art} soit son propre symétrique par rapport à O ?`,
  ])
  const why = sh.center
    ? `Oui : un demi-tour autour de son centre (${family === 'quad' ? 'le point d’intersection des diagonales' : family === 'letter' ? 'le milieu de la lettre' : 'le centre du polygone'}) la laisse inchangée.`
    : `Non : aucun demi-tour ne la laisse inchangée${family === 'tri' ? ' (un triangle n’a jamais de centre de symétrie)' : family === 'reg' ? ' (un polygone régulier avec un nombre impair de côtés n’a pas de centre de symétrie)' : ''}.`
  return fig(choice(prompt, sh.center ? YES : NO, [YES, NO], why), shapeFig(sh))
}
const p1Center: Maker = variants(
  () => hasCenter('quad'),
  () => hasCenter('quad'),
  () => hasCenter('tri'),
  () => hasCenter('reg'),
  () => hasCenter('letter'),
)

// ═══ Palier 2 ═══════════════════════════════════════════════════════════
/** Symétrique par rapport à un point I(a ; b) quelconque. */
function pointSym(mode: 'image' | 'antecedent' | 'center' | 'text'): Exercise | null {
  const I: Pt = [randInt(-2, 2), randInt(-1, 1)], A = rp(), A2: Pt = [2 * I[0] - A[0], 2 * I[1] - A[1]]
  if (!inWin(A2[0], A2[1]) || (A[0] === I[0] && A[1] === I[1])) return null
  if (I[0] === 0 && I[1] === 0) return null
  const R = repere(), P = pick(['A', 'B', 'C', 'M'])
  const exp = `I est le milieu de [${P}${PRIME(P)}] : pour aller de ${P} à I, on se déplace de ${fmt(I[0] - A[0])} en abscisse et ${fmt(I[1] - A[1])} en ordonnée ; on refait le même déplacement à partir de I.`
  if (mode === 'image' || mode === 'text') {
    R.pt(P, A[0], A[1]); R.pt('I', I[0], I[1])
    const prompt = mode === 'image'
      ? `Lis les coordonnées des points ${P} et I sur la figure. Quelles sont les coordonnées du point ${PRIME(P)}, symétrique de ${P} par rapport à I ?`
      : `On donne ${P}${co(A[0], A[1])} et I${co(I[0], I[1])}. Quelles sont les coordonnées du symétrique ${PRIME(P)} de ${P} par rapport à I ?`
    return withMeta(pair(prompt, A2[0], A2[1], { explanation: `${exp} ${PRIME(P)}${co(A2[0], A2[1])}.` }), { figure: R.F })
  }
  if (mode === 'antecedent') {
    R.pt(PRIME(P), A2[0], A2[1]); R.pt('I', I[0], I[1])
    return withMeta(pair(`Le point ${PRIME(P)} est le symétrique d'un point ${P} par rapport au point I (voir la figure). Quelles sont les coordonnées de ${P} ?`, A[0], A[1], {
      explanation: `${P} est aussi le symétrique de ${PRIME(P)} par rapport à I : I est le milieu de [${P}${PRIME(P)}]. On part de ${PRIME(P)}${co(A2[0], A2[1])}, on va jusqu'à I${co(I[0], I[1])} et on refait le même déplacement : ${P}${co(A[0], A[1])}.`,
    }), { figure: R.F })
  }
  R.pt(P, A[0], A[1]); R.pt(PRIME(P), A2[0], A2[1]); R.seg(P, PRIME(P), { dashed: true })
  return withMeta(pair(`Les points ${P} et ${PRIME(P)} sont symétriques par rapport à un point I. Quelles sont les coordonnées de I ?`, I[0], I[1], {
    explanation: `I est le milieu de [${P}${PRIME(P)}] : abscisse ${half(A[0], A2[0])} = ${fmt(I[0])}, ordonnée ${half(A[1], A2[1])} = ${fmt(I[1])}. I${co(I[0], I[1])}.`,
  }), { figure: R.F })
}
const p2PointSym: Maker = variants(
  () => retry(() => pointSym('image')),
  () => retry(() => pointSym('text')),
  () => retry(() => pointSym('antecedent')),
  () => retry(() => pointSym('center')),
)

/** Symétrie axiale par rapport à une droite (d) verticale (x = k) ou horizontale (y = k). */
function axisSym(dir: 'v' | 'h', reverse: boolean): Exercise | null {
  const k = dir === 'v' ? randNonZero(-3, 3) : randNonZero(-2, 2), A = rp()
  const A2: Pt = dir === 'v' ? [2 * k - A[0], A[1]] : [A[0], 2 * k - A[1]]
  if (!inWin(A2[0], A2[1]) || (dir === 'v' ? A[0] === k : A[1] === k)) return null
  const R = repere(), P = pick(['A', 'B', 'M', 'R'])
  if (dir === 'v') R.line('d', [k, W0.yMin], [k, W0.yMax], { dashed: true, color: BLUE }); else R.line('d', [W0.xMin, k], [W0.xMax, k], { dashed: true, color: BLUE })
  R.note(dir === 'v' ? k + 0.6 : W0.xMax - 0.6, dir === 'v' ? W0.yMax - 0.4 : k + 0.45, '(d)')
  const [sx, sy] = reverse ? A2 : A
  R.pt(reverse ? PRIME(P) : P, sx, sy, { pos: dir === 'v' ? (sx < k ? 'nw' : 'ne') : (sy < k ? 'se' : 'ne') })
  const ans = reverse ? A : A2
  const dist = dir === 'v' ? Math.abs(A[0] - k) : Math.abs(A[1] - k)
  return withMeta(pair(reverse
    ? `Le point ${PRIME(P)} est le symétrique d'un point ${P} par rapport à la droite (d) tracée en pointillés. Quelles sont les coordonnées de ${P} ?`
    : pick([
      `Quelles sont les coordonnées du symétrique ${PRIME(P)} du point ${P} par rapport à la droite (d) tracée en pointillés ?`,
      `On replie la figure le long de la droite (d). Sur quel point ${PRIME(P)} vient se poser le point ${P} ? Donne ses coordonnées.`,
    ]), ans[0], ans[1], {
    explanation: `(d) est ${dir === 'v' ? 'verticale' : 'horizontale'} : ${dir === 'v' ? 'l’ordonnée' : 'l’abscisse'} ne change pas. Le point est à ${dist} unité${dist > 1 ? 's' : ''} de (d) ; son symétrique est à ${dist} unité${dist > 1 ? 's' : ''} de l'autre côté. Réponse : ${co(ans[0], ans[1])}.`,
  }), { figure: R.F })
}
const p2AxisSym: Maker = variants(
  () => retry(() => axisSym('v', false)),
  () => retry(() => axisSym('h', false)),
  () => retry(() => axisSym('v', true)),
  () => retry(() => axisSym('h', true)),
)

/** Conservation des angles : triangle et son image. */
function conserveAngles(kind: SymKind, q: number): Exercise | null {
  const a = randInt(35, 85), b = randInt(35, 85), c = 180 - a - b
  if (c < 30 || a === b || b === c || a === c) return null
  const by = kind === 'centrale' ? 'au point O' : 'à la droite (d)'
  if (q === 0) {
    return fig(numeric(`Le triangle A′B′C′ est le symétrique du triangle ABC par rapport ${by}. On sait que ${ang('B', 'A', 'C')} = ${a}° et ${ang('A′', 'B′', 'C′')} = ${b}°. Combien mesure l'angle ${ang('A′', 'C′', 'B′')} (en °) ?`, c, {
      explanation: `La symétrie ${kind} conserve les angles : ${ang('B′', 'A′', 'C′')} = ${ang('B', 'A', 'C')} = ${a}°. Dans le triangle A′B′C′ : ${ang('A′', 'C′', 'B′')} = 180 − ${a} − ${b} = ${c}°.`,
    }), twinTriangles(a, b, kind, [{ v: 'A', a: 'B', b: 'C', label: deg(a) }, { v: 'B′', a: 'A′', b: 'C′', label: deg(b) }, { v: 'C′', a: 'A′', b: 'B′', label: '?', red: true }]))
  }
  return fig(numeric(`Le triangle A′B′C′ est le symétrique du triangle ABC par rapport ${by}. On sait que ${ang('B′', 'A′', 'C′')} = ${a}° et ${ang('A', 'C', 'B')} = ${c}°. Combien mesure l'angle ${ang('A', 'B', 'C')} (en °) ?`, b, {
    explanation: `La symétrie conserve les angles : ${ang('B', 'A', 'C')} = ${ang('B′', 'A′', 'C′')} = ${a}°. Dans le triangle ABC : ${ang('A', 'B', 'C')} = 180 − ${a} − ${c} = ${b}°.`,
  }), twinTriangles(a, b, kind, [{ v: 'A′', a: 'B′', b: 'C′', label: deg(a) }, { v: 'C', a: 'A', b: 'B', label: deg(c) }, { v: 'B', a: 'A', b: 'C', label: '?', red: true }]))
}
const p2Conserve: Maker = variants(
  () => retry(() => conserveAngles('centrale', 0)),
  () => retry(() => conserveAngles('axiale', 0)),
  () => retry(() => conserveAngles('centrale', 1)),
  () => retry(() => conserveAngles('axiale', 1)),
  () => {
    const L = randInt(3, 12), l = randInt(2, L - 1), kind = pick(['un point', 'une droite'])
    return numeric(`Un rectangle mesure ${L} cm sur ${l} cm. On construit son symétrique par rapport à ${kind}. Quelle est l'aire de la figure obtenue (en cm²) ?`, L * l, {
      explanation: `La symétrie conserve les longueurs et les aires : l'image est un rectangle de ${L} cm sur ${l} cm, d'aire ${L} × ${l} = ${L * l} cm².`,
    })
  },
)

/** Cercle de centre A et son symétrique par rapport au point O. */
function circlesFig(r: number, d: number, opts: { rLabel?: string; dLabel?: string } = {}): Figure {
  const A: Pt = [-d, 0], A2: Pt = [d, 0]
  const raw: Record<string, Pt> = { A, O: [0, 0], 'A′': A2, R: polar(r, 60, A) }
  return build(raw, {
    segs: [{ a: 'A', b: 'O', label: opts.dLabel }, { a: 'O', b: 'A′', dashed: true }, { a: 'A', b: 'R', label: opts.rLabel, color: GREEN }],
    circles: [{ c: 'A', r }, { c: 'A′', r, dashed: true }], hidden: ['R'], pos: { O: 's', A: 's', 'A′': 's' },
  })
}
const p2Circles: Maker = variants(
  () => {
    const r = randInt(2, 5), d = r + randInt(1, 6)
    return fig(numeric(`Le cercle 𝒞′ est le symétrique du cercle 𝒞 de centre A par rapport au point O, avec OA = ${d} cm. Quelle est la distance entre les centres des deux cercles (en cm) ?`, 2 * d, {
      explanation: `Le centre de 𝒞′ est A′, symétrique de A par rapport à O : O est le milieu de [AA′], donc AA′ = 2 × ${d} = ${2 * d} cm.`,
    }), circlesFig(r * 0.4, d * 0.4, { dLabel: `${d} cm` }))
  },
  () => {
    const r = randInt(2, 9), d = r + randInt(1, 6)
    return fig(numeric(`Le cercle 𝒞 de centre A a un diamètre de ${2 * r} cm. Quel est le rayon de son symétrique 𝒞′ par rapport au point O (en cm) ?`, r, {
      explanation: `La symétrie conserve les longueurs : 𝒞′ a le même diamètre, ${2 * r} cm, donc un rayon de ${2 * r} ÷ 2 = ${r} cm.`,
    }), circlesFig(r * 0.4, d * 0.4))
  },
  () => {
    const r = randInt(2, 9), d = r + randInt(1, 6)
    return fig(numeric(`Le cercle 𝒞 a pour centre A et pour rayon ${r} cm. Quelle est la longueur du cercle 𝒞′, symétrique de 𝒞 par rapport à O (en cm) ? Prends π ≈ 3,14.`, 2 * 3.14 * r, {
      explanation: `𝒞′ a le même rayon que 𝒞 (la symétrie conserve les longueurs), ${r} cm. Sa longueur : 2 × π × ${r} ≈ 2 × 3,14 × ${r} = ${fmt(2 * 3.14 * r)} cm.`,
    }), circlesFig(r * 0.4, d * 0.4, { rLabel: `${r} cm` }))
  },
  () => {
    const r = randInt(2, 6), d = r + randInt(1, 5)
    return fig(numeric(`Les centres A et A′ de deux cercles symétriques par rapport à O sont à ${2 * d} cm l'un de l'autre. Quelle est la distance OA (en cm) ?`, d, {
      explanation: `O est le milieu de [AA′] : OA = ${2 * d} ÷ 2 = ${d} cm.`,
    }), circlesFig(r * 0.4, d * 0.4))
  },
)

// ═══ Palier 3 ═══════════════════════════════════════════════════════════
/** Symétrie par rapport à la diagonale y = x (ou y = −x) du quadrillage. */
function diagSym(anti: boolean, reverse: boolean): Exercise | null {
  const A = rp(3, 3)
  const A2: Pt = anti ? [-A[1], -A[0]] : [A[1], A[0]]
  if (A[0] === A[1] || (anti && A[0] === -A[1])) return null
  const R = repere({ xMin: -4, xMax: 4, yMin: -4, yMax: 4, w: 220 }), P = pick(['A', 'B', 'M'])
  R.line('d', anti ? [-4, 4] : [-4, -4], anti ? [4, -4] : [4, 4], { dashed: true, color: BLUE })
  R.note(anti ? 3.2 : 3.2, anti ? -2.6 : 3.8, '(d)')
  const [sx, sy] = reverse ? A2 : A, ans = reverse ? A : A2
  R.pt(reverse ? PRIME(P) : P, sx, sy)
  return withMeta(pair(reverse
    ? `La droite (d) est une diagonale du quadrillage. ${PRIME(P)} est le symétrique d'un point ${P} par rapport à (d). Quelles sont les coordonnées de ${P} ?`
    : `La droite (d) passe par les coins des carreaux en diagonale (voir la figure). Quelles sont les coordonnées du symétrique ${PRIME(P)} de ${P} par rapport à (d) ?`, ans[0], ans[1], {
    explanation: `La droite (d) coupe chaque carreau en diagonale : le symétrique s'obtient en ${anti ? 'échangeant l’abscisse et l’ordonnée et en changeant leurs signes' : 'échangeant l’abscisse et l’ordonnée'} (on peut le vérifier en comptant les carreaux de part et d'autre de (d)). ${co(sx, sy)} donne ${co(ans[0], ans[1])}.`,
  }), { figure: R.F })
}
const p3Grid: Maker = variants(
  () => retry(() => diagSym(false, false)),
  () => retry(() => diagSym(false, true)),
  () => retry(() => diagSym(true, false)),
  () => retry(() => {
    // image d'un sommet d'un triangle par rapport à O
    const pts = [rp(4, 3), rp(4, 3), rp(4, 3)]
    const q = randInt(0, 2), N = ['A', 'B', 'C']
    if (new Set(pts.map((p) => p.join())).size < 3) return null
    const area2 = (pts[1][0] - pts[0][0]) * (pts[2][1] - pts[0][1]) - (pts[2][0] - pts[0][0]) * (pts[1][1] - pts[0][1])
    if (Math.abs(area2) < 6) return null
    const R = repere()
    pts.forEach((p, i) => R.pt(N[i], p[0], p[1]))
    N.forEach((n, i) => R.seg(n, N[(i + 1) % 3]))
    R.poly(N, '#e2b85c')
    return withMeta(pair(`Le triangle A′B′C′ est le symétrique du triangle ABC par rapport à l'origine O. Quelles sont les coordonnées du sommet ${N[q]}′ ?`, -pts[q][0], -pts[q][1], {
      explanation: `${N[q]}${co(pts[q][0], pts[q][1])} ; par la symétrie de centre O, les deux coordonnées changent de signe : ${N[q]}′${co(-pts[q][0], -pts[q][1])}.`,
    }), { figure: R.F })
  }),
)

/** Segment [AB] horizontal ou vertical et son image par la symétrie de centre I. */
function segmentSym(q: number): Exercise | null {
  const horiz = Math.random() < 0.5, I: Pt = [randInt(-1, 1), randInt(-1, 1)]
  const A = rp(5, 3), len = randInt(2, 5) * (Math.random() < 0.5 ? 1 : -1)
  const B: Pt = horiz ? [A[0] + len, A[1]] : [A[0], A[1] + len]
  const im = (p: Pt): Pt => [2 * I[0] - p[0], 2 * I[1] - p[1]]
  const A2 = im(A), B2 = im(B)
  if (![A, B, A2, B2].every((p) => inWin(p[0], p[1]))) return null
  if ((I[0] === A[0] && I[1] === A[1]) || (I[0] === B[0] && I[1] === B[1])) return null
  const R = repere()
  R.pt('A', A[0], A[1]); R.pt('B', B[0], B[1]); R.pt('I', I[0], I[1]); R.seg('A', 'B', { color: RED })
  const M: Pt = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2], M2 = im(M)
  if (q === 0) {
    return withMeta(numeric(`On donne A${co(A[0], A[1])}, B${co(B[0], B[1])} et I${co(I[0], I[1])}. Le segment [A′B′] est le symétrique du segment [AB] par rapport au point I. Combien d'unités mesure le segment [A′B′] ?`, Math.abs(len), {
      explanation: `La symétrie centrale conserve les longueurs : A′B′ = AB = ${Math.abs(len)} unités (on compte les carreaux de A à B).`,
    }), { figure: R.F })
  }
  if (q === 1) {
    return withMeta(pair(`Le segment [A′B′] est le symétrique de [AB] par rapport au point I${co(I[0], I[1])}, avec A${co(A[0], A[1])} et B${co(B[0], B[1])}. Quelles sont les coordonnées de B′ ?`, B2[0], B2[1], {
      explanation: `I est le milieu de [BB′] : on part de B${co(B[0], B[1])}, on va jusqu'à I${co(I[0], I[1])} et on refait le même déplacement : B′${co(B2[0], B2[1])}.`,
    }), { figure: R.F })
  }
  return withMeta(pair(`A${co(A[0], A[1])} et B${co(B[0], B[1])} ont pour symétriques A′ et B′ par rapport à I${co(I[0], I[1])}. Quelles sont les coordonnées du milieu de [A′B′] ?`, M2[0], M2[1], {
    explanation: `Le milieu de [AB] est M${co(M[0], M[1])}. La symétrie conserve les milieux : le milieu de [A′B′] est le symétrique M′ de M par rapport à I, soit ${co(M2[0], M2[1])}. (On peut aussi calculer A′${co(A2[0], A2[1])} et B′${co(B2[0], B2[1])}.)`,
  }), { figure: R.F })
}
const p3Segment: Maker = variants(
  () => retry(() => segmentSym(0)),
  () => retry(() => segmentSym(1)),
  () => retry(() => segmentSym(2)),
  () => retry(() => segmentSym(1)),
)

/** Droite (d) et sa symétrique (d′) par rapport à O, sécante passant par O. */
function linesSym(q: number): Exercise {
  const a = niceAngle(35, 145), rot = randInt(-10, 10), s = rot + a
  const M = polar(-1.7, s), M2 = polar(1.7, s)
  const raw: Record<string, Pt> = { O: [0, 0], M, 'M′': M2, D1: polar(-2.4, rot, M), D2: polar(2.4, rot, M), E1: polar(-2.4, rot, M2), E2: polar(2.4, rot, M2), S1: polar(-2.6, s), S2: polar(2.6, s) }
  const asks: { arc: Arc; ans: number; name: string }[] = [
    { arc: { v: 'M′', a: 'E1', b: 'O', label: '?', red: true }, ans: a, name: 'l’angle entre (d′) et [M′O] marqué en rouge' },
    { arc: { v: 'M′', a: 'E2', b: 'O', label: '?', red: true }, ans: 180 - a, name: 'l’angle entre (d′) et [M′O] marqué en rouge' },
    { arc: { v: 'M′', a: 'E1', b: 'S2', label: '?', red: true }, ans: 180 - a, name: 'l’angle marqué en rouge en M′' },
  ]
  const k = asks[q]
  const figure = build(raw, {
    segs: [{ a: 'D1', b: 'D2' }, { a: 'E1', b: 'E2', dashed: true }, { a: 'S1', b: 'S2' }],
    arcs: [{ v: 'M', a: 'D2', b: 'O', label: deg(a) }, k.arc],
    hidden: ['D1', 'D2', 'E1', 'E2', 'S1', 'S2'],
    notes: [{ at: raw.D1, text: '(d)', dy: -12 }, { at: raw.E2, text: '(d′)', dy: -12 }],
  })
  const why = q === 0
    ? `La symétrie de centre O transforme (d) en (d′), M en M′ et la droite (MO) en elle-même. Elle conserve les angles : l'angle marqué en M a pour image l'angle rouge, qui mesure donc ${a}°. (On peut aussi dire : (d) // (d′) et ces angles sont alternes-internes.)`
    : `Par la symétrie de centre O, l'angle de ${a}° en M a pour image un angle de ${a}° en M′, placé à l'opposé (entre (d′) et [M′O) de l'autre côté). L'angle rouge lui est adjacent supplémentaire : 180 − ${a} = ${180 - a}°.`
  const prompt = pick([
    `La droite (d′) est la symétrique de la droite (d) par rapport au point O. Une droite passant par O coupe (d) en M et (d′) en M′. L'angle marqué en M mesure ${a}°. Combien mesure ${k.name} (en °) ?`,
    `On trace le symétrique (d′) de la droite (d) par rapport à O, puis une droite qui passe par O et coupe (d) en M, (d′) en M′. Sachant que l'angle marqué en M vaut ${a}°, calcule ${k.name} (en °).`,
    `Les droites (d) et (d′) sont symétriques par rapport au point O, qui est le milieu de [MM′] (M sur (d), M′ sur (d′)). L'angle marqué en M mesure ${a}°. Quelle est la mesure de ${k.name} (en °) ?`,
  ])
  return fig(numeric(prompt, k.ans, { explanation: why }), figure)
}
const p3Lines: Maker = variants(() => linesSym(0), () => linesSym(1), () => linesSym(2), () => linesSym(1))

/** ABCD obtenu par symétrie : D symétrique de B par rapport au milieu O de [AC]. */
function parallelogramBySym(q: number): Exercise | null {
  const b = randInt(55, 125), p = randInt(3, 9), r = randInt(3, 9)
  if (Math.abs(b - 90) < 8 || p === r) return null
  // B à l'origine, C sur l'axe horizontal, A placé pour que l'angle ABC mesure b
  const B: Pt = [0, 0], C: Pt = [r * 0.5, 0], A2 = polar(p * 0.5, b, B)
  const O: Pt = [(A2[0] + C[0]) / 2, (A2[1] + C[1]) / 2], D: Pt = [2 * O[0] - B[0], 2 * O[1] - B[1]]
  const raw: Record<string, Pt> = { A: A2, B, C, D, O }
  const segs: FigSegment[] = [{ a: 'A', b: 'B', label: q === 0 ? `${p} cm` : undefined }, { a: 'B', b: 'C', label: q === 0 ? `${r} cm` : undefined }, { a: 'C', b: 'D', dashed: true }, { a: 'D', b: 'A', dashed: true }, { a: 'A', b: 'C', mark: 'tick', color: GREEN }, { a: 'B', b: 'D', dashed: true }]
  const intro = `Dans le triangle ABC, O est le milieu de [AC] et D est le symétrique de B par rapport à O.`
  if (q === 0) {
    return fig(numeric(`${intro} AB = ${p} cm et BC = ${r} cm. Quel est le périmètre du quadrilatère ABCD (en cm) ?`, 2 * (p + r), {
      explanation: `La symétrie de centre O envoie A sur C et B sur D : [AB] a pour image [CD], et [BC] a pour image [DA]. Donc CD = ${p} cm et DA = ${r} cm. Périmètre : 2 × (${p} + ${r}) = ${2 * (p + r)} cm.`,
    }), build(raw, { segs }))
  }
  if (q === 1) {
    return fig(numeric(`${intro} L'angle ${ang('A', 'B', 'C')} mesure ${b}°. Combien mesure l'angle ${ang('C', 'D', 'A')} (en °) ? Indice : quelle est l'image de l'angle ${ang('A', 'B', 'C')} ?`, b, {
      explanation: `La symétrie de centre O envoie A sur C, B sur D et C sur A : l'image de l'angle ${ang('A', 'B', 'C')} est l'angle ${ang('C', 'D', 'A')}. Une symétrie conserve les angles : ${ang('C', 'D', 'A')} = ${b}°.`,
    }), build(raw, { segs, arcs: [{ v: 'B', a: 'C', b: 'A', label: deg(b) }, { v: 'D', a: 'A', b: 'C', label: '?', red: true }] }))
  }
  const ob = randInt(3, 12) / 2
  return fig(numeric(`${intro} On mesure OB = ${fmt(ob)} cm. Quelle est la longueur BD (en cm) ?`, 2 * ob, {
    explanation: `D est le symétrique de B par rapport à O : O est le milieu de [BD], donc BD = 2 × ${fmt(ob)} = ${fmt(2 * ob)} cm.`,
  }), build(raw, { segs }))
}
const p3Construct: Maker = variants(
  () => retry(() => parallelogramBySym(0)),
  () => retry(() => parallelogramBySym(1)),
  () => retry(() => parallelogramBySym(2)),
  () => retry(() => parallelogramBySym(0)),
)

// ═══ Palier 4 ═══════════════════════════════════════════════════════════
/** Deux symétries successives. */
function doubleSym(mode: 'centers' | 'axes' | 'mixed' | 'dist'): Exercise | null {
  const R = repere(), P = 'A'
  if (mode === 'centers' || mode === 'dist') {
    const O1: Pt = [randInt(-3, 0), randInt(-1, 1)], O2: Pt = mode === 'dist' ? [O1[0] + randInt(2, 4), O1[1]] : [randInt(1, 3), randInt(-2, 2)], A = rp(5, 3)
    const A1: Pt = [2 * O1[0] - A[0], 2 * O1[1] - A[1]], A2: Pt = [2 * O2[0] - A1[0], 2 * O2[1] - A1[1]]
    if (!inWin(A1[0], A1[1]) || !inWin(A2[0], A2[1]) || same(A, O1) || same(A, O2) || same(A2, A)) return null
    R.pt(P, A[0], A[1]); R.pt('I', O1[0], O1[1]); R.pt('J', O2[0], O2[1])
    if (mode === 'dist') {
      return withMeta(numeric(`On donne A${co(A[0], A[1])}, I${co(O1[0], O1[1])} et J${co(O2[0], O2[1])}. On construit A′, symétrique de A par rapport à I, puis A″, symétrique de A′ par rapport à J. Quelle est la distance AA″ (en unités) ?`, Math.abs(A2[0] - A[0]), {
        explanation: `A′${co(A1[0], A1[1])} puis A″${co(A2[0], A2[1])}. A et A″ ont la même ordonnée : AA″ = ${Math.abs(A2[0] - A[0])} unités, c'est le double de IJ = ${O2[0] - O1[0]}.`,
      }), { figure: R.F })
    }
    return withMeta(pair(`On donne A${co(A[0], A[1])}, I${co(O1[0], O1[1])} et J${co(O2[0], O2[1])}. On construit A′, symétrique de A par rapport à I, puis A″, symétrique de A′ par rapport à J. Quelles sont les coordonnées de A″ ?`, A2[0], A2[1], {
      explanation: `I est le milieu de [AA′] : A′${co(A1[0], A1[1])}. J est le milieu de [A′A″] : A″${co(A2[0], A2[1])}.`,
    }), { figure: R.F })
  }
  if (mode === 'axes') {
    const k1 = randInt(-3, -1), k2 = k1 + randInt(1, 4), A = rp(5, 3)
    const x1 = 2 * k1 - A[0], x2 = 2 * k2 - x1
    if (!inWin(x1, 0) || !inWin(x2, 0) || A[0] === k1 || k2 === 0 || x1 === k2) return null
    R.line('d', [k1, W0.yMin], [k1, W0.yMax], { dashed: true, color: BLUE }); R.line('e', [k2, W0.yMin], [k2, W0.yMax], { dashed: true, color: GREEN })
    R.note(k1 - 0.5, W0.yMax - 0.4, '(d)'); R.note(k2 + 0.6, W0.yMax - 0.4, '(e)')
    R.pt(P, A[0], A[1])
    return withMeta(pair(`Le point A${co(A[0], A[1])} a pour symétrique A′ par rapport à la droite verticale (d) (abscisse ${fmt(k1)}), puis A′ a pour symétrique A″ par rapport à la droite verticale (e) (abscisse ${fmt(k2)}). Quelles sont les coordonnées de A″ ?`, x2, A[1], {
      explanation: `Les deux droites sont verticales : l'ordonnée ne change pas. Par rapport à (d) : A′${co(x1, A[1])}. Par rapport à (e) : A″${co(x2, A[1])}.`,
    }), { figure: R.F })
  }
  const A = rp(5, 3)
  R.pt(P, A[0], A[1])
  return withMeta(pair(`On part du point A${co(A[0], A[1])}. On construit A′, symétrique de A par rapport à l'axe des ordonnées, puis A″, symétrique de A′ par rapport à l'origine O. Quelles sont les coordonnées de A″ ?`, A[0], -A[1], {
    explanation: `Par rapport à l'axe des ordonnées : A′${co(-A[0], A[1])}. Par rapport à O : les deux coordonnées changent de signe, A″${co(A[0], -A[1])}. (A″ est en fait le symétrique de A par rapport à l'axe des abscisses.)`,
  }), { figure: R.F })
}
const p4Double: Maker = variants(
  () => retry(() => doubleSym('centers')),
  () => retry(() => doubleSym('axes')),
  () => retry(() => doubleSym('mixed')),
  () => retry(() => doubleSym('dist')),
)

/** Figures ayant un axe de symétrie : angles égaux. */
function axisAngles(kind: 'kite' | 'trap' | 'rhombus' | 'iso'): Exercise | null {
  if (kind === 'kite') {
    const al = 2 * randInt(20, 50), ga = 2 * randInt(30, 60), be = (360 - al - ga) / 2
    if (be < 50 || be > 150) return null
    const w = 1.6, A: Pt = [0, w / Math.tan(rad(al / 2))], C: Pt = [0, -w / Math.tan(rad(ga / 2))]
    const raw: Record<string, Pt> = { A, B: [w, 0], C, D: [-w, 0] }
    return fig(numeric(`Le quadrilatère ABCD a pour axe de symétrie la droite (AC). On sait que ${ang('D', 'A', 'B')} = ${al}° et ${ang('B', 'C', 'D')} = ${ga}°. Combien mesure l'angle ${ang('A', 'B', 'C')} (en °) ?`, be, {
      explanation: `La symétrie d'axe (AC) échange B et D : les angles ${ang('A', 'B', 'C')} et ${ang('A', 'D', 'C')} sont égaux. La somme des angles d'un quadrilatère vaut 360° : 2 × ${ang('A', 'B', 'C')} = 360 − ${al} − ${ga} = ${360 - al - ga}, donc ${ang('A', 'B', 'C')} = ${be}°.`,
    }), build(raw, { segs: [{ a: 'A', b: 'B', mark: 'tick' }, { a: 'B', b: 'C', mark: 'tick2' }, { a: 'C', b: 'D', mark: 'tick2' }, { a: 'D', b: 'A', mark: 'tick' }, { a: 'A', b: 'C', dashed: true, color: BLUE }], arcs: [{ v: 'A', a: 'D', b: 'B', label: deg(al) }, { v: 'C', a: 'B', b: 'D', label: deg(ga) }, { v: 'B', a: 'A', b: 'C', label: '?', red: true }] }))
  }
  if (kind === 'trap') {
    const a = randInt(50, 80), h = 1.8, top = randInt(18, 30) / 10, dx = h / Math.tan(rad(a))
    const raw: Record<string, Pt> = { A: [0, 0], B: [top + 2 * dx, 0], C: [top + dx, h], D: [dx, h], M1: [(top + 2 * dx) / 2, -0.5], M2: [(top + 2 * dx) / 2, h + 0.5] }
    return fig(numeric(`ABCD est un trapèze isocèle : la médiatrice (d) de ses bases [AB] et [DC] est un axe de symétrie. L'angle ${ang('D', 'A', 'B')} mesure ${a}°. Combien mesure l'angle ${ang('B', 'C', 'D')} (en °) ?`, 180 - a, {
      explanation: `La symétrie d'axe (d) échange A et B, D et C : ${ang('A', 'B', 'C')} = ${ang('D', 'A', 'B')} = ${a}°. Les droites (AB) et (DC) sont parallèles, coupées par (BC) : ${ang('B', 'C', 'D')} et ${ang('A', 'B', 'C')} sont supplémentaires (angles internes du même côté), donc ${ang('B', 'C', 'D')} = 180 − ${a} = ${180 - a}°.`,
    }), build(raw, { segs: [{ a: 'A', b: 'B' }, { a: 'B', b: 'C', mark: 'tick' }, { a: 'C', b: 'D' }, { a: 'D', b: 'A', mark: 'tick' }, { a: 'M1', b: 'M2', dashed: true, color: BLUE }], hidden: ['M1', 'M2'], arcs: [{ v: 'A', a: 'B', b: 'D', label: deg(a) }, { v: 'C', a: 'D', b: 'B', label: '?', red: true }] }))
  }
  if (kind === 'rhombus') {
    const h = randInt(20, 70), w = 1.8
    const raw: Record<string, Pt> = { A: [-w, 0], B: [0, -w * Math.tan(rad(h))], C: [w, 0], D: [0, w * Math.tan(rad(h))] }
    const q = Math.random() < 0.5
    return fig(numeric(q
      ? `ABCD est un losange : ses diagonales (AC) et (BD) sont des axes de symétrie. L'angle ${ang('D', 'A', 'C')} mesure ${h}°. Combien mesure l'angle ${ang('D', 'A', 'B')} (en °) ?`
      : `ABCD est un losange, dont les diagonales sont des axes de symétrie. L'angle ${ang('D', 'A', 'B')} mesure ${2 * h}°. Combien mesure l'angle ${ang('C', 'A', 'B')} (en °) ?`, q ? 2 * h : h, {
      explanation: `La diagonale (AC) est un axe de symétrie : elle échange B et D, donc ${ang('C', 'A', 'B')} = ${ang('D', 'A', 'C')}. Elle partage l'angle ${ang('D', 'A', 'B')} en deux angles égaux : ${q ? `${ang('D', 'A', 'B')} = 2 × ${h} = ${2 * h}°` : `${ang('C', 'A', 'B')} = ${2 * h} ÷ 2 = ${h}°`}.`,
    }), build(raw, { segs: [{ a: 'A', b: 'B', mark: 'tick' }, { a: 'B', b: 'C', mark: 'tick' }, { a: 'C', b: 'D', mark: 'tick' }, { a: 'D', b: 'A', mark: 'tick' }, { a: 'A', b: 'C', dashed: true, color: BLUE }, { a: 'B', b: 'D', dashed: true, color: BLUE }], arcs: q ? [{ v: 'A', a: 'C', b: 'D', label: deg(h), r: 30 }, { v: 'A', a: 'B', b: 'D', label: '?', red: true, r: 18, at: 0.2 }] : [{ v: 'A', a: 'B', b: 'D', label: deg(2 * h), r: 18, at: 0.8 }, { v: 'A', a: 'B', b: 'C', label: '?', red: true, r: 30 }] }))
  }
  const apex = 2 * randInt(15, 50), half = apex / 2
  const raw: Record<string, Pt> = { A: [0, 2.6], B: [-2.6 * Math.tan(rad(half)), 0], C: [2.6 * Math.tan(rad(half)), 0], H: [0, 0] }
  return fig(numeric(`Le triangle ABC est isocèle en A ; la hauteur [AH] est son axe de symétrie. L'angle ${ang('B', 'A', 'C')} mesure ${apex}°. Combien mesure l'angle ${ang('A', 'B', 'C')} (en °) ?`, 90 - half, {
    explanation: `L'axe (AH) partage l'angle au sommet en deux : ${ang('B', 'A', 'H')} = ${half}°. Le triangle ABH est rectangle en H : ${ang('A', 'B', 'H')} = 90 − ${half} = ${90 - half}°.`,
  }), build(raw, { segs: [{ a: 'A', b: 'B', mark: 'tick' }, { a: 'A', b: 'C', mark: 'tick' }, { a: 'B', b: 'C' }, { a: 'A', b: 'H', dashed: true, color: BLUE }], arcs: [{ v: 'A', a: 'B', b: 'C', label: deg(apex), r: 26 }, { v: 'H', a: 'C', b: 'A', right: true }, { v: 'B', a: 'C', b: 'A', label: '?', red: true }] }))
}
const p4AxisAngles: Maker = variants(
  () => retry(() => axisAngles('kite')),
  () => retry(() => axisAngles('trap')),
  () => retry(() => axisAngles('rhombus')),
  () => retry(() => axisAngles('iso')),
)

/** Parallélogramme de centre O dans le repère. */
function parallelogramCenter(q: number): Exercise | null {
  const O: Pt = [randInt(-1, 1), randInt(-1, 1)], A = rp(5, 3), B = rp(5, 3)
  const C: Pt = [2 * O[0] - A[0], 2 * O[1] - A[1]], D: Pt = [2 * O[0] - B[0], 2 * O[1] - B[1]]
  if (![C, D].every((p) => inWin(p[0], p[1]))) return null
  const cr = (B[0] - A[0]) * (O[1] - A[1]) - (B[1] - A[1]) * (O[0] - A[0])
  if (Math.abs(cr) < 3) return null
  const R = repere()
  if (q === 0) {
    R.pt('A', A[0], A[1]); R.pt('B', B[0], B[1]); R.pt('O', O[0], O[1]); R.seg('A', 'B')
    return withMeta(pair(`ABCD est un parallélogramme de centre O${co(O[0], O[1])} : O est son centre de symétrie. On connaît A${co(A[0], A[1])} et B${co(B[0], B[1])}. Quelles sont les coordonnées du sommet C ?`, C[0], C[1], {
      explanation: `C est le symétrique de A par rapport à O (les diagonales se coupent en leur milieu O) : C${co(C[0], C[1])}.`,
    }), { figure: R.F })
  }
  if (q === 1) {
    R.pt('A', A[0], A[1]); R.pt('B', B[0], B[1]); R.pt('O', O[0], O[1]); R.seg('A', 'B')
    return withMeta(pair(`ABCD est un parallélogramme de centre O${co(O[0], O[1])}, avec A${co(A[0], A[1])} et B${co(B[0], B[1])}. Quelles sont les coordonnées du sommet D ?`, D[0], D[1], {
      explanation: `D est le symétrique de B par rapport au centre O : D${co(D[0], D[1])}.`,
    }), { figure: R.F })
  }
  R.pt('A', A[0], A[1]); R.pt('B', B[0], B[1]); R.pt('C', C[0], C[1]); R.seg('A', 'B'); R.seg('B', 'C')
  if (q === 2) {
    return withMeta(pair(`ABCD est un parallélogramme avec A${co(A[0], A[1])}, B${co(B[0], B[1])} et C${co(C[0], C[1])}. Quelles sont les coordonnées de son centre de symétrie ?`, O[0], O[1], {
      explanation: `Le centre est le milieu de la diagonale [AC] : (${half(A[0], C[0])} ; ${half(A[1], C[1])}) = ${co(O[0], O[1])}.`,
    }), { figure: R.F })
  }
  return withMeta(pair(`ABCD est un parallélogramme avec A${co(A[0], A[1])}, B${co(B[0], B[1])} et C${co(C[0], C[1])}. Quelles sont les coordonnées du quatrième sommet D ?`, D[0], D[1], {
    explanation: `Le centre O est le milieu de [AC] : O${co(O[0], O[1])}. D est le symétrique de B par rapport à O : D${co(D[0], D[1])}.`,
  }), { figure: R.F })
}
const p4Parallelogram: Maker = variants(
  () => retry(() => parallelogramCenter(0)),
  () => retry(() => parallelogramCenter(1)),
  () => retry(() => parallelogramCenter(2)),
  () => retry(() => parallelogramCenter(3)),
)

const p4Circles: Maker = variants(
  fresh(() => {
    const r = randInt(2, 5), d = r + randInt(1, 5)
    return fig(numeric(`Le cercle 𝒞 de centre A a un rayon de ${r} cm, et OA = ${d} cm. 𝒞′ est son symétrique par rapport à O. Quelle est la plus petite distance entre un point de 𝒞 et un point de 𝒞′ (en cm) ?`, 2 * d - 2 * r, {
      explanation: `AA′ = 2 × ${d} = ${2 * d} cm et 𝒞′ a aussi un rayon de ${r} cm. Sur le segment [AA′], on enlève les deux rayons : ${2 * d} − ${r} − ${r} = ${2 * d - 2 * r} cm.`,
    }), circlesFig(r * 0.35, d * 0.35, { rLabel: `${r} cm`, dLabel: `${d} cm` }))
  }),
  fresh(() => {
    const r = randInt(2, 5), d = r + randInt(1, 5)
    return fig(numeric(`Le cercle 𝒞 de centre A a un rayon de ${r} cm, et OA = ${d} cm. 𝒞′ est son symétrique par rapport à O. Quelle est la plus grande distance entre un point de 𝒞 et un point de 𝒞′ (en cm) ?`, 2 * d + 2 * r, {
      explanation: `AA′ = 2 × ${d} = ${2 * d} cm. Les deux points les plus éloignés sont sur la droite (AA′), à l'extérieur : ${r} + ${2 * d} + ${r} = ${2 * d + 2 * r} cm.`,
    }), circlesFig(r * 0.35, d * 0.35, { rLabel: `${r} cm`, dLabel: `${d} cm` }))
  }),
  fresh(() => {
    const r = randInt(2, 8)
    return fig(numeric(`Le cercle 𝒞 de centre A a un rayon de ${r} cm et passe par le point O. Son symétrique 𝒞′ par rapport à O touche 𝒞 en O. Quelle est la distance AA′ entre les deux centres (en cm) ?`, 2 * r, {
      explanation: `O est sur 𝒞, donc OA est un rayon : OA = ${r} cm. O est le milieu de [AA′] : AA′ = 2 × ${r} = ${2 * r} cm. (Les deux cercles se touchent en O.)`,
    }), circlesFig(1, 1))
  }),
  fresh(() => {
    const r = randInt(2, 6), d = r + randInt(1, 5)
    return fig(numeric(`Deux cercles de rayon ${r} cm sont symétriques par rapport au point O. La plus petite distance entre eux vaut ${2 * d - 2 * r} cm. Quelle est la distance OA entre O et le centre A d'un des cercles (en cm) ?`, d, {
      explanation: `AA′ = ${r} + ${2 * d - 2 * r} + ${r} = ${2 * d} cm, et O est le milieu de [AA′] : OA = ${d} cm.`,
    }), circlesFig(r * 0.35, d * 0.35, { rLabel: `${r} cm` }))
  }),
)

// ═══ Palier 5 ═══════════════════════════════════════════════════════════
/** Aire du parallélogramme ABA′B′ (A, B sur une même horizontale, symétrie de centre I). */
function areaParallelogram(): Exercise | null {
  const I: Pt = [randInt(-1, 1), randInt(-1, 1)], y = I[1] + randNonZero(-3, 3), xa = randInt(-5, 2), len = randInt(2, 5)
  const A: Pt = [xa, y], B: Pt = [xa + len, y], A2: Pt = [2 * I[0] - A[0], 2 * I[1] - y], B2: Pt = [2 * I[0] - B[0], 2 * I[1] - y]
  if (![A, B, A2, B2].every((p) => inWin(p[0], p[1]))) return null
  const h = Math.abs(2 * (I[1] - y))
  const R = repere()
  R.pt('A', A[0], A[1]); R.pt('B', B[0], B[1]); R.pt('I', I[0], I[1]); R.seg('A', 'B', { color: RED })
  return withMeta(numeric(`A′ et B′ sont les symétriques de A${co(A[0], A[1])} et B${co(B[0], B[1])} par rapport au point I${co(I[0], I[1])}. Quelle est l'aire du quadrilatère ABA′B′ (en unités d'aire, un carreau valant 1) ?`, len * h, {
    explanation: `I est le milieu des diagonales [AA′] et [BB′] : ABA′B′ est un parallélogramme. A′${co(A2[0], A2[1])}, B′${co(B2[0], B2[1])} : le côté [A′B′] est horizontal, comme [AB]. Base AB = ${len}, hauteur = distance entre les deux horizontales = ${h}. Aire = ${len} × ${h} = ${len * h}.`,
  }), { figure: R.F })
}
/** Aire de l'image d'un triangle rectangle du quadrillage. */
function areaTriangleImage(): Exercise | null {
  const A = rp(4, 2), w = randNonZero(-4, 4), h = randNonZero(-3, 3), B: Pt = [A[0] + w, A[1]], C: Pt = [A[0], A[1] + h]
  if (![B, C].every((p) => inWin(p[0], p[1])) || (w * h) % 2 !== 0) return null
  const kind = pick(['à l’origine O', 'à l’axe des abscisses', 'à l’axe des ordonnées'])
  const R = repere()
  R.pt('A', A[0], A[1]); R.pt('B', B[0], B[1]); R.pt('C', C[0], C[1]); R.seg('A', 'B'); R.seg('B', 'C'); R.seg('C', 'A'); R.poly(['A', 'B', 'C'], '#e2b85c')
  return withMeta(numeric(`Le triangle ABC a pour sommets A${co(A[0], A[1])}, B${co(B[0], B[1])} et C${co(C[0], C[1])}. On construit son symétrique A′B′C′ par rapport ${kind}. Quelle est l'aire du triangle A′B′C′ (en carreaux) ?`, Math.abs(w * h) / 2, {
    explanation: `La symétrie conserve les aires : aire(A′B′C′) = aire(ABC). ABC est rectangle en A avec AB = ${Math.abs(w)} et AC = ${Math.abs(h)} : ${Math.abs(w)} × ${Math.abs(h)} ÷ 2 = ${Math.abs(w * h) / 2}.`,
  }), { figure: R.F })
}
const p5Area: Maker = variants(
  () => retry(areaParallelogram),
  () => retry(areaTriangleImage),
  () => retry(areaParallelogram),
  () => retry(areaTriangleImage),
)

/** Retrouver la symétrie (centre ou axe) à partir d'un couple de points, puis l'appliquer. */
function findSym(kind: 'center' | 'v' | 'h'): Exercise | null {
  const R = repere(), A = rp(5, 3), B = rp(5, 3)
  if (A[0] === B[0] && A[1] === B[1]) return null
  if (kind === 'center') {
    const I: Pt = [randInt(-2, 2), randInt(-1, 1)], A2: Pt = [2 * I[0] - A[0], 2 * I[1] - A[1]], B2: Pt = [2 * I[0] - B[0], 2 * I[1] - B[1]]
    if (![A2, B2].every((p) => inWin(p[0], p[1])) || same(A, I) || same(A2, B) || same(B, I)) return null
    R.pt('A', A[0], A[1]); R.pt('A′', A2[0], A2[1]); R.pt('B', B[0], B[1]); R.seg('A', 'A′', { dashed: true })
    return withMeta(pair(`A′${co(A2[0], A2[1])} est le symétrique de A${co(A[0], A[1])} par rapport à un point I (qui n'est pas tracé). On donne B${co(B[0], B[1])}. Quelles sont les coordonnées du symétrique B′ de B par rapport à ce même point I ?`, B2[0], B2[1], {
      explanation: `I est le milieu de [AA′] : I${co(I[0], I[1])}. Puis I est le milieu de [BB′] : B′${co(B2[0], B2[1])}.`,
    }), { figure: R.F })
  }
  const k = kind === 'v' ? randInt(-3, 3) : randInt(-2, 2)
  const A2: Pt = kind === 'v' ? [2 * k - A[0], A[1]] : [A[0], 2 * k - A[1]], B2: Pt = kind === 'v' ? [2 * k - B[0], B[1]] : [B[0], 2 * k - B[1]]
  if (![A2, B2].every((p) => inWin(p[0], p[1])) || (kind === 'v' ? A[0] === k || B[0] === k : A[1] === k || B[1] === k) || Math.hypot(A2[0] - B[0], A2[1] - B[1]) < 1.5 || Math.hypot(A[0] - B[0], A[1] - B[1]) < 1.5) return null
  R.pt('A', A[0], A[1]); R.pt('A′', A2[0], A2[1]); R.pt('B', B[0], B[1]); R.seg('A', 'A′', { dashed: true })
  return withMeta(pair(`A′${co(A2[0], A2[1])} est le symétrique de A${co(A[0], A[1])} par rapport à une droite (d) ${kind === 'v' ? 'verticale' : 'horizontale'} (non tracée). On donne B${co(B[0], B[1])}. Quelles sont les coordonnées du symétrique B′ de B par rapport à (d) ?`, B2[0], B2[1], {
    explanation: `(d) est la médiatrice de [AA′] : c'est la droite ${kind === 'v' ? 'verticale' : 'horizontale'} formée des points ${kind === 'v' ? `d'abscisse ${half(A[0], A2[0])} = ${fmt(k)}` : `d'ordonnée ${half(A[1], A2[1])} = ${fmt(k)}`}. B est à ${kind === 'v' ? Math.abs(B[0] - k) : Math.abs(B[1] - k)} unité(s) de (d) : B′${co(B2[0], B2[1])}.`,
  }), { figure: R.F })
}
const p5Find: Maker = variants(
  () => retry(() => findSym('center')),
  () => retry(() => findSym('v')),
  () => retry(() => findSym('h')),
  () => retry(() => findSym('center')),
)

/** Réflexion d'une demi-droite par rapport à un axe ; rayon lumineux sur un miroir. */
const p5Reflect: Maker = variants(
  () => {
    const a = randInt(15, 75), rot = randInt(-10, 30)
    const raw: Record<string, Pt> = { O: [0, 0], X: polar(3, rot), Y: polar(3, rot + a), Z: polar(3, rot + 2 * a) }
    return fig(numeric(`La demi-droite [Oz) est la symétrique de [Ox) par rapport à la droite (Oy). L'angle ${ang('x', 'O', 'y')} mesure ${a}°. Combien mesure l'angle ${ang('x', 'O', 'z')} (en °) ?`, 2 * a, {
      explanation: `La symétrie d'axe (Oy) conserve les angles : ${ang('y', 'O', 'z')} = ${ang('x', 'O', 'y')} = ${a}°. Donc ${ang('x', 'O', 'z')} = ${a} + ${a} = ${2 * a}° (l'axe (Oy) est la bissectrice de ${ang('x', 'O', 'z')}).`,
    }), build(raw, { segs: [{ a: 'O', b: 'X' }, { a: 'O', b: 'Y', dashed: true, color: BLUE }, { a: 'O', b: 'Z' }], hidden: ['X', 'Y', 'Z'], notes: [{ at: polar(3.35, rot), text: 'x' }, { at: polar(3.35, rot + a), text: 'y' }, { at: polar(3.35, rot + 2 * a), text: 'z' }], arcs: [{ v: 'O', a: 'X', b: 'Y', label: deg(a), r: 26 }, { v: 'O', a: 'X', b: 'Z', label: '?', red: true, r: 46, at: 0.8 }] }))
  },
  fresh(() => {
    const a = randInt(15, 80), rot = randInt(-10, 20)
    const raw: Record<string, Pt> = { O: [0, 0], X: polar(3, rot), Y: polar(3, rot + a), Z: polar(3, rot + 2 * a) }
    return fig(numeric(`Les demi-droites [Ox) et [Oz) sont symétriques par rapport à une droite (Oy), et ${ang('x', 'O', 'z')} = ${2 * a}°. Combien mesure l'angle ${ang('x', 'O', 'y')} (en °) ?`, a, {
      explanation: `La symétrie d'axe (Oy) conserve les angles : ${ang('x', 'O', 'y')} = ${ang('y', 'O', 'z')}. L'axe partage donc ${ang('x', 'O', 'z')} en deux : ${2 * a} ÷ 2 = ${a}°.`,
    }), build(raw, { segs: [{ a: 'O', b: 'X' }, { a: 'O', b: 'Y', dashed: true, color: BLUE }, { a: 'O', b: 'Z' }], hidden: ['X', 'Y', 'Z'], notes: [{ at: polar(3.35, rot), text: 'x' }, { at: polar(3.35, rot + a), text: 'y' }, { at: polar(3.35, rot + 2 * a), text: 'z' }], arcs: [{ v: 'O', a: 'X', b: 'Z', label: deg(2 * a), r: 46, at: 0.8 }, { v: 'O', a: 'X', b: 'Y', label: '?', red: true, r: 26 }] }))
  }),
  () => {
    const a = randInt(20, 70)
    const I: Pt = [0, 0], S = polar(3, 180 - a), T = polar(3, a), N: Pt = [0, 2.6]
    const raw: Record<string, Pt> = { I, S, T, N, M1: [-3.2, 0], M2: [3.2, 0] }
    return fig(numeric(`Un rayon de lumière [SI] frappe un miroir plan en I en faisant un angle de ${a}° avec le miroir. Le rayon réfléchi [IT] est le symétrique de la demi-droite [IS) par rapport à la perpendiculaire (IN) au miroir. Quel angle ${ang('S', 'I', 'T')} forment les deux rayons (en °) ?`, 180 - 2 * a, {
      explanation: `La symétrie d'axe (IN) conserve les angles : le rayon réfléchi fait lui aussi ${a}° avec le miroir. Le long du miroir : ${a} + ${ang('S', 'I', 'T')} + ${a} = 180, donc ${ang('S', 'I', 'T')} = 180 − 2 × ${a} = ${180 - 2 * a}°.`,
    }), build(raw, { segs: [{ a: 'M1', b: 'M2' }, { a: 'S', b: 'I' }, { a: 'I', b: 'T' }, { a: 'I', b: 'N', dashed: true, color: BLUE }], hidden: ['M1', 'M2'], arcs: [{ v: 'I', a: 'M1', b: 'S', label: deg(a) }, { v: 'I', a: 'S', b: 'T', label: '?', red: true, r: 34, at: 0.25 }, { v: 'I', a: 'M2', b: 'N', right: true }] }))
  },
  fresh(() => {
    const a = randInt(20, 70)
    const I: Pt = [0, 0], S = polar(3, 180 - a), T = polar(3, a), N: Pt = [0, 2.6]
    const raw: Record<string, Pt> = { I, S, T, N, M1: [-3.2, 0], M2: [3.2, 0] }
    return fig(numeric(`Sur un miroir plan, le rayon réfléchi [IT] est le symétrique du rayon [IS] par rapport à la perpendiculaire (IN) au miroir. Les deux rayons forment un angle ${ang('S', 'I', 'T')} de ${180 - 2 * a}°. Quel angle le rayon [IT] fait-il avec le miroir (en °) ?`, a, {
      explanation: `Par symétrie d'axe (IN), les deux rayons font le même angle avec le miroir. Ces deux angles et ${ang('S', 'I', 'T')} forment un angle plat : (180 − ${180 - 2 * a}) ÷ 2 = ${a}°.`,
    }), build(raw, { segs: [{ a: 'M1', b: 'M2' }, { a: 'S', b: 'I' }, { a: 'I', b: 'T' }, { a: 'I', b: 'N', dashed: true, color: BLUE }], hidden: ['M1', 'M2'], arcs: [{ v: 'I', a: 'S', b: 'T', label: deg(180 - 2 * a), r: 34, at: 0.25 }, { v: 'I', a: 'M2', b: 'T', label: '?', red: true }] }))
  }),
)

/** Figures composées : nombre d'axes de symétrie. */
interface Compo { what: string; axes: number; why: string; build: () => Figure }
const sq = (s = 2): Pt[] => [[-s, -s], [s, -s], [s, s], [-s, s]]
function compoFig(polys: Pt[][], circles: { c: Pt; r: number }[] = []): Figure {
  const raw: Record<string, Pt> = {}, segs: FigSegment[] = [], fills: { pts: string[]; fill: string }[] = [], hidden: string[] = []
  polys.forEach((pl, i) => {
    pl.forEach((p, j) => { raw[`p${i}_${j}`] = p; hidden.push(`p${i}_${j}`); if (j > 0) segs.push({ a: `p${i}_${j - 1}`, b: `p${i}_${j}` }) })
    segs.push({ a: `p${i}_${pl.length - 1}`, b: `p${i}_0` })
    if (i === 0) fills.push({ pts: pl.map((_, j) => `p${i}_${j}`), fill: '#e2b85c' })
  })
  const cs = circles.map((c, i) => { raw[`c${i}`] = c.c; hidden.push(`c${i}`); return { c: `c${i}`, r: c.r } })
  return build(raw, { segs, hidden, polys: fills, circles: cs, margin: 30, caption: '' })
}
const COMPOS: Compo[] = [
  { what: 'un carré et ses deux diagonales', axes: 4, why: 'les axes du carré (2 diagonales, 2 médiatrices) conservent aussi les diagonales', build: () => compoFig([sq(), [[-2, -2], [2, 2]], [[2, -2], [-2, 2]]]) },
  { what: 'un carré avec un petit carré dans un coin', axes: 1, why: 'seule la diagonale qui passe par ce coin replie la figure sur elle-même', build: () => compoFig([sq(), [[1, 1], [2, 1], [2, 2], [1, 2]]]) },
  { what: 'un carré et le cercle inscrit', axes: 4, why: 'le cercle est conservé par tous les axes du carré : il en reste 4', build: () => compoFig([sq()], [{ c: [0, 0], r: 2 }]) },
  { what: 'un rectangle et un cercle placé en son centre', axes: 2, why: 'les 2 médiatrices des côtés du rectangle conservent aussi le cercle', build: () => compoFig([[[-3, -1.6], [3, -1.6], [3, 1.6], [-3, 1.6]]], [{ c: [0, 0], r: 1 }]) },
  { what: 'un rectangle et un cercle centré sur le milieu d’un de ses longs côtés', axes: 1, why: 'seule la médiatrice du long côté passe par le centre du cercle', build: () => compoFig([[[-3, -1.6], [3, -1.6], [3, 1.6], [-3, 1.6]]], [{ c: [0, -1.6], r: 0.9 }]) },
  { what: 'un triangle équilatéral et le cercle de même centre', axes: 3, why: 'les 3 axes du triangle passent par son centre et conservent le cercle', build: () => compoFig([regular(3, 2.4)], [{ c: [0, 0], r: 0.9 }]) },
  { what: 'une croix formée de cinq carrés égaux', axes: 4, why: 'les 2 axes horizontal et vertical et les 2 diagonales', build: () => compoFig([[[-1, -3], [1, -3], [1, -1], [3, -1], [3, 1], [1, 1], [1, 3], [-1, 3], [-1, 1], [-3, 1], [-3, -1], [-1, -1]]]) },
  { what: 'un T formé de quatre carrés égaux', axes: 1, why: 'seul l’axe vertical replie la figure sur elle-même', build: () => compoFig([[[-3, 1], [-1, 1], [-1, -1], [1, -1], [1, 1], [3, 1], [3, 3], [-3, 3]]]) },
  { what: 'un hexagone régulier et ses trois grandes diagonales', axes: 6, why: 'les 6 axes de l’hexagone conservent l’ensemble des trois diagonales', build: () => compoFig([regular(6, 2.4), [polar(2.4, 90), polar(2.4, 270)], [polar(2.4, 150), polar(2.4, 330)], [polar(2.4, 210), polar(2.4, 30)]]) },
]
const p5Compo: Maker = variants(
  () => { const c = pick(COMPOS.slice(0, 3)); return fig(numeric(`Combien d'axes de symétrie possède la figure ci-dessous (${c.what}) ?`, c.axes, { explanation: `${c.axes} axe${c.axes > 1 ? 's' : ''} : ${c.why}.` }), c.build()) },
  () => { const c = pick(COMPOS.slice(3, 6)); return fig(numeric(`La figure ci-dessous représente ${c.what}. Combien a-t-elle d'axes de symétrie ?`, c.axes, { explanation: `${c.axes} axe${c.axes > 1 ? 's' : ''} : ${c.why}.` }), c.build()) },
  () => { const c = pick(COMPOS.slice(6)); return fig(numeric(`Voici ${c.what}. Combien cette figure a-t-elle d'axes de symétrie ?`, c.axes, { explanation: `${c.axes} axe${c.axes > 1 ? 's' : ''} : ${c.why}.` }), c.build()) },
  () => { const c = pick(COMPOS); return fig(numeric(`Trouve le nombre d'axes de symétrie de la figure ci-dessous : ${c.what}.`, c.axes, { explanation: `${c.axes} axe${c.axes > 1 ? 's' : ''} : ${c.why}.` }), c.build()) },
)

// ═══ Problèmes d'amélioration ═══════════════════════════════════════════
/** Figure en escalier (colonnes de carreaux) à gauche d'un axe vertical, à compléter par symétrie. */
function stairs(): Exercise {
  const n = randInt(3, 4), heights = Array.from({ length: n }, () => randInt(1, 4)), gap = randInt(0, 1)
  const x0 = 5 - gap - n
  const R = repere({ xMin: 0, xMax: 10, yMin: 0, yMax: 6, labelStep: 100, h: 210 })
  const pts: string[] = []
  const P = (x: number, y: number) => { const k = `q${pts.length}`; R.pt(k, x, y, { hide: true }); pts.push(k); return k }
  P(x0, 0)
  heights.forEach((h, i) => { P(x0 + i, h); P(x0 + i + 1, h) })
  P(x0 + n, 0)
  pts.forEach((k, i) => R.seg(k, pts[(i + 1) % pts.length]))
  R.poly([...pts], '#e2b85c')
  R.line('d', [5, 0], [5, 5], { dashed: true, color: BLUE })
  R.note(5.5, 4.6, '(d)')
  const area = heights.reduce((s, h) => s + h, 0)
  return titled('La figure complétée', numeric(`${pick(['Pour créer une mosaïque', 'Pour dessiner un motif en pixels', 'Pour décorer un carrelage', 'Pour broder un motif'])}, on complète la figure colorée (${n} colonnes de carreaux) par son symétrique par rapport à la droite (d). Quelle est l'aire totale du motif, en carreaux ?`, 2 * area, {
    explanation: `La figure colorée compte ${heights.join(' + ')} = ${area} carreaux. La symétrie conserve les aires et l'image ne la recouvre pas : ${area} × 2 = ${2 * area} carreaux.`,
  }), R.F)
}
function lakeReflection(): Exercise {
  const h = randInt(2, 4), x = randInt(-4, 4), k = randInt(-1, 0)
  const R = repere({ yMin: -5, yMax: 4 })
  R.line('w', [W0.xMin, k], [W0.xMax, k], { color: BLUE })
  R.note(W0.xMax - 1, k - 0.5, 'eau')
  R.pt('S', x, k + h); R.pt('P', x, k, { pos: 'se' }); R.seg('P', 'S', { color: GREEN })
  return titled('Le reflet dans l’étang', pair(`Un arbre [PS] pousse au bord d'un étang dont la surface est la droite bleue, horizontale, d'ordonnée ${fmt(k)}. Son sommet est S${co(x, k + h)}. Le reflet du sommet S est son symétrique par rapport à cette droite. Quelles sont les coordonnées du reflet S′ ?`, x, 2 * k - (k + h), {
    explanation: `S${co(x, k + h)} est à ${h} unités au-dessus de la surface (ordonnée ${fmt(k)}). Son reflet est à ${h} unités en dessous, avec la même abscisse : S′${co(x, k - h)}.`,
  }), R.F)
}
function mysteryPoint(): Exercise {
  const A = rp(5, 3)
  const R = repere()
  R.pt('A', A[0], A[1])
  const v = randInt(0, 1)
  return titled('Le point mystère', pair(v === 0
    ? `On part de A${co(A[0], A[1])}. A′ est le symétrique de A par rapport à l'origine O, puis A″ est le symétrique de A′ par rapport à l'axe des abscisses. Quelles sont les coordonnées de A″ ?`
    : `On part de A${co(A[0], A[1])}. A′ est le symétrique de A par rapport à l'axe des abscisses, puis A″ est le symétrique de A′ par rapport à l'axe des ordonnées. Quelles sont les coordonnées de A″ ?`, -A[0], v === 0 ? A[1] : -A[1], {
    explanation: v === 0
      ? `A${co(A[0], A[1])}, A′${co(-A[0], -A[1])} (les deux coordonnées changent de signe), puis A″${co(-A[0], A[1])} (seule l'ordonnée change de signe). A″ est le symétrique de A par rapport à l'axe des ordonnées.`
      : `A${co(A[0], A[1])}, A′${co(A[0], -A[1])}, puis A″${co(-A[0], -A[1])}. A″ est le symétrique de A par rapport à l'origine.`,
  }), R.F)
}
const up1: Maker[] = [stairs, lakeReflection, mysteryPoint]
const up2: Maker[] = [
  () => retry(() => {
    const A = rp(5, 3), B = rp(5, 3), C = rp(5, 3), D: Pt = [A[0] + C[0] - B[0], A[1] + C[1] - B[1]]
    if (!inWin(D[0], D[1]) || (A[0] + C[0]) % 2 || (A[1] + C[1]) % 2) return null
    const cr = (B[0] - A[0]) * (C[1] - A[1]) - (B[1] - A[1]) * (C[0] - A[0])
    if (Math.abs(cr) < 6) return null
    const R = repere()
    R.pt('A', A[0], A[1]); R.pt('B', B[0], B[1]); R.pt('C', C[0], C[1]); R.seg('A', 'B'); R.seg('B', 'C')
    const O: Pt = [(A[0] + C[0]) / 2, (A[1] + C[1]) / 2]
    return titled('Le quatrième sommet', pair(`On a A${co(A[0], A[1])}, B${co(B[0], B[1])} et C${co(C[0], C[1])}. On veut placer le point D pour que ABCD soit un parallélogramme. Pour cela, on prend le milieu O de [AC] et on construit D, symétrique de B par rapport à O. Quelles sont les coordonnées de D ?`, D[0], D[1], {
      explanation: `O, milieu de [AC] : O${co(O[0], O[1])}. D est le symétrique de B par rapport à O : D${co(D[0], D[1])}. Les diagonales [AC] et [BD] ont le même milieu, donc ABCD est un parallélogramme.`,
    }), R.F)
  }),
  () => retry(() => {
    const k1 = randInt(-3, -1), k2 = k1 + randInt(1, 4), A: Pt = [randInt(-5, k1 - 1), randNonZero(-3, 3)]
    const x1 = 2 * k1 - A[0], x2 = 2 * k2 - x1
    if (!inWin(x1, 0) || !inWin(x2, 0) || k2 === 0) return null
    const R = repere()
    R.line('d', [k1, W0.yMin], [k1, W0.yMax], { dashed: true, color: BLUE }); R.line('e', [k2, W0.yMin], [k2, W0.yMax], { dashed: true, color: GREEN })
    R.note(k1 - 0.5, W0.yMax - 0.4, '(d)'); R.note(k2 + 0.6, W0.yMax - 0.4, '(e)')
    R.pt('A', A[0], A[1])
    return titled('Les deux miroirs', numeric(`Deux miroirs (d) et (e) sont parallèles (droites verticales d'abscisses ${fmt(k1)} et ${fmt(k2)}). A′ est le symétrique de A${co(A[0], A[1])} par rapport à (d), puis A″ est le symétrique de A′ par rapport à (e). Quelle est la distance AA″, en unités ?`, x2 - A[0], {
      explanation: `L'ordonnée ne change pas. A′ a pour abscisse ${fmt(x1)} et A″ pour abscisse ${fmt(x2)} : AA″ = ${fmt(x2)} − (${fmt(A[0])}) = ${fmt(x2 - A[0])}. C'est le double de la distance entre les deux miroirs (${k2 - k1}).`,
    }), R.F)
  }),
  () => withMeta(p4Circles(), { title: 'Les cercles symétriques' }),
]
const up3: Maker[] = [
  () => retry(() => {
    const O1: Pt = [randInt(-3, 0), randInt(-2, 1)], O2: Pt = [randInt(0, 3), randInt(-1, 2)], A = rp(5, 3)
    const A1: Pt = [2 * O1[0] - A[0], 2 * O1[1] - A[1]], A2: Pt = [2 * O2[0] - A1[0], 2 * O2[1] - A1[1]]
    if (!inWin(A1[0], A1[1]) || !inWin(A2[0], A2[1]) || same(O1, O2) || same(A, O1) || same(A, O2)) return null
    const R = repere()
    R.pt('A', A[0], A[1]); R.pt('I', O1[0], O1[1]); R.pt('J', O2[0], O2[1])
    return titled('Deux centres de symétrie', pair(`On donne A${co(A[0], A[1])}, I${co(O1[0], O1[1])} et J${co(O2[0], O2[1])}. A′ est le symétrique de A par rapport à I, et A″ celui de A′ par rapport à J. Quelles sont les coordonnées de A″ ? (Remarque ce qui se passe : on passe de A à A″ par un glissement.)`, A2[0], A2[1], {
      explanation: `A′${co(A1[0], A1[1])} puis A″${co(A2[0], A2[1])}. On remarque que pour aller de A à A″, on se déplace de ${fmt(A2[0] - A[0])} et ${fmt(A2[1] - A[1])} : deux fois le déplacement de I à J.`,
    }), R.F)
  }),
  () => {
    const h = randInt(25, 65), w = 1.8, q = randInt(0, 1)
    const raw: Record<string, Pt> = { A: [-w, 0], B: [0, -w * Math.tan(rad(h))], C: [w, 0], D: [0, w * Math.tan(rad(h))], O: [0, 0] }
    return titled('Le losange et ses axes', numeric(q === 0
      ? `ABCD est un losange de centre O : ses diagonales sont ses axes de symétrie et elles sont perpendiculaires. L'angle ${ang('O', 'A', 'B')} mesure ${h}°. Combien mesure l'angle ${ang('A', 'B', 'C')} (en °) ?`
      : `ABCD est un losange de centre O. L'angle ${ang('D', 'A', 'B')} mesure ${2 * h}°. Combien mesure l'angle ${ang('O', 'B', 'A')} (en °) ?`, q === 0 ? 180 - 2 * h : 90 - h, {
      explanation: q === 0
        ? `Le triangle AOB est rectangle en O : ${ang('O', 'B', 'A')} = 90 − ${h} = ${90 - h}°. L'axe (BD) partage ${ang('A', 'B', 'C')} en deux angles égaux : ${ang('A', 'B', 'C')} = 2 × ${90 - h} = ${180 - 2 * h}°.`
        : `L'axe (AC) partage ${ang('D', 'A', 'B')} en deux : ${ang('O', 'A', 'B')} = ${h}°. Les diagonales sont perpendiculaires : dans le triangle AOB rectangle en O, ${ang('O', 'B', 'A')} = 90 − ${h} = ${90 - h}°.`,
    }), build(raw, { segs: [{ a: 'A', b: 'B', mark: 'tick' }, { a: 'B', b: 'C', mark: 'tick' }, { a: 'C', b: 'D', mark: 'tick' }, { a: 'D', b: 'A', mark: 'tick' }, { a: 'A', b: 'C', dashed: true, color: BLUE }, { a: 'B', b: 'D', dashed: true, color: BLUE }], arcs: q === 0 ? [{ v: 'A', a: 'O', b: 'B', label: deg(h), r: 30 }, { v: 'B', a: 'A', b: 'C', label: '?', red: true }, { v: 'O', a: 'C', b: 'D', right: true }] : [{ v: 'A', a: 'B', b: 'D', label: deg(2 * h) }, { v: 'B', a: 'O', b: 'A', label: '?', red: true }, { v: 'O', a: 'C', b: 'D', right: true }] }))
  },
  () => {
    const a = randInt(20, 70)
    // miroirs perpendiculaires : (OX) horizontal, (OY) vertical ; rayon entrant S→P sur (OX), réfléchi vers Q sur (OY), puis ressort
    const P: Pt = [2.4, 0], Q: Pt = [0, 2.4 * Math.tan(rad(a))], T = polar(2.4, a, Q)
    const raw: Record<string, Pt> = { O: [0, 0], X: [4.2, 0], Y: [0, Math.max(Q[1] + 1, 3)], P, Q, S: polar(2.2, a, P), T }
    return titled('Le coin de miroirs', numeric(`Deux miroirs (OX) et (OY) sont perpendiculaires. Un rayon lumineux frappe (OX) en P en faisant un angle de ${a}° avec ce miroir ; il se réfléchit (même angle de part et d'autre) vers Q sur (OY), puis se réfléchit à nouveau. Quel angle le rayon réfléchi en Q fait-il avec le miroir (OY) (en °) ?`, 90 - a, {
      explanation: `En P, le rayon réfléchi [PQ] fait aussi ${a}° avec (OX) : ${ang('O', 'P', 'Q')} = ${a}°. Le triangle OPQ est rectangle en O : ${ang('O', 'Q', 'P')} = 90 − ${a} = ${90 - a}°. En Q, le rayon repart en faisant le même angle avec (OY) : ${90 - a}°. (Il repart parallèlement au rayon de départ !)`,
    }), build(raw, { segs: [{ a: 'O', b: 'X', color: BLUE }, { a: 'O', b: 'Y', color: BLUE }, { a: 'S', b: 'P' }, { a: 'P', b: 'Q' }, { a: 'Q', b: 'T' }], arcs: [{ v: 'O', a: 'X', b: 'Y', right: true }, { v: 'P', a: 'X', b: 'S', label: deg(a) }, { v: 'Q', a: 'Y', b: 'T', label: '?', red: true }], labels: { S: '', T: '' } }))
  },
]

// ═══ Problèmes de l'hôtel de ville ══════════════════════════════════════
function blazon(): Exercise {
  const R = repere({ xMin: -5, xMax: 5, yMin: -4, yMax: 4 })
  const half: Pt[] = [[0, 3], [-3, 3], [-3, 0], [-2, -2], [0, -3]]
  const outline = [...half, ...half.slice(1, -1).reverse().map(([x, y]) => [-x, y] as Pt)]
  outline.forEach((p, i) => R.pt(`b${i}`, p[0], p[1], { hide: true }))
  outline.forEach((_, i) => R.seg(`b${i}`, `b${(i + 1) % outline.length}`))
  R.poly(outline.map((_, i) => `b${i}`), '#d9b25a')
  let P = rp(2, 2)
  while (P[0] >= 0) P = rp(2, 2)
  R.pt('L', P[0], P[1])
  R.line('ax', [0, -4], [0, 4], { dashed: true, color: BLUE })
  return titled('Le blason', pair(`Un blason est symétrique par rapport à l'axe des ordonnées (en pointillés). Le peintre a placé un lion au point L${co(P[0], P[1])}. Où doit-il peindre le lion symétrique L′ ? Donne ses coordonnées.`, -P[0], P[1], {
    explanation: `L${co(P[0], P[1])} ; par la symétrie d'axe « axe des ordonnées », l'ordonnée ne change pas et l'abscisse change de signe : L′${co(-P[0], P[1])}.`,
  }), R.F)
}
function castleReflection(): Exercise {
  const h = randInt(6, 24), w = randInt(1, 3)
  const raw: Record<string, Pt> = { A: [0, 0], B: [0, h / 6], C: [w, h / 6], D: [w, 0], 'B′': [0, -h / 6], 'C′': [w, -h / 6], L1: [-1.5, 0], L2: [w + 1.5, 0], T: [w / 2, h / 6 + 0.8], 'T′': [w / 2, -h / 6 - 0.8] }
  const q = randInt(0, 1)
  return titled('Le reflet du château', numeric(q === 0
    ? `Une tour de ${h} m de haut, surmontée d'un toit pointu de ${fmt(0.8 * 6)} m, se reflète dans les douves : le reflet est le symétrique de la tour par rapport à la surface de l'eau. Quelle distance sépare la pointe T du toit de la pointe T′ de son reflet (en m) ?`
    : `Le reflet d'une tour dans l'eau calme des douves est symétrique de la tour par rapport à la surface. Le haut du toit de la tour est à ${fmt(h + 4.8)} m au-dessus de l'eau. Quelle est la distance entre ce point et son reflet (en m) ?`, 2 * (h + 4.8), {
    explanation: `${q === 0 ? `La pointe T est à ${h} + 4,8 = ${fmt(h + 4.8)} m au-dessus de l'eau.` : `Le point est à ${fmt(h + 4.8)} m au-dessus de l'eau.`} Son symétrique est à la même distance sous la surface : 2 × ${fmt(h + 4.8)} = ${fmt(2 * (h + 4.8))} m.`,
  }), build(raw, {
    segs: [{ a: 'L1', b: 'L2', color: BLUE }, { a: 'A', b: 'B' }, { a: 'B', b: 'C' }, { a: 'C', b: 'D' }, { a: 'B', b: 'T' }, { a: 'T', b: 'C' }, { a: 'A', b: 'B′', dashed: true }, { a: 'B′', b: 'C′', dashed: true }, { a: 'C′', b: 'D', dashed: true }, { a: 'B′', b: 'T′', dashed: true }, { a: 'T′', b: 'C′', dashed: true }],
    hidden: ['L1', 'L2', 'A', 'D', 'B', 'C', 'B′', 'C′'], notes: [{ at: [w + 1.2, 0], text: 'eau', dy: -10 }],
  }))
}
function rosace(): Exercise {
  const n = pick([5, 6, 8, 10, 12]), q = randInt(0, 1), rot = 90
  const raw: Record<string, Pt> = { O: [0, 0] }
  const circles: { c: string; r: number }[] = [{ c: 'O', r: 0.7 }]
  const rr = Math.min(0.75, 1.9 * Math.sin(Math.PI / n) * 0.92)
  for (let i = 0; i < n; i++) { raw[`c${i}`] = polar(1.9, rot + (360 / n) * i); circles.push({ c: `c${i}`, r: rr }) }
  const figure = build(raw, { hidden: Object.keys(raw), circles, margin: 30, caption: '' })
  return titled('La rosace', numeric(q === 0
    ? `Une rosace de vitrail est formée d'un disque central et de ${n} disques identiques régulièrement répartis autour. Combien d'axes de symétrie possède-t-elle ?`
    : `Une rosace est formée de ${n} disques identiques régulièrement répartis autour d'un disque central : elle possède ${n} axes de symétrie, qui passent tous par le centre. Quel angle forment deux axes voisins (en °) ?`, q === 0 ? n : 180 / n, {
    explanation: q === 0
      ? (n % 2 === 0
        ? `Les droites qui passent par le centre et par deux disques opposés sont des axes (${n / 2} axes), ainsi que les droites qui passent entre deux disques voisins (${n / 2} axes). Au total : ${n} axes.`
        : `Chaque droite qui passe par le centre et par le centre d'un disque extérieur (elle passe alors entre deux disques de l'autre côté) est un axe : ${n} axes.`)
      : `Les ${n} axes partagent le tour complet (360°) en ${2 * n} angles égaux : 360 ÷ ${2 * n} = ${fmt(180 / n)}°.`,
  }), figure)
}
const age1: Maker[] = [blazon, castleReflection, rosace]

function treasureMap(): Exercise | null {
  const C = rp(4, 3), P: Pt = [randInt(-2, 2), randInt(-1, 1)], T: Pt = [2 * P[0] - C[0], 2 * P[1] - C[1]]
  if (!inWin(T[0], T[1]) || (C[0] === P[0] && C[1] === P[1])) return null
  const R = repere()
  R.pt('C', C[0], C[1]); R.pt('P', P[0], P[1])
  const n = prenom()
  return titled('La carte au trésor', pair(`Sur la carte de ${n}, le chêne est en C et le puits en P. « Le trésor est enterré au symétrique du chêne par rapport au puits. » Quelles sont les coordonnées du trésor T ?`, T[0], T[1], {
    explanation: `P est le milieu de [CT]. De C${co(C[0], C[1])} à P${co(P[0], P[1])}, on se déplace de ${fmt(P[0] - C[0])} et ${fmt(P[1] - C[1])} ; on refait ce déplacement depuis P : T${co(T[0], T[1])}.`,
  }), R.F)
}
function frenchGarden(): Exercise {
  const L = randInt(4, 10), l = randInt(2, 6), b = 2 * randInt(1, 3), h = randInt(2, 4)
  const raw: Record<string, Pt> = { A: [-L - 1, 0], B: [-1, 0], C: [-1, l], D: [-L - 1, l], E: [-1 - L / 2 - b / 2, l], F: [-1 - L / 2 + b / 2, l], G: [-1 - L / 2, l + h], A2: [L + 1, 0], B2: [1, 0], C2: [1, l], D2: [L + 1, l], E2: [1 + L / 2 + b / 2, l], F2: [1 + L / 2 - b / 2, l], G2: [1 + L / 2, l + h], X1: [0, -0.8], X2: [0, l + h + 0.6] }
  const area = L * l + (b * h) / 2
  return titled('Le jardin à la française', numeric(`Un jardin à la française est symétrique par rapport à l'allée centrale. À gauche, un massif est formé d'un rectangle de ${L} m sur ${l} m surmonté d'un triangle de base ${b} m et de hauteur ${h} m. Quelle est l'aire totale des deux massifs (en m²) ?`, 2 * area, {
    explanation: `Massif de gauche : ${L} × ${l} + ${b} × ${h} ÷ 2 = ${L * l} + ${(b * h) / 2} = ${fmt(area)} m². La symétrie conserve les aires : le massif de droite a la même aire. Total : 2 × ${fmt(area)} = ${fmt(2 * area)} m².`,
  }), build(raw, {
    segs: [{ a: 'A', b: 'B', label: `${L} m` }, { a: 'B', b: 'C' }, { a: 'C', b: 'D' }, { a: 'D', b: 'A', label: `${l} m` }, { a: 'E', b: 'G' }, { a: 'G', b: 'F' }, { a: 'A2', b: 'B2' }, { a: 'B2', b: 'C2' }, { a: 'C2', b: 'D2' }, { a: 'D2', b: 'A2' }, { a: 'E2', b: 'G2' }, { a: 'G2', b: 'F2' }, { a: 'X1', b: 'X2', dashed: true, color: BLUE }],
    polys: [{ pts: ['A', 'B', 'C', 'F', 'G', 'E', 'D'], fill: '#7fb069' }, { pts: ['A2', 'B2', 'C2', 'F2', 'G2', 'E2', 'D2'], fill: '#7fb069' }],
    hidden: Object.keys(raw),
  }))
}
function paperCut(): Exercise {
  const a = randInt(3, 9), b = randInt(2, 6), q = randInt(0, 1)
  const raw: Record<string, Pt> = { A: [0, a], B: [0, 0], C: [b, 0], 'C′': [-b, 0], F1: [0, -0.7], F2: [0, a + 0.7] }
  return titled('Le pliage', numeric(q === 0
    ? `On plie une feuille en deux, puis on découpe le long du pli un triangle rectangle : son côté le long du pli mesure ${a} cm et l'autre côté de l'angle droit ${b} cm. On déplie : la figure obtenue est symétrique par rapport au pli. Quelle est son aire (en cm²) ?`
    : `On plie une feuille et on découpe, le long du pli, un triangle rectangle dont les côtés de l'angle droit mesurent ${a} cm (le long du pli) et ${b} cm. Une fois déplié, quelle est la longueur de la base du grand triangle obtenu (en cm) ?`, q === 0 ? a * b : 2 * b, {
    explanation: q === 0
      ? `Le petit triangle a pour aire ${a} × ${b} ÷ 2 = ${fmt((a * b) / 2)} cm². En dépliant, on obtient ce triangle et son symétrique (même aire) : 2 × ${fmt((a * b) / 2)} = ${a * b} cm².`
      : `La base du grand triangle est formée du côté de ${b} cm et de son symétrique : 2 × ${b} = ${2 * b} cm.`,
  }), build(raw, {
    segs: [{ a: 'A', b: 'B', label: `${a} cm`, color: 'transparent' }, { a: 'B', b: 'C', label: `${b} cm` }, { a: 'C', b: 'A' }, { a: 'A', b: 'C′', dashed: true }, { a: 'C′', b: 'B', dashed: true }, { a: 'F1', b: 'F2', dashed: true, color: BLUE }],
    polys: [{ pts: ['A', 'B', 'C'], fill: '#e2b85c' }], arcs: [{ v: 'B', a: 'C', b: 'A', right: true }],
    hidden: ['F1', 'F2'], labels: { A: '', B: '', C: '', 'C′': '' }, notes: [{ at: [0, a + 0.7], text: 'pli', dx: 16 }],
  }))
}
const age2: Maker[] = [() => retry(treasureMap), frenchGarden, paperCut]

function twoWells(): Exercise | null {
  const A = rp(5, 3), P1: Pt = [randInt(-3, 0), randInt(-2, 2)], P2: Pt = [randInt(0, 3), randInt(-2, 2)]
  const A1: Pt = [2 * P1[0] - A[0], 2 * P1[1] - A[1]], A2: Pt = [2 * P2[0] - A1[0], 2 * P2[1] - A1[1]]
  if (!inWin(A1[0], A1[1]) || !inWin(A2[0], A2[1]) || same(P1, P2) || same(A, P1) || same(A, P2)) return null
  const R = repere()
  R.pt('D', A[0], A[1]); R.pt('P', P1[0], P1[1]); R.pt('Q', P2[0], P2[1])
  return titled('Les deux puits', pair(`Un pirate part du rocher D${co(A[0], A[1])}. Il va jusqu'au point E, symétrique de D par rapport au puits P${co(P1[0], P1[1])}, puis jusqu'au point F, symétrique de E par rapport au puits Q${co(P2[0], P2[1])}. Le trésor est en F. Quelles sont ses coordonnées ?`, A2[0], A2[1], {
    explanation: `P est le milieu de [DE] : E${co(A1[0], A1[1])}. Q est le milieu de [EF] : F${co(A2[0], A2[1])}.`,
  }), R.F)
}
function stainedGlass(): Exercise | null {
  const a = randInt(2, 5), b = randInt(1, 3), c = randInt(1, 3)
  if (a <= c) return null
  // motif dans le premier quart : trapèze rectangle (0;0) (a;0) (c;b) (0;b) — complété par les symétries d'axes (Ox) et (Oy)
  const R = repere({ xMin: -6, xMax: 6, yMin: -4, yMax: 4 })
  const quad: Pt[] = [[0, 0], [a, 0], [c, b], [0, b]]
  const sym = (sx: number, sy: number) => quad.map(([x, y]) => [sx * x, sy * y] as Pt)
  const all = [sym(1, 1), sym(-1, 1), sym(-1, -1), sym(1, -1)]
  all.forEach((qd, i) => {
    qd.forEach((p, j) => R.pt(`v${i}_${j}`, p[0], p[1], { hide: true }))
    qd.forEach((_, j) => R.seg(`v${i}_${j}`, `v${i}_${(j + 1) % 4}`, i > 0 ? { dashed: true } : {}))
    R.poly(qd.map((_, j) => `v${i}_${j}`), i === 0 ? '#c0504d' : '#e8c0a0')
  })
  const area = ((a + c) * b) / 2
  return titled('Le vitrail', numeric(`Un vitrail a pour axes de symétrie les deux axes du repère. La pièce rouge a pour sommets (0 ; 0), (${a} ; 0), (${c} ; ${b}) et (0 ; ${b}). On la complète par symétries pour obtenir tout le motif. Quelle est l'aire totale du motif (en carreaux) ?`, 4 * area, {
    explanation: `La pièce rouge est un trapèze de bases ${a} et ${c}, de hauteur ${b} : aire = (${a} + ${c}) × ${b} ÷ 2 = ${fmt(area)}. Les symétries conservent les aires et le motif contient 4 pièces identiques : 4 × ${fmt(area)} = ${fmt(4 * area)} carreaux.`,
  }), R.F)
}
function thirstyRider(): Exercise | null {
  const a = randInt(1, 4), b = randInt(1, 3), xA = randInt(-5, -3), xB = randInt(2, 5)
  const dx = xB - xA, px = xA + (dx * a) / (a + b)
  if (Math.abs(px - Math.round(px)) > 1e-9 || a === b) return null
  const R = repere({ yMin: -4, yMax: 5 })
  R.line('r', [W0.xMin, 0], [W0.xMax, 0], { color: BLUE })
  R.pt('A', xA, a); R.pt('B', xB, b); R.pt('B′', xB, -b); R.seg('A', 'B′', { dashed: true })
  R.note(3.6, 0.45, 'rivière')
  return titled('Le cavalier assoiffé', numeric(`Un cavalier part de A${co(xA, a)}, va faire boire son cheval au bord de la rivière (l'axe des abscisses), puis rejoint B${co(xB, b)}. Pour faire le trajet le plus court, il vise le point B′, symétrique de B par rapport à la rivière : le point P où il touche la rivière est sur le segment [AB′]. Quelle est l'abscisse de P ?`, px, {
    explanation: `B′${co(xB, -b)}. De A à B′, on descend de ${a} + ${b} = ${a + b} unités en avançant de ${dx} unités. Pour atteindre la rivière, il faut descendre de ${a} unités : par proportionnalité, on avance de ${dx} × ${a} ÷ ${a + b} = ${fmt(px - xA)}. Abscisse de P : ${fmt(xA)} + ${fmt(px - xA)} = ${fmt(px)}.`,
  }), R.F)
}
const age3: Maker[] = [() => retry(twoWells), () => retry(stainedGlass), () => retry(thirstyRider)]

export const CONTENT: SubjectContent | null = {
  tiers: [
    [p1Lengths, p1Coords, p1Axes, p1Center],
    [p2PointSym, p2AxisSym, p2Conserve, p2Circles],
    [p3Grid, p3Segment, p3Lines, p3Construct],
    [p4Double, p4AxisAngles, p4Parallelogram, p4Circles],
    [p5Area, p5Find, p5Reflect, p5Compo],
  ],
  upgrades: [up1, up2, up3],
  age: [age1, age2, age3],
}
