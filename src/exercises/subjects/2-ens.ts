// Ensembles et logique (2nde) : ensembles de nombres ℕ ⊂ ℤ ⊂ 𝔻 ⊂ ℚ ⊂ ℝ, intervalles (écriture, intersection,
// réunion, appartenance), valeur absolue et distance, négation, réciproque, contre-exemple, « et / ou ».
import {
  F, choice, evalExpr, fmt, fraction, fracText, gcd, interval, numeric, parseExpr, parseNumber, pick, randInt,
  randNonZero, sameNumber, shuffle, variants, fresh, withMeta,
  type Exercise, type Interval, type Ladder, type SubjectContent, type Tiers,
} from '../utils'
import type { Figure } from '../figure'
import { cap, deuxPrenoms, prenom } from '../contexts'

// ── Aides locales (certaines servent aussi au sujet 2-ref) ───────────────
/** Relance le tirage tant qu'il ne convient pas (gen renvoie null / false). */
export function retry<R>(gen: () => R | null | undefined | false, tries = 3000): R {
  for (let i = 0; i < tries; i++) {
    const r = gen()
    if (r) return r
  }
  throw new Error('tirage impossible')
}
/** Problème titré, avec figure facultative. */
export const T = (title: string, ex: Exercise, figure?: Figure): Exercise => withMeta(ex, figure ? { title, figure } : { title })
/** Question Vrai / Faux. */
export const vf = (prompt: string, truth: boolean, explanation: string): Exercise =>
  choice(prompt, truth ? 'Vrai' : 'Faux', [truth ? 'Faux' : 'Vrai'], explanation)

const INF = Infinity
/** Intervalle avec, au besoin, l'écriture exacte de ses bornes (√7, 5/3…). */
export interface Iv extends Interval { loT?: string; hiT?: string }
export const iv = (lo: number, hi: number, loClosed: boolean, hiClosed: boolean, loT?: string, hiT?: string): Iv =>
  ({ lo, hi, loClosed: loClosed && lo !== -INF, hiClosed: hiClosed && hi !== INF, loT, hiT })
const bText = (v: number, t?: string) => (v === INF ? '+∞' : v === -INF ? '−∞' : t ?? fmt(v))
export const ivText = (I: Iv) => `${I.loClosed ? '[' : ']'}${bText(I.lo, I.loT)} ; ${bText(I.hi, I.hiT)}${I.hiClosed ? ']' : '['}`
export const unionText = (L: Iv[]) =>
  L.length === 0 ? '∅' : L.length === 1 && L[0].lo === -INF && L[0].hi === INF ? 'ℝ' : L.map(ivText).join(' ∪ ')

const clean = (raw: string) => raw.trim().replace(/[−–—]/g, '-').replace(/\s+/g, '')
const eqB = (a: number, b: number) => (Number.isFinite(a) && Number.isFinite(b) ? sameNumber(a, b) : a === b)
function parseBound(t: string): number {
  if (t === 'I' || t === '+I') return INF
  if (t === '-I') return -INF
  if (/[xI]/.test(t)) return NaN
  const n = parseExpr(t)
  if (!n) return NaN
  const v = evalExpr(n, 0)
  return Number.isFinite(v) ? v : NaN
}
/** Lit « ]−∞ ; −2] ∪ [√3 ; 5[ », « ℝ », « ∅ ». Renvoie null si illisible. */
export function parseUnion(raw: string): Iv[] | null {
  const s = clean(raw).replace(/^(x∈|S=)/i, '').replace(/∞|inf(ini)?/gi, 'I')
  if (/^(ℝ|R|]-I;\+?I\[)$/.test(s)) return [iv(-INF, INF, false, false)]
  if (s === '∅' || s === '{}' || s === 'Ø') return []
  const out: Iv[] = []
  for (const part of s.split(/∪|U|u/)) {
    const m = /^([[\]])(.+?);(.+?)([[\]])$/.exec(part)
    if (!m) return null
    const lo = parseBound(m[2]), hi = parseBound(m[3])
    if (Number.isNaN(lo) || Number.isNaN(hi) || lo > hi) return null
    out.push({ lo, hi, loClosed: m[1] === '[', hiClosed: m[4] === ']' })
  }
  return out
}
/** Trie et fusionne les intervalles qui se chevauchent ou se touchent. */
function merged(L: Iv[]): Iv[] {
  const s = [...L].sort((a, b) => a.lo - b.lo || Number(b.loClosed) - Number(a.loClosed))
  const out: Iv[] = []
  for (const J of s) {
    const cur = out[out.length - 1]
    if (cur && (J.lo < cur.hi - 1e-9 || (eqB(J.lo, cur.hi) && (cur.hiClosed || J.loClosed)))) {
      if (J.hi > cur.hi + 1e-9) { cur.hi = J.hi; cur.hiClosed = J.hiClosed } else if (eqB(J.hi, cur.hi)) cur.hiClosed ||= J.hiClosed
    } else out.push({ ...J })
  }
  return out
}
const sameUnion = (A: Iv[], B: Iv[], brackets = true) => {
  const a = merged(A), b = merged(B)
  return a.length === b.length && a.every((I, i) => eqB(I.lo, b[i].lo) && eqB(I.hi, b[i].hi)
    && (!brackets || (I.loClosed === b[i].loClosed && I.hiClosed === b[i].hiClosed)))
}
/** Réponse : un intervalle, une réunion d'intervalles, ℝ ou ∅ (bornes exactes acceptées : √7, 5/3…). */
export function unionEx(prompt: string, L: Iv[], explanation: string, inputHint = 'ex. ]−∞ ; −2] ∪ [3 ; +∞['): Exercise {
  return {
    prompt,
    kind: 'input',
    answer: unionText(L),
    explanation,
    inputHint,
    format: 'un intervalle ou une réunion d’intervalles, par exemple [−1 ; 4[ ou ]−∞ ; 2] ∪ [5 ; +∞[ (ℝ et ∅ sont acceptés)',
    keypad: ['[', ']', ';', '∪', '−∞', '+∞', '−', '√', '/', '∅', 'ℝ'],
    isValid: (v) => parseUnion(v) !== null,
    diagnose: (v) => {
      const U = parseUnion(v)
      return U && !sameUnion(U, L) && sameUnion(U, L, false) ? 'Les bornes sont justes : vérifie le sens des crochets.' : undefined
    },
    check: (v) => {
      const U = parseUnion(v)
      return !!U && sameUnion(U, L)
    },
  }
}
const inter2 = (a: Iv, b: Iv): Iv | null => {
  const lo = Math.max(a.lo, b.lo), hi = Math.min(a.hi, b.hi)
  const loClosed = (a.lo !== lo || a.loClosed) && (b.lo !== lo || b.loClosed)
  const hiClosed = (a.hi !== hi || a.hiClosed) && (b.hi !== hi || b.hiClosed)
  if (lo > hi || (lo === hi && !(loClosed && hiClosed))) return null
  return { lo, hi, loClosed, hiClosed }
}
const contains = (I: Iv, x: number) => (x > I.lo || (I.loClosed && x === I.lo)) && (x < I.hi || (I.hiClosed && x === I.hi))
/** Nombre d'entiers dans un intervalle borné. */
const intsIn = (I: Iv) => {
  let n = 0
  for (let k = Math.ceil(I.lo); k <= Math.floor(I.hi); k++) if (contains(I, k)) n++
  return n
}
const intList = (I: Iv) => {
  const out: number[] = []
  for (let k = Math.ceil(I.lo); k <= Math.floor(I.hi); k++) if (contains(I, k)) out.push(k)
  return out
}
/** |x − a| écrit proprement : |x − 3|, |x + 2|. */
const absX = (a: number, v = 'x') => (a === 0 ? `|${v}|` : a < 0 ? `|${v} + ${fmt(-a)}|` : `|${v} − ${fmt(a)}|`)
const rnd = (a: number, b: number) => randInt(a, b)

// ── Ensembles de nombres ────────────────────────────────────────────────
const SETS = ['ℕ', 'ℤ', '𝔻', 'ℚ', 'ℝ'] as const
type SetName = (typeof SETS)[number]
const RANK: Record<SetName, number> = { 'ℕ': 0, 'ℤ': 1, '𝔻': 2, 'ℚ': 3, 'ℝ': 4 }
const SET_WORD: Record<SetName, string> = {
  'ℕ': 'entier naturel', 'ℤ': 'entier relatif', '𝔻': 'nombre décimal', 'ℚ': 'nombre rationnel', 'ℝ': 'nombre réel',
}
function readSet(raw: string): SetName | null {
  const s = raw.trim().toUpperCase()
  const map: Record<string, SetName> = { N: 'ℕ', Z: 'ℤ', D: '𝔻', Q: 'ℚ', R: 'ℝ', 'ℕ': 'ℕ', 'ℤ': 'ℤ', '𝔻': '𝔻', 'ℚ': 'ℚ', 'ℝ': 'ℝ' }
  return map[s] ?? null
}
function setEx(prompt: string, ans: SetName, explanation: string): Exercise {
  return {
    prompt, kind: 'input', answer: ans, explanation,
    inputHint: 'ℕ, ℤ, 𝔻, ℚ ou ℝ',
    format: 'le nom d’un ensemble : ℕ, ℤ, 𝔻, ℚ ou ℝ (on peut taper N, Z, D, Q ou R)',
    keypad: [...SETS],
    isValid: (v) => readSet(v) !== null,
    check: (v) => readSet(v) === ans,
  }
}
interface Num { t: string; set: SetName; why: string }
const isDecDen = (q: number) => { while (q % 2 === 0) q /= 2; while (q % 5 === 0) q /= 5; return q === 1 }
/** Un nombre écrit sous une forme qui ne trahit pas tout de suite son ensemble. */
function numOf(set: SetName): Num {
  const s = pick([1, -1])
  switch (set) {
    case 'ℕ': return pick([
      () => { const n = rnd(2, 9), k = rnd(2, 6); return { t: F(n * k, k), set, why: `${F(n * k, k)} = ${n}, un entier naturel` } },
      () => { const n = rnd(2, 12); return { t: `√${n * n}`, set, why: `√${n * n} = ${n}, un entier naturel` } },
      () => { const n = rnd(2, 9) * 2; return { t: `2,5 × ${n}`, set, why: `2,5 × ${n} = ${fmt(2.5 * n)}, un entier naturel` } },
    ])()
    case 'ℤ': return pick([
      () => { const n = rnd(2, 9), k = rnd(2, 6); return { t: `−${F(n * k, k)}`, set, why: `−${F(n * k, k)} = −${n}, un entier négatif : il est dans ℤ mais pas dans ℕ` } },
      () => { const n = rnd(2, 12); return { t: `−√${n * n}`, set, why: `−√${n * n} = −${n}, un entier négatif : il est dans ℤ mais pas dans ℕ` } },
      () => { const a = rnd(2, 9), b = a + rnd(2, 9); return { t: `${a} − ${b}`, set, why: `${a} − ${b} = −${fmt(b - a)}, un entier négatif : il est dans ℤ mais pas dans ℕ` } },
    ])()
    case '𝔻': return pick([
      () => retry(() => {
        const q = pick([2, 4, 5, 8, 20, 25]), p = rnd(1, 3 * q)
        if (gcd(p, q) !== 1) return null
        const t = `${s < 0 ? '−' : ''}${F(p, q)}`
        return { t, set, why: `${t} = ${fmt((s * p) / q)} : écriture décimale finie, ce n'est pas un entier` }
      }),
      () => { const m = pick([1, 3, 7, 9, 11, 13]); return { t: `√${fmt((m * m) / 100)}`, set, why: `√${fmt((m * m) / 100)} = ${fmt(m / 10)}, un décimal non entier` } },
      () => { const d = pick([11, 13, 17, 19, 21, 23, 27, 29, 31, 33, 37, 39, 41, 43, 47, 49, 51, 53]); return { t: `${F(d, 100)} × ${s < 0 ? '(−4)' : '4'}`, set, why: `cela fait ${fmt((s * 4 * d) / 100)}, un décimal non entier` } },
    ])()
    case 'ℚ': return retry(() => {
      const q = pick([3, 6, 7, 9, 11, 12, 15]), p = rnd(1, 2 * q)
      if (gcd(p, q) !== 1) return null
      const t = `${s < 0 ? '−' : ''}${F(p, q)}`
      return { t, set, why: `${t} est un quotient d'entiers irréductible dont le dénominateur ${q} contient un facteur autre que 2 et 5 : son écriture décimale est infinie, il est dans ℚ mais pas dans 𝔻` }
    })
    default: return pick([
      () => { const m = pick([2, 3, 5, 6, 7, 8, 10, 11, 12, 13, 15, 17, 18, 20]); return { t: `√${m}`, set: 'ℝ' as SetName, why: `${m} n'est pas un carré parfait, donc √${m} est irrationnel` } },
      () => ({ t: 'π', set: 'ℝ' as SetName, why: 'π est irrationnel' }),
      () => { const m = pick([2, 3, 5]), a = rnd(1, 5); return { t: `${a} + √${m}`, set: 'ℝ' as SetName, why: `√${m} est irrationnel, donc ${a} + √${m} aussi` } },
      () => { const k = rnd(2, 4); return { t: F('π', k), set: 'ℝ' as SetName, why: `π est irrationnel, donc ${F('π', k)} aussi` } },
    ])()
  }
}
const randomSet = () => pick(SETS)

// ── Droite graduée ──────────────────────────────────────────────────────
interface Span { lo: number; hi: number; loClosed: boolean; hiClosed: boolean; color?: string; lift?: number }
const RED = '#b8362f'
const BLUE = '#3f6fb0'
/** Droite graduée de min à max, intervalles colorés (crochets dessinés) et points nommés. */
function lineFig(min: number, max: number, o: { spans?: Span[]; marks?: { x: number; label: string }[]; labelEvery?: number; caption?: string } = {}): Figure {
  const w = 320, h = 104, y0 = 60, L = 26, R = w - 26
  const X = (v: number) => L + ((v - min) / (max - min)) * (R - L)
  const fig: Figure = { w, h, points: {}, segments: [], curves: [], notes: [], caption: o.caption ?? '' }
  const P = fig.points
  P._a = { x: 8, y: y0, hidden: true, label: '' }
  P._b = { x: w - 8, y: y0, hidden: true, label: '' }
  fig.segments!.push({ a: '_a', b: '_b', head: true })
  const every = o.labelEvery ?? (max - min <= 12 ? 1 : max - min <= 24 ? 2 : 5)
  for (let k = Math.ceil(min); k <= max; k++) {
    P[`_t${k}`] = { x: X(k), y: y0 - 4, hidden: true, label: '' }
    P[`_u${k}`] = { x: X(k), y: y0 + 4, hidden: true, label: '' }
    fig.segments!.push({ a: `_t${k}`, b: `_u${k}` })
    if (k % every === 0) fig.notes!.push({ x: X(k), y: y0 + 20, text: fmt(k) })
  }
  for (const sp of o.spans ?? []) {
    const y = y0 - (sp.lift ? 10 + 14 * sp.lift : 0), c = sp.color ?? RED
    const xa = sp.lo === -INF ? 8 : X(sp.lo), xb = sp.hi === INF ? w - 8 : X(sp.hi)
    fig.curves!.push({ pts: [[xa, y], [xb, y]], color: c, width: 4 })
    const bracket = (x: number, right: boolean) => {
      const d = right ? 5 : -5
      fig.curves!.push({ pts: [[x + d, y - 8], [x, y - 8], [x, y + 8], [x + d, y + 8]], color: c, width: 2.4 })
    }
    if (sp.lo !== -INF) bracket(xa, sp.loClosed)
    if (sp.hi !== INF) bracket(xb, !sp.hiClosed)
  }
  for (const m of o.marks ?? []) P[m.label] = { x: X(m.x), y: y0, label: m.label, pos: 'n' }
  return fig
}

// ── Énoncés logiques paramétrés ─────────────────────────────────────────
interface Impl { p: string; q: string; nq: string; np: string; recip: boolean; why: string }
function implication(): Impl {
  const a = rnd(2, 9)
  return pick<() => Impl>([
    () => ({ p: `x = ${a}`, q: `x² = ${a * a}`, np: `x ≠ ${a}`, nq: `x² ≠ ${a * a}`, recip: false, why: `x = −${a} vérifie x² = ${a * a} sans que x = ${a}` }),
    () => { const b = a - rnd(1, 5); return { p: `x > ${a}`, q: `x > ${fmt(b)}`, np: `x ≤ ${a}`, nq: `x ≤ ${fmt(b)}`, recip: false, why: `x = ${fmt((a + b) / 2)} vérifie x > ${fmt(b)} mais pas x > ${a}` } },
    () => { const b = rnd(1, 9), x = rnd(2, 9); return { p: `2x + ${b} = ${2 * x + b}`, q: `x = ${x}`, np: `2x + ${b} ≠ ${2 * x + b}`, nq: `x ≠ ${x}`, recip: true, why: `si x = ${x}, alors 2x + ${b} = ${2 * x + b} : les deux énoncés sont équivalents` } },
    () => { const r = rnd(1, 4); return { p: `${absX(a)} ≤ ${r}`, q: `x ∈ [${fmt(a - r)} ; ${fmt(a + r)}]`, np: `${absX(a)} > ${r}`, nq: `x ∉ [${fmt(a - r)} ; ${fmt(a + r)}]`, recip: true, why: `${absX(a)} ≤ ${r} signifie exactement que x est à une distance au plus ${r} de ${a}, c'est-à-dire x ∈ [${fmt(a - r)} ; ${fmt(a + r)}]` } },
    () => { const k = pick([2, 3, 5]); return { p: `n est un multiple de ${2 * k}`, q: `n est un multiple de ${k}`, np: `n n'est pas un multiple de ${2 * k}`, nq: `n n'est pas un multiple de ${k}`, recip: false, why: `n = ${k} est un multiple de ${k} mais pas de ${2 * k}` } },
    () => ({ p: `x ∈ ℕ`, q: `x ∈ ℤ`, np: `x ∉ ℕ`, nq: `x ∉ ℤ`, recip: false, why: `−${a} est dans ℤ mais pas dans ℕ` }),
    () => { const k = rnd(2, 7); return { p: `x = ${a}`, q: `${k}x = ${k * a}`, np: `x ≠ ${a}`, nq: `${k}x ≠ ${k * a}`, recip: true, why: `${k}x = ${k * a} donne x = ${a} en divisant par ${k}` } },
  ])()
}

// ── Entraînement ────────────────────────────────────────────────────────
const tiers: Tiers = [
  // Palier 1 : appartenance, plus petit ensemble, inégalité ↔ intervalle
  [
    // Appartenance à un ensemble de nombres
    variants(
      () => {
        const x = numOf(randomSet()), E = randomSet(), ok = RANK[x.set] <= RANK[E]
        return vf(`Vrai ou faux : ${x.t} ∈ ${E}.`, ok, `${cap(x.why)}. Le plus petit ensemble qui le contient est ${x.set} ; comme ℕ ⊂ ℤ ⊂ 𝔻 ⊂ ℚ ⊂ ℝ, ${ok ? `il appartient bien à ${E}` : `il n'appartient pas à ${E}`}.`)
      },
      () => {
        const x = numOf(randomSet()), E = randomSet(), ok = RANK[x.set] > RANK[E]
        return vf(`Vrai ou faux : ${x.t} ∉ ${E}.`, ok, `${cap(x.why)}. Le plus petit ensemble qui le contient est ${x.set}, donc ${RANK[x.set] <= RANK[E] ? `il appartient à ${E} : l'affirmation « ∉ » est fausse` : `il n'appartient pas à ${E}`}.`)
      },
      () => {
        const E = pick(['ℤ', '𝔻', 'ℚ'] as SetName[])
        const nums = shuffle(SETS.map((s) => numOf(s)))
        const n = nums.filter((x) => RANK[x.set] <= RANK[E]).length
        return numeric(`Parmi les nombres ${nums.map((x) => x.t).join(' ; ')}, combien appartiennent à ${E} ?`, n, {
          explanation: nums.map((x) => `${x.t} : ${x.set}`).join(' ; ') + `. Ceux qui sont dans ${E} sont ceux dont le plus petit ensemble est inclus dans ${E} : il y en a ${n}.`,
        })
      },
      () => {
        const E: SetName = pick(['ℤ', '𝔻', 'ℚ'] as SetName[]), x = numOf(pick(SETS)), ok = RANK[x.set] <= RANK[E]
        return vf(`Vrai ou faux : ${x.t} est un ${SET_WORD[E]}.`, ok, `${cap(x.why)}. Son plus petit ensemble est ${x.set}, donc ${ok ? `c'est bien un ${SET_WORD[E]}` : `ce n'est pas un ${SET_WORD[E]}`}.`)
      },
    ),
    // Plus petit ensemble contenant un nombre
    variants(
      () => { const x = numOf(randomSet()); return setEx(`Quel est le plus petit ensemble de nombres (ℕ, ℤ, 𝔻, ℚ ou ℝ) qui contient ${x.t} ?`, x.set, `${cap(x.why)} : le plus petit ensemble est ${x.set}.`) },
      () => { const x = numOf(randomSet()); return setEx(`Complète avec le plus petit ensemble possible : ${x.t} ∈ …`, x.set, `${cap(x.why)} : ${x.t} ∈ ${x.set}.`) },
      () => { const x = numOf(randomSet()); return setEx(`${prenom()} range le nombre ${x.t} dans le plus petit des ensembles ℕ, ℤ, 𝔻, ℚ, ℝ qui le contient. Lequel ?`, x.set, `${cap(x.why)} : on le range dans ${x.set}.`) },
      () => { const x = numOf(randomSet()); return setEx(`Simplifie d'abord ${x.t}, puis donne le plus petit ensemble de nombres auquel il appartient.`, x.set, `${cap(x.why)} : c'est ${x.set}.`) },
    ),
    // Inégalités → intervalle
    variants(
      () => {
        const a = randNonZero(-9, 9), r = pick(['<', '≤', '>', '≥'] as const)
        const I = r === '<' ? iv(-INF, a, false, false) : r === '≤' ? iv(-INF, a, false, true) : r === '>' ? iv(a, INF, false, false) : iv(a, INF, true, false)
        return interval(`Écris sous forme d'intervalle l'ensemble des réels x tels que x ${r} ${fmt(a)}.`, I, { explanation: `x ${r} ${fmt(a)} ⟺ x ∈ ${ivText(I)} (crochet ${r === '≤' || r === '≥' ? 'fermé car ' + fmt(a) + ' est inclus' : 'ouvert car ' + fmt(a) + ' est exclu'} ; toujours ouvert du côté de l'infini).` })
      },
      () => {
        const a = rnd(-9, 4), b = a + rnd(2, 9), lc = pick([true, false]), hc = pick([true, false])
        const I = iv(a, b, lc, hc)
        return interval(`Écris sous forme d'intervalle : ${fmt(a)} ${lc ? '≤' : '<'} x ${hc ? '≤' : '<'} ${fmt(b)}.`, I, { explanation: `Les réels compris entre ${fmt(a)} (${lc ? 'inclus' : 'exclu'}) et ${fmt(b)} (${hc ? 'inclus' : 'exclu'}) forment ${ivText(I)}.` })
      },
      () => {
        const a = randNonZero(-9, 9)
        const [txt, I] = pick<[string, Iv]>([
          [`strictement inférieur à ${fmt(a)}`, iv(-INF, a, false, false)], [`au plus égal à ${fmt(a)}`, iv(-INF, a, false, true)],
          [`strictement supérieur à ${fmt(a)}`, iv(a, INF, false, false)], [`au moins égal à ${fmt(a)}`, iv(a, INF, true, false)],
        ])
        return interval(`x est un réel ${txt}. Écris l'ensemble des valeurs possibles de x sous forme d'intervalle.`, I, { explanation: `« ${txt} » se traduit par ${ivText(I)}.` })
      },
      () => {
        const a = rnd(-8, 3), b = a + rnd(2, 8), inc = pick([true, false])
        const I = iv(a, b, inc, inc)
        return interval(`x est compris entre ${fmt(a)} et ${fmt(b)}, bornes ${inc ? 'incluses' : 'exclues'}. Écris l'intervalle correspondant.`, I, { explanation: `Bornes ${inc ? 'incluses : crochets fermés' : 'exclues : crochets ouverts'}, d'où ${ivText(I)}.` })
      },
    ),
    // Appartenance à un intervalle
    variants(
      () => {
        const a = rnd(-8, 3), b = a + rnd(3, 8), I = iv(a, b, pick([true, false]), pick([true, false]))
        const x = pick([a, b, a + 1, b - 1, a - 1, b + 1])
        const ok = contains(I, x)
        return vf(`Vrai ou faux : ${fmt(x)} ∈ ${ivText(I)}.`, ok, `${ivText(I)} contient les réels entre ${fmt(a)} et ${fmt(b)}${x === a || x === b ? ` ; le crochet en ${fmt(x)} est ${ok ? 'fermé : la borne est incluse' : 'ouvert : la borne est exclue'}` : ` ; ${fmt(x)} est ${ok ? 'bien entre les bornes' : 'en dehors'}`}.`)
      },
      () => {
        const a = rnd(-8, 3), b = a + rnd(3, 8), I = iv(a, b, pick([true, false]), pick([true, false]))
        const x = pick([a, b, a + 2, b + 2])
        const ok = !contains(I, x)
        return vf(`Vrai ou faux : ${fmt(x)} ∉ ${ivText(I)}.`, ok, `${fmt(x)} ${contains(I, x) ? 'appartient' : 'n’appartient pas'} à ${ivText(I)}${x === a || x === b ? ` (crochet ${contains(I, x) ? 'fermé' : 'ouvert'} en ${fmt(x)})` : ''}, donc l'affirmation est ${ok ? 'vraie' : 'fausse'}.`)
      },
      () => {
        const a = rnd(-6, 6), I = iv(a, a + rnd(2, 6), true, pick([true, false]))
        const x = pick([a - 0.01, a + 0.01, a - 0.1, a + 0.5])
        const ok = contains(I, x)
        return vf(`Vrai ou faux : le nombre ${fmt(x)} est dans l'intervalle ${ivText(I)}.`, ok, `${fmt(x)} est ${x < a ? `plus petit que ${fmt(a)}, la plus petite valeur de l'intervalle : il n'y est pas` : `entre les deux bornes : il y est`}.`)
      },
      () => {
        const a = randNonZero(-9, 9), right = pick([true, false]), closed = pick([true, false])
        const I = right ? iv(a, INF, closed, false) : iv(-INF, a, false, closed)
        const x = pick([a, a + rnd(1, 20), a - rnd(1, 20)])
        const ok = contains(I, x)
        return vf(`Vrai ou faux : ${fmt(x)} ∈ ${ivText(I)}.`, ok, `${ivText(I)} contient les réels ${right ? 'supérieurs' : 'inférieurs'} à ${fmt(a)}, ${fmt(a)} ${closed ? 'compris' : 'exclu'}. ${fmt(x)} ${ok ? 'en fait partie' : 'n’en fait pas partie'}.`)
      },
    ),
  ],
  // Palier 2 : entiers d'un intervalle, droite graduée, intersection, réunion
  [
    // Compter les entiers d'un intervalle
    fresh(variants(
      () => { const a = rnd(-9, 3), b = a + rnd(3, 9), I = iv(a, b, true, true); return numeric(`Combien d'entiers relatifs appartiennent à ${ivText(I)} ?`, intsIn(I), { explanation: `Ce sont ${intList(I).map(fmt).join(' ; ')} : il y en a ${intsIn(I)}.` }) },
      () => { const a = rnd(-9, 3), b = a + rnd(3, 9), I = iv(a, b, false, false); return numeric(`Combien de nombres entiers x vérifient ${fmt(a)} < x < ${fmt(b)} ?`, intsIn(I), { explanation: `Les bornes sont exclues : ${intList(I).map(fmt).join(' ; ')}, soit ${intsIn(I)} entiers.` }) },
      () => { const a = rnd(-9, 3), b = a + rnd(3, 9), I = iv(a, b, pick([true, false]), pick([true, false])); return numeric(`Combien d'entiers contient l'intervalle ${ivText(I)} ? Attention aux crochets.`, intsIn(I), { explanation: `On garde ${intList(I).map(fmt).join(' ; ')} : ${intsIn(I)} entiers.` }) },
      () => { const a = rnd(-9, 2) + pick([0.3, 0.5, 0.8]), b = a + rnd(3, 8) + pick([0.1, 0.4]), I = iv(a, b, true, true); return numeric(`Combien d'entiers appartiennent à ${ivText(I)} ?`, intsIn(I), { explanation: `Les entiers entre ${fmt(a)} et ${fmt(b)} sont ${intList(I).map(fmt).join(' ; ')} : ${intsIn(I)}.` }) },
      () => { const a = rnd(-6, -1), b = rnd(3, 9), I = iv(a, b, pick([true, false]), pick([true, false])), J = iv(Math.max(0, a), b, true, I.hiClosed); return numeric(`Combien d'entiers naturels appartiennent à ${ivText(I)} ?`, intsIn(J), { explanation: `Les entiers naturels sont positifs : on garde ${intList(J).map(fmt).join(' ; ')}, soit ${intsIn(J)}.` }) },
    )),
    // Droite graduée → intervalle
    variants(
      () => { const a = rnd(-6, 1), b = a + rnd(2, 6), I = iv(a, b, pick([true, false]), pick([true, false])); return withMeta(interval(`On note ${pick(['I', 'J', 'K', 'E'])} l'ensemble représenté en rouge sur la droite graduée. Écris-le sous forme d'intervalle.`, I, { explanation: `Le trait va de ${fmt(a)} à ${fmt(b)} ; un crochet tourné vers le trait signifie « borne incluse », tourné vers l'extérieur « borne exclue ». C'est ${ivText(I)}.` }), { figure: lineFig(a - 2, b + 2, { spans: [I] }) }) },
      () => { const a = rnd(-5, 5), I = iv(a, INF, pick([true, false]), false); return withMeta(interval(`La partie colorée de la droite représente les solutions ${pick(['d’une inéquation', 'd’un problème', 'd’une condition sur x', 'd’une énigme'])}. Écris cet ensemble sous forme d’intervalle.`, I, { explanation: `Le trait part de ${fmt(a)} (${I.loClosed ? 'inclus' : 'exclu'}) et continue vers la droite sans fin : ${ivText(I)}.` }), { figure: lineFig(a - 4, a + 5, { spans: [I] }) }) },
      () => { const a = rnd(-5, 5), I = iv(-INF, a, false, pick([true, false])); return withMeta(interval(`Donne l’intervalle ${pick(['I', 'J', 'K', 'E'])} colorié sur la droite graduée.`, I, { explanation: `Le trait part de la gauche sans fin et s'arrête en ${fmt(a)} (${I.hiClosed ? 'inclus' : 'exclu'}) : ${ivText(I)}.` }), { figure: lineFig(a - 5, a + 4, { spans: [I] }) }) },
      () => { const a = rnd(-8, -1) * 2, b = a + rnd(3, 8) * 2, I = iv(a, b, pick([true, false]), pick([true, false])); return withMeta(interval(`Sur cette droite graduée, ${pick(['lis', 'écris', 'donne'])} l’intervalle ${pick(['I', 'J', 'K', 'E'])} représenté en rouge.`, I, { explanation: `Les bornes sont ${fmt(a)} et ${fmt(b)} ; d'après les crochets, c'est ${ivText(I)}.` }), { figure: lineFig(a - 3, b + 3, { spans: [I], labelEvery: 2 }) }) },
    ),
    // Intersection
    variants(
      () => retry(() => { const a = rnd(-8, 2), b = a + rnd(3, 8), c = rnd(a + 1, b - 1), d = b + rnd(1, 5); const I = iv(a, b, pick([true, false]), pick([true, false])), J = iv(c, d, pick([true, false]), pick([true, false])); const K = inter2(I, J); return K && interval(`Détermine ${ivText(I)} ∩ ${ivText(J)}.`, K, { explanation: `On garde les réels qui sont dans les deux intervalles : de la plus grande des bornes de gauche, ${fmt(c)}, à la plus petite des bornes de droite, ${fmt(b)} ; d'où ${ivText(K)}.` }) }),
      () => retry(() => { const a = rnd(-8, 2), b = a + rnd(3, 8), c = rnd(a + 1, b - 1), right = pick([true, false]); const I = iv(a, b, pick([true, false]), pick([true, false])), J = right ? iv(c, INF, pick([true, false]), false) : iv(-INF, c, false, pick([true, false])); const K = inter2(I, J); return K && interval(`Quel est l'ensemble des réels qui appartiennent à la fois à ${ivText(I)} et à ${ivText(J)} ?`, K, { explanation: `Il s'agit de l'intersection : ${ivText(I)} ∩ ${ivText(J)} = ${ivText(K)}.` }) }),
      () => retry(() => { const a = rnd(-8, 0), b = a + rnd(6, 10), c = a + rnd(1, 3), d = b - rnd(1, 3); const I = iv(a, b, true, pick([true, false])), J = iv(c, d, pick([true, false]), pick([true, false])); const K = inter2(I, J); return K && c < d && interval(`On donne I = ${ivText(I)} et J = ${ivText(J)}. Écris I ∩ J.`, K, { explanation: `J est contenu dans I, donc I ∩ J = J = ${ivText(K)}.` }) }),
      () => retry(() => { const a = rnd(-7, 2), b = a + rnd(2, 7); const I = iv(a, INF, pick([true, false]), false), J = iv(-INF, b, false, pick([true, false])); const K = inter2(I, J)!; return interval(`Détermine ${ivText(I)} ∩ ${ivText(J)}.`, K, { explanation: `Un réel des deux intervalles est à la fois ${I.loClosed ? '≥' : '>'} ${fmt(a)} et ${J.hiClosed ? '≤' : '<'} ${fmt(b)} : ${ivText(K)}.` }) }),
    ),
    // Réunion d'intervalles qui se chevauchent
    variants(
      () => retry(() => { const a = rnd(-8, 2), b = a + rnd(3, 8), c = rnd(a + 1, b - 1), d = b + rnd(1, 5); const I = iv(a, b, pick([true, false]), pick([true, false])), J = iv(c, d, pick([true, false]), pick([true, false])); const K = iv(a, d, I.loClosed, J.hiClosed); return interval(`Écris ${ivText(I)} ∪ ${ivText(J)} sous forme d'un seul intervalle.`, K, { explanation: `Les deux intervalles se chevauchent : leur réunion va de ${fmt(a)} à ${fmt(d)}, avec les crochets des bornes extrêmes : ${ivText(K)}.` }) }),
      () => retry(() => { const a = rnd(-8, 2), b = a + rnd(3, 8), c = rnd(a + 1, b - 1); const I = iv(a, b, pick([true, false]), pick([true, false])), J = iv(c, INF, pick([true, false]), false); const K = iv(a, INF, I.loClosed, false); return interval(`Quel est l'ensemble des réels qui appartiennent à ${ivText(I)} ou à ${ivText(J)} ?`, K, { explanation: `« ou » : c'est la réunion. Les intervalles se chevauchent, d'où ${ivText(K)}.` }) }),
      () => retry(() => { const a = rnd(-8, 0), b = a + rnd(6, 10), c = a + rnd(1, 3), d = b - rnd(1, 3); const I = iv(a, b, pick([true, false]), pick([true, false])), J = iv(c, d, pick([true, false]), pick([true, false])); return c < d && interval(`On donne I = ${ivText(I)} et J = ${ivText(J)}. Écris I ∪ J.`, I, { explanation: `J est contenu dans I, donc I ∪ J = I = ${ivText(I)}.` }) }),
      () => { const a = rnd(-7, 3), b = a + rnd(1, 4); const I = iv(-INF, b, false, pick([true, false])), J = iv(a, INF, pick([true, false]), false); return unionEx(`Détermine ${ivText(I)} ∪ ${ivText(J)}.`, [iv(-INF, INF, false, false)], `Tout réel est soit ${I.hiClosed ? '≤' : '<'} ${fmt(b)}, soit ${J.loClosed ? '≥' : '>'} ${fmt(a)} (car ${fmt(a)} < ${fmt(b)}) : la réunion est ℝ = ]−∞ ; +∞[.`, 'un intervalle, ou ℝ') },
    ),
  ],
  // Palier 3 : valeur absolue, |x − a| ≤ r, centre et rayon, négation
  [
    // Valeur absolue et distance
    fresh(variants(
      () => { const a = randNonZero(-9, 9), b = randNonZero(-9, 9); return numeric(`Calcule |${fmt(a)} − ${b < 0 ? `(${fmt(b)})` : fmt(b)}|.`, Math.abs(a - b), { explanation: `${fmt(a)} − ${b < 0 ? `(${fmt(b)})` : fmt(b)} = ${fmt(a - b)}, et |${fmt(a - b)}| = ${fmt(Math.abs(a - b))}.` }) },
      () => { const a = rnd(-12, 12), b = retry(() => { const v = rnd(-12, 12); return v !== a ? v : null }) ; return numeric(`Sur une droite graduée, A a pour abscisse ${fmt(a)} et B a pour abscisse ${fmt(b)}. Quelle est la distance AB ?`, Math.abs(a - b), { explanation: `AB = |${fmt(b)} − ${a < 0 ? `(${fmt(a)})` : fmt(a)}| = |${fmt(b - a)}| = ${Math.abs(a - b)}.` }) },
      () => { const a = randNonZero(-9, 9), x = rnd(-9, 9); return numeric(`On pose x = ${fmt(x)}. Calcule ${absX(a)}.`, Math.abs(x - a), { explanation: `${absX(a).replace('x', fmt(x))} = |${fmt(x - a)}| = ${fmt(Math.abs(x - a))}.` }) },
      () => { const a = rnd(2, 9) + 0.5, b = rnd(2, 9); return numeric(`Calcule |−${fmt(a)}| − |${fmt(b)} − ${fmt(2 * b)}|.`, a - b, { explanation: `|−${fmt(a)}| = ${fmt(a)} et |${fmt(b)} − ${fmt(2 * b)}| = |−${b}| = ${b}, donc le résultat est ${fmt(a)} − ${b} = ${fmt(a - b)}.` }) },
      () => { const a = rnd(-15, -1), b = rnd(1, 15); return numeric(`La température est passée de ${fmt(a)} °C la nuit à ${fmt(b)} °C l'après-midi. Quel est l'écart de température (la distance entre ces deux nombres) ?`, b - a, { explanation: `|${fmt(b)} − (${fmt(a)})| = ${fmt(b - a)} °C.` }) },
    )),
    // |x − a| ≤ r → intervalle
    variants(
      () => { const a = randNonZero(-8, 8), r = rnd(1, 6), I = iv(a - r, a + r, true, true); return interval(`Écris sous forme d'intervalle l'ensemble des réels x tels que ${absX(a)} ≤ ${r}.`, I, { explanation: `${absX(a)} ≤ ${r} : x est à une distance au plus ${r} de ${fmt(a)}, donc ${fmt(a - r)} ≤ x ≤ ${fmt(a + r)}, soit ${ivText(I)}.` }) },
      () => { const a = randNonZero(-8, 8), r = rnd(1, 6), I = iv(a - r, a + r, false, false); return interval(`Résous ${absX(a)} < ${r} : donne l'ensemble des solutions sous forme d'intervalle.`, I, { explanation: `La distance entre x et ${fmt(a)} est strictement inférieure à ${r} : ${fmt(a - r)} < x < ${fmt(a + r)}, soit ${ivText(I)}.` }) },
      () => { const a = randNonZero(-8, 8), r = rnd(1, 6), I = iv(a - r, a + r, true, true); return interval(`La distance entre le réel x et ${fmt(a)} est inférieure ou égale à ${r}. À quel intervalle x appartient-il ?`, I, { explanation: `On part de ${fmt(a)} et on s'écarte d'au plus ${r} de chaque côté : ${ivText(I)}.` }) },
      () => { const a = randNonZero(-6, 6) + 0.5, r = rnd(1, 4) + 0.5, I = iv(a - r, a + r, true, true); return interval(`Écris sous forme d'intervalle : ${absX(a)} ≤ ${fmt(r)}.`, I, { explanation: `${fmt(a)} − ${fmt(r)} = ${fmt(a - r)} et ${fmt(a)} + ${fmt(r)} = ${fmt(a + r)}, d'où ${ivText(I)}.` }) },
    ),
    // Intervalle → centre et rayon
    fresh(variants(
      () => { const c = randNonZero(-8, 8), r = rnd(1, 7); return numeric(`L'intervalle [${fmt(c - r)} ; ${fmt(c + r)}] est l'ensemble des x tels que |x − c| ≤ r. Quel est son centre c ?`, c, { explanation: `Le centre est le milieu de ${fmt(c - r)} et ${fmt(c + r)} : c'est ${fmt(c)} (on s'écarte de ${r} de chaque côté).` }) },
      () => { const c = randNonZero(-8, 8), r = rnd(1, 7); return numeric(`L'intervalle [${fmt(c - r)} ; ${fmt(c + r)}] s'écrit |x − c| ≤ r. Quel est son rayon r ?`, r, { explanation: `Le rayon est la demi-longueur : (${fmt(c + r)} − ${c - r < 0 ? `(${fmt(c - r)})` : fmt(c - r)}) ÷ 2 = ${r}.` }) },
      () => { const c = randNonZero(-6, 6) + 0.5, r = rnd(1, 5) + 0.5; return numeric(`Quel est le centre de l'intervalle ]${fmt(c - r)} ; ${fmt(c + r)}[ ?`, c, { explanation: `Le centre est le milieu des bornes ${fmt(c - r)} et ${fmt(c + r)} : ${fmt(c)}.` }) },
      () => { const c = randNonZero(-8, 8), r = rnd(2, 9); return numeric(`On écrit [${fmt(c - r)} ; ${fmt(c + r)}] sous la forme « |x − c| ≤ r ». Calcule c + r.`, c + r, { explanation: `c est le milieu de ${fmt(c - r)} et ${fmt(c + r)}, soit ${fmt(c)}, et r = ${r}, donc c + r = ${fmt(c + r)} (c'est la borne de droite !).` }) },
    )),
    // Négations
    variants(
      () => { const a = randNonZero(-9, 9), [r, n, d1, d2] = pick([['>', '≤', '<', '≥'], ['≥', '<', '≤', '>'], ['<', '≥', '>', '≤'], ['≤', '>', '≥', '<']]); return choice(`Quelle est la négation de « x ${r} ${fmt(a)} » ?`, `x ${n} ${fmt(a)}`, [`x ${d1} ${fmt(a)}`, `x ${d2} ${fmt(a)}`, `x ${r} ${fmt(-a)}`], `Le contraire de « x ${r} ${fmt(a)} » est « x ${n} ${fmt(a)} » : attention au cas d'égalité.`) },
      () => { const a = rnd(-8, 2), b = a + rnd(2, 7); return choice(`Quelle est la négation de « x ≥ ${fmt(a)} et x < ${fmt(b)} » ?`, `x < ${fmt(a)} ou x ≥ ${fmt(b)}`, [`x < ${fmt(a)} et x ≥ ${fmt(b)}`, `x ≤ ${fmt(a)} ou x > ${fmt(b)}`, `x > ${fmt(a)} ou x ≤ ${fmt(b)}`], `La négation de « A et B » est « non A ou non B » : x < ${fmt(a)} ou x ≥ ${fmt(b)}.`) },
      () => {
        const it = pick([
          { all: 'Tous les soldats de la caserne ont une épée', neg: 'Au moins un soldat de la caserne n’a pas d’épée', d: ['Aucun soldat de la caserne n’a d’épée', 'Au moins un soldat de la caserne a une épée', 'Tous les soldats de la caserne ont un bouclier'] },
          { all: 'Tous les archers du camp ont un arc', neg: 'Au moins un archer du camp n’a pas d’arc', d: ['Aucun archer du camp n’a d’arc', 'Au moins un archer du camp a un arc', 'Tous les archers du camp ont deux arcs'] },
          { all: 'Tous les élèves de la classe ont une calculatrice', neg: 'Au moins un élève de la classe n’a pas de calculatrice', d: ['Aucun élève de la classe n’a de calculatrice', 'Au moins un élève de la classe a une calculatrice', 'Un seul élève de la classe n’a pas de calculatrice'] },
          { all: 'Tous les marchands de la foire ont payé la taxe', neg: 'Au moins un marchand de la foire n’a pas payé la taxe', d: ['Aucun marchand de la foire n’a payé la taxe', 'Au moins un marchand de la foire a payé la taxe', 'Un seul marchand de la foire n’a pas payé la taxe'] },
          { all: 'Il existe un chevalier qui n’a jamais perdu de tournoi', neg: 'Tous les chevaliers ont déjà perdu au moins un tournoi', d: ['Il existe un chevalier qui a déjà perdu un tournoi', 'Aucun chevalier n’a jamais perdu de tournoi', 'Un seul chevalier a déjà perdu un tournoi'] },
        ])
        return choice(`Quelle est la négation de « ${it.all} » ?`, it.neg, it.d, it.all.startsWith('Tous') ? 'La négation de « tous … » est « au moins un … ne … pas » : un seul contre-exemple suffit à la rendre vraie.' : 'La négation de « il existe … » est « pour tout … (le contraire) » : ici, tous les chevaliers ont déjà perdu.')
      },
      () => { const a = rnd(-8, 2), b = a + rnd(2, 7); return choice(`Quelle est la négation de « x ∈ ]${fmt(a)} ; ${fmt(b)}] » ?`, `x ≤ ${fmt(a)} ou x > ${fmt(b)}`, [`x ≤ ${fmt(a)} et x > ${fmt(b)}`, `x ∈ [${fmt(a)} ; ${fmt(b)}[`, `x < ${fmt(a)} ou x ≥ ${fmt(b)}`], `x ∈ ]${fmt(a)} ; ${fmt(b)}] ⟺ x > ${fmt(a)} et x ≤ ${fmt(b)} ; la négation est donc x ≤ ${fmt(a)} ou x > ${fmt(b)}.`) },
      () => { const a = rnd(2, 9); return choice(`Quelle est la négation de « il existe un réel x tel que x² = ${a} » ?`, `Pour tout réel x, x² ≠ ${a}`, [`Il existe un réel x tel que x² ≠ ${a}`, `Pour tout réel x, x² = ${a}`, `Il n'existe qu'un réel x tel que x² = ${a}`], `La négation de « il existe … tel que P » est « pour tout …, non P ».`) },
    ),
  ],
  // Palier 4 : contre-exemple, réciproque, « et / ou », |x − a| ≥ r
  [
    // Contre-exemple (réponse ouverte : n'importe quel contre-exemple est accepté)
    variants(
      () => { const k = rnd(2, 6); return counterEx(`L'affirmation « pour tout réel x, x² ≥ ${k}x » est fausse. Donne un contre-exemple (un nombre).`, (x) => x * x < k * x - 1e-9, k / 2, `Il faut x² < ${k}x : c'est le cas pour tout x strictement entre 0 et ${k}, par exemple x = ${fmt(k / 2)} : ${fmt(k * k / 4)} < ${fmt(k * k / 2)}.`) },
      () => { const a = rnd(2, 9); return counterEx(`Montre par un contre-exemple que l'implication « si x² > ${a * a}, alors x > ${a} » est fausse.`, (x) => x * x > a * a + 1e-9 && x <= a, -a - 1, `Il faut x² > ${a * a} sans que x > ${a} : tout x < −${a} convient, par exemple x = −${fmt(a + 1)} : (−${fmt(a + 1)})² = ${(a + 1) ** 2} > ${a * a}, mais −${fmt(a + 1)} < ${a}.`) },
      () => { const a = randNonZero(-9, 9); return counterEx(`${prenom()} affirme : « pour tout réel x, ${absX(a)} = x ${a < 0 ? '+' : '−'} ${fmt(Math.abs(a))} ». Donne un contre-exemple.`, (x) => Math.abs(Math.abs(x - a) - (x - a)) > 1e-9, a - 1, `${absX(a)} = x ${a < 0 ? '+' : '−'} ${fmt(Math.abs(a))} seulement quand x ${a < 0 ? '+' : '−'} ${fmt(Math.abs(a))} ≥ 0. Tout x < ${fmt(a)} est un contre-exemple, par exemple x = ${fmt(a - 1)}.`) },
      () => { const k = rnd(2, 5); return counterEx(`Vrai pour tout réel x > 0 ? « ${F(1, 'x')} ≤ ${k} ». Donne un réel x > 0 qui montre que c'est faux.`, (x) => x > 0 && 1 / x > k + 1e-9, 0.1, `Il faut x > 0 et ${F(1, 'x')} > ${k}, c'est-à-dire 0 < x < ${F(1, k)} ; par exemple x = 0,1 donne ${F(1, 'x')} = 10 > ${k}.`) },
      () => { const a = rnd(2, 9); return counterEx(`L'implication « si x < ${a}, alors x² < ${a * a} » est fausse. Donne un contre-exemple.`, (x) => x < a && x * x >= a * a - 1e-9, -a - 1, `Il faut x < ${a} et x² ≥ ${a * a} : tout x ≤ −${a} convient, par exemple x = −${fmt(a + 1)} : (−${fmt(a + 1)})² = ${(a + 1) ** 2} ≥ ${a * a}.`) },
    ),
    // Réciproque
    variants(
      () => { const S = implication(); return choice(`Quelle est la réciproque de l'implication « si ${S.p}, alors ${S.q} » ?`, `Si ${S.q}, alors ${S.p}`, [`Si ${S.np}, alors ${S.nq}`, `Si ${S.nq}, alors ${S.np}`, `${S.p} et ${S.q}`], `La réciproque de « si P, alors Q » est « si Q, alors P » : on échange l'hypothèse et la conclusion.`) },
      () => { const S = implication(); return vf(`L'implication « si ${S.p}, alors ${S.q} » est vraie. Sa réciproque est-elle vraie ?`, S.recip, `La réciproque est « si ${S.q}, alors ${S.p} ». Elle est ${S.recip ? 'vraie' : 'fausse'} : ${S.why}.`) },
      () => { const S = implication(); return vf(`Vrai ou faux : « ${S.p} » équivaut à « ${S.q} » (chacune implique l'autre).`, S.recip, `« Si ${S.p}, alors ${S.q} » est vraie ; l'équivalence demande aussi la réciproque, qui est ${S.recip ? 'vraie' : 'fausse'} : ${S.why}.`) },
      () => { const S = implication(); return choice(`Quelle est la contraposée de « si ${S.p}, alors ${S.q} » ?`, `Si ${S.nq}, alors ${S.np}`, [`Si ${S.q}, alors ${S.p}`, `Si ${S.np}, alors ${S.nq}`, `${S.p} et ${S.nq}`], `La contraposée de « si P, alors Q » est « si non Q, alors non P » ; elle est toujours vraie en même temps que l'implication.`) },
    ),
    // « et » / « ou » avec des inégalités
    variants(
      () => { const a = rnd(-8, 2), b = a + rnd(2, 7); const L = [iv(-INF, a, false, true), iv(b, INF, false, false)]; return unionEx(`Écris l'ensemble des réels x tels que « x ≤ ${fmt(a)} ou x > ${fmt(b)} ».`, L, `« ou » : on réunit ]−∞ ; ${fmt(a)}] et ]${fmt(b)} ; +∞[, qui ne se touchent pas : ${unionText(L)}.`) },
      () => { const a = rnd(-8, 2), b = a + rnd(2, 7); const I = iv(a, b, true, false); return unionEx(`Écris l'ensemble des réels x tels que « x ≥ ${fmt(a)} et x < ${fmt(b)} ».`, [I], `« et » : on garde les réels des deux ensembles, l'intersection : ${ivText(I)}.`, 'ex. [−1 ; 4[') },
      () => { const b = rnd(-8, 2), a = b + rnd(2, 7); return unionEx(`Écris l'ensemble des réels x tels que « x < ${fmt(a)} ou x > ${fmt(b)} ».`, [iv(-INF, INF, false, false)], `Comme ${fmt(b)} < ${fmt(a)}, tout réel est < ${fmt(a)} ou > ${fmt(b)} : c'est ℝ.`, 'un intervalle, une réunion, ℝ ou ∅') },
      () => { const a = rnd(-8, 2), b = a + rnd(2, 7); return unionEx(`Écris l'ensemble des réels x tels que « x ≤ ${fmt(a)} et x > ${fmt(b)} ».`, [], `Un réel ne peut pas être à la fois ≤ ${fmt(a)} et > ${fmt(b)} car ${fmt(a)} < ${fmt(b)} : l'ensemble est vide, ∅.`, 'un intervalle, une réunion, ℝ ou ∅') },
      () => { const a = rnd(-8, 2), b = a + rnd(1, 6), s = pick([true, false]); const I = s ? iv(b, INF, false, false) : iv(-INF, a, false, false); return unionEx(`Écris l'ensemble des réels x tels que « x ${s ? '>' : '<'} ${fmt(a)} et x ${s ? '>' : '<'} ${fmt(b)} ».`, [I], `Il faut les deux conditions : ${s ? `x > ${fmt(b)} suffit car ${fmt(b)} > ${fmt(a)}` : `x < ${fmt(a)} suffit car ${fmt(a)} < ${fmt(b)}`}. D'où ${ivText(I)}.`, 'ex. ]2 ; +∞[') },
    ),
    // |x − a| ≥ r → réunion
    variants(
      () => { const a = randNonZero(-7, 7), r = rnd(1, 6), L = [iv(-INF, a - r, false, true), iv(a + r, INF, true, false)]; return unionEx(`Résous ${absX(a)} ≥ ${r}.`, L, `x est à une distance au moins ${r} de ${fmt(a)} : x ≤ ${fmt(a - r)} ou x ≥ ${fmt(a + r)}, soit ${unionText(L)}.`) },
      () => { const a = randNonZero(-7, 7), r = rnd(1, 6), L = [iv(-INF, a - r, false, false), iv(a + r, INF, false, false)]; return unionEx(`Donne l'ensemble des réels x tels que ${absX(a)} > ${r}.`, L, `x < ${fmt(a - r)} ou x > ${fmt(a + r)} (bornes exclues) : ${unionText(L)}.`) },
      () => { const a = randNonZero(-7, 7), r = rnd(1, 6), L = [iv(-INF, a - r, false, false), iv(a + r, INF, false, false)]; return unionEx(`La distance entre x et ${fmt(a)} est strictement supérieure à ${r}. Écris l'ensemble des valeurs possibles de x.`, L, `On s'écarte de plus de ${r} de ${fmt(a)}, d'un côté ou de l'autre : ${unionText(L)}.`) },
      () => { const r = rnd(2, 9), L = [iv(-INF, -r, false, true), iv(r, INF, true, false)]; return unionEx(`Résous |x| ≥ ${r}.`, L, `|x| est la distance de x à 0 : x ≤ −${r} ou x ≥ ${r}, soit ${unionText(L)}.`) },
    ),
  ],
  // Palier 5 : synthèse
  [
    // Combinaisons avec valeur absolue
    variants(
      () => retry(() => { const a = randNonZero(-6, 6), r = rnd(2, 6), b = rnd(a - r + 1, a + r - 1); const K = iv(b, a + r, false, true); return unionEx(`Écris l'ensemble des réels x tels que ${absX(a)} ≤ ${r} et x > ${fmt(b)}.`, [K], `${absX(a)} ≤ ${r} ⟺ x ∈ [${fmt(a - r)} ; ${fmt(a + r)}] ; avec x > ${fmt(b)} on obtient ${ivText(K)}.`, 'ex. ]1 ; 4]') }),
      () => retry(() => { const a = randNonZero(-6, 4), r = rnd(1, 4), c = a + rnd(1, 2 * r), s = rnd(1, 4); const K = iv(Math.min(a - r, c - s), Math.max(a + r, c + s), true, true); return c - s <= a + r && unionEx(`Écris l'ensemble des réels x tels que ${absX(a)} ≤ ${r} ou ${absX(c)} ≤ ${s}.`, [K], `[${fmt(a - r)} ; ${fmt(a + r)}] ∪ [${fmt(c - s)} ; ${fmt(c + s)}] : les deux intervalles se chevauchent, d'où ${ivText(K)}.`, 'ex. [−1 ; 6]') }),
      () => retry(() => { const a = randNonZero(-6, 4), r = rnd(2, 5), c = a + rnd(1, 2 * r - 1), s = rnd(2, 5); const K = inter2(iv(a - r, a + r, false, false), iv(c - s, c + s, false, false)); return K && unionEx(`Écris l'ensemble des réels x tels que ${absX(a)} < ${r} et ${absX(c)} < ${s}.`, [K], `]${fmt(a - r)} ; ${fmt(a + r)}[ ∩ ]${fmt(c - s)} ; ${fmt(c + s)}[ = ${ivText(K)}.`, 'ex. ]1 ; 4[') }),
      () => retry(() => { const a = randNonZero(-6, 6), r = rnd(2, 6), b = rnd(a - r + 1, a + r - 1); const L = [iv(-INF, a - r, false, true), iv(b, INF, false, false)]; return unionEx(`Écris l'ensemble des réels x tels que ${absX(a)} ≥ ${r} ou x > ${fmt(b)}.`, L, `${absX(a)} ≥ ${r} ⟺ x ≤ ${fmt(a - r)} ou x ≥ ${fmt(a + r)} ; comme ${fmt(a + r)} > ${fmt(b)}, la partie [${fmt(a + r)} ; +∞[ est déjà dans ]${fmt(b)} ; +∞[ : ${unionText(L)}.`) }),
    ),
    // Compter dans une liste avec deux ensembles
    fresh(variants(
      () => { const nums = shuffle([...SETS, ...SETS.slice(0, 4).map(() => pick(SETS))].map((s) => numOf(s))).slice(0, 6); const n = nums.filter((x) => x.set === '𝔻').length; return numeric(`Parmi ${nums.map((x) => x.t).join(' ; ')}, combien de nombres sont décimaux mais non entiers ?`, n, { explanation: nums.map((x) => `${x.t} : ${x.set}`).join(' ; ') + ` → ${n} dans 𝔻 sans être dans ℤ.` }) },
      () => { const nums = shuffle([...SETS, ...SETS.slice(0, 4).map(() => pick(SETS))].map((s) => numOf(s))).slice(0, 6); const n = nums.filter((x) => x.set === 'ℚ').length; return numeric(`Parmi ${nums.map((x) => x.t).join(' ; ')}, combien sont rationnels sans être décimaux ?`, n, { explanation: nums.map((x) => `${x.t} : ${x.set}`).join(' ; ') + ` → ${n} dans ℚ sans être dans 𝔻.` }) },
      () => { const nums = shuffle([...SETS, ...SETS.slice(0, 4).map(() => pick(SETS))].map((s) => numOf(s))).slice(0, 6); const n = nums.filter((x) => x.set === 'ℝ').length; return numeric(`Parmi ${nums.map((x) => x.t).join(' ; ')}, combien sont irrationnels (réels mais pas rationnels) ?`, n, { explanation: nums.map((x) => `${x.t} : ${x.set}`).join(' ; ') + ` → ${n} irrationnel${n > 1 ? 's' : ''}.` }) },
      () => { const nums = shuffle([...SETS, ...SETS.slice(0, 4).map(() => pick(SETS))].map((s) => numOf(s))).slice(0, 6); const n = nums.filter((x) => x.set === 'ℤ').length; return numeric(`Parmi ${nums.map((x) => x.t).join(' ; ')}, combien sont des entiers relatifs qui ne sont pas des entiers naturels ?`, n, { explanation: nums.map((x) => `${x.t} : ${x.set}`).join(' ; ') + ` → ${n} entier${n > 1 ? 's' : ''} négatif${n > 1 ? 's' : ''}.` }) },
    )),
    // Énoncés quantifiés
    variants(
      () => { const a = rnd(-6, 6) + pick([0.1, 0.3, 0.5]), b = a + pick([0.4, 0.6, 0.8, 1.3, 1.7]); const ok = Math.ceil(a) < b; return vf(`Vrai ou faux : « il existe un entier dans l'intervalle ]${fmt(a)} ; ${fmt(b)}[ ».`, ok, ok ? `${fmt(Math.ceil(a))} est un entier et ${fmt(a)} < ${fmt(Math.ceil(a))} < ${fmt(b)}.` : `Le premier entier après ${fmt(a)} est ${fmt(Math.ceil(a))}, qui n'est pas < ${fmt(b)}.`) },
      () => { const a = rnd(-6, 2), b = a + rnd(2, 6), c = a + rnd(-2, 2), d = b + rnd(-2, 2); const I = iv(a, b, true, true), J = iv(Math.min(c, d - 1), d, true, true); const ok = J.lo <= a && b <= J.hi; return vf(`Vrai ou faux : « tout réel de ${ivText(I)} appartient à ${ivText(J)} ».`, ok, ok ? `${fmt(J.lo)} ≤ ${fmt(a)} et ${fmt(b)} ≤ ${fmt(J.hi)} : ${ivText(I)} est inclus dans ${ivText(J)}.` : `${b > J.hi ? fmt(b) : fmt(a)} est dans ${ivText(I)} mais pas dans ${ivText(J)} : c'est un contre-exemple.`) },
      () => { const c = randNonZero(-5, 5), r = rnd(2, 5), a = c + rnd(-r - 2, r - 1), b = a + rnd(1, 4); const ok = a >= c - r && b <= c + r; return vf(`Vrai ou faux : « pour tout x de [${fmt(a)} ; ${fmt(b)}], ${absX(c)} ≤ ${r} ».`, ok, `${absX(c)} ≤ ${r} ⟺ x ∈ [${fmt(c - r)} ; ${fmt(c + r)}]. ${ok ? `[${fmt(a)} ; ${fmt(b)}] y est inclus : c'est vrai.` : `${a < c - r ? fmt(a) : fmt(b)} n'y est pas : c'est faux.`}`) },
      () => { const a = rnd(-6, 6), b = a + randNonZero(-9, 9), r = rnd(1, 4), s = rnd(1, 4); const ok = Math.abs(a - b) <= r + s; return vf(`Vrai ou faux : « il existe un réel x tel que ${absX(a)} ≤ ${r} et ${absX(b)} ≤ ${s} ».`, ok, `Il faut que [${fmt(a - r)} ; ${fmt(a + r)}] et [${fmt(b - s)} ; ${fmt(b + s)}] se rencontrent : ${ok ? 'c’est le cas, donc vrai' : 'ils sont disjoints, donc faux'}.`) },
    ),
    // |kx − a| ≤ r
    variants(
      () => retry(() => { const k = rnd(2, 4), a = randNonZero(-9, 9), r = rnd(1, 9); if (gcd(k, Math.abs(a - r)) === k && gcd(k, Math.abs(a + r)) === k) return null; const I = iv((a - r) / k, (a + r) / k, true, true, fracText(a - r, k), fracText(a + r, k)); return unionEx(`Résous |${k}x ${a < 0 ? '+' : '−'} ${Math.abs(a)}| ≤ ${r}.`, [I], `−${r} ≤ ${k}x ${a < 0 ? '+' : '−'} ${Math.abs(a)} ≤ ${r} ⟺ ${fmt(a - r)} ≤ ${k}x ≤ ${fmt(a + r)} ⟺ ${fracText(a - r, k)} ≤ x ≤ ${fracText(a + r, k)}.`, 'ex. [1/3 ; 7/3]') }),
      () => retry(() => { const k = rnd(2, 4), a = randNonZero(-9, 9), r = rnd(1, 9); if (gcd(k, Math.abs(a - r)) === k && gcd(k, Math.abs(a + r)) === k) return null; const I = iv((a - r) / k, (a + r) / k, false, false, fracText(a - r, k), fracText(a + r, k)); return unionEx(`Donne l'ensemble des solutions de |${k}x ${a < 0 ? '+' : '−'} ${Math.abs(a)}| < ${r}.`, [I], `${fmt(a - r)} < ${k}x < ${fmt(a + r)}, puis on divise par ${k} > 0 : ${ivText(I)}.`, 'ex. ]1/3 ; 7/3[') }),
      () => retry(() => { const k = rnd(2, 4), a = randNonZero(-9, 9), r = rnd(1, 9); if ((a - r) % k === 0 && (a + r) % k === 0) return null; const L = [iv(-INF, (a - r) / k, false, true, undefined, fracText(a - r, k)), iv((a + r) / k, INF, true, false, fracText(a + r, k))]; return unionEx(`Résous |${k}x ${a < 0 ? '+' : '−'} ${Math.abs(a)}| ≥ ${r}.`, L, `${k}x ${a < 0 ? '+' : '−'} ${Math.abs(a)} ≤ −${r} ou ${k}x ${a < 0 ? '+' : '−'} ${Math.abs(a)} ≥ ${r}, soit x ≤ ${fracText(a - r, k)} ou x ≥ ${fracText(a + r, k)}.`) }),
      () => retry(() => { const k = rnd(2, 4), a = rnd(1, 9), r = rnd(1, 9); if ((a - r) % k === 0 && (a + r) % k === 0) return null; const I = iv((a - r) / k, (a + r) / k, true, true, fracText(a - r, k), fracText(a + r, k)); return unionEx(`Résous |${a} − ${k}x| ≤ ${r} (rappel : |a − b| = |b − a|).`, [I], `|${a} − ${k}x| = |${k}x − ${a}| ≤ ${r} ⟺ ${fracText(a - r, k)} ≤ x ≤ ${fracText(a + r, k)}.`, 'ex. [1/3 ; 7/3]') }),
    ),
    // Écriture décimale périodique → fraction (ℚ)
    variants(
      () => { const a = rnd(1, 8); return fraction(`x = 0,${String(a).repeat(5)}… (le chiffre ${a} se répète indéfiniment). Écris x sous forme de fraction irréductible.`, a, 9, { irreducible: true, explanation: `10x = ${a},${String(a).repeat(4)}…, donc 10x − x = ${a}, 9x = ${a} et x = ${fracText(a, 9)}.` }) },
      () => retry(() => { const ab = rnd(10, 98); if (ab % 11 === 0) return null; const s = String(ab); return fraction(`x = 0,${s.repeat(3)}… (le bloc ${s} se répète indéfiniment). Écris x sous forme de fraction irréductible.`, ab, 99, { irreducible: true, explanation: `100x = ${s},${s.repeat(2)}…, donc 100x − x = ${ab} : 99x = ${ab}, x = ${F(ab, 99)}${gcd(ab, 99) > 1 ? ` = ${fracText(ab, 99)}` : ''}.` }) }),
      () => { const a = rnd(1, 5), b = rnd(1, 8); return fraction(`x = ${a},${String(b).repeat(5)}… (le ${b} se répète). Écris x sous forme de fraction irréductible.`, 9 * a + b, 9, { irreducible: true, explanation: `10x = ${10 * a + b},${String(b).repeat(4)}…, donc 9x = ${10 * a + b} − ${a} = ${9 * a + b} et x = ${fracText(9 * a + b, 9)}.` }) },
      () => retry(() => { const a = rnd(1, 9), b = rnd(1, 9); if (a === b) return null; return fraction(`x = 0,${a}${String(b).repeat(5)}… (seul le ${b} se répète). Écris x sous forme de fraction irréductible.`, 9 * a + b, 90, { irreducible: true, explanation: `100x = ${10 * a + b},${String(b).repeat(4)}… et 10x = ${a},${String(b).repeat(4)}…, donc 90x = ${10 * a + b} − ${a} = ${9 * a + b} et x = ${fracText(9 * a + b, 90)}.` }) }),
    ),
  ],
]

/** Réponse : un nombre qui contredit l'affirmation (tout contre-exemple valable est accepté). */
function counterEx(prompt: string, isCounter: (x: number) => boolean, sample: number, explanation: string): Exercise {
  return {
    prompt, kind: 'input', answer: fmt(sample), explanation,
    inputHint: 'Un contre-exemple',
    format: 'un nombre, par exemple −3 ; 0,5 ou 1/2',
    keypad: ['−', '/', ','],
    isValid: (v) => !Number.isNaN(parseNumber(v)),
    check: (v) => { const x = parseNumber(v); return !Number.isNaN(x) && isCounter(x) },
  }
}

// ── Problèmes d'amélioration ────────────────────────────────────────────
const isDecimalInv = (k: number) => isDecDen(k)
const upgrades: Ladder = [
  [
    // Fractions 1/k décimales
    () => {
      const n = rnd(12, 45), list: number[] = []
      for (let k = 2; k <= n; k++) if (isDecimalInv(k)) list.push(k)
      return T('Les fractions unitaires', numeric(`Parmi les fractions ${F(1, 2)}, ${F(1, 3)}, ${F(1, 4)}, …, ${F(1, n)}, combien sont des nombres décimaux ?`, list.length, {
        explanation: `${F(1, 'k')} est décimal exactement quand k ne s'écrit qu'avec des facteurs 2 et 5. Ici : k = ${list.join(' ; ')}, soit ${list.length} fractions.`,
      }))
    },
    // Entiers à distance au plus r
    () => pick([
      () => { const a = randNonZero(-20, 20), r = rnd(2, 9) + 0.5; return T('Autour d’un entier', numeric(`Combien d'entiers relatifs n vérifient ${absX(a, 'n')} ≤ ${fmt(r)} ?`, 2 * Math.floor(r) + 1, { explanation: `n ∈ [${fmt(a - r)} ; ${fmt(a + r)}] : les entiers vont de ${fmt(a - Math.floor(r))} à ${fmt(a + Math.floor(r))}, soit 2 × ${Math.floor(r)} + 1 = ${2 * Math.floor(r) + 1}.` })) },
      () => { const a = randNonZero(-20, 20), r = rnd(2, 9); return T('Autour d’un entier', numeric(`Combien d'entiers relatifs n vérifient ${absX(a, 'n')} < ${r} ?`, 2 * r - 1, { explanation: `n ∈ ]${fmt(a - r)} ; ${fmt(a + r)}[ : les entiers vont de ${fmt(a - r + 1)} à ${fmt(a + r - 1)}, soit 2 × ${r} − 1 = ${2 * r - 1}.` })) },
    ])(),
    // Plus grand / plus petit entier d'une intersection
    () => retry(() => {
      const a = rnd(-9, 2) + pick([0, 0.5]), b = a + rnd(4, 9), c = rnd(Math.ceil(a) + 1, Math.floor(b) - 1) + pick([0, 0.5]), d = b + rnd(1, 5)
      const I = iv(a, b, pick([true, false]), pick([true, false])), J = iv(c, d, pick([true, false]), pick([true, false]))
      const K = inter2(I, J)
      if (!K) return null
      const ints = intList(K)
      if (ints.length < 2) return null
      const big = pick([true, false])
      return T('Le bon entier', numeric(`Quel est le ${big ? 'plus grand' : 'plus petit'} entier appartenant à ${ivText(I)} ∩ ${ivText(J)} ?`, big ? ints[ints.length - 1] : ints[0], {
        explanation: `${ivText(I)} ∩ ${ivText(J)} = ${ivText(K)} ; ses entiers sont ${ints.map(fmt).join(' ; ')}.`,
      }))
    }),
  ],
  [
    // Longueur d'une intersection de deux « boules »
    () => retry(() => {
      const a = rnd(-8, 8), r = rnd(2, 6), b = a + randNonZero(-8, 8), s = rnd(2, 6)
      const K = inter2(iv(a - r, a + r, true, true), iv(b - s, b + s, true, true))
      if (!K || K.hi - K.lo <= 0) return null
      return T('Deux zones', numeric(`Quelle est la longueur de l'ensemble des réels x qui vérifient à la fois ${absX(a)} ≤ ${r} et ${absX(b)} ≤ ${s} ?`, K.hi - K.lo, {
        explanation: `[${fmt(a - r)} ; ${fmt(a + r)}] ∩ [${fmt(b - s)} ; ${fmt(b + s)}] = ${ivText(K)}, de longueur ${fmt(K.hi)} − ${K.lo < 0 ? `(${fmt(K.lo)})` : fmt(K.lo)} = ${fmt(K.hi - K.lo)}.`,
      }))
    }),
    // Période de 3 chiffres
    () => retry(() => {
      const n = rnd(100, 998)
      if (n % 111 === 0 || gcd(n, 999) === 1 && Math.random() < 0.5) return null
      const s = String(n)
      return T('Le bloc qui revient', fraction(`x = 0,${s.repeat(3)}… (le bloc ${s} se répète indéfiniment). Écris x sous forme de fraction irréductible.`, n, 999, {
        irreducible: true, explanation: `1000x − x = ${n}, donc x = ${F(n, 999)}${gcd(n, 999) > 1 ? ` = ${fracText(n, 999)}` : ''} (999 = 3³ × 37 : on simplifie si possible).`,
      }))
    }),
    // Plus grand entier contre-exemple
    () => pick([
      () => { const a = rnd(2, 12); return T('Le plus grand contre-exemple', numeric(`On considère l'implication « si x² > ${a * a}, alors x > ${a} ». Quel est le plus grand entier qui en est un contre-exemple ?`, -a - 1, { explanation: `Un contre-exemple vérifie x² > ${a * a} et x ≤ ${a}, donc x < −${a}. Le plus grand entier qui convient est −${fmt(a + 1)}.` })) },
      () => { const a = rnd(2, 12); return T('Le plus grand contre-exemple', numeric(`On considère l'implication « si x² ≥ ${a * a}, alors x ≥ ${a} ». Quel est le plus grand entier qui en est un contre-exemple ?`, -a, { explanation: `Un contre-exemple vérifie x² ≥ ${a * a} et x < ${a}, donc x ≤ −${a}. Le plus grand entier qui convient est −${a}.` })) },
      () => { const a = rnd(2, 12); return T('Le plus petit contre-exemple', numeric(`On considère l'implication « si x < ${a}, alors x² < ${a * a} ». Quel est le plus grand entier qui en est un contre-exemple ?`, -a, { explanation: `Un contre-exemple vérifie x < ${a} et x² ≥ ${a * a}, donc x ≤ −${a}. Le plus grand entier qui convient est −${a}.` })) },
    ])(),
  ],
  [
    // |x − a| + |x − b|
    () => pick([
      () => { const a = rnd(-8, 3), b = a + rnd(2, 8); return T('Sur le chemin', unionEx(`Pour quels réels x a-t-on ${absX(a)} + ${absX(b)} = ${fmt(b - a)} ?`, [iv(a, b, true, true)], `${absX(a)} + ${absX(b)} est la somme des distances de x à ${fmt(a)} et à ${fmt(b)}. Elle vaut ${fmt(b - a)} = la distance entre ${fmt(a)} et ${fmt(b)} exactement quand x est entre les deux : [${fmt(a)} ; ${fmt(b)}].`, 'ex. [1 ; 5]')) },
      () => { const a = rnd(-8, 3), b = a + 2 * rnd(1, 4), L = b - a + 2 * rnd(1, 3); const m = (a + b) / 2; return T('Sur le chemin', unionEx(`Pour quels réels x a-t-on ${absX(a)} + ${absX(b)} ≤ ${L} ?`, [iv(m - L / 2, m + L / 2, true, true)], `Entre ${fmt(a)} et ${fmt(b)} la somme vaut ${fmt(b - a)}. En dehors, elle augmente de 2 par unité : il faut s'écarter d'au plus ${fmt((L - (b - a)) / 2)} de [${fmt(a)} ; ${fmt(b)}]. Solution : [${fmt(m - L / 2)} ; ${fmt(m + L / 2)}].`, 'ex. [−1 ; 5]')) },
    ])(),
    // Plus proche de a que de b
    () => {
      const a = rnd(-9, 9), b = a + randNonZero(-9, 9), m = (a + b) / 2
      const I = a < b ? iv(-INF, m, false, false, undefined, fracText(a + b, 2)) : iv(m, INF, false, false, fracText(a + b, 2))
      return T('Le plus proche', unionEx(`Résous ${absX(a)} < ${absX(b)}.`, [I], `x est plus proche de ${fmt(a)} que de ${fmt(b)} : il est du côté de ${fmt(a)} par rapport au milieu ${fracText(a + b, 2)}. Solution : ${ivText(I)}.`, 'ex. ]−∞ ; 3/2['))
    },
    // Entiers dans une réunion
    () => {
      const a = rnd(-10, 0), r = rnd(1, 4), b = a + rnd(2, 12), s = rnd(1, 4)
      const set = new Set<number>()
      for (let n = a - r; n <= a + r; n++) set.add(n)
      for (let n = b - s; n <= b + s; n++) set.add(n)
      const overlap = 2 * r + 1 + 2 * s + 1 - set.size
      return T('Compter sans double compte', numeric(`Combien d'entiers relatifs n vérifient ${absX(a, 'n')} ≤ ${r} ou ${absX(b, 'n')} ≤ ${s} ?`, set.size, {
        explanation: `[${fmt(a - r)} ; ${fmt(a + r)}] contient ${2 * r + 1} entiers, [${fmt(b - s)} ; ${fmt(b + s)}] en contient ${2 * s + 1}${overlap ? `, dont ${overlap} en commun, comptés une seule fois` : ', sans entier commun'} : ${set.size}.`,
      }))
    },
  ],
]

// ── Problèmes de l'hôtel de ville ───────────────────────────────────────
const age: Ladder = [
  [
    // La tolérance du forgeron
    () => {
      const L = rnd(60, 95), t = pick([0.5, 1, 1.5, 2]), item = pick(['épées', 'lances', 'barres de fer', 'planches'])
      const I = iv(L - t, L + t, true, true)
      return T('La tolérance du forgeron', interval(`Le forgeron fabrique des ${item} de ${L} cm. Une pièce est acceptée si sa longueur ℓ (en cm) vérifie |ℓ − ${L}| ≤ ${fmt(t)}. Écris sous forme d'intervalle l'ensemble des longueurs acceptées.`, I, {
        explanation: `|ℓ − ${L}| ≤ ${fmt(t)} : ℓ est à au plus ${fmt(t)} cm de ${L}, donc ℓ ∈ ${ivText(I)}.`,
      }), lineFig(L - t - 2, L + t + 2, { marks: [{ x: L, label: String(L) }] }))
    },
    // Le chemin de ronde
    () => {
      const N = rnd(20, 40), r = rnd(3, 7), a = pick([rnd(1, r - 1), rnd(r + 2, N - r - 2), rnd(N - r + 1, N)])
      const lo = Math.max(1, a - r), hi = Math.min(N, a + r)
      return T('Le chemin de ronde', numeric(`Sur le chemin de ronde, les créneaux sont numérotés de 1 à ${N}. Une sentinelle postée au créneau ${a} surveille les créneaux n tels que |n − ${a}| ≤ ${r}. Combien de créneaux surveille-t-elle ?`, hi - lo + 1, {
        explanation: `|n − ${a}| ≤ ${r} ⟺ ${fmt(a - r)} ≤ n ≤ ${fmt(a + r)}, mais les créneaux vont de 1 à ${N} : n va de ${lo} à ${hi}, soit ${fmt(hi - lo + 1)} créneaux.`,
      }), lineFig(0, N + 1, { marks: [{ x: a, label: 'S' }], spans: [{ lo: 1, hi: N, loClosed: true, hiClosed: true, color: BLUE, lift: 1 }] }))
    },
    // Les deux sentinelles
    () => retry(() => {
      const a = rnd(2, 12), r = rnd(3, 6), b = a + rnd(3, 2 * r - 1), s = rnd(3, 6)
      const K = inter2(iv(a - r, a + r, true, true), iv(b - s, b + s, true, true))
      if (!K) return null
      const fig = lineFig(Math.min(a - r, b - s) - 1, Math.max(a + r, b + s) + 1, {
        marks: [{ x: a, label: 'A' }, { x: b, label: 'B' }],
        spans: [{ lo: a - r, hi: a + r, loClosed: true, hiClosed: true, color: RED, lift: 1 }, { lo: b - s, hi: b + s, loClosed: true, hiClosed: true, color: BLUE, lift: 2 }],
      })
      return T('Les deux sentinelles', interval(`Le long de la route (graduée en km), une sentinelle est postée au point A d'abscisse ${a} et voit jusqu'à ${r} km ; une autre, en B d'abscisse ${b}, voit jusqu'à ${s} km. Quel intervalle de la route est surveillé par les deux sentinelles à la fois ?`, K, {
        explanation: `Zone de A : [${fmt(a - r)} ; ${fmt(a + r)}] ; zone de B : [${fmt(b - s)} ; ${fmt(b + s)}]. Les deux à la fois : l'intersection ${ivText(K)}.`,
      }), fig)
    }),
  ],
  [
    // La cave du vigneron
    () => {
      const c = rnd(10, 14), r = pick([1, 1.5, 2]), temps = Array.from({ length: 7 }, () => c + pick([-1, 1]) * pick([0, 0.5, 1, 1.5, 2, 2.5, 3]))
      const bad = temps.filter((t) => Math.abs(t - c) > r + 1e-9)
      const jours = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']
      return T('La cave du vigneron', numeric(`Le vin se conserve bien si la température T (en °C) de la cave vérifie |T − ${c}| ≤ ${fmt(r)}. Relevés de la semaine : ${temps.map((t, i) => `${jours[i]} ${fmt(t)} °C`).join(', ')}. Combien de jours la température était-elle hors de la zone conseillée ?`, bad.length, {
        explanation: `La zone conseillée est [${fmt(c - r)} ; ${fmt(c + r)}]. Hors de cette zone : ${bad.length ? bad.map(fmt).join(' ; ') : 'aucun relevé'}, soit ${bad.length} jour${bad.length > 1 ? 's' : ''}.`,
      }))
    },
    // Le pari des deux amis
    () => retry(() => {
      const [p1, p2] = deuxPrenoms()
      const a = rnd(-4, 6), b = a + rnd(4, 8), c = rnd(a + 1, b), r = rnd(2, 4)
      const I = iv(a, b, pick([true, false]), pick([true, false])), J = iv(c - r, c + r, false, false)
      const K = inter2(I, J)
      if (!K || K.lo === I.lo && K.hi === I.hi || K.lo === J.lo && K.hi === J.hi) return null
      const fig = lineFig(Math.min(a, c - r) - 1, Math.max(b, c + r) + 1, { spans: [{ ...I, color: RED, lift: 1 }, { ...J, color: BLUE, lift: 2 }] })
      return T('Le pari des deux amis', interval(`Pour deviner un nombre réel x, ${p1} affirme que x ∈ ${ivText(I)} (en rouge) et ${p2} que ${absX(c)} < ${r} (en bleu). Les deux ont raison. Dans quel intervalle se trouve x ?`, K, {
        explanation: `${absX(c)} < ${r} ⟺ x ∈ ]${fmt(c - r)} ; ${fmt(c + r)}[. Les deux ont raison : x est dans l'intersection ${ivText(K)}.`,
      }), fig)
    }),
    // Le marchand affirme
    () => {
      const a = rnd(3, 15), strict = pick([true, false])
      return T('L’affirmation du marchand', numeric(`Le marchand affirme : « Tout nombre dont le carré ${strict ? 'dépasse strictement' : 'est au moins égal à'} ${a * a} est lui-même ${strict ? 'strictement supérieur' : 'supérieur ou égal'} à ${a}. » L'apprentie cherche des contre-exemples parmi les entiers. Quel est le plus grand entier qui contredit le marchand ?`, strict ? -a - 1 : -a, {
        explanation: `Un contre-exemple x vérifie x² ${strict ? '>' : '≥'} ${a * a} mais x ${strict ? '≤' : '<'} ${a} : c'est x ${strict ? '<' : '≤'} −${a}. Le plus grand entier qui convient est ${strict ? `−${fmt(a + 1)}` : `−${a}`}.`,
      }))
    },
  ],
  [
    // Le jeu de devinettes
    () => retry(() => {
      const target = rnd(-15, 15)
      const a = target - rnd(1, 6), b = target + rnd(0, 6)
      const I = iv(a, b, false, true)
      const c = target + pick([-1, 1]) * rnd(3, 6), r = Math.abs(target - c) - rnd(1, 2)
      if (r < 1) return null
      const parity = Math.abs(target % 2) === 0 ? 'pair' : 'impair'
      const cands = intList(I).filter((n) => Math.abs(n - c) > r && Math.abs(n % 2) === Math.abs(target % 2))
      if (cands.length !== 1) return null
      return T('Le jeu de devinettes', numeric(`${prenom()} pense à un entier n. Indices : n ∈ ${ivText(I)} ; ${absX(c, 'n')} > ${r} ; n est ${parity}. Quel est ce nombre ?`, target, {
        explanation: `Entiers de ${ivText(I)} : ${intList(I).map(fmt).join(' ; ')}. ${absX(c, 'n')} > ${r} élimine ceux de [${fmt(c - r)} ; ${fmt(c + r)}] ; parmi les restants, le seul ${parity} est ${fmt(target)}.`,
      }))
    }),
    // Les deux phares
    () => retry(() => {
      const a = rnd(0, 6), r = rnd(3, 6), b = a + rnd(3, 2 * r - 1), s = rnd(3, 6)
      if (b - s <= a - r || b + s <= a + r) return null
      const L = [iv(a - r, b - s, true, false), iv(a + r, b + s, false, true)]
      const fig = lineFig(a - r - 1, b + s + 1, {
        marks: [{ x: a, label: 'A' }, { x: b, label: 'B' }],
        spans: [{ lo: a - r, hi: a + r, loClosed: true, hiClosed: true, color: RED, lift: 1 }, { lo: b - s, hi: b + s, loClosed: true, hiClosed: true, color: BLUE, lift: 2 }],
      })
      return T('Les deux phares', unionEx(`Sur une côte rectiligne graduée en milles, le phare A (abscisse ${a}) éclaire jusqu'à ${r} milles et le phare B (abscisse ${b}) jusqu'à ${s} milles. Un navire veut une zone éclairée par un seul des deux phares (pas par les deux). Écris cet ensemble de positions sous forme d'une réunion d'intervalles.`, L, `Zone de A : [${fmt(a - r)} ; ${fmt(a + r)}] ; zone de B : [${fmt(b - s)} ; ${fmt(b + s)}] ; zone commune : [${fmt(b - s)} ; ${fmt(a + r)}]. On retire la zone commune de la réunion : ${unionText(L)}.`, 'ex. [1 ; 3[ ∪ ]6 ; 9]'), fig)
    }),
    // La route des caravanes
    () => retry(() => {
      const p = [rnd(0, 4)]
      p.push(p[0] + rnd(4, 12)); p.push(p[1] + rnd(4, 12))
      const r = rnd(2, 4)
      const L = merged(p.map((x) => iv(x - r, x + r, true, true)))
      const len = L.reduce((s, I) => s + I.hi - I.lo, 0)
      if (L.length === 3 && Math.random() < 0.6) return null
      const fig = lineFig(p[0] - r - 1, p[2] + r + 1, { marks: p.map((x, i) => ({ x, label: ['P', 'Q', 'R'][i] })) })
      return T('La route des caravanes', numeric(`Sur la route (graduée en km), trois puits P, Q, R sont aux abscisses ${p.map(fmt).join(', ')}. Une caravane doit toujours bivouaquer à au plus ${r} km d'un puits. Quelle longueur totale de route (en km) convient pour bivouaquer ?`, len, {
        explanation: `Positions possibles : [${fmt(p[0] - r)} ; ${fmt(p[0] + r)}] ∪ [${fmt(p[1] - r)} ; ${fmt(p[1] + r)}] ∪ [${fmt(p[2] - r)} ; ${fmt(p[2] + r)}] = ${unionText(L)}. Longueur totale : ${L.map((I) => fmt(I.hi - I.lo)).join(' + ')} = ${len} km.`,
      }), fig)
    }),
  ],
]

export const CONTENT: SubjectContent | null = { tiers, upgrades, age }
