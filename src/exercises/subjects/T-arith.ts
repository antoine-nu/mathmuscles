// Arithmétique (Maths expertes, Terminale) — public adulte.
// Divisibilité, division euclidienne, congruences, PGCD, Bézout, Gauss, nombres premiers, petit théorème de Fermat.
import { F, choice, fmt, fresh, gcd, numeric, pair, pick, randInt, shuffle, variants, type Exercise, type Maker, type SubjectContent } from '../utils'
import { fitPoints, type FigPoint, type FigSegment, type Figure } from '../figure'

// ── Aides locales ───────────────────────────────────────────────────────
const pmod = (a: number, n: number) => ((a % n) + n) % n
const lcm = (a: number, b: number) => (a / gcd(a, b)) * b
/** Quotient euclidien (reste positif). */
const qdiv = (a: number, n: number) => (a - pmod(a, n)) / n
function modpow(a: number, e: number, m: number): number {
  let r = 1 % m, b = pmod(a, m)
  while (e > 0) {
    if (e & 1) r = (r * b) % m
    b = (b * b) % m
    e = Math.floor(e / 2)
  }
  return r
}
/** Coefficients de Bézout : a u + b v = pgcd(a, b) (a, b > 0). */
function egcd(a: number, b: number): [number, number, number] {
  if (b === 0) return [a, 1, 0]
  const [g, u, v] = egcd(b, a % b)
  return [g, v, u - Math.floor(a / b) * v]
}
const isPrime = (n: number) => {
  if (n < 2) return false
  for (let d = 2; d * d <= n; d++) if (n % d === 0) return false
  return true
}
function factor(n: number): [number, number][] {
  const out: [number, number][] = []
  for (let p = 2; p * p <= n; p++) {
    let e = 0
    while (n % p === 0) { n /= p; e++ }
    if (e) out.push([p, e])
  }
  if (n > 1) out.push([n, 1])
  return out
}
const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹'
const sup = (n: number) => String(n).split('').map((d) => SUP[Number(d)]).join('')
/** Décomposition lisible : 2³ × 3 × 5². */
const factText = (f: [number, number][]) => f.map(([p, e]) => (e === 1 ? `${p}` : `${p}${sup(e)}`)).join(' × ')
/** Puissance dans un énoncé (mini-syntaxe) : 2^{100}. */
const pw = (a: number | string, e: number | string) => (e === 1 ? `${a}` : `${a}^{${e}}`)
/** Retire les « + 0 » des égalités de division (a = b × q + 0) et des sommes de chiffres. */
const tidy = (s: string) => s.replace(/ \+ 0(?![,\d])/g, '')
const tidyMaker = (m: Maker): Maker => () => { const ex = m(); return ex.explanation ? { ...ex, explanation: tidy(ex.explanation) } : ex }
const tidyLadder = <L extends Maker[][]>(l: L) => l.map((pool) => pool.map(tidyMaker)) as L
const divisors = (n: number) => { const d: number[] = []; for (let k = 1; k <= n; k++) if (n % k === 0) d.push(k); return d }
const nDiv = (n: number) => factor(n).reduce((s, [, e]) => s * (e + 1), 1)
const range = (a: number, b: number) => Array.from({ length: Math.max(0, b - a) }, (_, i) => a + i)
const big = (n: number) => fmt(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
const par = (n: number) => (n < 0 ? `(${fmt(n)})` : fmt(n))
const JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']

function retry<R>(gen: () => R | null | undefined | false, tries = 3000): R {
  for (let i = 0; i < tries; i++) {
    const r = gen()
    if (r) return r
  }
  throw new Error('tirage impossible')
}
const T = (title: string, ex: Exercise, figure?: Figure): Exercise => ({ ...ex, title, ...(figure ? { figure } : {}) })

/** Cycle des restes de a^k modulo m (k = 0, 1, 2…) jusqu'au retour de 1 (a premier avec m). */
function cycle(a: number, m: number): number[] {
  const c = [1 % m]
  let v = pmod(a, m)
  while (v !== 1 % m && c.length < 200) { c.push(v); v = (v * a) % m }
  return c
}
const order = (a: number, m: number) => cycle(a, m).length

function parsePairInt(raw: string): [number, number] | null {
  const s = raw.trim().replace(/[−–—]/g, '-').replace(/\s+/g, '').replace(/^\(/, '').replace(/\)$/, '')
  let parts = s.split(';')
  if (parts.length === 1) parts = s.split(',')
  if (parts.length !== 2 || !parts.every((p) => /^-?\d+$/.test(p))) return null
  return [Number(parts[0]), Number(parts[1])]
}
/** Couple d'entiers vérifiant une condition (plusieurs réponses possibles). */
function anyPair(prompt: string, ok: (x: number, y: number) => boolean, shown: [number, number], explanation: string): Exercise {
  return {
    prompt,
    kind: 'input',
    answer: `(${fmt(shown[0])} ; ${fmt(shown[1])})`,
    explanation,
    inputHint: 'Couple (u ; v) d’entiers',
    format: 'un couple d’entiers (u ; v), par exemple (3 ; −2)',
    keypad: ['(', ';', ')', '−'],
    isValid: (v) => parsePairInt(v) !== null,
    check: (v) => { const p = parsePairInt(v); return !!p && ok(p[0], p[1]) },
  }
}
/** Réponse : une lettre de l'alphabet. */
function letter(prompt: string, L: string, explanation: string): Exercise {
  return {
    prompt, kind: 'input', answer: L, explanation,
    inputHint: 'Une lettre', format: 'une lettre de A à Z',
    isValid: (v) => /^[a-zA-Z]$/.test(v.trim()),
    check: (v) => v.trim().toUpperCase() === L,
  }
}
const N = (prompt: string, v: number, explanation: string) => numeric(prompt, v, { explanation })

/** Chiffres de la division euclidienne a = bq + r présentés. */
const divText = (a: number, b: number) => `${fmt(a)} = ${b} × ${par(qdiv(a, b))} + ${pmod(a, b)}`

// ── Palier 1 : rappels ──────────────────────────────────────────────────
const p1: Maker[] = [
  // Division euclidienne (entiers naturels)
  fresh(variants(
    () => {
      const b = randInt(3, 25), a = retry(() => { const v = randInt(50, 999); return v % b !== 0 && v })
      return N(`Quel est le reste de la division euclidienne de ${a} par ${b} ?`, a % b, `${divText(a, b)} avec 0 ≤ ${a % b} < ${b} : le reste est ${a % b}.`)
    },
    () => {
      const b = randInt(3, 25), a = retry(() => { const v = randInt(50, 999); return v % b !== 0 && v })
      return N(`Quel est le quotient de la division euclidienne de ${a} par ${b} ?`, Math.floor(a / b), `${divText(a, b)} : le quotient est ${Math.floor(a / b)}.`)
    },
    () => {
      const b = randInt(6, 30), a = retry(() => { const v = randInt(100, 999); return v % b !== 0 && v })
      return N(`Complète l’égalité ${a} = ${b} × … + r, où r est le reste de la division euclidienne (0 ≤ r < ${b}). Quel nombre remplace les pointillés ?`, Math.floor(a / b), `${divText(a, b)} : il manque le quotient ${Math.floor(a / b)}.`)
    },
    () => {
      const c = pick([
        { k: 12, t: (n: number) => `Un fermier range ${n} œufs dans des boîtes de 12. Combien d’œufs reste-t-il une fois toutes les boîtes possibles remplies ?` },
        { k: 7, t: (n: number) => `Un capitaine aligne ${n} soldats en rangs de 7. Combien de soldats compte le dernier rang, incomplet ?` },
        { k: 24, t: (n: number) => `Une horloge indique minuit. Quelle heure indiquera-t-elle dans ${n} heures ? (nombre entre 0 et 23)` },
        { k: 60, t: (n: number) => `Un chronomètre affiche ${n} secondes. Combien de secondes reste-t-il après avoir compté les minutes complètes ?` },
      ])
      const n = retry(() => { const v = randInt(3 * c.k, 40 * c.k); return v % c.k !== 0 && v })
      return N(c.t(n), n % c.k, `${n} = ${c.k} × ${Math.floor(n / c.k)} + ${n % c.k} : la réponse est le reste, ${n % c.k}.`)
    },
  )),
  // Diviseurs et multiples
  fresh(variants(
    () => {
      const n = pick([12, 18, 20, 24, 28, 30, 36, 40, 42, 44, 45, 48, 50, 52, 54, 56, 60, 63, 64, 72, 75, 80, 84, 90, 96, 100])
      const d = divisors(n)
      return N(`Combien l’entier ${n} a-t-il de diviseurs positifs ?`, d.length, `Diviseurs de ${n} : ${d.join(', ')}, soit ${d.length}.`)
    },
    () => {
      const a = randInt(6, 25), n = randInt(100, 999)
      return N(`Combien y a-t-il de multiples de ${a} entre 1 et ${n} ?`, Math.floor(n / a), `${n} = ${a} × ${Math.floor(n / a)} + ${n % a} : les multiples sont ${a} × 1, …, ${a} × ${Math.floor(n / a)}, soit ${Math.floor(n / a)}.`)
    },
    () => {
      const a = randInt(7, 35), n = retry(() => { const v = randInt(100, 999); return v % a !== 0 && v })
      const m = (Math.floor(n / a) + 1) * a
      return N(`Quel est le plus petit multiple de ${a} strictement supérieur à ${n} ?`, m, `${n} = ${a} × ${Math.floor(n / a)} + ${n % a}, donc le multiple suivant est ${a} × ${Math.floor(n / a) + 1} = ${m}.`)
    },
    () => {
      const n = pick([6, 8, 10, 12, 14, 15, 16, 18, 20, 21, 22, 24, 27, 28, 30, 32])
      const d = divisors(n)
      return N(`Combien l’entier ${n} a-t-il de diviseurs dans ℤ (positifs et négatifs) ?`, 2 * d.length, `Diviseurs positifs : ${d.join(', ')} (${d.length}). Chacun a son opposé : ${2 * d.length} diviseurs dans ℤ.`)
    },
    () => {
      const n = pick([10, 12, 14, 15, 16, 18, 20, 21, 22, 24, 26, 27, 28, 30])
      const d = divisors(n)
      return N(`Quelle est la somme des diviseurs positifs de ${n} ?`, d.reduce((s, v) => s + v, 0), `${d.join(' + ')} = ${d.reduce((s, v) => s + v, 0)}.`)
    },
  )),
  // Congruences : premiers calculs
  fresh(variants(
    () => {
      const n = randInt(3, 12), a = retry(() => { const v = randInt(20, 500); return v % n !== 0 && v })
      return N(`Quel est l’entier r, avec 0 ≤ r < ${n}, tel que ${a} ≡ r [${n}] ?`, a % n, `${divText(a, n)}, donc ${a} ≡ ${a % n} [${n}].`)
    },
    () => {
      const h = randInt(0, 23), k = randInt(30, 500)
      const r = (h + k) % 24
      return N(`Il est ${h} h. Quelle heure sera-t-il dans ${k} heures ? (donne un nombre entre 0 et 23)`, r, `On calcule modulo 24 : ${k} = 24 × ${Math.floor(k / 24)} + ${k % 24}, donc ${h} + ${k} ≡ ${h} + ${k % 24} ≡ ${r} [24]. Il sera ${r} h.`)
    },
    () => {
      const a = randInt(101, 999), b = randInt(101, 999)
      return N(`Quel est le chiffre des unités de ${a} × ${b} ?`, (a * b) % 10, `Modulo 10, seuls les chiffres des unités comptent : ${a % 10} × ${b % 10} = ${(a % 10) * (b % 10)} ≡ ${(a * b) % 10} [10].`)
    },
    () => {
      const n = randInt(4, 11), a = randInt(20, 200), r = a % n
      const good = a + n * randInt(2, 9)
      const bads = shuffle(range(1, n).map((d) => good + d)).slice(0, 3)
      return choice(`Lequel de ces nombres est congru à ${a} modulo ${n} ?`, String(good), bads.map(String),
        `${a} ≡ ${r} [${n}]. Or ${good} = ${a} + ${n} × ${(good - a) / n}, donc ${good} ≡ ${a} [${n}] ; les autres n’ont pas le même reste.`)
    },
    () => {
      const d = randInt(0, 6), k = retry(() => { const v = randInt(10, 400); return v % 7 !== 0 && v })
      const r = (d + k) % 7
      return choice(`Aujourd’hui, nous sommes ${JOURS[d]}. Quel jour serons-nous dans ${k} jours ?`, JOURS[r], shuffle(JOURS.filter((j) => j !== JOURS[r])).slice(0, 3),
        `${k} = 7 × ${Math.floor(k / 7)} + ${k % 7} : les semaines complètes ne changent rien, on avance de ${k % 7} jour${k % 7 > 1 ? 's' : ''} : ${JOURS[r]}.`)
    },
  )),
  // Nombres premiers et décomposition
  fresh(variants(
    () => {
      const f: [number, number][] = shuffle([[2, randInt(1, 5)], [3, randInt(1, 3)], [5, randInt(0, 2)], [7, randInt(0, 1)]] as [number, number][])
        .filter(([, e]) => e > 0).sort((a, b) => a[0] - b[0])
      const n = f.reduce((s, [p, e]) => s * p ** e, 1)
      const [p, e] = pick(f)
      return N(`Dans la décomposition en facteurs premiers de ${big(n)}, quel est l’exposant de ${p} ?`, e, `${big(n)} = ${factText(f)} : l’exposant de ${p} est ${e}.`)
    },
    () => {
      const n = retry(() => { const v = randInt(60, 999); const f = factor(v); return f.length >= 2 && f[f.length - 1][0] > 7 && f[f.length - 1][0] < v && v })
      const f = factor(n)
      return N(`Quel est le plus grand facteur premier de ${n} ?`, f[f.length - 1][0], `${n} = ${factText(f)} : le plus grand facteur premier est ${f[f.length - 1][0]}.`)
    },
    () => {
      const a = randInt(2, 70), b = a + randInt(12, 25)
      const ps = range(a, b + 1).filter(isPrime)
      return N(`Combien y a-t-il de nombres premiers compris entre ${a} et ${b} (inclus) ?`, ps.length, ps.length ? `Ce sont ${ps.join(', ')} : il y en a ${ps.length}.` : 'Aucun.')
    },
    () => {
      const p = pick([7, 11, 13, 17, 19]), q = pick([7, 11, 13, 17, 19, 23, 29, 31])
      const n = p * q
      const sp = Math.min(p, q)
      return N(`Quel est le plus petit diviseur premier de ${n} ?`, sp, `On teste les nombres premiers dans l’ordre : ${n} n’est divisible par aucun de ${[2, 3, 5, 7, 11, 13, 17].filter((q) => q < sp).join(', ')}, mais ${n} = ${sp} × ${n / sp}.`)
    },
    () => {
      const prime = Math.random() < 0.5
      const n = retry(() => { const v = randInt(51, 250); return v % 2 && v % 5 && v % 3 && isPrime(v) === prime && v })
      const f = factor(n)
      return choice(`Le nombre ${n} est-il premier ?`, prime ? 'Oui' : 'Non', [prime ? 'Non' : 'Oui'],
        prime ? `On teste les nombres premiers jusqu’à √${n} ≈ ${fmt(Math.floor(Math.sqrt(n) * 10) / 10)} : aucun ne divise ${n}, il est premier.` : `${n} = ${factText(f)} : il n’est pas premier.`)
    },
  )),
  // PGCD, PPCM simples
  fresh(variants(
    () => {
      const g = randInt(2, 15), a = g * randInt(2, 9), b = retry(() => { const v = g * randInt(2, 9); return v !== a && gcd(a, v) === g && v })
      return N(`Calcule PGCD(${a} ; ${b}).`, g, `${a} = ${g} × ${a / g} et ${b} = ${g} × ${b / g}, avec ${a / g} et ${b / g} premiers entre eux : PGCD = ${g}.`)
    },
    () => {
      const g = randInt(2, 12), a = g * randInt(2, 8), b = retry(() => { const v = g * randInt(2, 8); return v !== a && gcd(a, v) === g && v })
      return N(`Quel est le plus grand entier qui divise à la fois ${a} et ${b} ?`, g, `C’est leur PGCD : ${a} = ${g} × ${a / g} et ${b} = ${g} × ${b / g}, avec ${a / g} et ${b / g} sans diviseur commun autre que 1.`)
    },
    () => {
      const [a, b] = retry(() => { const a = randInt(4, 20), v = randInt(4, 20); return v !== a && lcm(a, v) !== a * v && lcm(a, v) !== Math.max(a, v) && [a, v] })
      return N(`Quel est le plus petit multiple commun non nul de ${a} et ${b} (leur PPCM) ?`, lcm(a, b), `PPCM = ${F2(a, b)}.`)
    },
    () => {
      const cop = Math.random() < 0.5
      const [a, b] = retry(() => { const a = randInt(10, 99), b = randInt(10, 99); return a !== b && (gcd(a, b) === 1) === cop && [a, b] })
      return choice(`Les entiers ${a} et ${b} sont-ils premiers entre eux ?`, cop ? 'Oui' : 'Non', [cop ? 'Non' : 'Oui'],
        cop ? `${a} = ${factText(factor(a))} et ${b} = ${factText(factor(b))} n’ont aucun facteur premier commun : PGCD = 1.` : `${gcd(a, b)} divise ${a} et ${b} : PGCD(${a} ; ${b}) = ${gcd(a, b)} ≠ 1.`)
    },
  )),
]
/** Explication d'un PPCM via le PGCD. */
function F2(a: number, b: number) {
  const g = gcd(a, b)
  return `${F(`${a} × ${b}`, `PGCD(${a} ; ${b})`)} = ${F(a * b, g)} = ${lcm(a, b)}`
}

// ── Palier 2 : négatifs, opérations sur les congruences, Euclide ────────
const p2: Maker[] = [
  // Division euclidienne d'un entier négatif
  fresh(variants(
    () => {
      const b = randInt(3, 15), a = -retry(() => { const v = randInt(10, 200); return v % b !== 0 && v })
      return N(`Quel est le reste de la division euclidienne de ${fmt(a)} par ${b} ?`, pmod(a, b), `Le reste doit vérifier 0 ≤ r < ${b} : ${divText(a, b)}. Le reste est ${pmod(a, b)} (et non ${-(-a % b)}).`)
    },
    () => {
      const b = randInt(3, 15), a = -retry(() => { const v = randInt(10, 200); return v % b !== 0 && v })
      return N(`Quel est le quotient de la division euclidienne de ${fmt(a)} par ${b} ?`, qdiv(a, b), `${divText(a, b)} avec 0 ≤ ${pmod(a, b)} < ${b} : le quotient est ${fmt(qdiv(a, b))}.`)
    },
    () => {
      const b = randInt(3, 15), a = -retry(() => { const v = randInt(10, 200); return v % b !== 0 && v })
      return pair(`Donne le couple (q ; r) tel que ${fmt(a)} = ${b}q + r avec 0 ≤ r < ${b}.`, qdiv(a, b), pmod(a, b), {
        explanation: `${fmt(a)} = ${b} × ${par(qdiv(a, b))} + ${pmod(a, b)} : on prend le multiple de ${b} juste en dessous de ${fmt(a)}, soit ${fmt(b * qdiv(a, b))}.`,
        inputHint: 'Forme (q ; r)',
      })
    },
    () => {
      const n = randInt(4, 13), a = -retry(() => { const v = randInt(10, 300); return v % n !== 0 && v })
      return N(`Quel est le plus petit entier naturel r tel que ${fmt(a)} ≡ r [${n}] ?`, pmod(a, n), `${fmt(a)} + ${n} × ${Math.ceil(-a / n)} = ${pmod(a, n)}, donc ${fmt(a)} ≡ ${pmod(a, n)} [${n}].`)
    },
  )),
  // Opérations sur les congruences
  fresh(variants(
    () => {
      const n = randInt(5, 13), x = randInt(1, n - 1), y = randInt(1, n - 1), op = pick(['+', '×'] as const)
      const r = op === '+' ? (x + y) % n : (x * y) % n
      return N(`On sait que A ≡ ${x} [${n}] et B ≡ ${y} [${n}]. Quel est le reste de la division de A ${op} B par ${n} ?`, r, `A ${op} B ≡ ${x} ${op} ${y} = ${op === '+' ? x + y : x * y} ≡ ${r} [${n}].`)
    },
    () => {
      const a = randInt(1001, 9999), b = randInt(101, 999)
      const ds = (v: number) => String(v).split('').reduce((s, c) => s + Number(c), 0)
      const r = (a * b) % 9
      return N(`Quel est le reste de la division de ${a} × ${b} par 9 ?`, r, `Un entier est congru à la somme de ses chiffres modulo 9 : ${a} ≡ ${ds(a)} ≡ ${a % 9} et ${b} ≡ ${ds(b)} ≡ ${b % 9} [9]. Produit : ${a % 9} × ${b % 9} = ${(a % 9) * (b % 9)} ≡ ${r} [9].`)
    },
    () => {
      const n = randInt(5, 11), k = randInt(1, n - 1), c = randInt(1, 9), d = randInt(1, 9)
      const r = pmod(k * k + c * k + d, n)
      return N(`Un entier A vérifie A ≡ ${k} [${n}]. Quel est le reste de la division de A² + ${c}A + ${d} par ${n} ?`, r, `A² + ${c}A + ${d} ≡ ${k}² + ${c} × ${k} + ${d} = ${k * k + c * k + d} ≡ ${r} [${n}].`)
    },
    () => {
      const n = randInt(4, 9), a = n * randInt(100, 300) + randInt(1, n - 1), e = pick([2, 3])
      const ra = a % n, r = modpow(a, e, n)
      return N(`Quel est le reste de la division de ${a}${e === 2 ? '²' : '³'} par ${n} ?`, r, `${a} ≡ ${ra} [${n}], donc ${a}${e === 2 ? '²' : '³'} ≡ ${ra}${e === 2 ? '²' : '³'} = ${ra ** e} ≡ ${r} [${n}].`)
    },
  )),
  // Algorithme d'Euclide
  fresh(variants(
    () => {
      const [a, b] = retry(() => { const g = randInt(2, 30), x = g * randInt(5, 35), y = g * randInt(3, 30); return x > y && x <= 1000 && gcd(x, y) >= 2 && [x, y] })
      const steps: string[] = []
      let x = a, y = b
      while (y) { steps.push(`${x} = ${y} × ${Math.floor(x / y)} + ${x % y}`); [x, y] = [y, x % y] }
      return N(`Calcule PGCD(${a} ; ${b}) avec l’algorithme d’Euclide.`, x, `${steps.join(' ; ')}. Le dernier reste non nul est ${x}.`)
    },
    () => {
      const [a, b] = retry(() => { const x = randInt(100, 999), y = randInt(30, x - 1); return [x, y] as [number, number] })
      let x = a, y = b, n = 0
      const steps: string[] = []
      while (y) { steps.push(`${x} = ${y} × ${Math.floor(x / y)} + ${x % y}`); [x, y] = [y, x % y]; n++ }
      return N(`Combien de divisions euclidiennes l’algorithme d’Euclide effectue-t-il pour calculer PGCD(${a} ; ${b}) ? (on compte la dernière, de reste nul)`, n, `${steps.join(' ; ')} : ${n} divisions.`)
    },
    () => {
      const [L, l] = retry(() => { const g = pick([5, 10, 12, 15, 20, 25, 30, 40]), x = g * randInt(3, 12), y = g * randInt(2, 9); return x > y && gcd(x, y) === g && [x, y] })
      const g = gcd(L, l)
      return N(`On veut carreler une pièce rectangulaire de ${L} cm sur ${l} cm avec des dalles carrées identiques, sans découpe. Quelle est la plus grande longueur possible (en cm) du côté d’une dalle ?`, g, `Le côté doit diviser ${L} et ${l} : le plus grand possible est PGCD(${L} ; ${l}) = ${g}.`)
    },
    () => {
      const g = pick([12, 18, 20, 24, 28, 30, 36, 40, 42, 45, 48, 60]), a = g * randInt(2, 9), b = retry(() => { const v = g * randInt(2, 9); return v !== a && gcd(a, v) === g && v })
      const d = divisors(g)
      return N(`Combien les entiers ${a} et ${b} ont-ils de diviseurs positifs communs ?`, d.length, `Les diviseurs communs sont les diviseurs du PGCD. PGCD(${a} ; ${b}) = ${g}, dont les diviseurs sont ${d.join(', ')} : ${d.length}.`)
    },
  )),
  // Décomposition et nombre de diviseurs
  fresh(variants(
    () => {
      const a = randInt(1, 5), b = randInt(1, 4), c = randInt(0, 3)
      const f: [number, number][] = ([[2, a], [3, b], [5, c]] as [number, number][]).filter(([, e]) => e)
      return N(`Combien l’entier N = ${f.map(([p, e]) => pw(p, e)).join(' × ')} a-t-il de diviseurs positifs ?`, (a + 1) * (b + 1) * (c + 1),
        `Un diviseur s’écrit ${f.map(([p], i) => `${p}^${'αβγ'[i]}`).join(' × ')} avec ${f.map(([, e], i) => `0 ≤ ${'αβγ'[i]} ≤ ${e}`).join(', ')} : ${f.map(([, e]) => e + 1).join(' × ')} = ${(a + 1) * (b + 1) * (c + 1)}.`)
    },
    () => {
      const n = pick([120, 180, 200, 240, 252, 288, 300, 336, 360, 400, 420, 450, 500, 504, 540, 600, 720, 756, 840, 900, 1000])
      const f = factor(n)
      return N(`Combien l’entier ${n} a-t-il de diviseurs positifs ?`, nDiv(n), `${n} = ${factText(f)}, donc ${f.map(([, e]) => `(${e} + 1)`).join(' × ')} = ${nDiv(n)} diviseurs.`)
    },
    () => {
      const n = retry(() => { const v = randInt(12, 500); const f = factor(v); return f.some(([, e]) => e % 2) && f.length >= 2 && v })
      const f = factor(n)
      const k = f.filter(([, e]) => e % 2).reduce((s, [p]) => s * p, 1)
      return N(`Quel est le plus petit entier k > 0 tel que ${n} × k soit le carré d’un entier ?`, k, `${n} = ${factText(f)}. Pour obtenir un carré, tous les exposants doivent être pairs : on multiplie par ${f.filter(([, e]) => e % 2).map(([p]) => p).join(' × ')} = ${k}.`)
    },
    () => {
      const n = retry(() => { const v = randInt(100, 3000); return factor(v).length >= 2 && v })
      const f = factor(n)
      return N(`Combien l’entier ${big(n)} a-t-il de diviseurs premiers distincts ?`, f.length, `${big(n)} = ${factText(f)} : ${f.length} nombres premiers distincts (${f.map(([p]) => p).join(', ')}).`)
    },
  )),
]

// ── Palier 3 : puissances, Bézout, Gauss, critères ──────────────────────
const SMALL_CYCLES: [number, number][] = [[2, 7], [3, 7], [2, 5], [3, 5], [2, 9], [4, 7], [5, 7], [3, 8], [5, 6], [4, 9], [2, 13], [3, 13], [5, 13], [3, 11]]
const p3: Maker[] = [
  // Restes de puissances
  fresh(variants(
    () => {
      const [a, m] = retry(() => { const c = pick(SMALL_CYCLES); return order(c[0], c[1]) <= 6 && c })
      const c = cycle(a, m), k = c.length, e = randInt(50, 2030)
      const r = modpow(a, e, m)
      return N(`Quel est le reste de la division de ${pw(a, e)} par ${m} ?`, r, `Les restes de ${a}^k modulo ${m} sont périodiques : ${c.join(', ')}, puis on recommence (${a}^${k} ≡ 1 [${m}]). ${e} = ${k} × ${Math.floor(e / k)} + ${e % k}, donc ${pw(a, e)} ≡ ${a}^${e % k} ≡ ${r} [${m}].`)
    },
    () => {
      const a = pick([3, 7, 9, 13, 17, 23, 27]), e = randInt(20, 2030)
      const c = [1, ...range(1, 5).map((k) => modpow(a, k, 10))]
      const r = modpow(a, e, 10)
      const per = order(a, 10)
      return N(`Quel est le chiffre des unités de ${pw(a, e)} ?`, r, `Chiffres des unités des puissances de ${a} : ${c.slice(1, per + 1).join(', ')}, puis ça recommence (période ${per}). ${e} = ${per} × ${Math.floor(e / per)} + ${e % per}, donc le chiffre des unités est celui de ${a}^${e % per || per}, soit ${r}.`)
    },
    () => {
      const m = pick([5, 7, 9, 11, 13]), a = m * randInt(1, 6) - 1, e = randInt(20, 999)
      const r = modpow(a, e, m)
      return N(`Quel est le reste de la division de ${pw(a, e)} par ${m} ?`, r, `${a} ≡ −1 [${m}], donc ${pw(a, e)} ≡ (−1)^{${e}} = ${e % 2 ? `−1 ≡ ${r}` : '1'} [${m}].`)
    },
    () => {
      const e = randInt(20, 999), m = pick([5, 7])
      const r = (modpow(2, e, m) + modpow(3, e, m)) % m
      return N(`Quel est le reste de la division de ${pw(2, e)} + ${pw(3, e)} par ${m} ?`, r,
        `Cycles modulo ${m} : puissances de 2 → ${cycle(2, m).join(', ')} ; puissances de 3 → ${cycle(3, m).join(', ')}. ${pw(2, e)} ≡ ${modpow(2, e, m)} et ${pw(3, e)} ≡ ${modpow(3, e, m)}, d’où ${modpow(2, e, m)} + ${modpow(3, e, m)} = ${modpow(2, e, m) + modpow(3, e, m)} ≡ ${r} [${m}].`)
    },
  )),
  // Bézout
  fresh(variants(
    () => {
      const [a, b] = retry(() => { const x = randInt(5, 60), y = randInt(3, 40); return x !== y && gcd(x, y) === 1 && x > 2 && y > 2 && [x, y] })
      const [, u, v] = egcd(a, b)
      return anyPair(`${a} et ${b} sont premiers entre eux. Donne un couple d’entiers (u ; v) tel que ${a}u + ${b}v = 1.`, (x, y) => a * x + b * y === 1, [u, v],
        `En remontant l’algorithme d’Euclide, on trouve par exemple ${a} × ${par(u)} + ${b} × ${par(v)} = 1. (D’autres couples conviennent : (u + ${b}k ; v − ${a}k).)`)
    },
    () => {
      const [a, b, g] = retry(() => { const g = randInt(2, 9), x = g * randInt(2, 12), y = g * randInt(2, 12); return x !== y && gcd(x, y) === g && [x, y, g] })
      const [, u, v] = egcd(a, b)
      return anyPair(`PGCD(${a} ; ${b}) = ${g}. Donne un couple d’entiers (u ; v) tel que ${a}u + ${b}v = ${g}.`, (x, y) => a * x + b * y === g, [u, v],
        `Par exemple ${a} × ${par(u)} + ${b} × ${par(v)} = ${g} (on peut simplifier par ${g} : ${a / g}u + ${b / g}v = 1).`)
    },
    () => {
      const [a, b] = retry(() => { const x = randInt(5, 40), y = randInt(3, 30); return x !== y && gcd(x, y) === 1 && [x, y] })
      const [, u, v] = egcd(a, b)
      const k = randInt(-2, 2), U = u + b * k, V = v - a * k
      return N(`On sait que ${a} × u + ${b} × ${par(V)} = 1. Que vaut l’entier u ?`, U, `${a}u = 1 − ${b} × ${par(V)} = ${1 - b * V}, donc u = ${F(1 - b * V, a)} = ${fmt(U)}.`)
    },
    () => {
      const n = pick([7, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 25, 26]), a = retry(() => { const v = randInt(2, n - 1); return gcd(v, n) === 1 && v })
      const inv = pmod(egcd(a, n)[1], n)
      return N(`Trouve l’entier x, avec 0 ≤ x < ${n}, tel que ${a}x ≡ 1 [${n}].`, inv, `${a} × ${inv} = ${a * inv} = ${n} × ${Math.floor((a * inv) / n)} + 1, donc ${a} × ${inv} ≡ 1 [${n}]. (x est l’inverse de ${a} modulo ${n}.)`)
    },
  )),
  // Équations de congruence, Gauss
  fresh(variants(
    () => {
      const n = pick([5, 7, 11, 13]), a = randInt(2, n - 1), b = randInt(1, n - 1)
      const x = pmod(egcd(a, n)[1] * b, n)
      return N(`Quel est le plus petit entier naturel x tel que ${a}x ≡ ${b} [${n}] ?`, x, `On teste x = 0, 1, … : ${a} × ${x} = ${a * x} ≡ ${b} [${n}]. Comme ${n} est premier et ne divise pas ${a}, c’est la seule solution entre 0 et ${n - 1}.`)
    },
    () => {
      const n = pick([7, 11, 13]), a = randInt(2, n - 1), c = randInt(1, 9), d = randInt(1, 20)
      const x = pmod(egcd(a, n)[1] * (d - c), n)
      return N(`Résous ${a}x + ${c} ≡ ${d} [${n}] : quelle est la solution x comprise entre 0 et ${n - 1} ?`, x, `${a}x ≡ ${d} − ${c} ≡ ${pmod(d - c, n)} [${n}]. On cherche x : ${a} × ${x} = ${a * x} ≡ ${pmod(d - c, n)} [${n}], donc x = ${x}.`)
    },
    () => {
      const [n, a] = retry(() => { const n = randInt(8, 40), a = randInt(6, 60); const g = gcd(n, a); return g > 1 && g < n && a % n !== 0 && a / g > 1 && [n, a] })
      const g = gcd(n, a)
      return N(`Quel est le plus petit entier k > 0 tel que ${n} divise ${a}k ?`, n / g, `PGCD(${n} ; ${a}) = ${g} : ${n} | ${a}k ⇔ ${n / g} | ${a / g}k. Or ${n / g} et ${a / g} sont premiers entre eux : par le théorème de Gauss, ${n / g} | k. Le plus petit est k = ${n / g}.`)
    },
    () => {
      const [m, d] = pick([[20, 4], [20, 5], [12, 3], [12, 4], [30, 6], [30, 5], [18, 6], [18, 9], [24, 8], [15, 5], [28, 7], [36, 9]])
      const r = randInt(d, m - 1)
      return N(`Un entier n vérifie n ≡ ${r} [${m}]. Quel est le reste de la division de n par ${d} ?`, r % d, `n = ${m}k + ${r}, et ${d} divise ${m} : n ≡ ${r} ≡ ${r % d} [${d}].`)
    },
  )),
  // Critères de divisibilité
  fresh(variants(
    () => {
      const { digits, pos, c } = retry(() => {
        const digits = Array.from({ length: randInt(4, 6) }, (_, i) => (i === 0 ? randInt(1, 9) : randInt(0, 9)))
        const pos = randInt(1, digits.length - 1)
        const s = digits.reduce((t, d, i) => (i === pos ? t : t + d), 0)
        const c = pmod(-s, 9)
        return c >= 1 && c <= 8 && { digits, pos, c }
      })
      const shown = digits.map((d, i) => (i === pos ? 'c' : String(d))).join('')
      return N(`Quel chiffre c faut-il écrire pour que le nombre ${shown} soit divisible par 9 ?`, c, `Un nombre est divisible par 9 si la somme de ses chiffres l’est. Sans c, la somme vaut ${digits.reduce((t, d, i) => (i === pos ? t : t + d), 0)} ; il faut ajouter ${c} pour atteindre un multiple de 9 (0 ≤ c ≤ 9, et c = ${c} est le seul possible).`)
    },
    () => {
      const { digits, pos, c } = retry(() => {
        const digits = Array.from({ length: randInt(4, 6) }, (_, i) => (i === 0 ? randInt(1, 9) : randInt(0, 9)))
        const pos = randInt(1, digits.length - 1)
        const len = digits.length
        const alt = digits.reduce((t, d, i) => (i === pos ? t : t + ((len - 1 - i) % 2 ? -d : d)), 0)
        const sign = (len - 1 - pos) % 2 ? -1 : 1
        const c = pmod(-alt * sign, 11)
        return c <= 9 && { digits, pos, c }
      })
      const shown = digits.map((d, i) => (i === pos ? 'c' : String(d))).join('')
      return N(`Quel chiffre c faut-il écrire pour que le nombre ${shown} soit divisible par 11 ?`, c, `Critère : la somme alternée des chiffres (en partant des unités, +, −, +, …) doit être un multiple de 11. Avec c = ${c}, ${digits.map((d, i) => (i === pos ? c : d)).join('')} = 11 × ${Number(digits.map((d, i) => (i === pos ? c : d)).join('')) / 11}.`)
    },
    () => {
      const { digits, c } = retry(() => {
        const digits = Array.from({ length: randInt(4, 6) }, (_, i) => (i === 0 ? randInt(1, 9) : randInt(0, 9)))
        digits[digits.length - 1] = pick([0, 2, 4, 6, 8])
        const c = pmod(-digits.reduce((t, d) => t + d, 0), 3)
        return c >= 1 && { digits, c }
      })
      const shown = digits.slice(0, -1).join('') + 'c' + digits[digits.length - 1]
      return N(`Quel est le plus petit chiffre c tel que le nombre ${shown} soit divisible par 6 ?`, c, `Le nombre est pair (il finit par ${digits[digits.length - 1]}) ; il faut qu’il soit divisible par 3 : la somme des chiffres sans c vaut ${digits.reduce((t, d) => t + d, 0)}, il faut ajouter au moins ${c}.`)
    },
    () => {
      const n = randInt(10_000_000, 99_999_999), m = pick([9, 3, 11])
      const ds = String(n).split('').map(Number)
      const r = n % m
      const how = m === 11
        ? `somme alternée des chiffres depuis les unités : ${[...ds].reverse().map((d, i) => (i ? (i % 2 ? `− ${d}` : `+ ${d}`) : `${d}`)).join(' ')} = ${fmt([...ds].reverse().reduce((t, d, i) => t + (i % 2 ? -d : d), 0))}`
        : `somme des chiffres : ${ds.join(' + ')} = ${ds.reduce((t, d) => t + d, 0)}`
      return N(`Quel est le reste de la division de ${big(n)} par ${m} ?`, r, `Modulo ${m}, on utilise la ${how}, qui est congrue à ${r} [${m}].`)
    },
  )),
  // PGCD et PPCM à partir des décompositions
  fresh(variants(
    () => {
      const P = [2, 3, 5, 7]
      const [ea, eb] = retry(() => {
        const ea = [randInt(0, 4), randInt(0, 3), randInt(0, 2), randInt(0, 1)], eb = [randInt(0, 4), randInt(0, 3), randInt(0, 2), randInt(0, 1)]
        const na = ea.filter((e) => e).length, nb = eb.filter((e) => e).length
        return na >= 2 && nb >= 2 && P.some((_, i) => Math.min(ea[i], eb[i]) > 0) && [ea, eb]
      })
      const show = (e: number[]) => P.map((p, i) => [p, e[i]] as [number, number]).filter(([, k]) => k).map(([p, k]) => pw(p, k)).join(' × ')
      const gE = P.map((_, i) => Math.min(ea[i], eb[i]))
      const g = P.reduce((t, p, i) => t * p ** gE[i], 1)
      return N(`On donne A = ${show(ea)} et B = ${show(eb)}. Calcule PGCD(A ; B).`, g,
        `On garde les facteurs premiers communs avec le plus petit exposant : ${factText(P.map((p, i) => [p, gE[i]] as [number, number]).filter(([, e]) => e))} = ${g}.`)
    },
    () => {
      const P = [2, 3, 5]
      const [ea, eb] = retry(() => {
        const ea = [randInt(0, 3), randInt(0, 2), randInt(0, 1)], eb = [randInt(0, 3), randInt(0, 2), randInt(0, 1)]
        return ea.some((e) => e) && eb.some((e) => e) && ea.join() !== eb.join() && [ea, eb]
      })
      const show = (e: number[]) => P.map((p, i) => [p, e[i]] as [number, number]).filter(([, k]) => k).map(([p, k]) => pw(p, k)).join(' × ')
      const lE = P.map((_, i) => Math.max(ea[i], eb[i]))
      const l = P.reduce((t, p, i) => t * p ** lE[i], 1)
      return N(`On donne A = ${show(ea)} et B = ${show(eb)}. Calcule PPCM(A ; B).`, l,
        `On garde tous les facteurs premiers avec le plus grand exposant : ${factText(P.map((p, i) => [p, lE[i]] as [number, number]).filter(([, e]) => e))} = ${l}.`)
    },
    () => {
      const g = randInt(2, 15), a = g * randInt(2, 12), b = retry(() => { const v = g * randInt(2, 12); return v !== a && gcd(a, v) === g && v })
      return N(`On sait que PGCD(${a} ; ${b}) = ${g}. Sans autre calcul, que vaut PPCM(${a} ; ${b}) ?`, lcm(a, b), `PGCD × PPCM = ${a} × ${b}, donc PPCM = ${F(`${a} × ${b}`, g)} = ${lcm(a, b)}.`)
    },
    () => {
      const g = randInt(2, 12), l = g * randInt(3, 15)
      const ab = g * l
      return N(`Deux entiers naturels a et b ont pour PGCD ${g} et pour PPCM ${l}. Que vaut le produit ab ?`, ab, `Pour tous entiers naturels non nuls, PGCD(a ; b) × PPCM(a ; b) = ab : ${g} × ${l} = ${ab}.`)
    },
  )),
]

// ── Palier 4 : Diophante, Fermat, inverses, comptages ───────────────────
/** Solutions de ax + by = c dans ℤ² : (x0 + k b', y0 − k a'). */
function dioph(a: number, b: number, c: number) {
  const [g, u, v] = egcd(a, b)
  const k = c / g
  return { g, x0: u * k, y0: v * k, bp: b / g, ap: a / g }
}
const p4: Maker[] = [
  // Équations diophantiennes ax + by = c
  fresh(variants(
    () => {
      const [a, b, c] = retry(() => { const a = randInt(3, 25), b = randInt(3, 25), g = gcd(a, b); return a !== b && g <= 3 && [a, b, g * randInt(2, 15) * pick([1, -1])] })
      const d = dioph(a, b, c)
      return anyPair(`Donne une solution (x ; y) en entiers relatifs de l’équation ${a}x + ${b}y = ${fmt(c)}.`, (x, y) => a * x + b * y === c, [d.x0, d.y0],
        `PGCD(${a} ; ${b}) = ${d.g} divise ${fmt(c)}. Bézout : ${a} × ${par(egcd(a, b)[1])} + ${b} × ${par(egcd(a, b)[2])} = ${d.g} ; on multiplie par ${par(c / d.g)} : (${fmt(d.x0)} ; ${fmt(d.y0)}) convient (toutes les solutions : x = ${fmt(d.x0)} + ${d.bp}k, y = ${fmt(d.y0)} − ${d.ap}k).`)
    },
    () => {
      const [a, b, c] = retry(() => { const a = randInt(3, 20), b = randInt(3, 20), g = gcd(a, b); return a !== b && g <= 2 && [a, b, g * randInt(1, 20)] })
      const d = dioph(a, b, c)
      const x = pmod(d.x0 - 1, d.bp) + 1
      const y = (c - a * x) / b
      return pair(`Parmi les solutions entières de ${a}x + ${b}y = ${c}, donne celle dont x est le plus petit entier strictement positif.`, x, y, {
        explanation: `Solution particulière (${fmt(d.x0)} ; ${fmt(d.y0)}) ; toutes les solutions : x = ${fmt(d.x0)} + ${d.bp}k, y = ${fmt(d.y0)} − ${d.ap}k. Le plus petit x > 0 est ${x}, et y = ${F(`${c} − ${a} × ${x}`, b)} = ${fmt(y)}.`,
      })
    },
    () => {
      const [a, b, c] = retry(() => { const a = randInt(2, 9), b = randInt(2, 9), c = randInt(20, 90); return a < b && gcd(a, b) === 1 && [a, b, c] })
      const sols = range(0, Math.floor(c / a) + 1).filter((x) => (c - a * x) % b === 0).map((x) => `(${x} ; ${(c - a * x) / b})`)
      if (!sols.length) return N(`Combien l’équation 3x + 5y = 31 a-t-elle de solutions (x ; y) en entiers naturels ?`, 2, 'Solutions : (2 ; 5) et (7 ; 2), soit 2.')
      return N(`Combien l’équation ${a}x + ${b}y = ${c} a-t-elle de solutions (x ; y) avec x et y entiers naturels ?`, sols.length, `On cherche les x entre 0 et ${Math.floor(c / a)} tels que ${c} − ${a}x soit multiple de ${b} : ${sols.join(', ')}, soit ${sols.length}.`)
    },
    () => {
      const [a, b, c] = retry(() => { const a = randInt(3, 20), b = randInt(3, 20), g = gcd(a, b); return a !== b && g <= 2 && [a, b, g * randInt(1, 20)] })
      const d = dioph(a, b, c)
      const y = pmod(d.y0 - 1, d.ap) + 1
      const x = (c - b * y) / a
      return pair(`Parmi les solutions entières de ${a}x + ${b}y = ${c}, donne celle dont y est le plus petit entier strictement positif.`, x, y, {
        explanation: `Toutes les solutions : x = ${fmt(d.x0)} + ${d.bp}k, y = ${fmt(d.y0)} − ${d.ap}k. Le plus petit y > 0 est ${y}, et x = ${F(`${c} − ${b} × ${y}`, a)} = ${fmt(x)}.`,
      })
    },
  )),
  // Petit théorème de Fermat
  fresh(variants(
    () => {
      const p = pick([7, 11, 13, 17]), a = retry(() => { const v = randInt(2, 30); return v % p !== 0 && v }), e = randInt(100, 3000)
      const r = modpow(a, e, p)
      return N(`Quel est le reste de la division de ${pw(a, e)} par ${p} ?`, r, `${p} est premier et ne divise pas ${a} : d’après Fermat, ${a}^${p - 1} ≡ 1 [${p}]. ${e} = ${p - 1} × ${Math.floor(e / (p - 1))} + ${e % (p - 1)}, donc ${pw(a, e)} ≡ ${a}^${e % (p - 1)} ≡ ${r} [${p}].`)
    },
    () => {
      const p = pick([7, 11, 13, 17, 19, 23]), a = retry(() => { const v = randInt(p + 1, 99); return v % p !== 0 && v })
      return N(`D’après le petit théorème de Fermat, quel reste obtient-on en divisant ${pw(a, p)} par ${p} ?`, a % p, `${p} est premier : d’après Fermat, ${a}^${p} ≡ ${a} [${p}], et ${a} = ${p} × ${Math.floor(a / p)} + ${a % p}.`)
    },
    () => {
      const p = pick([7, 11, 13]), a = randInt(2, 5), b = retry(() => { const v = randInt(2, 6); return v !== a && v }), e = randInt(100, 2000)
      const ra = modpow(a, e, p), rb = modpow(b, e, p), r = (ra + rb) % p
      return N(`Quel est le reste de la division de ${pw(a, e)} + ${pw(b, e)} par ${p} ?`, r, `Fermat : ${a}^${p - 1} ≡ ${b}^${p - 1} ≡ 1 [${p}]. ${e} ≡ ${e % (p - 1)} [${p - 1}], donc ${pw(a, e)} ≡ ${a}^${e % (p - 1)} ≡ ${ra} et ${pw(b, e)} ≡ ${b}^${e % (p - 1)} ≡ ${rb} : somme ≡ ${r} [${p}].`)
    },
    () => {
      const p = pick([7, 11, 13]), a = retry(() => { const v = randInt(30, 200); return v % p !== 0 && v }), e = randInt(100, 999)
      const r = modpow(a, e, p)
      return N(`Calcule le reste de la division euclidienne de ${pw(a, e)} par ${p}.`, r, `${a} ≡ ${a % p} [${p}]. Fermat : ${a % p}^${p - 1} ≡ 1 [${p}] et ${e} ≡ ${e % (p - 1)} [${p - 1}], donc ${pw(a, e)} ≡ ${a % p}^${e % (p - 1)} ≡ ${r} [${p}].`)
    },
  )),
  // Inverses, systèmes de congruences, nombre de solutions
  fresh(variants(
    () => {
      const n = pick([20, 21, 24, 26, 27, 28, 30, 32, 33, 35, 36, 40]), a = retry(() => { const v = randInt(3, n - 2); return gcd(v, n) === 1 && v })
      const inv = pmod(egcd(a, n)[1], n)
      return N(`Quel est l’entier x, avec 0 ≤ x < ${n}, tel que ${a}x ≡ 1 [${n}] ?`, inv, `Bézout : ${a} × ${par(egcd(a, n)[1])} + ${n} × ${par(egcd(a, n)[2])} = 1, donc ${a} × ${par(egcd(a, n)[1])} ≡ 1 [${n}] et x = ${inv} (vérification : ${a} × ${inv} = ${a * inv} ≡ 1).`)
    },
    () => {
      const n = pick([20, 21, 24, 26, 27, 28, 30, 32, 35, 36]), a = retry(() => { const v = randInt(3, n - 2); return gcd(v, n) === 1 && v }), b = randInt(1, n - 1)
      const inv = pmod(egcd(a, n)[1], n), x = (inv * b) % n
      return N(`Résous ${a}x ≡ ${b} [${n}] : quelle est la solution x comprise entre 0 et ${n - 1} ?`, x, `L’inverse de ${a} modulo ${n} est ${inv} (${a} × ${inv} ≡ 1). On multiplie par ${inv} : x ≡ ${inv} × ${b} = ${inv * b} ≡ ${x} [${n}].`)
    },
    () => {
      const [m1, m2] = pick([[3, 5], [4, 5], [3, 7], [5, 7], [4, 7], [5, 6], [7, 8], [5, 9], [4, 9], [7, 9]])
      const r1 = randInt(1, m1 - 1), r2 = randInt(1, m2 - 1)
      const x = range(1, m1 * m2 + 1).find((v) => v % m1 === r1 && v % m2 === r2)!
      return N(`Quel est le plus petit entier x > 0 tel que x ≡ ${r1} [${m1}] et x ≡ ${r2} [${m2}] ?`, x, `On liste les x ≡ ${r2} [${m2}] : ${range(0, m1).map((k) => r2 + m2 * k).join(', ')}… et on garde le premier de reste ${r1} modulo ${m1} : ${x}.`)
    },
    () => {
      const [n, a, b] = retry(() => { const n = pick([12, 15, 18, 20, 21, 24, 28, 30]), a = randInt(2, n - 1), g = gcd(a, n); const b = g * randInt(1, Math.floor((n - 1) / g)); return g > 1 && b < n && [n, a, b] })
      const sols = range(0, n).filter((x) => (a * x - b) % n === 0)
      return N(`Combien l’équation ${a}x ≡ ${b} [${n}] a-t-elle de solutions x dans {0, 1, …, ${n - 1}} ?`, sols.length, `PGCD(${a} ; ${n}) = ${gcd(a, n)} divise ${b} : il y a ${gcd(a, n)} solutions modulo ${n}, à savoir ${sols.join(', ')}.`)
    },
  )),
  // Décomposition : comptages plus fins
  fresh(variants(
    () => {
      const a = randInt(1, 5), b = randInt(1, 3), c = randInt(0, 2)
      const n = 2 ** a * 3 ** b * 5 ** c
      return N(`Combien l’entier ${big(n)} = ${[[2, a], [3, b], [5, c]].filter(([, e]) => e).map(([p, e]) => pw(p, e)).join(' × ')} a-t-il de diviseurs positifs pairs ?`, a * (b + 1) * (c + 1),
        `Un diviseur pair s’écrit 2^α × 3^β${c ? ' × 5^γ' : ''} avec α ≥ 1 : ${a} choix pour α, ${b + 1} pour β${c ? `, ${c + 1} pour γ` : ''}, soit ${a * (b + 1) * (c + 1)}.`)
    },
    () => {
      const n = randInt(20, 160)
      let z = 0
      for (let k = 5; k <= n; k *= 5) z += Math.floor(n / k)
      return N(`Par combien de zéros se termine l’écriture de ${n}! = 1 × 2 × … × ${n} ?`, z, `Chaque zéro final vient d’un facteur 10 = 2 × 5, et les 5 sont plus rares que les 2. Exposant de 5 : ${[5, 25, 125].filter((k) => k <= n).map((k) => `⌊${n}/${k}⌋`).join(' + ')} = ${[5, 25, 125].filter((k) => k <= n).map((k) => Math.floor(n / k)).join(' + ')} = ${z}.`)
    },
    () => {
      const a = randInt(1, 6), b = randInt(1, 4), c = randInt(0, 3)
      const n = 2 ** a * 3 ** b * 5 ** c
      const cnt = (Math.floor(a / 2) + 1) * (Math.floor(b / 2) + 1) * (Math.floor(c / 2) + 1)
      return N(`Combien l’entier ${big(n)} = ${[[2, a], [3, b], [5, c]].filter(([, e]) => e).map(([p, e]) => pw(p, e)).join(' × ')} a-t-il de diviseurs qui sont des carrés parfaits ?`, cnt,
        `Un diviseur carré a tous ses exposants pairs : ${Math.floor(a / 2) + 1} choix pour l’exposant de 2 (${range(0, Math.floor(a / 2) + 1).map((k) => 2 * k).join(', ').replace(/^0$/, 'seulement 0')}), ${Math.floor(b / 2) + 1} pour celui de 3${c ? `, ${Math.floor(c / 2) + 1} pour celui de 5` : ''} : ${cnt}.`)
    },
    () => {
      const k = pick([4, 6, 8, 9, 10, 12, 14, 15, 16])
      const n = range(1, 10000).find((v) => nDiv(v) === k)!
      return N(`Quel est le plus petit entier naturel qui possède exactement ${k} diviseurs positifs ?`, n, `${n} = ${factText(factor(n))} a ${factor(n).map(([, e]) => `(${e} + 1)`).join(' × ')} = ${k} diviseurs, et aucun entier plus petit n’en a exactement ${k} (on répartit ${k} en produit de (exposant + 1), en mettant les plus grands exposants sur les plus petits nombres premiers).`)
    },
  )),
]

// ── Palier 5 : exercices exigeants ──────────────────────────────────────
const p5: Maker[] = [
  // Ordres et cycles
  fresh(variants(
    () => {
      const [a, m] = retry(() => { const m = pick([7, 11, 13, 17, 19, 23, 29, 31]), a = randInt(2, 10); return a % m !== 0 && order(a, m) > 2 && [a, m] })
      const c = cycle(a, m)
      return N(`Quel est le plus petit entier n > 0 tel que ${a}^n ≡ 1 [${m}] ?`, c.length, `Puissances de ${a} modulo ${m} : ${c.slice(1).join(', ')}, puis 1 au rang ${c.length}. (Ce rang divise ${m - 1}, d’après Fermat.)`)
    },
    () => {
      const a = pick([7, 11, 21, 31, 41, 51, 99, 49]), e = randInt(20, 2030)
      const r = modpow(a, e, 100)
      const txt = r < 10 ? `0${r}` : String(r)
      return N(`Quel nombre forment les deux derniers chiffres de ${pw(a, e)} ? (par exemple 7 pour …07)`, r,
        [7, 49, 99].includes(a)
          ? `Modulo 100 : ${a === 99 ? '99 ≡ −1, donc les puissances alternent entre 01 et 99' : `${a}^2 ≡ ${modpow(a, 2, 100)}, ${a}^4 ≡ ${modpow(a, 4, 100)}… le cycle est ${cycle(a, 100).map((v) => (v < 10 ? `0${v}` : v)).join(', ')}`}. ${pw(a, e)} se termine par ${txt}.`
          : `${a} = 1 + ${a - 1} et (1 + ${a - 1})^n ≡ 1 + ${a - 1}n [100] (les autres termes du binôme sont multiples de 100). 1 + ${a - 1} × ${e} = ${1 + (a - 1) * e} ≡ ${r} [100] : ${pw(a, e)} se termine par ${txt}.`)
    },
    () => {
      const [a, m] = pick([[2, 7], [3, 7], [2, 9], [2, 5], [3, 5], [4, 7], [5, 7], [2, 13], [3, 13]])
      const P = order(a, m), b = randInt(2, 7), c = randInt(2, 6)
      const eP = modpow(b, c, P)
      const r = modpow(a, eP === 0 ? P : eP, m)
      return N(`Quel est le reste de la division de ${a}^{${b}${sup(c)}} par ${m} ? (l’exposant est ${b}${sup(c)} = ${big(b ** c)})`, r,
        `${a}^${P} ≡ 1 [${m}], donc seul compte l’exposant modulo ${P} : ${b}${sup(c)} ≡ ${b % P}${sup(c)} ≡ ${eP} [${P}]. D’où ${a}^{${b}${sup(c)}} ≡ ${a}^${eP === 0 ? P : eP} ≡ ${r} [${m}].`)
    },
    () => {
      const [a, m] = pick([[2, 3], [2, 5], [3, 4], [3, 5], [2, 7], [4, 5], [5, 6], [3, 8]]), e = randInt(30, 300)
      let s = 0, t = 1
      for (let k = 0; k <= e; k++) { s = (s + t) % m; t = (t * a) % m }
      const c = cycle(a, m), P = c.length, cs = c.reduce((u, v) => u + v, 0)
      return N(`Quel est le reste de la division de 1 + ${a} + ${a}² + … + ${pw(a, e)} par ${m} ?`, s,
        `Les restes des puissances de ${a} modulo ${m} forment le cycle ${c.join(', ')} (somme ${cs}). Il y a ${e + 1} termes = ${P} × ${Math.floor((e + 1) / P)} + ${(e + 1) % P} : ${Math.floor((e + 1) / P)} × ${cs}${(e + 1) % P ? ` + (${c.slice(0, (e + 1) % P).join(' + ')})` : ''} ≡ ${s} [${m}].`)
    },
  )),
  // Systèmes de congruences
  fresh(variants(
    () => {
      const [m1, m2, m3] = pick([[3, 4, 5], [3, 5, 7], [2, 5, 7], [4, 5, 7], [3, 4, 7], [2, 3, 7], [3, 5, 8]])
      const r = [randInt(0, m1 - 1), randInt(0, m2 - 1), randInt(1, m3 - 1)]
      const x = range(1, m1 * m2 * m3 + 1).find((v) => v % m1 === r[0] && v % m2 === r[1] && v % m3 === r[2])!
      return N(`Quel est le plus petit entier x > 0 tel que x ≡ ${r[0]} [${m1}], x ≡ ${r[1]} [${m2}] et x ≡ ${r[2]} [${m3}] ?`, x,
        `On parcourt les x ≡ ${r[2]} [${m3}] (${r[2]}, ${r[2] + m3}, ${r[2] + 2 * m3}, …) en testant les deux autres conditions : ${x} convient (${x} = ${m1} × ${Math.floor(x / m1)} + ${r[0]} = ${m2} × ${Math.floor(x / m2)} + ${r[1]}). Les solutions sont les ${x} + ${m1 * m2 * m3}k.`)
    },
    () => {
      const k = randInt(4, 7), extra = pick([0, 1, 2])
      const mods = range(2, k + 1)
      const L = mods.reduce((s, m) => lcm(s, m), 1)
      const x = L - 1 + extra * L
      const which = ['plus petit', 'deuxième plus petit', 'troisième plus petit'][extra]
      return N(`Quel est le ${which} entier x > 0 dont le reste est m − 1 dans la division par m, pour chaque m de 2 à ${k} ?`, x,
        `x ≡ −1 modulo ${mods.join(', ')} ⇔ x + 1 est multiple de PPCM(${mods.join(', ')}) = ${L}. Les solutions sont ${L - 1}, ${2 * L - 1}, ${3 * L - 1}… : ${x}.`)
    },
    () => {
      const [m1, m2] = pick([[11, 13], [7, 13], [9, 11], [8, 11], [7, 11], [12, 13], [9, 13]])
      const r1 = randInt(1, m1 - 1), r2 = randInt(1, m2 - 1)
      const x = range(1, m1 * m2 + 1).find((v) => v % m1 === r1 && v % m2 === r2)!
      return N(`Quel est le plus petit entier x > 0 tel que x ≡ ${r1} [${m1}] et x ≡ ${r2} [${m2}] ?`, x,
        `x = ${r2} + ${m2}k ; il faut ${r2} + ${m2}k ≡ ${r1} [${m1}], soit ${m2 % m1 === 1 ? '' : m2 % m1}k ≡ ${pmod(r1 - r2, m1)} [${m1}], d’où k ≡ ${(x - r2) / m2} [${m1}] et x = ${r2} + ${m2} × ${(x - r2) / m2} = ${x}.`)
    },
    () => {
      const [m1, m2] = pick([[3, 5], [4, 7], [5, 7], [3, 8], [6, 7], [5, 9], [4, 9]])
      const r1 = randInt(0, m1 - 1), r2 = randInt(0, m2 - 1), n = pick([100, 200, 500, 1000])
      const x0 = range(0, m1 * m2).find((v) => v % m1 === r1 && v % m2 === r2)!
      const cnt = range(1, n + 1).filter((v) => v % m1 === r1 && v % m2 === r2).length
      return N(`Combien d’entiers x entre 1 et ${n} vérifient x ≡ ${r1} [${m1}] et x ≡ ${r2} [${m2}] ?`, cnt,
        `Les solutions sont les x ≡ ${x0} [${m1 * m2}] (théorème chinois, ${m1} et ${m2} premiers entre eux) : ${x0 === 0 ? `${m1 * m2}, ${2 * m1 * m2}` : `${x0}, ${x0 + m1 * m2}`}, … jusqu’à ${n} : ${cnt} entiers.`)
    },
  )),
  // Diophante : comptages et positivité
  fresh(variants(
    () => {
      const [a, b, c] = retry(() => { const a = randInt(3, 12), b = randInt(5, 17), c = randInt(100, 300); return a < b && gcd(a, b) === 1 && [a, b, c] })
      const xs = range(0, Math.floor(c / a) + 1).filter((x) => (c - a * x) % b === 0)
      return N(`Combien l’équation ${a}x + ${b}y = ${c} a-t-elle de solutions (x ; y) en entiers naturels ?`, xs.length,
        xs.length ? `Les solutions entières sont x = ${xs[0]} + ${b}k, y = ${(c - a * xs[0]) / b} − ${a}k. Il faut x ≥ 0 et y ≥ 0 : k de 0 à ${xs.length - 1}, soit ${xs.length} solutions.` : 'Aucune solution en entiers naturels.')
    },
    () => {
      const [a, b, c, x, y] = retry(() => {
        const a = randInt(3, 15), b = randInt(3, 15), c = randInt(30, 160)
        if (a === b || gcd(a, b) !== 1) return false
        const xs = range(1, Math.floor(c / a) + 1).filter((x) => (c - a * x) % b === 0 && c - a * x > 0)
        return xs.length === 1 && [a, b, c, xs[0], (c - a * xs[0]) / b]
      })
      return pair(`L’équation ${a}x + ${b}y = ${c} a une seule solution (x ; y) en entiers strictement positifs. Laquelle ?`, x, y, {
        explanation: `Les solutions entières sont x = ${x} + ${b}k, y = ${y} − ${a}k : seul k = 0 donne x > 0 et y > 0. Vérification : ${a} × ${x} + ${b} × ${y} = ${c}.`,
      })
    },
    () => {
      const [a, b] = pick([[3, 5], [4, 7], [5, 7], [3, 7], [5, 8], [4, 9], [5, 9], [3, 8], [7, 9]])
      const f = a * b - a - b
      return N(`Avec des pièces de ${a} et de ${b} écus (en nombre illimité), on ne peut pas payer certaines sommes exactes. Quelle est la plus grande somme impossible à payer ?`, f,
        `On vérifie que ${f} ne s’écrit pas ${a}x + ${b}y (x, y ≥ 0), mais que les ${a} sommes consécutives de ${f + 1} à ${f + a} le peuvent ; ensuite on ajoute des pièces de ${a}. (Formule de Sylvester : ${a} × ${b} − ${a} − ${b} = ${f}.)`)
    },
  )),
  // Équations polynomiales modulo n : nombre de solutions
  fresh(variants(
    () => {
      const n = randInt(5, 16), a = pick(range(0, n).map((x) => (x * x) % n).filter((v) => v > 0))
      const s = range(0, n).filter((x) => (x * x) % n === a)
      return N(`Combien l’équation x² ≡ ${a} [${n}] a-t-elle de solutions x dans {0, 1, …, ${n - 1}} ?`, s.length, `Carrés modulo ${n} : ${range(0, n).map((x) => (x * x) % n).join(', ')} (pour x = 0 à ${n - 1}). Solutions : ${s.join(', ')}, soit ${s.length}.`)
    },
    () => {
      const n = randInt(6, 16)
      const s = range(0, n).filter((x) => (x * x + x) % n === 0)
      return N(`Combien l’équation x² + x ≡ 0 [${n}] a-t-elle de solutions x dans {0, 1, …, ${n - 1}} ?`, s.length, `x² + x = x(x + 1). On teste x = 0 à ${n - 1} : solutions ${s.join(', ')}, soit ${s.length}.`)
    },
    () => {
      const n = pick([7, 9, 13, 14, 18, 19]), a = pick(range(1, n).map((x) => (x * x * x) % n).filter((v) => v > 0))
      const s = range(0, n).filter((x) => (x * x * x) % n === a)
      return N(`Combien l’équation x³ ≡ ${a} [${n}] a-t-elle de solutions x dans {0, 1, …, ${n - 1}} ?`, s.length, `Cubes modulo ${n} : ${range(0, n).map((x) => (x * x * x) % n).join(', ')}. Solutions : ${s.join(', ')}, soit ${s.length}.`)
    },
    () => {
      const n = pick([8, 12, 15, 16, 20, 21, 24, 30])
      const s = range(0, n).filter((x) => (x * x) % n === 1)
      return N(`Combien d’entiers x de {0, 1, …, ${n - 1}} vérifient x² ≡ 1 [${n}] ?`, s.length, `Les solutions sont ${s.join(', ')} : ${s.length}. (Il y en a plus que les deux « évidentes » 1 et ${n - 1} car ${n} n’est pas premier.)`)
    },
  )),
]

// ── Problèmes d'amélioration ────────────────────────────────────────────
const upgrades: [Maker[], Maker[], Maker[]] = [
  [
    () => {
      const m = randInt(5, 16)
      const sq = [...new Set(range(0, m).map((x) => (x * x) % m))].sort((a, b) => a - b)
      return N(`Quand n parcourt ℤ, combien de restes différents peut prendre n² dans la division par ${m} ?`, sq.length, `Il suffit de tester n = 0, 1, …, ${m - 1} (n ≡ r [${m}] ⇒ n² ≡ r² [${m}]) : on obtient ${sq.join(', ')}, soit ${sq.length} restes.`)
    },
    () => {
      const m = pick([7, 11, 13, 37, 27]), e = randInt(20, 3000)
      const c = cycle(10, m)
      const r = modpow(10, e, m)
      return N(`Quel est le reste de la division de ${pw(10, e)} par ${m} ?`, r, `Puissances de 10 modulo ${m} : ${c.join(', ')}, puis on recommence (période ${c.length}). ${e} ≡ ${e % c.length} [${c.length}], donc ${pw(10, e)} ≡ ${r} [${m}].`)
    },
    () => {
      const n = pick([360, 720, 1200, 1800, 2520, 3600, 4500, 5400, 6300, 8100, 10800, 14400])
      const f = factor(n)
      const cnt = f.reduce((s, [, e]) => s * (Math.floor(e / 2) + 1), 1)
      return N(`Combien l’entier ${big(n)} a-t-il de diviseurs qui sont des carrés parfaits ?`, cnt, `${big(n)} = ${factText(f)}. Un diviseur carré a des exposants pairs : ${f.map(([p, e]) => `${Math.floor(e / 2) + 1} choix pour ${p}`).join(', ')} : ${cnt}.`)
    },
  ],
  [
    () => {
      const c = pick([
        { e: 'n³ − n', v: 6, w: 'n³ − n = (n − 1)n(n + 1) : trois entiers consécutifs, dont un multiple de 2 et un multiple de 3. Pour n = 2 on obtient 6, donc rien de plus grand ne convient' },
        { e: 'n⁵ − n', v: 30, w: 'Fermat : n⁵ ≡ n modulo 2, 3 (car n³ ≡ n) et 5, donc 30 divise n⁵ − n ; pour n = 2 on obtient 30' },
        { e: 'n(n + 1)(n + 2)(n + 3)', v: 24, w: 'quatre entiers consécutifs : un multiple de 3, un multiple de 4 et un autre nombre pair, donc 24 divise le produit ; pour n = 1 on obtient 24' },
        { e: 'n⁷ − n', v: 42, w: 'Fermat : n⁷ ≡ n modulo 7, et n⁷ − n est divisible par 2 et par 3 ; pour n = 2 : 126 = 3 × 42, pour n = 3 : 2 184 = 52 × 42, PGCD(126 ; 2 184) = 42' },
        { e: 'n²(n² − 1)', v: 12, w: 'n²(n − 1)(n + 1) contient trois entiers consécutifs (multiple de 3) et un facteur 4 (n pair : n² ; n impair : (n − 1)(n + 1)) ; pour n = 2 on obtient 12' },
        { e: '(2n + 1)² − 1', v: 8, w: '(2n + 1)² − 1 = 4n(n + 1), et n(n + 1) est pair ; pour n = 1 on obtient 8' },
        { e: 'n³ + 5n', v: 6, w: 'n³ + 5n = (n³ − n) + 6n, et n³ − n = (n − 1)n(n + 1) est divisible par 6 ; pour n = 1 on obtient 6' },
        { e: '5ⁿ − 1', v: 4, w: '5 ≡ 1 [4] donc 5ⁿ − 1 ≡ 0 [4] ; pour n = 1 on obtient 4' },
        { e: '9ⁿ − 1', v: 8, w: '9 ≡ 1 [8] donc 9ⁿ − 1 ≡ 0 [8] ; pour n = 1 on obtient 8' },
        { e: '8ⁿ − 1', v: 7, w: '8 ≡ 1 [7] donc 8ⁿ − 1 ≡ 0 [7] ; pour n = 1 on obtient 7' },
        { e: '10ⁿ − 1', v: 9, w: '10 ≡ 1 [9] donc 10ⁿ − 1 ≡ 0 [9] ; pour n = 1 on obtient 9' },
        { e: 'n(n + 1)(2n + 1)', v: 6, w: 'n(n + 1) est pair, et l’un des facteurs n, n + 1, 2n + 1 est multiple de 3 (tester n ≡ 0, 1, 2 [3]) ; pour n = 1 on obtient 6' },
      ])
      return N(`Quel est le plus grand entier qui divise ${c.e} pour tout entier n ≥ 1 ?`, c.v, `${c.w}. Réponse : ${c.v}.`)
    },
    () => {
      const a = pick([2, 3]), [m, n] = retry(() => { const m = randInt(4, 18), v = randInt(4, 18); return v !== m && gcd(m, v) > 1 && [m, v] })
      const g = gcd(m, n)
      return N(`Calcule PGCD(${pw(a, m)} − 1 ; ${pw(a, n)} − 1).`, a ** g - 1, `Propriété : PGCD(a^m − 1 ; a^n − 1) = a^{PGCD(m ; n)} − 1 (l’algorithme d’Euclide sur les exposants se reflète sur les nombres). PGCD(${m} ; ${n}) = ${g}, donc ${a}^${g} − 1 = ${a ** g - 1}.`)
    },
    () => {
      const n = pick([12, 15, 18, 20, 21, 24, 28, 30, 36, 40, 42, 45, 50, 60, 72, 84, 90, 100])
      const phi = range(1, n + 1).filter((k) => gcd(k, n) === 1).length
      const f = factor(n)
      return N(`Combien d’entiers compris entre 1 et ${n} sont premiers avec ${n} ?`, phi, `${n} = ${factText(f)}. On retire les multiples de ${f.map(([p]) => p).join(', ')} : ${n} × ${f.map(([p]) => `(1 − ${F(1, p)})`).join(' × ')} = ${phi}.`)
    },
  ],
  [
    () => {
      const [a, b] = pick([[7, 11], [7, 13], [11, 13], [8, 13], [9, 14], [6, 11], [7, 10]]), c = randInt(500, 1500)
      const xs = range(0, Math.floor(c / a) + 1).filter((x) => (c - a * x) % b === 0)
      return N(`Combien l’équation ${a}x + ${b}y = ${c} a-t-elle de solutions (x ; y) en entiers naturels ?`, xs.length,
        xs.length ? `Plus petite solution en x : x = ${xs[0]}, y = ${(c - a * xs[0]) / b}. Les autres s’obtiennent avec x + ${b}k et y − ${a}k, tant que y ≥ 0 : k ≤ ${F((c - a * xs[0]) / b, a)}, d’où ${xs.length} solutions.` : 'Aucune solution.')
    },
    () => {
      const k = pick([4, 5, 6]), p = pick([7, 11, 13])
      const L = range(2, k + 1).reduce((s, m) => lcm(s, m), 1)
      const x = range(1, 100000).find((v) => v % L === 1 && v % p === 0 && v > 1)!
      return N(`Une paysanne compte ses œufs : par ${range(2, k + 1).join(', ')}, il en reste toujours 1 ; par ${p}, il n’en reste aucun. Quel est le plus petit nombre d’œufs possible ?`, x,
        `Il reste 1 modulo ${range(2, k + 1).join(', ')} ⇔ x ≡ 1 [${L}] (PPCM). On teste x = ${L + 1}, ${2 * L + 1}, ${3 * L + 1}… et le premier multiple de ${p} est ${x} = ${p} × ${x / p}.`)
    },
    () => {
      const n = pick([60, 72, 84, 90, 96, 100, 120, 144, 180, 200, 210, 240, 252, 300, 360])
      const f = factor(n)
      const s = divisors(n).reduce((t, d) => t + d, 0)
      return N(`Quelle est la somme de tous les diviseurs positifs de ${n} ?`, s, `${n} = ${factText(f)}. La somme se factorise : ${f.map(([p, e]) => `(${range(0, e + 1).map((k) => (k === 0 ? '1' : k === 1 ? `${p}` : `${p}${sup(k)}`)).join(' + ')})`).join(' × ')} = ${f.map(([p, e]) => range(0, e + 1).reduce((t, k) => t + p ** k, 0)).join(' × ')} = ${s}.`)
    },
  ],
]

// ── Problèmes de l'hôtel de ville ───────────────────────────────────────
const INK_SOFT = '#9c8a6c'
const RED = '#b8362f'
const BLUE = '#5b8fc7'

/** Pièce carrelée : rectangle L × l découpé en carreaux de côté d (à l'échelle). */
function tileFigure(L: number, l: number, d: number, showGrid: boolean): Figure {
  const raw: Record<string, [number, number]> = { A: [0, 0], B: [L, 0], C: [L, l], D: [0, l] }
  const segs: FigSegment[] = []
  if (showGrid) {
    for (let x = d; x < L; x += d) { raw[`_v${x}a`] = [x, 0]; raw[`_v${x}b`] = [x, l]; segs.push({ a: `_v${x}a`, b: `_v${x}b`, color: INK_SOFT }) }
    for (let y = d; y < l; y += d) { raw[`_h${y}a`] = [0, y]; raw[`_h${y}b`] = [L, y]; segs.push({ a: `_h${y}a`, b: `_h${y}b`, color: INK_SOFT }) }
  }
  const pts = fitPoints(raw, 320, 220, 36)
  for (const [k, p] of Object.entries(pts)) { p.label = ''; if (k.startsWith('_')) p.hidden = true }
  for (const k of ['A', 'B', 'C', 'D']) pts[k].hidden = true
  segs.push({ a: 'A', b: 'B', label: `${L} cm` }, { a: 'B', b: 'C', label: `${l} cm` }, { a: 'C', b: 'D' }, { a: 'D', b: 'A' })
  return { points: pts, segments: segs, caption: showGrid ? 'Le carrelage (à l’échelle).' : 'Plan de la pièce (à l’échelle).' }
}

/** Frise du temps : éclats de deux phares toutes les a et b secondes, jusqu'au premier éclat commun. */
function flashFigure(a: number, b: number, tMax: number): Figure {
  const w = 320, h = 160, x0 = 24, x1 = w - 16
  const X = (t: number) => x0 + ((x1 - x0) * t) / tMax
  const points: Record<string, FigPoint> = {
    L1a: { x: x0, y: 60, hidden: true, label: '' }, L1b: { x: x1, y: 60, hidden: true, label: '' },
    L2a: { x: x0, y: 120, hidden: true, label: '' }, L2b: { x: x1, y: 120, hidden: true, label: '' },
  }
  for (let t = 0; t <= tMax; t += a) points[`p${t}`] = { x: X(t), y: 60, label: '' }
  for (let t = 0; t <= tMax; t += b) points[`q${t}`] = { x: X(t), y: 120, label: '' }
  return {
    w, h, points,
    segments: [{ a: 'L1a', b: 'L1b', color: RED }, { a: 'L2a', b: 'L2b', color: BLUE }],
    notes: [{ x: 160, y: 44, text: `phare 1 : toutes les ${a} s` }, { x: 160, y: 104, text: `phare 2 : toutes les ${b} s` }, { x: x0, y: 145, text: '0' }, { x: x1 - 6, y: 145, text: '?' }],
    caption: 'Éclats des deux phares (début de la frise).',
  }
}

/** Deux roues dentées tangentes, avec un repère sur chacune. */
function gearFigure(a: number, b: number): Figure {
  const R1 = 20 + a * 1.4, R2 = 20 + b * 1.4
  const k = Math.min(1, 270 / (2 * R1 + 2 * R2)), r1 = R1 * k, r2 = R2 * k
  const cx1 = 160 - (r1 + r2) / 2 + 0, cx2 = cx1 + r1 + r2, cy = 112
  return {
    points: {
      O1: { x: cx1, y: cy, label: '' }, O2: { x: cx2, y: cy, label: '' },
      T1: { x: cx1 + r1 - 9, y: cy, hidden: true, label: '' }, T2: { x: cx1 + r1 + 9, y: cy, hidden: true, label: '' },
    },
    segments: [{ a: 'T1', b: 'T2', color: '#3a2410' }],
    circles: [{ c: 'O1', r: r1, color: RED }, { c: 'O1', r: r1 - 5, dashed: true, color: RED }, { c: 'O2', r: r2, color: BLUE }, { c: 'O2', r: r2 - 5, dashed: true, color: BLUE }],
    notes: [{ x: cx1, y: cy - r1 - 8, text: `${a} dents` }, { x: cx2, y: cy - r2 - 8, text: `${b} dents` }, { x: cx1 + r1, y: cy + 22, text: 'traits' }],
    caption: 'Les deux roues dentées (schéma).',
  }
}

const age: [Maker[], Maker[], Maker[]] = [
  [
    // Le calendrier
    () => {
      const d = randInt(0, 6), k = retry(() => { const v = randInt(100, 1000); return v % 7 !== 0 && v })
      const r = (d + k) % 7
      const ev = pick(['la grande foire', 'le tournoi', 'la fête des moissons', 'le couronnement'])
      return T('Le calendrier du royaume', choice(`Aujourd’hui, ${JOURS[d]}, le héraut annonce que ${ev} aura lieu dans exactement ${k} jours. Quel jour de la semaine sera-ce ?`, JOURS[r], shuffle(JOURS.filter((j) => j !== JOURS[r])).slice(0, 3),
        `Les jours se répètent tous les 7 jours : on travaille modulo 7. ${k} = 7 × ${Math.floor(k / 7)} + ${k % 7}, donc on avance de ${k % 7} jour${k % 7 > 1 ? 's' : ''} à partir du ${JOURS[d]} : ${JOURS[r]}.`))
    },
    // Les phares
    () => {
      const [a, b] = retry(() => { const a = randInt(4, 15), b = randInt(4, 15); const l = lcm(a, b); return a < b && l !== a * b && l / a <= 12 && l / b >= 2 && l !== b && [a, b] })
      const l = lcm(a, b)
      return T('Les deux phares', N(`Deux phares viennent d’émettre un éclat en même temps. Le premier émet un éclat toutes les ${a} secondes, le second toutes les ${b} secondes. Dans combien de secondes émettront-ils de nouveau un éclat ensemble ?`, l,
        `On cherche le plus petit multiple commun non nul de ${a} et ${b} : PPCM(${a} ; ${b}) = ${F(`${a} × ${b}`, gcd(a, b))} = ${l} s.`), flashFigure(a, b, l))
    },
    // Le carrelage
    () => {
      const [L, l] = retry(() => { const g = pick([10, 12, 15, 20, 25, 30]), x = g * randInt(3, 10), y = g * randInt(2, 7); return x > y && gcd(x, y) === g && [x, y] })
      const g = gcd(L, l)
      const ask = pick(['side', 'count'] as const)
      return T('Le carrelage de la salle', ask === 'side'
        ? N(`Le seigneur veut carreler une salle rectangulaire de ${L} cm sur ${l} cm avec des dalles carrées toutes identiques, les plus grandes possibles, sans aucune découpe. Quel sera le côté d’une dalle, en cm ?`, g, `Le côté doit diviser ${L} et ${l} : c’est PGCD(${L} ; ${l}) = ${g} cm.`)
        : N(`Le seigneur fait carreler une salle de ${L} cm sur ${l} cm avec des dalles carrées identiques, les plus grandes possibles, sans découpe. Combien de dalles faut-il ?`, (L / g) * (l / g), `Côté des dalles : PGCD(${L} ; ${l}) = ${g} cm. Il en faut ${L / g} × ${l / g} = ${(L / g) * (l / g)}.`),
      tileFigure(L, l, g, false))
    },
  ],
  [
    // Les engrenages
    () => {
      const [a, b] = retry(() => { const a = randInt(8, 30), b = randInt(8, 40); const g = gcd(a, b); return a < b && g > 1 && g < a && [a, b] })
      const l = lcm(a, b)
      const ask = pick(['small', 'big'] as const)
      return T('Les engrenages du moulin', N(`Dans le moulin, une roue de ${a} dents entraîne une roue de ${b} dents. On marque d’un trait les deux dents en contact. Combien de tours ${ask === 'small' ? 'la petite' : 'la grande'} roue fera-t-elle avant que les deux traits se retrouvent en contact pour la première fois ?`, ask === 'small' ? l / a : l / b,
        `Il faut qu’un même nombre de dents soit passé sur les deux roues, multiple de ${a} et de ${b} : PPCM(${a} ; ${b}) = ${l} dents. La ${ask === 'small' ? 'petite' : 'grande'} roue fait alors ${l} ÷ ${ask === 'small' ? a : b} = ${ask === 'small' ? l / a : l / b} tours.`), gearFigure(a, b))
    },
    // Le trésor
    () => {
      const [p, q] = pick([[7, 5], [8, 5], [9, 7], [6, 5], [11, 7], [8, 7]])
      const r1 = randInt(1, p - 1), r2 = randInt(1, q - 1), lo = randInt(1, 3) * 100
      const x = range(lo, lo + p * q + 1).find((v) => v % p === r1 && v % q === r2)!
      const who = pick(['pirates', 'mercenaires', 'brigands'])
      return T('Le partage du trésor', N(`Un coffre contient entre ${lo} et ${lo + p * q} pièces d’or. Partagées équitablement entre ${p} ${who}, il en reste ${r1} ; partagées entre ${q}, il en reste ${r2}. Combien y a-t-il de pièces ?`, x,
        `x ≡ ${r1} [${p}] et x ≡ ${r2} [${q}]. ${p} et ${q} sont premiers entre eux : il y a une seule solution par tranche de ${p * q}. On teste les x ≡ ${r1} [${p}] à partir de ${lo} : ${x} = ${p} × ${Math.floor(x / p)} + ${r1} = ${q} × ${Math.floor(x / q)} + ${r2}.`))
    },
    // La clé ISBN
    () => {
      const digits = retry(() => {
        const d = Array.from({ length: 9 }, () => randInt(0, 9))
        const s = d.reduce((t, v, i) => t + (10 - i) * v, 0)
        const key = pmod(-s, 11)
        return key <= 9 && d[0] > 0 && [...d, key]
      })
      const pos = randInt(0, 8)
      const shown = digits.map((v, i) => (i === pos ? '?' : String(v))).join('')
      return T('Le registre du copiste', N(`Les livres de la bibliothèque portent un code de 10 chiffres d₁d₂…d₁₀ tel que 10d₁ + 9d₂ + 8d₃ + … + 2d₉ + 1 × d₁₀ soit divisible par 11. Sur un registre, un chiffre est effacé : ${shown}. Quel est le chiffre manquant ?`, digits[pos],
        `Somme pondérée sans le chiffre manquant : ${digits.reduce((t, v, i) => (i === pos ? t : t + (10 - i) * v), 0)}. Le chiffre manquant a le poids ${10 - pos} ; il faut ${10 - pos} × ? ≡ ${pmod(-digits.reduce((t, v, i) => (i === pos ? t : t + (10 - i) * v), 0), 11)} [11], ce qui donne ? = ${digits[pos]} (seul chiffre de 0 à 9 qui convient, car 11 est premier).`))
    },
  ],
  [
    // Chiffre affine à décoder
    () => {
      const a = pick([3, 5, 7, 9, 11, 15, 17, 19, 21, 25]), b = randInt(1, 25)
      const x = randInt(0, 25), y = (a * x + b) % 26
      const inv = pmod(egcd(a, 26)[1], 26)
      const L = String.fromCharCode(65 + x), Y = String.fromCharCode(65 + y)
      return T('La lettre de l’espion', letter(`L’espion chiffre chaque lettre de rang x (A = 0, B = 1, …, Z = 25) par la lettre de rang y, où y est le reste de ${a}x + ${b} dans la division par 26. Le message intercepté commence par la lettre ${Y} (rang ${y}). Quelle lettre a-t-il chiffrée ?`, L,
        `Il faut résoudre ${a}x + ${b} ≡ ${y} [26], soit ${a}x ≡ ${pmod(y - b, 26)} [26]. L’inverse de ${a} modulo 26 est ${inv} (${a} × ${inv} = ${a * inv} ≡ 1). Donc x ≡ ${inv} × ${pmod(y - b, 26)} ≡ ${x} [26] : c’est la lettre ${L}.`))
    },
    // Les cigales
    () => {
      const [p, q] = pick([[13, 17], [7, 11], [11, 13], [9, 13], [7, 13]])
      const y1 = randInt(2015, 2026), y2 = randInt(2015, 2026)
      const yr = range(2027, 2027 + p * q).find((v) => pmod(v - y1, p) === 0 && pmod(v - y2, q) === 0)!
      return T('Les nuées de cigales', N(`Dans la vallée, une espèce de cigales sort de terre tous les ${p} ans, une autre tous les ${q} ans. La première est sortie en ${y1}, la seconde en ${y2}. En quelle année (après 2026) sortiront-elles pour la première fois la même année ?`, yr,
        `On cherche n ≡ ${y1} [${p}] et n ≡ ${y2} [${q}]. Les années de la première espèce : ${y1 + p}, ${y1 + 2 * p}, ${y1 + 3 * p}… on garde la première qui vérifie n − ${y2} multiple de ${q} : ${yr} (${yr} − ${y1} = ${p} × ${(yr - y1) / p} et ${yr} − ${y2} = ${q} × ${(yr - y2) / q}).`))
    },
    // Les pièces de 7 et 11 écus
    () => {
      const [a, b] = pick([[7, 11], [5, 13], [7, 12], [9, 11], [8, 13], [6, 11]])
      const c = retry(() => { const v = randInt(80, 250); const xs = range(0, Math.floor(v / a) + 1).filter((x) => (v - a * x) % b === 0); return xs.length >= 2 && v })
      const sols = range(0, Math.floor(c / a) + 1).filter((x) => (c - a * x) % b === 0).map((x) => [x, (c - a * x) / b])
      const best = sols.reduce((m, s) => (s[0] + s[1] < m[0] + m[1] ? s : m))
      return T('La bourse du marchand', N(`Un marchand doit payer exactement ${c} écus avec uniquement des pièces de ${a} et de ${b} écus. Quel est le plus petit nombre de pièces qu’il peut utiliser ?`, best[0] + best[1],
        `On résout ${a}x + ${b}y = ${c} en entiers naturels : ${sols.map(([x, y]) => `(${x} ; ${y})`).join(', ')}. Le nombre de pièces x + y est minimal pour (${best[0]} ; ${best[1]}) : ${best[0] + best[1]} pièces (on privilégie les grosses pièces).`))
    },
  ],
]

export const CONTENT: SubjectContent | null = {
  tiers: tidyLadder([p1, p2, p3, p4, p5]),
  upgrades: tidyLadder(upgrades),
  age: tidyLadder(age),
}
