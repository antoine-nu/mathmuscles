// Périmètres, aires et volumes (5e) : aires du rectangle, du triangle, du parallélogramme, du disque, figures composées ;
// périmètre et longueur du cercle ; volumes du pavé droit, du prisme droit et du cylindre ; conversions d'aires et de volumes.
import type { FigAngle, FigPoint, FigSegment, Figure, LabelPos } from '../figure'
import { fmt, fresh, numeric, pick, randInt, variants, withMeta, type Exercise, type Maker, type SubjectContent } from '../utils'
import { prenom } from '../contexts'

// ── Petit moteur de figures (coordonnées mathématiques → cadre) ─────────
type Pt = [number, number]
const RED = '#b8362f'
const BLUE = '#2f5fb3'
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
  const W = 320, H = 220, m = s.margin ?? 44
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
function retry(make: () => Exercise | null): Exercise {
  for (let i = 0; i < 5000; i++) {
    const ex = make()
    if (ex) return ex
  }
  throw new Error('tirage introuvable')
}
const fig = (ex: Exercise, figure: Figure): Exercise => withMeta(ex, { figure })
const titled = (title: string, ex: Exercise, figure?: Figure): Exercise => withMeta(ex, figure ? { title, figure } : { title })

// ── Aides de calcul et de rédaction ──────────────────────────────────────
const PI = 3.14
/** Arrondi à 6 décimales (évite les 12,560000000000002). */
const r6 = (x: number) => Math.round(x * 1e6) / 1e6
const f = (x: number) => fmt(r6(x))
/** Entier écrit avec séparateur des milliers : 180 000. */
const big = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
const FILL = '#e2b85c'
const FILL2 = '#9cc3d5'
const UNITS = ['mm', 'cm', 'dm', 'm'] as const
type U = (typeof UNITS)[number]

// ── Figures planes ───────────────────────────────────────────────────────
function rectFig(L: number, l: number, labels: { L?: string; l?: string } = {}, k = 1): Figure {
  const raw: Record<string, Pt> = { A: [0, 0], B: [L * k, 0], C: [L * k, l * k], D: [0, l * k] }
  return build(raw, {
    segs: [{ a: 'A', b: 'B', label: labels.L }, { a: 'B', b: 'C', label: labels.l }, { a: 'C', b: 'D' }, { a: 'D', b: 'A' }],
    hidden: ['A', 'B', 'C', 'D'], polys: [{ pts: ['A', 'B', 'C', 'D'], fill: FILL }], arcs: [{ v: 'A', a: 'B', b: 'D', right: true }],
  })
}
/** Triangle de base [AB] (longueur b), sommet C à l'abscisse cx et à la hauteur h ; hauteur [CH] en pointillés. */
function triFig(b: number, cx: number, h: number, labels: { b?: string; h?: string; AC?: string; BC?: string } = {}, names: [string, string, string] = ['A', 'B', 'C']): Figure {
  const [A, B, C] = names
  const raw: Record<string, Pt> = { [A]: [0, 0], [B]: [b, 0], [C]: [cx, h], H: [cx, 0] }
  const segs: FigSegment[] = [{ a: A, b: B }, { a: B, b: C, label: labels.BC }, { a: C, b: A, label: labels.AC }, { a: C, b: 'H', dashed: true, color: RED }]
  if (cx < 0) segs.push({ a: 'H', b: A, dashed: true })
  if (cx > b) segs.push({ a: B, b: 'H', dashed: true })
  const hid = Math.abs(cx) < 1e-9 || Math.abs(cx - b) < 1e-9
  return build(raw, {
    segs, polys: [{ pts: [A, B, C], fill: FILL }], hidden: hid ? ['H'] : [],
    arcs: [{ v: 'H', a: cx > b ? B : cx < 0 ? A : B, b: C, right: true }],
    notes: [...(labels.h ? [{ at: [cx, h / 2] as Pt, text: labels.h, dx: cx > b / 2 ? -22 : 22 }] : []), ...(labels.b ? [{ at: [cx < 0 || cx > b ? b / 2 : cx > b / 2 ? cx / 2 : (cx + b) / 2, 0] as Pt, text: labels.b, dy: 14 }] : [])],
    labels: hid ? {} : { H: 'H' },
  })
}
/** Parallélogramme de base b, décalage dx, hauteur h ; hauteur issue de D en pointillés. */
function paraFig(b: number, dx: number, h: number, labels: { b?: string; h?: string; side?: string } = {}): Figure {
  const raw: Record<string, Pt> = { A: [0, 0], B: [b, 0], C: [b + dx, h], D: [dx, h], H: [dx, 0] }
  return build(raw, {
    segs: [{ a: 'A', b: 'B' }, { a: 'B', b: 'C', label: labels.side }, { a: 'C', b: 'D' }, { a: 'D', b: 'A' }, { a: 'D', b: 'H', dashed: true, color: RED }, ...(dx > b ? [{ a: 'B', b: 'H', dashed: true }] : [])],
    polys: [{ pts: ['A', 'B', 'C', 'D'], fill: FILL }], arcs: [{ v: 'H', a: dx > b ? 'A' : 'B', b: 'D', right: true }],
    labels: Math.abs(dx - b) < 0.25 * b ? { H: '' } : {},
    notes: [...(labels.h ? [{ at: [dx, h / 2] as Pt, text: labels.h, dx: 20 }] : []), ...(labels.b ? [{ at: [dx > b / 2 ? Math.min(b, dx) / 2 : (dx + b) / 2, 0] as Pt, text: labels.b, dy: 14 }] : [])],
  })
}
/** Arc de cercle (coordonnées mathématiques), de l'angle a à l'angle b (en °). */
const arcPts = (c: Pt, r: number, a: number, b: number, n = 48): Pt[] => Array.from({ length: n + 1 }, (_, i) => polar(r, a + ((b - a) * i) / n, c))
function diskFig(r: number, show: 'r' | 'd', label: string, part: 1 | 0.5 | 0.25 = 1): Figure {
  const raw: Record<string, Pt> = { O: [0, 0], P: [r, 0], Q: [-r, 0], T: [0, r] }
  const hidden = ['P', 'Q', 'T']
  if (part === 1) {
    return build(raw, {
      hidden, circles: [{ c: 'O', r }], labels: show === 'd' ? { O: '' } : {},
      segs: [show === 'r' ? { a: 'O', b: 'P', label, color: RED } : { a: 'Q', b: 'P', label, color: RED }],
    })
  }
  const pts = part === 0.5 ? arcPts([0, 0], r, 0, 180) : arcPts([0, 0], r, 0, 90)
  return build(raw, {
    hidden, curves: [{ pts, color: '#3a2410', width: 1.8 }],
    segs: part === 0.5 ? [{ a: 'Q', b: 'P', label: show === 'd' ? label : undefined }, ...(show === 'r' ? [{ a: 'O', b: 'T', label, color: RED }] : [])] : [{ a: 'O', b: 'P', label }, { a: 'O', b: 'T' }],
    polys: [], labels: { O: part === 0.25 ? 'O' : '' },
  })
}

// ── Solides en perspective cavalière ─────────────────────────────────────
const DEPTH: Pt = [0.5 * Math.cos(rad(35)), 0.5 * Math.sin(rad(35))]
/** Pavé droit L × l × h (l = profondeur) ; arêtes cachées en pointillés. */
function boxFig(L: number, l: number, h: number, labels: { L?: string; l?: string; h?: string } = {}, water?: number): Figure {
  const d: Pt = [DEPTH[0] * l, DEPTH[1] * l]
  const P = (x: number, y: number, z: number): Pt => [x + d[0] * z, y + d[1] * z]
  const raw: Record<string, Pt> = {
    A: P(0, 0, 0), B: P(L, 0, 0), C: P(L, h, 0), D: P(0, h, 0), E: P(0, 0, 1), F: P(L, 0, 1), G: P(L, h, 1), H: P(0, h, 1),
  }
  const segs: FigSegment[] = [
    { a: 'A', b: 'B', label: labels.L }, { a: 'B', b: 'C' }, { a: 'C', b: 'D' }, { a: 'D', b: 'A', label: labels.h },
    { a: 'B', b: 'F' }, { a: 'C', b: 'G' }, { a: 'D', b: 'H' }, { a: 'F', b: 'G' }, { a: 'G', b: 'H' },
    { a: 'A', b: 'E', dashed: true }, { a: 'E', b: 'F', dashed: true }, { a: 'E', b: 'H', dashed: true },
  ]
  const polys = [{ pts: ['A', 'B', 'C', 'D'], fill: FILL }, { pts: ['B', 'F', 'G', 'C'], fill: '#c99a45' }, { pts: ['D', 'C', 'G', 'H'], fill: '#f0d08c' }]
  if (water !== undefined) {
    Object.assign(raw, { W1: P(0, water, 0), W2: P(L, water, 0), W3: P(L, water, 1), W4: P(0, water, 1) })
    polys.push({ pts: ['A', 'B', 'W2', 'W1'], fill: FILL2 }, { pts: ['B', 'F', 'W3', 'W2'], fill: FILL2 })
    segs.push({ a: 'W1', b: 'W2', color: '#2f5fb3' }, { a: 'W2', b: 'W3', color: '#2f5fb3' })
  }
  const mid = (p: Pt, q: Pt): Pt => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2]
  return build(raw, {
    segs, polys, hidden: Object.keys(raw),
    notes: labels.l ? [{ at: mid(raw.B, raw.F), text: labels.l, dx: 22, dy: 4 }] : [],
  })
}
/** Prisme droit à base triangulaire (face avant : triangle de base b, sommet à cx, hauteur ht), longueur L. */
function prismFig(b: number, cx: number, ht: number, L: number, labels: { b?: string; ht?: string; L?: string } = {}): Figure {
  const d: Pt = [DEPTH[0] * L, DEPTH[1] * L]
  const P = (x: number, y: number, z: number): Pt => [x + d[0] * z, y + d[1] * z]
  const raw: Record<string, Pt> = { A: P(0, 0, 0), B: P(b, 0, 0), C: P(cx, ht, 0), D: P(0, 0, 1), E: P(b, 0, 1), F: P(cx, ht, 1), H: P(cx, 0, 0) }
  const mid = (p: Pt, q: Pt): Pt => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2]
  return build(raw, {
    segs: [
      { a: 'A', b: 'B', label: labels.b }, { a: 'B', b: 'C' }, { a: 'C', b: 'A' }, { a: 'B', b: 'E' }, { a: 'C', b: 'F' }, { a: 'E', b: 'F' },
      { a: 'A', b: 'D', dashed: true }, { a: 'D', b: 'E', dashed: true }, { a: 'D', b: 'F', dashed: true },
      ...(labels.ht ? [{ a: 'C', b: 'H', dashed: true, color: RED }] : []),
    ],
    polys: [{ pts: ['A', 'B', 'C'], fill: FILL }, { pts: ['B', 'E', 'F', 'C'], fill: '#c99a45' }],
    hidden: Object.keys(raw),
    notes: [...(labels.L ? [{ at: mid(raw.B, raw.E), text: labels.L, dx: 22, dy: 4 }] : []), ...(labels.ht ? [{ at: [cx, ht / 2] as Pt, text: labels.ht, dx: 20 }] : [])],
  })
}
/** Cylindre de rayon r et de hauteur h, axe vertical. */
function cylFig(r: number, h0: number, labels: { r?: string; d?: string; h?: string } = {}, water?: number): Figure {
  const e = 0.3, h = Math.min(h0, 3.2 * r)
  const ell = (y: number, a: number, b: number): Pt[] => Array.from({ length: 41 }, (_, i) => { const t = rad(a + ((b - a) * i) / 40); return [r * Math.cos(t), y + e * r * Math.sin(t)] })
  const raw: Record<string, Pt> = { O: [0, h], P: [r, h], Q: [-r, h], B1: [-r, 0], B2: [r, 0], T1: [-r, h], T2: [r, h], o: [0, 0], lo: [0, -e * r], hi: [0, h + e * r] }
  const curves: { pts: Pt[]; color?: string; dashed?: boolean; width?: number }[] = [
    { pts: ell(h, 0, 360), color: '#3a2410', width: 1.8 }, { pts: ell(0, 180, 360), color: '#3a2410', width: 1.8 }, { pts: ell(0, 0, 180), color: '#3a2410', dashed: true, width: 1.4 },
  ]
  if (water !== undefined) curves.push({ pts: ell(water, 180, 360), color: '#2f5fb3', width: 1.6 })
  return build(raw, {
    segs: [{ a: 'B1', b: 'T1' }, { a: 'B2', b: 'T2', label: labels.h }, ...(labels.r ? [{ a: 'O', b: 'P', label: labels.r, color: RED }] : []), ...(labels.d ? [{ a: 'Q', b: 'P', label: labels.d, color: RED }] : [])],
    curves, hidden: Object.keys(raw).filter((k) => k !== 'O' || !labels.r), labels: { O: '' },
  })
}

// ═══ Palier 1 ═══════════════════════════════════════════════════════════
const p1Rect: Maker = variants(
  () => {
    const L = randInt(4, 15), l = randInt(2, L - 1), u = pick(['cm', 'm', 'dm'])
    return fig(numeric(`Quelle est l'aire d'un rectangle de ${L} ${u} sur ${l} ${u} (en ${u}²) ?`, L * l, {
      explanation: `Aire du rectangle = longueur × largeur = ${L} × ${l} = ${L * l} ${u}².`,
    }), rectFig(L, l, { L: `${L} ${u}`, l: `${l} ${u}` }))
  },
  () => {
    const c = randInt(3, 12), u = pick(['cm', 'm'])
    return fig(numeric(`Une dalle carrée a un côté de ${c} ${u}. Quelle est son aire (en ${u}²) ?`, c * c, {
      explanation: `Aire du carré = côté × côté = ${c} × ${c} = ${c * c} ${u}².`,
    }), rectFig(c, c, { L: `${c} ${u}` }))
  },
  fresh(() => {
    const L = randInt(4, 15), l = randInt(2, 12)
    return fig(numeric(`Un rectangle a une aire de ${L * l} cm² et une largeur de ${l} cm. Quelle est sa longueur (en cm) ?`, L, {
      explanation: `Longueur × ${l} = ${L * l}, donc longueur = ${L * l} ÷ ${l} = ${L} cm.`,
    }), rectFig(L, l, { L: '?', l: `${l} cm` }))
  }),
  () => {
    const L = randInt(10, 40), l = randInt(5, L - 2), obj = pick(['Un potager', 'La cour du château', 'Un terrain de jeu', 'Un champ de blé'])
    return fig(numeric(`${obj} rectangulaire mesure ${L} m sur ${l} m. Quelle est son aire (en m²) ?`, L * l, {
      explanation: `${L} × ${l} = ${L * l} m².`,
    }), rectFig(L, l, { L: `${L} m`, l: `${l} m` }))
  },
)

const p1Perim: Maker = variants(
  () => {
    const L = randInt(4, 20), l = randInt(2, L - 1)
    return fig(numeric(`Quel est le périmètre d'un rectangle de ${L} cm sur ${l} cm (en cm) ?`, 2 * (L + l), {
      explanation: `P = 2 × (longueur + largeur) = 2 × (${L} + ${l}) = ${2 * (L + l)} cm.`,
    }), rectFig(L, l, { L: `${L} cm`, l: `${l} cm` }))
  },
  () => {
    const a = randInt(3, 12), b = randInt(3, 12), c0 = randInt(Math.abs(a - b) + 1, a + b - 1)
    const cx = (a * a + b * b - c0 * c0) / (2 * a), h = Math.sqrt(Math.max(0.01, b * b - cx * cx))
    return fig(numeric(`Un triangle a des côtés de ${a} cm, ${b} cm et ${c0} cm. Quel est son périmètre (en cm) ?`, a + b + c0, {
      explanation: `On additionne les longueurs des trois côtés : ${a} + ${b} + ${c0} = ${a + b + c0} cm.`,
    }), build({ A: [0, 0], B: [a, 0], C: [cx, h] }, { segs: [{ a: 'A', b: 'B', label: `${a} cm` }, { a: 'C', b: 'A', label: `${b} cm` }, { a: 'B', b: 'C', label: `${c0} cm` }], polys: [{ pts: ['A', 'B', 'C'], fill: FILL }], hidden: ['A', 'B', 'C'] }))
  },
  fresh(() => {
    const c = randInt(3, 25)
    return numeric(`Un carré a un périmètre de ${4 * c} m. Combien mesure son côté (en m) ?`, c, {
      explanation: `Les quatre côtés sont égaux : ${4 * c} ÷ 4 = ${c} m.`,
    })
  }),
  () => {
    const n = pick([5, 6, 8]), c = randInt(2, 12), name = { 5: 'pentagone', 6: 'hexagone', 8: 'octogone' }[n]
    const pts = Array.from({ length: n }, (_, i) => polar(2, 90 + (360 / n) * i))
    const raw: Record<string, Pt> = {}
    pts.forEach((p, i) => { raw[`p${i}`] = p })
    return fig(numeric(`Un ${name} régulier a des côtés de ${c} cm. Quel est son périmètre (en cm) ?`, n * c, {
      explanation: `Il a ${n} côtés égaux : ${n} × ${c} = ${n * c} cm.`,
    }), build(raw, { segs: pts.map((_, i) => ({ a: `p${i}`, b: `p${(i + 1) % n}`, label: i === 0 ? `${c} cm` : undefined })), hidden: Object.keys(raw), polys: [{ pts: Object.keys(raw), fill: FILL }] }))
  },
  () => {
    // figure en L : on connaît les deux grandes dimensions
    const L = randInt(6, 12), H = randInt(5, 10), a = randInt(2, L - 3), b = randInt(2, H - 3)
    const raw: Record<string, Pt> = { A: [0, 0], B: [L, 0], C: [L, b], D: [a, b], E: [a, H], F: [0, H] }
    return fig(numeric(`La figure en forme de L ci-dessous a tous ses angles droits. Ses côtés mesurent ${L} cm, ${b} cm, ${L - a} cm, ${H - b} cm, ${a} cm et ${H} cm. Quel est son périmètre (en cm) ?`, 2 * (L + H), {
      explanation: `${L} + ${b} + ${L - a} + ${H - b} + ${a} + ${H} = ${2 * (L + H)} cm. (On remarque que c'est le périmètre du rectangle de ${L} cm sur ${H} cm.)`,
    }), build(raw, { segs: [{ a: 'A', b: 'B', label: `${L} cm` }, { a: 'B', b: 'C', label: `${b} cm` }, { a: 'C', b: 'D', label: `${L - a} cm` }, { a: 'D', b: 'E', label: `${H - b} cm` }, { a: 'E', b: 'F', label: `${a} cm` }, { a: 'F', b: 'A', label: `${H} cm` }], hidden: Object.keys(raw), polys: [{ pts: Object.keys(raw), fill: FILL }] }))
  },
)

const p1Triangle: Maker = variants(
  () => {
    let b = randInt(4, 14), h = randInt(2, 12)
    while ((b * h) % 2 || h > b + 4) { b = randInt(4, 14); h = randInt(2, 12) }
    const cx = b * randInt(25, 75) / 100
    return fig(numeric(`Le triangle ABC a une base [AB] de ${b} cm et une hauteur [CH] de ${h} cm. Quelle est son aire (en cm²) ?`, (b * h) / 2, {
      explanation: `Aire du triangle = base × hauteur ÷ 2 = ${b} × ${h} ÷ 2 = ${(b * h) / 2} cm².`,
    }), triFig(b, cx, h, { b: `${b} cm`, h: `${h} cm` }))
  },
  () => {
    let a = randInt(3, 12), c = randInt(3, 12)
    while ((a * c) % 2) { a = randInt(3, 12); c = randInt(3, 12) }
    return fig(numeric(`Le triangle ABC est rectangle en A, avec AB = ${a} cm et AC = ${c} cm. Quelle est son aire (en cm²) ?`, (a * c) / 2, {
      explanation: `Dans un triangle rectangle, un côté de l'angle droit est la hauteur relative à l'autre : ${a} × ${c} ÷ 2 = ${(a * c) / 2} cm².`,
    }), build({ A: [0, 0], B: [a, 0], C: [0, c] }, { segs: [{ a: 'A', b: 'B', label: `${a} cm` }, { a: 'B', b: 'C' }, { a: 'C', b: 'A', label: `${c} cm` }], arcs: [{ v: 'A', a: 'B', b: 'C', right: true }], polys: [{ pts: ['A', 'B', 'C'], fill: FILL }] }))
  },
  () => {
    let b = randInt(2, 9), h = randInt(3, 10)
    while ((b * h) % 2) { b = randInt(2, 9); h = randInt(3, 10) }
    const ctx = pick(['La voile triangulaire d’un navire', 'Le fanion d’un chevalier', 'Un pignon de grange', 'Une part de tarte triangulaire'])
    const u = ctx.includes('tarte') || ctx.includes('fanion') ? 'dm' : 'm'
    return fig(numeric(`${ctx} a une base de ${b} ${u} et une hauteur de ${h} ${u}. Quelle est son aire (en ${u}²) ?`, (b * h) / 2, {
      explanation: `${b} × ${h} ÷ 2 = ${(b * h) / 2} ${u}².`,
    }), triFig(b, b / 2, h, { b: `${b} ${u}`, h: `${h} ${u}` }))
  },
  fresh(() => {
    const b = randInt(3, 12), h = randInt(2, 12), A2 = b * h
    return fig(numeric(`Un triangle a une aire de ${fmt(A2 / 2)} cm² et une base de ${b} cm. Quelle est la hauteur relative à cette base (en cm) ?`, h, {
      explanation: `base × hauteur ÷ 2 = aire, donc hauteur = 2 × ${fmt(A2 / 2)} ÷ ${b} = ${A2} ÷ ${b} = ${h} cm.`,
    }), triFig(b, b * 0.4, h, { b: `${b} cm`, h: '?' }))
  }),
)

/** Conversions d'aires d'un rang (× 100 ou ÷ 100). */
function areaConv(up: boolean): Exercise {
  const i = randInt(0, 2), big: U = UNITS[i + 1], small: U = UNITS[i]
  const v = pick([randInt(2, 90), randInt(2, 90) / 10, randInt(101, 999) / 100])
  if (up) return numeric(`Convertis ${f(v)} ${big}² en ${small}².`, r6(v * 100), { explanation: `1 ${big} = 10 ${small}, donc 1 ${big}² = 10 × 10 = 100 ${small}². ${f(v)} × 100 = ${f(v * 100)} ${small}².`, inputHint: `En ${small}²` })
  const w = pick([randInt(2, 900), randInt(1001, 9999)])
  return numeric(`Convertis ${f(w)} ${small}² en ${big}².`, r6(w / 100), { explanation: `1 ${big}² = 100 ${small}², donc on divise par 100 : ${f(w)} ÷ 100 = ${f(w / 100)} ${big}².`, inputHint: `En ${big}²` })
}
const p1Conv: Maker = variants(
  () => areaConv(true),
  () => areaConv(false),
  () => {
    const v = randInt(2, 40)
    return numeric(`Un tapis a une aire de ${v} m². Combien de dm² cela fait-il ?`, v * 100, { explanation: `1 m² = 10 dm × 10 dm = 100 dm². ${v} × 100 = ${v * 100} dm².` })
  },
  () => {
    const w = randInt(3, 99) * 100
    return numeric(`Une étiquette a une aire de ${w} mm². Combien de cm² cela fait-il ?`, w / 100, { explanation: `1 cm² = 10 mm × 10 mm = 100 mm². ${w} ÷ 100 = ${w / 100} cm².` })
  },
)

// ═══ Palier 2 ═══════════════════════════════════════════════════════════
const p2Para: Maker = variants(
  () => {
    const b = randInt(3, 15), h = randInt(2, 10), dx = b * randInt(28, 45) / 100
    return fig(numeric(`Le parallélogramme ABCD a une base [AB] de ${b} cm et une hauteur [DH] de ${h} cm. Quelle est son aire (en cm²) ?`, b * h, {
      explanation: `Aire du parallélogramme = base × hauteur = ${b} × ${h} = ${b * h} cm².`,
    }), paraFig(b, dx, h, { b: `${b} cm`, h: `${h} cm` }))
  },
  () => {
    const b = randInt(4, 15), h = randInt(2, 8), dx = b * randInt(28, 45) / 100, side = Math.round(Math.hypot(dx, h) * 10) / 10
    return fig(numeric(`Le parallélogramme ABCD a pour base AB = ${b} cm, pour côté BC = ${fmt(side)} cm et pour hauteur DH = ${h} cm. Quelle est son aire (en cm²) ?`, b * h, {
      explanation: `On utilise la base et la hauteur qui lui est perpendiculaire (pas le côté oblique) : ${b} × ${h} = ${b * h} cm².`,
    }), paraFig(b, dx, h, { b: `${b} cm`, h: `${h} cm`, side: `${fmt(side)} cm` }))
  },
  fresh(() => {
    const b = randInt(3, 15), h = randInt(2, 10), dx = b * randInt(28, 45) / 100
    return fig(numeric(`Un parallélogramme a une aire de ${b * h} m² et une base de ${b} m. Quelle est la hauteur relative à cette base (en m) ?`, h, {
      explanation: `base × hauteur = aire, donc hauteur = ${b * h} ÷ ${b} = ${h} m.`,
    }), paraFig(b, dx, h, { b: `${b} m`, h: '?' }))
  }),
  () => {
    const b = randInt(3, 12), h = randInt(2, 8)
    return numeric(`Un losange de côté ${b} cm a une hauteur de ${h} cm (distance entre deux côtés opposés). Quelle est son aire (en cm²) ? (Un losange est un parallélogramme.)`, b * h, {
      explanation: `Comme pour tout parallélogramme : base × hauteur = ${b} × ${h} = ${b * h} cm².`,
    })
  },
)

const p2Circle: Maker = variants(
  () => {
    const r = randInt(1, 15)
    return fig(numeric(`Quelle est la longueur d'un cercle de rayon ${r} cm ? Prends π ≈ 3,14 (en cm).`, r6(2 * PI * r), {
      explanation: `Longueur = 2 × π × r ≈ 2 × 3,14 × ${r} = ${f(2 * PI * r)} cm.`,
    }), diskFig(1, 'r', `${r} cm`))
  },
  () => {
    const d = randInt(2, 30)
    return fig(numeric(`Une roue de charrette a un diamètre de ${d} dm. Quelle distance parcourt-elle en faisant un tour complet (en dm) ? Prends π ≈ 3,14.`, r6(PI * d), {
      explanation: `En un tour, la roue parcourt la longueur du cercle : π × d ≈ 3,14 × ${d} = ${f(PI * d)} dm.`,
    }), diskFig(1, 'd', `${d} dm`))
  },
  () => {
    const r = randInt(2, 12)
    return fig(numeric(`Quel est le périmètre d'un demi-disque de rayon ${r} cm (arc + diamètre) ? Prends π ≈ 3,14 (en cm).`, r6(PI * r + 2 * r), {
      explanation: `L'arc est la moitié du cercle : 3,14 × ${r} = ${f(PI * r)} cm. On ajoute le diamètre ${2 * r} cm : ${f(PI * r)} + ${2 * r} = ${f(PI * r + 2 * r)} cm.`,
    }), diskFig(1, 'r', `${r} cm`, 0.5))
  },
  fresh(() => {
    const d = randInt(2, 20)
    return fig(numeric(`Un cercle a une longueur de ${f(PI * d)} cm (avec π ≈ 3,14). Quel est son diamètre (en cm) ?`, d, {
      explanation: `Longueur = π × d, donc d = ${f(PI * d)} ÷ 3,14 = ${d} cm.`,
    }), diskFig(1, 'd', '?'))
  }),
)

const p2Disk: Maker = variants(
  () => {
    const r = randInt(1, 12)
    return fig(numeric(`Calcule l'aire d'un disque de rayon ${r} cm. Prends π ≈ 3,14 (en cm²).`, r6(PI * r * r), {
      explanation: `Aire = π × r × r ≈ 3,14 × ${r} × ${r} = 3,14 × ${r * r} = ${f(PI * r * r)} cm².`,
    }), diskFig(1, 'r', `${r} cm`))
  },
  () => {
    const r = randInt(1, 10)
    return fig(numeric(`Un bassin circulaire a un diamètre de ${2 * r} m. Quelle est sa surface (en m²) ? Prends π ≈ 3,14.`, r6(PI * r * r), {
      explanation: `Rayon : ${2 * r} ÷ 2 = ${r} m. Aire = 3,14 × ${r} × ${r} = ${f(PI * r * r)} m².`,
    }), diskFig(1, 'd', `${2 * r} m`))
  },
  () => {
    const r = randInt(2, 10)
    return fig(numeric(`Une table a la forme d'un demi-disque de rayon ${r} dm. Quelle est son aire (en dm²) ? Prends π ≈ 3,14.`, r6((PI * r * r) / 2), {
      explanation: `Disque entier : 3,14 × ${r * r} = ${f(PI * r * r)} dm² ; la moitié : ${f((PI * r * r) / 2)} dm².`,
    }), diskFig(1, 'r', `${r} dm`, 0.5))
  },
  () => {
    const r = 2 * randInt(1, 6)
    return fig(numeric(`Une chèvre attachée au coin O d'un pré, par une corde de ${r} m, peut brouter un quart de disque de rayon ${r} m. Quelle aire peut-elle brouter (en m²) ? Prends π ≈ 3,14.`, r6((PI * r * r) / 4), {
      explanation: `Disque entier : 3,14 × ${r * r} = ${f(PI * r * r)} m² ; le quart : ${f((PI * r * r) / 4)} m².`,
    }), diskFig(1, 'r', `${r} m`, 0.25))
  },
)

const p2Box: Maker = variants(
  () => {
    const L = randInt(3, 12), l = randInt(2, 8), h = randInt(2, 8), obj = pick(['Un coffre', 'Une boîte', 'Une caisse', 'Une malle'])
    return fig(numeric(`${obj} a la forme d'un pavé droit de ${L} cm de long, ${l} cm de large et ${h} cm de haut. Quel est son volume (en cm³) ?`, L * l * h, {
      explanation: `Volume du pavé droit = longueur × largeur × hauteur = ${L} × ${l} × ${h} = ${L * l * h} cm³.`,
    }), boxFig(L, l, h, { L: `${L} cm`, l: `${l} cm`, h: `${h} cm` }))
  },
  () => {
    const c = randInt(2, 10)
    return fig(numeric(`Quel est le volume d'un cube d'arête ${c} cm (en cm³) ?`, c * c * c, {
      explanation: `Volume du cube = arête × arête × arête = ${c} × ${c} × ${c} = ${c * c * c} cm³.`,
    }), boxFig(c, c, c, { L: `${c} cm` }))
  },
  fresh(() => {
    const L = randInt(3, 12), l = randInt(2, 8), h = randInt(2, 8)
    return fig(numeric(`Un pavé droit a un volume de ${L * l * h} cm³, une longueur de ${L} cm et une largeur de ${l} cm. Quelle est sa hauteur (en cm) ?`, h, {
      explanation: `${L} × ${l} = ${L * l} cm² (aire de la base). Hauteur = ${L * l * h} ÷ ${L * l} = ${h} cm.`,
    }), boxFig(L, l, h, { L: `${L} cm`, l: `${l} cm`, h: '?' }))
  }),
  () => {
    const L = randInt(4, 12), l = randInt(2, 6), h = randInt(2, 6)
    return fig(numeric(`Un abreuvoir a la forme d'un pavé droit de ${L} dm sur ${l} dm, et ${h} dm de profondeur. Combien de litres d'eau peut-il contenir ? (1 dm³ = 1 L)`, L * l * h, {
      explanation: `Volume : ${L} × ${l} × ${h} = ${L * l * h} dm³, soit ${L * l * h} L.`,
    }), boxFig(L, l, h, { L: `${L} dm`, l: `${l} dm`, h: `${h} dm` }))
  },
)

// ═══ Palier 3 ═══════════════════════════════════════════════════════════
const p3TriangleOut: Maker = variants(
  () => {
    let b = randInt(3, 10), h = randInt(2, 8)
    while ((b * h) % 2) { b = randInt(3, 10); h = randInt(2, 8) }
    const out = randInt(2, 4), side = Math.round(Math.hypot(b + out, h) * 10) / 10
    return fig(numeric(`Dans le triangle ABC, AB = ${b} cm, AC = ${fmt(side)} cm et la hauteur [CH] relative au côté [AB] mesure ${h} cm (H est sur le prolongement de [AB]). Quelle est l'aire du triangle (en cm²) ?`, (b * h) / 2, {
      explanation: `On prend la base [AB] et la hauteur [CH] qui lui correspond, même si H est à l'extérieur : ${b} × ${h} ÷ 2 = ${(b * h) / 2} cm². (La longueur AC ne sert pas.)`,
    }), triFig(b, b + out, h, { b: `${b} cm`, h: `${h} cm`, AC: `${fmt(side)} cm` }))
  },
  () => {
    let b = randInt(4, 12), h = randInt(3, 9)
    while ((b * h) % 2) { b = randInt(4, 12); h = randInt(3, 9) }
    const cx = b * randInt(25, 75) / 100, ac = Math.round(Math.hypot(cx, h) * 10) / 10, bc = Math.round(Math.hypot(b - cx, h) * 10) / 10
    return fig(numeric(`Le triangle ABC a des côtés AB = ${b} cm, AC = ${fmt(ac)} cm, BC = ${fmt(bc)} cm, et sa hauteur issue de C mesure ${h} cm. Quelle est son aire (en cm²) ?`, (b * h) / 2, {
      explanation: `La hauteur issue de C est perpendiculaire à [AB] : base AB = ${b} cm. Aire = ${b} × ${h} ÷ 2 = ${(b * h) / 2} cm².`,
    }), triFig(b, cx, h, { b: `${b} cm`, h: `${h} cm`, AC: `${fmt(ac)} cm`, BC: `${fmt(bc)} cm` }))
  },
  fresh(() => {
    const b = randInt(3, 10), h = randInt(2, 9), out = randInt(1, 3)
    return fig(numeric(`Un triangle obtus ABC a une aire de ${fmt((b * h) / 2)} cm². Sa base [AB] mesure ${b} cm. Combien mesure la hauteur [CH], qui tombe à l'extérieur du triangle (en cm) ?`, h, {
      explanation: `Hauteur = 2 × aire ÷ base = 2 × ${fmt((b * h) / 2)} ÷ ${b} = ${b * h} ÷ ${b} = ${h} cm.`,
    }), triFig(b, -out, h, { b: `${b} cm`, h: '?' }))
  }),
  () => {
    const a = randInt(3, 10), c = randInt(3, 10), hyp = Math.round(Math.hypot(a, c) * 10) / 10
    return fig(numeric(`Le triangle ABC est rectangle en A, avec AB = ${a} cm, AC = ${c} cm et BC = ${fmt(hyp)} cm. Quelle est son aire (en cm²) ?`, (a * c) / 2, {
      explanation: `Les côtés de l'angle droit sont base et hauteur : ${a} × ${c} ÷ 2 = ${fmt((a * c) / 2)} cm². (L'hypoténuse ne sert pas.)`,
    }), build({ A: [0, 0], B: [a, 0], C: [0, c] }, { segs: [{ a: 'A', b: 'B', label: `${a} cm` }, { a: 'B', b: 'C', label: `${fmt(hyp)} cm` }, { a: 'C', b: 'A', label: `${c} cm` }], arcs: [{ v: 'A', a: 'B', b: 'C', right: true }], polys: [{ pts: ['A', 'B', 'C'], fill: FILL }] }))
  },
)

/** Figures composées : maison, fenêtre, L, rectangle troué. */
function houseFig(L: number, l: number, h: number, labels: { L?: string; l?: string; h?: string }): Figure {
  const raw: Record<string, Pt> = { A: [0, 0], B: [L, 0], C: [L, l], D: [0, l], E: [L / 2, l + h], M: [L / 2, l] }
  return build(raw, {
    segs: [{ a: 'A', b: 'B', label: labels.L }, { a: 'B', b: 'C', label: labels.l }, { a: 'C', b: 'E' }, { a: 'E', b: 'D' }, { a: 'D', b: 'A' }, { a: 'D', b: 'C', dashed: true }, { a: 'E', b: 'M', dashed: true, color: RED }],
    hidden: Object.keys(raw), polys: [{ pts: ['A', 'B', 'C', 'E', 'D'], fill: FILL }],
    notes: labels.h ? [{ at: [L / 2, l + h / 2], text: labels.h, dx: 20 }] : [],
  })
}
function windowFig(L: number, l: number, labels: { L?: string; l?: string }): Figure {
  const r = L / 2
  const raw: Record<string, Pt> = { A: [0, 0], B: [L, 0], C: [L, l], D: [0, l], top: [r, l + r] }
  return build(raw, {
    segs: [{ a: 'A', b: 'B', label: labels.L }, { a: 'B', b: 'C', label: labels.l }, { a: 'D', b: 'A' }, { a: 'D', b: 'C', dashed: true }],
    curves: [{ pts: arcPts([r, l], r, 0, 180), color: '#3a2410', width: 1.8 }], hidden: Object.keys(raw), polys: [{ pts: ['A', 'B', 'C', 'D'], fill: FILL }],
  })
}
function houseEx(): Exercise {
    const L = 2 * randInt(2, 6), l = randInt(3, 8), h = randInt(2, 6)
    return fig(numeric(`La façade d'une maison est formée d'un rectangle de ${L} m sur ${l} m surmonté d'un triangle de même base et de hauteur ${h} m. Quelle est l'aire de la façade (en m²) ?`, L * l + (L * h) / 2, {
      explanation: `Rectangle : ${L} × ${l} = ${L * l} m². Triangle : ${L} × ${h} ÷ 2 = ${(L * h) / 2} m². Total : ${L * l + (L * h) / 2} m².`,
    }), houseFig(L, l, h, { L: `${L} m`, l: `${l} m`, h: `${h} m` }))
}
const p3Compose: Maker = variants(
  houseEx,
  () => {
    const L = 2 * randInt(1, 5), l = randInt(2, 8), r = L / 2
    return fig(numeric(`Une fenêtre est formée d'un rectangle de ${L} dm de large et ${l} dm de haut, surmonté d'un demi-disque de diamètre ${L} dm. Quelle est son aire (en dm²) ? Prends π ≈ 3,14.`, r6(L * l + (PI * r * r) / 2), {
      explanation: `Rectangle : ${L} × ${l} = ${L * l} dm². Demi-disque de rayon ${r} dm : 3,14 × ${r * r} ÷ 2 = ${f((PI * r * r) / 2)} dm². Total : ${f(L * l + (PI * r * r) / 2)} dm².`,
    }), windowFig(L, l, { L: `${L} dm`, l: `${l} dm` }))
  },
  () => {
    const L = randInt(6, 12), H = randInt(5, 10), a = randInt(2, L - 3), b = randInt(2, H - 3)
    const raw: Record<string, Pt> = { A: [0, 0], B: [L, 0], C: [L, b], D: [a, b], E: [a, H], F: [0, H] }
    return fig(numeric(`La figure en L a tous ses angles droits (voir les mesures). Quelle est son aire (en cm²) ?`.replace('(voir les mesures)', `: elle mesure ${L} cm de large en bas, ${H} cm de haut à gauche, la branche verticale a ${a} cm de large et la branche horizontale ${b} cm de haut`), L * b + a * (H - b), {
      explanation: `On découpe en deux rectangles : ${L} × ${b} = ${L * b} cm² (en bas) et ${a} × ${H - b} = ${a * (H - b)} cm² (en haut). Total : ${L * b + a * (H - b)} cm². (Ou : ${L} × ${H} − ${L - a} × ${H - b} = ${L * H - (L - a) * (H - b)} cm².)`,
    }), build(raw, { segs: [{ a: 'A', b: 'B', label: `${L} cm` }, { a: 'B', b: 'C', label: `${b} cm` }, { a: 'C', b: 'D' }, { a: 'D', b: 'E' }, { a: 'E', b: 'F', label: `${a} cm` }, { a: 'F', b: 'A', label: `${H} cm` }], hidden: Object.keys(raw), polys: [{ pts: Object.keys(raw), fill: FILL }] }))
  },
  () => {
    const L = randInt(6, 14), l = randInt(4, 10), c = randInt(1, Math.min(L, l) - 2)
    const raw: Record<string, Pt> = { A: [0, 0], B: [L, 0], C: [L, l], D: [0, l], P: [(L - c) / 2, (l - c) / 2], Q: [(L + c) / 2, (l - c) / 2], R: [(L + c) / 2, (l + c) / 2], S: [(L - c) / 2, (l + c) / 2] }
    return fig(numeric(`Une plaque rectangulaire de ${L} cm sur ${l} cm est percée d'un trou carré de ${c} cm de côté. Quelle est l'aire de la plaque restante (en cm²) ?`, L * l - c * c, {
      explanation: `Aire du rectangle moins aire du trou : ${L} × ${l} − ${c} × ${c} = ${L * l} − ${c * c} = ${L * l - c * c} cm².`,
    }), build(raw, { segs: [{ a: 'A', b: 'B', label: `${L} cm` }, { a: 'B', b: 'C', label: `${l} cm` }, { a: 'C', b: 'D' }, { a: 'D', b: 'A' }, { a: 'P', b: 'Q' }, { a: 'Q', b: 'R' }, { a: 'R', b: 'S', label: `${c} cm` }, { a: 'S', b: 'P' }], hidden: Object.keys(raw), polys: [{ pts: ['A', 'B', 'C', 'D'], fill: FILL }, { pts: ['P', 'Q', 'R', 'S'], fill: '#fffbe9' }] }))
  },
)

const p3Prism: Maker = variants(
  () => {
    let a = randInt(2, 9), b = randInt(2, 9)
    while ((a * b) % 2) { a = randInt(2, 9); b = randInt(2, 9) }
    const H = randInt(3, 15)
    return fig(numeric(`Un prisme droit a pour base un triangle rectangle dont les côtés de l'angle droit mesurent ${a} cm et ${b} cm. Sa hauteur (la longueur du prisme) est de ${H} cm. Quel est son volume (en cm³) ?`, ((a * b) / 2) * H, {
      explanation: `Aire de la base : ${a} × ${b} ÷ 2 = ${(a * b) / 2} cm². Volume = aire de la base × hauteur = ${(a * b) / 2} × ${H} = ${((a * b) / 2) * H} cm³.`,
    }), prismFig(a, 0, b, H, { b: `${a} cm`, ht: `${b} cm`, L: `${H} cm` }))
  },
  () => {
    let b = randInt(2, 8), h = randInt(2, 6)
    while ((b * h) % 2) { b = randInt(2, 8); h = randInt(2, 6) }
    const L = randInt(4, 12)
    return fig(numeric(`Une tente a la forme d'un prisme droit couché : ses faces avant et arrière sont des triangles de base ${b} dm et de hauteur ${h} dm, et elle mesure ${L} dm de long. Quel est son volume (en dm³) ?`, ((b * h) / 2) * L, {
      explanation: `Aire du triangle : ${b} × ${h} ÷ 2 = ${(b * h) / 2} dm². Volume : ${(b * h) / 2} × ${L} = ${((b * h) / 2) * L} dm³.`,
    }), prismFig(b, b / 2, h, L, { b: `${b} dm`, ht: `${h} dm`, L: `${L} dm` }))
  },
  fresh(() => {
    const B = randInt(5, 40), H = randInt(2, 15)
    return fig(numeric(`Un prisme droit a un volume de ${B * H} cm³ et sa base a une aire de ${B} cm². Quelle est sa hauteur (en cm) ?`, H, {
      explanation: `Volume = aire de la base × hauteur, donc hauteur = ${B * H} ÷ ${B} = ${H} cm.`,
    }), prismFig(3, 1.2, 2, H * 0.5, { L: '?' }))
  }),
  () => {
    const B = randInt(5, 40), H = randInt(2, 15)
    return fig(numeric(`Un prisme droit a une base d'aire ${B} cm² et une hauteur de ${H} cm. Quel est son volume (en cm³) ?`, B * H, {
      explanation: `Volume = aire de la base × hauteur = ${B} × ${H} = ${B * H} cm³.`,
    }), prismFig(3, 1.2, 2, H * 0.5, { L: `${H} cm` }))
  },
)

/** Conversions d'aires sur deux rangs et conversions de volumes. */
const p3Conv: Maker = variants(
  () => {
    const v = pick([randInt(2, 30), randInt(11, 99) / 10])
    return numeric(`Convertis ${f(v)} m² en cm².`, r6(v * 10000), { explanation: `1 m = 100 cm, donc 1 m² = 100 × 100 = 10 000 cm². ${f(v)} × 10 000 = ${f(v * 10000)} cm².` })
  },
  () => {
    const w = randInt(2, 90) * 100
    return numeric(`Convertis ${f(w)} cm² en m².`, r6(w / 10000), { explanation: `1 m² = 10 000 cm², on divise par 10 000 : ${f(w)} ÷ 10 000 = ${f(w / 10000)} m².` })
  },
  () => {
    const v = randInt(2, 50)
    return numeric(pick([`Une bouteille contient ${v} dL. Combien de cm³ cela fait-il ? (1 L = 1 dm³ = 1 000 cm³)`, `Un vase contient ${v} dL d'eau. Exprime ce volume en cm³ (1 L = 1 dm³ = 1 000 cm³).`]), v * 100, {
      explanation: `1 dL = 0,1 L = 0,1 dm³ = 100 cm³. ${v} × 100 = ${v * 100} cm³.`,
    })
  },
  () => {
    const v = randInt(2, 40) * 100
    return numeric(`Un récipient a un volume de ${f(v)} cm³. Combien de litres peut-il contenir ? (1 L = 1 dm³ = 1 000 cm³)`, r6(v / 1000), {
      explanation: `1 L = 1 000 cm³ : ${f(v)} ÷ 1 000 = ${f(v / 1000)} L.`,
    })
  },
  () => {
    const v = pick([randInt(2, 9), randInt(11, 40) / 10])
    return numeric(`Une cuve a un volume de ${f(v)} m³. Combien de litres d'eau contient-elle quand elle est pleine ?`, r6(v * 1000), {
      explanation: `1 m³ = 1 000 dm³ = 1 000 L. ${f(v)} × 1 000 = ${f(v * 1000)} L.`,
    })
  },
)

// ═══ Palier 4 ═══════════════════════════════════════════════════════════
const p4Cyl: Maker = variants(
  () => {
    const r = randInt(1, 6), h = randInt(2, 12)
    return fig(numeric(`Calcule le volume d'un cylindre de rayon ${r} cm et de hauteur ${h} cm. Prends π ≈ 3,14 (en cm³).`, r6(PI * r * r * h), {
      explanation: `Aire de la base : 3,14 × ${r} × ${r} = ${f(PI * r * r)} cm². Volume = aire de la base × hauteur = ${f(PI * r * r)} × ${h} = ${f(PI * r * r * h)} cm³.`,
    }), cylFig(1, Math.max(1.2, h / r), { r: `${r} cm`, h: `${h} cm` }))
  },
  () => {
    const r = randInt(1, 5), h = randInt(2, 10)
    return fig(numeric(`Une boîte de conserve cylindrique a un diamètre de ${2 * r} cm et une hauteur de ${h} cm. Quel est son volume (en cm³) ? Prends π ≈ 3,14.`, r6(PI * r * r * h), {
      explanation: `Rayon : ${2 * r} ÷ 2 = ${r} cm. Volume : 3,14 × ${r * r} × ${h} = ${f(PI * r * r * h)} cm³.`,
    }), cylFig(1, Math.max(1.2, h / r), { d: `${2 * r} cm`, h: `${h} cm` }))
  },
  () => {
    const r = randInt(1, 4), h = randInt(3, 10)
    return fig(numeric(`Un tonneau cylindrique a un rayon de ${r} dm et une hauteur de ${h} dm. Combien de litres peut-il contenir ? Prends π ≈ 3,14 (1 dm³ = 1 L).`, r6(PI * r * r * h), {
      explanation: `Volume : 3,14 × ${r} × ${r} × ${h} = ${f(PI * r * r * h)} dm³, soit ${f(PI * r * r * h)} L.`,
    }), cylFig(1, Math.max(1.2, h / r), { r: `${r} dm`, h: `${h} dm` }))
  },
  fresh(() => {
    const B = pick([PI, 4 * PI, 9 * PI]), h = randInt(2, 10), r = Math.round(Math.sqrt(B / PI))
    return fig(numeric(`Un cylindre a une base d'aire ${f(B)} cm² et un volume de ${f(B * h)} cm³. Quelle est sa hauteur (en cm) ?`, h, {
      explanation: `Volume = aire de la base × hauteur, donc hauteur = ${f(B * h)} ÷ ${f(B)} = ${h} cm.`,
    }), cylFig(1, Math.max(1.2, h / r), { h: '?' }))
  }),
)

function stadiumFig(L: number, r: number, labels: { L?: string; d?: string }): Figure {
  const raw: Record<string, Pt> = { A: [0, -r], B: [L, -r], C: [L, r], D: [0, r] }
  return build(raw, {
    segs: [{ a: 'A', b: 'B', label: labels.L }, { a: 'D', b: 'C' }, { a: 'B', b: 'C', dashed: true, label: labels.d }],
    curves: [{ pts: arcPts([L, 0], r, -90, 90), color: '#3a2410', width: 1.8 }, { pts: arcPts([0, 0], r, 90, 270), color: '#3a2410', width: 1.8 }],
    hidden: Object.keys(raw),
  })
}
const p4PerimCompo: Maker = variants(
  () => {
    const L = randInt(10, 40), d = 2 * randInt(3, 10)
    return fig(numeric(`Une piste a la forme d'un rectangle de ${L} m de long, terminé à chaque bout par un demi-cercle de diamètre ${d} m (voir la figure). Quelle est la longueur d'un tour de piste (en m) ? Prends π ≈ 3,14.`, r6(2 * L + PI * d), {
      explanation: `Les deux demi-cercles forment un cercle entier de diamètre ${d} m : 3,14 × ${d} = ${f(PI * d)} m. On ajoute les deux lignes droites : 2 × ${L} = ${2 * L} m. Total : ${f(2 * L + PI * d)} m.`,
    }), stadiumFig(L / 6, d / 12, { L: `${L} m`, d: `${d} m` }))
  },
  () => {
    const L = 2 * randInt(2, 6), l = randInt(3, 10), r = L / 2
    return fig(numeric(`Une fenêtre est formée d'un rectangle de ${L} dm de large et ${l} dm de haut, surmonté d'un demi-cercle de diamètre ${L} dm. Quel est le périmètre du contour de la fenêtre (en dm) ? Prends π ≈ 3,14.`, r6(L + 2 * l + PI * r), {
      explanation: `Contour : la base (${L} dm), les deux côtés (2 × ${l} = ${2 * l} dm) et le demi-cercle (3,14 × ${L} ÷ 2 = ${f(PI * r)} dm). Total : ${L} + ${2 * l} + ${f(PI * r)} = ${f(L + 2 * l + PI * r)} dm.`,
    }), windowFig(L, l, { L: `${L} dm`, l: `${l} dm` }))
  },
  () => {
    const r = 2 * randInt(1, 8)
    return fig(numeric(`Un quart de disque a un rayon de ${r} cm. Quel est son périmètre (l'arc et les deux rayons) ? Prends π ≈ 3,14 (en cm).`, r6((PI * r) / 2 + 2 * r), {
      explanation: `L'arc est le quart du cercle : 2 × 3,14 × ${r} ÷ 4 = ${f((PI * r) / 2)} cm. On ajoute deux rayons : ${f((PI * r) / 2)} + ${2 * r} = ${f((PI * r) / 2 + 2 * r)} cm.`,
    }), diskFig(1, 'r', `${r} cm`, 0.25))
  },
  () => {
    const c = randInt(2, 10)
    const raw: Record<string, Pt> = { A: [0, 0], B: [c, 0], C: [c, c], D: [0, c] }
    return fig(numeric(`Un carré de côté ${c} cm est surmonté d'un demi-cercle de diamètre ${c} cm, posé sur son côté du haut. Quel est le périmètre de la figure (en cm) ? Prends π ≈ 3,14.`, r6(3 * c + (PI * c) / 2), {
      explanation: `Trois côtés du carré : 3 × ${c} = ${3 * c} cm. Demi-cercle : 3,14 × ${c} ÷ 2 = ${f((PI * c) / 2)} cm. Total : ${f(3 * c + (PI * c) / 2)} cm.`,
    }), build(raw, { segs: [{ a: 'A', b: 'B', label: `${c} cm` }, { a: 'B', b: 'C' }, { a: 'D', b: 'A' }, { a: 'D', b: 'C', dashed: true }], curves: [{ pts: arcPts([c / 2, c], c / 2, 0, 180), color: '#3a2410', width: 1.8 }], hidden: Object.keys(raw), polys: [{ pts: ['A', 'B', 'C', 'D'], fill: FILL }] }))
  },
)

const p4AreaMinus: Maker = variants(
  () => {
    const L = randInt(8, 16), l = randInt(6, 12), e = randInt(1, 2)
    const raw: Record<string, Pt> = { A: [0, 0], B: [L, 0], C: [L, l], D: [0, l], P: [e, e], Q: [L - e, e], R: [L - e, l - e], S: [e, l - e] }
    return fig(numeric(`Un cadre de tableau est un rectangle de ${L} dm sur ${l} dm, dans lequel on a découpé un rectangle laissant une bordure de ${e} dm de large tout autour. Quelle est l'aire du cadre (en dm²) ?`, L * l - (L - 2 * e) * (l - 2 * e), {
      explanation: `Le trou mesure ${L} − 2 × ${e} = ${L - 2 * e} dm sur ${l} − 2 × ${e} = ${l - 2 * e} dm. Aire du cadre : ${L * l} − ${(L - 2 * e) * (l - 2 * e)} = ${L * l - (L - 2 * e) * (l - 2 * e)} dm².`,
    }), build(raw, { segs: [{ a: 'A', b: 'B', label: `${L} dm` }, { a: 'B', b: 'C', label: `${l} dm` }, { a: 'C', b: 'D' }, { a: 'D', b: 'A' }, { a: 'P', b: 'Q' }, { a: 'Q', b: 'R' }, { a: 'R', b: 'S' }, { a: 'S', b: 'P' }], hidden: Object.keys(raw), polys: [{ pts: ['A', 'B', 'C', 'D'], fill: FILL }, { pts: ['P', 'Q', 'R', 'S'], fill: '#fffbe9' }] }))
  },
  () => {
    const R = randInt(3, 10), r = randInt(1, R - 1)
    const raw: Record<string, Pt> = { O: [0, 0], P: [R, 0], Q: polar(r, 120) }
    return fig(numeric(`Une couronne est la partie comprise entre deux cercles de même centre, de rayons ${R} cm et ${r} cm. Quelle est son aire (en cm²) ? Prends π ≈ 3,14.`, r6(PI * (R * R - r * r)), {
      explanation: `Grand disque : 3,14 × ${R * R} = ${f(PI * R * R)} cm². Petit disque : 3,14 × ${r * r} = ${f(PI * r * r)} cm². Couronne : ${f(PI * R * R)} − ${f(PI * r * r)} = ${f(PI * (R * R - r * r))} cm².`,
    }), build(raw, { circles: [{ c: 'O', r: R }, { c: 'O', r }], segs: [{ a: 'O', b: 'P', label: `${R} cm`, color: RED }, { a: 'O', b: 'Q', label: `${r} cm`, color: BLUE }], hidden: ['P', 'Q'], labels: { O: '' } }))
  },
  () => {
    const c = 2 * randInt(2, 6)
    const raw: Record<string, Pt> = { A: [0, 0], B: [c, 0], C: [c, c], D: [0, c] }
    return fig(numeric(`Dans un carré de ${c} m de côté, on retire un quart de disque de rayon ${c} m centré en un coin (voir la figure). Quelle est l'aire de la partie colorée restante (en m²) ? Prends π ≈ 3,14.`, r6(c * c - (PI * c * c) / 4), {
      explanation: `Carré : ${c} × ${c} = ${c * c} m². Quart de disque : 3,14 × ${c * c} ÷ 4 = ${f((PI * c * c) / 4)} m². Reste : ${c * c} − ${f((PI * c * c) / 4)} = ${f(c * c - (PI * c * c) / 4)} m².`,
    }), (() => {
      const arc = arcPts([0, 0], c, 90, 0, 24)
      arc.forEach((p, i) => { raw[`k${i}`] = p })
      return build(raw, { segs: [{ a: 'A', b: 'B', label: `${c} m` }, { a: 'B', b: 'C' }, { a: 'C', b: 'D' }, { a: 'D', b: 'A' }], curves: [{ pts: arcPts([0, 0], c, 0, 90), color: '#3a2410', width: 1.8 }], hidden: Object.keys(raw), polys: [{ pts: ['C', ...arc.map((_, i) => `k${i}`)], fill: FILL }] })
    })())
  },
  () => retry(() => {
    const L = randInt(8, 16), l = randInt(5, 10), b = randInt(2, L - 4), h = randInt(2, l - 2)
    if ((b * h) % 2) return null
    const raw: Record<string, Pt> = { A: [0, 0], B: [L, 0], C: [L, l], D: [0, l], E: [L, l - h], F: [L - b, l] }
    return fig(numeric(`On coupe un coin d'une planche rectangulaire de ${L} cm sur ${l} cm en enlevant un triangle rectangle dont les côtés de l'angle droit mesurent ${b} cm et ${h} cm. Quelle est l'aire de la planche restante (en cm²) ?`, L * l - (b * h) / 2, {
      explanation: `Rectangle : ${L} × ${l} = ${L * l} cm². Triangle enlevé : ${b} × ${h} ÷ 2 = ${(b * h) / 2} cm². Reste : ${L * l - (b * h) / 2} cm².`,
    }), build(raw, { segs: [{ a: 'A', b: 'B', label: `${L} cm` }, { a: 'B', b: 'E' }, { a: 'E', b: 'F' }, { a: 'F', b: 'D' }, { a: 'D', b: 'A', label: `${l} cm` }, { a: 'E', b: 'C', dashed: true, label: `${h} cm` }, { a: 'C', b: 'F', dashed: true, label: `${b} cm` }], hidden: Object.keys(raw), polys: [{ pts: ['A', 'B', 'E', 'F', 'D'], fill: FILL }] }))
  }),
)

const p4Aquarium: Maker = variants(
  () => {
    const L = randInt(4, 10), l = randInt(2, 5), h = randInt(3, 6), w = randInt(1, h - 1)
    return fig(numeric(`Un aquarium en forme de pavé droit mesure ${L} dm de long, ${l} dm de large et ${h} dm de haut. On le remplit d'eau sur ${w} dm de hauteur. Combien de litres d'eau contient-il ?`, L * l * w, {
      explanation: `L'eau occupe un pavé de ${L} × ${l} × ${w} = ${L * l * w} dm³, soit ${L * l * w} L.`,
    }), boxFig(L, l, h, { L: `${L} dm`, l: `${l} dm`, h: `${h} dm` }, w))
  },
  fresh(() => {
    const L = randInt(4, 10), l = randInt(2, 5), h = randInt(4, 8), w = randInt(1, h - 1)
    return fig(numeric(`On verse ${L * l * w} L d'eau dans un aquarium vide en forme de pavé droit de ${L} dm sur ${l} dm. Quelle hauteur l'eau atteint-elle (en dm) ?`, w, {
      explanation: `${L * l * w} L = ${L * l * w} dm³. Aire du fond : ${L} × ${l} = ${L * l} dm². Hauteur : ${L * l * w} ÷ ${L * l} = ${w} dm.`,
    }), boxFig(L, l, h, { L: `${L} dm`, l: `${l} dm` }, w))
  }),
  () => {
    const L = randInt(2, 5) * 10, l = randInt(2, 4) * 10, h = randInt(2, 6) * 10
    return fig(numeric(`Une boîte en pavé droit mesure ${L} cm × ${l} cm × ${h} cm. Combien de litres contient-elle (1 L = 1 000 cm³) ?`, (L * l * h) / 1000, {
      explanation: `Volume : ${L} × ${l} × ${h} = ${L * l * h} cm³ = ${f((L * l * h) / 1000)} L.`,
    }), boxFig(L / 10, l / 10, h / 10, { L: `${L} cm`, l: `${l} cm`, h: `${h} cm` }))
  },
  () => {
    const L = randInt(4, 10), l = randInt(2, 5), h = randInt(3, 6), w = randInt(1, h - 1)
    return fig(numeric(`Un bac de ${L} dm × ${l} dm × ${h} dm contient de l'eau sur ${w} dm de hauteur. Combien de litres faut-il encore ajouter pour le remplir ?`, L * l * (h - w), {
      explanation: `Il reste un pavé de ${L} × ${l} × ${h - w} = ${L * l * (h - w)} dm³ à remplir, soit ${L * l * (h - w)} L.`,
    }), boxFig(L, l, h, { L: `${L} dm`, l: `${l} dm`, h: `${h} dm` }, w))
  },
)

// ═══ Palier 5 ═══════════════════════════════════════════════════════════
/** Solide composé : pavé surmonté d'un prisme (grange). */
function barnFig(L: number, l: number, h: number, t: number, labels: { L?: string; l?: string; h?: string; t?: string }): Figure {
  const d: Pt = [DEPTH[0] * l, DEPTH[1] * l]
  const P = (x: number, y: number, z: number): Pt => [x + d[0] * z, y + d[1] * z]
  const raw: Record<string, Pt> = { A: P(0, 0, 0), B: P(L, 0, 0), C: P(L, h, 0), D: P(0, h, 0), T: P(L / 2, h + t, 0), F: P(L, 0, 1), G: P(L, h, 1), U: P(L / 2, h + t, 1), M: P(L / 2, h, 0) }
  const mid = (p: Pt, q: Pt): Pt => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2]
  return build(raw, {
    segs: [{ a: 'A', b: 'B', label: labels.L }, { a: 'B', b: 'C', label: labels.h }, { a: 'C', b: 'T' }, { a: 'T', b: 'D' }, { a: 'D', b: 'A' }, { a: 'B', b: 'F' }, { a: 'F', b: 'G' }, { a: 'C', b: 'G' }, { a: 'G', b: 'U' }, { a: 'T', b: 'U' }, { a: 'D', b: 'C', dashed: true }, { a: 'T', b: 'M', dashed: true, color: RED }],
    polys: [{ pts: ['A', 'B', 'C', 'T', 'D'], fill: FILL }, { pts: ['B', 'F', 'G', 'C'], fill: '#c99a45' }, { pts: ['C', 'G', 'U', 'T'], fill: '#b0703a' }],
    hidden: Object.keys(raw),
    notes: [...(labels.l ? [{ at: mid(raw.B, raw.F), text: labels.l, dx: 22, dy: 4 }] : []), ...(labels.t ? [{ at: [L / 2, h + t / 2] as Pt, text: labels.t, dx: 18 }] : [])],
  })
}
const p5Solids: Maker = variants(
  () => {
    const L = 2 * randInt(2, 5), l = randInt(4, 10), h = randInt(2, 5), t = randInt(1, 4)
    return fig(numeric(`Une grange est formée d'un pavé droit de ${L} m × ${l} m × ${h} m surmonté d'un toit en forme de prisme droit : ses faces avant et arrière sont des triangles de base ${L} m et de hauteur ${t} m. Quel est le volume de la grange (en m³) ?`, L * l * h + ((L * t) / 2) * l, {
      explanation: `Pavé : ${L} × ${l} × ${h} = ${L * l * h} m³. Toit : (${L} × ${t} ÷ 2) × ${l} = ${(L * t) / 2} × ${l} = ${((L * t) / 2) * l} m³. Total : ${L * l * h + ((L * t) / 2) * l} m³.`,
    }), barnFig(L, l, h, t, { L: `${L} m`, l: `${l} m`, h: `${h} m`, t: `${t} m` }))
  },
  () => {
    const L = randInt(6, 12), H = randInt(5, 10), a = randInt(2, L - 3), b = randInt(2, H - 3), P = randInt(2, 8)
    const base = L * b + a * (H - b)
    const raw: Record<string, Pt> = { A: [0, 0], B: [L, 0], C: [L, b], D: [a, b], E: [a, H], F: [0, H] }
    return fig(numeric(`Une marche d'escalier est un prisme droit de ${P} dm de long, dont la base est la figure en L ci-dessous (angles droits) : ${L} dm de large, ${H} dm de haut, branche verticale de ${a} dm de large, branche horizontale de ${b} dm de haut. Quel est son volume (en dm³) ?`, base * P, {
      explanation: `Aire de la base : ${L} × ${b} + ${a} × ${H - b} = ${L * b} + ${a * (H - b)} = ${base} dm². Volume = aire de la base × longueur = ${base} × ${P} = ${base * P} dm³.`,
    }), build(raw, { segs: [{ a: 'A', b: 'B', label: `${L} dm` }, { a: 'B', b: 'C', label: `${b} dm` }, { a: 'C', b: 'D' }, { a: 'D', b: 'E' }, { a: 'E', b: 'F', label: `${a} dm` }, { a: 'F', b: 'A', label: `${H} dm` }], hidden: Object.keys(raw), polys: [{ pts: Object.keys(raw), fill: FILL }] }))
  },
  () => {
    const c = randInt(2, 6), r = 1
    return fig(numeric(`Un cube de ${2 * c} cm d'arête est percé de part en part d'un trou cylindrique de rayon ${r} cm, perpendiculaire à une face. Quel volume de matière reste-t-il (en cm³) ? Prends π ≈ 3,14.`, r6(8 * c * c * c - PI * r * r * 2 * c), {
      explanation: `Cube : ${2 * c} × ${2 * c} × ${2 * c} = ${8 * c * c * c} cm³. Trou : cylindre de rayon ${r} cm et de hauteur ${2 * c} cm : 3,14 × ${r * r} × ${2 * c} = ${f(PI * r * r * 2 * c)} cm³. Reste : ${f(8 * c * c * c - PI * r * r * 2 * c)} cm³.`,
    }), boxFig(2 * c, 2 * c, 2 * c, { L: `${2 * c} cm` }))
  },
)

const p5Inverse: Maker = variants(
  fresh(() => {
    const L = randInt(4, 12), l = randInt(3, 10), x = randInt(2, 8)
    return fig(numeric(`Un rectangle a une largeur de ${l} cm. Si on allonge sa longueur de ${x} cm, son aire devient ${(L + x) * l} cm². Quelle était sa longueur au départ (en cm) ?`, L, {
      explanation: `Nouvelle longueur : ${(L + x) * l} ÷ ${l} = ${L + x} cm. Longueur de départ : ${L + x} − ${x} = ${L} cm.`,
    }), rectFig(L + x, l, { l: `${l} cm` }))
  }),
  fresh(() => retry(() => {
    const b = randInt(4, 12), h = randInt(2, 8), side = randInt(h + 1, h + 5)
    const h2 = (b * h) / side
    if (Math.abs(h2 * 10 - Math.round(h2 * 10)) > 1e-9) return null
    return fig(numeric(`Un parallélogramme a des côtés de ${b} cm et ${side} cm. La hauteur relative au côté de ${b} cm mesure ${h} cm. Combien mesure la hauteur relative au côté de ${side} cm (en cm) ?`, h2, {
      explanation: `Aire = ${b} × ${h} = ${b * h} cm². Avec l'autre côté comme base : hauteur = ${b * h} ÷ ${side} = ${fmt(h2)} cm.`,
    }), paraFig(b * 0.5, Math.sqrt(Math.max(0.1, side * side - h * h)) * 0.5, h * 0.5, { b: `${b} cm`, h: `${h} cm`, side: `${side} cm` }))
  })),
  fresh(() => {
    const L = randInt(3, 8), l = randInt(2, 6), h = randInt(2, 6), c = pick([1, 2])
    const V = L * l * h * c * c * c
    return fig(numeric(`Une caisse en pavé droit de ${L * c} dm × ${l * c} dm × ${h * c} dm est remplie de cubes de ${c} dm d'arête, sans vide. Combien de cubes contient-elle ?`, V / (c * c * c), {
      explanation: `On peut aligner ${L} cubes en longueur, ${l} en largeur et ${h} en hauteur : ${L} × ${l} × ${h} = ${L * l * h} cubes. (Ou : ${V} dm³ ÷ ${c * c * c} dm³.)`,
    }), boxFig(L, l, h, { L: `${L * c} dm`, l: `${l * c} dm`, h: `${h * c} dm` }))
  }),
)

function tilesEx(): Exercise {
    const L = randInt(3, 8), l = randInt(2, 6), c = pick([20, 25, 50])
    const n = (L * 100 / c) * (l * 100 / c)
    return fig(numeric(`On carrelle une pièce rectangulaire de ${L} m sur ${l} m avec des carreaux carrés de ${c} cm de côté. Combien de carreaux faut-il ?`, n, {
      explanation: `En longueur : ${L * 100} cm ÷ ${c} = ${(L * 100) / c} carreaux ; en largeur : ${l * 100} ÷ ${c} = ${(l * 100) / c}. Total : ${(L * 100) / c} × ${(l * 100) / c} = ${n} carreaux. (Ou : ${L * l} m² = ${L * l * 10000} cm², divisé par ${c * c} cm².)`,
    }), rectFig(L, l, { L: `${L} m`, l: `${l} m` }))
}
const p5Tiles: Maker = variants(
  tilesEx,
  () => {
    const L = randInt(20, 80), l = randInt(10, 50), p = randInt(2, 9)
    return fig(numeric(`Un champ rectangulaire de ${L} m sur ${l} m est semé de blé : il faut ${p} kg de graines pour 100 m². Combien de kilogrammes de graines faut-il ?`, (L * l * p) / 100, {
      explanation: `Aire : ${L} × ${l} = ${L * l} m², soit ${f((L * l) / 100)} fois 100 m². Graines : ${f((L * l) / 100)} × ${p} = ${f((L * l * p) / 100)} kg.`,
    }), rectFig(L, l, { L: `${L} m`, l: `${l} m` }))
  },
  () => {
    const L = randInt(4, 10), l = randInt(3, 6), h = 2 + randInt(0, 1) * 0.5, door = 2
    const walls = 2 * (L + l) * h - door
    const pot = pick([10, 12, 15]), n = Math.ceil(walls / pot - 1e-9)
    return numeric(`On repeint les quatre murs d'une salle de ${L} m sur ${l} m, haute de ${fmt(h)} m, sauf une porte de ${door} m². Un pot de peinture couvre ${pot} m². Combien de pots faut-il acheter au minimum ?`, n, {
      explanation: `Les murs forment un rectangle « déplié » de longueur 2 × (${L} + ${l}) = ${2 * (L + l)} m et de hauteur ${fmt(h)} m : ${2 * (L + l)} × ${fmt(h)} = ${fmt(2 * (L + l) * h)} m². Moins la porte : ${fmt(walls)} m². ${fmt(walls)} ÷ ${pot} ≈ ${fmt(Math.round((walls / pot) * 100) / 100)} : il faut ${n} pots.`,
    })
  },
  () => {
    const m2 = randInt(4, 40) * 5000, price = randInt(2, 6) * 100
    return numeric(`Un domaine a une superficie de ${big(m2)} m². On le vend ${price} écus l'hectare (1 ha = 10 000 m²). Quel est son prix (en écus) ?`, (m2 / 10000) * price, {
      explanation: `${big(m2)} m² = ${big(m2)} ÷ 10 000 = ${f(m2 / 10000)} ha. Prix : ${f(m2 / 10000)} × ${price} = ${f((m2 / 10000) * price)} écus.`,
    })
  },
)

const p5Scale: Maker = variants(
  () => {
    const k = pick([2, 3, 4])
    return numeric(`On multiplie par ${k} la longueur et la largeur d'un rectangle. Par combien son aire est-elle multipliée ?`, k * k, {
      explanation: `Nouvelle aire : (${k} × L) × (${k} × l) = ${k} × ${k} × L × l = ${k * k} × aire.`,
    })
  },
  () => {
    const k = pick([2, 3])
    return fig(numeric(`On multiplie par ${k} l'arête d'un cube. Par combien son volume est-il multiplié ?`, k * k * k, {
      explanation: `Nouveau volume : (${k} × a) × (${k} × a) × (${k} × a) = ${k * k * k} × a × a × a.`,
    }), boxFig(2, 2, 2))
  },
  () => {
    const k = pick([2, 3])
    return fig(numeric(`On multiplie par ${k} le rayon de la base d'un cylindre, sans changer sa hauteur. Par combien son volume est-il multiplié ?`, k * k, {
      explanation: `Volume = π × r × r × h : le rayon apparaît deux fois, donc le volume est multiplié par ${k} × ${k} = ${k * k}.`,
    }), cylFig(1, 2))
  },
  () => {
    const k = pick([2, 3, 4]), r = randInt(2, 6)
    return fig(numeric(`Un disque a un rayon de ${r} cm. Un autre disque a un rayon ${k} fois plus grand. Combien de fois l'aire du grand disque est-elle plus grande que celle du petit ?`, k * k, {
      explanation: `Aire = π × r × r. Le grand disque a pour aire π × (${k} × ${r}) × (${k} × ${r}) = ${k * k} × (π × ${r} × ${r}).`,
    }), diskFig(1, 'r', `${r} cm`))
  },
)

// ═══ Problèmes d'amélioration ═══════════════════════════════════════════
const up1: Maker[] = [
  () => withMeta(tilesEx(), { title: 'Le carrelage' }),
  () => {
    const L = randInt(5, 12), l = randInt(3, 6), h = 1 + randInt(0, 1) * 0.5
    return withMeta(numeric(`Une piscine en forme de pavé droit mesure ${L} m de long, ${l} m de large et ${fmt(h)} m de profondeur. Combien de litres d'eau faut-il pour la remplir ?`, L * l * h * 1000, {
      explanation: `Volume : ${L} × ${l} × ${fmt(h)} = ${fmt(L * l * h)} m³. 1 m³ = 1 000 L : ${fmt(L * l * h)} × 1 000 = ${fmt(L * l * h * 1000)} L.`,
    }), { title: 'La piscine', figure: boxFig(L, l, h * 2, { L: `${L} m`, l: `${l} m`, h: `${fmt(h)} m` }) })
  },
  () => {
    const L = randInt(20, 60), d = 2 * randInt(5, 15)
    return withMeta(numeric(`Un pré a la forme d'un rectangle de ${L} m sur ${d} m, prolongé d'un côté par un demi-disque de diamètre ${d} m. Quelle longueur de clôture faut-il pour l'entourer (en m) ? Prends π ≈ 3,14.`, r6(2 * L + d + (PI * d) / 2), {
      explanation: `Trois côtés du rectangle : ${L} + ${d} + ${L} = ${2 * L + d} m. Demi-cercle : 3,14 × ${d} ÷ 2 = ${f((PI * d) / 2)} m. Total : ${f(2 * L + d + (PI * d) / 2)} m.`,
    }), { title: 'La clôture du pré', figure: build({ A: [0, 0], B: [L / 8, 0], C: [L / 8, d / 8], D: [0, d / 8] }, { segs: [{ a: 'A', b: 'B', label: `${L} m` }, { a: 'D', b: 'A', label: `${d} m` }, { a: 'C', b: 'D' }, { a: 'B', b: 'C', dashed: true }], curves: [{ pts: arcPts([L / 8, d / 16], d / 16, -90, 90), color: '#3a2410', width: 1.8 }], hidden: ['A', 'B', 'C', 'D'], polys: [{ pts: ['A', 'B', 'C', 'D'], fill: '#7fb069' }] }) })
  },
]
const up2: Maker[] = [
  () => withMeta(houseEx(), { title: 'La façade' }),
  () => {
    const r = randInt(3, 8), h = randInt(8, 20)
    return withMeta(numeric(`Une citerne cylindrique a un diamètre de ${2 * r} dm et une hauteur de ${h} dm. Combien de litres d'eau peut-elle contenir ? Prends π ≈ 3,14.`, r6(PI * r * r * h), {
      explanation: `Rayon : ${r} dm. Volume : 3,14 × ${r} × ${r} × ${h} = ${f(PI * r * r * h)} dm³, soit ${f(PI * r * r * h)} L.`,
    }), { title: 'La citerne', figure: cylFig(1, h / r, { d: `${2 * r} dm`, h: `${h} dm` }) })
  },
  () => {
    const b = 2 * randInt(2, 5), t = randInt(2, 4), L = randInt(6, 15)
    return withMeta(numeric(`Le grenier d'une maison est un prisme droit couché : ses deux pignons sont des triangles de base ${b} m et de hauteur ${t} m, et il mesure ${L} m de long. Quel est le volume du grenier (en m³) ?`, ((b * t) / 2) * L, {
      explanation: `Aire d'un pignon : ${b} × ${t} ÷ 2 = ${(b * t) / 2} m². Volume : ${(b * t) / 2} × ${L} = ${((b * t) / 2) * L} m³.`,
    }), { title: 'Le grenier', figure: prismFig(b, b / 2, t, L * 0.5, { b: `${b} m`, ht: `${t} m`, L: `${L} m` }) })
  },
]
const up3: Maker[] = [
  () => withMeta(p4AreaMinus(), { title: 'La partie restante' }),
  () => {
    const r = pick([2, 5, 10]), hc = randInt(2, 6) * 10 / r
    // le fond du bac a pour aire k fois celle du disque : la hauteur finale est hc ÷ k
    const k = pick([2, 4, 5])
    const base = r6(PI * r * r * k)
    const V = r6(PI * r * r * hc)
    return withMeta(numeric(`Un récipient cylindrique de rayon ${r} cm est rempli d'eau sur ${fmt(hc)} cm de hauteur. On verse toute l'eau dans un bac en pavé droit dont le fond a une aire de ${f(base)} cm². Quelle hauteur l'eau atteint-elle dans le bac (en cm) ? Prends π ≈ 3,14.`, r6(V / base), {
      explanation: `Volume d'eau : 3,14 × ${r} × ${r} × ${fmt(hc)} = ${f(V)} cm³. Dans le bac : hauteur = ${f(V)} ÷ ${f(base)} = ${f(V / base)} cm.`,
    }), { title: 'Le transvasement', figure: cylFig(1, Math.max(1.2, hc / r), { r: `${r} cm`, h: `${fmt(hc)} cm` }) })
  },
  () => {
    const L = randInt(10, 20), H = randInt(8, 16), a = randInt(4, L - 4), b = randInt(3, H - 4), price = randInt(2, 6)
    const area = L * b + a * (H - b)
    const raw: Record<string, Pt> = { A: [0, 0], B: [L, 0], C: [L, b], D: [a, b], E: [a, H], F: [0, H] }
    return withMeta(numeric(`Un jardin en forme de L (angles droits) mesure ${L} m de large en bas et ${H} m de haut à gauche ; la branche horizontale a ${b} m de haut et la branche verticale ${a} m de large. On le recouvre de gazon à ${price} écus le m². Quel est le prix total (en écus) ?`, area * price, {
      explanation: `Aire : ${L} × ${b} + ${a} × ${H - b} = ${L * b} + ${a * (H - b)} = ${area} m². Prix : ${area} × ${price} = ${area * price} écus.`,
    }), { title: 'Le jardin en L', figure: build(raw, { segs: [{ a: 'A', b: 'B', label: `${L} m` }, { a: 'B', b: 'C', label: `${b} m` }, { a: 'C', b: 'D' }, { a: 'D', b: 'E' }, { a: 'E', b: 'F', label: `${a} m` }, { a: 'F', b: 'A', label: `${H} m` }], hidden: Object.keys(raw), polys: [{ pts: Object.keys(raw), fill: '#7fb069' }] }) })
  },
]

// ═══ Problèmes de l'hôtel de ville ══════════════════════════════════════
const age1: Maker[] = [
  () => {
    const L = randInt(6, 20), l = randInt(4, L - 1), g = pick([20, 25, 50]), who = prenom()
    return titled('Le potager', numeric(`Le potager rectangulaire de ${who} mesure ${L} m sur ${l} m. Un sachet de graines permet de semer ${g} m². Combien de sachets complets faut-il au minimum pour tout semer ?`, Math.ceil((L * l) / g), {
      explanation: `Aire : ${L} × ${l} = ${L * l} m². ${L * l} ÷ ${g} = ${f((L * l) / g)} : il faut ${Math.ceil((L * l) / g)} sachets${(L * l) % g ? ' (on arrondit au-dessus)' : ''}.`,
    }), rectFig(L, l, { L: `${L} m`, l: `${l} m` }))
  },
  () => {
    const d = 2 * randInt(2, 10), price = randInt(3, 8)
    return titled('Le bassin rond', numeric(`Le bassin rond du jardin du château a un diamètre de ${d} m. On veut poser une bordure de pierre tout autour, à ${price} écus le mètre. Quel sera le prix (en écus) ? Prends π ≈ 3,14.`, r6(PI * d * price), {
      explanation: `Longueur du cercle : 3,14 × ${d} = ${f(PI * d)} m. Prix : ${f(PI * d)} × ${price} = ${f(PI * d * price)} écus.`,
    }), diskFig(1, 'd', `${d} m`))
  },
  () => {
    const L = randInt(4, 8) * 10, l = randInt(3, 5) * 10, h = randInt(2, 4) * 10, p = pick([1, 2])
    const V = L * l * h
    return titled('La caisse de pommes', numeric(`Une caisse en pavé droit mesure ${L} cm × ${l} cm × ${h} cm. ${p === 1 ? 'Quel est son volume en litres' : 'On la remplit de jus de pommes jusqu’à la moitié de sa hauteur : combien de litres de jus contient-elle'} ? (1 L = 1 000 cm³)`, p === 1 ? V / 1000 : V / 2000, {
      explanation: `Volume : ${L} × ${l} × ${h} = ${V} cm³ = ${f(V / 1000)} L.${p === 2 ? ` La moitié : ${f(V / 2000)} L.` : ''}`,
    }), boxFig(L / 10, l / 10, h / 10, { L: `${L} cm`, l: `${l} cm`, h: `${h} cm` }, p === 2 ? h / 20 : undefined))
  },
]
const age2: Maker[] = [
  () => {
    const r = randInt(2, 5), h = randInt(8, 20)
    return titled('La tour ronde', numeric(`Le donjon est une tour cylindrique de ${2 * r} m de diamètre et ${h} m de haut. Quel est son volume (en m³) ? Prends π ≈ 3,14.`, r6(PI * r * r * h), {
      explanation: `Rayon : ${r} m. Aire de la base : 3,14 × ${r * r} = ${f(PI * r * r)} m². Volume : ${f(PI * r * r)} × ${h} = ${f(PI * r * r * h)} m³.`,
    }), cylFig(1, h / r, { d: `${2 * r} m`, h: `${h} m` }))
  },
  () => {
    const L = 2 * randInt(2, 5), l = randInt(4, 10), h = randInt(2, 4), t = randInt(1, 3)
    const V = L * l * h + ((L * t) / 2) * l
    return titled('Le grenier à blé', numeric(`Un grenier à blé est un pavé droit de ${L} m × ${l} m × ${h} m surmonté d'un toit en prisme droit (pignons triangulaires de base ${L} m et de hauteur ${t} m). Le blé remplit tout le grenier. Combien d'hectolitres de blé contient-il ? (1 m³ = 10 hL)`, V * 10, {
      explanation: `Pavé : ${L * l * h} m³. Toit : ${L} × ${t} ÷ 2 × ${l} = ${((L * t) / 2) * l} m³. Total : ${V} m³ = ${V * 10} hL.`,
    }), barnFig(L, l, h, t, { L: `${L} m`, l: `${l} m`, h: `${h} m`, t: `${t} m` }))
  },
  () => {
    const L = 2 * randInt(2, 4), l = randInt(3, 6), price = randInt(4, 12)
    const r = L / 2, area = r6(L * l + PI * r * r)
    return titled('Le tapis du château', numeric(`Un tapis est formé d'un rectangle de ${L} m sur ${l} m, terminé à chaque extrémité par un demi-disque de diamètre ${L} m. Le tisserand le vend ${price} écus le m². Quel est son prix (en écus) ? Prends π ≈ 3,14.`, r6(area * price), {
      explanation: `Rectangle : ${L * l} m². Les deux demi-disques forment un disque de rayon ${r} m : 3,14 × ${r * r} = ${f(PI * r * r)} m². Aire : ${f(area)} m². Prix : ${f(area)} × ${price} = ${f(area * price)} écus.`,
    }), build({ A: [0, 0], B: [l, 0], C: [l, L], D: [0, L] }, { segs: [{ a: 'A', b: 'B', label: `${l} m` }, { a: 'D', b: 'C' }, { a: 'D', b: 'A', dashed: true, label: `${L} m` }, { a: 'B', b: 'C', dashed: true }], curves: [{ pts: arcPts([l, r], r, -90, 90), color: '#3a2410', width: 1.8 }, { pts: arcPts([0, r], r, 90, 270), color: '#3a2410', width: 1.8 }], hidden: ['A', 'B', 'C', 'D'], polys: [{ pts: ['A', 'B', 'C', 'D'], fill: '#c0504d' }] }))
  },
]
const age3: Maker[] = [
  () => {
    const r = randInt(2, 4), L = randInt(10, 25)
    return titled('L’abreuvoir', numeric(`Un abreuvoir a la forme d'un demi-cylindre couché, de rayon ${r} dm et de longueur ${L} dm. Combien de litres d'eau contient-il quand il est plein ? Prends π ≈ 3,14.`, r6((PI * r * r * L) / 2), {
      explanation: `Un cylindre entier aurait pour volume 3,14 × ${r} × ${r} × ${L} = ${f(PI * r * r * L)} dm³. La moitié : ${f((PI * r * r * L) / 2)} dm³, soit ${f((PI * r * r * L) / 2)} L.`,
    }), build({ A: [0, 0], B: [2 * r, 0], C: [2 * r + DEPTH[0] * L * 0.4, DEPTH[1] * L * 0.4], D: [DEPTH[0] * L * 0.4, DEPTH[1] * L * 0.4], O: [r, 0], L1: polar(r, -55, [r, 0]), L2: polar(r, -55, [r + DEPTH[0] * L * 0.4, DEPTH[1] * L * 0.4]) }, {
      segs: [{ a: 'A', b: 'B', label: `${2 * r} dm` }, { a: 'A', b: 'D' }, { a: 'B', b: 'C', label: `${L} dm` }, { a: 'D', b: 'C' }, { a: 'L1', b: 'L2' }],
      curves: [{ pts: arcPts([r, 0], r, 180, 360), color: '#3a2410', width: 1.8 }, { pts: arcPts([r + DEPTH[0] * L * 0.4, DEPTH[1] * L * 0.4], r, 180, 360), color: '#3a2410', dashed: true, width: 1.4 }],
      hidden: ['A', 'B', 'C', 'D', 'O', 'L1', 'L2'],
    }))
  },
  () => {
    const L = randInt(6, 12) * 10, d = 2 * randInt(15, 35), q = randInt(0, 1)
    return titled('Le stade', numeric(q === 0
      ? `Le terrain d'un stade est formé d'un rectangle de ${L} m sur ${d} m et de deux demi-disques de diamètre ${d} m, un à chaque bout. Quelle est la longueur d'un tour du terrain (en m) ? Prends π ≈ 3,14.`
      : `Le terrain d'un stade est formé d'un rectangle de ${L} m sur ${d} m et de deux demi-disques de diamètre ${d} m, un à chaque bout. Quelle est l'aire du terrain (en m²) ? Prends π ≈ 3,14.`, q === 0 ? r6(2 * L + PI * d) : r6(L * d + PI * (d / 2) * (d / 2)), {
      explanation: q === 0
        ? `Deux lignes droites : 2 × ${L} = ${2 * L} m. Deux demi-cercles = un cercle : 3,14 × ${d} = ${f(PI * d)} m. Total : ${f(2 * L + PI * d)} m.`
        : `Rectangle : ${L} × ${d} = ${L * d} m². Deux demi-disques = un disque de rayon ${d / 2} m : 3,14 × ${(d / 2) * (d / 2)} = ${f(PI * (d / 2) * (d / 2))} m². Total : ${f(L * d + PI * (d / 2) * (d / 2))} m².`,
    }), stadiumFig(L / 10, d / 20, { L: `${L} m`, d: `${d} m` }))
  },
  () => {
    const r = randInt(3, 6), h = randInt(8, 15), seau = pick([10, 12, 15])
    const V = r6(PI * r * r * h)
    return titled('La citerne et les seaux', numeric(`Une citerne cylindrique a un rayon de ${r} dm et une hauteur de ${h} dm. On la vide avec un seau de ${seau} L. Combien de seaux pleins faut-il au minimum pour la vider entièrement ? Prends π ≈ 3,14.`, Math.ceil(V / seau - 1e-9), {
      explanation: `Volume : 3,14 × ${r} × ${r} × ${h} = ${f(V)} dm³ = ${f(V)} L. ${f(V)} ÷ ${seau} ≈ ${f(Math.round((V / seau) * 100) / 100)} : il faut ${Math.ceil(V / seau - 1e-9)} seaux (le dernier n'est pas plein).`,
    }), cylFig(1, h / r, { r: `${r} dm`, h: `${h} dm` }))
  },
]

export const CONTENT: SubjectContent | null = {
  tiers: [
    [p1Rect, p1Perim, p1Triangle, p1Conv],
    [p2Para, p2Circle, p2Disk, p2Box],
    [p3TriangleOut, p3Compose, p3Prism, p3Conv],
    [p4Cyl, p4PerimCompo, p4AreaMinus, p4Aquarium],
    [p5Solids, p5Inverse, p5Tiles, p5Scale],
  ],
  upgrades: [up1, up2, up3],
  age: [age1, age2, age3],
}
