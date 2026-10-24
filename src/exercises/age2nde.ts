// Problèmes de l'hôtel de ville (2nde) : niveaux 1-2-3 (1, 2, 3 points) par maison.
// Vrais problèmes : un titre, une situation, plusieurs étapes ; beaucoup de géométrie (Pythagore, Thalès,
// trigonométrie, aires, volumes, repère) mise au service des notions de 2nde.
import {
  F, expression, fmt, fraction, fracText, interval, numeric, pair, par, pick, poly, radical,
  randInt, randNonZero, shuffle, solutionSet, withMeta, xPlus,
  type Exercise, type Ladder,
} from './utils'
import { fitPoints, thalesFigure, type FigAngle, type FigSegment, type Figure, type LabelPos } from './figure'
import { deuxPrenoms, prenom } from './contexts'

// ── Aides locales ───────────────────────────────────────────────────────
type Raw = Record<string, [number, number]>
type Pt = [number, number]

const RED = '#b8362f'
const GOLD = '#d9a441'
const BLUE = '#5b8fc7'
const GREEN = '#6aa86a'
const AXIS = '#9c8a6c'

/** Problème titré, avec figure facultative. */
const T = (title: string, ex: Exercise, figure?: Figure): Exercise => withMeta(ex, figure ? { title, figure } : { title })

/** Relance le tirage tant qu'il ne donne pas des nombres « propres ». */
function retry<R>(gen: () => R | null | undefined | false): R {
  for (let i = 0; i < 3000; i++) {
    const r = gen()
    if (r) return r
  }
  throw new Error('Tirage impossible')
}

const r6 = (v: number) => Math.round(v * 1e6) / 1e6
/** Vrai si v a au plus d décimales. */
const isDec = (v: number, d = 2) => Math.abs(Math.round(v * 10 ** d) - v * 10 ** d) < 1e-6
const isInt = (v: number) => isDec(v, 0)

/** √n = k√m avec m sans facteur carré. */
function sqrtParts(n: number): [number, number] {
  let k = 1, m = n
  for (let d = 2; d * d <= m; d++) while (m % (d * d) === 0) { m /= d * d; k *= d }
  return [k, m]
}
const rootText = (n: number) => {
  const [k, m] = sqrtParts(n)
  return m === 1 ? fmt(k) : `${k === 1 ? '' : k}√${m}`
}
/** Réponse exacte √n : entier si n est un carré parfait, sinon a√b. */
function exactRoot(prompt: string, n: number, explanation: string): Exercise {
  const [k, m] = sqrtParts(n)
  return m === 1 ? numeric(prompt, k, { explanation }) : radical(prompt, k, m, { explanation })
}

const SUBS = '₀₁₂₃₄₅₆₇₈₉'
const sub = (n: number) => String(n).split('').map((d) => SUBS[Number(d)]).join('')
/** Point nommé avec ses coordonnées : A(2 ; −3). */
const P = (n: string, p: Pt) => `${n}(${fmt(p[0])} ; ${fmt(p[1])})`
const rp = (k: number): Pt => [randInt(-k, k), randInt(-k, k)]
const add = (a: Pt, b: Pt): Pt => [a[0] + b[0], a[1] + b[1]]
const subv = (a: Pt, b: Pt): Pt => [a[0] - b[0], a[1] - b[1]]
const mul = (k: number, a: Pt): Pt => [k * a[0], k * a[1]]
const det = (u: Pt, v: Pt) => u[0] * v[1] - u[1] * v[0]
const inBox = (p: Pt, k: number) => Math.abs(p[0]) <= k && Math.abs(p[1]) <= k
const lineEq = (m: number, p: number) => `y = ${poly([m, 'x'], [p, ''])}`

interface FreeOpts {
  segments?: FigSegment[]
  angles?: FigAngle[]
  polygons?: { pts: string[]; fill: string }[]
  /** Noms affichés (chaîne vide = pas de nom). */
  labels?: Record<string, string>
  pos?: Record<string, LabelPos>
  /** Points non dessinés (les clés commençant par _ le sont toujours). */
  hidden?: string[]
  notes?: { at: Pt; text: string }[]
  caption?: string
  w?: number
  h?: number
  /** Marge laissée autour de la figure (place pour les étiquettes). */
  margin?: number
  /** Étiquette du segment « AB » placée à l'opposé du point donné (au lieu de l'extérieur de la figure). */
  away?: Record<string, string>
}

/** Figure libre en coordonnées mathématiques, cadrée automatiquement. */
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
  return labelNotes(fig, o.away)
}

/**
 * Remplace les étiquettes des segments par des notes placées du côté extérieur de la figure (ou à l'opposé
 * du point indiqué dans `away`, clé « AB »), décalées selon la largeur du texte. Le rendu, lui, les centre
 * à 13 px du trait et ignore les points cachés, ce qui fait chevaucher les textes larges.
 */
function labelNotes(fig: Figure, away: Record<string, string> = {}): Figure {
  const w = fig.w ?? 320, h = fig.h ?? 220, pts = fig.points
  const all = Object.values(pts)
  const vis = all.filter((p) => !p.hidden).length >= 2 ? all.filter((p) => !p.hidden) : all
  const cx = vis.reduce((s, p) => s + p.x, 0) / Math.max(1, vis.length)
  const cy = vis.reduce((s, p) => s + p.y, 0) / Math.max(1, vis.length)
  const extra: { x: number; y: number; text: string }[] = []
  const segments = fig.segments?.map((s) => {
    const a = pts[s.a], b = pts[s.b]
    if (!s.label || !a || !b) return s
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1
    let nx = -(b.y - a.y) / len, ny = (b.x - a.x) / len
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2
    const ref = pts[away[s.a + s.b] ?? away[s.b + s.a] ?? ''] ?? { x: cx, y: cy }
    if ((mx - ref.x) * nx + (my - ref.y) * ny < 0) { nx = -nx; ny = -ny }
    const half = 3.9 * [...s.label].length
    const x = Math.min(w - half - 3, Math.max(half + 3, mx + nx * (Math.abs(nx) < 0.3 ? 13 : 9 + half)))
    extra.push({ x, y: Math.min(h - 4, Math.max(14, my + ny * 13 + 5)), text: s.label })
    return { ...s, label: undefined }
  })
  const notes = [...(fig.notes ?? []), ...extra]
  return { ...fig, segments, notes: notes.length ? notes : undefined }
}

/** Figure dans un repère orthonormé (axes gradués), avec droites y = mx + p éventuelles. */
function repere(raw: Raw, o: FreeOpts & { lines?: { m: number; p: number; color?: string; dashed?: boolean }[] } = {}): Figure {
  const vals = Object.values(raw)
  const xs = [0, ...vals.map((v) => v[0])], ys = [0, ...vals.map((v) => v[1])]
  const x0 = Math.floor(Math.min(...xs)) - 1, x1 = Math.ceil(Math.max(...xs)) + 1
  const y0 = Math.floor(Math.min(...ys)) - 1, y1 = Math.ceil(Math.max(...ys)) + 1
  const ext: Raw = { ...raw, _xa: [x0, 0], _xb: [x1, 0], _ya: [0, y0], _yb: [0, y1] }
  const hasOrigin = vals.some((v) => v[0] === 0 && v[1] === 0)
  if (!hasOrigin && !('O' in raw)) ext.O = [0, 0]
  const t = Math.max(x1 - x0, y1 - y0) * 0.016
  const segs: FigSegment[] = [{ a: '_xa', b: '_xb', color: AXIS }, { a: '_ya', b: '_yb', color: AXIS }]
  for (let k = x0 + 1; k < x1; k++) {
    if (!k) continue
    ext[`_tx${k}a`] = [k, -t]; ext[`_tx${k}b`] = [k, t]
    segs.push({ a: `_tx${k}a`, b: `_tx${k}b`, color: AXIS })
  }
  for (let k = y0 + 1; k < y1; k++) {
    if (!k) continue
    ext[`_ty${k}a`] = [-t, k]; ext[`_ty${k}b`] = [t, k]
    segs.push({ a: `_ty${k}a`, b: `_ty${k}b`, color: AXIS })
  }
  o.lines?.forEach((L, i) => {
    const cand: Pt[] = []
    for (const x of [x0, x1]) {
      const y = L.m * x + L.p
      if (y >= y0 - 1e-9 && y <= y1 + 1e-9) cand.push([x, y])
    }
    if (L.m !== 0) for (const y of [y0, y1]) {
      const x = (y - L.p) / L.m
      if (x >= x0 && x <= x1) cand.push([x, y])
    }
    cand.sort((a, b) => a[0] - b[0])
    if (cand.length >= 2) {
      ext[`_L${i}a`] = cand[0]; ext[`_L${i}b`] = cand[cand.length - 1]
      segs.push({ a: `_L${i}a`, b: `_L${i}b`, color: L.color ?? '#3a2410', dashed: L.dashed })
    }
  })
  // Noms des points situés sur une droite tracée : placés perpendiculairement à la droite.
  const linePos: Record<string, LabelPos> = {}
  const DIRS: LabelPos[] = ['e', 'ne', 'n', 'nw', 'w', 'sw', 's', 'se']
  for (const [k, v] of Object.entries(raw)) {
    const L = o.lines?.find((l) => Math.abs(v[1] - (l.m * v[0] + l.p)) < 1e-6)
    if (!L) continue
    const ang = Math.atan2(1, -L.m) // normale (−m ; 1), côté « au-dessus » de la droite
    linePos[k] = DIRS[Math.round(((ang + 2 * Math.PI) % (2 * Math.PI)) / (Math.PI / 4)) % 8]
  }
  const fig = free(ext, {
    ...o, segments: [...segs, ...(o.segments ?? [])], pos: { O: 'sw', ...linePos, ...o.pos },
    caption: o.caption ?? 'Repère orthonormé.', w: o.w ?? 320, h: o.h ?? 250, margin: o.margin ?? 30,
  })
  const xb = fig.points._xb, yb = fig.points._yb
  fig.notes = [...(fig.notes ?? []), { x: xb.x + 9, y: xb.y + 5, text: 'x' }, { x: yb.x, y: yb.y - 7, text: 'y' }]
  if (vals.some((v) => Math.hypot(v[0], v[1]) < 1.5) && fig.points.O) fig.points.O.label = ''
  return fig
}

/** Pavé droit ABCDEFGH en perspective (ABCD en bas, E au-dessus de A…). */
function boxFig(a: number, b: number, c: number, lab: { AB?: string; BC?: string; AE?: string }, diag = false): Figure {
  const M = Math.max(a, b, c), s = (v: number) => Math.max(v, 0.45 * M)
  const A0 = s(a), B0 = s(b), C0 = s(c)
  const ox = B0 * 0.62, oy = B0 * 0.42
  const raw: Raw = {
    A: [0, 0], B: [A0, 0], C: [A0 + ox, oy], D: [ox, oy],
    E: [0, C0], F: [A0, C0], G: [A0 + ox, C0 + oy], H: [ox, C0 + oy],
  }
  const segments: FigSegment[] = [
    { a: 'A', b: 'B', label: lab.AB }, { a: 'B', b: 'F' }, { a: 'F', b: 'E' }, { a: 'E', b: 'A', label: lab.AE },
    { a: 'B', b: 'C', label: lab.BC }, { a: 'C', b: 'G' }, { a: 'G', b: 'F' }, { a: 'E', b: 'H' }, { a: 'H', b: 'G' },
    { a: 'A', b: 'D', dashed: true }, { a: 'D', b: 'C', dashed: true }, { a: 'D', b: 'H', dashed: true },
  ]
  if (diag) segments.push({ a: 'A', b: 'C', dashed: true, color: BLUE }, { a: 'A', b: 'G', color: RED })
  return free(raw, { segments, pos: { A: 'sw', B: 's', C: 'se', D: 'nw', E: 'nw', F: 'sw', G: 'ne', H: 'n' } })
}

/** Rectangle (ou carré) entouré d'un cadre : contour extérieur W × H, épaisseur t. */
function frameFig(W: number, H: number, t: number, lab: { inner?: string; innerV?: string; outer?: string; thick?: string }, fill = GOLD): Figure {
  const raw: Raw = {
    _o1: [0, 0], _o2: [W, 0], _o3: [W, H], _o4: [0, H],
    _i1: [t, t], _i2: [W - t, t], _i3: [W - t, H - t], _i4: [t, H - t],
    _k1: [W - t, H / 2], _k2: [W, H / 2],
  }
  const segments: FigSegment[] = [
    { a: '_o1', b: '_o2', label: lab.outer }, { a: '_o2', b: '_o3' }, { a: '_o3', b: '_o4' }, { a: '_o4', b: '_o1' },
    { a: '_i1', b: '_i2', label: lab.inner }, { a: '_i2', b: '_i3' }, { a: '_i3', b: '_i4' }, { a: '_i4', b: '_i1', label: lab.innerV },
  ]
  if (lab.thick) segments.push({ a: '_k1', b: '_k2', label: lab.thick, color: RED })
  return free(raw, {
    segments,
    polygons: [
      { pts: ['_o1', '_o2', '_i2', '_i1'], fill }, { pts: ['_o2', '_o3', '_i3', '_i2'], fill },
      { pts: ['_o3', '_o4', '_i4', '_i3'], fill }, { pts: ['_o4', '_o1', '_i1', '_i4'], fill },
    ],
  })
}

/** Plaque carrée dont on découpe un carré à chaque coin (boîte sans couvercle). */
function sheetFig(s: number): Figure {
  const c = 1.1, L = 6
  const raw: Raw = {
    _a: [0, 0], _b: [L, 0], _c: [L, L], _d: [0, L],
    _p1: [c, 0], _p2: [c, c], _p3: [0, c], _q1: [L - c, 0], _q2: [L - c, c], _q3: [L, c],
    _r1: [L, L - c], _r2: [L - c, L - c], _r3: [L - c, L], _s1: [c, L], _s2: [c, L - c], _s3: [0, L - c],
  }
  return free(raw, {
    segments: [
      { a: '_a', b: '_b', label: `${s} cm` }, { a: '_b', b: '_c' }, { a: '_c', b: '_d' }, { a: '_d', b: '_a' },
      { a: '_p2', b: '_q2', dashed: true }, { a: '_q2', b: '_r2', dashed: true }, { a: '_r2', b: '_s2', dashed: true }, { a: '_s2', b: '_p2', dashed: true },
      { a: '_p1', b: '_p2' }, { a: '_p2', b: '_p3' }, { a: '_q1', b: '_q2' }, { a: '_q2', b: '_q3' },
      { a: '_r1', b: '_r2' }, { a: '_r2', b: '_r3' }, { a: '_s1', b: '_s2' }, { a: '_s2', b: '_s3' },
      { a: '_d', b: '_s3', label: 'x' },
    ],
    polygons: [
      { pts: ['_a', '_p1', '_p2', '_p3'], fill: RED }, { pts: ['_b', '_q3', '_q2', '_q1'], fill: RED },
      { pts: ['_c', '_r3', '_r2', '_r1'], fill: RED }, { pts: ['_d', '_s3', '_s2', '_s1'], fill: RED },
    ],
    caption: 'Les carrés rouges sont découpés, puis on replie les bords le long des pointillés.',
  })
}

const THALES_NAMES = [
  { A: 'A', M: 'M', N: 'N', B: 'B', C: 'C' },
  { A: 'O', M: 'R', N: 'S', B: 'T', C: 'U' },
  { A: 'S', M: 'E', N: 'F', B: 'G', C: 'H' },
  { A: 'K', M: 'L', N: 'P', B: 'Q', C: 'R' },
]

// ═════════════════════════════════════════════════════════════════════════
// 2-nombres : puissances, racines carrées, intervalles, notation scientifique
// ═════════════════════════════════════════════════════════════════════════
const nombres: Ladder = [
  [
    // La diagonale : Pythagore → a√b
    () => retry(() => {
      const a = randInt(3, 12), b = randInt(2, 10)
      if (a === b || a / b > 3 || b / a > 3) return null
      const n = a * a + b * b, [k, m] = sqrtParts(n)
      if (m === 1 || k === 1) return null
      const c = pick([
        { t: 'La haie du verger', u: 'm', s: `Un verger rectangulaire mesure ${a} m sur ${b} m. Le jardinier veut planter une haie le long d'une de ses diagonales.` },
        { t: 'La traversée du terrain', u: 'm', s: `Un terrain de jeu rectangulaire mesure ${a} m sur ${b} m. ${prenom()} le traverse en ligne droite, d'un coin au coin opposé.` },
        { t: 'Le galon de la tapisserie', u: 'dm', s: `Une tapisserie rectangulaire du château mesure ${a} dm sur ${b} dm. On veut coudre un galon doré le long de sa diagonale.` },
        { t: 'Le pont du navire', u: 'm', s: `Le pont d'un navire a la forme d'un rectangle de ${a} m sur ${b} m. Un mousse le traverse en diagonale.` },
      ])
      const hb = Math.min(2 * a, Math.max(0.45 * a, b))
      const fig = free({ A: [0, 0], B: [a, 0], C: [a, hb], D: [0, hb] }, {
        segments: [
          { a: 'A', b: 'B', label: `${a} ${c.u}` }, { a: 'B', b: 'C', label: `${b} ${c.u}` }, { a: 'C', b: 'D' }, { a: 'D', b: 'A' },
          { a: 'A', b: 'C', color: RED, label: '?' },
        ],
        angles: [{ vertex: 'B', a: 'A', b: 'C', right: true }],
      })
      return T(c.t, radical(`${c.s} Calcule la longueur exacte de cette diagonale (en ${c.u}), sous la forme a√b avec b le plus petit possible.`, k, m, {
        explanation: `Dans le triangle ABC rectangle en B : AC² = ${a}² + ${b}² = ${n}. Donc AC = √${n} = √(${k * k} × ${m}) = ${k}√${m} ${c.u}.`,
      }), fig)
    }),
    // La cour carrée : côté = √A, périmètre ou diagonale exacts
    () => {
      const k = randInt(2, 9), m = pick([2, 3, 5, 6, 7]), A = k * k * m
      const lieuC = pick(['La cour carrée du donjon', 'Une salle d’entraînement carrée', 'Un potager carré', 'Le plateau carré d’un jeu d’échecs géant'])
      const fig = (diag: boolean) => free({ A: [0, 0], B: [1, 0], C: [1, 1], D: [0, 1] }, {
        segments: [
          { a: 'A', b: 'B', label: diag ? undefined : 'côté ?' }, { a: 'B', b: 'C' }, { a: 'C', b: 'D' }, { a: 'D', b: 'A' },
          ...(diag ? [{ a: 'A', b: 'C', color: RED, dashed: true }] : []),
        ],
        polygons: [{ pts: ['A', 'B', 'C', 'D'], fill: GOLD }],
        notes: [{ at: [0.5, diag ? 0.7 : 0.5], text: `${A} m²` }],
        hidden: ['A', 'B', 'C', 'D'],
      })
      if (Math.random() < 0.5) {
        return T('Le tour de la cour', radical(`${lieuC} a une aire de ${A} m². Donne la valeur exacte de son périmètre (en m), sous la forme a√b.`, 4 * k, m, {
          explanation: `Côté = √${A} = √(${k * k} × ${m}) = ${k}√${m} m. Périmètre = 4 × ${k}√${m} = ${4 * k}√${m} m.`,
        }), fig(false))
      }
      const n = 2 * A
      return T('La diagonale de la cour', exactRoot(`${lieuC} a une aire de ${A} m². Donne la valeur exacte de la longueur de sa diagonale (en m), sous la forme la plus simple.`, n,
        `Si c est le côté, c² = ${A}. Par Pythagore, diagonale² = c² + c² = 2 × ${A} = ${n}, donc diagonale = √${n} = ${rootText(n)} m.`), fig(true))
    },
    // Les objets minuscules : notation scientifique
    () => retry(() => {
      const o = pick([
        { nom: 'globules rouges', un: 'Un globule rouge a un diamètre d’environ', m: 7, e: -6 },
        { nom: 'bactéries', un: 'Une bactérie mesure environ', m: 2, e: -6 },
        { nom: 'cheveux', un: 'Un cheveu a une épaisseur d’environ', m: 8, e: -5 },
        { nom: 'grains de pollen', un: 'Un grain de pollen mesure environ', m: 2.5, e: -5 },
        { nom: 'grains de sable fin', un: 'Un grain de sable fin mesure environ', m: 1.5, e: -4 },
      ])
      const count = pick([500, 1000, 1500, 2000, 2500, 3000, 4000, 5000, 8000, 10000, 20000, 50000])
      const Lcm = r6(count * o.m * 10 ** o.e * 100)
      if (!isDec(Lcm, 2) || Lcm < 0.5 || Lcm > 60) return null
      return T('L’infiniment petit', numeric(`${o.un} ${fmt(o.m)} × 10^{${fmt(o.e)}} m. Combien de ${o.nom} faudrait-il aligner côte à côte pour former une ligne de ${fmt(Lcm)} cm ?`, count, {
        explanation: `${fmt(Lcm)} cm = ${fmt(Lcm)} × 10^{−2} m. Puis (${fmt(Lcm)} × 10^{−2}) ÷ (${fmt(o.m)} × 10^{${fmt(o.e)}}) = ${fmt(r6(Lcm / o.m))} × 10^{${fmt(-2 - o.e)}} = ${count}.`,
      }))
    }),
    // Le chemin de ronde : valeur absolue et intervalles
    () => {
      const c = randInt(-30, 40), r = randInt(6, 30), f = randInt(c - r + 2, c + r - 2)
      const ctx = pick([
        { t: 'Le poste de l’archer', s: `Sur un chemin rectiligne gradué en mètres, la tour de guet est au point d'abscisse ${fmt(c)}. Un archer doit rester à au plus ${r} m de la tour`, who: "l'archer" },
        { t: 'Le drone du phare', s: `Le long d'une côte rectiligne graduée en mètres, un phare est au point d'abscisse ${fmt(c)}. Un drone doit rester à au plus ${r} m du phare pour garder le signal`, who: 'le drone' },
        { t: 'Le robot explorateur', s: `Sur une piste rectiligne graduée en mètres, la base est au point d'abscisse ${fmt(c)}. Un robot doit rester à au plus ${r} m de la base`, who: 'le robot' },
      ])
      const after = Math.random() < 0.5
      const I = after ? { lo: f, hi: c + r, loClosed: false, hiClosed: true } : { lo: c - r, hi: f, loClosed: true, hiClosed: false }
      return T(ctx.t, interval(`${ctx.s} : |${xPlus(-c)}| ≤ ${r}. De plus, ${after ? `une zone marécageuse occupe toutes les abscisses x ≤ ${fmt(f)}` : `une rivière occupe toutes les abscisses x ≥ ${fmt(f)}`}, où il ne peut pas aller. Donne l'ensemble des positions x possibles pour ${ctx.who}, sous forme d'intervalle.`, I, {
        explanation: `|${xPlus(-c)}| ≤ ${r} ⇔ ${fmt(c - r)} ≤ x ≤ ${fmt(c + r)}, soit [${fmt(c - r)} ; ${fmt(c + r)}]. Avec ${after ? `x > ${fmt(f)}` : `x < ${fmt(f)}`}, il reste ${after ? `]${fmt(f)} ; ${fmt(c + r)}]` : `[${fmt(c - r)} ; ${fmt(f)}[`}.`,
      }))
    },
    // Le disque dur : puissances de 10
    () => retry(() => {
      const v = pick([
        { t: 'Le disque dur plein de photos', cap: 'un disque dur de', cu: 'To', ce: 12, obj: 'photos', ou: 'Mo', oe: 6, verb: 'Une photo pèse en moyenne' },
        { t: 'La clé de musique', cap: 'une clé USB de', cu: 'Go', ce: 9, obj: 'chansons', ou: 'Mo', oe: 6, verb: 'Une chanson pèse en moyenne' },
        { t: 'Le serveur de vidéos', cap: 'un serveur de', cu: 'To', ce: 12, obj: 'films', ou: 'Go', oe: 9, verb: 'Un film pèse en moyenne' },
      ])
      const a = pick([1, 2, 4, 5, 8, 16, 32, 64]), b = pick([2, 2.5, 4, 5, 8])
      const count = r6((a / b) * 10 ** (v.ce - v.oe))
      if (!isInt(count)) return null
      return T(v.t, numeric(`${prenom()} possède ${v.cap} ${a} ${v.cu} (1 ${v.cu} = 10^{${v.ce}} octets). ${v.verb} ${fmt(b)} ${v.ou} (1 ${v.ou} = 10^${v.oe} octets). Combien de ${v.obj} peut-on y stocker au maximum ?`, count, {
        explanation: `${a} × 10^{${v.ce}} ÷ (${fmt(b)} × 10^${v.oe}) = ${fmt(a / b)} × 10^{${v.ce - v.oe}} = ${count}.`,
      }))
    }),
  ],
  [
    // La voile : côtés en √, Pythagore, périmètre exact
    () => {
      const [p0, q0, r] = pick([[3, 4, 5], [6, 8, 10], [5, 12, 13]])
      const m = pick([2, 3, 5, 6, 7])
      const [p, q] = Math.random() < 0.5 ? [p0, q0] : [q0, p0]
      const c = pick([
        { t: 'La voile du drakkar', s: 'La voile triangulaire ABC d’un drakkar' },
        { t: 'Le fanion du tournoi', s: 'Un grand fanion triangulaire ABC' },
        { t: 'La rampe de skate', s: 'Le flanc triangulaire ABC d’une rampe de skate' },
      ])
      const fig = free({ A: [0, 0], B: [p, 0], C: [0, Math.min(2 * p, Math.max(0.5 * p, q))] }, {
        segments: [{ a: 'A', b: 'B', label: `√${p * p * m} m` }, { a: 'A', b: 'C', label: `√${q * q * m} m` }, { a: 'B', b: 'C', label: '?' }],
        angles: [{ vertex: 'A', a: 'B', b: 'C', right: true }],
      })
      return T(c.t, radical(`${c.s} est rectangle en A, avec AB = √{${p * p * m}} m et AC = √{${q * q * m}} m. Calcule la valeur exacte de son périmètre, sous la forme a√b.`, p + q + r, m, {
        explanation: `AB = √(${p * p} × ${m}) = ${p}√${m} et AC = ${q}√${m}. Pythagore : BC² = ${p * p * m} + ${q * q * m} = ${r * r * m}, donc BC = ${r}√${m}. Périmètre = (${p} + ${q} + ${r})√${m} = ${p + q + r}√${m} m.`,
      }), fig)
    },
    // Triangle équilatéral / hexagone : hauteur k√3, aire exacte
    () => {
      const k = randInt(2, 6), a = 2 * k
      if (Math.random() < 0.5) {
        const fig = free({ A: [0, 0], B: [2, 0], C: [1, Math.sqrt(3)], H: [1, 0] }, {
          segments: [{ a: 'A', b: 'B' }, { a: 'B', b: 'C', label: `${a} dm` }, { a: 'C', b: 'A' }, { a: 'C', b: 'H', dashed: true, color: RED }],
          angles: [{ vertex: 'H', a: 'B', b: 'C', right: true }],
          pos: { H: 's' },
        })
        return T('Le panneau triangulaire', radical(`Un panneau de signalisation est un triangle équilatéral ABC de côté ${a} dm. Calcule la valeur exacte de son aire (en dm²), sous la forme a√b. (Pense à la hauteur [CH].)`, k * k, 3, {
          explanation: `H est le milieu de [AB], donc AH = ${k}. Pythagore dans ACH : CH² = ${a}² − ${k}² = ${3 * k * k}, donc CH = ${k}√3. Aire = ${a} × ${k}√3 ÷ 2 = ${k * k}√3 dm².`,
        }), fig)
      }
      const raw: Raw = { O: [0, 0] }
      for (let i = 0; i < 6; i++) raw[`_h${i}`] = [Math.cos((i * Math.PI) / 3), Math.sin((i * Math.PI) / 3)]
      raw._m = [0.75, -Math.sqrt(3) / 4]
      const fig = free(raw, {
        segments: [
          ...[0, 1, 2, 3, 4, 5].map((i) => ({ a: `_h${i}`, b: `_h${(i + 1) % 6}`, label: i === 5 ? `${a} cm` : undefined })),
          ...[0, 1, 2, 3, 4, 5].map((i) => ({ a: 'O', b: `_h${i}`, dashed: true })),
        ],
        polygons: [{ pts: ['O', '_h5', '_h0'], fill: GOLD }],
        labels: { O: '' },
      })
      return T('Le pavé hexagonal', radical(`Un pavé de la place du marché est un hexagone régulier de côté ${a} cm : il est formé de six triangles équilatéraux de côté ${a} cm. Calcule la valeur exacte de son aire (en cm²), sous la forme a√b.`, 6 * k * k, 3, {
        explanation: `Hauteur d'un triangle : √(${a}² − ${k}²) = √${3 * k * k} = ${k}√3. Aire d'un triangle : ${a} × ${k}√3 ÷ 2 = ${k * k}√3. Hexagone : 6 × ${k * k}√3 = ${6 * k * k}√3 cm².`,
      }), fig)
    },
    // Voyage spatial : notation scientifique et durée
    () => retry(() => {
      const D = randInt(5, 40) * 10, b = randInt(2, 6)
      const d = D * 24 * b * 1e4
      const e = Math.floor(Math.log10(d)), mant = r6(d / 10 ** e)
      if (!isDec(mant, 2)) return null
      const dest = pick(['Mars', 'un astéroïde', 'une comète', 'Vénus', 'une station lointaine'])
      return T('Le voyage de la sonde', numeric(`Une sonde spatiale doit parcourir ${fmt(mant)} × 10^${e} km pour atteindre ${dest}. Elle file à la vitesse constante de ${b} × 10^4 km/h. Combien de jours dure le voyage ?`, D, {
        explanation: `Durée = ${fmt(mant)} × 10^${e} ÷ (${b} × 10^4) = ${fmt(r6(mant / b))} × 10^${e - 4} = ${D * 24} h, soit ${D * 24} ÷ 24 = ${D} jours.`,
      }))
    }),
    // Deux conditions avec valeurs absolues
    () => retry(() => {
      const a = randInt(-10, 10), r = randInt(3, 9), b = a + randInt(3, 12), s = randInt(2, 9)
      if (!(b - s > a - r && b - s < a + r && a + r < b + s)) return null
      const [n1, n2] = deuxPrenoms()
      return T('Entre le château et la ferme', interval(`Sur une route droite graduée en km, le château est à l'abscisse ${fmt(a)} et la ferme à l'abscisse ${fmt(b)}. Le messager ${n1} doit rester à au plus ${r} km du château (|${xPlus(-a)}| ≤ ${r}) et à strictement moins de ${s} km de la ferme, où l'attend ${n2} (|${xPlus(-b)}| < ${s}). Donne l'ensemble des positions x possibles, sous forme d'intervalle.`,
        { lo: b - s, hi: a + r, loClosed: false, hiClosed: true }, {
          explanation: `|${xPlus(-a)}| ≤ ${r} ⇔ x ∈ [${fmt(a - r)} ; ${fmt(a + r)}] ; |${xPlus(-b)}| < ${s} ⇔ x ∈ ]${fmt(b - s)} ; ${fmt(b + s)}[. Intersection : ]${fmt(b - s)} ; ${fmt(a + r)}].`,
        }))
    }),
    // Le pliage : puissances de 2
    () => {
      const tg = pick([
        { nom: 'l’épaisseur d’un dictionnaire (8 cm)', mm: 80 },
        { nom: 'la hauteur d’une porte (2 m)', mm: 2000 },
        { nom: 'la hauteur d’un immeuble de 30 m', mm: 30000 },
        { nom: 'la hauteur de la tour Eiffel (330 m)', mm: 330000 },
        { nom: 'l’altitude du mont Blanc (4 810 m)', mm: 4810000 },
      ])
      const e = pick([0.1, 0.08, 0.05])
      const ratio = r6(tg.mm / e)
      let n = 0
      while (2 ** n <= ratio) n++
      return T('Le pliage impossible', numeric(`Une feuille de papier a une épaisseur de ${fmt(e)} mm. À chaque pliage en deux, son épaisseur double. Si l'on pouvait la plier autant de fois qu'on veut, combien de pliages faudrait-il au minimum pour que l'épaisseur dépasse ${tg.nom} ? (Aide : 2^{10} = 1 024.)`, n, {
        explanation: `Après n pliages, l'épaisseur vaut ${fmt(e)} × 2^n mm. Il faut 2^n > ${fmt(tg.mm)} ÷ ${fmt(e)} = ${fmt(ratio)}. Or 2^{${n - 1}} = ${2 ** (n - 1)} ne suffit pas et 2^{${n}} = ${2 ** n} convient : ${n} pliages.`,
      }))
    },
    // La rampe : trigonométrie et valeurs exactes
    () => {
      const ang = pick([30, 45, 60]), k = randInt(2, 9), L = 2 * k
      const trig = ang === 30 ? `sin 30° = ${F(1, 2)} et cos 30° = ${F('√3', 2)}` : ang === 60 ? `sin 60° = ${F('√3', 2)} et cos 60° = ${F(1, 2)}` : `sin 45° = cos 45° = ${F('√2', 2)}`
      // côté irrationnel demandé
      const askH = ang === 60 || (ang === 45 && Math.random() < 0.5)
      const m = ang === 45 ? 2 : 3
      const rad = (ang * Math.PI) / 180
      const fig = free({ A: [0, 0], H: [Math.cos(rad) * L, 0], S: [Math.cos(rad) * L, Math.sin(rad) * L] }, {
        segments: [
          { a: 'A', b: 'H', label: askH ? undefined : '?', color: askH ? undefined : RED },
          { a: 'H', b: 'S', label: askH ? '?' : undefined, color: askH ? RED : undefined },
          { a: 'A', b: 'S', label: `${L} m` },
        ],
        angles: [{ vertex: 'A', a: 'H', b: 'S', label: `${ang}°` }, { vertex: 'H', a: 'A', b: 'S', right: true }],
      })
      const what = askH ? 'la hauteur HS atteinte au sommet' : 'la longueur AH couverte au sol'
      const fn = askH ? 'sin' : 'cos'
      return T('La rampe du pont-levis', radical(`Une rampe [AS] d'accès au pont-levis mesure ${L} m et fait un angle de ${ang}° avec le sol horizontal. Calcule la valeur exacte de ${what} (en m), sous la forme a√b. On rappelle que ${trig}.`, k, m, {
        explanation: `Dans le triangle AHS rectangle en H : ${askH ? 'HS' : 'AH'} = AS × ${fn} ${ang}° = ${L} × ${F(`√${m}`, 2)} = ${k}√${m} m.`,
      }), fig)
    },
  ],
  [
    // La diagonale du coffre : Pythagore dans l'espace
    () => retry(() => {
      const a = randInt(2, 9), b = randInt(1, 7), c = randInt(2, 8)
      const n = a * a + b * b + c * c, [k, m] = sqrtParts(n)
      if (m === 1 || k === 1) return null
      const ctx = pick([
        { t: 'La baguette dans le coffre', s: 'Un coffre a la forme d’un pavé droit ABCDEFGH', u: 'dm', q: 'la longueur de la plus longue baguette rectiligne que l’on peut y ranger, de A à G' },
        { t: 'Le rayon laser', s: 'Une salle de jeu laser a la forme d’un pavé droit ABCDEFGH', u: 'm', q: 'la longueur du rayon laser tendu du coin A au coin G' },
        { t: 'La canne du magicien', s: 'Une boîte de rangement a la forme d’un pavé droit ABCDEFGH', u: 'dm', q: 'la longueur de la plus grande canne rectiligne qui tient dans la boîte, de A à G' },
      ])
      return T(ctx.t, radical(`${ctx.s} avec AB = ${a} ${ctx.u}, BC = ${b} ${ctx.u} et AE = ${c} ${ctx.u}. Calcule ${ctx.q}. Donne la valeur exacte sous la forme a√b.`, k, m, {
        explanation: `ABC est rectangle en B : AC² = ${a}² + ${b}² = ${a * a + b * b}. ACG est rectangle en C : AG² = AC² + CG² = ${a * a + b * b} + ${c}² = ${n}. Donc AG = √${n} = ${k}√${m} ${ctx.u}.`,
      }), boxFig(a, b, c, { AB: `${a}`, BC: `${b}`, AE: `${c}` }, true))
    }),
    // Le vitrail : rendre rationnel puis Pythagore
    () => {
      const p = pick([2, 3, 5, 6, 7]), k = randInt(2, 6), A = k * p
      const n = p * (1 + k * k)
      const ctx = pick([
        { t: 'Le vitrail de la chapelle', s: 'Un vitrail rectangulaire' },
        { t: 'La bannière du clan', s: 'Une bannière rectangulaire' },
        { t: 'L’écran de la tablette', s: 'Un écran rectangulaire' },
      ])
      const w = 1, h = Math.min(k, 3)
      const fig = free({ A: [0, 0], B: [h, 0], C: [h, w], D: [0, w] }, {
        segments: [{ a: 'A', b: 'B', label: 'longueur ?' }, { a: 'B', b: 'C', label: `√${p} cm` }, { a: 'C', b: 'D' }, { a: 'D', b: 'A' }, { a: 'A', b: 'C', color: RED }],
        polygons: [{ pts: ['A', 'B', 'C', 'D'], fill: BLUE }],
        notes: [{ at: [h * 0.3, w * 0.72], text: `${A} cm²` }],
        angles: [{ vertex: 'B', a: 'A', b: 'C', right: true }],
      })
      return T(ctx.t, exactRoot(`${ctx.s} a une aire de ${A} cm² et une largeur de √{${p}} cm. Calcule d'abord sa longueur exacte, puis donne la valeur exacte de la longueur de sa diagonale [AC], sous la forme la plus simple.`, n,
        `Longueur = ${F(A, `√${p}`)} = ${F(`${A}√${p}`, p)} = ${k}√${p} cm. Pythagore : AC² = (√${p})² + (${k}√${p})² = ${p} + ${k * k * p} = ${n}, donc AC = ${rootText(n)} cm.`), fig)
    },
    // Sable et étoiles : ordres de grandeur
    () => retry(() => {
      const L = randInt(1, 5), l = pick([20, 40, 50, 60, 80, 100]), p = pick([2, 3, 4, 5]), s = pick([1, 2, 4])
      const ratio = (L * l * p * 10) / s
      if (!isInt(ratio)) return null
      return T('Plus de grains que d’étoiles ?', numeric(`Une plage mesure ${L} km de long et ${l} m de large, et le sable y est épais de ${p} m. Un grain de sable occupe environ 1 mm³, soit 10^{−9} m³. La Voie lactée compte environ ${s === 1 ? '' : `${s} × `}10^{11} étoiles. Combien y a-t-il de grains de sable de cette plage pour une étoile de la Voie lactée ?`, ratio, {
        explanation: `Volume : ${L} × 10^3 × ${l} × ${p} = ${fmt(L * l * p / 100)} × 10^5 m³, soit ${fmt(L * l * p / 100)} × 10^5 ÷ 10^{−9} = ${fmt(L * l * p / 100)} × 10^{14} grains. Pour une étoile : ${fmt(L * l * p / 100)} × 10^{14} ÷ (${s} × 10^{11}) = ${ratio}.`,
      }))
    }),
    // Plus près de A que de B : milieu et valeur absolue
    () => retry(() => {
      const a = randInt(-12, 12), gap = randInt(5, 16)
      const leftA = Math.random() < 0.5
      const b = leftA ? a + gap : a - gap
      const mid = (a + b) / 2
      const r = randInt(Math.ceil(gap / 2) + 1, gap + 3)
      const I = leftA ? { lo: a - r, hi: mid, loClosed: true, hiClosed: false } : { lo: mid, hi: a + r, loClosed: false, hiClosed: true }
      const who = pick(['Un cavalier', 'Une éclaireuse', 'Un livreur à vélo', 'Une randonneuse'])
      return T('Le plus proche relais', interval(`Sur une route droite graduée en km, le relais A est à l'abscisse ${fmt(a)} et le relais B à l'abscisse ${fmt(b)}. ${who} veut se placer en un point d'abscisse x strictement plus proche de A que de B, et à au plus ${r} km de A. Donne l'ensemble des abscisses x possibles, sous forme d'intervalle.`, I, {
        explanation: `Être plus près de A que de B, c'est être du côté de A par rapport au milieu de [AB], d'abscisse ${fmt(mid)} : x ${leftA ? '<' : '>'} ${fmt(mid)}. Et |${xPlus(-a)}| ≤ ${r} ⇔ x ∈ [${fmt(a - r)} ; ${fmt(a + r)}]. Intersection : ${leftA ? `[${fmt(a - r)} ; ${fmt(mid)}[` : `]${fmt(mid)} ; ${fmt(a + r)}]`}.`,
      }))
    }),
    // La spirale de Théodore
    () => {
      const [p, q] = pick([[1, 7], [2, 11], [1, 17], [4, 19], [7, 17], [11, 26], [7, 31], [19, 44], [17, 49], [2, 26]])
      const [k1, m] = sqrtParts(p + 1), [k2] = sqrtParts(q + 1)
      const diff = Math.random() < 0.4
      const raw: Raw = { O: [0, 0] }
      let th = 0
      for (let n = 0; n <= 6; n++) {
        const r = Math.sqrt(n + 1)
        raw[`A${n}`] = [r * Math.cos(th), r * Math.sin(th)]
        th += Math.atan(1 / r)
      }
      const labels: Record<string, string> = {}
      for (let n = 0; n <= 6; n++) labels[`A${n}`] = n <= 3 ? `A${sub(n)}` : ''
      const fig = free(raw, {
        segments: [
          ...[0, 1, 2, 3, 4, 5, 6].map((n) => ({ a: 'O', b: `A${n}`, label: n === 0 ? '1' : undefined, color: n === 6 ? AXIS : undefined })),
          ...[0, 1, 2, 3, 4, 5].map((n) => ({ a: `A${n}`, b: `A${n + 1}`, label: n < 2 ? '1' : undefined })),
        ],
        angles: [0, 1, 2].map((n) => ({ vertex: `A${n}`, a: 'O', b: `A${n + 1}`, right: true })),
        labels,
      })
      const op = diff ? `OA${sub(q)} − OA${sub(p)}` : `OA${sub(p)} + OA${sub(q)}`
      const res = diff ? k2 - k1 : k1 + k2
      return T('La spirale de Théodore', radical(`On construit une spirale : OA₀ = 1 et, pour chaque n, le triangle OAₙAₙ₊₁ est rectangle en Aₙ avec AₙAₙ₊₁ = 1. Trouve la longueur OAₙ en fonction de n, puis calcule ${op} sous la forme a√b.`, res, m, {
        explanation: `Pythagore : OAₙ₊₁² = OAₙ² + 1. Comme OA₀² = 1, on a OA₁² = 2, OA₂² = 3… donc OAₙ = √(n + 1). OA${sub(p)} = √${p + 1} = ${rootText(p + 1)} et OA${sub(q)} = √${q + 1} = ${rootText(q + 1)}, d'où ${op} = ${res}√${m}.`,
      }), fig)
    },
  ],
]

// ═════════════════════════════════════════════════════════════════════════
// 2-lit : développer, identités remarquables, factoriser
// ═════════════════════════════════════════════════════════════════════════
const lit: Ladder = [
  [
    // Le cadre du tableau
    () => {
      const a = randInt(2, 10), k = randInt(2, 6)
      const expected = poly([4 * k, 'x'], [2 * k * (a + 2 * k), ''])
      const ctx = pick([
        { t: 'Le cadre du portrait', s: 'Le portrait du roi est un tableau rectangulaire' },
        { t: 'Le cadre de la photo', s: 'Une photo de classe est un rectangle' },
        { t: 'Le tapis et sa bordure', s: 'Un tapis rectangulaire' },
      ])
      return T(ctx.t, expression(`${ctx.s} de x cm de large et (${xPlus(a)}) cm de long. On l'entoure d'une bordure de ${k} cm de large tout autour. Exprime l'aire de la bordure seule (en cm²) en fonction de x, sous forme développée et réduite.`, expected, 'developed', {
        explanation: `Grand rectangle : (x + ${2 * k})(${xPlus(a + 2 * k)}) = ${poly([1, 'x²'], [a + 4 * k, 'x'], [2 * k * (a + 2 * k), ''])}. On retire x(${xPlus(a)}) = ${poly([1, 'x²'], [a, 'x'])}. Bordure : ${expected}.`,
      }), frameFig(7, 5, 1.1, { inner: xPlus(a), innerV: 'x', thick: `${k}` }))
    },
    // Le calcul éclair
    () => {
      const N = pick([20, 30, 40, 50, 60, 70, 80, 90, 100]), v = randInt(0, 2), d = v === 0 ? randInt(1, 9) : randInt(1, 3)
      const name = prenom()
      if (v === 0) {
        return T('Le calcul éclair', numeric(`Sans calculatrice, ${name} annonce en trois secondes le résultat de ${N - d} × ${N + d}. Retrouve ce résultat en utilisant une identité remarquable.`, N * N - d * d, {
          explanation: `${N - d} × ${N + d} = (${N} − ${d})(${N} + ${d}) = ${N}² − ${d}² = ${N * N} − ${d * d} = ${N * N - d * d}.`,
        }))
      }
      const s = v === 1 ? 1 : -1, M = N + s * d
      return T('Le calcul éclair', numeric(`Sans calculatrice, ${name} calcule ${M}² de tête en l'écrivant (${N} ${s > 0 ? '+' : '−'} ${d})². Quel résultat obtient-on ?`, M * M, {
        explanation: `(${N} ${s > 0 ? '+' : '−'} ${d})² = ${N}² ${s > 0 ? '+' : '−'} 2 × ${N} × ${d} + ${d}² = ${N * N} ${s > 0 ? '+' : '−'} ${2 * N * d} + ${d * d} = ${M * M}.`,
      }))
    },
    // Le champ agrandi
    () => retry(() => {
      const a = randInt(2, 9), p = randInt(1, 6), q = randInt(1, 6)
      if (p === q) return null
      const expected = poly([p + q, 'x'], [q * (a + p), ''])
      const W = 5, H = 3, pw = 1.2, qw = 0.9
      const fig = free({ A: [0, 0], B: [W, 0], C: [W, H], D: [0, H], _b2: [W + pw, 0], _c2: [W + pw, H + qw], _d2: [0, H + qw] }, {
        segments: [
          { a: 'A', b: 'B', label: xPlus(a) }, { a: 'B', b: 'C' }, { a: 'C', b: 'D' }, { a: 'D', b: 'A', label: 'x' },
          { a: 'B', b: '_b2', label: `${p}`, dashed: true }, { a: '_b2', b: '_c2', dashed: true }, { a: '_c2', b: '_d2', dashed: true }, { a: '_d2', b: 'D', label: `${q}`, dashed: true },
        ],
        polygons: [{ pts: ['B', '_b2', '_c2', '_d2', 'D', 'C'], fill: GREEN }],
        hidden: ['A', 'B', 'C', 'D'],
      })
      return T('Le champ agrandi', expression(`Un champ rectangulaire mesure x m de large et (${xPlus(a)}) m de long. On l'agrandit : sa longueur augmente de ${p} m et sa largeur de ${q} m. De combien son aire augmente-t-elle ? Exprime ce gain (en m²) en fonction de x, sous forme développée et réduite.`, expected, 'developed', {
        explanation: `Nouvelle aire : (${xPlus(q)})(${xPlus(a + p)}) = ${poly([1, 'x²'], [a + p + q, 'x'], [q * (a + p), ''])}. Ancienne : x(${xPlus(a)}) = ${poly([1, 'x²'], [a, 'x'])}. Gain : ${expected}.`,
      }), fig)
    }),
    // Le nombre mystère
    () => retry(() => {
      const a = randInt(2, 9), s = pick([1, -1]), x0 = randInt(-10, 25)
      const R = 2 * s * a * x0 + a * a
      if (R === a * a) return null
      const [n1, n2] = deuxPrenoms()
      return T('Le nombre mystère', numeric(`${n1} propose un tour à ${n2} : « Choisis un nombre, ${s > 0 ? 'ajoute-lui' : 'retranche-lui'} ${a}, élève le résultat au carré, puis retire le carré du nombre de départ. » ${n2} annonce ${fmt(R)}. Quel était son nombre de départ ?`, x0, {
        explanation: `(${xPlus(s * a)})² − x² = x² ${s > 0 ? '+' : '−'} ${2 * a}x + ${a * a} − x² = ${poly([2 * s * a, 'x'], [a * a, ''])}. Donc ${poly([2 * s * a, 'x'], [a * a, ''])} = ${fmt(R)} et x = ${fmt(x0)}.`,
      }))
    }),
    // L'écart entre deux carrés
    () => retry(() => {
      const a = randInt(1, 8), b = randInt(1, 8)
      if (a === b) return null
      const expected = poly([2 * (a + b), 'x'], [a * a - b * b, ''])
      const fig = free({ _a: [0, 0], _b: [3, 0], _c: [3, 3], _d: [0, 3], _e: [3.8, 0], _f: [5.6, 0], _g: [5.6, 1.8], _h: [3.8, 1.8] }, {
        segments: [
          { a: '_a', b: '_b', label: xPlus(a) }, { a: '_b', b: '_c' }, { a: '_c', b: '_d' }, { a: '_d', b: '_a' },
          { a: '_e', b: '_f', label: xPlus(-b) }, { a: '_f', b: '_g' }, { a: '_g', b: '_h' }, { a: '_h', b: '_e' },
        ],
        polygons: [{ pts: ['_a', '_b', '_c', '_d'], fill: GOLD }, { pts: ['_e', '_f', '_g', '_h'], fill: BLUE }],
      })
      return T('Les deux dalles', expression(`Deux dalles carrées ont pour côtés ${xPlus(a)} et ${xPlus(-b)} (en dm, avec x > ${b}). Exprime, en fonction de x, de combien l'aire de la grande dépasse celle de la petite, sous forme développée et réduite.`, expected, 'developed', {
        explanation: `(${xPlus(a)})² − (${xPlus(-b)})² = (${poly([1, 'x²'], [2 * a, 'x'], [a * a, ''])}) − (${poly([1, 'x²'], [-2 * b, 'x'], [b * b, ''])}) = ${expected}.`,
      }), fig)
    }),
  ],
  [
    // La terrasse en L : A² − B²
    () => retry(() => {
      const b = randInt(1, 6), a = randInt(1, 9)
      if (a === b) return null
      const W = 5, c = 2
      const fig = free({ _a: [0, 0], _b: [W, 0], _c: [W, W - c], _d: [W - c, W - c], _e: [W - c, W], _f: [0, W], _g: [W, W] }, {
        segments: [
          { a: '_a', b: '_b', label: xPlus(b) }, { a: '_b', b: '_c' }, { a: '_c', b: '_d', label: `${a}` }, { a: '_d', b: '_e', label: `${a}` },
          { a: '_e', b: '_f' }, { a: '_f', b: '_a', label: xPlus(b) }, { a: '_c', b: '_g', dashed: true }, { a: '_g', b: '_e', dashed: true },
        ],
        polygons: [{ pts: ['_a', '_b', '_c', '_d', '_e', '_f'], fill: GOLD }, { pts: ['_d', '_c', '_g', '_e'], fill: BLUE }],
      })
      return T('La terrasse et le bassin', expression(`Une terrasse carrée de côté (${xPlus(b)}) m est privée, dans un coin, d'un carré de côté ${a} m réservé à un bassin (x > ${a}). Exprime l'aire de la terrasse restante sous forme factorisée.`, `(${xPlus(b - a)})(${xPlus(b + a)})`, 'factored', {
        explanation: `Aire = (${xPlus(b)})² − ${a}². C'est A² − B² = (A − B)(A + B) : (${xPlus(b)} − ${a})(${xPlus(b)} + ${a}) = (${xPlus(b - a)})(${xPlus(b + a)}).`,
      }), fig)
    }),
    // Le tour de magie : résultat constant
    () => {
      const v = randInt(0, 2), a = randInt(2, 9), b = randInt(2, 9)
      const [n1, n2] = deuxPrenoms()
      const steps = [
        `Multiplie le nombre qui vaut ${a} de moins que le tien par celui qui vaut ${a} de plus. Retire ce produit au carré de ton nombre.`,
        `Ajoute ${a} à ton nombre et élève le résultat au carré. Retire ensuite le produit de ton nombre par ton nombre augmenté de ${2 * a}.`,
        `Ajoute ${a} à ton nombre, puis multiplie le résultat par ton nombre augmenté de ${b}. Retire ensuite le produit de ton nombre par ton nombre augmenté de ${a + b}.`,
      ]
      const res = v === 2 ? a * b : a * a
      const expl = [
        `x² − (x − ${a})(x + ${a}) = x² − (x² − ${a * a}) = ${a * a}.`,
        `(x + ${a})² − x(x + ${2 * a}) = x² + ${2 * a}x + ${a * a} − x² − ${2 * a}x = ${a * a}.`,
        `(x + ${a})(x + ${b}) − x(x + ${a + b}) = x² + ${a + b}x + ${a * b} − x² − ${a + b}x = ${a * b}.`,
      ]
      return T('Le tour de magie', numeric(`${n1} propose ce tour à ${n2} : « Choisis un nombre. ${steps[v]} » Quel que soit le nombre choisi, le résultat est toujours le même. Lequel ?`, res, {
        explanation: `Avec x le nombre choisi : ${expl[v]}`,
      }))
    },
    // La boîte en carton : développer un cube de facteurs
    () => {
      const s = pick([10, 12, 14, 16, 18, 20, 24, 30])
      const expected = poly([4, 'x³'], [-4 * s, 'x²'], [s * s, 'x'])
      return T('La boîte en carton', expression(`Dans une plaque carrée de ${s} cm de côté, on découpe à chaque coin un carré de côté x cm, puis on relève les bords pour former une boîte sans couvercle. Exprime le volume de la boîte (en cm³) en fonction de x, sous forme développée et réduite.`, expected, 'developed', {
        explanation: `La base est un carré de côté ${s} − 2x et la hauteur vaut x. V = x(${s} − 2x)² = x(${poly([s * s, ''], [-4 * s, 'x'], [4, 'x²'])}) = ${expected}.`,
      }), sheetFig(s))
    },
    // Les deux enclos accolés : facteur commun
    () => {
      const a = randInt(1, 8), b = randNonZero(-5, 9)
      const fig = free({ _a: [0, 0], _b: [3, 0], _c: [3, 3], _d: [0, 3], _e: [7.5, 0], _f: [7.5, 3] }, {
        segments: [
          { a: '_a', b: '_b', label: xPlus(a) }, { a: '_b', b: '_c' }, { a: '_c', b: '_d' }, { a: '_d', b: '_a', label: xPlus(a) },
          { a: '_b', b: '_e', label: xPlus(b, 2) }, { a: '_e', b: '_f' }, { a: '_f', b: '_c' },
        ],
        polygons: [{ pts: ['_a', '_b', '_c', '_d'], fill: GOLD }, { pts: ['_b', '_e', '_f', '_c'], fill: GREEN }],
      })
      return T('Les deux enclos', expression(`Un éleveur a deux enclos accolés : un carré de côté (${xPlus(a)}) m et un rectangle de côtés (${xPlus(a)}) m et (${xPlus(b, 2)}) m, qui partagent un côté. Exprime leur aire totale sous la forme d'un produit de deux facteurs du premier degré.`, `(${xPlus(a)})(${xPlus(a + b, 3)})`, 'factored', {
        explanation: `(${xPlus(a)})² + (${xPlus(a)})(${xPlus(b, 2)}) = (${xPlus(a)})[(${xPlus(a)}) + (${xPlus(b, 2)})] = (${xPlus(a)})(${xPlus(a + b, 3)}).`,
      }), fig)
    },
    // Calcul éclair 2 : différences de carrés
    () => {
      if (Math.random() < 0.5) {
        const N = pick([100, 200, 500, 1000, 2000]), k = randInt(1, 9)
        return T('Le défi du scribe', numeric(`Le scribe met au défi les apprentis : calculer ${N + k}² − ${N - k}² sans poser de multiplication. Quel est le résultat ?`, 4 * N * k, {
          explanation: `A² − B² = (A − B)(A + B) = (${N + k} − ${N - k})(${N + k} + ${N - k}) = ${2 * k} × ${2 * N} = ${4 * N * k}.`,
        }))
      }
      const N = randInt(1000, 3000), k = randInt(1, 5)
      return T('Le défi du scribe', numeric(`Le scribe met au défi les apprentis : calculer ${N}² − ${N - k} × ${N + k} sans calculatrice. Quel est le résultat ?`, k * k, {
        explanation: `${N - k} × ${N + k} = (${N} − ${k})(${N} + ${k}) = ${N}² − ${k}², donc ${N}² − (${N}² − ${k * k}) = ${k * k}.`,
      }))
    },
  ],
  [
    // L'enclos contre le mur : aire maximale par une identité
    () => {
      const d = randInt(3, 15), L = 4 * d
      const W = 5, H = 2.6
      const fig = free({ _m1: [-0.8, H], _m2: [W + 0.8, H], _a: [0, H], _b: [0, 0], _c: [W, 0], _d: [W, H] }, {
        segments: [
          { a: '_m1', b: '_m2', label: 'mur', color: AXIS },
          { a: '_a', b: '_b', label: 'x' }, { a: '_b', b: '_c', label: `${L} − 2x` }, { a: '_c', b: '_d', label: 'x' },
        ],
        polygons: [{ pts: ['_a', '_b', '_c', '_d'], fill: GREEN }],
        caption: 'Le grillage forme trois côtés, le mur le quatrième.',
      })
      return T('L’enclos contre le mur', numeric(`Avec ${L} m de grillage, ${prenom()} construit un enclos rectangulaire adossé à un mur. On note x la longueur des deux côtés perpendiculaires au mur et A(x) l'aire de l'enclos. Développe ${2 * d * d} − 2(x − ${d})² et compare avec A(x). Quelle est l'aire maximale possible (en m²) ?`, 2 * d * d, {
        explanation: `A(x) = x(${L} − 2x) = ${poly([-2, 'x²'], [L, 'x'])}. Or ${2 * d * d} − 2(x − ${d})² = ${2 * d * d} − 2x² + ${4 * d}x − ${2 * d * d} = ${poly([-2, 'x²'], [L, 'x'])} = A(x). Comme 2(x − ${d})² ≥ 0, A(x) ≤ ${2 * d * d}, avec égalité pour x = ${d}.`,
      }), fig)
    },
    // Le cube agrandi ou rogné : (x ± a)³
    () => {
      const a = randInt(1, 6), grow = Math.random() < 0.6
      const obj = pick([
        { s: 'Un bloc de pierre cubique', u: 'dm' }, { s: 'Un dé géant', u: 'cm' }, { s: 'Une caisse cubique', u: 'dm' }, { s: 'Un glaçon cubique', u: 'mm' },
      ])
      const sg = grow ? 1 : -1
      const expected = poly([3 * a, 'x²'], [-3 * a * a * sg, 'x'], [a * a * a, ''])
      const cube = poly([1, 'x³'], [3 * a * sg, 'x²'], [3 * a * a, 'x'], [a * a * a * sg, ''])
      return T(grow ? 'Le cube agrandi' : 'Le cube rogné', expression(`${obj.s} a une arête de x ${obj.u}${grow ? '' : ` (x > ${a})`}. On le remplace par un cube dont l'arête mesure ${a} ${obj.u} de ${grow ? 'plus' : 'moins'}. De combien le volume ${grow ? 'augmente' : 'diminue'}-t-il ? Exprime cette ${grow ? 'augmentation' : 'diminution'} (en ${obj.u}³) en fonction de x, sous forme développée et réduite.`, expected, 'developed', {
        explanation: `(${xPlus(sg * a)})³ = (${xPlus(sg * a)})²(${xPlus(sg * a)}) = (${poly([1, 'x²'], [2 * a * sg, 'x'], [a * a, ''])})(${xPlus(sg * a)}) = ${cube}. ${grow ? `On retire x³ : ${expected}.` : `x³ − (${cube}) = ${expected}.`}`,
      }), boxFig(1, 1, 1, { AB: xPlus(sg * a), BC: xPlus(sg * a), AE: xPlus(sg * a) }))
    },
    // La place pavée : (2x + a)² − (x + b)²
    () => retry(() => {
      const a = randInt(2, 9), b = randInt(1, 8)
      if (a <= b) return null
      return T('La place pavée', expression(`Une place carrée a pour côté (${xPlus(a, 2)}) m. En son centre se trouve un bassin carré de côté (${xPlus(b)}) m. Exprime l'aire de la partie pavée sous forme factorisée (produit de deux facteurs du premier degré).`, `(${xPlus(a - b)})(${xPlus(a + b, 3)})`, 'factored', {
        explanation: `Aire = (${xPlus(a, 2)})² − (${xPlus(b)})² = [(${xPlus(a, 2)}) − (${xPlus(b)})][(${xPlus(a, 2)}) + (${xPlus(b)})] = (${xPlus(a - b)})(${xPlus(a + b, 3)}).`,
      }), frameFig(6, 6, 1.4, { outer: xPlus(a, 2), inner: xPlus(b) }, '#b9a27a'))
    }),
    // Le carré caché
    () => retry(() => {
      const a = randInt(1, 5), b = randInt(1, 6)
      if (a === b || (a * b) % 2) return null
      const h = (a * b) / 2, c = h * h
      return T('Le carré caché', expression(`${prenom()} remarque que, pour tout entier x, le nombre P = x(${xPlus(a)})(${xPlus(b)})(${xPlus(a + b)}) + ${c} est un carré parfait ! Trouve le polynôme Q(x) = x² + px + q (avec q > 0) tel que P = Q(x)². Indication : développe x(${xPlus(a + b)}) et (${xPlus(a)})(${xPlus(b)}).`, poly([1, 'x²'], [a + b, 'x'], [h, '']), 'developed', {
        inputHint: 'x² + px + q',
        explanation: `Posons u = x² + ${a + b}x : x(${xPlus(a + b)}) = u et (${xPlus(a)})(${xPlus(b)}) = u + ${a * b}. Alors P = u(u + ${a * b}) + ${c} = u² + ${a * b}u + ${c} = (u + ${h})², donc Q(x) = ${poly([1, 'x²'], [a + b, 'x'], [h, ''])}.`,
      }))
    }),
    // Deux champs de même aire
    () => retry(() => {
      const a = randInt(1, 12), b = randInt(1, 12), c = randInt(1, 12)
      const den = a + b - 2 * c
      if (den === 0 || a === b) return null
      const x = (c * c - a * b) / den
      if (!isInt(x) || x < 2 || x > 40) return null
      const fig = free({ _a: [0, 0], _b: [4.6, 0], _c: [4.6, 2.4], _d: [0, 2.4], _e: [5.6, 0], _f: [9, 0], _g: [9, 3.4], _h: [5.6, 3.4] }, {
        segments: [
          { a: '_a', b: '_b', label: xPlus(Math.max(a, b)) }, { a: '_b', b: '_c' }, { a: '_c', b: '_d' }, { a: '_d', b: '_a', label: xPlus(Math.min(a, b)) },
          { a: '_e', b: '_f', label: xPlus(c) }, { a: '_f', b: '_g' }, { a: '_g', b: '_h' }, { a: '_h', b: '_e' },
        ],
        polygons: [{ pts: ['_a', '_b', '_c', '_d'], fill: GREEN }, { pts: ['_e', '_f', '_g', '_h'], fill: GOLD }],
      })
      return T('Deux champs, même surface', numeric(`Un champ rectangulaire mesure (${xPlus(a)}) m sur (${xPlus(b)}) m ; un champ carré a pour côté (${xPlus(c)}) m. Pour quelle valeur de x ces deux champs ont-ils exactement la même aire ?`, x, {
        explanation: `${poly([1, 'x²'], [a + b, 'x'], [a * b, ''])} = ${poly([1, 'x²'], [2 * c, 'x'], [c * c, ''])}. Les x² s'éliminent : ${poly([den, 'x'])} = ${fmt(c * c - a * b)}, donc x = ${fmt(x)}.`,
      }), fig)
    }),
  ],
]

// ═════════════════════════════════════════════════════════════════════════
// 2-eq : équations et inéquations du premier degré, équation produit, x² = a
// ═════════════════════════════════════════════════════════════════════════
const eq: Ladder = [
  [
    // Thalès donne une équation
    () => retry(() => {
      const a = randInt(2, 9), c = randInt(2, 9), d = randInt(2, 12)
      const x = (a * d) / c
      if (!isInt(x) || x < 2 || x > 30 || a === c) return null
      const n = pick(THALES_NAMES)
      const ratio = Math.min(0.7, Math.max(0.3, x / (x + d)))
      const fig = labelNotes(thalesFigure({ names: n, ratio, labels: { AM: 'x', MB: `${d}`, AN: `${a}`, NC: `${c}` } }))
      const ctx = pick([
        { t: 'La charpente', s: `Dans la charpente d'une grange, les poutres (${n.M}${n.N}) et (${n.B}${n.C}) sont parallèles.` },
        { t: 'Le pont de cordes', s: `Sur le plan d'un pont de cordes, les câbles (${n.M}${n.N}) et (${n.B}${n.C}) sont parallèles.` },
        { t: 'Les étagères', s: `Sur le schéma d'une bibliothèque, les planches (${n.M}${n.N}) et (${n.B}${n.C}) sont parallèles.` },
      ])
      return T(ctx.t, numeric(`${ctx.s} Les points ${n.A}, ${n.M}, ${n.B} sont alignés, ainsi que ${n.A}, ${n.N}, ${n.C}. On donne ${n.A}${n.N} = ${a} dm, ${n.N}${n.C} = ${c} dm, ${n.M}${n.B} = ${d} dm, et on note ${n.A}${n.M} = x. Écris une équation vérifiée par x, puis calcule x (en dm).`, x, {
        explanation: `Thalès : ${F(`${n.A}${n.M}`, `${n.A}${n.B}`)} = ${F(`${n.A}${n.N}`, `${n.A}${n.C}`)}, soit ${F('x', `x + ${d}`)} = ${F(a, a + c)}. Produit en croix : ${a + c}x = ${a}x + ${a * d}, donc ${c}x = ${a * d} et x = ${x}.`,
      }), fig)
    }),
    // Le bon abonnement : inéquation
    () => retry(() => {
      const p = randInt(6, 15), q = randInt(2, p - 2), f = randInt(4, 18) * 5
      const n0 = Math.floor(f / (p - q)) + 1
      if (n0 < 4 || n0 > 40) return null
      const ctx = pick([
        { lieu: 'La piscine municipale', u: 'entrée' }, { lieu: 'Le cinéma du quartier', u: 'séance' },
        { lieu: 'La salle d’escalade', u: 'séance' }, { lieu: 'Le club de tir à l’arc', u: 'séance' }, { lieu: 'Le loueur de kayaks', u: 'sortie' },
      ])
      const v = r6(f / (p - q))
      return T('Le bon abonnement', numeric(`${ctx.lieu} propose deux formules. Formule A : ${p} € par ${ctx.u}. Formule B : un abonnement annuel de ${f} €, puis ${q} € par ${ctx.u}. À partir de combien de ${ctx.u}s dans l'année la formule B devient-elle strictement moins chère ?`, n0, {
        explanation: `Pour n ${ctx.u}s : A coûte ${p}n et B coûte ${f} + ${q}n. B < A ⇔ ${f} < ${p - q}n ⇔ n > ${fracText(f, p - q)}${isInt(v) ? '' : ` ≈ ${fmt(Math.round(v * 10) / 10)}`}. Le plus petit entier qui convient est ${n0}.`,
      }))
    }),
    // L'énigme des âges
    () => retry(() => {
      const p = randInt(3, 6), q = randInt(2, p - 1), k = randInt(2, 20)
      const b = (k * (q - 1)) / (p - q)
      if (!isInt(b) || b < 4 || b > 25 || p * b > 95) return null
      const kid = prenom()
      const who = pick([
        { n: `la grand-mère de ${kid}`, e: 'elle' }, { n: `l'oncle de ${kid}`, e: 'il' },
        { n: `la tante de ${kid}`, e: 'elle' }, { n: `le grand-père de ${kid}`, e: 'il' }, { n: `la maîtresse d'armes de ${kid}`, e: 'elle' },
      ])
      return T('L’énigme des âges', numeric(`Aujourd'hui, ${who.n} a ${p} fois l'âge de ${kid}. Dans ${k} ans, ${who.e} n'aura plus que ${q} fois l'âge de ${kid}. Quel âge a ${kid} aujourd'hui ?`, b, {
        explanation: `Si ${kid} a x ans : ${p}x + ${k} = ${q}(x + ${k}), soit ${p}x + ${k} = ${q}x + ${q * k}, donc ${poly([p - q, 'x'])} = ${q * k - k} et x = ${b}.`,
      }))
    }),
    // Le potager carré : (x ± d)² = A
    () => {
      const x = randInt(4, 20), d = randInt(1, Math.min(8, x - 2)), grow = Math.random() < 0.6
      const s = grow ? x + d : x - d, A = s * s
      const name = prenom()
      const big = 4, small = grow ? 3 : 3 * (s / x)
      const fig = grow
        ? free({ _a: [0, 0], _b: [3, 0], _c: [3, 3], _d: [0, 3], _e: [big, 0], _f: [big, big], _g: [0, big] }, {
          segments: [{ a: '_a', b: '_b', label: 'x' }, { a: '_b', b: '_c' }, { a: '_c', b: '_d' }, { a: '_d', b: '_a' },
            { a: '_b', b: '_e', dashed: true, label: `${d}` }, { a: '_e', b: '_f', dashed: true }, { a: '_f', b: '_g', dashed: true }, { a: '_g', b: '_d', dashed: true }],
          polygons: [{ pts: ['_a', '_b', '_c', '_d'], fill: GREEN }],
          notes: [{ at: [2, 3.45], text: `${A} m²` }],
        })
        : free({ _a: [0, 0], _b: [3, 0], _c: [3, 3], _d: [0, 3], _e: [small, 0], _f: [small, small], _g: [0, small] }, {
          segments: [{ a: '_a', b: '_e' }, { a: '_e', b: '_b', label: `${d}` }, { a: '_b', b: '_c' }, { a: '_c', b: '_d', label: 'x' }, { a: '_d', b: '_a' },
            { a: '_e', b: '_f', dashed: true }, { a: '_f', b: '_g', dashed: true }],
          polygons: [{ pts: ['_a', '_e', '_f', '_g'], fill: GREEN }],
          notes: [{ at: [small / 2, small / 2], text: `${A} m²` }],
        })
      return T('Le potager carré', numeric(`${name} cultive un potager carré. Si l'on ${grow ? 'allongeait' : 'raccourcissait'} chaque côté de ${d} m, son aire ${grow ? 'atteindrait' : 'ne serait plus que de'} ${A} m². Écris une équation, puis trouve la longueur actuelle du côté (en m).`, x, {
        explanation: `Avec x le côté : (${xPlus(grow ? d : -d)})² = ${A}. Comme ${xPlus(grow ? d : -d)} > 0, ${xPlus(grow ? d : -d)} = √${A} = ${s} (la solution −${s} est impossible), donc x = ${x} m.`,
      }), fig)
    },
    // Le partage du butin
    () => {
      const x = randInt(5, 60), k = randInt(2, 20), v = Math.random() < 0.5
      const n = v ? 4 * x + k : 4 * x + 3 * k
      const g = pick([{ grp: 'pirates', obj: 'pièces d’or' }, { grp: 'frères', obj: 'billes' }, { grp: 'joueurs', obj: 'cartes' }, { grp: 'chevaliers', obj: 'écus' }])
      return T('Le partage du butin', numeric(`Trois ${g.grp} se partagent ${n} ${g.obj}. Le deuxième reçoit ${k} ${g.obj} de plus que le premier, et le troisième reçoit le double ${v ? 'du premier' : 'du deuxième'}. Combien de ${g.obj} reçoit le premier ?`, x, {
        explanation: v
          ? `Avec x la part du premier : x + (x + ${k}) + 2x = ${n}, soit 4x + ${k} = ${n}, donc x = ${x}.`
          : `Avec x la part du premier : x + (x + ${k}) + 2(x + ${k}) = ${n}, soit 4x + ${3 * k} = ${n}, donc x = ${x}.`,
      }))
    },
  ],
  [
    // L'ombre du clocher : Thalès puis équation
    () => {
      const x = randInt(2, 6), h = pick([1.5, 1.6, 1.8]), r = randInt(5, 12), H = r6(r * h), d = x * (r - 1)
      const name = prenom()
      const o = pick([
        { t: 'L’ombre du clocher', o: 'du clocher', b: 'du pied du clocher' },
        { t: 'L’ombre du phare', o: 'du phare', b: 'du pied du phare' },
        { t: 'L’ombre de la tour', o: 'de la tour de guet', b: 'du pied de la tour' },
      ])
      const fx = Math.min(0.38, Math.max(0.18, x / (x + d))) * 8, Hd = 4.2
      const fig = free({ S: [0, 0], P: [fx, 0], T: [8, 0], J: [fx, (Hd * fx) / 8], C: [8, Hd] }, {
        segments: [
          { a: 'S', b: 'P', label: 'x' }, { a: 'P', b: 'T', label: `${d} m` }, { a: 'P', b: 'J', label: `${fmt(h)} m` },
          { a: 'T', b: 'C', label: `${fmt(H)} m` }, { a: 'S', b: 'C', dashed: true, color: GOLD },
        ],
        angles: [{ vertex: 'P', a: 'T', b: 'J', right: true }, { vertex: 'T', a: 'S', b: 'C', right: true }],
        pos: { S: 's', P: 's', T: 's', J: 'nw', C: 'ne' },
        away: { PJ: 'S' },
        caption: 'Les rayons du soleil sont représentés en pointillés. La figure n’est pas à l’échelle.',
      })
      return T(o.t, numeric(`À un instant de la journée, l'ombre de ${name}, qui mesure ${fmt(h)} m, se termine exactement au même point S que l'ombre ${o.o}, haute de ${fmt(H)} m. ${name} se tient debout en P, à ${d} m ${o.b} (point T). On note x = SP la longueur de son ombre. Écris une équation vérifiée par x, puis calcule x (en m).`, x, {
        explanation: `[PJ] et [TC] sont verticaux, donc parallèles. Thalès dans le triangle STC : ${F('SP', 'ST')} = ${F('PJ', 'TC')}, soit ${F('x', `x + ${d}`)} = ${F(fmt(h), fmt(H))}. Donc ${fmt(H)}x = ${fmt(h)}x + ${fmt(r6(h * d))}, ${fmt(r6(H - h))}x = ${fmt(r6(h * d))} et x = ${x}.`,
      }), fig)
    },
    // Le bambou cassé : Pythagore donne une équation du 1er degré
    () => retry(() => {
      const H = randInt(6, 20), d = randInt(2, H - 2), x = r6((H * H - d * d) / (2 * H))
      if (!isDec(x, 2) || x < 1) return null
      const fig = free({ B: [0, 0], K: [0, x], T: [d, 0] }, {
        segments: [{ a: 'B', b: 'K', label: 'x', color: GREEN }, { a: 'K', b: 'T', color: GREEN, dashed: true }, { a: 'B', b: 'T', label: `${d} m` }],
        angles: [{ vertex: 'B', a: 'T', b: 'K', right: true }],
      })
      return T('Le bambou cassé', numeric(`Un bambou de ${H} m de haut se brise sous l'effet du vent au point K, à une hauteur x (en m). La partie supérieure bascule en restant attachée en K, et son sommet T touche le sol à ${d} m du pied B du bambou. Calcule x. (Ce problème chinois a plus de 2 000 ans !)`, x, {
        explanation: `La partie tombée mesure KT = ${H} − x. Pythagore dans BKT rectangle en B : x² + ${d}² = (${H} − x)², soit x² + ${d * d} = ${H * H} − ${2 * H}x + x². Donc ${2 * H}x = ${H * H - d * d} et x = ${fmt(x)} m.`,
      }), fig)
    }),
    // L'énigme du sage : A² = B² → équation produit
    () => retry(() => {
      const a = randInt(1, 12), b = randInt(1, 12)
      if (a === b || (a + b) % 3) return null
      return T('L’énigme du sage', solutionSet(`Un sage affirme : « Si je double mon nombre, que j'ajoute ${a} et que j'élève le tout au carré, j'obtiens le même résultat qu'en ajoutant ${b} à mon nombre puis en élevant au carré. » Quels nombres a-t-il pu choisir ? Donne toutes les solutions.`, [b - a, -(a + b) / 3], {
        explanation: `(${xPlus(a, 2)})² = (${xPlus(b)})² ⇔ (${xPlus(a, 2)})² − (${xPlus(b)})² = 0 ⇔ [(${xPlus(a, 2)}) − (${xPlus(b)})][(${xPlus(a, 2)}) + (${xPlus(b)})] = 0 ⇔ (${xPlus(a - b)})(${xPlus(a + b, 3)}) = 0. Donc x = ${fmt(b - a)} ou x = ${fmt(-(a + b) / 3)}.`,
      }))
    }),
    // Trois formules : double inéquation
    () => retry(() => {
      const p = randInt(8, 15), q = randInt(2, p - 3), f = randInt(3, 12) * 10, F0 = randInt(20, 60) * 10
      const lo = Math.floor(f / (p - q)) + 1, hi = Math.ceil(r6((F0 - f) / q)) - 1
      const count = hi - lo + 1
      if (count < 3 || count > 25 || lo < 2) return null
      const club = pick(['Le club de natation', 'Le club d’escrime', 'Le centre équestre', 'La salle d’escalade', 'L’école de danse'])
      return T('La meilleure formule', numeric(`${club} propose trois formules pour l'année. A : ${p} € par séance. B : ${f} € d'adhésion, puis ${q} € par séance. C : un forfait illimité à ${F0} €. Pour combien de nombres de séances différents la formule B est-elle strictement la moins chère des trois ?`, count, {
        explanation: `Pour n séances : A = ${p}n, B = ${f} + ${q}n, C = ${F0}. B < A ⇔ ${p - q}n > ${f} ⇔ n > ${fracText(f, p - q)}, soit n ≥ ${lo}. B < C ⇔ ${q}n < ${F0 - f} ⇔ n < ${fracText(F0 - f, q)}, soit n ≤ ${hi}. De ${lo} à ${hi}, il y a ${count} valeurs.`,
      }))
    }),
    // Travailler ensemble : équation avec des inverses
    () => retry(() => {
      const t1 = randInt(2, 40), t2 = randInt(3, 60)
      if (t1 >= t2) return null
      const t = (t1 * t2) / (t1 + t2)
      if (!isInt(t)) return null
      const c = pick([
        { t: 'Les deux fontaines', A: 'la fontaine du lion', B: 'la fontaine du dragon', inf: 'remplir', obj: 'le bassin', u: 'min', unit: 'minutes' },
        { t: 'Les deux imprimantes', A: 'l’imprimante rouge', B: 'l’imprimante bleue', inf: 'imprimer', obj: 'les affiches du festival', u: 'min', unit: 'minutes' },
        { t: 'Les deux moissonneuses', A: 'la vieille moissonneuse', B: 'la nouvelle moissonneuse', inf: 'moissonner', obj: 'le champ', u: 'h', unit: 'heures' },
      ])
      if (Math.random() < 0.5) {
        return T(c.t, numeric(`Seule, ${c.A} met ${t1} ${c.u} pour ${c.inf} ${c.obj} ; seule, ${c.B} met ${t2} ${c.u}. Combien de ${c.unit} leur faut-il en travaillant ensemble ?`, t, {
          explanation: `En une unité de temps, elles font ${F(1, t1)} + ${F(1, t2)} = ${F(t1 + t2, t1 * t2)} = ${F(1, t)} du travail. Si x est la durée cherchée : x × ${F(1, t)} = 1, donc x = ${t} ${c.u}.`,
        }))
      }
      return T(c.t, numeric(`En travaillant ensemble, ${c.A} et ${c.B} mettent ${t} ${c.u} pour ${c.inf} ${c.obj}. Seule, ${c.A} mettrait ${t1} ${c.u}. Combien de ${c.unit} mettrait ${c.B} seule ?`, t2, {
        explanation: `Si x est la durée cherchée : ${F(1, t1)} + ${F(1, 'x')} = ${F(1, t)}, donc ${F(1, 'x')} = ${F(1, t)} − ${F(1, t1)} = ${F(t1 - t, t * t1)} = ${F(1, t2)} et x = ${t2} ${c.u}.`,
      }))
    }),
  ],
  [
    // Deux visées : trigonométrie et équation
    () => retry(() => {
      const ta = pick([0.2, 0.25, 0.3, 0.4, 0.5, 0.6]), tb = pick([0.5, 0.6, 0.75, 0.8, 1, 1.2, 1.5, 2]), d = randInt(2, 16) * 5
      if (tb <= ta + 0.09) return null
      const x = r6((d * ta) / (tb - ta)), H = r6(x * tb)
      if (!isDec(x, 1) || !isDec(H, 1) || H < 5 || H > 150) return null
      const name = prenom()
      const xd = Math.min(2.5 * d, Math.max(0.4 * d, x)), W = d + xd
      const fig = free({ A: [0, 0], B: [d, 0], F: [W, 0], S: [W, 0.55 * W] }, {
        segments: [{ a: 'A', b: 'B', label: `${d} m` }, { a: 'B', b: 'F' }, { a: 'F', b: 'S' }, { a: 'A', b: 'S', dashed: true }, { a: 'B', b: 'S', dashed: true }],
        angles: [{ vertex: 'A', a: 'F', b: 'S', label: 'α', radius: 26 }, { vertex: 'B', a: 'F', b: 'S', label: 'β' }, { vertex: 'F', a: 'A', b: 'S', right: true }],
        pos: { A: 's', B: 's', F: 's', S: 'ne' },
      })
      return T('La hauteur de la tour', numeric(`Pour mesurer la hauteur d'une tour [FS], ${name} se place en A et vise le sommet S : l'angle α entre le sol et sa visée vérifie tan α = ${fmt(ta)}. Puis ${name} avance de ${d} m vers la tour, jusqu'en B, et vise à nouveau : l'angle β vérifie tan β = ${fmt(tb)}. On néglige la taille de ${name} et on note x = BF. Écris une équation vérifiée par x, puis donne la hauteur de la tour (en m).`, H, {
        explanation: `Dans SBF rectangle en F : tan β = ${F('SF', 'BF')}, donc SF = ${poly([tb, 'x'])}. Dans SAF : tan α = ${F('SF', 'AF')}, donc SF = ${fmt(ta)}(x + ${d}). Ainsi ${poly([tb, 'x'])} = ${poly([ta, 'x'], [r6(ta * d), ''])}, soit ${poly([r6(tb - ta), 'x'])} = ${fmt(r6(ta * d))} : x = ${fmt(x)} m, puis SF = ${fmt(tb)} × ${fmt(x)} = ${fmt(H)} m.`,
      }), fig)
    }),
    // Le papillon : Thalès croisé, inconnue des deux côtés
    () => retry(() => {
      const a = randInt(2, 9), c = randInt(3, 12), s = randInt(6, 30)
      if (a / c < 0.5 || a / c > 0.9) return null
      const x = r6((a * s) / (a + c))
      if (!isDec(x, 1)) return null
      const n = pick(THALES_NAMES)
      const fig = labelNotes(thalesFigure({ names: n, ratio: a / c, butterfly: true, labels: { AM: 'x', AN: `${a}`, AC: `${c}` } }), { [n.A + n.M]: n.N, [n.A + n.N]: n.M, [n.A + n.C]: n.B })
      return T('Les haubans croisés', numeric(`Deux haubans d'une passerelle se croisent en ${n.A}. Sur la figure, les droites (${n.M}${n.N}) et (${n.B}${n.C}) sont parallèles ; les points ${n.M}, ${n.A}, ${n.B} sont alignés, ainsi que ${n.N}, ${n.A}, ${n.C}. On donne ${n.A}${n.N} = ${a} m, ${n.A}${n.C} = ${c} m et ${n.M}${n.B} = ${s} m. On note ${n.A}${n.M} = x. Écris une équation vérifiée par x, puis calcule x (en m).`, x, {
        explanation: `Thalès (configuration « papillon ») : ${F(`${n.A}${n.M}`, `${n.A}${n.B}`)} = ${F(`${n.A}${n.N}`, `${n.A}${n.C}`)}, avec ${n.A}${n.B} = ${s} − x : ${F('x', `${s} − x`)} = ${F(a, c)}. Donc ${c}x = ${a * s} − ${a}x, ${a + c}x = ${a * s} et x = ${fmt(x)} m.`,
      }), fig)
    }),
    // Le triangle possible : système d'inéquations
    () => {
      const a = randInt(1, 6), b = a + randInt(2, 11)
      const lo = (b - a) / 2, hi = lo + randInt(2, 10), Pm = a + b + 2 * hi
      return T('Le cadre triangulaire', interval(`On veut fabriquer un cadre triangulaire dont les côtés mesurent x, x + ${a} et ${b} (en cm). Son périmètre ne doit pas dépasser ${fmt(Pm)} cm. Pour quelles valeurs de x ce triangle existe-t-il (sans être aplati) ? Donne la réponse sous forme d'intervalle.`, { lo, hi, loClosed: false, hiClosed: true }, {
        explanation: `Chaque côté doit être strictement inférieur à la somme des deux autres. x + ${a} < x + ${b} et x < (x + ${a}) + ${b} sont toujours vraies ; ${b} < x + (x + ${a}) ⇔ x > ${fmt(lo)}. Périmètre : 2x + ${a + b} ≤ ${fmt(Pm)} ⇔ x ≤ ${fmt(hi)}. Donc x ∈ ]${fmt(lo)} ; ${fmt(hi)}].`,
      }))
    },
    // Le piège de la division
    () => retry(() => {
      const name = prenom()
      let eqText: string, fac: string, sols: number[], expl: string
      if (Math.random() < 0.5) {
        const p = randInt(1, 3), a = randNonZero(-9, 9), b = randInt(1, 9), c = randNonZero(-6, 8)
        if (a % p) return null
        const r1 = -a / p, r2 = b + c
        if (r1 === r2) return null
        fac = `(${xPlus(a, p)})`
        eqText = `${fac}(${xPlus(-b, 2)}) = ${fac}(${xPlus(c)})`
        sols = [r1, r2]
        expl = `${fac}(${xPlus(-b, 2)}) − ${fac}(${xPlus(c)}) = 0 ⇔ ${fac}[(${xPlus(-b, 2)}) − (${xPlus(c)})] = 0 ⇔ ${fac}(${xPlus(-b - c)}) = 0. Donc x = ${fmt(r1)} ou x = ${fmt(r2)}.`
      } else {
        const a = randNonZero(-9, 9), b = randInt(-9, 9)
        const r1 = -a, r2 = (a + b) / 2
        if (r1 === r2) return null
        fac = `(${xPlus(a)})`
        eqText = `${fac}² = ${fac}(${xPlus(-b, 3)})`
        sols = [r1, r2]
        expl = `${fac}² − ${fac}(${xPlus(-b, 3)}) = 0 ⇔ ${fac}[(${xPlus(a)}) − (${xPlus(-b, 3)})] = 0 ⇔ ${fac}(${poly([-2, 'x'], [a + b, ''])}) = 0. Donc x = ${fmt(r1)} ou x = ${fmt(r2)}.`
      }
      return T('Le piège de la division', solutionSet(`${name} doit résoudre l'équation ${eqText}. En « simplifiant » les deux membres par ${fac}, ${name} ne trouve qu'une seule solution. Où est l'erreur ? Donne toutes les solutions de l'équation.`, sols, {
        explanation: `On ne peut pas diviser par ${fac}, qui peut être nul ! On regroupe tout dans un membre et on factorise : ${expl}`,
      }))
    }),
    // Deux carrés : A² = k²B², une seule solution valable
    () => retry(() => {
      const k = pick([2, 3]), a = randInt(1, 12), b = randInt(1, 10)
      const x = (a + k * b) / (k - 1)
      if (!isInt(x) || x > 40) return null
      return T('Le grand et le petit carré', numeric(`Deux carrés ont pour côtés (${xPlus(a)}) cm et (${xPlus(-b)}) cm, avec x > ${b}. L'aire du premier est ${k * k} fois celle du second. Écris une équation, résous-la, et donne la valeur de x qui convient.`, x, {
        explanation: `(${xPlus(a)})² = ${k * k}(${xPlus(-b)})² ⇔ (${xPlus(a)})² − (${xPlus(-k * b, k)})² = 0 ⇔ (${xPlus(a + k * b, 1 - k)})(${xPlus(a - k * b, 1 + k)}) = 0. Solutions : x = ${fmt(x)} ou x = ${fracText(k * b - a, k + 1)} ; la seconde ne vérifie pas x > ${b}. Donc x = ${fmt(x)}.`,
      }))
    }),
  ],
]

// ═════════════════════════════════════════════════════════════════════════
// 2-fct : images, antécédents, fonctions de référence, aires et volumes en fonction de x
// ═════════════════════════════════════════════════════════════════════════
const fct: Ladder = [
  [
    // L'enclos au bord de la rivière
    () => retry(() => {
      const F0 = randInt(10, 40) * 2, k1 = randInt(2, F0 / 2 - 2), k2 = randInt(2, F0 / 2 - 2)
      if (k1 === k2) return null
      const A = (x: number) => x * (F0 - 2 * x)
      const diff = Math.abs(A(k1) - A(k2))
      if (!diff) return null
      const W = 5, H = 2.6
      const fig = free({ _r1: [-0.8, H], _r2: [W + 0.8, H], _a: [0, H], _b: [0, 0], _c: [W, 0], _d: [W, H] }, {
        segments: [
          { a: '_r1', b: '_r2', label: 'rivière', color: BLUE },
          { a: '_a', b: '_b', label: 'x' }, { a: '_b', b: '_c', label: `${F0} − 2x` }, { a: '_c', b: '_d', label: 'x' },
        ],
        polygons: [{ pts: ['_a', '_b', '_c', '_d'], fill: GREEN }],
      })
      return T('L’enclos au bord de l’eau', numeric(`${prenom()} dispose de ${F0} m de clôture pour fermer un enclos rectangulaire au bord d'une rivière (aucune clôture n'est nécessaire côté rivière). On note x la longueur (en m) des deux côtés perpendiculaires à la rivière et A(x) l'aire de l'enclos. Exprime A(x), puis compare les choix x = ${k1} et x = ${k2} : de combien de m² le meilleur des deux dépasse-t-il l'autre ?`, diff, {
        explanation: `Le côté parallèle à la rivière mesure ${F0} − 2x, donc A(x) = x(${F0} − 2x). A(${k1}) = ${k1} × ${F0 - 2 * k1} = ${A(k1)} et A(${k2}) = ${k2} × ${F0 - 2 * k2} = ${A(k2)}. Écart : ${diff} m².`,
      }), fig)
    }),
    // Tarif affine : deux données, puis un antécédent
    () => {
      const taxi = Math.random() < 0.5
      const a = pick(taxi ? [1.2, 1.5, 1.6, 1.8, 2, 2.5] : [2, 2.5, 3, 4, 4.5]), b = pick(taxi ? [2, 2.5, 3, 4, 5] : [5, 6, 8, 10])
      const d1 = taxi ? randInt(3, 10) : randInt(1, 3), d2 = d1 + (taxi ? randInt(2, 15) : randInt(2, 5)), dm = taxi ? randInt(15, 40) : randInt(6, 12)
      const f1 = r6(a * d1 + b), f2 = r6(a * d2 + b), M = r6(a * dm + b)
      const expl = `a = (${fmt(f2)} − ${fmt(f1)}) ÷ (${d2} − ${d1}) = ${fmt(a)} et b = ${fmt(f1)} − ${fmt(a)} × ${d1} = ${fmt(b)}. Puis ${fmt(a)}x + ${fmt(b)} = ${fmt(M)} donne x = ${dm}.`
      if (taxi) {
        return T('Le tarif du taxi', numeric(`Un taxi applique un tarif de la forme f(x) = ax + b, où x est la distance parcourue (en km) et f(x) le prix (en €). Une course de ${d1} km a coûté ${fmt(f1)} € et une course de ${d2} km ${fmt(f2)} €. Trouve a et b, puis la distance que l'on peut parcourir avec ${fmt(M)} €.`, dm, { explanation: expl }))
      }
      return T('Le vélo de location', numeric(`Un loueur de vélos électriques facture f(x) = ax + b euros pour x heures de location. ${d1} h de location coûtent ${fmt(f1)} € et ${d2} h coûtent ${fmt(f2)} €. Trouve a et b, puis le nombre d'heures de location que l'on peut payer avec ${fmt(M)} €.`, dm, { explanation: expl }))
    },
    // Le triangle et le trapèze dans le carré
    () => retry(() => {
      const c = randInt(4, 20), k = randInt(2, 5), x = r6((2 * c) / (k + 1))
      if (!isDec(x, 1)) return null
      const word = ['', '', 'le double de celle', 'le triple de celle', 'le quadruple de celle', '5 fois celle'][k]
      const fig = free({ A: [0, 0], M: [x, 0], B: [c, 0], C: [c, c], D: [0, c] }, {
        segments: [
          { a: 'A', b: 'M', label: 'x' }, { a: 'M', b: 'B' }, { a: 'B', b: 'C', label: `${c} cm` }, { a: 'C', b: 'D' }, { a: 'D', b: 'A' }, { a: 'D', b: 'M' },
        ],
        polygons: [{ pts: ['A', 'M', 'D'], fill: GOLD }, { pts: ['M', 'B', 'C', 'D'], fill: BLUE }],
        pos: { M: 's' },
      })
      return T('Le carré partagé', numeric(`ABCD est un carré de côté ${c} cm et M est un point de [AB] avec AM = x cm. On note f(x) l'aire du triangle AMD et g(x) celle du trapèze MBCD. Exprime f(x) et g(x), puis trouve la valeur de x pour laquelle l'aire du trapèze est ${word} du triangle.`, x, {
        explanation: `f(x) = ${F(`${c} × x`, 2)} = ${poly([c / 2, 'x'])} et g(x) = ${c * c} − ${poly([c / 2, 'x'])}. g(x) = ${k}f(x) ⇔ ${c * c} − ${poly([c / 2, 'x'])} = ${poly([(k * c) / 2, 'x'])} ⇔ ${c * c} = ${poly([((k + 1) * c) / 2, 'x'])} ⇔ x = ${fmt(x)}.`,
      }), fig)
    }),
    // La pierre qui tombe : fonction carré
    () => {
      const n = randInt(2, 6), j = randInt(1, n - 1), H = 5 * n * n, h = H - 5 * j * j
      const v = Math.random() < 0.5
      const lieuP = pick([`du haut d'une tour de ${H} m`, `du haut d'une falaise de ${H} m`, `du sommet d'un phare de ${H} m`])
      const q = v
        ? `Au bout de combien de secondes passe-t-elle devant une fenêtre située à ${h} m du sol ?`
        : `Combien de secondes s'écoulent entre son passage devant une fenêtre située à ${h} m du sol et son arrivée au sol ?`
      return T('La chute de la pierre', numeric(`On lâche une pierre ${lieuP}. Sa hauteur (en m) au bout de t secondes est h(t) = ${H} − 5t². ${q}`, v ? j : n - j, {
        explanation: `h(t) = ${h} ⇔ 5t² = ${H - h} ⇔ t² = ${j * j} ⇔ t = ${j} (car t ≥ 0).${v ? '' : ` Et h(t) = 0 ⇔ t² = ${n * n} ⇔ t = ${n}. Durée : ${n} − ${j} = ${n - j} s.`}`,
      }))
    },
    // Coût de production : images et surcoût
    () => {
      const a = randInt(2, 20), b = randInt(5, 50) * 10, x1 = randInt(10, 50)
      const C = (x: number) => x * x + a * x + b
      const o = pick([
        { who: 'Une forge', obj: 'épées', one: 'de la', s: 'épée', u: 'écus' },
        { who: 'Un atelier', obj: 't-shirts', one: 'du', s: 't-shirt', u: '€' },
        { who: 'Une pâtisserie', obj: 'gâteaux', one: 'du', s: 'gâteau', u: '€' },
      ])
      const diff = C(x1 + 1) - C(x1)
      return T('Le prix de la dernière pièce', numeric(`${o.who} fabrique des ${o.obj}. Le coût de fabrication de x ${o.obj} est C(x) = ${poly([1, 'x²'], [a, 'x'], [b, ''])} (en ${o.u}). Calcule C(${x1}) et C(${x1 + 1}). Combien coûte la fabrication ${o.one} ${x1 + 1}ᵉ ${o.s}, c'est-à-dire le surcoût pour passer de ${x1} à ${x1 + 1} ${o.obj} ?`, diff, {
        explanation: `C(${x1}) = ${x1}² + ${a} × ${x1} + ${b} = ${C(x1)} et C(${x1 + 1}) = ${C(x1 + 1)}. Surcoût : ${C(x1 + 1)} − ${C(x1)} = ${diff} ${o.u}.`,
      }))
    },
  ],
  [
    // Gagner du temps : fonction inverse
    () => retry(() => {
      const mode = pick([
        { s: 'en voiture', lo: 50, hi: 110, t: 'Gagner du temps' }, { s: 'en train', lo: 80, hi: 200, t: 'Le train plus rapide' }, { s: 'à cheval', lo: 10, hi: 25, t: 'La chevauchée' },
      ])
      const v0 = randInt(mode.lo, mode.hi), t0 = randInt(2, 6), d = v0 * t0, g = pick([0.5, 1])
      const v = d / (t0 - g)
      if (!isInt(v) || v > mode.hi * 1.6) return null
      return T(mode.t, numeric(`Le temps (en h) pour parcourir ${d} km ${mode.s} à la vitesse moyenne v (en km/h) est t(v) = ${F(d, 'v')}. ${prenom()} voyage habituellement à ${v0} km/h. Calcule t(${v0}), puis trouve la vitesse moyenne v (en km/h) qui ferait gagner ${g === 1 ? 'une heure' : 'une demi-heure'}.`, v, {
        explanation: `t(${v0}) = ${d} ÷ ${v0} = ${t0} h. On veut t(v) = ${fmt(t0 - g)} : ${F(d, 'v')} = ${fmt(t0 - g)} ⇔ v = ${d} ÷ ${fmt(t0 - g)} = ${v} km/h.`,
      }))
    }),
    // Le seuil de rentabilité
    () => retry(() => {
      const a = randInt(2, 12), p = a + randInt(3, 15), b = randInt(5, 60) * 10, M = randInt(5, 60) * 10
      const v = r6((M + b) / (p - a)), x0 = Math.ceil(v)
      if (x0 < 5 || x0 > 500) return null
      const o = pick([
        { who: 'Un food-truck', obj: 'burgers', s: 'burger' }, { who: 'Le club de handball', obj: 't-shirts', s: 't-shirt' },
        { who: 'Une forge', obj: 'fers à cheval', s: 'fer' }, { who: 'Une apicultrice', obj: 'pots de miel', s: 'pot' },
      ])
      return T('Le seuil de rentabilité', numeric(`${o.who} vend des ${o.obj} à ${p} € l'unité. Chaque ${o.s} coûte ${a} € à produire, et il faut payer ${b} € de frais fixes. On note B(x) le bénéfice réalisé pour x ${o.obj} vendus. Exprime B(x), puis trouve combien il faut en vendre au minimum pour gagner au moins ${M} €.`, x0, {
        explanation: `B(x) = ${p}x − (${a}x + ${b}) = ${poly([p - a, 'x'], [-b, ''])}. B(x) ≥ ${M} ⇔ ${p - a}x ≥ ${M + b} ⇔ x ≥ ${fracText(M + b, p - a)}${isInt(v) ? '' : ` ≈ ${fmt(Math.round(v * 10) / 10)}`}. Il faut donc en vendre ${x0}.`,
      }))
    }),
    // Énergie cinétique : antécédent par la fonction carré
    () => {
      const o = pick([
        { n: 'd’une voiture', e: 'lancée', m: [1000, 1200, 1500], v: [10, 15, 20, 25, 30] }, { n: 'd’une moto et de son pilote', e: 'lancés', m: [200, 250, 300], v: [15, 20, 25, 30] },
        { n: 'd’un cycliste et de son vélo', e: 'lancés', m: [80, 90, 100], v: [5, 8, 10, 12] }, { n: 'd’un cheval au galop', e: 'lancé', m: [400, 500, 600], v: [10, 12, 15] },
      ])
      const m = pick(o.m), v = pick(o.v), E = (m * v * v) / 2
      return T('L’énergie de la course', numeric(`L'énergie cinétique (en joules) ${o.n}, de masse totale ${m} kg, ${o.e} à la vitesse v (en m/s), est E(v) = ${F(1, 2)} × ${m} × v². Elle vaut ${E} J. Quelle est sa vitesse en km/h ? (1 m/s = 3,6 km/h)`, r6(v * 3.6), {
        explanation: `E(v) = ${m / 2}v² = ${E} ⇔ v² = ${v * v} ⇔ v = ${v} m/s (car v > 0), soit ${v} × 3,6 = ${fmt(r6(v * 3.6))} km/h.`,
      }))
    },
    // L'échelle qui glisse
    () => {
      const L = pick([2.5, 5]), s = L / 25
      const xs = [7, 15, 20, 24].map((v) => r6(v * s)), hs = [24, 20, 15, 7].map((v) => r6(v * s))
      const i = randInt(0, 2), j = randInt(i + 1, 3)
      const [x1, x2, h1, h2] = [xs[i], xs[j], hs[i], hs[j]]
      const fig = free({ _w0: [0, 0], _w1: [0, L * 1.02], _g0: [-0.12 * L, 0], _g1: [L * 1.02, 0], P: [x1, 0], H: [0, h1], Q: [x2, 0], K: [0, h2] }, {
        segments: [
          { a: '_w0', b: '_w1', color: AXIS }, { a: '_g0', b: '_g1', color: AXIS },
          { a: 'P', b: 'H', label: `${fmt(L)} m`, color: GOLD }, { a: 'Q', b: 'K', dashed: true, color: GOLD },
        ],
        angles: [{ vertex: '_w0', a: '_g1', b: '_w1', right: true }],
        pos: { P: 's', Q: 's', H: 'w', K: 'w' },
        away: { PH: '_w0' },
        caption: 'L’échelle passe de [PH] à [QK]. La figure n’est pas à l’échelle.',
      })
      return T('L’échelle qui glisse', numeric(`Une échelle de ${fmt(L)} m est appuyée contre un mur vertical. Quand son pied est à x m du mur, son sommet est à la hauteur h(x) (en m). Exprime h(x) à l'aide du théorème de Pythagore. Le pied de l'échelle glisse de ${fmt(x1)} m à ${fmt(x2)} m du mur : de combien de mètres le sommet descend-il ?`, r6(h1 - h2), {
        explanation: `h(x) = √(${fmt(L)}² − x²). h(${fmt(x1)}) = √(${fmt(r6(L * L))} − ${fmt(r6(x1 * x1))}) = √${fmt(r6(h1 * h1))} = ${fmt(h1)} et h(${fmt(x2)}) = √(${fmt(r6(L * L))} − ${fmt(r6(x2 * x2))}) = √${fmt(r6(h2 * h2))} = ${fmt(h2)}. Le sommet descend de ${fmt(r6(h1 - h2))} m.`,
      }), fig)
    },
    // Deux sorts : x² contre une fonction affine
    () => {
      const r2 = randInt(4, 12), r1 = -randInt(1, r2 - 1), k = r1 + r2, c = -r1 * r2
      return T('Tempête ou Éclair ?', numeric(`Dans un jeu vidéo, au niveau x, le sort « Tempête » inflige f(x) = x² points de dégâts et le sort « Éclair » g(x) = ${poly([k, 'x'], [c, ''])} points. À partir de quel niveau (entier) la Tempête fait-elle strictement plus de dégâts que l'Éclair ? (Tu peux factoriser f(x) − g(x) ou comparer des valeurs.)`, r2 + 1, {
        explanation: `f(x) − g(x) = ${poly([1, 'x²'], [-k, 'x'], [-c, ''])} = (${xPlus(-r2)})(${xPlus(-r1)}). Pour x > 0, le facteur ${xPlus(-r1)} est positif, donc f(x) > g(x) ⇔ x > ${r2}. Au niveau ${r2}, il y a égalité (${r2 * r2} points) : il faut atteindre le niveau ${r2 + 1}.`,
      }))
    },
  ],
  [
    // Le rectangle inscrit : Thalès puis maximum
    () => {
      const b = pick([4, 6, 8, 10, 12]), c = randInt(3, 12), max = (b * c) / 4
      const t = 0.32, cd = Math.min(1.3 * b, Math.max(0.6 * b, c))
      const fig = free({ A: [0, 0], B: [b, 0], C: [0, cd], M: [t * b, 0], P: [t * b, cd * (1 - t)], N: [0, cd * (1 - t)] }, {
        segments: [
          { a: 'A', b: 'M', label: 'x' }, { a: 'M', b: 'B', label: `AB = ${b} cm`, color: 'transparent' }, { a: 'M', b: 'B' }, { a: 'B', b: 'C' }, { a: 'C', b: 'A', label: `${c} cm` },
          { a: 'M', b: 'P' }, { a: 'P', b: 'N' },
        ],
        polygons: [{ pts: ['A', 'M', 'P', 'N'], fill: GOLD }],
        angles: [{ vertex: 'A', a: 'B', b: 'C', right: true }],
        pos: { M: 's', N: 'w', P: 'ne' },
      })
      return T('Le plus grand rectangle', numeric(`ABC est un triangle rectangle en A avec AB = ${b} cm et AC = ${c} cm. On place M sur [AB] avec AM = x, puis on construit le rectangle AMPN avec P sur [BC] et N sur [AC]. À l'aide du théorème de Thalès, exprime MP en fonction de x, puis l'aire A(x) du rectangle. Quelle est l'aire maximale de ce rectangle (en cm²) ?`, max, {
        explanation: `(MP) // (AC), donc ${F('BM', 'BA')} = ${F('MP', 'AC')} : MP = ${F(`${c}(${b} − x)`, b)}. A(x) = AM × MP = ${F(c, b)} × x(${b} − x). Or x(${b} − x) = ${(b / 2) ** 2} − (x − ${b / 2})² est maximal pour x = ${b / 2}, où il vaut ${(b / 2) ** 2}. Aire maximale : ${F(c, b)} × ${(b / 2) ** 2} = ${fmt(max)} cm².`,
      }), fig)
    },
    // La boîte de volume maximal
    () => {
      const k = randInt(2, 7), s = 6 * k
      const V = (x: number) => x * (s - 2 * x) ** 2
      const mat = pick(['d’une plaque de carton', 'd’une feuille de cuivre', 'd’une plaque de tôle', 'd’une feuille de papier cartonné'])
      const askX = Math.random() < 0.4
      return T('La plus grande boîte', numeric(`On découpe un carré de côté x cm (x entier) à chaque coin ${mat} carrée de ${s} cm de côté, puis on relève les bords pour obtenir une boîte sans couvercle. Exprime son volume V(x) et dresse un tableau de valeurs. ${askX ? 'Quelle valeur de x donne le plus grand volume ?' : 'Quel est le plus grand volume (en cm³) que l’on peut obtenir ?'}`, askX ? k : V(k), {
        explanation: `V(x) = x(${s} − 2x)², pour x entier de 1 à ${3 * k - 1}. V(${k - 1}) = ${V(k - 1)}, V(${k}) = ${V(k)}, V(${k + 1}) = ${V(k + 1)}… Le volume augmente jusqu'à x = ${k} puis diminue : le maximum est V(${k}) = ${V(k)} cm³.`,
      }), sheetFig(s))
    },
    // L'aller-retour : vitesse moyenne et inverses
    () => retry(() => {
      const mode = pick([{ s: 'à vélo', lo: 2, hi: 8 }, { s: 'en voiture', lo: 6, hi: 26 }, { s: 'à cheval', lo: 2, hi: 8 }])
      const v1 = randInt(mode.lo, mode.hi) * 5, v2 = randInt(mode.lo, mode.hi) * 5
      if (v1 === v2) return null
      const m = (2 * v1 * v2) / (v1 + v2)
      if (!isInt(m)) return null
      return T('L’aller-retour', numeric(`${prenom()} fait l'aller-retour ${mode.s} entre deux villages. À l'aller, la vitesse moyenne est de ${v1} km/h. À quelle vitesse moyenne v faut-il faire le retour pour que la vitesse moyenne sur l'ensemble de l'aller-retour soit de ${m} km/h ? (Attention : ce n'est pas la moyenne des deux vitesses !)`, v2, {
        explanation: `Pour une distance d : durée totale = ${F('d', v1)} + ${F('d', 'v')} et vitesse moyenne = 2d ÷ durée. Donc ${F(2, m)} = ${F(1, v1)} + ${F(1, 'v')}, soit ${F(1, 'v')} = ${F(2, m)} − ${F(1, v1)} = ${F(1, v2)} : v = ${v2} km/h.`,
      }))
    }),
    // Les deux carrés sur un segment
    () => {
      const p = randInt(3, 10), q = randInt(1, p - 1), L = 2 * p, S = 2 * p * p + 2 * q * q
      const m = 3.8, Ld = 10
      const fig = free({ A: [0, 0], M: [m, 0], B: [Ld, 0], _a: [m, m], _b: [0, m], _c: [Ld, Ld - m], _d: [m, Ld - m] }, {
        segments: [
          { a: 'A', b: 'M', label: 'x' }, { a: 'M', b: 'B', label: `${L} − x` },
          { a: 'M', b: '_a' }, { a: '_a', b: '_b' }, { a: '_b', b: 'A' }, { a: 'B', b: '_c' }, { a: '_c', b: '_d' }, { a: '_d', b: 'M' },
        ],
        polygons: [{ pts: ['A', 'M', '_a', '_b'], fill: GOLD }, { pts: ['M', 'B', '_c', '_d'], fill: BLUE }],
        pos: { A: 's', M: 's', B: 's' },
      })
      return T('Les deux carrés', solutionSet(`Sur un segment [AB] de longueur ${L} cm, on place un point M avec AM = x. On construit deux carrés de côtés [AM] et [MB], et on note f(x) la somme de leurs aires. Vérifie que f(x) = 2(x − ${p})² + ${2 * p * p}, puis trouve les valeurs de x pour lesquelles f(x) = ${S} cm².`, [p - q, p + q], {
        explanation: `f(x) = x² + (${L} − x)² = 2x² − ${4 * p}x + ${4 * p * p}, et 2(x − ${p})² + ${2 * p * p} = 2x² − ${4 * p}x + ${2 * p * p} + ${2 * p * p} : c'est la même expression. f(x) = ${S} ⇔ 2(x − ${p})² = ${2 * q * q} ⇔ (x − ${p})² = ${q * q} ⇔ x − ${p} = ${q} ou x − ${p} = −${q}, soit x = ${p + q} ou x = ${p - q}.`,
      }), fig)
    },
    // La location partagée : f(n) = C/n
    () => retry(() => {
      const n = randInt(3, 12), j = randInt(1, 3), k = randInt(2, 10)
      const C = (k * n * (n + j)) / j
      if (!isInt(C) || C > 2400 || C < 60 || !isDec(C / n, 2) || !isDec(C / (n + j), 2)) return null
      const o = pick([
        { t: 'La location du gîte', s: `Un groupe d'amis loue un gîte pour ${C} €, à partager équitablement` },
        { t: 'Le cadeau commun', s: `Des collègues achètent ensemble un cadeau de ${C} €, à partager équitablement` },
        { t: 'Le bateau de croisière', s: `Une bande de copains réserve un bateau pour ${C} €, à partager équitablement` },
      ])
      return T(o.t, numeric(`${o.s} : quand ils sont n, chacun paie f(n) = ${F(C, 'n')} euros. S'ils étaient ${j === 1 ? 'une personne' : `${j} personnes`} de plus, chacun paierait ${k} € de moins. Écris une équation vérifiée par n, puis trouve combien ils sont (n est un entier : tu peux tester des valeurs).`, n, {
        explanation: `f(n) − f(n + ${j}) = ${k} ⇔ ${F(C, 'n')} − ${F(C, `n + ${j}`)} = ${k} ⇔ ${C}(n + ${j}) − ${C}n = ${k}n(n + ${j}) ⇔ n(n + ${j}) = ${(C * j) / k}. Or ${n} × ${n + j} = ${n * (n + j)} : ils sont ${n}. Vérification : ${fmt(r6(C / n))} − ${fmt(r6(C / (n + j)))} = ${k}.`,
      }))
    }),
  ],
]

// ═════════════════════════════════════════════════════════════════════════
// 2-vect : coordonnées, somme, milieu, distance, colinéarité
// ═════════════════════════════════════════════════════════════════════════
/** Vecteur nommé avec ses coordonnées : u⃗(2 ; −3). */
const Vc = (n: string, p: Pt) => `${n}⃗(${fmt(p[0])} ; ${fmt(p[1])})`
const quad = (a: string, b: string, c: string, d: string): FigSegment[] => [{ a, b }, { a: b, b: c }, { a: c, b: d }, { a: d, b: a }]
const norm2 = (u: Pt) => u[0] * u[0] + u[1] * u[1]

const vect: Ladder = [
  [
    // Le quatrième sommet puis la diagonale
    () => retry(() => {
      const A = rp(5), B = rp(5), C = rp(5)
      if (Math.abs(det(subv(B, A), subv(C, A))) < 8) return null
      const D = subv(add(A, C), B)
      if (!inBox(D, 7)) return null
      const u = subv(D, B), n = norm2(u), r = Math.round(Math.sqrt(n))
      if (r * r !== n || !u[0] || !u[1]) return null
      const fig = repere({ A, B, C, D }, {
        segments: [...quad('A', 'B', 'C', 'D'), { a: 'B', b: 'D', dashed: true, color: RED }],
        polygons: [{ pts: ['A', 'B', 'C', 'D'], fill: GOLD }],
      })
      return T('La quatrième tour', numeric(`Trois tours de guet occupent les points ${P('A', A)}, ${P('B', B)} et ${P('C', C)} d'un repère orthonormé (unité : 1 km). On veut bâtir une quatrième tour D pour que ABCD soit un parallélogramme, puis tendre un câble de B à D. Calcule les coordonnées de D, puis la longueur BD (en km).`, r, {
        explanation: `ABCD est un parallélogramme ⇔ AD⃗ = BC⃗ : D = A + BC⃗ = (${fmt(D[0])} ; ${fmt(D[1])}). BD = √(${par(u[0])}² + ${par(u[1])}²) = √${n} = ${r} km.`,
      }), fig)
    }),
    // Le trajet du messager : somme de vecteurs puis distance
    () => retry(() => {
      const [p, q] = pick([[3, 4], [4, 3], [6, 8], [8, 6], [5, 12], [12, 5], [9, 12], [12, 9]])
      const target: Pt = [p * pick([1, -1]), q * pick([1, -1])]
      const A = rp(3), u = rp(5), v = rp(5), twice = Math.random() < 0.5
      const rest = subv(subv(target, u), v)
      if (twice && (rest[0] % 2 || rest[1] % 2)) return null
      const w = twice ? mul(0.5, rest) : rest
      if ([u, v, w].some((z) => !z[0] && !z[1]) || !inBox(w, 6) || Math.abs(det(u, target)) < 8 || Math.abs(det(v, target)) < 4) return null
      const P1 = add(A, u), P2 = add(P1, v), P3 = add(P2, twice ? w : [0, 0]), B = add(A, target)
      const raw: Raw = { A, _p1: P1, _p2: P2, B }
      const segs: FigSegment[] = [{ a: 'A', b: '_p1', mark: 'arrow' }, { a: '_p1', b: '_p2', mark: 'arrow' }]
      if (twice) { raw._p3 = P3; segs.push({ a: '_p2', b: '_p3', mark: 'arrow' }, { a: '_p3', b: 'B', mark: 'arrow' }) } else segs.push({ a: '_p2', b: 'B', mark: 'arrow' })
      segs.push({ a: 'A', b: 'B', dashed: true, color: RED })
      const r = Math.sqrt(p * p + q * q)
      return T('Le trajet du messager', numeric(`Un messager part du camp ${P('A', A)}. Il se déplace successivement selon les vecteurs ${Vc('u', u)} et ${Vc('v', v)}, puis ${twice ? 'deux fois de suite ' : ''}selon le vecteur ${Vc('w', w)}, et arrive au point B. Calcule les coordonnées de B, puis la distance AB à vol d'oiseau (unité du repère : 1 km).`, r, {
        explanation: `AB⃗ = u⃗ + v⃗ + ${twice ? '2' : ''}w⃗ = (${fmt(target[0])} ; ${fmt(target[1])}), donc B(${fmt(B[0])} ; ${fmt(B[1])}). AB = √(${par(target[0])}² + ${par(target[1])}²) = √${p * p + q * q} = ${r} km.`,
      }), free(raw, { segments: segs, caption: 'Le trajet du messager (figure indicative).' }))
    }),
    // Le champ triangulaire : réciproque de Pythagore puis aire
    () => retry(() => {
      const R = rp(4), p = randNonZero(-3, 3), q = randInt(-3, 3), k = pick([1, 2]), sg = pick([1, -1])
      const u: Pt = [p, q], v: Pt = mul(sg * k, [-q, p])
      const S = add(R, u), Q = add(R, v)
      if (!inBox(S, 7) || !inBox(Q, 7)) return null
      const n = norm2(u), area = (k * n) / 2
      const [nR, nS, nQ] = shuffle(['A', 'B', 'C'])
      const pts: Record<string, Pt> = { [nR]: R, [nS]: S, [nQ]: Q }
      const seg = (a: string, b: string) => [a, b].sort().join('')
      const fig = repere(pts, { segments: [{ a: 'A', b: 'B' }, { a: 'B', b: 'C' }, { a: 'C', b: 'A' }], polygons: [{ pts: ['A', 'B', 'C'], fill: GREEN }] })
      return T('Le champ triangulaire', numeric(`Un champ triangulaire a pour sommets ${P('A', pts.A)}, ${P('B', pts.B)} et ${P('C', pts.C)} dans un repère orthonormé (unité : 10 m). Montre que ce triangle est rectangle, puis calcule son aire (dans l'unité d'aire du repère).`, area, {
        explanation: `${seg(nR, nS)}² = ${n}, ${seg(nR, nQ)}² = ${k * k * n} et ${seg(nS, nQ)}² = ${(1 + k * k) * n} = ${n} + ${k * k * n} : d'après la réciproque du théorème de Pythagore, le triangle est rectangle en ${nR}. Aire = ${F(`${seg(nR, nS)} × ${seg(nR, nQ)}`, 2)} = ${F(`√${n} × √${k * k * n}`, 2)} = ${F(k * n, 2)} = ${fmt(area)}.`,
      }), fig)
    }),
    // Symétrique puis translation
    () => retry(() => {
      const A = rp(5), B = rp(4), u = rp(4)
      if ((!u[0] && !u[1]) || (A[0] === B[0] && A[1] === B[1])) return null
      const C = subv(mul(2, B), A), D = add(C, u)
      if (!inBox(C, 9) || !inBox(D, 9)) return null
      return T('Le pont et les moulins', pair(`Le pont ${P('B', B)} est exactement au milieu du chemin rectiligne qui relie le moulin ${P('A', A)} au moulin C. Depuis C, un cavalier suit le vecteur ${Vc('u', u)} et arrive en D. Quelles sont les coordonnées de D ?`, D[0], D[1], {
        explanation: `B est le milieu de [AC] : x_C = 2x_B − x_A = ${fmt(C[0])} et y_C = 2y_B − y_A = ${fmt(C[1])}. Donc C(${fmt(C[0])} ; ${fmt(C[1])}), puis D = C + u⃗ = (${fmt(D[0])} ; ${fmt(D[1])}).`,
      }))
    }),
    // Trois balises alignées
    () => retry(() => {
      const A = rp(5), d: Pt = [randNonZero(-3, 3), randNonZero(-3, 3)], t = pick([-2, -1, 2, 3, 1.5, -0.5, 2.5])
      const B = add(A, d), C = add(A, mul(t, d))
      if (!isInt(C[0]) || !isInt(C[1]) || !C[0] || !inBox(B, 8) || !inBox(C, 8)) return null
      const ac0 = C[0] - A[0]
      const fig = repere({ A, B, _c1: [C[0], Math.min(A[1], B[1], C[1]) - 1], _c2: [C[0], Math.max(A[1], B[1], C[1]) + 1] }, {
        segments: [{ a: 'A', b: 'B' }, { a: '_c1', b: '_c2', dashed: true, color: RED }],
        caption: `La balise C est quelque part sur la droite rouge d'équation x = ${fmt(C[0])}.`,
      })
      return T('Les balises du port', numeric(`Trois balises ${P('A', A)}, ${P('B', B)} et C(${fmt(C[0])} ; y) doivent être alignées pour guider les bateaux jusqu'au port. Quelle valeur faut-il donner à y ?`, C[1], {
        explanation: `AB⃗(${fmt(d[0])} ; ${fmt(d[1])}) et AC⃗(${fmt(ac0)} ; ${poly([1, 'y'], [-A[1], ''])}) doivent être colinéaires : ${fmt(d[0])} × (${poly([1, 'y'], [-A[1], ''])}) − ${par(d[1])} × ${par(ac0)} = 0, donc y = ${fmt(C[1])}.`,
      }), fig)
    }),
  ],
  [
    // Le domaine rectangulaire : périmètre exact
    () => retry(() => {
      const A = rp(4), p = randInt(1, 3), q = randNonZero(-3, 3), k = pick([2, 3])
      const n = p * p + q * q, [k0, m0] = sqrtParts(n)
      if (m0 === 1) return null
      const AB: Pt = [p, q], AD: Pt = mul(k * pick([1, -1]), [-q, p])
      const B = add(A, AB), D = add(A, AD), C = add(B, AD)
      if (![B, C, D].every((z) => inBox(z, 8))) return null
      const fig = repere({ A, B, D }, { segments: [{ a: 'A', b: 'B' }, { a: 'A', b: 'D' }, { a: 'B', b: 'D', dashed: true }], angles: [{ vertex: 'A', a: 'B', b: 'D', right: true }] })
      return T('Le domaine rectangulaire', radical(`Les points ${P('A', A)}, ${P('B', B)} et ${P('D', D)} sont trois sommets du domaine rectangulaire ABCD. Calcule les coordonnées de C, vérifie que le triangle ABD est rectangle en A, puis donne le périmètre exact du domaine sous la forme a√b.`, 2 * (1 + k) * k0, m0, {
        explanation: `C = B + AD⃗ = (${fmt(C[0])} ; ${fmt(C[1])}). AB² = ${n}, AD² = ${k * k * n} et BD² = ${(1 + k * k) * n} = AB² + AD² : l'angle en A est droit. AB = ${rootText(n)} et AD = ${rootText(k * k * n)}, donc le périmètre vaut 2(AB + AD) = ${2 * (1 + k) * k0}√${m0}.`,
      }), fig)
    }),
    // La flèche qui retombe : alignement avec un point de l'axe
    () => retry(() => {
      const X = randInt(-4, 6), d: Pt = [randNonZero(-3, 3), randInt(1, 3)], a = randInt(2, 4), b = randInt(1, a - 1)
      const A: Pt = [X + a * d[0], a * d[1]], B: Pt = [X + b * d[0], b * d[1]]
      if (!inBox(A, 9)) return null
      const ab = subv(B, A)
      const fig = repere({ A, B, _b0: [B[0], 0] }, { segments: [{ a: 'A', b: 'B', dashed: true, color: RED }, { a: '_b0', b: 'B', color: GREEN }], caption: 'Le piquet est en vert ; le sol est l’axe des abscisses.' })
      return T('La flèche et le piquet', numeric(`Une flèche est tirée en ligne droite depuis le point ${P('A', A)}. Elle frôle le sommet d'un piquet, au point ${P('B', B)}, puis se plante dans le sol, représenté par l'axe des abscisses, en un point M. Quelle est l'abscisse de M ?`, X, {
        explanation: `M(x ; 0). AB⃗(${fmt(ab[0])} ; ${fmt(ab[1])}) et AM⃗(${poly([1, 'x'], [-A[0], ''])} ; ${fmt(-A[1])}) sont colinéaires : ${fmt(ab[0])} × ${par(-A[1])} − ${par(ab[1])} × (${poly([1, 'x'], [-A[0], ''])}) = 0, d'où x = ${fmt(X)}.`,
      }), fig)
    }),
    // La piste du cirque : milieu et rayon exact
    () => retry(() => {
      const A = rp(5), h: Pt = [randInt(-3, 3), randInt(-3, 3)], B = add(A, mul(2, h))
      const n = norm2(h)
      if (!n || sqrtParts(n)[1] === 1 || !inBox(B, 8)) return null
      const O = add(A, h)
      const fig = repere({ A, B }, { segments: [{ a: 'A', b: 'B', dashed: true }] })
      return T('La piste du cirque', exactRoot(`Le segment [AB], avec ${P('A', A)} et ${P('B', B)}, est un diamètre de la piste circulaire d'un cirque (unité : 1 m). Calcule les coordonnées du centre Ω de la piste, puis la valeur exacte de son rayon (en m), sous la forme la plus simple.`, n,
        `Ω est le milieu de [AB] : Ω(${fmt(O[0])} ; ${fmt(O[1])}). Rayon = ΩA = √(${par(A[0] - O[0])}² + ${par(A[1] - O[1])}²) = √${n} = ${rootText(n)} m.`), fig)
    }),
    // Le tir de la catapulte : combinaison linéaire
    () => retry(() => {
      const A = rp(3), B = rp(4), C = rp(4)
      const al = pick([2, 3, -1, -2]), be = pick([1, -1, 2, 0.5, -0.5])
      const AB = subv(B, A), AC = subv(C, A)
      if (Math.abs(det(AB, AC)) < 4) return null
      const AM = add(mul(al, AB), mul(be, AC)), M = add(A, AM)
      if (!isInt(AM[0]) || !isInt(AM[1]) || !inBox(M, 9)) return null
      const coef = (c: number) => (c === 1 ? '' : c === -1 ? '−' : Math.abs(c) === 0.5 ? `${c < 0 ? '−' : ''}${F(1, 2)}` : fmt(c))
      const expr = `${coef(al)}AB⃗ ${be < 0 ? '−' : '+'} ${coef(Math.abs(be))}AC⃗`
      const fig = repere({ A, B, C }, { segments: [{ a: 'A', b: 'B', mark: 'arrow' }, { a: 'A', b: 'C', mark: 'arrow' }] })
      return T('Le tir de la catapulte', pair(`Sur la carte du siège, la catapulte est en ${P('A', A)} et deux repères sont plantés en ${P('B', B)} et ${P('C', C)}. Le boulet tombe au point M tel que AM⃗ = ${expr}. Quelles sont les coordonnées de M ?`, M[0], M[1], {
        explanation: `AB⃗(${fmt(AB[0])} ; ${fmt(AB[1])}) et AC⃗(${fmt(AC[0])} ; ${fmt(AC[1])}), donc AM⃗(${fmt(AM[0])} ; ${fmt(AM[1])}) et M = A + AM⃗ = (${fmt(M[0])} ; ${fmt(M[1])}).`,
      }), fig)
    }),
    // Le puits équidistant
    () => retry(() => {
      const A: Pt = [randInt(-6, 2), randInt(1, 6)], B: Pt = [randInt(-2, 7), randInt(1, 6)]
      if (A[0] === B[0]) return null
      const x = r6((norm2(B) - norm2(A)) / (2 * (B[0] - A[0])))
      if (!isDec(x, 1)) return null
      const fig = repere({ A, B }, { caption: 'Repère orthonormé : la route est l’axe des abscisses.' })
      return T('Le puits entre deux fermes', numeric(`Deux fermes sont situées en ${P('A', A)} et ${P('B', B)}. On veut creuser un puits P sur la route rectiligne représentée par l'axe des abscisses, à égale distance des deux fermes. Quelle est l'abscisse de P ?`, x, {
        explanation: `P(x ; 0) : PA² = (${xPlus(-A[0])})² + ${A[1] * A[1]} et PB² = (${xPlus(-B[0])})² + ${B[1] * B[1]}. PA² = PB² ⇔ ${poly([-2 * A[0], 'x'], [norm2(A), ''])} = ${poly([-2 * B[0], 'x'], [norm2(B), ''])} (les x² s'éliminent) ⇔ x = ${fmt(x)}.`,
      }), fig)
    }),
  ],
  [
    // Le point de concours dans le parallélogramme
    () => retry(() => {
      const [p, q] = pick([[1, 2], [1, 3], [2, 3], [1, 4], [3, 4]])
      const A = rp(3), AB: Pt = [q, q * randInt(-1, 1)], AD: Pt = [randInt(-2, 2), randInt(2, 4)]
      if (Math.abs(det(AB, AD)) < 6) return null
      const B = add(A, AB), D = add(A, AD), C = add(B, AD), E = add(A, mul(p / q, AB))
      if (![B, C, D].every((z) => inBox(z, 8))) return null
      const G = add(A, mul(p / (p + q), subv(C, A)))
      const fig = repere({ A, B, C, D, E, G }, {
        segments: [...quad('A', 'B', 'C', 'D'), { a: 'D', b: 'E', color: BLUE }, { a: 'A', b: 'C', dashed: true }],
        pos: { E: 's', G: 'e' },
      })
      return T('Le point de rencontre', fraction(`ABCD est un parallélogramme, avec ${P('A', A)}, ${P('B', B)} et ${P('D', D)}. Le point E vérifie AE⃗ = ${F(p, q)}AB⃗. La droite (DE) coupe la diagonale (AC) en G. Détermine le réel k tel que AG⃗ = k AC⃗.`, p, p + q, {
        explanation: `C = B + AD⃗ = (${fmt(C[0])} ; ${fmt(C[1])}) et E(${fmt(E[0])} ; ${fmt(E[1])}). G ∈ (AC) : AG⃗ = k(AB⃗ + AD⃗). G ∈ (DE) : AG⃗ = AD⃗ + t DE⃗ = ${F(p, q)}t AB⃗ + (1 − t)AD⃗. En identifiant : k = ${F(p, q)}t et k = 1 − t, donc ${q}k = ${p}(1 − k) et k = ${F(p, p + q)}. (On peut aussi écrire que DE⃗ et DG⃗ sont colinéaires.)`,
      }), fig)
    }),
    // Le parterre en losange
    () => retry(() => {
      const I = rp(2), u: Pt = [randInt(1, 3), randInt(-3, 3)], k = pick([2, 3])
      const v = mul(k, [-u[1], u[0]])
      const A = subv(I, u), C = add(I, u), B = subv(I, v), D = add(I, v)
      if (![A, B, C, D].every((z) => inBox(z, 9))) return null
      const n = norm2(u), area = 2 * k * n
      const fig = repere({ A, B, C }, {
        segments: [{ a: 'A', b: 'B' }, { a: 'B', b: 'C' }, { a: 'A', b: 'C', dashed: true }],
      })
      return T('Le parterre en losange', numeric(`Un jardinier trace un parterre de fleurs ABCD, avec ${P('A', A)}, ${P('B', B)} et ${P('C', C)}. Il place D pour que ABCD soit un parallélogramme. Calcule les coordonnées de D, montre que ABCD est un losange, puis calcule son aire (unité d'aire du repère).`, area, {
        explanation: `D = A + BC⃗ = (${fmt(D[0])} ; ${fmt(D[1])}). AB² = BC² = ${(1 + k * k) * n} : ce parallélogramme a deux côtés consécutifs égaux, c'est un losange. Ses diagonales mesurent AC = √${4 * n} et BD = √${4 * k * k * n}. Aire = ${F('AC × BD', 2)} = ${F(`√${16 * k * k * n * n}`, 2)} = ${F(4 * k * n, 2)} = ${area}.`,
      }), fig)
    }),
    // Colinéarité avec paramètre : (x + c)² = ab
    () => {
      const s = randInt(2, 8), N = s * s
      const divs: number[] = []
      for (let d = 1; d <= N; d++) if (N % d === 0 && d !== s) divs.push(d)
      const a = pick(divs), b = N / a, c = randInt(-5, 5)
      return T('Les catapultes parallèles', solutionSet(`Deux catapultes doivent tirer dans des directions parallèles. Leurs directions sont données par les vecteurs u⃗(${xPlus(c)} ; ${a}) et v⃗(${b} ; ${xPlus(c)}), où x est un réglage. Pour quelles valeurs de x ces vecteurs sont-ils colinéaires ?`, [-c - s, -c + s], {
        explanation: `det(u⃗, v⃗) = (${xPlus(c)})(${xPlus(c)}) − ${a} × ${b} = (${xPlus(c)})² − ${N}. Il est nul ⇔ (${xPlus(c)})² = ${N} ⇔ ${xPlus(c)} = ${s} ou ${xPlus(c)} = −${s}, soit x = ${fmt(s - c)} ou x = ${fmt(-s - c)}.`,
      }))
    },
    // Le carré : quart de tour
    () => retry(() => {
      const A = rp(3), u: Pt = [randInt(1, 4), randInt(-3, 3)]
      const r: Pt = [-u[1], u[0]], B = add(A, u), D = add(A, r), C = add(B, r)
      if (![B, C, D].every((z) => inBox(z, 8))) return null
      const askC = Math.random() < 0.6
      const fig = repere({ A, B }, { segments: [{ a: 'A', b: 'B' }] })
      const Q = askC ? C : D
      return T('La tour carrée', pair(`Sur le plan, la base d'une tour est un carré ABCD dont les sommets sont nommés dans le sens inverse des aiguilles d'une montre, avec ${P('A', A)} et ${P('B', B)}. Quelles sont les coordonnées de ${askC ? 'C' : 'D'} ? (Aide : un quart de tour dans le sens inverse des aiguilles d'une montre transforme le vecteur (a ; b) en (−b ; a).)`, Q[0], Q[1], {
        explanation: `AB⃗(${fmt(u[0])} ; ${fmt(u[1])}). Le quart de tour donne AD⃗ = BC⃗ = (${fmt(r[0])} ; ${fmt(r[1])}). Donc D = A + AD⃗ = (${fmt(D[0])} ; ${fmt(D[1])}) et C = B + BC⃗ = (${fmt(C[0])} ; ${fmt(C[1])}).`,
      }), fig)
    }),
    // Le point d'équilibre du radeau
    () => retry(() => {
      const w = [randInt(1, 3), randInt(1, 3), randInt(1, 3)], S = w[0] + w[1] + w[2]
      if (w[0] === w[1] && w[1] === w[2]) return null
      const A = rp(5), B = rp(5), C = rp(5)
      if (Math.abs(det(subv(B, A), subv(C, A))) < 8) return null
      const num: Pt = [w[0] * A[0] + w[1] * B[0] + w[2] * C[0], w[0] * A[1] + w[1] * B[1] + w[2] * C[1]]
      const G = mul(1 / S, num)
      if (!isInt(G[0]) || !isInt(G[1])) return null
      const cf = (k: number) => (k === 1 ? '' : `${k}`)
      const fig = repere({ A, B, C }, { segments: [{ a: 'A', b: 'B', dashed: true }, { a: 'B', b: 'C', dashed: true }, { a: 'C', b: 'A', dashed: true }] })
      return T('L’équilibre du radeau', pair(`Trois caisses de ${w[0]}, ${w[1]} et ${w[2]} tonnes sont posées sur un radeau, aux points ${P('A', A)}, ${P('B', B)} et ${P('C', C)}. Le point d'équilibre G du radeau vérifie ${cf(w[0])}GA⃗ + ${cf(w[1])}GB⃗ + ${cf(w[2])}GC⃗ = 0⃗. Quelles sont les coordonnées de G ?`, G[0], G[1], {
        explanation: `En abscisse : ${w[0]}(${fmt(A[0])} − x) + ${w[1]}(${fmt(B[0])} − x) + ${w[2]}(${fmt(C[0])} − x) = 0, donc ${S}x = ${fmt(num[0])} et x = ${fmt(G[0])}. De même en ordonnée : ${S}y = ${fmt(num[1])}, donc y = ${fmt(G[1])}.`,
      }), fig)
    }),
  ],
]

// ═════════════════════════════════════════════════════════════════════════
// 2-droites : coefficient directeur, équations de droites, systèmes 2×2
// ═════════════════════════════════════════════════════════════════════════
/** Deux droites sécantes à coefficients entiers passant par I. */
function twoLines(I: Pt): [number, number, number, number] | null {
  const m1 = randNonZero(-3, 3), m2 = randNonZero(-3, 3)
  if (m1 === m2) return null
  return [m1, I[1] - m1 * I[0], m2, I[1] - m2 * I[0]]
}
const solveText = (m1: number, p1: number, m2: number, p2: number, I: Pt) =>
  `${poly([m1, 'x'], [p1, ''])} = ${poly([m2, 'x'], [p2, ''])} ⇔ ${poly([m1 - m2, 'x'])} = ${fmt(p2 - p1)} ⇔ x = ${fmt(I[0])}, puis y = ${fmt(I[1])}`

const droites: Ladder = [
  [
    // Le carrefour : deux droites par deux points, intersection
    () => retry(() => {
      const I = rp(4), L = twoLines(I)
      if (!L) return null
      const [m1, p1, m2, p2] = L
      const [a1, b1] = shuffle([-2, -1, 1, 2, 3]), [a2, b2] = shuffle([-2, -1, 1, 2, 3])
      const A = add(I, [a1, a1 * m1]), B = add(I, [b1, b1 * m1]), C = add(I, [a2, a2 * m2]), D = add(I, [b2, b2 * m2])
      if (![A, B, C, D].every((z) => inBox(z, 8))) return null
      const fig = repere({ A, B, C, D }, { lines: [{ m: m1, p: p1 }, { m: m2, p: p2, color: BLUE }] })
      return T('Le carrefour', pair(`Deux routes rectilignes traversent la carte : la première passe par les villages ${P('A', A)} et ${P('B', B)}, la seconde par ${P('C', C)} et ${P('D', D)}. Détermine les équations réduites des droites (AB) et (CD), puis les coordonnées du carrefour I où elles se croisent.`, I[0], I[1], {
        explanation: `(AB) : m = ${F(`${fmt(B[1])} − ${par(A[1])}`, `${fmt(B[0])} − ${par(A[0])}`)} = ${fmt(m1)}, d'où ${lineEq(m1, p1)}. (CD) : ${lineEq(m2, p2)}. Puis ${solveText(m1, p1, m2, p2, I)}.`,
      }), fig)
    }),
    // Les billets : système puis combinaison
    () => retry(() => {
      const Ad = randInt(8, 20), Ch = randInt(3, Ad - 2)
      const a1 = randInt(1, 4), c1 = randInt(1, 5), a2 = randInt(1, 4), c2 = randInt(1, 5), a3 = randInt(1, 3), c3 = randInt(1, 4)
      if (a1 * c2 - a2 * c1 === 0) return null
      const lieuB = pick(['Au musée', 'Au zoo', 'Au parc d’attractions', 'Au spectacle de chevalerie', 'À la patinoire'])
      const pl = (n: number, w: string) => `${n} ${w}${n > 1 ? 's' : ''}`
      return T('La sortie en famille', numeric(`${lieuB}, ${pl(a1, 'adulte')} et ${pl(c1, 'enfant')} paient ${a1 * Ad + c1 * Ch} € ; ${pl(a2, 'adulte')} et ${pl(c2, 'enfant')} paient ${a2 * Ad + c2 * Ch} €. Écris un système, puis calcule combien paiera une famille de ${pl(a3, 'adulte')} et ${pl(c3, 'enfant')}.`, a3 * Ad + c3 * Ch, {
        explanation: `Avec a le prix adulte et e le prix enfant : ${poly([a1, 'a'], [c1, 'e'])} = ${a1 * Ad + c1 * Ch} et ${poly([a2, 'a'], [c2, 'e'])} = ${a2 * Ad + c2 * Ch}. On trouve a = ${Ad} € et e = ${Ch} €, donc ${a3} × ${Ad} + ${c3} × ${Ch} = ${a3 * Ad + c3 * Ch} €.`,
      }))
    }),
    // La parallèle et l'ordonnée à l'origine
    () => retry(() => {
      const A = rp(5), dx = randNonZero(-3, 3), dy = randNonZero(-6, 6), B = add(A, [dx, dy]), m = dy / dx
      const Cp = rp(5), p = r6(Cp[1] - m * Cp[0])
      if (!isDec(m, 1) || !isDec(p, 1) || !inBox(B, 8) || det([dx, dy], subv(Cp, A)) === 0) return null
      const fig = repere({ A, B, C: Cp }, { lines: [{ m, p: A[1] - m * A[0] }] })
      return T('La route parallèle', numeric(`On veut tracer une route Δ parallèle à la route (AB) et passant par le puits C, avec ${P('A', A)}, ${P('B', B)} et ${P('C', Cp)}. En quel point Δ coupe-t-elle l'axe des ordonnées ? Donne l'ordonnée de ce point.`, p, {
        explanation: `Coefficient directeur de (AB) : ${F(`${fmt(B[1])} − ${par(A[1])}`, `${fmt(B[0])} − ${par(A[0])}`)} = ${fmt(m)}. Δ a le même : y = ${poly([m, 'x'])} + p. Elle passe par C : ${fmt(Cp[1])} = ${fmt(m)} × ${par(Cp[0])} + p, donc p = ${fmt(p)}.`,
      }), fig)
    }),
    // Pièces, pattes ou points : système 2×2
    () => {
      const v = randInt(0, 2), name = prenom()
      if (v === 0) {
        const x = randInt(3, 30), y = randInt(3, 30), n = x + y, V = 2 * x + 5 * y
        return T('La tirelire', numeric(`La tirelire de ${name} contient ${n} pièces, uniquement des pièces de 2 € et de 5 €, pour un total de ${V} €. Écris un système, puis trouve le nombre de pièces de 5 €.`, y, {
          explanation: `Avec d pièces de 2 € et c pièces de 5 € : d + c = ${n} et 2d + 5c = ${V}. En remplaçant d par ${n} − c : 2(${n} − c) + 5c = ${V}, soit 3c = ${V - 2 * n} et c = ${y}.`,
        }))
      }
      if (v === 1) {
        const x = randInt(5, 40), y = randInt(3, 30), n = x + y, L = 2 * x + 4 * y
        return T('Poules et lapins', numeric(`Dans la basse-cour du château, on compte ${n} têtes et ${L} pattes parmi les poules et les lapins. Écris un système, puis trouve le nombre de lapins.`, y, {
          explanation: `Avec p poules et l lapins : p + l = ${n} et 2p + 4l = ${L}. En remplaçant p par ${n} − l : 2(${n} − l) + 4l = ${L}, soit 2l = ${L - 2 * n} et l = ${y}.`,
        }))
      }
      const x = randInt(3, 15), y = randInt(2, 12), n = x + y, Tt = 3 * x + 7 * y
      return T('Le quiz du tournoi', numeric(`À un quiz, une bonne réponse à une question facile rapporte 3 points et une bonne réponse à une question difficile 7 points. ${name} a donné ${n} bonnes réponses et marqué ${Tt} points. Écris un système, puis trouve combien de bonnes réponses concernaient des questions difficiles.`, y, {
        explanation: `Avec f bonnes réponses faciles et d difficiles : f + d = ${n} et 3f + 7d = ${Tt}. En remplaçant f par ${n} − d : 3(${n} − d) + 7d = ${Tt}, soit 4d = ${Tt - 3 * n} et d = ${y}.`,
      }))
    },
    // Le triangle formé avec les axes
    () => retry(() => {
      const a = randNonZero(-6, 6), b = randNonZero(-6, 6), m = r6(-b / a)
      if (!isDec(m, 2)) return null
      const [t1, t2] = shuffle([-1, 2, 3, 0.5, -0.5, 1.5])
      const A: Pt = [a * (1 - t1), b * t1], B: Pt = [a * (1 - t2), b * t2]
      if (![...A, ...B].every(isInt) || !inBox(A, 8) || !inBox(B, 8)) return null
      const fig = repere({ A, B, _xi: [a, 0], _yi: [0, b] }, { lines: [{ m, p: b }] })
      return T('Le triangle des axes', numeric(`La droite (AB), avec ${P('A', A)} et ${P('B', B)}, coupe les deux axes du repère. Détermine son équation réduite, puis calcule l'aire du triangle qu'elle forme avec les deux axes.`, Math.abs(a * b) / 2, {
        explanation: `m = ${F(`${fmt(B[1])} − ${par(A[1])}`, `${fmt(B[0])} − ${par(A[0])}`)} = ${fmt(m)} et (AB) : ${lineEq(m, b)}. Elle coupe l'axe des ordonnées en (0 ; ${fmt(b)}) et l'axe des abscisses quand ${poly([m, 'x'], [b, ''])} = 0, soit en (${fmt(a)} ; 0). Aire = ${F(`${Math.abs(a)} × ${Math.abs(b)}`, 2)} = ${fmt(Math.abs(a * b) / 2)}.`,
      }), fig)
    }),
  ],
  [
    // Le triangle entre deux routes et la rivière
    () => retry(() => {
      const m1 = randInt(1, 3), m2 = -randInt(1, 3), yi = pick([2, 3, 4, 6]) * pick([1, -1]), xi = randInt(-3, 3)
      if (yi % m1 || yi % m2) return null
      const X1 = xi - yi / m1, X2 = xi - yi / m2, p1 = yi - m1 * xi, p2 = yi - m2 * xi
      if (!inBox([X1, 0], 8) || !inBox([X2, 0], 8)) return null
      const area = (Math.abs(X2 - X1) * Math.abs(yi)) / 2
      const fig = repere({ I: [xi, yi], E: [X1, 0], F: [X2, 0] }, {
        lines: [{ m: m1, p: p1 }, { m: m2, p: p2, color: BLUE }], polygons: [{ pts: ['I', 'E', 'F'], fill: GOLD }],
        labels: { I: '', E: '', F: '' },
      })
      return T('Le pré entre deux routes', numeric(`Les droites d₁ : ${lineEq(m1, p1)} et d₂ : ${lineEq(m2, p2)} représentent deux routes ; l'axe des abscisses représente une rivière. Elles délimitent un pré triangulaire. Calcule les coordonnées des trois sommets du pré, puis son aire (unité d'aire du repère).`, area, {
        explanation: `Intersection : ${solveText(m1, p1, m2, p2, [xi, yi])}. d₁ coupe l'axe des abscisses en x = ${fmt(X1)} et d₂ en x = ${fmt(X2)}. Base : ${fmt(Math.abs(X2 - X1))}, hauteur : ${Math.abs(yi)}, aire = ${fmt(area)}.`,
      }), fig)
    }),
    // La course-poursuite
    () => retry(() => {
      const mode = pick([
        { a: 'en marchant', v1: [4, 5, 6], b: 'à vélo', v2: [12, 15, 16, 18, 20] },
        { a: 'à cheval, au pas', v1: [6, 8], b: 'au galop', v2: [24, 30, 32] },
      ])
      const v1 = pick(mode.v1), v2 = pick(mode.v2), h = pick([0.5, 1, 1.5, 2])
      const t = r6((v2 * h) / (v2 - v1)), dist = r6(v1 * t)
      if (!isDec(t, 2) || !isDec(dist, 2)) return null
      const [n1, n2] = deuxPrenoms()
      const hT = { 0.5: '30 minutes', 1: 'Une heure', 1.5: 'Une heure et demie', 2: 'Deux heures' }[h]
      return T('La course-poursuite', numeric(`${n1} part du village ${mode.a}, à ${v1} km/h. ${hT} plus tard, ${n2} part du même endroit, sur la même route, ${mode.b} à ${v2} km/h. On note t le temps (en h) écoulé depuis le départ de ${n1}. Exprime la distance parcourue par chacun en fonction de t, puis trouve à quelle distance du village (en km) ${n2} rattrape ${n1}.`, dist, {
        explanation: `${n1} : d₁(t) = ${v1}t ; ${n2} : d₂(t) = ${v2}(t − ${fmt(h)}). d₁ = d₂ ⇔ ${v1}t = ${v2}t − ${fmt(v2 * h)} ⇔ ${v2 - v1}t = ${fmt(v2 * h)} ⇔ t = ${fmt(t)} h. Distance : ${v1} × ${fmt(t)} = ${fmt(dist)} km.`,
      }))
    }),
    // Le mélange : système avec pourcentages
    () => retry(() => {
      const a = pick([5, 10, 15, 20]), b = pick([30, 40, 50, 60]), c = randInt(a / 5 + 1, b / 5 - 1) * 5, V = pick([20, 30, 40, 50, 60, 100])
      const x = r6((V * (b - c)) / (b - a))
      if (!isDec(x, 1)) return null
      const ctx = pick([
        { t: 'La potion de l’alchimiste', s: `Un alchimiste dispose d'une potion contenant ${a} % d'essence de sauge et d'une autre en contenant ${b} %. Il veut obtenir ${V} cL d'un mélange à ${c} %.`, q: 'la quantité (en cL) de la première potion', u: 'cL' },
        { t: 'L’alliage de l’orfèvre', s: `Un orfèvre fond un alliage contenant ${a} % d'argent avec un autre en contenant ${b} %, pour obtenir ${V} g d'alliage à ${c} %.`, q: 'la masse (en g) du premier alliage', u: 'g' },
        { t: 'Le sirop parfait', s: `${prenom()} mélange une boisson contenant ${a} % de sirop et une autre en contenant ${b} %, pour obtenir ${V} cL de boisson à ${c} %.`, q: 'la quantité (en cL) de la première boisson', u: 'cL' },
      ])
      return T(ctx.t, numeric(`${ctx.s} Écris un système, puis trouve ${ctx.q} à utiliser.`, x, {
        explanation: `Avec x ${ctx.u} du premier et y ${ctx.u} du second : x + y = ${V} et ${fmt(a / 100)}x + ${fmt(b / 100)}y = ${fmt((c * V) / 100)}. En remplaçant y par ${V} − x : ${fmt(a / 100)}x + ${fmt(b / 100)}(${V} − x) = ${fmt((c * V) / 100)}, soit ${fmt((b - a) / 100)}x = ${fmt(r6(((b - c) * V) / 100))} et x = ${fmt(x)} ${ctx.u}.`,
      }))
    }),
    // La diagonale du parallélogramme
    () => retry(() => {
      const A = rp(5), B = rp(5), C = rp(5)
      if (Math.abs(det(subv(B, A), subv(C, A))) < 8) return null
      const D = subv(add(A, C), B)
      if (!inBox(D, 8) || D[0] === B[0]) return null
      const m = (D[1] - B[1]) / (D[0] - B[0]), p = B[1] - m * B[0]
      if (!isInt(m)) return null
      const fig = repere({ A, B, C }, { segments: [{ a: 'A', b: 'B' }, { a: 'B', b: 'C' }] })
      return T('La diagonale du jardin', expression(`Un jardin a la forme d'un parallélogramme ABCD, avec ${P('A', A)}, ${P('B', B)} et ${P('C', C)}. On veut y tracer l'allée (BD). Calcule les coordonnées de D, puis donne l'équation réduite de la droite (BD).`, poly([m, 'x'], [p, '']), 'any', {
        answer: lineEq(m, p), inputHint: 'y = mx + p',
        explanation: `D = A + BC⃗ = (${fmt(D[0])} ; ${fmt(D[1])}). Coefficient directeur : ${F(`${fmt(D[1])} − ${par(B[1])}`, `${fmt(D[0])} − ${par(B[0])}`)} = ${fmt(m)}, puis p = ${fmt(B[1])} − ${par(m)} × ${par(B[0])} = ${fmt(p)}. Donc (BD) : ${lineEq(m, p)}.`,
      }), fig)
    }),
    // Le paramètre : une droite qui passe par l'intersection
    () => retry(() => {
      const I = rp(4)
      if (!I[0]) return null
      const L = twoLines(I)
      if (!L) return null
      const [m1, p1, m2, p2] = L, q = randInt(-6, 6)
      if (q === I[1]) return null
      const delta = q === 0 ? 'y = mx' : `y = mx ${q < 0 ? '−' : '+'} ${Math.abs(q)}`
      return T('Trois routes, un carrefour', fraction(`Les droites d₁ : ${lineEq(m1, p1)} et d₂ : ${lineEq(m2, p2)} se coupent en I. Pour quelle valeur du réel m la droite Δ : ${delta} passe-t-elle aussi par I ?`, I[1] - q, I[0], {
        explanation: `${solveText(m1, p1, m2, p2, I)} : I(${fmt(I[0])} ; ${fmt(I[1])}). Δ passe par I ⇔ ${fmt(I[1])} = m × ${par(I[0])}${q ? ` ${q < 0 ? '−' : '+'} ${Math.abs(q)}` : ''} ⇔ m = ${fracText(I[1] - q, I[0])}.`,
      }))
    }),
  ],
  [
    // Le centre de gravité par les médianes
    () => retry(() => {
      const A = rp(5), B = rp(5), C = rp(5)
      if (Math.abs(det(subv(B, A), subv(C, A))) < 8) return null
      const sx = A[0] + B[0] + C[0], sy = A[1] + B[1] + C[1]
      if (sx % 3 || sy % 3) return null
      const Ap = mul(0.5, add(B, C)), Bp = mul(0.5, add(A, C))
      if (Ap[0] === A[0] || Bp[0] === B[0]) return null
      const mA = (Ap[1] - A[1]) / (Ap[0] - A[0]), pA = A[1] - mA * A[0], mB = (Bp[1] - B[1]) / (Bp[0] - B[0]), pB = B[1] - mB * B[0]
      if (![mA, pA, mB, pB].every((v) => isDec(v, 2))) return null
      const G: Pt = [sx / 3, sy / 3]
      const fig = repere({ A, B, C, Ap, Bp }, {
        segments: [{ a: 'A', b: 'B' }, { a: 'B', b: 'C' }, { a: 'C', b: 'A' }, { a: 'A', b: 'Ap', dashed: true, color: BLUE }, { a: 'B', b: 'Bp', dashed: true, color: BLUE }],
        labels: { Ap: 'A′', Bp: 'B′' },
      })
      return T('Le point d’équilibre du bouclier', pair(`Un bouclier triangulaire a pour sommets ${P('A', A)}, ${P('B', B)} et ${P('C', C)}. On trace la médiane issue de A, qui passe par le milieu A′ de [BC], et la médiane issue de B, qui passe par le milieu B′ de [AC]. Détermine les équations réduites de ces deux médianes, puis les coordonnées de leur point d'intersection G.`, G[0], G[1], {
        explanation: `A′(${fmt(Ap[0])} ; ${fmt(Ap[1])}) et (AA′) : ${lineEq(mA, pA)}. B′(${fmt(Bp[0])} ; ${fmt(Bp[1])}) et (BB′) : ${lineEq(mB, pB)}. Puis ${solveText(mA, pA, mB, pB, G)}. (G est le centre de gravité du triangle.)`,
      }), fig)
    }),
    // Le code du coffre
    () => retry(() => {
      const t = randInt(1, 9), u = randInt(1, 9)
      if (t === u) return null
      const s = t + u, diff = 9 * (u - t)
      return T('Le code du coffre', numeric(`Le code d'un coffre est un nombre à deux chiffres dont la somme des chiffres vaut ${s}. Si l'on inverse ses deux chiffres, on obtient un nombre ${diff > 0 ? 'plus grand' : 'plus petit'} de ${Math.abs(diff)}. Écris un système, puis trouve le code.`, 10 * t + u, {
        explanation: `Avec d le chiffre des dizaines et u celui des unités : d + u = ${s} et (10u + d) − (10d + u) = 9(u − d) = ${fmt(diff)}, donc u − d = ${fmt(u - t)}. En additionnant : 2u = ${s + u - t}, u = ${u} et d = ${t}. Le code est ${10 * t + u}.`,
      }))
    }),
    // Le quadrilatère sous deux droites
    () => retry(() => {
      const xi = randInt(1, 4), yi = randInt(2, 8), m1 = -randInt(1, 3), m2 = pick([1, 2, -1])
      if (yi % m1) return null
      const X = xi + yi / -m1, Y = yi - m2 * xi
      if (Y <= 0 || xi / X + yi / Y <= 1.05 || X > 10 || Y > 10) return null
      const p1 = yi - m1 * xi, area = (X * yi + Y * xi) / 2
      const fig = repere({ I: [xi, yi], E: [X, 0], F: [0, Y] }, {
        lines: [{ m: m1, p: p1 }, { m: m2, p: Y, color: BLUE }], polygons: [{ pts: ['O', 'E', 'I', 'F'], fill: GOLD }],
        pos: { E: 's', F: 'w' },
      })
      return T('La parcelle du meunier', numeric(`Les droites d₁ : ${lineEq(m1, p1)} et d₂ : ${lineEq(m2, Y)} se coupent en I. La droite d₁ coupe l'axe des abscisses en E et la droite d₂ coupe l'axe des ordonnées en F. Calcule l'aire du quadrilatère OEIF (unité d'aire du repère).`, area, {
        explanation: `Intersection : ${solveText(m1, p1, m2, Y, [xi, yi])}. E(${fmt(X)} ; 0) et F(0 ; ${fmt(Y)}). On coupe OEIF suivant [OI] : aire(OEI) = ${F(`${fmt(X)} × ${yi}`, 2)} = ${fmt((X * yi) / 2)} et aire(OIF) = ${F(`${fmt(Y)} × ${xi}`, 2)} = ${fmt((Y * xi) / 2)}. Total : ${fmt(area)}.`,
      }), fig)
    }),
    // Le rendez-vous : deux mouvements opposés, départ décalé
    () => retry(() => {
      const mode = pick([{ n: 'car', v: [40, 50, 60, 70, 80, 90] }, { n: 'train', v: [80, 100, 120, 150] }, { n: 'messager à cheval', v: [10, 12, 15, 20] }])
      const v1 = pick(mode.v), v2 = pick(mode.v), h = pick([0.5, 1, 1.5]), t = pick([1.5, 2, 2.5, 3, 4])
      if (t <= h) return null
      const D = r6(v1 * t + v2 * (t - h)), dist = r6(v1 * t)
      const hT = { 0.5: 'Une demi-heure', 1: 'Une heure', 1.5: 'Une heure et demie' }[h]
      return T('Le rendez-vous sur la route', numeric(`Les villes A et B sont distantes de ${fmt(D)} km. Un premier ${mode.n} part de A vers B à ${v1} km/h. ${hT} plus tard, un second ${mode.n} part de B vers A à ${v2} km/h. On note t le temps (en h) écoulé depuis le départ du premier. À quelle distance de A (en km) se croisent-ils ?`, dist, {
        explanation: `Distance à A du premier : ${v1}t ; du second : ${fmt(D)} − ${v2}(t − ${fmt(h)}). Ils se croisent quand ${v1}t = ${fmt(D)} − ${v2}t + ${fmt(v2 * h)}, soit ${v1 + v2}t = ${fmt(r6(D + v2 * h))} et t = ${fmt(t)} h. Distance à A : ${v1} × ${fmt(t)} = ${fmt(dist)} km.`,
      }))
    }),
    // La droite par l'intersection, parallèle à (AB)
    () => retry(() => {
      const I = rp(4), L = twoLines(I)
      if (!L) return null
      const [m1, p1, m2, p2] = L, m = randNonZero(-3, 3), dx = randInt(1, 2)
      if (m === m1 || m === m2) return null
      const A = rp(5), B = add(A, [dx, m * dx])
      if (!inBox(B, 8)) return null
      const p = I[1] - m * I[0]
      const sp = (m0: number, dxx: number): Pt => [I[0] + dxx / Math.max(1, Math.abs(m0)), I[1] + (m0 * dxx) / Math.max(1, Math.abs(m0))]
      const fig = repere({ A, B, _i: I, _a1: sp(m1, 2), _b1: sp(m1, -2), _a2: sp(m2, 2), _b2: sp(m2, -2) }, { lines: [{ m: m1, p: p1, color: BLUE }, { m: m2, p: p2, color: BLUE }], segments: [{ a: 'A', b: 'B' }] })
      return T('La nouvelle route', expression(`On veut construire une route Δ parallèle à la route (AB), avec ${P('A', A)} et ${P('B', B)}, qui passe par le carrefour I des routes d₁ : ${lineEq(m1, p1)} et d₂ : ${lineEq(m2, p2)} (en bleu). Donne l'équation réduite de Δ.`, poly([m, 'x'], [p, '']), 'any', {
        answer: lineEq(m, p), inputHint: 'y = mx + p',
        explanation: `${solveText(m1, p1, m2, p2, I)} : I(${fmt(I[0])} ; ${fmt(I[1])}). (AB) a pour coefficient directeur ${F(m * dx, dx)} = ${fmt(m)}. Δ : y = ${poly([m, 'x'])} + p, avec ${fmt(I[1])} = ${fmt(m)} × ${par(I[0])} + p, donc p = ${fmt(p)} et Δ : ${lineEq(m, p)}.`,
      }), fig)
    }),
  ],
]

// ═════════════════════════════════════════════════════════════════════════
// 2-stat : moyennes, médiane, évolutions en %, probabilités
// ═════════════════════════════════════════════════════════════════════════
const stat: Ladder = [
  [
    // Les soldes successives
    () => retry(() => {
      const a = pick([10, 20, 25, 30, 40, 50]), b = pick([5, 10, 20, 25, 30, 50]), up = Math.random() < 0.4
      const k1 = up ? 1 + a / 100 : 1 - a / 100, k2 = 1 - b / 100, K = r6(k1 * k2), g = r6((K - 1) * 100)
      if (!isDec(g, 2) || g === 0) return null
      const item = pick(['vélo', 'jeu vidéo', 'manteau', 'casque audio', 'skateboard'])
      const name = prenom()
      const s = up
        ? `Le prix d'un ${item} augmente de ${a} %, puis baisse de ${b} %. ${name} affirme qu'au total le prix a évolué de ${a - b > 0 ? '+' : ''}${fmt(a - b)} %.`
        : `Pendant les soldes, un magasin baisse le prix d'un ${item} de ${a} %. La dernière semaine, il applique une nouvelle baisse de ${b} % sur le prix déjà soldé. ${name} pense que la baisse totale est de ${a + b} %.`
      return T('Le piège des pourcentages', numeric(`${s} Quel est le vrai taux d'évolution global (en %, réponse signée) ?`, g, {
        explanation: `On multiplie les coefficients : ${fmt(k1)} × ${fmt(k2)} = ${fmt(K)}, soit une évolution de ${fmt(g)} % (et non ${up ? fmt(a - b) : fmt(-(a + b))} %).`,
      }))
    }),
    // La note visée
    () => retry(() => {
      const n = [randInt(6, 18), randInt(6, 18), randInt(6, 18)], c = [randInt(1, 3), randInt(1, 3), randInt(1, 3)], c4 = randInt(2, 4), m = randInt(10, 15)
      const sc = c[0] + c[1] + c[2] + c4, known = n[0] * c[0] + n[1] * c[1] + n[2] * c[2]
      const x = r6((m * sc - known) / c4)
      if (!isDec(x, 2) || x <= 2 || x > 20) return null
      return T('La note visée', numeric(`${prenom()} a obtenu ${n[0]} (coefficient ${c[0]}), ${n[1]} (coefficient ${c[1]}) et ${n[2]} (coefficient ${c[2]}). Il reste un dernier contrôle, de coefficient ${c4}. Quelle note minimale faut-il y obtenir pour avoir au moins ${m} de moyenne ?`, x, {
        explanation: `Avec x la note : (${n[0]} × ${c[0]} + ${n[1]} × ${c[1]} + ${n[2]} × ${c[2]} + ${c4}x) ÷ ${sc} ≥ ${m} ⇔ ${known} + ${c4}x ≥ ${m * sc} ⇔ ${c4}x ≥ ${m * sc - known} ⇔ x ≥ ${fmt(x)}.`,
      }))
    }),
    // Tableau à double entrée : réunion
    () => {
      const F0 = randInt(8, 30), G0 = randInt(8, 30), fE = randInt(1, F0 - 1), gE = randInt(1, G0 - 1), N = F0 + G0
      const ctx = pick([
        { lieu: 'Un club', a1: 'font de l’escalade', a2: 'font du tir à l’arc', e1: 'qui fait de l’escalade', e2: 'qui fait du tir à l’arc' },
        { lieu: 'Une classe de seconde', a1: 'étudient l’allemand', a2: 'étudient l’espagnol', e1: 'qui étudie l’allemand', e2: 'qui étudie l’espagnol' },
        { lieu: 'Une colonie de vacances', a1: 'ont choisi le kayak', a2: 'ont choisi l’équitation', e1: 'qui a choisi le kayak', e2: 'qui a choisi l’équitation' },
      ])
      const v = Math.random() < 0.5
      const num = v ? F0 + gE : G0 + F0 - fE
      return T('Le tableau à double entrée', fraction(`${ctx.lieu} compte ${N} jeunes : ${F0} filles et ${G0} garçons. ${fE} filles et ${gE} garçons ${ctx.a1} ; les autres ${ctx.a2}. On choisit un de ces jeunes au hasard. Quelle est la probabilité de choisir ${v ? `une fille ou une personne ${ctx.e1}` : `un garçon ou une personne ${ctx.e2}`} ?`, num, N, {
        explanation: v
          ? `P(F ∪ E) = P(F) + P(E) − P(F ∩ E) = ${F(F0, N)} + ${F(fE + gE, N)} − ${F(fE, N)} = ${F(num, N)}.`
          : `P(G ∪ T) = P(G) + P(T) − P(G ∩ T) = ${F(G0, N)} + ${F(N - fE - gE, N)} − ${F(G0 - gE, N)} = ${F(num, N)}.`,
      }))
    },
    // Moyenne et médiane d'un tableau d'effectifs
    () => retry(() => {
      const ctx = pick([
        { t: 'Le concours de tir', s: 'Lors d’un concours de tir à l’arc, chaque archer a obtenu un score de 0 à 5', w: 'archer' },
        { t: 'Les buts de la saison', s: 'Voici le nombre de buts marqués par une équipe de handball à chaque match, de 0 à 5 (en dizaines)', w: 'match' },
        { t: 'La fratrie', s: 'On a demandé aux élèves d’un collège combien ils ont de frères et sœurs (de 0 à 5)', w: 'élève' },
      ])
      const counts = Array.from({ length: 6 }, () => randInt(0, 9))
      const N = counts.reduce((s, v) => s + v, 0)
      if (N < 12 || N > 45 || counts.filter((c) => c > 0).length < 4) return null
      const sum = counts.reduce((s, c, i) => s + c * i, 0), mean = r6(sum / N)
      if (!isDec(mean, 2)) return null
      const list: number[] = []
      counts.forEach((c, i) => { for (let k = 0; k < c; k++) list.push(i) })
      const med = N % 2 ? list[(N - 1) / 2] : (list[N / 2 - 1] + list[N / 2]) / 2
      const diff = r6(mean - med)
      const table = counts.map((c, i) => `${i} : ${c} ${ctx.w}${c > 1 ? 's' : ''}`).join(' ; ')
      return T(ctx.t, numeric(`${ctx.s} : ${table}. Calcule la moyenne et la médiane de cette série, puis donne la différence moyenne − médiane.`, diff, {
        explanation: `Effectif total : ${N}. Moyenne = ${sum} ÷ ${N} = ${fmt(mean)}. Médiane : ${N % 2 ? `la ${(N + 1) / 2}ᵉ valeur` : `la moyenne des ${N / 2}ᵉ et ${N / 2 + 1}ᵉ valeurs`}, soit ${fmt(med)}. Différence : ${fmt(mean)} − ${fmt(med)} = ${fmt(diff)}.`,
      }))
    }),
    // Retrouver le prix de départ
    () => retry(() => {
      const P0 = randInt(4, 100) * 5, t = pick([10, 20, 25, 50]), s = pick([10, 20, 25, 40])
      const k = r6((1 + t / 100) * (1 - s / 100)), P2 = r6(P0 * k)
      if (!isDec(P2, 2)) return null
      const item = pick(['vélo', 'billet d’avion', 'abonnement de musique', 'jeu de société', 'casque'])
      return T('Le prix de départ', numeric(`Le prix d'un ${item} a d'abord augmenté de ${t} %, puis il a baissé de ${s} %. Il coûte maintenant ${fmt(P2)} €. Quel était son prix de départ (en €) ?`, P0, {
        explanation: `Coefficient global : ${fmt(1 + t / 100)} × ${fmt(1 - s / 100)} = ${fmt(k)}. Prix de départ : ${fmt(P2)} ÷ ${fmt(k)} = ${P0} €.`,
      }))
    }),
  ],
  [
    // Le taux annuel moyen : c² = K
    () => {
      const up = Math.random() < 0.6
      const t = pick(up ? [5, 10, 20, 30, 40, 50, 60] : [10, 20, 30, 40, 50])
      const k = up ? 1 + t / 100 : 1 - t / 100, K = r6(k * k), T0 = r6(Math.abs(K - 1) * 100)
      const ctx = pick([`le nombre d'abonnés de la chaîne de ${prenom()}`, 'la population d’un village', 'le nombre de licenciés d’un club de rugby', 'le prix d’un jeu en ligne'])
      return T('Le taux annuel moyen', numeric(`En deux ans, ${ctx} a ${up ? 'augmenté' : 'baissé'} de ${fmt(T0)} %. On suppose que le taux d'évolution a été le même chacune des deux années. Quel est ce taux de ${up ? 'hausse' : 'baisse'} annuel (en %) ?`, t, {
        explanation: `Si c est le coefficient annuel : c² = ${fmt(K)}, donc c = √${fmt(K)} = ${fmt(k)} (car c > 0), soit une ${up ? 'hausse' : 'baisse'} de ${t} % par an.`,
      }))
    },
    // La moyenne de l'autre groupe
    () => retry(() => {
      const n1 = randInt(8, 20), n2 = randInt(8, 20), m1 = randInt(80, 160) / 10, m2 = randInt(70, 170) / 10
      const m = r6((n1 * m1 + n2 * m2) / (n1 + n2))
      if (m1 === m2 || !isDec(m, 2)) return null
      const ctx = pick([
        { t: 'Les deux groupes', s: `Dans une classe, les ${n1} élèves du groupe A ont obtenu une moyenne de ${fmt(m1)} à un devoir, et la moyenne de toute la classe est ${fmt(m)}. Le groupe B compte ${n2} élèves. Quelle est la moyenne du groupe B ?` },
        { t: 'Les deux guildes', s: `Dans un jeu en ligne, les ${n1} joueurs de la guilde des Loups ont un niveau moyen de ${fmt(m1)} ; en ajoutant les ${n2} joueurs de la guilde des Ours, le niveau moyen de l'ensemble devient ${fmt(m)}. Quel est le niveau moyen de la guilde des Ours ?` },
      ])
      return T(ctx.t, numeric(ctx.s, m2, {
        explanation: `Total pour tous : ${n1 + n2} × ${fmt(m)} = ${fmt(r6((n1 + n2) * m))}. Premier groupe : ${n1} × ${fmt(m1)} = ${fmt(r6(n1 * m1))}. Second groupe : (${fmt(r6((n1 + n2) * m))} − ${fmt(r6(n1 * m1))}) ÷ ${n2} = ${fmt(m2)}.`,
      }))
    }),
    // Réunion de deux événements avec pourcentages
    () => retry(() => {
      const pA = pick([40, 50, 60, 70]) / 100, gA = pick([10, 20, 30, 40, 50]) / 100, gO = pick([10, 20, 25, 50]) / 100
      const PAG = r6(pA * gA), PG = r6(PAG + (1 - pA) * gO), res = r6(pA + PG - PAG)
      if (!isDec(res, 2)) return null
      const ctx = pick([
        { t: 'Archers et gradés', s: `Dans une armée, ${fmt(pA * 100)} % des soldats sont des archers. ${fmt(gA * 100)} % des archers sont gradés, contre ${fmt(gO * 100)} % des autres soldats. On choisit un soldat au hasard. Calcule la probabilité qu'il soit gradé, puis la probabilité que ce soit un archer ou un gradé.` },
        { t: 'La cantine et le sport', s: `Dans un lycée, ${fmt(pA * 100)} % des élèves sont demi-pensionnaires. ${fmt(gA * 100)} % des demi-pensionnaires font du sport le mercredi, contre ${fmt(gO * 100)} % des autres élèves. On choisit un élève au hasard. Calcule la probabilité qu'il fasse du sport le mercredi, puis la probabilité qu'il soit demi-pensionnaire ou sportif du mercredi.` },
      ])
      return T(ctx.t, numeric(ctx.s, res, {
        explanation: `P(A ∩ G) = ${fmt(pA)} × ${fmt(gA)} = ${fmt(PAG)} et P(G) = ${fmt(PAG)} + ${fmt(r6(1 - pA))} × ${fmt(gO)} = ${fmt(PG)}. P(A ∪ G) = P(A) + P(G) − P(A ∩ G) = ${fmt(pA)} + ${fmt(PG)} − ${fmt(PAG)} = ${fmt(res)}.`,
      }))
    }),
    // La cible : probabilité géométrique
    () => {
      const s = randInt(2, 6) * 2, e = randInt(1, s - 1), inside = Math.random() < 0.6
      const fig = free({ A: [0, 0], B: [s, 0], C: [s, s], D: [0, s], E: [e, s] }, {
        segments: [{ a: 'A', b: 'B', label: `${s} dm` }, { a: 'B', b: 'C' }, { a: 'C', b: 'E' }, { a: 'E', b: 'D', label: `${e} dm` }, { a: 'D', b: 'A' }, { a: 'B', b: 'E' }],
        polygons: [{ pts: ['A', 'B', 'E', 'D'], fill: RED }],
        pos: { E: 'n' },
      })
      const num = inside ? s + e : s - e
      return T('La cible', fraction(`Une cible carrée ABCD a ${s} dm de côté. Le point E est sur [DC] avec DE = ${e} dm, et la zone ABED est peinte en rouge. Une fléchette se plante au hasard sur la cible (tous les points ont la même chance d'être atteints). Quelle est la probabilité qu'elle se plante ${inside ? 'dans la zone rouge' : 'hors de la zone rouge'} ?`, num, 2 * s, {
        explanation: `ABED est un trapèze : aire = ${F('(AB + DE) × AD', 2)} = ${F(`(${s} + ${e}) × ${s}`, 2)} = ${fmt(((s + e) * s) / 2)} dm². La cible a une aire de ${s * s} dm². ${inside ? `P = ${F(fmt(((s + e) * s) / 2), s * s)}` : `P = 1 − ${F(fmt(((s + e) * s) / 2), s * s)}`} = ${fracText(num, 2 * s)}.`,
      }), fig)
    },
    // Le dé truqué
    () => {
      const f = randInt(1, 6), k = randInt(2, 5)
      const ev = pick([
        { l: 'un nombre pair', t: (v: number) => v % 2 === 0 }, { l: 'un nombre impair', t: (v: number) => v % 2 === 1 },
        { l: 'un nombre supérieur ou égal à 4', t: (v: number) => v >= 4 }, { l: 'un nombre premier', t: (v: number) => [2, 3, 5].includes(v) },
        { l: 'un multiple de 3', t: (v: number) => v % 3 === 0 },
      ])
      const fav = [1, 2, 3, 4, 5, 6].filter(ev.t)
      const num = fav.reduce((s, v) => s + (v === f ? k : 1), 0), den = 5 + k
      return T('Le dé truqué', fraction(`Un dé à six faces est truqué : la face ${f} a ${k} fois plus de chances de sortir que chacune des autres faces, qui ont toutes la même probabilité. Quelle est la probabilité d'obtenir ${ev.l} ?`, num, den, {
        explanation: `Si p est la probabilité d'une face ordinaire : 5p + ${k}p = 1, donc p = ${F(1, den)} et P(${f}) = ${F(k, den)}. Faces favorables : ${fav.join(', ')}, d'où P = ${F(num, den)}${fracText(num, den) !== `${num}/${den}` ? ` = ${fracText(num, den)}` : ''}.`,
      }))
    },
    // La huitième partie
    () => retry(() => {
      const vals = Array.from({ length: 7 }, () => randInt(2, 20)), m = randInt(8, 16)
      const sum = vals.reduce((s, v) => s + v, 0), x = 8 * m - sum
      if (x < 0 || x > 25) return null
      const all = [...vals, x].sort((a, b) => a - b), med = (all[3] + all[4]) / 2
      return T('La huitième partie', numeric(`Voici les scores de ${prenom()} lors de ses sept premières parties : ${vals.join(' ; ')}. Après une huitième partie, sa moyenne vaut exactement ${m}. Trouve le score de la huitième partie, puis donne la médiane des huit scores.`, med, {
        explanation: `Total des 8 scores : 8 × ${m} = ${8 * m}, donc 8ᵉ score = ${8 * m} − ${sum} = ${x}. Série rangée : ${all.join(' ; ')}. Médiane = (${all[3]} + ${all[4]}) ÷ 2 = ${fmt(med)}.`,
      }))
    }),
  ],
  [
    // Hausse puis baisse du même taux
    () => {
      const t = pick([10, 20, 30, 40, 50, 60]), L = r6((t * t) / 100)
      const ctx = pick(['Le prix d’un article', 'Le loyer d’une échoppe', 'Le prix d’un abonnement', 'Le salaire d’un apprenti'])
      return T('Aller-retour en pourcentage', numeric(`${ctx} augmente de t %, puis baisse de t % (le même pourcentage). Au final, il a baissé de ${fmt(L)} % par rapport au départ. Quelle est la valeur de t ?`, t, {
        explanation: `(1 + ${F('t', 100)})(1 − ${F('t', 100)}) = 1 − (${F('t', 100)})² = 1 − ${fmt(L / 100)}. Donc (${F('t', 100)})² = ${fmt(L / 100)}, ${F('t', 100)} = ${fmt(t / 100)} (car t > 0) et t = ${t}.`,
      }))
    },
    // Le club : inclusion-exclusion
    () => retry(() => {
      const N = randInt(30, 80), a = randInt(10, N - 10), b = randInt(10, N - 10), c = randInt(0, 15)
      const both = a + b + c - N
      if (both <= 0 || both >= Math.min(a, b)) return null
      const one = a + b - 2 * both, v = Math.random() < 0.5
      const [s1, s2] = pick([['le football', 'le basket'], ['la natation', 'l’escrime'], ['les échecs', 'le théâtre'], ['la guitare', 'le chant']])
      return T('Le club aux deux activités', fraction(`Dans un club de ${N} membres, ${a} pratiquent ${s1}, ${b} pratiquent ${s2} et ${c} ne pratiquent aucune des deux activités. On choisit un membre au hasard. Quelle est la probabilité qu'il pratique ${v ? 'les deux activités' : 'exactement une des deux activités'} ?`, v ? both : one, N, {
        explanation: `${N - c} membres pratiquent au moins une activité. Or ${a} + ${b} = ${a + b} : ceux qui font les deux sont comptés deux fois, donc ${a + b} − ${N - c} = ${both} font les deux.${v ? '' : ` Exactement une : ${N - c} − ${both} = ${one}.`} P = ${F(v ? both : one, N)}.`,
      }))
    }),
    // Combien de filles ? Moyenne pondérée inversée
    () => retry(() => {
      const N = randInt(20, 35), g = randInt(5, N - 5), mg = randInt(80, 160) / 10, mb = randInt(80, 160) / 10
      if (mg === mb) return null
      const m = r6((g * mg + (N - g) * mb) / N)
      if (!isDec(m, 2)) return null
      return T('Combien de filles ?', numeric(`Dans une classe de ${N} élèves, la moyenne à un contrôle est ${fmt(m)}. La moyenne des filles est ${fmt(mg)} et celle des garçons ${fmt(mb)}. Combien y a-t-il de filles dans la classe ?`, g, {
        explanation: `Avec f le nombre de filles : ${fmt(mg)}f + ${fmt(mb)}(${N} − f) = ${N} × ${fmt(m)} = ${fmt(r6(N * m))}. Donc ${poly([r6(mg - mb), 'f'])} = ${fmt(r6(N * m - N * mb))}, d'où f = ${g}.`,
      }))
    }),
    // Deux dés : tableau à double entrée et réunion
    () => {
      const ev = pick([
        () => { const k = randInt(8, 11); return { A: `la somme est supérieure ou égale à ${k}`, a: (i: number, j: number) => i + j >= k, B: 'on obtient un double', b: (i: number, j: number) => i === j } },
        () => ({ A: 'la somme est paire', a: (i: number, j: number) => (i + j) % 2 === 0, B: 'au moins un des dés affiche 6', b: (i: number, j: number) => i === 6 || j === 6 }),
        () => { const k = randInt(5, 9); return { A: `la somme vaut ${k}`, a: (i: number, j: number) => i + j === k, B: 'au moins un des dés affiche 1', b: (i: number, j: number) => i === 1 || j === 1 } },
        () => ({ A: 'le produit est pair', a: (i: number, j: number) => (i * j) % 2 === 0, B: 'la somme vaut 7', b: (i: number, j: number) => i + j === 7 }),
        () => { const k = randInt(2, 4); return { A: `les deux dés affichent un nombre inférieur ou égal à ${k}`, a: (i: number, j: number) => i <= k && j <= k, B: 'on obtient un double', b: (i: number, j: number) => i === j } },
      ])()
      let nA = 0, nB = 0, nAB = 0
      for (let i = 1; i <= 6; i++) for (let j = 1; j <= 6; j++) {
        const x = ev.a(i, j), y = ev.b(i, j)
        if (x) nA++
        if (y) nB++
        if (x && y) nAB++
      }
      const n = nA + nB - nAB
      return T('Les deux dés', fraction(`On lance deux dés équilibrés à six faces. On note A l'événement « ${ev.A} » et B l'événement « ${ev.B} ». À l'aide d'un tableau à double entrée, calcule P(A ∪ B).`, n, 36, {
        explanation: `Sur les 36 issues : A en compte ${nA}, B en compte ${nB} et A ∩ B en compte ${nAB}. P(A ∪ B) = ${F(nA, 36)} + ${F(nB, 36)} − ${F(nAB, 36)} = ${F(n, 36)}${fracText(n, 36) !== `${n}/36` ? ` = ${fracText(n, 36)}` : ''}.`,
      }))
    },
    // Évolution d'une population en deux parties
    () => retry(() => {
      const p = pick([20, 25, 30, 40, 50, 60, 75]), a = randNonZero(-4, 6) * 5, b = randNonZero(-4, 6) * 5
      if (a === b) return null
      const g = r6((p * a + (100 - p) * b) / 100)
      if (!isDec(g, 2) || g === 0) return null
      const evo = (v: number) => (v > 0 ? `a augmenté de ${v} %` : `a baissé de ${-v} %`)
      const ctx = pick([
        { t: 'La ville qui change', s: `Dans une ville, ${p} % des habitants ont moins de 20 ans. En dix ans, le nombre de moins de 20 ans ${evo(a)} et celui des autres habitants ${evo(b)}. Quel est le taux d'évolution de la population totale (en %, réponse signée) ?`, g1: 'jeunes', g2: 'autres' },
        { t: 'L’armée après la campagne', s: `Dans une armée, ${p} % des soldats sont des cavaliers. Après une campagne, le nombre de cavaliers ${evo(a)} et celui des fantassins ${evo(b)}. Quel est le taux d'évolution de l'effectif total (en %, réponse signée) ?`, g1: 'cavaliers', g2: 'fantassins' },
        { t: 'La bibliothèque', s: `Dans une bibliothèque, ${p} % des livres sont des romans. En un an, le nombre de romans ${evo(a)} et celui des autres livres ${evo(b)}. Quel est le taux d'évolution du nombre total de livres (en %, réponse signée) ?`, g1: 'romans', g2: 'autres livres' },
      ])
      return T(ctx.t, numeric(ctx.s, g, {
        explanation: `Pour 100 au départ : ${p} ${ctx.g1} deviennent ${p} × ${fmt(1 + a / 100)} = ${fmt(r6((p * (100 + a)) / 100))} et ${100 - p} ${ctx.g2} deviennent ${100 - p} × ${fmt(1 + b / 100)} = ${fmt(r6(((100 - p) * (100 + b)) / 100))}. Total : ${fmt(r6(100 + g))}, soit une évolution de ${fmt(g)} %.`,
      }))
    }),
  ],
]

export const AGE_2NDE: Record<string, Ladder> = {
  '2-nombres': nombres,
  '2-lit': lit,
  '2-eq': eq,
  '2-fct': fct,
  '2-vect': vect,
  '2-droites': droites,
  '2-stat': stat,
}
