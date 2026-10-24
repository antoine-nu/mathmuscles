// Équations (5e) : tester si un nombre est solution, résoudre x + a = b, ax = b, ax + b = c,
// mettre un petit problème en équation ; inconnue des deux côtés au palier 5.
import {
  F, choice, fmt, fresh, numeric, par, pick, poly, randInt, shuffle, variants, withMeta,
  type Exercise, type Maker, type SubjectContent,
} from '../utils'
import { deuxPrenoms, prenom } from '../contexts'
import { fitPoints, triangleFigure, type FigPoint, type FigSegment, type Figure } from '../figure'

// ── Aides locales ───────────────────────────────────────────────────────
const RED = '#b8362f'
const GREEN = '#2f8f4e'
const BLUE = '#2f5fb3'
const GOLD = '#d9a020'
/** ax + b écrit proprement : « 3x + 5 », « x − 2 », « 4x ». */
const lin = (a: number, b = 0) => poly([a, 'x'], [b, ''])
const s = (n: number) => (n > 1 ? 's' : '')
const isInt = (n: number) => Math.abs(n - Math.round(n)) < 1e-9
const FEM = new Set(['Léa', 'Inès', 'Chloé', 'Yasmine', 'Zoé', 'Jade', 'Manon', 'Aïcha', 'Lina', 'Camille', 'Emma', 'Louise', 'Sofia', 'Clara', 'Maëlys', 'Alice', 'Romane', 'Nour'])
const il = (p: string) => (FEM.has(p) ? 'elle' : 'il')
const deP = (p: string) => (/^[AEIOUYÉÈÂÎ]/.test(p) ? `d’${p}` : `de ${p}`)
const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1)

function retry(draw: () => Exercise | null): Exercise {
  for (let i = 0; i < 5000; i++) {
    const ex = draw()
    if (ex) return ex
  }
  throw new Error('tirage introuvable')
}
const R = (draw: () => Exercise | null): Maker => () => retry(draw)
const model = (title: string, draw: () => Exercise | null): Maker => () => {
  const ex = retry(draw)
  return withMeta(ex, { title: ex.title ?? title })
}
const fig = (ex: Exercise, figure: Figure): Exercise => withMeta(ex, { figure })

/** QCM « Oui / Non » pour tester une solution. */
function yesNo(prompt: string, ok: boolean, explanation: string): Exercise {
  return choice(prompt, ok ? 'Oui' : 'Non', [ok ? 'Non' : 'Oui'], explanation)
}
/** Vérification : « Pour x = 4 : 3 × 4 + 5 = 17 et … » */
const solveCheck = (left: string, right: string) => `Vérification : ${left} = ${right}.`

// ── Schémas ─────────────────────────────────────────────────────────────
const P = (x: number, y: number): FigPoint => ({ x, y, hidden: true, label: '' })
function canvas(w = 320, h = 220) {
  const points: Record<string, FigPoint> = {}
  const segments: FigSegment[] = []
  const polygons: { pts: string[]; fill: string }[] = []
  const notes: { x: number; y: number; text: string }[] = []
  let k = 0
  const pt = (x: number, y: number) => { const n = `q${k++}`; points[n] = P(x, y); return n }
  return {
    line(x1: number, y1: number, x2: number, y2: number, opts: Omit<FigSegment, 'a' | 'b'> = {}) { segments.push({ a: pt(x1, y1), b: pt(x2, y2), ...opts }) },
    poly(pts: [number, number][], fill: string, outline = true) {
      const names = pts.map(([x, y]) => pt(x, y))
      polygons.push({ pts: names, fill })
      if (outline) names.forEach((n, i) => segments.push({ a: n, b: names[(i + 1) % names.length] }))
    },
    rect(x: number, y: number, w: number, h: number, fill: string) { this.poly([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], fill) },
    note(x: number, y: number, text: string) { notes.push({ x, y, text }) },
    figure(caption = ''): Figure { return { w, h, points, segments, polygons, notes, caption } },
  }
}

/** Balance équilibrée : sur chaque plateau, des sacs « x » et des poids (en kg). */
function balanceFigure(left: { bags: number; w: number[] }, right: { bags: number; w: number[] }, unit = 'kg'): Figure {
  const c = canvas()
  const top = 42, pan = 168
  c.poly([[150, 205], [170, 205], [160, top]], GOLD) // pied
  c.line(80, top, 240, top) // fléau
  const tray = (cx: number, side: { bags: number; w: number[] }) => {
    c.line(cx, top, cx - 60, pan, { color: '#8a7a5a' }); c.line(cx, top, cx + 60, pan, { color: '#8a7a5a' })
    c.line(cx - 64, pan, cx + 64, pan)
    const items: { t: string; bag: boolean }[] = [...Array(side.bags).fill(0).map(() => ({ t: 'x', bag: true })), ...side.w.map((w) => ({ t: `${w}`, bag: false }))]
    const perRow = 3, size = 22
    items.forEach((it, i) => {
      const row = Math.floor(i / perRow), col = i % perRow, nInRow = Math.min(perRow, items.length - row * perRow)
      const x = cx - (nInRow * (size + 2)) / 2 + col * (size + 2), y = pan - (row + 1) * (size + 2)
      if (it.bag) c.rect(x, y, size, size, GREEN)
      else c.poly([[x + 3, y], [x + size - 3, y], [x + size, y + size], [x, y + size]], BLUE)
      c.note(x + size / 2, y + size / 2 + 5, it.t)
    })
  }
  tray(80, left)
  tray(240, right)
  return c.figure(`La balance est en équilibre. Les sacs verts pèsent tous x ${unit} ; les poids bleus sont en ${unit}.`)
}

/** Rectangle (proportions indicatives) avec étiquettes de longueur et de largeur. */
function rectFigure(long: string, larg: string, ratio = 1.8): Figure {
  const pts = fitPoints({ A: [0, 0], B: [ratio, 0], C: [ratio, 1], D: [0, 1] }, 320, 220, 45)
  for (const k of ['A', 'B', 'C', 'D']) pts[k] = { ...pts[k], label: '' }
  return {
    points: pts,
    segments: [{ a: 'A', b: 'B', label: long }, { a: 'B', b: 'C', label: larg }, { a: 'C', b: 'D' }, { a: 'D', b: 'A' }],
    polygons: [{ pts: ['A', 'B', 'C', 'D'], fill: GREEN }],
  }
}

/** Segment [AB] découpé en morceaux étiquetés. */
function segmentFigure(parts: { label: string; len: number }[], total: string): Figure {
  const tot = parts.reduce((t, p) => t + p.len, 0)
  const x0 = 30, W = 260, y = 110
  const points: Record<string, FigPoint> = {}
  const segments: FigSegment[] = []
  const names = ['A', 'M', 'N', 'O', 'B']
  let acc = 0
  const keys: string[] = []
  parts.forEach((_, i) => { if (i === 0) { points.A = { x: x0, y, label: 'A', pos: 's' }; keys.push('A') } })
  parts.forEach((p, i) => {
    acc += p.len
    const nm = i === parts.length - 1 ? 'B' : names[i + 1]
    points[nm] = { x: x0 + (acc / tot) * W, y, label: nm, pos: 's' }
    keys.push(nm)
    segments.push({ a: keys[i], b: nm, label: p.label })
  })
  points.L = P(x0, y + 45); points.Rr = P(x0 + W, y + 45)
  return { points, segments: [...segments, { a: 'L', b: 'Rr', label: total, head: false, dashed: true }] }
}

/** Deux bougies : hauteurs h1, h2 (dessin proportionnel). */
function candlesFigure(h1: number, h2: number, l1: string, l2: string): Figure {
  const c = canvas()
  const k = 140 / Math.max(h1, h2)
  const draw = (x: number, h: number, l: string, col: string) => {
    c.rect(x, 190 - h * k, 34, h * k, col)
    c.poly([[x + 17, 190 - h * k - 18], [x + 11, 190 - h * k - 4], [x + 23, 190 - h * k - 4]], GOLD)
    c.note(x + 17, 210, l)
  }
  draw(90, h1, l1, RED)
  draw(200, h2, l2, BLUE)
  return c.figure('')
}

/** Carré de côté a et triangle équilatéral (ou rectangle) côte à côte. */
function twoShapesFigure(sqLabel: string, other: { kind: 'tri' | 'rect'; l1: string; l2?: string }): Figure {
  const c = canvas()
  c.rect(25, 60, 110, 110, GREEN)
  c.note(80, 190, sqLabel)
  if (other.kind === 'tri') {
    c.poly([[180, 170], [300, 170], [240, 66]], GOLD)
    c.note(240, 190, other.l1)
  } else {
    c.rect(155, 95, 135, 75, GOLD)
    c.note(222, 190, other.l1)
    c.note(302, 137, other.l2 ?? '')
  }
  return c.figure()
}

// ═══ Palier 1 ═══════════════════════════════════════════════════════════
/** Équation ax + b = c (b peut être nul ou négatif), sa solution et une valeur à tester. */
function testDraw(make: () => { eq: string; sol: number; left: (v: number) => string; lv: (v: number) => number; right: number }) {
  return () => {
    const e = make(), ok = Math.random() < 0.5
    let v = e.sol
    if (!ok) { v = e.sol + pick([-3, -2, -1, 1, 2, 3]); if (v < 0) v = e.sol + 2 }
    const val = e.lv(v), good = val === e.right
    return yesNo(`Le nombre ${v} est-il solution de l'équation ${e.eq} ?`, good,
      `On remplace x par ${v} : ${e.left(v)} = ${val}${good ? `, c'est bien égal à ${e.right} : ${v} est solution.` : `, qui n'est pas égal à ${e.right} : ${v} n'est pas solution.`}`)
  }
}
const test1 = variants(
  testDraw(() => { const a = randInt(2, 30), x = randInt(1, 30); return { eq: `x + ${a} = ${x + a}`, sol: x, left: (v) => `${v} + ${a}`, lv: (v) => v + a, right: x + a } }),
  testDraw(() => { const a = randInt(2, 9), x = randInt(2, 12); return { eq: `${a}x = ${a * x}`, sol: x, left: (v) => `${a} × ${v}`, lv: (v) => a * v, right: a * x } }),
  testDraw(() => { const a = randInt(2, 9), b = randInt(1, 15), x = randInt(1, 10); return { eq: `${lin(a, b)} = ${a * x + b}`, sol: x, left: (v) => `${a} × ${v} + ${b}`, lv: (v) => a * v + b, right: a * x + b } }),
  testDraw(() => { const a = randInt(2, 9), x = randInt(3, 10), b = randInt(1, a * x - 1); return { eq: `${lin(a, -b)} = ${a * x - b}`, sol: x, left: (v) => `${a} × ${v} − ${b}`, lv: (v) => a * v - b, right: a * x - b } }),
)

const plus1 = variants(
  fresh(() => {
    const a = randInt(2, 40), x = randInt(1, 50)
    return numeric(`Résous l'équation : x + ${a} = ${x + a}`, x, { explanation: `On soustrait ${a} aux deux membres : x = ${x + a} − ${a} = ${x}. ${solveCheck(`${x} + ${a}`, `${x + a}`)}` })
  }),
  fresh(() => {
    const a = randInt(2, 40), x = randInt(1, 50)
    return numeric(`Résous l'équation : ${a} + x = ${x + a}`, x, { explanation: `x = ${x + a} − ${a} = ${x}. ${solveCheck(`${a} + ${x}`, `${x + a}`)}` })
  }),
  fresh(() => {
    const a = randInt(2, 30), x = randInt(a + 1, 60)
    return numeric(`Résous l'équation : x − ${a} = ${x - a}`, x, { explanation: `On ajoute ${a} aux deux membres : x = ${x - a} + ${a} = ${x}. ${solveCheck(`${x} − ${a}`, `${x - a}`)}` })
  }),
  fresh(() => {
    const a = randInt(2, 40), x = randInt(1, 50)
    return numeric(`Résous l'équation : ${x + a} = x + ${a}`, x, { explanation: `x = ${x + a} − ${a} = ${x}. ${solveCheck(`${x} + ${a}`, `${x + a}`)}` })
  }),
  fresh(() => {
    const a = randInt(5, 40), x = randInt(3, 50)
    return numeric(`Un nombre augmenté de ${a} donne ${x + a}. Quel est ce nombre ?`, x, { explanation: `On résout x + ${a} = ${x + a} : x = ${x + a} − ${a} = ${x}.` })
  }),
)

const fois1 = variants(
  fresh(() => {
    const a = randInt(2, 9), x = randInt(2, 12)
    return numeric(`Résous l'équation : ${a}x = ${a * x}`, x, { explanation: `${a}x signifie ${a} × x. On divise les deux membres par ${a} : x = ${a * x} ÷ ${a} = ${x}. ${solveCheck(`${a} × ${x}`, `${a * x}`)}` })
  }),
  fresh(() => {
    const a = randInt(2, 9), x = randInt(2, 12)
    return numeric(`Résous l'équation : x × ${a} = ${a * x}`, x, { explanation: `x = ${a * x} ÷ ${a} = ${x}. ${solveCheck(`${x} × ${a}`, `${a * x}`)}` })
  }),
  fresh(() => {
    const a = randInt(2, 12), x = randInt(2, 12)
    return numeric(`Résous l'équation : ${a * x} = ${a}x`, x, { explanation: `x = ${a * x} ÷ ${a} = ${x}. ${solveCheck(`${a} × ${x}`, `${a * x}`)}` })
  }),
  fresh(() => {
    const [w, a] = pick([['Le double', 2], ['Le triple', 3], ['Le quadruple', 4]] as [string, number][]), x = randInt(3, 30)
    return numeric(`${w} d'un nombre vaut ${a * x}. Quel est ce nombre ?`, x, { explanation: `On résout ${a}x = ${a * x} : x = ${a * x} ÷ ${a} = ${x}.` })
  }),
)

const membre1 = variants(
  fresh(() => {
    const a = randInt(2, 9), b = randInt(1, 20), v = randInt(1, 10), c = randInt(10, 80)
    return numeric(`Pour x = ${v}, que vaut le membre de gauche de l'équation ${lin(a, b)} = ${c} ?`, a * v + b, { explanation: `${a}x + ${b} pour x = ${v} : ${a} × ${v} + ${b} = ${a * v} + ${b} = ${a * v + b}.` })
  }),
  fresh(() => {
    const a = randInt(2, 9), v = randInt(3, 10), b = randInt(1, a * v - 1)
    return numeric(`Calcule ${lin(a, -b)} pour x = ${v}.`, a * v - b, { explanation: `${a} × ${v} − ${b} = ${a * v} − ${b} = ${a * v - b}.` })
  }),
  fresh(() => {
    const a = randInt(2, 6), b = randInt(1, 9), v = randInt(1, 10), c = randInt(20, 99)
    return numeric(`Pour x = ${v}, que vaut le membre de droite de l'équation ${c} = ${a}(x + ${b}) ?`, a * (v + b), { explanation: `${a} × (${v} + ${b}) = ${a} × ${v + b} = ${a * (v + b)}.` })
  }),
  fresh(() => {
    const a = randInt(2, 9), b = randInt(1, 20), v = randInt(1, 10)
    return numeric(`Calcule ${b} + ${a}x pour x = ${v}.`, b + a * v, { explanation: `${b} + ${a} × ${v} = ${b} + ${a * v} = ${b + a * v} (la multiplication d'abord).` })
  }),
)

// ═══ Palier 2 ═══════════════════════════════════════════════════════════
const moins2 = variants(
  fresh(() => {
    const a = randInt(3, 40), x = randInt(1, 50)
    return numeric(`Résous l'équation : x − ${a} = ${x}`, x + a, { explanation: `On ajoute ${a} aux deux membres : x = ${x} + ${a} = ${x + a}. ${solveCheck(`${x + a} − ${a}`, `${x}`)}` })
  }),
  fresh(() => {
    const x = randInt(2, 40), a = x + randInt(2, 40)
    return numeric(`Résous l'équation : ${a} − x = ${a - x}`, x, { explanation: `On cherche ce qu'il faut enlever à ${a} pour obtenir ${a - x} : x = ${a} − ${a - x} = ${x}. ${solveCheck(`${a} − ${x}`, `${a - x}`)}` })
  }),
  fresh(() => {
    const a = randInt(2, 9), q = randInt(2, 15)
    return numeric(`Résous l'équation : ${F('x', a)} = ${q}`, a * q, { explanation: `${F('x', a)} signifie x ÷ ${a}. On multiplie les deux membres par ${a} : x = ${q} × ${a} = ${a * q}. ${solveCheck(`${a * q} ÷ ${a}`, `${q}`)}` })
  }),
  fresh(() => {
    const a = randInt(3, 30), x = randInt(a + 1, 70)
    return numeric(`Résous l'équation : ${x - a} = x − ${a}`, x, { explanation: `x = ${x - a} + ${a} = ${x}. ${solveCheck(`${x} − ${a}`, `${x - a}`)}` })
  }),
)

const affine2 = variants(
  fresh(() => {
    const a = randInt(2, 9), b = randInt(1, 20), x = randInt(1, 12)
    return numeric(`Résous l'équation : ${lin(a, b)} = ${a * x + b}`, x, { explanation: `On soustrait ${b} : ${a}x = ${a * x + b} − ${b} = ${a * x}. On divise par ${a} : x = ${a * x} ÷ ${a} = ${x}. ${solveCheck(`${a} × ${x} + ${b}`, `${a * x + b}`)}` })
  }),
  fresh(R(() => {
    const a = randInt(2, 9), b = randInt(1, 20), x = randInt(1, 12)
    if (a * x - b <= 0) return null
    return numeric(`Résous l'équation : ${lin(a, -b)} = ${a * x - b}`, x, { explanation: `On ajoute ${b} : ${a}x = ${a * x - b} + ${b} = ${a * x}. On divise par ${a} : x = ${x}. ${solveCheck(`${a} × ${x} − ${b}`, `${a * x - b}`)}` })
  })),
  fresh(() => {
    const a = randInt(2, 9), b = randInt(1, 20), x = randInt(1, 12)
    return numeric(`Résous l'équation : ${a * x + b} = ${lin(a, b)}`, x, { explanation: `${a}x = ${a * x + b} − ${b} = ${a * x}, donc x = ${a * x} ÷ ${a} = ${x}. ${solveCheck(`${a} × ${x} + ${b}`, `${a * x + b}`)}` })
  }),
  fresh(() => {
    const a = randInt(2, 9), b = randInt(1, 20), x = randInt(1, 12)
    return numeric(`Résous l'équation : ${b} + ${a}x = ${a * x + b}`, x, { explanation: `${a}x = ${a * x + b} − ${b} = ${a * x}, donc x = ${a * x} ÷ ${a} = ${x}. ${solveCheck(`${b} + ${a} × ${x}`, `${a * x + b}`)}` })
  }),
)

/** QCM : parmi quatre nombres, lequel est solution ? */
function whichSol(eq: string, sol: number, f: (v: number) => string, val: (v: number) => number, target: (v: number) => number) {
  let cands = [sol]
  while (cands.length < 4) {
    const c = sol + randInt(-4, 4)
    if (c >= 0 && !cands.includes(c) && val(c) !== target(c)) cands.push(c)
  }
  cands = shuffle(cands)
  return choice(`Parmi les nombres ${cands.slice(0, 3).join(', ')} et ${cands[3]}, lequel est solution de l'équation ${eq} ?`, String(sol), cands.filter((c) => c !== sol).map(String),
    `On teste chaque nombre : ${cands.map((c) => `pour x = ${c}, ${f(c)}`).join(' ; ')}. Seul ${sol} rend les deux membres égaux.`)
}
const quel2 = variants(
  () => {
    const a = randInt(2, 9), b = randInt(1, 15), x = randInt(1, 10), c = a * x + b
    return whichSol(`${lin(a, b)} = ${c}`, x, (v) => `${a} × ${v} + ${b} = ${a * v + b}`, (v) => a * v + b, () => c)
  },
  () => {
    const a = randInt(3, 7), c = randInt(1, a - 1), x = randInt(1, 9), b = randInt(1, 12), d = (a - c) * x + b
    return whichSol(`${lin(a, b)} = ${lin(c, d)}`, x, (v) => `membres ${a * v + b} et ${c * v + d}`, (v) => a * v + b, (v) => c * v + d)
  },
  () => {
    const x = randInt(2, 12)
    return whichSol(`x × x = ${x * x}`, x, (v) => `${v} × ${v} = ${v * v}`, (v) => v * v, () => x * x)
  },
  () => {
    const x = randInt(2, 10)
    return whichSol(`x(x + 1) = ${x * (x + 1)}`, x, (v) => `${v} × ${v + 1} = ${v * (v + 1)}`, (v) => v * (v + 1), () => x * (x + 1))
  },
)

const probleme2 = variants(
  fresh(() => {
    const a = randInt(2, 9), b = randInt(1, 30), x = randInt(2, 20)
    return numeric(`Je pense à un nombre. Je le multiplie par ${a}, puis j'ajoute ${b}. J'obtiens ${a * x + b}. Quel est ce nombre ?`, x, { explanation: `Équation : ${lin(a, b)} = ${a * x + b}. Donc ${a}x = ${a * x}, et x = ${x}.` })
  }),
  fresh(() => {
    const p = prenom(), n = randInt(2, 8), x = randInt(2, 15), f = randInt(1, 9), [obj, one] = pick([['cahiers', 'cahier'], ['stylos', 'stylo'], ['gâteaux', 'gâteau'], ['billets de tombola', 'billet']])
    return numeric(`${p} achète ${n} ${obj} au même prix et paie ${f} € de livraison. ${cap(il(p))} paie ${n * x + f} € en tout. Quel est le prix d'un ${one} (en €) ?`, x, {
      explanation: `En notant x le prix d'un article : ${n}x + ${f} = ${n * x + f}. Donc ${n}x = ${n * x} et x = ${n * x} ÷ ${n} = ${x} €.`,
    })
  }),
  fresh(() => {
    const ab = randInt(10, 40), x = randInt(3, 12), n = randInt(4, 15)
    return numeric(`Un club de tir à l'arc demande une cotisation de ${ab} € par an, plus un prix fixe pour chaque séance. Pour ${n} séances, on paie ${ab + n * x} € en tout. Quel est le prix d'une séance (en €) ?`, x, {
      explanation: `Équation : ${ab} + ${n}x = ${ab + n * x}. Donc ${n}x = ${n * x} et x = ${x} €.`,
    })
  }),
  fresh(() => {
    const L = randInt(8, 30), x = randInt(3, L - 1)
    return numeric(`Un rectangle a une longueur de ${L} cm et un périmètre de ${2 * (L + x)} cm. Quelle est sa largeur (en cm) ?`, x, {
      explanation: `En notant x la largeur : 2 × ${L} + 2x = ${2 * (L + x)}, soit ${2 * L} + 2x = ${2 * (L + x)}. Donc 2x = ${2 * x} et x = ${x} cm.`,
    })
  }),
)

// ═══ Palier 3 ═══════════════════════════════════════════════════════════
const decimal3 = variants(
  fresh(() => {
    const x = -randInt(1, 15), a = randInt(2, 20)
    return numeric(`Résous l'équation : x + ${a} = ${fmt(x + a)}`, x, { explanation: `On soustrait ${a} aux deux membres : x = ${fmt(x + a)} − ${a} = ${fmt(x)}. ${solveCheck(`${par(x)} + ${a}`, fmt(x + a))}` })
  }),
  R(() => {
    const a = pick([2, 4, 5, 10]), x = randInt(1, 40) / (a === 4 ? 4 : a === 10 ? 10 : a), b = a * x
    if (isInt(x) || !isInt(b)) return null
    return numeric(`Résous l'équation : ${a}x = ${b} (donne la solution sous forme décimale).`, x, { explanation: `x = ${b} ÷ ${a} = ${fmt(x)}. ${solveCheck(`${a} × ${fmt(x)}`, `${b}`)}` })
  }),
  R(() => {
    const a = pick([2, 4, 5]), x = randInt(3, 40) / (a === 2 ? 2 : a === 4 ? 4 : 5), b = randInt(1, 12), c = a * x + b
    if (isInt(x) || !isInt(c)) return null
    return numeric(`Résous l'équation : ${lin(a, b)} = ${c}`, x, { explanation: `${a}x = ${c} − ${b} = ${c - b}, donc x = ${c - b} ÷ ${a} = ${fmt(x)}. ${solveCheck(`${a} × ${fmt(x)} + ${b}`, `${c}`)}` })
  }),
  fresh(() => {
    const a = randInt(3, 30), x = randInt(1, a - 1), c = x - a
    return numeric(`Résous l'équation : x − ${a} = ${fmt(c)}`, x, { explanation: `On ajoute ${a} aux deux membres : x = ${fmt(c)} + ${a} = ${x}. ${solveCheck(`${x} − ${a}`, fmt(c))}` })
  }),
)

const paren3 = variants(
  fresh(() => {
    const a = randInt(2, 9), b = randInt(1, 9), x = randInt(1, 12)
    return numeric(`Résous l'équation : ${a}(x + ${b}) = ${a * (x + b)}`, x, { explanation: `On divise par ${a} : x + ${b} = ${x + b}, donc x = ${x}. ${solveCheck(`${a} × (${x} + ${b})`, `${a * (x + b)}`)}` })
  }),
  fresh(() => {
    const a = randInt(2, 9), b = randInt(1, 9), x = b + randInt(1, 12)
    return numeric(`Résous l'équation : ${a}(x − ${b}) = ${a * (x - b)}`, x, { explanation: `On divise par ${a} : x − ${b} = ${x - b}, donc x = ${x}. ${solveCheck(`${a} × (${x} − ${b})`, `${a * (x - b)}`)}` })
  }),
  fresh(() => {
    const a = randInt(2, 9), b = randInt(1, 9), x = randInt(1, 12)
    return numeric(`Résous l'équation : ${a * (x + b)} = ${a}(${b} + x)`, x, { explanation: `${b} + x = ${a * (x + b)} ÷ ${a} = ${x + b}, donc x = ${x}. ${solveCheck(`${a} × (${b} + ${x})`, `${a * (x + b)}`)}` })
  }),
  fresh(() => {
    const a = randInt(2, 6), b = randInt(1, 9), c = randInt(1, 20), x = randInt(1, 10)
    return numeric(`Résous l'équation : ${a}(x + ${b}) + ${c} = ${a * (x + b) + c}`, x, { explanation: `${a}(x + ${b}) = ${a * (x + b) + c} − ${c} = ${a * (x + b)}, donc x + ${b} = ${x + b} et x = ${x}.` })
  }),
)

const NAMES3 = () => pick([['A', 'B', 'C'], ['R', 'S', 'T'], ['E', 'F', 'G'], ['K', 'L', 'M']] as [string, string, string][])
const geo3 = variants(
  fresh(() => {
    const k = randInt(2, 9), x = randInt(3, 20), Pm = 2 * (2 * x + k)
    return fig(numeric(`La largeur de ce rectangle mesure x cm et sa longueur x + ${k} cm. Son périmètre est ${Pm} cm. Combien vaut x ?`, x, {
      explanation: `Périmètre : 2 × (x + x + ${k}) = ${Pm}, donc 2x + ${k} = ${Pm / 2}, 2x = ${Pm / 2 - k} et x = ${x}. Le rectangle mesure ${x} cm sur ${x + k} cm.`,
    }), rectFigure(`x + ${k}`, 'x'))
  }),
  R(() => {
    const [A, B, C] = NAMES3(), a = randInt(2, 4), b = randInt(20, 70), x = (180 - b) / (1 + a)
    if (!isInt(x) || x < 15) return null
    return fig(numeric(`Dans le triangle ${A}${B}${C}, l'angle en ${A} mesure x°, l'angle en ${B} mesure ${a}x° et l'angle en ${C} mesure ${b}°. Combien vaut x ?`, x, {
      explanation: `La somme des angles d'un triangle vaut 180° : x + ${a}x + ${b} = 180, soit ${a + 1}x = ${180 - b}, et x = ${x}.`,
    }), triangleFigure({ names: [A, B, C], shape: [Math.max(20, x), Math.max(20, a * x)], angles: { A: 'x', B: `${a}x`, C: `${b}°` } }))
  }),
  R(() => {
    const [A, B, C] = NAMES3(), apex = randInt(10, 70) * 2, x = (180 - apex) / 2
    return fig(numeric(`Le triangle ${A}${B}${C} est isocèle en ${C} : ses angles à la base mesurent x° chacun et l'angle en ${C} mesure ${apex}°. Combien vaut x ?`, x, {
      explanation: `x + x + ${apex} = 180, donc 2x = ${180 - apex} et x = ${x}.`,
    }), triangleFigure({ names: [A, B, C], shape: [x, x], angles: { A: 'x', B: 'x', C: `${apex}°` }, marks: { BC: 'tick', CA: 'tick' } }))
  }),
  R(() => {
    const x = randInt(2, 12), k = randInt(2, 9), L = 3 * x + k
    return fig(numeric(`Le segment [AB] mesure ${L} cm. Il est partagé en trois morceaux : AM = x, MN = 2x et NB = ${k} cm. Combien vaut x (en cm) ?`, x, {
      explanation: `x + 2x + ${k} = ${L}, donc 3x = ${L - k} et x = ${x} cm.`,
    }), segmentFigure([{ label: 'x', len: x }, { label: '2x', len: 2 * x }, { label: `${k} cm`, len: k }], `${L} cm`))
  }),
)

/** QCM : quelle équation traduit le problème ? */
function whichEq(prompt: string, good: string, bad: string[], why: string): Exercise {
  return choice(`${prompt} Quelle équation traduit ce problème ?`, good, bad, why)
}
const traduire3 = variants(
  () => {
    const a = randInt(2, 9), b = randInt(2, 20), c = a * randInt(2, 10) + b
    return whichEq(`Je pense à un nombre x. Je le multiplie par ${a} puis j'ajoute ${b} : j'obtiens ${c}.`, `${a}x + ${b} = ${c}`,
      [`${a}(x + ${b}) = ${c}`, `x + ${a} + ${b} = ${c}`, `${b}x + ${a} = ${c}`], `On multiplie d'abord x par ${a} (${a}x), puis on ajoute ${b} : ${a}x + ${b} = ${c}.`)
  },
  () => {
    const a = randInt(2, 9), b = randInt(2, 9), c = a * (randInt(2, 10) + b)
    return whichEq(`Je pense à un nombre x. J'ajoute ${b}, puis je multiplie le résultat par ${a} : j'obtiens ${c}.`, `${a}(x + ${b}) = ${c}`,
      [`${a}x + ${b} = ${c}`, `x + ${b} × ${a} = ${c}`, `${b}(x + ${a}) = ${c}`], `On ajoute d'abord ${b} (x + ${b}), puis on multiplie tout le résultat par ${a} : ${a}(x + ${b}) = ${c}.`)
  },
  () => {
    const n = randInt(2, 8), f = randInt(2, 15), T = n * randInt(2, 10) + f
    return whichEq(`Un lot de ${n} pots de miel identiques, plus un panier à ${f} €, coûte ${T} €. On note x le prix d'un pot.`, `${n}x + ${f} = ${T}`,
      [`${f}x + ${n} = ${T}`, `${n}(x + ${f}) = ${T}`, `x + ${n} + ${f} = ${T}`], `${n} pots coûtent ${n}x, plus le panier : ${n}x + ${f} = ${T}.`)
  },
  () => {
    const d = randInt(2, 15), S = 2 * randInt(8, 30) + d
    return whichEq(`${deuxPrenoms().join(' et ')} ont ensemble ${S} billes ; le second en a ${d} de plus que le premier. On note x le nombre de billes du premier.`, `x + x + ${d} = ${S}`,
      [`x + ${d} = ${S}`, `${d}x = ${S}`, `x + ${d}x = ${S}`], `Le premier a x billes, le second x + ${d} : ensemble x + (x + ${d}) = ${S}.`)
  },
)

// ═══ Palier 4 ═══════════════════════════════════════════════════════════
const reduire4 = variants(
  fresh(() => {
    const a = randInt(2, 6), b = randInt(2, 6), c = randInt(1, 15), x = randInt(1, 10)
    return numeric(`Résous l'équation : ${a}x + ${b}x + ${c} = ${(a + b) * x + c}`, x, { explanation: `On réduit : ${a}x + ${b}x = ${a + b}x. Donc ${a + b}x + ${c} = ${(a + b) * x + c}, ${a + b}x = ${(a + b) * x} et x = ${x}.` })
  }),
  fresh(() => {
    const c = randInt(1, 20), x = randInt(2, 25)
    return numeric(`Résous l'équation : x + x + ${c} = ${2 * x + c}`, x, { explanation: `x + x = 2x. Donc 2x + ${c} = ${2 * x + c}, 2x = ${2 * x} et x = ${x}.` })
  }),
  fresh(() => {
    const a = randInt(3, 9), c = randInt(1, 15), x = randInt(1, 12)
    return numeric(`Résous l'équation : ${a}x − x + ${c} = ${(a - 1) * x + c}`, x, { explanation: `${a}x − x = ${a - 1}x. Donc ${a - 1}x + ${c} = ${(a - 1) * x + c}, ${a - 1}x = ${(a - 1) * x} et x = ${x}.` })
  }),
  fresh(() => {
    const a = randInt(2, 7), b = randInt(2, 7), c = randInt(1, 15), d = randInt(1, 15), x = randInt(1, 10)
    return numeric(`Résous l'équation : ${a}x + ${c} + ${b}x + ${d} = ${(a + b) * x + c + d}`, x, { explanation: `On regroupe : ${a}x + ${b}x = ${a + b}x et ${c} + ${d} = ${c + d}. Donc ${a + b}x + ${c + d} = ${(a + b) * x + c + d}, ${a + b}x = ${(a + b) * x} et x = ${x}.` })
  }),
)

const partage4 = variants(
  fresh(() => {
    const [p, q] = deuxPrenoms(), k = randInt(2, 5), x = randInt(4, 30)
    return numeric(`${q} a ${k} fois plus de cartes que ${p}. Ensemble, ils en ont ${(k + 1) * x}. Combien de cartes ${p} a-t-${il(p)} ?`, x, {
      explanation: `En notant x le nombre de cartes ${deP(p)} : x + ${k}x = ${(k + 1) * x}, soit ${k + 1}x = ${(k + 1) * x}, et x = ${x}.`,
    })
  }),
  fresh(() => {
    const x = randInt(5, 60), S = 3 * x + 3
    return numeric(`La somme de trois nombres entiers consécutifs est ${S}. Quel est le plus petit des trois ?`, x, {
      explanation: `x + (x + 1) + (x + 2) = ${S}, soit 3x + 3 = ${S}, 3x = ${S - 3} et x = ${x}. Les nombres sont ${x}, ${x + 1} et ${x + 2}.`,
    })
  }),
  fresh(() => {
    const p = prenom(), d = randInt(20, 35), x = randInt(5, 15)
    return numeric(`La mère ${deP(p)} a ${d} ans de plus que ${il(p) === 'il' ? 'lui' : 'elle'}. La somme de leurs âges est ${2 * x + d} ans. Quel âge a ${p} ?`, x, {
      explanation: `x + (x + ${d}) = ${2 * x + d}, soit 2x + ${d} = ${2 * x + d}, 2x = ${2 * x} et x = ${x} ans.`,
    })
  }),
  fresh(() => {
    const x = randInt(20, 200), k = randInt(10, 50) * 2, S = 3 * x + 3 * k
    return numeric(`Trois frères se partagent ${S} écus : le deuxième reçoit ${k} écus de plus que le premier, et le troisième ${k} écus de plus que le deuxième. Combien reçoit le premier ?`, x, {
      explanation: `x + (x + ${k}) + (x + ${2 * k}) = ${S}, soit 3x + ${3 * k} = ${S}, 3x = ${S - 3 * k} et x = ${x} écus.`,
    })
  }),
)

const fraction4 = variants(
  fresh(() => {
    const a = randInt(2, 9), b = randInt(1, 15), q = randInt(2, 12)
    return numeric(`Résous l'équation : ${F('x', a)} + ${b} = ${q + b}`, a * q, { explanation: `${F('x', a)} = ${q + b} − ${b} = ${q}, donc x = ${q} × ${a} = ${a * q}.` })
  }),
  fresh(() => {
    const a = randInt(2, 9), b = randInt(1, 15), q = randInt(2, 12)
    return numeric(`Résous l'équation : ${F('x', a)} − ${b} = ${q}`, a * (q + b), { explanation: `${F('x', a)} = ${q} + ${b} = ${q + b}, donc x = ${q + b} × ${a} = ${a * (q + b)}.` })
  }),
  fresh(() => {
    const a = randInt(2, 6), b = randInt(1, 9), q = randInt(2, 10), x = a * q - b
    return numeric(`Résous l'équation : ${F('x + ' + b, a)} = ${q}`, x, { explanation: `x + ${b} = ${q} × ${a} = ${a * q}, donc x = ${a * q} − ${b} = ${x}.` })
  }),
  R(() => {
    const k = randInt(2, 5), a = randInt(k + 1, 9), q = randInt(2, 12)
    if (a % k === 0) return null
    return numeric(`Résous l'équation : ${F(`${k}x`, a)} = ${k * q}`, a * q, { explanation: `${k}x = ${k * q} × ${a} = ${k * q * a}, donc x = ${k * q * a} ÷ ${k} = ${a * q}.` })
  }),
)

const param4 = variants(
  R(() => {
    const x = randInt(2, 9), a = randInt(2, 9), b = randInt(1, 20), c = a * x + b
    if (a === x) return null
    return numeric(`Quel nombre a faut-il choisir pour que x = ${x} soit solution de l'équation a × x + ${b} = ${c} ?`, a, { explanation: `On remplace x par ${x} : a × ${x} + ${b} = ${c}, donc a × ${x} = ${c - b} et a = ${a}.` })
  }),
  R(() => {
    const x = randInt(2, 9), a = randInt(2, 9), b = randInt(1, 20), c = a * x + b
    if (b === x || b === a) return null
    return numeric(`Quel nombre b faut-il choisir pour que x = ${x} soit solution de l'équation ${a}x + b = ${c} ?`, b, { explanation: `On remplace x par ${x} : ${a} × ${x} + b = ${c}, soit ${a * x} + b = ${c}, donc b = ${c} − ${a * x} = ${b}.` })
  }),
  R(() => {
    const x = randInt(2, 9), a = randInt(2, 9), b = randInt(1, 20)
    return numeric(`Quel nombre faut-il écrire à la place de ★ pour que ${x} soit solution de l'équation ${lin(a, b)} = ★ ?`, a * x + b, { explanation: `Le membre de gauche vaut, pour x = ${x} : ${a} × ${x} + ${b} = ${a * x + b}. Il faut donc écrire ${a * x + b}.` })
  }),
  R(() => {
    const x = randInt(2, 9), a = randInt(2, 6), b = randInt(1, 9), c = a * (x + b)
    if (b === x || b === a) return null
    return numeric(`Quel nombre b faut-il choisir pour que x = ${x} soit solution de l'équation ${a}(x + b) = ${c} ?`, b, { explanation: `${a} × (${x} + b) = ${c}, donc ${x} + b = ${c} ÷ ${a} = ${x + b} et b = ${b}.` })
  }),
)

// ═══ Palier 5 ═══════════════════════════════════════════════════════════
/** ax + b = cx + d avec a > c et solution entière positive. */
function twoSides(): { a: number; b: number; c: number; d: number; x: number } {
  for (;;) {
    const c = randInt(1, 6), a = c + randInt(1, 5), x = randInt(1, 12), b = randInt(-15, 20), d = (a - c) * x + b
    if (b !== 0 && d !== 0 && Math.abs(d) <= 60 && (b > 0 || d > 0)) return { a, b, c, d, x }
  }
}
const deux5 = variants(
  fresh(() => {
    const { a, b, c, d, x } = twoSides()
    const sg = (v: number) => (v > 0 ? `+ ${v}` : `− ${-v}`)
    return numeric(`Résous l'équation : ${lin(a, b)} = ${lin(c, d)}`, x, {
      explanation: `On retire ${c === 1 ? 'x' : `${c}x`} des deux côtés : ${lin(a - c, b)} = ${fmt(d)}. Puis ${lin(a - c)} = ${fmt(d)} ${sg(-b)} = ${d - b}, et x = ${x}. Vérification : ${a} × ${x} ${sg(b)} = ${a * x + b} et ${c === 1 ? `${x}` : `${c} × ${x}`} ${sg(d)} = ${c * x + d}.`,
    })
  }),
  fresh(() => {
    const k = randInt(2, 6), x = randInt(2, 15), b = (k - 1) * x
    return numeric(`Résous l'équation : x + ${b} = ${k}x`, x, { explanation: `On retire x des deux côtés : ${b} = ${k - 1 === 1 ? 'x' : `${k - 1}x`}, donc x = ${x}. ${solveCheck(`${x} + ${b}`, `${k} × ${x} = ${k * x}`)}` })
  }),
  fresh(() => {
    const c = randInt(2, 6), a = c + randInt(1, 4), x = randInt(1, 10), d = randInt(1, 20), b = c * x + d - a * x
    if (b === 0) return numeric(`Résous l'équation : ${lin(a)} = ${lin(c, d)}`, x, { explanation: `${a - c}x = ${d}, donc x = ${x}.` })
    return numeric(`Résous l'équation : ${b > 0 ? `${b} + ${a}x` : lin(a, b)} = ${lin(c, d)}`, x, { explanation: `On retire ${c}x des deux côtés : ${lin(a - c, b)} = ${d}, donc ${lin(a - c)} = ${d - b} et x = ${x}.` })
  }),
)

const pb5 = variants(
  fresh(() => {
    const pA = randInt(6, 12), pB = randInt(2, pA - 2), x = randInt(5, 25), ab = (pA - pB) * x
    return numeric(`À la piscine, le tarif A coûte ${pA} € par entrée. Le tarif B coûte un abonnement de ${ab} € plus ${pB} € par entrée. Pour combien d'entrées les deux tarifs coûtent-ils la même somme ?`, x, {
      explanation: `Pour x entrées : ${pA}x = ${ab} + ${pB}x. On retire ${pB}x : ${pA - pB}x = ${ab}, donc x = ${x} entrées.`,
    })
  }),
  fresh(R(() => {
    const [p, q] = deuxPrenoms(), a = randInt(30, 90), r = randInt(2, 6), b = randInt(5, 25), s2 = randInt(2, 6), t = (a - b) / (r + s2)
    if (!isInt(t) || t < 2) return null
    return numeric(`${p} a ${a} € et dépense ${r} € par semaine. ${q} a ${b} € et économise ${s2} € par semaine. Dans combien de semaines auront-ils la même somme ?`, t, {
      explanation: `Dans x semaines : ${a} − ${r}x = ${b} + ${s2}x. On ajoute ${r}x et on retire ${b} : ${a - b} = ${r + s2}x, donc x = ${t} semaines.`,
    })
  })),
  fresh(() => {
    const k = randInt(3, 5), x = randInt(3, 15), father = k * x, t = father - 2 * x
    return numeric(`Un père a ${father} ans et son fils ${x} ans. Dans combien d'années le père aura-t-il exactement le double de l'âge de son fils ?`, t, {
      explanation: `Dans t années : ${father} + t = 2 × (${x} + t), soit ${father} + t = ${2 * x} + 2t. Donc t = ${father} − ${2 * x} = ${t} ans.`,
    })
  }),
  fresh(R(() => {
    const v1 = randInt(20, 60) * 10, d1 = randInt(2, 6) * 10, v2 = randInt(5, 30) * 10, d2 = randInt(1, 5) * 10, t = (v1 - v2) / (d1 + d2)
    if (!isInt(t) || t < 2 || v2 >= v1) return null
    return numeric(`Une citerne contient ${v1} L et se vide de ${d1} L par heure. Une autre contient ${v2} L et se remplit de ${d2} L par heure. Au bout de combien d'heures contiendront-elles la même quantité d'eau ?`, t, {
      explanation: `Au bout de x heures : ${v1} − ${d1}x = ${v2} + ${d2}x, donc ${v1 - v2} = ${d1 + d2}x et x = ${t} heures.`,
    })
  })),
)

const geo5 = variants(
  R(() => {
    const [A, B, C] = NAMES3(), k = randInt(5, 40), m = pick([2, 3]), x = (180 - k) / (2 + m)
    if (!isInt(x) || x < 15) return null
    return fig(numeric(`Dans le triangle ${A}${B}${C}, l'angle en ${A} mesure x°, l'angle en ${B} mesure (x + ${k})° et l'angle en ${C} mesure ${m}x°. Combien vaut x ?`, x, {
      explanation: `x + (x + ${k}) + ${m}x = 180, soit ${2 + m}x + ${k} = 180, ${2 + m}x = ${180 - k} et x = ${x}. Les angles mesurent ${x}°, ${x + k}° et ${m * x}°.`,
    }), triangleFigure({ names: [A, B, C], shape: [Math.max(25, x), Math.max(25, Math.min(100, x + k))], angles: { A: 'x', B: `x + ${k}`, C: `${m}x` } }))
  }),
  R(() => {
    const k = randInt(1, 8), x = 3 * k
    return fig(numeric(`Un carré a pour côté x cm et un triangle équilatéral a pour côté (x + ${k}) cm. Ils ont le même périmètre. Combien vaut x ?`, x, {
      explanation: `Périmètres : 4x et 3(x + ${k}) = 3x + ${3 * k}. Donc 4x = 3x + ${3 * k}, et x = ${x} cm.`,
    }), twoShapesFigure('côté x', { kind: 'tri', l1: `côté x + ${k}` }))
  }),
  R(() => {
    const k = randInt(2, 10), x = 2 * k
    return fig(numeric(`Un rectangle mesure x cm sur 2x cm. Un carré a pour côté (x + ${k}) cm. Le rectangle et le carré ont le même périmètre. Combien vaut x ?`, x, {
      explanation: `Rectangle : 2 × (x + 2x) = 6x. Carré : 4(x + ${k}) = 4x + ${4 * k}. Donc 6x = 4x + ${4 * k}, 2x = ${4 * k} et x = ${x} cm.`,
    }), twoShapesFigure(`côté x + ${k}`, { kind: 'rect', l1: '2x', l2: 'x' }))
  }),
)

const paren5 = variants(
  fresh(() => {
    const a = randInt(2, 5), b = randInt(1, 8), c = randInt(1, a - 1), x = randInt(1, 12), d = a * (x + b) - c * x
    return numeric(`Résous l'équation : ${a}(x + ${b}) = ${lin(c, d)}`, x, { explanation: `On développe : ${a}x + ${a * b} = ${lin(c, d)}. On retire ${c === 1 ? 'x' : `${c}x`} : ${lin(a - c, a * b)} = ${d}, donc ${lin(a - c)} = ${d - a * b} et x = ${x}.` })
  }),
  R(() => {
    const a = randInt(2, 5), b = randInt(1, 6), c = randInt(1, 9), x = randInt(1, 10), R2 = a * (b * x - 1) + c
    if (b === 1) return null
    return numeric(`Résous l'équation : ${a}(${b}x − 1) + ${c} = ${R2}`, x, { explanation: `${a}(${b}x − 1) = ${R2} − ${c} = ${R2 - c} ; ${b}x − 1 = ${(R2 - c) / a} ; ${b}x = ${(R2 - c) / a + 1} ; x = ${x}.` })
  }),
  R(() => {
    const a = randInt(3, 7), c = randInt(1, a - 1), b = randInt(1, 8), d = randInt(1, 8), num = a * b + c * d, x = num / (a - c)
    if (!isInt(x) || x > 30) return null
    return numeric(`Résous l'équation : ${a}(x − ${b}) = ${c === 1 ? `x + ${d}` : `${c}(x + ${d})`}`, x, {
      explanation: `On développe : ${a}x − ${a * b} = ${lin(c, c * d)}. On retire ${c === 1 ? 'x' : `${c}x`} et on ajoute ${a * b} : ${lin(a - c)} = ${c * d} + ${a * b} = ${num}, donc x = ${x}.`,
    })
  }),
  R(() => {
    const a = randInt(2, 6), b = randInt(1, 9), x = randInt(2, 12), R2 = a * (x + b) - x
    if (a === 1) return null
    return numeric(`Résous l'équation : ${a}(x + ${b}) − x = ${R2}`, x, { explanation: `On développe : ${a}x + ${a * b} − x = ${R2}, soit ${lin(a - 1, a * b)} = ${R2}. Donc ${lin(a - 1)} = ${R2 - a * b} et x = ${x}.` })
  }),
)

// ═══ Problèmes d'amélioration ═══════════════════════════════════════════
const up1: Maker[] = [
  model('Le programme de calcul', () => {
    const a = randInt(2, 12), b = randInt(2, 6), c = randInt(1, 20), x = randInt(2, 15), Rr = b * (x + a) - c
    if (Rr <= 0) return null
    return numeric(`Programme : « Choisis un nombre. Ajoute ${a}. Multiplie le résultat par ${b}. Soustrais ${c}. » ${prenom()} obtient ${Rr}. Quel nombre a été choisi au départ ?`, x, {
      explanation: `Équation : ${b}(x + ${a}) − ${c} = ${Rr}. Donc ${b}(x + ${a}) = ${Rr + c}, x + ${a} = ${(Rr + c) / b} et x = ${x}. (On peut aussi « remonter » le programme à l'envers.)`,
    })
  }),
  model('Même solution', () => {
    const x = randInt(2, 10), a = randInt(2, 7), b = randInt(1, 15), c = randInt(2, 7), k = randInt(1, 20), d = c * x - k
    if (d <= 0 || a === c) return null
    return numeric(`Les équations ${lin(a, b)} = ${a * x + b} et ${c}x − k = ${d} ont la même solution. Combien vaut k ?`, k, {
      explanation: `La première donne ${a}x = ${a * x}, donc x = ${x}. Dans la seconde : ${c} × ${x} − k = ${d}, soit ${c * x} − k = ${d}, donc k = ${k}.`,
    })
  }),
  model('Le nombre et ses multiples', () => {
    const ks = pick([[1, 2, 3], [1, 2, 4], [1, 3, 5], [2, 3, 5], [1, 2, 3, 4], [2, 3, 4]]), x = randInt(3, 25), tot = ks.reduce((t, k) => t + k, 0), S = tot * x
    const w: Record<number, string> = { 2: 'double', 3: 'triple', 4: 'quadruple', 5: 'quintuple' }
    const join = (a: string[]) => `${a.slice(0, -1).join(', ')} et ${a[a.length - 1]}`
    const txt = ks[0] === 1
      ? `La somme d'un nombre, ${join(ks.slice(1).map((k) => `de son ${w[k]}`))} vaut ${S}.`
      : `La somme du ${join(ks.map((k) => w[k]).map((v, i) => (i === 0 ? v : `du ${v}`)))} d'un nombre vaut ${S}.`
    return numeric(`${txt} Quel est ce nombre ?`, x, {
      explanation: `${ks.map((k) => (k === 1 ? 'x' : `${k}x`)).join(' + ')} = ${S}, soit ${tot}x = ${S}, donc x = ${S} ÷ ${tot} = ${x}.`,
    })
  }),
]

const up2: Maker[] = [
  model('Les deux programmes', () => {
    const a = randInt(3, 8), c = randInt(1, a - 1), x = randInt(2, 12), b = randInt(1, 15), d = (a - c) * x + b
    return numeric(`Programme A : « multiplier par ${a}, puis ajouter ${b} ». Programme B : « ${c === 1 ? 'ajouter' : `multiplier par ${c}, puis ajouter`} ${d} ». Quel nombre de départ donne le même résultat avec les deux programmes ?`, x, {
      explanation: `${lin(a, b)} = ${lin(c, d)}. On retire ${c === 1 ? 'x' : `${c}x`} : ${lin(a - c, b)} = ${d}, donc ${lin(a - c)} = ${d - b} et x = ${x}. Les deux programmes donnent ${a * x + b}.`,
    })
  }),
  model('Combien de solutions ?', () => {
    const a = randInt(2, 6), b = randInt(1, 9), kind = randInt(0, 2), e = randInt(1, 9)
    const right = kind === 0 ? `${a}x + ${a * b + e}` : kind === 1 ? `${a}x + ${a * b}` : lin(a + 1, a * b - e)
    const good = kind === 0 ? 'Aucune solution' : kind === 1 ? 'Une infinité de solutions' : 'Une seule solution'
    return choice(`Combien de solutions l'équation ${a}(x + ${b}) = ${right} possède-t-elle ?`, good, ['Aucune solution', 'Une seule solution', 'Une infinité de solutions'],
      `On développe le membre de gauche : ${a}x + ${a * b}. ${kind === 0 ? `Il faudrait ${a}x + ${a * b} = ${a}x + ${a * b + e}, soit ${a * b} = ${a * b + e} : impossible, aucune solution.` : kind === 1 ? `Les deux membres sont identiques : tout nombre est solution.` : `${a}x + ${a * b} = ${lin(a + 1, a * b - e)} donne x = ${e} : une seule solution.`}`)
  }),
  model('La bourse de pièces', () => {
    const v1 = pick([1, 2]), v2 = pick([5, 10]), n = randInt(15, 40), y = randInt(3, n - 3), T = v1 * (n - y) + v2 * y
    return numeric(`Une bourse contient ${n} pièces : des pièces de ${v1} denier${s(v1)} et des pièces de ${v2} deniers, pour une valeur totale de ${T} deniers. Combien y a-t-il de pièces de ${v2} deniers ?`, y, {
      explanation: `Avec x pièces de ${v2} deniers, il y a ${n} − x pièces de ${v1} : ${v1 === 1 ? '' : `${v1} × `}(${n} − x) + ${v2}x = ${T}. Soit ${v1 * n} + ${v2 - v1}x = ${T}, ${v2 - v1}x = ${T - v1 * n} et x = ${y}.`,
    })
  }),
]

const up3: Maker[] = [
  model('Les âges du père et du fils', () => {
    const [k, m] = pick([[4, 2], [5, 2], [6, 2], [6, 3], [7, 3], [8, 3]]), t = randInt(4, 20), x = ((m - 1) * t) / (k - m)
    if (!isInt(x) || x < 3 || x > 20) return null
    const w = m === 2 ? 'le double' : 'le triple'
    return numeric(`Aujourd'hui, un père a ${k} fois l'âge de son fils. Dans ${t} ans, il aura seulement ${w} de l'âge de son fils. Quel âge a le fils aujourd'hui ?`, x, {
      explanation: `Fils : x ans, père : ${k}x ans. Dans ${t} ans : ${k}x + ${t} = ${m}(x + ${t}) = ${m}x + ${m * t}. Donc ${lin(k - m)} = ${m * t - t}, et x = ${m * t - t} ÷ ${k - m} = ${x} ans (le père a ${k * x} ans).`,
    })
  }),
  model('La bourse qui se vide', () => {
    const [a, b] = pick([[2, 3], [3, 4], [2, 5], [3, 5], [4, 5], [2, 7]]), L = a * b, r = L - b - a, mult = randInt(1, 8), x = L * mult, rest = r * mult
    if (r <= 0) return null
    return numeric(`Un marchand dépense ${F(1, a)} de sa bourse au marché, puis ${F(1, b)} de sa bourse (de départ) à l'auberge. Il lui reste ${rest} écus. Combien d'écus avait-il au départ ?`, x, {
      explanation: `Il a dépensé ${F(1, a)} + ${F(1, b)} = ${F(b + a, L)} de sa bourse ; il lui en reste ${F(r, L)}. Donc ${F(r, L)} × x = ${rest}, et x = ${rest} × ${L} ÷ ${r} = ${x} écus.`,
    })
  }),
  model('Les nombres pairs consécutifs', () => {
    const n = pick([3, 4]), x = 2 * randInt(3, 30), S = n * x + 2 * ((n * (n - 1)) / 2)
    return numeric(`La somme de ${n} nombres pairs consécutifs est ${S}. Quel est le plus grand de ces nombres ?`, x + 2 * (n - 1), {
      explanation: `${Array.from({ length: n }, (_, i) => (i === 0 ? 'x' : `(x + ${2 * i})`)).join(' + ')} = ${S}, soit ${n}x + ${n * (n - 1)} = ${S}, ${n}x = ${S - n * (n - 1)} et x = ${x}. Les nombres sont ${Array.from({ length: n }, (_, i) => x + 2 * i).join(', ')} : le plus grand est ${x + 2 * (n - 1)}.`,
    })
  }),
]

// ═══ Problèmes de l'hôtel de ville ═══════════════════════════════════════
const age1: Maker[] = [
  model('La balance du marchand', () => {
    const k = randInt(2, 4), x = randInt(2, 9), w1 = randInt(1, 6), tot = k * x + w1
    const right = tot > 12 ? [Math.floor(tot / 2), tot - Math.floor(tot / 2)] : [tot]
    return withMeta(numeric(`Sur la balance du marchand, ${k} sacs de farine identiques et un poids de ${w1} kg équilibrent ${right.length === 1 ? `un poids de ${tot} kg` : right[0] === right[1] ? `deux poids de ${right[0]} kg chacun` : `deux poids de ${right[0]} kg et ${right[1]} kg`}. Combien pèse un sac de farine (en kg) ?`, x, {
      explanation: `En notant x la masse d'un sac : ${k}x + ${w1} = ${tot}. Donc ${k}x = ${tot - w1} et x = ${x} kg.`,
    }), { figure: balanceFigure({ bags: k, w: [w1] }, { bags: 0, w: right }) })
  }),
  model('Le péage du pont', () => {
    const c = randInt(2, 6), x = randInt(3, 12), n = randInt(3, 8), T = c + n * x
    return numeric(`Pour traverser le pont du seigneur, un marchand paie ${c} deniers pour sa charrette, plus un péage identique pour chacun de ses ${n} chevaux. Il paie ${T} deniers en tout. Quel est le péage pour un cheval ?`, x, {
      explanation: `${c} + ${n}x = ${T}, donc ${n}x = ${T - c} et x = ${x} deniers.`,
    })
  }),
  model('La clôture du potager', () => {
    const k = randInt(2, 8), x = randInt(4, 20), Pm = 2 * (2 * x + k), p = randInt(2, 5)
    return withMeta(numeric(`Le potager du monastère est un rectangle dont la longueur dépasse la largeur de ${k} m (voir le schéma). Frère Anselme a payé ${Pm * p} deniers pour l'entourer d'une clôture à ${p} deniers le mètre. Quelle est la largeur du potager (en m) ?`, x, {
      explanation: `Longueur de clôture : ${Pm * p} ÷ ${p} = ${Pm} m. Périmètre : 2(x + x + ${k}) = ${Pm}, donc 2x + ${k} = ${Pm / 2}, 2x = ${Pm / 2 - k} et x = ${x} m.`,
    }), { figure: rectFigure(`x + ${k}`, 'x') })
  }),
]

const age2: Maker[] = [
  model('La balance à deux plateaux', () => {
    const c = randInt(1, 3), a = c + randInt(1, 3), x = randInt(2, 8), b = randInt(1, 6), d = (a - c) * x + b
    if (a > 6 || d > 20) return null
    const split = (w: number) => (w > 9 ? [Math.ceil(w / 2), Math.floor(w / 2)] : [w])
    return withMeta(numeric(`La balance est en équilibre : à gauche, ${a} sacs identiques et ${b} kg de poids ; à droite, ${c} sac${s(c)} identique${s(c)} aux autres et ${d} kg de poids (voir le schéma). Combien pèse un sac (en kg) ?`, x, {
      explanation: `${lin(a, b)} = ${lin(c, d)}. On enlève ${c} sac${s(c)} de chaque côté : ${lin(a - c, b)} = ${d}. On enlève ${b} kg de chaque côté : ${lin(a - c)} = ${d - b}${a - c === 1 ? '' : `, donc x = ${d - b} ÷ ${a - c}`}. Un sac pèse ${x} kg.`,
    }), { figure: balanceFigure({ bags: a, w: split(b) }, { bags: c, w: split(d) }) })
  }),
  model('Les angles du fanion', () => {
    const [A, B, C] = NAMES3(), k = randInt(1, 6) * 5, m = pick([2, 3]), x = (180 - k) / (2 + m)
    if (!isInt(x)) return null
    return withMeta(numeric(`Le fanion du chevalier est un triangle ${A}${B}${C}. L'angle en ${B} mesure ${k}° de plus que l'angle en ${A}, et l'angle en ${C} est ${m === 2 ? 'le double' : 'le triple'} de l'angle en ${A}. Quelle est la mesure de l'angle en ${A} (en degrés) ?`, x, {
      explanation: `Angle en ${A} : x. Alors x + (x + ${k}) + ${m}x = 180, soit ${2 + m}x + ${k} = 180, ${2 + m}x = ${180 - k}, x = ${x}°. (Angles : ${x}°, ${x + k}°, ${m * x}°.)`,
    }), { figure: triangleFigure({ names: [A, B, C], shape: [Math.max(25, x), Math.max(25, Math.min(110, x + k))], angles: { A: 'x', B: `x + ${k}°`, C: `${m}x` } }) })
  }),
  model('Le tarif des bains', () => {
    const pA = randInt(5, 10), pB = randInt(2, pA - 2), x = randInt(6, 20), ab = (pA - pB) * x, ask = randInt(0, 1)
    return numeric(`Aux bains de la ville, le tarif « Bourgeois » coûte ${pA} deniers par visite. Le tarif « Abonné » coûte ${ab} deniers pour l'année, plus ${pB} deniers par visite. ${ask === 0 ? 'Pour combien de visites dans l’année les deux tarifs reviennent-ils au même prix ?' : 'À partir de combien de visites dans l’année le tarif « Abonné » devient-il strictement plus avantageux ?'}`, ask === 0 ? x : x + 1, {
      explanation: `Pour x visites : ${pA}x = ${ab} + ${pB}x, donc ${pA - pB}x = ${ab} et x = ${x}. ${ask === 0 ? `Les tarifs sont égaux pour ${x} visites.` : `À ${x} visites les prix sont égaux ; au-delà, chaque visite coûte ${pA - pB} deniers de moins avec l'abonnement : il devient avantageux à partir de ${x + 1} visites.`}`,
    })
  }),
]

const age3: Maker[] = [
  model('Les bougies du monastère', () => {
    const r1 = randInt(2, 5), r2 = r1 + randInt(1, 4), t = randInt(2, 8), h2 = randInt(r2 * t + 4, r2 * t + 20), h1 = h2 - (r2 - r1) * t
    if (h1 <= r1 * t + 2 || h1 >= h2) return null
    return withMeta(numeric(`Deux bougies sont allumées en même temps. La rouge mesure ${h1} cm et raccourcit de ${r1} cm par heure ; la bleue mesure ${h2} cm et raccourcit de ${r2} cm par heure. Au bout de combien d'heures auront-elles la même hauteur ?`, t, {
      explanation: `Au bout de x heures : ${h1} − ${r1}x = ${h2} − ${r2}x. On ajoute ${r2}x : ${h1} + ${r2 - r1 === 1 ? 'x' : `${r2 - r1}x`} = ${h2}, donc ${r2 - r1 === 1 ? 'x' : `${r2 - r1}x`} = ${h2 - h1} et x = ${t} heures. (Elles mesureront alors ${h1 - r1 * t} cm.)`,
    }), { figure: candlesFigure(h1, h2, `${h1} cm`, `${h2} cm`) })
  }),
  model('L’héritage', () => {
    const x = randInt(10, 60) * 10, k = randInt(2, 15) * 10, m = pick([2, 3]), S = x + (x + k) + m * x
    return numeric(`Trois frères se partagent un héritage de ${S} écus. Le deuxième reçoit ${k} écus de plus que l'aîné, et le troisième ${m === 2 ? 'le double' : 'le triple'} de ce que reçoit l'aîné. Combien reçoit l'aîné ?`, x, {
      explanation: `Aîné : x. Alors x + (x + ${k}) + ${m}x = ${S}, soit ${2 + m}x + ${k} = ${S}, ${2 + m}x = ${S - k} et x = ${x} écus. (Parts : ${x}, ${x + k} et ${m * x}.)`,
    })
  }),
  model('Le pré et le jardin', () => {
    const k = randInt(2, 12), x = 2 * k, ask = randInt(0, 1)
    return withMeta(numeric(`Le jardin du château est un carré de côté (x + ${k}) m. Le pré voisin est un rectangle de x m sur 2x m (voir le schéma). Il faut exactement la même longueur de clôture pour entourer le jardin et le pré. ${ask === 0 ? 'Combien vaut x ?' : 'Quelle longueur de clôture faut-il pour entourer le pré (en m) ?'}`, ask === 0 ? x : 6 * x, {
      explanation: `Pré : 2 × (x + 2x) = 6x. Jardin : 4(x + ${k}) = 4x + ${4 * k}. Donc 6x = 4x + ${4 * k}, 2x = ${4 * k} et x = ${x} m.${ask === 1 ? ` Clôture du pré : 6 × ${x} = ${6 * x} m.` : ''}`,
    }), { figure: twoShapesFigure(`côté x + ${k}`, { kind: 'rect', l1: '2x', l2: 'x' }) })
  }),
]


export const CONTENT: SubjectContent | null = {
  tiers: [
    [test1, plus1, fois1, membre1],
    [moins2, affine2, quel2, probleme2],
    [decimal3, paren3, geo3, traduire3],
    [reduire4, partage4, fraction4, param4],
    [deux5, pb5, geo5, paren5],
  ],
  upgrades: [up1, up2, up3],
  age: [age1, age2, age3],
}
