// Problèmes de l'hôtel de ville (5e) : niveaux 1-2-3 (1, 2, 3 points) par maison.
// Ce sont de vrais problèmes (titre, situation, plusieurs étapes), plus exigeants que l'entraînement
// et les améliorations ; le niveau 3 est un défi de fin de chapitre.
import { cap, deuxPrenoms, personnage, prenom } from './contexts'
import { fitPoints, parallelsFigure, triangleFigure, triangleFromAngles, type FigAngle, type FigPoint, type FigSegment, type Figure, type LabelPos } from './figure'
import {
  F, expression, fmt, fraction, gcd, numeric, par, pick, poly, randInt, randNonZero, shuffle, withMeta, xPlus,
  type Exercise, type Ladder, type Maker,
} from './utils'

// ── Aides locales ───────────────────────────────────────────────────────
const RED = '#b8362f'
const GREEN = '#2f8f4e'
const BLUE = '#2f5fb3'
const GOLD = '#d9a020'
type Pt = [number, number]
const rad = (d: number) => (d * Math.PI) / 180
const polar = (r: number, d: number, o: Pt = [0, 0]): Pt => [o[0] + r * Math.cos(rad(d)), o[1] + r * Math.sin(rad(d))]
const sum = (a: number[]) => a.reduce((s, v) => s + v, 0)
/** Vrai si n a au plus 2 décimales. */
const clean = (n: number) => Math.abs(n * 100 - Math.round(n * 100)) < 1e-6
const isInt = (n: number) => Math.abs(n - Math.round(n)) < 1e-9
/** Relatif avec signe explicite, sans parenthèses : +4 ; −7 */
const sg = (n: number) => (n > 0 ? `+${fmt(n)}` : fmt(n))
const plural = (n: number, w: string, ws = `${w}s`) => `${n} ${n > 1 ? ws : w}`
const vowel = (w: string) => /^[AEIOUYÉÈÊÂÎaeiouyéè]/.test(w)
/** « de Léa » / « d’Inès » */
const deP = (w: string) => (vowel(w) ? `d’${w}` : `de ${w}`)
/** « que Léa » / « qu’Inès » */
const queP = (w: string) => (vowel(w) ? `qu’${w}` : `que ${w}`)

/** Relance le tirage tant que le générateur renvoie null (nombres pas assez « propres »). */
function retry(make: () => Exercise | null): Exercise {
  for (let i = 0; i < 5000; i++) {
    const ex = make()
    if (ex) return ex
  }
  throw new Error('tirage introuvable')
}
const titled = (title: string, ex: Exercise, figure?: Figure) => withMeta(ex, figure ? { title, figure: roomyLabels(figure) } : { title })

/**
 * Remplace les étiquettes de segments par des notes posées un peu plus loin du trait, selon la largeur du
 * texte : sur un côté oblique, une étiquette longue (« 4x − 2 ») ne chevauche plus le segment.
 * Même côté « extérieur » que dans FigureView (par rapport au centre des points visibles).
 */
function roomyLabels(fig: Figure): Figure {
  const P = fig.points
  const vis = Object.values(P).filter((p) => !p.hidden)
  const cx = sum(vis.map((p) => p.x)) / Math.max(1, vis.length), cy = sum(vis.map((p) => p.y)) / Math.max(1, vis.length)
  const notes = [...(fig.notes ?? [])]
  const segments = (fig.segments ?? []).map((sg0) => {
    if (!sg0.label) return sg0
    const a = P[sg0.a], b = P[sg0.b]
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1
    let nx = -(b.y - a.y) / len, ny = (b.x - a.x) / len
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2
    if ((mx - cx) * nx + (my - cy) * ny < 0) { nx = -nx; ny = -ny }
    const w = [...sg0.label].reduce((t, ch) => t + (ch === ' ' ? 3.5 : 7.4), 0)
    const d = 5 + (w / 2) * Math.abs(nx) + 7 * Math.abs(ny)
    const W = fig.w ?? 320, H = fig.h ?? 220
    const x = Math.min(W - w / 2 - 2, Math.max(w / 2 + 2, mx + nx * d)), y = Math.min(H - 4, Math.max(14, my + ny * d + 5))
    notes.push({ x, y, text: sg0.label })
    return { ...sg0, label: undefined }
  })
  return { ...fig, segments, notes }
}

function troisPrenoms(): [string, string, string] {
  const [a, b] = deuxPrenoms()
  let c = prenom()
  while (c === a || c === b) c = prenom()
  return [a, b, c]
}

/** Cadre des points ; `hidden` = points de construction, `pos` = position imposée du nom. */
function place(
  raw: Record<string, Pt>,
  opts: { hidden?: string[]; blank?: string[]; pos?: Partial<Record<string, LabelPos>>; labels?: Record<string, string>; w?: number; h?: number; margin?: number } = {},
): Record<string, FigPoint> {
  const pts = fitPoints(raw, opts.w, opts.h, opts.margin ?? 46)
  for (const k of opts.hidden ?? []) pts[k] = { ...pts[k], hidden: true, label: '' }
  for (const k of opts.blank ?? []) pts[k] = { ...pts[k], label: '' }
  for (const [k, p] of Object.entries(opts.pos ?? {})) if (p) pts[k] = { ...pts[k], pos: p }
  for (const [k, l] of Object.entries(opts.labels ?? {})) pts[k] = { ...pts[k], label: l }
  return pts
}
/** Côtés d'un polygone fermé, avec étiquettes facultatives. */
const loop = (names: string[], labels: (string | undefined)[] = []): FigSegment[] =>
  names.map((n, i) => ({ a: n, b: names[(i + 1) % names.length], label: labels[i] }))
/** Centre (coordonnées du cadre) d'un groupe de points : pour poser une note. */
function centerOf(pts: Record<string, FigPoint>, names: string[]) {
  return { x: sum(names.map((n) => pts[n].x)) / names.length, y: sum(names.map((n) => pts[n].y)) / names.length }
}
/** Intersection des droites (P1P2) et (P3P4). */
function inter(p1: Pt, p2: Pt, p3: Pt, p4: Pt): Pt {
  const d = (p1[0] - p2[0]) * (p3[1] - p4[1]) - (p1[1] - p2[1]) * (p3[0] - p4[0])
  const a = p1[0] * p2[1] - p1[1] * p2[0], b = p3[0] * p4[1] - p3[1] * p4[0]
  return [(a * (p3[0] - p4[0]) - (p1[0] - p2[0]) * b) / d, (a * (p3[1] - p4[1]) - (p1[1] - p2[1]) * b) / d]
}

/** Tableau de cases (carré magique…) : `cells[ligne][colonne]`, ligne 0 en haut. */
function gridFigure(cells: string[][]): Figure {
  const n = cells.length, m = cells[0].length
  const raw: Record<string, Pt> = {}
  for (let i = 0; i <= n; i++) for (let j = 0; j <= m; j++) raw[`g${i}-${j}`] = [j, n - i]
  const points = place(raw, { hidden: Object.keys(raw) })
  const segments: FigSegment[] = []
  for (let i = 0; i <= n; i++) segments.push({ a: `g${i}-0`, b: `g${i}-${m}` })
  for (let j = 0; j <= m; j++) segments.push({ a: `g0-${j}`, b: `g${n}-${j}` })
  const notes = cells.flatMap((row, i) => row.map((t, j) => {
    const c = centerOf(points, [`g${i}-${j}`, `g${i + 1}-${j + 1}`])
    return { x: c.x, y: c.y + 5, text: t }
  }))
  return { points, segments, notes, caption: '' }
}

/** Pyramide de briques : rows[0] = rangée du bas. */
function bricksFigure(rows: string[][]): Figure {
  const raw: Record<string, Pt> = {}
  rows.forEach((row, l) => row.forEach((_, b) => {
    const x0 = l + 2 * b, y0 = l
    raw[`k${l}-${b}-a`] = [x0, y0]; raw[`k${l}-${b}-b`] = [x0 + 2, y0]
    raw[`k${l}-${b}-c`] = [x0 + 2, y0 + 1]; raw[`k${l}-${b}-d`] = [x0, y0 + 1]
  }))
  const points = place(raw, { hidden: Object.keys(raw) })
  const segments: FigSegment[] = []
  const notes: { x: number; y: number; text: string }[] = []
  rows.forEach((row, l) => row.forEach((t, b) => {
    const k = `k${l}-${b}-`
    segments.push(...loop([`${k}a`, `${k}b`, `${k}c`, `${k}d`]))
    const c = centerOf(points, [`${k}a`, `${k}c`])
    notes.push({ x: c.x, y: c.y + 5, text: t })
  }))
  return { points, segments, notes, caption: '' }
}

// ═══════════════════════════════════════════════════════════════════════
// 5e-prio — Enchaînements d'opérations
// ═══════════════════════════════════════════════════════════════════════
type Op = '+' | '−' | '×'
/** Calcul avec priorités (× avant + et −). */
function evalFlat(nums: number[], ops: Op[]): number {
  const ns = [nums[0]]
  const os: Op[] = []
  ops.forEach((o, i) => {
    if (o === '×') ns[ns.length - 1] *= nums[i + 1]
    else { ns.push(nums[i + 1]); os.push(o) }
  })
  return os.reduce((v, o, i) => (o === '+' ? v + ns[i + 1] : v - ns[i + 1]), ns[0])
}
/** Calcul avec une paire de parenthèses autour de nums[i..j]. */
function evalParen(nums: number[], ops: Op[], i: number, j: number): number {
  const inner = evalFlat(nums.slice(i, j + 1), ops.slice(i, j))
  return evalFlat([...nums.slice(0, i), inner, ...nums.slice(j + 1)], [...ops.slice(0, i), ...ops.slice(j)])
}
function opsText(nums: number[], ops: Op[], i = -1, j = -1): string {
  return nums.map((n, k) => `${k > 0 ? ` ${ops[k - 1]} ` : ''}${k === i ? '(' : ''}${n}${k === j ? ')' : ''}`).join('')
}

const prio1: Maker[] = [
  () => {
    const n = randInt(3, 8), s = randInt(4, 10), m = pick([5, 10, 15, 20, 25]), t = randInt(6, 16) * 5, u = randInt(3, 2 * s)
    const one = s * m + t, all = n * one, tot = all - u * m
    return titled('Le ravitaillement du camp', numeric(
      `Une caravane de ${n} chariots arrive au camp. Chaque chariot transporte ${s} sacs de blé de ${m} kg et un tonneau de ${t} kg. À l'arrivée, on décharge ${u} sacs de blé. Quelle masse (en kg) les chariots transportent-ils encore ?`,
      tot, { explanation: `Un chariot : ${s} × ${m} + ${t} = ${one} kg. Les ${n} chariots : ${n} × ${one} = ${all} kg. On décharge ${u} × ${m} = ${u * m} kg : ${all} − ${u * m} = ${tot} kg.` }))
  },
  () => retry(() => {
    const [eA, eB] = shuffle(['les Aigles', 'les Loups', 'les Comètes', 'les Titans', 'les Requins', 'les Panthères'])
    const a = [randInt(10, 25), randInt(2, 10), randInt(3, 15)], b = [randInt(10, 25), randInt(2, 10), randInt(3, 15)]
    const A = 2 * a[0] + 3 * a[1] + a[2], B = 2 * b[0] + 3 * b[1] + b[2]
    if (A === B) return null
    return titled('La finale de basket', numeric(
      `En finale du tournoi de basket, ${eA} ont réussi ${a[0]} paniers à 2 points, ${a[1]} paniers à 3 points et ${a[2]} lancers francs (1 point chacun). En face, ${eB} ont réussi ${b[0]} paniers à 2 points, ${b[1]} paniers à 3 points et ${b[2]} lancers francs. Combien de points d'écart y a-t-il à la fin du match ?`,
      Math.abs(A - B), { explanation: `${cap(eA)} : 2 × ${a[0]} + 3 × ${a[1]} + ${a[2]} = ${A} points. ${cap(eB)} : 2 × ${b[0]} + 3 × ${b[1]} + ${b[2]} = ${B} points. Écart : ${Math.max(A, B)} − ${Math.min(A, B)} = ${Math.abs(A - B)}.` }))
  }),
  () => {
    const L = randInt(12, 30), W = randInt(8, 20), a = randInt(3, L - 6), b = randInt(3, W - 4)
    const top = L - a, right = W - b, area = L * W - a * b
    const k = pick([5, 10, 20, 25]), sacs = Math.ceil(area / k)
    const points = place({ A: [0, 0], B: [L, 0], C: [L, right], D: [top, right], E: [top, W], G: [0, W] }, { blank: ['A', 'B', 'C', 'D', 'E', 'G'] })
    const figure: Figure = {
      points, polygons: [{ pts: ['A', 'B', 'C', 'D', 'E', 'G'], fill: GREEN }],
      segments: loop(['A', 'B', 'C', 'D', 'E', 'G'], [`${L} m`, `${right} m`, undefined, undefined, `${top} m`, `${W} m`]),
    }
    return titled('Le jardin du monastère', numeric(
      `Le jardin du monastère a la forme ci-dessous (${L} m sur ${W} m au plus large) ; tous ses angles sont droits. Le jardinier veut semer du gazon sur tout le jardin, et un sac de graines permet de semer ${k} m². Combien de sacs doit-il acheter, au minimum ?`,
      sacs, { explanation: `On complète en un rectangle de ${L} × ${W} = ${L * W} m², auquel il manque un coin de (${L} − ${top}) × (${W} − ${right}) = ${a} × ${b} = ${a * b} m². Aire : ${L * W} − ${a * b} = ${area} m². ${area} ÷ ${k} = ${fmt(area / k)}, il faut donc ${sacs} sacs.` }), figure)
  },
  () => {
    const a = randInt(2, 4), c = randInt(2, 5), pa = randInt(14, 28), pc = randInt(8, pa - 4), r = randInt(2, 4), park = randInt(4, 9)
    const tot = a * pa + c * (pc - r) + park
    return titled('La journée au parc', numeric(
      `La famille ${deP(prenom())} (${a} adultes et ${c} enfants) passe la journée au parc d'attractions. L'entrée coûte ${pa} € par adulte et ${pc} € par enfant, mais un bon de réduction retire ${r} € sur chaque entrée enfant. Il faut aussi payer ${park} € de parking. Combien la famille dépense-t-elle en tout (en €) ?`,
      tot, { explanation: `${a} × ${pa} + ${c} × (${pc} − ${r}) + ${park} = ${a * pa} + ${c} × ${pc - r} + ${park} = ${a * pa} + ${c * (pc - r)} + ${park} = ${tot} €.` }))
  },
  () => retry(() => {
    const m = pick([50, 75, 100, 150]), c = pick([5, 10, 20]), f = pick([25, 50, 100]), k = randInt(4, 15), n = randInt(10, 40), q = randInt(2, 7)
    const base = k * m + n * c - q * f
    if (base <= 0) return null
    return titled('Le niveau secret', numeric(
      `Dans un jeu de plateforme, chaque monstre vaincu rapporte ${m} points, chaque pièce ramassée ${c} points, et chaque chute fait perdre ${f} points. À la fin du niveau secret, le score est doublé. ${prenom()} a vaincu ${k} monstres, ramassé ${n} pièces et chuté ${q} fois. Quel est son score final ?`,
      2 * base, { explanation: `(${k} × ${m} + ${n} × ${c} − ${q} × ${f}) × 2 = (${k * m} + ${n * c} − ${q * f}) × 2 = ${base} × 2 = ${2 * base} points.` }))
  }),
]

const prio2: Maker[] = [
  () => retry(() => {
    const nums = Array.from({ length: 4 }, () => randInt(2, 9))
    const ops = Array.from({ length: 3 }, () => pick<Op>(['+', '−', '×']))
    if (!ops.includes('×') || ops.every((o) => o === '×')) return null
    const base = evalFlat(nums, ops)
    if (base < 0) return null
    let best = base, bi = -1, bj = -1
    for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) {
      if (i === 0 && j === 3) continue
      const v = evalParen(nums, ops, i, j)
      if (v > best) { best = v; bi = i; bj = j }
    }
    if (bi < 0) return null
    return titled('Les parenthèses magiques', numeric(
      `Sur le tableau de la salle d'entraînement est écrit : ${opsText(nums, ops)}. ${prenom()} a le droit d'ajouter une seule paire de parenthèses (à l'endroit de son choix, ou pas du tout). Quel est le plus grand résultat que l'on peut obtenir ?`,
      best, { explanation: `Sans parenthèses (× prioritaire) : ${base}. En essayant toutes les places, le meilleur choix est ${opsText(nums, ops, bi, bj)} = ${best}.` }))
  }),
  () => {
    const x = randInt(2, 15), a = randInt(2, 6), b = randInt(1, 12), c = randInt(2, 5), d = randInt(1, 20)
    const R = (a * x + b) * c - d
    return titled('Le programme à l’envers', numeric(
      `${prenom()} applique ce programme de calcul : « Choisis un nombre, multiplie-le par ${a}, ajoute ${b}, multiplie le résultat par ${c}, puis retire ${d}. » Le résultat final est ${R}. Quel nombre avait été choisi au départ ?`,
      x, { explanation: `On remonte le programme en faisant les opérations inverses : ${R} + ${d} = ${R + d} ; ${R + d} ÷ ${c} = ${a * x + b} ; ${a * x + b} − ${b} = ${a * x} ; ${a * x} ÷ ${a} = ${x}.` }))
  },
  () => {
    const G = randInt(25, 90), a = randInt(2, 4), s = randInt(5, 20), b = randInt(1, 3), r = randInt(5, 15), per = pick([10, 12, 15])
    const need = G * a + s * b + r, baskets = Math.ceil(need / per)
    return titled('Les paniers du banquet', numeric(
      `Pour le banquet du seigneur, le boulanger compte ${plural(a, 'pain')} par invité et ${plural(b, 'pain')} par serviteur, plus ${r} pains de réserve. Il y a ${G} invités et ${s} serviteurs. Les pains sont livrés par paniers de ${per}. Combien de paniers faut-il commander, au minimum ?`,
      baskets, { explanation: `${G} × ${a} + ${s} × ${b} + ${r} = ${G * a} + ${s * b} + ${r} = ${need} pains. ${need} ÷ ${per} = ${fmt(Math.round((need / per) * 100) / 100)}${need % per ? '…' : ''} : il faut ${baskets} paniers.` }))
  },
  () => {
    const E = randInt(20, 32), per = randInt(4, 12), sub = pick([50, 100, 150, 200]), B = per * E + sub, t = randInt(3, 9)
    const lieux = ['au musée', 'au planétarium', 'au château fort', 'à l’aquarium', 'au parc des volcans']
    return titled('La sortie scolaire', numeric(
      `Une classe de ${E} élèves part ${pick(lieux)}. Le car coûte ${B} € au total ; le collège en paie ${sub} € et le reste est partagé également entre les élèves. Chaque élève paie aussi son billet d'entrée à ${t} €. Combien chaque élève dépense-t-il (en €) ?`,
      per + t, { explanation: `(${B} − ${sub}) ÷ ${E} + ${t} = ${B - sub} ÷ ${E} + ${t} = ${per} + ${t} = ${per + t} €.` }))
  },
  () => retry(() => {
    const a = randInt(3, 30), b = randInt(2, 9), d = randInt(1, 9), c = d + randInt(1, 8), e = pick([2, 3, 4, 5, 6])
    const num = a + b * (c - d)
    if (num % e !== 0) return null
    return titled('Le grimoire de l’alchimiste', numeric(
      `Dans le grimoire de l'alchimiste, on lit : « Le nombre secret est le quotient par ${e} de la somme de ${a} et du produit de ${b} par la différence entre ${c} et ${d}. » Quel est le nombre secret ?`,
      num / e, { explanation: `On traduit : (${a} + ${b} × (${c} − ${d})) ÷ ${e} = (${a} + ${b} × ${c - d}) ÷ ${e} = ${num} ÷ ${e} = ${num / e}.` }))
  }),
]

const prio3: Maker[] = [
  () => retry(() => {
    const form = randInt(0, 2)
    if (form === 0) {
      const a = randInt(5, 40), b = randInt(2, 9), c = randInt(1, 12), x = c + randInt(1, 10)
      const R = a + b * (x - c)
      return titled('La tache d’encre', numeric(
        `Une tache d'encre cache un nombre dans le calcul ${deP(prenom())} : ${a} + ${b} × (? − ${c}) = ${R}. Quel est le nombre caché ?`,
        x, { explanation: `${b} × (? − ${c}) = ${R} − ${a} = ${R - a}, donc ? − ${c} = ${R - a} ÷ ${b} = ${x - c}, et ? = ${x - c} + ${c} = ${x}.` }))
    }
    if (form === 1) {
      const a = randInt(2, 9), x = randInt(3, 15), c = pick([2, 3, 4, 5]), d = randInt(1, 20)
      const b = randInt(1, a * x - 1)
      if ((a * x - b) % c !== 0) return null
      const R = (a * x - b) / c + d
      return titled('La tache d’encre', numeric(
        `Une tache d'encre cache un nombre dans le calcul ${deP(prenom())} : (? × ${a} − ${b}) ÷ ${c} + ${d} = ${R}. Quel est le nombre caché ?`,
        x, { explanation: `(? × ${a} − ${b}) ÷ ${c} = ${R} − ${d} = ${R - d}, donc ? × ${a} − ${b} = ${R - d} × ${c} = ${a * x - b}, ? × ${a} = ${a * x} et ? = ${x}.` }))
    }
    const a = randInt(2, 5), b = randInt(1, 9), c = randInt(1, 9), d = randInt(2, 6), x = c + randInt(1, 6)
    const R = a * (b + (x - c) * d)
    return titled('La tache d’encre', numeric(
      `Une tache d'encre cache un nombre dans le calcul ${deP(prenom())} : ${a} × [${b} + (? − ${c}) × ${d}] = ${R}. Quel est le nombre caché ?`,
      x, { explanation: `Le crochet vaut ${R} ÷ ${a} = ${R / a}. Donc (? − ${c}) × ${d} = ${R / a} − ${b} = ${(x - c) * d}, ? − ${c} = ${x - c} et ? = ${x}.` }))
  }),
  () => retry(() => {
    const S = randInt(5, 40), a = randInt(8, 20), b = randInt(2, a - 4), D = randInt(5, 25), C = randInt(40, 120)
    const gap = C + D - S, w = Math.ceil(gap / (a - b))
    if (gap <= 0 || w < 3 || w > 15) return null
    const name = prenom()
    const objets = ['d’un jeu vidéo', 'd’une paire de rollers', 'd’un skateboard', 'd’une guitare', 'd’un appareil photo']
    return titled('La tirelire', numeric(
      `${name} a ${S} € dans sa tirelire, mais doit d'abord rendre ${D} € à son frère. Chaque semaine, ${name} reçoit ${a} € d'argent de poche et en dépense ${b} €. Après combien de semaines, au plus tôt, l'achat ${pick(objets)} à ${C} € sera-t-il possible, une fois la dette remboursée ?`,
      w, { explanation: `Il faut réunir ${C} + ${D} = ${C + D} € ; il manque ${C + D} − ${S} = ${gap} €. Chaque semaine, on économise ${a} − ${b} = ${a - b} €. ${gap} ÷ ${a - b} = ${fmt(Math.round((gap / (a - b)) * 100) / 100)}${gap % (a - b) ? '…' : ''}, donc ${w} semaines (après ${w - 1} semaines, on n'aurait que ${S + (w - 1) * (a - b)} €).` }))
  }),
  () => retry(() => {
    const L = randInt(8, 16), W = randInt(6, 12), p = randInt(2, Math.min(4, W - 3)), box = pick([10, 12, 16, 20]), price = randInt(15, 45)
    const area = L * W - p * p, tiles = 4 * area, boxes = Math.ceil(tiles / box)
    const ox = (L - p) / 2, oy = (W - p) / 2
    const points = place({ A: [0, 0], B: [L, 0], C: [L, W], D: [0, W], P: [ox, oy], Q: [ox + p, oy], R: [ox + p, oy + p], S: [ox, oy + p] },
      { blank: ['A', 'B', 'C', 'D', 'P', 'Q', 'R', 'S'] })
    const figure: Figure = {
      points,
      polygons: [{ pts: ['A', 'B', 'C', 'D'], fill: GOLD }, { pts: ['P', 'Q', 'R', 'S'], fill: BLUE }],
      segments: [...loop(['A', 'B', 'C', 'D'], [`${L} m`, `${W} m`]), ...loop(['P', 'Q', 'R', 'S'], [`${p} m`])],
    }
    return titled('Le carrelage du grand hall', numeric(
      `Le grand hall du château est un rectangle de ${L} m sur ${W} m. Au centre, un bassin carré de ${p} m de côté ne sera pas carrelé. Les carreaux sont des carrés de 50 cm de côté, vendus par boîtes de ${box} carreaux ; une boîte coûte ${price} €. Combien coûtera le carrelage (en €) ?`,
      boxes * price, { explanation: `Surface à carreler : ${L} × ${W} − ${p} × ${p} = ${area} m². Il faut 2 × 2 = 4 carreaux par m², donc ${area} × 4 = ${tiles} carreaux. ${tiles} ÷ ${box} = ${fmt(Math.round((tiles / box) * 100) / 100)}${tiles % box ? '…' : ''} : ${boxes} boîtes, soit ${boxes} × ${price} = ${boxes * price} €.` }), figure)
  }),
  () => retry(() => {
    const N = randInt(10, 20), l = randInt(1, 5), w = randInt(1, N - l - 1), d = N - l - w
    if (d < 1) return null
    const P = 3 * w + d
    const sport = pick(['football', 'handball', 'rugby', 'hockey', 'water-polo'])
    return titled('Le classement du tournoi', numeric(
      `Au tournoi de ${sport}, une victoire rapporte 3 points, un match nul 1 point et une défaite 0 point. L'équipe du collège a disputé ${N} matchs, en a perdu ${l} et totalise ${P} points. Combien de matchs nuls a-t-elle faits ?`,
      d, { explanation: `Elle n'a pas perdu ${N} − ${l} = ${N - l} matchs (victoires ou nuls). Si c'étaient tous des nuls, elle aurait ${N - l} points. Chaque victoire à la place d'un nul ajoute 2 points : ${P} − ${N - l} = ${P - N + l}, soit ${(P - N + l) / 2} victoires. Matchs nuls : ${N - l} − ${w} = ${d}.` }))
  }),
  () => retry(() => {
    const N = randInt(14, 40), packP = randInt(30, 90) / 10, unitP = randInt(8, 20) / 10
    const packs = Math.ceil(N / 6), costA = Math.round(packs * packP * 100) / 100
    let paid = 0
    while (paid + Math.floor(paid / 3) < N) paid++
    const costB = Math.round(paid * unitP * 100) / 100
    const diff = Math.round(Math.abs(costA - costB) * 100) / 100
    if (diff < 0.5 || N % 6 === 0 || N % 4 === 0) return null
    return titled('Les deux magasins', numeric(
      `Pour la fête du club, il faut ${N} bouteilles de jus. Le magasin A vend uniquement des packs de 6 bouteilles à ${fmt(packP)} € le pack. Le magasin B vend la bouteille ${fmt(unitP)} €, avec une offre : « 3 achetées, la 4e offerte ». On choisit le magasin le moins cher. Combien d'euros économise-t-on par rapport à l'autre ?`,
      diff, { explanation: `A : il faut ${packs} packs (${packs * 6} bouteilles), soit ${packs} × ${fmt(packP)} = ${fmt(costA)} €. B : en payant ${paid} bouteilles, on en reçoit ${paid} + ${Math.floor(paid / 3)} = ${paid + Math.floor(paid / 3)}, soit ${paid} × ${fmt(unitP)} = ${fmt(costB)} €. Économie : ${fmt(Math.max(costA, costB))} − ${fmt(Math.min(costA, costB))} = ${fmt(diff)} €.` }))
  }),
]

// ═══════════════════════════════════════════════════════════════════════
// 5e-rel — Nombres relatifs (addition et soustraction)
// ═══════════════════════════════════════════════════════════════════════
/** Années sans année 0 : rang continu ↔ année. */
const yearToIdx = (y: number) => (y < 0 ? y : y - 1)
const idxToYear = (i: number) => (i < 0 ? i : i + 1)

const UTC = [
  { v: 'Paris', o: 1 }, { v: 'Londres', o: 0 }, { v: 'New York', o: -5 }, { v: 'Los Angeles', o: -8 }, { v: 'Tokyo', o: 9 },
  { v: 'Dubaï', o: 4 }, { v: 'Rio de Janeiro', o: -3 }, { v: 'Moscou', o: 3 }, { v: 'Mexico', o: -6 }, { v: 'Pékin', o: 8 },
  { v: 'Reykjavik', o: 0 }, { v: 'Le Caire', o: 2, de: 'du Caire', a: 'au Caire' }, { v: 'Bangkok', o: 7 },
]
const deV = (c: { v: string; de?: string }) => c.de ?? `de ${c.v}`
const aV = (c: { v: string; a?: string }) => c.a ?? `à ${c.v}`
const utc = (o: number) => `UTC${o === 0 ? '' : sg(o)}`

const rel1: Maker[] = [
  () => retry(() => {
    const t0 = randInt(-15, -3), u = randInt(6, 18), t12 = t0 + u, t18 = t12 - randInt(4, 15)
    if (t12 === 0 || t18 === 0 || t18 >= 0 === t12 >= 0) return null
    const drop = t12 - t18
    return titled('Le thermomètre du refuge', numeric(
      `Au refuge de montagne, le thermomètre affiche ${fmt(t0)} °C à 6 h. Jusqu'à midi, la température monte de ${u} °C. À 18 h, le thermomètre indique ${fmt(t18)} °C. De combien de degrés la température a-t-elle baissé entre midi et 18 h ?`,
      drop, { explanation: `À midi : ${fmt(t0)} + ${u} = ${fmt(t12)} °C. Baisse : ${fmt(t12)} − ${par(t18)} = ${drop} °C.` }))
  }),
  () => retry(() => {
    const s = -randInt(2, 8), b = randInt(2, 6), c = randInt(4, 12), d = randInt(2, 7)
    const l1 = s + b, l2 = l1 - c, f = l2 + d, target = -randInt(10, 20)
    if (l1 > 0 || f >= 0 || f <= target) return null
    return titled('L’ascenseur de la mine', numeric(
      `Dans une mine, l'ascenseur part du niveau ${fmt(s)}. Il monte de ${b} niveaux, descend de ${c} niveaux, puis remonte de ${d} niveaux. Le filon d'argent se trouve au niveau ${fmt(target)}. De combien de niveaux l'ascenseur doit-il encore descendre pour l'atteindre ?`,
      f - target, { explanation: `${fmt(s)} + ${b} − ${c} + ${d} = ${fmt(f)} : l'ascenseur est au niveau ${fmt(f)}. Il reste ${fmt(f)} − ${par(target)} = ${f - target} niveaux à descendre.` }))
  }),
  () => retry(() => {
    const p = personnage(), s = randInt(20, 120), d1 = randInt(s + 10, s + 150), r = randInt(20, 120), d2 = randInt(10, 60), X = pick([50, 100, 150, 200])
    const f = s - d1 + r - d2
    if (f >= 0 || f < -150) return null
    return titled('Le compte du marchand', numeric(
      `Le compte de ${p.nom} affiche ${s} écus. ${p.il === 'il' ? 'Il' : 'Elle'} achète du matériel pour ${d1} écus, vend des marchandises pour ${r} écus, puis paie ${d2} écus de taxes. Combien d'écus doit-${p.il} encore gagner pour que son compte affiche ${X} écus ?`,
      X - f, { explanation: `Solde : ${s} − ${d1} + ${r} − ${d2} = ${fmt(f)} écus. Pour atteindre ${X} : ${X} − ${par(f)} = ${X - f} écus.` }))
  }),
  () => retry(() => {
    const who = pick([
      { qui: 'Un savant grec', ne: 'né', il: 'il', quoi: 'fonde une école', f: 'qui ferme' },
      { qui: 'Une reine d’Égypte', ne: 'née', il: 'elle', quoi: 'fait construire une bibliothèque', f: 'qui brûle' },
      { qui: 'Un philosophe', ne: 'né', il: 'il', quoi: 'ouvre une académie', f: 'qui ferme' },
      { qui: 'Une poétesse', ne: 'née', il: 'elle', quoi: 'fonde un théâtre', f: 'qui est détruit' },
    ])
    const x = randInt(250, 700), k = randInt(20, 50), m = randInt(10, 80), end = -x + k + m
    if (end >= -5) return null
    return titled('Les dates de l’Antiquité', numeric(
      `${who.qui} est ${who.ne} en ${fmt(-x)}, c'est-à-dire en ${x} av. J.-C. À ${k} ans, ${who.il} ${who.quoi}, ${who.f} ${m} ans plus tard. En quelle année ? (Donne un nombre relatif.)`,
      end, { explanation: `${fmt(-x)} + ${k} = ${fmt(-x + k)}, puis ${fmt(-x + k)} + ${m} = ${fmt(end)}, soit en ${-end} av. J.-C.` }))
  }),
  () => retry(() => {
    const a = randInt(8, 30), b = randInt(5, 20), c = randInt(2, a - 2), d = randInt(1, b - 2)
    const dist = b - d - (-a + c)
    return titled('Le plongeur et la mouette', numeric(
      `Un plongeur nage à ${fmt(-a)} m (sous la surface de la mer) et une mouette vole à ${b} m d'altitude. Le plongeur remonte de ${c} m pendant que la mouette descend de ${d} m. Quelle distance verticale (en m) les sépare alors ?`,
      dist, { explanation: `Plongeur : ${fmt(-a)} + ${c} = ${fmt(-a + c)} m. Mouette : ${b} − ${d} = ${b - d} m. Distance : ${b - d} − ${par(-a + c)} = ${dist} m.` }))
  }),
]

const SYMS: ((r: number, c: number) => [number, number])[] = [
  (r, c) => [r, c], (r, c) => [c, 2 - r], (r, c) => [2 - r, 2 - c], (r, c) => [2 - c, r],
  (r, c) => [r, 2 - c], (r, c) => [2 - r, c], (r, c) => [c, r], (r, c) => [2 - c, 2 - r],
]

const rel2: Maker[] = [
  () => retry(() => {
    const c = randInt(-4, 4), a = randNonZero(-7, 7), b = randNonZero(-7, 7)
    const g = [[c + a, c - a - b, c + b], [c - a + b, c, c + a - b], [c - b, c + a + b, c - a]]
    if (new Set(g.flat()).size < 9 || g.flat().includes(0) || g.flat().filter((v) => v < 0).length < 3) return null
    const S = 3 * c, T = pick(SYMS)
    const cells: string[][] = [['', '', ''], ['', '', ''], ['', '', '']]
    const put = (r: number, col: number, t: string) => { const [i, j] = T(r, col); cells[i][j] = t }
    for (const [r, col] of [[0, 0], [0, 1], [0, 2], [1, 1]]) put(r, col, fmt(g[r][col]))
    put(1, 0, '?')
    return titled('Le carré magique', numeric(
      `${prenom()} a trouvé ce carré magique gravé ${pick(['sur la porte du temple', 'au fond d’un coffre', 'sur un vieux parchemin', 'dans un livre de sorts'])} : les sommes des trois nombres de chaque ligne, de chaque colonne et de chaque diagonale sont toutes égales. Quel nombre faut-il écrire à la place du « ? » ?`,
      g[1][0], { explanation: `Somme magique (ligne complète) : ${fmt(g[0][0])} + ${par(g[0][1])} + ${par(g[0][2])} = ${fmt(S)}. La diagonale qui passe par ${fmt(g[0][2])} et le centre donne le coin : ${fmt(S)} − ${par(g[0][2])} − ${par(c)} = ${fmt(g[2][0])}. Enfin : ${fmt(S)} − ${par(g[0][0])} − ${par(g[2][0])} = ${fmt(g[1][0])}.` }), gridFigure(cells))
  }),
  () => retry(() => {
    const a = randNonZero(-12, 12), b = randNonZero(-12, 12), c = randNonZero(-12, 12)
    const ab = a + b, bc = b + c, T = ab + bc
    if ([a, b, c].filter((v) => v < 0).length === 0 || ab === 0 || bc === 0 || T === 0) return null
    return titled('La pyramide des relatifs', numeric(
      `${prenom()} construit une pyramide de relatifs : chaque brique contient la somme des deux briques sur lesquelles elle repose. Quel nombre faut-il écrire à la place du « ? » ?`,
      c, { explanation: `Brique du milieu à gauche : ${fmt(T)} − ${par(bc)} = ${fmt(ab)}. Brique du bas au milieu : ${fmt(ab)} − ${par(a)} = ${fmt(b)}. Enfin : ${fmt(bc)} − ${par(b)} = ${fmt(c)}.` }),
      bricksFigure([[fmt(a), '', '?'], ['', fmt(bc)], [fmt(T)]]))
  }),
  () => retry(() => {
    const v = Array.from({ length: 4 }, () => randNonZero(-9, 9)), T0 = randInt(-8, 6), Tf = T0 + sum(v)
    if (T0 === 0 || Tf === 0 || v.filter((x) => x < 0).length < 2) return null
    const lieu = pick(['Au sommet du mont Blanc', 'À la station polaire', 'Au refuge du col', 'Au camp de base'])
    return titled('Le carnet météo', numeric(
      `${lieu}, ${prenom()} note chaque soir la variation de température par rapport à la veille : mardi ${sg(v[0])} °C, mercredi ${sg(v[1])} °C, jeudi ${sg(v[2])} °C, vendredi ${sg(v[3])} °C. Vendredi soir, il fait ${fmt(Tf)} °C. Quelle température faisait-il lundi soir (en °C) ?`,
      T0, { explanation: `En tout, la température a varié de ${v.map(par).join(' + ')} = ${fmt(sum(v))} °C. Lundi soir : ${fmt(Tf)} − ${par(sum(v))} = ${fmt(T0)} °C.` }))
  }),
  () => retry(() => {
    const a = randInt(-15, 15), b = randInt(-15, 15)
    if (a === b || a === 0 || b === 0) return null
    const mid = pick(['A', 'B'])
    const C = mid === 'B' ? 2 * b - a : 2 * a - b
    if (C === 0 || Math.abs(C) > 40 || (a > 0 && b > 0 && C > 0)) return null
    const [m, o] = mid === 'B' ? [b, a] : [a, b]
    return titled('Le symétrique sur la droite', numeric(
      `Sur une droite graduée, le point A a pour abscisse ${fmt(a)} et le point B a pour abscisse ${fmt(b)}. Le point C est placé de sorte que ${mid} soit le milieu du segment [${mid === 'B' ? 'AC' : 'BC'}]. Quelle est l'abscisse de C ?`,
      C, { explanation: `De ${mid === 'B' ? 'A' : 'B'} à ${mid}, on se déplace de ${fmt(m)} − ${par(o)} = ${fmt(m - o)}. De ${mid} à C, on fait le même déplacement : ${fmt(m)} + ${par(m - o)} = ${fmt(C)}.` }))
  }),
  () => retry(() => {
    const [A, B] = deuxPrenoms()
    const ca = Array.from({ length: 4 }, () => randNonZero(-9, 9)), cb = Array.from({ length: 4 }, () => randNonZero(-9, 9))
    const ga = ca[randInt(0, 3)], gb = cb[randInt(0, 3)]
    const sa = sum(ca) - ga + gb, sb = sum(cb) - gb + ga
    if (ga === gb || sa === sb || ca.filter((x) => x < 0).length < 2 || cb.filter((x) => x < 0).length < 2) return null
    return titled('L’échange de cartes', numeric(
      `Dans un jeu, le score d'un joueur est la somme de ses cartes. ${A} a les cartes ${ca.map(sg).join(' ; ')} et ${B} a les cartes ${cb.map(sg).join(' ; ')}. ${A} donne sa carte ${sg(ga)} à ${B}, et ${B} donne sa carte ${sg(gb)} à ${A}. Combien de points d'écart y a-t-il maintenant entre leurs scores ?`,
      Math.abs(sa - sb), { explanation: `Avant : ${A} a ${fmt(sum(ca))} et ${B} a ${fmt(sum(cb))}. Après l'échange : ${A} a ${fmt(sum(ca))} − ${par(ga)} + ${par(gb)} = ${fmt(sa)} et ${B} a ${fmt(sum(cb))} − ${par(gb)} + ${par(ga)} = ${fmt(sb)}. Écart : ${fmt(Math.max(sa, sb))} − ${par(Math.min(sa, sb))} = ${Math.abs(sa - sb)}.` }))
  }),
]

const rel3: Maker[] = [
  () => retry(() => {
    const who = pick([
      { qui: 'Un roi', ne: 'né', il: 'Il' }, { qui: 'Une reine', ne: 'née', il: 'Elle' },
      { qui: 'Un pharaon', ne: 'né', il: 'Il' }, { qui: 'Une impératrice', ne: 'née', il: 'Elle' },
    ])
    const x = randInt(30, 150), k = randInt(15, 40), m = randInt(10, 60)
    const start = -x + k
    if (start > -2 || start + m <= 0) return null
    const end = idxToYear(yearToIdx(start) + m)
    return titled('La frise sans année zéro', numeric(
      `${who.qui} est ${who.ne} en ${fmt(-x)} (${x} av. J.-C.). ${who.il} monte sur le trône l'année de ses ${k} ans et règne pendant ${m} ans. Attention : dans notre calendrier, il n'y a pas d'année 0 (on passe directement de l'an −1 à l'an 1). En quelle année le règne se termine-t-il ?`,
      end, { explanation: `Couronnement : ${fmt(-x)} + ${k} = ${fmt(start)}. De ${fmt(start)} à −1, il s'écoule ${-1 - start} ans, puis on passe de −1 à 1 en un an : ${-start} ans pour atteindre l'an 1. Il reste ${m} − ${-start} = ${m + start} ans : fin du règne en 1 + ${m + start} = ${end}.` }))
  }),
  () => {
    const s = randInt(-10, 10), N = randInt(20, 60), fwd = Math.random() < 0.5
    const half = Math.floor(N / 2)
    const pos = fwd ? (N % 2 === 0 ? s - half : s - half + N) : (N % 2 === 0 ? s + half : s + half - N)
    const [w1, w2] = fwd ? ['avance', 'recule'] : ['recule', 'avance']
    return titled('La fourmi sur la droite', numeric(
      `Une fourmi part du point d'abscisse ${fmt(s)} sur une droite graduée. Elle ${w1} de 1, ${w2} de 2, ${w1} de 3, ${w2} de 4, et ainsi de suite : chaque déplacement est plus long d'une unité que le précédent et le sens change à chaque fois. Quelle est son abscisse après ${N} déplacements ?`,
      pos, { explanation: `On regroupe les déplacements deux par deux : (${fwd ? '+1 − 2' : '−1 + 2'}), (${fwd ? '+3 − 4' : '−3 + 4'})… chaque paire vaut ${fwd ? '−1' : '+1'}. ${N % 2 === 0 ? `${N} déplacements = ${half} paires : ${fmt(s)} + ${par(fwd ? -half : half)} = ${fmt(pos)}.` : `${N - 1} déplacements = ${half} paires, soit ${fmt(s)} + ${par(fwd ? -half : half)} = ${fmt(fwd ? s - half : s + half)}, puis le ${N}e déplacement ${fwd ? `+${N}` : `−${N}`} : ${fmt(pos)}.`}` }))
  },
  () => retry(() => {
    const a = randNonZero(-9, 9), b = randNonZero(-9, 9)
    if (a === b || Math.abs(a) === Math.abs(b)) return null
    const cyc = [a, b, b - a, -a, -b, a - b], N = randInt(15, 60)
    if ((N - 1) % 6 < 2) return null
    const v = cyc[(N - 1) % 6]
    const first = [...cyc, a, b].map(fmt).join(' ; ')
    return titled('La suite qui tourne en rond', numeric(
      `${prenom()} écrit une liste de nombres. Le premier est ${fmt(a)}, le deuxième est ${fmt(b)}, et chaque nombre suivant s'obtient en soustrayant, au dernier nombre écrit, celui qui le précède (le troisième est donc ${fmt(b)} − ${par(a)}). Quel est le ${N}e nombre de la liste ?`,
      v, { explanation: `Les premiers nombres sont : ${first}… Au 7e, on retrouve le début : la liste se répète tous les 6 nombres. ${N} = 6 × ${Math.floor((N - 1) / 6)} + ${(N - 1) % 6 + 1}, donc le ${N}e nombre est le ${(N - 1) % 6 + 1}e de la liste : ${fmt(v)}.` }))
  }),
  () => retry(() => {
    const [a, b, c, d] = Array.from({ length: 4 }, () => randNonZero(-9, 9))
    const r2 = [a + b, b + c, c + d], r3 = [r2[0] + r2[1], r2[1] + r2[2]], top = r3[0] + r3[1]
    if ([a, b, c, d].filter((v) => v < 0).length < 2 || [...r2, ...r3, top].includes(0)) return null
    const giveMid = Math.random() < 0.5
    const rows = [[fmt(a), '', fmt(c), fmt(d)], [giveMid ? '' : fmt(r2[0]), giveMid ? fmt(r2[1]) : '', ''], ['', ''], ['?']]
    const findB = giveMid ? `${fmt(r2[1])} − ${par(c)} = ${fmt(b)}` : `${fmt(r2[0])} − ${par(a)} = ${fmt(b)}`
    return titled('La pyramide géante', numeric(
      `${prenom()} construit une pyramide de relatifs à quatre étages : chaque brique contient la somme des deux briques sur lesquelles elle repose. La brique du bas tout à gauche contient ${fmt(a)}. Quel nombre faut-il écrire au sommet ?`,
      top, { explanation: `Brique manquante du bas : ${findB}. Deuxième rangée : ${r2.map(fmt).join(' ; ')}. Troisième rangée : ${r3.map(fmt).join(' ; ')}. Sommet : ${fmt(r3[0])} + ${par(r3[1])} = ${fmt(top)}.` }),
      bricksFigure(rows))
  }),
  () => retry(() => {
    const [A, B, C] = shuffle(UTC)
    const h = randInt(5, 12), d1 = randInt(2, 9), w = randInt(1, 4), d2 = randInt(2, 9)
    const depU = h - A.o, arrBU = depU + d1, locB = arrBU + B.o, arrCU = arrBU + w + d2, locC = arrCU + C.o
    if (A.o === B.o || B.o === C.o || A.o === C.o) return null
    if (depU < 0 || locB < 0 || locB > 23 || locB + w > 23 || locC < 0 || locC > 23 || arrCU > 23) return null
    return titled('Le vol avec escale', numeric(
      `Un avion décolle ${deV(A)} à ${h} h (heure locale), vole ${d1} h jusqu'${aV(B)}, y fait une escale de ${w} h, puis vole ${d2} h jusqu'${aV(C)}. ${A.v} est à l'heure ${utc(A.o)}, ${B.v} à ${utc(B.o)} et ${C.v} à ${utc(C.o)} (UTC${sg(3)} signifie 3 h de plus qu'à l'heure universelle UTC). À quelle heure locale l'avion atterrit-il ${aV(C)} (le même jour) ?`,
      locC, { inputHint: 'Heure, ex. 17', explanation: `Départ en heure universelle : ${A.o === 0 ? `${h} h UTC` : `${h} − ${par(A.o)} = ${depU} h UTC`}. Arrivée ${aV(B)} : ${depU + d1} h UTC (${locB} h locale). Atterrissage : ${arrBU} + ${w} + ${d2} = ${arrCU} h UTC, soit ${C.o === 0 ? `${locC} h ${aV(C)} (même heure que UTC)` : `${arrCU} + ${par(C.o)} = ${locC} h ${aV(C)}`}.` }))
  }),
]

// ═══════════════════════════════════════════════════════════════════════
// 5e-frac — Fractions
// ═══════════════════════════════════════════════════════════════════════
/** Fraction simplifiée pour une explication (empilée, ou entier). */
const Fs = (n: number, d: number) => {
  const g = gcd(Math.abs(n), Math.abs(d)) || 1
  return d / g === 1 ? fmt(n / g) : F(n / g, d / g)
}
/** « = a/b » si la fraction se simplifie, rien sinon. */
const simp = (n: number, d: number) => (gcd(Math.abs(n), d) > 1 ? ` = ${Fs(n, d)}` : '')
/** Deux dénominateurs dont le second est multiple du premier, avec deux numérateurs donnant des fractions irréductibles. */
function twoFracs(maxDen = 24) {
  const d1 = pick([2, 3, 4, 5, 6]), k = pick([2, 3, 4]), d2 = d1 * k
  const n1 = randInt(1, d1 - 1), n2 = randInt(1, d2 - 1)
  const ok = d2 <= maxDen && gcd(n1, d1) === 1 && gcd(n2, d2) === 1
  return { d1, k, d2, n1, n2, ok }
}

const frac1: Maker[] = [
  () => retry(() => {
    const { d1, k, d2, n1, n2, ok } = twoFracs()
    const n3 = randInt(1, d2 - 1)
    const eaten = n1 * k + n2 + n3, rest = d2 - eaten
    if (!ok || gcd(n3, d2) !== 1 || rest <= 0) return null
    const [A, B, C] = troisPrenoms()
    const what = pick([['une pizza', 'de la pizza'], ['une tarte aux pommes', 'de la tarte'], ['une galette', 'de la galette'], ['un gâteau au chocolat', 'du gâteau']])
    return titled('Le partage du goûter', fraction(
      `${A}, ${B} et ${C} partagent ${what[0]}. ${A} en mange ${F(n1, d1)}, ${B} ${F(n2, d2)} et ${C} ${F(n3, d2)}. Quelle fraction ${what[1]} reste-t-il ? (Donne une fraction irréductible.)`,
      rest, d2, { irreducible: true, explanation: `${F(n1, d1)} = ${F(n1 * k, d2)}. Ils mangent ${F(n1 * k, d2)} + ${F(n2, d2)} + ${F(n3, d2)} = ${F(eaten, d2)}. Il reste ${F(d2, d2)} − ${F(eaten, d2)} = ${F(rest, d2)}${simp(rest, d2)}.` }))
  }),
  () => retry(() => {
    const C = pick([40, 48, 60, 72, 80, 120]), d = pick([3, 4, 5, 6]), n = randInt(2, d - 1)
    const e = pick([2, 3, 4, 5, 6, 8, 10, 12]), m = randInt(1, e - 1)
    if (gcd(n, d) !== 1 || gcd(m, e) !== 1 || C % d || C % e || (e % d && d % e) || e === d) return null
    const start = (C / d) * n, used = (C / e) * m
    if (used >= start) return null
    const engin = pick(['d’un tracteur', 'd’un bateau de pêche', 'd’un groupe électrogène', 'd’une moto-neige'])
    return titled('Le réservoir', numeric(
      `Le réservoir ${engin} contient ${C} L quand il est plein. Ce matin, il est rempli aux ${F(n, d)}. Dans la journée, la machine consomme l'équivalent de ${F(m, e)} d'un plein. Combien de litres reste-t-il dans le réservoir le soir ?`,
      start - used, { explanation: `Au départ : ${C} ÷ ${d} × ${n} = ${start} L. Consommé : ${C} ÷ ${e} × ${m} = ${used} L. Il reste ${start} − ${used} = ${start - used} L.` }))
  }),
  () => retry(() => {
    const { d1, k, d2, n1, n2, ok } = twoFracs(20)
    const s = n1 * k + n2, D = d2 * randInt(1, 4)
    if (!ok || s >= d2 || D < 8 || D > 60) return null
    const left = (D / d2) * (d2 - s), name = prenom()
    const course = pick(['un trail de', 'une randonnée de', 'une course de ski de fond de', 'une étape de vélo de'])
    return titled('La course en montagne', numeric(
      `${name} participe à ${course} ${D} km. Pendant la première heure, ${name} parcourt ${F(n1, d1)} du trajet, puis ${F(n2, d2)} du trajet pendant la deuxième heure. Combien de kilomètres reste-t-il à parcourir ?`,
      left, { explanation: `En deux heures : ${F(n1 * k, d2)} + ${F(n2, d2)} = ${F(s, d2)} du trajet. Il reste ${F(d2 - s, d2)} du trajet, soit ${D} ÷ ${d2} × ${d2 - s} = ${fmt(left)} km.` }))
  }),
  () => retry(() => {
    const { d1, k, d2, n1, n2, ok } = twoFracs()
    const n3 = randInt(1, d2 - 1)
    const v = [n1 * k, n2, n3]
    if (!ok || gcd(n3, d2) !== 1 || new Set(v).size < 3) return null
    const [A, B, C] = shuffle(['les Renards', 'les Hiboux', 'les Castors', 'les Faucons', 'les Lynx']).slice(0, 3)
    const mx = Math.max(...v), mn = Math.min(...v)
    return titled('La course d’orientation', fraction(
      `Pendant une course d'orientation, trois équipes suivent le même parcours. Au bout d'une heure, ${A} en ont parcouru ${F(n1, d1)}, ${B} ${F(n2, d2)} et ${C} ${F(n3, d2)}. Quelle fraction du parcours sépare l'équipe en tête de la dernière équipe ?`,
      mx - mn, d2, { explanation: `On écrit tout avec le dénominateur ${d2} : ${F(n1 * k, d2)}, ${F(n2, d2)} et ${F(n3, d2)}. En tête : ${F(mx, d2)} ; dernière : ${F(mn, d2)}. Écart : ${F(mx - mn, d2)}${simp(mx - mn, d2)} du parcours.` }))
  }),
  () => retry(() => {
    const { d1, d2, n1, n2, ok } = twoFracs(20)
    const N = d2 * randInt(2, 8), R = (N / d1) * n1, Bl = (N / d2) * n2, V = N - R - Bl
    if (!ok || V <= Bl || N > 120) return null
    const ctx = pick([
      { pot: 'Un bocal contient', obj: 'billes', c: ['rouges', 'bleues', 'vertes'] },
      { pot: 'Un sachet contient', obj: 'bonbons', c: ['à la fraise', 'au citron', 'à la menthe'] },
      { pot: 'Une volière abrite', obj: 'oiseaux', c: ['des perruches', 'des canaris', 'des pinsons'] },
    ])
    const prompt = ctx.obj === 'oiseaux'
      ? `${ctx.pot} ${N} ${ctx.obj}. ${F(n1, d1)} des oiseaux sont ${ctx.c[0]}, ${F(n2, d2)} sont ${ctx.c[1]} et les autres sont ${ctx.c[2]}. Combien y a-t-il de pinsons de plus que de canaris ?`
      : `${ctx.pot} ${N} ${ctx.obj}. ${F(n1, d1)} des ${ctx.obj} sont ${ctx.c[0]}, ${F(n2, d2)} sont ${ctx.c[1]} et les autres sont ${ctx.c[2]}. Combien y a-t-il de ${ctx.obj} ${ctx.c[2]} de plus que de ${ctx.obj} ${ctx.c[1]} ?`
    return titled('Le grand mélange', numeric(prompt, V - Bl, {
      explanation: `${N} ÷ ${d1} × ${n1} = ${R} et ${N} ÷ ${d2} × ${n2} = ${Bl}. Les autres : ${N} − ${R} − ${Bl} = ${V}. Différence : ${V} − ${Bl} = ${V - Bl}.`,
    }))
  }),
]

const frac2: Maker[] = [
  () => retry(() => {
    const { d1, k, d2, n1, n2, ok } = twoFracs(20)
    const s = n1 * k + n2, r = d2 - s, q = randInt(3, 15)
    if (!ok || r <= 0) return null
    const ctx = pick([
      ['Trois pirates se partagent un trésor', 'Le capitaine', 'le second', 'le mousse', 'pièces'],
      ['Trois héritiers se partagent les terres d’un seigneur', 'L’aîné', 'la cadette', 'le benjamin', 'hectares'],
      ['Trois associés se partagent un gain', 'La première', 'le deuxième', 'la troisième', 'euros'],
    ])
    return titled('Le partage du trésor', numeric(
      `${ctx[0]}. ${ctx[1]} reçoit ${F(n1, d1)} du total, ${ctx[2]} reçoit ${F(n2, d2)} du total, et ${ctx[3]} reçoit le reste, soit ${r * q} ${ctx[4]}. Quel était le total (en ${ctx[4]}) ?`,
      d2 * q, { explanation: `Les deux premières parts : ${F(n1 * k, d2)} + ${F(n2, d2)} = ${F(s, d2)} du total. Le reste vaut donc ${F(r, d2)} du total, soit ${r * q}. ${F(1, d2)} du total = ${r * q} ÷ ${r} = ${q}, donc le total vaut ${d2} × ${q} = ${d2 * q}.` }))
  }),
  () => retry(() => {
    const a = pick([2, 3]), b = a * pick([2, 3]), i = randInt(1, a - 1 || 1), j = randInt(1, b - 1)
    const left = shuffle(Array.from({ length: a }, (_, t) => t)).slice(0, i), right = shuffle(Array.from({ length: b }, (_, t) => t)).slice(0, j)
    const num = i * (b / a) + j, den = 2 * b
    if (a === 3 && b === 9) return null
    const H = 4, raw: Record<string, Pt> = {}
    for (let t = 0; t <= a; t++) { raw[`L${t}a`] = [0, (H * t) / a]; raw[`L${t}b`] = [3, (H * t) / a] }
    for (let t = 0; t <= b; t++) { raw[`R${t}a`] = [3, (H * t) / b]; raw[`R${t}b`] = [6, (H * t) / b] }
    const points = place(raw, { hidden: Object.keys(raw) })
    const segments: FigSegment[] = []
    for (let t = 0; t <= a; t++) segments.push({ a: `L${t}a`, b: `L${t}b` })
    for (let t = 0; t <= b; t++) segments.push({ a: `R${t}a`, b: `R${t}b` })
    segments.push({ a: 'L0a', b: `L${a}a` }, { a: 'R0a', b: `R${b}a` }, { a: 'R0b', b: `R${b}b` })
    const polygons = [
      ...left.map((t) => ({ pts: [`L${t}a`, `L${t}b`, `L${t + 1}b`, `L${t + 1}a`], fill: RED })),
      ...right.map((t) => ({ pts: [`R${t}a`, `R${t}b`, `R${t + 1}b`, `R${t + 1}a`], fill: BLUE })),
    ]
    return titled('Le vitrail de la chapelle', fraction(
      `${pick(['Ce vitrail de la chapelle', 'Ce drapeau du tournoi', 'Cette mosaïque du palais', 'Ce tapis de la grande salle'])}, de forme rectangulaire, est partagé en deux moitiés égales. La moitié gauche est découpée en ${a} bandes égales et la moitié droite en ${b} bandes égales. Quelle fraction de la surface totale est colorée ? (Donne une fraction irréductible.)`,
      num, den, { irreducible: true, explanation: `La surface entière contiendrait ${2 * a} bandes comme celles de gauche : chacune vaut ${F(1, 2 * a)} du total ; de même, une bande de droite vaut ${F(1, 2 * b)}. Partie colorée : ${F(i, 2 * a)} + ${F(j, 2 * b)} = ${F(i * (b / a), den)} + ${F(j, den)} = ${F(num, den)}${simp(num, den)}.` }),
      { points, segments, polygons, caption: '' })
  }),
  () => retry(() => {
    const C = randInt(4, 30) * 20, d1 = pick([3, 4, 5, 6, 8]), n1 = randInt(1, d1 - 1), d2 = pick([2, 3, 4, 5]), n2 = randInt(1, d2 - 1)
    if (gcd(n1, d1) !== 1 || gcd(n2, d2) !== 1 || C % d1) return null
    const R1 = C - (C / d1) * n1
    if (R1 % d2) return null
    const R2 = R1 - (R1 / d2) * n2
    return titled('La citerne du potager', numeric(
      `Une citerne contient ${C} L d'eau de pluie. Le premier jour, on utilise ${F(n1, d1)} de l'eau pour arroser le potager. Le deuxième jour, on utilise ${F(n2, d2)} de ce qui reste pour laver la charrette. Combien de litres reste-t-il dans la citerne ?`,
      R2, { explanation: `1er jour : ${C} ÷ ${d1} × ${n1} = ${(C / d1) * n1} L utilisés, il reste ${R1} L. 2e jour : ${R1} ÷ ${d2} × ${n2} = ${(R1 / d2) * n2} L utilisés (la fraction porte sur ce qui reste !). Il reste ${R2} L.` }))
  }),
  () => retry(() => {
    const pool: Pt[] = [[1, 2], [1, 3], [2, 3], [1, 4], [3, 4], [1, 6], [5, 6], [1, 12], [5, 12], [7, 12]]
    const [f1, f2, f3] = shuffle(pool)
    if (![f1, f2, f3].some((f) => f[1] === 12)) return null
    const tw = [f1, f2, f3].map(([n, d]) => (n * 12) / d), T = pick([2, 3]), rest = 12 * T - sum(tw)
    if (rest <= 0) return null
    const name = prenom()
    const act = shuffle(['à jouer aux échecs', 'à lire une BD', 'à jouer de la guitare', 'à faire du vélo', 'à dessiner', 'à jouer à la console']).slice(0, 3)
    return titled('Le mercredi après-midi', fraction(
      `${name} a ${T} heures de temps libre. ${name} passe ${F(f1[0], f1[1])} h ${act[0]}, ${F(f2[0], f2[1])} h ${act[1]} et ${F(f3[0], f3[1])} h ${act[2]}. Combien de temps lui reste-t-il ? Donne la réponse en heures, sous forme de fraction irréductible.`,
      rest, 12, { irreducible: true, explanation: `En douzièmes d'heure : ${F(tw[0], 12)} + ${F(tw[1], 12)} + ${F(tw[2], 12)} = ${F(sum(tw), 12)}. Or ${T} h = ${F(12 * T, 12)}. Il reste ${F(rest, 12)}${simp(rest, 12)} h.` }))
  }),
  () => retry(() => {
    const d = pick([2, 3, 4, 5, 6, 8]), e = d * pick([2, 3]), n = randInt(1, 2 * d), m = randInt(1, 3 * e), p = randInt(1, 2 * e)
    if (gcd(n, d) !== 1 || gcd(m, e) !== 1 || gcd(p, e) !== 1 || e > 24) return null
    const k = e / d
    if (Math.random() < 0.5) {
      const r = m - n * k
      if (r <= 0) return null
      return titled('La balance de l’épicier', fraction(
        `Sur la balance de l'épicier, un sachet de safran posé avec un poids de ${F(n, d)} kg affiche en tout ${F(m, e)} kg. Combien pèse le sachet de safran (en kg) ?`,
        r, e, { explanation: `On retire le poids : ${F(m, e)} − ${F(n, d)} = ${F(m, e)} − ${F(n * k, e)} = ${F(r, e)}${simp(r, e)} kg.` }))
    }
    const r = m + p - n * k
    if (r <= 0) return null
    return titled('La balance de Roberval', fraction(
      `Une balance est en équilibre. Sur le plateau de gauche, il y a un sac de farine et un poids de ${F(n, d)} kg ; sur le plateau de droite, deux poids de ${F(m, e)} kg et de ${F(p, e)} kg. Combien pèse le sac de farine (en kg) ?`,
      r, e, { explanation: `À droite : ${F(m, e)} + ${F(p, e)} = ${F(m + p, e)} kg. Le sac pèse ${F(m + p, e)} − ${F(n, d)} = ${F(m + p, e)} − ${F(n * k, e)} = ${F(r, e)}${simp(r, e)} kg.` }))
  }),
]

const frac3: Maker[] = [
  () => {
    const [a, b] = pick([[3, 6], [4, 12], [2, 6], [6, 12], [5, 20], [3, 12], [2, 10], [4, 8], [5, 10], [2, 8]])
    const k = b / a, minutes = (60 * b) / (k + 1)
    const ctx = pick(['l’abreuvoir des chevaux', 'la piscine du club', 'la citerne du village', 'le bassin des carpes', 'la cuve de la brasserie'])
    return titled('Les deux robinets', numeric(
      `Pour remplir ${ctx}, le robinet A, seul, mettrait ${a} heures et le robinet B, seul, ${b} heures. En une heure, A remplit donc ${F(1, a)} de la cuve. Combien de minutes faut-il pour tout remplir si l'on ouvre les deux robinets en même temps ?`,
      minutes, { explanation: `En une heure, les deux robinets remplissent ${F(1, a)} + ${F(1, b)} = ${F(k, b)} + ${F(1, b)} = ${F(k + 1, b)}${simp(k + 1, b)}. Chaque heure, on remplit ${k + 1} fois ${F(1, b)} de la cuve, et il faut ${b} fois ${F(1, b)} pour la remplir : cela prend ${b} ÷ ${k + 1} = ${Fs(b, k + 1)} h, soit ${b} × 60 ÷ ${k + 1} = ${minutes} min.` }))
  },
  () => retry(() => {
    const D = pick([12, 18, 20, 24, 30, 36, 40])
    const divs = [2, 3, 4, 5, 6, 8, 9, 10, 12].filter((q) => D % q === 0 && q < D)
    const q = pick(divs), s = pick(divs), p = randInt(1, q - 1), r = randInt(1, s - 1)
    if (gcd(p, q) !== 1 || gcd(r, s) !== 1 || p / q >= r / s) return null
    const lo = (p * D) / q, hi = (r * D) / s
    const cand = Array.from({ length: hi - lo - 1 }, (_, t) => lo + 1 + t).filter((n) => gcd(n, D) === 1)
    if (cand.length !== 1 || hi - lo < 3) return null
    const n = cand[0]
    return titled('La fraction mystère', fraction(
      `Je suis une fraction irréductible de dénominateur ${D}. Je suis strictement plus grande que ${F(p, q)} et strictement plus petite que ${F(r, s)}. Qui suis-je ?`,
      n, D, { irreducible: true, explanation: `${F(p, q)} = ${F(lo, D)} et ${F(r, s)} = ${F(hi, D)}. Entre les deux : ${Array.from({ length: hi - lo - 1 }, (_, t) => F(lo + 1 + t, D)).join(' ; ')}. Une seule est irréductible : ${F(n, D)}.` }))
  }),
  () => retry(() => {
    const d = pick([3, 4, 5, 6, 8]), n = randInt(2, d - 1), c = d * randInt(1, 6), j = randInt(2, 12) / 2
    if (gcd(n, d) !== 1 || c < 4) return null
    const A = j + c, B = j + (c * n) / d
    if (!clean(B)) return null
    const ctx = pick([['Une jarre pleine d’huile', 'la jarre'], ['Un tonneau plein de cidre', 'le tonneau'], ['Un seau plein de sable', 'le seau'], ['Un bidon plein de lait', 'le bidon']])
    return titled('La jarre du marchand', numeric(
      `${ctx[0]} pèse ${fmt(A)} kg. Quand ${ctx[1]} n'est remplie qu'aux ${F(n, d)}, l'ensemble pèse ${fmt(B)} kg. Combien pèse ${ctx[1]} vide (en kg) ?`.replace('remplie', ctx[1].startsWith('la') ? 'remplie' : 'rempli'),
      j, { explanation: `Entre « plein » et « aux ${F(n, d)} », il manque ${F(d - n, d)} du contenu, qui pèse ${fmt(A)} − ${fmt(B)} = ${fmt(A - B)} kg. Donc ${F(1, d)} du contenu pèse ${fmt((A - B) / (d - n))} kg et tout le contenu ${c} kg. Récipient vide : ${fmt(A)} − ${c} = ${fmt(j)} kg.` }))
  }),
  () => retry(() => {
    const q = pick([6, 8, 10, 12, 15, 16, 20]), d = pick([2, 3, 4, 5].filter((t) => q % t === 0 && t < q)), n = randInt(1, d - 1)
    const g = randInt(1, 3), b = (n * q) / d - g, L = randInt(1, 3)
    if (gcd(n, d) !== 1 || b <= 0 || gcd(b, q) !== 1 || !isInt((L * q) / g)) return null
    const [A, B] = deuxPrenoms()
    const t = (L * q) / g
    return titled('Les tours de piste', numeric(
      `Sur la piste du stade, ${A} parcourt ${F(n, d)} de tour par minute et ${B} parcourt ${F(b, q)} de tour par minute. Ils partent ensemble de la ligne de départ. Au bout de combien de minutes l'avance de ${A} sur ${B} sera-t-elle exactement ${L === 1 ? 'd’un tour' : `de ${L} tours`} ?`,
      t, { explanation: `Chaque minute, l'écart augmente de ${F(n, d)} − ${F(b, q)} = ${F((n * q) / d, q)} − ${F(b, q)} = ${F(g, q)}${simp(g, q)} de tour. Pour ${L === 1 ? '1 tour' : `${L} tours`} d'avance, soit ${F(L * q, q)}, il faut ${L * q} ÷ ${g} = ${t} minutes.` }))
  }),
  () => retry(() => {
    const s = pick([6, 8, 10, 12]), p = randInt(2, s - 2), q = randInt(2, s - 2)
    const t1 = (s * p) / 2, t2 = ((s - p) * q) / 2, t3 = (s * (s - q)) / 2, sh = s * s - t1 - t2 - t3
    const nn = 2 * sh, dd = 2 * s * s
    if (gcd(nn, dd) === dd) return null
    const points = place({ A: [0, 0], B: [s, 0], C: [s, s], D: [0, s], P: [p, 0], Q: [s, q] }, { pos: { A: 'sw', B: 'se', C: 'ne', D: 'nw', P: 's', Q: 'e' } })
    const figure: Figure = {
      points, polygons: [{ pts: ['D', 'P', 'Q'], fill: RED }],
      segments: [{ a: 'A', b: 'P', label: `${p} cm` }, { a: 'P', b: 'B' }, { a: 'B', b: 'Q', label: `${q} cm` }, { a: 'Q', b: 'C' }, { a: 'C', b: 'D' }, { a: 'D', b: 'A', label: `${s} cm` }, ...loop(['D', 'P', 'Q'])],
      angles: [{ vertex: 'C', a: 'D', b: 'B', right: true }],
    }
    return titled('Le carré découpé', fraction(
      `ABCD est un carré de ${s} cm de côté. Le point P est sur [AB] avec AP = ${p} cm et le point Q est sur [BC] avec BQ = ${q} cm. Quelle fraction de l'aire du carré représente le triangle DPQ colorié ? (Donne une fraction irréductible.)`,
      nn, dd, { irreducible: true, explanation: `Aire du carré : ${s * s} cm². On retire les trois triangles rectangles : ADP = ${s} × ${p} ÷ 2 = ${fmt(t1)}, PBQ = ${s - p} × ${q} ÷ 2 = ${fmt(t2)} et QCD = ${s} × ${s - q} ÷ 2 = ${fmt(t3)} (en cm²). Triangle DPQ : ${fmt(sh)} cm², soit ${Fs(nn, dd)} de l'aire du carré.` }), figure)
  }),
]

// ═══════════════════════════════════════════════════════════════════════
// 5e-lit — Calcul littéral
// ═══════════════════════════════════════════════════════════════════════
/** Monôme kx lisible (x, 3x). */
const kx = (k: number) => poly([k, 'x'])

/** Figure des allumettes : 0 = carrés en ligne, 1 = triangles, 2 = deux rangées de carrés (3 motifs). */
function matchFigure(kind: 0 | 1 | 2): Figure {
  const raw: Record<string, Pt> = {}
  const segs: FigSegment[] = []
  const M = '#8a4b1c'
  if (kind === 1) {
    Object.assign(raw, { b0: [0, 0], b1: [1, 0], b2: [2, 0], t0: [0.5, 0.87], t1: [1.5, 0.87] })
    for (const [a, b] of [['b0', 'b1'], ['b1', 'b2'], ['t0', 't1'], ['b0', 't0'], ['t0', 'b1'], ['b1', 't1'], ['t1', 'b2']]) segs.push({ a, b, color: M })
  } else {
    const rows = kind === 0 ? 1 : 2
    for (let i = 0; i <= 3; i++) for (let r = 0; r <= rows; r++) raw[`p${i}-${r}`] = [i, r]
    for (let r = 0; r <= rows; r++) for (let i = 0; i < 3; i++) segs.push({ a: `p${i}-${r}`, b: `p${i + 1}-${r}`, color: M })
    for (let i = 0; i <= 3; i++) for (let r = 0; r < rows; r++) segs.push({ a: `p${i}-${r}`, b: `p${i}-${r + 1}`, color: M })
  }
  return { points: place(raw, { hidden: Object.keys(raw), margin: 50 }), segments: segs, caption: 'Le motif à 3 éléments.' }
}

const lit1: Maker[] = [
  () => {
    const a = randInt(2, 9), b = randInt(3, 12), q = randInt(0, 2)
    const exp = q === 0 ? poly([2, 'x'], [2 * a + 2 * b, '']) : q === 1 ? poly([b, 'x'], [a * b, '']) : poly([1, 'x'], [a + 2 * b, ''])
    const ask = q === 0 ? 'Exprime en fonction de x la longueur de clôture nécessaire pour en faire le tour'
      : q === 1 ? 'Exprime l’aire de l’enclos (en m²) en fonction de x'
        : 'L’enclos est adossé au mur de la bergerie sur un de ses grands côtés, qui n’a donc pas besoin de clôture. Exprime en fonction de x la longueur de clôture nécessaire'
    const expl = q === 0 ? `Tour complet : 2 × (x + ${a}) + 2 × ${b} = 2x + ${2 * a} + ${2 * b} = ${exp}.`
      : q === 1 ? `Aire = longueur × largeur = ${b} × (x + ${a}) = ${b}x + ${a * b}.`
        : `On clôture un grand côté et les deux petits : (x + ${a}) + 2 × ${b} = ${exp}.`
    const points = place({ A: [0, 0], B: [7, 0], C: [7, 3.5], D: [0, 3.5] }, { blank: ['A', 'B', 'C', 'D'] })
    const figure: Figure = { points, segments: [{ a: 'A', b: 'B', label: `x + ${a}` }, { a: 'B', b: 'C' }, { a: 'C', b: 'D', color: q === 2 ? '#8a6a3c' : undefined }, { a: 'D', b: 'A', label: `${b}` }], polygons: [{ pts: ['A', 'B', 'C', 'D'], fill: GREEN }] }
    if (q === 2) {
      const c = centerOf(points, ['C', 'D'])
      figure.notes = [{ x: c.x, y: c.y - 8, text: 'mur' }]
    }
    return titled('L’enclos du berger', expression(
      `Le berger construit un enclos rectangulaire de x + ${a} mètres de long et ${b} mètres de large. ${ask}, sous forme développée et réduite.`,
      exp, 'developed', { explanation: expl }), figure)
  },
  () => {
    const k = randInt(2, 6), a = randInt(1, 9), v = randInt(0, 1)
    if (v === 0) {
      const b = randInt(2, 7)
      return titled('Le programme de calcul', expression(
        `Voici un programme de calcul : « Choisis un nombre x. Ajoute-lui ${a}. Multiplie le résultat par ${k}. Ajoute ${b} fois le nombre de départ. » Écris le résultat en fonction de x, sous forme développée et réduite.`,
        poly([k + b, 'x'], [k * a, '']), 'developed', { explanation: `${k}(x + ${a}) + ${b}x = ${k}x + ${k * a} + ${b}x = ${poly([k + b, 'x'], [k * a, ''])}.` }))
    }
    const b = randInt(1, k * a - 1), c = randInt(2, 5)
    return titled('Le programme de calcul', expression(
      `Voici un programme de calcul : « Choisis un nombre x. Ajoute-lui ${a}. Multiplie le résultat par ${k}. Retire ${b}. Ajoute enfin le nombre de départ multiplié par ${c}. » Écris le résultat en fonction de x, sous forme développée et réduite.`,
      poly([k + c, 'x'], [k * a - b, '']), 'developed', { explanation: `${k}(x + ${a}) − ${b} + ${c}x = ${k}x + ${k * a} − ${b} + ${c}x = ${poly([k + c, 'x'], [k * a - b, ''])}.` }))
  },
  () => {
    const [A, B] = deuxPrenoms(), a = randInt(2, 6), v = randInt(0, 2), m = randInt(2, 4), c = randInt(20, 30)
    const [who, exp, expl] =
      v === 0 ? ['leur père, qui a ' + m + ' fois l’âge de ' + B, poly([m, 'x'], [m * a, '']), `${m} × (x + ${a}) = ${poly([m, 'x'], [m * a, ''])}.`]
        : v === 1 ? [`leur grand-mère, qui a ${m} fois la somme des âges ${deP(A)} et ${deP(B)}`, poly([2 * m, 'x'], [m * a, '']), `${m} × (x + x + ${a}) = ${m} × (2x + ${a}) = ${poly([2 * m, 'x'], [m * a, ''])}.`]
          : [`leur mère, qui a ${c} ans de plus que la somme des âges ${deP(A)} et ${deP(B)}`, poly([2, 'x'], [a + c, '']), `x + (x + ${a}) + ${c} = ${poly([2, 'x'], [a + c, ''])}.`]
    return titled('Les âges de la famille', expression(
      `${A} a x ans et ${B} a ${a} ans de plus ${queP(A)}. Exprime en fonction de x l'âge de ${who}, sous forme développée et réduite.`,
      exp, 'developed', { explanation: `${B} a x + ${a} ans. ${expl}` }))
  },
  () => retry(() => {
    const k1 = randInt(2, 4), k2 = randInt(2, 5), a = randInt(1, 9), b = randInt(1, 9), c = randInt(2, 12)
    if (a === b) return null
    const exp = poly([1 + k1 + k2, 'x'], [a - b + c, ''])
    if (a - b + c === 0) return null
    const figure = triangleFigure({ shape: [55, 65], sides: { AB: `x + ${a}`, BC: kx(k1), CA: poly([k2, 'x'], [-b, '']) } })
    return titled('Le fanion du club', expression(
      `Le fanion du club est un triangle dont les côtés mesurent x + ${a}, ${kx(k1)} et ${poly([k2, 'x'], [-b, ''])} (en cm). On coud un galon tout autour, et il faut prévoir ${c} cm de galon en plus pour les nœuds. Exprime la longueur de galon nécessaire en fonction de x, sous forme réduite.`,
      exp, 'developed', { explanation: `x + ${a} + ${kx(k1)} + ${poly([k2, 'x'], [-b, ''])} + ${c} : on regroupe les x (1 + ${k1} + ${k2} = ${1 + k1 + k2}) et les nombres (${a} − ${b} + ${c} = ${a - b + c}) : ${exp}.` }), figure)
  }),
  () => {
    const ctx = pick([['Au club de kayak', 'sortie', 'sorties'], ['À la salle d’escalade', 'séance', 'séances'], ['Au karting', 'course', 'courses'], ['Au cinéma du quartier', 'film', 'films']])
    const a = randInt(10, 40), b = pick([4, 5, 6.5, 7.5, 8, 12]), n = randInt(3, 15), T = a + b * n
    return titled('La formule du tarif', numeric(
      `${ctx[0]}, le prix à payer pour n ${ctx[2]} dans l'année est donné par la formule : prix = ${a} + ${fmt(b)} × n (en €). ${prenom()} a payé ${fmt(T)} € cette année. À combien de ${ctx[2]} cela correspond-il ?`,
      n, { explanation: `${a} + ${fmt(b)} × n = ${fmt(T)}, donc ${fmt(b)} × n = ${fmt(T)} − ${a} = ${fmt(T - a)}, et n = ${fmt(T - a)} ÷ ${fmt(b)} = ${n}.` }))
  },
]

const lit2: Maker[] = [
  () => {
    const v = randInt(0, 2), a = randInt(2, 12), k = randInt(2, 9), name = prenom()
    let steps: string, res: number, expl: string
    if (v === 0) {
      steps = `Ajoute ${a}. Multiplie le résultat par ${k}. Retire ${k} fois le nombre auquel tu as pensé.`
      res = k * a; expl = `${k}(x + ${a}) − ${k}x = ${k}x + ${k * a} − ${k}x = ${res}.`
    } else if (v === 1) {
      const b = randInt(2, 15)
      steps = `Multiplie-le par ${k}. Ajoute ${a}. Retire ${k} fois le nombre auquel tu as pensé. Ajoute ${b}.`
      res = a + b; expl = `${k}x + ${a} − ${k}x + ${b} = ${res}.`
    } else {
      const m = randInt(2, 5)
      steps = `Multiplie-le par ${k}. Ajoute ${a}. Multiplie le tout par ${m}. Retire ${k * m} fois le nombre auquel tu as pensé.`
      res = m * a; expl = `${m}(${k}x + ${a}) − ${k * m}x = ${k * m}x + ${m * a} − ${k * m}x = ${res}.`
    }
    return titled('Le tour de magie', numeric(
      `${name} propose un tour de magie : « Pense à un nombre. ${steps} » Quel que soit le nombre choisi au départ, on obtient toujours le même résultat. Lequel ?`,
      res, { explanation: `Avec x le nombre choisi : ${expl} Les x disparaissent, le résultat ne dépend pas du nombre choisi.` }))
  },
  () => retry(() => {
    const a = randInt(4, 10), b = randInt(5, 12), c = randInt(2, a - 1), d = randInt(2, Math.floor((b - 1) / 2))
    const L = 6 + a, exp = poly([b, 'x'], [a * b - c * d, ''])
    const points = place({ A: [0, 0], B: [L, 0], C: [L, b - d], D: [L - c, b - d], E: [L - c, b], G: [0, b] }, { blank: ['A', 'B', 'C', 'D', 'E', 'G'] })
    const figure: Figure = {
      points, polygons: [{ pts: ['A', 'B', 'C', 'D', 'E', 'G'], fill: BLUE }],
      segments: loop(['A', 'B', 'C', 'D', 'E', 'G'], [`x + ${a}`, undefined, `${c}`, `${d}`, undefined, `${b}`]),
    }
    return titled('La salle de sport', expression(
      `Une salle de sport a la forme ci-dessous (longueurs en mètres, tous les angles sont droits) : c'est un rectangle de x + ${a} sur ${b} dont on a retiré un coin rectangulaire de ${c} sur ${d}. Exprime l'aire de la salle en fonction de x, sous forme développée et réduite.`,
      exp, 'developed', { explanation: `Grand rectangle : ${b} × (x + ${a}) = ${b}x + ${a * b}. Coin retiré : ${c} × ${d} = ${c * d}. Aire : ${b}x + ${a * b} − ${c * d} = ${exp}.` }), figure)
  }),
  () => retry(() => {
    const k = randInt(2, 9), m = randInt(1, 5), c = randInt(1, 9)
    if (gcd(m, c) !== 1) return null
    const area = poly([k * m, 'x'], [k * c, '']), ans = poly([m, 'x'], [c, ''])
    const points = place({ A: [0, 0], B: [7, 0], C: [7, 3.2], D: [0, 3.2] }, { blank: ['A', 'B', 'C', 'D'] })
    const ctr = centerOf(points, ['A', 'C'])
    const figure: Figure = {
      points, polygons: [{ pts: ['A', 'B', 'C', 'D'], fill: GREEN }],
      segments: loop(['A', 'B', 'C', 'D'], ['?', undefined, undefined, `${k} m`]),
      notes: [{ x: ctr.x, y: ctr.y + 5, text: `aire : ${area} m²` }],
    }
    return titled('La longueur du potager', expression(
      `Un potager rectangulaire a une largeur de ${k} m et une aire de ${area} m², où x désigne un nombre positif. Exprime la longueur du potager (en m) en fonction de x.`,
      ans, 'developed', { explanation: `Aire = largeur × longueur, il faut donc écrire ${area} sous la forme ${k} × (…) : ${area} = ${k} × ${kx(m)} + ${k} × ${c} = ${k}(${ans}). La longueur est ${ans}.` }), figure)
  }),
  () => {
    const kind = pick([0, 1, 2] as const), N = randInt(25, 120), name = prenom()
    const [first, step, word] = kind === 0 ? [4, 3, 'carrés en ligne'] : kind === 1 ? [3, 2, 'triangles'] : [7, 5, 'colonnes de deux carrés']
    const tot = first + step * (N - 1)
    return titled('Les allumettes', numeric(
      `${name} construit des motifs avec des allumettes : des ${word}, comme sur la figure (ici avec 3 éléments). Combien d'allumettes faut-il pour un motif de ${N} éléments ?`,
      tot, { explanation: `Pour 1 élément il faut ${first} allumettes, et chaque nouvel élément en ajoute ${step}. Pour n éléments : ${first} + ${step} × (n − 1) = ${poly([step, 'n'], [first - step, ''])}. Pour ${N} : ${step} × ${N} + ${first - step} = ${tot}.` }),
      matchFigure(kind))
  },
  () => retry(() => {
    const a = randInt(2, 5), b = randInt(1, 6), c = a + randInt(1, 4), x0 = randInt(2, 10)
    const d = (c - a) * x0 - a * b
    if (d <= 0) return null
    return titled('Le cadenas à code', numeric(
      `Le cadenas du coffre s'ouvre avec un nombre entier x compris entre 0 et 12. Sur le couvercle, on lit : « Le code vérifie ${a}(${xPlus(b)}) = ${poly([c, 'x'], [-d, ''])}. » Teste des valeurs, ou raisonne : quel est le code ?`,
      x0, { explanation: `${a}(${xPlus(b)}) = ${a}x + ${a * b}. On cherche x tel que ${a}x + ${a * b} = ${c}x − ${d}. Pour x = ${x0} : à gauche ${a * x0 + a * b}, à droite ${c * x0 - d}. C'est égal : le code est ${x0} (à chaque unité de plus, le membre de droite gagne ${c - a} de plus que celui de gauche, il n'y a qu'une solution).` }))
  }),
]

const lit3: Maker[] = [
  () => retry(() => {
    const ctx = pick([['la piscine', 'entrée'], ['la salle d’escalade', 'séance'], ['le cinéma', 'séance'], ['le club de poney', 'leçon']])
    const p = pick([2, 2.5, 3, 3.5, 4, 5, 6]), q = p + pick([1, 1.5, 2, 2.5, 3]), x = randInt(5, 14), f = (q - p) * x
    if (!clean(f)) return null
    return titled('Les deux tarifs', numeric(
      `Pour ${ctx[0]}, deux formules sont proposées. Formule A : un abonnement de ${fmt(f)} € pour l'année, puis ${fmt(p)} € par ${ctx[1]}. Formule B : pas d'abonnement, ${fmt(q)} € par ${ctx[1]}. À partir de combien de ${ctx[1]}s la formule A devient-elle strictement moins chère que la formule B ?`,
      x + 1, { explanation: `Pour n ${ctx[1]}s : A coûte ${fmt(f)} + ${fmt(p)}n et B coûte ${fmt(q)}n. À chaque ${ctx[1]}, B coûte ${fmt(q - p)} € de plus que A : il faut ${fmt(f)} ÷ ${fmt(q - p)} = ${x} ${ctx[1]}s pour « rattraper » l'abonnement. Pour ${x}, les deux coûtent ${fmt(q * x)} € ; A est strictement moins chère à partir de ${x + 1}.` }))
  }),
  () => {
    const a = randInt(2, 8), s = 6 + 2 * 1.3, e = 1.3
    const raw: Record<string, Pt> = { O1: [0, 0], O2: [s, 0], O3: [s, s], O4: [0, s], I1: [e, e], I2: [e + 6, e], I3: [e + 6, e + 6], I4: [e, e + 6], H: [e + 6, 0] }
    const points = place(raw, { hidden: Object.keys(raw) })
    const figure: Figure = {
      points,
      polygons: [
        { pts: ['O1', 'O2', 'H', 'I2', 'I1'], fill: GOLD }, { pts: ['O2', 'O3', 'I3', 'I2', 'H'], fill: GOLD },
        { pts: ['O3', 'O4', 'I4', 'I3'], fill: GOLD }, { pts: ['O4', 'O1', 'I1', 'I4'], fill: GOLD },
      ],
      segments: [...loop(['O1', 'O2', 'O3', 'O4']), ...loop(['I1', 'I2', 'I3', 'I4'], [undefined, 'x']), { a: 'I2', b: 'H', label: `${a}`, dashed: true }],
    }
    const exp = poly([4 * a, 'x'], [4 * a * a, ''])
    return titled('Le cadre du tableau', expression(
      `${pick(['Un tableau', 'Un miroir', 'Une photo', 'Une carte ancienne', 'Un blason'])} de forme carrée, de x cm de côté, est entouré d'un cadre ${pick(['en bois', 'doré', 'en métal'])} de ${a} cm de large (zone colorée). Exprime l'aire du cadre (en cm²) en fonction de x, sous forme développée et réduite.`,
      exp, 'developed', { explanation: `On découpe le cadre en 4 rectangles : à gauche et à droite, deux rectangles de ${a} sur x ; en haut et en bas, deux rectangles de ${a} sur x + ${2 * a}. Aire : 2 × ${a}x + 2 × ${a}(x + ${2 * a}) = ${2 * a}x + ${2 * a}x + ${4 * a * a} = ${exp}.` }), figure)
  },
  () => {
    const v = randInt(0, 2), n = randInt(8, 60)
    const [k, step, words] = v === 0 ? [3, 1, 'trois nombres entiers consécutifs'] : v === 1 ? [5, 1, 'cinq nombres entiers consécutifs'] : [4, 2, 'quatre nombres pairs consécutifs']
    const first = v === 2 ? 2 * Math.floor(n / 2) : n
    const vals = Array.from({ length: k }, (_, i) => first + i * step), S = sum(vals), big = Math.random() < 0.5
    const ctx = pick(['les numéros de maillots de plusieurs joueurs alignés', 'les numéros de plusieurs maisons voisines d’une rue', 'les numéros de dossards de coureurs arrivés à la suite', 'des numéros tirés au loto du village'])
    const sumX = poly([k, 'x'], [sum(vals.map((_, i) => i * step)), ''])
    return titled('Les nombres consécutifs', numeric(
      `${prenom()} remarque que ${ctx} sont ${words} et que leur somme vaut ${S}. Quel est le plus ${big ? 'grand' : 'petit'} de ces nombres ?`,
      big ? vals[k - 1] : vals[0], { explanation: `Si x est le plus petit, les nombres sont ${vals.map((_, i) => (i ? xPlus(i * step) : 'x')).join(', ')} et leur somme vaut ${sumX}. Donc ${k}x = ${S} − ${S - k * first} = ${k * first} et x = ${first}. Les nombres : ${vals.join(', ')}.` }))
  },
  () => retry(() => {
    const v = randInt(0, 2), a = randInt(2, 8), b = randInt(2, 8)
    let x: number, rect: [string, string], other: 'square' | 'tri', expl: string
    if (v === 0) { x = a + b; rect = [`x + ${a}`, `${b}`]; other = 'square'; expl = `Rectangle : 2(x + ${a}) + 2 × ${b} = 2x + ${2 * a + 2 * b}. Carré : 4x. Il faut 4x = 2x + ${2 * a + 2 * b}, donc 2x = ${2 * a + 2 * b} et x = ${x}.` }
    else if (v === 1) { x = 2 * a; rect = ['x', `${a}`]; other = 'tri'; expl = `Rectangle : 2x + ${2 * a}. Triangle équilatéral : 3x. Il faut 3x = 2x + ${2 * a}, donc x = ${x}.` }
    else { x = 2 * a + 2 * b; rect = [`x + ${a}`, `${b}`]; other = 'tri'; expl = `Rectangle : 2(x + ${a}) + 2 × ${b} = 2x + ${2 * a + 2 * b}. Triangle équilatéral : 3x. Il faut 3x = 2x + ${2 * a + 2 * b}, donc x = ${x}.` }
    const P = other === 'square' ? 4 * x : 3 * x
    const raw: Record<string, Pt> = { A: [0, 0], B: [5, 0], C: [5, 2.6], D: [0, 2.6] }
    if (other === 'square') Object.assign(raw, { E: [6.5, 0], G: [9.5, 0], H: [9.5, 3], K: [6.5, 3] })
    else Object.assign(raw, { E: [6.5, 0], G: [10, 0], H: [8.25, 3.03] })
    const names = Object.keys(raw)
    const points = place(raw, { blank: names })
    const shape2 = other === 'square' ? ['E', 'G', 'H', 'K'] : ['E', 'G', 'H']
    const figure: Figure = {
      points,
      segments: [...loop(['A', 'B', 'C', 'D'], [rect[0], undefined, undefined, rect[1]]), ...loop(shape2, ['x']).map((s) => ({ ...s, mark: 'tick' as const }))],
      polygons: [{ pts: ['A', 'B', 'C', 'D'], fill: BLUE }, { pts: shape2, fill: GOLD }],
    }
    const desc = v === 1 ? `un rectangle de côtés x et ${a}` : `un rectangle de côtés x + ${a} et ${b}`
    return titled('Les deux clôtures', numeric(
      `Avec la même longueur de grillage, on peut clôturer ${desc}, ou bien ${other === 'square' ? 'un carré' : 'un triangle équilatéral'} de côté x (longueurs en m). Trouve x, puis donne la longueur de grillage commune (en m).`,
      P, { explanation: `${expl} Longueur de grillage : ${other === 'square' ? `4 × ${x}` : `3 × ${x}`} = ${P} m.` }), figure)
  }),
  () => {
    const c = randInt(9, 23), S = 9 * c, ask = randInt(0, 2)
    const mois = pick(['janvier', 'mars', 'mai', 'juillet', 'octobre', 'décembre'])
    const [word, ans] = ask === 0 ? ['le plus petit', c - 8] : ask === 1 ? ['le plus grand', c + 8] : ['celui du centre', c]
    return titled('Le carré du calendrier', numeric(
      `Sur le calendrier du mois de ${mois}, ${prenom()} entoure un carré de 3 × 3 cases : 3 jours qui se suivent, sur 3 semaines qui se suivent. La somme des 9 nombres entourés vaut ${S}. Quel est ${word} de ces nombres ?`,
      ans, { explanation: `Si x est le nombre du centre, la ligne du dessus contient x − 8, x − 7, x − 6 (une semaine = 7 jours), celle du dessous x + 6, x + 7, x + 8. La somme des 9 nombres vaut 9x, donc x = ${S} ÷ 9 = ${c}. Les nombres vont de ${c - 8} à ${c + 8}.` }))
  },
  () => retry(() => {
    const m = randInt(1, 5), c = randInt(2, 12), n = randInt(1, 4), e = randInt(1, 9)
    if (n >= m && m > 1) return null
    const L = poly([m, 'x'], [c, '']), ans = poly([n, 'x'], [e, '']), P = poly([2 * (m + n), 'x'], [2 * (c + e), ''])
    const points = place({ A: [0, 0], B: [7, 0], C: [7, 3.2], D: [0, 3.2] }, { blank: ['A', 'B', 'C', 'D'] })
    const ctr = centerOf(points, ['A', 'C'])
    const figure: Figure = {
      points, polygons: [{ pts: ['A', 'B', 'C', 'D'], fill: GOLD }],
      segments: loop(['A', 'B', 'C', 'D'], [L, undefined, undefined, '?']),
      notes: [{ x: ctr.x, y: ctr.y + 5, text: `périmètre : ${P}` }],
    }
    return titled('Le tapis du donjon', expression(
      `Un tapis rectangulaire a une longueur de ${L} (en dm) et un périmètre de ${P} (en dm), où x est un nombre positif. Exprime sa largeur en fonction de x, sous forme réduite.`,
      ans, 'developed', { explanation: `Le demi-périmètre (longueur + largeur) vaut ${P} ÷ 2 = ${poly([m + n, 'x'], [c + e, ''])}, car ${P} = 2(${poly([m + n, 'x'], [c + e, ''])}). Largeur : ${poly([m + n, 'x'], [c + e, ''])} − (${L}) = ${ans}.` }), figure)
  }),
]

// ═══════════════════════════════════════════════════════════════════════
// 5e-prop — Proportionnalité
// ═══════════════════════════════════════════════════════════════════════
/** Durée d'un trajet en minutes, expliquée sans décimales interminables. */
const dur = (d: number, v: number) => (clean(d / v) ? `${fmt(d)} ÷ ${v} = ${fmt(d / v)} h = ${fmt((d / v) * 60)} min` : `${fmt(d)} × 60 ÷ ${v} = ${fmt((d / v) * 60)} min`)
type Ing = [number, string, string] // quantité, texte (# = quantité), question
const RECIPES: { nom: string; ing: Ing[] }[] = [
  { nom: 'des crêpes', ing: [[250, '# g de farine', 'Quelle masse de farine faut-il (en g) ?'], [50, '# cL de lait', 'Quelle quantité de lait faut-il (en cL) ?'], [4, '# œufs', 'Combien d’œufs faut-il ?'], [40, '# g de sucre', 'Quelle masse de sucre faut-il (en g) ?']] },
  { nom: 'un gâteau au chocolat', ing: [[200, '# g de chocolat', 'Quelle masse de chocolat faut-il (en g) ?'], [100, '# g de beurre', 'Quelle masse de beurre faut-il (en g) ?'], [4, '# œufs', 'Combien d’œufs faut-il ?'], [120, '# g de sucre', 'Quelle masse de sucre faut-il (en g) ?']] },
  { nom: 'une soupe de légumes', ing: [[600, '# g de carottes', 'Quelle masse de carottes faut-il (en g) ?'], [400, '# g de pommes de terre', 'Quelle masse de pommes de terre faut-il (en g) ?'], [2, '# poireaux', 'Combien de poireaux faut-il ?'], [120, '# cL d’eau', 'Quelle quantité d’eau faut-il (en cL) ?']] },
  { nom: 'des smoothies', ing: [[2, '# bananes', 'Combien de bananes faut-il ?'], [160, '# g de fraises', 'Quelle masse de fraises faut-il (en g) ?'], [240, '# g de yaourt', 'Quelle masse de yaourt faut-il (en g) ?'], [20, '# cL de jus d’orange', 'Quelle quantité de jus d’orange faut-il (en cL) ?']] },
]

const prop1: Maker[] = [
  () => retry(() => {
    const r = pick(RECIPES), n = pick([4, 6, 8]), m = randInt(2, 20), i = randInt(0, 3)
    const q = r.ing[i][0], ans = (q * m) / n
    if (m === n || m % n === 0 || n % m === 0 || !isInt(ans)) return null
    const list = r.ing.map(([v, t]) => t.replace('#', String(v))).join(', ')
    return titled('La recette pour tous', numeric(
      `Pour ${n} personnes, la recette ${r.nom.startsWith('des') ? `de ${r.nom.slice(4)}` : `d’${r.nom}`} demande : ${list}. ${prenom()} veut la préparer pour ${m} personnes. ${r.ing[i][2]}`,
      ans, { explanation: `Les quantités sont proportionnelles au nombre de personnes : ${q} × ${m} ÷ ${n} = ${q * m} ÷ ${n} = ${fmt(ans)}.` }))
  }),
  () => retry(() => {
    const scale = pick([50, 100, 200])
    const step = scale === 50 ? 1 : 0.5
    const a = randInt(scale === 50 ? 8 : scale === 100 ? 6 : 4, scale === 50 ? 16 : scale === 100 ? 14 : 7) * step
    const b = randInt(scale === 50 ? 6 : scale === 100 ? 6 : 4, scale === 50 ? 12 : scale === 100 ? 12 : 6) * step
    const A = (a * scale) / 100, B = (b * scale) / 100, q = randInt(0, 1)
    if (a <= b || !clean(A * B)) return null
    const piece = pick(['le salon', 'la cuisine', 'la chambre', 'le garage', 'l’atelier'])
    const points = place({ P: [0, 0], Q: [a, 0], R: [a, b], S: [0, b] }, { blank: ['P', 'Q', 'R', 'S'] })
    const figure: Figure = { points, segments: loop(['P', 'Q', 'R', 'S'], [`${fmt(a)} cm`, `${fmt(b)} cm`]), polygons: [{ pts: ['P', 'Q', 'R', 'S'], fill: GOLD }], caption: `Plan à l’échelle 1/${scale} (dessin réduit).` }
    const ask = q === 0 ? `Quelle est l'aire réelle de ${piece} (en m²) ?` : `On veut poser une plinthe tout autour de ${piece}. Quelle longueur de plinthe faut-il (en m) ?`
    const ans = q === 0 ? A * B : 2 * (A + B)
    return titled('Le plan de la maison', numeric(
      `Sur le plan d'une maison à l'échelle 1/${scale}, ${piece} est un rectangle de ${fmt(a)} cm sur ${fmt(b)} cm. ${ask}`,
      ans, { explanation: `À l'échelle 1/${scale}, 1 cm sur le plan représente ${scale} cm = ${fmt(scale / 100)} m en réalité. Dimensions réelles : ${fmt(a)} × ${fmt(scale / 100)} = ${fmt(A)} m et ${fmt(b)} × ${fmt(scale / 100)} = ${fmt(B)} m. ${q === 0 ? `Aire : ${fmt(A)} × ${fmt(B)} = ${fmt(A * B)} m².` : `Périmètre : 2 × (${fmt(A)} + ${fmt(B)}) = ${fmt(ans)} m.`}` }), figure)
  }),
  () => retry(() => {
    const ctx = pick([['à vélo', 'roule'], ['en roller', 'roule'], ['à cheval', 'galope'], ['en trottinette', 'roule'], ['en kayak', 'pagaie']])
    const v = pick([8, 10, 12, 15, 18, 20, 24, 30]), t1 = pick([10, 15, 20, 30, 40, 45]), d1 = (v * t1) / 60
    const D = randInt(3, 40), t2 = (D / v) * 60
    if (!clean(d1) || !isInt(t2) || D === d1 || t2 > 240) return null
    const name = prenom()
    return titled('L’allure régulière', numeric(
      `${name} se déplace ${ctx[0]} à vitesse constante : en ${t1} minutes, ${name} parcourt ${fmt(d1)} km. À cette allure, combien de minutes faut-il pour parcourir ${D} km ?`,
      t2, { explanation: `En ${t1} min : ${fmt(d1)} km, donc en 60 min : ${fmt(d1)} × 60 ÷ ${t1} = ${v} km (vitesse ${v} km/h). Pour ${D} km : ${dur(D, v)}.` }))
  }),
  () => retry(() => {
    const obj = pick(['Un sweat', 'Une paire de baskets', 'Un sac à dos', 'Un casque audio', 'Une veste']), P = randInt(4, 30) * 5
    const r = pick([10, 15, 20, 25, 30, 40, 50]), c = pick([5, 10, 15]), after = P * (1 - r / 100), fin = after - c
    if (!clean(after) || fin <= 0) return null
    const v = randInt(0, 1)
    if (v === 0) {
      return titled('Les soldes', numeric(
        `${obj} coûte ${P} €. Pendant les soldes, son prix baisse de ${r} %. ${prenom()} utilise en plus un bon d'achat de ${c} €. Combien paie-t-on finalement (en €) ?`,
        fin, { explanation: `Remise : ${P} × ${r} ÷ 100 = ${fmt((P * r) / 100)} €, prix soldé : ${P} − ${fmt((P * r) / 100)} = ${fmt(after)} €. Avec le bon : ${fmt(after)} − ${c} = ${fmt(fin)} €.` }))
    }
    const pct = ((P - fin) / P) * 100
    if (!clean(pct)) return null
    return titled('Les soldes', numeric(
      `${obj} coûte ${P} €. Pendant les soldes, son prix baisse de ${r} %, puis on utilise un bon d'achat de ${c} €. Au total, quel pourcentage du prix de départ a-t-on économisé ?`,
      pct, { explanation: `Prix soldé : ${P} − ${fmt((P * r) / 100)} = ${fmt(after)} € ; avec le bon : ${fmt(fin)} €. Économie : ${fmt(P - fin)} € sur ${P} €, soit ${fmt(P - fin)} ÷ ${P} × 100 = ${fmt(pct)} %.` }))
  }),
  () => retry(() => {
    const c = pick([5, 5.5, 6, 6.5, 7, 8]), D = pick([150, 250, 300, 400, 450, 500, 600, 800]), p = pick([1.6, 1.7, 1.8, 1.9, 2])
    const L = (c * D) / 100, cost = L * p
    if (!clean(L) || !clean(cost)) return null
    const dest = pick(['à la mer', 'à la montagne', 'chez ses grands-parents', 'au festival'])
    return titled('Le plein pour les vacances', numeric(
      `La voiture de la famille ${deP(prenom())} consomme ${fmt(c)} L d'essence pour 100 km. Pour aller ${dest}, il faut parcourir ${D} km. L'essence coûte ${fmt(p)} € le litre. Combien coûtera l'essence du trajet (en €) ?`,
      cost, { explanation: `Pour ${D} km : ${fmt(c)} × ${fmt(D / 100)} = ${fmt(L)} L. Prix : ${fmt(L)} × ${fmt(p)} = ${fmt(cost)} €.` }))
  }),
]

const prop2: Maker[] = [
  () => retry(() => {
    const ctx = pick([['Une console de jeux', '€'], ['Un vélo électrique', '€'], ['Une trottinette', '€'], ['Un abonnement annuel au club', '€']])
    const P = randInt(4, 30) * 20, a = pick([10, 20, 25, 50]), b = pick([10, 20, 25, 30, 40, 50])
    const up = P * (1 + a / 100), fin = up * (1 - b / 100)
    if (!clean(up) || !clean(fin) || a === b) return null
    return titled('Hausse puis baisse', numeric(
      `${ctx[0]} coûte ${P} ${ctx[1]}. En novembre, son prix augmente de ${a} %. En janvier, le nouveau prix baisse de ${b} %. Quel est le prix en janvier (en €) ?`,
      fin, { explanation: `Hausse : ${P} × ${a} ÷ 100 = ${fmt((P * a) / 100)}, d'où ${fmt(up)} €. Baisse : ${fmt(up)} × ${b} ÷ 100 = ${fmt((up * b) / 100)}, d'où ${fmt(fin)} €. Attention : la baisse se calcule sur le nouveau prix.` }))
  }),
  () => retry(() => {
    const scale = pick([25000, 50000]), l = [randInt(4, 16) / 2, randInt(4, 16) / 2, randInt(4, 16) / 2], v = pick([3, 4, 5, 6])
    const map = sum(l), D = (map * scale) / 100000, t = (D / v) * 60
    if (!isInt(t) || !clean(D)) return null
    const d1 = randInt(10, 40), d2 = -randInt(20, 60), d3 = randInt(30, 80)
    const A: Pt = [0, 0], B = polar(l[0], d1, A), C = polar(l[1], d2, B), T = polar(l[2], d3, C)
    const points = place({ A, B, C, T }, { pos: { A: 'w', T: 'e' } })
    const figure: Figure = { points, segments: loop(['A', 'B', 'C', 'T'], l.map((x) => `${fmt(x)} cm`)).slice(0, 3), caption: `Carte à l’échelle 1/${scale}.` }
    const name = prenom()
    return titled('La carte au trésor', numeric(
      `Sur une carte à l'échelle 1/${scale}, le chemin qui mène du point A au trésor T est formé de trois segments (voir la figure). ${name} marche à ${v} km/h. Combien de minutes faut-il pour aller de A jusqu'au trésor ?`,
      t, { explanation: `Sur la carte : ${l.map(fmt).join(' + ')} = ${fmt(map)} cm. En réalité : ${fmt(map)} × ${scale} = ${fmt(map * scale)} cm = ${fmt(D)} km. Durée : ${dur(D, v)}.` }), figure)
  }),
  () => retry(() => {
    const ctx = pick([
      ['Pour obtenir du vert, on mélange', 'peinture bleue', 'peinture jaune', 'peinture verte'],
      ['Pour la limonade de la fête, on mélange', 'jus de citron', 'eau gazeuse', 'limonade'],
      ['Pour le mortier du rempart, on mélange', 'sable', 'chaux', 'mortier'],
      ['Pour le sirop de la potion, on mélange', 'jus de framboise', 'eau', 'potion'],
    ])
    const p = randInt(1, 5), q = randInt(1, 5), k = randInt(2, 12) / 2, V = (p + q) * k, first = Math.random() < 0.5
    if (p === q || gcd(p, q) !== 1 || !clean(V)) return null
    return titled('Le bon mélange', numeric(
      `${ctx[0]} ${p} volume${p > 1 ? 's' : ''} de ${ctx[1]} pour ${q} volume${q > 1 ? 's' : ''} de ${ctx[2]}. On veut préparer ${fmt(V)} L de ${ctx[3]}. Combien de litres de ${first ? ctx[1] : ctx[2]} faut-il ?`,
      (first ? p : q) * k, { explanation: `Sur ${p + q} volumes de mélange, ${first ? p : q} sont de ${first ? ctx[1] : ctx[2]}. Un volume vaut ${fmt(V)} ÷ ${p + q} = ${fmt(k)} L, donc ${first ? p : q} × ${fmt(k)} = ${fmt((first ? p : q) * k)} L.` }))
  }),
  () => retry(() => {
    const n1 = pick([20, 24, 25, 28, 30]), n2 = pick([20, 24, 25, 28, 30]), r1 = pick([25, 40, 50, 60, 75, 80]), r2 = pick([25, 40, 50, 60, 75, 80])
    const c1 = (n1 * r1) / 100, c2 = (n2 * r2) / 100, tot = ((c1 + c2) / (n1 + n2)) * 100
    if (n1 === n2 || r1 === r2 || !isInt(c1) || !isInt(c2) || !clean(tot) || Math.abs(tot * 10 - Math.round(tot * 10)) > 1e-6) return null
    return titled('Le brevet blanc', numeric(
      `Au brevet blanc, ${r1} % des ${n1} élèves de la 5e A ont eu la moyenne, ainsi que ${r2} % des ${n2} élèves de la 5e B. Quel pourcentage de l'ensemble des élèves des deux classes a eu la moyenne ?`,
      tot, { explanation: `5e A : ${n1} × ${r1} ÷ 100 = ${c1} élèves ; 5e B : ${n2} × ${r2} ÷ 100 = ${c2} élèves. Ensemble : ${c1 + c2} sur ${n1 + n2}, soit ${c1 + c2} ÷ ${n1 + n2} × 100 = ${fmt(tot)} % (ce n'est pas la moyenne des deux pourcentages, car les classes n'ont pas le même effectif).` }))
  }),
  () => retry(() => {
    const ctx = pick([
      ['Un messager porte une lettre au château voisin. Il parcourt', 'à cheval', 'à pied'],
      ['Pendant un triathlon, une athlète parcourt', 'à vélo', 'en courant'],
      ['Un explorateur rejoint son camp : il parcourt', 'en traîneau', 'à ski'],
    ])
    const v1 = pick([12, 15, 18, 20, 24, 30]), v2 = pick([4, 5, 6, 8, 10]), d1 = randInt(4, 30), d2 = randInt(2, 10)
    const t = (d1 / v1 + d2 / v2) * 60
    if (!isInt((d1 / v1) * 60) || !isInt((d2 / v2) * 60)) return null
    return titled('Le trajet en deux étapes', numeric(
      `${ctx[0]} ${d1} km ${ctx[1]} à ${v1} km/h, puis ${d2} km ${ctx[2]} à ${v2} km/h. Combien de minutes dure le trajet complet ?`,
      t, { explanation: `1re étape : ${dur(d1, v1)}. 2e étape : ${dur(d2, v2)}. Total : ${fmt(t)} min.` }))
  }),
]

const prop3: Maker[] = [
  () => retry(() => {
    const [A, B] = deuxPrenoms(), v1 = randInt(10, 25), v2 = randInt(10, 25), D = randInt(10, 80), ask = randInt(0, 1)
    const t = D / (v1 + v2), min = t * 60, dA = v1 * t
    if (!isInt(min) || !clean(dA) || min < 20) return null
    return titled('La rencontre sur la route', numeric(
      `Deux villages sont distants de ${D} km. À midi, ${A} part du premier village à vélo vers le second, à ${v1} km/h ; au même moment, ${B} part du second village vers le premier, à ${v2} km/h. ${ask === 0 ? 'Au bout de combien de minutes se croisent-ils ?' : `À quelle distance du village de départ de ${A} (en km) se croisent-ils ?`}`,
      ask === 0 ? min : dA, { explanation: `Chaque heure, ils se rapprochent de ${v1} + ${v2} = ${v1 + v2} km. Il leur faut ${dur(D, v1 + v2)} pour se rejoindre.${ask === 1 ? ` Pendant ce temps, ${A} parcourt ${v1} × ${fmt(min)} ÷ 60 = ${fmt(dA)} km.` : ''}` }))
  }),
  () => retry(() => {
    const scale = pick([25000, 50000, 100000, 200000, 250000]), l1 = randInt(4, 20) / 2, l2 = randInt(4, 20) / 2, ask = randInt(0, 1)
    const d1 = (l1 * scale) / 100000, d2 = (l2 * scale) / 100000, v = pick([10, 12, 15, 20]), t = (d2 / v) * 60
    if (!clean(d1) || l1 === l2 || (ask === 0 && !isInt(t))) return null
    const tri = triangleFromAngles(randInt(40, 70), randInt(40, 70), 5)
    const points = place({ A: tri.A, B: tri.B, C: tri.C })
    const figure: Figure = { points, segments: [{ a: 'A', b: 'B', label: `${fmt(l1)} cm` }, { a: 'B', b: 'C', label: `${fmt(l2)} cm` }, { a: 'C', b: 'A', dashed: true }], caption: 'Mesures prises sur la carte.' }
    const intro = `Sur une carte, les villages A et B sont à ${fmt(l1)} cm l'un de l'autre ; en réalité, ils sont distants de ${fmt(d1)} km.`
    if (ask === 0) {
      return titled('La carte du cavalier', numeric(
        `${intro} Sur la même carte, B et C sont à ${fmt(l2)} cm. Un cavalier va de B à C à ${v} km/h. Combien de minutes dure son trajet ?`,
        t, { explanation: `${fmt(l1)} cm sur la carte ↔ ${fmt(d1)} km, donc 1 cm ↔ ${fmt(d1 / l1)} km. BC réel : ${fmt(l2)} × ${fmt(d1 / l1)} = ${fmt(d2)} km. Durée : ${dur(d2, v)}.` }), figure)
    }
    return titled('L’échelle de la carte', numeric(
      `${intro} L'échelle de la carte s'écrit 1/n : quelle est la valeur de n ?`,
      scale, { explanation: `${fmt(d1)} km = ${fmt(d1 * 100000)} cm. L'échelle est le rapport ${fmt(l1)} ÷ ${fmt(d1 * 100000)} = 1 ÷ ${scale} : 1 cm sur la carte représente ${scale} cm en réalité, donc n = ${scale}.` }), figure)
  }),
  () => retry(() => {
    const obj = pick(['une veste', 'un jeu de société', 'une raquette', 'un casque de vélo', 'une montre']), O = randInt(3, 30) * 10
    const r = pick([10, 20, 25, 30, 40]), up = Math.random() < 0.35
    const P = up ? O * (1 + r / 100) : O * (1 - r / 100), one = O / 100
    if (!clean(P) || !clean(one)) return null
    return titled('Le prix d’origine', numeric(
      up ? `Après une hausse de ${r} %, ${obj} coûte ${fmt(P)} €. Quel était son prix avant la hausse (en €) ?`
        : `Pendant les soldes, ${prenom()} achète ${obj} à ${fmt(P)} €, après une remise de ${r} %. Quel était le prix avant la remise (en €) ?`,
      O, { explanation: `${up ? `Après une hausse de ${r} %, on paie ${100 + r} %` : `Après une remise de ${r} %, on paie ${100 - r} %`} du prix d'origine. Donc ${up ? 100 + r : 100 - r} % ↔ ${fmt(P)} €, 1 % ↔ ${fmt(P)} ÷ ${up ? 100 + r : 100 - r} = ${fmt(one)} €, et 100 % ↔ ${fmt(O)} €. (Attention : appliquer ${up ? `une baisse` : `une hausse`} de ${r} % au nouveau prix ne redonne pas le prix d'origine.)` }))
  }),
  () => retry(() => {
    const s = pick([1, 2, 3, 4, 5, 6, 8, 10]), g = pick([20, 25]), [days, when] = pick([[7, 'une semaine'], [30, '30 jours'], [365, 'une année de 365 jours']] as const)
    const perDay = 86400 / s, mL = perDay / g, L = (mL * days) / 1000
    if (!isInt(perDay) || !clean(mL) || !clean(L)) return null
    return titled('Le robinet qui fuit', numeric(
      `Un robinet mal fermé laisse tomber une goutte ${s === 1 ? 'chaque seconde' : `toutes les ${s} secondes`}. Il faut ${g} gouttes pour faire 1 mL. Combien de litres d'eau sont perdus en ${when} ?`,
      L, { explanation: `Une journée dure 24 × 3 600 = 86 400 s, soit ${perDay} gouttes, donc ${perDay} ÷ ${g} = ${fmt(mL)} mL par jour. En ${days} jours : ${fmt(mL)} × ${days} = ${fmt(mL * days)} mL = ${fmt(L)} L.` }))
  }),
  () => retry(() => {
    const ctx = pick([
      ['On mélange', 'kg de sirop contenant', '% de sucre', 'le pourcentage de sucre', 'kg de sucre'],
      ['Le forgeron fond ensemble', 'kg de bronze contenant', '% de cuivre', 'le pourcentage de cuivre', 'kg de cuivre'],
      ['On verse dans un même bidon', 'L de boisson contenant', '% de jus de fruit', 'le pourcentage de jus de fruit', 'L de jus'],
    ])
    const V1 = randInt(1, 8), V2 = randInt(1, 8), p1 = pick([10, 20, 25, 30, 40, 50, 60, 80, 90]), p2 = pick([10, 20, 25, 30, 40, 50, 60, 80, 90])
    const m1 = (V1 * p1) / 100, m2 = (V2 * p2) / 100, tot = ((m1 + m2) / (V1 + V2)) * 100
    if (p1 === p2 || V1 === V2 || !clean(m1) || !clean(m2) || Math.abs(tot * 10 - Math.round(tot * 10)) > 1e-6) return null
    return titled('Le mélange', numeric(
      `${ctx[0]} ${V1} ${ctx[1]} ${p1} ${ctx[2]} et ${V2} ${ctx[1]} ${p2} ${ctx[2]}. Quel est ${ctx[3]} du mélange ?`,
      tot, { explanation: `Premier : ${V1} × ${p1} ÷ 100 = ${fmt(m1)} ${ctx[4]}. Second : ${V2} × ${p2} ÷ 100 = ${fmt(m2)} ${ctx[4]}. Mélange : ${fmt(m1 + m2)} sur ${V1 + V2}, soit ${fmt(m1 + m2)} ÷ ${V1 + V2} × 100 = ${fmt(tot)} %.` }))
  }),
]

// ═══════════════════════════════════════════════════════════════════════
// 5e-geo — Angles, triangles, parallélogrammes, symétrie centrale
// ═══════════════════════════════════════════════════════════════════════
const CORNERS = ['ne', 'nw', 'se', 'sw'] as const
type Corner = (typeof CORNERS)[number]
/** Dans parallelsFigure, les coins ne et sw mesurent l'inclinaison de la sécante ; nw et se son supplément. */
const tiltType = (c: Corner) => c === 'ne' || c === 'sw'
const OPP: Record<Corner, Corner> = { ne: 'sw', sw: 'ne', nw: 'se', se: 'nw' }
const deg = (n: number) => `${fmt(n)}°`

const geo1: Maker[] = [
  () => retry(() => {
    const a = randInt(35, 145)
    if (Math.abs(a - 90) < 12) return null
    const kAt = pick(['I', 'J'] as const), kC = pick(CORNERS), oAt = kAt === 'I' ? 'J' : 'I'
    const oC = pick(CORNERS.filter((c) => c !== kC))
    const t = tiltType(kC) ? a : 180 - a
    const ans = tiltType(oC) ? t : 180 - t
    const opp = oC === OPP[kC]
    const ctx = pick([
      'Deux rails (d) et (d′) sont parallèles ; une route droite les coupe',
      'Les deux berges (d) et (d′) d’un canal sont parallèles ; un pont droit les traverse',
      'Deux lignes (d) et (d′) d’un terrain de sport sont parallèles ; une ligne oblique les coupe',
      'Deux murailles rectilignes (d) et (d′) sont parallèles ; un chemin droit les traverse',
    ])
    return titled('La voie ferrée', numeric(
      `${ctx} en I et en J (voir la figure). L'angle marqué en ${kAt} mesure ${a}°. Combien mesure l'angle marqué en rouge en ${oAt} ?`,
      ans, { explanation: `Comme (d) // (d′), l'angle placé en ${oAt} « au même endroit » que l'angle de ${a}° (angles correspondants) mesure aussi ${a}°. L'angle rouge lui est ${opp ? `opposé par le sommet : il mesure ${a}°` : `adjacent et supplémentaire : il mesure 180 − ${a} = ${180 - a}°`}.` }),
      parallelsFigure({ tilt: t, known: { at: kAt, corner: kC, label: deg(a) }, asked: { at: oAt, corner: oC, label: '?' } }))
  }),
  () => {
    const a = 2 * randInt(15, 65), base = (180 - a) / 2, ext = 180 - base, rev = Math.random() < 0.4
    const points = place({ B: [0, 0], C: [2, 0], A: [1, Math.tan(rad(base))], D: [3.1, 0] }, { pos: { A: 'n', B: 'sw', C: 's', D: 's' } })
    const figure: Figure = {
      points,
      segments: [{ a: 'A', b: 'B', mark: 'tick' }, { a: 'A', b: 'C', mark: 'tick' }, { a: 'B', b: 'C' }, { a: 'C', b: 'D' }],
      angles: [
        { vertex: 'A', a: 'B', b: 'C', label: rev ? '?' : deg(a), color: rev ? RED : undefined },
        { vertex: 'C', a: 'A', b: 'D', label: rev ? deg(ext) : '?', color: rev ? undefined : RED },
      ],
    }
    return titled('La charpente du toit', numeric(
      rev ? `La charpente d'un toit forme un triangle ABC isocèle en A. La poutre [BC] est prolongée au-delà de C jusqu'au point D, et l'angle ACD mesure ${ext}°. Combien mesure l'angle au sommet BAC ?`
        : `La charpente d'un toit forme un triangle ABC isocèle en A, dont l'angle au sommet BAC mesure ${a}°. La poutre [BC] est prolongée au-delà de C jusqu'au point D. Combien mesure l'angle ACD ?`,
      rev ? a : ext, { explanation: rev
        ? `Les angles ACB et ACD sont supplémentaires : ACB = 180 − ${ext} = ${base}°. Le triangle est isocèle en A, donc ABC = ACB = ${base}°. Enfin BAC = 180 − 2 × ${base} = ${a}°.`
        : `Le triangle est isocèle en A : ABC = ACB = (180 − ${a}) ÷ 2 = ${base}°. Les angles ACB et ACD sont supplémentaires : ACD = 180 − ${base} = ${ext}°.` }), figure)
  },
  () => retry(() => {
    const a = randInt(55, 125), b = randInt(20, 70), x = 180 - a - b
    if (x < 20) return null
    const AD = (5 * Math.sin(rad(b))) / Math.sin(rad(a + b))
    if (AD < 2.2 || AD > 6) return null
    const A: Pt = [0, 0], B: Pt = [5, 0], D = polar(AD, a), C: Pt = [B[0] + D[0], B[1] + D[1]]
    const figure: Figure = {
      points: place({ A, B, C, D }, { pos: { A: 'sw', B: 'se', C: 'ne', D: 'nw' } }),
      segments: [{ a: 'A', b: 'B', mark: 'arrow' }, { a: 'D', b: 'C', mark: 'arrow' }, { a: 'A', b: 'D', mark: 'arrow2' }, { a: 'B', b: 'C', mark: 'arrow2' }, { a: 'B', b: 'D' }],
      angles: [{ vertex: 'A', a: 'B', b: 'D', label: deg(a) }, { vertex: 'B', a: 'A', b: 'D', label: deg(b), radius: 24 }, { vertex: 'B', a: 'D', b: 'C', label: '?', color: RED, radius: 18 }],
    }
    return titled('Le parallélogramme et sa diagonale', numeric(
      `ABCD est un parallélogramme et on trace sa diagonale [BD]. L'angle DAB mesure ${a}° et l'angle ABD mesure ${b}°. Combien mesure l'angle DBC ?`,
      x, { explanation: `Dans le triangle ABD : ADB = 180 − ${a} − ${b} = ${x}°. Les droites (AD) et (BC) sont parallèles (côtés opposés du parallélogramme) et coupées par (BD) : les angles ADB et DBC sont alternes-internes, donc égaux. DBC = ${x}°.` }), figure)
  }),
  () => retry(() => {
    const a = randInt(35, 85), b = randInt(35, 85), c = 180 - a - b, v = randInt(0, 1)
    if (c < 30 || a === b) return null
    const t = triangleFromAngles(a, b, 4)
    const O: Pt = [4.6, t.C[1] * 0.5]
    const im = (p: Pt): Pt => [2 * O[0] - p[0], 2 * O[1] - p[1]]
    const points = place({ A: t.A, B: t.B, C: t.C, O, 'A′': im(t.A), 'B′': im(t.B), 'C′': im(t.C) })
    const angles: FigAngle[] = v === 0
      ? [{ vertex: 'A', a: 'B', b: 'C', label: deg(a) }, { vertex: 'B′', a: 'A′', b: 'C′', label: deg(b) }, { vertex: 'C′', a: 'A′', b: 'B′', label: '?', color: RED }]
      : [{ vertex: 'A′', a: 'B′', b: 'C′', label: deg(a) }, { vertex: 'B', a: 'A', b: 'C', label: deg(b) }, { vertex: 'C', a: 'A', b: 'B', label: '?', color: RED }]
    const figure: Figure = { points, segments: [...loop(['A', 'B', 'C']), ...loop(['A′', 'B′', 'C′']), { a: 'B', b: 'B′', dashed: true }], angles }
    return titled('Le reflet du blason', numeric(
      v === 0
        ? `Le triangle A′B′C′ est le symétrique du triangle ABC par rapport au point O. On sait que l'angle BAC mesure ${a}° et que l'angle A′B′C′ mesure ${b}°. Combien mesure l'angle A′C′B′ ?`
        : `Le triangle A′B′C′ est le symétrique du triangle ABC par rapport au point O. On sait que l'angle B′A′C′ mesure ${a}° et que l'angle ABC mesure ${b}°. Combien mesure l'angle ACB ?`,
      c, { explanation: v === 0
        ? `La symétrie centrale conserve les angles : B′A′C′ = BAC = ${a}°. Dans le triangle A′B′C′ : A′C′B′ = 180 − ${a} − ${b} = ${c}°.`
        : `La symétrie centrale conserve les angles : BAC = B′A′C′ = ${a}°. Dans le triangle ABC : ACB = 180 − ${a} − ${b} = ${c}°.` }), figure)
  }),
  () => retry(() => {
    const al = randInt(30, 80), be = randInt(30, 80), ga = 180 - al - be
    if (ga < 30 || al === be || be === ga || al === ga) return null
    const rot = randInt(-15, 15), N = ['A', 'B', 'C', 'D', 'E', 'F']
    const dirs = [0, al, al + be, 180, 180 + al, 180 + al + be].map((d) => d + rot)
    const raw: Record<string, Pt> = { O: [0, 0] }
    N.forEach((nm, i) => { raw[nm] = polar(3, dirs[i]) })
    const vals = [al, be, ga, al, be, ga]
    const sect = (i: number) => `${N[i % 6]}O${N[(i + 1) % 6]}`
    const pat = pick([[0, 2, 4], [1, 3, 5]]), q = pick(pat), [g1, g2] = pat.filter((p) => p !== q)
    const consec = (s: number[]) => {
      const set = new Set(s.map((x) => x % 6))
      return [0, 1, 2, 3, 4, 5].some((st) => [st, st + 1, st + 2].every((x) => set.has(x % 6)))
    }
    const via: [number, number] | null = consec([q, g1, g2 + 3]) ? [g1, g2] : consec([q, g2, g1 + 3]) ? [g2, g1] : null
    if (!via) return null
    const angles: FigAngle[] = [
      { vertex: 'O', a: N[g1], b: N[(g1 + 1) % 6], label: deg(vals[g1]), radius: 26 },
      { vertex: 'O', a: N[g2], b: N[(g2 + 1) % 6], label: deg(vals[g2]), radius: 26 },
      { vertex: 'O', a: N[q], b: N[(q + 1) % 6], label: '?', color: RED, radius: 26 },
    ]
    const free = [0, 1, 2, 3, 4, 5].filter((i) => i !== g1 && i !== g2 && i !== q).sort((i, j) => vals[j] - vals[i])[0]
    const bis = (((dirs[free] + vals[free] / 2) % 360) + 360) % 360
    const oPos = (['e', 'ne', 'n', 'nw', 'w', 'sw', 's', 'se'] as const)[Math.round(bis / 45) % 8]
    const figure: Figure = { points: place(raw, { pos: { O: oPos } }), segments: [{ a: 'A', b: 'D' }, { a: 'B', b: 'E' }, { a: 'C', b: 'F' }], angles }
    const opp = (via[1] + 3) % 6
    return titled('Le carrefour en étoile', numeric(
      `Trois routes droites (AD), (BE) et (CF) se croisent au carrefour O. L'angle ${sect(g1)} mesure ${vals[g1]}° et l'angle ${sect(g2)} mesure ${vals[g2]}°. Combien mesure l'angle ${sect(q)} ?`,
      vals[q], { explanation: `Les angles ${sect(via[1])} et ${sect(opp)} sont opposés par le sommet : ${sect(opp)} = ${vals[via[1]]}°. Les angles ${sect(via[0])}, ${sect(opp)} et ${sect(q)} se suivent et forment un angle plat : ${sect(q)} = 180 − ${vals[via[0]]} − ${vals[via[1]]} = ${vals[q]}°.` }), figure)
  }),
]

const geo2: Maker[] = [
  () => retry(() => {
    const u = randInt(30, 80), w = randInt(30, 100), v = 180 - u - w
    if (v < 30 || v > 80 || u === v) return null
    const h = 3, A: Pt = [0, h], B: Pt = [-h / Math.tan(rad(u)), 0], C: Pt = [h / Math.tan(rad(v)), 0]
    const xl = Math.min(B[0], 0) - 1.6, xr = Math.max(C[0], 0) + 1.6
    const points = place({ A, B, C, U1: [xl, h], U2: [xr, h], D1: [xl, 0], D2: [xr, 0] }, { hidden: ['U1', 'U2', 'D1', 'D2'], pos: { A: 'n', B: 's', C: 's' } })
    const figure: Figure = {
      points,
      segments: [{ a: 'U1', b: 'U2', mark: 'arrow' }, { a: 'D1', b: 'D2', mark: 'arrow' }, ...loop(['A', 'B', 'C'])],
      angles: [{ vertex: 'A', a: 'U1', b: 'B', label: deg(u) }, { vertex: 'A', a: 'B', b: 'C', label: deg(w), radius: 26 }, { vertex: 'C', a: 'A', b: 'B', label: '?', color: RED }],
      notes: [{ x: points.U2.x - 12, y: points.U2.y - 8, text: '(d)' }, { x: points.D2.x - 12, y: points.D2.y - 8, text: '(d′)' }],
    }
    return titled('Le triangle entre deux rives', numeric(
      `Les droites (d) et (d′) sont parallèles. Le point A est sur (d), les points B et C sont sur (d′). L'angle entre la droite (d) et le segment [AB] marqué sur la figure mesure ${u}°, et l'angle BAC mesure ${w}°. Combien mesure l'angle ACB ?`,
      v, { explanation: `L'angle de ${u}° et l'angle ABC sont alternes-internes (les droites (d) et (d′) sont parallèles, coupées par (AB)) : ABC = ${u}°. Dans le triangle ABC : ACB = 180 − ${u} − ${w} = ${v}°.` }), figure)
  }),
  () => {
    const a = 2 * randInt(10, 22), c = (180 - a) / 2, q = randInt(0, 1)
    const B: Pt = [-1, 0], C: Pt = [1, 0], A: Pt = [0, Math.tan(rad(c))]
    const D = inter(B, polar(1, a, B), A, C)
    const ans = q === 0 ? c - a : 180 - c
    const figure: Figure = {
      points: place({ A, B, C, D }, { pos: { A: 'n', B: 'sw', C: 'se', D: 'e' } }),
      segments: [{ a: 'A', b: 'B', mark: 'tick' }, { a: 'A', b: 'C', mark: 'tick' }, { a: 'B', b: 'C', mark: 'tick2' }, { a: 'B', b: 'D', mark: 'tick2' }],
      angles: [{ vertex: 'A', a: 'B', b: 'C', label: deg(a) }, q === 0 ? { vertex: 'B', a: 'A', b: 'D', label: '?', color: RED, radius: 30 } : { vertex: 'D', a: 'A', b: 'B', label: '?', color: RED }],
    }
    return titled('Les deux triangles isocèles', numeric(
      `Le triangle ABC est isocèle en A et l'angle BAC mesure ${a}°. Le point D est sur le côté [AC] et vérifie BD = BC. Combien mesure l'angle ${q === 0 ? 'ABD' : 'ADB'} ?`,
      ans, { explanation: `ABC est isocèle en A : ABC = ACB = (180 − ${a}) ÷ 2 = ${c}°. BDC est isocèle en B (BD = BC) : BDC = BCD = ${c}°${q === 0 ? `, donc CBD = 180 − 2 × ${c} = ${180 - 2 * c}°. Enfin ABD = ABC − CBD = ${c} − ${180 - 2 * c} = ${ans}°.` : `. Les angles ADB et BDC sont supplémentaires (A, D, C alignés) : ADB = 180 − ${c} = ${ans}°.`}` }), figure)
  },
  () => retry(() => {
    const a = randInt(100, 140), q = randInt(0, 1), m = 3, L = randInt(55, 75) / 10
    const A: Pt = [0, 0], B: Pt = [L, 0], D = polar(m, a), C: Pt = [L + D[0], D[1]]
    const DE = 2 * m * Math.cos(rad(180 - a)), E: Pt = [D[0] + DE, D[1]]
    if (DE > L - 0.8) return null
    const dae = 2 * a - 180, eab = 180 - a
    const figure: Figure = {
      points: place({ A, B, C, D, E }, { pos: { A: 'sw', B: 'se', C: 'ne', D: 'nw', E: 'n' } }),
      segments: [{ a: 'A', b: 'B' }, { a: 'B', b: 'C' }, { a: 'C', b: 'D' }, { a: 'D', b: 'A', mark: 'tick' }, { a: 'A', b: 'E', mark: 'tick' }],
      angles: [{ vertex: 'B', a: 'C', b: 'A', label: deg(eab) }, q === 0 ? { vertex: 'A', a: 'D', b: 'E', label: '?', color: RED, radius: 26 } : { vertex: 'A', a: 'E', b: 'B', label: '?', color: RED, radius: 26 }],
    }
    return titled('Le parallélogramme et l’isocèle', numeric(
      `ABCD est un parallélogramme dont l'angle ABC mesure ${eab}°. Le point E est sur le côté [DC] et vérifie AE = AD. Combien mesure l'angle ${q === 0 ? 'DAE' : 'EAB'} ?`,
      q === 0 ? dae : eab, { explanation: `Les angles opposés d'un parallélogramme sont égaux : ADC = ABC = ${eab}°. ADE est isocèle en A, donc AED = ADE = ${eab}°${q === 0 ? ` et DAE = 180 − 2 × ${eab} = ${dae}°.` : `. Comme (AB) // (DC), les angles EAB et AED sont alternes-internes, donc égaux : EAB = ${eab}°.`}` }), figure)
  }),
  () => retry(() => {
    const n = pick([5, 6]), S = (n - 2) * 180, base = randInt(0, 359)
    const names = 'ABCDEF'.slice(0, n).split('')
    const raw: Record<string, Pt> = {}
    names.forEach((nm, i) => {
      const th = base + (360 / n) * i + randInt(-12, 12), r = randInt(85, 110) / 100
      raw[nm] = [3.2 * r * Math.cos(rad(th)), 2.3 * r * Math.sin(rad(th))]
    })
    const ang = names.map((_, i) => {
      const P = raw[names[i]], Pp = raw[names[(i + n - 1) % n]], Pn = raw[names[(i + 1) % n]]
      const u = [Pp[0] - P[0], Pp[1] - P[1]], v = [Pn[0] - P[0], Pn[1] - P[1]]
      return (Math.acos((u[0] * v[0] + u[1] * v[1]) / (Math.hypot(u[0], u[1]) * Math.hypot(v[0], v[1]))) * 180) / Math.PI
    })
    if (Math.abs(sum(ang) - S) > 0.5 || ang.some((x) => x < 70 || x > 165)) return null
    const q = randInt(0, n - 1), given = ang.map(Math.round), others = given.filter((_, i) => i !== q), ans = S - sum(others)
    if (Math.abs(ans - ang[q]) > 3) return null
    const figure: Figure = {
      points: place(raw), segments: loop(names),
      angles: names.map((nm, i) => ({ vertex: nm, a: names[(i + n - 1) % n], b: names[(i + 1) % n], label: i === q ? '?' : deg(given[i]), color: i === q ? RED : undefined })),
    }
    const ctx = pick(['Le champ du fermier', 'La cour du château', 'Le jardin des plantes', 'Le terrain de jeu', 'La place du marché'])
    return titled('Le champ à plusieurs côtés', numeric(
      `${ctx} a la forme d'un ${n === 5 ? 'pentagone' : 'hexagone'} ${names.join('')}. On a mesuré ${n - 1} de ses angles (voir la figure). Combien mesure l'angle en ${names[q]} ?`,
      ans, { explanation: `Les diagonales issues d'un même sommet découpent le polygone en ${n - 2} triangles : la somme de ses angles vaut ${n - 2} × 180 = ${S}°. Angle en ${names[q]} : ${S} − (${others.join(' + ')}) = ${S} − ${sum(others)} = ${ans}°.` }), figure)
  }),
  () => retry(() => {
    const a = randInt(3, 15), b = randInt(3, 15), extra = randInt(0, 2)
    let lo = Math.abs(a - b), hi = a + b, cond = '', note = ''
    if (extra === 1) { lo = Math.max(lo, a, b); cond = ', et que AC est la plus longue des trois distances'; note = ` et AC > ${Math.max(a, b)} (la plus longue)` }
    if (extra === 2) { hi = Math.min(hi, a, b); cond = ', et que AC est la plus courte des trois distances'; note = ` et AC < ${Math.min(a, b)} (la plus courte)` }
    const count = hi - lo - 1
    if (count < 2 || a === b || Math.max(a, b) > 2 * Math.min(a, b)) return null
    return titled('Les trois villages', numeric(
      `Trois villages A, B et C ne sont pas alignés. On sait que AB = ${a} km et BC = ${b} km${cond}. La distance AC est un nombre entier de kilomètres. Combien de valeurs sont possibles pour AC ?`,
      count, { explanation: `Inégalité triangulaire (villages non alignés, donc inégalités strictes) : AC < ${a} + ${b} = ${a + b} et AC > ${Math.max(a, b)} − ${Math.min(a, b)} = ${Math.abs(a - b)}${note}. AC peut valoir ${lo + 1}, …, ${hi - 1} : ${count} valeurs.` }),
      (() => {
        const c = (lo + hi) / 2
        const A = (Math.acos((a * a + c * c - b * b) / (2 * a * c)) * 180) / Math.PI, B = (Math.acos((a * a + b * b - c * c) / (2 * a * b)) * 180) / Math.PI
        return triangleFigure({ shape: [A, B], sides: { AB: `${a} km`, BC: `${b} km`, CA: '?' } })
      })())
  }),
  () => retry(() => {
    const x = randInt(30, 70), y = randInt(30, 70), q = randInt(0, 1)
    if (x === y || x + y > 130) return null
    const t = triangleFromAngles(x, y, 6)
    const A = t.A, C = t.B, B = t.C, D: Pt = [A[0] + C[0] - B[0], A[1] + C[1] - B[1]], O: Pt = [3, 0]
    const figure: Figure = {
      points: place({ A, B, C, D, O }, { pos: { A: 'w', C: 'e', O: 'se' } }),
      segments: [...loop(['A', 'B', 'C', 'D']), { a: 'A', b: 'O', mark: 'tick2' }, { a: 'O', b: 'C', mark: 'tick2' }, { a: 'B', b: 'O', dashed: true, mark: 'tick' }, { a: 'O', b: 'D', dashed: true, mark: 'tick' }],
      angles: [
        { vertex: 'A', a: 'B', b: 'C', label: deg(x), radius: q === 1 ? 34 : 20 }, { vertex: 'C', a: 'B', b: 'A', label: deg(y) },
        q === 0 ? { vertex: 'D', a: 'A', b: 'C', label: '?', color: RED } : { vertex: 'A', a: 'B', b: 'D', label: '?', color: RED, radius: 20 },
      ],
    }
    const ans = q === 0 ? 180 - x - y : x + y
    return titled('Le quatrième sommet', numeric(
      `Dans le triangle ABC, l'angle BAC mesure ${x}° et l'angle BCA mesure ${y}°. Le point O est le milieu de [AC] et D est le symétrique de B par rapport à O. Combien mesure l'angle ${q === 0 ? 'ADC' : 'BAD'} ?`,
      ans, { explanation: `Les diagonales [AC] et [BD] ont le même milieu O : ABCD est un parallélogramme. Dans ABC : ABC = 180 − ${x} − ${y} = ${180 - x - y}°. ${q === 0 ? `Les angles opposés d'un parallélogramme sont égaux : ADC = ABC = ${ans}°.` : `Deux angles consécutifs d'un parallélogramme sont supplémentaires : BAD = 180 − ${180 - x - y} = ${ans}°.`}` }), figure)
  }),
]

const geo3: Maker[] = [
  () => {
    const out = Math.random() < 0.5, a = 2 * randInt(10, out ? 30 : 35), q = randInt(0, 1)
    const ade = out ? (90 - a) / 2 : (90 + a) / 2, ans = q === 0 ? ade : 90 - ade
    const A: Pt = [0, 0], B: Pt = [4, 0], C: Pt = [4, 4], D: Pt = [0, 4], E = polar(4, out ? -a : a)
    const figure: Figure = {
      points: place({ A, B, C, D, E }, { pos: { A: out ? 'w' : 'sw', B: out ? 'e' : 'se', C: 'ne', D: 'nw', E: out ? 's' : 'e' } }),
      segments: [{ a: 'A', b: 'B', mark: 'tick' }, { a: 'B', b: 'C' }, { a: 'C', b: 'D' }, { a: 'D', b: 'A', mark: 'tick' }, { a: 'A', b: 'E', mark: 'tick' }, { a: 'B', b: 'E' }, { a: 'D', b: 'E' }],
      angles: [
        { vertex: 'A', a: 'B', b: 'E', label: deg(a), radius: 22 }, { vertex: 'C', a: 'D', b: 'B', right: true },
        q === 0 ? { vertex: 'E', a: 'A', b: 'D', label: '?', color: RED } : { vertex: 'D', a: 'C', b: 'E', label: '?', color: RED },
      ],
    }
    return titled('Le carré et le triangle', numeric(
      `ABCD est un carré. Le triangle ABE est isocèle en A, avec l'angle BAE = ${a}°, et le point E est ${out ? 'à l’extérieur' : 'à l’intérieur'} du carré. Combien mesure l'angle ${q === 0 ? 'AED' : 'CDE'} ?`,
      ans, { explanation: `AE = AB = AD, donc le triangle ADE est isocèle en A. Son angle en A : DAE = ${out ? `90 + ${a} = ${90 + a}` : `90 − ${a} = ${90 - a}`}°. Donc ADE = AED = (180 − ${out ? 90 + a : 90 - a}) ÷ 2 = ${ade}°.${q === 1 ? ` Enfin CDE = ADC − ADE = 90 − ${ade} = ${ans}°.` : ''}` }), figure)
  },
  () => {
    const a = randInt(15, 40), q = randInt(0, 1), cs = Math.cos(rad(a))
    const O: Pt = [0, 0], A: Pt = [1, 0], B = polar(2 * cs, a), C: Pt = [4 * cs * cs - 1, 0], X: Pt = [C[0] + 0.8, 0], Y = polar(2 * cs + 0.8, a)
    const points = place({ O, A, B, C, X, Y }, { hidden: ['X', 'Y'], pos: { O: 'sw', A: 's', C: 's', B: 'n' } })
    const ans = q === 0 ? 180 - 4 * a : 180 - 3 * a
    const figure: Figure = {
      points,
      segments: [{ a: 'O', b: 'X' }, { a: 'O', b: 'Y' }, { a: 'O', b: 'A', mark: 'tick' }, { a: 'A', b: 'B', mark: 'tick' }, { a: 'B', b: 'C', mark: 'tick' }],
      angles: [{ vertex: 'O', a: 'X', b: 'Y', label: deg(a), radius: 26 }, q === 0 ? { vertex: 'B', a: 'A', b: 'C', label: '?', color: RED } : { vertex: 'B', a: 'O', b: 'C', label: '?', color: RED }],
      notes: [{ x: points.X.x + 2, y: points.X.y + 16, text: 'x' }, { x: points.Y.x + 6, y: points.Y.y - 6, text: 'y' }],
    }
    return titled('L’échelle de triangles', numeric(
      `L'angle xOy mesure ${a}°. On place A sur [Ox), B sur [Oy), puis C sur [Ox) au-delà de A, de sorte que OA = AB = BC. Combien mesure l'angle ${q === 0 ? 'ABC' : 'OBC'} ?`,
      ans, { explanation: `OAB est isocèle en A : ABO = AOB = ${a}°, donc OAB = 180 − 2 × ${a} = ${180 - 2 * a}° et BAC = 180 − ${180 - 2 * a} = ${2 * a}° (angles supplémentaires). ABC est isocèle en B : BCA = BAC = ${2 * a}°, donc ABC = 180 − 2 × ${2 * a} = ${180 - 4 * a}°.${q === 1 ? ` Enfin OBC = OBA + ABC = ${a} + ${180 - 4 * a} = ${ans}°.` : ''}` }), figure)
  },
  () => retry(() => {
    const a = randInt(25, 75), b = randInt(25, 75), alt = Math.random() < 0.5
    if (a + b > 150 || a === b) return null
    const h = 3, my = randInt(10, 20) / 10
    const A: Pt = [0, h], mx = (h - my) / Math.tan(rad(a)), M: Pt = [mx, my], B: Pt = [mx - my / Math.tan(rad(b)), 0]
    const xl = Math.min(0, B[0]) - 1.5, xr = mx + 1.5
    const points = place({ A, B, M, U1: [xl, h], U2: [xr, h], D1: [xl, 0], D2: [xr, 0] }, { hidden: ['U1', 'U2', 'D1', 'D2'], pos: { A: 'n', B: 's', M: 'e' } })
    const bl = alt ? 180 - b : b
    const figure: Figure = {
      points,
      segments: [{ a: 'U1', b: 'U2', mark: 'arrow' }, { a: 'D1', b: 'D2', mark: 'arrow' }, { a: 'A', b: 'M' }, { a: 'M', b: 'B' }],
      angles: [{ vertex: 'A', a: 'U2', b: 'M', label: deg(a) }, alt ? { vertex: 'B', a: 'D1', b: 'M', label: deg(bl) } : { vertex: 'B', a: 'D2', b: 'M', label: deg(bl) }, { vertex: 'M', a: 'A', b: 'B', label: '?', color: RED }],
      notes: [{ x: points.U1.x + 14, y: points.U1.y - 8, text: '(d)' }, { x: points.D1.x + 14, y: points.D1.y - 8, text: '(d′)' }],
    }
    return titled('La pointe de flèche', numeric(
      `Les droites (d) et (d′) sont parallèles. Le point A est sur (d), le point B est sur (d′), et le point M est situé entre les deux droites. Les angles marqués en A et en B mesurent ${a}° et ${bl}°. Combien mesure l'angle AMB ?`,
      a + b, { explanation: `On trace par M la parallèle à (d) et (d′). Elle partage l'angle AMB en deux angles. Le premier est alterne-interne avec l'angle de ${a}° en A : il mesure ${a}°. ${alt ? `En B, l'angle entre (d′) et [BM] situé du côté de M mesure 180 − ${bl} = ${b}° ; le second angle est alterne-interne avec lui` : `Le second est alterne-interne avec l'angle de ${b}° en B`} : il mesure ${b}°. Donc AMB = ${a} + ${b} = ${a + b}°.` }), figure)
  }),
  () => retry(() => {
    const v = randInt(0, 2), m = randInt(3, 9), L = m + randInt(2, 8), al = randInt(55, 80)
    const e = L - m, P = 2 * (L + m)
    const A: Pt = [0, 0], B: Pt = [L, 0], D = polar(m, al), C: Pt = [L + D[0], D[1]], E: Pt = [D[0] + m, D[1]]
    const figure: Figure = {
      points: place({ A, B, C, D, E }, { pos: { A: 'sw', B: 'se', C: 'ne', D: 'nw', E: 'n' } }),
      segments: [
        { a: 'A', b: 'B', label: v === 1 ? undefined : `${L} cm` }, { a: 'B', b: 'C' }, { a: 'C', b: 'E', label: v === 2 ? `${e} cm` : '?' },
        { a: 'E', b: 'D' }, { a: 'D', b: 'A', label: v === 2 ? undefined : `${m} cm` }, { a: 'A', b: 'E' },
      ],
      angles: [{ vertex: 'A', a: 'D', b: 'E', color: BLUE, radius: 26, label: 'α' }, { vertex: 'A', a: 'E', b: 'B', color: BLUE, radius: 26, label: 'α' }],
    }
    const info = v === 0 ? `avec AB = ${L} cm et AD = ${m} cm` : v === 1 ? `de périmètre ${P} cm, avec AD = ${m} cm` : `avec AB = ${L} cm`
    const ask = v === 2 ? `On mesure EC = ${e} cm. Quel est le périmètre du parallélogramme (en cm) ?` : 'Combien mesure EC (en cm) ?'
    const key = `Les angles DAE et EAB sont égaux (bissectrice). Comme (AB) // (DC), les angles EAB et AED sont alternes-internes, donc égaux. Ainsi DAE = AED : le triangle ADE est isocèle en D, et DE = AD.`
    const end = v === 0 ? ` EC = DC − DE = AB − AD = ${L} − ${m} = ${e} cm.`
      : v === 1 ? ` AB = ${P} ÷ 2 − ${m} = ${L} cm, donc EC = AB − AD = ${L} − ${m} = ${e} cm.`
        : ` DE = DC − EC = ${L} − ${e} = ${m} cm, donc AD = ${m} cm et le périmètre vaut 2 × (${L} + ${m}) = ${P} cm.`
    return titled('La bissectrice du parallélogramme', numeric(
      `ABCD est un parallélogramme ${info}. La bissectrice de l'angle DAB coupe le côté [DC] en E. ${ask}`,
      v === 2 ? P : e, { explanation: key + end }), figure)
  }),
  () => {
    const n = pick([5, 6, 8]), q = randInt(0, 2)
    const nom = n === 5 ? 'pentagone' : n === 6 ? 'hexagone' : 'octogone'
    const I = ((n - 2) * 180) / n, bac = (180 - I) / 2, acd = I - bac, adc = 180 - I
    const L = 'ABCDEFGH'.slice(0, n).split(''), start = -90 - 180 / n
    const raw: Record<string, Pt> = {}
    L.forEach((nm, i) => { raw[nm] = polar(3, start + (360 * i) / n) })
    const asked = ['BAC', 'ACD', 'ADC'][q]
    const hl: FigAngle = q === 0 ? { vertex: 'A', a: 'B', b: 'C', label: '?', color: RED, radius: 26 } : q === 1 ? { vertex: 'C', a: 'A', b: 'D', label: '?', color: RED, radius: 24 } : { vertex: 'D', a: 'A', b: 'C', label: '?', color: RED, radius: 26 }
    const figure: Figure = {
      points: place(raw),
      segments: [...loop(L).map((s) => ({ ...s, mark: 'tick' as const })), q === 2 ? { a: 'A', b: 'D', dashed: true } : { a: 'A', b: 'C', dashed: true }],
      angles: [hl],
    }
    const ctx = pick(['Le donjon', 'La tour de guet', 'Le kiosque du jardin', 'La table du conseil', 'Le bassin de la cour'])
    const sumTxt = `En traçant les diagonales issues d'un sommet, on découpe le ${nom} en ${n - 2} triangles : la somme de ses angles vaut ${n - 2} × 180 = ${(n - 2) * 180}°, donc chaque angle mesure ${(n - 2) * 180} ÷ ${n} = ${deg(I)}.`
    const triTxt = ` Le triangle ABC est isocèle en B (AB = BC) : BAC = BCA = (180 − ${fmt(I)}) ÷ 2 = ${deg(bac)}.`
    const expl = q === 0 ? sumTxt + triTxt
      : q === 1 ? `${sumTxt}${triTxt} Donc ACD = BCD − BCA = ${fmt(I)} − ${fmt(bac)} = ${deg(acd)}.`
        : `${sumTxt} Le quadrilatère ABCD a deux angles de ${deg(I)} (en B et en C) et il est symétrique, donc ses angles en A et en D sont égaux. La somme des angles d'un quadrilatère vaut 360° (deux triangles) : ADC = (360 − 2 × ${fmt(I)}) ÷ 2 = ${deg(adc)}.`
    return titled('Le polygone régulier', numeric(
      `${ctx} a la forme d'un ${nom} régulier ${L.join('')} : tous ses côtés ont la même longueur et tous ses angles sont égaux. Combien mesure l'angle ${asked} ?`,
      [bac, acd, adc][q], { explanation: expl }), figure)
  },
]

// ═══════════════════════════════════════════════════════════════════════
// 5e-stat — Statistiques et probabilités
// ═══════════════════════════════════════════════════════════════════════
/** Diagramme en barres : valeurs écrites au-dessus des barres. */
function barsFigure(cats: string[], vals: number[]): Figure {
  const mx = Math.max(...vals), H = 3.6, raw: Record<string, Pt> = {}
  cats.forEach((_, i) => {
    const x0 = i * 1.2 + 0.35, x1 = x0 + 0.7, h = (vals[i] / mx) * H
    raw[`b${i}a`] = [x0, 0]; raw[`b${i}b`] = [x1, 0]; raw[`b${i}c`] = [x1, h]; raw[`b${i}d`] = [x0, h]
    raw[`t${i}`] = [(x0 + x1) / 2, h + 0.15]; raw[`c${i}`] = [(x0 + x1) / 2, -0.15]
  })
  raw.ax0 = [0, 0]; raw.ax1 = [cats.length * 1.2 + 0.2, 0]
  const points = place(raw, { hidden: Object.keys(raw), margin: 26 })
  const segments: FigSegment[] = [{ a: 'ax0', b: 'ax1' }]
  const polygons: { pts: string[]; fill: string }[] = []
  const notes: { x: number; y: number; text: string }[] = []
  cats.forEach((c, i) => {
    const k = `b${i}`
    polygons.push({ pts: [`${k}a`, `${k}b`, `${k}c`, `${k}d`], fill: BLUE })
    segments.push({ a: `${k}a`, b: `${k}d` }, { a: `${k}d`, b: `${k}c` }, { a: `${k}c`, b: `${k}b` })
    notes.push({ x: points[`t${i}`].x, y: points[`t${i}`].y - 4, text: String(vals[i]) }, { x: points[`c${i}`].x, y: points[`c${i}`].y + 14, text: c })
  })
  return { points, segments, polygons, notes, caption: '' }
}

/** Roue de loterie : secteurs (en degrés) dans l'ordre, en partant du haut. */
function wheelFigure(sectors: { deg: number; color: string; text: string }[]): Figure {
  const raw: Record<string, Pt> = { O: [0, 0] }
  let start = 90
  const polys: string[][] = []
  sectors.forEach((s, i) => {
    const steps = Math.max(2, Math.ceil(s.deg / 8)), names = ['O']
    for (let t = 0; t <= steps; t++) { const k = `w${i}-${t}`; raw[k] = polar(3, start - (s.deg * t) / steps); names.push(k) }
    raw[`n${i}`] = polar(s.deg < 40 ? 2.3 : 1.85, start - s.deg / 2)
    polys.push(names)
    start -= s.deg
  })
  const points = place(raw, { hidden: Object.keys(raw), margin: 20 })
  const segments: FigSegment[] = []
  polys.forEach((p) => {
    segments.push({ a: 'O', b: p[1] })
    for (let t = 1; t < p.length - 1; t++) segments.push({ a: p[t], b: p[t + 1] })
  })
  return {
    points, segments,
    polygons: polys.map((p, i) => ({ pts: p, fill: sectors[i].color })),
    notes: sectors.map((s, i) => ({ x: points[`n${i}`].x, y: points[`n${i}`].y + 5, text: s.text })),
    caption: '',
  }
}
const COLORS = [
  { nom: 'rouge', c: RED, l: 'R' }, { nom: 'bleu', c: BLUE, l: 'B' }, { nom: 'jaune', c: GOLD, l: 'J' }, { nom: 'vert', c: GREEN, l: 'V' },
]

const stat1: Maker[] = [
  () => retry(() => {
    const m6 = randInt(30, 90), vals = Array.from({ length: 5 }, () => m6 + randInt(-20, 20))
    vals.push(6 * m6 - sum(vals))
    if (vals[5] < 10 || Math.max(...vals) > 130) return null
    let out = randInt(150, 300)
    while ((sum(vals) + out) % 7) out++
    const m7 = (sum(vals) + out) / 7
    const days = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']
    const ctx = pick([
      ['son temps d’écran (en minutes)', 'la sortie d’un nouveau jeu', 'minutes'],
      ['le nombre de pages lues', 'un jour de pluie passé à lire', 'pages'],
      ['le nombre de pas (en centaines)', 'une randonnée en montagne', 'centaines de pas'],
    ])
    return titled('Le jour exceptionnel', numeric(
      `${prenom()} a relevé chaque jour de la semaine ${ctx[0]} : ${days.map((d, i) => `${d} ${vals[i]}`).join(', ')} et dimanche ${out}. Le dimanche était exceptionnel (${ctx[1]}). De combien la moyenne de la semaine diminue-t-elle si on ne tient pas compte du dimanche ?`,
      m7 - m6, { explanation: `Sur 7 jours : ${sum(vals) + out} ÷ 7 = ${m7}. Sans le dimanche : ${sum(vals)} ÷ 6 = ${m6}. La moyenne diminue de ${m7} − ${m6} = ${m7 - m6} ${ctx[2]}.` }))
  }),
  () => retry(() => {
    const N = pick([20, 25, 40, 50]), sports = shuffle(['football', 'basket', 'handball', 'natation', 'judo', 'danse', 'escalade']).slice(0, 5)
    const ball = sports.filter((s) => ['football', 'basket', 'handball'].includes(s))
    if (ball.length < 2 || ball.length === 5) return null
    const counts = Array.from({ length: 4 }, () => randInt(1, Math.floor(N / 4)))
    counts.push(N - sum(counts))
    if (counts[4] < 1) return null
    const cb = sum(sports.map((s, i) => (ball.includes(s) ? counts[i] : 0))), pct = (cb / N) * 100
    return titled('Le sondage du collège', numeric(
      `On a demandé à ${N} élèves leur sport préféré : ${sports.map((s, i) => `${s} ${counts[i]}`).join(' ; ')}. Quel pourcentage des élèves interrogés préfère un sport de ballon ?`,
      pct, { explanation: `Sports de ballon (${ball.join(', ')}) : ${sports.map((s, i) => (ball.includes(s) ? counts[i] : null)).filter((v) => v !== null).join(' + ')} = ${cb} élèves sur ${N}. Fréquence : ${cb} ÷ ${N} × 100 = ${fmt(pct)} %.` }))
  }),
  () => retry(() => {
    const r = randInt(3, 9), b = randInt(3, 9), v = randInt(2, 6), k = randInt(1, 5), w = randInt(0, 1)
    if (w === 0) {
      const tot = r + k + b
      return titled('L’urne modifiée', fraction(
        `Une urne contient ${r} boules rouges, ${b} boules bleues et ${v} boules vertes. On retire toutes les boules vertes, puis on ajoute ${plural(k, 'boule rouge', 'boules rouges')}. On tire alors une boule au hasard. Quelle est la probabilité qu'elle soit bleue ? (Fraction irréductible.)`,
        b, tot, { irreducible: true, explanation: `Il reste ${r} + ${k} = ${r + k} rouges et ${b} bleues, soit ${tot} boules. Probabilité : ${F(b, tot)}${simp(b, tot)}.` }))
    }
    if (k >= r) return null
    const tot = r - k + b + v + 2
    return titled('L’urne modifiée', fraction(
      `Une urne contient ${r} boules rouges, ${b} boules bleues et ${v} boules vertes. On retire ${plural(k, 'boule rouge', 'boules rouges')} et on ajoute 2 boules vertes. On tire alors une boule au hasard. Quelle est la probabilité qu'elle ne soit pas verte ? (Fraction irréductible.)`,
      r - k + b, tot, { irreducible: true, explanation: `Il y a maintenant ${r - k} rouges, ${b} bleues et ${v + 2} vertes, soit ${tot} boules. Non vertes : ${r - k + b}. Probabilité : ${F(r - k + b, tot)}${simp(r - k + b, tot)}.` }))
  }),
  () => retry(() => {
    const ctx = pick([['sauts en longueur', 'cm', [280, 420]], ['lancers de javelot', 'm', [18, 45]], ['scores au jeu de fléchettes', 'points', [20, 90]]] as const)
    const vals = Array.from({ length: 4 }, () => randInt(ctx[2][0], ctx[2][1])), mn = Math.min(...vals), E = randInt(Math.max(...vals) - mn + 1, Math.max(...vals) - mn + 30)
    const all = [...vals, mn + E], mean = sum(all) / 5
    if (!clean(mean)) return null
    const pos = randInt(0, 4), shown = [...vals]
    shown.splice(pos, 0, -1)
    return titled('La valeur effacée', numeric(
      `Voici les ${ctx[0]} ${deP(prenom())} (en ${ctx[1]}) : ${shown.map((x) => (x < 0 ? '?' : String(x))).join(' ; ')}. Une valeur a été effacée : on sait seulement que c'est la plus grande et que l'étendue de la série est ${E} ${ctx[1]}. Quelle est la moyenne des cinq valeurs ?`,
      mean, { explanation: `La plus petite valeur est ${mn}, donc la valeur effacée vaut ${mn} + ${E} = ${mn + E}. Moyenne : (${all.join(' + ')}) ÷ 5 = ${sum(all)} ÷ 5 = ${fmt(mean)} ${ctx[1]}.` }))
  }),
  () => retry(() => {
    const n = pick([8, 10, 12, 20]), k = randInt(3, n - 2), ev = randInt(0, 3)
    const faces = Array.from({ length: n }, (_, i) => i + 1)
    const [txt, ok] = ([
      [`un nombre pair supérieur ou égal à ${k}`, (f: number) => f % 2 === 0 && f >= k],
      ['un multiple de 3 ou un multiple de 4', (f: number) => f % 3 === 0 || f % 4 === 0],
      [`un diviseur de ${n}`, (f: number) => n % f === 0],
      [`un nombre impair strictement inférieur à ${k}`, (f: number) => f % 2 === 1 && f < k],
    ] as const)[ev]
    const good = faces.filter(ok)
    if (good.length < 2 || good.length === n) return null
    return titled('Le dé du jeu de rôle', fraction(
      `Pour une partie de jeu de rôle, ${prenom()} lance un dé équilibré à ${n} faces numérotées de 1 à ${n}. Quelle est la probabilité d'obtenir ${txt} ? (Fraction irréductible.)`,
      good.length, n, { irreducible: true, explanation: `Issues favorables : ${good.join(', ')}, soit ${good.length} sur ${n} issues équiprobables. Probabilité : ${F(good.length, n)}${simp(good.length, n)}.` }))
  }),
]

const stat2: Maker[] = [
  () => retry(() => {
    const ctx = pick([
      { t: 'le nombre de buts marqués par l’équipe à chaque match', cats: ['0', '1', '2', '3', '4'], u: 'matchs', w: 'buts' },
      { t: 'les notes (sur 5) obtenues au quiz par les élèves', cats: ['1', '2', '3', '4', '5'], u: 'élèves', w: 'points' },
      { t: 'le nombre de frères et sœurs des élèves de la classe', cats: ['0', '1', '2', '3', '4'], u: 'élèves', w: 'frères et sœurs' },
    ])
    const vals = ctx.cats.map(() => randInt(1, 9)), N = sum(vals), tot = sum(vals.map((c, i) => c * Number(ctx.cats[i]))), mean = tot / N
    const ask = randInt(0, 1), th = Number(ctx.cats[2])
    const nb = sum(vals.filter((_, i) => i >= 2)), pct = (nb / N) * 100
    if (ask === 0 ? !clean(mean) : !clean(pct)) return null
    return titled('Le diagramme en barres', numeric(
      `${prenom()} a représenté par ce diagramme ${ctx.t} (le nombre au-dessus de chaque barre est l'effectif). ${ask === 0 ? `Quelle est la moyenne de cette série ?` : `Quel pourcentage des ${ctx.u} correspond à une valeur supérieure ou égale à ${th} ?`}`,
      ask === 0 ? mean : pct, { explanation: ask === 0
        ? `Effectif total : ${vals.join(' + ')} = ${N}. Somme des valeurs : ${vals.map((c, i) => `${ctx.cats[i]} × ${c}`).join(' + ')} = ${tot}. Moyenne : ${tot} ÷ ${N} = ${fmt(mean)}.`
        : `Effectif total : ${N}. Valeurs ≥ ${th} : ${vals.slice(2).join(' + ')} = ${nb}. Fréquence : ${nb} ÷ ${N} × 100 = ${fmt(pct)} %.` }), barsFigure(ctx.cats, vals))
  }),
  () => retry(() => {
    const k = pick([8, 10, 12]), cnt = [randInt(1, k - 3), randInt(1, k - 3), randInt(1, k - 3)]
    cnt.push(k - sum(cnt))
    if (cnt[3] < 1) return null
    const seq: number[] = []
    cnt.forEach((c, i) => { for (let t = 0; t < c; t++) seq.push(i) })
    const ring = shuffle(seq)
    const ask = randInt(0, 2), ci = randInt(0, 3), cj = (ci + randInt(1, 3)) % 4
    const fav = ask === 0 ? cnt[ci] : ask === 1 ? k - cnt[ci] : cnt[ci] + cnt[cj]
    const fem = (c: number) => `${COLORS[c].nom}${COLORS[c].nom.endsWith('e') ? '' : 'e'}`
    const txt = ask === 0 ? `de tomber sur une case ${fem(ci)}` : ask === 1 ? `de ne pas tomber sur une case ${fem(ci)}` : `de tomber sur une case ${fem(ci)} ou ${fem(cj)}`
    const figure = wheelFigure(ring.map((c) => ({ deg: 360 / k, color: COLORS[c].c, text: COLORS[c].l })))
    return titled('La roue de la kermesse', fraction(
      `À la kermesse, une roue est partagée en ${k} cases identiques : R = rouge, B = bleu, J = jaune, V = vert (voir la figure). On fait tourner la roue. Quelle est la probabilité ${txt} ? (Fraction irréductible.)`,
      fav, k, { irreducible: true, explanation: `Les ${k} cases sont équiprobables. Cases favorables : ${fav}. Probabilité : ${F(fav, k)}${simp(fav, k)}.` }), figure)
  }),
  () => retry(() => {
    const n = randInt(3, 6), m1 = randInt(8, 15), m2 = m1 + pick([-2, -1, 1, 2]), x = (n + 1) * m2 - n * m1
    if (x < 0 || x > 20) return null
    const ctx = pick([['contrôles', 'note', 'sur 20'], ['matchs', 'nombre de points marqués', '']])
    if (ctx[0] === 'matchs' && x < 3) return null
    return titled('La moyenne qui change', numeric(
      ctx[0] === 'contrôles'
        ? `Après ${n} contrôles, ${prenom()} a exactement ${m1} de moyenne. Après le contrôle suivant, sa moyenne passe à ${m2}. Quelle note (sur 20) a été obtenue à ce contrôle ?`
        : `Après ${n} matchs, la meneuse de l'équipe de basket marque en moyenne ${m1} points par match. Après le match suivant, sa moyenne passe à ${m2} points. Combien de points a-t-elle marqués lors de ce match ?`,
      x, { explanation: `Total avant : ${n} × ${m1} = ${n * m1}. Total après : ${n + 1} × ${m2} = ${(n + 1) * m2}. Résultat du dernier ${ctx[0] === 'contrôles' ? 'contrôle' : 'match'} : ${(n + 1) * m2} − ${n * m1} = ${x}.` }))
  }),
  () => retry(() => {
    const ctx = pick([
      ['Dans un club, les', 'filles mesurent en moyenne', 'garçons', 'cm', 'Quelle est la taille moyenne de l’ensemble des membres (en cm) ?', [140, 170]],
      ['Au cross du collège, les', 'élèves de 5e A ont mis en moyenne', 'élèves de 5e B', 'min', 'Quel est le temps moyen de l’ensemble des élèves (en min) ?', [12, 25]],
      ['À la fête du village, les', 'adultes ont mangé en moyenne', 'enfants', 'crêpes', 'Quel est le nombre moyen de crêpes par personne ?', [2, 7]],
    ] as const)
    const n1 = randInt(4, 20), n2 = randInt(4, 20), m1 = randInt(ctx[5][0], ctx[5][1]), m2 = randInt(ctx[5][0], ctx[5][1])
    const mean = (n1 * m1 + n2 * m2) / (n1 + n2)
    if (n1 === n2 || m1 === m2 || !clean(mean) || isInt(mean) && Math.random() < 0.3) return null
    return titled('Les deux groupes réunis', numeric(
      `${ctx[0]} ${n1} ${ctx[1]} ${m1} ${ctx[3]} et les ${n2} ${ctx[2]} ${m2} ${ctx[3]} en moyenne. ${ctx[4]}`,
      mean, { explanation: `On ne fait pas la moyenne des deux moyennes ! Total : ${n1} × ${m1} + ${n2} × ${m2} = ${n1 * m1 + n2 * m2}, pour ${n1 + n2} personnes. Moyenne : ${n1 * m1 + n2 * m2} ÷ ${n1 + n2} = ${fmt(mean)}.` }))
  }),
  () => retry(() => {
    const p1 = randInt(4, 10) * 5, p2 = randInt(3, 10) * 5, rest = 100 - p1 - p2
    if (rest < 10 || p1 === p2) return null
    const T = randInt(2, 30) * 20, R = (T * rest) / 100, K = (T * p2) / 100
    if (!isInt(R) || !isInt(K)) return null
    const ctx = pick([['Dans un club d’arts martiaux', 'font du judo', 'du karaté', 'de la boxe', 'membres', 'de membres'], ['Au self du collège', 'prennent des frites', 'des pâtes', 'du riz', 'élèves', 'd’élèves'], ['À la bibliothèque', 'empruntent des BD', 'des romans', 'des documentaires', 'lecteurs', 'de lecteurs']])
    return titled('Les fréquences à l’envers', numeric(
      `${ctx[0]}, ${p1} % des ${ctx[4]} ${ctx[1]}, ${p2} % ${ctx[1].split(' ')[0]} ${ctx[2]} et les ${R} autres ${ctx[1].split(' ')[0]} ${ctx[3]}. Combien ${ctx[5]} ${ctx[1].split(' ')[0]} ${ctx[2]} ?`,
      K, { explanation: `Les autres représentent 100 − ${p1} − ${p2} = ${rest} % du total, soit ${R}. Donc 1 % ↔ ${fmt(R / rest)} et 100 % ↔ ${T}. Enfin ${p2} % de ${T} = ${T} × ${p2} ÷ 100 = ${K}.` }))
  }),
]

const stat3: Maker[] = [
  () => retry(() => {
    const [p, q] = pick([[2, 3], [3, 4], [3, 5], [4, 5], [5, 6], [3, 7]]), r = randInt(2, 12), b = randInt(2, 12), addRed = Math.random() < 0.6
    const k = addRed ? (p * (r + b) - q * r) / (q - p) : (q * r - p * (r + b)) / p
    if (!isInt(k) || k < 1 || k > 30) return null
    const tot = r + b + k
    return titled('Le sac à compléter', numeric(
      `Un sac contient ${r} jetons rouges et ${b} jetons bleus. Combien de jetons ${addRed ? 'rouges' : 'bleus'} faut-il ajouter pour que la probabilité de tirer un jeton rouge soit égale à ${F(p, q)} ?`,
      k, { explanation: `Avec ${k} jetons ${addRed ? 'rouges' : 'bleus'} de plus, il y a ${addRed ? r + k : r} rouges sur ${tot} jetons, et ${F(addRed ? r + k : r, tot)} = ${F(p, q)}. Pour trouver ${k} : il faut que les rouges forment ${p} parts sur ${q}, ${addRed ? `donc que les ${b} bleus forment ${q - p} part${q - p > 1 ? 's' : ''} : une part vaut ${Fs(b, q - p)}, il faut ${p} × ${Fs(b, q - p)} = ${r + k} rouges` : `donc une part vaut ${Fs(r, p)} et il faut ${q - p} × ${Fs(r, p)} = ${b + k} bleus`}.` }))
  }),
  () => retry(() => {
    const m = randInt(9, 14), e = randInt(6, 14), known = Array.from({ length: 4 }, () => randInt(5, 18))
    const s = 6 * m - sum(known), mx = (s + e) / 2, mn = (s - e) / 2
    if (!isInt(mx) || mn < 0 || mx > 20 || mn > Math.min(...known) || mx < Math.max(...known)) return null
    return titled('Les notes extrêmes', numeric(
      `${prenom()} a eu six notes ce trimestre. Quatre sont connues : ${known.join(' ; ')}. Les deux autres sont la plus haute et la plus basse du trimestre. On sait que la moyenne des six notes est ${m} et que l'étendue est ${e}. Quelle est la note la plus haute ?`,
      mx, { explanation: `Total des six notes : 6 × ${m} = ${6 * m}. Les deux notes manquantes ont pour somme ${6 * m} − ${sum(known)} = ${s} et pour différence ${e} (l'étendue). La plus haute vaut (${s} + ${e}) ÷ 2 = ${mx} (et la plus basse ${mn}).` }))
  }),
  () => retry(() => {
    const n1 = pick([20, 24, 25, 28, 30]), n2 = pick([20, 24, 25, 28, 30]), r1 = pick([40, 50, 60, 75, 80]), R = randInt(10, 18) * 5
    const c1 = (n1 * r1) / 100, tot = ((n1 + n2) * R) / 100, c2 = tot - c1, r2 = (c2 / n2) * 100
    if (n1 === n2 || !isInt(c1) || !isInt(tot) || c2 < 0 || c2 > n2 || !clean(r2) || r2 === r1) return null
    return titled('Le taux de réussite caché', numeric(
      `Au concours de calcul mental, ${r1} % des ${n1} élèves de la 5e A sont qualifiés. Sur l'ensemble des ${n1 + n2} élèves des classes de 5e A et 5e B, ${R} % sont qualifiés. Quel est le pourcentage d'élèves qualifiés en 5e B ?`,
      r2, { explanation: `Qualifiés en tout : ${n1 + n2} × ${R} ÷ 100 = ${tot}. En 5e A : ${n1} × ${r1} ÷ 100 = ${c1}. En 5e B : ${tot} − ${c1} = ${c2} sur ${n2}, soit ${c2} ÷ ${n2} × 100 = ${fmt(r2)} %.` }))
  }),
  () => {
    const m = randInt(2, 5), face = randInt(1, 6), ask = randInt(0, 2)
    const others = 5, tot = others + m
    const isEven = face % 2 === 0
    const [txt, fav] = ask === 0 ? [`d'obtenir ${face}`, m]
      : ask === 1 ? ['d’obtenir un nombre pair', isEven ? 2 + m : 3]
        : ['d’obtenir un nombre impair', isEven ? 3 : 2 + m]
    return titled('Le dé truqué', fraction(
      `Le dé du sorcier est truqué : la face ${face} a ${m} fois plus de chances de sortir que chacune des autres faces, qui ont toutes la même chance de sortir. Quelle est la probabilité ${txt} ? (Fraction irréductible.)`,
      fav, tot, { irreducible: true, explanation: `On compte les chances en « parts » : chaque face ordinaire vaut 1 part, la face ${face} vaut ${m} parts, soit ${others} + ${m} = ${tot} parts. ${ask === 0 ? `Face ${face} : ${m} parts` : `Faces favorables : ${ask === 1 ? '2, 4, 6' : '1, 3, 5'}, soit ${fav} parts${(ask === 1) === isEven ? ` (dont ${m} pour la face ${face})` : ''}`}. Probabilité : ${F(fav, tot)}${simp(fav, tot)}.` }))
  },
  () => retry(() => {
    const n = randInt(4, 10), m = randInt(8, 20), k = randInt(2, 5), M = m + randInt(1, 4)
    const need = ((n + k) * M - n * m) / k
    if (!clean(need) || need > 35) return null
    return titled('L’objectif de la saison', numeric(
      `Après ${n} matchs, ${prenom()} a marqué en moyenne ${m} points par match. Il reste ${k} matchs dans la saison. Combien de points en moyenne par match faut-il marquer lors de ces ${k} matchs pour finir la saison avec une moyenne de ${M} points par match ?`,
      need, { explanation: `Total visé : ${n + k} × ${M} = ${(n + k) * M} points. Déjà marqués : ${n} × ${m} = ${n * m}. Il manque ${(n + k) * M - n * m} points en ${k} matchs, soit ${(n + k) * M - n * m} ÷ ${k} = ${fmt(need)} points par match.` }))
  }),
  () => retry(() => {
    const r = pick([60, 72, 90, 120]), y = pick([30, 45, 60, 80, 90]), g = (360 - r - y) / 3
    if (!isInt(g) || g < 20) return null
    const figure = wheelFigure([{ deg: r, color: RED, text: 'R' }, { deg: g, color: GREEN, text: 'V' }, { deg: y, color: GOLD, text: 'J' }, { deg: 2 * g, color: BLUE, text: 'B' }])
    const ask = randInt(0, 1)
    const fav = ask === 0 ? 2 * g : 360 - r
    return titled('La roue du marchand', fraction(
      `La roue du marchand a quatre secteurs : rouge (R) de ${r}°, jaune (J) de ${y}°, vert (V), et bleu (B), le secteur bleu étant deux fois plus grand que le vert. La probabilité de s'arrêter sur un secteur est proportionnelle à son angle. Quelle est la probabilité ${ask === 0 ? 'de s’arrêter sur le bleu' : 'de ne pas s’arrêter sur le rouge'} ? (Fraction irréductible.)`,
      fav, 360, { irreducible: true, explanation: `Vert + bleu = 360 − ${r} − ${y} = ${360 - r - y}°, et le bleu vaut deux fois le vert : vert = ${360 - r - y} ÷ 3 = ${g}°, bleu = ${2 * g}°. ${ask === 0 ? `Probabilité : ${F(2 * g, 360)}${simp(2 * g, 360)}.` : `Pas rouge : 360 − ${r} = ${360 - r}°, probabilité ${F(360 - r, 360)}${simp(360 - r, 360)}.`}` }), figure)
  }),
]

export const AGE_5E: Record<string, Ladder> = {
  '5e-prio': [prio1, prio2, prio3],
  '5e-rel': [rel1, rel2, rel3],
  '5e-frac': [frac1, frac2, frac3],
  '5e-lit': [lit1, lit2, lit3],
  '5e-prop': [prop1, prop2, prop3],
  '5e-geo': [geo1, geo2, geo3],
  '5e-stat': [stat1, stat2, stat3],
}

