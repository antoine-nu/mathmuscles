// Mathématiques complémentaires (Terminale) — public adulte non spécialiste, applications concrètes.
// Modèles discrets (suites) et continus (exponentielle, logarithme, logistique), taux d'évolution,
// statistiques à deux variables (ajustement affine), lois de probabilité usuelles en contexte.
// Les calculs « à la calculatrice » sont accompagnés des valeurs utiles (ln 2 ≈ 0,693…) dans l'énoncé.
import { F, fmt, fresh, numeric, pair, parseNumber, pick, randInt, variants, type Exercise, type Maker, type SubjectContent } from '../utils'
import { graphFigure, type Figure, type FigPoint } from '../figure'
import { prenom } from '../contexts'

// ── Aides locales ───────────────────────────────────────────────────────
const BLUE = '#5b8fc7'
const AXIS = '#9c8a6c'
const r = (v: number, d = 2) => Math.round(v * 10 ** d) / 10 ** d
const ln = Math.log
/** Valeur approchée affichée dans un énoncé : ln 2 ≈ 0,6931. */
const lnv = (x: number, d = 4) => fmt(r(ln(x), d))
const big = (n: number) => fmt(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
const SUBS = '₀₁₂₃₄₅₆₇₈₉'
/** Indice numérique en caractères Unicode : u₁₂ (la mini-syntaxe n'accepte qu'une lettre en indice). */
const u = (k: number, name = 'u') => `${name}${String(k).split('').map((d) => SUBS[Number(d)]).join('')}`
/** Seuil « franc » : le résultat ne dépend pas des arrondis des logarithmes donnés. */
/** Modèle logistique écrit en ligne (une fraction empilée ne peut pas contenir d'exposant). */
const logi = (K: string, a: number, k: number) => `${K} / (1 + ${a}e^{−${fmt(k)}t})`
/** « + 3 » ou « − 3 » pour écrire a × x + b. */
const plus = (b: number) => (b < 0 ? `− ${fmt(-b)}` : `+ ${fmt(b)}`)
const clear = (x: number) => x - Math.floor(x) > 0.06 && x - Math.floor(x) < 0.94
/** Ajoute une figure à un exercice d'entraînement. */
const withFig = (ex: Exercise, figure: Figure): Exercise => ({ ...ex, figure })

function retry<R>(gen: () => R | null | undefined | false, tries = 3000): R {
  for (let i = 0; i < tries; i++) {
    const v = gen()
    if (v) return v
  }
  throw new Error('tirage impossible')
}

/** Lecture tolérante : « 12,5 % », « 1 234 € », « 3/8 ». */
const loose = (v: string) => parseNumber(v.replace(/\s/g, '').replace(/(%|€|ans?|années?|h|jours?|min|mg|g|kg|km|habitants?)$/i, ''))

/** Réponse arrondie à d décimales (tolérance d'une unité sur la dernière décimale, pour les arrondis intermédiaires). */
function approx(prompt: string, value: number, d: number, explanation: string, unit = ''): Exercise {
  const tol = 1.01 * 10 ** -d + 1e-9
  return {
    prompt, kind: 'input', answer: `${fmt(r(value, d))}${unit ? ` ${unit}` : ''}`, explanation,
    inputHint: d === 0 ? 'Arrondi à l’unité' : d < 0 ? `Arrondi à ${fmt(10 ** -d)} près` : `Arrondi à ${fmt(10 ** -d)}`,
    format: 'un nombre, par exemple 12,5',
    keypad: ['−', ','],
    isValid: (v) => !Number.isNaN(loose(v)),
    check: (v) => Math.abs(loose(v) - value) <= tol,
  }
}
/** Probabilité : valeur exacte (fraction) ou décimale à 0,001 près. */
function prob(prompt: string, num: number, den: number, explanation: string): Exercise {
  const value = num / den
  const g = gcdN(num, den)
  const exact = den / g === 1 ? fmt(num / g) : `${num / g}/${den / g}`
  const dec = Number.isInteger(value * 1000) ? fmt(value) : `≈ ${fmt(r(value, 3))}`
  return {
    prompt, kind: 'input', answer: Number.isInteger(value * 10000) ? fmt(value) : exact, explanation: `${explanation}${!Number.isInteger(value * 10000) ? ` ${dec}` : ''}.`,
    inputHint: 'Fraction ou décimal à 0,001 près',
    format: 'une fraction comme 25/216, ou un décimal comme 0,116',
    keypad: ['/', ','],
    isValid: (v) => !Number.isNaN(loose(v)),
    check: (v) => Math.abs(loose(v) - value) <= 0.0006,
  }
}
function gcdN(a: number, b: number): number { return b === 0 ? Math.abs(a) : gcdN(b, a % b) }
const N = (prompt: string, v: number, explanation: string) => numeric(prompt, v, { explanation })
const T = (title: string, ex: Exercise, figure?: Figure): Exercise => ({ ...ex, title, ...(figure ? { figure } : {}) })
/** Signe d'un taux : « +12 % » / « −8 % ». */
const sgnPct = (t: number) => `${t >= 0 ? '+' : '−'}${fmt(Math.abs(r(t * 100, 4)))} %`

/** Nuage de points (et droite d'ajustement éventuelle) dans un repère. */
function scatter(pts: [number, number][], o: { line?: [number, number]; xMax?: number; yMin?: number; yMax?: number; ystep?: number; names?: [string, string]; G?: [number, number]; extra?: [number, number] } = {}): Figure {
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1])
  const xMax = o.xMax ?? Math.max(...xs) + 1
  const yLo = o.yMin ?? 0
  const yHiRaw = o.yMax ?? Math.max(...ys, o.extra?.[1] ?? 0)
  const ystep = o.ystep ?? niceStep((yHiRaw - yLo) / 6)
  const yMax = Math.ceil((yHiRaw * 1.08) / ystep) * ystep
  const g = graphFigure({ xMin: 0, xMax, yMin: yLo, yMax, step: 1, labelStep: xMax > 12 ? 2 : 1, ystep, ylabelStep: ystep * ((yMax - yLo) / ystep > 8 ? 2 : 1) })
  pts.forEach(([x, y], i) => g.point(`P${i}`, x, y, ''))
  if (o.line) g.plot((x) => o.line![0] * x + o.line![1], { color: BLUE })
  if (o.G) g.point('G', o.G[0], o.G[1], 'G', 'nw')
  if (o.extra) g.point('E', o.extra[0], o.extra[1], '?', 'n')
  if (o.names) g.figure.axes!.names = o.names
  g.figure.caption = o.line ? 'Nuage de points et droite d’ajustement.' : 'Nuage de points.'
  return g.figure
}
function niceStep(raw: number) {
  const p = 10 ** Math.floor(Math.log10(Math.max(raw, 1e-9)))
  for (const m of [1, 2, 5, 10]) if (m * p >= raw) return m * p
  return 10 * p
}

/** Courbe d'une fonction sur [0 ; tMax]. */
function curve(f: (t: number) => number, tMax: number, yMax: number, o: { hline?: number; mark?: [number, number]; names?: [string, string]; caption?: string; ystep?: number } = {}): Figure {
  const xstep = niceStep(tMax / 8), ystep = o.ystep ?? niceStep(yMax / 6)
  const yTop = Math.ceil((yMax * 1.05) / ystep) * ystep
  const g = graphFigure({ xMin: 0, xMax: tMax, yMin: 0, yMax: yTop, step: xstep, labelStep: xstep * (tMax / xstep > 8 ? 2 : 1), ystep, ylabelStep: ystep * (yTop / ystep > 7 ? 2 : 1) })
  g.plot(f)
  if (o.hline !== undefined) g.plot(() => o.hline!, { color: AXIS, dashed: true })
  if (o.mark) g.point('M', o.mark[0], o.mark[1], '', 'ne')
  if (o.names) g.figure.axes!.names = o.names
  g.figure.caption = o.caption ?? ''
  return g.figure
}

// ── Palier 1 : rappels en contexte ──────────────────────────────────────
const p1: Maker[] = [
  // Suites arithmétiques en contexte
  fresh(variants(
    () => {
      const a = randInt(20, 60) * 10, rr = randInt(1, 6) * 5, n = randInt(3, 12), y0 = randInt(2020, 2026)
      return N(`Un abonnement coûte ${a} € en ${y0} et son prix augmente de ${rr} € chaque année. Combien coûtera-t-il en ${y0 + n} ?`, a + n * rr, `Suite arithmétique de raison ${rr} : u_n = ${a} + ${rr}n. En ${y0 + n}, n = ${n} : ${a} + ${rr} × ${n} = ${a + n * rr} €.`)
    },
    () => {
      const v = randInt(30, 90) * 100, d = randInt(4, 25) * 10, n = randInt(5, 20)
      return N(`Un réservoir contient ${big(v)} L d’eau ; il en perd ${d} L chaque jour, sans être rempli. Combien de litres contiendra-t-il au bout de ${n} jours ?`, v - n * d, `Suite arithmétique de raison −${d} : ${big(v)} − ${d} × ${n} = ${big(v - n * d)} L.`)
    },
    () => {
      const d = randInt(3, 8), rr = pick([0.5, 1, 1.5, 2]), n = randInt(4, 12)
      return N(`Pour préparer un semi-marathon, ${prenom()} court ${d} km la première semaine, puis ajoute ${fmt(rr)} km chaque semaine. Quelle distance (en km) courra-t-on la ${n}e semaine de ce programme ?`, d + (n - 1) * rr, `La 1re semaine correspond à u₁ = ${d} : u_n = ${d} + ${fmt(rr)}(n − 1). Semaine ${n} : ${d} + ${fmt(rr)} × ${n - 1} = ${fmt(d + (n - 1) * rr)} km (attention au décalage d’indice).`)
    },
    () => {
      const u0 = randInt(-20, 50), rr = pick([-7, -4, -3, 2, 3, 5, 8, 12]), n = randInt(5, 30)
      return N(`(u_n) est la suite arithmétique de premier terme u₀ = ${fmt(u0)} et de raison ${fmt(rr)}. Que vaut ${u(n)} ?`, u0 + n * rr, `u_n = u₀ + nr : ${fmt(u0)} + ${n} × ${rr < 0 ? `(${fmt(rr)})` : rr} = ${fmt(u0 + n * rr)}.`)
    },
  )),
  // Coefficients multiplicateurs et taux
  fresh(variants(
    () => {
      const t = pick([2, 3, 4, 5, 8, 12, 15, 20, 25, 30, 35, 50, 1.5, 2.5])
      return N(`Augmenter un prix de ${fmt(t)} % revient à le multiplier par quel nombre ?`, 1 + t / 100, `Coefficient multiplicateur : 1 + ${F(fmt(t), 100)} = ${fmt(1 + t / 100)}.`)
    },
    () => {
      const t = pick([2, 3, 5, 8, 10, 12, 15, 20, 25, 30, 40, 60, 2.5])
      return N(`Une baisse de ${fmt(t)} % revient à multiplier par quel nombre ?`, 1 - t / 100, `Coefficient multiplicateur : 1 − ${F(fmt(t), 100)} = ${fmt(1 - t / 100)}.`)
    },
    () => {
      const a = pick([40, 50, 60, 80, 120, 150, 200, 250, 400, 500]), t = pick([-30, -25, -20, -15, -12, -10, -5, 5, 10, 15, 20, 25, 30, 40, 60])
      const b = a * (1 + t / 100)
      const obj = pick(['Le prix d’un vélo', 'Le loyer mensuel d’un studio', 'Le nombre d’adhérents d’un club', 'Le prix d’un sac de blé', 'La fréquentation d’un musée'])
      return N(`${obj} passe de ${a} à ${fmt(b)}. Quel est le taux d’évolution, en % ? (négatif en cas de baisse)`, t, `Taux = ${F(`${fmt(b)} − ${a}`, a)} = ${F(fmt(b - a), a)} = ${fmt(t / 100)}, soit ${fmt(t)} %.`)
    },
    () => {
      const p = pick([20, 40, 50, 60, 80, 120, 150, 250, 300]), t = pick([5, 10, 15, 20, 25, 30, 12, 8])
      const up = Math.random() < 0.5
      const v = p * (1 + (up ? t : -t) / 100)
      return N(`Un article coûte ${p} €. Son prix ${up ? 'augmente' : 'baisse'} de ${t} %. Quel est son nouveau prix, en € ?`, v, `${p} × ${fmt(1 + (up ? t : -t) / 100)} = ${fmt(v)} €.`)
    },
    () => {
      const [t, b, p] = retry(() => {
        const t = pick([10, 20, 25, 40, 50, 60, 75, 80]), b = pick([30, 45, 60, 72, 90, 96, 120, 150, 180, 240, 300])
        const p = r(b / (1 - t / 100), 6)
        return Number.isInteger(p * 100) && [t, b, p]
      })
      return N(`Après une baisse de ${t} %, un manteau coûte ${b} €. Quel était son prix initial, en € ?`, p, `Prix initial × ${fmt(1 - t / 100)} = ${b}, donc prix initial = ${b} ÷ ${fmt(1 - t / 100)} = ${fmt(p)} €.`)
    },
  )),
  // Suites géométriques en contexte
  fresh(variants(
    () => {
      const n0 = pick([100, 200, 300, 500, 50, 1000]), n = randInt(3, 8)
      return N(`Une culture compte ${n0} bactéries ; leur nombre double chaque heure. Combien y en aura-t-il au bout de ${n} heures ?`, n0 * 2 ** n, `Suite géométrique de raison 2 : ${n0} × 2^${n} = ${n0} × ${2 ** n} = ${big(n0 * 2 ** n)}.`)
    },
    () => {
      const c = pick([1000, 2000, 5000, 1500, 3000, 10000]), t = pick([2, 3, 4, 5]), n = 2
      const v = c * (1 + t / 100) ** n
      return approx(`On place ${big(c)} € à ${t} % par an, à intérêts composés. Quelle sera la valeur du placement au bout de ${n} ans, au centime près ?`, v, 2, `Chaque année, on multiplie par ${fmt(1 + t / 100)} : ${big(c)} × ${fmt(1 + t / 100)}² = ${fmt(r(v, 2))} €.`, '€')
    },
    () => {
      const v = pick([10000, 20000, 15000, 25000, 30000]), t = pick([10, 15, 20, 25])
      const n = 2
      const w = v * (1 - t / 100) ** n
      return N(`Une voiture neuve vaut ${big(v)} € ; elle perd ${t} % de sa valeur chaque année. Que vaut-elle au bout de ${n} ans, en € ?`, w, `On multiplie deux fois par ${fmt(1 - t / 100)} : ${big(v)} × ${fmt(1 - t / 100)}² = ${big(v)} × ${fmt((1 - t / 100) ** 2)} = ${big(w)} €.`)
    },
    () => {
      const u0 = randInt(1, 6), q = pick([2, 3, -2, 5]), n = randInt(3, 5)
      return N(`(u_n) est la suite géométrique de premier terme u₀ = ${u0} et de raison ${fmt(q)}. Que vaut ${u(n)} ?`, u0 * q ** n, `u_n = u₀ × q^n : ${u0} × ${q < 0 ? `(${fmt(q)})` : q}^${n} = ${fmt(u0 * q ** n)}.`)
    },
  )),
  // Modèles exponentiels simples
  fresh(variants(
    () => {
      const n0 = pick([100, 200, 250, 400, 500]), T0 = pick([3, 5, 10, 20, 25]), k = randInt(2, 4)
      return N(`Une population double tous les ${T0} ans. Elle compte aujourd’hui ${n0} individus. Combien en comptera-t-elle dans ${k * T0} ans ?`, n0 * 2 ** k, `${k * T0} ans = ${k} doublements : ${n0} × 2^${k} = ${big(n0 * 2 ** k)}.`)
    },
    () => {
      const m = pick([80, 160, 200, 320, 400, 640]), T0 = pick([5, 8, 12, 30, 6]), k = randInt(2, 4)
      return N(`Un produit radioactif a une demi-vie de ${T0} jours : sa masse est divisée par 2 tous les ${T0} jours. Il en reste ${m} g aujourd’hui. Quelle masse restera-t-il dans ${k * T0} jours, en g ?`, m / 2 ** k, `${k * T0} jours = ${k} demi-vies : ${m} ÷ 2^${k} = ${fmt(m / 2 ** k)} g.`)
    },
    () => {
      const A = pick([100, 200, 300, 500]), [k, t] = pick([[0.1, 5], [0.1, 10], [0.2, 5], [0.05, 10], [0.05, 5], [0.2, 10], [0.25, 4], [0.5, 2], [0.5, 4]])
      const kt = r(k * t, 2)
      const ek = { 0.5: 1.6487, 1: 2.7183, 2: 7.3891, 0.25: 1.2840 }[kt]!
      return approx(`On modélise un nombre d’abonnés par N(t) = ${A} e^{${fmt(k)}t} (t en mois). On donne e^{${fmt(kt)}} ≈ ${fmt(ek)}. Calcule N(${t}), arrondi à l’unité.`, A * Math.exp(kt), 0, `N(${t}) = ${A} e^{${fmt(k)} × ${t}} = ${A} e^{${fmt(kt)}} ≈ ${A} × ${fmt(ek)} ≈ ${fmt(r(A * Math.exp(kt), 0))}.`)
    },
    () => {
      const A = pick([20, 50, 80, 100, 150]), B = pick([5, 10, 12, 15, 18, 20, 25]), k = pick([0.1, 0.2, 0.3, 0.05])
      return N(`La température d’un plat sorti du four est modélisée par T(t) = ${B} + ${A} e^{−${fmt(k)}t} (t en minutes). Vers quelle température tend-elle quand t devient très grand ?`, B, `e^{−${fmt(k)}t} tend vers 0 quand t → +∞, donc T(t) tend vers ${B} °C (la température de la pièce).`)
    },
  )),
  // Prévisions avec une droite d'ajustement
  fresh(variants(
    () => {
      const a = pick([1.5, 2, 2.5, 3, 4, 5, 1.2]), b = randInt(10, 60), x0 = randInt(8, 15)
      return N(`Une droite d’ajustement du nombre de visiteurs (en milliers) en fonction du rang x de l’année est y = ${fmt(a)}x + ${b}. Quelle est la prévision pour x = ${x0} (en milliers) ?`, a * x0 + b, `y = ${fmt(a)} × ${x0} + ${b} = ${fmt(a * x0 + b)} milliers de visiteurs.`)
    },
    () => {
      const a = pick([2, 2.5, 4, 5, 1.5]), b = randInt(10, 60), x0 = randInt(10, 20), y0 = a * x0 + b
      return N(`Le chiffre d’affaires (en k€) d’une boutique est ajusté par y = ${fmt(a)}x + ${b}, où x est le rang du mois. À partir de quel rang x la prévision atteint-elle ${fmt(y0)} k€ ?`, x0, `${fmt(a)}x + ${b} = ${fmt(y0)} ⇔ x = ${F(`${fmt(y0)} − ${b}`, fmt(a))} = ${x0}.`)
    },
    () => {
      const a = pick([1.5, 2, 2.5, 3]), b = randInt(5, 20), xs = [1, 2, 3, 4, 5, 6]
      const pts: [number, number][] = xs.map((x) => [x, r(a * x + b + (Math.random() - 0.5) * 2 * a, 1)])
      const x0 = randInt(8, 10)
      return withFig(N(`Le nuage ci-dessous représente une production y (en tonnes) selon l’année x. On l’ajuste par la droite d’équation y = ${fmt(a)}x + ${b}. Quelle production prévoit-on pour x = ${x0} ?`, a * x0 + b, `y = ${fmt(a)} × ${x0} + ${b} = ${fmt(a * x0 + b)} tonnes.`), scatter(pts, { line: [a, b], xMax: x0 + 1, extra: [x0, a * x0 + b] }))
    },
    () => {
      const a = pick([2, 3, 1.5, 0.5]), b = randInt(20, 60), x0 = randInt(2, 9), e = pick([-4, -3, -2, 2, 3, 5, 1.5, -1.5])
      const yobs = a * x0 + b + e
      return N(`Un ajustement donne y = ${fmt(a)}x + ${b}. Pour x = ${x0}, on a observé y = ${fmt(yobs)}. Quel est l’écart « observé − estimé » (le résidu) ?`, e, `Valeur estimée : ${fmt(a)} × ${x0} + ${b} = ${fmt(a * x0 + b)}. Résidu : ${fmt(yobs)} − ${fmt(a * x0 + b)} = ${fmt(e)}.`)
    },
  )),
]

// ── Palier 2 ────────────────────────────────────────────────────────────
const p2: Maker[] = [
  // Évolutions successives et réciproques
  fresh(variants(
    () => {
      const t1 = pick([10, 20, 30, 50, 25, 40]), t2 = pick([10, 20, 30, 50, 25, 40])
      const g = (1 + t1 / 100) * (1 - t2 / 100) - 1
      return N(`Un prix augmente de ${t1} %, puis baisse de ${t2} %. Quel est le taux d’évolution global, en % ? (négatif en cas de baisse)`, r(g * 100, 4), `Coefficient global : ${fmt(1 + t1 / 100)} × ${fmt(1 - t2 / 100)} = ${fmt(r(1 + g, 4))}, soit ${sgnPct(g)}. Les pourcentages ne s’additionnent pas !`)
    },
    () => {
      const t1 = pick([10, 20, 5, 50, 25]), t2 = pick([10, 20, 5, 50, 30])
      const g = (1 + t1 / 100) * (1 + t2 / 100) - 1
      return N(`Un loyer augmente de ${t1} % une année, puis de ${t2} % l’année suivante. Quel est le taux d’augmentation global, en % ?`, r(g * 100, 4), `Coefficient global : ${fmt(1 + t1 / 100)} × ${fmt(1 + t2 / 100)} = ${fmt(r(1 + g, 4))}, soit +${fmt(r(g * 100, 2))} % (et non ${t1 + t2} %).`)
    },
    () => {
      const t = pick([20, 50, 25, 10, 40, 60, 75])
      const u = (1 / (1 - t / 100) - 1) * 100
      return approx(`Après une baisse de ${t} %, de quel pourcentage faut-il augmenter un prix pour revenir à sa valeur de départ ? (arrondi à 0,01 %)`, u, 2, `Il faut multiplier par ${F(1, fmt(1 - t / 100))} ≈ ${fmt(r(1 / (1 - t / 100), 4))}, soit une hausse d’environ ${fmt(r(u, 2))} %.`, '%')
    },
    () => {
      const t = pick([10, 20, 5]), n = pick([2, 3])
      const g = ((1 + t / 100) ** n - 1) * 100
      return N(`Un salaire augmente de ${t} % par an pendant ${n} ans. Quel est le taux d’augmentation global, en % ?`, r(g, 4), `Coefficient global : ${fmt(1 + t / 100)}^${n} = ${fmt(r((1 + t / 100) ** n, 4))}, soit +${fmt(r(g, 2))} %.`)
    },
  )),
  // Sommes de termes
  fresh(variants(
    () => {
      const s = randInt(18, 30) * 1000, rr = randInt(3, 12) * 100, n = randInt(5, 10)
      const tot = n * s + (rr * n * (n - 1)) / 2
      return N(`Un salarié gagne ${big(s)} € la première année, puis son salaire annuel augmente de ${big(rr)} € chaque année. Combien gagne-t-il au total sur ${n} ans ?`, tot, `Somme de ${n} termes d’une suite arithmétique : ${n} × ${F(`premier + dernier`, 2)} = ${n} × ${F(`${big(s)} + ${big(s + (n - 1) * rr)}`, 2)} = ${big(tot)} €.`)
    },
    () => {
      const n = randInt(6, 14)
      return N(`Un roi offre 1 grain de blé le 1er jour, 2 le 2e jour, 4 le 3e jour, et ainsi de suite en doublant chaque jour. Combien de grains a-t-il donnés en tout au bout de ${n} jours ?`, 2 ** n - 1, `1 + 2 + … + 2^${n - 1} = ${F(`2^${n} − 1`, '2 − 1')} = ${2 ** n} − 1 = ${big(2 ** n - 1)}.`)
    },
    () => {
      const q = pick([3, 2, 5]), n = randInt(3, 6), a = randInt(1, 4)
      const s = (a * (q ** (n + 1) - 1)) / (q - 1)
      return N(`Calcule la somme S = ${a === 1 ? '' : `${a} × (`}1 + ${q} + ${q}² + … + ${q}^${n}${a === 1 ? '' : ')'}.`, s, `1 + q + … + q^n = ${F('qⁿ⁺¹ − 1', 'q − 1')} : ${F(`${q}^${n + 1} − 1`, q - 1)} = ${(q ** (n + 1) - 1) / (q - 1)}${a === 1 ? '' : `, puis × ${a} = ${s}`}.`)
    },
    () => {
      const d = randInt(2, 8) * 100, rr = randInt(1, 5) * 100, n = randInt(5, 15)
      const tot = n * d + (rr * n * (n - 1)) / 2
      return N(`En rééducation, ${prenom()} marche ${d} m le premier jour, puis ${rr} m de plus chaque jour. Quelle distance totale (en m) aura été parcourue au bout de ${n} jours ?`, tot, `Somme arithmétique : ${n} × ${F(`${d} + ${d + (n - 1) * rr}`, 2)} = ${big(tot)} m.`)
    },
  )),
  // Point moyen et droite d'ajustement
  fresh(variants(
    () => {
      const xs = [1, 2, 3, 4, 5].slice(0, randInt(4, 5)), ys = xs.map(() => randInt(10, 40))
      const xm = xs.reduce((s, v) => s + v, 0) / xs.length, ym = ys.reduce((s, v) => s + v, 0) / ys.length
      return pair(`On relève les ventes y (en centaines) selon le mois x : ${xs.map((x, i) => `(${x} ; ${ys[i]})`).join(', ')}. Quelles sont les coordonnées du point moyen G du nuage ?`, xm, ym, {
        explanation: `x̄ = ${F(xs.join(' + '), xs.length)} = ${fmt(xm)} et ȳ = ${F(ys.join(' + '), ys.length)} = ${fmt(ym)}.`,
      })
    },
    () => {
      const xm = pick([3, 4, 5, 6, 2.5, 3.5]), ym = randInt(20, 80), a = pick([1.5, 2, 2.5, 3, 4, -2, -1.5])
      const b = ym - a * xm
      return N(`La droite d’ajustement de y en x passe par le point moyen G(${fmt(xm)} ; ${ym}) et a pour coefficient directeur ${fmt(a)}. Quelle est son ordonnée à l’origine b ?`, b, `G est sur la droite : ${ym} = ${fmt(a)} × ${fmt(xm)} + b, donc b = ${ym} − ${a * xm < 0 ? `(${fmt(a * xm)})` : fmt(a * xm)} = ${fmt(b)}.`)
    },
    () => {
      const a = pick([0.8, 1.2, 2.5, 3.5, 12, 15, 25]), b = randInt(5, 50), k = pick([2, 3, 4, 5, 10])
      const ctx = pick(['le prix d’une maison (en k€) en fonction de sa surface (en m²)', 'la consommation (en L) en fonction de la distance (en dizaines de km)', 'le chiffre d’affaires (en k€) en fonction du budget publicitaire (en k€)'])
      return N(`On ajuste ${ctx} par y = ${fmt(a)}x + ${b}. De combien augmente la valeur estimée de y quand x augmente de ${k} ?`, a * k, `Le coefficient directeur ${fmt(a)} est l’augmentation de y pour 1 unité de x : pour ${k} unités, ${fmt(a)} × ${k} = ${fmt(a * k)}.`)
    },
    () => {
      const xs = [1, 2, 3, 4, 5, 6], ys = retry(() => { const ys = xs.map(() => randInt(10, 50)); return ys.reduce((s, v) => s + v, 0) % 3 === 0 && ys })
      const ym = ys.reduce((s, v) => s + v, 0) / 6
      return withFig(N(`Le nuage ci-dessous représente la fréquentation y (en centaines) d’une salle de sport selon le mois x : ${ys.join(' ; ')}. Quelle est l’ordonnée ȳ du point moyen ?`, ym, `ȳ = ${F(ys.join(' + '), 6)} = ${F(ys.reduce((s, v) => s + v, 0), 6)} = ${fmt(ym)}.`),
        scatter(xs.map((x, i) => [x, ys[i]]), { xMax: 7 }))
    },
  )),
  // Loi binomiale : premiers calculs
  fresh(variants(
    () => {
      const n = pick([20, 50, 100, 200, 40, 30]), p = pick([0.1, 0.2, 0.05, 0.3, 0.15, 0.4])
      const ctx = pick([`Dans un magasin, chaque client achète (indépendamment) avec probabilité ${fmt(p)}. ${n} clients entrent.`, `Un archer touche la cible avec probabilité ${fmt(p)} à chaque tir. Il tire ${n} flèches.`, `Chaque graine germe avec probabilité ${fmt(p)}. On sème ${n} graines.`])
      return N(`${ctx} X compte les succès. Quelle est l’espérance de X ?`, n * p, `X suit la loi binomiale B(${n} ; ${fmt(p)}) : E(X) = np = ${n} × ${fmt(p)} = ${fmt(n * p)}.`)
    },
    () => {
      const [n, p] = pick([[2, 0.1], [3, 0.5], [2, 0.2], [3, 0.1], [2, 0.3], [4, 0.5], [3, 0.2]])
      return N(`Un test est réussi avec probabilité ${fmt(p)}, indépendamment. On le passe ${n} fois. Quelle est la probabilité de n’en réussir aucun ?`, r((1 - p) ** n, 6), `P(X = 0) = (1 − ${fmt(p)})^${n} = ${fmt(1 - p)}^${n} = ${fmt(r((1 - p) ** n, 6))}.`)
    },
    () => {
      const [n, p] = pick([[2, 0.9], [3, 0.5], [2, 0.8], [3, 0.9], [2, 0.7], [4, 0.5], [3, 0.8]])
      return N(`Un archer touche la cible avec probabilité ${fmt(p)} à chaque tir, indépendamment. Il tire ${n} fois. Quelle est la probabilité qu’il touche à chaque fois ?`, r(p ** n, 6), `P(X = ${n}) = ${fmt(p)}^${n} = ${fmt(r(p ** n, 6))}.`)
    },
    () => {
      const n = pick([10, 20, 25, 50, 100, 16]), p = pick([0.5, 0.2, 0.1, 0.4, 0.8])
      return N(`X suit la loi binomiale de paramètres n = ${n} et p = ${fmt(p)}. Que vaut la variance V(X) ?`, r(n * p * (1 - p), 6), `V(X) = np(1 − p) = ${n} × ${fmt(p)} × ${fmt(1 - p)} = ${fmt(r(n * p * (1 - p), 6))}.`)
    },
  )),
  // Puissances et logarithmes : résoudre
  fresh(variants(
    () => {
      const s = randInt(20, 5000)
      const n = Math.ceil(Math.log2(s + 0.5))
      return N(`Quel est le plus petit entier n tel que 2^n ≥ ${big(s)} ?`, n, `2^${n - 1} = ${big(2 ** (n - 1))} < ${big(s)} ≤ 2^${n} = ${big(2 ** n)}.`)
    },
    () => {
      const k = pick([0.5, 0.2, 0.25, 0.1, 0.05]), a = pick([2, 3, 5, 10])
      const t = ln(a) / k
      return approx(`Résous e^{${fmt(k)}t} = ${a}. On donne ln ${a} ≈ ${lnv(a)}. Donne t arrondi à 0,01.`, t, 2, `e^{${fmt(k)}t} = ${a} ⇔ ${fmt(k)}t = ln ${a} ⇔ t = ${F(`ln ${a}`, fmt(k))} ≈ ${F(lnv(a), fmt(k))} ≈ ${fmt(r(t, 2))}.`)
    },
    () => {
      const [a, b] = retry(() => { const a = pick([2, 3, 5, 7]), b = pick([3, 5, 10, 11]); return a !== b && [a, b] })
      const op = pick(['×', '/'] as const)
      const v = op === '×' ? ln(a) + ln(b) : ln(a) - ln(b)
      return approx(`On donne ln ${a} ≈ ${lnv(a, 3)} et ln ${b} ≈ ${lnv(b, 3)}. Calcule ${op === '×' ? `ln ${a * b}` : `ln(${F(a, b)})`}, arrondi à 0,001.`, v, 3, op === '×' ? `ln(${a} × ${b}) = ln ${a} + ln ${b} ≈ ${lnv(a, 3)} + ${lnv(b, 3)} = ${fmt(r(r(ln(a), 3) + r(ln(b), 3), 3))}.` : `ln(${F(a, b)}) = ln ${a} − ln ${b} ≈ ${lnv(a, 3)} − ${lnv(b, 3)} = ${fmt(r(r(ln(a), 3) - r(ln(b), 3), 3))}.`)
    },
    () => {
      const q = pick([3, 1.5, 2, 5, 1.2]), s = pick([20, 50, 100, 10, 1000])
      const x = ln(s) / ln(q)
      return approx(`Résous ${fmt(q)}^x = ${s}. On donne ln ${fmt(q)} ≈ ${lnv(q)} et ln ${s} ≈ ${lnv(s)}. Donne x arrondi à 0,01.`, x, 2, `On passe au logarithme : x ln ${fmt(q)} = ln ${s}, donc x = ${F(`ln ${s}`, `ln ${fmt(q)}`)} ≈ ${F(lnv(s), lnv(q))} ≈ ${fmt(r(x, 2))}.`)
    },
  )),
]

// ── Palier 3 : exercices standard ───────────────────────────────────────
/** Taux globaux « ronds » sur n périodes : coefficient (1 + t)^n avec t entier en %. */
const ROUND_RATES = [-20, -10, -5, 5, 6, 8, 10, 15, 20, 25, 30, 50]
const p3: Maker[] = [
  // Taux d'évolution moyen
  fresh(variants(
    () => {
      const t = pick(ROUND_RATES), n = 2
      const g = ((1 + t / 100) ** n - 1) * 100
      return N(`Le prix d’une matière première a évolué de ${sgnPct(g / 100)} en ${n} ans. Quel est le taux d’évolution annuel moyen, en % ?`, t, `On cherche t tel que (1 + t)² = ${fmt(r((1 + t / 100) ** n, 6))} : 1 + t = √{${fmt(r((1 + t / 100) ** n, 6))}} = ${fmt(1 + t / 100)}, soit ${fmt(t)} % par an.`)
    },
    () => {
      const t = pick([-10, 10, 20, 5, 30, -20, 50]), n = 3
      const c = (1 + t / 100) ** n
      return N(`Une population a été multipliée par ${fmt(r(c, 6))} en ${n} ans. Quel est son taux d’évolution annuel moyen, en % ?`, t, `On cherche le coefficient annuel c tel que c³ = ${fmt(r(c, 6))} : c = ${fmt(1 + t / 100)} (car ${fmt(1 + t / 100)}³ = ${fmt(r(c, 6))}), soit ${fmt(t)} % par an.`)
    },
    () => {
      const [t, n, a, b] = retry(() => {
        const t = pick([10, 20, 25, 50, -10, -20]), n = pick([2, 3]), a = pick([100, 200, 400, 800, 1000, 1600])
        const b = r(a * (1 + t / 100) ** n, 6)
        return Number.isInteger(b) && [t, n, a, b]
      })
      return N(`Le nombre d’adhérents d’un club passe de ${a} à ${fmt(b)} en ${n} ans. Quel est le taux d’évolution annuel moyen, en % ?`, t, `Coefficient global : ${F(fmt(b), a)} = ${fmt(r(b / a, 6))}. Coefficient annuel : ${fmt(r(b / a, 6))}^{1/${n}} = ${fmt(1 + t / 100)}, soit ${fmt(t)} % par an.`)
    },
    () => {
      const g = pick([1.5, 2, 1.8, 3, 2.5, 1.3]), n = pick([5, 10, 4, 8])
      const c = g ** (1 / n)
      return approx(`Le chiffre d’affaires d’une entreprise a été multiplié par ${fmt(g)} en ${n} ans. On donne ${fmt(g)}^{1/${n}} ≈ ${fmt(r(c, 4))}. Quel est le taux d’évolution annuel moyen, en % (arrondi à 0,01) ?`, (c - 1) * 100, 2, `Coefficient annuel moyen : ${fmt(g)}^{1/${n}} ≈ ${fmt(r(c, 4))}, soit un taux d’environ ${fmt(r((c - 1) * 100, 2))} % par an.`, '%')
    },
  )),
  // Seuils avec le logarithme
  fresh(variants(
    () => {
      const t = pick([3, 4, 5, 6, 7, 10]), q = 1 + t / 100
      const x = ln(2) / ln(q)
      const n = Math.ceil(x)
      return N(`Un capital est placé à ${t} % par an (intérêts composés). Au bout de combien d’années entières aura-t-il doublé ? On donne ln 2 ≈ 0,6931 et ln ${fmt(q)} ≈ ${lnv(q)}.`, n, `On cherche le plus petit n tel que ${fmt(q)}^n ≥ 2 ⇔ n ≥ ${F('ln 2', `ln ${fmt(q)}`)} ≈ ${fmt(r(x, 2))}. Donc n = ${n}.`)
    },
    () => {
      const [q, s] = retry(() => { const q = pick([0.85, 0.8, 0.9, 0.7, 0.75]), s = pick([0.1, 0.05, 0.2, 0.01]); return clear(ln(s) / ln(q)) && [q, s] })
      const x = ln(s) / ln(q), n = Math.ceil(x)
      return N(`Un médicament est éliminé à raison de ${fmt(r((1 - q) * 100))} % par heure. Au bout de combien d’heures entières en restera-t-il moins de ${fmt(s * 100)} % ? On donne ln ${fmt(s)} ≈ ${lnv(s)} et ln ${fmt(q)} ≈ ${lnv(q)}.`, n, `On cherche n tel que ${fmt(q)}^n < ${fmt(s)} ⇔ n ln ${fmt(q)} < ln ${fmt(s)} ⇔ n > ${F(`ln ${fmt(s)}`, `ln ${fmt(q)}`)} ≈ ${fmt(r(x, 2))} (on divise par un nombre négatif : le sens change). Donc n = ${n}.`)
    },
    () => {
      const [p0, p1, t] = retry(() => {
        const p0 = pick([2000, 5000, 10000, 8000]), m = pick([1.5, 2, 3]), t = pick([2, 3, 4, 5])
        const x = ln(m) / ln(1 + t / 100)
        return x - Math.floor(x) > 0.05 && x - Math.floor(x) < 0.95 && [p0, p0 * m, t]
      })
      const q = 1 + t / 100, x = ln(p1 / p0) / ln(q)
      return N(`Une ville de ${big(p0)} habitants gagne ${t} % d’habitants par an. Au bout de combien d’années dépassera-t-elle ${big(p1)} habitants ? On donne ln ${fmt(p1 / p0)} ≈ ${lnv(p1 / p0)} et ln ${fmt(q)} ≈ ${lnv(q)}.`, Math.ceil(x), `${big(p0)} × ${fmt(q)}^n > ${big(p1)} ⇔ ${fmt(q)}^n > ${fmt(p1 / p0)} ⇔ n > ${F(`ln ${fmt(p1 / p0)}`, `ln ${fmt(q)}`)} ≈ ${fmt(r(x, 2))}. Donc ${Math.ceil(x)} ans.`)
    },
    () => {
      const [q, v0, s] = retry(() => { const q = pick([0.9, 0.8, 0.95, 0.85]), v0 = pick([20000, 30000, 15000, 25000]), s = pick([5000, 10000, 8000]); return clear(ln(s / v0) / ln(q)) && [q, v0, s] })
      const x = ln(s / v0) / ln(q), n = Math.ceil(x)
      return N(`Une machine achetée ${big(v0)} € perd ${fmt(r((1 - q) * 100))} % de sa valeur par an. Au bout de combien d’années entières vaudra-t-elle moins de ${big(s)} € ? On donne ln ${fmt(r(s / v0, 4))} ≈ ${lnv(s / v0)} et ln ${fmt(q)} ≈ ${lnv(q)}.`, n, `${fmt(q)}^n < ${F(big(s), big(v0))} ⇔ n > ${F(`ln ${fmt(r(s / v0, 4))}`, `ln ${fmt(q)}`)} ≈ ${fmt(r(x, 2))} (division par un nombre négatif). Donc n = ${n}.`)
    },
  )),
  // Modèles exponentiels N0 e^{kt}
  fresh(variants(
    () => {
      const k = pick([0.02, 0.05, 0.1, 0.035, 0.07, 0.04, 0.025])
      return approx(`Une population suit le modèle N(t) = N₀ e^{${fmt(k)}t} (t en années). Quel est son temps de doublement, en années ? On donne ln 2 ≈ 0,693. Arrondis à 0,1.`, ln(2) / k, 1, `N(t) = 2N₀ ⇔ e^{${fmt(k)}t} = 2 ⇔ t = ${F('ln 2', fmt(k))} ≈ ${fmt(r(ln(2) / k, 2))} ans.`)
    },
    () => {
      const k = pick([0.1, 0.05, 0.2, 0.15, 0.025, 0.3])
      return approx(`La masse d’un échantillon radioactif suit m(t) = m₀ e^{−${fmt(k)}t} (t en jours). Quelle est sa demi-vie, en jours ? On donne ln 2 ≈ 0,693. Arrondis à 0,1.`, ln(2) / k, 1, `m(t) = ${F('m₀', 2)} ⇔ e^{−${fmt(k)}t} = ${F(1, 2)} ⇔ −${fmt(k)}t = −ln 2 ⇔ t = ${F('ln 2', fmt(k))} ≈ ${fmt(r(ln(2) / k, 2))} jours.`)
    },
    () => {
      const T0 = pick([5, 10, 20, 7, 14, 25, 50]), m = pick([2, 3])
      const k = ln(m) / T0
      return approx(`Une population modélisée par N(t) = N₀ e^{kt} est multipliée par ${m} en ${T0} ans. Détermine k, arrondi à 0,001. On donne ln ${m} ≈ ${lnv(m)}.`, k, 3, `N(${T0}) = ${m}N₀ ⇔ e^{${T0}k} = ${m} ⇔ k = ${F(`ln ${m}`, T0)} ≈ ${fmt(r(k, 4))}.`)
    },
    () => {
      const T0 = pick([3, 5, 8, 10, 12]), j = pick([2, 3, 4]), n0 = pick([100, 150, 250, 500])
      return N(`Une colonie suit le modèle N(t) = ${n0} e^{kt} avec k = ${F('ln 2', T0)} (t en heures). Combien d’individus compte-t-elle à t = ${j * T0} ?`, n0 * 2 ** j, `e^{kt} = e^{${j * T0} × ln 2/${T0}} = e^{${j} ln 2} = 2^${j} = ${2 ** j}, donc N(${j * T0}) = ${n0} × ${2 ** j} = ${big(n0 * 2 ** j)}.`)
    },
  )),
  // Ajustement par la méthode des moindres carrés
  fresh(variants(
    () => {
      const vx = pick([2, 4, 5, 8, 10, 2.5]), a = pick([1.5, 2, 2.5, 3, -1.2, 0.8, 4])
      const cov = r(a * vx, 4)
      return N(`Pour une série (x ; y), on a calculé la variance V(x) = ${fmt(vx)} et la covariance cov(x ; y) = ${fmt(cov)}. Quel est le coefficient directeur a de la droite des moindres carrés de y en x ?`, a, `a = ${F('cov(x ; y)', 'V(x)')} = ${F(fmt(cov), fmt(vx))} = ${fmt(a)}.`)
    },
    () => {
      const xm = pick([3, 4, 5, 2.5, 3.5, 6]), ym = randInt(20, 90), a = pick([1.5, 2, 2.5, 3, -1.2, 0.8, 4])
      const b = r(ym - a * xm, 4)
      return N(`La droite des moindres carrés de y en x a pour coefficient directeur a = ${fmt(a)}, et le point moyen est G(${fmt(xm)} ; ${ym}). Calcule l’ordonnée à l’origine b.`, b, `La droite passe par G : b = ȳ − a x̄ = ${ym} − ${a < 0 ? `(${fmt(a)})` : fmt(a)} × ${fmt(xm)} = ${fmt(b)}.`)
    },
    () => {
      const xm = pick([3, 4, 5, 2.5, 6]), ym = randInt(20, 90), a = pick([1.5, 2, 2.5, 3, -1.2, 0.8, 4]), x0 = randInt(8, 14)
      const y0 = r(ym + a * (x0 - xm), 4)
      return N(`Une série a pour point moyen G(${fmt(xm)} ; ${ym}) et pour droite des moindres carrés une droite de coefficient directeur ${fmt(a)}. Quelle valeur de y cette droite prévoit-elle pour x = ${x0} ?`, y0, `y = ȳ + a(x − x̄) = ${ym} + ${a < 0 ? `(${fmt(a)})` : fmt(a)} × (${x0} − ${fmt(xm)}) = ${fmt(y0)}.`)
    },
    () => {
      const [sx, sy, rho] = pick([[4, 5, 0.6], [2, 5, 0.8], [3, 4, 0.9], [5, 8, 0.75], [2, 3, -0.5], [4, 10, -0.8], [6, 5, 0.95]])
      const cov = r(rho * sx * sy, 4)
      return N(`Pour une série (x ; y), on donne les écarts-types σ_x = ${sx}, σ_y = ${sy} et la covariance cov(x ; y) = ${fmt(cov)}. Quel est le coefficient de corrélation linéaire r ?`, rho, `r = ${F('cov(x ; y)', 'σ_x σ_y')} = ${F(fmt(cov), `${sx} × ${sy}`)} = ${fmt(rho)}. ${Math.abs(rho) >= 0.8 ? 'Un ajustement affine est pertinent.' : 'La corrélation est modérée.'}`)
    },
  )),
  // Lois géométrique et binomiale en contexte
  fresh(variants(
    () => {
      const k = randInt(2, 4)
      return prob(`On lance un dé équilibré jusqu’à obtenir un 6. Quelle est la probabilité que le premier 6 apparaisse au lancer n° ${k} ?`, 5 ** (k - 1), 6 ** k, `Loi géométrique de paramètre ${F(1, 6)} : P(X = ${k}) = (${F(5, 6)})^${k - 1} × ${F(1, 6)} = ${F(5 ** (k - 1), 6 ** k)}`)
    },
    () => {
      const p = pick([0.1, 0.2, 0.25, 0.05, 0.04, 0.02, 0.5])
      const ctx = pick(['Un commercial conclut une vente à chaque appel avec probabilité', 'Un joueur gagne à chaque partie avec probabilité', 'Une pièce produite est défectueuse avec probabilité'])
      return N(`${ctx} ${fmt(p)}, indépendamment. En moyenne, au bout de combien d’essais obtient-on le premier succès ?`, 1 / p, `Le rang du premier succès suit une loi géométrique de paramètre ${fmt(p)} : E(X) = ${F(1, 'p')} = ${F(1, fmt(p))} = ${fmt(1 / p)}.`)
    },
    () => {
      const [n, p] = pick([[3, 0.2], [3, 0.5], [2, 0.3], [3, 0.1], [4, 0.5], [2, 0.6]])
      const v = n * p * (1 - p) ** (n - 1)
      return N(`Un archer touche la cible avec probabilité ${fmt(p)} à chaque tir, indépendamment. Il tire ${n} fois. Quelle est la probabilité qu’il touche exactement une fois ?`, r(v, 6), `P(X = 1) = ${n} × ${fmt(p)} × ${fmt(1 - p)}^${n - 1} = ${fmt(r(v, 6))} (${n} positions possibles pour le tir réussi).`)
    },
    () => {
      const [n, p] = pick([[2, 0.1], [3, 0.5], [2, 0.2], [3, 0.1], [2, 0.3], [4, 0.5], [3, 0.2]])
      const v = 1 - (1 - p) ** n
      return N(`Chaque ticket d’une loterie est gagnant avec probabilité ${fmt(p)}. On achète ${n} tickets (tirages indépendants). Quelle est la probabilité d’avoir au moins un ticket gagnant ?`, r(v, 6), `P(X ≥ 1) = 1 − P(X = 0) = 1 − ${fmt(1 - p)}^${n} = 1 − ${fmt(r((1 - p) ** n, 6))} = ${fmt(r(v, 6))}.`)
    },
  )),
]

// ── Palier 4 ────────────────────────────────────────────────────────────
const p4: Maker[] = [
  // Modèle logistique
  fresh(variants(
    () => {
      const K = pick([1000, 2000, 5000, 600, 1200, 10000]), a = pick([3, 4, 9, 19, 24, 49]), k = pick([0.5, 0.2, 0.3])
      return N(`Le nombre de personnes informées d’une rumeur est modélisé par f(t) = ${logi(big(K), a, k)} (t en jours). Combien de personnes sont informées à t = 0 ?`, K / (1 + a), `En t = 0, e^{0} = 1 : ${F(big(K), `1 + ${a}`)} = ${big(K / (1 + a))}.`)
    },
    () => {
      const K = pick([1000, 2000, 5000, 800]), a = pick([3, 4, 9, 19, 24, 49, 99]), k = pick([0.5, 0.2, 0.3, 0.4, 0.25])
      const t = ln(a) / k
      return approx(`Une épidémie touche f(t) = ${logi(big(K), a, k)} personnes au jour t. Au bout de combien de jours la moitié de la population limite (${big(K / 2)} personnes) est-elle touchée ? On donne ln ${a} ≈ ${lnv(a)}. Arrondis à 0,1.`, t, 1, `f(t) = ${F(big(K), 2)} ⇔ 1 + ${a}e^{−${fmt(k)}t} = 2 ⇔ e^{−${fmt(k)}t} = ${F(1, a)} ⇔ t = ${F(`ln ${a}`, fmt(k))} ≈ ${fmt(r(t, 2))} jours.`)
    },
    () => {
      const K = pick([1000, 2000, 500, 800]), a = pick([4, 9, 19, 24]), [k, t, e] = pick([[0.2, 10, 0.1353], [0.5, 4, 0.1353], [0.1, 10, 0.3679], [0.3, 10, 0.0498], [0.25, 4, 0.3679], [0.5, 2, 0.3679]])
      const v = K / (1 + a * Math.exp(-k * t))
      return approx(`Les ventes cumulées d’un nouveau produit (en milliers) suivent f(t) = ${logi(big(K), a, k)} (t en mois). On donne e^{−${fmt(r(k * t, 2))}} ≈ ${fmt(e)}. Calcule f(${t}), arrondi à l’unité.`, v, 0, `f(${t}) = ${big(K)} / (1 + ${a} × e^{−${fmt(r(k * t, 2))}}) ≈ ${F(big(K), `1 + ${a} × ${fmt(e)}`)} ≈ ${F(big(K), fmt(r(1 + a * e, 4)))} ≈ ${fmt(r(v, 1))}.`)
    },
    () => {
      const K = pick([100, 200, 500, 1000]), u0 = pick([10, 20, 50]) * K / 100, rr = pick([0.5, 0.2, 0.4, 0.8])
      const u1 = u0 + rr * u0 * (1 - u0 / K)
      return N(`Une population suit le modèle de Verhulst discret uₙ₊₁ = u_n + ${fmt(rr)}u_n(1 − ${F('u_n', big(K))}), avec u₀ = ${fmt(u0)}. Calcule u₁.`, r(u1, 6), `u₁ = ${fmt(u0)} + ${fmt(rr)} × ${fmt(u0)} × (1 − ${F(fmt(u0), big(K))}) = ${fmt(u0)} + ${fmt(r(rr * u0, 6))} × ${fmt(1 - u0 / K)} = ${fmt(r(u1, 6))}.`)
    },
  )),
  // Ajustement exponentiel par changement de variable
  fresh(variants(
    () => {
      const [a, b, x0] = retry(() => { const a = pick([0.2, 0.25, 0.5, 0.1, 0.3]), b = pick([1, 2, 3, 1.5]), v = randInt(2, 12), z = r(a * v + b, 6); return Number.isInteger(z) && z >= 2 && z <= 7 && [a, b, v] })
      const z = r(a * x0 + b, 6)
      const E: Record<number, number> = { 2: 7.389, 3: 20.09, 4: 54.6, 5: 148.4, 6: 403.4, 7: 1096.6 }
      const shown = [z - 1, z, z + 1].filter((v) => E[v]).map((v) => `e^{${v}} ≈ ${fmt(E[v])}`).join(' ; ')
      return approx(`On a ajusté z = ln y en fonction de x par z = ${fmt(a)}x + ${fmt(b)}. Estime y pour x = ${x0}. On donne ${shown}. Arrondis à 0,1.`, Math.exp(z), 1, `z = ${fmt(a)} × ${x0} + ${fmt(b)} = ${z}, donc y = e^{${z}} ≈ ${fmt(E[z])}.`)
    },
    () => {
      const k = pick([0.05, 0.02, 0.1, 0.08, 0.03])
      const e = Math.exp(k)
      return approx(`Un ajustement exponentiel donne y = 250 e^{${fmt(k)}x} (x en années). On donne e^{${fmt(k)}} ≈ ${fmt(r(e, 4))}. Quel taux d’évolution annuel ce modèle traduit-il, en % (arrondi à 0,01) ?`, (e - 1) * 100, 2, `Chaque année, y est multiplié par e^{${fmt(k)}} ≈ ${fmt(r(e, 4))}, soit un taux d’environ ${fmt(r((e - 1) * 100, 2))} %.`, '%')
    },
    () => {
      const [m, dx] = pick([[2, 5], [3, 4], [2, 10], [4, 5], [10, 20], [3, 10], [2, 8]])
      const k = ln(m) / dx
      return approx(`On suppose y = C e^{kx}. On a relevé y = ${pick([50, 120, 200])} pour x = 2 et une valeur ${m} fois plus grande pour x = ${2 + dx}. Détermine k, arrondi à 0,001. On donne ln ${m} ≈ ${lnv(m)}.`, k, 3, `${F('y(x₂)', 'y(x₁)')} = e^{k(x₂ − x₁)} = e^{${dx}k} = ${m}, donc k = ${F(`ln ${m}`, dx)} ≈ ${fmt(r(k, 4))}.`)
    },
    () => {
      const a = pick([0.05, 0.1, 0.2, 0.04, 0.025])
      return approx(`On a ajusté ln y par z = ${fmt(a)}x + 3 (x en années). Au bout de combien d’années la grandeur y double-t-elle, selon ce modèle ? On donne ln 2 ≈ 0,693. Arrondis à 0,1.`, ln(2) / a, 1, `y = e^{3} e^{${fmt(a)}x} : y double quand ${fmt(a)} × Δx = ln 2, soit Δx = ${F('ln 2', fmt(a))} ≈ ${fmt(r(ln(2) / a, 2))} ans.`)
    },
  )),
  // Lois à densité : uniforme et exponentielle
  fresh(variants(
    () => {
      const b = pick([10, 12, 15, 20, 30, 60]), c = randInt(1, b - 1)
      const ctx = pick([`Un bus passe toutes les ${b} minutes ; on arrive à l’arrêt au hasard. Le temps d’attente suit la loi uniforme sur [0 ; ${b}].`, `Un train peut avoir jusqu’à ${b} minutes de retard ; le retard suit la loi uniforme sur [0 ; ${b}].`])
      return N(`${ctx} Quelle est la probabilité d’attendre moins de ${c} minutes ?`, r(c / b, 6), `P(X ≤ ${c}) = ${F(`${c} − 0`, `${b} − 0`)} = ${F(c, b)}${Number.isInteger((c / b) * 1e4) ? ` = ${fmt(c / b)}` : ` ≈ ${fmt(r(c / b, 3))}`}.`)
    },
    () => {
      const a = randInt(0, 30), b = a + pick([10, 20, 30, 40])
      return N(`La durée d’une intervention suit la loi uniforme sur [${a} ; ${b}] (en minutes). Quelle est sa durée moyenne ?`, (a + b) / 2, `Pour la loi uniforme sur [a ; b], E(X) = ${F('a + b', 2)} = ${F(`${a} + ${b}`, 2)} = ${fmt((a + b) / 2)} min.`)
    },
    () => {
      const [lam, t, e] = pick([[0.2, 5, 0.3679], [0.1, 10, 0.3679], [0.5, 2, 0.3679], [0.2, 10, 0.1353], [0.05, 20, 0.3679], [0.01, 100, 0.3679], [0.1, 20, 0.1353]])
      const above = Math.random() < 0.5
      return N(`La durée de vie (en années) d’un composant suit la loi exponentielle de paramètre λ = ${fmt(lam)}. On donne e^{−${fmt(lam * t)}} ≈ ${fmt(e)}. Quelle est la probabilité qu’il fonctionne ${above ? 'plus' : 'moins'} de ${t} ans ?`, above ? e : r(1 - e, 4), above ? `P(X > ${t}) = e^{−λ × ${t}} = e^{−${fmt(lam * t)}} ≈ ${fmt(e)}.` : `P(X ≤ ${t}) = 1 − e^{−λ × ${t}} ≈ 1 − ${fmt(e)} = ${fmt(r(1 - e, 4))}.`)
    },
    () => {
      const lam = pick([0.002, 0.0025, 0.005, 0.01, 0.02, 0.05, 0.001, 0.004])
      return N(`La durée de vie (en heures) d’une ampoule suit la loi exponentielle de paramètre λ = ${fmt(lam)}. Quelle est sa durée de vie moyenne, en heures ?`, r(1 / lam, 6), `E(X) = ${F(1, 'λ')} = ${F(1, fmt(lam))} = ${fmt(r(1 / lam, 6))} heures.`)
    },
  )),
  // Suites arithmético-géométriques en contexte
  fresh(variants(
    () => {
      const q = pick([0.9, 0.8, 0.5, 0.75, 0.6]), b = pick([30, 40, 50, 60, 100, 120])
      const l = b / (1 - q)
      return N(`Chaque année, un lac perd ${fmt(r((1 - q) * 100))} % de ses poissons, et on y réintroduit ${b} poissons. On modélise par uₙ₊₁ = ${fmt(q)}u_n + ${b}. Vers quelle valeur l’effectif se stabilise-t-il ?`, r(l, 6), `L’équilibre vérifie ℓ = ${fmt(q)}ℓ + ${b}, soit ${fmt(r(1 - q, 2))}ℓ = ${b}, d’où ℓ = ${F(b, fmt(r(1 - q, 2)))} = ${fmt(r(l, 2))}.`)
    },
    () => {
      const q = pick([0.9, 0.8, 1.05, 1.1, 0.95]), b = pick([-50, 20, 50, 100, -20, 200]), u0 = pick([500, 1000, 800, 2000])
      const u1 = q * u0 + b, u2 = q * u1 + b
      return N(`On définit u₀ = ${u0} et uₙ₊₁ = ${fmt(q)}u_n ${b < 0 ? '−' : '+'} ${Math.abs(b)}. Calcule u₂.`, r(u2, 6), `u₁ = ${fmt(q)} × ${u0} ${b < 0 ? '−' : '+'} ${Math.abs(b)} = ${fmt(r(u1, 4))}, puis u₂ = ${fmt(q)} × ${fmt(r(u1, 4))} ${b < 0 ? '−' : '+'} ${Math.abs(b)} = ${fmt(r(u2, 4))}.`)
    },
    () => {
      const q = pick([0.9, 0.8, 0.5, 0.6]), b = pick([30, 40, 60, 100]), u0 = pick([0, 100, 1000, 50])
      const l = b / (1 - q)
      return N(`On pose u₀ = ${u0}, uₙ₊₁ = ${fmt(q)}u_n + ${b} et v_n = u_n − ${fmt(r(l, 6))}. La suite (v_n) est géométrique de raison ${fmt(q)}. Que vaut v₀ ?`, r(u0 - l, 6), `v₀ = u₀ − ${fmt(r(l, 6))} = ${u0} − ${fmt(r(l, 6))} = ${fmt(r(u0 - l, 6))}.`)
    },
    () => {
      const [q, n, qn] = pick([[0.9, 10, 0.3487], [0.8, 5, 0.3277], [0.5, 4, 0.0625], [0.9, 5, 0.5905], [0.8, 10, 0.1074]])
      const b = pick([20, 40, 50, 100]), l = b / (1 - q), u0 = pick([0, 100])
      const un = l + (u0 - l) * qn
      return approx(`On admet que u_n = ${fmt(r(l, 4))} + (${u0} − ${fmt(r(l, 4))}) × ${fmt(q)}^n. On donne ${fmt(q)}^${n} ≈ ${fmt(qn)}. Calcule ${u(n)}, arrondi à 0,1.`, un, 1, `${u(n)} ≈ ${fmt(r(l, 4))} + (${fmt(r(u0 - l, 4))}) × ${fmt(qn)} ≈ ${fmt(r(un, 2))}.`)
    },
  )),
  // Probabilités conditionnelles : formule de Bayes
  fresh(variants(
    () => {
      const [p, se, fp] = pick([[0.01, 0.95, 0.05], [0.02, 0.9, 0.05], [0.05, 0.98, 0.04], [0.1, 0.9, 0.1], [0.01, 0.99, 0.02], [0.2, 0.95, 0.1]])
      const pp = p * se + (1 - p) * fp, v = (p * se) / pp
      return approx(`Une maladie touche ${fmt(p * 100)} % de la population. Un test est positif chez ${fmt(se * 100)} % des malades et chez ${fmt(fp * 100)} % des non-malades. Une personne est testée positive : quelle est la probabilité qu’elle soit malade ? (arrondi à 0,01)`, v, 2, `P(M ∩ +) = ${fmt(p)} × ${fmt(se)} = ${fmt(r(p * se, 6))} ; P(+) = ${fmt(r(p * se, 6))} + ${fmt(1 - p)} × ${fmt(fp)} = ${fmt(r(pp, 6))}. P(M | +) = ${F(fmt(r(p * se, 6)), fmt(r(pp, 6)))} ≈ ${fmt(r(v, 3))}.`)
    },
    () => {
      const [p, se, fp] = pick([[0.01, 0.95, 0.05], [0.02, 0.9, 0.05], [0.05, 0.98, 0.04], [0.1, 0.9, 0.1], [0.2, 0.95, 0.1]])
      const pp = p * se + (1 - p) * fp
      return N(`Une maladie touche ${fmt(p * 100)} % de la population. Un test est positif chez ${fmt(se * 100)} % des malades et chez ${fmt(fp * 100)} % des non-malades. Quelle est la probabilité qu’une personne prise au hasard ait un test positif ?`, r(pp, 6), `Probabilités totales : P(+) = ${fmt(p)} × ${fmt(se)} + ${fmt(1 - p)} × ${fmt(fp)} = ${fmt(r(pp, 6))}.`)
    },
    () => {
      const pa = pick([0.6, 0.7, 0.4, 0.3, 0.5]), da = pick([0.02, 0.03, 0.05, 0.01]), db = pick([0.04, 0.05, 0.08, 0.1])
      const pd = pa * da + (1 - pa) * db, v = (pa * da) / pd
      return approx(`Une usine a deux machines : A fabrique ${fmt(pa * 100)} % des pièces (dont ${fmt(da * 100)} % défectueuses), B le reste (dont ${fmt(db * 100)} % défectueuses). Une pièce est défectueuse : quelle est la probabilité qu’elle vienne de A ? (arrondi à 0,01)`, v, 2, `P(D) = ${fmt(pa)} × ${fmt(da)} + ${fmt(r(1 - pa, 2))} × ${fmt(db)} = ${fmt(r(pd, 6))} ; P(A | D) = ${F(fmt(r(pa * da, 6)), fmt(r(pd, 6)))} ≈ ${fmt(r(v, 3))}.`)
    },
    () => {
      const [p, se, fp] = pick([[0.01, 0.95, 0.05], [0.02, 0.9, 0.05], [0.1, 0.9, 0.1], [0.05, 0.8, 0.02]])
      const pn = p * (1 - se) + (1 - p) * (1 - fp), v = ((1 - p) * (1 - fp)) / pn
      return approx(`Une maladie touche ${fmt(p * 100)} % de la population. Un test est positif chez ${fmt(se * 100)} % des malades et chez ${fmt(fp * 100)} % des non-malades. Un test est négatif : quelle est la probabilité que la personne soit bien non malade ? (arrondi à 0,001)`, v, 3, `P(−) = ${fmt(p)} × ${fmt(r(1 - se, 2))} + ${fmt(1 - p)} × ${fmt(r(1 - fp, 2))} = ${fmt(r(pn, 6))} ; P(M̄ | −) = ${F(fmt(r((1 - p) * (1 - fp), 6)), fmt(r(pn, 6)))} ≈ ${fmt(r(v, 4))}.`)
    },
  )),
]

// ── Palier 5 ────────────────────────────────────────────────────────────
const p5: Maker[] = [
  // Suites arithmético-géométriques : seuils
  fresh(variants(
    () => {
      const [q, D, s] = retry(() => { const [q, D] = pick([[0.5, 10], [0.5, 20], [0.8, 10], [0.7, 30], [0.6, 20], [0.75, 25]]), s = pick([0.9, 0.95, 0.99]); return clear(ln(1 - s) / ln(q)) && [q, D, s] })
      const l = D / (1 - q)
      const x = ln(1 - s) / ln(q), n = Math.ceil(x)
      return N(`Un patient reçoit ${D} mg d’un médicament chaque jour, et ${fmt(r((1 - q) * 100))} % de la quantité présente est éliminée chaque jour : qₙ₊₁ = ${fmt(q)}q_n + ${D}, q₀ = 0, donc q_n = ${fmt(r(l, 2))}(1 − ${fmt(q)}^n). À partir de quel jour n la quantité dépasse-t-elle ${fmt(s * 100)} % de ${fmt(r(l, 2))} mg ? On donne ln ${fmt(r(1 - s, 2))} ≈ ${lnv(1 - s)} et ln ${fmt(q)} ≈ ${lnv(q)}.`, n,
        `1 − ${fmt(q)}^n ≥ ${fmt(s)} ⇔ ${fmt(q)}^n ≤ ${fmt(r(1 - s, 2))} ⇔ n ≥ ${F(`ln ${fmt(r(1 - s, 2))}`, `ln ${fmt(q)}`)} ≈ ${fmt(r(x, 2))}. Donc n = ${n}.`)
    },
    () => {
      const [q, b, u0] = pick([[0.8, 40, 0], [0.9, 30, 100], [0.5, 50, 20], [0.75, 30, 0], [0.6, 80, 50]])
      const l = b / (1 - q), n = randInt(2, 4)
      let un = u0
      for (let i = 0; i < n; i++) un = q * un + b
      return N(`On pose u₀ = ${u0} et uₙ₊₁ = ${fmt(q)}u_n + ${b}. La suite v_n = u_n − ${fmt(r(l, 4))} est géométrique de raison ${fmt(q)}. Calcule ${u(n)} (valeur exacte).`, r(un, 6), `v₀ = ${u0} − ${fmt(r(l, 4))} = ${fmt(r(u0 - l, 4))}, donc ${u(n)} = ${fmt(r(l, 4))} + (${fmt(r(u0 - l, 4))}) × ${fmt(q)}^${n} = ${fmt(r(un, 6))}.`)
    },
    () => {
      const [q, b] = pick([[0.9, 20], [0.8, 50], [0.95, 10], [0.85, 30]])
      const l = b / (1 - q), u0 = pick([0, 50])
      const s = r(l * pick([0.8, 0.9]), 2)
      const x = ln((l - s) / (l - u0)) / ln(q), n = Math.ceil(x)
      return N(`Dans un parc, l’effectif d’une espèce vérifie uₙ₊₁ = ${fmt(q)}u_n + ${b}, u₀ = ${u0}, donc u_n = ${fmt(r(l, 2))} − ${fmt(r(l - u0, 2))} × ${fmt(q)}^n. À partir de quel rang n a-t-on u_n ≥ ${fmt(s)} ? On donne ln ${fmt(r((l - s) / (l - u0), 4))} ≈ ${lnv((l - s) / (l - u0))} et ln ${fmt(q)} ≈ ${lnv(q)}.`, n,
        `${fmt(r(l - u0, 2))} × ${fmt(q)}^n ≤ ${fmt(r(l - s, 2))} ⇔ ${fmt(q)}^n ≤ ${fmt(r((l - s) / (l - u0), 4))} ⇔ n ≥ ${F(`ln ${fmt(r((l - s) / (l - u0), 4))}`, `ln ${fmt(q)}`)} ≈ ${fmt(r(x, 2))}. Donc n = ${n}.`)
    },
  )),
  // Logistique : instants caractéristiques
  fresh(variants(
    () => {
      const a = pick([4, 9, 19, 24, 49, 99]), k = pick([0.5, 0.2, 0.3, 0.4, 0.25]), K = pick([1000, 5000, 2000])
      const t = (ln(a) + ln(9)) / k
      return approx(`Une innovation se diffuse selon f(t) = ${logi(big(K), a, k)} (t en mois). Au bout de combien de mois atteint-elle 90 % de sa valeur limite ? On donne ln ${a} ≈ ${lnv(a)} et ln 9 ≈ ${lnv(9)}. Arrondis à 0,1.`, t, 1,
        `f(t) = 0,9 × ${big(K)} ⇔ 1 + ${a}e^{−${fmt(k)}t} = ${F(1, '0,9')} = ${F(10, 9)} ⇔ e^{−${fmt(k)}t} = ${F(1, 9 * a)} ⇔ t = ${F(`ln ${a} + ln 9`, fmt(k))} ≈ ${fmt(r(t, 2))}.`)
    },
    () => {
      const [K, f0, a] = retry(() => {
        const K = pick([500, 1000, 2000, 1200, 3000]), f0 = pick([10, 20, 25, 50, 100, 40])
        const a = K / f0 - 1
        return Number.isInteger(a) && [K, f0, a]
      })
      return N(`Un modèle logistique f(t) = ${big(K)} / (1 + a e^{−0,3t}) prend la valeur ${f0} en t = 0. Que vaut a ?`, a, `En t = 0, e^{0} = 1 : ${F(big(K), '1 + a')} = ${f0} ⇔ 1 + a = ${F(big(K), f0)} = ${K / f0} ⇔ a = ${a}.`)
    },
    () => {
      const a = pick([9, 19, 24, 49, 99, 4]), k = pick([0.5, 0.2, 0.4, 0.25]), p = pick([0.2, 0.1, 0.8])
      const t = (ln(a) - ln(1 / p - 1)) / k
      const m = r(1 / p - 1, 4)
      return approx(`Une rumeur atteint f(t) = ${logi('K', a, k)} personnes (t en heures). À quel instant atteint-elle ${fmt(p * 100)} % de K ? On donne ln ${a} ≈ ${lnv(a)} et ln ${fmt(m)} ≈ ${lnv(m)}. Arrondis à 0,1.`, t, 1,
        `1 + ${a}e^{−${fmt(k)}t} = ${F(1, fmt(p))} ⇔ ${a}e^{−${fmt(k)}t} = ${fmt(m)} ⇔ t = ${F(`ln ${a} − ln ${fmt(m)}`, fmt(k))} ≈ ${fmt(r(t, 2))}.`)
    },
    () => {
      const a = pick([4, 9, 19, 24, 49, 99]), k = pick([0.5, 0.2, 0.3, 0.4, 0.25])
      return approx(`La courbe de f(t) = ${logi('K', a, k)} admet un point d’inflexion à l’instant où f(t) = ${F('K', 2)}, là où la croissance est la plus rapide. Quand ? On donne ln ${a} ≈ ${lnv(a)}. Arrondis à 0,1.`, ln(a) / k, 1, `f(t) = ${F('K', 2)} ⇔ ${a}e^{−${fmt(k)}t} = 1 ⇔ t = ${F(`ln ${a}`, fmt(k))} ≈ ${fmt(r(ln(a) / k, 2))}.`)
    },
  )),
  // Binomiale : nombre minimal d'essais, P(X ≤ 1)
  fresh(variants(
    () => {
      const p = pick([0.1, 0.2, 0.05, 0.3, 0.15]), s = pick([0.95, 0.99, 0.9])
      const x = ln(1 - s) / ln(1 - p), n = Math.ceil(x)
      return N(`Chaque appel d’un démarcheur aboutit à une vente avec probabilité ${fmt(p)}, indépendamment. Combien d’appels faut-il au minimum pour que la probabilité d’au moins une vente dépasse ${fmt(s)} ? On donne ln ${fmt(r(1 - s, 2))} ≈ ${lnv(1 - s)} et ln ${fmt(1 - p)} ≈ ${lnv(1 - p)}.`, n,
        `1 − ${fmt(1 - p)}^n ≥ ${fmt(s)} ⇔ ${fmt(1 - p)}^n ≤ ${fmt(r(1 - s, 2))} ⇔ n ≥ ${F(`ln ${fmt(r(1 - s, 2))}`, `ln ${fmt(1 - p)}`)} ≈ ${fmt(r(x, 2))}. Donc ${n} appels.`)
    },
    () => {
      const n = pick([3, 4, 5]), p = 0.5
      const v = (1 + n) * p ** n
      return prob(`On lance ${n} fois une pièce équilibrée. Quelle est la probabilité d’obtenir au plus une fois « pile » ?`, 1 + n, 2 ** n, `P(X ≤ 1) = P(X = 0) + P(X = 1) = ${F(1, 2 ** n)} + ${F(n, 2 ** n)} = ${F(1 + n, 2 ** n)}${Number.isInteger(v * 1e4) ? ` = ${fmt(v)}` : ''}`)
    },
    () => {
      const [n, p, g, c] = retry(() => { const n = pick([10, 20, 5]), p = pick([0.1, 0.2, 0.3]), g = pick([5, 10, 20]), c = pick([1, 2, 3]); return Math.abs(p * g - c) > 1e-9 && [n, p, g, c] })
      const e = n * p * g - n * c
      return N(`À une fête, ${prenom()} joue ${n} parties ; chaque partie coûte ${c} € et rapporte ${g} € en cas de victoire (probabilité ${fmt(p)}, parties indépendantes). Quel est son gain moyen total, en € ? (négatif en cas de perte)`, r(e, 6), `Nombre de victoires X ~ B(${n} ; ${fmt(p)}), E(X) = ${fmt(n * p)}. Gain G = ${g}X − ${n * c}, donc E(G) = ${g} × ${fmt(n * p)} − ${n * c} = ${fmt(r(e, 6))} €.`)
    },
  )),
  // Moindres carrés « à la main »
  fresh(variants(
    () => {
      const { ys, a, b } = lsq4()
      return N(`On relève y = ${ys.join(' ; ')} pour x = 1 ; 2 ; 3 ; 4. Calcule le coefficient directeur a de la droite des moindres carrés (a = ${F('Σ(x − x̄)(y − ȳ)', 'Σ(x − x̄)²')}).`, a, lsqExpl(ys, a, b))
    },
    () => {
      const { ys, a, b } = lsq4()
      return N(`On relève y = ${ys.join(' ; ')} pour x = 1 ; 2 ; 3 ; 4. La droite des moindres carrés est y = ax + b : calcule b.`, b, lsqExpl(ys, a, b))
    },
    () => {
      const { ys, a, b } = lsq4()
      const x0 = pick([6, 7, 8])
      return withFig(N(`Le nuage ci-dessous donne y = ${ys.join(' ; ')} pour x = 1 ; 2 ; 3 ; 4. Quelle valeur la droite des moindres carrés prévoit-elle pour x = ${x0} ?`, r(a * x0 + b, 6), `${lsqExpl(ys, a, b)} Prévision : ${fmt(a)} × ${x0} ${plus(b)} = ${fmt(r(a * x0 + b, 6))}.`),
        scatter(ys.map((y, i) => [i + 1, y]), { xMax: x0 + 1, yMax: Math.max(...ys, a * x0 + b) }))
    },
  )),
  // Loi exponentielle : paramètre, absence de mémoire, quantiles
  fresh(variants(
    () => {
      const t0 = pick([10, 20, 50, 100, 1000, 500])
      return approx(`La durée de vie X (en heures) d’un composant suit une loi exponentielle, et la moitié des composants durent plus de ${t0} heures. Détermine λ, arrondi à 0,0001. On donne ln 2 ≈ 0,6931.`, ln(2) / t0, 4, `P(X > ${t0}) = e^{−${t0}λ} = 0,5 ⇔ ${t0}λ = ln 2 ⇔ λ = ${F('ln 2', t0)} ≈ ${fmt(r(ln(2) / t0, 5))}.`)
    },
    () => {
      const [lam, t, e] = pick([[0.1, 5, 0.6065], [0.2, 5, 0.3679], [0.05, 10, 0.6065], [0.1, 10, 0.3679], [0.02, 50, 0.3679]])
      const s = pick([3, 5, 8, 10, 20])
      return N(`Une ampoule a une durée de vie qui suit la loi exponentielle de paramètre ${fmt(lam)} (en années). Elle fonctionne encore après ${s} ans. Quelle est la probabilité qu’elle fonctionne encore ${t} ans de plus ? On donne e^{−${fmt(r(lam * t, 2))}} ≈ ${fmt(e)}.`, e, `Absence de mémoire : P(X > ${s} + ${t} | X > ${s}) = P(X > ${t}) = e^{−${fmt(lam)} × ${t}} ≈ ${fmt(e)}. L’âge déjà atteint ne compte pas.`)
    },
    () => {
      const [lam, a, b, ea, eb] = pick([[0.1, 5, 10, 0.6065, 0.3679], [0.2, 5, 10, 0.3679, 0.1353], [0.5, 2, 4, 0.3679, 0.1353], [0.1, 10, 20, 0.3679, 0.1353], [0.05, 10, 20, 0.6065, 0.3679]])
      return N(`X suit la loi exponentielle de paramètre ${fmt(lam)}. On donne e^{−${fmt(lam * a)}} ≈ ${fmt(ea)} et e^{−${fmt(lam * b)}} ≈ ${fmt(eb)}. Calcule P(${a} ≤ X ≤ ${b}).`, r(ea - eb, 4), `P(${a} ≤ X ≤ ${b}) = e^{−${fmt(lam)} × ${a}} − e^{−${fmt(lam)} × ${b}} ≈ ${fmt(ea)} − ${fmt(eb)} = ${fmt(r(ea - eb, 4))}.`)
    },
    () => {
      const lam = pick([0.1, 0.2, 0.05, 0.5, 0.01])
      const t = ln(10) / lam
      return approx(`X suit la loi exponentielle de paramètre ${fmt(lam)}. Pour quelle durée t a-t-on P(X ≤ t) = 0,9 ? On donne ln 10 ≈ 2,3026. Arrondis à 0,1.`, t, 1, `1 − e^{−${fmt(lam)}t} = 0,9 ⇔ e^{−${fmt(lam)}t} = 0,1 ⇔ t = ${F('ln 10', fmt(lam))} ≈ ${fmt(r(t, 2))}.`)
    },
  )),
]

/** Série de 4 points (x = 1 à 4) dont la droite des moindres carrés a des coefficients « propres ». */
function lsq4() {
  return retry(() => {
    const ys = [1, 2, 3, 4].map(() => randInt(5, 40))
    const ym = ys.reduce((s, v) => s + v, 0) / 4
    const sxy = ys.reduce((s, y, i) => s + (i + 1 - 2.5) * y, 0)
    const a = sxy / 5, b = ym - 2.5 * a
    return Number.isInteger(a * 10) && Number.isInteger(b * 100) && Math.abs(a) >= 1 && Math.abs(b) > 1e-9 && { ys, a: r(a, 6), b: r(b, 6) }
  })
}
function lsqExpl(ys: number[], a: number, b: number) {
  const ym = ys.reduce((s, v) => s + v, 0) / 4
  return `x̄ = 2,5 et ȳ = ${fmt(ym)} ; Σ(x − x̄)² = 2,25 + 0,25 + 0,25 + 2,25 = 5 ; Σ(x − x̄)(y − ȳ) = Σ(x − x̄)y = −1,5 × ${ys[0]} − 0,5 × ${ys[1]} + 0,5 × ${ys[2]} + 1,5 × ${ys[3]} = ${fmt(r(a * 5, 4))}. a = ${F(fmt(r(a * 5, 4)), 5)} = ${fmt(a)} et b = ȳ − a x̄ = ${fmt(ym)} − ${a < 0 ? `(${fmt(a)})` : fmt(a)} × 2,5 = ${fmt(b)}.`
}

// ── Problèmes d'amélioration ────────────────────────────────────────────
const upgrades: [Maker[], Maker[], Maker[]] = [
  [
    () => {
      const g = pick([1.6, 2, 1.4, 2.5, 1.25, 3]), n = pick([5, 4, 6, 8, 10])
      const c = g ** (1 / n)
      return approx(`Un indice a augmenté de ${fmt(r((g - 1) * 100))} % en ${n} ans. On donne ${fmt(g)}^{1/${n}} ≈ ${fmt(r(c, 4))}. Quel est le taux annuel moyen, en % (arrondi à 0,01) ? Puis vérifie qu’il est inférieur à ${fmt(r((g - 1) * 100))}/${n} ≈ ${fmt(r(((g - 1) * 100) / n, 2))} %.`, (c - 1) * 100, 2,
        `(1 + t)^${n} = ${fmt(g)} ⇔ 1 + t = ${fmt(g)}^{1/${n}} ≈ ${fmt(r(c, 4))}, soit t ≈ ${fmt(r((c - 1) * 100, 2))} %. Le taux moyen est plus petit que le taux global divisé par ${n}, car les hausses se composent.`, '%')
    },
    () => {
      const t = pick([2, 3, 4, 5, 6, 7, 8, 10])
      const x = ln(2) / ln(1 + t / 100)
      return approx(`La « règle des 70 » dit qu’à ${t} % par an, un capital double en environ 70 ÷ ${t} ≈ ${fmt(r(70 / t, 1))} ans. Calcule la durée exacte de doublement, en années, arrondie à 0,1. On donne ln 2 ≈ 0,6931 et ln ${fmt(1 + t / 100)} ≈ ${lnv(1 + t / 100)}.`, x, 1, `${fmt(1 + t / 100)}^n = 2 ⇔ n = ${F('ln 2', `ln ${fmt(1 + t / 100)}`)} ≈ ${fmt(r(x, 2))} ans : la règle des 70 est une bonne approximation (ln 2 ≈ 0,69 et ln(1 + t) ≈ t).`)
    },
    () => {
      const v = pick([100, 200, 500, 1000]), t = pick([2, 3, 4, 5]), n = pick([5, 10, 8])
      const q = 1 + t / 100, qn = q ** n
      const s = (v * (qn - 1)) / (q - 1)
      return approx(`${prenom()} verse ${v} € au début de chaque année sur un compte, et l’argent déjà versé rapporte ${t} % par an. Juste après le ${n}e versement, le capital vaut ${v}(1 + ${fmt(q)} + ${fmt(q)}² + … + ${fmt(q)}^${n - 1}). On donne ${fmt(q)}^${n} ≈ ${fmt(r(qn, 4))}. Calcule ce capital, arrondi à l’euro.`, s, 0,
        `Somme géométrique : ${v} × ${F(`${fmt(q)}^${n} − 1`, `${fmt(q)} − 1`)} ≈ ${v} × ${F(fmt(r(qn - 1, 4)), fmt(r(q - 1, 2)))} ≈ ${fmt(r(s, 2))} €.`, '€')
    },
  ],
  [
    () => {
      const a = pick([9, 19, 49, 99, 24]), k = pick([0.5, 0.3, 0.2, 0.4]), d = pick([0.9, 0.8, 0.75])
      const m = r(d / (1 - d), 4)
      const t1 = ln(a) / k, t2 = (ln(a) + ln(m)) / k
      return approx(`Pour f(t) = ${logi('K', a, k)}, combien de temps s’écoule entre l’instant où f atteint 50 % de K et celui où f atteint ${fmt(d * 100)} % de K ? On donne ln ${fmt(m)} ≈ ${lnv(m)}. Arrondis à 0,1.`, t2 - t1, 1,
        `f = ${F('K', 2)} pour t₁ = ${F(`ln ${a}`, fmt(k))} ; f = ${fmt(d)}K pour ${a}e^{−${fmt(k)}t} = ${F(1, fmt(m))}, soit t₂ = ${F(`ln ${a} + ln ${fmt(m)}`, fmt(k))}. Écart : ${F(`ln ${fmt(m)}`, fmt(k))} ≈ ${fmt(r(t2 - t1, 2))} (il ne dépend pas de a).`)
    },
    () => {
      const [se, fp] = pick([[0.95, 0.05], [0.9, 0.1], [0.99, 0.01], [0.8, 0.05], [0.9, 0.02], [0.98, 0.03]])
      const p = fp / (se + fp)
      const c = pick([
        { t: 'Un test médical', m: 'des malades', s: 'des non-malades', q: 'd’être malade', pop: 'de malades dans la population' },
        { t: 'Un détecteur de fraude', m: 'des transactions frauduleuses', s: 'des transactions honnêtes', q: 'que la transaction soit frauduleuse', pop: 'de transactions frauduleuses' },
        { t: 'Un filtre anti-spam', m: 'des spams', s: 'des messages légitimes', q: 'que le message soit un spam', pop: 'de spams parmi les messages' },
      ])
      return approx(`${c.t} donne une alerte pour ${fmt(se * 100)} % ${c.m} et pour ${fmt(fp * 100)} % ${c.s}. Pour quelle proportion p ${c.pop} une alerte donne-t-elle exactement une chance sur deux ${c.q} ? (p arrondi à 0,001)`, p, 3,
        `P(M | +) = ${F(`${fmt(se)}p`, `${fmt(se)}p + ${fmt(fp)}(1 − p)`)} = 0,5 ⇔ ${fmt(se)}p = ${fmt(fp)}(1 − p) ⇔ p = ${F(fmt(fp), `${fmt(se)} + ${fmt(fp)}`)} ≈ ${fmt(r(p, 4))}.`)
    },
    () => {
      const { xs, ys, a, b } = retry(() => {
        const ys = [0, 1, 2, 3, 4].map(() => randInt(5, 40))
        const ym = ys.reduce((s, v) => s + v, 0) / 5
        const a = ys.reduce((s, y, i) => s + (i - 2) * y, 0) / 10, b = ym - 2 * a
        return Number.isInteger(a * 10) && Number.isInteger(b * 10) && Math.abs(a) >= 1 && Math.abs(b) > 1e-9 && { xs: [0, 1, 2, 3, 4], ys, a, b }
      })
      const x0 = pick([6, 7, 8])
      return withFig(N(`On relève y = ${ys.join(' ; ')} pour x = 0 ; 1 ; 2 ; 3 ; 4. Quelle valeur la droite des moindres carrés prévoit-elle pour x = ${x0} ?`, r(a * x0 + b, 6),
        `x̄ = 2, ȳ = ${fmt(r(b + 2 * a, 4))}, Σ(x − x̄)² = 10, Σ(x − x̄)y = ${fmt(r(a * 10, 4))}, donc a = ${fmt(a)} et b = ȳ − 2a = ${fmt(r(b, 4))}. Prévision : ${fmt(a)} × ${x0} ${plus(r(b, 4))} = ${fmt(r(a * x0 + b, 4))}.`),
        scatter(xs.map((x, i) => [x, ys[i]]), { xMax: x0 + 1, yMax: Math.max(...ys, a * x0 + b) }))
    },
  ],
  [
    () => {
      const n = pick([2, 3, 4, 5, 1.5, 7, 9, 2.5])
      const fig = curve((x) => x ** n, 1, 1, { ystep: 0.2, caption: `Courbe de Lorenz L(x) = x^${fmt(n)} et diagonale d’égalité.` })
      fig.axes!.step = 0.2; fig.axes!.labelStep = 0.2
      fig.curves!.push({ pts: [[fig.axes!.ox, fig.axes!.oy], [fig.axes!.ox + fig.axes!.ux, fig.axes!.oy - fig.axes!.uy]], color: AXIS, dashed: true })
      return withFig(prob(`Dans un pays, la courbe de Lorenz des revenus est L(x) = x^${fmt(n)} sur [0 ; 1]. L’indice de Gini vaut G = 2∫₀¹(x − L(x))dx. Calcule G.`, Math.round((n - 1) * 2), Math.round((n + 1) * 2),
        `∫₀¹ x dx = ${F(1, 2)} et ∫₀¹ x^${fmt(n)} dx = ${F(1, fmt(n + 1))}. G = 2(${F(1, 2)} − ${F(1, fmt(n + 1))}) = 1 − ${F(2, fmt(n + 1))} = ${F(fmt(n - 1), fmt(n + 1))}${Number.isInteger(((n - 1) / (n + 1)) * 1e4) ? ` = ${fmt((n - 1) / (n + 1))}` : ''}`), fig)
    },
    () => {
      const [c0, t, w] = retry(() => {
        const c0 = pick([5000, 10000, 8000, 6000]), t = pick([3, 4, 5]), w = pick([400, 500, 600, 800])
        const l = w / (t / 100)
        return l > c0 * 1.1 && clear(ln(l / (l - c0)) / ln(1 + t / 100)) && [c0, t, w]
      })
      const q = 1 + t / 100, l = w / (q - 1)
      const ratio = l / (l - c0), x = ln(ratio) / ln(q), n = Math.ceil(x)
      return N(`Un retraité dispose de ${big(c0)} € placés à ${t} % par an ; il retire ${w} € à la fin de chaque année : cₙ₊₁ = ${fmt(q)}c_n − ${w}. On admet que c_n = ${big(r(l, 2))} − ${big(r(l - c0, 2))} × ${fmt(q)}^n. Au bout de combien d’années le capital sera-t-il épuisé (c_n ≤ 0) ? On donne ln ${fmt(r(ratio, 4))} ≈ ${lnv(ratio)} et ln ${fmt(q)} ≈ ${lnv(q)}.`, n,
        `c_n ≤ 0 ⇔ ${fmt(q)}^n ≥ ${F(big(r(l, 2)), big(r(l - c0, 2)))} ≈ ${fmt(r(ratio, 4))} ⇔ n ≥ ${F(`ln ${fmt(r(ratio, 4))}`, `ln ${fmt(q)}`)} ≈ ${fmt(r(x, 2))}. Le capital est épuisé au bout de ${n} ans.`)
    },
    () => {
      const p = pick([0.2, 0.25, 0.1, 0.05]), N0 = pick([100, 200, 400])
      const keep = 1 - p
      const n = Math.ceil(ln(0.5) / ln(keep))
      return N(`Chaque mois, ${fmt(p * 100)} % des ${N0} abonnés restants d’un service résilient leur abonnement (sans nouveaux abonnés). Au bout de combien de mois entiers en restera-t-il moins de la moitié ? On donne ln 2 ≈ 0,6931 et ln ${fmt(keep)} ≈ ${lnv(keep)}.`, n,
        `Le nombre d’abonnés est ${N0} × ${fmt(keep)}^n. ${fmt(keep)}^n < 0,5 ⇔ n > ${F('−ln 2', `ln ${fmt(keep)}`)} ≈ ${fmt(r(-ln(0.5) / -ln(keep), 2))}. Donc ${n} mois.`)
    },
  ],
]

// ── Problèmes de l'hôtel de ville ───────────────────────────────────────
const age: [Maker[], Maker[], Maker[]] = [
  [
    // La croissance du village (suite géométrique)
    () => {
      const p0 = pick([400, 500, 800, 1000]), t = pick([5, 10, 20]), n = 3, y0 = pick([1200, 1250, 1300, 1340])
      const q = 1 + t / 100, vals = [0, 1, 2, 3].map((k) => p0 * q ** k)
      const g = graphFigure({ xMin: 0, xMax: 4, yMin: 0, yMax: Math.ceil((vals[3] * 1.15) / 200) * 200, step: 1, ystep: 200, ylabelStep: 400 })
      vals.slice(0, 3).forEach((v, k) => g.point(`P${k}`, k, v, '', 'ne'))
      g.point('Q', 3, vals[3], '?', 'n')
      g.figure.caption = `Population (n = 0 en ${y0}).`
      return T('La croissance du village', approx(`En ${y0}, le village comptait ${p0} habitants, et sa population augmente de ${t} % par an. Combien d’habitants comptera-t-il en ${y0 + n} (arrondi à l’unité) ?`, vals[3], 0, `Suite géométrique de raison ${fmt(q)} : ${p0} × ${fmt(q)}³ = ${p0} × ${fmt(r(q ** 3, 6))} ≈ ${fmt(r(vals[3], 1))} habitants.`), g.figure)
    },
    // Le prix du blé
    () => {
      const t1 = pick([10, 20, 30, 50]), t2 = pick([10, 20, 25]), t3 = pick([10, 20, 5])
      const c = (1 + t1 / 100) * (1 - t2 / 100) * (1 + t3 / 100)
      const p = pick([20, 40, 50, 100])
      return T('Le prix du blé', N(`Le sac de blé valait ${p} deniers. Une mauvaise récolte fait monter son prix de ${t1} %, puis il baisse de ${t2} % l’année suivante et remonte de ${t3} % la troisième année. Quel est le taux d’évolution global sur les trois ans, en % ? (négatif en cas de baisse)`, r((c - 1) * 100, 4),
        `Coefficient global : ${fmt(1 + t1 / 100)} × ${fmt(1 - t2 / 100)} × ${fmt(1 + t3 / 100)} = ${fmt(r(c, 6))}, soit ${sgnPct(c - 1)}. Le sac vaut alors ${fmt(r(p * c, 4))} deniers.`))
    },
    // La prévision des récoltes
    () => {
      const a = pick([1.5, 2, 2.5, 3]), b = randInt(10, 25), xs = [1, 2, 3, 4, 5, 6, 7]
      const pts: [number, number][] = xs.map((x) => [x, r(a * x + b + (Math.random() - 0.5) * 2 * a, 1)])
      const x0 = pick([9, 10, 11])
      return T('La prévision des récoltes', N(`L’intendant a relevé les récoltes y (en tonnes) des années x = 1 à 7 et les a ajustées par la droite y = ${fmt(a)}x + ${b}. Quelle récolte peut-il prévoir pour l’année x = ${x0} ?`, a * x0 + b, `y = ${fmt(a)} × ${x0} + ${b} = ${fmt(a * x0 + b)} tonnes (prévision, en supposant que la tendance se maintient).`),
        scatter(pts, { line: [a, b], xMax: x0 + 1, extra: [x0, a * x0 + b] }))
    },
  ],
  [
    // L'épidémie (logistique)
    () => {
      const K = pick([1000, 2000, 1200]), a = pick([19, 24, 49, 99]), k = pick([0.5, 0.4, 0.3])
      const t = ln(a) / k
      const f = (x: number) => K / (1 + a * Math.exp(-k * x))
      const tMax = Math.ceil((2 * t) / 5) * 5
      return T('L’épidémie de la vallée', approx(`Une fièvre se propage dans la vallée : le nombre de malades au jour t est f(t) = ${logi(big(K), a, k)}. Au bout de combien de jours la moitié des ${big(K)} habitants exposés sera-t-elle touchée ? On donne ln ${a} ≈ ${lnv(a)}. Arrondis à 0,1.`, t, 1,
        `f(t) = ${big(K / 2)} ⇔ 1 + ${a}e^{−${fmt(k)}t} = 2 ⇔ e^{−${fmt(k)}t} = ${F(1, a)} ⇔ t = ${F(`ln ${a}`, fmt(k))} ≈ ${fmt(r(t, 2))} jours. C’est aussi le moment où l’épidémie progresse le plus vite.`),
        curve(f, tMax, K, { hline: K / 2, caption: 'Nombre de malades en fonction du temps (en jours).' }))
    },
    // La datation du parchemin
    () => {
      const keep = pick([0.9, 0.8, 0.75, 0.7, 0.6, 0.5, 0.4, 0.85])
      const obj = pick(['Un vieux parchemin', 'Un os retrouvé sous le donjon', 'Un morceau de charbon de bois', 'La coque d’une barque enfouie'])
      const T0 = 5730
      const t = (T0 * ln(1 / keep)) / ln(2)
      const fig = curve((x) => 100 * 0.5 ** (x / T0), 12000, 100, { hline: keep * 100, caption: 'Pourcentage de carbone 14 restant selon l’âge (en années).' })
      return T('La datation au carbone 14', approx(`Le carbone 14 a une demi-vie de ${big(T0)} ans : la proportion restante après t années est e^{−kt} avec k = ${F('ln 2', big(T0))}. ${obj} n’a plus que ${fmt(keep * 100)} % de son carbone 14. Quel est son âge, arrondi à la dizaine d’années près ? On donne ln 2 ≈ 0,6931 et ln ${fmt(r(1 / keep, 4))} ≈ ${lnv(1 / keep)}.`, t, -1,
        `e^{−kt} = ${fmt(keep)} ⇔ t = ${F(`ln(1/${fmt(keep)})`, 'k')} = ${big(T0)} × ${F(`ln ${fmt(r(1 / keep, 4))}`, 'ln 2')} ≈ ${big(r(t, 0))} ans.`), fig)
    },
    // Le marché couvert (point moyen et prévision)
    () => {
      const xs = [1, 2, 3, 4, 5], a = pick([2, 3, 4, 1.5]), ys = xs.map((x) => Math.round(a * x + randInt(10, 14) + (Math.random() - 0.5) * 4))
      const ym = ys.reduce((s, v) => s + v, 0) / 5
      const b = r(ym - 3 * a, 4), x0 = pick([8, 9, 10])
      return T('Le marché couvert', N(`Le nombre d’étals y du marché couvert, les années x = 1 à 5, vaut ${ys.join(' ; ')}. Un conseiller propose une droite d’ajustement de coefficient directeur ${fmt(a)} passant par le point moyen G. Quel nombre d’étals prévoit-elle pour x = ${x0} ?`, r(ym + a * (x0 - 3), 4),
        `G(3 ; ${fmt(ym)}) car x̄ = 3 et ȳ = ${F(ys.join(' + '), 5)} = ${fmt(ym)}. Droite : y = ${fmt(a)}x ${plus(b)} (b = ${fmt(ym)} − ${fmt(a)} × 3). Pour x = ${x0} : ${fmt(r(ym + a * (x0 - 3), 4))} étals.`),
        scatter(xs.map((x, i) => [x, ys[i]]), { xMax: x0 + 1, line: [a, b], G: [3, ym], yMax: Math.max(...ys, ym + a * (x0 - 3)) }))
    },
  ],
  [
    // Le traitement du guérisseur
    () => {
      const [q, D, s] = retry(() => { const [q, D] = pick([[0.5, 40], [0.6, 20], [0.8, 10], [0.75, 30], [0.7, 15]]), s = pick([0.9, 0.95]); return clear(ln(1 - s) / ln(q)) && [q, D, s] })
      const l = D / (1 - q)
      const x = ln(1 - s) / ln(q), n = Math.ceil(x)
      const g = graphFigure({ xMin: 0, xMax: Math.max(n + 2, 8), yMin: 0, yMax: Math.ceil((l * 1.2) / 10) * 10, step: 1, labelStep: 2, ystep: 10, ylabelStep: Math.ceil(l / 40) * 10 })
      for (let k = 0; k <= Math.max(n + 1, 7); k++) g.point(`Q${k}`, k, l * (1 - q ** k), '')
      g.plot(() => l, { color: AXIS, dashed: true })
      g.figure.caption = 'Quantité de remède dans l’organisme, jour après jour.'
      return T('Le traitement du guérisseur', N(`Le guérisseur administre ${D} mg de remède chaque matin ; chaque jour, l’organisme en élimine ${fmt(r((1 - q) * 100))} %. Après n jours, la quantité est q_n = ${fmt(r(l, 2))}(1 − ${fmt(q)}^n) mg. Le remède est efficace dès que la quantité dépasse ${fmt(s * 100)} % du niveau limite ${fmt(r(l, 2))} mg. À partir de quel jour n l’est-il ? On donne ln ${fmt(r(1 - s, 2))} ≈ ${lnv(1 - s)} et ln ${fmt(q)} ≈ ${lnv(q)}.`, n,
        `1 − ${fmt(q)}^n ≥ ${fmt(s)} ⇔ ${fmt(q)}^n ≤ ${fmt(r(1 - s, 2))} ⇔ n ≥ ${F(`ln ${fmt(r(1 - s, 2))}`, `ln ${fmt(q)}`)} ≈ ${fmt(r(x, 2))} : à partir du jour ${n}.`), g.figure)
    },
    // Le dépistage (arbre)
    () => {
      const [p, se, fp] = pick([[0.01, 0.95, 0.05], [0.02, 0.9, 0.05], [0.05, 0.98, 0.04], [0.1, 0.9, 0.1], [0.01, 0.99, 0.02], [0.03, 0.95, 0.03]])
      const pp = p * se + (1 - p) * fp, v = (p * se) / pp
      return T('Le dépistage au château', approx(`Une maladie touche ${fmt(p * 100)} % des habitants du château. Le médecin dispose d’un test positif chez ${fmt(se * 100)} % des malades et chez ${fmt(fp * 100)} % des personnes saines (voir l’arbre). Le test ${pick(['du cuisinier', 'de la lavandière', 'du palefrenier', 'de la dame de compagnie', 'du garde', 'de l’écuyer'])} est positif : quelle est la probabilité qu’il soit réellement malade ? (arrondi à 0,01)`, v, 2,
        `P(+) = ${fmt(p)} × ${fmt(se)} + ${fmt(1 - p)} × ${fmt(fp)} = ${fmt(r(pp, 6))} ; P(M | +) = ${F(fmt(r(p * se, 6)), fmt(r(pp, 6)))} ≈ ${fmt(r(v, 3))}. Même avec un bon test, une maladie rare donne beaucoup de « faux positifs ».`),
        treeFigure(p, se, fp))
    },
    // Les inégalités du royaume (Gini)
    () => {
      const n = pick([2, 3, 4, 1.5, 5, 2.5, 6])
      const lieu = pick(['du royaume', 'du comté', 'du duché', 'de la principauté'])
      const fig = curve((x) => x ** n, 1, 1, { ystep: 0.2, caption: 'Courbe de Lorenz (en rouge) et droite d’égalité parfaite (pointillés).' })
      fig.axes!.step = 0.2; fig.axes!.labelStep = 0.2
      fig.curves!.push({ pts: [[fig.axes!.ox, fig.axes!.oy], [fig.axes!.ox + fig.axes!.ux, fig.axes!.oy - fig.axes!.uy]], color: AXIS, dashed: true })
      const share = 1 - 0.5 ** n
      return T('Les inégalités du royaume', approx(`Le trésorier ${lieu} modélise la répartition des richesses par la courbe de Lorenz L(x) = x^${fmt(n)} : les x × 100 % les plus pauvres possèdent L(x) × 100 % des richesses. Quelle part des richesses (en %) possède la moitié la plus riche de la population ? (arrondi à 0,1)`, share * 100, 1,
        `La moitié la plus pauvre possède L(0,5) = 0,5^${fmt(n)} ≈ ${fmt(r(0.5 ** n, 4))}, soit ${fmt(r(0.5 ** n * 100, 2))} %. La moitié la plus riche possède donc ${fmt(r(share * 100, 2))} % des richesses.`, '%'), fig)
    },
  ],
]

/** Arbre de probabilités : malade / sain, puis test + / −. */
function treeFigure(p: number, se: number, fp: number): Figure {
  const P = (x: number, y: number, label = ''): FigPoint => ({ x, y, label })
  return {
    points: {
      O: P(30, 110, ''), M: P(140, 55, 'M'), S: P(140, 165, 'M̄'),
      Mp: P(270, 30, '+'), Mm: P(270, 80, '−'), Sp: P(270, 140, '+'), Sm: P(270, 190, '−'),
    },
    segments: [
      { a: 'O', b: 'M' }, { a: 'O', b: 'S' }, { a: 'M', b: 'Mp' }, { a: 'M', b: 'Mm' }, { a: 'S', b: 'Sp' }, { a: 'S', b: 'Sm' },
    ],
    notes: [
      { x: 70, y: 70, text: fmt(p) }, { x: 70, y: 160, text: fmt(r(1 - p, 4)) },
      { x: 200, y: 32, text: fmt(se) }, { x: 200, y: 82, text: fmt(r(1 - se, 4)) },
      { x: 200, y: 142, text: fmt(fp) }, { x: 200, y: 192, text: fmt(r(1 - fp, 4)) },
    ],
    caption: 'Arbre de probabilités (M : malade).',
  }
}

export const CONTENT: SubjectContent | null = { tiers: [p1, p2, p3, p4, p5], upgrades, age }
