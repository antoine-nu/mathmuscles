// Probabilités (5e) : issues, événements, probabilité en situation d'équiprobabilité (dés, urnes, cartes,
// roues, sacs de jetons), événement certain / impossible, événement contraire, fréquences et probabilités.
import {
  F, choice, fmt, fraction, fresh, gcd, numeric, pick, randInt, shuffle, variants, withMeta,
  type Exercise, type Maker, type SubjectContent,
} from '../utils'
import { prenom } from '../contexts'
import type { FigPoint, FigSegment, Figure } from '../figure'

// ── Aides locales ───────────────────────────────────────────────────────
const RED = '#b8362f'
const GREEN = '#2f8f4e'
const BLUE = '#2f5fb3'
const GOLD = '#d9a020'
type Pt = [number, number]
const sum = (a: number[]) => a.reduce((t, v) => t + v, 0)
const range = (a: number, b: number) => Array.from({ length: Math.max(0, b - a + 1) }, (_, i) => a + i)
const s = (n: number) => (n > 1 ? 's' : '')
const isInt = (n: number) => Math.abs(n - Math.round(n)) < 1e-9
const isPrime = (n: number) => n > 1 && range(2, Math.floor(Math.sqrt(n))).every((d) => n % d !== 0)
/** « 6/8 = 3/4 » si la fraction se simplifie. */
const Fs = (n: number, d: number) => {
  const g = gcd(n, d) || 1
  return g > 1 && d / g !== 1 ? `${F(n, d)} = ${F(n / g, d / g)}` : g > 1 ? `${F(n, d)} = ${n / g}` : F(n, d)
}
const andList = (a: (string | number)[]) => (a.length === 1 ? `${a[0]}` : `${a.slice(0, -1).join(', ')} et ${a[a.length - 1]}`)
const rad = (d: number) => (d * Math.PI) / 180

function retry(draw: () => Exercise | null): Exercise {
  for (let i = 0; i < 5000; i++) {
    const ex = draw()
    if (ex) return ex
  }
  throw new Error('tirage introuvable')
}
const R = (draw: () => Exercise | null): Maker => () => retry(draw)
const model = (title: string, draw: () => Exercise | null): Maker => () => {
  const ex = retry(draw)
  return withMeta(ex, { title: ex.title ?? title })
}
const fig = (ex: Exercise, figure: Figure): Exercise => withMeta(ex, { figure })
/** Probabilité (fraction) : toute écriture égale est acceptée (fraction, décimal). */
const proba = (prompt: string, n: number, d: number, explanation: string) => fraction(prompt, n, d, { explanation })

/** Couleurs : nom masculin / féminin, teinte, lettre. */
const COLS = [
  { m: 'rouge', f: 'rouge', mp: 'rouges', fp: 'rouges', c: RED, l: 'R' },
  { m: 'bleu', f: 'bleue', mp: 'bleus', fp: 'bleues', c: BLUE, l: 'B' },
  { m: 'vert', f: 'verte', mp: 'verts', fp: 'vertes', c: GREEN, l: 'V' },
  { m: 'jaune', f: 'jaune', mp: 'jaunes', fp: 'jaunes', c: GOLD, l: 'J' },
]
type Col = (typeof COLS)[number]

// ── Schémas ─────────────────────────────────────────────────────────────
const P = (x: number, y: number): FigPoint => ({ x, y, hidden: true, label: '' })
function canvas(w = 320, h = 220) {
  const points: Record<string, FigPoint> = {}
  const segments: FigSegment[] = []
  const polygons: { pts: string[]; fill: string }[] = []
  const notes: { x: number; y: number; text: string }[] = []
  const circles: { c: string; r: number; color?: string }[] = []
  const curves: { pts: [number, number][]; color?: string; width?: number }[] = []
  let k = 0
  const pt = (x: number, y: number) => { const n = `q${k++}`; points[n] = P(x, y); return n }
  return {
    line(x1: number, y1: number, x2: number, y2: number, opts: Omit<FigSegment, 'a' | 'b'> = {}) { segments.push({ a: pt(x1, y1), b: pt(x2, y2), ...opts }) },
    poly(pts: Pt[], fill: string, outline = true) {
      const names = pts.map(([x, y]) => pt(x, y))
      polygons.push({ pts: names, fill })
      if (outline) names.forEach((n, i) => segments.push({ a: n, b: names[(i + 1) % names.length] }))
    },
    ball(x: number, y: number, r: number, fill: string, text?: string) {
      const names = range(0, 11).map((i) => pt(x + r * Math.cos((i * Math.PI) / 6), y + r * Math.sin((i * Math.PI) / 6)))
      polygons.push({ pts: names, fill })
      circles.push({ c: pt(x, y), r })
      if (text) notes.push({ x, y: y + 4, text })
    },
    curve(pts: Pt[], width = 2.2) { curves.push({ pts, width }) },
    note(x: number, y: number, text: string) { notes.push({ x, y, text }) },
    figure(caption = ''): Figure { return { w, h, points, segments, polygons, notes, circles, curves, caption } },
  }
}

/** Urne (ou sac) contenant des boules colorées, chacune marquée d'une lettre ou d'un nombre. */
function urnFigure(balls: { c: string; t: string }[], label?: string, cx = 160, w = 320, base?: ReturnType<typeof canvas>): ReturnType<typeof canvas> {
  const c = base ?? canvas(w)
  const n = balls.length, perRow = n <= 8 ? 4 : n <= 15 ? 5 : 6, rows = Math.ceil(n / perRow)
  const r = Math.min(13, 130 / (2 * perRow + 1)), W = perRow * 2 * r + 30, H = rows * 2 * r + 40
  const top = 200 - H, left = cx - W / 2, right = cx + W / 2
  // contour du bocal : col, épaules, fond
  c.curve([[cx - W / 4, top - 14], [cx - W / 4, top], [left, top + 16], [left, 192], [left + 8, 200], [right - 8, 200], [right, 192], [right, top + 16], [cx + W / 4, top], [cx + W / 4, top - 14]])
  balls.forEach((b, i) => {
    const row = Math.floor(i / perRow), col = i % perRow, k = Math.min(perRow, n - row * perRow)
    const x = cx - (k * 2 * r) / 2 + r + col * 2 * r, y = 200 - 8 - r - row * 2 * r
    c.ball(x, y, r - 1, b.c, b.t)
  })
  if (label) c.note(cx, top - 22, label)
  return c
}

/** Roue partagée en secteurs (en degrés), en partant du haut, dans le sens des aiguilles d'une montre. */
function wheelFigure(sectors: { deg: number; color: string; text: string }[], arrow = true): Figure {
  const c = canvas()
  const cx = 160, cy = 110, R0 = 92
  const at = (rr: number, d: number): Pt => [cx + rr * Math.cos(rad(d)), cy - rr * Math.sin(rad(d))]
  let start = 90
  sectors.forEach((sct) => {
    const steps = Math.max(2, Math.ceil(sct.deg / 8)), pts: Pt[] = [[cx, cy]]
    for (let t = 0; t <= steps; t++) pts.push(at(R0, start - (sct.deg * t) / steps))
    c.poly(pts, sct.color, false)
    c.line(cx, cy, ...at(R0, start))
    const lab = at(sct.deg < 40 ? R0 * 0.75 : R0 * 0.6, start - sct.deg / 2)
    c.note(lab[0], lab[1] + 5, sct.text)
    start -= sct.deg
  })
  const circle: Pt[] = range(0, 72).map((i) => at(R0, i * 5))
  c.curve(circle, 1.8)
  if (arrow) {
    c.poly([[cx - 7, cy - R0 - 14], [cx + 7, cy - R0 - 14], [cx, cy - R0 + 4]], '#333333')
  }
  return c.figure(arrow ? 'La flèche indique le secteur obtenu.' : '')
}

/** Tableau à double entrée pour deux dés (valeurs calculées par f). */
function tableFigure(n: number, m: number, f: (i: number, j: number) => number, head: string, highlight?: (v: number) => boolean): Figure {
  const c = canvas()
  const cw = Math.min(40, 300 / (m + 1)), ch = Math.min(28, 200 / (n + 1)), x0 = (320 - cw * (m + 1)) / 2, y0 = 10
  for (let i = 1; i <= n; i++) for (let j = 1; j <= m; j++) {
    const v = f(i, j), x = x0 + j * cw, y = y0 + i * ch
    if (highlight?.(v)) c.poly([[x, y], [x + cw, y], [x + cw, y + ch], [x, y + ch]], GOLD, false)
    c.note(x + cw / 2, y + ch / 2 + 5, String(v))
  }
  for (let i = 0; i <= n + 1; i++) c.line(x0, y0 + i * ch, x0 + (m + 1) * cw, y0 + i * ch)
  for (let j = 0; j <= m + 1; j++) c.line(x0 + j * cw, y0, x0 + j * cw, y0 + (n + 1) * ch)
  c.note(x0 + cw / 2, y0 + ch / 2 + 5, head)
  for (let j = 1; j <= m; j++) c.note(x0 + j * cw + cw / 2, y0 + ch / 2 + 5, String(j))
  for (let i = 1; i <= n; i++) c.note(x0 + cw / 2, y0 + i * ch + ch / 2 + 5, String(i))
  const f0 = c.figure()
  return { ...f0, h: Math.ceil(y0 + (n + 1) * ch + 12) }
}

/** Diagramme en barres (effectifs écrits au-dessus). */
function barsFigure(cats: string[], vals: number[]): Figure {
  const c = canvas()
  const mx = Math.max(...vals), H = 140, bw = Math.min(34, 240 / cats.length - 10), step = 260 / cats.length, x0 = 40
  c.line(30, 190, 300, 190)
  cats.forEach((cat, i) => {
    const h = (vals[i] / mx) * H, x = x0 + i * step + (step - bw) / 2
    c.poly([[x, 190], [x + bw, 190], [x + bw, 190 - h], [x, 190 - h]], BLUE)
    c.note(x + bw / 2, 190 - h - 5, String(vals[i]))
    c.note(x + bw / 2, 207, cat)
  })
  return c.figure()
}

/** Patron d'un dé (croix de 6 faces) avec les nombres écrits sur les faces. */
function dieNetFigure(faces: (string | number)[]): Figure {
  const c = canvas()
  const u = 48, x0 = 64, y0 = 14
  const cells: Pt[] = [[1, 0], [0, 1], [1, 1], [2, 1], [3, 1], [1, 2]]
  cells.forEach(([i, j], k) => {
    c.poly([[x0 + i * u, y0 + j * u], [x0 + (i + 1) * u, y0 + j * u], [x0 + (i + 1) * u, y0 + (j + 1) * u], [x0 + i * u, y0 + (j + 1) * u]], GOLD)
    c.note(x0 + i * u + u / 2, y0 + j * u + u / 2 + 6, String(faces[k]))
  })
  return { ...c.figure('Patron du dé : chaque case est une face.'), h: 180 }
}

// ── Données ─────────────────────────────────────────────────────────────
const MOTS = ['CHEVALIER', 'FORTERESSE', 'DRAGON', 'PARCHEMIN', 'CATAPULTE', 'ARBALETE', 'ABRACADABRA', 'MATHEMATIQUES', 'PROBABILITE', 'TOURNOI', 'BANNIERE', 'ALCHIMISTE']
const VOY = 'AEIOUY'
type DieEv = { txt: string; ok: (f: number) => boolean }
const dieEvents = (n: number): DieEv[] => {
  const k = randInt(2, n - 1), m = pick([3, 4, 5].filter((x) => x < n))
  return [
    { txt: 'un nombre pair', ok: (f) => f % 2 === 0 },
    { txt: 'un nombre impair', ok: (f) => f % 2 === 1 },
    { txt: `un multiple de ${m}`, ok: (f) => f % m === 0 },
    { txt: `un nombre inférieur ou égal à ${k}`, ok: (f) => f <= k },
    { txt: `un nombre strictement supérieur à ${k}`, ok: (f) => f > k },
    { txt: 'un nombre premier', ok: isPrime },
    { txt: `un diviseur de ${n}`, ok: (f) => n % f === 0 },
  ]
}

// ═══ Palier 1 ═══════════════════════════════════════════════════════════
const issues1 = variants(
  fresh(R(() => {
    const n = pick([6, 8, 10, 12, 20]), ev = pick(dieEvents(n)), fav = range(1, n).filter(ev.ok)
    if (fav.length < 1 || fav.length === n) return null
    return numeric(`On lance un dé équilibré à ${n} faces numérotées de 1 à ${n}. Combien d'issues réalisent l'événement « obtenir ${ev.txt} » ?`, fav.length, {
      explanation: `Les issues sont 1, 2, …, ${n}. Celles qui réalisent l'événement : ${andList(fav)}. Il y en a ${fav.length}.`,
    })
  })),
  fresh(R(() => {
    const n = randInt(10, 30), m = pick([3, 4, 5, 7]), fav = range(1, n).filter((x) => x % m === 0)
    return numeric(`Une urne contient ${n} boules numérotées de 1 à ${n}. On tire une boule au hasard. Combien d'issues réalisent l'événement « obtenir un multiple de ${m} » ?`, fav.length, {
      explanation: `Les multiples de ${m} entre 1 et ${n} : ${andList(fav)}. Il y en a ${fav.length}.`,
    })
  })),
  fresh(() => {
    const w = pick(MOTS), voy = randInt(0, 1), cnt = w.split('').filter((ch) => VOY.includes(ch) === (voy === 0)).length
    return numeric(`Chaque lettre du mot ${w} est écrite sur un jeton, et on tire un jeton au hasard. Combien de jetons réalisent l'événement « obtenir une ${voy === 0 ? 'voyelle' : 'consonne'} » ?`, cnt, {
      explanation: `${w} a ${w.length} lettres. ${voy === 0 ? 'Voyelles' : 'Consonnes'} : ${w.split('').filter((ch) => VOY.includes(ch) === (voy === 0)).join(', ')}, soit ${cnt} jetons.`,
    })
  }),
  fresh(R(() => {
    const n = pick([6, 8, 10, 12]), k = randInt(2, n - 2), fav = range(k + 1, n)
    return fig(numeric(`On fait tourner cette roue partagée en ${n} secteurs identiques numérotés de 1 à ${n}. Combien d'issues réalisent l'événement « obtenir un nombre supérieur à ${k} » ?`, fav.length, {
      explanation: `Les nombres supérieurs à ${k} sont ${andList(fav)} : ${fav.length} issues.`,
    }), wheelFigure(range(1, n).map((i) => ({ deg: 360 / n, color: [GOLD, BLUE, GREEN, RED][i % 4], text: String(i) }))))
  })),
)

const de1 = variants(
  ...[0, 1, 2, 3, 4, 5].map((t) => R(() => {
    const evs = dieEvents(6), face = randInt(1, 6)
    const ev = t === 0 ? { txt: `le ${face}`, ok: (f: number) => f === face } : evs[t === 1 ? 0 : t === 2 ? 2 : t === 3 ? 3 : t === 4 ? 4 : 5]
    const fav = range(1, 6).filter(ev.ok)
    if (fav.length < 1 || fav.length > 5) return null
    return proba(`On lance un dé équilibré à six faces. Quelle est la probabilité d'obtenir ${ev.txt} ?`, fav.length, 6,
      `Les 6 issues sont équiprobables. Issues favorables : ${andList(fav)} (${fav.length}). Probabilité : ${Fs(fav.length, 6)}.`)
  })),
)

const ballsOf = (counts: number[], cols: Col[]) => shuffle(counts.flatMap((n, i) => Array(n).fill(0).map(() => ({ c: cols[i].c, t: cols[i].l }))))
const urne1 = variants(
  () => {
    const r = randInt(1, 9), b = randInt(1, 9), ask = randInt(0, 1), [cA, cB] = shuffle(COLS).slice(0, 2), n = ask === 0 ? r : b
    return proba(`Une urne contient ${r} boule${s(r)} ${r > 1 ? cA.fp : cA.f} et ${b} boule${s(b)} ${b > 1 ? cB.fp : cB.f}. On tire une boule au hasard. Quelle est la probabilité qu'elle soit ${ask === 0 ? cA.f : cB.f} ?`, n, r + b,
      `Il y a ${r} + ${b} = ${r + b} boules, toutes ont la même chance d'être tirées. Probabilité : ${Fs(n, r + b)}.`)
  },
  () => {
    const cols = shuffle(COLS).slice(0, 3), cnt = cols.map(() => randInt(1, 7)), k = randInt(0, 2), tot = sum(cnt)
    return proba(`Un sac contient ${cnt.map((n, i) => `${n} jeton${s(n)} ${n > 1 ? cols[i].mp : cols[i].m}`).join(', ').replace(/, ([^,]*)$/, ' et $1')}. On tire un jeton au hasard. Quelle est la probabilité qu'il soit ${cols[k].m} ?`, cnt[k], tot,
      `Il y a ${cnt.join(' + ')} = ${tot} jetons. Jetons ${cols[k].mp} : ${cnt[k]}. Probabilité : ${Fs(cnt[k], tot)}.`)
  },
  () => {
    const cols = shuffle(COLS).slice(0, 3), cnt = cols.map(() => randInt(1, 5)), k = randInt(0, 2), tot = sum(cnt)
    return fig(proba(`On tire une boule au hasard dans cette urne (R = rouge, B = bleue, V = verte, J = jaune). Quelle est la probabilité de tirer une boule ${cols[k].f} ?`, cnt[k], tot,
      `On compte : ${cnt.map((n, i) => `${n} ${n > 1 ? cols[i].fp : cols[i].f}`).join(', ')}, soit ${tot} boules. Probabilité : ${Fs(cnt[k], tot)}.`), urnFigure(ballsOf(cnt, cols)).figure())
  },
  () => {
    const g = randInt(2, 12), b = randInt(2, 12)
    return proba(`Dans une classe de ${g + b} élèves, il y a ${g} filles. On tire au sort un élève pour être délégué. Quelle est la probabilité que ce soit un garçon ?`, b, g + b,
      `Garçons : ${g + b} − ${g} = ${b}. Chaque élève a la même chance : ${Fs(b, g + b)}.`)
  },
)

const VOCAB = ['impossible', 'certain', 'ni certain ni impossible']
const vocab1 = variants(
  () => {
    const kind = randInt(0, 2), n = pick([6, 8, 12])
    const [txt, ans, why] = kind === 0 ? [`obtenir ${n + randInt(1, 5)}`, 0, `aucune face ne porte ce nombre`]
      : kind === 1 ? [`obtenir un nombre inférieur ou égal à ${n}`, 1, `toutes les faces conviennent`]
        : [`obtenir ${randInt(1, n)}`, 2, `une seule face convient, mais pas toutes`]
    return choice(`On lance un dé à ${n} faces numérotées de 1 à ${n}. L'événement « ${txt} » est :`, VOCAB[ans], VOCAB.filter((_, i) => i !== ans), `L'événement est ${VOCAB[ans]} : ${why}.`)
  },
  () => {
    const kind = randInt(0, 2), [cA, cB, cC] = shuffle(COLS), r = randInt(2, 8), b = randInt(2, 8)
    const [txt, ans, why] = kind === 0 ? [`tirer une boule ${cC.f}`, 0, `il n'y a aucune boule ${cC.f}`]
      : kind === 1 ? [`tirer une boule ${cA.f} ou ${cB.f}`, 1, 'toutes les boules sont de l’une de ces deux couleurs']
        : [`tirer une boule ${cB.f}`, 2, `il y a des boules ${cB.fp}, mais aussi d'autres`]
    return choice(`Une urne contient ${r} boules ${cA.fp} et ${b} boules ${cB.fp}. On tire une boule. L'événement « ${txt} » est :`, VOCAB[ans], VOCAB.filter((_, i) => i !== ans), `L'événement est ${VOCAB[ans]} : ${why}.`)
  },
  () => {
    const kind = randInt(0, 2), n = pick([4, 6, 8])
    const [txt, ans, why] = kind === 0 ? ['obtenir un nombre négatif', 0, 'tous les numéros sont positifs']
      : kind === 1 ? [`obtenir un nombre entre 1 et ${n}`, 1, 'tous les secteurs conviennent']
        : ['obtenir un nombre pair', 2, 'certains secteurs sont pairs, d’autres impairs']
    return choice(`Une roue a ${n} secteurs numérotés de 1 à ${n}. On la fait tourner. L'événement « ${txt} » est :`, VOCAB[ans], VOCAB.filter((_, i) => i !== ans), `L'événement est ${VOCAB[ans]} : ${why}.`)
  },
  () => {
    const kind = randInt(0, 2)
    const [txt, ans, why] = kind === 0 ? ['tirer le 15 de cœur', 0, 'il n’existe pas de 15 dans un jeu de cartes']
      : kind === 1 ? ['tirer une carte rouge ou noire', 1, 'toutes les cartes sont rouges ou noires']
        : [pick(['tirer un roi', 'tirer un pique', 'tirer une carte rouge']), 2, 'certaines cartes conviennent, d’autres non']
    return choice(`On tire une carte au hasard dans un jeu de 32 cartes. L'événement « ${txt} » est :`, VOCAB[ans], VOCAB.filter((_, i) => i !== ans), `L'événement est ${VOCAB[ans]} : ${why}.`)
  },
)

// ═══ Palier 2 ═══════════════════════════════════════════════════════════
const roue2 = variants(
  ...[0, 1, 2, 3].map((ask) => R(() => {
    const k = pick([6, 8, 10, 12]), cnt = [randInt(1, k - 3), randInt(1, k - 3), randInt(1, k - 3)]
    cnt.push(k - sum(cnt))
    if (cnt[3] < 1) return null
    const ring = shuffle(cnt.flatMap((n, i) => Array(n).fill(i)))
    const ci = randInt(0, 3), cj = (ci + randInt(1, 3)) % 4
    const fav = ask === 0 ? cnt[ci] : ask === 1 ? k - cnt[ci] : cnt[ci] + cnt[cj]
    if (ask === 3) {
      const nums = range(1, k)
      return fig(proba(`Cette roue est partagée en ${k} secteurs identiques numérotés de 1 à ${k}. On la fait tourner. Quelle est la probabilité d'obtenir un nombre ${ci % 2 === 0 ? 'pair' : 'impair'} ?`, k / 2, k,
        `${k} issues équiprobables, dont ${k / 2} ${ci % 2 === 0 ? 'paires' : 'impaires'}. Probabilité : ${Fs(k / 2, k)}.`), wheelFigure(nums.map((i) => ({ deg: 360 / k, color: COLS[i % 4].c, text: String(i) }))))
    }
    const txt = ask === 0 ? `de tomber sur un secteur ${COLS[ci].m}` : ask === 1 ? `de ne pas tomber sur un secteur ${COLS[ci].m}` : `de tomber sur un secteur ${COLS[ci].m} ou ${COLS[cj].m}`
    return fig(proba(`On fait tourner cette roue partagée en ${k} secteurs identiques (R = rouge, B = bleu, V = vert, J = jaune). Quelle est la probabilité ${txt} ?`, fav, k,
      `Les ${k} secteurs sont équiprobables. Secteurs favorables : ${fav}. Probabilité : ${Fs(fav, k)}.`), wheelFigure(ring.map((c) => ({ deg: 360 / k, color: COLS[c].c, text: COLS[c].l }))))
  })),
)

const CARDS32 = [
  { txt: 'un roi', n: 4, why: 'il y a 4 rois' }, { txt: 'un cœur', n: 8, why: 'il y a 8 cœurs (7, 8, 9, 10, valet, dame, roi, as)' },
  { txt: 'une figure (valet, dame ou roi)', n: 12, why: 'il y a 3 figures dans chacune des 4 couleurs' }, { txt: 'une carte rouge', n: 16, why: 'les cœurs et les carreaux sont rouges : 16 cartes' },
  { txt: 'un as noir', n: 2, why: 'l’as de pique et l’as de trèfle' }, { txt: 'la dame de cœur', n: 1, why: 'une seule carte convient' },
]
const CARDS52 = [
  { txt: 'un roi', n: 4, why: 'il y a 4 rois' }, { txt: 'un pique', n: 13, why: 'il y a 13 piques' },
  { txt: 'une figure (valet, dame ou roi)', n: 12, why: 'il y a 3 figures dans chacune des 4 couleurs' }, { txt: 'une carte noire', n: 26, why: 'piques et trèfles : 26 cartes' },
  { txt: 'un as', n: 4, why: 'il y a 4 as' }, { txt: 'un 7 rouge', n: 2, why: 'le 7 de cœur et le 7 de carreau' },
]
const cartes2 = variants(
  () => {
    const e = pick(CARDS32)
    return proba(`On tire une carte au hasard dans un jeu de 32 cartes. Quelle est la probabilité de tirer ${e.txt} ?`, e.n, 32, `32 issues équiprobables ; ${e.why}. Probabilité : ${Fs(e.n, 32)}.`)
  },
  () => {
    const e = pick(CARDS52)
    return proba(`On tire une carte au hasard dans un jeu de 52 cartes. Quelle est la probabilité de tirer ${e.txt} ?`, e.n, 52, `52 issues équiprobables ; ${e.why}. Probabilité : ${Fs(e.n, 52)}.`)
  },
  () => {
    const e = pick(CARDS32.slice(0, 5))
    return proba(`${prenom()} tire une carte au hasard dans un jeu de 32 cartes. Quelle est la probabilité que ce ne soit pas ${e.txt} ?`, 32 - e.n, 32,
      `Probabilité de tirer ${e.txt} : ${F(e.n, 32)} (${e.why}). Événement contraire : 1 − ${F(e.n, 32)} = ${Fs(32 - e.n, 32)}.`)
  },
)

const contraire2 = variants(
  R(() => {
    const d = pick([5, 7, 8, 9, 10, 11, 12]), n = randInt(1, d - 1)
    return proba(`La probabilité d'un événement A est ${F(n, d)}. Quelle est la probabilité de l'événement contraire « non A » ?`, d - n, d, `P(non A) = 1 − P(A) = ${F(d, d)} − ${F(n, d)} = ${Fs(d - n, d)}.`)
  }),
  () => {
    const p = randInt(1, 19) * 5
    return numeric(`La météo annonce que la probabilité qu'il pleuve demain est ${fmt(p / 100)}. Quelle est la probabilité qu'il ne pleuve pas ?`, (100 - p) / 100, { explanation: `« Ne pas pleuvoir » est l'événement contraire : 1 − ${fmt(p / 100)} = ${fmt((100 - p) / 100)}.` })
  },
  R(() => {
    const d = pick([4, 5, 6, 8, 10]), n = randInt(1, d - 1), who = prenom()
    return proba(`La probabilité que ${who} gagne la partie de dames est ${F(n, d)}. Il n'y a pas de match nul. Quelle est la probabilité que ${who} perde ?`, d - n, d, `Perdre est l'événement contraire de gagner : 1 − ${F(n, d)} = ${Fs(d - n, d)}.`)
  }),
  () => {
    const p = randInt(2, 18) * 5
    return numeric(`Un archer touche la cible avec une probabilité de ${fmt(p / 100)}. Quelle est la probabilité qu'il manque la cible ?`, (100 - p) / 100, { explanation: `Manquer est l'événement contraire de toucher : 1 − ${fmt(p / 100)} = ${fmt((100 - p) / 100)}.` })
  },
)

const lettres2 = variants(
  R(() => {
    const w = pick(MOTS), letters = [...new Set(w.split(''))].filter((l) => w.split(l).length - 1 >= 2), L = pick(letters.length ? letters : [w[0]]), k = w.split(L).length - 1
    return proba(`Chaque lettre du mot ${w} est écrite sur un carton. On tire un carton au hasard. Quelle est la probabilité d'obtenir la lettre ${L} ?`, k, w.length, `Le mot a ${w.length} lettres, dont ${k} « ${L} ». Probabilité : ${Fs(k, w.length)}.`)
  }),
  () => {
    const w = pick(MOTS), v = w.split('').filter((ch) => VOY.includes(ch)).length
    return proba(`Chaque lettre du mot ${w} est écrite sur un carton. On tire un carton au hasard. Quelle est la probabilité d'obtenir une voyelle ?`, v, w.length, `Voyelles : ${w.split('').filter((ch) => VOY.includes(ch)).join(', ')} (${v} sur ${w.length} lettres). Probabilité : ${Fs(v, w.length)}.`)
  },
  () => {
    const w = pick(MOTS), v = w.split('').filter((ch) => !VOY.includes(ch)).length
    return proba(`Les lettres du mot ${w} sont écrites sur des jetons placés dans un sac. On tire un jeton au hasard. Quelle est la probabilité d'obtenir une consonne ?`, v, w.length, `Consonnes : ${w.split('').filter((ch) => !VOY.includes(ch)).join(', ')} (${v} sur ${w.length} lettres). Probabilité : ${Fs(v, w.length)}.`)
  },
)

// ═══ Palier 3 ═══════════════════════════════════════════════════════════
const urne3 = variants(
  ...[0, 1, 2].map((ask) => () => {
    const cols = shuffle(COLS).slice(0, 3), cnt = cols.map(() => randInt(1, 6)), tot = sum(cnt), i = randInt(0, 2), j = (i + randInt(1, 2)) % 3
    const [txt, fav, why] = ask === 0 ? [`ne soit ni ${cols[i].f} ni ${cols[j].f}`, cnt[3 - i - j], `il reste les boules ${cols[3 - i - j].fp}`]
      : ask === 1 ? [`soit ${cols[i].f} ou ${cols[j].f}`, cnt[i] + cnt[j], `${cnt[i]} + ${cnt[j]} boules conviennent`]
        : [`ne soit pas ${cols[i].f}`, tot - cnt[i], `${tot} − ${cnt[i]} boules ne sont pas ${cols[i].fp}`]
    return fig(proba(`On tire une boule au hasard dans cette urne (R = rouge, B = bleue, V = verte, J = jaune). Quelle est la probabilité que la boule ${txt} ?`, fav, tot,
      `${tot} boules en tout ; ${why}, soit ${fav}. Probabilité : ${Fs(fav, tot)}.`), urnFigure(ballsOf(cnt, cols)).figure())
  }),
)

const freq3 = variants(
  () => {
    const N = pick([20, 25, 40, 50, 80, 100]), k = randInt(Math.round(N * 0.3), Math.round(N * 0.7))
    return proba(`On lance une pièce de monnaie ${N} fois : on obtient ${k} fois « pile ». Quelle est la fréquence d'apparition de « pile » ?`, k, N, `Fréquence = effectif ÷ nombre de lancers = ${Fs(k, N)}${isInt((k / N) * 100) ? ` = ${fmt(k / N)}` : ''}.`)
  },
  () => {
    const N = pick([30, 60, 120]), k = randInt(Math.round(N / 10), Math.round(N / 4)), face = randInt(1, 6)
    return proba(`${prenom()} lance un dé ${N} fois et obtient ${k} fois le ${face}. Quelle est la fréquence d'apparition du ${face} ?`, k, N, `Fréquence = ${Fs(k, N)}. (La probabilité est ${F(1, 6)} ; la fréquence observée en est proche.)`)
  },
  R(() => {
    const cnt = range(1, 6).map(() => randInt(5, 18)), N = sum(cnt), face = randInt(1, 6)
    if (![20, 25, 40, 50, 60, 75, 80, 100].includes(N)) return null
    return fig(proba(`Ce diagramme donne les résultats de ${N} lancers d'un dé. Quelle est la fréquence d'apparition du ${face} ?`, cnt[face - 1], N, `Le ${face} est sorti ${cnt[face - 1]} fois sur ${N} lancers : fréquence ${Fs(cnt[face - 1], N)}.`), barsFigure(range(1, 6).map(String), cnt))
  }),
  R(() => {
    const cnt = range(1, 6).map(() => randInt(4, 15)), N = sum(cnt), even = cnt[1] + cnt[3] + cnt[5]
    if (N % 10 !== 0) return null
    return fig(proba(`Ce diagramme donne les résultats de ${N} lancers d'un dé. Quelle est la fréquence de l'événement « obtenir un nombre pair » ?`, even, N, `Nombres pairs : ${cnt[1]} + ${cnt[3]} + ${cnt[5]} = ${even} fois sur ${N} : fréquence ${Fs(even, N)}.`), barsFigure(range(1, 6).map(String), cnt))
  }),
)

const desN3 = variants(
  ...[8, 10, 12, 20].map((n) => R(() => {
    const ev = pick(dieEvents(n)), fav = range(1, n).filter(ev.ok)
    if (fav.length < 2 || fav.length >= n - 1) return null
    return proba(`On lance un dé équilibré à ${n} faces numérotées de 1 à ${n}. Quelle est la probabilité d'obtenir ${ev.txt} ?`, fav.length, n,
      `${n} issues équiprobables. Favorables : ${andList(fav)} (${fav.length}). Probabilité : ${Fs(fav.length, n)}.`)
  })),
)

const inverse3 = variants(
  fresh(R(() => {
    const d = pick([3, 4, 5, 6, 8, 10]), n = randInt(1, d - 1), k = randInt(2, 6), T = d * k
    if (gcd(n, d) !== 1) return null
    return numeric(`Un sac contient ${T} jetons. La probabilité de tirer un jeton rouge est ${F(n, d)}. Combien y a-t-il de jetons rouges ?`, n * k, { explanation: `${F(n, d)} de ${T} : ${T} ÷ ${d} × ${n} = ${n * k} jetons rouges.` })
  })),
  fresh(R(() => {
    const d = pick([3, 4, 5, 6, 8, 10]), n = randInt(1, d - 1), k = randInt(2, 6)
    if (gcd(n, d) !== 1) return null
    return numeric(`Dans une urne, il y a ${n * k} boules bleues. La probabilité de tirer une boule bleue est ${F(n, d)}. Combien y a-t-il de boules en tout ?`, d * k, { explanation: `Les boules bleues représentent ${F(n, d)} du total : ${n} part${s(n)} = ${n * k} boules, donc une part = ${k} et le total = ${d} × ${k} = ${d * k} boules.` })
  })),
  fresh(R(() => {
    const d = pick([3, 4, 5, 6, 8]), n = randInt(1, d - 1), k = randInt(2, 6)
    if (gcd(n, d) !== 1) return null
    return numeric(`Un sac ne contient que des jetons rouges et bleus. Il y a ${n * k} jetons rouges, et la probabilité de tirer un jeton rouge est ${F(n, d)}. Combien y a-t-il de jetons bleus ?`, (d - n) * k, { explanation: `Total : ${n * k} ÷ ${n} × ${d} = ${d * k} jetons. Bleus : ${d * k} − ${n * k} = ${(d - n) * k}.` })
  })),
)

// ═══ Palier 4 ═══════════════════════════════════════════════════════════
const SECTORS = [[180, 90, 90], [90, 90, 180], [120, 120, 120], [180, 120, 60], [90, 135, 135], [60, 120, 180], [150, 150, 60], [45, 135, 180], [72, 144, 144], [210, 90, 60]]
const roueAngles4 = variants(
  ...[0, 1, 2].map((ask) => () => {
    const angles = pick(SECTORS), cols = shuffle(COLS).slice(0, 3), i = randInt(0, 2), j = (i + 1) % 3
    const fav = ask === 0 ? angles[i] : ask === 1 ? 360 - angles[i] : angles[i] + angles[j]
    const txt = ask === 0 ? `de tomber sur le ${cols[i].m}` : ask === 1 ? `de ne pas tomber sur le ${cols[i].m}` : `de tomber sur le ${cols[i].m} ou le ${cols[j].m}`
    return fig(proba(`Une roue est partagée en trois secteurs : ${angles.map((a, k) => `${cols[k].m} (${a}°)`).join(', ').replace(/, ([^,]*)$/, ' et $1')}. La probabilité de tomber sur un secteur est proportionnelle à son angle. Quelle est la probabilité ${txt} ?`, fav, 360,
      `L'angle favorable mesure ${fav}° sur 360° : probabilité ${Fs(fav, 360)}.`), wheelFigure(angles.map((a, k) => ({ deg: a, color: cols[k].c, text: `${cols[k].l} ${a}°` }))))
  }),
)

const attendu4 = variants(
  () => {
    const N = randInt(2, 20) * 60, face = randInt(1, 6)
    return numeric(`On lance un dé équilibré ${N} fois. Environ combien de fois peut-on s'attendre à obtenir le ${face} ?`, N / 6, { explanation: `La probabilité d'obtenir le ${face} est ${F(1, 6)}. Sur ${N} lancers : ${N} × ${F(1, 6)} = ${N / 6} fois environ.` })
  },
  R(() => {
    const d = pick([4, 5, 8, 10]), n = randInt(1, d - 1), N = d * randInt(10, 60)
    if (gcd(n, d) !== 1) return null
    return numeric(`La probabilité qu'une roue s'arrête sur le rouge est ${F(n, d)}. On la fait tourner ${N} fois. Environ combien de fois s'arrêtera-t-elle sur le rouge ?`, (N * n) / d, { explanation: `${N} × ${F(n, d)} = ${N} ÷ ${d} × ${n} = ${(N * n) / d} fois environ.` })
  }),
  () => {
    const N = randInt(1, 25) * 40
    return numeric(`On lance une pièce équilibrée ${N} fois. Environ combien de « face » peut-on s'attendre à obtenir ?`, N / 2, { explanation: `P(face) = ${F(1, 2)} : ${N} × ${F(1, 2)} = ${N / 2} fois environ.` })
  },
  R(() => {
    const r = randInt(1, 6), b = randInt(1, 8), T = r + b, N = T * randInt(5, 40)
    return numeric(`Une urne contient ${r} boule${s(r)} rouge${s(r)} et ${b} boule${s(b)} noire${s(b)}. On tire une boule, on note sa couleur, on la remet, et on recommence ${N} fois. Environ combien de fois tirera-t-on une boule rouge ?`, (N * r) / T, { explanation: `P(rouge) = ${F(r, T)}. Sur ${N} tirages : ${N} × ${F(r, T)} = ${(N * r) / T} fois environ.` })
  }),
)

const compare4 = variants(
  ...[0, 1].map((withFig) => R(() => {
    const rA = randInt(1, 6), nA = randInt(1, 8), rB = randInt(1, 6), nB = randInt(1, 8)
    const pA = rA / (rA + nA), pB = rB / (rB + nB)
    if (rA === rB && nA === nB) return null
    const good = Math.abs(pA - pB) < 1e-9 ? 'Les chances sont égales' : pA > pB ? 'Urne A' : 'Urne B'
    if (good === 'Les chances sont égales' && Math.random() < 0.5) return null
    const ex = choice(`Pour gagner, il faut tirer une boule rouge. L'urne A contient ${rA} rouge${s(rA)} et ${nA} noire${s(nA)} ; l'urne B contient ${rB} rouge${s(rB)} et ${nB} noire${s(nB)}. Dans quelle urne vaut-il mieux tirer ?`, good,
      ['Urne A', 'Urne B', 'Les chances sont égales'],
      `P(rouge) dans A = ${F(rA, rA + nA)} ≈ ${fmt(Math.round(pA * 100) / 100)} ; dans B = ${F(rB, rB + nB)} ≈ ${fmt(Math.round(pB * 100) / 100)}. ${good === 'Les chances sont égales' ? 'Les deux probabilités sont égales.' : `La plus grande est celle de l'urne ${good === 'Urne A' ? 'A' : 'B'}.`} (Attention : ce n'est pas le nombre de rouges qui compte, mais leur proportion.)`)
    if (!withFig) return ex
    const c = canvas()
    urnFigure(shuffle([...Array(rA).fill({ c: RED, t: 'R' }), ...Array(nA).fill({ c: '#333333', t: 'N' })]), 'urne A', 85, 320, c)
    urnFigure(shuffle([...Array(rB).fill({ c: RED, t: 'R' }), ...Array(nB).fill({ c: '#333333', t: 'N' })]), 'urne B', 235, 320, c)
    return fig(ex, c.figure())
  })),
)

const modif4 = variants(
  () => {
    const r = randInt(2, 8), b = randInt(2, 8), k = randInt(1, 5), tot = r + k + b
    return proba(`Un sac contient ${r} jetons rouges et ${b} jetons bleus. On ajoute ${k} jeton${s(k)} rouge${s(k)}. On tire alors un jeton au hasard. Quelle est la probabilité qu'il soit rouge ?`, r + k, tot, `Après l'ajout : ${r + k} rouges et ${b} bleus, soit ${tot} jetons. Probabilité : ${Fs(r + k, tot)}.`)
  },
  R(() => {
    const r = randInt(3, 9), b = randInt(2, 8), k = randInt(1, r - 1), tot = r - k + b
    return proba(`Une urne contient ${r} boules rouges et ${b} boules blanches. On retire ${k} boule${s(k)} rouge${s(k)}. On tire alors une boule au hasard. Quelle est la probabilité qu'elle soit blanche ?`, b, tot, `Il reste ${r - k} rouges et ${b} blanches, soit ${tot} boules. Probabilité : ${Fs(b, tot)}.`)
  }),
  () => {
    const n = pick([10, 12, 20, 15]), k = randInt(2, n - 3)
    return proba(`Des boules numérotées de 1 à ${n} sont dans une urne. On retire toutes les boules dont le numéro est inférieur ou égal à ${k}, puis on tire une boule parmi celles qui restent. Quelle est la probabilité que son numéro soit pair ?`, range(k + 1, n).filter((x) => x % 2 === 0).length, n - k,
      `Il reste les boules ${k + 1} à ${n}, soit ${n - k} boules. Paires : ${andList(range(k + 1, n).filter((x) => x % 2 === 0))} (${range(k + 1, n).filter((x) => x % 2 === 0).length}). Probabilité : ${Fs(range(k + 1, n).filter((x) => x % 2 === 0).length, n - k)}.`)
  },
)

// ═══ Palier 5 ═══════════════════════════════════════════════════════════
const deuxDes5 = variants(
  R(() => {
    const k = randInt(3, 11), fav = sum(range(1, 6).map((i) => range(1, 6).filter((j) => i + j === k).length))
    return fig(proba(`On lance deux dés équilibrés à six faces et on additionne les résultats. Le tableau donne toutes les sommes possibles (36 issues équiprobables). Quelle est la probabilité que la somme soit égale à ${k} ?`, fav, 36,
      `Dans le tableau, la somme ${k} apparaît ${fav} fois (cases en jaune) sur 36. Probabilité : ${Fs(fav, 36)}.`), tableFigure(6, 6, (i, j) => i + j, '+', (v) => v === k))
  }),
  R(() => {
    const k = randInt(8, 11), fav = sum(range(1, 6).map((i) => range(1, 6).filter((j) => i + j >= k).length))
    return fig(proba(`On lance deux dés équilibrés à six faces et on additionne les résultats (voir le tableau des 36 issues). Quelle est la probabilité que la somme soit supérieure ou égale à ${k} ?`, fav, 36,
      `On compte les cases où la somme vaut au moins ${k} : ${fav} sur 36. Probabilité : ${Fs(fav, 36)}.`), tableFigure(6, 6, (i, j) => i + j, '+'))
  }),
  () => {
    const kind = randInt(0, 2), k = pick([6, 12, 4]), fav = kind === 0 ? 9 : kind === 1 ? 27 : sum(range(1, 6).map((i) => range(1, 6).filter((j) => i * j === k).length))
    const txt = kind === 0 ? 'impair' : kind === 1 ? 'pair' : `égal à ${k}`
    return fig(proba(`On lance deux dés équilibrés à six faces et on multiplie les résultats (voir le tableau des 36 issues). Quelle est la probabilité que le produit soit ${txt} ?`, fav, 36,
      `${kind === 0 ? 'Le produit est impair seulement si les deux dés sont impairs : 3 × 3 = 9 cases' : kind === 1 ? 'Le produit est pair dès qu’un des dés est pair : 36 − 9 = 27 cases' : `Le produit ${k} apparaît dans ${fav} cases`} sur 36. Probabilité : ${Fs(fav, 36)}.`), tableFigure(6, 6, (i, j) => i * j, '×'))
  },
  () => {
    const n = pick([4, 6]), fav = n
    return fig(proba(`On lance deux dés équilibrés à ${n} faces (numérotées de 1 à ${n}). Le tableau donne les ${n * n} issues (sommes). Quelle est la probabilité d'obtenir un double (les deux dés donnent le même nombre) ?`, fav, n * n,
      `Les doubles sont sur la diagonale du tableau : ${n} cases sur ${n * n}. Probabilité : ${Fs(fav, n * n)}.`), tableFigure(n, n, (i, j) => i + j, '+'))
  },
)

const cartesOu5 = variants(
  () => {
    const [txt, n, why] = pick([
      ['un cœur ou un roi', 11, '8 cœurs + 4 rois − le roi de cœur compté deux fois = 11'],
      ['une figure rouge', 6, 'valet, dame, roi de cœur et de carreau = 6'],
      ['un as ou une dame', 8, '4 as + 4 dames = 8'],
      ['ni un cœur ni une figure', 18, '32 − (8 cœurs + 9 figures des autres couleurs) = 32 − 14 = 18'],
      ['une carte noire qui n’est pas une figure', 10, '16 cartes noires dont 6 figures : 16 − 6 = 10'],
    ] as [string, number, string][])
    return proba(`On tire une carte au hasard dans un jeu de 32 cartes. Quelle est la probabilité de tirer ${txt} ?`, n, 32, `On compte les cartes favorables : ${why}. Probabilité : ${Fs(n, 32)}.`)
  },
  () => {
    const [txt, n, why] = pick([
      ['un pique ou un as', 16, '13 piques + 4 as − l’as de pique = 16'],
      ['une figure noire', 6, 'valet, dame, roi de pique et de trèfle = 6'],
      ['un roi rouge ou une dame noire', 4, '2 rois rouges + 2 dames noires = 4'],
      ['ni un pique ni un as', 36, '52 − (13 piques + 3 autres as) = 36'],
    ] as [string, number, string][])
    return proba(`On tire une carte au hasard dans un jeu de 52 cartes. Quelle est la probabilité de tirer ${txt} ?`, n, 52, `On compte les cartes favorables : ${why}. Probabilité : ${Fs(n, 52)}.`)
  },
  () => {
    const n = randInt(15, 30), a = pick([2, 3]), b = pick([5, 7]), fav = range(1, n).filter((x) => x % a === 0 || x % b === 0)
    return proba(`On tire au hasard une boule dans une urne contenant des boules numérotées de 1 à ${n}. Quelle est la probabilité d'obtenir un multiple de ${a} ou un multiple de ${b} ?`, fav.length, n, `Favorables : ${andList(fav)} (${fav.length}). Probabilité : ${Fs(fav.length, n)}.`)
  },
)

const PAIRS_P: [number, number, number, number][] = [[1, 3, 1, 4], [1, 2, 1, 3], [1, 4, 1, 6], [2, 5, 1, 4], [1, 3, 1, 6], [1, 2, 1, 5], [1, 5, 1, 3], [3, 8, 1, 4]]
const compo5 = variants(
  R(() => {
    const [a, b, c, d] = pick(PAIRS_P), L = (b * d) / gcd(b, d), restNum = L - (a * L) / b - (c * L) / d
    const k = randInt(1, 4), V = restNum * k, T = L * k
    if (restNum <= 0) return null
    return numeric(`Un sac contient des jetons rouges, bleus et verts. La probabilité de tirer un rouge est ${F(a, b)}, celle de tirer un bleu est ${F(c, d)}. Il y a ${V} jetons verts. Combien y a-t-il de jetons en tout ?`, T, {
      explanation: `P(vert) = 1 − ${F(a, b)} − ${F(c, d)} = ${F(restNum, L)}. Donc ${restNum} part${s(restNum)} sur ${L} = ${V} jetons : une part = ${k} jeton${s(k)}, total ${L} × ${k} = ${T}.`,
    })
  }),
  R(() => {
    const [a, b, c, d] = pick(PAIRS_P), L = (b * d) / gcd(b, d), restNum = L - (a * L) / b - (c * L) / d
    const k = randInt(1, 4), V = restNum * k, T = L * k
    if (restNum <= 0) return null
    return numeric(`Une urne contient des boules rouges, bleues et vertes. P(rouge) = ${F(a, b)}, P(bleue) = ${F(c, d)}, et il y a ${V} boules vertes. Combien y a-t-il de boules rouges ?`, (a * T) / b, {
      explanation: `P(verte) = 1 − ${F(a, b)} − ${F(c, d)} = ${F(restNum, L)}, donc le total est ${V} ÷ ${restNum} × ${L} = ${T} boules. Rouges : ${F(a, b)} de ${T} = ${(a * T) / b}.`,
    })
  }),
  fresh(R(() => {
    const r = randInt(2, 10), e = randInt(2, 8), b = r + e, [p, q] = [r, r + b], g = gcd(p, q)
    return numeric(`Un sac contient des jetons rouges et bleus. Il y a ${e} jetons bleus de plus que de rouges, et la probabilité de tirer un rouge est ${F(p / g, q / g)}. Combien y a-t-il de jetons rouges ?`, r, {
      explanation: `Avec x rouges, il y a x + ${e} bleus et 2x + ${e} jetons. On cherche x tel que ${F('x', `2x + ${e}`)} = ${F(p / g, q / g)} : on essaie, x = ${r} donne ${F(r, 2 * r + e)} = ${F(p / g, q / g)}.`,
    })
  })),
)

const ISSUES: { exp: string; all: string[]; evs: [string, string[]][] }[] = [
  { exp: 'On lance deux pièces', all: ['PP', 'PF', 'FP', 'FF'], evs: [['obtenir deux « pile »', ['PP']], ['obtenir une fois « pile » et une fois « face »', ['PF', 'FP']], ['obtenir au moins un « face »', ['PF', 'FP', 'FF']]] },
  { exp: 'On lance trois pièces', all: ['PPP', 'PPF', 'PFP', 'PFF', 'FPP', 'FPF', 'FFP', 'FFF'], evs: [['obtenir exactement deux « pile »', ['PPF', 'PFP', 'FPP']], ['obtenir trois fois le même côté', ['PPP', 'FFF']], ['obtenir au moins un « pile »', ['PPP', 'PPF', 'PFP', 'PFF', 'FPP', 'FPF', 'FFP']]] },
  { exp: 'On lance une pièce puis un dé à 4 faces', all: ['P1', 'P2', 'P3', 'P4', 'F1', 'F2', 'F3', 'F4'], evs: [['obtenir « pile » et un nombre pair', ['P2', 'P4']], ['obtenir « face » ou le 4', ['F1', 'F2', 'F3', 'F4', 'P4']], ['obtenir « pile » et un nombre supérieur à 1', ['P2', 'P3', 'P4']]] },
]
const issues5 = variants(
  ...ISSUES.map((X) => () => {
    const [txt, fav] = pick(X.evs)
    return proba(`${X.exp}. En listant toutes les issues (P = pile, F = face), quelle est la probabilité d'${txt} ?`, fav.length, X.all.length,
      `Issues équiprobables : ${X.all.join(', ')} (${X.all.length}). Favorables : ${fav.join(', ')} (${fav.length}). Probabilité : ${Fs(fav.length, X.all.length)}.`)
  }),
)

// ═══ Problèmes d'amélioration ═══════════════════════════════════════════
const up1: Maker[] = [
  model('L’équilibre du sac', () => {
    const r = randInt(2, 10), b = r + randInt(2, 12), [n, d] = pick([[1, 2], [2, 3], [3, 4], [3, 5]])
    const k = (n * (r + b) - d * r) / (d - n)
    if (!isInt(k) || k < 1 || k > 40) return null
    return numeric(`Un sac contient ${r} jetons rouges et ${b} jetons bleus. Combien de jetons rouges faut-il ajouter pour que la probabilité de tirer un rouge soit égale à ${F(n, d)} ?`, k, {
      explanation: `Il faut que les rouges forment ${n} part${s(n)} sur ${d}, donc que les ${b} bleus forment ${d - n} part${s(d - n)} : une part = ${b / (d - n)} jetons, il faut ${n} × ${b / (d - n)} = ${r + k} rouges. On ajoute ${r + k} − ${r} = ${k} jetons.`,
    })
  }),
  model('Le dé à vingt faces', () => {
    const [txt, ok] = pick([
      ['un nombre qui contient le chiffre 1', (f: number) => String(f).includes('1')],
      ['un nombre dont le chiffre des unités est 3', (f: number) => f % 10 === 3],
      ['un nombre premier', isPrime],
      ['un multiple de 3 ou de 5', (f: number) => f % 3 === 0 || f % 5 === 0],
      ['un carré d’un nombre entier', (f: number) => Number.isInteger(Math.sqrt(f))],
      ['un diviseur de 60', (f: number) => 60 % f === 0],
      ['un nombre dont la somme des chiffres est paire', (f: number) => String(f).split('').reduce((t, c) => t + Number(c), 0) % 2 === 0],
      ['un multiple de 4 ou un nombre impair', (f: number) => f % 4 === 0 || f % 2 === 1],
    ] as [string, (f: number) => boolean][])
    const fav = range(1, 20).filter(ok)
    return proba(`On lance un dé équilibré à 20 faces, numérotées de 1 à 20. Quelle est la probabilité d'obtenir ${txt} ?`, fav.length, 20, `Issues favorables : ${andList(fav)} (${fav.length}). Probabilité : ${Fs(fav.length, 20)}.`)
  }),
  model('La fréquence qui évolue', () => {
    const N1 = pick([20, 25, 50, 100]), f1 = randInt(35, 65) / 100, k1 = Math.round(N1 * f1), N2 = pick([20, 40, 50, 100]), k2 = randInt(Math.round(N2 * 0.3), Math.round(N2 * 0.7))
    const N = N1 + N2, K = k1 + k2
    if (!isInt((K / N) * 1000)) return null
    return numeric(`Après ${N1} lancers d'une pièce, ${prenom()} a obtenu « pile » avec une fréquence de ${fmt(k1 / N1)}. ${N2} lancers de plus donnent ${k2} « pile ». Quelle est la fréquence de « pile » sur l'ensemble des lancers (en écriture décimale) ?`, K / N, {
      explanation: `Premiers lancers : ${N1} × ${fmt(k1 / N1)} = ${k1} piles. En tout : ${k1} + ${k2} = ${K} piles sur ${N1} + ${N2} = ${N} lancers. Fréquence : ${K} ÷ ${N} = ${fmt(K / N)}.`,
    })
  }),
]

const up2: Maker[] = [
  model('La somme des deux dés', () => {
    const op = randInt(0, 1)
    const evs: [string, (v: number) => boolean][] = op === 0
      ? [['un nombre premier', isPrime], ['un multiple de 3', (v) => v % 3 === 0], ['un multiple de 4', (v) => v % 4 === 0], ['strictement inférieure à 5', (v) => v < 5], ['égale à 7 ou à 11', (v) => v === 7 || v === 11], ['un nombre impair', (v) => v % 2 === 1]]
      : [['un multiple de 6', (v) => v % 6 === 0], ['strictement inférieur à 10', (v) => v < 10], ['le carré d’un nombre entier', (v) => Number.isInteger(Math.sqrt(v))], ['supérieur ou égal à 20', (v) => v >= 20], ['un multiple de 5', (v) => v % 5 === 0], ['un nombre premier', isPrime]]
    const [txt, ok] = pick(evs), f = op === 0 ? (i: number, j: number) => i + j : (i: number, j: number) => i * j
    const fav = sum(range(1, 6).map((i) => range(1, 6).filter((j) => ok(f(i, j))).length))
    return withMeta(proba(`On lance deux dés équilibrés à six faces et on ${op === 0 ? 'additionne' : 'multiplie'} les résultats. Quelle est la probabilité que ${op === 0 ? 'la somme' : 'le produit'} soit ${txt} ?`, fav, 36,
      `Dans le tableau des 36 issues équiprobables, ${fav} cases conviennent. Probabilité : ${Fs(fav, 36)}.`), { figure: tableFigure(6, 6, f, op === 0 ? '+' : '×') })
  }),
  model('La tombola du village', () => {
    const N = pick([100, 200, 250, 400, 500]), g = randInt(1, 3), m = randInt(3, 10), p = randInt(10, 40), ask = randInt(0, 1), W = g + m + p
    return proba(`À la tombola du village, ${N} billets sont vendus. Il y a ${g} gros lot${s(g)}, ${m} lots moyens et ${p} petits lots, chacun sur un billet différent. On achète un billet. Quelle est la probabilité ${ask === 0 ? 'de gagner un lot' : 'de ne rien gagner'} ?`, ask === 0 ? W : N - W, N,
      `Billets gagnants : ${g} + ${m} + ${p} = ${W}. ${ask === 0 ? `P(gagner) = ${Fs(W, N)}.` : `P(ne rien gagner) = 1 − ${F(W, N)} = ${Fs(N - W, N)}.`}`)
  }),
  model('Les deux urnes réunies', () => {
    const rA = randInt(1, 6), bA = randInt(1, 6), rB = randInt(1, 6), bB = randInt(1, 6), R0 = rA + rB, T = rA + bA + rB + bB
    return proba(`L'urne A contient ${rA} boule${s(rA)} rouge${s(rA)} et ${bA} bleue${s(bA)} ; l'urne B contient ${rB} rouge${s(rB)} et ${bB} bleue${s(bB)}. On verse toutes les boules dans un même sac, puis on tire une boule. Quelle est la probabilité qu'elle soit rouge ?`, R0, T,
      `Le sac contient ${rA} + ${rB} = ${R0} rouges sur ${T} boules. Probabilité : ${Fs(R0, T)}. (Ce n'est pas la moyenne de ${F(rA, rA + bA)} et ${F(rB, rB + bB)} !)`)
  }),
]

const up3: Maker[] = [
  model('Autant de chances', () => {
    const r = randInt(2, 9), v = randInt(1, 8), k = randInt(1, 2)
    const x = k === 1 ? r + v : 2 * (r + v)
    return numeric(`Une urne contient ${r} boules rouges, ${v} boules vertes et des boules bleues. On sait que la probabilité de tirer une bleue est ${k === 1 ? 'égale à' : 'le double de'} la probabilité de tirer une rouge ou une verte. Combien y a-t-il de boules bleues ?`, x, {
      explanation: `Les probabilités se comparent comme les nombres de boules : bleues = ${k === 1 ? '' : '2 × '}(rouges + vertes) = ${k === 1 ? '' : '2 × '}(${r} + ${v}) = ${x}.`,
    })
  }),
  model('Deux tirages avec remise', () => {
    const r = randInt(1, 3), b = randInt(1, 3), T = r + b, ask = randInt(0, 2)
    const fav = ask === 0 ? r * r : ask === 1 ? b * b : 2 * r * b
    const txt = ask === 0 ? 'deux boules rouges' : ask === 1 ? 'deux boules bleues' : 'une boule de chaque couleur'
    return proba(`Une urne contient ${r} boule${s(r)} rouge${s(r)} et ${b} boule${s(b)} bleue${s(b)}, toutes numérotées. On tire une boule, on la remet, puis on en tire une seconde. Quelle est la probabilité d'obtenir ${txt} ?`, fav, T * T,
      `Il y a ${T} × ${T} = ${T * T} issues équiprobables (couple : 1re boule, 2e boule). ${ask === 0 ? `Deux rouges : ${r} × ${r} = ${fav}` : ask === 1 ? `Deux bleues : ${b} × ${b} = ${fav}` : `Rouge puis bleue : ${r} × ${b}, bleue puis rouge : ${b} × ${r}, soit ${fav}`}. Probabilité : ${Fs(fav, T * T)}.`)
  }),
  model('Le jeu de cartes trié', () => {
    type Card = { v: string; s: string }
    const deck: Card[] = ['7', '8', '9', '10', 'V', 'D', 'R', 'A'].flatMap((v) => ['cœur', 'carreau', 'pique', 'trèfle'].map((s0) => ({ v, s: s0 })))
    const red = (c: Card) => c.s === 'cœur' || c.s === 'carreau'
    const fig3 = (c: Card) => ['V', 'D', 'R'].includes(c.v)
    const rms: [string, (c: Card) => boolean][] = [
      ['tous les cœurs', (c) => c.s === 'cœur'], ['tous les as', (c) => c.v === 'A'], ['toutes les cartes rouges', red],
      ['les 7, les 8 et les 9', (c) => ['7', '8', '9'].includes(c.v)], ['tous les piques et tous les as', (c) => c.s === 'pique' || c.v === 'A'], ['toutes les figures', fig3],
    ]
    const asks: [string, (c: Card) => boolean][] = [
      ['un roi', (c) => c.v === 'R'], ['une figure (valet, dame ou roi)', fig3], ['une carte rouge', red], ['un as', (c) => c.v === 'A'], ['un trèfle', (c) => c.s === 'trèfle'],
    ]
    const [rt, rm] = pick(rms), [at, ok] = pick(asks), left = deck.filter((c) => !rm(c)), fav = left.filter(ok).length
    if (fav === 0 || fav === left.length) return null
    return proba(`D'un jeu de 32 cartes, on retire ${rt}. On tire ensuite une carte au hasard parmi celles qui restent. Quelle est la probabilité de tirer ${at} ?`, fav, left.length,
      `On retire ${32 - left.length} cartes : il en reste ${left.length}, toutes équiprobables. Parmi elles, ${fav} conviennent. Probabilité : ${Fs(fav, left.length)}.`)
  }),
]

// ═══ Problèmes de l'hôtel de ville ═══════════════════════════════════════
const age1: Maker[] = [
  model('La roue de la foire', () => {
    const k = pick([8, 10, 12]), win = randInt(1, Math.floor(k / 3)), mid = randInt(1, Math.floor(k / 3)), lose = k - win - mid
    const ring = shuffle([...Array(win).fill(0), ...Array(mid).fill(1), ...Array(lose).fill(2)])
    const sty = [{ c: GOLD, t: 'G' }, { c: GREEN, t: 'R' }, { c: '#cccccc', t: 'P' }]
    const ask = randInt(0, 2), where = pick(['À la foire', 'À la kermesse', 'À la fête du village'])
    const fav = ask === 0 ? win + mid : ask === 1 ? win : mid
    const q = ask === 0 ? 'de ne pas perdre' : ask === 1 ? 'de gagner le gros lot' : 'de pouvoir rejouer'
    return withMeta(proba(`${where}, on fait tourner cette roue de ${k} secteurs identiques : G = gros lot, R = rejouer, P = perdu. Quelle est la probabilité ${q} ?`, fav, k,
      `On compte les secteurs sur la figure : ${win} G, ${mid} R, ${lose} P. ${ask === 0 ? `Ne pas perdre : ${win} + ${mid} = ${win + mid} secteurs` : ask === 1 ? `Gros lot : ${win} secteur${s(win)}` : `Rejouer : ${mid} secteur${s(mid)}`} sur ${k}. Probabilité : ${Fs(fav, k)}.`),
    { figure: wheelFigure(ring.map((i) => ({ deg: 360 / k, color: sty[i].c, text: sty[i].t }))) })
  }),
  model('Le tirage au sort du tournoi', () => {
    const cols = shuffle(COLS).slice(0, 3), cnt = cols.map(() => randInt(2, 5)), tot = sum(cnt), i = randInt(0, 2), j = (i + 1) % 3
    return withMeta(proba(`Pour le tournoi, chaque chevalier tire une boule dans l'urne (voir la figure) pour connaître son équipe. ${prenom()} tire une boule ${cols[j].f} et ne la remet pas. Le chevalier suivant tire à son tour. Quelle est la probabilité qu'il tire une boule ${cols[i].f} ?`, cnt[i], tot - 1,
      `Avant : ${tot} boules. Une boule ${cols[j].f} a été retirée : il en reste ${tot - 1}, dont ${cnt[i]} ${cols[i].fp}. Probabilité : ${Fs(cnt[i], tot - 1)}.`),
    { figure: urnFigure(ballsOf(cnt, cols)).figure('R = rouge, B = bleue, V = verte, J = jaune.') })
  }),
  model('Le dé du conteur', () => {
    const vals = shuffle(pick([[1, 1, 2, 2, 2, 3], [1, 2, 2, 3, 3, 3], [1, 1, 1, 2, 4, 4], [2, 2, 3, 3, 3, 5], [1, 2, 2, 2, 5, 5], [0, 1, 1, 2, 2, 6]]))
    const who = pick(['Le conteur', 'Le bouffon', 'L’alchimiste', 'Le forgeron']), ask = randInt(0, 2), v = pick([...new Set(vals)]), k = randInt(2, 4)
    const fav = ask === 0 ? vals.filter((x) => x === v).length : ask === 1 ? vals.filter((x) => x % 2 === 0).length : vals.filter((x) => x >= k).length
    if (fav === 0 || fav === 6) return null
    const q = ask === 0 ? `d'obtenir ${v}` : ask === 1 ? 'd’obtenir un nombre pair' : `d'obtenir un nombre supérieur ou égal à ${k}`
    return withMeta(proba(`${who} a fabriqué un dé équilibré dont voici le patron. Quelle est la probabilité ${q} en lançant ce dé ?`, fav, 6,
      `Les 6 faces sont équiprobables. ${ask === 0 ? `Le ${v} est écrit sur ${fav} face${s(fav)}` : `Faces qui conviennent : ${vals.filter((x) => (ask === 1 ? x % 2 === 0 : x >= k)).sort((p, q) => p - q).join(', ')}, soit ${fav} face${s(fav)}`}. Probabilité : ${Fs(fav, 6)}.`), { figure: dieNetFigure(vals) })
  }),
]

const age2: Maker[] = [
  model('Les dés du tavernier', () => {
    const op = randInt(0, 1), k = op === 0 ? randInt(5, 9) : pick([6, 12, 4]), fn = op === 0 ? (i: number, j: number) => i + j : (i: number, j: number) => i * j
    const fav = sum(range(1, 6).map((i) => range(1, 6).filter((j) => (op === 0 ? fn(i, j) > k : fn(i, j) === k)).length))
    return withMeta(proba(op === 0
      ? `À la taverne, on lance deux dés : on gagne une chope si la somme des dés est strictement supérieure à ${k}. Quelle est la probabilité de gagner ?`
      : `À la taverne, on lance deux dés : on gagne si le produit des dés est égal à ${k}. Quelle est la probabilité de gagner ?`, fav, 36,
    `Il y a 6 × 6 = 36 issues équiprobables (voir le tableau). Cases favorables : ${fav}. Probabilité : ${Fs(fav, 36)}.`),
    { figure: tableFigure(6, 6, fn, op === 0 ? '+' : '×') })
  }),
  model('La roue du marchand', () => {
    const angles = pick(SECTORS), cols = shuffle(COLS).slice(0, 3), gains = shuffle([0, 2, 5]), ask = randInt(0, 2)
    const ok = (g: number) => (ask === 0 ? g > 0 : ask === 1 ? g === 5 : g === 0)
    const fav = angles.filter((_, i) => ok(gains[i])).reduce((t, a) => t + a, 0)
    const q = ask === 0 ? 'de gagner des pièces' : ask === 1 ? 'de gagner 5 pièces' : 'de ne rien gagner'
    return withMeta(proba(`Le marchand propose une roue à trois secteurs (voir la figure, angles indiqués). ${cols.map((c, i) => `${i === 0 ? 'Le' : 'le'} ${c.m} (${c.l}) ${gains[i] ? `rapporte ${gains[i]} pièces` : 'ne rapporte rien'}`).join(', ').replace(/, ([^,]*)$/, ' et $1')}. La probabilité d'un secteur est proportionnelle à son angle. Quelle est la probabilité ${q} ?`, fav, 360,
      `Secteur${ask === 0 ? 's' : ''} favorable${ask === 0 ? 's' : ''} : ${angles.filter((_, i) => ok(gains[i])).join('° + ')}° ${ask === 0 ? `= ${fav}° ` : ''}sur 360°. Probabilité : ${Fs(fav, 360)}.`),
    { figure: wheelFigure(angles.map((a, k) => ({ deg: a, color: cols[k].c, text: `${cols[k].l} ${a}°` }))) })
  }),
  model('Les lots de la kermesse', () => {
    const N = pick([60, 80, 100, 120]), w = randInt(5, 20), ask = randInt(0, 1), k = randInt(5, 15)
    if (k >= N - w) return null
    return proba(ask === 0
      ? `À la kermesse, une boîte contient ${N} enveloppes dont ${w} sont gagnantes. Les ${k} premiers joueurs ont tous tiré une enveloppe perdante (sans la remettre). Quelle est la probabilité que le joueur suivant gagne ?`
      : `À la kermesse, une boîte contient ${N} enveloppes dont ${w} sont gagnantes. Les ${k} premiers joueurs ont tous tiré une enveloppe perdante (sans la remettre). Quelle est la probabilité que le joueur suivant perde ?`, ask === 0 ? w : N - k - w, N - k,
    `Il reste ${N} − ${k} = ${N - k} enveloppes, dont toujours ${w} gagnantes. ${ask === 0 ? `P(gagner) = ${Fs(w, N - k)}.` : `P(perdre) = ${Fs(N - k - w, N - k)}.`}`)
  }),
]

const age3: Maker[] = [
  model('Le sac de l’alchimiste', () => {
    const cols = shuffle(COLS).slice(0, 2), r = randInt(2, 6), b = randInt(2, 8), [n, d] = pick([[1, 2], [1, 3], [2, 3], [3, 4], [2, 5], [1, 4]])
    const k = (n * (r + b) - d * r) / (d - n)
    if (!isInt(k) || k < 1 || k > 20) return null
    return withMeta(numeric(`L'alchimiste a placé dans un sac les jetons dessinés ci-contre. Combien de jetons ${cols[0].mp} doit-il ajouter pour que la probabilité de tirer un jeton ${cols[0].m} soit égale à ${F(n, d)} ?`, k, {
      explanation: `Actuellement : ${r} ${cols[0].mp} et ${b} ${cols[1].mp}. Les ${b} ${cols[1].mp} doivent représenter ${d - n} part${s(d - n)} sur ${d} : une part = ${b / (d - n)}, il faut ${n} × ${b / (d - n)} = ${r + k} jetons ${cols[0].mp}, donc en ajouter ${k}. Vérification : ${F(r + k, r + k + b)} = ${F(n, d)}.`,
    }), { figure: urnFigure(ballsOf([r, b], cols)).figure(`${cols[0].l} = ${cols[0].m}, ${cols[1].l} = ${cols[1].m}.`) })
  }),
  model('La course des chevaux', () => {
    // course de 12 chevaux numérotés 2 à 12 : on avance le cheval dont le numéro est la somme de deux dés
    const a = randInt(2, 4), pa = sum(range(1, 6).map((i) => range(1, 6).filter((j) => i + j === a).length))
    const c = randInt(5, 9), pc = sum(range(1, 6).map((i) => range(1, 6).filter((j) => i + j === c).length))
    return withMeta(proba(`Au jeu des petits chevaux du seigneur, on lance deux dés et on fait avancer le cheval dont le numéro est la somme obtenue. Quelle est la probabilité que le cheval n° ${c} ou le cheval n° ${a} avance au prochain lancer ?`, pa + pc, 36,
      `D'après le tableau : la somme ${c} apparaît ${pc} fois, la somme ${a} apparaît ${pa} fois. Total ${pa + pc} cases sur 36 : ${Fs(pa + pc, 36)}.`),
    { figure: tableFigure(6, 6, (i, j) => i + j, '+', (v) => v === a || v === c) })
  }),
  model('Le dé suspect', () => {
    const N = pick([300, 600, 1200]), face = randInt(1, 6), cnt = range(1, 6).map(() => Math.round(N / 6 + randInt(-N / 40, N / 40)))
    const [fn, fd] = pick([[1, 3], [1, 4], [3, 10], [2, 5]])
    cnt[face - 1] = (N * fn) / fd
    const rest = N - cnt[face - 1], others = cnt.filter((_, i) => i !== face - 1), tot = sum(others)
    const adj = others.map((v) => Math.round((v * rest) / tot))
    adj[adj.length - 1] += rest - sum(adj)
    let t = 0
    const fin = cnt.map((v, i) => (i === face - 1 ? v : adj[t++]))
    const M = pick([60, 120, 300, 600])
    return withMeta(numeric(`Un joueur soupçonne le dé du tavernier d'être truqué. Il le lance ${N} fois et obtient les résultats du diagramme. En utilisant la fréquence observée du ${face} comme estimation de sa probabilité, combien de ${face} peut-on attendre sur ${M} nouveaux lancers ?`, (M * fin[face - 1]) / N, {
      explanation: `Fréquence du ${face} : ${fin[face - 1]} ÷ ${N} = ${Fs(fin[face - 1], N)}, bien loin de ${F(1, 6)} : le dé semble truqué. Sur ${M} lancers : ${M} × ${F(fin[face - 1], N)} = ${fmt((M * fin[face - 1]) / N)}.`,
    }), { figure: barsFigure(range(1, 6).map(String), fin) })
  }),
]

export const CONTENT: SubjectContent | null = {
  tiers: [
    [issues1, de1, urne1, vocab1],
    [roue2, cartes2, contraire2, lettres2],
    [urne3, freq3, desN3, inverse3],
    [roueAngles4, attendu4, compare4, modif4],
    [deuxDes5, cartesOu5, compo5, issues5],
  ],
  upgrades: [up1, up2, up3],
  age: [age1, age2, age3],
}

