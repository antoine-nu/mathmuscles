import {
  fresh, F, expression, fmt, fraction, fracText, gcd, interval, intervalText, numeric, pair, par, pick, poly, radical,
  randInt, randNonZero, solutionSet, term, xPlus,
  type Exercise, type Interval, type Tiers,
} from './utils'
import { cap, prenom } from './contexts'

// Chaque chapitre : 5 paliers de difficulté (palier n ↔ cran n − 1 de la jauge).
// Palier 1 : application directe ; palier 5 : plusieurs étapes, petits énoncés concrets.

// ── Aides locales ───────────────────────────────────────────────────────
const SQUAREFREE = [2, 3, 5, 6, 7, 10, 11]
type Rel = '<' | '≤' | '>' | '≥'
const RELS: Rel[] = ['<', '≤', '>', '≥']
const flip = (r: Rel): Rel => ({ '<': '>', '≤': '≥', '>': '<', '≥': '≤' } as const)[r]
const strictRel = (r: Rel) => r === '<' || r === '>'

/** Ensemble des réels x tels que « x r v ». */
function relInterval(r: Rel, v: number): Interval {
  if (r === '<') return { lo: -Infinity, hi: v, loClosed: false, hiClosed: false }
  if (r === '≤') return { lo: -Infinity, hi: v, loClosed: false, hiClosed: true }
  if (r === '>') return { lo: v, hi: Infinity, loClosed: false, hiClosed: false }
  return { lo: v, hi: Infinity, loClosed: true, hiClosed: false }
}

/** Puissance dans un énoncé : 10^3, ou 10^{−3} pour un exposant négatif. */
const pw = (b: number | string, e: number) => (e < 0 ? `${b}^{${fmt(e)}}` : `${b}^${e}`)
/** Grand entier avec espaces fines : 34 000 000. */
const big = (n: number) => fmt(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
/** « + 3 » ou « − 3 » (rien si 0), à coller après un terme. */
const tail = (p: number) => (p === 0 ? '' : ` ${p < 0 ? '−' : '+'} ${fmt(Math.abs(p))}`)
/** Coefficient devant une parenthèse : 1 → rien, −1 → « − ». */
const coefP = (k: number) => (k === 1 ? '' : k === -1 ? '−' : fmt(k))
/** Monôme, entre parenthèses s'il est négatif : 3x ou (−3x). */
const mono = (c: number, v = 'x') => (c < 0 ? `(${term(c, v, true)})` : term(c, v, true))
/** k√m lisible (√m si k = 1). */
const rt = (k: number, m: number) => `${k === 1 ? '' : k}√${m}`
const r2 = (v: number) => Math.round(v * 100) / 100
const sum = (a: number[]) => a.reduce((s, v) => s + v, 0)
/** Somme écrite proprement : 3 + (−2) + 5, sans les termes nuls. */
const sumText = (nums: number[]) => nums.filter((n) => n !== 0).map((n, i) => (i === 0 ? fmt(n) : par(n))).join(' + ') || '0'
const plural = (n: number, w: string) => `${fmt(n)} ${w}${Math.abs(n) > 1 ? 's' : ''}`
const pt = (x: number, y: number) => `(${fmt(x)} ; ${fmt(y)})`
/** Monôme « (n/d)x » écrit proprement : x, −x, 3x, 2/3x. */
const fx = (n: number, d: number) => {
  const t = fracText(n, d)
  return t === '1' ? 'x' : t === '−1' ? '−x' : `${t}x`
}

/** k√m réduit : 72 → [6, 2]. */
function rootParts(n: number): [number, number] {
  let k = 1, m = n
  for (let d = 2; d * d <= m; d++) while (m % (d * d) === 0) { m /= d * d; k *= d }
  return [k, m]
}

/** Retire tant que le tirage ne convient pas (gen renvoie null). */
function retry(gen: () => Exercise | null, tries = 1000): Exercise {
  for (let i = 0; i < tries; i++) {
    let ex: Exercise | null = null
    try {
      ex = gen()
    } catch (e) {
      // un tirage imbriqué impossible (oneOf dont toutes les configurations sont exclues) : on retire
      if ((e as Error).message !== 'tirage impossible') throw e
    }
    if (ex) return ex
  }
  throw new Error('tirage impossible')
}

/** Exige une factorisation complète en facteurs du premier degré (pas de x² restant). */
function fullyFactored(ex: Exercise): Exercise {
  const base = ex.check
  // plus de x², x³… isolé : (x + 3)² est accepté, x(x² − 4) ne l'est pas
  const linear = (v: string) => !/x\s*[²³^]/.test(v)
  return {
    ...ex,
    check: (v) => base(v) && linear(v),
    diagnose: (v) => (base(v) && !linear(v) ? 'C’est juste, mais tu peux encore factoriser (pense aux identités remarquables).' : ex.diagnose?.(v)),
  }
}

/** Tire au hasard une configuration parmi plusieurs (une configuration qui renvoie null est retirée). */
const oneOf = (...gens: (() => Exercise | null)[]): Exercise => retry(() => pick(gens)(), 60)

/** Triplets pythagoriciens (p ; q ; r) avec p² + q² = r². */
const TRIPLES: [number, number, number][] = [[3, 4, 5], [4, 3, 5], [6, 8, 10], [8, 6, 10], [5, 12, 13], [12, 5, 13], [9, 12, 15], [8, 15, 17]]

/** Grandeurs réelles pour la notation scientifique. */
const SCI = [
  { t: 'La distance moyenne entre la Terre et le Soleil est d’environ 150 000 000 km.', v: '150 000 000', a: 1.5, n: 8 },
  { t: 'Un cheveu a un diamètre d’environ 0,00007 m.', v: '0,00007', a: 7, n: -5 },
  { t: 'La Terre compte environ 8 000 000 000 habitants.', v: '8 000 000 000', a: 8, n: 9 },
  { t: 'Un globule rouge mesure environ 0,0000075 m.', v: '0,0000075', a: 7.5, n: -6 },
  { t: 'La lumière parcourt environ 300 000 km par seconde.', v: '300 000', a: 3, n: 5 },
  { t: 'Une bactérie mesure environ 0,000002 m.', v: '0,000002', a: 2, n: -6 },
  { t: 'Un grain de pollen mesure environ 0,00003 m.', v: '0,00003', a: 3, n: -5 },
  { t: 'Au cours d’une vie, un cœur humain bat environ 3 000 000 000 fois.', v: '3 000 000 000', a: 3, n: 9 },
]

/** Intersection de deux intervalles qui se chevauchent. */
function interI(A: Interval, B: Interval): Interval {
  const lo = Math.max(A.lo, B.lo), hi = Math.min(A.hi, B.hi)
  return {
    lo, hi,
    loClosed: (A.lo !== lo || A.loClosed) && (B.lo !== lo || B.loClosed),
    hiClosed: (A.hi !== hi || A.hiClosed) && (B.hi !== hi || B.hiClosed),
  }
}
/** Réunion de deux intervalles qui se chevauchent. */
function unionI(A: Interval, B: Interval): Interval {
  const lo = Math.min(A.lo, B.lo), hi = Math.max(A.hi, B.hi)
  return {
    lo, hi,
    loClosed: Number.isFinite(lo) && ((A.lo === lo && A.loClosed) || (B.lo === lo && B.loClosed)),
    hiClosed: Number.isFinite(hi) && ((A.hi === hi && A.hiClosed) || (B.hi === hi && B.hiClosed)),
  }
}
const boundText = (v: number) => (v === Infinity ? '+∞' : v === -Infinity ? '−∞' : fmt(v))
const interExpl = (A: Interval, B: Interval) => {
  const R = interI(A, B)
  return `On garde les nombres communs aux deux intervalles : de ${boundText(R.lo)}${Number.isFinite(R.lo) ? (R.loClosed ? ' (inclus)' : ' (exclu)') : ''} à ${boundText(R.hi)}${Number.isFinite(R.hi) ? (R.hiClosed ? ' (inclus)' : ' (exclu)') : ''}, soit ${intervalText(R)}.`
}
const unionExpl = (A: Interval, B: Interval) => {
  const R = unionI(A, B)
  return `Les deux intervalles se chevauchent : la réunion va de la plus petite borne à la plus grande, avec les crochets des bornes extrêmes : ${intervalText(R)}.`
}

/** « de Léa », « d’Adam ». */
const de = (nom: string) => (/^[AEIOUYÉÈÂÎ]/.test(nom) ? `d’${nom}` : `de ${nom}`)

const MOINES = ['frère Anselme', 'frère Benoît', 'sœur Hildegarde', 'frère Colomban', 'sœur Scholastique', 'frère Bernard']

// ── Nombres & calculs ───────────────────────────────────────────────────
const nombres: Tiers = [
  [
    // Produit de puissances d'un même nombre
    () => {
      const a = pick([2, 3, 5, 7, 10]), m = randInt(2, 9), n = randInt(2, 9)
      return oneOf(
        () => numeric(`Écris ${a}^${m} × ${a}^${n} sous la forme ${a}^n. Que vaut n ?`, m + n, { explanation: `aᵐ × aⁿ = aᵐ⁺ⁿ : ${m} + ${n} = ${m + n}.` }),
        () => numeric(`Complète : ${a}^${m} × ${a}^{…} = ${a}^${m + n}. Quel exposant faut-il écrire à la place des pointillés ?`, n, {
          explanation: `Les exposants s'additionnent : ${m} + … = ${m + n}, donc il manque ${n}.`,
        }),
        () => {
          const k = randInt(2, 6)
          return numeric(`Écris ${a}^${m} × ${a}^${k} × ${a}^${n} sous la forme d'une seule puissance de ${a}. Quel est son exposant ?`, m + k + n, {
            explanation: `On additionne les trois exposants : ${m} + ${k} + ${n} = ${m + k + n}.`,
          })
        },
        () => numeric(`Pour tout réel x non nul, x^${m} × x^${n} = x^p. Que vaut p ?`, m + n, { explanation: `xᵐ × xⁿ = xᵐ⁺ⁿ : p = ${m} + ${n} = ${m + n}.` }),
        () => numeric(`Écris ${a}^${m} × ${a} sous la forme ${a}^n. Que vaut n ?`, m + 1, { explanation: `${a} = ${a}^1, donc n = ${m} + 1 = ${m + 1}.` }),
        () => numeric(`Le trésor du seigneur compte 2^${m} coffres contenant chacun 2^${n} pièces d'or. Il possède donc 2^p pièces. Que vaut p ?`, m + n, {
          explanation: `Nombre de pièces : 2^${m} × 2^${n} = 2^${m + n}, donc p = ${m + n}.`,
        }),
      )
    },
    // Quotient de puissances
    () => {
      const a = pick([2, 3, 5, 7]), m = randInt(5, 12), n = randInt(2, m - 1)
      const expl = { explanation: `aᵐ ÷ aⁿ = aᵐ⁻ⁿ : ${m} − ${n} = ${m - n}.` }
      return oneOf(
        () => numeric(`Écris ${F(`${a}^${m}`, `${a}^${n}`)} sous la forme ${a}^n. Que vaut n ?`, m - n, expl),
        () => numeric(`Écris ${a}^${m} ÷ ${a}^${n} sous la forme d'une seule puissance de ${a}. Quel est son exposant ?`, m - n, expl),
        () => numeric(`Complète : ${F(`${a}^${m}`, `${a}^{…}`)} = ${a}^${m - n}. Quel exposant manque-t-il au dénominateur ?`, n, {
          explanation: `Les exposants se soustraient : ${m} − … = ${m - n}, donc il manque ${n}.`,
        }),
        () => numeric(`Pour tout réel x non nul, ${F(`x^${m}`, `x^${n}`)} = x^p. Que vaut p ?`, m - n, { explanation: `xᵐ ÷ xⁿ = xᵐ⁻ⁿ : p = ${m} − ${n} = ${m - n}.` }),
        () => numeric(`Un trésor de 10^${m} pièces est partagé équitablement entre 10^${n} chevaliers. Chacun reçoit 10^p pièces. Que vaut p ?`, m - n, {
          explanation: `10^${m} ÷ 10^${n} = 10^${m - n}, donc p = ${m - n}.`,
        }),
      )
    },
    // Puissances de 10 d'exposant négatif
    () => {
      const k = randInt(1, 4)
      return oneOf(
        () => numeric(`Écris ${pw(10, -k)} sous forme décimale.`, 10 ** -k, {
          explanation: `${pw(10, -k)} = ${F(1, `10^${k}`)} = ${fmt(10 ** -k)} : le chiffre 1 est au rang ${k} après la virgule.`,
        }),
        () => numeric(`On écrit ${fmt(10 ** -k)} sous la forme 10^n. Que vaut n ?`, -k, { explanation: `${fmt(10 ** -k)} = ${F(1, `10^${k}`)} = ${pw(10, -k)}.` }),
        () => {
          const d = randInt(2, 9)
          return numeric(`Écris ${d} × ${pw(10, -k)} sous forme décimale.`, d * 10 ** -k, {
            explanation: `${pw(10, -k)} = ${fmt(10 ** -k)}, donc ${d} × ${fmt(10 ** -k)} = ${fmt(d * 10 ** -k)} : le chiffre ${d} est au rang ${k} après la virgule.`,
          })
        },
        () => {
          const u = pick([
            { a: '1 mm', b: 'm', e: -3 }, { a: '1 cm', b: 'm', e: -2 }, { a: '1 mg', b: 'g', e: -3 }, { a: '1 mL', b: 'L', e: -3 },
            { a: '1 dm', b: 'm', e: -1 }, { a: '1 µm (micromètre)', b: 'm', e: -6 }, { a: '1 cL', b: 'L', e: -2 },
          ])
          return numeric(`On a ${u.a} = 10^n ${u.b}. Que vaut n ?`, u.e, { explanation: `${u.a} = ${fmt(10 ** u.e)} ${u.b} = ${F(1, 10 ** -u.e)} ${u.b} = ${pw(10, u.e)} ${u.b}.` })
        },
        () => numeric(`On écrit ${F(1, 10 ** k)} sous la forme 10^n. Que vaut n ?`, -k, { explanation: `${F(1, 10 ** k)} = ${F(1, `10^${k}`)} = ${pw(10, -k)}.` }),
      )
    },
    // Inégalité → intervalle
    () => {
      const r = pick(RELS), a = randInt(-9, 9)
      const words: Record<Rel, string> = { '<': 'strictement inférieurs à', '≤': 'inférieurs ou égaux à', '>': 'strictement supérieurs à', '≥': 'supérieurs ou égaux à' }
      const expl = (v: number, rr: Rel) => `${strictRel(rr) ? `Inégalité stricte : ${fmt(v)} est exclu (crochet ouvert)` : `${fmt(v)} est inclus (crochet fermé)`} ; du côté de l'infini, le crochet est toujours ouvert.`
      return oneOf(
        () => interval(`Écris sous forme d'intervalle l'ensemble des réels x tels que x ${r} ${fmt(a)}.`, relInterval(r, a), { explanation: expl(a, r) }),
        () => interval(`Écris sous forme d'intervalle l'ensemble des réels x tels que ${fmt(a)} ${flip(r)} x.`, relInterval(r, a), {
          explanation: `${fmt(a)} ${flip(r)} x signifie x ${r} ${fmt(a)}. ${expl(a, r)}`,
        }),
        () => interval(`Écris sous forme d'intervalle l'ensemble des réels ${words[r]} ${fmt(a)}.`, relInterval(r, a), {
          explanation: `Ce sont les réels x tels que x ${r} ${fmt(a)}. ${expl(a, r)}`,
        }),
        () => {
          const c = pick([
            () => { const v = randInt(10, 14) * 10; return { t: `Pour monter dans ce manège, il faut mesurer au moins ${v} cm. Donne l'intervalle des tailles x (en cm) autorisées.`, r: '≥' as Rel, v } },
            () => { const v = randInt(-8, 4); return { t: `Cette nuit, la température x (en °C) est restée strictement inférieure à ${fmt(v)} °C. Donne l'intervalle auquel appartient x.`, r: '<' as Rel, v } },
            () => { const v = pick([10, 12, 16, 18]); return { t: `Ce film est réservé aux spectateurs d'au moins ${v} ans. Donne l'intervalle des âges x (en années) autorisés.`, r: '≥' as Rel, v } },
            () => { const v = randInt(3, 9) * 100; return { t: `Tout le sentier se situe strictement au-dessus de ${v} m d'altitude. Donne l'intervalle auquel appartient l'altitude x (en m) d'un point du sentier.`, r: '>' as Rel, v } },
            () => { const v = randInt(-5, 3); return { t: `Pendant toute la journée, la température x (en °C) n'a pas dépassé ${fmt(v)} °C. Donne l'intervalle auquel appartient x.`, r: '≤' as Rel, v } },
          ])()
          return interval(c.t, relInterval(c.r, c.v), { explanation: `On traduit par x ${c.r} ${fmt(c.v)}. ${expl(c.v, c.r)}` })
        },
      )
    },
    // Racines carrées de carrés parfaits
    () => {
      const a = randInt(2, 15), b = randInt(2, 12)
      return oneOf(
        () => {
          const op = pick(['+', '−', '×']), v = op === '+' ? a + b : op === '−' ? a - b : a * b
          return numeric(`Calcule √{${a * a}} ${op} √{${b * b}}.`, v, { explanation: `√{${a * a}} = ${a} car ${a}² = ${a * a}, et √{${b * b}} = ${b} : ${a} ${op} ${b} = ${fmt(v)}.` })
        },
        () => {
          const [p, q, r] = pick(TRIPLES)
          return numeric(`Calcule √{${p * p} + ${q * q}}.`, r, {
            explanation: `On calcule d'abord sous la racine : ${p * p} + ${q * q} = ${r * r}, et √{${r * r}} = ${r}. Attention : ce n'est pas √{${p * p}} + √{${q * q}} = ${p + q} !`,
          })
        },
        () => {
          const c = pick([2, 3, 5, 6, 7, 10, 11, 13])
          return numeric(`Calcule (√{${c}})² + √{${b * b}}.`, c + b, { explanation: `(√{${c}})² = ${c} par définition de la racine carrée, et √{${b * b}} = ${b} : ${c} + ${b} = ${c + b}.` })
        },
        () => numeric(`Un carré a une aire de ${a * a} m². Quelle est la longueur de son côté (en m) ?`, a, { explanation: `Le côté c vérifie c² = ${a * a}, donc c = √{${a * a}} = ${a}.` }),
        () => {
          const s = randInt(2, 5), t = randInt(2, 6)
          return numeric(`Calcule √{${s * s} × ${t * t}}.`, s * t, { explanation: `√{a × b} = √a × √b : √{${s * s}} × √{${t * t}} = ${s} × ${t} = ${s * t}.` })
        },
      )
    },
    // Valeur absolue, distance entre deux nombres
    () => retry(() => {
      const a = randNonZero(-12, 12), b = randNonZero(-12, 12)
      if (a === b) return null
      return oneOf(
        () => numeric(`Calcule |${fmt(a)} − ${par(b)}|.`, Math.abs(a - b), {
          explanation: `${fmt(a)} − ${par(b)} = ${fmt(a - b)}, et la valeur absolue est la distance à 0 : |${fmt(a - b)}| = ${Math.abs(a - b)}.`,
        }),
        () => numeric(`Calcule |${fmt(a)}| + |${fmt(b)}|.`, Math.abs(a) + Math.abs(b), {
          explanation: `|${fmt(a)}| = ${Math.abs(a)} et |${fmt(b)}| = ${Math.abs(b)} (distances à 0) : ${Math.abs(a)} + ${Math.abs(b)} = ${Math.abs(a) + Math.abs(b)}.`,
        }),
        () => {
          const lo = randInt(-12, -1), hi = randInt(1, 12)
          return numeric(`Un matin d'hiver, il fait ${fmt(lo)} °C à 7 h et ${hi} °C à 14 h. De combien de degrés la température a-t-elle monté ?`, hi - lo, {
            explanation: `L'écart vaut |${hi} − ${par(lo)}| = ${hi} + ${-lo} = ${hi - lo} °C.`,
          })
        },
        () => {
          const d = randInt(3, 40), h = randInt(5, 60)
          return numeric(`Un plongeur est à l'altitude ${fmt(-d)} m et une mouette vole à l'altitude ${h} m, juste au-dessus de lui. Quelle distance (en m) les sépare ?`, d + h, {
            explanation: `La distance vaut |${h} − ${par(-d)}| = ${h} + ${d} = ${d + h} m.`,
          })
        },
        () => numeric(`Sur une droite graduée, A a pour abscisse ${fmt(a)} et B a pour abscisse ${fmt(b)}. Quelle est la distance AB ?`, Math.abs(a - b), {
          explanation: `AB = |${fmt(b)} − ${par(a)}| = |${fmt(b - a)}| = ${Math.abs(a - b)}.`,
        }),
      )
    }),
  ],
  [
    // Puissance d'une puissance
    () => {
      const a = pick([2, 3, 5, 10]), m = randInt(2, 5), n = randInt(2, 4), k = randInt(2, 12)
      return oneOf(
        () => numeric(`Écris (${a}^${m})^${n} ÷ ${a}^${k} sous la forme ${a}^n. Que vaut n ?`, m * n - k, { explanation: `(aᵐ)ⁿ = aᵐˣⁿ : ${a}^${m * n}, puis ${m * n} − ${k} = ${fmt(m * n - k)}.` }),
        () => numeric(`Écris (${a}^${m})^${n} × ${a}^${k} sous la forme d'une seule puissance de ${a}. Quel est son exposant ?`, m * n + k, {
          explanation: `(aᵐ)ⁿ = aᵐˣⁿ : ${a}^${m * n}, puis ${m * n} + ${k} = ${m * n + k}.`,
        }),
        () => numeric(`Complète : (${a}^${m})^{…} = ${a}^${m * n}. Quel exposant manque-t-il ?`, n, { explanation: `(aᵐ)ⁿ = aᵐˣⁿ : ${m} × … = ${m * n}, donc il manque ${n}.` }),
        () => numeric(`Pour tout réel x non nul, (x^${m} × x^${k})^${n} = x^p. Que vaut p ?`, (m + k) * n, {
          explanation: `Dans la parenthèse : x^${m} × x^${k} = x^${m + k} ; puis (x^${m + k})^${n} = x^${(m + k) * n}.`,
        }),
        () => numeric(`Écris ${F(`${a}^${k}`, `(${a}^${m})^${n}`)} sous la forme ${a}^n. Que vaut n ?`, k - m * n, {
          explanation: `(${a}^${m})^${n} = ${a}^${m * n}, puis ${k} − ${m * n} = ${fmt(k - m * n)}.`,
        }),
      )
    },
    // Notation scientifique
    () => {
      const digits = randInt(11, 99), neg = pick([true, false])
      const e = neg ? -randInt(2, 5) : randInt(4, 9)
      const val = neg ? digits / 10 ** (1 - e) : digits * 10 ** (e - 1)
      const v = neg ? fmt(val) : big(val)
      const expl = { explanation: `${v} = ${fmt(digits / 10)} × ${pw(10, e)} (on déplace la virgule de ${Math.abs(e)} rang${Math.abs(e) > 1 ? 's' : ''}).` }
      return oneOf(
        () => numeric(`On écrit ${v} en notation scientifique a × 10^n (avec 1 ≤ a < 10). Que vaut n ?`, e, expl),
        () => numeric(`On écrit ${v} en notation scientifique a × 10^n (avec 1 ≤ a < 10). Que vaut a ?`, digits / 10, expl),
        () => numeric(`Écris ${fmt(digits / 10)} × ${pw(10, e)} en écriture décimale.`, val, { answer: v, ...expl }),
        () => {
          const c = pick(SCI)
          return numeric(`${c.t} En notation scientifique a × 10^n (avec 1 ≤ a < 10), que vaut n ?`, c.n, { explanation: `${c.v} = ${fmt(c.a)} × ${pw(10, c.n)}.` })
        },
      )
    },
    // Exposants négatifs
    () => {
      const a = pick([2, 3, 4, 5, 10]), n = randInt(1, a === 2 ? 5 : a === 10 ? 4 : 3)
      return oneOf(
        () => fraction(`Écris ${pw(a, -n)} sous la forme d'une fraction.`, 1, a ** n, { explanation: `a^{−n} = ${F(1, 'a^n')} : ${pw(a, -n)} = ${F(1, `${a}^${n}`)} = ${F(1, a ** n)}.` }),
        () => numeric(`On écrit ${F(1, a ** n)} sous la forme ${a}^n. Que vaut n ?`, -n, { explanation: `${F(1, a ** n)} = ${F(1, `${a}^${n}`)} = ${pw(a, -n)}.` }),
        () => retry(() => {
          const p = randInt(2, 9), q = randInt(1, 9)
          if (p === q || gcd(p, q) !== 1) return null
          return fraction(`Écris (${F(p, q)})^{−1} sous la forme d'une fraction.`, q, p, { explanation: `L'exposant −1 donne l'inverse : on renverse la fraction, ${fracText(q, p)}.` })
        }),
        () => {
          const [b, k] = pick([[2, 1], [2, 2], [2, 3], [4, 1], [5, 1], [5, 2], [10, 1], [10, 2], [10, 3]])
          return numeric(`On écrit ${fmt(1 / b ** k)} sous la forme ${b}^n. Que vaut n ?`, -k, { explanation: `${fmt(1 / b ** k)} = ${F(1, b ** k)} = ${F(1, `${b}^${k}`)} = ${pw(b, -k)}.` })
        },
      )
    },
    // Double inégalité → intervalle
    () => {
      const a = randInt(-8, 2), b = randInt(a + 1, 10), lc = pick([true, false]), rc = pick([true, false])
      const I: Interval = { lo: a, hi: b, loClosed: lc, hiClosed: rc }
      const expl = { explanation: `Inégalité stricte → crochet ouvert, inégalité large → crochet fermé : ${fmt(a)} est ${lc ? 'inclus' : 'exclu'}, ${fmt(b)} est ${rc ? 'inclus' : 'exclu'}.` }
      const L = lc ? '≤' : '<', R = rc ? '≤' : '<'
      return oneOf(
        () => interval(`Écris sous forme d'intervalle l'ensemble des réels x tels que ${fmt(a)} ${L} x ${R} ${fmt(b)}.`, I, expl),
        () => interval(`Écris sous forme d'intervalle l'ensemble des réels x tels que ${fmt(b)} ${flip(R)} x ${flip(L)} ${fmt(a)}.`, I, expl),
        () => interval(`Écris sous forme d'intervalle l'ensemble des réels x tels que x ${flip(L)} ${fmt(a)} et x ${R} ${fmt(b)}.`, I, expl),
        () => interval(`Écris sous forme d'intervalle l'ensemble des réels compris entre ${fmt(a)} (${lc ? 'inclus' : 'exclu'}) et ${fmt(b)} (${rc ? 'inclus' : 'exclu'}).`, I, expl),
        () => {
          const lo = randInt(3, 6), hi = randInt(10, 14)
          return interval(`Au musée, le tarif enfant s'applique à partir de ${lo} ans (inclus) et jusqu'à ${hi} ans (exclus). Donne l'intervalle des âges x (en années) concernés.`, { lo, hi, loClosed: true, hiClosed: false }, {
            explanation: `${lo} ≤ x < ${hi} : ${lo} est inclus (crochet fermé), ${hi} est exclu (crochet ouvert).`,
          })
        },
      )
    },
    // Distance entre deux décimaux
    () => retry(() => {
      const a = randInt(-90, 90) / 10, b = randInt(-90, 90) / 10
      if (a === b || (Number.isInteger(a) && Number.isInteger(b))) return null
      const d = r2(Math.abs(a - b)), expl = { explanation: `La distance vaut |${fmt(a)} − ${par(b)}| = |${fmt(r2(a - b))}| = ${fmt(d)}.` }
      return oneOf(
        () => numeric(`Sur une droite graduée, quelle est la distance entre les points d'abscisses ${fmt(a)} et ${fmt(b)} ?`, d, expl),
        () => numeric(`Calcule |${fmt(a)} − ${par(b)}|.`, d, expl),
        () => numeric(`Sur un axe, A a pour abscisse ${fmt(a)} et B a pour abscisse ${fmt(b)}. Calcule la longueur AB.`, d, expl),
        () => {
          const lo = -randInt(5, 150) / 10, hi = randInt(5, 200) / 10
          return numeric(`Le thermomètre affichait ${fmt(lo)} °C à l'aube et ${fmt(hi)} °C à midi. De combien de degrés la température a-t-elle augmenté ?`, r2(hi - lo), {
            explanation: `L'écart vaut ${fmt(hi)} − ${par(lo)} = ${fmt(hi)} + ${fmt(-lo)} = ${fmt(r2(hi - lo))} °C.`,
          })
        },
      )
    }),
    // Encadrer une racine carrée
    () => {
      const n = randInt(2, 14), N = randInt(n * n + 1, (n + 1) * (n + 1) - 1)
      const expl = { explanation: `${n}² = ${n * n} < ${N} < ${(n + 1) ** 2} = ${n + 1}², donc ${n} < √{${N}} < ${n + 1}.` }
      return oneOf(
        () => numeric(`Quel est l'entier n tel que n < √{${N}} < n + 1 ?`, n, expl),
        () => numeric(`√{${N}} est compris entre deux entiers consécutifs. Quel est le plus grand des deux ?`, n + 1, expl),
        () => numeric(`Quel est le plus grand entier n tel que n² ≤ ${N} ?`, n, { explanation: `${n}² = ${n * n} ≤ ${N}, mais ${n + 1}² = ${(n + 1) ** 2} > ${N} : n = ${n}.` }),
        () => numeric(`Un carré a une aire de ${N} m². Son côté mesure entre n et n + 1 mètres, avec n entier. Que vaut n ?`, n, {
          explanation: `Le côté vaut √{${N}} m, et ${n}² = ${n * n} < ${N} < ${(n + 1) ** 2} = ${n + 1}², donc ${n} < √{${N}} < ${n + 1}.`,
        }),
      )
    },
  ],
  [
    // Simplifier une racine carrée
    () => {
      const k = randInt(2, 7), m = pick(SQUAREFREE)
      return oneOf(
        () => radical(`Écris √{${k * k * m}} sous la forme a√b, avec b le plus petit possible.`, k, m, { explanation: `${k * k * m} = ${k * k} × ${m} et √{${k * k}} = ${k}.` }),
        () => retry(() => {
          const p = randInt(2, 12), q = randInt(2, 15), [kk, mm] = rootParts(p * q)
          if (p === q || kk === 1 || mm === 1 || p * q > 200) return null
          return radical(`Écris √{${p}} × √{${q}} sous la forme a√b, avec b le plus petit possible.`, kk, mm, {
            explanation: `√{${p}} × √{${q}} = √{${p * q}} = √{${kk * kk} × ${mm}} = ${rt(kk, mm)}.`,
          })
        }),
        () => radical(`Un carré a des côtés de ${k} cm. Donne la valeur exacte de sa diagonale (en cm) sous la forme a√b.`, k, 2, {
          explanation: `Pythagore : d² = ${k}² + ${k}² = ${2 * k * k}, donc d = √{${2 * k * k}} = √{${k * k} × 2} = ${rt(k, 2)}.`,
        }),
        () => retry(() => {
          const p = randInt(1, 8), q = randInt(p + 1, 9), [kk, mm] = rootParts(p * p + q * q)
          if (kk === 1 || mm === 1) return null
          return radical(`Un rectangle mesure ${q} cm sur ${p} cm. Donne la valeur exacte de sa diagonale (en cm) sous la forme a√b.`, kk, mm, {
            explanation: `Pythagore : d² = ${q}² + ${p}² = ${p * p + q * q} = ${kk * kk} × ${mm}, donc d = ${rt(kk, mm)}.`,
          })
        }),
      )
    },
    // Produits et quotients de racines donnant un entier
    () => {
      const m = pick(SQUAREFREE), a = randInt(1, 4), b = randInt(2, 5)
      return oneOf(
        () => numeric(`Calcule √{${m * a * a}} × √{${m * b * b}}.`, m * a * b, { explanation: `√a × √b = √(ab) = √{${m * m * a * a * b * b}} = ${m * a * b}.` }),
        () => numeric(`Calcule ${F(`√{${m * a * a * b * b}}`, `√{${m}}`)}.`, a * b, {
          explanation: `${F('√a', '√b')} = √{${F('a', 'b')}} : √{${m * a * a * b * b} ÷ ${m}} = √{${a * a * b * b}} = ${a * b}.`,
        }),
        () => numeric(`Calcule (${b}√{${m}})².`, b * b * m, { explanation: `(${b}√{${m}})² = ${b}² × (√{${m}})² = ${b * b} × ${m} = ${b * b * m}.` }),
        () => numeric(`Calcule ${a + 1}√{${m}} × ${b}√{${m}}.`, (a + 1) * b * m, {
          explanation: `On multiplie les nombres entre eux et les racines entre elles : ${a + 1} × ${b} × √{${m}} × √{${m}} = ${(a + 1) * b} × ${m} = ${(a + 1) * b * m}.`,
        }),
      )
    },
    // Intersection d'intervalles
    () => {
      const a = randInt(-6, 2), c = randInt(a + 1, a + 4), b = randInt(c + 1, c + 5), e = randInt(b + 1, 12)
      const br = () => pick([true, false])
      const show = (lo: number, hi: number, lc: boolean, hc: boolean): Interval => ({ lo, hi, loClosed: Number.isFinite(lo) && lc, hiClosed: Number.isFinite(hi) && hc })
      return oneOf(
        () => {
          const I = show(a, b, br(), br()), J = show(c, e, br(), br())
          return interval(`Écris l'intervalle ${intervalText(I)} ∩ ${intervalText(J)}.`, interI(I, J), { explanation: interExpl(I, J) })
        },
        () => {
          const I = show(a, b, br(), br()), J = show(c, Infinity, br(), false)
          return interval(`Écris l'intervalle ${intervalText(I)} ∩ ${intervalText(J)}.`, interI(I, J), { explanation: interExpl(I, J) })
        },
        () => {
          const I = show(-Infinity, b, false, br()), J = show(a, Infinity, br(), false)
          return interval(`Écris l'intervalle ${intervalText(I)} ∩ ${intervalText(J)}.`, interI(I, J), { explanation: interExpl(I, J) })
        },
        () => {
          const I = show(a, b, br(), br()), J = show(c, e, br(), br())
          return interval(`Donne, sous forme d'intervalle, l'ensemble des réels qui appartiennent à la fois à ${intervalText(I)} et à ${intervalText(J)}.`, interI(I, J), { explanation: interExpl(I, J) })
        },
      )
    },
    // Réunion d'intervalles
    () => {
      const a = randInt(-8, 0), c = randInt(a + 1, a + 4), b = randInt(c + 1, c + 5), d = randInt(b + 1, b + 6)
      const br = () => pick([true, false])
      return oneOf(
        () => {
          const I: Interval = { lo: a, hi: b, loClosed: br(), hiClosed: br() }, J: Interval = { lo: c, hi: d, loClosed: br(), hiClosed: br() }
          return interval(`Écris ${intervalText(I)} ∪ ${intervalText(J)} sous la forme d'un seul intervalle.`, unionI(I, J), { explanation: unionExpl(I, J) })
        },
        () => {
          const I: Interval = { lo: -Infinity, hi: b, loClosed: false, hiClosed: br() }, J: Interval = { lo: c, hi: d, loClosed: br(), hiClosed: br() }
          return interval(`Écris ${intervalText(I)} ∪ ${intervalText(J)} sous la forme d'un seul intervalle.`, unionI(I, J), { explanation: unionExpl(I, J) })
        },
        () => {
          const I: Interval = { lo: a, hi: b, loClosed: br(), hiClosed: br() }, J: Interval = { lo: c, hi: Infinity, loClosed: br(), hiClosed: false }
          return interval(`Donne, sous forme d'un seul intervalle, l'ensemble des réels qui appartiennent à ${intervalText(I)} ou à ${intervalText(J)}.`, unionI(I, J), { explanation: unionExpl(I, J) })
        },
        () => {
          const I: Interval = { lo: a, hi: d, loClosed: br(), hiClosed: br() }, J: Interval = { lo: c, hi: b, loClosed: br(), hiClosed: br() }
          return interval(`Écris ${intervalText(J)} ∪ ${intervalText(I)} sous la forme d'un seul intervalle.`, unionI(I, J), {
            explanation: `${intervalText(J)} est contenu dans ${intervalText(I)} : la réunion est ${intervalText(I)}.`,
          })
        },
      )
    },
    // Produits et quotients en notation scientifique
    () => {
      const a = randInt(2, 9), b = randInt(2, 9), p = randNonZero(-6, 8), q = randNonZero(-8, 6)
      const prod = a * b, over = prod >= 10, mant = over ? prod / 10 : prod, e = p + q + (over ? 1 : 0)
      const expl = { explanation: `${a} × ${b} = ${prod}${over ? ` = ${fmt(mant)} × 10` : ''} et ${pw(10, p)} × ${pw(10, q)} = ${pw(10, p + q)}, donc le produit vaut ${fmt(mant)} × ${pw(10, e)}.` }
      return oneOf(
        () => numeric(`On écrit (${a} × ${pw(10, p)}) × (${b} × ${pw(10, q)}) en notation scientifique a × 10^n. Que vaut n ?`, e, expl),
        () => numeric(`On écrit (${a} × ${pw(10, p)}) × (${b} × ${pw(10, q)}) en notation scientifique a × 10^n. Que vaut a ?`, mant, expl),
        () => {
          const c = randInt(1, 4), B = randInt(2, 4), A = B * c
          return numeric(`On écrit ${F(`${A} × ${pw(10, p)}`, `${B} × ${pw(10, q)}`)} en notation scientifique a × 10^n. Que vaut n ?`, p - q, {
            explanation: `${A} ÷ ${B} = ${c} et ${pw(10, p)} ÷ ${pw(10, q)} = ${pw(10, p - q)} : le quotient vaut ${c} × ${pw(10, p - q)}.`,
          })
        },
        () => {
          const P = randInt(7, 10), Q = randInt(2, 4)
          const ePc = P + Q + (over ? 1 : 0)
          return numeric(`Un ordinateur effectue ${a} × 10^${P} opérations par seconde. On écrit le nombre d'opérations effectuées en ${b} × 10^${Q} secondes sous la forme a × 10^n (notation scientifique). Que vaut n ?`, ePc, {
            explanation: `(${a} × 10^${P}) × (${b} × 10^${Q}) = ${prod} × 10^${P + Q}${over ? ` = ${fmt(mant)} × 10^${ePc}` : ''}.`,
          })
        },
      )
    },
    // Puissances d'exposants relatifs
    () => {
      const a = pick([2, 3, 5, 7, 10]), p = randNonZero(-6, 8), q = randNonZero(-8, 6), r = randNonZero(-6, 6)
      return oneOf(
        () => numeric(`Écris ${pw(a, p)} × ${pw(a, q)} ÷ ${pw(a, r)} sous la forme ${a}^n. Que vaut n ?`, p + q - r, { explanation: `n = ${fmt(p)} + ${par(q)} − ${par(r)} = ${fmt(p + q - r)}.` }),
        () => numeric(`Écris ${F(`${pw(a, p)} × ${pw(a, q)}`, pw(a, r))} sous la forme d'une seule puissance de ${a}. Quel est son exposant ?`, p + q - r, {
          explanation: `Numérateur : ${pw(a, p + q)} ; puis ${fmt(p + q)} − ${par(r)} = ${fmt(p + q - r)}.`,
        }),
        () => numeric(`Pour tout réel x non nul, ${pw('x', p)} × ${pw('x', q)} × ${pw('x', r)} = x^n. Que vaut n ?`, p + q + r, {
          explanation: `On additionne les exposants : ${fmt(p)} + ${par(q)} + ${par(r)} = ${fmt(p + q + r)}.`,
        }),
        () => {
          const k = randInt(2, 3)
          return numeric(`Écris (${pw(a, p)})^${k} × ${pw(a, q)} sous la forme ${a}^n. Que vaut n ?`, k * p + q, {
            explanation: `(${pw(a, p)})^${k} = ${pw(a, k * p)}, puis ${fmt(k * p)} + ${par(q)} = ${fmt(k * p + q)}.`,
          })
        },
      )
    },
  ],
  [
    // Valeur absolue et intervalle
    () => {
      const c = randInt(-6, 6), r = randInt(1, 6), strict = pick([true, false])
      const I: Interval = { lo: c - r, hi: c + r, loClosed: !strict, hiClosed: !strict }
      const expl = { explanation: `|x − ${par(c)}| est la distance entre x et ${fmt(c)} : x est à moins de ${r} de ${fmt(c)}, donc entre ${fmt(c - r)} et ${fmt(c + r)}${strict ? ' (bornes exclues)' : ' (bornes incluses)'}.` }
      return oneOf(
        () => interval(`Écris sous forme d'intervalle l'ensemble des réels x tels que |${xPlus(-c)}| ${strict ? '<' : '≤'} ${r}.`, I, expl),
        () => interval(`Écris sous forme d'intervalle l'ensemble des réels x dont la distance à ${fmt(c)} est ${strict ? 'strictement inférieure' : 'inférieure ou égale'} à ${r}.`, I, expl),
        () => interval(`Écris sous forme d'intervalle l'ensemble des réels x tels que |${fmt(c)} − x| ${strict ? '<' : '≤'} ${r}.`, I, {
          explanation: `|${fmt(c)} − x| = |x − ${par(c)}| : c'est la distance entre x et ${fmt(c)}. x est donc entre ${fmt(c - r)} et ${fmt(c + r)}${strict ? ' (bornes exclues)' : ' (bornes incluses)'}.`,
        }),
        () => {
          const T = randInt(17, 22), d = randInt(1, 3)
          return interval(`Un thermostat maintient la température d'une pièce à ${T} °C, à ${d} °C près. Donne l'intervalle des températures x (en °C) possibles.`, { lo: T - d, hi: T + d, loClosed: true, hiClosed: true }, {
            explanation: `|x − ${T}| ≤ ${d}, soit ${T - d} ≤ x ≤ ${T + d}.`,
          })
        },
      )
    },
    // Sommes de racines
    () => retry(() => {
      const m = pick([2, 3, 5]), a = randInt(2, 5), b = pick([1, 2, 3, 4, 5, 6].filter((v) => v !== a))
      const s = (n: number) => `√{${n * n * m}}`
      return oneOf(
        () => radical(`Écris ${s(a)} + ${s(b)} sous la forme a√b.`, a + b, m, { explanation: `${s(a)} = ${rt(a, m)} et ${s(b)} = ${rt(b, m)}, donc la somme vaut ${rt(a + b, m)}.` }),
        () => {
          const [hi, lo] = a > b ? [a, b] : [b, a]
          return radical(`Écris ${s(hi)} − ${s(lo)} sous la forme a√b.`, hi - lo, m, { explanation: `${s(hi)} = ${rt(hi, m)} et ${s(lo)} = ${rt(lo, m)}, donc la différence vaut ${rt(hi - lo, m)}.` })
        },
        () => radical(`Écris ${rt(a, m)} + ${s(b)} sous la forme a√b.`, a + b, m, { explanation: `${s(b)} = ${rt(b, m)}, donc ${rt(a, m)} + ${rt(b, m)} = ${rt(a + b, m)}.` }),
        () => {
          const c = randInt(2, 3)
          return radical(`Écris ${c}${s(b)} + ${s(a)} sous la forme a√b.`, c * b + a, m, {
            explanation: `${s(b)} = ${rt(b, m)}, donc ${c}${s(b)} = ${rt(c * b, m)} ; ${s(a)} = ${rt(a, m)}. Total : ${rt(c * b + a, m)}.`,
          })
        },
      )
    }),
    // Calculs avec des puissances d'exposants négatifs
    () => retry(() => {
      const p = randInt(2, 5), q = randInt(1, 4), r = randInt(p - q - 6, p - q + 3)
      if (r === 0) return null
      const e = p - q - r
      return oneOf(
        () => fraction(`Calcule ${F(`2^${p} × ${pw(2, -q)}`, pw(2, r))}. (résultat sous forme de fraction ou d'entier)`, e >= 0 ? 2 ** e : 1, e >= 0 ? 1 : 2 ** -e, {
          explanation: `L'exposant vaut ${p} + ${par(-q)} − ${par(r)} = ${fmt(e)}, donc ${pw(2, e)} = ${e >= 0 ? 2 ** e : F(1, 2 ** -e)}.`,
        }),
        () => retry(() => {
          const s = randInt(1, 3), t = randInt(1, 3)
          if (s === t) return null
          const den = 2 ** Math.max(s, t), num = 2 ** (Math.max(s, t) - s) + 2 ** (Math.max(s, t) - t)
          return fraction(`Calcule ${pw(2, -s)} + ${pw(2, -t)}. (résultat sous forme de fraction)`, num, den, {
            explanation: `${pw(2, -s)} = ${F(1, 2 ** s)} et ${pw(2, -t)} = ${F(1, 2 ** t)} ; au même dénominateur ${den} : ${F(num, den)}.`,
          })
        }),
        () => {
          const k = randInt(2, 3), j = randInt(1, 2)
          const E = p - j * k
          return fraction(`Calcule (${pw(3, -j)})^${k} × 3^${p}. (résultat sous forme de fraction ou d'entier)`, E >= 0 ? 3 ** E : 1, E >= 0 ? 1 : 3 ** -E, {
            explanation: `(${pw(3, -j)})^${k} = ${pw(3, -j * k)}, puis l'exposant vaut ${fmt(-j * k)} + ${p} = ${fmt(p - j * k)} : ${pw(3, p - j * k)} = ${p - j * k >= 0 ? 3 ** (p - j * k) : F(1, 3 ** (j * k - p))}.`,
          })
        },
        () => {
          const u = randInt(1, 4), v = randInt(1, 3)
          return numeric(`Calcule ${pw(10, -u)} × ${pw(10, v + u + 1)} ÷ ${pw(10, 2)}.`, 10 ** (v - 1), {
            explanation: `L'exposant vaut ${fmt(-u)} + ${v + u + 1} − 2 = ${v - 1}, donc le résultat est ${pw(10, v - 1)} = ${big(10 ** (v - 1))}.`,
            answer: big(10 ** (v - 1)),
          })
        },
      )
    }),
    // Ordres de grandeur : masses en notation scientifique
    () => {
      const ctx = pick([
        { obj: 'Un grain de sable', plur: 'grains de sable', p: 3 },
        { obj: 'Un grain de riz', plur: 'grains de riz', p: 2 },
        { obj: 'Un flocon de neige', plur: 'flocons', p: 3 },
        { obj: 'Une graine de pavot', plur: 'graines de pavot', p: 4 },
        { obj: 'Une fourmi', plur: 'fourmis', p: 3 },
      ])
      const a = randInt(2, 9), b = randInt(2, 9), q = randInt(ctx.p, ctx.p + 3), total = a * b * 10 ** (q - ctx.p)
      return oneOf(
        () => numeric(`${ctx.obj} pèse environ ${a} × ${pw(10, -ctx.p)} g. Combien pèsent ${b} × ${pw(10, q)} ${ctx.plur} (en g) ?`, total, {
          answer: big(total),
          explanation: `${a} × ${b} = ${a * b} et ${pw(10, -ctx.p)} × ${pw(10, q)} = ${pw(10, q - ctx.p)}, donc ${a * b} × ${pw(10, q - ctx.p)} = ${big(total)} g.`,
        }),
        () => {
          const n = a * b * 10 ** (q - ctx.p)
          return numeric(`${ctx.obj} pèse environ ${a} × ${pw(10, -ctx.p)} g. Combien y a-t-il de ${ctx.plur} dans un tas de ${big(n)} g ?`, b * 10 ** q, {
            answer: big(b * 10 ** q),
            explanation: `${big(n)} ÷ (${a} × ${pw(10, -ctx.p)}) = ${F(big(n), a)} × 10^${ctx.p} = ${big(n / a)} × 10^${ctx.p} = ${big(b * 10 ** q)}.`,
          })
        },
        () => numeric(`${b} × ${pw(10, q)} ${ctx.plur} pèsent ensemble ${big(total)} g. On écrit la masse d’${ctx.obj.toLowerCase()} sous la forme a × 10^n g (notation scientifique). Que vaut n ?`, -ctx.p, {
          explanation: `${big(total)} ÷ (${b} × ${pw(10, q)}) = ${a} × ${pw(10, -ctx.p)} g, donc n = ${fmt(-ctx.p)}.`,
        }),
      )
    },
    // Longueurs exactes
    () => {
      const k = randInt(2, 6), m = pick([2, 3, 5, 6, 7])
      return oneOf(
        () => {
          const what = pick(['potager', 'bassin', 'dallage', 'tapis', 'terrain de jeu', 'champ de blé'])
          return radical(`Un ${what} carré a une aire de ${k * k * m} m². Donne la valeur exacte de son côté (en m) sous la forme a√b.`, k, m, {
            explanation: `Le côté c vérifie c² = ${k * k * m}, donc c = √{${k * k * m}} = √{${k * k} × ${m}} = ${rt(k, m)}.`,
          })
        },
        () => {
          const what = pick(['jardin', 'enclos', 'drapeau', 'parchemin'])
          return radical(`Un ${what} rectangulaire est deux fois plus long que large et a une aire de ${2 * k * k * m} m². Donne la valeur exacte de sa largeur ℓ (en m) sous la forme a√b.`, k, m, {
            explanation: `ℓ × 2ℓ = ${2 * k * k * m}, donc ℓ² = ${k * k * m} et ℓ = √{${k * k * m}} = ${rt(k, m)}.`,
          })
        },
        () => retry(() => {
          const p = randInt(2, 9), q = randInt(2, 9), [kk, mm] = rootParts(p * p + q * q)
          if (p >= q || kk === 1 || mm === 1) return null
          return radical(`Une échelle est posée contre un mur : son pied est à ${p} m du mur et son sommet à ${q} m du sol. Donne la valeur exacte de sa longueur (en m) sous la forme a√b.`, kk, mm, {
            explanation: `Pythagore : L² = ${p}² + ${q}² = ${p * p + q * q} = ${kk * kk} × ${mm}, donc L = ${rt(kk, mm)}.`,
          })
        }),
      )
    },
    // Croissance exponentielle
    () => {
      const ctx = pick([
        { t: 'Une colonie de bactéries double toutes les heures. Au départ, il y a une seule bactérie.', base: 2, u: 'heures', w: 'bactéries' },
        { t: 'Chaque jour, le nombre de personnes qui connaissent une rumeur triple. Au départ, une seule personne la connaît.', base: 3, u: 'jours', w: 'personnes' },
        { t: 'Dans un jeu vidéo, le nombre de gemmes d’un coffre magique double à chaque niveau. Au niveau 0, il contient une gemme.', base: 2, u: 'niveaux', w: 'gemmes' },
        { t: 'Un nénuphar magique triple de surface chaque semaine. Au départ, il couvre 1 cm².', base: 3, u: 'semaines', w: 'cm²' },
        { t: 'Chaque jour, on envoie 4 fois plus de lettres d’une chaîne que la veille. Le jour 0, une seule lettre est envoyée.', base: 4, u: 'jours', w: 'lettres envoyées dans la journée' },
      ])
      const N = randInt(1, 600) * 100
      let n = 0
      while (ctx.base ** n <= N) n++
      return numeric(`${ctx.t} Au bout de combien ${/^[aeiouhé]/.test(ctx.u) ? 'd’' : 'de '}${ctx.u} (au minimum) dépassera-t-on ${big(N)} ${ctx.w} ?`, n, {
        explanation: `Au bout de n ${ctx.u}, on a ${ctx.base}^n ${ctx.w} : ${ctx.base}^${n - 1} = ${big(ctx.base ** (n - 1))} ≤ ${big(N)} < ${ctx.base}^${n} = ${big(ctx.base ** n)}.`,
      })
    },
  ],
  [
    // Rendre un dénominateur rationnel
    () => {
      const k = randInt(2, 6), m = pick([2, 3, 5]), c = k * m
      return oneOf(
        () => radical(`Écris ${F(c, `√${m}`)} sous la forme a√b.`, k, m, { explanation: `On multiplie en haut et en bas par √${m} : ${F(`${c}√${m}`, m)} = ${rt(k, m)}.` }),
        () => retry(() => {
          const p = randInt(2, 3), C = c * p
          if (C > 60) return null
          return radical(`Écris ${F(C, `${p}√${m}`)} sous la forme a√b.`, k, m, {
            explanation: `${F(C, `${p}√${m}`)} = ${F(c, `√${m}`)} ; on multiplie en haut et en bas par √${m} : ${F(`${c}√${m}`, m)} = ${rt(k, m)}.`,
          })
        }),
        () => {
          const s = k + randInt(1, 4)
          return radical(`Écris ${rt(s, m)} − ${F(c, `√${m}`)} sous la forme a√b.`, s - k, m, {
            explanation: `${F(c, `√${m}`)} = ${F(`${c}√${m}`, m)} = ${rt(k, m)}, donc ${rt(s, m)} − ${rt(k, m)} = ${rt(s - k, m)}.`,
          })
        },
        () => {
          const d = pick([2, 3, 5, 7].filter((v) => v !== m))
          return radical(`Écris ${F(`√{${k * k * m * d}}`, `√{${d}}`)} sous la forme a√b.`, k, m, {
            explanation: `${F('√a', '√b')} = √{${F('a', 'b')}} : √{${k * k * m * d} ÷ ${d}} = √{${k * k * m}} = ${rt(k, m)}.`,
          })
        },
      )
    },
    // Sommes de trois racines
    () => retry(() => {
      const m = pick([2, 3, 5, 7]), a = randInt(1, 6), b = randInt(1, 6), c = randInt(1, 6)
      const k = a + b - c
      if (k < 1 || new Set([a, b, c]).size < 3) return null
      const s = (n: number) => `√{${n * n * m}}`
      return oneOf(
        () => radical(`Écris ${s(a)} + ${s(b)} − ${s(c)} sous la forme a√b.`, k, m, { explanation: `${rt(a, m)} + ${rt(b, m)} − ${rt(c, m)} = ${rt(k, m)}.` }),
        () => radical(`Écris ${rt(a, m)} − ${s(c)} + ${s(b)} sous la forme a√b.`, k, m, { explanation: `${s(c)} = ${rt(c, m)} et ${s(b)} = ${rt(b, m)}, donc ${rt(a, m)} − ${rt(c, m)} + ${rt(b, m)} = ${rt(k, m)}.` }),
        () => retry(() => {
          const p = randInt(2, 3), K = p * a + b - c
          if (K < 1) return null
          return radical(`Écris ${p}${s(a)} + ${s(b)} − ${s(c)} sous la forme a√b.`, K, m, {
            explanation: `${p}${s(a)} = ${p} × ${rt(a, m)} = ${rt(p * a, m)} ; puis ${rt(p * a, m)} + ${rt(b, m)} − ${rt(c, m)} = ${rt(K, m)}.`,
          })
        }),
        () => radical(`Le périmètre d'un triangle de côtés ${s(a)}, ${s(b)} et ${s(c)} cm s'écrit a√b cm. Donne-le sous cette forme.`, a + b + c, m, {
          explanation: `${rt(a, m)} + ${rt(b, m)} + ${rt(c, m)} = ${rt(a + b + c, m)}.`,
        }),
      )
    }),
    // Puissances de 2 et de 3 cachées
    () => {
      const B = pick([2, 3]), a = randNonZero(-4, 6), b = pick([-3, -2, 2, 3, 4]), c = randNonZero(-3, 3)
      const n = a + 2 * b - 3 * c
      const expl = { explanation: `${B * B} = ${B}² et ${B ** 3} = ${B}³, donc ${pw(B * B, b)} = ${pw(B, 2 * b)} et ${pw(B ** 3, c)} = ${pw(B, 3 * c)} : n = ${fmt(a)} + ${par(2 * b)} − ${par(3 * c)} = ${fmt(n)}.` }
      return oneOf(
        () => numeric(`Écris ${pw(B, a)} × ${pw(B * B, b)} ÷ ${pw(B ** 3, c)} sous la forme ${B}^n. Que vaut n ?`, n, expl),
        () => numeric(`Écris ${F(`${pw(B, a)} × ${pw(B * B, b)}`, pw(B ** 3, c))} sous la forme d'une seule puissance de ${B}. Quel est son exposant ?`, n, expl),
        () => numeric(`Trouve l'entier n tel que ${pw(B * B, b)} × ${pw(B ** 3, c)} = ${B}^n.`, 2 * b + 3 * c, {
          explanation: `${pw(B * B, b)} = ${pw(B, 2 * b)} et ${pw(B ** 3, c)} = ${pw(B, 3 * c)}, donc n = ${fmt(2 * b)} + ${par(3 * c)} = ${fmt(2 * b + 3 * c)}.`,
        }),
        () => numeric(`Écris (${pw(B * B, b)})^3 ÷ ${pw(B, a)} sous la forme ${B}^n. Que vaut n ?`, 6 * b - a, {
          explanation: `${pw(B * B, b)} = ${pw(B, 2 * b)}, puis (${pw(B, 2 * b)})^3 = ${pw(B, 6 * b)} ; n = ${fmt(6 * b)} − ${par(a)} = ${fmt(6 * b - a)}.`,
        }),
      )
    },
    // Produits remarquables avec des racines
    () => {
      const m = pick([2, 3, 5, 6, 7]), p = randInt(1, 4), q = randInt(1, 9)
      const r = p === 1 ? `√{${m}}` : `${p}√{${m}}`, v = p * p * m - q * q
      return oneOf(
        () => numeric(`Calcule (${r} + ${q})(${r} − ${q}).`, v, { explanation: `(a + b)(a − b) = a² − b² : (${r})² − ${q}² = ${p * p * m} − ${q * q} = ${fmt(v)}.` }),
        () => numeric(`Calcule (${q} − ${r})(${q} + ${r}).`, -v, { explanation: `(a − b)(a + b) = a² − b² : ${q}² − (${r})² = ${q * q} − ${p * p * m} = ${fmt(-v)}.` }),
        () => retry(() => {
          const n = pick([2, 3, 5, 6, 7, 10, 11])
          if (n === m) return null
          return numeric(`Calcule (√{${n}} + √{${m}})(√{${n}} − √{${m}}).`, n - m, { explanation: `(a + b)(a − b) = a² − b² : (√{${n}})² − (√{${m}})² = ${n} − ${m} = ${fmt(n - m)}.` })
        }),
        () => numeric(`Calcule (${r} + ${q})² − ${2 * p * q}√{${m}}.`, p * p * m + q * q, {
          explanation: `(${r} + ${q})² = ${p * p * m} + ${2 * p * q}√{${m}} + ${q * q} ; on retire ${2 * p * q}√{${m}}, il reste ${p * p * m} + ${q * q} = ${p * p * m + q * q}.`,
        }),
      )
    },
    // Tolérances
    () => {
      const ctx = pick([
        { t: 'Une lame d’épée doit mesurer', v: [80, 100], u: 'cm', tol: [0.5, 1, 1.5, 2] },
        { t: 'Une miche de pain doit peser', v: [240, 260], u: 'g', tol: [2.5, 5, 10] },
        { t: 'Un tonneau doit contenir', v: [50, 70], u: 'L', tol: [0.5, 1, 1.5] },
        { t: 'Une pièce de moteur doit mesurer', v: [20, 40], u: 'mm', tol: [0.05, 0.1, 0.2] },
        { t: 'Une boule de pétanque doit peser', v: [680, 720], u: 'g', tol: [10, 20, 15] },
      ])
      const v = randInt(ctx.v[0], ctx.v[1]), tol = pick(ctx.tol), lo = r2(v - tol), hi = r2(v + tol)
      return oneOf(
        () => interval(`${ctx.t} ${v} ${ctx.u}, à ${fmt(tol)} ${ctx.u} près. Donne, sous forme d'intervalle, l'ensemble des valeurs x (en ${ctx.u}) acceptées.`, { lo, hi, loClosed: true, hiClosed: true }, {
          explanation: `On accepte |x − ${v}| ≤ ${fmt(tol)}, soit ${fmt(lo)} ≤ x ≤ ${fmt(hi)}.`,
        }),
        () => {
          const V = randInt(ctx.v[0] / 10, ctx.v[1] / 10) * 10, pct = pick([1, 2, 5, 10]), t = r2((V * pct) / 100)
          return interval(`${ctx.t} ${V} ${ctx.u}, à ${pct} % près. Donne, sous forme d'intervalle, l'ensemble des valeurs x (en ${ctx.u}) acceptées.`, { lo: r2(V - t), hi: r2(V + t), loClosed: true, hiClosed: true }, {
            explanation: `${pct} % de ${V} = ${fmt(t)} : on accepte |x − ${V}| ≤ ${fmt(t)}, soit ${fmt(r2(V - t))} ≤ x ≤ ${fmt(r2(V + t))}.`,
          })
        },
        () => numeric(`${ctx.t} entre ${fmt(lo)} et ${fmt(hi)} ${ctx.u} (bornes comprises). Cette condition s'écrit |x − c| ≤ r. Que vaut c ?`, v, {
          explanation: `c est le centre de l'intervalle : (${fmt(lo)} + ${fmt(hi)}) ÷ 2 = ${v}, et r = ${fmt(tol)} est la demi-longueur.`,
        }),
        () => numeric(`${ctx.t} entre ${fmt(lo)} et ${fmt(hi)} ${ctx.u} (bornes comprises). Cette condition s'écrit |x − c| ≤ r. Que vaut r ?`, tol, {
          explanation: `r est la demi-longueur de l'intervalle : (${fmt(hi)} − ${fmt(lo)}) ÷ 2 = ${fmt(tol)}, et c = ${v} est le centre.`,
        }),
      )
    },
    // Divisions de grands nombres
    () => retry(() => {
      const ctx = pick([
        (A: string, B: string) => `Une clé USB peut stocker ${A} octets. Combien de photos de ${B} octets chacune peut-on y enregistrer ?`,
        (A: string, B: string) => `Un lac contient environ ${A} litres d'eau. Une pompe en évacue ${B} litres par heure. Combien d'heures faut-il pour le vider ?`,
        (A: string, B: string) => `Une comète est à ${A} km de la Terre. Une sonde parcourt ${B} km par jour. Combien de jours lui faut-il pour l'atteindre ?`,
        (A: string, B: string) => `Un serveur de jeu vidéo a distribué ${A} gemmes, à raison de ${B} gemmes par joueur. Combien y a-t-il de joueurs ?`,
      ])
      const b = randInt(2, 8), a = randInt(1, 9), p = randInt(6, 12), d = randInt(2, 4), q = p - d
      if ((a * 10 ** d) % b) return null
      const n = (a * 10 ** d) / b
      return numeric(ctx(`${a} × ${pw(10, p)}`, `${b} × ${pw(10, q)}`), n, {
        answer: big(n),
        explanation: `${F(`${a} × 10^${p}`, `${b} × 10^${q}`)} = ${fmt(a / b)} × 10^${d} = ${big(n)}.`,
      })
    }),
  ],
]

// ── Calcul littéral ─────────────────────────────────────────────────────
const lit: Tiers = [
  [
    // Simple distributivité
    () => {
      const k = pick([-6, -5, -4, -3, -2, -1, 2, 3, 4, 5, 6]), a = randInt(1, 5), b = randNonZero(-9, 9)
      const dev = poly([k * a, 'x'], [k * b, ''])
      const expl = { explanation: `On distribue ${fmt(k)} sur chaque terme : ${fmt(k)} × ${term(a, 'x', true)} = ${term(k * a, 'x', true)} et ${fmt(k)} × ${par(b)} = ${fmt(k * b)}.` }
      return oneOf(
        () => expression(`Développe et réduis : ${coefP(k)}(${xPlus(b, a)})`, dev, 'developed', expl),
        () => expression(`Développe et réduis : (${xPlus(b, a)}) × ${par(k)}`, dev, 'developed', expl),
        () => expression(`Développe et réduis : ${coefP(k)}(${poly([b, ''], [a, 'x'])})`, dev, 'developed', expl),
        () => {
          const c = randNonZero(-9, 9)
          if (k * b + c === 0) return null
          return expression(`Développe et réduis : ${coefP(k)}(${xPlus(b, a)})${tail(c)}`, poly([k * a, 'x'], [k * b + c, '']), 'developed', {
            explanation: `${coefP(k)}(${xPlus(b, a)}) = ${dev}, puis on regroupe les constantes : ${fmt(k * b)} + ${par(c)} = ${fmt(k * b + c)}.`,
          })
        },
        () => {
          const kx = term(k, 'x', true)
          return expression(`Développe et réduis : ${coefP(k)}x(${xPlus(b, a)})`, poly([k * a, 'x²'], [k * b, 'x']), 'developed', {
            explanation: `On multiplie ${kx} par chaque terme : ${kx} × ${term(a, 'x', true)} = ${term(k * a, 'x²', true)} et ${kx} × ${par(b)} = ${term(k * b, 'x', true)}.`,
          })
        },
        () => {
          const K = randInt(2, 9), B = randInt(1, 9)
          return expression(`Un rectangle a pour largeur ${K} cm et pour longueur (${xPlus(B, a)}) cm. Exprime son aire (en cm²) en fonction de x, sous forme développée.`, poly([K * a, 'x'], [K * B, '']), 'developed', {
            explanation: `Aire = largeur × longueur = ${K}(${xPlus(B, a)}) = ${poly([K * a, 'x'], [K * B, ''])}.`,
          })
        },
      )
    },
    // Réduire une expression
    () => retry(() => {
      const a = randNonZero(-9, 9), b = randNonZero(-9, 9), c = randNonZero(-9, 9), d = randNonZero(-9, 9)
      return oneOf(
        () => {
          if (a + c === 0) return null
          return expression(`Réduis : ${poly([a, 'x'], [b, ''], [c, 'x'], [d, ''])}`, poly([a + c, 'x'], [b + d, '']), 'developed', {
            explanation: `Termes en x : ${fmt(a)} + ${par(c)} = ${fmt(a + c)} ; constantes : ${fmt(b)} + ${par(d)} = ${fmt(b + d)}.`,
          })
        },
        () => {
          if (a + c === 0 || b + d === 0) return null
          return expression(`Réduis : ${poly([a, 'x²'], [b, 'x'], [c, 'x²'], [d, 'x'])}`, poly([a + c, 'x²'], [b + d, 'x']), 'developed', {
            explanation: `Termes en x² : ${fmt(a)} + ${par(c)} = ${fmt(a + c)} ; termes en x : ${fmt(b)} + ${par(d)} = ${fmt(b + d)}. On ne mélange jamais les x² et les x !`,
          })
        },
        () => {
          const e = randNonZero(-5, 5), f = randNonZero(-9, 9)
          if (a + d === 0 || b + e === 0) return null
          return expression(`Réduis : ${poly([a, 'x²'], [b, 'x'], [c, ''], [d, 'x²'], [e, 'x'], [f, ''])}`, poly([a + d, 'x²'], [b + e, 'x'], [c + f, '']), 'developed', {
            explanation: `On regroupe les termes de même nature : x² : ${fmt(a)} + ${par(d)} = ${fmt(a + d)} ; x : ${fmt(b)} + ${par(e)} = ${fmt(b + e)} ; constantes : ${fmt(c)} + ${par(f)} = ${fmt(c + f)}.`,
          })
        },
        () => {
          const p = randInt(2, 6), q = pick([-5, -4, -3, -2, 2, 3, 4, 5]), r = randNonZero(-9, 9)
          if (p * q + r === 0) return null
          return expression(`Réduis : ${p}x × ${mono(q)} ${r < 0 ? '−' : '+'} ${term(Math.abs(r), 'x²', true)}`, poly([p * q + r, 'x²']), 'developed', {
            explanation: `${p}x × ${mono(q)} = ${term(p * q, 'x²', true)} (x × x = x²), puis ${fmt(p * q)} + ${par(r)} = ${fmt(p * q + r)}.`,
          })
        },
        () => {
          const A = [randInt(1, 4), randInt(1, 4), randInt(1, 4)], B = [randInt(1, 9), randNonZero(-3, 9), randNonZero(-3, 9)]
          return expression(`Les côtés d'un triangle mesurent (${xPlus(B[0], A[0])}) cm, (${xPlus(B[1], A[1])}) cm et (${xPlus(B[2], A[2])}) cm, avec x assez grand. Exprime son périmètre en fonction de x, sous forme réduite.`, poly([sum(A), 'x'], [sum(B), '']), 'developed', {
            explanation: `Périmètre = somme des côtés : x : ${A.join(' + ')} = ${sum(A)} ; constantes : ${sumText(B)} = ${fmt(sum(B))}.`,
          })
        },
      )
    }),
    // Factoriser par un facteur numérique
    () => {
      const k = randInt(2, 9), a = randInt(1, 6), b = pick([-9, -8, -7, -6, -5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6, 7, 8, 9].filter((v) => gcd(a, Math.abs(v)) === 1))
      return oneOf(
        () => expression(`Factorise : ${poly([k * a, 'x'], [k * b, ''])}`, `${k}(${xPlus(b, a)})`, 'factored', {
          explanation: `${k} est un facteur commun : ${poly([k * a, 'x'])} = ${k} × ${term(a, 'x', true)} et ${fmt(k * b)} = ${k} × ${par(b)}.`,
        }),
        () => expression(`Factorise : ${poly([k * b, ''], [k * a, 'x'])}`, `${k}(${poly([b, ''], [a, 'x'])})`, 'factored', {
          explanation: `${k} est un facteur commun : ${fmt(k * b)} = ${k} × ${par(b)} et ${poly([k * a, 'x'])} = ${k} × ${term(a, 'x', true)}.`,
        }),
        () => expression(`Factorise par −${k} : ${poly([-k * a, 'x'], [-k * b, ''])}`, `−${k}(${xPlus(b, a)})`, 'factored', {
          explanation: `${poly([-k * a, 'x'])} = −${k} × ${term(a, 'x', true)} et ${fmt(-k * b)} = −${k} × ${par(b)} : on obtient −${k}(${xPlus(b, a)}). Attention aux signes dans la parenthèse !`,
        }),
        () => expression(`Complète : ${poly([k * a, 'x'], [k * b, ''])} = ${k}(…). Qu'écris-tu dans la parenthèse ?`, xPlus(b, a), 'developed', {
          inputHint: 'ex. 2x − 3',
          explanation: `On divise chaque terme par ${k} : ${poly([k * a, 'x'])} ÷ ${k} = ${term(a, 'x', true)} et ${fmt(k * b)} ÷ ${k} = ${fmt(b)}, donc (${xPlus(b, a)}).`,
        }),
      )
    },
    // Calculer la valeur d'une expression
    () => {
      const a = randNonZero(-4, 4), b = randInt(-6, 6), c = randNonZero(-9, 9), v = pick([-4, -3, -2, -1, 2, 3, 4])
      return oneOf(
        () => {
          const val = a * v * v + b * v + c
          return numeric(`Calcule A = ${poly([a, 'x²'], [b, 'x'], [c, ''])} pour x = ${fmt(v)}.`, val, {
            explanation: `On remplace x par ${par(v)} : ${par(v)}² = ${v * v}, donc A = ${sumText([a * v * v, b * v, c])} = ${fmt(val)}.`,
          })
        },
        () => {
          const p = randNonZero(-6, 6), q = randNonZero(-6, 6)
          return numeric(`Calcule B = (${xPlus(p)})(${xPlus(q)}) pour x = ${fmt(v)}.`, (v + p) * (v + q), {
            explanation: `On remplace x par ${par(v)} : B = (${fmt(v)} + ${par(p)})(${fmt(v)} + ${par(q)}) = ${par(v + p)} × ${par(v + q)} = ${fmt((v + p) * (v + q))}.`,
          })
        },
        () => {
          const p = randNonZero(-6, 6), q = randNonZero(-6, 6), w = randNonZero(-5, 5)
          return numeric(`Calcule C = ${poly([p, 'x'], [q, 'y'])} pour x = ${fmt(v)} et y = ${fmt(w)}.`, p * v + q * w, {
            explanation: `C = ${fmt(p)} × ${par(v)} + ${par(q)} × ${par(w)} = ${sumText([p * v, q * w])} = ${fmt(p * v + q * w)}.`,
          })
        },
        () => {
          const k = randInt(2, 5)
          return numeric(`Calcule D = ${poly([-k, 'x²'], [c, ''])} pour x = ${fmt(v)}.`, -k * v * v + c, {
            explanation: `Le carré passe avant le signe − : ${par(v)}² = ${v * v}, donc D = −${k} × ${v * v}${tail(c)} = ${fmt(-k * v * v + c)}.`,
          })
        },
        () => {
          const p = randInt(8, 25), q = randInt(2, 6), n = randInt(2, 9)
          return numeric(`Le prix (en €) de x places de concert, frais de dossier compris, est P = ${p}x + ${q}. Combien coûtent ${n} places ?`, p * n + q, {
            explanation: `On remplace x par ${n} : P = ${p} × ${n} + ${q} = ${p * n + q} €.`,
          })
        },
      )
    },
    // Signe − devant une parenthèse
    () => retry(() => {
      const a = randNonZero(-8, 8), b = randNonZero(-9, 9), c = randNonZero(-6, 6), d = randNonZero(-9, 9)
      if (a === c) return null
      const res = poly([a - c, 'x'], [b - d, ''])
      return oneOf(
        () => expression(`Développe et réduis : ${poly([a, 'x'], [b, ''])} − (${xPlus(d, c)})`, res, 'developed', {
          explanation: `Le signe − devant la parenthèse change le signe de chaque terme : ${poly([a, 'x'], [b, ''], [-c, 'x'], [-d, ''])} = ${res}.`,
        }),
        () => a < 0 ? null : expression(`Développe et réduis : −(${xPlus(d, c)}) + ${poly([a, 'x'], [b, ''])}`, res, 'developed', {
          explanation: `−(${xPlus(d, c)}) = ${poly([-c, 'x'], [-d, ''])}, puis on regroupe : ${res}.`,
        }),
        () => expression(`Développe et réduis : (${poly([a, 'x'], [b, ''])}) − (${poly([d, ''], [c, 'x'])})`, res, 'developed', {
          explanation: `On enlève les parenthèses en changeant les signes de la seconde : ${poly([a, 'x'], [b, ''], [-d, ''], [-c, 'x'])} = ${res}.`,
        }),
        () => {
          const e = randNonZero(-5, 5), f = randNonZero(-9, 9)
          if (a - c + e === 0) return null
          return expression(`Développe et réduis : ${poly([a, 'x'], [b, ''])} − (${xPlus(d, c)}) + (${xPlus(f, e)})`, poly([a - c + e, 'x'], [b - d + f, '']), 'developed', {
            explanation: `Le − change les signes de la première parenthèse, le + ne change rien : ${poly([a, 'x'], [b, ''], [-c, 'x'], [-d, ''], [e, 'x'], [f, ''])} = ${poly([a - c + e, 'x'], [b - d + f, ''])}.`,
          })
        },
      )
    }),
  ],
  [
    // (x + a)²
    () => {
      const a = randInt(1, 9), s = pick([1, -1]), A = s * a
      const res = poly([1, 'x²'], [2 * A, 'x'], [a * a, ''])
      const expl = { explanation: `(a ${s < 0 ? '−' : '+'} b)² = a² ${s < 0 ? '−' : '+'} 2ab + b² avec b = ${a} : 2 × x × ${a} = ${2 * a}x et ${a}² = ${a * a}, d'où ${res}.` }
      return oneOf(
        () => expression(`Développe : (${xPlus(A)})²`, res, 'developed', expl),
        () => expression(`Développe : (${poly([A, ''], [1, 'x'])})²`, res, 'developed', expl),
        () => expression(`Développe et réduis : (${xPlus(A)})(${xPlus(A)})`, res, 'developed', { explanation: `C'est (${xPlus(A)})². ${expl.explanation}` }),
        () => expression(`Un carré a pour côté (x + ${a}) cm. Exprime son aire (en cm²) sous forme développée.`, poly([1, 'x²'], [2 * a, 'x'], [a * a, '']), 'developed', {
          explanation: `Aire = (x + ${a})² = x² + 2 × x × ${a} + ${a}² = ${poly([1, 'x²'], [2 * a, 'x'], [a * a, ''])}.`,
        }),
        () => expression(`Développe : (${poly([a, ''], [-1, 'x'])})²`, poly([1, 'x²'], [-2 * a, 'x'], [a * a, '']), 'developed', {
          explanation: `(a − b)² = a² − 2ab + b² avec a = ${a} et b = x : ${a * a} − ${2 * a}x + x², soit ${poly([1, 'x²'], [-2 * a, 'x'], [a * a, ''])}.`,
        }),
      )
    },
    // (x + a)(x − a)
    () => {
      const a = randInt(1, 9), res = poly([1, 'x²'], [-a * a, '']), rev = poly([a * a, ''], [-1, 'x²'])
      return oneOf(
        () => expression(`Développe : (x + ${a})(x − ${a})`, res, 'developed', { explanation: `(a + b)(a − b) = a² − b² : x² − ${a}² = ${res}.` }),
        () => expression(`Développe : (x − ${a})(x + ${a})`, res, 'developed', { explanation: `(a − b)(a + b) = a² − b² : x² − ${a}² = ${res}.` }),
        () => expression(`Développe : (${a} + x)(${a} − x)`, rev, 'developed', { explanation: `(a + b)(a − b) = a² − b² avec a = ${a} et b = x : ${a}² − x² = ${rev}.` }),
        () => expression(`Développe : (${a} − x)(x + ${a})`, rev, 'developed', { explanation: `x + ${a} = ${a} + x : c'est (${a} − x)(${a} + x) = ${a}² − x² = ${rev}.` }),
        () => expression(`Un rectangle a pour longueur (x + ${a}) m et pour largeur (x − ${a}) m (avec x > ${a}). Exprime son aire sous forme développée.`, res, 'developed', {
          explanation: `Aire = (x + ${a})(x − ${a}) = x² − ${a}² = ${res} : c'est l'identité (a + b)(a − b) = a² − b².`,
        }),
      )
    },
    // Double distributivité simple
    () => retry(() => {
      const a = randNonZero(-7, 7), b = randNonZero(-7, 7)
      const res = poly([1, 'x²'], [a + b, 'x'], [a * b, ''])
      return oneOf(
        () => expression(`Développe et réduis : (${xPlus(a)})(${xPlus(b)})`, res, 'developed', {
          explanation: `x × x + x × ${par(b)} + ${par(a)} × x + ${par(a)} × ${par(b)} = ${res}.`,
        }),
        () => expression(`Développe et réduis : (${xPlus(a)})(${poly([b, ''], [-1, 'x'])})`, poly([-1, 'x²'], [b - a, 'x'], [a * b, '']), 'developed', {
          explanation: `x × ${par(b)} + x × (−x) + ${par(a)} × ${par(b)} + ${par(a)} × (−x) = ${poly([-1, 'x²'], [b - a, 'x'], [a * b, ''])}.`,
        }),
        () => {
          const p = Math.abs(a), q = Math.abs(b)
          return expression(`Un rectangle a pour côtés (x + ${p}) cm et (x + ${q}) cm. Exprime son aire (en cm²) sous forme développée et réduite.`, poly([1, 'x²'], [p + q, 'x'], [p * q, '']), 'developed', {
            explanation: `(x + ${p})(x + ${q}) = x² + ${term(q, 'x', true)} + ${term(p, 'x', true)} + ${p * q} = ${poly([1, 'x²'], [p + q, 'x'], [p * q, ''])}.`,
          })
        },
        () => {
          if (a + b === 0) return null
          return expression(`Développe et réduis : (${xPlus(a)})(${xPlus(b)}) − x²`, poly([a + b, 'x'], [a * b, '']), 'developed', {
            explanation: `(${xPlus(a)})(${xPlus(b)}) = ${res}, puis on retire x² : ${poly([a + b, 'x'], [a * b, ''])}.`,
          })
        },
      )
    }),
    // Développer deux produits et réduire
    () => retry(() => {
      const k = pick([-5, -4, -3, -2, -1, 2, 3, 4, 5]), m = pick([-5, -4, -3, -2, 2, 3, 4, 5]), c = randInt(1, 3), a = randNonZero(-7, 7), b = randNonZero(-7, 7)
      return oneOf(
        () => {
          if (k + m * c === 0) return null
          return expression(`Développe et réduis : ${coefP(k)}(${xPlus(a)}) ${m < 0 ? '−' : '+'} ${Math.abs(m)}(${xPlus(b, c)})`, poly([k + m * c, 'x'], [k * a + m * b, '']), 'developed', {
            explanation: `On développe chaque produit : ${poly([k, 'x'], [k * a, ''])} et ${poly([m * c, 'x'], [m * b, ''])}, puis on regroupe.`,
          })
        },
        () => {
          if (a + m === 0) return null
          return expression(`Développe et réduis : x(${xPlus(a)}) ${m < 0 ? '−' : '+'} ${Math.abs(m)}(${xPlus(b)})`, poly([1, 'x²'], [a + m, 'x'], [m * b, '']), 'developed', {
            explanation: `x(${xPlus(a)}) = ${poly([1, 'x²'], [a, 'x'])} et ${fmt(m)}(${xPlus(b)}) = ${poly([m, 'x'], [m * b, ''])} ; on regroupe : ${poly([1, 'x²'], [a + m, 'x'], [m * b, ''])}.`,
          })
        },
        () => {
          const K = Math.abs(k) + 1
          if (K * a - b === 0) return null
          return expression(`Développe et réduis : ${K}x(${xPlus(a)}) − x(${xPlus(b)})`, poly([K - 1, 'x²'], [K * a - b, 'x']), 'developed', {
            explanation: `${K}x(${xPlus(a)}) = ${poly([K, 'x²'], [K * a, 'x'])} et x(${xPlus(b)}) = ${poly([1, 'x²'], [b, 'x'])} ; le − change les signes : ${poly([K - 1, 'x²'], [K * a - b, 'x'])}.`,
          })
        },
        () => {
          const d = randNonZero(-9, 9)
          if (k + m === 0 || k * a + m * b + d === 0) return null
          return expression(`Développe et réduis : ${coefP(k)}(${xPlus(a)}) ${m < 0 ? '−' : '+'} ${Math.abs(m)}(${xPlus(b)})${tail(d)}`, poly([k + m, 'x'], [k * a + m * b + d, '']), 'developed', {
            explanation: `${coefP(k)}(${xPlus(a)}) = ${poly([k, 'x'], [k * a, ''])} et ${fmt(m)}(${xPlus(b)}) = ${poly([m, 'x'], [m * b, ''])} ; on regroupe avec ${fmt(d)} : ${poly([k + m, 'x'], [k * a + m * b + d, ''])}.`,
          })
        },
      )
    }),
    // Factoriser par x ou par une parenthèse
    () => {
      const a = randNonZero(-9, 9), k = randInt(1, 5), K = k === 1 ? '' : String(k)
      return oneOf(
        () => expression(`Factorise : ${poly([k, 'x²'], [k * a, 'x'])}`, `${K}x(${xPlus(a)})`, 'factored', {
          explanation: `${K}x est un facteur commun aux deux termes : ${poly([k, 'x²'])} = ${K}x × x et ${poly([k * a, 'x'])} = ${K}x × ${par(a)}.`,
        }),
        () => expression(`Factorise : ${poly([k * a, 'x'], [k, 'x²'])}`, `${K}x(${poly([a, ''], [1, 'x'])})`, 'factored', {
          explanation: `${K}x est un facteur commun : ${poly([k * a, 'x'])} = ${K}x × ${par(a)} et ${poly([k, 'x²'])} = ${K}x × x.`,
        }),
        () => retry(() => {
          const b = randNonZero(-9, 9)
          if (b === a) return null
          return expression(`Factorise : x(${xPlus(a)}) ${b < 0 ? '−' : '+'} ${Math.abs(b)}(${xPlus(a)})`, `(${xPlus(a)})(${xPlus(b)})`, 'factored', {
            explanation: `(${xPlus(a)}) est un facteur commun : x(${xPlus(a)}) ${b < 0 ? '−' : '+'} ${Math.abs(b)}(${xPlus(a)}) = (${xPlus(a)})(${xPlus(b)}).`,
          })
        }),
        () => {
          const c = Math.abs(a)
          return expression(`Factorise : ${poly([k, 'x³'], [k * c, 'x²'])}`, `${K}x²(x + ${c})`, 'factored', {
            explanation: `${K}x² est un facteur commun : ${poly([k, 'x³'])} = ${K}x² × x et ${poly([k * c, 'x²'])} = ${K}x² × ${c}.`,
          })
        },
      )
    },
  ],
  [
    // (kx + a)(kx − a)
    () => {
      const k = randInt(2, 5), a = randInt(1, 9), res = poly([k * k, 'x²'], [-a * a, '']), rev = poly([a * a, ''], [-k * k, 'x²'])
      return oneOf(
        () => expression(`Développe : (${k}x + ${a})(${k}x − ${a})`, res, 'developed', { explanation: `(a + b)(a − b) = a² − b² avec a = ${k}x : (${k}x)² − ${a}² = ${res}.` }),
        () => expression(`Développe : (${k}x − ${a})(${k}x + ${a})`, res, 'developed', { explanation: `(a − b)(a + b) = a² − b² avec a = ${k}x : (${k}x)² − ${a}² = ${res}.` }),
        () => expression(`Développe : (${a} − ${k}x)(${a} + ${k}x)`, rev, 'developed', { explanation: `(a − b)(a + b) = a² − b² avec a = ${a} et b = ${k}x : ${a * a} − (${k}x)² = ${rev}.` }),
        () => expression(`Développe : (${a} + ${k}x)(${k}x − ${a})`, res, 'developed', { explanation: `${a} + ${k}x = ${k}x + ${a} : c'est (${k}x + ${a})(${k}x − ${a}) = (${k}x)² − ${a}² = ${res}.` }),
      )
    },
    // (kx + a)²
    () => {
      const k = randInt(2, 5), a = randNonZero(-7, 7)
      const res = poly([k * k, 'x²'], [2 * k * a, 'x'], [a * a, ''])
      const expl = { explanation: `(${k}x)² = ${k * k}x², 2 × ${k}x × ${par(a)} = ${term(2 * k * a, 'x', true)}, ${par(a)}² = ${a * a} : ${res}.` }
      return oneOf(
        () => expression(`Développe : (${xPlus(a, k)})²`, res, 'developed', expl),
        () => expression(`Développe : (${poly([a, ''], [k, 'x'])})²`, res, 'developed', expl),
        () => expression(`Développe : (${poly([-k, 'x'], [-a, ''])})²`, res, 'developed', { explanation: `(${poly([-k, 'x'], [-a, ''])})² = (${xPlus(a, k)})² car un carré ne change pas quand on change tous les signes. ${expl.explanation}` }),
        () => {
          const A = Math.abs(a)
          return expression(`Un carré a pour côté (${k}x + ${A}) cm. Exprime son aire (en cm²) sous forme développée.`, poly([k * k, 'x²'], [2 * k * A, 'x'], [A * A, '']), 'developed', {
            explanation: `(${k}x + ${A})² = (${k}x)² + 2 × ${k}x × ${A} + ${A}² = ${poly([k * k, 'x²'], [2 * k * A, 'x'], [A * A, ''])}.`,
          })
        },
      )
    },
    // Développer puis réduire avec des x²
    () => retry(() => {
      const a = randNonZero(-5, 5), b = randNonZero(-5, 5), c = randInt(2, 4)
      const P = poly([1, 'x²'], [a + b, 'x'], [a * b, ''])
      return oneOf(
        () => expression(`Développe et réduis : (${xPlus(a)})(${xPlus(b)}) − ${c}x²`, poly([1 - c, 'x²'], [a + b, 'x'], [a * b, '']), 'developed', {
          explanation: `(${xPlus(a)})(${xPlus(b)}) = ${P}, puis on retire ${c}x².`,
        }),
        () => expression(`Développe et réduis : ${c}x² − (${xPlus(a)})(${xPlus(b)})`, poly([c - 1, 'x²'], [-(a + b), 'x'], [-a * b, '']), 'developed', {
          explanation: `(${xPlus(a)})(${xPlus(b)}) = ${P} ; le − change tous les signes : ${poly([c - 1, 'x²'], [-(a + b), 'x'], [-a * b, ''])}.`,
        }),
        () => {
          if (a + b + c === 0) return null
          return expression(`Développe et réduis : (${xPlus(a)})(${xPlus(b)}) + x(${c}x + ${c})`, poly([1 + c, 'x²'], [a + b + c, 'x'], [a * b, '']), 'developed', {
            explanation: `(${xPlus(a)})(${xPlus(b)}) = ${P} et x(${c}x + ${c}) = ${poly([c, 'x²'], [c, 'x'])} ; on regroupe : ${poly([1 + c, 'x²'], [a + b + c, 'x'], [a * b, ''])}.`,
          })
        },
        () => {
          if (a + b === c) return null
          return expression(`Développe et réduis : (${xPlus(a)})(${xPlus(b)}) − x(x + ${c})`, poly([a + b - c, 'x'], [a * b, '']), 'developed', {
            explanation: `(${xPlus(a)})(${xPlus(b)}) = ${P} et x(x + ${c}) = ${poly([1, 'x²'], [c, 'x'])} ; les x² s'annulent : ${poly([a + b - c, 'x'], [a * b, ''])}.`,
          })
        },
      )
    }),
    // Double distributivité (ax + b)(cx + d)
    () => {
      const a = randInt(2, 5), c = pick([-4, -3, -2, -1, 1, 2, 3, 4]), b = randNonZero(-6, 6), d = randNonZero(-6, 6)
      const res = poly([a * c, 'x²'], [a * d + b * c, 'x'], [b * d, ''])
      return oneOf(
        () => expression(`Développe et réduis : (${xPlus(b, a)})(${xPlus(d, c)})`, res, 'developed', {
          explanation: `Double distributivité : ${a}x × ${mono(c)} + ${a}x × ${par(d)} + ${par(b)} × ${mono(c)} + ${par(b)} × ${par(d)} = ${res}.`,
        }),
        () => expression(`Développe et réduis : (${poly([b, ''], [a, 'x'])})(${poly([d, ''], [c, 'x'])})`, res, 'developed', {
          explanation: `Double distributivité : ${par(b)} × ${par(d)} + ${par(b)} × ${mono(c)} + ${a}x × ${par(d)} + ${a}x × ${mono(c)} = ${res}.`,
        }),
        () => {
          const B = Math.abs(b), C = Math.abs(c), D = Math.abs(d)
          return expression(`Un rectangle a pour côtés (${a}x + ${B}) m et (${xPlus(D, C)}) m. Exprime son aire (en m²) sous forme développée et réduite.`, poly([a * C, 'x²'], [a * D + B * C, 'x'], [B * D, '']), 'developed', {
            explanation: `(${a}x + ${B})(${xPlus(D, C)}) = ${poly([a * C, 'x²'], [a * D, 'x'])} + ${term(B * C, 'x', true)} + ${B * D} = ${poly([a * C, 'x²'], [a * D + B * C, 'x'], [B * D, ''])}.`,
          })
        },
        () => {
          const e = randNonZero(-9, 9)
          if (b * d + e === 0) return null
          return expression(`Développe et réduis : (${xPlus(b, a)})(${xPlus(d, c)})${tail(e)}`, poly([a * c, 'x²'], [a * d + b * c, 'x'], [b * d + e, '']), 'developed', {
            explanation: `(${xPlus(b, a)})(${xPlus(d, c)}) = ${res}, puis ${fmt(b * d)} + ${par(e)} = ${fmt(b * d + e)}.`,
          })
        },
      )
    },
    // Factoriser a² − b²
    () => {
      const a = randInt(2, 10)
      return oneOf(
        () => expression(`Factorise : x² − ${a * a}`, `(x − ${a})(x + ${a})`, 'factored', { explanation: `x² − ${a * a} = x² − ${a}² : a² − b² = (a − b)(a + b) avec b = ${a}.` }),
        () => expression(`Factorise : ${a * a} − x²`, `(${a} − x)(${a} + x)`, 'factored', { explanation: `${a * a} − x² = ${a}² − x² : a² − b² = (a − b)(a + b) avec a = ${a} et b = x.` }),
        () => expression(`Factorise : −${a * a} + x²`, `(x − ${a})(x + ${a})`, 'factored', { explanation: `−${a * a} + x² = x² − ${a}² = (x − ${a})(x + ${a}).` }),
        () => expression(`Dans un carré de côté x cm, on découpe un carré de côté ${a} cm. Exprime l'aire restante sous forme factorisée.`, `(x − ${a})(x + ${a})`, 'factored', {
          explanation: `Aire restante : x² − ${a}² = (x − ${a})(x + ${a}).`,
        }),
      )
    },
    // Sommes et différences de carrés
    () => retry(() => {
      const a = randInt(1, 7), b = randInt(1, 7)
      const A = poly([1, 'x²'], [2 * a, 'x'], [a * a, '']), B = poly([1, 'x²'], [-2 * b, 'x'], [b * b, ''])
      return oneOf(
        () => expression(`Développe et réduis : (x + ${a})² + (x − ${b})²`, poly([2, 'x²'], [2 * a - 2 * b, 'x'], [a * a + b * b, '']), 'developed', {
          explanation: `(x + ${a})² = ${A} et (x − ${b})² = ${B}, puis on additionne.`,
        }),
        () => expression(`Développe et réduis : (x + ${a})² − (x − ${b})²`, poly([2 * a + 2 * b, 'x'], [a * a - b * b, '']), 'developed', {
          explanation: `(x + ${a})² = ${A} et (x − ${b})² = ${B} ; le − change tous les signes du second, les x² s'annulent : ${poly([2 * a + 2 * b, 'x'], [a * a - b * b, ''])}.`,
        }),
        () => expression(`Développe et réduis : (x + ${a})² + (x + ${a})(x − ${a})`, poly([2, 'x²'], [2 * a, 'x']), 'developed', {
          explanation: `(x + ${a})² = ${A} et (x + ${a})(x − ${a}) = ${poly([1, 'x²'], [-a * a, ''])} ; en additionnant, les constantes s'annulent : ${poly([2, 'x²'], [2 * a, 'x'])}.`,
        }),
        () => {
          if (a === b) return null
          return expression(`Développe et réduis : (x − ${b})² − x(x − ${a})`, poly([a - 2 * b, 'x'], [b * b, '']), 'developed', {
            explanation: `(x − ${b})² = ${B} et x(x − ${a}) = ${poly([1, 'x²'], [-a, 'x'])} ; on soustrait : ${poly([a - 2 * b, 'x'], [b * b, ''])}.`,
          })
        },
      )
    }),
  ],
  [
    // Reconnaître a² ± 2ab + b²
    () => {
      const a = randNonZero(-8, 8), k = randInt(2, 4)
      return oneOf(
        () => expression(`Factorise : ${poly([1, 'x²'], [2 * a, 'x'], [a * a, ''])}`, `(${xPlus(a)})²`, 'factored', {
          explanation: `On reconnaît a² ${a < 0 ? '−' : '+'} 2ab + b² avec a = x et b = ${Math.abs(a)} : (${xPlus(a)})².`,
        }),
        () => expression(`Factorise : ${poly([a * a, ''], [2 * a, 'x'], [1, 'x²'])}`, `(${xPlus(a)})²`, 'factored', {
          explanation: `En remettant dans l'ordre : ${poly([1, 'x²'], [2 * a, 'x'], [a * a, ''])}, de la forme a² ${a < 0 ? '−' : '+'} 2ab + b² avec a = x et b = ${Math.abs(a)} : (${xPlus(a)})².`,
        }),
        () => expression(`Factorise : ${poly([k * k, 'x²'], [2 * k * a, 'x'], [a * a, ''])}`, `(${xPlus(a, k)})²`, 'factored', {
          explanation: `${k * k}x² = (${k}x)², ${a * a} = ${Math.abs(a)}² et 2 × ${k}x × ${Math.abs(a)} = ${2 * k * Math.abs(a)}x : c'est (${xPlus(a, k)})².`,
        }),
        () => expression(`Un carré a pour aire ${poly([1, 'x²'], [2 * Math.abs(a), 'x'], [a * a, ''])} (en cm², avec x > 0). Écris cette aire sous la forme (côté)², c'est-à-dire factorisée.`, `(x + ${Math.abs(a)})²`, 'factored', {
          explanation: `x² + ${2 * Math.abs(a)}x + ${a * a} = x² + 2 × x × ${Math.abs(a)} + ${Math.abs(a)}² = (x + ${Math.abs(a)})² : le côté vaut x + ${Math.abs(a)}.`,
        }),
      )
    },
    // Reconnaître a² − b²
    () => {
      const k = randInt(2, 6), a = pick([1, 2, 3, 4, 5, 6, 7, 8, 9].filter((v) => gcd(v, k) === 1))
      return oneOf(
        () => expression(`Factorise : ${k * k}x² − ${a * a}`, `(${k}x − ${a})(${k}x + ${a})`, 'factored', { explanation: `${k * k}x² − ${a * a} = (${k}x)² − ${a}² = (${k}x − ${a})(${k}x + ${a}).` }),
        () => expression(`Factorise : ${a * a} − ${k * k}x²`, `(${a} − ${k}x)(${a} + ${k}x)`, 'factored', { explanation: `${a * a} − ${k * k}x² = ${a}² − (${k}x)² = (${a} − ${k}x)(${a} + ${k}x).` }),
        () => expression(`Factorise : −${a * a} + ${k * k}x²`, `(${k}x − ${a})(${k}x + ${a})`, 'factored', { explanation: `−${a * a} + ${k * k}x² = (${k}x)² − ${a}² = (${k}x − ${a})(${k}x + ${a}).` }),
        () => expression(`Factorise : x² − ${F(a * a, k * k)}`, `(x − ${F(a, k)})(x + ${F(a, k)})`.replace(/\{(\d+)\/(\d+)\}/g, '$1/$2'), 'factored', {
          answer: `(x − ${a}/${k})(x + ${a}/${k})`,
          explanation: `${F(a * a, k * k)} = (${F(a, k)})², donc x² − (${F(a, k)})² = (x − ${F(a, k)})(x + ${F(a, k)}).`,
        }),
      )
    },
    // Facteur commun entre parenthèses
    () => retry(() => {
      const a = randNonZero(-6, 6), b = randInt(1, 4), c = randNonZero(-6, 6), d = randInt(1, 3), e = randNonZero(-6, 6)
      const P = `(${xPlus(a)})`
      return oneOf(
        () => {
          if (c + e === 0) return null
          return expression(`Factorise : ${P}(${xPlus(c, b)}) + ${P}(${xPlus(e, d)})`, `${P}(${xPlus(c + e, b + d)})`, 'factored', {
            explanation: `${P} est un facteur commun : ${P}[(${xPlus(c, b)}) + (${xPlus(e, d)})] = ${P}(${xPlus(c + e, b + d)}).`,
          })
        },
        () => {
          if (c + e === 0) return null
          return expression(`Factorise : (${xPlus(c, b)})${P} ${e < 0 ? '−' : '+'} ${coefP(Math.abs(e))}${P}`, `${P}(${xPlus(c + e, b)})`, 'factored', {
            explanation: `${P} est un facteur commun : ${P}[(${xPlus(c, b)}) + ${par(e)}] = ${P}(${xPlus(c + e, b)}).`,
          })
        },
        () => {
          if (c === 1) return null
          return expression(`Factorise : (${xPlus(c, b)})${P} − ${P}`, `${P}(${xPlus(c - 1, b)})`, 'factored', {
            explanation: `${P} = 1 × ${P} : c'est un facteur commun, ${P}[(${xPlus(c, b)}) − 1] = ${P}(${xPlus(c - 1, b)}).`,
          })
        },
        () => {
          if (c + e === 0) return null
          return expression(`Factorise : ${P}(${xPlus(c, b)}) + (${xPlus(e, d)})${P}`, `${P}(${xPlus(c + e, b + d)})`, 'factored', {
            explanation: `Le facteur ${P} apparaît dans les deux produits (l'ordre ne compte pas) : ${P}[(${xPlus(c, b)}) + (${xPlus(e, d)})] = ${P}(${xPlus(c + e, b + d)}).`,
          })
        },
      )
    }),
    // Développer et réduire, les x² disparaissent
    () => retry(() => {
      const a = randNonZero(-6, 6), b = randNonZero(-6, 6), c = randNonZero(-6, 6)
      const A2 = poly([1, 'x²'], [2 * a, 'x'], [a * a, ''])
      return oneOf(
        () => {
          if (2 * a - b - c === 0) return null
          return expression(`Développe et réduis : (${xPlus(a)})² − (${xPlus(b)})(${xPlus(c)})`, poly([2 * a - b - c, 'x'], [a * a - b * c, '']), 'developed', {
            explanation: `(${xPlus(a)})² = ${A2} et (${xPlus(b)})(${xPlus(c)}) = ${poly([1, 'x²'], [b + c, 'x'], [b * c, ''])} ; le signe − change tous les signes du produit, et les x² s'annulent.`,
          })
        },
        () => {
          if (2 * a - b - c === 0) return null
          return expression(`Développe et réduis : (${xPlus(b)})(${xPlus(c)}) − (${xPlus(a)})²`, poly([b + c - 2 * a, 'x'], [b * c - a * a, '']), 'developed', {
            explanation: `(${xPlus(b)})(${xPlus(c)}) = ${poly([1, 'x²'], [b + c, 'x'], [b * c, ''])} et (${xPlus(a)})² = ${A2} ; le − change tous les signes du carré, les x² s'annulent.`,
          })
        },
        () => {
          const A = Math.abs(a)
          if (A === Math.abs(b)) return null
          return expression(`Développe et réduis : (x + ${A})(x − ${A}) − (${xPlus(b)})²`, poly([-2 * b, 'x'], [-A * A - b * b, '']), 'developed', {
            explanation: `(x + ${A})(x − ${A}) = ${poly([1, 'x²'], [-A * A, ''])} et (${xPlus(b)})² = ${poly([1, 'x²'], [2 * b, 'x'], [b * b, ''])} ; on soustrait, les x² s'annulent : ${poly([-2 * b, 'x'], [-A * A - b * b, ''])}.`,
          })
        },
        () => {
          const A = Math.abs(a)
          return expression(`Développe et réduis : (x + ${A})² − (x − ${A})²`, poly([4 * A, 'x']), 'developed', {
            explanation: `(x + ${A})² = ${poly([1, 'x²'], [2 * A, 'x'], [A * A, ''])} et (x − ${A})² = ${poly([1, 'x²'], [-2 * A, 'x'], [A * A, ''])} ; la différence vaut ${poly([4 * A, 'x'])}.`,
          })
        },
      )
    }),
    // Variations d'aire
    () => {
      const a = randInt(1, 6), what = pick(['place', 'pelouse', 'cour', 'salle', 'piscine'])
      return oneOf(
        () => expression(`Une ${what} carrée a un côté de x m. On allonge chaque côté de ${a} m. De combien son aire augmente-t-elle ? Donne une expression développée en fonction de x.`, poly([2 * a, 'x'], [a * a, '']), 'developed', {
          explanation: `(x + ${a})² − x² = x² + ${2 * a}x + ${a * a} − x² = ${poly([2 * a, 'x'], [a * a, ''])}.`,
        }),
        () => expression(`Une ${what} carrée a un côté de x m (x > ${a}). On raccourcit chaque côté de ${a} m. De combien son aire diminue-t-elle ? Donne une expression développée en fonction de x.`, poly([2 * a, 'x'], [-a * a, '']), 'developed', {
          explanation: `x² − (x − ${a})² = x² − (x² − ${2 * a}x + ${a * a}) = ${poly([2 * a, 'x'], [-a * a, ''])}.`,
        }),
        () => expression(`Une ${what} carrée de côté x m est entourée d'une allée de ${a} m de large. Exprime l'aire de l'allée (en m²) sous forme développée.`, poly([4 * a, 'x'], [4 * a * a, '']), 'developed', {
          explanation: `Le grand carré a pour côté x + ${2 * a} : (x + ${2 * a})² − x² = x² + ${4 * a}x + ${4 * a * a} − x² = ${poly([4 * a, 'x'], [4 * a * a, ''])}.`,
        }),
        () => expression(`Une ${what} carrée a un côté de x m (x > ${a}). On allonge deux côtés opposés de ${a} m et on raccourcit les deux autres de ${a} m. Exprime la variation de son aire (nouvelle aire − ancienne aire).`, String(-a * a), 'any', {
          answer: fmt(-a * a), inputHint: 'un nombre ou une expression en x',
          explanation: `(x + ${a})(x − ${a}) − x² = x² − ${a * a} − x² = ${fmt(-a * a)} : l'aire diminue toujours de ${a * a} m², quel que soit x !`,
        }),
      )
    },
    // Calcul mental avec les identités
    () => {
      const n = pick([20, 30, 40, 50, 60, 100]), a = randInt(1, 9)
      return oneOf(
        () => numeric(`Calcule de tête, grâce à une identité remarquable : ${n + a} × ${n - a}`, n * n - a * a, { explanation: `(${n} + ${a})(${n} − ${a}) = ${n}² − ${a}² = ${n * n} − ${a * a} = ${n * n - a * a}.` }),
        () => numeric(`Calcule de tête, grâce à une identité remarquable : ${n + a}²`, (n + a) ** 2, { explanation: `(${n} + ${a})² = ${n * n} + 2 × ${n} × ${a} + ${a * a} = ${(n + a) ** 2}.` }),
        () => numeric(`Calcule de tête, grâce à une identité remarquable : ${n - a}²`, (n - a) ** 2, { explanation: `(${n} − ${a})² = ${n * n} − 2 × ${n} × ${a} + ${a * a} = ${(n - a) ** 2}.` }),
        () => numeric(`Calcule de tête, grâce à une identité remarquable : ${n + a}² − ${n - a}²`, 4 * n * a, {
          explanation: `A² − B² = (A − B)(A + B) : (${n + a} − ${n - a})(${n + a} + ${n - a}) = ${2 * a} × ${2 * n} = ${4 * n * a}.`,
        }),
        () => {
          const m = 100 - a, p = 100 + a
          return numeric(`Sans poser l'opération, calcule ${p}² − ${m}² en factorisant.`, (p - m) * (p + m), {
            explanation: `${p}² − ${m}² = (${p} − ${m})(${p} + ${m}) = ${p - m} × ${p + m} = ${(p - m) * (p + m)}.`,
          })
        },
      )
    },
  ],
  [
    // A² − B² avec A et B affines
    () => retry(() => {
      const a = randNonZero(-5, 5), b = randNonZero(-5, 5)
      return oneOf(
        () => {
          if (Math.abs(a - b) < 2 || a + b === 0) return null
          return expression(`Factorise puis réduis chaque facteur : (${xPlus(a)})² − (${xPlus(b)})²`, `${fmt(a - b)}(${xPlus(a + b, 2)})`, 'factored', {
            explanation: `A² − B² = (A − B)(A + B) : A − B = ${fmt(a - b)} et A + B = ${xPlus(a + b, 2)}.`,
          })
        },
        () => {
          if (a === b || a + b === 0) return null
          return expression(`Factorise puis réduis chaque facteur : (${xPlus(a, 2)})² − (${xPlus(b)})²`, `(${xPlus(a - b)})(${xPlus(a + b, 3)})`, 'factored', {
            explanation: `A² − B² = (A − B)(A + B) avec A = ${xPlus(a, 2)} et B = ${xPlus(b)} : A − B = ${xPlus(a - b)} et A + B = ${xPlus(a + b, 3)}.`,
          })
        },
        () => {
          const c = randInt(2, 9)
          if (c === Math.abs(a)) return null
          return expression(`Factorise puis réduis chaque facteur : ${c * c} − (${xPlus(a)})²`, `(${poly([-1, 'x'], [c - a, ''])})(${xPlus(c + a)})`, 'factored', {
            explanation: `${c * c} = ${c}² : ${c}² − (${xPlus(a)})² = (${c} − (${xPlus(a)}))(${c} + ${xPlus(a)}) = (${poly([-1, 'x'], [c - a, ''])})(${xPlus(c + a)}).`,
          })
        },
        () => {
          const A = Math.abs(a)
          return expression(`Factorise puis réduis chaque facteur : (x + ${A})² − 4x²`, `(${poly([-1, 'x'], [A, ''])})(${xPlus(A, 3)})`, 'factored', {
            explanation: `4x² = (2x)² : (x + ${A} − 2x)(x + ${A} + 2x) = (${poly([-1, 'x'], [A, ''])})(${xPlus(A, 3)}).`,
          })
        },
      )
    }),
    // A² − c²
    () => retry(() => {
      const a = randInt(1, 4), b = randNonZero(-7, 7), c = randInt(1, 8)
      if (Math.abs(b) === c) return null
      return oneOf(
        () => expression(`Factorise : (${xPlus(b, a)})² − ${c * c}`, `(${xPlus(b - c, a)})(${xPlus(b + c, a)})`, 'factored', {
          explanation: `On reconnaît A² − B² avec A = ${xPlus(b, a)} et B = ${c} : (A − B)(A + B).`,
        }),
        () => expression(`Factorise : ${c * c} − (${xPlus(b, a)})²`, `(${poly([-a, 'x'], [c - b, ''])})(${xPlus(c + b, a)})`, 'factored', {
          explanation: `${c}² − A² = (${c} − A)(${c} + A) avec A = ${xPlus(b, a)} : (${poly([-a, 'x'], [c - b, ''])})(${xPlus(c + b, a)}).`,
        }),
        () => expression(`Factorise : −${c * c} + (${xPlus(b, a)})²`, `(${xPlus(b - c, a)})(${xPlus(b + c, a)})`, 'factored', {
          explanation: `C'est (${xPlus(b, a)})² − ${c}² : A² − B² = (A − B)(A + B) avec A = ${xPlus(b, a)} et B = ${c}.`,
        }),
        () => expression(`Factorise : ${poly([1, 'x²'], [2 * b, 'x'], [b * b - c * c, ''])} (indice : ${poly([1, 'x²'], [2 * b, 'x'], [b * b, ''])} est un carré)`, `(${xPlus(b - c)})(${xPlus(b + c)})`, 'factored', {
          explanation: `${poly([1, 'x²'], [2 * b, 'x'], [b * b - c * c, ''])} = (${xPlus(b)})² − ${c * c} = (${xPlus(b)})² − ${c}² = (${xPlus(b - c)})(${xPlus(b + c)}).`,
        }),
      )
    }),
    // Facteur commun caché
    () => retry(() => {
      const a = randNonZero(-6, 6), P = `(${xPlus(a)})`
      return oneOf(
        () => {
          const b = randInt(2, 5), c = randNonZero(-6, 6), d = randInt(1, 4), e = randNonZero(-6, 6)
          if (b === d || c === e) return null
          return expression(`Factorise : ${P}(${xPlus(c, b)}) − ${P}(${xPlus(e, d)})`, `${P}(${xPlus(c - e, b - d)})`, 'factored', {
            explanation: `Facteur commun ${P} : ${P}[(${xPlus(c, b)}) − (${xPlus(e, d)})] ; le − change les signes de la seconde parenthèse : ${xPlus(c - e, b - d)}.`,
          })
        },
        () => {
          const b = randInt(1, 4), c = randNonZero(-6, 6)
          if (a + c === 0) return null
          return expression(`Factorise : ${P}² + ${P}(${xPlus(c, b)})`, `${P}(${xPlus(a + c, b + 1)})`, 'factored', {
            explanation: `${P}² = ${P}${P} : facteur commun ${P}, il reste ${P} + (${xPlus(c, b)}) = ${xPlus(a + c, b + 1)}.`,
          })
        },
        () => {
          const b = randInt(2, 4), c = randNonZero(-6, 6)
          if (c === a || b === 1) return null
          return expression(`Factorise : (${xPlus(c, b)})${P} − ${P}²`, `${P}(${xPlus(c - a, b - 1)})`, 'factored', {
            explanation: `Facteur commun ${P} : ${P}[(${xPlus(c, b)}) − ${P}] = ${P}(${xPlus(c - a, b - 1)}).`,
          })
        },
        () => {
          const k = randInt(2, 4), c = randNonZero(-6, 6)
          if (c === k * a) return null
          return expression(`Factorise : (${xPlus(c)})(${xPlus(k * a, k)}) + (${xPlus(a)})²`, `${P}(${xPlus(k * c + a, k + 1)})`, 'factored', {
            explanation: `${xPlus(k * a, k)} = ${k}${P} : l'expression vaut ${P}[${k}(${xPlus(c)}) + ${P}] = ${P}(${xPlus(k * c + a, k + 1)}).`,
          })
        },
      )
    }),
    // Volumes et aires de boîtes
    () => {
      const L = 2 * randInt(5, 15)
      return oneOf(
        () => {
          const what = pick(['plaque de carton', 'feuille de cuivre', 'plaque de bois fin', 'feuille d’étain'])
          return expression(
            `Dans une ${what} carrée de ${L} cm de côté, on découpe un carré de x cm de côté à chaque coin, puis on relève les bords pour former une boîte sans couvercle. Exprime son volume V(x) (en cm³) sous forme développée et réduite.`,
            poly([4, 'x³'], [-4 * L, 'x²'], [L * L, 'x']), 'developed', {
              inputHint: 'ex. ax^3 + bx² + cx',
              explanation: `Le fond mesure (${L} − 2x) de côté et la hauteur vaut x : V(x) = x(${L} − 2x)² = x(${poly([L * L, ''], [-4 * L, 'x'], [4, 'x²'])}) = ${poly([4, 'x³'], [-4 * L, 'x²'], [L * L, 'x'])}.`,
            })
        },
        () => {
          const W = L - 2 * randInt(1, 3)
          return expression(
            `Dans une plaque rectangulaire de ${L} cm sur ${W} cm, on découpe un carré de x cm de côté à chaque coin, puis on relève les bords pour former une boîte sans couvercle. Exprime son volume V(x) (en cm³) sous forme développée et réduite.`,
            poly([4, 'x³'], [-2 * (L + W), 'x²'], [L * W, 'x']), 'developed', {
              inputHint: 'ex. ax^3 + bx² + cx',
              explanation: `Le fond mesure (${L} − 2x) sur (${W} − 2x) et la hauteur vaut x : V(x) = x(${L} − 2x)(${W} − 2x) = x(${poly([L * W, ''], [-2 * (L + W), 'x'], [4, 'x²'])}) = ${poly([4, 'x³'], [-2 * (L + W), 'x²'], [L * W, 'x'])}.`,
            })
        },
        () => {
          const a = randInt(1, 5), b = randInt(1, 6)
          return expression(`Un pavé droit a pour dimensions x, x + ${a} et x + ${b} (en cm). Exprime son volume (en cm³) sous forme développée et réduite.`, poly([1, 'x³'], [a + b, 'x²'], [a * b, 'x']), 'developed', {
            inputHint: 'ex. x^3 + bx² + cx',
            explanation: `V = x(x + ${a})(x + ${b}) = x(${poly([1, 'x²'], [a + b, 'x'], [a * b, ''])}) = ${poly([1, 'x³'], [a + b, 'x²'], [a * b, 'x'])}.`,
          })
        },
        () => {
          const h = randInt(2, 9)
          return expression(`Une boîte a un fond carré de côté x cm et une hauteur de (x + ${h}) cm, sans couvercle. Exprime l'aire totale de carton utilisé (fond + 4 faces latérales) sous forme développée et réduite.`, poly([5, 'x²'], [4 * h, 'x']), 'developed', {
            explanation: `Fond : x² ; chaque face latérale : x(x + ${h}) = ${poly([1, 'x²'], [h, 'x'])}. Total : x² + 4(${poly([1, 'x²'], [h, 'x'])}) = ${poly([5, 'x²'], [4 * h, 'x'])}.`,
          })
        },
      )
    },
    // Factorisation complète
    () => {
      const a = randInt(1, 6), k = randInt(2, 7)
      return oneOf(
        () => fullyFactored(expression(`Factorise complètement : ${poly([k, 'x²'], [-k * a * a, ''])}`, `${k}(x − ${a})(x + ${a})`, 'factored', {
          explanation: `Facteur commun ${k} : ${k}(x² − ${a * a}), puis x² − ${a * a} = (x − ${a})(x + ${a}).`,
        })),
        () => fullyFactored(expression(`Factorise complètement : ${poly([1, 'x³'], [-a * a, 'x'])}`, `x(x − ${a})(x + ${a})`, 'factored', {
          inputHint: 'ex. x(x − 1)(x + 1)',
          explanation: `Facteur commun x : x(x² − ${a * a}), puis x² − ${a * a} = (x − ${a})(x + ${a}).`,
        })),
        () => fullyFactored(expression(`Factorise complètement : ${poly([k, 'x²'], [2 * k * a, 'x'], [k * a * a, ''])}`, `${k}(x + ${a})²`, 'factored', {
          inputHint: 'ex. 2(x + 1)²',
          explanation: `Facteur commun ${k} : ${k}(${poly([1, 'x²'], [2 * a, 'x'], [a * a, ''])}), puis on reconnaît (x + ${a})².`,
        })),
        () => fullyFactored(expression(`Factorise complètement : ${poly([1, 'x³'], [-2 * a, 'x²'], [a * a, 'x'])}`, `x(x − ${a})²`, 'factored', {
          inputHint: 'ex. x(x − 1)²',
          explanation: `Facteur commun x : x(${poly([1, 'x²'], [-2 * a, 'x'], [a * a, ''])}), puis on reconnaît (x − ${a})².`,
        })),
      )
    },
    // Forme canonique
    () => {
      const p = randNonZero(-6, 6), q = randInt(-10, 15), e = poly([1, 'x²'], [2 * p, 'x'], [q, ''])
      const expl = { explanation: `(${xPlus(p)})² = ${poly([1, 'x²'], [2 * p, 'x'], [p * p, ''])} : il faut ajouter ${fmt(q)} − ${p * p} = ${fmt(q - p * p)}, donc ${e} = (${xPlus(p)})²${tail(q - p * p)}.` }
      return oneOf(
        () => numeric(`Complète : ${e} = (${xPlus(p)})² + … Quel nombre faut-il écrire à la place des pointillés ?`, q - p * p, expl),
        () => numeric(`On écrit ${e} sous la forme (x + α)² + β. Que vaut α ?`, p, { explanation: `Le terme en x vaut ${term(2 * p, 'x', true)} = 2 × ${par(p)} × x, donc α = ${fmt(p)}. ${expl.explanation}` }),
        () => numeric(`On écrit ${e} sous la forme (x + α)² + β. Que vaut β ?`, q - p * p, expl),
        () => numeric(`Quelle est la valeur minimale de ${e} lorsque x parcourt ℝ ?`, q - p * p, {
          explanation: `${e} = (${xPlus(p)})²${tail(q - p * p)} ; un carré est toujours ≥ 0 et vaut 0 pour x = ${fmt(-p)}, donc le minimum est ${fmt(q - p * p)}.`,
        }),
      )
    },
  ],
]

// ── Équations & inéquations ─────────────────────────────────────────────
const eq: Tiers = [
  [
    // ax + b = c
    () => {
      const a = randNonZero(-9, 9), x = randInt(-10, 10), b = randNonZero(-15, 15), c = a * x + b
      const expl = { explanation: `${poly([a, 'x'])} = ${fmt(c)} − ${par(b)} = ${fmt(a * x)}, donc x = ${fmt(a * x)} ÷ ${par(a)} = ${fmt(x)}.` }
      return oneOf(
        () => numeric(`Résous : ${poly([a, 'x'], [b, ''])} = ${fmt(c)}. x = ?`, x, expl),
        () => numeric(`Résous : ${fmt(c)} = ${poly([b, ''], [a, 'x'])}. x = ?`, x, expl),
        () => numeric(`Pour quelle valeur de x l'expression ${poly([a, 'x'], [b, ''])} vaut-elle ${fmt(c)} ?`, x, expl),
        () => numeric(`Résous : ${poly([b, ''], [a, 'x'])} = ${fmt(c)}. x = ?`, x, expl),
      )
    },
    // Diviser par un nombre
    () => {
      const k = randInt(2, 9), v = randNonZero(-10, 10)
      const expl = { explanation: `On multiplie les deux membres par ${k} : x = ${fmt(v)} × ${k} = ${fmt(k * v)}.` }
      return oneOf(
        () => numeric(`Résous : ${F('x', k)} = ${fmt(v)}. x = ?`, k * v, expl),
        () => numeric(`Résous : ${fmt(v)} = ${F('x', k)}. x = ?`, k * v, expl),
        () => {
          const P: Record<number, string> = { 2: 'La moitié', 3: 'Le tiers', 4: 'Le quart', 5: 'Le cinquième', 10: 'Le dixième' }
          const kk = pick([2, 3, 4, 5, 10]), w = randInt(2, 15)
          return numeric(`${P[kk]} d'un nombre vaut ${w}. Quel est ce nombre ?`, kk * w, { explanation: `${F('x', kk)} = ${w}, donc x = ${w} × ${kk} = ${kk * w}.` })
        },
        () => retry(() => {
          const p = randInt(2, 5), q = randInt(2, 7), t = randNonZero(-6, 6)
          if (p === q || gcd(p, q) !== 1) return null
          return numeric(`Résous : ${F(p, q)}x = ${fmt(p * t)}. x = ?`, q * t, {
            explanation: `On multiplie par ${q} puis on divise par ${p} : x = ${fmt(p * t)} × ${F(q, p)} = ${fmt(q * t)}.`,
          })
        }),
      )
    },
    // Programme de calcul
    () => {
      const a = randInt(2, 9), b = randInt(1, 15), x = randInt(1, 15), who = prenom()
      return oneOf(
        () => {
          const B = pick([b, -b])
          return numeric(`${who} pense à un nombre, le multiplie par ${a}, puis ${B > 0 ? `ajoute ${B}` : `retire ${-B}`} au résultat. ${pick(['Résultat obtenu', 'Résultat final', 'Nombre obtenu'])} : ${fmt(a * x + B)}. Quel était le nombre de départ ?`, x, {
            explanation: `${poly([a, 'x'], [B, ''])} = ${fmt(a * x + B)}, donc ${a}x = ${a * x} et x = ${x}.`,
          })
        },
        () => numeric(`${who} pense à un nombre, lui ajoute ${b}, puis multiplie le résultat par ${a}. Il obtient ${a * (x + b)}. Quel était le nombre de départ ?`, x, {
          explanation: `${a}(x + ${b}) = ${a * (x + b)}, donc x + ${b} = ${x + b} et x = ${x}.`,
        }),
        () => {
          const m = pick(['flèches', 'pains', 'torches', 'cordes', 'lanternes']), p = randInt(2, 9)
          return numeric(`${who} achète des ${m} à ${p} écus pièce et paie ${b} écus de livraison. Au total, la facture s'élève à ${p * x + b} écus. Combien de ${m} a-t-il achetés ?`, x, {
            explanation: `${p}x + ${b} = ${p * x + b}, donc ${p}x = ${p * x} et x = ${x}.`,
          })
        },
      )
    },
    // Inéquation x + a ⋚ b
    () => {
      const a = randNonZero(-9, 9), b = randInt(-10, 10), r = pick(RELS)
      const expl = { explanation: `On retire ${par(a)} des deux côtés : x ${r} ${fmt(b)} − ${par(a)}, soit x ${r} ${fmt(b - a)}.` }
      return oneOf(
        () => interval(`Résous : ${xPlus(a)} ${r} ${fmt(b)} (réponse sous forme d'intervalle).`, relInterval(r, b - a), expl),
        () => interval(`Résous : ${poly([a, ''], [1, 'x'])} ${r} ${fmt(b)} (réponse sous forme d'intervalle).`, relInterval(r, b - a), expl),
        () => interval(`Résous : ${fmt(b)} ${flip(r)} ${xPlus(a)} (réponse sous forme d'intervalle).`, relInterval(r, b - a), {
          explanation: `${fmt(b)} ${flip(r)} ${xPlus(a)} s'écrit aussi ${xPlus(a)} ${r} ${fmt(b)} ; on retire ${par(a)} : x ${r} ${fmt(b - a)}.`,
        }),
        () => {
          const c = randInt(2, 5)
          return interval(`Résous : ${poly([c, 'x'], [a, ''])} ${r} ${poly([c - 1, 'x'], [b, ''])} (réponse sous forme d'intervalle).`, relInterval(r, b - a), {
            explanation: `On retire ${poly([c - 1, 'x'])} des deux côtés : ${xPlus(a)} ${r} ${fmt(b)}, puis x ${r} ${fmt(b - a)}.`,
          })
        },
      )
    },
    // ax = b, solution fractionnaire
    () => retry(() => {
      const a = pick([-9, -8, -7, -6, -5, -4, -3, -2, 2, 3, 4, 5, 6, 7, 8, 9]), b = randNonZero(-20, 20)
      if (b % a === 0 && Math.random() < 0.6) return null
      const expl = { explanation: `On divise par ${par(a)} : x = ${F(fmt(b), fmt(a))} = ${fracText(b, a)}.` }
      return oneOf(
        () => fraction(`Résous : ${poly([a, 'x'])} = ${fmt(b)}. x = ?`, b, a, expl),
        () => fraction(`Résous : ${fmt(b)} = ${poly([a, 'x'])}. x = ?`, b, a, expl),
        () => fraction(`Résous : ${poly([a, 'x'], [-b, ''])} = 0. x = ?`, b, a, { explanation: `${poly([a, 'x'])} = ${fmt(b)}, puis on divise par ${par(a)} : x = ${fracText(b, a)}.` }),
        () => {
          const A = Math.abs(a), B = Math.abs(b)
          return fraction(`Le produit de ${A} par un nombre vaut ${B}. Quel est ce nombre ?`, B, A, { explanation: `${A}x = ${B}, donc x = ${F(B, A)} = ${fracText(B, A)}.` })
        },
      )
    }),
  ],
  [
    // x des deux côtés
    () => retry(() => {
      const a = randInt(2, 9), c = randInt(1, 9), b = randInt(-10, 10), d = randInt(-10, 10)
      if (a === c) return null
      const expl = { explanation: `On regroupe les x d'un côté : ${poly([a - c, 'x'])} = ${fmt(d)} − ${par(b)} = ${fmt(d - b)}, donc x = ${fracText(d - b, a - c)}.` }
      return oneOf(
        () => fraction(`Résous : ${poly([a, 'x'], [b, ''])} = ${poly([c, 'x'], [d, ''])}. x = ?`, d - b, a - c, expl),
        () => fraction(`Résous : ${poly([d, ''], [c, 'x'])} = ${poly([b, ''], [a, 'x'])}. x = ?`, d - b, a - c, expl),
        () => fraction(`Résous : ${poly([a, 'x'], [b, ''], [-c, 'x'])} = ${fmt(d)}. x = ?`, d - b, a - c, {
          explanation: `On réduit : ${poly([a - c, 'x'], [b, ''])} = ${fmt(d)}, donc ${poly([a - c, 'x'])} = ${fmt(d - b)} et x = ${fracText(d - b, a - c)}.`,
        }),
        () => fraction(`Pour quelle valeur de x les expressions ${poly([a, 'x'], [b, ''])} et ${poly([c, 'x'], [d, ''])} sont-elles égales ?`, d - b, a - c, expl),
      )
    }),
    // Avec des parenthèses
    () => {
      const k = randInt(2, 5), a = randNonZero(-6, 6), x = randInt(-6, 6), c = randInt(1, 4)
      return oneOf(
        () => {
          const rhs = k * (x + a) + c * x
          return numeric(`Résous : ${k}(${xPlus(a)}) + ${term(c, 'x', true)} = ${fmt(rhs)}. x = ?`, x, {
            explanation: `${poly([k + c, 'x'], [k * a, ''])} = ${fmt(rhs)}, donc ${poly([k + c, 'x'])} = ${fmt(rhs - k * a)} et x = ${fmt(x)}.`,
          })
        },
        () => retry(() => {
          const K = k + c, rhs = K * (x + a) - c * x
          return numeric(`Résous : ${K}(${xPlus(a)}) − ${term(c, 'x', true)} = ${fmt(rhs)}. x = ?`, x, {
            explanation: `${poly([K, 'x'], [K * a, ''])} − ${term(c, 'x', true)} = ${poly([k, 'x'], [K * a, ''])} = ${fmt(rhs)}, donc ${poly([k, 'x'])} = ${fmt(rhs - K * a)} et x = ${fmt(x)}.`,
          })
        }),
        () => {
          const b = randNonZero(-5, 5), rhs = k * (x + a) + c * (x + b)
          return numeric(`Résous : ${k}(${xPlus(a)}) + ${c === 1 ? '' : c}(${xPlus(b)}) = ${fmt(rhs)}. x = ?`, x, {
            explanation: `On développe : ${poly([k + c, 'x'], [k * a + c * b, ''])} = ${fmt(rhs)}, donc ${poly([k + c, 'x'])} = ${fmt(rhs - k * a - c * b)} et x = ${fmt(x)}.`,
          })
        },
        () => {
          const b = randNonZero(-9, 9), rhs = k * (x + a) - (x + b)
          if (k === 1) return null
          return numeric(`Résous : ${k}(${xPlus(a)}) − (${xPlus(b)}) = ${fmt(rhs)}. x = ?`, x, {
            explanation: `On développe : ${poly([k, 'x'], [k * a, ''], [-1, 'x'], [-b, ''])} = ${poly([k - 1, 'x'], [k * a - b, ''])} = ${fmt(rhs)}, donc x = ${fmt(x)}.`,
          })
        },
      )
    },
    // x² = c
    () => {
      const k = randInt(2, 12), N = k * k
      const expl = { explanation: `x² = ${N} a deux solutions : ${k} et −${k} (car (−${k})² = ${N} aussi).` }
      return oneOf(
        () => solutionSet(`Résous : x² = ${N}`, [-k, k], expl),
        () => {
          const s = randInt(2, 30)
          return solutionSet(`Résous : x² + ${s} = ${N + s}`, [-k, k], { explanation: `On retire ${s} : x² = ${N}. ${expl.explanation}` })
        },
        () => {
          const c = randInt(2, 5)
          return solutionSet(`Résous : ${c}x² = ${c * N}`, [-k, k], { explanation: `On divise par ${c} : x² = ${N}. ${expl.explanation}` })
        },
        () => solutionSet(`Le carré d'un nombre vaut ${N}. Quels sont les nombres possibles ?`, [-k, k], expl),
        () => solutionSet(`Résous : x² − ${N} = 0`, [-k, k], { explanation: `x² = ${N}. ${expl.explanation}` }),
      )
    },
    // ax + b ⋚ c avec a > 0
    () => {
      const a = randInt(2, 6), v = randInt(-5, 5), b = randInt(-9, 9), r = pick<Rel>(['≥', '≤', '>', '<'])
      const expl = { explanation: `${a}x ${r} ${fmt(a * v)}, on divise par ${a} > 0 (le sens ne change pas) : x ${r} ${fmt(v)}.` }
      return oneOf(
        () => interval(`Résous ${poly([a, 'x'], [b, ''])} ${r} ${fmt(a * v + b)} (réponse sous forme d'intervalle).`, relInterval(r, v), expl),
        () => interval(`Résous ${fmt(a * v + b)} ${flip(r)} ${poly([a, 'x'], [b, ''])} (réponse sous forme d'intervalle).`, relInterval(r, v), expl),
        () => interval(`Résous ${poly([b, ''], [a, 'x'])} ${r} ${fmt(a * v + b)} (réponse sous forme d'intervalle).`, relInterval(r, v), expl),
        () => {
          const s = randInt(5, 30), e = randInt(2, 6), goal = s + e * randInt(3, 12), w = (goal - s) / e
          return interval(`${prenom()} a ${s} € dans sa tirelire et y ajoute ${e} € chaque semaine. Pour quelles durées x (en semaines) aura-t-il au moins ${goal} € ? (réponse sous forme d'intervalle)`, relInterval('≥', w), {
            explanation: `${s} + ${e}x ≥ ${goal} ⇔ ${e}x ≥ ${goal - s} ⇔ x ≥ ${w}.`,
          })
        },
      )
    },
    // Équations avec des fractions
    () => {
      const b = randInt(2, 6), a = randNonZero(-9, 9), c = randNonZero(-6, 6)
      return oneOf(
        () => numeric(`Résous : ${F(xPlus(a), b)} = ${fmt(c)}. x = ?`, b * c - a, { explanation: `${xPlus(a)} = ${fmt(c)} × ${b} = ${fmt(b * c)}, donc x = ${fmt(b * c - a)}.` }),
        () => numeric(`Résous : ${F('x', b)}${tail(a)} = ${fmt(c)}. x = ?`, b * (c - a), {
          explanation: `${F('x', b)} = ${fmt(c)} − ${par(a)} = ${fmt(c - a)}, donc x = ${fmt(c - a)} × ${b} = ${fmt(b * (c - a))}.`,
        }),
        () => numeric(`Résous : ${fmt(c)} = ${F(xPlus(a), b)}. x = ?`, b * c - a, { explanation: `On multiplie par ${b} : ${xPlus(a)} = ${fmt(b * c)}, donc x = ${fmt(b * c - a)}.` }),
        () => retry(() => {
          const k = randInt(2, 5)
          if (gcd(k, b) !== 1) return null
          return numeric(`Résous : ${F(`${k}x`, b)} = ${fmt(k * c)}. x = ?`, b * c, { explanation: `On multiplie par ${b} : ${k}x = ${fmt(k * b * c)}, puis on divise par ${k} : x = ${fmt(b * c)}.` })
        }),
      )
    },
    // Problèmes « nombre mystère »
    () => retry(() => {
      const N: Record<number, string> = { 2: 'double', 3: 'triple', 4: 'quadruple', 5: 'quintuple' }
      const k1 = randInt(3, 5), k2 = randInt(2, k1 - 1), x = randInt(2, 15), b1 = randInt(1, 12), b2 = (k1 - k2) * x - b1
      return oneOf(
        () => b2 < 1 ? null : numeric(`Le ${N[k1]} d'un nombre, diminué de ${b1}, est égal au ${N[k2]} de ce nombre augmenté de ${b2}. Quel est ce nombre ?`, x, {
          explanation: `${k1}x − ${b1} = ${k2}x + ${b2}, donc ${k1 - k2 === 1 ? `x = ${b1 + b2}` : `${poly([k1 - k2, 'x'])} = ${b1 + b2} et x = ${x}`}.`,
        }),
        () => numeric(`La somme d'un nombre et de son ${N[k1]} vaut ${(k1 + 1) * x}. Quel est ce nombre ?`, x, {
          explanation: `x + ${k1}x = ${(k1 + 1) * x}, soit ${k1 + 1}x = ${(k1 + 1) * x}, donc x = ${x}.`,
        }),
        () => {
          const m = randInt(1, x - 1)
          return numeric(`Si on retire ${m} au ${N[k1]} d'un nombre, on obtient ${k1 * x - m}. Quel est ce nombre ?`, x, {
            explanation: `${k1}x − ${m} = ${k1 * x - m}, donc ${k1}x = ${k1 * x} et x = ${x}.`,
          })
        },
        () => {
          const s = randInt(3, 12)
          return numeric(`Trois nombres : le premier est x, le deuxième est le ${N[k2]} du premier, le troisième vaut le premier augmenté de ${s}. Leur somme vaut ${(k2 + 2) * x + s}. Que vaut x ?`, x, {
            explanation: `x + ${k2}x + (x + ${s}) = ${k2 + 2}x + ${s} = ${(k2 + 2) * x + s}, donc ${k2 + 2}x = ${(k2 + 2) * x} et x = ${x}.`,
          })
        },
      )
    }),
  ],
  [
    // Équation produit nul
    () => retry(() => {
      const p = randNonZero(-9, 9), q = randNonZero(-9, 9)
      if (p === q) return null
      const expl = { explanation: `Un produit est nul si l'un de ses facteurs est nul : x = ${fmt(p)} ou x = ${fmt(q)}.` }
      return oneOf(
        () => solutionSet(`Résous : (${xPlus(-p)})(${xPlus(-q)}) = 0`, [p, q], expl),
        () => solutionSet(`Résous : x(${xPlus(-p)}) = 0`, [0, p], { explanation: `Un produit est nul si l'un de ses facteurs est nul : x = 0 ou ${xPlus(-p)} = 0, soit x = ${fmt(p)}.` }),
        () => solutionSet(`Résous : (${poly([p, ''], [-1, 'x'])})(${xPlus(-q)}) = 0`, [p, q], {
          explanation: `${poly([p, ''], [-1, 'x'])} = 0 donne x = ${fmt(p)} ; ${xPlus(-q)} = 0 donne x = ${fmt(q)}.`,
        }),
        () => {
          const r = randNonZero(-9, 9)
          if (r === p || r === q) return null
          return solutionSet(`Résous : (${xPlus(-p)})(${xPlus(-q)})(${xPlus(-r)}) = 0`, [p, q, r], {
            explanation: `Un produit est nul si l'un de ses facteurs est nul : x = ${fmt(p)}, x = ${fmt(q)} ou x = ${fmt(r)}.`,
          })
        },
      )
    }),
    // Produit nul avec un coefficient
    () => retry(() => {
      const a = randInt(2, 5), p = randNonZero(-6, 6) * a, q = randNonZero(-8, 8)
      if (q === p / a) return null
      const f1 = `${a}x ${p < 0 ? '+' : '−'} ${Math.abs(p)}`
      return oneOf(
        () => solutionSet(`Résous : (${f1})(${xPlus(-q)}) = 0`, [p / a, q], { explanation: `${a}x = ${fmt(p)} donne x = ${fmt(p / a)} ; l'autre facteur donne x = ${fmt(q)}.` }),
        () => solutionSet(`Résous : (${xPlus(-q)})(${f1}) = 0`, [p / a, q], { explanation: `${xPlus(-q)} = 0 donne x = ${fmt(q)} ; ${f1} = 0 donne ${a}x = ${fmt(p)}, x = ${fmt(p / a)}.` }),
        () => retry(() => {
          const b = randInt(2, 4), s = randNonZero(-5, 5) * b
          if (s / b === p / a) return null
          return solutionSet(`Résous : (${f1})(${b}x ${s < 0 ? '+' : '−'} ${Math.abs(s)}) = 0`, [p / a, s / b], {
            explanation: `${a}x = ${fmt(p)} donne x = ${fmt(p / a)} ; ${b}x = ${fmt(s)} donne x = ${fmt(s / b)}.`,
          })
        }),
        () => solutionSet(`Résous : ${a}x(${xPlus(-q)}) = 0`, [0, q], { explanation: `${a}x = 0 donne x = 0 ; ${xPlus(-q)} = 0 donne x = ${fmt(q)}.` }),
      )
    }),
    // Inéquation : diviser par un négatif
    () => {
      const a = pick([-6, -5, -4, -3, -2, 2, 3, 4, 5, 6]), v = randInt(-5, 5), b = randInt(-9, 9), r = pick(RELS)
      const neg = a < 0, rr = neg ? flip(r) : r
      const expl = {
        explanation: neg
          ? `${poly([a, 'x'])} ${r} ${fmt(a * v)} ; on divise par ${fmt(a)} < 0 : le sens de l'inégalité change, x ${rr} ${fmt(v)}.`
          : `${poly([a, 'x'])} ${r} ${fmt(a * v)}, on divise par ${a} > 0 : x ${r} ${fmt(v)}.`,
      }
      return oneOf(
        () => interval(`Résous ${poly([a, 'x'], [b, ''])} ${r} ${fmt(a * v + b)} et donne l'ensemble des solutions sous forme d'intervalle.`, relInterval(rr, v), expl),
        () => interval(`Résous ${poly([b, ''], [a, 'x'])} ${r} ${fmt(a * v + b)} et donne l'ensemble des solutions sous forme d'intervalle.`, relInterval(rr, v), expl),
        () => interval(`Résous ${fmt(a * v + b)} ${flip(r)} ${poly([a, 'x'], [b, ''])} et donne l'ensemble des solutions sous forme d'intervalle.`, relInterval(rr, v), expl),
        () => {
          const A = -Math.abs(a), RR = flip(r)
          return interval(`Résous ${poly([A, 'x'])} ${r} ${fmt(A * v)} (réponse sous forme d'intervalle).`, relInterval(RR, v), {
            explanation: `On divise par ${fmt(A)} < 0 : le sens de l'inégalité change, x ${RR} ${fmt(v)}.`,
          })
        },
      )
    },
    // Équations à fractions
    () => retry(() => {
      const a = randNonZero(-6, 6), c = randNonZero(-6, 6), b = randInt(2, 6), d = randInt(2, 6)
      if (b === d || a === c) return null
      const N = b * c - d * a, D = d - b
      const expl = { explanation: `Produits en croix : ${d}(${xPlus(a)}) = ${b}(${xPlus(c)}), soit ${poly([d, 'x'], [d * a, ''])} = ${poly([b, 'x'], [b * c, ''])}, donc ${poly([D, 'x'])} = ${fmt(N)} et x = ${fracText(N, D)}.` }
      return oneOf(
        () => fraction(`Résous : ${F(xPlus(a), b)} = ${F(xPlus(c), d)}. x = ?`, N, D, expl),
        () => fraction(`Résous : ${F(xPlus(a), b)} − ${F(xPlus(c), d)} = 0. x = ?`, N, D, { explanation: `C'est ${F(xPlus(a), b)} = ${F(xPlus(c), d)}. ${expl.explanation}` }),
        () => fraction(`Résous : ${F(xPlus(a), b)} = ${F('x', d)}. x = ?`, -d * a, d - b, {
          explanation: `Produits en croix : ${d}(${xPlus(a)}) = ${b}x, soit ${poly([d - b, 'x'])} = ${fmt(-d * a)}, donc x = ${fracText(-d * a, d - b)}.`,
        }),
        () => {
          if (b * c - d * a === 0) return null
          return fraction(`Résous : ${F(b, xPlus(a))} = ${F(d, xPlus(c))} (avec x ≠ ${fmt(-a)} et x ≠ ${fmt(-c)}). x = ?`, d * a - b * c, b - d, {
            explanation: `Produits en croix : ${b}(${xPlus(c)}) = ${d}(${xPlus(a)}), soit ${poly([b - d, 'x'])} = ${fmt(d * a - b * c)}, donc x = ${fracText(d * a - b * c, b - d)}.`,
          })
        },
      )
    }),
    // x² = ax : ne pas diviser par x
    () => {
      const a = pick([-9, -8, -7, -6, -5, -4, -3, -2, 2, 3, 4, 5, 6, 7, 8, 9]), k = randInt(2, 5)
      return oneOf(
        () => solutionSet(`Résous : x² = ${poly([a, 'x'])}`, [0, a], {
          explanation: `x² − ${par(a)}x = 0, soit x(${xPlus(-a)}) = 0 : x = 0 ou x = ${fmt(a)}. (Ne divise pas par x : tu perdrais la solution 0 !)`,
        }),
        () => solutionSet(`Résous : ${poly([k, 'x²'], [-k * a, 'x'])} = 0`, [0, a], { explanation: `On factorise : ${k}x(${xPlus(-a)}) = 0, donc x = 0 ou x = ${fmt(a)}.` }),
        () => solutionSet(`Résous : ${poly([k, 'x²'])} = ${poly([k * a, 'x'])}`, [0, a], {
          explanation: `${poly([k, 'x²'], [-k * a, 'x'])} = 0, soit ${k}x(${xPlus(-a)}) = 0 : x = 0 ou x = ${fmt(a)}.`,
        }),
        () => {
          const A = Math.abs(a), W: Record<number, string> = { 2: 'double', 3: 'triple', 4: 'quadruple', 5: 'quintuple' }
          return A > 5
            ? solutionSet(`Le carré d'un nombre est égal à ${A} fois ce nombre. Quels sont les nombres possibles ?`, [0, A], { explanation: `x² = ${A}x ⇔ x(x − ${A}) = 0 ⇔ x = 0 ou x = ${A}.` })
            : solutionSet(`Le carré d'un nombre est égal à son ${W[A]}. Quels sont les nombres possibles ?`, [0, A], { explanation: `x² = ${A}x ⇔ x(x − ${A}) = 0 ⇔ x = 0 ou x = ${A}.` })
        },
      )
    },
  ],
  [
    // Inéquations : x des deux côtés
    () => retry(() => {
      const a = randNonZero(-6, 6), c = randNonZero(-6, 6), b = randInt(-9, 9), v = randInt(-6, 6), r = pick(RELS)
      if (a === c) return null
      const d = (a - c) * v + b, k = a - c, rr = k < 0 ? flip(r) : r
      const tailExpl = `${k < 0 ? ` ; on divise par ${fmt(k)} < 0, le sens change` : k === 1 ? '' : ` ; on divise par ${k} > 0`} : x ${rr} ${fmt(v)}.`
      return oneOf(
        () => interval(`Résous ${poly([a, 'x'], [b, ''])} ${r} ${poly([c, 'x'], [d, ''])} (réponse sous forme d'intervalle).`, relInterval(rr, v), {
          explanation: `On regroupe les x à gauche : ${poly([k, 'x'])} ${r} ${fmt(d - b)}${tailExpl}`,
        }),
        () => interval(`Résous ${poly([b, ''], [a, 'x'])} ${r} ${poly([d, ''], [c, 'x'])} (réponse sous forme d'intervalle).`, relInterval(rr, v), {
          explanation: `On regroupe les x à gauche : ${poly([k, 'x'])} ${r} ${fmt(d - b)}${tailExpl}`,
        }),
        () => {
          const m = randInt(2, 3)
          const A = randNonZero(-3, 3), B = randNonZero(-4, 4), D2 = m * (A * v + B) - c * v
          if (m * A === c) return null
          const K = m * A - c, R2 = K < 0 ? flip(r) : r
          return interval(`Résous ${m}(${xPlus(B, A)}) ${r} ${poly([c, 'x'], [D2, ''])} (réponse sous forme d'intervalle).`, relInterval(R2, v), {
            explanation: `On développe : ${poly([m * A, 'x'], [m * B, ''])} ${r} ${poly([c, 'x'], [D2, ''])}, puis ${poly([K, 'x'])} ${r} ${fmt(D2 - m * B)}${K < 0 ? ` ; on divise par ${fmt(K)} < 0, le sens change` : K === 1 ? '' : ` ; on divise par ${K} > 0`} : x ${R2} ${fmt(v)}.`,
          })
        },
      )
    }),
    // Solution exacte avec une racine
    () => retry(() => {
      const k = randInt(1, 5), m = pick(SQUAREFREE), N = k * k * m
      if (N > 200) return null
      const c = randInt(2, 4), s = randInt(2, 20)
      const expl = { explanation: `On obtient x² = ${N}, donc x = √{${N}} ou x = −√{${N}} ; la solution positive est √{${N}} = ${rt(k, m)}.` }
      return oneOf(
        () => radical(`Résous x² = ${N}. Donne la solution positive sous la forme a√b.`, k, m, expl),
        () => radical(`Résous ${c}x² = ${c * N}. Donne la solution positive sous la forme a√b.`, k, m, expl),
        () => radical(`Résous x² + ${s} = ${N + s}. Donne la solution positive sous la forme a√b.`, k, m, expl),
        () => radical(`Un carré a une aire de ${N} cm². Donne la valeur exacte de son côté x (en cm) sous la forme a√b, en résolvant x² = ${N}.`, k, m, {
          explanation: `x² = ${N} et x > 0 (c'est une longueur) : x = √{${N}} = ${rt(k, m)}.`,
        }),
      )
    }),
    // Problèmes de périmètre
    () => {
      const x = randInt(3, 20), d = randInt(2, 9), what = pick(['Un enclos', 'Un potager', 'Un terrain de volley', 'Une salle du château', 'Un tapis'])
      return oneOf(
        () => numeric(`${what} rectangulaire a une longueur égale à sa largeur + ${d} m. Son périmètre vaut ${2 * (2 * x + d)} m. Quelle est sa largeur (en m) ?`, x, {
          explanation: `2(x + x + ${d}) = ${2 * (2 * x + d)}, soit 4x + ${2 * d} = ${2 * (2 * x + d)} et x = ${x}.`,
        }),
        () => {
          const k = randInt(2, 4)
          return numeric(`${what} rectangulaire est ${k === 2 ? 'deux' : k === 3 ? 'trois' : 'quatre'} fois plus long que large. Son périmètre vaut ${2 * (k + 1) * x} m. Quelle est sa largeur (en m) ?`, x, {
            explanation: `2(x + ${k}x) = ${2 * (k + 1)}x = ${2 * (k + 1) * x}, donc x = ${x}.`,
          })
        },
        () => numeric(`Un triangle isocèle a une base qui mesure ${d} cm de plus que chacun des deux autres côtés. Son périmètre vaut ${3 * x + d} cm. Combien mesure chacun des deux côtés égaux (en cm) ?`, x, {
          explanation: `x + x + (x + ${d}) = 3x + ${d} = ${3 * x + d}, donc 3x = ${3 * x} et x = ${x}.`,
        }),
        () => numeric(`${what} rectangulaire a une longueur égale à sa largeur + ${d} m. Son périmètre vaut ${2 * (2 * x + d)} m. Quelle est sa longueur (en m) ?`, x + d, {
          explanation: `2(x + x + ${d}) = ${2 * (2 * x + d)} donne 4x = ${4 * x}, largeur x = ${x}, donc longueur ${x} + ${d} = ${x + d}.`,
        }),
      )
    },
    // Entiers consécutifs
    () => {
      const c = randInt(3, 5), n = randInt(5, 40), s = c * n + (c * (c - 1)) / 2
      const terms = Array.from({ length: c }, (_, i) => (i === 0 ? 'n' : `(n + ${i})`)).join(' + ')
      const expl = `${terms} = ${c}n + ${(c * (c - 1)) / 2} = ${s}, donc ${c}n = ${c * n} et n = ${n}`
      return oneOf(
        () => numeric(`La somme de ${c} nombres entiers consécutifs vaut ${s}. Quel est le plus petit ?`, n, { explanation: `${expl}.` }),
        () => numeric(`La somme de ${c} nombres entiers consécutifs vaut ${s}. Quel est le plus grand ?`, n + c - 1, { explanation: `${expl} ; le plus grand est ${n} + ${c - 1} = ${n + c - 1}.` }),
        () => {
          const m = 2 * randInt(3, 20), S = 3 * m + 6
          return numeric(`La somme de trois nombres pairs consécutifs vaut ${S}. Quel est le plus petit ?`, m, {
            explanation: `n + (n + 2) + (n + 4) = 3n + 6 = ${S}, donc 3n = ${3 * m} et n = ${m}.`,
          })
        },
        () => {
          const p = 3 * n + 3
          return numeric(`${prenom()} lit un roman en trois jours, en lisant chaque jour un chapitre de plus que la veille. Au total, ${p} chapitres sont lus. Combien de chapitres ont été lus le premier jour ?`, n, {
            explanation: `n + (n + 1) + (n + 2) = 3n + 3 = ${p}, donc 3n = ${3 * n} et n = ${n}.`,
          })
        },
      )
    },
    // Problèmes d'âges
    () => {
      const P = pick([{ n: 'sa mère', il: 'elle' }, { n: 'son père', il: 'il' }, { n: 'sa tante', il: 'elle' }, { n: 'son oncle', il: 'il' }])
      const who = prenom(), a = randInt(4, 14), t = randInt(2, 15), k = pick([2, 3])
      return oneOf(
        () => {
          const p = k === 2 ? 2 * a + t : 3 * a + 2 * t
          return numeric(`${who} a ${a} ans et ${P.n} a ${p} ans. Dans combien d'années ${P.n} aura-t-${P.il} exactement le ${k === 2 ? 'double' : 'triple'} de l'âge ${de(who)} ?`, t, {
            explanation: `Dans t ans : ${p} + t = ${k}(${a} + t), soit ${p} + t = ${k * a} + ${k}t, donc ${k - 1 === 1 ? 't' : `${k - 1}t`} = ${p - k * a} et t = ${t}.`,
          })
        },
        () => {
          const T = randInt(2, a - 1), p = k * (a - T) + T
          return numeric(`${who} a ${a} ans et ${P.n} a ${p} ans. Il y a combien d'années ${P.n} avait-${P.il} exactement le ${k === 2 ? 'double' : 'triple'} de l'âge ${de(who)} ?`, T, {
            explanation: `Il y a t ans : ${p} − t = ${k}(${a} − t), soit ${p} − t = ${k * a} − ${k}t, donc ${k - 1 === 1 ? 't' : `${k - 1}t`} = ${k * a - p} et t = ${T}.`,
          })
        },
        () => {
          const d = randInt(20, 35), S = 2 * a + d
          const art: Record<string, string> = { 'sa mère': 'La mère', 'son père': 'Le père', 'sa tante': 'La tante', 'son oncle': 'L’oncle' }
          return numeric(`${art[P.n]} ${de(who)} a ${d} ans de plus que ${who}. La somme de leurs deux âges vaut ${S} ans. Quel est l'âge ${de(who)} ?`, a, {
            explanation: `x + (x + ${d}) = ${S}, soit 2x = ${S - d} et x = ${a}.`,
          })
        },
      )
    },
  ],
  [
    // Factoriser pour résoudre
    () => retry(() => {
      const a = randNonZero(-6, 6), P = `(${xPlus(a)})`
      return oneOf(
        () => {
          const s = randInt(2, 6), r = randNonZero(-5, 5), b = randInt(1, s - 1), d = s - b, c = randNonZero(-6, 6), e = -s * r - c
          if (e === 0 || Math.abs(e) > 12 || r === -a) return null
          return solutionSet(`Résous : ${P}(${xPlus(c, b)}) + ${P}(${xPlus(e, d)}) = 0`, [-a, r], {
            explanation: `On factorise par ${P} : ${P}(${xPlus(c + e, s)}) = 0, donc x = ${fmt(-a)} ou x = ${fmt(r)}.`,
          })
        },
        () => {
          const c = randInt(1, 8)
          if (c === Math.abs(a)) return null
          return solutionSet(`Résous : ${P}² − ${c * c} = 0`, [-a - c, -a + c], {
            explanation: `${P}² − ${c}² = (${xPlus(a - c)})(${xPlus(a + c)}) = 0, donc x = ${fmt(c - a)} ou x = ${fmt(-c - a)}.`,
          })
        },
        () => {
          const r = randNonZero(-5, 5)
          if (r === -a) return null
          return solutionSet(`Résous : ${P}² = ${P}(${xPlus(a - r, 2)})`, [-a, r], {
            explanation: `On passe tout à gauche et on factorise par ${P} : ${P}[${P} − (${xPlus(a - r, 2)})] = ${P}(${xPlus(r, -1)}) = 0, donc x = ${fmt(-a)} ou x = ${fmt(r)}.`,
          })
        },
        () => {
          const r = randNonZero(-5, 5), k = randInt(2, 4)
          if (r === -a) return null
          return solutionSet(`Résous : ${k}x${P} ${r < 0 ? '+' : '−'} ${Math.abs(k * r)}${P} = 0`, [-a, r], {
            explanation: `Facteur commun ${P} : ${P}(${poly([k, 'x'], [-k * r, ''])}) = 0 ; ${poly([k, 'x'], [-k * r, ''])} = 0 donne x = ${fmt(r)}, et ${P} = 0 donne x = ${fmt(-a)}.`,
          })
        },
      )
    }),
    // A² = B²
    () => retry(() => {
      const k = pick([2, 3]), a = randNonZero(-8, 8), b = randNonZero(-8, 8)
      return oneOf(
        () => {
          if ((a - b) % (k - 1) || (a + b) % (k + 1)) return null
          const s1 = (a - b) / (k - 1), s2 = -(a + b) / (k + 1)
          if (s1 === s2) return null
          return solutionSet(`Résous : (${xPlus(a)})² = (${xPlus(b, k)})²`, [s1, s2], {
            explanation: `A² = B² ⇔ A = B ou A = −B. ${xPlus(a)} = ${xPlus(b, k)} donne x = ${fmt(s1)} ; ${xPlus(a)} = ${poly([-k, 'x'], [-b, ''])} donne x = ${fmt(s2)}.`,
          })
        },
        () => {
          const c = randInt(1, 9)
          return solutionSet(`Résous : (${xPlus(a)})² = ${c * c}`, [-a - c, -a + c], {
            explanation: `${xPlus(a)} = ${c} ou ${xPlus(a)} = −${c}, donc x = ${fmt(c - a)} ou x = ${fmt(-c - a)}.`,
          })
        },
        () => {
          if ((a - b) % (k - 1) || (a + b) % (k + 1)) return null
          const s1 = (a - b) / (k - 1), s2 = -(a + b) / (k + 1)
          if (s1 === s2) return null
          return solutionSet(`Résous : (${xPlus(a)})² − (${xPlus(b, k)})² = 0`, [s1, s2], {
            explanation: `C'est A² = B², soit A = B ou A = −B. ${xPlus(a)} = ${xPlus(b, k)} donne x = ${fmt(s1)} ; ${xPlus(a)} = ${poly([-k, 'x'], [-b, ''])} donne x = ${fmt(s2)}.`,
          })
        },
        () => {
          const c = randInt(1, 9), s1 = (c - b) / k, s2 = (-c - b) / k
          if (!Number.isInteger(s1) || !Number.isInteger(s2)) return null
          return solutionSet(`Résous : (${xPlus(b, k)})² = ${c * c}`, [s1, s2], {
            explanation: `${xPlus(b, k)} = ${c} ou ${xPlus(b, k)} = −${c}, donc x = ${fmt(s1)} ou x = ${fmt(s2)}.`,
          })
        },
      )
    }),
    // Inéquations à fractions
    () => retry(() => {
      const b = randInt(2, 6), d = randInt(2, 6), u = randNonZero(-9, 9), w = randNonZero(-9, 9), r = pick(RELS)
      if (b === d) return null
      const K = d - b, R = b * w - d * u
      return oneOf(
        () => {
          if (R % K) return null
          const v = R / K, rr = K < 0 ? flip(r) : r
          return interval(`Résous : ${F(xPlus(u), b)} ${r} ${F(xPlus(w), d)} (réponse sous forme d'intervalle).`, relInterval(rr, v), {
            explanation: `On multiplie par ${b * d} > 0 : ${d}(${xPlus(u)}) ${r} ${b}(${xPlus(w)}), soit ${poly([K, 'x'])} ${r} ${fmt(R)}${K < 0 ? ` ; on divise par ${fmt(K)} < 0, le sens change` : ''} : x ${rr} ${fmt(v)}.`,
          })
        },
        () => {
          const c = randInt(-5, 5)
          return interval(`Résous : ${F(xPlus(u), b)} ${r} ${fmt(c)} (réponse sous forme d'intervalle).`, relInterval(r, b * c - u), {
            explanation: `On multiplie par ${b} > 0 : ${xPlus(u)} ${r} ${fmt(b * c)}, donc x ${r} ${fmt(b * c - u)}.`,
          })
        },
        () => {
          if (u % (b - 1)) return null
          const v = u / (b - 1), rr = flip(r)
          return interval(`Résous : ${F(xPlus(u), b)} ${r} x (réponse sous forme d'intervalle).`, relInterval(rr, v), {
            explanation: `On multiplie par ${b} > 0 : ${xPlus(u)} ${r} ${b}x, donc ${fmt(u)} ${r} ${b - 1 === 1 ? 'x' : `${b - 1}x`}, soit x ${rr} ${fmt(v)}.`,
          })
        },
      )
    }),
    // Comparer deux tarifs
    () => {
      const ctx = pick([
        { lieu: 'À la piscine', u: 'séance' }, { lieu: 'Au cinéma', u: 'séance' }, { lieu: 'Au club d’escalade', u: 'séance' },
        { lieu: 'À la salle d’armes du château', u: 'leçon' }, { lieu: 'Au centre équestre', u: 'promenade' },
      ])
      const pa = randInt(5, 12), pb = randInt(1, pa - 2), Fx = randInt(4, 24) * 5, diff = pa - pb, q = Fx / diff
      const qText = Number.isInteger(q) ? fmt(q) : `${F(Fx, diff)} ≈ ${fmt(Math.round(q * 10) / 10)}`
      const intro = `${ctx.lieu}, formule A : ${pa} € la ${ctx.u}. Formule B : un abonnement de ${Fx} € puis ${pb} € la ${ctx.u}.`
      return oneOf(
        () => numeric(`${intro} À partir de combien de ${ctx.u}s la formule B est-elle strictement moins chère ?`, Math.floor(q) + 1, {
          explanation: `B moins chère ⇔ ${Fx} + ${term(pb, 'n', true)} < ${pa}n ⇔ ${diff}n > ${Fx} ⇔ n > ${qText}. Le plus petit entier qui convient est ${Math.floor(q) + 1}.`,
        }),
        () => numeric(`${intro} Jusqu'à combien de ${ctx.u}s (au maximum) la formule A reste-t-elle moins chère ou au même prix ?`, Math.floor(q), {
          explanation: `A moins chère ou égale ⇔ ${pa}n ≤ ${Fx} + ${term(pb, 'n', true)} ⇔ ${diff}n ≤ ${Fx} ⇔ n ≤ ${qText}. Le plus grand entier qui convient est ${Math.floor(q)}.`,
        }),
        () => {
          const n = randInt(2, 30), A = pa * n, B = Fx + pb * n
          return numeric(`${intro} Pour ${n} ${ctx.u}s, quelle est la différence de prix entre les deux formules (en €, prix de A − prix de B) ?`, A - B, {
            explanation: `A : ${pa} × ${n} = ${A} € ; B : ${Fx} + ${pb} × ${n} = ${B} € ; différence : ${A} − ${B} = ${fmt(A - B)} €.`,
          })
        },
      )
    },
    // Équations « géométriques » du second degré
    () => {
      const a = randInt(2, 8), k = randInt(a + 1, a + 12), what = pick(['plaque de métal', 'feuille de parchemin', 'planche', 'nappe'])
      return oneOf(
        () => {
          const R = k * k - a * a
          return numeric(`Dans une ${what} carrée de côté x cm, on découpe un carré de ${a} cm de côté. Il reste ${R} cm². Que vaut x (en cm) ?`, k, {
            explanation: `x² − ${a * a} = ${R}, donc x² = ${k * k} ; x est une longueur, donc positive : x = ${k}.`,
          })
        },
        () => numeric(`On allonge de ${a} cm le côté d'une ${what} carrée de côté x cm : sa nouvelle aire vaut ${(k + a) ** 2} cm². Que vaut x (en cm) ?`, k, {
          explanation: `(x + ${a})² = ${(k + a) ** 2}, donc x + ${a} = ${k + a} (une longueur est positive) et x = ${k}.`,
        }),
        () => numeric(`Une ${what} carrée de côté x cm est entourée d'une bordure de ${a} cm de large. L'ensemble forme un carré d'aire ${(k + 2 * a) ** 2} cm². Que vaut x (en cm) ?`, k, {
          explanation: `(x + ${2 * a})² = ${(k + 2 * a) ** 2}, donc x + ${2 * a} = ${k + 2 * a} (positif) et x = ${k}.`,
        }),
      )
    },
  ],
]

// ── Fonctions ───────────────────────────────────────────────────────────
const fct: Tiers = [
  [
    // Image par une fonction affine
    () => {
      const a = randNonZero(-6, 6), b = randNonZero(-10, 10), x = randNonZero(-6, 6), y = a * x + b
      const expl = { explanation: `On remplace x par ${par(x)} : ${fmt(a)} × ${par(x)}${tail(b)} = ${sumText([a * x, b])} = ${fmt(y)}.` }
      return oneOf(
        () => numeric(`f(x) = ${poly([a, 'x'], [b, ''])}. Calcule f(${fmt(x)}).`, y, expl),
        () => numeric(`On considère la fonction f : x ↦ ${poly([b, ''], [a, 'x'])}. Quelle est l'image de ${fmt(x)} par f ?`, y, expl),
        () => numeric(`Une fonction f associe à tout nombre x le nombre obtenu en le multipliant par ${fmt(a)} puis en ${b > 0 ? `ajoutant ${b}` : `retirant ${-b}`}. Que vaut f(${fmt(x)}) ?`, y, expl),
        () => {
          const p = randInt(3, 15), q = randInt(2, 9), n = randInt(2, 12)
          return numeric(`Le prix (en €) de n entrées au parc est donné par la fonction P(n) = ${p}n + ${q}. Calcule P(${n}).`, p * n + q, {
            explanation: `P(${n}) = ${p} × ${n} + ${q} = ${p * n} + ${q} = ${p * n + q} €.`,
          })
        },
      )
    },
    // Image avec des parenthèses
    () => retry(() => {
      const a = pick([-6, -5, -4, -3, -2, 2, 3, 4, 5, 6]), b = randNonZero(-6, 6), c = randNonZero(-5, 6)
      if (c === b) return null
      return oneOf(
        () => numeric(`f(x) = ${fmt(a)}(${xPlus(-b)}). Calcule f(${fmt(c)}).`, a * (c - b), {
          explanation: `f(${fmt(c)}) = ${fmt(a)} × (${fmt(c)} − ${par(b)}) = ${fmt(a)} × ${par(c - b)} = ${fmt(a * (c - b))}.`,
        }),
        () => numeric(`g(x) = (${xPlus(-b)}) × ${par(a)}. Quelle est l'image de ${fmt(c)} par g ?`, a * (c - b), {
          explanation: `g(${fmt(c)}) = (${fmt(c)} − ${par(b)}) × ${par(a)} = ${par(c - b)} × ${par(a)} = ${fmt(a * (c - b))}.`,
        }),
        () => numeric(`h(x) = x(${xPlus(-b)}). Calcule h(${fmt(c)}).`, c * (c - b), {
          explanation: `h(${fmt(c)}) = ${fmt(c)} × (${fmt(c)} − ${par(b)}) = ${fmt(c)} × ${par(c - b)} = ${fmt(c * (c - b))}.`,
        }),
        () => {
          const d = randNonZero(-5, 5)
          return numeric(`f(x) = ${fmt(a)}(${xPlus(-b)})${tail(d)}. Calcule f(${fmt(c)}).`, a * (c - b) + d, {
            explanation: `f(${fmt(c)}) = ${fmt(a)} × ${par(c - b)}${tail(d)} = ${fmt(a * (c - b))}${tail(d)} = ${fmt(a * (c - b) + d)} (la multiplication d'abord).`,
          })
        },
      )
    }),
    // Antécédent par une fonction linéaire
    () => {
      const a = pick([-9, -7, -5, -4, -3, -2, 2, 3, 4, 5, 6, 7, 8, 9]), v = randNonZero(-9, 9), y = a * v
      const expl = { explanation: `On cherche x tel que ${poly([a, 'x'])} = ${fmt(y)} : x = ${fmt(y)} ÷ ${par(a)} = ${fmt(v)}.` }
      return oneOf(
        () => numeric(`f(x) = ${poly([a, 'x'])}. Quel est l'antécédent de ${fmt(y)} par f ?`, v, expl),
        () => numeric(`f(x) = ${poly([a, 'x'])}. Résous l'équation f(x) = ${fmt(y)}.`, v, expl),
        () => numeric(`La fonction f : x ↦ ${poly([a, 'x'])} prend la valeur ${fmt(y)} pour une seule valeur de x. Laquelle ?`, v, expl),
        () => {
          const p = randInt(2, 9), n = randInt(2, 12)
          return numeric(`Les pommes coûtent ${p} € le kilo : le prix de x kg est f(x) = ${p}x. Quelle masse de pommes (en kg) obtient-on pour ${p * n} € ?`, n, {
            explanation: `On cherche l'antécédent de ${p * n} : ${p}x = ${p * n}, donc x = ${n} kg.`,
          })
        },
      )
    },
    // Tableau de valeurs (fresh : la lecture directe reste rare, et un calcul ne doit pas tomber sur un nombre du tableau)
    fresh(() => {
      const xs = new Set<number>()
      while (xs.size < 4) xs.add(randNonZero(-5, 6))
      const X = [...xs].sort((a, b) => a - b)
      const ys = new Set<number>()
      while (ys.size < 4) ys.add(randNonZero(-15, 15))
      const Y = [...ys], i = randInt(0, 3), j = (i + randInt(1, 3)) % 4
      const intro = `Voici un tableau de valeurs d'une fonction f : pour x = ${X.map(fmt).join(' ; ')}, on a respectivement f(x) = ${Y.map(fmt).join(' ; ')}.`
      return oneOf(
        () => pick([true, false])
          ? numeric(`${intro} Quelle est l'image de ${fmt(X[i])} par f ?`, Y[i], { explanation: `On lit la valeur associée à x = ${fmt(X[i])} : f(${fmt(X[i])}) = ${fmt(Y[i])}.` })
          : numeric(`${intro} Quel est l'antécédent de ${fmt(Y[i])} par f ?`, X[i], { explanation: `On cherche x tel que f(x) = ${fmt(Y[i])} : c'est x = ${fmt(X[i])}.` }),
        () => numeric(`${intro} Calcule f(${fmt(X[i])}) + f(${fmt(X[j])}).`, Y[i] + Y[j], {
          explanation: `On lit f(${fmt(X[i])}) = ${fmt(Y[i])} et f(${fmt(X[j])}) = ${fmt(Y[j])}, puis ${fmt(Y[i])} + ${par(Y[j])} = ${fmt(Y[i] + Y[j])}.`,
        }),
        () => numeric(`${intro} Calcule f(${fmt(X[i])}) − f(${fmt(X[j])}).`, Y[i] - Y[j], {
          explanation: `On lit f(${fmt(X[i])}) = ${fmt(Y[i])} et f(${fmt(X[j])}) = ${fmt(Y[j])}, puis ${fmt(Y[i])} − ${par(Y[j])} = ${fmt(Y[i] - Y[j])}.`,
        }),
        () => {
          const k = randInt(2, 4), c = randNonZero(-7, 7)
          return numeric(`${intro} On pose g(x) = ${k}f(x)${tail(c)}. Calcule g(${fmt(X[i])}).`, k * Y[i] + c, {
            explanation: `On lit f(${fmt(X[i])}) = ${fmt(Y[i])}, puis g(${fmt(X[i])}) = ${k} × ${par(Y[i])}${tail(c)} = ${fmt(k * Y[i] + c)}.`,
          })
        },
        () => {
          const a = randNonZero(-4, 4), b = randInt(-6, 6), k = randInt(5, 9)
          return numeric(`f est une fonction affine. Pour x = 0 ; 1 ; 2 ; 3, elle prend respectivement les valeurs ${[0, 1, 2, 3].map((t) => fmt(a * t + b)).join(' ; ')}. Que vaut f(${k}) ?`, a * k + b, {
            explanation: `Quand x augmente de 1, f(x) ${a > 0 ? 'augmente' : 'diminue'} de ${Math.abs(a)} ; pour x = 0, f vaut ${fmt(b)}, donc f(x) = ${poly([a, 'x'], [b, ''])} et f(${k}) = ${fmt(a * k + b)}.`,
          })
        },
        () => {
          const a = pick([-5, -4, -3, -2, 2, 3, 4, 5]), b = randNonZero(-9, 9), Z = [-3, -1, 2, 4], m = randInt(0, 3)
          const cells = Z.map((t, n) => (n === m ? '…' : fmt(a * t + b))).join(' ; ')
          return numeric(`On complète un tableau de valeurs de f(x) = ${poly([a, 'x'], [b, ''])} : pour x = −3 ; −1 ; 2 ; 4, f(x) = ${cells}. Quel nombre manque ?`, a * Z[m] + b, {
            explanation: `La case manquante correspond à x = ${fmt(Z[m])} : f(${fmt(Z[m])}) = ${sumText([a * Z[m], b])} = ${fmt(a * Z[m] + b)}.`,
          })
        },
      )
    }),
    // Fonction carré
    () => retry(() => {
      const k = randInt(2, 15)
      if (k % 10 === 0) return null
      const x = (k / 10) * pick([1, -1]), v = r2(x * x)
      return oneOf(
        () => numeric(`f est la fonction carré : f(x) = x². Calcule f(${fmt(x)}).`, v, { explanation: `f(${fmt(x)}) = ${par(x)}² = ${fmt(v)} (un carré est toujours positif).` }),
        () => {
          const n = randInt(2, 12)
          return numeric(`Quelle est l'image de −${n} par la fonction carré ?`, n * n, { explanation: `(−${n})² = (−${n}) × (−${n}) = ${n * n} : attention, ce n'est pas −${n * n} !` })
        },
        () => {
          const n = randInt(2, 12)
          return solutionSet(`Quels sont les antécédents de ${n * n} par la fonction carré ?`, [-n, n], { explanation: `x² = ${n * n} pour x = ${n} et pour x = −${n}.` })
        },
        () => retry(() => {
          const p = randInt(1, 7), q = randInt(2, 9)
          if (gcd(p, q) !== 1) return null
          return fraction(`f(x) = x². Calcule f(${F(p, q)}).`, p * p, q * q, { explanation: `(${F(p, q)})² = ${F(`${p}²`, `${q}²`)} = ${F(p * p, q * q)}.` })
        }),
      )
    }),
  ],
  [
    // Polynômes du second degré en un nombre négatif
    () => {
      const a = randInt(-5, 5), b = randInt(-9, 9), x = randInt(-5, -1)
      return oneOf(
        () => {
          const v = x * x + a * x + b
          return numeric(`f(x) = ${poly([1, 'x²'], [a, 'x'], [b, ''])}. Calcule f(${fmt(x)}).`, v, { explanation: `Attention : (${fmt(x)})² = ${x * x}. f(${fmt(x)}) = ${sumText([x * x, a * x, b])} = ${fmt(v)}.` })
        },
        () => {
          const v = -x * x + a * x + b
          return numeric(`g(x) = ${poly([-1, 'x²'], [a, 'x'], [b, ''])}. Calcule g(${fmt(x)}).`, v, {
            explanation: `−x² = −(x²) : −(${fmt(x)})² = −${x * x}. g(${fmt(x)}) = ${sumText([-x * x, a * x, b])} = ${fmt(v)}.`,
          })
        },
        () => {
          const c = randInt(2, 3), v = c * x * x + b
          return numeric(`h(x) = ${poly([c, 'x²'], [b, ''])}. Quelle est l'image de ${fmt(x)} par h ?`, v, { explanation: `On calcule d'abord le carré : ${c} × ${x * x} = ${c * x * x}, puis ${sumText([c * x * x, b])} = ${fmt(v)}.` })
        },
        () => {
          const v = x * (x + a)
          return numeric(`f(x) = x(${xPlus(a)}). Calcule f(${fmt(x)}).`, v, { explanation: `f(${fmt(x)}) = ${par(x)} × ${par(x + a)} = ${fmt(v)}.` })
        },
      )
    },
    // Fonctions rationnelles simples
    () => retry(() => {
      const k = randInt(1, 6), b = randInt(1, 6), x = randNonZero(-3, 6)
      if (x + b === 0) return null
      return oneOf(
        () => fraction(`f(x) = ${F(k, `x + ${b}`)}. Calcule f(${fmt(x)}).`, k, x + b, { explanation: `f(${fmt(x)}) = ${k} ÷ (${fmt(x)} + ${b}) = ${k} ÷ ${par(x + b)} = ${fracText(k, x + b)}.` }),
        () => fraction(`f(x) = ${F(k, 'x')} + ${b}. Calcule f(${fmt(x)}).`, k + b * x, x, { explanation: `f(${fmt(x)}) = ${F(k, par(x))} + ${b} = ${fracText(k, x)} + ${b} = ${fracText(k + b * x, x)}.` }),
        () => {
          if (x - k === 0) return null
          return fraction(`f(x) = ${F(`x − ${k}`, `x + ${b}`)}. Calcule f(${fmt(x)}).`, x - k, x + b, { explanation: `f(${fmt(x)}) = ${F(`${fmt(x)} − ${k}`, `${fmt(x)} + ${b}`)} = ${F(fmt(x - k), fmt(x + b))} = ${fracText(x - k, x + b)}.` })
        },
        () => fraction(`Quelle est l'image de ${fmt(x)} par la fonction g : x ↦ ${F(k, `x + ${b}`)} ?`, k, x + b, { explanation: `g(${fmt(x)}) = ${F(k, `${fmt(x)} + ${b}`)} = ${F(k, fmt(x + b))} = ${fracText(k, x + b)}.` }),
      )
    }),
    // Fonctions linéaires
    () => {
      const k = randNonZero(-6, 6), a = randNonZero(-5, 5)
      return oneOf(
        () => expression(`f est une fonction linéaire telle que f(${fmt(a)}) = ${fmt(k * a)}. Donne l'expression de f(x).`, poly([k, 'x']), 'any', {
          inputHint: 'ex. 3x', explanation: `f(x) = ax avec a = ${fmt(k * a)} ÷ ${par(a)} = ${fmt(k)}.`,
        }),
        () => {
          const c = randNonZero(-6, 6)
          return numeric(`f est une fonction linéaire telle que f(${fmt(a)}) = ${fmt(k * a)}. Calcule f(${fmt(c)}).`, k * c, {
            explanation: `f(x) = ax avec a = ${fmt(k * a)} ÷ ${par(a)} = ${fmt(k)}, donc f(${fmt(c)}) = ${fmt(k)} × ${par(c)} = ${fmt(k * c)}.`,
          })
        },
        () => {
          const p = randInt(2, 9), q = randInt(2, 6)
          return expression(`${q} kg de cerises coûtent ${p * q} €. Le prix est proportionnel à la masse : exprime le prix f(x) (en €) de x kg.`, poly([p, 'x']), 'any', {
            inputHint: 'ex. 3x', explanation: `Prix d'un kilo : ${p * q} ÷ ${q} = ${p} €, donc f(x) = ${p}x (fonction linéaire).`,
          })
        },
        () => numeric(`La droite représentant une fonction linéaire f passe par le point (${fmt(a)} ; ${fmt(k * a)}). Quel est le coefficient de f ?`, k, {
          explanation: `f(x) = ax et f(${fmt(a)}) = ${fmt(k * a)}, donc a = ${fmt(k * a)} ÷ ${par(a)} = ${fmt(k)}.`,
        }),
      )
    },
    // Fonction inverse
    () => retry(() => {
      const p = randNonZero(-9, 9), q = randInt(2, 9)
      if (gcd(Math.abs(p), q) !== 1) return null
      return oneOf(
        () => fraction(`f est la fonction inverse : f(x) = ${F(1, 'x')}. Calcule f(${F(fmt(p), q)}).`, q, p, { explanation: `f(${fracText(p, q)}) = 1 ÷ ${fracText(p, q)} = ${fracText(q, p)} : on renverse la fraction.` }),
        () => {
          const [d, v] = pick([[0.5, 2], [0.25, 4], [0.2, 5], [0.1, 10], [-0.5, -2], [-0.25, -4], [2.5, 0.4], [1.25, 0.8]])
          return numeric(`Quelle est l'image de ${fmt(d)} par la fonction inverse ?`, v, { explanation: `${F(1, fmt(d))} = ${fmt(v)} (car ${fmt(d)} × ${fmt(v)} = 1).` })
        },
        () => fraction(`Quel est l'antécédent de ${F(fmt(p), q)} par la fonction inverse x ↦ ${F(1, 'x')} ?`, q, p, {
          explanation: `On cherche x tel que ${F(1, 'x')} = ${fracText(p, q)}, donc x = ${F(1, fracText(p, q))} = ${fracText(q, p)}.`,
        }),
        () => retry(() => {
          const m = randInt(2, 6), n = randInt(2, 7)
          if (m === n) return null
          return fraction(`f(x) = ${F(1, 'x')}. Calcule f(${m}) + f(${n}).`, m + n, m * n, { explanation: `${F(1, m)} + ${F(1, n)} = ${F(n, m * n)} + ${F(m, m * n)} = ${F(m + n, m * n)}${gcd(m + n, m * n) > 1 ? ` = ${fracText(m + n, m * n)}` : ''}.` })
        }),
      )
    }),
    // Où f s'annule
    () => {
      const a = pick([-8, -7, -6, -5, -4, -3, -2, 2, 3, 4, 5, 6, 7, 8]), b = randNonZero(-12, 12)
      const expl = { explanation: `${poly([a, 'x'], [b, ''])} = 0 ⇔ ${poly([a, 'x'])} = ${fmt(-b)}, donc x = ${F(fmt(-b), fmt(a))} = ${fracText(-b, a)}.` }
      return oneOf(
        () => fraction(`f(x) = ${poly([a, 'x'], [b, ''])}. Pour quelle valeur de x a-t-on f(x) = 0 ?`, -b, a, expl),
        () => fraction(`f(x) = ${poly([a, 'x'], [b, ''])}. Quel est l'antécédent de 0 par f ?`, -b, a, expl),
        () => fraction(`La droite représentant f(x) = ${poly([b, ''], [a, 'x'])} coupe l'axe des abscisses en un point. Quelle est l'abscisse de ce point ?`, -b, a, expl),
        () => {
          const c = randNonZero(-9, 9)
          if (c === b) return null
          return fraction(`f(x) = ${poly([a, 'x'], [b, ''])}. Pour quelle valeur de x a-t-on f(x) = ${fmt(c)} ?`, c - b, a, {
            explanation: `${poly([a, 'x'], [b, ''])} = ${fmt(c)} ⇔ ${poly([a, 'x'])} = ${fmt(c - b)}, donc x = ${fracText(c - b, a)}.`,
          })
        },
      )
    },
    // Formes factorisées
    () => retry(() => {
      const a = randNonZero(-6, 6), b = randNonZero(-6, 6), c = randNonZero(-5, 5)
      if (c === a || c === -b) return null
      return oneOf(
        () => numeric(`f(x) = (${xPlus(-a)})(${xPlus(b)}). Calcule f(${fmt(c)}).`, (c - a) * (c + b), {
          explanation: `f(${fmt(c)}) = (${fmt(c)} − ${par(a)})(${fmt(c)} + ${par(b)}) = ${par(c - a)} × ${par(c + b)} = ${fmt((c - a) * (c + b))}.`,
        }),
        () => numeric(`f(x) = (${xPlus(-a)})². Calcule f(${fmt(c)}).`, (c - a) ** 2, { explanation: `f(${fmt(c)}) = (${fmt(c)} − ${par(a)})² = ${par(c - a)}² = ${(c - a) ** 2}.` }),
        () => {
          const k = randInt(2, 3)
          return numeric(`g(x) = (${xPlus(b, k)})(${xPlus(-a)}). Quelle est l'image de ${fmt(c)} par g ?`, (k * c + b) * (c - a), {
            explanation: `g(${fmt(c)}) = (${k} × ${par(c)} + ${par(b)})(${fmt(c)} − ${par(a)}) = ${par(k * c + b)} × ${par(c - a)} = ${fmt((k * c + b) * (c - a))}.`,
          })
        },
        () => numeric(`f(x) = (${xPlus(-a)})(${xPlus(b)}). Calcule f(${fmt(-b)}).`, 0, {
          explanation: `En x = ${fmt(-b)}, le facteur ${xPlus(b)} vaut 0, donc le produit est nul : f(${fmt(-b)}) = 0.`,
        }),
      )
    }),
  ],
  [
    // Antécédent par une fonction affine
    () => {
      const a = randNonZero(-6, 6), b = randInt(-10, 10), y = randInt(-12, 12)
      const expl = { explanation: `On résout ${poly([a, 'x'], [b, ''])} = ${fmt(y)} : ${poly([a, 'x'])} = ${fmt(y - b)}, x = ${fracText(y - b, a)}.` }
      return oneOf(
        () => fraction(`f(x) = ${poly([a, 'x'], [b, ''])}. Quel est l'antécédent de ${fmt(y)} par f ?`, y - b, a, expl),
        () => fraction(`f(x) = ${poly([a, 'x'], [b, ''])}. Résous l'équation f(x) = ${fmt(y)}.`, y - b, a, expl),
        () => fraction(`Le point M de la droite d'équation y = ${poly([a, 'x'], [b, ''])} a pour ordonnée ${fmt(y)}. Quelle est son abscisse ?`, y - b, a, expl),
        () => fraction(`f : x ↦ ${poly([b, ''], [a, 'x'])}. Quel nombre a pour image ${fmt(y)} ?`, y - b, a, expl),
      )
    },
    // Images plus techniques
    () => {
      const a = randInt(2, 4), b = randNonZero(-5, 5), x = randNonZero(-4, 4)
      return oneOf(
        () => {
          const v = a * x * x + b * x - 1
          return numeric(`f(x) = ${poly([a, 'x²'], [b, 'x'], [-1, ''])}. Calcule f(${fmt(x)}).`, v, { explanation: `${a} × ${par(x)}² = ${a * x * x}, puis ${sumText([a * x * x, b * x, -1])} = ${fmt(v)}.` })
        },
        () => {
          const c = randNonZero(-6, 6), v = a * (x - b) ** 2 + c
          return numeric(`f(x) = ${a}(${xPlus(-b)})²${tail(c)}. Calcule f(${fmt(x)}).`, v, {
            explanation: `(${fmt(x)} − ${par(b)})² = ${par(x - b)}² = ${(x - b) ** 2}, puis ${a} × ${(x - b) ** 2}${tail(c)} = ${fmt(v)}.`,
          })
        },
        () => {
          const v = -a * x * x + b
          return numeric(`g(x) = ${poly([-a, 'x²'], [b, ''])}. Calcule g(${fmt(x)}).`, v, { explanation: `On élève au carré avant de multiplier : −${a} × ${x * x}${tail(b)} = ${fmt(v)}.` })
        },
        () => {
          const v = (x + b) * (a * x - 1)
          return numeric(`h(x) = (${xPlus(b)})(${a}x − 1). Calcule h(${fmt(x)}).`, v, {
            explanation: `h(${fmt(x)}) = (${fmt(x)} + ${par(b)})(${a} × ${par(x)} − 1) = ${par(x + b)} × ${par(a * x - 1)} = ${fmt(v)}.`,
          })
        },
      )
    },
    // Extremums d'une fonction affine
    () => retry(() => {
      const m = randNonZero(-5, 5), p = randInt(-8, 8), a = randInt(-5, 1), b = a + randInt(2, 6)
      if (a === 0 || b === 0) return null
      const fa = m * a + p, fb = m * b + p
      const sens = `Le coefficient ${fmt(m)} est ${m > 0 ? 'positif : f est croissante' : 'négatif : f est décroissante'}`
      return oneOf(
        () => {
          const max = pick([true, false]), at = (m > 0) === max ? b : a
          if (at === 0) return null
          return numeric(`f(x) = ${poly([m, 'x'], [p, ''])}. Quel est le ${max ? 'maximum' : 'minimum'} de f sur l'intervalle [${fmt(a)} ; ${fmt(b)}] ?`, m * at + p, {
            explanation: `${sens}, donc le ${max ? 'maximum' : 'minimum'} est atteint en x = ${fmt(at)} : f(${fmt(at)}) = ${fmt(m * at + p)}.`,
          })
        },
        () => interval(`f(x) = ${poly([m, 'x'], [p, ''])}. On sait que ${fmt(a)} ≤ x ≤ ${fmt(b)}. Donne l'intervalle auquel appartient f(x).`, { lo: Math.min(fa, fb), hi: Math.max(fa, fb), loClosed: true, hiClosed: true }, {
          explanation: `${sens} : f(${fmt(a)}) = ${fmt(fa)} et f(${fmt(b)}) = ${fmt(fb)}, donc f(x) est entre ${fmt(Math.min(fa, fb))} et ${fmt(Math.max(fa, fb))}.`,
        }),
        () => numeric(`f(x) = ${poly([m, 'x'], [p, ''])}. De combien f(x) varie-t-il quand x passe de ${fmt(a)} à ${fmt(b)} ? (réponse signée)`, fb - fa, {
          explanation: `f(${fmt(b)}) − f(${fmt(a)}) = ${fmt(m)} × (${fmt(b)} − ${par(a)}) = ${fmt(m)} × ${b - a} = ${fmt(fb - fa)}.`,
        }),
      )
    }),
    // Retrouver un paramètre
    () => {
      const x0 = randNonZero(-4, 4)
      return oneOf(
        () => {
          const a = randNonZero(-6, 6), p = randNonZero(-9, 9), y0 = a * x0 + p
          return numeric(`f(x) = ax${tail(p)} et f(${fmt(x0)}) = ${fmt(y0)}. Que vaut a ?`, a, {
            explanation: `a × ${par(x0)}${tail(p)} = ${fmt(y0)}, donc a × ${par(x0)} = ${fmt(y0 - p)} et a = ${fmt(a)}.`,
          })
        },
        () => {
          const k = randInt(1, 3), c = randNonZero(-9, 9), y0 = k * x0 * x0 + c
          return numeric(`f(x) = ${poly([k, 'x²'])} + c et f(${fmt(x0)}) = ${fmt(y0)}. Que vaut c ?`, c, {
            explanation: `${poly([k, 'x²'])} en x = ${fmt(x0)} vaut ${k * x0 * x0}, donc c = ${fmt(y0)} − ${k * x0 * x0} = ${fmt(c)}.`,
          })
        },
        () => {
          const m = randNonZero(-5, 5), b = randNonZero(-9, 9), y0 = m * x0 + b
          return numeric(`f(x) = ${poly([m, 'x'])} + b et la courbe de f passe par le point (${fmt(x0)} ; ${fmt(y0)}). Que vaut b ?`, b, {
            explanation: `${fmt(m)} × ${par(x0)} + b = ${fmt(y0)}, donc b = ${fmt(y0)} − ${par(m * x0)} = ${fmt(b)}.`,
          })
        },
        () => {
          const k = randNonZero(-12, 12), d = pick([1, 2, 3, 4, 6].filter((v) => k % v === 0))
          return numeric(`f(x) = ${F('k', 'x')} et f(${d}) = ${fmt(k / d)}. Que vaut k ?`, k, { explanation: `${F('k', d)} = ${fmt(k / d)}, donc k = ${fmt(k / d)} × ${d} = ${fmt(k)}.` })
        },
      )
    },
    // Fonctions de référence sur un intervalle
    () => {
      const lo = randInt(0, 5), hi = lo + randInt(1, 6)
      return oneOf(
        () => interval(`On sait que ${lo} ≤ x ≤ ${hi}. Donne l'intervalle auquel appartient x².`, { lo: lo * lo, hi: hi * hi, loClosed: true, hiClosed: true }, {
          explanation: `La fonction carré est croissante sur [0 ; +∞[ : l'ordre est conservé, ${lo}² ≤ x² ≤ ${hi}².`,
        }),
        () => interval(`x est un nombre négatif tel que ${fmt(-hi)} ≤ x ≤ ${fmt(-lo)}. Donne l'intervalle auquel appartient x².`, { lo: lo * lo, hi: hi * hi, loClosed: true, hiClosed: true }, {
          explanation: `La fonction carré est décroissante sur ]−∞ ; 0] : l'ordre s'inverse, ${par(-lo)}² ≤ x² ≤ ${par(-hi)}², soit ${lo * lo} ≤ x² ≤ ${hi * hi}.`,
        }),
        () => interval(`On sait que ${lo * lo} ≤ x ≤ ${hi * hi}. Donne l'intervalle auquel appartient √x.`, { lo, hi, loClosed: true, hiClosed: true }, {
          explanation: `La fonction racine carrée est croissante sur [0 ; +∞[ : √{${lo * lo}} ≤ √x ≤ √{${hi * hi}}, soit ${lo} ≤ √x ≤ ${hi}.`,
        }),
        () => {
          const a = randInt(1, 3), b = randInt(1, 3)
          return interval(`On sait que −${a} ≤ x ≤ ${b}. Donne l'intervalle auquel appartient x³.`, { lo: -(a ** 3), hi: b ** 3, loClosed: true, hiClosed: true }, {
            explanation: `La fonction cube est croissante sur ℝ : l'ordre est conservé, (−${a})³ ≤ x³ ≤ ${b}³, soit ${fmt(-(a ** 3))} ≤ x³ ≤ ${b ** 3}.`,
          })
        },
      )
    },
  ],
  [
    // Antécédents par la fonction carré décalée
    () => {
      const k = randInt(1, 9), c = randInt(-5, 5)
      return oneOf(
        () => solutionSet(`f(x) = ${poly([1, 'x²'], [c, ''])}. Trouve tous les antécédents de ${fmt(k * k + c)} par f.`, [-k, k], { explanation: `x² = ${fmt(k * k + c)} − ${par(c)} = ${k * k}, donc x = ${k} ou x = −${k}.` }),
        () => solutionSet(`f(x) = x² − ${k * k}. Pour quelles valeurs de x a-t-on f(x) = 0 ?`, [-k, k], { explanation: `x² − ${k * k} = 0 ⇔ x² = ${k * k} ⇔ x = ${k} ou x = −${k}.` }),
        () => {
          const a = randInt(2, 4)
          return solutionSet(`f(x) = ${poly([a, 'x²'], [c, ''])}. Résous f(x) = ${fmt(a * k * k + c)}.`, [-k, k], { explanation: `${a}x² = ${fmt(a * k * k)}, donc x² = ${k * k} et x = ${k} ou x = −${k}.` })
        },
        () => solutionSet(`La courbe de f(x) = ${poly([1, 'x²'], [c, ''])} coupe la droite horizontale d'équation y = ${fmt(k * k + c)} en deux points. Quelles sont leurs abscisses ?`, [-k, k], {
          explanation: `On résout x² ${c === 0 ? '' : `${c < 0 ? '−' : '+'} ${Math.abs(c)} `}= ${fmt(k * k + c)} : x² = ${k * k}, donc x = ${k} ou x = −${k}.`,
        }),
      )
    },
    // (x − a)² = k²
    () => {
      const a = randNonZero(-5, 5), k = randInt(1, 6), S = [a - k, a + k]
      const expl = { explanation: `${xPlus(-a)} = ${k} ou ${xPlus(-a)} = −${k}, donc x = ${fmt(a + k)} ou x = ${fmt(a - k)}.` }
      return oneOf(
        () => solutionSet(`f(x) = (${xPlus(-a)})². Trouve tous les antécédents de ${k * k} par f.`, S, expl),
        () => solutionSet(`f(x) = (${xPlus(-a)})². Résous f(x) = ${k * k}.`, S, expl),
        () => {
          const c = randNonZero(-6, 6)
          return solutionSet(`f(x) = (${xPlus(-a)})²${tail(c)}. Trouve tous les antécédents de ${fmt(k * k + c)} par f.`, S, { explanation: `(${xPlus(-a)})² = ${k * k}. ${expl.explanation}` })
        },
        () => solutionSet(`La parabole d'équation y = (${xPlus(-a)})² coupe la droite y = ${k * k} en deux points. Quelles sont leurs abscisses ?`, S, expl),
      )
    },
    // Égalité de deux fonctions affines
    () => retry(() => {
      const a = randInt(2, 6), b = randNonZero(-8, 8), c = randInt(1, a - 1), x = randNonZero(-6, 6), d = (a - c) * x + b
      const expl = { explanation: `${poly([a, 'x'], [b, ''])} = ${poly([c, 'x'], [d, ''])} ⇔ ${poly([a - c, 'x'])} = ${fmt(d)} − ${par(b)} = ${fmt(d - b)}, donc x = ${fmt(x)}.` }
      return oneOf(
        () => numeric(`f(x) = ${poly([a, 'x'], [b, ''])} et g(x) = ${poly([c, 'x'], [d, ''])}. Pour quelle valeur de x a-t-on f(x) = g(x) ?`, x, expl),
        () => numeric(`Les droites représentant f(x) = ${poly([a, 'x'], [b, ''])} et g(x) = ${poly([c, 'x'], [d, ''])} se coupent en un point. Quelle est son abscisse ?`, x, expl),
        () => numeric(`f(x) = ${poly([a, 'x'], [b, ''])} et g(x) = ${poly([c, 'x'], [d, ''])}. Quelle est l'ordonnée du point d'intersection de leurs courbes ?`, a * x + b, {
          explanation: `${expl.explanation} L'ordonnée vaut f(${fmt(x)}) = ${fmt(a * x + b)}.`,
        }),
        () => {
          const H1 = randInt(20, 30), r1 = randInt(3, 5), r2_ = randInt(1, r1 - 1), t = randInt(2, 6), H2 = H1 - (r1 - r2_) * t
          if (H2 < 5) return null
          return numeric(`Une bougie de ${H1} cm raccourcit de ${r1} cm par heure ; une autre de ${H2} cm raccourcit de ${r2_} cm par heure. Au bout de combien d'heures auront-elles la même hauteur ?`, t, {
            explanation: `${H1} − ${r1}t = ${H2} − ${r2_}t ⇔ ${term(r1 - r2_, 't', true)} = ${H1 - H2} ⇔ t = ${t} h.`,
          })
        },
      )
    }),
    // Carré sur un intervalle contenant 0
    () => retry(() => {
      const a = randInt(1, 8), b = randInt(1, 8)
      if (a === b) return null
      const M = Math.max(a, b), far = a > b ? -a : b
      return oneOf(
        () => interval(`On sait que ${fmt(-a)} ≤ x ≤ ${b}. Donne l'intervalle auquel appartient x².`, { lo: 0, hi: M * M, loClosed: true, hiClosed: true }, {
          explanation: `L'intervalle contient 0, où x² vaut 0 (son minimum) ; le maximum est atteint à la borne la plus éloignée de 0 : ${par(far)}² = ${M * M}.`,
        }),
        () => numeric(`f(x) = x² sur l'intervalle [${fmt(-a)} ; ${b}]. Quel est le maximum de f ?`, M * M, {
          explanation: `Le maximum de x² est atteint à la borne la plus éloignée de 0 : ${par(far)}² = ${M * M}.`,
        }),
        () => {
          const c = randNonZero(-6, 6)
          return numeric(`f(x) = x²${tail(c)} sur l'intervalle [${fmt(-a)} ; ${b}]. Quel est le minimum de f ?`, c, {
            explanation: `0 est dans l'intervalle et x² ≥ 0, avec x² = 0 pour x = 0 : le minimum vaut 0${tail(c)} = ${fmt(c)}.`,
          })
        },
        () => {
          const c = randNonZero(-6, 6)
          return interval(`On sait que ${fmt(-a)} ≤ x ≤ ${b}. Donne l'intervalle auquel appartient x²${tail(c)}.`, { lo: c, hi: M * M + c, loClosed: true, hiClosed: true }, {
            explanation: `x² est entre 0 (en x = 0) et ${M * M} (en x = ${fmt(far)}), donc x²${tail(c)} est entre ${fmt(c)} et ${fmt(M * M + c)}.`,
          })
        },
      )
    }),
    // Fonction inverse sur un intervalle
    () => {
      const S = [0.2, 0.25, 0.5, 1, 2, 4, 5, 10]
      const i = randInt(0, S.length - 2), j = randInt(i + 1, S.length - 1), neg = pick([true, false])
      const lo = neg ? -S[j] : S[i], hi = neg ? -S[i] : S[j]
      return oneOf(
        () => interval(`On sait que ${fmt(lo)} ≤ x ≤ ${fmt(hi)}. Donne l'intervalle auquel appartient ${F(1, 'x')}.`, { lo: 1 / hi, hi: 1 / lo, loClosed: true, hiClosed: true }, {
          explanation: `La fonction inverse est décroissante sur ${neg ? ']−∞ ; 0[' : ']0 ; +∞['} : l'ordre s'inverse, ${F(1, fmt(hi))} ≤ ${F(1, 'x')} ≤ ${F(1, fmt(lo))}, soit ${fmt(1 / hi)} ≤ ${F(1, 'x')} ≤ ${fmt(1 / lo)}.`,
        }),
        () => numeric(`f(x) = ${F(1, 'x')} sur l'intervalle [${fmt(S[i])} ; ${fmt(S[j])}]. Quel est le maximum de f ?`, 1 / S[i], {
          explanation: `La fonction inverse est décroissante sur ]0 ; +∞[ : le maximum est atteint à la plus petite borne, f(${fmt(S[i])}) = ${fmt(1 / S[i])}.`,
        }),
        () => {
          const a = S[randInt(2, S.length - 1)]
          return interval(`On sait que x ≥ ${fmt(a)}. Donne l'intervalle auquel appartient ${F(1, 'x')}.`, { lo: 0, hi: 1 / a, loClosed: false, hiClosed: true }, {
            explanation: `x ≥ ${fmt(a)} > 0 et la fonction inverse est décroissante sur ]0 ; +∞[ : 0 < ${F(1, 'x')} ≤ ${F(1, fmt(a))} = ${fmt(1 / a)}.`,
          })
        },
        () => {
          const c = randInt(1, 5)
          return interval(`On sait que ${fmt(S[i])} ≤ x ≤ ${fmt(S[j])}. Donne l'intervalle auquel appartient ${F(1, 'x')} + ${c}.`, { lo: 1 / S[j] + c, hi: 1 / S[i] + c, loClosed: true, hiClosed: true }, {
            explanation: `L'ordre s'inverse : ${fmt(1 / S[j])} ≤ ${F(1, 'x')} ≤ ${fmt(1 / S[i])}, puis on ajoute ${c} : ${fmt(1 / S[j] + c)} ≤ ${F(1, 'x')} + ${c} ≤ ${fmt(1 / S[i] + c)}.`,
          })
        },
      )
    },
    // Tarifs affines
    () => {
      const ctx = pick([
        { qui: 'Un taxi', var: 'un trajet de x km', q: 'Quelle distance (en km) parcourt-on', u: 'km' },
        { qui: 'Un loueur de barques', var: 'x heures de location', q: 'Combien d’heures loue-t-on une barque', u: 'heures' },
        { qui: 'Une imprimerie', var: 'x affiches', q: 'Combien d’affiches obtient-on', u: 'affiches' },
        { qui: 'Un passeur sur le fleuve', var: 'x tonneaux transportés', q: 'Combien de tonneaux fait-on passer', u: 'tonneaux' },
      ])
      const b = pick([0.5, 1, 1.5, 2, 2.5, 3]), a = randInt(2, 8), x = randInt(3, 30), P = b * x + a
      const intro = `${ctx.qui} : le prix (en €) pour ${ctx.var} est f(x) = ${poly([b, 'x'], [a, ''])}.`
      return oneOf(
        () => numeric(`${intro} ${ctx.q} pour ${fmt(P)} € ?`, x, {
          explanation: `On cherche l'antécédent de ${fmt(P)} : ${poly([b, 'x'], [a, ''])} = ${fmt(P)}, donc ${poly([b, 'x'])} = ${fmt(P - a)} et x = ${x}.`,
        }),
        () => {
          const budget = r2(P + b * randInt(0, 1) + (b > 0.5 ? 0.25 : 0.1))
          const n = Math.floor((budget - a) / b + 1e-9)
          return numeric(`${intro} Avec un budget de ${fmt(budget)} €, quel est le nombre maximal de ${ctx.u} (nombre entier) ?`, n, {
            explanation: `${poly([b, 'x'], [a, ''])} ≤ ${fmt(budget)} ⇔ ${poly([b, 'x'])} ≤ ${fmt(r2(budget - a))} ⇔ x ≤ ${fmt(r2((budget - a) / b))} : au maximum ${n}.`,
          })
        },
        () => {
          const y = randInt(3, 30)
          return numeric(`${intro} Quel est le prix (en €) pour ${y} ${ctx.u} ?`, b * y + a, { explanation: `f(${y}) = ${fmt(b)} × ${y} + ${a} = ${fmt(b * y + a)} €.` })
        },
      )
    },
  ],
  [
    // Fonction affine définie par deux valeurs
    () => retry(() => {
      const m = randNonZero(-4, 4), p = randNonZero(-6, 6), x1 = randNonZero(-3, 2), x2 = x1 + randInt(1, 4)
      if (x2 === 0) return null
      const y1 = m * x1 + p, y2 = m * x2 + p
      const opts = {
        inputHint: 'ex. 2x − 3',
        explanation: `a = (${fmt(y2)} − ${par(y1)}) ÷ (${fmt(x2)} − ${par(x1)}) = ${fmt(m)}, puis b = ${fmt(y1)} − ${par(m)} × ${par(x1)} = ${fmt(p)}.`,
      }
      return oneOf(
        () => expression(`f est une fonction affine avec f(${fmt(x1)}) = ${fmt(y1)} et f(${fmt(x2)}) = ${fmt(y2)}. Donne l'expression de f(x).`, poly([m, 'x'], [p, '']), 'any', opts),
        () => expression(`La courbe d'une fonction affine f passe par les points A(${fmt(x1)} ; ${fmt(y1)}) et B(${fmt(x2)} ; ${fmt(y2)}). Donne l'expression de f(x).`, poly([m, 'x'], [p, '']), 'any', opts),
        () => {
          const x3 = x2 + randInt(1, 3)
          if (x3 === 0) return null
          return numeric(`f est une fonction affine avec f(${fmt(x1)}) = ${fmt(y1)} et f(${fmt(x2)}) = ${fmt(y2)}. Calcule f(${fmt(x3)}).`, m * x3 + p, {
            explanation: `${opts.explanation} Donc f(${fmt(x3)}) = ${fmt(m)} × ${par(x3)}${tail(p)} = ${fmt(m * x3 + p)}.`,
          })
        },
        () => {
          const d1 = randInt(2, 6), d2 = d1 + randInt(2, 6), pr = pick([0.5, 1, 1.5, 2]), base = randInt(2, 6)
          return expression(`Un taxi facture ${fmt(base + pr * d1)} € pour ${d1} km et ${fmt(base + pr * d2)} € pour ${d2} km. Le prix est une fonction affine f de la distance x (en km). Donne f(x).`, poly([pr, 'x'], [base, '']), 'any', {
            inputHint: 'ex. 1,5x + 4',
            explanation: `a = (${fmt(base + pr * d2)} − ${fmt(base + pr * d1)}) ÷ (${d2} − ${d1}) = ${fmt(pr)} € par km, puis b = ${fmt(base + pr * d1)} − ${fmt(pr)} × ${d1} = ${base} € de prise en charge.`,
          })
        },
      )
    }),
    // Mouvement d'un projectile
    () => {
      const v = pick([10, 15, 20, 25, 30]), [what, il] = pick([['d’une flèche', 'elle'], ['d’une balle', 'elle'], ['d’une pierre lancée par une fronde', 'elle'], ['d’un ballon', 'il'], ['d’un boulet de mangonneau', 'il']])
      const intro = `La hauteur ${what} (en m) après t secondes est h(t) = −5t² + ${v}t.`
      return oneOf(
        () => {
          const t = randInt(1, v / 5 - 1)
          return numeric(`${intro} Quelle est sa hauteur à t = ${t} s ?`, -5 * t * t + v * t, { explanation: `−5 × ${t}² + ${v} × ${t} = ${fmt(-5 * t * t)} + ${v * t} = ${-5 * t * t + v * t} m.` })
        },
        () => numeric(`${intro} Au bout de combien de secondes retombe-t-${il} au sol ?`, v / 5, { explanation: `h(t) = 0 ⇔ t(−5t + ${v}) = 0 ⇔ t = 0 (le lancer) ou t = ${v} ÷ 5 = ${fmt(v / 5)} s.` }),
        () => numeric(`${intro} La hauteur maximale est atteinte à mi-chemin entre le départ et le retour au sol. Quelle est cette hauteur maximale (en m) ?`, (v * v) / 20, {
          explanation: `Retour au sol à t = ${fmt(v / 5)} s, donc sommet à t = ${fmt(v / 10)} s : h(${fmt(v / 10)}) = −5 × ${fmt(v * v / 100)} + ${v} × ${fmt(v / 10)} = ${fmt((v * v) / 20)} m.`,
        }),
        () => retry(() => {
          const V = pick([20, 25, 30]), t1 = randInt(1, 2), t2 = V / 5 - t1
          if (t2 <= t1) return null
          const H = 5 * t1 * t2
          return solutionSet(`La hauteur ${what} (en m) après t secondes est h(t) = −5t² + ${V}t. À quels instants t (en s) est-${il} à ${H} m de hauteur ?`, [t1, t2], {
            explanation: `−5t² + ${V}t = ${H} ⇔ 5t² − ${V}t + ${H} = 0 ⇔ 5(t − ${t1})(t − ${t2}) = 0 : t = ${t1} s (en montant) ou t = ${t2} s (en descendant).`,
          })
        }),
      )
    },
    // Modéliser par une fonction affine
    () => {
      const ctx = pick([
        () => { const H = randInt(10, 30), r = randInt(1, 3); return { t: `Une bougie de ${H} cm raccourcit de ${r} cm par heure. Exprime sa hauteur f(x) (en cm) après x heures.`, a: -r, b: H } },
        () => { const H = randInt(4, 16) * 50, r = randInt(2, 8) * 5; return { t: `Un réservoir contient ${H} L et se vide de ${r} L par minute. Exprime le volume restant f(x) (en L) après x minutes.`, a: -r, b: H } },
        () => { const H = randInt(5, 20), r = randInt(2, 5); return { t: `Une plante mesure ${H} cm et grandit de ${r} cm par semaine. Exprime sa taille f(x) (en cm) après x semaines.`, a: r, b: H } },
        () => { const H = randInt(4, 20) * 5, r = randInt(1, 3) * 5; return { t: `La tirelire de ${prenom()} contient ${H} € ; chaque semaine, on y ajoute ${r} €. Exprime la somme f(x) (en €) après x semaines.`, a: r, b: H } },
        () => { const r = randInt(4, 12); return { t: `La batterie d’un téléphone est chargée à 100 % et perd ${r} % par heure. Exprime la charge f(x) (en %) après x heures.`, a: -r, b: 100 } },
        () => { const H = randInt(2, 6), r = randInt(2, 4); return { t: `Un abonnement de streaming coûte ${H} € de frais d’inscription puis ${r} € par mois. Exprime le coût total f(x) (en €) après x mois.`, a: r, b: H } },
      ])()
      return expression(ctx.t, poly([ctx.a, 'x'], [ctx.b, '']), 'any', {
        inputHint: 'ex. 20 − 2x',
        explanation: `Valeur de départ ${ctx.b}, puis ${ctx.a > 0 ? '+' : '−'} ${Math.abs(ctx.a)} par unité de temps : f(x) = ${poly([ctx.b, ''], [ctx.a, 'x'])}, une fonction affine.`,
      })
    },
    // Positions relatives de deux courbes
    () => retry(() => {
      const a = randNonZero(-5, 5), c = randNonZero(-5, 5), b = randInt(-8, 8), v = randInt(-6, 6)
      if (a === c) return null
      const d = (a - c) * v + b, strict = pick([true, false]), above = pick([true, false])
      const r: Rel = above ? (strict ? '>' : '≥') : (strict ? '<' : '≤'), k = a - c, rr = k < 0 ? flip(r) : r
      const pos = above ? (strict ? 'strictement au-dessus de' : 'au-dessus de ou sur') : (strict ? 'strictement en dessous de' : 'en dessous de ou sur')
      const solve = `${poly([k, 'x'])} ${r} ${fmt(d - b)}${k < 0 ? ` ; on divise par ${fmt(k)} < 0, le sens change` : ''} : x ${rr} ${fmt(v)}.`
      return oneOf(
        () => interval(`f(x) = ${poly([a, 'x'], [b, ''])} et g(x) = ${poly([c, 'x'], [d, ''])}. Pour quelles valeurs de x la courbe de f est-elle ${pos} celle de g ? (intervalle)`, relInterval(rr, v), {
          explanation: `On résout f(x) ${r} g(x) : ${solve}`,
        }),
        () => interval(`f(x) = ${poly([a, 'x'], [b, ''])} et g(x) = ${poly([c, 'x'], [d, ''])}. Résous l'inéquation f(x) ${r} g(x) (réponse sous forme d'intervalle).`, relInterval(rr, v), {
          explanation: `${poly([a, 'x'], [b, ''])} ${r} ${poly([c, 'x'], [d, ''])} ⇔ ${solve}`,
        }),
        () => interval(`f(x) = ${poly([a, 'x'], [b, ''])} et g(x) = ${poly([c, 'x'], [d, ''])}. Pour quelles valeurs de x a-t-on f(x) − g(x) ${r} 0 ? (intervalle)`, relInterval(rr, v), {
          explanation: `f(x) − g(x) = ${poly([k, 'x'], [b - d, ''])} ${r} 0 ⇔ ${solve}`,
        }),
      )
    }),
    // Inéquations avec un carré
    () => {
      const k = randInt(1, 9), c = randInt(-6, 6), strict = pick([true, false]), R = strict ? '<' : '≤'
      const I: Interval = { lo: -k, hi: k, loClosed: !strict, hiClosed: !strict }
      return oneOf(
        () => interval(`f(x) = ${poly([1, 'x²'], [c, ''])}. Résous f(x) ${R} ${fmt(k * k + c)} (réponse sous forme d'intervalle).`, I, {
          explanation: `x² ${R} ${k * k} : ce sont les nombres dont le carré est ${strict ? 'strictement inférieur' : 'inférieur ou égal'} à ${k * k}, donc ceux compris entre −${k} et ${k}.`,
        }),
        () => interval(`Résous x² ${R} ${k * k} (réponse sous forme d'intervalle).`, I, {
          explanation: `Les nombres dont le carré est ${strict ? 'strictement inférieur' : 'inférieur ou égal'} à ${k * k} = ${k}² sont ceux compris entre −${k} et ${k}.`,
        }),
        () => {
          const a = randNonZero(-5, 5)
          return interval(`Résous (${xPlus(-a)})² ${R} ${k * k} (réponse sous forme d'intervalle).`, { lo: a - k, hi: a + k, loClosed: !strict, hiClosed: !strict }, {
            explanation: `−${k} ${R} ${xPlus(-a)} ${R} ${k}, donc ${fmt(a - k)} ${R} x ${R} ${fmt(a + k)}.`,
          })
        },
        () => interval(`g(x) = ${poly([-1, 'x²'], [c, ''])}. Résous g(x) ${strict ? '>' : '≥'} ${fmt(c - k * k)} (réponse sous forme d'intervalle).`, I, {
          explanation: `−x² ${strict ? '>' : '≥'} −${k * k} ⇔ x² ${R} ${k * k} (on multiplie par −1, le sens change), donc x est entre −${k} et ${k}.`,
        }),
      )
    },
    // Antécédent par une fonction homographique
    () => retry(() => {
      const a = randNonZero(-12, 12), b = randInt(-5, 5), c = randInt(-5, 5)
      const divs = [1, 2, 3, 4, 6, 12].filter((d) => a % d === 0).flatMap((d) => [d, -d])
      const d = pick(divs), y = c + d, x = b + a / d
      if (Math.abs(a) < 2) return null
      const f = `${F(fmt(a), xPlus(-b))}${tail(c)}`
      const expl = { explanation: `${c === 0 ? '' : `${F(fmt(a), xPlus(-b))} = ${fmt(y)} − ${par(c)} = ${fmt(d)}, donc `}${xPlus(-b)} = ${F(fmt(a), fmt(d))} = ${fmt(a / d)}${b === 0 ? '' : ` et x = ${fmt(x)}`}.` }
      return oneOf(
        () => numeric(`f(x) = ${f}. Quel est l'antécédent de ${fmt(y)} par f ?`, x, expl),
        () => numeric(`f(x) = ${f} (avec x ≠ ${fmt(b)}). Résous l'équation f(x) = ${fmt(y)}.`, x, expl),
        () => numeric(`La courbe de f(x) = ${f} passe par un point d'ordonnée ${fmt(y)}. Quelle est son abscisse ?`, x, expl),
      )
    }),
  ],
]

// ── Vecteurs & repérage ─────────────────────────────────────────────────
const P6 = (): [number, number] => [randInt(-6, 6), randInt(-6, 6)]
const P5 = (): [number, number] => [randInt(-5, 5), randInt(-5, 5)]
const MOBILES = [
  { n: 'Un drone', il: 'il' }, { n: 'Un navire', il: 'il' }, { n: 'Une éclaireuse à cheval', il: 'elle' },
  { n: 'Une montgolfière', il: 'elle' }, { n: 'Un robot', il: 'il' }, { n: 'Une fourmi', il: 'elle' },
]

const vect: Tiers = [
  [
    // Coordonnées d'un vecteur AB
    () => {
      const [xa, ya] = P6(), [xb, yb] = P6()
      const expl = { explanation: `AB⃗(x_B − x_A ; y_B − y_A) = (${fmt(xb)} − ${par(xa)} ; ${fmt(yb)} − ${par(ya)}) = ${pt(xb - xa, yb - ya)}.` }
      return oneOf(
        () => pair(`A${pt(xa, ya)} et B${pt(xb, yb)}. Donne les coordonnées du vecteur AB⃗.`, xb - xa, yb - ya, expl),
        () => pair(`A${pt(xa, ya)} et B${pt(xb, yb)}. Donne les coordonnées du vecteur BA⃗.`, xa - xb, ya - yb, {
          explanation: `BA⃗(x_A − x_B ; y_A − y_B) = (${fmt(xa)} − ${par(xb)} ; ${fmt(ya)} − ${par(yb)}) = ${pt(xa - xb, ya - yb)} : c'est l'opposé de AB⃗.`,
        }),
        () => pair(`Donne les coordonnées du vecteur de la translation qui envoie le point A${pt(xa, ya)} sur le point B${pt(xb, yb)}.`, xb - xa, yb - ya, expl),
        () => {
          const m = pick(MOBILES)
          return pair(`${m.n} part du point A${pt(xa, ya)} et arrive au point B${pt(xb, yb)}. Donne les coordonnées du vecteur de son déplacement.`, xb - xa, yb - ya, expl)
        },
      )
    },
    // Somme de vecteurs
    () => {
      const u1 = randInt(-6, 6), u2 = randInt(-6, 6), v1 = randNonZero(-6, 6), v2 = randNonZero(-6, 6)
      const expl = { explanation: `On additionne coordonnée par coordonnée : (${sumText([u1, v1])} ; ${sumText([u2, v2])}) = ${pt(u1 + v1, u2 + v2)}.` }
      return oneOf(
        () => pair(`u⃗${pt(u1, u2)} et v⃗${pt(v1, v2)}. Donne les coordonnées de u⃗ + v⃗.`, u1 + v1, u2 + v2, expl),
        () => pair(`On pose w⃗ = u⃗ + v⃗, avec u⃗ = ${pt(u1, u2)} et v⃗ = ${pt(v1, v2)}. Quelles sont les coordonnées de w⃗ ?`, u1 + v1, u2 + v2, expl),
        () => {
          const m = pick(MOBILES)
          return pair(`${m.n} se déplace selon le vecteur u⃗${pt(u1, u2)}, puis selon le vecteur v⃗${pt(v1, v2)}. Donne les coordonnées du vecteur de son déplacement total.`, u1 + v1, u2 + v2, {
            explanation: `Déplacement total : u⃗ + v⃗. ${expl.explanation}`,
          })
        },
        () => {
          const w1 = randNonZero(-5, 5), w2 = randNonZero(-5, 5)
          return pair(`u⃗${pt(u1, u2)}, v⃗${pt(v1, v2)} et w⃗${pt(w1, w2)}. Donne les coordonnées de u⃗ + v⃗ + w⃗.`, u1 + v1 + w1, u2 + v2 + w2, {
            explanation: `(${sumText([u1, v1, w1])} ; ${sumText([u2, v2, w2])}) = ${pt(u1 + v1 + w1, u2 + v2 + w2)}.`,
          })
        },
      )
    },
    // Produit par un réel
    () => {
      const k = pick([-5, -4, -3, -2, 2, 3, 4, 5]), u1 = randInt(-6, 6), u2 = randNonZero(-6, 6)
      return oneOf(
        () => pair(`u⃗${pt(u1, u2)}. Donne les coordonnées du vecteur ${fmt(k)}u⃗.`, k * u1, k * u2, {
          explanation: `On multiplie chaque coordonnée par ${fmt(k)} : (${fmt(k)} × ${par(u1)} ; ${fmt(k)} × ${par(u2)}) = ${pt(k * u1, k * u2)}.`,
        }),
        () => pair(`u⃗${pt(u1, u2)}. Donne les coordonnées du vecteur opposé −u⃗.`, -u1, -u2, { explanation: `−u⃗ = (−1) × u⃗ : on change le signe de chaque coordonnée, ${pt(-u1, -u2)}.` }),
        () => {
          const a = 2 * randInt(-5, 5), b = 2 * randNonZero(-5, 5)
          return pair(`u⃗${pt(a, b)}. Donne les coordonnées du vecteur ${F(1, 2)}u⃗.`, a / 2, b / 2, { explanation: `On divise chaque coordonnée par 2 : ${pt(a / 2, b / 2)}.` })
        },
        () => {
          const K = Math.abs(k), m = pick(MOBILES)
          return pair(`${m.n} effectue le déplacement u⃗${pt(u1, u2)} ${K === 2 ? 'deux' : K === 3 ? 'trois' : K === 4 ? 'quatre' : 'cinq'} fois de suite. Donne les coordonnées du vecteur de son déplacement total.`, K * u1, K * u2, {
            explanation: `u⃗ + u⃗ + … = ${K}u⃗ = (${K} × ${par(u1)} ; ${K} × ${par(u2)}) = ${pt(K * u1, K * u2)}.`,
          })
        },
      )
    },
    // Différence de vecteurs
    () => {
      const u1 = randInt(-6, 6), u2 = randInt(-6, 6), v1 = randNonZero(-6, 6), v2 = randNonZero(-6, 6)
      return oneOf(
        () => pair(`u⃗${pt(u1, u2)} et v⃗${pt(v1, v2)}. Donne les coordonnées de u⃗ − v⃗.`, u1 - v1, u2 - v2, { explanation: `(${fmt(u1)} − ${par(v1)} ; ${fmt(u2)} − ${par(v2)}) = ${pt(u1 - v1, u2 - v2)}.` }),
        () => pair(`u⃗${pt(u1, u2)} et v⃗${pt(v1, v2)}. Donne les coordonnées de v⃗ − u⃗.`, v1 - u1, v2 - u2, { explanation: `(${fmt(v1)} − ${par(u1)} ; ${fmt(v2)} − ${par(u2)}) = ${pt(v1 - u1, v2 - u2)}.` }),
        () => pair(`u⃗${pt(u1, u2)} et v⃗${pt(v1, v2)}. Trouve les coordonnées du vecteur w⃗ tel que u⃗ + w⃗ = v⃗.`, v1 - u1, v2 - u2, {
          explanation: `w⃗ = v⃗ − u⃗ = (${fmt(v1)} − ${par(u1)} ; ${fmt(v2)} − ${par(u2)}) = ${pt(v1 - u1, v2 - u2)}.`,
        }),
        () => pair(`u⃗${pt(u1, u2)} et v⃗${pt(v1, v2)}. Donne les coordonnées de u⃗ + (−v⃗).`, u1 - v1, u2 - v2, { explanation: `u⃗ + (−v⃗) = u⃗ − v⃗ = ${pt(u1 - v1, u2 - v2)}.` }),
      )
    },
    // Déplacements
    () => {
      const dx = randNonZero(-7, 7), dy = randNonZero(-7, 7)
      const who = pick(['Un mangonneau', 'Un pion sur un plateau de jeu', 'Un drone', 'Le héros d’un jeu vidéo', 'Un robot aspirateur', 'Un chevalier sur la carte'])
      const move = `${plural(Math.abs(dx), 'unité')} vers la ${dx > 0 ? 'droite' : 'gauche'} et de ${plural(Math.abs(dy), 'unité')} vers le ${dy > 0 ? 'haut' : 'bas'}`
      return oneOf(
        () => pair(`${who} se déplace de ${move}. Donne les coordonnées du vecteur de ce déplacement.`, dx, dy, {
          explanation: `Vers la ${dx > 0 ? 'droite : abscisse positive' : 'gauche : abscisse négative'}, vers le ${dy > 0 ? 'haut : ordonnée positive' : 'bas : ordonnée négative'} : ${pt(dx, dy)}.`,
        }),
        () => {
          const [x0, y0] = P5()
          return pair(`${who} part du point ${pt(x0, y0)} et se déplace de ${move}. Quelles sont les coordonnées de son point d'arrivée ?`, x0 + dx, y0 + dy, {
            explanation: `Vecteur du déplacement ${pt(dx, dy)} : arrivée (${fmt(x0)} + ${par(dx)} ; ${fmt(y0)} + ${par(dy)}) = ${pt(x0 + dx, y0 + dy)}.`,
          })
        },
        () => {
          const ex = randNonZero(-5, 5)
          return pair(`${who} se déplace de ${move}, puis de ${plural(Math.abs(ex), 'unité')} vers la ${ex > 0 ? 'droite' : 'gauche'}. Donne les coordonnées du vecteur du déplacement total.`, dx + ex, dy, {
            explanation: `Abscisses : ${fmt(dx)} + ${par(ex)} = ${fmt(dx + ex)} ; ordonnée : ${fmt(dy)}. Vecteur ${pt(dx + ex, dy)}.`,
          })
        },
      )
    },
  ],
  [
    // Milieu d'un segment
    () => {
      const [xa, ya] = P6(), [xb, yb] = P6(), M: [number, number] = [(xa + xb) / 2, (ya + yb) / 2]
      const expl = { explanation: `Milieu : (${F('x_A + x_B', 2)} ; ${F('y_A + y_B', 2)}) = (${F(fmt(xa + xb), 2)} ; ${F(fmt(ya + yb), 2)}) = ${pt(M[0], M[1])}.` }
      return oneOf(
        () => pair(`A${pt(xa, ya)} et B${pt(xb, yb)}. Donne les coordonnées du milieu M de [AB].`, M[0], M[1], expl),
        () => pair(`Le cercle de diamètre [AB], avec A${pt(xa, ya)} et B${pt(xb, yb)}, a pour centre Ω. Donne les coordonnées de Ω.`, M[0], M[1], { explanation: `Le centre d'un cercle est le milieu de tout diamètre. ${expl.explanation}` }),
        () => pair(`ABCD est un parallélogramme avec A${pt(xa, ya)} et C${pt(xb, yb)}. Donne les coordonnées du point d'intersection de ses diagonales.`, M[0], M[1], {
          explanation: `Les diagonales d'un parallélogramme se coupent en leur milieu : c'est le milieu de [AC], (${F(fmt(xa + xb), 2)} ; ${F(fmt(ya + yb), 2)}) = ${pt(M[0], M[1])}.`,
        }),
        () => pair(`Deux villages sont situés en A${pt(xa, ya)} et B${pt(xb, yb)}. On construit un puits exactement à mi-chemin. Quelles sont ses coordonnées ?`, M[0], M[1], expl),
      )
    },
    // Combinaisons simples
    () => {
      const u1 = randInt(-5, 5), u2 = randInt(-5, 5), v1 = randInt(-5, 5), v2 = randInt(-5, 5), k = randInt(2, 3)
      return oneOf(
        () => pair(`u⃗${pt(u1, u2)} et v⃗${pt(v1, v2)}. Donne les coordonnées de ${k}u⃗ + v⃗.`, k * u1 + v1, k * u2 + v2, { explanation: `${k}u⃗${pt(k * u1, k * u2)}, puis on ajoute v⃗ : ${pt(k * u1 + v1, k * u2 + v2)}.` }),
        () => pair(`u⃗${pt(u1, u2)} et v⃗${pt(v1, v2)}. Donne les coordonnées de u⃗ + ${k}v⃗.`, u1 + k * v1, u2 + k * v2, { explanation: `${k}v⃗${pt(k * v1, k * v2)}, puis on ajoute u⃗ : ${pt(u1 + k * v1, u2 + k * v2)}.` }),
        () => pair(`u⃗${pt(u1, u2)} et v⃗${pt(v1, v2)}. Donne les coordonnées de ${k}u⃗ − v⃗.`, k * u1 - v1, k * u2 - v2, { explanation: `${k}u⃗${pt(k * u1, k * u2)}, puis on retire v⃗ : ${pt(k * u1 - v1, k * u2 - v2)}.` }),
        () => pair(`u⃗${pt(u1, u2)} et v⃗${pt(v1, v2)}. Donne les coordonnées de ${k}(u⃗ + v⃗).`, k * (u1 + v1), k * (u2 + v2), {
          explanation: `u⃗ + v⃗ = ${pt(u1 + v1, u2 + v2)}, puis on multiplie par ${k} : ${pt(k * (u1 + v1), k * (u2 + v2))}.`,
        }),
      )
    },
    // Translations
    () => {
      const [xa, ya] = P5(), dx = randNonZero(-4, 4), dy = randNonZero(-4, 4)
      return oneOf(
        () => pair(`A${pt(xa, ya)} et u⃗${pt(dx, dy)}. B est l'image de A par la translation de vecteur u⃗. Coordonnées de B ?`, xa + dx, ya + dy, {
          explanation: `AB⃗ = u⃗, donc B = (${fmt(xa)} + ${par(dx)} ; ${fmt(ya)} + ${par(dy)}) = ${pt(xa + dx, ya + dy)}.`,
        }),
        () => pair(`Par la translation de vecteur u⃗${pt(dx, dy)}, le point M a pour image A${pt(xa, ya)}. Donne les coordonnées de M.`, xa - dx, ya - dy, {
          explanation: `MA⃗ = u⃗, donc M = A − u⃗ = (${fmt(xa)} − ${par(dx)} ; ${fmt(ya)} − ${par(dy)}) = ${pt(xa - dx, ya - dy)}.`,
        }),
        () => pair(`On donne A${pt(xa, ya)} et u⃗${pt(dx, dy)}. Trouve les coordonnées du point B tel que AB⃗ = u⃗.`, xa + dx, ya + dy, {
          explanation: `x_B − ${par(xa)} = ${fmt(dx)} et y_B − ${par(ya)} = ${fmt(dy)}, donc B${pt(xa + dx, ya + dy)}.`,
        }),
        () => pair(`Le château est au point A${pt(xa, ya)} de la carte. On le décale selon le vecteur u⃗${pt(dx, dy)} pour dessiner un deuxième plan. Où arrive le château ?`, xa + dx, ya + dy, {
          explanation: `Image de A par la translation de vecteur u⃗ : ${pt(xa + dx, ya + dy)}.`,
        }),
      )
    },
    // Symétrique / extrémité d'un segment
    () => {
      const [xa, ya] = P6(), [xm, ym] = P5(), B: [number, number] = [2 * xm - xa, 2 * ym - ya]
      return oneOf(
        () => pair(`M${pt(xm, ym)} est le milieu de [AB], avec A${pt(xa, ya)}. Donne les coordonnées de B.`, B[0], B[1], {
          explanation: `x_M = ${F('x_A + x_B', 2)} donne x_B = 2x_M − x_A = ${fmt(2 * xm)} − ${par(xa)} = ${fmt(B[0])} ; de même y_B = ${fmt(2 * ym)} − ${par(ya)} = ${fmt(B[1])}.`,
        }),
        () => pair(`Donne les coordonnées du symétrique A′ du point A${pt(xa, ya)} par rapport au point I${pt(xm, ym)}.`, B[0], B[1], {
          explanation: `I est le milieu de [AA′], donc A′ = (2x_I − x_A ; 2y_I − y_A) = ${pt(B[0], B[1])}.`,
        }),
        () => pair(`[AB] est un diamètre d'un cercle de centre Ω${pt(xm, ym)}, avec A${pt(xa, ya)}. Donne les coordonnées de B.`, B[0], B[1], {
          explanation: `Ω est le milieu de [AB], donc B = (2 × ${par(xm)} − ${par(xa)} ; 2 × ${par(ym)} − ${par(ya)}) = ${pt(B[0], B[1])}.`,
        }),
      )
    },
    // Relation de Chasles
    () => {
      const a = randInt(-6, 6), b = randInt(-6, 6), c = randInt(-6, 6), d = randInt(-6, 6)
      return oneOf(
        () => pair(`On sait que AB⃗${pt(a, b)} et BC⃗${pt(c, d)}. Donne les coordonnées de AC⃗.`, a + c, b + d, {
          explanation: `Relation de Chasles : AC⃗ = AB⃗ + BC⃗ = (${sumText([a, c])} ; ${sumText([b, d])}) = ${pt(a + c, b + d)}.`,
        }),
        () => pair(`On sait que AC⃗${pt(a, b)} et CB⃗${pt(c, d)}. Donne les coordonnées de AB⃗.`, a + c, b + d, {
          explanation: `Relation de Chasles : AB⃗ = AC⃗ + CB⃗ = ${pt(a + c, b + d)}.`,
        }),
        () => pair(`On sait que AB⃗${pt(a, b)} et AC⃗${pt(c, d)}. Donne les coordonnées de BC⃗.`, c - a, d - b, {
          explanation: `BC⃗ = BA⃗ + AC⃗ = −AB⃗ + AC⃗ = (${fmt(c)} − ${par(a)} ; ${fmt(d)} − ${par(b)}) = ${pt(c - a, d - b)}.`,
        }),
        () => pair(`On sait que MA⃗${pt(a, b)} et AN⃗${pt(c, d)}. Donne les coordonnées de MN⃗.`, a + c, b + d, {
          explanation: `Relation de Chasles : MN⃗ = MA⃗ + AN⃗ = ${pt(a + c, b + d)}.`,
        }),
      )
    },
  ],
  [
    // Distances entières
    () => {
      const [xa, ya] = P6(), [p, q, r] = pick(TRIPLES), xb = xa + p * pick([1, -1]), yb = ya + q * pick([1, -1])
      const expl = { explanation: `AB = √{(x_B − x_A)² + (y_B − y_A)²} = √{${p}² + ${q}²} = √{${p * p + q * q}} = ${r}.` }
      return oneOf(
        () => numeric(`A${pt(xa, ya)} et B${pt(xb, yb)} dans un repère orthonormé. Calcule AB.`, r, expl),
        () => numeric(`Dans un repère orthonormé, calcule la norme du vecteur u⃗${pt(xb - xa, yb - ya)}.`, r, { explanation: `‖u⃗‖ = √{${par(xb - xa)}² + ${par(yb - ya)}²} = √{${p * p + q * q}} = ${r}.` }),
        () => numeric(`Dans un repère orthonormé, le cercle de centre A${pt(xa, ya)} passe par B${pt(xb, yb)}. Quel est son rayon ?`, r, { explanation: `Le rayon vaut AB. ${expl.explanation}` }),
        () => numeric(`Sur une carte munie d'un repère orthonormé (unité : 1 km), la tour est en A${pt(xa, ya)} et le moulin en B${pt(xb, yb)}. Quelle distance (en km, à vol d'oiseau) les sépare ?`, r, expl),
      )
    },
    // Égalité de vecteurs
    () => {
      const [xa, ya] = P5(), [xb, yb] = P5(), [xc, yc] = P5(), dx = xb - xa, dy = yb - ya
      return oneOf(
        () => pair(`A${pt(xa, ya)}, B${pt(xb, yb)} et C${pt(xc, yc)}. Donne les coordonnées du point D tel que CD⃗ = AB⃗.`, xc + dx, yc + dy, {
          explanation: `AB⃗${pt(dx, dy)}, donc D = C + AB⃗ = ${pt(xc + dx, yc + dy)}.`,
        }),
        () => pair(`A${pt(xa, ya)}, B${pt(xb, yb)} et C${pt(xc, yc)}. Donne les coordonnées du point D tel que DC⃗ = AB⃗.`, xc - dx, yc - dy, {
          explanation: `AB⃗${pt(dx, dy)} et DC⃗ = AB⃗, donc D = C − AB⃗ = ${pt(xc - dx, yc - dy)}.`,
        }),
        () => pair(`A${pt(xa, ya)}, B${pt(xb, yb)} et C${pt(xc, yc)}. Donne les coordonnées de l'image de C par la translation qui envoie A sur B.`, xc + dx, yc + dy, {
          explanation: `C'est la translation de vecteur AB⃗${pt(dx, dy)} : C′ = ${pt(xc + dx, yc + dy)}.`,
        }),
      )
    },
    // Combinaisons linéaires
    () => {
      const a = pick([2, 3, 4, -2, -3]), b = pick([-4, -3, -2, 2, 3]), u1 = randInt(-5, 5), u2 = randInt(-5, 5), v1 = randNonZero(-5, 5), v2 = randNonZero(-5, 5)
      return oneOf(
        () => pair(`u⃗${pt(u1, u2)} et v⃗${pt(v1, v2)}. Donne les coordonnées de ${fmt(a)}u⃗ ${b < 0 ? '−' : '+'} ${Math.abs(b)}v⃗.`, a * u1 + b * v1, a * u2 + b * v2, {
          explanation: `${fmt(a)}u⃗${pt(a * u1, a * u2)} et ${fmt(b)}v⃗${pt(b * v1, b * v2)}, puis on additionne : ${pt(a * u1 + b * v1, a * u2 + b * v2)}.`,
        }),
        () => pair(`u⃗${pt(u1, u2)} et v⃗${pt(v1, v2)}. Donne les coordonnées de ${fmt(a)}(u⃗ − v⃗).`, a * (u1 - v1), a * (u2 - v2), {
          explanation: `u⃗ − v⃗ = ${pt(u1 - v1, u2 - v2)}, puis on multiplie par ${fmt(a)} : ${pt(a * (u1 - v1), a * (u2 - v2))}.`,
        }),
        () => pair(`u⃗${pt(u1, u2)} et v⃗${pt(v1, v2)}. On pose w⃗ = ${fmt(b)}v⃗ + ${a < 0 ? `(${fmt(a)})` : fmt(a)}u⃗. Donne les coordonnées de w⃗.`, a * u1 + b * v1, a * u2 + b * v2, {
          explanation: `${fmt(b)}v⃗${pt(b * v1, b * v2)} et ${fmt(a)}u⃗${pt(a * u1, a * u2)} : w⃗${pt(a * u1 + b * v1, a * u2 + b * v2)}.`,
        }),
      )
    },
    // Vecteurs colinéaires : facteur
    () => {
      const k = pick([2, 3, 4, -2, -3, -4, 0.5, -0.5, 1.5, -1.5]), p = randNonZero(-3, 3), q = randNonZero(-3, 3)
      const v1 = 2 * p, v2 = 2 * q
      return oneOf(
        () => numeric(`u⃗${pt(k * v1, k * v2)} et v⃗${pt(v1, v2)}. Trouve le réel k tel que u⃗ = k v⃗.`, k, {
          explanation: `${fmt(k * v1)} = k × ${par(v1)} et ${fmt(k * v2)} = k × ${par(v2)} donnent la même valeur : k = ${fmt(k)}.`,
        }),
        () => numeric(`v⃗${pt(v1, v2)} et w⃗${pt(k * v1, k * v2)} sont colinéaires. Trouve le réel k tel que w⃗ = k v⃗.`, k, {
          explanation: `On divise les coordonnées : ${fmt(k * v1)} ÷ ${par(v1)} = ${fmt(k)} et ${fmt(k * v2)} ÷ ${par(v2)} = ${fmt(k)}, donc k = ${fmt(k)}.`,
        }),
        () => {
          const [xa, ya] = P5(), [xc, yc] = P5()
          return numeric(`A${pt(xa, ya)}, B${pt(xa + v1, ya + v2)}, C${pt(xc, yc)} et D${pt(xc + k * v1, yc + k * v2)}. Trouve le réel k tel que CD⃗ = k AB⃗.`, k, {
            explanation: `AB⃗${pt(v1, v2)} et CD⃗${pt(k * v1, k * v2)} : chaque coordonnée de CD⃗ vaut ${fmt(k)} fois celle de AB⃗, donc k = ${fmt(k)}.`,
          })
        },
      )
    },
    // Point défini par une égalité vectorielle
    () => {
      const [xa, ya] = P5(), [xb, yb] = P5(), dx = xb - xa, dy = yb - ya, k = pick([2, 3, -1, -2])
      return oneOf(
        () => pair(`A${pt(xa, ya)} et B${pt(xb, yb)}. Donne les coordonnées du point M tel que AM⃗ = ${fmt(k)}AB⃗.`, xa + k * dx, ya + k * dy, {
          explanation: `AB⃗${pt(dx, dy)}, donc AM⃗${pt(k * dx, k * dy)} et M = A + AM⃗ = ${pt(xa + k * dx, ya + k * dy)}.`,
        }),
        () => {
          const q = pick([2, 3]), Dx = q * randNonZero(-3, 3), Dy = q * randInt(-3, 3)
          return pair(`A${pt(xa, ya)} et B${pt(xa + Dx, ya + Dy)}. Donne les coordonnées du point M tel que AM⃗ = ${F(1, q)}AB⃗.`, xa + Dx / q, ya + Dy / q, {
            explanation: `AB⃗${pt(Dx, Dy)}, donc AM⃗${pt(Dx / q, Dy / q)} et M = ${pt(xa + Dx / q, ya + Dy / q)}.`,
          })
        },
        () => pair(`A${pt(xa, ya)} et B${pt(xb, yb)}. Donne les coordonnées du point M tel que BM⃗ = ${fmt(k)}AB⃗.`, xb + k * dx, yb + k * dy, {
          explanation: `AB⃗${pt(dx, dy)}, donc BM⃗${pt(k * dx, k * dy)} et M = B + BM⃗ = ${pt(xb + k * dx, yb + k * dy)}.`,
        }),
      )
    },
  ],
  [
    // Parallélogrammes
    () => {
      const [xa, ya] = P5(), [xb, yb] = P5(), [xc, yc] = P5()
      return oneOf(
        () => pair(`A${pt(xa, ya)}, B${pt(xb, yb)}, C${pt(xc, yc)}. Donne les coordonnées de D tel que ABCD soit un parallélogramme.`, xa + xc - xb, ya + yc - yb, {
          explanation: `ABCD parallélogramme ⇔ AD⃗ = BC⃗, donc D = A + BC⃗ = ${pt(xa + xc - xb, ya + yc - yb)}.`,
        }),
        () => pair(`A${pt(xa, ya)}, B${pt(xb, yb)}, C${pt(xc, yc)}. Donne les coordonnées de D tel que ABDC soit un parallélogramme.`, xb + xc - xa, yb + yc - ya, {
          explanation: `ABDC parallélogramme ⇔ AB⃗ = CD⃗, donc D = C + AB⃗ = ${pt(xb + xc - xa, yb + yc - ya)}.`,
        }),
        () => pair(`A${pt(xa, ya)}, B${pt(xb, yb)} et D${pt(xc, yc)}. Donne les coordonnées de C tel que ABCD soit un parallélogramme.`, xb + xc - xa, yb + yc - ya, {
          explanation: `ABCD parallélogramme ⇔ DC⃗ = AB⃗, donc C = D + AB⃗ = ${pt(xb + xc - xa, yb + yc - ya)}.`,
        }),
        () => pair(`Trois sommets d'un parallélogramme MNPQ sont M${pt(xa, ya)}, N${pt(xb, yb)} et P${pt(xc, yc)}. Donne les coordonnées de Q.`, xa + xc - xb, ya + yc - yb, {
          explanation: `MNPQ parallélogramme ⇔ MQ⃗ = NP⃗, donc Q = M + NP⃗ = ${pt(xa + xc - xb, ya + yc - yb)}.`,
        }),
      )
    },
    // Déterminant
    () => {
      const u1 = randNonZero(-5, 5), u2 = randNonZero(-5, 5), v1 = randNonZero(-6, 6), v2 = randNonZero(-6, 6), d = u1 * v2 - u2 * v1
      const expl = { explanation: `det = ${fmt(u1)} × ${par(v2)} − ${par(u2)} × ${par(v1)} = ${fmt(u1 * v2)} − ${par(u2 * v1)} = ${fmt(d)}.` }
      return oneOf(
        () => numeric(`Calcule le déterminant det(u⃗, v⃗) pour u⃗${pt(u1, u2)} et v⃗${pt(v1, v2)}.`, d, expl),
        () => numeric(`Calcule le déterminant det(v⃗, u⃗) pour u⃗${pt(u1, u2)} et v⃗${pt(v1, v2)}.`, -d, {
          explanation: `det(v⃗, u⃗) = ${fmt(v1)} × ${par(u2)} − ${par(v2)} × ${par(u1)} = ${fmt(-d)} (c'est l'opposé de det(u⃗, v⃗)).`,
        }),
        () => {
          const [xa, ya] = P5()
          return numeric(`A${pt(xa, ya)}, B${pt(xa + u1, ya + u2)} et C${pt(xa + v1, ya + v2)}. Calcule det(AB⃗, AC⃗).`, d, {
            explanation: `AB⃗${pt(u1, u2)} et AC⃗${pt(v1, v2)}. ${expl.explanation}`,
          })
        },
      )
    },
    // Points alignés
    () => {
      const [xa, ya] = P5(), dx = randNonZero(-3, 3), dy = randNonZero(-4, 4), t = pick([-2, -1, 2, 3])
      const c = xa + t * dx, y = ya + t * dy
      return oneOf(
        () => numeric(`A${pt(xa, ya)} et B${pt(xa + dx, ya + dy)}. Pour quelle valeur de y le point C(${fmt(c)} ; y) est-il aligné avec A et B ?`, y, {
          explanation: `AB⃗${pt(dx, dy)} et x_C − x_A = ${fmt(t * dx)} = ${fmt(t)} × ${par(dx)} : AC⃗ = ${fmt(t)}AB⃗, donc y = ${fmt(ya)} + ${par(t)} × ${par(dy)} = ${fmt(y)}.`,
        }),
        () => numeric(`A${pt(xa, ya)} et B${pt(xa + dx, ya + dy)}. Pour quelle valeur de x le point C(x ; ${fmt(y)}) est-il aligné avec A et B ?`, c, {
          explanation: `AB⃗${pt(dx, dy)} et y_C − y_A = ${fmt(t * dy)} = ${fmt(t)} × ${par(dy)} : AC⃗ = ${fmt(t)}AB⃗, donc x = ${fmt(xa)} + ${par(t)} × ${par(dx)} = ${fmt(c)}.`,
        }),
        () => numeric(`La droite (AB) passe par A${pt(xa, ya)} et B${pt(xa + dx, ya + dy)}. Quelle est l'ordonnée de son point d'abscisse ${fmt(c)} ?`, y, {
          explanation: `Le point C(${fmt(c)} ; y) est sur (AB) si AC⃗ et AB⃗${pt(dx, dy)} sont colinéaires : x_C − x_A = ${fmt(t)} × ${par(dx)}, donc y = ${fmt(ya)} + ${par(t)} × ${par(dy)} = ${fmt(y)}.`,
        }),
      )
    },
    // Distances exactes
    () => retry(() => {
      const p = randInt(1, 7), q = randInt(1, 7), n = p * p + q * q
      const [k, m] = rootParts(n)
      if (m === 1) return null
      const [xa, ya] = P5(), xb = xa + p * pick([1, -1]), yb = ya + q * pick([1, -1])
      const expl = { explanation: `AB = √{${p}² + ${q}²} = √{${n}} = ${rt(k, m)}.` }
      return oneOf(
        () => radical(`A${pt(xa, ya)} et B${pt(xb, yb)} dans un repère orthonormé. Donne la valeur exacte de AB sous la forme a√b.`, k, m, expl),
        () => radical(`Dans un repère orthonormé, donne la norme du vecteur u⃗${pt(xb - xa, yb - ya)} sous la forme a√b.`, k, m, { explanation: `‖u⃗‖ = √{${par(xb - xa)}² + ${par(yb - ya)}²} = √{${n}} = ${rt(k, m)}.` }),
        () => radical(`Dans un repère orthonormé, le cercle de centre A${pt(xa, ya)} passe par B${pt(xb, yb)}. Donne son rayon exact sous la forme a√b.`, k, m, { explanation: `Le rayon vaut AB. ${expl.explanation}` }),
        () => radical(`Dans un repère orthonormé, M est le milieu de [AB] avec A${pt(xa - p, ya - q)} et B${pt(xa + p, ya + q)}. Donne la longueur MB sous la forme a√b.`, k, m, {
          explanation: `M${pt(xa, ya)}, puis MB = √{${p}² + ${q}²} = √{${n}} = ${rt(k, m)}.`,
        }),
      )
    }),
    // Point équidistant
    () => retry(() => {
      const xa = randNonZero(-6, 6), xb = randNonZero(-6, 6), ya = randNonZero(-6, 6), yb = randNonZero(-6, 6)
      return oneOf(
        () => {
          if (xa === xb) return null
          const num = xb * xb + yb * yb - xa * xa - ya * ya, den = 2 * (xb - xa)
          if (num % den) return null
          const x = num / den
          return numeric(`A${pt(xa, ya)} et B${pt(xb, yb)} dans un repère orthonormé. Le point M(x ; 0) de l'axe des abscisses est à la même distance de A et de B. Trouve x.`, x, {
            explanation: `MA² = MB² : (${xPlus(-xa)})² + ${par(ya)}² = (${xPlus(-xb)})² + ${par(yb)}². Les x² se simplifient : ${poly([den, 'x'])} = ${fmt(num)}, donc x = ${fmt(x)}.`,
          })
        },
        () => {
          if (ya === yb) return null
          const num = xb * xb + yb * yb - xa * xa - ya * ya, den = 2 * (yb - ya)
          if (num % den) return null
          const y = num / den
          return numeric(`A${pt(xa, ya)} et B${pt(xb, yb)} dans un repère orthonormé. Le point N(0 ; y) de l'axe des ordonnées est à la même distance de A et de B. Trouve y.`, y, {
            explanation: `NA² = NB² : ${par(xa)}² + (${poly([1, 'y'], [-ya, ''])})² = ${par(xb)}² + (${poly([1, 'y'], [-yb, ''])})². Les y² se simplifient : ${poly([den, 'y'])} = ${fmt(num)}, donc y = ${fmt(y)}.`,
          })
        },
        () => {
          if (xa === xb) return null
          const num = xb * xb + yb * yb - xa * xa - ya * ya, den = 2 * (xb - xa)
          if (num % den) return null
          const x = num / den
          return numeric(`A${pt(xa, ya)} et B${pt(xb, yb)} dans un repère orthonormé. La médiatrice de [AB] coupe l'axe des abscisses au point M(x ; 0). Trouve x.`, x, {
            explanation: `M est sur la médiatrice, donc MA = MB, soit MA² = MB² : ${poly([den, 'x'])} = ${fmt(num)} après simplification des x², donc x = ${fmt(x)}.`,
          })
        },
      )
    }),
  ],
  [
    // Colinéarité : une coordonnée inconnue
    () => {
      const a = randNonZero(-4, 4), k = pick([-3, -2, -1, 2, 3]), m = randNonZero(-5, 5)
      return oneOf(
        () => numeric(`Pour quelle valeur de y les vecteurs u⃗${pt(a, m)} et v⃗(${fmt(k * a)} ; y) sont-ils colinéaires ?`, k * m, {
          explanation: `det = ${fmt(a)} × y − ${par(m)} × ${par(k * a)} = 0, donc y = ${fmt(m * k * a)} ÷ ${par(a)} = ${fmt(k * m)}.`,
        }),
        () => numeric(`Pour quelle valeur de x les vecteurs u⃗${pt(a, m)} et v⃗(x ; ${fmt(k * m)}) sont-ils colinéaires ?`, k * a, {
          explanation: `det = ${fmt(a)} × ${par(k * m)} − ${par(m)} × x = 0, donc x = ${fmt(a * k * m)} ÷ ${par(m)} = ${fmt(k * a)}.`,
        }),
        () => retry(() => {
          const c = randNonZero(-4, 4), M = k * a - c
          if (M === 0) return null
          return numeric(`Pour quelle valeur du réel t les vecteurs u⃗${pt(a, m)} et v⃗(t ${c < 0 ? '+' : '−'} ${Math.abs(c)} ; ${fmt(k * m)}) sont-ils colinéaires ?`, k * a + c, {
            explanation: `det = ${fmt(a)} × ${par(k * m)} − ${par(m)} × (t ${c < 0 ? '+' : '−'} ${Math.abs(c)}) = 0, donc t ${c < 0 ? '+' : '−'} ${Math.abs(c)} = ${fmt(k * a)} et t = ${fmt(k * a + c)}.`,
          })
        }),
      )
    },
    // Colinéarité : équation du second degré
    () => retry(() => {
      const k = randInt(2, 8), divs = Array.from({ length: k * k }, (_, i) => i + 1).filter((d) => (k * k) % d === 0 && d !== k)
      if (!divs.length) return null
      const a = pick(divs), b = (k * k) / a
      const ans = `−${k} ; ${k}`
      return oneOf(
        () => ({ ...solutionSet(`Trouve toutes les valeurs du réel m pour lesquelles u⃗(m ; ${a}) et v⃗(${b} ; m) sont colinéaires.`, [-k, k], {
          explanation: `det = m × m − ${a} × ${b} = m² − ${k * k} = 0, donc m = ${k} ou m = −${k}.`,
        }), answer: ans }),
        () => ({ ...solutionSet(`Trouve toutes les valeurs du réel m pour lesquelles u⃗(${a} ; m) et v⃗(m ; ${b}) sont colinéaires.`, [-k, k], {
          explanation: `det = ${a} × ${b} − m × m = ${k * k} − m² = 0, donc m = ${k} ou m = −${k}.`,
        }), answer: ans }),
        () => retry(() => {
          const c = pick([2, 3, 4])
          return ({ ...solutionSet(`Trouve toutes les valeurs du réel m pour lesquelles u⃗(m ; ${a * c}) et v⃗(${b} ; ${c === 1 ? '' : c}m) sont colinéaires.`, [-k, k], {
            explanation: `det = m × ${c}m − ${a * c} × ${b} = ${c}m² − ${a * b * c} = 0, donc m² = ${k * k} et m = ${k} ou m = −${k}.`,
          }), answer: ans })
        }),
      )
    }),
    // Centre d'un parallélogramme
    () => {
      const [xi, yi] = [randInt(-4, 4), randInt(-4, 4)], [xa, ya] = P6(), [xb, yb] = P6()
      const sym = (L: string, x: number, y: number) => `I est le milieu de la diagonale passant par ${L}, donc le sommet opposé vaut (2x_I − x_${L} ; 2y_I − y_${L}) = ${pt(2 * xi - x, 2 * yi - y)}.`
      const intro = `ABCD est un parallélogramme de centre I${pt(xi, yi)}.`
      return oneOf(
        () => pair(`${intro} On donne A${pt(xa, ya)} et B${pt(xb, yb)}. Donne les coordonnées de C.`, 2 * xi - xa, 2 * yi - ya, { explanation: `Les diagonales se coupent en leur milieu : ${sym('A', xa, ya)}` }),
        () => pair(`${intro} On donne A${pt(xa, ya)} et B${pt(xb, yb)}. Donne les coordonnées de D.`, 2 * xi - xb, 2 * yi - yb, { explanation: `Les diagonales se coupent en leur milieu : ${sym('B', xb, yb)}` }),
        () => pair(`${intro} On donne C${pt(xa, ya)} et D${pt(xb, yb)}. Donne les coordonnées de A.`, 2 * xi - xa, 2 * yi - ya, { explanation: `Les diagonales se coupent en leur milieu : ${sym('C', xa, ya)}` }),
        () => pair(`ABCD est un parallélogramme avec A${pt(xa, ya)} et C${pt(xb, yb)}, et D${pt(xi, yi)}. Donne les coordonnées de B.`, xa + xb - xi, ya + yb - yi, {
          explanation: `Le milieu de [AC] est aussi celui de [BD] : x_B = x_A + x_C − x_D = ${fmt(xa + xb - xi)} et y_B = ${fmt(ya + yb - yi)}.`,
        }),
      )
    },
    // Déplacements et distance
    () => retry(() => {
      const [p, q, r] = pick([[3, 4, 5], [6, 8, 10], [5, 12, 13], [4, 3, 5], [8, 6, 10], [9, 12, 15], [12, 5, 13]])
      const w1 = p * pick([1, -1]), w2 = q * pick([1, -1]), u1 = randInt(-6, 6), u2 = randInt(-6, 6), v1 = w1 - u1, v2 = w2 - u2
      if (Math.abs(v1) > 9 || Math.abs(v2) > 9 || (u1 === 0 && u2 === 0) || (v1 === 0 && v2 === 0)) return null
      const who = pick(MOBILES)
      return oneOf(
        () => numeric(`${who.n} part du point A. ${cap(who.il)} se déplace selon le vecteur u⃗${pt(u1, u2)}, puis selon le vecteur v⃗${pt(v1, v2)}. À quelle distance de A se trouve-t-${who.il} à l'arrivée ? (repère orthonormé, en unités)`, r, {
          explanation: `Déplacement total : u⃗ + v⃗ = ${pt(w1, w2)}, donc la distance vaut √{${par(w1)}² + ${par(w2)}²} = √{${r * r}} = ${r}.`,
        }),
        () => pair(`${who.n} part du point A. ${cap(who.il)} se déplace selon le vecteur u⃗${pt(u1, u2)}, puis selon le vecteur v⃗${pt(v1, v2)}. Selon quel vecteur doit-${who.il} se déplacer pour revenir directement en A ?`, -w1, -w2, {
          explanation: `Déplacement total : u⃗ + v⃗ = ${pt(w1, w2)} ; pour revenir, il faut l'opposé : ${pt(-w1, -w2)}.`,
        }),
        () => {
          const t1 = randInt(-3, 3), t2 = randInt(-3, 3), s1 = v1 - t1, s2 = v2 - t2
          if ((t1 === 0 && t2 === 0) || (s1 === 0 && s2 === 0)) return null
          return numeric(`${who.n} part du point A et enchaîne trois déplacements : u⃗${pt(u1, u2)}, v⃗${pt(t1, t2)} puis w⃗${pt(s1, s2)}. À quelle distance de A se trouve-t-${who.il} à l'arrivée ? (repère orthonormé, en unités)`, r, {
            explanation: `Déplacement total : u⃗ + v⃗ + w⃗ = ${pt(w1, w2)}, donc la distance vaut √{${par(w1)}² + ${par(w2)}²} = √{${r * r}} = ${r}.`,
          })
        },
      )
    }),
    // Triangles rectangles dans un repère
    () => {
      const [p, q, r] = pick([[3, 4, 5], [6, 8, 10], [5, 12, 13], [4, 3, 5], [8, 6, 10], [9, 12, 15], [12, 5, 13]])
      const x = randInt(-5, 5), y = randInt(-5, 5), sx = pick([1, -1]), sy = pick([1, -1])
      const pts = `A${pt(x, y)}, B${pt(x + sx * p, y)} et C${pt(x + sx * p, y + sy * q)}`
      const sides = `AB = ${p} (même ordonnée), BC = ${q} (même abscisse)`
      return oneOf(
        () => numeric(`Dans un repère orthonormé, ${pts}. Calcule le périmètre du triangle ABC.`, p + q + r, {
          explanation: `${sides}, AC = √{${p}² + ${q}²} = ${r} ; périmètre : ${p} + ${q} + ${r} = ${p + q + r}.`,
        }),
        () => numeric(`Dans un repère orthonormé, ${pts}. Calcule l'aire du triangle ABC.`, (p * q) / 2, {
          explanation: `${sides} et le triangle est rectangle en B : aire = ${F(`${p} × ${q}`, 2)} = ${fmt((p * q) / 2)}.`,
        }),
        () => numeric(`Dans un repère orthonormé, ${pts}. Le triangle ABC est rectangle en B. Calcule la longueur de l'hypoténuse.`, r, {
          explanation: `${sides} ; Pythagore : AC = √{${p}² + ${q}²} = √{${r * r}} = ${r}.`,
        }),
        () => numeric(`Dans un repère orthonormé, ${pts}. Quel est le rayon du cercle circonscrit au triangle ABC ?`, r / 2, {
          explanation: `ABC est rectangle en B, donc son cercle circonscrit a pour diamètre l'hypoténuse [AC] = √{${p}² + ${q}²} = ${r} : rayon ${fmt(r / 2)}.`,
        }),
      )
    },
  ],
]

// ── Droites & systèmes ──────────────────────────────────────────────────
const droites: Tiers = [
  [
    // Coefficient directeur à partir de deux points
    () => {
      const xa = randInt(-5, 5), ya = randInt(-5, 5), xb = xa + randNonZero(-5, 5), yb = randInt(-8, 8)
      const expl = { explanation: `m = ${F('y_B − y_A', 'x_B − x_A')} = ${F(fmt(yb - ya), fmt(xb - xa))} = ${fracText(yb - ya, xb - xa)}.` }
      return oneOf(
        () => fraction(`Quel est le coefficient directeur de la droite (AB) avec A${pt(xa, ya)} et B${pt(xb, yb)} ?`, yb - ya, xb - xa, expl),
        () => fraction(`Une droite passe par les points ${pt(xa, ya)} et ${pt(xb, yb)}. Quelle est sa pente (son coefficient directeur) ?`, yb - ya, xb - xa, {
          explanation: `m = ${F('différence des ordonnées', 'différence des abscisses')} = ${F(fmt(yb - ya), fmt(xb - xa))} = ${fracText(yb - ya, xb - xa)}.`,
        }),
        () => xa === 0 || xb === 0 ? null : fraction(`f est une fonction affine telle que f(${fmt(xa)}) = ${fmt(ya)} et f(${fmt(xb)}) = ${fmt(yb)}. Quel est le coefficient directeur de sa droite représentative ?`, yb - ya, xb - xa, {
          explanation: `a = ${F(`f(${fmt(xb)}) − f(${fmt(xa)})`, `${fmt(xb)} − ${par(xa)}`)} = ${F(fmt(yb - ya), fmt(xb - xa))} = ${fracText(yb - ya, xb - xa)}.`,
        }),
        () => fraction(`A${pt(xa, ya)} et B${pt(xb, yb)}. Le vecteur AB⃗ dirige la droite (AB). Quel est le coefficient directeur de (AB) ?`, yb - ya, xb - xa, {
          explanation: `AB⃗${pt(xb - xa, yb - ya)} : m = ${F(fmt(yb - ya), fmt(xb - xa))} = ${fracText(yb - ya, xb - xa)}.`,
        }),
      )
    },
    // Lire et transformer une équation réduite
    () => {
      const m = randNonZero(-6, 6), p = randNonZero(-9, 9)
      return oneOf(
        () => {
          const askM = pick([true, false])
          return numeric(`La droite d a pour équation y = ${fmt(p)} ${m < 0 ? '−' : '+'} ${term(Math.abs(m), 'x', true)}. ${askM ? 'Quel est son coefficient directeur' : 'Quelle est son ordonnée à l\'origine'} ?`, askM ? m : p, {
            explanation: `Sous la forme y = mx + p : y = ${poly([m, 'x'], [p, ''])}, donc ${askM ? `m = ${fmt(m)}` : `p = ${fmt(p)}`}.`,
          })
        },
        () => {
          const k = randInt(2, 4), askM = pick([true, false])
          return numeric(`La droite d a pour équation ${k}y = ${poly([k * m, 'x'], [k * p, ''])}. ${askM ? 'Quel est son coefficient directeur' : 'Quelle est son ordonnée à l\'origine'} ?`, askM ? m : p, {
            explanation: `On divise par ${k} : y = ${poly([m, 'x'], [p, ''])}, donc ${askM ? `m = ${fmt(m)}` : `p = ${fmt(p)}`}.`,
          })
        },
        () => {
          const a = randNonZero(-4, 4)
          return numeric(`La droite d a pour équation y = ${fmt(m)}(${xPlus(-a)}). Quelle est son ordonnée à l'origine ?`, -m * a, {
            explanation: `On développe : y = ${poly([m, 'x'], [-m * a, ''])}, donc p = ${fmt(-m * a)}.`,
          })
        },
        () => {
          const a = randNonZero(-4, 4), b = randNonZero(-6, 6)
          return numeric(`La droite d a pour équation y − ${par(b)} = ${fmt(m)}(${xPlus(-a)}). Quelle est son ordonnée à l'origine ?`, b - m * a, {
            explanation: `y = ${poly([m, 'x'], [-m * a, ''])} + ${par(b)} =${poly([m, 'x'], [b - m * a, ''])}, donc p = ${fmt(b - m * a)}.`,
          })
        },
        () => numeric(`La droite d a pour équation y = ${poly([m, 'x'], [p, ''])}. Quelle est l'ordonnée de son point d'abscisse 1 ?`, m + p, {
          explanation: `y = ${fmt(m)} × 1${tail(p)} = ${fmt(m + p)}.`,
        }),
      )
    },
    // Points d'une droite
    () => {
      const m = randNonZero(-5, 5), p = randInt(-8, 8), x = randNonZero(-6, 6), y = m * x + p
      return oneOf(
        () => numeric(`Quelle est l'ordonnée du point de la droite d'équation y = ${poly([m, 'x'], [p, ''])} d'abscisse ${fmt(x)} ?`, y, { explanation: `On remplace x par ${par(x)} : y = ${sumText([m * x, p])} = ${fmt(y)}.` }),
        () => numeric(`Le point M(${fmt(x)} ; y) appartient à la droite d'équation y = ${poly([p, ''], [m, 'x'])}. Que vaut y ?`, y, { explanation: `On remplace x par ${par(x)} : y = ${sumText([p, m * x])} = ${fmt(y)}.` }),
        () => numeric(`Quelle est l'abscisse du point de la droite d'équation y = ${poly([m, 'x'], [p, ''])} d'ordonnée ${fmt(y)} ?`, x, {
          explanation: `On résout ${poly([m, 'x'], [p, ''])} = ${fmt(y)} : ${poly([m, 'x'])} = ${fmt(y - p)}, donc x = ${fmt(x)}.`,
        }),
        () => numeric(`Le point N(x ; ${fmt(y)}) appartient à la droite d'équation y = ${poly([m, 'x'], [p, ''])}. Que vaut x ?`, x, {
          explanation: `${fmt(y)} = ${poly([m, 'x'], [p, ''])}, donc ${poly([m, 'x'])} = ${fmt(y - p)} et x = ${fmt(x)}.`,
        }),
      )
    },
    // Droites passant par l'origine
    () => {
      const m = randNonZero(-6, 6), a = randNonZero(-6, 6)
      return oneOf(
        () => expression(`Donne l'équation réduite de la droite qui passe par l'origine du repère et par A${pt(a, m * a)}.`, poly([m, 'x']), 'any', {
          answer: `y = ${poly([m, 'x'])}`, inputHint: 'y = mx',
          explanation: `Elle passe par l'origine : y = mx, avec m = ${fmt(m * a)} ÷ ${par(a)} = ${fmt(m)}.`,
        }),
        () => expression(`La droite représentant une fonction linéaire passe par A${pt(a, m * a)}. Donne son équation réduite.`, poly([m, 'x']), 'any', {
          answer: `y = ${poly([m, 'x'])}`, inputHint: 'y = mx',
          explanation: `Une fonction linéaire est représentée par une droite y = mx passant par l'origine ; m = ${fmt(m * a)} ÷ ${par(a)} = ${fmt(m)}.`,
        }),
        () => numeric(`La droite d'équation y = mx passe par le point A${pt(a, m * a)}. Que vaut m ?`, m, { explanation: `${fmt(m * a)} = m × ${par(a)}, donc m = ${fmt(m * a)} ÷ ${par(a)} = ${fmt(m)}.` }),
        () => {
          const c = randNonZero(-6, 6)
          return numeric(`Une droite passe par l'origine du repère et par A${pt(a, m * a)}. Quelle est l'ordonnée de son point d'abscisse ${fmt(c)} ?`, m * c, {
            explanation: `Équation y = mx avec m = ${fmt(m * a)} ÷ ${par(a)} = ${fmt(m)}, donc y = ${fmt(m)} × ${par(c)} = ${fmt(m * c)}.`,
          })
        },
      )
    },
    // Droites horizontales
    () => {
      const a = randInt(-8, 8), b = randNonZero(-9, 9)
      const opts = { answer: `y = ${fmt(b)}`, inputHint: 'y = …' }
      return oneOf(
        () => expression(`Donne l'équation réduite de la droite parallèle à l'axe des abscisses passant par A${pt(a, b)}.`, String(b), 'any', {
          ...opts, explanation: `Une droite horizontale a un coefficient directeur nul : tous ses points ont pour ordonnée ${fmt(b)}, donc y = ${fmt(b)}.`,
        }),
        () => {
          const c = a + randNonZero(-5, 5)
          return expression(`Donne l'équation réduite de la droite (AB) avec A${pt(a, b)} et B${pt(c, b)}.`, String(b), 'any', {
            ...opts, explanation: `A et B ont la même ordonnée ${fmt(b)} : m = ${F(0, fmt(c - a))} = 0 et la droite est horizontale, y = ${fmt(b)}.`,
          })
        },
        () => expression(`Donne l'équation réduite de la droite de coefficient directeur 0 qui passe par A${pt(a, b)}.`, String(b), 'any', {
          ...opts, explanation: `y = 0 × x + p = p, et A est sur la droite : p = ${fmt(b)}, donc y = ${fmt(b)}.`,
        }),
        () => {
          const k = randNonZero(-9, 9)
          if (k === b) return null
          return expression(`Donne l'équation réduite de la droite parallèle à la droite d'équation y = ${fmt(k)} et passant par A${pt(a, b)}.`, String(b), 'any', {
            ...opts, explanation: `La droite y = ${fmt(k)} est horizontale ; la parallèle passant par A est horizontale aussi : y = ${fmt(b)}.`,
          })
        },
      )
    },
  ],
  [
    // Ordonnée à l'origine
    () => {
      const m = randNonZero(-5, 5), p = randInt(-8, 8), x = randNonZero(-4, 4), y = m * x + p
      const expl = { explanation: `${fmt(y)} = ${fmt(m)} × ${par(x)} + p, donc p = ${fmt(y)} − ${par(m * x)} = ${fmt(p)}.` }
      return oneOf(
        () => numeric(`La droite d a pour coefficient directeur ${fmt(m)} et passe par A(${fmt(x)} ; ${fmt(y)}). Quelle est son ordonnée à l'origine ?`, p, expl),
        () => numeric(`f est une fonction affine de coefficient ${fmt(m)} et f(${fmt(x)}) = ${fmt(y)}. On écrit f(x) = ${poly([m, 'x'])} + b. Que vaut b ?`, p, {
          explanation: `${fmt(y)} = ${fmt(m)} × ${par(x)} + b, donc b = ${fmt(y)} − ${par(m * x)} = ${fmt(p)}.`,
        }),
        () => pair(`La droite de pente ${fmt(m)} passant par A(${fmt(x)} ; ${fmt(y)}) coupe l'axe des ordonnées en un point. Donne ses coordonnées.`, 0, p, {
          explanation: `${expl.explanation} Le point cherché est (0 ; ${fmt(p)}).`,
        }),
        () => numeric(`La droite d'équation y = ${poly([m, 'x'])} + p passe par A(${fmt(x)} ; ${fmt(y)}). Que vaut p ?`, p, expl),
      )
    },
    // Intersection avec les axes
    () => {
      const m = randNonZero(-5, 5), r = randNonZero(-6, 6), p = -m * r
      return oneOf(
        () => pair(`En quel point la droite d'équation y = ${poly([m, 'x'], [p, ''])} coupe-t-elle l'axe des abscisses ?`, r, 0, {
          explanation: `Sur l'axe des abscisses, y = 0 : ${poly([m, 'x'], [p, ''])} = 0 donne x = ${fmt(r)}. Point (${fmt(r)} ; 0).`,
        }),
        () => numeric(`Quelle est l'abscisse du point d'intersection de la droite y = ${poly([p, ''], [m, 'x'])} avec l'axe des abscisses ?`, r, {
          explanation: `On résout ${poly([p, ''], [m, 'x'])} = 0 : ${poly([m, 'x'])} = ${fmt(-p)}, donc x = ${fmt(r)}.`,
        }),
        () => {
          const k = randInt(2, 3)
          return pair(`En quel point la droite d'équation ${k}y = ${poly([k * m, 'x'], [k * p, ''])} coupe-t-elle l'axe des abscisses ?`, r, 0, {
            explanation: `Sur l'axe des abscisses, y = 0 : ${poly([k * m, 'x'], [k * p, ''])} = 0 donne x = ${fmt(r)}. Point (${fmt(r)} ; 0).`,
          })
        },
      )
    },
    // Coefficient inconnu
    () => {
      const p = randNonZero(-6, 6), a = randNonZero(-5, 5), b = randInt(-9, 9)
      const expl = { explanation: `${fmt(b)} = m × ${par(a)}${tail(p)}, donc m × ${par(a)} = ${fmt(b - p)} et m = ${fracText(b - p, a)}.` }
      return oneOf(
        () => fraction(`La droite d'équation y = mx${tail(p)} passe par A${pt(a, b)}. Que vaut m ?`, b - p, a, expl),
        () => fraction(`Le point A${pt(a, b)} appartient à la droite d'équation y = mx${tail(p)}. Que vaut m ?`, b - p, a, expl),
        () => fraction(`f(x) = ax${tail(p)} et f(${fmt(a)}) = ${fmt(b)}. Que vaut a ?`, b - p, a, {
          explanation: `a × ${par(a)}${tail(p)} = ${fmt(b)}, donc a × ${par(a)} = ${fmt(b - p)} et a = ${fracText(b - p, a)}.`,
        }),
      )
    },
    // Pentes concrètes
    () => {
      const ctx = pick([
        { t: 'Une rampe d’accès monte de', up: true }, { t: 'Une route de montagne monte de', up: true }, { t: 'Le chemin vers le donjon monte de', up: true },
        { t: 'Une piste de ski descend de', up: false }, { t: 'Un toboggan descend de', up: false }, { t: 'Un sentier descend de', up: false },
      ])
      const h = randInt(1, 12), d = randInt(4, 60)
      return oneOf(
        () => fraction(`${ctx.t} ${h} m pour ${d} m parcourus à l'horizontale. Dans un repère où l'axe des abscisses est horizontal (dans le sens de la marche), quel est le coefficient directeur de cette pente ?`, ctx.up ? h : -h, d, {
          explanation: `m = ${F('variation verticale', 'variation horizontale')} = ${F(ctx.up ? h : `−${h}`, d)} = ${fracText(ctx.up ? h : -h, d)}${ctx.up ? '' : ' (négatif car ça descend)'}.`,
        }),
        () => {
          const pc = pick([4, 5, 6, 8, 10, 12, 15]), D = randInt(1, 20) * 50
          return numeric(`Un panneau indique une montée de ${pc} % : on s'élève de ${pc} m pour 100 m parcourus à l'horizontale. De combien de mètres s'élève-t-on pour ${D} m parcourus à l'horizontale ?`, (pc * D) / 100, {
            explanation: `Coefficient directeur ${F(pc, 100)} = ${fmt(pc / 100)} : ${fmt(pc / 100)} × ${D} = ${fmt((pc * D) / 100)} m.`,
          })
        },
        () => {
          const pc = pick([4, 5, 8, 10, 12, 20, 25])
          return numeric(`Un panneau routier indique une descente de ${pc} %. Quel est le coefficient directeur de la route (axe des abscisses horizontal, dans le sens de la marche) ? Donne-le sous forme décimale.`, -pc / 100, {
            explanation: `${pc} % signifie ${pc} m de dénivelé pour 100 m à l'horizontale ; ça descend, donc m = −${F(pc, 100)} = ${fmt(-pc / 100)}.`,
          })
        },
      )
    },
    // Droites parallèles
    () => {
      const xa = randInt(-5, 5), ya = randInt(-5, 5), xb = xa + randNonZero(-5, 5), yb = randInt(-8, 8), p = randNonZero(-7, 7)
      return oneOf(
        () => fraction(`A${pt(xa, ya)} et B${pt(xb, yb)}. Pour quelle valeur de a la droite d'équation y = ax${tail(p)} est-elle parallèle à (AB) ?`, yb - ya, xb - xa, {
          explanation: `Deux droites parallèles ont le même coefficient directeur : a = ${F(fmt(yb - ya), fmt(xb - xa))} = ${fracText(yb - ya, xb - xa)}.`,
        }),
        () => retry(() => {
          const a = randNonZero(-6, 6), b = pick([-5, -4, -3, -2, 2, 3, 4, 5]), c = randNonZero(-9, 9)
          return fraction(`Quel est le coefficient directeur de toute droite parallèle à la droite d'équation ${poly([a, 'x'], [b, 'y'])} = ${fmt(c)} ?`, -a, b, {
            explanation: `On isole y : ${poly([b, 'y'])} = ${poly([-a, 'x'], [c, ''])}, donc y = ${fx(-a, b)} + … ; une parallèle a le même coefficient directeur ${fracText(-a, b)}.`,
          })
        }),
        () => {
          const m = randNonZero(-5, 5), k = randNonZero(-4, 4), q = randNonZero(-6, 6)
          return numeric(`Pour quelle valeur de a la droite d'équation y = (a ${k < 0 ? '+' : '−'} ${Math.abs(k)})x${tail(p)} est-elle parallèle à la droite y = ${poly([m, 'x'], [q, ''])} ?`, m + k, {
            explanation: `Parallèles ⇔ même coefficient directeur : a ${k < 0 ? '+' : '−'} ${Math.abs(k)} = ${fmt(m)}, donc a = ${fmt(m + k)}.`,
          })
        },
      )
    },
  ],
  [
    // Équation réduite par deux points
    () => {
      const m = randNonZero(-4, 4), p = randInt(-6, 6), x1 = randInt(-4, 1), x2 = x1 + randInt(1, 4)
      const opts = { answer: `y = ${poly([m, 'x'], [p, ''])}`, inputHint: 'y = mx + p' }
      return oneOf(
        () => expression(`Donne l'équation réduite de la droite passant par A${pt(x1, m * x1 + p)} et B${pt(x2, m * x2 + p)}.`, poly([m, 'x'], [p, '']), 'any', {
          ...opts, explanation: `m = ${F(fmt(m * x2 - m * x1), fmt(x2 - x1))} = ${fmt(m)}, puis p = y_A − m x_A = ${fmt(m * x1 + p)} − ${par(m * x1)} = ${fmt(p)}.`,
        }),
        () => {
          const x0 = x1 === 0 ? x2 : x1
          return expression(`Donne l'équation réduite de la droite de coefficient directeur ${fmt(m)} passant par A${pt(x0, m * x0 + p)}.`, poly([m, 'x'], [p, '']), 'any', {
            ...opts, explanation: `y = ${poly([m, 'x'])} + p et A est sur la droite : p = ${fmt(m * x0 + p)} − ${par(m * x0)} = ${fmt(p)}.`,
          })
        },
        () => {
          const x0 = x1 === 0 ? x2 : x1
          return expression(`Une droite coupe l'axe des ordonnées au point (0 ; ${fmt(p)}) et passe par A${pt(x0, m * x0 + p)}. Donne son équation réduite.`, poly([m, 'x'], [p, '']), 'any', {
            ...opts, explanation: `p = ${fmt(p)}, puis m = ${F(`${fmt(m * x0 + p)} − ${par(p)}`, `${fmt(x0)} − 0`)} = ${fmt(m)}.`,
          })
        },
      )
    },
    // Équation cartésienne → réduite
    () => {
      const b = pick([1, 2, 3, -1, -2, -3]), m = randNonZero(-5, 5), p = randInt(-6, 6)
      const a = -m * b, c = -p * b
      const opts = { answer: `y = ${poly([m, 'x'], [p, ''])}`, inputHint: 'y = mx + p' }
      return oneOf(
        () => expression(`Donne l'équation réduite de la droite d'équation ${poly([a, 'x'], [b, 'y'], [c, ''])} = 0.`, poly([m, 'x'], [p, '']), 'any', {
          ...opts, explanation: `On isole y : ${poly([b, 'y'])} = ${poly([-a, 'x'], [-c, ''])}${b !== 1 ? `, puis on divise par ${par(b)}` : ''} : y = ${poly([m, 'x'], [p, ''])}.`,
        }),
        () => expression(`Donne l'équation réduite de la droite d'équation ${poly([a, 'x'], [b, 'y'])} = ${fmt(-c)}.`, poly([m, 'x'], [p, '']), 'any', {
          ...opts, explanation: `On isole y : ${poly([b, 'y'])} = ${poly([-a, 'x'], [-c, ''])}${b !== 1 ? `, puis on divise par ${par(b)}` : ''} : y = ${poly([m, 'x'], [p, ''])}.`,
        }),
        () => {
          const x0 = randNonZero(-4, 4), y0 = m * x0 + p
          if (y0 === 0) return null
          return expression(`Donne l'équation réduite de la droite d'équation y − ${par(y0)} = ${coefP(m)}(${xPlus(-x0)}).`, poly([m, 'x'], [p, '']), 'any', {
            ...opts, explanation: `On développe : y = ${poly([m, 'x'], [-m * x0, ''])} + ${par(y0)} = ${poly([m, 'x'], [p, ''])}.`,
          })
        },
      )
    },
    // Parallèle passant par un point
    () => {
      const m = randNonZero(-4, 4), p = randInt(-6, 6), xa = randNonZero(-4, 4), ya = randInt(-6, 6), q = ya - m * xa
      const opts = { answer: `y = ${poly([m, 'x'], [q, ''])}`, inputHint: 'y = mx + p' }
      return oneOf(
        () => expression(`Donne l'équation réduite de la droite parallèle à la droite y = ${poly([m, 'x'], [p, ''])} passant par A${pt(xa, ya)}.`, poly([m, 'x'], [q, '']), 'any', {
          ...opts, explanation: `Même coefficient directeur ${fmt(m)}, puis p = ${fmt(ya)} − ${par(m)} × ${par(xa)} = ${fmt(q)}.`,
        }),
        () => {
          const b = pick([2, 3, -2]), c = randNonZero(-6, 6)
          return expression(`Donne l'équation réduite de la droite parallèle à la droite d'équation ${poly([-m * b, 'x'], [b, 'y'])} = ${fmt(c * b)} passant par A${pt(xa, ya)}.`, poly([m, 'x'], [q, '']), 'any', {
            ...opts, explanation: `${poly([-m * b, 'x'], [b, 'y'])} = ${fmt(c * b)} s'écrit y = ${poly([m, 'x'], [c, ''])} : coefficient directeur ${fmt(m)}. Puis p = ${fmt(ya)} − ${par(m)} × ${par(xa)} = ${fmt(q)}.`,
          })
        },
        () => {
          const xb = randInt(-5, 5), yb = randInt(-5, 5), d = randNonZero(-3, 3)
          return expression(`B${pt(xb, yb)} et C${pt(xb + d, yb + m * d)}. Donne l'équation réduite de la droite parallèle à (BC) passant par A${pt(xa, ya)}.`, poly([m, 'x'], [q, '']), 'any', {
            ...opts, explanation: `Coefficient directeur de (BC) : ${F(fmt(m * d), fmt(d))} = ${fmt(m)} ; puis p = ${fmt(ya)} − ${par(m)} × ${par(xa)} = ${fmt(q)}.`,
          })
        },
      )
    },
    // Vecteur directeur
    () => {
      const a = randNonZero(-6, 6), b = randNonZero(-8, 8)
      return oneOf(
        () => fraction(`Une droite a pour vecteur directeur u⃗${pt(a, b)}. Quel est son coefficient directeur ?`, b, a, {
          explanation: `Un vecteur directeur (a ; b) avec a ≠ 0 donne m = ${F('b', 'a')} = ${F(fmt(b), fmt(a))} = ${fracText(b, a)}.`,
        }),
        () => {
          const A = randNonZero(-6, 6), B = pick([-4, -3, -2, 2, 3, 4]), C = randNonZero(-9, 9)
          return fraction(`La droite d'équation ${poly([A, 'x'], [B, 'y'])} = ${fmt(C)} a pour vecteur directeur u⃗(1 ; t). Que vaut t ?`, -A, B, {
            explanation: `On isole y : y = ${fx(-A, B)} + … ; le coefficient directeur est ${fracText(-A, B)}, donc u⃗(1 ; ${fracText(-A, B)}) dirige la droite et t = ${fracText(-A, B)}.`,
          })
        },
        () => {
          const m = randNonZero(-4, 4), p = randNonZero(-9, 9), k = pick([2, 3, 4, -2])
          return numeric(`La droite d'équation y = ${poly([m, 'x'], [p, ''])} a pour vecteur directeur u⃗(${fmt(k)} ; t). Que vaut t ?`, k * m, {
            explanation: `(1 ; ${fmt(m)}) dirige la droite, donc aussi ${fmt(k)} × (1 ; ${fmt(m)}) = (${fmt(k)} ; ${fmt(k * m)}) : t = ${fmt(k * m)}.`,
          })
        },
      )
    },
    // Points d'intersection avec les axes
    () => {
      const q = randNonZero(-5, 5), m = randNonZero(-4, 4), p = -m * q
      return oneOf(
        () => expression(`La droite d coupe l'axe des ordonnées au point d'ordonnée ${fmt(p)} et l'axe des abscisses au point d'abscisse ${fmt(q)}. Donne son équation réduite.`, poly([m, 'x'], [p, '']), 'any', {
          answer: `y = ${poly([m, 'x'], [p, ''])}`, inputHint: 'y = mx + p',
          explanation: `Elle passe par (0 ; ${fmt(p)}) et (${fmt(q)} ; 0) : p = ${fmt(p)} et m = ${F(`0 − ${par(p)}`, `${fmt(q)} − 0`)} = ${fmt(m)}.`,
        }),
        () => numeric(`Une droite passe par les points (0 ; ${fmt(p)}) et (${fmt(q)} ; 0). Quel est son coefficient directeur ?`, m, {
          explanation: `m = ${F(`0 − ${par(p)}`, `${fmt(q)} − 0`)} = ${F(fmt(-p), fmt(q))} = ${fmt(m)}.`,
        }),
        () => numeric(`La droite d'équation y = ${poly([m, 'x'])} + p coupe l'axe des abscisses au point d'abscisse ${fmt(q)}. Que vaut p ?`, p, {
          explanation: `Le point (${fmt(q)} ; 0) est sur la droite : 0 = ${fmt(m)} × ${par(q)} + p, donc p = ${fmt(p)}.`,
        }),
      )
    },
  ],
  [
    // Intersection de deux droites
    () => retry(() => {
      const x = randInt(-5, 5), m1 = randNonZero(-4, 4), m2 = randNonZero(-4, 4), y = randInt(-6, 6)
      if (m1 === m2) return null
      const p1 = y - m1 * x, p2 = y - m2 * x
      const d1 = `y = ${poly([m1, 'x'], [p1, ''])}`, d2 = `y = ${poly([m2, 'x'], [p2, ''])}`
      const expl = { explanation: `${poly([m1, 'x'], [p1, ''])} = ${poly([m2, 'x'], [p2, ''])} donne ${poly([m1 - m2, 'x'])} = ${fmt(p2 - p1)}, x = ${fmt(x)}, puis y = ${fmt(y)}.` }
      return oneOf(
        () => pair(`Donne les coordonnées du point d'intersection des droites ${d1} et ${d2}.`, x, y, expl),
        () => pair(`Résous le système : ${d1} et ${d2}. Donne le couple (x ; y).`, x, y, expl),
        () => numeric(`Les droites ${d1} et ${d2} se coupent en un point. Quelle est son abscisse ?`, x, expl),
      )
    }),
    // Système par substitution
    () => retry(() => {
      const x0 = randInt(-5, 5), y0 = randInt(-6, 6), a = randNonZero(-4, 4), c = randNonZero(-5, 5), d = randNonZero(-4, 4)
      if (c + d * a === 0) return null
      const b = y0 - a * x0, e = c * x0 + d * y0
      return oneOf(
        () => pair(`Résous le système : y = ${poly([a, 'x'], [b, ''])} et ${poly([c, 'x'], [d, 'y'])} = ${fmt(e)}. Donne le couple (x ; y).`, x0, y0, {
          explanation: `Par substitution : ${poly([c, 'x'])} + ${par(d)}(${poly([a, 'x'], [b, ''])}) = ${fmt(e)}, soit ${poly([c + d * a, 'x'])} = ${fmt(e - d * b)}, x = ${fmt(x0)}, puis y = ${fmt(y0)}.`,
        }),
        () => {
          const B = x0 - a * y0, E = c * y0 + d * x0
          if (c + d * a === 0 || c === -d * a) return null
          return pair(`Résous le système : x = ${poly([a, 'y'], [B, ''])} et ${poly([d, 'x'], [c, 'y'])} = ${fmt(E)}. Donne le couple (x ; y).`, x0, y0, {
            explanation: `Par substitution de x : ${fmt(d)}(${poly([a, 'y'], [B, ''])}) + ${par(c)}y = ${fmt(E)}, soit ${poly([d * a + c, 'y'])} = ${fmt(E - d * B)}, y = ${fmt(y0)}, puis x = ${fmt(x0)}.`,
          })
        },
        () => pair(`Résous le système : ${poly([-a, 'x'], [1, 'y'])} = ${fmt(b)} et ${poly([c, 'x'], [d, 'y'])} = ${fmt(e)}. Donne le couple (x ; y).`, x0, y0, {
          explanation: `La première équation donne y = ${poly([a, 'x'], [b, ''])} ; on substitue : ${poly([c + d * a, 'x'])} = ${fmt(e - d * b)}, x = ${fmt(x0)}, puis y = ${fmt(y0)}.`,
        }),
      )
    }),
    // Droite définie par un point et un vecteur directeur
    () => {
      const xa = randInt(-5, 5), ya = randInt(-6, 6), dx = randNonZero(-3, 3), m = randNonZero(-3, 3), dy = m * dx, p = ya - m * xa
      const opts = { answer: `y = ${poly([m, 'x'], [p, ''])}`, inputHint: 'y = mx + p' }
      const expl = `m = ${F(fmt(dy), fmt(dx))} = ${fmt(m)}, puis p = ${fmt(ya)} − ${par(m)} × ${par(xa)} = ${fmt(p)}.`
      return oneOf(
        () => expression(`Donne l'équation réduite de la droite passant par A${pt(xa, ya)} et de vecteur directeur u⃗${pt(dx, dy)}.`, poly([m, 'x'], [p, '']), 'any', { ...opts, explanation: expl }),
        () => {
          const [xb, yb] = [randInt(-5, 5), randInt(-5, 5)]
          return expression(`B${pt(xb, yb)} et C${pt(xb + dx, yb + dy)}. Donne l'équation réduite de la droite passant par A${pt(xa, ya)} et dirigée par BC⃗.`, poly([m, 'x'], [p, '']), 'any', {
            ...opts, explanation: `BC⃗${pt(dx, dy)} : ${expl}`,
          })
        },
        () => expression(`Un mobile part de A${pt(xa, ya)} et se déplace en ligne droite dans la direction du vecteur u⃗${pt(dx, dy)}. Donne l'équation réduite de la droite qu'il parcourt.`, poly([m, 'x'], [p, '']), 'any', { ...opts, explanation: expl }),
      )
    },
    // Paramètre
    () => retry(() => {
      const k = randNonZero(-9, 9), c1 = randNonZero(-4, 4), c2 = randNonZero(-4, 4), e1 = randNonZero(-6, 6)
      return oneOf(
        () => {
          if (c1 === c2) return null
          const e2 = c1 * k + e1 - c2 * k, p1 = randInt(-6, 6), p2 = randInt(-6, 6)
          if (e2 === 0 || Math.abs(e2) > 20 || p1 === p2) return null
          const A = poly([c1, 'k'], [e1, '']), B = poly([c2, 'k'], [e2, ''])
          return numeric(`Pour quelle valeur du réel k les droites d'équations y = (${A})x${tail(p1)} et y = (${B})x${tail(p2)} sont-elles parallèles ?`, k, {
            explanation: `Parallèles ⇔ même coefficient directeur : ${A} = ${B}, soit ${poly([c1 - c2, 'k'])} = ${fmt(e2 - e1)}, donc k = ${fmt(k)}.`,
          })
        },
        () => {
          const a = randNonZero(-4, 4), p = randNonZero(-6, 6), b = k * a + p
          return numeric(`Pour quelle valeur du réel k la droite d'équation y = kx${tail(p)} passe-t-elle par le point A${pt(a, b)} ?`, k, {
            explanation: `${fmt(b)} = k × ${par(a)}${tail(p)}, donc k × ${par(a)} = ${fmt(b - p)} et k = ${fmt(k)}.`,
          })
        },
        () => {
          const m = randNonZero(-4, 4), d = randNonZero(-3, 3), [xb, yb] = [randInt(-5, 5), randInt(-5, 5)], c = k - m
          if (c === 0) return null
          return numeric(`B${pt(xb, yb)} et C${pt(xb + d, yb + m * d)}. Pour quelle valeur du réel k la droite d'équation y = (k ${c < 0 ? '+' : '−'} ${Math.abs(c)})x + 1 est-elle parallèle à (BC) ?`, k, {
            explanation: `Coefficient directeur de (BC) : ${F(fmt(m * d), fmt(d))} = ${fmt(m)}. Parallèles ⇔ k ${c < 0 ? '+' : '−'} ${Math.abs(c)} = ${fmt(m)}, donc k = ${fmt(k)}.`,
          })
        },
      )
    }),
    // Deux tarifs
    () => retry(() => {
      const ctx = pick([
        { q: 'Deux loueurs de vélos', u: 'heure', us: 'heures' }, { q: 'Deux salles de sport', u: 'séance', us: 'séances' },
        { q: 'Deux caravanes marchandes', u: 'lieue', us: 'lieues' }, { q: 'Deux sociétés de taxis', u: 'km', us: 'km' },
      ])
      const a = randInt(1, 4), c = a + randInt(1, 4), d = randInt(2, 10), x0 = randInt(3, 15), b = d + (c - a) * x0
      const intro = `${ctx.q} : la première facture ${b} € plus ${a} € par ${ctx.u}, la seconde ${d} € plus ${c} € par ${ctx.u}.`
      const solve = `On résout ${poly([a, 'x'], [b, ''])} = ${poly([c, 'x'], [d, ''])} : ${c - a === 1 ? `x = ${x0}` : `${c - a}x = ${b - d}, donc x = ${x0}`}`
      return oneOf(
        () => numeric(`${intro} Pour combien de ${ctx.us} les deux tarifs sont-ils égaux ?`, x0, { explanation: `${solve} : c'est l'abscisse du point d'intersection des deux droites.` }),
        () => numeric(`${intro} Quel est le prix (en €) commun aux deux tarifs, quand ils sont égaux ?`, a * x0 + b, { explanation: `${solve}, et le prix vaut ${a} × ${x0} + ${b} = ${a * x0 + b} €.` }),
        () => pair(`${intro} Les droites représentant les deux tarifs se coupent en un point. Donne ses coordonnées (nombre ${/^[aeiouh]/.test(ctx.us) ? 'd’' : 'de '}${ctx.us} ; prix en €).`, x0, a * x0 + b, {
          explanation: `${solve}, puis y = ${a} × ${x0} + ${b} = ${a * x0 + b}.`,
        }),
      )
    }),
  ],
  [
    // Système par combinaison
    () => retry(() => {
      const x = randInt(-5, 5), y = randInt(-5, 5)
      const a = randInt(1, 4), b = randNonZero(-4, 4), c = randNonZero(-4, 4), e = randInt(1, 4)
      if (a * e - b * c === 0) return null
      return oneOf(
        () => pair(`Résous le système : ${poly([a, 'x'], [b, 'y'])} = ${fmt(a * x + b * y)} et ${poly([c, 'x'], [e, 'y'])} = ${fmt(c * x + e * y)}. Donne le couple (x ; y).`, x, y, {
          explanation: `Par combinaison (on élimine x en multipliant la 1re équation par ${fmt(c)} et la 2e par ${fmt(a)}) : ${fmt(a * e - b * c)}y = ${fmt((a * e - b * c) * y)}, y = ${fmt(y)}, puis x = ${fmt(x)}.`,
        }),
        () => {
          const S = randInt(10, 60), D = 2 * randInt(1, 10) + (S % 2), X = (S + D) / 2, Y = (S - D) / 2
          return pair(`La somme de deux nombres vaut ${S} et leur différence vaut ${D}. Donne le couple (plus grand ; plus petit).`, X, Y, {
            explanation: `x + y = ${S} et x − y = ${D} : en additionnant, 2x = ${S + D}, donc x = ${X} ; puis y = ${S} − ${X} = ${Y}.`,
          })
        },
        () => {
          const A = randInt(2, 5), B = randInt(1, 4)
          if (A * 1 - B * 1 === 0) return null
          const Y = poly([-1, 'x'], [x + y, ''])
          return pair(`Résous le système : ${poly([A, 'x'], [B, 'y'])} = ${fmt(A * x + B * y)} et ${poly([1, 'x'], [1, 'y'])} = ${fmt(x + y)}. Donne le couple (x ; y).`, x, y, {
            explanation: `La 2e équation donne y = ${Y} ; on remplace : ${A}x + ${coefP(B)}(${Y}) = ${fmt(A * x + B * y)}, soit ${poly([A - B, 'x'])} = ${fmt(A * x + B * y - B * (x + y))}, donc x = ${fmt(x)}, puis y = ${fmt(y)}.`,
          })
        },
      )
    }),
    // Problème de prix
    () => retry(() => {
      const items = pick([
        { A: ['épée', 'épées'], B: ['bouclier', 'boucliers'], lo: [20, 45], hi: [8, 25], lieu: 'Au marché' },
        { A: ['tonneau', 'tonneaux'], B: ['sac de blé', 'sacs de blé'], lo: [8, 20], hi: [6, 15], lieu: 'Au port' },
        { A: ['lanterne', 'lanternes'], B: ['corde', 'cordes'], lo: [6, 14], hi: [6, 12], lieu: 'Chez le marchand' },
        { A: ['livre', 'livres'], B: ['agenda', 'agendas'], lo: [8, 20], hi: [6, 12], lieu: 'À la librairie' },
      ])
      const ep = randInt(items.lo[0], items.lo[1]), bo = randInt(items.hi[0], items.hi[1]), a = randInt(2, 4), b = randInt(1, 3), c = randInt(1, 2), d = randInt(2, 5)
      if (a * d === b * c || ep === bo) return null
      const askE = pick([true, false])
      const nb = (n: number, w: string[]) => `${n} ${n > 1 ? w[1] : w[0]}`
      return numeric(`${items.lieu}, ${nb(a, items.A)} et ${nb(b, items.B)} coûtent ${a * ep + b * bo} € ; ${nb(c, items.A)} et ${nb(d, items.B)} coûtent ${c * ep + d * bo} €. Quel est le prix d'${askE ? `un${/^(épée|lanterne)/.test(items.A[0]) ? 'e' : ''} ${items.A[0]}` : `un${/^(corde)/.test(items.B[0]) ? 'e' : ''} ${items.B[0]}`} (en €) ?`, askE ? ep : bo, {
        explanation: `Système ${a}x + ${b === 1 ? '' : b}y = ${a * ep + b * bo} et ${c === 1 ? '' : c}x + ${d}y = ${c * ep + d * bo} (x : ${items.A[0]}, y : ${items.B[0]}) : x = ${ep}, y = ${bo}.`,
      })
    }),
    // Recettes et effectifs
    () => {
      const ctx = pick([
        { lieu: 'Au cinéma', A: 'adultes', B: 'enfants', what: 'places' },
        { lieu: 'Au musée', A: 'billets plein tarif', B: 'billets réduits', what: 'billets' },
        { lieu: 'Au tournoi de chevalerie', A: 'places en tribune', B: 'places debout', what: 'places' },
        { lieu: 'Au parc aquatique', A: 'entrées adultes', B: 'entrées enfants', what: 'entrées' },
      ])
      const pa = randInt(8, 16), pc = randInt(3, pa - 2), A = randInt(10, 80), C = randInt(10, 80), n = A + C, T = A * pa + C * pc, askA = pick([true, false])
      return numeric(`${ctx.lieu}, on a vendu ${n} ${ctx.what} pour une recette de ${T} €. Les ${ctx.A} coûtent ${pa} € et les ${ctx.B} ${pc} €. Combien y avait-il de ${askA ? ctx.A : ctx.B} ?`, askA ? A : C, {
        explanation: `Avec a (${ctx.A}) et e (${ctx.B}) : a + e = ${n} et ${pa}a + ${pc}e = ${T}. En remplaçant e = ${n} − a : ${pa - pc}a = ${T} − ${pc * n} = ${T - pc * n}, donc a = ${A} et e = ${C}.`,
      })
    },
    // Intersection de droites définies par des points
    () => retry(() => {
      const x0 = randInt(-4, 4), y0 = randInt(-5, 5), m1 = randNonZero(-3, 3), m2 = randNonZero(-3, 3)
      if (m1 === m2) return null
      const [s, t] = [randNonZero(-3, 3), randNonZero(-3, 3)], [u, w] = [randNonZero(-3, 3), randNonZero(-3, 3)]
      if (s === t || u === w) return null
      const P = (d: number, m: number) => pt(x0 + d, y0 + m * d)
      const eqAB = `y = ${poly([m1, 'x'], [y0 - m1 * x0, ''])}`
      return oneOf(
        () => pair(`A${P(s, m1)}, B${P(t, m1)}, C${P(u, m2)} et D${P(w, m2)}. Donne les coordonnées du point d'intersection des droites (AB) et (CD).`, x0, y0, {
          explanation: `(AB) : ${eqAB} ; (CD) : y = ${poly([m2, 'x'], [y0 - m2 * x0, ''])}. En égalant : x = ${fmt(x0)}, puis y = ${fmt(y0)}.`,
        }),
        () => pair(`A${P(s, m1)} et B${P(t, m1)}. Donne les coordonnées du point d'intersection de la droite (AB) et de la droite d'équation y = ${poly([m2, 'x'], [y0 - m2 * x0, ''])}.`, x0, y0, {
          explanation: `(AB) : ${eqAB}. En égalant avec y = ${poly([m2, 'x'], [y0 - m2 * x0, ''])} : x = ${fmt(x0)}, puis y = ${fmt(y0)}.`,
        }),
        () => {
          const b0 = y0 - m1 * x0
          if (m1 === 0) return null
          return numeric(`A${P(s, m1)} et B${P(t, m1)}. En quel point la droite (AB) coupe-t-elle l'axe des ordonnées ? Donne son ordonnée.`, b0, {
            explanation: `(AB) a pour coefficient directeur ${fmt(m1)} et passe par A : p = ${fmt(y0 + m1 * s)} − ${par(m1)} × ${par(x0 + s)} = ${fmt(b0)}.`,
          })
        },
      )
    }),
    // Rattrapages et croisements
    () => retry(() => {
      const obj = pick([{ n: 'cavalier', N: 'Un premier cavalier' }, { n: 'cycliste', N: 'Un premier cycliste' }, { n: 'messager', N: 'Un premier messager' }, { n: 'coureur', N: 'Un premier coureur' }])
      return oneOf(
        () => {
          const v1 = randInt(8, 20), v2 = v1 + randInt(2, 12), h = pick([0.5, 1, 1.5, 2]), t = (v1 * h) / (v2 - v1)
          if (!Number.isInteger(t * 2) || t > 10) return null
          return numeric(`${obj.N} part à ${v1} km/h. ${fmt(h)} h plus tard, un second ${obj.n} part du même endroit, sur la même route, à ${v2} km/h. Au bout de combien d'heures après son départ le second rattrape-t-il le premier ?`, t, {
            explanation: `Après t heures pour le second : il a parcouru ${v2}t km, le premier ${v1}(t + ${fmt(h)}) km. ${v2}t = ${v1}t + ${fmt(v1 * h)} donne ${v2 - v1}t = ${fmt(v1 * h)}, t = ${fmt(t)} h.`,
          })
        },
        () => {
          const v1 = randInt(8, 20), v2 = randInt(8, 20), t = pick([0.5, 1, 1.5, 2, 2.5, 3]), D = (v1 + v2) * t
          return numeric(`Deux ${obj.n}s partent au même moment de deux villages distants de ${fmt(D)} km et se dirigent l'un vers l'autre, à ${v1} km/h et à ${v2} km/h. Au bout de combien d'heures se croisent-ils ?`, t, {
            explanation: `Après t heures, ils ont parcouru ensemble ${v1}t + ${v2}t = ${v1 + v2}t km : ${v1 + v2}t = ${fmt(D)}, donc t = ${fmt(t)} h.`,
          })
        },
        () => {
          const v1 = randInt(8, 20), v2 = v1 + randInt(2, 12), h = pick([1, 2]), t = (v1 * h) / (v2 - v1)
          if (!Number.isInteger(t) || t > 10) return null
          return numeric(`${obj.N} part à ${v1} km/h. ${h} h plus tard, un second ${obj.n} part du même endroit, sur la même route, à ${v2} km/h. À quelle distance (en km) du point de départ le rattrape-t-il ?`, v2 * t, {
            explanation: `${v2}t = ${v1}(t + ${h}) donne ${v2 - v1}t = ${v1 * h}, t = ${t} h ; distance : ${v2} × ${t} = ${v2 * t} km.`,
          })
        },
      )
    }),
  ],
]

// ── Statistiques & probabilités (les érudits du monastère) ───────────────
/** Liste « a, b et c ». */
const listFr = (items: string[]) => (items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} et ${items[items.length - 1]}`)
const shuffled = <T,>(a: T[]) => [...a].sort(() => Math.random() - 0.5)

const stat: Tiers = [
  [
    // Moyennes pondérées simples
    () => retry(() => {
      const who = prenom()
      return oneOf(
        () => {
          const n1 = randInt(6, 18), n2 = randInt(6, 18), c1 = randInt(1, 3), c2 = randInt(1, 3)
          if (c1 === c2) return null
          const mean = r2((n1 * c1 + n2 * c2) / (c1 + c2))
          return numeric(`${who} a eu ${n1} (coef. ${c1}) et ${n2} (coef. ${c2}). Quelle est sa moyenne ? (arrondie au centième)`, mean, {
            explanation: `(${n1} × ${c1} + ${n2} × ${c2}) ÷ ${c1 + c2} = ${n1 * c1 + n2 * c2} ÷ ${c1 + c2} ≈ ${fmt(mean)}.`,
          })
        },
        () => {
          const ns = [randInt(6, 18), randInt(6, 18), randInt(6, 18)], cs = [randInt(1, 2), randInt(1, 3), randInt(2, 4)]
          const S = ns[0] * cs[0] + ns[1] * cs[1] + ns[2] * cs[2], C = sum(cs), mean = r2(S / C)
          return numeric(`Au premier trimestre, ${who} a obtenu ${ns[0]} (coef. ${cs[0]}), ${ns[1]} (coef. ${cs[1]}) et ${ns[2]} (coef. ${cs[2]}). Quelle est sa moyenne ? (arrondie au centième)`, mean, {
            explanation: `(${ns.map((n, i) => `${n} × ${cs[i]}`).join(' + ')}) ÷ ${C} = ${S} ÷ ${C} ≈ ${fmt(mean)}.`,
          })
        },
        () => {
          const m1 = randInt(1, 5), p1 = randInt(2, 6), m2 = randInt(1, 5), p2 = randInt(7, 12), mean = r2((m1 * p1 + m2 * p2) / (m1 + m2))
          return numeric(`${who} mélange ${m1} kg de café à ${p1} € le kg et ${m2} kg de café à ${p2} € le kg. Quel est le prix moyen d'un kilo du mélange (en €, arrondi au centième) ?`, mean, {
            explanation: `Prix total ${m1} × ${p1} + ${m2} × ${p2} = ${m1 * p1 + m2 * p2} € pour ${m1 + m2} kg : ${m1 * p1 + m2 * p2} ÷ ${m1 + m2} ≈ ${fmt(mean)} €.`,
          })
        },
        () => {
          const d = randInt(5, 18), c = randInt(4, 18), k = randInt(2, 4), mean = r2((d + k * c) / (k + 1))
          return numeric(`${who} a eu ${d} au devoir maison (coefficient 1) et ${c} au contrôle, qui compte ${k} fois plus. Quelle est sa moyenne ? (arrondie au centième)`, mean, {
            explanation: `Le contrôle a le coefficient ${k} : (${d} + ${c} × ${k}) ÷ ${k + 1} = ${d + k * c} ÷ ${k + 1} ≈ ${fmt(mean)}.`,
          })
        },
      )
    }),
    // Moyenne d'une série
    () => retry(() => {
      const ctx = pick([
        { t: (n: number) => `Voici l'âge (en années) de ${n} moines du monastère :`, lo: 20, hi: 80, u: 'ans' },
        { t: (n: number) => `Voici les scores ${de(prenom())} sur ${n} parties d'un jeu vidéo :`, lo: 50, hi: 150, u: 'points' },
        { t: (n: number) => `Voici le nombre de pages copiées par ${pick(MOINES)} pendant ${n} jours :`, lo: 3, hi: 20, u: 'pages' },
        { t: (n: number) => `Voici les temps (en min) de ${n} coureurs sur un 10 km :`, lo: 38, hi: 70, u: 'min' },
        { t: (n: number) => `Voici les notes ${de(prenom())} à ses ${n} derniers contrôles :`, lo: 4, hi: 20, u: 'points' },
      ])
      const n = randInt(4, 6), vals = Array.from({ length: n }, () => randInt(ctx.lo, ctx.hi)), s = sum(vals)
      if ((s * 100) % n) return null
      return numeric(`${ctx.t(n)} ${vals.join(' ; ')}. Calcule la moyenne de cette série.`, s / n, { explanation: `Somme : ${s}, divisée par l'effectif ${n} : ${fmt(s / n)} ${ctx.u}.` })
    }),
    // Coefficient multiplicateur
    () => {
      const t = pick([2, 5, 10, 15, 20, 30, 40, 60]) * pick([1, -1]), c = 1 + t / 100
      const word = t > 0 ? 'hausse' : 'baisse'
      return oneOf(
        () => numeric(`Quel est le coefficient multiplicateur associé à une ${word} de ${Math.abs(t)} % ?`, c, { explanation: `1 ${t > 0 ? '+' : '−'} ${F(Math.abs(t), 100)} = ${fmt(c)}.` }),
        () => numeric(`Une quantité est multipliée par ${fmt(c)}. Quel est le taux d'évolution (en %, positif pour une hausse, négatif pour une baisse) ?`, t, {
          explanation: `${fmt(c)} = 1 ${t > 0 ? '+' : '−'} ${fmt(Math.abs(t) / 100)} : c'est une ${word} de ${Math.abs(t)} %.`,
        }),
        () => numeric(`${t > 0 ? 'Augmenter' : 'Diminuer'} un prix de ${Math.abs(t)} % revient à le multiplier par quel nombre ?`, c, { explanation: `On garde 100 % ${t > 0 ? '+' : '−'} ${Math.abs(t)} % = ${100 + t} % du prix, soit × ${fmt(c)}.` }),
        () => {
          const V = randInt(2, 20) * 50
          return numeric(`Un prix passe de ${V} € à ${fmt(V * c)} €. Par quel coefficient a-t-il été multiplié ?`, c, { explanation: `${fmt(V * c)} ÷ ${V} = ${fmt(c)} (c'est une ${word} de ${Math.abs(t)} %).` })
        },
      )
    },
    // Probabilités dans une urne
    () => {
      const ctx = pick([
        { t: 'Un moine tire au hasard un jeton dans une urne', c: ['rouges', 'blancs', 'noirs'], w: 'un jeton' },
        { t: 'On tire au hasard une bille dans un sac', c: ['rouges', 'bleues', 'vertes'], w: 'une bille' },
        { t: 'Dans un jeu vidéo, un coffre donne au hasard une gemme parmi un lot', c: ['rouges', 'bleues', 'violettes'], w: 'une gemme' },
      ])
      const counts = [randInt(2, 9), randInt(2, 9), randInt(2, 9)], i = randInt(0, 2), j = (i + 1) % 3, total = sum(counts)
      const desc = listFr(counts.map((n, k) => `${n} ${ctx.c[k]}`))
      const sing = (k: number) => ctx.c[k].replace(/s$/, '')
      return oneOf(
        () => fraction(`${ctx.t} contenant ${desc}. Quelle est la probabilité d'obtenir ${ctx.w} ${sing(i)} ?`, counts[i], total, {
          explanation: `Il y a ${counts[i]} issues favorables sur ${total} issues équiprobables : ${F(counts[i], total)}.`,
        }),
        () => fraction(`${ctx.t} contenant ${desc}. Quelle est la probabilité de ne pas obtenir ${ctx.w} ${sing(i)} ?`, total - counts[i], total, {
          explanation: `Il y a ${total} − ${counts[i]} = ${total - counts[i]} issues favorables sur ${total} : ${F(total - counts[i], total)}.`,
        }),
        () => fraction(`${ctx.t} contenant ${desc}. Quelle est la probabilité d'obtenir ${ctx.w} ${sing(i)} ou ${sing(j)} ?`, counts[i] + counts[j], total, {
          explanation: `${counts[i]} + ${counts[j]} = ${counts[i] + counts[j]} issues favorables sur ${total} : ${F(counts[i] + counts[j], total)}.`,
        }),
      )
    },
    // Pourcentages d'un effectif
    () => {
      const t = pick([5, 10, 15, 20, 25, 30, 40, 50, 60, 75]), N = randInt(2, 30) * 20
      const ctx = pick(['moines du monastère', 'élèves du lycée', 'spectateurs du concert', 'manuscrits de la bibliothèque', 'joueurs inscrits au tournoi'])
      return oneOf(
        () => numeric(`Combien font ${t} % des ${N} ${ctx} ?`, (t * N) / 100, { explanation: `${t} % de ${N} = ${F(t, 100)} × ${N} = ${fmt(t / 100)} × ${N} = ${fmt((t * N) / 100)}.` }),
        () => numeric(`Parmi les ${N} ${ctx}, ${fmt((t * N) / 100)} ont été tirés au sort pour une enquête. Quel pourcentage cela représente-t-il ?`, t, {
          explanation: `${F(fmt((t * N) / 100), N)} = ${fmt(t / 100)}, soit ${t} %.`,
        }),
        () => numeric(`Pour une enquête, on tire au sort ${t} % des ${ctx}, soit ${fmt((t * N) / 100)}. Combien y a-t-il de ${ctx} en tout ?`, N, {
          explanation: `${fmt(t / 100)} × total = ${fmt((t * N) / 100)}, donc total = ${fmt((t * N) / 100)} ÷ ${fmt(t / 100)} = ${N}.`,
        }),
      )
    },
    // Événement contraire
    () => {
      const p = randInt(1, 19) / 20
      const ctx = pick([
        { t: `La probabilité qu'il pleuve demain est ${fmt(p)}. Quelle est la probabilité qu'il ne pleuve pas ?` },
        { t: `La probabilité que le frère cuisinier rate son pain est ${fmt(p)}. Quelle est la probabilité qu'il le réussisse ?` },
        { t: `Pour un événement A, P(A) = ${fmt(p)}. Calcule P(Ā), la probabilité de l'événement contraire.` },
        { t: `La probabilité de gagner à un jeu de fête foraine est ${fmt(p)}. Quelle est la probabilité de perdre ?` },
        { t: `Un archer touche la cible avec une probabilité de ${fmt(p)}. Quelle est la probabilité qu'il la manque ?` },
      ])
      return numeric(ctx.t, r2(1 - p), { explanation: `Événement contraire : 1 − ${fmt(p)} = ${fmt(r2(1 - p))}.` })
    },
  ],
  [
    // Taux d'évolution entre deux valeurs
    () => {
      const v0 = randInt(2, 20) * 20, t = pick([5, 10, 15, 20, 25, 30, 40, 50]) * pick([1, -1])
      const v1 = (v0 * (100 + t)) / 100, what = pick(['Le prix d’un manuscrit', 'Le prix d’une console', 'Le nombre de visiteurs d’un musée', 'Le prix d’un cheval'])
      const unit = /visiteurs/.test(what) ? '' : what.includes('console') ? ' €' : ' écus'
      return oneOf(
        () => numeric(`${what} passe de ${v0}${unit} à ${fmt(v1)}${unit}. Quel est le taux d'évolution (en %, négatif pour une baisse) ?`, t, {
          explanation: `${F(`${fmt(v1)} − ${v0}`, v0)} = ${fmt(t / 100)}, soit ${fmt(t)} %.`,
        }),
        () => numeric(`${what} passe de ${v0}${unit} à ${fmt(v1)}${unit}. Par quel coefficient a-t-il été multiplié ?`, 1 + t / 100, {
          explanation: `${fmt(v1)} ÷ ${v0} = ${fmt(1 + t / 100)}.`,
        }),
        () => numeric(`L'an dernier, ${what.charAt(0).toLowerCase() + what.slice(1)} était de ${v0}${unit} ; cette année, il est de ${fmt(v1)}${unit}. De quel pourcentage a-t-il ${t > 0 ? 'augmenté' : 'baissé'} ?`, Math.abs(t), {
          explanation: `Variation : ${fmt(v1 - v0)}${unit}, rapportée à ${v0} : ${F(fmt(Math.abs(v1 - v0)), v0)} = ${fmt(Math.abs(t) / 100)}, soit ${Math.abs(t)} %.`,
        }),
      )
    },
    // Médiane et étendue
    () => {
      const n = pick([7, 9, 11])
      const ctxs = ['Voici une série', 'Voici le nombre de visiteurs d’une exposition, heure par heure', 'Voici le nombre de flèches tirées par des archers', 'Voici les températures (en °C) relevées pendant plusieurs jours']
      return oneOf(
        () => {
          const vals = Array.from({ length: n }, () => randInt(1, 30)).sort((a, b) => a - b)
          return numeric(`${pick(ctxs)} : ${shuffled(vals).join(' ; ')}. Quelle est sa médiane ?`, vals[(n - 1) / 2], {
            explanation: `On range la série dans l'ordre : ${vals.join(' ; ')}. Il y a ${n} valeurs, la médiane est la ${(n + 1) / 2}e : ${vals[(n - 1) / 2]}.`,
          })
        },
        () => retry(() => {
          const m = n - 1, vals = Array.from({ length: m }, () => randInt(1, 30)).sort((a, b) => a - b)
          const a = vals[m / 2 - 1], b = vals[m / 2]
          if ((a + b) % 2 === 0) return null
          return numeric(`${pick(ctxs)} : ${shuffled(vals).join(' ; ')}. Quelle est sa médiane ?`, (a + b) / 2, {
            explanation: `On range la série : ${vals.join(' ; ')}. Il y a ${m} valeurs (nombre pair) : la médiane est la moyenne des ${m / 2}e et ${m / 2 + 1}e valeurs, (${a} + ${b}) ÷ 2 = ${fmt((a + b) / 2)}.`,
          })
        }),
        () => retry(() => {
          const vals = Array.from({ length: n }, () => randInt(1, 40))
          const e = Math.max(...vals) - Math.min(...vals)
          if (vals.includes(e)) return null
          return numeric(`${pick(ctxs)} : ${vals.join(' ; ')}. Quelle est son étendue ?`, e, {
            explanation: `Étendue = plus grande valeur − plus petite valeur = ${Math.max(...vals)} − ${Math.min(...vals)} = ${e}.`,
          })
        }),
        () => retry(() => {
          const m = n - 1, vals = Array.from({ length: m }, () => randInt(1, 30)).sort((a, b) => a - b)
          const a = vals[m / 2 - 1], b = vals[m / 2]
          if ((a + b) % 2 === 0) return null
          return numeric(`Une série de ${m} valeurs, déjà rangée dans l'ordre croissant : ${vals.join(' ; ')}. Quelle est sa médiane ?`, (a + b) / 2, {
            explanation: `${m} valeurs : la médiane est la moyenne des ${m / 2}e et ${m / 2 + 1}e valeurs, (${a} + ${b}) ÷ 2 = ${fmt((a + b) / 2)}.`,
          })
        }),
      )
    },
    // Appliquer un pourcentage
    () => {
      const V = randInt(4, 60) * 5, t = pick([5, 10, 15, 20, 25, 30, 40, 50]), up = pick([true, false])
      const what = pick([{ t: 'Un manuscrit enluminé coûte', u: 'écus' }, { t: 'Un jeu vidéo coûte', u: '€' }, { t: 'Un vélo coûte', u: '€' }, { t: 'Un billet de train coûte', u: '€' }, { t: 'Une cloche pour le monastère coûte', u: 'écus' }])
      const c = 1 + (up ? t : -t) / 100, v = r2(V * c)
      return oneOf(
        () => numeric(`${what.t} ${V} ${what.u}. Son prix ${up ? 'augmente' : 'baisse'} de ${t} %. Quel est son nouveau prix (en ${what.u}) ?`, v, {
          explanation: `Coefficient multiplicateur : ${fmt(c)}. ${V} × ${fmt(c)} = ${fmt(v)} ${what.u}.`,
        }),
        () => numeric(`Pendant les soldes, un article à ${V} € est affiché « −${t} % ». Combien le paie-t-on (en €) ?`, r2(V * (1 - t / 100)), {
          explanation: `${V} × ${fmt(1 - t / 100)} = ${fmt(r2(V * (1 - t / 100)))} €.`,
        }),
        () => numeric(`${what.t} ${V} ${what.u}. Son prix ${up ? 'augmente' : 'baisse'} de ${t} %. De combien de ${what.u} varie-t-il ? (réponse signée)`, r2(V * c - V), {
          explanation: `${t} % de ${V} = ${fmt(r2((V * t) / 100))} ${what.u}, ${up ? 'en plus' : 'en moins'} : ${fmt(r2(V * c - V))}.`,
        }),
      )
    },
    // Moyenne à partir des effectifs
    () => retry(() => {
      const xs = [randInt(2, 6), 0, 0]
      xs[1] = xs[0] + randInt(1, 4)
      xs[2] = xs[1] + randInt(1, 4)
      const ns = [randInt(2, 8), randInt(2, 8), randInt(2, 8)], N = sum(ns), S = xs[0] * ns[0] + xs[1] * ns[1] + xs[2] * ns[2]
      if ((S * 100) % N || S % N === 0) return null
      const intro = pick([
        `Au monastère, on a compté les manuscrits copiés ce mois-ci : ${ns[0]} moines en ont copié ${xs[0]}, ${ns[1]} moines en ont copié ${xs[1]} et ${ns[2]} moines en ont copié ${xs[2]}.`,
        `Dans un club, ${ns[0]} joueurs ont marqué ${xs[0]} buts, ${ns[1]} joueurs ${xs[1]} buts et ${ns[2]} joueurs ${xs[2]} buts cette saison.`,
        `Dans un club de lecture, ${ns[0]} membres ont lu ${xs[0]} livres ce mois-ci, ${ns[1]} membres en ont lu ${xs[1]} et ${ns[2]} membres en ont lu ${xs[2]}.`,
        `Nombre de pommes ramassées par arbre — valeur ${xs[0]} : effectif ${ns[0]} ; valeur ${xs[1]} : effectif ${ns[1]} ; valeur ${xs[2]} : effectif ${ns[2]}.`,
      ])
      return numeric(`${intro} Quelle est la moyenne de cette série ?`, S / N, {
        explanation: `Moyenne pondérée par les effectifs : (${xs[0]} × ${ns[0]} + ${xs[1]} × ${ns[1]} + ${xs[2]} × ${ns[2]}) ÷ ${N} = ${S} ÷ ${N} = ${fmt(S / N)}.`,
      })
    }),
    // Lancer d'un dé
    () => {
      const n = pick([6, 8, 10, 12, 20]), kind = pick(['mult', 'ge', 'prime'])
      const faces = Array.from({ length: n }, (_, i) => i + 1)
      const isPrime = (v: number) => v > 1 && Array.from({ length: v - 2 }, (_, i) => i + 2).every((d) => v % d)
      let ev: string, ok: (v: number) => boolean
      if (kind === 'mult') { const k = randInt(2, 5); ev = `un multiple de ${k}`; ok = (v) => v % k === 0 }
      else if (kind === 'ge') { const a = randInt(2, n - 1); ev = `un nombre supérieur ou égal à ${a}`; ok = (v) => v >= a }
      else { ev = 'un nombre premier'; ok = isPrime }
      const good = faces.filter(ok)
      return fraction(`On lance un dé équilibré à ${n} faces numérotées de 1 à ${n}. Quelle est la probabilité d'obtenir ${ev} ?`, good.length, n, {
        explanation: `Issues favorables : ${good.join(' ; ')}, soit ${good.length} sur ${n} : ${F(good.length, n)}.`,
      })
    },
  ],
  [
    // Évolutions successives
    () => {
      const what = pick([{ t: 'Le prix d’un article', u: '' }, { t: 'La population d’un village', u: '' }, { t: 'Le loyer d’un atelier', u: '' }, { t: 'Le nombre d’abonnés d’une chaîne', u: '' }])
      const ev = (t: number) => `${t > 0 ? 'augmente' : 'baisse'} de ${Math.abs(t)} %`
      return oneOf(
        () => {
          const t = pick([10, 20, 25, 50]), up = pick([true, false]), g = ((1 + t / 100) * (1 - t / 100) - 1) * 100
          return numeric(`${what.t} ${up ? 'augmente' : 'baisse'} de ${t} % puis ${up ? 'baisse' : 'augmente'} de ${t} %. Quelle est l'évolution globale (en %, réponse signée) ?`, g, {
            explanation: `${fmt(1 + t / 100)} × ${fmt(1 - t / 100)} = ${fmt((1 + t / 100) * (1 - t / 100))} : c'est une baisse de ${fmt((t * t) / 100)} %, pas un retour à la valeur de départ !`,
          })
        },
        () => retry(() => {
          const t1 = pick([10, 20, 25, 50, -10, -20, -50]), t2 = pick([10, 20, 30, 40, -10, -20, -25]), c = (1 + t1 / 100) * (1 + t2 / 100), g = r2((c - 1) * 100)
          if (t1 === -t2 || Math.abs(c - 1) < 1e-9) return null
          return numeric(`${what.t} ${ev(t1)} puis ${ev(t2)}. Quelle est l'évolution globale (en %, réponse signée) ?`, g, {
            explanation: `Coefficient global : ${fmt(1 + t1 / 100)} × ${fmt(1 + t2 / 100)} = ${fmt(c)}, soit ${fmt(g)} % (et non ${fmt(t1 + t2)} %).`,
          })
        }),
        () => retry(() => {
          const t1 = pick([10, 20, 25, 50, -10, -20]), t2 = pick([10, 20, 30, -10, -20, -25]), c = (1 + t1 / 100) * (1 + t2 / 100)
          if (t1 === -t2) return null
          return numeric(`${what.t} ${ev(t1)} puis ${ev(t2)}. Par quel coefficient a-t-il été multiplié au total ?`, c, {
            explanation: `On multiplie les coefficients : ${fmt(1 + t1 / 100)} × ${fmt(1 + t2 / 100)} = ${fmt(c)}.`,
          })
        }),
      )
    },
    // Évolution réciproque
    () => {
      const [t, r] = pick([[25, -20], [100, -50], [-20, 25], [-50, 100], [60, -37.5], [-60, 150], [150, -60], [-37.5, 60]])
      return oneOf(
        () => numeric(`Un prix ${t > 0 ? 'augmente' : 'baisse'} de ${fmt(Math.abs(t))} %. De quel pourcentage doit-il évoluer pour revenir à sa valeur initiale ? (réponse signée, en %)`, r, {
          explanation: `Coefficient réciproque : 1 ÷ ${fmt(1 + t / 100)} = ${fmt(1 + r / 100)}, soit ${fmt(r)} %.`,
        }),
        () => numeric(`Après ${t > 0 ? 'une hausse' : 'une baisse'} de ${fmt(Math.abs(t))} %, la fréquentation d'un musée doit revenir à son niveau de départ. Quel taux d'évolution faut-il ? (réponse signée, en %)`, r, {
          explanation: `Il faut multiplier par 1 ÷ ${fmt(1 + t / 100)} = ${fmt(1 + r / 100)}, soit une évolution de ${fmt(r)} %.`,
        }),
        () => numeric(`Une quantité a été multipliée par ${fmt(1 + t / 100)}. Par quel nombre faut-il la multiplier pour retrouver sa valeur de départ ?`, 1 + r / 100, {
          explanation: `Il faut multiplier par l'inverse : 1 ÷ ${fmt(1 + t / 100)} = ${fmt(1 + r / 100)}.`,
        }),
      )
    },
    // Retrouver une valeur initiale
    () => {
      const t = pick([10, 20, 25, 50, -10, -20, -25, -40]), V0 = randInt(2, 30) * 20, V = (V0 * (100 + t)) / 100
      const what = pick([{ t: 'le prix d’un cheval vaut', u: 'écus' }, { t: 'le prix d’une trottinette vaut', u: '€' }, { t: 'le loyer d’un atelier vaut', u: '€' }, { t: 'le prix d’un psautier vaut', u: 'écus' }])
      return oneOf(
        () => numeric(`Après une ${t > 0 ? 'hausse' : 'baisse'} de ${Math.abs(t)} %, ${what.t} ${fmt(V)} ${what.u}. Quelle était sa valeur initiale (en ${what.u}) ?`, V0, {
          explanation: `Valeur initiale × ${fmt(1 + t / 100)} = ${fmt(V)}, donc valeur initiale = ${fmt(V)} ÷ ${fmt(1 + t / 100)} = ${V0} ${what.u}.`,
        }),
        () => {
          const r = pick([10, 20, 25, 40, 50]), P0 = randInt(2, 30) * 20, P = (P0 * (100 - r)) / 100
          return numeric(`Pendant les soldes, ${prenom()} paie ${fmt(P)} € un article affiché « −${r} % ». Quel était son prix avant les soldes (en €) ?`, P0, {
            explanation: `Prix initial × ${fmt(1 - r / 100)} = ${fmt(P)}, donc prix initial = ${fmt(P)} ÷ ${fmt(1 - r / 100)} = ${P0} €.`,
          })
        },
        () => {
          const r = pick([5, 10, 20, 25, 50]), N0 = randInt(4, 40) * 20, N1 = (N0 * (100 + r)) / 100
          return numeric(`Cette année, un club compte ${fmt(N1)} adhérents, soit ${r} % de plus que l'an dernier. Combien d'adhérents avait-il l'an dernier ?`, N0, {
            explanation: `Adhérents de l'an dernier × ${fmt(1 + r / 100)} = ${fmt(N1)}, donc ${fmt(N1)} ÷ ${fmt(1 + r / 100)} = ${N0}.`,
          })
        },
      )
    },
    // Tableau à double entrée
    () => retry(() => {
      const ctx = pick([
        { pop: 'élèves dans un lycée', qui: 'un élève', G: 'demi-pensionnaires', g: 'demi-pensionnaire', P: 'filles', asks: ['une fille externe', 'un garçon demi-pensionnaire', 'un garçon externe'] },
        { pop: 'moines dans un monastère', qui: 'un moine', G: 'copistes', g: 'copiste', P: 'novices', asks: ['un novice qui n’est pas copiste', 'un copiste qui n’est pas novice', 'un moine ni novice ni copiste'] },
      ])
      const N = randInt(10, 40) * 10, g = randInt(Math.round(N * 0.3), Math.round(N * 0.7)), p = randInt(Math.round(N * 0.3), Math.round(N * 0.7)), k = randInt(5, Math.min(g, p) - 5)
      const vals = [p - k, g - k, N - g - p + k], i = randInt(0, 2)
      if (vals.some((v) => v < 3)) return null
      const expl = [`${ctx.P} : ${p}, dont ${k} ${ctx.G} ; il en reste ${p} − ${k} = ${vals[0]}.`, `${ctx.G} : ${g}, dont ${k} ${ctx.P} ; il en reste ${g} − ${k} = ${vals[1]}.`, `${N} − ${g} − ${p} + ${k} = ${vals[2]} (on a retiré deux fois les ${k} qui sont dans les deux groupes).`][i]
      return fraction(`Il y a ${N} ${ctx.pop} : ${g} sont ${ctx.G} et ${p} sont des ${ctx.P}, dont ${k} ${ctx.G}. On choisit ${ctx.qui} au hasard : quelle est la probabilité de choisir ${ctx.asks[i]} ?`, vals[i], N, {
        explanation: `${expl} Probabilité : ${F(vals[i], N)}.`,
      })
    }),
    // Note ou valeur manquante pour une moyenne
    () => retry(() => {
      const who = prenom()
      return oneOf(
        () => {
          const k = randInt(3, 4), notes = Array.from({ length: k }, () => randInt(6, 18)), M = randInt(10, 15), x = M * (k + 1) - sum(notes)
          if (x < 0 || x > 20) return null
          return numeric(`${who} a obtenu ${notes.join(' ; ')} à ses ${k} premiers devoirs. Quelle note faut-il au prochain devoir (même coefficient) pour avoir exactement ${M} de moyenne ?`, x, {
            explanation: `Il faut un total de ${M} × ${k + 1} = ${M * (k + 1)} points ; on en a ${sum(notes)}, il manque ${x}.`,
          })
        },
        () => {
          const k = randInt(4, 6), runs = Array.from({ length: k }, () => randInt(5, 12)), M = randInt(7, 10), x = M * (k + 1) - sum(runs)
          if (x < 1 || x > 25) return null
          return numeric(`${who} a couru ${runs.join(' ; ')} km lors de ses ${k} dernières sorties. Combien de km faut-il courir à la prochaine sortie pour atteindre une moyenne de ${M} km par sortie ?`, x, {
            explanation: `Total nécessaire : ${M} × ${k + 1} = ${M * (k + 1)} km ; déjà parcourus : ${sum(runs)} km ; il manque ${x} km.`,
          })
        },
        () => {
          const k = randInt(3, 5), sc = Array.from({ length: k }, () => randInt(40, 120)), M = randInt(60, 100), x = M * (k + 1) - sum(sc)
          if (x < 0 || x > 200) return null
          return numeric(`Dans un jeu, ${who} a marqué ${sc.join(' ; ')} points lors de ${k} parties. Combien de points faut-il marquer à la partie suivante pour que la moyenne soit exactement ${M} ?`, x, {
            explanation: `Total nécessaire : ${M} × ${k + 1} = ${M * (k + 1)} ; déjà marqués : ${sum(sc)} ; il manque ${x} points.`,
          })
        },
      )
    }),
    // Pourcentage d'un pourcentage
    () => {
      const t1 = pick([20, 25, 40, 50, 60, 75, 80]), t2 = pick([10, 20, 25, 30, 40, 50])
      const ctx = pick([
        `${t1} % des moines du monastère sont copistes, et ${t2} % des copistes sont aussi enlumineurs. Quel pourcentage des moines sont enlumineurs ?`,
        `${t1} % des élèves d'un lycée font du sport en club, et ${t2} % d'entre eux font de la natation. Quel pourcentage des élèves du lycée font de la natation en club ?`,
        `${t1} % des joueurs d'un jeu en ligne ont atteint le niveau 10, et ${t2} % de ceux-ci ont battu le dragon. Quel pourcentage des joueurs a battu le dragon ?`,
      ])
      return numeric(ctx, (t1 * t2) / 100, { explanation: `${t2} % de ${t1} % : ${fmt(t2 / 100)} × ${fmt(t1 / 100)} = ${fmt((t1 * t2) / 10000)}, soit ${fmt((t1 * t2) / 100)} %.` })
    },
  ],
  [
    // Probabilité d'une réunion
    () => retry(() => {
      const pa = randInt(2, 6) / 10, pb = randInt(2, 6) / 10, pab = randInt(1, Math.round(Math.min(pa, pb) * 10) - 1) / 10, pu = r2(pa + pb - pab)
      if (pab <= 0 || [pa, pb, pab].includes(pu) || pu > 1) return null
      const ctx = pick([
        { A: 'l’élève fait du sport', B: 'l’élève joue d’un instrument', q: 'qu’il fasse du sport ou joue d’un instrument (ou les deux)', who: 'On choisit un élève au hasard dans un lycée.' },
        { A: 'le moine est copiste', B: 'le moine est enlumineur', q: 'qu’il soit copiste ou enlumineur (ou les deux)', who: 'On choisit un moine au hasard au monastère.' },
        { A: 'le client achète du pain', B: 'le client achète un gâteau', q: 'qu’il achète du pain ou un gâteau (ou les deux)', who: 'On choisit un client au hasard dans une boulangerie.' },
      ])
      return oneOf(
        () => numeric(`P(A) = ${fmt(pa)}, P(B) = ${fmt(pb)} et P(A ∩ B) = ${fmt(pab)}. Calcule P(A ∪ B).`, pu, { explanation: `P(A ∪ B) = P(A) + P(B) − P(A ∩ B) = ${fmt(pa)} + ${fmt(pb)} − ${fmt(pab)} = ${fmt(pu)}.` }),
        () => numeric(`${ctx.who} On note A : « ${ctx.A} » et B : « ${ctx.B} ». On sait que P(A) = ${fmt(pa)}, P(B) = ${fmt(pb)} et P(A ∩ B) = ${fmt(pab)}. Quelle est la probabilité ${ctx.q} ?`, pu, {
          explanation: `C'est P(A ∪ B) = ${fmt(pa)} + ${fmt(pb)} − ${fmt(pab)} = ${fmt(pu)}.`,
        }),
        () => {
          const qa = r2(pa / 2), qb = r2(pb / 2), s = r2(qa + qb)
          if ([qa, qb].includes(s)) return null
          return numeric(`A et B sont deux événements incompatibles (ils ne peuvent pas se produire en même temps), avec P(A) = ${fmt(qa)} et P(B) = ${fmt(qb)}. Calcule P(A ∪ B).`, s, {
            explanation: `Incompatibles : P(A ∩ B) = 0, donc P(A ∪ B) = ${fmt(qa)} + ${fmt(qb)} = ${fmt(s)}.`,
          })
        },
        () => numeric(`P(A) = ${fmt(pa)}, P(B) = ${fmt(pb)} et P(A ∩ B) = ${fmt(pab)}. Calcule la probabilité que ni A ni B ne se réalise.`, r2(1 - pu), {
          explanation: `P(A ∪ B) = ${fmt(pa)} + ${fmt(pb)} − ${fmt(pab)} = ${fmt(pu)} ; « ni A ni B » est l'événement contraire : 1 − ${fmt(pu)} = ${fmt(r2(1 - pu))}.`,
        }),
      )
    }),
    // Médiane et fréquences dans un tableau d'effectifs
    () => retry(() => {
      const xs: number[] = []
      let v = randInt(0, 2)
      const m = randInt(4, 5)
      for (let i = 0; i < m; i++) { xs.push(v); v += randInt(1, 2) }
      let ns = xs.map(() => randInt(1, 9))
      const ctx = pick(['manuscrits copiés par moine', 'buts marqués par match', 'frères et sœurs par élève', 'cierges allumés par jour'])
      const table = () => `Nombre de ${ctx} : ${xs.map((x, i) => `${x} (effectif ${ns[i]})`).join(' ; ')}.`
      return oneOf(
        () => {
          const N = sum(ns), flat = xs.flatMap((x, i) => Array(ns[i]).fill(x) as number[])
          const med = N % 2 ? flat[(N - 1) / 2] : (flat[N / 2 - 1] + flat[N / 2]) / 2
          return numeric(`${table()} Quelle est la médiane de cette série ?`, med, {
            explanation: `Effectif total ${N}. ${N % 2 ? `La médiane est la ${(N + 1) / 2}e valeur` : `La médiane est la moyenne des ${N / 2}e et ${N / 2 + 1}e valeurs`} de la série rangée : ${fmt(med)}.`,
          })
        },
        () => {
          // la moitié de l'effectif tombe pile entre deux valeurs : la médiane est entre elles
          const j = randInt(1, m - 2), L = sum(ns.slice(0, j + 1)), rest = m - j - 1
          const tail_ = Array.from({ length: rest }, () => 1)
          let left = L - rest
          if (left < 0) return null
          for (let k = 0; k < rest && left > 0; k++) {
            const add = k === rest - 1 ? left : randInt(0, Math.min(8, left))
            if (tail_[k] + add > 9) return null
            tail_[k] += add
            left -= add
          }
          if (left !== 0) return null
          ns = [...ns.slice(0, j + 1), ...tail_]
          for (let k = j + 1; k < m; k++) xs[k] = xs[k - 1] + (k === j + 1 ? 1 : randInt(1, 2))
          const N = 2 * L, med = (xs[j] + xs[j + 1]) / 2
          return numeric(`${table()} Quelle est la médiane de cette série ?`, med, {
            explanation: `Effectif total ${N} (pair) : les ${L} premières valeurs valent au plus ${xs[j]}, la ${L}e vaut ${xs[j]} et la ${L + 1}e vaut ${xs[j + 1]}. Médiane : (${xs[j]} + ${xs[j + 1]}) ÷ 2 = ${fmt(med)}.`,
          })
        },
        () => {
          const N = sum(ns), S = xs.reduce((s, x, i) => s + x * ns[i], 0), mean = Math.round((S / N) * 10) / 10
          if (S % N === 0) return null
          return numeric(`${table()} Quelle est la moyenne de cette série ? (arrondie au dixième)`, mean, {
            explanation: `(${xs.map((x, i) => `${x} × ${ns[i]}`).join(' + ')}) ÷ ${N} = ${S} ÷ ${N} ≈ ${fmt(mean)}.`,
          })
        },
        () => {
          const N = sum(ns), j = randInt(1, m - 2), c = sum(ns.slice(0, j + 1)), f = Math.round((c / N) * 100)
          return numeric(`${table()} Quel pourcentage des valeurs est inférieur ou égal à ${xs[j]} ? (arrondi à l'unité)`, f, {
            explanation: `Effectif cumulé jusqu'à ${xs[j]} : ${ns.slice(0, j + 1).join(' + ')} = ${c}, sur ${N} : ${F(c, N)} ≈ ${f} %.`,
          })
        },
        () => {
          const N = sum(ns), j = randInt(0, m - 1), f = Math.round((ns[j] / N) * 100)
          return numeric(`${table()} Quelle est la fréquence de la valeur ${xs[j]}, en pourcentage ? (arrondie à l'unité)`, f, {
            explanation: `Effectif de la valeur ${xs[j]} : ${ns[j]}, sur un effectif total de ${N} : ${F(ns[j], N)} ≈ ${f} %.`,
          })
        },
      )
    }),
    // Probabilité d'une intersection
    () => retry(() => {
      const pab = randInt(1, 3) / 10, pa = pab + randInt(1, 4) / 10, pb = pab + randInt(1, 4) / 10, pu = r2(pa + pb - pab)
      if (pu > 1) return null
      return oneOf(
        () => numeric(`P(A) = ${fmt(r2(pa))}, P(B) = ${fmt(r2(pb))} et P(A ∪ B) = ${fmt(pu)}. Calcule P(A ∩ B).`, r2(pab), {
          explanation: `P(A ∪ B) = P(A) + P(B) − P(A ∩ B), donc P(A ∩ B) = ${fmt(r2(pa))} + ${fmt(r2(pb))} − ${fmt(pu)} = ${fmt(r2(pab))}.`,
        }),
        () => numeric(`P(A ∪ B) = ${fmt(pu)}, P(A ∩ B) = ${fmt(r2(pab))} et P(A) = ${fmt(r2(pa))}. Calcule P(B).`, r2(pb), {
          explanation: `P(A ∪ B) = P(A) + P(B) − P(A ∩ B), donc P(B) = ${fmt(pu)} − ${fmt(r2(pa))} + ${fmt(r2(pab))} = ${fmt(r2(pb))}.`,
        }),
        () => numeric(`Dans un club, la probabilité qu'un membre pratique le tennis est ${fmt(r2(pa))}, le badminton ${fmt(r2(pb))}, et au moins l'un des deux ${fmt(pu)}. Quelle est la probabilité qu'un membre pratique les deux ?`, r2(pab), {
          explanation: `P(T ∩ B) = P(T) + P(B) − P(T ∪ B) = ${fmt(r2(pa))} + ${fmt(r2(pb))} − ${fmt(pu)} = ${fmt(r2(pab))}.`,
        }),
      )
    }),
    // Deux groupes qui se chevauchent
    () => {
      const ctx = pick([
        { pop: 'Dans un monastère de', who: 'moines', A: 'copistes', B: 'enlumineurs', qui: 'un moine', both: 'à la fois copiste et enlumineur', only: 'copiste mais pas enlumineur' },
        { pop: 'Dans un lycée de', who: 'élèves', A: 'font du latin', B: 'font du grec', qui: 'un élève', both: 'fasse à la fois du latin et du grec', only: 'fasse du latin mais pas du grec' },
        { pop: 'Dans un club de', who: 'membres', A: 'jouent au tennis', B: 'jouent au badminton', qui: 'un membre', both: 'joue aux deux sports', only: 'joue au tennis mais pas au badminton' },
      ])
      const i = randInt(2, 10), a = i + randInt(3, 20), b = i + randInt(3, 20), c = randInt(2, 15), N = a + b - i + c, askBoth = pick([true, false])
      const intro = ctx.who === 'moines'
        ? `${ctx.pop} ${N} ${ctx.who}, ${a} sont ${ctx.A}, ${b} sont ${ctx.B} et ${c} ne sont ni l'un ni l'autre.`
        : `${ctx.pop} ${N} ${ctx.who}, ${a} ${ctx.A}, ${b} ${ctx.B} et ${c} ne font ni l'un ni l'autre.`
      return fraction(`${intro} On choisit ${ctx.qui} au hasard : quelle est la probabilité qu'il ${askBoth ? (ctx.who === 'moines' ? `soit ${ctx.both}` : ctx.both) : (ctx.who === 'moines' ? `soit ${ctx.only}` : ctx.only)} ?`, askBoth ? i : a - i, N, {
        explanation: `${N} − ${c} = ${N - c} sont dans au moins un des deux groupes, donc ${a} + ${b} − ${N - c} = ${i} sont dans les deux${askBoth ? '' : ` ; dans le premier seulement : ${a} − ${i} = ${a - i}`}. Probabilité : ${F(askBoth ? i : a - i, N)}.`,
      })
    },
    // Moyenne de deux groupes
    () => retry(() => {
      const ctx = pick([
        { g: ['la classe A', 'la classe B'], w: 'élèves', q: 'la moyenne au contrôle', il: 'elle', lo: 8, hi: 15 },
        { g: ['le monastère du Nord', 'le monastère du Sud'], w: 'moines', q: 'l’âge moyen', il: 'il', lo: 30, hi: 60 },
        { g: ['l’équipe rouge', 'l’équipe bleue'], w: 'joueurs', q: 'le score moyen', il: 'il', lo: 40, hi: 90 },
      ])
      const n1 = randInt(10, 35), n2 = randInt(10, 35), m1 = randInt(ctx.lo, ctx.hi), m2 = randInt(ctx.lo, ctx.hi), S = n1 * m1 + n2 * m2, N = n1 + n2
      if (m1 === m2 || (S * 100) % N) return null
      return oneOf(
        () => numeric(`Dans ${ctx.g[0]} (${n1} ${ctx.w}), ${ctx.q} vaut ${m1} ; dans ${ctx.g[1]} (${n2} ${ctx.w}), ${ctx.il} vaut ${m2}. Que vaut ${ctx.q} de l'ensemble des ${N} ${ctx.w} ?`, S / N, {
          explanation: `On ne fait pas la moyenne des moyennes : (${n1} × ${m1} + ${n2} × ${m2}) ÷ ${N} = ${S} ÷ ${N} = ${fmt(S / N)}.`,
        }),
        () => numeric(`Pour l'ensemble des ${N} ${ctx.w} de ${ctx.g[0]} et de ${ctx.g[1]}, ${ctx.q} vaut ${fmt(S / N)}. ${cap(ctx.g[0])} compte ${n1} ${ctx.w} et ${ctx.q} y vaut ${m1}. Que vaut ${ctx.q} dans ${ctx.g[1]} (${n2} ${ctx.w}) ?`, m2, {
          explanation: `Total général : ${N} × ${fmt(S / N)} = ${S} ; total de ${ctx.g[0]} : ${n1} × ${m1} = ${n1 * m1} ; reste ${S - n1 * m1} pour ${n2} ${ctx.w} : ${S - n1 * m1} ÷ ${n2} = ${m2}.`,
        }),
        () => numeric(`Dans ${ctx.g[0]} (${n1} ${ctx.w}), ${ctx.q} vaut ${m1} ; dans ${ctx.g[1]} (${n2} ${ctx.w}), ${ctx.il} vaut ${m2}. Quelle est la somme totale des valeurs des ${N} ${ctx.w} ?`, S, {
          explanation: `Somme = effectif × moyenne pour chaque groupe : ${n1} × ${m1} + ${n2} × ${m2} = ${n1 * m1} + ${n2 * m2} = ${S}.`,
        }),
      )
    }),
  ],
  [
    // Probabilités totales dans une population
    () => {
      const total = pick([100, 200, 400])
      const ctx = pick([
        { t: (A: number, B: number, pa: number, pb: number) => `Une armée de ${total} soldats compte ${A} archers et ${B} cavaliers. ${pa} % des archers et ${pb} % des cavaliers sont gradés. On choisit un soldat au hasard : quelle est la probabilité qu'il soit gradé ?`, w: 'Gradés' },
        { t: (A: number, B: number, pa: number, pb: number) => `Un atelier produit ${total} pièces : ${A} sur la machine 1 et ${B} sur la machine 2. ${pa} % des pièces de la machine 1 et ${pb} % de celles de la machine 2 sont défectueuses. On prend une pièce au hasard : quelle est la probabilité qu'elle soit défectueuse ?`, w: 'Pièces défectueuses' },
        { t: (A: number, B: number, pa: number, pb: number) => `Un lycée compte ${total} élèves : ${A} en seconde et ${B} en première. ${pa} % des secondes et ${pb} % des premières sont internes. On choisit un élève au hasard : quelle est la probabilité qu'il soit interne ?`, w: 'Internes' },
      ])
      const A = Math.round(pick([0.4, 0.5, 0.6, 0.7]) * total), B = total - A
      const pa = pick([10, 20, 30, 40]), pb = pick([25, 50, 20].filter((v) => v !== pa))
      const g = (A * pa) / 100 + (B * pb) / 100
      return numeric(ctx.t(A, B, pa, pb), g / total, {
        explanation: `${ctx.w} : ${pa} % de ${A} = ${fmt((A * pa) / 100)} et ${pb} % de ${B} = ${fmt((B * pb) / 100)}, soit ${fmt(g)} sur ${total} : ${fmt(g / total)}.`,
      })
    },
    // Dé : réunion et intersection
    () => retry(() => {
      const n = pick([6, 8, 10, 12]), a = randInt(2, n - 1), ge = pick([true, false]), or = pick([true, false])
      const [c1, t1] = pick<[string, (v: number) => boolean]>([['un nombre pair', (v) => v % 2 === 0], ['un nombre impair', (v) => v % 2 === 1], ['un multiple de 3', (v) => v % 3 === 0]])
      const t2 = (v: number) => (ge ? v >= a : v <= a)
      const good = Array.from({ length: n }, (_, i) => i + 1).filter((v) => (or ? t1(v) || t2(v) : t1(v) && t2(v)))
      if (!good.length || good.length === n) return null
      return fraction(`On lance un dé équilibré à ${n} faces numérotées de 1 à ${n}. On note A : « obtenir ${c1} » et B : « obtenir un nombre ${ge ? 'supérieur' : 'inférieur'} ou égal à ${a} ». Calcule P(A ${or ? '∪' : '∩'} B).`, good.length, n, {
        explanation: `A ${or ? '∪' : '∩'} B : faces qui vérifient ${or ? 'au moins une des deux conditions' : 'les deux conditions à la fois'} : ${good.join(' ; ')}, soit ${good.length} sur ${n}.`,
      })
    }),
    // Deux évolutions : valeur de départ
    () => retry(() => {
      const V0 = randInt(1, 10) * 100, t1 = pick([10, 20, 25, 50, -10, -20, -25]), t2 = pick([10, 20, 25, 50, -10, -20, -50])
      const c = (1 + t1 / 100) * (1 + t2 / 100), V = r2(V0 * c)
      if (Math.abs(c - 1) < 1e-9) return null
      const what = pick([{ t: 'le prix d’un cheval', u: 'écus' }, { t: 'le prix d’une console', u: '€' }, { t: 'le prix d’un manuscrit enluminé', u: 'écus' }, { t: 'le prix d’un vélo électrique', u: '€' }])
      const ev = (t: number) => `${t > 0 ? 'une hausse' : 'une baisse'} de ${Math.abs(t)} %`
      return numeric(`Après ${ev(t1)} puis ${ev(t2)}, ${what.t} vaut ${fmt(V)} ${what.u}. Quel était le prix de départ (en ${what.u}) ?`, V0, {
        explanation: `Coefficient global : ${fmt(1 + t1 / 100)} × ${fmt(1 + t2 / 100)} = ${fmt(c)}. Prix de départ : ${fmt(V)} ÷ ${fmt(c)} = ${V0} ${what.u}.`,
      })
    }),
    // Deux dés
    () => {
      const pairs: [number, number][] = []
      for (let i = 1; i <= 6; i++) for (let j = 1; j <= 6; j++) pairs.push([i, j])
      const kind = pick(['eq', 'ge', 'double', 'prod'])
      let ev: string, ok: (p: [number, number]) => boolean
      if (kind === 'eq') { const s = randInt(3, 11); ev = `une somme égale à ${s}`; ok = ([i, j]) => i + j === s }
      else if (kind === 'ge') { const s = randInt(8, 11); ev = `une somme supérieure ou égale à ${s}`; ok = ([i, j]) => i + j >= s }
      else if (kind === 'double') { ev = 'un double (deux fois le même nombre)'; ok = ([i, j]) => i === j }
      else { const s = pick([6, 12]); ev = `un produit égal à ${s}`; ok = ([i, j]) => i * j === s }
      const n = pairs.filter(ok).length
      return fraction(`${pick(['Deux moines lancent', 'On lance', 'Au jeu de l’oie, on lance'])} deux dés équilibrés à 6 faces. Quelle est la probabilité d'obtenir ${ev} ?`, n, 36, {
        explanation: `Il y a 6 × 6 = 36 issues équiprobables (tableau à double entrée), dont ${n} favorables : ${F(n, 36)}.`,
      })
    },
    // Nouvelle valeur et moyenne
    () => retry(() => {
      const ctx = pick([
        { g: 'moines du monastère', w: 'l’âge moyen', u: 'ans', n: 'nouveau frère', lo: 30, hi: 55, a: [18, 90] },
        { g: 'joueurs d’une équipe de basket', w: 'la taille moyenne', u: 'cm', n: 'nouveau joueur', lo: 180, hi: 195, a: [165, 215] },
        { g: 'élèves d’un groupe', w: 'la moyenne au contrôle', u: 'points', n: 'nouvel élève', lo: 9, hi: 14, a: [4, 20] },
      ])
      const n = randInt(8, 25), m = randInt(ctx.lo, ctx.hi), d = pick([-2, -1, 1, 2]), m2 = m + d, a = (n + 1) * m2 - n * m
      if (a < ctx.a[0] || a > ctx.a[1]) return null
      return numeric(`Pour les ${n} ${ctx.g}, ${ctx.w} est de ${m} ${ctx.u}. Un ${ctx.n} arrive et ${ctx.w} passe à ${m2} ${ctx.u}. Quelle valeur (en ${ctx.u}) correspond à ce ${ctx.n} ?`, a, {
        explanation: `Total avant : ${n} × ${m} = ${n * m} ; total après : ${n + 1} × ${m2} = ${(n + 1) * m2} ; différence : ${a} ${ctx.u}.`,
      })
    }),
    // Évolutions répétées
    () => {
      const t = pick([10, 20, 50, -10, -20, -50]), n = pick([2, 3]), c = 1 + t / 100, g = r2((c ** n - 1) * 100)
      const ctx = pick([
        `La bibliothèque du monastère voit son nombre de manuscrits ${t > 0 ? 'augmenter' : 'diminuer'} de ${Math.abs(t)} % par an pendant ${n} ans.`,
        `Le prix d'une action ${t > 0 ? 'augmente' : 'baisse'} de ${Math.abs(t)} % par an pendant ${n} ans.`,
        `Une population de lapins ${t > 0 ? 'augmente' : 'diminue'} de ${Math.abs(t)} % chaque année pendant ${n} ans.`,
      ])
      return numeric(`${ctx} Quelle est l'évolution globale (en %, réponse signée) ?`, g, {
        explanation: `Coefficient global : ${fmt(c)}^${n} = ${fmt(r2(c ** n * 10000) / 10000)}, soit une évolution de ${fmt(g)} % (et non ${fmt(n * t)} %).`,
      })
    },
  ],
]

export const SECONDE: Record<string, Tiers> = {
  '2-nombres': nombres,
  '2-lit': lit,
  '2-eq': eq,
  '2-fct': fct,
  '2-vect': vect,
  '2-droites': droites,
  '2-stat': stat,
}
