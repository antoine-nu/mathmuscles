export interface Exercise {
  /** Énoncé. Mini-syntaxe : {a/b} → fraction empilée, ^n ou ^{…} → exposant, √{…} → racine, x_B → indice. */
  prompt: string
  kind: 'input' | 'choice'
  choices?: string[]
  /** Réponse attendue, telle qu'affichée en correction. */
  answer: string
  /** Texte d'aide dans le champ de saisie. */
  inputHint?: string
  /** Symboles proposés sous le champ de saisie. */
  keypad?: string[]
  /** Format attendu, rappelé quand la saisie est illisible. */
  format?: string
  explanation?: string
  /** Faux = réponse illisible : on demande de la réécrire sans compter d'erreur. */
  isValid?: (value: string) => boolean
  /** Message précis quand la réponse est fausse (ex. « juste mais pas développée »). */
  diagnose?: (value: string) => string | undefined
  check: (value: string) => boolean
}

/** 5 paliers : le palier n correspond au cran n − 1 de la jauge. */
export type Difficulty = 1 | 2 | 3 | 4 | 5
export type Maker = () => Exercise
/** Pour chaque palier (index 0 → palier 1), une réserve de modèles d'exercices. */
export type Tiers = [Maker[], Maker[], Maker[], Maker[], Maker[]]

export const randInt = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1))
export const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)]
export const randNonZero = (a: number, b: number) => {
  let n = 0
  while (n === 0) n = randInt(a, b)
  return n
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export const gcd = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcd(b, a % b))

/** Nombre au format français : −3 ; 2,5 */
export function fmt(n: number): string {
  const rounded = Math.round(n * 1e6) / 1e6
  const s = String(Math.abs(rounded)).replace('.', ',')
  return rounded < 0 ? `−${s}` : s
}

/** Nombre entre parenthèses s'il est négatif : (−3) */
export const par = (n: number) => (n < 0 ? `(${fmt(n)})` : fmt(n))
/** Relatif avec signe explicite : (+4) ou (−7) */
export const signed = (n: number) => (n < 0 ? `(${fmt(n)})` : `(+${fmt(n)})`)

/** Fraction réduite « a/b » en texte simple (ou entier). */
export function fracText(num: number, den: number): string {
  if (den < 0) {
    num = -num
    den = -den
  }
  const g = gcd(num, den) || 1
  const n = num / g
  const d = den / g
  if (d === 1) return fmt(n)
  return `${n < 0 ? '−' : ''}${Math.abs(n)}/${d}`
}

/** Fraction empilée dans un énoncé : {a/b} */
export const F = (n: number | string, d: number | string) => `{${n}/${d}}`

const normalize = (raw: string) => raw.trim().replace(/[−–—]/g, '-').replace(/\s+/g, '')

/** Lit « 3 », « −2,5 », « 3/4 », « -7 / 2 ». Renvoie NaN si illisible. */
export function parseNumber(raw: string): number {
  const s = normalize(raw).replace(/,/g, '.')
  if (!s) return NaN
  if (s.includes('/')) {
    const [a, b, ...rest] = s.split('/')
    if (rest.length) return NaN
    const x = Number(a)
    const y = Number(b)
    if (!a || !b || !Number.isFinite(x) || !Number.isFinite(y) || y === 0) return NaN
    return x / y
  }
  const n = Number(s)
  return Number.isFinite(n) ? n : NaN
}

export const sameNumber = (a: number, b: number) => Math.abs(a - b) < 1e-6 * Math.max(1, Math.abs(b))

// ── Expressions en x ────────────────────────────────────────────────────
type Node =
  | { t: 'num'; v: number }
  | { t: 'x' }
  | { t: 'bin'; op: '+' | '-' | '*' | '/' | '^'; a: Node; b: Node }
  | { t: 'neg'; a: Node }
  | { t: 'sqrt'; a: Node }

function prepExpr(raw: string): string {
  return normalize(raw)
    .replace(/[×·]/g, '*')
    .replace(/÷/g, '/')
    .replace(/,/g, '.')
    .replace(/²/g, '^2')
    .replace(/³/g, '^3')
    .replace(/sqrt/gi, '√')
    .replace(/X/g, 'x')
    .replace(/^(y|f\(x\)|g\(x\)|[A-Z])=/, '')
}

/** Analyse « 3x² − (x+1)(2x−5) », « 6√2 »… Renvoie null si illisible. */
export function parseExpr(raw: string): Node | null {
  const s = prepExpr(raw)
  if (!s) return null
  let i = 0
  const peek = () => s[i]
  const expr = (): Node => {
    let n = term()
    while (peek() === '+' || peek() === '-') {
      const op = s[i++] as '+' | '-'
      n = { t: 'bin', op, a: n, b: term() }
    }
    return n
  }
  const term = (): Node => {
    let n = unary()
    for (;;) {
      const c = peek()
      if (c === '*' || c === '/') {
        i++
        n = { t: 'bin', op: c, a: n, b: unary() }
      } else if (c !== undefined && /[0-9.x(√]/.test(c)) {
        n = { t: 'bin', op: '*', a: n, b: power() }
      } else break
    }
    return n
  }
  const unary = (): Node => {
    if (peek() === '-') { i++; return { t: 'neg', a: unary() } }
    if (peek() === '+') { i++; return unary() }
    return power()
  }
  const power = (): Node => {
    const base = atom()
    if (peek() === '^') { i++; return { t: 'bin', op: '^', a: base, b: unary() } }
    return base
  }
  const atom = (): Node => {
    const c = peek()
    if (c === '(') {
      i++
      const n = expr()
      if (peek() !== ')') throw new Error('paren')
      i++
      return n
    }
    if (c === 'x') { i++; return { t: 'x' } }
    if (c === '√') { i++; return { t: 'sqrt', a: atom() } }
    const m = /^(\d+(\.\d+)?|\.\d+)/.exec(s.slice(i))
    if (m) { i += m[0].length; return { t: 'num', v: parseFloat(m[0]) } }
    throw new Error('atom')
  }
  try {
    const n = expr()
    return i === s.length ? n : null
  } catch {
    return null
  }
}

export function evalExpr(n: Node, x: number): number {
  switch (n.t) {
    case 'num': return n.v
    case 'x': return x
    case 'neg': return -evalExpr(n.a, x)
    case 'sqrt': return Math.sqrt(evalExpr(n.a, x))
    case 'bin': {
      const a = evalExpr(n.a, x), b = evalExpr(n.b, x)
      return n.op === '+' ? a + b : n.op === '-' ? a - b : n.op === '*' ? a * b : n.op === '/' ? a / b : Math.pow(a, b)
    }
  }
}

const SAMPLES = [-2.37, -0.61, 0.43, 1.71, 2.93, 4.2]
export function sameExpr(a: Node, b: Node): boolean {
  return SAMPLES.every((x) => {
    const va = evalExpr(a, x), vb = evalExpr(b, x)
    return Number.isFinite(va) && Number.isFinite(vb) && Math.abs(va - vb) < 1e-6 * Math.max(1, Math.abs(vb))
  })
}

/** Degré d'un monôme, null si ce n'est pas un monôme. */
function degree(n: Node): number | null {
  switch (n.t) {
    case 'num': return 0
    case 'x': return 1
    case 'neg': return degree(n.a)
    case 'sqrt': return degree(n.a) === 0 ? 0 : null
    case 'bin': {
      const a = degree(n.a), b = degree(n.b)
      if (a === null || b === null) return null
      if (n.op === '*') return a + b
      if (n.op === '/') return b === 0 ? a : null
      if (n.op === '^') return n.b.t === 'num' ? a * n.b.v : null
      return null
    }
  }
}

function terms(n: Node): Node[] {
  if (n.t === 'bin' && (n.op === '+' || n.op === '-')) return [...terms(n.a), ...terms(n.b)]
  if (n.t === 'neg' && n.a.t === 'bin' && (n.a.op === '+' || n.a.op === '-')) return terms(n.a)
  return [n]
}

/** Développée et réduite : pas de parenthèses, une seule fois chaque puissance de x. */
export function isDeveloped(raw: string): boolean {
  const n = parseExpr(raw)
  if (!n || prepExpr(raw).includes('(')) return false
  const degs = terms(n).map(degree)
  return degs.every((d) => d !== null) && new Set(degs).size === degs.length
}

/** Factorisée : un produit (ou une puissance) contenant au moins une parenthèse. */
export function isFactored(raw: string): boolean {
  let n = parseExpr(raw)
  if (!n || !prepExpr(raw).includes('(')) return false
  while (n.t === 'neg') n = n.a
  return n.t === 'bin' && (n.op === '*' || n.op === '^')
}

// ── Constructeurs d'exercices ───────────────────────────────────────────
const KEYS_NUMBER = ['−', '/', ',']
const KEYS_EXPR = ['x', '²', '(', ')', '−', '^']

interface Opts {
  answer?: string
  explanation?: string
  inputHint?: string
}

/** Réponse numérique (entier, décimal ou fraction acceptés). */
export function numeric(prompt: string, value: number, opts: Opts = {}): Exercise {
  return {
    prompt,
    kind: 'input',
    answer: opts.answer ?? fmt(value),
    explanation: opts.explanation,
    inputHint: opts.inputHint ?? 'Ta réponse',
    format: 'un nombre, par exemple −3 ; 2,5 ou 7/4',
    keypad: KEYS_NUMBER,
    isValid: (v) => !Number.isNaN(parseNumber(v)),
    check: (v) => sameNumber(parseNumber(v), value),
  }
}

/** Réponse fractionnaire ; avec `irreducible`, la fraction doit être simplifiée au maximum. */
export function fraction(prompt: string, num: number, den: number, opts: Opts & { irreducible?: boolean } = {}): Exercise {
  const value = num / den
  const answer = fracText(num, den)
  const irreducibleForm = (v: string) => {
    const m = /^(-?\d+)(?:\/(\d+))?$/.exec(normalize(v))
    return !!m && (!m[2] || gcd(Math.abs(Number(m[1])), Number(m[2])) === 1) && m[2] !== '1'
  }
  return {
    prompt,
    kind: 'input',
    answer,
    explanation: opts.explanation,
    inputHint: opts.inputHint ?? (opts.irreducible ? 'Fraction irréductible a/b' : 'Fraction a/b, entier ou décimal'),
    format: 'une fraction comme 7/4, ou un nombre',
    keypad: KEYS_NUMBER,
    isValid: (v) => !Number.isNaN(parseNumber(v)),
    diagnose: (v) => (opts.irreducible && sameNumber(parseNumber(v), value) ? 'La valeur est juste, mais la fraction n’est pas irréductible.' : undefined),
    check: (v) => sameNumber(parseNumber(v), value) && (!opts.irreducible || irreducibleForm(v)),
  }
}

/** Réponse sous forme d'expression en x, comparée par évaluation (+ contrôle de forme). */
export function expression(prompt: string, expected: string, form: 'any' | 'developed' | 'factored', opts: Opts = {}): Exercise {
  const target = parseExpr(expected)
  if (!target) throw new Error(`Expression attendue illisible : ${expected}`)
  const formOk = (v: string) => form === 'any' || (form === 'developed' ? isDeveloped(v) : isFactored(v))
  return {
    prompt,
    kind: 'input',
    answer: opts.answer ?? expected,
    explanation: opts.explanation,
    inputHint: opts.inputHint ?? (form === 'factored' ? 'ex. (x + 2)(x − 3)' : 'ex. 3x² − 2x + 5'),
    format: 'une expression en x, par exemple 3x² − 2x + 5 ou (x + 1)(x − 4) ; ² s’écrit aussi ^2',
    keypad: KEYS_EXPR,
    isValid: (v) => parseExpr(v) !== null,
    diagnose: (v) => {
      const n = parseExpr(v)
      if (n && sameExpr(n, target) && !formOk(v)) {
        return form === 'developed' ? 'C’est égal, mais ce n’est pas développé et réduit.' : 'C’est égal, mais ce n’est pas factorisé.'
      }
      return undefined
    },
    check: (v) => {
      const n = parseExpr(v)
      return !!n && sameExpr(n, target) && formOk(v)
    },
  }
}

/** Réponse de la forme k√m (k ≥ 1, m sans facteur carré). */
export function radical(prompt: string, k: number, m: number, opts: Opts = {}): Exercise {
  const answer = `${k === 1 ? '' : k}√${m}`
  return {
    prompt,
    kind: 'input',
    answer,
    explanation: opts.explanation,
    inputHint: 'Forme a√b',
    format: 'a√b, par exemple 3√2',
    keypad: ['√'],
    isValid: (v) => parseExpr(v) !== null,
    diagnose: (v) => {
      const n = parseExpr(v)
      return n && sameNumber(evalExpr(n, 0), k * Math.sqrt(m)) ? 'La valeur est juste, mais pas sous la forme a√b la plus simple.' : undefined
    },
    check: (v) => {
      const mm = /^(\d*)\*?√(\d+)$/.exec(prepExpr(v))
      return !!mm && Number(mm[1] || '1') === k && Number(mm[2]) === m
    },
  }
}

function parsePair(raw: string): [number, number] | null {
  const s = normalize(raw).replace(/^[A-Za-z⃗]*=?/, '').replace(/^\(/, '').replace(/\)$/, '')
  let parts = s.split(';')
  if (parts.length === 1 && (s.match(/,/g) ?? []).length === 1) parts = s.split(',')
  if (parts.length !== 2) return null
  const [a, b] = parts.map(parseNumber)
  return Number.isNaN(a) || Number.isNaN(b) ? null : [a, b]
}

/** Réponse sous forme de couple (x ; y). */
export function pair(prompt: string, x: number, y: number, opts: Opts = {}): Exercise {
  return {
    prompt,
    kind: 'input',
    answer: `(${fmt(x)} ; ${fmt(y)})`,
    explanation: opts.explanation,
    inputHint: opts.inputHint ?? 'Forme (x ; y)',
    format: 'un couple (x ; y), par exemple (2 ; −3)',
    keypad: ['(', ';', ')', '−', '/'],
    isValid: (v) => parsePair(v) !== null,
    check: (v) => {
      const p = parsePair(v)
      return !!p && sameNumber(p[0], x) && sameNumber(p[1], y)
    },
  }
}

export interface Interval {
  lo: number
  hi: number
  loClosed: boolean
  hiClosed: boolean
}

export function intervalText(I: Interval): string {
  const b = (v: number) => (v === Infinity ? '+∞' : v === -Infinity ? '−∞' : fmt(v))
  return `${I.loClosed ? '[' : ']'}${b(I.lo)} ; ${b(I.hi)}${I.hiClosed ? ']' : '['}`
}

function parseInterval(raw: string): Interval | null {
  const s = normalize(raw).replace(/^(x∈|S=)/i, '').replace(/∞|inf(ini)?/gi, 'I')
  const m = /^([[\]])(.+?);(.+?)([[\]])$/.exec(s)
  if (!m) return null
  const bound = (t: string) => (t === 'I' || t === '+I' ? Infinity : t === '-I' ? -Infinity : parseNumber(t))
  const lo = bound(m[2]), hi = bound(m[3])
  if (Number.isNaN(lo) || Number.isNaN(hi)) return null
  return { lo, hi, loClosed: m[1] === '[', hiClosed: m[4] === ']' }
}

/** Réponse sous forme d'intervalle, ex. ]−∞ ; 3]. */
export function interval(prompt: string, I: Interval, opts: Opts = {}): Exercise {
  const eq = (a: number, b: number) => (Number.isFinite(b) ? sameNumber(a, b) : a === b)
  return {
    prompt,
    kind: 'input',
    answer: intervalText(I),
    explanation: opts.explanation,
    inputHint: opts.inputHint ?? 'ex. ]−∞ ; 3]',
    format: 'un intervalle, par exemple ]−∞ ; 3] ou [−1 ; 5[',
    keypad: ['[', ']', ';', '−∞', '+∞', '−', '/'],
    isValid: (v) => parseInterval(v) !== null,
    diagnose: (v) => {
      const J = parseInterval(v)
      return J && eq(J.lo, I.lo) && eq(J.hi, I.hi) ? 'Les bornes sont justes : vérifie le sens des crochets.' : undefined
    },
    check: (v) => {
      const J = parseInterval(v)
      return !!J && eq(J.lo, I.lo) && eq(J.hi, I.hi) && J.loClosed === I.loClosed && J.hiClosed === I.hiClosed
    },
  }
}

function parseSet(raw: string): number[] | null {
  const s = normalize(raw).replace(/^S=/i, '').replace(/[{}]/g, '').replace(/x=/g, '')
  const parts = s.split(/;|et|ou/).filter(Boolean)
  const nums = parts.map(parseNumber)
  return nums.length && nums.every((n) => !Number.isNaN(n)) ? nums : null
}

/** Ensemble de solutions, saisi « 2 ; −5 ». */
export function solutionSet(prompt: string, values: number[], opts: Opts = {}): Exercise {
  const uniq = [...new Set(values)].sort((a, b) => a - b)
  return {
    prompt,
    kind: 'input',
    answer: uniq.map((v) => `x = ${fmt(v)}`).join(' ou '),
    explanation: opts.explanation,
    inputHint: opts.inputHint ?? 'Solutions séparées par ;',
    format: 'les solutions séparées par ;, par exemple −2 ; 5',
    keypad: [';', '−', '/'],
    isValid: (v) => parseSet(v) !== null,
    check: (v) => {
      const got = parseSet(v)
      if (!got) return false
      const g = [...new Set(got.map((n) => Math.round(n * 1e6) / 1e6))].sort((a, b) => a - b)
      return g.length === uniq.length && g.every((n, i) => sameNumber(n, uniq[i]))
    },
  }
}

/** QCM : la bonne réponse + des distracteurs (doublons retirés). */
export function choice(prompt: string, correct: string, distractors: string[], explanation?: string): Exercise {
  const unique = Array.from(new Set(distractors.filter((d) => d !== correct))).slice(0, 3)
  return {
    prompt,
    kind: 'choice',
    choices: shuffle([correct, ...unique]),
    answer: correct,
    explanation,
    check: (v) => v === correct,
  }
}

/** Monôme lisible : coef × variable avec signes propres. */
export function term(coef: number, variable: string, first = false): string {
  if (coef === 0) return ''
  const abs = Math.abs(coef)
  const body = variable ? (abs === 1 ? variable : `${fmt(abs)}${variable}`) : fmt(abs)
  if (first) return coef < 0 ? `−${body}` : body
  return coef < 0 ? ` − ${body}` : ` + ${body}`
}

/** Polynôme lisible : poly([3, 'x²'], [-2, 'x'], [5, '']) → « 3x² − 2x + 5 » */
export function poly(...terms: [number, string][]): string {
  let out = ''
  for (const [c, v] of terms) {
    if (c === 0) continue
    out += term(c, v, out === '')
  }
  return out || '0'
}

/** (x + a) avec le bon signe : bin(−3) → « x − 3 » */
export const xPlus = (a: number, k = 1) => poly([k, 'x'], [a, ''])
