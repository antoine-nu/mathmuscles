// Vocabulaire ensembliste et logique (Terminale, spécialité) : ensembles (inclusion, intersection, réunion,
// complémentaire, produit cartésien, cardinal), quantificateurs, négation d'une proposition quantifiée, implication,
// réciproque, contraposée, équivalence, condition nécessaire / suffisante, contre-exemple.
// Paliers 1 à 3 : adultes qui reprennent (rappels guidés) ; paliers 2 à 5 : adultes aguerris.
import {
  choice, fmt, fresh, interval, intervalText, numeric, parseNumber, pick, randInt, shuffle, variants, withMeta,
  type Exercise, type Interval, type Ladder, type SubjectContent, type Tiers,
} from '../utils'
import type { Figure } from '../figure'
import { deuxPrenoms } from '../contexts'

// ── Aides locales ───────────────────────────────────────────────────────
const T = (title: string, ex: Exercise, figure?: Figure): Exercise => withMeta(ex, figure ? { title, figure } : { title })
const VRAI = 'Vrai', FAUX = 'Faux'
/** Question vrai / faux. */
const vf = (prompt: string, truth: boolean, explanation: string) => choice(prompt, truth ? VRAI : FAUX, [truth ? FAUX : VRAI], explanation)
const num = (prompt: string, value: number, explanation: string) => numeric(prompt, value, { explanation, inputHint: 'Un nombre entier' })

const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i)
const sortNum = (xs: number[]) => [...new Set(xs)].sort((x, y) => x - y)
/** Ensemble écrit en extension : {1 ; 4 ; 7}, ou ∅. */
const setText = (xs: number[]) => (xs.length ? `{${sortNum(xs).map(fmt).join(' ; ')}}` : '∅')
const inter = (A: number[], B: number[]) => sortNum(A.filter((x) => B.includes(x)))
const union = (A: number[], B: number[]) => sortNum([...A, ...B])
const minus = (A: number[], B: number[]) => sortNum(A.filter((x) => !B.includes(x)))
/** Partie aléatoire de {lo … hi} à k éléments. */
const randSet = (lo: number, hi: number, k: number) => sortNum(shuffle(range(lo, hi)).slice(0, k))
const isPrime = (n: number) => {
  if (n < 2 || !Number.isInteger(n)) return false
  for (let d = 2; d * d <= n; d++) if (n % d === 0) return false
  return true
}

/** Lit un ensemble d'entiers : « {1 ; 3 ; 5} », « 1, 3, 5 », « ∅ ». */
function parseIntSet(raw: string): number[] | null {
  const s = raw.trim().replace(/[−–—]/g, '-').replace(/\s+/g, '')
  if (/^(\{\}|∅|ø|Ø|vide|ensemblevide)$/i.test(s)) return []
  const body = s.replace(/^[A-Za-z]*=?/, '').replace(/^\{/, '').replace(/\}$/, '')
  if (!body) return null
  const parts = body.split(/[;,]/).filter(Boolean)
  const nums = parts.map(Number)
  return nums.every((n) => Number.isInteger(n)) ? sortNum(nums) : null
}
/** Réponse : un ensemble d'entiers. */
function intSet(prompt: string, values: number[], explanation: string): Exercise {
  const want = sortNum(values)
  return {
    prompt,
    kind: 'input',
    answer: setText(want),
    explanation,
    inputHint: 'ex. {2 ; 5 ; 8} ou ∅',
    format: 'un ensemble d’entiers, par exemple {2 ; 5 ; 8}, ou ∅ s’il est vide',
    keypad: ['{', '}', ';', '∅', '−'],
    isValid: (v) => parseIntSet(v) !== null,
    check: (v) => {
      const got = parseIntSet(v)
      return !!got && got.length === want.length && got.every((x, i) => x === want[i])
    },
  }
}

/** Réponse ouverte : un contre-exemple (nombre) vérifié par un prédicat. */
function counter(prompt: string, isCounter: (x: number) => boolean, example: number, explanation: string, hint = 'Un nombre'): Exercise {
  return {
    prompt,
    kind: 'input',
    answer: fmt(example),
    explanation,
    inputHint: hint,
    format: 'un nombre, par exemple −3 ; 0,5 ou 7/4',
    keypad: ['−', '/', ','],
    isValid: (v) => !Number.isNaN(parseNumber(v)),
    check: (v) => {
      const x = parseNumber(v)
      return !Number.isNaN(x) && isCounter(x)
    },
  }
}
function parseCouple(raw: string): [number, number] | null {
  const s = raw.trim().replace(/[−–—]/g, '-').replace(/\s+/g, '').replace(/^\(/, '').replace(/\)$/, '')
  let parts = s.split(';')
  if (parts.length === 1 && (s.match(/,/g) ?? []).length === 1) parts = s.split(',')
  if (parts.length !== 2) return null
  const [a, b] = parts.map(parseNumber)
  return Number.isNaN(a) || Number.isNaN(b) ? null : [a, b]
}
/** Réponse ouverte : un couple contre-exemple (a ; b). */
function counterPair(prompt: string, isCounter: (a: number, b: number) => boolean, example: [number, number], explanation: string): Exercise {
  return {
    prompt,
    kind: 'input',
    answer: `(${fmt(example[0])} ; ${fmt(example[1])})`,
    explanation,
    inputHint: 'Forme (a ; b)',
    format: 'un couple (a ; b), par exemple (2 ; −3)',
    keypad: ['(', ';', ')', '−', '/'],
    isValid: (v) => parseCouple(v) !== null,
    check: (v) => {
      const p = parseCouple(v)
      return !!p && isCounter(p[0], p[1])
    },
  }
}

// ── Diagrammes de Venn ──
const RED = '#b8362f', BLUE = '#5b8fc7', GREEN = '#6aa86a'
function frame(): Figure {
  return {
    w: 320, h: 220,
    points: {
      _a: { x: 8, y: 8, hidden: true, label: '' }, _b: { x: 312, y: 8, hidden: true, label: '' },
      _c: { x: 312, y: 212, hidden: true, label: '' }, _d: { x: 8, y: 212, hidden: true, label: '' },
    },
    segments: [{ a: '_a', b: '_b' }, { a: '_b', b: '_c' }, { a: '_c', b: '_d' }, { a: '_d', b: '_a' }],
    notes: [],
    circles: [],
  }
}
/** Deux ensembles A et B dans E ; régions : A seul, A∩B, B seul, hors des deux. */
function venn2(names: [string, string], vals: [string, string, string, string], universe = 'E'): Figure {
  const f = frame()
  f.points.CA = { x: 120, y: 115, hidden: true, label: '' }
  f.points.CB = { x: 200, y: 115, hidden: true, label: '' }
  f.circles = [{ c: 'CA', r: 72, color: RED }, { c: 'CB', r: 72, color: BLUE }]
  f.notes = [
    { x: 70, y: 40, text: names[0] }, { x: 250, y: 40, text: names[1] }, { x: 16 + 4.2 * [...universe].length, y: 26, text: universe },
    { x: 88, y: 120, text: vals[0] }, { x: 160, y: 120, text: vals[1] }, { x: 232, y: 120, text: vals[2] }, { x: 290, y: 200, text: vals[3] },
  ]
  f.caption = 'Diagramme de Venn : chaque nombre indique l’effectif de la zone.'
  return f
}
/** Trois ensembles ; vals = [A seul, B seul, C seul, A∩B seul, A∩C seul, B∩C seul, A∩B∩C, aucun]. */
function venn3(names: [string, string, string], vals: string[]): Figure {
  const f = frame()
  f.points.CA = { x: 128, y: 88, hidden: true, label: '' }
  f.points.CB = { x: 192, y: 88, hidden: true, label: '' }
  f.points.CC = { x: 160, y: 144, hidden: true, label: '' }
  f.circles = [{ c: 'CA', r: 58, color: RED }, { c: 'CB', r: 58, color: BLUE }, { c: 'CC', r: 58, color: GREEN }]
  f.notes = [
    { x: 62, y: 34, text: names[0] }, { x: 258, y: 34, text: names[1] }, { x: 240, y: 200, text: names[2] },
    { x: 100, y: 80, text: vals[0] }, { x: 220, y: 80, text: vals[1] }, { x: 160, y: 182, text: vals[2] },
    { x: 160, y: 64, text: vals[3] }, { x: 124, y: 132, text: vals[4] }, { x: 196, y: 132, text: vals[5] },
    { x: 160, y: 110, text: vals[6] }, { x: 34, y: 200, text: vals[7] },
  ]
  f.caption = 'Diagramme de Venn : chaque nombre indique l’effectif de la zone.'
  return f
}

// ── Banques d'énoncés ──
/** Propositions élémentaires (vraies ou fausses) pour les connecteurs « et », « ou ». */
function fact(): { t: string; v: boolean } {
  return pick([
    () => { const n = pick([7, 11, 13, 17, 19, 23, 29]); return { t: `${n} est un nombre premier`, v: true } },
    () => { const n = pick([9, 15, 21, 25, 27, 33]); return { t: `${n} est un nombre premier`, v: false } },
    () => { const n = randInt(2, 30) * 2; return { t: `${n} est pair`, v: true } },
    () => { const n = randInt(2, 30) * 2 + 1; return { t: `${n} est pair`, v: false } },
    () => { const n = randInt(2, 9); return { t: `${n}² = ${n * n}`, v: true } },
    () => { const n = randInt(2, 9); return { t: `${n}² = ${n * n + pick([-1, 1, n])}`, v: false } },
    () => { const n = randInt(2, 9); return { t: `√${n * n} = ${n}`, v: true } },
    () => { const a = randInt(2, 9), b = randInt(2, 9); return { t: `${a * b} est divisible par ${a}`, v: true } },
    () => { const a = randInt(3, 9); const m = a * randInt(2, 9) + randInt(1, a - 1); return { t: `${m} est divisible par ${a}`, v: false } },
  ])()
}

/** Paires (P, Q) pour un réel x ou un entier n, avec les implications P ⇒ Q et Q ⇒ P. */
interface Pair { p: string; q: string; pq: boolean; qp: boolean; why: string }
function pairPQ(): Pair {
  return pick<() => Pair>([
    () => { const a = randInt(2, 8), b = randInt(-3, a - 1); return { p: `x > ${a}`, q: `x > ${fmt(b)}`, pq: true, qp: false, why: `si x > ${a} alors x > ${fmt(b)} ; mais x = ${fmt((a + b) / 2)} vérifie x > ${fmt(b)} sans vérifier x > ${a}` } },
    () => { const a = randInt(2, 6); return { p: `x = ${a}`, q: `x² = ${a * a}`, pq: true, qp: false, why: `si x = ${a} alors x² = ${a * a} ; mais x = −${a} vérifie x² = ${a * a}` } },
    () => { const a = randInt(2, 4); return { p: `x³ = ${a ** 3}`, q: `x = ${a}`, pq: true, qp: true, why: `la fonction cube est strictement croissante : x³ = ${a ** 3} ⇔ x = ${a}` } },
    () => { const a = randInt(1, 4), b = a + randInt(1, 3); return { p: `x > ${a}`, q: `x² > ${b * b}`, pq: false, qp: false, why: `x = ${fmt((a + b) / 2)} vérifie x > ${a} mais pas x² > ${b * b} ; x = −${b + 1} vérifie x² > ${b * b} mais pas x > ${a}` } },
    () => { const k = pick([4, 6, 10]); return { p: `n est divisible par ${k}`, q: `n est pair`, pq: true, qp: false, why: `un multiple de ${k} est pair, mais 2 est pair sans être divisible par ${k}` } },
    () => ({ p: `n est pair`, q: `n² est pair`, pq: true, qp: true, why: `n et n² ont toujours la même parité` }),
    () => { const a = randInt(1, 6); return { p: `|x| < ${a}`, q: `x < ${a}`, pq: true, qp: false, why: `|x| < ${a} signifie −${a} < x < ${a} ; mais x = −${a + 1} vérifie x < ${a} sans |x| < ${a}` } },
    () => ({ p: `x + 1 = 3`, q: `2x = 4`, pq: true, qp: true, why: `les deux équations ont la même unique solution x = 2` }),
    () => { const a = randInt(2, 9); return { p: `x ≥ ${a}`, q: `x > ${a}`, pq: false, qp: true, why: `x > ${a} entraîne x ≥ ${a}, mais x = ${a} vérifie x ≥ ${a} sans vérifier x > ${a}` } },
  ])()
}

/** Implications concrètes de la vie courante (vraies), pour réciproque / contraposée. */
const IMPLICATIONS = [
  { p: 'il pleut', q: 'le sol est mouillé', np: 'il ne pleut pas', nq: 'le sol n’est pas mouillé' },
  { p: 'un quadrilatère est un carré', q: 'c’est un rectangle', np: 'un quadrilatère n’est pas un carré', nq: 'ce n’est pas un rectangle' },
  { p: 'un triangle est équilatéral', q: 'il est isocèle', np: 'un triangle n’est pas équilatéral', nq: 'il n’est pas isocèle' },
  { p: 'un entier est divisible par 4', q: 'il est pair', np: 'un entier n’est pas divisible par 4', nq: 'il n’est pas pair' },
  { p: 'le chevalier a gagné le tournoi', q: 'il a reçu une bourse d’or', np: 'le chevalier n’a pas gagné le tournoi', nq: 'il n’a pas reçu de bourse d’or' },
  { p: 'la forge est allumée', q: 'la cheminée fume', np: 'la forge n’est pas allumée', nq: 'la cheminée ne fume pas' },
  { p: 'un nombre se termine par 0', q: 'il est divisible par 5', np: 'un nombre ne se termine pas par 0', nq: 'il n’est pas divisible par 5' },
] as const

/** Prédicats pour les négations de propositions quantifiées. */
function predicate(): { t: string; neg: string; v: string; dom: string } {
  return pick([
    () => { const a = randInt(-5, 9); return { t: `f(x) > ${fmt(a)}`, neg: `f(x) ≤ ${fmt(a)}`, v: 'x', dom: 'ℝ' } },
    () => { const a = randInt(-5, 9); return { t: `f(x) ≤ ${fmt(a)}`, neg: `f(x) > ${fmt(a)}`, v: 'x', dom: 'ℝ' } },
    () => ({ t: `n est pair`, neg: `n est impair`, v: 'n', dom: 'ℕ' }),
    () => { const a = randInt(2, 30); return { t: `uₙ < ${a}`, neg: `uₙ ≥ ${a}`, v: 'n', dom: 'ℕ' } },
    () => { const a = randInt(1, 9); return { t: `x² ≥ ${a}`, neg: `x² < ${a}`, v: 'x', dom: 'ℝ' } },
    () => ({ t: `g(x) = 0`, neg: `g(x) ≠ 0`, v: 'x', dom: 'ℝ' }),
  ])()
}

// ═══ Entraînement ═══════════════════════════════════════════════════════
const tiers: Tiers = [
  // ── Palier 1 : rappels guidés ──
  [
    // Intersection, réunion
    variants(
      () => {
        const A = randSet(1, 12, randInt(4, 6)), B = randSet(1, 12, randInt(4, 6))
        return intSet(`A = ${setText(A)} et B = ${setText(B)}. Écris A ∩ B (les éléments communs à A et à B).`, inter(A, B),
          `On garde les éléments présents dans les deux ensembles : A ∩ B = ${setText(inter(A, B))}.`)
      },
      () => {
        const A = randSet(1, 10, randInt(3, 4)), B = randSet(1, 10, randInt(3, 4))
        return intSet(`A = ${setText(A)} et B = ${setText(B)}. Écris A ∪ B (les éléments de A ou de B).`, union(A, B),
          `On réunit tous les éléments, sans répétition : A ∪ B = ${setText(union(A, B))}.`)
      },
      () => {
        const k = pick([2, 3]), N = pick([12, 18, 20, 24, 30])
        const D = range(1, N).filter((d) => N % d === 0), M = range(1, 15).filter((x) => x % k === 0)
        return intSet(`A est l'ensemble des diviseurs positifs de ${N}, B l'ensemble des multiples de ${k} compris entre 1 et 15. Écris A ∩ B.`, inter(D, M),
          `A = ${setText(D)}, B = ${setText(M)} ; éléments communs : ${setText(inter(D, M))}.`)
      },
      () => {
        const A = randSet(1, 12, randInt(4, 6)), B = randSet(1, 12, randInt(4, 6))
        return intSet(`A = ${setText(A)} et B = ${setText(B)}. Écris A ∖ B (« A privé de B » : les éléments de A qui ne sont pas dans B).`, minus(A, B),
          `On retire de A les éléments qui sont aussi dans B : ${setText(minus(A, B))}.`)
      },
    ),
    // Cardinal d'un ensemble défini en compréhension
    variants(
      fresh(() => {
        const N = randInt(10, 90)
        const n = Math.floor(Math.sqrt(N - 1e-9)) + 1
        return num(`Combien d'éléments l'ensemble {n ∈ ℕ | n² < ${N}} contient-il ? (0 est un entier naturel.)`, n,
          `n² < ${N} pour n = 0, 1, …, ${n - 1} (car ${n - 1}² = ${(n - 1) ** 2} < ${N} ≤ ${n}² = ${n * n}) : ${n} éléments.`)
      }),
      fresh(() => {
        const k = randInt(3, 9), N = randInt(30, 120)
        return num(`Combien y a-t-il de multiples de ${k} entre 1 et ${N} (inclus) ?`, Math.floor(N / k),
          `Les multiples sont ${k}, ${2 * k}, …, ${k * Math.floor(N / k)} = ${k} × ${Math.floor(N / k)} : il y en a ${Math.floor(N / k)}.`)
      }),
      fresh(() => {
        const N = pick([12, 18, 20, 24, 28, 30, 36, 40, 45, 48, 60])
        const D = range(1, N).filter((d) => N % d === 0)
        return num(`Quel est le cardinal de l'ensemble des diviseurs positifs de ${N} ?`, D.length,
          `Diviseurs de ${N} : ${setText(D)}, soit ${D.length} éléments.`)
      }),
      fresh(() => {
        const a = randInt(2, 9), b = randInt(1, 9)
        return num(`Combien d'éléments l'ensemble {x ∈ ℤ | −${a} ≤ x < ${b}} contient-il ?`, a + b,
          `Les entiers de −${a} à ${b - 1} : ${b - 1} − (−${a}) + 1 = ${a + b} éléments.`)
      }),
    ),
    // Vrai ou faux : propositions quantifiées simples
    variants(
      () => {
        const a = randInt(1, 9), s = pick([1, -1])
        return vf(`Vrai ou faux : « Il existe un réel x tel que x² = ${s < 0 ? '−' : ''}${a} ». (« Il existe » se note ∃.)`, s > 0,
          s > 0 ? `x = √${a} convient : la proposition est vraie (un seul exemple suffit).` : `Un carré est toujours positif ou nul : aucun réel ne convient, c'est faux.`)
      },
      () => {
        const it = pick([
          { t: '∀x ∈ ℝ, x² ≥ 0', v: true, e: 'Un carré est toujours positif ou nul.' },
          { t: '∀x ∈ ℝ, x² > 0', v: false, e: 'x = 0 donne 0² = 0, qui n’est pas strictement positif.' },
          { t: '∀n ∈ ℕ, n² ≥ n', v: true, e: 'Pour n ≥ 1, n² = n × n ≥ n ; et 0² = 0.' },
          { t: '∀x ∈ ℝ, x² ≥ x', v: false, e: 'x = 0,5 donne 0,25 < 0,5.' },
          { t: '∀x ∈ ℝ, |x| ≥ 0', v: true, e: 'Une valeur absolue est toujours positive ou nulle.' },
          { t: '∀n ∈ ℕ, n + 1 > n', v: true, e: 'Ajouter 1 augmente toujours le nombre.' },
          { t: '∀x ∈ ℝ, 2x > x', v: false, e: 'x = −1 : 2x = −2 < −1.' },
        ])
        return vf(`Vrai ou faux : « ${it.t} » (∀ se lit « pour tout »).`, it.v, it.e)
      },
      () => {
        const k = randInt(3, 40)
        return vf(`Vrai ou faux : « ∃n ∈ ℕ, 2n + 1 = ${k} » (il existe un entier naturel n tel que 2n + 1 = ${k}).`, k % 2 === 1,
          k % 2 === 1 ? `n = ${(k - 1) / 2} convient.` : `2n + 1 est toujours impair, et ${k} est pair : aucun n ne convient.`)
      },
      () => {
        const a = randInt(1, 9), s = pick([1, -1])
        return vf(`Vrai ou faux : « Pour tout réel x, x ${s < 0 ? '−' : '+'} ${a} > x ».`, s > 0,
          s > 0 ? `Ajouter ${a} > 0 augmente toujours x : vrai.` : `Retirer ${a} diminue x : x − ${a} < x pour tout x, la proposition est fausse.`)
      },
    ),
    // « et », « ou »
    variants(
      () => {
        const P = fact(), Q = fact()
        return vf(`Vrai ou faux : « ${P.t} et ${Q.t} ». (« P et Q » est vraie seulement si P et Q sont toutes deux vraies.)`, P.v && Q.v,
          `« ${P.t} » est ${P.v ? 'vraie' : 'fausse'}, « ${Q.t} » est ${Q.v ? 'vraie' : 'fausse'} : la conjonction est ${P.v && Q.v ? 'vraie' : 'fausse'}.`)
      },
      () => {
        const P = fact(), Q = fact()
        return vf(`Vrai ou faux : « ${P.t} ou ${Q.t} ». (« P ou Q » est vraie dès que l'une au moins est vraie.)`, P.v || Q.v,
          `« ${P.t} » est ${P.v ? 'vraie' : 'fausse'}, « ${Q.t} » est ${Q.v ? 'vraie' : 'fausse'} : la disjonction est ${P.v || Q.v ? 'vraie' : 'fausse'}.`)
      },
      () => {
        const P = fact()
        return vf(`Vrai ou faux : « non (${P.t}) ».`, !P.v, `« ${P.t} » est ${P.v ? 'vraie' : 'fausse'}, donc sa négation est ${P.v ? 'fausse' : 'vraie'}.`)
      },
      () => {
        const P = fact(), Q = fact()
        return vf(`Vrai ou faux : « ${P.t} ou ${Q.t} », sachant que le « ou » mathématique est inclusif (les deux peuvent être vraies).`, P.v || Q.v,
          `Il suffit qu'une des deux soit vraie : ${P.v || Q.v ? 'c’est le cas' : 'aucune ne l’est'}, la proposition est ${P.v || Q.v ? 'vraie' : 'fausse'}.`)
      },
    ),
    // Appartenance et inclusion
    variants(
      () => {
        const B = randSet(1, 12, 7), inside = Math.random() < 0.5
        const A = inside ? sortNum(shuffle(B).slice(0, 3)) : sortNum([...shuffle(B).slice(0, 2), pick(minus(range(1, 12), B))])
        return vf(`A = ${setText(A)} et B = ${setText(B)}. Vrai ou faux : A ⊂ B (A est inclus dans B) ?`, inside,
          inside ? `Chaque élément de A appartient à B : A ⊂ B.` : `${minus(A, B).join(', ')} appartient à A mais pas à B : A n'est pas inclus dans B.`)
      },
      () => {
        const A = randSet(1, 12, 5), B = randSet(1, 12, 5), x = randInt(1, 12)
        return vf(`A = ${setText(A)} et B = ${setText(B)}. Vrai ou faux : ${x} ∈ A ∩ B ?`, A.includes(x) && B.includes(x),
          `${x} ${A.includes(x) ? '∈' : '∉'} A et ${x} ${B.includes(x) ? '∈' : '∉'} B : ${x} ${A.includes(x) && B.includes(x) ? '∈' : '∉'} A ∩ B.`)
      },
      () => {
        const A = randSet(1, 12, 4), B = randSet(1, 12, 4), x = pick(union(A, B))
        return vf(`A = ${setText(A)} et B = ${setText(B)}. Vrai ou faux : ${x} ∈ A ∪ B ?`, true,
          `${x} appartient à ${A.includes(x) ? 'A' : 'B'}, donc à la réunion A ∪ B.`)
      },
      fresh(() => {
        const A = randSet(1, 15, randInt(5, 7)), B = randSet(1, 15, randInt(5, 7))
        return num(`A = ${setText(A)} et B = ${setText(B)}. Combien d'éléments de A n'appartiennent pas à B ?`, minus(A, B).length,
          `A ∖ B = ${setText(minus(A, B))} : ${minus(A, B).length} élément(s).`)
      }),
    ),
  ],
  // ── Palier 2 ──
  [
    // Complémentaire, différence
    variants(
      () => {
        const n = randInt(8, 12), A = randSet(1, n, randInt(3, 6))
        return intSet(`E = {1 ; 2 ; … ; ${n}} et A = ${setText(A)}. Écris le complémentaire de A dans E.`, minus(range(1, n), A),
          `Ce sont les éléments de E qui ne sont pas dans A : ${setText(minus(range(1, n), A))}.`)
      },
      () => {
        const n = randInt(8, 10), A = randSet(1, n, 3), B = randSet(1, n, 3)
        return intSet(`E = {1 ; 2 ; … ; ${n}}, A = ${setText(A)} et B = ${setText(B)}. Écris le complémentaire de A ∪ B dans E.`, minus(range(1, n), union(A, B)),
          `A ∪ B = ${setText(union(A, B))} ; son complémentaire : ${setText(minus(range(1, n), union(A, B)))}.`)
      },
      () => {
        const n = randInt(8, 10), A = randSet(1, n, 5), B = randSet(1, n, 5)
        return intSet(`E = {1 ; 2 ; … ; ${n}}, A = ${setText(A)} et B = ${setText(B)}. Écris le complémentaire de A ∩ B dans E.`, minus(range(1, n), inter(A, B)),
          `A ∩ B = ${setText(inter(A, B))} ; son complémentaire : ${setText(minus(range(1, n), inter(A, B)))}.`)
      },
      () => {
        const A = randSet(1, 12, 6), B = randSet(1, 12, 5)
        return intSet(`A = ${setText(A)} et B = ${setText(B)}. Écris B ∖ A (éléments de B qui ne sont pas dans A).`, minus(B, A),
          `On retire de B les éléments de A : ${setText(minus(B, A))}.`)
      },
    ),
    // Négation d'une proposition quantifiée
    variants(
      () => {
        const P = predicate()
        return choice(`Quelle est la négation de « ∀${P.v} ∈ ${P.dom}, ${P.t} » ?`, `∃${P.v} ∈ ${P.dom}, ${P.neg}`,
          [`∀${P.v} ∈ ${P.dom}, ${P.neg}`, `∃${P.v} ∈ ${P.dom}, ${P.t}`, `∀${P.v} ∉ ${P.dom}, ${P.t}`],
          `On remplace « pour tout » par « il existe » et on nie la propriété : ∃${P.v} ∈ ${P.dom}, ${P.neg}.`)
      },
      () => {
        const P = predicate()
        return choice(`Quelle est la négation de « ∃${P.v} ∈ ${P.dom}, ${P.t} » ?`, `∀${P.v} ∈ ${P.dom}, ${P.neg}`,
          [`∃${P.v} ∈ ${P.dom}, ${P.neg}`, `∀${P.v} ∈ ${P.dom}, ${P.t}`, `∃${P.v} ∉ ${P.dom}, ${P.neg}`],
          `« Il existe » devient « pour tout » et la propriété est niée : ∀${P.v} ∈ ${P.dom}, ${P.neg}.`)
      },
      () => {
        const it = pick([
          { t: 'Tous les chevaliers sont courageux.', n: 'Au moins un chevalier n’est pas courageux.', d: ['Aucun chevalier n’est courageux.', 'Tous les chevaliers sont lâches.', 'Au moins un chevalier est courageux.'] },
          { t: 'Il existe un dragon qui crache du feu.', n: 'Aucun dragon ne crache du feu.', d: ['Il existe un dragon qui ne crache pas de feu.', 'Tous les dragons crachent du feu.', 'Au moins un dragon crache de l’eau.'] },
          { t: 'Tous les élèves ont réussi l’examen.', n: 'Au moins un élève a échoué à l’examen.', d: ['Tous les élèves ont échoué à l’examen.', 'Aucun élève n’a réussi l’examen.', 'Au moins un élève a réussi l’examen.'] },
          { t: 'Il existe une porte du château qui est ouverte.', n: 'Toutes les portes du château sont fermées.', d: ['Il existe une porte du château qui est fermée.', 'Toutes les portes du château sont ouvertes.', 'Aucune porte n’est fermée.'] },
        ])
        return choice(`Quelle est la négation de : « ${it.t} » ?`, it.n, it.d, `Nier « pour tout … » donne « il existe … qui ne … pas », et inversement : ${it.n}`)
      },
      () => {
        const a = randInt(1, 9)
        return choice(`Quelle est la négation de « ∀x ∈ ℝ, x² + ${a} > 0 » ? (Puis demande-toi laquelle des deux est vraie.)`, `∃x ∈ ℝ, x² + ${a} ≤ 0`,
          [`∀x ∈ ℝ, x² + ${a} ≤ 0`, `∃x ∈ ℝ, x² + ${a} < 0`, `∀x ∈ ℝ, x² + ${a} < 0`],
          `Négation : ∃x ∈ ℝ, x² + ${a} ≤ 0 (attention : la négation de « > » est « ≤ »). C'est la proposition initiale qui est vraie.`)
      },
    ),
    // Réciproque, contraposée
    variants(
      () => {
        const I = pick(IMPLICATIONS)
        return choice(`Quelle est la contraposée de « Si ${I.p}, alors ${I.q} » ?`, `Si ${I.nq}, alors ${I.np}`,
          [`Si ${I.q}, alors ${I.p}`, `Si ${I.np}, alors ${I.nq}`, `${cap1(I.p)} et ${I.nq}`],
          `La contraposée de « si P alors Q » est « si non Q alors non P » ; elle a la même valeur de vérité que l'implication.`)
      },
      () => {
        const I = pick(IMPLICATIONS)
        return choice(`Quelle est la réciproque de « Si ${I.p}, alors ${I.q} » ?`, `Si ${I.q}, alors ${I.p}`,
          [`Si ${I.nq}, alors ${I.np}`, `Si ${I.np}, alors ${I.nq}`, `${cap1(I.p)} ou ${I.q}`],
          `La réciproque de « si P alors Q » est « si Q alors P » (on échange hypothèse et conclusion).`)
      },
      () => {
        const I = pick(IMPLICATIONS)
        return vf(`On sait que « Si ${I.p}, alors ${I.q} » est vraie. Vrai ou faux : on peut en déduire « Si ${I.nq}, alors ${I.np} » ?`, true,
          `C'est la contraposée : elle est toujours équivalente à l'implication de départ.`)
      },
      () => {
        const I = pick(IMPLICATIONS)
        return vf(`On sait que « Si ${I.p}, alors ${I.q} » est vraie. Vrai ou faux : on peut en déduire « Si ${I.np}, alors ${I.nq} » ?`, false,
          `Non : « Si ${I.np}, alors ${I.nq} » est la contraposée de la réciproque « Si ${I.q}, alors ${I.p} », qui n'est pas forcément vraie.`)
      },
    ),
    // Produit cartésien
    variants(
      fresh(() => {
        const A = randSet(1, 9, randInt(2, 5)), B = randSet(1, 9, randInt(2, 6))
        return num(`A = ${setText(A)} et B = ${setText(B)}. Combien d'éléments le produit cartésien A × B (ensemble des couples (a ; b) avec a ∈ A et b ∈ B) contient-il ?`, A.length * B.length,
          `card(A × B) = card(A) × card(B) = ${A.length} × ${B.length} = ${A.length * B.length}.`)
      }),
      fresh(() => {
        const A = randSet(1, 9, randInt(3, 4)), B = randSet(1, 9, randInt(3, 4))
        const c = A.flatMap((a) => B.filter((b) => a < b)).length
        return num(`A = ${setText(A)} et B = ${setText(B)}. Combien de couples (a ; b) de A × B vérifient a < b ?`, c,
          `On compte, pour chaque a de A, les b de B plus grands : ${A.map((a) => `${a} → ${B.filter((b) => a < b).length}`).join(' ; ')}, soit ${c} couples.`)
      }),
      () => {
        const A = randSet(1, 6, 3), B = randSet(1, 6, 3), x = randInt(1, 6), y = randInt(1, 6)
        const v = A.includes(x) && B.includes(y)
        return vf(`A = ${setText(A)} et B = ${setText(B)}. Vrai ou faux : (${x} ; ${y}) ∈ A × B ?`, v,
          `Il faut ${x} ∈ A et ${y} ∈ B : ${x} ${A.includes(x) ? '∈' : '∉'} A, ${y} ${B.includes(y) ? '∈' : '∉'} B.`)
      },
      fresh(() => {
        const n = randInt(2, 6), k = pick([2, 3])
        return num(`E = {1 ; … ; ${n}}. Combien d'éléments ${k === 2 ? 'E × E = E²' : 'E × E × E = E³'} contient-il ?`, n ** k,
          `card(E${k === 2 ? '²' : '³'}) = card(E)^${k} = ${n}^${k} = ${n ** k}.`)
      }),
    ),
    // Cardinal d'une réunion
    variants(
      fresh(() => {
        const c = randInt(2, 10), a = c + randInt(3, 15), b = c + randInt(3, 15)
        return num(`card(A) = ${a}, card(B) = ${b} et card(A ∩ B) = ${c}. Calcule card(A ∪ B).`, a + b - c,
          `card(A ∪ B) = card(A) + card(B) − card(A ∩ B) = ${a} + ${b} − ${c} = ${a + b - c} (on ne compte pas deux fois l'intersection).`)
      }),
      fresh(() => {
        const c = randInt(3, 12), a = c + randInt(4, 15), b = c + randInt(4, 15)
        return num(`Dans une garnison, ${a} soldats savent tirer à l'arc, ${b} savent monter à cheval, et ${c} savent faire les deux. Combien de soldats savent faire au moins l'une des deux choses ?`, a + b - c,
          `${a} + ${b} − ${c} = ${a + b - c} : les ${c} soldats polyvalents ne doivent être comptés qu'une fois.`)
      }),
      fresh(() => {
        const c = randInt(3, 12), a = c + randInt(4, 15), b = c + randInt(4, 15)
        return num(`Dans une classe, ${a} élèves étudient l'espagnol, ${b} l'allemand, et ${a + b - c} étudient au moins l'une des deux langues. Combien étudient les deux ?`, c,
          `card(A ∩ B) = card(A) + card(B) − card(A ∪ B) = ${a} + ${b} − ${a + b - c} = ${c}.`)
      }),
      fresh(() => {
        const c = randInt(2, 8), a = c + randInt(3, 10), b = c + randInt(3, 10), N = a + b - c + randInt(2, 15)
        return withMeta(num(`Le diagramme représente les ${N} habitants d'un hameau : A = « possède une vache », B = « possède un cheval ». Combien d'habitants ne possèdent ni vache ni cheval ?`, N - (a + b - c),
          `card(A ∪ B) = ${a - c} + ${c} + ${b - c} = ${a + b - c} ; il reste ${N} − ${a + b - c} = ${N - (a + b - c)} habitants.`), { figure: venn2(['A', 'B'], [String(a - c), String(c), String(b - c), '?']) })
      }),
    ),
  ],
  // ── Palier 3 : standard de Terminale ──
  [
    // Condition nécessaire, suffisante
    variants(
      () => {
        const P = pairPQ()
        const ans = P.pq && P.qp ? 'nécessaire et suffisante' : P.pq ? 'suffisante mais pas nécessaire' : P.qp ? 'nécessaire mais pas suffisante' : 'ni nécessaire ni suffisante'
        return choice(`« ${P.p} » est une condition … pour que « ${P.q} ».`, ans,
          ['nécessaire et suffisante', 'suffisante mais pas nécessaire', 'nécessaire mais pas suffisante', 'ni nécessaire ni suffisante'],
          `P est suffisante pour Q si P ⇒ Q, nécessaire si Q ⇒ P. Ici ${P.why}.`)
      },
      () => {
        const P = pairPQ()
        const ans = P.pq && P.qp ? 'nécessaire et suffisante' : P.qp ? 'suffisante mais pas nécessaire' : P.pq ? 'nécessaire mais pas suffisante' : 'ni nécessaire ni suffisante'
        return choice(`« ${P.q} » est une condition … pour que « ${P.p} ».`, ans,
          ['nécessaire et suffisante', 'suffisante mais pas nécessaire', 'nécessaire mais pas suffisante', 'ni nécessaire ni suffisante'],
          `« ${P.q} » est suffisante si elle entraîne « ${P.p} », nécessaire si « ${P.p} » l'entraîne. Ici ${P.why}.`)
      },
      () => {
        const P = pairPQ()
        return vf(`Vrai ou faux : pour un réel x (ou un entier n), « ${P.p} » ⇔ « ${P.q} ».`, P.pq && P.qp,
          `L'équivalence demande les deux implications. Ici ${P.why}.`)
      },
    ),
    // Implication et réciproque
    variants(
      () => {
        const P = pairPQ()
        const ans = P.pq && P.qp ? 'L’implication et sa réciproque sont vraies' : P.pq ? 'Seule l’implication est vraie' : P.qp ? 'Seule la réciproque est vraie' : 'Aucune des deux n’est vraie'
        return choice(`On considère l'implication « Si ${P.p}, alors ${P.q} ». Que peut-on dire de cette implication et de sa réciproque ?`, ans,
          ['L’implication et sa réciproque sont vraies', 'Seule l’implication est vraie', 'Seule la réciproque est vraie', 'Aucune des deux n’est vraie'],
          `Réciproque : « Si ${P.q}, alors ${P.p} ». Ici ${P.why}.`)
      },
      () => {
        const P = pairPQ()
        return vf(`Vrai ou faux : « Si ${P.p}, alors ${P.q} ».`, P.pq, `Ici ${P.why}.`)
      },
      () => {
        const P = pairPQ()
        return vf(`Vrai ou faux : la réciproque de « Si ${P.p}, alors ${P.q} » est vraie.`, P.qp, `La réciproque est « Si ${P.q}, alors ${P.p} ». Ici ${P.why}.`)
      },
    ),
    // Contre-exemple (réponse ouverte vérifiée)
    variants(
      () => counter(`« Tout entier impair est premier. » Donne un contre-exemple (un entier impair qui n'est pas premier).`, (x) => Number.isInteger(x) && x > 0 && x % 2 === 1 && !isPrime(x), 9,
        `9 = 3 × 3 est impair mais pas premier (15, 21, 25… conviennent aussi ; 1 aussi, car 1 n'est pas premier).`, 'Un entier'),
      () => counter(`« Pour tout réel x, x² ≥ x. » Donne un réel x qui contredit cette affirmation.`, (x) => x * x < x, 0.5,
        `Tout x strictement entre 0 et 1 convient : par exemple 0,5² = 0,25 < 0,5.`),
      () => {
        const a = randInt(2, 9)
        return counter(`« Pour tout réel x, (x + ${a})² = x² + ${a * a}. » Donne un réel x qui contredit cette affirmation.`, (x) => Math.abs((x + a) ** 2 - x * x - a * a) > 1e-9, 1,
          `(x + ${a})² = x² + ${2 * a}x + ${a * a} : l'égalité n'est vraie que pour x = 0. Tout x ≠ 0 est un contre-exemple, par exemple x = 1.`)
      },
      () => counter(`« Pour tout réel x, √(x²) = x. » Donne un réel x qui contredit cette affirmation.`, (x) => x < 0, -1,
        `√(x²) = |x| : pour x < 0, par exemple x = −1, √1 = 1 ≠ −1.`),
      () => {
        const [a, b] = pick([[4, 8], [6, 4], [6, 9], [10, 4], [9, 6], [15, 10], [4, 6]] as const)
        const ex = a * pick([1, 3, 5].filter((m) => (a * m) % b !== 0))
        return counter(`« Tout multiple de ${a} est un multiple de ${b}. » Donne un contre-exemple (entier positif).`, (x) => Number.isInteger(x) && x > 0 && x % a === 0 && x % b !== 0, ex,
          `${ex} est un multiple de ${a} mais pas de ${b}.`, 'Un entier')
      },
    ),
    // Ensembles de réels : intervalles
    variants(
      () => {
        const a = randInt(-6, 0), b = randInt(2, 8), c = randInt(a + 1, b - 1), d = b + randInt(1, 5)
        const A: Interval = { lo: a, hi: b, loClosed: true, hiClosed: true }, B: Interval = { lo: c, hi: d, loClosed: false, hiClosed: Math.random() < 0.5 }
        const R: Interval = { lo: c, hi: b, loClosed: false, hiClosed: true }
        return interval(`A = ${intervalText(A)} et B = ${intervalText(B)}. Écris A ∩ B sous forme d'intervalle.`, R,
          { explanation: `Les réels communs vont de ${fmt(c)} (exclu, car exclu de B) à ${fmt(b)} (inclus dans les deux) : ${intervalText(R)}.` })
      },
      () => {
        const a = randInt(-6, 0), b = randInt(2, 8), c = randInt(a + 1, b - 1), d = b + randInt(1, 5)
        const hc = Math.random() < 0.5
        const A: Interval = { lo: a, hi: b, loClosed: true, hiClosed: false }, B: Interval = { lo: c, hi: d, loClosed: true, hiClosed: hc }
        const R: Interval = { lo: a, hi: d, loClosed: true, hiClosed: hc }
        return interval(`A = ${intervalText(A)} et B = ${intervalText(B)}. Écris A ∪ B sous forme d'intervalle.`, R,
          { explanation: `Les intervalles se chevauchent : la réunion va de ${fmt(a)} à ${fmt(d)} avec les crochets des extrémités : ${intervalText(R)}.` })
      },
      () => {
        const a = randInt(-9, 9), closed = Math.random() < 0.5
        const A: Interval = { lo: -Infinity, hi: a, loClosed: false, hiClosed: closed }
        const R: Interval = { lo: a, hi: Infinity, loClosed: !closed, hiClosed: false }
        return interval(`A = ${intervalText(A)}. Écris le complémentaire de A dans ℝ.`, R,
          { explanation: `Ce sont les réels qui ne sont pas dans A, c'est-à-dire x ${closed ? '>' : '≥'} ${fmt(a)} : ${intervalText(R)}.` })
      },
      () => {
        const a = randInt(-6, 2), b = a + randInt(2, 6), c = randInt(a + 1, b - 1)
        const A: Interval = { lo: a, hi: b, loClosed: true, hiClosed: true }
        const R: Interval = { lo: a, hi: c, loClosed: true, hiClosed: false }
        return interval(`A = ${intervalText(A)} et B = [${fmt(c)} ; +∞[. Écris A ∖ B (réels de A qui ne sont pas dans B).`, R,
          { explanation: `On retire de A les réels ≥ ${fmt(c)} : il reste ${intervalText(R)}.` })
      },
    ),
    // Négation de « et », « ou », « si … alors »
    variants(
      () => {
        const a = randInt(-5, 3), b = a + randInt(2, 8)
        return choice(`Quelle est la négation de « x > ${fmt(a)} et x < ${fmt(b)} » ?`, `x ≤ ${fmt(a)} ou x ≥ ${fmt(b)}`,
          [`x ≤ ${fmt(a)} et x ≥ ${fmt(b)}`, `x < ${fmt(a)} ou x > ${fmt(b)}`, `x ≥ ${fmt(a)} et x ≤ ${fmt(b)}`],
          `Non (P et Q) = (non P) ou (non Q), et la négation de « > » est « ≤ » : x ≤ ${fmt(a)} ou x ≥ ${fmt(b)}.`)
      },
      () => {
        const it = pick([
          { t: 'Il pleut et il fait froid.', n: 'Il ne pleut pas ou il ne fait pas froid.', d: ['Il ne pleut pas et il ne fait pas froid.', 'Il pleut ou il fait froid.', 'Il pleut et il ne fait pas froid.'] },
          { t: 'Le roi est riche ou le roi est puissant.', n: 'Le roi n’est ni riche ni puissant.', d: ['Le roi n’est pas riche ou n’est pas puissant.', 'Le roi est pauvre et puissant.', 'Le roi est riche et puissant.'] },
          { t: 'Le pont est levé et la herse est baissée.', n: 'Le pont n’est pas levé ou la herse n’est pas baissée.', d: ['Le pont n’est pas levé et la herse n’est pas baissée.', 'Le pont est baissé et la herse est levée.', 'Le pont est levé ou la herse est baissée.'] },
        ])
        return choice(`Quelle est la négation de : « ${it.t} » ?`, it.n, it.d, `Lois de De Morgan : non (P et Q) = non P ou non Q ; non (P ou Q) = non P et non Q.`)
      },
      () => {
        const I = pick(IMPLICATIONS)
        return choice(`Quelle est la négation de « Si ${I.p}, alors ${I.q} » ?`, `${cap1(I.p)} et ${I.nq}`,
          [`Si ${I.np}, alors ${I.nq}`, `Si ${I.nq}, alors ${I.np}`, `${cap1(I.np)} ou ${I.q}`],
          `« Si P alors Q » est fausse uniquement quand P est vraie et Q fausse : sa négation est « P et non Q ».`)
      },
      () => {
        const a = randInt(1, 9)
        return choice(`Quelle est la négation de « x < −${a} ou x > ${a} » ?`, `−${a} ≤ x ≤ ${a}`, [`−${a} < x < ${a}`, `x ≥ −${a} ou x ≤ ${a}`, `x > −${a} et x < ${a}`],
          `Non (P ou Q) = non P et non Q : x ≥ −${a} et x ≤ ${a}, soit −${a} ≤ x ≤ ${a}.`)
      },
    ),
  ],
  // ── Palier 4 ──
  [
    // Deux quantificateurs : vrai ou faux
    variants(
      () => {
        const it = pick([
          { t: '∀x ∈ ℝ, ∃y ∈ ℝ, y > x', v: true, e: 'Pour x donné, y = x + 1 convient.' },
          { t: '∃y ∈ ℝ, ∀x ∈ ℝ, y > x', v: false, e: 'Aucun réel n’est plus grand que tous les réels (il ne serait pas plus grand que y + 1).' },
          { t: '∀x ∈ ℝ, ∃y ∈ ℝ, x = y²', v: false, e: 'x = −1 n’est le carré d’aucun réel.' },
          { t: '∀x ∈ [0 ; +∞[, ∃y ∈ ℝ, x = y²', v: true, e: 'y = √x convient.' },
          { t: '∃x ∈ ℝ, ∀y ∈ ℝ, xy = 0', v: true, e: 'x = 0 convient : 0 × y = 0 pour tout y.' },
          { t: '∀x ∈ ℝ, ∃y ∈ ℝ, xy = 1', v: false, e: 'Pour x = 0, aucun y ne vérifie 0 × y = 1.' },
          { t: '∃n ∈ ℕ, ∀m ∈ ℕ, n ≤ m', v: true, e: 'n = 0 est inférieur ou égal à tous les entiers naturels.' },
          { t: '∀n ∈ ℕ, ∃m ∈ ℕ, m < n', v: false, e: 'Pour n = 0, aucun entier naturel n’est strictement plus petit.' },
        ])
        return vf(`Vrai ou faux : « ${it.t} » ?`, it.v, it.e)
      },
      () => {
        const k = randInt(1, 9)
        return pick([
          () => vf(`Vrai ou faux : « ∀n ∈ ℕ, ∃m ∈ ℕ, m = n + ${k} » ?`, true, `Pour n donné, m = n + ${k} est un entier naturel.`),
          () => vf(`Vrai ou faux : « ∀n ∈ ℕ, ∃m ∈ ℕ, n = m + ${k} » ?`, false, `Pour n = 0, il faudrait m = −${k}, qui n'est pas un entier naturel.`),
          () => vf(`Vrai ou faux : « ∃m ∈ ℕ, ∀n ∈ ℕ, m > n + ${k} » ?`, false, `Aucun entier ne dépasse tous les n + ${k} (prendre n = m).`),
        ])()
      },
      () => {
        const a = randInt(2, 9)
        return pick([
          () => vf(`Vrai ou faux : « ∀x ∈ ℝ, ∃y ∈ ℝ, x + y = ${a} » ?`, true, `Pour x donné, y = ${a} − x convient.`),
          () => vf(`Vrai ou faux : « ∃y ∈ ℝ, ∀x ∈ ℝ, x + y = ${a} » ?`, false, `y devrait valoir ${a} − x pour tous les x à la fois : impossible.`),
          () => vf(`Vrai ou faux : « ∃x ∈ ℝ, ∀y ∈ ℝ, x × y = ${a} » ?`, false, `Pour y = 0, x × 0 = 0 ≠ ${a}.`),
        ])()
      },
    ),
    // Trois ensembles : inclusion-exclusion
    variants(
      fresh(() => {
        const abc = randInt(1, 4), ab = abc + randInt(1, 5), ac = abc + randInt(1, 5), bc = abc + randInt(1, 5)
        const a = ab + ac - abc + randInt(2, 10), b = ab + bc - abc + randInt(2, 10), c = ac + bc - abc + randInt(2, 10)
        const u = a + b + c - ab - ac - bc + abc
        return num(`card(A) = ${a}, card(B) = ${b}, card(C) = ${c}, card(A ∩ B) = ${ab}, card(A ∩ C) = ${ac}, card(B ∩ C) = ${bc} et card(A ∩ B ∩ C) = ${abc}. Calcule card(A ∪ B ∪ C).`, u,
          `Formule du crible : ${a} + ${b} + ${c} − ${ab} − ${ac} − ${bc} + ${abc} = ${u}.`)
      }),
      fresh(() => {
        const abc = randInt(1, 4), ab = abc + randInt(1, 5), ac = abc + randInt(1, 5), bc = abc + randInt(1, 5)
        const a = ab + ac - abc + randInt(2, 10), b = ab + bc - abc + randInt(2, 10), c = ac + bc - abc + randInt(2, 10)
        const u = a + b + c - ab - ac - bc + abc, N = u + randInt(3, 20)
        return num(`Sur ${N} villageois, ${a} élèvent des poules, ${b} des chèvres, ${c} des moutons ; ${ab} élèvent poules et chèvres, ${ac} poules et moutons, ${bc} chèvres et moutons, et ${abc} les trois. Combien n'élèvent aucun de ces animaux ?`, N - u,
          `Éleveurs d'au moins une espèce : ${a} + ${b} + ${c} − ${ab} − ${ac} − ${bc} + ${abc} = ${u}. Aucun : ${N} − ${u} = ${N - u}.`)
      }),
      fresh(() => {
        const vals = [randInt(2, 9), randInt(2, 9), randInt(2, 9), randInt(1, 6), randInt(1, 6), randInt(1, 6), randInt(1, 4), randInt(2, 12)]
        const u = vals.slice(0, 7).reduce((s, v) => s + v, 0)
        return withMeta(num(`D'après le diagramme, combien d'éléments appartiennent à A ∪ B ∪ C ?`, u,
          `On additionne les sept zones intérieures aux cercles : ${vals.slice(0, 7).join(' + ')} = ${u}.`), { figure: venn3(['A', 'B', 'C'], vals.map(String)) })
      }),
      fresh(() => {
        const vals = [randInt(2, 9), randInt(2, 9), randInt(2, 9), randInt(1, 6), randInt(1, 6), randInt(1, 6), randInt(1, 4), randInt(2, 12)]
        const one = vals[0] + vals[1] + vals[2]
        return withMeta(num(`D'après le diagramme, combien d'éléments appartiennent à exactement un des trois ensembles A, B, C ?`, one,
          `Ce sont les zones « A seul », « B seul » et « C seul » : ${vals[0]} + ${vals[1]} + ${vals[2]} = ${one}.`), { figure: venn3(['A', 'B', 'C'], vals.map(String)) })
      }),
    ),
    // Négation de propositions à deux quantificateurs
    variants(
      () => {
        const a = randInt(1, 9)
        return choice(`Quelle est la négation de « ∀x ∈ ℝ, ∃y ∈ ℝ, y > x + ${a} » ?`, `∃x ∈ ℝ, ∀y ∈ ℝ, y ≤ x + ${a}`,
          [`∃x ∈ ℝ, ∃y ∈ ℝ, y ≤ x + ${a}`, `∀x ∈ ℝ, ∀y ∈ ℝ, y ≤ x + ${a}`, `∃y ∈ ℝ, ∀x ∈ ℝ, y > x + ${a}`],
          `On échange chaque quantificateur (∀ ↔ ∃) dans le même ordre, puis on nie la propriété finale.`)
      },
      () => {
        const it = pick([
          { t: '∃M ∈ ℝ, ∀n ∈ ℕ, uₙ ≤ M', n: '∀M ∈ ℝ, ∃n ∈ ℕ, uₙ > M', d: ['∀M ∈ ℝ, ∀n ∈ ℕ, uₙ > M', '∃M ∈ ℝ, ∃n ∈ ℕ, uₙ > M', '∀M ∈ ℝ, ∃n ∈ ℕ, uₙ ≤ M'] },
          { t: '∀ε > 0, ∃N ∈ ℕ, uₙ < ε', n: '∃ε > 0, ∀N ∈ ℕ, uₙ ≥ ε', d: ['∃ε > 0, ∃N ∈ ℕ, uₙ ≥ ε', '∀ε > 0, ∀N ∈ ℕ, uₙ ≥ ε', '∃ε ≤ 0, ∀N ∈ ℕ, uₙ < ε'] },
          { t: '∃x ∈ ℝ, ∀y ∈ ℝ, f(y) ≤ f(x)', n: '∀x ∈ ℝ, ∃y ∈ ℝ, f(y) > f(x)', d: ['∀x ∈ ℝ, ∀y ∈ ℝ, f(y) > f(x)', '∃x ∈ ℝ, ∃y ∈ ℝ, f(y) > f(x)', '∀x ∈ ℝ, ∃y ∈ ℝ, f(y) ≥ f(x)'] },
        ])
        return choice(`Quelle est la négation de « ${it.t} » ?`, it.n, it.d, `On échange ∀ et ∃ en gardant l'ordre, et on nie l'inégalité finale.`)
      },
      () => {
        const it = pick([
          { t: 'Chaque chevalier a un écuyer.', n: 'Il existe un chevalier qui n’a aucun écuyer.', d: ['Aucun chevalier n’a d’écuyer.', 'Il existe un écuyer qui n’a pas de chevalier.', 'Chaque chevalier n’a qu’un écuyer.'] },
          { t: 'Il existe une clé qui ouvre toutes les portes.', n: 'Chaque clé laisse au moins une porte fermée.', d: ['Aucune clé n’ouvre de porte.', 'Il existe une porte qu’aucune clé n’ouvre.', 'Il existe une clé qui n’ouvre aucune porte.'] },
          { t: 'Tout problème a au moins une solution.', n: 'Il existe un problème sans solution.', d: ['Aucun problème n’a de solution.', 'Tout problème a au plus une solution.', 'Il existe une solution à tous les problèmes.'] },
        ])
        return choice(`Quelle est la négation de : « ${it.t} » ?`, it.n, it.d, `« Pour tout … il existe … » devient « il existe … tel que pour tout … non » : ${it.n}`)
      },
    ),
    // Produit cartésien et parties
    variants(
      fresh(() => {
        const n = randInt(2, 8)
        return num(`Un ensemble A a ${n} éléments. Combien de parties (sous-ensembles) A possède-t-il ?`, 2 ** n,
          `Chaque élément est dans la partie ou non : 2^${n} = ${2 ** n} parties.`)
      }),
      fresh(() => {
        const n = randInt(4, 9), s = randInt(n + 1, 2 * n - 1)
        const c = range(1, n).filter((x) => s - x >= 1 && s - x <= n).length
        return num(`E = {1 ; … ; ${n}}. Combien de couples (x ; y) de E × E vérifient x + y = ${s} ?`, c,
          `x varie de ${s - n} à ${n} (et y = ${s} − x reste dans E) : ${c} couples.`)
      }),
      fresh(() => {
        const n = randInt(3, 9)
        return num(`E = {1 ; … ; ${n}}. Combien de couples (x ; y) de E × E vérifient x < y ?`, (n * (n - 1)) / 2,
          `Sur les ${n * n} couples, ${n} ont x = y ; les autres se répartissent à égalité entre x < y et x > y : ({${n * n} − ${n}/2}) = ${(n * (n - 1)) / 2}.`)
      }),
      fresh(() => {
        const a = randInt(2, 4), b = randInt(2, 3)
        return num(`card(A) = ${a} et card(B) = ${b}. Combien de parties le produit cartésien A × B possède-t-il ?`, 2 ** (a * b),
          `A × B a ${a} × ${b} = ${a * b} éléments, donc 2^${a * b} = ${2 ** (a * b)} parties.`)
      }),
    ),
    // Contre-exemples avec un couple
    variants(
      () => counterPair(`« Pour tous réels a et b, si a² = b², alors a = b. » Donne un couple (a ; b) qui contredit cette affirmation.`, (a, b) => Math.abs(a * a - b * b) < 1e-9 && a !== b, [2, -2],
        `(2 ; −2) : 2² = (−2)² = 4 mais 2 ≠ −2. Tout couple (a ; −a) avec a ≠ 0 convient.`),
      () => counterPair(`« Pour tous réels a et b, si a < b, alors a² < b². » Donne un couple (a ; b) qui contredit cette affirmation.`, (a, b) => a < b && a * a >= b * b, [-3, 1],
        `(−3 ; 1) : −3 < 1 mais 9 > 1. La fonction carré n'est pas croissante sur ℝ.`),
      () => counterPair(`« Pour tous réels a et b, (a + b)² = a² + b². » Donne un couple (a ; b) qui contredit cette affirmation.`, (a, b) => Math.abs(a * b) > 1e-9, [1, 1],
        `(a + b)² = a² + 2ab + b² : il suffit que ab ≠ 0, par exemple (1 ; 1) : 4 ≠ 2.`),
      () => counterPair(`« Pour tous réels positifs a et b, √(a + b) = √a + √b. » Donne un couple (a ; b) qui contredit cette affirmation.`, (a, b) => a >= 0 && b >= 0 && Math.abs(Math.sqrt(a + b) - Math.sqrt(a) - Math.sqrt(b)) > 1e-9, [9, 16],
        `(9 ; 16) : √25 = 5 mais √9 + √16 = 7. Tout couple avec a > 0 et b > 0 convient.`),
      () => {
        const k = randInt(2, 6)
        return counterPair(`« Pour tous entiers a et b, si a + b est un multiple de ${k}, alors a et b sont des multiples de ${k}. » Donne un couple (a ; b) qui contredit cette affirmation.`,
          (a, b) => Number.isInteger(a) && Number.isInteger(b) && (a + b) % k === 0 && (a % k !== 0 || b % k !== 0), [1, k - 1],
          `(1 ; ${k - 1}) : 1 + ${k - 1} = ${k} est un multiple de ${k}, mais 1 n'en est pas un.`)
      },
      () => {
        const k = randInt(2, 7)
        return counterPair(`« Pour tous entiers a et b, si a × b est un multiple de ${k * 2}, alors a ou b est un multiple de ${k * 2}. » Donne un couple (a ; b) d'entiers qui contredit cette affirmation.`,
          (a, b) => Number.isInteger(a) && Number.isInteger(b) && (a * b) % (2 * k) === 0 && a % (2 * k) !== 0 && b % (2 * k) !== 0, [2, k],
          `(2 ; ${k}) : 2 × ${k} = ${2 * k} est un multiple de ${2 * k}, mais ni 2 ni ${k} n'en sont.`)
      },
      () => counterPair(`« Pour tous réels a et b non nuls, si a > b, alors {1/a} < {1/b}. » Donne un couple (a ; b) qui contredit cette affirmation.`, (a, b) => a !== 0 && b !== 0 && a > b && 1 / a >= 1 / b, [1, -1],
        `(1 ; −1) : 1 > −1 mais {1/1} = 1 > −1. La fonction inverse n'est décroissante que sur chacun des intervalles ]−∞ ; 0[ et ]0 ; +∞[.`),
      () => {
        const k = randInt(2, 9)
        return counterPair(`« Pour tous réels a et b, si a² = b² + ${k * k} alors a = √{b² + ${k * k}}. » Donne un couple (a ; b) qui contredit cette affirmation.`, (a, b) => Math.abs(a * a - b * b - k * k) < 1e-9 && a < 0, [-k, 0],
          `(−${k} ; 0) : (−${k})² = 0 + ${k * k}, mais −${k} ≠ √${k * k} = ${k}. Il faut a = ±√(b² + ${k * k}).`)
      },
    ),
  ],
  // ── Palier 5 : exigeant ──
  [
    // Quantificateurs et analyse : vrai ou faux
    variants(
      () => {
        const it = pick([
          { t: '∀ε > 0, ∃N ∈ ℕ*, {1/N} < ε', v: true, e: 'Il suffit de prendre N > {1/ε} : les inverses des entiers deviennent aussi petits que l’on veut.' },
          { t: '∃M ∈ ℝ, ∀n ∈ ℕ, n² ≤ M', v: false, e: 'La suite (n²) n’est pas majorée : pour tout M, n² > M dès que n > √|M|.' },
          { t: '∀M ∈ ℝ, ∃n ∈ ℕ, 2ⁿ > M', v: true, e: '2ⁿ tend vers +∞ : il dépasse tout réel M.' },
          { t: '∃M ∈ ℝ, ∀x ∈ ℝ, sin(x) ≤ M', v: true, e: 'M = 1 convient : la fonction sinus est majorée par 1.' },
          { t: '∀x ∈ ℝ, ∃n ∈ ℕ, n > x', v: true, e: 'Pour tout réel x, un entier plus grand existe (par exemple la partie entière de |x| plus 1).' },
          { t: '∃n ∈ ℕ, ∀x ∈ ℝ, n > x', v: false, e: 'Aucun entier n’est plus grand que tous les réels (x = n le contredit).' },
          { t: '∀x > 0, ∃y > 0, y < x', v: true, e: 'Pour x > 0, y = {x/2} convient.' },
          { t: '∃y > 0, ∀x > 0, y < x', v: false, e: 'Pour un tel y, x = {y/2} serait positif et plus petit que y.' },
          { t: '∀x ∈ ℝ, ∃y ∈ ℝ, eʸ = x', v: false, e: 'Pour x ≤ 0, aucun y : l’exponentielle est strictement positive.' },
          { t: '∀x > 0, ∃y ∈ ℝ, eʸ = x', v: true, e: 'y = ln(x) convient.' },
        ])
        return vf(`Vrai ou faux : « ${it.t} » ?`, it.v, it.e)
      },
      () => {
        const a = randInt(2, 9)
        return pick([
          () => vf(`(uₙ) est définie par uₙ = {${a}/n + 1}. Vrai ou faux : « ∀ε > 0, ∃N ∈ ℕ, ∀n ≥ N, uₙ < ε » ?`, true, `uₙ tend vers 0 : pour tout ε > 0, uₙ < ε dès que n + 1 > {${a}/ε}.`),
          () => vf(`(uₙ) est définie par uₙ = ${a} + {1/n + 1}. Vrai ou faux : « ∀n ∈ ℕ, uₙ > ${a} » ?`, true, `{1/n + 1} > 0 pour tout n.`),
          () => vf(`(uₙ) est définie par uₙ = ${a} − {1/n + 1}. Vrai ou faux : « ∃n ∈ ℕ, uₙ ≥ ${a} » ?`, false, `{1/n + 1} > 0, donc uₙ < ${a} pour tout n.`),
        ])()
      },
    ),
    // Condition nécessaire et suffisante sur un paramètre
    variants(
      () => {
        const k = randInt(-4, 4)
        return interval(`Pour quelles valeurs de m a-t-on : « pour tout réel x, x² ${k < 0 ? '+' : '−'} ${Math.abs(2 * k) === 0 ? '0' : Math.abs(2 * k)}x + m > 0 » ? Donne l'ensemble des m sous forme d'intervalle.`.replace(' + 0x', '').replace(' − 0x', ''), { lo: k * k, hi: Infinity, loClosed: false, hiClosed: false },
          { explanation: `Le trinôme est strictement positif pour tout x si et seulement si son discriminant est < 0 : ${4 * k * k} − 4m < 0, soit m > ${k * k}.` })
      },
      () => {
        const a = randInt(1, 9)
        return interval(`Pour quelles valeurs de m l'équation x² = m − ${a} admet-elle au moins une solution réelle ? Donne l'intervalle.`, { lo: a, hi: Infinity, loClosed: true, hiClosed: false },
          { explanation: `Un carré est positif ou nul et prend toutes les valeurs ≥ 0 : il faut et il suffit que m − ${a} ≥ 0, soit m ≥ ${a}.` })
      },
      () => {
        const b = randInt(2, 9)
        return interval(`Pour quelles valeurs de a a-t-on : « pour tout x ∈ [0 ; 1], ax + ${b} > 0 » ? Donne l'intervalle.`, { lo: -b, hi: Infinity, loClosed: false, hiClosed: false },
          { explanation: `x ↦ ax + ${b} est affine : elle est > 0 sur [0 ; 1] si et seulement si elle l'est aux deux bornes : ${b} > 0 (vrai) et a + ${b} > 0, soit a > −${b}.` })
      },
      () => {
        const c = randInt(1, 9)
        return interval(`Pour quelles valeurs de m l'équation eˣ = m − ${c} admet-elle une solution réelle ? Donne l'intervalle.`, { lo: c, hi: Infinity, loClosed: false, hiClosed: false },
          { explanation: `L'exponentielle prend exactement toutes les valeurs strictement positives : il faut et il suffit que m − ${c} > 0, soit m > ${c}.` })
      },
    ),
    // Problèmes d'inclusion-exclusion
    variants(
      fresh(() => {
        const N = pick([30, 50, 60, 100, 120])
        const [p, q] = pick([[2, 3], [2, 5], [3, 5], [3, 7], [2, 7]] as const)
        const v = Math.floor(N / p) + Math.floor(N / q) - Math.floor(N / (p * q))
        return num(`Combien d'entiers de 1 à ${N} sont divisibles par ${p} ou par ${q} ?`, v,
          `Multiples de ${p} : ${Math.floor(N / p)} ; de ${q} : ${Math.floor(N / q)} ; des deux (multiples de ${p * q}) : ${Math.floor(N / (p * q))}. Total : ${Math.floor(N / p)} + ${Math.floor(N / q)} − ${Math.floor(N / (p * q))} = ${v}.`)
      }),
      fresh(() => {
        const N = pick([30, 60, 90, 100, 120])
        const v = N - (Math.floor(N / 2) + Math.floor(N / 3) - Math.floor(N / 6))
        return num(`Combien d'entiers de 1 à ${N} ne sont divisibles ni par 2 ni par 3 ?`, v,
          `Divisibles par 2 ou 3 : ${Math.floor(N / 2)} + ${Math.floor(N / 3)} − ${Math.floor(N / 6)} = ${N - v} ; les autres : ${N} − ${N - v} = ${v}.`)
      }),
      fresh(() => {
        const both = randInt(3, 10), a = both + randInt(5, 15), b = both + randInt(5, 15)
        return num(`Au tournoi, ${a} chevaliers ont participé à la joute, ${b} au tir à l'arc, dont ${both} aux deux épreuves. Combien de chevaliers ont participé à exactement une épreuve ?`, a + b - 2 * both,
          `Joute seule : ${a} − ${both} = ${a - both} ; arc seul : ${b} − ${both} = ${b - both} ; total ${a + b - 2 * both}.`)
      }),
      fresh(() => {
        const N = pick([60, 100, 120, 150])
        const v = Math.floor(N / 2) + Math.floor(N / 3) + Math.floor(N / 5) - Math.floor(N / 6) - Math.floor(N / 10) - Math.floor(N / 15) + Math.floor(N / 30)
        return num(`Combien d'entiers de 1 à ${N} sont divisibles par 2, par 3 ou par 5 ?`, v,
          `Crible : ${Math.floor(N / 2)} + ${Math.floor(N / 3)} + ${Math.floor(N / 5)} − ${Math.floor(N / 6)} − ${Math.floor(N / 10)} − ${Math.floor(N / 15)} + ${Math.floor(N / 30)} = ${v}.`)
      }),
    ),
    // Raisonnements : contraposée, méthode
    variants(
      () => {
        const it = pick([
          { t: '∀n ∈ ℕ, si n² est pair, alors n est pair', c: '∀n ∈ ℕ, si n est impair, alors n² est impair', d: ['∀n ∈ ℕ, si n est pair, alors n² est pair', '∃n ∈ ℕ, n² est pair et n est impair', '∀n ∈ ℕ, si n² est impair, alors n est impair'] },
          { t: '∀x ∈ ℝ, si x² > 4, alors |x| > 2', c: '∀x ∈ ℝ, si |x| ≤ 2, alors x² ≤ 4', d: ['∀x ∈ ℝ, si |x| > 2, alors x² > 4', '∀x ∈ ℝ, si x² ≤ 4, alors |x| ≤ 2', '∃x ∈ ℝ, x² > 4 et |x| ≤ 2'] },
          { t: '∀n ∈ ℕ, si n est premier et n > 2, alors n est impair', c: '∀n ∈ ℕ, si n est pair, alors n n’est pas premier ou n ≤ 2', d: ['∀n ∈ ℕ, si n est impair, alors n est premier et n > 2', '∀n ∈ ℕ, si n est pair, alors n n’est pas premier et n ≤ 2', '∃n ∈ ℕ, n est premier, n > 2 et n est pair'] },
        ])
        return choice(`Quelle est la contraposée de « ${it.t} » ?`, it.c, it.d, `Contraposée : « si non Q, alors non P », en gardant le quantificateur ∀ (attention : non (A et B) = non A ou non B).`)
      },
      () => {
        const it = pick([
          { t: 'Montrer que la proposition « ∀n ∈ ℕ, n² + n + 41 est premier » est fausse.', a: 'Exhiber un contre-exemple' },
          { t: 'Montrer que √2 n’est pas un nombre rationnel.', a: 'Raisonner par l’absurde' },
          { t: 'Montrer que pour tout n ∈ ℕ, 1 + 2 + … + n = {n(n + 1)/2}.', a: 'Raisonner par récurrence' },
          { t: 'Montrer que pour tout entier n, si n² est impair, alors n est impair.', a: 'Raisonner par contraposée' },
          { t: 'Montrer que l’équation x² = −5 n’a pas de solution réelle en supposant qu’il en existe une.', a: 'Raisonner par l’absurde' },
        ])
        return choice(`Quelle méthode est la plus adaptée ? ${it.t}`, it.a,
          ['Exhiber un contre-exemple', 'Raisonner par l’absurde', 'Raisonner par récurrence', 'Raisonner par contraposée'].filter((x) => x !== it.a),
          `${it.a} est la démarche naturelle ici.`)
      },
      () => {
        const it = pick([
          { t: '« P ⇒ Q » équivaut à « non Q ⇒ non P »', v: true, e: 'C’est la contraposée : même valeur de vérité dans tous les cas.' },
          { t: '« P ⇒ Q » équivaut à « Q ⇒ P »', v: false, e: 'C’est la réciproque : P vraie et Q fausse… ou P fausse et Q vraie donnent des valeurs différentes.' },
          { t: '« P ⇒ Q » équivaut à « non P ou Q »', v: true, e: 'Les deux ne sont fausses que lorsque P est vraie et Q fausse.' },
          { t: '« non (P et Q) » équivaut à « non P et non Q »', v: false, e: 'Loi de De Morgan : non (P et Q) équivaut à « non P ou non Q ».' },
          { t: '« non (P ou Q) » équivaut à « non P et non Q »', v: true, e: 'Loi de De Morgan.' },
          { t: '« P ⇔ Q » équivaut à « (P ⇒ Q) et (Q ⇒ P) »', v: true, e: 'C’est la définition de l’équivalence.' },
          { t: '« non (P ⇒ Q) » équivaut à « non P ⇒ non Q »', v: false, e: 'La négation de « P ⇒ Q » est « P et non Q ».' },
          { t: '« non (P ⇒ Q) » équivaut à « P et non Q »', v: true, e: '« P ⇒ Q » n’est fausse que si P est vraie et Q fausse.' },
        ])
        return vf(`Vrai ou faux : pour toutes propositions P et Q, ${it.t}.`, it.v, it.e)
      },
    ),
    // Opérations combinées sur les ensembles
    variants(
      () => {
        const A = randSet(1, 12, randInt(4, 6)), B = randSet(1, 12, randInt(4, 6))
        const D = union(minus(A, B), minus(B, A))
        return intSet(`A = ${setText(A)} et B = ${setText(B)}. Écris la différence symétrique A Δ B = (A ∖ B) ∪ (B ∖ A) (éléments qui sont dans un seul des deux ensembles).`, D,
          `A ∖ B = ${setText(minus(A, B))}, B ∖ A = ${setText(minus(B, A))} ; réunion : ${setText(D)}.`)
      },
      () => {
        const n = 10, A = randSet(1, n, 4), B = randSet(1, n, 4)
        const R = minus(range(1, n), union(A, B))
        return intSet(`E = {1 ; … ; ${n}}, A = ${setText(A)}, B = ${setText(B)}. Écris l'ensemble des éléments de E qui ne sont ni dans A ni dans B (c'est-à-dire Ā ∩ B̄).`, R,
          `De Morgan : Ā ∩ B̄ est le complémentaire de A ∪ B = ${setText(union(A, B))} : ${setText(R)}.`)
      },
      () => {
        const n = 10, A = randSet(1, n, 5), B = randSet(1, n, 5)
        const R = inter(minus(range(1, n), A), B)
        return intSet(`E = {1 ; … ; ${n}}, A = ${setText(A)}, B = ${setText(B)}. Écris l'ensemble des éléments de B qui ne sont pas dans A (c'est-à-dire Ā ∩ B).`, R,
          `Ā ∩ B = B ∖ A = ${setText(R)}.`)
      },
      () => {
        const A = randSet(1, 12, 5), B = randSet(1, 12, 5), C = randSet(1, 12, 5)
        const R = union(inter(A, B), C)
        return intSet(`A = ${setText(A)}, B = ${setText(B)}, C = ${setText(C)}. Écris (A ∩ B) ∪ C.`, R,
          `A ∩ B = ${setText(inter(A, B))}, puis on ajoute les éléments de C : ${setText(R)}.`)
      },
    ),
  ],
]

/** Majuscule initiale. */
function cap1(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// ═══ Problèmes d'amélioration ═══════════════════════════════════════════
const upgrades: Ladder = [
  [
    () => {
      const n = randInt(20, 60), c = randInt(3, 10), a = c + randInt(5, 15), b = c + randInt(5, 15)
      const N = Math.max(n, a + b - c + randInt(1, 10))
      return T('Ni l’un ni l’autre', num(`E est un ensemble de ${N} éléments ; A et B sont deux parties de E avec card(A) = ${a}, card(B) = ${b} et card(A ∩ B) = ${c}. Calcule card(Ā ∩ B̄) (éléments qui ne sont ni dans A ni dans B).`, N - (a + b - c),
        `De Morgan : Ā ∩ B̄ est le complémentaire de A ∪ B. card(A ∪ B) = ${a} + ${b} − ${c} = ${a + b - c}, donc card(Ā ∩ B̄) = ${N} − ${a + b - c} = ${N - (a + b - c)}.`))
    },
    () => {
      const n = randInt(5, 10), k = randInt(1, n - 2)
      return T('Les parties imposées', num(`E a ${n} éléments et A est une partie de E à ${k} éléments. Combien de parties X de E contiennent A (A ⊂ X) ?`, 2 ** (n - k),
        `X doit contenir les ${k} éléments de A ; pour chacun des ${n - k} autres, on choisit librement : 2^${n - k} = ${2 ** (n - k)}.`))
    },
    () => {
      const a = randInt(2, 5), b = randInt(2, 5), c = randInt(2, 4)
      return T('Les armoiries', num(`Un blason est formé d'une couleur de fond choisie dans un ensemble A de ${a} couleurs, d'un animal choisi dans un ensemble B de ${b} animaux et d'une devise choisie dans un ensemble C de ${c} devises. Combien d'éléments le produit cartésien A × B × C contient-il ?`, a * b * c,
        `card(A × B × C) = ${a} × ${b} × ${c} = ${a * b * c}.`))
    },
  ],
  [
    () => {
      const p = randInt(2, 4), q = randInt(2, 5)
      return T('Les messagers', num(`A = {${Array.from({ length: p }, (_, i) => `m${sub(i + 1)}`).join(' ; ')}} est un ensemble de ${p} messages et B un ensemble de ${q} messagers. On confie chaque message à un messager (un messager peut en porter plusieurs). Combien d'applications de A dans B sont possibles ?`, q ** p,
        `Chaque message a ${q} choix : ${q}^${p} = ${q ** p} applications.`))
    },
    () => {
      const n = randInt(3, 8)
      const q = pick([
        `E a ${n} éléments. Combien de couples (X ; Y) de parties de E vérifient X ∩ Y = ∅ ?`,
        `Un roi possède ${n} domaines. Il en donne certains à son fils, d'autres à sa fille (aucun domaine aux deux, et il peut en garder). Combien de partages possibles ?`,
      ])
      return T('Les parties disjointes', num(q, 3 ** n,
        `Chaque élément est soit dans X, soit dans Y, soit dans aucun des deux (jamais dans les deux) : 3^${n} = ${3 ** n}.`))
    },
    () => {
      const n = randInt(4, 15)
      return T('Les couples ordonnés', num(`E = {1 ; … ; ${n}}. Combien d'éléments l'ensemble {(x ; y) ∈ E² | x ≤ y} contient-il ?`, (n * (n + 1)) / 2,
        `Pour y = 1, …, ${n}, il y a y valeurs de x possibles : 1 + 2 + … + ${n} = ${(n * (n + 1)) / 2}.`))
    },
  ],
  [
    () => {
      const n = randInt(3, 10)
      const q = pick([
        `Combien d'applications d'un ensemble à ${n} éléments dans {0 ; 1} prennent les deux valeurs 0 et 1 ?`,
        `${n} soldats doivent être répartis entre la tour Nord et la tour Sud, chaque tour recevant au moins un soldat. Combien de répartitions possibles ?`,
      ])
      return T('Les surjections', num(q, 2 ** n - 2,
        `Il y a 2^${n} applications ; on retire les deux applications constantes : 2^${n} − 2 = ${2 ** n - 2}.`))
    },
    () => {
      const p = randInt(2, 4), q = p + randInt(0, 3)
      let v = 1
      for (let i = 0; i < p; i++) v *= q - i
      return T('Les injections', num(`A a ${p} éléments et B en a ${q}. Combien d'applications injectives de A dans B (deux éléments distincts de A ont des images distinctes) existe-t-il ?`, v,
        `Le premier élément de A a ${q} images possibles, le deuxième ${q - 1}, … : ${Array.from({ length: p }, (_, i) => q - i).join(' × ')} = ${v}.`))
    },
    () => {
      const N = pick([100, 200, 300, 500, 1000])
      const [p, q, r] = pick([[2, 3, 7], [3, 5, 7], [2, 5, 7], [2, 3, 5]] as const)
      const f = (d: number) => Math.floor(N / d)
      const v = N - (f(p) + f(q) + f(r) - f(p * q) - f(p * r) - f(q * r) + f(p * q * r))
      return T('Le crible du moine', num(`Un moine raye, parmi les entiers de 1 à ${N}, tous les multiples de ${p}, de ${q} et de ${r}. Combien d'entiers reste-t-il ?`, v,
        `Crible : rayés = ${f(p)} + ${f(q)} + ${f(r)} − ${f(p * q)} − ${f(p * r)} − ${f(q * r)}${f(p * q * r) ? ` + ${f(p * q * r)}` : ''} = ${N - v} (le dernier terme compte les multiples de ${p * q * r}). Restent ${N} − ${N - v} = ${v}.`))
    },
  ],
]

const SUBS = '₀₁₂₃₄₅₆₇₈₉'
function sub(n: number) {
  return String(n).split('').map((d) => SUBS[Number(d)]).join('')
}

// ═══ Problèmes de l'hôtel de ville ══════════════════════════════════════
/** Énigme des gardes : chacun est honnête (dit toujours vrai) ou menteur (ment toujours). */
interface Says { t: (me: string, other: string) => string; f: (me: boolean, other: boolean) => boolean }
const SAYS: Says[] = [
  { t: (_m, o) => `${o} dit toujours la vérité.`, f: (_m, o) => o },
  { t: (_m, o) => `${o} ment toujours.`, f: (_m, o) => !o },
  { t: () => 'Nous disons tous les deux la vérité.', f: (m, o) => m && o },
  { t: () => 'Nous mentons tous les deux.', f: (m, o) => !m && !o },
  { t: () => 'Au moins l’un de nous deux ment.', f: (m, o) => !m || !o },
  { t: () => 'Nous sommes du même camp.', f: (m, o) => m === o },
  { t: () => 'Nous ne sommes pas du même camp.', f: (m, o) => m !== o },
  { t: (_m, o) => `Si je dis la vérité, alors ${o} aussi.`, f: (m, o) => !m || o },
]
function guards() {
  for (;;) {
    const s1 = pick(SAYS), both = Math.random() < 0.6, s2 = pick(SAYS)
    const worlds: [boolean, boolean][] = []
    for (const a of [true, false]) for (const b of [true, false]) {
      if (a !== s1.f(a, b)) continue
      if (both && b !== s2.f(b, a)) continue
      worlds.push([a, b])
    }
    if (worlds.length === 1) return { s1, s2: both ? s2 : null, w: worlds[0] }
  }
}

const age: Ladder = [
  [
    () => {
      const c = randInt(3, 12), a = c + randInt(4, 20), b = c + randInt(4, 20), N = a + b - c + randInt(3, 25)
      const [x, y] = pick([['pêcheurs', 'chasseurs'], ['forgerons', 'charpentiers'], ['joueurs de luth', 'chanteurs']])
      return T('Le recensement du village', num(`Le village compte ${N} adultes. ${a} sont ${x}, ${b} sont ${y}, et ${c} sont à la fois ${x} et ${y}. Combien d'adultes ne sont ni ${x} ni ${y} ?`, N - (a + b - c),
        `${x} ou ${y} : ${a} + ${b} − ${c} = ${a + b - c}. Ni l'un ni l'autre : ${N} − ${a + b - c} = ${N - (a + b - c)}.`),
      venn2([x, y], [String(a - c), String(c), String(b - c), '?'], `${N} adultes`))
    },
    () => {
      const [a, b] = deuxPrenoms()
      const k = pick(['Gauvain', 'Perceval', 'Lancelot', 'Yvain', 'Tristan', 'Bohort'])
      const it = pick([
        { r: 'Si un chevalier est blessé, il ne combat pas à la joute.', obs: `Messire ${k} combat à la joute.`, c: `Messire ${k} n’est pas blessé.`, d: [`Messire ${k} est blessé.`, 'On ne peut rien conclure.', `Messire ${k} a gagné la joute.`] },
        { r: 'Si un marchand vend du sel, il paie la gabelle.', obs: `${a} ne paie pas la gabelle.`, c: `${a} ne vend pas de sel.`, d: [`${a} vend du sel.`, 'On ne peut rien conclure.', `${a} vend autre chose que du sel.`] },
        { r: 'Si la cloche sonne, les portes de la ville se ferment.', obs: 'Les portes de la ville sont ouvertes.', c: 'La cloche ne sonne pas.', d: ['La cloche sonne.', 'On ne peut rien conclure.', 'Les portes vont se fermer.'] },
        { r: 'Si un archer a réussi l’épreuve, il porte une plume rouge.', obs: `${b} porte une plume rouge.`, c: 'On ne peut rien conclure.', d: [`${b} a réussi l’épreuve.`, `${b} n’a pas réussi l’épreuve.`, `${b} est un archer.`] },
      ])
      return T('Le règlement du royaume', choice(`Le règlement dit : « ${it.r} » On observe : ${it.obs} Que peut-on en conclure ?`, it.c, it.d,
        it.c === 'On ne peut rien conclure.' ? 'Observer la conclusion (Q) ne permet pas de déduire l’hypothèse (P) : ce serait utiliser la réciproque, qui n’est pas garantie.' : 'Par contraposée : « si non Q, alors non P ». On observe non Q, donc non P.'))
    },
    () => {
      const A = randSet(1, 20, randInt(5, 8)), B = randSet(1, 20, randInt(5, 8))
      return T('Les registres du scribe', intSet(`Le scribe tient deux registres de numéros de maisons : celles qui ont payé l'impôt, A = ${setText(A)}, et celles qui ont fourni un soldat, B = ${setText(B)}. Le seigneur veut la liste des maisons qui ont fait les deux. Écris A ∩ B.`, inter(A, B),
        `On garde les numéros présents dans les deux registres : ${setText(inter(A, B))}.`))
    },
  ],
  [
    () => {
      const g = guards()
      const [a, b] = deuxPrenoms()
      const opts = ['Les deux disent toujours la vérité', `${a} dit la vérité, ${b} ment`, `${b} dit la vérité, ${a} ment`, 'Les deux mentent toujours']
      const ans = g.w[0] && g.w[1] ? opts[0] : g.w[0] ? opts[1] : g.w[1] ? opts[2] : opts[3]
      const talk = `${a} déclare : « ${g.s1.t(a, b)} »${g.s2 ? ` ${b} répond : « ${g.s2.t(b, a)} »` : ''}`
      return T('Les gardes du pont', choice(`Deux gardes, ${a} et ${b}, surveillent le pont. Chacun est soit honnête (toujours sincère), soit menteur (ment toujours). ${talk} Qu'en déduis-tu ?`, ans, opts.filter((o) => o !== ans),
        `On teste les quatre possibilités : seule celle-ci rend chaque déclaration vraie quand son auteur est honnête et fausse quand il est menteur. ${ans}.`))
    },
    () => {
      const c = randInt(2, 8), a = c + randInt(3, 12), b = c + randInt(3, 12), d = randInt(2, 15)
      const N = a + b - c + d
      const ask = pick(['both', 'onlyA'] as const)
      return T('Les deux guildes', num(`La ville compte ${N} artisans. ${a} appartiennent à la guilde des tisserands, ${b} à celle des teinturiers, et ${d} à aucune des deux. ${ask === 'both' ? 'Combien appartiennent aux deux guildes ?' : 'Combien appartiennent seulement à la guilde des tisserands ?'}`, ask === 'both' ? c : a - c,
        `Au moins une guilde : ${N} − ${d} = ${a + b - c}. Les deux : ${a} + ${b} − ${a + b - c} = ${c}.${ask === 'onlyA' ? ` Seulement tisserands : ${a} − ${c} = ${a - c}.` : ''}`),
      venn2(['tisserands', 'teinturiers'], ['?', '?', '?', String(d)], `${N} artisans`))
    },
    () => {
      const a = randInt(2, 9)
      const it = pick([
        { t: `Pour tout chevalier x, il existe un cheval y que x sait monter.`, n: `Il existe un chevalier x tel que, pour tout cheval y, x ne sait pas monter y.`, d: [`Pour tout chevalier x, il existe un cheval y que x ne sait pas monter.`, `Il existe un cheval y qu’aucun chevalier ne sait monter.`, `Aucun chevalier ne sait monter aucun cheval.`] },
        { t: `Il existe une épée qui a battu tous les boucliers.`, n: `Pour toute épée, il existe un bouclier qu’elle n’a pas battu.`, d: [`Aucune épée n’a battu de bouclier.`, `Il existe un bouclier qu’aucune épée n’a battu.`, `Il existe une épée qui n’a battu aucun bouclier.`] },
        { t: `Chaque jour, au moins ${a} marchands viennent au marché.`, n: `Il existe un jour où moins de ${a} marchands viennent au marché.`, d: [`Chaque jour, moins de ${a} marchands viennent au marché.`, `Il existe un jour où au moins ${a} marchands viennent au marché.`, `Aucun jour, ${a} marchands ne viennent au marché.`] },
      ])
      return T('Le grimoire de l’alchimiste', choice(`Le grimoire affirme : « ${it.t} » Un apprenti veut prouver que c'est faux. Quelle affirmation doit-il établir ?`, it.n, it.d,
        `Prouver qu'une affirmation est fausse, c'est prouver sa négation : on échange « pour tout » et « il existe » et on nie la propriété.`))
    },
  ],
  [
    () => {
      const vals = [randInt(3, 12), randInt(3, 12), randInt(3, 12), randInt(1, 6), randInt(1, 6), randInt(1, 6), randInt(1, 5)]
      const [sa, sb, sc, ab, ac, bc, abc] = vals
      const A = sa + ab + ac + abc, B = sb + ab + bc + abc, C = sc + ac + bc + abc
      const u = vals.reduce((s, v) => s + v, 0), N = u + randInt(4, 20)
      return T('Les trois guildes', num(`Sur les ${N} habitants d'une cité, ${A} sont dans la guilde des maçons, ${B} dans celle des forgerons et ${C} dans celle des marchands. ${ab + abc} sont maçons et forgerons, ${ac + abc} maçons et marchands, ${bc + abc} forgerons et marchands, et ${abc} sont dans les trois guildes. Combien d'habitants ne sont dans aucune guilde ?`, N - u,
        `Formule du crible : ${A} + ${B} + ${C} − ${ab + abc} − ${ac + abc} − ${bc + abc} + ${abc} = ${u} habitants dans au moins une guilde. Aucune : ${N} − ${u} = ${N - u}.`),
      venn3(['maçons', 'forgerons', 'marchands'], ['', '', '', '', '', '', String(abc), '?']))
    },
    () => {
      const N = pick([30, 40, 50, 60])
      const p = pick([2, 3]), q = pick([5, 7]), big = randInt(10, N - 10)
      const C = range(1, N).filter((x) => ((x % p === 0) !== (x % q === 0)) && (x > big) === (x % 2 === 1))
      return T('Le code du coffre', num(`Le code du coffre royal est un entier de 1 à ${N}. On sait que : il est multiple de ${p} ou de ${q}, mais pas des deux ; et il est supérieur à ${big} si et seulement s'il est impair. Combien de codes restent possibles ?`, C.length,
        `On liste les entiers qui vérifient « (multiple de ${p}) ou exclusif (multiple de ${q}) » et « x > ${big} ⇔ x impair » : ${setText(C)}, soit ${C.length} codes.`))
    },
    () => {
      const g = guards()
      const [a, b] = deuxPrenoms()
      const who = Math.random() < 0.5 ? 0 : 1
      const name = who === 0 ? a : b
      const talk = `${a} déclare : « ${g.s1.t(a, b)} »${g.s2 ? ` ${b} répond : « ${g.s2.t(b, a)} »` : ''}`
      return T('Le sphinx et les deux portes', vf(`Devant deux portes, ${a} et ${b} disent chacun soit toujours la vérité, soit toujours un mensonge. ${talk} Le sphinx affirme : « ${name} dit toujours la vérité. » Vrai ou faux ?`, g.w[who],
        `En testant les quatre cas, un seul est cohérent : ${a} ${g.w[0] ? 'dit la vérité' : 'ment'} et ${b} ${g.w[1] ? 'dit la vérité' : 'ment'}.`))
    },
  ],
]

export const CONTENT: SubjectContent | null = { tiers, upgrades, age }
