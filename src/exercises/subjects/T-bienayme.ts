// Concentration et loi des grands nombres (Terminale, spécialité) : inégalité de Bienaymé-Tchebychev,
// inégalité de concentration, taille d'échantillon, loi des grands nombres.
// Public adulte : « remise en jambes » joue les paliers 1 à 3, « aguerris » les paliers 2 à 5.
import {
  choice, evalExpr, fmt, fresh, parseExpr, parseNumber, pick, randInt, shuffle, variants, withMeta,
  type Exercise, type Maker, type SubjectContent,
} from '../utils'
import type { FigPoint, FigSegment, Figure } from '../figure'
import { prenom } from '../contexts'

// ── Aides locales ───────────────────────────────────────────────────────
const rd = (v: number, d = 6) => Math.round(v * 10 ** d) / 10 ** d
const isDec = (v: number, d: number) => Math.abs(v * 10 ** d - Math.round(v * 10 ** d)) < 1e-6
function retry<R>(gen: () => R | null | undefined | false): R {
  for (let i = 0; i < 5000; i++) {
    const r = gen()
    if (r) return r
  }
  throw new Error('tirage impossible')
}
/** « X − m » écrit proprement (X + 4 si m = −4). */
const dev = (X: string, m: number) => (m < 0 ? `${X} + ${fmt(-m)}` : `${X} − ${fmt(m)}`)
const T = (title: string, ex: Exercise, figure?: Figure): Exercise => withMeta(ex, figure ? { title, figure } : { title })
const sum = (a: number[]) => a.reduce((s, v) => s + v, 0)
const par = (v: number) => (v < 0 ? `(${fmt(v)})` : fmt(v))
const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b))
/** Fraction réduite a/b en texte (ou entier). */
function fmtFrac(a: number, b: number): string {
  const g = gcd(Math.abs(a), b) || 1
  const n = a / g, d = b / g
  return d === 1 ? fmt(n) : `${n < 0 ? '−' : ''}${Math.abs(n)}/${d}`
}
/** Plus petit entier ≥ v (robuste aux erreurs d'arrondi). */
const ceil = (v: number) => Math.ceil(rd(v, 6))
/** Pourcentage écrit : 0,05 → « 5 % ». */
const pct = (v: number) => `${fmt(rd(v * 100))} %`
/** Quotient empilé pour une formule littérale (a et b sans « / »). */
const F3 = (a: string, b: string) => `{${a}/${b}}`
/** « V/d² = fraction » sans répétition inutile (1/4 = 1/4). */
const ratio = (V: number, d2: number) => (fmtFrac(V, d2) === `${V}/${d2}` ? `${V}/${d2}` : `${V}/${d2} = ${fmtFrac(V, d2)}`)

/** Lit un nombre : décimal, fraction, pourcentage, calcul numérique ; ignore une unité finale. */
function readVal(raw: string): number {
  let s = raw.trim().replace(/\s*(€|écus?|kg|g|min|cm|km|personnes?|lancers?|foyers?|parties?)\.?$/i, '').replace(/\s+/g, '')
  let k = 1
  if (s.endsWith('%')) {
    k = 0.01
    s = s.slice(0, -1)
  }
  let v = parseNumber(s)
  if (Number.isNaN(v) && s && !/[a-zA-Z]/.test(s.replace(/sqrt/gi, ''))) {
    const n = parseExpr(s)
    if (n) v = evalExpr(n, 0)
  }
  return Number.isFinite(v) ? v * k : NaN
}
/** Réponse numérique, exacte (tol relative 1e-6) ou approchée (tol absolue). */
function val(prompt: string, value: number, explanation: string, o: { tol?: number; answer?: string; hint?: string } = {}): Exercise {
  const tol = o.tol ?? 1e-6
  return {
    prompt,
    kind: 'input',
    answer: o.answer ?? (tol >= 0.01 ? fmt(rd(value, 2)) : tol >= 0.001 && !isDec(value, 4) ? fmt(rd(value, 3)) : fmt(rd(value, 6))),
    explanation,
    inputHint: o.hint ?? 'Ta réponse',
    format: 'un nombre, par exemple 12 ; 0,25 ou 3/4',
    keypad: ['/', ',', '%', '√', '(', ')'],
    isValid: (v) => !Number.isNaN(readVal(v)),
    check: (v) => Math.abs(readVal(v) - value) <= (tol < 1e-3 ? tol * Math.max(1, Math.abs(value)) : tol) + 1e-9,
  }
}
/** Tolérance d'une probabilité : arrondi au millième accepté (resserrée pour les très petites valeurs). */
const ptol = (v: number) => (Math.abs(v) >= 0.05 ? 1e-3 : Math.abs(v) >= 0.005 ? 5e-4 : Math.abs(v) * 0.05)
/** Probabilité (borne) : décimale exacte, ou fraction si elle n'est pas décimale ; l'arrondi au millième est accepté. */
function prob(prompt: string, num: number, den: number, explanation: string): Exercise {
  const v = num / den
  return val(prompt, v, explanation, { answer: isDec(v, 4) ? fmt(rd(v, 4)) : fmtFrac(num, den), tol: ptol(v), hint: 'Valeur exacte ou arrondie au millième' })
}
/** Probabilité décimale quelconque. */
const probD = (prompt: string, v: number, explanation: string) =>
  val(prompt, v, explanation, { answer: fmt(rd(v, isDec(v, 4) ? 4 : 3)), tol: ptol(v), hint: 'Valeur exacte ou arrondie au millième' })
/** Écriture d'un réel : décimal, ou « 10/3 ≈ 3,33 ». */
function exactText(v: number): string {
  if (isDec(v, 4)) return fmt(rd(v, 4))
  const den = [3, 6, 7, 9, 11, 12].find((d) => isDec(v * d, 6))
  return den ? `${fmtFrac(Math.round(v * den), den)} ≈ ${fmt(rd(v, 2))}` : `≈ ${fmt(rd(v, 2))}`
}
/** Réel exact : décimal, ou fraction de petit dénominateur (arrondi au centième accepté). */
function real(prompt: string, v: number, explanation: string): Exercise {
  if (isDec(v, 4)) return val(prompt, v, explanation)
  const den = [3, 6, 7, 9, 11, 12].find((d) => isDec(v * d, 6)) ?? 3
  return val(prompt, v, explanation, { answer: fmtFrac(Math.round(v * den), den), tol: 0.01, hint: 'Valeur exacte ou arrondie au centième' })
}

/** Tableau de loi : ligne des valeurs, ligne des probabilités. */
function lawTable(xs: string[], ps: string[], heads: [string, string] = ['x', 'P(X = x)']): Figure {
  const n = xs.length
  const c0 = Math.max(64, 8 * Math.max(...heads.map((h) => [...h].length)) + 10)
  const cw = Math.min(58, (300 - c0) / n)
  const W = c0 + cw * n, x0 = (320 - W) / 2, y0 = 14, rh = 32, h = y0 * 2 + rh * 2
  const points: Record<string, FigPoint> = {}
  const segments: FigSegment[] = []
  const notes: { x: number; y: number; text: string }[] = []
  const P = (k: string, x: number, y: number) => { points[k] = { x, y, hidden: true, label: '' } }
  for (let r = 0; r <= 2; r++) {
    P(`h${r}a`, x0, y0 + r * rh)
    P(`h${r}b`, x0 + W, y0 + r * rh)
    segments.push({ a: `h${r}a`, b: `h${r}b` })
  }
  const cols = [0, c0, ...Array.from({ length: n }, (_, i) => c0 + cw * (i + 1))]
  cols.forEach((cx, i) => {
    P(`v${i}a`, x0 + cx, y0)
    P(`v${i}b`, x0 + cx, y0 + 2 * rh)
    segments.push({ a: `v${i}a`, b: `v${i}b` })
  })
  heads.forEach((t, r) => notes.push({ x: x0 + c0 / 2, y: y0 + r * rh + 21, text: t }))
  xs.forEach((t, i) => notes.push({ x: x0 + c0 + cw * (i + 0.5), y: y0 + 21, text: t }))
  ps.forEach((t, i) => notes.push({ x: x0 + c0 + cw * (i + 0.5), y: y0 + rh + 21, text: t }))
  return { w: 320, h, points, segments, notes, caption: '' }
}

/** Diagramme en bâtons, probabilités écrites au-dessus des bâtons. */
function barsFigure(ks: number[], ps: number[], ymax: number, ystep: number): Figure {
  const w = 320, h = 220, X0 = 46, Y0 = 188, Xe = 306, Ytop = 26
  const slot = (Xe - X0) / ks.length, bw = Math.min(18, slot * 0.4)
  const Y = (v: number) => Y0 - (v / ymax) * (Y0 - Ytop)
  const X = (k: number) => X0 + slot * (ks.indexOf(k) + 0.5)
  const points: Record<string, FigPoint> = {
    O: { x: X0, y: Y0, hidden: true, label: '' }, Xa: { x: Xe + 8, y: Y0, hidden: true, label: '' }, Ya: { x: X0, y: Ytop - 10, hidden: true, label: '' },
  }
  const segments: FigSegment[] = [{ a: 'O', b: 'Xa', head: true }, { a: 'O', b: 'Ya', head: true }]
  const polygons: { pts: string[]; fill: string }[] = []
  const notes: { x: number; y: number; text: string }[] = []
  for (let t = ystep, i = 0; t <= ymax + 1e-9; t += ystep, i++) {
    const y = Y(t)
    points[`g${i}a`] = { x: X0 - 4, y, hidden: true, label: '' }
    points[`g${i}b`] = { x: Xe, y, hidden: true, label: '' }
    segments.push({ a: `g${i}a`, b: `g${i}b`, color: 'rgba(122, 90, 44, 0.3)', dashed: true })
    notes.push({ x: X0 - 20, y: y + 4, text: fmt(rd(t)) })
  }
  ks.forEach((k, i) => {
    const cx = X(k), yt = Y(ps[i]), id = `b${i}`
    points[`${id}1`] = { x: cx - bw / 2, y: Y0, hidden: true, label: '' }
    points[`${id}2`] = { x: cx + bw / 2, y: Y0, hidden: true, label: '' }
    points[`${id}3`] = { x: cx + bw / 2, y: yt, hidden: true, label: '' }
    points[`${id}4`] = { x: cx - bw / 2, y: yt, hidden: true, label: '' }
    polygons.push({ pts: [`${id}1`, `${id}2`, `${id}3`, `${id}4`], fill: '#d9a441' })
    segments.push({ a: `${id}1`, b: `${id}4` }, { a: `${id}4`, b: `${id}3` }, { a: `${id}3`, b: `${id}2` })
    notes.push({ x: cx, y: Y0 + 16, text: fmt(k) }, { x: cx, y: yt - 5, text: fmt(ps[i]) })
  })
  notes.push({ x: 84, y: 14, text: 'P(X = x)' }, { x: Xe + 6, y: Y0 - 8, text: 'x' })
  return { w, h, points, segments, polygons, notes, caption: '' }
}
const randProbs = (k: number, N = 20) => {
  const cuts = shuffle(Array.from({ length: N - 1 }, (_, i) => i + 1)).slice(0, k - 1).sort((a, b) => a - b)
  return [...cuts, N].map((c, i) => rd((c - (i ? cuts[i - 1] : 0)) / N))
}
const meanOf = (xs: number[], ps: number[]) => rd(sum(xs.map((x, i) => x * ps[i])))
const varOf = (xs: number[], ps: number[]) => {
  const m = meanOf(xs, ps)
  return rd(sum(xs.map((x, i) => ps[i] * (x - m) ** 2)))
}

const BT = 'l’inégalité de Bienaymé-Tchebychev'
/** Rappel de la formule de BT dans une explication. */
const btLine = (m: string, d: string, V: string, res: string) => `D’après ${BT}, P(|X − ${m}| ≥ ${d}) ≤ ${F3('V(X)', `${d}²`)} = ${V} ÷ ${d}² = ${res}.`

// Contextes « variable d'espérance et variance connues »
interface VCtx { t: (m: number, v: string) => string; X: string; lo: number; hi: number; u: string }
const VCTX: VCtx[] = [
  { t: (m, v) => `La masse X (en kg) d’un sac de farine a pour espérance ${m} et pour variance ${v}.`, X: 'X', lo: 20, hi: 60, u: 'kg' },
  { t: (m, v) => `Le nombre X de voyageurs passant chaque jour au péage du pont a pour espérance ${m} et pour variance ${v}.`, X: 'X', lo: 80, hi: 300, u: '' },
  { t: (m, v) => `Le temps X (en minutes) mis par un messager pour rejoindre le château a pour espérance ${m} et pour variance ${v}.`, X: 'X', lo: 30, hi: 120, u: 'min' },
  { t: (m, v) => `Le nombre X de clients d’une boutique en ligne par heure a pour espérance ${m} et pour variance ${v}.`, X: 'X', lo: 40, hi: 200, u: '' },
  { t: (m, v) => `La longueur X (en cm) d’une planche sciée par l’atelier a pour espérance ${m} et pour variance ${v}.`, X: 'X', lo: 100, hi: 250, u: 'cm' },
  { t: (m, v) => `Une variable aléatoire X a pour espérance ${m} et pour variance ${v}.`, X: 'X', lo: 1, hi: 50, u: '' },
]
/** δ et V tels que V/δ² soit un décimal « propre » < 1. */
function niceBound(): [number, number] {
  return retry(() => {
    const d = pick([2, 4, 5, 8, 10, 20]), V = randInt(1, d * d - 1)
    const b = V / (d * d)
    return isDec(b, 4) && b >= 0.04 ? ([d, V] as [number, number]) : null
  })
}

// ═══ Palier 1 : rappels guidés ══════════════════════════════════════════
const tier1: Maker[] = [
  // Majorer P(|X − μ| ≥ δ)
  variants(
    () => {
      const c = pick(VCTX), m = randInt(c.lo, c.hi), [d, V] = niceBound()
      return prob(`${c.t(m, fmt(V))} À l’aide de ${BT}, majore P(|X − ${m}| ≥ ${d}).`, V, d * d, btLine(fmt(m), fmt(d), fmt(V), fmtFrac(V, d * d)))
    },
    () => {
      const c = pick(VCTX), m = randInt(c.lo, c.hi), [d, V] = niceBound()
      return prob(`${c.t(m, fmt(V))} Donne la majoration de P(|X − E(X)| ≥ ${d}) fournie par ${BT}.`, V, d * d, btLine(fmt(m), fmt(d), fmt(V), fmtFrac(V, d * d)))
    },
    () => retry(() => {
      const s = randInt(1, 6), d = pick([2, 4, 5, 8, 10]), m = randInt(10, 90)
      if (s >= d || !isDec((s * s) / (d * d), 4)) return null
      return prob(`X a pour espérance ${m} et pour écart-type ${s}. Que donne ${BT} pour P(|X − ${m}| ≥ ${d}) ?`, s * s, d * d,
        `V(X) = σ² = ${s * s}. ${btLine(fmt(m), fmt(d), fmt(s * s), fmtFrac(s * s, d * d))}`)
    }),
    () => {
      const [d, V] = niceBound(), m = randInt(5, 60)
      return prob(`On sait que E(X) = ${m} et V(X) = ${V}. Quelle majoration de la probabilité que X s’écarte de ${m} d’au moins ${d} donne ${BT} ?`, V, d * d, btLine(fmt(m), fmt(d), fmt(V), fmtFrac(V, d * d)))
    },
  ),
  // Minorer P(|X − μ| < δ)
  variants(
    () => {
      const c = pick(VCTX), m = randInt(c.lo, c.hi), [d, V] = niceBound()
      return prob(`${c.t(m, fmt(V))} À l’aide de ${BT}, minore P(|X − ${m}| < ${d}).`, d * d - V, d * d,
        `P(|X − ${m}| < ${d}) = 1 − P(|X − ${m}| ≥ ${d}) ≥ 1 − ${fmt(V)}/${d}² = 1 − ${fmtFrac(V, d * d)} = ${fmtFrac(d * d - V, d * d)}.`)
    },
    () => {
      const [d, V] = niceBound(), m = randInt(5, 60)
      return prob(`E(X) = ${m} et V(X) = ${V}. Minore la probabilité que X soit strictement compris entre ${m - d} et ${m + d}.`, d * d - V, d * d,
        `${m - d} < X < ${m + d} ⇔ |X − ${m}| < ${d}. Par ${BT} : P ≥ 1 − ${V}/${d * d} = ${fmtFrac(d * d - V, d * d)}.`)
    },
    () => retry(() => {
      const s = randInt(1, 5), d = pick([2, 4, 5, 10]), m = randInt(20, 80)
      if (s >= d) return null
      return prob(`Une variable X a pour espérance ${m} et pour écart-type ${s}. Minore P(|X − ${m}| < ${d}).`, d * d - s * s, d * d,
        `V(X) = ${s * s}. P(|X − ${m}| < ${d}) ≥ 1 − ${s * s}/${d * d} = ${fmtFrac(d * d - s * s, d * d)}.`)
    }),
    () => {
      const c = pick(VCTX), m = randInt(c.lo, c.hi), [d, V] = niceBound()
      return prob(`${c.t(m, fmt(V))} Quelle probabilité minimale ${BT} garantit-elle pour l’événement « X est à moins de ${d} de ${m} » (écart strictement inférieur à ${d}) ?`, d * d - V, d * d,
        `P(|X − ${m}| < ${d}) ≥ 1 − ${V}/${d * d} = ${fmtFrac(d * d - V, d * d)}.`)
    },
  ),
  // Identifier δ
  fresh(variants(
    () => {
      const m = randInt(10, 90), d = randInt(2, 15)
      return val(`E(X) = ${m}. Pour majorer P(X ≤ ${m - d} ou X ≥ ${m + d}) avec ${BT}, quelle valeur de δ faut-il utiliser dans P(|X − ${m}| ≥ δ) ?`, d,
        `X ≤ ${m - d} ou X ≥ ${m + d} ⇔ X − ${m} ≤ −${d} ou X − ${m} ≥ ${d} ⇔ |X − ${m}| ≥ ${d} : δ = ${d}.`)
    },
    () => {
      const m = randInt(10, 90), d = randInt(2, 15)
      return val(`E(X) = ${m}. L’événement « ${m - d} < X < ${m + d} » s’écrit |X − ${m}| < δ. Que vaut δ ?`, d, `${m - d} < X < ${m + d} ⇔ −${d} < X − ${m} < ${d} ⇔ |X − ${m}| < ${d}.`)
    },
    () => {
      const m = randInt(30, 90), d = randInt(2, 12), who = prenom()
      return val(`${who} met en moyenne ${m} minutes pour aller au marché. On s’intéresse à l’événement « le trajet dure moins de ${m - d} minutes ou plus de ${m + d} minutes », noté |X − ${m}| > δ. Que vaut δ ?`, d,
        `Le trajet s’écarte de la moyenne ${m} de plus de ${d} minutes : δ = ${d}.`)
    },
    () => {
      const a = randInt(2, 40), d = randInt(2, 10)
      return val(`On veut appliquer ${BT} à l’événement « ${a} < X < ${a + 2 * d} ». Quelle doit être l’espérance de X pour que cet intervalle soit centré sur E(X) ?`, a + d,
        `Le centre de l’intervalle est (${a} + ${a + 2 * d}) ÷ 2 = ${a + d} ; l’événement s’écrit alors |X − ${a + d}| < ${d}.`)
    },
  )),
  // Inégalité de concentration
  variants(
    () => retry(() => {
      const n = pick([10, 20, 25, 50, 100, 200]), V = randInt(1, 30), d = pick([0.5, 1, 2])
      const b = V / (n * d * d)
      return b < 1 && isDec(b, 4) && b >= 0.005 && prob(`X₁, …, X_n est un échantillon de taille n = ${n} d’une loi de variance ${V} et d’espérance μ ; M_n est sa moyenne. Majore P(|M_n − μ| ≥ ${fmt(d)}) à l’aide de l’inégalité de concentration.`, V, n * d * d,
        `Inégalité de concentration : P(|M_n − μ| ≥ δ) ≤ ${F3('V(X)', 'nδ²')} = ${V} ÷ (${n} × ${fmt(d * d)}) = ${fmt(rd(b))}.`)
    }),
    () => retry(() => {
      const n = pick([50, 100, 200, 400]), s = randInt(1, 5), d = pick([0.5, 1])
      const b = (s * s) / (n * d * d)
      return b < 1 && isDec(b, 4) && prob(`On mesure ${n} fois, de façon indépendante, une longueur ; chaque mesure a un écart-type de ${s} mm. Majore la probabilité que la moyenne des mesures s’écarte de la vraie valeur moyenne μ d’au moins ${fmt(d)} mm.`, s * s, n * d * d,
        `P(|M_n − μ| ≥ ${fmt(d)}) ≤ ${F3('σ²', 'nδ²')} = ${s * s} ÷ (${n} × ${fmt(d * d)}) = ${fmt(rd(b))}.`)
    }),
    () => retry(() => {
      const n = pick([20, 50, 100]), V = randInt(2, 20), d = pick([1, 2])
      const b = V / (n * d * d)
      return b < 1 && isDec(b, 4) && prob(`On joue ${n} parties indépendantes d’un jeu dont le gain a pour variance ${V}. Majore la probabilité que le gain moyen par partie s’écarte de l’espérance du gain d’au moins ${d}.`, V, n * d * d,
        `Inégalité de concentration : P(|M_n − μ| ≥ ${d}) ≤ ${V} ÷ (${n} × ${d * d}) = ${fmt(rd(b))}.`)
    }),
    () => retry(() => {
      const n = pick([100, 200, 400, 500, 1000]), p = pick([0.1, 0.2, 0.5]), d = pick([0.05, 0.1])
      const b = (p * (1 - p)) / (n * d * d)
      return b < 1 && isDec(b, 4) && probD(`On lance ${n} fois une épreuve de Bernoulli de paramètre ${fmt(p)} ; F est la fréquence de succès. Sachant que V(F) = p(1 − p)/n, majore P(|F − ${fmt(p)}| ≥ ${fmt(d)}).`, b,
        `P(|F − p| ≥ δ) ≤ ${F3('p(1 − p)', 'nδ²')} = ${fmt(rd(p * (1 - p)))} ÷ (${n} × ${fmt(rd(d * d))}) = ${fmt(rd(b))}.`)
    }),
  ),
  // Interprétation : loi des grands nombres
  variants(
    () => {
      const n = pick([100, 1000, 10000])
      return choice(`On lance ${n} fois une pièce équilibrée ; F est la fréquence de « pile ». Que dit la loi des grands nombres ?`,
        'Pour tout δ > 0, P(|F − 0,5| ≥ δ) tend vers 0 quand le nombre de lancers tend vers l’infini',
        ['F vaut exactement 0,5 dès que le nombre de lancers est assez grand', 'Après une longue série de « pile », « face » devient plus probable', 'F s’éloigne de 0,5 quand le nombre de lancers augmente'],
        'La loi des grands nombres dit que la fréquence se concentre autour de la probabilité 0,5 : s’en écarter d’au moins δ devient de plus en plus improbable. Elle ne dit pas que F vaut exactement 0,5, et les lancers restent indépendants (la pièce n’a pas de mémoire).')
    },
    () => {
      const f = pick([6, 8, 12, 20])
      return choice(`On lance un très grand nombre de fois un dé équilibré à ${f} faces. Que peut-on dire de la fréquence d’apparition du ${f} ?`,
        `Elle est, avec une probabilité proche de 1, proche de 1/${f}`,
        [`Elle vaut exactement 1/${f}`, `Elle tend vers 1/2`, `Elle augmente si le ${f} n’est pas sorti depuis longtemps`],
        `Loi des grands nombres : la fréquence observée se concentre autour de la probabilité 1/${f}, sans jamais être garantie égale à 1/${f}.`)
    },
    () => {
      const d = pick([2, 3, 4, 5, 10])
      return choice(`D’après ${BT}, que peut-on affirmer de P(|X − E(X)| ≥ ${d}σ), σ étant l’écart-type de X ?`,
        `Elle est inférieure ou égale à 1/${d * d}`,
        [`Elle est égale à 1/${d * d}`, `Elle est supérieure ou égale à 1/${d * d}`, `Elle est inférieure ou égale à 1/${d}`],
        `P(|X − μ| ≥ ${d}σ) ≤ ${F3('σ²', `(${d}σ)²`)} = 1/${d * d}. C’est seulement une majoration, souvent loin de la vraie valeur.`)
    },
    () => {
      const n = pick([50, 100, 400])
      return choice(`Quand on passe d’un échantillon de taille ${n} à un échantillon de taille ${4 * n}, comment évolue la variance de la moyenne M_n ?`,
        'Elle est divisée par 4',
        ['Elle est divisée par 2', 'Elle est multipliée par 4', 'Elle ne change pas'],
        `V(M_n) = V(X)/n : multiplier n par 4 divise la variance par 4 (et l’écart-type par 2).`)
    },
  ),
]

// ═══ Palier 2 ═══════════════════════════════════════════════════════════
const tier2: Maker[] = [
  // Intervalle centré : minorer ou majorer
  variants(
    () => {
      const c = pick(VCTX), m = randInt(c.lo, c.hi), [d, V] = niceBound()
      return prob(`${c.t(m, fmt(V))} Minore P(${m - d} < X < ${m + d}).`, d * d - V, d * d,
        `${m - d} < X < ${m + d} ⇔ |X − ${m}| < ${d}. D’après ${BT}, P ≥ 1 − ${V}/${d}² = ${fmtFrac(d * d - V, d * d)}.`)
    },
    () => {
      const c = pick(VCTX), m = randInt(c.lo, c.hi), [d, V] = niceBound()
      return prob(`${c.t(m, fmt(V))} Majore P(X ≤ ${m - d} ou X ≥ ${m + d}).`, V, d * d,
        `X ≤ ${m - d} ou X ≥ ${m + d} ⇔ |X − ${m}| ≥ ${d}. D’après ${BT}, P ≤ ${V}/${d}² = ${fmtFrac(V, d * d)}.`)
    },
    () => {
      const m = randInt(20, 80), [d, V] = niceBound()
      return prob(`X a pour espérance ${m} et pour variance ${V}. Minore la probabilité que X appartienne à l’intervalle ]${m - d} ; ${m + d}[.`, d * d - V, d * d,
        `X ∈ ]${m - d} ; ${m + d}[ ⇔ |X − ${m}| < ${d}, donc P ≥ 1 − ${V}/${d * d} = ${fmtFrac(d * d - V, d * d)}.`)
    },
    () => {
      const c = pick(VCTX), m = randInt(c.lo, c.hi), [d, V] = niceBound()
      return prob(`${c.t(m, fmt(V))} Majore la probabilité que X sorte de l’intervalle ]${m - d} ; ${m + d}[.`, V, d * d,
        `Sortir de ]${m - d} ; ${m + d}[ ⇔ |X − ${m}| ≥ ${d}. Par ${BT} : P ≤ ${V}/${d * d} = ${fmtFrac(V, d * d)}.`)
    },
  ),
  // En nombre d'écarts-types
  variants(
    () => {
      const k = pick([2, 3, 4, 5, 10])
      return prob(`Majore P(|X − E(X)| ≥ ${k}σ), où σ est l’écart-type de X.`, 1, k * k, `δ = ${k}σ : P ≤ ${F3('σ²', `(${k}σ)²`)} = 1/${k * k}.`)
    },
    () => {
      const k = pick([2, 3, 4, 5, 10])
      return prob(`Minore la probabilité qu’une variable X soit à moins de ${k} écarts-types de son espérance.`, k * k - 1, k * k, `P(|X − μ| < ${k}σ) ≥ 1 − ${F3('σ²', `(${k}σ)²`)} = 1 − 1/${k * k} = ${fmtFrac(k * k - 1, k * k)}.`)
    },
    () => {
      const k = pick([2, 3, 4, 5]), s = randInt(2, 9), m = randInt(20, 90)
      return prob(`X a pour espérance ${m} et pour écart-type ${s}. Minore P(${m - k * s} < X < ${m + k * s}).`, k * k - 1, k * k,
        `L’intervalle est centré en ${m}, de demi-largeur ${k * s} = ${k}σ. P ≥ 1 − ${s * s}/${k * k * s * s} = 1 − 1/${k * k} = ${fmtFrac(k * k - 1, k * k)}.`)
    },
    () => {
      const k = pick([2, 3, 4, 5]), s = randInt(2, 9), m = randInt(20, 90)
      return prob(`Le poids (en g) d’une miche de pain a pour espérance ${m * 10} et pour écart-type ${s}. Majore la probabilité qu’une miche s’écarte de ${m * 10} g d’au moins ${k * s} g.`, 1, k * k,
        `δ = ${k * s} = ${k}σ, donc P ≤ ${s * s}/${k * k * s * s} = 1/${k * k}.`)
    },
  ),
  // Variable binomiale
  variants(
    () => retry(() => {
      const n = pick([50, 100, 200, 400]), p = pick([0.1, 0.2, 0.5, 0.8, 0.9]), d = pick([5, 10, 20]), V = rd(n * p * (1 - p))
      const b = V / (d * d)
      return b < 1 && b >= 0.04 && isDec(b, 4) && probD(`X suit la loi binomiale B(${n} ; ${fmt(p)}). Majore P(|X − ${fmt(n * p)}| ≥ ${d}).`, b,
        `E(X) = np = ${fmt(n * p)} et V(X) = np(1 − p) = ${fmt(V)}. ${btLine(fmt(n * p), fmt(d), fmt(V), fmt(rd(b)))}`)
    }),
    () => retry(() => {
      const n = pick([100, 200, 400]), p = pick([0.2, 0.5, 0.8]), d = pick([10, 20]), V = rd(n * p * (1 - p)), m = n * p
      const b = V / (d * d)
      return b < 1 && b >= 0.04 && isDec(b, 4) && probD(`Un archer tire ${n} flèches ; chacune touche la cible avec la probabilité ${fmt(p)}, indépendamment. X compte les flèches dans la cible. Minore P(${fmt(m - d)} < X < ${fmt(m + d)}).`, 1 - b,
        `X suit B(${n} ; ${fmt(p)}) : E(X) = ${fmt(m)}, V(X) = ${fmt(V)}. P(|X − ${fmt(m)}| < ${d}) ≥ 1 − ${fmt(V)}/${d * d} = ${fmt(rd(1 - b))}.`)
    }),
    () => retry(() => {
      const n = pick([100, 400, 900]), d = pick([10, 15, 20, 30]), V = n / 4
      const b = V / (d * d)
      return b < 1 && isDec(b, 4) && probD(`On lance ${n} fois une pièce équilibrée ; X compte les « pile ». Majore la probabilité que X s’écarte de ${n / 2} d’au moins ${d}.`, b,
        `X suit B(${n} ; 0,5) : E(X) = ${n / 2}, V(X) = ${n} × 0,25 = ${fmt(V)}. P(|X − ${n / 2}| ≥ ${d}) ≤ ${fmt(V)}/${d * d} = ${fmt(rd(b))}.`)
    }),
    () => retry(() => {
      const n = pick([50, 100, 200]), p = pick([0.1, 0.2, 0.3]), d = pick([5, 10]), V = rd(n * p * (1 - p)), m = n * p
      const b = V / (d * d)
      return b < 1 && b >= 0.04 && isDec(b, 4) && probD(`Chaque épée d’une forge est défectueuse avec la probabilité ${fmt(p)}. On en contrôle ${n} (tirages assimilés à des tirages avec remise) ; X compte les défectueuses. Majore P(|X − ${fmt(m)}| ≥ ${d}).`, b,
        `X suit B(${n} ; ${fmt(p)}) : E(X) = ${fmt(m)}, V(X) = ${fmt(V)}. ${btLine(fmt(m), fmt(d), fmt(V), fmt(rd(b)))}`)
    }),
  ),
  // Concentration : minorer
  variants(
    () => retry(() => {
      const n = pick([25, 50, 100, 200]), V = randInt(1, 20), d = pick([0.5, 1, 2])
      const b = V / (n * d * d)
      return b < 1 && isDec(b, 4) && b >= 0.01 && probD(`M_n est la moyenne d’un échantillon de taille ${n} d’une loi d’espérance μ et de variance ${V}. Minore P(|M_n − μ| < ${fmt(d)}).`, 1 - b,
        `P(|M_n − μ| < δ) ≥ 1 − ${F3('V(X)', 'nδ²')} = 1 − ${V} ÷ (${n} × ${fmt(d * d)}) = ${fmt(rd(1 - b))}.`)
    }),
    () => retry(() => {
      const n = pick([100, 200, 400]), p = pick([0.2, 0.5]), d = pick([0.05, 0.1])
      const b = (p * (1 - p)) / (n * d * d)
      return b < 1 && isDec(b, 4) && probD(`Une graine germe avec la probabilité ${fmt(p)}. On sème ${n} graines (germinations indépendantes) et l’on note F la fréquence de germination. Minore P(|F − ${fmt(p)}| < ${fmt(d)}).`, 1 - b,
        `F est la moyenne de ${n} variables de Bernoulli de variance ${fmt(rd(p * (1 - p)))}. P ≥ 1 − ${fmt(rd(p * (1 - p)))} ÷ (${n} × ${fmt(rd(d * d))}) = ${fmt(rd(1 - b))}.`)
    }),
    () => retry(() => {
      const n = pick([20, 40, 50, 100]), s = randInt(1, 4), d = pick([1, 2]), m = randInt(30, 60)
      const b = (s * s) / (n * d * d)
      return b < 1 && isDec(b, 4) && probD(`Chaque sac d’un lot a une masse d’espérance ${m} kg et d’écart-type ${s} kg. On pèse ${n} sacs (masses indépendantes). Minore la probabilité que leur masse moyenne soit strictement comprise entre ${m - d} et ${m + d} kg.`, 1 - b,
        `P(|M_n − ${m}| < ${d}) ≥ 1 − ${s * s} ÷ (${n} × ${d * d}) = ${fmt(rd(1 - b))}.`)
    }),
    () => retry(() => {
      const n = pick([50, 100, 200]), V = randInt(2, 30), d = pick([1, 2])
      const b = V / (n * d * d)
      return b < 1 && isDec(b, 4) && b >= 0.01 && probD(`On répète ${n} fois de façon indépendante une expérience ; le résultat a pour variance ${V}. Quelle probabilité minimale l’inégalité de concentration garantit-elle pour que la moyenne des résultats soit à moins de ${d} de l’espérance ?`, 1 - b,
        `P(|M_n − μ| < ${d}) ≥ 1 − ${V} ÷ (${n} × ${d * d}) = ${fmt(rd(1 - b))}.`)
    }),
  ),
  // Fréquence d'un succès (p connu)
  variants(
    () => retry(() => {
      const n = pick([100, 200, 250, 400, 500, 1000]), p = pick([0.1, 0.2, 0.3, 0.4, 0.5]), d = pick([0.05, 0.1])
      const b = (p * (1 - p)) / (n * d * d)
      return b < 1 && isDec(b, 4) && b >= 0.005 && probD(`On répète ${n} fois une épreuve de succès p = ${fmt(p)} ; F est la fréquence des succès. Majore P(|F − ${fmt(p)}| ≥ ${fmt(d)}).`, b,
        `E(F) = p, V(F) = ${F3('p(1 − p)', 'n')}. P(|F − p| ≥ δ) ≤ ${F3('p(1 − p)', 'nδ²')} = ${fmt(rd(p * (1 - p)))} ÷ (${n} × ${fmt(rd(d * d))}) = ${fmt(rd(b))}.`)
    }),
    () => retry(() => {
      const n = pick([400, 500, 1000, 2000]), d = pick([0.02, 0.05])
      const b = 0.25 / (n * d * d)
      return b < 1 && isDec(b, 4) && probD(`On lance ${n} fois une pièce équilibrée. Majore la probabilité que la fréquence de « pile » s’écarte de 0,5 d’au moins ${fmt(d)}.`, b,
        `P(|F − 0,5| ≥ ${fmt(d)}) ≤ ${F3('0,5 × 0,5', `${n} × ${fmt(d)}²`)} = 0,25 ÷ ${fmt(rd(n * d * d))} = ${fmt(rd(b))}.`)
    }),
    () => retry(() => {
      const n = pick([600, 1200, 3000, 6000]), d = pick([0.02, 0.05])
      const v = 5 / 36, b = v / (n * d * d)
      return b < 1 && probD(`On lance ${n} fois un dé équilibré ; F est la fréquence du 6. Majore P(|F − 1/6| ≥ ${fmt(d)}) (arrondi au millième).`, b,
        `p(1 − p) = 1/6 × 5/6 = 5/36. P ≤ (5/36) ÷ (${n} × ${fmt(d)}²) ≈ ${fmt(rd(b, 3))}.`)
    }),
    () => retry(() => {
      const n = pick([200, 500, 1000]), p = pick([0.2, 0.3, 0.4]), d = pick([0.05, 0.1])
      const b = (p * (1 - p)) / (n * d * d)
      return b < 1 && isDec(b, 4) && probD(`Une machine produit ${pct(p)} de pièces défectueuses. Sur ${n} pièces, minore la probabilité que la proportion de pièces défectueuses soit strictement comprise entre ${fmt(rd(p - d))} et ${fmt(rd(p + d))}.`, 1 - b,
        `P(|F − ${fmt(p)}| < ${fmt(d)}) ≥ 1 − ${fmt(rd(p * (1 - p)))} ÷ (${n} × ${fmt(rd(d * d))}) = ${fmt(rd(1 - b))}.`)
    }),
  ),
]

// ═══ Palier 3 ═══════════════════════════════════════════════════════════
/** Taille minimale n ≥ V/(αδ²), entière. */
const nMin = (V: number, a: number, d: number) => ceil(V / (a * d * d))
const tier3: Maker[] = [
  // Taille d'échantillon : V connue
  fresh(variants(
    () => retry(() => {
      const V = randInt(1, 30), a = pick([0.05, 0.1, 0.01]), d = pick([0.5, 1, 2]), n = nMin(V, a, d)
      return n >= 10 && n <= 100000 && val(`Une loi a pour variance ${V}. Quelle taille minimale n d’échantillon l’inégalité de concentration garantit-elle pour que P(|M_n − μ| ≥ ${fmt(d)}) ≤ ${fmt(a)} ?`, n,
        `Il suffit que ${F3('V', 'nδ²')} ≤ α : n ≥ ${F3('V', 'αδ²')} = ${V} ÷ (${fmt(a)} × ${fmt(d * d)}) = ${fmt(rd(V / (a * d * d), 3))}. Donc n = ${n}.`)
    }),
    () => retry(() => {
      const s = randInt(1, 6), a = pick([0.05, 0.1]), d = pick([0.5, 1]), n = nMin(s * s, a, d)
      return n >= 10 && val(`Une mesure a un écart-type de ${s} mm. Combien de mesures indépendantes faut-il au minimum pour que leur moyenne soit à moins de ${fmt(d)} mm de la vraie valeur avec une probabilité d’au moins ${fmt(rd(1 - a))}, d’après l’inégalité de concentration ?`, n,
        `On veut ${F3('σ²', 'nδ²')} ≤ ${fmt(a)} : n ≥ ${s * s} ÷ (${fmt(a)} × ${fmt(d * d)}) = ${fmt(rd((s * s) / (a * d * d), 3))}, donc n = ${n}.`)
    }),
    () => retry(() => {
      const V = randInt(2, 20), a = pick([0.05, 0.1, 0.2]), d = pick([1, 2]), n = nMin(V, a, d)
      return n >= 10 && val(`Le gain d’un jeu a pour variance ${V}. Combien de parties indépendantes faut-il jouer, au minimum, pour que le gain moyen soit à moins de ${d} de l’espérance avec une probabilité d’au moins ${fmt(rd(1 - a))} (d’après l’inégalité de concentration) ?`, n,
        `n ≥ ${F3('V', 'αδ²')} = ${V} ÷ (${fmt(a)} × ${d * d}) = ${fmt(rd(V / (a * d * d), 3))}, donc n = ${n}.`)
    }),
    () => retry(() => {
      const V = randInt(1, 12), a = pick([0.01, 0.05]), d = pick([0.1, 0.2, 0.5]), n = nMin(V, a, d)
      return n >= 10 && n <= 200000 && val(`X₁, …, X_n sont indépendantes, de même loi de variance ${V}. À partir de quelle valeur de n l’inégalité de concentration assure-t-elle P(|M_n − μ| < ${fmt(d)}) ≥ ${fmt(rd(1 - a))} ?`, n,
        `P(|M_n − μ| < δ) ≥ 1 − ${F3('V', 'nδ²')} ≥ ${fmt(rd(1 - a))} ⇔ n ≥ ${V} ÷ (${fmt(a)} × ${fmt(rd(d * d))}) = ${fmt(rd(V / (a * d * d), 3))} : n = ${n}.`)
    }),
  )),
  // Fréquence : p connu
  fresh(variants(
    () => retry(() => {
      const p = pick([0.1, 0.2, 0.3, 0.4, 0.5]), a = pick([0.05, 0.1]), d = pick([0.05, 0.1]), V = rd(p * (1 - p)), n = nMin(V, a, d)
      return val(`Une épreuve a une probabilité de succès ${fmt(p)}. Combien de répétitions indépendantes faut-il au minimum pour que, d’après l’inégalité de concentration, la fréquence F vérifie P(|F − ${fmt(p)}| ≥ ${fmt(d)}) ≤ ${fmt(a)} ?`, n,
        `V(Xᵢ) = p(1 − p) = ${fmt(V)}. n ≥ ${fmt(V)} ÷ (${fmt(a)} × ${fmt(rd(d * d))}) = ${fmt(rd(V / (a * d * d), 3))}, donc n = ${n}.`)
    }),
    () => retry(() => {
      const a = pick([0.05, 0.1, 0.01]), d = pick([0.05, 0.1]), n = nMin(0.25, a, d)
      return val(`Combien de fois faut-il lancer une pièce équilibrée pour être sûr, d’après l’inégalité de concentration, que la fréquence de « pile » soit à moins de ${fmt(d)} de 0,5 avec une probabilité d’au moins ${fmt(rd(1 - a))} ?`, n,
        `p(1 − p) = 0,25. n ≥ 0,25 ÷ (${fmt(a)} × ${fmt(rd(d * d))}) = ${fmt(rd(0.25 / (a * d * d), 3))}, donc n = ${n}.`)
    }),
    () => retry(() => {
      const p = pick([0.2, 0.3, 0.4]), a = pick([0.05, 0.1]), d = pick([0.05, 0.1]), V = rd(p * (1 - p)), n = nMin(V, a, d)
      return val(`Un archer touche la cible avec la probabilité ${fmt(p)}. Combien de flèches doit-il tirer, au minimum, pour que sa fréquence de réussite soit à moins de ${fmt(d)} de ${fmt(p)} avec une probabilité d’au moins ${fmt(rd(1 - a))} (inégalité de concentration) ?`, n,
        `n ≥ ${F3('p(1 − p)', 'αδ²')} = ${fmt(V)} ÷ (${fmt(a)} × ${fmt(rd(d * d))}) = ${fmt(rd(V / (a * d * d), 3))}, donc n = ${n}.`)
    }),
    () => retry(() => {
      const p = pick([0.1, 0.2, 0.5]), a = pick([0.04, 0.05, 0.1]), d = pick([0.02, 0.05]), V = rd(p * (1 - p)), n = nMin(V, a, d)
      return val(`Une machine produit ${pct(p)} de pièces défectueuses. Combien de pièces faut-il examiner, au minimum, pour que la proportion observée soit à moins de ${pct(d)} de ${pct(p)} avec une probabilité d’au moins ${pct(1 - a)}, d’après l’inégalité de concentration ?`, n,
        `n ≥ ${F3('p(1 − p)', 'αδ²')} = ${fmt(V)} ÷ (${fmt(a)} × ${fmt(rd(d * d))}) = ${fmt(rd(V / (a * d * d), 3))}, donc n = ${n}.`)
    }),
  )),
  // Binomiale : intervalle centré
  variants(
    () => retry(() => {
      const n = pick([100, 200, 400, 500]), p = pick([0.1, 0.2, 0.4, 0.5, 0.6, 0.8]), d = pick([10, 15, 20, 25]), m = rd(n * p), V = rd(n * p * (1 - p))
      const b = V / (d * d)
      return b < 1 && b >= 0.04 && isDec(b, 4) && probD(`X suit la loi binomiale B(${n} ; ${fmt(p)}). Minore P(${fmt(m - d)} < X < ${fmt(m + d)}).`, 1 - b,
        `E(X) = ${fmt(m)}, V(X) = ${fmt(V)}. L’intervalle est centré en E(X) : P(|X − ${fmt(m)}| < ${d}) ≥ 1 − ${fmt(V)}/${d * d} = ${fmt(rd(1 - b))}.`)
    }),
    () => retry(() => {
      const n = pick([100, 400, 900, 1600]), d = pick([10, 20, 30, 40]), m = n / 2, V = n / 4
      const b = V / (d * d)
      return b < 1 && isDec(b, 4) && b >= 0.02 && probD(`On lance ${n} fois une pièce équilibrée. Minore la probabilité que le nombre de « pile » soit strictement compris entre ${m - d} et ${m + d}.`, 1 - b,
        `X suit B(${n} ; 0,5) : E(X) = ${m}, V(X) = ${V}. P(|X − ${m}| < ${d}) ≥ 1 − ${V}/${d * d} = ${fmt(rd(1 - b))}.`)
    }),
    () => retry(() => {
      const n = pick([120, 240, 360, 600]), d = pick([10, 15, 20]), m = n / 6, V = rd((n * 5) / 36)
      const b = V / (d * d)
      return b < 1 && b >= 0.02 && probD(`On lance ${n} fois un dé équilibré ; X compte les 6. Minore P(${fmt(m - d)} < X < ${fmt(m + d)}) (arrondi au millième).`, 1 - b,
        `X suit B(${n} ; 1/6) : E(X) = ${fmt(m)}, V(X) = ${n} × 1/6 × 5/6 = ${fmt(rd(V, 4))}. P ≥ 1 − V/${d * d} ≈ ${fmt(rd(1 - b, 3))}.`)
    }),
    () => retry(() => {
      const n = pick([100, 200, 300]), p = pick([0.7, 0.8, 0.9]), d = pick([5, 10, 15]), m = rd(n * p), V = rd(n * p * (1 - p))
      const b = V / (d * d)
      return b < 1 && b >= 0.04 && isDec(b, 4) && probD(`Un vaccin protège chaque personne avec la probabilité ${fmt(p)}. On vaccine ${n} personnes ; X compte les personnes protégées. Majore la probabilité que X s’écarte de ${fmt(m)} d’au moins ${d}.`, b,
        `X suit B(${n} ; ${fmt(p)}) : E(X) = ${fmt(m)}, V(X) = ${fmt(V)}. ${btLine(fmt(m), fmt(d), fmt(V), fmt(rd(b)))}`)
    }),
  ),
  // Trouver δ pour un risque donné
  fresh(variants(
    () => {
      const [a, r] = pick([[0.04, 0.2], [0.01, 0.1], [0.25, 0.5], [0.0625, 0.25], [0.16, 0.4], [0.09, 0.3]] as const), s = randInt(1, 9)
      return real(`X a pour écart-type ${s}. Pour quelle valeur de δ ${BT} donne-t-elle exactement P(|X − E(X)| ≥ δ) ≤ ${fmt(a)} ?`, rd(s / r),
        `${F3('σ²', 'δ²')} = ${fmt(a)} ⇔ δ² = ${s * s} ÷ ${fmt(a)} = ${exactText((s * s) / a)} ⇔ δ = ${exactText(s / r)}.`)
    },
    () => {
      const [a, r] = pick([[0.04, 0.2], [0.01, 0.1], [0.25, 0.5], [0.0625, 0.25], [0.16, 0.4]] as const), s = randInt(1, 9), m = randInt(20, 90)
      return real(`X a pour espérance ${m} et pour variance ${s * s}. Quelle est la plus petite valeur de δ pour laquelle ${BT} garantit P(|X − ${m}| < δ) ≥ ${fmt(rd(1 - a))} ?`, rd(s / r),
        `1 − ${F3(String(s * s), 'δ²')} ≥ ${fmt(rd(1 - a))} ⇔ δ² ≥ ${s * s} ÷ ${fmt(a)} = ${exactText((s * s) / a)} ⇔ δ ≥ ${exactText(s / r)}.`)
    },
    () => {
      const k = pick([2, 3, 4, 5, 10]), s = randInt(2, 8)
      return val(`X a pour écart-type ${s}. Quel écart δ faut-il choisir pour que ${BT} donne P(|X − E(X)| ≥ δ) ≤ 1/${k * k} ?`, k * s,
        `${F3(String(s * s), 'δ²')} = 1/${k * k} ⇔ δ² = ${k * k * s * s} ⇔ δ = ${k * s} (soit ${k} écarts-types).`)
    },
    () => {
      const [a, r] = pick([[0.04, 0.2], [0.01, 0.1], [0.25, 0.5], [0.16, 0.4]] as const), V = pick([1, 4, 9, 16, 25, 36])
      const s = Math.sqrt(V)
      return real(`Un temps de trajet X (en minutes) a pour variance ${V}. Quelle marge δ (en minutes) assure, d’après ${BT}, que le trajet s’écarte de sa durée moyenne de moins de δ avec une probabilité d’au moins ${fmt(rd(1 - a))} ?`, rd(s / r),
        `On veut ${V}/δ² ≤ ${fmt(a)} : δ² ≥ ${exactText(V / a)}, δ ≥ ${exactText(s / r)} min.`)
    },
  )),
  // p inconnu : majoration p(1 − p) ≤ 1/4
  fresh(variants(
    () => retry(() => {
      const a = pick([0.05, 0.1, 0.01]), d = pick([0.02, 0.05, 0.1]), n = nMin(0.25, a, d)
      return val(`On veut estimer une proportion p inconnue par la fréquence F observée sur n personnes. Sachant que p(1 − p) ≤ 1/4, quelle taille n garantit P(|F − p| ≥ ${fmt(d)}) ≤ ${fmt(a)} d’après l’inégalité de concentration ?`, n,
        `P(|F − p| ≥ δ) ≤ ${F3('p(1 − p)', 'nδ²')} ≤ ${F3('1', '4nδ²')}. Il suffit que n ≥ ${F3('1', '4αδ²')} = 1 ÷ (4 × ${fmt(a)} × ${fmt(rd(d * d))}) = ${fmt(rd(1 / (4 * a * d * d), 3))}. Donc n = ${n}.`)
    }),
    () => retry(() => {
      const a = pick([0.05, 0.1, 0.2]), d = pick([0.05, 0.1]), n = nMin(0.25, a, d)
      return val(`On lance une punaise : la probabilité p qu’elle retombe pointe en l’air est inconnue. Combien de lancers faut-il au minimum pour que la fréquence observée soit à moins de ${fmt(d)} de p avec une probabilité d’au moins ${fmt(rd(1 - a))}, d’après l’inégalité de concentration et p(1 − p) ≤ 0,25 ?`, n,
        `n ≥ ${F3('1', '4αδ²')} = 1 ÷ (4 × ${fmt(a)} × ${fmt(rd(d * d))}) = ${fmt(rd(1 / (4 * a * d * d), 3))}, donc n = ${n}.`)
    }),
    () => retry(() => {
      const a = pick([0.05, 0.1]), d = pick([0.05, 0.1]), n = nMin(0.25, a, d)
      return val(`Avant une élection, le seigneur veut connaître la part p de partisans du nouveau pont, à ${fmt(d)} près, avec un risque d’erreur au plus ${fmt(a)}. Combien de villageois faut-il interroger au minimum (inégalité de concentration, avec p(1 − p) ≤ 0,25) ?`, n,
        `n ≥ ${F3('0,25', 'αδ²')} = 0,25 ÷ (${fmt(a)} × ${fmt(rd(d * d))}) = ${fmt(rd(0.25 / (a * d * d), 3))}, donc n = ${n}.`)
    }),
    () => retry(() => {
      const [n, a] = pick([[2500, 0.04], [1000, 0.1], [10000, 0.01], [400, 0.25], [625, 0.04], [2500, 0.01]] as const)
      const d = 1 / (2 * Math.sqrt(n * a))
      return isDec(d, 4) && val(`Un sondage interroge ${n} personnes pour estimer une proportion p inconnue. Avec p(1 − p) ≤ 0,25 et un risque α = ${fmt(a)}, quelle précision δ l’inégalité de concentration garantit-elle ?`, rd(d),
        `On veut ${F3('1', '4nδ²')} = α ⇔ δ² = ${F3('1', '4nα')} = 1 ÷ (4 × ${n} × ${fmt(a)}) = ${fmt(rd(d * d, 8))} ⇔ δ = ${fmt(rd(d))}.`)
    }),
  )),
]

// ═══ Palier 4 ═══════════════════════════════════════════════════════════
const tier4: Maker[] = [
  // Intervalle non centré
  variants(
    ...[0, 1, 2].map((form) => () => retry(() => {
      const m = randInt(20, 80), d1 = randInt(3, 12), d2 = randInt(3, 12), V = randInt(2, 40)
      if (d1 === d2) return null
      const d = Math.min(d1, d2), b = V / (d * d)
      if (b >= 1 || b < 0.04 || !isDec(b, 4)) return null
      const intro = form === 0 ? `X a pour espérance ${m} et pour variance ${V}.` : form === 1 ? `La durée X (en minutes) d’une traversée en bac a pour espérance ${m} et pour variance ${V}.` : `Le nombre X de pains vendus par jour a pour espérance ${m} et pour variance ${V}.`
      return probD(`${intro} En utilisant ${BT}, minore P(${m - d1} < X < ${m + d2}).`, 1 - b,
        `L’intervalle ]${m - d1} ; ${m + d2}[ n’est pas centré en ${m}, mais il contient ]${m - d} ; ${m + d}[ (on prend le plus petit écart, δ = ${d}). Donc P(${m - d1} < X < ${m + d2}) ≥ P(|X − ${m}| < ${d}) ≥ 1 − ${V}/${d * d} = ${fmt(rd(1 - b))}.`)
    })),
  ),
  // Une seule queue
  variants(
    () => retry(() => {
      const c = pick(VCTX), m = randInt(c.lo, c.hi), [d, V] = niceBound()
      return prob(`${c.t(m, fmt(V))} Majore P(X ≥ ${m + d}).`, V, d * d,
        `{X ≥ ${m + d}} ⊂ {|X − ${m}| ≥ ${d}}, donc P(X ≥ ${m + d}) ≤ P(|X − ${m}| ≥ ${d}) ≤ ${ratio(V, d * d)}.`)
    }),
    () => retry(() => {
      const c = pick(VCTX), m = randInt(c.lo, c.hi), [d, V] = niceBound()
      return prob(`${c.t(m, fmt(V))} Majore P(X ≤ ${m - d}).`, V, d * d,
        `{X ≤ ${m - d}} ⊂ {|X − ${m}| ≥ ${d}}, donc P(X ≤ ${m - d}) ≤ ${ratio(V, d * d)}.`)
    }),
    () => retry(() => {
      const n = pick([100, 200, 400]), p = pick([0.2, 0.5]), d = pick([10, 20]), m = n * p, V = rd(n * p * (1 - p)), b = V / (d * d)
      return b < 1 && isDec(b, 4) && probD(`Une compagnie vend ${n} billets pour un bateau ; chaque passager est absent au départ avec la probabilité ${fmt(p)}, indépendamment des autres. X, le nombre d’absents, suit B(${n} ; ${fmt(p)}). Majore P(X ≥ ${fmt(m + d)}).`, b,
        `E(X) = ${fmt(m)}, V(X) = ${fmt(V)}. P(X ≥ ${fmt(m + d)}) ≤ P(|X − ${fmt(m)}| ≥ ${d}) ≤ ${fmt(V)}/${d * d} = ${fmt(rd(b))}.`)
    }),
    () => retry(() => {
      const m = randInt(30, 60), s = randInt(1, 4), k = pick([2, 3, 4, 5])
      return prob(`Une miche pèse en moyenne ${m * 10} g, avec un écart-type de ${s * 5} g. Le boulanger jette les miches de moins de ${m * 10 - k * s * 5} g. Majore la proportion de miches jetées.`, 1, k * k,
        `Moins de ${m * 10 - k * s * 5} g ⇒ écart d’au moins ${k * s * 5} = ${k}σ à la moyenne. P ≤ σ²/(${k}σ)² = 1/${k * k}.`)
    }),
  ),
  // Fréquence : plus petit n (pourcentages)
  fresh(variants(
    () => retry(() => {
      const p = pick([0.1, 0.2, 0.3, 0.4]), a = pick([0.05, 0.01]), d = pick([0.01, 0.02, 0.05]), V = rd(p * (1 - p)), n = nMin(V, a, d)
      return val(`Dans une région, ${pct(p)} des habitants sont gauchers. Combien de personnes faut-il observer, au minimum, pour que, d’après l’inégalité de concentration, la proportion de gauchers observée soit à moins de ${pct(d)} de ${pct(p)} avec une probabilité d’au moins ${pct(1 - a)} ?`, n,
        `n ≥ ${F3('p(1 − p)', 'αδ²')} = ${fmt(V)} ÷ (${fmt(a)} × ${fmt(rd(d * d))}) = ${fmt(rd(V / (a * d * d), 3))}, donc n = ${n}.`)
    }),
    () => retry(() => {
      const a = pick([0.05, 0.01]), d = pick([0.01, 0.02]), n = nMin(5 / 36, a, d)
      return val(`On lance n fois un dé équilibré. Pour quel plus petit n l’inégalité de concentration garantit-elle que la fréquence du 6 soit à moins de ${fmt(d)} de 1/6 avec une probabilité d’au moins ${fmt(rd(1 - a))} ?`, n,
        `p(1 − p) = 5/36. n ≥ (5/36) ÷ (${fmt(a)} × ${fmt(d)}²) ≈ ${fmt(rd(5 / 36 / (a * d * d), 2))}, donc n = ${n}.`)
    }),
    () => retry(() => {
      const p = pick([0.6, 0.7, 0.8, 0.9]), a = pick([0.05, 0.1]), d = pick([0.02, 0.05]), V = rd(p * (1 - p)), n = nMin(V, a, d)
      return val(`Une graine germe avec la probabilité ${fmt(p)}. Combien faut-il semer de graines, au minimum, pour que la fréquence de germination soit à moins de ${fmt(d)} de ${fmt(p)} avec une probabilité d’au moins ${fmt(rd(1 - a))} (inégalité de concentration) ?`, n,
        `n ≥ ${fmt(V)} ÷ (${fmt(a)} × ${fmt(rd(d * d))}) = ${fmt(rd(V / (a * d * d), 3))}, donc n = ${n}.`)
    }),
    () => retry(() => {
      const p = pick([0.1, 0.2, 0.3]), a = pick([0.05, 0.1]), d = pick([0.01, 0.02]), V = rd(p * (1 - p)), n = nMin(V, a, d), n0 = nMin(0.25, a, d)
      return val(`On sait que p = ${fmt(p)}. Combien de répétitions de moins faut-il pour garantir P(|F − p| ≥ ${fmt(d)}) ≤ ${fmt(a)} qu’avec la majoration p(1 − p) ≤ 0,25 (inégalité de concentration) ?`, n0 - n,
        `Avec p connu : n ≥ ${fmt(V)} ÷ ${fmt(rd(a * d * d))} = ${fmt(rd(V / (a * d * d), 3))}, soit ${n}. Avec 0,25 : n ≥ ${fmt(rd(0.25 / (a * d * d), 3))}, soit ${n0}. Économie : ${n0 - n} répétitions.`)
    }),
  )),
  // Somme de n variables : P(|S_n − nμ| ≥ t)
  variants(
    () => retry(() => {
      const n = pick([10, 20, 25, 50, 100]), V = randInt(1, 10), t = pick([10, 20, 25, 50]), b = (n * V) / (t * t)
      return b < 1 && b >= 0.02 && isDec(b, 4) && probD(`S est la somme de ${n} variables indépendantes de même loi, de variance ${V}. Majore P(|S − E(S)| ≥ ${t}).`, b,
        `V(S) = ${n} × ${V} = ${n * V}. ${BT} : P(|S − E(S)| ≥ ${t}) ≤ ${n * V}/${t * t} = ${fmt(rd(b))}.`)
    }),
    () => retry(() => {
      const n = pick([16, 25, 36, 50]), m = randInt(20, 50), s = randInt(1, 3), t = pick([10, 15, 20, 30]), V = n * s * s, b = V / (t * t)
      return b < 1 && b >= 0.02 && isDec(b, 4) && probD(`Un chariot porte ${n} sacs de masses indépendantes, chacune d’espérance ${m} kg et d’écart-type ${s} kg. Majore la probabilité que la masse totale s’écarte de ${n * m} kg d’au moins ${t} kg.`, b,
        `V(S) = ${n} × ${s * s} = ${V} et E(S) = ${n * m}. P(|S − ${n * m}| ≥ ${t}) ≤ ${V}/${t * t} = ${fmt(rd(b))}.`)
    }),
    () => retry(() => {
      const n = pick([10, 20, 40]), V = randInt(2, 10), t = pick([10, 20, 40]), E = rd(randInt(-10, 10) / 10), b = (n * V) / (t * t)
      return b < 1 && b >= 0.02 && isDec(b, 4) && probD(`Un joueur fait ${n} parties indépendantes d’un jeu dont le gain a pour espérance ${fmt(E)} et pour variance ${V}. Minore la probabilité que son gain total soit strictement compris entre ${fmt(rd(n * E - t))} et ${fmt(rd(n * E + t))}.`, 1 - b,
        `E(S) = ${fmt(rd(n * E))}, V(S) = ${n * V}. P(|${dev('S', rd(n * E))}| < ${t}) ≥ 1 − ${n * V}/${t * t} = ${fmt(rd(1 - b))}.`)
    }),
    () => retry(() => {
      const n = pick([50, 100, 200]), s = pick([1, 2]), t = pick([20, 40, 50]), b = (n * s * s) / (t * t)
      return b < 1 && b >= 0.02 && isDec(b, 4) && probD(`Les ${n} étapes d’une tâche ont des durées indépendantes d’écart-type ${s} min chacune. Majore la probabilité que la durée totale s’écarte de sa moyenne d’au moins ${t} min.`, b,
        `V(S) = ${n} × ${s * s} = ${n * s * s}. P ≤ ${n * s * s}/${t * t} = ${fmt(rd(b))}.`)
    }),
  ),
  // Jeu : gain moyen sur n parties
  variants(
    () => retry(() => {
      const p = pick([0.4, 0.45, 0.48, 0.5]), n = pick([100, 400, 1000, 2500]), d = pick([0.1, 0.2]), m = rd(2 * p - 1), V = rd(1 - m * m), b = V / (n * d * d)
      return b < 1 && b >= 0.005 && probD(`À chaque partie, on gagne 1 écu avec la probabilité ${fmt(p)} et l’on en perd 1 sinon. Après ${n} parties, majore la probabilité que le gain moyen par partie s’écarte de ${fmt(m)} d’au moins ${fmt(d)}.`, b,
        `G vaut 1 ou −1 : E(G) = 2 × ${fmt(p)} − 1 = ${fmt(m)}, E(G²) = 1, V(G) = 1 − ${par(m)}² = ${fmt(V)}. P(|${dev('M_n', m)}| ≥ ${fmt(d)}) ≤ ${fmt(V)} ÷ (${n} × ${fmt(rd(d * d))}) ${isDec(b, 4) ? '=' : '≈'} ${fmt(rd(b, 4))}.`)
    }),
    () => retry(() => {
      const xs = [-1, 0, 2], ps = randProbs(3, 10), m = meanOf(xs, ps), V = varOf(xs, ps), n = pick([100, 200, 500]), d = pick([0.1, 0.2]), b = V / (n * d * d)
      return b < 1 && b >= 0.01 && isDec(V, 4) && probD(`Le gain G d’un jeu vaut −1, 0 ou 2 écus avec les probabilités ${ps.map(fmt).join(' ; ')}. On joue ${n} parties indépendantes. Majore la probabilité que le gain moyen s’écarte de E(G) d’au moins ${fmt(d)}.`, b,
        `E(G) = ${fmt(m)} ; E(G²) = ${fmt(rd(ps[0] + 4 * ps[2]))} ; V(G) = ${fmt(V)}. P ≤ ${fmt(V)} ÷ (${n} × ${fmt(rd(d * d))}) ${isDec(b, 4) ? '=' : '≈'} ${fmt(rd(b, 4))}.`)
    }),
    () => retry(() => {
      const V = randInt(1, 9), n = pick([100, 225, 400, 900]), d = pick([0.5, 1]), b = V / (n * d * d)
      return isDec(b, 4) && b >= 0.002 && probD(`Un jeu a un gain d’espérance μ et de variance ${V}. Minore la probabilité que le gain moyen sur ${n} parties soit à moins de ${fmt(d)} de μ.`, 1 - b,
        `P(|M_n − μ| < ${fmt(d)}) ≥ 1 − ${V} ÷ (${n} × ${fmt(d * d)}) = ${fmt(rd(1 - b))}.`)
    }),
  ),
]

// ═══ Palier 5 ═══════════════════════════════════════════════════════════
const tier5: Maker[] = [
  // Précision atteignable
  fresh(variants(
    () => retry(() => {
      const [n, a] = pick([[100, 0.04], [400, 0.01], [25, 0.04], [100, 0.25], [1000, 0.1], [50, 0.08], [200, 0.05]] as const), V = pick([1, 4, 9, 16, 25])
      const d = Math.sqrt(V / (n * a))
      return isDec(d, 4) && val(`M_n est la moyenne d’un échantillon de taille ${n} d’une loi de variance ${V}. Quelle précision δ l’inégalité de concentration garantit-elle avec un risque ${fmt(a)}, c’est-à-dire telle que ${F3('V', 'nδ²')} = ${fmt(a)} ?`, rd(d),
        `δ² = ${F3('V', 'nα')} = ${V} ÷ (${n} × ${fmt(a)}) = ${fmt(rd(d * d))}, donc δ = ${fmt(rd(d))}.`)
    }),
    () => retry(() => {
      const [n, a] = pick([[2500, 0.04], [10000, 0.01], [400, 0.25], [625, 0.04], [2500, 0.01], [1600, 0.0625]] as const)
      const d = 1 / (2 * Math.sqrt(n * a))
      return isDec(d, 4) && val(`Un sondage porte sur ${n} personnes ; la proportion p est inconnue (on utilise p(1 − p) ≤ 0,25). Avec un risque ${fmt(a)}, quelle précision δ l’inégalité de concentration garantit-elle ?`, rd(d),
        `${F3('0,25', 'nδ²')} = α ⇔ δ² = 0,25 ÷ (${n} × ${fmt(a)}) = ${fmt(rd(d * d, 8))} ⇔ δ = ${fmt(rd(d))}.`)
    }),
    () => retry(() => {
      const [n, a] = pick([[100, 0.04], [400, 0.01], [100, 0.25], [400, 0.04]] as const), s = pick([1, 2, 3, 5])
      const d = s / Math.sqrt(n * a)
      return isDec(d, 4) && val(`On mesure ${n} fois une distance, avec des mesures indépendantes d’écart-type ${s} cm. Quelle marge δ (en cm) l’inégalité de concentration garantit-elle autour de la vraie valeur, avec un risque ${fmt(a)} ?`, rd(d),
        `δ² = ${F3('σ²', 'nα')} = ${s * s} ÷ (${n} × ${fmt(a)}) = ${fmt(rd(d * d))}, δ = ${fmt(rd(d))} cm.`)
    }),
  )),
  // Nombre d'écarts-types nécessaire
  fresh(variants(
    () => {
      const q = pick([0.75, 0.96, 0.99, 0.9375, 0.84, 0.64]), exact = 1 / Math.sqrt(1 - q)
      return real(`Quelle est la plus petite valeur de k pour laquelle ${BT} garantit P(|X − μ| < kσ) ≥ ${fmt(q)} ?`, rd(exact),
        `1 − ${F3('σ²', '(kσ)²')} = 1 − 1/k² ≥ ${fmt(q)} ⇔ k² ≥ 1/${fmt(rd(1 - q))} = ${exactText(1 / (1 - q))} ⇔ k ≥ ${exactText(exact)}.`)
    },
    () => {
      const q = pick([0.8, 0.88, 0.9, 0.95, 0.97, 0.98]), r = 1 / Math.sqrt(1 - q), k = Math.ceil(r - 1e-9)
      return val(`Quel est le plus petit entier k tel que ${BT} garantisse P(|X − μ| < kσ) ≥ ${fmt(q)} ?`, k,
        `1 − 1/k² ≥ ${fmt(q)} ⇔ k² ≥ 1/${fmt(rd(1 - q))} ${isDec(1 / (1 - q), 2) ? '=' : '≈'} ${fmt(rd(1 / (1 - q), 2))} ⇔ k ≥ ${fmt(rd(r, 2))}. Le plus petit entier est ${k}.`)
    },
    () => {
      const [q, k] = pick([[0.75, 2], [0.96, 5], [0.99, 10], [0.9375, 4], [0.84, 2.5]] as const), s = randInt(2, 9), m = randInt(20, 90)
      return real(`X a pour espérance ${m} et pour écart-type ${s}. Donne la demi-largeur δ du plus petit intervalle ]${m} − δ ; ${m} + δ[ dont ${BT} garantit qu’il contient X avec une probabilité d’au moins ${fmt(q)}.`, rd(k * s),
        `1 − ${s * s}/δ² ≥ ${fmt(q)} ⇔ δ² ≥ ${s * s}/${fmt(rd(1 - q))} = ${exactText((s * s) / (1 - q))} ⇔ δ ≥ ${exactText(k * s)} (soit ${fmt(k)} écarts-types).`)
    },
    () => {
      const k = pick([2, 3, 4, 5, 10]), s = randInt(2, 6)
      return prob(`La note X d’un concours a pour écart-type ${s}. D’après ${BT}, quelle proportion maximale des candidats peut avoir une note s’écartant de la moyenne d’au moins ${k * s} points ?`, 1, k * k,
        `${k * s} points = ${k}σ ; P(|X − μ| ≥ ${k}σ) ≤ 1/${k * k}.`)
    },
  )),
  // Binomiale : une queue
  variants(
    () => retry(() => {
      const n = pick([100, 200, 400, 1000]), p = pick([0.1, 0.2, 0.5]), m = n * p, V = rd(n * p * (1 - p)), c = m + pick([10, 15, 20, 25, 30]), b = V / ((c - m) ** 2)
      return b < 1 && b >= 0.02 && isDec(b, 4) && probD(`X suit la loi binomiale B(${n} ; ${fmt(p)}). Majore P(X ≥ ${fmt(c)}) à l’aide de ${BT}.`, b,
        `E(X) = ${fmt(m)}, V(X) = ${fmt(V)}. X ≥ ${fmt(c)} ⇒ |X − ${fmt(m)}| ≥ ${fmt(c - m)}. Donc P(X ≥ ${fmt(c)}) ≤ ${fmt(V)}/${fmt((c - m) ** 2)} = ${fmt(rd(b))}.`)
    }),
    () => retry(() => {
      const n = pick([200, 300, 400, 500]), q = pick([0.05, 0.1]), m = rd(n * (1 - q)), V = rd(n * q * (1 - q)), extra = pick([10, 15, 20])
      const cap = rd(m + extra), b = V / (extra * extra)
      return b < 1 && b >= 0.01 && isDec(b, 4) && probD(`Un bac vend ${n} billets ; chaque passager se présente avec la probabilité ${fmt(rd(1 - q))}, indépendamment. Le bac n’a que ${fmt(cap)} places. Majore la probabilité que des passagers soient refusés (plus de ${fmt(cap)} présents).`, b,
        `X (présents) suit B(${n} ; ${fmt(rd(1 - q))}) : E = ${fmt(m)}, V = ${fmt(V)}. P(X > ${fmt(cap)}) ≤ P(|X − ${fmt(m)}| ≥ ${extra}) ≤ ${fmt(V)}/${extra * extra} = ${fmt(rd(b))}.`)
    }),
    () => retry(() => {
      const n = pick([400, 900, 1600]), m = n / 2, V = n / 4, t = pick([20, 30, 40, 50]), b = V / (t * t)
      return b < 1 && b >= 0.02 && isDec(b, 4) && probD(`On lance ${n} fois une pièce équilibrée. Majore la probabilité d’obtenir au moins ${m + t} « pile ».`, b,
        `X suit B(${n} ; 0,5) : E(X) = ${m}, V(X) = ${V}. P(X ≥ ${m + t}) ≤ P(|X − ${m}| ≥ ${t}) ≤ ${V}/${t * t} = ${fmt(rd(b))}.`)
    }),
  ),
  // Deux étapes : loi → μ, V → n
  fresh(variants(
    ...[0, 1, 2].map((form) => () => retry(() => {
      const xs = form === 2 ? [-1, 1, 3] : [0, 1, 2], ps = randProbs(3, 10), m = meanOf(xs, ps), V = varOf(xs, ps), a = pick([0.05, 0.1]), d = pick([0.1, 0.2]), n = nMin(V, a, d)
      if (V === 0 || !isDec(V, 4)) return null
      const intro = form === 0 ? `X suit la loi : P(X = 0) = ${fmt(ps[0])} ; P(X = 1) = ${fmt(ps[1])} ; P(X = 2) = ${fmt(ps[2])}.`
        : form === 1 ? `Le nombre X de buts marqués par une équipe vaut 0, 1 ou 2 avec les probabilités ${ps.map(fmt).join(' ; ')}.`
          : `Le gain X d’un jeu vaut −1, 1 ou 3 écus avec les probabilités ${ps.map(fmt).join(' ; ')}.`
      return val(`${intro} Quelle taille minimale n d’échantillon garantit, par l’inégalité de concentration, P(|M_n − E(X)| ≥ ${fmt(d)}) ≤ ${fmt(a)} ?`, n,
        `E(X) = ${fmt(m)}, V(X) = ${xs.map((x, i) => `${fmt(ps[i])} × ${par(rd(x - m))}²`).join(' + ')} = ${fmt(V)}. n ≥ ${fmt(V)} ÷ (${fmt(a)} × ${fmt(rd(d * d))}) = ${fmt(rd(V / (a * d * d), 3))}, donc n = ${n}.`)
    })),
  )),
  // Mise à l'échelle de n
  fresh(variants(
    () => {
      const n = pick([100, 250, 400, 500, 1000]), k = pick([2, 3, 4, 5])
      return val(`Avec n = ${n} répétitions, l’inégalité de concentration garantit une précision δ au risque α. Combien de répétitions faut-il pour garantir une précision ${k} fois meilleure (δ/${k}) au même risque ?`, n * k * k,
        `La borne ${F3('V', 'nδ²')} reste égale à α si n δ² est constant : diviser δ par ${k} impose de multiplier n par ${k * k}, soit ${n * k * k}.`)
    },
    () => {
      const n = pick([200, 400, 500, 1000]), k = pick([2, 4, 5, 10])
      return val(`Avec n = ${n}, l’inégalité de concentration donne un risque α pour une précision δ fixée. Combien faut-il de répétitions pour diviser ce risque par ${k} ?`, n * k,
        `La borne ${F3('V', 'nδ²')} est inversement proportionnelle à n : il faut ${k} fois plus de répétitions, soit ${n * k}.`)
    },
    () => {
      const n = pick([400, 900, 1600, 2500]), k = pick([2, 3, 4])
      return val(`Un sondage de ${n} personnes garantit une précision δ (au risque α). Pour le même risque, quelle précision obtient-on avec ${n * k * k} personnes ? Donne le rapport δ/δ′ entre l’ancienne et la nouvelle précision.`, k,
        `δ² est inversement proportionnel à n : n multiplié par ${k * k} ⇒ δ divisé par ${k}. Rapport : ${k}.`)
    },
  )),
]

// ═══ Problèmes d'amélioration ═══════════════════════════════════════════
const upgrades: [Maker[], Maker[], Maker[]] = [
  [
    // Borne de BT et vraie probabilité
    () => retry(() => {
      const ps = randProbs(5, 20), xs = [0, 1, 2, 3, 4], m = meanOf(xs, ps), V = varOf(xs, ps)
      if (m !== 2) return null
      const exact = rd(ps[0] + ps[4])
      return probD(`X prend les valeurs 0, 1, 2, 3, 4 avec les probabilités ${ps.map(fmt).join(' ; ')} (E(X) = 2, V(X) = ${fmt(V)}). Calcule la valeur exacte de P(|X − 2| ≥ 2), que l’on comparera à la borne ${fmt(rd(V / 4))} donnée par ${BT}.`, exact,
        `|X − 2| ≥ 2 ⇔ X = 0 ou X = 4 : P = ${fmt(ps[0])} + ${fmt(ps[4])} = ${fmt(exact)}, à comparer à la borne V/4 = ${fmt(rd(V / 4))}${exact <= V / 4 ? ' : la majoration est vérifiée, mais grossière.' : '.'}`)
    }),
    // Quand la borne est-elle utile ?
    () => retry(() => {
      const V = randInt(2, 60), s = Math.sqrt(V)
      if (Number.isInteger(s)) return null
      const d = Math.floor(s) + 1
      return val(`V(X) = ${V}. Quel est le plus petit entier δ pour lequel ${BT} donne une majoration de P(|X − E(X)| ≥ δ) strictement inférieure à 1 (donc informative) ?`, d,
        `${V}/δ² < 1 ⇔ δ² > ${V} ⇔ δ > √${V} ≈ ${fmt(rd(s, 2))}. Le plus petit entier est ${d}.`)
    }),
    // Somme de parties
    () => retry(() => {
      const n = pick([20, 50, 100]), V = randInt(1, 6), t = pick([20, 25, 50]), b = (n * V) / (t * t)
      return b < 1 && b > 0.01 && isDec(b, 4) && probD(`${prenom()} joue ${n} parties indépendantes d’un jeu dont le gain a pour variance ${V}. Majore la probabilité que son gain total s’écarte de son espérance d’au moins ${t} écus.`, b,
        `V(S) = ${n} × ${V} = ${n * V} ; P(|S − E(S)| ≥ ${t}) ≤ ${n * V}/${t * t} = ${fmt(rd(b))}.`)
    }),
  ],
  [
    () => retry(() => {
      const a = pick([0.05, 0.1]), d = pick([0.02, 0.03, 0.05]), n = nMin(0.25, a, d)
      const what = pick(['la part des habitants favorables à un nouveau marché', 'la proportion de foyers possédant un cheval', 'la part des clients satisfaits', 'la proportion d’électeurs d’un candidat', 'la part des pièces défectueuses d’un stock'])
      return val(`Un institut veut estimer ${what} (proportion inconnue) à ${pct(d)} près, avec un risque au plus ${pct(a)}. Combien de personnes doit-il interroger au minimum d’après l’inégalité de concentration (avec p(1 − p) ≤ 0,25) ?`, n,
        `n ≥ ${F3('0,25', 'αδ²')} = 0,25 ÷ (${fmt(a)} × ${fmt(rd(d * d))}) = ${fmt(rd(0.25 / (a * d * d), 3))}, donc n = ${n}.`)
    }),
    () => retry(() => {
      const [n, a] = pick([[2500, 0.04], [10000, 0.01], [400, 0.25], [625, 0.04], [1600, 0.0625], [10000, 0.04]] as const)
      const d = 1 / (2 * Math.sqrt(n * a))
      return isDec(d, 4) && val(`On interroge ${n} ${pick(['villageois', 'clients', 'électeurs', 'voyageurs', 'artisans'])} pour estimer une proportion inconnue p. Quelle précision δ peut-on garantir avec un risque ${fmt(a)} (inégalité de concentration et p(1 − p) ≤ 0,25) ?`, rd(d),
        `δ² = 0,25 ÷ (${n} × ${fmt(a)}) = ${fmt(rd(d * d, 8))}, δ = ${fmt(rd(d))}.`)
    }),
    () => {
      const N = pick([1000, 2500, 5000]), k = pick([2, 3])
      const what = pick(['lancers d’une pièce', 'lancers d’une punaise', 'tirages dans une urne', 'tirs à l’arc'])
      return val(`Avec ${N} ${what}, l’inégalité de concentration assure une précision de 0,0${k === 2 ? 4 : 6} sur une fréquence, au risque α. Combien en faut-il pour une précision de 0,02 au même risque ?`, N * k * k,
        `Diviser la précision par ${k} impose de multiplier n par ${k * k} : ${N} × ${k * k} = ${N * k * k}.`)
    },
  ],
  [
    // Binomiale, intervalle non centré
    () => retry(() => {
      const n = pick([100, 200, 400]), p = pick([0.2, 0.3, 0.5]), m = n * p, V = rd(n * p * (1 - p)), d1 = randInt(8, 20), d2 = randInt(8, 20)
      if (d1 === d2) return null
      const d = Math.min(d1, d2), b = V / (d * d)
      return b < 1 && b > 0.02 && isDec(b, 4) && probD(`X suit la loi binomiale B(${n} ; ${fmt(p)}). En utilisant ${BT}, minore P(${fmt(m - d1)} < X < ${fmt(m + d2)}).`, 1 - b,
        `E(X) = ${fmt(m)}, V(X) = ${fmt(V)}. L’intervalle contient ]${fmt(m - d)} ; ${fmt(m + d)}[ (δ = ${d}, le plus petit écart). P ≥ 1 − ${fmt(V)}/${d * d} = ${fmt(rd(1 - b))}.`)
    }),
    // Loi → n
    () => retry(() => {
      const xs = [1, 2, 3, 4], ps = randProbs(4, 10), V = varOf(xs, ps), a = 0.05, d = pick([0.1, 0.2]), n = nMin(V, a, d)
      if (V === 0 || !isDec(V, 4)) return null
      const what = pick(['Le nombre X de clients servis par minute', 'Le nombre X de poissons pêchés par heure', 'La note X attribuée à un vin', 'Le nombre X de pannes par mois'])
      return withMeta(val(`${what} suit la loi du tableau ci-dessous. Quelle taille minimale n d’échantillon garantit, d’après l’inégalité de concentration, que la moyenne M_n soit à moins de ${fmt(d)} de E(X) avec une probabilité d’au moins 0,95 ?`, n,
        `E(X) = ${fmt(meanOf(xs, ps))}, V(X) = ${fmt(V)}. n ≥ ${fmt(V)} ÷ (0,05 × ${fmt(rd(d * d))}) = ${fmt(rd(V / (a * d * d), 3))}, donc n = ${n}.`),
      { figure: lawTable(xs.map(fmt), ps.map(fmt)) })
    }),
    // Le casino gagne toujours
    () => retry(() => {
      const p = pick([0.45, 0.46, 0.47, 0.48, 0.49]), n = pick([10000, 20000, 40000, 100000]), m = rd(2 * p - 1), V = rd(1 - m * m), b = V / (n * m * m)
      return b < 1 && b >= 0.01 && probD(`À la roulette ${pick(['du port', 'de la foire', 'du casino de la côte', 'de la taverne'])}, ${prenom()} gagne 1 écu avec la probabilité ${fmt(p)} et en perd 1 sinon. Ce joueur fait ${n} parties. Majore la probabilité que son gain moyen par partie soit positif ou nul (arrondi au millième).`, b,
        `E(G) = ${fmt(m)}, V(G) = 1 − ${par(m)}² = ${fmt(V)}. M_n ≥ 0 ⇒ |M_n − (${fmt(m)})| ≥ ${fmt(-m)}. P ≤ ${fmt(V)} ÷ (${n} × ${fmt(rd(m * m))}) ≈ ${fmt(rd(b, 4))} : sur un grand nombre de parties, le joueur perd presque sûrement.`)
    }),
  ],
]

// ═══ Problèmes de l'hôtel de ville ══════════════════════════════════════
const age: [Maker[], Maker[], Maker[]] = [
  [
    () => retry(() => {
      const m = pick([25, 40, 50]), s = pick([0.5, 1, 2]), d = pick([1, 2, 4, 5]), b = (s * s) / (d * d)
      return b < 1 && isDec(b, 4) && T('Les sacs de la meunière', probD(`Au moulin, la masse X d’un sac de farine a pour espérance ${m} kg et pour écart-type ${fmt(s)} kg. Le seigneur refuse les sacs dont la masse s’écarte de ${m} kg d’au moins ${d} kg. Majore la proportion de sacs refusés.`, b,
        `V(X) = ${fmt(rd(s * s))}. ${btLine(fmt(m), fmt(d), fmt(rd(s * s)), fmt(rd(b)))}`))
    }),
    () => retry(() => {
      const n = pick([100, 200]), p = pick([0.8, 0.9, 0.5]), d = pick([10, 15]), m = n * p, V = rd(n * p * (1 - p)), b = V / (d * d)
      return b < 1 && isDec(b, 4) && T('Le grand concours de tir', probD(`Au grand concours, ${prenom()} tire ${n} flèches ; chacune touche la cible avec la probabilité ${fmt(p)}, indépendamment. Minore la probabilité que le nombre de flèches dans la cible soit strictement compris entre ${fmt(m - d)} et ${fmt(m + d)}.`, 1 - b,
        `X suit B(${n} ; ${fmt(p)}) : E(X) = ${fmt(m)}, V(X) = ${fmt(V)}. P(|X − ${fmt(m)}| < ${d}) ≥ 1 − ${fmt(V)}/${d * d} = ${fmt(rd(1 - b))}.`))
    }),
    () => retry(() => {
      const m = randInt(10, 40) * 10, [d, V] = niceBound(), d2 = d * 5, V2 = V * 25
      return T('Le péage du pont', prob(`Le nombre X de charrettes passant chaque jour au péage du pont a pour espérance ${m} et pour variance ${V2}. Le péager prévoit des jetons pour un nombre de passages compris strictement entre ${m - d2} et ${m + d2}. Minore la probabilité que sa prévision soit bonne un jour donné.`, d2 * d2 - V2, d2 * d2,
        `P(|X − ${m}| < ${d2}) ≥ 1 − ${V2}/${d2 * d2} = ${fmtFrac(d2 * d2 - V2, d2 * d2)}.`))
    }),
  ],
  [
    () => retry(() => {
      const a = pick([0.05, 0.1]), d = pick([0.05, 0.1]), n = nMin(0.25, a, d)
      const what = pick(['approuve un nouvel impôt', 'souhaite un nouveau pont', 'préfère la foire au printemps', 'soutient la construction d’un rempart'])
      return T('Le sondage du royaume', val(`${pick(['Le roi', 'La reine'])} veut savoir quelle part p de ses sujets ${what}, à ${fmt(d)} près, avec un risque d’erreur au plus ${fmt(a)}. Ses hérauts interrogeront n sujets choisis au hasard. Combien doivent-ils en interroger au minimum, d’après l’inégalité de concentration (p(1 − p) ≤ 0,25) ?`, n,
        `n ≥ ${F3('0,25', 'αδ²')} = 0,25 ÷ (${fmt(a)} × ${fmt(rd(d * d))}) = ${fmt(rd(0.25 / (a * d * d), 3))}, donc n = ${n}.`))
    }),
    () => retry(() => {
      const xs = [-2, 0, 3], ps = randProbs(3, 10), m = meanOf(xs, ps), V = varOf(xs, ps), n = pick([100, 200, 400]), d = pick([0.2, 0.5]), b = V / (n * d * d)
      if (!isDec(V, 4) || b >= 1 || b < 0.005) return null
      return T('Le jeu de la taverne', probD(`À la taverne ${pick(['du port', 'du Lion d’or', 'des Trois Chopes', 'du marché'])}, le gain G d’une partie (en écus) suit la loi du tableau ci-dessous. ${prenom()}, un marin de passage, joue ${n} parties indépendantes. Majore la probabilité que son gain moyen s’écarte de E(G) d’au moins ${fmt(d)} écu.`, b,
        `E(G) = ${fmt(m)}, V(G) = ${xs.map((x, i) => `${fmt(ps[i])} × ${par(rd(x - m))}²`).join(' + ')} = ${fmt(V)}. P(|M_n − E(G)| ≥ ${fmt(d)}) ≤ ${fmt(V)} ÷ (${n} × ${fmt(rd(d * d))}) ${isDec(b, 4) ? '=' : '≈'} ${fmt(rd(b, 4))}.`),
      lawTable(xs.map(fmt), ps.map(fmt), ['g', 'P(G = g)']))
    }),
    () => retry(() => {
      const xs = [1, 2, 3, 4, 5], ps = randProbs(5, 20), m = meanOf(xs, ps), V = varOf(xs, ps), d = 2
      if (m !== 3 || V === 0 || V >= 4 || Math.max(...ps) > 0.55) return null
      const exact = rd(ps[0] + ps[4])
      return T('La qualité des fers', probD(`Le forgeron ${pick(['du bourg', 'du château', 'de la caserne', 'du port'])}, aidé de ${prenom()}, note X le nombre de défauts relevés sur un lot de fers ; la loi de X est représentée ci-dessous (E(X) = 3). Calcule V(X), puis majore P(|X − 3| ≥ 2) à l’aide de ${BT}.`, V / 4,
        `V(X) = ${xs.map((x, i) => `${fmt(ps[i])} × ${par(x - 3)}²`).join(' + ')} = ${fmt(V)}. P(|X − 3| ≥ ${d}) ≤ ${fmt(V)}/4 = ${fmt(rd(V / 4))} (la vraie valeur, P(X = 1) + P(X = 5) = ${fmt(exact)}, est bien plus petite).`),
      barsFigure(xs, ps, 0.6, 0.1))
    }),
  ],
  [
    () => retry(() => {
      const a = pick([0.05, 0.1]), d = pick([0.02, 0.03, 0.04]), n = nMin(0.25, a, d)
      return T('L’élection du maire', val(`Deux candidats se disputent la mairie de ${pick(['Montfort', 'Beaulieu', 'Roquebrune', 'Vaucelles', 'Clairval'])}. Un crieur veut annoncer la part p de voix du premier candidat à ${pct(d)} près, avec un risque d’erreur au plus ${pct(a)}. Combien d’électeurs doit-il interroger au minimum, d’après l’inégalité de concentration (p(1 − p) ≤ 0,25) ?`, n,
        `n ≥ ${F3('0,25', 'αδ²')} = 0,25 ÷ (${fmt(a)} × ${fmt(rd(d * d))}) = ${fmt(rd(0.25 / (a * d * d), 3))}, donc n = ${n}.`))
    }),
    () => retry(() => {
      const d = pick([0.01, 0.02, 0.05]), a = pick([0.05, 0.1]), n = nMin(0.25, a, d), who = prenom()
      return T('Les lancers de pièces', val(`${who} veut vérifier qu’une pièce est équilibrée. Si elle l’est, combien de lancers faut-il au minimum pour que la fréquence de « pile » soit à moins de ${fmt(d)} de 0,5 avec une probabilité d’au moins ${fmt(rd(1 - a))}, d’après l’inégalité de concentration ?`, n,
        `p = 0,5, V = 0,25. n ≥ 0,25 ÷ (${fmt(a)} × ${fmt(rd(d * d))}) = ${fmt(rd(0.25 / (a * d * d), 3))}, donc n = ${n} lancers.`))
    }),
    () => retry(() => {
      const n = pick([25, 36, 49, 64, 100]), m = randInt(20, 40), s = pick([1, 2, 3]), marge = pick([20, 30, 40, 50]), cap = n * m + marge, V = n * s * s, b = V / (marge * marge)
      return b < 1 && b >= 0.01 && isDec(b, 4) && T('La caravane', probD(`Une caravane de chameaux transporte ${n} ballots ; chaque ballot pèse en moyenne ${m} kg, avec un écart-type de ${s} kg, indépendamment des autres. Le bac qui doit faire traverser le fleuve supporte ${cap} kg. Majore la probabilité que la charge totale atteigne ou dépasse ${cap} kg.`, b,
        `S = somme des ${n} masses : E(S) = ${n * m}, V(S) = ${n} × ${s * s} = ${V}. S ≥ ${cap} ⇒ |S − ${n * m}| ≥ ${marge}, donc P ≤ ${V}/${marge * marge} = ${fmt(rd(b))}.`))
    }),
  ],
]

export const CONTENT: SubjectContent | null = {
  tiers: [tier1, tier2, tier3, tier4, tier5],
  upgrades,
  age,
}
