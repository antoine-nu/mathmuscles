export interface Exercise {
  /** Énoncé. Mini-syntaxe : {a/b} → fraction empilée, ^n ou ^{…} → exposant, √{…} → racine. */
  prompt: string
  kind: 'input' | 'choice'
  choices?: string[]
  /** Réponse attendue, telle qu'affichée en correction. */
  answer: string
  /** Aide à la saisie, ex. « Réponse sous forme de fraction a/b ». */
  inputHint?: string
  explanation?: string
  check: (value: string) => boolean
}

export type Difficulty = 1 | 2 | 3
export type Generator = (d: Difficulty) => Exercise

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

/** Fraction réduite sous forme « a/b » (ou entier). */
export function frac(num: number, den: number): string {
  if (den < 0) {
    num = -num
    den = -den
  }
  const g = gcd(num, den) || 1
  const n = num / g
  const d = den / g
  if (d === 1) return fmt(n)
  return n < 0 ? `−{${-n}/${d}}` : `{${n}/${d}}`
}

/** Version texte (sans accolades) pour l'affichage en correction. */
export const plain = (s: string) => s.replace(/[{}]/g, '')

/** Lit « 3 », « −2,5 », « 3/4 », « -7 / 2 ». Renvoie NaN si illisible. */
export function parseNumber(raw: string): number {
  const s = raw.trim().replace(/[−–]/g, '-').replace(/,/g, '.').replace(/\s+/g, '')
  if (!s) return NaN
  if (s.includes('/')) {
    const [a, b, ...rest] = s.split('/')
    if (rest.length) return NaN
    const x = Number(a)
    const y = Number(b)
    if (!Number.isFinite(x) || !Number.isFinite(y) || y === 0) return NaN
    return x / y
  }
  const n = Number(s)
  return Number.isFinite(n) ? n : NaN
}

export const sameNumber = (a: number, b: number) => Math.abs(a - b) < 1e-6

/** Exercice à réponse numérique (entiers, décimaux ou fractions acceptés). */
export function numeric(prompt: string, value: number, opts: { answer?: string; explanation?: string; inputHint?: string } = {}): Exercise {
  return {
    prompt,
    kind: 'input',
    answer: opts.answer ?? fmt(value),
    explanation: opts.explanation,
    inputHint: opts.inputHint,
    check: (v) => sameNumber(parseNumber(v), value),
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

/** Monôme/polynôme lisible : coef × x avec signes propres. */
export function term(coef: number, variable: string, first = false): string {
  if (coef === 0) return ''
  const abs = Math.abs(coef)
  const body = variable ? (abs === 1 ? variable : `${abs}${variable}`) : `${abs}`
  if (first) return coef < 0 ? `−${body}` : body
  return coef < 0 ? ` − ${body}` : ` + ${body}`
}

export function poly(...terms: [number, string][]): string {
  let out = ''
  for (const [c, v] of terms) {
    if (c === 0) continue
    out += term(c, v, out === '')
  }
  return out || '0'
}
