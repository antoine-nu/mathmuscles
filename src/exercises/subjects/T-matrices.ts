// Matrices et graphes (Terminale, Maths expertes) : opérations sur les matrices 2×2 et 3×3 (somme, produit,
// puissances, inverse et déterminant 2×2), systèmes sous forme matricielle, graphes (ordre, degrés, matrice
// d’adjacence, nombre de chemins de longueur k), graphes probabilistes à deux états (chaînes de Markov, état stable).
// Les matrices sont affichées en figure (avec parenthèses), les graphes dessinés (flèches pour les graphes orientés).
import {
  F, choice, fmt, fracText, fresh, numeric, pair, par, parseNumber, pick, poly, randInt, randNonZero, sameNumber,
  solutionSet, variants, withMeta,
  type Exercise, type Ladder, type SubjectContent, type Tiers,
} from '../utils'
import type { FigSegment, Figure } from '../figure'
import { retry, triplet, type V3 } from './T-espace'

// ── Aides : matrices ─────────────────────────────────────────────────────
type M = number[][]
const dims = (A: M) => [A.length, A[0].length]
const madd = (A: M, B: M): M => A.map((r, i) => r.map((v, j) => v + B[i][j]))
const mscale = (k: number, A: M): M => A.map((r) => r.map((v) => k * v))
const mmul = (A: M, B: M): M => A.map((r) => B[0].map((_, j) => r.reduce((s, v, k) => s + v * B[k][j], 0)))
const ident = (n: number): M => Array.from({ length: n }, (_, i) => Array.from({ length: n }, (__, j) => (i === j ? 1 : 0)))
const mpow = (A: M, n: number): M => { let R = ident(A.length); for (let k = 0; k < n; k++) R = mmul(R, A); return R }
const det2 = (A: M) => A[0][0] * A[1][1] - A[0][1] * A[1][0]
const inv2 = (A: M): M => { const d = det2(A); return [[A[1][1] / d, -A[0][1] / d], [-A[1][0] / d, A[0][0] / d]] }
const rm = (r: number, c: number, k = 5): M => Array.from({ length: r }, () => Array.from({ length: c }, () => randInt(-k, k)))
const r2 = (v: number) => Math.round(v * 1e9) / 1e9

/** Texte d’un coefficient : entier, décimal court, ou fraction a/b. */
function num(v: number): string {
  v = r2(v)
  if (Number.isInteger(v) || Math.abs(v * 1000 - Math.round(v * 1000)) < 1e-9) return fmt(v)
  for (let d = 2; d <= 200; d++) if (Math.abs(v * d - Math.round(v * d)) < 1e-9) return fracText(Math.round(v * d), d)
  return fmt(v)
}
/** Matrice en texte (réponse) : [2 −1 ; 0 3]. */
const mTxt = (A: M) => `[${A.map((r) => r.map(num).join(' ')).join(' ; ')}]`
/** Coefficient (i ; j) en toutes lettres. */
const pos = (i: number, j: number) => `ligne ${i + 1}, colonne ${j + 1}`
/** Ligne i de A fois colonne j de B, détaillé. */
const rowCol = (A: M, B: M, i: number, j: number) =>
  A[i].map((v, k) => [v, B[k][j]]).filter(([v, w]) => v !== 0 && w !== 0).map(([v, w], k) => `${k === 0 ? fmt(v) : par(v)} × ${par(w)}`).join(' + ') || '0'

/** Lit une matrice saisie par lignes : « 2 -1 ; 0 3 », « [[2, -1], [0, 3]] », « (2 ; -1 / 0 ; 3) »… */
export function parseMatrix(raw: string, rows: number, cols: number): M | null {
  let s = raw.trim().replace(/[−–—]/g, '-').replace(/^[A-Za-z]\w*\s*=\s*/, '')
  s = s.replace(/\]\s*,?\s*\[/g, '|').replace(/\)\s*,?\s*\(/g, '|').replace(/[[\]()]/g, ' ').trim()
  s = s.replace(/(^|[\s;|/])([+-])\s+(?=\d)/g, '$1$2')
  const readRow = (r: string): number[] | null => {
    const t = r.trim()
    const cands = [t.split(/\s+/).map((x) => x.replace(/^,|,$/g, '')).filter(Boolean), t.split(/\s*,\s*/), t.split(/[\s,]+/), t.split(/\s*;\s*/)]
    for (const c of cands) {
      if (c.length !== cols && !(rows * cols === c.length)) continue
      const v = c.map((x) => parseNumber(x))
      if (v.every((x) => !Number.isNaN(x)) && c.every((x) => !/\S\s+\S/.test(x))) return v
    }
    return null
  }
  for (const sep of [/\s*\|\s*/, /\s*;\s*/, /\s*\/\s*/, /\n/]) {
    const parts = s.split(sep).filter((p) => p.trim() !== '')
    if (parts.length === rows) {
      const R = parts.map(readRow)
      if (R.every((r) => r && r.length === cols)) return R as M
    }
    if (parts.length === 1 || (parts.length === rows * cols && cols === 1) || parts.length === rows * cols) {
      // une seule ligne de rows × cols nombres (lecture ligne par ligne), ou un vecteur colonne écrit en ligne
      const flat = parts.length === 1 ? readRow(parts[0]) : parts.map((p) => parseNumber(p))
      if (flat && flat.length === rows * cols && flat.every((x) => !Number.isNaN(x))) {
        return Array.from({ length: rows }, (_, i) => flat.slice(i * cols, (i + 1) * cols))
      }
    }
  }
  return null
}

/** Réponse : une matrice saisie ligne par ligne. */
function matAnswer(prompt: string, A: M, explanation: string): Exercise {
  const [r, c] = dims(A)
  return {
    prompt, kind: 'input', answer: mTxt(A), explanation,
    inputHint: c === 1 ? 'ex. 5 ; −3' : 'lignes séparées par ; ex. 2 −1 ; 0 3',
    format: c === 1 ? 'les coefficients de haut en bas, séparés par ; (par exemple 5 ; −3)' : 'la matrice ligne par ligne, coefficients séparés par des espaces et lignes par ; (par exemple 2 −1 ; 0 3)',
    keypad: [';', '−', '/'],
    isValid: (v) => parseMatrix(v, r, c) !== null,
    check: (v) => {
      const p = parseMatrix(v, r, c)
      return !!p && p.every((row, i) => row.every((x, j) => sameNumber(x, A[i][j])))
    },
  }
}

// ── Aides : figures ──────────────────────────────────────────────────────
const INK = '#3a2410'
const SUB = '₀₁₂₃₄₅₆₇₈₉'
/** Indice en chiffres Unicode : F₁₂. */
const sub = (n: number) => String(n).split('').map((c) => SUB[Number(c)]).join('')

/** Matrices côte à côte, avec leur nom et des parenthèses. */
function matFig(list: { name: string; m: (number | string)[][] }[], caption = ''): Figure {
  const colW = (m: (number | string)[][]) => Math.max(26, ...m.flat().map((v) => 8 * String(typeof v === 'number' ? num(v) : v).length + 10))
  const rowH = 24
  const widths = list.map((L) => 40 + colW(L.m) * L.m[0].length + 16)
  const total = widths.reduce((a, b) => a + b, 0) + 14 * (list.length - 1)
  const W = Math.max(320, total + 20), H = Math.max(...list.map((L) => L.m.length)) * rowH + 40
  const notes: { x: number; y: number; text: string }[] = []
  const curves: Figure['curves'] = []
  let x = (W - total) / 2
  for (const [k, L] of list.entries()) {
    const rows = L.m.length, cw = colW(L.m), top = (H - rows * rowH) / 2, bottom = top + rows * rowH
    notes.push({ x: x + 16, y: (top + bottom) / 2 + 5, text: `${L.name} =` })
    const left = x + 38, right = left + cw * L.m[0].length + 12
    const arc = (x0: number, dir: number): [number, number][] => Array.from({ length: 13 }, (_, t) => {
      const a = -Math.PI / 2 + (Math.PI * t) / 12
      return [x0 - dir * 6 * Math.cos(a) + dir * 6, (top + bottom) / 2 + ((bottom - top) / 2 + 2) * Math.sin(a)] as [number, number]
    })
    curves.push({ pts: arc(left, 1), color: INK, width: 1.6 }, { pts: arc(right, -1), color: INK, width: 1.6 })
    L.m.forEach((row, i) => row.forEach((v, j) => notes.push({ x: left + 6 + cw * (j + 0.5), y: top + rowH * (i + 0.5) + 5, text: typeof v === 'number' ? num(v) : v })))
    x += widths[k] + 14
  }
  return { w: W, h: H, points: {}, notes, curves, caption }
}

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F']
/** Graphe : sommets sur un cercle, arêtes (flèches si orienté), boucles, poids éventuels. */
function graphFig(n: number, edges: [number, number][], directed: boolean, weights?: string[], caption?: string): Figure {
  const W = 320, H = 230, cx = 160, cy = 115, R = 80
  const points: Figure['points'] = {}
  const P = Array.from({ length: n }, (_, k) => {
    const a = n === 4 ? Math.PI * (0.75 - k / 2) : Math.PI / 2 - (2 * Math.PI * k) / n
    return { x: cx + R * Math.cos(a), y: cy - R * Math.sin(a) }
  })
  P.forEach((p, k) => { points[LETTERS[k]] = { x: p.x, y: p.y } })
  const segments: FigSegment[] = [], circles: Figure['circles'] = [], notes: { x: number; y: number; text: string }[] = []
  edges.forEach(([i, j], k) => {
    const w = weights?.[k]
    if (i === j) {
      const dx = P[i].x - cx, dy = P[i].y - cy, L = Math.hypot(dx, dy) || 1
      points[`_l${k}`] = { x: P[i].x + (dx / L) * 13, y: P[i].y + (dy / L) * 13, hidden: true, label: '' }
      circles.push({ c: `_l${k}`, r: 11, color: INK })
      if (w) notes.push({ x: P[i].x + (dx / L) * 36, y: P[i].y + (dy / L) * 34 + 4, text: w })
      return
    }
    const a = P[i], b = P[j], L = Math.hypot(b.x - a.x, b.y - a.y), ux = (b.x - a.x) / L, uy = (b.y - a.y) / L
    const both = directed && edges.some(([p, q]) => p === j && q === i)
    const off = both ? 5 : 0, nx = -uy * off, ny = ux * off
    if (directed) {
      points[`_a${k}`] = { x: a.x + ux * 10 + nx, y: a.y + uy * 10 + ny, hidden: true, label: '' }
      points[`_b${k}`] = { x: b.x - ux * 12 + nx, y: b.y - uy * 12 + ny, hidden: true, label: '' }
      segments.push({ a: `_a${k}`, b: `_b${k}`, head: true, color: INK })
    } else segments.push({ a: LETTERS[i], b: LETTERS[j] })
    if (w) notes.push({ x: (a.x + b.x) / 2 - uy * (off + 11), y: (a.y + b.y) / 2 + ux * (off + 11) + 4, text: w })
  })
  return { w: W, h: H, points, segments, circles, notes, caption: caption ?? (directed ? 'Graphe orienté.' : 'Graphe non orienté.') }
}
/** Matrice d’adjacence. */
function adjacency(n: number, edges: [number, number][], directed: boolean): M {
  const A = Array.from({ length: n }, () => new Array(n).fill(0))
  for (const [i, j] of edges) { A[i][j] += 1; if (!directed && i !== j) A[j][i] += 1 }
  return A
}
/** Graphe aléatoire simple (sans boucle ni arête multiple), au moins `min` arêtes. */
function randGraph(n: number, directed: boolean, p = 0.5, min = n): [number, number][] {
  return retry(() => {
    const e: [number, number][] = []
    for (let i = 0; i < n; i++) for (let j = directed ? 0 : i + 1; j < n; j++) if (i !== j && Math.random() < p) e.push([i, j])
    const isolated = !directed && Array.from({ length: n }, (_, k) => k).some((k) => !e.some(([i, j]) => i === k || j === k))
    return e.length >= min && !isolated ? e : null
  })
}
const V = (i: number) => LETTERS[i]

/** Graphe probabiliste à deux états A et B : p = P(A → B), q = P(B → A). */
function markovFig(p: number, q: number, names: [string, string] = ['A', 'B']): Figure {
  const A = { x: 100, y: 112 }, B = { x: 220, y: 112 }
  const arc = (from: { x: number }, to: { x: number }, up: number): [number, number][] =>
    Array.from({ length: 17 }, (_, t) => { const s = t / 16; return [from.x + (to.x - from.x) * s, A.y - up * 34 * Math.sin(Math.PI * s)] as [number, number] })
  const top = arc(A, B, 1).slice(1, -1), bot = arc(B, A, -1).slice(1, -1)
  const points: Figure['points'] = {
    [names[0]]: { x: A.x, y: A.y, pos: 'nw' }, [names[1]]: { x: B.x, y: B.y, pos: 'ne' },
    _t1: { x: top[top.length - 2][0], y: top[top.length - 2][1], hidden: true, label: '' }, _t2: { x: top[top.length - 1][0], y: top[top.length - 1][1], hidden: true, label: '' },
    _b1: { x: bot[bot.length - 2][0], y: bot[bot.length - 2][1], hidden: true, label: '' }, _b2: { x: bot[bot.length - 1][0], y: bot[bot.length - 1][1], hidden: true, label: '' },
    _la: { x: A.x - 24, y: A.y, hidden: true, label: '' }, _lb: { x: B.x + 24, y: B.y, hidden: true, label: '' },
  }
  return {
    points,
    curves: [{ pts: top, color: INK, width: 1.8 }, { pts: bot, color: INK, width: 1.8 }],
    segments: [{ a: '_t1', b: '_t2', head: true }, { a: '_b1', b: '_b2', head: true }],
    circles: [{ c: '_la', r: 15, color: INK }, { c: '_lb', r: 15, color: INK }],
    notes: [
      { x: 160, y: A.y - 40, text: fmt(p) }, { x: 160, y: A.y + 50, text: fmt(q) },
      { x: A.x - 62, y: A.y + 5, text: fmt(r2(1 - p)) }, { x: B.x + 62, y: B.y + 5, text: fmt(r2(1 - q)) },
    ],
    caption: 'Graphe probabiliste à deux états.',
  }
}
/** Matrice en ligne, coefficients numériques ou littéraux : [2 −1 ; 0 m]. */
const mAny = (A: (number | string)[][]) => `[${A.map((r) => r.map((v) => (typeof v === 'number' ? num(v) : v)).join(' ')).join(' ; ')}]`
/** Ajoute les matrices à l’énoncé (écriture en ligne après « ci-dessous ») et en figure. */
function mats(ex: Exercise, list: { name: string; m: (number | string)[][] }[]): Exercise {
  const inline = list.map((L) => `${L.name} = ${mAny(L.m)}`).join(' et ')
  const prompt = ex.prompt.includes('ci-dessous') ? ex.prompt.replace('ci-dessous', `ci-dessous (${inline})`) : `${ex.prompt} (${inline})`
  return { ...ex, prompt, figure: matFig(list) }
}
const tenth = () => randInt(1, 9) / 10
const pairTxt = (a: number, b: number) => `(${num(a)} ; ${num(b)})`
/** Réponse couple avec écriture exacte (fractions éventuelles). */
const pairExact = (prompt: string, x: number, y: number, explanation: string) => ({ ...pair(prompt, x, y, { explanation }), answer: pairTxt(x, y) })
const NAMES: [string, string][] = [['A', 'B'], ['M', 'N'], ['P', 'Q'], ['A', 'C']]

// ════════════════════════════════════════════════════════════════════════
// Palier 1 — rappels guidés
// ════════════════════════════════════════════════════════════════════════

const OPS: [number, number][] = [[1, 1], [1, -1], [-1, 1], [2, 1], [1, 2], [3, -1], [2, -1], [1, -3], [2, 0], [-1, 0], [3, 0]]
const lcName = (a: number, b: number, n: [string, string]) => poly([a, n[0]], [b, n[1]])
const sumMat = variants(
  ...[2, 2, 3].map((sz, idx) => () => {
    const [a, b] = idx === 2 ? pick(OPS.slice(0, 4)) : pick(OPS), nm = pick(NAMES), A = rm(sz, sz, idx === 2 ? 4 : 6), B = rm(sz, sz, idx === 2 ? 4 : 6)
    const R = madd(mscale(a, A), mscale(b, B))
    return mats(matAnswer(`On donne les matrices ${nm[0]} et ${nm[1]} ci-dessous. Calcule ${lcName(a, b, nm)}.`, R,
      `On calcule coefficient par coefficient : par exemple en ${pos(0, 0)}, ${b === 0 ? `${fmt(a)} × ${par(A[0][0])}` : `${fmt(a)} × ${par(A[0][0])} + ${par(b)} × ${par(B[0][0])}`} = ${fmt(R[0][0])}. Résultat ${mTxt(R)}.`),
    b === 0 ? [{ name: nm[0], m: A }] : [{ name: nm[0], m: A }, { name: nm[1], m: B }])
  }),
  () => {
    const A = rm(2, 2), k = pick([-3, -2, 2, 3, 4]), R = madd(mscale(k, A), ident(2))
    return mats(matAnswer(`On donne la matrice A ci-dessous et la matrice identité I₂. Calcule ${fmt(k)}A + I₂.`, R,
      `On multiplie chaque coefficient par ${fmt(k)}, puis on ajoute 1 sur la diagonale : ${mTxt(R)}.`), [{ name: 'A', m: A }])
  },
)

const coefProd = fresh(variants(
  ...['AB', 'BA', 'A²'].map((what) => () => {
    const A = rm(2, 2), B = rm(2, 2), i = randInt(0, 1), j = randInt(0, 1)
    const [X, Y] = what === 'AB' ? [A, B] : what === 'BA' ? [B, A] : [A, A]
    const R = mmul(X, Y)
    return mats(numeric(`Avec les matrices A et B ci-dessous, quel est le coefficient ${pos(i, j)} de ${what} ?`, R[i][j], {
      explanation: `On multiplie la ligne ${i + 1} de ${what[0]} par la colonne ${j + 1} de ${what === 'A²' ? 'A' : what[1]} : ${rowCol(X, Y, i, j)} = ${fmt(R[i][j])}.`,
    }), [{ name: 'A', m: A }, { name: 'B', m: B }])
  }),
  () => {
    const A = rm(3, 3, 3), B = rm(3, 3, 3), i = randInt(0, 2), j = randInt(0, 2), R = mmul(A, B)
    return mats(numeric(`Avec les matrices 3 × 3 A et B ci-dessous, quel est le coefficient ${pos(i, j)} de AB ?`, R[i][j], {
      explanation: `Ligne ${i + 1} de A × colonne ${j + 1} de B : ${rowCol(A, B, i, j)} = ${fmt(R[i][j])}.`,
    }), [{ name: 'A', m: A }, { name: 'B', m: B }])
  },
))

const graphRead = fresh(variants(
  () => {
    const n = randInt(4, 6), e = randGraph(n, false, 0.5, n), k = randInt(0, n - 1), d = e.filter(([i, j]) => i === k || j === k).length
    return withMeta(numeric(`Quel est le degré du sommet ${V(k)} dans le graphe ci-dessous ?`, d, {
      explanation: `Le degré est le nombre d’arêtes issues du sommet : ${V(k)} est relié à ${e.filter(([i, j]) => i === k || j === k).map(([i, j]) => V(i === k ? j : i)).join(', ') || 'aucun sommet'}, donc degré ${d}.`,
    }), { figure: graphFig(n, e, false) })
  },
  () => {
    const n = randInt(4, 6), e = randGraph(n, false, 0.5, n)
    return withMeta(numeric(`Combien d’arêtes possède le graphe ci-dessous (d’ordre ${n}) ?`, e.length, {
      explanation: `On compte les arêtes : ${e.map(([i, j]) => V(i) + V(j)).join(', ')}, soit ${e.length} (la somme des degrés vaut ${2 * e.length} = 2 × ${e.length}).`,
    }), { figure: graphFig(n, e, false) })
  },
  () => {
    const n = randInt(4, 6), e = randGraph(n, false, 0.55, n)
    return withMeta(numeric(`Quelle est la somme des degrés des sommets du graphe ci-dessous ?`.replace('ci-dessous', pick(['ci-dessous', 'représenté ci-dessous', 'de la figure'])), 2 * e.length, {
      explanation: `Chaque arête compte pour 2 dans la somme des degrés : ${e.length} arêtes, somme ${2 * e.length}.`,
    }), { figure: graphFig(n, e, false) })
  },
  () => {
    const n = randInt(4, 6), e = randGraph(n, true, 0.35, n), k = randInt(0, n - 1), d = e.filter(([i]) => i === k).length
    return withMeta(numeric(`Dans le graphe orienté ci-dessous, combien d’arcs partent du sommet ${V(k)} (degré sortant) ?`, d, {
      explanation: `Arcs issus de ${V(k)} : ${e.filter(([i]) => i === k).map(([, j]) => `${V(k)} → ${V(j)}`).join(', ') || 'aucun'} ; degré sortant ${d}.`,
    }), { figure: graphFig(n, e, true) })
  },
))

const matVec = variants(
  () => {
    const A = rm(2, 2), X = rm(2, 1), R = mmul(A, X)
    return mats(matAnswer(`On donne la matrice A et le vecteur colonne X ci-dessous. Calcule le produit AX (donne ses deux coefficients de haut en bas).`, R,
      `Ligne 1 : ${rowCol(A, X, 0, 0)} = ${fmt(R[0][0])} ; ligne 2 : ${rowCol(A, X, 1, 0)} = ${fmt(R[1][0])}.`), [{ name: 'A', m: A }, { name: 'X', m: X }])
  },
  () => {
    const A = rm(3, 3, 3), X = rm(3, 1, 3), R = mmul(A, X)
    return mats(matAnswer(`Calcule le produit AX, avec la matrice A (3 × 3) et le vecteur colonne X ci-dessous (coefficients de haut en bas).`, R,
      `Chaque ligne de A multipliée par X : ${R.map((r, i) => `${rowCol(A, X, i, 0)} = ${fmt(r[0])}`).join(' ; ')}.`), [{ name: 'A', m: A }, { name: 'X', m: X }])
  },
  () => {
    const A = rm(2, 2), X = rm(2, 1), R = mmul(A, X)
    const sys = `${poly([A[0][0], 'x'], [A[0][1], 'y'])} = b₁ et ${poly([A[1][0], 'x'], [A[1][1], 'y'])} = b₂`
    return matAnswer(`Le système ${sys} s’écrit AX = B. Pour x = ${fmt(X[0][0])} et y = ${fmt(X[1][0])}, calcule B (coefficients b₁ puis b₂).`, R,
      `b₁ = ${rowCol(A, X, 0, 0)} = ${fmt(R[0][0])} et b₂ = ${rowCol(A, X, 1, 0)} = ${fmt(R[1][0])}.`)
  },
)

// ════════════════════════════════════════════════════════════════════════
// Palier 2
// ════════════════════════════════════════════════════════════════════════

const prodMat = variants(
  ...['AB', 'BA', 'A²'].map((what) => () => {
    const A = rm(2, 2, 4), B = rm(2, 2, 4)
    const [X, Y] = what === 'AB' ? [A, B] : what === 'BA' ? [B, A] : [A, A], R = mmul(X, Y)
    return mats(matAnswer(`Calcule ${what} avec les matrices A et B ci-dessous.`, R,
      `Coefficient (i ; j) = ligne i de ${what[0]} × colonne j de ${what === 'A²' ? 'A' : what[1]}. Par exemple ${pos(0, 0)} : ${rowCol(X, Y, 0, 0)} = ${fmt(R[0][0])}. Résultat ${mTxt(R)}.`),
    what === 'A²' ? [{ name: 'A', m: A }] : [{ name: 'A', m: A }, { name: 'B', m: B }])
  }),
  () => {
    const A = rm(2, 3, 3), B = rm(3, 2, 3), R = mmul(A, B)
    return mats(matAnswer(`Les matrices A (taille 2 × 3) et B (taille 3 × 2) sont données ci-dessous. Calcule la matrice AB (de taille 2 × 2).`, R,
      `Ligne i de A × colonne j de B, par exemple ${pos(0, 0)} : ${rowCol(A, B, 0, 0)} = ${fmt(R[0][0])}. Résultat ${mTxt(R)}.`), [{ name: 'A', m: A }, { name: 'B', m: B }])
  },
)

const determinant = variants(
  fresh(() => {
    const A = rm(2, 2, 7)
    return mats(numeric(`Calcule le déterminant de la matrice ${pick(['A', 'M', 'P'])} ci-dessous.`, det2(A), {
      explanation: `det = ad − bc = ${fmt(A[0][0])} × ${par(A[1][1])} − ${par(A[0][1])} × ${par(A[1][0])} = ${fmt(det2(A))}.`,
    }), [{ name: 'A', m: A }])
  }),
  fresh(() => {
    const [a, b, c] = retry(() => {
      const a = randNonZero(-6, 6), b = randNonZero(-6, 6), c = randNonZero(-6, 6)
      return (b * c) % a === 0 && Math.abs((b * c) / a) <= 15 ? [a, b, c] : null
    })
    return mats(numeric(`Pour quelle valeur de m la matrice ci-dessous n’est-elle pas inversible ?`, (b * c) / a, {
      explanation: `Non inversible ⇔ déterminant nul : ${fmt(a)}m − ${par(b)} × ${par(c)} = 0 ⇔ m = ${F(fmt(b * c), par(a))} = ${fmt((b * c) / a)}.`,
    }), [{ name: 'A', m: [[fmt(a), fmt(b)], [fmt(c), 'm']] }])
  }),
  () => {
    const yes = Math.random() < 0.5
    const A = retry(() => { const A = rm(2, 2, 6); return (det2(A) !== 0) === yes ? A : null })
    return mats(choice(`La matrice ci-dessous est-elle inversible ?`, yes ? 'Oui' : 'Non', [yes ? 'Non' : 'Oui'],
      `det = ${fmt(A[0][0])} × ${par(A[1][1])} − ${par(A[0][1])} × ${par(A[1][0])} = ${fmt(det2(A))}${yes ? ' ≠ 0 : elle est inversible.' : ' : déterminant nul, elle n’est pas inversible.'}`), [{ name: 'A', m: A }])
  },
)

const adjMat = variants(
  () => {
    const n = 3 + randInt(0, 1), e = randGraph(n, false, 0.55, n - 1), A = adjacency(n, e, false)
    return withMeta(matAnswer(`Donne la matrice d’adjacence du graphe ci-dessous (sommets rangés dans l’ordre alphabétique), ligne par ligne.`, A,
      `Le coefficient (i ; j) vaut 1 si les sommets i et j sont reliés, 0 sinon (matrice symétrique) : ${mTxt(A)}.`), { figure: graphFig(n, e, false) })
  },
  () => {
    const n = 3 + randInt(0, 1), e = randGraph(n, true, 0.4, n), A = adjacency(n, e, true)
    return withMeta(matAnswer(`Donne la matrice d’adjacence du graphe orienté ci-dessous (ordre alphabétique ; coefficient (i ; j) = nombre d’arcs de i vers j).`, A,
      `Ligne i : les arcs qui partent du sommet i. ${mTxt(A)}.`), { figure: graphFig(n, e, true) })
  },
  fresh(() => {
    const n = randInt(4, 5), e = randGraph(n, true, 0.4, n), A = adjacency(n, e, true), i = randInt(0, n - 1), j = retry(() => { const j = randInt(0, n - 1); return j !== i ? j : null })
    return withMeta(numeric(`Dans la matrice d’adjacence M du graphe orienté ci-dessous (ordre alphabétique), que vaut le coefficient ${pos(i, j)} ?`, A[i][j], {
      explanation: `Il vaut 1 s’il existe un arc ${V(i)} → ${V(j)}, 0 sinon : ici ${A[i][j] ? 'l’arc existe' : 'il n’y a pas d’arc'}, coefficient ${A[i][j]}.`,
    }), { figure: graphFig(n, e, true) })
  }),
  fresh(() => {
    const n = randInt(4, 5), e = randGraph(n, false, 0.5, n), A = adjacency(n, e, false), i = randInt(0, n - 1)
    return withMeta(numeric(`On note M la matrice d’adjacence du graphe ci-dessous (ordre alphabétique). Quelle est la somme des coefficients de la ligne ${i + 1} de M ?`, A[i].reduce((s, v) => s + v, 0), {
      explanation: `La ligne ${i + 1} correspond au sommet ${V(i)} ; la somme de ses coefficients est son degré : ${A[i].reduce((s, v) => s + v, 0)}.`,
    }), { figure: graphFig(n, e, false) })
  }),
)

const systemMat = variants(
  fresh(() => {
    const A = retry(() => { const A = rm(2, 2, 6); return A.every((r) => r.some((v) => v !== 0)) ? A : null })
    return numeric(`On écrit le système ${poly([A[0][0], 'x'], [A[0][1], 'y'])} = ${fmt(randInt(-9, 9))} et ${poly([A[1][0], 'x'], [A[1][1], 'y'])} = ${fmt(randInt(-9, 9))} sous la forme AX = B. Calcule det(A).`, det2(A), {
      explanation: `A a pour lignes (${fmt(A[0][0])} ; ${fmt(A[0][1])}) et (${fmt(A[1][0])} ; ${fmt(A[1][1])}) : det(A) = ${fmt(A[0][0])} × ${par(A[1][1])} − ${par(A[0][1])} × ${par(A[1][0])} = ${fmt(det2(A))}.`,
    })
  }),
  () => {
    const yes = Math.random() < 0.6
    const A = retry(() => { const A = rm(2, 2, 6); return (det2(A) !== 0) === yes && A.flat().filter((v) => v !== 0).length >= 3 && A.every((r) => r.some((v) => v !== 0)) ? A : null })
    return choice(`Le système ${poly([A[0][0], 'x'], [A[0][1], 'y'])} = ${randInt(1, 9)} et ${poly([A[1][0], 'x'], [A[1][1], 'y'])} = ${randInt(-9, -1)} a-t-il une unique solution ?`.replace(/= -(\d)/, '= −$1'), yes ? 'Oui' : 'Non, pas une unique solution', [yes ? 'Non, pas une unique solution' : 'Oui'],
      `Il s’écrit AX = B ; det(A) = ${fmt(A[0][0])} × ${par(A[1][1])} − ${par(A[0][1])} × ${par(A[1][0])} = ${fmt(det2(A))}${yes ? ' ≠ 0 : A est inversible, X = A⁻¹B est l’unique solution.' : ' : A n’est pas inversible, le système n’a pas une unique solution (aucune ou une infinité).'}`)
  },
  () => {
    const A = rm(3, 3, 3), X = rm(3, 1, 3), B = mmul(A, X)
    return mats(triplet(`On étudie le système AX = B, avec la matrice A ci-dessous et X = (x ; y ; z). Quel second membre B obtient-on pour X = (${X.map((r) => fmt(r[0])).join(' ; ')}) ?`, B.map((r) => r[0]) as V3, {
      explanation: `On calcule chaque ligne : ${B.map((r, i) => `${rowCol(A, X, i, 0)} = ${fmt(r[0])}`).join(' ; ')}.`,
    }), [{ name: 'A', m: A }])
  },
)

// ════════════════════════════════════════════════════════════════════════
// Palier 3 — exercices standard
// ════════════════════════════════════════════════════════════════════════

function invertible(dets: number[]): M {
  return retry(() => { const A = rm(2, 2, 6); return dets.includes(det2(A)) ? A : null })
}
const inverse = variants(
  () => {
    const A = invertible([1, -1]), I = inv2(A)
    return mats(matAnswer(`Calcule l’inverse de la matrice A ci-dessous.`, I,
      `det(A) = ${fmt(det2(A))}. A⁻¹ = ${F(1, 'det(A)')} × (d −b ; −c a) = ${mTxt(I)} (on vérifie AA⁻¹ = I₂).`), [{ name: 'A', m: A }])
  },
  () => {
    const A = invertible([2, -2, 3, 4, 5, -3]), I = inv2(A)
    return mats(matAnswer(`Calcule l’inverse de la matrice M ci-dessous (fractions acceptées).`, I,
      `det(M) = ${fmt(det2(A))}. M⁻¹ = ${F(1, par(det2(A)))} × ${mTxt([[A[1][1], -A[0][1]], [-A[1][0], A[0][0]]])} = ${mTxt(I)}.`), [{ name: 'M', m: A }])
  },
  fresh(() => {
    const A = invertible([1, -1, 2, -2]), I = inv2(A), i = randInt(0, 1), j = randInt(0, 1)
    return mats(numeric(`Quel est le coefficient ${pos(i, j)} de l’inverse de la matrice A ci-dessous ?`, I[i][j], {
      explanation: `A⁻¹ = ${F(1, par(det2(A)))} × ${mTxt([[A[1][1], -A[0][1]], [-A[1][0], A[0][0]]])} = ${mTxt(I)} : coefficient ${num(I[i][j])}.`,
    }), [{ name: 'A', m: A }])
  }),
)

const solveSys = variants(
  () => {
    const A = invertible([1, -1, 2, -2, 3, 5]), x = randInt(-6, 6), y = randInt(-6, 6), B = mmul(A, [[x], [y]])
    return pair(`Résous le système ${poly([A[0][0], 'x'], [A[0][1], 'y'])} = ${fmt(B[0][0])} et ${poly([A[1][0], 'x'], [A[1][1], 'y'])} = ${fmt(B[1][0])} (réponse (x ; y)).`, x, y, {
      explanation: `Sous forme matricielle AX = B avec det(A) = ${fmt(det2(A))} ≠ 0 : X = A⁻¹B, A⁻¹ = ${mTxt(inv2(A))}, d’où x = ${fmt(x)} et y = ${fmt(y)}.`,
    })
  },
  () => {
    const A = invertible([1, -1]), x = randInt(-6, 6), y = randInt(-6, 6), B = mmul(A, [[x], [y]])
    return mats(pair(`On donne A et B ci-dessous. Résous l’équation matricielle AX = B, d’inconnue X = (x ; y) (réponse (x ; y)).`.replace('ci-dessous', pick(['ci-dessous', 'sur la figure'])), x, y, {
      explanation: `A⁻¹ = ${mTxt(inv2(A))} (det = ${fmt(det2(A))}), X = A⁻¹B : x = ${fmt(x)}, y = ${fmt(y)}.`,
    }), [{ name: 'A', m: A }, { name: 'B', m: B }])
  },
  () => {
    const m = pick([{ a: 'épées', b: 'boucliers' }, { a: 'pains', b: 'tonneaux' }, { a: 'billets adulte', b: 'billets enfant' }, { a: 'flèches', b: 'arcs' }])
    const pa = randInt(2, 15), pb = randInt(2, 15), A = retry(() => { const A = [[randInt(1, 5), randInt(1, 5)], [randInt(1, 5), randInt(1, 5)]]; return Math.abs(det2(A)) >= 1 ? A : null })
    const B = mmul(A, [[pa], [pb]])
    return pair(`${A[0][0]} ${m.a} et ${A[0][1]} ${m.b} coûtent ${B[0][0]} écus ; ${A[1][0]} ${m.a} et ${A[1][1]} ${m.b} coûtent ${B[1][0]} écus. Quel est le prix d’un objet de chaque sorte ? (réponse (prix des ${m.a} ; prix des ${m.b}))`, pa, pb, {
      explanation: `AX = B avec A de lignes (${A[0].join(' ; ')}) et (${A[1].join(' ; ')}), det = ${fmt(det2(A))} ≠ 0 : X = A⁻¹B donne ${pa} et ${pb} écus.`,
    })
  },
)

const paths2 = fresh(variants(
  () => {
    const n = 4, e = randGraph(n, true, 0.45, 5), A = adjacency(n, e, true), A2 = mmul(A, A), i = randInt(0, 3), j = randInt(0, 3)
    return withMeta(numeric(`Combien y a-t-il de chemins de longueur 2 allant de ${V(i)} à ${V(j)} dans le graphe orienté ci-dessous ?`, A2[i][j], {
      explanation: `C’est le coefficient ${pos(i, j)} de M², M étant la matrice d’adjacence ${mTxt(A)} : ligne ${i + 1} × colonne ${j + 1} = ${A2[i][j]} (chemins ${V(i)} → ? → ${V(j)} : ${[0, 1, 2, 3].filter((k) => A[i][k] && A[k][j]).map((k) => V(k)).join(', ') || 'aucun intermédiaire'}).`,
    }), { figure: graphFig(n, e, true) })
  },
  () => {
    const n = randInt(4, 5), e = randGraph(n, false, 0.5, n), A = adjacency(n, e, false), A2 = mmul(A, A), i = randInt(0, n - 1), j = retry(() => { const j = randInt(0, n - 1); return j !== i ? j : null })
    return withMeta(numeric(`Combien de chaînes de longueur 2 relient ${V(i)} à ${V(j)} dans le graphe ci-dessous ?`, A2[i][j], {
      explanation: `C’est le coefficient ${pos(i, j)} de M² : on compte les sommets reliés à la fois à ${V(i)} et à ${V(j)} : ${Array.from({ length: n }, (_, k) => k).filter((k) => A[i][k] && A[k][j]).map(V).join(', ') || 'aucun'}, soit ${A2[i][j]}.`,
    }), { figure: graphFig(n, e, false) })
  },
  () => {
    const A = Array.from({ length: 3 }, () => Array.from({ length: 3 }, () => randInt(0, 1))), A2 = mmul(A, A), i = randInt(0, 2), j = randInt(0, 2)
    const e: [number, number][] = []
    A.forEach((r, a) => r.forEach((v, b) => { if (v) e.push([a, b]) }))
    return mats(numeric(`Un graphe orienté (boucles possibles) a pour matrice d’adjacence M ci-dessous (sommets A, B, C). Combien de chemins de longueur 2 vont de ${V(i)} à ${V(j)} ?`, A2[i][j], {
      explanation: `Coefficient ${pos(i, j)} de M² : ${rowCol(A, A, i, j)} = ${A2[i][j]}.`,
    }), [{ name: 'M', m: A }])
  },
))

const markov1 = variants(
  () => {
    const p = tenth(), q = tenth(), a = tenth(), x = r2(a * (1 - p) + (1 - a) * q), y = r2(1 - x)
    return withMeta(pair(`Le graphe probabiliste ci-dessous a pour état initial π₀ = (${fmt(a)} ; ${fmt(r2(1 - a))}). Calcule l’état π₁ = π₀P (réponse (a ; b)).`, x, y, {
      explanation: `P = ${mTxt([[r2(1 - p), p], [q, r2(1 - q)]])}. π₁ = (${fmt(a)} × ${fmt(r2(1 - p))} + ${fmt(r2(1 - a))} × ${fmt(q)} ; ${fmt(a)} × ${fmt(p)} + ${fmt(r2(1 - a))} × ${fmt(r2(1 - q))}) = (${fmt(x)} ; ${fmt(y)}).`,
    }), { figure: markovFig(p, q) })
  },
  fresh(() => {
    const p = tenth(), q = tenth(), i = randInt(0, 1), j = randInt(0, 1), P = [[r2(1 - p), p], [q, r2(1 - q)]]
    return withMeta(numeric(`On note P la matrice de transition du graphe probabiliste ci-dessous (états A puis B). Que vaut le coefficient ${pos(i, j)} de P ?`, P[i][j], {
      explanation: `Le coefficient (i ; j) est la probabilité de passer de l’état i à l’état j : P = ${mTxt(P)}, donc ${fmt(P[i][j])} (chaque ligne a pour somme 1).`,
    }), { figure: markovFig(p, q) })
  }),
  fresh(() => {
    const p = tenth(), q = tenth(), a = randInt(1, 9) / 10, x = r2(a * (1 - p) + (1 - a) * q)
    const w = pick([
      { s: 'clients', A: 'de la boulangerie A', B: 'de la boulangerie B', toA: 'à la boulangerie A', toB: 'à la boulangerie B' },
      { s: 'joueurs', A: 'du serveur A', B: 'du serveur B', toA: 'sur le serveur A', toB: 'sur le serveur B' },
      { s: 'voyageurs', A: 'de l’auberge A', B: 'de l’auberge B', toA: 'à l’auberge A', toB: 'à l’auberge B' },
    ])
    return numeric(`Chaque semaine, ${fmt(r2(p * 100))} % des ${w.s} ${w.A} passent ${w.toB} et ${fmt(r2(q * 100))} % de ceux ${w.B} passent ${w.toA} ; les autres restent fidèles. Cette semaine, ${fmt(r2(a * 100))} % des ${w.s} vont ${w.toA}. Quelle proportion (en %) ira ${w.toA} la semaine prochaine ?`, r2(x * 100), {
      explanation: `${fmt(a)} × ${fmt(r2(1 - p))} (restent) + ${fmt(r2(1 - a))} × ${fmt(q)} (arrivent) = ${fmt(x)}, soit ${fmt(r2(x * 100))} %.`,
    })
  }),
)

// ════════════════════════════════════════════════════════════════════════
// Palier 4
// ════════════════════════════════════════════════════════════════════════

const stable = variants(
  () => {
    const p = tenth(), q = tenth()
    return withMeta(pairExact(`Détermine l’état stable π = (x ; y) du graphe probabiliste ci-dessous (x + y = 1).`, q / (p + q), p / (p + q),
      `π = πP donne x = ${fmt(r2(1 - p))}x + ${fmt(q)}y, soit ${fmt(p)}x = ${fmt(q)}y ; avec x + y = 1 : x = ${r2(p + q) === 1 ? '' : `${F(fmt(q), fmt(r2(p + q)))} = `}${num(q / (p + q))} et y = ${num(p / (p + q))}.`), { figure: markovFig(p, q) })
  },
  fresh(() => {
    const [p, q] = retry(() => { const p = tenth(), q = tenth(); return Number.isInteger(r2((q / (p + q)) * 100)) ? [p, q] : null })
    const ctx = pick([['abonnés', 'la formule A', 'la formule B'], ['habitants', 'le quartier A', 'le quartier B'], ['soldats', 'la garnison A', 'la garnison B']])
    return numeric(`Chaque année, ${fmt(p * 100)} % des ${ctx[0]} de ${ctx[1]} passent dans ${ctx[2]}, et ${fmt(q * 100)} % de ceux de ${ctx[2]} passent dans ${ctx[1]}. À long terme, quel pourcentage des ${ctx[0]} sera dans ${ctx[1]} ?`, r2((q / (p + q)) * 100), {
      explanation: `L’état stable (x ; 1 − x) vérifie ${fmt(p)}x = ${fmt(q)}(1 − x), soit x = ${r2(p + q) === 1 ? '' : `${F(fmt(q), fmt(r2(p + q)))} = `}${num(q / (p + q))}, donc ${fmt(r2((q / (p + q)) * 100))} %.`,
    })
  }),
  fresh(() => {
    const p = tenth(), q = tenth()
    return withMeta(pairExact(`Le graphe probabiliste ci-dessous a pour matrice P. Trouve la loi π = (x ; y), avec x + y = 1, telle que πP = π.`.replace('ci-dessous', pick(['ci-dessous', 'de la figure'])), q / (p + q), p / (p + q),
      `πP = π ⇔ ${fmt(p)}x = ${fmt(q)}y ; avec y = 1 − x : x = ${r2(p + q) === 1 ? '' : `${F(fmt(q), fmt(r2(p + q)))} = `}${num(q / (p + q))}, y = ${num(p / (p + q))}.`), { figure: markovFig(p, q) })
  }),
)

const paths3 = fresh(variants(
  () => {
    const n = 3, e = randGraph(n, true, 0.6, 4), A = adjacency(n, e, true), A3 = mpow(A, 3), i = randInt(0, 2), j = randInt(0, 2)
    return withMeta(numeric(`Combien de chemins de longueur 3 vont de ${V(i)} à ${V(j)} dans le graphe orienté ci-dessous ?`, A3[i][j], {
      explanation: `C’est le coefficient ${pos(i, j)} de M³ ; M = ${mTxt(A)}, M² = ${mTxt(mmul(A, A))}, M³ = ${mTxt(A3)} : ${A3[i][j]}.`,
    }), { figure: graphFig(n, e, true) })
  },
  () => {
    const n = 4, e = randGraph(n, false, 0.5, 4), A = adjacency(n, e, false), A3 = mpow(A, 3), i = randInt(0, 3), j = randInt(0, 3)
    return withMeta(numeric(`Combien de chaînes de longueur 3 relient ${V(i)} à ${V(j)} dans le graphe ci-dessous ?`, A3[i][j], {
      explanation: `Coefficient ${pos(i, j)} de M³, où M = ${mTxt(A)} : M² = ${mTxt(mmul(A, A))} et M³ = ${mTxt(A3)}, d’où ${A3[i][j]}.`,
    }), { figure: graphFig(n, e, false) })
  },
  () => {
    const A = [[randInt(0, 1), 1, randInt(0, 1)], [randInt(0, 1), 0, 1], [1, randInt(0, 1), 0]], A3 = mpow(A, 3), i = randInt(0, 2)
    return mats(numeric(`La matrice d’adjacence d’un graphe orienté est M ci-dessous. Combien de chemins fermés de longueur 3 partent de ${V(i)} et y reviennent ?`, A3[i][i], {
      explanation: `Coefficient ${pos(i, i)} de M³ = ${mTxt(A3)} : ${A3[i][i]}.`,
    }), [{ name: 'M', m: A }])
  },
))

const powPattern = fresh(variants(
  () => {
    const a = randNonZero(-5, 5), n = randInt(5, 30)
    return mats(numeric(`On considère la matrice A ci-dessous. Quel est le coefficient ligne 1, colonne 2 de A^{${n}} ?`, n * a, {
      explanation: `A² = ${mTxt([[1, 2 * a], [0, 1]])}, A³ = ${mTxt([[1, 3 * a], [0, 1]])} : par récurrence Aⁿ a pour coefficient ${pos(0, 1)} n × ${par(a)}. Pour n = ${n} : ${fmt(n * a)}.`,
    }), [{ name: 'A', m: [[1, a], [0, 1]] }])
  },
  () => {
    const a = pick([2, 3, -2, -1]), b = pick([2, -1, 3]), n = randInt(3, 8), i = randInt(0, 1)
    return mats(numeric(`D est la matrice diagonale ci-dessous. Quel est le coefficient ${pos(i, i)} de D^{${n}} ?`, (i ? b : a) ** n, {
      explanation: `Une matrice diagonale se met à la puissance coefficient par coefficient : ${par(i ? b : a)}^{${n}} = ${fmt((i ? b : a) ** n)}.`,
    }), [{ name: 'D', m: [[a, 0], [0, b]] }])
  },
  () => {
    const n = randInt(5, 40), k = pick([1, 2, 3]), i = randInt(0, 1), j = randInt(0, 1)
    const J = [[0, k], [k, 0]], R = mpow(J, n % 2 === 0 ? 2 : 1).map((r) => r.map((v) => v * (k ** (n - (n % 2 === 0 ? 2 : 1)))))
    return mats(numeric(`On considère la matrice J ci-dessous. Quel est le coefficient ${pos(i, j)} de J^{${n}} ?`, R[i][j], {
      explanation: `J² = ${k * k === 1 ? 'I₂' : `${k * k}I₂`}, donc J^{${n}} = ${n % 2 === 0 ? `(J²)^{${n / 2}} = ${k ** n === 1 ? 'I₂' : `${k ** n}I₂`}` : `(J²)^{${(n - 1) / 2}} J = ${k ** (n - 1) === 1 ? '' : k ** (n - 1)}J`} : coefficient ${fmt(R[i][j])}.`,
    }), [{ name: 'J', m: J }])
  },
))

const cayley = fresh(variants(
  () => {
    const A = rm(2, 2, 4), t = A[0][0] + A[1][1], d = det2(A)
    return mats(numeric(`Pour la matrice A ci-dessous, on admet qu’il existe des réels α et β tels que A² = αA + βI₂. Que vaut α ?`, t, {
      explanation: `On calcule A² = ${mTxt(mmul(A, A))} et on identifie (ou on utilise A² = (a + d)A − (ad − bc)I₂) : α = a + d = ${fmt(t)} (et β = ${fmt(-d)}).`,
    }), [{ name: 'A', m: A }])
  },
  () => {
    const A = rm(2, 2, 4), t = A[0][0] + A[1][1], d = det2(A)
    return mats(numeric(`Pour la matrice A ci-dessous, on a A² = αA + βI₂ avec α = ${fmt(t)}. Que vaut β ?`, -d, {
      explanation: `Coefficient ${pos(0, 1)} ou diagonale : A² = ${mTxt(mmul(A, A))} et αA = ${mTxt(mscale(t, A))} ; la différence vaut ${fmt(-d)}I₂ : β = −det(A) = ${fmt(-d)}.`,
    }), [{ name: 'A', m: A }])
  },
  () => {
    const [a, b] = retry(() => { const a = randInt(-4, 4), b = randInt(-4, 4); return a !== b ? [a, b] : null })
    const s = a + b, p = a * b, x = randInt(-3, 3)
    const A = [[a, x], [0, b]]
    return mats(numeric(`La matrice A ci-dessous vérifie ${poly([1, 'A²'], [-s, 'A'], [p, 'I₂'])} = 0. Que vaut le coefficient ${pos(0, 1)} de A² ?`, (a + b) * x, {
      explanation: `A² = ${poly([s, 'A'], [-p, 'I₂'])} ; le coefficient ${pos(0, 1)} de I₂ est nul, donc celui de A² vaut ${fmt(s)} × ${par(x)} = ${fmt(s * x)} (on peut le vérifier en calculant A²).`,
    }), [{ name: 'A', m: A }])
  },
))

// ════════════════════════════════════════════════════════════════════════
// Palier 5 — exigeant
// ════════════════════════════════════════════════════════════════════════

const markov2 = variants(
  fresh(() => {
    const p = tenth(), q = tenth(), P = [[r2(1 - p), p], [q, r2(1 - q)]], a = pick([0, 1, 0.5]), pi0 = [[a, r2(1 - a)]], pi2 = mmul(mmul(pi0, P), P)
    return withMeta(numeric(`Le graphe probabiliste ci-dessous part de l’état initial π₀ = (${fmt(a)} ; ${fmt(r2(1 - a))}). Quelle est la probabilité d’être dans l’état A après deux étapes ?`, r2(pi2[0][0]), {
      explanation: `π₁ = π₀P = (${fmt(r2(mmul(pi0, P)[0][0]))} ; ${fmt(r2(mmul(pi0, P)[0][1]))}), puis π₂ = π₁P : ${fmt(r2(pi2[0][0]))} pour A.`,
    }), { figure: markovFig(p, q) })
  }),
  fresh(() => {
    const p = tenth(), q = tenth(), P = [[r2(1 - p), p], [q, r2(1 - q)]], P2 = mmul(P, P), i = randInt(0, 1), j = randInt(0, 1)
    return withMeta(numeric(`P est la matrice de transition du graphe probabiliste ci-dessous. Quel est le coefficient ${pos(i, j)} de P² ?`, r2(P2[i][j]), {
      explanation: `P = ${mTxt(P)} ; coefficient ${pos(i, j)} de P² : ${rowCol(P, P, i, j)} = ${fmt(r2(P2[i][j]))} (probabilité d’aller de ${V(i)} à ${V(j)} en deux étapes).`,
    }), { figure: markovFig(p, q) })
  }),
  fresh(() => {
    const p = tenth(), q = tenth(), ctx = pick(['Un randonneur', 'Un chevalier errant', 'Un marchand ambulant'])
    const P = [[r2(1 - p), p], [q, r2(1 - q)]], P2 = mmul(P, P)
    return numeric(`${ctx} passe chaque nuit soit au village A, soit au village B. S’il est en A, il part en B le lendemain avec la probabilité ${fmt(p)} ; s’il est en B, il revient en A avec la probabilité ${fmt(q)}. Il dort en A ce soir. Quelle est la probabilité qu’il dorme en A dans deux nuits ?`, r2(P2[0][0]), {
      explanation: `Deux chemins : A → A → A (${fmt(r2(1 - p))} × ${fmt(r2(1 - p))}) et A → B → A (${fmt(p)} × ${fmt(q)}) : ${fmt(r2(P2[0][0]))}.`,
    })
  }),
)

const sys3 = variants(
  () => {
    const [A, Ai] = pick(INV3), X = rm(3, 1, 4), B = mmul(A, X)
    return mats(triplet(`On admet que la matrice A ci-dessous est inversible, d’inverse A⁻¹. Résous AX = B pour B = (${B.map((r) => fmt(r[0])).join(' ; ')}), X = (x ; y ; z).`, X.map((r) => r[0]) as V3, {
      explanation: `X = A⁻¹B : ${X.map((r, i) => `${rowCol(Ai, B, i, 0)} = ${fmt(r[0])}`).join(' ; ')}.`,
    }), [{ name: 'A', m: A }, { name: 'A⁻¹', m: Ai }])
  },
  fresh(() => {
    const [A, Ai] = pick(INV3), X = rm(3, 1, 4), B = mmul(A, X), i = randInt(0, 2)
    return mats(numeric(`A et son inverse A⁻¹ sont donnés ci-dessous. Le système AX = B, avec B = (${B.map((r) => fmt(r[0])).join(' ; ')}), a pour solution X = (x ; y ; z). Que vaut ${['x', 'y', 'z'][i]} ?`, X[i][0], {
      explanation: `${['x', 'y', 'z'][i]} est la ligne ${i + 1} de A⁻¹B : ${rowCol(Ai, B, i, 0)} = ${fmt(X[i][0])}.`,
    }), [{ name: 'A', m: A }, { name: 'A⁻¹', m: Ai }])
  }),
)
/** Matrices 3 × 3 entières d’inverse entier (déterminant ±1). */
const INV3: [M, M][] = [
  [[1, 1, 0], [0, 1, 1], [0, 0, 1]], [[2, 1, 0], [1, 1, 0], [0, 0, 1]], [[1, 0, 1], [1, 1, 1], [0, 1, 2]], [[1, 2, 0], [0, 1, 0], [1, 2, 1]], [[1, 0, 0], [2, 1, 0], [1, 1, 1]], [[3, 1, 1], [2, 1, 1], [0, 0, 1]],
].map((A) => [A, inv3(A)] as [M, M])
function inv3(A: M): M {
  const [[a, b, c], [d, e, f], [g, h, i]] = A
  const det = a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g)
  const C = [[e * i - f * h, -(b * i - c * h), b * f - c * e], [-(d * i - f * g), a * i - c * g, -(a * f - c * d)], [d * h - e * g, -(a * h - b * g), a * e - b * d]]
  return C.map((r) => r.map((v) => r2(v / det) + 0))
}

const paramDet = variants(
  () => {
    const [r1, r2v] = retry(() => { const a = randInt(-5, 5), b = randInt(-5, 5); return a !== b && a * b !== 0 ? [a, b] : null })
    // A = (m  x ; y  s − m) : det = −m² + sm − xy, nul pour m = r1 ou r2 si s = r1 + r2 et xy = r1 r2
    const s = r1 + r2v, p = r1 * r2v
    const [x, y] = retry(() => { const x = randNonZero(-6, 6); return p % x === 0 ? [x, p / x] : null })
    const disp = [['m', fmt(x)], [fmt(y), s === 0 ? '−m' : `${fmt(s)} − m`]]
    const ex = solutionSet(`Pour quelles valeurs du réel m la matrice A ci-dessous n’est-elle pas inversible ? (valeurs séparées par ;)`, [r1, r2v], {
      explanation: `det(A) = m(${s === 0 ? '−m' : `${fmt(s)} − m`}) − ${par(x)} × ${par(y)} = ${poly([-1, 'm²'], [s, 'm'], [-p, ''])} ; il s’annule pour m = ${fmt(Math.min(r1, r2v))} ou m = ${fmt(Math.max(r1, r2v))}.`,
    })
    return mats({ ...ex, answer: [...new Set([r1, r2v])].sort((u, v) => u - v).map(fmt).join(' ; ') }, [{ name: 'A', m: disp }])
  },
  fresh(() => {
    const [a, b, c, x] = retry(() => {
      const a = randNonZero(-4, 4), b = randNonZero(-4, 4), c = randInt(-4, 4), x = randNonZero(-5, 5)
      return a !== c ? [a, b, c, x] : null
    })
    // A = (a b ; 0 c), B = (x y ; 0 z) : AB = BA ⇔ a y + b z = x b + y c ⇔ y (a − c) = b (x − z)
    const z = x + (a - c) * randNonZero(-2, 2), y = (b * (x - z)) / (a - c)
    return mats(numeric(`On donne A et B ci-dessous. Pour quelle valeur de y les matrices A et B commutent-elles (AB = BA) ?`, y, {
      explanation: `AB et BA ont les mêmes coefficients diagonaux et le même coefficient ${pos(1, 0)} (nul) ; il reste ${pos(0, 1)} : ${fmt(a)}y + ${par(b)} × ${par(z)} = ${fmt(x)} × ${par(b)} + y × ${par(c)}, donc y = ${F(fmt(b * (x - z)), par(a - c))} = ${fmt(y)}.`,
    }), [{ name: 'A', m: [[a, b], [0, c]] }, { name: 'B', m: [[fmt(x), 'y'], ['0', fmt(z)]] }])
  }),
)

const coupled = variants(
  () => {
    const A = rm(2, 2, 3), U = rm(2, 1, 5), U2 = mmul(A, mmul(A, U)), names = pick([['u', 'v'], ['a', 'b'], ['x', 'y']])
    const [x, y] = names
    return pair(`Deux suites vérifient ${x}ₙ₊₁ = ${poly([A[0][0], `${x}ₙ`], [A[0][1], `${y}ₙ`])} et ${y}ₙ₊₁ = ${poly([A[1][0], `${x}ₙ`], [A[1][1], `${y}ₙ`])}, avec ${x}₀ = ${fmt(U[0][0])} et ${y}₀ = ${fmt(U[1][0])}. Calcule (${x}₂ ; ${y}₂).`, U2[0][0], U2[1][0], {
      explanation: `Uₙ₊₁ = AUₙ avec A = ${mTxt(A)} et U₀ = ${mTxt(U)} : U₁ = AU₀ = ${mTxt(mmul(A, U))}, puis U₂ = AU₁ = ${mTxt(U2)}.`,
    })
  },
  fresh(() => {
    const a = pick([0.8, 0.9, 0.7, 0.6]), b = pick([0.1, 0.2, 0.3]), c = pick([0.1, 0.2]), d = pick([0.9, 0.8, 0.7]), L = randInt(4, 12) * 50, R = randInt(2, 8) * 50
    const A = [[a, b], [c, d]], U1 = mmul(A, [[L], [R]])
    return mats(numeric(`Une forêt abrite ${L} lapins et ${R} renards. D’une année sur l’autre, (L ; R) devient A × (L ; R) avec la matrice A ci-dessous. Combien de lapins y aura-t-il l’an prochain ?`, r2(U1[0][0]), {
      explanation: `Lapins : ${fmt(a)} × ${L} + ${fmt(b)} × ${R} = ${fmt(r2(U1[0][0]))}.`,
    }), [{ name: 'A', m: A }])
  }),
)

// ════════════════════════════════════════════════════════════════════════
// Problèmes d’amélioration
// ════════════════════════════════════════════════════════════════════════

type MatList = { name: string; m: (number | string)[][] }[]
/** Problème titré ; une liste de matrices est écrite dans l’énoncé et dessinée en figure. */
/** Réponse 1/3 (fraction acceptée, ou décimal suffisamment précis). */
const fraction3 = (prompt: string, opts: { explanation: string }): Exercise => ({ ...numeric(prompt, 1 / 3, opts), answer: '1/3' })
const T = (title: string, ex: Exercise, figure?: Figure | MatList, caption?: string): Exercise => {
  if (Array.isArray(figure)) {
    const e = mats(ex, figure)
    return withMeta(e, { title, figure: { ...e.figure!, caption: caption ?? '' } })
  }
  return withMeta(ex, figure ? { title, figure } : { title })
}

const upgrades: Ladder = [
  [
    fresh(() => {
      const n = randInt(4, 12)
      return T('Le tournoi', numeric(`Lors d’un tournoi, chacun des ${n} chevaliers affronte une fois chacun des autres. Le graphe des duels est le graphe complet d’ordre ${n}. Combien a-t-il d’arêtes (de duels) ?`, (n * (n - 1)) / 2, {
        explanation: `Chaque sommet a pour degré ${n - 1} ; somme des degrés ${n} × ${n - 1} = ${n * (n - 1)} = 2 × nombre d’arêtes, donc ${(n * (n - 1)) / 2} duels.`,
      }))
    }),
    fresh(() => {
      const a = randNonZero(-4, 4), b = randNonZero(-4, 4)
      const n = randInt(3, 9)
      return T('La puissance sans calcul', numeric(`A est la matrice ci-dessous. En écrivant A = ${fmt(a)}I₂ + N, avec N² = 0, calcule le coefficient ${pos(0, 1)} de A^{${n}}.`, n * a ** (n - 1) * b, {
        explanation: `N = ${mTxt([[0, b], [0, 0]])} vérifie N² = 0 et commute avec I₂ : A^{${n}} = (${fmt(a)}I₂ + N)^{${n}} = ${par(a)}^{${n}}I₂ + ${n} × ${par(a)}^{${n - 1}}N (binôme). Coefficient : ${n} × ${par(a ** (n - 1))} × ${par(b)} = ${fmt(n * a ** (n - 1) * b)}.`,
      }), [{ name: 'A', m: [[a, b], [0, a]] }])
    }),
    fresh(() => {
      const n = randInt(4, 8), k = pick([2, 3]), i = 0, j = 1
      const A = Array.from({ length: n }, (_, r) => Array.from({ length: n }, (__, c) => (r === c ? 0 : 1))), Ak = mpow(A, k)
      return T('Les routes du royaume', numeric(`Dans un royaume, ${n} villes sont toutes reliées deux à deux par une route (graphe complet d’ordre ${n}). Combien de chaînes de longueur ${k} relient deux villes distinctes données ?`, Ak[i][j], {
        explanation: `C’est un coefficient hors diagonale de M^{${k}}, avec M = J − I (J : matrice remplie de 1, J² = ${n}J). ${k === 2 ? `M² = ${n - 2}J + I : hors diagonale ${n - 2} (une chaîne de longueur 2 passe par l’une des ${n - 2} autres villes).` : `M² = ${n - 2}J + I, puis M³ = M²M = ${(n - 1) * (n - 2) + 1}J − I : hors diagonale (${n} − 1)(${n} − 2) + 1 = ${Ak[i][j]}.`}`,
      }))
    }),
  ],
  [
    fresh(() => {
      const [p, q] = retry(() => { const p = tenth(), q = tenth(); return p + q !== 1 ? [p, q] : null })
      const lam = r2(1 - p - q)
      return T('Le régime permanent', numeric(`Pour le graphe probabiliste ci-dessous, on admet que la probabilité d’être en A à l’étape n, partant de A, vaut aₙ = ${F(fmt(q), fmt(r2(p + q)))} + ${F(fmt(p), fmt(r2(p + q)))} × (${fmt(lam)})^{n}. Vers quelle valeur tend aₙ ?`, r2(q / (p + q)), {
        explanation: `|${fmt(lam)}| < 1, donc (${fmt(lam)})^{n} → 0 : aₙ → ${F(fmt(q), fmt(r2(p + q)))} = ${num(q / (p + q))}, l’état stable (indépendant de l’état initial).`,
      }), markovFig(p, q))
    }),
    fresh(() => {
      const n = randInt(5, 14)
      const F2 = mpow([[1, 1], [1, 0]], n)
      return T('Les lapins de Fibonacci', numeric(`La suite de Fibonacci vérifie F₀ = 0, F₁ = 1 et Fₙ₊₂ = Fₙ₊₁ + Fₙ. Avec la matrice A ci-dessous, (Fₙ₊₁ ; Fₙ) = Aⁿ(1 ; 0). Que vaut le coefficient ligne 1, colonne 2 de A^{${n}} ?`, F2[0][1], {
        explanation: `Aⁿ = [Fₙ₊₁ Fₙ ; Fₙ Fₙ₋₁] (par récurrence) : le coefficient ${pos(0, 1)} de A^{${n}} est F${sub(n)} = ${F2[0][1]} (suite 0, 1, 1, 2, 3, 5, 8, 13, …).`,
      }), [{ name: 'A', m: [[1, 1], [1, 0]] }])
    }),
    () => {
      const [A, Ai] = pick(INV3), i = randInt(0, 2), j = randInt(0, 2)
      return T('L’inverse vérifié', numeric(`On donne A et une matrice B ci-dessous, et on admet que AB = I₃. Quel est le coefficient ${pos(i, j)} de la matrice BA ?`, i === j ? 1 : 0, {
        explanation: `Pour des matrices carrées, AB = I₃ entraîne BA = I₃ (B = A⁻¹). Le coefficient ${pos(i, j)} de I₃ vaut ${i === j ? 1 : 0}.`,
      }), [{ name: 'A', m: A }, { name: 'B', m: Ai }])
    },
  ],
  [
    fresh(() => {
      const [P, D] = pick([
        [[[1, 1], [1, 2]], [2, 1]], [[[1, 1], [0, 1]], [2, 3]], [[[1, 0], [1, 1]], [3, -1]], [[[2, 1], [1, 1]], [1, 2]], [[[1, 2], [1, 3]], [2, -1]],
      ] as [M, number[]][])
      const n = randInt(3, 6), Pi = inv2(P), An = mmul(mmul(P, [[D[0] ** n, 0], [0, D[1] ** n]]), Pi), i = randInt(0, 1), j = randInt(0, 1)
      const A = mmul(mmul(P, [[D[0], 0], [0, D[1]]]), Pi)
      return T('La diagonalisation', numeric(`On a A = PDP⁻¹ avec P, D et A ci-dessous. Calcule le coefficient ${pos(i, j)} de A^{${n}} (indication : Aⁿ = PDⁿP⁻¹).`, r2(An[i][j]), {
        explanation: `Dⁿ = ${mTxt([[D[0] ** n, 0], [0, D[1] ** n]])}, P⁻¹ = ${mTxt(Pi)}, donc A^{${n}} = PD^{${n}}P⁻¹ = ${mTxt(An.map((r) => r.map(r2)))} : ${fmt(r2(An[i][j]))}.`,
      }), [{ name: 'P', m: P }, { name: 'D', m: [[D[0], 0], [0, D[1]]] }, { name: 'A', m: A.map((r) => r.map(r2)) }])
    }),
    fresh(() => {
      const [a, b] = pick([[0.5, 0.25], [0.6, 0.2], [0.4, 0.3], [0.5, 0.4], [0.3, 0.1], [0.2, 0.5], [0.7, 0.1]]), c = r2(1 - a - b), k = randInt(1, 3)
      // chaîne à 3 états symétrique circulaire : P = (a b c ; c a b ; b c a) : état stable uniforme
      const P = [[a, b, c], [c, a, b], [b, c, a]]
      return T('Trois marchés', fraction3(`Un ${pick(['marchand', 'colporteur', 'jongleur'])} change de marché chaque semaine sur les marchés 1, 2 et 3, selon la matrice de transition P ci-dessous. Quelle est, à long terme, la probabilité qu’il soit au marché ${k} ?`, {
        explanation: `Chaque colonne de P a aussi pour somme 1 : π = (${F(1, 3)} ; ${F(1, 3)} ; ${F(1, 3)}) vérifie πP = π ; c’est l’état stable : ${F(1, 3)}.`,
      }), [{ name: 'P', m: P }])
    }),
    fresh(() => {
      const k = randInt(2, 5), n = randInt(2, 6)
      const A = [[0, 1, 0], [0, 0, 1], [0, 0, 0]], B = madd(mscale(k, ident(3)), A), Bn = mpow(B, n)
      return T('La matrice presque diagonale', numeric(`B = ${k}I₃ + N, où N est la matrice ci-dessous, qui vérifie N³ = 0. Quel est le coefficient ligne 1, colonne 3 de B^{${n}} ?`, Bn[0][2], {
        explanation: `Binôme (I₃ et N commutent) : B^{${n}} = ${k}^{${n}}I₃ + ${n} × ${k}^{${n - 1}}N + ${F(`${n}(${n} − 1)`, 2)} × ${k}^{${n - 2}}N², et seul N² a un coefficient (1 ; 3) non nul (égal à 1) : ${(n * (n - 1)) / 2} × ${k ** (n - 2)} = ${Bn[0][2]}.`,
      }), [{ name: 'N', m: A }])
    }),
  ],
]

// ════════════════════════════════════════════════════════════════════════
// Problèmes de l’hôtel de ville
// ════════════════════════════════════════════════════════════════════════

const VILLES = ['Arles', 'Blois', 'Caen', 'Dole', 'Évry', 'Foix']
const age: Ladder = [
  [
    fresh(() => {
      const n = randInt(4, 6), e = randGraph(n, false, 0.55, n), k = randInt(0, n - 1), d = e.filter(([i, j]) => i === k || j === k).length
      const ask = pick(['routes', 'degré'])
      const fig = graphFig(n, e, false, undefined, `Les villages ${VILLES.slice(0, n).map((v, i) => `${V(i)} : ${v}`).join(', ')}.`)
      return T('Le réseau des villages', ask === 'routes'
        ? numeric(`Le graphe ci-dessous représente les routes entre ${n} villages. Le seigneur doit entretenir toutes les routes : combien y en a-t-il ?`, e.length, { explanation: `Somme des degrés : ${Array.from({ length: n }, (_, i) => e.filter(([a, b]) => a === i || b === i).length).join(' + ')} = ${2 * e.length} = 2 × ${e.length} : ${e.length} routes.` })
        : numeric(`Le graphe ci-dessous représente les routes entre ${n} villages. Combien de routes partent de ${VILLES[k]} (sommet ${V(k)}) ?`, d, { explanation: `C’est le degré du sommet ${V(k)} : ${d}.` }), fig)
    }),
    () => {
      const m = pick([{ a: 'épées', b: 'boucliers', who: 'Le forgeron' }, { a: 'tonneaux de cidre', b: 'tonneaux de bière', who: 'Le brasseur' }, { a: 'manuscrits', b: 'cartes', who: 'La copiste' }])
      const pa = randInt(3, 20), pb = randInt(3, 20), A = retry(() => { const A = [[randInt(1, 6), randInt(1, 6)], [randInt(1, 6), randInt(1, 6)]]; return [1, -1, 2, -2].includes(det2(A)) ? A : null })
      const B = mmul(A, [[pa], [pb]])
      return T('Les commandes de la forge', pair(`${m.who} a vendu ${A[0][0]} ${m.a} et ${A[0][1]} ${m.b} pour ${B[0][0]} écus, puis ${A[1][0]} ${m.a} et ${A[1][1]} ${m.b} pour ${B[1][0]} écus. En écrivant le système sous la forme AX = B avec les matrices ci-dessous, trouve le prix d’un objet de chaque sorte (réponse (prix des ${m.a} ; prix des ${m.b})).`, pa, pb, {
        explanation: `A = ${mTxt(A)}, det(A) = ${fmt(det2(A))}, A⁻¹ = ${mTxt(inv2(A))} ; X = A⁻¹B = (${pa} ; ${pb}).`,
      }), [{ name: 'A', m: A }, { name: 'B', m: B }], 'Le système sous forme matricielle.')
    },
    fresh(() => {
      const p = tenth(), q = tenth(), a = randInt(2, 8) / 10, x = r2(a * (1 - p) + (1 - a) * q)
      return T('Les deux tavernes', numeric(`Au village, il y a deux tavernes, Le Sanglier (A) et La Chope (B). Chaque soir, un habitué de A change pour B avec la probabilité ${fmt(p)}, un habitué de B change pour A avec la probabilité ${fmt(q)} (graphe ci-dessous). Ce soir, ${fmt(a * 100)} % des habitués sont au Sanglier. Quel pourcentage y sera demain soir ?`, r2(x * 100), {
        explanation: `π₁ = π₀P : ${fmt(a)} × ${fmt(r2(1 - p))} + ${fmt(r2(1 - a))} × ${fmt(q)} = ${fmt(x)}, soit ${fmt(r2(x * 100))} %.`,
      }), markovFig(p, q))
    }),
  ],
  [
    fresh(() => {
      const n = 4, e = randGraph(n, true, 0.5, 6), A = adjacency(n, e, true), A2 = mmul(A, A), [i, j] = retry(() => { const i = randInt(0, 3), j = randInt(0, 3); return i !== j && A2[i][j] > 0 ? [i, j] : null })
      return T('Les routes à sens unique', numeric(`Dans la cité, les rues entre les quatre places A, B, C, D sont à sens unique (graphe ci-dessous). Un messager part de ${V(i)} et doit arriver en ${V(j)} en empruntant exactement deux rues. Combien d’itinéraires possibles ?`, A2[i][j], {
        explanation: `Coefficient ${pos(i, j)} de M², M = ${mTxt(A)} : M² = ${mTxt(A2)}, d’où ${A2[i][j]} itinéraire${A2[i][j] > 1 ? 's' : ''} (par ${[0, 1, 2, 3].filter((k) => A[i][k] && A[k][j]).map(V).join(', ')}).`,
      }), graphFig(n, e, true))
    }),
    fresh(() => {
      const keys: M[] = [[[3, 2], [1, 1]], [[2, 1], [1, 1]], [[5, 2], [2, 1]], [[1, 2], [1, 3]], [[3, 1], [5, 2]]]
      const K = pick(keys), x = randInt(0, 25), y = randInt(0, 25), C = mmul(K, [[x], [y]]).map((r) => [((r[0] % 26) + 26) % 26])
      const L = (v: number) => String.fromCharCode(65 + v)
      const which = randInt(0, 1)
      return T('Le chiffre de Hill', numeric(`Pour chiffrer un message, on code chaque lettre par son rang (A = 0, B = 1, …, Z = 25) et on transforme chaque paire (x ; y) en K × (x ; y), puis on prend les restes modulo 26. Avec la clé K ci-dessous, on chiffre la paire « ${L(x)}${L(y)} » = (${x} ; ${y}). Quel est le ${which ? 'second' : 'premier'} nombre obtenu ?`, C[which][0], {
        explanation: `K × (${x} ; ${y}) = (${K[0][0]} × ${x} + ${K[0][1]} × ${y} ; ${K[1][0]} × ${x} + ${K[1][1]} × ${y}) = (${K[0][0] * x + K[0][1] * y} ; ${K[1][0] * x + K[1][1] * y}) ; modulo 26 : (${C[0][0]} ; ${C[1][0]}), soit « ${L(C[0][0])}${L(C[1][0])} ».`,
      }), [{ name: 'K', m: K }], 'La clé de chiffrement.')
    }),
    () => {
      const a = pick([0.8, 0.9, 0.7]), b = pick([0.2, 0.1, 0.3]), c = pick([0.1, 0.2]), d = pick([0.6, 0.7, 0.8]), L = randInt(4, 12) * 100, R = randInt(1, 5) * 100
      const A = [[a, b], [c, d]], U1 = mmul(A, [[L], [R]]), U2 = mmul(A, U1)
      return T('Lapins et renards', pair(`Une forêt abrite ${L} lapins et ${R} renards. Chaque année, le couple (L ; R) est multiplié par la matrice A ci-dessous. Combien de lapins et de renards y aura-t-il dans deux ans ? (réponse (L ; R), valeurs exactes)`, r2(U2[0][0]), r2(U2[1][0]), {
        explanation: `Après un an : A(${L} ; ${R}) = (${fmt(r2(U1[0][0]))} ; ${fmt(r2(U1[1][0]))}). Après deux ans : (${fmt(r2(U2[0][0]))} ; ${fmt(r2(U2[1][0]))}).`,
      }), [{ name: 'A', m: A }])
    },
  ],
  [
    fresh(() => {
      const [p, q] = retry(() => { const p = randInt(1, 6) / 20, q = randInt(1, 6) / 20; return Number.isInteger(r2((q / (p + q)) * 1000)) ? [p, q] : null })
      return T('La fidélité au marché', numeric(`Deux marchés se partagent les clients d’une ville. Chaque mois, ${fmt(r2(p * 100))} % des clients du marché A partent au marché B, et ${fmt(r2(q * 100))} % des clients de B partent en A. À long terme, quel pourcentage des clients fréquentera le marché A ?`, r2((q / (p + q)) * 100), {
        explanation: `État stable (x ; 1 − x) : ${fmt(p)}x = ${fmt(q)}(1 − x), donc x = ${r2(p + q) === 1 ? '' : `${F(fmt(q), fmt(r2(p + q)))} = `}${num(q / (p + q))}, soit ${fmt(r2((q / (p + q)) * 100))} %.`,
      }), markovFig(p, q))
    }),
    fresh(() => {
      const K = pick([[[3, 2], [1, 1]], [[2, 1], [1, 1]], [[5, 2], [2, 1]], [[1, 2], [1, 3]]] as M[]), Ki = inv2(K).map((r) => r.map((v) => Math.round(v) + 0))
      const x = randInt(0, 25), y = randInt(0, 25), C = mmul(K, [[x], [y]]).map((r) => ((r[0] % 26) + 26) % 26)
      const L = (v: number) => String.fromCharCode(65 + v), which = randInt(0, 1)
      return T('Le message secret', numeric(`On utilise le chiffre de Hill : rangs A = 0 … Z = 25, chaque paire est multipliée par la clé K puis on prend les restes modulo 26. Un message a été chiffré avec la clé K ci-dessous ; comme det(K) = 1, son inverse K′ (aussi ci-dessous) est à coefficients entiers. On intercepte la paire « ${L(C[0])}${L(C[1])} » = (${C[0]} ; ${C[1]}). En calculant K′ × (${C[0]} ; ${C[1]}) modulo 26, retrouve le ${which ? 'second' : 'premier'} rang de la paire d’origine.`, which ? y : x, {
        explanation: `K′ × (${C[0]} ; ${C[1]}) = (${fmt(Ki[0][0] * C[0] + Ki[0][1] * C[1])} ; ${fmt(Ki[1][0] * C[0] + Ki[1][1] * C[1])}) ; restes modulo 26 (entre 0 et 25) : (${x} ; ${y}), soit « ${L(x)}${L(y)} ».`,
      }), [{ name: 'K', m: K }, { name: 'K′', m: Ki }])
    }),
    fresh(() => {
      const n = randInt(4, 5), e = randGraph(n, false, 0.6, n + 1), A = adjacency(n, e, false), A3 = mpow(A, 3), i = randInt(0, n - 1)
      const tri = A3[i][i] / 2
      return T('Les tours de garde', numeric(`Les ${n} tours d’une forteresse sont reliées par des chemins de ronde (graphe ci-dessous). Une ${pick(['patrouille', 'sentinelle', 'ronde de nuit'])} part de la tour ${V(i)} et y revient en parcourant exactement 3 chemins de ronde. Combien d’itinéraires possibles ?`, A3[i][i], {
        explanation: `C’est le coefficient ${pos(i, i)} de M³ (M = ${mTxt(A)}) : ${A3[i][i]} — chaque triangle passant par ${V(i)} est parcouru dans les deux sens (${tri} triangle${tri > 1 ? 's' : ''}).`,
      }), graphFig(n, e, false))
    }),
  ],
]

const tiers: Tiers = [
  [sumMat, coefProd, graphRead, matVec],
  [prodMat, determinant, adjMat, systemMat],
  [inverse, solveSys, paths2, markov1],
  [stable, paths3, powPattern, cayley],
  [markov2, sys3, paramDet, coupled],
]

export const CONTENT: SubjectContent | null = { tiers, upgrades, age }
