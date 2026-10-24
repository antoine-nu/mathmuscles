// Schémas de Bernoulli, loi binomiale, probabilités conditionnelles (Terminale, spécialité).
// Public adulte : « remise en jambes » joue les paliers 1 à 3, « aguerris » les paliers 2 à 5.
// Les calculs restent faisables de tête ou au brouillon : petites valeurs de n, p décimal simple,
// ou valeurs de puissances / logarithmes données dans l'énoncé (« on donne 0,9^10 ≈ 0,3487 »).
import {
  choice, evalExpr, fmt, fracText, fresh, numeric, parseExpr, parseNumber, pick, randInt, variants, withMeta,
  type Exercise, type Maker, type SubjectContent,
} from '../utils'
import type { FigPoint, FigSegment, Figure } from '../figure'
import { prenom } from '../contexts'

// ── Aides locales ───────────────────────────────────────────────────────
const rd = (v: number, d = 3) => Math.round(v * 10 ** d) / 10 ** d
const isDec = (v: number, d: number) => Math.abs(v * 10 ** d - Math.round(v * 10 ** d)) < 1e-6
function retry<R>(gen: () => R | null | undefined | false): R {
  for (let i = 0; i < 5000; i++) {
    const r = gen()
    if (r) return r
  }
  throw new Error('tirage impossible')
}
/** Problème titré, avec figure facultative. */
const T = (title: string, ex: Exercise, figure?: Figure): Exercise => withMeta(ex, figure ? { title, figure } : { title })
const binom = (n: number, k: number) => {
  let r = 1
  for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i
  return Math.round(r)
}
const pmf = (n: number, k: number, p: number) => binom(n, k) * p ** k * (1 - p) ** (n - k)
const cdf = (n: number, k: number, p: number) => {
  let s = 0
  for (let i = 0; i <= k; i++) s += pmf(n, i, p)
  return s
}
/** Puissance écrite : b, b^2, b^{12}… (exposant 1 omis). */
const pw = (b: string, e: number) => (e === 1 ? b : e === 0 ? '1' : `${b}^${e}`)
const parmi = (k: number, n: number) => `« ${k} parmi ${n} »`
/** Quotient empilé pour une formule littérale (a et b sans « / »). */
const F3 = (a: string, b: string) => `{${a}/${b}}`
const BARS: Record<string, string> = { A: 'Ā', E: 'Ē', I: 'Ī', O: 'Ō', U: 'Ū' }
/** Événement contraire : Ā, B̄… */
const bar = (s: string) => BARS[s] ?? `${s}̄`
/** Probabilité conditionnelle : P_A(B), ou « P(B sachant Ā) » quand la condition porte une barre. */
const pc = (c: string, e: string) => (/^[A-Z]$/.test(c) ? `P_${c}(${e})` : `P(${e} sachant ${c})`)
const Bn = (n: number | string, p: string) => `B(${n} ; ${p})`
const p1 = () => pick([0.1, 0.2, 0.3, 0.4, 0.6, 0.7, 0.8, 0.9])
/** Probabilité multiple de 0,05 dans [a ; b]. */
const p05 = (a: number, b: number) => randInt(Math.round(a * 20), Math.round(b * 20)) / 20
/** Écriture d'un nombre arrondi : « ≈ 0,349 » ou « = 0,25 » selon qu'il est exact. */
const eqv = (v: number, d = 4) => (isDec(v, d) ? `= ${fmt(rd(v, d))}` : `≈ ${fmt(rd(v, d))}`)

/** Lit un nombre : décimal, fraction, pourcentage, ou calcul numérique (1 − 0,9^10). */
function readVal(raw: string): number {
  let s = raw.trim().replace(/\s+/g, '')
  let k = 1
  if (s.endsWith('%')) {
    k = 0.01
    s = s.slice(0, -1)
  }
  let v = parseNumber(s)
  if (Number.isNaN(v) && s && !/[a-zA-Z]/.test(s.replace(/sqrt/gi, ''))) {
    const n = parseExpr(s)
    if (n) v = evalExpr(n, 0)
  }
  return Number.isFinite(v) ? v * k : NaN
}

/**
 * Réponse probabilité : valeur exacte (décimale ou fraction), arrondi au millième ou pourcentage acceptés.
 * La tolérance (par défaut 0,001) couvre l'arrondi demandé.
 */
function proba(prompt: string, value: number, o: { explanation: string; answer?: string; tol?: number; hint?: string }): Exercise {
  // arrondi au millième accepté ; pour une très petite probabilité, valeur exacte à 5 % près
  const small = Math.abs(value) < 0.005
  const tol = o.tol ?? (Math.abs(value) >= 0.05 ? 1e-3 : small ? Math.abs(value) * 0.05 : 5e-4)
  const answer = o.answer ?? (isDec(value, 4) ? fmt(rd(value, 4)) : fmt(rd(value, 3)))
  return {
    prompt,
    kind: 'input',
    answer,
    explanation: o.explanation,
    inputHint: o.hint ?? (small ? 'Valeur exacte' : 'Valeur exacte ou arrondie au millième'),
    format: 'un nombre : décimal (0,384), fraction (27/64) ou pourcentage (38,4 %)',
    keypad: ['/', ',', '%', '^', '(', ')', '−'],
    isValid: (v) => !Number.isNaN(readVal(v)),
    check: (v) => Math.abs(readVal(v) - value) <= tol + 1e-9,
  }
}
/** Probabilité exacte sous forme de fraction (décimal arrondi au millième accepté). */
const probaFrac = (prompt: string, num: number, den: number, explanation: string) =>
  proba(prompt, num / den, { answer: fracText(num, den), explanation, hint: num / den < 0.005 ? 'Fraction' : 'Fraction, ou valeur arrondie au millième' })

// ── Arbres pondérés ─────────────────────────────────────────────────────
interface TNode { name: string; p: string; kids?: TNode[] }

/** Arbre pondéré dessiné de gauche à droite : noms aux nœuds, probabilités sur les branches. */
function treeFigure(kids: TNode[], o: { caption?: string } = {}): Figure {
  const w = 320
  const depth = (ns: TNode[]): number => Math.max(...ns.map((n) => 1 + (n.kids ? depth(n.kids) : 0)))
  const leaves = (n: TNode): number => (n.kids ? n.kids.reduce((s, k) => s + leaves(k), 0) : 1)
  const D = depth(kids)
  const L = kids.reduce((s, k) => s + leaves(k), 0)
  const h = Math.max(160, Math.min(300, 30 * L + 34))
  const x0 = 16, xEnd = w - 22, dx = (xEnd - x0) / D
  const top = 20, bottom = h - 18, gapY = L > 1 ? (bottom - top) / (L - 1) : 0
  const points: Record<string, FigPoint> = {}
  const segments: FigSegment[] = []
  const notes: { x: number; y: number; text: string }[] = []
  let leafI = 0, id = 0
  const edge = (a: string, b: string, label: string) => {
    const A = points[a], B = points[b]
    segments.push({ a, b })
    const len = Math.hypot(B.x - A.x, B.y - A.y) || 1
    const ux = (B.x - A.x) / len, uy = (B.y - A.y) / len
    // normale : au-dessus à gauche pour une branche montante, en dessous à gauche pour une branche descendante
    let nx = uy, ny = -ux
    if (uy > 0.02) { nx = -uy; ny = ux }
    const hw = 3.9 * [...label].length, hh = 6
    const dist = Math.abs(nx) * hw + Math.abs(ny) * hh + 3
    notes.push({ x: (A.x + B.x) / 2 + nx * dist, y: (A.y + B.y) / 2 + ny * dist + 5, text: label })
  }
  const layout = (n: TNode, d: number): { y: number; key: string } => {
    const key = `n${id++}`
    const x = x0 + dx * d
    const lay = n.kids?.map((k) => layout(k, d + 1))
    const y = lay ? lay.reduce((s, l) => s + l.y, 0) / lay.length : top + gapY * leafI++
    points[`${key}i`] = { x: x - 10, y, hidden: true, label: '' }
    points[`${key}o`] = { x: x + 10, y, hidden: true, label: '' }
    notes.push({ x, y: y + 5, text: n.name })
    lay?.forEach((l, i) => edge(`${key}o`, `${l.key}i`, n.kids![i].p))
    return { y, key }
  }
  const lay = kids.map((k) => layout(k, 1))
  points.R = { x: x0, y: lay.reduce((s, l) => s + l.y, 0) / lay.length, label: '' }
  lay.forEach((l, i) => edge('R', `${l.key}i`, kids[i].p))
  return { w, h, points, segments, notes, caption: o.caption ?? '' }
}

/** Arbre à deux niveaux A / Ā puis B / B̄. */
function tree2(A: string, B: string, a: number, b: number, c: number, labels?: { a?: string; b?: string; c?: string }): Figure {
  const la = labels?.a ?? fmt(a), lb = labels?.b ?? fmt(b), lc = labels?.c ?? fmt(c)
  const comp = (l: string, v: number) => (/^[\d,]+$/.test(l) ? fmt(rd(1 - v, 6)) : `1 − ${l}`)
  return treeFigure([
    { name: A, p: la, kids: [{ name: B, p: lb }, { name: bar(B), p: comp(lb, b) }] },
    { name: bar(A), p: comp(la, a), kids: [{ name: B, p: lc }, { name: bar(B), p: comp(lc, c) }] },
  ])
}

/** Arbre d'un schéma de Bernoulli à n = 2 ou 3 épreuves (S succès, S̄ échec). */
function bernoulliTree(n: number, p: string, q: string): Figure {
  const build = (d: number): TNode[] | undefined =>
    d === 0 ? undefined : [{ name: 'S', p, kids: build(d - 1) }, { name: bar('S'), p: q, kids: build(d - 1) }]
  return treeFigure(build(n)!)
}

/** Diagramme en bâtons d'une loi (valeurs ks, probabilités ps), avec étiquettes facultatives au-dessus. */
function barsFigure(ks: number[], ps: number[], o: { ymax: number; ystep: number; labels?: string[] }): Figure {
  const w = 320, h = 220, X0 = 46, Y0 = 188, Xe = 306, Ytop = 26
  const slot = (Xe - X0) / ks.length, bw = Math.min(18, slot * 0.4)
  const Y = (v: number) => Y0 - (v / o.ymax) * (Y0 - Ytop)
  const points: Record<string, FigPoint> = {
    O: { x: X0, y: Y0, hidden: true, label: '' }, Xa: { x: Xe + 8, y: Y0, hidden: true, label: '' }, Ya: { x: X0, y: Ytop - 10, hidden: true, label: '' },
  }
  const segments: FigSegment[] = [{ a: 'O', b: 'Xa', head: true }, { a: 'O', b: 'Ya', head: true }]
  const polygons: { pts: string[]; fill: string }[] = []
  const notes: { x: number; y: number; text: string }[] = []
  for (let t = o.ystep, i = 0; t <= o.ymax + 1e-9; t += o.ystep, i++) {
    const y = Y(t)
    points[`g${i}a`] = { x: X0 - 4, y, hidden: true, label: '' }
    points[`g${i}b`] = { x: Xe, y, hidden: true, label: '' }
    segments.push({ a: `g${i}a`, b: `g${i}b`, color: 'rgba(122, 90, 44, 0.3)', dashed: true })
    notes.push({ x: X0 - 20, y: y + 4, text: fmt(rd(t, 6)) })
  }
  ks.forEach((k, i) => {
    const cx = X0 + slot * (i + 0.5), yt = Y(ps[i])
    const id = `b${i}`
    points[`${id}1`] = { x: cx - bw / 2, y: Y0, hidden: true, label: '' }
    points[`${id}2`] = { x: cx + bw / 2, y: Y0, hidden: true, label: '' }
    points[`${id}3`] = { x: cx + bw / 2, y: yt, hidden: true, label: '' }
    points[`${id}4`] = { x: cx - bw / 2, y: yt, hidden: true, label: '' }
    polygons.push({ pts: [`${id}1`, `${id}2`, `${id}3`, `${id}4`], fill: '#d9a441' })
    segments.push({ a: `${id}1`, b: `${id}4` }, { a: `${id}4`, b: `${id}3` }, { a: `${id}3`, b: `${id}2` })
    notes.push({ x: cx, y: Y0 + 16, text: fmt(k) })
    if (o.labels) notes.push({ x: cx, y: yt - 5, text: o.labels[i] })
  })
  notes.push({ x: 84, y: 14, text: 'P(X = k)' }, { x: Xe + 6, y: Y0 - 8, text: 'k' })
  return { w, h, points, segments, polygons, notes, caption: '' }
}

// ── Contextes d'épreuves répétées ───────────────────────────────────────
interface BCtx {
  g: 'f' | 'm'
  sg: string; pl: string
  /** Verbe à l'indicatif (singulier, pluriel). */
  vs: string; vp: string
  /** Au subjonctif, après « la probabilité que » : singulier, pluriel, « aucun… ». */
  ss: string; sp: string
  neg: string
  intro: (n: number, p: string) => string
  ps: number[]
}
const CTX: BCtx[] = [
  {
    g: 'f', sg: 'flèche', pl: 'flèches', vs: 'atteint la cible', vp: 'atteignent la cible', ss: 'atteigne la cible', sp: 'atteignent la cible', neg: 'aucune flèche n’atteigne la cible',
    intro: (n, p) => `Un archer tire ${n} flèches sur une cible ; chacune l’atteint avec la probabilité ${p}, indépendamment des autres.`,
    ps: [0.6, 0.7, 0.8, 0.9, 0.4],
  },
  {
    g: 'f', sg: 'graine', pl: 'graines', vs: 'germe', vp: 'germent', ss: 'germe', sp: 'germent', neg: 'aucune graine ne germe',
    intro: (n, p) => `La meunière sème ${n} graines ; chacune germe avec la probabilité ${p}, indépendamment des autres.`,
    ps: [0.6, 0.7, 0.8, 0.9],
  },
  {
    g: 'f', sg: 'épée', pl: 'épées', vs: 'est défectueuse', vp: 'sont défectueuses', ss: 'soit défectueuse', sp: 'soient défectueuses', neg: 'aucune épée ne soit défectueuse',
    intro: (n, p) => `On prélève ${n} épées dans la production d’une forge, assez grande pour assimiler le prélèvement à des tirages avec remise. Chaque épée est défectueuse avec la probabilité ${p}.`,
    ps: [0.1, 0.2, 0.3],
  },
  {
    g: 'm', sg: 'patient', pl: 'patients', vs: 'guérit', vp: 'guérissent', ss: 'guérisse', sp: 'guérissent', neg: 'aucun patient ne guérisse',
    intro: (n, p) => `Un traitement guérit chaque patient avec la probabilité ${p}. On le donne à ${n} patients, dont les guérisons sont indépendantes.`,
    ps: [0.6, 0.7, 0.8, 0.9],
  },
  {
    g: 'm', sg: 'colis', pl: 'colis', vs: 'arrive en retard', vp: 'arrivent en retard', ss: 'arrive en retard', sp: 'arrivent en retard', neg: 'aucun colis n’arrive en retard',
    intro: (n, p) => `Un livreur dépose ${n} colis ; chacun arrive en retard avec la probabilité ${p}, indépendamment des autres.`,
    ps: [0.1, 0.2, 0.3],
  },
  {
    g: 'm', sg: 'tir au but', pl: 'tirs au but', vs: 'est réussi', vp: 'sont réussis', ss: 'soit réussi', sp: 'soient réussis', neg: 'aucun tir au but ne soit réussi',
    intro: (n, p) => `${prenom()} tente ${n} tirs au but ; chacun est réussi avec la probabilité ${p}, indépendamment des autres.`,
    ps: [0.6, 0.7, 0.8, 0.9],
  },
  {
    g: 'f', sg: 'ampoule', pl: 'ampoules', vs: 'grille dans l’année', vp: 'grillent dans l’année', ss: 'grille dans l’année', sp: 'grillent dans l’année', neg: 'aucune ampoule ne grille dans l’année',
    intro: (n, p) => `Un immeuble compte ${n} ampoules ; chacune grille dans l’année avec la probabilité ${p}, indépendamment des autres.`,
    ps: [0.1, 0.2, 0.3, 0.4],
  },
]
const nb = (c: BCtx, k: number) => (k === 1 ? (c.g === 'f' ? 'une' : 'un') : String(k))
const noun = (c: BCtx, k: number) => (k > 1 ? c.pl : c.sg)
/** Verbe au subjonctif (les phrases ci-dessous suivent « la probabilité que »). */
const verb = (c: BCtx, k: number) => (k > 1 ? c.sp : c.ss)
const exactly = (c: BCtx, k: number) => (k === 0 ? c.neg : `exactement ${nb(c, k)} ${noun(c, k)} ${verb(c, k)}`)
const atLeast = (c: BCtx, k: number) => `au moins ${nb(c, k)} ${noun(c, k)} ${verb(c, k)}`
const atMost = (c: BCtx, k: number) => `au plus ${nb(c, k)} ${noun(c, k)} ${verb(c, k)}`
const allOf = (c: BCtx, n: number) => `les ${n} ${c.pl} ${c.sp}`
const deN = (w: string) => (/^[aeiouéèêh]/i.test(w) ? `d’${w}` : `de ${w}`)
const Xdesc = (c: BCtx) => `le nombre ${deN(c.pl)} qui ${c.vp}`
const ctx = () => pick(CTX)
/** Phrase d'introduction : « X suit la loi binomiale B(n ; p) ». */
const lawIs = (n: number, p: string) => `X suit la loi binomiale ${Bn(n, p)}`
const schemaExpl = (n: number, p: string) => `Les ${n} épreuves sont identiques et indépendantes, à deux issues : X compte les succès, donc ${lawIs(n, p)}.`

// Contextes d'arbres (deux événements successifs).
interface TreeCtx { A: string; B: string; a: string; b: string; intro: string }
const TREE_CTX: TreeCtx[] = [
  { A: 'M', B: 'R', a: 'il fait mauvais temps', b: 'le bus est en retard', intro: 'Dans une ville, le retard du bus dépend de la météo.' },
  { A: 'M', B: 'T', a: 'la personne est malade', b: 'le test est positif', intro: 'On fait passer un test de dépistage à une personne choisie au hasard.' },
  { A: 'A', B: 'D', a: 'la pièce vient de l’atelier A (sinon, de l’atelier B)', b: 'la pièce est défectueuse', intro: 'Une usine fabrique des pièces dans deux ateliers ; on choisit une pièce au hasard.' },
  { A: 'E', B: 'V', a: 'le chevalier s’est entraîné la veille', b: 'il gagne la joute', intro: 'Avant un tournoi, un chevalier s’entraîne ou non la veille de chaque joute.' },
  { A: 'C', B: 'S', a: 'le client a une carte de fidélité', b: 'le client dépense plus de 50 €', intro: 'Dans un magasin, on choisit un client au hasard.' },
  { A: 'F', B: 'G', a: 'le cheval est nourri au foin de la ferme', b: 'le cheval gagne la course', intro: 'Au haras du seigneur, on choisit un cheval au hasard.' },
]
const treeCtx = () => pick(TREE_CTX)
const treeIntro = (c: TreeCtx) => `${c.intro} On note ${c.A} l’événement « ${c.a} » et ${c.B} l’événement « ${c.b} ».`
/** Probabilités d'un arbre : P(A) multiple de 0,05, conditionnelles multiples de 0,05 (distinctes). */
function treeNums(): [number, number, number] {
  return retry(() => {
    const a = p05(0.1, 0.9), b = p05(0.05, 0.95), c = p05(0.05, 0.95)
    return Math.abs(b - c) >= 0.15 ? ([a, b, c] as [number, number, number]) : null
  })
}

// ═══ Palier 1 : rappels très guidés ═════════════════════════════════════
const tier1: Maker[] = [
  // Paramètre p d'une épreuve de Bernoulli
  variants(
    () => {
      const f = pick([6, 8, 10, 12, 20]), k = randInt(2, f - 1), n = randInt(5, 30)
      return probaFrac(`On lance ${n} fois un dé équilibré à ${f} faces numérotées de 1 à ${f}. X est le nombre de lancers donnant un nombre supérieur ou égal à ${k}. X suit une loi binomiale B(n ; p) : que vaut p ?`, f - k + 1, f,
        `Un lancer est une épreuve de Bernoulli : succès « obtenir ${k} ou plus », soit ${f - k + 1} faces sur ${f}. Donc p = ${fracText(f - k + 1, f)}.`)
    },
    () => {
      const r = randInt(2, 9), b = randInt(2, 9), n = randInt(4, 20)
      return probaFrac(`Une urne contient ${r} boules rouges et ${b} boules noires. On tire ${n} boules successivement avec remise ; X compte les boules rouges obtenues. X suit une loi binomiale B(n ; p) : que vaut p ?`, r, r + b,
        `Les tirages avec remise sont identiques et indépendants ; succès « tirer une rouge » : p = ${r}/${r + b}${fracText(r, r + b) !== `${r}/${r + b}` ? ` = ${fracText(r, r + b)}` : ''}.`)
    },
    () => {
      const c = pick([3, 4, 5]), n = randInt(8, 30)
      return probaFrac(`Un QCM compte ${n} questions ; chacune propose ${c} réponses dont une seule est juste. ${prenom()} répond à toutes au hasard ; X compte ses bonnes réponses. X suit une loi binomiale B(n ; p) : que vaut p ?`, 1, c,
        `Pour chaque question, une seule réponse sur ${c} est juste : p = 1/${c}, et n = ${n}.`)
    },
    () => {
      const s = pick([8, 10, 12, 16, 20]), g = randInt(1, s - 1), n = randInt(5, 25)
      return probaFrac(`À la foire, une roue est partagée en ${s} secteurs égaux, dont ${g} sont gagnants. On la fait tourner ${n} fois ; X compte les gains. X suit une loi binomiale B(n ; p) : que vaut p ?`, g, s,
        `Chaque tour est une épreuve de Bernoulli de succès « tomber sur un secteur gagnant » : p = ${g}/${s}${fracText(g, s) !== `${g}/${s}` ? ` = ${fracText(g, s)}` : ''}.`)
    },
    () => {
      const m = pick([2, 3, 4]), face = Math.random() < 0.5, n = randInt(5, 20)
      const word = m === 2 ? 'deux' : m === 3 ? 'trois' : 'quatre'
      return probaFrac(`Une pièce truquée tombe sur face ${word} fois plus souvent que sur pile. On la lance ${n} fois ; X compte les ${face ? 'faces' : 'piles'}. X suit une loi binomiale B(n ; p) : que vaut p ?`, face ? m : 1, m + 1,
        `P(face) = ${m} × P(pile) et P(pile) + P(face) = 1, donc P(pile) = 1/${m + 1} et P(face) = ${m}/${m + 1}. Ici p = ${face ? `${m}/${m + 1}` : `1/${m + 1}`}.`)
    },
  ),
  // Espérance np
  fresh(variants(
    () => {
      const n = randInt(2, 12) * 10, p = p1()
      return numeric(`X suit la loi binomiale de paramètres n = ${n} et p = ${fmt(p)}. Calcule l’espérance E(X).`, rd(n * p, 6), { explanation: `E(X) = np = ${n} × ${fmt(p)} = ${fmt(rd(n * p, 6))}.` })
    },
    () => {
      const c = ctx(), n = randInt(2, 10) * 10, p = pick(c.ps)
      return numeric(`${c.intro(n, fmt(p))} En moyenne, combien ${deN(c.pl)} ${c.vp} ?`, rd(n * p, 6), {
        explanation: `${schemaExpl(n, fmt(p))} En moyenne : E(X) = np = ${n} × ${fmt(p)} = ${fmt(rd(n * p, 6))}.`,
      })
    },
    () => {
      const c = pick([3, 4, 5]), n = c * randInt(4, 10)
      return numeric(`Un QCM compte ${n} questions à ${c} réponses, dont une seule juste. En répondant entièrement au hasard, combien de bonnes réponses obtient-on en moyenne ?`, n / c, {
        explanation: `Le nombre de bonnes réponses suit ${Bn(n, `1/${c}`)} : E = np = ${n} × 1/${c} = ${n / c}.`,
      })
    },
    () => {
      const n = 6 * randInt(3, 20)
      return numeric(`On lance ${n} fois un dé équilibré. Combien de 6 obtient-on en moyenne ?`, n / 6, { explanation: `Le nombre de 6 suit ${Bn(n, '1/6')} : E = np = ${n} ÷ 6 = ${n / 6}.` })
    },
    () => {
      const t = pick([2, 4, 5, 8, 10]), n = pick([50, 100, 150, 200, 300])
      return numeric(`Une machine produit des pièces dont ${t} % sont défectueuses. On prélève ${n} pièces (prélèvement assimilé à des tirages avec remise). Combien de pièces défectueuses doit-on attendre en moyenne ?`, (n * t) / 100, {
        explanation: `Le nombre de pièces défectueuses suit ${Bn(n, fmt(t / 100))} : E = np = ${n} × ${fmt(t / 100)} = ${fmt((n * t) / 100)}.`,
      })
    },
  )),
  // Coefficients binomiaux : chemins de l'arbre
  fresh(variants(
    () => {
      const n = randInt(4, 7), k = randInt(2, n - 2)
      return numeric(`On répète ${n} fois une même épreuve de Bernoulli. Dans l’arbre correspondant, combien de chemins réalisent exactement ${k} succès ?`, binom(n, k), {
        explanation: `C’est le nombre de façons de placer les ${k} succès parmi les ${n} épreuves : ${parmi(k, n)} = ${binom(n, k)}.`,
      })
    },
    () => {
      const n = randInt(4, 8), k = randInt(2, n - 2)
      return numeric(`Calcule le coefficient binomial ${parmi(k, n)}.`, binom(n, k), {
        explanation: `${parmi(k, n)} = ${F2(n, k)} = ${binom(n, k)}.`,
      })
    },
    () => {
      const n = randInt(4, 7), k = randInt(2, n - 2)
      return numeric(`On lance ${n} fois une pièce et on note la suite des résultats (par exemple PFFP…). Combien de suites comportent exactement ${k} fois pile ?`, binom(n, k), {
        explanation: `On choisit les ${k} rangs des « pile » parmi les ${n} lancers : ${parmi(k, n)} = ${binom(n, k)}.`,
      })
    },
    () => {
      const n = randInt(4, 7), k = randInt(2, n - 2), who = prenom()
      return numeric(`${who} joue ${n} matchs dans la saison. De combien de façons ses ${k} victoires peuvent-elles se répartir parmi les ${n} matchs ?`, binom(n, k), {
        explanation: `On choisit les ${k} matchs gagnés parmi ${n} : ${parmi(k, n)} = ${binom(n, k)}.`,
      })
    },
  )),
  // Tout réussir / tout rater
  variants(
    () => {
      const c = ctx(), n = randInt(2, 4), p = pick(c.ps)
      return proba(`${c.intro(n, fmt(p))} Quelle est la probabilité que ${allOf(c, n)} ?`, p ** n, {
        explanation: `Par indépendance, on multiplie : ${pw(fmt(p), n)} ${eqv(p ** n)}.`,
      })
    },
    () => {
      const c = ctx(), n = randInt(2, 4), p = pick(c.ps), q = rd(1 - p, 6)
      return proba(`${c.intro(n, fmt(p))} Quelle est la probabilité qu’${c.neg} ?`, q ** n, {
        explanation: `Chaque échec a la probabilité 1 − ${fmt(p)} = ${fmt(q)} ; par indépendance : ${pw(fmt(q), n)} ${eqv(q ** n)}.`,
      })
    },
    () => {
      const n = randInt(2, 4), p = p1(), zero = Math.random() < 0.5, q = rd(1 - p, 6)
      return proba(`${lawIs(n, fmt(p))}. Calcule P(X = ${zero ? 0 : n}).`, zero ? q ** n : p ** n, {
        explanation: zero ? `P(X = 0) = (1 − p)^n = ${pw(fmt(q), n)} ${eqv(q ** n)}.` : `P(X = ${n}) = p^n = ${pw(fmt(p), n)} ${eqv(p ** n)}.`,
      })
    },
    () => {
      const n = randInt(2, 5)
      return probaFrac(`On lance ${n} fois une pièce équilibrée. Quelle est la probabilité d’obtenir ${n} fois pile ?`, 1, 2 ** n, `Par indépendance : (1/2)^${n} = 1/${2 ** n}.`)
    },
    () => {
      const n = randInt(2, 3), six = Math.random() < 0.5
      return six
        ? probaFrac(`On lance ${n} fois un dé équilibré. Quelle est la probabilité d’obtenir ${n === 2 ? 'deux' : 'trois'} 6 ?`, 1, 6 ** n, `Par indépendance : (1/6)^${n} = 1/${6 ** n}.`)
        : probaFrac(`On lance ${n} fois un dé équilibré. Quelle est la probabilité de n’obtenir aucun 6 ?`, 5 ** n, 6 ** n, `Chaque lancer donne « pas de 6 » avec la probabilité 5/6 ; par indépendance : (5/6)^${n} = ${5 ** n}/${6 ** n}.`)
    },
  ),
  // Reconnaître une loi binomiale
  variants(
    () => {
      const n = randInt(5, 30)
      return choice(`On lance ${n} fois un dé équilibré ; X compte le nombre de 6 obtenus. X suit-elle une loi binomiale ?`, `Oui : ${Bn(n, '1/6')}`,
        [`Oui : ${Bn(6, `1/${n}`)}`, 'Non : un dé a six issues, pas deux', 'Non : les lancers ne sont pas indépendants'],
        `Chaque lancer est une épreuve à deux issues (6 ou pas 6), répétée ${n} fois de façon identique et indépendante : X suit ${Bn(n, '1/6')}.`)
    },
    () => {
      const r = randInt(2, 8), b = randInt(2, 8), n = randInt(3, 10)
      return choice(`Une urne contient ${r} boules rouges et ${b} boules noires. On tire ${n} boules successivement avec remise ; X compte les rouges. X suit-elle une loi binomiale ?`, `Oui : ${Bn(n, fracText(r, r + b))}`,
        [`Oui : ${Bn(n, fracText(r, b))}`, 'Non : les tirages ne sont pas indépendants', `Oui : ${Bn(r + b, fracText(r, r + b))}`],
        `Avec remise, la composition de l’urne ne change pas : ${n} épreuves identiques et indépendantes, de succès « rouge » de probabilité ${fracText(r, r + b)}.`)
    },
    () => {
      const r = randInt(3, 8), b = randInt(3, 8), n = randInt(2, 3)
      return choice(`Une urne contient ${r} boules rouges et ${b} boules noires. On tire ${n} boules successivement sans remise ; X compte les rouges. X suit-elle une loi binomiale ?`, 'Non : les tirages ne sont pas indépendants',
        [`Oui : ${Bn(n, fracText(r, r + b))}`, `Oui : ${Bn(n, '1/2')}`, 'Non : le nombre de tirages n’est pas fixé'],
        'Sans remise, la composition de l’urne change après chaque tirage : la probabilité de tirer une rouge dépend des tirages précédents. Ce n’est pas un schéma de Bernoulli.')
    },
    () => {
      const f = pick([4, 6, 8, 12])
      return choice(`On lance un dé équilibré à ${f} faces jusqu’à obtenir le ${f} ; X compte le nombre de lancers effectués. X suit-elle une loi binomiale ?`, 'Non : le nombre d’épreuves n’est pas fixé à l’avance',
        [`Oui : ${Bn(f, `1/${f}`)}`, 'Non : les lancers ne sont pas indépendants', 'Oui : B(X ; 1/2)'],
        'Une loi binomiale compte les succès sur un nombre n d’épreuves fixé à l’avance. Ici on s’arrête au premier succès : X compte des lancers, pas des succès (c’est une loi géométrique).')
    },
    () => {
      const n = randInt(3, 12)
      return choice(`On lance ${n} fois un dé équilibré ; X est la somme des résultats obtenus. X suit-elle une loi binomiale ?`, 'Non : X ne compte pas des succès',
        [`Oui : ${Bn(n, '1/6')}`, `Oui : ${Bn(6 * n, '1/6')}`, 'Non : les lancers ne sont pas indépendants'],
        `Les lancers sont indépendants, mais X additionne des résultats de 1 à 6 : X prend des valeurs jusqu’à ${6 * n}, elle ne compte pas le nombre de succès d’une épreuve à deux issues.`)
    },
  ),
]
/** Calcul développé d'un coefficient binomial : 6 × 5 ÷ (2 × 1)… */
function F2(n: number, k: number): string {
  const num = Array.from({ length: k }, (_, i) => n - i).join(' × ')
  const den = Array.from({ length: k }, (_, i) => k - i).join(' × ')
  return `(${num}) ÷ (${den})`
}

// ═══ Palier 2 ═══════════════════════════════════════════════════════════
/** Explication de P(X = k) pour B(n ; p). */
const pkExpl = (n: number, k: number, p: number) => {
  const q = rd(1 - p, 6), v = pmf(n, k, p)
  return `P(X = ${k}) = ${parmi(k, n)} × ${pw(fmt(p), k)} × ${pw(fmt(q), n - k)} = ${binom(n, k)} × ${fmt(rd(p ** k, 6))} × ${fmt(rd(q ** (n - k), 6))} ${eqv(v)}.`
}
const tier2: Maker[] = [
  // P(X = k) pour n = 3 ou 4
  variants(
    () => {
      const n = randInt(3, 4), k = randInt(1, n - 1), p = p1()
      return proba(`${lawIs(n, fmt(p))}. Calcule P(X = ${k}).`, pmf(n, k, p), { explanation: pkExpl(n, k, p) })
    },
    () => {
      const c = ctx(), n = randInt(3, 4), k = randInt(1, n - 1), p = pick(c.ps)
      return proba(`${c.intro(n, fmt(p))} Quelle est la probabilité qu’${exactly(c, k)} ?`, pmf(n, k, p), { explanation: `${schemaExpl(n, fmt(p))} ${pkExpl(n, k, p)}` })
    },
    () => {
      const c = ctx(), n = randInt(3, 4), k = randInt(1, n - 1), p = pick(c.ps)
      return proba(`${c.intro(n, fmt(p))} On note X ${Xdesc(c)}. Calcule P(X = ${k}).`, pmf(n, k, p), { explanation: `${schemaExpl(n, fmt(p))} ${pkExpl(n, k, p)}` })
    },
    () => {
      const n = randInt(3, 5), k = randInt(1, n - 1)
      return probaFrac(`On lance ${n} fois une pièce équilibrée. Quelle est la probabilité d’obtenir exactement ${k} fois pile ?`, binom(n, k), 2 ** n,
        `Le nombre de « pile » suit ${Bn(n, '1/2')} : P(X = ${k}) = ${parmi(k, n)} × (1/2)^${n} = ${binom(n, k)}/${2 ** n}${fracText(binom(n, k), 2 ** n) !== `${binom(n, k)}/${2 ** n}` ? ` = ${fracText(binom(n, k), 2 ** n)}` : ''}.`)
    },
  ),
  // Au moins un succès
  variants(
    () => {
      const c = ctx(), n = randInt(2, 4), p = pick(c.ps), q = rd(1 - p, 6)
      return proba(`${c.intro(n, fmt(p))} Quelle est la probabilité qu’${atLeast(c, 1)} ?`, 1 - q ** n, {
        explanation: `L’événement contraire (aucun succès) a pour probabilité ${pw(fmt(q), n)} ${eqv(q ** n)}. Donc P(X ≥ 1) = 1 − ${fmt(rd(q ** n, 6))} ${eqv(1 - q ** n)}.`,
      })
    },
    () => {
      const n = randInt(2, 4), p = p1(), q = rd(1 - p, 6)
      return proba(`${lawIs(n, fmt(p))}. Calcule P(X ≥ 1).`, 1 - q ** n, { explanation: `P(X ≥ 1) = 1 − P(X = 0) = 1 − ${pw(fmt(q), n)} = 1 − ${fmt(rd(q ** n, 6))} ${eqv(1 - q ** n)}.` })
    },
    () => retry(() => {
      const c = ctx(), n = randInt(8, 25), p = pick(c.ps), q = rd(1 - p, 6), v = rd(q ** n, 4)
      return v >= 0.001 && proba(`${c.intro(n, fmt(p))} On donne ${pw(fmt(q), n)} ≈ ${fmt(v)}. Quelle est la probabilité qu’${atLeast(c, 1)} ?`, 1 - v, {
        explanation: `P(au moins un) = 1 − P(aucun) = 1 − ${pw(fmt(q), n)} ≈ 1 − ${fmt(v)} = ${fmt(rd(1 - v, 4))}.`,
      })
    }),
    () => {
      const n = randInt(2, 4), p = p1()
      return proba(`${lawIs(n, fmt(p))}. Calcule P(X ≤ ${n - 1}).`, 1 - p ** n, {
        explanation: `L’événement contraire de « X ≤ ${n - 1} » est « X = ${n} » : P(X ≤ ${n - 1}) = 1 − ${pw(fmt(p), n)} = 1 − ${fmt(rd(p ** n, 6))} ${eqv(1 - p ** n)}.`,
      })
    },
  ),
  // Variance et écart-type
  fresh(variants(
    () => {
      const n = randInt(2, 10) * 10, p = p1()
      return numeric(`${lawIs(n, fmt(p))}. Calcule la variance V(X).`, rd(n * p * (1 - p), 6), {
        explanation: `V(X) = np(1 − p) = ${n} × ${fmt(p)} × ${fmt(rd(1 - p, 6))} = ${fmt(rd(n * p * (1 - p), 6))}.`,
      })
    },
    () => {
      const [n, p, s] = pick([[100, 0.5, 5], [400, 0.5, 10], [36, 0.5, 3], [64, 0.5, 4], [100, 0.1, 3], [400, 0.1, 6], [100, 0.2, 4], [25, 0.2, 2], [900, 0.1, 9], [225, 0.2, 6], [196, 0.5, 7], [144, 0.5, 6]] as const)
      return numeric(`${lawIs(n, fmt(p))}. Calcule l’écart-type σ(X).`, s, {
        explanation: `V(X) = np(1 − p) = ${n} × ${fmt(p)} × ${fmt(rd(1 - p, 6))} = ${s * s}, donc σ(X) = √${s * s} = ${s}.`,
      })
    },
    () => {
      const c = ctx(), n = randInt(2, 10) * 10, p = pick(c.ps)
      return numeric(`${c.intro(n, fmt(p))} On note X ${Xdesc(c)}. Calcule V(X).`, rd(n * p * (1 - p), 6), {
        explanation: `${lawIs(n, fmt(p))}, donc V(X) = np(1 − p) = ${n} × ${fmt(p)} × ${fmt(rd(1 - p, 6))} = ${fmt(rd(n * p * (1 - p), 6))}.`,
      })
    },
    () => {
      const n = randInt(2, 20) * 10, p = p1()
      return proba(`X suit une loi binomiale de paramètre n = ${n} et d’espérance E(X) = ${fmt(rd(n * p, 6))}. Que vaut p ?`, p, {
        explanation: `E(X) = np, donc p = ${fmt(rd(n * p, 6))} ÷ ${n} = ${fmt(p)}.`, tol: 1e-6, hint: 'Ta réponse',
      })
    },
  )),
  // Arbre : probabilité d'une intersection
  variants(
    ...[0, 1, 2, 3].map((which) => () => {
      const c = treeCtx(), [a, b, cc] = treeNums()
      const A = c.A, B = c.B
      const cases = [
        { ev: `${A} ∩ ${B}`, v: a * b, e: `P(${A}) × ${pc(A, B)} = ${fmt(a)} × ${fmt(b)}` },
        { ev: `${bar(A)} ∩ ${B}`, v: (1 - a) * cc, e: `P(${bar(A)}) × ${pc(bar(A), B)} = ${fmt(rd(1 - a, 6))} × ${fmt(cc)}` },
        { ev: `${A} ∩ ${bar(B)}`, v: a * (1 - b), e: `P(${A}) × ${pc(A, bar(B))} = ${fmt(a)} × ${fmt(rd(1 - b, 6))}` },
        { ev: `${bar(A)} ∩ ${bar(B)}`, v: (1 - a) * (1 - cc), e: `P(${bar(A)}) × ${pc(bar(A), bar(B))} = ${fmt(rd(1 - a, 6))} × ${fmt(rd(1 - cc, 6))}` },
      ]
      const k = cases[which]
      return withMeta(proba(`${treeIntro(c)} L’arbre pondéré ci-dessous résume la situation. Calcule P(${k.ev}).`, k.v, {
        explanation: `On suit le chemin de l’arbre et on multiplie les probabilités le long des branches : P(${k.ev}) = ${k.e} ${eqv(k.v)}.`,
      }), { figure: tree2(A, B, a, b, cc) })
    }),
  ),
  // Schéma de Bernoulli lu sur un arbre
  variants(
    () => {
      const p = p1(), q = rd(1 - p, 6)
      return withMeta(proba(`L’arbre ci-dessous représente un schéma de Bernoulli à 2 épreuves, de succès S de probabilité ${fmt(p)}. Quelle est la probabilité d’obtenir exactement un succès ?`, 2 * p * q, {
        explanation: `Deux chemins réalisent un seul succès (S puis S̄, ou S̄ puis S), chacun de probabilité ${fmt(p)} × ${fmt(q)} : 2 × ${fmt(p)} × ${fmt(q)} ${eqv(2 * p * q)}.`,
      }), { figure: bernoulliTree(2, fmt(p), fmt(q)) })
    },
    () => {
      const p = p1(), q = rd(1 - p, 6), k = randInt(1, 2)
      return withMeta(proba(`L’arbre ci-dessous représente un schéma de Bernoulli à 3 épreuves, de succès S de probabilité ${fmt(p)}. Quelle est la probabilité d’obtenir exactement ${k} succès ?`, pmf(3, k, p), {
        explanation: `${binom(3, k)} chemins comportent ${k} succès et ${3 - k} échec${3 - k > 1 ? 's' : ''}, chacun de probabilité ${pw(fmt(p), k)} × ${pw(fmt(q), 3 - k)}. ${pkExpl(3, k, p)}`,
      }), { figure: bernoulliTree(3, fmt(p), fmt(q)) })
    },
    () => {
      const p = p1(), q = rd(1 - p, 6), n = randInt(2, 3)
      return withMeta(proba(`L’arbre ci-dessous représente un schéma de Bernoulli à ${n} épreuves ; on obtient S (succès) avec la probabilité ${fmt(p)}. Quelle est la probabilité d’obtenir au moins un succès ?`, 1 - q ** n, {
        explanation: `Un seul chemin ne comporte aucun succès (S̄ à chaque fois), de probabilité ${pw(fmt(q), n)} ${eqv(q ** n)}. Donc P(au moins un succès) = 1 − ${fmt(rd(q ** n, 6))} ${eqv(1 - q ** n)}.`,
      }), { figure: bernoulliTree(n, fmt(p), fmt(q)) })
    },
    () => {
      const p = p1(), q = rd(1 - p, 6)
      return withMeta(proba(`L’arbre ci-dessous décrit trois épreuves de Bernoulli identiques et indépendantes (S : succès, de probabilité ${fmt(p)}). Quelle est la probabilité que la première épreuve soit un succès et les deux suivantes des échecs ?`, p * q * q, {
        explanation: `Un seul chemin : S, S̄, S̄. Probabilité ${fmt(p)} × ${fmt(q)} × ${fmt(q)} ${eqv(p * q * q)}.`,
      }), { figure: bernoulliTree(3, fmt(p), fmt(q)) })
    },
  ),
]

// ═══ Palier 3 : exercices standard ══════════════════════════════════════
const totalExpl = (A: string, B: string, a: number, b: number, c: number) =>
  `Formule des probabilités totales : P(${B}) = P(${A}) × ${pc(A, B)} + P(${bar(A)}) × ${pc(bar(A), B)} = ${fmt(a)} × ${fmt(b)} + ${fmt(rd(1 - a, 6))} × ${fmt(c)} = ${fmt(rd(a * b, 6))} + ${fmt(rd((1 - a) * c, 6))} ${eqv(a * b + (1 - a) * c)}.`

const tier3: Maker[] = [
  // Probabilités totales
  variants(
    ...[false, true, false].map((neg) => () => {
      const c = treeCtx(), [a, b, cc] = treeNums(), A = c.A, B = c.B
      const pB = a * b + (1 - a) * cc
      return withMeta(proba(`${treeIntro(c)} L’arbre ci-dessous résume la situation. Calcule P(${neg ? bar(B) : B}).`, neg ? 1 - pB : pB, {
        explanation: `${totalExpl(A, B, a, b, cc)}${neg ? ` Donc P(${bar(B)}) = 1 − ${fmt(rd(pB, 6))} ${eqv(1 - pB)}.` : ''}`,
      }), { figure: tree2(A, B, a, b, cc) })
    }),
    () => {
      const c = treeCtx(), [a, b, cc] = treeNums(), A = c.A, B = c.B
      const pB = a * b + (1 - a) * cc
      return proba(`${treeIntro(c)} On sait que P(${A}) = ${fmt(a)}, ${pc(A, B)} = ${fmt(b)} et ${pc(bar(A), B)} = ${fmt(cc)}. Calcule P(${B}) (un arbre au brouillon aide).`, pB, {
        explanation: totalExpl(A, B, a, b, cc),
      })
    },
  ),
  // P(X ≤ k), P(X ≥ k) pour de petits n
  variants(
    () => {
      const n = randInt(4, 5), k = randInt(1, n - 2), ge = Math.random() < 0.5
      let num = 0
      for (let i = 0; i <= n; i++) if (ge ? i >= n - k : i <= k) num += binom(n, i)
      const range = Array.from({ length: k + 1 }, (_, i) => (ge ? n - k + i : i))
      return probaFrac(`On lance ${n} fois une pièce équilibrée ; X compte les « pile ». Calcule P(X ${ge ? '≥' : '≤'} ${ge ? n - k : k}).`, num, 2 ** n,
        `X suit ${Bn(n, '1/2')} : chaque valeur i a la probabilité « i parmi ${n} » / ${2 ** n}. On additionne : (${range.map((i) => binom(n, i)).join(' + ')}) / ${2 ** n} = ${num}/${2 ** n}${fracText(num, 2 ** n) !== `${num}/${2 ** n}` ? ` = ${fracText(num, 2 ** n)}` : ''}.`)
    },
    () => {
      const c = ctx(), n = 3, p = pick(c.ps), k = 1
      const v = cdf(n, k, p)
      return proba(`${c.intro(n, fmt(p))} Quelle est la probabilité qu’${atMost(c, k)} ?`, v, {
        explanation: `${lawIs(n, fmt(p))}. P(X ≤ 1) = P(X = 0) + P(X = 1) = ${pw(fmt(rd(1 - p, 6)), 3)} + 3 × ${fmt(p)} × ${pw(fmt(rd(1 - p, 6)), 2)} = ${fmt(rd(pmf(3, 0, p), 6))} + ${fmt(rd(pmf(3, 1, p), 6))} ${eqv(v)}.`,
      })
    },
    () => {
      const c = ctx(), n = 3, p = pick(c.ps)
      const v = 1 - cdf(n, 1, p)
      return proba(`${c.intro(n, fmt(p))} Quelle est la probabilité qu’${atLeast(c, 2)} ?`, v, {
        explanation: `${lawIs(n, fmt(p))}. P(X ≥ 2) = P(X = 2) + P(X = 3) = 3 × ${pw(fmt(p), 2)} × ${fmt(rd(1 - p, 6))} + ${pw(fmt(p), 3)} = ${fmt(rd(pmf(3, 2, p), 6))} + ${fmt(rd(pmf(3, 3, p), 6))} ${eqv(v)}.`,
      })
    },
    () => {
      const n = 4, p = pick([0.1, 0.2, 0.5, 0.9]), k = randInt(1, 2)
      const v = cdf(n, k, p)
      return proba(`${lawIs(n, fmt(p))}. Calcule P(X ≤ ${k}).`, v, {
        explanation: `P(X ≤ ${k}) = ${Array.from({ length: k + 1 }, (_, i) => `P(X = ${i})`).join(' + ')} = ${Array.from({ length: k + 1 }, (_, i) => fmt(rd(pmf(n, i, p), 6))).join(' + ')} ${eqv(v)}.`,
      })
    },
  ),
  // Passer par l'événement contraire
  variants(
    () => {
      const c = ctx(), n = randInt(3, 4), p = pick(c.ps), q = rd(1 - p, 6)
      const v = 1 - q ** n - n * p * q ** (n - 1)
      return proba(`${c.intro(n, fmt(p))} Quelle est la probabilité qu’${atLeast(c, 2)} ?`, v, {
        explanation: `P(X ≥ 2) = 1 − P(X = 0) − P(X = 1) = 1 − ${pw(fmt(q), n)} − ${n} × ${fmt(p)} × ${pw(fmt(q), n - 1)} = 1 − ${fmt(rd(q ** n, 6))} − ${fmt(rd(n * p * q ** (n - 1), 6))} ${eqv(v)}.`,
      })
    },
    () => retry(() => {
      const n = randInt(10, 30), p = pick([0.6, 0.7, 0.8, 0.9]), v = rd(p ** n, 4)
      return v >= 0.001 && proba(`${lawIs(n, fmt(p))}. On donne ${pw(fmt(p), n)} ≈ ${fmt(v)}. Calcule P(X < ${n}).`, 1 - v, {
        explanation: `L’événement contraire de « X < ${n} » est « X = ${n} », de probabilité ${pw(fmt(p), n)} ≈ ${fmt(v)}. Donc P(X < ${n}) ≈ 1 − ${fmt(v)} = ${fmt(rd(1 - v, 4))}.`,
      })
    }),
    () => retry(() => {
      const c = ctx(), n = randInt(10, 30), p = pick(c.ps), q = rd(1 - p, 6), v = rd(q ** n, 4)
      return v >= 0.001 && proba(`${c.intro(n, fmt(p))} On donne ${pw(fmt(q), n)} ≈ ${fmt(v)}. Quelle est la probabilité qu’${atLeast(c, 1)} ?`, 1 - v, {
        explanation: `P(X ≥ 1) = 1 − P(X = 0) = 1 − ${pw(fmt(q), n)} ≈ 1 − ${fmt(v)} = ${fmt(rd(1 - v, 4))}.`,
      })
    }),
    () => {
      const n = randInt(3, 4), p = p1(), q = rd(1 - p, 6)
      const v = 1 - p ** n - n * q * p ** (n - 1)
      return proba(`${lawIs(n, fmt(p))}. Calcule P(X ≤ ${n - 2}).`, v, {
        explanation: `P(X ≤ ${n - 2}) = 1 − P(X = ${n - 1}) − P(X = ${n}) = 1 − ${n} × ${pw(fmt(p), n - 1)} × ${fmt(q)} − ${pw(fmt(p), n)} = 1 − ${fmt(rd(n * q * p ** (n - 1), 6))} − ${fmt(rd(p ** n, 6))} ${eqv(v)}.`,
      })
    },
  ),
  // Inverser le conditionnement (Bayes)
  variants(
    ...[0, 1, 2].map((which) => () => {
      const c = treeCtx(), [a, b, cc] = treeNums(), A = c.A, B = c.B
      const pB = a * b + (1 - a) * cc
      const cases = [
        { q: pc(B, A), v: (a * b) / pB, e: `${pc(B, A)} = ${F3(`P(${A} ∩ ${B})`, `P(${B})`)} = ${fmt(rd(a * b, 6))} ÷ ${fmt(rd(pB, 6))}` },
        { q: pc(B, bar(A)), v: ((1 - a) * cc) / pB, e: `${pc(B, bar(A))} = ${F3(`P(${bar(A)} ∩ ${B})`, `P(${B})`)} = ${fmt(rd((1 - a) * cc, 6))} ÷ ${fmt(rd(pB, 6))}` },
        { q: pc(bar(B), A), v: (a * (1 - b)) / (1 - pB), e: `${pc(bar(B), A)} = ${F3(`P(${A} ∩ ${bar(B)})`, `P(${bar(B)})`)} = ${fmt(rd(a * (1 - b), 6))} ÷ ${fmt(rd(1 - pB, 6))}` },
      ]
      const k = cases[which]
      return withMeta(proba(`${treeIntro(c)} L’arbre ci-dessous résume la situation. Calcule ${k.q} (arrondie au millième).`, k.v, {
        explanation: `${totalExpl(A, B, a, b, cc)} Puis ${k.e} ${eqv(k.v, 3)}.`,
      }), { figure: tree2(A, B, a, b, cc) })
    }),
  ),
  // QCM au hasard : p = 1/4 ou 1/3
  variants(
    () => {
      const c = pick([3, 4]), n = randInt(3, 4), k = randInt(1, n - 1)
      const num = binom(n, k) * (c - 1) ** (n - k), den = c ** n
      return probaFrac(`Un QCM compte ${n} questions à ${c} réponses, dont une seule juste. ${prenom()} répond au hasard à chacune. Quelle est la probabilité d’avoir exactement ${k} bonne${k > 1 ? 's' : ''} réponse${k > 1 ? 's' : ''} ?`, num, den,
        `Le nombre de bonnes réponses suit ${Bn(n, `1/${c}`)} : ${parmi(k, n)} × (1/${c})^${k} × (${c - 1}/${c})^${n - k} = ${binom(n, k)} × ${(c - 1) ** (n - k)} / ${den} = ${fracText(num, den)}.`)
    },
    () => {
      const c = pick([3, 4]), n = randInt(3, 4)
      const num = c ** n - (c - 1) ** n, den = c ** n
      return probaFrac(`Un QCM compte ${n} questions à ${c} réponses, dont une seule juste. ${prenom()} répond au hasard à chacune. Quelle est la probabilité d’avoir au moins une bonne réponse ?`, num, den,
        `Contraire : tout faux, de probabilité (${c - 1}/${c})^${n} = ${(c - 1) ** n}/${den}. Donc 1 − ${(c - 1) ** n}/${den} = ${fracText(num, den)}.`)
    },
    () => {
      const n = randInt(3, 4), k = randInt(1, n - 1)
      const num = binom(n, k) * 5 ** (n - k), den = 6 ** n
      return probaFrac(`On lance ${n} fois un dé équilibré. Quelle est la probabilité d’obtenir exactement ${k} fois le 6 ?`, num, den,
        `Le nombre de 6 suit ${Bn(n, '1/6')} : ${parmi(k, n)} × (1/6)^${k} × (5/6)^${n - k} = ${binom(n, k)} × ${5 ** (n - k)} / ${den} = ${fracText(num, den)}.`)
    },
    () => {
      const c = pick([3, 4]), n = 4
      const num = binom(4, 3) * (c - 1) + 1, den = c ** 4
      return probaFrac(`Un QCM compte 4 questions à ${c} réponses, dont une seule juste. Il faut au moins 3 bonnes réponses pour être reçu. Quelle est la probabilité d’être reçu en répondant au hasard ?`, num, den,
        `X suit ${Bn(n, `1/${c}`)}. P(X ≥ 3) = P(X = 3) + P(X = 4) = 4 × (1/${c})^3 × ${c - 1}/${c} + (1/${c})^4 = (${4 * (c - 1)} + 1)/${den} = ${fracText(num, den)}.`)
    },
  ),
]

// ═══ Palier 4 ═══════════════════════════════════════════════════════════
/** Seuils « de tête » : q^n ≤ 1 − s avec q = 1/2, 1/3, 1/4, 1/5, 1/10. */
const tier4: Maker[] = [
  // Plus petit n tel que P(X ≥ 1) ≥ seuil, calculable de tête
  fresh(variants(
    () => {
      const s = pick([0.9, 0.95, 0.99, 0.999]), n = minN(0.5, s)
      return numeric(`On lance une pièce équilibrée n fois. Quel est le plus petit n pour lequel la probabilité d’obtenir au moins un « pile » dépasse ${fmt(s)} ?`, n, {
        explanation: thrExpl('(1/2)', 2, s, n),
      })
    },
    () => {
      const s = pick([0.9, 0.99, 0.999, 0.9999]), n = minN(0.2, s), c = pick(CTX.filter((x) => x.ps.includes(0.8)))
      return numeric(`Chaque ${c.sg} ${c.vs} avec la probabilité 0,8, indépendamment des autres ; on en considère n. Quel est le plus petit n pour lequel la probabilité qu’${atLeast(c, 1)} dépasse ${fmt(s)} ?`, n, {
        explanation: thrExpl('0,2', 5, s, n),
      })
    },
    () => {
      const s = pick([0.9, 0.95, 0.99, 0.999]), n = minN(0.25, s)
      return numeric(`Un éclaireur cherche un gué ; chaque tentative réussit avec la probabilité 0,75, indépendamment des autres. Quel est le plus petit nombre n de tentatives pour lequel la probabilité d’au moins une réussite dépasse ${fmt(s)} ?`, n, {
        explanation: thrExpl('0,25', 4, s, n),
      })
    },
    () => {
      const s = pick([0.9, 0.95, 0.99, 0.999]), n = minN(1 / 3, s)
      return numeric(`On lance n fois un dé équilibré. Quel est le plus petit n pour lequel la probabilité d’obtenir au moins une fois un nombre supérieur ou égal à 3 dépasse ${fmt(s)} ?`, n, {
        explanation: `Un lancer donne 1 ou 2 avec la probabilité 1/3. ${thrExpl('(1/3)', 3, s, n)}`,
      })
    },
    () => {
      const s = pick([0.99, 0.999, 0.9999, 0.99999]), n = minN(0.1, s)
      return numeric(`Chaque guetteur d’une tour repère un intrus avec la probabilité 0,9, indépendamment des autres. Combien faut-il de guetteurs, au minimum, pour que l’intrus soit repéré avec une probabilité d’au moins ${fmt(s)} ?`, n, {
        explanation: thrExpl('0,1', 10, s, n),
      })
    },
  )),
  // Lecture d'une table de P(X ≤ k)
  variants(
    ...(['gt', 'ge', 'between', 'between2'] as const).map((kind) => () => retry(() => {
      const n = pick([10, 12, 15, 20]), p = pick([0.2, 0.3, 0.4, 0.5]), m = n * p
      const a = randInt(Math.max(1, Math.floor(m - 3)), Math.floor(m + 1)), b = a + randInt(2, 4)
      const F = (k: number) => rd(cdf(n, k, p), 4)
      if (F(a - 1) < 0.005 || F(b) > 0.995 || b >= n) return null
      const need = kind === 'gt' ? [a] : kind === 'ge' ? [a - 1] : kind === 'between' ? [a - 1, b] : [a, b - 1]
      const shown = [...new Set([...need, ...need.map((k) => k + (k === a - 1 || k === b - 1 ? 1 : -1))])].filter((k) => k >= 0 && k < n).sort((x, y) => x - y)
      if (shown.some((k) => F(k) <= 0 || F(k) >= 1)) return null
      const ans = kind === 'gt' ? 1 - F(a) : kind === 'ge' ? 1 - F(a - 1) : kind === 'between' ? F(b) - F(a - 1) : F(b - 1) - F(a)
      const ask = kind === 'gt' ? `P(X > ${a})` : kind === 'ge' ? `P(X ≥ ${a})` : kind === 'between' ? `P(${a} ≤ X ≤ ${b})` : `P(${a} < X < ${b})`
      const how = kind === 'gt' ? `${ask} = 1 − P(X ≤ ${a})` : kind === 'ge' ? `${ask} = 1 − P(X ≤ ${a - 1})` : kind === 'between' ? `${ask} = P(X ≤ ${b}) − P(X ≤ ${a - 1})` : `${ask} = P(X ≤ ${b - 1}) − P(X ≤ ${a})`
      const nums = kind === 'gt' ? `1 − ${fmt(F(a))}` : kind === 'ge' ? `1 − ${fmt(F(a - 1))}` : kind === 'between' ? `${fmt(F(b))} − ${fmt(F(a - 1))}` : `${fmt(F(b - 1))} − ${fmt(F(a))}`
      const c = ctx()
      const intro = Math.random() < 0.5 ? `${lawIs(n, fmt(p))}.` : `${c.intro(n, fmt(p))} On note X ${Xdesc(c)}.`
      return proba(`${intro} On donne : ${shown.map((k) => `P(X ≤ ${k}) ≈ ${fmt(F(k))}`).join(' ; ')}. Calcule ${ask}.`, ans, {
        explanation: `${how} ≈ ${nums} = ${fmt(rd(ans, 4))}.`,
      })
    })),
  ),
  // P(X = k) pour n plus grand, puissance donnée
  variants(
    () => {
      const n = pick([8, 10, 12, 15, 20]), p = pick([0.1, 0.2]), q = rd(1 - p, 6), g = rd(q ** (n - 1), 4)
      return proba(`${lawIs(n, fmt(p))}. On donne ${pw(fmt(q), n - 1)} ≈ ${fmt(g)}. Calcule P(X = 1).`, n * p * g, {
        explanation: `P(X = 1) = ${parmi(1, n)} × ${fmt(p)} × ${pw(fmt(q), n - 1)} ≈ ${n} × ${fmt(p)} × ${fmt(g)} ≈ ${fmt(rd(n * p * g, 4))}.`,
      })
    },
    () => {
      const c = pick(CTX.filter((x) => x.ps.some((y) => y <= 0.3))), n = pick([8, 10, 12]), p = pick(c.ps.filter((x) => x <= 0.3)), q = rd(1 - p, 6)
      const g = rd(q ** (n - 2), 4), v = binom(n, 2) * p * p * g
      return proba(`${c.intro(n, fmt(p))} On donne ${pw(fmt(q), n - 2)} ≈ ${fmt(g)}. Quelle est la probabilité qu’${exactly(c, 2)} ?`, v, {
        explanation: `${lawIs(n, fmt(p))}. P(X = 2) = ${parmi(2, n)} × ${pw(fmt(p), 2)} × ${pw(fmt(q), n - 2)} ≈ ${binom(n, 2)} × ${fmt(rd(p * p, 6))} × ${fmt(g)} ≈ ${fmt(rd(v, 4))}.`,
      })
    },
    () => {
      const c = pick(CTX.filter((x) => x.ps.some((y) => y >= 0.7))), n = pick([8, 12, 15]), p = pick(c.ps.filter((y) => y >= 0.7)), q = rd(1 - p, 6), g = rd(p ** (n - 1), 4)
      const v = n * q * g
      return proba(`${c.intro(n, fmt(p))} On donne ${pw(fmt(p), n - 1)} ≈ ${fmt(g)}. Quelle est la probabilité qu’${exactly(c, n - 1)} ?`, v, {
        explanation: `${lawIs(n, fmt(p))}. P(X = ${n - 1}) = ${parmi(n - 1, n)} × ${pw(fmt(p), n - 1)} × ${fmt(q)} ≈ ${n} × ${fmt(g)} × ${fmt(q)} ≈ ${fmt(rd(v, 4))}.`,
      })
    },
    () => {
      const n = pick([8, 10, 12]), k = pick([2, n - 2])
      const v = binom(n, k) / 2 ** n
      return proba(`On lance ${n} fois une pièce équilibrée. On donne 2^${n} = ${2 ** n}. Quelle est la probabilité d’obtenir exactement ${k} fois pile ?`, v, {
        answer: fracText(binom(n, k), 2 ** n),
        explanation: `X suit ${Bn(n, '1/2')} : P(X = ${k}) = ${parmi(k, n)} / 2^${n} = ${binom(n, k)}/${2 ** n} ≈ ${fmt(rd(v, 4))}.`,
      })
    },
  ),
  // Retrouver n ou p à partir de E et V
  fresh(variants(
    () => {
      const p = p1(), n = randInt(2, 20) * 10, E = rd(n * p, 6), V = rd(n * p * (1 - p), 6)
      return proba(`X suit une loi binomiale d’espérance ${fmt(E)} et de variance ${fmt(V)}. Que vaut p ?`, p, {
        explanation: `V = np(1 − p) = E × (1 − p), donc 1 − p = ${fmt(V)} ÷ ${fmt(E)} = ${fmt(rd(1 - p, 6))} et p = ${fmt(p)}.`, tol: 1e-6, hint: 'Ta réponse',
      })
    },
    () => {
      const p = p1(), n = randInt(2, 20) * 10, E = rd(n * p, 6), V = rd(n * p * (1 - p), 6)
      return numeric(`X suit une loi binomiale B(n ; p) avec E(X) = ${fmt(E)} et V(X) = ${fmt(V)}. Que vaut n ?`, n, {
        explanation: `1 − p = V ÷ E = ${fmt(V)} ÷ ${fmt(E)} = ${fmt(rd(1 - p, 6))}, donc p = ${fmt(p)} et n = E ÷ p = ${fmt(E)} ÷ ${fmt(p)} = ${n}.`,
      })
    },
    () => {
      const [n, s] = pick([[100, 5], [36, 3], [64, 4], [144, 6], [196, 7], [256, 8], [400, 10], [16, 2]] as const)
      return numeric(`On lance n fois une pièce équilibrée ; le nombre de « pile » a pour écart-type ${s}. Que vaut n ?`, n, {
        explanation: `X suit B(n ; 0,5), donc V(X) = n × 0,5 × 0,5 = n/4. σ = ${s} donne V = ${s * s}, donc n = 4 × ${s * s} = ${n}.`,
      })
    },
    () => {
      const p = p1(), n = randInt(2, 20) * 10, E = rd(n * p, 6), V = rd(n * p * (1 - p), 6)
      return numeric(`Une variable binomiale X a pour paramètre n = ${n} et pour espérance ${fmt(E)}. Calcule sa variance.`, V, {
        explanation: `p = E ÷ n = ${fmt(E)} ÷ ${n} = ${fmt(p)}, puis V = np(1 − p) = ${fmt(E)} × ${fmt(rd(1 - p, 6))} = ${fmt(V)}.`,
      })
    },
  )),
  // Branche inconnue grâce à P(B)
  variants(
    ...[0, 1, 2].map((which) => () => {
      const c = treeCtx(), [a, b, x] = treeNums(), A = c.A, B = c.B
      const pB = rd(a * b + (1 - a) * x, 6)
      if (which === 2) {
        // P(A) inconnue
        const y = rd((pB - x) / (b - x), 6), up = b > x
        const lin = up
          ? `a × (${fmt(b)} − ${fmt(x)}) = ${fmt(pB)} − ${fmt(x)}, donc a = ${fmt(rd(pB - x, 6))} ÷ ${fmt(rd(b - x, 6))}`
          : `a × (${fmt(x)} − ${fmt(b)}) = ${fmt(x)} − ${fmt(pB)}, donc a = ${fmt(rd(x - pB, 6))} ÷ ${fmt(rd(x - b, 6))}`
        return withMeta(proba(`${treeIntro(c)} On sait que P(${B}) = ${fmt(pB)}. Complète l’arbre : que vaut a = P(${A}) ?`, y, {
          explanation: `Probabilités totales : a × ${fmt(b)} + (1 − a) × ${fmt(x)} = ${fmt(pB)}, soit ${lin} = ${fmt(y)}.`,
        }), { figure: tree2(A, B, a, b, x, { a: 'a' }) })
      }
      return withMeta(proba(`${treeIntro(c)} On sait que P(${B}) = ${fmt(pB)}. Complète l’arbre : que vaut x = ${pc(bar(A), B)} ?`, x, {
        explanation: `Probabilités totales : ${fmt(a)} × ${fmt(b)} + ${fmt(rd(1 - a, 6))} × x = ${fmt(pB)}, donc x = (${fmt(pB)} − ${fmt(rd(a * b, 6))}) ÷ ${fmt(rd(1 - a, 6))} = ${fmt(x)}.`,
      }), { figure: tree2(A, B, a, b, x, { c: 'x' }) })
    }),
  ),
]
/** Explication « 1 − q^n ≥ s ⇔ b^n ≥ 1/(1 − s) » avec b = 1/q entier. */
function thrExpl(q: string, b: number, s: number, n: number): string {
  return `P(au moins un succès) = 1 − ${q}^n ≥ ${fmt(s)} ⇔ ${q}^n ≤ ${fmt(rd(1 - s, 6))} ⇔ ${b}^n ≥ ${fmt(rd(1 / (1 - s), 6))}. Or ${b}^${n - 1} = ${b ** (n - 1)} et ${b}^${n} = ${b ** n} : le plus petit n est ${n}.`
}
/** Plus petit n tel que 1 − q^n ≥ s. */
function minN(q: number, s: number): number {
  let n = 1
  while (1 - q ** n < s - 1e-12) n++
  return n
}

// ═══ Palier 5 : exigeant ════════════════════════════════════════════════
const ln4 = (v: number) => fmt(rd(Math.log(v), 4))
const tier5: Maker[] = [
  // Plus petit n avec logarithmes donnés
  fresh(variants(
    ...[0, 1, 2].map((form) => () => retry(() => {
      const p = pick([0.05, 0.1, 0.15, 0.2, 0.3, 0.4]), q = rd(1 - p, 6), s = pick([0.9, 0.95, 0.99])
      const ratio = Math.log(1 - s) / Math.log(q), ratioR = rd(Math.log(1 - s), 4) / rd(Math.log(q), 4)
      const n = Math.ceil(ratio - 1e-12)
      if (Math.ceil(ratioR) !== n || ratio % 1 < 0.05 || ratio % 1 > 0.95) return null
      const given = `On donne ln(${fmt(rd(1 - s, 6))}) ≈ ${ln4(1 - s)} et ln(${fmt(q)}) ≈ ${ln4(q)}.`
      const expl = `1 − ${fmt(q)}^n ≥ ${fmt(s)} ⇔ ${fmt(q)}^n ≤ ${fmt(rd(1 - s, 6))} ⇔ n × ln(${fmt(q)}) ≤ ln(${fmt(rd(1 - s, 6))}) ⇔ n ≥ ${F3(`ln(${fmt(rd(1 - s, 6))})`, `ln(${fmt(q)})`)} ≈ ${fmt(rd(ratio, 2))} (on divise par ln(${fmt(q)}) < 0 : le sens change). Donc n = ${n}.`
      if (form === 0) return numeric(`Une épreuve réussit avec la probabilité ${fmt(p)}. On la répète n fois de façon indépendante. ${given} Quel est le plus petit n tel que la probabilité d’au moins un succès soit supérieure ou égale à ${fmt(s)} ?`, n, { explanation: expl })
      if (form === 1) return numeric(`X suit la loi binomiale B(n ; ${fmt(p)}). ${given} Détermine le plus petit entier n tel que P(X ≥ 1) ≥ ${fmt(s)}.`, n, { explanation: expl })
      return numeric(`Une forge produit des épées, chacune défectueuse avec la probabilité ${fmt(p)}. Pour son contrôle, le capitaine prélève n épées (prélèvement assimilé à des tirages avec remise). ${given} Combien doit-il en prélever, au minimum, pour trouver au moins une épée défectueuse avec une probabilité d’au moins ${fmt(s)} ?`, n, { explanation: expl })
    })),
  )),
  // Deux étapes : p par probabilités totales, puis loi binomiale
  variants(
    () => {
      const a = p05(0.3, 0.7), b = p05(0.6, 0.95), c = p05(0.2, 0.55), p = a * b + (1 - a) * c, n = 3
      return proba(`Un archer choisit, avant chaque tir, son arc long avec la probabilité ${fmt(a)} (sinon son arc court). Avec l’arc long, il touche la cible avec la probabilité ${fmt(b)} ; avec l’arc court, ${fmt(c)}. Il tire ${n} flèches, les tirs étant indépendants. Quelle est la probabilité qu’il touche la cible ${n} fois ?`, p ** n, {
        explanation: `Pour un tir : p = ${fmt(a)} × ${fmt(b)} + ${fmt(rd(1 - a, 6))} × ${fmt(c)} = ${fmt(rd(p, 6))} (probabilités totales). Puis X suit ${Bn(n, fmt(rd(p, 6)))} : P(X = ${n}) = ${fmt(rd(p, 6))}^${n} ≈ ${fmt(rd(p ** n, 3))}.`,
      })
    },
    () => {
      const a = p05(0.3, 0.7), b = pick([0.02, 0.04, 0.05]), c = pick([0.06, 0.08, 0.1]), p = a * b + (1 - a) * c, n = randInt(2, 3)
      const v = 1 - (1 - p) ** n
      return proba(`Une forge reçoit ${fmt(a * 100)} % de son fer de la mine du nord et le reste de la mine du sud. Un lingot du nord est défectueux avec la probabilité ${fmt(b)}, un lingot du sud avec la probabilité ${fmt(c)}. On prélève ${n} lingots au hasard (tirages assimilés à des tirages avec remise). Quelle est la probabilité qu’au moins un lingot soit défectueux ?`, v, {
        explanation: `Pour un lingot : p = ${fmt(a)} × ${fmt(b)} + ${fmt(rd(1 - a, 6))} × ${fmt(c)} = ${fmt(rd(p, 6))}. Le nombre de lingots défectueux suit ${Bn(n, fmt(rd(p, 6)))} : P(X ≥ 1) = 1 − ${fmt(rd(1 - p, 6))}^${n} ≈ ${fmt(rd(v, 3))}.`,
      })
    },
    () => {
      const a = p05(0.2, 0.6), b = p05(0.7, 0.95), c = p05(0.3, 0.6), p = a * b + (1 - a) * c, n = 3, k = 2
      const v = 3 * p * p * (1 - p)
      return proba(`La meunière mélange deux sacs de graines : ${fmt(a * 100)} % viennent d’un sac sélectionné (taux de germination ${fmt(b)}), le reste d’un sac ordinaire (taux ${fmt(c)}). Elle sème ${n} graines prises au hasard dans le mélange. Quelle est la probabilité qu’exactement ${k} graines germent ?`, v, {
        explanation: `Pour une graine : p = ${fmt(a)} × ${fmt(b)} + ${fmt(rd(1 - a, 6))} × ${fmt(c)} = ${fmt(rd(p, 6))}. X suit ${Bn(n, fmt(rd(p, 6)))} : P(X = 2) = 3 × ${fmt(rd(p, 6))}^2 × ${fmt(rd(1 - p, 6))} ≈ ${fmt(rd(v, 3))}.`,
      })
    },
  ),
  // Dépistage (Bayes avec pourcentages)
  variants(
    ...[0, 1, 2].map((which) => () => retry(() => {
      const pi = pick([0.05, 0.1, 0.2, 0.3]), se = pick([0.8, 0.85, 0.9, 0.95]), fp = pick([0.02, 0.05, 0.1])
      const pPos = pi * se + (1 - pi) * fp
      const vp = (pi * se) / pPos, vn = ((1 - pi) * (1 - fp)) / (1 - pPos)
      if (which === 1 && vn > 0.99) return null
      const intro = `Une maladie touche ${fmt(pi * 100)} % de la population. Un test est positif chez ${fmt(se * 100)} % des malades et chez ${fmt(fp * 100)} % des personnes saines.`
      if (which === 0) return proba(`${intro} Une personne a un test positif : quelle est la probabilité qu’elle soit malade (arrondie au millième) ?`, vp, {
        explanation: `P(T) = ${fmt(pi)} × ${fmt(se)} + ${fmt(rd(1 - pi, 6))} × ${fmt(fp)} = ${fmt(rd(pPos, 6))}. P_T(M) = ${fmt(rd(pi * se, 6))} ÷ ${fmt(rd(pPos, 6))} ≈ ${fmt(rd(vp, 3))}.`,
      })
      if (which === 1) return proba(`${intro} Une personne a un test négatif : quelle est la probabilité qu’elle soit saine (arrondie au millième) ?`, vn, {
        explanation: `P(T̄) = ${fmt(pi)} × ${fmt(rd(1 - se, 6))} + ${fmt(rd(1 - pi, 6))} × ${fmt(rd(1 - fp, 6))} = ${fmt(rd(1 - pPos, 6))}. P(M̄ sachant T̄) = ${fmt(rd((1 - pi) * (1 - fp), 6))} ÷ ${fmt(rd(1 - pPos, 6))} ≈ ${fmt(rd(vn, 3))}.`,
      })
      return proba(`${intro} On teste une personne au hasard. Quelle est la probabilité que le test se trompe (faux positif ou faux négatif) ?`, pi * (1 - se) + (1 - pi) * fp, {
        explanation: `P(erreur) = P(M ∩ T̄) + P(M̄ ∩ T) = ${fmt(pi)} × ${fmt(rd(1 - se, 6))} + ${fmt(rd(1 - pi, 6))} × ${fmt(fp)} ${eqv(pi * (1 - se) + (1 - pi) * fp)}.`,
      })
    })),
  ),
  // Retrouver p
  fresh(variants(
    () => {
      const q = pick([0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9]), n = 2, v = rd(1 - q ** n, 6)
      return proba(`X suit la loi binomiale B(2 ; p) et P(X ≥ 1) = ${fmt(v)}. Que vaut p ?`, rd(1 - q, 6), {
        explanation: `P(X = 0) = (1 − p)^2 = 1 − ${fmt(v)} = ${fmt(rd(q * q, 6))}, donc 1 − p = ${fmt(q)} et p = ${fmt(rd(1 - q, 6))}.`, tol: 1e-6,
      })
    },
    () => {
      const q = pick([0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9]), v = rd(1 - q ** 3, 6)
      return proba(`X suit la loi binomiale B(3 ; p) et P(X ≥ 1) = ${fmt(v)}. Que vaut p ?`, rd(1 - q, 6), {
        explanation: `P(X = 0) = (1 − p)^3 = 1 − ${fmt(v)} = ${fmt(rd(q ** 3, 6))} = ${fmt(q)}^3, donc 1 − p = ${fmt(q)} et p = ${fmt(rd(1 - q, 6))}.`, tol: 1e-6,
      })
    },
    () => {
      const c = ctx(), p = pick(c.ps), n = 3
      return proba(`${c.intro(n, 'p').replace(/ avec la probabilité p/, ' avec une même probabilité p')} On sait que la probabilité que ${allOf(c, n)} vaut ${fmt(rd(p ** 3, 6))}. Que vaut p ?`, p, {
        explanation: `P(X = 3) = p^3 = ${fmt(rd(p ** 3, 6))} = ${fmt(p)}^3, donc p = ${fmt(p)}.`, tol: 1e-6,
      })
    },
    () => {
      const p = pick([0.1, 0.2, 0.3, 0.4, 0.6, 0.7, 0.8, 0.9]), v = rd(p * p, 6), w = rd(2 * p * (1 - p), 6)
      return Math.random() < 0.5
        ? proba(`X suit la loi binomiale B(2 ; p) et P(X = 2) = ${fmt(v)}. Calcule P(X = 1).`, w, {
          explanation: `p^2 = ${fmt(v)} donc p = ${fmt(p)} ; P(X = 1) = 2 × ${fmt(p)} × ${fmt(rd(1 - p, 6))} = ${fmt(w)}.`,
        })
        : proba(`X suit la loi binomiale B(2 ; p) et P(X = 0) = ${fmt(rd((1 - p) ** 2, 6))}. Calcule P(X = 1).`, w, {
          explanation: `(1 − p)^2 = ${fmt(rd((1 - p) ** 2, 6))} donc 1 − p = ${fmt(rd(1 - p, 6))} et p = ${fmt(p)} ; P(X = 1) = 2 × ${fmt(p)} × ${fmt(rd(1 - p, 6))} = ${fmt(w)}.`,
        })
    },
  )),
  // Au moins deux succès, n grand, puissances données
  variants(
    () => {
      const c = pick(CTX.filter((x) => x.ps.some((y) => y <= 0.3))), n = pick([10, 12, 15, 20]), p = pick([0.05, 0.1, 0.2]), q = rd(1 - p, 6)
      const g0 = rd(q ** n, 4), g1 = rd(q ** (n - 1), 4), v = 1 - g0 - n * p * g1
      return proba(`Chaque ${c.sg} ${c.vs} avec la probabilité ${fmt(p)}, indépendamment des autres ; on en considère ${n}. On donne ${pw(fmt(q), n)} ≈ ${fmt(g0)} et ${pw(fmt(q), n - 1)} ≈ ${fmt(g1)}. Quelle est la probabilité qu’${atLeast(c, 2)} ?`, v, {
        explanation: `X suit ${Bn(n, fmt(p))}. P(X ≥ 2) = 1 − P(X = 0) − P(X = 1) ≈ 1 − ${fmt(g0)} − ${n} × ${fmt(p)} × ${fmt(g1)} ≈ ${fmt(rd(v, 4))}.`,
      })
    },
    () => {
      const n = pick([10, 12, 15, 20]), p = pick([0.05, 0.1, 0.2]), q = rd(1 - p, 6)
      const g0 = rd(q ** n, 4), g1 = rd(q ** (n - 1), 4), v = g0 + n * p * g1
      return proba(`${lawIs(n, fmt(p))}. On donne ${pw(fmt(q), n)} ≈ ${fmt(g0)} et ${pw(fmt(q), n - 1)} ≈ ${fmt(g1)}. Calcule P(X ≤ 1).`, v, {
        explanation: `P(X ≤ 1) = P(X = 0) + P(X = 1) ≈ ${fmt(g0)} + ${n} × ${fmt(p)} × ${fmt(g1)} ≈ ${fmt(rd(v, 4))}.`,
      })
    },
    () => {
      const n = pick([10, 12, 15]), p = pick([0.8, 0.9]), q = rd(1 - p, 6)
      const g0 = rd(p ** n, 4), g1 = rd(p ** (n - 1), 4), v = 1 - g0 - n * q * g1
      return proba(`${lawIs(n, fmt(p))}. On donne ${pw(fmt(p), n)} ≈ ${fmt(g0)} et ${pw(fmt(p), n - 1)} ≈ ${fmt(g1)}. Calcule P(X ≤ ${n - 2}).`, v, {
        explanation: `P(X ≤ ${n - 2}) = 1 − P(X = ${n}) − P(X = ${n - 1}) ≈ 1 − ${fmt(g0)} − ${n} × ${fmt(g1)} × ${fmt(q)} ≈ ${fmt(rd(v, 4))}.`,
      })
    },
  ),
]

// ═══ Problèmes d'amélioration ═══════════════════════════════════════════
const upgrades: [Maker[], Maker[], Maker[]] = [
  [
    // Premier succès au rang k (loi géométrique)
    () => {
      const p = pick([0.2, 0.3, 0.4, 0.5, 0.6]), q = rd(1 - p, 6), k = randInt(3, 5)
      return proba(`On répète une épreuve de succès p = ${fmt(p)} de façon indépendante, jusqu’au premier succès. Quelle est la probabilité que le premier succès arrive exactement à la ${k}e épreuve ?`, q ** (k - 1) * p, {
        explanation: `Il faut ${k - 1} échecs puis un succès : ${pw(fmt(q), k - 1)} × ${fmt(p)} ${eqv(q ** (k - 1) * p)}.`,
      })
    },
    // Symétrie pour p = 1/2
    () => {
      const n = pick([8, 10, 12]), k = randInt(1, 3), v = rd(cdf(n, k, 0.5), 4)
      return proba(`X suit la loi binomiale ${Bn(n, '0,5')}. On donne P(X ≤ ${k}) ≈ ${fmt(v)}. Sans autre calcul, détermine P(${k + 1} ≤ X ≤ ${n - k - 1}).`, 1 - 2 * v, {
        explanation: `Pour p = 0,5, la loi est symétrique : P(X = i) = P(X = ${n} − i), donc P(X ≥ ${n - k}) = P(X ≤ ${k}) ≈ ${fmt(v)}. Ainsi P(${k + 1} ≤ X ≤ ${n - k - 1}) = 1 − 2 × ${fmt(v)} = ${fmt(rd(1 - 2 * v, 4))}.`,
      })
    },
    // Somme de deux binomiales de même p
    () => {
      const n1 = randInt(2, 4), n2 = randInt(2, 4), p = pick([0.1, 0.2, 0.3, 0.5]), q = rd(1 - p, 6), n = n1 + n2
      return proba(`Deux archers tirent indépendamment : le premier ${n1} flèches, le second ${n2} flèches, chaque flèche manquant la cible avec la probabilité ${fmt(p)}. Quelle est la probabilité qu’au moins une des ${n} flèches manque la cible ?`, 1 - q ** n, {
        explanation: `Les ${n} tirs forment un schéma de Bernoulli : le nombre total de flèches manquées suit ${Bn(n, fmt(p))}. P(au moins une manquée) = 1 − ${pw(fmt(q), n)} ${eqv(1 - q ** n)}.`,
      })
    },
  ],
  [
    // p minimal pour un seuil
    () => {
      const [n, q, s] = pick([[2, 0.2, 0.96], [2, 0.3, 0.91], [2, 0.1, 0.99], [3, 0.2, 0.992], [3, 0.3, 0.973], [3, 0.1, 0.999], [2, 0.4, 0.84], [3, 0.5, 0.875]] as const)
      return proba(`On répète ${n} fois, de façon indépendante, une épreuve de succès p. Quelle est la plus petite valeur de p pour laquelle la probabilité d’au moins un succès atteint ${fmt(s)} ?`, rd(1 - q, 6), {
        explanation: `1 − (1 − p)^${n} ≥ ${fmt(s)} ⇔ (1 − p)^${n} ≤ ${fmt(rd(1 - s, 6))} = ${fmt(q)}^${n} ⇔ 1 − p ≤ ${fmt(q)} ⇔ p ≥ ${fmt(rd(1 - q, 6))}.`, tol: 1e-6,
      })
    },
    // Exactement un sachant au moins un
    () => {
      const n = randInt(2, 3), p = p1(), q = rd(1 - p, 6), v = (n * p * q ** (n - 1)) / (1 - q ** n)
      return proba(`${lawIs(n, fmt(p))}. Calcule la probabilité que X = 1 sachant que X ≥ 1 (arrondie au millième).`, v, {
        explanation: `P(X = 1 sachant X ≥ 1) = P(X = 1) / P(X ≥ 1) = ${fmt(rd(n * p * q ** (n - 1), 6))} ÷ ${fmt(rd(1 - q ** n, 6))} ≈ ${fmt(rd(v, 3))} (l’événement {X = 1} est inclus dans {X ≥ 1}).`,
      })
    },
    // Plus de k essais avant le premier succès
    () => {
      const p = pick([0.2, 0.3, 0.4, 0.5]), q = rd(1 - p, 6), k = randInt(2, 4)
      return proba(`Un joueur lance des fléchettes jusqu’à toucher le centre ; chaque lancer touche le centre avec la probabilité ${fmt(p)}, indépendamment. Quelle est la probabilité qu’il lui faille plus de ${k} lancers ?`, q ** k, {
        explanation: `Il faut plus de ${k} lancers ⇔ les ${k} premiers lancers ratent : ${pw(fmt(q), k)} ${eqv(q ** k)}.`,
      })
    },
  ],
  [
    // Bayes à trois branches
    () => retry(() => {
      const a = p05(0.2, 0.5), b = p05(0.2, 0.5), c = rd(1 - a - b, 6)
      if (c < 0.15) return null
      const d = [pick([0.01, 0.02, 0.03]), pick([0.02, 0.04, 0.05]), pick([0.03, 0.05, 0.06])]
      const share = [a, b, c], pD = share.reduce((s, x, i) => s + x * d[i], 0), k = randInt(0, 2)
      const names = ['M₁', 'M₂', 'M₃']
      const v = (share[k] * d[k]) / pD
      return withMeta(proba(`Trois machines M₁, M₂, M₃ fabriquent respectivement ${fmt(a * 100)} %, ${fmt(b * 100)} % et ${fmt(c * 100)} % des pièces ; leurs taux de défaut sont ${fmt(d[0] * 100)} %, ${fmt(d[1] * 100)} % et ${fmt(d[2] * 100)} %. Une pièce prise au hasard est défectueuse (D) : quelle est la probabilité qu’elle vienne de ${names[k]} (arrondie au millième) ?`, v, {
        explanation: `P(D) = ${share.map((x, i) => `${fmt(x)} × ${fmt(d[i])}`).join(' + ')} = ${fmt(rd(pD, 6))}. P(${names[k]} sachant D) = ${fmt(rd(share[k] * d[k], 6))} ÷ ${fmt(rd(pD, 6))} ≈ ${fmt(rd(v, 3))}.`,
      }), {
        figure: treeFigure(names.map((nm, i) => ({ name: nm, p: fmt(share[i]), kids: [{ name: 'D', p: fmt(d[i]) }, { name: bar('D'), p: fmt(rd(1 - d[i], 6)) }] }))),
      })
    }),
    // Valeur la plus probable
    () => retry(() => {
      const n = pick([10, 12, 15, 20, 25]), p = pick([0.15, 0.25, 0.35, 0.45, 0.3, 0.7, 0.6]), m = Math.floor((n + 1) * p)
      if (Math.abs((n + 1) * p - Math.round((n + 1) * p)) < 1e-9) return null
      return numeric(`${lawIs(n, fmt(p))}. Pour quelle valeur de k la probabilité P(X = k) est-elle maximale ? (Indication : compare P(X = k + 1) et P(X = k).)`, m, {
        explanation: `${F3('P(X = k + 1)', 'P(X = k)')} = ${F3('(n − k) p', '(k + 1)(1 − p)')} ≥ 1 ⇔ (n − k)p ≥ (k + 1)(1 − p) ⇔ k ≤ (n + 1)p − 1 = ${fmt(rd((n + 1) * p - 1, 6))}. Les probabilités croissent jusqu’à k = ${m} puis décroissent : le maximum est atteint en k = ${m}.`,
      })
    }),
    // Retrouver p < 1/2 à partir de n et de V
    () => {
      const p = pick([0.1, 0.2, 0.3, 0.4]), n = pick([50, 100, 200]), V = rd(n * p * (1 - p), 6)
      return proba(`X suit une loi binomiale ${Bn(n, 'p')} avec p < 0,5, et V(X) = ${fmt(V)}. Que vaut p ?`, p, {
        explanation: `np(1 − p) = ${fmt(V)} ⇔ p − p² = ${fmt(rd(V / n, 6))} ⇔ p² − p + ${fmt(rd(V / n, 6))} = 0. Discriminant ${fmt(rd(1 - (4 * V) / n, 6))} = ${fmt(rd(1 - 2 * p, 6))}², racines ${fmt(p)} et ${fmt(rd(1 - p, 6))} ; comme p < 0,5, p = ${fmt(p)}.`, tol: 1e-6,
      })
    },
  ],
]

// ═══ Problèmes de l'hôtel de ville ══════════════════════════════════════
const age: [Maker[], Maker[], Maker[]] = [
  [
    () => {
      const p = p1(), q = rd(1 - p, 6), who = prenom()
      return T('Les deux flèches', proba(`Au concours de tir du village, ${who} tire deux flèches ; chacune touche la cible avec la probabilité ${fmt(p)}, indépendamment. L’arbre ci-dessous (T : « touché ») décrit la situation. ${who} gagne une médaille s’il touche la cible exactement une fois. Quelle est la probabilité de gagner une médaille ?`, 2 * p * q, {
        explanation: `Deux chemins réalisent un seul tir réussi : (T ; T̄) et (T̄ ; T), chacun de probabilité ${fmt(p)} × ${fmt(q)}. Total : 2 × ${fmt(p)} × ${fmt(q)} ${eqv(2 * p * q)}.`,
      }), treeFigure([
        { name: 'T', p: fmt(p), kids: [{ name: 'T', p: fmt(p) }, { name: bar('T'), p: fmt(q) }] },
        { name: bar('T'), p: fmt(q), kids: [{ name: 'T', p: fmt(p) }, { name: bar('T'), p: fmt(q) }] },
      ]))
    },
    () => {
      const c = pick([3, 4, 5]), n = randInt(2, 4)
      return T('L’examen du scribe', probaFrac(`Pour devenir scribe, il faut répondre à un QCM de ${n} questions, chacune à ${c} réponses dont une seule juste. Un candidat qui n’a rien révisé répond au hasard. Quelle est la probabilité qu’il ait tout faux ?`, (c - 1) ** n, c ** n,
        `Chaque réponse est fausse avec la probabilité ${c - 1}/${c}, indépendamment : (${c - 1}/${c})^${n} = ${(c - 1) ** n}/${c ** n}.`))
    },
    () => {
      const t = pick([2, 4, 5]), n = pick([10, 20, 30]), q = rd(1 - t / 100, 6), v = rd(q ** n, 4)
      return T('Le contrôle des boucliers', proba(`L’armurier sait que ${t} % de ses boucliers ont un défaut. Le capitaine en prélève ${n} au hasard dans un très grand stock. On donne ${pw(fmt(q), n)} ≈ ${fmt(v)}. Quelle est la probabilité qu’au moins un bouclier du lot soit défectueux ?`, 1 - v, {
        explanation: `Le nombre de boucliers défectueux suit ${Bn(n, fmt(t / 100))}. P(au moins un) = 1 − P(aucun) = 1 − ${pw(fmt(q), n)} ≈ 1 − ${fmt(v)} = ${fmt(rd(1 - v, 4))}.`,
      }))
    },
  ],
  [
    () => {
      const [a, b, c] = [pick([0.05, 0.1, 0.15, 0.2]), p05(0.8, 0.95), p05(0.05, 0.2)]
      const v = a * b + (1 - a) * c
      return T('Le diagnostic du guérisseur', proba(`Pendant une épidémie, ${fmt(a * 100)} % des villageois sont malades (M). Le guérisseur reconnaît un malade avec la probabilité ${fmt(b)}, mais déclare aussi malade, à tort, une personne saine avec la probabilité ${fmt(c)}. On note D l’événement « le guérisseur déclare la personne malade ». Quelle proportion des villageois examinés sera déclarée malade ?`, v, {
        explanation: totalExpl('M', 'D', a, b, c),
      }), tree2('M', 'D', a, b, c))
    },
    () => {
      const p = pick([0.4, 0.5, 0.6]), n = pick([3, 4]), k = n === 3 ? 2 : pick([2, 3])
      const ks = Array.from({ length: n + 1 }, (_, i) => i), ps = ks.map((i) => pmf(n, i, p))
      const v = ps.slice(k).reduce((s, x) => s + x, 0)
      const ymax = Math.ceil((Math.max(...ps) * 1.15) * 10) / 10
      return T('Le tournoi de tir', proba(`Au tournoi ${pick(['du comté', 'de la Saint-Jean', 'du château', 'des moissons'])}, ${prenom()} et chacun des autres concurrents tirent ${n} flèches ; la loi du nombre X de flèches en plein cœur est représentée ci-dessous (valeurs exactes indiquées au-dessus des bâtons). Un concurrent est qualifié s’il place au moins ${k} flèches en plein cœur. Quelle est la probabilité d’être qualifié ?`, v, {
        explanation: `P(X ≥ ${k}) = ${ps.slice(k).map((x) => fmt(rd(x, 6))).join(' + ')} ${eqv(v)}. (C’est la loi ${Bn(n, fmt(p))}.)`,
      }), barsFigure(ks, ps, { ymax, ystep: 0.1, labels: ps.map((x) => fmt(rd(x, 4))) }))
    },
    () => {
      const s = pick([0.95, 0.99, 0.999]), [pg, qs, b] = pick([[0.8, '0,2', 5], [0.9, '0,1', 10], [0.75, '0,25', 4], [0.5, '0,5', 2]] as const), n = minN(1 / b, s)
      const plant = pick(['lin', 'chanvre', 'blé noir', 'pavot', 'moutarde'])
      return T('Les graines de la meunière', numeric(`Chaque graine de ${plant} germe avec la probabilité ${fmt(pg)}, indépendamment des autres. La meunière veut être sûre, avec une probabilité d’au moins ${fmt(s)}, qu’au moins une graine germera dans chaque pot. Combien de graines doit-elle mettre au minimum par pot ?`, n, {
        explanation: `Avec n graines : ${thrExpl(qs, b, s, n)} Il faut ${n} graines par pot.`,
      }))
    },
  ],
  [
    () => {
      const pi = pick([0.02, 0.05, 0.1]), se = pick([0.9, 0.95, 0.98]), fp = pick([0.04, 0.05, 0.1])
      const pPos = pi * se + (1 - pi) * fp, v = (pi * se) / pPos
      return T('Le dépistage', proba(`Une maladie touche ${fmt(pi * 100)} % de la population. Un test détecte ${fmt(se * 100)} % des malades, mais il est aussi positif pour ${fmt(fp * 100)} % des personnes saines. Quelle est la probabilité qu’une personne au test positif soit réellement malade (arrondie au millième) ?`, v, {
        explanation: `${totalExpl('M', 'T', pi, se, fp)} Puis P_T(M) = ${fmt(rd(pi * se, 6))} ÷ ${fmt(rd(pPos, 6))} ≈ ${fmt(rd(v, 3))}.${v < 0.6 ? ' Malgré un test fiable, beaucoup de positifs sont sains, car la maladie est rare.' : ''}`,
      }), tree2('M', 'T', pi, se, fp))
    },
    () => {
      const a = p05(0.5, 0.8), b = pick([0.9, 0.95]), c = pick([0.6, 0.7, 0.75]), p = a * b + (1 - a) * c, n = 3
      const v = 1 - p ** n
      return T('Les tonneaux du brasseur', proba(`Le brasseur achète ${fmt(a * 100)} % de son orge au domaine du seigneur et le reste au marché. Un tonneau brassé avec l’orge du domaine est réussi avec la probabilité ${fmt(b)}, avec celle du marché ${fmt(c)}. Il brasse ${n} tonneaux, indépendamment, en tirant l’orge au hasard dans son stock. Quelle est la probabilité qu’au moins un tonneau soit raté (arrondie au millième) ?`, v, {
        explanation: `Un tonneau est réussi avec p = ${fmt(a)} × ${fmt(b)} + ${fmt(rd(1 - a, 6))} × ${fmt(c)} = ${fmt(rd(p, 6))}. Le nombre de tonneaux réussis suit ${Bn(n, fmt(rd(p, 6)))} : P(au moins un raté) = 1 − ${fmt(rd(p, 6))}^${n} ≈ ${fmt(rd(v, 3))}.`,
      }), treeFigure([
        { name: 'D', p: fmt(a), kids: [{ name: 'R', p: fmt(b) }, { name: bar('R'), p: fmt(rd(1 - b, 6)) }] },
        { name: bar('D'), p: fmt(rd(1 - a, 6)), kids: [{ name: 'R', p: fmt(c) }, { name: bar('R'), p: fmt(rd(1 - c, 6)) }] },
      ]))
    },
    () => retry(() => {
      const q = pick([0.15, 0.2, 0.25, 0.3, 0.35]), s = pick([0.99, 0.999])
      const ratio = Math.log(1 - s) / Math.log(q), ratioR = rd(Math.log(1 - s), 4) / rd(Math.log(q), 4), n = Math.ceil(ratio)
      if (Math.ceil(ratioR) !== n || ratio % 1 < 0.05 || ratio % 1 > 0.95) return null
      return T('La garde de nuit', numeric(`Chaque sentinelle du rempart s’endort pendant sa garde avec la probabilité ${fmt(q)}, indépendamment des autres. Le capitaine veut qu’au moins une sentinelle reste éveillée avec une probabilité d’au moins ${fmt(s)}. On donne ln(${fmt(q)}) ≈ ${ln4(q)} et ln(${fmt(rd(1 - s, 6))}) ≈ ${ln4(1 - s)}. Combien de sentinelles doit-il poster au minimum ?`, n, {
        explanation: `Avec n sentinelles : P(au moins une éveillée) = 1 − ${fmt(q)}^n ≥ ${fmt(s)} ⇔ n × ln(${fmt(q)}) ≤ ln(${fmt(rd(1 - s, 6))}) ⇔ n ≥ ${F3(`ln(${fmt(rd(1 - s, 6))})`, `ln(${fmt(q)})`)} ≈ ${fmt(rd(ratio, 2))} (ln(${fmt(q)}) < 0). Il faut ${n} sentinelles.`,
      }))
    }),
  ],
]

/** Écarte les tirages dont la probabilité-réponse est minuscule (< 0,005) : l'arrondi au millième n'y a pas de sens. */
function notTiny(make: Maker): Maker {
  return () => {
    let ex = make()
    for (let i = 0; i < 60; i++) {
      const v = readVal(ex.answer)
      if (!(v > 0 && v < 0.005)) break
      ex = make()
    }
    return ex
  }
}
const guard = (pools: Maker[][]) => pools.map((pool) => pool.map(notTiny))

export const CONTENT: SubjectContent | null = {
  tiers: guard([tier1, tier2, tier3, tier4, tier5]) as SubjectContent['tiers'],
  upgrades: guard(upgrades) as SubjectContent['upgrades'],
  age: guard(age) as SubjectContent['age'],
}
