// Sommes de variables aléatoires (Terminale, spécialité) : loi, espérance, variance, écart-type, linéarité,
// somme de variables indépendantes, moyenne d'un échantillon, jeux et gains.
// Public adulte : « remise en jambes » joue les paliers 1 à 3, « aguerris » les paliers 2 à 5.
import {
  evalExpr, fmt, fresh, parseExpr, parseNumber, pick, randInt, shuffle, variants, withMeta,
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
const T = (title: string, ex: Exercise, figure?: Figure): Exercise => withMeta(ex, figure ? { title, figure } : { title })
const sum = (a: number[]) => a.reduce((s, v) => s + v, 0)
/** Nombre entre parenthèses s'il est négatif. */
const par = (v: number) => (v < 0 ? `(${fmt(v)})` : fmt(v))
/** « + 3 » ou « − 3 ». */
const sgn = (v: number) => (v < 0 ? `− ${fmt(-v)}` : `+ ${fmt(v)}`)
/** Coefficient devant une lettre : 1 → rien, −1 → « − ». */
const co = (c: number) => (c === 1 ? '' : c === -1 ? '−' : fmt(c))
/** a × X + b écrit proprement : 3X − 2, −X + 4, X + 1… */
const aff = (a: number, b: number, X = 'X') => `${a === 1 ? '' : a === -1 ? '−' : fmt(a)}${X}${b === 0 ? '' : ` ${sgn(b)}`}`

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b))
/** Fraction réduite a/b en texte (ou entier). */
function fmtFrac(a: number, b: number): string {
  const g = gcd(Math.abs(a), b) || 1
  const n = a / g, d = b / g
  return d === 1 ? fmt(n) : `${n < 0 ? '−' : ''}${Math.abs(n)}/${d}`
}
/** Fraction empilée dans un énoncé. */
const F = (a: string, b: string) => `{${a}/${b}}`
/** Valeur exacte donnée en fraction : l'arrondi au millième est aussi accepté. */
const fracVal = (prompt: string, a: number, b: number, explanation: string) =>
  val(prompt, a / b, explanation, { answer: fmtFrac(a, b), tol: isDec(a / b, 4) ? 1e-6 : 1e-3, hint: 'Fraction, ou valeur arrondie au millième' })

/** Lit un nombre : décimal, fraction, pourcentage, calcul numérique ; ignore une unité finale (€, écus, kg…). */
function readVal(raw: string): number {
  let s = raw.trim().replace(/\s*(€|euros?|écus?|kg|min|minutes?|points?|pièces?|km|h)\.?$/i, '').replace(/\s+/g, '')
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

/** Réponse numérique : exacte (tol très petite) ou arrondie (tol précisée, avec consigne dans l'énoncé). */
function val(prompt: string, value: number, explanation: string, o: { tol?: number; answer?: string; hint?: string } = {}): Exercise {
  const tol = o.tol ?? 1e-6
  return {
    prompt,
    kind: 'input',
    answer: o.answer ?? (tol >= 0.01 ? fmt(rd(value, 2)) : tol >= 0.001 && !isDec(value, 4) ? fmt(rd(value, 3)) : fmt(rd(value, 6))),
    explanation,
    inputHint: o.hint ?? (tol >= 0.01 ? 'Valeur arrondie au centième' : 'Ta réponse'),
    format: 'un nombre, par exemple −3 ; 2,5 ou 7/4',
    keypad: ['−', '/', ',', '√', '(', ')'],
    isValid: (v) => !Number.isNaN(readVal(v)),
    check: (v) => Math.abs(readVal(v) - value) <= tol * Math.max(1, tol < 1e-3 ? Math.abs(value) : 1) + 1e-9,
  }
}
/** Probabilité (exacte ou arrondie au millième). */
const prob = (prompt: string, value: number, explanation: string) =>
  val(prompt, value, explanation, { tol: isDec(value, 4) ? 1e-6 : 1e-3, hint: 'Valeur exacte ou arrondie au millième' })

/** k entiers ≥ 1 de somme N (au hasard). */
function parts(k: number, N: number): number[] {
  const cuts = shuffle(Array.from({ length: N - 1 }, (_, i) => i + 1)).slice(0, k - 1).sort((a, b) => a - b)
  return [...cuts, N].map((c, i) => c - (i ? cuts[i - 1] : 0))
}
/** Loi de k valeurs : probabilités multiples de 1/N. */
const randProbs = (k: number, N = 20) => parts(k, N).map((x) => rd(x / N))
/** k entiers distincts triés dans [a ; b]. */
const randVals = (k: number, a: number, b: number) => shuffle(Array.from({ length: b - a + 1 }, (_, i) => a + i)).slice(0, k).sort((x, y) => x - y)
const mean = (xs: number[], ps: number[]) => rd(sum(xs.map((x, i) => x * ps[i])))
const variance = (xs: number[], ps: number[]) => {
  const m = mean(xs, ps)
  return rd(sum(xs.map((x, i) => ps[i] * (x - m) ** 2)))
}
/** Somme Σ x × p écrite sans les termes nuls. */
const eSum = (xs: number[], ps: number[]) => xs.map((x, i) => (x === 0 ? '' : `${par(x)} × ${fmt(ps[i])}`)).filter(Boolean).join(' + ') || '0'
const lawText = (xs: number[], ps: number[], X = 'X') => xs.map((x, i) => `P(${X} = ${fmt(x)}) = ${fmt(ps[i])}`).join(' ; ')

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
const tableOf = (xs: number[], ps: (number | string)[], heads?: [string, string]) =>
  lawTable(xs.map(fmt), ps.map((p) => (typeof p === 'number' ? fmt(p) : p)), heads)

/** Diagramme en bâtons d'une loi, probabilités écrites au-dessus des bâtons. */
function barsFigure(ks: number[], ps: number[], ymax: number, ystep: number, names: [string, string] = ['x', 'P(X = x)']): Figure {
  const w = 320, h = 220, X0 = 46, Y0 = 188, Xe = 306, Ytop = 26
  const slot = (Xe - X0) / ks.length, bw = Math.min(18, slot * 0.4)
  const Y = (v: number) => Y0 - (v / ymax) * (Y0 - Ytop)
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
    const cx = X0 + slot * (i + 0.5), yt = Y(ps[i]), id = `b${i}`
    points[`${id}1`] = { x: cx - bw / 2, y: Y0, hidden: true, label: '' }
    points[`${id}2`] = { x: cx + bw / 2, y: Y0, hidden: true, label: '' }
    points[`${id}3`] = { x: cx + bw / 2, y: yt, hidden: true, label: '' }
    points[`${id}4`] = { x: cx - bw / 2, y: yt, hidden: true, label: '' }
    polygons.push({ pts: [`${id}1`, `${id}2`, `${id}3`, `${id}4`], fill: '#d9a441' })
    segments.push({ a: `${id}1`, b: `${id}4` }, { a: `${id}4`, b: `${id}3` }, { a: `${id}3`, b: `${id}2` })
    notes.push({ x: cx, y: Y0 + 16, text: fmt(k) }, { x: cx, y: yt - 5, text: fmt(ps[i]) })
  })
  notes.push({ x: 84, y: 14, text: names[1] }, { x: Xe + 6, y: Y0 - 8, text: names[0] })
  return { w, h, points, segments, polygons, notes, caption: '' }
}

// ── Contextes de lois ───────────────────────────────────────────────────
interface LawCtx { intro: string; X: string; unit: string; lo: number; hi: number }
const LAW_CTX: LawCtx[] = [
  { intro: 'Au marché, on note X le nombre de pains invendus en fin de journée chez la boulangère.', X: 'X', unit: '', lo: 0, hi: 6 },
  { intro: 'On note X le nombre de buts marqués par une équipe lors d’un match.', X: 'X', unit: '', lo: 0, hi: 5 },
  { intro: 'On note X le nombre de clients servis en une heure à l’auberge.', X: 'X', unit: '', lo: 2, hi: 9 },
  { intro: 'On note X le nombre de chevaux qui arrivent au relais de poste dans la matinée.', X: 'X', unit: '', lo: 1, hi: 8 },
  { intro: 'On note X le nombre de messages reçus par un standard en une minute.', X: 'X', unit: '', lo: 0, hi: 6 },
  { intro: 'On note X le nombre de tonneaux livrés chaque jour à la taverne.', X: 'X', unit: '', lo: 1, hi: 7 },
]
interface GameCtx { intro: string; G: string }
const GAME_CTX: GameCtx[] = [
  { intro: 'À la foire, une roue de la fortune rapporte un gain algébrique G (en écus, négatif en cas de perte).', G: 'G' },
  { intro: 'Dans un jeu de dés de la taverne, on note G le gain algébrique du joueur (en écus).', G: 'G' },
  { intro: 'Un jeu à gratter rapporte un gain algébrique G (en euros, mise déduite).', G: 'G' },
  { intro: 'Au jeu de l’urne du marchand, on note G le gain algébrique du joueur (en écus).', G: 'G' },
]

// ═══ Palier 1 ═══════════════════════════════════════════════════════════
const tier1: Maker[] = [
  // Compléter une loi
  variants(
    () => {
      const k = randInt(3, 5), c = pick(LAW_CTX), xs = randVals(k, c.lo, c.hi), ps = randProbs(k), j = randInt(0, k - 1)
      return withMeta(prob(`${c.intro} Sa loi est donnée dans le tableau ci-dessous, où une probabilité manque. Que vaut P(X = ${xs[j]}) ?`, ps[j],
        `La somme des probabilités vaut 1 : P(X = ${xs[j]}) = 1 − (${ps.filter((_, i) => i !== j).map(fmt).join(' + ')}) = ${fmt(ps[j])}.`),
      { figure: tableOf(xs, ps.map((p, i) => (i === j ? '?' : p))) })
    },
    () => {
      const k = randInt(3, 4), xs = randVals(k, -3, 8), ps = randProbs(k), j = randInt(0, k - 1)
      return prob(`Une variable aléatoire X prend les valeurs ${xs.map(fmt).join(' ; ')}. On sait que ${lawText(xs.filter((_, i) => i !== j), ps.filter((_, i) => i !== j))}. Calcule P(X = ${fmt(xs[j])}).`, ps[j],
        `Les probabilités d’une loi ont pour somme 1 : P(X = ${fmt(xs[j])}) = 1 − ${fmt(rd(1 - ps[j]))} = ${fmt(ps[j])}.`)
    },
    () => {
      const ps = randProbs(4), j = randInt(1, 3), names = ['0 enfant', '1 enfant', '2 enfants', '3 enfants ou plus']
      return prob(`Dans un village, on choisit une famille au hasard. Elle a ${names.filter((_, i) => i !== j).map((nm, i) => `${nm} avec la probabilité ${fmt(ps.filter((_, t) => t !== j)[i])}`).join(', ')}. Quelle est la probabilité qu’elle ait ${names[j]} ?`, ps[j],
        `1 − (${ps.filter((_, i) => i !== j).map(fmt).join(' + ')}) = ${fmt(ps[j])}.`)
    },
    () => {
      const ps = randProbs(3), g = randVals(3, 1, 10).map((x) => x * 5)
      return prob(`Une roue de loterie fait gagner ${g[0]} €, ${g[1]} € ou ${g[2]} €. On gagne ${g[0]} € avec la probabilité ${fmt(ps[0])} et ${g[2]} € avec la probabilité ${fmt(ps[2])}. Quelle est la probabilité de gagner ${g[1]} € ?`, ps[1],
        `1 − ${fmt(ps[0])} − ${fmt(ps[2])} = ${fmt(ps[1])}.`)
    },
  ),
  // Espérance d'une loi simple
  fresh(variants(
    () => {
      const k = 3, c = pick(LAW_CTX), xs = randVals(k, c.lo, c.hi), ps = randProbs(k, 10)
      return withMeta(val(`${c.intro} Sa loi est donnée dans le tableau ci-dessous. Calcule l’espérance E(X).`, mean(xs, ps),
        `E(X) = ${eSum(xs, ps)} = ${fmt(mean(xs, ps))}.`), { figure: tableOf(xs, ps) })
    },
    () => {
      const xs = randVals(2, 0, 10), ps = randProbs(2, 10)
      return val(`X prend la valeur ${xs[0]} avec la probabilité ${fmt(ps[0])} et la valeur ${xs[1]} avec la probabilité ${fmt(ps[1])}. Calcule E(X).`, mean(xs, ps),
        `E(X) = ${eSum(xs, ps)} = ${fmt(mean(xs, ps))}.`)
    },
    () => {
      const a = randInt(2, 10), b = randInt(1, 10)
      return val(`On lance une pièce équilibrée : pile fait gagner ${a} écus, face fait perdre ${b} écus. Quelle est l’espérance du gain algébrique ?`, (a - b) / 2,
        `E(G) = ${a} × 0,5 + (−${b}) × 0,5 = ${fmt((a - b) / 2)} écus.`)
    },
    () => {
      const xs = randVals(3, -2, 6), ps = randProbs(3, 10)
      return val(`La loi de X est : ${lawText(xs, ps)}. Calcule E(X).`, mean(xs, ps), `E(X) = ${eSum(xs, ps)} = ${fmt(mean(xs, ps))}.`)
    },
  )),
  // Linéarité de l'espérance : E(aX + b)
  fresh(variants(
    () => {
      const E = rd(randInt(-30, 60) / 10), a = pick([-3, -2, 2, 3, 4, 5]), b = randInt(-9, 9)
      return val(`On sait que E(X) = ${fmt(E)}. Calcule E(${aff(a, b)}).`, rd(a * E + b), `E(aX + b) = aE(X) + b : ${fmt(a)} × ${par(E)}${b === 0 ? '' : ` ${sgn(b)}`} = ${fmt(rd(a * E + b))}.`)
    },
    () => {
      const E = randInt(5, 40), a = pick([2, 3, 4, 5]), b = randInt(2, 20)
      return val(`Chez le forgeron, une commande de X fers à cheval coûte ${a}X + ${b} écus (${a} écus le fer et ${b} écus de déplacement). En moyenne, on commande ${E} fers. Quel est le prix moyen d’une commande ?`, a * E + b,
        `E(${a}X + ${b}) = ${a} × E(X) + ${b} = ${a} × ${E} + ${b} = ${a * E + b} écus.`)
    },
    () => {
      const E = rd(randInt(50, 300) / 10)
      return val(`La température moyenne d’un mois (en °C) a pour espérance ${fmt(E)}. En degrés Fahrenheit, F = 1,8C + 32. Quelle est l’espérance de F ?`, rd(1.8 * E + 32),
        `E(1,8C + 32) = 1,8 × ${fmt(E)} + 32 = ${fmt(rd(1.8 * E + 32))} °F.`)
    },
    () => {
      const E = rd(randInt(10, 60) / 10), a = pick([5, 10, 20]), b = pick([5, 10, 15, 20, 25])
      return val(`Un joueur gagne ${a} écus par cible touchée mais paie ${b} écus pour jouer. Il touche en moyenne ${fmt(E)} cibles. Quelle est l’espérance de son gain algébrique G = ${a}X − ${b} ?`, rd(a * E - b),
        `E(G) = ${a} × ${fmt(E)} − ${b} = ${fmt(rd(a * E - b))} écus.`)
    },
  )),
  // Espérance d'une somme
  fresh(variants(
    () => {
      const a = rd(randInt(-20, 50) / 10), b = rd(randInt(-20, 50) / 10)
      return val(`E(X) = ${fmt(a)} et E(Y) = ${fmt(b)}. Calcule E(X + Y).`, rd(a + b), `E(X + Y) = E(X) + E(Y) = ${fmt(a)} + ${par(b)} = ${fmt(rd(a + b))}.`)
    },
    () => {
      const a = randInt(10, 40), b = randInt(10, 40), c = randInt(5, 30)
      return val(`Un messager fait trois étapes dont les durées (en minutes) ont pour espérances ${a}, ${b} et ${c}. Quelle est la durée moyenne du trajet complet ?`, a + b + c,
        `L’espérance d’une somme est la somme des espérances : ${a} + ${b} + ${c} = ${a + b + c} min.`)
    },
    () => {
      const n = randInt(2, 6)
      return val(`On lance ${n} dés équilibrés à six faces. Quelle est l’espérance de la somme des points obtenus ?`, 3.5 * n,
        `Un dé a pour espérance (1 + 2 + … + 6) ÷ 6 = 3,5. Par linéarité, la somme a pour espérance ${n} × 3,5 = ${fmt(3.5 * n)}.`)
    },
    () => {
      const a = rd(randInt(10, 80) / 10), b = rd(randInt(10, 80) / 10)
      return val(`E(X) = ${fmt(a)} et E(Y) = ${fmt(b)}. Calcule E(X − Y).`, rd(a - b), `E(X − Y) = E(X) − E(Y) = ${fmt(a)} − ${fmt(b)} = ${fmt(rd(a - b))}.`)
    },
  )),
  // Probabilité d'un événement lue dans la loi
  fresh(variants(
    ...(['le', 'ge', 'lt', 'between'] as const).map((kind) => () => retry(() => {
      const k = 5, c = pick(LAW_CTX), xs = randVals(k, c.lo, c.hi), ps = randProbs(k), j = randInt(1, 3)
      const sel = xs.map((_, i) => (kind === 'le' ? i <= j : kind === 'ge' ? i >= j : kind === 'lt' ? i < j : i >= j - 1 && i <= j))
      const v = rd(sum(ps.filter((_, i) => sel[i])))
      const ask = kind === 'le' ? `P(X ≤ ${xs[j]})` : kind === 'ge' ? `P(X ≥ ${xs[j]})` : kind === 'lt' ? `P(X < ${xs[j]})` : `P(${xs[j - 1]} ≤ X ≤ ${xs[j]})`
      return withMeta(prob(`${c.intro} Sa loi est donnée dans le tableau ci-dessous. Calcule ${ask}.`, v,
        sel.filter(Boolean).length === 1
          ? `Une seule valeur convient : ${ask} = P(X = ${xs[sel.indexOf(true)]}) = ${fmt(v)}.`
          : `On additionne les probabilités des valeurs concernées : ${ps.filter((_, i) => sel[i]).map(fmt).join(' + ')} = ${fmt(v)}.`), { figure: tableOf(xs, ps) })
    })),
  )),
]

// ═══ Palier 2 ═══════════════════════════════════════════════════════════
const tier2: Maker[] = [
  // Espérance d'un jeu (valeurs négatives)
  fresh(variants(
    () => {
      const g = pick(GAME_CTX), xs = [-randInt(2, 10), ...randVals(3, 0, 20)], ps = randProbs(4)
      return withMeta(val(`${g.intro} Sa loi est donnée ci-dessous. Calcule l’espérance E(G).`, mean(xs, ps), `E(G) = ${eSum(xs, ps)} = ${fmt(mean(xs, ps))}.`),
        { figure: tableOf(xs, ps, ['g', 'P(G = g)']) })
    },
    () => {
      const m = randInt(1, 5), xs = [0, randInt(2, 6), randInt(8, 20)], ps = randProbs(3)
      const net = xs.map((x) => x - m)
      return val(`Un jeu coûte ${m} € ; il rapporte 0 € avec la probabilité ${fmt(ps[0])}, ${xs[1]} € avec la probabilité ${fmt(ps[1])} et ${xs[2]} € avec la probabilité ${fmt(ps[2])}. Calcule l’espérance du gain algébrique (mise déduite).`, mean(net, ps),
        `Gains nets : ${net.map(fmt).join(' ; ')}. E(G) = ${eSum(net, ps)} = ${fmt(mean(net, ps))} €.`)
    },
    () => {
      const a = randInt(2, 12), b = randInt(1, 3)
      return fracVal(`On lance un dé équilibré : un 6 fait gagner ${a} écus, sinon on perd ${b} écu${b > 1 ? 's' : ''}. Quelle est l’espérance du gain ?`, a - 5 * b, 6,
        `E(G) = ${a} × 1/6 + (−${b}) × 5/6 = (${a} − ${5 * b}) / 6 = ${fmtFrac(a - 5 * b, 6)}.`)
    },
    () => {
      const xs = randVals(4, -5, 10), ps = randProbs(4)
      return val(`La loi de X est : ${lawText(xs, ps)}. Calcule E(X).`, mean(xs, ps), `E(X) = ${eSum(xs, ps)} = ${fmt(mean(xs, ps))}.`)
    },
  )),
  // V(aX + b), σ(aX + b)
  fresh(variants(
    () => {
      const V = rd(randInt(5, 60) / 10), a = pick([-3, -2, 2, 3, 4, 5]), b = randInt(-9, 9)
      return val(`On sait que V(X) = ${fmt(V)}. Calcule V(${aff(a, b)}).`, rd(a * a * V), `V(aX + b) = a² V(X) (le décalage b ne change pas la dispersion) : ${par(a)}² × ${fmt(V)} = ${fmt(rd(a * a * V))}.`)
    },
    () => {
      const s = randInt(2, 9), a = pick([-4, -3, -2, 2, 3, 5]), b = randInt(-9, 9)
      return val(`L’écart-type de X vaut ${s}. Que vaut l’écart-type de ${aff(a, b)} ?`, Math.abs(a) * s, `σ(aX + b) = |a| σ(X) = ${Math.abs(a)} × ${s} = ${Math.abs(a) * s}.`)
    },
    () => {
      const s = randInt(2, 8), a = pick([2, 3, 4, 5]), b = randInt(3, 20)
      return val(`Le nombre X de clients d’une auberge a pour écart-type ${s}. La recette (en écus) est R = ${a}X + ${b}. Quel est l’écart-type de R ?`, a * s, `σ(${a}X + ${b}) = ${a} × σ(X) = ${a} × ${s} = ${a * s} écus.`)
    },
    () => {
      const V = randInt(2, 30), a = pick([-1, -2, -3])
      return val(`V(X) = ${V}. Calcule V(${aff(a, randInt(1, 9))}).`, a * a * V, `V(aX + b) = a² V(X) = ${a * a} × ${V} = ${a * a * V} (une variance n’est jamais négative).`)
    },
  )),
  // Variance par la formule de König-Huygens
  fresh(variants(
    () => {
      const E = rd(randInt(-30, 50) / 10), V = rd(randInt(1, 60) / 10), E2 = rd(V + E * E)
      return val(`On sait que E(X) = ${fmt(E)} et E(X²) = ${fmt(E2)}. Calcule V(X).`, V, `V(X) = E(X²) − E(X)² = ${fmt(E2)} − ${par(E)}² = ${fmt(E2)} − ${fmt(rd(E * E))} = ${fmt(V)}.`)
    },
    () => {
      const xs = randVals(2, 0, 8), ps = randProbs(2, 10), m = mean(xs, ps), V = variance(xs, ps)
      return val(`X prend la valeur ${xs[0]} avec la probabilité ${fmt(ps[0])} et la valeur ${xs[1]} avec la probabilité ${fmt(ps[1])}. Son espérance vaut ${fmt(m)}. Calcule V(X).`, V,
        `V(X) = ${xs.map((x, i) => `${fmt(ps[i])} × (${fmt(x)} − ${fmt(m)})²`).join(' + ')} = ${fmt(V)}.`)
    },
    () => {
      const E = randInt(2, 9), V = randInt(1, 20)
      return val(`Une variable X a pour espérance ${E} et pour variance ${V}. Calcule E(X²).`, V + E * E, `E(X²) = V(X) + E(X)² = ${V} + ${E * E} = ${V + E * E}.`)
    },
    () => {
      const p = pick([0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9])
      return val(`X suit une loi de Bernoulli de paramètre ${fmt(p)} (X vaut 1 avec la probabilité ${fmt(p)}, 0 sinon). Calcule V(X).`, rd(p * (1 - p)),
        `E(X) = ${fmt(p)} et E(X²) = ${fmt(p)} (car X² = X), donc V(X) = ${fmt(p)} − ${fmt(p)}² = ${fmt(p)} × ${fmt(rd(1 - p))} = ${fmt(rd(p * (1 - p)))}.`)
    },
  )),
  // Somme de variables indépendantes
  fresh(variants(
    () => {
      const a = rd(randInt(5, 60) / 10), b = rd(randInt(5, 60) / 10)
      return val(`X et Y sont indépendantes, V(X) = ${fmt(a)} et V(Y) = ${fmt(b)}. Calcule V(X + Y).`, rd(a + b), `Pour des variables indépendantes, V(X + Y) = V(X) + V(Y) = ${fmt(a)} + ${fmt(b)} = ${fmt(rd(a + b))}.`)
    },
    () => {
      const [a, b, c] = pick([[3, 4, 5], [6, 8, 10], [5, 12, 13], [8, 15, 17], [9, 12, 15], [12, 16, 20]] as const)
      return val(`Deux étapes d’un voyage ont des durées indépendantes, d’écarts-types ${a} min et ${b} min. Quel est l’écart-type de la durée totale ?`, c,
        `V(total) = ${a}² + ${b}² = ${a * a + b * b}, donc σ = √${a * a + b * b} = ${c} min. (Les écarts-types ne s’additionnent pas.)`)
    },
    () => {
      const a = rd(randInt(5, 60) / 10), b = rd(randInt(5, 60) / 10)
      return val(`X et Y sont indépendantes, V(X) = ${fmt(a)} et V(Y) = ${fmt(b)}. Calcule V(X − Y).`, rd(a + b), `V(X − Y) = V(X) + (−1)² V(Y) = ${fmt(a)} + ${fmt(b)} = ${fmt(rd(a + b))} : les variances s’ajoutent aussi pour une différence.`)
    },
    () => {
      const n = randInt(2, 5)
      return fracVal(`On lance ${n} dés équilibrés indépendants. Un dé a pour variance ${F('35', '12')}. Quelle est la variance de la somme des points ?`, 35 * n, 12,
        `Les dés sont indépendants : V(somme) = ${n} × 35/12 = ${fmtFrac(35 * n, 12)}.`)
    },
  )),
  // Écart-type
  fresh(variants(
    () => {
      const s = randInt(2, 12)
      return val(`V(X) = ${s * s}. Que vaut l’écart-type σ(X) ?`, s, `σ(X) = √V(X) = √${s * s} = ${s}.`)
    },
    () => {
      const m = randInt(-5, 20), d = randInt(1, 9)
      return val(`X vaut ${fmt(m - d)} ou ${fmt(m + d)}, chacune avec la probabilité 0,5. Calcule l’écart-type σ(X).`, d,
        `E(X) = ${m}, et X s’écarte toujours de ${d} de sa moyenne : V(X) = 0,5 × ${d}² + 0,5 × ${d}² = ${d * d}, donc σ(X) = ${d}.`)
    },
    () => {
      const V = randInt(2, 40)
      return val(`V(X) = ${V}. Calcule σ(X) (arrondi au centième).`, Math.sqrt(V), `σ(X) = √${V} ≈ ${fmt(rd(Math.sqrt(V), 2))}.`, { tol: 0.01 })
    },
    () => {
      const s = randInt(2, 10), a = pick([2, 3, 4])
      return val(`V(${a}X) = ${a * a * s * s}. Que vaut σ(X) ?`, s, `V(${a}X) = ${a * a} V(X), donc V(X) = ${s * s} et σ(X) = ${s}.`)
    },
  )),
]

// ═══ Palier 3 ═══════════════════════════════════════════════════════════
const tier3: Maker[] = [
  // Variance d'une loi à 3 valeurs
  fresh(variants(
    ...[0, 1, 2].map((form) => () => retry(() => {
      const c = pick(LAW_CTX), xs = randVals(3, c.lo, c.hi), ps = randProbs(3, 10), m = mean(xs, ps), V = variance(xs, ps)
      if (!isDec(V, 2)) return null
      const expl = `E(X) = ${eSum(xs, ps)} = ${fmt(m)}. V(X) = ${xs.map((x, i) => `${fmt(ps[i])} × ${par(rd(x - m))}²`).join(' + ')} = ${fmt(V)}.`
      if (form === 0) return withMeta(val(`${c.intro} Sa loi est donnée dans le tableau ci-dessous. Calcule V(X).`, V, expl), { figure: tableOf(xs, ps) })
      if (form === 1) return val(`La loi de X est : ${lawText(xs, ps)}. Calcule la variance V(X).`, V, expl)
      return withMeta(val(`La loi de X est représentée par le diagramme ci-dessous. Calcule V(X).`, V, `${expl}`), { figure: barsFigure(xs, ps, Math.max(...ps) > 0.6 ? 0.8 : 0.6, 0.2) })
    })),
  )),
  // Somme de n variables indépendantes de même loi
  fresh(variants(
    () => {
      const n = pick([4, 9, 16, 25, 36]), m = randInt(20, 60), s = randInt(1, 5)
      return val(`Un sac de blé pèse en moyenne ${m} kg, avec un écart-type de ${s} kg. Un chariot transporte ${n} sacs dont les masses sont indépendantes. Quel est l’écart-type de la masse totale (en kg) ?`, s * Math.sqrt(n),
        `V(S) = ${n} × ${s}² = ${n * s * s}, donc σ(S) = √${n * s * s} = ${s} × √${n} = ${s * Math.sqrt(n)} kg.`)
    },
    () => {
      const n = randInt(5, 30), m = rd(randInt(5, 50) / 10)
      return val(`On joue ${n} parties indépendantes d’un jeu dont le gain a pour espérance ${fmt(m)} écus. Quelle est l’espérance du gain total ?`, rd(n * m), `E(S) = ${n} × ${fmt(m)} = ${fmt(rd(n * m))} écus.`)
    },
    () => {
      const n = randInt(3, 20), V = rd(randInt(5, 40) / 10)
      return val(`X₁, …, X_n sont ${n} variables indépendantes de même loi, de variance ${fmt(V)}. Calcule V(X₁ + … + X_n) pour n = ${n}.`, rd(n * V), `Par indépendance, les variances s’ajoutent : ${n} × ${fmt(V)} = ${fmt(rd(n * V))}.`)
    },
    () => {
      const n = pick([4, 9, 16, 25]), s = randInt(2, 6)
      return val(`Une tâche dure un temps aléatoire d’écart-type ${s} min. Un artisan l’effectue ${n} fois, les durées étant indépendantes. Quel est l’écart-type du temps total ?`, s * Math.sqrt(n),
        `σ(S) = σ × √n = ${s} × √${n} = ${s * Math.sqrt(n)} min.`)
    },
  )),
  // Moyenne d'un échantillon
  fresh(variants(
    () => retry(() => {
      const n = pick([4, 9, 16, 25, 100]), s = pick([2, 3, 4, 5, 6, 10, 12])
      return isDec(s / Math.sqrt(n), 2) && val(`On prélève un échantillon de taille ${n} d’une variable d’écart-type ${s}. Quel est l’écart-type de la moyenne M_n de l’échantillon ?`, s / Math.sqrt(n),
        `σ(M_n) = ${F('σ', '√n')} = ${s} ÷ √${n} = ${fmt(s / Math.sqrt(n))}.`)
    }),
    () => {
      const n = pick([10, 20, 25, 40, 50, 100]), V = randInt(2, 40)
      return val(`X₁, …, X_n forment un échantillon de taille n = ${n} d’une loi de variance ${V}. Calcule la variance de la moyenne M_n = ${F('X₁ + … + X_n', 'n')}.`, rd(V / n),
        `V(M_n) = ${F('V(X)', 'n')} = ${V} ÷ ${n} = ${fmt(rd(V / n))}.`)
    },
    () => {
      const n = randInt(10, 100), m = rd(randInt(10, 200) / 10)
      return val(`Un échantillon de taille ${n} est tiré d’une loi d’espérance ${fmt(m)}. Quelle est l’espérance de la moyenne M_n de l’échantillon ?`, m,
        `E(M_n) = ${F('n × E(X)', 'n')} = E(X) = ${fmt(m)} : la moyenne d’échantillon est centrée sur l’espérance.`)
    },
    () => {
      const n = pick([4, 16, 25, 100]), s = pick([2, 4, 8, 10, 20])
      return val(`Les tirs d’un archer s’écartent du centre d’une distance d’écart-type ${s} cm. On fait la moyenne de ${n} tirs indépendants. Quel est l’écart-type de cette moyenne (en cm) ?`, s / Math.sqrt(n),
        `σ(M_n) = ${s} ÷ √${n} = ${fmt(rd(s / Math.sqrt(n)))} cm.`)
    },
  )),
  // Jeu : gain algébrique et jeu équitable
  fresh(variants(
    () => {
      const k = randInt(1, 3), g = randInt(3, 12), m = randInt(1, 4)
      return fracVal(`Pour jouer, on paie ${m} écus et on lance un dé équilibré : si l’on obtient ${k === 1 ? 'un 6' : k === 2 ? 'un 5 ou un 6' : 'un 4, un 5 ou un 6'}, on reçoit ${g} écus. Quelle est l’espérance du gain algébrique ?`, k * g - 6 * m, 6,
        `G vaut ${g} − ${m} = ${g - m} avec la probabilité ${fmtFrac(k, 6)}, et −${m} sinon. E(G) = ${g} × ${fmtFrac(k, 6)} − ${m} = ${fmtFrac(k * g - 6 * m, 6)}.`)
    },
    () => retry(() => {
      const ps = randProbs(3, 10), g = [0, randInt(2, 6), randInt(8, 30)], E = mean(g, ps)
      if (!isDec(E, 2)) return null
      return val(`Un jeu rapporte 0, ${g[1]} ou ${g[2]} écus avec les probabilités respectives ${ps.map(fmt).join(' ; ')}. Quelle mise rend le jeu équitable (espérance du gain net nulle) ?`, E,
        `Le jeu est équitable si la mise est égale au gain moyen : ${eSum(g, ps)} = ${fmt(E)} écus.`)
    }),
    () => {
      const r = randInt(2, 6), b = randInt(2, 8), w = randInt(2, 20), l = randInt(1, 10)
      return fracVal(`Une urne contient ${r} boules rouges et ${b} boules blanches. On tire une boule : rouge, on gagne ${w} écus ; blanche, on perd ${l} écu${l > 1 ? 's' : ''}. Calcule l’espérance du gain.`, r * w - b * l, r + b,
        `E(G) = ${w} × ${r}/${r + b} − ${l} × ${b}/${r + b} = ${fmtFrac(r * w - b * l, r + b)}.`)
    },
    () => {
      const g = pick(GAME_CTX), xs = [-randInt(3, 10), randInt(0, 3), randInt(5, 30)], ps = randProbs(3, 10)
      return withMeta(val(`${g.intro} Sa loi est donnée ci-dessous. Calcule E(G) : le jeu est-il favorable au joueur (E(G) > 0) ?`, mean(xs, ps), `E(G) = ${eSum(xs, ps)} = ${fmt(mean(xs, ps))}.`),
        { figure: tableOf(xs, ps, ['g', 'P(G = g)']) })
    },
  )),
  // Combinaisons linéaires de deux variables
  fresh(variants(
    () => {
      const a = pick([2, 3, -2]), b = pick([2, -1, -3, 4]), c = randInt(-5, 5), Ex = randInt(-5, 10), Ey = randInt(-5, 10)
      const e = a * Ex + b * Ey + c
      const bY = `${b < 0 ? '−' : '+'} ${Math.abs(b) === 1 ? '' : Math.abs(b)}Y`
      return val(`E(X) = ${par(Ex)} et E(Y) = ${par(Ey)}. Calcule E(${fmt(a)}X ${bY}${c === 0 ? '' : ` ${sgn(c)}`}).`.replace(/= \((−\d+)\)/g, '= $1'), e,
        `Linéarité : ${a} × ${par(Ex)} ${b < 0 ? '−' : '+'} ${Math.abs(b)} × ${par(Ey)}${c === 0 ? '' : ` ${sgn(c)}`} = ${e}.`)
    },
    () => {
      const a = pick([2, 3]), b = pick([1, 2, 3]), Vx = randInt(1, 10), Vy = randInt(1, 10)
      return val(`X et Y sont indépendantes, V(X) = ${Vx} et V(Y) = ${Vy}. Calcule V(${a}X − ${b === 1 ? '' : b}Y).`, a * a * Vx + b * b * Vy,
        `V(${a}X − ${b === 1 ? '' : b}Y) = ${a}² V(X) + ${b}² V(Y) = ${a * a * Vx} + ${b * b * Vy} = ${a * a * Vx + b * b * Vy}.`)
    },
    () => {
      const pa = randInt(2, 6), pb = randInt(2, 6), Ea = randInt(5, 30), Eb = randInt(5, 30)
      return val(`Une auberge vend des repas à ${pa} écus et des chambres à ${pb} écus. Le nombre de repas vendus par jour a pour espérance ${Ea}, celui des chambres ${Eb}. Quelle est la recette moyenne par jour ?`, pa * Ea + pb * Eb,
        `E(${pa}R + ${pb}C) = ${pa} × ${Ea} + ${pb} × ${Eb} = ${pa * Ea + pb * Eb} écus.`)
    },
    () => {
      const Vx = randInt(1, 10), Vy = randInt(1, 10), c = randInt(1, 9)
      return val(`X et Y sont indépendantes, V(X) = ${Vx} et V(Y) = ${Vy}. Calcule V(X + Y + ${c}).`, Vx + Vy, `Ajouter une constante ne change pas la variance : V(X + Y + ${c}) = V(X) + V(Y) = ${Vx + Vy}.`)
    },
  )),
]

// ═══ Palier 4 ═══════════════════════════════════════════════════════════
const tier4: Maker[] = [
  // Paramètre inconnu dans une loi
  fresh(variants(
    () => {
      const c = pick([[1, 2, 3, 4], [1, 1, 2, 4], [2, 3, 5], [1, 2, 2], [1, 3, 4, 2]]), S = sum(c), xs = randVals(c.length, 0, 9)
      return withMeta(prob(`La loi de X est donnée ci-dessous, a désignant un réel. Que vaut a ?`, 1 / S, `La somme des probabilités vaut 1 : ${c.map((k) => (k === 1 ? 'a' : `${k}a`)).join(' + ')} = ${S}a = 1, donc a = 1/${S}${isDec(1 / S, 4) ? ` = ${fmt(1 / S)}` : ''}.`),
        { figure: tableOf(xs, c.map((k) => (k === 1 ? 'a' : `${k}a`))) })
    },
    () => retry(() => {
      const ps = randProbs(3, 10), xs = randVals(3, 0, 12), E = mean(xs, ps), j = 2
      if (!isDec((E - ps[0] * xs[0] - ps[1] * xs[1]) / ps[j], 6)) return null
      return val(`X prend les valeurs ${xs[0]}, ${xs[1]} et x, avec les probabilités ${ps.map(fmt).join(' ; ')}. On sait que E(X) = ${fmt(E)}. Que vaut x ?`, xs[j],
        `${fmt(ps[0])} × ${xs[0]} + ${fmt(ps[1])} × ${xs[1]} + ${fmt(ps[2])} × x = ${fmt(E)}, donc x = (${fmt(E)} − ${fmt(rd(ps[0] * xs[0] + ps[1] * xs[1]))}) ÷ ${fmt(ps[2])} = ${xs[j]}.`)
    }),
    () => retry(() => {
      const xs = randVals(3, 0, 10), p = rd(randInt(1, 7) / 10), q = rd(randInt(1, 9 - Math.round(p * 10)) / 10), r = rd(1 - p - q)
      if (r <= 0) return null
      const E = rd(p * xs[0] + q * xs[1] + r * xs[2])
      return val(`X prend les valeurs ${xs.join(', ')} avec P(X = ${xs[0]}) = ${fmt(p)}. On sait que E(X) = ${fmt(E)}. Que vaut P(X = ${xs[1]}) ?`, q,
        `Notons q = P(X = ${xs[1]}) ; alors P(X = ${xs[2]}) = ${fmt(rd(1 - p))} − q. ${xs[0] === 0 ? '' : `${fmt(p)} × ${xs[0]} + `}${xs[1]}q + ${xs[2]}(${fmt(rd(1 - p))} − q) = ${fmt(E)} donne ${co(xs[1] - xs[2])}q = ${fmt(rd(E - p * xs[0] - xs[2] * (1 - p)))}, soit q = ${fmt(q)}.`)
    }),
    () => {
      const k = pick([3, 4, 5, 6]), xs = Array.from({ length: k }, (_, i) => i + 1)
      const S = (k * (k + 1)) / 2
      return prob(`X prend les valeurs 1, 2, …, ${k} avec P(X = i) = c × i (c réel). Que vaut c ?`, 1 / S,
        `c × (${xs.join(' + ')}) = ${S}c = 1, donc c = 1/${S}.`)
    },
  )),
  // Variance d'une combinaison
  fresh(variants(
    () => {
      const a = pick([2, 3]), b = pick([2, 3, 4]), c = randInt(1, 9), Vx = rd(randInt(5, 40) / 10), Vy = rd(randInt(5, 40) / 10)
      return val(`X et Y sont indépendantes, V(X) = ${fmt(Vx)} et V(Y) = ${fmt(Vy)}. Calcule V(${a}X − ${b}Y + ${c}).`, rd(a * a * Vx + b * b * Vy),
        `V(${a}X − ${b}Y + ${c}) = ${a * a} × ${fmt(Vx)} + ${b * b} × ${fmt(Vy)} = ${fmt(rd(a * a * Vx + b * b * Vy))}.`)
    },
    () => {
      const sx = randInt(1, 6), sy = randInt(1, 6), a = pick([2, 3])
      return val(`X et Y sont indépendantes, d’écarts-types ${sx} et ${sy}. Calcule V(${a}X + Y).`, a * a * sx * sx + sy * sy,
        `V(${a}X + Y) = ${a}² × ${sx}² + ${sy}² = ${a * a * sx * sx} + ${sy * sy} = ${a * a * sx * sx + sy * sy}.`)
    },
    () => {
      const n = randInt(2, 6), V = randInt(2, 12)
      return val(`X₁, …, X_${'n'} sont indépendantes de même variance ${V}. Compare : V(${n}X₁) et V(X₁ + … + X_n) avec n = ${n}. Calcule V(${n}X₁) − V(X₁ + … + X_n).`, n * n * V - n * V,
        `V(${n}X₁) = ${n}² × ${V} = ${n * n * V} ; V(X₁ + … + X_n) = ${n} × ${V} = ${n * V}. Différence : ${n * n * V - n * V}. (Répéter n fois la même variable disperse plus que sommer n variables indépendantes.)`)
    },
    () => {
      const sx = randInt(2, 9), a = pick([0.5, 1.5, 2.5])
      return val(`σ(X) = ${sx}. Calcule V(${fmt(a)}X − 7).`, rd(a * a * sx * sx), `V(${fmt(a)}X − 7) = ${fmt(a)}² × ${sx}² = ${fmt(rd(a * a))} × ${sx * sx} = ${fmt(rd(a * a * sx * sx))}.`)
    },
  )),
  // Taille d'échantillon pour un écart-type de la moyenne
  fresh(variants(
    () => retry(() => {
      const s = randInt(2, 20), e = pick([0.5, 1, 2, 0.25]), n = Math.ceil(rd((s / e) ** 2))
      if (n < 4 || n > 2000) return null
      return val(`Une variable a pour écart-type ${s}. Quelle taille d’échantillon minimale n faut-il pour que la moyenne M_n ait un écart-type inférieur ou égal à ${fmt(e)} ?`, n,
        `σ(M_n) = ${s}/√n ≤ ${fmt(e)} ⇔ √n ≥ ${fmt(rd(s / e))} ⇔ n ≥ ${fmt(rd((s / e) ** 2))}. Donc n = ${n}.`)
    }),
    () => retry(() => {
      const V = randInt(2, 50), e = pick([0.1, 0.2, 0.5, 1]), n = Math.ceil(rd(V / e))
      if (n < 4 || n > 2000) return null
      return val(`Une variable a pour variance ${V}. Quelle est la plus petite taille n d’échantillon pour laquelle V(M_n) ≤ ${fmt(e)} ?`, n,
        `V(M_n) = ${V}/n ≤ ${fmt(e)} ⇔ n ≥ ${V} ÷ ${fmt(e)} = ${fmt(rd(V / e))}. Donc n = ${n}.`)
    }),
    () => retry(() => {
      const s = randInt(3, 15), e = pick([1, 2]), n = Math.ceil(rd((s / e) ** 2))
      if (n < 4) return null
      return val(`La masse d’un pain a un écart-type de ${s} g. Combien de pains au minimum faut-il peser pour que l’écart-type de leur masse moyenne soit au plus ${e} g ?`, n,
        `${s}/√n ≤ ${e} ⇔ n ≥ (${s}/${e})² = ${fmt(rd((s / e) ** 2))}, donc n = ${n}.`)
    }),
    () => {
      const s = randInt(2, 10), k = pick([2, 3, 4, 5])
      return val(`Avec n mesures indépendantes, l’écart-type de la moyenne vaut ${s}/√n. Par combien faut-il multiplier n pour diviser cet écart-type par ${k} ?`, k * k,
        `Diviser ${s}/√n par ${k} revient à multiplier √n par ${k}, donc n par ${k}² = ${k * k}.`)
    },
  )),
  // Loi d'une somme de deux variables indépendantes
  variants(
    ...[0, 1, 2].map((form) => () => retry(() => {
      const xs = [0, 1], ys = [0, 1, 2], px = randProbs(2, 10), py = randProbs(3, 10)
      const s = randInt(1, 2)
      let v = 0
      const terms: string[] = []
      xs.forEach((x, i) => ys.forEach((y, j) => { if (x + y === s) { v += px[i] * py[j]; terms.push(`P(X = ${x}) × P(Y = ${y})`) } }))
      v = rd(v)
      const nums = xs.flatMap((x, i) => ys.map((y, j) => (x + y === s ? `${fmt(px[i])} × ${fmt(py[j])}` : ''))).filter(Boolean).join(' + ')
      const intro = form === 0
        ? `X et Y sont indépendantes ; X vaut 0 ou 1 avec P(X = 1) = ${fmt(px[1])}, et Y vaut 0, 1 ou 2 avec ${lawText(ys, py, 'Y')}.`
        : form === 1
          ? `Deux archers tirent indépendamment. Le premier tire 1 flèche et touche avec la probabilité ${fmt(px[1])} (X = nombre de cibles touchées, 0 ou 1). Le second touche Y cibles, avec ${lawText(ys, py, 'Y')}.`
          : `Une auberge reçoit X voyageurs à cheval (0 ou 1, P(X = 1) = ${fmt(px[1])}) et Y à pied, avec ${lawText(ys, py, 'Y')}, indépendamment.`
      return prob(`${intro} Calcule P(X + Y = ${s}).`, v, `Par indépendance : P(X + Y = ${s}) = ${terms.join(' + ')} = ${nums} = ${fmt(v)}.`)
    })),
  ),
  // Mise équitable, gains à trois issues
  fresh(variants(
    () => retry(() => {
      const r = randInt(1, 4), b = randInt(1, 5), w = randInt(2, 6), N = r + b + w
      const gr = randInt(5, 20), gb = randInt(1, 6)
      const m = (r * gr + b * gb) / N
      if (!isDec(m, 2)) return null
      return val(`Une urne contient ${r} boule${r > 1 ? 's' : ''} rouge${r > 1 ? 's' : ''}, ${b} bleue${b > 1 ? 's' : ''} et ${w} blanches. On tire une boule : rouge rapporte ${gr} écus, bleue ${gb} écus, blanche rien. Quelle mise rend le jeu équitable ?`, m,
        `Gain moyen (avant mise) : ${gr} × ${r}/${N} + ${gb} × ${b}/${N} = ${r * gr + b * gb}/${N} = ${fmt(m)} écus. Le jeu est équitable si la mise vaut ${fmt(m)} écus.`)
    }),
    () => retry(() => {
      const ps = randProbs(3, 20), g1 = randInt(2, 10), m = randInt(2, 6)
      // g2 tel que E(G) = 0 : ps[1]*(g1 − m) + ps[2]*(g2 − m) − ps[0]*m = 0
      const g2 = (m - ps[1] * g1) / ps[2]
      if (!isDec(g2, 2) || g2 <= g1) return null
      return val(`Un jeu coûte ${m} écus. On perd la mise avec la probabilité ${fmt(ps[0])}, on reçoit ${g1} écus avec la probabilité ${fmt(ps[1])}, et on reçoit g écus sinon. Quelle valeur de g rend le jeu équitable ?`, g2,
        `Équitable ⇔ gain moyen reçu = mise : ${fmt(ps[1])} × ${g1} + ${fmt(ps[2])} × g = ${m}, donc g = (${m} − ${fmt(rd(ps[1] * g1))}) ÷ ${fmt(ps[2])} = ${fmt(rd(g2))}.`)
    }),
    () => retry(() => {
      const k = randInt(1, 2), m = randInt(1, 5)
      const g = (6 * m) / k
      if (!isDec(g, 2)) return null
      return val(`On paie ${m} écus pour lancer un dé équilibré ; on reçoit g écus si l’on obtient ${k === 1 ? 'un 6' : 'un 5 ou un 6'}, rien sinon. Quelle valeur de g rend le jeu équitable ?`, g,
        `Équitable ⇔ g × ${fmtFrac(k, 6)} = ${m}, donc g = ${fmt(g)} écus.`)
    }),
    () => retry(() => {
      const xs = [randInt(2, 6), randInt(8, 15), randInt(20, 50)], ps = randProbs(3, 10), mise = mean(xs, ps)
      if (!isDec(mise, 1)) return null
      return withMeta(val(`À un jeu de tir, le gain reçu R (en écus, avant mise) suit la loi du tableau ci-dessous. Quelle mise rend le jeu équitable ?`, mise, `Le jeu est équitable si la mise est égale à E(R) = ${eSum(xs, ps)} = ${fmt(mise)} écus.`),
        { figure: tableOf(xs, ps, ['r', 'P(R = r)']) })
    }),
  )),
]

// ═══ Palier 5 ═══════════════════════════════════════════════════════════
const tier5: Maker[] = [
  // Deux inconnues : somme 1 et espérance donnée
  fresh(variants(
    ...[2, 1, 0].map((kIdx, form) => () => retry(() => {
      const xs = form === 1 ? [-randInt(2, 6), randInt(1, 4), randInt(5, 15)] : randVals(3, form === 2 ? 1 : -2, 8), ps = randProbs(3, 10), E = mean(xs, ps)
      if (xs.includes(0) || new Set(xs).size < 3) return null
      const [i, j] = [0, 1, 2].filter((t) => t !== kIdx), rest = rd(1 - ps[kIdx])
      const rhs = rd(E - ps[kIdx] * xs[kIdx] - xs[j] * rest)
      const expl = `Notons p = P(X = ${fmt(xs[i])}) et q = P(X = ${fmt(xs[j])}) : p + q = ${fmt(rest)} et ${co(xs[i])}p ${xs[j] < 0 ? '−' : '+'} ${co(Math.abs(xs[j]))}q = ${fmt(rd(E - ps[kIdx] * xs[kIdx]))}. Avec q = ${fmt(rest)} − p : ${co(xs[i] - xs[j])}p = ${fmt(rhs)}, donc p = ${fmt(ps[i])}.`
      if (form === 0) return val(`X prend les valeurs ${xs.map(fmt).join(', ')}. On sait que P(X = ${fmt(xs[kIdx])}) = ${fmt(ps[kIdx])} et E(X) = ${fmt(E)}. Calcule P(X = ${fmt(xs[i])}).`, ps[i], expl)
      if (form === 1) return val(`Un jeu fait perdre ${-xs[0]} écus, ou gagner ${xs[1]} ou ${xs[2]} écus. On gagne ${xs[1]} écus avec la probabilité ${fmt(ps[1])}, et le gain moyen vaut ${fmt(E)} écu${Math.abs(E) >= 2 ? 's' : ''}. Avec quelle probabilité perd-on ${-xs[0]} écus ? (X désigne le gain.)`, ps[0], expl)
      return val(`Le nombre X de ${pick(['chevaux au relais', 'clients à l’auberge', 'navires au port'])} vaut ${xs.map(fmt).join(', ')} ; P(X = ${fmt(xs[kIdx])}) = ${fmt(ps[kIdx])} et, en moyenne, X vaut ${fmt(E)}. Quelle est la probabilité que X = ${fmt(xs[i])} ?`, ps[i], expl)
    })),
  )),
  // Variance d'un jeu
  fresh(variants(
    () => retry(() => {
      const xs = [-randInt(1, 5), randInt(0, 4), randInt(5, 12)], ps = randProbs(3, 10), V = variance(xs, ps), m = mean(xs, ps)
      if (new Set(xs).size < 3 || !isDec(V, 2)) return null
      return withMeta(val(`À la taverne, le gain algébrique G d’un jeu suit la loi ci-dessous. Calcule V(G).`, V,
        `E(G) = ${eSum(xs, ps)} = ${fmt(m)}. E(G²) = ${xs.map((x, i) => (x === 0 ? '' : `${fmt(ps[i])} × ${x * x}`)).filter(Boolean).join(' + ')} = ${fmt(rd(V + m * m))}. V(G) = ${fmt(rd(V + m * m))} − ${par(m)}² = ${fmt(V)}.`),
      { figure: tableOf(xs, ps, ['g', 'P(G = g)']) })
    }),
    () => retry(() => {
      const xs = randVals(3, 0, 6), ps = randProbs(3, 10), V = variance(xs, ps), a = pick([2, 3, 10]), b = randInt(-20, 20)
      if (!isDec(V, 2)) return null
      return val(`La loi de X est : ${lawText(xs, ps)}. On pose Y = ${aff(a, b)}. Calcule V(Y).`, rd(a * a * V),
        `E(X) = ${fmt(mean(xs, ps))} et V(X) = ${fmt(V)}. Puis V(Y) = ${a}² × V(X) = ${fmt(rd(a * a * V))}.`)
    }),
    () => retry(() => {
      const xs = randVals(3, 0, 8), ps = randProbs(3, 10), V = variance(xs, ps)
      if (!isDec(Math.sqrt(V), 2) || V === 0) return null
      return val(`La loi de X est : ${lawText(xs, ps)}. Calcule l’écart-type σ(X).`, Math.sqrt(V), `E(X) = ${fmt(mean(xs, ps))}, V(X) = ${fmt(V)}, donc σ(X) = √${fmt(V)} = ${fmt(rd(Math.sqrt(V)))}.`)
    }),
    () => retry(() => {
      const xs = randVals(3, 0, 8), ps = randProbs(3, 10), V = variance(xs, ps)
      if (isDec(Math.sqrt(V), 2) || V === 0) return null
      return val(`La loi de X est : ${lawText(xs, ps)}. Calcule l’écart-type σ(X) (arrondi au centième).`, Math.sqrt(V), `E(X) = ${fmt(mean(xs, ps))}, V(X) = ${fmt(V)}, donc σ(X) = √${fmt(V)} ≈ ${fmt(rd(Math.sqrt(V), 2))}.`, { tol: 0.01 })
    }),
  )),
  // Moments : E(X²), E((X − c)²)
  fresh(variants(
    () => {
      const E = randInt(-4, 8), V = randInt(1, 12), c = randInt(1, 5)
      return val(`E(X) = ${E} et V(X) = ${V}. Calcule E((X − ${c})²).`, V + (E - c) ** 2,
        `E((X − ${c})²) = V(X − ${c}) + E(X − ${c})² = ${V} + ${par(E - c)}² = ${V + (E - c) ** 2}.`)
    },
    () => {
      const E = rd(pick([-1, 1]) * randInt(1, 50) / 10), s = randInt(1, 6)
      return val(`E(X) = ${fmt(E)} et σ(X) = ${s}. Calcule E(X²).`, rd(s * s + E * E), `E(X²) = V(X) + E(X)² = ${s * s} + ${fmt(rd(E * E))} = ${fmt(rd(s * s + E * E))}.`)
    },
    () => {
      const E = randInt(1, 6), V = randInt(1, 10), a = pick([2, 3])
      return val(`E(X) = ${E} et V(X) = ${V}. Calcule E((${a}X + 1)²).`, a * a * V + (a * E + 1) ** 2,
        `Y = ${a}X + 1 : E(Y) = ${a * E + 1}, V(Y) = ${a * a * V}. E(Y²) = V(Y) + E(Y)² = ${a * a * V} + ${(a * E + 1) ** 2} = ${a * a * V + (a * E + 1) ** 2}.`)
    },
    () => {
      const E = randInt(2, 9), E2 = E * E + randInt(1, 15), a = pick([2, 3, 5])
      return val(`E(X) = ${E} et E(X²) = ${E2}. Calcule V(${a}X).`, a * a * (E2 - E * E), `V(X) = ${E2} − ${E * E} = ${E2 - E * E}, donc V(${a}X) = ${a * a} × ${E2 - E * E} = ${a * a * (E2 - E * E)}.`)
    },
  )),
  // Moyenne d'un échantillon à partir d'une loi
  fresh(variants(
    () => retry(() => {
      const xs = [0, 1, 2], ps = randProbs(3, 10), V = variance(xs, ps), n = pick([10, 20, 25, 50, 100])
      if (!isDec(V / n, 6)) return null
      return val(`X suit la loi : ${lawText(xs, ps)}. On note M_n la moyenne d’un échantillon de taille ${n} de cette loi. Calcule V(M_n).`, rd(V / n),
        `E(X) = ${fmt(mean(xs, ps))}, V(X) = ${fmt(V)}. V(M_n) = V(X)/n = ${fmt(V)} ÷ ${n} = ${fmt(rd(V / n))}.`)
    }),
    () => retry(() => {
      const d = randInt(1, 6), m = randInt(-3, 10), n = pick([4, 9, 16, 25, 36, 100])
      if (!isDec(d / Math.sqrt(n), 4)) return null
      return val(`X vaut ${fmt(m - d)} ou ${fmt(m + d)} avec la probabilité 0,5 chacune. Quel est l’écart-type de la moyenne de ${n} tirages indépendants de X ?`, d / Math.sqrt(n),
        `σ(X) = ${d} (X s’écarte toujours de ${d} de sa moyenne ${m}). σ(M_n) = ${d}/√${n} = ${fmt(rd(d / Math.sqrt(n)))}.`)
    }),
    () => retry(() => {
      const p = pick([0.1, 0.2, 0.3, 0.4, 0.5]), n = pick([25, 100, 400]), s = Math.sqrt((p * (1 - p)) / n)
      if (!isDec(s, 4)) return null
      return val(`On estime la proportion p = ${fmt(p)} de pièces défectueuses par la fréquence F observée sur ${n} pièces : F est la moyenne de ${n} variables de Bernoulli indépendantes de paramètre ${fmt(p)}. Quel est l’écart-type de F ?`, s,
        `V(F) = ${F('p(1 − p)', 'n')} = ${fmt(rd(p * (1 - p)))} ÷ ${n} = ${fmt(rd(s * s, 8))}, donc σ(F) = ${fmt(rd(s))}.`)
    }),
    () => retry(() => {
      const xs = [-1, 1], p = pick([0.2, 0.3, 0.4, 0.5]), ps = [rd(1 - p), p], m = mean(xs, ps), V = variance(xs, ps), n = pick([10, 20, 50, 100])
      return val(`À chaque partie, un joueur gagne 1 écu avec la probabilité ${fmt(p)} et en perd 1 sinon. Il joue ${n} parties indépendantes. Quelle est la variance de son gain moyen par partie sur ces ${n} parties ?`, rd(V / n),
        `E(G) = ${fmt(m)} ; V(G) = 1 − ${par(m)}² = ${fmt(V)}. Pour la moyenne de ${n} parties : E = ${fmt(m)} et V = ${fmt(V)} ÷ ${n} = ${fmt(rd(V / n))}.`)
    }),
  )),
  // Sommes de deux groupes
  fresh(variants(
    () => {
      const n1 = randInt(2, 6), n2 = randInt(2, 6), v1 = randInt(1, 5), v2 = randInt(1, 5)
      return val(`Un convoi compte ${n1} chariots de type A (masses indépendantes de variance ${v1}) et ${n2} chariots de type B (variance ${v2}). Calcule la variance de la masse totale.`, n1 * v1 + n2 * v2,
        `V(total) = ${n1} × ${v1} + ${n2} × ${v2} = ${n1 * v1 + n2 * v2}.`)
    },
    () => {
      const n = randInt(2, 6), m = randInt(2, 6), s1 = randInt(1, 4), s2 = randInt(1, 4)
      return val(`Deux équipes de bûcherons : la première a ${n} membres, la seconde ${m}. Le bois coupé par jour par chaque bûcheron est indépendant, d’écart-type ${s1} stère${s1 > 1 ? 's' : ''} dans la première équipe et ${s2} dans la seconde. On note D la différence entre les productions totales des deux équipes. Calcule V(D).`, n * s1 * s1 + m * s2 * s2,
        `V(D) = V(S₁) + V(S₂) = ${n} × ${s1 * s1} + ${m} × ${s2 * s2} = ${n * s1 * s1 + m * s2 * s2} (les variances s’ajoutent même pour une différence).`)
    },
    () => {
      const n = randInt(3, 8), E = randInt(10, 30), V = randInt(2, 10), c = randInt(5, 20)
      return val(`Un voyage comporte ${n} étapes indépendantes de durée moyenne ${E} min et de variance ${V}, plus ${c} min de pause fixe. Calcule la variance de la durée totale.`, n * V,
        `V(S + ${c}) = V(S) = ${n} × ${V} = ${n * V} : la pause fixe ne change pas la variance.`)
    },
    () => {
      const n = pick([4, 9, 16]), s = randInt(2, 5), a = pick([2, 3])
      return val(`X₁, …, X_n sont ${n} variables indépendantes d’écart-type ${s}. Quel est l’écart-type de ${a}(X₁ + … + X_n) pour n = ${n} ?`, a * s * Math.sqrt(n),
        `σ(X₁ + … + X_n) = ${s} × √${n} = ${s * Math.sqrt(n)}, puis multiplié par ${a} : ${a * s * Math.sqrt(n)}.`)
    },
  )),
]

// ═══ Problèmes d'amélioration ═══════════════════════════════════════════
const upgrades: [Maker[], Maker[], Maker[]] = [
  [
    () => {
      const E = rd(randInt(50, 250) / 10), s = rd(randInt(10, 50) / 10)
      return val(`La température d’une ville en avril a pour espérance ${fmt(E)} °C et pour écart-type ${fmt(s)} °C. En degrés Fahrenheit, F = 1,8C + 32. Quel est l’écart-type de F ?`, rd(1.8 * s), `σ(1,8C + 32) = 1,8 × ${fmt(s)} = ${fmt(rd(1.8 * s))} °F (le décalage de 32 ne change pas la dispersion).`)
    },
    () => {
      const n = randInt(10, 50), xs = [-2, 1, 5], ps = randProbs(3, 10), m = mean(xs, ps)
      return val(`À chaque partie, un joueur perd 2 écus, gagne 1 écu ou gagne 5 écus avec les probabilités ${ps.map(fmt).join(' ; ')}. Quelle est l’espérance de son gain total après ${n} parties ?`, rd(n * m), `E(G) = ${eSum(xs, ps)} = ${fmt(m)} ; sur ${n} parties : ${n} × ${fmt(m)} = ${fmt(rd(n * m))} écus.`)
    },
    () => {
      const n = randInt(2, 6), f = pick([4, 6, 8, 10, 12, 20])
      return val(`On lance ${n} dés équilibrés à ${f} faces (numérotées de 1 à ${f}). Quelle est l’espérance de la somme des points ?`, (n * (f + 1)) / 2,
        `Un dé à ${f} faces a pour espérance (1 + ${f}) ÷ 2 = ${fmt((f + 1) / 2)} ; la somme : ${n} × ${fmt((f + 1) / 2)} = ${fmt((n * (f + 1)) / 2)}.`)
    },
  ],
  [
    () => retry(() => {
      const p = pick([0.1, 0.2, 0.25, 0.4, 0.5]), w = randInt(5, 30), m = rd(p * w)
      if (!isDec(m, 2)) return null
      return val(`Un jeu consiste à tirer à l’arc sur une cible : on la touche avec la probabilité ${fmt(p)} et l’on reçoit alors ${w} écus. Pour quelle mise le jeu est-il équitable ?`, m, `Équitable ⇔ mise = gain moyen = ${w} × ${fmt(p)} = ${fmt(m)} écus.`)
    }),
    () => {
      const n = randInt(10, 100), p = pick([0.1, 0.2, 0.3, 0.4, 0.5])
      return val(`Une variable S = X₁ + … + X_n est la somme de n = ${n} variables de Bernoulli indépendantes de paramètre ${fmt(p)}. En utilisant V(Xᵢ) = p(1 − p), calcule V(S).`, rd(n * p * (1 - p)),
        `V(S) = n × p(1 − p) = ${n} × ${fmt(p)} × ${fmt(rd(1 - p))} = ${fmt(rd(n * p * (1 - p)))} : on retrouve la variance de la loi binomiale.`)
    },
    () => retry(() => {
      const xs = [0, 2, 4], ps = randProbs(3, 10), V = variance(xs, ps), e = pick([0.1, 0.2, 0.25]), n = Math.ceil(rd(V / (e * e)))
      if (V === 0 || n > 5000) return null
      return val(`X suit la loi : ${lawText(xs, ps)}. Quelle taille minimale n d’échantillon garantit que l’écart-type de la moyenne M_n soit au plus ${fmt(e)} ?`, n,
        `E(X) = ${fmt(mean(xs, ps))}, V(X) = ${fmt(V)}. σ(M_n) = √(V/n) ≤ ${fmt(e)} ⇔ n ≥ V/${fmt(e)}² = ${fmt(V)} ÷ ${fmt(rd(e * e))} = ${fmt(rd(V / (e * e)))}. Donc n = ${n}.`)
    }),
  ],
  [
    () => {
      const m = randInt(-5, 20), s = randInt(1, 8)
      return val(`X prend deux valeurs a < b, chacune avec la probabilité 0,5. On sait que E(X) = ${m} et σ(X) = ${s}. Que vaut b ?`, m + s,
        `a et b sont symétriques autour de ${m} : a = ${m} − d et b = ${m} + d. Alors V(X) = d², donc d = σ = ${s} et b = ${m + s}.`)
    },
    () => retry(() => {
      const p = pick([0.2, 0.25, 0.4, 0.5]), g = randInt(2, 10) * 10, m = rd(p * g), d = randInt(1, 4) * 5
      if (m - d <= 0) return null
      const VB = rd(p * (1 - p) * g * g)
      return val(`Un marchand hésite entre deux placements de même rendement moyen ${fmt(m)} écus. Placement A : ${fmt(m - d)} ou ${fmt(m + d)} écus avec la probabilité 0,5 chacun. Placement B : ${g} écus avec la probabilité ${fmt(p)}, rien sinon. Calcule V(B) − V(A).`, rd(VB - d * d),
        `V(A) = ${d}² = ${d * d} (écart constant de ${d} à la moyenne). V(B) = ${g}² × ${fmt(p)} − ${fmt(m)}² = ${fmt(VB)}. Différence : ${fmt(rd(VB - d * d))} : B est bien plus risqué.`)
    }),
    () => retry(() => {
      const px = randProbs(2, 10), py = randProbs(2, 10), s = 1
      const v = rd(px[0] * py[1] + px[1] * py[0])
      return val(`Deux pièces truquées sont lancées indépendamment : la première donne pile avec la probabilité ${fmt(px[1])}, la seconde avec la probabilité ${fmt(py[1])}. Quelle est la probabilité d’obtenir exactement ${s} « pile » au total ?`, v,
        `P(X + Y = 1) = P(X = 0)P(Y = 1) + P(X = 1)P(Y = 0) = ${fmt(px[0])} × ${fmt(py[1])} + ${fmt(px[1])} × ${fmt(py[0])} = ${fmt(v)}.`)
    }),
  ],
]

// ═══ Problèmes de l'hôtel de ville ══════════════════════════════════════
const age: [Maker[], Maker[], Maker[]] = [
  [
    () => retry(() => {
      const xs = [-randInt(2, 5), 0, randInt(3, 8), randInt(10, 30)], ps = randProbs(4).sort((a, b) => b - a), m = mean(xs, ps)
      if (new Set(xs).size < 4) return null
      return T('La roue de la fortune', val(`À la foire ${pick(['de la Saint-Michel', 'aux bestiaux', 'du comté', 'de printemps'])}, ${prenom()} observe une roue de la fortune qui donne un gain algébrique G (en écus, mise déduite) dont la loi figure ci-dessous. Le jeu est-il favorable au joueur ? Calcule E(G).`, m,
        `E(G) = ${eSum(xs, ps)} = ${fmt(m)} écus.${m < 0 ? ' En moyenne, le joueur perd : le jeu est favorable au forain.' : m > 0 ? ' En moyenne, le joueur gagne.' : ' Le jeu est équitable.'}`),
      tableOf(xs, ps, ['g', 'P(G = g)']))
    }),
    () => retry(() => {
      const xs = [0, 1, 2, 3, 4], ps = randProbs(5), m = mean(xs, ps)
      if (Math.max(...ps) > 0.55) return null
      return T('Les pains invendus', val(`La boulangère ${pick(['du bourg', 'du château', 'de la place', 'du port'])} a noté pendant ${randInt(3, 12)} mois le nombre X de pains invendus chaque soir ; la loi de X est représentée par le diagramme en bâtons ci-dessous. Combien de pains invendus doit-elle prévoir en moyenne chaque soir ?`, m,
        `E(X) = ${eSum(xs, ps)} = ${fmt(m)} pains.`), barsFigure(xs, ps, 0.6, 0.1, ['x', 'P(X = x)']))
    }),
    () => {
      const ps = randProbs(3, 20), n = pick([5, 7, 9, 10, 12]), m = rd(ps[0] + 0.5 * ps[1]), who = prenom()
      return T('Le tournoi d’échecs', val(`Au tournoi d’échecs du château, ${who} gagne une partie avec la probabilité ${fmt(ps[0])}, fait nulle avec la probabilité ${fmt(ps[1])} et perd sinon. Une victoire rapporte 1 point, une nulle 0,5 point, une défaite 0. Quel nombre moyen de points peut-on prévoir pour ${who} sur les ${n} parties du tournoi ?`, rd(n * m),
        `Par partie : E = 1 × ${fmt(ps[0])} + 0,5 × ${fmt(ps[1])} = ${fmt(m)} (une défaite ne rapporte rien). Sur ${n} parties (linéarité) : ${n} × ${fmt(m)} = ${fmt(rd(n * m))} points.`))
    },
  ],
  [
    () => retry(() => {
      const xs = [0, randInt(2, 5), randInt(8, 20), randInt(30, 60)], ps = randProbs(4), m = mean(xs, ps)
      if (!isDec(m, 1)) return null
      return T('Le jeu du marchand', val(`Au marché, un marchand propose de tirer une carte : selon la carte, il verse 0, ${xs[1]}, ${xs[2]} ou ${xs[3]} écus, avec les probabilités indiquées dans le tableau. Il veut fixer la mise pour que le jeu soit équitable. Quelle mise doit-il demander ?`, m,
        `Le jeu est équitable si la mise est égale au gain moyen versé : E(R) = ${eSum(xs, ps)} = ${fmt(m)} écus.`), tableOf(xs, ps, ['r', 'P(R = r)']))
    }),
    () => retry(() => {
      const xs = [1, 2, 3, 4], ps = randProbs(4, 10), V = variance(xs, ps), m = mean(xs, ps)
      if (!isDec(V, 2) || Math.max(...ps) > 0.6) return null
      return T('Les jours de pluie', val(`${prenom()}, qui cultive le domaine, a relevé pendant ${randInt(3, 10)} étés le nombre X de jours de pluie par semaine de moisson ; la loi de X est donnée par le diagramme ci-dessous. Calcule la variance V(X).`, V,
        `E(X) = ${eSum(xs, ps)} = ${fmt(m)}. V(X) = ${xs.map((x, i) => `${fmt(ps[i])} × ${par(rd(x - m))}²`).join(' + ')} = ${fmt(V)}.`), barsFigure(xs, ps, 0.6, 0.1))
    }),
    () => {
      const n = pick([16, 25, 36, 49, 64]), m = randInt(20, 50), s = randInt(1, 3), cap = n * m
      return T('Le convoi de sacs', val(`Un chariot transporte ${n} sacs de farine ; chaque sac pèse en moyenne ${m} kg avec un écart-type de ${s} kg, indépendamment des autres. Avant de franchir le vieux pont, le maître du convoi veut connaître la dispersion de la masse totale : quel est l’écart-type de la masse totale des sacs (en kg) ?`, s * Math.sqrt(n),
        `E(S) = ${n} × ${m} = ${cap} kg ; V(S) = ${n} × ${s}² = ${n * s * s}, donc σ(S) = √${n * s * s} = ${s * Math.sqrt(n)} kg.`))
    },
  ],
  [
    () => retry(() => {
      const p1v = pick([0.01, 0.02, 0.05]), c1 = pick([500, 1000, 2000]), p2v = pick([0.1, 0.15, 0.2]), c2 = pick([50, 100, 200]), marge = pick([10, 20, 30])
      const E = rd(p1v * c1 + p2v * c2), prime = rd(E + marge)
      return T('L’assurance du marchand', val(`Une guilde assure les marchands : chaque année, un marchand subit un pillage (indemnité ${c1} écus) avec la probabilité ${fmt(p1v)}, une simple avarie (indemnité ${c2} écus) avec la probabilité ${fmt(p2v)}, et rien sinon. La guilde veut gagner en moyenne ${marge} écus par contrat. Quelle prime annuelle doit-elle demander ?`, prime,
        `Indemnité moyenne : ${c1} × ${fmt(p1v)} + ${c2} × ${fmt(p2v)} = ${fmt(E)} écus. Gain moyen de la guilde = prime − ${fmt(E)} = ${marge}, donc prime = ${fmt(prime)} écus.`))
    }),
    () => retry(() => {
      const [s1, s2, s3, s] = pick([[2, 3, 6, 7], [1, 4, 8, 9], [2, 6, 9, 11], [4, 4, 7, 9], [2, 10, 11, 15], [6, 6, 7, 11]] as const)
      const e = [randInt(20, 60), randInt(30, 90), randInt(15, 50)]
      return T('Le trajet du messager', val(`Un messager rejoint la capitale en trois étapes de durées indépendantes : moyennes ${e[0]}, ${e[1]} et ${e[2]} minutes, écarts-types ${s1}, ${s2} et ${s3} minutes. Quel est l’écart-type de la durée totale du trajet (en minutes) ?`, s,
        `Les étapes sont indépendantes : V = ${s1}² + ${s2}² + ${s3}² = ${s1 * s1 + s2 * s2 + s3 * s3}, donc σ = √${s * s} = ${s} min (et la durée moyenne vaut ${e[0] + e[1] + e[2]} min).`))
    }),
    () => retry(() => {
      const xs = [0, 1, 2, 3], ps = randProbs(4, 10), V = variance(xs, ps), e = pick([0.1, 0.05]), n = Math.ceil(rd(V / (e * e)))
      if (!isDec(V, 2) || V === 0) return null
      return T('L’enquête du bailli', val(`Le bailli de ${pick(['Montfort', 'Beaulieu', 'Roquebrune', 'Vaucelles', 'Clairval'])} veut estimer le nombre moyen d’enfants par foyer. Il admet que ce nombre X suit la loi du tableau ci-dessous et calculera la moyenne M_n de n foyers tirés au hasard indépendamment. Combien de foyers doit-il interroger au minimum pour que l’écart-type de M_n soit au plus ${fmt(e)} ?`, n,
        `E(X) = ${fmt(mean(xs, ps))}, V(X) = ${fmt(V)}. σ(M_n) = √(${fmt(V)}/n) ≤ ${fmt(e)} ⇔ n ≥ ${fmt(V)} ÷ ${fmt(rd(e * e))} = ${fmt(rd(V / (e * e)))}. Il faut n = ${n} foyers.`), tableOf(xs, ps))
    }),
  ],
]

export const CONTENT: SubjectContent | null = {
  tiers: [tier1, tier2, tier3, tier4, tier5],
  upgrades,
  age,
}
