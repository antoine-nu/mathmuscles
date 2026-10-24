// Statistiques à deux variables (2nde) : tableaux croisés d'effectifs, fréquences marginales et conditionnelles,
// comparaison de sous-populations, lecture de tableaux à double entrée, nuages de points et tendances simples.
// Les tableaux et les nuages sont dessinés (figures) à partir des données tirées.
import {
  choice, fmt, fracText, fraction, fresh, numeric, pair, par, parseNumber, pick, randInt, shuffle, variants, withMeta,
  type Exercise, type Ladder, type Maker, type SubjectContent, type Tiers,
} from '../utils'
import { graphFigure, type Figure, type GraphWindow } from '../figure'
import { prenom } from '../contexts'

// ── Aides locales ───────────────────────────────────────────────────────
const RED = '#b8362f'
const GOLD = '#d9a441'
const BLUE = '#5b8fc7'

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
const isDec = (v: number, d = 1) => Math.abs(Math.round(v * 10 ** d) - v * 10 ** d) < 1e-6
/** Pourcentage exact ou arrondi au dixième, écrit avec « = » ou « ≈ ». */
const pctText = (v: number) => `${isDec(v, 1) ? '=' : '≈'} ${fmt(rnd(v, 1))} %`
/** « de filles », « d’archers ». */
const deN = (w: string) => (/^[aeiouyéèêâîh]/i.test(w) ? `d’${w}` : `de ${w}`)
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
/** « 35/55 = 7/11 » (la forme réduite n'est ajoutée que si elle diffère). */
const fr = (a: number, b: number) => (fracText(a, b) === `${a}/${b}` ? `${a}/${b}` : `${a}/${b} = ${fracText(a, b)}`)
/** « = 20 % » ou « ≈ 66,67 % ». */
const pv = (v: number) => `${isDec(v, 2) ? '=' : '≈'} ${fmt(rnd(v, 2))} %`

/** Réponse arrondie : on accepte toute valeur à moins de 0,6 unité du dernier rang demandé. */
function approx(prompt: string, exact: number, d: number, explanation: string, hint?: string): Exercise {
  const shown = rnd(exact, d)
  const base = numeric(prompt, shown, {
    explanation,
    inputHint: hint ?? (d === 0 ? 'Valeur arrondie à l’unité' : d === 1 ? 'Arrondi au dixième' : 'Arrondi au centième'),
  })
  return {
    ...base,
    check: (v) => {
      const x = parseNumber(v.replace('%', ''))
      return !Number.isNaN(x) && Math.abs(x - exact) <= 0.6 * 10 ** -d + 1e-9
    },
    isValid: (v) => !Number.isNaN(parseNumber(v.replace('%', ''))),
  }
}
/** Pourcentage arrondi au dixième (le signe % est toléré dans la saisie). */
const pct = (prompt: string, exact: number, explanation: string) => approx(prompt, exact, 1, explanation, 'Pourcentage, ex. 37,5')
/** Pourcentage exact (au plus deux décimales), le signe % est toléré. */
const pctx = (prompt: string, exact: number, o: { explanation: string; inputHint?: string }) => approx(prompt, exact, 2, o.explanation, 'Pourcentage')

// ── Tableau dessiné ─────────────────────────────────────────────────────
/**
 * Tableau à double entrée : `head` = en-têtes de colonnes (case de coin comprise), `rows` = lignes (en-tête de ligne
 * en première case). Les cases de `red` (indices [ligne, colonne] dans rows) sont surlignées.
 */
function tableFig(head: string[], rows: string[][], o: { red?: [number, number][]; total?: boolean } = {}): Figure {
  const nc = head.length, nr = rows.length + 1
  const widths = head.map((_, j) => Math.max(42, ...[head[j], ...rows.map((r) => r[j])].map((t) => 8.2 * [...t].length + 16)))
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

// ── Contextes de tableaux croisés ───────────────────────────────────────
interface Cat { lab: string; pl: string }
interface ColCat { lab: string; q: string }
interface Ctx { pop: string; one: string; place: string; rows: Cat[]; cols: ColCat[] }
const CTX2x2: Ctx[] = [
  { pop: 'élèves', one: 'un élève', place: 'Dans un lycée', rows: [{ lab: 'Filles', pl: 'filles' }, { lab: 'Garçons', pl: 'garçons' }], cols: [{ lab: 'Sport', q: 'font du sport' }, { lab: 'Pas de sport', q: 'ne font pas de sport' }] },
  { pop: 'élèves', one: 'un élève', place: 'Dans un collège', rows: [{ lab: 'Filles', pl: 'filles' }, { lab: 'Garçons', pl: 'garçons' }], cols: [{ lab: 'Cantine', q: 'mangent à la cantine' }, { lab: 'Externes', q: 'ne mangent pas à la cantine' }] },
  { pop: 'villageois', one: 'un villageois', place: 'Dans un village', rows: [{ lab: 'Adultes', pl: 'adultes' }, { lab: 'Enfants', pl: 'enfants' }], cols: [{ lab: 'Malades', q: 'ont été malades cet hiver' }, { lab: 'Sains', q: 'n’ont pas été malades cet hiver' }] },
  { pop: 'votants', one: 'un votant', place: 'Lors d’un vote au bourg', rows: [{ lab: 'Ville', pl: 'votants de la ville' }, { lab: 'Campagne', pl: 'votants de la campagne' }], cols: [{ lab: 'Pour', q: 'ont voté pour le nouveau pont' }, { lab: 'Contre', q: 'ont voté contre le nouveau pont' }] },
  { pop: 'chevaliers', one: 'un chevalier', place: 'Au tournoi', rows: [{ lab: 'Locaux', pl: 'chevaliers locaux' }, { lab: 'Étrangers', pl: 'chevaliers étrangers' }], cols: [{ lab: 'Victoire', q: 'ont gagné au moins une joute' }, { lab: 'Défaite', q: 'n’ont gagné aucune joute' }] },
]
const CTX3: Ctx[] = [
  { pop: 'soldats', one: 'un soldat', place: 'Dans l’armée du comte', rows: [{ lab: 'Archers', pl: 'archers' }, { lab: 'Fantassins', pl: 'fantassins' }, { lab: 'Cavaliers', pl: 'cavaliers' }], cols: [{ lab: 'Vétérans', q: 'sont des vétérans' }, { lab: 'Recrues', q: 'sont des recrues' }] },
  { pop: 'clients', one: 'un client', place: 'À la boulangerie', rows: [{ lab: 'Matin', pl: 'clients du matin' }, { lab: 'Soir', pl: 'clients du soir' }], cols: [{ lab: 'Pain', q: 'achètent du pain' }, { lab: 'Gâteau', q: 'achètent un gâteau' }, { lab: 'Brioche', q: 'achètent une brioche' }] },
  { pop: 'spectateurs', one: 'un spectateur', place: 'À la fête du village', rows: [{ lab: 'Habitants', pl: 'habitants' }, { lab: 'Touristes', pl: 'touristes' }], cols: [{ lab: 'Concert', q: 'ont choisi le concert' }, { lab: 'Théâtre', q: 'ont choisi le théâtre' }, { lab: 'Cirque', q: 'ont choisi le cirque' }] },
  { pop: 'élèves', one: 'un élève', place: 'En seconde', rows: [{ lab: 'Filles', pl: 'filles' }, { lab: 'Garçons', pl: 'garçons' }], cols: [{ lab: 'Bus', q: 'viennent en bus' }, { lab: 'Vélo', q: 'viennent à vélo' }, { lab: 'À pied', q: 'viennent à pied' }] },
]
const anyCtx = () => (Math.random() < 0.6 ? pick(CTX2x2) : pick(CTX3))

/** Effectifs d'un tableau croisé (cases entre lo et hi), de total N éventuellement imposé. */
function crossData(nr: number, nc: number, lo: number, hi: number, N?: number): number[][] {
  return retry(() => {
    const cells = Array.from({ length: nr }, () => Array.from({ length: nc }, () => randInt(lo, hi)))
    if (N !== undefined) {
      const rest = N - sum(cells.flat()) + cells[nr - 1][nc - 1]
      if (rest < lo || rest > hi) return null
      cells[nr - 1][nc - 1] = rest
    }
    return cells
  })
}
interface Cross { c: Ctx; cells: number[][]; R: number[]; C: number[]; N: number }
function cross(c: Ctx, lo: number, hi: number, N?: number): Cross {
  const cells = crossData(c.rows.length, c.cols.length, lo, hi, N)
  const R = cells.map(sum), C = c.cols.map((_, j) => sum(cells.map((r) => r[j])))
  return { c, cells, R, C, N: sum(R) }
}
/** Figure du tableau, avec ou sans marges (totaux), cases masquées ou surlignées. */
function crossFig(x: Cross, o: { totals?: boolean; hide?: [number, number][]; red?: [number, number][]; blank?: [number, number][] } = {}): Figure {
  const tot = o.totals ?? true
  const nr = x.c.rows.length, nc = x.c.cols.length
  const hidden = (i: number, j: number) => o.hide?.some(([a, b]) => a === i && b === j)
  const val = (i: number, j: number) => {
    const v = i < nr ? (j < nc ? x.cells[i][j] : x.R[i]) : j < nc ? x.C[j] : x.N
    if (o.blank?.some(([a, b]) => a === i && b === j)) return ''
    return hidden(i, j) ? '?' : fmt(v)
  }
  const head = ['', ...x.c.cols.map((c) => c.lab), ...(tot ? ['Total'] : [])]
  const rows: string[][] = []
  for (let i = 0; i < nr + (tot ? 1 : 0); i++) {
    rows.push([i < nr ? x.c.rows[i].lab : 'Total', ...Array.from({ length: nc + (tot ? 1 : 0) }, (_, j) => val(i, j))])
  }
  const red = [...(o.hide ?? []), ...(o.red ?? [])].map(([i, j]) => [i, j + 1] as [number, number])
  return tableFig(head, rows, { red, total: tot })
}
const intro = (x: Cross) => `${x.c.place}, on a interrogé ${x.N} ${x.c.pop}. Le tableau donne la répartition des réponses.`

// ── Nuages de points ────────────────────────────────────────────────────
interface Scat {
  /** Phrase qui dit ce que représentent x et y. */
  desc: string; sign: number; names: [string, string]; win: GraphWindow
  /** Génère x (sur la grille) et y selon la tendance. */
  gen: (trend: number) => [number, number][]
  trendText: [string, string]
}
const gridPts = (n: number, xr: number[], f: (x: number) => number, yStep: number, yMin: number, yMax: number, exact = false): [number, number][] => {
  const xsUsed = shuffle(xr).slice(0, exact ? n : n + randInt(-2, 1)).sort((a, b) => a - b)
  return xsUsed.map((x) => [x, Math.min(yMax, Math.max(yMin + yStep, Math.round(f(x) / yStep) * yStep))])
}
const range = (a: number, b: number, s = 1) => Array.from({ length: Math.floor((b - a) / s) + 1 }, (_, i) => r6(a + i * s))
const SCATS: Scat[] = [
  {
    desc: 'x désigne la température maximale du jour (en °C) et y le nombre de glaces vendues ce jour-là', sign: 1, names: ['°C', 'glaces'],
    win: { xMin: 14, xMax: 34, yMin: 0, yMax: 200, step: 2, labelStep: 4, ystep: 20, ylabelStep: 40 },
    gen: (t) => gridPts(9, range(14, 34, 2), (x) => (t > 0 ? 8 * (x - 14) + 30 : t < 0 ? 180 - 7 * (x - 14) : 100) + randInt(-2, 2) * 20, 20, 0, 200),
    trendText: ['plus il fait chaud, plus on vend de glaces', 'plus il fait chaud, moins on vend de glaces'],
  },
  {
    desc: 'x désigne le temps de révision d’un élève (en heures) et y sa note (sur 20)', sign: 1, names: ['h', 'note'],
    win: { xMin: 0, xMax: 10, yMin: 0, yMax: 20, step: 1, labelStep: 2, ystep: 2, ylabelStep: 4 },
    gen: (t) => gridPts(8, range(0, 10), (x) => (t > 0 ? 4 + 1.4 * x : t < 0 ? 18 - 1.3 * x : 11) + randInt(-2, 2) * 2, 2, 0, 20),
    trendText: ['plus on révise, meilleure est la note', 'plus on révise, moins bonne est la note'],
  },
  {
    desc: 'x désigne l’âge d’une charrette (en années) et y son prix de revente (en écus)', sign: -1, names: ['ans', 'écus'],
    win: { xMin: 0, xMax: 12, yMin: 0, yMax: 100, step: 1, labelStep: 2, ystep: 10, ylabelStep: 20 },
    gen: (t) => gridPts(8, range(0, 12), (x) => (t < 0 ? 95 - 7 * x : t > 0 ? 15 + 6 * x : 50) + randInt(-1, 1) * 10, 10, 0, 100),
    trendText: ['plus la charrette est vieille, plus elle se revend cher', 'plus la charrette est vieille, moins elle se revend cher'],
  },
  {
    desc: 'x désigne la taille d’un apprenti (en cm) et y sa masse (en kg)', sign: 1, names: ['cm', 'kg'],
    win: { xMin: 140, xMax: 190, yMin: 30, yMax: 90, step: 5, labelStep: 10, ystep: 5, ylabelStep: 10 },
    gen: (t) => gridPts(9, range(140, 190, 5), (x) => (t > 0 ? 35 + 0.9 * (x - 140) : t < 0 ? 85 - 0.9 * (x - 140) : 60) + randInt(-1, 1) * 5, 5, 30, 90),
    trendText: ['plus un apprenti est grand, plus il est lourd', 'plus un apprenti est grand, moins il est lourd'],
  },
  {
    desc: 'x désigne l’altitude d’un village (en centaines de mètres) et y sa température moyenne (en °C)', sign: -1, names: ['alt.', '°C'],
    win: { xMin: 0, xMax: 20, yMin: 0, yMax: 20, step: 2, labelStep: 4, ystep: 2, ylabelStep: 4 },
    gen: (t) => gridPts(9, range(0, 20, 2), (x) => (t < 0 ? 18 - 0.75 * x : t > 0 ? 4 + 0.7 * x : 10) + randInt(-1, 1) * 2, 2, 0, 20),
    trendText: ['plus on monte, plus il fait chaud', 'plus on monte, plus il fait froid'],
  },
]
/** Deux grandeurs sans lien : nuage sans tendance. */
const NO_TREND: Scat = {
  desc: 'x désigne la pointure d’un élève et y sa note de mathématiques (sur 20)', sign: 0, names: ['pointure', 'note'],
  win: { xMin: 34, xMax: 46, yMin: 0, yMax: 20, step: 1, labelStep: 2, ystep: 2, ylabelStep: 4 },
  gen: () => gridPts(9, range(34, 46), () => randInt(2, 9) * 2, 2, 0, 20),
  trendText: ['', ''],
}
/** Nuage de points dessiné dans un repère gradué ; `mark` = indices des points à nommer. */
function scatterFig(s: Scat, pts: [number, number][], o: { mark?: Record<number, string>; line?: [number, number]; extra?: [string, number, number][]; color?: Record<number, string> } = {}) {
  const g = graphFigure(s.win)
  g.figure.axes!.names = s.names
  pts.forEach(([x, y], i) => g.point(`p${i}`, x, y, o.mark?.[i] ?? '', 'ne'))
  if (o.line) g.plot((x) => o.line![0] * x + o.line![1], { color: BLUE })
  for (const [n, x, y] of o.extra ?? []) g.point(n, x, y, n, 'ne')
  // marge à gauche pour les nombres de l'axe des ordonnées (graphFigure les colle au bord)
  const f = g.figure, ax = f.axes!
  const longest = Math.max(...[s.win.yMin, s.win.yMax].map((v) => fmt(v).length))
  const dx = 6 * longest + 2
  ax.ox += dx
  for (const p of Object.values(f.points)) p.x += dx
  f.curves = f.curves?.map((c) => ({ ...c, pts: c.pts.map(([x, y]) => [x + dx, y] as [number, number]) }))
  f.notes = f.notes?.map((n) => ({ ...n, x: n.x + dx }))
  f.w = (f.w ?? 320) + dx
  return f
}

// ═════════════════════════════════════════════════════════════════════════
// Entraînement
// ═════════════════════════════════════════════════════════════════════════

// ── Palier 1 ────────────────────────────────────────────────────────────
// Compléter un tableau croisé (une case manquante)
const b1Complete = model(
  () => {
    const x = cross(pick(CTX2x2), 8, 60), i = randInt(0, 1), j = randInt(0, 1)
    return W(numeric(`${intro(x)} Quel est l'effectif manquant dans la case surlignée ?`, x.cells[i][j], {
      explanation: `Dans la ligne « ${x.c.rows[i].lab} », le total vaut ${x.R[i]} : ${x.R[i]} − ${x.cells[i][1 - j]} = ${x.cells[i][j]}.`,
    }), crossFig(x, { hide: [[i, j]] }))
  },
  () => {
    const x = cross(pick(CTX2x2), 8, 60), j = randInt(0, 1)
    return W(numeric(`${intro(x)} Le total d'une colonne a été effacé. Retrouve-le.`, x.C[j], {
      explanation: `On additionne la colonne « ${x.c.cols[j].lab} » : ${x.cells.map((r) => r[j]).join(' + ')} = ${x.C[j]}.`,
    }), crossFig(x, { hide: [[x.c.rows.length, j]] }))
  },
  () => {
    const x = cross(pick(CTX3), 5, 45), i = randInt(0, x.c.rows.length - 1), j = randInt(0, x.c.cols.length - 1)
    const others = x.cells[i].filter((_, k) => k !== j)
    return W(numeric(`${intro(x)} Combien ${deN(x.c.rows[i].pl)} ${x.c.cols[j].q} ? (case effacée)`, x.cells[i][j], {
      explanation: `Ligne « ${x.c.rows[i].lab} » : ${x.R[i]} − ${others.join(' − ')} = ${x.cells[i][j]}.`,
    }), crossFig(x, { hide: [[i, j]] }))
  },
  () => {
    const x = cross(pick(CTX2x2), 8, 60)
    return W(numeric(`${intro(x)} Le total général a été effacé, ainsi que les totaux des lignes. Combien ${deN(x.c.pop)} ont été interrogés ?`, x.N, {
      explanation: `On additionne les totaux des colonnes : ${x.C.join(' + ')} = ${x.N}.`,
    }), crossFig(x, { hide: [[0, 2], [1, 2], [2, 2]] }))
  },
)

// Effectifs marginaux à partir d'un tableau sans totaux
const b1Margin = model(
  () => {
    const c = anyCtx(), x = cross(c, 5, 50), i = randInt(0, c.rows.length - 1)
    return W(numeric(`${c.place}, on a classé des ${c.pop} selon deux critères (tableau). Combien y a-t-il ${deN(c.rows[i].pl)} en tout ?`, x.R[i], {
      explanation: `On additionne la ligne « ${c.rows[i].lab} » : ${x.cells[i].join(' + ')} = ${x.R[i]}.`,
    }), crossFig(x, { totals: false }))
  },
  () => {
    const c = anyCtx(), x = cross(c, 5, 50), j = randInt(0, c.cols.length - 1)
    return W(numeric(`${c.place}, on a classé des ${c.pop} selon deux critères (tableau). Combien ${deN(c.pop)} ${c.cols[j].q} en tout ?`, x.C[j], {
      explanation: `On additionne la colonne « ${c.cols[j].lab} » : ${x.cells.map((r) => r[j]).join(' + ')} = ${x.C[j]}.`,
    }), crossFig(x, { totals: false }))
  },
  () => {
    const c = anyCtx(), x = cross(c, 5, 40)
    return W(numeric(`D'après ce tableau à double entrée (${c.place.charAt(0).toLowerCase() + c.place.slice(1)}), combien ${deN(c.pop)} ont été interrogés au total ?`, x.N, {
      explanation: `On additionne toutes les cases : ${x.cells.flat().join(' + ')} = ${x.N}.`,
    }), crossFig(x, { totals: false }))
  },
  () => {
    const c = anyCtx(), x = cross(c, 5, 50), j = randInt(0, c.cols.length - 1)
    const no = x.N - x.C[j]
    return W(numeric(`${c.place}, voici la répartition de ${x.N} ${c.pop}. Combien ${deN(c.pop)} ne sont pas dans la colonne « ${c.cols[j].lab} » ?`, no, {
      explanation: `Colonne « ${c.cols[j].lab} » : ${x.C[j]}. Les autres : ${x.N} − ${x.C[j]} = ${no}.`,
    }), crossFig(x, { totals: false }))
  },
)

const CLEAN_N = [50, 100, 200, 250, 400, 500]
// Fréquence d'une catégorie dans la population totale
const b1Freq = model(
  () => {
    const c = anyCtx(), N = pick(CLEAN_N), x = cross(c, Math.round(N / 12), Math.round(N / 3.2), N), i = randInt(0, c.rows.length - 1)
    const f = (x.R[i] / N) * 100
    return W(pctx(`${intro(x)} Quel pourcentage des ${c.pop} interrogés sont des ${c.rows[i].pl} ?`, f, {
      explanation: `Il y a ${x.R[i]} ${c.rows[i].pl} sur ${N} : ${x.R[i]} ÷ ${N} = ${fmt(x.R[i] / N)}, soit ${fmt(f)} %.`,
      inputHint: 'Pourcentage',
    }), crossFig(x))
  },
  () => {
    const c = anyCtx(), N = pick([50, 100, 200, 250, 500]), x = cross(c, Math.round(N / 12), Math.round(N / 3.2), N), j = randInt(0, c.cols.length - 1)
    const f = x.C[j] / N
    return W(numeric(`${intro(x)} Quelle est la fréquence (en écriture décimale) des ${c.pop} qui ${c.cols[j].q} ?`, f, {
      explanation: `Fréquence = effectif ÷ effectif total = ${x.C[j]} ÷ ${N} = ${fmt(f)}.`,
    }), crossFig(x))
  },
  () => {
    const c = anyCtx(), x = cross(c, 4, 30), i = randInt(0, c.rows.length - 1)
    return W(fraction(`${intro(x)} Quelle proportion des ${c.pop} sont des ${c.rows[i].pl} ? Donne une fraction.`, x.R[i], x.N, {
      explanation: `${x.R[i]} ${c.rows[i].pl} sur ${x.N} ${c.pop} : ${fr(x.R[i], x.N)}.`,
    }), crossFig(x))
  },
  () => {
    const c = anyCtx(), N = pick(CLEAN_N), x = cross(c, Math.round(N / 12), Math.round(N / 3.2), N), j = randInt(0, c.cols.length - 1)
    const f = (x.C[j] / N) * 100
    return W(pctx(`${intro(x)} Quel pourcentage des ${c.pop} ${c.cols[j].q} ?`, f, {
      explanation: `${x.C[j]} sur ${N} : ${x.C[j]} ÷ ${N} × 100 = ${fmt(f)} %.`,
      inputHint: 'Pourcentage',
    }), crossFig(x))
  },
)

// Fréquence d'une case (intersection) parmi tous
const b1Cell = model(
  () => {
    const c = anyCtx(), N = pick(CLEAN_N), x = cross(c, Math.round(N / 14), Math.round(N / 3.5), N)
    const i = randInt(0, c.rows.length - 1), j = randInt(0, c.cols.length - 1), f = (x.cells[i][j] / N) * 100
    return W(pctx(`${intro(x)} Quel pourcentage de l'ensemble des ${c.pop} sont des ${c.rows[i].pl} qui ${c.cols[j].q} ?`, f, {
      explanation: `On lit la case « ${c.rows[i].lab} / ${c.cols[j].lab} » : ${x.cells[i][j]}, sur un total de ${N}. ${x.cells[i][j]} ÷ ${N} × 100 = ${fmt(f)} %.`,
      inputHint: 'Pourcentage',
    }), crossFig(x, { red: [[i, j]] }))
  },
  () => {
    const c = anyCtx(), x = cross(c, 4, 30)
    const i = randInt(0, c.rows.length - 1), j = randInt(0, c.cols.length - 1)
    return W(fraction(`${intro(x)} On choisit au hasard une fiche parmi celles des ${x.N} ${c.pop}. Quelle est la fréquence des ${c.rows[i].pl} qui ${c.cols[j].q} ? Donne une fraction.`, x.cells[i][j], x.N, {
      explanation: `Case « ${c.rows[i].lab} / ${c.cols[j].lab} » : ${x.cells[i][j]} sur ${x.N}, soit ${fr(x.cells[i][j], x.N)}.`,
    }), crossFig(x))
  },
  () => {
    const c = anyCtx(), N = pick([50, 100, 200, 250, 500]), x = cross(c, Math.round(N / 14), Math.round(N / 3.5), N)
    const i = randInt(0, c.rows.length - 1), j = randInt(0, c.cols.length - 1), f = x.cells[i][j] / N
    return W(numeric(`${intro(x)} Donne, en écriture décimale, la fréquence des ${c.rows[i].pl} qui ${c.cols[j].q} parmi tous les ${c.pop}.`, f, {
      explanation: `${x.cells[i][j]} ÷ ${N} = ${fmt(f)}.`,
    }), crossFig(x))
  },
)

// Données en phrases → tableau → un effectif
const b1Sentences = model(
  ...CTX2x2.slice(0, 4).map((c) => () => {
    const x = cross(c, 6, 60)
    const [a, b] = [x.R[0], x.C[0]]
    const ask = pick([[1, 1], [1, 0], [0, 1]] as [number, number][])
    const v = x.cells[ask[0]][ask[1]]
    return W(numeric(`${c.place}, on compte ${x.N} ${c.pop} : ${a} ${c.rows[0].pl} et ${x.R[1]} ${c.rows[1].pl}. ${b} ${c.pop} ${c.cols[0].q}, dont ${x.cells[0][0]} ${c.rows[0].pl}. Combien ${deN(c.rows[ask[0]].pl)} ${c.cols[ask[1]].q} ?`, v, {
      explanation: `On remplit le tableau : ${c.rows[0].pl} / ${c.cols[0].lab} = ${x.cells[0][0]} ; ${c.rows[0].pl} / ${c.cols[1].lab} = ${a} − ${x.cells[0][0]} = ${x.cells[0][1]} ; ${c.rows[1].pl} / ${c.cols[0].lab} = ${b} − ${x.cells[0][0]} = ${x.cells[1][0]} ; ${c.rows[1].pl} / ${c.cols[1].lab} = ${x.R[1]} − ${x.cells[1][0]} = ${x.cells[1][1]}.`,
    }), crossFig(x, { hide: [ask], blank: ([[0, 1], [1, 0], [1, 1], [2, 1]] as [number, number][]).filter(([i, j]) => i !== ask[0] || j !== ask[1]) }))
  }),
)

// ── Palier 2 ────────────────────────────────────────────────────────────
// Fréquence conditionnelle (sachant la ligne)
const b2CondRow = model(
  () => {
    const c = anyCtx(), x = cross(c, 6, 60), i = randInt(0, c.rows.length - 1), j = randInt(0, c.cols.length - 1)
    const f = (x.cells[i][j] / x.R[i]) * 100
    return W(pct(`${intro(x)} Parmi les ${c.rows[i].pl}, quel pourcentage ${c.cols[j].q} ? Arrondis à 0,1 % si nécessaire.`, f,
      `On se restreint à la ligne « ${c.rows[i].lab} » (${x.R[i]} ${c.pop}) : ${x.cells[i][j]} ÷ ${x.R[i]} × 100 ${pctText(f)}.`), crossFig(x))
  },
  () => {
    const c = anyCtx(), x = cross(c, 6, 60), i = randInt(0, c.rows.length - 1), j = randInt(0, c.cols.length - 1)
    return W(fraction(`${intro(x)} Quelle est la fréquence des ${c.pop} qui ${c.cols[j].q} parmi les ${c.rows[i].pl} ? Donne une fraction.`, x.cells[i][j], x.R[i], {
      explanation: `Fréquence conditionnelle : on divise par l'effectif de la ligne « ${c.rows[i].lab} », pas par le total : ${fr(x.cells[i][j], x.R[i])}.`,
    }), crossFig(x))
  },
  () => {
    const c = anyCtx(), x = cross(c, 6, 60), i = randInt(0, c.rows.length - 1), j = randInt(0, c.cols.length - 1)
    const f = (x.cells[i][j] / x.R[i]) * 100
    return W(pct(`${intro(x)} ${cap(c.place)}, quelle part des ${c.rows[i].pl} ${c.cols[j].q} (en %, arrondi à 0,1 %) ?`, f,
      `Part des ${c.rows[i].pl} : ${x.cells[i][j]} sur ${x.R[i]}, soit ${x.cells[i][j]} ÷ ${x.R[i]} × 100 ${pctText(f)}.`), crossFig(x, { totals: false }))
  },
)

// Fréquence conditionnelle (sachant la colonne)
const b2CondCol = model(
  () => {
    const c = anyCtx(), x = cross(c, 6, 60), i = randInt(0, c.rows.length - 1), j = randInt(0, c.cols.length - 1)
    const f = (x.cells[i][j] / x.C[j]) * 100
    return W(pct(`${intro(x)} Parmi les ${c.pop} qui ${c.cols[j].q}, quel pourcentage sont des ${c.rows[i].pl} ? Arrondis à 0,1 %.`, f,
      `On se restreint à la colonne « ${c.cols[j].lab} » (${x.C[j]} ${c.pop}) : ${x.cells[i][j]} ÷ ${x.C[j]} × 100 ${pctText(f)}.`), crossFig(x))
  },
  () => {
    const c = anyCtx(), x = cross(c, 6, 60), i = randInt(0, c.rows.length - 1), j = randInt(0, c.cols.length - 1)
    return W(fraction(`${intro(x)} Quelle est la proportion ${deN(c.rows[i].pl)} parmi les ${c.pop} qui ${c.cols[j].q} ? Donne une fraction.`, x.cells[i][j], x.C[j], {
      explanation: `On se restreint à la colonne « ${c.cols[j].lab} » : ${x.cells[i][j]} ${c.rows[i].pl} sur ${x.C[j]}, soit ${fr(x.cells[i][j], x.C[j])}.`,
    }), crossFig(x))
  },
  () => {
    const c = anyCtx(), x = cross(c, 6, 60), i = randInt(0, c.rows.length - 1), j = randInt(0, c.cols.length - 1)
    const f = (x.cells[i][j] / x.C[j]) * 100
    return W(pct(`${intro(x)} On ne s'intéresse qu'aux ${c.pop} qui ${c.cols[j].q}. Quel pourcentage d'entre eux sont des ${c.rows[i].pl} ? Arrondis à 0,1 %.`, f,
      `Sous-population : la colonne « ${c.cols[j].lab} », d'effectif ${x.C[j]}. ${x.cells[i][j]} ÷ ${x.C[j]} × 100 ${pctText(f)}.`), crossFig(x, { totals: false }))
  },
)

// Tableau en pourcentages du total
const b2Percent = model(
  () => retry(() => {
    const c = pick(CTX2x2), p = crossData(2, 2, 5, 45, 100)
    const i = randInt(0, 1), j = randInt(0, 1)
    const x: Cross = { c, cells: p, R: p.map(sum), C: [p[0][0] + p[1][0], p[0][1] + p[1][1]], N: 100 }
    const f = crossFig(x, { hide: [[i, j]] })
    f.notes = f.notes?.map((n) => (/^\d+$/.test(n.text) ? { ...n, text: `${n.text} %` } : n))
    return W(numeric(`${c.place}, le tableau donne la répartition des ${c.pop} en pourcentage de l'effectif total. Quel pourcentage manque dans la case surlignée ?`, p[i][j], {
      explanation: `Ligne « ${c.rows[i].lab} » : ${x.R[i]} − ${p[i][1 - j]} = ${p[i][j]} %.`,
    }), f)
  }),
  () => {
    const c = pick(CTX2x2), p = crossData(2, 2, 5, 45, 100), N = pick([200, 300, 400, 500, 600, 800, 1000, 1200])
    const i = randInt(0, 1), j = randInt(0, 1)
    const x: Cross = { c, cells: p, R: p.map(sum), C: [p[0][0] + p[1][0], p[0][1] + p[1][1]], N: 100 }
    const f = crossFig(x, { red: [[i, j]] })
    f.notes = f.notes?.map((n) => (/^\d+$/.test(n.text) ? { ...n, text: `${n.text} %` } : n))
    return W(numeric(`${c.place}, ${N} ${c.pop} ont été interrogés ; le tableau donne les pourcentages de l'effectif total. Combien ${deN(c.rows[i].pl)} ${c.cols[j].q} ?`, (N * p[i][j]) / 100, {
      explanation: `${p[i][j]} % de ${N} : ${N} × ${p[i][j]} ÷ 100 = ${fmt((N * p[i][j]) / 100)}.`,
    }), f)
  },
  () => {
    const c = pick(CTX2x2), p = crossData(2, 2, 5, 45, 100)
    const x: Cross = { c, cells: p, R: p.map(sum), C: [p[0][0] + p[1][0], p[0][1] + p[1][1]], N: 100 }
    const j = randInt(0, 1)
    const f = crossFig(x, { hide: [[2, j]] })
    f.notes = f.notes?.map((n) => (/^\d+$/.test(n.text) ? { ...n, text: `${n.text} %` } : n))
    return W(numeric(`${c.place}, le tableau donne la répartition des ${c.pop} en pourcentage du total. Quel pourcentage des ${c.pop} ${c.cols[j].q} ?`, x.C[j], {
      explanation: `On additionne la colonne « ${c.cols[j].lab} » : ${p[0][j]} + ${p[1][j]} = ${x.C[j]} %.`,
    }), f)
  },
)

// Lecture d'un nuage de points
const b2ScatterRead = model(
  () => {
    const s = pick(SCATS), pts = s.gen(s.sign), k = randInt(0, pts.length - 1)
    return W(numeric(`Dans ce nuage, ${s.desc}. Lis l'ordonnée du point A.`, pts[k][1], {
      explanation: `On part du point A et on lit horizontalement sur l'axe des ordonnées : ${fmt(pts[k][1])}.`,
    }), scatterFig(s, pts, { mark: { [k]: 'A' } }))
  },
  () => {
    const s = pick(SCATS), pts = s.gen(s.sign)
    const xs = pts.map((p) => p[0]), thr = xs[Math.floor(xs.length / 2)]
    const n = pts.filter((p) => p[0] > thr).length
    return W(numeric(`Dans ce nuage de ${pts.length} points, ${s.desc}. Combien de points ont une abscisse strictement supérieure à ${fmt(thr)} ?`, n, {
      explanation: `On compte les points situés strictement à droite de la verticale d'abscisse ${fmt(thr)} : ${n}.`,
    }), scatterFig(s, pts))
  },
  () => retry(() => {
    const s = pick(SCATS), pts = s.gen(s.sign)
    const ys = pts.map((p) => p[1]).sort((a, b) => a - b), thr = ys[Math.floor(ys.length / 2)]
    const n = pts.filter((p) => p[1] >= thr).length
    if (n === pts.length) return null
    return W(numeric(`Dans ce nuage, ${s.desc}. Combien de relevés ont une ordonnée supérieure ou égale à ${fmt(thr)} ?`, n, {
      explanation: `On compte les points situés sur ou au-dessus de la droite horizontale d'ordonnée ${fmt(thr)} : ${n}.`,
    }), scatterFig(s, pts))
  }),
  () => {
    const s = pick(SCATS), pts = s.gen(s.sign), k = randInt(0, pts.length - 1)
    return W(numeric(`Dans ce nuage, ${s.desc}. Lis l'abscisse du point B.`, pts[k][0], {
      explanation: `On descend verticalement du point B jusqu'à l'axe des abscisses : ${fmt(pts[k][0])}.`,
    }), scatterFig(s, pts, { mark: { [k]: 'B' } }))
  },
)

// Tendance d'un nuage (QCM)
const b2Trend = model(
  ...[0, 1, 2, 3].map((k) => () => {
    const s = k === 3 ? NO_TREND : pick(SCATS), t = s.sign, pts = s.gen(t)
    const up = 'Plutôt croissante : quand x augmente, y a tendance à augmenter'
    const down = 'Plutôt décroissante : quand x augmente, y a tendance à diminuer'
    const none = 'Pas de tendance nette'
    const good = t > 0 ? up : t < 0 ? down : none
    return W(choice(`Dans ce nuage de ${pts.length} points, ${s.desc}. Quelle tendance se dégage ?`, good, [up, down, none].filter((v) => v !== good),
      t === 0 ? 'Les points forment une bande horizontale : y ne semble pas dépendre de x.' : `Les points montent ${t > 0 ? 'de gauche à droite' : 'de droite à gauche'} : ${s.trendText[t > 0 ? 0 : 1]}.`), scatterFig(s, pts))
  }),
)

// ── Palier 3 ────────────────────────────────────────────────────────────
// Comparer deux sous-populations
const b3Compare = model(
  () => retry(() => {
    const c = pick(CTX2x2), x = cross(c, 8, 80), j = randInt(0, 1)
    const f0 = (x.cells[0][j] / x.R[0]) * 100, f1 = (x.cells[1][j] / x.R[1]) * 100
    if (Math.abs(f0 - f1) < 3) return null
    const d = Math.abs(f0 - f1)
    return W(pct(`${intro(x)} Calcule le pourcentage des ${c.rows[0].pl} qui ${c.cols[j].q}, puis celui des ${c.rows[1].pl}. De combien de points de pourcentage diffèrent-ils ? Arrondis à 0,1.`, d,
      `${c.rows[0].lab} : ${x.cells[0][j]} ÷ ${x.R[0]} × 100 ${pv(f0)}. ${c.rows[1].lab} : ${x.cells[1][j]} ÷ ${x.R[1]} × 100 ${pv(f1)}. Écart ≈ ${fmt(rnd(d, 1))} points.`), crossFig(x))
  }),
  () => retry(() => {
    const c = anyCtx(), x = cross(c, 8, 80), j = randInt(0, c.cols.length - 1)
    const fr = x.cells.map((r, i) => r[j] / x.R[i])
    const best = fr.indexOf(Math.max(...fr))
    if (new Set(fr.map((v) => rnd(v, 3))).size < fr.length || Math.max(...fr) - Math.min(...fr) < 0.04) return null
    // l'effectif le plus grand ne doit pas désigner le bon groupe à coup sûr
    const lab = c.rows.map((r) => cap(r.pl))
    return W(choice(`${intro(x)} Dans quel groupe la proportion ${deN(c.pop)} qui ${c.cols[j].q} est-elle la plus forte ?`, lab[best], lab.filter((_, i) => i !== best),
      `On compare les fréquences conditionnelles (pas les effectifs) : ${x.cells.map((r, i) => `${c.rows[i].pl} : ${r[j]}/${x.R[i]} ${pv(fr[i] * 100)}`).join(' ; ')}. La plus forte : ${c.rows[best].pl}.`), crossFig(x))
  }),
  () => retry(() => {
    const c = pick(CTX2x2), x = cross(c, 8, 80), j = randInt(0, 1)
    // piège : plus d'effectif mais moins de proportion
    const f0 = x.cells[0][j] / x.R[0], f1 = x.cells[1][j] / x.R[1]
    if (!((x.cells[0][j] > x.cells[1][j] && f0 < f1) || (x.cells[0][j] < x.cells[1][j] && f0 > f1))) return null
    const yes = 'Oui', no = 'Non'
    const claim = x.cells[0][j] > x.cells[1][j] ? 0 : 1
    return W(choice(`${intro(x)} Il y a plus ${deN(c.rows[claim].pl)} que ${deN(c.rows[1 - claim].pl)} qui ${c.cols[j].q}. Peut-on en conclure que les ${c.rows[claim].pl} ${c.cols[j].q} en plus forte proportion ?`, no, [yes],
      `Il faut comparer des fréquences : ${c.rows[claim].pl} : ${x.cells[claim][j]}/${x.R[claim]} ${pv((x.cells[claim][j] / x.R[claim]) * 100)} ; ${c.rows[1 - claim].pl} : ${x.cells[1 - claim][j]}/${x.R[1 - claim]} ${pv((x.cells[1 - claim][j] / x.R[1 - claim]) * 100)}. La proportion est plus forte chez les ${c.rows[1 - claim].pl}.`), crossFig(x))
  }),
)

// Compléter un tableau à partir de pourcentages
const b3FromPercents = model(
  () => retry(() => {
    const c = pick(CTX2x2), N = pick([200, 400, 500, 800, 1000]), pr = randInt(3, 7) * 10, pc = pick([20, 25, 30, 40, 45, 60, 75])
    const R0 = (N * pr) / 100, v = (R0 * pc) / 100
    if (!Number.isInteger(v)) return null
    return W(numeric(`${c.place}, sur ${N} ${c.pop}, ${pr} % sont des ${c.rows[0].pl}. Parmi les ${c.rows[0].pl}, ${pc} % ${c.cols[0].q}. Combien ${deN(c.rows[0].pl)} ${c.cols[0].q} ?`, v, {
      explanation: `${cap(c.rows[0].pl)} : ${pr} % de ${N} = ${R0}. Puis ${pc} % de ${R0} = ${fmt(v)}.`,
    }), tableFig(['', c.cols[0].lab, c.cols[1].lab, 'Total'], [[c.rows[0].lab, '?', '', `${fmt(R0)}`], [c.rows[1].lab, '', '', ''], ['Total', '', '', `${N}`]], { red: [[0, 1]], total: true }))
  }),
  () => retry(() => {
    const c = pick(CTX2x2), N = pick([200, 400, 500, 800, 1000]), pr = randInt(3, 7) * 10, pc = pick([20, 25, 30, 40, 45, 60, 75])
    const R0 = (N * pr) / 100, v = (R0 * pc) / 100, R1 = N - R0
    if (!Number.isInteger(v)) return null
    return W(numeric(`${c.place}, sur ${N} ${c.pop}, ${pr} % sont des ${c.rows[0].pl} et les autres des ${c.rows[1].pl}. ${pc} % des ${c.rows[0].pl} ${c.cols[0].q}. Combien ${deN(c.rows[0].pl)} ${c.cols[1].q} ?`, R0 - v, {
      explanation: `${cap(c.rows[0].pl)} : ${pr} % de ${N} = ${R0} (et ${R1} ${c.rows[1].pl}). ${pc} % de ${R0} = ${fmt(v)} ${c.cols[0].q} ; les autres : ${R0} − ${fmt(v)} = ${fmt(R0 - v)}.`,
    }), tableFig(['', c.cols[0].lab, c.cols[1].lab, 'Total'], [[c.rows[0].lab, '', '?', ''], [c.rows[1].lab, '', '', ''], ['Total', '', '', `${N}`]], { red: [[0, 2]], total: true }))
  }),
  () => retry(() => {
    const c = pick(CTX2x2), N = pick([200, 400, 500, 800]), pc0 = pick([10, 20, 25, 30, 40]), pc1 = pick([15, 20, 35, 50, 60])
    const R0 = randInt(2, 6) * 20, R1 = N - R0
    const a = (R0 * pc0) / 100, b = (R1 * pc1) / 100
    if (!Number.isInteger(a) || !Number.isInteger(b) || R1 <= 0 || pc0 === pc1) return null
    return W(numeric(`${c.place}, il y a ${R0} ${c.rows[0].pl} et ${R1} ${c.rows[1].pl}. ${pc0} % des ${c.rows[0].pl} et ${pc1} % des ${c.rows[1].pl} ${c.cols[0].q}. Combien ${deN(c.pop)} ${c.cols[0].q} en tout ?`, a + b, {
      explanation: `${pc0} % de ${R0} = ${a} et ${pc1} % de ${R1} = ${b}, soit ${a} + ${b} = ${a + b} ${c.pop}.`,
    }), tableFig(['', c.cols[0].lab, c.cols[1].lab, 'Total'], [[c.rows[0].lab, '', '', `${R0}`], [c.rows[1].lab, '', '', `${R1}`], ['Total', '?', '', `${N}`]], { red: [[2, 1]], total: true }))
  }),
)

/** Liste des points dans l'énoncé : (2 ; 8), (3 ; 9)… */
const ptsText = (pts: [number, number][]) => pts.map((p) => `(${fmt(p[0])} ; ${fmt(p[1])})`).join(', ')
/** Série de points (x ; y) à coordonnées entières, présentée en tableau. */
function seriesFig(pts: [number, number][]): Figure {
  return tableFig(['x', ...pts.map((p) => fmt(p[0]))], [['y', ...pts.map((p) => fmt(p[1]))]])
}
// Point moyen d'un nuage
const b3Mean = model(
  () => {
    const s = pick(SCATS), pts = s.gen(s.sign).slice(0, randInt(5, 6)), mx = sum(pts.map((p) => p[0])) / pts.length
    return W(approx(`Dans le tableau, ${s.desc}. Calcule l'abscisse x_G du point moyen G du nuage (arrondie au centième si nécessaire).`, mx, 2,
      `x_G est la moyenne des abscisses : (${pts.map((p) => fmt(p[0])).join(' + ')}) ÷ ${pts.length} = ${fmt(sum(pts.map((p) => p[0])))} ÷ ${pts.length} ${isDec(mx, 2) ? '=' : '≈'} ${fmt(rnd(mx, 2))}.`), seriesFig(pts))
  },
  () => {
    const s = pick(SCATS), pts = s.gen(s.sign).slice(0, randInt(5, 6)), my = sum(pts.map((p) => p[1])) / pts.length
    return W(approx(`Dans le tableau, ${s.desc}. Calcule l'ordonnée y_G du point moyen G du nuage (arrondie au dixième).`, my, 1,
      `y_G est la moyenne des ordonnées : ${fmt(sum(pts.map((p) => p[1])))} ÷ ${pts.length} ${isDec(my, 1) ? '=' : '≈'} ${fmt(rnd(my, 1))}.`), seriesFig(pts))
  },
  () => retry(() => {
    const s = pick(SCATS), pts = s.gen(s.sign).slice(0, 4)
    const mx = sum(pts.map((p) => p[0])) / 4, my = sum(pts.map((p) => p[1])) / 4
    if (!isDec(mx, 2) || !isDec(my, 2)) return null
    return W(pair(`Le tableau donne les quatre points d'un nuage, où ${s.desc}. Donne les coordonnées du point moyen G.`, mx, my, {
      explanation: `x_G = ${fmt(sum(pts.map((p) => p[0])))} ÷ 4 = ${fmt(mx)} et y_G = ${fmt(sum(pts.map((p) => p[1])))} ÷ 4 = ${fmt(my)}.`,
    }), seriesFig(pts))
  }),
)

// Réunion « A ou B » dans un tableau croisé
const b3Union = model(
  () => {
    const c = pick(CTX2x2), N = pick(CLEAN_N), x = cross(c, Math.round(N / 12), Math.round(N / 3), N)
    const i = randInt(0, 1), j = randInt(0, 1), u = x.R[i] + x.C[j] - x.cells[i][j]
    return W(pctx(`${intro(x)} Quel pourcentage des ${c.pop} sont des ${c.rows[i].pl} ou ${c.cols[j].q} (ou les deux) ?`, (u / N) * 100, {
      explanation: `${x.R[i]} + ${x.C[j]} − ${x.cells[i][j]} = ${u} (on ne compte qu'une fois la case commune). ${u} ÷ ${N} × 100 = ${fmt((u / N) * 100)} %.`,
      inputHint: 'Pourcentage',
    }), crossFig(x))
  },
  () => {
    const c = pick(CTX2x2), x = cross(c, 5, 40)
    const i = randInt(0, 1), j = randInt(0, 1), u = x.R[i] + x.C[j] - x.cells[i][j]
    return W(fraction(`${intro(x)} Quelle proportion des ${c.pop} sont des ${c.rows[i].pl} ou ${c.cols[j].q} ? Donne une fraction.`, u, x.N, {
      explanation: `Effectif de la réunion : ${x.R[i]} + ${x.C[j]} − ${x.cells[i][j]} = ${u}, soit ${fr(u, x.N)}.`,
    }), crossFig(x))
  },
  () => {
    const c = pick(CTX2x2), N = pick(CLEAN_N), x = cross(c, Math.round(N / 12), Math.round(N / 3), N)
    const i = randInt(0, 1), j = randInt(0, 1), v = x.cells[1 - i][1 - j]
    return W(pctx(`${intro(x)} Quel pourcentage des ${c.pop} ne sont ni des ${c.rows[i].pl}, ni des ${c.pop} qui ${c.cols[j].q} ?`, (v / N) * 100, {
      explanation: `C'est la case « ${c.rows[1 - i].lab} / ${c.cols[1 - j].lab} » : ${v} sur ${N}, soit ${fmt((v / N) * 100)} %.`,
      inputHint: 'Pourcentage',
    }), crossFig(x))
  },
)

// ── Palier 4 ────────────────────────────────────────────────────────────
// Énoncé en phrases → fréquence conditionnelle
const b4Story = model(
  ...CTX2x2.slice(0, 4).map((c) => () => retry(() => {
    const x = cross(c, 6, 70)
    const askRow = Math.random() < 0.5
    const i = 1, j = 1
    const f = askRow ? (x.cells[i][j] / x.R[i]) * 100 : (x.cells[i][j] / x.C[j]) * 100
    return W(pct(`${c.place}, on compte ${x.N} ${c.pop}, dont ${x.R[0]} ${c.rows[0].pl}. ${x.C[0]} ${c.pop} ${c.cols[0].q}, dont ${x.cells[0][0]} ${c.rows[0].pl}. ${askRow ? `Parmi les ${c.rows[i].pl}, quel pourcentage ${c.cols[j].q} ?` : `Parmi les ${c.pop} qui ${c.cols[j].q}, quel pourcentage sont des ${c.rows[i].pl} ?`} Arrondis à 0,1 %.`, f,
      `On complète le tableau : ${c.rows[1].pl} = ${x.N} − ${x.R[0]} = ${x.R[1]} ; ${c.cols[1].lab} = ${x.N} − ${x.C[0]} = ${x.C[1]} ; ${c.rows[0].pl} / ${c.cols[1].lab} = ${x.R[0]} − ${x.cells[0][0]} = ${x.cells[0][1]} ; ${c.rows[1].pl} / ${c.cols[1].lab} = ${x.C[1]} − ${x.cells[0][1]} = ${x.cells[1][1]}. Puis ${x.cells[1][1]} ÷ ${askRow ? x.R[1] : x.C[1]} × 100 ${pctText(f)}.`),
    crossFig(x, { hide: [[1, 1]], blank: [[0, 1], [1, 0], [1, 2], [2, 1]] }))
  })),
)

// Droite d'ajustement donnée : estimation
const b4Fit = model(
  () => {
    const s = SCATS[0], pts = s.gen(1)
    const a = pick([7, 8, 9]), b = -a * 14 + 30 + randInt(-1, 1) * 5, x0 = pick([15, 17, 21, 23, 25, 27, 29])
    return W(numeric(`Dans ce nuage, ${s.desc}. On l'ajuste par la droite d'équation y = ${a}x ${b < 0 ? '−' : '+'} ${Math.abs(b)}. Estime le nombre de glaces vendues un jour où il fait ${x0} °C.`, a * x0 + b, {
      explanation: `On remplace x par ${x0} : y = ${a} × ${x0} ${b < 0 ? '−' : '+'} ${Math.abs(b)} = ${a * x0 + b} glaces environ.`,
    }), scatterFig(s, pts, { line: [a, b] }))
  },
  () => {
    const s = SCATS[1], pts = s.gen(1)
    const a = pick([1.2, 1.4, 1.5]), b = pick([4, 5, 6]), x0 = pick([3, 4, 6, 7, 9])
    return W(numeric(`Dans ce nuage, ${s.desc}. La droite d'ajustement a pour équation y = ${fmt(a)}x + ${b}. Quelle note peut espérer un élève qui révise ${x0} heures ?`, r6(a * x0 + b), {
      explanation: `y = ${fmt(a)} × ${x0} + ${b} = ${fmt(r6(a * x0 + b))}.`,
    }), scatterFig(s, pts, { line: [a, b] }))
  },
  () => retry(() => {
    const s = SCATS[2], pts = s.gen(-1)
    const a = -pick([6, 7, 8]), b = pick([90, 95, 100]), target = pick([20, 30, 40, 50, 60])
    const x0 = (target - b) / a
    if (!isDec(x0, 1) || x0 < 0 || x0 > 14) return null
    return W(numeric(`Dans ce nuage, ${s.desc}. On l'ajuste par la droite y = ${fmt(a)}x + ${b}. Selon ce modèle, à quel âge une charrette ne vaut-elle plus que ${target} écus ?`, x0, {
      explanation: `On résout ${fmt(a)}x + ${b} = ${target} : ${fmt(a)}x = ${fmt(target - b)}, donc x = ${fmt(x0)} ans.`,
    }), scatterFig(s, pts, { line: [a, b] }))
  }),
  () => {
    const s = SCATS[4], pts = s.gen(-1)
    const a = -pick([0.6, 0.7, 0.75, 0.8]), b = pick([17, 18, 19]), x0 = pick([5, 7, 9, 11, 13, 15])
    return W(numeric(`Dans ce nuage, ${s.desc}. La droite d'ajustement est y = ${fmt(a)}x + ${b}. Estime la température moyenne d'un village situé à ${x0 * 100} m d'altitude (x = ${x0}).`, r6(a * x0 + b), {
      explanation: `y = ${fmt(a)} × ${x0} + ${b} = ${fmt(r6(a * x0 + b))} °C.`,
    }), scatterFig(s, pts, { line: [a, b] }))
  },
)

// Taux global à partir de taux par groupe
const b4Weighted = model(
  ...[
    { g: ['filles', 'garçons'], lab: ['Filles', 'Garçons'], pop: 'élèves', q: 'font du sport en club' },
    { g: ['archers', 'cavaliers'], lab: ['Archers', 'Cavaliers'], pop: 'soldats', q: 'ont été blessés pendant la campagne' },
    { g: ['adultes', 'enfants'], lab: ['Adultes', 'Enfants'], pop: 'villageois', q: 'ont attrapé la grippe' },
    { g: ['clients du matin', 'clients du soir'], lab: ['Matin', 'Soir'], pop: 'clients', q: 'ont payé par carte' },
  ].map((ctx) => () => retry(() => {
    const n0 = randInt(4, 16) * 10, n1 = randInt(4, 16) * 10, p0 = randInt(2, 16) * 5, p1 = randInt(2, 16) * 5
    if (p0 === p1) return null
    const a = (n0 * p0) / 100, b = (n1 * p1) / 100, f = ((a + b) / (n0 + n1)) * 100
    if (!Number.isInteger(a) || !Number.isInteger(b)) return null
    return W(pct(`Un groupe compte ${n0} ${ctx.g[0]} et ${n1} ${ctx.g[1]}. ${p0} % des ${ctx.g[0]} et ${p1} % des ${ctx.g[1]} ${ctx.q}. Quel pourcentage de l'ensemble des ${ctx.pop} ${ctx.q} ? Arrondis à 0,1 %.`, f,
      `${p0} % de ${n0} = ${a} et ${p1} % de ${n1} = ${b}. Au total ${a + b} sur ${n0 + n1} : ${a + b} ÷ ${n0 + n1} × 100 ${pctText(f)}. (Ce n'est pas la moyenne de ${p0} et ${p1} : les groupes n'ont pas le même effectif.)`),
    tableFig(['', 'Oui', 'Non', 'Total'], [[ctx.lab[0], '', '', `${n0}`], [ctx.lab[1], '', '', `${n1}`], ['Total', '?', '', `${n0 + n1}`]], { red: [[2, 1]], total: true }))
  })),
)

// Point moyen avec une valeur manquante
const b4MissingMean = model(
  () => retry(() => {
    const s = pick(SCATS), pts = s.gen(s.sign).slice(0, 5)
    const k = randInt(0, 4), my = sum(pts.map((p) => p[1])) / 5
    if (!isDec(my, 1)) return null
    const shown = pts.map((p, i) => (i === k ? '?' : fmt(p[1])))
    return W(numeric(`Le tableau donne cinq relevés, où ${s.desc}, mais une valeur de y a été effacée. On sait que le point moyen a pour ordonnée y_G = ${fmt(my)}. Retrouve la valeur effacée.`, pts[k][1], {
      explanation: `La somme des y vaut 5 × ${fmt(my)} = ${fmt(r6(5 * my))}. Les quatre valeurs connues totalisent ${fmt(sum(pts.map((p) => p[1])) - pts[k][1])}, donc la valeur effacée est ${fmt(r6(5 * my))} − ${fmt(sum(pts.map((p) => p[1])) - pts[k][1])} = ${fmt(pts[k][1])}.`,
    }), tableFig(['x', ...pts.map((p) => fmt(p[0]))], [['y', ...shown]], { red: [[0, k + 1]] }))
  }),
  () => retry(() => {
    const s = pick(SCATS), pts = s.gen(s.sign).slice(0, 5)
    const k = randInt(0, 4), mx = sum(pts.map((p) => p[0])) / 5
    if (!isDec(mx, 1)) return null
    const shown = pts.map((p, i) => (i === k ? '?' : fmt(p[0])))
    return W(numeric(`Une valeur de x a été effacée dans ce tableau de cinq relevés, où ${s.desc}. Le point moyen du nuage a pour abscisse x_G = ${fmt(mx)}. Retrouve la valeur effacée.`, pts[k][0], {
      explanation: `Somme des x : 5 × ${fmt(mx)} = ${fmt(r6(5 * mx))}. Valeurs connues : ${fmt(sum(pts.map((p) => p[0])) - pts[k][0])}. Valeur effacée : ${fmt(pts[k][0])}.`,
    }), tableFig(['x', ...shown], [['y', ...pts.map((p) => fmt(p[1]))]], { red: [[-1, k + 1]] }))
  }),
  () => retry(() => {
    const s = pick(SCATS), pts = s.gen(s.sign).slice(0, 4)
    const mx = sum(pts.map((p) => p[0])) / 4, my = sum(pts.map((p) => p[1])) / 4, a = pick([2, 3, 4, 5, -2, -3])
    const b = r6(my - a * mx)
    if (!isDec(mx, 2) || !isDec(my, 2)) return null
    return W(numeric(`Le tableau donne quatre relevés, où ${s.desc}. On cherche une droite d'ajustement de coefficient directeur ${fmt(a)} passant par le point moyen G. Quelle est son ordonnée à l'origine b ?`, b, {
      explanation: `G(${fmt(mx)} ; ${fmt(my)}). La droite y = ${fmt(a)}x + b passe par G : ${fmt(my)} = ${fmt(a)} × ${fmt(mx)} + b, donc b = ${fmt(my)} − ${par(r6(a * mx))} = ${fmt(b)}.`,
    }), seriesFig(pts))
  }),
)

// Quel groupe a la plus forte proportion (tableau à trois lignes ou colonnes)
const b4Groups = model(
  ...CTX3.map((c) => () => retry(() => {
    const x = cross(c, 6, 70)
    const byRow = c.rows.length >= 3 || Math.random() < 0.5
    if (byRow) {
      const j = randInt(0, c.cols.length - 1), fr = x.cells.map((r, i) => r[j] / x.R[i])
      const best = fr.indexOf(Math.max(...fr))
      if ([...fr].sort((a, b) => b - a)[0] - [...fr].sort((a, b) => b - a)[1] < 0.03) return null
      const big = x.cells.map((r) => r[j]).indexOf(Math.max(...x.cells.map((r) => r[j])))
      if (big === best && Math.random() < 0.6) return null
      return W(choice(`${intro(x)} Dans quel groupe la proportion ${deN(c.pop)} qui ${c.cols[j].q} est-elle la plus forte ?`, cap(c.rows[best].pl), c.rows.filter((_, i) => i !== best).map((r) => cap(r.pl)),
        `Fréquences conditionnelles : ${x.cells.map((r, i) => `${c.rows[i].pl} ${r[j]}/${x.R[i]} ${pv(fr[i] * 100)}`).join(' ; ')}.`), crossFig(x))
    }
    const i = randInt(0, c.rows.length - 1), fr = c.cols.map((_, j) => x.cells[i][j] / x.C[j])
    const best = fr.indexOf(Math.max(...fr))
    if ([...fr].sort((a, b) => b - a)[0] - [...fr].sort((a, b) => b - a)[1] < 0.03) return null
    const opts = c.cols.map((cc) => cc.lab)
    return W(choice(`${intro(x)} Dans quelle colonne du tableau la part des ${c.rows[i].pl} est-elle la plus forte ?`, opts[best], opts.filter((_, j) => j !== best),
      `On calcule, dans chaque colonne, la part des ${c.rows[i].pl} : ${c.cols.map((cc, j) => `${cc.lab} ${x.cells[i][j]}/${x.C[j]} ${pv(fr[j] * 100)}`).join(' ; ')}.`), crossFig(x))
  })),
)

// ── Palier 5 ────────────────────────────────────────────────────────────
// Paradoxe de Simpson : taux global
const SIMPSON = [
  { a: 'l’hospice Saint-Jean', b: 'l’hospice Sainte-Claire', g: ['cas légers', 'cas graves'], h: ['Légers', 'Graves'], ok: 'guéris', who: 'malades' },
  { a: 'le maître d’armes Gauvain', b: 'le maître d’armes Perceval', g: ['débutants', 'confirmés'], h: ['Débutants', 'Confirmés'], ok: 'reçus à l’épreuve', who: 'élèves' },
  { a: 'le lycée Hugo', b: 'le lycée Curie', g: ['filière générale', 'filière technologique'], h: ['Générale', 'Techno.'], ok: 'reçus au bac', who: 'candidats' },
]
function simpsonData() {
  return retry(() => {
    // A meilleur dans chaque groupe mais moins bon globalement (ou presque)
    const nA = [randInt(1, 4) * 10, randInt(10, 30) * 10], nB = [randInt(10, 30) * 10, randInt(1, 4) * 10]
    const pA = [randInt(17, 19) * 5, randInt(6, 12) * 5], pB = [randInt(14, 18) * 5, randInt(4, 10) * 5]
    if (!(pA[0] > pB[0] && pA[1] > pB[1])) return null
    const okA = nA.map((n, i) => (n * pA[i]) / 100), okB = nB.map((n, i) => (n * pB[i]) / 100)
    if (![...okA, ...okB].every(Number.isInteger)) return null
    const gA = (sum(okA) / sum(nA)) * 100, gB = (sum(okB) / sum(nB)) * 100
    if (gA >= gB - 2) return null
    return { nA, nB, pA, pB, okA, okB, gA, gB }
  })
}
const b5Simpson = model(
  ...SIMPSON.map((s) => () => {
    const d = simpsonData(), askA = Math.random() < 0.5
    const g = askA ? d.gA : d.gB
    return W(pct(`On compare ${s.a} et ${s.b}. Pour ${s.a} : ${d.nA[0]} ${s.who} en ${s.g[0]}, dont ${d.okA[0]} ${s.ok}, et ${d.nA[1]} en ${s.g[1]}, dont ${d.okA[1]} ${s.ok}. Pour ${s.b} : ${d.nB[0]} en ${s.g[0]}, dont ${d.okB[0]} ${s.ok}, et ${d.nB[1]} en ${s.g[1]}, dont ${d.okB[1]} ${s.ok}. Quel est le pourcentage global ${deN(s.who)} ${s.ok} pour ${askA ? s.a : s.b} ? Arrondis à 0,1 %.`, g,
      `${askA ? `(${d.okA[0]} + ${d.okA[1]}) ÷ (${d.nA[0]} + ${d.nA[1]}) = ${sum(d.okA)} ÷ ${sum(d.nA)}` : `(${d.okB[0]} + ${d.okB[1]}) ÷ (${d.nB[0]} + ${d.nB[1]}) = ${sum(d.okB)} ÷ ${sum(d.nB)}`}, soit ${pctText(g)}. Remarque : ${s.a} fait mieux dans chaque groupe (${d.pA[0]} % contre ${d.pB[0]} %, ${d.pA[1]} % contre ${d.pB[1]} %) mais moins bien globalement (${fmt(rnd(d.gA))} % contre ${fmt(rnd(d.gB))} %) : c'est le paradoxe de Simpson.`),
    tableFig(['', s.h[0], s.h[1]], [['A', `${d.okA[0]}/${d.nA[0]}`, `${d.okA[1]}/${d.nA[1]}`], ['B', `${d.okB[0]}/${d.nB[0]}`, `${d.okB[1]}/${d.nB[1]}`]]))
  }),
)

// Intersection et conditionnelle « à l'envers » à partir de pourcentages
const b5Reverse = model(
  ...[
    { A: 'internes', notA: 'externes', B: 'font de la musique', pop: 'élèves' },
    { A: 'archers', notA: 'autres soldats', B: 'sont blessés', pop: 'soldats' },
    { A: 'touristes', notA: 'habitants', B: 'achètent un souvenir', pop: 'visiteurs' },
  ].map((ctx) => () => retry(() => {
    const pa = randInt(2, 7) * 10, pb = randInt(1, 9) * 10, pbn = randInt(1, 9) * 5
    if (pb === pbn) return null
    const inter = (pa * pb) / 100, other = ((100 - pa) * pbn) / 100, tot = inter + other
    const f = (inter / tot) * 100
    const ask = pick(['inter', 'cond', 'tot'] as const)
    const head = `Parmi les ${ctx.pop}, ${pa} % sont des ${ctx.A}. ${pb} % des ${ctx.A} et ${pbn} % des ${ctx.notA} ${ctx.B}.`
    const fig = tableFig(['en %', 'Oui', 'Non', 'Total'], [[cap(ctx.A), '', '', `${pa}`], [cap(ctx.notA.split(' ')[0]), '', '', `${100 - pa}`], ['Total', '', '', '100']], { total: true })
    if (ask === 'inter') {
      return W(pctx(`${head} Quel pourcentage de l'ensemble des ${ctx.pop} sont des ${ctx.A} qui ${ctx.B} ?`, inter, {
        explanation: `${pb} % de ${pa} % : ${fmt(pb / 100)} × ${pa} = ${fmt(inter)} % des ${ctx.pop}.`, inputHint: 'Pourcentage',
      }), fig)
    }
    if (ask === 'tot') {
      return W(pctx(`${head} Quel pourcentage de l'ensemble des ${ctx.pop} ${ctx.B} ?`, r6(tot), {
        explanation: `${fmt(pb / 100)} × ${pa} = ${fmt(inter)} % et ${fmt(pbn / 100)} × ${100 - pa} = ${fmt(other)} %, soit ${fmt(r6(tot))} % au total.`, inputHint: 'Pourcentage',
      }), fig)
    }
    return W(pct(`${head} Parmi les ${ctx.pop} qui ${ctx.B}, quel pourcentage sont des ${ctx.A} ? Arrondis à 0,1 %.`, f,
      `Sur 100 ${ctx.pop} : ${fmt(inter)} ${ctx.A} et ${fmt(other)} ${ctx.notA} ${ctx.B}, soit ${fmt(r6(tot))} en tout. Parmi eux : ${fmt(inter)} ÷ ${fmt(r6(tot))} × 100 ${pctText(f)}.`), fig)
  })),
)

// Méthode de Mayer : droite passant par deux points moyens
const b5Mayer = model(
  ...[0, 1, 3, 4].map((si) => () => retry(() => {
    const s = SCATS[si], t = si === 2 || si === 4 ? -1 : 1, pts = s.gen(t).slice(0, 6)
    if (pts.length < 6) return null
    const g1 = [sum(pts.slice(0, 3).map((p) => p[0])) / 3, sum(pts.slice(0, 3).map((p) => p[1])) / 3]
    const g2 = [sum(pts.slice(3).map((p) => p[0])) / 3, sum(pts.slice(3).map((p) => p[1])) / 3]
    if (g2[0] === g1[0]) return null
    const a = (g2[1] - g1[1]) / (g2[0] - g1[0])
    if (!isDec(a, 2) || a === 0) return null
    return W(numeric(`Méthode de Mayer : on partage le nuage des points ${ptsText(pts)} (${s.desc}) en deux groupes de trois points (les trois plus petites abscisses, puis les trois autres) et on calcule les points moyens G₁ et G₂. Quel est le coefficient directeur de la droite (G₁G₂) ?`, a, {
      explanation: `G₁(${fmt(rnd(g1[0], 2))} ; ${fmt(rnd(g1[1], 2))}) et G₂(${fmt(rnd(g2[0], 2))} ; ${fmt(rnd(g2[1], 2))}). Coefficient directeur : (${fmt(rnd(g2[1], 2))} − ${fmt(rnd(g1[1], 2))}) ÷ (${fmt(rnd(g2[0], 2))} − ${fmt(rnd(g1[0], 2))}) = ${fmt(a)}.`,
      inputHint: 'Décimal, ex. 1,5',
    }), seriesFig(pts))
  })),
)

// Combien faudrait-il pour que deux groupes aient la même proportion ?
const b5Equal = model(
  ...CTX2x2.map((c) => () => retry(() => {
    const R0 = randInt(2, 12) * 10, k = pick([10, 20, 25, 30, 40, 50, 60, 75]), R1 = randInt(2, 12) * 10
    const a = (R0 * k) / 100, b = (R1 * k) / 100
    if (!Number.isInteger(a) || !Number.isInteger(b) || R0 === R1) return null
    const now = Math.max(1, b - randInt(2, Math.max(3, Math.floor(b / 2))))
    if (now >= b) return null
    return W(numeric(`${c.place}, ${a} des ${R0} ${c.rows[0].pl} ${c.cols[0].q}, contre ${now} des ${R1} ${c.rows[1].pl}. Combien ${deN(c.rows[1].pl)} de plus faudrait-il dans la case « ${c.cols[0].lab} » pour que la proportion soit la même dans les deux groupes (effectifs des groupes inchangés) ?`, b - now, {
      explanation: `Proportion chez les ${c.rows[0].pl} : ${a}/${R0} = ${fmt(k / 100)}. Il faudrait ${fmt(k / 100)} × ${R1} = ${b} ${c.rows[1].pl} ; il en manque ${b} − ${now} = ${b - now}.`,
    }), tableFig(['', c.cols[0].lab, 'Total'], [[c.rows[0].lab, `${a}`, `${R0}`], [c.rows[1].lab, `${now}`, `${R1}`]]))
  })),
)

const tiers: Tiers = [
  [b1Complete, b1Margin, b1Freq, b1Cell, b1Sentences],
  [b2CondRow, b2CondCol, b2Percent, b2ScatterRead, b2Trend],
  [b3Compare, b3FromPercents, b3Mean, b3Union],
  [b4Story, b4Fit, b4Weighted, b4MissingMean, b4Groups],
  [b5Simpson, b5Reverse, b5Mayer, b5Equal],
]

// ═════════════════════════════════════════════════════════════════════════
// Problèmes d'amélioration
// ═════════════════════════════════════════════════════════════════════════
const upgrades: Ladder = [
  [
    // Deux fréquences conditionnelles « inverses »
    () => retry(() => {
      const c = pick(CTX2x2), x = cross(c, 8, 70), i = randInt(0, 1), j = randInt(0, 1)
      const f1 = x.cells[i][j] / x.R[i], f2 = x.cells[i][j] / x.C[j]
      if (Math.abs(f1 - f2) < 0.05) return null
      const d = Math.abs(f1 - f2) * 100
      return T('Dans quel sens ?', pct(`${intro(x)} Calcule la fréquence des ${c.pop} qui ${c.cols[j].q} parmi les ${c.rows[i].pl}, puis la fréquence des ${c.rows[i].pl} parmi les ${c.pop} qui ${c.cols[j].q}. Quel est l'écart entre ces deux pourcentages (en points, arrondi à 0,1) ?`, d,
        `${x.cells[i][j]}/${x.R[i]} ${pv(f1 * 100)} et ${x.cells[i][j]}/${x.C[j]} ${pv(f2 * 100)} : même numérateur, mais pas la même sous-population. Écart ≈ ${fmt(rnd(d))} points.`), crossFig(x))
    }),
    // Point moyen (couple)
    () => retry(() => {
      const n = randInt(4, 6), s = pick(SCATS), pts = s.gen(s.sign).slice(0, n)
      if (pts.length < n) return null
      const mx = sum(pts.map((p) => p[0])) / n, my = sum(pts.map((p) => p[1])) / n
      if (!isDec(mx, 1) || !isDec(my, 1)) return null
      return T('Le centre du nuage', pair(`Dans le nuage ci-contre, ${s.desc}. Il compte ${n} points. Lis leurs coordonnées et donne celles du point moyen G.`, mx, my, {
        explanation: `x_G = (${pts.map((p) => fmt(p[0])).join(' + ')}) ÷ ${n} = ${fmt(mx)} et y_G = (${pts.map((p) => fmt(p[1])).join(' + ')}) ÷ ${n} = ${fmt(my)}.`,
      }), scatterFig(s, pts))
    }),
    // Estimer avec la droite tracée
    () => retry(() => {
      const s = SCATS[1], pts = s.gen(1), a = pick([1.2, 1.4, 1.5, 1.6]), b = pick([3, 4, 5]), y0 = pick([10, 11, 12, 13, 14, 15, 16])
      const x0 = (y0 - b) / a
      if (!isDec(x0, 1) || x0 < 1 || x0 > 9.5) return null
      return T('Viser la moyenne', numeric(`On a tracé la droite d'ajustement y = ${fmt(a)}x + ${b} du nuage ci-contre, où ${s.desc}. D'après ce modèle, combien d'heures faut-il réviser pour espérer ${y0} sur 20 ?`, x0, {
        explanation: `${fmt(a)}x + ${b} = ${y0} ⇔ x = (${y0} − ${b}) ÷ ${fmt(a)} = ${fmt(x0)} h.`,
      }), scatterFig(s, pts, { line: [a, b] }))
    }),
  ],
  [
    // Taux global = moyenne pondérée
    () => retry(() => {
      const n0 = randInt(3, 9) * 20, n1 = randInt(3, 9) * 20, p0 = randInt(2, 18) * 5, target = randInt(2, 18) * 5
      // quel taux p1 dans le 2e groupe donne un taux global target ?
      const p1 = (target * (n0 + n1) - p0 * n0) / n1
      if (!Number.isInteger(p1) || p1 <= 0 || p1 >= 100 || p1 === p0) return null
      return T('Le taux à atteindre', pctx(`Au château, ${n0} archers et ${n1} cavaliers passent une épreuve. ${p0} % des archers la réussissent. Quel pourcentage de réussite doivent avoir les cavaliers pour que le taux global de réussite soit de ${target} % ?`, p1, {
        explanation: `Il faut ${target} % de ${n0 + n1} = ${fmt((target * (n0 + n1)) / 100)} réussites. Les archers en apportent ${fmt((p0 * n0) / 100)}, il en faut donc ${fmt((p1 * n1) / 100)} chez les cavaliers, soit ${fmt((p1 * n1) / 100)} ÷ ${n1} × 100 = ${p1} %.`,
        inputHint: 'Pourcentage',
      }), tableFig(['', 'Réussite', 'Total'], [['Archers', `${p0} %`, `${n0}`], ['Cavaliers', '?', `${n1}`], ['Total', `${target} %`, `${n0 + n1}`]], { red: [[1, 1]], total: true }))
    }),
    // Égaliser deux proportions
    () => retry(() => {
      const c = pick(CTX2x2), R0 = randInt(3, 12) * 10, k = pick([20, 25, 30, 40, 60, 75]), R1 = randInt(3, 12) * 10
      const a = (R0 * k) / 100, b = (R1 * k) / 100
      if (!Number.isInteger(a) || !Number.isInteger(b) || R0 === R1) return null
      const now = b + randInt(2, 9)
      if (now >= R1) return null
      return T('Rééquilibrer', numeric(`${c.place}, ${a} des ${R0} ${c.rows[0].pl} ${c.cols[0].q}, et ${now} des ${R1} ${c.rows[1].pl}. Combien ${deN(c.rows[1].pl)} de moins faudrait-il dans la case « ${c.cols[0].lab} » pour que la proportion soit la même dans les deux groupes (effectifs des groupes inchangés) ?`, now - b, {
        explanation: `Proportion chez les ${c.rows[0].pl} : ${a}/${R0} = ${fmt(k / 100)}. Chez les ${c.rows[1].pl}, il faudrait ${fmt(k / 100)} × ${R1} = ${b}, soit ${now} − ${b} = ${now - b} de moins.`,
      }), tableFig(['', c.cols[0].lab, 'Total'], [[c.rows[0].lab, `${a}`, `${R0}`], [c.rows[1].lab, `${now}`, `${R1}`]]))
    }),
    // Point moyen et valeur manquante
    () => retry(() => {
      const s = pick(SCATS), pts = s.gen(1).slice(0, 6), k = randInt(0, 5)
      const my = sum(pts.map((p) => p[1])) / 6
      if (!isDec(my, 1)) return null
      return T('La mesure perdue', numeric(`Six relevés ont été faits (${s.desc}), mais une valeur de y s'est effacée. Le point moyen du nuage a pour ordonnée ${fmt(my)}. Quelle est la valeur effacée ?`, pts[k][1], {
        explanation: `Somme des six y : 6 × ${fmt(my)} = ${fmt(r6(6 * my))}. Les cinq connues font ${fmt(sum(pts.map((p) => p[1])) - pts[k][1])}, donc il manque ${fmt(pts[k][1])}.`,
      }), tableFig(['x', ...pts.map((p) => fmt(p[0]))], [['y', ...pts.map((p, i) => (i === k ? '?' : fmt(p[1])))]], { red: [[0, k + 1]] }))
    }),
  ],
  [
    // Paradoxe de Simpson (QCM argumenté)
    () => {
      const s = pick(SIMPSON), d = simpsonData()
      return T('Le paradoxe des deux maisons', choice(`On compare ${s.a} (A) et ${s.b} (B) sur deux groupes. ${cap(s.g[0])} : A ${d.okA[0]} ${s.ok} sur ${d.nA[0]}, B ${d.okB[0]} sur ${d.nB[0]}. ${cap(s.g[1])} : A ${d.okA[1]} sur ${d.nA[1]}, B ${d.okB[1]} sur ${d.nB[1]}. Quelle affirmation est vraie ?`,
        `A fait mieux dans chaque groupe, mais B fait mieux au total`,
        [`A fait mieux dans chaque groupe et au total`, `B fait mieux dans chaque groupe et au total`, `B fait mieux dans chaque groupe, mais A fait mieux au total`],
        `Par groupe : ${s.g[0]} ${d.pA[0]} % (A) contre ${d.pB[0]} % (B) ; ${s.g[1]} ${d.pA[1]} % contre ${d.pB[1]} %. Au total : A ${sum(d.okA)}/${sum(d.nA)} ≈ ${fmt(rnd(d.gA))} %, B ${sum(d.okB)}/${sum(d.nB)} ≈ ${fmt(rnd(d.gB))} %. A reçoit surtout des ${s.g[1]}, plus difficiles : c'est le paradoxe de Simpson.`),
      tableFig(['', s.h[0], s.h[1]], [['A', `${d.okA[0]}/${d.nA[0]}`, `${d.okA[1]}/${d.nA[1]}`], ['B', `${d.okB[0]}/${d.nB[0]}`, `${d.okB[1]}/${d.nB[1]}`]]))
    },
    // Mayer + prévision
    () => retry(() => {
      const s = SCATS[1], pts = s.gen(1).slice(0, 6)
      if (pts.length < 6) return null
      const g1 = [sum(pts.slice(0, 3).map((p) => p[0])) / 3, sum(pts.slice(0, 3).map((p) => p[1])) / 3]
      const g2 = [sum(pts.slice(3).map((p) => p[0])) / 3, sum(pts.slice(3).map((p) => p[1])) / 3]
      const a = (g2[1] - g1[1]) / (g2[0] - g1[0]), b = g1[1] - a * g1[0], x0 = pick([5, 6, 7, 8])
      const y = a * x0 + b
      if (!isFinite(a) || a <= 0) return null
      return T('La prévision de Mayer', approx(`Six élèves ont noté leur temps de révision x (en heures) et leur note y (sur 20) : ${ptsText(pts)}. Avec la méthode de Mayer (deux groupes de trois points, rangés par x croissant), trace la droite (G₁G₂) puis estime la note d'un élève qui révise ${x0} h. Arrondis au dixième.`, y, 1,
        `G₁(${fmt(rnd(g1[0], 2))} ; ${fmt(rnd(g1[1], 2))}), G₂(${fmt(rnd(g2[0], 2))} ; ${fmt(rnd(g2[1], 2))}). Coefficient : a ≈ ${fmt(rnd(a, 3))} ; la droite passe par G₁ : b ≈ ${fmt(rnd(b, 3))}. Pour x = ${x0} : y ≈ ${fmt(rnd(y))}.`), seriesFig(pts))
    }),
    // Conditionnelle inversée
    () => retry(() => {
      const pa = randInt(2, 6) * 10, pb = randInt(5, 19) * 5, pbn = randInt(1, 9) * 5
      if (pb === pbn) return null
      const inter = (pa * pb) / 100, other = ((100 - pa) * pbn) / 100, f = (inter / (inter + other)) * 100
      const ctx = pick([
        { s: `Dans une région, ${pa} % des chevaux sont atteints d'une maladie. Un test du maréchal-ferrant est positif pour ${pb} % des chevaux malades et pour ${pbn} % des chevaux sains.`, q: 'Parmi les chevaux dont le test est positif, quel pourcentage sont réellement malades', a: 'malades', b: 'sains' },
        { s: `Dans un lycée, ${pa} % des élèves sont internes. ${pb} % des internes et ${pbn} % des externes participent à l'atelier théâtre.`, q: 'Parmi les élèves de l’atelier théâtre, quel pourcentage sont internes', a: 'internes', b: 'externes' },
      ])
      return T('Le test du maréchal-ferrant', pct(`${ctx.s} ${ctx.q} ? Arrondis à 0,1 %.`, f,
        `Sur 100 : ${pa} ${ctx.a}, dont ${fmt(inter)} « oui » ; ${100 - pa} ${ctx.b}, dont ${fmt(other)} « oui ». Parmi les ${fmt(r6(inter + other))} « oui », la part des ${ctx.a} est ${fmt(inter)} ÷ ${fmt(r6(inter + other))} × 100 ${pctText(f)}.`),
      tableFig(['sur 100', 'Oui', 'Non', 'Total'], [[cap(ctx.a), '', '', `${pa}`], [cap(ctx.b), '', '', `${100 - pa}`], ['Total', '', '', '100']], { total: true }))
    }),
  ],
]

// ═════════════════════════════════════════════════════════════════════════
// Problèmes de l'hôtel de ville
// ═════════════════════════════════════════════════════════════════════════
const age: Ladder = [
  [
    // Le sondage de la cantine
    () => {
      const x = cross(CTX2x2[1], 15, 90), i = randInt(0, 1)
      const f = (x.cells[i][0] / x.R[i]) * 100
      return T('Le sondage de la cantine', pct(`Le conseil de vie lycéenne a interrogé ${x.N} élèves pour savoir qui mange à la cantine (tableau). Le proviseur affirme : « La majorité des ${x.c.rows[i].pl} mangent à la cantine. » Calcule le pourcentage des ${x.c.rows[i].pl} qui mangent à la cantine (arrondi à 0,1 %).`, f,
        `${x.cells[i][0]} ÷ ${x.R[i]} × 100 ${pctText(f)}. ${f > 50 ? 'C’est plus de 50 % : le proviseur a raison.' : 'Ce n’est pas plus de 50 % : le proviseur se trompe.'}`), crossFig(x))
    },
    // Les recrues du château
    () => {
      const c = CTX3[0], x = cross(c, 10, 60), i = randInt(0, 2)
      return T('Les recrues du château', numeric(`Le capitaine a dressé le registre de son armée, mais l'encre a coulé sur une case et sur le total général. Il sait que l'armée compte ${x.N} soldats. Combien ${deN(c.rows[i].pl)} sont des recrues ?`, x.cells[i][1], {
        explanation: `Total de la colonne « Recrues » : ${x.N} − ${x.C[0]} = ${x.C[1]}. Puis ${x.C[1]} − ${x.cells.filter((_, k) => k !== i).map((r) => r[1]).join(' − ')} = ${x.cells[i][1]}.`,
      }), crossFig(x, { hide: [[i, 1]], blank: [[3, 2], [i, 2], [3, 1]] }))
    },
    // Glaces et soleil
    () => retry(() => {
      const s = SCATS[0], pts = s.gen(1), seuil = pick([100, 120, 140])
      const hot = pick([24, 26, 28])
      const n = pts.filter((p) => p[0] >= hot && p[1] >= seuil).length
      if (n === 0) return null
      const who = prenom()
      return T('Glaces et soleil', numeric(`${who} tient un stand de glaces. Le nuage donne, pour plusieurs journées, la température maximale (x, en °C) et le nombre de glaces vendues (y). Combien de journées à au moins ${hot} °C ont permis de vendre au moins ${seuil} glaces ?`, n, {
        explanation: `On regarde les points à droite de x = ${hot} (inclus) et au-dessus de y = ${seuil} (inclus) : il y en a ${n}. Le nuage est croissant : plus il fait chaud, plus on vend de glaces.`,
      }), scatterFig(s, pts))
    }),
  ],
  [
    // La potion de la guérisseuse
    () => retry(() => {
      const nT = randInt(6, 16) * 10, nN = randInt(6, 16) * 10, mT = randInt(5, nT / 4), mN = randInt(nN / 5, nN / 2)
      const fT = (mT / nT) * 100, fN = (mN / nN) * 100
      if (fN - fT < 5) return null
      return T('La potion de la guérisseuse', pct(`Cet hiver, la guérisseuse a donné sa potion à ${nT} villageois ; ${mT} d'entre eux sont tombés malades. Parmi les ${nN} villageois qui ne l'ont pas prise, ${mN} sont tombés malades. De combien de points le pourcentage de malades est-il plus faible chez ceux qui ont pris la potion ? Arrondis à 0,1.`, fN - fT,
        `Avec potion : ${mT} ÷ ${nT} × 100 ${pv(fT)}. Sans potion : ${mN} ÷ ${nN} × 100 ${pv(fN)}. Écart ≈ ${fmt(rnd(fN - fT))} points.`),
      tableFig(['', 'Malades', 'Sains', 'Total'], [['Potion', `${mT}`, `${nT - mT}`, `${nT}`], ['Sans potion', `${mN}`, `${nN - mN}`, `${nN}`]], { total: true }))
    }),
    // Le marché aux poissons
    () => retry(() => {
      const s: Scat = {
        desc: 'x désigne le prix du kilo de truite (en écus) et y la quantité vendue (en kg)', sign: -1, names: ['écus', 'kg'],
        win: { xMin: 0, xMax: 10, yMin: 0, yMax: 60, step: 1, labelStep: 2, ystep: 5, ylabelStep: 10 },
        gen: () => gridPts(8, range(1, 10), (x) => 58 - 5 * x + randInt(-1, 1) * 5, 5, 0, 60),
        trendText: ['', ''],
      }
      const pts = s.gen(-1), a = -5, b = pick([55, 58, 60]), p0 = pick([3.5, 4.5, 6.5, 7.5]), q = a * p0 + b
      const rev = p0 * q
      return T('Le marché aux poissons', numeric(`Au marché, le poissonnier a noté le prix du kilo de truite (x, en écus) et la quantité vendue (y, en kg) sur plusieurs jours. Il ajuste le nuage par la droite y = ${fmt(a)}x + ${b}. S'il fixe le prix à ${fmt(p0)} écus le kilo, quelle recette (en écus) peut-il espérer selon ce modèle ?`, r6(rev), {
        explanation: `Quantité estimée : ${fmt(a)} × ${fmt(p0)} + ${b} = ${fmt(q)} kg. Recette : ${fmt(p0)} × ${fmt(q)} = ${fmt(r6(rev))} écus.`,
      }), scatterFig(s, pts, { line: [a, b] }))
    }),
    // L'élection du bourgmestre
    () => retry(() => {
      const q = ['Port', 'Marché', 'Château'], nq = q.map(() => randInt(8, 30) * 10), pp = q.map(() => randInt(6, 15) * 5)
      const pour = nq.map((n, i) => (n * pp[i]) / 100)
      if (!pour.every(Number.isInteger)) return null
      const tot = sum(pour), N = sum(nq), f = (tot / N) * 100
      if (Math.abs(f - 50) < 0.5) return null
      const [who, elu] = pick([['Aldric', 'élu'], ['Mathilde', 'élue'], ['Godefroy', 'élu'], ['Aliénor', 'élue'], ['Bertrand', 'élu'], ['Iseult', 'élue']])
      return T('L’élection du bourgmestre', pct(`${N} habitants de trois quartiers votent pour ou contre ${who}. Le tableau donne, pour chaque quartier, le nombre de votants et le pourcentage de « pour ». Quel pourcentage de l'ensemble des votants a voté pour ${who} ? ${who} est-${elu === 'élu' ? 'il' : 'elle'} ${elu} (plus de 50 %) ? Arrondis à 0,1 %.`, f,
        `Votes « pour » : ${pour.join(' + ')} = ${tot} sur ${N} votants, soit ${tot} ÷ ${N} × 100 ${pctText(f)}. ${f > 50 ? `${who} est ${elu}.` : `${who} n’est pas ${elu}.`}`),
      tableFig(['', ...q, 'Total'], [['Votants', ...nq.map(String), `${N}`], ['Pour', ...pp.map((p) => `${p} %`), '?']], { red: [[1, 4]] }))
    }),
  ],
  [
    // Les deux hospices
    () => {
      const s = SIMPSON[0], d = simpsonData()
      return T('Les deux hospices', pct(`Deux hospices soignent des cas légers et des cas graves. Saint-Jean (A) : ${d.okA[0]} guéris sur ${d.nA[0]} cas légers, ${d.okA[1]} sur ${d.nA[1]} cas graves. Sainte-Claire (B) : ${d.okB[0]} sur ${d.nB[0]} cas légers, ${d.okB[1]} sur ${d.nB[1]} cas graves. Saint-Jean guérit mieux dans chaque catégorie. Pourtant, son taux global de guérison est plus faible que celui de Sainte-Claire (B). De combien de points ? Arrondis à 0,1.`, d.gB - d.gA,
        `A : ${sum(d.okA)}/${sum(d.nA)} ≈ ${fmt(rnd(d.gA, 2))} %. B : ${sum(d.okB)}/${sum(d.nB)} ≈ ${fmt(rnd(d.gB, 2))} %. Écart ≈ ${fmt(rnd(d.gB - d.gA))} points. Saint-Jean reçoit surtout des cas graves : c'est le paradoxe de Simpson (${s.g.join(' / ')}).`),
      tableFig(['', 'Légers', 'Graves'], [['A', `${d.okA[0]}/${d.nA[0]}`, `${d.okA[1]}/${d.nA[1]}`], ['B', `${d.okB[0]}/${d.nB[0]}`, `${d.okB[1]}/${d.nB[1]}`]]))
    },
    // Le tableau effacé
    () => retry(() => {
      const c = pick(CTX2x2), N = pick([200, 400, 500, 800]), pr = randInt(3, 7) * 10, p00 = pick([20, 25, 40, 50, 60, 75]), pc = randInt(3, 7) * 10
      const R0 = (N * pr) / 100, a = (R0 * p00) / 100, C0 = (N * pc) / 100, b = C0 - a, R1 = N - R0
      if (!Number.isInteger(a) || !Number.isInteger(C0) || b <= 0 || b >= R1 || new Set([pr, p00, pc]).size < 3) return null
      const f = (b / R1) * 100
      if ([pr, p00, pc].includes(rnd(f, 1))) return null
      return T('Le tableau effacé', pct(`L'intendant a perdu le registre ${c.place === 'Au tournoi' ? 'du tournoi' : 'de l’enquête'} (${N} ${c.pop}). Il se souvient que ${pr} % étaient des ${c.rows[0].pl}, que ${p00} % des ${c.rows[0].pl} ${c.cols[0].q} et que ${pc} % de l'ensemble ${c.cols[0].q}. Quel pourcentage des ${c.rows[1].pl} ${c.cols[0].q} ? Arrondis à 0,1 %.`, f,
        `${cap(c.rows[0].pl)} : ${R0} ; parmi eux ${a} ${c.cols[0].q}. En tout ${C0} ${c.cols[0].q}, donc ${C0} − ${a} = ${b} chez les ${c.rows[1].pl} (qui sont ${R1}). ${b} ÷ ${R1} × 100 ${pctText(f)}.`),
      tableFig(['', c.cols[0].lab, c.cols[1].lab, 'Total'], [[c.rows[0].lab, '', '', ''], [c.rows[1].lab, '?', '', ''], ['Total', '', '', `${N}`]], { red: [[1, 1]], total: true }))
    }),
    // La prévision de la récolte (Mayer)
    () => retry(() => {
      const s: Scat = {
        desc: 'x désigne la pluie de printemps (en cm) et y la récolte de blé (en quintaux)', sign: 1, names: ['cm', 'qx'],
        win: { xMin: 0, xMax: 30, yMin: 0, yMax: 60, step: 2, labelStep: 6, ystep: 5, ylabelStep: 10 },
        gen: () => gridPts(6, range(4, 28, 2), (x) => 10 + 1.6 * x + randInt(-1, 1) * 5, 5, 0, 60, true),
        trendText: ['', ''],
      }
      const pts = s.gen(1)
      const g1 = [sum(pts.slice(0, 3).map((p) => p[0])) / 3, sum(pts.slice(0, 3).map((p) => p[1])) / 3]
      const g2 = [sum(pts.slice(3).map((p) => p[0])) / 3, sum(pts.slice(3).map((p) => p[1])) / 3]
      const a = (g2[1] - g1[1]) / (g2[0] - g1[0])
      if (!(a > 0.5)) return null
      const b = g1[1] - a * g1[0], x0 = pick([20, 22, 26, 30]), y = a * x0 + b
      return T('La prévision de la récolte', approx(`Le seigneur a noté, sur six années, la hauteur de pluie au printemps (x, en cm) et la récolte de blé (y, en quintaux) : ${ptsText(pts)}. Par la méthode de Mayer (points moyens G₁ des trois premières années rangées par x croissant, G₂ des trois autres), estime la récolte si l'on mesure ${x0} cm de pluie. Arrondis au dixième de quintal.`, y, 1,
        `G₁(${fmt(rnd(g1[0], 2))} ; ${fmt(rnd(g1[1], 2))}) et G₂(${fmt(rnd(g2[0], 2))} ; ${fmt(rnd(g2[1], 2))}). Coefficient directeur a ≈ ${fmt(rnd(a, 3))}, ordonnée à l'origine b ≈ ${fmt(rnd(b, 3))}. Pour x = ${x0} : y ≈ ${fmt(rnd(y))} quintaux.`),
      scatterFig(s, pts, { extra: [['G₁', rnd(g1[0], 2), rnd(g1[1], 2)], ['G₂', rnd(g2[0], 2), rnd(g2[1], 2)]] }))
    }),
  ],
]

export const CONTENT: SubjectContent | null = { tiers, upgrades, age }
