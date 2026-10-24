// Calcul intégral (Terminale, spécialité) — public adulte.
// Boîte à outils (valeurs exactes, repères, aires colorées) : voir T-derivee.ts.
import {
  fmt, fracText, fresh, gcd, numeric, par, pick, poly, randInt, randNonZero,
  type Exercise, type Ladder, type Maker, type Tiers,
} from '../utils'
import { type Figure } from '../figure'
import { prenom } from '../contexts'
import {
  BLUE, GOLD, GREEN, RED, T, coefP, exact, graph, hline, lin, limitAns, niceStep, oneOf, plotC, polishContent, retry,
  rounded, shade, vline, type Graph,
} from './T-derivee'

// ── Aides locales ────────────────────────────────────────────────────────
const r2 = (v: number) => Math.round(v * 100) / 100
const SUBD = '₀₁₂₃₄₅₆₇₈₉'
const sub = (n: number) => (n < 0 ? '₋' : '') + String(Math.abs(n)).split('').map((d) => SUBD[Number(d)]).join('')
/** Intégrale ∫ₐ^{b} body dx (borne basse entière en indice), sinon « ∫ de a à b de … ». */
const I_ = (a: number | string, b: number | string, body: string, v = 'x') =>
  typeof a === 'number' && Number.isInteger(a) ? `∫${sub(a)}^{${typeof b === 'number' ? fmt(b) : b}} ${body} d${v}` : `l'intégrale de ${a} à ${b} de ${body} d${v}`
/** Fraction réduite (texte simple) ; numeric() accepte aussi la forme décimale. */
const q = (n: number, d: number) => fracText(n, d)
/** Nombre rationnel n/d exact en réponse. */
const rat = (prompt: string, n: number, d: number, explanation: string) => numeric(prompt, n / d, { answer: q(n, d), explanation })
const withFig = (ex: Exercise, figure: Figure): Exercise => ({ ...ex, figure })
/** ln(n/d) avec la fraction réduite : ln 3, ln({5/2}). */
const lnq = (n: number, d: number) => {
  const g = gcd(n, d), a = n / g, b = d / g
  return b === 1 ? `ln ${a}` : `ln({${a}/${b}})`
}
/** Repère adapté à [x0 ; x1] × [y0 ; y1] avec des pas « ronds ». */
const win = (x0: number, x1: number, y0: number, y1: number): Graph => {
  const sx = niceStep(x1 - x0, 8), sy = niceStep(y1 - y0, 6)
  return graph({ xMin: x0, xMax: x1, yMin: y0, yMax: y1, step: sx, labelStep: sx * (x1 - x0 > 8 * sx ? 2 : 1), ystep: sy, ylabelStep: sy * (y1 - y0 > 6 * sy ? 2 : 1) })
}

// ═══════════════════════════════════════════════════════════════════════
// Entraînement
// ═══════════════════════════════════════════════════════════════════════

// ── Palier 1 ─────────────────────────────────────────────────────────────

// Intégrale d'une fonction affine positive : aire d'un rectangle, d'un trapèze, d'un triangle
const aireGeometrique: Maker = fresh(() => retry(() => {
  const kind = pick(['const', 'trap', 'tri'])
  const a = kind === 'tri' ? 0 : randInt(0, 3), b = a + randInt(2, 5)
  const m = kind === 'const' ? 0 : pick([0.5, 1, 2, -0.5]), p = kind === 'tri' ? 0 : randInt(1, 4)
  const f = (x: number) => m * x + p
  if (kind === 'tri' && m <= 0) return null
  if (f(a) < 0 || f(b) < 0 || (kind === 'trap' && (f(a) === 0 || f(b) === 0))) return null
  const area = ((f(a) + f(b)) / 2) * (b - a)
  if (Math.abs(area * 2 - Math.round(area * 2)) > 1e-9) return null
  const g = win(-1, b + 1, -1, Math.max(f(a), f(b)) + 1)
  shade(g, f, a, b)
  plotC(g, f)
  vline(g, a, 0, f(a)); vline(g, b, 0, f(b))
  const body = kind === 'const' ? fmt(p) : `(${lin(m, p)})`
  const shape = kind === 'const' ? 'un rectangle' : kind === 'tri' ? 'un triangle' : 'un trapèze'
  const expl = kind === 'const'
    ? `La fonction est constante et positive : l'intégrale est l'aire d'un rectangle de largeur ${b - a} et de hauteur ${p}, soit ${fmt(area)}.`
    : kind === 'tri'
      ? `La fonction est positive sur [0 ; ${b}] : l'intégrale est l'aire du triangle de base ${b} et de hauteur f(${b}) = ${fmt(f(b))}, soit {${b} × ${fmt(f(b))}/2} = ${fmt(area)}.`
      : `La fonction est positive : l'intégrale est l'aire d'un trapèze de bases f(${a}) = ${fmt(f(a))} et f(${b}) = ${fmt(f(b))} et de hauteur ${b - a} : {(${fmt(f(a))} + ${fmt(f(b))}) × ${b - a}/2} = ${fmt(area)}.`
  const ex = oneOf(
    () => numeric(`Calcule ${I_(a, b, body)} en l'interprétant comme une aire (domaine coloré).`, area, { explanation: expl }),
    () => numeric(`Le domaine coloré est limité par la droite d'équation y = ${lin(m, p)}, l'axe des abscisses et les droites x = ${a} et x = ${b}. C'est ${shape} : quelle est son aire, en unités d'aire ?`, area, { explanation: expl }),
    () => numeric(`Sans chercher de primitive, donne la valeur de ${I_(a, b, body)} (lis la figure).`, area, { explanation: expl }),
  )
  return withFig(ex, g.figure)
}))

// Calcul par primitive : polynômes
const calculPoly: Maker = fresh(() => oneOf(
  () => {
    const m = randNonZero(-4, 4), p = randInt(-5, 5), a = randInt(-2, 1), b = a + randInt(1, 4)
    const v2 = m * (b * b - a * a) + 2 * p * (b - a) // = 2 × valeur
    const Ft = `${m % 2 === 0 ? coefP(m / 2) : `${m < 0 ? '−' : ''}{${Math.abs(m)}/2}`}x²${p ? ` ${p < 0 ? '−' : '+'} ${coefP(Math.abs(p))}x` : ''}`
    return rat(`Calcule ${I_(a, b, `(${lin(m, p)})`)}.`, v2, 2, `Une primitive est F(x) = ${Ft}. I = F(${b}) − F(${a}) = ${q(v2, 2)}.`)
  },
  () => {
    const b = randInt(1, 4), k = randInt(1, 4)
    return rat(`Calcule ${I_(0, b, `${coefP(3 * k)}x²`)}.`, k * b ** 3, 1, `Une primitive de ${coefP(3 * k)}x² est ${coefP(k)}x³ : I = ${k} × ${b}³ − 0 = ${k * b ** 3}.`)
  },
  () => {
    const a = randInt(-2, 1), b = a + randInt(1, 3), c = randInt(-4, 4)
    const F = (x: number) => x ** 3 + c * x
    return rat(`Calcule ${I_(a, b, `(${poly([3, 'x²'], [c, ''])})`)}.`, F(b) - F(a), 1, `Une primitive est F(x) = ${poly([1, 'x³'], [c, 'x'])}. I = F(${b}) − F(${a}) = ${fmt(F(b))} − ${par(F(a))} = ${fmt(F(b) - F(a))}.`)
  },
  () => {
    const b = randInt(1, 3), a = 0, c2 = randNonZero(-3, 3), c1 = randInt(-4, 4)
    // ∫₀^b (c2 x² + c1 x) dx = c2 b³/3 + c1 b²/2
    const num = 2 * c2 * b ** 3 + 3 * c1 * b * b
    return rat(`Calcule ${I_(a, b, `(${poly([c2, 'x²'], [c1, 'x'])})`)}.`, num, 6, `Une primitive est F(x) = ${coefP(c2)}{x^3/3}${c1 ? ` ${c1 < 0 ? '−' : '+'} ${coefP(Math.abs(c1))}{x^2/2}` : ''}. I = F(${b}) − F(0) = ${q(num, 6)}.`)
  },
))

// Linéarité, relation de Chasles, ordre des bornes
const chasles: Maker = fresh(() => {
  const A = randInt(-6, 9), B = randInt(-6, 9), a = randInt(-2, 1), b = a + randInt(1, 3), c = b + randInt(1, 3)
  return oneOf(
    () => numeric(`On sait que ${I_(a, b, 'f(x)')} = ${fmt(A)} et ${I_(b, c, 'f(x)')} = ${fmt(B)}. Calcule ${I_(a, c, 'f(x)')}.`, A + B, {
      explanation: `Relation de Chasles : ${I_(a, c, 'f(x)')} = ${fmt(A)} + ${par(B)} = ${fmt(A + B)}.`,
    }),
    () => numeric(`On sait que ${I_(a, c, 'f(x)')} = ${fmt(A)} et ${I_(a, b, 'f(x)')} = ${fmt(B)}. Calcule ${I_(b, c, 'f(x)')}.`, A - B, {
      explanation: `Chasles : ${I_(a, c, 'f(x)')} = ${I_(a, b, 'f(x)')} + ${I_(b, c, 'f(x)')}, donc ${I_(b, c, 'f(x)')} = ${fmt(A)} − ${par(B)} = ${fmt(A - B)}.`,
    }),
    () => {
      const k1 = randNonZero(-4, 4), k2 = randNonZero(-4, 4)
      return numeric(`On sait que ${I_(a, b, 'f(x)')} = ${fmt(A)} et ${I_(a, b, 'g(x)')} = ${fmt(B)}. Calcule ${I_(a, b, `(${coefP(k1)}f(x) ${k2 < 0 ? '−' : '+'} ${coefP(Math.abs(k2))}g(x))`)}.`, k1 * A + k2 * B, {
        explanation: `Linéarité : ${fmt(k1)} × ${par(A)} + ${par(k2)} × ${par(B)} = ${fmt(k1 * A + k2 * B)}.`,
      })
    },
    () => numeric(`On sait que ${I_(a, b, 'f(x)')} = ${fmt(A)}. Que vaut l'intégrale de f de ${b} à ${a} (bornes inversées) ?`, -A, {
      explanation: `Échanger les bornes change le signe : l'intégrale de ${b} à ${a} vaut −(${fmt(A)}) = ${fmt(-A)}.`,
    }),
  )
})

// Intégrales de e^x et de 1/x
const expoLn: Maker = () => oneOf(
  () => {
    const k = randInt(1, 4)
    const ans = k === 1 ? 'e − 1' : `e^{${k}} − 1`
    return exact(`Calcule ${I_(0, k, 'eˣ')} (valeur exacte).`, Math.exp(k) - 1, ans, {
      explanation: `Une primitive de eˣ est eˣ : I = e^{${k}} − e^0 = ${ans} ≈ ${fmt(r2(Math.exp(k) - 1))}.`,
    })
  },
  () => {
    const a = randInt(2, 9)
    return exact(`Calcule ${I_(1, a, '{1/x}')} (valeur exacte).`, Math.log(a), `ln ${a}`, {
      explanation: `Une primitive de {1/x} sur ]0 ; +∞[ est ln x : I = ln ${a} − ln 1 = ln ${a}.`,
    })
  },
  () => {
    const k = randInt(2, 5)
    return numeric(`Calcule ${I_(1, `e^${k}`, '{1/x}')}.`, k, {
      explanation: `I = ln(e^${k}) − ln 1 = ${k}.`,
    })
  },
  () => {
    const k = randInt(2, 9), c = randInt(2, 5)
    return exact(`Calcule ${I_(0, `ln ${k}`, `${c}eˣ`)} (valeur exacte).`, c * (k - 1), String(c * (k - 1)), {
      explanation: `I = ${c}e^{ln ${k}} − ${c}e^0 = ${c} × ${k} − ${c} = ${c * (k - 1)}.`, approx: false,
    })
  },
)

// Valeur moyenne (fonctions simples)
const moyenneSimple: Maker = fresh(() => oneOf(
  () => {
    const m = randNonZero(-3, 3), p = randInt(-5, 5), a = randInt(-2, 2), b = a + 2 * randInt(1, 3)
    const v = m * (a + b) / 2 + p
    return numeric(`Quelle est la valeur moyenne de f(x) = ${lin(m, p)} sur [${a} ; ${b}] ?`, v, {
      explanation: `μ = {1/${b} − ${par(a)}} ${I_(a, b, `(${lin(m, p)})`)}. Pour une fonction affine, c'est la valeur au milieu : f(${fmt((a + b) / 2)}) = ${fmt(v)}.`,
    })
  },
  () => {
    const b = pick([3, 6, 9, 3]), k = randInt(1, 3)
    return rat(`Quelle est la valeur moyenne de f(x) = ${coefP(k)}x² sur [0 ; ${b}] ?`, k * b * b, 3, `μ = {1/${b}} ${I_(0, b, `${coefP(k)}x²`)} = {1/${b}} × {${k} × ${b}^3/3} = ${q(k * b * b, 3)}.`)
  },
  () => {
    const b = randInt(2, 4), k = randInt(1, 4)
    return rat(`Quelle est la valeur moyenne de f(x) = ${coefP(4 * k)}x³ sur [0 ; ${b}] ?`, k * b ** 3, 1, `μ = {1/${b}} × [${coefP(k)}x^4]₀^{${b}} = {${k} × ${b ** 4}/${b}} = ${k * b ** 3}.`)
  },
  () => {
    const b = randInt(2, 6), A = randInt(2, 30) * b
    return numeric(`On sait que ${I_(0, b, 'f(x)')} = ${A}. Quelle est la valeur moyenne de f sur [0 ; ${b}] ?`, A / b, {
      explanation: `μ = {1/${b} − 0} × ${A} = ${fmt(A / b)}.`,
    })
  },
))

// ── Palier 2 ─────────────────────────────────────────────────────────────

// Polynômes changeant de signe, parité
const polySigne: Maker = fresh(() => oneOf(
  () => {
    const c = randInt(1, 4), a = -randInt(1, 2), b = randInt(1, 3)
    // ∫ (x² − c) = [x³/3 − c x]
    const num = (b ** 3 - a ** 3) - 3 * c * (b - a)
    return rat(`Calcule ${I_(a, b, `(x² − ${c})`)}.`, num, 3, `F(x) = {x^3/3} − ${coefP(c)}x. I = F(${b}) − F(${a}) = ${q(num, 3)}. (Une partie de l'aire est sous l'axe et compte négativement.)`)
  },
  () => {
    const a = randInt(1, 4), c1 = randNonZero(-5, 5), c0 = randInt(-5, 5)
    return numeric(`Calcule ${I_(-a, a, `(${poly([1, 'x³'], [c1, 'x'], [c0, ''])})`)}.`, 2 * a * c0, {
      explanation: `x ↦ ${poly([1, 'x³'], [c1, 'x'])} est impaire : son intégrale sur [−${a} ; ${a}] est nulle. Il reste ${I_(-a, a, fmt(c0))} = ${fmt(c0)} × ${2 * a} = ${fmt(2 * a * c0)}.`,
    })
  },
  () => {
    const r = randInt(1, 3), a = 0, b = 2 * r
    // ∫₀^{2r} (x² − 2r x) dx = (8r³)/3 − 4r³ = −4r³/3
    return rat(`Calcule ${I_(a, b, `(x² − ${2 * r}x)`)}. Que traduit son signe ?`, -4 * r ** 3, 3, `F(x) = {x^3/3} − ${coefP(r)}x². I = {${8 * r ** 3}/3} − ${4 * r ** 3} = ${q(-4 * r ** 3, 3)} < 0 : la fonction est négative sur [0 ; ${b}], la courbe est sous l'axe.`)
  },
  () => {
    const a = randInt(1, 3), k = randInt(1, 3)
    return rat(`Calcule ${I_(-a, a, `${coefP(3 * k)}x²`)}.`, 2 * k * a ** 3, 1, `x ↦ x² est paire : I = 2${I_(0, a, `${coefP(3 * k)}x²`)} = 2 × ${k} × ${a}³ = ${2 * k * a ** 3}.`)
  },
))

// Aire sous une courbe (figure)
const aireCourbe: Maker = () => oneOf(
  () => {
    const a = randInt(1, 3)
    const g = win(-0.5, a + 0.8, -0.5, a * a + 1)
    shade(g, (x) => x * x, 0, a)
    plotC(g, (x) => x * x)
    vline(g, a, 0, a * a)
    return withFig(rat(`Calcule l'aire du domaine coloré, compris entre la parabole y = x², l'axe des abscisses et la droite x = ${a} (en unités d'aire).`, a ** 3, 3, `Aire = ${I_(0, a, 'x²')} = [{x^3/3}]₀^{${a}} = ${q(a ** 3, 3)} u.a.`), g.figure)
  },
  () => {
    const c = randInt(1, 3), k = c * c
    const g = win(-c - 1, c + 1, -0.5, k + 1)
    shade(g, (x) => k - x * x, -c, c)
    plotC(g, (x) => k - x * x)
    return withFig(rat(`Calcule l'aire du domaine coloré, compris entre la parabole y = ${k} − x² et l'axe des abscisses.`, 4 * c ** 3, 3, `La parabole coupe l'axe en −${c} et ${c}. Aire = ${I_(-c, c, `(${k} − x²)`)} = [${coefP(k)}x − {x^3/3}] de −${c} à ${c} = ${q(4 * c ** 3, 3)} u.a.`), g.figure)
  },
  () => {
    const a = randInt(1, 2), b = a * a
    const g = win(-0.5, b + 0.8, -0.5, a + 1)
    shade(g, (x) => Math.sqrt(Math.max(0, x)), 0, b)
    plotC(g, (x) => Math.sqrt(x), { a: 0 })
    vline(g, b, 0, a)
    return withFig(rat(`Calcule l'aire du domaine coloré, sous la courbe de y = √x, entre x = 0 et x = ${b}.`, 2 * a ** 3, 3, `Une primitive de √x = x^{1/2} est {2/3}x^{3/2}. Aire = {2/3} × ${b}^{3/2} = {2/3} × ${a ** 3} = ${q(2 * a ** 3, 3)} u.a.`), g.figure)
  },
  () => {
    const k = randInt(2, 5), L = Math.log(k)
    const g = win(-0.5, L + 0.6, -0.5, k + 1)
    shade(g, (x) => Math.exp(x), 0, L)
    plotC(g, (x) => Math.exp(x))
    vline(g, L, 0, k)
    return withFig(numeric(`Calcule l'aire du domaine coloré, sous la courbe de la fonction exponentielle, entre x = 0 et x = ln ${k}.`, k - 1, {
      explanation: `Aire = ${I_(0, `ln ${k}`, 'eˣ')} = e^{ln ${k}} − e^0 = ${k} − 1 = ${k - 1} u.a.`,
    }), g.figure)
  },
)

// Intégrale d'une fonction affine par morceaux : aires signées
const airesSignees: Maker = fresh(() => retry(() => {
  const xs = [-2, -1, 0, 1, 2, 3, 4]
  const ys = xs.map(() => randInt(-2, 3))
  const f = (x: number) => {
    const i = Math.min(xs.length - 2, Math.max(0, Math.floor(x - xs[0])))
    const t = x - xs[i]
    return ys[i] + (ys[i + 1] - ys[i]) * t
  }
  const a = randInt(-2, 1), b = a + randInt(3, 5)
  if (b > 4) return null
  let val = 0
  for (let x = a; x < b; x++) val += (f(x) + f(x + 1)) / 2
  if (!ys.slice(a + 2, b + 3).some((y) => y < 0) || !ys.slice(a + 2, b + 3).some((y) => y > 0)) return null
  const g = win(-2.5, 4.5, -2.5, 3.5)
  shade(g, (x) => Math.max(0, f(x)), a, b, { fill: GOLD, n: 120 })
  shade(g, (x) => Math.min(0, f(x)), a, b, { fill: BLUE, n: 120 })
  plotC(g, f, { a: -2, b: 4 })
  vline(g, a, -2.5, 3.5); vline(g, b, -2.5, 3.5)
  const ex = numeric(`La fonction f est représentée ci-dessous (segments entre points de coordonnées entières). Calcule ${I_(a, b, 'f(x)')} en ajoutant les aires au-dessus de l'axe (en jaune) et en retranchant celles au-dessous (en bleu).`, val, {
    explanation: `On découpe [${a} ; ${b}] en intervalles de longueur 1 : sur chacun, l'intégrale est l'aire signée d'un trapèze, {f(k) + f(k + 1)/2}. Total : ${fmt(val)}.`,
  })
  return withFig(ex, g.figure)
}))

// Intégrales de u′e^u, u′/u, e^{kx}, 1/(ax + b)
const composees: Maker = () => oneOf(
  () => {
    const k = randInt(2, 4)
    return exact(`Calcule ${I_(0, 1, `e^{${k}x}`)} (valeur exacte).`, (Math.exp(k) - 1) / k, `{e^${k} − 1/${k}}`, {
      explanation: `Une primitive de e^{${k}x} est {1/${k}}e^{${k}x} : I = {1/${k}}(e^${k} − 1) ≈ ${fmt(r2((Math.exp(k) - 1) / k))}.`,
    })
  },
  () => {
    const c = randInt(1, 4), b = randInt(1, 3)
    return exact(`Calcule ${I_(0, b, `{2x/x² + ${c}}`)} (valeur exacte).`, Math.log((b * b + c) / c), lnq(b * b + c, c), {
      explanation: `{u′/u} avec u(x) = x² + ${c} > 0 : I = [ln(x² + ${c})]₀^{${b}} = ln ${b * b + c} − ln ${c} = ${lnq(b * b + c, c)}.`,
    })
  },
  () => {
    const a = randInt(1, 2), ea = a === 1 ? 'e' : `e^${a * a}`
    return exact(`Calcule ${I_(0, a, 'xe^{x²}')} (valeur exacte).`, (Math.exp(a * a) - 1) / 2, `{${ea} − 1/2}`, {
      explanation: `xe^{x²} = {1/2} × 2xe^{x²}, de primitive {1/2}e^{x²} : I = {1/2}(${ea} − 1).`,
    })
  },
  () => {
    const a = randInt(2, 4), b = randInt(1, 3), lo = 0, hi = randInt(1, 3)
    const v = Math.log((a * hi + b) / b) / a
    return exact(`Calcule ${I_(lo, hi, `{1/${lin(a, b)}}`)} (valeur exacte).`, v, `{1/${a}}${lnq(a * hi + b, b)}`, {
      explanation: `Une primitive est {1/${a}}ln(${lin(a, b)}) : I = {1/${a}}(ln ${a * hi + b} − ln ${b}) ≈ ${fmt(r2(v))}.`,
    })
  },
)

// Valeur moyenne : exponentielle, inverse, trigonométrie
const moyenneTrans: Maker = () => oneOf(
  () => exact(`Quelle est la valeur moyenne de sin sur [0 ; π] ? (valeur exacte)`, 2 / Math.PI, '{2/π}', {
    explanation: `μ = {1/π}${I_(0, 'π', 'sin x')} = {1/π}[−cos x]₀^{π} = {1/π} × 2 = {2/π} ≈ 0,64.`,
  }),
  () => {
    const k = randInt(1, 3)
    return exact(`Quelle est la valeur moyenne de x ↦ eˣ sur [0 ; ${k}] ? (valeur exacte)`, (Math.exp(k) - 1) / k, k === 1 ? 'e − 1' : `{e^${k} − 1/${k}}`, {
      explanation: `${k === 1 ? `μ = ${I_(0, 1, 'eˣ')} = e − 1` : `μ = {1/${k}}${I_(0, k, 'eˣ')} = {1/${k}}(e^${k} − 1)`} ≈ ${fmt(r2((Math.exp(k) - 1) / k))}.`,
    })
  },
  () => {
    const k = randInt(1, 3)
    const en = k === 1 ? 'e' : k === 2 ? 'e²' : 'e³'
    return exact(`Quelle est la valeur moyenne de x ↦ {1/x} sur [1 ; ${en}] ? (valeur exacte)`, k / (Math.exp(k) - 1), `{${k}/${en} − 1}`, {
      explanation: `μ = {1/${en} − 1}${I_(1, en, '{1/x}')} = {${k}/${en} − 1} ≈ ${fmt(r2(k / (Math.exp(k) - 1)))}.`,
    })
  },
  () => {
    const c = randInt(1, 5)
    return exact(`Quelle est la valeur moyenne de x ↦ ${coefP(c)}cos x sur [0 ; π/2] ? (valeur exacte)`, (2 * c) / Math.PI, `{${2 * c}/π}`, {
      explanation: `μ = {2/π}${I_(0, 'π/2', `${coefP(c)}cos x`)} = {2/π} × ${c}[sin x]₀^{π/2} = {${2 * c}/π}.`,
    })
  },
)

// ── Palier 3 ─────────────────────────────────────────────────────────────

// Intégration par parties
const ipp: Maker = () => oneOf(
  () => {
    const a = randInt(1, 3)
    const ans = a === 1 ? '1' : `${coefP(a - 1)}e^{${a}} + 1`
    return exact(`Calcule ${I_(0, a, 'xeˣ')} à l'aide d'une intégration par parties.`, (a - 1) * Math.exp(a) + 1, ans, {
      explanation: `u = x, v′ = eˣ : I = [xeˣ]₀^{${a}} − ${I_(0, a, 'eˣ')} = ${a === 1 ? 'e' : `${a}e^{${a}}`} − (e^{${a}} − 1) = ${ans}.`,
    })
  },
  () => exact(`Calcule ${I_(1, 'e', 'ln x')} à l'aide d'une intégration par parties (u = ln x, v′ = 1).`, 1, '1', {
    explanation: `I = [x ln x]₁^{e} − ${I_(1, 'e', 'x × {1/x}')} = e − (e − 1) = 1.`,
  }),
  () => {
    const c = randInt(1, 4)
    return exact(`Calcule ${I_(0, 'π', `${coefP(c)}x sin x`)} par parties.`, c * Math.PI, `${coefP(c)}π`, {
      explanation: `u = x, v′ = sin x : ${I_(0, 'π', 'x sin x')} = [−x cos x]₀^{π} + ${I_(0, 'π', 'cos x')} = π + [sin x]₀^{π} = π. Donc I = ${coefP(c)}π.`,
    })
  },
  () => exact(`Calcule ${I_(0, 1, 'xe^{−x}')} par parties.`, 1 - 2 / Math.E, '1 − {2/e}', {
    explanation: `u = x, v′ = e^{−x} : I = [−xe^{−x}]₀^{1} + ${I_(0, 1, 'e^{−x}')} = −e^{−1} + (1 − e^{−1}) = 1 − {2/e}.`,
  }),
  () => exact(`Calcule ${I_(1, 'e', 'x ln x')} par parties.`, (Math.E ** 2 + 1) / 4, '{e² + 1/4}', {
    explanation: `u = ln x, v′ = x : I = [{x^2/2} ln x]₁^{e} − ${I_(1, 'e', '{x/2}')} = {e^2/2} − {e^2 − 1/4} = {e² + 1/4}.`,
  }),
)

// Aire entre deux courbes : parabole et droite
const aireEntre: Maker = () => oneOf(
  () => retry(() => {
    const r1 = randInt(-2, 1), r2_ = r1 + randInt(1, 3)
    // droite y = (r1 + r2)x − r1 r2 au-dessus de la parabole y = x² entre r1 et r2
    const m = r1 + r2_, p = -r1 * r2_
    const L = r2_ - r1
    const g = win(Math.min(-1, r1 - 1), r2_ + 1, Math.min(-1, m * (r1 - 1) + p), Math.max(r1 * r1, r2_ * r2_) + 1)
    shade(g, (x) => m * x + p, r1, r2_, { lower: (x) => x * x, fill: GREEN })
    plotC(g, (x) => x * x)
    plotC(g, (x) => m * x + p, { color: BLUE })
    return withFig(rat(`Calcule l'aire du domaine coloré, compris entre la parabole y = x² et la droite y = ${lin(m, p)}.`, L ** 3, 6, `Les courbes se coupent en x = ${r1} et x = ${r2_} (x² = ${lin(m, p)}). Sur cet intervalle la droite est au-dessus : Aire = ${I_(r1, r2_, `(${lin(m, p)} − x²)`)} = ${q(L ** 3, 6)} u.a.`), g.figure)
  }),
  () => {
    const c = randInt(1, 2), k = c * c
    const g = win(-c - 1, c + 1, -0.5, 2 * k + 1)
    shade(g, (x) => 2 * k - x * x, -c, c, { lower: (x) => x * x, fill: GREEN })
    plotC(g, (x) => x * x)
    plotC(g, (x) => 2 * k - x * x, { color: BLUE })
    return withFig(rat(`Calcule l'aire du domaine coloré, compris entre les paraboles y = x² et y = ${2 * k} − x².`, 8 * c ** 3, 3, `Elles se coupent en ±${c}. Aire = ${I_(-c, c, `(${2 * k} − 2x²)`)} = [${2 * k}x − {2x^3/3}] de −${c} à ${c} = ${q(8 * c ** 3, 3)} u.a.`), g.figure)
  },
  () => {
    const n = randInt(2, 4)
    const g = win(-0.3, 1.3, -0.3, 1.3)
    shade(g, (x) => x, 0, 1, { lower: (x) => x ** n, fill: GREEN })
    plotC(g, (x) => x ** n)
    plotC(g, (x) => x, { color: BLUE })
    return withFig(rat(`Calcule l'aire du domaine coloré, compris entre la droite y = x et la courbe y = x^${n} sur [0 ; 1].`, n - 1, 2 * (n + 1), `Sur [0 ; 1], x^${n} ≤ x. Aire = ${I_(0, 1, `(x − x^${n})`)} = {1/2} − {1/${n + 1}} = ${q(n - 1, 2 * (n + 1))} u.a.`), g.figure)
  },
)

// Encadrement par positivité
const encadrement: Maker = fresh(() => {
  const a = randInt(0, 3), b = a + randInt(1, 4), m = randInt(1, 4), M = m + randInt(1, 5)
  return oneOf(
    () => numeric(`Sur [${a} ; ${b}], on a ${m} ≤ f(x) ≤ ${M}. Quel est le plus petit majorant que l'on obtient ainsi pour ${I_(a, b, 'f(x)')} ?`, M * (b - a), {
      explanation: `Par positivité (croissance) de l'intégrale : ${I_(a, b, 'f(x)')} ≤ ${I_(a, b, String(M))} = ${M} × ${b - a} = ${M * (b - a)}.`,
    }),
    () => numeric(`Sur [${a} ; ${b}], on a ${m} ≤ f(x) ≤ ${M}. Quel minorant de ${I_(a, b, 'f(x)')} obtient-on en intégrant l'encadrement ?`, m * (b - a), {
      explanation: `${I_(a, b, 'f(x)')} ≥ ${I_(a, b, String(m))} = ${m} × ${b - a} = ${m * (b - a)}.`,
    }),
    () => numeric(`Sur [${a} ; ${b}], f(x) ≤ g(x) et ${I_(a, b, 'g(x)')} = ${M * 3}. On sait aussi que ${I_(a, b, '(g(x) − f(x))')} = ${m}. Calcule ${I_(a, b, 'f(x)')}.`, 3 * M - m, {
      explanation: `Par linéarité : ${I_(a, b, 'f(x)')} = ${M * 3} − ${m} = ${3 * M - m} (et c'est bien ≤ ${M * 3}, car g − f ≥ 0).`,
    }),
    () => {
      const n = randInt(2, 9)
      return numeric(`Pour x ∈ [0 ; 1], 0 ≤ x^${n}eˣ ≤ e x^${n}. On en déduit 0 ≤ ${I_(0, 1, `x^${n}eˣ`)} ≤ k × e. Quelle est la plus petite valeur de k obtenue ainsi ? (fraction)`, 1 / (n + 1), {
        answer: `1/${n + 1}`,
        explanation: `${I_(0, 1, `ex^${n}`)} = e × {1/${n + 1}}, donc k = {1/${n + 1}}.`,
      })
    },
  )
})

// Borne inconnue
const borneInconnue: Maker = () => oneOf(
  () => {
    const a = randInt(1, 6), k = a * a + a
    return numeric(`Pour quel réel a > 0 a-t-on ${I_(0, 'a', '(2x + 1)')} = ${k} ?`, a, {
      explanation: `${I_(0, 'a', '(2x + 1)')} = a² + a = ${k} ⇔ a² + a − ${k} = 0 ⇔ a = ${a} (l'autre racine, ${-a - 1}, est négative).`,
    })
  },
  () => {
    const a = randInt(1, 4), c = randInt(1, 3)
    return numeric(`Pour quel réel a > 0 a-t-on ${I_(0, 'a', `${coefP(3 * c)}x²`)} = ${c * a ** 3} ?`, a, {
      explanation: `${I_(0, 'a', `${coefP(3 * c)}x²`)} = ${coefP(c)}a³ = ${c * a ** 3} ⇔ a³ = ${a ** 3} ⇔ a = ${a}.`,
    })
  },
  () => {
    const k = randInt(2, 5)
    return exact(`Pour quel réel a > 1 a-t-on ${I_(1, 'a', '{1/x}')} = ${k} ? (valeur exacte)`, Math.exp(k), `e^{${k}}`, {
      explanation: `${I_(1, 'a', '{1/x}')} = ln a = ${k} ⇔ a = e^{${k}}.`,
    })
  },
  () => {
    const k = randInt(2, 9)
    return exact(`Pour quel réel a a-t-on ${I_(0, 'a', 'eˣ')} = ${k - 1} ? (valeur exacte)`, Math.log(k), `ln ${k}`, {
      explanation: `${I_(0, 'a', 'eˣ')} = eᵃ − 1 = ${k - 1} ⇔ eᵃ = ${k} ⇔ a = ln ${k}.`,
    })
  },
)

// Valeur moyenne en situation
const moyenneContexte: Maker = () => oneOf(
  () => {
    const h = randInt(10, 20), k = pick([0.05, 0.1])
    const v = h + k * 96
    return numeric(`La température (en °C) un jour d'été est T(t) = ${h} + ${fmt(k)}t(24 − t), t en heures de 0 à 24. Quelle est la température moyenne de la journée ?`, v, {
      explanation: `μ = {1/24}${I_(0, 24, `(${h} + ${fmt(24 * k)}t − ${fmt(k)}t²)`, 't')}. Or ${I_(0, 24, 't(24 − t)', 't')} = 12 × 24² − {24^3/3} = 2 304, donc μ = ${h} + ${fmt(k)} × {2304/24} = ${h} + ${fmt(k)} × 96 = ${fmt(v)} °C.`,
    })
  },
  () => {
    const a = randInt(1, 4), T_ = randInt(2, 6), v0 = randInt(1, 10)
    const v = v0 + (a * T_) / 2
    return numeric(`Un cavalier accélère : sa vitesse est v(t) = ${poly([a, 't'], [v0, ''])} (en m/s), pour t ∈ [0 ; ${T_}]. Quelle est sa vitesse moyenne sur cette durée ?`, v, {
      explanation: `μ = {1/${T_}}${I_(0, T_, `(${poly([a, 't'], [v0, ''])})`, 't')} = {1/${T_}}(${fmt((a * T_ * T_) / 2)} + ${v0 * T_}) = ${fmt(v)} m/s.`,
    })
  },
  () => {
    const P = randInt(2, 8) * 100, k = pick([2, 3, 4])
    // P(t) = P + c t² sur [0 ; k] ... moyenne de c t² = c k²/3
    const c = 3 * randInt(1, 5)
    const v = P + (c * k * k) / 3
    return numeric(`Le nombre de visiteurs par heure à la foire est N(t) = ${P} + ${c}t², t en heures de 0 à ${k}. Quel est le nombre moyen de visiteurs par heure sur cette période ?`, v, {
      explanation: `μ = {1/${k}}${I_(0, k, `(${P} + ${c}t²)`, 't')} = ${P} + {1/${k}} × ${c} × {${k}^3/3} = ${fmt(v)}.`,
    })
  },
)

// ── Palier 4 ─────────────────────────────────────────────────────────────

// Intégrations par parties plus riches
const ippFortes: Maker = () => oneOf(
  () => exact(`Calcule ${I_(0, 1, 'x²eˣ')} (deux intégrations par parties).`, Math.E - 2, 'e − 2', {
    explanation: `u = x², v′ = eˣ : I = [x²eˣ]₀^{1} − 2${I_(0, 1, 'xeˣ')} = e − 2 × 1 = e − 2 (car ${I_(0, 1, 'xeˣ')} = 1).`,
  }),
  () => {
    const b = randInt(-3, 4)
    const ans = b === 0 ? '1' : b === 1 ? 'e' : `${coefP(b)}e ${1 - b < 0 ? '−' : '+'} ${Math.abs(1 - b)}`.replace(/ [+−] 0$/, '')
    return exact(`Calcule ${I_(0, 1, `(${lin(1, b)})eˣ`)} par parties.`, b * Math.E - (b - 1), ans, {
      explanation: `u = ${lin(1, b)}, v′ = eˣ : I = [(${lin(1, b)})eˣ]₀^{1} − ${I_(0, 1, 'eˣ')} = ${fmt(1 + b)}e − ${par(b)} − (e − 1) = ${ans}.`,
    })
  },
  () => exact(`Calcule ${I_(1, 'e', '(ln x)²')} par parties.`, Math.E - 2, 'e − 2', {
    explanation: `u = (ln x)², v′ = 1 : I = [x(ln x)²]₁^{e} − 2${I_(1, 'e', 'ln x')} = e − 2 × 1 = e − 2.`,
  }),
  () => exact(`Calcule ${I_(1, 'e', 'x² ln x')} par parties.`, (2 * Math.E ** 3 + 1) / 9, '{2e³ + 1/9}', {
    explanation: `u = ln x, v′ = x² : I = [{x^3/3} ln x]₁^{e} − ${I_(1, 'e', '{x^2/3}')} = {e^3/3} − {e^3 − 1/9} = {2e³ + 1/9}.`,
  }),
  () => exact(`Calcule ${I_(0, 'π/2', 'x cos x')} par parties.`, Math.PI / 2 - 1, '{π/2} − 1', {
    explanation: `u = x, v′ = cos x : I = [x sin x]₀^{π/2} − ${I_(0, 'π/2', 'sin x')} = {π/2} − 1.`,
  }),
)

// Aires entre courbes (exponentielle, racine, puissances)
const aireEntre2: Maker = () => oneOf(
  () => {
    const g = win(-0.3, 1.4, -0.3, 1.4)
    shade(g, (x) => Math.sqrt(Math.max(0, x)), 0, 1, { lower: (x) => x * x, fill: GREEN })
    plotC(g, (x) => Math.sqrt(x), { a: 0, color: BLUE })
    plotC(g, (x) => x * x)
    return withFig(rat(`Calcule l'aire du domaine coloré, compris entre les courbes y = √x et y = x² (elles se coupent en 0 et 1).`, 1, 3, `Sur [0 ; 1], √x ≥ x². Aire = ${I_(0, 1, '(√x − x²)')} = {2/3} − {1/3} = {1/3} u.a.`), g.figure)
  },
  () => {
    const k = randInt(2, 4), L = Math.log(k)
    const g = win(-0.3, L + 0.5, -0.3, k + 0.8)
    shade(g, (x) => Math.exp(x), 0, L, { lower: (x) => Math.exp(-x), fill: GREEN })
    plotC(g, (x) => Math.exp(x), { color: BLUE })
    plotC(g, (x) => Math.exp(-x))
    vline(g, L, 0, k)
    const v = k + 1 / k - 2
    return withFig(exact(`Calcule l'aire du domaine coloré, compris entre y = eˣ, y = e^{−x} et la droite x = ln ${k}.`, v, `${q((k - 1) ** 2, k)}`.replace(/^(\d+)\/(\d+)$/, '{$1/$2}'), {
      explanation: `Sur [0 ; ln ${k}], eˣ ≥ e^{−x}. Aire = [eˣ + e^{−x}]₀^{ln ${k}} = ${k} + {1/${k}} − 2 = ${q((k - 1) ** 2, k)}.`, approx: true,
    }), g.figure)
  },
  () => {
    const g = win(-0.3, 1.4, -0.3, 3)
    shade(g, (x) => Math.exp(x), 0, 1, { lower: (x) => 1 + x, fill: GREEN })
    plotC(g, (x) => Math.exp(x))
    plotC(g, (x) => 1 + x, { color: BLUE })
    vline(g, 1, 0, Math.E)
    return withFig(exact(`La droite y = x + 1 est tangente en 0 à la courbe de l'exponentielle, qui reste au-dessus. Calcule l'aire du domaine coloré entre les deux, pour x ∈ [0 ; 1].`, Math.E - 2.5, 'e − {5/2}', {
      explanation: `Aire = ${I_(0, 1, '(eˣ − x − 1)')} = [eˣ − {x^2/2} − x]₀^{1} = e − {1/2} − 1 − 1 = e − {5/2} ≈ 0,22.`,
    }), g.figure)
  },
  () => {
    const n = randInt(2, 4), m = n + randInt(1, 3)
    return rat(`Calcule l'aire entre les courbes y = x^${n} et y = x^${m} sur [0 ; 1].`, m - n, (n + 1) * (m + 1), `Sur [0 ; 1], x^${m} ≤ x^${n}. Aire = {1/${n + 1}} − {1/${m + 1}} = ${q(m - n, (n + 1) * (m + 1))}.`)
  },
)

// Suites d'intégrales
const suitesIntegrales: Maker = () => oneOf(
  () => {
    const k = randInt(1, 3)
    const vals = [[1, 0], [-2, 1], [6, -2]] // I_k = a + b e : I_1 = 1, I_2 = e − 2, I_3 = 6 − 2e
    const [A, B] = vals[k - 1]
    const ans = k === 1 ? '1' : k === 2 ? 'e − 2' : '6 − 2e'
    return exact(`On pose Iₙ = ${I_(0, 1, 'xⁿeˣ')}. On admet que Iₙ₊₁ = e − (n + 1)Iₙ et I₀ = e − 1. Calcule I${sub(k)} (valeur exacte).`, A + B * Math.E, ans, {
      explanation: `I₁ = e − I₀ = e − (e − 1) = 1 ; I₂ = e − 2I₁ = e − 2 ; I₃ = e − 3I₂ = e − 3(e − 2) = 6 − 2e. Donc I${sub(k)} = ${ans}.`,
    })
  },
  () => {
    const k = randInt(1, 3)
    const ans = k === 1 ? '1 − ln 2' : k === 2 ? 'ln 2 − {1/2}' : '{5/6} − ln 2'
    const val = k === 1 ? 1 - Math.LN2 : k === 2 ? Math.LN2 - 0.5 : 5 / 6 - Math.LN2
    return exact(`On pose Jₙ = ${I_(0, 1, '{x^n/1 + x}')}. On a J₀ = ln 2 et Jₙ + Jₙ₊₁ = {1/n + 1}. Calcule J${sub(k)} (valeur exacte).`, val, ans, {
      explanation: `Jₙ + Jₙ₊₁ = ${I_(0, 1, 'xⁿ')} = {1/n + 1}. J₁ = 1 − ln 2 ; J₂ = {1/2} − J₁ = ln 2 − {1/2} ; J₃ = {1/3} − J₂ = {5/6} − ln 2.`,
    })
  },
  () => {
    const n = randInt(2, 9)
    return rat(`On pose Kₙ = ${I_(0, 1, 'xⁿ')}. Calcule K${sub(n)} + K${sub(n + 1)}.`, 2 * n + 3, (n + 1) * (n + 2), `Kₙ = {1/n + 1}, donc K${sub(n)} + K${sub(n + 1)} = {1/${n + 1}} + {1/${n + 2}} = ${q(2 * n + 3, (n + 1) * (n + 2))}.`)
  },
)

// Trigonométrie
const trigInt: Maker = () => oneOf(
  () => {
    const k = randInt(2, 6)
    return exact(`Calcule l'intégrale de 0 à π/${k} de sin(${k}x) dx.`, 2 / k, `{2/${k}}`, {
      explanation: `Une primitive est −{1/${k}}cos(${k}x) : I = −{1/${k}}(cos π − cos 0) = {2/${k}}.`,
    })
  },
  () => {
    const k = randInt(2, 6)
    return exact(`Calcule l'intégrale de 0 à π/${2 * k} de cos(${k}x) dx.`, 1 / k, `{1/${k}}`, {
      explanation: `Une primitive est {1/${k}}sin(${k}x) : I = {1/${k}}(sin {π/2} − sin 0) = {1/${k}}.`,
    })
  },
  () => {
    const a = randInt(1, 4), c = randInt(1, 5)
    return exact(`Calcule ${I_(-a, a, `(x³ cos x + ${c})`)}.`, 2 * a * c, String(2 * a * c), {
      explanation: `x ↦ x³ cos x est impaire (produit d'une fonction impaire et d'une paire) : son intégrale sur [−${a} ; ${a}] est nulle. Reste ${c} × ${2 * a} = ${2 * a * c}.`, approx: false,
    })
  },
  () => {
    const c = randInt(1, 4)
    return exact(`Calcule ${I_(0, 'π', `${coefP(c)}sin x`)}.`, 2 * c, String(2 * c), {
      explanation: `I = ${c}[−cos x]₀^{π} = ${c}(1 + 1) = ${2 * c}.`, approx: false,
    })
  },
)

// Aires sous des courbes usuelles
const airesUsuelles: Maker = fresh(() => oneOf(
  () => {
    const k = randInt(1, 2), c = randInt(1, 4)
    const ek = Math.exp(k), en = k === 1 ? 'e' : 'e²'
    const g = win(-0.3, ek + 0.6, -0.3, c + 1.2)
    shade(g, (x) => c / x, 1, ek)
    plotC(g, (x) => c / x, { a: 0.2 })
    vline(g, 1, 0, c); vline(g, ek, 0, c / ek)
    return withFig(numeric(`Calcule l'aire du domaine coloré, sous la courbe de y = {${c}/x}, entre x = 1 et x = ${en}.`, c * k, {
      explanation: `Aire = ${I_(1, en, `{${c}/x}`)} = ${c}(ln(${en}) − ln 1) = ${c} × ${k} = ${c * k} u.a.`,
    }), g.figure)
  },
  () => {
    const k = randInt(1, 2), c = randInt(1, 3)
    const ek = Math.exp(k), en = k === 1 ? 'e' : 'e²'
    const v = c * ((k - 1) * ek + 1)
    const ans = k === 1 ? String(c) : `${c === 1 ? '' : c}(e² + 1)`
    const g = win(-0.3, ek + 0.6, -0.6, c * k + 0.8)
    shade(g, (x) => c * Math.log(x), 1, ek)
    plotC(g, (x) => c * Math.log(x), { a: 0.4 })
    vline(g, ek, 0, c * k)
    return withFig(exact(`Calcule l'aire du domaine coloré, sous la courbe de y = ${coefP(c)}ln x, entre x = 1 et x = ${en}. (Une primitive de ln x est x ln x − x.)`, v, ans, {
      explanation: `Aire = ${c === 1 ? '' : `${c} × `}[x ln x − x]₁^{${en}} = ${c === 1 ? '' : `${c} × `}(${k === 1 ? '(e − e) + 1' : '(2e² − e²) + 1'}) = ${ans}${k === 2 ? ` ≈ ${fmt(r2(v))}` : ''} u.a.`, approx: true,
    }), g.figure)
  },
  () => {
    const c = randInt(1, 4)
    const g = win(-0.3, 3.5, -0.3, c + 0.8)
    shade(g, (x) => c * Math.sin(x), 0, Math.PI)
    plotC(g, (x) => c * Math.sin(x), { a: 0, b: Math.PI })
    return withFig(numeric(`Calcule l'aire de l'arche colorée, sous la courbe de y = ${coefP(c)}sin x entre 0 et π.`, 2 * c, {
      explanation: `Aire = ${I_(0, 'π', `${coefP(c)}sin x`)} = ${c}[−cos x]₀^{π} = ${2 * c} u.a.`,
    }), g.figure)
  },
))

// ── Palier 5 ─────────────────────────────────────────────────────────────

// Paramètre dans une borne (exponentielle, logarithme)
const parametreBorne: Maker = () => oneOf(
  () => {
    const k = randInt(2, 9)
    return exact(`Pour quel réel a > 0 a-t-on ${I_(0, 'a', 'e^{−x}')} = {${k - 1}/${k}} ? (valeur exacte)`, Math.log(k), `ln ${k}`, {
      explanation: `${I_(0, 'a', 'e^{−x}')} = 1 − e^{−a} = 1 − {1/${k}} ⇔ e^{−a} = {1/${k}} ⇔ a = ln ${k}.`,
    })
  },
  () => exact(`Pour quel réel a > 1 a-t-on ${I_(1, 'a', 'ln x')} = 1 ? (Une primitive de ln x est x ln x − x.)`, Math.E, 'e', {
    explanation: `${I_(1, 'a', 'ln x')} = a ln a − a + 1 = 1 ⇔ a(ln a − 1) = 0 ⇔ ln a = 1 (a > 1) ⇔ a = e.`,
  }),
  () => {
    const k = pick([2, 4, 8])
    return exact(`Pour quel réel a > 0 a-t-on ${I_(0, 'a', '2xe^{−x²}')} = 1 − {1/${k}} ? (valeur exacte)`, Math.sqrt(Math.log(k)), `√(ln ${k})`, {
      explanation: `Une primitive de 2xe^{−x²} est −e^{−x²} : I = 1 − e^{−a²} = 1 − {1/${k}} ⇔ a² = ln ${k} ⇔ a = √(ln ${k}).`,
    })
  },
  () => {
    const k = randInt(2, 6)
    return exact(`Pour quel réel a > 0 a-t-on ${I_(0, 'a', '{1/x + 1}')} = ln ${k} ?`, k - 1, String(k - 1), {
      explanation: `I = ln(a + 1) = ln ${k} ⇔ a = ${k - 1}.`, approx: false,
    })
  },
)

// Aire entre une courbe et sa tangente
const aireTangente: Maker = () => oneOf(
  () => {
    const a = randInt(1, 3), c = randInt(1, 3)
    const g = win(-0.5, a + 0.8, -c * a * a - 0.5, c * a * a + 1.5)
    shade(g, (x) => c * x * x, 0, a, { lower: (x) => 2 * c * a * x - c * a * a, fill: GREEN })
    plotC(g, (x) => c * x * x)
    plotC(g, (x) => 2 * c * a * x - c * a * a, { color: BLUE })
    return withFig(rat(`La tangente à la parabole y = ${coefP(c)}x² au point d'abscisse ${a} a pour équation y = ${lin(2 * c * a, -c * a * a)}. Calcule l'aire du domaine coloré, entre la parabole, la tangente et l'axe des ordonnées (x ∈ [0 ; ${a}]).`, c * a ** 3, 3, `Aire = ${I_(0, a, `${c === 1 ? '' : `${c}`}(x² − ${2 * a}x + ${a * a})`)} = ${c === 1 ? '' : `${c} × `}[{(x − ${a})^3/3}]₀^{${a}} = ${q(c * a ** 3, 3)} u.a.`), g.figure)
  },
  () => {
    const b = randInt(1, 2)
    const g = win(-0.3, b + 0.4, -0.3, Math.exp(b) + 0.5)
    shade(g, (x) => Math.exp(x), 0, b, { lower: (x) => 1 + x, fill: GREEN })
    plotC(g, (x) => Math.exp(x))
    plotC(g, (x) => 1 + x, { color: BLUE })
    const v = Math.exp(b) - 1 - b - (b * b) / 2
    const ans = b === 1 ? 'e − {5/2}' : 'e² − 5'
    return withFig(exact(`Calcule l'aire entre la courbe de l'exponentielle et sa tangente en 0, pour x ∈ [0 ; ${b}] (valeur exacte).`, v, ans, {
      explanation: `La tangente en 0 est y = x + 1 et la courbe est au-dessus (convexité). Aire = ${I_(0, b, '(eˣ − x − 1)')} = [eˣ − {x^2/2} − x]₀^{${b}} = ${ans} ≈ ${fmt(r2(v))}.`,
    }), g.figure)
  },
  () => {
    const g = win(-0.3, 3, -1.5, 2.2)
    shade(g, (x) => x - 1, 1, Math.E, { lower: (x) => Math.log(x), fill: GREEN })
    plotC(g, (x) => Math.log(x), { a: 0.3 })
    plotC(g, (x) => x - 1, { color: BLUE })
    vline(g, Math.E, 0, Math.E - 1)
    return withFig(exact(`La tangente en 1 à la courbe de ln est y = x − 1, et la courbe est au-dessous (concavité). Calcule l'aire entre les deux pour x ∈ [1 ; e] (valeur exacte). Rappel : ${I_(1, 'e', 'ln x')} = 1.`, (Math.E - 1) ** 2 / 2 - 1, '{(e − 1)²/2} − 1', {
      explanation: `Aire = ${I_(1, 'e', '(x − 1)')} − ${I_(1, 'e', 'ln x')} = {(e − 1)^2/2} − 1 ≈ ${fmt(r2((Math.E - 1) ** 2 / 2 - 1))}.`,
    }), g.figure)
  },
)

// Partage d'une aire en deux
const partageAire: Maker = () => oneOf(
  () => {
    const m = randInt(2, 5), b = m * m
    return numeric(`On considère l'aire sous y = {1/x} entre x = 1 et x = ${b}. Quelle droite verticale x = c (1 < c < ${b}) la partage en deux parties de même aire ?`, m, {
      explanation: `Il faut ln c = {1/2} ln ${b}, soit c = √${b} = ${m}.`,
    })
  },
  () => {
    const a = randInt(1, 4) * 2
    return exact(`On considère le triangle sous la droite y = x, entre x = 0 et x = ${a}. Pour quel c ∈ ]0 ; ${a}[ la droite x = c le partage-t-elle en deux parties de même aire ?`, a / Math.SQRT2, `${a / 2}√2`.replace(/^1√/, '√'), {
      explanation: `${I_(0, 'c', 'x')} = {c^2/2} doit valoir la moitié de {${a}^2/2}, soit {c^2/2} = ${(a * a) / 4} ⇔ c² = ${(a * a) / 2} ⇔ c = ${a / 2}√2.`.replace(/ 1√/, ' √'),
    })
  },
  () => {
    const k = randInt(1, 4)
    // aire sous e^x de 0 à ln(2k + 1) = 2k ; moitié k ⇒ e^c − 1 = k ⇒ c = ln(k + 1)
    return exact(`On considère l'aire sous y = eˣ entre x = 0 et x = ln ${2 * k + 1}. Pour quel c la droite x = c la partage-t-elle en deux parties de même aire ? (valeur exacte)`, Math.log(k + 1), `ln ${k + 1}`, {
      explanation: `Aire totale : ${2 * k + 1} − 1 = ${2 * k}. Il faut e^c − 1 = ${k}, soit c = ln ${k + 1}.`,
    })
  },
)

// Valeur absolue
const valeurAbsolue: Maker = fresh(() => oneOf(
  () => {
    const a = randInt(1, 4), b = randInt(1, 4)
    return rat(`Calcule ${I_(-a, b, '|x|')}.`, a * a + b * b, 2, `On coupe en 0 : ${I_(-a, 0, '(−x)')} + ${I_(0, b, 'x')} = {${a}^2/2} + {${b}^2/2} = ${q(a * a + b * b, 2)}.`)
  },
  () => {
    const c = randInt(1, 3), b = c + randInt(1, 3)
    return rat(`Calcule ${I_(0, b, `|x − ${c}|`)}.`, c * c + (b - c) ** 2, 2, `On coupe en ${c} : deux triangles d'aires {${c}^2/2} et {${b - c}^2/2}. Total : ${q(c * c + (b - c) ** 2, 2)}.`)
  },
  () => {
    const k = randInt(1, 3)
    return numeric(`Calcule l'intégrale de 0 à ${2 * k}π de |sin x| dx.`, 4 * k, {
      explanation: `Sur chaque intervalle de longueur π, l'intégrale de |sin x| vaut 2. Sur [0 ; ${2 * k}π] il y en a ${2 * k} : total ${4 * k}.`,
    })
  },
  () => {
    const g = randInt(1, 2)
    // ∫₀^{2g}|x² − g²| ? pour g = 1 : ∫₀² |x² − 1| = 2
    const v = g === 1 ? 2 : 16
    return numeric(`Calcule ${I_(0, 2 * g, `|x² − ${g * g}|`)}.`, v, {
      explanation: `On coupe en ${g} : ${I_(0, g, `(${g * g} − x²)`)} = ${q(2 * g ** 3, 3)} et ${I_(g, 2 * g, `(x² − ${g * g})`)} = ${q(4 * g ** 3, 3)}. Total : ${v}.`,
    })
  },
))

// Linéarisation trigonométrique
const linearisation: Maker = () => oneOf(
  () => exact(`Calcule ${I_(0, 'π', 'sin²x')}. (Rappel : sin²x = {1 − cos(2x)/2}.)`, Math.PI / 2, '{π/2}', {
    explanation: `I = ${I_(0, 'π', '{1/2}')} − {1/2}${I_(0, 'π', 'cos(2x)')} = {π/2} − 0 = {π/2}.`,
  }),
  () => {
    const c = randInt(1, 4)
    return exact(`Calcule ${I_(0, 'π', `${coefP(c)}cos²x`)}. (Rappel : cos²x = {1 + cos(2x)/2}.)`, (c * Math.PI) / 2, `{${c === 1 ? '' : c}π/2}`, {
      explanation: `I = ${c} × (${I_(0, 'π', '{1/2}')} + {1/2}${I_(0, 'π', 'cos(2x)')}) = ${c} × {π/2}.`,
    })
  },
  () => {
    const c = randInt(1, 4)
    return exact(`Calcule ${I_(0, 'π/2', `${coefP(2 * c)}sin x cos x`)}.`, c, String(c), {
      explanation: `u = sin x, u′ = cos x : une primitive de sin x cos x est {sin^2x/2}. I = ${2 * c} × {1/2} = ${c}.`, approx: false,
    })
  },
  () => exact(`Quelle est la valeur moyenne de sin² sur [0 ; 2π] ? (Utilise sin²x = {1 − cos(2x)/2}.)`, 0.5, '{1/2}', {
    explanation: `μ = {1/2π}${I_(0, '2π', 'sin²x')} = {1/2π} × π = {1/2}.`, approx: false,
  }),
)

const tiers: Tiers = [
  [aireGeometrique, calculPoly, chasles, expoLn, moyenneSimple],
  [polySigne, aireCourbe, airesSignees, composees, moyenneTrans],
  [ipp, aireEntre, encadrement, borneInconnue, moyenneContexte],
  [ippFortes, aireEntre2, suitesIntegrales, trigInt, airesUsuelles],
  [parametreBorne, aireTangente, partageAire, valeurAbsolue, linearisation],
]

// ═══════════════════════════════════════════════════════════════════════
// Problèmes d'amélioration
// ═══════════════════════════════════════════════════════════════════════

const upgrades: Ladder = [
  [
    // Somme d'intégrales de x^k
    () => {
      const n = randInt(1, 4)
      let num = 0, den = 1
      for (let k = 1; k <= n + 1; k++) { num = num * k + den; den = den * k; const g = gcd(num, den); num /= g; den /= g }
      const terms = Array.from({ length: n + 1 }, (_, k) => (k === 0 ? '1' : k === 1 ? 'x' : `x^${k}`)).join(' + ')
      const c = randInt(1, 4)
      return rat(`Calcule ${I_(0, 1, `${c === 1 ? '' : c}(${terms})`)}.`, c * num, den, `Par linéarité : ${c === 1 ? '' : `${c} × `}(1 + {1/2} + … + {1/${n + 1}}) = ${q(c * num, den)}.`)
    },
    // Fonction paire
    () => {
      const a = randInt(1, 5), A = randInt(2, 12), par_ = Math.random() < 0.5
      return numeric(`f est une fonction ${par_ ? 'paire' : 'impaire'} continue sur ℝ et ${I_(0, a, 'f(x)')} = ${A}. Que vaut ${I_(-a, a, 'f(x)')} ?`, par_ ? 2 * A : 0, {
        explanation: par_ ? `La courbe est symétrique par rapport à l'axe des ordonnées : les deux moitiés ont la même intégrale, ${2 * A} au total.` : `La courbe est symétrique par rapport à l'origine : l'intégrale sur [−${a} ; 0] vaut −${A}, le total est 0.`,
      })
    },
    // Périodicité
    () => {
      const A = randInt(1, 9), n = randInt(2, 6), T_ = pick([1, 2, 3])
      return numeric(`f est continue et périodique de période ${T_}, et ${I_(0, T_, 'f(x)')} = ${A}. Que vaut ${I_(0, n * T_, 'f(x)')} ?`, n * A, {
        explanation: `Par Chasles, [0 ; ${n * T_}] se découpe en ${n} périodes, chacune d'intégrale ${A} : total ${n * A}.`,
      })
    },
  ],
  [
    // Sommes de Riemann
    () => {
      const p = randInt(2, 4), c = randInt(1, 5)
      return limitAns(`Détermine la limite quand n → +∞ de Sₙ = {${c}/n} × [(1/n)^${p} + (2/n)^${p} + … + (n/n)^${p}]. (Reconnais une approximation d'une intégrale par des rectangles.)`, c / (p + 1), q(c, p + 1), {
        explanation: `Sₙ est ${c === 1 ? '' : `${c} fois `}une somme de rectangles de largeur {1/n} sous la courbe de x ↦ x^${p} sur [0 ; 1] : Sₙ → ${c === 1 ? '' : `${c} × `}${I_(0, 1, `x^${p}`)} = ${q(c, p + 1)}.`,
      })
    },
    // Moyenne et primitive
    () => {
      const k = randInt(1, 3), c = randInt(1, 4)
      const v = Math.log((k * k + c) / c) / k
      const ans = `${k === 1 ? '' : `{1/${k}}`}${lnq(k * k + c, c)}`
      return exact(`Quelle est la valeur moyenne de f(x) = {2x/x² + ${c}} sur [0 ; ${k}] ? (valeur exacte)`, v, ans, {
        explanation: `Une primitive est ln(x² + ${c}) : μ = {1/${k}}(ln ${k * k + c} − ln ${c}) = ${ans} ≈ ${fmt(r2(v))}.`,
      })
    },
    // Intégrale d'une fonction définie par morceaux
    () => {
      const c = randInt(1, 3), d = randInt(1, 4)
      // f(x) = x² sur [0 ; c], f(x) = c² sur [c ; c + d]
      return rat(`On définit f(x) = x² pour 0 ≤ x ≤ ${c} et f(x) = ${c * c} pour ${c} < x ≤ ${c + d}. Calcule ${I_(0, c + d, 'f(x)')}.`, c ** 3 + 3 * c * c * d, 3, `Chasles : ${I_(0, c, 'x²')} + ${I_(c, c + d, String(c * c))} = {${c ** 3}/3} + ${c * c} × ${d} = ${q(c ** 3 + 3 * c * c * d, 3)}.`)
    },
  ],
  [
    // Intégrales de Wallis
    () => {
      const n = randInt(2, 6), fn = pick(['sin', 'cos'])
      const vals: Record<number, [number, string]> = { 2: [Math.PI / 4, '{π/4}'], 3: [2 / 3, '{2/3}'], 4: [(3 * Math.PI) / 16, '{3π/16}'], 5: [8 / 15, '{8/15}'], 6: [(5 * Math.PI) / 32, '{5π/32}'] }
      return exact(`On pose Wₙ = ${I_(0, 'π/2', `${fn}ⁿx`)}. On admet que Wₙ₊₂ = {n + 1/n + 2} Wₙ, avec W₀ = {π/2} et W₁ = 1. Calcule W${sub(n)} (valeur exacte).`, vals[n][0], vals[n][1], {
        explanation: `W₂ = {1/2}W₀ = {π/4} ; W₃ = {2/3}W₁ = {2/3} ; W₄ = {3/4}W₂ = {3π/16} ; W₅ = {4/5}W₃ = {8/15} ; W₆ = {5/6}W₄ = {5π/32}.`,
      })
    },
    // Aire entre parabole et droite y = ax : trouver a
    () => {
      const a = randInt(2, 6), c = randInt(1, 2)
      const A = q(a ** 3, 6 * c * c)
      return numeric(`Pour a > 0, la parabole y = ${coefP(c)}x² et la droite y = ax délimitent un domaine. Pour quelle valeur de a son aire vaut-elle ${A} ?`, a, {
        explanation: `Intersections : x = 0 et x = ${c === 1 ? 'a' : `{a/${c}}`}. Aire = ${c === 1 ? I_(0, 'a', '(ax − x²)') : `l'intégrale de 0 à a/${c} de (ax − ${c}x²) dx`} = {a^3/${6 * c * c}} = ${A} ⇔ a³ = ${a ** 3} ⇔ a = ${a}.`,
      })
    },
    // Limite d'une suite d'intégrales
    () => {
      const [fx, M] = pick([['eˣ', 'e'], ['√(1 + x)', '√2'], ['e^{x²}', 'e'], ['ln(1 + x)', 'ln 2'], ['{1/1 + x}', '1'], ['(x + 2)', '3'], ['cos x', '1']])
      const pw_ = pick(['xⁿ', 'x²ⁿ'])
      return limitAns(`On pose uₙ = ${I_(0, 1, `${pw_}${fx.startsWith('{') ? ' × ' : ''}${fx}`)}. En encadrant la fonction intégrée sur [0 ; 1], détermine la limite de la suite (uₙ).`, 0, '0', {
        explanation: `Sur [0 ; 1], la fonction ${fx} est positive et majorée par ${M}, donc 0 ≤ uₙ ≤ ${M} × ${I_(0, 1, pw_)} = {${M}/${pw_ === 'xⁿ' ? 'n + 1' : '2n + 1'}} → 0. Par encadrement, uₙ → 0.`,
      })
    },
  ],
]

// ═══════════════════════════════════════════════════════════════════════
// Problèmes de l'hôtel de ville
// ═══════════════════════════════════════════════════════════════════════

const age: Ladder = [
  [
    // La distance du messager
    () => {
      const a = pick([0.5, 1, 2]), v0 = randInt(1, 5), T_ = randInt(4, 10)
      const d = v0 * T_ + (a * T_ * T_) / 2
      const g = win(-0.5, T_ + 1, -0.5, v0 + a * T_ + 1)
      shade(g, (t) => v0 + a * t, 0, T_)
      plotC(g, (t) => v0 + a * t, { a: 0, b: T_ })
      vline(g, T_, 0, v0 + a * T_)
      return T('La course du messager', numeric(`${prenom()} galope pour porter un message : sa vitesse (en m/s) est v(t) = ${poly([a, 't'], [v0, ''])}, pour t de 0 à ${T_} s. La distance parcourue est l'aire sous la courbe de la vitesse : ${I_(0, T_, 'v(t)', 't')}. Combien de mètres a-t-il parcourus ?`, d, {
        explanation: `C'est l'aire d'un trapèze de bases ${v0} et ${fmt(v0 + a * T_)} et de hauteur ${T_} : {(${v0} + ${fmt(v0 + a * T_)}) × ${T_}/2} = ${fmt(d)} m.`,
      }), g.figure)
    },
    // Le champ sous la colline
    () => {
      const L = pick([2, 3, 4, 5]), h = pick([1, 2, 3, 4])
      // arche y = h(1 − x²/L²) sur [−L ; L] : aire 4hL/3
      const g = win(-L - 1, L + 1, -0.5, h + 1)
      shade(g, (x) => h * (1 - (x * x) / (L * L)), -L, L, { fill: GREEN })
      plotC(g, (x) => h * (1 - (x * x) / (L * L)), { a: -L, b: L })
      return T('Le pré sous l’arche', rat(`L'arche d'un vieux pont a pour profil y = ${h}(1 − {x^2/${L * L}}) (en dizaines de mètres), pour x entre −${L} et ${L}. Quelle est l'aire de l'ouverture sous l'arche (domaine coloré), en centaines de m² ?`, 4 * h * L, 3, `Aire = ${I_(-L, L, `${h}(1 − {x^2/${L * L}})`)} = ${h}[x − {x^3/${3 * L * L}}] de −${L} à ${L} = ${h} × (2 × ${L} − {2 × ${L ** 3}/${3 * L * L}}) = ${q(4 * h * L, 3)}.`), g.figure)
    },
    // Le coût total à partir du coût marginal
    () => {
      const a = randInt(1, 4), b = randInt(5, 20), Q = randInt(5, 15)
      const C = a * Q * Q + b * Q
      return T('Le coût des tonneaux', numeric(`Le tonnelier estime que fabriquer le q-ième tonneau coûte environ C′(q) = ${2 * a}q + ${b} écus (coût marginal). Le coût total de fabrication des ${Q} premiers tonneaux (hors frais fixes) est ${I_(0, Q, `C′(q)`, 'q')}. Calcule-le.`, C, {
        explanation: `Une primitive de ${2 * a}q + ${b} est ${coefP(a)}q² + ${b}q : ${a} × ${Q * Q} + ${b} × ${Q} = ${C} écus.`,
      }))
    },
  ],
  [
    // Le réservoir
    () => {
      const d0 = pick([20, 30, 40, 50]), k = pick([0.1, 0.2, 0.5]), T_ = pick([5, 10])
      const V = (d0 / k) * (1 - Math.exp(-k * T_))
      const g = win(-0.5, T_ + 2, -1, d0 + 5)
      shade(g, (t) => d0 * Math.exp(-k * t), 0, T_, { fill: BLUE })
      plotC(g, (t) => d0 * Math.exp(-k * t), { a: 0 })
      vline(g, T_, 0, d0 * Math.exp(-k * T_))
      return T('Le réservoir du moulin', rounded(`Après l'orage, un ruisseau remplit le réservoir du moulin avec un débit d(t) = ${d0}e^{−${fmt(k)}t} (en m³/h). Le volume reçu pendant les ${T_} premières heures est ${I_(0, T_, 'd(t)', 't')}. Calcule-le, arrondi au centième.`, V, 2, {
        explanation: `Une primitive de ${d0}e^{−${fmt(k)}t} est −${fmt(d0 / k)}e^{−${fmt(k)}t} : V = ${fmt(d0 / k)}(1 − e^{−${fmt(k * T_)}}) ≈ ${fmt(r2(V))} m³.`,
      }), g.figure)
    },
    // Le vitrail entre deux courbes
    () => retry(() => {
      const r = randInt(1, 3), s = randInt(1, 3)
      // parabole y = x² et droite y = (s − r) x + r s entre −r et s
      const m = s - r, p = r * s, L = r + s
      const g = win(-r - 1, s + 1, -0.5, Math.max(r * r, s * s) + 1)
      shade(g, (x) => m * x + p, -r, s, { lower: (x) => x * x, fill: GOLD })
      plotC(g, (x) => x * x)
      plotC(g, (x) => m * x + p, { color: BLUE })
      return T('Le vitrail de la chapelle', rat(`Un vitrail (domaine coloré, en dm) est délimité par la parabole y = x² et la droite y = ${lin(m, p)}. Quelle est son aire, en dm² ?`, L ** 3, 6, `Intersections : x² = ${lin(m, p)} ⇔ x = −${r} ou x = ${s}. Aire = ${I_(-r, s, `(${lin(m, p)} − x²)`)} = ${q(L ** 3, 6)} dm².`), g.figure)
    }),
    // Le chiffre d'affaires de la foire
    () => {
      const a = pick([100, 200, 300]), T_ = pick([2, 4, 6])
      // r(t) = a t e^{−t/2} ; ∫₀^T = a[−2te^{−t/2} − 4e^{−t/2}]₀^T = a(4 − (2T + 4)e^{−T/2})
      const R = a * (4 - (2 * T_ + 4) * Math.exp(-T_ / 2))
      const g = win(-0.5, 10, -10, (2 * a) / Math.E * 1.2)
      shade(g, (t) => a * t * Math.exp(-t / 2), 0, T_)
      plotC(g, (t) => a * t * Math.exp(-t / 2), { a: 0 })
      return T('Les recettes de la foire', rounded(`Pendant la foire, les recettes arrivent au rythme r(t) = ${a}te^{−t/2} écus par jour (t en jours). Calcule les recettes des ${T_} premiers jours, ${I_(0, T_, 'r(t)', 't')}, à l'aide d'une intégration par parties. Arrondis à l'unité.`, R, 0, {
        explanation: `u = t, v′ = e^{−t/2} : ${I_(0, T_, 'te^{−t/2}', 't')} = [−2te^{−t/2}]₀^{${T_}} + 2${I_(0, T_, 'e^{−t/2}', 't')} = 4 − ${2 * T_ + 4}e^{−${T_ / 2}}. Recettes : ${a}(4 − ${2 * T_ + 4}e^{−${T_ / 2}}) ≈ ${Math.round(R)} écus.`, tol: 1,
      }), g.figure)
    },
  ],
  [
    // La parcelle entre la rivière et le chemin
    () => {
      const k = randInt(2, 4)
      const eau = pick(['la rivière', 'le canal', 'le ruisseau'])
      // rivière y = √x ... chemin y = x/k ; intersections 0 et k²
      const g = win(-0.5, k * k + 1, -0.5, k + 1)
      shade(g, (x) => Math.sqrt(Math.max(0, x)), 0, k * k, { lower: (x) => x / k, fill: GREEN })
      plotC(g, (x) => Math.sqrt(x), { a: 0, color: BLUE })
      plotC(g, (x) => x / k, { color: '#7a5a2c' })
      return T('La parcelle au bord de l’eau', rat(`Une parcelle (en vert, unités : hectomètres) est comprise entre ${eau}, de tracé y = √x, et un chemin droit d'équation y = {x/${k}}. Les deux se coupent en x = 0 et x = ${k * k}. Quelle est l'aire de la parcelle, en hm² ?`, k ** 3, 6, `Sur [0 ; ${k * k}], √x ≥ {x/${k}}. Aire = ${I_(0, k * k, `(√x − {x/${k}})`)} = {2/3} × ${k ** 3} − {${k ** 4}/${2 * k}} = ${q(k ** 3, 6)} hm².`), g.figure)
    },
    // La consommation du château
    () => {
      const a = randInt(3, 8) * 10, b = randInt(1, 3) * 10
      const t1 = pick([6, 8]), t2 = 24 - t1
      // P(t) = a + b cos(π(t − 12)/12) : moyenne sur [t1 ; t2]
      const mean = a + (b * 12) / (Math.PI * (t2 - t1)) * (Math.sin((Math.PI * (t2 - 12)) / 12) - Math.sin((Math.PI * (t1 - 12)) / 12))
      const g = win(-0.5, 24.5, -2, a + b + 10)
      plotC(g, (t) => a + b * Math.cos((Math.PI * (t - 12)) / 12), { a: 0, b: 24 })
      shade(g, (t) => a + b * Math.cos((Math.PI * (t - 12)) / 12), t1, t2)
      hline(g, mean, t1, t2, { color: RED })
      return T('Le bois de chauffe du château', rounded(`La consommation de bois de chauffe du château (en kg/h) est P(t) = ${a} + ${b}cos({π(t − 12)/12}), t en heures de 0 à 24. Quelle est la consommation horaire moyenne entre ${t1} h et ${t2} h ? Arrondis au centième.`, mean, 2, {
        explanation: `μ = {1/${t2 - t1}}${I_(t1, t2, 'P(t)', 't')}. Une primitive est ${a}t + {${12 * b}/π}sin({π(t − 12)/12}). μ = ${a} + {${12 * b}/${t2 - t1}π} × 2sin({${t2 - 12}π/12}) ≈ ${fmt(r2(mean))} kg/h.`,
      }), g.figure)
    },
    // Le profil du tonneau
    () => {
      const [L, b] = pick([[4, 1], [4, 2], [6, 1], [6, 3]] as [number, number][]), Rr = pick([3, 4, 5])
      const m = (L * L) / (4 * b)
      const h = (x: number) => Rr - (x * x) / m
      const A3 = 2 * (3 * Rr * L - b * L) // = 3 × aire
      const g = win(-L / 2 - 1, L / 2 + 1, -Rr - 1, Rr + 1)
      shade(g, h, -L / 2, L / 2, { lower: (x) => -h(x), fill: GOLD })
      plotC(g, h, { a: -L / 2, b: L / 2 })
      plotC(g, (x) => -h(x), { a: -L / 2, b: L / 2 })
      vline(g, -L / 2, -h(L / 2), h(L / 2), { dashed: false, color: '#3a2410' }); vline(g, L / 2, -h(L / 2), h(L / 2), { dashed: false, color: '#3a2410' })
      const who = pick(['Le tonnelier', 'Le brasseur', 'La vigneronne'])
      return T('Le profil du tonneau', rat(`${who} dessine le profil d'un tonneau (vu de côté, en dm) : il est délimité par les courbes y = ${Rr} − {x^2/${m}} et y = −${Rr} + {x^2/${m}}, pour x entre −${L / 2} et ${L / 2}. Quelle est l'aire de ce profil, en dm² ?`, A3, 3, `Par symétrie, aire = 2${I_(-L / 2, L / 2, `(${Rr} − {x^2/${m}})`)} = 2[${Rr}x − {x^3/${3 * m}}] de −${L / 2} à ${L / 2} = 2(${Rr * L} − ${q(b * L, 3)}) = ${q(A3, 3)} dm².`), g.figure)
    },
  ],
]

export const CONTENT = polishContent({ tiers, upgrades, age })
