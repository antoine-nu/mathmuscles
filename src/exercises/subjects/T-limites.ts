// Limites de fonctions, continuité, théorème des valeurs intermédiaires (Terminale, spécialité) : limites en l'infini
// et en un point, formes indéterminées, asymptotes, continuité, nombre de solutions de f(x) = k (corollaire du TVI,
// tableau de variations), encadrement d'une solution par balayage.
// Paliers 1 à 3 : adultes qui reprennent (rappels guidés) ; paliers 2 à 5 : adultes aguerris.
import {
  choice, fmt, fracText, fresh, numeric, parseNumber, pick, randInt, randNonZero, variants, withMeta,
  type Exercise, type Ladder, type SubjectContent, type Tiers,
} from '../utils'
import { graphFigure, type Figure } from '../figure'

// ── Aides locales ───────────────────────────────────────────────────────
const BLUE = '#5b8fc7'
const T = (title: string, ex: Exercise, figure?: Figure): Exercise => withMeta(ex, figure ? { title, figure } : { title })

const r6 = (v: number) => Math.round(v * 1e6) / 1e6
/** « + 3 » ou « − 3 » à coller après un terme (rien si 0). */
const tail = (p: number) => (p === 0 ? '' : ` ${p < 0 ? '−' : '+'} ${fmt(Math.abs(p))}`)
/** Coefficient devant une variable : 1 → rien, −1 → « − ». */
const cf = (k: number) => (k === 1 ? '' : k === -1 ? '−' : fmt(k))
/** Monôme suivant : « + 3x² », « − x »… (rien si 0). */
const mono = (k: number, v: string) => (k === 0 ? '' : ` ${k < 0 ? '−' : '+'} ${Math.abs(k) === 1 ? '' : fmt(Math.abs(k))}${v}`)
/** x − a, x + a, ou x. */
const xm = (a: number) => (a === 0 ? 'x' : `x ${a > 0 ? '−' : '+'} ${fmt(Math.abs(a))}`)
const par = (n: number) => (n < 0 ? `(${fmt(n)})` : fmt(n))
/** Fraction empilée avec signe propre : {−1/5}. */
const fr = (n: number, d: number) => `{${fmt(n)}/${fmt(d)}}`
const sgnInf = (s: number) => (s > 0 ? Infinity : -Infinity)
const infText = (v: number) => (v === Infinity ? '+∞' : v === -Infinity ? '−∞' : fmt(v))

/** Lit une limite : nombre, fraction, ou ±∞ (« +inf », « -∞ », « plus l'infini »…). */
function parseLimit(raw: string): number {
  const s = raw.trim().toLowerCase().replace(/[−–—]/g, '-').replace(/l['’]/g, '').replace(/\s+/g, '')
  if (/^(\+?(∞|inf|infini|infinity)|plusinfini|plus∞)$/.test(s)) return Infinity
  if (/^(-(∞|inf|infini|infinity)|moinsinfini|moins∞)$/.test(s)) return -Infinity
  return parseNumber(raw)
}
/** Réponse : une limite (nombre, fraction [n, d], +∞ ou −∞). */
function lim(prompt: string, value: number | [number, number], explanation: string): Exercise {
  const v = Array.isArray(value) ? value[0] / value[1] : value
  const answer = Array.isArray(value) ? fracText(value[0], value[1]) : infText(value)
  return {
    prompt,
    kind: 'input',
    answer,
    explanation,
    inputHint: 'Un nombre, +∞ ou −∞',
    format: 'un nombre (ou une fraction), +∞ ou −∞ (on peut écrire +inf, -inf)',
    keypad: ['+∞', '−∞', '−', '/'],
    isValid: (x) => !Number.isNaN(parseLimit(x)),
    check: (x) => {
      const got = parseLimit(x)
      return Number.isFinite(v) ? Number.isFinite(got) && Math.abs(got - v) < 1e-6 * Math.max(1, Math.abs(v)) : got === v
    },
  }
}
const num = (prompt: string, value: number, explanation: string) => numeric(prompt, value, { explanation })

/** Fonction continue passant par les points donnés, monotone entre deux points consécutifs (tangentes horizontales). */
function smooth(knots: [number, number][]) {
  return (x: number) => {
    let i = 0
    while (i < knots.length - 2 && x > knots[i + 1][0]) i++
    const [x0, y0] = knots[i], [x1, y1] = knots[i + 1]
    const s = Math.max(0, Math.min(1, (x - x0) / (x1 - x0)))
    return y0 + (y1 - y0) * s * s * (3 - 2 * s)
  }
}
/** Nombre de solutions de f(x) = k pour une fonction « smooth » (k différent des valeurs aux nœuds). */
const countSol = (knots: [number, number][], k: number) =>
  knots.slice(1).filter(([, y], i) => (k - knots[i][1]) * (k - y) < 0).length
/** Tableau de variations en texte : « croissante sur [−3 ; 1] de −4 à 5, puis décroissante sur [1 ; 6] de 5 à −2 ». */
const variationText = (knots: [number, number][]) => knots.slice(1).map(([x, y], i) => {
  const [x0, y0] = knots[i]
  return `strictement ${y > y0 ? 'croissante' : 'décroissante'} sur [${fmt(x0)} ; ${fmt(x)}] de ${fmt(y0)} à ${fmt(y)}`
}).join(', puis ')

/** Abscisse minimale de la fenêtre qui laisse la place aux nombres écrits sur l'axe des ordonnées (largeur ≈ 6,5 px par caractère). */
function padX(xMax: number, yMax: number) {
  const need = 6.5 * fmt(yMax).length + 8 - 22
  return need <= 0 ? 0 : -(need * xMax) / (276 - need)
}

/** Courbe d'une fonction « smooth » dans un repère. */
function knotsFigure(knots: [number, number][], level?: number): Figure {
  const xs = knots.map((p) => p[0]), ys = knots.map((p) => p[1])
  const g = graphFigure({ xMin: Math.min(0, ...xs) - 0.5, xMax: Math.max(...xs) + 0.5, yMin: Math.min(0, ...ys) - 1, yMax: Math.max(0, ...ys) + 1 })
  const f = smooth(knots)
  g.plot(f, { a: xs[0], b: xs[xs.length - 1] })
  if (level !== undefined) g.plot(() => level, { dashed: true, color: BLUE })
  g.figure.caption = level !== undefined ? `Courbe de f ; en pointillés, la droite d'équation y = ${fmt(level)}.` : 'Courbe représentative de f.'
  return g.figure
}

/** Tableau de variations aléatoire : extrema entiers, alternance montée / descente. */
function randomKnots(pieces: number): [number, number][] {
  const knots: [number, number][] = []
  let x = randInt(-4, -2)
  let y = randInt(-4, 4)
  const up = Math.random() < 0.5
  knots.push([x, y])
  for (let i = 0; i < pieces; i++) {
    x += randInt(2, 3)
    const rising = (i % 2 === 0) === up
    y = rising ? y + randInt(3, 7) : y - randInt(3, 7)
    knots.push([x, y])
  }
  return knots
}

/** Fenêtre de tracé pour f(x) = c + k/(x − d). */
function hyperbolaFigure(c: number, k: number, d: number): Figure {
  const g = graphFigure({ xMin: d - 5, xMax: d + 5, yMin: c - 5, yMax: c + 5 })
  g.plot((x) => c + k / (x - d), { a: d - 5, b: d - 0.05 })
  g.plot((x) => c + k / (x - d), { a: d + 0.05, b: d + 5 })
  g.plot(() => c, { dashed: true, color: BLUE })
  g.figure.curves!.push({ pts: [g.at(d, c - 5), g.at(d, c + 5)], color: BLUE, dashed: true })
  g.figure.caption = 'Courbe de f et ses asymptotes (en pointillés).'
  return g.figure
}

/** Racine d'une fonction croissante sur [a ; b] (dichotomie). */
function root(f: (x: number) => number, a: number, b: number) {
  let lo = a, hi = b
  for (let i = 0; i < 60; i++) {
    const m = (lo + hi) / 2
    if (f(m) < 0) lo = m
    else hi = m
  }
  return (lo + hi) / 2
}

/** Équations f(x) = 0 avec f strictement croissante sur [1 ; 3] et une racine « loin » des dixièmes. */
function scanCase() {
  for (;;) {
    const c = pick([
      () => { const k = randInt(3, 20); return { t: `x³ + x − ${fmt(k)}`, eq: `x³ + x = ${fmt(k)}`, f: (x: number) => x ** 3 + x - k } },
      () => { const k = randInt(4, 25); return { t: `x³ + 2x − ${fmt(k)}`, eq: `x³ + 2x = ${fmt(k)}`, f: (x: number) => x ** 3 + 2 * x - k } },
      () => { const k = pick([2, 3, 4, 5, 6, 7, 9, 10, 11, 12, 13, 15, 20]); return { t: `x³ − ${fmt(k)}`, eq: `x³ = ${fmt(k)}`, f: (x: number) => x ** 3 - k } },
      () => { const k = randInt(3, 10); return { t: `x² + x − ${fmt(k)}`, eq: `x² + x = ${fmt(k)}`, f: (x: number) => x * x + x - k } },
      () => { const k = randInt(2, 9); return { t: `x³ + x² − ${fmt(k)}`, eq: `x³ + x² = ${fmt(k)}`, f: (x: number) => x ** 3 + x * x - k } },
    ])()
    if (c.f(1) >= 0 || c.f(3) <= 0) continue
    const a = root(c.f, 1, 3)
    const d = a * 10 - Math.floor(a * 10)
    if (d < 0.1 || d > 0.9) continue
    const n = Math.floor(a)
    return { ...c, alpha: a, lo: Math.floor(a * 10) / 10, n }
  }
}

// ═══ Entraînement ═══════════════════════════════════════════════════════
const REF = [
  { f: 'x²', at: '−∞', v: Infinity, e: 'x² est positif et devient aussi grand que l’on veut.' },
  { f: 'x³', at: '−∞', v: -Infinity, e: 'x³ a le signe de x : il tend vers −∞.' },
  { f: '√x', at: '+∞', v: Infinity, e: '√x dépasse tout nombre pour x assez grand.' },
  { f: '{1/x}', at: '+∞', v: 0, e: 'L’inverse d’un nombre de plus en plus grand tend vers 0.' },
  { f: '{1/x}', at: '0 par valeurs positives (0⁺)', v: Infinity, e: 'L’inverse d’un petit nombre positif est un grand nombre positif.' },
  { f: '{1/x}', at: '0 par valeurs négatives (0⁻)', v: -Infinity, e: 'L’inverse d’un petit nombre négatif est un grand nombre négatif.' },
  { f: '{1/x²}', at: '0', v: Infinity, e: 'x² est un petit nombre positif, son inverse tend vers +∞.' },
  { f: 'eˣ', at: '+∞', v: Infinity, e: 'L’exponentielle tend vers +∞ en +∞.' },
  { f: 'eˣ', at: '−∞', v: 0, e: 'L’exponentielle tend vers 0 en −∞ (l’axe des abscisses est asymptote).' },
  { f: 'ln(x)', at: '+∞', v: Infinity, e: 'ln(x) tend vers +∞ (lentement) en +∞.' },
  { f: 'ln(x)', at: '0⁺', v: -Infinity, e: 'ln(x) tend vers −∞ quand x tend vers 0 par valeurs positives.' },
  { f: '{1/x}', at: '−∞', v: 0, e: 'L’inverse d’un nombre négatif de plus en plus grand en valeur absolue tend vers 0.' },
]

const tiers: Tiers = [
  // ── Palier 1 : rappels guidés ──
  [
    // Limites de référence
    variants(
      () => {
        const r = pick(REF.slice(0, 7))
        return lim(`Quelle est la limite de ${r.f} quand x tend vers ${r.at} ? (Réponds par un nombre, +∞ ou −∞.)`, r.v, r.e)
      },
      () => {
        const r = pick(REF.slice(7))
        return lim(`Rappel de cours : quelle est la limite de ${r.f} en ${r.at} ?`, r.v, r.e)
      },
      () => {
        const n = randInt(2, 5), s = pick(['+∞', '−∞'])
        const v = s === '+∞' || n % 2 === 0 ? Infinity : -Infinity
        return lim(`Quelle est la limite de x^${n} en ${s} ?`, v, `x^${n} : exposant ${n % 2 === 0 ? 'pair, résultat positif' : 'impair, même signe que x'} ; la limite est ${infText(v)}.`)
      },
      () => {
        const n = randInt(1, 4), s = pick(['+∞', '−∞'])
        return lim(`Quelle est la limite de {1/x${n > 1 ? `^${n}` : ''}} en ${s} ?`, 0, `Le dénominateur devient aussi grand que l'on veut en valeur absolue : la limite est 0.`)
      },
    ),
    // Lecture graphique
    variants(
      () => {
        const c = randInt(-2, 3), k = pick([1, 2, -1, -2]), d = randInt(-2, 2)
        return withMeta(lim(`On a tracé la courbe d'une fonction f et ses asymptotes. Quelle est la limite de f(x) quand x tend vers +∞ ?`, c,
          `La courbe se rapproche de la droite horizontale d'équation y = ${fmt(c)} : la limite est ${fmt(c)}.`), { figure: hyperbolaFigure(c, k, d) })
      },
      () => {
        const c = randInt(-2, 3), k = pick([1, 2, -1, -2]), d = randInt(-2, 2)
        return withMeta(lim(`On a tracé la courbe d'une fonction f et ses asymptotes. Quelle est la limite de f(x) quand x tend vers −∞ ?`, c,
          `À gauche, la courbe se rapproche de la droite d'équation y = ${fmt(c)} : la limite est ${fmt(c)}.`), { figure: hyperbolaFigure(c, k, d) })
      },
      () => {
        const c = randInt(-2, 3), k = pick([1, 2, -1, -2]), d = randNonZero(-2, 2)
        return withMeta(lim(`On a tracé la courbe d'une fonction f et ses asymptotes. Quelle est la limite de f(x) quand x tend vers ${fmt(d)} par valeurs supérieures (à droite) ?`, sgnInf(k),
          `Juste à droite de x = ${fmt(d)}, la courbe ${k > 0 ? 'monte' : 'descend'} le long de l'asymptote verticale : ${k > 0 ? '+∞' : '−∞'}.`), { figure: hyperbolaFigure(c, k, d) })
      },
      () => {
        const c = randInt(-2, 3), k = pick([1, 2, -1, -2]), d = randNonZero(-2, 2)
        return withMeta(lim(`On a tracé la courbe d'une fonction f et ses asymptotes. Quelle est la limite de f(x) quand x tend vers ${fmt(d)} par valeurs inférieures (à gauche) ?`, sgnInf(-k),
          `Juste à gauche de x = ${fmt(d)}, la courbe ${k < 0 ? 'monte' : 'descend'} le long de l'asymptote verticale : ${k < 0 ? '+∞' : '−∞'}.`), { figure: hyperbolaFigure(c, k, d) })
      },
      () => {
        const c = randInt(-1, 3), b = pick([2, 3, -2, -3])
        const g = graphFigure({ xMin: -3, xMax: 6, yMin: Math.min(-1, c - 4), yMax: Math.max(4, c + 4) })
        g.plot((x) => c + b * Math.exp(-x))
        g.plot(() => c, { dashed: true, color: BLUE })
        g.figure.caption = 'Courbe de f et son asymptote (en pointillés).'
        return withMeta(lim(`Voici la courbe d'une fonction f. Quelle est la limite de f(x) quand x tend vers +∞ ?`, c,
          `La courbe se rapproche de la droite d'équation y = ${fmt(c)}.`), { figure: g.figure })
      },
    ),
    // Somme et produit simples
    variants(
      () => {
        const a = randInt(1, 6), b = randInt(1, 9), s = pick(['+∞', '−∞'])
        return lim(`Quelle est la limite de f(x) = ${cf(a)}x² + ${b} en ${s} ?`, Infinity, `x² → +∞ donc ${cf(a)}x² + ${b} → +∞ (somme d'un terme qui tend vers +∞ et d'une constante).`)
      },
      () => {
        const a = randInt(1, 6), b = randInt(1, 9)
        return lim(`Quelle est la limite de f(x) = ${cf(a)}x − ${b} en −∞ ?`, -Infinity, `${cf(a)}x → −∞ et on retire ${b} : la limite est −∞.`)
      },
      () => {
        const a = randInt(2, 5)
        return lim(`Quelle est la limite de f(x) = −${a}x³ − x en +∞ ?`, -Infinity, `−${a}x³ → −∞ et −x → −∞ : par somme, −∞.`)
      },
      fresh(() => {
        const a = randInt(1, 6), b = randInt(2, 6)
        return lim(`Quelle est la limite de f(x) = (${a} + {1/x})(${b} − {1/x}) en +∞ ? (Indice : {1/x} tend vers 0.)`, a * b,
          `${a} + {1/x} → ${a} et ${b} − {1/x} → ${b} : par produit, la limite est ${a * b}.`)
      }),
      () => {
        const a = randInt(1, 5), b = randInt(1, 9)
        return lim(`Quelle est la limite de f(x) = ${cf(a)}√x + ${cf(b)}x en +∞ ?`, Infinity, `Les deux termes tendent vers +∞ : par somme, +∞.`)
      },
    ),
    // Continuité : limite en un point = image
    variants(
      fresh(() => {
        const a = randNonZero(-3, 3), p = randNonZero(-4, 4), q = randInt(-9, 9)
        return num(`f(x) = x²${mono(p, 'x')}${tail(q)} est un polynôme, donc continue. Quelle est la limite de f(x) quand x tend vers ${fmt(a)} ? (Il suffit de calculer f(${fmt(a)}).)`, a * a + p * a + q,
          `f est continue en ${fmt(a)} : la limite vaut f(${fmt(a)}) = ${par(a)}² + ${par(p)} × ${par(a)}${tail(q)} = ${fmt(a * a + p * a + q)}.`)
      }),
      fresh(() => {
        const k = randInt(1, 5), a = pick([1, 2, 3, 4, 5, 6].filter((v) => v !== k * k))
        const s = k * k - a
        return num(`Quelle est la limite de √{x ${s < 0 ? '−' : '+'} ${Math.abs(s)}} quand x tend vers ${a} ?`, k,
          `La fonction est continue en ${a} : √(${a} ${s < 0 ? '−' : '+'} ${Math.abs(s)}) = √${k * k} = ${fmt(k)}.`)
      }),
      () => {
        const a = randInt(-3, 4), b = randNonZero(-5, 5), c = pick([1, 2, 3, 4].filter((v) => v !== -a))
        const den = a + c
        return lim(`Quelle est la limite de {${xm(-b)}/x + ${c}} quand x tend vers ${fmt(a)} ?`, [a + b, den],
          `Le dénominateur ne s'annule pas en ${fmt(a)} : on remplace, {${fmt(a)} ${b < 0 ? '−' : '+'} ${Math.abs(b)}/${fmt(a)} + ${c}} = ${fracText(a + b, den)}.`)
      },
      fresh(() => {
        const a = randNonZero(-3, 3), m = randNonZero(-6, 6)
        return num(`Quelle est la limite de (${xm(-m)})e^{${xm(a)}} quand x tend vers ${fmt(a)} ?`, a + m,
          `La fonction est continue : on remplace x par ${fmt(a)}, (${fmt(a)} ${m < 0 ? '−' : '+'} ${Math.abs(m)}) × e⁰ = ${fmt(a + m)} × 1 = ${fmt(a + m)}.`)
      }),
    ),
    // Asymptotes
    variants(
      fresh(() => {
        const c = randInt(2, 5), x0 = randNonZero(-5, 5), b = randNonZero(-9, 9)
        return num(`f(x) = {${b < 0 ? '−' : ''}${Math.abs(b)}/${c}x ${x0 * c > 0 ? '−' : '+'} ${Math.abs(x0 * c)}}. La courbe de f a une asymptote verticale d'équation x = a. Que vaut a ? (Le dénominateur s'annule en a.)`, x0,
          `${c}x ${x0 * c > 0 ? '−' : '+'} ${Math.abs(x0 * c)} = 0 pour x = ${fmt(x0)} : c'est l'asymptote verticale x = ${fmt(x0)}.`)
      }),
      () => {
        const a = randNonZero(-6, 6), c = randInt(2, 5), b = randInt(-9, 9), d = randNonZero(-9, 9)
        return lim(`f(x) = {${cf(a)}x${tail(b)}/${c}x${tail(d)}}. La droite d'équation y = m est asymptote à la courbe de f en +∞. Que vaut m ? (Cherche la limite de f en +∞.)`, [a, c],
          `En +∞, f(x) se comporte comme {${cf(a)}x/${c}x} = ${fr(a, c)} : m = ${fracText(a, c)}.`)
      },
      () => {
        const c = randInt(-2, 3), k = pick([1, 2, -1, -2]), d = randNonZero(-2, 2)
        return withMeta(num(`La courbe de f (ci-dessous) admet une asymptote verticale d'équation x = a. Que vaut a ?`, d,
          `La courbe « s'envole » le long de la droite verticale x = ${fmt(d)}.`), { figure: hyperbolaFigure(c, k, d) })
      },
      () => {
        const c = randNonZero(-3, 3), k = pick([1, 2, -1, -2]), d = randInt(-2, 2)
        return withMeta(num(`La courbe de f (ci-dessous) admet une asymptote horizontale d'équation y = m. Que vaut m ?`, c,
          `En ±∞, la courbe se rapproche de la droite horizontale y = ${fmt(c)}.`), { figure: hyperbolaFigure(c, k, d) })
      },
    ),
  ],
  // ── Palier 2 ──
  [
    // Polynômes à l'infini
    variants(
      () => {
        const a = randNonZero(-5, 5), n = randInt(2, 5), b = randNonZero(-9, 9), s = pick([1, -1])
        const v = Math.sign(a) * (n % 2 === 0 ? 1 : s)
        return lim(`Quelle est la limite de f(x) = ${cf(a)}x^${n}${mono(b, 'x')} + 1 en ${s > 0 ? '+∞' : '−∞'} ?`, sgnInf(v),
          `Un polynôme a la même limite que son terme de plus haut degré : ${cf(a)}x^${n} → ${infText(sgnInf(v))}.`)
      },
      () => {
        const a = randNonZero(-5, 5), b = randNonZero(-9, 9), c = randInt(-9, 9), s = pick([1, -1])
        const v = Math.sign(a) * s
        return lim(`Quelle est la limite de f(x) = ${cf(a)}x³${mono(b, 'x²')}${tail(c)} en ${s > 0 ? '+∞' : '−∞'} ?`, sgnInf(v),
          `Terme de plus haut degré : ${cf(a)}x³, qui tend vers ${infText(sgnInf(v))}.`)
      },
      () => {
        const a = randInt(1, 5), b = randInt(1, 9), s = pick([1, -1])
        return lim(`Quelle est la limite de f(x) = ${cf(b)}x − ${cf(a)}x² en ${s > 0 ? '+∞' : '−∞'} ?`, -Infinity,
          `Terme dominant −${cf(a)}x², qui tend vers −∞ des deux côtés.`)
      },
      () => {
        const a = randNonZero(-4, 4), s = pick([1, -1])
        const v = Math.sign(a) * s
        return lim(`Quelle est la limite de f(x) = (${cf(a)}x + 1)(x² + 3) en ${s > 0 ? '+∞' : '−∞'} ?`, sgnInf(v),
          `Le terme dominant du produit est ${cf(a)}x³, qui tend vers ${infText(sgnInf(v))}.`)
      },
    ),
    // Fonctions rationnelles à l'infini
    variants(
      () => {
        const a = randNonZero(-6, 6), c = randInt(2, 6), b = randInt(-9, 9), d = randNonZero(-9, 9), s = pick(['+∞', '−∞'])
        return lim(`Quelle est la limite de f(x) = {${cf(a)}x²${tail(b)}/${c}x²${tail(d)}} en ${s} ?`, [a, c],
          `Quotient des termes de plus haut degré : {${cf(a)}x²/${c}x²} = ${fr(a, c)}.`)
      },
      () => {
        const a = randNonZero(-6, 6), c = randInt(1, 6), b = randInt(-9, 9), s = pick(['+∞', '−∞'])
        return lim(`Quelle est la limite de f(x) = {${cf(a)}x${tail(b)}/${cf(c)}x² + 1} en ${s} ?`, 0,
          `Quotient des termes dominants : {${cf(a)}x/${cf(c)}x²} = {${fmt(a)}/${cf(c)}x} → 0.`)
      },
      () => {
        const a = randNonZero(-5, 5), c = randInt(1, 5), b = randInt(-9, 9), s = pick([1, -1])
        const v = Math.sign(a) * s
        return lim(`Quelle est la limite de f(x) = {${cf(a)}x²${tail(b)}/${cf(c)}x + 1} en ${s > 0 ? '+∞' : '−∞'} ?`, sgnInf(v),
          `Termes dominants : {${cf(a)}x²/${cf(c)}x} = ${fr(a, c)}x, qui tend vers ${infText(sgnInf(v))}.`)
      },
      () => {
        const a = randNonZero(-6, 6), c = randInt(2, 6), b = randInt(-9, 9), d = randNonZero(-9, 9)
        return lim(`Quelle est la limite de f(x) = {${cf(a)}x${tail(b)}/${c}x${tail(d)}} en −∞ ?`, [a, c],
          `Quotient des termes de plus haut degré : {${cf(a)}x/${c}x} = ${fr(a, c)}.`)
      },
    ),
    // Limite infinie en un point
    variants(
      () => {
        const a = randNonZero(-5, 5), k = randNonZero(-6, 6)
        return lim(`Quelle est la limite de f(x) = {${fmt(k)}/${xm(a)}} quand x tend vers ${fmt(a)} par valeurs supérieures (x > ${fmt(a)}) ?`, sgnInf(k),
          `${xm(a)} → 0 en restant positif ; ${fmt(k)} ${k > 0 ? '> 0' : '< 0'}, donc le quotient tend vers ${infText(sgnInf(k))}.`)
      },
      () => {
        const a = randNonZero(-5, 5), k = randNonZero(-6, 6)
        return lim(`Quelle est la limite de f(x) = {${fmt(k)}/${xm(a)}} quand x tend vers ${fmt(a)} par valeurs inférieures (x < ${fmt(a)}) ?`, sgnInf(-k),
          `${xm(a)} → 0 en restant négatif ; ${fmt(k)} ${k > 0 ? '> 0' : '< 0'}, donc le quotient tend vers ${infText(sgnInf(-k))}.`)
      },
      () => {
        const a = randNonZero(-5, 5), k = randNonZero(-6, 6)
        return lim(`Quelle est la limite de f(x) = {${fmt(k)}/(${xm(a)})²} quand x tend vers ${fmt(a)} ?`, sgnInf(k),
          `(${xm(a)})² → 0 en restant positif ; ${fmt(k)} ${k > 0 ? '> 0' : '< 0'} : ${infText(sgnInf(k))}.`)
      },
      () => {
        const a = randNonZero(-4, 4)
        let b = randNonZero(-6, 6)
        while (a + b === 0) b = randNonZero(-6, 6)
        const top = a + b
        return lim(`Quelle est la limite de f(x) = {${xm(-b)}/${xm(a)}} quand x tend vers ${fmt(a)} par valeurs supérieures (x > ${fmt(a)}) ?`, sgnInf(top),
          `Le numérateur tend vers ${fmt(a)} ${b < 0 ? '−' : '+'} ${Math.abs(b)} = ${fmt(top)} ${top > 0 ? '> 0' : '< 0'} et le dénominateur vers 0 par valeurs positives : ${infText(sgnInf(top))}.`)
      },
    ),
    // TVI : application directe
    variants(
      fresh(() => {
        const a = randInt(2, 5), b = a + randInt(3, 6), fa = randInt(-9, -2), fb = randInt(2, 9), k = randInt(fa + 1, fb - 1)
        return num(`f est continue et strictement croissante sur [${a} ; ${b}], avec f(${a}) = ${fmt(fa)} et f(${b}) = ${fb}. Combien de solutions l'équation f(x) = ${fmt(k)} admet-elle sur [${a} ; ${b}] ?`, 1,
          `${fmt(k)} est compris entre f(${a}) et f(${b}) ; f est continue et strictement monotone : corollaire du TVI, une unique solution.`)
      }),
      fresh(() => {
        const a = randInt(2, 5), b = a + randInt(3, 6), fa = randInt(2, 9), fb = randInt(-9, -2), k = randInt(fb + 1, fa - 1)
        return num(`f est continue et strictement décroissante sur [${a} ; ${b}], avec f(${a}) = ${fa} et f(${b}) = ${fmt(fb)}. Combien de solutions l'équation f(x) = ${fmt(k)} admet-elle sur [${a} ; ${b}] ?`, 1,
          `f(${b}) < ${fmt(k)} < f(${a}), f continue et strictement décroissante : exactement une solution.`)
      }),
      fresh(() => {
        const a = randInt(2, 5), b = a + randInt(3, 6), fa = randInt(-9, -2), fb = randInt(2, 9), k = fb + randInt(2, 6)
        return num(`f est continue et strictement croissante sur [${a} ; ${b}], avec f(${a}) = ${fmt(fa)} et f(${b}) = ${fb}. Combien de solutions l'équation f(x) = ${fmt(k)} admet-elle sur [${a} ; ${b}] ?`, 0,
          `f étant croissante, ses valeurs restent entre ${fmt(fa)} et ${fb} : elle n'atteint jamais ${fmt(k)}, il y a 0 solution.`)
      }),
      () => {
        const a = randInt(2, 5), b = a + randInt(3, 6), fa = randInt(-9, -2), fb = randInt(2, 9)
        return choice(`f est continue sur [${a} ; ${b}] (sans autre information), avec f(${a}) = ${fmt(fa)} et f(${b}) = ${fb}. Que peut-on affirmer sur l'équation f(x) = 0 ?`,
          'Elle a au moins une solution dans [' + a + ' ; ' + b + ']', ['Elle a exactement une solution', 'Elle n’a aucune solution', 'On ne peut rien dire'],
          `TVI : f continue et 0 compris entre f(${a}) et f(${b}), donc au moins une solution ; sans monotonie, on ne peut pas dire « exactement une ».`)
      },
    ),
    // Exponentielle
    variants(
      () => {
        const a = randInt(1, 5), s = pick([1, -1])
        return lim(`Quelle est la limite de f(x) = e^{${s < 0 ? '−' : ''}${cf(a)}x} en +∞ ?`, s > 0 ? Infinity : 0,
          s > 0 ? `${cf(a)}x → +∞ et eˣ → +∞ en +∞ : la limite est +∞.` : `−${cf(a)}x → −∞ et e^X → 0 quand X → −∞ : la limite est 0.`)
      },
      fresh(() => {
        const a = randInt(2, 9), b = randInt(2, 6)
        return lim(`Quelle est la limite de f(x) = (${a} − e^{−x})(${b} + 2e^{−x}) en +∞ ?`, a * b,
          `e^{−x} → 0 en +∞ : les parenthèses tendent vers ${a} et ${b}, donc f(x) → ${a * b}.`)
      }),
      () => {
        const a = randInt(1, 6)
        return lim(`Quelle est la limite de f(x) = ${a} − eˣ en +∞ ?`, -Infinity, `eˣ → +∞ donc ${a} − eˣ → −∞.`)
      },
      () => {
        const c = randInt(2, 6)
        return pick([
          () => lim(`Quelle est la limite de f(x) = {${c}/1 + e^{−x}} en +∞ ?`, c, `e^{−x} → 0 donc le dénominateur tend vers 1 et f(x) → ${c}.`),
          () => lim(`Quelle est la limite de f(x) = {${c}/1 + e^{−x}} en −∞ ?`, 0, `e^{−x} → +∞ en −∞ donc le dénominateur tend vers +∞ et f(x) → 0.`),
          () => lim(`Quelle est la limite de f(x) = e^{x²} + ${c} en −∞ ?`, Infinity, `x² → +∞ donc e^{x²} → +∞.`),
        ])()
      },
    ),
  ],
  // ── Palier 3 : standard de Terminale ──
  [
    // Formes indéterminées levées
    variants(
      () => {
        const a = randInt(1, 4), b = randInt(1, 9), s = pick([1, -1])
        return lim(`Quelle est la limite de f(x) = ${cf(a)}x² − ${cf(b)}x en ${s > 0 ? '+∞' : '−∞'} ?`, Infinity,
          s > 0 ? `Forme « ∞ − ∞ » : f(x) = x(${cf(a)}x − ${b}) ; les deux facteurs tendent vers +∞ : +∞.` : `Pas d'indétermination en −∞ : ${cf(a)}x² → +∞ et −${cf(b)}x → +∞ ; par somme +∞.`)
      },
      fresh(() => {
        const a = randNonZero(-6, 6)
        return num(`Quelle est la limite de f(x) = {x² − ${a * a}/${xm(a)}} quand x tend vers ${fmt(a)} ?`, 2 * a,
          `Forme « 0/0 » : x² − ${a * a} = (${xm(a)})(${xm(-a)}), donc f(x) = ${xm(-a)} pour x ≠ ${fmt(a)} → ${fmt(a)} ${a < 0 ? '−' : '+'} ${Math.abs(a)} = ${fmt(2 * a)}.`)
      }),
      fresh(() => {
        const r = randNonZero(-4, 4)
        let s = randNonZero(-5, 5)
        while (s === r) s = randNonZero(-5, 5)
        const B = -(r + s), C = r * s
        return num(`Quelle est la limite de f(x) = {x²${mono(B, 'x')}${tail(C)}/${xm(r)}} quand x tend vers ${fmt(r)} ?`, r - s,
          `Forme « 0/0 » : x²${mono(B, 'x')}${tail(C)} = (${xm(r)})(${xm(s)}), donc f(x) = ${xm(s)} → ${fmt(r)} − ${par(s)} = ${fmt(r - s)}.`)
      }),
      () => {
        const a = randInt(1, 4), s = pick([1, -1])
        return lim(`Quelle est la limite de f(x) = x³ − ${cf(a)}x² + 5 en ${s > 0 ? '+∞' : '−∞'} ?`, sgnInf(s),
          `${s > 0 ? 'Forme « ∞ − ∞ » : on factorise par x³, f(x) = x³(1 − ' + a + '/x + 5/x³) ; la parenthèse tend vers 1' : 'Les termes x³ et −' + cf(a) + 'x² tendent vers −∞'} : la limite est ${infText(sgnInf(s))}.`)
      },
    ),
    // Asymptotes d'une fonction homographique
    variants(
      fresh(() => {
        const a = randNonZero(-6, 6), c = randInt(1, 4), x0 = randNonZero(-5, 5)
        let b = randInt(-9, 9)
        while (a * x0 + b === 0) b = randInt(-9, 9)
        return num(`Soit f(x) = {${cf(a)}x${tail(b)}/${cf(c)}x ${x0 * c > 0 ? '−' : '+'} ${Math.abs(x0 * c)}}. Donne l'abscisse a de l'asymptote verticale (x = a).`, x0,
          `Le dénominateur s'annule en x = ${fmt(x0)} (et pas le numérateur) : asymptote verticale x = ${fmt(x0)}.`)
      }),
      () => {
        const a = randNonZero(-6, 6), c = randInt(2, 5), x0 = randNonZero(-5, 5), b = randInt(-9, 9)
        return lim(`Soit f(x) = {${cf(a)}x${tail(b)}/${cf(c)}x ${x0 * c > 0 ? '−' : '+'} ${Math.abs(x0 * c)}}. Donne m tel que la droite y = m soit asymptote horizontale.`, [a, c],
          `En ±∞, f(x) a pour limite le quotient des coefficients de x : ${fr(a, c)} ; asymptote y = ${fracText(a, c)}.`)
      },
      fresh(() => {
        const c = randNonZero(-5, 5), k = randNonZero(-6, 6), d = randNonZero(-5, 5)
        return num(`Soit f(x) = ${fmt(c)} + {${fmt(k)}/${xm(d)}}. Donne m tel que y = m soit asymptote horizontale à la courbe.`, c,
          `{${fmt(k)}/${xm(d)}} → 0 en ±∞, donc f(x) → ${fmt(c)} : asymptote y = ${fmt(c)}.`)
      }),
      () => {
        const c = randNonZero(-3, 3), k = randNonZero(-6, 6), d = randNonZero(-5, 5)
        return lim(`Soit f(x) = ${fmt(c)} + {${fmt(k)}/${xm(d)}}. Quelle est la limite de f en ${fmt(d)} par valeurs supérieures ?`, sgnInf(k),
          `${xm(d)} → 0⁺ et ${fmt(k)} ${k > 0 ? '> 0' : '< 0'} : {${fmt(k)}/${xm(d)}} → ${infText(sgnInf(k))}, donc f aussi (asymptote verticale x = ${fmt(d)}).`)
      },
    ),
    // Nombre de solutions de f(x) = k (variations, courbe)
    variants(
      fresh(() => {
        const knots = randomKnots(2)
        const ys = knots.map((p) => p[1])
        let k = randInt(Math.min(...ys) - 1, Math.max(...ys) + 1)
        while (ys.includes(k)) k = randInt(Math.min(...ys) - 1, Math.max(...ys) + 1)
        return num(`f est continue sur [${fmt(knots[0][0])} ; ${fmt(knots[2][0])}], ${variationText(knots)}. Combien de solutions l'équation f(x) = ${fmt(k)} admet-elle sur cet intervalle ?`, countSol(knots, k),
          `Sur chaque intervalle où f est strictement monotone, il y a une solution si ${fmt(k)} est entre les valeurs extrêmes (corollaire du TVI). Total : ${countSol(knots, k)}.`)
      }),
      fresh(() => {
        const knots = randomKnots(3)
        const ys = knots.map((p) => p[1])
        let k = randInt(Math.min(...ys), Math.max(...ys))
        while (ys.includes(k)) k = randInt(Math.min(...ys) - 1, Math.max(...ys) + 1)
        return withMeta(num(`Voici la courbe d'une fonction f continue. Combien de solutions l'équation f(x) = ${fmt(k)} admet-elle ?`, countSol(knots, k),
          `On compte les points d'intersection de la courbe avec la droite y = ${fmt(k)} : un par morceau strictement monotone qui « franchit » ${fmt(k)}, soit ${countSol(knots, k)}.`),
        { figure: knotsFigure(knots, k) })
      }),
      fresh(() => {
        const knots = randomKnots(2)
        const ys = knots.map((p) => p[1])
        let k = randInt(Math.min(...ys), Math.max(...ys))
        while (ys.includes(k)) k = randInt(Math.min(...ys) - 1, Math.max(...ys) + 1)
        return withMeta(num(`La courbe ci-dessous représente une fonction f continue sur [${fmt(knots[0][0])} ; ${fmt(knots[2][0])}]. Combien de solutions l'équation f(x) = ${fmt(k)} admet-elle ?`, countSol(knots, k),
          `Sur chaque intervalle où f est strictement monotone, on regarde si ${fmt(k)} est atteint (TVI) : ${countSol(knots, k)} solution(s).`),
        { figure: knotsFigure(knots, k) })
      }),
      fresh(() => {
        const knots = randomKnots(3)
        const ys = knots.map((p) => p[1])
        let k = randInt(Math.min(...ys), Math.max(...ys))
        while (ys.includes(k)) k = randInt(Math.min(...ys) - 1, Math.max(...ys) + 1)
        return num(`g est continue sur [${fmt(knots[0][0])} ; ${fmt(knots[3][0])}], ${variationText(knots)}. Combien de solutions l'équation g(x) = ${fmt(k)} admet-elle ?`, countSol(knots, k),
          `On applique le corollaire du TVI sur chacun des trois intervalles de monotonie : ${countSol(knots, k)} solution(s).`)
      }),
    ),
    // Encadrement par balayage (avec un tableau de valeurs)
    variants(
      () => {
        const c = scanCase()
        const xs = [-2, -1, 0, 1, 2, 3].map((i) => r6(c.lo + i / 10))
        const tab = xs.map((x) => `f(${fmt(x)}) ≈ ${fmt(Math.round(c.f(x) * 100) / 100)}`).join(' ; ')
        const n = Math.round(c.lo * 10)
        return numeric(`f(x) = ${c.t} est continue et strictement croissante sur [1 ; 3], et l'équation f(x) = 0 y a une unique solution α. On donne : ${tab}. Donne l'entier n tel que {n/10} < α < {n + 1/10}.`, n,
          { explanation: `f(${fmt(c.lo)}) < 0 < f(${fmt(r6(c.lo + 0.1))}) : par le TVI, ${fmt(c.lo)} < α < ${fmt(r6(c.lo + 0.1))}, donc n = ${n}.` })
      },
      () => {
        const c = scanCase()
        const xs = [-2, -1, 0, 1, 2, 3].map((i) => r6(c.lo + i / 10))
        const tab = xs.map((x) => `${fmt(x)} → ${fmt(Math.round(c.f(x) * 100) / 100)}`).join(' ; ')
        const mid = r6(c.lo + 0.05)
        return {
          ...numeric(`On cherche la solution α de l'équation ${c.eq} sur [1 ; 3], en étudiant f(x) = ${c.t}, croissante. Un tableur donne les valeurs de f (x → f(x)) : ${tab}. Donne une valeur approchée de α à 0,05 près.`, mid,
            { explanation: `Le signe de f change entre ${fmt(c.lo)} et ${fmt(r6(c.lo + 0.1))} : ${fmt(c.lo)} < α < ${fmt(r6(c.lo + 0.1))}. Le milieu ${fmt(mid)} est à moins de 0,05 de α.` }),
          check: (v: string) => Math.abs(parseNumber(v) - c.alpha) <= 0.05 + 1e-9,
        }
      },
      () => {
        const c = scanCase()
        const halves = [1, 1.5, 2, 2.5, 3]
        const tab = halves.map((x) => `f(${fmt(x)}) ≈ ${fmt(Math.round(c.f(x) * 100) / 100)}`).join(' ; ')
        const lo = Math.floor(c.alpha * 2) / 2
        const opts = [1, 1.5, 2, 2.5].map((a) => `[${fmt(a)} ; ${fmt(a + 0.5)}]`)
        return choice(`f(x) = ${c.t} est continue et strictement croissante sur [1 ; 3], et f(α) = 0. On donne : ${tab}. Dans quel intervalle se trouve α ?`,
          `[${fmt(lo)} ; ${fmt(lo + 0.5)}]`, opts,
          `f change de signe entre ${fmt(lo)} et ${fmt(lo + 0.5)} : par le TVI (et la stricte croissance), α ∈ [${fmt(lo)} ; ${fmt(lo + 0.5)}].`)
      },
      () => {
        const c = scanCase()
        const xs = [0, 1].map((i) => r6(c.lo + i / 10))
        return choice(`f(x) = ${c.t} est continue et strictement croissante sur [1 ; 3], et f(α) = 0. On calcule f(${fmt(xs[0])}) ≈ ${fmt(Math.round(c.f(xs[0]) * 1000) / 1000)} et f(${fmt(xs[1])}) ≈ ${fmt(Math.round(c.f(xs[1]) * 1000) / 1000)}. Que peut-on en déduire ?`,
          `${fmt(xs[0])} < α < ${fmt(xs[1])}`, [`α < ${fmt(xs[0])}`, `α > ${fmt(xs[1])}`, `α = ${fmt(xs[0])}`],
          `f change de signe entre ${fmt(xs[0])} et ${fmt(xs[1])} ; f est continue et strictement croissante, donc ${fmt(xs[0])} < α < ${fmt(xs[1])}.`)
      },
    ),
    // Continuité d'une fonction définie par morceaux
    variants(
      fresh(() => {
        const a = randNonZero(-3, 3), b = randInt(-5, 5), m = randNonZero(-4, 4)
        const p = a * a + b - m * a
        return num(`f(x) = x²${tail(b)} si x ≤ ${fmt(a)}, et f(x) = ${cf(m)}x + p si x > ${fmt(a)}. Quelle valeur de p rend f continue en ${fmt(a)} ?`, p,
          `Il faut ${fmt(m)} × ${par(a)} + p = ${par(a)}²${tail(b)}, soit ${fmt(m * a)} + p = ${fmt(a * a + b)}, d'où p = ${fmt(p)}.`)
      }),
      fresh(() => {
        const a = randNonZero(-3, 3), b = randInt(-5, 5), m = randNonZero(-5, 5)
        const p = a * a + b - m * a
        return num(`f(x) = x²${tail(b)} si x ≤ ${fmt(a)}, et f(x) = mx${tail(p)} si x > ${fmt(a)}. Quelle valeur de m rend f continue en ${fmt(a)} ?`, m,
          `Il faut m × ${par(a)}${tail(p)} = ${fmt(a * a + b)}, soit ${fmt(a)}m = ${fmt(a * a + b - p)}, d'où m = ${fmt(m)}.`)
      }),
      fresh(() => {
        const k = randInt(2, 6), c = randInt(-5, 5)
        return num(`f(x) = ${fmt(k)}eˣ${tail(c)} si x < 0, et f(x) = x² + b si x ≥ 0. Quelle valeur de b rend f continue en 0 ?`, k + c,
          `En 0 à gauche, f tend vers ${fmt(k)}e⁰${tail(c)} = ${fmt(k + c)} ; à droite, f vaut b en 0. Donc b = ${fmt(k + c)}.`)
      }),
      fresh(() => {
        const a = randInt(2, 5), k = randInt(2, 4)
        return num(`f(x) = √{x + ${a * a - 1}} si x ≥ 1, et f(x) = ${fmt(k)}x + c si x < 1. Quelle valeur de c rend f continue en 1 ?`, a - k,
          `f(1) = √${a * a} = ${a} ; à gauche, f tend vers ${fmt(k)} + c. Il faut ${fmt(k)} + c = ${a}, donc c = ${fmt(a - k)}.`)
      }),
    ),
  ],
  // ── Palier 4 ──
  [
    // Croissances comparées
    variants(
      () => {
        const k = randInt(1, 4)
        return pick([
          () => lim(`Quelle est la limite de f(x) = x${k > 1 ? `^${fmt(k)}` : ''} e^{−x} en +∞ ?`, 0, `x${k > 1 ? `^${fmt(k)}` : ''} e^{−x} = {x${k > 1 ? `^${fmt(k)}` : ''}/eˣ} → 0 : l'exponentielle l'emporte (croissances comparées).`),
          () => lim(`Quelle est la limite de f(x) = {eˣ/x${k > 1 ? `^${fmt(k)}` : ''}} en +∞ ?`, Infinity, `Croissances comparées : eˣ l'emporte sur toute puissance de x, la limite est +∞.`),
          () => lim(`Quelle est la limite de f(x) = x${k > 1 ? `^${fmt(k)}` : ''} eˣ en −∞ ?`, 0, `Croissances comparées en −∞ : xⁿeˣ → 0.`),
        ])()
      },
      () => {
        const k = randInt(2, 5)
        return lim(`Quelle est la limite de f(x) = eˣ − x^${fmt(k)} en +∞ ?`, Infinity,
          `Forme « ∞ − ∞ » : f(x) = eˣ(1 − {x^${fmt(k)}/eˣ}) et {x^${fmt(k)}/eˣ} → 0 : la limite est +∞.`)
      },
      () => pick([
        () => lim(`Quelle est la limite de f(x) = {ln(x)/x} en +∞ ?`, 0, `Croissances comparées : x l'emporte sur ln(x).`),
        () => lim(`Quelle est la limite de f(x) = x ln(x) en 0⁺ ?`, 0, `Croissances comparées : x ln(x) → 0 quand x → 0⁺.`),
        () => lim(`Quelle est la limite de f(x) = x − ln(x) en +∞ ?`, Infinity, `f(x) = x(1 − {ln(x)/x}) et {ln(x)/x} → 0 : +∞.`),
        () => lim(`Quelle est la limite de f(x) = {x/ln(x)} en +∞ ?`, Infinity, `Inverse de {ln(x)/x}, qui tend vers 0 par valeurs positives : +∞.`),
      ])(),
      () => {
        const a = randInt(1, 5), b = randInt(1, 5)
        return lim(`Quelle est la limite de f(x) = {eˣ/${a === 1 ? '' : a}x² + ${b}} en +∞ ?`, Infinity,
          `f(x) = {eˣ/x²} × {x²/${cf(a)}x² + ${b}} : le premier facteur tend vers +∞ (croissances comparées), le second vers ${a === 1 ? '1' : `{1/${a}}`} > 0 : +∞.`)
      },
    ),
    // Formes indéterminées avec racines
    variants(
      () => {
        const a = randInt(1, 9)
        return lim(`Quelle est la limite de f(x) = √{x + ${a}} − √x en +∞ ?`, 0,
          `Quantité conjuguée : f(x) = {${a}/√(x + ${a}) + √x} → 0.`)
      },
      () => {
        const a = randNonZero(-8, 8)
        return lim(`Quelle est la limite de f(x) = √{x² ${a < 0 ? '−' : '+'} ${Math.abs(a) === 1 ? '' : Math.abs(a)}x} − x en +∞ ?`, [a, 2],
          `Quantité conjuguée : f(x) = {${cf(a)}x/√(x² ${a < 0 ? '−' : '+'} ${Math.abs(a) === 1 ? '' : Math.abs(a)}x) + x}, et en divisant par x : ${fmt(a)} ÷ (√(1 ${a < 0 ? '−' : '+'} ${Math.abs(a)}/x) + 1) → ${fr(a, 2)}.`)
      },
      () => {
        const k = randInt(1, 5)
        return lim(`Quelle est la limite de f(x) = {√x − ${fmt(k)}/x − ${k * k}} quand x tend vers ${k * k} ?`, [1, 2 * k],
          `x − ${k * k} = (√x − ${fmt(k)})(√x + ${fmt(k)}), donc f(x) = {1/√x + ${fmt(k)}} → {1/${2 * k}}.`)
      },
      () => {
        const a = randInt(1, 5)
        return lim(`Quelle est la limite de f(x) = {√{x + ${a * a}} − ${a}/x} quand x tend vers 0 ?`, [1, 2 * a],
          `Quantité conjuguée : f(x) = {1/√(x + ${a * a}) + ${a}} → {1/${2 * a}}.`)
      },
    ),
    // Fonctions composées
    variants(
      () => pick([
        () => lim(`Quelle est la limite de f(x) = e^{1/x} en +∞ ?`, 1, `{1/x} → 0 et e^X → e⁰ = 1 quand X → 0 : la limite est 1.`),
        () => lim(`Quelle est la limite de f(x) = e^{1/x} en 0⁺ ?`, Infinity, `{1/x} → +∞ en 0⁺, et e^X → +∞ quand X → +∞.`),
        () => lim(`Quelle est la limite de f(x) = e^{1/x} en 0⁻ ?`, 0, `{1/x} → −∞ en 0⁻, et e^X → 0 quand X → −∞.`),
      ])(),
      () => {
        const a = pick([1, 4, 9, 16, 25]), b = randInt(1, 9), c = randInt(1, 9)
        return lim(`Quelle est la limite de f(x) = √{${F2(`${cf(a)}x + ${b}`, `x + ${c}`)}} en +∞ ?`, Math.sqrt(a),
          `La fraction tend vers ${a} et la racine carrée est continue en ${a} : la limite est √${a} = ${Math.sqrt(a)}.`)
      },
      () => {
        const a = randInt(1, 4)
        return pick([
          () => lim(`Quelle est la limite de f(x) = e^{−${cf(a)}x²} en +∞ ?`, 0, `−${cf(a)}x² → −∞ et e^X → 0 quand X → −∞.`),
          () => lim(`Quelle est la limite de f(x) = ln(1 + {${a}/x}) en +∞ ?`, 0, `1 + {${a}/x} → 1 et ln est continue en 1 : ln(1) = 0.`),
          () => lim(`Quelle est la limite de f(x) = ln(x² + ${a}) en −∞ ?`, Infinity, `x² + ${a} → +∞ et ln(X) → +∞ quand X → +∞.`),
        ])()
      },
      fresh(() => {
        const a = randInt(2, 6), b = randInt(1, 9)
        return lim(`Quelle est la limite de f(x) = ({${a * 2}x + ${b}/2x + 1})² en +∞ ?`, a * a,
          `La fraction tend vers {${2 * a}/2} = ${a} et la fonction carré est continue : ${a}² = ${a * a}.`)
      }),
    ),
    // TVI sur ℝ avec une fonction monotone ou une cubique
    variants(
      fresh(() => {
        const a = randInt(1, 6), k = randInt(-20, 20)
        return num(`Combien de solutions l'équation x³ + ${cf(a)}x = ${fmt(k)} admet-elle dans ℝ ?`, 1,
          `f(x) = x³ + ${cf(a)}x est continue, strictement croissante (f′(x) = 3x² + ${a} > 0), de limites −∞ et +∞ : elle prend une seule fois la valeur ${fmt(k)}.`)
      }),
      fresh(() => {
        const k = pick([-5, -3, -2, -1, 0, 1, 2, 3, 5])
        const n = Math.abs(k) > 2 ? 1 : Math.abs(k) === 2 ? 2 : 3
        return num(`f(x) = x³ − 3x est continue sur ℝ, croissante sur ]−∞ ; −1], décroissante sur [−1 ; 1], croissante sur [1 ; +∞[, avec f(−1) = 2 et f(1) = −2. Combien de solutions l'équation f(x) = ${fmt(k)} admet-elle ?`, n,
          `On compte, sur chaque intervalle de monotonie, si ${fmt(k)} est atteint : ${Math.abs(k) > 2 ? 'seulement sur une branche' : Math.abs(k) === 2 ? 'une fois sur une branche extrême et une fois en un extremum' : 'une fois sur chacune des trois branches'} : ${n} solution(s).`)
      }),
      fresh(() => {
        const k = randInt(-6, 9)
        return num(`Combien de solutions l'équation eˣ + x = ${fmt(k)} admet-elle dans ℝ ?`, 1,
          `f(x) = eˣ + x est continue et strictement croissante (somme de fonctions croissantes), de limites −∞ et +∞ : une unique solution.`)
      }),
      fresh(() => {
        const k = pick([-4, -1, 1, 3, 6])
        const n = k < 0 ? 0 : 2
        return num(`Combien de solutions l'équation x⁴ + x² = ${fmt(k)} admet-elle dans ℝ ?`, n,
          `f(x) = x⁴ + x² est paire, vaut 0 en 0 et croît strictement de 0 à +∞ sur [0 ; +∞[. ${k < 0 ? `Comme ${fmt(k)} < 0, aucune solution.` : `${fmt(k)} > 0 est atteint une fois sur ]0 ; +∞[, et une fois en l'opposé : 2 solutions.`}`)
      }),
    ),
    // Théorèmes de comparaison
    variants(
      () => pick([
        () => lim(`Quelle est la limite de f(x) = x + sin(x) en +∞ ?`, Infinity, `f(x) ≥ x − 1, qui tend vers +∞ : par comparaison, +∞.`),
        () => lim(`Quelle est la limite de f(x) = x² + 2cos(x) en −∞ ?`, Infinity, `f(x) ≥ x² − 2 → +∞ : par comparaison, +∞.`),
        () => lim(`Quelle est la limite de f(x) = −x + cos(x) en +∞ ?`, -Infinity, `f(x) ≤ −x + 1 → −∞ : par comparaison, −∞.`),
      ])(),
      () => pick([
        () => lim(`Quelle est la limite de f(x) = {cos(x)/x} en +∞ ?`, 0, `−{1/x} ≤ f(x) ≤ {1/x} pour x > 0 : gendarmes, limite 0.`),
        () => lim(`Quelle est la limite de f(x) = {sin(x)/x²} en +∞ ?`, 0, `|f(x)| ≤ {1/x²} → 0 : gendarmes, limite 0.`),
        () => lim(`Quelle est la limite de f(x) = {2 + sin(x)/x} en +∞ ?`, 0, `1 ≤ 2 + sin(x) ≤ 3 donc {1/x} ≤ f(x) ≤ {3/x} pour x > 0 : gendarmes, 0.`),
      ])(),
      () => {
        const [a, c] = pick([[2, 3], [1, 2], [3, 2], [5, 3], [3, 4], [1, 3], [4, 3]] as const)
        return lim(`Quelle est la limite de f(x) = {${cf(a)}x + sin(x)/${c}x} en +∞ ?`, [a, c],
          `f(x) = {${a}/${c}} + {sin(x)/${c}x} et |{sin(x)/${c}x}| ≤ {1/${c}x} → 0 : la limite est {${a}/${c}}.`)
      },
      () => {
        const [a, c] = pick([[2, 3], [1, 2], [3, 2], [5, 3], [3, 4], [1, 3], [4, 3]] as const)
        return lim(`On sait que, pour tout x > 0, {${cf(a)}x − 1/${c}x} ≤ g(x) ≤ {${cf(a)}x + 1/${c}x}. Quelle est la limite de g en +∞ ?`, [a, c],
          `Les deux bornes tendent vers {${a}/${c}} : théorème des gendarmes.`)
      },
    ),
  ],
  // ── Palier 5 : exigeant ──
  [
    // Balayage sans tableau
    variants(
      () => {
        const c = scanCase()
        return numeric(`L'équation ${c.eq} admet une unique solution α dans [1 ; 3]. Donne la valeur approchée de α à 0,1 près par défaut (calcule quelques valeurs au brouillon).`, c.lo,
          { explanation: `Avec f(x) = ${c.t} : f(${fmt(c.lo)}) ≈ ${fmt(Math.round(c.f(c.lo) * 1000) / 1000)} < 0 et f(${fmt(r6(c.lo + 0.1))}) ≈ ${fmt(Math.round(c.f(c.lo + 0.1) * 1000) / 1000)} > 0, donc ${fmt(c.lo)} < α < ${fmt(r6(c.lo + 0.1))}.` })
      },
      () => {
        const c = scanCase()
        return numeric(`On note α l'unique solution dans [1 ; 3] de ${c.eq}. Donne l'entier n tel que n ≤ 10α < n + 1.`, Math.round(c.lo * 10),
          { explanation: `f(x) = ${c.t} change de signe entre ${fmt(c.lo)} et ${fmt(r6(c.lo + 0.1))}, donc ${fmt(c.lo)} < α < ${fmt(r6(c.lo + 0.1))} et 10α est entre ${Math.round(c.lo * 10)} et ${Math.round(c.lo * 10) + 1}.` })
      },
      () => {
        const c = scanCase()
        return numeric(`Un artisan cherche la dimension x (en m, entre 1 et 3) vérifiant ${c.eq}. Donne la valeur approchée par défaut au dixième de mètre près.`, c.lo,
          { explanation: `f(x) = ${c.t} est croissante sur [1 ; 3] ; f(${fmt(c.lo)}) < 0 < f(${fmt(r6(c.lo + 0.1))}) : la solution est entre ${fmt(c.lo)} et ${fmt(r6(c.lo + 0.1))} m.` })
      },
    ),
    // Nombre de solutions selon k
    variants(
      fresh(() => {
        const k = pick([-20, -16, -10, 0, 5, 16, 30])
        const n = Math.abs(k) > 16 ? 1 : Math.abs(k) === 16 ? 2 : 3
        return num(`Combien de solutions l'équation x³ − 12x = ${fmt(k)} admet-elle dans ℝ ?`, n,
          `f(x) = x³ − 12x : f′(x) = 3(x² − 4), f croît jusqu'à f(−2) = 16, décroît jusqu'à f(2) = −16, puis croît ; limites −∞ et +∞. ${fmt(k)} est atteint ${n} fois (corollaire du TVI sur chaque intervalle).`)
      }),
      fresh(() => {
        const k = pick([-5, -4, -2, 1, 3])
        const n = k < -4 || k > 0 ? 1 : k === -4 ? 2 : 3
        return num(`Combien de solutions l'équation x³ − 3x² = ${fmt(k)} admet-elle dans ℝ ?`, n,
          `f(x) = x³ − 3x² : f′(x) = 3x(x − 2) ; f croît jusqu'à la valeur 0 (en x = 0), décroît jusqu'à f(2) = −4, puis croît. ${fmt(k)} est atteint ${n} fois.`)
      }),
      fresh(() => {
        const k = pick([-0.5, -0.2, -0.1, 2, 5])
        const n = k < -1 / Math.E ? 0 : k < 0 ? 2 : 1
        return num(`Combien de solutions l'équation x eˣ = ${fmt(k)} admet-elle dans ℝ ? (On donne {1/e} ≈ 0,37.)`, n,
          `f(x) = x eˣ : f′(x) = (x + 1)eˣ, minimum f(−1) = −{1/e} ≈ −0,37 ; f tend vers 0 en −∞ (par valeurs négatives) et vers +∞ en +∞. ${k < -1 / Math.E ? 'La valeur est sous le minimum : aucune solution.' : k < 0 ? 'Entre −0,37 et 0 : une solution de chaque côté de −1.' : 'Valeur positive : atteinte une seule fois, sur ]0 ; +∞[.'}`)
      }),
      fresh(() => {
        const k = pick([-3, 0, 1, 2, 4])
        const n = k < 1 ? 0 : k === 1 ? 1 : 2
        return num(`Combien de solutions l'équation eˣ − x = ${fmt(k)} admet-elle dans ℝ ?`, n,
          `f(x) = eˣ − x : f′(x) = eˣ − 1, minimum 1 (atteint en x = 0), limites +∞ en ±∞. ${k < 1 ? 'Sous le minimum : aucune solution.' : k === 1 ? 'Égal au minimum : une seule solution, x = 0.' : 'Au-dessus du minimum : une solution de chaque côté de 0.'}`)
      }),
    ),
    // Paramètre et limite
    variants(
      fresh(() => {
        const c = randInt(1, 5), m = randNonZero(-5, 5), b = randInt(1, 9)
        return num(`Pour quelle valeur de a la limite de f(x) = {ax² + ${cf(b)}x/${c}x² + 1} en +∞ vaut-elle ${fmt(m)} ?`, m * c,
          `La limite vaut {a/${c}} ; {a/${c}} = ${fmt(m)} donne a = ${fmt(m * c)}.`)
      }),
      fresh(() => {
        const x0 = pick([-4, -3, -2, 1, 2, 3, 4]), k = randInt(2, 4) * pick([1, -1])
        return num(`Pour quelle valeur de a la courbe de f(x) = {x + 1/ax ${x0 * k > 0 ? '−' : '+'} ${Math.abs(x0 * k)}} a-t-elle une asymptote verticale d'équation x = ${fmt(x0)} ?`, k,
          `Il faut a × ${par(x0)} ${x0 * k > 0 ? '−' : '+'} ${Math.abs(x0 * k)} = 0, soit a = ${fmt(k)} (le numérateur, lui, vaut ${fmt(x0 + 1)} ≠ 0 en ${fmt(x0)}).`)
      }),
      fresh(() => {
        const m = randNonZero(-6, 6)
        return num(`Pour quelle valeur de a la limite de √{x² + ax} − x en +∞ vaut-elle ${fmt(m)} ?`, 2 * m,
          `Par la quantité conjuguée, la limite vaut {a/2}. {a/2} = ${fmt(m)} donne a = ${fmt(2 * m)}.`)
      }),
      fresh(() => {
        const m = randNonZero(-5, 5), c = randInt(2, 6)
        return num(`Pour quelle valeur de a la droite y = ${fmt(m)} est-elle asymptote horizontale à la courbe de f(x) = {ax − 1/${c}x + 5} ?`, m * c,
          `En ±∞, f(x) → {a/${c}}. Il faut {a/${c}} = ${fmt(m)}, soit a = ${fmt(m * c)}.`)
      }),
    ),
    // Formes indéterminées en un point
    variants(
      () => {
        const r = randInt(1, 4)
        let s = randNonZero(-4, 4)
        while (s === r || s === -r) s = randNonZero(-4, 4)
        const B = -(r + s), C = r * s
        return lim(`Quelle est la limite de f(x) = {x²${mono(B, 'x')}${tail(C)}/x² − ${r * r}} quand x tend vers ${r} ?`, [r - s, 2 * r],
          `Forme « 0/0 » : f(x) = {(x − ${r})(${xm(s)})/(x − ${r})(x + ${r})} = {${xm(s)}/x + ${r}} → {${fmt(r - s)}/${2 * r}} = ${fracText(r - s, 2 * r)}.`)
      },
      () => {
        const r = randInt(1, 3)
        return lim(`Quelle est la limite de f(x) = {x³ − ${r ** 3}/x − ${r}} quand x tend vers ${r} ?`, 3 * r * r,
          `C'est le taux d'accroissement de x ↦ x³ en ${r} : la limite est la dérivée 3 × ${r}² = ${3 * r * r}.`)
      },
      () => {
        const a = randNonZero(-5, 5), b = pick([2, 3, 4, 5, 6].filter((v) => a % v !== 0))
        return lim(`Quelle est la limite de f(x) = {e^{${cf(a)}x} − 1/${b}x} quand x tend vers 0 ?`, [a, b],
          `{e^{${cf(a)}x} − 1/x} est le taux d'accroissement de x ↦ e^{${cf(a)}x} en 0 : il tend vers la dérivée en 0, ${fmt(a)}. On divise par ${b} : ${fr(a, b)}.`)
      },
      () => pick([
        () => lim(`Quelle est la limite de f(x) = {√{1 + x} − 1/x} quand x tend vers 0 ?`, [1, 2], `Taux d'accroissement de √ en 1 : la dérivée vaut {1/2√1} = {1/2}.`),
        () => lim(`Quelle est la limite de f(x) = {ln(1 + x)/x} quand x tend vers 0 ?`, 1, `Taux d'accroissement de ln en 1 : ln′(1) = 1.`),
        () => {
          const n = pick([3, 5, 7, 9])
          return lim(`Quelle est la limite de f(x) = {x^${n} − 1/x² − 1} quand x tend vers 1 ?`, [n, 2], `f(x) = {x^${n} − 1/x − 1} × {1/x + 1} ; le premier facteur tend vers la dérivée de x^${n} en 1, soit ${n}, le second vers {1/2} : limite {${n}/2}.`)
        },
      ])(),
    ),
    // Prolongement par continuité
    variants(
      fresh(() => {
        const a = randNonZero(-6, 6)
        return num(`g(x) = {x² − ${a * a}/${xm(a)}} pour x ≠ ${fmt(a)}. Quelle valeur m faut-il donner à g(${fmt(a)}) pour que g soit continue en ${fmt(a)} ?`, 2 * a,
          `Pour x ≠ ${fmt(a)}, g(x) = ${xm(-a)}, qui tend vers ${fmt(2 * a)} : on pose g(${fmt(a)}) = ${fmt(2 * a)}.`)
      }),
      fresh(() => {
        const k = randInt(2, 6)
        return num(`g(x) = {${fmt(k)}(eˣ − 1)/x} pour x ≠ 0. Quelle valeur faut-il donner à g en 0 pour que g soit continue en 0 ?`, k,
          `{eˣ − 1/x} → 1 (dérivée de exp en 0), donc g(x) → ${fmt(k)} : on prolonge g en lui donnant la valeur ${fmt(k)} en 0.`)
      }),
      () => {
        const a = randInt(2, 5)
        return lim(`g(x) = {√{x + ${a * a}} − ${a}/x} pour x ≠ 0 (et x ≥ −${a * a}). Quelle valeur faut-il donner à g en 0 pour la rendre continue ?`, [1, 2 * a],
          `Quantité conjuguée : g(x) = {1/√(x + ${a * a}) + ${a}} → {1/${2 * a}}.`)
      },
      fresh(() => {
        const r = randInt(1, 3), n = pick([2, 3])
        const v = n * r ** (n - 1)
        return num(`g(x) = {x^${n} − ${r ** n}/x − ${r}} pour x ≠ ${r}. Quelle valeur faut-il donner à g(${r}) pour que g soit continue en ${r} ?`, v,
          `Taux d'accroissement de x ↦ x^${n} en ${r} : la limite est ${n} × ${r}${n - 1 > 1 ? `^${n - 1}` : ''} = ${v}.`)
      }),
    ),
  ],
]

/** Fraction « inline » dans une racine : (num)/(den). */
function F2(n: string, d: string) {
  return `(${n})/(${d})`
}

// ═══ Problèmes d'amélioration ═══════════════════════════════════════════
const upgrades: Ladder = [
  [
    () => {
      const a = randNonZero(-5, 5), d = randInt(1, 4), b = randInt(-9, 9)
      return T('Les deux murailles', num(`f(x) = {${cf(a)}x²${tail(b)}/x² − ${d * d}}. Combien la courbe de f a-t-elle d'asymptotes verticales ?`, a * d * d + b === 0 ? 0 : 2,
        a * d * d + b === 0 ? `Le numérateur s'annule aussi en ±${d} : pas d'asymptote verticale.` : `Le dénominateur s'annule en ${d} et en −${d}, pas le numérateur : deux asymptotes verticales, x = ${d} et x = −${d}.`))
    },
    () => {
      const a = randInt(2, 6), b = randInt(1, 6), s = pick([1, -1])
      return T('Le double horizon', lim(`f(x) = {${a}eˣ + ${b}/eˣ + 1}. Quelle est la limite de f en ${s > 0 ? '+∞' : '−∞'} ?`, s > 0 ? a : b,
        s > 0 ? `On divise numérateur et dénominateur par eˣ : f(x) = (${a} + ${b}e^{−x}) ÷ (1 + e^{−x}) → ${a}.` : `eˣ → 0 en −∞ : f(x) → ${b}.`))
    },
    () => {
      const m = randNonZero(-5, 5), c = randInt(2, 5), k = randInt(1, 9)
      return T('La droite imposée', num(`Pour quelle valeur de a la droite y = ${fmt(m)} est-elle asymptote à la courbe de f(x) = {ax + ${fmt(k)}/${c}x − 3} ?`, m * c,
        `f(x) → {a/${c}} en ±∞ ; il faut {a/${c}} = ${fmt(m)}, d'où a = ${fmt(m * c)}.`))
    },
    () => {
      const a = randInt(1, 6), b = randInt(1, 9)
      return T('Le plateau', lim(`Quelle est la limite en +∞ de f(x) = {${cf(a)}x + √x/x + ${b}} ?`, a,
        `On divise numérateur et dénominateur par x : f(x) = (${a} + 1/√x) ÷ (1 + ${b}/x), qui tend vers ${a}.`))
    },
  ],
  [
    () => {
      const [c, ext] = pick([[3, 2], [12, 16], [27, 54], [48, 128]] as const)
      const intro = `f(x) = x³ − ${c}x a un maximum local ${ext} (en x = −${Math.sqrt(c / 3)}) et un minimum local −${ext} (en x = ${Math.sqrt(c / 3)}), et tend vers −∞ en −∞ et +∞ en +∞.`
      if (Math.random() < 0.5) {
        return T('Les trois croisements', num(`Pour combien de valeurs entières de k l'équation x³ − ${c}x = k admet-elle exactement trois solutions réelles ?`, 2 * ext - 1,
          `${intro} Trois solutions ⇔ −${ext} < k < ${ext} : ${2 * ext - 1} entiers.`))
      }
      const N = ext + randInt(3, 30)
      return T('Les trois croisements', num(`Parmi les entiers k compris entre −${N} et ${N} (inclus), pour combien l'équation x³ − ${c}x = k admet-elle une seule solution réelle ?`, 2 * (N - ext),
        `${intro} Une seule solution ⇔ k > ${ext} ou k < −${ext} : de ${ext + 1} à ${N} il y a ${N - ext} entiers, autant du côté négatif, soit ${2 * (N - ext)}.`))
    },
    () => {
      const m = randNonZero(-6, 6)
      return T('La racine réglée', num(`Pour quelle valeur de a a-t-on lim (√{x² + ax + 1} − x) = ${fmt(m)} quand x tend vers +∞ ?`, 2 * m,
        `√(x² + ax + 1) − x = {ax + 1/√(x² + ax + 1) + x} → {a/2}. Donc a = ${fmt(2 * m)}.`))
    },
    () => {
      const k = randInt(2, 30)
      let n = 0
      while ((n + 1) ** 3 + (n + 1) <= k) n++
      return T('Le cube et son ombre', num(`L'équation x³ + x = ${fmt(k)} a une unique solution α. Quel est l'entier n tel que n ≤ α < n + 1 ?`, n,
        `f(x) = x³ + x est strictement croissante ; f(${n}) = ${n ** 3 + n} ≤ ${fmt(k)} < f(${n + 1}) = ${(n + 1) ** 3 + n + 1}, donc ${n} ≤ α < ${n + 1}.`))
    },
    () => {
      const a = randInt(1, 6), b = randInt(1, 4)
      return T('Le seuil de l’exponentielle', num(`Combien de solutions l'équation eˣ = ${cf(a)}x² + ${b} admet-elle sur ]−∞ ; 0[ ? (Indice : compare chaque membre à 1.)`, 0,
        `Sur ]−∞ ; 0[, eˣ < 1 ≤ ${b} ≤ ${cf(a)}x² + ${b} : l'égalité est impossible, 0 solution.`))
    },
  ],
  [
    () => {
      const k = pick([-2, -1, -0.5, 0.5, 1, 2, 2.5, 3, 4, 5])
      const n = k < 0 ? 1 : k < Math.E ? 0 : 2
      return T('La tangente à l’exponentielle', num(`Combien de solutions l'équation eˣ = ${cf(k)}x admet-elle dans ℝ ? (On donne e ≈ 2,72.)`, n,
        `${k < 0 ? `Ici k < 0 : g(x) = eˣ − (${fmt(k)})x est strictement croissante, de limites −∞ et +∞ : une seule solution (négative).` : `Pour x ≤ 0, eˣ > 0 ≥ ${cf(k)}x : pas de solution. Pour x > 0, l'équation équivaut à {eˣ/x} = ${fmt(k)} ; x ↦ {eˣ/x} décroît sur ]0 ; 1], croît sur [1 ; +∞[, de minimum e ≈ 2,72 et de limites +∞ aux bornes. ${k < Math.E ? `Comme ${fmt(k)} < e : aucune solution.` : `Comme ${fmt(k)} > e : deux solutions, une de chaque côté de 1.`}`}`))
    },
    () => {
      const a = randNonZero(-5, 5)
      let b = randNonZero(-5, 5)
      while (b === a) b = randNonZero(-5, 5)
      return T('Le duel des exponentielles', lim(`Quelle est la limite en 0 de f(x) = {e^{${cf(a)}x} − e^{${cf(b)}x}/x} ?`, a - b,
        `f(x) = {e^{${cf(a)}x} − 1/x} − {e^{${cf(b)}x} − 1/x} → ${fmt(a)} − ${par(b)} = ${fmt(a - b)} (taux d'accroissement en 0).`))
    },
    () => {
      const a = randInt(1, 9)
      return T('La loupe', lim(`Quelle est la limite en +∞ de f(x) = x(√(1 + ${a}/x) − 1) ?`, [a, 2],
        `En posant h = {1/x} (h → 0⁺), f = {√(1 + ${a}h) − 1/h}, taux d'accroissement de t ↦ √(1 + ${a}t) en 0 : la limite est sa dérivée en 0, {${a}/2}${a % 2 === 0 ? ` = ${a / 2}` : ''}.`))
    },
    () => {
      const p = randInt(2, 4), q = randInt(1, 3)
      return T('La course des puissances', lim(`Quelle est la limite en +∞ de f(x) = {${p}^x + x^${q}/${p}^x + 1} ?`, 1,
        `On divise numérateur et dénominateur par ${p}^x : f(x) = (1 + x^${q}/${p}^x) ÷ (1 + 1/${p}^x). Croissances comparées : x^${q}/${p}^x → 0, donc la limite est 1.`))
    },
  ],
]

// ═══ Problèmes de l'hôtel de ville ══════════════════════════════════════
const age: Ladder = [
  [
    () => {
      const a = pick([18, 20, 22, 25]), b = pick([60, 70, 75, 80]), k = pick([0.1, 0.2, 0.05])
      const g = graphFigure({ xMin: padX(60, 100), xMax: 60, yMin: 0, yMax: 100, step: 10, ystep: 10, ylabelStep: 20, labelStep: 10 })
      g.plot((t) => a + b * Math.exp(-k * t), { a: 0 })
      g.plot(() => a, { a: 0, dashed: true, color: BLUE })
      g.figure.axes!.names = ['t', '°C']
      g.figure.caption = 'Température du thé (en °C) en fonction du temps t (en min).'
      return T('Le thé de la guérisseuse', num(`La température du thé de la guérisseuse, t minutes après avoir été servi, est T(t) = ${a} + ${b}e^{−${fmt(k)}t} (en °C). Vers quelle température le thé tend-il quand on attend très longtemps ?`, a,
        `e^{−${fmt(k)}t} → 0 quand t → +∞, donc T(t) → ${a} °C : c'est la température de la pièce (asymptote horizontale).`), g.figure)
    },
    () => {
      const M = pick([500, 1000, 2000, 5000]), c = pick([4, 9, 19])
      const g = graphFigure({ xMin: padX(10, M * 1.2), xMax: 10, yMin: 0, yMax: M * 1.2, step: 1, labelStep: 2, ystep: M / 5, ylabelStep: M / 5 })
      g.plot((t) => M / (1 + c * Math.exp(-t)), { a: 0 })
      g.plot(() => M, { a: 0, dashed: true, color: BLUE })
      g.figure.axes!.names = ['t', 'N']
      g.figure.caption = 'Nombre de bactéries en fonction du temps (en heures).'
      return T('La culture de l’alchimiste', num(`Dans le laboratoire de l'alchimiste, le nombre de bactéries au bout de t heures est N(t) = {${M}/1 + ${c}e^{−t}}. Vers quelle valeur N(t) tend-il quand t tend vers +∞ ?`, M,
        `e^{−t} → 0, donc le dénominateur tend vers 1 et N(t) → ${M} : la population se stabilise.`), g.figure)
    },
    () => {
      const a = pick([2, 3, 4, 5]), F0 = pick([200, 300, 500, 800])
      return T('Le coût moyen du forgeron', lim(`Un forgeron fabrique x épées. Son coût total est C(x) = ${a}x + ${F0} (en écus). Le coût moyen par épée est {C(x)/x}. Vers quelle valeur le coût moyen tend-il quand x devient très grand ?`, a,
        `{C(x)/x} = ${a} + {${F0}/x} → ${a} : les frais fixes de ${F0} écus se répartissent sur un nombre d'épées de plus en plus grand.`))
    },
    () => {
      const v = pick([40, 50, 60]), k = pick([0.2, 0.25, 0.5])
      const g = graphFigure({ xMin: padX(20, v * 1.25), xMax: 20, yMin: 0, yMax: v * 1.25, step: 2, labelStep: 4, ystep: 10, ylabelStep: 20 })
      g.plot((t) => v * (1 - Math.exp(-k * t)), { a: 0 })
      g.plot(() => v, { a: 0, dashed: true, color: BLUE })
      g.figure.axes!.names = ['t', 'v']
      g.figure.caption = 'Vitesse (en m/s) en fonction du temps (en s).'
      return T('La chute du parachutiste', num(`La vitesse d'un parachutiste, t secondes après l'ouverture, est v(t) = ${v}(1 − e^{−${fmt(k)}t}) (en m/s). Quelle est sa vitesse limite ?`, v,
        `e^{−${fmt(k)}t} → 0, donc v(t) → ${v} m/s (asymptote horizontale y = ${v}).`), g.figure)
    },
  ],
  [
    () => {
      const knots = randomKnots(3)
      const ys = knots.map((p) => p[1])
      let k = randInt(Math.min(...ys), Math.max(...ys))
      while (ys.includes(k)) k = randInt(Math.min(...ys) - 1, Math.max(...ys) + 1)
      const fig = knotsFigure(knots, k)
      fig.caption = `Hauteur d'eau (en m, par rapport au repère) au cours du temps ; en pointillés, le niveau ${fmt(k)} m.`
      return T('Le niveau du fossé', num(`Le niveau d'eau du fossé du château varie de façon continue au cours de la journée (courbe ci-dessous, x en heures). Combien de fois le niveau est-il exactement égal à ${fmt(k)} m ?`, countSol(knots, k),
        `Sur chaque intervalle où le niveau est strictement monotone, le TVI (et la monotonie) donne au plus une fois le niveau ${fmt(k)} m, s'il est compris entre les valeurs extrêmes : ${countSol(knots, k)} fois.`), fig)
    },
    () => {
      const a = pick([1, 2]), h0 = randInt(1, 3)
      const b = randInt(4, 6) * a
      const top = h0 + (b * b) / (4 * a)
      const k = pick([h0 - 1, h0 + 1, Math.floor(top) + 1, randInt(h0 + 1, Math.floor(top) - 1)].filter((v) => v !== top && v >= 1))
      const n = k > top ? 0 : k < h0 ? 1 : 2
      const xe = (b + Math.sqrt(b * b + 4 * a * h0)) / (2 * a)
      const g = graphFigure({ xMin: padX(Math.ceil(xe) + 0.5, Math.ceil(top) + 2), xMax: Math.ceil(xe) + 0.5, yMin: 0, yMax: Math.ceil(top) + 2, step: 1, labelStep: 2, ystep: 1, ylabelStep: 2 })
      g.plot((x) => -a * x * x + b * x + h0, { a: 0, b: xe })
      g.plot(() => k, { a: 0, dashed: true, color: BLUE })
      g.figure.caption = `Trajectoire de la pierre (hauteur en m) ; en pointillés, la hauteur ${fmt(k)} m.`
      return T('La pierre de la catapulte', num(`Une catapulte lance une pierre depuis une hauteur de ${h0} m ; sa hauteur est h(x) = −${cf(a)}x² + ${b}x + ${h0}, jusqu'à ce qu'elle touche le sol. Combien de fois la pierre passe-t-elle à exactement ${fmt(k)} m de hauteur ?`, n,
        `h croît sur [0 ; ${fmt(b / (2 * a))}] de ${h0} à ${fmt(top)}, puis décroît jusqu'à 0. ${k > top ? `${fmt(k)} dépasse la hauteur maximale ${fmt(top)} : 0 fois.` : k < h0 ? `${fmt(k)} < ${h0} n'est atteint que dans la descente : 1 fois.` : `${fmt(k)} est atteint une fois à la montée et une fois à la descente : 2 fois.`}`), g.figure)
    },
    () => {
      const x0 = randInt(1, 4), c = randInt(2, 5), d = randInt(1, 3)
      const p = c * x0 * x0 + d - 2 * x0 * c
      return T('Le raccord du pont', num(`Un charpentier raccorde deux pièces de bois. L'arche est modélisée par f(x) = ${cf(c)}x² + ${d} pour 0 ≤ x ≤ ${x0}, et la rampe par f(x) = ${2 * c * x0}x + p pour x > ${x0}. Quelle valeur de p assure un raccord sans « marche » (f continue en ${x0}) ?`, p,
        `Il faut ${2 * c * x0} × ${x0} + p = ${c} × ${x0}² + ${d}, soit ${2 * c * x0 * x0} + p = ${c * x0 * x0 + d}, d'où p = ${fmt(p)}.`))
    },
    () => {
      const N0 = pick([100, 200, 300]), r = pick([2, 3, 4])
      return T('Le seuil du marché', lim(`Au marché, le prix d'une épice dépend de la quantité q (en kg) achetée : P(q) = {${N0 * r}q + ${N0}/q + ${r}} écus. Vers quel prix total P(q) tend-il pour de très grandes quantités ?`, N0 * r,
        `Termes dominants : {${N0 * r}q/q} = ${N0 * r} : P(q) tend vers ${N0 * r} écus (asymptote horizontale).`))
    },
  ],
  [
    () => {
      const c = scanCase()
      return T('La cuve du tonnelier', numeric(`Un tonnelier cherche la cote x (en m, entre 1 et 3) d'une cuve vérifiant ${c.eq}. Justifie qu'il existe une unique solution α, puis donne α au dixième près par défaut.`, c.lo,
        { explanation: `f(x) = ${c.t} est continue et strictement croissante sur [1 ; 3], f(1) < 0 < f(3) : unique solution (corollaire du TVI). Balayage : f(${fmt(c.lo)}) ≈ ${fmt(Math.round(c.f(c.lo) * 1000) / 1000)} < 0 et f(${fmt(r6(c.lo + 0.1))}) ≈ ${fmt(Math.round(c.f(c.lo + 0.1) * 1000) / 1000)} > 0, donc α ≈ ${fmt(c.lo)}.` }))
    },
    () => {
      const c = pick([1, 2, 3, 4]), k = pick([-1, 0, 1, 2, 3, 4, 5, 6, 7])
      const val = (x: number) => -(x ** 3) + 3 * x + c
      const n = k > c + 2 || k < c - 2 ? 0 : k === c + 2 || k === c - 2 ? 2 : 3
      const g = graphFigure({ xMin: -2.5, xMax: 2.5, yMin: Math.min(0, c - 3), yMax: c + 3, step: 1, ystep: 1, ylabelStep: 2 })
      g.plot(val, { a: -2, b: 2 })
      g.plot(() => k, { dashed: true, color: BLUE })
      g.figure.caption = `Profil de la colline (altitude en hm) ; en pointillés, l'altitude ${fmt(k)} hm.`
      return T('Les guetteurs de la colline', num(`Le profil d'une colline est modélisé sur [−2 ; 2] par h(x) = −x³ + 3x + ${c} (en hm). On veut placer un guetteur à chaque point du profil situé exactement à l'altitude ${fmt(k)} hm. Combien de guetteurs faut-il ?`, n,
        `h′(x) = −3x² + 3 : h décroît sur [−2 ; −1] de ${c + 2} à ${fmt(c - 2)}, croît sur [−1 ; 1] jusqu'à ${c + 2}, décroît sur [1 ; 2] jusqu'à ${fmt(c - 2)}. ${n === 0 ? `${fmt(k)} est hors de [${fmt(c - 2)} ; ${c + 2}] : aucun point.` : n === 2 ? `${fmt(k)} est une valeur extrême : atteinte aux deux points où elle est extrême (une fois en un extremum local et une fois en une borne).` : `${fmt(k)} est strictement entre ${fmt(c - 2)} et ${c + 2} : atteint une fois sur chacun des trois intervalles.`} ${n} guetteur(s).`), g.figure)
    },
    () => {
      const a = randInt(2, 6)
      const who = pick(['L’horloger du beffroi', 'L’ingénieur du moulin', 'Le maître des automates'])
      if (Math.random() < 0.5) {
        return T('L’horloge du beffroi', num(`${who} modélise un mécanisme par g(t) = {t² − ${a * a}/t − ${a}} pour t ≠ ${a}. Il doit régler g(${a}) pour que le mouvement soit continu. Quelle valeur doit-il choisir ?`, 2 * a,
          `Pour t ≠ ${a}, g(t) = t + ${a} → ${2 * a} quand t → ${a} : il faut g(${a}) = ${2 * a}.`))
      }
      return T('L’horloge du beffroi', num(`${who} modélise un mécanisme par g(t) = {t³ − ${a ** 3}/t − ${a}} pour t ≠ ${a}. Il doit régler g(${a}) pour que le mouvement soit continu. Quelle valeur doit-il choisir ?`, 3 * a * a,
        `t³ − ${a ** 3} = (t − ${a})(t² + ${a}t + ${a * a}), donc pour t ≠ ${a}, g(t) = t² + ${a}t + ${a * a} → ${3 * a * a} : il faut g(${a}) = ${3 * a * a}.`))
    },
    () => {
      const L = pick([10, 20, 30]), k = pick([1, 2, 3])
      const val = r6(L / 2)
      return T('Le pont-levis', lim(`La tension du câble d'un pont-levis, en fonction de l'angle d'ouverture x (en radians, x → 0), est modélisée par T(x) = {${L}(√(1 + ${cf(k)}x) − 1)/${cf(k)}x}. Vers quelle valeur T(x) tend-elle quand x tend vers 0 ?`, val,
        `En posant h = ${cf(k)}x : {√(1 + h) − 1/h} → {1/2} (taux d'accroissement de √ en 1). Donc T(x) → ${L} × {1/2} = ${fmt(val)}.`))
    },
  ],
]

export const CONTENT: SubjectContent | null = { tiers, upgrades, age }
