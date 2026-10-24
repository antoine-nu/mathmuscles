// Fonction logarithme népérien et fonctions trigonométriques (Terminale, spécialité) — public adulte.
// Boîte à outils (expressions avec ln, cos, sin ; valeurs exactes) : voir T-derivee.ts.
import {
  choice, fmt, fracText, fresh, gcd, interval, numeric, pair, par, pick, poly, randInt, randNonZero,
  type Exercise, type Ladder, type Maker, type Tiers,
} from '../utils'
import { type Figure } from '../figure'
import { prenom } from '../contexts'
import {
  BLUE, KEYS_LN, KEYS_TRIG, RED, T, coefP, exact, exactSet, fexpr, hline, limitAns, lin, niceStep, oneOf,
  graph, plotC, polishContent, retry, rounded, vline,
} from './T-derivee'

// ── Aides locales ────────────────────────────────────────────────────────
const DOM_POS: [number, number] = [0.2, 4]
const r2 = (v: number) => Math.round(v * 100) / 100
const KEYS_SET = [';', 'π', '/', '−']

/** k·π/d réduit et lisible : 0, π, −π, 2π, {π/3}, −{5π/6}. */
function piText(k: number, d: number): string {
  if (k === 0) return '0'
  const g = gcd(Math.abs(k), d), n = k / g, m = d / g
  const sign = n < 0 ? '−' : '', a = Math.abs(n)
  if (m === 1) return `${sign}${a === 1 ? '' : a}π`
  return `${sign}{${a === 1 ? '' : a}π/${m}}`
}
/** Mesure d'angle en douzièmes de π (k → kπ/12). */
const tw = (k: number) => piText(k, 12)
const rad = (k: number) => (k * Math.PI) / 12

const TRIG_TXT: [number, string][] = [[0, '0'], [0.5, '{1/2}'], [Math.SQRT2 / 2, '{√2/2}'], [Math.sqrt(3) / 2, '{√3/2}'], [1, '1']]
/** Valeur remarquable de cos ou sin écrite exactement. */
function trigVal(v: number): string {
  const a = Math.abs(v)
  const t = TRIG_TXT.find(([w]) => Math.abs(w - a) < 1e-9)
  if (!t) throw new Error(`valeur non remarquable ${v}`)
  return v < -1e-9 ? `−${t[1]}` : t[1]
}
/** Solutions (en douzièmes de π) de fn(x) = v pour k de k0 à k1. */
const solveK = (fn: (x: number) => number, v: number, k0: number, k1: number) => {
  const out: number[] = []
  for (let k = k0; k <= k1; k++) if (Math.abs(fn(rad(k)) - v) < 1e-9) out.push(k)
  return out
}

/** Cercle trigonométrique avec le point M d'angle kπ/12, graduations tous les `stepK` douzièmes. */
function trigCircle(k: number, o: { stepK?: number; proj?: boolean; name?: string } = {}): Figure {
  const cx = 160, cy = 110, R = 80
  const P = (t: number) => ({ x: cx + R * Math.cos(t), y: cy - R * Math.sin(t) })
  const th = rad(k)
  const points: Figure['points'] = {
    O: { x: cx, y: cy, label: 'O', pos: 'sw' },
    I: { ...P(0), label: 'I', pos: 'se' },
    J: { ...P(Math.PI / 2), label: 'J', pos: 'nw' },
    M: { ...P(th), label: o.name ?? 'M' },
    X1: { x: cx - R - 28, y: cy, hidden: true, label: '' }, X2: { x: cx + R + 28, y: cy, hidden: true, label: '' },
    Y1: { x: cx, y: cy + R + 14, hidden: true, label: '' }, Y2: { x: cx, y: cy - R - 14, hidden: true, label: '' },
    Mx: { x: P(th).x, y: cy, hidden: true, label: '' }, My: { x: cx, y: P(th).y, hidden: true, label: '' },
  }
  const step = o.stepK ?? 2
  for (let j = 0; j < 24; j += step) {
    if (j === 0 || j === 6 || ((j - k) % 24 + 24) % 24 === 0) continue
    points[`t${j}`] = { ...P(rad(j)), label: '' }
  }
  const segments: Figure['segments'] = [{ a: 'X1', b: 'X2' }, { a: 'Y1', b: 'Y2' }, { a: 'O', b: 'M', color: RED }]
  if (o.proj) segments.push({ a: 'M', b: 'Mx', dashed: true }, { a: 'M', b: 'My', dashed: true })
  return {
    points, segments,
    circles: [{ c: 'O', r: R }],
    angles: k % 24 === 0 ? [] : [{ vertex: 'O', a: 'I', b: 'M', color: RED, radius: 20 }],
    caption: `Graduations tous les ${step === 2 ? 'π/6' : 'π/4'}.`,
  }
}

// ═══════════════════════════════════════════════════════════════════════
// Entraînement
// ═══════════════════════════════════════════════════════════════════════

// ── Palier 1 ─────────────────────────────────────────────────────────────

// Propriétés algébriques de ln
const proprietesLn: Maker = fresh(() => oneOf(
  () => {
    const a = randInt(2, 9), b = randInt(2, 9)
    return numeric(`Complète : ln ${a} + ln ${b} = ln(…). Quel nombre faut-il écrire ?`, a * b, {
      explanation: `ln a + ln b = ln(ab) : ln ${a} + ln ${b} = ln(${a} × ${b}) = ln ${a * b}.`,
    })
  },
  () => {
    const b = randInt(2, 9), q = randInt(2, 8), a = b * q
    return numeric(`Écris ln ${a} − ln ${b} sous la forme ln c. Que vaut c ?`, q, {
      explanation: `ln a − ln b = ln({a/b}) : ln ${a} − ln ${b} = ln({${a}/${b}}) = ln ${q}.`,
    })
  },
  () => {
    const a = randInt(2, 5), n = randInt(2, 4)
    return numeric(`On a ${n} ln ${a} = ln N. Que vaut N ?`, a ** n, {
      explanation: `n ln a = ln(a^n) : ${n} ln ${a} = ln(${a}^${n}) = ln ${a ** n}.`,
    })
  },
  () => {
    const a = pick([2, 3, 5]), n = randInt(2, a === 2 ? 7 : 4)
    return numeric(`Écris ln ${a ** n} sous la forme k ln ${a}. Que vaut k ?`, n, {
      explanation: `${a ** n} = ${a}^${n}, donc ln ${a ** n} = ln(${a}^${n}) = ${n} ln ${a}.`,
    })
  },
  () => {
    const a = pick([2, 3]), n = randInt(2, a === 2 ? 5 : 3)
    return numeric(`Écris ln({1/${a ** n}}) sous la forme k ln ${a}. Que vaut k ?`, -n, {
      explanation: `ln({1/b}) = −ln b, et ${a ** n} = ${a}^${n} : ln({1/${a ** n}}) = −ln(${a}^${n}) = −${n} ln ${a}.`,
    })
  },
))

// Valeurs particulières : ln 1, ln e, ln(e^k), e^{ln a}
const valeursLn: Maker = fresh(() => oneOf(
  () => {
    const a = randInt(2, 7), b = randInt(2, 7)
    return numeric(`Calcule ln(e^${a} × e^${b}).`, a + b, { explanation: `e^${a} × e^${b} = e^{${a + b}} et ln(e^{n}) = n : le résultat est ${a + b}.` })
  },
  () => {
    const a = randInt(5, 12), b = randInt(2, a - 2)
    return numeric(`Calcule ln({e^${a}/e^${b}}).`, a - b, { explanation: `{e^${a}/e^${b}} = e^{${a - b}}, donc ln({e^${a}/e^${b}}) = ${a - b}.` })
  },
  () => {
    const a = randInt(2, 9)
    return numeric(`Calcule e^{2 ln ${a}}.`, a * a, { explanation: `2 ln ${a} = ln(${a}²) = ln ${a * a}, et e^{ln y} = y : e^{2 ln ${a}} = ${a * a}.` })
  },
  () => {
    const a = randInt(2, 9), b = randInt(2, 9)
    return numeric(`Calcule e^{ln ${a} + ln ${b}}.`, a * b, { explanation: `ln ${a} + ln ${b} = ln ${a * b}, et e^{ln y} = y : le résultat est ${a * b}.` })
  },
  () => {
    const k = randInt(2, 7)
    return numeric(`Calcule ln({1/e^${k}}).`, -k, { explanation: `ln({1/y}) = −ln y : ln({1/e^${k}}) = −ln(e^${k}) = −${k}.` })
  },
  () => {
    const a = randInt(2, 9)
    return numeric(`Calcule e^{−ln ${a}}.`, 1 / a, { answer: `1/${a}`, explanation: `e^{−ln ${a}} = 1 ÷ e^{ln ${a}} = {1/${a}}.` })
  },
))

// Valeurs remarquables de cos et sin
const valeursTrig: Maker = () => {
  const ks = [2, 3, 4, 6, 8, 9, 10, 12, 2, 3, 4]
  const k = pick(ks), useCos = Math.random() < 0.5
  const v = useCos ? Math.cos(rad(k)) : Math.sin(rad(k))
  const fn = useCos ? 'cos' : 'sin'
  const txt = trigVal(v)
  const expl = `Sur le cercle trigonométrique, le point associé à ${tw(k)} a pour coordonnées (cos ; sin) = (${trigVal(Math.cos(rad(k)))} ; ${trigVal(Math.sin(rad(k)))}). Donc ${fn}(${tw(k)}) = ${txt}.`
  return oneOf(
    () => exact(`Donne la valeur exacte de ${fn}(${tw(k)}).`, v, txt, { explanation: expl, approx: false, keys: ['√', '/', '−'] }),
    () => exact(`Que vaut ${fn}(${tw(k)}) ? (valeur exacte, par exemple √3/2)`, v, txt, { explanation: expl, approx: false, keys: ['√', '/', '−'] }),
    () => exact(`Le point M du cercle trigonométrique est associé au réel ${tw(k)}. Donne la valeur exacte de son ${useCos ? 'abscisse' : 'ordonnée'}.`, v, txt, {
      explanation: `${useCos ? 'L’abscisse' : 'L’ordonnée'} de M est ${fn}(${tw(k)}). ${expl}`, approx: false, keys: ['√', '/', '−'],
    }),
    () => withFig(exact(`Le point M du cercle trigonométrique ci-dessous est associé au réel ${tw(k)}. Donne la valeur exacte de ${fn}(${tw(k)}).`, v, txt, {
      explanation: expl, approx: false, keys: ['√', '/', '−'],
    }), trigCircle(k, { stepK: k % 3 === 0 && k % 2 !== 0 ? 3 : 2, proj: true })),
  )
}
const withFig = (ex: Exercise, figure: Figure): Exercise => ({ ...ex, figure })
/** A√3/2 simplifié : √3, 2√3, {3√3/2}. */
const r3 = (A: number) => (A % 2 === 0 ? `${A / 2 === 1 ? '' : A / 2}√3` : `{${A}√3/2}`)
/** a + b écrit proprement (termes nuls omis, « + − » évité). */
const sumTxt = (a: string, b: string) => (a === '0' ? b : b === '0' ? a : b.startsWith('−') ? `${a} − ${b.slice(1)}` : `${a} + ${b}`)
/** 2^a × 3^b écrit simplement : 2 × 3², 1. */
const f23 = (a: number, b: number) => [a ? (a === 1 ? '2' : `2^${a}`) : '', b ? (b === 1 ? '3' : `3^${b}`) : ''].filter(Boolean).join(' × ') || '1'
/** Grand entier avec espaces : 5 730. */
const big = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')

// Degrés et radians
const degresRadians: Maker = () => {
  const k = pick([1, 2, 3, 4, 6, 8, 9, 10, 12, 15, 16, 18, 20, 24])
  const deg = k * 15
  return oneOf(
    () => exact(`Convertis ${deg}° en radians (valeur exacte).`, rad(k), tw(k), {
      explanation: `180° correspondent à π rad : ${deg}° = ${deg} × {π/180} = ${tw(k)} rad.`, keys: ['π', '/'],
    }),
    () => numeric(`Convertis ${tw(k)} radians en degrés.`, deg, { explanation: `π rad = 180°, donc ${tw(k)} rad = ${tw(k)} × {180/π} = ${deg}°.` }),
    () => exact(`Un angle mesure ${deg}°. Quelle est sa mesure en radians ? (valeur exacte avec π)`, rad(k), tw(k), {
      explanation: `On multiplie par {π/180} : ${deg} × {π/180} = ${tw(k)}.`, keys: ['π', '/'],
    }),
    () => numeric(`Sur le cercle trigonométrique, un arc de longueur ${tw(k)} intercepte un angle au centre de combien de degrés ?`, deg, {
      explanation: `Sur un cercle de rayon 1, la longueur de l'arc est la mesure de l'angle en radians : ${tw(k)} rad = ${deg}°.`,
    }),
  )
}

// Dérivées de ln, cos, sin
const deriveesUsuelles: Maker = () => oneOf(
  () => {
    const a = randNonZero(-9, 9), b = randInt(-9, 9)
    const ans = `${a < 0 ? '−' : ''}{${Math.abs(a)}/x}${b ? ` ${b < 0 ? '−' : '+'} ${Math.abs(b)}` : ''}`
    return fexpr(`Dérive f(x) = ${coefP(a)}ln x${b ? ` ${b < 0 ? '−' : '+'} ${coefP(Math.abs(b))}x` : ''} sur ]0 ; +∞[.`, `${a}/x+${b}`, {
      answer: ans, dom: DOM_POS, keys: KEYS_LN,
      explanation: `(ln x)′ = {1/x} et (x)′ = 1 : f′(x) = ${ans}.`,
    })
  },
  () => {
    const a = randNonZero(-6, 6), b = randNonZero(-6, 6)
    const ans = `${coefP(a)}cos x ${b > 0 ? '−' : '+'} ${coefP(Math.abs(b))}sin x`
    return fexpr(`Dérive f(x) = ${coefP(a)}sin x ${b < 0 ? '−' : '+'} ${coefP(Math.abs(b))}cos x.`, `${a}cos(x)-${b}sin(x)`, {
      answer: ans, keys: KEYS_TRIG,
      explanation: `(sin x)′ = cos x et (cos x)′ = −sin x : f′(x) = ${ans}.`,
    })
  },
  () => {
    const a = randNonZero(-6, 6), n = randInt(2, 4)
    const ans = `${n}x${n - 1 > 1 ? `^${n - 1}` : ''} ${a < 0 ? '−' : '+'} {${Math.abs(a)}/x}`
    return fexpr(`Calcule g′(x) pour g(x) = x^${n} ${a < 0 ? '−' : '+'} ${coefP(Math.abs(a))}ln x, x > 0.`, `${n}x^${n - 1}+${a}/x`, {
      answer: ans, dom: DOM_POS, keys: KEYS_LN,
      explanation: `(x^${n})′ = ${n}x${n - 1 > 1 ? `^${n - 1}` : ''} et (ln x)′ = {1/x} : g′(x) = ${ans}.`,
    })
  },
  () => {
    const a = randNonZero(-6, 6), b = randNonZero(-6, 6)
    const ans = `${a > 0 ? '−' : ''}${coefP(Math.abs(a))}sin x ${b < 0 ? '−' : '+'} ${Math.abs(b)}`
    return fexpr(`Dérive h(x) = ${coefP(a)}cos x ${b < 0 ? '−' : '+'} ${coefP(Math.abs(b))}x.`, `${-a}sin(x)+${b}`, {
      answer: ans, keys: KEYS_TRIG,
      explanation: `(cos x)′ = −sin x : h′(x) = ${ans}.`,
    })
  },
)

// ── Palier 2 ─────────────────────────────────────────────────────────────

// Équations simples avec ln et exp
const equationsSimples: Maker = () => oneOf(
  () => {
    const a = randNonZero(-4, 5)
    return exact(`Résous ln x = ${fmt(a)}. Donne la valeur exacte de x.`, Math.exp(a), a === 1 ? 'e' : `e^{${fmt(a)}}`, {
      explanation: `ln x = ${fmt(a)} ⇔ x = ${a === 1 ? 'e' : `e^{${fmt(a)}}`} (la fonction exp est la réciproque de ln) ≈ ${fmt(r2(Math.exp(a)))}.`,
    })
  },
  () => {
    const a = randInt(2, 15)
    return exact(`Résous e^{x} = ${a}. Donne la valeur exacte de x.`, Math.log(a), `ln ${a}`, {
      explanation: `e^{x} = ${a} ⇔ x = ln ${a} ≈ ${fmt(r2(Math.log(a)))}.`,
    })
  },
  () => {
    const a = randNonZero(-5, 5), b = randInt(-9, 9)
    return numeric(`Résous ln(${lin(a, b)}) = 0.`, (1 - b) / a, {
      answer: fracText(1 - b, a),
      explanation: `ln y = 0 ⇔ y = 1 : ${lin(a, b)} = 1 ⇔ x = ${fracText(1 - b, a)} (et alors ${lin(a, b)} = 1 > 0).`,
    })
  },
  () => {
    const a = randInt(2, 9), b = randInt(2, 9)
    return numeric(`Résous ln x = ln ${a} + ln ${b}.`, a * b, { explanation: `ln ${a} + ln ${b} = ln ${a * b} et ln est strictement croissante : x = ${a * b}.` })
  },
  () => {
    const a = randInt(2, 9), k = pick([2, 3])
    return exact(`Résous e^{${k}x} = ${a}. Donne la valeur exacte de x.`, Math.log(a) / k, `{ln ${a}/${k}}`, {
      explanation: `e^{${k}x} = ${a} ⇔ ${k}x = ln ${a} ⇔ x = {ln ${a}/${k}} ≈ ${fmt(r2(Math.log(a) / k))}.`,
    })
  },
  () => {
    const c = randInt(2, 5), a = randInt(2, 7)
    return exact(`Résous ${c}e^{x} − ${c * a} = 0. Donne la valeur exacte de x.`, Math.log(a), `ln ${a}`, {
      explanation: `${c}e^{x} = ${c * a} ⇔ e^{x} = ${a} ⇔ x = ln ${a}.`,
    })
  },
)

// Décomposer avec ln 2 et ln 3
const decomposerLn: Maker = () => oneOf(
  () => retry(() => {
    const a = randInt(0, 4), b = randInt(0, 3)
    if (a + b < 2 || a === 0 || b === 0) return null
    const n = 2 ** a * 3 ** b
    return pair(`Écris ln ${n} sous la forme a ln 2 + b ln 3. Donne le couple (a ; b).`, a, b, {
      explanation: `${n} = ${f23(a, b)}, donc ln ${n} = ${a} ln 2 + ${b} ln 3.`,
    })
  }),
  () => retry(() => {
    const a = randInt(-3, 3), b = randInt(-2, 2)
    if (a >= 0 && b >= 0) return null
    if (a === 0 && b === 0) return null
    const num = 2 ** Math.max(a, 0) * 3 ** Math.max(b, 0), den = 2 ** Math.max(-a, 0) * 3 ** Math.max(-b, 0)
    if (num === 1 && den === 1) return null
    return pair(`Écris ln({${num}/${den}}) sous la forme a ln 2 + b ln 3. Donne le couple (a ; b).`, a, b, {
      explanation: `ln({${num}/${den}}) = ln ${num} − ln ${den}, avec ${num} = ${f23(Math.max(a, 0), Math.max(b, 0))} et ${den} = ${f23(Math.max(-a, 0), Math.max(-b, 0))}. D'où a = ${fmt(a)} et b = ${fmt(b)}.`,
    })
  }),
  () => {
    const n = pick([4, 8, 16, 32]), k = Math.log2(n), m = randInt(3, 9)
    return numeric(`Écris ln ${n * m} − ln ${m} sous la forme k ln 2. Que vaut k ?`, k, {
      explanation: `ln ${n * m} − ln ${m} = ln({${n * m}/${m}}) = ln ${n} = ln(2^${k}) = ${k} ln 2.`,
    })
  },
  () => {
    const k = randInt(1, 5)
    return numeric(`Écris ln(√{${2 ** (2 * k + 1)}}) sous la forme k ln 2. Que vaut k ? (fraction acceptée)`, (2 * k + 1) / 2, {
      answer: fracText(2 * k + 1, 2),
      explanation: `ln(√y) = {1/2} ln y et ${2 ** (2 * k + 1)} = 2^${2 * k + 1} : ln(√{${2 ** (2 * k + 1)}}) = {${2 * k + 1}/2} ln 2.`,
    })
  },
)

// Parité, périodicité, cos² + sin² = 1
const pariteTrig: Maker = () => {
  const [c, s] = pick([[0.6, 0.8], [0.8, 0.6], [0.28, 0.96], [0.96, 0.28]])
  const cv = pick([c, -c])
  return oneOf(
    () => numeric(`On sait que cos a = ${fmt(cv)}. Que vaut cos(−a) + cos(a + 2π) ?`, 2 * cv, {
      explanation: `cos est paire (cos(−a) = cos a) et 2π-périodique (cos(a + 2π) = cos a) : le total vaut 2 × ${par(cv)} = ${fmt(2 * cv)}.`,
    }),
    () => numeric(`On sait que sin a = ${fmt(cv)}. Que vaut sin(−a) ?`, -cv, { explanation: `La fonction sinus est impaire : sin(−a) = −sin a = ${fmt(-cv)}.` }),
    () => numeric(`On sait que cos a = ${fmt(cv)}. Que vaut cos(a + 4π) − cos(π − a) ?`, 2 * cv, {
      explanation: `cos(a + 4π) = cos a (période 2π) et cos(π − a) = −cos a : ${fmt(cv)} − (${fmt(-cv)}) = ${fmt(2 * cv)}.`,
    }),
    () => numeric(`On sait que cos a = ${fmt(c)} et que a ∈ [0 ; π]. Que vaut sin a ?`, s, {
      explanation: `cos²a + sin²a = 1, donc sin²a = 1 − ${fmt(c * c)} = ${fmt(s * s)} ; comme a ∈ [0 ; π], sin a ≥ 0 : sin a = ${fmt(s)}.`,
    }),
    () => numeric(`On sait que sin a = ${fmt(s)} et que a ∈ [{π/2} ; π]. Que vaut cos a ?`, -c, {
      explanation: `cos²a = 1 − sin²a = 1 − ${fmt(s * s)} = ${fmt(c * c)} ; sur [{π/2} ; π], cos a ≤ 0 : cos a = ${fmt(-c)}.`,
    }),
  )
}

// Dérivée de ln u
const deriveeLnU: Maker = () => oneOf(
  () => {
    const a = randInt(1, 6), b = randInt(-6, 6)
    const L = lin(a, b), x0 = -b / a
    return fexpr(`Dérive f(x) = ln(${L}) sur ]${fracText(-b, a)} ; +∞[.`, `${a}/(${L})`, {
      answer: `{${a}/${L}}`, dom: [x0 + 0.2, x0 + 4], keys: KEYS_LN,
      explanation: `(ln u)′ = {u′/u} avec u(x) = ${L} : f′(x) = {${a}/${L}}.`,
    })
  },
  () => {
    const c = randInt(1, 9)
    return fexpr(`Dérive la fonction f définie sur ℝ par f(x) = ln(x² + ${c}).`, `2x/(x^2+${c})`, {
      answer: `{2x/x² + ${c}}`, keys: KEYS_LN,
      explanation: `(ln u)′ = {u′/u} avec u(x) = x² + ${c} > 0 : f′(x) = {2x/x² + ${c}}.`,
    })
  },
  () => {
    const a = randNonZero(-5, 5)
    const ans = `${coefP(a)}ln x + ${fmt(a)}`.replace('+ −', '− ')
    return fexpr(`Dérive g(x) = ${coefP(a)}x ln x sur ]0 ; +∞[.`, `${a}ln(x)+${a}`, {
      answer: ans, dom: DOM_POS, keys: KEYS_LN,
      explanation: `Produit : g′(x) = ${coefP(a)}(1 × ln x + x × {1/x}) = ${ans}.`,
    })
  },
  () => fexpr(`Dérive h(x) = {ln x/x} sur ]0 ; +∞[.`, `(1-ln(x))/x^2`, {
    answer: `{1 − ln x/x²}`, dom: DOM_POS, keys: KEYS_LN,
    explanation: `Quotient : h′(x) = {(1/x) × x − ln x × 1/x²} = {1 − ln x/x²}.`,
  }),
  () => {
    const k = randInt(2, 4)
    return fexpr(`Dérive f(x) = (ln x)^${k} sur ]0 ; +∞[.`, `${k}*ln(x)^${k - 1}/x`, {
      answer: `{${k}(ln x)${k - 1 > 1 ? `^${k - 1}` : ''}/x}`, dom: DOM_POS, keys: KEYS_LN,
      explanation: `(u^n)′ = nu′u^{n−1} avec u = ln x, u′ = {1/x} : f′(x) = {${k}(ln x)${k - 1 > 1 ? `^${k - 1}` : ''}/x}.`,
    })
  },
)

// Lecture sur le cercle trigonométrique
const lectureCercle: Maker = () => retry(() => {
  const k = pick([-10, -9, -8, -6, -4, -3, -2, 2, 3, 4, 6, 8, 9, 10, 12])
  const step = k % 2 !== 0 || (k % 3 === 0 && k % 6 !== 0) ? 3 : 2
  if (k % step !== 0) return null
  const fig = trigCircle(k, { stepK: step })
  const deg = Math.abs(k) * 15
  return oneOf(
    () => withFig(exact(`Le point M du cercle trigonométrique ci-dessous est associé à un réel θ de ]−π ; π]. Donne θ (valeur exacte).`, rad(k), tw(k), {
      explanation: `L'arc de I à M mesure ${deg}° soit ${tw(Math.abs(k))}, parcouru dans le sens ${k > 0 ? 'direct (trigonométrique)' : 'indirect (horaire)'} : θ = ${tw(k)}.`, keys: ['π', '/', '−'],
    }), fig),
    () => withFig(exact(`Lis sur la figure la mesure principale (dans ]−π ; π]) de l'angle orienté (OI⃗, OM⃗).`, rad(k), tw(k), {
      explanation: `On part de I et on tourne de ${deg}° ${k > 0 ? 'dans le sens direct' : 'dans le sens horaire'} pour atteindre M : ${tw(k)}.`, keys: ['π', '/', '−'],
    }), fig),
    () => (k > 0 ? null : withFig(exact(`Le point M du cercle trigonométrique ci-dessous est associé à un réel θ de [0 ; 2π[. Donne θ (valeur exacte).`, rad(k + 24), tw(k + 24), {
      explanation: `Dans le sens horaire, M est à ${tw(-k)} de I ; dans [0 ; 2π[, on prend θ = 2π − ${tw(-k)} = ${tw(k + 24)}.`, keys: ['π', '/', '−'],
    }), fig)),
    () => withFig(exact(`Le point M ci-dessous est associé au réel ${tw(k)}. Donne la valeur exacte de cos(${tw(k)}) + sin(${tw(k)}).`, Math.cos(rad(k)) + Math.sin(rad(k)), sumTxt(trigVal(Math.cos(rad(k))), trigVal(Math.sin(rad(k)))), {
      explanation: `cos(${tw(k)}) = ${trigVal(Math.cos(rad(k)))} et sin(${tw(k)}) = ${trigVal(Math.sin(rad(k)))} (coordonnées de M).`, approx: true,
    }), fig),
  )
})

// ── Palier 3 ─────────────────────────────────────────────────────────────

/** Plus petit entier n tel que cond(n). */
const firstN = (cond: (n: number) => boolean) => {
  let n = 0
  while (!cond(n) && n < 100000) n++
  return n
}

// Seuils avec ln
const seuils: Maker = fresh(() => oneOf(
  () => {
    const t = pick([2, 3, 4, 5, 6, 8]), k = pick([2, 3])
    const q = 1 + t / 100, n = firstN((m) => q ** m >= k)
    return numeric(`Un capital placé à ${t} % par an (intérêts composés) est multiplié par ${fmt(q)} chaque année. Au bout de combien d'années (entier minimal) aura-t-il au moins été multiplié par ${k} ?`, n, {
      explanation: `${fmt(q)}^n ≥ ${k} ⇔ n ln ${fmt(q)} ≥ ln ${k} ⇔ n ≥ {ln ${k}/ln ${fmt(q)}} ≈ ${fmt(r2(Math.log(k) / Math.log(q)))} (ln ${fmt(q)} > 0). Donc n = ${n}.`,
    })
  },
  () => {
    const p = pick([10, 15, 20, 25, 30]), k = pick([10, 20, 100])
    const q = 1 - p / 100, n = firstN((m) => q ** m < 1 / k)
    return numeric(`Chaque plaque de verre teinté absorbe ${p} % de la lumière qui la traverse. Combien faut-il empiler de plaques, au minimum, pour que moins de {1/${k}} de la lumière passe ?`, n, {
      explanation: `${fmt(q)}^n < {1/${k}} ⇔ n ln ${fmt(q)} < −ln ${k} ⇔ n > {ln ${k}/−ln ${fmt(q)}} ≈ ${fmt(r2(Math.log(k) / -Math.log(q)))}, car ln ${fmt(q)} < 0 (on change le sens). Donc n = ${n}.`,
    })
  },
  () => {
    const k = randInt(3, 9), n = firstN((m) => m * Math.log(2) > k * Math.log(10))
    return numeric(`Quel est le plus petit entier n tel que 2^n > 10^${k} ?`, n, {
      explanation: `2^n > 10^${k} ⇔ n ln 2 > ${k} ln 10 ⇔ n > {${k} ln 10/ln 2} ≈ ${fmt(r2((k * Math.log(10)) / Math.log(2)))}. Donc n = ${n}.`,
    })
  },
  () => {
    const d = pick([100, 200, 500]), p = pick([20, 25, 30, 40]), s = pick([5, 10, 20])
    const q = 1 - p / 100, n = firstN((m) => d * q ** m < s)
    return numeric(`On injecte ${d} mg d'un médicament ; chaque heure, l'organisme en élimine ${p} %. Au bout de combien d'heures (entier minimal) restera-t-il moins de ${s} mg ?`, n, {
      explanation: `${d} × ${fmt(q)}^n < ${s} ⇔ ${fmt(q)}^n < ${fmt(s / d)} ⇔ n > {ln ${fmt(s / d)}/ln ${fmt(q)}} ≈ ${fmt(r2(Math.log(s / d) / Math.log(q)))} (on divise par ln ${fmt(q)} < 0). Donc n = ${n}.`,
    })
  },
))

// Limites et croissances comparées
const limitesLn: Maker = () => {
  const a = randInt(2, 9), b = randInt(1, 9)
  const L = (txt: string, at: string, v: number, ans: string, expl: string) => {
    const q = pick([
      `Quelle est la limite de f(x) = ${txt} quand x tend vers ${at} ?`,
      `Détermine la limite en ${at} de la fonction f(x) = ${txt}.`,
    ])
    return limitAns(q, v, ans, { explanation: expl })
  }
  return oneOf(
    () => L(`{${a} ln x/x}`, '+∞', 0, '0', `Croissances comparées : {ln x/x} → 0 en +∞, donc ${a} × {ln x/x} → 0.`),
    () => L(`${a}x ln x`, '0 (x > 0)', 0, '0', `Croissances comparées : x ln x → 0 quand x → 0⁺, donc ${a}x ln x → 0.`),
    () => L(`${a}x − ln x`, '+∞', Infinity, '+∞', `On factorise : ${a}x − ln x = x(${a} − {ln x/x}) ; {ln x/x} → 0, donc la parenthèse tend vers ${a} et le produit vers +∞.`),
    () => L(`ln x − ${a}x`, '+∞', -Infinity, '−∞', `ln x − ${a}x = x({ln x/x} − ${a}) ; {ln x/x} → 0, la parenthèse tend vers −${a} : la limite est −∞.`),
    () => L(`ln x + {${b}/x}`, '0 (x > 0)', Infinity, '+∞', `ln x + {${b}/x} = {x ln x + ${b}/x} ; x ln x → 0, donc le numérateur → ${b} > 0 et le dénominateur → 0⁺ : la limite est +∞.`),
    () => L(`{ln x/x^${a}}`, '+∞', 0, '0', `Croissances comparées : {ln x/x^n} → 0 en +∞ pour tout n ≥ 1.`),
    () => L(`${b} − ln x`, '0 (x > 0)', Infinity, '+∞', `ln x → −∞ quand x → 0⁺, donc ${b} − ln x → +∞.`),
  )
}

// Équations cos x = a, sin x = a
const equationsTrig: Maker = () => retry(() => {
  const useCos = Math.random() < 0.55
  const fn = useCos ? Math.cos : Math.sin, name = useCos ? 'cos' : 'sin'
  const v = pick([0.5, -0.5, Math.SQRT2 / 2, -Math.SQRT2 / 2, Math.sqrt(3) / 2, -Math.sqrt(3) / 2, 0])
  const dom = pick([
    { txt: '[0 ; 2π[', k0: 0, k1: 23 },
    { txt: ']−π ; π]', k0: -11, k1: 12 },
    { txt: '[0 ; π]', k0: 0, k1: 12 },
  ])
  const sol = solveK(fn, v, dom.k0, dom.k1)
  if (!sol.length) return null
  const ans = sol.map(tw).join(' ; ')
  const base = useCos ? solveK(Math.cos, v, 0, 12)[0] : solveK(Math.sin, v, -6, 6)[0]
  const why = useCos
    ? `cos x = ${trigVal(v)} = cos(${tw(base)}) ⇔ x = ${tw(base)} + 2kπ ou x = −${tw(base)} + 2kπ`
    : `sin x = ${trigVal(v)} = sin(${tw(base)}) ⇔ x = ${tw(base)} + 2kπ ou x = π − ${base < 0 ? `(${tw(base)})` : tw(base)} + 2kπ`
  return exactSet(`Résous dans ${dom.txt} l'équation ${name} x = ${trigVal(v)}. Donne les solutions exactes séparées par ;`, sol.map(rad), ans, {
    explanation: `${why} (k entier). Dans ${dom.txt}, on garde : ${ans}.`, keys: KEYS_SET,
  })
})

// Dérivées de fonctions trigonométriques composées
const deriveesTrig: Maker = () => oneOf(
  () => {
    const a = randNonZero(-5, 5), b = randInt(-4, 4), c = randNonZero(-4, 4)
    const L = lin(a, b)
    const k = -a * c
    return fexpr(`Dérive f(x) = ${coefP(c)}cos(${L}).`, `${k}sin(${L})`, {
      answer: `${coefP(k)}sin(${L})`, keys: KEYS_TRIG,
      explanation: `(cos u)′ = −u′ sin u avec u′ = ${fmt(a)} : f′(x) = ${fmt(c)} × (−${par(a)})sin(${L}) = ${coefP(k)}sin(${L}).`,
    })
  },
  () => {
    const a = randNonZero(-5, 5), b = randInt(-4, 4), c = randNonZero(-4, 4)
    const L = lin(a, b), k = a * c
    return fexpr(`Dérive g(x) = ${coefP(c)}sin(${L}).`, `${k}cos(${L})`, {
      answer: `${coefP(k)}cos(${L})`, keys: KEYS_TRIG,
      explanation: `(sin u)′ = u′ cos u avec u′ = ${fmt(a)} : g′(x) = ${coefP(k)}cos(${L}).`,
    })
  },
  () => {
    const useSin = Math.random() < 0.5
    return useSin
      ? fexpr(`Dérive f(x) = x sin x.`, `sin(x)+x*cos(x)`, { answer: 'sin x + x cos x', keys: KEYS_TRIG, explanation: `Produit : f′(x) = 1 × sin x + x × cos x = sin x + x cos x.` })
      : fexpr(`Dérive f(x) = x cos x.`, `cos(x)-x*sin(x)`, { answer: 'cos x − x sin x', keys: KEYS_TRIG, explanation: `Produit : f′(x) = 1 × cos x + x × (−sin x) = cos x − x sin x.` })
  },
  () => {
    const useCos = Math.random() < 0.5
    return useCos
      ? fexpr(`Dérive f(x) = e^{x} cos x.`, `e^x*(cos(x)-sin(x))`, { answer: 'e^{x}(cos x − sin x)', keys: KEYS_TRIG, explanation: `f′(x) = e^{x} cos x + e^{x}(−sin x) = e^{x}(cos x − sin x).` })
      : fexpr(`Dérive f(x) = e^{x} sin x.`, `e^x*(sin(x)+cos(x))`, { answer: 'e^{x}(sin x + cos x)', keys: KEYS_TRIG, explanation: `f′(x) = e^{x} sin x + e^{x} cos x = e^{x}(sin x + cos x).` })
  },
  () => {
    const n = randInt(2, 3), sup = n === 2 ? '²' : '³'
    return fexpr(`Dérive f(x) = sin${sup}x (c'est-à-dire (sin x)^${n}).`, `${n}*cos(x)*sin(x)^${n - 1}`, {
      answer: `${n}cos x sin${n === 3 ? '²' : ''}${n === 3 ? 'x' : ' x'}`, keys: KEYS_TRIG,
      explanation: `(u^n)′ = nu′u^{n−1} avec u = sin x, u′ = cos x : f′(x) = ${n}cos x × sin${n === 3 ? '²' : ''}${n === 3 ? 'x' : ' x'}.`,
    })
  },
)

// Extremums de fonctions avec ln
const extremumLn: Maker = () => oneOf(
  () => {
    const a = randInt(2, 6)
    return exact(`Soit f(x) = x − ${a} ln x sur ]0 ; +∞[. Donne la valeur exacte de son minimum.`, a - a * Math.log(a), `${a} − ${a} ln ${a}`, {
      explanation: `f′(x) = 1 − {${a}/x} = {x − ${a}/x} : négative sur ]0 ; ${a}], positive après. Minimum f(${a}) = ${a} − ${a} ln ${a} ≈ ${fmt(r2(a - a * Math.log(a)))}.`,
    })
  },
  () => {
    const c = randInt(1, 5)
    return exact(`Soit f(x) = ${coefP(c)}x ln x sur ]0 ; +∞[. Donne la valeur exacte de son minimum.`, -c / Math.E, `−{${c}/e}`, {
      explanation: `f′(x) = ${coefP(c)}(ln x + 1), nulle pour ln x = −1, soit x = e^{−1} ; négative avant, positive après. Minimum : ${coefP(c)}e^{−1} × (−1) = −{${c}/e}.`,
    })
  },
  () => {
    const c = randInt(1, 6)
    const askX = Math.random() < 0.4
    return askX
      ? exact(`Soit f(x) = {${c} ln x/x} sur ]0 ; +∞[. En quelle valeur exacte de x atteint-elle son maximum ?`, Math.E, 'e', {
        explanation: `f′(x) = {${c}(1 − ln x)/x²} : positive pour x < e, négative après. Maximum en x = e.`,
      })
      : exact(`Soit f(x) = {${c} ln x/x} sur ]0 ; +∞[. Donne la valeur exacte de son maximum.`, c / Math.E, `{${c}/e}`, {
        explanation: `f′(x) = {${c}(1 − ln x)/x²} : positive pour x < e, négative après. Maximum f(e) = {${c} ln e/e} = {${c}/e}.`,
      })
  },
  () => {
    const a = randInt(2, 6)
    return exact(`Soit f(x) = ${a}x − ln x sur ]0 ; +∞[. Donne la valeur exacte de son minimum.`, 1 + Math.log(a), `1 + ln ${a}`, {
      explanation: `f′(x) = ${a} − {1/x} = {${a}x − 1/x} : nulle en x = {1/${a}}, négative avant, positive après. Minimum f({1/${a}}) = 1 − ln({1/${a}}) = 1 + ln ${a}.`,
    })
  },
)

// ── Palier 4 ─────────────────────────────────────────────────────────────

// Équations avec ln et conditions d'existence
const equationsLnDomaine: Maker = () => oneOf(
  () => retry(() => {
    const r = randInt(2, 9), a = randInt(1, r - 1), b = r * (r - a)
    return numeric(`Résous ln x + ln(${lin(1, -a)}) = ln ${b}.`, r, {
      explanation: `Il faut x > ${a}. Alors ln(x(x − ${a})) = ln ${b} ⇔ ${poly([1, 'x²'], [-a, 'x'], [-b, ''])} = 0, de racines ${r} et ${fmt(a - r)}. Seule ${r} vérifie x > ${a}.`,
    })
  }),
  () => retry(() => {
    const a = randInt(2, 5), b = randInt(-5, 5), c = randInt(1, a - 1), d = randInt(-5, 9)
    if ((d - b) % (a - c) !== 0) return null
    const x = (d - b) / (a - c)
    if (a * x + b <= 0 || c * x + d <= 0) return null
    return numeric(`Résous ln(${lin(a, b)}) = ln(${lin(c, d)}).`, x, {
      explanation: `ln est strictement croissante : ${lin(a, b)} = ${lin(c, d)} ⇔ x = ${fmt(x)}. On vérifie que les deux expressions sont strictement positives pour x = ${fmt(x)} : elles valent ${fmt(a * x + b)} et ${fmt(c * x + d)}.`,
    })
  }),
  () => retry(() => {
    const r = randInt(2, 8), a = randInt(-3, 5), b = r * r - a * r
    if (b <= 0 || a === 0) return null
    return numeric(`Résous 2 ln x = ln(${lin(a, b)}).`, r, {
      explanation: `Il faut x > 0 (et ${lin(a, b)} > 0). 2 ln x = ln(x²), donc x² = ${lin(a, b)}, soit ${poly([1, 'x²'], [-a, 'x'], [-b, ''])} = 0 : racines ${r} et ${fmt(-b / r)}. Seule ${r} est positive.`,
    })
  }),
  () => retry(() => {
    const a = randInt(1, 9), b = randInt(2, 6)
    return numeric(`Résous ln(x + ${a}) − ln x = ln ${b}.`, a / (b - 1), {
      answer: fracText(a, b - 1),
      explanation: `Il faut x > 0. ln({x + ${a}/x}) = ln ${b} ⇔ x + ${a} = ${b}x ⇔ x = {${a}/${b - 1}} > 0.`,
    })
  }),
)

// Équations du second degré en e^x ou ln x
const equationsQuadratiques: Maker = () => oneOf(
  () => retry(() => {
    const p = randInt(1, 6), q = randInt(1, 6)
    if (p >= q || (p === 1 && q === 1)) return null
    const vals = [Math.log(p), Math.log(q)]
    const ans = [p === 1 ? '0' : `ln ${p}`, `ln ${q}`].join(' ; ')
    return exactSet(`Résous e^{2x} − ${p + q}e^{x} + ${p * q} = 0. (Pose X = e^{x}.)`, vals, ans, {
      explanation: `Avec X = e^{x} : X² − ${p + q}X + ${p * q} = 0, de racines ${p} et ${q}, toutes deux positives. e^{x} = ${p} ou e^{x} = ${q} : x = ${ans.replace(' ; ', ' ou x = ')}.`,
      keys: [';', 'ln', '−'],
    })
  }),
  () => retry(() => {
    const p = randInt(2, 7), m = randInt(1, 6)
    if (m === p) return null
    const eq = poly([1, 'e^{2x}'], [m - p, 'e^{x}'], [-p * m, ''])
    return exact(`Résous ${eq} = 0. (Pose X = e^{x}.)`, Math.log(p), `ln ${p}`, {
      explanation: `Avec X = e^{x} > 0 : ${poly([1, 'X²'], [m - p, 'X'], [-p * m, ''])} = (X − ${p})(X + ${m}) = 0. Comme X > 0, X = ${p} : x = ln ${p}.`,
    })
  }),
  () => retry(() => {
    const a = randInt(-3, 3), b = randInt(-3, 4)
    if (a >= b) return null
    const s = a + b, pr = a * b
    const eq = poly([1, '(ln x)²'], [-s, 'ln x'], [pr, ''])
    const tx = (v: number) => (v === 0 ? '1' : v === 1 ? 'e' : `e^{${fmt(v)}}`)
    return exactSet(`Résous ${eq} = 0 sur ]0 ; +∞[. (Pose X = ln x.)`, [Math.exp(a), Math.exp(b)], `${tx(a)} ; ${tx(b)}`, {
      explanation: `Avec X = ln x : X² ${s === 0 ? '' : `${-s < 0 ? '−' : '+'} ${Math.abs(s) === 1 ? '' : Math.abs(s)}X `}${pr === 0 ? '' : `${pr < 0 ? '−' : '+'} ${Math.abs(pr)} `}= 0, de racines ${fmt(a)} et ${fmt(b)}. ln x = ${fmt(a)} ou ln x = ${fmt(b)} : x = ${tx(a)} ou x = ${tx(b)}.`,
      keys: [';', 'e', '^', '−'],
    })
  }),
  () => {
    const k = randInt(2, 9)
    return exact(`Résous e^{x} − ${k}e^{−x} = 0.`, Math.log(k) / 2, `{1/2} ln ${k}`, {
      explanation: `On multiplie par e^{x} > 0 : e^{2x} = ${k}, donc 2x = ln ${k} et x = {1/2} ln ${k}${Math.sqrt(k) % 1 === 0 ? ` = ln ${Math.sqrt(k)}` : ''}.`,
    })
  },
)

// Équations trigonométriques plus riches
const equationsTrig2: Maker = () => oneOf(
  () => retry(() => {
    const v = pick([0.5, -0.5, Math.sqrt(3) / 2, 0, Math.SQRT2 / 2, 1])
    const sol = solveK((x) => Math.cos(2 * x), v, 0, 12)
    if (!sol.length) return null
    const ans = sol.map(tw).join(' ; ')
    return exactSet(`Résous dans [0 ; π] l'équation cos(2x) = ${trigVal(v)}.`, sol.map(rad), ans, {
      explanation: `On pose X = 2x ∈ [0 ; 2π] et on résout cos X = ${trigVal(v)}, puis on divise par 2 : x ∈ {${ans}}.`, keys: KEYS_SET,
    })
  }),
  () => retry(() => {
    const v = pick([0.5, -0.5, Math.sqrt(3) / 2, -Math.sqrt(3) / 2, Math.SQRT2 / 2])
    const sol = solveK((x) => Math.sin(2 * x), v, 0, 11)
    if (!sol.length) return null
    const ans = sol.map(tw).join(' ; ')
    return exactSet(`Résous dans [0 ; π[ l'équation sin(2x) = ${trigVal(v)}.`, sol.map(rad), ans, {
      explanation: `Avec X = 2x ∈ [0 ; 2π[ : sin X = ${trigVal(v)}, puis x = {X/2} : x ∈ {${ans}}.`, keys: KEYS_SET,
    })
  }),
  () => {
    const [txt, v, red] = pick([['2cos x + 1', -0.5, 'cos x = −{1/2}'], ['2cos x − √3', Math.sqrt(3) / 2, 'cos x = {√3/2}'], ['2cos x − 1', 0.5, 'cos x = {1/2}'], ['√2 cos x + 1', -Math.SQRT2 / 2, 'cos x = −{√2/2}']] as [string, number, string][])
    const sol = solveK(Math.cos, v, 0, 23), ans = sol.map(tw).join(' ; ')
    return exactSet(`Résous dans [0 ; 2π[ l'équation ${txt} = 0.`, sol.map(rad), ans, {
      explanation: `${txt} = 0 ⇔ ${red}. Dans [0 ; 2π[ : x ∈ {${ans}}.`, keys: KEYS_SET,
    })
  },
  () => {
    const [txt, v, red] = pick([['2sin x + 1', -0.5, 'sin x = −{1/2}'], ['2sin x − √3', Math.sqrt(3) / 2, 'sin x = {√3/2}'], ['2sin x − 1', 0.5, 'sin x = {1/2}'], ['√2 sin x + 1', -Math.SQRT2 / 2, 'sin x = −{√2/2}']] as [string, number, string][])
    const sol = solveK(Math.sin, v, -11, 12), ans = sol.map(tw).join(' ; ')
    return exactSet(`Résous dans ]−π ; π] l'équation ${txt} = 0.`, sol.map(rad), ans, {
      explanation: `${txt} = 0 ⇔ ${red}. Dans ]−π ; π] : x ∈ {${ans}}.`, keys: KEYS_SET,
    })
  },
)

// Limites plus fines
const limitesFines: Maker = fresh(() => {
  const a = randInt(2, 9), b = pick([2, 3, 4, 5].filter((v) => v !== a))
  const q = (txt: string, at: string) => pick([`Quelle est la limite de ${txt} quand x tend vers ${at} ?`, `Détermine la limite en ${at} de ${txt}.`])
  const fr = fracText(a, b)
  return oneOf(
    () => limitAns(q(`{ln(1 + ${a}x)/${b}x}`, '0'), a / b, fr, { explanation: `{ln(1 + ${a}x)/${b}x} = {${a}/${b}} × {ln(1 + X)/X} avec X = ${a}x → 0 ; or {ln(1 + X)/X} → 1 (nombre dérivé de ln en 1). Limite : ${fr}.` }),
    () => limitAns(q(`${b}x ln(1 + {${a}/x})`, '+∞'), a * b, String(a * b), { explanation: `Avec X = {${a}/x} → 0 : ${b}x ln(1 + {${a}/x}) = ${a * b} × {ln(1 + X)/X} → ${a * b} × 1 = ${a * b}.` }),
    () => limitAns(q(`{(ln x)^2/x}`, '+∞'), 0, '0', { explanation: `Avec x = X², {(ln x)^2/x} = {4(ln X)^2/X^2} = 4({ln X/X})² → 0 (croissances comparées).` }),
    () => limitAns(q(`ln(x + ${a}) − ln x`, '+∞'), 0, '0', { explanation: `ln(x + ${a}) − ln x = ln(1 + {${a}/x}) → ln 1 = 0.` }),
    () => limitAns(q(`ln(${a}x² + 1) − 2 ln x`, '+∞'), Math.log(a), `ln ${a}`, { explanation: `ln(${a}x² + 1) − ln(x²) = ln(${a} + {1/x²}) → ln ${a}.` }),
    () => limitAns(q(`{sin(${a}x)/${b}x}`, '0'), a / b, fr, { explanation: `{sin(${a}x)/${b}x} = {${a}/${b}} × {sin X/X} avec X = ${a}x → 0, et {sin X/X} → 1 (nombre dérivé de sin en 0, égal à cos 0 = 1). Limite : ${fr}.` }),
    () => limitAns(q(`(e^{${a}x} − 1) ÷ (${b}x)`, '0'), a / b, fr, { explanation: `{1/${b}} × (e^{${a}x} − 1)/x, et (e^{${a}x} − 1)/x est le taux d'accroissement en 0 de x ↦ e^{${a}x}, de dérivée ${a} en 0 : la limite vaut ${fr}.` }),
  )
})

// Dérivées mêlant ln, exp et trigonométrie
const deriveesMixtes: Maker = () => oneOf(
  () => fexpr(`Dérive f(x) = e^{sin x}.`, `cos(x)*e^(sin(x))`, { answer: 'cos x e^{sin x}', keys: KEYS_TRIG, explanation: `(e^{u})′ = u′e^{u} avec u = sin x : f′(x) = cos x e^{sin x}.` }),
  () => {
    const c = randInt(1, 5)
    return fexpr(`Dérive f(x) = ln(e^{x} + ${c}).`, `e^x/(e^x+${c})`, { answer: `{eˣ/eˣ + ${c}}`, keys: KEYS_LN, explanation: `(ln u)′ = {u′/u} avec u(x) = eˣ + ${c} > 0 : f′(x) = {eˣ/eˣ + ${c}}.` })
  },
  () => {
    const n = randInt(2, 4)
    return fexpr(`Dérive f(x) = x^${n} ln x sur ]0 ; +∞[.`, `${n}x^${n - 1}*ln(x)+x^${n - 1}`, {
      answer: `${n}x${n - 1 > 1 ? `^${n - 1}` : ''} ln x + x${n - 1 > 1 ? `^${n - 1}` : ''}`, dom: DOM_POS, keys: KEYS_LN,
      explanation: `Produit : f′(x) = ${n}x${n - 1 > 1 ? `^${n - 1}` : ''} ln x + x^${n} × {1/x} = ${n}x${n - 1 > 1 ? `^${n - 1}` : ''} ln x + x${n - 1 > 1 ? `^${n - 1}` : ''}.`,
    })
  },
  () => {
    const a = randInt(1, 3)
    const ax = a === 1 ? 'x²' : `${a}x²`
    return fexpr(`Dérive f(x) = cos(${ax}).`, `-${2 * a}x*sin(${a}x^2)`, { answer: `−${2 * a}x sin(${ax})`, keys: KEYS_TRIG, explanation: `(cos u)′ = −u′ sin u avec u′(x) = ${2 * a}x : f′(x) = −${2 * a}x sin(${ax}).` })
  },
  () => fexpr(`Dérive f(x) = ln(cos x) sur ]−{π/2} ; {π/2}[.`, `-sin(x)/cos(x)`, { answer: '−{sin x/cos x}', dom: [-1.4, 1.4], keys: KEYS_TRIG, explanation: `(ln u)′ = {u′/u} avec u = cos x > 0 : f′(x) = {−sin x/cos x} = −tan x.` }),
)

// ── Palier 5 ─────────────────────────────────────────────────────────────

// Seuils plus exigeants (suites arithmético-géométriques)
const seuilsForts: Maker = fresh(() => oneOf(
  () => {
    const Ta = randInt(15, 22), T0 = randInt(80, 95), q = pick([0.8, 0.85, 0.9]), s = Ta + randInt(5, 15)
    const n = firstN((m) => Ta + (T0 - Ta) * q ** m < s)
    return numeric(`Un plat sort du four à ${T0} °C dans une pièce à ${Ta} °C. Sa température après n minutes est T_n = ${Ta} + ${T0 - Ta} × ${fmt(q)}^n. Au bout de combien de minutes (entier minimal) passe-t-elle sous ${s} °C ?`, n, {
      explanation: `${T0 - Ta} × ${fmt(q)}^n < ${s - Ta} ⇔ ${fmt(q)}^n < {${s - Ta}/${T0 - Ta}} ⇔ n > {ln(${s - Ta}/${T0 - Ta})/ln ${fmt(q)}} ≈ ${fmt(r2(Math.log((s - Ta) / (T0 - Ta)) / Math.log(q)))}. Donc n = ${n}.`,
    })
  },
  () => {
    const q = pick([0.5, 0.8, 0.9]), eps = pick([0.01, 0.001])
    const n = firstN((m) => q ** m < eps)
    return numeric(`La somme 1 + ${fmt(q)} + ${fmt(q)}² + … + ${fmt(q)}^{n−1} vaut {1 − ${fmt(q)}^n/1 − ${fmt(q)}}. Quel est le plus petit entier n pour lequel elle est à moins de ${fmt(eps / (1 - q))} de sa limite {1/1 − ${fmt(q)}} ?`, n, {
      explanation: `L'écart vaut {${fmt(q)}^n/1 − ${fmt(q)}} < ${fmt(eps / (1 - q))} ⇔ ${fmt(q)}^n < ${fmt(eps)} ⇔ n > {ln ${fmt(eps)}/ln ${fmt(q)}} ≈ ${fmt(r2(Math.log(eps) / Math.log(q)))}. Donc n = ${n}.`,
    })
  },
  () => {
    const p0 = pick([1000, 2000, 5000]), t = pick([3, 4, 5]), k = pick([2, 3, 5])
    const q = 1 + t / 100, n = firstN((m) => p0 * q ** m >= k * p0 + 500)
    return numeric(`Une ville de ${p0} habitants grandit de ${t} % par an. Au bout de combien d'années (entier minimal) dépassera-t-elle ${k * p0 + 500} habitants ?`, n, {
      explanation: `${p0} × ${fmt(q)}^n ≥ ${k * p0 + 500} ⇔ n ≥ {ln(${fmt((k * p0 + 500) / p0)})/ln ${fmt(q)}} ≈ ${fmt(r2(Math.log((k * p0 + 500) / p0) / Math.log(q)))}. Donc n = ${n}.`,
    })
  },
  () => {
    const a = pick([2, 3]), b = pick([5, 10]), n = firstN((m) => m >= 2 && b * m * Math.log(m) < a ** m)
    return numeric(`Quel est le plus petit entier n ≥ 2 tel que ${a}^n > ${b}n ln n ? (On pourra tester quelques valeurs à la calculatrice.)`, Math.max(2, n), {
      explanation: `On compare ${a}^n et ${b}n ln n pour n = 2, 3, … : l'exponentielle finit par l'emporter (croissances comparées) ; la première valeur qui convient est n = ${Math.max(2, n)}.`,
    })
  },
))

// Études de fonctions avec ln
const etudeLn: Maker = () => oneOf(
  () => {
    const a = randInt(2, 4)
    return exact(`Soit f(x) = x² − ${2 * a * a} ln x sur ]0 ; +∞[. Donne la valeur exacte de son minimum.`, a * a - 2 * a * a * Math.log(a), `${a * a} − ${2 * a * a} ln ${a}`, {
      explanation: `f′(x) = 2x − {${2 * a * a}/x} = {2(x² − ${a * a})/x} : négative sur ]0 ; ${a}], positive après. Minimum f(${a}) = ${a * a} − ${2 * a * a} ln ${a}.`,
    })
  },
  () => {
    const c = randInt(1, 4)
    const ans = c % 2 === 0 ? `{${c / 2}/e}` : `{${c}/2e}`
    return exact(`Soit f(x) = {${c} ln x/x²} sur ]0 ; +∞[. Donne la valeur exacte de son maximum.`, c / (2 * Math.E), ans, {
      explanation: `f′(x) = {${c}(x − 2x ln x)/x^4} = {${c}(1 − 2 ln x)/x^3} : nulle pour ln x = {1/2}, soit x = √e ; positive avant, négative après. Maximum : f(√e) = ${c} × {1/2} ÷ e = ${ans}.`,
    })
  },
  () => {
    const a = randInt(1, 5)
    return exact(`Soit f(x) = x(ln x − ${a}) sur ]0 ; +∞[. Donne la valeur exacte de son minimum.`, -Math.exp(a - 1), `−e^{${a - 1}}`.replace('e^{0}', '1').replace('e^{1}', 'e'), {
      explanation: `f′(x) = ln x − ${a} + 1 = ln x − ${a - 1}, nulle pour x = e^{${a - 1}}, négative avant, positive après. Minimum f(e^{${a - 1}}) = e^{${a - 1}}(${a - 1} − ${a}) = −e^{${a - 1}}.`,
    })
  },
  () => {
    const a = randInt(2, 5)
    return exact(`Soit f(x) = ln x − {x/${a}} sur ]0 ; +∞[. Donne la valeur exacte de son maximum.`, Math.log(a) - 1, `ln ${a} − 1`, {
      explanation: `f′(x) = {1/x} − {1/${a}} = {${a} − x/${a}x} : positive avant ${a}, négative après. Maximum f(${a}) = ln ${a} − 1.`,
    })
  },
)

// Étude de fonctions trigonométriques
const etudeTrig: Maker = () => oneOf(
  () => exactSet(`Soit f(x) = x + 2cos x sur [0 ; 2π]. Donne les abscisses où f′ s'annule.`, [Math.PI / 6, (5 * Math.PI) / 6], '{π/6} ; {5π/6}', {
    explanation: `f′(x) = 1 − 2sin x = 0 ⇔ sin x = {1/2} ⇔ x = {π/6} ou x = {5π/6} dans [0 ; 2π].`, keys: KEYS_SET,
  }),
  () => exactSet(`Soit f(x) = x − 2sin x sur [0 ; 2π]. Donne les abscisses où f′ s'annule.`, [Math.PI / 3, (5 * Math.PI) / 3], '{π/3} ; {5π/3}', {
    explanation: `f′(x) = 1 − 2cos x = 0 ⇔ cos x = {1/2} ⇔ x = {π/3} ou x = {5π/3} dans [0 ; 2π].`, keys: KEYS_SET,
  }),
  () => {
    const c = randInt(1, 5)
    return exact(`Soit f(x) = ${coefP(c)}(sin x + cos x) sur [0 ; {π/2}]. Donne la valeur exacte de son maximum.`, c * Math.SQRT2, `${coefP(c)}√2`, {
      explanation: `f′(x) = ${coefP(c)}(cos x − sin x), nulle en {π/4}, positive avant, négative après. Maximum f({π/4}) = ${coefP(c)}({√2/2} + {√2/2}) = ${coefP(c)}√2.`, keys: ['√', '/'],
    })
  },
  () => {
    const c = randInt(1, 4)
    return exact(`Soit f(x) = ${coefP(c)}(sin x + √3 cos x) sur [0 ; {π/2}]. Donne la valeur exacte de son maximum.`, 2 * c, `${2 * c}`, {
      explanation: `f′(x) = ${coefP(c)}(cos x − √3 sin x) = 0 ⇔ tan x = {1/√3} ⇔ x = {π/6} ; f′ positive avant, négative après. f({π/6}) = ${coefP(c)}({1/2} + √3 × {√3/2}) = ${2 * c}.`,
    })
  },
  () => {
    const a = randInt(2, 6)
    return exact(`Soit f(x) = ${a}x − sin(${a}x) sur ℝ. Donne la plus petite valeur x > 0 où f′ s'annule.`, (2 * Math.PI) / a, piText(2, a), {
      explanation: `f′(x) = ${a} − ${a}cos(${a}x) = ${a}(1 − cos(${a}x)), nulle si cos(${a}x) = 1, soit ${a}x = 2kπ : la plus petite valeur strictement positive est x = ${piText(2, a)}.`, keys: ['π', '/'],
    })
  },
)

// Période et parité
const periodeParite: Maker = () => oneOf(
  () => {
    const a = randInt(2, 8)
    return exact(`Quelle est la plus petite période strictement positive de f(x) = cos(${a}x) ?`, (2 * Math.PI) / a, piText(2, a), {
      explanation: `cos(${a}(x + T)) = cos(${a}x + ${a}T) : il faut ${a}T = 2π, soit T = ${piText(2, a)}.`, keys: ['π', '/'],
    })
  },
  () => {
    const a = randInt(2, 9)
    return numeric(`Quelle est la plus petite période strictement positive de g(x) = sin({πx/${a}}) ?`, 2 * a, {
      explanation: `{π(x + T)/${a}} = {πx/${a}} + {πT/${a}} : il faut {πT/${a}} = 2π, soit T = ${2 * a}.`,
    })
  },
  () => {
    const [f, ans, why] = pick([
      ['x sin x', 'paire', 'f(−x) = (−x) × (−sin x) = x sin x = f(x)'],
      ['x cos x', 'impaire', 'f(−x) = (−x) cos x = −f(x)'],
      ['x² cos x', 'paire', 'f(−x) = x² cos x = f(x)'],
      ['sin x + cos x', 'ni paire ni impaire', 'f(−x) = −sin x + cos x, différent de f(x) et de −f(x) (essaie x = {π/4})'],
      ['sin³ x', 'impaire', 'f(−x) = (−sin x)³ = −f(x)'],
      ['x + sin x', 'impaire', 'f(−x) = −x − sin x = −f(x)'],
      ['eˣ cos x', 'ni paire ni impaire', 'f(−x) = e^{−x} cos x, ni égal à f(x) ni à −f(x)'],
      ['cos(2x) + x²', 'paire', 'f(−x) = cos(−2x) + x² = f(x)'],
    ] as [string, string, string][])
    return choice(`La fonction f(x) = ${f}, définie sur ℝ, est-elle paire, impaire, ou ni l'un ni l'autre ?`, ans, ['paire', 'impaire', 'ni paire ni impaire'], `${why} : f est ${ans}. (cos est paire, sin est impaire.)`)
  },
  () => {
    const a = randInt(2, 4), b = a * randInt(2, 3)
    return exact(`Quelle est la plus petite période strictement positive de h(x) = cos(${a}x) + sin(${b}x) ?`, (2 * Math.PI) / a, piText(2, a), {
      explanation: `cos(${a}x) est ${piText(2, a)}-périodique, sin(${b}x) est ${piText(2, b)}-périodique ; ${piText(2, a)} est un multiple de ${piText(2, b)}, c'est la période de la somme.`, keys: ['π', '/'],
    })
  },
)

// Tangentes à la courbe de ln
const tangentesLn: Maker = () => oneOf(
  () => {
    const a = randInt(2, 5)
    return fexpr(`Donne l'équation réduite de la tangente à la courbe de ln au point d'abscisse ${a}.`, `x/${a}+ln(${a})-1`, {
      answer: `y = {x/${a}} + ln ${a} − 1`, keys: KEYS_LN, dom: [0.5, 3],
      explanation: `ln′(${a}) = {1/${a}} : y = {1/${a}}(x − ${a}) + ln ${a} = {x/${a}} − 1 + ln ${a}.`,
    })
  },
  () => {
    const n = randInt(1, 3)
    const en = ['e', 'e²', 'e³'][n - 1]
    const eq = `{x/${en}}${n - 1 ? ` + ${n - 1}` : ''}`
    return fexpr(`Donne l'équation réduite de la tangente à la courbe de ln au point d'abscisse ${en}.`, `x/e^${n}+${n}-1`, {
      answer: `y = ${eq}`, keys: KEYS_LN,
      explanation: `ln(${en}) = ${n} et ln′(${en}) = {1/${en}} : y = {1/${en}}(x − ${en}) + ${n} = ${eq}.`,
    })
  },
  () => {
    const k = randInt(2, 9)
    return numeric(`En quel point (abscisse) la tangente à la courbe de ln est-elle parallèle à la droite y = ${k}x ?`, 1 / k, {
      answer: `1/${k}`,
      explanation: `ln′(a) = {1/a} = ${k} ⇔ a = {1/${k}}.`,
    })
  },
  () => {
    const c = randInt(1, 4)
    return exact(`La tangente à la courbe de f(x) = ln(x) + ${c} au point d'abscisse a passe par l'origine. Donne la valeur exacte de a.`, Math.exp(1 - c), c === 1 ? '1' : `e^{${1 - c}}`, {
      explanation: `Tangente en a : y = {1/a}(x − a) + ln a + ${c}. En x = 0 : −1 + ln a + ${c} = 0 ⇔ ln a = ${1 - c} ⇔ a = ${c === 1 ? '1' : `e^{${1 - c}}`}.`,
    })
  },
)

const tiers: Tiers = [
  [proprietesLn, valeursLn, valeursTrig, degresRadians, deriveesUsuelles],
  [equationsSimples, decomposerLn, pariteTrig, deriveeLnU, lectureCercle],
  [seuils, limitesLn, equationsTrig, deriveesTrig, extremumLn],
  [equationsLnDomaine, equationsQuadratiques, equationsTrig2, limitesFines, deriveesMixtes],
  [seuilsForts, etudeLn, etudeTrig, periodeParite, tangentesLn],
]

// ═══════════════════════════════════════════════════════════════════════
// Problèmes d'amélioration
// ═══════════════════════════════════════════════════════════════════════

const upgrades: Ladder = [
  [
    // Somme télescopique
    () => {
      const n = randInt(5, 30)
      return exact(`Calcule S = ln({1/2}) + ln({2/3}) + ln({3/4}) + … + ln({${n - 1}/${n}}). (Valeur exacte.)`, -Math.log(n), `−ln ${n}`, {
        explanation: `ln({k/k + 1}) = ln k − ln(k + 1) : les termes s'annulent deux à deux (somme télescopique). S = ln 1 − ln ${n} = −ln ${n}.`,
      })
    },
    // ln a + ln a² + … + ln a^n
    () => {
      const n = randInt(4, 12), a = pick([2, 3, 5])
      return numeric(`On écrit ln ${a} + ln(${a}²) + ln(${a}³) + … + ln(${a}^${n}) = k ln ${a}. Que vaut k ?`, (n * (n + 1)) / 2, {
        explanation: `ln(${a}^j) = j ln ${a}, donc k = 1 + 2 + … + ${n} = {${n} × ${n + 1}/2} = ${(n * (n + 1)) / 2}.`,
      })
    },
    // sin x = k cos x
    () => {
      const k = pick([
        { e: 'sin x = cos x', f: (x: number) => Math.sin(x) - Math.cos(x), t: 'tan x = 1' },
        { e: 'sin x = −cos x', f: (x: number) => Math.sin(x) + Math.cos(x), t: 'tan x = −1' },
        { e: 'sin x = √3 cos x', f: (x: number) => Math.sin(x) - Math.sqrt(3) * Math.cos(x), t: 'tan x = √3' },
        { e: '√3 sin x = cos x', f: (x: number) => Math.sqrt(3) * Math.sin(x) - Math.cos(x), t: 'tan x = {1/√3}' },
        { e: 'sin x + √3 cos x = 0', f: (x: number) => Math.sin(x) + Math.sqrt(3) * Math.cos(x), t: 'tan x = −√3' },
      ])
      const dom = pick([{ t: '[0 ; 2π[', k0: 0, k1: 23 }, { t: ']−π ; π]', k0: -11, k1: 12 }])
      const sol = solveK(k.f, 0, dom.k0, dom.k1), ans = sol.map(tw).join(' ; ')
      return exactSet(`Résous dans ${dom.t} l'équation ${k.e}.`, sol.map(rad), ans, {
        explanation: `cos x = 0 ne donne pas de solution (sin x vaudrait ±1), donc on peut diviser par cos x : ${k.t}. La fonction tangente est π-périodique : deux solutions dans ${dom.t}, ${ans}.`, keys: KEYS_SET,
      })
    },
    // a^x = b
    () => {
      const a = pick([2, 3, 5]), b = pick([10, 7, 100, 50, 20])
      return exact(`Résous ${a}^x = ${b}. Donne la valeur exacte, puis vérifie avec une valeur approchée.`, Math.log(b) / Math.log(a), `{ln ${b}/ln ${a}}`, {
        explanation: `${a}^x = e^{x ln ${a}} = ${b} ⇔ x ln ${a} = ln ${b} ⇔ x = {ln ${b}/ln ${a}} ≈ ${fmt(r2(Math.log(b) / Math.log(a)))}.`,
      })
    },
  ],
  [
    // Inéquation avec ln : intervalle
    () => {
      const a = randInt(1, 9), b = randInt(1, 5)
      return interval(`Résous l'inéquation ln(${lin(2, -a)}) ≥ ln(${lin(1, b)}). Donne l'ensemble des solutions sous forme d'intervalle.`, { lo: a + b, hi: Infinity, loClosed: true, hiClosed: false }, {
        explanation: `Il faut 2x − ${a} > 0 et x + ${b} > 0, soit x > ${fracText(a, 2)}. ln étant strictement croissante : 2x − ${a} ≥ x + ${b} ⇔ x ≥ ${a + b}. Comme ${a + b} > ${fracText(a, 2)}, S = [${a + b} ; +∞[.`,
      })
    },
    // cos x = cos(a)
    () => retry(() => {
      const n = pick([5, 7, 8, 9, 10]), k = randInt(1, n - 1)
      if (gcd(k, n) !== 1) return null
      const t = piText(k, n)
      return exactSet(`Résous dans ]−π ; π] l'équation cos x = cos(${t}).`, [(k * Math.PI) / n, (-k * Math.PI) / n], `−${t} ; ${t}`, {
        explanation: `cos x = cos a ⇔ x = a + 2kπ ou x = −a + 2kπ (k entier). Dans ]−π ; π] : x = ${t} ou x = −${t}.`, keys: KEYS_SET,
      })
    }),
    // ln et nombre de chiffres binaires
    () => {
      const N = pick([1, 2, 3, 5, 7]) * 10 ** randInt(3, 6)
      const n = N.toString(2).length
      return numeric(`Combien de chiffres faut-il pour écrire ${big(N)} en base 2 ? (Un entier N s'écrit avec n chiffres binaires quand 2^{n−1} ≤ N < 2^n.)`, n, {
        explanation: `2^{n−1} ≤ N ⇔ n − 1 ≤ {ln N/ln 2} ≈ ${fmt(r2(Math.log(N) / Math.log(2)))}. Donc n − 1 = ${n - 1} et n = ${n}.`,
      })
    },
  ],
  [
    // Plus petit a tel que ln(kx) ≤ ax
    () => {
      const k = randInt(1, 10), kx = k === 1 ? 'x' : `${k}x`, at = k === 1 ? 'e' : `{e/${k}}`, ans = `{${k}/e}`
      const q = pick([
        `Quel est le plus petit réel a tel que ln(${kx}) ≤ ax pour tout x > 0 ? (Étudie g(x) = {ln(${kx})/x}.)`,
        `Pour quelle valeur de a la droite y = ax est-elle tangente à la courbe de x ↦ ln(${kx}) ? (Au-delà, la droite reste au-dessus de la courbe.)`,
      ])
      return exact(q, k / Math.E, ans, {
        explanation: `Pour x > 0, ln(${kx}) ≤ ax ⇔ g(x) ≤ a. g′(x) = {1 − ln(${kx})/x²} : g est croissante puis décroissante, maximale quand ${kx} = e, soit x = ${at}, et son maximum vaut ${ans}. Donc a = ${ans}.`,
      })
    },
    // Limite (1 + a/n)^{bn}
    () => {
      const a = randNonZero(-3, 4), b = randInt(1, 3)
      const t = a > 0 ? `1 + {${a}/n}` : `1 − {${-a}/n}`
      const ans = a * b === 1 ? 'e' : `e^{${fmt(a * b)}}`
      const ex = b === 1 ? 'n' : `${b}n`
      return limitAns(`Détermine la limite de (${t})^{${ex}} quand n tend vers +∞. (Écris-la sous la forme e^{${ex} ln(${t.replace(/[{}]/g, '')})}.)`, Math.exp(a * b), ans, {
        explanation: `${ex} ln(${t}) = ${fmt(a * b)} × {ln(1 + X)/X} avec X = ${a > 0 ? '' : '−'}{${Math.abs(a)}/n} → 0, donc tend vers ${fmt(a * b)}. Par continuité de exp, la limite est ${ans}.`,
      })
    },
    // Équations trigonométriques avec duplication
    () => {
      const v = pick([
        { e: 'sin(2x) = cos x', f: (x: number) => Math.sin(2 * x) - Math.cos(x), w: '2sin x cos x = cos x ⇔ cos x(2sin x − 1) = 0 ⇔ cos x = 0 ou sin x = {1/2}' },
        { e: 'sin(2x) = sin x', f: (x: number) => Math.sin(2 * x) - Math.sin(x), w: '2sin x cos x = sin x ⇔ sin x(2cos x − 1) = 0 ⇔ sin x = 0 ou cos x = {1/2}' },
        { e: 'cos(2x) = cos x', f: (x: number) => Math.cos(2 * x) - Math.cos(x), w: '2cos²x − 1 = cos x ⇔ (cos x − 1)(2cos x + 1) = 0 ⇔ cos x = 1 ou cos x = −{1/2}' },
        { e: 'cos(2x) + sin x = 0', f: (x: number) => Math.cos(2 * x) + Math.sin(x), w: '1 − 2sin²x + sin x = 0 ⇔ (sin x − 1)(2sin x + 1) = 0 ⇔ sin x = 1 ou sin x = −{1/2}' },
        { e: 'cos(2x) = sin x', f: (x: number) => Math.cos(2 * x) - Math.sin(x), w: '1 − 2sin²x = sin x ⇔ (2sin x − 1)(sin x + 1) = 0 ⇔ sin x = {1/2} ou sin x = −1' },
        { e: 'sin(2x) + sin x = 0', f: (x: number) => Math.sin(2 * x) + Math.sin(x), w: '2sin x cos x + sin x = 0 ⇔ sin x(2cos x + 1) = 0 ⇔ sin x = 0 ou cos x = −{1/2}' },
      ])
      const dom = pick([{ t: '[0 ; 2π[', k0: 0, k1: 23 }, { t: ']−π ; π]', k0: -11, k1: 12 }])
      const sol = solveK(v.f, 0, dom.k0, dom.k1), ans = sol.map(tw).join(' ; ')
      return exactSet(`Résous dans ${dom.t} l'équation ${v.e}. (Rappel : sin(2x) = 2sin x cos x et cos(2x) = 2cos²x − 1 = 1 − 2sin²x.)`, sol.map(rad), ans, {
        explanation: `${v.w}. Dans ${dom.t} : ${ans}.`, keys: KEYS_SET,
      })
    },
  ],
]

// ═══════════════════════════════════════════════════════════════════════
// Problèmes de l'hôtel de ville
// ═══════════════════════════════════════════════════════════════════════

const age: Ladder = [
  [
    // La datation au carbone 14
    () => {
      const half = 5730, k = pick([2, 3, 4]), left = 100 / 2 ** k
      const obj = pick(['un os retrouvé sous le donjon', 'un morceau de charbon de bois', 'une poutre de l’ancienne chapelle', 'un tissu ancien'])
      return T('La datation au carbone 14', numeric(`Le carbone 14 a une demi-vie de 5 730 ans : sa quantité est divisée par 2 tous les 5 730 ans, et vaut N(t) = N_0 e^{−λt} avec λ = {ln 2/5730}. Dans ${obj}, il ne reste que ${fmt(left)} % du carbone 14 initial. Quel est son âge (en années) ?`, k * half, {
        explanation: `N(t) = ${fmt(left)} % de N_0 ⇔ e^{−λt} = {1/${2 ** k}} ⇔ λt = ${k} ln 2 ⇔ t = ${k} × 5 730 = ${big(k * half)} ans (${k} demi-vies).`,
      }))
    },
    // La marée
    () => {
      const m = randInt(4, 6), A = randInt(2, 4), t0 = pick([1, 2, 4, 5])
      const h = (t: number) => m + A * Math.cos((Math.PI * t) / 6)
      const g = graph({ xMin: 0, xMax: 12, yMin: 0, yMax: m + A + 1, step: 1, labelStep: 2, ystep: 1, ylabelStep: 2 })
      plotC(g, h)
      const v = h(t0), cosv = Math.cos((Math.PI * t0) / 6)
      const ans = t0 === 2 || t0 === 4 ? fmt(v) : `${m} ${cosv < 0 ? '−' : '+'} ${r3(A)}`
      return T('La marée au port', exact(`Au port, la hauteur d'eau (en m) t heures après la pleine mer est h(t) = ${m} + ${A}cos({πt/6}). Donne la valeur exacte de la hauteur d'eau ${t0} h après la pleine mer.`, v, ans, {
        explanation: `h(${t0}) = ${m} + ${A}cos(${piText(t0, 6)}) = ${m} + ${A} × (${trigVal(cosv)}) = ${ans} ≈ ${fmt(r2(v))} m.`,
      }), g.figure)
    },
    // Le placement du marchand
    () => {
      const t = pick([2, 2.5, 3, 4, 5]), p = prenom()
      const q = 1 + t / 100, n = firstN((m) => q ** m >= 2)
      return T('Le trésor qui double', numeric(`${p} place ses économies à ${fmt(t)} % d'intérêts composés par an. Au bout de combien d'années son capital aura-t-il doublé pour la première fois ?`, n, {
        explanation: `${fmt(q)}^n ≥ 2 ⇔ n ≥ {ln 2/ln ${fmt(q)}} ≈ ${fmt(r2(Math.log(2) / Math.log(q)))} : il faut ${n} ans.`,
      }))
    },
    // La grande roue
    () => {
      const R = randInt(10, 25), Tm = pick([12, 24]), c = R + 2, k = pick([1, 2, 4])
      const t = (Tm * k) / 12
      const hv = c - R * Math.cos((2 * Math.PI * t) / Tm)
      const g = graph({ xMin: 0, xMax: Tm, yMin: 0, yMax: 2 * R + 6, step: Tm / 4, labelStep: Tm / 2, ystep: niceStep(2 * R + 6, 5), ylabelStep: niceStep(2 * R + 6, 5) })
      plotC(g, (x) => c - R * Math.cos((2 * Math.PI * x) / Tm))
      const vals: Record<number, string> = { 1: `${c} − ${r3(R)}`, 2: fmt(c - R / 2), 4: fmt(c + R / 2) }
      return T('La grande roue de la foire', exact(`Une nacelle de grande roue, de rayon ${R} m, part du point le plus bas (à 2 m du sol). Sa hauteur après t minutes est h(t) = ${c} − ${R}cos({2πt/${Tm}}). Donne la valeur exacte de sa hauteur après ${fmt(t)} min.`, hv, vals[k], {
        explanation: `{2π × ${fmt(t)}/${Tm}} = ${piText(k, 6)}, et cos(${piText(k, 6)}) = ${trigVal(Math.cos((k * Math.PI) / 6))} : h = ${c} − ${R} × (${trigVal(Math.cos((k * Math.PI) / 6))}) ≈ ${fmt(r2(hv))} m.`,
      }), g.figure)
    },
  ],
  [
    // Le four du boulanger
    () => {
      const Ta = 20, T0 = pick([200, 220, 250]), tau = pick([20, 25, 30]), s = pick([50, 60, 80])
      const t = tau * Math.log((T0 - Ta) / (s - Ta))
      const g = graph({ xMin: 0, xMax: 4 * tau, yMin: 0, yMax: T0 + 20, step: tau / 2, labelStep: tau, ystep: 20, ylabelStep: 40 })
      plotC(g, (x) => Ta + (T0 - Ta) * Math.exp(-x / tau))
      hline(g, s, 0, 4 * tau)
      return T('Le four du boulanger', rounded(`Le boulanger éteint son four à ${T0} °C. Sa température (en °C) t minutes plus tard est T(t) = ${Ta} + ${T0 - Ta}e^{−t/${tau}}. Au bout de combien de minutes descend-elle à ${s} °C ? Arrondis au dixième.`, t, 1, {
        explanation: `${T0 - Ta}e^{−t/${tau}} = ${s - Ta} ⇔ e^{−t/${tau}} = {${s - Ta}/${T0 - Ta}} ⇔ t = ${tau} ln({${T0 - Ta}/${s - Ta}}) ≈ ${fmt(Math.round(t * 10) / 10)} min.`,
      }), g.figure)
    },
    // La croissance du bourg
    () => {
      const D = pick([20, 25, 30, 40, 50]), p0 = pick([800, 1200, 1500, 2000]), y = pick([10, 15, 60])
      const k = Math.log(2) / D, P = p0 * Math.exp(k * y)
      return T('La croissance du bourg', rounded(`La population d'un bourg suit P(t) = ${p0}e^{kt} (t en années). Elle double en ${D} ans. Quelle sera-t-elle dans ${y} ans ? Arrondis à l'unité.`, P, 0, {
        explanation: `e^{${D}k} = 2 ⇔ k = {ln 2/${D}}. Alors P(${y}) = ${p0}e^{${y} ln 2/${D}} = ${p0} × 2^{${fmt(y / D)}} ≈ ${Math.round(P)}.`, tol: 1,
      }))
    },
    // Le pendule de l'horloge
    () => {
      const th = pick([10, 12, 15, 20]), P = pick([1, 2, 4])
      const frac = pick([{ v: 0.5, a: 6, t: '{1/2}' }, { v: Math.SQRT2 / 2, a: 8, t: '{√2/2}' }, { v: Math.sqrt(3) / 2, a: 12, t: '{√3/2}' }])
      const ans = P / frac.a
      const g = graph({ xMin: 0, xMax: P, yMin: -th - 4, yMax: th + 4, step: P / 4, labelStep: P / 2, ystep: 5, ylabelStep: 10 })
      plotC(g, (x) => th * Math.cos((2 * Math.PI * x) / P))
      return T('Le pendule de l’horloge', numeric(`L'angle (en degrés) du pendule de l'horloge du beffroi est θ(t) = ${th}cos(${P === 1 ? '2πt' : `{2πt/${P}}`}) (t en s). Au bout de combien de secondes l'angle vaut-il pour la première fois ${th} × ${frac.t} ?`, ans, {
        answer: fracText(P, frac.a),
        explanation: `cos(${P === 1 ? '2πt' : `{2πt/${P}}`}) = ${frac.t} : la plus petite solution positive vérifie ${P === 1 ? '2πt' : `{2πt/${P}}`} = {π/${frac.a / 2}}, soit t = {${P}/${frac.a}} s.`,
      }), g.figure)
    },
  ],
  [
    // Les jours longs
    () => {
      const A = pick([3, 4, 5]), [mult, frac, part, txt] = pick([[0.5, 1 / 3, 'π/6 et 5π/6', '{1/2}'], [Math.SQRT2 / 2, 1 / 4, 'π/4 et 3π/4', '{√2/2}'], [Math.sqrt(3) / 2, 1 / 6, 'π/3 et 2π/3', '{√3/2}']] as [number, number, string, string][])
      const thr = 12 + A * mult
      const days = 365 * frac
      const thrTxt = mult === 0.5 ? fmt(thr) : `12 + ${A} × ${txt}`
      const g = graph({ xMin: 0, xMax: 365, yMin: 0, yMax: 18, step: 30, labelStep: 90, ystep: 2, ylabelStep: 4 })
      plotC(g, (t) => 12 + A * Math.sin((2 * Math.PI * (t - 80)) / 365))
      hline(g, thr, 0, 365)
      return T('Les longs jours d’été', rounded(`Dans une ville, la durée du jour (en heures) le t-ième jour de l'année est environ D(t) = 12 + ${A}sin({2π(t − 80)/365}). Pendant combien de jours (environ) la durée du jour dépasse-t-elle ${thrTxt} h ? Arrondis à l'unité.`, days, 0, {
        explanation: `D(t) ≥ 12 + ${A} × ${txt} ⇔ sin X ≥ ${txt} avec X = {2π(t − 80)/365}, soit X entre ${part} : un intervalle de longueur ${fmt(frac * 2)}π, c'est-à-dire ${fracText(1, 1 / frac)} de la période 2π. Durée : {365/${1 / frac}} ≈ ${fmt(Math.round(days * 10) / 10)} jours.`,
        tol: 1,
      }), g.figure)
    },
    // La gouttière
    () => {
      const a = randInt(2, 6) * 10, askAng = Math.random() < 0.5
      const fig: Figure = (() => {
        const t = Math.PI / 3, s = 80
        return {
          points: {
            A: { x: 160 - s / 2 - s * Math.cos(t), y: 50, label: 'A' }, B: { x: 160 - s / 2, y: 50 + s * Math.sin(t), label: 'B' },
            C: { x: 160 + s / 2, y: 50 + s * Math.sin(t), label: 'C' }, D: { x: 160 + s / 2 + s * Math.cos(t), y: 50, label: 'D' },
            H: { x: 160 - s / 2, y: 50, hidden: true, label: '' },
          },
          segments: [{ a: 'A', b: 'B', label: `${a} cm` }, { a: 'B', b: 'C', label: `${a} cm` }, { a: 'C', b: 'D', label: `${a} cm` }, { a: 'A', b: 'D', dashed: true }, { a: 'B', b: 'H', dashed: true }],
          angles: [{ vertex: 'B', a: 'H', b: 'A', label: 'θ', color: RED }],
          polygons: [{ pts: ['A', 'B', 'C', 'D'], fill: BLUE }],
          caption: 'Coupe de la gouttière : on relève les deux bords d’un angle θ.',
        }
      })()
      const Amax = (3 * Math.sqrt(3) / 4) * a * a
      return T('La gouttière du moulin', askAng
        ? numeric(`Pour fabriquer une gouttière, on plie une plaque de ${3 * a} cm de large en trois bandes de ${a} cm : le fond reste horizontal et les deux bords sont relevés d'un angle θ par rapport à la verticale (voir la coupe). L'aire de la section vaut A(θ) = ${a * a}cos θ (1 + sin θ) pour θ ∈ [0 ; {π/2}]. Pour quel angle θ, en degrés, la gouttière transporte-t-elle le plus d'eau ?`, 30, {
          explanation: `A′(θ) = ${a * a}(−sin θ(1 + sin θ) + cos²θ) = ${a * a}(1 − sin θ − 2sin²θ) = ${a * a}(1 − 2sin θ)(1 + sin θ). Nulle pour sin θ = {1/2}, θ = {π/6} = 30° (positive avant, négative après).`,
        })
        : rounded(`Pour fabriquer une gouttière, on plie une plaque de ${3 * a} cm de large en trois bandes de ${a} cm : le fond reste horizontal et les deux bords sont relevés d'un angle θ par rapport à la verticale (voir la coupe). L'aire de la section vaut A(θ) = ${a * a}cos θ (1 + sin θ) pour θ ∈ [0 ; {π/2}]. Quelle est l'aire maximale de la section (en cm², arrondie à l'unité) ?`, Amax, 0, {
          explanation: `A′(θ) = ${a * a}(1 − 2sin θ)(1 + sin θ) s'annule pour θ = {π/6}. A({π/6}) = ${a * a} × {√3/2} × {3/2} = {${3 * a * a}√3/4} ≈ ${Math.round(Amax)} cm².`, tol: 1,
        }), fig)
    },
    // Les truites du lac
    () => {
      const K = pick([1000, 2000, 5000]), c = pick([4, 9, 19]), r = pick([0.5, 0.25, 0.4]), s = pick([0.5, 0.75])
      // P(t) = K / (1 + c e^{−rt}) ; P = sK ⇔ e^{−rt} = (1 − s)/(sc)
      const t = Math.log((s * c) / (1 - s)) / r
      const g = graph({ xMin: 0, xMax: Math.ceil(2 * t / 5) * 5 || 10, yMin: 0, yMax: K * 1.1, step: niceStep(2 * t, 6), labelStep: 2 * niceStep(2 * t, 6), ystep: K / 5, ylabelStep: (2 * K) / 5 })
      plotC(g, (x) => K / (1 + c * Math.exp(-r * x)))
      hline(g, s * K, 0, Math.ceil(2 * t / 5) * 5 || 10)
      vline(g, t, 0, s * K)
      return T('Les truites du lac', rounded(`On introduit des truites dans un lac. Leur nombre après t années est P(t) = ${K} ÷ (1 + ${c}e^{−${fmt(r)}t}). Au bout de combien d'années atteindra-t-il ${fmt(s * K)} ? Arrondis au centième.`, t, 2, {
        explanation: `${K} ÷ (1 + ${c}e^{−${fmt(r)}t}) = ${fmt(s * K)} ⇔ 1 + ${c}e^{−${fmt(r)}t} = ${fmt(1 / s)} ⇔ e^{−${fmt(r)}t} = {${fmt(1 / s - 1)}/${c}} ⇔ t = {ln(${fmt(s * c / (1 - s))})/${fmt(r)}} ≈ ${fmt(Math.round(t * 100) / 100)} ans.`,
      }), g.figure)
    },
  ],
]
export const CONTENT = polishContent({ tiers, upgrades, age })
