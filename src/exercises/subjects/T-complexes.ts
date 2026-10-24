// Nombres complexes (Terminale, Maths expertes) : forme algébrique (calculs, conjugué, inverse, module),
// équations du second degré à discriminant négatif, forme trigonométrique et exponentielle (module, argument),
// affixes et géométrie dans le plan complexe, racines n-ièmes de l’unité.
// Public adulte : palier 1 = rappel guidé, palier 3 = exercice standard, palier 5 = exigeant.
import {
  F, evalExpr, fmt, fresh, gcd, numeric, par, parseExpr, pick, poly, radical, randInt, randNonZero,
  sameNumber, variants, withMeta,
  type Exercise, type Ladder, type SubjectContent, type Tiers,
} from '../utils'
import { graphFigure, type Figure } from '../figure'
import { personnage } from '../contexts'
import { BLUE, RED, exactRoot, retry, rootText } from './T-espace'

// ── Aides : nombres complexes ────────────────────────────────────────────
type C = [number, number]
const cadd = (a: C, b: C): C => [a[0] + b[0], a[1] + b[1]]
const csub = (a: C, b: C): C => [a[0] - b[0], a[1] - b[1]]
const cmul = (a: C, b: C): C => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]]
const cscale = (k: number, a: C): C => [k * a[0], k * a[1]]
const conj = (a: C): C => [a[0], -a[1]]
const abs2 = (a: C) => a[0] * a[0] + a[1] * a[1]
const cdiv = (a: C, b: C): C => { const d = abs2(b), p = cmul(a, conj(b)); return [p[0] / d, p[1] / d] }
const cpow = (a: C, n: number): C => { let r: C = [1, 0]; for (let k = 0; k < n; k++) r = cmul(r, a); return r }
const I: C = [0, 1]
const rc = (k = 6): C => [randInt(-k, k), randInt(-k, k)]
/** Complexe à parties réelle et imaginaire non nulles. */
const rcz = (k = 6): C => [randNonZero(-k, k), randNonZero(-k, k)]

/** Rationnel écrit simplement : entier, fraction empilée (énoncé) ou « a/b » (réponse). */
function ratParts(v: number): [number, number] {
  for (let d = 1; d <= 400; d++) {
    const n = Math.round(v * d)
    if (Math.abs(n - v * d) < 1e-9) return [n, d]
  }
  return [v, 1]
}
const rat = (v: number, stacked: boolean) => {
  const [n, d] = ratParts(v)
  if (d === 1) return fmt(n)
  return stacked ? `${n < 0 ? '−' : ''}${F(Math.abs(n), d)}` : `${n < 0 ? '−' : ''}${Math.abs(n)}/${d}`
}
/** Forme algébrique : 3 − 2i, −i, 4, {1/2} + {3/2}i (énoncé) ou 1/2 + (3/2)i (réponse). */
function cTxt(z: C, stacked = true): string {
  const [a, b] = [Math.round(z[0] * 1e9) / 1e9, Math.round(z[1] * 1e9) / 1e9]
  if (b === 0) return rat(a, stacked)
  const [n, d] = ratParts(Math.abs(b))
  const coef = n === 1 && d === 1 ? '' : d === 1 ? fmt(n) : stacked ? F(n, d) : `(${n}/${d})`
  const im = `${coef}i`
  if (a === 0) return b < 0 ? `−${im}` : im
  return `${rat(a, stacked)} ${b < 0 ? '−' : '+'} ${im}`
}
/** Imaginaire pur ki, entre parenthèses s’il est négatif ; |k|i sans signe. */
const ip = (k: number) => (k < 0 ? `(${cTxt([0, k])})` : cTxt([0, k]))
const iAbs = (k: number) => cTxt([0, Math.abs(k)])
/** Entre parenthèses (pour un produit ou un quotient). */
const cp = (z: C) => `(${cTxt(z)})`

/** Lit « 3+2i », « 3 + 2i », « 2i+3 », « -i », « 4 », « i√3 », « 1/2 − (3/2)i », « 0,5+1,5i ». */
export function parseComplex(raw: string): C | null {
  let s = raw.trim().replace(/[−–—]/g, '-').replace(/,/g, '.').replace(/\s+/g, '').replace(/[×·*]/g, '').replace(/^z\d?=/i, '')
  if (!s || /[a-hj-zA-Z]/.test(s.replace(/sqrt/gi, '√'))) return null
  s = s.replace(/sqrt/gi, '√')
  while (s.startsWith('(') && s.endsWith(')') && depthOk(s.slice(1, -1))) s = s.slice(1, -1)
  // découpage en termes au niveau zéro des parenthèses
  const terms: string[] = []
  let depth = 0, cur = ''
  for (let k = 0; k < s.length; k++) {
    const c = s[k]
    if (c === '(') depth++
    if (c === ')') depth--
    if ((c === '+' || c === '-') && depth === 0 && !/^[+-]*$/.test(cur) && !/[/^]$/.test(cur)) { terms.push(cur); cur = '' }
    cur += c
  }
  if (cur) terms.push(cur)
  let re = 0, im = 0
  for (let t of terms) {
    let sign = 1
    while (t[0] === '+' || t[0] === '-') { if (t[0] === '-') sign = -sign; t = t.slice(1) }
    const count = (t.match(/i/g) ?? []).length
    if (count > 1) return null
    let body = count ? t.replace('i', '') : t
    if (count && (body === '' || body === '()')) body = '1'
    if (body.startsWith('/')) body = '1' + body
    const node = parseExpr(body)
    if (!node || /x/.test(body)) return null
    const v = evalExpr(node, 0)
    if (!Number.isFinite(v)) return null
    if (count) im += sign * v
    else re += sign * v
  }
  return [re, im]
}
function depthOk(s: string) {
  let d = 0
  for (const c of s) { if (c === '(') d++; if (c === ')') d--; if (d < 0) return false }
  return d === 0
}
const sameC = (a: C, b: C) => sameNumber(a[0], b[0]) && sameNumber(a[1], b[1])

/** Réponse : un nombre complexe (forme algébrique, écriture libre). */
function cAnswer(prompt: string, z: C, explanation: string, answerText?: string): Exercise {
  return {
    prompt, kind: 'input', answer: answerText ?? cTxt(z, false), explanation,
    inputHint: 'Forme a + bi',
    format: 'un nombre complexe a + bi, par exemple 3 − 2i, −i ou 4 (√ autorisé : 1 + i√3)',
    keypad: ['i', '−', '+', '/', '√'],
    isValid: (v) => parseComplex(v) !== null,
    check: (v) => { const p = parseComplex(v); return !!p && sameC(p, z) },
  }
}

/** Lit un angle : « π/3 », « -2π/3 », « 2pi/3 », « (3/4)π », « π », « 0 », « 60° ». Valeur en radians. */
function parseAngle(raw: string): number | null {
  let s = raw.trim().replace(/[−–—]/g, '-').replace(/\s+/g, '').replace(/,/g, '.').replace(/pi/gi, 'π').replace(/^(arg\(?z?\)?|θ)=/i, '')
  if (!s) return null
  const deg = /^(-?\d+(?:\.\d+)?)°$/.exec(s)
  if (deg) return (Number(deg[1]) * Math.PI) / 180
  if (!s.includes('π')) {
    const n = parseExpr(s)
    return n && !s.includes('x') ? evalExpr(n, 0) : null
  }
  if ((s.match(/π/g) ?? []).length > 1) return null
  s = s.replace(/[×*]/g, '')
  let c = s.replace('π', '')
  if (c === '' || c === '+') c = '1'
  if (c === '-') c = '-1'
  if (c.startsWith('/')) c = '1' + c
  if (c.startsWith('-/')) c = '-1' + c.slice(1)
  const n = parseExpr(c)
  if (!n || c.includes('x')) return null
  const v = evalExpr(n, 0)
  return Number.isFinite(v) ? v * Math.PI : null
}
/** Texte d’un multiple rationnel de π : 2π/3, −π/4, π, 0 (réponse) ou {2π/3} (énoncé). */
function piTxt(num: number, den: number, stacked = true): string {
  const g = gcd(Math.abs(num), Math.abs(den)) || 1
  let n = num / g, d = den / g
  if (d < 0) { n = -n; d = -d }
  if (n === 0) return '0'
  const top = `${Math.abs(n) === 1 ? '' : Math.abs(n)}π`
  const body = d === 1 ? top : stacked ? F(top, d) : `${top}/${d}`
  return n < 0 ? `−${body}` : body
}
/** Réponse : un argument (toute mesure égale à 2π près est acceptée). */
function argAnswer(prompt: string, num: number, den: number, explanation: string): Exercise {
  const target = (num / den) * Math.PI
  return {
    prompt, kind: 'input', answer: piTxt(num, den, false), explanation,
    inputHint: 'ex. 2π/3',
    format: 'un angle en radians, par exemple π/3, −3π/4 ou π (π s’écrit aussi pi)',
    keypad: ['π', '/', '−'],
    isValid: (v) => parseAngle(v) !== null,
    check: (v) => {
      const a = parseAngle(v)
      if (a === null) return false
      const k = (a - target) / (2 * Math.PI)
      return Math.abs(k - Math.round(k)) < 1e-6
    },
  }
}
/** Forme exponentielle : 2e^{iπ/3}. */
const expTxt = (r: string, num: number, den: number) => {
  const a = piTxt(num, den, false)
  if (a === '0') return r
  return `${r === '1' ? '' : r}e^{${a.startsWith('−') ? `−i${a.slice(1)}` : `i${a}`}}`
}

/** Plan complexe : repère et points nommés. */
function plane(pts: Record<string, C>, opts: { vectors?: [string, string][]; segs?: [string, string][]; caption?: string } = {}) {
  const vals = Object.values(pts)
  let xMin = Math.min(-1, ...vals.map((p) => p[0])) - 1, xMax = Math.max(1, ...vals.map((p) => p[0])) + 1
  let yMin = Math.min(-1, ...vals.map((p) => p[1])) - 1, yMax = Math.max(1, ...vals.map((p) => p[1])) + 1
  // repère orthonormé : même unité sur les deux axes (cadre 320 × 240, marges 22)
  const k = Math.max((xMax - xMin) / 276, (yMax - yMin) / 196)
  const ex = (276 * k - (xMax - xMin)) / 2, ey = (196 * k - (yMax - yMin)) / 2
  xMin -= ex; xMax += ex; yMin -= ey; yMax += ey
  const span = Math.max(xMax - xMin, yMax - yMin), step = span > 24 ? 5 : span > 12 ? 2 : 1
  const g = graphFigure({ xMin, xMax, yMin, yMax, h: 240, step, labelStep: step })
  g.figure.axes!.names = ['', '']
  for (const [n, p] of Object.entries(pts)) g.point(n, p[0], p[1], n, p[1] >= 0 ? 'ne' : 'se')
  for (const [a, b] of opts.vectors ?? []) g.segment(a, b, { head: true, color: RED })
  for (const [a, b] of opts.segs ?? []) g.segment(a, b, { color: BLUE })
  g.figure.caption = opts.caption ?? 'Plan complexe muni d’un repère orthonormé direct (O ; u⃗, v⃗).'
  return g.figure
}

const PLAN = ['Dans le plan complexe,', 'Le plan complexe est muni d’un repère orthonormé direct ;', 'Dans le plan muni d’un repère orthonormé direct (O ; u⃗, v⃗),']
const plan = () => pick(PLAN)

// ════════════════════════════════════════════════════════════════════════
// Palier 1 — rappels guidés
// ════════════════════════════════════════════════════════════════════════

const sumDiff = variants(
  () => {
    const a = rcz(), b = rcz()
    return cAnswer(`Calcule z₁ + z₂ avec z₁ = ${cTxt(a)} et z₂ = ${cTxt(b)} (forme algébrique).`, cadd(a, b),
      `On ajoute les parties réelles et les parties imaginaires : (${fmt(a[0])} + ${par(b[0])}) + (${fmt(a[1])} + ${par(b[1])})i = ${cTxt(cadd(a, b))}.`)
  },
  () => {
    const a = rcz(), b = rcz()
    return cAnswer(`Calcule z₁ − z₂ avec z₁ = ${cTxt(a)} et z₂ = ${cTxt(b)} (forme algébrique).`, csub(a, b),
      `(${fmt(a[0])} − ${par(b[0])}) + (${fmt(a[1])} − ${par(b[1])})i = ${cTxt(csub(a, b))}.`)
  },
  () => {
    const a = rcz(5), b = rcz(5), k = pick([2, 3, -2]), m = pick([2, -1, -3])
    const r = cadd(cscale(k, a), cscale(m, b))
    return cAnswer(`z₁ = ${cTxt(a)} et z₂ = ${cTxt(b)}. Écris ${poly([k, 'z₁'], [m, 'z₂'])} sous forme algébrique.`, r,
      `${fmt(k)}z₁ = ${cTxt(cscale(k, a))} et ${fmt(m)}z₂ = ${cTxt(cscale(m, b))} ; on additionne : ${cTxt(r)}.`)
  },
  () => {
    const a = rcz(), b = rcz()
    return cAnswer(`Écris sous forme algébrique : (${cTxt(a)}) − (${cTxt(b)}) + ${fmt(Math.abs(a[0]) + 1)}.`, cadd(csub(a, b), [Math.abs(a[0]) + 1, 0]),
      `Partie réelle : ${fmt(a[0])} − ${par(b[0])} + ${Math.abs(a[0]) + 1} = ${fmt(a[0] - b[0] + Math.abs(a[0]) + 1)} ; partie imaginaire : ${fmt(a[1])} − ${par(b[1])} = ${fmt(a[1] - b[1])}. Résultat ${cTxt(cadd(csub(a, b), [Math.abs(a[0]) + 1, 0]))}.`)
  },
)

const reIm = fresh(variants(
  () => {
    const a = rcz(), b = rcz(), z = cadd(a, b), re = pick([true, false])
    return numeric(`z = (${cTxt(a)}) + (${cTxt(b)}). Quelle est la partie ${re ? 'réelle' : 'imaginaire'} de z ?`, re ? z[0] : z[1], {
      explanation: `z = ${cTxt(z)} : ${re ? `Re(z) = ${fmt(z[0])}` : `Im(z) = ${fmt(z[1])} (la partie imaginaire est un réel, sans le i)`}.`,
    })
  },
  () => {
    const a = randNonZero(-9, 9), b = randNonZero(-6, 6), c = randNonZero(-6, 6)
    // z = a + b i² + c i = (a − b) + c i
    return numeric(`z = ${fmt(a)} ${b < 0 ? '−' : '+'} ${Math.abs(b) === 1 ? '' : Math.abs(b)}i² ${c < 0 ? '−' : '+'} ${Math.abs(c) === 1 ? '' : Math.abs(c)}i. Quelle est la partie réelle de z ?`, a - b, {
      explanation: `i² = −1, donc z = ${fmt(a)} ${-b < 0 ? '−' : '+'} ${Math.abs(b)} ${c < 0 ? '−' : '+'} ${Math.abs(c) === 1 ? '' : Math.abs(c)}i = ${cTxt([a - b, c])} : Re(z) = ${fmt(a - b)}.`,
    })
  },
  () => {
    const z = rcz()
    return numeric(`Quelle est la partie imaginaire de z = i(${cTxt(z)}) ?`, z[0], {
      explanation: `i(${cTxt(z)}) = ${cTxt(cmul(I, z))} (car i × ${par(z[1])}i = ${fmt(-z[1])}) : Im(z) = ${fmt(z[0])}.`,
    })
  },
  () => {
    const z = rcz(), k = pick([2, 3, -2, -3])
    return numeric(`z = ${cTxt(z)}. Quelle est la partie réelle de ${fmt(k)}iz ?`, -k * z[1], {
      explanation: `${fmt(k)}iz = ${fmt(k)}i(${cTxt(z)}) = ${cTxt(cmul([0, k], z))} : partie réelle ${fmt(-k * z[1])}.`,
    })
  },
))

const conjugate = variants(
  () => {
    const a = rcz(), b = rcz(), z = cadd(a, b)
    return cAnswer(`z = (${cTxt(a)}) + (${cTxt(b)}). Donne le conjugué z̄ de z sous forme algébrique.`, conj(z),
      `z = ${cTxt(z)}, donc z̄ = ${cTxt(conj(z))} (on change le signe de la partie imaginaire).`)
  },
  fresh(() => {
    const z = rcz(9)
    return numeric(`z = ${cTxt(z)}. Calcule z + z̄.`, 2 * z[0], { explanation: `z + z̄ = 2Re(z) = 2 × ${par(z[0])} = ${fmt(2 * z[0])}.` })
  }),
  () => {
    const z = rcz(9)
    return cAnswer(`z = ${cTxt(z)}. Calcule z − z̄.`, [0, 2 * z[1]], `z − z̄ = 2i Im(z) = 2i × ${par(z[1])} = ${cTxt([0, 2 * z[1]])}.`)
  },
  () => {
    const z = rcz(5)
    return cAnswer(`z = ${cTxt(z)}. Donne le conjugué de iz sous forme algébrique.`, conj(cmul(I, z)),
      `iz = ${cTxt(cmul(I, z))}, donc son conjugué vaut ${cTxt(conj(cmul(I, z)))}.`)
  },
)

const IPOW: C[] = [[1, 0], [0, 1], [-1, 0], [0, -1]]
const ipowTxt = (n: number) => `i^{${n}}`
const powersI = variants(
  () => {
    const n = randInt(5, 40)
    return cAnswer(`Calcule ${ipowTxt(n)}.`, IPOW[n % 4], `i⁴ = 1 ; ${n} = 4 × ${Math.floor(n / 4)} + ${n % 4}, donc ${ipowTxt(n)} = i^{${n % 4}} = ${cTxt(IPOW[n % 4])}.`)
  },
  () => {
    const n = randInt(5, 30), m = randInt(5, 30), r = cadd(IPOW[n % 4], IPOW[m % 4])
    return cAnswer(`Calcule ${ipowTxt(n)} + ${ipowTxt(m)}.`, r, `${ipowTxt(n)} = ${cTxt(IPOW[n % 4])} (reste ${n % 4} dans la division par 4) et ${ipowTxt(m)} = ${cTxt(IPOW[m % 4])} : somme ${cTxt(r)}.`)
  },
  () => {
    const n = randInt(3, 25), r = cpow([0, -1], n)
    return cAnswer(`Calcule (−i)^{${n}}.`, r, `(−i)^{${n}} = (−1)^{${n}} × i^{${n}} = ${n % 2 ? `−(${cTxt(IPOW[n % 4])}) = ${cTxt(r)}` : cTxt(r)}.`)
  },
  () => {
    const n = randInt(2, 12), k = pick([2, 3]), r = cscale(k ** n, IPOW[n % 4])
    return cAnswer(`Calcule (${k}i)^{${n}}.`, r, `(${k}i)^{${n}} = ${k}^{${n}} × i^{${n}} = ${k ** n} × (${cTxt(IPOW[n % 4])}) = ${cTxt(r)}.`)
  },
)

// ════════════════════════════════════════════════════════════════════════
// Palier 2
// ════════════════════════════════════════════════════════════════════════

const product = variants(
  () => {
    const a = rcz(5), b = rcz(5), r = cmul(a, b)
    return cAnswer(`Écris sous forme algébrique : ${cp(a)}${cp(b)}.`, r,
      `On développe : ${fmt(a[0])} × ${par(b[0])} + ${par(a[0])} × ${ip(b[1])} + ${ip(a[1])} × ${par(b[0])} + ${ip(a[1])} × ${ip(b[1])}, avec i² = −1 : ${fmt(a[0] * b[0])} ${a[0] * b[1] < 0 ? '−' : '+'} ${iAbs(a[0] * b[1])} ${a[1] * b[0] < 0 ? '−' : '+'} ${iAbs(a[1] * b[0])} ${-a[1] * b[1] < 0 ? '−' : '+'} ${Math.abs(a[1] * b[1])} = ${cTxt(r)}.`)
  },
  () => {
    const a = rcz(5), r = cmul(a, a)
    return cAnswer(`Écris sous forme algébrique : ${cp(a)}².`, r,
      `(a + bi)² = a² − b² + 2abi : ${a[0] * a[0]} − ${a[1] * a[1]} + ${par(2 * a[0] * a[1])}i = ${cTxt(r)}.`)
  },
  fresh(() => {
    const a = rcz(7)
    return numeric(`Calcule ${cp(a)}${cp(conj(a))}.`, abs2(a), { explanation: `(a + bi)(a − bi) = a² + b² = ${a[0] * a[0]} + ${a[1] * a[1]} = ${abs2(a)} : c’est un réel.` })
  }),
  () => {
    const a = rcz(6), k = pick([1, 2, 3, -2]), b: C = [0, k], r = cmul(b, a)
    return cAnswer(`Écris sous forme algébrique : ${cTxt(b)}${cp(a)}.`, r, `${cTxt(b)} × ${par(a[0])} + ${cp(b)} × ${cp([0, a[1]])} = ${cTxt([0, k * a[0]])} ${-k * a[1] < 0 ? '−' : '+'} ${Math.abs(k * a[1])} (car i² = −1), soit ${cTxt(r)}.`)
  },
)

const TRIPLES: [number, number, number][] = [[3, 4, 5], [4, 3, 5], [5, 12, 13], [12, 5, 13], [6, 8, 10], [8, 6, 10], [8, 15, 17], [15, 8, 17], [9, 12, 15], [7, 24, 25]]
const tripleZ = (): [C, number] => { const [a, b, r] = pick(TRIPLES); return [[a * pick([-1, 1]), b * pick([-1, 1])], r] }
const modulus = fresh(variants(
  () => {
    const [z, r] = tripleZ()
    return numeric(`Calcule le module de z = ${cTxt(z)}.`, r, { explanation: `|z| = √{${par(z[0])}² + ${par(z[1])}²} = √{${abs2(z)}} = ${r}.` })
  },
  () => {
    const [z, r] = tripleZ(), [w, s] = tripleZ()
    return numeric(`Calcule |z₁ × z₂| avec z₁ = ${cTxt(z)} et z₂ = ${cTxt(w)}.`, r * s, { explanation: `|z₁ z₂| = |z₁| × |z₂| = √{${abs2(z)}} × √{${abs2(w)}} = ${r} × ${s} = ${r * s}.` })
  },
  () => {
    const [z, r] = tripleZ(), k = pick([2, 3, -2, -3])
    return numeric(`z = ${cTxt(z)}. Calcule |${fmt(k)} z̄|.`, Math.abs(k) * r, { explanation: `|${fmt(k)} z̄| = |${fmt(k)}| × |z̄| = ${Math.abs(k)} × |z| = ${Math.abs(k)} × ${r} = ${Math.abs(k) * r}.` })
  },
  () => {
    const z = rcz(9)
    return numeric(`z = ${cTxt(z)}. Calcule |z|².`, abs2(z), { explanation: `|z|² = a² + b² = ${z[0] * z[0]} + ${z[1] * z[1]} = ${abs2(z)} (= z z̄).` })
  },
))

const linEq = variants(
  () => {
    const a = rcz(), z = rcz()
    const b = cadd(z, a)
    return cAnswer(`Résous dans ℂ : z + ${cp(a)} = ${cTxt(b)}.`, z, `z = ${cTxt(b)} − ${cp(a)} = ${cTxt(z)}.`)
  },
  () => {
    const z = rcz(5), k = pick([2, 3, 4]), a = rcz(5), b = cadd(cscale(k, z), a)
    return cAnswer(`Résous dans ℂ : ${k}z + ${cp(a)} = ${cTxt(b)}.`, z, `${k}z = ${cTxt(b)} − ${cp(a)} = ${cTxt(cscale(k, z))}, donc z = ${cTxt(z)}.`)
  },
  () => {
    const z = rcz(6), w = cmul(I, z)
    return cAnswer(`Résous dans ℂ : iz = ${cTxt(w)}.`, z, `On multiplie par −i (car −i × i = 1) : z = −i(${cTxt(w)}) = ${cTxt(z)}.`)
  },
  () => {
    let z = rcz(5), a = rcz(4), b = csub(a, cmul(I, z))
    // second membre nul : « − (0) » serait maladroit, on retire
    while (b[0] === 0 && b[1] === 0) { z = rcz(5); a = rcz(4); b = csub(a, cmul(I, z)) }
    return cAnswer(`Résous dans ℂ : ${cTxt(a)} − iz = ${cTxt(b)}.`, z, `iz = ${cTxt(a)} − (${cTxt(b)}) = ${cTxt(cmul(I, z))}, puis z = −i × (${cTxt(cmul(I, z))}) = ${cTxt(z)}.`)
  },
)

const affixes = variants(
  () => {
    const z = rcz(4), L = pick(['A', 'B', 'M', 'P', 'K'])
    return withMeta(cAnswer(`Quelle est l’affixe du point ${L} représenté ${pick(['ci-dessous', 'dans le plan complexe ci-dessous', 'sur la figure'])} ?`, z,
      `${L} a pour coordonnées (${fmt(z[0])} ; ${fmt(z[1])}) : son affixe est ${cTxt(z)}.`), { figure: plane({ [L]: z }) })
  },
  () => {
    const a = rcz(5), b = retry(() => { const b = rc(5); return sameC(a, b) ? null : b })
    return cAnswer(`${plan()} A a pour affixe ${cTxt(a)} et B pour affixe ${cTxt(b)}. Quelle est l’affixe du vecteur AB⃗ ?`, csub(b, a), `L’affixe de AB⃗ est z_B − z_A = ${cTxt(b)} − ${cp(a)} = ${cTxt(csub(b, a))}.`)
  },
  () => {
    const a = rc(6), b = rc(6), m = cscale(0.5, cadd(a, b))
    return cAnswer(`${plan()} A a pour affixe ${cTxt(a)} et B pour affixe ${cTxt(b)}. Quelle est l’affixe du milieu I de [AB] ?`, m, `z_I = ${F('z_A + z_B', 2)} = ${F(cTxt(cadd(a, b), false), 2)} = ${cTxt(m)}.`)
  },
  () => {
    const [a, b, c] = retry(() => { const a = rc(4), b = rc(4), c = rc(4); return Math.abs(csub(b, a)[0] * csub(c, b)[1] - csub(b, a)[1] * csub(c, b)[0]) > 0 ? [a, b, c] : null })
    const d = csub(cadd(a, c), b)
    return withMeta(cAnswer(`${plan()} A, B et C ont pour affixes ${cTxt(a)}, ${cTxt(b)} et ${cTxt(c)}. Quelle est l’affixe du point D tel que ABCD soit un parallélogramme ?`, d,
      `ABCD parallélogramme ⇔ AD⃗ = BC⃗ ⇔ z_D = z_A + z_C − z_B = ${cTxt(d)}.`), { figure: plane({ A: a, B: b, C: c }, { segs: [['A', 'B'], ['B', 'C']] }) })
  },
)

// ════════════════════════════════════════════════════════════════════════
// Palier 3 — exercices standard
// ════════════════════════════════════════════════════════════════════════

const quotient = variants(
  () => {
    const w = rcz(4), d = rcz(3), n = cmul(w, d)
    return cAnswer(`Écris sous forme algébrique : ${F(cTxt(n), cTxt(d))}.`, w,
      `On multiplie par le conjugué du dénominateur : ${F(`${cp(n)}${cp(conj(d))}`, `${abs2(d)}`)} = ${F(cTxt(cmul(n, conj(d))), abs2(d))} = ${cTxt(w)}.`)
  },
  () => {
    const d = pick([[1, 1], [1, -1], [1, 2], [2, 1], [1, 3], [3, 1], [2, -1], [3, 4], [1, -2]] as C[]), w = cdiv([1, 0], d)
    return cAnswer(`Écris l’inverse de z = ${cTxt(d)} sous forme algébrique.`, w,
      `${F(1, 'z')} = ${F(cTxt(conj(d)), `${cp(d)}${cp(conj(d))}`)} = ${F(cTxt(conj(d)), abs2(d))} = ${cTxt(w)}.`)
  },
  () => {
    const z = rcz(6)
    return cAnswer(`Écris sous forme algébrique : ${F(cTxt(z), 'i')}.`, cdiv(z, I), `${F(1, 'i')} = −i, donc ${F(cTxt(z), 'i')} = −i(${cTxt(z)}) = ${cTxt(cdiv(z, I))}.`)
  },
  () => {
    const w = rcz(3), d = rcz(3), n = cmul(w, conj(d))
    return cAnswer(`z = ${cTxt(d)}. Écris ${F(cTxt(n), 'z̄')} sous forme algébrique.`, cdiv(n, conj(d)),
      `z̄ = ${cTxt(conj(d))} ; ${F(cTxt(n), cTxt(conj(d)))} = ${F(`${cp(n)}${cp(d)}`, abs2(d))} = ${cTxt(cdiv(n, conj(d)))}.`)
  },
)

function quadRoots(): { p: number; q: number; b: number; c: number } {
  const p = randInt(-4, 4), q = randInt(1, 5)
  return { p, q, b: -2 * p, c: p * p + q * q }
}
const quadratic = variants(
  () => {
    const { p, q, b, c } = quadRoots()
    return cAnswer(`Résous dans ℂ l’équation ${poly([1, 'z²'], [b, 'z'], [c, ''])} = 0. Donne la solution de partie imaginaire positive.`, [p, q],
      `Δ = ${par(b)}² − 4 × ${c} = ${fmt(b * b - 4 * c)} < 0 : deux solutions complexes conjuguées ${F(`${fmt(-b)} ± i√{${4 * c - b * b}}`, 2)} = ${F(`${fmt(-b)} ± ${2 * q}i`, 2)}, soit ${cTxt([p, q])} et ${cTxt([p, -q])}.`)
  },
  fresh(() => {
    const { b, c } = quadRoots()
    return numeric(`Calcule le discriminant de l’équation ${poly([1, 'z²'], [b, 'z'], [c, ''])} = 0.`, b * b - 4 * c, { explanation: `Δ = b² − 4ac = ${par(b)}² − 4 × 1 × ${c} = ${fmt(b * b - 4 * c)}.` })
  }),
  () => {
    const q = randInt(1, 9)
    return cAnswer(`Résous dans ℂ l’équation z² + ${q * q} = 0. Donne la solution de partie imaginaire négative.`, [0, -q], `z² = −${q * q} = (${cTxt([0, q])})², donc z = ${cTxt([0, q])} ou z = ${cTxt([0, -q])}.`)
  },
  () => {
    const { p, q, b, c } = quadRoots()
    return cAnswer(`Résous dans ℂ l’équation ${poly([2, 'z²'], [2 * b, 'z'], [2 * c, ''])} = 0. Donne la solution de partie imaginaire négative.`, [p, -q],
      `On divise par 2 : ${poly([1, 'z²'], [b, 'z'], [c, ''])} = 0. Δ = ${fmt(b * b - 4 * c)} = (${2 * q}i)², d’où z = ${cTxt([p, q])} ou z = ${cTxt([p, -q])}.`)
  },
)

/** Complexes remarquables : (forme algébrique en texte, valeur, module², argument num/den·π). */
interface Notable { txt: string; z: C; r2: number; num: number; den: number }
function notable(): Notable {
  const k = randInt(1, 4)
  const base: [string, C, number, number, number][] = [
    ['1 + i', [1, 1], 2, 1, 4], ['1 − i', [1, -1], 2, -1, 4], ['−1 + i', [-1, 1], 2, 3, 4], ['−1 − i', [-1, -1], 2, -3, 4],
    ['√3 + i', [Math.sqrt(3), 1], 4, 1, 6], ['−√3 + i', [-Math.sqrt(3), 1], 4, 5, 6], ['√3 − i', [Math.sqrt(3), -1], 4, -1, 6],
    ['1 + i√3', [1, Math.sqrt(3)], 4, 1, 3], ['1 − i√3', [1, -Math.sqrt(3)], 4, -1, 3], ['−1 + i√3', [-1, Math.sqrt(3)], 4, 2, 3],
    ['i', [0, 1], 1, 1, 2], ['−i', [0, -1], 1, -1, 2], ['−1', [-1, 0], 1, 1, 1],
  ]
  const [t, z, r2, num, den] = pick(base)
  const txt = k === 1 ? t : t === 'i' ? `${k}i` : t === '−i' ? `−${k}i` : t === '−1' ? `−${k}` : `${k}(${t})`
  return { txt, z: [k * z[0], k * z[1]], r2: k * k * r2, num, den }
}
const modArg = variants(
  () => {
    const N = notable()
    return argAnswer(`Donne un argument de z = ${N.txt}.`, N.num, N.den,
      `|z| = ${rootText(N.r2)} et z = ${rootText(N.r2)}(cos θ + i sin θ) avec cos θ = ${trigTxt(N.num, N.den, 'cos')} et sin θ = ${trigTxt(N.num, N.den, 'sin')} : θ = ${piTxt(N.num, N.den)} (à 2π près).`)
  },
  () => {
    const N = notable()
    return exactRoot(`Calcule le module de z = ${N.txt} (valeur exacte).`, N.r2, `|z| = √{a² + b²} = √{${N.r2}} = ${rootText(N.r2)}.`)
  },
  () => {
    const N = notable()
    return argAnswer(`Donne un argument de z̄, où z = ${N.txt}.`, -N.num, N.den, `arg(z) = ${piTxt(N.num, N.den)} et arg(z̄) = −arg(z) = ${piTxt(-N.num, N.den)} (à 2π près).`)
  },
  () => {
    const N = notable()
    return argAnswer(`Donne un argument de −z, où z = ${N.txt}.`, N.num + N.den, N.den, `arg(−z) = arg(z) + π = ${piTxt(N.num, N.den)} + π = ${piTxt(N.num + N.den, N.den)} (à 2π près).`)
  },
)
const TRIG: Record<string, [string, string]> = {
  '0/1': ['1', '0'], '1/6': [F('√3', 2), F(1, 2)], '1/4': [F('√2', 2), F('√2', 2)], '1/3': [F(1, 2), F('√3', 2)], '1/2': ['0', '1'],
  '2/3': [`−${F(1, 2)}`, F('√3', 2)], '3/4': [`−${F('√2', 2)}`, F('√2', 2)], '5/6': [`−${F('√3', 2)}`, F(1, 2)], '1/1': ['−1', '0'],
}
function trigTxt(num: number, den: number, f: 'cos' | 'sin'): string {
  const g = gcd(Math.abs(num), den) || 1, n = num / g, d = den / g
  const t = TRIG[`${Math.abs(n)}/${d}`]
  if (!t) return '?'
  const v = f === 'cos' ? t[0] : t[1]
  if (f === 'sin' && n < 0 && v !== '0') return v.startsWith('−') ? v.slice(1) : `−${v}`
  return v
}

/** Cas « r e^{iθ} » : r est k × base (base = 1, ou √2 si root2), z = k × (re ; im), surd = √3 dans re ou im. */
const EXP_CASES: { r: number; root2?: boolean; num: number; den: number; z: C; re?: [number, boolean]; im?: [number, boolean] }[] = [
  { r: 2, num: 1, den: 2, z: [0, 2] }, { r: 3, num: 1, den: 1, z: [-3, 0] }, { r: 5, num: -1, den: 2, z: [0, -5] }, { r: 4, num: 0, den: 1, z: [4, 0] },
  { r: 1, root2: true, num: 1, den: 4, z: [1, 1] }, { r: 1, root2: true, num: 3, den: 4, z: [-1, 1] }, { r: 1, root2: true, num: -1, den: 4, z: [1, -1] }, { r: 1, root2: true, num: -3, den: 4, z: [-1, -1] },
  { r: 2, num: 1, den: 3, z: [1, Math.sqrt(3)], re: [1, false], im: [1, true] }, { r: 2, num: 1, den: 6, z: [Math.sqrt(3), 1], re: [1, true], im: [1, false] },
  { r: 2, num: 2, den: 3, z: [-1, Math.sqrt(3)], re: [-1, false], im: [1, true] }, { r: 2, num: -1, den: 3, z: [1, -Math.sqrt(3)], re: [1, false], im: [-1, true] },
]
/** Écriture d’un complexe à composantes « entier × (√3 éventuel) » : 2 − 2i√3, √3 + i. */
function surdTxt(re: [number, boolean], im: [number, boolean]): string {
  const part = (v: number, s: boolean) => `${Math.abs(v) === 1 && s ? '' : Math.abs(v)}${s ? '√3' : ''}`
  const ims = `${Math.abs(im[0]) === 1 ? '' : Math.abs(im[0])}i${im[1] ? '√3' : ''}`
  return `${re[0] < 0 ? '−' : ''}${part(re[0], re[1])} ${im[0] < 0 ? '−' : '+'} ${ims}`
}
const expToAlg = variants(
  ...[0, 1, 2].map((group) => () => {
    const pool = group === 0 ? EXP_CASES.slice(0, 4) : group === 1 ? EXP_CASES.slice(4, 8) : EXP_CASES.slice(8)
    const c = pick(pool), k = randInt(1, 4)
    const r = c.root2 ? `${k === 1 ? '' : k}√2` : String(c.r * k)
    const z = cscale(k, c.z)
    const ans = c.re && c.im ? surdTxt([c.re[0] * k, c.re[1]], [c.im[0] * k, c.im[1]]) : undefined
    return cAnswer(`Écris sous forme algébrique le nombre z = ${expTxt(r, c.num, c.den)}.`, z,
      `z = ${r}(cos θ + i sin θ) avec θ = ${piTxt(c.num, c.den)} : cos θ = ${trigTxt(c.num, c.den, 'cos')} et sin θ = ${trigTxt(c.num, c.den, 'sin')}. Donc z = ${ans ?? cTxt(z)}.`,
      ans)
  }),
)

const expRules = variants(
  () => {
    const [n1, d1, n2, d2] = pick([[1, 3, 1, 6], [1, 4, 1, 2], [2, 3, 1, 6], [1, 6, 1, 6], [3, 4, -1, 2], [-1, 3, 5, 6], [1, 4, 1, 4], [-1, 6, 2, 3]])
    const r1 = randInt(2, 5), r2 = randInt(2, 5), num = n1 * d2 + n2 * d1, den = d1 * d2
    return argAnswer(`z₁ = ${expTxt(String(r1), n1, d1)} et z₂ = ${expTxt(String(r2), n2, d2)}. Donne un argument de z₁ z₂.`, num, den,
      `arg(z₁z₂) = arg(z₁) + arg(z₂) = ${piTxt(n1, d1)} + ${n2 < 0 ? `(${piTxt(n2, d2)})` : piTxt(n2, d2)} = ${piTxt(num, den)} (et |z₁z₂| = ${r1 * r2}).`)
  },
  fresh(() => {
    const r = randInt(2, 3), n = randInt(2, 5), [a, b] = pick([[1, 3], [1, 4], [2, 3], [-1, 6], [3, 4]])
    return numeric(`z = ${expTxt(String(r), a, b)}. Calcule |z^{${n}}|.`, r ** n, { explanation: `|z^{${n}}| = |z|^{${n}} = ${r}^{${n}} = ${r ** n}.` })
  }),
  () => {
    const [a, b] = pick([[1, 3], [1, 4], [2, 3], [1, 6], [3, 4], [5, 6]]), n = randInt(2, 4)
    return argAnswer(`z = 2e^{i${piTxt(a, b, false)}}. Donne un argument de z^{${n}}.`, n * a, b, `arg(z^{${n}}) = ${n} × arg(z) = ${n} × ${piTxt(a, b)} = ${piTxt(n * a, b)} (à 2π près).`)
  },
  () => {
    const [n1, d1, n2, d2] = pick([[2, 3, 1, 6], [3, 4, 1, 4], [1, 2, 1, 3], [5, 6, 1, 3], [1, 3, -1, 6]])
    const r1 = randInt(2, 4) * 2, r2 = 2, num = n1 * d2 - n2 * d1, den = d1 * d2
    return argAnswer(`z₁ = ${expTxt(String(r1), n1, d1)} et z₂ = ${expTxt(String(r2), n2, d2)}. Donne un argument de ${F('z₁', 'z₂')}.`, num, den,
      `arg(${F('z₁', 'z₂')}) = arg(z₁) − arg(z₂) = ${piTxt(n1, d1)} − ${n2 < 0 ? `(${piTxt(n2, d2)})` : piTxt(n2, d2)} = ${piTxt(num, den)} (et le module vaut ${r1 / r2}).`)
  },
)

// ════════════════════════════════════════════════════════════════════════
// Palier 4
// ════════════════════════════════════════════════════════════════════════

const POW_BASES: { txt: string; z: C; r: string; num: number; den: number; ns: number[] }[] = [
  { txt: '1 + i', z: [1, 1], r: '√2', num: 1, den: 4, ns: [2, 3, 4, 5, 6, 8] },
  { txt: '1 − i', z: [1, -1], r: '√2', num: -1, den: 4, ns: [2, 3, 4, 6, 8] },
  { txt: '−1 + i', z: [-1, 1], r: '√2', num: 3, den: 4, ns: [2, 4, 6] },
  { txt: '1 + i√3', z: [1, Math.sqrt(3)], r: '2', num: 1, den: 3, ns: [3, 6] },
  { txt: '√3 + i', z: [Math.sqrt(3), 1], r: '2', num: 1, den: 6, ns: [3, 6] },
  { txt: '1 − i√3', z: [1, -Math.sqrt(3)], r: '2', num: -1, den: 3, ns: [3, 6] },
]
const powers = variants(
  ...[0, 1].map((g) => () => {
    const B = pick(g === 0 ? POW_BASES.slice(0, 3) : POW_BASES.slice(3)), n = pick(B.ns)
    const z = cpow(B.z, n).map((v) => Math.round(v)) as C
    const rn = B.r === '2' ? `2^{${n}}` : `(√2)^{${n}}`
    return cAnswer(`Écris (${B.txt})^{${n}} sous forme algébrique (passe par la forme exponentielle).`, z,
      `${B.txt} = ${expTxt(B.r, B.num, B.den)}, donc (${B.txt})^{${n}} = ${expTxt(rn, n * B.num, B.den)} = ${expTxt(String(Math.round(Math.sqrt(abs2(z)))), n * B.num, B.den)} = ${cTxt(z)}.`)
  }),
  () => {
    const n = pick([2, 3, 4, 5, 6]), k = pick([2, 3]), z = cpow([0, k], n)
    return cAnswer(`Écris (${k}i)^{${n}} (1 + i)^{2} sous forme algébrique.`, cmul(z, [0, 2]), `(1 + i)² = 2i et (${k}i)^{${n}} = ${cTxt(z)} ; produit : ${cTxt(z)} × 2i = ${cTxt(cmul(z, [0, 2]))}.`)
  },
)

const rootsUnity = variants(
  fresh(() => {
    const n = randInt(3, 12), cnt = Array.from({ length: n }, (_, k) => Math.cos((2 * k * Math.PI) / n)).filter((c) => c > 1e-9).length
    return numeric(`Combien de racines ${n}-ièmes de l’unité ont une partie réelle strictement positive ?`, cnt, {
      explanation: `Les racines sont e^{2ikπ/${n}}, k = 0, …, ${n - 1} : sommets d’un polygone régulier à ${n} côtés sur le cercle unité. Re > 0 ⇔ l’angle ${F('2kπ', n)} est dans ]−${F('π', 2)} ; ${F('π', 2)}[ (à 2π près) : ${cnt} racines.`,
    })
  }),
  fresh(() => {
    const n = randInt(3, 12), cnt = Array.from({ length: n }, (_, k) => Math.sin((2 * k * Math.PI) / n)).filter((c) => c > 1e-9).length
    return numeric(`Combien de solutions de l’équation z^{${n}} = 1 ont une partie imaginaire strictement positive ?`, cnt, {
      explanation: `Solutions e^{2ikπ/${n}} (k = 0 à ${n - 1}) ; Im > 0 ⇔ 0 < ${F('2kπ', n)} < π ⇔ 0 < k < ${F(n, 2)} : ${cnt} solutions.`,
    })
  }),
  () => {
    const n = pick([3, 4, 5, 6, 8, 10, 12]), m = retry(() => { const m = randInt(n + 1, 4 * n); return m % n ? m : null }), r = m % n
    let num = 2 * r, den = n
    if (2 * r > n) num -= 2 * n
    return argAnswer(`ω = e^{2iπ/${n}}. Donne un argument de ω^{${m}} dans ]−π ; π].`, num, den,
      `ω^{${n}} = 1 et ${m} = ${n} × ${Math.floor(m / n)} + ${r}, donc ω^{${m}} = ω^{${r}} = e^{i${piTxt(2 * r, n, false)}} ; dans ]−π ; π] : ${piTxt(num, den)}.`)
  },
  fresh(() => {
    const n = randInt(2, 9), v = n % 2 === 0 ? -1 : 1
    return numeric(`Calcule le produit de toutes les racines ${n}-ièmes de l’unité.`, v, {
      explanation: `Ce sont les racines de z^{${n}} − 1 ; leur produit vaut (−1)^{${n}} × (−1) = ${fmt(v)} (on peut aussi grouper les racines conjuguées, de produit 1${n % 2 === 0 ? ', il reste 1 × (−1)' : ', il reste 1'}).`,
    })
  }),
)

const geometry = variants(
  () => {
    const a = rc(3), u = rcz(3), k = pick([1, -1]), b = cadd(a, u), c = cadd(a, cmul([0, k], u))
    return withMeta(cAnswer(`${plan()} A, B et C ont pour affixes ${cTxt(a)}, ${cTxt(b)} et ${cTxt(c)}. Calcule ${F('z_C − z_A', 'z_B − z_A')} sous forme algébrique.`, [0, k],
      `${F(cTxt(csub(c, a)), cTxt(csub(b, a)))} = ${cTxt([0, k])} : de module 1 et d’argument ${k > 0 ? F('π', 2) : `−${F('π', 2)}`}, donc ABC est rectangle isocèle en A.`), { figure: plane({ A: a, B: b, C: c }, { segs: [['A', 'B'], ['A', 'C'], ['B', 'C']] }) })
  },
  () => {
    const w = rc(3), z = retry(() => { const z = rc(4); return sameC(z, w) ? null : z }), k = pick([1, -1]), r = cadd(w, cmul([0, k], csub(z, w)))
    return withMeta(cAnswer(`${plan()} Ω a pour affixe ω = ${cTxt(w)} et M pour affixe z = ${cTxt(z)}. M′ est l’image de M par la rotation de centre Ω et d’angle ${k > 0 ? F('π', 2) : `−${F('π', 2)}`}. Quelle est l’affixe z′ de M′ ?`, r,
      `z′ − ω = e^{${k > 0 ? '' : '−'}iπ/2}(z − ω) = ${k > 0 ? 'i' : '−i'} × (${cTxt(csub(z, w))}) = ${cTxt(cmul([0, k], csub(z, w)))}, donc z′ = ${cTxt(r)}.`), { figure: plane({ Ω: w, M: z }) })
  },
  () => {
    const w = rc(3), z = retry(() => { const z = rc(4); return sameC(z, w) ? null : z }), r = csub(cscale(2, w), z)
    return cAnswer(`${plan()} Ω a pour affixe ω = ${cTxt(w)}. Quelle est l’affixe de l’image du point M d’affixe z = ${cTxt(z)} par la rotation de centre Ω et d’angle π ?`, r,
      `z′ − ω = e^{iπ}(z − ω) = −(z − ω), donc z′ = 2ω − z = ${cTxt(r)} (c’est la symétrie de centre Ω).`)
  },
  fresh(() => {
    const a = rc(4), [d, r] = tripleZ(), b = cadd(a, d)
    return numeric(`${plan()} A et B ont pour affixes ${cTxt(a)} et ${cTxt(b)}. Calcule la distance AB.`, r, { explanation: `AB = |z_B − z_A| = |${cTxt(d)}| = √{${abs2(d)}} = ${r}.` })
  }),
)

const conjEq = variants(
  () => {
    const x = randInt(-6, 6), y = randNonZero(-6, 6)
    return cAnswer(`Résous dans ℂ : 2z + z̄ = ${cTxt([3 * x, y])}.`, [x, y], `Avec z = x + iy : 2(x + iy) + (x − iy) = 3x + iy = ${cTxt([3 * x, y])}, donc x = ${fmt(x)}, y = ${fmt(y)} : z = ${cTxt([x, y])}.`)
  },
  () => {
    const x = randInt(-6, 6), y = randNonZero(-6, 6)
    return cAnswer(`Résous dans ℂ : z − 2z̄ = ${cTxt([-x, 3 * y])}.`, [x, y], `Avec z = x + iy : x + iy − 2x + 2iy = −x + 3iy = ${cTxt([-x, 3 * y])}, donc x = ${fmt(x)}, y = ${fmt(y)} : z = ${cTxt([x, y])}.`)
  },
  () => {
    const z = rcz(5), w = cadd(z, cmul(I, conj(z)))
    return cAnswer(`Résous dans ℂ : z + i z̄ = ${cTxt(w)}, sachant que la partie réelle de z vaut ${fmt(z[0])}.`, z,
      `z = ${fmt(z[0])} + iy, z̄ = ${fmt(z[0])} − iy, i z̄ = y ${z[0] < 0 ? '−' : '+'} ${Math.abs(z[0]) === 1 ? '' : Math.abs(z[0])}i. Donc z + i z̄ = (${fmt(z[0])} + y) + (y ${z[0] < 0 ? '−' : '+'} ${Math.abs(z[0])})i ; la partie réelle donne y = ${fmt(w[0])} − ${par(z[0])} = ${fmt(z[1])}. z = ${cTxt(z)}.`)
  },
)

// ════════════════════════════════════════════════════════════════════════
// Palier 5 — exigeant
// ════════════════════════════════════════════════════════════════════════

const paramRoot = variants(
  fresh(() => {
    const p = randNonZero(-4, 4), q = randInt(1, 5), c = p * p + q * q
    return numeric(`Trouve le réel c tel que ${cTxt([p, q])} soit solution de l’équation z² ${-2 * p < 0 ? '−' : '+'} ${Math.abs(2 * p)}z + c = 0.`, c, {
      explanation: `Les coefficients sont réels : ${cTxt([p, -q])} est aussi solution, et c est le produit des solutions : (${cTxt([p, q])})(${cTxt([p, -q])}) = ${p * p} + ${q * q} = ${c}.`,
    })
  }),
  fresh(() => {
    const p = randNonZero(-4, 4), q = randInt(1, 5), c = p * p + q * q
    return numeric(`Trouve le réel b tel que ${cTxt([p, q])} soit solution de l’équation z² + bz + ${c} = 0.`, -2 * p, {
      explanation: `Coefficients réels : ${cTxt([p, -q])} est l’autre solution. La somme des solutions vaut −b : ${fmt(2 * p)} = −b, donc b = ${fmt(-2 * p)}.`,
    })
  }),
  () => {
    const p = randNonZero(-4, 4), q = randInt(1, 5), c = p * p + q * q, a = pick([1, 2, 3])
    return cAnswer(`L’équation ${poly([a, 'z²'], [-2 * p * a, 'z'], [c * a, ''])} = 0 admet ${cTxt([p, q])} pour solution. Quelle est l’autre solution ?`, [p, -q],
      `Les coefficients sont réels, donc le conjugué ${cTxt([p, -q])} est aussi solution (la somme des solutions vaut bien ${fmt(2 * p)} = −${a === 1 ? par(-2 * p) : F(fmt(-2 * p * a), a)}).`)
  },
)

const smallestN = variants(
  ...['réel strictement positif', 'réel strictement négatif', 'imaginaire pur (non nul)'].map((cond) => fresh(() => {
    const [B, n] = retry(() => {
    const B = pick(POW_BASES.concat([{ txt: '−√3 + i', z: [-Math.sqrt(3), 1], r: '2', num: 5, den: 6, ns: [] }]))
    const ok = (n: number) => {
      const a = ((n * B.num) / B.den) % 2, t = ((a % 2) + 2) % 2
      return cond.startsWith('réel strictement positif') ? Math.abs(t) < 1e-9 || Math.abs(t - 2) < 1e-9
        : cond.startsWith('réel strictement négatif') ? Math.abs(t - 1) < 1e-9 : Math.abs(t - 0.5) < 1e-9 || Math.abs(t - 1.5) < 1e-9
    }
    let n = 1
    while (n < 30 && !ok(n)) n++
    return n < 30 ? [B, n] as [typeof B, number] : null
    })
    return numeric(`Quel est le plus petit entier n ≥ 1 tel que (${B.txt})^{n} soit un ${cond} ?`, n, {
      explanation: `${B.txt} = ${expTxt(B.r, B.num, B.den)}, donc (${B.txt})^{n} a pour argument ${F(`${Math.abs(B.num) === 1 ? (B.num < 0 ? '−' : '') : B.num}nπ`, B.den)}. Il faut que cet argument soit ${cond.startsWith('réel strictement positif') ? 'un multiple de 2π' : cond.startsWith('réel strictement négatif') ? 'égal à π modulo 2π' : 'égal à ±π/2 modulo 2π'} : le plus petit n est ${n}.`,
    })
  })),
)

const cubic = variants(
  () => {
    const r = randNonZero(-3, 3), p = randInt(-3, 3), q = randInt(1, 4), b = -2 * p, c = p * p + q * q
    // (z − r)(z² + bz + c) = z³ + (b − r)z² + (c − br)z − cr
    return cAnswer(`P(z) = ${poly([1, 'z³'], [b - r, 'z²'], [c - b * r, 'z'], [-c * r, ''])}. Vérifie que ${fmt(r)} est racine de P, puis donne la racine de P de partie imaginaire strictement positive.`, [p, q],
      `P(z) = (${poly([1, 'z'], [-r, ''])})(${poly([1, 'z²'], [b, 'z'], [c, ''])}) (par identification). Le trinôme a Δ = ${fmt(b * b - 4 * c)} = (${2 * q}i)², d’où z = ${cTxt([p, q])} ou ${cTxt([p, -q])}.`)
  },
  fresh(() => {
    const r = randNonZero(-3, 3), p = randInt(-3, 3), q = randInt(1, 4), b = -2 * p, c = p * p + q * q
    return numeric(`P(z) = ${poly([1, 'z³'], [b - r, 'z²'], [c - b * r, 'z'], [-c * r, ''])} admet ${fmt(r)} pour racine. Calcule le produit des modules de ses deux racines non réelles.`, c, {
      explanation: `P(z) = (${poly([1, 'z'], [-r, ''])})(${poly([1, 'z²'], [b, 'z'], [c, ''])}) ; les racines non réelles sont ${cTxt([p, q])} et son conjugué, de même module √{${c}} : produit des modules ${c}.`,
    })
  }),
  () => {
    const a = pick([1, 2, 3])
    return cAnswer(`Résous z³ = ${a ** 3} dans ℂ. Donne la solution de partie imaginaire strictement négative (forme algébrique).`, [-a / 2, (-a * Math.sqrt(3)) / 2],
      `z³ = ${a ** 3} ⇔ (${F('z', a)})³ = 1 : z = ${a}e^{2ikπ/3}, k ∈ {0 ; 1 ; 2}. Celle de partie imaginaire négative : ${a}e^{−2iπ/3} = ${a}(−${F(1, 2)} − i${F('√3', 2)}).`,
      `${a === 1 ? '−1/2 − (√3/2)i' : a === 2 ? '−1 − i√3' : '−3/2 − (3√3/2)i'}`)
  },
)

const loci = variants(
  fresh(() => {
    const a = rcz(4), R = randInt(2, 9), k = pick([2, 3])
    return numeric(`${plan()} quel est le rayon du cercle formé par les points M d’affixe z tels que |${k}z − ${cp(cscale(k, a))}| = ${k * R} ?`, R, {
      explanation: `|${k}z − ${cp(cscale(k, a))}| = ${k}|z − ${cp(a)}| = ${k * R} ⇔ |z − ${cp(a)}| = ${R} : cercle de centre ${cTxt(a)} et de rayon ${R}.`,
    })
  }),
  fresh(() => {
    const [a, b, x] = retry(() => {
      const a = rcz(5), b = rcz(5)
      if (a[0] === b[0]) return null
      const num = abs2(b) - abs2(a), den = 2 * (b[0] - a[0])
      return num % den === 0 ? [a, b, num / den] as [C, C, number] : null
    })
    return numeric(`${plan()} l’ensemble des points M d’affixe z tels que |z − ${cp(a)}| = |z − ${cp(b)}| est une droite. En quel point (d’affixe réelle x) coupe-t-elle l’axe des réels ? Donne x.`, x, {
      explanation: `C’est la médiatrice de [AB] (A(${cTxt(a)}), B(${cTxt(b)})). Pour z = x réel : (x − ${par(a[0])})² + ${a[1] * a[1]} = (x − ${par(b[0])})² + ${b[1] * b[1]}, équation du premier degré : x = ${fmt(x)}.`,
    })
  }),
  fresh(() => {
    const [a, b, y] = retry(() => {
      const a = rcz(5), b = rcz(5)
      if (a[1] === b[1]) return null
      const num = abs2(b) - abs2(a), den = 2 * (b[1] - a[1])
      return num % den === 0 ? [a, b, num / den] as [C, C, number] : null
    })
    return numeric(`${plan()} on cherche le nombre imaginaire pur z = iy (y réel) tel que |z − ${cp(a)}| = |z − ${cp(b)}|. Que vaut y ?`, y, {
      explanation: `${a[0] * a[0]} + (y − ${par(a[1])})² = ${b[0] * b[0]} + (y − ${par(b[1])})² ; les y² s’éliminent : y = ${fmt(y)}.`,
    })
  }),
)

// ════════════════════════════════════════════════════════════════════════
// Problèmes d’amélioration
// ════════════════════════════════════════════════════════════════════════

const T = (title: string, ex: Exercise, figure?: Figure): Exercise => withMeta(ex, figure ? { title, figure } : { title })

/** Racine carrée d’un complexe à coordonnées entières : (x + iy)² = a + bi. */
const sqrtCases = (): C => retry(() => { const z = rcz(5); return z[0] > 0 ? z : null })

const upgrades: Ladder = [
  [
    () => {
      const n = randInt(5, 30)
      let s: C = [0, 0]
      for (let k = 1; k <= n; k++) s = cadd(s, IPOW[k % 4])
      return T('La somme des puissances', cAnswer(`Calcule S = i + i² + i³ + … + i^{${n}}.`, s,
        `Les puissances de i se répètent par blocs de 4 (i, −1, −i, 1) de somme nulle. ${n % 4 === 0 ? `${n} termes forment ${n / 4} blocs complets : S = 0.` : `${n} = 4 × ${Math.floor(n / 4)} + ${n % 4} : il reste les ${n % 4} premiers termes du cycle, S = ${cTxt(s)}.`}`))
    },
    () => {
      const z = sqrtCases(), w = cmul(z, z)
      return T('La racine carrée', cAnswer(`Trouve le nombre complexe z = x + iy, avec x > 0, tel que z² = ${cTxt(w)}.`, z,
        `z² = x² − y² + 2ixy : x² − y² = ${fmt(w[0])} et 2xy = ${fmt(w[1])}. De plus |z|² = |z²| : x² + y² = √{${abs2(w)}} = ${abs2(z)}. D’où x² = ${z[0] * z[0]}, x = ${z[0]}, puis y = ${fmt(z[1])}.`))
    },
    () => {
      const x = randNonZero(-5, 5), y = randNonZero(-5, 5), a = rcz(3), w = cmul([x, y], a)
      return T('Les deux réels', cAnswer(`x et y sont deux réels tels que (x + iy)${cp(a)} = ${cTxt(w)}. Donne x + iy.`, [x, y],
        `x + iy = ${F(cTxt(w), cTxt(a))} = ${F(`${cp(w)}${cp(conj(a))}`, abs2(a))} = ${cTxt([x, y])}.`))
    },
  ],
  [
    () => {
      const cases = [
        { f: 'cos(3θ)', t: [['a', 'cos³θ', 4], ['b', 'cosθ', -3]], how: 'la partie réelle de (cos θ + i sin θ)³ = cos³θ − 3cosθ sin²θ + i(…), avec sin²θ = 1 − cos²θ' },
        { f: 'sin(3θ)', t: [['a', 'sinθ', 3], ['b', 'sin³θ', -4]], how: 'la partie imaginaire de (cos θ + i sin θ)³, soit 3cos²θ sinθ − sin³θ, avec cos²θ = 1 − sin²θ' },
        { f: 'cos(2θ)', t: [['a', 'cos²θ', 2], ['b', '', -1]], how: 'la partie réelle de (cos θ + i sin θ)² = cos²θ − sin²θ, avec sin²θ = 1 − cos²θ' },
        { f: 'cos(2θ)', t: [['a', '', 1], ['b', 'sin²θ', -2]], how: 'la partie réelle de (cos θ + i sin θ)² = cos²θ − sin²θ, avec cos²θ = 1 − sin²θ' },
        { f: 'cos(4θ)', t: [['a', 'cos⁴θ', 8], ['b', 'cos²θ', -8], ['c', '', 1]], how: 'la partie réelle de (cos θ + i sin θ)⁴ = cos⁴θ − 6cos²θ sin²θ + sin⁴θ + i(…), avec sin²θ = 1 − cos²θ' },
      ] as { f: string; t: [string, string, number][]; how: string }[]
      const c = pick(cases), [L, , val] = pick(c.t)
      const form = c.t.map(([l, v]) => `${l}${v ? ` ${v}` : ''}`).join(' + ')
      return T('La formule de Moivre', numeric(`${pick(['Avec la formule de Moivre', 'En développant (cos θ + i sin θ)^n', 'Grâce à la forme exponentielle'])}, on obtient ${c.f} = ${form} pour tout réel θ (a, b${c.t.length > 2 ? ', c' : ''} réels). Que vaut ${L} ?`, val, {
        explanation: `${c.f} est ${c.how} ; on obtient ${c.f} = ${poly(...c.t.map(([, v, k]) => [k, v] as [number, string]))}, donc ${L} = ${fmt(val)}.`,
      }))
    },
    () => {
      const B = pick([{ txt: '1 + i', r2: 2, num: 1, den: 4 }, { txt: '1 − i', r2: 2, num: -1, den: 4 }, { txt: '1 + i√3', r2: 4, num: 1, den: 3 }, { txt: '√3 − i', r2: 4, num: -1, den: 6 }])
      const n = retry(() => { const n = randInt(8, 24); const t = (((n * B.num) / B.den) % 2 + 2) % 2; return Math.abs(t - Math.round(t)) < 1e-9 && Math.pow(Math.sqrt(B.r2), n) <= 1e7 ? n : null })
      const t = Math.round((((n * B.num) / B.den) % 2 + 2) % 2), v = Math.round(Math.pow(Math.sqrt(B.r2), n)) * (t === 0 ? 1 : -1)
      return T('La grande puissance', numeric(`Calcule (${B.txt})^{${n}} (c’est un nombre réel).`, v, {
        explanation: `${B.txt} = ${expTxt(B.r2 === 2 ? '√2' : '2', B.num, B.den)}. Donc (${B.txt})^{${n}} = ${B.r2 === 2 ? `2^{${n / 2}}` : `2^{${n}}`} e^{i${piTxt(n * B.num, B.den, false)}} et ${piTxt(n * B.num, B.den)} ≡ ${t === 0 ? '0' : 'π'} (mod 2π) : résultat ${fmt(v)}.`,
      }))
    },
    () => {
      const a = randInt(1, 6), k = pick([1, -1, 0])
      const ans: C = k === 0 ? [-a, 0] : [a / 2, (k * a * Math.sqrt(3)) / 2]
      const half = a % 2 === 0 ? `${a / 2 === 1 ? '' : a / 2}` : ''
      const txt = k === 0 ? `−${a}` : a % 2 === 0 ? `${a / 2} ${k > 0 ? '+' : '−'} ${half}i√3` : `${a}/2 ${k > 0 ? '+' : '−'} (${a === 1 ? '' : a}√3/2)i`
      return T('Les trois solutions', cAnswer(`Résous z³ = −${a ** 3} dans ℂ. Donne la solution ${k > 0 ? 'de partie imaginaire strictement positive' : k < 0 ? 'de partie imaginaire strictement négative' : 'réelle'} (forme algébrique).`, ans,
        `−${a ** 3} = ${a ** 3}e^{iπ} : z = ${a === 1 ? '' : a}e^{i(π + 2kπ)/3}, soit ${a === 1 ? '' : a}e^{iπ/3}, ${a === 1 ? '' : a}e^{iπ} = −${a} et ${a === 1 ? '' : a}e^{−iπ/3} ; e^{±iπ/3} = ${F(1, 2)} ± i${F('√3', 2)}. Réponse : ${txt}.`, txt))
    },
  ],
  [
    () => {
      const k = randInt(1, 4), up = pick([true, false])
      const ans: C = [k, (up ? 1 : -1) * k * Math.sqrt(3)]
      return T('Le triangle équilatéral', withMeta(cAnswer(`${plan()} A a pour affixe 0 et B pour affixe ${2 * k}. Donne l’affixe du point C tel que ABC soit équilatéral et que C ait une partie imaginaire ${up ? 'positive' : 'négative'}.`, ans,
        `C est l’image de B par la rotation de centre A d’angle ${up ? '' : '−'}${F('π', 3)} : z_C = ${2 * k}e^{${up ? '' : '−'}iπ/3} = ${2 * k}(${F(1, 2)} ${up ? '+' : '−'} i${F('√3', 2)}) = ${k} ${up ? '+' : '−'} ${k === 1 ? '' : k}i√3.`,
        `${k} ${up ? '+' : '−'} ${k === 1 ? '' : k}i√3`), { figure: plane({ A: [0, 0], B: [2 * k, 0], C: ans }, { segs: [['A', 'B'], ['B', 'C'], ['C', 'A']] }) }))
    },
    fresh(() => {
      const n = randInt(3, 12)
      return T('Le produit des écarts', numeric(`ω = e^{2iπ/${n}}. Calcule le produit (1 − ω)(1 − ω²)…(1 − ω^{${n - 1}}).`, n, {
        explanation: `z^{${n}} − 1 = (z − 1)(z − ω)…(z − ω^{${n - 1}}) et aussi (z − 1)(1 + z + … + z^{${n - 1}}). Donc (z − ω)…(z − ω^{${n - 1}}) = 1 + z + … + z^{${n - 1}} ; en z = 1 : le produit vaut ${n}.`,
      }))
    }),
    () => {
      const n = pick([3, 4, 5, 6, 8]), p = randInt(2, 9)
      const val = p % n === 0 ? n : 0
      return T('La somme des racines', numeric(`ω = e^{2iπ/${n}}. Calcule 1 + ω^{${p}} + ω^{${2 * p}} + … + ω^{${(n - 1) * p}} (somme de ${n} termes).`, val, {
        explanation: val === n ? `ω^{${p}} = 1 (${p} est multiple de ${n}) : chaque terme vaut 1, somme ${n}.` : `q = ω^{${p}} ≠ 1 et q^{${n}} = 1 : somme géométrique ${F(`1 − q^{${n}}`, '1 − q')} = 0.`,
      }))
    },
  ],
]

// ════════════════════════════════════════════════════════════════════════
// Problèmes de l’hôtel de ville
// ════════════════════════════════════════════════════════════════════════

const age: Ladder = [
  [
    () => {
      const z0 = rc(3), u = rcz(3), k = pick([1, -1]), z1 = cadd(z0, u), z2 = cadd(z1, cmul([0, k], u)), who = personnage()
      return T('La carte au trésor', cAnswer(`Sur la carte (plan complexe), ${who.nom} part du vieux chêne d’affixe ${cTxt(z0)} et marche jusqu’au puits, en ajoutant ${cTxt(u)} à sa position. Au puits, ${who.il} tourne d’un quart de tour vers la ${k > 0 ? 'gauche' : 'droite'} et refait la même distance (déplacement ${k > 0 ? 'i' : '−i'} × (${cTxt(u)})). Quelle est l’affixe du trésor ?`, z2,
        `Puits : ${cTxt(z0)} + ${cp(u)} = ${cTxt(z1)}. Quart de tour ${k > 0 ? 'à gauche : multiplication par i' : 'à droite : multiplication par −i'} : ${cTxt(cmul([0, k], u))}. Trésor : ${cTxt(z2)}.`),
        plane({ C: z0, P: z1, T: z2 }, { vectors: [['C', 'P'], ['P', 'T']], caption: 'C : le chêne, P : le puits, T : le trésor.' }))
    },
    () => {
      const z = rcz(4), k = randInt(2, 7), r = cmul(cpow(I, k), z)
      return T('La roue du moulin', cAnswer(`Le centre de la roue du moulin est l’origine du plan complexe. Un godet est au point d’affixe ${cTxt(z)}. La roue fait ${k} quarts de tour dans le sens direct. Quelle est alors l’affixe du godet ?`, r,
        `Un quart de tour direct multiplie l’affixe par i ; ${k} quarts de tour : par i^{${k}} = ${cTxt(cpow(I, k))}. ${cTxt(cpow(I, k))} × (${cTxt(z)}) = ${cTxt(r)}.`),
        plane({ O: [0, 0], G: z }, { caption: 'G : position initiale du godet.' }))
    },
    fresh(() => {
      const R1 = randInt(1, 5), X1 = randInt(-4, 6), [[a, b], r] = retry(() => { const t = tripleZ(); return Math.abs(t[0][0]) > R1 ? t : null })
      const z1: C = [R1, X1], z2: C = [Math.abs(a) - R1, b - X1]
      return T('Le circuit électrique', numeric(`En électricité, une impédance est un nombre complexe Z = R + iX. Deux dipôles d’impédances Z₁ = ${cTxt(z1)} et Z₂ = ${cTxt(z2)} (en ohms) sont montés en série : l’impédance totale est Z₁ + Z₂. Quel est son module (en ohms) ?`, r, {
        explanation: `Z = Z₁ + Z₂ = ${cTxt(cadd(z1, z2))}, |Z| = √{${abs2(cadd(z1, z2))}} = ${r} Ω.`,
      }))
    }),
  ],
  [
    () => {
      const a = rc(3), u = rcz(3), k = pick([1, -1]), b = cadd(a, u), c = cadd(b, cmul([0, k], u)), d = cadd(a, cmul([0, k], u))
      const which = pick(['C', 'D'])
      return T('Le carré du jardin', cAnswer(`Un jardin carré ABCD est tracé dans le sens ${k > 0 ? 'direct' : 'indirect'}. Les piquets A et B ont pour affixes ${cTxt(a)} et ${cTxt(b)}. Quelle est l’affixe du piquet ${which} ?`, which === 'C' ? c : d,
        which === 'C' ? `C est l’image de A par la rotation de centre B d’angle ${k > 0 ? '−' : ''}${F('π', 2)} : z_C − z_B = ${k > 0 ? '−i' : 'i'}(z_A − z_B) = ${cTxt(cmul([0, -k], csub(a, b)))}, donc z_C = ${cTxt(c)}.`
          : `AD⃗ s’obtient en tournant AB⃗ de ${k > 0 ? '' : '−'}${F('π', 2)} : z_D − z_A = ${k > 0 ? 'i' : '−i'}(z_B − z_A) = ${cTxt(cmul([0, k], u))}, donc z_D = ${cTxt(d)}.`),
        plane({ A: a, B: b }, { segs: [['A', 'B']], caption: 'Les deux premiers piquets A et B.' }))
    },
    fresh(() => {
      const a = rcz(5), [d, r] = tripleZ()
      return T('Les deux tours', numeric(`Sur le plan complexe de la ville (1 unité = 10 m), la tour nord a pour affixe ${cTxt(a)} et la tour sud ${cTxt(cadd(a, d))}. Quelle distance (en m) sépare les deux tours ?`, r * 10, {
        explanation: `Distance = |${cTxt(cadd(a, d))} − ${cp(a)}| = |${cTxt(d)}| = √{${abs2(d)}} = ${r} unités, soit ${r * 10} m.`,
      }), plane({ N: a, S: cadd(a, d) }, { segs: [['N', 'S']], caption: 'N : tour nord, S : tour sud.' }))
    }),
    () => {
      const [z1, z2] = retry(() => {
        const z1 = rcz(4), z2 = rcz(4), s = cadd(z1, z2)
        if (abs2(s) === 0) return null
        const p = cdiv(cmul(z1, z2), s)
        return Number.isInteger(p[0] * 2) && Number.isInteger(p[1] * 2) && z1[0] > 0 && z2[0] > 0 ? [z1, z2] : null
      })
      const s = cadd(z1, z2), p = cdiv(cmul(z1, z2), s)
      return T('Les dipôles en parallèle', cAnswer(`Deux dipôles d’impédances Z₁ = ${cTxt(z1)} et Z₂ = ${cTxt(z2)} sont montés en parallèle : l’impédance équivalente vaut Z = ${F('Z₁ Z₂', 'Z₁ + Z₂')}. Écris Z sous forme algébrique.`, p,
        `Z₁Z₂ = ${cTxt(cmul(z1, z2))} et Z₁ + Z₂ = ${cTxt(s)} ; Z = ${F(cTxt(cmul(z1, z2)), cTxt(s))} = ${F(`${cp(cmul(z1, z2))}${cp(conj(s))}`, abs2(s))} = ${cTxt(p)}.`))
    },
  ],
  [
    () => {
      const n = pick([3, 4, 6]), R = randInt(2, 6), what = pick(['périmètre', 'aire'])
      const fig = plane(Object.fromEntries(Array.from({ length: n }, (_, k) => [`M${k}`, [R * Math.cos((2 * k * Math.PI) / n), R * Math.sin((2 * k * Math.PI) / n)] as C])), {
        segs: Array.from({ length: n }, (_, k) => [`M${k}`, `M${(k + 1) % n}`] as [string, string]), caption: 'Les sommets du sceau (figure à l’échelle).',
      })
      for (const p of Object.values(fig.points)) p.label = ''
      const desc = `Les sommets du sceau d’un mage sont les points dont les affixes sont les solutions de z^{${n}} = ${R ** n}.`
      // pour les aires (triangle, hexagone), rayon pair : résultat a√3 avec a entier
      const R2 = 2 * randInt(1, 3), desc2 = `Les sommets du sceau d’un mage sont les points dont les affixes sont les solutions de z^{${n}} = ${R2 ** n}.`
      const fig2 = plane(Object.fromEntries(Array.from({ length: n }, (_, k) => [`M${k}`, [R2 * Math.cos((2 * k * Math.PI) / n), R2 * Math.sin((2 * k * Math.PI) / n)] as C])), {
        segs: Array.from({ length: n }, (_, k) => [`M${k}`, `M${(k + 1) % n}`] as [string, string]), caption: 'Les sommets du sceau (figure à l’échelle).',
      })
      for (const p of Object.values(fig2.points)) p.label = ''
      if (n === 3) {
        return T('Le sceau du mage', what === 'périmètre'
          ? radical(`${desc} Quel est le périmètre de ce triangle (forme a√b) ?`, 3 * R, 3, { explanation: `Solutions ${R}e^{2ikπ/3} : triangle équilatéral inscrit dans le cercle de rayon ${R}. Côté |${R} − ${R}e^{2iπ/3}| = ${R}√3, périmètre ${3 * R}√3.` })
          : radical(`${desc2} Quelle est l’aire de ce triangle (forme a√b) ?`, (3 * R2 * R2) / 4, 3, { explanation: `Côté ${R2}√3 ; aire = ${F('√3', 4)} × (${R2}√3)² = ${F(`${3 * R2 * R2}√3`, 4)} = ${(3 * R2 * R2) / 4}√3.` }), fig2)
      }
      if (n === 4) {
        return T('Le sceau du mage', what === 'périmètre'
          ? radical(`${desc} Quel est le périmètre de ce carré (forme a√b) ?`, 4 * R, 2, { explanation: `Solutions ${R}, ${R}i, −${R}, −${R}i : carré de côté |${R} − ${R}i| = ${R}√2, périmètre ${4 * R}√2.` })
          : numeric(`${desc} Quelle est l’aire de ce carré ?`, 2 * R * R, { explanation: `Côté ${R}√2 (distance de ${R} à ${R}i) : aire (${R}√2)² = ${2 * R * R}.` }), fig)
      }
      return T('Le sceau du mage', what === 'périmètre'
        ? numeric(`${desc} Quel est le périmètre de cet hexagone ?`, 6 * R, { explanation: `Solutions ${R}e^{ikπ/3} : hexagone régulier inscrit dans le cercle de rayon ${R}, de côté |${R} − ${R}e^{iπ/3}| = ${R}. Périmètre ${6 * R}.` })
        : radical(`${desc2} Quelle est l’aire de cet hexagone (forme a√b) ?`, (3 * R2 * R2) / 2, 3, { explanation: `Six triangles équilatéraux de côté ${R2} : aire = 6 × ${F('√3', 4)} × ${R2 * R2} = ${(3 * R2 * R2) / 2}√3.` }), fig2)
    },
    () => {
      const w1 = rc(2), w2 = retry(() => { const w = rcz(3); return sameC(w, w1) ? null : w }), z = retry(() => { const z = rc(4); return sameC(z, w1) ? null : z })
      const k1 = pick([1, -1]), z1 = cadd(w1, cmul([0, k1], csub(z, w1))), z2 = csub(cscale(2, w2), z1)
      if (abs2(z1) === 0 || abs2(w1) === 0) return age[2][1]()
      return T('Le pont tournant', cAnswer(`Un pont tournant pivote d’un quart de tour ${k1 > 0 ? 'dans le sens direct' : 'dans le sens indirect'} autour de la pile Ω₁ d’affixe ${cTxt(w1)}, puis d’un demi-tour autour de la pile Ω₂ d’affixe ${cTxt(w2)}. Où arrive l’extrémité du pont, initialement au point d’affixe ${cTxt(z)} ?`, z2,
        `Quart de tour : z₁ = ${cTxt(w1)} + ${k1 > 0 ? 'i' : '(−i)'}(${cTxt(csub(z, w1))}) = ${cTxt(z1)}. Demi-tour autour de Ω₂ : z₂ = 2 × (${cTxt(w2)}) − (${cTxt(z1)}) = ${cTxt(z2)}.`),
        plane({ Ω: w1, P: w2, E: z }, { caption: 'Ω : pile Ω₁, P : pile Ω₂, E : extrémité du pont au départ.' }))
    },
    () => {
      const [p, a] = retry(() => { const p = randInt(-3, 3), a = randNonZero(-3, 3); return p !== a ? [p, a] : null })
      const q = randInt(1, 4), A: C = [p, q], B: C = [p, -q], Cc: C = [a, 0]
      const area = Math.abs(q * (p - a))
      return T('Le triangle des racines', numeric(`Les solutions de l’équation (z − ${par(a)})(${poly([1, 'z²'], [-2 * p, 'z'], [p * p + q * q, ''])}) = 0 sont les affixes des sommets A, B, C d’un triangle (C sur l’axe réel). Quelle est l’aire de ce triangle ?`, area, {
        explanation: `Les solutions sont ${fmt(a)}, ${cTxt(A)} et ${cTxt(B)} (Δ = −${4 * q * q}). [AB] est vertical de longueur ${2 * q} et C est à la distance |${fmt(p)} − ${par(a)}| = ${Math.abs(p - a)} de la droite (AB) : aire = ${F(`${2 * q} × ${Math.abs(p - a)}`, 2)} = ${area}.`,
      }), plane({ A, B, C: Cc }, { segs: [['A', 'B'], ['B', 'C'], ['C', 'A']] }))
    },
  ],
]

const tiers: Tiers = [
  [sumDiff, reIm, conjugate, powersI],
  [product, modulus, linEq, affixes],
  [quotient, quadratic, modArg, expToAlg, expRules],
  [powers, rootsUnity, geometry, conjEq],
  [paramRoot, smallestN, cubic, loci],
]

export const CONTENT: SubjectContent | null = { tiers, upgrades, age }
