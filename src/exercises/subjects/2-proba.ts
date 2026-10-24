// Probabilités (2nde) : loi de probabilité, événements (contraire, intersection, réunion), arbres et tableaux de
// dénombrement, échantillonnage (fréquence observée, intervalle de fluctuation [p − 1/√n ; p + 1/√n]),
// premières probabilités conditionnelles lues dans un tableau croisé, espérance (gain moyen) aux paliers élevés.
import {
  F, choice, fmt, fracText, fraction, fresh, interval, numeric, parseNumber, pick, randInt, shuffle, variants, withMeta,
  type Exercise, type Ladder, type Maker, type SubjectContent, type Tiers,
} from '../utils'
import type { Figure, LabelPos } from '../figure'
import { prenom } from '../contexts'

// ── Aides locales ───────────────────────────────────────────────────────
const RED = '#b8362f'
const GOLD = '#d9a441'
const GREEN = '#6aa86a'
const BLUE = '#5b8fc7'
const INK = '#3a2410'

const T = (title: string, ex: Exercise, figure?: Figure): Exercise => withMeta(ex, figure ? { title, figure } : { title })
const W = (ex: Exercise, figure: Figure): Exercise => withMeta(ex, { figure })
const model = (...makers: Maker[]): Maker => fresh(variants(...makers))

function retry<R>(gen: () => R | null | undefined | false): R {
  for (let i = 0; i < 5000; i++) {
    const r = gen()
    if (r) return r
  }
  throw new Error('Tirage impossible')
}
const r6 = (v: number) => Math.round(v * 1e6) / 1e6
const rnd = (v: number, d = 1) => Math.round(v * 10 ** d) / 10 ** d
const sum = (a: number[]) => a.reduce((s, v) => s + v, 0)
const isDec = (v: number, d = 2) => Math.abs(Math.round(v * 10 ** d) - v * 10 ** d) < 1e-6
/** Fraction « a/b » réduite, avec signe = ou rien si déjà irréductible. */
const red = (a: number, b: number) => (fracText(a, b) === `${a}/${b}` ? '' : ` = ${fracText(a, b)}`)
/** Somme « g × p » des termes non nuls d'une espérance : (−2) × 0,4 + 3 × 0,05… */
const eTerms = (g: number[], p: (number | string)[]) => g.map((x, i) => [x, p[i]] as const).filter(([x]) => x !== 0).map(([x, q]) => `${x < 0 ? `(${fmt(x)})` : fmt(x)} × ${typeof q === 'number' ? fmt(q) : q}`).join(' + ')
/** Loi écrite dans l'énoncé : « 0 écu avec probabilité 0,2 ; 2 écus avec 0,3… ». */
const lawText = (g: number[], p: number[]) => g.map((x, i) => `${fmt(x)} (${fmt(p[i])})`).join(' ; ')
/** Grand entier avec espaces : 10 000. */
const big = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
/** « p » ou « 3p ». */
const pp = (k: number) => (k === 1 ? 'p' : `${k}p`)
const listFr = (items: string[]) => (items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} et ${items[items.length - 1]}`)

/** Réponse arrondie : on accepte toute valeur à moins de 0,6 unité du dernier rang demandé. */
function approx(prompt: string, exact: number, d: number, explanation: string, hint?: string): Exercise {
  const shown = rnd(exact, d)
  const base = numeric(prompt, shown, { explanation, inputHint: hint ?? (d === 2 ? 'Arrondi au centième' : d === 3 ? 'Arrondi au millième' : 'Arrondi au dixième') })
  return {
    ...base,
    check: (v) => {
      const x = parseNumber(v.replace('%', ''))
      return !Number.isNaN(x) && Math.abs(x - exact) <= 0.6 * 10 ** -d + 1e-9
    },
    isValid: (v) => !Number.isNaN(parseNumber(v.replace('%', ''))),
  }
}

// ── Tableaux ────────────────────────────────────────────────────────────
/** Tableau dessiné : en-têtes de colonnes (case de coin comprise) et lignes (en-tête de ligne en première case). */
function tableFig(head: string[], rows: string[][], o: { red?: [number, number][]; total?: boolean; cw?: number } = {}): Figure {
  const nc = head.length, nr = rows.length + 1
  const widths = head.map((_, j) => Math.max(o.cw ?? 42, ...[head[j], ...rows.map((r) => r[j])].map((t) => 8.2 * [...t].length + 16)))
  const Wd = sum(widths), rh = 26, H = rh * nr
  const fw = Math.max(320, Math.ceil(Wd + 12)), fh = H + 16
  const x0 = (fw - Wd) / 2, y0 = 8
  const xs = [x0]
  for (const w of widths) xs.push(xs[xs.length - 1] + w)
  const points: Figure['points'] = {}
  for (let i = 0; i <= nr; i++) for (let j = 0; j <= nc; j++) points[`_g${i}_${j}`] = { x: xs[j], y: y0 + i * rh, hidden: true, label: '' }
  const segments: NonNullable<Figure['segments']> = []
  for (let i = 0; i <= nr; i++) segments.push({ a: `_g${i}_0`, b: `_g${i}_${nc}` })
  for (let j = 0; j <= nc; j++) segments.push({ a: `_g0_${j}`, b: `_g${nr}_${j}` })
  const cell = (i: number, j: number) => [`_g${i}_${j}`, `_g${i}_${j + 1}`, `_g${i + 1}_${j + 1}`, `_g${i + 1}_${j}`]
  const polygons: NonNullable<Figure['polygons']> = []
  for (let j = 1; j < nc; j++) polygons.push({ pts: cell(0, j), fill: GOLD })
  for (let i = 1; i < nr; i++) polygons.push({ pts: cell(i, 0), fill: GOLD })
  if (o.total) {
    for (let i = 1; i < nr; i++) polygons.push({ pts: cell(i, nc - 1), fill: '#e8dcc0' })
    for (let j = 1; j < nc - 1; j++) polygons.push({ pts: cell(nr - 1, j), fill: '#e8dcc0' })
  }
  for (const [i, j] of o.red ?? []) polygons.push({ pts: cell(i + 1, j), fill: RED })
  const notes: NonNullable<Figure['notes']> = []
  head.forEach((t, j) => { if (t) notes.push({ x: (xs[j] + xs[j + 1]) / 2, y: y0 + 18, text: t }) })
  rows.forEach((r, i) => r.forEach((t, j) => { if (t) notes.push({ x: (xs[j] + xs[j + 1]) / 2, y: y0 + (i + 1) * rh + 18, text: t }) }))
  return { w: fw, h: fh, points, segments, polygons, notes, caption: '' }
}
/** Loi de probabilité en tableau : issues / probabilités (une case peut valoir « ? »). */
const lawFig = (issues: string[], probs: string[], head = 'Issue') =>
  tableFig([head, ...issues], [['Probabilité', ...probs]], { red: probs.map((p, j) => [p === '?' ? 0 : -9, j + 1] as [number, number]).filter((c) => c[0] === 0) })

// ── Arbres ──────────────────────────────────────────────────────────────
/**
 * Arbre de dénombrement horizontal : `kids(chemin)` donne les étiquettes des branches issues d'un nœud,
 * `depth` le nombre d'étapes. Les feuilles de `mark` (chemins joints par « - ») sont surlignées.
 */
function treeFig(kids: (path: string[]) => string[], depth: number, o: { mark?: (path: string[]) => boolean; prob?: (path: string[]) => string | undefined; caption?: string } = {}): Figure {
  const leaves: string[][] = []
  const walk = (p: string[]) => { if (p.length === depth) leaves.push(p); else for (const k of kids(p)) walk([...p, k]) }
  walk([])
  const gap = Math.min(30, Math.max(17, 300 / leaves.length))
  const H = Math.max(160, leaves.length * gap + 24)
  const longest = Math.max(...leaves.map((l) => [...l[l.length - 1]].length))
  const Wd = 320, xOf = (k: number) => 18 + (k * (Wd - 32 - 9 * longest)) / depth
  const points: Figure['points'] = {}
  const segments: NonNullable<Figure['segments']> = []
  const notes: NonNullable<Figure['notes']> = []
  const key = (p: string[]) => (p.length ? `n_${p.join('_')}` : '_root')
  let leafIndex = 0
  const place = (p: string[]): number => {
    let y: number
    if (p.length === depth) y = 12 + gap / 2 + leafIndex++ * gap
    else {
      const ys = kids(p).map((k) => place([...p, k]))
      y = sum(ys) / ys.length
    }
    const leaf = p.length === depth
    points[key(p)] = { x: xOf(p.length), y, label: p.length ? p[p.length - 1] : '', hidden: !p.length, pos: (leaf ? 'e' : 'n') as LabelPos }
    return y
  }
  place([])
  const link = (p: string[]) => {
    if (p.length === depth) return
    for (const k of kids(p)) {
      const q = [...p, k]
      const hot = o.mark ? leavesUnder(q).some((l) => o.mark!(l)) : false
      segments.push({ a: key(p), b: key(q), color: hot ? RED : INK })
      const pr = o.prob?.(q)
      if (pr) {
        const a = points[key(p)], b = points[key(q)]
        notes.push({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 + (b.y < a.y ? -6 : b.y > a.y ? 15 : -6), text: pr })
      }
      link(q)
    }
  }
  const leavesUnder = (q: string[]) => leaves.filter((l) => q.every((v, i) => l[i] === v))
  link([])
  return { w: Wd, h: H, points, segments, notes, caption: o.caption ?? '' }
}

// ── Urnes ───────────────────────────────────────────────────────────────
const COLORS: Record<string, string> = { rouge: RED, verte: GREEN, bleue: BLUE, jaune: GOLD, noire: INK, blanche: '#fffaf0' }
/** Urne dessinée avec ses boules colorées. */
function urnFig(groups: { n: number; color: string }[]): Figure {
  const balls: string[] = []
  for (const g of groups) for (let i = 0; i < g.n; i++) balls.push(g.color)
  const shuffled = shuffle(balls)
  const perRow = Math.min(8, Math.max(4, Math.ceil(Math.sqrt(balls.length * 2))))
  const rows = Math.ceil(balls.length / perRow)
  const r = 9, step = 22
  const Wd = 320, H = Math.max(120, rows * step + 50)
  const left = (Wd - perRow * step) / 2
  const points: Figure['points'] = {}
  const polygons: NonNullable<Figure['polygons']> = []
  const circles: NonNullable<Figure['circles']> = []
  shuffled.forEach((c, i) => {
    const cx = left + (i % perRow) * step + step / 2 + ((Math.floor(i / perRow) % 2) * step) / 4, cy = H - 22 - Math.floor(i / perRow) * step
    const k = `_b${i}`
    points[k] = { x: cx, y: cy, hidden: true, label: '' }
    const pts: string[] = []
    for (let t = 0; t < 10; t++) {
      const kk = `_b${i}_${t}`
      points[kk] = { x: cx + r * Math.cos((t * Math.PI) / 5), y: cy + r * Math.sin((t * Math.PI) / 5), hidden: true, label: '' }
      pts.push(kk)
    }
    // trois couches (le rendu met les polygones en transparence) pour des couleurs bien franches
    for (let l = 0; l < 3; l++) polygons.push({ pts, fill: COLORS[c] ?? c })
    circles.push({ c: k, r, color: INK })
  })
  const top = H - 22 - (rows - 1) * step - 26
  const curves = [{ pts: [[left - 14, top], [left - 10, H - 8], [left + perRow * step + 14, H - 8], [left + perRow * step + 18, top]] as [number, number][], color: INK, width: 2.4 }]
  return { w: Wd, h: H, points, polygons, circles, curves, caption: '' }
}
const COLOR_NAMES = ['rouge', 'verte', 'bleue', 'jaune', 'noire', 'blanche'] as const
/** « 3 boules rouges », « 1 boule verte ». */
const balls = (n: number, c: string, obj = 'boule') => `${n} ${obj}${n > 1 ? 's' : ''} ${c}${n > 1 ? 's' : ''}`

// ── Échantillonnage ─────────────────────────────────────────────────────
const SQRT_N = [[25, 5], [100, 10], [400, 20], [625, 25], [1600, 40], [2500, 50], [10000, 100]] as const
/** Droite graduée de 0 à 1 avec l'intervalle de fluctuation et, éventuellement, la fréquence observée. */
function fluctFig(p: number, n: number, f?: number): Figure {
  const e = 1 / Math.sqrt(n), lo = r6(p - e), hi = r6(p + e)
  const X = (v: number) => 20 + v * 280, y = 70
  const points: Figure['points'] = { _a: { x: X(0), y, hidden: true, label: '' }, _b: { x: X(1), y, hidden: true, label: '' } }
  const segments: NonNullable<Figure['segments']> = [{ a: '_a', b: '_b' }]
  for (let i = 0; i <= 10; i++) {
    points[`_t${i}`] = { x: X(i / 10), y: y - (i % 5 === 0 ? 6 : 3), hidden: true, label: '' }
    points[`_u${i}`] = { x: X(i / 10), y: y + (i % 5 === 0 ? 6 : 3), hidden: true, label: '' }
    segments.push({ a: `_t${i}`, b: `_u${i}` })
  }
  const notes: NonNullable<Figure['notes']> = [{ x: X(0), y: y + 22, text: '0' }, { x: X(1), y: y + 22, text: '1' }]
  const curves = [{ pts: [[X(lo), y], [X(hi), y]] as [number, number][], color: '#e6a5a0', width: 7 }]
  points.P = { x: X(p), y, label: 'p', pos: 'n' }
  notes.push({ x: X(lo) - 18, y: y + 24, text: fmt(lo) }, { x: X(hi) + 18, y: y + 24, text: fmt(hi) })
  if (f !== undefined) points.F = { x: X(f), y, label: 'f', pos: Math.abs(f - p) < 0.06 ? 's' : 'n' }
  return { w: 320, h: 110, points, segments, notes, curves, caption: 'Intervalle de fluctuation au seuil de 95 % (en rose).' }
}

// ═════════════════════════════════════════════════════════════════════════
// Entraînement
// ═════════════════════════════════════════════════════════════════════════

// ── Palier 1 ────────────────────────────────────────────────────────────
/** Probabilités décimales (pas de 0,05) de somme 1, toutes non nulles. */
function decLaw(k: number, stepCents = 5): number[] {
  return retry(() => {
    const units = 100 / stepCents
    const cuts = shuffle(Array.from({ length: units - 1 }, (_, i) => i + 1)).slice(0, k - 1).sort((a, b) => a - b)
    const parts = [...cuts, units].map((c, i) => c - (i ? cuts[i - 1] : 0))
    return parts.every((x) => x > 0) ? parts.map((x) => r6((x * stepCents) / 100)) : null
  })
}
const LAW_CTX = [
  { t: 'Un dé à six faces est truqué. Voici la loi de probabilité de la face obtenue.', issues: ['1', '2', '3', '4', '5', '6'], head: 'Face' },
  { t: 'Une roue de loterie est partagée en secteurs de couleurs. Voici la loi de probabilité de la couleur obtenue.', issues: ['Rouge', 'Vert', 'Bleu', 'Jaune'], head: 'Couleur' },
  { t: 'Un sac contient des jetons marqués A, B, C ou D, en quantités différentes. On tire un jeton au hasard.', issues: ['A', 'B', 'C', 'D'], head: 'Lettre' },
  { t: 'Au jeu de la foire, on gagne 0, 2, 5 ou 10 écus. Voici la loi de probabilité du gain.', issues: ['0 écu', '2 écus', '5 écus', '10 écus'], head: 'Gain' },
  { t: 'Une toupie à cinq faces numérotées de 1 à 5 n’est pas équilibrée.', issues: ['1', '2', '3', '4', '5'], head: 'Face' },
]
// Compléter une loi de probabilité
const p1Law = model(
  ...LAW_CTX.map((c) => () => {
    const law = decLaw(c.issues.length), k = randInt(0, law.length - 1)
    const shown = law.map((p, i) => (i === k ? '?' : fmt(p)))
    return W(numeric(`${c.t} Quelle probabilité manque dans le tableau ?`, law[k], {
      explanation: `La somme des probabilités vaut 1 : 1 − (${law.filter((_, i) => i !== k).map(fmt).join(' + ')}) = 1 − ${fmt(r6(1 - law[k]))} = ${fmt(law[k])}.`,
    }), lawFig(c.issues, shown, c.head))
  }),
  () => retry(() => {
    const den = pick([6, 8, 10, 12]), k = 4
    const nums = decLaw(k, 100 / den).map((p) => Math.round(p * den))
    if (nums.some((x) => x <= 0)) return null
    const m = randInt(0, k - 1)
    const issues = ['Rouge', 'Vert', 'Bleu', 'Jaune']
    return W(fraction(`Une roue de loterie est partagée en ${den} secteurs égaux de quatre couleurs. Voici la loi de probabilité de la couleur obtenue (fractions). Quelle probabilité manque ?`, nums[m], den, {
      explanation: `La somme des probabilités vaut 1 = ${F(den, den)} : il reste ${den} − ${nums.filter((_, i) => i !== m).join(' − ')} = ${nums[m]} secteurs, soit ${F(nums[m], den)}${red(nums[m], den)}.`,
    }), lawFig(issues, nums.map((x, i) => (i === m ? '?' : `${x}/${den}`)), 'Couleur'))
  }),
)

// Événement contraire
const p1Contrary = model(
  () => {
    const p = randInt(1, 19) / 20
    const ctx = pick([
      `La probabilité qu'il pleuve demain sur le village est ${fmt(p)}. Quelle est la probabilité qu'il ne pleuve pas ?`,
      `Un archer touche la cible avec une probabilité de ${fmt(p)}. Quelle est la probabilité qu'il la manque ?`,
      `La probabilité qu'une graine germe est ${fmt(p)}. Quelle est la probabilité qu'elle ne germe pas ?`,
    ])
    return numeric(ctx, r6(1 - p), { explanation: `L'événement contraire a pour probabilité 1 − ${fmt(p)} = ${fmt(r6(1 - p))}.` })
  },
  () => {
    const p = randInt(1, 19) / 20
    return numeric(`Pour un événement A, P(A) = ${fmt(p)}. Calcule P(Ā), la probabilité de l'événement contraire de A.`, r6(1 - p), { explanation: `P(Ā) = 1 − P(A) = 1 − ${fmt(p)} = ${fmt(r6(1 - p))}.` })
  },
  () => {
    const d = pick([5, 6, 8, 9, 10, 12]), n = randInt(1, d - 1)
    return fraction(`La probabilité de tirer une carte gagnante dans le paquet du ménestrel est ${F(n, d)}. Quelle est la probabilité de tirer une carte perdante ?`, d - n, d, {
      explanation: `1 − ${F(n, d)} = ${F(d - n, d)}${red(d - n, d)}.`,
    })
  },
  () => {
    const p = randInt(1, 19) * 5
    return numeric(`Une machine produit des pièces dont ${p} % sont défectueuses. On prend une pièce au hasard. Quelle est la probabilité (en écriture décimale) qu'elle ne soit pas défectueuse ?`, r6(1 - p / 100), {
      explanation: `P(défectueuse) = ${fmt(p / 100)}, donc P(non défectueuse) = 1 − ${fmt(p / 100)} = ${fmt(r6(1 - p / 100))}.`,
    })
  },
)

// Équiprobabilité dans une urne
function urnGroups(k: number) {
  const cols = shuffle([...COLOR_NAMES]).slice(0, k)
  return cols.map((c) => ({ color: c, n: randInt(1, 7) }))
}
const urnText = (g: { color: string; n: number }[], obj = 'boule') => listFr(g.map((x) => balls(x.n, x.color, obj)))
const p1Urn = model(
  () => {
    const g = urnGroups(3), N = sum(g.map((x) => x.n)), i = randInt(0, 2)
    return W(fraction(`Une urne contient ${urnText(g)}, indiscernables au toucher. On tire une boule au hasard. Quelle est la probabilité qu'elle soit ${g[i].color} ?`, g[i].n, N, {
      explanation: `${N} boules équiprobables, dont ${g[i].n} ${g[i].color}${g[i].n > 1 ? 's' : ''} : P = ${F(g[i].n, N)}${red(g[i].n, N)}.`,
    }), urnFig(g))
  },
  () => {
    const g = urnGroups(3), N = sum(g.map((x) => x.n)), i = randInt(0, 2)
    return W(fraction(`Une urne contient ${urnText(g)}. On tire une boule au hasard. Quelle est la probabilité qu'elle ne soit pas ${g[i].color} ?`, N - g[i].n, N, {
      explanation: `Cas favorables : ${N} − ${g[i].n} = ${N - g[i].n} sur ${N}, soit ${F(N - g[i].n, N)}${red(N - g[i].n, N)}.`,
    }), urnFig(g))
  },
  () => {
    const g = urnGroups(4), N = sum(g.map((x) => x.n)), [i, j] = shuffle([0, 1, 2, 3]).slice(0, 2)
    return W(fraction(`Un sac contient ${urnText(g, 'bille')}. On en tire une au hasard. Quelle est la probabilité qu'elle soit ${g[i].color} ou ${g[j].color} ?`, g[i].n + g[j].n, N, {
      explanation: `${g[i].n} + ${g[j].n} = ${g[i].n + g[j].n} billes favorables sur ${N} : ${F(g[i].n + g[j].n, N)}${red(g[i].n + g[j].n, N)}.`,
    }), urnFig(g))
  },
  () => {
    const g = urnGroups(3), N = sum(g.map((x) => x.n)), i = randInt(0, 2)
    return W(fraction(`On tire au hasard une boule dans l'urne dessinée. Quelle est la probabilité de tirer une boule ${g[i].color} ?`, g[i].n, N, {
      explanation: `On compte : ${g.map((x) => `${x.n} ${x.color}${x.n > 1 ? 's' : ''}`).join(', ')}, soit ${N} boules. P = ${F(g[i].n, N)}${red(g[i].n, N)}.`,
    }), urnFig(g))
  },
)

// Probabilité d'un événement = somme des probabilités de ses issues
const p1Sum = model(
  () => {
    const law = decLaw(6), ev = pick([
      { t: 'obtenir un nombre pair', f: [2, 4, 6] }, { t: 'obtenir un nombre impair', f: [1, 3, 5] },
      { t: 'obtenir au moins 4', f: [4, 5, 6] }, { t: 'obtenir au plus 2', f: [1, 2] }, { t: 'obtenir un multiple de 3', f: [3, 6] },
    ])
    const v = r6(sum(ev.f.map((x) => law[x - 1])))
    return W(numeric(`On lance un dé truqué dont la loi de probabilité est donnée. Quelle est la probabilité de l'événement « ${ev.t} » ?`, v, {
      explanation: `On additionne les probabilités des faces ${listFr(ev.f.map(String))} : ${ev.f.map((x) => fmt(law[x - 1])).join(' + ')} = ${fmt(v)}.`,
    }), lawFig(['1', '2', '3', '4', '5', '6'], law.map(fmt), 'Face'))
  },
  () => {
    const law = decLaw(4), issues = ['Rouge', 'Vert', 'Bleu', 'Jaune'], [i, j] = shuffle([0, 1, 2, 3]).slice(0, 2)
    const v = r6(law[i] + law[j])
    return W(numeric(`La roue de loterie a la loi de probabilité donnée. Quelle est la probabilité d'obtenir ${issues[i].toLowerCase()} ou ${issues[j].toLowerCase()} ?`, v, {
      explanation: `${fmt(law[i])} + ${fmt(law[j])} = ${fmt(v)}.`,
    }), lawFig(issues, law.map(fmt), 'Couleur'))
  },
  () => {
    const law = decLaw(4), gains = [0, 2, 5, 10], thr = pick([2, 5])
    const v = r6(sum(law.filter((_, i) => gains[i] >= thr)))
    return W(numeric(`Au jeu de la foire, la loi du gain est donnée. Quelle est la probabilité de gagner au moins ${thr} écus ?`, v, {
      explanation: `Gains d'au moins ${thr} écus : ${gains.filter((g) => g >= thr).join(', ')}. P = ${law.filter((_, i) => gains[i] >= thr).map(fmt).join(' + ')} = ${fmt(v)}.`,
    }), lawFig(['0 écu', '2 écus', '5 écus', '10 écus'], law.map(fmt), 'Gain'))
  },
  () => {
    const law = decLaw(5), k = randInt(1, 4)
    const v = r6(1 - law[k - 1])
    return W(numeric(`Une toupie à cinq faces a la loi de probabilité donnée. Quelle est la probabilité de ne pas obtenir la face ${k} ?`, v, {
      explanation: `Par l'événement contraire : 1 − ${fmt(law[k - 1])} = ${fmt(v)} (ou somme des autres probabilités).`,
    }), lawFig(['1', '2', '3', '4', '5'], law.map(fmt), 'Face'))
  },
)

// Fréquence observée
const p1Freq = model(
  () => {
    const n = pick([20, 25, 40, 50, 80, 100, 200]), k = randInt(Math.round(n * 0.2), Math.round(n * 0.8))
    const who = prenom()
    return numeric(`${who} lance une pièce ${n} fois et obtient ${k} fois « pile ». Quelle est la fréquence observée de « pile » (en écriture décimale) ?`, r6(k / n), {
      explanation: `f = ${F(k, n)} = ${fmt(r6(k / n))}.`,
    })
  },
  () => {
    const n = pick([50, 100, 200, 250, 500]), k = randInt(Math.round(n * 0.08), Math.round(n * 0.3))
    return numeric(`On lance un dé ${n} fois ; le 6 sort ${k} fois. Quelle est la fréquence d'apparition du 6 (en écriture décimale) ?`, r6(k / n), {
      explanation: `f = ${F(k, n)} = ${fmt(r6(k / n))}.`,
    })
  },
  () => {
    const n = pick([40, 50, 80, 100, 125, 200]), k = randInt(Math.round(n * 0.3), Math.round(n * 0.9))
    return numeric(`Sur ${n} flèches tirées, un archer en a planté ${k} dans la cible. Quelle est la fréquence de réussite, en pourcentage ?`, r6((k / n) * 100), {
      explanation: `f = ${F(k, n)} = ${fmt(r6(k / n))}, soit ${fmt(r6((k / n) * 100))} %.`,
      inputHint: 'Pourcentage',
    })
  },
  () => {
    const n = pick([200, 250, 400, 500, 1000]), f = randInt(10, 80) / 100
    const k = Math.round(n * f)
    return numeric(`Dans un sondage auprès de ${n} habitants, ${k} déclarent vouloir un nouveau pont. Quelle est la fréquence observée de cette opinion (en écriture décimale) ?`, r6(k / n), {
      explanation: `f = ${F(k, n)} = ${fmt(r6(k / n))}.`,
    })
  },
)

// ── Palier 2 ────────────────────────────────────────────────────────────
// Réunion et intersection
const p2Union = model(
  () => retry(() => {
    const pa = randInt(2, 6) / 10, pb = randInt(2, 6) / 10, pab = randInt(1, Math.round(Math.min(pa, pb) * 10) - 1) / 10, pu = r6(pa + pb - pab)
    if (pu > 1 || pab <= 0) return null
    return numeric(`On sait que P(A) = ${fmt(pa)}, P(B) = ${fmt(pb)} et P(A ∩ B) = ${fmt(pab)}. Calcule P(A ∪ B).`, pu, {
      explanation: `P(A ∪ B) = P(A) + P(B) − P(A ∩ B) = ${fmt(pa)} + ${fmt(pb)} − ${fmt(pab)} = ${fmt(pu)}.`,
    })
  }),
  () => retry(() => {
    const pa = randInt(3, 7) / 10, pb = randInt(3, 7) / 10, pab = randInt(1, 3) / 10, pu = r6(pa + pb - pab)
    if (pu > 1 || pab >= Math.min(pa, pb)) return null
    return numeric(`On sait que P(A) = ${fmt(pa)}, P(B) = ${fmt(pb)} et P(A ∪ B) = ${fmt(pu)}. Calcule P(A ∩ B).`, pab, {
      explanation: `P(A ∩ B) = P(A) + P(B) − P(A ∪ B) = ${fmt(pa)} + ${fmt(pb)} − ${fmt(pu)} = ${fmt(pab)}.`,
    })
  }),
  () => retry(() => {
    const pa = randInt(2, 6) * 5, pb = randInt(2, 8) * 5, pab = randInt(1, 6) * 5, pu = pa + pb - pab
    if (pu > 100 || pab >= Math.min(pa, pb)) return null
    const ctx = pick([
      { w: 'Au lycée', A: 'font du théâtre', B: 'font de la musique', who: 'des élèves' },
      { w: 'À la caserne', A: 'savent monter à cheval', B: 'savent tirer à l’arc', who: 'des soldats' },
      { w: 'Au marché', A: 'achètent du fromage', B: 'achètent du pain', who: 'des clients' },
    ])
    return numeric(`${ctx.w}, ${pa} % ${ctx.who} ${ctx.A}, ${pb} % ${ctx.B} et ${pab} % font les deux. On en choisit un au hasard. Quelle est la probabilité (en écriture décimale) qu'il fasse au moins l'une des deux choses ?`, r6(pu / 100), {
      explanation: `P(A ∪ B) = ${fmt(pa / 100)} + ${fmt(pb / 100)} − ${fmt(pab / 100)} = ${fmt(r6(pu / 100))}.`,
    })
  }),
  () => retry(() => {
    const pa = randInt(1, 5) / 10, pb = randInt(1, 5) / 10
    if (pa + pb > 0.9) return null
    return numeric(`A et B sont incompatibles (ils ne peuvent pas se réaliser en même temps), avec P(A) = ${fmt(pa)} et P(B) = ${fmt(pb)}. Calcule la probabilité que ni A ni B ne se réalise.`, r6(1 - pa - pb), {
      explanation: `Incompatibles : P(A ∪ B) = ${fmt(pa)} + ${fmt(pb)} = ${fmt(r6(pa + pb))}. « Ni A ni B » est le contraire : 1 − ${fmt(r6(pa + pb))} = ${fmt(r6(1 - pa - pb))}.`,
    })
  }),
)

// Arbre de dénombrement à deux étapes
const MENUS = [
  { a: ['Soupe', 'Salade', 'Pâté'], b: ['Poulet', 'Poisson'], t: 'L’auberge propose une entrée (soupe, salade ou pâté) puis un plat (poulet ou poisson).', unit: 'menus' },
  { a: ['P', 'F'], b: ['1', '2', '3', '4', '5', '6'], t: 'On lance une pièce (pile P ou face F), puis un dé à six faces.', unit: 'issues' },
  { a: ['R', 'V', 'B'], b: ['R', 'V', 'B'], t: 'On tire une boule dans une urne contenant une boule rouge (R), une verte (V) et une bleue (B), on note sa couleur, on la remet, puis on tire une seconde boule.', unit: 'issues' },
  { a: ['A', 'B'], b: ['1', '2', '3', '4'], t: 'Un code de coffre est formé d’une lettre (A ou B) suivie d’un chiffre de 1 à 4.', unit: 'codes' },
]
const ART: Record<string, string> = { Soupe: 'la soupe', Salade: 'la salade', Pâté: 'le pâté', Poulet: 'le poulet', Poisson: 'le poisson' }
const p2Tree = model(
  () => {
    const m = pick(MENUS)
    return W(numeric(`${m.t} À l'aide d'un arbre, compte le nombre ${m.unit === 'issues' ? 'd’issues' : `de ${m.unit}`} possibles.`, m.a.length * m.b.length, {
      explanation: `${m.a.length} choix à la première étape, et pour chacun ${m.b.length} choix ensuite : ${m.a.length} × ${m.b.length} = ${m.a.length * m.b.length}.`,
    }), treeFig((p) => (p.length ? m.b : m.a), 2))
  },
  () => {
    const m = MENUS[1], par = Math.random() < 0.5
    const fav = par ? 'P' : 'F', min = randInt(3, 5)
    const n = 7 - min
    return W(fraction(`On lance une pièce équilibrée puis un dé équilibré. Quelle est la probabilité d'obtenir « ${fav === 'P' ? 'pile' : 'face'} » et un nombre supérieur ou égal à ${min} ?`, n, 12, {
      explanation: `L'arbre a 2 × 6 = 12 issues équiprobables. Favorables : ${fav} suivi de ${Array.from({ length: n }, (_, i) => min + i).join(', ')}, soit ${n} issues. P = ${F(n, 12)}${red(n, 12)}.`,
    }), treeFig((p) => (p.length ? m.b : m.a), 2, { mark: (l) => l[0] === fav && Number(l[1]) >= min }))
  },
  () => {
    const m = MENUS[2], same = Math.random() < 0.5
    return W(fraction(`${m.t} Quelle est la probabilité d'obtenir ${same ? 'deux boules de la même couleur' : 'deux boules de couleurs différentes'} ?`, same ? 3 : 6, 9, {
      explanation: `L'arbre a 3 × 3 = 9 issues équiprobables. ${same ? 'Même couleur : RR, VV, BB, soit 3 issues' : 'Couleurs différentes : 9 − 3 = 6 issues'}. P = ${F(same ? 3 : 6, 9)} = ${fracText(same ? 3 : 6, 9)}.`,
    }), treeFig((p) => (p.length ? m.b : m.a), 2, { mark: (l) => (l[0] === l[1]) === same }))
  },
  () => {
    const m = MENUS[0], [i, j] = [randInt(0, 2), randInt(0, 1)]
    return W(fraction(`${m.t} Un voyageur choisit son menu au hasard. Quelle est la probabilité qu'il prenne ${ART[m.a[i]]} et ${ART[m.b[j]]} ?`, 1, 6, {
      explanation: `L'arbre compte 3 × 2 = 6 menus équiprobables, dont un seul convient : P = ${F(1, 6)}.`,
    }), treeFig((p) => (p.length ? m.b : m.a), 2, { mark: (l) => l[0] === m.a[i] && l[1] === m.b[j] }))
  },
)

// Probabilités dans un tableau croisé
interface Cross { rows: string[]; cols: string[]; cells: number[][]; pop: string; place: string; rq: string[]; cq: string[]; cs: string[] }
const CROSS_CTX = [
  { place: 'Dans un lycée', pop: 'élèves', rows: ['Filles', 'Garçons'], rq: ['une fille', 'un garçon'], cols: ['Sport', 'Pas de sport'], cq: ['fait du sport', 'ne fait pas de sport'], cs: ['fasse du sport', 'ne fasse pas de sport'] },
  { place: 'Dans l’armée du comte', pop: 'soldats', rows: ['Archers', 'Piquiers'], rq: ['un archer', 'un piquier'], cols: ['Vétérans', 'Recrues'], cq: ['est un vétéran', 'est une recrue'], cs: ['soit un vétéran', 'soit une recrue'] },
  { place: 'Au village', pop: 'habitants', rows: ['Adultes', 'Enfants'], rq: ['un adulte', 'un enfant'], cols: ['Vaccinés', 'Non vaccinés'], cq: ['est vaccinée', 'n’est pas vaccinée'], cs: ['soit vaccinée', 'ne soit pas vaccinée'] },
  { place: 'Au festival', pop: 'spectateurs', rows: ['Habitants', 'Touristes'], rq: ['un habitant', 'un touriste'], cols: ['Concert', 'Théâtre'], cq: ['a choisi le concert', 'a choisi le théâtre'], cs: ['ait choisi le concert', 'ait choisi le théâtre'] },
]
function crossData(lo = 6, hi = 60): Cross {
  const c = pick(CROSS_CTX)
  return { ...c, cells: [[randInt(lo, hi), randInt(lo, hi)], [randInt(lo, hi), randInt(lo, hi)]] }
}
const tot = (x: Cross) => ({ R: x.cells.map(sum), C: [x.cells[0][0] + x.cells[1][0], x.cells[0][1] + x.cells[1][1]], N: sum(x.cells.flat()) })
function crossFig(x: Cross, totals = true, redCells: [number, number][] = []): Figure {
  const t = tot(x)
  const rows = x.rows.map((r, i) => [r, ...x.cells[i].map(String), ...(totals ? [String(t.R[i])] : [])])
  if (totals) rows.push(['Total', ...t.C.map(String), String(t.N)])
  return tableFig(['', ...x.cols, ...(totals ? ['Total'] : [])], rows, { total: totals, red: redCells.map(([i, j]) => [i, j + 1] as [number, number]) })
}
const p2Table = model(
  () => {
    const x = crossData(), t = tot(x), i = randInt(0, 1), j = randInt(0, 1)
    return W(fraction(`${x.place}, on choisit au hasard une personne parmi les ${t.N} ${x.pop} du tableau. Quelle est la probabilité que ce soit ${x.rq[i]} qui ${x.cq[j]} ?`, x.cells[i][j], t.N, {
      explanation: `Case « ${x.rows[i]} / ${x.cols[j]} » : ${x.cells[i][j]} personnes sur ${t.N}. P = ${F(x.cells[i][j], t.N)}${red(x.cells[i][j], t.N)}.`,
    }), crossFig(x))
  },
  () => {
    const x = crossData(), t = tot(x), i = randInt(0, 1)
    return W(fraction(`${x.place}, on choisit au hasard une personne parmi les ${x.pop} du tableau. Quelle est la probabilité que ce soit ${x.rq[i]} ?`, t.R[i], t.N, {
      explanation: `Total de la ligne « ${x.rows[i]} » : ${t.R[i]} sur ${t.N}. P = ${F(t.R[i], t.N)}${red(t.R[i], t.N)}.`,
    }), crossFig(x))
  },
  () => {
    const x = crossData(), t = tot(x), j = randInt(0, 1)
    return W(fraction(`${x.place}, on choisit une personne au hasard parmi les ${x.pop} recensés dans le tableau (sans totaux). Quelle est la probabilité qu'elle ${x.cs[j]} ?`, t.C[j], t.N, {
      explanation: `Colonne « ${x.cols[j]} » : ${x.cells[0][j]} + ${x.cells[1][j]} = ${t.C[j]} sur ${t.N} personnes. P = ${F(t.C[j], t.N)}${red(t.C[j], t.N)}.`,
    }), crossFig(x, false))
  },
)

// Deux dés : tableau à double entrée
function diceFig(op: 'somme' | 'produit' | 'écart', hot?: (a: number, b: number) => boolean): Figure {
  const f = (a: number, b: number) => (op === 'somme' ? a + b : op === 'produit' ? a * b : Math.abs(a - b))
  const head = [op === 'somme' ? '+' : op === 'produit' ? '×' : 'écart', '1', '2', '3', '4', '5', '6']
  const rows = [1, 2, 3, 4, 5, 6].map((a) => [String(a), ...[1, 2, 3, 4, 5, 6].map((b) => String(f(a, b)))])
  const redc: [number, number][] = []
  if (hot) for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) if (hot(a, b)) redc.push([a - 1, b])
  return tableFig(head, rows, { red: redc, cw: 34 })
}
const DICE_EV = [
  { op: 'somme', t: (k: number) => `la somme soit égale à ${k}`, f: (a: number, b: number, k: number) => a + b === k, k: () => randInt(3, 11) },
  { op: 'somme', t: (k: number) => `la somme soit supérieure ou égale à ${k}`, f: (a: number, b: number, k: number) => a + b >= k, k: () => randInt(8, 11) },
  { op: 'produit', t: (k: number) => `le produit soit inférieur ou égal à ${k}`, f: (a: number, b: number, k: number) => a * b <= k, k: () => pick([4, 5, 6, 8, 10]) },
  { op: 'écart', t: (k: number) => `l'écart entre les deux nombres soit égal à ${k}`, f: (a: number, b: number, k: number) => Math.abs(a - b) === k, k: () => randInt(1, 4) },
] as const
const p2Dice = model(
  ...DICE_EV.map((ev) => () => {
    const k = ev.k()
    let n = 0
    for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) if (ev.f(a, b, k)) n++
    return W(fraction(`On lance deux dés équilibrés à six faces. Le tableau donne ${ev.op === 'somme' ? 'la somme' : ev.op === 'produit' ? 'le produit' : "l'écart"} des deux nombres pour chacune des 36 issues. Quelle est la probabilité que ${ev.t(k)} ?`, n, 36, {
      explanation: `Les 36 cases sont équiprobables ; ${n} conviennent. P = ${F(n, 36)}${red(n, 36)}.`,
    }), diceFig(ev.op))
  }),
)

// ── Palier 3 ────────────────────────────────────────────────────────────
// Intervalle de fluctuation
const p3Fluct = model(
  () => {
    const [n, s] = pick(SQRT_N.slice(1)), p = randInt(20, 80) / 100, e = 1 / s
    const I = { lo: r6(p - e), hi: r6(p + e), loClosed: true, hiClosed: true }
    return W(interval(`Dans une population, la proportion d'un caractère est p = ${fmt(p)}. On prélève des échantillons de taille n = ${big(n)}. Donne l'intervalle de fluctuation au seuil de 95 % : [p − ${F(1, '√n')} ; p + ${F(1, '√n')}].`, I, {
      explanation: `√${big(n)} = ${s}, donc ${F(1, '√n')} = ${fmt(e)}. I = [${fmt(p)} − ${fmt(e)} ; ${fmt(p)} + ${fmt(e)}] = [${fmt(I.lo)} ; ${fmt(I.hi)}].`,
    }), fluctFig(p, n))
  },
  () => {
    const [n, s] = pick(SQRT_N.slice(1)), e = 1 / s
    return W(interval(`On lance ${big(n)} fois une pièce équilibrée (p = 0,5 pour « pile »). Donne l'intervalle de fluctuation au seuil de 95 % de la fréquence de « pile ».`, { lo: r6(0.5 - e), hi: r6(0.5 + e), loClosed: true, hiClosed: true }, {
      explanation: `${F(1, `√${big(n)}`)} = ${F(1, s)} = ${fmt(e)}. I = [0,5 − ${fmt(e)} ; 0,5 + ${fmt(e)}] = [${fmt(r6(0.5 - e))} ; ${fmt(r6(0.5 + e))}].`,
    }), fluctFig(0.5, n))
  },
  () => {
    const [n, s] = pick(SQRT_N.slice(1)), p = randInt(20, 80) / 100, e = 1 / s, hi = Math.random() < 0.5
    return W(numeric(`Un caractère est présent chez ${fmt(p * 100)} % d'une population. Pour des échantillons de ${big(n)} personnes, quelle est la borne ${hi ? 'supérieure' : 'inférieure'} de l'intervalle de fluctuation au seuil de 95 % ?`, r6(hi ? p + e : p - e), {
      explanation: `p = ${fmt(p)} et ${F(1, `√${big(n)}`)} = ${fmt(e)}, donc la borne ${hi ? 'supérieure' : 'inférieure'} vaut ${fmt(p)} ${hi ? '+' : '−'} ${fmt(e)} = ${fmt(r6(hi ? p + e : p - e))}.`,
    }), fluctFig(p, n))
  },
  () => {
    const [n, s] = pick(SQRT_N.slice(1)), e = 1 / s
    return numeric(`L'intervalle de fluctuation au seuil de 95 % a pour amplitude ${F(2, '√n')}. Quelle est cette amplitude pour des échantillons de taille n = ${big(n)} ?`, r6(2 * e), {
      explanation: `${F(2, `√${big(n)}`)} = ${F(2, s)} = ${fmt(r6(2 * e))}.`,
    })
  },
)

// Tirage sans remise
const p3NoReplace = model(
  () => {
    const L = pick([['A', 'B', 'C'], ['A', 'B', 'C', 'D'], ['R', 'V', 'B', 'J']])
    const n = L.length
    return W(numeric(`Un sac contient ${n} jetons marqués ${listFr(L)}. On tire un premier jeton, on le garde, puis on en tire un second. À l'aide d'un arbre, compte le nombre de tirages possibles (l'ordre compte).`, n * (n - 1), {
      explanation: `${n} choix pour le premier jeton, puis ${n - 1} pour le second (le premier n'est pas remis) : ${n} × ${n - 1} = ${n * (n - 1)}.`,
    }), treeFig((p) => (p.length ? L.filter((x) => x !== p[0]) : L), 2))
  },
  () => {
    const L = pick([['A', 'B', 'C', 'D'], ['A', 'B', 'C']]), n = L.length, x = pick(L)
    const fav = n - 1
    return W(fraction(`Un sac contient ${n} jetons marqués ${listFr(L)}. On tire successivement deux jetons sans remise. Quelle est la probabilité que le jeton ${x} soit tiré (en premier ou en second) ?`, 2 * fav, n * (n - 1), {
      explanation: `${n} × ${n - 1} = ${n * (n - 1)} tirages équiprobables. Ceux qui contiennent ${x} : ${fav} avec ${x} en premier et ${fav} avec ${x} en second, soit ${2 * fav}. P = ${F(2 * fav, n * (n - 1))} = ${fracText(2 * fav, n * (n - 1))}.`,
    }), treeFig((p) => (p.length ? L.filter((y) => y !== p[0]) : L), 2, { mark: (l) => l.includes(x) }))
  },
  () => {
    const who = shuffle(['Arthur', 'Blanche', 'Clovis', 'Diane', 'Ernest']).slice(0, pick([3, 4]))
    const n = who.length, initials = who.map((w) => w[0]), a = initials[0]
    return W(fraction(`Parmi ${listFr(who)}, on tire au sort un capitaine puis un porte-drapeau (deux personnes différentes). Quelle est la probabilité que ${who[0]} soit capitaine ?`, n - 1, n * (n - 1), {
      explanation: `${n} × ${n - 1} = ${n * (n - 1)} tirages équiprobables, dont ${n - 1} avec ${who[0]} capitaine. P = ${F(n - 1, n * (n - 1))} = ${fracText(n - 1, n * (n - 1))}.`,
    }), treeFig((p) => (p.length ? initials.filter((y) => y !== p[0]) : initials), 2, { mark: (l) => l[0] === a }))
  },
  () => {
    const L = ['R', 'R', 'V'].concat(Math.random() < 0.5 ? ['V'] : ['B'])
    const labs = L.map((c, i) => `${c}${L.slice(0, i).filter((d) => d === c).length + 1}`)
    const n = labs.length
    let fav = 0
    for (const a of labs) for (const b of labs) if (a !== b && a[0] === 'R' && b[0] === 'R') fav++
    return W(fraction(`Une urne contient ${n} boules : ${listFr(labs)} (R = rouge, V = verte${L.includes('B') ? ', B = bleue' : ''}). On tire deux boules successivement sans remise. Quelle est la probabilité de tirer deux boules rouges ?`, fav, n * (n - 1), {
      explanation: `${n} × ${n - 1} = ${n * (n - 1)} tirages équiprobables. Deux rouges : R1 puis R2, ou R2 puis R1, soit ${fav}. P = ${F(fav, n * (n - 1))} = ${fracText(fav, n * (n - 1))}.`,
    }), treeFig((p) => (p.length ? labs.filter((y) => y !== p[0]) : labs), 2, { mark: (l) => l[0][0] === 'R' && l[1][0] === 'R' }))
  },
)

// Réunion dans un tableau croisé
const p3TableUnion = model(
  () => {
    const x = crossData(), t = tot(x), i = randInt(0, 1), j = randInt(0, 1)
    const u = t.R[i] + t.C[j] - x.cells[i][j]
    return W(fraction(`${x.place}, on choisit au hasard une personne du tableau. A : « c'est ${x.rq[i]} », B : « la personne ${x.cq[j]} ». Calcule P(A ∪ B).`, u, t.N, {
      explanation: `A ∪ B : ${t.R[i]} + ${t.C[j]} − ${x.cells[i][j]} = ${u} personnes (on ne compte la case commune qu'une fois). P(A ∪ B) = ${F(u, t.N)}${red(u, t.N)}.`,
    }), crossFig(x))
  },
  () => {
    const x = crossData(), t = tot(x), i = randInt(0, 1), j = randInt(0, 1)
    const v = x.cells[1 - i][1 - j]
    return W(fraction(`${x.place}, on choisit au hasard une personne du tableau. A : « c'est ${x.rq[i]} », B : « la personne ${x.cq[j]} ». Calcule la probabilité de Ā ∩ B̄ (ni A ni B).`, v, t.N, {
      explanation: `Ā ∩ B̄ correspond à la case « ${x.rows[1 - i]} / ${x.cols[1 - j]} » : ${v} sur ${t.N}. P = ${F(v, t.N)}${red(v, t.N)}.`,
    }), crossFig(x))
  },
  () => {
    const x = crossData(), t = tot(x), i = randInt(0, 1), j = randInt(0, 1)
    const v = x.cells[1 - i][j]
    return W(fraction(`${x.place}, on choisit au hasard une personne du tableau. A : « c'est ${x.rq[i]} », B : « la personne ${x.cq[j]} ». Calcule P(Ā ∩ B).`, v, t.N, {
      explanation: `Ā ∩ B : ce n'est pas ${x.rq[i]} et la personne ${x.cq[j]}, case « ${x.rows[1 - i]} / ${x.cols[j]} » : ${v} sur ${t.N}. P = ${F(v, t.N)}${red(v, t.N)}.`,
    }), crossFig(x))
  },
)

// Loi à paramètre
const p3Param = model(
  () => {
    const k = randInt(2, 5), f = randInt(1, 6)
    return W(fraction(`Un dé est truqué : la face ${f} a ${k} fois plus de chances de sortir que chacune des cinq autres faces, qui sont équiprobables. Quelle est la probabilité d'obtenir la face ${f} ?`, k, 5 + k, {
      explanation: `Si p est la probabilité d'une face ordinaire : 5p + ${k}p = 1, donc p = ${F(1, 5 + k)} et P(${f}) = ${F(k, 5 + k)}${red(k, 5 + k)}.`,
    }), lawFig(['1', '2', '3', '4', '5', '6'], [1, 2, 3, 4, 5, 6].map((x) => (x === f ? `${k}p` : 'p')), 'Face'))
  },
  () => {
    const a = randInt(1, 3), b = randInt(2, 4), c = randInt(1, 3), tot2 = a + b + c
    const cols = ['Rouge', 'Vert', 'Bleu']
    const i = randInt(0, 2), coef = [a, b, c][i]
    return W(fraction(`Une roue de loterie a trois couleurs. La loi de probabilité est donnée en fonction d'un nombre p. Quelle est la probabilité d'obtenir ${cols[i].toLowerCase()} ?`, coef, tot2, {
      explanation: `${pp(a)} + ${pp(b)} + ${pp(c)} = 1, donc ${tot2}p = 1 et p = ${F(1, tot2)}. P(${cols[i].toLowerCase()}) = ${pp(coef)} = ${F(coef, tot2)}${red(coef, tot2)}.`,
    }), lawFig(cols, [a, b, c].map((x) => (x === 1 ? 'p' : `${x}p`)), 'Couleur'))
  },
  () => {
    const k = randInt(2, 4)
    return W(fraction(`Sur un dé truqué, les faces paires ont toutes la même probabilité, et chacune a ${k} fois plus de chances de sortir qu'une face impaire (les faces impaires étant équiprobables). Quelle est la probabilité d'obtenir un nombre pair ?`, 3 * k, 3 + 3 * k, {
      explanation: `Si p est la probabilité d'une face impaire : 3p + 3 × ${k}p = 1, donc p = ${F(1, 3 + 3 * k)}. P(pair) = 3 × ${k}p = ${F(3 * k, 3 + 3 * k)} = ${fracText(3 * k, 3 + 3 * k)}.`,
    }), lawFig(['1', '2', '3', '4', '5', '6'], [1, 2, 3, 4, 5, 6].map((x) => (x % 2 === 0 ? `${k}p` : 'p')), 'Face'))
  },
)

// Intersection à partir de la réunion (formule) en contexte
const p3Inter = model(
  ...[
    { w: 'Dans une classe', A: 'apprennent l’espagnol', B: 'apprennent l’allemand', both: 'apprennent les deux langues' },
    { w: 'Au château', A: 'savent lire', B: 'savent compter', both: 'savent lire et compter' },
    { w: 'Sur le marché', A: 'vendent des fruits', B: 'vendent des légumes', both: 'vendent les deux' },
  ].map((ctx) => () => retry(() => {
    const N = pick([20, 25, 30, 40, 50]), a = randInt(Math.round(N / 4), Math.round((3 * N) / 4)), b = randInt(Math.round(N / 4), Math.round((3 * N) / 4)), none = randInt(0, Math.round(N / 5))
    const both = a + b - (N - none)
    if (both <= 0 || both >= Math.min(a, b) || none === 0) return null
    return fraction(`${ctx.w}, sur ${N} personnes, ${a} ${ctx.A}, ${b} ${ctx.B} et ${none} ne font ni l'un ni l'autre. On choisit une personne au hasard. Quelle est la probabilité qu'elle ${ctx.both.replace(/^apprennent/, 'apprenne').replace(/^savent/, 'sache').replace(/^vendent/, 'vende')} ?`, both, N, {
      explanation: `${N} − ${none} = ${N - none} personnes sont dans A ∪ B. Or |A ∪ B| = |A| + |B| − |A ∩ B|, donc |A ∩ B| = ${a} + ${b} − ${N - none} = ${both}. P = ${F(both, N)}${red(both, N)}.`,
    })
  })),
)

// ── Palier 4 ────────────────────────────────────────────────────────────
// Décision avec l'intervalle de fluctuation
const p4Decide = model(
  ...[
    { t: (p: number, n: number, k: number) => `Un fabricant affirme que ${fmt(p * 100)} % de ses graines germent. Sur un échantillon de ${big(n)} graines, ${big(k)} ont germé.`, q: 'Ce résultat est-il compatible avec l’affirmation du fabricant (au seuil de 95 %) ?', pr: [60, 92] },
    { t: (p: number, n: number, k: number) => `Dans un royaume, ${fmt(p * 100)} % des habitants sont roux. Dans une ville de ce royaume, on interroge ${big(n)} habitants : ${big(k)} sont roux.`, q: 'Cet échantillon est-il représentatif de la population du royaume (au seuil de 95 %) ?', pr: [20, 40] },
    { t: (p: number, n: number, k: number) => `On lance ${big(n)} fois une pièce que l'on croit équilibrée (p = ${fmt(p)}) ; on obtient ${big(k)} fois « pile ».`, q: 'Ce résultat est-il compatible avec l’hypothèse d’une pièce équilibrée (au seuil de 95 %) ?', pr: [50, 50] },
    { t: (p: number, n: number, k: number) => `Selon le maire, ${fmt(p * 100)} % des habitants approuvent le nouveau pont. Un sondage auprès de ${big(n)} habitants en compte ${big(k)} favorables.`, q: 'Ce sondage est-il compatible avec l’affirmation du maire (au seuil de 95 %) ?', pr: [35, 75] },
  ].map((ctx) => () => retry(() => {
    const [n, s] = pick(SQRT_N.slice(1, 6)), p = randInt(ctx.pr[0], ctx.pr[1]) / 100, e = 1 / s
    const inside = Math.random() < 0.5
    const f = inside ? p + (randInt(-8, 8) / 10) * e : p + pick([-1, 1]) * (1 + randInt(2, 8) / 10) * e
    const k = Math.round(f * n), fo = k / n
    if (k <= 0 || k >= n || Math.abs(Math.abs(fo - p) - e) < 0.15 * e) return null
    const ok = Math.abs(fo - p) <= e + 1e-12
    const yes = 'Oui, la fréquence observée est dans l’intervalle', no = 'Non, la fréquence observée est hors de l’intervalle'
    return W(choice(`${ctx.t(p, n, k)} ${ctx.q}`, ok ? yes : no, [ok ? no : yes],
      `Intervalle de fluctuation : [${fmt(p)} − ${fmt(e)} ; ${fmt(p)} + ${fmt(e)}] = [${fmt(r6(p - e))} ; ${fmt(r6(p + e))}]. Fréquence observée : f = ${F(k, n)} = ${fmt(r6(fo))}. ${ok ? 'f est dans l’intervalle : le résultat est compatible.' : 'f est hors de l’intervalle : on rejette l’hypothèse, avec un risque d’erreur de 5 %.'}`),
    fluctFig(p, n, fo))
  })),
)

// Probabilité conditionnelle lue dans un tableau (« sachant que »)
const p4Cond = model(
  () => {
    const x = crossData(), t = tot(x), i = randInt(0, 1), j = randInt(0, 1)
    return W(fraction(`${x.place}, on choisit au hasard ${x.rq[i]} parmi les personnes du tableau. Quelle est la probabilité que cette personne ${x.cs[j]} ?`, x.cells[i][j], t.R[i], {
      explanation: `On ne regarde que les ${t.R[i]} personnes de la ligne « ${x.rows[i]} » ; ${x.cells[i][j]} conviennent. P = ${F(x.cells[i][j], t.R[i])}${red(x.cells[i][j], t.R[i])}.`,
    }), crossFig(x))
  },
  () => {
    const x = crossData(), t = tot(x), i = randInt(0, 1), j = randInt(0, 1)
    return W(fraction(`${x.place}, on choisit une personne au hasard ; on apprend qu'elle est dans la colonne « ${x.cols[j]} ». Quelle est alors la probabilité que ce soit ${x.rq[i]} ?`, x.cells[i][j], t.C[j], {
      explanation: `Sachant que la personne est dans la colonne « ${x.cols[j]} » (${t.C[j]} personnes), ${x.cells[i][j]} sont dans la ligne « ${x.rows[i]} ». P = ${F(x.cells[i][j], t.C[j])}${red(x.cells[i][j], t.C[j])}.`,
    }), crossFig(x))
  },
  () => {
    const x = crossData(), t = tot(x), i = randInt(0, 1), j = randInt(0, 1)
    return W(fraction(`${x.place}, A : « c'est ${x.rq[i]} », B : « la personne ${x.cq[j]} ». On note P_A(B) la probabilité de B sachant A (on ne garde que les personnes de A). Calcule P_A(B).`, x.cells[i][j], t.R[i], {
      explanation: `P_A(B) = ${F(`effectif de A ∩ B`, `effectif de A`)} = ${F(x.cells[i][j], t.R[i])}${red(x.cells[i][j], t.R[i])} (à ne pas confondre avec P(A ∩ B) = ${F(x.cells[i][j], t.N)}).`,
    }), crossFig(x))
  },
)

// Espérance : gain moyen
const p4Expect = model(
  ...[
    { t: 'Au jeu de la roue, le gain (en écus) suit la loi ci-contre', g: [0, 2, 5, 10] },
    { t: 'À la tombola du village, le gain (en écus) suit la loi ci-contre', g: [0, 1, 4, 20] },
    { t: 'Au jeu du tavernier, on perd ou on gagne des écus selon la loi ci-contre (un gain négatif est une perte)', g: [-2, 0, 3, 8] },
  ].map((ctx) => () => {
    const law = decLaw(4)
    const E = r6(sum(law.map((p, i) => p * ctx.g[i])))
    return W(numeric(`${ctx.t} : gain (probabilité) ${lawText(ctx.g, law)}. Calcule l'espérance du gain, c'est-à-dire le gain moyen par partie sur un grand nombre de parties.`, E, {
      explanation: `E = ${eTerms(ctx.g, law)} = ${fmt(E)} écu${Math.abs(E) >= 2 ? 's' : ''} (les gains nuls ne comptent pas).`,
    }), lawFig(ctx.g.map((g) => fmt(g)), law.map(fmt), 'Gain'))
  }),
)

// Trois étapes : arbre à huit issues
const p4Three = model(
  ...[
    { t: 'On lance trois fois une pièce équilibrée.', a: ['P', 'F'], w: 'P', ev: 'pile' },
    { t: 'Une famille a trois enfants ; on suppose que chaque naissance donne une fille (F) ou un garçon (G) avec la même probabilité.', a: ['F', 'G'], w: 'F', ev: 'fille' },
    { t: 'Un archer tire trois flèches ; chaque flèche est soit dans la cible (C), soit à côté (R), et on suppose les 8 issues équiprobables.', a: ['C', 'R'], w: 'C', ev: 'flèche dans la cible' },
  ].map((ctx) => () => {
    const k = pick(['exact2', 'atleast1', 'exact1', 'all'] as const)
    const cnt = (l: string[]) => l.filter((x) => x === ctx.w).length
    const test = (l: string[]) => (k === 'exact2' ? cnt(l) === 2 : k === 'exact1' ? cnt(l) === 1 : k === 'all' ? cnt(l) === 3 : cnt(l) >= 1)
    const n = k === 'exact2' || k === 'exact1' ? 3 : k === 'all' ? 1 : 7
    const q = k === 'exact2' ? `exactement deux fois « ${ctx.ev} »` : k === 'exact1' ? `exactement une fois « ${ctx.ev} »` : k === 'all' ? `trois fois « ${ctx.ev} »` : `au moins une fois « ${ctx.ev} »`
    return W(fraction(`${ctx.t} Quelle est la probabilité d'obtenir ${q} ?`, n, 8, {
      explanation: `L'arbre a 2 × 2 × 2 = 8 issues équiprobables. ${k === 'atleast1' ? `Le contraire, « aucune fois », ne compte qu'une issue : 8 − 1 = 7 issues favorables.` : `${n} issue${n > 1 ? 's' : ''} favorable${n > 1 ? 's' : ''}.`} P = ${F(n, 8)}.`,
    }), treeFig(() => ctx.a, 3, { mark: test }))
  }),
)

// ── Palier 5 ────────────────────────────────────────────────────────────
// Taille d'échantillon pour une précision donnée
const p5Size = model(
  () => {
    const [n, s] = pick(SQRT_N.slice(1)), amp = r6(2 / s)
    return numeric(`L'amplitude de l'intervalle de fluctuation [p − ${F(1, '√n')} ; p + ${F(1, '√n')}] vaut ${F(2, '√n')}. Quelle taille n d'échantillon faut-il au minimum pour que cette amplitude soit inférieure ou égale à ${fmt(amp)} ?`, n, {
      explanation: `${F(2, '√n')} ≤ ${fmt(amp)} ⇔ √n ≥ ${F(2, fmt(amp))} = ${s} ⇔ n ≥ ${s}² = ${big(n)}.`,
    })
  },
  () => {
    const [n, s] = pick(SQRT_N.slice(1)), e = r6(1 / s)
    return numeric(`Un sondeur veut que la fréquence observée soit, dans 95 % des cas, à au plus ${fmt(e)} de la proportion p de la population (c'est-à-dire ${F(1, '√n')} ≤ ${fmt(e)}). Combien de personnes doit-il interroger au minimum ?`, n, {
      explanation: `${F(1, '√n')} ≤ ${fmt(e)} ⇔ √n ≥ ${F(1, fmt(e))} = ${s} ⇔ n ≥ ${big(n)}.`,
    })
  },
  () => {
    const [n1, s1] = pick(SQRT_N.slice(1, 5)), k = pick([2, 4, 5])
    const n2 = n1 * k * k
    return numeric(`Avec des échantillons de taille ${n1}, l'amplitude de l'intervalle de fluctuation vaut ${fmt(r6(2 / s1))}. Par quel nombre faut-il multiplier la taille de l'échantillon pour diviser cette amplitude par ${k} ?`, k * k, {
      explanation: `L'amplitude ${F(2, '√n')} est divisée par ${k} quand √n est multipliée par ${k}, donc quand n est multipliée par ${k}² = ${k * k} (n = ${n2}).`,
    })
  },
)

// Jeu équitable
const p5Fair = model(
  () => retry(() => {
    const g = urnGroups(2), N = sum(g.map((x) => x.n)), w = g[0].n, mise = randInt(1, 5)
    // gain net : +G si gagné, −mise sinon ; équitable : w G = (N − w) mise
    const G = ((N - w) * mise) / w
    if (!isDec(G, 2) || G <= 0) return null
    return W(numeric(`Un forain propose : on tire une boule de l'urne ; si elle est ${g[0].color}, on gagne G écus, sinon on perd ${mise} écu${mise > 1 ? 's' : ''}. Pour quelle valeur de G le jeu est-il équitable (espérance du gain nulle) ?`, G, {
      explanation: `E = G × ${F(w, N)} − ${mise} × ${F(N - w, N)}. E = 0 ⇔ ${w}G = ${(N - w) * mise} ⇔ G = ${fmt(G)} écus.`,
    }), urnFig(g))
  }),
  () => retry(() => {
    const law = decLaw(3), gains = [0, randInt(2, 6), randInt(8, 20)]
    const E = r6(sum(law.map((p, i) => p * gains[i])))
    if (!isDec(E, 2)) return null
    return W(numeric(`À la loterie du seigneur, le ticket coûte m écus et rapporte un lot selon la loi ci-contre. Quel prix m faut-il fixer pour que le jeu soit équitable (gain moyen net nul) ?`, E, {
      explanation: `Le gain net vaut lot − m. Gain moyen : ${eTerms(gains, law)} − m = ${fmt(E)} − m. Il est nul pour m = ${fmt(E)} écus.`,
    }), lawFig(gains.map((g) => `${g} écus`), law.map(fmt), 'Lot'))
  }),
  () => retry(() => {
    const law = decLaw(4), gains = [-3, 0, 2, 0], k = 3
    const partial = r6(sum(law.slice(0, 3).map((p, i) => p * gains[i])))
    const x = r6(-partial / law[k])
    if (!isDec(x, 2) || x <= 0) return null
    return W(numeric(`Dans un jeu, la loi du gain (en écus) est donnée, mais le dernier gain x est inconnu. Pour quelle valeur de x l'espérance du gain est-elle nulle ?`, x, {
      explanation: `E = (−3) × ${fmt(law[0])} + 2 × ${fmt(law[2])} + x × ${fmt(law[3])} = ${fmt(partial)} + ${fmt(law[3])}x (le gain 0 ne compte pas). E = 0 ⇔ x = ${fmt(x)}.`,
    }), lawFig(['−3', '0', '2', 'x'], law.map(fmt), 'Gain'))
  }),
)

// Conditionnelle à partir de pourcentages (tableau de 1 000 personnes)
const p5Test = model(
  ...[
    { s: (a: number, b: number, c: number) => `Dans un troupeau, ${a} % des moutons sont malades. Un test détecte ${b} % des moutons malades, mais il est aussi positif pour ${c} % des moutons sains.`, q: 'On choisit au hasard un mouton dont le test est positif. Quelle est la probabilité qu’il soit malade ? Arrondis au centième.', A: 'Malades', B: 'Sains', y: 'Positif' },
    { s: (a: number, b: number, c: number) => `Dans un lycée, ${a} % des élèves sont internes. ${b} % des internes et ${c} % des externes déjeunent au self.`, q: 'On choisit au hasard un élève qui déjeune au self. Quelle est la probabilité qu’il soit interne ? Arrondis au centième.', A: 'Internes', B: 'Externes', y: 'Self' },
    { s: (a: number, b: number, c: number) => `${a} % des chevaliers d'un tournoi sont des étrangers. ${b} % des étrangers et ${c} % des locaux remportent au moins une joute.`, q: 'On choisit au hasard un chevalier qui a remporté une joute. Quelle est la probabilité que ce soit un étranger ? Arrondis au centième.', A: 'Étrangers', B: 'Locaux', y: 'Joute' },
  ].map((ctx) => () => retry(() => {
    const a = randInt(1, 6) * 5, b = randInt(10, 19) * 5, c = randInt(1, 6) * 5
    const N = 1000, nA = (N * a) / 100, yA = (nA * b) / 100, nB = N - nA, yB = (nB * c) / 100
    if (!Number.isInteger(yA) || !Number.isInteger(yB)) return null
    const p = yA / (yA + yB)
    return W(approx(`${ctx.s(a, b, c)} ${ctx.q}`, p, 2,
      `Sur 1 000 individus : ${nA} « ${ctx.A.toLowerCase()} », dont ${yA} « ${ctx.y.toLowerCase()} » ; ${nB} « ${ctx.B.toLowerCase()} », dont ${yB}. En tout ${yA + yB} « ${ctx.y.toLowerCase()} », dont ${yA} « ${ctx.A.toLowerCase()} » : P = ${F(yA, yA + yB)} ≈ ${fmt(rnd(p, 2))}.`),
    tableFig(['sur 1 000', ctx.y, 'Non', 'Total'], [[ctx.A, '', '', `${nA}`], [ctx.B, '', '', `${nB}`], ['Total', '', '', '1 000']], { total: true }))
  })),
)

// Deux tirages sans remise : même couleur
const p5Same = model(
  ...[2, 3].map((k) => () => retry(() => {
    const g = urnGroups(k).map((x) => ({ ...x, n: randInt(2, 5) })), N = sum(g.map((x) => x.n))
    const fav = sum(g.map((x) => x.n * (x.n - 1)))
    const tot2 = N * (N - 1)
    const diff = Math.random() < 0.4
    return W(fraction(`Une urne contient ${urnText(g)}. On tire deux boules successivement, sans remise. Quelle est la probabilité que les deux boules soient ${diff ? 'de couleurs différentes' : 'de la même couleur'} ?`, diff ? tot2 - fav : fav, tot2, {
      explanation: `Nombre de tirages (ordre compris) : ${N} × ${N - 1} = ${tot2}. Même couleur : ${g.map((x) => `${x.n} × ${x.n - 1}`).join(' + ')} = ${fav}.${diff ? ` Couleurs différentes : ${tot2} − ${fav} = ${tot2 - fav}.` : ''} P = ${F(diff ? tot2 - fav : fav, tot2)} = ${fracText(diff ? tot2 - fav : fav, tot2)}.`,
    }), urnFig(g))
  })),
)

// Espérance avec une probabilité inconnue
const p5LawE = model(
  () => retry(() => {
    const gains = [0, randInt(1, 4), randInt(5, 12)], p0 = randInt(3, 7) / 10, E = randInt(5, 40) / 10
    // p1 + p2 = 1 − p0 ; g1 p1 + g2 p2 = E
    const p2 = (E - gains[1] * (1 - p0)) / (gains[2] - gains[1]), p1 = r6(1 - p0 - p2)
    if (!isDec(p2, 2) || p2 <= 0 || p1 <= 0) return null
    return W(numeric(`Un jeu rapporte 0, ${gains[1]} ou ${gains[2]} écus. La probabilité de ne rien gagner est ${fmt(p0)} et le gain moyen (espérance) vaut ${fmt(E)} écus. Quelle est la probabilité de gagner ${gains[2]} écus ?`, r6(p2), {
      explanation: `Notons a = P(${gains[1]}) et b = P(${gains[2]}) : a + b = 1 − ${fmt(p0)} = ${fmt(r6(1 - p0))} et ${gains[1]}a + ${gains[2]}b = ${fmt(E)}. En remplaçant a = ${fmt(r6(1 - p0))} − b : ${fmt(r6(gains[1] * (1 - p0)))} + ${gains[2] - gains[1]}b = ${fmt(E)}, donc b = ${fmt(r6(p2))}.`,
    }), lawFig(gains.map((g) => `${g}`), [fmt(p0), 'a', '?'], 'Gain'))
  }),
  () => retry(() => {
    const law = decLaw(4), gains = [-1, 0, 2, 5]
    const k = randInt(0, 3)
    const E = r6(sum(law.map((p, i) => p * gains[i])))
    const shown = law.map((p, i) => (i === k ? '?' : fmt(p)))
    return W(numeric(`Voici la loi du gain d'un jeu (en écus), dont une probabilité est effacée. Complète la loi, puis calcule l'espérance du gain.`, E, {
      explanation: `Probabilité manquante : 1 − (${law.filter((_, i) => i !== k).map(fmt).join(' + ')}) = ${fmt(law[k])}. E = ${eTerms(gains, law)} = ${fmt(E)}.`,
    }), lawFig(gains.map((g) => fmt(g)), shown, 'Gain'))
  }),
  () => retry(() => {
    const law = decLaw(3), gains = [randInt(-4, -1), randInt(1, 3), randInt(4, 9)]
    const E = r6(sum(law.map((p, i) => p * gains[i])))
    const fav = E > 0
    return W(choice(`Un jeu a la loi du gain (en écus) ci-contre. Sur un grand nombre de parties, le joueur va-t-il plutôt gagner ou perdre de l'argent ?`, E > 0 ? 'Plutôt gagner (espérance positive)' : E < 0 ? 'Plutôt perdre (espérance négative)' : 'Ni l’un ni l’autre (espérance nulle)',
      ['Plutôt gagner (espérance positive)', 'Plutôt perdre (espérance négative)', 'Ni l’un ni l’autre (espérance nulle)'],
      `E = ${eTerms(gains, law)} = ${fmt(E)}. ${fav ? 'Positive : en moyenne, le joueur gagne.' : E < 0 ? 'Négative : en moyenne, le joueur perd.' : 'Nulle : le jeu est équitable.'}`),
    lawFig(gains.map((g) => fmt(g)), law.map(fmt), 'Gain'))
  }),
)

const tiers: Tiers = [
  [p1Law, p1Contrary, p1Urn, p1Sum, p1Freq],
  [p2Union, p2Tree, p2Table, p2Dice],
  [p3Fluct, p3NoReplace, p3TableUnion, p3Param, p3Inter],
  [p4Decide, p4Cond, p4Expect, p4Three],
  [p5Size, p5Fair, p5Test, p5Same, p5LawE],
]

// ═════════════════════════════════════════════════════════════════════════
// Problèmes d'amélioration
// ═════════════════════════════════════════════════════════════════════════
const upgrades: Ladder = [
  [
    // Au moins un six avec deux dés
    () => {
      const v = randInt(1, 6)
      const ev = pick([
        { t: `un ${v}`, no: `aucun ${v}`, f: (a: number) => a === v },
        { t: 'un nombre pair', no: 'aucun nombre pair', f: (a: number) => a % 2 === 0 },
        { t: 'un multiple de 3', no: 'aucun multiple de 3', f: (a: number) => a % 3 === 0 },
        ...[4, 5].map((k) => ({ t: `un nombre supérieur ou égal à ${k}`, no: `deux nombres inférieurs à ${k}`, f: (a: number) => a >= k })),
      ])
      const m = 6 - [1, 2, 3, 4, 5, 6].filter(ev.f).length, fav = 36 - m * m
      const r: [number, number][] = []
      for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) if (ev.f(a) || ev.f(b)) r.push([a - 1, b])
      return T('Au moins un…', fraction(`On lance deux dés équilibrés. Quelle est la probabilité d'obtenir au moins ${ev.t} ? (Pense à l'événement contraire.)`, fav, 36, {
        explanation: `Le contraire, « ${ev.no} », compte ${m} × ${m} = ${m * m} issues sur 36. P = 1 − ${F(m * m, 36)} = ${F(fav, 36)}${red(fav, 36)}.`,
      }), tableFig(['', '1', '2', '3', '4', '5', '6'], [1, 2, 3, 4, 5, 6].map((a) => [String(a), ...[1, 2, 3, 4, 5, 6].map((b) => (ev.f(a) || ev.f(b) ? '✓' : ''))]), { red: r, cw: 34 }))
    },
    // Réunion avec la formule, à partir d'un énoncé
    () => retry(() => {
      const N = pick([30, 32, 36, 40]), a = randInt(8, 20), b = randInt(8, 20), ab = randInt(2, 7)
      if (a + b - ab > N) return null
      const ctx = pick([
        { s: `Dans une classe de ${N} élèves, ${a} pratiquent le football, ${b} le judo et ${ab} les deux.`, q: 'ne pratique aucun des deux sports' },
        { s: `Parmi les ${N} chevaliers d’un tournoi, ${a} combattent à l’épée, ${b} à la lance et ${ab} avec les deux armes.`, q: 'ne combatte avec aucune de ces deux armes' },
      ])
      const none = N - (a + b - ab)
      return T('Ni l’un ni l’autre', fraction(`${ctx.s} On choisit une personne au hasard. Quelle est la probabilité qu'elle ${ctx.q} ?`, none, N, {
        explanation: `|A ∪ B| = ${a} + ${b} − ${ab} = ${a + b - ab}. Personne dans aucun des deux : ${N} − ${a + b - ab} = ${none}. P = ${F(none, N)}${red(none, N)}.`,
      }), tableFig(['', 'B', 'non B', 'Total'], [['A', `${ab}`, '', `${a}`], ['non A', '', '?', ''], ['Total', `${b}`, '', `${N}`]], { red: [[1, 2]], total: true }))
    }),
    // Fréquence et intervalle : le bon échantillon
    () => retry(() => {
      const [n, s] = pick(SQRT_N.slice(1, 6)), p = randInt(20, 80) / 100, e = 1 / s
      const ks = shuffle([0.5, 1.6, -1.5, -0.4].map((m) => Math.round((p + m * e) * n)))
      const good = ks.filter((k) => Math.abs(k / n - p) <= e)
      if (good.length !== 2) return null
      const g = pick(good)
      return T('Quatre échantillons', choice(`Une proportion vaut p = ${fmt(p)} dans la population. Quatre échantillons de taille ${big(n)} donnent ces nombres de « succès » : ${ks.join(' ; ')}. Lequel des nombres proposés correspond à une fréquence dans l'intervalle de fluctuation au seuil de 95 % ?`, String(g), ks.filter((k) => Math.abs(k / n - p) > e).map(String),
        `I = [${fmt(r6(p - e))} ; ${fmt(r6(p + e))}], soit entre ${fmt(r6((p - e) * n))} et ${fmt(r6((p + e) * n))} succès sur ${big(n)}. ${g} succès donnent f = ${fmt(r6(g / n))} : dans l'intervalle.`),
      fluctFig(p, n))
    }),
  ],
  [
    // Prix d'un jeu équitable
    () => retry(() => {
      const g = urnGroups(3).map((x) => ({ ...x, n: randInt(1, 6) })), N = sum(g.map((x) => x.n)), prizes = [randInt(5, 20), randInt(1, 4), 0]
      const E = sum(g.map((x, i) => x.n * prizes[i])) / N
      if (!isDec(E, 2)) return null
      return T('Le juste prix du ticket', numeric(`On tire une boule de l'urne : une boule ${g[0].color} rapporte ${prizes[0]} écus, une boule ${g[1].color} ${prizes[1]} écu${prizes[1] > 1 ? 's' : ''}, une boule ${g[2].color} rien. À quel prix faut-il vendre la partie pour que le jeu soit équitable ?`, E, {
        explanation: `Gain moyen : ${prizes[0]} × ${F(g[0].n, N)} + ${prizes[1]} × ${F(g[1].n, N)} = ${F(g[0].n * prizes[0] + g[1].n * prizes[1], N)} = ${fmt(E)} écus. Le jeu est équitable si la partie coûte ${fmt(E)} écus.`,
      }), urnFig(g))
    }),
    // Conditionnelle depuis un énoncé
    () => retry(() => {
      const N = pick([100, 120, 150, 200]), f = randInt(Math.round(N * 0.3), Math.round(N * 0.6)), s = randInt(Math.round(N * 0.3), Math.round(N * 0.6)), fs = randInt(5, Math.min(f, s) - 5)
      const gs = s - fs, g = N - f
      if (gs <= 0 || gs >= g) return null
      const ask = pick(['g', 's'] as const)
      return T('Sachant que…', fraction(ask === 'g'
        ? `Un lycée compte ${N} élèves de seconde, dont ${f} filles. ${s} élèves font du latin, dont ${fs} filles. On choisit un garçon au hasard : quelle est la probabilité qu'il fasse du latin ?`
        : `Un lycée compte ${N} élèves de seconde, dont ${f} filles. ${s} élèves font du latin, dont ${fs} filles. On choisit au hasard un élève qui fait du latin : quelle est la probabilité que ce soit un garçon ?`, gs, ask === 'g' ? g : s, {
        explanation: `Garçons : ${N} − ${f} = ${g} ; garçons latinistes : ${s} − ${fs} = ${gs}. ${ask === 'g' ? `Parmi les ${g} garçons : P = ${F(gs, g)}${red(gs, g)}.` : `Parmi les ${s} latinistes : P = ${F(gs, s)}${red(gs, s)}.`}`,
      }), tableFig(['', 'Latin', 'Pas latin', 'Total'], [['Filles', `${fs}`, '', `${f}`], ['Garçons', '?', '', ''], ['Total', `${s}`, '', `${N}`]], { red: [[1, 1]], total: true }))
    }),
    // Taille d'échantillon et précision
    () => {
      const [n, s] = pick(SQRT_N.slice(2)), e = r6(1 / s), who = pick(['Le bailli', 'La cartographe', 'L’intendant', 'La reine'])
      return T('Le sondage précis', numeric(`${who} veut estimer la proportion de paysans favorables à un nouveau moulin, avec une marge d'erreur (au seuil de 95 %) d'au plus ${fmt(e * 100)} points, c'est-à-dire ${F(1, '√n')} ≤ ${fmt(e)}. Combien de paysans faut-il interroger au minimum ?`, n, {
        explanation: `${F(1, '√n')} ≤ ${fmt(e)} ⇔ √n ≥ ${s} ⇔ n ≥ ${big(n)}.`,
      }))
    },
  ],
  [
    // Le pari du chevalier de Méré
    () => {
      const k = randInt(2, 5), face = pick(['six', 'as', 'cinq', 'deux'])
      const tot6 = 6 ** k, no6 = 5 ** k
      return T('Le pari du chevalier de Méré', approx(`Le chevalier de Méré parie qu'il obtiendra au moins un ${face} en lançant ${k} fois un dé équilibré. En dénombrant les issues (arbre à ${k} étapes : 6^${k} issues équiprobables), calcule la probabilité qu'il gagne, arrondie au millième.`, 1 - no6 / tot6, 3,
        `Issues : 6^${k} = ${tot6}. Sans aucun ${face} : 5^${k} = ${no6}. P(au moins un ${face}) = 1 − ${F(no6, tot6)} = ${F(tot6 - no6, tot6)} ≈ ${fmt(rnd(1 - no6 / tot6, 3))}.${1 - no6 / tot6 > 0.5 ? ' C’est plus d’une chance sur deux : le pari est favorable.' : ' C’est moins d’une chance sur deux : le pari est défavorable.'}`),
      treeFig(() => ['6', 'pas 6'], Math.min(k, 3), { mark: (l) => l.includes('6'), prob: (q) => (q[q.length - 1] === '6' ? '1' : '5'), caption: `Sur chaque branche : nombre de faces du dé.${k > 3 ? ' Seules les trois premières étapes sont dessinées.' : ''}` }))
    },
    // Le test du guérisseur
    () => retry(() => {
      const a = randInt(1, 4) * 2, b = randInt(17, 19) * 5, c = randInt(1, 4) * 5
      const N = 10000, nA = (N * a) / 100, yA = (nA * b) / 100, nB = N - nA, yB = (nB * c) / 100
      if (!Number.isInteger(yA) || !Number.isInteger(yB)) return null
      const p = yA / (yA + yB)
      return T('Le test du guérisseur', approx(`Une fièvre touche ${a} % des villageois. Le test du guérisseur est positif pour ${b} % des malades, mais aussi pour ${c} % des personnes saines. Un villageois a un test positif : quelle est la probabilité qu'il soit vraiment malade ? Arrondis au centième. (Imagine 10 000 villageois.)`, p, 2,
        `Sur 10 000 : ${big(nA)} malades, dont ${big(yA)} positifs ; ${big(nB)} sains, dont ${big(yB)} positifs. Parmi les ${big(yA + yB)} positifs, ${yA} sont malades : P = ${F(yA, yA + yB)} ≈ ${fmt(rnd(p, 2))}. Le test se trompe souvent quand la maladie est rare !`),
      tableFig(['sur 10 000', 'Positif', 'Négatif', 'Total'], [['Malades', '', '', big(nA)], ['Sains', '', '', big(nB)], ['Total', '', '', '10 000']], { total: true }))
    }),
    // Trois tirages sans remise
    () => {
      const names = shuffle(['Arthur', 'Bohort', 'Gauvain', 'Lancelot', 'Perceval', 'Yvain']).slice(0, 4), L = names.map((w) => w[0]), x = L[0], y = L[1]
      const ask = pick(['order', 'set'] as const)
      return T('Le tiercé du tournoi', fraction(ask === 'order'
        ? `Quatre chevaliers, ${listFr(names)}, courent une joute ; on suppose tous les classements équiprobables et sans ex æquo. Quelle est la probabilité que ${names[0]} soit premier et ${names[1]} deuxième ?`
        : `Quatre chevaliers, ${listFr(names)}, courent une joute ; on suppose tous les classements équiprobables et sans ex æquo. Quelle est la probabilité que ${names[0]} et ${names[1]} occupent les deux premières places (dans un ordre quelconque) ?`, ask === 'order' ? 2 : 4, 24, {
        explanation: `Arbre (initiales ${listFr(L)}) : 4 × 3 × 2 × 1 = 24 classements. ${ask === 'order' ? `${names[0]} premier, ${names[1]} deuxième : il reste 2 façons de classer les deux autres, soit 2 issues. P = ${F(2, 24)} = ${F(1, 12)}.` : `${names[0]} et ${names[1]} en tête (2 ordres) × 2 ordres pour les autres = 4 issues. P = ${F(4, 24)} = ${F(1, 6)}.`}`,
      }), treeFig((p) => L.filter((v) => !p.includes(v)), 2, { mark: (l) => (ask === 'order' ? l[0] === x && l[1] === y : l.includes(x) && l.includes(y)), caption: 'Seules les deux premières places sont dessinées : chaque branche se poursuit de 2 façons.' }))
    },
  ],
]

// ═════════════════════════════════════════════════════════════════════════
// Problèmes de l'hôtel de ville
// ═════════════════════════════════════════════════════════════════════════
const age: Ladder = [
  [
    // La loterie de la foire
    () => {
      const law = decLaw(4), k = randInt(1, 3), G = pick([[0, 2, 5, 10], [0, 1, 3, 8], [0, 5, 10, 50], [0, 2, 4, 20]])
      const win = r6(1 - law[0])
      const ask = pick(['miss', 'win'] as const)
      return T('La loterie de la foire', numeric(ask === 'miss'
        ? `À la foire, la roue de la fortune donne ${listFr(G.map(String))} écus. Le crieur a effacé une probabilité du panneau. Quelle est-elle ?`
        : `À la foire, la roue de la fortune donne ${listFr(G.map(String))} écus selon la loi affichée. Quelle est la probabilité de gagner quelque chose (au moins ${G[1]} écu${G[1] > 1 ? 's' : ''}) ?`, ask === 'miss' ? law[k] : win, {
        explanation: ask === 'miss'
          ? `La somme des probabilités vaut 1 : 1 − (${law.filter((_, i) => i !== k).map(fmt).join(' + ')}) = ${fmt(law[k])}.`
          : `C'est le contraire de « gagner 0 » : 1 − ${fmt(law[0])} = ${fmt(win)}.`,
      }), lawFig(G.map((g) => `${g} écu${g > 1 ? 's' : ''}`), law.map((p, i) => (ask === 'miss' && i === k ? '?' : fmt(p))), 'Gain'))
    },
    // Le sac de l'alchimiste
    () => {
      const g = urnGroups(3), N = sum(g.map((x) => x.n)), i = randInt(0, 2), add = randInt(1, 4)
      return T('Le sac de l’alchimiste', fraction(`Le sac de l'alchimiste contient ${urnText(g, 'pierre')}. Il ajoute ${add} pierre${add > 1 ? 's' : ''} ${g[i].color}${add > 1 ? 's' : ''}, puis en tire une au hasard. Quelle est la probabilité qu'elle soit ${g[i].color} ?`, g[i].n + add, N + add, {
        explanation: `Après l'ajout : ${g[i].n} + ${add} = ${g[i].n + add} pierres ${g[i].color}s sur ${N} + ${add} = ${N + add}. P = ${F(g[i].n + add, N + add)}${red(g[i].n + add, N + add)}.`,
      }), urnFig(g))
    },
    // Le sondage du bailli
    () => {
      const n = pick([200, 250, 400, 500]), k = randInt(Math.round(n * 0.3), Math.round(n * 0.7)), who = prenom()
      return T('Le sondage du bailli', numeric(`Le bailli fait interroger ${n} habitants par ${who} : ${k} souhaitent un marché le samedi. Quel est le pourcentage observé d'habitants favorables au marché du samedi ?`, r6((k / n) * 100), {
        explanation: `f = ${F(k, n)} = ${fmt(r6(k / n))}, soit ${fmt(r6((k / n) * 100))} %.`, inputHint: 'Pourcentage',
      }), tableFig(['', 'Favorables', 'Autres', 'Total'], [['Habitants', `${k}`, `${n - k}`, `${n}`]]))
    },
  ],
  [
    // La pièce truquée ?
    () => retry(() => {
      const [n, s] = pick(SQRT_N.slice(1, 6)), e = 1 / s, out = Math.random() < 0.5
      const f = 0.5 + (out ? pick([-1, 1]) * (1 + randInt(3, 9) / 10) : randInt(-7, 7) / 10) * e
      const k = Math.round(f * n), fo = k / n
      if (Math.abs(Math.abs(fo - 0.5) - e) < 0.2 * e) return null
      const ok = Math.abs(fo - 0.5) <= e
      return T('La pièce truquée ?', choice(`Le changeur soupçonne une pièce d'être truquée. Il la lance ${big(n)} fois et obtient ${big(k)} fois « pile ». Au seuil de 95 %, que peut-il conclure ?`,
        ok ? 'Rien d’anormal : le résultat est compatible avec une pièce équilibrée' : 'La pièce est probablement truquée (risque d’erreur 5 %)',
        [ok ? 'La pièce est probablement truquée (risque d’erreur 5 %)' : 'Rien d’anormal : le résultat est compatible avec une pièce équilibrée'],
        `Pour p = 0,5 et n = ${big(n)} : I = [0,5 − ${fmt(e)} ; 0,5 + ${fmt(e)}] = [${fmt(r6(0.5 - e))} ; ${fmt(r6(0.5 + e))}]. f = ${F(k, n)} = ${fmt(r6(fo))} : ${ok ? 'dans' : 'hors de'} l'intervalle.`),
      fluctFig(0.5, n, fo))
    }),
    // Le menu de l'auberge
    () => {
      const e = shuffle(['Soupe', 'Tourte', 'Salade', 'Pâté']).slice(0, randInt(2, 3)), p = shuffle(['Sanglier', 'Truite', 'Ragoût', 'Poulet', 'Canard']).slice(0, 3), d = shuffle(['Tarte', 'Fromage', 'Flan', 'Fruits']).slice(0, 2)
      const no = p[0]
      const ask = pick(['count', 'prob'] as const)
      const n = e.length * p.length * d.length
      if (ask === 'count') {
        return T('Le menu de l’auberge', numeric(`L'auberge du Cheval Blanc propose une entrée (${listFr(e.map((x) => x.toLowerCase()))}), un plat (${listFr(p.map((x) => x.toLowerCase()))}) et un dessert (${listFr(d.map((x) => x.toLowerCase()))}). Combien de menus différents peut-on composer ?`, n, {
          explanation: `Arbre à trois étapes : ${e.length} × ${p.length} × ${d.length} = ${n} menus.`,
        }), treeFig((q) => (q.length === 0 ? e : q.length === 1 ? p : d), n <= 12 ? 3 : 2, { caption: n <= 12 ? '' : `Chaque branche se poursuit avec les ${d.length} desserts (non dessinés).` }))
      }
      return T('Le menu de l’auberge', fraction(`L'auberge du Cheval Blanc propose une entrée (${listFr(e.map((x) => x.toLowerCase()))}), un plat (${listFr(p.map((x) => x.toLowerCase()))}) et un dessert (${listFr(d.map((x) => x.toLowerCase()))}). Un voyageur compose son menu au hasard. Quelle est la probabilité qu'il ne prenne pas de ${no.toLowerCase()} ?`, e.length * 2 * d.length, n, {
        explanation: `${n} menus équiprobables (${e.length} × ${p.length} × ${d.length}). Sans ${no.toLowerCase()} : ${e.length} × 2 × ${d.length} = ${e.length * 2 * d.length}. P = ${F(e.length * 2 * d.length, n)} = ${fracText(2, 3)}.`,
      }), treeFig((q) => (q.length === 0 ? e : q.length === 1 ? p : d), n <= 12 ? 3 : 2, { mark: (l) => l[1] !== no, caption: n <= 12 ? '' : `Chaque branche se poursuit avec les ${d.length} desserts (non dessinés).` }))
    },
    // Les dés du tavernier
    () => {
      const [a, b] = shuffle([5, 6, 7, 8, 9, 10]).slice(0, 2).sort((x, y) => x - y)
      const ways = (k: number) => 6 - Math.abs(7 - k)
      const best = ways(a) >= ways(b) ? a : b
      const ask = pick(['prob', 'diff'] as const)
      if (ask === 'diff' && ways(a) === ways(b)) {
        return T('Les dés du tavernier', fraction(`Le tavernier lance deux dés et parie sur une somme égale à ${a} ou à ${b}. Quelle est la probabilité qu'il gagne son pari ?`, ways(a) + ways(b), 36, {
          explanation: `Somme ${a} : ${ways(a)} cases ; somme ${b} : ${ways(b)} cases du tableau. P = ${F(ways(a) + ways(b), 36)}${red(ways(a) + ways(b), 36)}.`,
        }), diceFig('somme', (x, y) => x + y === a || x + y === b))
      }
      return T('Les dés du tavernier', fraction(ask === 'prob'
        ? `Le tavernier lance deux dés et parie sur une somme égale à ${a} ou à ${b}. Quelle est la probabilité qu'il gagne son pari ?`
        : `Deux joueurs lancent deux dés : Gaspard gagne si la somme vaut ${a}, Mahaut si elle vaut ${b}. Quelle est la probabilité de gagner du joueur le plus favorisé ?`, ask === 'prob' ? ways(a) + ways(b) : ways(best), 36, {
        explanation: ask === 'prob'
          ? `Dans le tableau des sommes : ${ways(a)} cases donnent ${a} et ${ways(b)} donnent ${b}. P = ${F(ways(a) + ways(b), 36)}${red(ways(a) + ways(b), 36)}.`
          : `Somme ${a} : ${ways(a)} cases ; somme ${b} : ${ways(b)} cases. Le plus favorisé a ${F(ways(best), 36)}${red(ways(best), 36)}.`,
      }), diceFig('somme'))
    },
  ],
  [
    // Le jeu du seigneur
    () => retry(() => {
      const g = urnGroups(3).map((x) => ({ ...x, n: randInt(1, 6) })), N = sum(g.map((x) => x.n)), mise = randInt(3, 6), prizes = [randInt(8, 15), randInt(2, 5), 0]
      const E = (g[0].n * prizes[0] + g[1].n * prizes[1]) / N - mise
      if (!isDec(E, 2) || Math.abs(E) < 0.05) return null
      return T('Le jeu du seigneur', numeric(`Pour ${mise} écus, le seigneur propose de tirer une boule de son urne : une boule ${g[0].color} rapporte ${prizes[0]} écus, une boule ${g[1].color} ${prizes[1]} écus, une boule ${g[2].color} rien. Quel est le gain net moyen (espérance, mise déduite) d'un joueur ? Le jeu est-il favorable au joueur ?`, r6(E), {
        explanation: `Gain net : ${fmt(prizes[0] - mise)}, ${fmt(prizes[1] - mise)} ou −${mise} écus, avec les probabilités ${F(g[0].n, N)}, ${F(g[1].n, N)}, ${F(g[2].n, N)}. E = ${F(g[0].n * prizes[0] + g[1].n * prizes[1], N)} − ${mise} = ${fmt(r6(E))}. ${E > 0 ? 'Positif : favorable au joueur.' : 'Négatif : défavorable au joueur (favorable au seigneur).'}`,
      }), urnFig(g))
    }),
    // La fièvre du royaume (conditionnelle)
    () => retry(() => {
      const a = randInt(2, 8) * 5, b = randInt(14, 18) * 5, c = randInt(2, 6) * 5
      const N = 1000, nA = (N * a) / 100, yA = (nA * b) / 100, nB = N - nA, yB = (nB * c) / 100
      if (!Number.isInteger(yA) || !Number.isInteger(yB)) return null
      const p = yA / (yA + yB)
      return T('La potion de vigueur', approx(`${a} % des soldats ont bu la potion de vigueur. ${b} % de ceux qui l'ont bue et ${c} % des autres ont gagné l'épreuve de force. On choisit au hasard un gagnant : quelle est la probabilité qu'il ait bu la potion ? Arrondis au centième.`, p, 2,
        `Sur 1 000 soldats : ${nA} ont bu la potion, dont ${yA} gagnants ; ${nB} ne l'ont pas bue, dont ${yB} gagnants. Parmi les ${yA + yB} gagnants : P = ${F(yA, yA + yB)} ≈ ${fmt(rnd(p, 2))}.`),
      tableFig(['sur 1 000', 'Gagnants', 'Perdants', 'Total'], [['Potion', '', '', `${nA}`], ['Sans potion', '', '', `${nB}`], ['Total', '', '', '1 000']], { total: true }))
    }),
    // Le pari du chevalier de Méré (deux dés, 24 lancers comparés à un dé, 4 lancers)
    () => {
      const k = randInt(2, 4), v = randInt(1, 6), tot2 = 36 ** k, none = 35 ** k
      const nm = v === 6 ? 'double six' : v === 1 ? 'double as' : `double ${['', '', 'deux', 'trois', 'quatre', 'cinq'][v]}`
      return T('Le double six', approx(`Au tripot, on lance ${k} fois une paire de dés. Il y a 36^${k} = ${big(tot2)} issues équiprobables, dont 35^${k} = ${big(none)} sans aucun ${nm}. Quelle est la probabilité d'obtenir au moins un ${nm} ? Arrondis au millième.`, 1 - none / tot2, 3,
        `P = 1 − ${F(big(none), big(tot2))} ≈ ${fmt(rnd(1 - none / tot2, 3))}. À chaque lancer, une seule case sur 36 du tableau donne un ${nm}.`),
      diceFig('somme', (x, y) => x === v && y === v))
    },
  ],
]

export const CONTENT: SubjectContent | null = { tiers, upgrades, age }
