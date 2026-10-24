// Primitives et équations différentielles (Terminale, spécialité) — public adulte.
// Boîte à outils (expressions avec e, ln, cos, sin ; valeurs exactes ; repères) : voir T-derivee.ts.
import {
  F, fmt, fracText, fresh, gcd, numeric, pair, par, pick, poly, randInt, randNonZero,
  type Ladder, type Maker, type Tiers,
} from '../utils'
import { prenom } from '../contexts'
import {
  BLUE, KEYS_F, KEYS_LN, T, coefP, exact, fexpr, graph, hline, lin, niceStep, oneOf, plotC, polishContent, retry, rounded,
} from './T-derivee'

// ── Aides locales ────────────────────────────────────────────────────────
const DOM_POS: [number, number] = [0.2, 4]
const r2 = (v: number) => Math.round(v * 100) / 100
const r1 = (v: number) => Math.round(v * 10) / 10
const KEYS_P = ['x', 'e^', 'ln(', '(', ')', '^', '/', '−']

/** Coefficient rationnel n/d devant une expression : '', '−', '3', '{3/2}', '−{1/2}'. */
function cq(n: number, d: number): string {
  const g = gcd(Math.abs(n), Math.abs(d)) || 1
  let a = n / g, b = d / g
  if (b < 0) { a = -a; b = -b }
  if (b === 1) return coefP(a)
  return `${a < 0 ? '−' : ''}{${Math.abs(a)}/${b}}`
}
/** Monôme (n/d)·body propre (body non vide). */
const mq = (n: number, d: number, body: string) => `${cq(n, d)}${body}`
/** Somme de morceaux : « a − b + c » sans « + − ». */
const sum = (...parts: string[]) => {
  const ps = parts.filter((p) => p && p !== '0')
  if (!ps.length) return '0'
  return ps.map((p, k) => (k === 0 ? p : p.startsWith('−') ? ` − ${p.slice(1)}` : ` + ${p}`)).join('')
}
/** Exposant « kx » avec k = n/d : x, −x, 3x, x/2, −3x/2. */
function kx(n: number, d = 1): string {
  const g = gcd(Math.abs(n), Math.abs(d)) || 1
  const a = n / g, b = d / g
  const head = a === 1 ? 'x' : a === -1 ? '−x' : `${fmt(a)}x`
  return b === 1 ? head : `${head}/${b}`
}
/** « k », « 2k »… */
const km = (m: number) => (m === 1 ? 'k' : `${m}k`)
/** r^{n/d} lisible : r, r², r^{1/2}. */
const pw = (r: number, n: number, d: number) => {
  const g = gcd(n, d), a = n / g, b = d / g
  return b === 1 ? (a === 1 ? `${r}` : `${r}^${a}`) : `${r}^{${a}/${b}}`
}
/** Réel k = n/d écrit comme fraction simple : 3, −1/2. */
const kq = (n: number, d = 1) => fracText(n, d)

// ═══════════════════════════════════════════════════════════════════════
// Entraînement
// ═══════════════════════════════════════════════════════════════════════

// ── Palier 1 ─────────────────────────────────────────────────────────────

// Primitives usuelles
const usuelles: Maker = () => oneOf(
  () => {
    const n = randInt(2, 6), a = randNonZero(-4, 4) * (Math.random() < 0.6 ? n + 1 : 1)
    const F_ = mq(a, n + 1, `x^${n + 1}`)
    return fexpr(`Donne une primitive F sur ℝ de la fonction f(x) = ${coefP(a)}x^${n}.`, `${a}/${n + 1}*x^${n + 1}`, {
      answer: F_, upTo: true,
      explanation: `Une primitive de x^n est x^{n+1} ÷ (n + 1) : F(x) = ${a === 1 ? '' : `${fmt(a)} × `}{x^${n + 1}/${n + 1}} = ${F_} (à une constante près).`,
    })
  },
  () => {
    const a = 3 * randNonZero(-3, 3), b = 2 * randNonZero(-4, 4), c = randNonZero(-9, 9)
    const F_ = poly([a / 3, 'x^3'], [b / 2, 'x^2'], [c, 'x'])
    return fexpr(`Donne une primitive sur ℝ de f(x) = ${poly([a, 'x^2'], [b, 'x'], [c, ''])}.`, F_, {
      upTo: true,
      explanation: `On intègre terme à terme : x² → {x^3/3}, x → {x^2/2}, 1 → x. F(x) = ${F_} (+ une constante quelconque).`,
    })
  },
  () => {
    const a = randNonZero(-6, 6), b = randNonZero(-9, 9)
    const F_ = sum(`${coefP(a)}e^{x}`, `${coefP(b)}x`)
    return fexpr(`Donne une primitive de f(x) = ${sum(`${coefP(a)}e^{x}`, fmt(b))} sur ℝ.`, `${a}e^x+${b}x`, {
      answer: F_, upTo: true,
      explanation: `e^{x} est sa propre primitive, et une primitive de ${fmt(b)} est ${coefP(b)}x : F(x) = ${F_}.`,
    })
  },
  () => {
    const a = randNonZero(-9, 9), c = randInt(-5, 5)
    const f = sum(a > 0 ? `{${a}/x}` : `−{${-a}/x}`, c ? fmt(c) : '')
    const F_ = sum(`${coefP(a)}ln x`, c ? `${coefP(c)}x` : '')
    return fexpr(`Donne une primitive sur ]0 ; +∞[ de f(x) = ${f}.`, `${a}ln(x)+${c}x`, {
      answer: F_, upTo: true, dom: DOM_POS, keys: KEYS_LN,
      explanation: `Une primitive de {1/x} sur ]0 ; +∞[ est ln x : F(x) = ${F_}.`,
    })
  },
  () => {
    const a = randNonZero(-6, 6), useCos = Math.random() < 0.5
    const F_ = useCos ? `${coefP(a)}sin x` : `${coefP(-a)}cos x`
    return fexpr(`Donne une primitive sur ℝ de f(x) = ${coefP(a)}${useCos ? 'cos' : 'sin'} x.`, useCos ? `${a}sin(x)` : `${-a}cos(x)`, {
      answer: F_, upTo: true, keys: ['x', 'cos(', 'sin(', '(', ')', '−'],
      explanation: useCos ? `(sin x)′ = cos x : F(x) = ${F_}.` : `(cos x)′ = −sin x, donc une primitive de sin x est −cos x : F(x) = ${F_}.`,
    })
  },
  () => {
    const a = randNonZero(-9, 9)
    const f = a > 0 ? `{${a}/x^2}` : `−{${-a}/x^2}`
    const F_ = a > 0 ? `−{${a}/x}` : `{${-a}/x}`
    return fexpr(`Donne une primitive sur ]0 ; +∞[ de f(x) = ${f}.`, `${-a}/x`, {
      answer: F_, upTo: true, dom: DOM_POS,
      explanation: `(${F(1, 'x')})′ = −${F(1, 'x^2')}, donc une primitive de ${F(1, 'x^2')} est −${F(1, 'x')} : F(x) = ${F_}.`,
    })
  },
)

// Retrouver f à partir de sa primitive F
const deFversF: Maker = fresh(() => oneOf(
  () => {
    const a = randNonZero(-3, 3), b = randInt(-6, 6), c = randInt(-6, 6), x0 = randInt(-3, 3)
    const v = 3 * a * x0 * x0 + 2 * b * x0 + c
    return numeric(`La fonction F(x) = ${poly([a, 'x^3'], [b, 'x^2'], [c, 'x'], [randInt(-9, 9), ''])} est une primitive de f sur ℝ. Calcule f(${fmt(x0)}).`, v, {
      explanation: `F est une primitive de f, donc f = F′ : f(x) = ${poly([3 * a, 'x^2'], [2 * b, 'x'], [c, ''])}, et f(${fmt(x0)}) = ${fmt(v)}.`,
    })
  },
  () => {
    const a = randNonZero(-5, 5), b = randInt(-5, 5)
    return numeric(`La fonction F(x) = (${lin(a, b)})e^{x} est une primitive de f. Calcule f(0).`, a + b, {
      explanation: `f(x) = F′(x) = ${coefP(a)}e^{x} + (${lin(a, b)})e^{x} = (${lin(a, a + b)})e^{x}, donc f(0) = ${fmt(a + b)}.`,
    })
  },
  () => {
    const a = randNonZero(-6, 6), b = randNonZero(-4, 4), x0 = pick([1, 2, 4])
    return numeric(`La fonction F(x) = ${coefP(a)}ln x ${b < 0 ? '−' : '+'} ${coefP(Math.abs(b))}x² est une primitive de f sur ]0 ; +∞[. Calcule f(${x0}).`, a / x0 + 2 * b * x0, {
      answer: fracText(a + 2 * b * x0 * x0, x0),
      explanation: `f(x) = F′(x) = ${a < 0 ? '−' : ''}${F(Math.abs(a), 'x')} ${b < 0 ? '−' : '+'} ${Math.abs(2 * b)}x, donc f(${x0}) = ${fracText(a + 2 * b * x0 * x0, x0)}.`,
    })
  },
  () => {
    const a = randNonZero(-6, 6), k = randNonZero(-3, 3)
    return numeric(`La fonction F(x) = ${coefP(a)}e^{${kx(k)}} est une primitive de f sur ℝ. Calcule f(0).`, a * k, {
      explanation: `f(x) = F′(x) = ${coefP(a * k)}e^{${kx(k)}}, donc f(0) = ${fmt(a * k)}.`,
    })
  },
))

// y′ = ay : forme des solutions
const formeExpo: Maker = fresh(() => oneOf(
  () => {
    const k = randInt(2, 5), a = k * randNonZero(-3, 3)
    return numeric(`Les solutions de l'équation différentielle ${k}y′ = ${coefP(a)}y sont les fonctions x ↦ Ce^{mx}. Que vaut m ?`, a / k, {
      explanation: `${k}y′ = ${coefP(a)}y ⇔ y′ = ${fmt(a / k)}y, dont les solutions sont x ↦ Ce^{${kx(a / k)}}.`,
    })
  },
  () => {
    const a = randNonZero(-6, 6)
    return numeric(`On considère l'équation y′ ${a > 0 ? '+' : '−'} ${coefP(Math.abs(a))}y = 0. Ses solutions s'écrivent x ↦ Ce^{mx}. Que vaut m ?`, -a, {
      explanation: `y′ ${a > 0 ? '+' : '−'} ${coefP(Math.abs(a))}y = 0 ⇔ y′ = ${coefP(-a)}y : m = ${fmt(-a)}.`,
    })
  },
  () => {
    const k = randInt(2, 6)
    return numeric(`Les solutions de y′ = {y/${k}} s'écrivent x ↦ Ce^{mx}. Que vaut m ? (fraction acceptée)`, 1 / k, {
      answer: `1/${k}`,
      explanation: `y′ = {1/${k}}y : m = {1/${k}}.`,
    })
  },
  () => {
    const k = randInt(2, 5), a = randNonZero(-4, 4)
    return numeric(`Les solutions de ${k}y′ − ${coefP(k * a)}y = 0`.replace('− −', '+ ') + ` sont les fonctions x ↦ Ce^{mx}. Que vaut m ?`, a, {
      explanation: `On divise par ${k} : y′ = ${coefP(a)}y, donc m = ${fmt(a)}.`,
    })
  },
))

// Solution constante de y′ = ay + b
const solutionConstante: Maker = fresh(() => oneOf(
  () => {
    const a = randNonZero(-5, 5), b = randNonZero(-12, 12)
    return numeric(`Quelle est la solution constante de l'équation différentielle y′ = ${coefP(a)}y ${b < 0 ? '−' : '+'} ${Math.abs(b)} ?`, -b / a, {
      answer: fracText(-b, a),
      explanation: `Une fonction constante y = c a une dérivée nulle : 0 = ${fmt(a)}c ${b < 0 ? '−' : '+'} ${Math.abs(b)}, donc c = ${fracText(-b, a)}.`,
    })
  },
  () => {
    const a = randNonZero(-5, 5), b = randNonZero(-12, 12)
    return numeric(`L'équation y′ ${a > 0 ? '+' : '−'} ${coefP(Math.abs(a))}y = ${b} admet une solution constante. Laquelle ?`, b / a, {
      answer: fracText(b, a),
      explanation: `Avec y = c constante : ${fmt(a)}c = ${b}, donc c = ${fracText(b, a)}.`,
    })
  },
  () => {
    const k = randInt(2, 5), a = randNonZero(-4, 4), b = randNonZero(-9, 9)
    return numeric(`Quelle est la solution constante de ${k}y′ = ${coefP(a)}y ${b < 0 ? '−' : '+'} ${Math.abs(b)} ?`, -b / a, {
      answer: fracText(-b, a),
      explanation: `y = c constante : 0 = ${fmt(a)}c ${b < 0 ? '−' : '+'} ${Math.abs(b)}, donc c = ${fracText(-b, a)} (le facteur ${k} devant y′ ne change rien).`,
    })
  },
  () => {
    const k = pick([0.1, 0.2, 0.05]), Ta = randInt(12, 25)
    const T0 = Ta + randInt(30, 70)
    return numeric(`La température d'un plat sorti du four à ${T0} °C vérifie T′ = −${fmt(k)}T + ${fmt(k * Ta)}. Quelle est la température d'équilibre (solution constante) ?`, Ta, {
      explanation: `T constante ⇔ T′ = 0 ⇔ ${fmt(k)}T = ${fmt(k * Ta)} ⇔ T = ${Ta} : c'est la température de la pièce.`,
    })
  },
  () => {
    const a = randInt(2, 9) * 10, r = pick([0.1, 0.2, 0.5])
    return numeric(`Une cuve se remplit et se vide : son volume vérifie V′ = ${a} − ${fmt(r)}V. Vers quel volume d'équilibre (solution constante) tend-il ?`, a / r, {
      explanation: `V constant ⇔ 0 = ${a} − ${fmt(r)}V ⇔ V = {${a}/${fmt(r)}} = ${fmt(a / r)}.`,
    })
  },
))

// Primitive de e^{kx}, 1/(x + b), cos(kx)
const primitivesSimples: Maker = () => oneOf(
  () => {
    const k = randNonZero(-4, 4), a = randNonZero(-3, 3) * Math.abs(k)
    const F_ = `${cq(a, k)}e^{${kx(k)}}`
    return fexpr(`Donne une primitive sur ℝ de f(x) = ${coefP(a)}e^{${kx(k)}}.`, `${a}/${k}*e^(${k}x)`, {
      answer: F_, upTo: true,
      explanation: `(e^{kx})′ = ke^{kx}, donc une primitive de e^{kx} est {1/k}e^{kx} : F(x) = ${F_}.`,
    })
  },
  () => {
    const b = randInt(-5, 5), a = randNonZero(-6, 6)
    const den = lin(1, b)
    return fexpr(`Donne une primitive sur ]${fmt(-b)} ; +∞[ de f(x) = ${a < 0 ? '−' : ''}{${Math.abs(a)}/${den}}.`, `${a}ln(x+${b})`, {
      answer: `${coefP(a)}ln(${den})`, upTo: true, dom: [-b + 0.2, -b + 4], keys: KEYS_LN,
      explanation: `(ln(x + c))′ = {1/x + c} : F(x) = ${coefP(a)}ln(${den}).`.replace('{1/x + c}', F(1, 'x + c')),
    })
  },
  () => {
    const k = randInt(2, 5), useCos = Math.random() < 0.5
    const F_ = useCos ? `{1/${k}}sin(${k}x)` : `−{1/${k}}cos(${k}x)`
    return fexpr(`Donne une primitive sur ℝ de f(x) = ${useCos ? 'cos' : 'sin'}(${k}x).`, useCos ? `sin(${k}x)/${k}` : `-cos(${k}x)/${k}`, {
      answer: F_, upTo: true, keys: ['x', 'cos(', 'sin(', '(', ')', '/', '−'],
      explanation: useCos ? `(sin(${k}x))′ = ${k}cos(${k}x) : F(x) = ${F_}.` : `(cos(${k}x))′ = −${k}sin(${k}x) : F(x) = ${F_}.`,
    })
  },
  () => {
    const a = randNonZero(-5, 5), k = randInt(2, 4)
    const F_ = `${cq(a, k + 1)}(x + 1)^${k + 1}`
    return fexpr(`Donne une primitive sur ℝ de f(x) = ${coefP(a)}(x + 1)^${k}.`, `${a}/${k + 1}*(x+1)^${k + 1}`, {
      answer: F_, upTo: true,
      explanation: `Une primitive de (x + 1)^${k} est {(x + 1)^${k + 1}/${k + 1}} : F(x) = ${F_}.`,
    })
  },
)

// ── Palier 2 ─────────────────────────────────────────────────────────────

// Primitive vérifiant une condition
const primitiveCondition: Maker = () => oneOf(
  () => {
    const a = randNonZero(-4, 4), b = randInt(-6, 6), x0 = randInt(-2, 2), y0 = randInt(-6, 6)
    const C = y0 - a * x0 * x0 - b * x0
    const F_ = poly([a, 'x^2'], [b, 'x'], [C, ''])
    return fexpr(`Détermine la primitive F de f(x) = ${lin(2 * a, b)} sur ℝ telle que F(${fmt(x0)}) = ${fmt(y0)}.`, F_, {
      explanation: `Les primitives de f sont F(x) = ${poly([a, 'x^2'], [b, 'x'])} + C. F(${fmt(x0)}) = ${fmt(a * x0 * x0 + b * x0)} + C = ${fmt(y0)} ⇔ C = ${fmt(C)}. Donc F(x) = ${F_}.`,
    })
  },
  () => {
    const a = randNonZero(-4, 4), c = randInt(-6, 6)
    const F_ = sum(`${coefP(a)}e^{x}`, fmt(c - a))
    return fexpr(`Détermine la primitive F de f(x) = ${coefP(a)}e^{x} sur ℝ telle que F(0) = ${fmt(c)}.`, `${a}e^x+${c - a}`, {
      answer: F_,
      explanation: `F(x) = ${coefP(a)}e^{x} + C et F(0) = ${fmt(a)} + C = ${fmt(c)}, donc C = ${fmt(c - a)} : F(x) = ${F_}.`,
    })
  },
  () => {
    const a = randNonZero(-5, 5), c = randInt(-6, 6)
    const F_ = sum(`${coefP(a)}ln x`, fmt(c))
    return fexpr(`Détermine la primitive F de f(x) = ${a > 0 ? `{${a}/x}` : `−{${-a}/x}`} sur ]0 ; +∞[ telle que F(1) = ${fmt(c)}.`, `${a}ln(x)+${c}`, {
      answer: F_, dom: DOM_POS, keys: KEYS_LN,
      explanation: `F(x) = ${coefP(a)}ln x + C et ln 1 = 0, donc C = ${fmt(c)} : F(x) = ${F_}.`,
    })
  },
  () => {
    const a = randNonZero(-4, 4), c = randInt(-6, 6)
    const F_ = sum(`${coefP(a)}sin x`, fmt(c))
    return fexpr(`Détermine la primitive F de f(x) = ${coefP(a)}cos x sur ℝ telle que F(0) = ${fmt(c)}.`, `${a}sin(x)+${c}`, {
      answer: F_, keys: ['x', 'cos(', 'sin(', '(', ')', '−'],
      explanation: `F(x) = ${coefP(a)}sin x + C et sin 0 = 0, donc C = ${fmt(c)} : F(x) = ${F_}.`,
    })
  },
  () => {
    const a = 3 * randNonZero(-2, 2), b = randInt(-5, 5)
    const C = -(a / 3 + b)
    const F_ = poly([a / 3, 'x^3'], [b, 'x'], [C, ''])
    return fexpr(`Détermine la primitive F de f(x) = ${poly([a, 'x^2'], [b, ''])} sur ℝ qui s'annule en 1.`, F_, {
      explanation: `F(x) = ${poly([a / 3, 'x^3'], [b, 'x'])} + C ; F(1) = ${fmt(a / 3 + b)} + C = 0 ⇔ C = ${fmt(C)}. F(x) = ${F_}.`,
    })
  },
)

// y′ = ay avec condition initiale
const expoCondition: Maker = () => oneOf(
  () => {
    const a = randNonZero(-4, 4), y0 = randNonZero(-9, 9)
    const ans = `${coefP(y0)}e^{${kx(a)}}`
    return fexpr(`Donne la solution f de y′ = ${coefP(a)}y telle que f(0) = ${fmt(y0)}.`, `${y0}e^(${a}x)`, {
      answer: ans,
      explanation: `Les solutions sont f(x) = Ce^{${kx(a)}} ; f(0) = C = ${fmt(y0)}. Donc f(x) = ${ans}.`,
    })
  },
  () => {
    const k = randInt(2, 5), a = randNonZero(-3, 3), y0 = randNonZero(-9, 9)
    if (Math.abs(a) === k) return null
    const ans = `${coefP(y0)}e^{${kx(a, k)}}`
    return fexpr(`Donne la solution f de ${k}y′ = ${coefP(a)}y telle que f(0) = ${fmt(y0)}.`, `${y0}e^(${a}x/${k})`, {
      answer: ans,
      explanation: `${k}y′ = ${coefP(a)}y ⇔ y′ = ${kq(a, k)}y : f(x) = Ce^{${kx(a, k)}} avec C = f(0) = ${fmt(y0)}. Donc f(x) = ${ans}.`,
    })
  },
  () => {
    const a = randNonZero(-5, 5), y0 = randNonZero(-9, 9)
    const ans = `${coefP(y0)}e^{${kx(-a)}}`
    return fexpr(`Donne la solution f de y′ ${a > 0 ? '+' : '−'} ${coefP(Math.abs(a))}y = 0 telle que f(0) = ${fmt(y0)}.`, `${y0}e^(${-a}x)`, {
      answer: ans,
      explanation: `y′ = ${coefP(-a)}y : f(x) = Ce^{${kx(-a)}}, et f(0) = C = ${fmt(y0)}. Donc f(x) = ${ans}.`,
    })
  },
  () => {
    const a = randNonZero(-3, 3), c = randNonZero(-6, 6)
    const ans = `${coefP(c)}e^{${kx(a)}}`
    return fexpr(`Donne la solution f de y′ = ${coefP(a)}y dont la courbe passe par le point A(1 ; ${c === 1 ? '' : c === -1 ? '−' : fmt(c)}e^{${fmt(a)}}).`, `${c}e^(${a}x)`, {
      answer: ans,
      explanation: `f(x) = Ce^{${kx(a)}} et f(1) = Ce^{${fmt(a)}} = ${coefP(c)}e^{${fmt(a)}}, donc C = ${fmt(c)} : f(x) = ${ans}.`,
    })
  },
)

// Primitives de u′e^u, u′/u, u′u^n
const primitivesComposees: Maker = () => oneOf(
  () => {
    const a = randInt(1, 4)
    const F_ = `${cq(a, 2)}e^{x²}`
    return fexpr(`Donne une primitive sur ℝ de f(x) = ${coefP(a)}xe^{x²}.`, `${a}/2*e^(x^2)`, {
      answer: F_, upTo: true, dom: [-1.6, 1.6],
      explanation: `Avec u(x) = x², u′(x) = 2x : f = {${a}/2} u′e^{u}, dont une primitive est {${a}/2}e^{u}. F(x) = ${F_}.`,
    })
  },
  () => {
    const c = randInt(1, 9), a = randInt(1, 4)
    const F_ = `${cq(a, 2)}ln(x² + ${c})`
    return fexpr(`Donne une primitive sur ℝ de f(x) = {${coefP(a)}x/x² + ${c}}.`, `${a}/2*ln(x^2+${c})`, {
      answer: F_, upTo: true, keys: KEYS_LN,
      explanation: `Avec u(x) = x² + ${c} > 0, u′(x) = 2x : f = {${a}/2} × {u′/u}, de primitive {${a}/2}ln u. F(x) = ${F_}.`,
    })
  },
  () => {
    const n = randInt(2, 4), b = randNonZero(-5, 5)
    const u = poly([1, 'x²'], [b, 'x'])
    const F_ = `{(${u})^${n + 1}/${n + 1}}`
    return fexpr(`Donne une primitive sur ℝ de f(x) = (${lin(2, b)})(${u})^${n}.`, `(x^2+${b}x)^${n + 1}/${n + 1}`, {
      answer: F_, upTo: true, dom: [-1.3, 1.3],
      explanation: `Avec u(x) = ${u}, u′(x) = ${lin(2, b)} : f = u′u^${n}, de primitive {u^${n + 1}/${n + 1}}. F(x) = ${F_}.`,
    })
  },
  () => {
    const a = randInt(1, 4), b = randInt(-3, 3), c = randNonZero(-3, 3)
    const L = lin(a, b)
    const F_ = `${cq(c, a)}e^{${L}}`
    return fexpr(`Donne une primitive sur ℝ de f(x) = ${coefP(c)}e^{${L}}.`, `${c}/${a}*e^(${L})`, {
      answer: F_, upTo: true,
      explanation: `(e^{${L}})′ = ${a}e^{${L}}, donc F(x) = ${F_}.`.replace('= 1e', '= e'),
    })
  },
  () => {
    const a = randInt(2, 5), b = randInt(1, 6)
    const L = lin(a, b)
    const F_ = `{1/${a}}ln(${L})`
    return fexpr(`Donne une primitive sur ]${fracText(-b, a)} ; +∞[ de f(x) = {1/${L}}.`, `ln(${L})/${a}`, {
      answer: F_, upTo: true, dom: [-b / a + 0.2, -b / a + 4], keys: KEYS_LN,
      explanation: `Avec u(x) = ${L} > 0, u′(x) = ${a} : f = {1/${a}} × {u′/u}, d'où F(x) = ${F_}.`,
    })
  },
)

// y′ = ay + b avec condition initiale
const affineCondition: Maker = () => retry(() => {
  const a = randNonZero(-3, 3), c = randNonZero(-6, 6), y0 = randInt(-9, 9)
  const b = -a * c // solution constante c
  const C = y0 - c
  if (C === 0) return null
  const ans = sum(`${coefP(C)}e^{${kx(a)}}`, fmt(c))
  return fexpr(`Donne la solution f de y′ = ${coefP(a)}y ${b < 0 ? '−' : '+'} ${Math.abs(b)} telle que f(0) = ${fmt(y0)}.`, `${c}+${C}e^(${a}x)`, {
    answer: ans,
    explanation: `Solution constante : ${fmt(a)}c ${b < 0 ? '−' : '+'} ${Math.abs(b)} = 0 ⇔ c = ${fmt(c)}. Les solutions sont f(x) = Ce^{${kx(a)}} + ${par(c)} ; f(0) = C + ${par(c)} = ${fmt(y0)} ⇔ C = ${fmt(C)}. Donc f(x) = ${ans}.`,
  })
})

// Valeur d'une solution de y′ = ay en un point
const valeurSolution: Maker = () => oneOf(
  () => {
    const k = pick([0.1, 0.2, 0.05, 0.3]), y0 = pick([50, 80, 100, 200, 500]), t = randInt(2, 10)
    const v = y0 * Math.exp(-k * t)
    return rounded(`La fonction f vérifie f′ = −${fmt(k)}f et f(0) = ${y0}. Calcule f(${t}), arrondi au centième.`, v, 2, {
      explanation: `f(t) = ${y0}e^{−${fmt(k)}t}, donc f(${t}) = ${y0}e^{−${fmt(k * t)}} ≈ ${fmt(r2(v))}.`,
    })
  },
  () => {
    const k = pick([0.02, 0.05, 0.1]), y0 = pick([1000, 2000, 5000]), t = randInt(3, 15)
    const v = y0 * Math.exp(k * t)
    return rounded(`Une population vérifie P′ = ${fmt(k)}P avec P(0) = ${y0}. Que vaut P(${t}) ? Arrondis à l'unité.`, v, 0, {
      explanation: `P(t) = ${y0}e^{${fmt(k)}t}, donc P(${t}) = ${y0}e^{${fmt(k * t)}} ≈ ${Math.round(v)}.`, tol: 1,
    })
  },
  () => {
    const a = randNonZero(-2, 2), y0 = randNonZero(-5, 5), x1 = randInt(1, 3)
    const v = y0 * Math.exp(a * x1)
    const ans = `${coefP(y0)}e^{${fmt(a * x1)}}`
    return exact(`La solution f de y′ = ${coefP(a)}y avec f(0) = ${fmt(y0)} : donne la valeur exacte de f(${x1}).`, v, ans, {
      explanation: `f(x) = ${coefP(y0)}e^{${kx(a)}}, donc f(${x1}) = ${ans} ≈ ${fmt(r2(v))}.`,
    })
  },
)

// ── Palier 3 ─────────────────────────────────────────────────────────────

// Refroidissement de Newton
const refroidissement: Maker = () => {
  const ctx = pick([
    { o: 'Un bol de soupe', T0: randInt(70, 90), Ta: randInt(18, 22), k: pick([0.05, 0.08, 0.1]), u: 'min' },
    { o: 'Un lingot sorti de la forge', T0: randInt(600, 900), Ta: randInt(15, 25), k: pick([0.02, 0.03, 0.05]), u: 'min' },
    { o: 'Une tasse de café', T0: randInt(80, 95), Ta: randInt(18, 22), k: pick([0.04, 0.06, 0.1]), u: 'min' },
    { o: 'Une miche de pain', T0: randInt(180, 220), Ta: randInt(18, 24), k: pick([0.03, 0.05]), u: 'min' },
  ])
  const t = randInt(5, 30)
  const v = ctx.Ta + (ctx.T0 - ctx.Ta) * Math.exp(-ctx.k * t)
  return oneOf(
    () => rounded(`${ctx.o} est à ${ctx.T0} °C dans une pièce à ${ctx.Ta} °C. Sa température T(t) (t en ${ctx.u}) vérifie T′ = −${fmt(ctx.k)}(T − ${ctx.Ta}). Quelle est sa température au bout de ${t} ${ctx.u} ? Arrondis au dixième.`, v, 1, {
      explanation: `Solution constante ${ctx.Ta}, donc T(t) = ${ctx.Ta} + Ce^{−${fmt(ctx.k)}t} avec C = T(0) − ${ctx.Ta} = ${ctx.T0 - ctx.Ta}. T(${t}) = ${ctx.Ta} + ${ctx.T0 - ctx.Ta}e^{−${fmt(ctx.k * t)}} ≈ ${fmt(r1(v))} °C.`,
    }),
    () => {
      const s = Math.round(ctx.Ta + (ctx.T0 - ctx.Ta) * pick([0.25, 0.4, 0.5]))
      const tt = Math.log((ctx.T0 - ctx.Ta) / (s - ctx.Ta)) / ctx.k
      return rounded(`${ctx.o} est à ${ctx.T0} °C dans une pièce à ${ctx.Ta} °C. Sa température vérifie T′ = −${fmt(ctx.k)}(T − ${ctx.Ta}). Au bout de combien de minutes atteint-elle ${s} °C ? Arrondis au dixième.`, tt, 1, {
        explanation: `T(t) = ${ctx.Ta} + ${ctx.T0 - ctx.Ta}e^{−${fmt(ctx.k)}t} = ${s} ⇔ e^{−${fmt(ctx.k)}t} = {${s - ctx.Ta}/${ctx.T0 - ctx.Ta}} ⇔ t = {ln(${ctx.T0 - ctx.Ta}/${s - ctx.Ta})/${fmt(ctx.k)}} ≈ ${fmt(r1(tt))} ${ctx.u}.`,
      })
    },
    () => rounded(`${ctx.o} refroidit selon T(t) = ${ctx.Ta} + ${ctx.T0 - ctx.Ta}e^{−${fmt(ctx.k)}t} (t en ${ctx.u}). Calcule la vitesse de refroidissement T′(${t}) en °C par ${ctx.u}, arrondie au centième.`, -ctx.k * (ctx.T0 - ctx.Ta) * Math.exp(-ctx.k * t), 2, {
      explanation: `T′(t) = −${fmt(ctx.k)} × ${ctx.T0 - ctx.Ta}e^{−${fmt(ctx.k)}t} = −${fmt(ctx.k * (ctx.T0 - ctx.Ta))}e^{−${fmt(ctx.k)}t}, donc T′(${t}) ≈ ${fmt(r2(-ctx.k * (ctx.T0 - ctx.Ta) * Math.exp(-ctx.k * t)))} °C/${ctx.u}.`,
    }),
  )
}

// Croissance et décroissance exponentielles
const croissance: Maker = () => oneOf(
  () => {
    const a = pick([0.02, 0.03, 0.05, 0.1, 0.2])
    const who = pick(['Une colonie de bactéries', 'Une population de lapins', 'Le nombre d’abonnés d’un site', 'Une culture de levure'])
    return exact(`${who} vérifie N′ = ${fmt(a)}N (t en jours). Au bout de combien de jours double-t-elle ? (valeur exacte ou arrondi au centième)`, Math.log(2) / a, `{ln 2/${fmt(a)}}`, {
      explanation: `N(t) = N(0)e^{${fmt(a)}t} ; N(t) = 2N(0) ⇔ e^{${fmt(a)}t} = 2 ⇔ t = {ln 2/${fmt(a)}} ≈ ${fmt(r2(Math.log(2) / a))} jours.`,
    })
  },
  () => {
    const lam = pick([0.01, 0.02, 0.05, 0.1])
    const what = pick(['Une substance radioactive', 'Un médicament dans le sang', 'Le stock de grain rongé par les rats'])
    return exact(`${what} se désintègre selon Q′ = −${fmt(lam)}Q (t en heures). Quelle est sa demi-vie (durée pour que la quantité soit divisée par 2) ? Valeur exacte ou arrondi au centième.`, Math.log(2) / lam, `{ln 2/${fmt(lam)}}`, {
      explanation: `Q(t) = Q(0)e^{−${fmt(lam)}t} = {Q(0)/2} ⇔ e^{−${fmt(lam)}t} = {1/2} ⇔ t = {ln 2/${fmt(lam)}} ≈ ${fmt(r2(Math.log(2) / lam))} h.`,
    })
  },
  () => {
    const T = pick([5, 10, 20, 25]), m = pick([3, 4, 5])
    return numeric(`Une population, modélisée par N′ = aN, double tous les ${T} ans. Au bout de combien d'années aura-t-elle été multipliée par ${2 ** (m - 1)} ?`, T * (m - 1), {
      explanation: `a = {ln 2/${T}}, et e^{at} = ${2 ** (m - 1)} = 2^${m - 1} ⇔ t = ${m - 1} × ${T} = ${T * (m - 1)} ans.`,
    })
  },
  () => {
    const N0 = pick([100, 200, 500]), N1 = N0 * pick([2, 3, 5]), t1 = pick([2, 4, 5, 10])
    return exact(`Une culture vérifie N′ = aN. Elle passe de ${N0} à ${N1} individus en ${t1} heures. Donne la valeur exacte de a.`, Math.log(N1 / N0) / t1, `{ln ${N1 / N0}/${t1}}`, {
      explanation: `N(t) = ${N0}e^{at} et ${N0}e^{${t1}a} = ${N1} ⇔ e^{${t1}a} = ${N1 / N0} ⇔ a = {ln ${N1 / N0}/${t1}} ≈ ${fmt(Math.round((Math.log(N1 / N0) / t1) * 1000) / 1000)}.`,
    })
  },
)

// Primitive avec condition, fonctions variées
const primitiveCondition2: Maker = () => oneOf(
  () => {
    const c = randInt(-5, 5)
    const ans = sum('ln x', 'x²', fmt(c - 1))
    return fexpr(`Détermine la primitive F de f(x) = {1/x} + 2x sur ]0 ; +∞[ telle que F(1) = ${fmt(c)}.`, `ln(x)+x^2+${c - 1}`, {
      answer: ans, dom: DOM_POS, keys: KEYS_P,
      explanation: `F(x) = ln x + x² + C, et F(1) = 0 + 1 + C = ${fmt(c)} ⇔ C = ${fmt(c - 1)} : F(x) = ${ans}.`,
    })
  },
  () => {
    const k = randInt(2, 4), c = randInt(-4, 4)
    const ans = sum(`{1/${k}}e^{${k}x}`, `${cq(k * c - 1, k)}`.replace(/^$/, '1').replace(/^−$/, '−1'))
    return fexpr(`Détermine la primitive F de f(x) = e^{${k}x} sur ℝ telle que F(0) = ${fmt(c)}.`, `e^(${k}x)/${k}+${c}-1/${k}`, {
      answer: ans, keys: KEYS_F,
      explanation: `F(x) = {1/${k}}e^{${k}x} + C ; F(0) = {1/${k}} + C = ${fmt(c)} ⇔ C = ${fracText(k * c - 1, k)}. F(x) = ${ans}.`,
    })
  },
  () => {
    const a = randInt(1, 6), c = randInt(-5, 5)
    const ans = sum(`${coefP(a)}ln(x + 1)`, fmt(c))
    return fexpr(`Détermine la primitive F de f(x) = {${a}/x + 1} sur ]−1 ; +∞[ telle que F(0) = ${fmt(c)}.`, `${a}ln(x+1)+${c}`, {
      answer: ans, dom: [-0.8, 3], keys: KEYS_LN,
      explanation: `F(x) = ${coefP(a)}ln(x + 1) + C et ln 1 = 0, donc C = ${fmt(c)} : F(x) = ${ans}.`,
    })
  },
  () => {
    const k = randInt(2, 4), c = randInt(-5, 5)
    const ans = sum(`{1/${k}}sin(${k}x)`, fmt(c))
    return fexpr(`Détermine la primitive F de f(x) = cos(${k}x) sur ℝ telle que F(0) = ${fmt(c)}.`, `sin(${k}x)/${k}+${c}`, {
      answer: ans, keys: ['x', 'cos(', 'sin(', '(', ')', '/', '−'],
      explanation: `F(x) = {1/${k}}sin(${k}x) + C et sin 0 = 0, donc C = ${fmt(c)} : F(x) = ${ans}.`,
    })
  },
)

// y′ = ay + b sous une forme non résolue
const affineForme: Maker = () => retry(() => {
  const k = randInt(2, 4), a = randNonZero(-3, 3), c = randNonZero(-5, 5), y0 = randInt(-6, 9)
  // k y′ = a y + b, de solution constante c : b = −a c
  const b = -a * c, C = y0 - c
  if (C === 0 || Math.abs(a) === k) return null
  const left = `${k}y′ ${a > 0 ? '−' : '+'} ${coefP(Math.abs(a))}y`
  const ans = sum(`${coefP(C)}e^{${kx(a, k)}}`, fmt(c))
  return fexpr(`Donne la solution f de ${left} = ${fmt(b)} telle que f(0) = ${fmt(y0)}.`, `${c}+${C}e^(${a}x/${k})`, {
    answer: ans,
    explanation: `L'équation s'écrit y′ = ${kq(a, k)}y ${b < 0 ? '−' : '+'} ${fracText(Math.abs(b), k)}. Solution constante : c = ${fmt(c)}. Donc f(x) = Ce^{${kx(a, k)}} + ${par(c)} avec C = f(0) − ${par(c)} = ${fmt(C)} : f(x) = ${ans}.`,
  })
})

// Charge d'un condensateur
const condensateur: Maker = () => {
  const E = pick([5, 6, 9, 12]), tau = pick([0.5, 1, 2, 5])
  return oneOf(
    () => {
      const t = pick([1, 2, 3]) * tau
      const v = E * (1 - Math.exp(-t / tau))
      return rounded(`Un condensateur se charge sous une tension de ${E} V : u′ = ${tau === 1 ? `${E} − u` : `{${E} − u/${fmt(tau)}}`} (t en ms), avec u(0) = 0. Quelle est la tension u au bout de ${fmt(t)} ms ? Arrondis au centième.`, v, 2, {
        explanation: `u(t) = ${E} − ${E}e^{−t/${fmt(tau)}} (solution constante ${E}, et u(0) = 0). u(${fmt(t)}) = ${E}(1 − e^{−${fmt(t / tau)}}) ≈ ${fmt(r2(v))} V.`,
      })
    },
    () => {
      const p = pick([90, 95, 99])
      const t = tau * Math.log(100 / (100 - p))
      return rounded(`Un condensateur se charge selon u(t) = ${E}(1 − e^{−t/${fmt(tau)}}) (t en ms). Au bout de combien de millisecondes atteint-il ${p} % de sa tension finale ? Arrondis au centième.`, t, 2, {
        explanation: `1 − e^{−t/${fmt(tau)}} = ${fmt(p / 100)} ⇔ e^{−t/${fmt(tau)}} = ${fmt((100 - p) / 100)} ⇔ t = ${fmt(tau)} ln ${fmt(100 / (100 - p))} ≈ ${fmt(r2(t))} ms.`,
      })
    },
    () => {
      const t = pick([1, 2]) * tau
      const v = (E / tau) * Math.exp(-t / tau)
      return rounded(`La tension d'un condensateur vérifie ${fmt(tau)}u′ + u = ${E} et u(0) = 0 (t en ms). Calcule la vitesse de charge u′(${fmt(t)}), en V/ms, arrondie au centième.`, v, 2, {
        explanation: `u(t) = ${E}(1 − e^{−t/${fmt(tau)}}), u′(t) = ${fmt(E / tau)}e^{−t/${fmt(tau)}}, donc u′(${fmt(t)}) ≈ ${fmt(r2(v))} V/ms.`,
      })
    },
  )
}

// ── Palier 4 ─────────────────────────────────────────────────────────────

// Primitives composées plus fines
const primitivesFines: Maker = () => oneOf(
  () => {
    const c = randInt(1, 5)
    const ans = `−{1/2(x² + ${c})}`
    return fexpr(`Donne une primitive sur ℝ de f(x) = {x/(x² + ${c})^2}.`, `-1/(2*(x^2+${c}))`, {
      answer: ans, upTo: true,
      explanation: `Avec u(x) = x² + ${c}, f = {1/2} × {u′/u^2}, et une primitive de {u′/u^2} est −{1/u}. F(x) = ${ans}.`,
    })
  },
  () => {
    const a = randInt(1, 3)
    const ex = a === 1 ? '−x²' : `−${a}x²`
    const ans = `−{1/${2 * a}}e^{${ex}}`
    return fexpr(`Donne une primitive sur ℝ de f(x) = xe^{${ex}}.`, `-1/${2 * a}*e^(-${a}x^2)`, {
      answer: ans, upTo: true, dom: [-1.5, 1.5],
      explanation: `Avec u(x) = ${ex}, u′(x) = −${2 * a}x : f = −{1/${2 * a}}u′e^{u}. F(x) = ${ans}.`,
    })
  },
  () => fexpr(`Donne une primitive sur ℝ de f(x) = sin x cos x.`, `sin(x)^2/2`, {
    answer: '{1/2}sin²x', upTo: true, keys: ['x', 'cos(', 'sin(', '(', ')', '^', '/', '−'],
    explanation: `Avec u = sin x, u′ = cos x : f = u′u, de primitive {u^2/2}. F(x) = {1/2}sin²x (ou −{1/2}cos²x, qui diffère d'une constante).`,
  }),
  () => {
    const c = randInt(1, 6)
    return fexpr(`Donne une primitive sur ℝ de f(x) = {eˣ/eˣ + ${c}}.`, `ln(e^x+${c})`, {
      answer: `ln(eˣ + ${c})`, upTo: true, keys: KEYS_P,
      explanation: `Avec u(x) = eˣ + ${c} > 0 : f = {u′/u}, de primitive ln u. F(x) = ln(eˣ + ${c}).`,
    })
  },
  () => {
    const n = randInt(1, 3)
    const ans = `{(ln x)^${n + 1}/${n + 1}}`
    return fexpr(`Donne une primitive sur ]0 ; +∞[ de f(x) = {(ln x)${n > 1 ? `^${n}` : ''}/x}.`, `ln(x)^${n + 1}/${n + 1}`, {
      answer: ans, upTo: true, dom: DOM_POS, keys: KEYS_LN,
      explanation: `Avec u = ln x, u′ = {1/x} : f = u′u${n > 1 ? `^${n}` : ''}, de primitive {u^${n + 1}/${n + 1}}. F(x) = ${ans}.`,
    })
  },
)

// Identifier une primitive de la forme (ax + b)e^{x}
const identification: Maker = () => oneOf(
  () => {
    const c = randNonZero(-4, 4), d = randInt(-6, 6)
    return pair(`On cherche une primitive de f(x) = (${lin(c, d)})e^{x} de la forme F(x) = (ax + b)e^{x}. Donne le couple (a ; b).`, c, d - c, {
      explanation: `F′(x) = ae^{x} + (ax + b)e^{x} = (ax + a + b)e^{x}. Par identification : a = ${fmt(c)} et a + b = ${fmt(d)}, donc b = ${fmt(d - c)}.`,
    })
  },
  () => {
    const c = randNonZero(-4, 4), d = randInt(-6, 6)
    return pair(`On cherche une primitive de f(x) = (${lin(c, d)})e^{−x} de la forme F(x) = (ax + b)e^{−x}. Donne le couple (a ; b).`, -c, -c - d, {
      explanation: `F′(x) = ae^{−x} − (ax + b)e^{−x} = (−ax + a − b)e^{−x}. Par identification : −a = ${fmt(c)} et a − b = ${fmt(d)}, donc a = ${fmt(-c)} et b = ${fmt(-c - d)}.`,
    })
  },
  () => {
    const c = randNonZero(-4, 4), d = randInt(-5, 5)
    return pair(`On cherche une primitive de f(x) = ${sum(`${coefP(c)}ln x`, fmt(d))} sur ]0 ; +∞[ de la forme F(x) = ax ln x + bx. Donne le couple (a ; b).`, c, d - c, {
      explanation: `F′(x) = a ln x + a + b. Par identification : a = ${fmt(c)} et a + b = ${fmt(d)}, donc b = ${fmt(d - c)}.`,
    })
  },
)

// Condition donnée ailleurs qu'en 0
const conditionAilleurs: Maker = () => oneOf(
  () => {
    const a = randNonZero(-3, 3), x1 = randNonZero(-2, 2), v = randInt(2, 9)
    const n = -a * x1
    return exact(`La fonction f est solution de y′ = ${coefP(a)}y et f(${fmt(x1)}) = ${v}. Donne la valeur exacte de f(0).`, v * Math.exp(n), `${v}e^{${fmt(n)}}`.replace('e^{1}', 'e'), {
      explanation: `f(x) = Ce^{${kx(a)}} et f(${fmt(x1)}) = Ce^{${fmt(a * x1)}} = ${v}, donc C = ${v}e^{${fmt(n)}} = f(0).`.replace('e^{1}', 'e'),
    })
  },
  () => {
    const a = randNonZero(-2, 2), x1 = randInt(1, 3), v = randInt(2, 9), x2 = x1 + randInt(1, 2)
    const n = a * (x2 - x1)
    return exact(`La fonction f est solution de y′ = ${coefP(a)}y et f(${x1}) = ${v}. Donne la valeur exacte de f(${x2}).`, v * Math.exp(n), `${v}e^{${fmt(n)}}`.replace('e^{1}', 'e'), {
      explanation: `Pour f(x) = Ce^{${kx(a)}}, on a f(x + h) = f(x) × e^{${a === 1 ? '' : a === -1 ? '−' : fmt(a)}h}. Ici h = ${x2 - x1} : f(${x2}) = ${v}e^{${fmt(n)}}.`,
    })
  },
  () => {
    const c = randNonZero(-5, 5), v = randInt(1, 9)
    // y′ = −y + c, f(ln 2) = v → f(x) = c + Ce^{−x}, C = 2(v − c)
    const C = 2 * (v - c)
    if (C === 0) return null
    const ans = sum(`${coefP(C)}e^{−x}`, fmt(c))
    return fexpr(`Donne la solution f de y′ = −y ${c < 0 ? '−' : '+'} ${Math.abs(c)} telle que f(ln 2) = ${v}.`, `${c}+${C}e^(-x)`, {
      answer: ans,
      explanation: `f(x) = Ce^{−x} + ${par(c)}, et e^{−ln 2} = {1/2} : {C/2} + ${par(c)} = ${v} ⇔ C = ${fmt(C)}. f(x) = ${ans}.`,
    })
  },
)

// Instant où la solution atteint une valeur
const instantSeuil: Maker = () => oneOf(
  () => {
    const L = pick([10, 20, 50, 100]), q = pick([2, 4, 5, 10])
    const s = L - L / q
    return exact(`La solution de y′ = −y + ${L} avec y(0) = 0 est y(x) = ${L}(1 − e^{−x}). Pour quelle valeur exacte de x vaut-elle ${fmt(s)} ?`, Math.log(q), `ln ${q}`, {
      explanation: `${L}(1 − e^{−x}) = ${fmt(s)} ⇔ e^{−x} = {1/${q}} ⇔ x = ln ${q}.`,
    })
  },
  () => {
    const k = randInt(2, 4), q = pick([2, 3, 5])
    return exact(`La solution de y′ = −${k}y avec y(0) = 1 est y(x) = e^{−${k}x}. Pour quelle valeur exacte de x vaut-elle {1/${q}} ?`, Math.log(q) / k, `{ln ${q}/${k}}`, {
      explanation: `e^{−${k}x} = {1/${q}} ⇔ −${k}x = −ln ${q} ⇔ x = {ln ${q}/${k}}.`,
    })
  },
  () => {
    const a = randInt(1, 3), c = randInt(2, 6), q = pick([2, 3, 4])
    // y = c(e^{ax} − 1) atteint c(q − 1) quand e^{ax} = q
    return exact(`La solution de y′ = ${coefP(a)}y + ${a * c} avec y(0) = 0 est y(x) = ${c}(e^{${kx(a)}} − 1). Pour quelle valeur exacte de x vaut-elle ${c * (q - 1)} ?`, Math.log(q) / a, a === 1 ? `ln ${q}` : `{ln ${q}/${a}}`, {
      explanation: `${c}(e^{${kx(a)}} − 1) = ${c * (q - 1)} ⇔ e^{${kx(a)}} = ${q} ⇔ x = ${a === 1 ? `ln ${q}` : `{ln ${q}/${a}}`}.`,
    })
  },
)

// Solution particulière de y′ = ay + f(x)
const particuliere: Maker = () => oneOf(
  () => retry(() => {
    const a = randNonZero(-3, 3), p = randNonZero(-3, 3), q = randInt(-4, 4)
    // y_p = px + q solution de y′ = ay + mx + n : p = a(px + q) + mx + n ⇒ m = −ap, n = p − aq
    const m = -a * p, n = p - a * q
    const rhs = sum(`${coefP(a)}y`, `${coefP(m)}x`, n ? fmt(n) : '')
    const ans = lin(p, q)
    return fexpr(`Trouve une solution de y′ = ${rhs} de la forme y = ax + b (fonction affine).`, ans, {
      explanation: `Avec y = ax + b : a = ${fmt(a)}(ax + b) ${m < 0 ? '−' : '+'} ${coefP(Math.abs(m))}x${n ? ` ${n < 0 ? '−' : '+'} ${Math.abs(n)}` : ''}. Coefficient de x : ${fmt(a)}a ${m < 0 ? '−' : '+'} ${Math.abs(m)} = 0 ⇔ a = ${fmt(p)} ; constante : a = ${fmt(a)}b${n ? ` ${n < 0 ? '−' : '+'} ${Math.abs(n)}` : ''} ⇔ b = ${fmt(q)}. y = ${ans}.`,
    })
  }),
  () => retry(() => {
    const a = randNonZero(-3, 3), k = randNonZero(-2, 3), c = randNonZero(-3, 3)
    if (k === a) return null
    // y = λe^{kx} : kλ = aλ + c ⇒ λ = c/(k − a)
    const lam = c / (k - a)
    if (!Number.isInteger(lam)) return null
    const ans = `${coefP(lam)}e^{${kx(k)}}`
    return fexpr(`Trouve une solution de y′ = ${coefP(a)}y ${c < 0 ? '−' : '+'} ${coefP(Math.abs(c))}e^{${kx(k)}} de la forme y = λe^{${kx(k)}}.`, `${lam}e^(${k}x)`, {
      answer: ans,
      explanation: `Avec y = λe^{${kx(k)}} : ${fmt(k)}λe^{${kx(k)}} = ${fmt(a)}λe^{${kx(k)}} + ${par(c)}e^{${kx(k)}} ⇔ ${fmt(k - a)}λ = ${fmt(c)} ⇔ λ = ${fmt(lam)}. y = ${ans}.`,
    })
  }),
  () => retry(() => {
    const a = pick([-1, 1, 2, -2]), p = randNonZero(-2, 2)
    // y_p = p x² + q x + r solution de y′ = a y + m x² : 2px + q = a(px² + qx + r) + mx²
    // ⇒ m = −ap ; 2p = aq ; q = ar
    const m = -a * p, q = (2 * p) / a, r = q / a
    if (!Number.isInteger(q) || !Number.isInteger(r)) return null
    const ans = poly([p, 'x^2'], [q, 'x'], [r, ''])
    return fexpr(`Trouve une solution polynomiale de degré 2 de y′ = ${coefP(a)}y ${m < 0 ? '−' : '+'} ${coefP(Math.abs(m))}x².`, ans, {
      explanation: `Avec y = ax² + bx + c : 2ax + b = ${coefP(a)}(ax² + bx + c) ${m < 0 ? '−' : '+'} ${coefP(Math.abs(m))}x². Termes en x² : ${coefP(a)}a ${m < 0 ? '−' : '+'} ${Math.abs(m)} = 0 ⇔ a = ${fmt(p)} ; en x : 2a = ${coefP(a)}b ⇔ b = ${fmt(q)} ; constantes : b = ${coefP(a)}c ⇔ c = ${fmt(r)}. y = ${ans}.`,
    })
  }),
)

// ── Palier 5 ─────────────────────────────────────────────────────────────

// Modèle exponentiel à deux mesures
const deuxMesures: Maker = () => oneOf(
  () => {
    const N0 = pick([100, 200, 400]), r = pick([2, 3, 4]), T = pick([2, 3, 5])
    return numeric(`Une population suit N(t) = Ce^{kt}. On mesure N(0) = ${N0} et N(${T}) = ${N0 * r}. Que vaut N(${2 * T}) ?`, N0 * r * r, {
      explanation: `C = ${N0} et e^{${T}k} = ${r}. Alors N(${2 * T}) = ${N0}(e^{${T}k})² = ${N0} × ${r * r} = ${N0 * r * r}.`,
    })
  },
  () => {
    const N0 = pick([100, 200, 500]), r = pick([2, 3, 5]), T = pick([2, 4, 5])
    return exact(`Une population suit N(t) = Ce^{kt}. On mesure N(0) = ${N0} et N(${T}) = ${N0 * r}. Donne la valeur exacte de k.`, Math.log(r) / T, `{ln ${r}/${T}}`, {
      explanation: `C = N(0) = ${N0}, puis e^{${T}k} = ${r} ⇔ k = {ln ${r}/${T}} ≈ ${fmt(Math.round((Math.log(r) / T) * 1000) / 1000)}.`,
    })
  },
  () => {
    const t1 = pick([1, 2]), t2 = t1 + pick([1, 2]), v1 = pick([20, 40, 80]), r = pick([2, 3])
    const v2 = v1 * r
    const k = Math.log(r) / (t2 - t1), C = v1 * Math.exp(-k * t1)
    return rounded(`Une quantité suit Q(t) = Ce^{kt}. On mesure Q(${t1}) = ${v1} et Q(${t2}) = ${v2}. Que valait Q(0) ? Arrondis au centième.`, C, 2, {
      explanation: `{Q(${t2})/Q(${t1})} = e^{${km(t2 - t1)}} = ${r}, donc e^{k} = ${pw(r, 1, t2 - t1)}. Q(0) = Q(${t1}) ÷ e^{${km(t1)}} = ${v1} ÷ ${pw(r, t1, t2 - t1)} ≈ ${fmt(r2(C))}.`,
    })
  },
)

// y′ = ay + f(x) avec condition
const completeCondition: Maker = () => oneOf(
  () => retry(() => {
    const a = pick([1, 2, -1]), p = randNonZero(-3, 3), q = randInt(-3, 3), y0 = randInt(-5, 6)
    const m = -a * p, n = p - a * q, C = y0 - q
    if (C === 0) return null
    const rhs = sum(`${coefP(a)}y`, `${coefP(m)}x`, n ? fmt(n) : '')
    const ans = sum(`${coefP(C)}e^{${kx(a)}}`, `${coefP(p)}x`, q ? fmt(q) : '')
    return fexpr(`Résous y′ = ${rhs} avec y(0) = ${fmt(y0)}. (Une solution particulière est affine.)`, `${C}e^(${a}x)+${p}x+${q}`, {
      answer: ans,
      explanation: `Solution particulière affine : y_p = ${lin(p, q)}. Solutions : y = ${sum(`Ce^{${kx(a)}}`, lin(p, q))}. y(0) = C${q ? ` + ${par(q)}` : ''} = ${fmt(y0)} ⇔ C = ${fmt(C)}. y = ${ans}.`,
    })
  }),
  () => retry(() => {
    const a = pick([1, -1, 2]), k = pick([2, 3, -1]), y0 = randInt(-4, 5)
    if (k === a) return null
    const lam = 1, c = k - a // y′ = a y + c e^{kx} admet y = e^{kx}
    const C = y0 - lam
    if (C === 0) return null
    const ans = sum(`${coefP(C)}e^{${kx(a)}}`, `e^{${kx(k)}}`)
    return fexpr(`Résous y′ = ${coefP(a)}y ${c < 0 ? '−' : '+'} ${coefP(Math.abs(c))}e^{${kx(k)}} avec y(0) = ${fmt(y0)}. (Vérifie d'abord que e^{${kx(k)}} est solution.)`, `${C}e^(${a}x)+e^(${k}x)`, {
      answer: ans,
      explanation: `(e^{${kx(k)}})′ = ${fmt(k)}e^{${kx(k)}} = ${fmt(a)}e^{${kx(k)}} + ${par(c)}e^{${kx(k)}} : c'est une solution particulière. y = Ce^{${kx(a)}} + e^{${kx(k)}} et y(0) = C + 1 = ${fmt(y0)} ⇔ C = ${fmt(C)}. y = ${ans}.`,
    })
  }),
)

// Primitives à reconnaître (forme cachée)
const primitivesCachees: Maker = () => oneOf(
  () => {
    const b = randInt(-3, 3), c = b * b + randInt(1, 6)
    const den = poly([1, 'x²'], [2 * b, 'x'], [c, ''])
    return fexpr(`Donne une primitive sur ℝ de f(x) = {${lin(1, b)}/${den}}.`, `ln(x^2+${2 * b}x+${c})/2`, {
      answer: `{1/2}ln(${den})`, upTo: true, keys: KEYS_LN,
      explanation: `Le dénominateur u(x) = ${den} est strictement positif et u′(x) = ${lin(2, 2 * b)} = 2(${lin(1, b)}) : f = {1/2} × {u′/u}. F(x) = {1/2}ln(${den}).`,
    })
  },
  () => {
    const c = randInt(1, 5)
    return fexpr(`Donne une primitive sur ℝ de f(x) = {eˣ/(eˣ + ${c})^2}.`, `-1/(e^x+${c})`, {
      answer: `−{1/eˣ + ${c}}`, upTo: true, keys: KEYS_P,
      explanation: `Avec u = eˣ + ${c} : f = {u′/u^2}, de primitive −{1/u}. F(x) = −{1/eˣ + ${c}}.`,
    })
  },
  () => fexpr(`Donne une primitive sur ]1 ; +∞[ de f(x) = {1/x ln x}.`, `ln(ln(x))`, {
    answer: 'ln(ln x)', upTo: true, dom: [1.2, 5], keys: KEYS_LN,
    explanation: `Avec u = ln x > 0 sur ]1 ; +∞[, u′ = {1/x} : f = {u′/u}, de primitive ln u. F(x) = ln(ln x).`,
  }),
  () => {
    const a = randInt(2, 5)
    return fexpr(`Donne une primitive sur ]0 ; +∞[ de f(x) = {1/√x} + {${a}/x}.`, `2√x+${a}ln(x)`, {
      answer: `2√x + ${a}ln x`, upTo: true, dom: DOM_POS, keys: ['x', '√', 'ln(', '(', ')', '/', '−'],
      explanation: `(√x)′ = {1/2√x}, donc une primitive de {1/√x} est 2√x ; une primitive de {${a}/x} est ${a}ln x. F(x) = 2√x + ${a}ln x.`,
    })
  },
)

// Perfusion : apport constant et élimination
const perfusion: Maker = () => {
  const d = pick([2, 3, 4, 5]), k = pick([0.1, 0.2, 0.25, 0.5])
  const Qinf = d / k
  return oneOf(
    () => numeric(`Lors d'une perfusion, la quantité Q(t) de médicament (en mg) vérifie Q′ = ${d} − ${fmt(k)}Q, avec Q(0) = 0. Vers quelle quantité Q(t) tend-elle quand t devient grand ?`, Qinf, {
      explanation: `Q(t) = ${fmt(Qinf)} − ${fmt(Qinf)}e^{−${fmt(k)}t} (solution constante {${d}/${fmt(k)}} = ${fmt(Qinf)}, et Q(0) = 0). Comme e^{−${fmt(k)}t} → 0, Q(t) → ${fmt(Qinf)} mg.`,
    }),
    () => {
      const p = pick([50, 75, 90, 95])
      const t = Math.log(100 / (100 - p)) / k
      return rounded(`Lors d'une perfusion, Q′ = ${d} − ${fmt(k)}Q avec Q(0) = 0 (t en h). Au bout de combien d'heures atteint-on ${p} % de la quantité d'équilibre ? Arrondis au centième.`, t, 2, {
        explanation: `Q(t) = ${fmt(Qinf)}(1 − e^{−${fmt(k)}t}) ; 1 − e^{−${fmt(k)}t} = ${fmt(p / 100)} ⇔ t = {ln ${fmt(100 / (100 - p))}/${fmt(k)}} ≈ ${fmt(r2(t))} h.`,
      })
    },
    () => {
      const t = randInt(2, 10)
      const v = Qinf * (1 - Math.exp(-k * t))
      return rounded(`Lors d'une perfusion, Q′ = ${d} − ${fmt(k)}Q avec Q(0) = 0 (t en h, Q en mg). Quelle quantité est présente au bout de ${t} h ? Arrondis au centième.`, v, 2, {
        explanation: `Q(t) = ${fmt(Qinf)}(1 − e^{−${fmt(k)}t}), donc Q(${t}) = ${fmt(Qinf)}(1 − e^{−${fmt(k * t)}}) ≈ ${fmt(r2(v))} mg.`,
      })
    },
  )
}

// Primitive avec condition puis valeur
const primitiveValeur: Maker = () => oneOf(
  () => {
    const n = randInt(2, 4), c = randInt(-3, 3)
    return numeric(`F est la primitive de f(x) = {1/x} sur ]0 ; +∞[ telle que F(e) = ${fmt(c)}. Calcule F(e^${n}).`, n - 1 + c, {
      explanation: `F(x) = ln x + C avec 1 + C = ${fmt(c)}, donc C = ${fmt(c - 1)}${c - 1 ? `. F(e^${n}) = ${n} + ${par(c - 1)} = ${fmt(n - 1 + c)}` : ` et F(x) = ln x : F(e^${n}) = ${n}`}.`,
    })
  },
  () => {
    const a = randInt(1, 3)
    return exact(`F est la primitive de f(x) = ${coefP(2 * a)}xe^{x²} sur ℝ telle que F(0) = 0. Donne la valeur exacte de F(1).`, a * (Math.E - 1), a === 1 ? 'e − 1' : `${a}(e − 1)`, {
      explanation: `F(x) = ${coefP(a)}e^{x²} + C et F(0) = ${fmt(a)} + C = 0, donc F(x) = ${coefP(a)}(e^{x²} − 1) et F(1) = ${a === 1 ? 'e − 1' : `${a}(e − 1)`}.`,
    })
  },
  () => {
    const k = randInt(2, 5)
    return numeric(`F est la primitive de f(x) = {1/2√x} sur ]0 ; +∞[ telle que F(1) = 0. Calcule F(${k * k}).`, k - 1, {
      explanation: `(√x)′ = {1/2√x}, donc F(x) = √x + C avec 1 + C = 0 : F(x) = √x − 1 et F(${k * k}) = ${k} − 1 = ${k - 1}.`,
    })
  },
  () => {
    const c = randInt(1, 4)
    return exact(`F est la primitive de f(x) = cos x sur ℝ telle que F(0) = ${c}. Donne la valeur exacte de F({π/6}) + F({π/2}).`, 2 * c + 1.5, `${fmt(2 * c + 1.5)}`, {
      explanation: `F(x) = sin x + ${c}. F({π/6}) + F({π/2}) = {1/2} + ${c} + 1 + ${c} = ${fmt(2 * c + 1.5)}.`, approx: false,
    })
  },
)

const tiers: Tiers = [
  [usuelles, deFversF, formeExpo, solutionConstante, primitivesSimples],
  [primitiveCondition, expoCondition, primitivesComposees, affineCondition, valeurSolution],
  [refroidissement, croissance, primitiveCondition2, affineForme, condensateur],
  [primitivesFines, identification, conditionAilleurs, instantSeuil, particuliere],
  [deuxMesures, completeCondition, primitivesCachees, perfusion, primitiveValeur],
]

// ═══════════════════════════════════════════════════════════════════════
// Problèmes d'amélioration
// ═══════════════════════════════════════════════════════════════════════

const upgrades: Ladder = [
  [
    // Primitive de x^n et F(1) − F(0)
    () => {
      const n = randInt(2, 12), a = randInt(1, 5) * (n + 1)
      return numeric(`F est une primitive de f(x) = ${a}x^${n}. Calcule F(1) − F(0). (Le résultat ne dépend pas de la primitive choisie : pourquoi ?)`, a / (n + 1), {
        explanation: `F(x) = {${a}/${n + 1}}x^${n + 1} + C, donc F(1) − F(0) = ${a / (n + 1)} : la constante C s'élimine dans la différence.`,
      })
    },
    // Taux multiplicatif d'une solution de y′ = ay
    () => {
      const r = pick([1.5, 2, 3, 0.5, 0.8]), u = pick(['heure', 'jour', 'année'])
      const ans = r === 0.5 ? '−ln 2' : `ln ${fmt(r)}`
      return exact(`Une quantité vérifie y′ = ay. Chaque ${u}, elle est multipliée par ${fmt(r)}. Donne la valeur exacte de a.`, Math.log(r), ans, {
        explanation: `y(t + 1) = Ce^{a(t + 1)} = e^{a} × y(t), donc e^{a} = ${fmt(r)} et a = ${ans} ≈ ${fmt(Math.round(Math.log(r) * 1000) / 1000)}.`,
      })
    },
    // Toutes les primitives d'une fonction diffèrent d'une constante
    () => {
      const a = randNonZero(-5, 5), b = randInt(-9, 9), c = b + randNonZero(-6, 6), x1 = randInt(1, 4)
      return numeric(`F et G sont deux primitives de la même fonction f sur ℝ, avec F(0) = ${fmt(b)}, G(0) = ${fmt(c)} et F(${x1}) = ${fmt(a)}. Calcule G(${x1}).`, a + c - b, {
        explanation: `Deux primitives d'une même fonction diffèrent d'une constante : G = F + k avec k = G(0) − F(0) = ${fmt(c - b)}. Donc G(${x1}) = ${fmt(a)} + ${par(c - b)} = ${fmt(a + c - b)}.`,
      })
    },
  ],
  [
    // Demi-vie de l'écart à l'équilibre
    () => {
      const a = pick([0.1, 0.2, 0.5, 0.05, 0.25]), b = randInt(2, 9) * 10
      return exact(`Une quantité vérifie y′ = −${fmt(a)}y + ${fmt(a * b)}. Au bout de combien de temps l'écart entre y et sa valeur d'équilibre est-il divisé par 2 ? (Le résultat ne dépend pas de y(0).)`, Math.log(2) / a, `{ln 2/${fmt(a)}}`, {
        explanation: `Équilibre : ${b}. y(t) − ${b} = (y(0) − ${b})e^{−${fmt(a)}t}. L'écart est divisé par 2 quand e^{−${fmt(a)}t} = {1/2}, soit t = {ln 2/${fmt(a)}} ≈ ${fmt(r2(Math.log(2) / a))}.`,
      })
    },
    // Primitive de c·x e^{ax}
    () => {
      const a = pick([1, 2, -1, -2, 3, 4]), c = randInt(1, 3)
      const sg = (v: number) => (v < 0 ? '−' : '+')
      return pair(`On cherche une primitive de f(x) = ${coefP(c)}xe^{${kx(a)}} de la forme F(x) = (px + q)e^{${kx(a)}}. Donne le couple (p ; q).`, c / a, -c / (a * a), {
        explanation: `F′(x) = pe^{${kx(a)}} ${sg(a)} ${coefP(Math.abs(a))}(px + q)e^{${kx(a)}} = (${coefP(a)}px + p ${sg(a)} ${coefP(Math.abs(a))}q)e^{${kx(a)}}. Identification : ${coefP(a)}p = ${c} et p ${sg(a)} ${coefP(Math.abs(a))}q = 0, donc p = ${fracText(c, a)} et q = ${fracText(-c, a * a)}.`,
      })
    },
    // Valeur d'une solution de y′ = y + x
    () => {
      const c = randInt(-3, 4)
      // y = Ce^x − x − 1 ; y(0) = C − 1 = c ⇒ C = c + 1
      const C = c + 1
      const ans = C === 0 ? '−2' : `${coefP(C)}e − 2`
      return exact(`La fonction f vérifie f′ = f + x et f(0) = ${fmt(c)}. Donne la valeur exacte de f(1). (Cherche une solution particulière affine.)`, C * Math.E - 2, ans, {
        explanation: `y = −x − 1 est solution particulière ((−x − 1)′ = −1 = (−x − 1) + x). Donc f(x) = Ce^{x} − x − 1 avec f(0) = C − 1 = ${fmt(c)} : C = ${fmt(C)}, et f(1) = ${C === 0 ? '−2' : `${coefP(C)}e − 2`}.`,
      })
    },
  ],
  [
    // Logistique par changement de fonction
    () => {
      const m = randInt(1, 3), k = pick([2, 3, 4, 9])
      const ans = fracText(k, k + m)
      return numeric(`On étudie y′ = y(1 − y) avec y(0) = {1/${1 + m}}. On admet que y ne s'annule pas et on pose z = {1/y}. Montre que z′ = 1 − z, puis calcule y(ln ${k}).`, k / (k + m), {
        answer: ans,
        explanation: `z′ = −{y′/y^2} = −{1 − y/y} = 1 − z. Donc z = 1 + Ce^{−x} avec z(0) = ${1 + m} : C = ${m}, et y = 1 ÷ (1 + ${coefP(m)}e^{−x}). y(ln ${k}) = 1 ÷ (1 + {${m}/${k}}) = ${ans}.`,
      })
    },
    // Équation avec second membre
    () => retry(() => {
      const a = randInt(1, 4), y0 = randInt(-2, 3), C = y0 + a
      if (C === 0) return null
      // f′ = −f + a x : y = a(x − 1) particulière ; f = Ce^{−x} + a(x − 1), C = y0 + a ; f(1) = C/e
      const ans = C < 0 ? `−{${-C}/e}` : `{${C}/e}`
      const yp = a === 1 ? 'x − 1' : `${a}(x − 1)`
      return exact(`La fonction f vérifie f′ = −f + ${coefP(a)}x et f(0) = ${fmt(y0)}. Donne la valeur exacte de f(1). (Cherche une solution particulière affine.)`, C / Math.E, ans, {
        explanation: `y = ${yp} est solution particulière : sa dérivée ${a} est bien égale à −(${yp}) + ${coefP(a)}x. f(x) = Ce^{−x} + ${yp} avec f(0) = C − ${a} = ${fmt(y0)} : C = ${fmt(C)}. f(1) = ${fmt(C)}e^{−1} = ${ans}.`,
      })
    }),
    // Saumons et pêche
    () => {
      const [a, h, P0] = pick([[0.1, 200, 1000], [0.1, 300, 2000], [0.2, 400, 1500], [0.2, 500, 2000], [0.1, 150, 1000], [0.2, 300, 1000], [0.1, 250, 2000]] as [number, number, number][])
      const eq = h / a
      const t = Math.log(h / (h - a * P0)) / a
      const who = pick(['saumons', 'truites', 'carpes', 'brochets'])
      return rounded(`Une population de ${who} vérifie P′ = ${fmt(a)}P − ${h} (t en années ; le terme −${h} représente la pêche annuelle), avec P(0) = ${P0}. L'équilibre est-il au-dessus ou au-dessous de ${P0} ? Au bout de combien d'années la population s'éteint-elle ? Arrondis au centième.`, t, 2, {
        explanation: `Équilibre : P = {${h}/${fmt(a)}} = ${fmt(eq)} > ${P0}. P(t) = ${fmt(eq)} + (${P0} − ${fmt(eq)})e^{${fmt(a)}t} décroît ; P(t) = 0 ⇔ e^{${fmt(a)}t} = {${fmt(eq)}/${fmt(eq - P0)}} ⇔ t = {ln(${fmt(eq / (eq - P0))})/${fmt(a)}} ≈ ${fmt(r2(t))} ans.`,
      })
    },
  ],
]

// ═══════════════════════════════════════════════════════════════════════
// Problèmes de l'hôtel de ville
// ═══════════════════════════════════════════════════════════════════════

const age: Ladder = [
  [
    // Le lingot de la forge
    () => {
      const T0 = randInt(7, 9) * 100, Ta = 20, k = pick([0.05, 0.1]), t = pick([10, 15, 20, 30])
      const v = Ta + (T0 - Ta) * Math.exp(-k * t)
      const g = graph({ xMin: 0, xMax: 60, yMin: 0, yMax: T0 + 50, step: 10, labelStep: 20, ystep: 100, ylabelStep: 200 })
      plotC(g, (x) => Ta + (T0 - Ta) * Math.exp(-k * x), { a: 0, b: 60 })
      hline(g, Ta, 0, 60, { color: BLUE })
      return T('Le lingot de la forge', rounded(`${pick(['L’apprenti forgeron', 'La forgeronne', 'Le maître forgeron', `${prenom()}, à la forge,`])} sort un lingot à ${T0} °C. La température T (en °C) vérifie T′ = −${fmt(k)}(T − ${Ta}) (t en minutes), l'air de la forge étant à ${Ta} °C. Quelle est la température du lingot au bout de ${t} minutes ? Arrondis à l'unité.`, v, 0, {
        explanation: `T(t) = ${Ta} + ${T0 - Ta}e^{−${fmt(k)}t}, donc T(${t}) = ${Ta} + ${T0 - Ta}e^{−${fmt(k * t)}} ≈ ${Math.round(v)} °C.`, tol: 1,
      }), g.figure)
    },
    // La levure du boulanger
    () => {
      const a = pick([0.2, 0.25, 0.4, 0.5]), V0 = pick([100, 200, 250])
      const t = Math.log(2) / a
      const g = graph({ xMin: 0, xMax: 8, yMin: 0, yMax: V0 * Math.exp(8 * a) * 1.05, step: 1, labelStep: 2, ystep: niceStep(V0 * Math.exp(8 * a), 5), ylabelStep: niceStep(V0 * Math.exp(8 * a), 5) })
      plotC(g, (x) => V0 * Math.exp(a * x), { a: 0, b: 8 })
      hline(g, 2 * V0, 0, 8)
      return T('La pâte qui lève', rounded(`Le volume V (en cm³) d'une pâte à pain vérifie V′ = ${fmt(a)}V (t en heures) et V(0) = ${V0}. Au bout de combien d'heures la pâte a-t-elle doublé de volume ? Arrondis au centième.`, t, 2, {
        explanation: `V(t) = ${V0}e^{${fmt(a)}t} = ${2 * V0} ⇔ e^{${fmt(a)}t} = 2 ⇔ t = {ln 2/${fmt(a)}} ≈ ${fmt(r2(t))} h.`,
      }), g.figure)
    },
    // Le chariot : primitive de la vitesse
    () => {
      const a = randInt(1, 4), b = randInt(1, 6), T_ = randInt(3, 8)
      const d = (a * T_ * T_) / 2 + b * T_
      return T('La descente du chariot', numeric(`La vitesse d'un chariot (en m/s) est v(t) = ${poly([a, 't'], [b, ''])} pour t ≥ 0. Sa position x(t) est une primitive de v, avec x(0) = 0. Quelle distance a-t-il parcourue au bout de ${T_} s ?`, d, {
        explanation: `x(t) = ${a % 2 === 0 ? coefP(a / 2) : `{${a}/2}`}t² + ${b}t (x(0) = 0). x(${T_}) = ${fmt((a * T_ * T_) / 2)} + ${b * T_} = ${fmt(d)} m.`,
      }))
    },
  ],
  [
    // Le condensateur du flash
    () => {
      const E = pick([6, 9, 12]), R = pick([2, 5, 10]), C = pick([0.1, 0.2, 0.5]), p = pick([90, 95, 99])
      const tau = R * C, t = tau * Math.log(100 / (100 - p))
      const g = graph({ xMin: 0, xMax: Math.ceil(5 * tau), yMin: 0, yMax: E + 1, step: niceStep(5 * tau, 6), labelStep: 2 * niceStep(5 * tau, 6), ystep: 1, ylabelStep: E > 6 ? 3 : 2 })
      plotC(g, (x) => E * (1 - Math.exp(-x / tau)))
      hline(g, E, 0, Math.ceil(5 * tau), { color: BLUE })
      return T('Le flash de l’appareil photo', rounded(`Dans un flash, un condensateur se charge : la tension u (en V) vérifie ${fmt(tau)}u′ + u = ${E} (t en s), avec u(0) = 0. Le flash est prêt quand u atteint ${p} % de ${E} V. Combien de temps faut-il attendre ? Arrondis au centième.`, t, 2, {
        explanation: `u(t) = ${E}(1 − e^{−t/${fmt(tau)}}). ${E}(1 − e^{−t/${fmt(tau)}}) = ${fmt((E * p) / 100)} ⇔ e^{−t/${fmt(tau)}} = ${fmt((100 - p) / 100)} ⇔ t = ${fmt(tau)} ln ${fmt(100 / (100 - p))} ≈ ${fmt(r2(t))} s.`,
      }), g.figure)
    },
    // Le parachutiste
    () => {
      const k = pick([0.1, 0.2, 0.25, 0.4, 0.5]), g0 = 10, p = pick([80, 90, 95, 99])
      const vl = g0 / k, t = Math.log(100 / (100 - p)) / k
      const g = graph({ xMin: 0, xMax: Math.ceil(4 / k), yMin: 0, yMax: vl * 1.2, step: niceStep(4 / k, 6), labelStep: 2 * niceStep(4 / k, 6), ystep: niceStep(vl, 4), ylabelStep: niceStep(vl, 4) })
      plotC(g, (x) => vl * (1 - Math.exp(-k * x)))
      hline(g, vl, 0, Math.ceil(4 / k), { color: BLUE })
      return T('La chute du parachutiste', rounded(`Un parachutiste en chute (avant ouverture) a une vitesse v (en m/s) qui vérifie v′ = ${g0} − ${fmt(k)}v, avec v(0) = 0. Sa vitesse tend vers une vitesse limite (en bleu). Au bout de combien de secondes atteint-il ${p} % de cette vitesse limite ? Arrondis au centième.`, t, 2, {
        explanation: `Vitesse limite : {${g0}/${fmt(k)}} = ${fmt(vl)} m/s. v(t) = ${fmt(vl)}(1 − e^{−${fmt(k)}t}) ; 1 − e^{−${fmt(k)}t} = ${fmt(p / 100)} ⇔ t = {ln ${fmt(100 / (100 - p))}/${fmt(k)}} ≈ ${fmt(r2(t))} s.`,
      }), g.figure)
    },
    // La saumure
    () => {
      const V = pick([100, 200, 500]), r = pick([5, 10, 20]), c = pick([20, 30, 50])
      const k = r / V, Qinf = c * V, t = pick([10, 20, 30])
      const Q = Qinf * (1 - Math.exp(-k * t))
      return T('La cuve de saumure', rounded(`Une cuve contient ${V} L d'eau pure. On y verse ${r} L/min d'eau salée à ${c} g/L, et ${r} L/min du mélange s'écoule. La masse de sel Q (en g) vérifie Q′ = ${r * c} − {${r}/${V}}Q, avec Q(0) = 0. Quelle masse de sel contient la cuve au bout de ${t} min ? Arrondis à l'unité.`, Q, 0, {
        explanation: `Solution constante : ${r * c} × {${V}/${r}} = ${Qinf}. Q(t) = ${Qinf}(1 − e^{−${fmt(k)}t}), donc Q(${t}) = ${Qinf}(1 − e^{−${fmt(k * t)}}) ≈ ${Math.round(Q)} g.`, tol: 1,
      }))
    },
  ],
  [
    // Le café de Newton à deux mesures
    () => {
      const Ta = 20, T0 = 90, T1 = pick([60, 70, 75]), t1 = pick([5, 10]), s = pick([40, 45, 50])
      const k = Math.log((T0 - Ta) / (T1 - Ta)) / t1
      const t = Math.log((T0 - Ta) / (s - Ta)) / k
      const g = graph({ xMin: 0, xMax: 60, yMin: 0, yMax: 100, step: 10, labelStep: 20, ystep: 10, ylabelStep: 20 })
      plotC(g, (x) => Ta + (T0 - Ta) * Math.exp(-k * x), { a: 0, b: 60 })
      g.point('A', t1, T1, `(${t1} ; ${T1})`)
      hline(g, s, 0, 60)
      return T('Le café de l’inspecteur', rounded(`Un café servi à ${T0} °C refroidit dans une pièce à ${Ta} °C selon la loi de Newton : T′ = −k(T − ${Ta}). Au bout de ${t1} minutes, il est à ${T1} °C. L'inspecteur le boit quand il descend à ${s} °C : au bout de combien de minutes ? Arrondis au dixième.`, t, 1, {
        explanation: `T(t) = ${Ta} + ${T0 - Ta}e^{−kt}. T(${t1}) = ${T1} ⇔ e^{−${t1}k} = {${T1 - Ta}/${T0 - Ta}} ⇔ k = {ln(${T0 - Ta}/${T1 - Ta})/${t1}} ≈ ${fmt(Math.round(k * 10000) / 10000)}. Puis ${T0 - Ta}e^{−kt} = ${s - Ta} ⇔ t = {ln(${T0 - Ta}/${s - Ta})/k} ≈ ${fmt(r1(t))} min.`,
      }), g.figure)
    },
    // Le remède en perfusion
    () => {
      const d = pick([4, 6, 8]), k = pick([0.2, 0.25, 0.4]), seuil = pick([0.5, 0.75])
      const Qinf = d / k, t = Math.log(1 / (1 - seuil)) / k
      const g = graph({ xMin: 0, xMax: Math.ceil(5 / k), yMin: 0, yMax: Qinf * 1.2, step: niceStep(5 / k, 6), labelStep: 2 * niceStep(5 / k, 6), ystep: niceStep(Qinf, 4), ylabelStep: niceStep(Qinf, 4) })
      plotC(g, (x) => Qinf * (1 - Math.exp(-k * x)))
      hline(g, Qinf, 0, Math.ceil(5 / k), { color: BLUE })
      hline(g, seuil * Qinf, 0, Math.ceil(5 / k))
      return T('Le remède en perfusion', rounded(`La guérisseuse administre un remède goutte à goutte : ${d} mg par heure, tandis que le corps en élimine ${fmt(k * 100)} % par heure. La quantité Q (en mg) vérifie Q′ = ${d} − ${fmt(k)}Q, Q(0) = 0. Le remède agit dès que Q dépasse ${fmt(seuil * 100)} % de la quantité d'équilibre. Au bout de combien d'heures ? Arrondis au centième.`, t, 2, {
        explanation: `Équilibre : {${d}/${fmt(k)}} = ${fmt(Qinf)} mg. Q(t) = ${fmt(Qinf)}(1 − e^{−${fmt(k)}t}) ≥ ${fmt(seuil * Qinf)} ⇔ e^{−${fmt(k)}t} ≤ ${fmt(1 - seuil)} ⇔ t ≥ {ln ${fmt(1 / (1 - seuil))}/${fmt(k)}} ≈ ${fmt(r2(t))} h.`,
      }), g.figure)
    },
    // La rivière polluée
    () => {
      const k = pick([0.1, 0.2]), p = pick([2, 3, 4]), c0 = pick([50, 80, 100])
      // C′ = −k C + p (rejet constant) ; C(0) = c0 ; équilibre p/k
      const eq = p / k
      const t = Math.log((c0 - eq) / ((c0 - eq) / 2)) / k
      return T('La rivière polluée', rounded(`La concentration C (en mg/L) d'un polluant dans un étang vérifie C′ = −${fmt(k)}C + ${p} (t en jours) : l'étang s'épure, mais un moulin rejette encore un peu de polluant. Au départ, C(0) = ${c0}. Au bout de combien de jours l'excès de pollution (écart entre C et la valeur d'équilibre) est-il divisé par 2 ? Arrondis au centième.`, t, 2, {
        explanation: `Équilibre : {${p}/${fmt(k)}} = ${fmt(eq)}. C(t) − ${fmt(eq)} = ${fmt(c0 - eq)}e^{−${fmt(k)}t}. L'écart est divisé par 2 quand e^{−${fmt(k)}t} = {1/2} : t = {ln 2/${fmt(k)}} ≈ ${fmt(r2(t))} jours.`,
      }))
    },
  ],
]

export const CONTENT = polishContent({ tiers, upgrades, age })
