// Dérivation et convexité (Terminale, spécialité) — public adulte.
// Le début du fichier contient une petite boîte à outils (expressions avec e, ln, cos, sin, √, π ; valeurs exactes ;
// zones colorées sous une courbe) partagée avec T-lntrig, T-primitives et T-integrales.
import {
  F, expression, fmt, fracText, fresh, interval, numeric, par, pick, poly, randInt, randNonZero, sameNumber, solutionSet,
  term, withMeta, xPlus,
  type Exercise, type Interval, type Ladder, type Maker, type SubjectContent, type Tiers,
} from '../utils'
import { graphFigure, type Figure, type GraphWindow } from '../figure'
import { cap, personnage, prenom } from '../contexts'

// ═══════════════════════════════════════════════════════════════════════
// Boîte à outils partagée (Terminale : analyse)
// ═══════════════════════════════════════════════════════════════════════

export type FNode =
  | { t: 'n'; v: number }
  | { t: 'x' }
  | { t: 'neg'; a: FNode }
  | { t: 'op'; op: '+' | '-' | '*' | '/' | '^'; a: FNode; b: FNode }
  | { t: 'f'; f: 'ln' | 'exp' | 'sqrt' | 'cos' | 'sin' | 'tan'; a: FNode }

/** Normalise une saisie : signes, espaces, ², fractions empilées de l'affichage {a/b}, « y = », « f′(x) = »… */
function prepF(raw: string): string {
  let s = raw.trim()
    .replace(/[−–—]/g, '-')
    .replace(/\s+/g, '')
    .replace(/[×·∙]/g, '*')
    .replace(/÷/g, '/')
    .replace(/,/g, '.')
    .replace(/²/g, '^2')
    .replace(/³/g, '^3')
    .replace(/ˣ/g, '^x')
    .replace(/\u2060/g, '')
    .toLowerCase()
    .replace(/pi/g, 'π')
    .replace(/sqrt|racine/g, '√')
  for (let k = 0; k < 4; k++) s = s.replace(/\{([^{}/]+)\/([^{}/]+)\}/g, '(($1)/($2))')
  s = s.replace(/[{[]/g, '(').replace(/[}\]]/g, ')')
  return s.replace(/^[a-z][′'’]*(\(x\))?=/, '')
}

const FUNCS = ['exp', 'ln', 'cos', 'sin', 'tan'] as const

/**
 * Lit une expression en x avec e, exp, ln, √, cos, sin, tan, π : « (2x+1)e^(3x) », « 2ln2 », « ln 2x » (= ln(2x)),
 * « e^-x », « e^2x » (= e^(2x)), « √3/2 », « cos²x ». Renvoie null si illisible.
 */
export function parseF(raw: string): FNode | null {
  const s = prepF(raw)
  if (!s) return null
  let i = 0
  const peek = () => s[i]
  const startsAtom = (c?: string) => c !== undefined && /[0-9.xπe(√lcst]/.test(c)
  const expr = (): FNode => {
    let n = term()
    while (peek() === '+' || peek() === '-') {
      const op = s[i++] as '+' | '-'
      n = { t: 'op', op, a: n, b: term() }
    }
    return n
  }
  const term = (): FNode => {
    let n = unary()
    for (;;) {
      const c = peek()
      if (c === '*' || c === '/') {
        i++
        n = { t: 'op', op: c, a: n, b: unary() }
      } else if (startsAtom(c)) {
        n = { t: 'op', op: '*', a: n, b: power() }
      } else break
    }
    return n
  }
  const unary = (): FNode => {
    if (peek() === '-') { i++; return { t: 'neg', a: unary() } }
    if (peek() === '+') { i++; return unary() }
    return power()
  }
  const power = (): FNode => {
    const b = atom()
    if (peek() === '^') { i++; return { t: 'op', op: '^', a: b, b: exponent() } }
    return b
  }
  // exposant sans parenthèses : e^-x, e^2x (= e^(2x)), x^2
  const exponent = (): FNode => {
    if (peek() === '-') { i++; return { t: 'neg', a: exponent() } }
    if (peek() === '+') { i++; return exponent() }
    if (peek() === '(') return power()
    let n = simple()
    if (n.t === 'n' && (peek() === 'x' || peek() === 'π')) n = { t: 'op', op: '*', a: n, b: simple() }
    if (peek() === '^') { i++; n = { t: 'op', op: '^', a: n, b: exponent() } }
    return n
  }
  const simple = (): FNode => {
    const c = peek()
    if (c === 'x') { i++; return { t: 'x' } }
    if (c === 'π') { i++; return { t: 'n', v: Math.PI } }
    if (c === 'e' && !s.startsWith('exp', i)) { i++; return { t: 'n', v: Math.E } }
    const m = /^(\d+(\.\d+)?|\.\d+)/.exec(s.slice(i))
    if (m) { i += m[0].length; return { t: 'n', v: parseFloat(m[0]) } }
    throw new Error('atom')
  }
  const simplePow = (): FNode => {
    const b = simple()
    if (peek() === '^') { i++; return { t: 'op', op: '^', a: b, b: exponent() } }
    return b
  }
  // argument sans parenthèses : ln 3, ln 2x, cos x, ln x²
  const funcArg = (): FNode => {
    if (peek() === '(') return atom()
    if (peek() === '-') { i++; return { t: 'neg', a: funcArg() } }
    let n = simplePow()
    while (peek() !== undefined && /[0-9.xπ]/.test(peek())) n = { t: 'op', op: '*', a: n, b: simplePow() }
    return n
  }
  const atom = (): FNode => {
    const c = peek()
    if (c === '(') {
      i++
      const n = expr()
      if (peek() !== ')') throw new Error('paren')
      i++
      return n
    }
    if (c === '√') {
      i++
      return { t: 'f', f: 'sqrt', a: peek() === '(' ? atom() : simplePow() }
    }
    for (const f of FUNCS) {
      if (s.startsWith(f, i)) {
        i += f.length
        let pw: FNode | null = null
        // cos²x, sin^3x : l'exposant d'une fonction est un simple nombre (sin^2x = (sin x)²)
        if (peek() === '^') { i++; pw = peek() === '(' ? atom() : simple() }
        const node: FNode = { t: 'f', f, a: funcArg() }
        return pw ? { t: 'op', op: '^', a: node, b: pw } : node
      }
    }
    return simple()
  }
  try {
    const n = expr()
    return i === s.length ? n : null
  } catch {
    return null
  }
}

export function evalF(n: FNode, x: number): number {
  switch (n.t) {
    case 'n': return n.v
    case 'x': return x
    case 'neg': return -evalF(n.a, x)
    case 'f': {
      const a = evalF(n.a, x)
      switch (n.f) {
        case 'ln': return a > 0 ? Math.log(a) : NaN
        case 'exp': return Math.exp(a)
        case 'sqrt': return Math.sqrt(a)
        case 'cos': return Math.cos(a)
        case 'sin': return Math.sin(a)
        case 'tan': return Math.tan(a)
      }
      return NaN
    }
    case 'op': {
      const a = evalF(n.a, x), b = evalF(n.b, x)
      switch (n.op) {
        case '+': return a + b
        case '-': return a - b
        case '*': return a * b
        case '/': return a / b
        case '^': return Math.pow(a, b)
      }
    }
  }
  return NaN
}

export const hasX = (n: FNode): boolean =>
  n.t === 'x' ? true : n.t === 'n' ? false : n.t === 'neg' || n.t === 'f' ? hasX(n.a) : hasX(n.a) || hasX(n.b)

/** Valeur d'une saisie sans x (« ln 3 », « 2e^3 », « π/3 », « 7/4 »), NaN si illisible. */
export function valueOf(raw: string): number {
  const n = parseF(raw)
  if (!n || hasX(n)) return NaN
  const v = evalF(n, 0)
  return Number.isFinite(v) ? v : NaN
}

/** Saisie décimale « 1,23 » avec au moins deux décimales (valeur approchée au centième). */
const approxInput = (raw: string) => /^-?\d+\.\d{2,}$/.test(prepF(raw))

export const KEYS_F = ['x', 'e^', '(', ')', '^', '√', '/', '−']
export const KEYS_LN = ['x', 'ln(', 'e^', '(', ')', '^', '/', '−']
export const KEYS_TRIG = ['x', 'cos(', 'sin(', 'π', '(', ')', '^', '/', '−']
export const KEYS_EXACT = ['e', 'ln', '√', 'π', '/', '^', '−']
const FORMAT_F = 'une expression en x, par exemple 3x² − 2x, (x + 1)e^(2x), ln(x) / x ou 2cos(3x)'

export interface FOpts {
  explanation: string
  /** Réponse affichée (par défaut : l'expression attendue). */
  answer?: string
  /** Intervalle où l'on compare les deux expressions (défaut [−2,5 ; 2,5]). */
  dom?: [number, number]
  /** Primitive : on accepte toute expression qui diffère de l'attendue d'une constante. */
  upTo?: boolean
  hint?: string
  keys?: string[]
}

/** Réponse : une expression en x (avec e, ln, cos, sin, √), comparée numériquement à l'attendue. */
export function fexpr(prompt: string, expected: string, o: FOpts): Exercise {
  const target = parseF(expected)
  if (!target) throw new Error(`Expression attendue illisible : ${expected}`)
  const [lo, hi] = o.dom ?? [-2.5, 2.5]
  const xs = Array.from({ length: 13 }, (_, k) => lo + ((hi - lo) * (k + 0.5 + 0.17 * Math.sin(7.3 * k + 1))) / 13)
  const compare = (v: string): 'ok' | 'const' | 'no' => {
    const n = parseF(v)
    if (!n) return 'no'
    let count = 0, d0: number | null = null, sameAll = true
    for (const x of xs) {
      const e = evalF(target, x)
      if (!Number.isFinite(e)) continue
      const a = evalF(n, x)
      if (!Number.isFinite(a)) return 'no'
      const tol = 1e-6 * Math.max(1, Math.abs(e), Math.abs(a))
      if (Math.abs(a - e) > tol) sameAll = false
      const d = a - e
      if (d0 === null) d0 = d
      else if (Math.abs(d - d0) > tol) return 'no'
      count++
    }
    if (count < 4) return 'no'
    return sameAll ? 'ok' : 'const'
  }
  return {
    prompt,
    kind: 'input',
    answer: o.answer ?? expected,
    explanation: o.explanation,
    inputHint: o.hint ?? (o.upTo ? 'ex. x³ + 2e^(x)' : 'ex. (2x + 1)e^(x)'),
    format: FORMAT_F,
    keypad: o.keys ?? KEYS_F,
    isValid: (v) => parseF(v) !== null,
    diagnose: (v) => (!o.upTo && compare(v) === 'const' ? 'Presque : ton expression diffère de la bonne d’une constante.' : undefined),
    check: (v) => {
      const r = compare(v)
      return r === 'ok' || (!!o.upTo && r === 'const')
    },
  }
}

export interface XOpts {
  explanation: string
  /** Accepter aussi une valeur décimale approchée au centième (défaut : oui). */
  approx?: boolean
  hint?: string
  keys?: string[]
}

/** Réponse : un nombre, valeur exacte (« ln 3 », « e² − 1 », « √3/2 », « 2π/3 ») ou, par défaut, arrondi au centième. */
export function exact(prompt: string, value: number, answer: string, o: XOpts): Exercise {
  const approx = o.approx ?? true
  return {
    prompt,
    kind: 'input',
    answer,
    explanation: o.explanation,
    inputHint: o.hint ?? (approx ? 'Valeur exacte ou arrondi au centième' : 'Valeur exacte'),
    format: approx ? 'un nombre : valeur exacte (ex. ln 3, e² − 1, 2π/3, √3/2) ou arrondi au centième (ex. 1,10)' : 'une valeur exacte, par exemple ln 3, e² − 1, 2π/3 ou √3/2',
    keypad: o.keys ?? KEYS_EXACT,
    isValid: (v) => !Number.isNaN(valueOf(v)),
    diagnose: (v) => {
      const got = valueOf(v)
      if (Number.isNaN(got) || sameNumber(got, value)) return undefined
      if (approx && !approxInput(v) && Math.abs(got - value) < 0.1) return 'C’est proche : donne la valeur exacte ou un arrondi au centième.'
      return undefined
    },
    check: (v) => {
      const got = valueOf(v)
      if (Number.isNaN(got)) return false
      if (sameNumber(got, value)) return true
      return approx && approxInput(v) && Math.abs(got - value) < 0.01
    },
  }
}

/** Réponse arrondie à `decimals` décimales (tolérance : un demi-dernier chiffre, ou `tol`) ; une valeur exacte est aussi acceptée. */
export function rounded(prompt: string, value: number, decimals: number, o: XOpts & { tol?: number }): Exercise {
  const r = Math.round(value * 10 ** decimals) / 10 ** decimals
  const tol = (o.tol ?? 0.5 * 10 ** -decimals) + 1e-9
  return {
    prompt,
    kind: 'input',
    answer: fmt(r),
    explanation: o.explanation,
    inputHint: o.hint ?? (decimals === 0 ? 'Arrondi à l’unité' : decimals === 1 ? 'Arrondi au dixième' : 'Arrondi au centième'),
    format: 'un nombre décimal, par exemple 12,5',
    keypad: o.keys ?? ['−', ','],
    isValid: (v) => !Number.isNaN(valueOf(v)),
    check: (v) => {
      const got = valueOf(v)
      return !Number.isNaN(got) && Math.abs(got - value) <= tol
    },
  }
}

/** Ensemble de solutions exactes, séparées par « ; » (« π/3 ; 5π/3 », « ln 2 ; ln 3 »). */
export function exactSet(prompt: string, values: number[], answer: string, o: XOpts): Exercise {
  const approx = o.approx ?? true
  const target = [...values].sort((a, b) => a - b).filter((v, k, arr) => k === 0 || !sameNumber(v, arr[k - 1]))
  const parts = (raw: string) => raw.replace(/[{}]/g, '').replace(/^\s*S\s*=/i, '').split(/;|\bet\b|\bou\b/).map((p) => p.trim()).filter(Boolean)
  const close = (raw: string, got: number, want: number) => sameNumber(got, want) || (approx && approxInput(raw) && Math.abs(got - want) < 0.01)
  return {
    prompt,
    kind: 'input',
    answer,
    explanation: o.explanation,
    inputHint: o.hint ?? 'Solutions séparées par ;',
    format: 'les solutions séparées par ;, par exemple π/6 ; 5π/6 ou ln 2 ; ln 3',
    keypad: o.keys ?? [';', 'π', 'ln', '√', '/', '−'],
    isValid: (v) => parts(v).length > 0 && parts(v).every((p) => !Number.isNaN(valueOf(p))),
    check: (v) => {
      const ps = parts(v)
      if (!ps.length) return false
      const got = ps.map((p) => ({ p, v: valueOf(p) }))
      if (got.some((g) => Number.isNaN(g.v))) return false
      // chaque valeur attendue est trouvée, et chaque valeur saisie est attendue
      return target.every((w) => got.some((g) => close(g.p, g.v, w))) && got.every((g) => target.some((w) => close(g.p, g.v, w)))
    },
  }
}

/** Limite : un nombre (exact) ou ±∞ (« +∞ », « +inf », « -infini »). */
export function limitAns(prompt: string, value: number, answer: string, o: XOpts): Exercise {
  const read = (raw: string): number => {
    const s = raw.trim().replace(/[−–—]/g, '-').replace(/\s+/g, '').toLowerCase().replace(/^(l|lim|limite)=/, '').replace(/infini|inf|∞/g, 'I')
    if (s === 'I' || s === '+I') return Infinity
    if (s === '-I') return -Infinity
    return valueOf(raw)
  }
  return {
    prompt,
    kind: 'input',
    answer,
    explanation: o.explanation,
    inputHint: o.hint ?? 'Un nombre, +∞ ou −∞',
    format: 'un nombre (ex. 0 ; 1/2 ; ln 2) ou +∞, −∞',
    keypad: o.keys ?? ['+∞', '−∞', '/', 'e', 'ln', '−'],
    isValid: (v) => !Number.isNaN(read(v)),
    check: (v) => {
      const got = read(v)
      if (Number.isNaN(got)) return false
      return Number.isFinite(value) ? Number.isFinite(got) && sameNumber(got, value) : got === value
    },
  }
}

/** Retire tant que le tirage ne convient pas (gen renvoie null). */
export function retry<R>(gen: () => R | null | undefined | false, tries = 2000): R {
  for (let k = 0; k < tries; k++) {
    const r = gen()
    if (r) return r
  }
  throw new Error('tirage impossible')
}
/** Tire une configuration au hasard (une configuration qui renvoie null est retirée). */
export const oneOf = (...gens: (() => Exercise | null)[]): Exercise => retry(() => pick(gens)(), 200)
/** Problème titré, avec figure facultative. */
export const T = (title: string, ex: Exercise, figure?: Figure): Exercise => withMeta(ex, figure ? { title, figure } : { title })

export const RED = '#b8362f'
export const BLUE = '#5b8fc7'
export const GREEN = '#6aa86a'
export const GOLD = '#d9a441'
export type Graph = ReturnType<typeof graphFigure>

/**
 * Repère graphFigure, avec une marge à gauche de l'axe des ordonnées quand les nombres de cet axe sont longs
 * (sinon « 1000 » déborde du cadre).
 */
export function graph(win: GraphWindow): Graph {
  const w = win.w ?? 320
  const ys = win.ystep ?? win.step ?? 1, ly = win.ylabelStep ?? win.labelStep ?? ys
  let chars = 1
  for (let y = Math.ceil(win.yMin / ly) * ly; y <= win.yMax + 1e-9; y += ly) chars = Math.max(chars, fmt(Math.round(y * 100) / 100).length)
  const need = chars * 6.5 + 10 - 22
  if (win.xMin < 0 || need <= 0) return graphFigure(win)
  // (−xMin)·ux ≥ need avec ux = (w − 44)/(xMax − xMin)
  const span = win.xMax - win.xMin
  const pad = (need * span) / (w - 44 - need)
  const g = graphFigure({ ...win, xMin: win.xMin - pad })
  START.set(g.figure, win.xMin)
  return g
}
/** Début réel de la fenêtre d'un repère élargi par graph(). */
const START = new WeakMap<Figure, number>()
/** Trace f sur [a, b] (défaut : toute la fenêtre) en coupant net au bord du cadre (sans palier plat). */
export function plotC(g: Graph, f: (x: number) => number, o: { a?: number; b?: number; color?: string; dashed?: boolean } = {}) {
  const ax = g.figure.axes!
  const a = o.a ?? START.get(g.figure) ?? ax.xMin, b = o.b ?? ax.xMax
  const lo = ax.yMin, hi = ax.yMax
  const inside = (y: number) => Number.isFinite(y) && y >= lo - 1e-9 && y <= hi + 1e-9
  let run: [number, number][] = []
  const flush = () => { if (run.length > 1) g.figure.curves!.push({ pts: run, color: o.color ?? RED, dashed: o.dashed }); run = [] }
  const N = 240
  let px = a, py = f(a)
  if (inside(py)) run.push(g.at(px, py))
  for (let i = 1; i <= N; i++) {
    const x = a + ((b - a) * i) / N, y = f(x)
    const pin = inside(py), cin = inside(y)
    if (pin && cin) run.push(g.at(x, y))
    else if (pin !== cin && Number.isFinite(py) && Number.isFinite(y)) {
      const edge = pin ? (y > hi ? hi : lo) : (py > hi ? hi : lo)
      const t = (edge - py) / (y - py), xe = px + t * (x - px)
      if (pin) { run.push(g.at(xe, edge)); flush() } else { run.push(g.at(xe, edge)); run.push(g.at(x, y)) }
    } else if (!cin) flush()
    px = x; py = y
  }
  flush()
}

/** Zone colorée entre la courbe de f et celle de `lower` (par défaut l'axe des abscisses), pour x de a à b. */
export function shade(g: Graph, f: (x: number) => number, a: number, b: number, o: { lower?: (x: number) => number; fill?: string; n?: number } = {}) {
  const ax = g.figure.axes!
  const clamp = (y: number) => Math.max(ax.yMin, Math.min(ax.yMax, y))
  const n = o.n ?? 48, lower = o.lower ?? (() => 0)
  const id = Object.keys(g.figure.points).length
  const names: string[] = []
  const add = (x: number, y: number) => {
    const name = `_z${id}_${names.length}`
    const [px, py] = g.at(x, clamp(y))
    g.figure.points[name] = { x: px, y: py, hidden: true, label: '' }
    names.push(name)
  }
  for (let k = 0; k <= n; k++) { const x = a + ((b - a) * k) / n; add(x, f(x)) }
  for (let k = n; k >= 0; k--) { const x = a + ((b - a) * k) / n; add(x, lower(x)) }
  g.figure.polygons = [...(g.figure.polygons ?? []), { pts: names, fill: o.fill ?? GOLD }]
}
/** Trait vertical (pointillé par défaut) d'abscisse x, de y0 à y1. */
export function vline(g: Graph, x: number, y0: number, y1: number, o: { color?: string; dashed?: boolean } = {}) {
  g.figure.curves!.push({ pts: [g.at(x, y0), g.at(x, y1)], color: o.color ?? '#7a5a2c', dashed: o.dashed ?? true, width: 1.4 })
}
/** Trait horizontal (pointillé par défaut) d'ordonnée y, de x0 à x1. */
export function hline(g: Graph, y: number, x0: number, x1: number, o: { color?: string; dashed?: boolean } = {}) {
  g.figure.curves!.push({ pts: [g.at(x0, y), g.at(x1, y)], color: o.color ?? '#7a5a2c', dashed: o.dashed ?? true, width: 1.4 })
}

// ── Écriture ─────────────────────────────────────────────────────────────
/**
 * La notation f(0), f′(0), u(0)… est légitime, mais « (0) » est aussi le signe d'un par(0) oublié, que le
 * vérificateur signale. Après une lettre, un prime ou une accolade, on glisse un gluon de mot invisible (U+2060)
 * après le 0 : l'affichage est identique.
 */
const fix0 = (s: string) => s.replace(/([A-Za-z′″}])\((\+?)0\)/g, '$1($20\u2060)')
/** « (x)e^{x} » (facteur affine réduit à x) → « xe^{x} ». */
const fixX = (s: string) => s.replace(/(^|[^A-Za-z′″])\(x\)(?=[e√(])/g, '$1x')
/** Typographie : « -3 » → « −3 », e^{1} → e, {7/1} → 7, coefficient 1 superflu (1e^{x}, −1√x, 1ln x). */
const tidy = (s: string) => s
  .replace(/(^|[^A-Za-z0-9_'’)])-(?=\d)/g, '$1−')
  .replace(/e\^\{1\}/g, 'e')
  .replace(/([a-z])\/1(?![\d,])/g, '$1')
  .replace(/\{(−?\d+)\/1\}/g, '$1')
  .replace(/(^|[\s(×=:;])(−?)1(?=e\^|e(?![a-zéèêà])|√|ln|cos|sin)/g, '$1$2')
export const polishEx = (ex: Exercise): Exercise => ({
  ...ex,
  prompt: tidy(fix0(fixX(ex.prompt))),
  explanation: ex.explanation && tidy(fix0(fixX(ex.explanation))),
  answer: ex.kind === 'input' ? tidy(fixX(ex.answer)) : ex.answer,
})
const polishM = (m: Maker): Maker => () => polishEx(m())
/** Applique polishEx à tous les modèles d'un sujet. */
export function polishContent(c: SubjectContent): SubjectContent {
  const L = (l: Ladder): Ladder => l.map((p) => p.map(polishM)) as Ladder
  return { tiers: c.tiers.map((p) => p.map(polishM)) as Tiers, upgrades: L(c.upgrades), age: L(c.age) }
}
/** x^k lisible : '', 'x', 'x^2'… */
export const xp = (k: number) => (k === 0 ? '' : k === 1 ? 'x' : `x^${k}`)
/** ax + b lisible. */
export const lin = (a: number, b: number) => poly([a, 'x'], [b, ''])
/** Polynôme à partir de ses coefficients (indice = degré). */
export const polyC = (c: number[]) => poly(...c.map((v, k) => [v, xp(k)] as [number, string]).reverse())
export const dPoly = (c: number[]) => c.slice(1).map((v, k) => v * (k + 1))
export const evalPoly = (c: number[], x: number) => c.reduce((s, v, k) => s + v * x ** k, 0)
/** Coefficient devant une expression : 1 → '', −1 → '−'. */
export const coefP = (k: number) => (k === 1 ? '' : k === -1 ? '−' : fmt(k))
/** e^n lisible : 1, e, e^{2}, e^{−1}. */
export const eV = (n: number) => (n === 0 ? '1' : n === 1 ? 'e' : `e^{${fmt(n)}}`)
/** e^{ax + b} lisible. */
export const eX = (a: number, b = 0) => `e^{${lin(a, b)}}`
/** c·e^n lisible (c entier non nul). */
export const ce = (c: number, n: number) => (n === 0 || c === 0 ? fmt(c) : `${coefP(c)}${eV(n)}`)
/** Fraction réduite empilée {a/b} (ou entier). */
export const Fr = (n: number, d: number) => {
  const t = fracText(n, d)
  if (!t.includes('/')) return t
  const [a, b] = t.split('/')
  return a.startsWith('−') ? `−{${a.slice(1)}/${b}}` : `{${a}/${b}}`
}
/** Pas de graduation « rond » (1, 2, 5, 10, 20…) pour couvrir `range` en environ n intervalles. */
export const niceStep = (range: number, n = 6) => {
  const raw = range / n, p = 10 ** Math.floor(Math.log10(raw))
  return [1, 2, 5, 10].map((k) => k * p).find((v) => v >= raw) ?? 10 * p
}
/** Somme de morceaux déjà écrits (« 3x », « −2e », « 5 ») : « 3x − 2e + 5 ». */
export const joinTerms = (parts: string[]) => {
  const ps = parts.filter((p) => p && p !== '0')
  if (!ps.length) return '0'
  return ps.map((p, k) => (k === 0 ? p : p.startsWith('−') ? ` − ${p.slice(1)}` : ` + ${p}`)).join('')
}

// ═══════════════════════════════════════════════════════════════════════
// Entraînement
// ═══════════════════════════════════════════════════════════════════════

const DOM_POS: [number, number] = [0.2, 4]
const sgnWord = (up: boolean) => (up ? 'croissante' : 'décroissante')
const I = (lo: number, hi: number, loClosed = true, hiClosed = true): Interval => ({ lo, hi, loClosed: Number.isFinite(lo) && loClosed, hiClosed: Number.isFinite(hi) && hiClosed })

// ── Palier 1 : rappels ───────────────────────────────────────────────────

// Dérivées usuelles (puissances, inverse, racine)
const usuelles: Maker = () => oneOf(
  () => {
    const a = randNonZero(-9, 9), n = randInt(3, 7)
    const f = poly([a, `x^${n}`]), d = poly([a * n, xp(n - 1)])
    return fexpr(`Dérive la fonction f définie sur ℝ par f(x) = ${f}.`, d, {
      explanation: `(x^n)′ = nx^{n−1}, donc f′(x) = ${par(a)} × ${n}x^{${n - 1}} = ${d}.`,
    })
  },
  () => {
    const a = randNonZero(-6, 6), b = randNonZero(-9, 9), c = randInt(-9, 9)
    const f = poly([a, 'x^2'], [b, 'x'], [c, '']), d = lin(2 * a, b)
    return fexpr(`Donne la dérivée de la fonction trinôme f(x) = ${f}.`, d, {
      explanation: `(x²)′ = 2x, (x)′ = 1 et la dérivée d'une constante est nulle : f′(x) = ${par(a)} × 2x + ${par(b)} = ${d}.`,
    })
  },
  () => {
    const a = randNonZero(-9, 9)
    const f = a > 0 ? `{${a}/x}` : `−{${-a}/x}`
    const ans = a > 0 ? `−{${a}/x^2}` : `{${-a}/x^2}`
    return fexpr(`La fonction f est définie sur ]0 ; +∞[ par f(x) = ${f}. Calcule f′(x).`, `${-a}/x^2`, {
      answer: ans, dom: DOM_POS,
      explanation: `(${F(1, 'x')})′ = −${F(1, 'x^2')}, donc f′(x) = ${par(a)} × (−${F(1, 'x^2')}) = ${ans}.`,
    })
  },
  () => {
    const a = randNonZero(-8, 8)
    const b = Math.abs(a), ans = `${a < 0 ? '−' : ''}${b % 2 === 0 ? `{${b / 2}/√x}` : `{${b}/2√x}`}`
    return fexpr(`La fonction f est définie sur [0 ; +∞[ par f(x) = ${coefP(a)}√{x}. Donne f′(x) pour x > 0.`, `${a}/(2√x)`, {
      answer: ans, dom: DOM_POS,
      explanation: `(√x)′ = ${F(1, '2√x')} pour x > 0, donc f′(x) = ${par(a)} × ${F(1, '2√x')} = ${ans}.`,
    })
  },
  () => {
    const c = [randInt(-9, 9), randNonZero(-9, 9), randNonZero(-5, 5), randNonZero(-4, 4)]
    const f = polyC(c), d = polyC(dPoly(c))
    return fexpr(`Calcule la dérivée de la fonction polynôme f(x) = ${f}.`, d, {
      explanation: `On dérive terme à terme : (x³)′ = 3x², (x²)′ = 2x, (x)′ = 1. Donc f′(x) = ${d}.`,
    })
  },
)

// Nombre dérivé par le calcul
const nombreDerive: Maker = fresh(() => oneOf(
  () => {
    const a = randNonZero(-5, 5), b = randInt(-9, 9), c = randInt(-9, 9), x0 = randInt(-4, 4)
    const v = 2 * a * x0 + b
    return numeric(`Soit f(x) = ${poly([a, 'x^2'], [b, 'x'], [c, ''])}. Calcule f′(${fmt(x0)}).`, v, {
      explanation: `f′(x) = ${lin(2 * a, b)}, donc f′(${fmt(x0)}) = ${fmt(2 * a)} × ${par(x0)}${b ? ` + ${par(b)}` : ''} = ${fmt(v)}.`,
    })
  },
  () => {
    const c = [randInt(-9, 9), randInt(-6, 6), randNonZero(-4, 4), randNonZero(-3, 3)], x0 = randNonZero(-3, 3)
    const d = dPoly(c), v = evalPoly(d, x0)
    return numeric(`Quel est le nombre dérivé en ${fmt(x0)} de la fonction f(x) = ${polyC(c)} ?`, v, {
      explanation: `f′(x) = ${polyC(d)}, donc f′(${fmt(x0)}) = ${fmt(v)}.`,
    })
  },
  () => {
    const a = randNonZero(-9, 9), x0 = pick([1, 2, 3, -1, -2])
    return numeric(`Soit f(x) = ${a > 0 ? `{${a}/x}` : `−{${-a}/x}`} sur ℝ*. Quel est le coefficient directeur de la tangente à la courbe de f au point d'abscisse ${fmt(x0)} ?`, -a / (x0 * x0), {
      answer: fracText(-a, x0 * x0),
      explanation: `(${F(1, 'x')})′ = −${F(1, 'x^2')}, donc f′(${fmt(x0)}) = ${par(-a)} ÷ ${par(x0)}² = ${fracText(-a, x0 * x0)}.`,
    })
  },
  () => {
    const a = randNonZero(-6, 6), k = randInt(1, 4)
    return numeric(`Soit f(x) = ${coefP(a)}√{x} sur [0 ; +∞[. Que vaut f′(${k * k}) ?`, a / (2 * k), {
      answer: fracText(a, 2 * k),
      explanation: `f′(x) = ${F(par(a), '2√x')}, donc f′(${k * k}) = ${F(par(a), `2 × ${k}`)} = ${fracText(a, 2 * k)}.`,
    })
  },
  () => {
    const a = randNonZero(-6, 6), b = randNonZero(-9, 9)
    return numeric(`Soit f(x) = ${poly([a, 'e^{x}'], [b, 'x'])}. Calcule f′(0).`, a + b, {
      explanation: `f′(x) = ${poly([a, 'e^{x}'], [b, ''])} et e^0 = 1, donc f′(0) = ${fmt(a)} + ${par(b)} = ${fmt(a + b)}.`,
    })
  },
))

// Lecture graphique du nombre dérivé (tangente tracée)
const lectureTangente: Maker = fresh(() => retry(() => {
  const a = randInt(-1, 2), fa = randInt(-1, 2)
  const m = pick([-2, -1, -0.5, 0.5, 1, 2, 3, -1.5])
  const dx = Number.isInteger(m) ? pick([1, 2, -1]) : pick([2, -2])
  const bx = a + dx, by = fa + m * dx
  if (bx < -2 || bx > 4 || by < -2 || by > 4) return null
  const p = pick([0.5, -0.5, 0.8, -0.8]), q = pick([0, 0, 0.15, -0.15])
  const f = (x: number) => fa + m * (x - a) + p * (x - a) ** 2 + q * (x - a) ** 3
  const g = graph({ xMin: -3, xMax: 5, yMin: -3, yMax: 5 })
  plotC(g, f)
  plotC(g, (x) => fa + m * (x - a), { color: BLUE })
  g.point('A', a, fa)
  g.point('B', bx, by)
  const intro = pick([
    'La droite T (en bleu) est tangente au point A à la courbe d’une fonction f (en rouge) ; elle passe aussi par le point B.',
    'On a tracé la courbe d’une fonction f (en rouge) et sa tangente T au point A (en bleu), qui passe par B.',
  ])
  const pente = `${F(`${fmt(by)} − ${par(fa)}`, `${fmt(bx)} − ${par(a)}`)} = ${fmt(m)}`
  const expl = `A(${fmt(a)} ; ${fmt(fa)}) et B(${fmt(bx)} ; ${fmt(by)}). Le nombre dérivé f′(${fmt(a)}) est le coefficient directeur de la tangente en A : ${pente}.`
  const ex = oneOf(
    () => numeric(`${intro} Lis les coordonnées de A et de B, puis donne f′(${fmt(a)}).`, m, { explanation: expl }),
    () => numeric(`${intro} Quel est le nombre dérivé de f au point d’abscisse ${fmt(a)} ?`, m, { explanation: expl }),
    () => numeric(`${intro} Quel est le coefficient directeur de T ? (C'est le nombre dérivé de f en x_A.)`, m, { explanation: expl }),
    () => {
      const eq = lin(m, fa - m * a)
      return expression(`${intro} Donne l’équation réduite de T.`, eq, 'any', {
        answer: `y = ${eq}`,
        explanation: `${expl} Puis y = ${coefP(m)}(${xPlus(-a)})${fa ? ` + ${par(fa)}` : ''} = ${eq}.`,
      })
    },
  )
  return withMeta(ex, { figure: g.figure })
}))

// Exponentielle : dérivées directes
const expoSimple: Maker = () => oneOf(
  () => {
    const a = randNonZero(-6, 6), b = randNonZero(-9, 9), c = randInt(-9, 9)
    const d = poly([a, 'e^{x}'], [b, ''])
    return fexpr(`Dérive la fonction f définie sur ℝ par f(x) = ${poly([a, 'e^{x}'], [b, 'x'], [c, ''])}.`, d, {
      explanation: `(e^{x})′ = e^{x}, (x)′ = 1 et une constante a une dérivée nulle : f′(x) = ${d}.`,
    })
  },
  () => {
    const n = randInt(2, 5), a = randNonZero(-5, 5)
    const d = poly([n, xp(n - 1)], [a, 'e^{x}'])
    return fexpr(`Calcule f′(x) pour f(x) = ${poly([1, `x^${n}`], [a, 'e^{x}'])}.`, d, {
      explanation: `(x^${n})′ = ${n}${xp(n - 1)} et (e^{x})′ = e^{x} : f′(x) = ${d}.`,
    })
  },
  () => {
    const a = randNonZero(-5, 5), b = randNonZero(-5, 5)
    const d = poly([a, 'e^{x}'], [-2 * b, 'x'])
    return fexpr(`Donne la dérivée de g(x) = ${poly([a, 'e^{x}'], [-b, 'x^2'])}.`, d, {
      explanation: `(e^{x})′ = e^{x} et (x²)′ = 2x : g′(x) = ${d}.`,
    })
  },
  () => {
    const k = randNonZero(-6, 6), b = randNonZero(-9, 9)
    const f = `${coefP(k)}(e^{x} ${b < 0 ? '−' : '+'} ${coefP(Math.abs(b))}x)`
    const d = poly([k, 'e^{x}'], [k * b, ''])
    return fexpr(`Dérive h(x) = ${f}.`, d, {
      explanation: `(ku)′ = ku′ : h′(x) = ${fmt(k)}(e^{x} ${b < 0 ? '−' : '+'} ${fmt(Math.abs(b))}) = ${d}.`,
    })
  },
)

// Équation de tangente à partir de f(a) et f′(a)
const tangenteDonnees: Maker = () => retry(() => {
  const a = randInt(-4, 4), fa = randInt(-6, 6), m = randNonZero(-5, 5)
  const p = fa - m * a
  const eq = lin(m, p)
  const expl = a === 0 ? `En a = 0, y = f′(0)x + f(0) : y = ${eq}.` : `y = f′(a)(x − a) + f(a) : y = ${coefP(m)}(${xPlus(-a)})${fa ? ` + ${par(fa)}` : ''} = ${eq}.`
  return oneOf(
    () => expression(`On sait que f(${fmt(a)}) = ${fmt(fa)} et f′(${fmt(a)}) = ${fmt(m)}. Donne l'équation réduite de la tangente à la courbe de f au point d'abscisse ${fmt(a)}.`, eq, 'any', { answer: `y = ${eq}`, explanation: expl }),
    () => expression(`La courbe de f passe par A(${fmt(a)} ; ${fmt(fa)}) et le nombre dérivé de f en ${fmt(a)} vaut ${fmt(m)}. Donne l'équation réduite de la tangente en A.`, eq, 'any', { answer: `y = ${eq}`, explanation: expl }),
    () => expression(`La tangente à la courbe de g au point d'abscisse ${fmt(a)} a pour coefficient directeur ${fmt(m)}, et g(${fmt(a)}) = ${fmt(fa)}. Quelle est l'équation réduite de cette tangente ?`, eq, 'any', {
      answer: `y = ${eq}`, explanation: expl.replace('f′(a)', 'g′(a)').replace('f(a)', 'g(a)'),
    }),
    () => (a === 0 || p === fa || p === m ? null : numeric(`On sait que f(${fmt(a)}) = ${fmt(fa)} et f′(${fmt(a)}) = ${fmt(m)}. Quelle est l'ordonnée à l'origine de la tangente à la courbe de f au point d'abscisse ${fmt(a)} ?`, p, { explanation: expl })),
  )
})

// ── Palier 2 : opérations ────────────────────────────────────────────────

// Dérivée d'un produit
const produit: Maker = () => oneOf(
  () => {
    const a = randNonZero(-5, 5), b = randNonZero(-6, 6)
    const d = a + b === 0 ? `${term(a, 'x', true)}e^{x}` : `(${lin(a, a + b)})e^{x}`
    return fexpr(`Dérive la fonction f définie sur ℝ par f(x) = (${lin(a, b)})e^{x}.`, d, {
      explanation: `(uv)′ = u′v + uv′ avec u(x) = ${lin(a, b)} et v(x) = e^{x} : f′(x) = ${coefP(a)}e^{x} + (${lin(a, b)})e^{x} = ${d}.`,
    })
  },
  () => {
    const n = randInt(2, 3), k = randNonZero(-3, 3)
    const d = `(${poly([k, `x^${n}`], [k * n, xp(n - 1)])})e^{x}`
    return fexpr(`Calcule f′(x) pour f(x) = ${coefP(k)}x^${n}e^{x}.`, d, {
      explanation: `Produit u × v avec u(x) = ${coefP(k)}x^${n} (u′(x) = ${coefP(k * n)}${xp(n - 1)}) et v(x) = e^{x} : f′(x) = ${coefP(k * n)}${xp(n - 1)}e^{x} ${k < 0 ? '−' : '+'} ${coefP(Math.abs(k))}x^${n}e^{x} = ${d}.`,
    })
  },
  () => {
    const a = randNonZero(-4, 4), b = randNonZero(-6, 6), c = randNonZero(-3, 3), dd = randNonZero(-6, 6)
    const res = poly([3 * a * c, 'x^2'], [2 * b * c, 'x'], [a * dd, ''])
    return fexpr(`Dérive f(x) = (${lin(a, b)})(${poly([c, 'x^2'], [dd, ''])}) avec la formule du produit, puis donne f′(x) développée.`, res, {
      explanation: `f′(x) = ${fmt(a)}(${poly([c, 'x^2'], [dd, ''])}) + (${lin(a, b)}) × ${fmt(2 * c)}x = ${res}.`,
    })
  },
  () => {
    const a = randNonZero(-6, 6)
    const ans = 3 * a % 2 === 0 ? `${coefP(3 * a / 2)}√x` : `${a < 0 ? '−' : ''}{${Math.abs(3 * a)}/2}√x`
    return fexpr(`La fonction f est définie sur [0 ; +∞[ par f(x) = ${coefP(a)}x√{x}. Donne f′(x) pour x > 0.`, `${3 * a}/2*√x`, {
      answer: ans, dom: DOM_POS,
      explanation: `u(x) = ${coefP(a)}x et v(x) = √x : f′(x) = ${coefP(a)}√x ${a < 0 ? '−' : '+'} ${coefP(Math.abs(a))}x × ${F(1, '2√x')}. Or ${F('x', '2√x')} = ${F('√x', 2)}, d'où f′(x) = ${fmt(a)}(1 + ${F(1, 2)})√x = ${ans}.`,
    })
  },
  () => {
    const a = randNonZero(-4, 4), b = randNonZero(-6, 6)
    const ans = `{${lin(3 * a, b)}/2√x}`
    return fexpr(`La fonction f est définie sur [0 ; +∞[ par f(x) = (${lin(a, b)})√{x}. Donne f′(x) pour x > 0, sur un seul trait de fraction.`, `(${lin(3 * a, b)})/(2√x)`, {
      answer: ans, dom: DOM_POS,
      explanation: `f′(x) = ${fmt(a)}√x + (${lin(a, b)}) × ${F(1, '2√x')} = ${F(`${fmt(2 * a)}x ${a < 0 ? '−' : '+'} (${lin(Math.abs(a), b * Math.sign(a))})`, '2√x')} = ${ans}.`,
    })
  },
)

// Dérivée d'un quotient
const quotient: Maker = () => oneOf(
  () => retry(() => {
    const a = randNonZero(-5, 5), b = randInt(-6, 6), c = randNonZero(-3, 3), d = randNonZero(-6, 6)
    const k = a * d - b * c
    if (k === 0) return null
    const den = lin(c, d)
    return fexpr(`Dérive f(x) = {${lin(a, b)}/${den}}, définie pour x ≠ ${fracText(-d, c)}.`, `${k}/(${den})^2`, {
      answer: `{${fmt(k)}/(${den})^2}`,
      explanation: `(${F('u', 'v')})′ = ${F('u′v − uv′', 'v^2')} : f′(x) = ${F(`${fmt(a)}(${den}) − (${lin(a, b)}) × ${par(c)}`, `(${den})^2`)} = ${F(fmt(k), `(${den})^2`)}.`,
    })
  }),
  () => {
    const a = randNonZero(-9, 9), c = randNonZero(-4, 4), d = randNonZero(-6, 6)
    const den = lin(c, d)
    return fexpr(`Calcule la dérivée de g(x) = {${a}/${den}} pour x ≠ ${fracText(-d, c)}.`, `${-a * c}/(${den})^2`, {
      answer: `{${fmt(-a * c)}/(${den})^2}`,
      explanation: `(${F(1, 'v')})′ = −${F('v′', 'v^2')} : g′(x) = ${fmt(a)} × ${F(`−${par(c)}`, `(${den})^2`)} = ${F(fmt(-a * c), `(${den})^2`)}.`,
    })
  },
  () => {
    const k = randInt(-2, 2)
    const den = k === 0 ? 'x' : lin(1, k)
    const num = k - 1 === 0 ? 'xeˣ' : `(${lin(1, k - 1)})eˣ`
    const ans = `{${num}/${k === 0 ? 'x^2' : `(${den})^2`}}`
    return fexpr(`Dérive f(x) = {eˣ/${den}} sur ]${fmt(-k)} ; +∞[.`, `(x+${k}-1)*e^x/(x+${k})^2`, {
      answer: ans, dom: [-k + 0.2, -k + 3],
      explanation: `Quotient avec u(x) = eˣ et v(x) = ${den} : f′(x) = ${F(`eˣ(${den}) − eˣ`, `(${den})^2`)} = ${ans}.`,
    })
  },
  () => {
    const c = randInt(1, 9)
    const ans = `{${c} − x^2/(x^2 + ${c})^2}`
    return fexpr(`Dérive la fonction f définie sur ℝ par f(x) = {x/x^2 + ${c}}.`, `(${c}-x^2)/(x^2+${c})^2`, {
      answer: ans,
      explanation: `f′(x) = ${F(`1 × (x^2 + ${c}) − x × 2x`, `(x^2 + ${c})^2`)} = ${ans}.`,
    })
  },
  () => {
    const a = randNonZero(-5, 5), b = randNonZero(-9, 9)
    const ans = `{${poly([a, 'x^2'], [-b, ''])}/x^2}`
    return fexpr(`Dérive f(x) = {${poly([a, 'x^2'], [b, ''])}/x} sur ]0 ; +∞[ et écris f′(x) sur un seul trait de fraction.`, `(${poly([a, 'x^2'], [-b, ''])})/x^2`, {
      answer: ans, dom: DOM_POS,
      explanation: `f′(x) = ${F(`${fmt(2 * a)}x × x − (${poly([a, 'x^2'], [b, ''])}) × 1`, 'x^2')} = ${ans}.`,
    })
  },
)

// Équation de tangente (calcul complet)
const tangenteCalcul: Maker = () => oneOf(
  () => {
    const a = randNonZero(-3, 3), b = randInt(-6, 6), c = randInt(-6, 6), x0 = randInt(-3, 3)
    const fx0 = a * x0 * x0 + b * x0 + c, m = 2 * a * x0 + b, eq = lin(m, fx0 - m * x0)
    return fexpr(`Soit f(x) = ${poly([a, 'x^2'], [b, 'x'], [c, ''])}. Donne l'équation réduite de la tangente à sa courbe au point d'abscisse ${fmt(x0)}.`, eq, {
      answer: `y = ${eq}`,
      explanation: `f(${fmt(x0)}) = ${fmt(fx0)} et f′(x) = ${lin(2 * a, b)}, donc f′(${fmt(x0)}) = ${fmt(m)}. y = f′(${fmt(x0)})(x − ${par(x0)}) + f(${fmt(x0)}) = ${eq}.`,
    })
  },
  () => {
    const b = randInt(-5, 5), c = randInt(-5, 5), x0 = pick([-2, -1, 1, 2])
    const fx0 = x0 ** 3 + b * x0 + c, m = 3 * x0 * x0 + b, eq = lin(m, fx0 - m * x0)
    return fexpr(`Détermine l'équation réduite de la tangente à la courbe de f(x) = ${poly([1, 'x^3'], [b, 'x'], [c, ''])} au point d'abscisse ${fmt(x0)}.`, eq, {
      answer: `y = ${eq}`,
      explanation: `f(${fmt(x0)}) = ${fmt(fx0)}, f′(x) = ${poly([3, 'x^2'], [b, ''])} donc f′(${fmt(x0)}) = ${fmt(m)}. y = ${coefP(m)}${m ? `(${xPlus(-x0)})` : ''}${fx0 ? ` + ${par(fx0)}` : ''} = ${eq}.`,
    })
  },
  () => {
    const x0 = pick([1, 2, -1, -2]), k = randNonZero(-3, 3), a = k * x0 * x0
    const eq = lin(-k, 2 * k * x0)
    const f = a > 0 ? `{${a}/x}` : `−{${-a}/x}`
    return fexpr(`Soit f(x) = ${f} sur ℝ*. Donne l'équation réduite de la tangente à la courbe de f au point d'abscisse ${fmt(x0)}.`, eq, {
      answer: `y = ${eq}`,
      explanation: `f(${fmt(x0)}) = ${fmt(k * x0)} et f′(x) = ${F(fmt(-a), 'x^2')}, donc f′(${fmt(x0)}) = ${fmt(-k)}. y = ${fmt(-k)}(${xPlus(-x0)}) + ${par(k * x0)} = ${eq}.`,
    })
  },
  () => {
    const a = randNonZero(-4, 4), k = randNonZero(-3, 3)
    const eq = lin(a * k, a)
    return fexpr(`Donne l'équation réduite de la tangente à la courbe de f(x) = ${coefP(a)}${eX(k)} au point d'abscisse 0.`, eq, {
      answer: `y = ${eq}`,
      explanation: `f(0) = ${fmt(a)} et f′(x) = ${coefP(a * k)}${eX(k)}, donc f′(0) = ${fmt(a * k)} : y = ${eq}.`,
    })
  },
  () => {
    const n = pick([1, 2])
    const eq = n === 1 ? 'ex' : 'e^{2}x − e^{2}'
    return fexpr(`Donne l'équation réduite de la tangente à la courbe de la fonction exponentielle au point d'abscisse ${n}.`, n === 1 ? 'e*x' : 'e^2*x-e^2', {
      answer: `y = ${eq}`,
      explanation: `exp(${n}) = exp′(${n}) = ${eV(n)} : y = ${eV(n)}(x − ${n}) + ${eV(n)} = ${eq}.`,
    })
  },
)

// Composée x ↦ g(ax + b)
const composeeAffine: Maker = () => oneOf(
  () => {
    const a = randNonZero(-4, 4), b = randNonZero(-6, 6), n = randInt(2, 5)
    const L = lin(a, b), ans = `${fmt(n * a)}(${L})${n - 1 > 1 ? `^${n - 1}` : ''}`
    return fexpr(`Dérive f(x) = (${L})^${n}.`, `${n * a}*(${L})^${n - 1}`, {
      answer: ans,
      explanation: `(u^n)′ = nu′u^{n−1} avec u(x) = ${L}, u′(x) = ${fmt(a)} : f′(x) = ${n} × ${par(a)} × (${L})${n - 1 > 1 ? `^${n - 1}` : ''} = ${ans}.`,
    })
  },
  () => {
    const a = randNonZero(-5, 5), b = randInt(-6, 6), c = randNonZero(-4, 4)
    const ans = `${coefP(a * c)}${eX(a, b)}`
    return fexpr(`Calcule la dérivée de g(x) = ${coefP(c)}${eX(a, b)}.`, ans, {
      explanation: `(e^{ax + b})′ = ae^{ax + b} : g′(x) = ${fmt(c)} × ${par(a)}${eX(a, b)} = ${ans}.`,
    })
  },
  () => {
    const a = randInt(1, 6), b = randInt(-6, 6), L = lin(a, b)
    const ans = a % 2 === 0 ? `{${a / 2}/√(${L})}` : `{${a}/2√(${L})}`
    const x0 = -b / a
    return fexpr(`La fonction f est définie sur [${fracText(-b, a)} ; +∞[ par f(x) = √{${L}}. Donne f′(x) pour x > ${fracText(-b, a)}.`, `${a}/(2√(${L}))`, {
      answer: ans, dom: [x0 + 0.2, x0 + 5],
      explanation: `(√u)′ = ${F('u′', '2√u')} avec u(x) = ${L} : f′(x) = ${F(a, `2√(${L})`)}${a % 2 === 0 ? ` = ${ans}` : ''}.`,
    })
  },
  () => {
    const a = randNonZero(-4, 4), b = randNonZero(-6, 6), L = lin(a, b)
    const ans = `{${fmt(-2 * a)}/(${L})^3}`
    return fexpr(`Dérive h(x) = {1/(${L})^2}, pour x ≠ ${fracText(-b, a)}.`, `${-2 * a}/(${L})^3`, {
      answer: ans,
      explanation: `h(x) = (${L})^{−2}, donc h′(x) = −2 × ${par(a)} × (${L})^{−3} = ${ans}.`,
    })
  },
)

// Sens de variation : intervalle
const variations: Maker = () => oneOf(
  () => {
    const a = randNonZero(-3, 3), h = randInt(-5, 5), c = randInt(-9, 9), up = Math.random() < 0.5
    const f = poly([a, 'x^2'], [-2 * a * h, 'x'], [c, ''])
    const right = (a > 0) === up
    return interval(`Soit f(x) = ${f}. Sur quel intervalle f est-elle ${sgnWord(up)} ?`, right ? I(h, Infinity) : I(-Infinity, h), {
      explanation: `f′(x) = ${lin(2 * a, -2 * a * h)} s'annule en ${fmt(h)} ; f′(x) ${a > 0 ? '≥' : '≤'} 0 pour x ≥ ${fmt(h)}. Donc f est ${sgnWord(up)} sur ${right ? `[${fmt(h)} ; +∞[` : `]−∞ ; ${fmt(h)}]`}.`,
    })
  },
  () => {
    const k = randInt(1, 4), c = randInt(-9, 9)
    return interval(`Soit f(x) = ${poly([1, 'x^3'], [-3 * k * k, 'x'], [c, ''])}. Sur quel intervalle f est-elle décroissante ?`, I(-k, k), {
      explanation: `f′(x) = 3x² − ${3 * k * k} = 3(x − ${k})(x + ${k}) est négative entre ses racines : f est décroissante sur [−${k} ; ${k}].`,
    })
  },
  () => {
    const h = randInt(-3, 4), up = Math.random() < 0.5
    return interval(`Soit f(x) = (${xPlus(-h)})e^{x}. Sur quel intervalle f est-elle ${sgnWord(up)} ?`, up ? I(h - 1, Infinity) : I(-Infinity, h - 1), {
      explanation: `f′(x) = e^{x} + (${xPlus(-h)})e^{x} = (${xPlus(1 - h)})e^{x}, du signe de ${xPlus(1 - h)} car e^{x} > 0 : f est décroissante sur ]−∞ ; ${fmt(h - 1)}] et croissante sur [${fmt(h - 1)} ; +∞[.`,
    })
  },
  () => {
    const c = randInt(-9, 9), up = Math.random() < 0.5
    return interval(`Soit f(x) = ${poly([1, 'e^{x}'], [-1, 'x'], [c, ''])}. Sur quel intervalle f est-elle ${sgnWord(up)} ?`, up ? I(0, Infinity) : I(-Infinity, 0), {
      explanation: `f′(x) = e^{x} − 1, qui est positif si et seulement si e^{x} ≥ 1, c'est-à-dire x ≥ 0. Donc f est ${sgnWord(up)} sur ${up ? '[0 ; +∞[' : ']−∞ ; 0]'}.`,
    })
  },
  () => {
    const a = randNonZero(-4, 4), up = Math.random() < 0.5
    const right = (a > 0) === up
    return interval(`Soit f(x) = ${coefP(a)}xe^{x}. Sur quel intervalle f est-elle ${sgnWord(up)} ?`, right ? I(-1, Infinity) : I(-Infinity, -1), {
      explanation: `f′(x) = ${fmt(a)}(x + 1)e^{x}, du signe de ${fmt(a)}(x + 1). Donc f est ${sgnWord(up)} sur ${right ? '[−1 ; +∞[' : ']−∞ ; −1]'}.`,
    })
  },
)

// ── Palier 3 : exercices standard ────────────────────────────────────────

// Extremum : abscisse ou valeur
const extremum: Maker = () => oneOf(
  () => {
    const h = randInt(-4, 4), k = randInt(-6, 9)
    if (h === 0) return null
    const f = poly([-1, 'x^2'], [2 * h, 'x'], [k - h * h, ''])
    return numeric(`Quel est le maximum sur ℝ de la fonction f(x) = ${f} ?`, k, {
      explanation: `f′(x) = ${lin(-2, 2 * h)} s'annule en ${fmt(h)}, positive avant et négative après : le maximum vaut f(${fmt(h)}) = ${fmt(k)}.`,
    })
  },
  () => {
    const k = randInt(1, 3), c = randInt(-9, 9), max = Math.random() < 0.5
    const v = max ? 2 * k ** 3 + c : -2 * k ** 3 + c
    return numeric(`Soit f(x) = ${poly([1, 'x^3'], [-3 * k * k, 'x'], [c, ''])}. Quelle est la valeur de son ${max ? 'maximum' : 'minimum'} local ?`, v, {
      explanation: `f′(x) = 3(x² − ${k * k}) s'annule en −${k} et ${k}. f est croissante, décroissante puis croissante : maximum local f(−${k}) = ${fmt(2 * k ** 3 + c)}, minimum local f(${k}) = ${fmt(-2 * k ** 3 + c)}.`,
    })
  },
  () => {
    const h = randInt(-2, 3), askX = Math.random() < 0.4
    const f = `(${xPlus(-h)})e^{x}`
    const fp = h === 1 ? 'xe^{x}' : `(${xPlus(1 - h)})e^{x}`
    if (askX) {
      return numeric(`En quelle valeur de x la fonction f(x) = ${f} atteint-elle son minimum ?`, h - 1, {
        explanation: `f′(x) = ${fp} : négative avant ${fmt(h - 1)}, positive après. Le minimum est atteint en x = ${fmt(h - 1)}.`,
      })
    }
    const ans = h - 1 === 0 ? '−1' : `−${eV(h - 1)}`
    return exact(`Donne la valeur exacte du minimum de la fonction f(x) = ${f} sur ℝ.`, -Math.exp(h - 1), ans, {
      explanation: `f′(x) = ${fp} s'annule en ${fmt(h - 1)} (négative avant, positive après). Minimum : f(${fmt(h - 1)}) = (−1) × ${eV(h - 1)} = ${ans}.`,
    })
  },
  () => {
    const a = randInt(1, 9)
    return exact(`Soit f(x) = ${coefP(a)}xe^{−x} sur ℝ. Donne la valeur exacte de son maximum.`, a / Math.E, `{${a}/e}`, {
      explanation: `f′(x) = ${fmt(a)}(1 − x)e^{−x} : positive pour x < 1, négative après. Maximum f(1) = ${fmt(a)}e^{−1} = ${F(a, 'e')} ≈ ${fmt(Math.round((a / Math.E) * 100) / 100)}.`,
    })
  },
)

// Dérivée seconde
const deriveeSeconde: Maker = () => oneOf(
  () => {
    const c = [randInt(-9, 9), randInt(-9, 9), randNonZero(-6, 6), randNonZero(-4, 4)]
    const d2 = polyC(dPoly(dPoly(c)))
    return fexpr(`Calcule la dérivée seconde f″ de f(x) = ${polyC(c)}.`, d2, {
      explanation: `f′(x) = ${polyC(dPoly(c))}, puis f″(x) = ${d2}.`,
    })
  },
  () => {
    const a = randNonZero(-3, 3), b = randNonZero(-6, 6), c = randInt(-9, 9)
    const c4 = [c, 0, b, 0, a], d2 = polyC(dPoly(dPoly(c4)))
    return fexpr(`Donne f″(x) pour f(x) = ${polyC(c4)}.`, d2, {
      explanation: `f′(x) = ${polyC(dPoly(c4))}, puis f″(x) = ${d2}.`,
    })
  },
  () => {
    const h = randInt(-3, 3)
    const f = h === 0 ? 'xe^{x}' : `(${lin(1, h)})e^{x}`
    const d2 = `(${lin(1, h + 2)})e^{x}`.replace('(x)', 'x')
    return fexpr(`Calcule f″(x) pour f(x) = ${f}.`, `(x+${h + 2})*e^x`, {
      answer: d2,
      explanation: `f′(x) = e^{x} + (${lin(1, h)})e^{x} = (${lin(1, h + 1)})e^{x}, puis de même f″(x) = (${lin(1, h + 2)})e^{x}.`.replace(/\(x\)/g, 'x'),
    })
  },
  () => {
    const a = randNonZero(-4, 4), k = randNonZero(-3, 3)
    if (Math.abs(k) === 1 && Math.abs(a) === 1) return null
    const d2 = `${coefP(a * k * k)}${eX(k)}`
    return fexpr(`Calcule la dérivée seconde de g(x) = ${coefP(a)}${eX(k)}.`, d2, {
      explanation: `g′(x) = ${coefP(a * k)}${eX(k)}, puis g″(x) = ${d2}.`,
    })
  },
  () => {
    const a = randNonZero(-6, 6)
    const fr = (k: number, d: string) => (k < 0 ? `−{${-k}/${d}}` : `{${k}/${d}}`)
    const ans = fr(2 * a, 'x^3')
    return fexpr(`Calcule f″(x) pour f(x) = ${fr(a, 'x')}, x > 0.`, `${2 * a}/x^3`, {
      answer: ans, dom: DOM_POS,
      explanation: `f(x) = ${coefP(a)}x^{−1}, f′(x) = ${coefP(-a)}x^{−2}, puis f″(x) = ${coefP(2 * a)}x^{−3} = ${ans}.`,
    })
  },
)

// Convexité d'un polynôme
const convexitePoly: Maker = () => oneOf(
  () => {
    const a = pick([-2, -1, 1, 2]), r = randInt(-3, 3), c = randInt(-6, 6), d = randInt(-9, 9)
    const coef = [d, c, -3 * a * r, a]
    return numeric(`Soit f(x) = ${polyC(coef)}. Quelle est l'abscisse du point d'inflexion de sa courbe ?`, r, {
      explanation: `f″(x) = ${lin(6 * a, -6 * a * r)} s'annule et change de signe en x = ${fmt(r)} : c'est l'abscisse du point d'inflexion.`,
    })
  },
  () => {
    const a = pick([-2, -1, 1, 2]), r = randInt(-3, 3), c = randInt(-6, 6), convex = Math.random() < 0.5
    const coef = [randInt(-5, 5), c, -3 * a * r, a]
    const right = (a > 0) === convex
    return interval(`Soit f(x) = ${polyC(coef)}. Sur quel intervalle f est-elle ${convex ? 'convexe' : 'concave'} ?`, right ? I(r, Infinity) : I(-Infinity, r), {
      explanation: `f″(x) = ${lin(6 * a, -6 * a * r)}, positive pour x ${a > 0 ? '≥' : '≤'} ${fmt(r)}. f est convexe là où f″ ≥ 0, concave là où f″ ≤ 0 : réponse ${right ? `[${fmt(r)} ; +∞[` : `]−∞ ; ${fmt(r)}]`}.`,
    })
  },
  () => {
    const k = randInt(1, 3), c = randInt(-5, 5)
    return solutionSet(`Soit f(x) = ${poly([1, 'x^4'], [-6 * k * k, 'x^2'], [c, ''])}. Donne les abscisses des points d'inflexion de sa courbe.`, [-k, k], {
      explanation: `f″(x) = 12x² − ${12 * k * k} = 12(x² − ${k * k}) s'annule et change de signe en −${k} et ${k}.`,
    })
  },
  () => {
    const k = randInt(1, 3)
    return interval(`Soit f(x) = ${poly([1, 'x^4'], [-6 * k * k, 'x^2'])}. Sur quel intervalle f est-elle concave ?`, I(-k, k), {
      explanation: `f″(x) = 12x² − ${12 * k * k} = 12(x − ${k})(x + ${k}) est négative entre −${k} et ${k} : f est concave sur [−${k} ; ${k}].`,
    })
  },
)

// Composées e^u, √u, u^n
const composees: Maker = () => oneOf(
  () => {
    const b = randNonZero(-5, 5), u = poly([1, 'x²'], [b, 'x'])
    const ans = `(${lin(2, b)})e^{${u}}`
    return fexpr(`Dérive f(x) = e^{${u}}.`, `(2x+${b})*e^(x^2+${b}x)`, {
      answer: ans,
      explanation: `(e^{u})′ = u′e^{u} avec u(x) = ${u}, u′(x) = ${lin(2, b)} : f′(x) = ${ans}.`,
    })
  },
  () => {
    const c = randInt(1, 9)
    const ans = `{x/√(x² + ${c})}`
    return fexpr(`Dérive la fonction f définie sur ℝ par f(x) = √{x² + ${c}}.`, `x/√(x^2+${c})`, {
      answer: ans,
      explanation: `(√u)′ = ${F('u′', '2√u')} avec u(x) = x² + ${c} : f′(x) = ${F('2x', `2√(x² + ${c})`)} = ${ans}.`,
    })
  },
  () => {
    const b = randNonZero(-5, 5), n = randInt(2, 4)
    const u = poly([1, 'x^2'], [b, ''])
    const ans = `${2 * n}x(${u})${n - 1 > 1 ? `^${n - 1}` : ''}`
    return fexpr(`Calcule la dérivée de g(x) = (${u})^${n}.`, `${2 * n}x*(${u})^${n - 1}`, {
      answer: ans,
      explanation: `(u^n)′ = nu′u^{n−1} avec u′(x) = 2x : g′(x) = ${n} × 2x × (${u})${n - 1 > 1 ? `^${n - 1}` : ''} = ${ans}.`,
    })
  },
  () => {
    const a = randNonZero(-3, 3)
    const ex = `${a === 1 ? '' : a === -1 ? '−' : fmt(a)}x²`
    const ans = `${fmt(2 * a)}xe^{${ex}}`
    return fexpr(`Donne la dérivée de h(x) = e^{${ex}}.`, `${2 * a}x*e^(${a}x^2)`, {
      answer: ans,
      explanation: `(e^{u})′ = u′e^{u} avec u(x) = ${ex}, u′(x) = ${fmt(2 * a)}x : h′(x) = ${ans}.`,
    })
  },
)

// Lecture graphique : convexité, inflexion
const convexiteGraphique: Maker = () => { const nf = pick(['f', 'g', 'h']); return oneOf(
  () => {
    const r = randInt(-2, 2), y0 = randInt(-1, 1), s = pick([1, -1]), t = pick([1, 1.5, 2])
    const f = (x: number) => y0 + s * (((x - r) ** 3) / 2 - t * (x - r))
    const g = graph({ xMin: -4, xMax: 4, yMin: -4, yMax: 4 })
    plotC(g, f)
    const ex = numeric(pick([`Voici la courbe d'une fonction ${nf}. Elle change de concavité en un point : quelle est son abscisse ?`, `La courbe tracée est celle d'une fonction ${nf}. Lis l'abscisse de son point d'inflexion.`]), r, {
      explanation: `La courbe passe de ${s > 0 ? 'concave (sous ses tangentes) à convexe (au-dessus)' : 'convexe à concave'} en x = ${fmt(r)} : c'est le point d'inflexion (${fmt(r)} ; ${fmt(y0)}).`,
    })
    return withMeta(ex, { figure: g.figure })
  },
  () => {
    const r = randInt(-2, 2), s = pick([1, -1, 2, -2, 0.5, -0.5])
    const g = graph({ xMin: -4, xMax: 4, yMin: -4, yMax: 4 })
    plotC(g, (x) => s * (x - r))
    g.figure.caption = 'Courbe de f″'
    const convex = Math.random() < 0.5, right = (s > 0) === convex
    g.figure.caption = `Courbe de ${nf}″`
    const ex = interval(`La droite tracée représente la dérivée seconde ${nf}″ d'une fonction ${nf}. Sur quel intervalle ${nf} est-elle ${convex ? 'convexe' : 'concave'} ?`, right ? I(r, Infinity) : I(-Infinity, r), {
      explanation: `${nf} est convexe là où ${nf}″ ≥ 0 (droite au-dessus de l'axe) et concave là où ${nf}″ ≤ 0. ${nf}″ s'annule en ${fmt(r)} : réponse ${right ? `[${fmt(r)} ; +∞[` : `]−∞ ; ${fmt(r)}]`}.`,
    })
    return withMeta(ex, { figure: g.figure })
  },
  () => {
    const r = randInt(-2, 2), y0 = randInt(-3, 1), s = pick([0.5, 1])
    const g = graph({ xMin: -4, xMax: 4, yMin: -4, yMax: 4 })
    plotC(g, (x) => y0 + s * (x - r) ** 2)
    g.figure.caption = 'Courbe de f′'
    g.figure.caption = `Courbe de ${nf}′`
    const ex = numeric(`La courbe tracée est celle de la dérivée ${nf}′ d'une fonction ${nf}. Quelle est l'abscisse du point d'inflexion de la courbe de ${nf} ?`, r, {
      explanation: `${nf}′ est décroissante puis croissante, de minimum en x = ${fmt(r)} : ${nf}″ = (${nf}′)′ y change de signe, donc la courbe de ${nf} a un point d'inflexion d'abscisse ${fmt(r)}.`,
    })
    return withMeta(ex, { figure: g.figure })
  },
  () => {
    const r = randInt(-2, 2), y0 = randInt(-3, 0), s = pick([1, -1])
    const g = graph({ xMin: -4, xMax: 4, yMin: -4, yMax: 4 })
    plotC(g, (x) => s * (y0 + 0.6 * (x - r) ** 2))
    g.figure.caption = 'Courbe de f′'
    const right = s > 0
    g.figure.caption = `Courbe de ${nf}′`
    const ex = interval(`La courbe tracée est celle de la dérivée ${nf}′ d'une fonction ${nf}. Sur quel intervalle ${nf} est-elle convexe ?`, right ? I(r, Infinity) : I(-Infinity, r), {
      explanation: `${nf} est convexe là où ${nf}′ est croissante. Ici ${nf}′ est ${right ? `croissante sur [${fmt(r)} ; +∞[` : `croissante sur ]−∞ ; ${fmt(r)}]`}.`,
    })
    return withMeta(ex, { figure: g.figure })
  },
) }

// ── Palier 4 ─────────────────────────────────────────────────────────────

// Tangente de coefficient directeur donné
const tangentePente: Maker = () => oneOf(
  () => {
    const a = randNonZero(-3, 3), b = randInt(-6, 6), c = randInt(-6, 6), x0 = randInt(-4, 4), q = randInt(-9, 9)
    const m = 2 * a * x0 + b
    return numeric(`Soit f(x) = ${poly([a, 'x^2'], [b, 'x'], [c, ''])}. En quel point d'abscisse la tangente à la courbe de f est-elle parallèle à la droite d'équation y = ${lin(m, q)} ?`, x0, {
      explanation: `Tangentes parallèles ⇔ même coefficient directeur : f′(x) = ${lin(2 * a, b)} = ${fmt(m)} ⇔ x = ${fmt(x0)}.`,
    })
  },
  () => {
    const r = randInt(1, 3), p = randInt(-6, 6), m = 3 * r * r + p
    return solutionSet(`Soit f(x) = ${poly([1, 'x^3'], [p, 'x'])}. En quels points (abscisses) la tangente a-t-elle pour coefficient directeur ${fmt(m)} ?`, [-r, r], {
      explanation: `f′(x) = ${poly([3, 'x^2'], [p, ''])} = ${fmt(m)} ⇔ 3x² = ${3 * r * r} ⇔ x² = ${r * r} ⇔ x = −${r} ou x = ${r}.`,
    })
  },
  () => {
    const [num, den] = pick([[2, 1], [3, 1], [5, 1], [1, 2], [1, 3], [3, 2]])
    const a = pick([1, 2]) * den, b = (a / den) * num
    const ans = den === 1 ? `ln ${num}` : num === 1 ? `−ln ${den}` : `ln({${num}/${den}})`
    return exact(`Soit f(x) = ${poly([a, 'e^{x}'], [-b, 'x'])}. En quelle abscisse la tangente à sa courbe est-elle horizontale ?`, Math.log(num / den), ans, {
      explanation: `f′(x) = ${poly([a, 'e^{x}'], [-b, ''])} = 0 ⇔ e^{x} = ${fracText(b, a)} ⇔ x = ${ans}.`,
    })
  },
  () => {
    const r = pick([-4, -2, 2, 4, 6]), b = -3 * r / 2, c = randInt(-5, 5)
    return solutionSet(`Soit f(x) = ${poly([1, 'x^3'], [b, 'x^2'], [c, ''])}. En quels points (abscisses) la tangente à sa courbe est-elle horizontale ?`, [0, r], {
      explanation: `f′(x) = ${poly([3, 'x^2'], [2 * b, 'x'])} = 3x(${xPlus(-r)}) s'annule en 0 et en ${fmt(r)}.`,
    })
  },
)

// Inflexion de (x + h)e^{±x}
const inflexionExpo: Maker = () => oneOf(
  () => {
    const h = randInt(-4, 3)
    return numeric(`Soit f(x) = (${xPlus(h)})e^{x}. Donne l'abscisse du point d'inflexion de sa courbe.`, -h - 2, {
      explanation: `f′(x) = (${xPlus(h + 1)})e^{x}, f″(x) = (${xPlus(h + 2)})e^{x} : f″ s'annule et change de signe en x = ${fmt(-h - 2)}.`,
    })
  },
  () => {
    const h = randInt(-3, 4)
    return numeric(`Soit f(x) = (${xPlus(h)})e^{−x}. Donne l'abscisse du point d'inflexion de sa courbe.`, 2 - h, {
      explanation: `f′(x) = (${lin(-1, 1 - h)})e^{−x}, f″(x) = (${xPlus(h - 2)})e^{−x} : f″ s'annule et change de signe en x = ${fmt(2 - h)}.`,
    })
  },
  () => {
    const h = randInt(-4, 3), convex = Math.random() < 0.5
    return interval(`Soit f(x) = (${xPlus(h)})e^{x}. Sur quel intervalle f est-elle ${convex ? 'convexe' : 'concave'} ?`, convex ? I(-h - 2, Infinity) : I(-Infinity, -h - 2), {
      explanation: `f″(x) = (${xPlus(h + 2)})e^{x} est du signe de ${xPlus(h + 2)} : positive pour x ≥ ${fmt(-h - 2)}. f est convexe sur [${fmt(-h - 2)} ; +∞[ et concave sur ]−∞ ; ${fmt(-h - 2)}].`,
    })
  },
  () => {
    const h = randInt(-3, 4), convex = Math.random() < 0.5
    return interval(`Soit f(x) = (${xPlus(h)})e^{−x}. Sur quel intervalle f est-elle ${convex ? 'convexe' : 'concave'} ?`, convex ? I(2 - h, Infinity) : I(-Infinity, 2 - h), {
      explanation: `f″(x) = (${xPlus(h - 2)})e^{−x} est du signe de ${xPlus(h - 2)} : f est convexe sur [${fmt(2 - h)} ; +∞[ et concave sur ]−∞ ; ${fmt(2 - h)}].`,
    })
  },
)

// Extremum d'un quotient
const extremumQuotient: Maker = () => oneOf(
  () => {
    const c = randInt(2, 6), askV = Math.random() < 0.5
    const f = Math.random() < 0.5 ? `x + {${c * c}/x}` : `{x^2 + ${c * c}/x}`
    const expl = `f′(x) = 1 − ${F(c * c, 'x^2')} = ${F(`(x − ${c})(x + ${c})`, 'x^2')} : négative sur ]0 ; ${c}], positive après. Minimum en x = ${c}, égal à f(${c}) = ${2 * c}.`
    return askV
      ? numeric(`Quel est le minimum sur ]0 ; +∞[ de f(x) = ${f} ?`, 2 * c, { explanation: expl })
      : numeric(`En quelle valeur de x > 0 la fonction f(x) = ${f} atteint-elle son minimum ?`, c, { explanation: expl })
  },
  () => {
    const h = randInt(-2, 2)
    const den = h === 0 ? 'x' : xPlus(-h)
    const ans = eV(h + 1)
    return exact(`Soit f(x) = {eˣ/${den}} sur ]${fmt(h)} ; +∞[. Donne la valeur exacte de son minimum.`, Math.exp(h + 1), ans, {
      explanation: `f′(x) = ${F(h === -1 ? 'xeˣ' : `(${xPlus(-h - 1)})eˣ`, h === 0 ? 'x^2' : `(${den})^2`)} : négative puis positive, nulle en x = ${fmt(h + 1)}. Minimum : f(${fmt(h + 1)}) = ${ans}.`,
    })
  },
  () => {
    const c = randInt(1, 5), a = randInt(1, 9)
    return numeric(`Quel est le maximum sur [0 ; +∞[ de f(x) = {${a === 1 ? '' : a}x/x^2 + ${c * c}} ?`, a / (2 * c), {
      answer: fracText(a, 2 * c),
      explanation: `f′(x) = ${F(`${a}(${c * c} − x^2)`, `(x^2 + ${c * c})^2`)} : positive sur [0 ; ${c}], négative après. Maximum f(${c}) = ${F(a * c, 2 * c * c)} = ${fracText(a, 2 * c)}.`,
    })
  },
)

// Tangente faisant intervenir e
const tangenteExpo: Maker = () => oneOf(
  () => {
    const a = randNonZero(-4, 4), eq = lin(a + 1, a)
    return fexpr(`Donne l'équation réduite de la tangente à la courbe de f(x) = (${xPlus(a)})e^{x} au point d'abscisse 0.`, eq, {
      answer: `y = ${eq}`,
      explanation: `f(0) = ${fmt(a)} et f′(x) = (${xPlus(a + 1)})e^{x}, donc f′(0) = ${fmt(a + 1)} : y = ${eq}.`,
    })
  },
  () => {
    const n = pick([1, 2, -1])
    const eqs = n === 1 ? ['2ex − e', '2*e*x-e'] : n === 2 ? ['3e^{2}x − 4e^{2}', '3e^2*x-4e^2'] : ['−e^{−1}', '-e^(-1)']
    return fexpr(`Détermine l'équation réduite de la tangente à la courbe de f(x) = xe^{x} au point d'abscisse ${fmt(n)}.`, eqs[1], {
      answer: `y = ${eqs[0]}`,
      explanation: `f(${fmt(n)}) = ${n === 1 ? 'e' : n === 2 ? '2e^{2}' : '−e^{−1}'} et f′(x) = (x + 1)e^{x}, donc f′(${fmt(n)}) = ${n === 1 ? '2e' : n === 2 ? '3e^{2}' : '0'}. y = f′(${fmt(n)})(${xPlus(-n)}) + f(${fmt(n)}) = ${eqs[0]}.`,
    })
  },
  () => {
    const n = pick([1, 2, -1, 3])
    const eq = joinTerms([`${eV(n)}x`, ce(1 - n, n)])
    return fexpr(`Donne l'équation réduite de la tangente à la courbe de la fonction exponentielle au point d'abscisse ${fmt(n)}.`, `e^(${n})*x+${1 - n}*e^(${n})`, {
      answer: `y = ${eq}`,
      explanation: `exp(${fmt(n)}) = exp′(${fmt(n)}) = ${eV(n)} : y = ${eV(n)}(${xPlus(-n)}) + ${eV(n)} = ${eq}.`,
    })
  },
  () => {
    const k = randNonZero(-3, 3), b = randNonZero(-3, 3)
    const eq = joinTerms([`${ce(k, b)}x`, ce(1, b)])
    return fexpr(`Donne l'équation réduite de la tangente à la courbe de g(x) = ${eX(k, b)} au point d'abscisse 0.`, `${k}*e^(${b})*x+e^(${b})`, {
      answer: `y = ${eq}`,
      explanation: `g(0) = ${eV(b)} et g′(x) = ${coefP(k)}${eX(k, b)}, donc g′(0) = ${ce(k, b)} : y = ${eq}.`,
    })
  },
)

// Point d'inflexion avec e et ln
const inflexionLn: Maker = () => oneOf(
  () => {
    const m = randInt(2, 7)
    const coef = m % 2 === 0 ? coefP(m / 2) : `{${m}/2}`
    return exact(`Soit f(x) = e^{x} − ${coef}x². Donne l'abscisse exacte du point d'inflexion de sa courbe.`, Math.log(m), `ln ${m}`, {
      explanation: `f″(x) = e^{x} − ${m}, qui s'annule et change de signe quand e^{x} = ${m}, soit x = ln ${m}.`,
    })
  },
  () => {
    const m = randInt(2, 7)
    return exact(`Soit f(x) = e^{2x} − ${2 * m}x². Donne l'abscisse exacte du point d'inflexion de sa courbe.`, Math.log(m) / 2, `{1/2}ln ${m}`, {
      explanation: `f′(x) = 2e^{2x} − ${4 * m}x et f″(x) = 4e^{2x} − ${4 * m}, nulle quand e^{2x} = ${m} : 2x = ln ${m}, x = ${F(`ln ${m}`, 2)}.`,
    })
  },
  () => {
    const m = randInt(2, 7)
    const coef = m % 2 === 0 ? coefP(m / 2) : `{${m}/2}`
    return exact(`Soit f(x) = e^{−x} − ${coef}x². Donne l'abscisse exacte du point d'inflexion de sa courbe.`, -Math.log(m), `−ln ${m}`, {
      explanation: `f″(x) = e^{−x} − ${m}, nulle quand e^{−x} = ${m} : −x = ln ${m}, x = −ln ${m}. f″ change bien de signe (e^{−x} est décroissante).`,
    })
  },
)

// ── Palier 5 ─────────────────────────────────────────────────────────────

// Optimisation
const optimisation: Maker = () => oneOf(
  () => {
    const t = randInt(1, 5), c = 6 * t, askV = Math.random() < 0.5
    const expl = `V(x) = x(${c} − 2x)², V′(x) = (${c} − 2x)² − 4x(${c} − 2x) = (${c} − 2x)(${c} − 6x) : V′ s'annule en x = ${t} (positive avant, négative après). V(${t}) = ${t} × ${4 * t}² = ${16 * t ** 3}.`
    const intro = `Dans une feuille carrée de ${c} cm de côté, on découpe aux quatre coins des carrés de côté x cm pour plier une boîte sans couvercle, de volume V(x) = x(${c} − 2x)².`
    return askV
      ? numeric(`${intro} Quel est le volume maximal (en cm³) ?`, 16 * t ** 3, { explanation: expl })
      : numeric(`${intro} Pour quelle valeur de x le volume est-il maximal ?`, t, { explanation: expl })
  },
  () => {
    const m = randInt(1, 3), k = 3 * m * m
    return numeric(`Un rectangle a deux sommets sur l'axe des abscisses et deux sur la parabole y = ${k} − x², symétriquement par rapport à l'axe des ordonnées. Son aire vaut A(x) = 2x(${k} − x²) pour x ∈ [0 ; √{${k}}]. Quelle est son aire maximale ?`, 4 * m ** 3, {
      explanation: `A′(x) = ${2 * k} − 6x² s'annule en x = √{${k / 3}} = ${m} (positive avant, négative après). A(${m}) = 2 × ${m} × ${k - m * m} = ${4 * m ** 3}.`,
    })
  },
  () => retry(() => {
    const r = randInt(3, 9), s = randInt(1, 5)
    if ((r - s) % 2 !== 0) return null
    const b2 = (3 * (r - s)) / 2, c = 3 * r * s, K = randInt(10, 60)
    return numeric(`Le bénéfice (en centaines d'euros) d'un atelier qui produit x objets par jour est B(x) = ${poly([-1, 'x^3'], [b2, 'x^2'], [c, 'x'], [-K, ''])}, pour x ∈ [0 ; 15]. Combien d'objets faut-il produire pour un bénéfice maximal ?`, r, {
      explanation: `B′(x) = ${poly([-3, 'x^2'], [2 * b2, 'x'], [c, ''])} = −3(${xPlus(-r)})(${xPlus(s)}) : positive sur [0 ; ${r}], négative après. Maximum en x = ${r}.`,
    })
  }),
  () => {
    const b = randInt(2, 9), a = randInt(1, 20)
    return numeric(`Le coût de production de x tonnes est C(x) = ${poly([1, 'x^2'], [a, 'x'], [b * b, ''])} (x > 0). Pour quelle production le coût moyen C(x)/x est-il minimal ?`, b, {
      explanation: `C(x)/x = x + ${a} + ${F(b * b, 'x')}, de dérivée 1 − ${F(b * b, 'x^2')} : négative avant ${b}, positive après. Minimum en x = ${b}.`,
    })
  },
)

// Paramètre
const parametre: Maker = fresh(() => oneOf(
  () => {
    const a = pick([-4, -2, 2, 4]), n = randInt(-5, 5)
    return numeric(`Pour quelle valeur de m la courbe de f(x) = x³ + mx²${n ? ` ${n < 0 ? '−' : '+'} ${Math.abs(n)}` : ''} a-t-elle une tangente horizontale au point d'abscisse ${fmt(a)} ?`, -3 * a / 2, {
      explanation: `f′(x) = 3x² + 2mx, et f′(${fmt(a)}) = ${3 * a * a} + ${par(2 * a)}m = 0 ⇔ m = ${fmt(-3 * a / 2)}.`,
    })
  },
  () => {
    const p = pick([-5, -4, -2, -1, 1, 2, 4, 5])
    return numeric(`Pour quelle valeur de m la tangente en 0 à la courbe de f(x) = e^{mx} passe-t-elle par le point (${fmt(p)} ; 0) ?`, -1 / p, {
      answer: fracText(-1, p),
      explanation: `f(0) = 1 et f′(0) = m : la tangente est y = mx + 1. Elle passe par (${fmt(p)} ; 0) si ${fmt(p)}m + 1 = 0, soit m = ${fracText(-1, p)}.`,
    })
  },
  () => {
    const a = randNonZero(-3, 3)
    return numeric(`Pour quelle valeur de m la courbe de f(x) = x³ + mx² + x admet-elle un point d'inflexion d'abscisse ${fmt(a)} ?`, -3 * a, {
      explanation: `f″(x) = 6x + 2m s'annule (en changeant de signe) en x = −${F('m', 3)} ; −${F('m', 3)} = ${fmt(a)} ⇔ m = ${fmt(-3 * a)}.`,
    })
  },
  () => {
    const a = randNonZero(-3, 3)
    return numeric(`Pour quelle valeur de m la fonction f(x) = (x + m)e^{x} atteint-elle son minimum en x = ${fmt(a)} ?`, -a - 1, {
      explanation: `f′(x) = (x + m + 1)e^{x} s'annule en changeant de signe (− puis +) en x = −m − 1. −m − 1 = ${fmt(a)} ⇔ m = ${fmt(-a - 1)}.`,
    })
  },
))

// Tangentes passant par un point donné
const tangentesPoint: Maker = () => oneOf(
  () => retry(() => {
    const r1 = randInt(-4, 3), r2 = randInt(r1 + 1, 5)
    if ((r1 + r2) % 2 !== 0) return null
    const p = (r1 + r2) / 2, q = r1 * r2
    return solutionSet(`Par le point M(${fmt(p)} ; ${fmt(q)}) passent deux tangentes à la parabole y = x². Donne les abscisses des points de contact.`, [r1, r2], {
      explanation: `La tangente en a est y = 2a(x − a) + a² = 2ax − a². Elle passe par M si ${fmt(q)} = ${fmt(2 * p)}a − a², soit ${poly([1, 'a²'], [-2 * p, 'a'], [q, ''])} = 0, de racines ${fmt(r1)} et ${fmt(r2)}.`,
    })
  }),
  () => {
    const k = pick([2, 3, 4, -1, -2, 0.5])
    const kt = k === 0.5 ? '0,5x' : k === -1 ? '−x' : `${fmt(k)}x`
    return numeric(`La tangente à la courbe de f(x) = e^{${kt}} au point d'abscisse a passe par l'origine du repère. Que vaut a ?`, 1 / k, {
      answer: fracText(k === 0.5 ? 2 : 1, k === 0.5 ? 1 : k),
      explanation: `Tangente en a : y = ${fmt(k)}e^{${fmt(k)}a}(x − a) + e^{${fmt(k)}a}. Elle passe par O si −${fmt(k)}a e^{${fmt(k)}a} + e^{${fmt(k)}a} = 0, soit ${fmt(k)}a = 1 : a = ${fracText(k === 0.5 ? 2 : 1, k === 0.5 ? 1 : k)}.`,
    })
  },
  () => {
    const k = randInt(1, 4)
    return solutionSet(`Deux tangentes à la parabole y = x² + ${k * k} passent par l'origine du repère. Donne les abscisses des points de contact.`, [-k, k], {
      explanation: `Tangente en a : y = 2a(x − a) + a² + ${k * k}. Elle passe par O si −2a² + a² + ${k * k} = 0, soit a² = ${k * k} : a = −${k} ou a = ${k}.`,
    })
  },
  () => {
    const p = randNonZero(-3, 3)
    return numeric(`La tangente à la courbe de la fonction exponentielle au point d'abscisse a passe par le point (${fmt(p)} ; 0). Que vaut a ?`, p + 1, {
      explanation: `Tangente en a : y = e^{a}(x − a) + e^{a} = e^{a}(x − a + 1). Elle coupe l'axe des abscisses en x = a − 1. Donc a − 1 = ${fmt(p)} et a = ${fmt(p + 1)}.`,
    })
  },
)

// Intervalles de convexité (fonctions variées)
const convexiteIntervalles: Maker = () => oneOf(
  () => {
    const a = randInt(-3, 4), convex = Math.random() < 0.5
    return interval(`Soit f(x) = (${xPlus(a)})e^{−x}. Sur quel intervalle la courbe de f est-elle ${convex ? 'au-dessus' : 'au-dessous'} de ses tangentes ?`, convex ? I(2 - a, Infinity) : I(-Infinity, 2 - a), {
      explanation: `f″(x) = (${xPlus(a - 2)})e^{−x}. La courbe est au-dessus de ses tangentes là où f est convexe (f″ ≥ 0), c'est-à-dire sur [${fmt(2 - a)} ; +∞[, et au-dessous sur ]−∞ ; ${fmt(2 - a)}].`,
    })
  },
  () => {
    const k = randInt(1, 3)
    return interval(`Soit f(x) = ${poly([-1, 'x^4'], [6 * k * k, 'x^2'])}. Sur quel intervalle f est-elle convexe ?`, I(-k, k), {
      explanation: `f″(x) = −12x² + ${12 * k * k} = 12(${k * k} − x²), positive sur [−${k} ; ${k}] : f est convexe sur cet intervalle (et concave sur ]−∞ ; −${k}] et sur [${k} ; +∞[).`,
    })
  },
  () => {
    const a = randInt(-4, 3), convex = Math.random() < 0.5
    return interval(`Soit f(x) = (${xPlus(a)})e^{x}. Sur quel intervalle la courbe de f est-elle ${convex ? 'au-dessus' : 'au-dessous'} de ses tangentes ?`, convex ? I(-a - 2, Infinity) : I(-Infinity, -a - 2), {
      explanation: `f″(x) = (${xPlus(a + 2)})e^{x}, positive pour x ≥ ${fmt(-a - 2)}. Courbe au-dessus de ses tangentes ⇔ f convexe : sur [${fmt(-a - 2)} ; +∞[ ; au-dessous sur ]−∞ ; ${fmt(-a - 2)}].`,
    })
  },
  () => {
    const a = pick([-6, -3, 3, 6]), b = randInt(-9, 9), convex = Math.random() < 0.5, r = a / 3
    return interval(`Soit f(x) = ${poly([-1, 'x^3'], [a, 'x^2'], [b, 'x'])}. Sur quel intervalle f est-elle ${convex ? 'convexe' : 'concave'} ?`, convex ? I(-Infinity, r) : I(r, Infinity), {
      explanation: `f″(x) = ${lin(-6, 2 * a)}, positive pour x ≤ ${fmt(r)}. Donc f est convexe sur ]−∞ ; ${fmt(r)}] et concave sur [${fmt(r)} ; +∞[.`,
    })
  },
)

// Composées exigeantes
const composeesFortes: Maker = () => oneOf(
  () => {
    const a = randInt(1, 3)
    const ex = `−${a === 1 ? '' : a}x²`
    const ans = `(1 − ${2 * a}x²)e^{${ex}}`
    return fexpr(`Dérive f(x) = xe^{${ex}}.`, `(1-${2 * a}x^2)*e^(-${a}x^2)`, {
      answer: ans,
      explanation: `Produit : f′(x) = e^{${ex}} + x × (−${2 * a}x)e^{${ex}} = ${ans}.`,
    })
  },
  () => {
    const c = randInt(1, 6)
    const ans = `{eˣ/2√(eˣ + ${c})}`
    return fexpr(`Dérive la fonction f définie sur ℝ par f(x) = √{eˣ + ${c}}.`, `e^x/(2√(e^x+${c}))`, {
      answer: ans,
      explanation: `(√u)′ = ${F('u′', '2√u')} avec u(x) = eˣ + ${c}, u′(x) = eˣ : f′(x) = ${ans}.`,
    })
  },
  () => {
    const k = randInt(1, 3)
    const ans = `{${k}/2√x}e^{${k === 1 ? '' : k}√x}`
    return fexpr(`Dérive f(x) = e^{${k === 1 ? '' : k}√x} sur ]0 ; +∞[.`, `${k}/(2√x)*e^(${k}√x)`, {
      answer: ans, dom: DOM_POS,
      explanation: `(e^{u})′ = u′e^{u} avec u(x) = ${k === 1 ? '' : k}√x, u′(x) = ${F(k, '2√x')} : f′(x) = ${ans}.`,
    })
  },
  () => {
    const a = randInt(1, 6)
    const ans = `(−x² + 2x − ${a})e^{−x}`
    return fexpr(`Dérive g(x) = (x² + ${a})e^{−x}.`, `(-x^2+2x-${a})*e^(-x)`, {
      answer: ans,
      explanation: `g′(x) = 2xe^{−x} − (x² + ${a})e^{−x} = ${ans}.`,
    })
  },
  () => {
    const c = randInt(1, 6)
    const ans = `{${c}/(x² + ${c})√(x² + ${c})}`
    return fexpr(`Dérive h(x) = {x/√(x² + ${c})} et simplifie au maximum.`, `${c}/((x^2+${c})*√(x^2+${c}))`, {
      answer: ans,
      explanation: `h′(x) = ${F(`√(x² + ${c}) − x × x/√(x² + ${c})`, `x² + ${c}`)} ; on multiplie en haut et en bas par √(x² + ${c}) : h′(x) = ${F(`x² + ${c} − x²`, `(x² + ${c})√(x² + ${c})`)} = ${ans}.`,
    })
  },
)

const tiers: Tiers = [
  [usuelles, nombreDerive, lectureTangente, expoSimple, tangenteDonnees],
  [produit, quotient, tangenteCalcul, composeeAffine, variations],
  [extremum, deriveeSeconde, convexitePoly, composees, convexiteGraphique],
  [tangentePente, inflexionExpo, extremumQuotient, tangenteExpo, inflexionLn],
  [optimisation, parametre, tangentesPoint, convexiteIntervalles, composeesFortes],
]

// ═══════════════════════════════════════════════════════════════════════
// Problèmes d'amélioration (généralisation)
// ═══════════════════════════════════════════════════════════════════════

const upgrades: Ladder = [
  [
    // Dérivées successives de e^{kx}
    () => {
      const k = pick([2, -1, 3, -2]), n = randInt(3, 5)
      return numeric(`Soit f(x) = ${eX(k)}. On note f^{(n)} la dérivée n-ième de f (f^{(1)} = f′, f^{(2)} = f″…). Que vaut f^{(${n})}(0) ?`, k ** n, {
        explanation: `Chaque dérivation multiplie par ${fmt(k)} : f^{(n)}(x) = ${par(k)}^n${eX(k)}. Donc f^{(${n})}(0) = ${par(k)}^${n} = ${fmt(k ** n)}.`,
      })
    },
    // f′(1) + f″(1) pour x^n
    () => {
      const n = randInt(3, 9), a = randInt(1, 5)
      return numeric(`Soit f(x) = ${coefP(a)}x^${n}. Calcule f′(1) + f″(1). (Essaie de trouver la formule générale pour ax^n.)`, a * n * n, {
        explanation: `f′(x) = ${a * n}x^${n - 1} et f″(x) = ${a * n * (n - 1)}x^${n - 2}, donc f′(1) + f″(1) = ${a * n} + ${a * n * (n - 1)} = ${a * n * n}. En général : a(n + n(n − 1)) = an².`,
      })
    },
    // Parabole tangente à une droite
    () => {
      const m = pick([-6, -4, -2, 2, 4, 6, 8]), p = randInt(-5, 5), c = (m * m) / 4 + p
      return numeric(`Pour quelle valeur de c la parabole y = x² + c est-elle tangente à la droite d'équation y = ${lin(m, p)} ?`, c, {
        explanation: `Au point de contact d'abscisse a, les pentes sont égales : 2a = ${fmt(m)}, donc a = ${fmt(m / 2)}. Les ordonnées aussi : ${fmt(m * m / 4)} + c = ${fmt(m)} × ${par(m / 2)}${p ? ` + ${par(p)}` : ''} = ${fmt(m * m / 2 + p)}, d'où c = ${fmt(c)}.`,
      })
    },
    // Dérivée d'une composée à partir d'un tableau de valeurs
    () => {
      const a = randInt(1, 3), ga = randInt(-3, 3), gpa = randNonZero(-4, 4), fpg = randNonZero(-5, 5)
      return numeric(`On sait que g(${a}) = ${fmt(ga)}, g′(${a}) = ${fmt(gpa)} et f′(${fmt(ga)}) = ${fmt(fpg)}. Soit h(x) = f(g(x)). Calcule h′(${a}).`, gpa * fpg, {
        explanation: `(f ∘ g)′(x) = g′(x) × f′(g(x)), donc h′(${a}) = g′(${a}) × f′(${fmt(ga)}) = ${fmt(gpa)} × ${par(fpg)} = ${fmt(gpa * fpg)}.`,
      })
    },
  ],
  [
    // Maximum de x^n e^{−x}
    () => {
      const n = randInt(2, 5), k = pick([1, 2]), a = randInt(1, 3)
      const top = n / k, v = a * top ** n * Math.exp(-n)
      const ek = k === 1 ? 'e^{−x}' : 'e^{−2x}'
      const ans = `${fmt(a * top ** n)}e^{−${n}}`
      return exact(`On pose f(x) = ${coefP(a)}x^${n}${ek} sur [0 ; +∞[. Étudie ses variations et donne la valeur exacte de son maximum.`, v, ans, {
        explanation: `f′(x) = ${coefP(a)}(${n}${xp(n - 1)} − ${coefP(k)}x^${n})${ek} = ${coefP(a)}${xp(n - 1)}(${n} − ${coefP(k)}x)${ek} : positive avant ${fmt(top)}, négative après. Maximum f(${fmt(top)}) = ${coefP(a)}${par(top)}^${n}e^{−${n}} = ${ans} ≈ ${fmt(Math.round(v * 100) / 100)}.`,
      })
    },
    // Dérivée seconde d'un produit
    () => {
      const f0 = randNonZero(-3, 3), f1 = randNonZero(-3, 3), f2 = randNonZero(-4, 4), g0 = randNonZero(-3, 3), g1 = randInt(-3, 3), g2 = randNonZero(-3, 3)
      const v = f2 * g0 + 2 * f1 * g1 + f0 * g2
      return numeric(`Deux fonctions deux fois dérivables vérifient : f(0) = ${fmt(f0)}, f′(0) = ${fmt(f1)}, f″(0) = ${fmt(f2)}, g(0) = ${fmt(g0)}, g′(0) = ${fmt(g1)}, g″(0) = ${fmt(g2)}. Calcule (fg)″(0).`, v, {
        explanation: `(fg)′ = f′g + fg′, puis (fg)″ = f″g + 2f′g′ + fg″. En 0 : ${par(f2)} × ${par(g0)} + 2 × ${par(f1)} × ${par(g1)} + ${par(f0)} × ${par(g2)} = ${fmt(v)}.`,
      })
    },
    // Tangente à exp passant par un point
    () => {
      const p = randNonZero(-3, 3), k = randInt(1, 4)
      return exact(`Une tangente à la courbe de f(x) = ${coefP(k)}e^{x} passe par le point (${fmt(p)} ; 0). Quel est son coefficient directeur (valeur exacte) ?`, k * Math.exp(p + 1), ce(k, p + 1), {
        explanation: `La tangente en a, y = ${coefP(k)}e^{a}(x − a + 1), coupe l'axe des abscisses en a − 1. Donc a − 1 = ${fmt(p)}, a = ${fmt(p + 1)}, et le coefficient directeur vaut f′(a) = ${ce(k, p + 1)}.`,
      })
    },
  ],
  [
    // Distance minimale d'un point à une parabole
    () => {
      const k = randInt(1, 4), h = k * k + 0.25, d = randInt(-3, 3)
      const par0 = poly([1, 'x²'], [d, ''])
      return numeric(`Quelle est la distance minimale entre le point A(0 ; ${fmt(h + d)}) et un point M de la parabole y = ${par0} ?`, k, {
        explanation: `Pour M(x ; ${par0}) : AM² = x² + (x² − ${fmt(h)})² = d(x). d′(x) = 2x + 4x(x² − ${fmt(h)}) = 2x(2x² − ${fmt(2 * h - 1)}) : d est minimale pour x² = ${fmt(h - 0.5)}, où AM² = ${fmt(h - 0.5)} + 0,25 = ${k * k}. Distance minimale : ${k}.`,
      })
    },
    // Plus grande pente d'une droite passant par O sous e^{bx}
    () => {
      const b = pick([1, 2, 3]), c = randInt(1, 4)
      const fx = `${coefP(c)}e^{${b === 1 ? '' : b}x}`
      return exact(`Quel est le plus grand réel k tel que ${fx} ≥ kx pour tout réel x ? (Pense à la tangente passant par l'origine et à la convexité.)`, b * c * Math.E, `${coefP(b * c)}e`, {
        explanation: `La fonction x ↦ ${fx} est convexe : sa courbe est au-dessus de ses tangentes. La tangente en a passe par O si ${b}a = 1, soit a = ${fracText(1, b)} ; sa pente vaut ${c * b}e^{1} = ${coefP(b * c)}e. Pour k plus grand, la droite y = kx couperait la courbe ; pour k ≤ ${coefP(b * c)}e (et x ≥ 0) elle reste dessous, et pour x < 0 on a kx ≤ 0 < ${fx}.`,
      })
    },
    // Points d'inflexion d'une gaussienne
    () => {
      const [a, r] = pick([[2, 0.5], [8, 0.25], [0.5, 1], [0.125, 2]] as [number, number][])
      const at = a === 0.5 ? 'x²/2' : a === 0.125 ? 'x²/8' : `${fmt(a)}x²`
      const c = randInt(1, 5)
      return solutionSet(`Donne les abscisses des points d'inflexion de la courbe de f(x) = ${coefP(c)}e^{−${at}}.`, [-r, r], {
        explanation: `f′(x) = −${coefP(2 * a)}xe^{−${at}}, f″(x) = (${coefP(4 * a * a)}x² − ${fmt(2 * a)})e^{−${at}} : nulle et changeant de signe pour x² = ${fmt(r * r)}, soit x = ±${fmt(r)}.`,
      })
    },
  ],
]

// ═══════════════════════════════════════════════════════════════════════
// Problèmes de l'hôtel de ville
// ═══════════════════════════════════════════════════════════════════════

const age: Ladder = [
  [
    // La flèche de l'archer
    () => {
      const v = pick([20, 30, 40]), h0 = randInt(1, 2), tm = v / 10, H = h0 + 5 * tm * tm
      const ys = niceStep(H, 5)
      const g = graph({ xMin: 0, xMax: 2 * tm + 1, yMin: 0, yMax: Math.ceil(H / ys) * ys + ys / 2, step: 1, labelStep: 2, ystep: ys / 2, ylabelStep: ys })
      plotC(g, (t) => -5 * t * t + v * t + h0, { a: 0, b: 2 * tm + 0.2 })
      return T('La flèche de l’archer', numeric(`${cap(prenom())} tire une flèche vers le ciel. Sa hauteur (en m) après t secondes est h(t) = −5t² + ${v}t + ${h0}. La flèche monte tant que sa vitesse verticale h′(t) est positive. Quelle hauteur maximale atteint-elle ?`, H, {
        explanation: `h′(t) = −10t + ${v} s'annule en t = ${fmt(tm)} s (positive avant, négative après). h(${fmt(tm)}) = −5 × ${fmt(tm * tm)} + ${v} × ${fmt(tm)} + ${h0} = ${fmt(H)} m.`,
      }), g.figure)
    },
    // La vitesse du chariot
    () => {
      const a = randInt(1, 4), b = randInt(2, 8), t0 = randInt(2, 6)
      const g = graph({ xMin: 0, xMax: 8, yMin: 0, yMax: Math.ceil((a * 64 + b * 8) / 20) * 20, ystep: 20, ylabelStep: 40, labelStep: 2 })
      plotC(g, (t) => a * t * t + b * t, { a: 0, b: 8 })
      const m = 2 * a * t0 + b, d0 = a * t0 * t0 + b * t0
      plotC(g, (t) => m * (t - t0) + d0, { color: BLUE, a: Math.max(0, t0 - 2), b: Math.min(8, t0 + 2) })
      g.point('M', t0, d0)
      return T('La vitesse du chariot', numeric(`Un chariot dévale une pente. La distance parcourue (en m) après t secondes est d(t) = ${poly([a, 't^2'], [b, 't'])}. Sa vitesse instantanée à l'instant t est d′(t), coefficient directeur de la tangente (en bleu). Quelle est sa vitesse (en m/s) à t = ${t0} s ?`, m, {
        explanation: `d′(t) = ${poly([2 * a, 't'], [b, ''])}, donc d′(${t0}) = ${2 * a} × ${t0} + ${b} = ${m} m/s.`,
      }), g.figure)
    },
    // Le coût marginal
    () => retry(() => {
      const p = personnage(), q = randInt(5, 15), a = pick([0.1, 0.2, 0.5]), b = randInt(2, 12), c = randInt(100, 400)
      const cm = 3 * a * q * q - 2 * q + b
      if (cm <= 0) return null
      return T('Le coût de la dernière épée', numeric(`${cap(p.nom)} fabrique des épées. Le coût de production de q épées (en écus) est C(q) = ${fmt(a)}q³ − q² + ${b}q + ${c}. Les économistes appellent coût marginal la dérivée C′(q) : c'est environ le coût d'une épée de plus. Calcule le coût marginal pour q = ${q}.`, cm, {
        explanation: `C′(q) = ${fmt(3 * a)}q² − 2q + ${b}, donc C′(${q}) = ${fmt(3 * a)} × ${q * q} − ${2 * q} + ${b} = ${fmt(cm)} écus.`,
      }))
    }),
    // La pente du chemin
    () => retry(() => {
      const L = pick([400, 500, 600]), H = pick([60, 80, 100, 120]), u = pick([0.25, 0.5, 0.75]), x0 = u * L
      // profil y = H(3u² − 2u³) : départ et arrivée en pente nulle
      const f = (x: number) => H * (3 * (x / L) ** 2 - 2 * (x / L) ** 3)
      const pct = (600 * H * (u - u * u)) / L
      if (Math.abs(pct * 10 - Math.round(pct * 10)) > 1e-9) return null
      const g = graph({ xMin: 0, xMax: L, yMin: 0, yMax: H * 1.25, step: L / 4, labelStep: L / 2, ystep: H / 4, ylabelStep: H / 2 })
      plotC(g, f, { a: 0, b: L })
      g.point('P', x0, f(x0))
      return T('La pente du chemin', numeric(`Le chemin qui monte au donjon a pour profil y = f(x) = ${H}(3u² − 2u³) avec u = {x/${L}} (x et y en m, x de 0 à ${L}). La pente en un point est f′(x), souvent donnée en pourcentage (× 100). Quelle est la pente, en %, au point P d'abscisse ${fmt(x0)} ?`, pct, {
        explanation: `Avec u′ = ${F(1, L)} : f′(x) = ${H} × (6u − 6u²) × ${F(1, L)} = ${fmt(6 * H / L)}(u − u²). En x = ${fmt(x0)} : u = ${fmt(u)}, f′(${fmt(x0)}) = ${fmt(6 * H / L)} × ${fmt(u - u * u)} = ${fmt(pct / 100)}, soit ${fmt(pct)} %.`,
        inputHint: 'Pourcentage, ex. 12,5',
      }), g.figure)
    }),
  ],
  [
    // L'enclos contre la rivière
    () => {
      const L = 20 * randInt(2, 10), x = L / 4, A = x * (L - 2 * x)
      const who = pick(['Un berger', 'Une maraîchère', 'Le seigneur', 'Une éleveuse de chèvres', 'Le meunier'])
      const ys = niceStep(A, 5)
      const g = graph({ xMin: 0, xMax: L / 2, yMin: 0, yMax: Math.ceil((A * 1.1) / ys) * ys, step: L / 20, labelStep: L / 10, ystep: ys, ylabelStep: 2 * ys })
      plotC(g, (t) => t * (L - 2 * t), { a: 0, b: L / 2 })
      return T('L’enclos contre la rivière', numeric(`${who} dispose de ${L} m de clôture pour faire un enclos rectangulaire le long d'une rivière (le côté de la rivière n'a pas besoin de clôture). On note x la largeur (les deux côtés perpendiculaires à la rivière) ; l'aire est A(x) = x(${L} − 2x), représentée ci-dessous. Quelle est l'aire maximale (en m²) ?`, A, {
        explanation: `A(x) = ${L}x − 2x², A′(x) = ${L} − 4x s'annule en x = ${fmt(x)} (positive avant, négative après). A(${fmt(x)}) = ${fmt(x)} × ${fmt(L - 2 * x)} = ${fmt(A)} m².`,
      }), g.figure)
    },
    // La boîte du marchand
    () => {
      const t = randInt(2, 6), c = 6 * t
      const pts = { A: [0, 0], B: [c, 0], C: [c, c], D: [0, c] }
      const fig: Figure = (() => {
        const g = graph({ xMin: -2, xMax: c + 2, yMin: -3, yMax: c + 2, step: t, labelStep: c, grid: false, w: 240, h: 240 })
        for (const [n, [px, py]] of Object.entries(pts)) g.point(n, px, py, '')
        g.segment('A', 'B'); g.segment('B', 'C'); g.segment('C', 'D'); g.segment('D', 'A')
        const s = t
        for (const [cx, cy] of [[0, 0], [c - s, 0], [c - s, c - s], [0, c - s]]) {
          g.figure.curves!.push({ pts: [g.at(cx, cy), g.at(cx + s, cy), g.at(cx + s, cy + s), g.at(cx, cy + s), g.at(cx, cy)], color: RED, dashed: true, width: 1.6 })
        }
        g.note(s / 2, s / 2 + 0.4, 'x')
        g.note(c / 2, -2.4, `${c} cm`)
        g.figure.axes = undefined
        g.figure.caption = 'On découpe les quatre carrés rouges puis on relève les bords.'
        return g.figure
      })()
      const mat = pick(['plaque de cuivre', 'feuille de carton', 'plaque d’étain', 'feuille de parchemin'])
      return T('La boîte du marchand', numeric(`Un marchand découpe, aux quatre coins d'une ${mat} carrée de ${c} cm de côté, quatre carrés de côté x cm, puis relève les bords pour former une boîte sans couvercle. Quel est le volume maximal (en cm³) de la boîte ?`, 16 * t ** 3, {
        explanation: `V(x) = x(${c} − 2x)², V′(x) = (${c} − 2x)(${c} − 6x) s'annule en x = ${t} (x < ${c / 2}) : positive avant, négative après. V(${t}) = ${t} × ${4 * t}² = ${16 * t ** 3} cm³.`,
      }), fig)
    },
    // Le remède de la guérisseuse
    () => {
      const k = pick([2, 3, 4]), a = pick([5, 6, 8, 10])
      const peak = (a * k) / Math.E
      const g = graph({ xMin: 0, xMax: 6 * k, yMin: 0, yMax: Math.ceil(peak) + 1, step: k, labelStep: 2 * k, ystep: 1, ylabelStep: 2 })
      plotC(g, (t) => a * t * Math.exp(-t / k), { a: 0, b: 6 * k })
      return T('Le remède de la guérisseuse', exact(`La concentration d'un remède dans le sang (en mg/L) t heures après la prise est C(t) = ${a}te^{−t/${k}}. Étudie ses variations pour trouver l'instant du pic, puis donne la concentration maximale (valeur exacte ou arrondi au centième).`, peak, `{${a * k}/e}`, {
        explanation: `C′(t) = ${a}e^{−t/${k}} − ${F(a, k)}te^{−t/${k}} = ${a}(1 − ${F('t', k)})e^{−t/${k}} : positive avant t = ${k}, négative après. Maximum à t = ${k} h : C(${k}) = ${a * k}e^{−1} = ${F(a * k, 'e')} ≈ ${fmt(Math.round(peak * 100) / 100)} mg/L.`,
      }), g.figure)
    },
    // Le bénéfice de la forge
    () => retry(() => {
      const r = randInt(4, 10), s = randInt(1, 4)
      if ((r - s) % 2 !== 0) return null
      const b2 = (3 * (r - s)) / 2, c = 3 * r * s, K = randInt(10, 30)
      const B = (x: number) => -(x ** 3) + b2 * x * x + c * x - K
      return T('Le bénéfice de la forge', numeric(`La forge du village vend x outils par semaine (0 ≤ x ≤ 15). Son bénéfice, en écus, est B(x) = ${poly([-1, 'x^3'], [b2, 'x^2'], [c, 'x'], [-K, ''])}. Quel est le bénéfice maximal ?`, B(r), {
        explanation: `B′(x) = ${poly([-3, 'x^2'], [2 * b2, 'x'], [c, ''])} = −3(${xPlus(-r)})(${xPlus(s)}) : positive sur [0 ; ${r}], négative après. Maximum B(${r}) = ${fmt(B(r))} écus.`,
      }))
    }),
  ],
  [
    // Le toboggan
    () => {
      const H = pick([3, 4, 6]), L = pick([6, 8, 12])
      const f = (x: number) => H * (2 * (x / L) ** 3 - 3 * (x / L) ** 2 + 1)
      const steep = (3 * H) / (2 * L)
      const g = graph({ xMin: 0, xMax: L, yMin: 0, yMax: H + 1, step: L / 4, labelStep: L / 2, ystep: 1, ylabelStep: H > 4 ? 2 : 1 })
      plotC(g, f, { a: 0, b: L })
      g.point('I', L / 2, H / 2)
      return T('Le toboggan du parc', numeric(`Le profil d'un toboggan est la courbe de f(x) = ax³ + bx² + c sur [0 ; ${L}] (en m). Il part du point (0 ; ${H}) et arrive en (${L} ; 0), avec une pente nulle au départ et à l'arrivée. On trouve a = ${Fr(2 * H, L ** 3)}, b = ${Fr(-3 * H, L * L)}, c = ${H}. La pente est la plus forte au point d'inflexion I. Quelle est cette pente, en valeur absolue (décimal) ?`, steep, {
        explanation: `f′(x) = 3ax² + 2bx et f″(x) = 6ax + 2b s'annule en x = −${F('b', '3a')} = ${fmt(L / 2)} : c'est là que |f′| est maximale. f′(${fmt(L / 2)}) = ${Fr(-3 * H, 2 * L)} = −${fmt(steep)}, soit une pente de ${fmt(steep)} (≈ ${fmt(Math.round(steep * 1000) / 10)} %).`,
      }), g.figure)
    },
    // La rumeur
    () => {
      const r = pick([4, 5, 6]), k = pick([1, 2, 3, 4])
      const N = (t: number) => k * (3 * r * t * t - t ** 3)
      const ys = niceStep(N(2 * r), 6)
      const g = graph({ xMin: 0, xMax: 2 * r, yMin: 0, yMax: Math.ceil(N(2 * r) / ys) * ys, step: 1, labelStep: 2, ystep: ys, ylabelStep: 2 * ys })
      plotC(g, N, { a: 0, b: 2 * r })
      return T('La rumeur au village', numeric(`${pick(['Au village', 'Dans le bourg', 'À la foire', 'Au château'])}, le nombre de personnes ayant entendu une rumeur t jours après son départ est N(t) = ${poly([3 * r * k, 't^2'], [-k, 't^3'])}, pour t ∈ [0 ; ${2 * r}]. La rumeur se propage le plus vite au point d'inflexion de la courbe. Combien de personnes l'apprennent par jour à ce moment-là (vitesse N′(t)) ?`, 3 * k * r * r, {
        explanation: `N′(t) = ${6 * r * k}t − ${3 * k}t², N″(t) = ${6 * r * k} − ${6 * k}t s'annule en t = ${r} (N′ y est maximale). N′(${r}) = ${6 * r * k * r} − ${3 * k * r * r} = ${3 * k * r * r} personnes par jour.`,
      }), g.figure)
    },
    // Le câble sous la rivière
    () => {
      const [d, c1, c2, mult] = pick([[3, 5, 4, 1], [6, 5, 4, 1], [3, 5, 3, 1], [6, 5, 3, 1], [3, 13, 12, 1]] as [number, number, number, number][])
      const xs = (d * c2) / Math.sqrt(c1 * c1 - c2 * c2)
      const L = Math.ceil(xs) + pick([3, 5, 8])
      const free: Figure = {
        points: {
          R1: { x: 10, y: 60, hidden: true, label: '' }, R2: { x: 310, y: 60, hidden: true, label: '' },
          R3: { x: 10, y: 160, hidden: true, label: '' }, R4: { x: 310, y: 160, hidden: true, label: '' },
          A: { x: 30, y: 60, pos: 'n' }, P: { x: 30, y: 160, label: 'P', pos: 's' }, M: { x: 30 + (xs / L) * 260, y: 160 }, B: { x: 290, y: 160 },
        },
        segments: [
          { a: 'R1', b: 'R2', color: BLUE }, { a: 'R3', b: 'R4', color: BLUE },
          { a: 'A', b: 'M', dashed: true, color: RED }, { a: 'M', b: 'B', color: RED }, { a: 'A', b: 'P', label: `${d} km` },
        ],
        notes: [{ x: 230, y: 110, text: 'rivière' }, { x: 160, y: 192, text: `PB = ${L} km` }],
        caption: 'Le câble va de A à M sous l’eau, puis de M à B le long de la rive.',
      }
      return T('Le câble sous la rivière', numeric(`Une centrale A est sur une rive d'une rivière rectiligne large de ${d} km ; le village B est sur l'autre rive, à ${L} km en aval du point P situé juste en face de A. Le câble coûte ${c1} k€/km sous l'eau et ${c2} k€/km sur la rive. On le pose sous l'eau de A jusqu'à un point M de la rive (PM = x), puis le long de la rive jusqu'à B. Coût : C(x) = ${c1}√{x² + ${d * d}} + ${c2}(${L} − x). Pour quelle distance x (en km) le coût est-il minimal ?`, xs * mult, {
        explanation: `C′(x) = ${F(`${c1}x`, `√(x² + ${d * d})`)} − ${c2}. C′(x) = 0 ⇔ ${c1}x = ${c2}√(x² + ${d * d}) ⇔ ${c1 * c1}x² = ${c2 * c2}(x² + ${d * d}) ⇔ x² = ${F(c2 * c2 * d * d, c1 * c1 - c2 * c2)} ⇔ x = ${fmt(xs)} (C′ négative avant, positive après).`,
      }), free)
    },
  ],
]

export const CONTENT: SubjectContent | null = polishContent({ tiers, upgrades, age })
