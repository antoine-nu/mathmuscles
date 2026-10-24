// Angles et parallélisme (5e) : angles adjacents, complémentaires, supplémentaires, opposés par le sommet,
// angles alternes-internes et correspondants, reconnaître des droites parallèles, calculs d'angles en chaîne.
import type { FigAngle, FigPoint, FigSegment, Figure, LabelPos } from '../figure'
import { choice, fmt, fresh, numeric, pick, randInt, shuffle, variants, withMeta, type Exercise, type Maker, type SubjectContent } from '../utils'

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
  caption?: string
  margin?: number
}
/** Construit une figure à l'échelle : points en coordonnées mathématiques, noms placés loin des traits. */
function build(raw: Record<string, Pt>, s: Spec = {}): Figure {
  const W = 320, H = 220, m = s.margin ?? 34
  const all = Object.values(raw)
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
  return { points, segments, angles, notes, polygons: s.polys, ...(s.caption ? { caption: s.caption } : {}) }
}

/** Droites horizontales parallèles (codées par une flèche centrée en arrowX), d'ordonnées ys, de xl à xr.
 *  Points cachés : _l0, _r0 (extrémités gauche et droite de la droite 0), etc. */
function hLines(ys: number[], xl: number, xr: number, arrowX: number, names: string[] = [], nameAt: 'l' | 'r' = 'r', mark: 'arrow' | 'arrow2' = 'arrow') {
  const raw: Record<string, Pt> = {}, segs: FigSegment[] = [], hidden: string[] = [], notes: NonNullable<Spec['notes']> = []
  ys.forEach((y, i) => {
    raw[`_l${i}`] = [xl, y]; raw[`_r${i}`] = [xr, y]; raw[`_p${i}`] = [arrowX - 0.4, y]; raw[`_q${i}`] = [arrowX + 0.4, y]
    hidden.push(`_l${i}`, `_r${i}`, `_p${i}`, `_q${i}`)
    segs.push({ a: `_l${i}`, b: `_r${i}` }, { a: `_p${i}`, b: `_q${i}`, mark, color: 'transparent' })
    if (names[i]) notes.push({ at: [nameAt === 'r' ? xr : xl, y], text: names[i], dx: nameAt === 'r' ? -14 : 14, dy: -12 })
  })
  return { raw, segs, hidden, notes }
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

// ── Deux droites coupées par une sécante ───────────────────────────────
type Corner = 'ne' | 'nw' | 'se' | 'sw'
const CORNERS: Corner[] = ['ne', 'nw', 'se', 'sw']
const OPP: Record<Corner, Corner> = { ne: 'sw', sw: 'ne', nw: 'se', se: 'nw' }
type At = 'E' | 'F'
interface Spot { at: At; c: Corner }
/** Noms : droite du haut (xy), du bas (zt), sécante (uv) qui les coupe en E et F. */
interface Names { x: string; y: string; z: string; t: string; u: string; v: string; E: string; F: string }
const NAMESETS: Names[] = [
  { x: 'x', y: 'y', z: 'z', t: 't', u: 'u', v: 'v', E: 'E', F: 'F' },
  { x: 'x', y: 'y', z: 'x′', t: 'y′', u: 'u', v: 'v', E: 'A', F: 'B' },
  { x: 'x', y: 'y', z: 'z', t: 't', u: 'u', v: 'v', E: 'M', F: 'N' },
  { x: 'r', y: 's', z: 'm', t: 'n', u: 'u', v: 'v', E: 'I', F: 'J' },
]
const L1 = (N: Names) => `(${N.x}${N.y})`
const L2 = (N: Names) => `(${N.z}${N.t})`
const SEC = (N: Names) => `(${N.u}${N.v})`
/** Mesure de l'angle au coin c, la sécante faisant l'angle tl avec (xy) ; (zt) est tournée de dl par rapport à (xy). */
const secVal = (tl: number, dl: number, p: Spot) => {
  const b = p.at === 'E' ? tl : tl - dl
  return p.c === 'ne' || p.c === 'sw' ? b : 180 - b
}
/** Inclinaison de la sécante pour que l'angle au coin c de E (ou de F, droites parallèles) mesure v. */
const tiltFor = (c: Corner, v: number) => (c === 'ne' || c === 'sw' ? v : 180 - v)
const cname = (N: Names, p: Spot) => {
  const P = p.at === 'E' ? N.E : N.F
  const h = p.c.endsWith('e') ? (p.at === 'E' ? N.y : N.t) : (p.at === 'E' ? N.x : N.z)
  return ang(h, P, p.c.startsWith('n') ? N.u : N.v)
}
type Rel = 'correspondants' | 'alternes-internes' | 'alternes-externes' | 'opposés par le sommet' | 'adjacents supplémentaires' | 'internes' | 'externes' | 'autre' | 'même'
function relation(p: Spot, q: Spot): Rel {
  if (p.at === q.at) return p.c === q.c ? 'même' : p.c === OPP[q.c] ? 'opposés par le sommet' : 'adjacents supplémentaires'
  const [e, f] = p.at === 'E' ? [p.c, q.c] : [q.c, p.c]
  if (e === f) return 'correspondants'
  if ((e === 'se' && f === 'nw') || (e === 'sw' && f === 'ne')) return 'alternes-internes'
  if ((e === 'ne' && f === 'sw') || (e === 'nw' && f === 'se')) return 'alternes-externes'
  if ((e === 'se' && f === 'ne') || (e === 'sw' && f === 'nw')) return 'internes'
  if ((e === 'ne' && f === 'se') || (e === 'nw' && f === 'sw')) return 'externes'
  return 'autre'
}
/** Raisonnement « angle connu en k (mesure v) → angle en q », droites (xy) et (zt) parallèles. */
function chain(N: Names, k: Spot, q: Spot, v: number): { ans: number; why: string } {
  const nk = cname(N, k), nq = cname(N, q), par = `${L1(N)} // ${L2(N)}`
  const r = relation(k, q)
  if (r === 'opposés par le sommet') return { ans: v, why: `Les angles ${nk} et ${nq} sont opposés par le sommet, donc égaux : ${nq} = ${v}°.` }
  if (r === 'adjacents supplémentaires') return { ans: 180 - v, why: `Les angles ${nk} et ${nq} sont adjacents supplémentaires : ${nq} = 180 − ${v} = ${180 - v}°.` }
  if (r === 'correspondants' || r === 'alternes-internes') return { ans: v, why: `Les angles ${nk} et ${nq} sont ${r} et ${par} : ils sont égaux, donc ${nq} = ${v}°.` }
  const mid: Spot = { at: q.at, c: k.c }, nm = cname(N, mid)
  const first = `Les angles ${nk} et ${nm} sont correspondants et ${par}, donc ${nm} = ${v}°.`
  if (relation(mid, q) === 'opposés par le sommet') return { ans: v, why: `${first} Les angles ${nm} et ${nq} sont opposés par le sommet : ${nq} = ${v}°.` }
  return { ans: 180 - v, why: `${first} Les angles ${nm} et ${nq} sont adjacents supplémentaires : ${nq} = 180 − ${v} = ${180 - v}°.` }
}
interface SecArc extends Spot { label?: string; red?: boolean; color?: string }
/** Droites (xy) et (zt) coupées par la sécante (uv) en E et F, à l'échelle. */
function secFig(o: { tl: number; dl?: number; marks?: boolean; N: Names; arcs: SecArc[]; letters?: boolean }): Figure {
  const tl = o.tl, dl = o.dl ?? 0, N = o.N, Hh = 2.4
  const u = polar(1, tl), d2 = polar(1, dl)
  const E: Pt = [0, 0], F: Pt = [(-Hh * u[0]) / u[1], -Hh]
  const xl = Math.min(E[0], F[0]) - 2.6, xr = Math.max(E[0], F[0]) + 2.6
  const at2 = (x: number): Pt => [x, F[1] + ((x - F[0]) * d2[1]) / d2[0]]
  const raw: Record<string, Pt> = {
    E, F, X: [xl, 0], Y: [xr, 0], Z: at2(xl), T: at2(xr), U: polar(1.5, tl, E), V: polar(-1.5, tl, F),
    M1: [Math.max(E[0], F[0]) + 0.9, 0], M2: at2(Math.max(E[0], F[0]) + 0.9),
    Ee: [0.8, 0], Ew: [-0.8, 0], Eu: polar(0.8, tl, E), Ed: polar(-0.8, tl, E),
    Fe: polar(0.8, dl, F), Fw: polar(-0.8, dl, F), Fu: polar(0.8, tl, F), Fd: polar(-0.8, tl, F),
  }
  const segs: FigSegment[] = [{ a: 'X', b: 'Y' }, { a: 'Z', b: 'T' }, { a: 'V', b: 'U' }]
  if (o.marks) segs.push({ a: 'M1', b: 'Y', mark: 'arrow', color: 'transparent' }, { a: 'M2', b: 'T', mark: 'arrow', color: 'transparent' })
  const arcs: Arc[] = o.arcs.map((s) => {
    const P = s.at
    return { v: P, a: s.c.endsWith('e') ? `${P}e` : `${P}w`, b: s.c.startsWith('n') ? `${P}u` : `${P}d`, label: s.label, red: s.red, color: s.color, r: 22 }
  })
  const notes = o.letters === false ? [] : [
    { at: raw.X, text: N.x, dx: -9 }, { at: raw.Y, text: N.y, dx: 9 }, { at: raw.Z, text: N.z, dx: -9 }, { at: raw.T, text: N.t, dx: 9 },
    { at: polar(1.85, tl, E), text: N.u }, { at: polar(-1.85, tl, F), text: N.v },
  ]
  return build(raw, {
    segs, arcs, notes, labels: { E: N.E, F: N.F },
    hidden: ['X', 'Y', 'Z', 'T', 'U', 'V', 'M1', 'M2', 'Ee', 'Ew', 'Eu', 'Ed', 'Fe', 'Fw', 'Fu', 'Fd'],
  })
}
const other = (a: At): At => (a === 'E' ? 'F' : 'E')

// ── Deux droites sécantes en O (points nommés aux extrémités) ──────────
/** Droites (AB) et (CD) sécantes en O ; secteurs 0 à 3 dans le sens direct : AOC, COB, BOD, DOA (le 0 mesure v). */
function crossFig(v: number, n: [string, string, string, string], arcs: { s: number; label?: string; red?: boolean; color?: string }[], O = 'O'): Figure {
  const rot = randInt(-25, 15)
  const order = [n[0], n[2], n[1], n[3]] // A, C, B, D dans le sens direct
  const dirs = [rot, rot + v, rot + 180, rot + 180 + v]
  const raw: Record<string, Pt> = { [O]: [0, 0] }
  order.forEach((nm, i) => { raw[nm] = polar(3, dirs[i]) })
  return build(raw, {
    segs: [{ a: n[0], b: n[1] }, { a: n[2], b: n[3] }],
    arcs: arcs.map((a) => ({ v: O, a: order[a.s % 4], b: order[(a.s + 1) % 4], label: a.label, red: a.red, color: a.color, r: 24 })),
  })
}
const sectorVal = (v: number, s: number) => (s % 2 === 0 ? v : 180 - v)
const sectorName = (n: [string, string, string, string], s: number, O = 'O') => {
  const order = [n[0], n[2], n[1], n[3]]
  return ang(order[s % 4], O, order[(s + 1) % 4])
}
const CROSS_NAMES: [string, string, string, string][] = [['A', 'B', 'C', 'D'], ['E', 'F', 'G', 'H'], ['M', 'N', 'P', 'Q'], ['R', 'S', 'T', 'U']]

// ── Demi-droites de même origine ────────────────────────────────────────
/** Demi-droites [Ox), [Oy)… : `rays` donne la direction (°) de chacune ; leurs noms sont écrits au bout. */
function fanFig(rays: [string, number][], arcs: { a: string; b: string; label?: string; red?: boolean; right?: boolean; r?: number; color?: string; at?: number }[], O = 'O'): Figure {
  const raw: Record<string, Pt> = { [O]: [0, 0] }
  rays.forEach(([nm, d]) => { raw[`_${nm}`] = polar(3, d) })
  return build(raw, {
    segs: rays.map(([nm]) => ({ a: O, b: `_${nm}` })),
    arcs: arcs.map((a) => ({ v: O, a: `_${a.a}`, b: `_${a.b}`, label: a.label, red: a.red, right: a.right, r: a.r ?? 26, color: a.color, at: a.at })),
    hidden: rays.map(([nm]) => `_${nm}`),
    notes: rays.map(([nm, d]) => ({ at: polar(3.35, d), text: nm })),
    margin: 30,
  })
}
const RAYS = [['x', 'y', 'z'], ['u', 'v', 'w'], ['x', 'y', 't'], ['a', 'b', 'c']] as const

// ═══ Palier 1 ═══════════════════════════════════════════════════════════
const p1Complements: Maker = variants(
  () => {
    let a = randInt(8, 82)
    while (a === 45) a = randInt(8, 82)
    return numeric(pick([
      `Deux angles sont complémentaires. L'un mesure ${a}°. Combien mesure l'autre (en °) ?`,
      `Un angle mesure ${a}°. Quelle est la mesure de son complémentaire (en °) ?`,
    ]), 90 - a, { explanation: `Deux angles complémentaires ont pour somme 90° : 90 − ${a} = ${90 - a}°.` })
  },
  () => {
    let a = randInt(12, 168)
    while (a === 90) a = randInt(12, 168)
    return numeric(pick([
      `Deux angles sont supplémentaires. L'un mesure ${a}°. Combien mesure l'autre (en °) ?`,
      `Un angle mesure ${a}°. Quelle est la mesure de son supplémentaire (en °) ?`,
    ]), 180 - a, { explanation: `Deux angles supplémentaires ont pour somme 180° : 180 − ${a} = ${180 - a}°.` })
  },
  () => {
    const [x, y, z] = pick(RAYS), a = randInt(20, 70), rot = randInt(-10, 20)
    return fig(numeric(`Sur la figure, l'angle ${ang(x, 'O', y)} est droit et la demi-droite [O${z}) est à l'intérieur. L'angle ${ang(x, 'O', z)} mesure ${a}°. Combien mesure l'angle ${ang(z, 'O', y)} (en °) ?`, 90 - a, {
      explanation: `Les angles ${ang(x, 'O', z)} et ${ang(z, 'O', y)} sont adjacents et forment un angle droit : ils sont complémentaires. ${ang(z, 'O', y)} = 90 − ${a} = ${90 - a}°.`,
    }), fanFig([[x, rot], [z, rot + a], [y, rot + 90]], [{ a: x, b: y, right: true }, { a: x, b: z, label: deg(a), r: 34 }, { a: z, b: y, label: '?', red: true, r: 34 }]))
  },
  () => {
    const [x, y, z] = pick(RAYS), a = niceAngle(25, 155)
    return fig(numeric(`Sur la figure, les demi-droites [O${x}) et [O${y}) sont opposées : ${ang(x, 'O', y)} est un angle plat. L'angle ${ang(x, 'O', z)} mesure ${a}°. Combien mesure l'angle ${ang(z, 'O', y)} (en °) ?`, 180 - a, {
      explanation: `Les angles ${ang(x, 'O', z)} et ${ang(z, 'O', y)} sont adjacents et forment un angle plat : ils sont supplémentaires. ${ang(z, 'O', y)} = 180 − ${a} = ${180 - a}°.`,
    }), fanFig([[x, 0], [z, a], [y, 180]], [{ a: x, b: z, label: deg(a) }, { a: z, b: y, label: '?', red: true }]))
  },
  () => {
    const a = niceAngle(25, 155), [A, B, C] = pick([['A', 'B', 'C'], ['E', 'F', 'G'], ['R', 'S', 'T']])
    const raw: Record<string, Pt> = { O: [0, 0], [A]: [-3, 0], [B]: [3, 0], [C]: polar(3, a) }
    return fig(numeric(`Les points ${A}, O et ${B} sont alignés et l'angle ${ang(B, 'O', C)} mesure ${a}°. Combien mesure l'angle ${ang(A, 'O', C)} (en °) ?`, 180 - a, {
      explanation: `${A}, O et ${B} sont alignés : ${ang(A, 'O', C)} et ${ang(C, 'O', B)} forment un angle plat. ${ang(A, 'O', C)} = 180 − ${a} = ${180 - a}°.`,
    }), build(raw, { segs: [{ a: A, b: B }, { a: 'O', b: C }], arcs: [{ v: 'O', a: B, b: C, label: deg(a) }, { v: 'O', a: C, b: A, label: '?', red: true }] }))
  },
)

const p1Crossing: Maker = variants(
  () => {
    const n = pick(CROSS_NAMES), v = niceAngle(), s0 = randInt(0, 3), s1 = (s0 + pick([1, 3])) % 4
    const k = sectorVal(v, s0)
    return fig(numeric(`Les droites (${n[0]}${n[1]}) et (${n[2]}${n[3]}) se coupent en O. L'angle ${sectorName(n, s0)} mesure ${k}°. Combien mesure l'angle ${sectorName(n, s1)} (en °) ?`, 180 - k, {
      explanation: `Les angles ${sectorName(n, s0)} et ${sectorName(n, s1)} sont adjacents et leurs côtés extérieurs forment une droite : ils sont supplémentaires. ${180} − ${k} = ${180 - k}°.`,
    }), crossFig(v, n, [{ s: s0, label: deg(k) }, { s: s1, label: '?', red: true }]))
  },
  () => {
    const n = pick(CROSS_NAMES), v = niceAngle(), s0 = randInt(0, 3), s1 = (s0 + pick([1, 3])) % 4
    const k = sectorVal(v, s0)
    return fig(numeric(`Deux droites se coupent en O (voir la figure). Sachant que l'un des angles mesure ${k}°, calcule la mesure de l'angle marqué en rouge (en °).`, 180 - k, {
      explanation: `L'angle rouge et l'angle de ${k}° sont adjacents supplémentaires (ensemble, ils forment un angle plat) : 180 − ${k} = ${180 - k}°.`,
    }), crossFig(v, n, [{ s: s0, label: deg(k) }, { s: s1, label: '?', red: true }]))
  },
  () => {
    const n = pick(CROSS_NAMES), v = niceAngle(), s0 = randInt(0, 3), k = sectorVal(v, s0)
    return fig(numeric(`Les droites (${n[0]}${n[1]}) et (${n[2]}${n[3]}) se coupent en O. L'angle ${sectorName(n, s0)} mesure ${k}°. Combien mesure l'angle ${sectorName(n, s0 + 2)} (en °) ?`, k, {
      explanation: `Les angles ${sectorName(n, s0)} et ${sectorName(n, s0 + 2)} sont opposés par le sommet : ils ont la même mesure, ${k}°.`,
    }), crossFig(v, n, [{ s: s0, label: deg(k) }, { s: s0 + 2, label: '?', red: true }]))
  },
  () => {
    const n = pick(CROSS_NAMES), v = niceAngle(), s0 = randInt(0, 3), k = sectorVal(v, s0)
    return fig(numeric(`Les droites (${n[0]}${n[1]}) et (${n[2]}${n[3]}) se coupent en O. Les angles opposés par le sommet ${sectorName(n, s0)} et ${sectorName(n, s0 + 2)} ont pour somme ${2 * k}°. Combien mesure l'angle ${sectorName(n, s0)} (en °) ?`, k, {
      explanation: `Deux angles opposés par le sommet sont égaux : chacun mesure ${2 * k} ÷ 2 = ${k}°.`,
    }), crossFig(v, n, [{ s: s0, label: '?', red: true }, { s: s0 + 2, color: BLUE }]))
  },
  () => {
    const n = pick(CROSS_NAMES), v = niceAngle(), s0 = randInt(0, 3), k = sectorVal(v, s0)
    return fig(numeric(`Deux droites (${n[0]}${n[1]}) et (${n[2]}${n[3]}) se coupent en O et l'angle ${sectorName(n, s0)} mesure ${k}°. Quelle est la somme des trois autres angles formés autour de O (en °) ?`, 360 - k, {
      explanation: `Les quatre angles font le tour du point O : leur somme vaut 360°. 360 − ${k} = ${360 - k}°.`,
    }), crossFig(v, n, [{ s: s0, label: deg(k) }]))
  },
)

/** Couple d'angles à nommer sur la figure de la sécante. */
const PAIR_KINDS = ['alternes-internes', 'correspondants', 'opposés par le sommet', 'adjacents supplémentaires'] as const
type PairKind = (typeof PAIR_KINDS)[number]
const PAIR_WHY: Record<PairKind, string> = {
  'alternes-internes': 'ils sont de part et d’autre de la sécante, tous les deux entre les deux droites, et n’ont pas le même sommet : ils sont alternes-internes.',
  correspondants: 'ils sont du même côté de la sécante, placés « au même endroit » à chacun des deux points d’intersection (l’un entre les droites, l’autre à l’extérieur) : ils sont correspondants.',
  'opposés par le sommet': 'ils ont le même sommet et leurs côtés sont dans le prolongement l’un de l’autre : ils sont opposés par le sommet.',
  'adjacents supplémentaires': 'ils ont le même sommet et un côté commun, et leurs deux autres côtés forment une droite : ils sont adjacents et supplémentaires.',
}
function pairSpots(kind: PairKind): [Spot, Spot] {
  if (kind === 'correspondants') { const c = pick(CORNERS); return shuffle([{ at: 'E' as At, c }, { at: 'F' as At, c }]) as [Spot, Spot] }
  if (kind === 'alternes-internes') return shuffle(pick([[{ at: 'E' as At, c: 'se' as Corner }, { at: 'F' as At, c: 'nw' as Corner }], [{ at: 'E' as At, c: 'sw' as Corner }, { at: 'F' as At, c: 'ne' as Corner }]])) as [Spot, Spot]
  const at = pick(['E', 'F'] as const), c = pick(CORNERS)
  if (kind === 'opposés par le sommet') return [{ at, c }, { at, c: OPP[c] }]
  return [{ at, c }, { at, c: pick(CORNERS.filter((x) => x !== c && x !== OPP[c])) }]
}
function nameThePair(kind: PairKind): Exercise {
  const N = pick(NAMESETS), tl = niceAngle(40, 140), par = Math.random() < 0.5, dl = par ? 0 : pick([-1, 1]) * randInt(7, 12)
  const [p, q] = pairSpots(kind)
  const n1 = cname(N, p), n2 = cname(N, q)
  const prompt = pick([
    `Sur la figure, les droites ${L1(N)} et ${L2(N)} sont coupées par la sécante ${SEC(N)}. Comment appelle-t-on les angles ${n1} et ${n2} ?`,
    `Les angles ${n1} et ${n2} sont marqués en couleur sur la figure. Quel est le nom de ce couple d'angles ?`,
    `On considère les angles ${n1} et ${n2} de la figure. Quelle est la nature de ce couple d'angles ?`,
  ])
  return fig(choice(prompt, kind, [...PAIR_KINDS], `Les angles ${n1} et ${n2} : ${PAIR_WHY[kind]}${par ? '' : ' (Ce nom ne dépend pas du parallélisme des droites.)'}`),
    secFig({ tl, dl, N, marks: false, arcs: [{ ...p, color: BLUE }, { ...q, red: true }] }))
}
const p1Names: Maker = variants(
  () => nameThePair('alternes-internes'),
  () => nameThePair('correspondants'),
  () => nameThePair('opposés par le sommet'),
  () => nameThePair('adjacents supplémentaires'),
  () => nameThePair(pick(['alternes-internes', 'correspondants'] as const)),
)

const p1Adjacent: Maker = variants(
  () => {
    const [x, y, z] = pick(RAYS), a = randInt(25, 70), b = randInt(25, 70), rot = randInt(-20, 10)
    return fig(numeric(`Les angles ${ang(x, 'O', y)} et ${ang(y, 'O', z)} sont adjacents. ${ang(x, 'O', y)} mesure ${a}° et ${ang(y, 'O', z)} mesure ${b}°. Combien mesure l'angle ${ang(x, 'O', z)} (en °) ?`, a + b, {
      explanation: `Les angles sont adjacents : ${ang(x, 'O', z)} = ${ang(x, 'O', y)} + ${ang(y, 'O', z)} = ${a} + ${b} = ${a + b}°.`,
    }), fanFig([[x, rot], [y, rot + a], [z, rot + a + b]], [{ a: x, b: y, label: deg(a), r: 30 }, { a: y, b: z, label: deg(b), r: 30 }]))
  },
  fresh(() => {
    const [x, y, z] = pick(RAYS), a = randInt(25, 70), b = randInt(25, 70), rot = randInt(-20, 10)
    return fig(numeric(`Sur la figure, l'angle ${ang(x, 'O', z)} mesure ${a + b}° et l'angle ${ang(x, 'O', y)} mesure ${a}°. Combien mesure l'angle ${ang(y, 'O', z)} (en °) ?`, b, {
      explanation: `${ang(x, 'O', y)} et ${ang(y, 'O', z)} sont adjacents : ${ang(y, 'O', z)} = ${ang(x, 'O', z)} − ${ang(x, 'O', y)} = ${a + b} − ${a} = ${b}°.`,
    }), fanFig([[x, rot], [y, rot + a], [z, rot + a + b]], [{ a: x, b: y, label: deg(a), r: 24 }, { a: y, b: z, label: '?', red: true, r: 24 }, { a: x, b: z, label: deg(a + b), r: 48, color: BLUE, at: a > b ? 0.2 : 0.8 }]))
  }),
  () => {
    const a = randInt(30, 70), b = randInt(30, 70), c = 180 - a - b, rays = pick([['x', 'y', 'z', 't'], ['a', 'b', 'c', 'd']])
    return fig(numeric(`Les demi-droites [O${rays[0]}) et [O${rays[3]}) sont opposées. ${ang(rays[0], 'O', rays[1])} = ${a}° et ${ang(rays[1], 'O', rays[2])} = ${b}°. Combien mesure l'angle ${ang(rays[2], 'O', rays[3])} (en °) ?`, c, {
      explanation: `Les trois angles adjacents forment un angle plat : 180 − ${a} − ${b} = ${c}°.`,
    }), fanFig([[rays[0], 0], [rays[1], a], [rays[2], a + b], [rays[3], 180]], [{ a: rays[0], b: rays[1], label: deg(a) }, { a: rays[1], b: rays[2], label: deg(b), r: 34 }, { a: rays[2], b: rays[3], label: '?', red: true }]))
  },
  () => {
    const a = randInt(20, 40), b = randInt(20, 40), c = 90 - a - b, rays = pick([['x', 'y', 'z', 't'], ['a', 'b', 'c', 'd']])
    return fig(numeric(`L'angle ${ang(rays[0], 'O', rays[3])} est droit et il est partagé en trois angles adjacents : ${ang(rays[0], 'O', rays[1])} = ${a}° et ${ang(rays[1], 'O', rays[2])} = ${b}°. Combien mesure ${ang(rays[2], 'O', rays[3])} (en °) ?`, c, {
      explanation: `Les trois angles forment un angle droit : 90 − ${a} − ${b} = ${c}°.`,
    }), fanFig([[rays[0], 0], [rays[1], a], [rays[2], a + b], [rays[3], 90]], [{ a: rays[0], b: rays[3], right: true }, { a: rays[0], b: rays[1], label: deg(a), r: 40 }, { a: rays[1], b: rays[2], label: deg(b), r: 52 }, { a: rays[2], b: rays[3], label: '?', red: true, r: 40 }]))
  },
  () => retry(() => {
    const a = randInt(60, 110), b = randInt(60, 110), c = randInt(50, 100), d = 360 - a - b - c
    if (d < 40) return null
    const rot = randInt(0, 40)
    return fig(numeric(`Quatre demi-droites de même origine O découpent le tour complet en quatre angles. Trois d'entre eux mesurent ${a}°, ${b}° et ${c}°. Combien mesure le quatrième (en °) ?`, d, {
      explanation: `Les quatre angles font le tour du point O, soit 360° : 360 − ${a} − ${b} − ${c} = ${d}°.`,
    }), fanFig([['x', rot], ['y', rot + a], ['z', rot + a + b], ['t', rot + a + b + c]], [{ a: 'x', b: 'y', label: deg(a) }, { a: 'y', b: 'z', label: deg(b) }, { a: 'z', b: 't', label: deg(c) }, { a: 't', b: 'x', label: '?', red: true }]))
  }),
)

// ═══ Palier 2 ═══════════════════════════════════════════════════════════
/** Parallèles : angle connu en k, angle cherché en q (marqué « ? »). */
function parallelAsk(k: Spot, q: Spot, style: number): Exercise {
  const N = pick(NAMESETS), v = niceAngle(), tl = tiltFor(k.c, v)
  const { ans, why } = chain(N, k, q, v)
  const nk = cname(N, k), nq = cname(N, q)
  const prompt = [
    `Les droites ${L1(N)} et ${L2(N)} sont parallèles. L'angle ${nk} mesure ${v}°. Combien mesure l'angle ${nq} (en °) ?`,
    `Sur la figure, ${L1(N)} // ${L2(N)} et la sécante ${SEC(N)} les coupe en ${N.E} et ${N.F}. Sachant que ${nk} = ${v}°, calcule ${nq} (en °).`,
    `Les droites ${L1(N)} et ${L2(N)} sont parallèles et l'angle marqué en ${k.at === 'E' ? N.E : N.F} mesure ${v}°. Quelle est la mesure de l'angle rouge en ${q.at === 'E' ? N.E : N.F} (en °) ?`,
  ][style % 3]
  return fig(numeric(prompt, ans, { explanation: why }), secFig({ tl, N, marks: true, arcs: [{ ...k, label: deg(v) }, { ...q, label: '?', red: true }] }))
}
const randSpot = (at: At): Spot => ({ at, c: pick(CORNERS) })
/** Couple (k, q) sur deux points différents ayant la relation voulue. */
function spotsWith(want: (r: Rel) => boolean): [Spot, Spot] {
  for (;;) {
    const kAt = pick(['E', 'F'] as const), k = randSpot(kAt), q = randSpot(other(kAt))
    if (want(relation(k, q))) return [k, q]
  }
}
const p2Parallels: Maker = variants(
  () => { const [k, q] = spotsWith((r) => r === 'alternes-internes'); return parallelAsk(k, q, randInt(0, 2)) },
  () => { const [k, q] = spotsWith((r) => r === 'internes'); return parallelAsk(k, q, randInt(0, 2)) },
  () => { const [k, q] = spotsWith((r) => r === 'externes'); return parallelAsk(k, q, randInt(0, 2)) },
  () => { const [k, q] = spotsWith((r) => r === 'autre'); return parallelAsk(k, q, randInt(0, 2)) },
  () => { const [k, q] = spotsWith((r) => r === 'autre' || r === 'internes'); return parallelAsk(k, q, randInt(0, 2)) },
)

const p2Bisector: Maker = variants(
  () => {
    const h = randInt(14, 75), [x, y, z] = pick(RAYS), rot = randInt(-15, 15)
    return fig(numeric(`La demi-droite [O${z}) est la bissectrice de l'angle ${ang(x, 'O', y)}, qui mesure ${2 * h}°. Combien mesure l'angle ${ang(x, 'O', z)} (en °) ?`, h, {
      explanation: `La bissectrice partage l'angle en deux angles égaux : ${2 * h} ÷ 2 = ${h}°.`,
    }), fanFig([[x, rot], [z, rot + h], [y, rot + 2 * h]], [{ a: x, b: z, label: '?', red: true, r: 30 }, { a: z, b: y, r: 30, color: BLUE }]))
  },
  () => {
    const h = randInt(14, 80), [x, y, z] = pick(RAYS), rot = randInt(-15, 15)
    return fig(numeric(`Sur la figure, [O${z}) est la bissectrice de l'angle ${ang(x, 'O', y)} et l'angle ${ang(z, 'O', y)} mesure ${h}°. Combien mesure l'angle ${ang(x, 'O', y)} (en °) ?`, 2 * h, {
      explanation: `La bissectrice partage ${ang(x, 'O', y)} en deux angles égaux de ${h}° : ${ang(x, 'O', y)} = 2 × ${h} = ${2 * h}°.`,
    }), fanFig([[x, rot], [z, rot + h], [y, rot + 2 * h]], [{ a: z, b: y, label: deg(h), r: 30 }, { a: x, b: y, label: '?', red: true, r: 48, at: 0.2 }]))
  },
  () => {
    const a = 2 * randInt(15, 70), [x, y, z] = pick(RAYS), half = (180 - a) / 2, t = z === 't' ? 's' : 't'
    return fig(numeric(`Les demi-droites [O${x}) et [O${y}) sont opposées, l'angle ${ang(x, 'O', z)} mesure ${a}° et [O${t}) est la bissectrice de l'angle ${ang(z, 'O', y)}. Combien mesure l'angle ${ang(t, 'O', y)} (en °) ?`, half, {
      explanation: `${ang(z, 'O', y)} = 180 − ${a} = ${180 - a}° (angles supplémentaires). La bissectrice le partage en deux : ${180 - a} ÷ 2 = ${half}°.`,
    }), fanFig([[x, 0], [z, a], [t, a + half], [y, 180]], [{ a: x, b: z, label: deg(a) }, { a: t, b: y, label: '?', red: true, r: 32 }, { a: z, b: t, r: 32, color: BLUE }]))
  },
  () => {
    const h = randInt(12, 40), [x, y, z] = pick(RAYS), t = z === 't' ? 's' : 't'
    return fig(numeric(`L'angle ${ang(x, 'O', y)} est droit. La demi-droite [O${z}) est à l'intérieur et [O${t}) est la bissectrice de l'angle ${ang(x, 'O', z)}, avec ${ang(x, 'O', t)} = ${h}°. Combien mesure l'angle ${ang(z, 'O', y)} (en °) ?`, 90 - 2 * h, {
      explanation: `${ang(x, 'O', z)} = 2 × ${h} = ${2 * h}° (bissectrice). Puis ${ang(z, 'O', y)} = 90 − ${2 * h} = ${90 - 2 * h}° (angles complémentaires).`,
    }), fanFig([[x, 0], [t, h], [z, 2 * h], [y, 90]], [{ a: x, b: y, right: true }, { a: x, b: t, label: deg(h), r: 44 }, { a: z, b: y, label: '?', red: true, r: 36 }]))
  },
)

const p2Linked: Maker = variants(
  () => {
    const kk = pick([2, 3, 4, 5]), small = 180 / (kk + 1), n = pick(CROSS_NAMES), s0 = randInt(0, 3)
    const big = kk * small
    const askBig = Math.random() < 0.5
    return fig(numeric(`Les droites (${n[0]}${n[1]}) et (${n[2]}${n[3]}) se coupent en O. L'angle ${sectorName(n, s0 + 1)} mesure ${kk} fois plus que l'angle ${sectorName(n, s0)}. Combien mesure l'angle ${askBig ? sectorName(n, s0 + 1) : sectorName(n, s0)} (en °) ?`, askBig ? big : small, {
      explanation: `Les deux angles adjacents sont supplémentaires : petit + ${kk} × petit = ${kk + 1} × petit = 180°. Le petit mesure 180 ÷ ${kk + 1} = ${small}°, le grand ${kk} × ${small} = ${big}°.`,
    }), crossFig(s0 % 2 === 0 ? small : big, n, [{ s: s0, label: askBig ? undefined : '?', red: !askBig, color: BLUE }, { s: s0 + 1, label: askBig ? '?' : undefined, red: askBig, color: BLUE }]))
  },
  () => {
    const d = 2 * randInt(10, 45), small = (180 - d) / 2, big = small + d, n = pick(CROSS_NAMES), s0 = randInt(0, 3)
    return fig(numeric(`Deux droites (${n[0]}${n[1]}) et (${n[2]}${n[3]}) se coupent en O. L'angle ${sectorName(n, s0 + 1)} mesure ${d}° de plus que l'angle ${sectorName(n, s0)}. Combien mesure ${sectorName(n, s0 + 1)} (en °) ?`, big, {
      explanation: `Les deux angles sont adjacents supplémentaires. Sans les ${d}° d'écart, il reste 180 − ${d} = ${180 - d}° à partager en deux : le petit mesure ${small}°, le grand ${small} + ${d} = ${big}°.`,
    }), crossFig(s0 % 2 === 0 ? small : big, n, [{ s: s0, color: BLUE }, { s: s0 + 1, label: '?', red: true }]))
  },
  () => {
    const v = niceAngle(), n = pick(CROSS_NAMES), s0 = randInt(0, 3), k = sectorVal(v, s0)
    return fig(numeric(`Les droites (${n[0]}${n[1]}) et (${n[2]}${n[3]}) se coupent en O. Les angles ${sectorName(n, s0)} et ${sectorName(n, s0 + 2)} ont pour somme ${2 * k}°. Combien mesure l'angle ${sectorName(n, s0 + 1)} (en °) ?`, 180 - k, {
      explanation: `${sectorName(n, s0)} et ${sectorName(n, s0 + 2)} sont opposés par le sommet, donc égaux : ${k}° chacun. ${sectorName(n, s0 + 1)} leur est adjacent supplémentaire : 180 − ${k} = ${180 - k}°.`,
    }), crossFig(v, n, [{ s: s0, color: BLUE }, { s: s0 + 2, color: BLUE }, { s: s0 + 1, label: '?', red: true }]))
  },
  () => {
    const v = niceAngle(), n = pick(CROSS_NAMES), s0 = randInt(0, 3), k = sectorVal(v, s0)
    const S = 360 - (180 - k)
    return fig(numeric(`Deux droites (${n[0]}${n[1]}) et (${n[2]}${n[3]}) se coupent en O. La somme des angles ${sectorName(n, s0)}, ${sectorName(n, s0 + 2)} et ${sectorName(n, s0 + 3)} vaut ${S}°. Combien mesure l'angle ${sectorName(n, s0)} (en °) ?`, k, {
      explanation: `Les quatre angles font 360° : ${sectorName(n, s0 + 1)} = 360 − ${S} = ${180 - k}°. Son voisin ${sectorName(n, s0)} lui est supplémentaire : 180 − ${180 - k} = ${k}°.`,
    }), crossFig(v, n, [{ s: s0, label: '?', red: true }]))
  },
)

const p2Around: Maker = variants(
  () => retry(() => {
    const a = randInt(70, 110), b = randInt(70, 110), c = 360 - 90 - a - b
    if (c < 45) return null
    const rot = randInt(-10, 30)
    return fig(numeric(`Autour du point O, quatre angles adjacents font le tour complet : un angle droit, un angle de ${a}°, un angle de ${b}° et un dernier angle. Combien mesure ce dernier (en °) ?`, c, {
      explanation: `Le tour complet mesure 360° : 360 − 90 − ${a} − ${b} = ${c}°.`,
    }), fanFig([['x', rot], ['y', rot + 90], ['z', rot + 90 + a], ['t', rot + 90 + a + b]], [{ a: 'x', b: 'y', right: true }, { a: 'y', b: 'z', label: deg(a) }, { a: 'z', b: 't', label: deg(b) }, { a: 't', b: 'x', label: '?', red: true }]))
  }),
  () => retry(() => {
    const a = randInt(100, 150), b = randInt(80, 130), c = 360 - a - b
    if (c < 60 || c > 160) return null
    const rot = randInt(-20, 40)
    return fig(numeric(`Trois demi-droites [Ox), [Oy) et [Oz) partagent le tour du point O en trois angles. ${ang('x', 'O', 'y')} = ${a}° et ${ang('y', 'O', 'z')} = ${b}°. Combien mesure l'angle ${ang('z', 'O', 'x')} (en °) ?`, c, {
      explanation: `Les trois angles font le tour complet : 360 − ${a} − ${b} = ${c}°.`,
    }), fanFig([['x', rot], ['y', rot + a], ['z', rot + a + b]], [{ a: 'x', b: 'y', label: deg(a) }, { a: 'y', b: 'z', label: deg(b) }, { a: 'z', b: 'x', label: '?', red: true }]))
  }),
  () => {
    const parts = pick([5, 6, 8, 9, 10, 12]), ctx = pick(['les parts d’une tarte', 'les rayons d’une roue de charrette', 'les secteurs d’une rosace'])
    const rot = randInt(0, 30)
    return fig(numeric(`On partage le tour complet autour d'un point O en ${parts} angles égaux, comme ${ctx}. Combien mesure chaque angle (en °) ?`, 360 / parts, {
      explanation: `Le tour complet mesure 360° : 360 ÷ ${parts} = ${360 / parts}°.`,
    }), fanFig(Array.from({ length: parts }, (_, i) => [' '.repeat(i + 1), rot + (360 / parts) * i] as [string, number]), [{ a: ' ', b: '  ', label: '?', red: true, r: 30 }]))
  },
  () => {
    const a = 2 * randInt(20, 60), rot = randInt(-20, 20), b = (360 - a) / 2
    return fig(numeric(`Trois demi-droites de même origine O forment trois angles. L'un mesure ${a}° et les deux autres sont égaux. Combien mesure chacun des deux angles égaux (en °) ?`, b, {
      explanation: `Les trois angles font le tour complet : 360 − ${a} = ${360 - a}°, à partager en deux : ${b}°.`,
    }), fanFig([['x', rot], ['y', rot + a], ['z', rot + a + b]], [{ a: 'x', b: 'y', label: deg(a) }, { a: 'y', b: 'z', label: '?', red: true }, { a: 'z', b: 'x', label: '?', red: true }]))
  },
)

// ═══ Palier 3 ═══════════════════════════════════════════════════════════
/** Angle cherché désigné seulement par son nom (pas marqué sur la figure). */
function parallelNamed(k: Spot, q: Spot): Exercise {
  const N = pick(NAMESETS), v = niceAngle(), tl = tiltFor(k.c, v)
  const { ans, why } = chain(N, k, q, v)
  const prompt = pick([
    `Les droites ${L1(N)} et ${L2(N)} sont parallèles et ${cname(N, k)} = ${v}°. Calcule l'angle ${cname(N, q)} (en °). Il n'est pas marqué : repère-le sur la figure.`,
    `Sur la figure, ${L1(N)} // ${L2(N)} et l'angle ${cname(N, k)} mesure ${v}°. Quelle est la mesure de l'angle ${cname(N, q)} (en °) ?`,
    `On sait que ${L1(N)} et ${L2(N)} sont parallèles. L'angle marqué, ${cname(N, k)}, mesure ${v}°. Trouve la mesure de ${cname(N, q)} (en °).`,
  ])
  return fig(numeric(prompt, ans, { explanation: why }), secFig({ tl, N, marks: true, arcs: [{ ...k, label: deg(v) }] }))
}
const p3Named: Maker = variants(
  () => { const [k, q] = spotsWith((r) => r === 'internes' || r === 'externes'); return parallelNamed(k, q) },
  () => { const [k, q] = spotsWith((r) => r === 'autre'); return parallelNamed(k, q) },
  () => { const [k, q] = spotsWith((r) => r === 'autre'); return parallelNamed(k, q) },
  () => { const [k, q] = spotsWith((r) => r === 'alternes-externes' || r === 'correspondants' || r === 'alternes-internes'); return parallelNamed(k, q) },
  () => { const [k, q] = spotsWith((r) => r === 'internes'); return parallelNamed(k, q) },
)

const YES = 'Oui, elles sont parallèles'
const NO = 'Non, elles ne sont pas parallèles'
/** Deux angles mesurés en E et F : les droites sont-elles parallèles ? */
function parallelTest(kind: 'alt' | 'corr' | 'int' | 'adj'): Exercise {
  const N = pick(NAMESETS), v = niceAngle(40, 140), yes = Math.random() < 0.5
  const dl = yes ? 0 : pick([-1, 1]) * pick([1, 2, 3, 4, 5])
  const tl = v // angle « ne » en E = tl
  let p: Spot, q: Spot
  if (kind === 'alt') [p, q] = pick([[{ at: 'E', c: 'se' }, { at: 'F', c: 'nw' }], [{ at: 'E', c: 'sw' }, { at: 'F', c: 'ne' }]] as [Spot, Spot][])
  else if (kind === 'corr') { const c = pick(CORNERS); [p, q] = [{ at: 'E', c }, { at: 'F', c }] }
  else if (kind === 'int') [p, q] = pick([[{ at: 'E', c: 'se' }, { at: 'F', c: 'ne' }], [{ at: 'E', c: 'sw' }, { at: 'F', c: 'nw' }]] as [Spot, Spot][])
  else [p, q] = pick([[{ at: 'E', c: 'ne' }, { at: 'F', c: 'nw' }], [{ at: 'E', c: 'sw' }, { at: 'F', c: 'se' }], [{ at: 'E', c: 'nw' }, { at: 'F', c: 'ne' }], [{ at: 'E', c: 'se' }, { at: 'F', c: 'sw' }]] as [Spot, Spot][])
  const a = secVal(tl, 0, p), b = secVal(tl, dl, q)
  const n1 = cname(N, p), n2 = cname(N, q)
  let why: string
  if (kind === 'alt' || kind === 'corr') {
    const r = kind === 'alt' ? 'alternes-internes' : 'correspondants'
    why = yes ? `Les angles ${n1} et ${n2} sont ${r} et ils ont la même mesure (${a}°) : les droites ${L1(N)} et ${L2(N)} sont parallèles.`
      : `Les angles ${n1} et ${n2} sont ${r}. Si les droites étaient parallèles, ils seraient égaux ; or ${a}° ≠ ${b}°. Les droites ne sont pas parallèles.`
  } else {
    const mid: Spot = { at: 'F', c: p.c }, nm = cname(N, mid), m = 180 - b
    why = `${nm} et ${n2} sont adjacents supplémentaires : ${nm} = 180 − ${b} = ${m}°. Les angles ${n1} et ${nm} sont correspondants${yes ? ` et égaux (${a}°) : les droites sont parallèles.` : ` mais ${a}° ≠ ${m}° : les droites ne sont pas parallèles.`}`
  }
  const prompt = pick([
    `La sécante ${SEC(N)} coupe les droites ${L1(N)} et ${L2(N)}. On a mesuré ${n1} = ${a}° et ${n2} = ${b}°. Les droites ${L1(N)} et ${L2(N)} sont-elles parallèles ?`,
    `Sur la figure (qui n'est pas à l'échelle), ${n1} = ${a}° et ${n2} = ${b}°. Peut-on affirmer que ${L1(N)} et ${L2(N)} sont parallèles ?`,
    `On a mesuré deux angles sur la figure : ${n1} = ${a}° et ${n2} = ${b}°. Les droites ${L1(N)} et ${L2(N)} sont-elles parallèles ?`,
  ])
  return fig(choice(prompt, yes ? YES : NO, [YES, NO], why), secFig({ tl, dl, N, marks: false, arcs: [{ ...p, label: deg(a), color: BLUE }, { ...q, label: deg(b), color: GREEN }] }))
}
const p3Test: Maker = variants(
  () => parallelTest('alt'),
  () => parallelTest('corr'),
  () => parallelTest('int'),
  () => parallelTest('adj'),
)

/** Quelle mesure doit avoir l'angle q pour que les droites soient parallèles ? */
function parallelNeed(k: Spot, q: Spot): Exercise {
  const N = pick(NAMESETS), v = niceAngle(), tl = tiltFor(k.c, v)
  const { ans, why } = chain(N, k, q, v)
  const prompt = pick([
    `L'angle ${cname(N, k)} mesure ${v}°. Quelle doit être la mesure de l'angle ${cname(N, q)} pour que les droites ${L1(N)} et ${L2(N)} soient parallèles (en °) ?`,
    `On veut que ${L1(N)} et ${L2(N)} soient parallèles. Sachant que ${cname(N, k)} = ${v}°, combien doit mesurer l'angle marqué « ? » (en °) ?`,
    `Sur la figure, ${cname(N, k)} = ${v}°. Pour quelle mesure de ${cname(N, q)} les droites ${L1(N)} et ${L2(N)} sont-elles parallèles (en °) ?`,
  ])
  return fig(numeric(prompt, ans, { explanation: `Supposons ${L1(N)} // ${L2(N)}. ${why} Réciproquement, avec cette mesure, les angles correspondants sont égaux et les droites sont bien parallèles.` }),
    secFig({ tl, N, marks: false, arcs: [{ ...k, label: deg(v) }, { ...q, label: '?', red: true }] }))
}
const p3Need: Maker = variants(
  () => { const [k, q] = spotsWith((r) => r === 'internes'); return parallelNeed(k, q) },
  () => { const [k, q] = spotsWith((r) => r === 'autre'); return parallelNeed(k, q) },
  () => { const [k, q] = spotsWith((r) => r === 'externes'); return parallelNeed(k, q) },
  () => { const [k, q] = spotsWith((r) => r === 'alternes-internes' || r === 'correspondants'); return parallelNeed(k, q) },
  () => { const [k, q] = spotsWith((r) => r === 'autre' || r === 'internes'); return parallelNeed(k, q) },
)

/** Trois droites concourantes en O : six secteurs. */
function starEx(): Exercise | null {
  const al = randInt(35, 75), be = randInt(35, 75), ga = 180 - al - be
  if (ga < 35 || al === be || be === ga || al === ga) return null
  const rot = randInt(-15, 15), N = pick([['A', 'B', 'C', 'D', 'E', 'F'], ['M', 'N', 'P', 'Q', 'R', 'S']])
  const dirs = [0, al, al + be, 180, 180 + al, 180 + al + be].map((d) => d + rot)
  const raw: Record<string, Pt> = { O: [0, 0] }
  N.forEach((nm, i) => { raw[nm] = polar(3, dirs[i]) })
  const vals = [al, be, ga, al, be, ga]
  const sect = (i: number) => ang(N[i % 6], 'O', N[(i + 1) % 6])
  // deux secteurs connus non opposés, l'inconnu est le troisième « type »
  const types = shuffle([0, 1, 2]), t1 = types[0], t2 = types[1], tq = types[2]
  const i1 = t1 + 3 * randInt(0, 1), i2 = t2 + 3 * randInt(0, 1), iq = tq + 3 * randInt(0, 1)
  const figure = build(raw, {
    segs: [{ a: N[0], b: N[3] }, { a: N[1], b: N[4] }, { a: N[2], b: N[5] }],
    arcs: [{ v: 'O', a: N[i1], b: N[(i1 + 1) % 6], label: deg(vals[i1]), r: 26 }, { v: 'O', a: N[i2], b: N[(i2 + 1) % 6], label: deg(vals[i2]), r: 26 }, { v: 'O', a: N[iq], b: N[(iq + 1) % 6], label: '?', red: true, r: 26 }],
  })
  return fig(numeric(pick([
    `Les droites (${N[0]}${N[3]}), (${N[1]}${N[4]}) et (${N[2]}${N[5]}) se coupent en O. ${sect(i1)} = ${vals[i1]}° et ${sect(i2)} = ${vals[i2]}°. Combien mesure l'angle ${sect(iq)} (en °) ?`,
    `Trois droites sont concourantes en O (voir la figure). Sachant que ${sect(i1)} = ${vals[i1]}° et ${sect(i2)} = ${vals[i2]}°, calcule ${sect(iq)} (en °).`,
  ]), vals[iq], {
    explanation: `Chaque angle est égal à son opposé par le sommet. Les trois angles consécutifs ${sect(0)}, ${sect(1)} et ${sect(2)} forment l'angle plat ${ang(N[0], 'O', N[3])} ; ils mesurent (avec les opposés) ${vals[i1]}°, ${vals[i2]}° et l'angle cherché. Donc ${sect(iq)} = 180 − ${vals[i1]} − ${vals[i2]} = ${vals[iq]}°.`,
  }), figure)
}
const p3Star: Maker = variants(
  () => retry(starEx),
  () => retry(starEx),
  () => {
    const n = pick(CROSS_NAMES), v = niceAngle(), s0 = randInt(0, 3), k = sectorVal(v, s0)
    const askOpp = Math.random() < 0.5
    return fig(numeric(`Les droites (${n[0]}${n[1]}) et (${n[2]}${n[3]}) se coupent en O. L'angle ${sectorName(n, s0)} mesure ${k}°. Calcule la somme ${sectorName(n, s0 + 1)} + ${askOpp ? sectorName(n, s0 + 3) : sectorName(n, s0 + 2)} (en °).`, askOpp ? 360 - 2 * k : 180, {
      explanation: askOpp
        ? `${sectorName(n, s0 + 1)} et ${sectorName(n, s0 + 3)} sont opposés par le sommet et supplémentaires de ${sectorName(n, s0)} : chacun mesure 180 − ${k} = ${180 - k}°. Somme : 2 × ${180 - k} = ${360 - 2 * k}°.`
        : `${sectorName(n, s0 + 1)} = 180 − ${k} = ${180 - k}° et ${sectorName(n, s0 + 2)} = ${k}° (opposé par le sommet à ${sectorName(n, s0)}). Somme : ${180 - k} + ${k} = 180°.`,
    }), crossFig(v, n, [{ s: s0, label: deg(k) }]))
  },
  () => {
    const kk = pick([2, 3, 4, 5]), small = 180 / (kk + 1), n = pick(CROSS_NAMES), s0 = randInt(0, 3)
    return fig(numeric(`Deux droites (${n[0]}${n[1]}) et (${n[2]}${n[3]}) se coupent en O. L'angle ${sectorName(n, s0 + 1)} est ${kk} fois plus grand que ${sectorName(n, s0)}. Combien mesure l'angle ${sectorName(n, s0 + 2)} (en °) ?`, small, {
      explanation: `${sectorName(n, s0)} + ${sectorName(n, s0 + 1)} = 180°, soit ${kk + 1} fois ${sectorName(n, s0)} : ${sectorName(n, s0)} = 180 ÷ ${kk + 1} = ${small}°. ${sectorName(n, s0 + 2)} lui est opposé par le sommet : ${small}°.`,
    }), crossFig(s0 % 2 === 0 ? small : kk * small, n, [{ s: s0 + 2, label: '?', red: true }]))
  },
)

// ═══ Palier 4 ═══════════════════════════════════════════════════════════
/** Triangle ABC entre deux parallèles : A sur (d), B et C sur (d′). Angles entre (d) et [AB] (gauche) et [AC] (droite). */
function stripTriangle(p: number, q: number, N: [string, string, string]) {
  const A: Pt = [0, 2.6], B: Pt = [-2.6 / Math.tan(rad(p)), 0], C: Pt = [2.6 / Math.tan(rad(q)), 0]
  const xl = B[0] - 1.6, xr = C[0] + 1.6
  const L = hLines([2.6, 0], xl, xr, xr - 0.6, ['(d)', '(d′)'], 'l')
  return { raw: { [N[0]]: A, [N[1]]: B, [N[2]]: C, ...L.raw }, segs: [...L.segs, { a: N[0], b: N[1] }, { a: N[0], b: N[2] }, { a: N[1], b: N[2] }] as FigSegment[], hidden: L.hidden, notes: L.notes }
}
const TRI_NAMES: [string, string, string][] = [['A', 'B', 'C'], ['M', 'N', 'P'], ['R', 'S', 'T'], ['E', 'F', 'G']]
function stripEx(v: number): Exercise | null {
  const p = randInt(35, 75), q = randInt(35, 75), a = 180 - p - q
  if (a < 35 || Math.abs(p - q) < 4) return null
  const N = pick(TRI_NAMES), [A, B, C] = N, S = stripTriangle(p, q, N)
  const base = { ...S, arcs: [] as Arc[] }
  const atA = { v: A, a: '_l0', b: B }, atAr = { v: A, a: '_r0', b: C }
  const tB = ang(A, B, C), tC = ang(A, C, B), tA = ang(B, A, C)
  if (v === 0) {
    base.arcs = [{ ...atA, label: deg(p) }, { v: A, a: B, b: C, label: deg(a), r: 30 }, { v: C, a: A, b: B, label: '?', red: true }]
    return fig(numeric(`Les droites (d) et (d′) sont parallèles. ${A} est sur (d), ${B} et ${C} sont sur (d′). L'angle entre (d) et [${A}${B}] marqué sur la figure mesure ${p}° et ${tA} = ${a}°. Combien mesure l'angle ${tC} (en °) ?`, q, {
      explanation: `L'angle de ${p}° et l'angle ${tB} sont alternes-internes (droites parallèles coupées par (${A}${B})) : ${tB} = ${p}°. Dans le triangle ${A}${B}${C} : ${tC} = 180 − ${p} − ${a} = ${q}°.`,
    }), build(base.raw, { ...base }))
  }
  if (v === 1) {
    base.arcs = [{ ...atA, label: deg(p) }, { ...atAr, label: deg(q) }, { v: A, a: B, b: C, label: '?', red: true, r: 30 }]
    return fig(numeric(`Sur la figure, (d) // (d′). Les angles marqués entre (d) et les segments [${A}${B}] et [${A}${C}] mesurent ${p}° et ${q}°. Combien mesure l'angle ${tA} (en °) ?`, a, {
      explanation: `Les trois angles en ${A} forment un angle plat (le long de (d)) : ${tA} = 180 − ${p} − ${q} = ${a}°. (On retrouve aussi que ${tB} = ${p}° et ${tC} = ${q}° : alternes-internes.)`,
    }), build(base.raw, { ...base }))
  }
  if (v === 2) {
    base.arcs = [{ ...atA, label: '?', red: true }, { v: A, a: B, b: C, label: deg(a), r: 30 }, { v: C, a: A, b: B, label: deg(q) }]
    return fig(numeric(`Les droites (d) et (d′) sont parallèles. Dans le triangle ${A}${B}${C}, ${tA} = ${a}° et ${tC} = ${q}°. Combien mesure l'angle marqué « ? » entre (d) et [${A}${B}] (en °) ?`, p, {
      explanation: `Dans le triangle : ${tB} = 180 − ${a} − ${q} = ${p}°. L'angle « ? » et ${tB} sont alternes-internes, et (d) // (d′) : ils sont égaux, ${p}°.`,
    }), build(base.raw, { ...base }))
  }
  base.arcs = [{ ...atA, label: deg(p) }, { ...atAr, label: deg(q) }, { v: B, a: A, b: C, label: '?', red: true }]
  return fig(numeric(`(d) // (d′) ; ${A} est sur (d), ${B} et ${C} sur (d′). Les angles entre (d) et les côtés [${A}${B}] et [${A}${C}] mesurent ${p}° et ${q}°. Combien mesure l'angle ${tB} (en °) ?`, p, {
    explanation: `L'angle de ${p}° en ${A} et l'angle ${tB} sont alternes-internes (sécante (${A}${B})), et les droites sont parallèles : ${tB} = ${p}°.`,
  }), build(base.raw, { ...base }))
}
const p4Strip: Maker = variants(
  () => retry(() => stripEx(0)),
  () => retry(() => stripEx(1)),
  () => retry(() => stripEx(2)),
  () => retry(() => stripEx(0)),
)

/** Ligne brisée A–M–B entre deux parallèles : AMB = a + b. */
function zigFigure(a: number, b: number, lab: { a: string; b: string; m: string }, N: [string, string, string]) {
  return zigObtuse(a, b, N, lab, false, false)
}
const ZIG: [string, string, string][] = [['A', 'M', 'B'], ['E', 'K', 'F'], ['R', 'S', 'T'], ['P', 'O', 'Q']]
const p4Zigzag: Maker = variants(
  () => {
    const a = randInt(30, 60), b = randInt(30, 60), N = pick(ZIG), [A, M, B] = N
    return fig(numeric(`Les droites (d) et (d′) sont parallèles. Le point ${M} est entre les deux droites. Les angles marqués en ${A} et en ${B} mesurent ${a}° et ${b}°. Combien mesure l'angle ${ang(A, M, B)} (en °) ?`, a + b, {
      explanation: `Trace par ${M} la parallèle à (d) et (d′). Elle partage ${ang(A, M, B)} en deux angles, alternes-internes avec les angles en ${A} et en ${B} : ils mesurent ${a}° et ${b}°. Donc ${ang(A, M, B)} = ${a} + ${b} = ${a + b}°.`,
    }), zigFigure(a, b, { a: deg(a), b: deg(b), m: '?' }, N))
  },
  fresh(() => {
    const a = randInt(30, 60), b = randInt(30, 60), N = pick(ZIG), [A, M, B] = N
    return fig(numeric(`(d) // (d′) et ${M} est entre les deux droites. L'angle ${ang(A, M, B)} mesure ${a + b}° et l'angle marqué en ${A} mesure ${a}°. Combien mesure l'angle marqué « ? » en ${B} (en °) ?`, b, {
      explanation: `Par ${M}, la parallèle à (d) partage ${ang(A, M, B)} en deux angles alternes-internes avec les angles en ${A} et en ${B}. Donc ${ang(A, M, B)} = ${a} + « ? », et « ? » = ${a + b} − ${a} = ${b}°.`,
    }), zigFigure(a, b, { a: deg(a), b: '?', m: deg(a + b) }, N))
  }),
  () => {
    const a = randInt(30, 60), b = randInt(30, 60), N = pick(ZIG), [A, M, B] = N
    const ctx = pick(['Un chemin relie deux routes parallèles (d) et (d′) en faisant un coude', 'Un ruisseau coule entre deux murs parallèles (d) et (d′) et fait un coude', 'Une corde est tendue entre deux poutres parallèles (d) et (d′) et passe par un crochet'])
    return fig(numeric(`${ctx} en ${M} (voir la figure). Les angles en ${A} et en ${B} mesurent ${a}° et ${b}°. Combien mesure l'angle ${ang(A, M, B)} (en °) ?`, a + b, {
      explanation: `La parallèle à (d) passant par ${M} partage l'angle en deux angles alternes-internes : ${a}° et ${b}°. Total : ${a + b}°.`,
    }), zigFigure(a, b, { a: deg(a), b: deg(b), m: '?' }, N))
  },
  fresh(() => {
    const a = randInt(30, 60), b = randInt(30, 60), N = pick(ZIG), [A, M, B] = N
    return fig(numeric(`Les droites (d) et (d′) sont parallèles. L'angle ${ang(A, M, B)} mesure ${a + b}° et l'angle marqué en ${B} mesure ${b}°. Combien mesure l'angle marqué « ? » en ${A} (en °) ?`, a, {
      explanation: `La parallèle à (d) passant par ${M} partage ${ang(A, M, B)} en deux angles alternes-internes avec ceux de ${A} et de ${B} : « ? » = ${a + b} − ${b} = ${a}°.`,
    }), zigFigure(a, b, { a: '?', b: deg(b), m: deg(a + b) }, N))
  }),
)

/** Deux paires de droites parallèles : (d1) // (d2) horizontales, (s1) // (s2) obliques. Points P, Q (haut), R, S (bas). */
function gridEx(): Exercise {
  const v = niceAngle(40, 140), tl = v, g = 3.2
  const n = pick([['P', 'Q', 'R', 'S'], ['A', 'B', 'C', 'D'], ['E', 'F', 'G', 'H']])
  const u = polar(1, tl), dx = (-2.4 * u[0]) / u[1]
  const pos: Record<string, Pt> = { [n[0]]: [0, 0], [n[1]]: [g, 0], [n[2]]: [dx, -2.4], [n[3]]: [dx + g, -2.4] }
  const xl = Math.min(0, dx) - 1.3, xr = Math.max(g, g + dx) + 1.3
  const raw: Record<string, Pt> = { ...pos, a1: [xl, 0], a2: [xr, 0], b1: [xl, -2.4], b2: [xr, -2.4], c1: polar(1.1, tl, pos[n[0]]), c2: polar(-1.1, tl, pos[n[2]]), e1: polar(1.1, tl, pos[n[1]]), e2: polar(-1.1, tl, pos[n[3]]) }
  const aux: Record<string, Pt> = {}
  for (const nm of n) { aux[`${nm}e`] = [pos[nm][0] + 0.6, pos[nm][1]]; aux[`${nm}w`] = [pos[nm][0] - 0.6, pos[nm][1]]; aux[`${nm}u`] = polar(0.6, tl, pos[nm]); aux[`${nm}d`] = polar(-0.6, tl, pos[nm]) }
  const kc = pick(CORNERS), qc = Math.random() < 0.8 ? pick(CORNERS.filter((c) => secVal(tl, 0, { at: 'E', c }) !== secVal(tl, 0, { at: 'E', c: kc }))) : pick(CORNERS)
  const kv = secVal(tl, 0, { at: 'E', c: kc }), qv = secVal(tl, 0, { at: 'E', c: qc })
  const [kp, qp] = pick([[n[0], n[3]], [n[3], n[0]], [n[1], n[2]], [n[2], n[1]]])
  const arc = (P: string, c: Corner, label: string, red?: boolean): Arc => ({ v: P, a: c.endsWith('e') ? `${P}e` : `${P}w`, b: c.startsWith('n') ? `${P}u` : `${P}d`, label, red, r: 20 })
  const figure = build({ ...raw, ...aux }, {
    segs: [{ a: 'a1', b: 'a2' }, { a: 'b1', b: 'b2' }, { a: 'c2', b: 'c1' }, { a: 'e2', b: 'e1' }, { a: n[0], b: n[1], mark: 'arrow', color: 'transparent' }, { a: n[2], b: n[3], mark: 'arrow', color: 'transparent' }, { a: n[2], b: n[0], mark: 'arrow2', color: 'transparent' }, { a: n[3], b: n[1], mark: 'arrow2', color: 'transparent' }],
    arcs: [arc(kp, kc, deg(kv)), arc(qp, qc, '?', true)],
    hidden: [...Object.keys(aux), 'a1', 'a2', 'b1', 'b2', 'c1', 'c2', 'e1', 'e2'],
  })
  const same = kv === qv
  return fig(numeric(pick([
    `Sur la figure, les droites (${n[0]}${n[1]}) et (${n[2]}${n[3]}) sont parallèles, ainsi que (${n[0]}${n[2]}) et (${n[1]}${n[3]}). L'angle marqué en ${kp} mesure ${kv}°. Combien mesure l'angle marqué « ? » en ${qp} (en °) ?`,
    `Deux paires de droites parallèles se croisent (voir le codage de la figure). Sachant que l'angle marqué en ${kp} mesure ${kv}°, calcule l'angle marqué en ${qp} (en °).`,
  ]), qv, {
    explanation: `Toutes les droites obliques sont parallèles entre elles, et les droites horizontales aussi : en passant d'un point à l'autre par des angles correspondants, on retrouve en ${qp} un angle de ${kv}° placé au même endroit qu'en ${kp}. L'angle « ? » ${same ? `est à cette place (ou à la place opposée par le sommet) : ${qv}°` : `lui est adjacent supplémentaire : 180 − ${kv} = ${qv}°`}.`,
  }), figure)
}
/** Angles liés (multiple, écart) puis report par les parallèles. */
function linkedParallel(mode: 'mult' | 'diff'): Exercise {
  const N = pick(NAMESETS)
  let small: number, big: number, rel: string
  const kk = pick([2, 3, 4, 5])
  if (mode === 'mult') { small = 180 / (kk + 1); big = kk * small; rel = `est ${kk} fois plus grand que` } else { const d = 2 * randInt(10, 50); small = (180 - d) / 2; big = small + d; rel = `mesure ${d}° de plus que` }
  const c = pick(CORNERS), cb = pick(CORNERS.filter((x) => x !== c && x !== OPP[c]))
  const pBig: Spot = { at: 'E', c: cb }, pSmall: Spot = { at: 'E', c }
  const tl = tiltFor(c, small)
  const q: Spot = { at: 'F', c: pick(CORNERS) }
  const qv = secVal(tl, 0, q)
  const nB = cname(N, pBig), nS = cname(N, pSmall), nq = cname(N, q)
  const { why } = chain(N, pSmall, q, small)
  return fig(numeric(`Les droites ${L1(N)} et ${L2(N)} sont parallèles. L'angle ${nB} est ${rel} l'angle ${nS}. Combien mesure l'angle ${nq} (en °) ?`, qv, {
    explanation: `${nS} et ${nB} sont adjacents supplémentaires : ${mode === 'mult' ? `${nS} + ${kk} × ${nS} = ${kk + 1} × ${nS} = 180°, donc ${nS} = 180 ÷ ${kk + 1} = ${small}°` : `${nS} = (180 − ${big - small}) ÷ 2 = ${small}°`} (et ${nB} = ${big}°). ${why}`,
  }), secFig({ tl, N, marks: true, arcs: [{ ...pSmall, color: BLUE }, { ...pBig, color: GREEN }, { ...q, label: '?', red: true }] }))
}
const p4Grid: Maker = variants(gridEx, gridEx, gridEx)
const p4Linked: Maker = variants(
  () => linkedParallel('mult'),
  () => linkedParallel('diff'),
  () => linkedParallel('mult'),
  () => linkedParallel('diff'),
)

// ═══ Palier 5 ═══════════════════════════════════════════════════════════
/** (xy) // (zt) ; la bissectrice de l'angle intérieur en E coupe (zt) en G : triangle EFG isocèle. */
function bisectorParallel(ask: 'G' | 'F' | 'E2'): Exercise | null {
  const N = pick(NAMESETS), G = 'G'
  const half = randInt(20, 55), full = 2 * half
  // angle intérieur en E côté droit (coin se) mesure `full` : tl = 180 − full
  const tl = 180 - full
  if (Math.abs(tl - 90) < 10) return null
  const u = polar(1, tl), Hh = 2.4, E: Pt = [0, 0], F: Pt = [(-Hh * u[0]) / u[1], -Hh]
  const bis = polar(1, -half) // direction de la bissectrice depuis E (entre l'est et le bas de la sécante)
  const Gp: Pt = [(Hh * bis[0]) / -bis[1], -Hh]
  const xl = Math.min(E[0], F[0], Gp[0]) - 1.2, xr = Math.max(E[0], F[0], Gp[0]) + 1.2
  const raw: Record<string, Pt> = { E, F, [G]: Gp, X: [xl, 0], Y: [xr, 0], Z: [xl, -Hh], T: [xr, -Hh], U: polar(1.2, tl, E), V: polar(-1.2, tl, F), Ya: [xr - 0.9, 0], Ta: [xr - 0.9, -Hh] }
  const tF = ang(N.E, N.F, G), tG = ang(N.E, G, N.F), tE = ang(N.F, N.E, G), tEy = ang(N.y, N.E, N.v)
  let ans: number, arcs: Arc[], prompt: string, why: string
  const halfWhy = `La bissectrice partage ${tEy} = ${full}° en deux : ${ang(N.y, N.E, G)} = ${tE} = ${half}°.`
  const altWhy = `Les angles ${ang(N.y, N.E, G)} et ${tG} sont alternes-internes (sécante (${N.E}${G})) et ${L1(N)} // ${L2(N)} : ${tG} = ${half}°.`
  if (ask === 'G') {
    ans = half; prompt = `Les droites ${L1(N)} et ${L2(N)} sont parallèles et ${tEy} = ${full}°. La bissectrice de ${tEy} coupe ${L2(N)} en ${G}. Combien mesure l'angle ${tG} (en °) ?`
    why = `${halfWhy} ${altWhy}`
    arcs = [{ v: 'E', a: 'Y', b: 'F', label: deg(full), r: 26, at: 0.22 }, { v: G, a: 'E', b: 'F', label: '?', red: true }]
  } else if (ask === 'F') {
    ans = 180 - full; prompt = `${L1(N)} // ${L2(N)} et l'angle ${tEy} mesure ${full}°. La bissectrice de cet angle coupe ${L2(N)} en ${G}. Combien mesure l'angle ${tF} du triangle ${N.E}${N.F}${G} (en °) ?`
    why = `${halfWhy} ${altWhy} Dans le triangle ${N.E}${N.F}${G} : ${tF} = 180 − ${half} − ${half} = ${180 - full}°.`
    arcs = [{ v: 'E', a: 'Y', b: 'F', label: deg(full), r: 26, at: 0.22 }, { v: 'F', a: 'E', b: G, label: '?', red: true }]
  } else {
    ans = 180 - full; prompt = `Les droites ${L1(N)} et ${L2(N)} sont parallèles. La bissectrice de l'angle ${tEy} coupe ${L2(N)} en ${G}, et l'angle ${tG} mesure ${half}°. Combien mesure l'angle ${ang(N.x, N.E, N.v)} (en °) ?`
    why = `Les angles ${tG} et ${ang(N.y, N.E, G)} sont alternes-internes et les droites sont parallèles : ${ang(N.y, N.E, G)} = ${half}°. La bissectrice double cet angle : ${tEy} = ${full}°. Enfin ${ang(N.x, N.E, N.v)} = 180 − ${full} = ${180 - full}° (angles adjacents supplémentaires).`
    arcs = [{ v: G, a: 'E', b: 'F', label: deg(half) }, { v: 'E', a: 'X', b: 'F', label: '?', red: true }]
  }
  const figure = build(raw, {
    segs: [{ a: 'X', b: 'Y' }, { a: 'Z', b: 'T' }, { a: 'V', b: 'U' }, { a: 'E', b: G }, { a: 'Ya', b: 'Y', mark: 'arrow', color: 'transparent' }, { a: 'Ta', b: 'T', mark: 'arrow', color: 'transparent' }],
    arcs, hidden: ['X', 'Y', 'Z', 'T', 'U', 'V', 'Ya', 'Ta'], labels: { E: N.E, F: N.F },
    notes: [{ at: raw.X, text: N.x, dx: -9 }, { at: raw.Y, text: N.y, dx: 9 }, { at: raw.Z, text: N.z, dx: -9 }, { at: raw.T, text: N.t, dx: 9 }, { at: polar(1.5, tl, E), text: N.u }, { at: polar(-1.5, tl, F), text: N.v }],
  })
  return fig(numeric(prompt, ans, { explanation: why }), figure)
}
const p5Bisector: Maker = variants(
  () => retry(() => bisectorParallel('G')),
  () => retry(() => bisectorParallel('F')),
  () => retry(() => bisectorParallel('E2')),
)

/** Triangle ABC, D sur [AB], E sur [AC] : (DE) // (BC) ? */
function triParallel(mode: number, fronton = false): Exercise | null {
  const a = randInt(40, 80), b = randInt(40, 75), c = 180 - a - b
  if (c < 35 || a === b || b === c || a === c) return null
  const [A, B, C, D, E] = fronton ? ['A', 'B', 'C', 'D', 'E'] : pick([['A', 'B', 'C', 'D', 'E'], ['R', 'S', 'T', 'M', 'N'], ['K', 'L', 'M', 'P', 'Q']])
  // base [BC] horizontale, B à l'origine ; angle a en A, b en B, c en C
  const ab = (6 * Math.sin(rad(c))) / Math.sin(rad(a))
  const PA: Pt = polar(ab, b), PB: Pt = [0, 0], PC: Pt = [6, 0]
  const k = randInt(40, 60) / 100
  const PD: Pt = [PA[0] + (PB[0] - PA[0]) * k, PA[1] + (PB[1] - PA[1]) * k], PE: Pt = [PA[0] + (PC[0] - PA[0]) * k, PA[1] + (PC[1] - PA[1]) * k]
  const raw: Record<string, Pt> = { [A]: PA, [B]: PB, [C]: PC, [D]: PD, [E]: PE }
  const segs: FigSegment[] = [{ a: A, b: B }, { a: B, b: C }, { a: C, b: A }, { a: D, b: E }]
  const tA = ang(B, A, C), tB = ang(A, B, C), tC = ang(A, C, B), tD = ang(A, D, E), tE = ang(A, E, D), tBDE = ang(B, D, E)
  let arcs: Arc[], prompt: string, ans: number, why: string
  if (mode === 0) {
    ans = b; arcs = [{ v: A, a: B, b: C, label: deg(a) }, { v: C, a: A, b: B, label: deg(c) }, { v: D, a: A, b: E, label: '?', red: true }]
    prompt = `Dans le triangle ${A}${B}${C}, ${tA} = ${a}° et ${tC} = ${c}°. ${D} est sur [${A}${B}] et ${E} sur [${A}${C}]. Quelle doit être la mesure de l'angle ${tD} pour que (${D}${E}) et (${B}${C}) soient parallèles (en °) ?`
    why = `Dans le triangle : ${tB} = 180 − ${a} − ${c} = ${b}°. Les angles ${tD} et ${tB} sont correspondants (sécante (${A}${B})) : les droites sont parallèles exactement quand ils sont égaux, donc ${tD} = ${b}°.`
  } else if (mode === 1) {
    ans = c; arcs = [{ v: A, a: B, b: C, label: deg(a) }, { v: B, a: C, b: A, label: deg(b) }, { v: E, a: A, b: D, label: '?', red: true }]
    prompt = `Dans le triangle ${A}${B}${C}, ${tA} = ${a}° et ${tB} = ${b}°. Les points ${D} et ${E} sont sur [${A}${B}] et [${A}${C}]. Pour quelle mesure de ${tE} les droites (${D}${E}) et (${B}${C}) sont-elles parallèles (en °) ?`
    why = `${tC} = 180 − ${a} − ${b} = ${c}°. Les angles ${tE} et ${tC} sont correspondants (sécante (${A}${C})) : (${D}${E}) // (${B}${C}) quand ils sont égaux, soit ${tE} = ${c}°.`
  } else if (mode === 2) {
    ans = c; arcs = [{ v: A, a: B, b: C, label: deg(a) }, { v: D, a: A, b: E, label: deg(b) }, { v: C, a: A, b: B, label: '?', red: true }]
    segs[3] = { a: D, b: E }
    segs.push({ a: E, b: D, mark: 'arrow', color: 'transparent' }, { a: C, b: B, mark: 'arrow', color: 'transparent' })
    prompt = `Dans le triangle ${A}${B}${C}, les droites (${D}${E}) et (${B}${C}) sont parallèles. On sait que ${tA} = ${a}° et ${tD} = ${b}°. Combien mesure l'angle ${tC} (en °) ?`
    why = `Les angles ${tD} et ${tB} sont correspondants et (${D}${E}) // (${B}${C}) : ${tB} = ${b}°. Dans le triangle ${A}${B}${C} : ${tC} = 180 − ${a} − ${b} = ${c}°.`
  } else {
    ans = c; arcs = [{ v: A, a: B, b: C, label: deg(a) }, { v: D, a: B, b: E, label: deg(180 - b) }, { v: C, a: A, b: B, label: '?', red: true }]
    segs.push({ a: E, b: D, mark: 'arrow', color: 'transparent' }, { a: C, b: B, mark: 'arrow', color: 'transparent' })
    prompt = fronton
      ? `Le fronton d'un temple a la forme d'un triangle ABC. Une frise [DE] est posée parallèlement à la base [BC], avec D sur [AB] et E sur [AC]. L'architecte a mesuré ${tA} = ${a}° et ${tBDE} = ${180 - b}°. Combien mesure l'angle ${tC} (en °) ?`
      : `Les droites (${D}${E}) et (${B}${C}) sont parallèles, avec ${D} sur [${A}${B}] et ${E} sur [${A}${C}]. On sait que ${tA} = ${a}° et ${tBDE} = ${180 - b}°. Combien mesure l'angle ${tC} (en °) ?`
    why = `${tD} = 180 − ${180 - b} = ${b}° (angles adjacents supplémentaires). ${tD} et ${tB} sont correspondants et les droites sont parallèles : ${tB} = ${b}°. Enfin ${tC} = 180 − ${a} − ${b} = ${c}°.`
  }
  return fig(numeric(prompt, ans, { explanation: why }), build(raw, { segs, arcs }))
}
const p5TriParallel: Maker = variants(
  () => retry(() => triParallel(0)),
  () => retry(() => triParallel(1)),
  () => retry(() => triParallel(2)),
  () => retry(() => triParallel(3)),
)

/** (xy) // (zt) ; les bissectrices des deux angles intérieurs du même côté se coupent en K : EKF = 90°. */
function twoBisectors(ask: 'K' | 'E' | 'F'): Exercise | null {
  const N = pick(NAMESETS)
  const h = randInt(22, 48), full = 2 * h // angle intérieur en E côté droit (coin se), mesure full ; en F (coin ne) : 180 − full
  const tl = 180 - full
  if (Math.abs(tl - 90) < 10) return null
  const u = polar(1, tl), Hh = 3, E: Pt = [0, 0], F: Pt = [(-Hh * u[0]) / u[1], -Hh]
  // K : intersection des bissectrices issues de E (direction −h) et de F (direction (180 − full)/2)
  const dE = polar(1, -h), dF = polar(1, (180 - full) / 2)
  const det = dE[0] * -dF[1] - dE[1] * -dF[0]
  const s = ((F[0] - E[0]) * -dF[1] - (F[1] - E[1]) * -dF[0]) / det
  const K: Pt = [E[0] + s * dE[0], E[1] + s * dE[1]]
  const xl = Math.min(E[0], F[0]) - 1.2, xr = Math.max(E[0], F[0], K[0]) + 1.2
  const raw: Record<string, Pt> = { E, F, K, X: [xl, 0], Y: [xr, 0], Z: [xl, -Hh], T: [xr, -Hh], U: polar(1.1, tl, E), V: polar(-1.1, tl, F), Ya: [xr - 0.9, 0], Ta: [xr - 0.9, -Hh] }
  const tEy = ang(N.y, N.E, N.v), tFt = ang(N.t, N.F, N.u), tK = ang(N.E, 'K', N.F), tKE = ang('K', N.E, N.F), tKF = ang('K', N.F, N.E)
  const fF = 180 - full
  let prompt: string, ans: number, why: string, arcs: Arc[]
  const base = `${tEy} et ${tFt} sont des angles « internes du même côté » : avec ${L1(N)} // ${L2(N)}, ${tFt} = 180 − ${full} = ${fF}° (son adjacent ${ang(N.z, N.F, N.u)} est alterne-interne avec ${tEy}).`
  if (ask === 'K') {
    ans = 90; arcs = [{ v: 'E', a: 'Y', b: 'F', label: deg(full), r: 24, at: 0.22 }, { v: 'K', a: 'E', b: 'F', label: '?', red: true }]
    prompt = `${L1(N)} // ${L2(N)} et ${tEy} = ${full}°. Les bissectrices des angles ${tEy} et ${tFt} se coupent en K. Combien mesure l'angle ${tK} (en °) ?`
    why = `${base} Les bissectrices donnent ${tKE} = ${h}° et ${tKF} = ${fF / 2}°. Dans le triangle ${N.E}K${N.F} : ${tK} = 180 − ${h} − ${fF / 2} = 90°.`
  } else if (ask === 'F') {
    ans = fF / 2; arcs = [{ v: 'E', a: 'Y', b: 'F', label: deg(full), r: 24, at: 0.22 }, { v: 'F', a: 'E', b: 'K', label: '?', red: true }]
    prompt = `Les droites ${L1(N)} et ${L2(N)} sont parallèles et ${tEy} = ${full}°. La bissectrice de l'angle ${tFt} coupe celle de ${tEy} en K. Combien mesure l'angle ${tKF} (en °) ?`
    why = `${base} La bissectrice le partage en deux : ${tKF} = ${fF} ÷ 2 = ${fF / 2}°.`
  } else {
    ans = h; arcs = [{ v: 'F', a: 'E', b: 'K', label: deg(fF / 2) }, { v: 'E', a: 'K', b: 'F', label: '?', red: true }]
    prompt = `${L1(N)} // ${L2(N)}. Les bissectrices des angles ${tEy} et ${tFt} se coupent en K, et ${tKF} = ${fF / 2}°. Combien mesure l'angle ${tKE} (en °) ?`
    why = `${tFt} = 2 × ${fF / 2} = ${fF}°. Avec les parallèles, ${tEy} = 180 − ${fF} = ${full}° (angles internes du même côté, supplémentaires). Sa bissectrice donne ${tKE} = ${h}°.`
  }
  const figure = build(raw, {
    segs: [{ a: 'X', b: 'Y' }, { a: 'Z', b: 'T' }, { a: 'V', b: 'U' }, { a: 'E', b: 'K' }, { a: 'F', b: 'K' }, { a: 'Ya', b: 'Y', mark: 'arrow', color: 'transparent' }, { a: 'Ta', b: 'T', mark: 'arrow', color: 'transparent' }],
    arcs, hidden: ['X', 'Y', 'Z', 'T', 'U', 'V', 'Ya', 'Ta'], labels: { E: N.E, F: N.F },
    notes: [{ at: raw.X, text: N.x, dx: -9 }, { at: raw.Y, text: N.y, dx: 9 }, { at: raw.Z, text: N.z, dx: -9 }, { at: raw.T, text: N.t, dx: 9 }, { at: polar(1.4, tl, E), text: N.u }, { at: polar(-1.4, tl, F), text: N.v }],
  })
  return fig(numeric(prompt, ans, { explanation: why }), figure)
}
const p5TwoBisectors: Maker = variants(
  () => retry(() => twoBisectors('K')),
  () => retry(() => twoBisectors('F')),
  () => retry(() => twoBisectors('E')),
  () => retry(() => twoBisectors('F')),
)

const p5ZigObtuse: Maker = variants(
  () => {
    const a = randInt(30, 60), b = randInt(30, 60), N = pick(ZIG), [A, M, B] = N
    return fig(numeric(`(d) // (d′). L'angle marqué en ${A} mesure ${180 - a}° et l'angle marqué en ${B} mesure ${b}°. Combien mesure l'angle ${ang(A, M, B)} (en °) ?`, a + b, {
      explanation: `En ${A}, l'angle entre (d) et [${A}${M}] du côté de ${M} mesure 180 − ${180 - a} = ${a}°. La parallèle à (d) passant par ${M} partage ${ang(A, M, B)} en deux angles alternes-internes : ${a}° et ${b}°. Donc ${ang(A, M, B)} = ${a + b}°.`,
    }), zigObtuse(a, b, N, { a: deg(180 - a), b: deg(b), m: '?' }, true, false))
  },
  () => {
    const a = randInt(30, 60), b = randInt(30, 60), N = pick(ZIG), [A, M, B] = N
    return fig(numeric(`(d) // (d′). Les angles marqués en ${A} et en ${B} mesurent ${180 - a}° et ${180 - b}°. Combien mesure l'angle ${ang(A, M, B)} (en °) ?`, a + b, {
      explanation: `Angles supplémentaires : en ${A}, 180 − ${180 - a} = ${a}° ; en ${B}, 180 − ${180 - b} = ${b}° (du côté de ${M}). Par ${M}, la parallèle aux deux droites partage ${ang(A, M, B)} en angles alternes-internes : ${a} + ${b} = ${a + b}°.`,
    }), zigObtuse(a, b, N, { a: deg(180 - a), b: deg(180 - b), m: '?' }, true, true))
  },
  () => {
    const a = randInt(30, 60), b = randInt(30, 60), N = pick(ZIG), [A, M, B] = N
    return fig(numeric(`(d) // (d′). L'angle ${ang(A, M, B)} mesure ${a + b}° et l'angle marqué en ${B} mesure ${180 - b}°. Combien mesure l'angle marqué « ? » en ${A} (en °) ?`, 180 - a, {
      explanation: `En ${B}, l'angle du côté de ${M} mesure 180 − ${180 - b} = ${b}°. Par ${M}, la parallèle partage ${ang(A, M, B)} : la part du côté de ${A} mesure ${a + b} − ${b} = ${a}°, égale (alternes-internes) à l'angle en ${A} du côté de ${M}. L'angle « ? » est son supplémentaire : 180 − ${a} = ${180 - a}°.`,
    }), zigObtuse(a, b, N, { a: '?', b: deg(180 - b), m: deg(a + b) }, true, true))
  },
  () => {
    const a = randInt(30, 60), b = randInt(30, 60), N = pick(ZIG), [A, M, B] = N
    return fig(numeric(`(d) // (d′). L'angle marqué en ${A} mesure ${180 - a}° et ${ang(A, M, B)} = ${a + b}°. Combien mesure l'angle marqué « ? » en ${B} (en °) ?`, b, {
      explanation: `En ${A}, l'angle du côté de ${M} mesure 180 − ${180 - a} = ${a}°. La parallèle à (d) passant par ${M} partage ${ang(A, M, B)} en ${a}° et « ? » (alternes-internes) : « ? » = ${a + b} − ${a} = ${b}°.`,
    }), zigObtuse(a, b, N, { a: deg(180 - a), b: '?', m: deg(a + b) }, true, false))
  },
)
/** Ligne brisée A–M–B entre (d) et (d′), angles éventuellement marqués du côté obtus (extérieur). */
function zigObtuse(a: number, b: number, N: [string, string, string], lab: { a: string; b: string; m: string }, obtA: boolean, obtB: boolean) {
  const [A, M, B] = N
  const yM = randInt(10, 16) / 10
  const pA: Pt = [0, 3], pM: Pt = [(3 - yM) / Math.tan(rad(a)), yM], pB: Pt = [pM[0] - yM / Math.tan(rad(b)), 0]
  const xl = Math.min(0, pB[0]) - 1.6, xr = pM[0] + 1.4
  const L = hLines([3, 0], xl, xr, xr - 0.6, ['(d)', '(d′)'], 'l')
  const col = (s: string) => (s === '?' ? RED : undefined)
  return build({ [A]: pA, [M]: pM, [B]: pB, ...L.raw }, {
    segs: [...L.segs, { a: A, b: M }, { a: M, b: B }],
    arcs: [
      { v: A, a: obtA ? '_l0' : '_r0', b: M, label: lab.a, color: col(lab.a) },
      { v: B, a: obtB ? '_l1' : '_r1', b: M, label: lab.b, color: col(lab.b) },
      { v: M, a: A, b: B, label: lab.m, color: col(lab.m) },
    ],
    hidden: L.hidden, notes: L.notes,
  })
}

// ═══ Problèmes d'amélioration ═══════════════════════════════════════════
/** Trois parallèles coupées par une même sécante. */
function threeParallels(): Exercise {
  const v = niceAngle(40, 140), tl = v
  const u = polar(1, tl), ys = [0, -2, -4]
  const pts = ys.map((y): Pt => [(y * u[0]) / u[1], y])
  const xl = Math.min(...pts.map((p) => p[0])) - 2, xr = Math.max(...pts.map((p) => p[0])) + 2
  const names = ['E', 'F', 'G']
  const raw: Record<string, Pt> = { U: polar(1.2, tl, pts[0]), V: polar(-1.2, tl, pts[2]) }
  const hidden = ['U', 'V']
  const segs: FigSegment[] = [{ a: 'V', b: 'U' }]
  pts.forEach((p, i) => {
    const n = names[i]
    raw[n] = p; raw[`${n}l`] = [xl, p[1]]; raw[`${n}r`] = [xr, p[1]]
    raw[`${n}e`] = [p[0] + 0.6, p[1]]; raw[`${n}w`] = [p[0] - 0.6, p[1]]; raw[`${n}u`] = polar(0.6, tl, p); raw[`${n}d`] = polar(-0.6, tl, p)
    hidden.push(`${n}l`, `${n}r`, `${n}e`, `${n}w`, `${n}u`, `${n}d`)
    raw[`${n}a`] = [xr - 1, p[1]]; hidden.push(`${n}a`)
    segs.push({ a: `${n}l`, b: `${n}r` }, { a: `${n}a`, b: `${n}r`, mark: 'arrow', color: 'transparent' })
  })
  const kc = pick(CORNERS), qc = Math.random() < 0.75 ? pick(CORNERS.filter((c) => c !== kc && c !== OPP[kc])) : OPP[kc]
  const kv = secVal(tl, 0, { at: 'E', c: kc }), qv = secVal(tl, 0, { at: 'E', c: qc })
  const arc = (P: string, c: Corner, label: string, red?: boolean): Arc => ({ v: P, a: c.endsWith('e') ? `${P}e` : `${P}w`, b: c.startsWith('n') ? `${P}u` : `${P}d`, label, red, r: 20 })
  const figure = build(raw, {
    segs, hidden, arcs: [arc('E', kc, deg(kv)), arc('G', qc, '?', true)],
    notes: pts.map((p, i) => ({ at: [xl, p[1]] as Pt, text: `(d${['₁', '₂', '₃'][i]})`, dx: 16, dy: -12 })),
  })
  const rel = qv === kv ? `est opposé par le sommet à celui-ci : il mesure ${kv}°` : `lui est adjacent supplémentaire : 180 − ${kv} = ${qv}°`
  return withMeta(numeric(`Les droites (d₁), (d₂) et (d₃) sont parallèles et coupées par une même sécante en E, F et G. L'angle marqué en E mesure ${kv}°. Combien mesure l'angle marqué « ? » en G (en °) ?`, qv, {
    explanation: `(d₁) // (d₂) // (d₃) : en passant de E à F puis de F à G par des angles correspondants, on retrouve en G un angle de ${kv}° placé au même endroit qu'en E. L'angle « ? » ${rel}.`,
  }), { title: 'Les trois parallèles', figure })
}
const up1: Maker[] = [
  threeParallels,
  () => withMeta(linkedParallel(pick(['mult', 'diff'])), { title: 'Les angles liés' }),
  () => {
    const a = randInt(28, 62), b = randInt(28, 62), N = pick(ZIG), [A, M, B] = N
    const obt = Math.random() < 0.5
    return withMeta(numeric(`Les droites (d) et (d′) sont parallèles. Les angles marqués en ${A} et en ${B} mesurent ${obt ? 180 - a : a}° et ${b}°. Combien mesure l'angle ${ang(A, M, B)} (en °) ?`, a + b, {
      explanation: `${obt ? `Du côté de ${M}, l'angle en ${A} mesure 180 − ${180 - a} = ${a}°. ` : ''}La parallèle à (d) passant par ${M} partage ${ang(A, M, B)} en deux angles alternes-internes avec ceux de ${A} et de ${B} : ${a} + ${b} = ${a + b}°.`,
    }), { title: 'Le zigzag', figure: zigObtuse(a, b, N, { a: deg(obt ? 180 - a : a), b: deg(b), m: '?' }, obt, false) })
  },
]
const up2: Maker[] = [
  () => {
    const p = randInt(35, 75), N = pick(TRI_NAMES), [A, B, C] = N, S = stripTriangle(p, p, N), q = randInt(0, 1)
    const arcs: Arc[] = [{ v: A, a: '_l0', b: B, label: deg(p) }, q === 0 ? { v: A, a: B, b: C, label: '?', red: true, r: 30 } : { v: A, a: '_r0', b: C, label: '?', red: true }]
    return titled('Le triangle isocèle entre deux parallèles', numeric(`Les droites (d) et (d′) sont parallèles. Le triangle ${A}${B}${C} est isocèle en ${A}, avec ${A} sur (d), ${B} et ${C} sur (d′). L'angle entre (d) et [${A}${B}] marqué sur la figure mesure ${p}°. Combien mesure ${q === 0 ? `l'angle ${ang(B, A, C)}` : `l'angle marqué « ? » entre (d) et [${A}${C}]`} (en °) ?`, q === 0 ? 180 - 2 * p : p, {
      explanation: `Alternes-internes (sécante (${A}${B}), (d) // (d′)) : ${ang(A, B, C)} = ${p}°. Le triangle est isocèle en ${A} : ${ang(A, C, B)} = ${p}°. ${q === 0 ? `Donc ${ang(B, A, C)} = 180 − 2 × ${p} = ${180 - 2 * p}°.` : `L'angle « ? » et ${ang(A, C, B)} sont alternes-internes (sécante (${A}${C})) : « ? » = ${p}°.`}`,
    }), build(S.raw, { segs: [...S.segs, { a: A, b: B, mark: 'tick' }, { a: A, b: C, mark: 'tick' }], arcs, hidden: S.hidden, notes: S.notes }))
  },
  () => withMeta(retry(() => bisectorParallel(pick(['G', 'F', 'E2'] as const))), { title: 'La bissectrice et les parallèles' }),
  () => retry(() => {
    const a = randInt(40, 80), b = randInt(40, 75), c = 180 - a - b
    if (c < 35 || a === b || b === c) return null
    const yes = Math.random() < 0.5, dv = yes ? b : b + pick([-1, 1]) * randInt(2, 6)
    const [A, B, C, D, E] = ['A', 'B', 'C', 'D', 'E']
    const ab = (6 * Math.sin(rad(c))) / Math.sin(rad(a)), PA = polar(ab, b), k = 0.5
    const Dp: Pt = [PA[0] * (1 - k), PA[1] * (1 - k)], phi = b - dv
    const raw: Record<string, Pt> = { A: PA, B: [0, 0], C: [6, 0], D: Dp, E: inter(Dp, polar(1, phi, Dp), PA, [6, 0]) }
    const figure = build(raw, { segs: [{ a: A, b: B }, { a: B, b: C }, { a: C, b: A }, { a: D, b: E }], arcs: [{ v: A, a: B, b: C, label: deg(a) }, { v: C, a: A, b: B, label: deg(c) }, { v: D, a: A, b: E, label: deg(dv), color: BLUE }] })
    return withMeta(choice(`Dans le triangle ABC, ${ang(B, A, C)} = ${a}° et ${ang(A, C, B)} = ${c}°. ${D} est sur [AB], ${E} sur [AC], et ${ang(A, D, E)} = ${dv}°. Les droites (DE) et (BC) sont-elles parallèles ?`, yes ? YES : NO, [YES, NO],
      `${ang(A, B, C)} = 180 − ${a} − ${c} = ${b}°. Les angles ${ang(A, D, E)} et ${ang(A, B, C)} sont correspondants (sécante (AB)) : ${yes ? `ils sont égaux (${b}°), donc (DE) // (BC).` : `${dv}° ≠ ${b}°, donc (DE) et (BC) ne sont pas parallèles.`}`), { title: 'Parallèles ou pas ?', figure })
  }),
]
/** Point M hors de la bande : AMB = b − a. */
function chevronOut(): Exercise | null {
  const a = randInt(20, 50), b = randInt(a + 25, 125)
  if (Math.abs(b - 90) < 8) return null
  const A: Pt = [0, 2.4], s = randInt(30, 40) / 10, M = polar(s, a, A)
  const r = M[1] / Math.sin(rad(b)), B: Pt = [M[0] - r * Math.cos(rad(b)), 0]
  const P: Pt = [M[0] - (M[1] - 2.4) / Math.tan(rad(b)), 2.4]
  const xl = Math.min(0, B[0]) - 1.5, xr = Math.max(M[0], P[0], B[0]) + 1.3
  const L = hLines([2.4, 0], xl, xr, xl + 0.6, ['(d)', '(d′)'], 'r')
  const q = randInt(0, 2)
  const lab = [[deg(a), deg(b), '?'], [deg(a), '?', deg(b - a)], ['?', deg(b), deg(b - a)]][q]
  const col = (x: string) => (x === '?' ? RED : undefined)
  const figure = build({ A, M, B, P, ...L.raw }, {
    segs: [...L.segs, { a: 'A', b: 'M' }, { a: 'B', b: 'M' }],
    arcs: [{ v: 'A', a: '_r0', b: 'M', label: lab[0], color: col(lab[0]) }, { v: 'B', a: '_r1', b: 'M', label: lab[1], color: col(lab[1]) }, { v: 'M', a: 'A', b: 'B', label: lab[2], color: col(lab[2]), r: 30 }],
    hidden: L.hidden, notes: L.notes,
  })
  const ans = [b - a, b, a][q]
  const given = [`les angles marqués en A et en B mesurent ${a}° et ${b}°`, `l'angle marqué en A mesure ${a}° et ${ang('A', 'M', 'B')} = ${b - a}°`, `l'angle marqué en B mesure ${b}° et ${ang('A', 'M', 'B')} = ${b - a}°`][q]
  const asked = [`l'angle ${ang('A', 'M', 'B')}`, `l'angle marqué « ? » en B`, `l'angle marqué « ? » en A`][q]
  return withMeta(numeric(`Les droites (d) et (d′) sont parallèles et le point M est au-dessus de (d). La droite (BM) coupe (d) en P. On sait que ${given}. Combien mesure ${asked} (en °) ?`, ans, {
    explanation: `Les angles en P (entre (d) et [PM)) et en B sont correspondants : l'angle en P mesure b = ${b}°, donc ${ang('A', 'P', 'M')} = 180 − ${b} = ${180 - b}°. Dans le triangle APM : ${ang('A', 'M', 'P')} = 180 − ${a} − ${180 - b} = ${b} − ${a} = ${b - a}°. La relation est donc ${ang('A', 'M', 'B')} = (angle en B) − (angle en A) : ici ${asked} mesure ${ans}°.`,
  }), { title: 'Le chevron hors de la bande', figure })
}
/** Triangle ABC, (CE) // (AB), angle extérieur en C. */
function exteriorParallel(): Exercise | null {
  const a = randInt(40, 75), b = randInt(40, 75), c = 180 - a - b
  if (c < 30 || a === b) return null
  const ab = 6, ac = (ab * Math.sin(rad(b))) / Math.sin(rad(a + b))
  const A: Pt = [0, 0], B: Pt = [ab, 0], C = polar(ac, a)
  const dirBC = [C[0] - B[0], C[1] - B[1]], l = Math.hypot(dirBC[0], dirBC[1])
  const D: Pt = [C[0] + (dirBC[0] / l) * 2.8, C[1] + (dirBC[1] / l) * 2.8], E: Pt = [C[0] - 3.2, C[1]]
  const raw: Record<string, Pt> = { A, B, C, D, E, E2: [E[0] + 1, E[1]] }
  const q = randInt(0, 1)
  const figure = build(raw, {
    hidden: ['E2'],
    segs: [{ a: 'A', b: 'B' }, { a: 'B', b: 'C' }, { a: 'C', b: 'A' }, { a: 'C', b: 'D', dashed: true }, { a: 'C', b: 'E' }, { a: 'B', b: 'A', mark: 'arrow', color: 'transparent' }, { a: 'E2', b: 'E', mark: 'arrow', color: 'transparent' }],
    arcs: q === 0
      ? [{ v: 'A', a: 'B', b: 'C', label: deg(a) }, { v: 'C', a: 'E', b: 'D', label: deg(b), r: 24 }, { v: 'C', a: 'A', b: 'B', label: '?', red: true }]
      : [{ v: 'A', a: 'B', b: 'C', label: deg(a) }, { v: 'B', a: 'C', b: 'A', label: deg(b) }, { v: 'C', a: 'A', b: 'D', label: '?', red: true, r: 18 }],
  })
  return withMeta(numeric(q === 0
    ? `Dans le triangle ABC, ${ang('B', 'A', 'C')} = ${a}°. On prolonge [BC] au-delà de C jusqu'en D et on trace la demi-droite [CE) parallèle à (AB). L'angle ${ang('E', 'C', 'D')} mesure ${b}°. Combien mesure l'angle ${ang('A', 'C', 'B')} (en °) ?`
    : `Dans le triangle ABC, ${ang('B', 'A', 'C')} = ${a}° et ${ang('A', 'B', 'C')} = ${b}°. On prolonge [BC] au-delà de C jusqu'en D, et on trace [CE) parallèle à (AB). En utilisant [CE), calcule l'angle extérieur ${ang('A', 'C', 'D')} (en °).`, q === 0 ? c : a + b, {
    explanation: q === 0
      ? `(CE) // (AB) coupées par (AC) : ${ang('A', 'C', 'E')} et ${ang('B', 'A', 'C')} sont alternes-internes, donc ${ang('A', 'C', 'E')} = ${a}°. Les angles ${ang('A', 'C', 'B')}, ${ang('A', 'C', 'E')} et ${ang('E', 'C', 'D')} forment un angle plat : ${ang('A', 'C', 'B')} = 180 − ${a} − ${b} = ${c}°.`
      : `${ang('A', 'C', 'E')} = ${ang('B', 'A', 'C')} = ${a}° (alternes-internes, sécante (AC)) et ${ang('E', 'C', 'D')} = ${ang('A', 'B', 'C')} = ${b}° (correspondants, sécante (BD)). Donc ${ang('A', 'C', 'D')} = ${a} + ${b} = ${a + b}°.`,
  }), { title: 'L’angle extérieur', figure })
}
const up3: Maker[] = [
  () => retry(chevronOut),
  () => retry(exteriorParallel),
  () => withMeta(retry(() => twoBisectors(pick(['K', 'F', 'E'] as const))), { title: 'Les deux bissectrices' }),
]

// ═══ Problèmes de l'hôtel de ville ══════════════════════════════════════
/** Voie ferrée : deux rails parallèles et une route. */
function railway(): Exercise {
  const N: Names = { x: 'x', y: 'y', z: 'z', t: 't', u: 'u', v: 'v', E: 'E', F: 'F' }
  const kAt = pick(['E', 'F'] as const), k: Spot = { at: kAt, c: pick(CORNERS) }
  let q: Spot = { at: other(kAt), c: pick(CORNERS) }
  while (relation(k, q) === 'correspondants' || relation(k, q) === 'alternes-internes') q = { at: other(kAt), c: pick(CORNERS) }
  const v = niceAngle(40, 140), tl = tiltFor(k.c, v)
  const { ans, why } = chain(N, k, q, v)
  const ctx = pick([
    ['La voie ferrée', 'Les deux rails (xy) et (zt) d’une voie ferrée sont parallèles. Une route droite (uv) les traverse en E et F'],
    ['Le canal', 'Les berges (xy) et (zt) d’un canal sont parallèles. Un pont droit (uv) les relie en E et F'],
    ['Le passage piéton', 'Les bords (xy) et (zt) d’une avenue sont parallèles. Un passage piéton oblique (uv) la traverse de E à F'],
  ])
  return titled(ctx[0], numeric(`${ctx[1]}. Le géomètre a mesuré l'angle ${cname(N, k)} : ${v}°. Quelle est la mesure de l'angle ${cname(N, q)} ?`, ans, { explanation: why }),
    secFig({ tl, N, marks: true, arcs: [{ ...k, label: deg(v) }, { ...q, label: '?', red: true }] }))
}
/** Rayons du soleil parallèles : angle du rayon avec un mât vertical. */
function sunRays(): Exercise {
  const a = randInt(32, 62), ta = Math.tan(rad(a))
  const A: Pt = [0, 0], B: Pt = [0, 2.6], G: Pt = [2.6 / ta, 0], C: Pt = [G[0] + 1.5, 0], D: Pt = [C[0], 1.6], H: Pt = [C[0] + 1.6 / ta, 0]
  const raw: Record<string, Pt> = { A, B, G, C, D, H, U1: [-0.8, 2.6 + 0.8 * ta], U2: [C[0] - 0.8, 1.6 + 0.8 * ta], W: [-0.8, 0], X: [H[0] + 0.8, 0] }
  const q = randInt(0, 1)
  const figure = build(raw, {
    segs: [{ a: 'W', b: 'X' }, { a: 'A', b: 'B' }, { a: 'C', b: 'D' }, { a: 'U1', b: 'G' }, { a: 'U2', b: 'H' }, { a: 'U1', b: 'B', mark: 'arrow', color: 'transparent' }, { a: 'U2', b: 'D', mark: 'arrow', color: 'transparent' }],
    arcs: [{ v: 'G', a: 'A', b: 'B', label: deg(a), r: 26 }, q === 0 ? { v: 'D', a: 'C', b: 'H', label: '?', red: true } : { v: 'H', a: 'X', b: 'D', label: '?', red: true }, { v: 'A', a: 'G', b: 'B', right: true }, { v: 'C', a: 'H', b: 'D', right: true }],
    hidden: ['U1', 'U2', 'W', 'X'],
  })
  return titled('Les rayons du soleil', numeric(q === 0
    ? `Les rayons du soleil sont parallèles. Le rayon qui frôle le sommet B d'une tour verticale [AB] touche le sol en G en faisant avec lui un angle de ${a}°. Un autre rayon frôle le sommet D d'un mât vertical [CD] et touche le sol en H. Quel angle ${ang('C', 'D', 'H')} ce rayon fait-il avec le mât (en °) ?`
    : `Les rayons du soleil sont parallèles. Un rayon frôle le sommet B de la tour [AB] et touche le sol horizontal en G en faisant un angle de ${a}° avec lui. Un autre rayon frôle le sommet D du mât [CD] et touche le sol en H. Combien mesure l'angle obtus entre ce rayon et le sol, en H, du côté opposé au mât (en °) ?`, q === 0 ? 90 - a : 180 - a, {
    explanation: q === 0
      ? `Les rayons (BG) et (DH) sont parallèles et coupés par le sol : les angles en G et en H sont correspondants, donc ${ang('D', 'H', 'C')} = ${a}°. Le triangle CDH est rectangle en C : ${ang('C', 'D', 'H')} = 90 − ${a} = ${90 - a}°.`
      : `Les angles en G et en H sont correspondants (rayons parallèles, sécante : le sol) : ${ang('D', 'H', 'C')} = ${a}°. L'angle cherché lui est adjacent supplémentaire : 180 − ${a} = ${180 - a}°.`,
  }), figure)
}
/** Portail : deux barres horizontales parallèles et une écharpe oblique. */
function gate(): Exercise {
  const a = randInt(30, 60), w = 5, h = w * Math.tan(rad(a))
  const H = Math.min(h, 3.2), W = H / Math.tan(rad(a))
  const raw: Record<string, Pt> = { A: [0, 0], B: [W, 0], C: [W, H], D: [0, H] }
  const q = randInt(0, 2)
  const asks = [
    { arc: { v: 'C', a: 'A', b: 'D', label: '?', red: true }, ans: a, text: `l'angle ${ang('A', 'C', 'D')} entre l'écharpe et la barre du haut` },
    { arc: { v: 'C', a: 'A', b: 'B', label: '?', red: true }, ans: 90 - a, text: `l'angle ${ang('A', 'C', 'B')} entre l'écharpe et le montant vertical` },
    { arc: { v: 'A', a: 'C', b: 'D', label: '?', red: true }, ans: 90 - a, text: `l'angle ${ang('C', 'A', 'D')} entre l'écharpe et le montant vertical de gauche` },
  ][q]
  const figure = build(raw, {
    segs: [{ a: 'A', b: 'B' }, { a: 'B', b: 'C' }, { a: 'C', b: 'D' }, { a: 'D', b: 'A' }, { a: 'A', b: 'C' }, { a: 'A', b: 'B', mark: 'arrow', color: 'transparent' }, { a: 'D', b: 'C', mark: 'arrow', color: 'transparent' }],
    arcs: [{ v: 'A', a: 'B', b: 'C', label: deg(a), r: 30 }, asks.arc as Arc, { v: 'B', a: 'C', b: 'A', right: true }, { v: 'D', a: 'A', b: 'C', right: true }],
  })
  return titled('Le portail', numeric(`Un portail rectangulaire ABCD a deux barres horizontales parallèles [AB] et [DC], et une écharpe en bois [AC] qui le rigidifie. L'écharpe fait un angle de ${a}° avec la barre du bas. Combien mesure ${asks.text} (en °) ?`, asks.ans, {
    explanation: q === 0
      ? `(AB) // (DC) coupées par (AC) : ${ang('B', 'A', 'C')} et ${ang('A', 'C', 'D')} sont alternes-internes, donc égaux : ${a}°.`
      : q === 1
        ? `${ang('A', 'C', 'D')} = ${a}° (alternes-internes avec ${ang('B', 'A', 'C')}, car (AB) // (DC)). L'angle en C du rectangle est droit : ${ang('A', 'C', 'B')} = 90 − ${a} = ${90 - a}°.`
        : `L'angle ${ang('D', 'A', 'B')} est droit : ${ang('C', 'A', 'D')} = 90 − ${a} = ${90 - a}° (angles complémentaires).`,
  }), figure)
}
/** Lampe d'architecte : socle et tête parallèles, coude M entre les deux. */
function lamp(): Exercise {
  const a = randInt(30, 60), b = randInt(30, 60), N: [string, string, string] = ['A', 'M', 'B']
  const q = randInt(0, 1)
  const figure = zigFigure(a, b, q === 0 ? { a: deg(a), b: deg(b), m: '?' } : { a: deg(a), b: '?', m: deg(a + b) }, N)
  return titled('La lampe d’architecte', numeric(q === 0
    ? `Une lampe d'architecte a sa tête (d) parallèle à son socle (d′). Le bras [AM] fait un angle de ${a}° avec la tête, le bras [MB] un angle de ${b}° avec le socle (voir la figure). Quel est l'angle ${ang('A', 'M', 'B')} au coude ?`
    : `Une lampe d'architecte a sa tête (d) parallèle à son socle (d′). Le bras [AM] fait un angle de ${a}° avec la tête et l'angle au coude ${ang('A', 'M', 'B')} mesure ${a + b}°. Quel angle le bras [MB] fait-il avec le socle ?`, q === 0 ? a + b : b, {
    explanation: `Par le coude M, on trace la parallèle à la tête et au socle. Elle partage ${ang('A', 'M', 'B')} en deux angles alternes-internes avec les angles en A et en B : ${ang('A', 'M', 'B')} = ${a} + ${b} = ${a + b}°.${q === 1 ? ` Donc l'angle en B mesure ${a + b} − ${a} = ${b}°.` : ''}`,
  }), figure)
}
/** Toit triangulaire isocèle et poutre horizontale parallèle à la base. */
function roofBeam(): Exercise {
  const apex = 2 * randInt(20, 50), base = (180 - apex) / 2, q = randInt(0, 2)
  const B: Pt = [0, 0], C: Pt = [6, 0], A: Pt = [3, 3 * Math.tan(rad(base))], k = 0.55
  const D: Pt = [A[0] + (B[0] - A[0]) * k, A[1] + (B[1] - A[1]) * k], E: Pt = [A[0] + (C[0] - A[0]) * k, A[1] + (C[1] - A[1]) * k]
  const asks = [
    { arc: { v: 'D', a: 'A', b: 'E', label: '?', red: true }, ans: base, t: ang('A', 'D', 'E') },
    { arc: { v: 'D', a: 'B', b: 'E', label: '?', red: true }, ans: 180 - base, t: ang('B', 'D', 'E') },
    { arc: { v: 'E', a: 'C', b: 'D', label: '?', red: true }, ans: 180 - base, t: ang('C', 'E', 'D') },
  ][q]
  const figure = build({ A, B, C, D, E }, {
    segs: [{ a: 'A', b: 'B', mark: 'tick' }, { a: 'A', b: 'C', mark: 'tick' }, { a: 'B', b: 'C' }, { a: 'D', b: 'E' }, { a: 'E', b: 'D', mark: 'arrow', color: 'transparent' }, { a: 'C', b: 'B', mark: 'arrow', color: 'transparent' }],
    arcs: [{ v: 'A', a: 'B', b: 'C', label: deg(apex) }, asks.arc as Arc],
  })
  return titled('La poutre du toit', numeric(`La charpente d'un toit forme un triangle ABC isocèle en A, dont l'angle au sommet ${ang('B', 'A', 'C')} mesure ${apex}°. Une poutre horizontale [DE], parallèle à [BC], relie les deux pentes. Combien mesure l'angle ${asks.t} (en °) ?`, asks.ans, {
    explanation: `Le triangle est isocèle en A : ${ang('A', 'B', 'C')} = ${ang('A', 'C', 'B')} = (180 − ${apex}) ÷ 2 = ${base}°. (DE) // (BC) : ${ang('A', 'D', 'E')} et ${ang('A', 'B', 'C')} sont correspondants, donc ${ang('A', 'D', 'E')} = ${base}° (de même ${ang('A', 'E', 'D')} = ${base}°).${q > 0 ? ` L'angle ${asks.t} est adjacent supplémentaire : 180 − ${base} = ${180 - base}°.` : ''}`,
  }), figure)
}
/** Billard : bandes parallèles, angle d'incidence = angle de réflexion. */
function billiard(): Exercise {
  const a = randInt(28, 62), H = 2.6, dx = H / Math.tan(rad(a))
  const P0: Pt = [0, H], P1: Pt = [dx, 0], P2: Pt = [2 * dx, H], P3: Pt = [2.6 * dx, H - 0.6 * H]
  const xl = -0.8, xr = 2.6 * dx + 0.6
  const L = hLines([H, 0], xl, xr, xr - 0.5)
  const q = randInt(0, 1)
  const figure = build({ A: P0, B: P1, C: P2, D: P3, ...L.raw }, {
    segs: [...L.segs, { a: 'A', b: 'B' }, { a: 'B', b: 'C' }, { a: 'C', b: 'D', dashed: true }],
    arcs: [{ v: 'B', a: '_l1', b: 'A', label: deg(a) }, q === 0 ? { v: 'B', a: 'A', b: 'C', label: '?', red: true, r: 26 } : { v: 'C', a: 'B', b: 'D', label: '?', red: true, r: 26 }],
    hidden: L.hidden,
  })
  return titled('Le billard', numeric(q === 0
    ? `Sur un billard, les bandes du haut et du bas sont parallèles. La bille part de A, rebondit en B sur la bande du bas : elle repart en faisant avec la bande le même angle qu'à l'arrivée, ${a}°. Quel angle ${ang('A', 'B', 'C')} forme sa trajectoire en B ?`
    : `Sur un billard aux bandes parallèles, une bille rebondit en B sur la bande du bas (angle d'arrivée ${a}°, égal à l'angle de départ), puis en C sur la bande du haut, toujours avec des angles égaux à l'arrivée et au départ. Quel angle ${ang('B', 'C', 'D')} forme sa trajectoire en C ?`, 180 - 2 * a, {
    explanation: q === 0
      ? `En B, les trois angles le long de la bande forment un angle plat : ${a}° (arrivée), ${ang('A', 'B', 'C')} et ${a}° (départ). ${ang('A', 'B', 'C')} = 180 − 2 × ${a} = ${180 - 2 * a}°.`
      : `Les bandes sont parallèles, coupées par (BC) : l'angle d'arrivée en C est alterne-interne avec l'angle de départ en B, il mesure ${a}°. Le départ en C mesure aussi ${a}°, donc ${ang('B', 'C', 'D')} = 180 − 2 × ${a} = ${180 - 2 * a}°.`,
  }), figure)
}
/** Tuyau à deux coudes entre deux murs parallèles : AMN = a + p, MNB = p + b. */
function doubleElbow(): Exercise | null {
  const a = randInt(30, 60), p = randInt(25, 55), b = randInt(30, 60)
  const A: Pt = [0, 3], M: Pt = [1 / Math.tan(rad(a)), 2], N: Pt = [M[0] - 1 / Math.tan(rad(p)), 1], B: Pt = [N[0] + 1 / Math.tan(rad(b)), 0]
  const xs = [A[0], M[0], N[0], B[0]], xl = Math.min(...xs) - 1, xr = Math.max(...xs) + 1
  if (xr - xl > 6) return null
  const L = hLines([3, 0], xl, xr, xl + 0.5, ['(d)', '(d′)'], 'r')
  const q = randInt(0, 1)
  const m = a + p, n = p + b
  const figure = build({ A, M, N, B, ...L.raw }, {
    segs: [...L.segs, { a: 'A', b: 'M' }, { a: 'M', b: 'N' }, { a: 'N', b: 'B' }],
    arcs: q === 0
      ? [{ v: 'A', a: '_r0', b: 'M', label: deg(a) }, { v: 'M', a: 'A', b: 'N', label: deg(m) }, { v: 'B', a: '_l1', b: 'N', label: deg(b) }, { v: 'N', a: 'M', b: 'B', label: '?', red: true }]
      : [{ v: 'A', a: '_r0', b: 'M', label: deg(a) }, { v: 'M', a: 'A', b: 'N', label: deg(m) }, { v: 'N', a: 'M', b: 'B', label: deg(n) }, { v: 'B', a: '_l1', b: 'N', label: '?', red: true }],
    hidden: L.hidden, notes: L.notes,
  })
  return titled('Le tuyau à deux coudes', numeric(q === 0
    ? `Un tuyau va du mur (d) au mur (d′), parallèles, en passant par deux coudes M et N (voir la figure). Il part de A avec un angle de ${a}°, le coude M mesure ${m}° et le tuyau arrive en B avec un angle de ${b}°. Combien mesure l'angle ${ang('M', 'N', 'B')} du coude N ?`
    : `Un tuyau relie deux murs parallèles (d) et (d′) en passant par deux coudes M et N. Il part de A avec un angle de ${a}° ; les coudes mesurent ${ang('A', 'M', 'N')} = ${m}° et ${ang('M', 'N', 'B')} = ${n}°. Quel angle fait-il avec le mur (d′) en arrivant en B ?`, q === 0 ? n : b, {
    explanation: `Traçons par M et par N des parallèles aux murs. En M, la parallèle partage ${ang('A', 'M', 'N')} en ${a}° (alterne-interne avec l'angle en A) et ${m} − ${a} = ${p}°. En N, l'angle entre [NM] et la parallèle vaut aussi ${p}° (alternes-internes), et l'autre partie de ${ang('M', 'N', 'B')} est alterne-interne avec l'angle en B. ${q === 0 ? `Donc ${ang('M', 'N', 'B')} = ${p} + ${b} = ${n}°.` : `Donc l'angle en B mesure ${n} − ${p} = ${b}°.`}`,
  }), figure)
}
/** Treillis d'un pont : deux poutres parallèles et des diagonales en zigzag. */
function truss(): Exercise | null {
  const a = randInt(45, 70), c = randInt(45, 75), g = randInt(40, 70), d = 180 - a - c, x = a + c - g
  if (d < 35 || x < 35 || x > 95) return null
  const h = 2.4, A1: Pt = [0, 0], B1: Pt = [h / Math.tan(rad(a)), h], A2: Pt = [B1[0] + h / Math.tan(rad(d)), 0], B2: Pt = [A2[0] + h / Math.tan(rad(g)), h], A3: Pt = [B2[0] + h / Math.tan(rad(60)), 0]
  const L = hLines([h, 0], -0.6, A3[0] + 1.2, A3[0] + 0.65)
  const figure = build({ A: A1, B: B1, C: A2, D: B2, E: A3, ...L.raw }, {
    segs: [...L.segs, { a: 'A', b: 'B' }, { a: 'B', b: 'C' }, { a: 'C', b: 'D' }, { a: 'D', b: 'E' }],
    arcs: [{ v: 'A', a: 'C', b: 'B', label: deg(a) }, { v: 'B', a: 'A', b: 'C', label: deg(c) }, { v: 'D', a: 'B', b: 'C', label: deg(g) }, { v: 'C', a: 'B', b: 'D', label: '?', red: true }],
    hidden: L.hidden,
  })
  return titled('Le treillis du pont', numeric(`Le tablier d'un pont est formé de deux poutres parallèles : (AC) en bas et (BD) en haut, reliées par des diagonales [AB], [BC], [CD] et [DE] (voir la figure). On a mesuré ${ang('B', 'A', 'C')} = ${a}°, ${ang('A', 'B', 'C')} = ${c}° et ${ang('B', 'D', 'C')} = ${g}°. Combien mesure l'angle ${ang('B', 'C', 'D')} entre les deux diagonales qui partent de C ?`, x, {
    explanation: `Dans le triangle ABC : ${ang('A', 'C', 'B')} = 180 − ${a} − ${c} = ${d}°. Les poutres sont parallèles et coupées par (CD) : ${ang('B', 'D', 'C')} et ${ang('D', 'C', 'E')} sont alternes-internes, donc ${ang('D', 'C', 'E')} = ${g}°. En C, les trois angles forment un angle plat : ${ang('B', 'C', 'D')} = 180 − ${d} − ${g} = ${x}°.`,
  }), figure)
}
const age1: Maker[] = [railway, sunRays, gate]
const age2: Maker[] = [lamp, roofBeam, billiard]
const age3: Maker[] = [
  () => retry(doubleElbow),
  () => retry(truss),
  () => withMeta(retry(() => triParallel(3, true)), { title: 'La frise du fronton' }),
]

export const CONTENT: SubjectContent | null = {
  tiers: [
    [p1Complements, p1Crossing, p1Names, p1Adjacent],
    [p2Parallels, p2Bisector, p2Linked, p2Around],
    [p3Named, p3Test, p3Need, p3Star],
    [p4Strip, p4Zigzag, p4Grid, p4Linked],
    [p5Bisector, p5TriParallel, p5TwoBisectors, p5ZigObtuse],
  ],
  upgrades: [up1, up2, up3],
  age: [age1, age2, age3],
}
