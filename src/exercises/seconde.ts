import {
  F, expression, fmt, fraction, fracText, gcd, interval, intervalText, numeric, pair, par, pick, poly, radical,
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

/** k√m réduit : 72 → [6, 2]. */
function rootParts(n: number): [number, number] {
  let k = 1, m = n
  for (let d = 2; d * d <= m; d++) while (m % (d * d) === 0) { m /= d * d; k *= d }
  return [k, m]
}

/** Retire tant que le tirage ne convient pas (gen renvoie null). */
function retry(gen: () => Exercise | null): Exercise {
  for (let i = 0; i < 1000; i++) {
    const ex = gen()
    if (ex) return ex
  }
  throw new Error('tirage impossible')
}

/** Exige une factorisation complète en facteurs du premier degré (pas de x² restant). */
function fullyFactored(ex: Exercise): Exercise {
  const base = ex.check
  const linear = (v: string) => !/[²³^]/.test(v)
  return {
    ...ex,
    check: (v) => base(v) && linear(v),
    diagnose: (v) => (base(v) && !linear(v) ? 'C’est juste, mais tu peux encore factoriser (pense aux identités remarquables).' : ex.diagnose?.(v)),
  }
}

const MOINES = ['frère Anselme', 'frère Benoît', 'sœur Hildegarde', 'frère Colomban', 'sœur Scholastique', 'frère Bernard']

// ── Nombres & calculs ───────────────────────────────────────────────────
const nombres: Tiers = [
  [
    () => {
      const a = pick([2, 3, 5, 7, 10]), m = randInt(2, 9), n = randInt(2, 9)
      return numeric(`Écris ${a}^${m} × ${a}^${n} sous la forme ${a}^n. Que vaut n ?`, m + n, { explanation: `aᵐ × aⁿ = aᵐ⁺ⁿ : ${m} + ${n} = ${m + n}.` })
    },
    () => {
      const a = pick([2, 3, 5, 7]), m = randInt(5, 12), n = randInt(2, m - 1)
      return numeric(`Écris ${F(`${a}^${m}`, `${a}^${n}`)} sous la forme ${a}^n. Que vaut n ?`, m - n, { explanation: `aᵐ ÷ aⁿ = aᵐ⁻ⁿ : ${m} − ${n} = ${m - n}.` })
    },
    () => {
      const k = randInt(1, 4)
      if (pick([true, false])) {
        return numeric(`Écris ${pw(10, -k)} sous forme décimale.`, 10 ** -k, {
          explanation: `${pw(10, -k)} = ${F(1, `10^${k}`)} = ${fmt(10 ** -k)} : le chiffre 1 est au rang ${k} après la virgule.`,
        })
      }
      return numeric(`On écrit ${fmt(10 ** -k)} sous la forme 10^n. Que vaut n ?`, -k, { explanation: `${fmt(10 ** -k)} = ${F(1, `10^${k}`)} = ${pw(10, -k)}.` })
    },
    () => {
      const a = randInt(-9, 9), r = pick(RELS)
      return interval(`Écris sous forme d'intervalle l'ensemble des réels x tels que x ${r} ${fmt(a)}.`, relInterval(r, a), {
        explanation: `${strictRel(r) ? `Inégalité stricte : ${fmt(a)} est exclu (crochet ouvert)` : `${fmt(a)} est inclus (crochet fermé)`} ; du côté de l'infini, le crochet est toujours ouvert.`,
      })
    },
    () => {
      const a = randInt(2, 15), b = randInt(2, 12), op = pick(['+', '−', '×'])
      const v = op === '+' ? a + b : op === '−' ? a - b : a * b
      return numeric(`Calcule √{${a * a}} ${op} √{${b * b}}.`, v, {
        explanation: `√{${a * a}} = ${a} car ${a}² = ${a * a}, et √{${b * b}} = ${b} : ${a} ${op} ${b} = ${fmt(v)}.`,
      })
    },
    () => retry(() => {
      const a = randInt(-12, 12), b = randInt(-12, 12)
      if (a === b) return null
      return numeric(`Calcule |${fmt(a)} − ${par(b)}|.`, Math.abs(a - b), {
        explanation: `${fmt(a)} − ${par(b)} = ${fmt(a - b)}, et la valeur absolue est la distance à 0 : |${fmt(a - b)}| = ${Math.abs(a - b)}.`,
      })
    }),
  ],
  [
    () => {
      const a = pick([2, 3, 5, 10]), m = randInt(2, 5), n = randInt(2, 4), k = randInt(2, 12)
      return numeric(`Écris (${a}^${m})^${n} ÷ ${a}^${k} sous la forme ${a}^n. Que vaut n ?`, m * n - k, { explanation: `(aᵐ)ⁿ = aᵐˣⁿ : ${a}^${m * n}, puis ${m * n} − ${k} = ${fmt(m * n - k)}.` })
    },
    () => {
      const digits = randInt(11, 99), askA = pick([true, false])
      let v: string, e: number
      if (pick([true, false])) {
        e = -randInt(2, 5)
        v = fmt(digits / 10 ** (1 - e))
      } else {
        e = randInt(4, 9)
        v = big(digits * 10 ** (e - 1))
      }
      return numeric(`On écrit ${v} en notation scientifique a × 10^n (avec 1 ≤ a < 10). Que vaut ${askA ? 'a' : 'n'} ?`, askA ? digits / 10 : e, {
        explanation: `${v} = ${fmt(digits / 10)} × ${pw(10, e)}.`,
      })
    },
    () => {
      const a = pick([2, 3, 4, 5, 10]), n = randInt(1, a === 2 ? 5 : a === 10 ? 4 : 3)
      return fraction(`Écris ${pw(a, -n)} sous la forme d'une fraction.`, 1, a ** n, {
        explanation: `a^{−n} = ${F(1, 'a^n')} : ${pw(a, -n)} = ${F(1, `${a}^${n}`)} = ${F(1, a ** n)}.`,
      })
    },
    () => {
      const a = randInt(-8, 2), b = randInt(a + 1, 10), lt = pick(['<', '≤']), rt_ = pick(['<', '≤'])
      return interval(`Écris sous forme d'intervalle l'ensemble des réels x tels que ${fmt(a)} ${lt} x ${rt_} ${fmt(b)}.`, { lo: a, hi: b, loClosed: lt === '≤', hiClosed: rt_ === '≤' }, {
        explanation: `Inégalité stricte → crochet ouvert, inégalité large → crochet fermé.`,
      })
    },
    () => retry(() => {
      const a = randInt(-90, 90) / 10, b = randInt(-90, 90) / 10
      if (a === b || Number.isInteger(a) && Number.isInteger(b)) return null
      const d = Math.round(Math.abs(a - b) * 10) / 10
      return numeric(`Sur une droite graduée, quelle est la distance entre les points d'abscisses ${fmt(a)} et ${fmt(b)} ?`, d, {
        explanation: `La distance vaut |${fmt(a)} − ${par(b)}| = |${fmt(r2(a - b))}| = ${fmt(d)}.`,
      })
    }),
    () => {
      const n = randInt(2, 14), N = randInt(n * n + 1, (n + 1) * (n + 1) - 1)
      return numeric(`Quel est l'entier n tel que n < √{${N}} < n + 1 ?`, n, {
        explanation: `${n}² = ${n * n} < ${N} < ${(n + 1) ** 2} = ${n + 1}², donc ${n} < √{${N}} < ${n + 1}.`,
      })
    },
  ],
  [
    () => {
      const k = randInt(2, 7), m = pick(SQUAREFREE)
      return radical(`Écris √{${k * k * m}} sous la forme a√b, avec b le plus petit possible.`, k, m, { explanation: `${k * k * m} = ${k * k} × ${m} et √${k * k} = ${k}.` })
    },
    () => {
      const m = pick(SQUAREFREE), a = randInt(1, 4), b = randInt(2, 5)
      return numeric(`Calcule √{${m * a * a}} × √{${m * b * b}}.`, m * a * b, {
        explanation: `√a × √b = √(ab) = √${m * m * a * a * b * b} = ${m * a * b}.`,
      })
    },
    () => {
      const a = randInt(-6, 2), b = randInt(a + 2, 8), c = randInt(a + 1, b - 1), e = randInt(b + 1, 12)
      return interval(`Écris l'intervalle [${fmt(a)} ; ${fmt(b)}] ∩ ]${fmt(c)} ; ${fmt(e)}].`, { lo: c, hi: b, loClosed: false, hiClosed: true }, {
        explanation: `On garde les nombres communs : à partir de ${fmt(c)} (exclu) jusqu'à ${fmt(b)} (inclus).`,
      })
    },
    () => {
      const a = randInt(-8, 0), c = randInt(a + 1, a + 4), b = randInt(c + 1, c + 5), d = randInt(b + 1, b + 6)
      const l1 = pick([true, false]), r1 = pick([true, false]), l2 = pick([true, false]), r2_ = pick([true, false])
      const I1 = intervalText({ lo: a, hi: b, loClosed: l1, hiClosed: r1 }), I2 = intervalText({ lo: c, hi: d, loClosed: l2, hiClosed: r2_ })
      return interval(`Écris ${I1} ∪ ${I2} sous la forme d'un seul intervalle.`, { lo: a, hi: d, loClosed: l1, hiClosed: r2_ }, {
        explanation: `Les deux intervalles se chevauchent entre ${fmt(c)} et ${fmt(b)} : la réunion va de ${fmt(a)} à ${fmt(d)}, avec les crochets des bornes extrêmes.`,
      })
    },
    () => {
      const a = randInt(2, 9), b = randInt(2, 9), p = randNonZero(-6, 8), q = randNonZero(-8, 6)
      const prod = a * b, over = prod >= 10, mant = over ? prod / 10 : prod, e = p + q + (over ? 1 : 0)
      return numeric(`On écrit (${a} × ${pw(10, p)}) × (${b} × ${pw(10, q)}) en notation scientifique a × 10^n. Que vaut n ?`, e, {
        explanation: `${a} × ${b} = ${prod}${over ? ` = ${fmt(mant)} × 10` : ''} et ${pw(10, p)} × ${pw(10, q)} = ${pw(10, p + q)}, donc le produit vaut ${fmt(mant)} × ${pw(10, e)}.`,
      })
    },
    () => {
      const a = pick([2, 3, 5, 7, 10]), p = randNonZero(-6, 8), q = randNonZero(-8, 6), r = randNonZero(-6, 6)
      return numeric(`Écris ${pw(a, p)} × ${pw(a, q)} ÷ ${pw(a, r)} sous la forme ${a}^n. Que vaut n ?`, p + q - r, {
        explanation: `n = ${fmt(p)} + ${par(q)} − ${par(r)} = ${fmt(p + q - r)}.`,
      })
    },
  ],
  [
    () => {
      const c = randInt(-6, 6), r = randInt(1, 6), strict = pick([true, false])
      const cond = pick([true, false])
        ? `|${xPlus(-c)}| ${strict ? '<' : '≤'} ${r}`
        : `la distance entre x et ${fmt(c)} est ${strict ? 'strictement inférieure' : 'inférieure ou égale'} à ${r}`
      return interval(`Écris sous forme d'intervalle l'ensemble des réels x tels que ${cond}.`, { lo: c - r, hi: c + r, loClosed: !strict, hiClosed: !strict }, {
        explanation: `|x − ${par(c)}| est la distance entre x et ${fmt(c)} : x est à moins de ${r} de ${fmt(c)}, donc entre ${fmt(c - r)} et ${fmt(c + r)}${strict ? ' (bornes exclues)' : ''}.`,
      })
    },
    () => {
      const m = pick([2, 3, 5]), a = randInt(2, 5), b = pick([1, 2, 3, 4, 5, 6].filter((v) => v !== a))
      return radical(`Écris √{${a * a * m}} + √{${b * b * m}} sous la forme a√b.`, a + b, m, { explanation: `${rt(a, m)} + ${rt(b, m)} = ${rt(a + b, m)}.` })
    },
    () => retry(() => {
      const p = randInt(2, 5), q = randInt(1, 4), r = randInt(p - q - 6, p - q + 3)
      if (r === 0) return null
      const e = p - q - r
      return fraction(`Calcule ${F(`2^${p} × 2^-${q}`, `2^${r}`)}. (résultat sous forme de fraction ou d'entier)`, e >= 0 ? 2 ** e : 1, e >= 0 ? 1 : 2 ** -e, {
        explanation: `L'exposant vaut ${p} + ${par(-q)} − ${par(r)} = ${fmt(e)}, donc ${pw(2, e)} = ${e >= 0 ? 2 ** e : F(1, 2 ** -e)}.`,
      })
    }),
    () => {
      const ctx = pick([
        { obj: 'Un grain de sable', plur: 'grains de sable', p: 3 },
        { obj: 'Un grain de riz', plur: 'grains de riz', p: 2 },
        { obj: 'Un flocon de neige', plur: 'flocons', p: 3 },
        { obj: 'Une graine de pavot', plur: 'graines de pavot', p: 4 },
        { obj: 'Une fourmi', plur: 'fourmis', p: 3 },
      ])
      const a = randInt(2, 9), b = randInt(2, 9), q = randInt(ctx.p, ctx.p + 3), total = a * b * 10 ** (q - ctx.p)
      return numeric(`${ctx.obj} pèse environ ${a} × ${pw(10, -ctx.p)} g. Combien pèsent ${b} × ${pw(10, q)} ${ctx.plur} (en g) ?`, total, {
        answer: big(total),
        explanation: `${a} × ${b} = ${a * b} et ${pw(10, -ctx.p)} × ${pw(10, q)} = ${pw(10, q - ctx.p)}, donc ${a * b} × ${pw(10, q - ctx.p)} = ${big(total)} g.`,
      })
    },
    () => {
      const k = randInt(2, 6), m = pick([2, 3, 5, 6, 7]), what = pick(['potager', 'bassin', 'dallage', 'tapis', 'terrain de jeu', 'champ de blé'])
      return radical(`Un ${what} carré a une aire de ${k * k * m} m². Donne la valeur exacte de son côté (en m) sous la forme a√b.`, k, m, {
        explanation: `Le côté c vérifie c² = ${k * k * m}, donc c = √{${k * k * m}} = √{${k * k} × ${m}} = ${rt(k, m)}.`,
      })
    },
    () => {
      const ctx = pick([
        { t: 'Une colonie de bactéries double toutes les heures. Au départ, il y a une seule bactérie.', base: 2, u: 'heures', w: 'bactéries' },
        { t: 'Chaque jour, le nombre de personnes qui connaissent une rumeur triple. Au départ, une seule personne la connaît.', base: 3, u: 'jours', w: 'personnes' },
        { t: 'Dans un jeu vidéo, le nombre de gemmes d’un coffre magique double à chaque niveau. Au niveau 0, il contient une gemme.', base: 2, u: 'niveaux', w: 'gemmes' },
        { t: 'Un nénuphar magique triple de surface chaque semaine. Au départ, il couvre 1 cm².', base: 3, u: 'semaines', w: 'cm²' },
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
    () => {
      const k = randInt(2, 6), m = pick([2, 3, 5]), c = k * m
      return radical(`Écris ${F(c, `√${m}`)} sous la forme a√b.`, k, m, { explanation: `On multiplie en haut et en bas par √${m} : ${F(`${c}√${m}`, m)} = ${rt(k, m)}.` })
    },
    () => retry(() => {
      const m = pick([2, 3, 5, 7]), a = randInt(1, 6), b = randInt(1, 6), c = randInt(1, 6)
      const k = a + b - c
      if (k < 1 || new Set([a, b, c]).size < 3) return null
      const s = (n: number) => `√{${n * n * m}}`
      return radical(`Écris ${s(a)} + ${s(b)} − ${s(c)} sous la forme a√b.`, k, m, {
        explanation: `${rt(a, m)} + ${rt(b, m)} − ${rt(c, m)} = ${rt(k, m)}.`,
      })
    }),
    () => {
      const B = pick([2, 3]), a = randNonZero(-4, 6), b = randNonZero(-3, 4), c = randNonZero(-3, 3)
      const n = a + 2 * b - 3 * c
      return numeric(`Écris ${pw(B, a)} × ${pw(B * B, b)} ÷ ${pw(B ** 3, c)} sous la forme ${B}^n. Que vaut n ?`, n, {
        explanation: `${B * B} = ${B}² et ${B ** 3} = ${B}³, donc n = ${fmt(a)} + 2 × ${par(b)} − 3 × ${par(c)} = ${fmt(n)}.`,
      })
    },
    () => {
      const m = pick([2, 3, 5, 6, 7]), p = randInt(1, 4), q = randInt(1, 9)
      const r = p === 1 ? `√{${m}}` : `${p}√{${m}}`, v = p * p * m - q * q
      return numeric(`Calcule (${r} + ${q})(${r} − ${q}).`, v, {
        explanation: `(a + b)(a − b) = a² − b² : (${r})² − ${q}² = ${p * p * m} − ${q * q} = ${fmt(v)}.`,
      })
    },
    () => {
      const ctx = pick([
        { t: 'Une lame d’épée doit mesurer', v: [80, 100], u: 'cm', tol: [0.5, 1, 1.5, 2] },
        { t: 'Une miche de pain doit peser', v: [240, 260], u: 'g', tol: [2.5, 5, 10] },
        { t: 'Un tonneau doit contenir', v: [50, 70], u: 'L', tol: [0.5, 1, 1.5] },
        { t: 'Une pièce de moteur doit mesurer', v: [20, 40], u: 'mm', tol: [0.05, 0.1, 0.2] },
        { t: 'Une boule de pétanque doit peser', v: [680, 720], u: 'g', tol: [10, 20, 15] },
      ])
      const v = randInt(ctx.v[0], ctx.v[1]), tol = pick(ctx.tol), lo = r2(v - tol), hi = r2(v + tol)
      return interval(`${ctx.t} ${v} ${ctx.u}, à ${fmt(tol)} ${ctx.u} près. Donne, sous forme d'intervalle, l'ensemble des valeurs x (en ${ctx.u}) acceptées.`, { lo, hi, loClosed: true, hiClosed: true }, {
        explanation: `On accepte |x − ${v}| ≤ ${fmt(tol)}, soit ${fmt(lo)} ≤ x ≤ ${fmt(hi)}.`,
      })
    },
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
    () => {
      const k = pick([-6, -5, -4, -3, -2, -1, 2, 3, 4, 5, 6]), a = randInt(1, 5), b = randNonZero(-9, 9)
      return expression(`Développe et réduis : ${coefP(k)}(${xPlus(b, a)})`, poly([k * a, 'x'], [k * b, '']), 'developed', {
        explanation: `On distribue ${fmt(k)} sur chaque terme : ${fmt(k)} × ${term(a, 'x', true)} et ${fmt(k)} × ${par(b)}.`,
      })
    },
    () => retry(() => {
      const a = randNonZero(-9, 9), b = randNonZero(-9, 9), c = randNonZero(-9, 9), d = randNonZero(-9, 9)
      if (pick([true, false])) {
        if (a + c === 0) return null
        return expression(`Réduis : ${poly([a, 'x'], [b, ''], [c, 'x'], [d, ''])}`, poly([a + c, 'x'], [b + d, '']), 'developed', {
          explanation: `Termes en x : ${fmt(a)} + ${par(c)} = ${fmt(a + c)} ; constantes : ${fmt(b)} + ${par(d)} = ${fmt(b + d)}.`,
        })
      }
      if (a + c === 0 || b + d === 0) return null
      return expression(`Réduis : ${poly([a, 'x²'], [b, 'x'], [c, 'x²'], [d, 'x'])}`, poly([a + c, 'x²'], [b + d, 'x']), 'developed', {
        explanation: `Termes en x² : ${fmt(a)} + ${par(c)} = ${fmt(a + c)} ; termes en x : ${fmt(b)} + ${par(d)} = ${fmt(b + d)}. On ne mélange jamais les x² et les x !`,
      })
    }),
    () => {
      const k = randInt(2, 9), a = randInt(1, 6), b = pick([-9, -8, -7, -6, -5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6, 7, 8, 9].filter((v) => gcd(a, Math.abs(v)) === 1))
      return expression(`Factorise : ${poly([k * a, 'x'], [k * b, ''])}`, `${k}(${xPlus(b, a)})`, 'factored', {
        explanation: `${k} est un facteur commun : ${poly([k * a, 'x'])} = ${k} × ${term(a, 'x', true)} et ${fmt(k * b)} = ${k} × ${par(b)}.`,
      })
    },
    () => {
      const a = randNonZero(-4, 4), b = randInt(-6, 6), c = randNonZero(-9, 9), v = pick([-4, -3, -2, -1, 2, 3, 4])
      const val = a * v * v + b * v + c
      return numeric(`Calcule A = ${poly([a, 'x²'], [b, 'x'], [c, ''])} pour x = ${fmt(v)}.`, val, {
        explanation: `On remplace x par ${par(v)} : ${par(v)}² = ${v * v}, donc A = ${sumText([a * v * v, b * v, c])} = ${fmt(val)}.`,
      })
    },
    () => retry(() => {
      const a = randNonZero(-8, 8), b = randNonZero(-9, 9), c = randInt(1, 6), d = randNonZero(-9, 9)
      if (a === c) return null
      return expression(`Développe et réduis : ${poly([a, 'x'], [b, ''])} − (${xPlus(d, c)})`, poly([a - c, 'x'], [b - d, '']), 'developed', {
        explanation: `Le signe − devant la parenthèse change le signe de chaque terme : ${poly([a, 'x'], [b, ''], [-c, 'x'], [-d, ''])}.`,
      })
    }),
  ],
  [
    () => {
      const a = randNonZero(-9, 9)
      return expression(`Développe : (${xPlus(a)})²`, poly([1, 'x²'], [2 * a, 'x'], [a * a, '']), 'developed', {
        explanation: `(a ${a < 0 ? '−' : '+'} b)² = a² ${a < 0 ? '−' : '+'} 2ab + b² avec b = ${Math.abs(a)} : 2 × x × ${Math.abs(a)} = ${2 * Math.abs(a)}x.`,
      })
    },
    () => {
      const a = randInt(1, 9)
      return expression(`Développe : (x + ${a})(x − ${a})`, poly([1, 'x²'], [-a * a, '']), 'developed', { explanation: `(a + b)(a − b) = a² − b² : x² − ${a}².` })
    },
    () => {
      const a = randNonZero(-7, 7), b = randNonZero(-7, 7)
      return expression(`Développe et réduis : (${xPlus(a)})(${xPlus(b)})`, poly([1, 'x²'], [a + b, 'x'], [a * b, '']), 'developed', {
        explanation: `x × x + x × ${par(b)} + ${par(a)} × x + ${par(a)} × ${par(b)} = ${poly([1, 'x²'], [a + b, 'x'], [a * b, ''])}.`,
      })
    },
    () => retry(() => {
      const k = pick([-5, -4, -3, -2, -1, 2, 3, 4, 5]), m = pick([-5, -4, -3, -2, 2, 3, 4, 5]), c = randInt(1, 3), a = randNonZero(-7, 7), b = randNonZero(-7, 7)
      if (k + m * c === 0) return null
      return expression(`Développe et réduis : ${coefP(k)}(${xPlus(a)}) ${m < 0 ? '−' : '+'} ${Math.abs(m)}(${xPlus(b, c)})`, poly([k + m * c, 'x'], [k * a + m * b, '']), 'developed', {
        explanation: `On développe chaque produit : ${poly([k, 'x'], [k * a, ''])} et ${poly([m * c, 'x'], [m * b, ''])}, puis on regroupe.`,
      })
    }),
    () => {
      const a = randNonZero(-9, 9), k = randInt(1, 5)
      return expression(`Factorise : ${poly([k, 'x²'], [k * a, 'x'])}`, `${k === 1 ? '' : k}x(${xPlus(a)})`, 'factored', {
        explanation: `${k === 1 ? 'x' : `${k}x`} est un facteur commun aux deux termes.`,
      })
    },
  ],
  [
    () => {
      const k = randInt(2, 5), a = randInt(1, 9)
      return expression(`Développe : (${k}x + ${a})(${k}x − ${a})`, poly([k * k, 'x²'], [-a * a, '']), 'developed', { explanation: `(a + b)(a − b) = a² − b² avec a = ${k}x : (${k}x)² = ${k * k}x².` })
    },
    () => {
      const k = randInt(2, 5), a = randNonZero(-7, 7)
      return expression(`Développe : (${xPlus(a, k)})²`, poly([k * k, 'x²'], [2 * k * a, 'x'], [a * a, '']), 'developed', {
        explanation: `(${k}x)² = ${k * k}x², 2 × ${k}x × ${par(a)} = ${fmt(2 * k * a)}x, ${par(a)}² = ${a * a}.`,
      })
    },
    () => {
      const a = randNonZero(-5, 5), b = randNonZero(-5, 5), c = randInt(2, 4)
      return expression(`Développe et réduis : (${xPlus(a)})(${xPlus(b)}) − ${c}x²`, poly([1 - c, 'x²'], [a + b, 'x'], [a * b, '']), 'developed', {
        explanation: `(${xPlus(a)})(${xPlus(b)}) = ${poly([1, 'x²'], [a + b, 'x'], [a * b, ''])}, puis on retire ${c}x².`,
      })
    },
    () => {
      const a = randInt(2, 5), c = pick([-4, -3, -2, -1, 1, 2, 3, 4]), b = randNonZero(-6, 6), d = randNonZero(-6, 6)
      return expression(`Développe et réduis : (${xPlus(b, a)})(${xPlus(d, c)})`, poly([a * c, 'x²'], [a * d + b * c, 'x'], [b * d, '']), 'developed', {
        explanation: `Double distributivité : ${a}x × ${mono(c)} + ${a}x × ${par(d)} + ${par(b)} × ${mono(c)} + ${par(b)} × ${par(d)}.`,
      })
    },
    () => {
      const a = randInt(2, 10)
      if (pick([true, false])) return expression(`Factorise : x² − ${a * a}`, `(x − ${a})(x + ${a})`, 'factored', { explanation: `a² − b² = (a − b)(a + b) avec b = ${a}.` })
      return expression(`Factorise : ${a * a} − x²`, `(${a} − x)(${a} + x)`, 'factored', { explanation: `a² − b² = (a − b)(a + b) avec a = ${a} et b = x.` })
    },
    () => {
      const a = randInt(1, 7), b = randInt(1, 7)
      return expression(`Développe et réduis : (x + ${a})² + (x − ${b})²`, poly([2, 'x²'], [2 * a - 2 * b, 'x'], [a * a + b * b, '']), 'developed', {
        explanation: `(x + ${a})² = ${poly([1, 'x²'], [2 * a, 'x'], [a * a, ''])} et (x − ${b})² = ${poly([1, 'x²'], [-2 * b, 'x'], [b * b, ''])}, puis on additionne.`,
      })
    },
  ],
  [
    () => {
      const a = randNonZero(-8, 8)
      return expression(`Factorise : ${poly([1, 'x²'], [2 * a, 'x'], [a * a, ''])}`, `(${xPlus(a)})²`, 'factored', {
        explanation: `On reconnaît a² ${a < 0 ? '−' : '+'} 2ab + b² avec a = x et b = ${Math.abs(a)}.`,
      })
    },
    () => {
      const k = randInt(2, 6), a = pick([1, 2, 3, 4, 5, 6, 7, 8, 9].filter((v) => gcd(v, k) === 1))
      return expression(`Factorise : ${k * k}x² − ${a * a}`, `(${k}x − ${a})(${k}x + ${a})`, 'factored', { explanation: `(${k}x)² − ${a}² = (${k}x − ${a})(${k}x + ${a}).` })
    },
    () => retry(() => {
      const a = randNonZero(-6, 6), b = randInt(1, 4), c = randNonZero(-6, 6), d = randInt(1, 3), e = randNonZero(-6, 6)
      if (c + e === 0) return null
      return expression(`Factorise : (${xPlus(a)})(${xPlus(c, b)}) + (${xPlus(a)})(${xPlus(e, d)})`, `(${xPlus(a)})(${xPlus(c + e, b + d)})`, 'factored', {
        explanation: `(${xPlus(a)}) est un facteur commun : (${xPlus(a)})[(${xPlus(c, b)}) + (${xPlus(e, d)})] = (${xPlus(a)})(${xPlus(c + e, b + d)}).`,
      })
    }),
    () => retry(() => {
      const a = randNonZero(-6, 6), b = randNonZero(-6, 6), c = randNonZero(-6, 6)
      if (2 * a - b - c === 0) return null
      return expression(`Développe et réduis : (${xPlus(a)})² − (${xPlus(b)})(${xPlus(c)})`, poly([2 * a - b - c, 'x'], [a * a - b * c, '']), 'developed', {
        explanation: `(${xPlus(a)})² = ${poly([1, 'x²'], [2 * a, 'x'], [a * a, ''])} et (${xPlus(b)})(${xPlus(c)}) = ${poly([1, 'x²'], [b + c, 'x'], [b * c, ''])} ; le signe − change tous les signes du produit, et les x² s'annulent.`,
      })
    }),
    () => {
      const a = randInt(1, 6), aug = pick([true, false]), what = pick(['place', 'pelouse', 'cour', 'salle', 'piscine'])
      return expression(
        `Une ${what} carrée a un côté de x m (x > ${a}). On ${aug ? 'allonge' : 'raccourcit'} chaque côté de ${a} m. De combien son aire ${aug ? 'augmente' : 'diminue'}-t-elle ? Donne une expression développée en fonction de x.`,
        aug ? poly([2 * a, 'x'], [a * a, '']) : poly([2 * a, 'x'], [-a * a, '']), 'developed', {
          explanation: aug
            ? `(x + ${a})² − x² = x² + ${2 * a}x + ${a * a} − x² = ${poly([2 * a, 'x'], [a * a, ''])}.`
            : `x² − (x − ${a})² = x² − (x² − ${2 * a}x + ${a * a}) = ${poly([2 * a, 'x'], [-a * a, ''])}.`,
        })
    },
    () => {
      const n = pick([20, 30, 40, 50, 60, 100]), a = randInt(1, 9), kind = pick(['prod', 'plus', 'moins'])
      if (kind === 'prod') return numeric(`Calcule de tête, grâce à une identité remarquable : ${n + a} × ${n - a}`, n * n - a * a, { explanation: `(${n} + ${a})(${n} − ${a}) = ${n}² − ${a}² = ${n * n} − ${a * a} = ${n * n - a * a}.` })
      if (kind === 'plus') return numeric(`Calcule de tête, grâce à une identité remarquable : ${n + a}²`, (n + a) ** 2, { explanation: `(${n} + ${a})² = ${n * n} + 2 × ${n} × ${a} + ${a * a} = ${(n + a) ** 2}.` })
      return numeric(`Calcule de tête, grâce à une identité remarquable : ${n - a}²`, (n - a) ** 2, { explanation: `(${n} − ${a})² = ${n * n} − 2 × ${n} × ${a} + ${a * a} = ${(n - a) ** 2}.` })
    },
  ],
  [
    () => retry(() => {
      const a = randNonZero(-5, 5), b = randNonZero(-5, 5)
      if (Math.abs(a - b) < 2) return null
      return expression(`Factorise puis réduis chaque facteur : (${xPlus(a)})² − (${xPlus(b)})²`, `${fmt(a - b)}(${xPlus(a + b, 2)})`, 'factored', {
        explanation: `A² − B² = (A − B)(A + B) : A − B = ${fmt(a - b)} et A + B = ${xPlus(a + b, 2)}.`,
      })
    }),
    () => retry(() => {
      const a = randInt(1, 4), b = randNonZero(-7, 7), c = randInt(1, 8)
      if (Math.abs(b) === c) return null
      return expression(`Factorise : (${xPlus(b, a)})² − ${c * c}`, `(${xPlus(b - c, a)})(${xPlus(b + c, a)})`, 'factored', {
        explanation: `On reconnaît A² − B² avec A = ${xPlus(b, a)} et B = ${c} : (A − B)(A + B).`,
      })
    }),
    () => retry(() => {
      const a = randNonZero(-6, 6)
      if (pick([true, false])) {
        const b = randInt(2, 5), c = randNonZero(-6, 6), d = randInt(1, 4), e = randNonZero(-6, 6)
        if (b === d || c === e) return null
        return expression(`Factorise : (${xPlus(a)})(${xPlus(c, b)}) − (${xPlus(a)})(${xPlus(e, d)})`, `(${xPlus(a)})(${xPlus(c - e, b - d)})`, 'factored', {
          explanation: `Facteur commun (${xPlus(a)}) : (${xPlus(a)})[(${xPlus(c, b)}) − (${xPlus(e, d)})] ; le − change les signes de la seconde parenthèse : ${xPlus(c - e, b - d)}.`,
        })
      }
      const b = randInt(1, 4), c = randNonZero(-6, 6)
      if (a + c === 0) return null
      return expression(`Factorise : (${xPlus(a)})² + (${xPlus(a)})(${xPlus(c, b)})`, `(${xPlus(a)})(${xPlus(a + c, b + 1)})`, 'factored', {
        explanation: `(${xPlus(a)})² = (${xPlus(a)})(${xPlus(a)}) : facteur commun (${xPlus(a)}), il reste (${xPlus(a)}) + (${xPlus(c, b)}) = ${xPlus(a + c, b + 1)}.`,
      })
    }),
    () => {
      const L = 2 * randInt(5, 15), what = pick(['plaque de carton', 'feuille de cuivre', 'plaque de bois fin', 'feuille d’étain'])
      return expression(
        `Dans une ${what} carrée de ${L} cm de côté, on découpe un carré de x cm de côté à chaque coin, puis on relève les bords pour former une boîte sans couvercle. Exprime son volume V(x) (en cm³) sous forme développée et réduite.`,
        poly([4, 'x³'], [-4 * L, 'x²'], [L * L, 'x']), 'developed', {
          inputHint: 'ex. ax^3 + bx² + cx',
          explanation: `Le fond mesure (${L} − 2x) de côté et la hauteur vaut x : V(x) = x(${L} − 2x)² = x(${poly([L * L, ''], [-4 * L, 'x'], [4, 'x²'])}) = ${poly([4, 'x³'], [-4 * L, 'x²'], [L * L, 'x'])}.`,
        })
    },
    () => {
      const a = randInt(1, 6)
      if (pick([true, false])) {
        const k = randInt(2, 7)
        return fullyFactored(expression(`Factorise complètement : ${poly([k, 'x²'], [-k * a * a, ''])}`, `${k}(x − ${a})(x + ${a})`, 'factored', {
          explanation: `Facteur commun ${k} : ${k}(x² − ${a * a}), puis x² − ${a * a} = (x − ${a})(x + ${a}).`,
        }))
      }
      return fullyFactored(expression(`Factorise complètement : ${poly([1, 'x³'], [-a * a, 'x'])}`, `x(x − ${a})(x + ${a})`, 'factored', {
        inputHint: 'ex. x(x − 1)(x + 1)',
        explanation: `Facteur commun x : x(x² − ${a * a}), puis x² − ${a * a} = (x − ${a})(x + ${a}).`,
      }))
    },
    () => {
      const p = randNonZero(-6, 6), q = randInt(-10, 15)
      return numeric(`Complète : ${poly([1, 'x²'], [2 * p, 'x'], [q, ''])} = (${xPlus(p)})² + … Quel nombre faut-il écrire à la place des pointillés ?`, q - p * p, {
        explanation: `(${xPlus(p)})² = ${poly([1, 'x²'], [2 * p, 'x'], [p * p, ''])} : il faut ajouter ${fmt(q)} − ${p * p} = ${fmt(q - p * p)}.`,
      })
    },
  ],
]

// ── Équations & inéquations ─────────────────────────────────────────────
const eq: Tiers = [
  [
    () => {
      const a = randNonZero(-9, 9), x = randInt(-10, 10), b = randInt(-15, 15)
      return numeric(`Résous : ${poly([a, 'x'], [b, ''])} = ${fmt(a * x + b)}. x = ?`, x, {
        explanation: `${poly([a, 'x'])} = ${fmt(a * x + b)} − ${par(b)} = ${fmt(a * x)}, donc x = ${fmt(x)}.`,
      })
    },
    () => {
      const k = randInt(2, 9), v = randNonZero(-10, 10)
      return numeric(`Résous : ${F('x', k)} = ${fmt(v)}. x = ?`, k * v, { explanation: `On multiplie les deux membres par ${k} : x = ${fmt(v)} × ${k} = ${fmt(k * v)}.` })
    },
    () => {
      const a = randInt(2, 9), b = randNonZero(-15, 15), x = randInt(1, 15), who = prenom()
      return numeric(`${who} pense à un nombre, le multiplie par ${a}, puis ${b > 0 ? `ajoute ${b}` : `retire ${-b}`} au résultat. ${pick(['Résultat obtenu', 'Résultat final', 'Nombre obtenu'])} : ${fmt(a * x + b)}. Quel était le nombre de départ ?`, x, {
        explanation: `${poly([a, 'x'], [b, ''])} = ${fmt(a * x + b)}, donc ${a}x = ${a * x} et x = ${x}.`,
      })
    },
    () => {
      const a = randNonZero(-9, 9), b = randInt(-10, 10), r = pick(RELS)
      return interval(`Résous : ${xPlus(a)} ${r} ${fmt(b)} (réponse sous forme d'intervalle).`, relInterval(r, b - a), {
        explanation: `On retire ${par(a)} des deux côtés : x ${r} ${fmt(b - a)}.`,
      })
    },
    () => retry(() => {
      const a = pick([-9, -8, -7, -6, -5, -4, -3, -2, 2, 3, 4, 5, 6, 7, 8, 9]), b = randNonZero(-20, 20)
      if (b % a === 0 && Math.random() < 0.6) return null
      return fraction(`Résous : ${poly([a, 'x'])} = ${fmt(b)}. x = ?`, b, a, {
        explanation: `On divise par ${par(a)} : x = ${F(fmt(b), fmt(a))} = ${fracText(b, a)}.`,
      })
    }),
  ],
  [
    () => retry(() => {
      const a = randInt(2, 9), c = randInt(1, 9), b = randInt(-10, 10), d = randInt(-10, 10)
      if (a === c) return null
      return fraction(`Résous : ${poly([a, 'x'], [b, ''])} = ${poly([c, 'x'], [d, ''])}. x = ?`, d - b, a - c, {
        explanation: `${poly([a - c, 'x'])} = ${fmt(d - b)}, donc x = ${fracText(d - b, a - c)}.`,
      })
    }),
    () => {
      const k = randInt(2, 5), a = randNonZero(-6, 6), x = randInt(-6, 6), c = randInt(1, 4)
      const rhs = k * (x + a) + c * x
      return numeric(`Résous : ${k}(${xPlus(a)}) + ${term(c, 'x', true)} = ${fmt(rhs)}. x = ?`, x, {
        explanation: `${poly([k + c, 'x'], [k * a, ''])} = ${fmt(rhs)}, donc ${poly([k + c, 'x'])} = ${fmt(rhs - k * a)} et x = ${fmt(x)}.`,
      })
    },
    () => {
      const k = randInt(2, 12)
      return solutionSet(`Résous : x² = ${k * k}`, [-k, k], { explanation: `x² = ${k * k} a deux solutions : ${k} et −${k} (car (−${k})² = ${k * k} aussi).` })
    },
    () => {
      const a = randInt(2, 6), v = randInt(-5, 5), b = randInt(-9, 9), r = pick<Rel>(['≥', '≤', '>', '<'])
      return interval(`Résous ${poly([a, 'x'], [b, ''])} ${r} ${fmt(a * v + b)} (réponse sous forme d'intervalle).`, relInterval(r, v), {
        explanation: `${a}x ${r} ${fmt(a * v)}, on divise par ${a} > 0 : x ${r} ${fmt(v)}.`,
      })
    },
    () => {
      const b = randInt(2, 6), a = randNonZero(-9, 9), c = randNonZero(-6, 6)
      if (pick([true, false])) {
        return numeric(`Résous : ${F(xPlus(a), b)} = ${fmt(c)}. x = ?`, b * c - a, {
          explanation: `${xPlus(a)} = ${fmt(c)} × ${b} = ${fmt(b * c)}, donc x = ${fmt(b * c - a)}.`,
        })
      }
      return numeric(`Résous : ${F('x', b)}${tail(a)} = ${fmt(c)}. x = ?`, b * (c - a), {
        explanation: `${F('x', b)} = ${fmt(c)} − ${par(a)} = ${fmt(c - a)}, donc x = ${fmt(c - a)} × ${b} = ${fmt(b * (c - a))}.`,
      })
    },
    () => retry(() => {
      const N: Record<number, string> = { 2: 'double', 3: 'triple', 4: 'quadruple', 5: 'quintuple' }
      const k1 = randInt(3, 5), k2 = randInt(2, k1 - 1), x = randInt(2, 15), b1 = randInt(1, 12), b2 = (k1 - k2) * x - b1
      if (b2 < 1) return null
      return numeric(`Le ${N[k1]} d'un nombre, diminué de ${b1}, est égal au ${N[k2]} de ce nombre augmenté de ${b2}. Quel est ce nombre ?`, x, {
        explanation: `${k1}x − ${b1} = ${k2}x + ${b2}, donc ${poly([k1 - k2, 'x'])} = ${b1 + b2} et x = ${x}.`,
      })
    }),
  ],
  [
    () => {
      const p = randNonZero(-9, 9), q = randNonZero(-9, 9)
      return solutionSet(`Résous : (${xPlus(-p)})(${xPlus(-q)}) = 0`, [p, q], { explanation: `Un produit est nul si l'un de ses facteurs est nul : x = ${fmt(p)} ou x = ${fmt(q)}.` })
    },
    () => {
      const a = randInt(2, 5), p = randNonZero(-6, 6) * a, q = randNonZero(-8, 8)
      return solutionSet(`Résous : (${a}x ${p < 0 ? '+' : '−'} ${Math.abs(p)})(${xPlus(-q)}) = 0`, [p / a, q], { explanation: `${a}x = ${fmt(p)} donne x = ${fmt(p / a)} ; l'autre facteur donne x = ${fmt(q)}.` })
    },
    () => {
      const a = randNonZero(-6, 6), v = randInt(-5, 5), b = randInt(-9, 9), r = pick(RELS)
      const neg = a < 0, rr = neg ? flip(r) : r
      return interval(`Résous ${poly([a, 'x'], [b, ''])} ${r} ${fmt(a * v + b)} et donne l'ensemble des solutions sous forme d'intervalle.`, relInterval(rr, v), {
        explanation: neg
          ? `${poly([a, 'x'])} ${r} ${fmt(a * v)} ; on divise par ${fmt(a)} < 0 : le sens de l'inégalité change, x ${rr} ${fmt(v)}.`
          : `${poly([a, 'x'])} ${r} ${fmt(a * v)}, donc x ${r} ${fmt(v)}.`,
      })
    },
    () => retry(() => {
      const a = randNonZero(-6, 6), c = randNonZero(-6, 6), b = randInt(2, 6), d = randInt(2, 6)
      if (b === d || a === c) return null
      return fraction(`Résous : ${F(xPlus(a), b)} = ${F(xPlus(c), d)}. x = ?`, b * c - d * a, d - b, {
        explanation: `Produits en croix : ${d}(${xPlus(a)}) = ${b}(${xPlus(c)}), soit ${poly([d, 'x'], [d * a, ''])} = ${poly([b, 'x'], [b * c, ''])}, donc ${poly([d - b, 'x'])} = ${fmt(b * c - d * a)} et x = ${fracText(b * c - d * a, d - b)}.`,
      })
    }),
    () => {
      const a = pick([-9, -8, -7, -6, -5, -4, -3, -2, 2, 3, 4, 5, 6, 7, 8, 9])
      if (pick([true, false])) {
        return solutionSet(`Résous : x² = ${poly([a, 'x'])}`, [0, a], {
          explanation: `x² − ${par(a)}x = 0, soit x(${xPlus(-a)}) = 0 : x = 0 ou x = ${fmt(a)}. (Ne divise pas par x : tu perdrais la solution 0 !)`,
        })
      }
      const k = randInt(2, 5)
      return solutionSet(`Résous : ${poly([k, 'x²'], [-k * a, 'x'])} = 0`, [0, a], {
        explanation: `On factorise : ${k}x(${xPlus(-a)}) = 0, donc x = 0 ou x = ${fmt(a)}.`,
      })
    },
  ],
  [
    () => retry(() => {
      const a = randNonZero(-6, 6), c = randNonZero(-6, 6), b = randInt(-9, 9), v = randInt(-6, 6), r = pick(RELS)
      if (a === c) return null
      const d = (a - c) * v + b, k = a - c, rr = k < 0 ? flip(r) : r
      return interval(`Résous ${poly([a, 'x'], [b, ''])} ${r} ${poly([c, 'x'], [d, ''])} (réponse sous forme d'intervalle).`, relInterval(rr, v), {
        explanation: `On regroupe les x à gauche : ${poly([k, 'x'])} ${r} ${fmt(d - b)}${k < 0 ? ` ; on divise par ${fmt(k)} < 0, le sens change` : k === 1 ? '' : ` ; on divise par ${k} > 0`} : x ${rr} ${fmt(v)}.`,
      })
    }),
    () => retry(() => {
      const k = randInt(1, 5), m = pick(SQUAREFREE), N = k * k * m
      if (N > 200) return null
      const form = randInt(0, 2), c = randInt(2, 4), s = randInt(2, 20)
      const eqText = form === 0 ? `x² = ${N}` : form === 1 ? `${c}x² = ${c * N}` : `x² + ${s} = ${N + s}`
      return radical(`Résous ${eqText}. Donne la solution positive sous la forme a√b.`, k, m, {
        explanation: `On obtient x² = ${N}, donc x = √{${N}} ou x = −√{${N}} ; la solution positive est √{${N}} = ${rt(k, m)}.`,
      })
    }),
    () => {
      const x = randInt(3, 20), d = randInt(2, 9), what = pick(['Un enclos', 'Un potager', 'Un terrain de volley', 'Une salle du château', 'Un tapis'])
      return numeric(`${what} rectangulaire a une longueur égale à sa largeur + ${d} m. Son périmètre vaut ${2 * (2 * x + d)} m. Quelle est sa largeur (en m) ?`, x, {
        explanation: `2(x + x + ${d}) = ${2 * (2 * x + d)}, soit 4x + ${2 * d} = ${2 * (2 * x + d)} et x = ${x}.`,
      })
    },
    () => {
      const c = randInt(3, 5), n = randInt(5, 40), s = c * n + (c * (c - 1)) / 2
      const terms = Array.from({ length: c }, (_, i) => (i === 0 ? 'n' : `(n + ${i})`)).join(' + ')
      return numeric(`La somme de ${c} nombres entiers consécutifs vaut ${s}. Quel est le plus petit ?`, n, {
        explanation: `${terms} = ${c}n + ${(c * (c - 1)) / 2} = ${s}, donc ${c}n = ${c * n} et n = ${n}.`,
      })
    },
    () => {
      const P = pick([{ n: 'sa mère', il: 'elle' }, { n: 'son père', il: 'il' }, { n: 'sa tante', il: 'elle' }, { n: 'son oncle', il: 'il' }])
      const who = prenom(), a = randInt(4, 14), t = randInt(2, 15), k = pick([2, 3])
      const p = k === 2 ? 2 * a + t : 3 * a + 2 * t
      return numeric(`${who} a ${a} ans et ${P.n} a ${p} ans. Dans combien d'années ${P.n} aura-t-${P.il} exactement le ${k === 2 ? 'double' : 'triple'} de l'âge de ${who} ?`, t, {
        explanation: `Dans t ans : ${p} + t = ${k}(${a} + t), soit ${p} + t = ${k * a} + ${k}t, donc ${k - 1 === 1 ? 't' : `${k - 1}t`} = ${p - k * a} et t = ${t}.`,
      })
    },
  ],
  [
    () => retry(() => {
      const a = randNonZero(-6, 6), s = randInt(2, 6), r = randNonZero(-5, 5), b = randInt(1, s - 1), d = s - b, c = randNonZero(-6, 6), e = -s * r - c
      if (e === 0 || Math.abs(e) > 12 || r === -a) return null
      return solutionSet(`Résous : (${xPlus(a)})(${xPlus(c, b)}) + (${xPlus(a)})(${xPlus(e, d)}) = 0`, [-a, r], {
        explanation: `On factorise par (${xPlus(a)}) : (${xPlus(a)})(${xPlus(c + e, s)}) = 0, donc x = ${fmt(-a)} ou x = ${fmt(r)}.`,
      })
    }),
    () => retry(() => {
      const k = pick([2, 3]), a = randNonZero(-8, 8), b = randNonZero(-8, 8)
      if ((a - b) % (k - 1) || (a + b) % (k + 1)) return null
      const s1 = (a - b) / (k - 1), s2 = -(a + b) / (k + 1)
      if (s1 === s2) return null
      return solutionSet(`Résous : (${xPlus(a)})² = (${xPlus(b, k)})²`, [s1, s2], {
        explanation: `A² = B² ⇔ A = B ou A = −B. ${xPlus(a)} = ${xPlus(b, k)} donne x = ${fmt(s1)} ; ${xPlus(a)} = ${poly([-k, 'x'], [-b, ''])} donne x = ${fmt(s2)}.`,
      })
    }),
    () => retry(() => {
      const b = randInt(2, 6), d = randInt(2, 6), u = randNonZero(-9, 9), w = randNonZero(-9, 9), r = pick(RELS)
      if (b === d) return null
      const K = d - b, R = b * w - d * u
      if (R % K) return null
      const v = R / K, rr = K < 0 ? flip(r) : r
      return interval(`Résous : ${F(xPlus(u), b)} ${r} ${F(xPlus(w), d)} (réponse sous forme d'intervalle).`, relInterval(rr, v), {
        explanation: `On multiplie par ${b * d} > 0 : ${d}(${xPlus(u)}) ${r} ${b}(${xPlus(w)}), soit ${poly([K, 'x'])} ${r} ${fmt(R)}${K < 0 ? ` ; on divise par ${fmt(K)} < 0, le sens change` : ''} : x ${rr} ${fmt(v)}.`,
      })
    }),
    () => {
      const ctx = pick([
        { lieu: 'À la piscine', u: 'séance' }, { lieu: 'Au cinéma', u: 'séance' }, { lieu: 'Au club d’escalade', u: 'séance' },
        { lieu: 'À la salle d’armes du château', u: 'leçon' }, { lieu: 'Au centre équestre', u: 'promenade' },
      ])
      const pa = randInt(5, 12), pb = randInt(1, pa - 2), Fx = randInt(4, 24) * 5, diff = pa - pb, q = Fx / diff
      const n = Math.floor(q) + 1
      return numeric(`${ctx.lieu}, formule A : ${pa} € la ${ctx.u}. Formule B : un abonnement de ${Fx} € puis ${pb} € la ${ctx.u}. À partir de combien de ${ctx.u}s la formule B est-elle strictement moins chère ?`, n, {
        explanation: `B moins chère ⇔ ${Fx} + ${pb}n < ${pa}n ⇔ ${diff}n > ${Fx} ⇔ n > ${Number.isInteger(q) ? fmt(q) : `${F(Fx, diff)} ≈ ${fmt(Math.round(q * 10) / 10)}`}. Le plus petit entier qui convient est ${n}.`,
      })
    },
    () => {
      const a = randInt(2, 8), k = randInt(a + 1, a + 12), R = k * k - a * a, what = pick(['plaque de métal', 'feuille de parchemin', 'planche', 'nappe'])
      return numeric(`Dans une ${what} carrée de côté x cm, on découpe un carré de ${a} cm de côté. Il reste ${R} cm². Que vaut x (en cm) ?`, k, {
        explanation: `x² − ${a * a} = ${R}, donc x² = ${k * k} ; x est une longueur, donc positive : x = ${k}.`,
      })
    },
  ],
]

// ── Fonctions ───────────────────────────────────────────────────────────
const fct: Tiers = [
  [
    () => {
      const a = randNonZero(-6, 6), b = randInt(-10, 10), x = randNonZero(-6, 6)
      return numeric(`f(x) = ${poly([a, 'x'], [b, ''])}. Calcule f(${fmt(x)}).`, a * x + b, { explanation: `On remplace x par ${par(x)} : ${sumText([a * x, b])} = ${fmt(a * x + b)}.` })
    },
    () => retry(() => {
      const a = pick([-6, -5, -4, -3, -2, 2, 3, 4, 5, 6]), b = randNonZero(-6, 6), c = randNonZero(-5, 6)
      if (c === b) return null
      return numeric(`f(x) = ${fmt(a)}(${xPlus(-b)}). Calcule f(${fmt(c)}).`, a * (c - b), {
        explanation: `f(${fmt(c)}) = ${fmt(a)} × (${fmt(c)} − ${par(b)}) = ${fmt(a)} × ${par(c - b)} = ${fmt(a * (c - b))}.`,
      })
    }),
    () => {
      const a = pick([-9, -7, -5, -4, -3, -2, 2, 3, 4, 5, 6, 7, 8, 9]), v = randNonZero(-9, 9)
      return numeric(`f(x) = ${poly([a, 'x'])}. Quel est l'antécédent de ${fmt(a * v)} par f ?`, v, {
        explanation: `On cherche x tel que ${poly([a, 'x'])} = ${fmt(a * v)} : x = ${fmt(a * v)} ÷ ${par(a)} = ${fmt(v)}.`,
      })
    },
    () => {
      const xs = new Set<number>()
      while (xs.size < 4) xs.add(randNonZero(-5, 6))
      const X = [...xs].sort((a, b) => a - b)
      const ys = new Set<number>()
      while (ys.size < 4) ys.add(randInt(-9, 9))
      const Y = [...ys], i = randInt(0, 3)
      const intro = `Pour x = ${X.map(fmt).join(' ; ')}, une fonction f prend respectivement les valeurs ${Y.map(fmt).join(' ; ')}.`
      if (pick([true, false])) return numeric(`${intro} Quelle est l'image de ${fmt(X[i])} par f ?`, Y[i], { explanation: `On lit la valeur associée à x = ${fmt(X[i])} : f(${fmt(X[i])}) = ${fmt(Y[i])}.` })
      return numeric(`${intro} Quel est l'antécédent de ${fmt(Y[i])} par f ?`, X[i], { explanation: `On cherche x tel que f(x) = ${fmt(Y[i])} : c'est x = ${fmt(X[i])}.` })
    },
    () => retry(() => {
      const k = randInt(2, 15)
      if (k % 10 === 0) return null
      const x = (k / 10) * pick([1, -1]), v = r2(x * x)
      return numeric(`f est la fonction carré : f(x) = x². Calcule f(${fmt(x)}).`, v, { explanation: `f(${fmt(x)}) = ${par(x)}² = ${fmt(v)} (un carré est toujours positif).` })
    }),
  ],
  [
    () => {
      const a = randInt(-5, 5), b = randInt(-9, 9), x = randInt(-5, -1)
      const v = x * x + a * x + b
      return numeric(`f(x) = ${poly([1, 'x²'], [a, 'x'], [b, ''])}. Calcule f(${fmt(x)}).`, v, { explanation: `Attention : (${fmt(x)})² = ${x * x}. f(${fmt(x)}) = ${sumText([x * x, a * x, b])} = ${fmt(v)}.` })
    },
    () => retry(() => {
      const k = randInt(1, 6), b = randInt(1, 6), x = randNonZero(-3, 6)
      if (x + b === 0) return null
      return fraction(`f(x) = ${F(k, `x + ${b}`)}. Calcule f(${fmt(x)}).`, k, x + b, { explanation: `f(${fmt(x)}) = ${k} ÷ (${fmt(x)} + ${b}) = ${k} ÷ ${par(x + b)} = ${fracText(k, x + b)}.` })
    }),
    () => {
      const k = randNonZero(-6, 6), a = randNonZero(-5, 5)
      return expression(`f est une fonction linéaire telle que f(${fmt(a)}) = ${fmt(k * a)}. Donne l'expression de f(x).`, poly([k, 'x']), 'any', {
        inputHint: 'ex. 3x',
        explanation: `f(x) = ax avec a = ${fmt(k * a)} ÷ ${par(a)} = ${fmt(k)}.`,
      })
    },
    () => retry(() => {
      const p = randNonZero(-9, 9), q = randInt(2, 9)
      if (gcd(Math.abs(p), q) !== 1) return null
      return fraction(`f est la fonction inverse : f(x) = ${F(1, 'x')}. Calcule f(${F(fmt(p), q)}).`, q, p, {
        explanation: `f(${fracText(p, q)}) = 1 ÷ ${fracText(p, q)} = ${fracText(q, p)} : on renverse la fraction.`,
      })
    }),
    () => {
      const a = pick([-8, -7, -6, -5, -4, -3, -2, 2, 3, 4, 5, 6, 7, 8]), b = randNonZero(-12, 12)
      return fraction(`f(x) = ${poly([a, 'x'], [b, ''])}. Pour quelle valeur de x a-t-on f(x) = 0 ?`, -b, a, {
        explanation: `${poly([a, 'x'])} = ${fmt(-b)}, donc x = ${F(fmt(-b), fmt(a))} = ${fracText(-b, a)}.`,
      })
    },
    () => retry(() => {
      const a = randNonZero(-6, 6), b = randNonZero(-6, 6), c = randNonZero(-5, 5)
      if (c === a || c === -b) return null
      return numeric(`f(x) = (${xPlus(-a)})(${xPlus(b)}). Calcule f(${fmt(c)}).`, (c - a) * (c + b), {
        explanation: `f(${fmt(c)}) = (${fmt(c)} − ${par(a)})(${fmt(c)} + ${par(b)}) = ${par(c - a)} × ${par(c + b)} = ${fmt((c - a) * (c + b))}.`,
      })
    }),
  ],
  [
    () => {
      const a = randNonZero(-6, 6), b = randInt(-10, 10), y = randInt(-12, 12)
      return fraction(`f(x) = ${poly([a, 'x'], [b, ''])}. Quel est l'antécédent de ${fmt(y)} par f ?`, y - b, a, { explanation: `On résout ${poly([a, 'x'], [b, ''])} = ${fmt(y)} : ${poly([a, 'x'])} = ${fmt(y - b)}, x = ${fracText(y - b, a)}.` })
    },
    () => {
      const a = randInt(2, 4), b = randNonZero(-5, 5), x = randNonZero(-4, 4)
      const v = a * x * x + b * x - 1
      return numeric(`f(x) = ${poly([a, 'x²'], [b, 'x'], [-1, ''])}. Calcule f(${fmt(x)}).`, v, { explanation: `${a} × ${par(x)}² = ${a * x * x}, puis ${sumText([a * x * x, b * x, -1])} = ${fmt(v)}.` })
    },
    () => retry(() => {
      const m = randNonZero(-5, 5), p = randInt(-8, 8), a = randInt(-5, 1), b = a + randInt(2, 6), max = pick([true, false])
      const at = (m > 0) === max ? b : a
      if (at === 0) return null
      return numeric(`f(x) = ${poly([m, 'x'], [p, ''])}. Quel est le ${max ? 'maximum' : 'minimum'} de f sur l'intervalle [${fmt(a)} ; ${fmt(b)}] ?`, m * at + p, {
        explanation: `Le coefficient ${fmt(m)} est ${m > 0 ? 'positif : f est croissante' : 'négatif : f est décroissante'}, donc le ${max ? 'maximum' : 'minimum'} est atteint en x = ${fmt(at)} : f(${fmt(at)}) = ${fmt(m * at + p)}.`,
      })
    }),
    () => {
      const x0 = randNonZero(-4, 4)
      if (pick([true, false])) {
        const a = randNonZero(-6, 6), p = randNonZero(-9, 9), y0 = a * x0 + p
        return numeric(`f(x) = ax${tail(p)} et f(${fmt(x0)}) = ${fmt(y0)}. Que vaut a ?`, a, {
          explanation: `a × ${par(x0)}${tail(p)} = ${fmt(y0)}, donc a × ${par(x0)} = ${fmt(y0 - p)} et a = ${fmt(a)}.`,
        })
      }
      const k = randInt(1, 3), c = randNonZero(-9, 9), y0 = k * x0 * x0 + c
      return numeric(`f(x) = ${poly([k, 'x²'])} + c et f(${fmt(x0)}) = ${fmt(y0)}. Que vaut c ?`, c, {
        explanation: `${poly([k, 'x²'])} en x = ${fmt(x0)} vaut ${k * x0 * x0}, donc c = ${fmt(y0)} − ${k * x0 * x0} = ${fmt(c)}.`,
      })
    },
    () => {
      const lo = randInt(0, 5), hi = lo + randInt(1, 6)
      if (pick([true, false])) {
        return interval(`On sait que ${lo} ≤ x ≤ ${hi}. Donne l'intervalle auquel appartient x².`, { lo: lo * lo, hi: hi * hi, loClosed: true, hiClosed: true }, {
          explanation: `La fonction carré est croissante sur [0 ; +∞[ : l'ordre est conservé, ${lo}² ≤ x² ≤ ${hi}².`,
        })
      }
      return interval(`On sait que ${fmt(-hi)} ≤ x ≤ ${fmt(-lo)}. Donne l'intervalle auquel appartient x².`, { lo: lo * lo, hi: hi * hi, loClosed: true, hiClosed: true }, {
        explanation: `La fonction carré est décroissante sur ]−∞ ; 0] : l'ordre s'inverse, ${par(-lo)}² ≤ x² ≤ ${par(-hi)}², soit ${lo * lo} ≤ x² ≤ ${hi * hi}.`,
      })
    },
  ],
  [
    () => {
      const k = randInt(1, 9), c = randInt(-5, 5)
      return solutionSet(`f(x) = ${poly([1, 'x²'], [c, ''])}. Trouve tous les antécédents de ${fmt(k * k + c)} par f.`, [-k, k], { explanation: `x² = ${fmt(k * k + c)} − ${par(c)} = ${k * k}, donc x = ${k} ou x = −${k}.` })
    },
    () => {
      const a = randNonZero(-5, 5), k = randInt(1, 6)
      return solutionSet(`f(x) = (${xPlus(-a)})². Trouve tous les antécédents de ${k * k} par f.`, [a - k, a + k], { explanation: `${xPlus(-a)} = ${k} ou ${xPlus(-a)} = −${k}, donc x = ${fmt(a + k)} ou x = ${fmt(a - k)}.` })
    },
    () => {
      const a = randInt(2, 6), b = randNonZero(-8, 8), c = randInt(1, a - 1), x = randNonZero(-6, 6), d = (a - c) * x + b
      return numeric(`f(x) = ${poly([a, 'x'], [b, ''])} et g(x) = ${poly([c, 'x'], [d, ''])}. Pour quelle valeur de x a-t-on f(x) = g(x) ?`, x, {
        explanation: `${poly([a - c, 'x'])} = ${fmt(d)} − ${par(b)} = ${fmt(d - b)}, donc x = ${fmt(x)}.`,
      })
    },
    () => retry(() => {
      const a = randInt(1, 8), b = randInt(1, 8)
      if (a === b) return null
      const M = Math.max(a, b)
      return interval(`On sait que ${fmt(-a)} ≤ x ≤ ${b}. Donne l'intervalle auquel appartient x².`, { lo: 0, hi: M * M, loClosed: true, hiClosed: true }, {
        explanation: `L'intervalle contient 0, où x² vaut 0 (son minimum) ; le maximum est atteint à la borne la plus éloignée de 0 : ${par(a > b ? -a : b)}² = ${M * M}.`,
      })
    }),
    () => {
      const S = [0.2, 0.25, 0.5, 1, 2, 4, 5, 10]
      const i = randInt(0, S.length - 2), j = randInt(i + 1, S.length - 1), neg = pick([true, false])
      const lo = neg ? -S[j] : S[i], hi = neg ? -S[i] : S[j]
      return interval(`On sait que ${fmt(lo)} ≤ x ≤ ${fmt(hi)}. Donne l'intervalle auquel appartient ${F(1, 'x')}.`, { lo: 1 / hi, hi: 1 / lo, loClosed: true, hiClosed: true }, {
        explanation: `La fonction inverse est décroissante sur ${neg ? ']−∞ ; 0[' : ']0 ; +∞['} : l'ordre s'inverse, ${F(1, fmt(hi))} ≤ ${F(1, 'x')} ≤ ${F(1, fmt(lo))}, soit ${fmt(1 / hi)} ≤ ${F(1, 'x')} ≤ ${fmt(1 / lo)}.`,
      })
    },
    () => {
      const ctx = pick([
        { qui: 'Un taxi', var: 'un trajet de x km', q: 'Quelle distance (en km) parcourt-on' },
        { qui: 'Un loueur de barques', var: 'x heures de location', q: 'Combien d’heures loue-t-on une barque' },
        { qui: 'Une imprimerie', var: 'x affiches', q: 'Combien d’affiches obtient-on' },
        { qui: 'Un passeur sur le fleuve', var: 'x tonneaux transportés', q: 'Combien de tonneaux fait-on passer' },
      ])
      const b = pick([0.5, 1, 1.5, 2, 2.5, 3]), a = randInt(2, 8), x = randInt(3, 30), P = b * x + a
      return numeric(`${ctx.qui} : le prix (en €) pour ${ctx.var} est f(x) = ${poly([b, 'x'], [a, ''])}. ${ctx.q} pour ${fmt(P)} € ?`, x, {
        explanation: `On cherche l'antécédent de ${fmt(P)} : ${poly([b, 'x'], [a, ''])} = ${fmt(P)}, donc ${poly([b, 'x'])} = ${fmt(P - a)} et x = ${x}.`,
      })
    },
  ],
  [
    () => retry(() => {
      const m = randNonZero(-4, 4), p = randNonZero(-6, 6), x1 = randNonZero(-3, 2), x2 = x1 + randInt(1, 4)
      if (x2 === 0) return null
      const y1 = m * x1 + p, y2 = m * x2 + p
      return expression(`f est une fonction affine avec f(${fmt(x1)}) = ${fmt(y1)} et f(${fmt(x2)}) = ${fmt(y2)}. Donne l'expression de f(x).`, poly([m, 'x'], [p, '']), 'any', {
        inputHint: 'ex. 2x − 3',
        explanation: `a = (${fmt(y2)} − ${par(y1)}) ÷ (${fmt(x2)} − ${par(x1)}) = ${fmt(m)}, puis b = ${fmt(y1)} − ${par(m)} × ${par(x1)} = ${fmt(p)}.`,
      })
    }),
    () => {
      const v = pick([10, 15, 20, 25, 30]), [what, il] = pick([['d’une flèche', 'elle'], ['d’une balle', 'elle'], ['d’une pierre lancée par une fronde', 'elle'], ['d’un ballon', 'il'], ['d’un boulet de mangonneau', 'il']])
      if (pick([true, false])) {
        const t = randInt(1, v / 5 - 1)
        return numeric(`La hauteur ${what} (en m) après t secondes est h(t) = −5t² + ${v}t. Quelle est sa hauteur à t = ${t} s ?`, -5 * t * t + v * t, {
          explanation: `−5 × ${t}² + ${v} × ${t} = ${fmt(-5 * t * t)} + ${v * t} = ${-5 * t * t + v * t} m.`,
        })
      }
      return numeric(`La hauteur ${what} (en m) après t secondes est h(t) = −5t² + ${v}t. Au bout de combien de secondes retombe-t-${il} au sol ?`, v / 5, {
        explanation: `h(t) = 0 ⇔ t(−5t + ${v}) = 0 ⇔ t = 0 (le lancer) ou t = ${v} ÷ 5 = ${v / 5} s.`,
      })
    },
    () => {
      const ctx = pick([
        () => { const H = randInt(10, 30), r = randInt(1, 3); return { t: `Une bougie de ${H} cm raccourcit de ${r} cm par heure. Exprime sa hauteur f(x) (en cm) après x heures.`, a: -r, b: H } },
        () => { const H = randInt(4, 16) * 50, r = randInt(2, 8) * 5; return { t: `Un réservoir contient ${H} L et se vide de ${r} L par minute. Exprime le volume restant f(x) (en L) après x minutes.`, a: -r, b: H } },
        () => { const H = randInt(5, 20), r = randInt(2, 5); return { t: `Une plante mesure ${H} cm et grandit de ${r} cm par semaine. Exprime sa taille f(x) (en cm) après x semaines.`, a: r, b: H } },
        () => { const H = randInt(4, 20) * 5, r = randInt(1, 3) * 5; return { t: `La tirelire de ${prenom()} contient ${H} € ; chaque semaine, on y ajoute ${r} €. Exprime la somme f(x) (en €) après x semaines.`, a: r, b: H } },
        () => { const r = randInt(4, 12); return { t: `La batterie d’un téléphone est chargée à 100 % et perd ${r} % par heure. Exprime la charge f(x) (en %) après x heures.`, a: -r, b: 100 } },
      ])()
      return expression(ctx.t, poly([ctx.a, 'x'], [ctx.b, '']), 'any', {
        inputHint: 'ex. 20 − 2x',
        explanation: `Valeur de départ ${ctx.b}, puis ${ctx.a > 0 ? '+' : '−'} ${Math.abs(ctx.a)} par unité de temps : f(x) = ${poly([ctx.b, ''], [ctx.a, 'x'])}, une fonction affine.`,
      })
    },
    () => retry(() => {
      const a = randNonZero(-5, 5), c = randNonZero(-5, 5), b = randInt(-8, 8), v = randInt(-6, 6)
      if (a === c) return null
      const d = (a - c) * v + b, strict = pick([true, false]), above = pick([true, false])
      const r: Rel = above ? (strict ? '>' : '≥') : (strict ? '<' : '≤'), k = a - c, rr = k < 0 ? flip(r) : r
      const pos = above ? (strict ? 'strictement au-dessus de' : 'au-dessus de ou sur') : (strict ? 'strictement en dessous de' : 'en dessous de ou sur')
      return interval(`f(x) = ${poly([a, 'x'], [b, ''])} et g(x) = ${poly([c, 'x'], [d, ''])}. Pour quelles valeurs de x la courbe de f est-elle ${pos} celle de g ? (intervalle)`, relInterval(rr, v), {
        explanation: `On résout f(x) ${r} g(x) : ${poly([k, 'x'])} ${r} ${fmt(d - b)}${k < 0 ? ` ; on divise par ${fmt(k)} < 0, le sens change` : ''} : x ${rr} ${fmt(v)}.`,
      })
    }),
    () => {
      const k = randInt(1, 9), c = randInt(-6, 6), strict = pick([true, false])
      return interval(`f(x) = ${poly([1, 'x²'], [c, ''])}. Résous f(x) ${strict ? '<' : '≤'} ${fmt(k * k + c)} (réponse sous forme d'intervalle).`, { lo: -k, hi: k, loClosed: !strict, hiClosed: !strict }, {
        explanation: `x² ${strict ? '<' : '≤'} ${k * k} : ce sont les nombres dont le carré est ${strict ? 'strictement inférieur' : 'inférieur ou égal'} à ${k * k}, donc ceux compris entre −${k} et ${k}.`,
      })
    },
    () => retry(() => {
      const a = randNonZero(-12, 12), b = randInt(-5, 5), c = randInt(-5, 5)
      const divs = [1, 2, 3, 4, 6, 12].filter((d) => a % d === 0).flatMap((d) => [d, -d])
      const d = pick(divs), y = c + d, x = b + a / d
      if (Math.abs(a) < 2) return null
      const f = `${F(fmt(a), xPlus(-b))}${tail(c)}`
      return numeric(`f(x) = ${f}. Quel est l'antécédent de ${fmt(y)} par f ?`, x, {
        explanation: `${c === 0 ? '' : `${F(fmt(a), xPlus(-b))} = ${fmt(y)} − ${par(c)} = ${fmt(d)}, donc `}${xPlus(-b)} = ${F(fmt(a), fmt(d))} = ${fmt(a / d)} et x = ${fmt(x)}.`,
      })
    }),
  ],
]

// ── Vecteurs & repérage ─────────────────────────────────────────────────
const vect: Tiers = [
  [
    () => {
      const xa = randInt(-6, 6), ya = randInt(-6, 6), xb = randInt(-6, 6), yb = randInt(-6, 6)
      return pair(`A${pt(xa, ya)} et B${pt(xb, yb)}. Donne les coordonnées du vecteur AB⃗.`, xb - xa, yb - ya, {
        explanation: `AB⃗(x_B − x_A ; y_B − y_A) = (${fmt(xb)} − ${par(xa)} ; ${fmt(yb)} − ${par(ya)}).`,
      })
    },
    () => {
      const u1 = randInt(-6, 6), u2 = randInt(-6, 6), v1 = randInt(-6, 6), v2 = randInt(-6, 6)
      return pair(`u⃗${pt(u1, u2)} et v⃗${pt(v1, v2)}. Donne les coordonnées de u⃗ + v⃗.`, u1 + v1, u2 + v2, {
        explanation: `On additionne coordonnée par coordonnée : (${sumText([u1, v1])} ; ${sumText([u2, v2])}) = ${pt(u1 + v1, u2 + v2)}.`,
      })
    },
    () => {
      const k = pick([-5, -4, -3, -2, 2, 3, 4, 5]), u1 = randInt(-6, 6), u2 = randNonZero(-6, 6)
      return pair(`u⃗${pt(u1, u2)}. Donne les coordonnées du vecteur ${fmt(k)}u⃗.`, k * u1, k * u2, {
        explanation: `On multiplie chaque coordonnée par ${fmt(k)} : (${fmt(k)} × ${par(u1)} ; ${fmt(k)} × ${par(u2)}).`,
      })
    },
    () => {
      const u1 = randInt(-6, 6), u2 = randInt(-6, 6), v1 = randNonZero(-6, 6), v2 = randNonZero(-6, 6)
      return pair(`u⃗${pt(u1, u2)} et v⃗${pt(v1, v2)}. Donne les coordonnées de u⃗ − v⃗.`, u1 - v1, u2 - v2, {
        explanation: `(${fmt(u1)} − ${par(v1)} ; ${fmt(u2)} − ${par(v2)}) = ${pt(u1 - v1, u2 - v2)}.`,
      })
    },
    () => {
      const dx = randNonZero(-7, 7), dy = randNonZero(-7, 7)
      const who = pick(['Un mangonneau', 'Un pion sur un plateau de jeu', 'Un drone', 'Le héros d’un jeu vidéo', 'Un robot aspirateur', 'Un chevalier sur la carte'])
      return pair(`${who} se déplace de ${plural(Math.abs(dx), 'unité')} vers la ${dx > 0 ? 'droite' : 'gauche'} et de ${plural(Math.abs(dy), 'unité')} vers le ${dy > 0 ? 'haut' : 'bas'}. Donne les coordonnées du vecteur de ce déplacement.`, dx, dy, {
        explanation: `Vers la ${dx > 0 ? 'droite : abscisse positive' : 'gauche : abscisse négative'}, vers le ${dy > 0 ? 'haut : ordonnée positive' : 'bas : ordonnée négative'} : ${pt(dx, dy)}.`,
      })
    },
  ],
  [
    () => {
      const xa = randInt(-6, 6), ya = randInt(-6, 6), xb = randInt(-6, 6), yb = randInt(-6, 6)
      return pair(`A${pt(xa, ya)} et B${pt(xb, yb)}. Donne les coordonnées du milieu M de [AB].`, (xa + xb) / 2, (ya + yb) / 2, {
        explanation: `M(${F('x_A + x_B', 2)} ; ${F('y_A + y_B', 2)}) = (${F(fmt(xa + xb), 2)} ; ${F(fmt(ya + yb), 2)}).`,
      })
    },
    () => {
      const u1 = randInt(-5, 5), u2 = randInt(-5, 5), v1 = randInt(-5, 5), v2 = randInt(-5, 5), k = randInt(2, 3)
      return pair(`u⃗${pt(u1, u2)} et v⃗${pt(v1, v2)}. Donne les coordonnées de ${k}u⃗ + v⃗.`, k * u1 + v1, k * u2 + v2, {
        explanation: `${k}u⃗${pt(k * u1, k * u2)}, puis on ajoute v⃗.`,
      })
    },
    () => {
      const xa = randInt(-5, 5), ya = randInt(-5, 5), dx = randNonZero(-4, 4), dy = randNonZero(-4, 4)
      return pair(`A${pt(xa, ya)} et u⃗${pt(dx, dy)}. B est l'image de A par la translation de vecteur u⃗. Coordonnées de B ?`, xa + dx, ya + dy, {
        explanation: `AB⃗ = u⃗, donc B = (${fmt(xa)} + ${par(dx)} ; ${fmt(ya)} + ${par(dy)}).`,
      })
    },
    () => {
      const xa = randInt(-6, 6), ya = randInt(-6, 6), xm = randInt(-5, 5), ym = randInt(-5, 5)
      return pair(`M${pt(xm, ym)} est le milieu de [AB], avec A${pt(xa, ya)}. Donne les coordonnées de B.`, 2 * xm - xa, 2 * ym - ya, {
        explanation: `x_M = ${F('x_A + x_B', 2)} donne x_B = 2x_M − x_A = ${fmt(2 * xm)} − ${par(xa)} = ${fmt(2 * xm - xa)} ; de même y_B = ${fmt(2 * ym)} − ${par(ya)} = ${fmt(2 * ym - ya)}.`,
      })
    },
    () => {
      const a = randInt(-6, 6), b = randInt(-6, 6), c = randInt(-6, 6), d = randInt(-6, 6)
      return pair(`On sait que AB⃗${pt(a, b)} et BC⃗${pt(c, d)}. Donne les coordonnées de AC⃗.`, a + c, b + d, {
        explanation: `Relation de Chasles : AC⃗ = AB⃗ + BC⃗ = (${sumText([a, c])} ; ${sumText([b, d])}) = ${pt(a + c, b + d)}.`,
      })
    },
  ],
  [
    () => {
      const xa = randInt(-6, 6), ya = randInt(-6, 6)
      const [p, q, r] = pick([[3, 4, 5], [6, 8, 10], [5, 12, 13], [8, 6, 10], [4, 3, 5]])
      const xb = xa + p * pick([1, -1]), yb = ya + q * pick([1, -1])
      return numeric(`A${pt(xa, ya)} et B${pt(xb, yb)} dans un repère orthonormé. Calcule AB.`, r, { explanation: `AB = √{(x_B − x_A)² + (y_B − y_A)²} = √{${p}² + ${q}²} = √{${p * p + q * q}} = ${r}.` })
    },
    () => {
      const P = () => [randInt(-5, 5), randInt(-5, 5)]
      const [xa, ya] = P(), [xb, yb] = P(), [xc, yc] = P()
      return pair(`A${pt(xa, ya)}, B${pt(xb, yb)} et C${pt(xc, yc)}. Donne les coordonnées du point D tel que CD⃗ = AB⃗.`, xc + xb - xa, yc + yb - ya, {
        explanation: `AB⃗${pt(xb - xa, yb - ya)}, donc D = C + AB⃗ = ${pt(xc + xb - xa, yc + yb - ya)}.`,
      })
    },
    () => {
      const a = pick([2, 3, 4, -2, -3]), b = pick([-4, -3, -2, 2, 3]), u1 = randInt(-5, 5), u2 = randInt(-5, 5), v1 = randNonZero(-5, 5), v2 = randNonZero(-5, 5)
      return pair(`u⃗${pt(u1, u2)} et v⃗${pt(v1, v2)}. Donne les coordonnées de ${fmt(a)}u⃗ ${b < 0 ? '−' : '+'} ${Math.abs(b)}v⃗.`, a * u1 + b * v1, a * u2 + b * v2, {
        explanation: `${fmt(a)}u⃗${pt(a * u1, a * u2)} et ${fmt(b)}v⃗${pt(b * v1, b * v2)}, puis on additionne.`,
      })
    },
    () => {
      const k = pick([2, 3, 4, -2, -3, -4, 0.5, -0.5, 1.5, -1.5]), p = randNonZero(-3, 3), q = randNonZero(-3, 3)
      const v1 = 2 * p, v2 = 2 * q
      return numeric(`u⃗${pt(k * v1, k * v2)} et v⃗${pt(v1, v2)}. Trouve le réel k tel que u⃗ = k v⃗.`, k, {
        explanation: `${fmt(k * v1)} = k × ${par(v1)} et ${fmt(k * v2)} = k × ${par(v2)} donnent la même valeur : k = ${fmt(k)}.`,
      })
    },
    () => {
      const k = pick([2, 3, -1, -2]), xa = randInt(-5, 5), ya = randInt(-5, 5), xb = randInt(-5, 5), yb = randInt(-5, 5)
      const dx = xb - xa, dy = yb - ya
      return pair(`A${pt(xa, ya)} et B${pt(xb, yb)}. Donne les coordonnées du point M tel que AM⃗ = ${fmt(k)}AB⃗.`, xa + k * dx, ya + k * dy, {
        explanation: `AB⃗${pt(dx, dy)}, donc AM⃗${pt(k * dx, k * dy)} et M = A + AM⃗ = ${pt(xa + k * dx, ya + k * dy)}.`,
      })
    },
  ],
  [
    () => {
      const P = () => [randInt(-5, 5), randInt(-5, 5)]
      const [xa, ya] = P(), [xb, yb] = P(), [xc, yc] = P()
      return pair(`A${pt(xa, ya)}, B${pt(xb, yb)}, C${pt(xc, yc)}. Donne les coordonnées de D tel que ABCD soit un parallélogramme.`, xa + xc - xb, ya + yc - yb, {
        explanation: `ABCD parallélogramme ⇔ AD⃗ = BC⃗, donc D = A + BC⃗ = ${pt(xa + xc - xb, ya + yc - yb)}.`,
      })
    },
    () => {
      const u1 = randNonZero(-5, 5), u2 = randNonZero(-5, 5), v1 = randNonZero(-6, 6), v2 = randNonZero(-6, 6)
      return numeric(`Calcule le déterminant det(u⃗, v⃗) pour u⃗${pt(u1, u2)} et v⃗${pt(v1, v2)}.`, u1 * v2 - u2 * v1, {
        explanation: `det = ${fmt(u1)} × ${par(v2)} − ${par(u2)} × ${par(v1)} = ${fmt(u1 * v2)} − ${par(u2 * v1)} = ${fmt(u1 * v2 - u2 * v1)}.`,
      })
    },
    () => {
      const xa = randInt(-5, 5), ya = randInt(-5, 5), dx = randNonZero(-3, 3), dy = randNonZero(-4, 4), t = pick([-2, -1, 2, 3])
      const c = xa + t * dx, y = ya + t * dy
      return numeric(`A${pt(xa, ya)} et B${pt(xa + dx, ya + dy)}. Pour quelle valeur de y le point C(${fmt(c)} ; y) est-il aligné avec A et B ?`, y, {
        explanation: `AB⃗${pt(dx, dy)} et x_C − x_A = ${fmt(t * dx)} = ${fmt(t)} × ${par(dx)} : AC⃗ = ${fmt(t)}AB⃗, donc y = ${fmt(ya)} + ${par(t)} × ${par(dy)} = ${fmt(y)}.`,
      })
    },
    () => retry(() => {
      const p = randInt(1, 7), q = randInt(1, 7), n = p * p + q * q
      const [k, m] = rootParts(n)
      if (m === 1) return null
      const xa = randInt(-5, 5), ya = randInt(-5, 5), xb = xa + p * pick([1, -1]), yb = ya + q * pick([1, -1])
      return radical(`A${pt(xa, ya)} et B${pt(xb, yb)} dans un repère orthonormé. Donne la valeur exacte de AB sous la forme a√b.`, k, m, {
        explanation: `AB = √{${p}² + ${q}²} = √{${n}} = ${rt(k, m)}.`,
      })
    }),
    () => retry(() => {
      const xa = randNonZero(-6, 6), xb = randNonZero(-6, 6), ya = randNonZero(-6, 6), yb = randNonZero(-6, 6)
      if (xa === xb) return null
      const num = xb * xb + yb * yb - xa * xa - ya * ya, den = 2 * (xb - xa)
      if (num % den) return null
      const x = num / den
      return numeric(`A${pt(xa, ya)} et B${pt(xb, yb)} dans un repère orthonormé. Le point M(x ; 0) de l'axe des abscisses est à la même distance de A et de B. Trouve x.`, x, {
        explanation: `MA² = MB² : (${xPlus(-xa)})² + ${par(ya)}² = (${xPlus(-xb)})² + ${par(yb)}². Les x² se simplifient : ${poly([den, 'x'])} = ${fmt(num)}, donc x = ${fmt(x)}.`,
      })
    }),
  ],
  [
    () => {
      const a = randNonZero(-4, 4), k = pick([-3, -2, -1, 2, 3]), m = randNonZero(-5, 5)
      return numeric(`Pour quelle valeur de y les vecteurs u⃗${pt(a, m)} et v⃗(${fmt(k * a)} ; y) sont-ils colinéaires ?`, k * m, {
        explanation: `det = ${fmt(a)} × y − ${par(m)} × ${par(k * a)} = 0, donc y = ${fmt(m * k * a)} ÷ ${par(a)} = ${fmt(k * m)}.`,
      })
    },
    () => retry(() => {
      const k = randInt(2, 8), divs = Array.from({ length: k * k }, (_, i) => i + 1).filter((d) => (k * k) % d === 0 && d !== k)
      if (!divs.length) return null
      const a = pick(divs), b = (k * k) / a
      const ex = solutionSet(`Trouve toutes les valeurs du réel m pour lesquelles u⃗(m ; ${a}) et v⃗(${b} ; m) sont colinéaires.`, [-k, k], {
        explanation: `det = m × m − ${a} × ${b} = m² − ${k * k} = 0, donc m = ${k} ou m = −${k}.`,
      })
      return { ...ex, answer: `−${k} ; ${k}` }
    }),
    () => {
      const xi = randInt(-4, 4), yi = randInt(-4, 4), xa = randInt(-6, 6), ya = randInt(-6, 6), xb = randInt(-6, 6), yb = randInt(-6, 6), askC = pick([true, false])
      return pair(`ABCD est un parallélogramme de centre I${pt(xi, yi)}. On donne A${pt(xa, ya)} et B${pt(xb, yb)}. Donne les coordonnées de ${askC ? 'C' : 'D'}.`, askC ? 2 * xi - xa : 2 * xi - xb, askC ? 2 * yi - ya : 2 * yi - yb, {
        explanation: `Les diagonales se coupent en leur milieu : I est le milieu de [${askC ? 'AC' : 'BD'}], donc ${askC ? 'C' : 'D'} = (2x_I − x_${askC ? 'A' : 'B'} ; 2y_I − y_${askC ? 'A' : 'B'}) = ${askC ? pt(2 * xi - xa, 2 * yi - ya) : pt(2 * xi - xb, 2 * yi - yb)}.`,
      })
    },
    () => retry(() => {
      const [p, q, r] = pick([[3, 4, 5], [6, 8, 10], [5, 12, 13], [4, 3, 5], [8, 6, 10], [9, 12, 15], [12, 5, 13]])
      const w1 = p * pick([1, -1]), w2 = q * pick([1, -1]), u1 = randInt(-6, 6), u2 = randInt(-6, 6), v1 = w1 - u1, v2 = w2 - u2
      if (Math.abs(v1) > 9 || Math.abs(v2) > 9 || (u1 === 0 && u2 === 0) || (v1 === 0 && v2 === 0)) return null
      const who = pick([{ n: 'Un drone', il: 'il' }, { n: 'Un navire', il: 'il' }, { n: 'Une éclaireuse à cheval', il: 'elle' }, { n: 'Une montgolfière', il: 'elle' }])
      return numeric(`${who.n} part du point A. ${cap(who.il)} se déplace selon le vecteur u⃗${pt(u1, u2)}, puis selon le vecteur v⃗${pt(v1, v2)}. À quelle distance de A se trouve-t-${who.il} à l'arrivée ? (repère orthonormé, en unités)`, r, {
        explanation: `Déplacement total : u⃗ + v⃗ = ${pt(w1, w2)}, donc la distance vaut √{${par(w1)}² + ${par(w2)}²} = √{${r * r}} = ${r}.`,
      })
    }),
    () => {
      const [p, q, r] = pick([[3, 4, 5], [6, 8, 10], [5, 12, 13], [4, 3, 5], [8, 6, 10], [9, 12, 15], [12, 5, 13]])
      const x = randInt(-5, 5), y = randInt(-5, 5), sx = pick([1, -1]), sy = pick([1, -1])
      return numeric(`Dans un repère orthonormé, A${pt(x, y)}, B${pt(x + sx * p, y)} et C${pt(x + sx * p, y + sy * q)}. Calcule le périmètre du triangle ABC.`, p + q + r, {
        explanation: `AB = ${p} (même ordonnée), BC = ${q} (même abscisse), AC = √{${p}² + ${q}²} = ${r} ; périmètre : ${p} + ${q} + ${r} = ${p + q + r}.`,
      })
    },
  ],
]

// ── Droites & systèmes ──────────────────────────────────────────────────
const droites: Tiers = [
  [
    () => {
      const xa = randInt(-5, 5), ya = randInt(-5, 5), xb = xa + randNonZero(-5, 5), yb = randInt(-8, 8)
      return fraction(`Quel est le coefficient directeur de la droite (AB) avec A${pt(xa, ya)} et B${pt(xb, yb)} ?`, yb - ya, xb - xa, {
        explanation: `m = ${F('y_B − y_A', 'x_B − x_A')} = ${F(fmt(yb - ya), fmt(xb - xa))} = ${fracText(yb - ya, xb - xa)}.`,
      })
    },
    () => {
      const m = randNonZero(-6, 6), p = randNonZero(-9, 9), askM = pick([true, false])
      return numeric(`La droite d a pour équation y = ${fmt(p)} ${m < 0 ? '−' : '+'} ${term(Math.abs(m), 'x', true)}. Quel est ${askM ? 'son coefficient directeur' : 'son ordonnée à l\'origine'} ?`, askM ? m : p, {
        explanation: `Sous la forme y = mx + p : y = ${poly([m, 'x'], [p, ''])}, donc ${askM ? `m = ${fmt(m)}` : `p = ${fmt(p)}`}.`,
      })
    },
    () => {
      const m = randNonZero(-5, 5), p = randInt(-8, 8), x = randNonZero(-6, 6)
      return numeric(`Quelle est l'ordonnée du point de la droite d'équation y = ${poly([m, 'x'], [p, ''])} d'abscisse ${fmt(x)} ?`, m * x + p, { explanation: `On remplace x par ${par(x)} : y = ${sumText([m * x, p])} = ${fmt(m * x + p)}.` })
    },
    () => {
      const m = randNonZero(-6, 6), a = randNonZero(-6, 6)
      return expression(`Donne l'équation réduite de la droite qui passe par l'origine du repère et par A${pt(a, m * a)}.`, poly([m, 'x']), 'any', {
        answer: `y = ${poly([m, 'x'])}`, inputHint: 'y = mx',
        explanation: `Elle passe par l'origine : y = mx, avec m = ${fmt(m * a)} ÷ ${par(a)} = ${fmt(m)}.`,
      })
    },
    () => {
      const a = randInt(-8, 8), b = randNonZero(-9, 9)
      return expression(`Donne l'équation réduite de la droite parallèle à l'axe des abscisses passant par A${pt(a, b)}.`, String(b), 'any', {
        answer: `y = ${fmt(b)}`, inputHint: 'y = …',
        explanation: `Une droite horizontale a un coefficient directeur nul : tous ses points ont pour ordonnée ${fmt(b)}, donc y = ${fmt(b)}.`,
      })
    },
  ],
  [
    () => {
      const m = randNonZero(-5, 5), p = randInt(-8, 8), x = randNonZero(-4, 4)
      return numeric(`La droite d a pour coefficient directeur ${fmt(m)} et passe par A(${fmt(x)} ; ${fmt(m * x + p)}). Quelle est son ordonnée à l'origine ?`, p, {
        explanation: `${fmt(m * x + p)} = ${fmt(m)} × ${par(x)} + p, donc p = ${fmt(m * x + p)} − ${par(m * x)} = ${fmt(p)}.`,
      })
    },
    () => {
      const m = randNonZero(-5, 5), r = randNonZero(-6, 6), p = -m * r
      return pair(`En quel point la droite d'équation y = ${poly([m, 'x'], [p, ''])} coupe-t-elle l'axe des abscisses ?`, r, 0, {
        explanation: `Sur l'axe des abscisses, y = 0 : ${poly([m, 'x'], [p, ''])} = 0 donne x = ${fmt(r)}. Point (${fmt(r)} ; 0).`,
      })
    },
    () => {
      const p = randNonZero(-6, 6), a = randNonZero(-5, 5), b = randInt(-9, 9)
      return fraction(`La droite d'équation y = mx${tail(p)} passe par A${pt(a, b)}. Que vaut m ?`, b - p, a, {
        explanation: `${fmt(b)} = m × ${par(a)}${tail(p)}, donc m × ${par(a)} = ${fmt(b - p)} et m = ${fracText(b - p, a)}.`,
      })
    },
    () => {
      const ctx = pick([
        { t: 'Une rampe d’accès monte de', up: true }, { t: 'Une route de montagne monte de', up: true }, { t: 'Le chemin vers le donjon monte de', up: true },
        { t: 'Une piste de ski descend de', up: false }, { t: 'Un toboggan descend de', up: false }, { t: 'Un sentier descend de', up: false },
      ])
      const h = randInt(1, 12), d = randInt(4, 60)
      return fraction(`${ctx.t} ${h} m pour ${d} m parcourus à l'horizontale. Dans un repère où l'axe des abscisses est horizontal (dans le sens de la marche), quel est le coefficient directeur de cette pente ?`, ctx.up ? h : -h, d, {
        explanation: `m = ${F('variation verticale', 'variation horizontale')} = ${F(ctx.up ? h : `−${h}`, d)} = ${fracText(ctx.up ? h : -h, d)}${ctx.up ? '' : ' (négatif car ça descend)'}.`,
      })
    },
    () => {
      const xa = randInt(-5, 5), ya = randInt(-5, 5), xb = xa + randNonZero(-5, 5), yb = randInt(-8, 8), p = randNonZero(-7, 7)
      return fraction(`A${pt(xa, ya)} et B${pt(xb, yb)}. Pour quelle valeur de a la droite d'équation y = ax${tail(p)} est-elle parallèle à (AB) ?`, yb - ya, xb - xa, {
        explanation: `Deux droites parallèles ont le même coefficient directeur : a = ${F(fmt(yb - ya), fmt(xb - xa))} = ${fracText(yb - ya, xb - xa)}.`,
      })
    },
  ],
  [
    () => {
      const m = randNonZero(-4, 4), p = randInt(-6, 6), x1 = randInt(-4, 1), x2 = x1 + randInt(1, 4)
      return expression(`Donne l'équation réduite de la droite passant par A${pt(x1, m * x1 + p)} et B${pt(x2, m * x2 + p)}.`, poly([m, 'x'], [p, '']), 'any', {
        answer: `y = ${poly([m, 'x'], [p, ''])}`, inputHint: 'y = mx + p',
        explanation: `m = ${F(fmt(m * x2 - m * x1), fmt(x2 - x1))} = ${fmt(m)}, puis p = y_A − m x_A = ${fmt(m * x1 + p)} − ${par(m * x1)} = ${fmt(p)}.`,
      })
    },
    () => {
      const b = pick([1, 2, 3, -1, -2, -3]), m = randNonZero(-5, 5), p = randInt(-6, 6)
      const a = -m * b, c = -p * b
      return expression(`Donne l'équation réduite de la droite d'équation ${poly([a, 'x'], [b, 'y'], [c, ''])} = 0.`, poly([m, 'x'], [p, '']), 'any', {
        answer: `y = ${poly([m, 'x'], [p, ''])}`, inputHint: 'y = mx + p',
        explanation: `On isole y : ${poly([b, 'y'])} = ${poly([-a, 'x'], [-c, ''])}${b !== 1 ? `, puis on divise par ${par(b)}` : ''} : y = ${poly([m, 'x'], [p, ''])}.`,
      })
    },
    () => {
      const m = randNonZero(-4, 4), p = randInt(-6, 6), xa = randNonZero(-4, 4), ya = randInt(-6, 6)
      return expression(`Donne l'équation réduite de la droite parallèle à la droite y = ${poly([m, 'x'], [p, ''])} passant par A${pt(xa, ya)}.`, poly([m, 'x'], [ya - m * xa, '']), 'any', {
        answer: `y = ${poly([m, 'x'], [ya - m * xa, ''])}`, inputHint: 'y = mx + p',
        explanation: `Même coefficient directeur ${fmt(m)}, puis p = ${fmt(ya)} − ${par(m)} × ${par(xa)} = ${fmt(ya - m * xa)}.`,
      })
    },
    () => {
      const a = randNonZero(-6, 6), b = randNonZero(-8, 8)
      return fraction(`Une droite a pour vecteur directeur u⃗${pt(a, b)}. Quel est son coefficient directeur ?`, b, a, {
        explanation: `Un vecteur directeur (1 ; m) ou, plus généralement, (a ; b) avec a ≠ 0 donne m = ${F('b', 'a')} = ${F(fmt(b), fmt(a))} = ${fracText(b, a)}.`,
      })
    },
    () => {
      const q = randNonZero(-5, 5), m = randNonZero(-4, 4), p = -m * q
      return expression(`La droite d coupe l'axe des ordonnées au point d'ordonnée ${fmt(p)} et l'axe des abscisses au point d'abscisse ${fmt(q)}. Donne son équation réduite.`, poly([m, 'x'], [p, '']), 'any', {
        answer: `y = ${poly([m, 'x'], [p, ''])}`, inputHint: 'y = mx + p',
        explanation: `Elle passe par (0 ; ${fmt(p)}) et (${fmt(q)} ; 0) : p = ${fmt(p)} et m = ${F(`0 − ${par(p)}`, `${fmt(q)} − 0`)} = ${fmt(m)}.`,
      })
    },
  ],
  [
    () => retry(() => {
      const x = randInt(-5, 5), m1 = randNonZero(-4, 4), m2 = randNonZero(-4, 4), y = randInt(-6, 6)
      if (m1 === m2) return null
      const p1 = y - m1 * x, p2 = y - m2 * x
      return pair(`Donne les coordonnées du point d'intersection des droites y = ${poly([m1, 'x'], [p1, ''])} et y = ${poly([m2, 'x'], [p2, ''])}.`, x, y, {
        explanation: `${poly([m1, 'x'], [p1, ''])} = ${poly([m2, 'x'], [p2, ''])} donne ${poly([m1 - m2, 'x'])} = ${fmt(p2 - p1)}, x = ${fmt(x)}, puis y = ${fmt(y)}.`,
      })
    }),
    () => retry(() => {
      const x0 = randInt(-5, 5), y0 = randInt(-6, 6), a = randNonZero(-4, 4), c = randNonZero(-5, 5), d = randNonZero(-4, 4)
      if (c + d * a === 0) return null
      const b = y0 - a * x0, e = c * x0 + d * y0
      return pair(`Résous le système : y = ${poly([a, 'x'], [b, ''])} et ${poly([c, 'x'], [d, 'y'])} = ${fmt(e)}. Donne le couple (x ; y).`, x0, y0, {
        explanation: `Par substitution : ${poly([c, 'x'])} + ${par(d)}(${poly([a, 'x'], [b, ''])}) = ${fmt(e)}, soit ${poly([c + d * a, 'x'])} = ${fmt(e - d * b)}, x = ${fmt(x0)}, puis y = ${fmt(y0)}.`,
      })
    }),
    () => {
      const xa = randInt(-5, 5), ya = randInt(-6, 6), dx = randNonZero(-3, 3), m = randNonZero(-3, 3), dy = m * dx, p = ya - m * xa
      return expression(`Donne l'équation réduite de la droite passant par A${pt(xa, ya)} et de vecteur directeur u⃗${pt(dx, dy)}.`, poly([m, 'x'], [p, '']), 'any', {
        answer: `y = ${poly([m, 'x'], [p, ''])}`, inputHint: 'y = mx + p',
        explanation: `m = ${F(fmt(dy), fmt(dx))} = ${fmt(m)}, puis p = ${fmt(ya)} − ${par(m)} × ${par(xa)} = ${fmt(p)}.`,
      })
    },
    () => retry(() => {
      const k = randNonZero(-6, 6), c1 = randNonZero(-4, 4), c2 = randNonZero(-4, 4), e1 = randNonZero(-6, 6)
      if (c1 === c2) return null
      const e2 = c1 * k + e1 - c2 * k, p1 = randInt(-6, 6), p2 = randInt(-6, 6)
      if (e2 === 0 || Math.abs(e2) > 20 || p1 === p2) return null
      const A = poly([c1, 'k'], [e1, '']), B = poly([c2, 'k'], [e2, ''])
      return numeric(`Pour quelle valeur du réel k les droites d'équations y = (${A})x${tail(p1)} et y = (${B})x${tail(p2)} sont-elles parallèles ?`, k, {
        explanation: `Parallèles ⇔ même coefficient directeur : ${A} = ${B}, soit ${poly([c1 - c2, 'k'])} = ${fmt(e2 - e1)}, donc k = ${fmt(k)}.`,
      })
    }),
    () => retry(() => {
      const ctx = pick([
        { q: 'Deux loueurs de vélos', u: 'heure', us: 'heures' }, { q: 'Deux salles de sport', u: 'séance', us: 'séances' },
        { q: 'Deux caravanes marchandes', u: 'lieue', us: 'lieues' }, { q: 'Deux sociétés de taxis', u: 'km', us: 'km' },
      ])
      const a = randInt(1, 4), c = a + randInt(1, 4), d = pick([0, 0, randInt(2, 10)]), x0 = randInt(3, 15), b = d + (c - a) * x0
      return numeric(`${ctx.q} : la première facture ${b} € plus ${a} € par ${ctx.u}, la seconde ${d === 0 ? '' : `${d} € plus `}${c} € par ${ctx.u}. Pour combien de ${ctx.us} les deux tarifs sont-ils égaux ?`, x0, {
        explanation: `On résout ${poly([a, 'x'], [b, ''])} = ${poly([c, 'x'], [d, ''])} : ${c - a === 1 ? 'x' : `${c - a}x`} = ${b - d}, donc x = ${x0} : c'est l'abscisse du point d'intersection des deux droites.`,
      })
    }),
  ],
  [
    () => retry(() => {
      const x = randInt(-5, 5), y = randInt(-5, 5)
      const a = randInt(1, 4), b = randNonZero(-4, 4), c = randNonZero(-4, 4), e = randInt(1, 4)
      if (a * e - b * c === 0) return null
      return pair(`Résous le système : ${poly([a, 'x'], [b, 'y'])} = ${fmt(a * x + b * y)} et ${poly([c, 'x'], [e, 'y'])} = ${fmt(c * x + e * y)}. Donne le couple (x ; y).`, x, y, {
        explanation: `Par combinaison (on élimine x en multipliant la 1re équation par ${fmt(c)} et la 2e par ${fmt(a)}) : ${fmt(a * e - b * c)}y = ${fmt((a * e - b * c) * y)}, y = ${fmt(y)}, puis x = ${fmt(x)}.`,
      })
    }),
    () => retry(() => {
      const ep = randInt(10, 40), bo = randInt(5, 25), a = randInt(2, 4), b = randInt(1, 3), c = randInt(1, 2), d = randInt(2, 5)
      if (a * d === b * c) return null
      const askE = pick([true, false])
      return numeric(`Au marché, ${a} épées et ${plural(b, 'bouclier')} coûtent ${a * ep + b * bo} écus ; ${plural(c, 'épée')} et ${d} boucliers coûtent ${c * ep + d * bo} écus. Quel est le prix d'${askE ? 'une épée' : 'un bouclier'} (en écus) ?`, askE ? ep : bo, {
        explanation: `Système ${a}e + ${b === 1 ? '' : b}b = ${a * ep + b * bo} et ${c === 1 ? '' : c}e + ${d}b = ${c * ep + d * bo} : e = ${ep}, b = ${bo}.`,
      })
    }),
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
    () => retry(() => {
      const x0 = randInt(-4, 4), y0 = randInt(-5, 5), m1 = randNonZero(-3, 3), m2 = randNonZero(-3, 3)
      if (m1 === m2) return null
      const [s, t] = [randNonZero(-3, 3), randNonZero(-3, 3)], [u, w] = [randNonZero(-3, 3), randNonZero(-3, 3)]
      if (s === t || u === w) return null
      const P = (d: number, m: number) => pt(x0 + d, y0 + m * d)
      return pair(`A${P(s, m1)}, B${P(t, m1)}, C${P(u, m2)} et D${P(w, m2)}. Donne les coordonnées du point d'intersection des droites (AB) et (CD).`, x0, y0, {
        explanation: `(AB) : y = ${poly([m1, 'x'], [y0 - m1 * x0, ''])} ; (CD) : y = ${poly([m2, 'x'], [y0 - m2 * x0, ''])}. En égalant : x = ${fmt(x0)}, puis y = ${fmt(y0)}.`,
      })
    }),
    () => retry(() => {
      const obj = pick([{ n: 'cavalier', N: 'Un premier cavalier' }, { n: 'cycliste', N: 'Un premier cycliste' }, { n: 'messager', N: 'Un premier messager' }, { n: 'coureur', N: 'Un premier coureur' }])
      const v1 = randInt(8, 20), v2 = v1 + randInt(2, 12), h = pick([0.5, 1, 1.5, 2]), t = (v1 * h) / (v2 - v1)
      if (!Number.isInteger(t * 2) || t > 10) return null
      return numeric(`${obj.N} part à ${v1} km/h. ${fmt(h)} h plus tard, un second ${obj.n} part du même endroit, sur la même route, à ${v2} km/h. Au bout de combien d'heures après son départ le second rattrape-t-il le premier ?`, t, {
        explanation: `Après t heures pour le second : il a parcouru ${v2}t km, le premier ${v1}(t + ${fmt(h)}) km. ${v2}t = ${v1}t + ${fmt(v1 * h)} donne ${v2 - v1}t = ${fmt(v1 * h)}, t = ${fmt(t)} h.`,
      })
    }),
  ],
]

// ── Statistiques & probabilités (les érudits du monastère) ───────────────
const stat: Tiers = [
  [
    () => {
      const n1 = randInt(6, 18), n2 = randInt(6, 18), c1 = randInt(1, 3), c2 = randInt(1, 3)
      const mean = r2((n1 * c1 + n2 * c2) / (c1 + c2))
      return numeric(`${prenom()} a eu ${n1} (coef. ${c1}) et ${n2} (coef. ${c2}). Quelle est sa moyenne ? (arrondie au centième)`, mean, {
        explanation: `(${n1} × ${c1} + ${n2} × ${c2}) ÷ ${c1 + c2} = ${n1 * c1 + n2 * c2} ÷ ${c1 + c2} ≈ ${fmt(mean)}.`,
      })
    },
    () => retry(() => {
      const ctx = pick([
        { t: (n: number) => `Voici l'âge (en années) de ${n} moines du monastère :`, lo: 20, hi: 80, u: 'ans' },
        { t: (n: number) => `Voici les scores de ${prenom()} sur ${n} parties d'un jeu vidéo :`, lo: 50, hi: 150, u: 'points' },
        { t: (n: number) => `Voici le nombre de pages copiées par ${pick(MOINES)} pendant ${n} jours :`, lo: 3, hi: 20, u: 'pages' },
        { t: (n: number) => `Voici les temps (en min) de ${n} coureurs sur un 10 km :`, lo: 38, hi: 70, u: 'min' },
      ])
      const n = randInt(4, 6), vals = Array.from({ length: n }, () => randInt(ctx.lo, ctx.hi)), s = sum(vals)
      if ((s * 100) % n) return null
      return numeric(`${ctx.t(n)} ${vals.join(' ; ')}. Calcule la moyenne de cette série.`, s / n, { explanation: `Somme : ${s}, divisée par l'effectif ${n} : ${fmt(s / n)} ${ctx.u}.` })
    }),
    () => {
      const t = pick([2, 5, 10, 15, 20, 30, 40, 60]) * pick([1, -1])
      if (pick([true, false])) {
        return numeric(`Quel est le coefficient multiplicateur associé à une ${t > 0 ? 'hausse' : 'baisse'} de ${Math.abs(t)} % ?`, 1 + t / 100, {
          explanation: `1 ${t > 0 ? '+' : '−'} ${F(Math.abs(t), 100)} = ${fmt(1 + t / 100)}.`,
        })
      }
      return numeric(`Une quantité est multipliée par ${fmt(1 + t / 100)}. Quel est le taux d'évolution (en %, positif pour une hausse, négatif pour une baisse) ?`, t, {
        explanation: `${fmt(1 + t / 100)} = 1 ${t > 0 ? '+' : '−'} ${fmt(Math.abs(t) / 100)} : c'est une ${t > 0 ? 'hausse' : 'baisse'} de ${Math.abs(t)} %.`,
      })
    },
    () => {
      const ctx = pick([
        { t: 'Un moine tire au hasard un jeton dans une urne', c: ['rouges', 'blancs', 'noirs'], w: 'un jeton' },
        { t: 'On tire au hasard une bille dans un sac', c: ['rouges', 'bleues', 'vertes'], w: 'une bille' },
        { t: 'Dans un jeu vidéo, un coffre donne au hasard une gemme parmi un lot', c: ['rouges', 'bleues', 'violettes'], w: 'une gemme' },
      ])
      const counts = [randInt(2, 9), randInt(2, 9), randInt(2, 9)], i = randInt(0, 2), total = sum(counts)
      const desc = counts.map((n, j) => `${n} ${ctx.c[j]}`).join(', ').replace(/, ([^,]*)$/, ' et $1')
      return fraction(`${ctx.t} contenant ${desc}. Quelle est la probabilité d'obtenir ${ctx.w} ${ctx.c[i].replace(/s$/, '')} ?`, counts[i], total, {
        explanation: `Il y a ${counts[i]} issues favorables sur ${total} issues équiprobables : ${F(counts[i], total)}.`,
      })
    },
    () => {
      const t = pick([5, 10, 15, 20, 25, 30, 40, 50, 60, 75]), N = randInt(2, 30) * 20
      const ctx = pick(['moines du monastère', 'élèves du lycée', 'spectateurs du concert', 'manuscrits de la bibliothèque', 'joueurs inscrits au tournoi'])
      return numeric(`Combien font ${t} % des ${N} ${ctx} ?`, (t * N) / 100, { explanation: `${t} % de ${N} = ${F(t, 100)} × ${N} = ${fmt(t / 100)} × ${N} = ${fmt((t * N) / 100)}.` })
    },
    () => {
      const p = randInt(1, 19) / 20
      const ctx = pick([
        { t: `La probabilité qu'il pleuve demain est ${fmt(p)}. Quelle est la probabilité qu'il ne pleuve pas ?` },
        { t: `La probabilité que le frère cuisinier rate son pain est ${fmt(p)}. Quelle est la probabilité qu'il le réussisse ?` },
        { t: `Pour un événement A, P(A) = ${fmt(p)}. Calcule P(Ā), la probabilité de l'événement contraire.` },
        { t: `La probabilité de gagner à un jeu de fête foraine est ${fmt(p)}. Quelle est la probabilité de perdre ?` },
      ])
      return numeric(ctx.t, r2(1 - p), { explanation: `Événement contraire : 1 − ${fmt(p)} = ${fmt(r2(1 - p))}.` })
    },
  ],
  [
    () => {
      const v0 = randInt(2, 20) * 20, t = pick([5, 10, 15, 20, 25, 30, 40, 50]) * pick([1, -1])
      const v1 = (v0 * (100 + t)) / 100, what = pick(['Le prix d’un manuscrit', 'Le prix d’une console', 'Le nombre de visiteurs d’un musée', 'Le prix d’un cheval'])
      const unit = /visiteurs/.test(what) ? '' : what.includes('console') ? ' €' : ' écus'
      return numeric(`${what} passe de ${v0}${unit} à ${fmt(v1)}${unit}. Quel est le taux d'évolution (en %, négatif pour une baisse) ?`, t, {
        explanation: `${F(`${fmt(v1)} − ${v0}`, v0)} = ${fmt(t / 100)}, soit ${fmt(t)} %.`,
      })
    },
    () => {
      const n = pick([7, 9, 11])
      const vals = Array.from({ length: n }, () => randInt(1, 30)).sort((a, b) => a - b)
      const shuffled = [...vals].sort(() => Math.random() - 0.5)
      return numeric(`Voici une série : ${shuffled.join(' ; ')}. Quelle est sa médiane ?`, vals[(n - 1) / 2], {
        explanation: `On range la série dans l'ordre : ${vals.join(' ; ')}. La valeur centrale (rang ${(n + 1) / 2}) est ${vals[(n - 1) / 2]}.`,
      })
    },
    () => {
      const V = randInt(4, 60) * 5, t = pick([5, 10, 15, 20, 25, 30, 40, 50]), up = pick([true, false])
      const what = pick([{ t: 'Un manuscrit enluminé coûte', u: 'écus' }, { t: 'Un jeu vidéo coûte', u: '€' }, { t: 'Un vélo coûte', u: '€' }, { t: 'Un billet de train coûte', u: '€' }, { t: 'Une cloche pour le monastère coûte', u: 'écus' }])
      const v = r2(V * (1 + (up ? t : -t) / 100))
      return numeric(`${what.t} ${V} ${what.u}. Son prix ${up ? 'augmente' : 'baisse'} de ${t} %. Quel est son nouveau prix (en ${what.u}) ?`, v, {
        explanation: `Coefficient multiplicateur : ${fmt(1 + (up ? t : -t) / 100)}. ${V} × ${fmt(1 + (up ? t : -t) / 100)} = ${fmt(v)} ${what.u}.`,
      })
    },
    () => retry(() => {
      const xs = [randInt(2, 6), 0, 0]
      xs[1] = xs[0] + randInt(1, 4)
      xs[2] = xs[1] + randInt(1, 4)
      const ns = [randInt(2, 8), randInt(2, 8), randInt(2, 8)], N = sum(ns), S = xs[0] * ns[0] + xs[1] * ns[1] + xs[2] * ns[2]
      if ((S * 100) % N) return null
      const intro = pick([
        `Au monastère, on a compté les manuscrits copiés ce mois-ci : ${ns[0]} moines en ont copié ${xs[0]}, ${ns[1]} moines en ont copié ${xs[1]} et ${ns[2]} moines en ont copié ${xs[2]}.`,
        `Dans un club, ${ns[0]} joueurs ont marqué ${xs[0]} buts, ${ns[1]} joueurs ${xs[1]} buts et ${ns[2]} joueurs ${xs[2]} buts cette saison.`,
      ])
      return numeric(`${intro} Quelle est la moyenne de cette série ?`, S / N, {
        explanation: `Moyenne pondérée par les effectifs : (${xs[0]} × ${ns[0]} + ${xs[1]} × ${ns[1]} + ${xs[2]} × ${ns[2]}) ÷ ${N} = ${S} ÷ ${N} = ${fmt(S / N)}.`,
      })
    }),
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
    () => {
      const t = pick([10, 20, 25, 50])
      const up = pick([true, false])
      return numeric(`Un prix ${up ? 'augmente' : 'baisse'} de ${t} % puis ${up ? 'baisse' : 'augmente'} de ${t} %. Quelle est l'évolution globale (en %, réponse signée) ?`, ((1 + t / 100) * (1 - t / 100) - 1) * 100, {
        explanation: `${fmt(1 + t / 100)} × ${fmt(1 - t / 100)} = ${fmt((1 + t / 100) * (1 - t / 100))} : c'est une baisse de ${fmt((t * t) / 100)} %, pas un retour au prix de départ !`,
      })
    },
    () => {
      const [t, r] = pick([[25, -20], [100, -50], [-20, 25], [-50, 100], [60, -37.5], [-60, 150], [150, -60], [-37.5, 60]])
      return numeric(`Un prix ${t > 0 ? 'augmente' : 'baisse'} de ${fmt(Math.abs(t))} %. De quel pourcentage doit-il évoluer pour revenir à sa valeur initiale ? (réponse signée, en %)`, r, {
        explanation: `Coefficient réciproque : 1 ÷ ${fmt(1 + t / 100)} = ${fmt(1 + r / 100)}, soit ${fmt(r)} %.`,
      })
    },
    () => {
      const t = pick([10, 20, 25, 50, -10, -20, -25, -40]), V0 = randInt(2, 30) * 20, V = (V0 * (100 + t)) / 100
      const what = pick([{ t: 'le prix d’un cheval vaut', u: 'écus' }, { t: 'le prix d’une trottinette vaut', u: '€' }, { t: 'le loyer d’un atelier vaut', u: '€' }, { t: 'le prix d’un psautier vaut', u: 'écus' }])
      return numeric(`Après une ${t > 0 ? 'hausse' : 'baisse'} de ${Math.abs(t)} %, ${what.t} ${fmt(V)} ${what.u}. Quelle était sa valeur initiale (en ${what.u}) ?`, V0, {
        explanation: `Valeur initiale × ${fmt(1 + t / 100)} = ${fmt(V)}, donc valeur initiale = ${fmt(V)} ÷ ${fmt(1 + t / 100)} = ${V0} ${what.u}.`,
      })
    },
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
    () => retry(() => {
      const k = randInt(3, 4), notes = Array.from({ length: k }, () => randInt(6, 18)), M = randInt(10, 15), x = M * (k + 1) - sum(notes)
      if (x < 0 || x > 20) return null
      return numeric(`${prenom()} a obtenu ${notes.join(' ; ')} à ses ${k} premiers devoirs. Quelle note faut-il au prochain devoir (même coefficient) pour avoir exactement ${M} de moyenne ?`, x, {
        explanation: `Il faut un total de ${M} × ${k + 1} = ${M * (k + 1)} points ; on en a ${sum(notes)}, il manque ${x}.`,
      })
    }),
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
    () => {
      const pa = randInt(2, 6) / 10, pb = randInt(2, 6) / 10, pab = randInt(1, Math.round(Math.min(pa, pb) * 10)) / 10
      return numeric(`P(A) = ${fmt(pa)}, P(B) = ${fmt(pb)} et P(A ∩ B) = ${fmt(pab)}. Calcule P(A ∪ B).`, r2(pa + pb - pab), { explanation: `P(A ∪ B) = P(A) + P(B) − P(A ∩ B) = ${fmt(pa)} + ${fmt(pb)} − ${fmt(pab)} = ${fmt(r2(pa + pb - pab))}.` })
    },
    () => {
      const xs: number[] = []
      let v = randInt(0, 2)
      const m = randInt(4, 5)
      for (let i = 0; i < m; i++) { xs.push(v); v += randInt(1, 2) }
      const ns = xs.map(() => randInt(1, 9)), N = sum(ns)
      const flat = xs.flatMap((x, i) => Array(ns[i]).fill(x) as number[])
      const med = N % 2 ? flat[(N - 1) / 2] : (flat[N / 2 - 1] + flat[N / 2]) / 2
      const ctx = pick(['manuscrits copiés par moine', 'buts marqués par match', 'frères et sœurs par élève', 'cierges allumés par jour'])
      return numeric(`Nombre de ${ctx} : ${xs.map((x, i) => `${x} (effectif ${ns[i]})`).join(' ; ')}. Quelle est la médiane de cette série ?`, med, {
        explanation: `Effectif total ${N}. ${N % 2 ? `La médiane est la ${(N + 1) / 2}e valeur` : `La médiane est la moyenne des ${N / 2}e et ${N / 2 + 1}e valeurs`} de la série rangée : ${fmt(med)}.`,
      })
    },
    () => {
      const pab = randInt(1, 3) / 10, pa = pab + randInt(1, 4) / 10, pb = pab + randInt(1, 4) / 10, pu = r2(pa + pb - pab)
      return numeric(`P(A) = ${fmt(r2(pa))}, P(B) = ${fmt(r2(pb))} et P(A ∪ B) = ${fmt(pu)}. Calcule P(A ∩ B).`, r2(pab), {
        explanation: `P(A ∪ B) = P(A) + P(B) − P(A ∩ B), donc P(A ∩ B) = ${fmt(r2(pa))} + ${fmt(r2(pb))} − ${fmt(pu)} = ${fmt(r2(pab))}.`,
      })
    },
    () => {
      const i = randInt(2, 10), a = i + randInt(3, 20), b = i + randInt(3, 20), c = randInt(2, 15), N = a + b - i + c, askBoth = pick([true, false])
      return fraction(`Dans un monastère de ${N} moines, ${a} sont copistes, ${b} sont enlumineurs et ${c} ne sont ni l'un ni l'autre. On choisit un moine au hasard : quelle est la probabilité qu'il soit ${askBoth ? 'à la fois copiste et enlumineur' : 'copiste mais pas enlumineur'} ?`, askBoth ? i : a - i, N, {
        explanation: `${N} − ${c} = ${N - c} moines sont copistes ou enlumineurs, donc ${a} + ${b} − ${N - c} = ${i} sont les deux${askBoth ? '' : ` ; copistes seulement : ${a} − ${i} = ${a - i}`}. Probabilité : ${F(askBoth ? i : a - i, N)}.`,
      })
    },
    () => retry(() => {
      const ctx = pick([
        { g: ['la classe A', 'la classe B'], w: 'élèves', q: 'la moyenne au contrôle', il: 'elle', lo: 8, hi: 15 },
        { g: ['le monastère du Nord', 'le monastère du Sud'], w: 'moines', q: 'l’âge moyen', il: 'il', lo: 30, hi: 60 },
        { g: ['l’équipe rouge', 'l’équipe bleue'], w: 'joueurs', q: 'le score moyen', il: 'il', lo: 40, hi: 90 },
      ])
      const n1 = randInt(10, 35), n2 = randInt(10, 35), m1 = randInt(ctx.lo, ctx.hi), m2 = randInt(ctx.lo, ctx.hi), S = n1 * m1 + n2 * m2, N = n1 + n2
      if (m1 === m2 || (S * 100) % N) return null
      return numeric(`Dans ${ctx.g[0]} (${n1} ${ctx.w}), ${ctx.q} vaut ${m1} ; dans ${ctx.g[1]} (${n2} ${ctx.w}), ${ctx.il} vaut ${m2}. Que vaut ${ctx.q} de l'ensemble des ${N} ${ctx.w} ?`, S / N, {
        explanation: `On ne fait pas la moyenne des moyennes : (${n1} × ${m1} + ${n2} × ${m2}) ÷ ${N} = ${S} ÷ ${N} = ${fmt(S / N)}.`,
      })
    }),
  ],
  [
    () => {
      const total = pick([100, 200, 400]), arch = Math.round(pick([0.4, 0.5, 0.6, 0.7]) * total), cav = total - arch
      const pa = pick([10, 20, 30, 40]), pc = pick([20, 25, 50])
      const g = (arch * pa) / 100 + (cav * pc) / 100
      return numeric(`Une armée de ${total} soldats compte ${arch} archers et ${cav} cavaliers. ${pa} % des archers et ${pc} % des cavaliers sont gradés. On choisit un soldat au hasard : quelle est la probabilité qu'il soit gradé ?`, g / total, {
        explanation: `Gradés : ${fmt((arch * pa) / 100)} + ${fmt((cav * pc) / 100)} = ${fmt(g)}, sur ${total} : ${fmt(g / total)}.`,
      })
    },
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
