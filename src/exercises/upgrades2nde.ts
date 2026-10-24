// Problèmes d'amélioration (2nde) : 3 niveaux croissants par maison.
// Esprit : la notion du chapitre, généralisée ou déguisée dans un petit énoncé (45 à 90 s).
import {
  F, expression, fmt, fraction, fracText, gcd, interval, intervalText, numeric, pair, par, pick, poly, radical,
  randInt, randNonZero, solutionSet, term, withMeta, xPlus,
  type Exercise, type Interval, type Ladder,
} from './utils'
import { fitPoints, thalesFigure, triangleFigure, type FigPoint, type FigSegment, type Figure } from './figure'
import { deuxPrenoms, prenom } from './contexts'

// ── Aides locales ───────────────────────────────────────────────────────
const T = (title: string, ex: Exercise, figure?: Figure): Exercise => withMeta(ex, figure ? { title, figure } : { title })
/** Vrai si v a au plus `dec` décimales. */
const isClean = (v: number, dec = 2) => Number.isFinite(v) && Math.abs(v * 10 ** dec - Math.round(v * 10 ** dec)) < 1e-6
const r6 = (v: number) => Math.round(v * 1e6) / 1e6
/** Grand entier avec espaces fines : 123 456. */
const tm = (c: number, v: string) => term(r6(c), v, true)
const big = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
const pt = (x: number, y: number) => `(${fmt(x)} ; ${fmt(y)})`
const isSquare = (n: number) => n >= 0 && Number.isInteger(Math.round(Math.sqrt(n) * 1e9) / 1e9)
const lcm = (a: number, b: number) => (a * b) / gcd(a, b)
/** Évolution signée : +12 % ou −8 %. */
const evo = (t: number) => (t > 0 ? `+${fmt(r6(t))} %` : `${fmt(r6(t))} %`)
/** Coefficient multiplicateur d'une évolution de t %. */
const cmul = (t: number) => r6(1 + t / 100)
/** Coefficient devant une lettre ou un vecteur : 2AB⃗, −AB⃗, AB⃗. */
const coefOf = (k: number, name: string, first: boolean) => {
  const abs = Math.abs(k)
  const body = `${abs === 1 ? '' : abs === 0.5 ? F(1, 2) : fmt(abs)}${name}`
  if (first) return k < 0 ? `−${body}` : body
  return k < 0 ? ` − ${body}` : ` + ${body}`
}

function sqrtParts(n: number): [number, number] {
  let k = 1, m = n
  for (let d = 2; d * d <= m; d++) while (m % (d * d) === 0) { m /= d * d; k *= d }
  return [k, m]
}

const TRIPLES: [number, number, number][] = [[3, 4, 5], [6, 8, 10], [5, 12, 13], [9, 12, 15], [8, 15, 17], [12, 16, 20]]
/** Vecteur à coordonnées entières et de norme entière (signes et ordre au hasard). */
function tripleVec(maxR = 17, axis = false): [number, number, number] {
  const pool: [number, number, number][] = TRIPLES.filter((t) => t[2] <= maxR)
  if (axis) for (let a = 2; a <= Math.min(9, maxR); a++) pool.push([a, 0, a])
  const [p, q, r] = pick(pool)
  const [a, b] = Math.random() < 0.5 ? [p, q] : [q, p]
  return [a * pick([1, -1]), b * pick([1, -1]), r]
}

function interInter(a: Interval, b: Interval): Interval {
  const lo = Math.max(a.lo, b.lo), hi = Math.min(a.hi, b.hi)
  const loClosed = (a.lo !== lo || a.loClosed) && (b.lo !== lo || b.loClosed)
  const hiClosed = (a.hi !== hi || a.hiClosed) && (b.hi !== hi || b.hiClosed)
  return { lo, hi, loClosed, hiClosed }
}

/** Angles en A et B (degrés) d'un triangle de côtés AB, BC, CA. */
function shapeFromSides(ab: number, bc: number, ca: number): [number, number] {
  const A = (Math.acos((ab * ab + ca * ca - bc * bc) / (2 * ab * ca)) * 180) / Math.PI
  const B = (Math.acos((ab * ab + bc * bc - ca * ca) / (2 * ab * bc)) * 180) / Math.PI
  return [A, B]
}

const AXIS = '#9c8a6a'
/** Figure dans un repère : les axes passent par O, les points donnés sont nommés. */
function repere(raw: Record<string, [number, number]>, segments: FigSegment[] = [], polygons?: { pts: string[]; fill: string }[]): Figure {
  const xs = Object.values(raw).map((p) => p[0]), ys = Object.values(raw).map((p) => p[1])
  const x0 = Math.min(0, ...xs) - 1, x1 = Math.max(0, ...xs) + 1, y0 = Math.min(0, ...ys) - 1, y1 = Math.max(0, ...ys) + 1
  const pts = fitPoints({ ...raw, O: [0, 0], Xa: [x0, 0], Xb: [x1, 0], Ya: [0, y0], Yb: [0, y1] })
  for (const k of ['Xa', 'Xb', 'Ya', 'Yb']) pts[k] = { ...pts[k], hidden: true, label: '' }
  pts.O = { ...pts.O, pos: 'sw' }
  return {
    points: pts,
    segments: [{ a: 'Xa', b: 'Xb', color: AXIS }, { a: 'Ya', b: 'Yb', color: AXIS }, ...segments],
    polygons,
    caption: 'Repère orthonormé. La figure n’est pas à l’échelle.',
  }
}

/** (t − a)² + b² écrit proprement (termes nuls omis). */
const sqd = (v: string, a: number, b: number) => `${a === 0 ? `${v}²` : `(${xPlus(-a).replace('x', v)})²`}${b === 0 ? '' : ` + ${b * b}`}`
/** Fraction empilée de deux entiers, signe ramené au numérateur. */
const Fs = (n: number, d: number) => (d < 0 ? F(fmt(-n), fmt(-d)) : F(fmt(n), fmt(d)))
/** Fraction réduite empilée (ou entier). */
const Fr = (n: number, d: number) => { const g = gcd(n, d) || 1; return d / g === 1 ? fmt(n / g) : Fs(n / g, d / g) }
/** Texte posé à côté du milieu de [PQ] (coordonnées du cadre). */
const noteAt = (p: FigPoint, q: FigPoint, dx: number, dy: number, text: string) => ({ x: (p.x + q.x) / 2 + dx, y: (p.y + q.y) / 2 + dy, text })
const sideDx = (text: string) => text.length * 3.6 + 8
/** Points tous cachés (figures « libres » étiquetées par des notes). */
function hiddenPoints(raw: Record<string, [number, number]>, margin = 46) {
  const pts = fitPoints(raw, undefined, undefined, margin)
  for (const k of Object.keys(pts)) pts[k] = { ...pts[k], hidden: true, label: '' }
  return pts
}
const rect = (a: string, b: string, c: string, d: string, extra: Partial<FigSegment> = {}): FigSegment[] => [
  { a, b, ...extra }, { a: b, b: c, ...extra }, { a: c, b: d, ...extra }, { a: d, b: a, ...extra },
]
const FILL = '#c9a227'
const GREEN = '#5f9e4a'

// ═════════════════════════════════════════════════════════════════════════
// Nombres & calculs
// ═════════════════════════════════════════════════════════════════════════
const nombres: Ladder = [
  [
    // Temps de trajet d'un signal : quotient de puissances de 10.
    () => {
      const n = pick([7, 8])
      const d = pick([1.2, 1.5, 1.8, 2.1, 2.4, 2.7, 3, 3.6, 4.5, 5.4, 6, 7.5, 9])
      const t = r6((d / 3) * 10 ** (n - 5))
      const cible = pick(['Une sonde spatiale', 'Un robot explorateur', 'Un satellite lointain', 'Le vaisseau d’un jeu de science-fiction', 'Un télescope spatial'])
      const metres = Math.random() < 0.4
      const N = metres ? n + 3 : n, V = metres ? 8 : 5, u = metres ? 'm' : 'km'
      return T('Message vers l’espace', numeric(
        `Un signal radio voyage à la vitesse de la lumière, environ 3 × 10^${V} ${u}/s. ${cible} se trouve à ${fmt(d)} × 10^${N} ${u} de la Terre. Combien de secondes le signal met-il pour lui parvenir ?`,
        t, { explanation: `t = distance ÷ vitesse = ${fmt(d)} × 10^${N} ÷ (3 × 10^${V}) = ${fmt(r6(d / 3))} × 10^${n - 5} = ${fmt(t)} s.` }))
    },
    // Diagonale d'un rectangle : Pythagore puis racine simplifiée.
    () => {
      let p = 0, q = 0, k = 1, m = 1
      do {
        p = randInt(1, 12); q = randInt(1, 12);
        [k, m] = sqrtParts(p * p + q * q)
      } while (p === q || k === 1 || m === 1)
      const [obj, u] = pick([['écran', 'dm'], ['tapis', 'dm'], ['drapeau', 'dm'], ['champ', 'dam'], ['tableau', 'dm'], ['plateau de jeu', 'cm'], ['carreau', 'cm']] as const)
      const pts = fitPoints({ A: [0, 0], B: [p, 0], C: [p, q], D: [0, q] }, undefined, undefined, 46)
      return T('La diagonale', radical(
        `Un ${obj} rectangulaire ABCD mesure AB = ${p} ${u} et BC = ${q} ${u}. Donne la longueur exacte de sa diagonale [AC], sous la forme a√b (en ${u}).`,
        k, m, { explanation: `Pythagore dans ABC rectangle en B : AC² = ${p}² + ${q}² = ${p * p + q * q} = ${k * k} × ${m}, donc AC = √${k * k} × √${m} = ${k}√${m} ${u}.` }), {
        points: pts,
        segments: [
          { a: 'A', b: 'B', label: `${p} ${u}` }, { a: 'B', b: 'C' }, { a: 'C', b: 'D' }, { a: 'D', b: 'A' },
          { a: 'A', b: 'C', dashed: true, color: '#b8362f' },
        ],
        angles: [{ vertex: 'B', a: 'A', b: 'C', right: true }],
        notes: [noteAt(pts.B, pts.C, sideDx(`${q} ${u}`), 4, `${q} ${u}`)],
      })
    },
    // Capacité de stockage : quotient de puissances de 10.
    () => {
      const item = pick([
        { sg: 'Chaque photo', pl: 'photos', e: 6, s: [2, 2.5, 4, 5, 8] },
        { sg: 'Chaque morceau de musique', pl: 'morceaux', e: 6, s: [2.5, 4, 5, 8] },
        { sg: 'Chaque vidéo', pl: 'vidéos', e: 8, s: [1.6, 2, 4, 5, 8] },
        { sg: 'Chaque sauvegarde de jeu', pl: 'sauvegardes', e: 7, s: [1.6, 2, 2.5, 4, 5, 8] },
      ])
      const s = pick(item.s), G = pick([16, 32, 64, 128, 256])
      const count = Math.round((G / s) * 10 ** (9 - item.e))
      const support = pick(['Une clé USB', 'Une carte mémoire', 'Un disque externe'])
      return T('Mémoire pleine', numeric(
        `${support} a une capacité de ${G} Go, et 1 Go = 10^9 octets. ${item.sg} occupe ${fmt(s)} × 10^${item.e} octets. Combien de ${item.pl} peut-on y ranger au maximum ?`,
        count, { explanation: `${G} × 10^9 ÷ (${fmt(s)} × 10^${item.e}) = (${G} ÷ ${fmt(s)}) × 10^${9 - item.e} = ${fmt(r6(G / s))} × 10^${9 - item.e} = ${big(count)}.` }))
    },
    // Croissance de bactéries : changement de base des puissances.
    () => {
      const [b0, e0] = pick([[2, 1], [4, 2], [8, 3], [16, 4]])
      const a = randInt(2, 6), h = randInt(2, 6)
      const g = pick([
        { txt: 'double toutes les 20 minutes', perH: 3, why: '3 doublements par heure' },
        { txt: 'double toutes les 15 minutes', perH: 4, why: '4 doublements par heure' },
        { txt: 'double toutes les 30 minutes', perH: 2, why: '2 doublements par heure' },
        { txt: 'est multiplié par 4 toutes les 30 minutes', perH: 4, why: '× 4 × 4 = × 2^4 par heure' },
        { txt: 'est multiplié par 8 chaque heure', perH: 3, why: '× 8 = × 2^3 par heure' },
      ])
      const org = pick(['bactéries', 'levures', 'micro-algues', 'cellules'])
      const n = e0 * a + g.perH * h
      return T('La culture', numeric(
        `Au départ, une culture contient ${b0}^${a} ${org}, et leur nombre ${g.txt}. Au bout de ${h} heures, ce nombre s'écrit 2^n. Que vaut n ?`,
        n, { explanation: `${b0}^${a} = 2^${e0 * a}. Il y a ${g.why}, donc en ${h} h le nombre est multiplié par 2^${g.perH * h}. n = ${e0 * a} + ${g.perH * h} = ${n}.` }))
    },
    // Deux contraintes : intersection d'intervalles.
    () => {
      const ctx = pick([
        { intro: (w1: string, w2: string) => `Pour monter dans le grand huit, il faut mesurer ${w1}. Pour le manège des chevaliers, il faut mesurer ${w2}.`, q: 'Quelles tailles (en cm) permettent de faire les deux manèges ?', u: 'cm', lo: 80, hi: 200, step: 5 },
        { intro: (w1: string, w2: string) => `Une batterie fonctionne si la température vaut ${w1}. Un écran fonctionne si elle vaut ${w2}.`, q: 'Pour quelles températures (en °C) les deux appareils fonctionnent-ils ?', u: '°C', lo: -30, hi: 60, step: 1 },
        { intro: (w1: string, w2: string) => `Le tournoi d'échecs est ouvert aux joueurs ayant ${w1} ; le tournoi de tir à l'arc, à ceux ayant ${w2}.`, q: 'Pour quels âges (en années) peut-on participer aux deux tournois ?', u: 'ans', lo: 6, hi: 40, step: 1 },
      ])
      const vals = new Set<number>()
      while (vals.size < 4) vals.add(ctx.lo + ctx.step * randInt(0, (ctx.hi - ctx.lo) / ctx.step))
      const [v1, v2, v3, v4] = [...vals].sort((a, b) => a - b)
      const nested = Math.random() < 0.3
      const cl = () => Math.random() < 0.5
      let I1: Interval = { lo: v1, hi: nested ? v4 : v3, loClosed: cl(), hiClosed: cl() }
      let I2: Interval = { lo: v2, hi: nested ? v3 : v4, loClosed: cl(), hiClosed: cl() }
      if (Math.random() < 0.5) [I1, I2] = [I2, I1]
      const w = (I: Interval) => `${I.loClosed ? 'au moins' : 'strictement plus de'} ${fmt(I.lo)} ${ctx.u} et ${I.hiClosed ? 'au plus' : 'strictement moins de'} ${fmt(I.hi)} ${ctx.u}`
      const R = interInter(I1, I2)
      return T('Double condition', interval(`${ctx.intro(w(I1), w(I2))} ${ctx.q} Réponds par un intervalle.`, R, {
        explanation: `Première condition : ${intervalText(I1)} ; seconde : ${intervalText(I2)}. On garde les valeurs communes : ${intervalText(R)}.`,
      }))
    },
  ],
  [
    // Grande diagonale d'un cube.
    () => {
      const a = randInt(2, 12), u = pick(['cm', 'dm'])
      const obj = pick(['Une caisse cubique', 'Un dé géant', 'Un aquarium cubique', 'Un bloc de pierre cubique', 'Une boîte cubique'])
      return T('Au cœur du cube', radical(
        `${obj} a des arêtes de ${a} ${u}. Donne la longueur exacte de sa grande diagonale (le segment qui joint deux sommets opposés en traversant le cube), sous la forme a√b, en ${u}.`,
        a, 3, { explanation: `Diagonale d'une face : d² = ${a}² + ${a}² = ${2 * a * a}. Grande diagonale : D² = d² + ${a}² = ${3 * a * a}, donc D = √${3 * a * a} = ${a}√3 ${u}.` }))
    },
    // Rectangle aux côtés conjugués.
    () => {
      const k = randInt(3, 9)
      let m = randInt(2, k * k - 1)
      while (isSquare(m)) m = randInt(2, k * k - 1)
      const askArea = Math.random() < 0.55
      const sides = `pour longueur (${k} + √{${m}}) cm et pour largeur (${k} − √{${m}}) cm`
      return T('Le rectangle irrationnel', askArea
        ? numeric(`Un rectangle a ${sides}. Calcule son aire exacte (en cm²).`, k * k - m, {
          explanation: `(a + b)(a − b) = a² − b² : ${k}² − (√${m})² = ${k * k} − ${m} = ${k * k - m} cm².`,
        })
        : numeric(`Un rectangle a ${sides}. Calcule le carré d² de la longueur de sa diagonale (en cm²).`, 2 * k * k + 2 * m, {
          explanation: `d² = (${k} + √${m})² + (${k} − √${m})² = (${k * k} + ${2 * k}√${m} + ${m}) + (${k * k} − ${2 * k}√${m} + ${m}) = ${2 * k * k + 2 * m}.`,
        }))
    },
    // Durée d'un voyage en notation scientifique (normalisation).
    () => {
      for (;;) {
        const a = pick([1.2, 1.5, 1.8, 2, 2.4, 3, 3.6, 4.5, 6, 7.2, 8, 9]), b = pick([1.5, 2, 3, 4, 5, 6, 8])
        const p = randInt(8, 11), q = randInt(3, 5)
        let c = a / b, n = p - q
        while (c < 1) { c *= 10; n-- }
        c = r6(c)
        if (!isClean(c, 2) || c === 1 && Math.random() < 0.7) continue
        const obj = pick(['Une sonde', 'Une comète', 'Un vaisseau', 'Un astéroïde'])
        return T('Voyage interplanétaire', pair(
          `${obj} parcourt ${fmt(a)} × 10^${p} km à la vitesse moyenne de ${fmt(b)} × 10^${q} km/h. Écris la durée du trajet (en heures) en notation scientifique c × 10^n, avec 1 ≤ c < 10. Donne le couple (c ; n).`,
          c, n, { inputHint: 'Forme (c ; n)', explanation: `${fmt(a)} ÷ ${fmt(b)} = ${fmt(r6(a / b))} et 10^${p} ÷ 10^${q} = 10^${p - q}, donc la durée vaut ${fmt(r6(a / b))} × 10^${p - q}${n === p - q ? '' : ` = ${fmt(c)} × 10^${n}`} h.` }))
      }
    },
    // Encadrement d'une expression affine (sens des inégalités).
    () => {
      const lo = randInt(-6, 3), hi = lo + randInt(2, 7), loC = Math.random() < 0.5, hiC = Math.random() < 0.5
      const k = pick([-5, -4, -3, -2, -3, -2, 2, 3, 4, 5]), c = randInt(-9, 9)
      const f = (x: number) => k * x + c
      const R: Interval = k > 0 ? { lo: f(lo), hi: f(hi), loClosed: loC, hiClosed: hiC } : { lo: f(hi), hi: f(lo), loClosed: hiC, hiClosed: loC }
      const e = Math.random() < 0.5 ? poly([k, 'x'], [c, '']) : poly([c, ''], [k, 'x'])
      const s = (b: boolean) => (b ? '≤' : '<')
      return T('Encadrement', interval(
        `On sait que ${fmt(lo)} ${s(loC)} x ${s(hiC)} ${fmt(hi)}. À quel intervalle appartient le nombre ${e} ?`, R, {
          explanation: k < 0
            ? `On multiplie par ${fmt(k)} < 0 : les inégalités changent de sens. On obtient ${fmt(R.lo)} ${s(R.loClosed)} ${e} ${s(R.hiClosed)} ${fmt(R.hi)}.`
            : `On multiplie par ${k} > 0 puis on ajoute ${fmt(c)} : ${fmt(R.lo)} ${s(R.loClosed)} ${e} ${s(R.hiClosed)} ${fmt(R.hi)}.`,
        }))
    },
    // Périmètre d'un triangle aux côtés irrationnels.
    () => {
      const m = pick([2, 3, 5, 6, 7])
      let a = 0, b = 0, c = 0, sh: [number, number] = [60, 60]
      for (;;) {
        a = randInt(2, 7); b = randInt(2, 7); c = randInt(2, 7)
        if (a + b <= c || b + c <= a || a + c <= b || (a === b && b === c)) continue
        sh = shapeFromSides(a, b, c)
        if (sh[0] > 25 && sh[1] > 25 && 180 - sh[0] - sh[1] > 25) break
      }
      const s = (k: number) => k * k * m
      return T('Le périmètre exact', radical(
        `Les côtés d'un triangle ABC mesurent AB = √{${s(a)}} cm, BC = √{${s(b)}} cm et CA = √{${s(c)}} cm. Donne son périmètre exact sous la forme a√b.`,
        a + b + c, m, { explanation: `√${s(a)} = ${a}√${m}, √${s(b)} = ${b}√${m}, √${s(c)} = ${c}√${m}. Périmètre : (${a} + ${b} + ${c})√${m} = ${a + b + c}√${m} cm.` }),
        triangleFigure({ shape: sh, sides: { AB: `√${s(a)}`, BC: `√${s(b)}`, CA: `√${s(c)}` } }))
    },
  ],
  [
    // Somme de quotients à dénominateurs conjugués.
    () => {
      let k = 0, d = 0, m = 0
      do { k = randInt(1, 6); d = pick([1, 2, 3, 4, 5, 6, -1, -2, -3]); m = k * k + d } while (m < 2 || isSquare(m))
      const sum = (d === 1 || d === 2) && sqrtParts(m)[0] === 1 && Math.random() < 0.35
      const e = `${F(1, `√${m} − ${k}`)} ${sum ? '+' : '−'} ${F(1, `√${m} + ${k}`)}`
      const common = `On réduit au même dénominateur : (√${m} − ${k})(√${m} + ${k}) = ${m} − ${k * k} = ${fmt(d)}.`
      return T('Les conjugués', sum
        ? radical(`Écris A = ${e} sous la forme a√b.`, 2 / d, m, {
          explanation: `${common} Numérateur : (√${m} + ${k}) + (√${m} − ${k}) = 2√${m}. A = 2√${m} ÷ ${d} = ${2 / d === 1 ? '' : 2 / d}√${m}.`,
        })
        : fraction(`Calcule exactement A = ${e}. (Entier ou fraction.)`, 2 * k, d, {
          explanation: `${common} Numérateur : (√${m} + ${k}) − (√${m} − ${k}) = ${2 * k}. A = ${2 * k} ÷ ${par(d)} = ${fracText(2 * k, d)}.`,
        }))
    },
    // Nombre de chiffres d'un produit 2^a × 5^b.
    () => {
      for (;;) {
        const [P, p] = pick([[2, 1], [4, 2], [8, 3], [16, 4]]), [Q, q] = pick([[5, 1], [25, 2], [125, 3]])
        const a = randInt(2, 8), b = randInt(2, 8)
        const e2 = p * a, e5 = q * b, diff = e2 - e5, mn = Math.min(e2, e5)
        if (diff > 9 || diff < -5 || mn < 3) continue
        const rest = diff >= 0 ? 2 ** diff : 5 ** -diff
        const digits = String(rest).length + mn
        const restTxt = diff === 0 ? '1' : diff > 0 ? `2^${diff}` : `5^${-diff}`
        return T('Combien de chiffres ?', numeric(
          `Combien de chiffres faut-il pour écrire en entier le nombre N = ${P}^${a} × ${Q}^${b} ?`, digits, {
            explanation: `N = 2^${e2} × 5^${e5} = ${restTxt} × (2 × 5)^${mn} = ${rest} × 10^${mn} : c'est ${rest} suivi de ${mn} zéros, soit ${digits} chiffres.`,
          }))
      }
    },
    // Plus longue tige dans une boîte (Pythagore dans l'espace).
    () => {
      let l = 0, w = 0, h = 0, k = 1, m = 1
      do {
        l = randInt(2, 12); w = randInt(1, 10); h = randInt(1, 10);
        [k, m] = sqrtParts(l * l + w * w + h * h)
      } while (!(k > 1 || m === 1) || (l === w && w === h))
      const [obj, rod] = pick([['un coffre', 'épée'], ['un carton', 'baguette'], ['un aquarium', 'tige'], ['une malle', 'canne']] as const)
      const p = `On veut ranger dans ${obj} en forme de pavé droit de ${l} dm × ${w} dm × ${h} dm la plus longue ${rod} possible, tendue d'un coin au coin opposé. Donne sa longueur exacte (en dm), sous forme d'entier ou de a√b simplifié.`
      const expl = `Diagonale du fond : d² = ${l}² + ${w}² = ${l * l + w * w}. Puis D² = d² + ${h}² = ${l * l + w * w + h * h}, donc D = ${m === 1 ? k : `${k}√${m}`} dm.`
      return T('Le grand rangement', m === 1 ? numeric(p, k, { explanation: expl }) : radical(p, k, m, { explanation: expl }))
    },
    // Deux tours de guet : distances, valeurs absolues et intersection.
    () => {
      for (;;) {
        const a = randInt(-8, 8), r = randInt(2, 8), b = a + randInt(2, 10) * pick([1, -1]), s = randInt(2, 8)
        const I1: Interval = { lo: a - r, hi: a + r, loClosed: true, hiClosed: true }
        const I2: Interval = { lo: b - s, hi: b + s, loClosed: false, hiClosed: false }
        const R = interInter(I1, I2)
        if (R.hi - R.lo < 1 || new Set([I1.lo, I1.hi, I2.lo, I2.hi]).size < 4) continue
        return T('Les tours de guet', interval(
          `Sur une route graduée en kilomètres, une tour de guet placée au point d'abscisse ${fmt(a)} surveille tous les points situés à ${r} km ou moins d'elle. Une seconde tour surveille les points d'abscisse x tels que |${xPlus(-b)}| < ${s}. Pour quelles abscisses x un convoi est-il vu par les deux tours ? (intervalle)`,
          R, { explanation: `Tour 1 : |${xPlus(-a)}| ≤ ${r}, soit x ∈ ${intervalText(I1)}. Tour 2 : x ∈ ${intervalText(I2)}. Intersection : ${intervalText(R)}.` }))
      }
    },
    // Distance d'une étoile en années-lumière.
    () => {
      const k = randInt(2, 60)
      let c = 9 * k, e = 12
      while (c >= 10) { c /= 10; e++ }
      c = r6(c)
      const obj = pick(['Une étoile', 'Une naine rouge', 'Une nébuleuse', 'Une étoile double', 'Une exoplanète'])
      return T('Lumière d’étoile', numeric(
        `La lumière parcourt environ 3 × 10^5 km par seconde, et une année dure environ 3 × 10^7 secondes. ${obj} est située à ${fmt(c)} × 10^${e} km de la Terre. Combien d'années sa lumière met-elle pour nous parvenir ?`,
        k, { explanation: `En un an, la lumière parcourt 3 × 10^5 × 3 × 10^7 = 9 × 10^12 km. ${fmt(c)} × 10^${e} ÷ (9 × 10^12) = ${k} ans.` }))
    },
  ],
]

// ═════════════════════════════════════════════════════════════════════════
// Calcul littéral
// ═════════════════════════════════════════════════════════════════════════

/** Rectangle entouré d'une bande de largeur x (allée, cadre…). */
function cadreFig(L: number, l: number, u: string): Figure {
  const e = Math.min(L, l) * 0.22
  const pts = hiddenPoints({
    o1: [-e, -e], o2: [L + e, -e], o3: [L + e, l + e], o4: [-e, l + e],
    i1: [0, 0], i2: [L, 0], i3: [L, l], i4: [0, l], xa: [L * 0.72, l], xb: [L * 0.72, l + e],
  })
  return {
    points: pts,
    polygons: [{ pts: ['o1', 'o2', 'o3', 'o4', 'o1', 'i1', 'i4', 'i3', 'i2', 'i1'], fill: FILL }],
    segments: [...rect('o1', 'o2', 'o3', 'o4'), ...rect('i1', 'i2', 'i3', 'i4'), { a: 'xa', b: 'xb', dashed: true }],
    notes: [
      noteAt(pts.i1, pts.i2, 0, -8, `${L} ${u}`), noteAt(pts.i1, pts.i4, sideDx(`${l} ${u}`), 4, `${l} ${u}`),
      noteAt(pts.xa, pts.xb, 10, 5, 'x'),
    ],
  }
}

const lit: Ladder = [
  [
    // Aire d'une allée autour d'un rectangle.
    () => {
      const ctx = pick([
        { obj: 'Un bassin rectangulaire', e: '', bord: 'd’une allée', u: 'm', L: [6, 15], l: [3, 9] },
        { obj: 'Une photo', e: 'e', bord: 'd’un cadre', u: 'cm', L: [12, 30], l: [8, 20] },
        { obj: 'Un potager rectangulaire', e: '', bord: 'd’une bordure de gravier', u: 'm', L: [5, 14], l: [3, 8] },
        { obj: 'Une arène de tournoi', e: 'e', bord: 'd’une piste', u: 'm', L: [20, 50], l: [10, 30] },
        { obj: 'Un tapis de jeu', e: '', bord: 'd’une bande de mousse', u: 'dm', L: [8, 20], l: [5, 12] },
      ])
      const L = randInt(ctx.L[0], ctx.L[1])
      const l = randInt(ctx.l[0], Math.min(ctx.l[1], L - 1))
      return T('L’allée', expression(
        `${ctx.obj} de ${L} ${ctx.u} sur ${l} ${ctx.u} est entouré${ctx.e} ${ctx.bord} de largeur x ${ctx.u} (zone colorée). Exprime l'aire de cette zone colorée en fonction de x, sous forme développée et réduite.`,
        poly([4, 'x²'], [2 * (L + l), 'x']), 'developed', {
          explanation: `Grand rectangle moins petit : (${L} + 2x)(${l} + 2x) − ${L} × ${l} = ${poly([4, 'x²'], [2 * (L + l), 'x'], [L * l, ''])} − ${L * l} = ${poly([4, 'x²'], [2 * (L + l), 'x'])}.`,
        }), cadreFig(L, l, ctx.u))
    },
    // Différence de deux carrés pour calculer de tête.
    () => {
      let A = 0, B = 0, expl = ''
      if (Math.random() < 0.6) {
        const N = pick([50, 100, 200, 500, 1000]), d = randInt(1, 9)
        A = N + d; B = N - d
        expl = `a² − b² = (a − b)(a + b) = ${2 * d} × ${big(2 * N)} = ${big(4 * N * d)}.`
      } else {
        const n = randInt(1000, 9999)
        A = n + 1; B = n
        expl = `a² − b² = (a − b)(a + b) = 1 × (${big(A)} + ${big(B)}) = ${big(2 * n + 1)}.`
      }
      return T('Calcul éclair', numeric(`Sans calculatrice, calcule ${big(A)}² − ${big(B)}².`, A * A - B * B, { explanation: expl }))
    },
    // Programme de calcul à exprimer.
    () => {
      const a = randInt(2, 9)
      const v = pick([
        { steps: [`Ajoute ${a}`, 'Élève le résultat au carré', 'Soustrais le carré du nombre de départ'], res: poly([2 * a, 'x'], [a * a, '']), why: `(${xPlus(a)})² − x² = x² + ${2 * a}x + ${a * a} − x²` },
        { steps: [`Multiplie le nombre augmenté de ${a} par le nombre diminué de ${a}`, `Ajoute ${a * a}`], res: 'x²', why: `(${xPlus(a)})(${xPlus(-a)}) + ${a * a} = x² − ${a * a} + ${a * a}` },
        { steps: [`Calcule le carré du nombre augmenté de ${a}`, `Soustrais le carré du nombre diminué de ${a}`], res: poly([4 * a, 'x']), why: `(${xPlus(a)})² − (${xPlus(-a)})² = (x² + ${2 * a}x + ${a * a}) − (x² − ${2 * a}x + ${a * a})` },
        { steps: [`Retranche ${a}`, 'Élève le résultat au carré', `Ajoute ${2 * a} fois le nombre de départ`], res: poly([1, 'x²'], [a * a, '']), why: `(${xPlus(-a)})² + ${2 * a}x = x² − ${2 * a}x + ${a * a} + ${2 * a}x` },
      ])
      return T('Le programme mystère', expression(
        `Voici un programme de calcul : « Choisis un nombre x. ${v.steps.join('. ')}. » Exprime le résultat en fonction de x, sous forme développée et réduite.`,
        v.res, 'developed', { explanation: `${v.why} = ${v.res}.` }))
    },
    // Plaque rectangulaire dont on retire un carré.
    () => {
      const a = randInt(1, 6), b = randInt(1, 6)
      const X = 3, W = 2 * X + a, H = X + b
      const pts = hiddenPoints({ A: [0, 0], B: [W, 0], C: [W, H], D: [0, H], P: [0, X], Q: [X, X], R: [X, 0] })
      const obj = pick(['plaque de métal', 'nappe', 'planche', 'feuille de carton'])
      const res = poly([1, 'x²'], [2 * b + a, 'x'], [a * b, ''])
      return T('La découpe', expression(
        `Dans une ${obj} rectangulaire de (${xPlus(a, 2)}) cm sur (${xPlus(b)}) cm, on découpe un carré de côté x cm dans un coin. Exprime l'aire de la partie restante en fonction de x, sous forme développée et réduite.`,
        res, 'developed', { explanation: `(${xPlus(a, 2)})(${xPlus(b)}) − x² = ${poly([2, 'x²'], [2 * b + a, 'x'], [a * b, ''])} − x² = ${res}.` }), {
        points: pts,
        polygons: [{ pts: ['R', 'B', 'C', 'D', 'P', 'Q'], fill: FILL }],
        segments: [{ a: 'R', b: 'B' }, { a: 'B', b: 'C' }, { a: 'C', b: 'D' }, { a: 'D', b: 'P' }, { a: 'P', b: 'Q' }, { a: 'Q', b: 'R' }, { a: 'P', b: 'A', dashed: true }, { a: 'A', b: 'R', dashed: true }],
        notes: [
          noteAt(pts.D, pts.C, 0, -8, `${xPlus(a, 2)}`), noteAt(pts.B, pts.C, sideDx(xPlus(b)), 4, `${xPlus(b)}`),
          noteAt(pts.P, pts.Q, 0, -6, 'x'), noteAt(pts.A, pts.R, 0, 15, 'x'),
        ],
      })
    },
    // Carrés et produits astucieux.
    () => {
      const N = pick([20, 30, 40, 50, 60, 70, 80, 90, 100, 200, 1000]), d = randInt(1, N >= 100 ? 9 : 4)
      const kind = pick(['plus', 'moins', 'prod'])
      if (kind === 'prod') {
        return T('Calcul astucieux', numeric(`Sans calculatrice, calcule ${N - d} × ${N + d}.`, N * N - d * d, {
          explanation: `(${N} − ${d})(${N} + ${d}) = ${N}² − ${d}² = ${big(N * N)} − ${d * d} = ${big(N * N - d * d)}.`,
        }))
      }
      const s = kind === 'plus' ? 1 : -1, A = N + s * d
      return T('Calcul astucieux', numeric(`Sans calculatrice, calcule ${big(A)}².`, A * A, {
        explanation: `(${N} ${s > 0 ? '+' : '−'} ${d})² = ${big(N * N)} ${s > 0 ? '+' : '−'} ${2 * N * d} + ${d * d} = ${big(A * A)}.`,
      }))
    },
  ],
  [
    // Agrandir ou réduire un carré : différence de carrés factorisée.
    () => {
      const a = randInt(2, 9), grow = Math.random() < 0.6
      const [obj, u] = pick([['potager', 'm'], ['champ', 'm'], ['enclos', 'm'], ['tapis', 'dm'], ['carreau', 'cm']] as const)
      const res = `${a}(${xPlus(grow ? a : -a, 2)})`
      return T('Le carré qui change', expression(
        `Un ${obj} carré a un côté de x ${u}. On ${grow ? 'allonge' : 'raccourcit'} chacun de ses côtés de ${a} ${u}. De combien son aire ${grow ? 'augmente' : 'diminue'}-t-elle ? Donne la réponse en fonction de x, sous forme factorisée.`,
        res, 'factored', {
          explanation: grow
            ? `(${xPlus(a)})² − x² = (x + ${a} − x)(x + ${a} + x) = ${res}.`
            : `x² − (${xPlus(-a)})² = (x − x + ${a})(x + x − ${a}) = ${res}.`,
        }))
    },
    // Programme de calcul qui donne toujours un carré.
    () => {
      const a = randInt(1, 9)
      const v = pick([
        { steps: `Multiplie-le par le nombre qui le dépasse de ${2 * a}. Ajoute ${a * a}`, c: a, dev: `x(${xPlus(2 * a)}) + ${a * a} = ${poly([1, 'x²'], [2 * a, 'x'], [a * a, ''])}` },
        { steps: `Multiplie-le par le nombre qui vaut ${2 * a} de moins que lui. Ajoute ${a * a}`, c: -a, dev: `x(${xPlus(-2 * a)}) + ${a * a} = ${poly([1, 'x²'], [-2 * a, 'x'], [a * a, ''])}` },
        { steps: `Calcule le produit du nombre augmenté de ${a} par le nombre augmenté de ${3 * a}. Ajoute ${a * a}`, c: 2 * a, dev: `(${xPlus(a)})(${xPlus(3 * a)}) + ${a * a} = ${poly([1, 'x²'], [4 * a, 'x'], [4 * a * a, ''])}` },
      ])
      const who = prenom()
      return T('Toujours un carré', expression(
        `${who} affirme : « Choisis un nombre x. ${v.steps}. Tu obtiens toujours le carré d'un nombre ! » Écris le résultat sous la forme d'un carré (…)².`,
        `(${xPlus(v.c)})²`, 'factored', { inputHint: 'ex. (x + 4)²', explanation: `${v.dev} = (${xPlus(v.c)})² : identité remarquable.` }))
    },
    // Carré contre rectangle : la différence ne dépend pas de x.
    () => {
      const a = randInt(0, 5), b = randInt(2, 9)
      const side = a === 0 ? 'x' : `(${xPlus(a)})`
      const [obj, u] = pick([['champ', 'm'], ['jardin', 'm'], ['tapis', 'dm'], ['plateau', 'cm']] as const)
      return T('Le voisin rusé', numeric(
        `Un ${obj} carré a pour côté ${side} ${u}. Son voisin est un ${obj} rectangulaire de longueur (${xPlus(a + b)}) ${u} et de largeur (${xPlus(a - b)}) ${u}. Quelle que soit la valeur de x, de combien l'aire du carré dépasse-t-elle celle du rectangle (en ${u}²) ?`,
        b * b, { explanation: `Avec A = ${a === 0 ? 'x' : xPlus(a)} : (A + ${b})(A − ${b}) = A² − ${b * b}. Le carré a donc toujours ${b * b} ${u}² de plus.` }))
    },
    // Jardin traversé par deux allées perpendiculaires.
    () => {
      const L = randInt(10, 30), l = randInt(6, L - 2)
      const e = l * 0.14, vx = L * 0.6, hy = l * 0.38
      const pts = hiddenPoints({
        A: [0, 0], B: [L, 0], C: [L, l], D: [0, l],
        v1: [vx, 0], v2: [vx + e, 0], v3: [vx + e, l], v4: [vx, l],
        h1: [0, hy], h2: [L, hy], h3: [L, hy + e], h4: [0, hy + e],
        a1: [vx, hy], a2: [vx + e, hy], a3: [vx + e, hy + e], a4: [vx, hy + e],
      })
      const res = poly([1, 'x²'], [-(L + l), 'x'], [L * l, ''])
      return T('Les allées en croix', expression(
        `Un jardin rectangulaire de ${L} m sur ${l} m est traversé par deux allées perpendiculaires de largeur x m, parallèles à ses côtés (voir la figure). Exprime l'aire de la pelouse (en vert) en fonction de x, sous forme développée et réduite.`,
        res, 'developed', { explanation: `En « collant » les quatre morceaux de pelouse, on obtient un rectangle de (${L} − x) sur (${l} − x) : (${L} − x)(${l} − x) = ${res}.` }), {
        points: pts,
        polygons: [
          { pts: ['A', 'v1', 'a1', 'h1'], fill: GREEN }, { pts: ['v2', 'B', 'h2', 'a2'], fill: GREEN },
          { pts: ['h4', 'a4', 'v4', 'D'], fill: GREEN }, { pts: ['a3', 'h3', 'C', 'v3'], fill: GREEN },
        ],
        segments: [...rect('A', 'B', 'C', 'D'), { a: 'v1', b: 'v4' }, { a: 'v2', b: 'v3' }, { a: 'h1', b: 'h2' }, { a: 'h4', b: 'h3' }],
        notes: [
          noteAt(pts.A, pts.B, 0, 15, `${L} m`), noteAt(pts.A, pts.D, -sideDx(`${l} m`), 4, `${l} m`),
          noteAt(pts.v4, pts.v3, 0, -6, 'x'), noteAt(pts.h2, pts.h3, 9, 5, 'x'),
        ],
      })
    },
    // Hypoténuse au carré en fonction de x.
    () => {
      const a = randInt(1, 8)
      let b = randNonZero(-5, 8)
      while (b === a) b = randNonZero(-5, 8)
      const res = poly([2, 'x²'], [2 * (a + b), 'x'], [a * a + b * b, ''])
      const cond = b < 0 ? ` (avec x > ${-b})` : ''
      const angA = (Math.atan((5 + b) / (5 + a)) * 180) / Math.PI
      return T('L’hypoténuse', expression(
        `ABC est un triangle rectangle en B avec AB = ${xPlus(a)} et BC = ${xPlus(b)}, en cm${cond}. Exprime AC² en fonction de x, sous forme développée et réduite.`,
        res, 'developed', {
          explanation: `Pythagore : AC² = (${xPlus(a)})² + (${xPlus(b)})² = (${poly([1, 'x²'], [2 * a, 'x'], [a * a, ''])}) + (${poly([1, 'x²'], [2 * b, 'x'], [b * b, ''])}) = ${res}.`,
        }), triangleFigure({ right: 'B', shape: [angA, 90], sides: { AB: xPlus(a), BC: xPlus(b), CA: '?' } }))
    },
  ],
  [
    // Volume d'une boîte obtenue par pliage.
    () => {
      const square = Math.random() < 0.5
      const a = square ? 2 * randInt(6, 15) : 2 * randInt(6, 15)
      let b = square ? a : 2 * randInt(4, 12)
      if (!square && b === a) b = a - 4
      const res = poly([4, 'x³'], [-2 * (a + b), 'x²'], [a * b, 'x'])
      const dim = square ? `carrée de ${a} cm de côté` : `de ${a} cm sur ${b} cm`
      return T('La boîte pliée', expression(
        `Dans une feuille de carton ${dim}, on découpe un carré de côté x cm à chaque coin, puis on relève les bords pour former une boîte sans couvercle. Exprime le volume de la boîte en fonction de x, sous forme développée et réduite.`,
        res, 'developed', {
          inputHint: 'ex. 4x³ − 20x² + 24x (ou x^3)',
          explanation: square
            ? `V = x(${poly([a, ''], [-2, 'x'])})² = x(${poly([4, 'x²'], [-4 * a, 'x'], [a * a, ''])}) = ${res}.`
            : `V = x(${poly([a, ''], [-2, 'x'])})(${poly([b, ''], [-2, 'x'])}) = x(${poly([4, 'x²'], [-2 * (a + b), 'x'], [a * b, ''])}) = ${res}.`,
        }))
    },
    // Carré évidé : factoriser une différence de carrés.
    () => {
      const v2 = Math.random() < 0.5
      const a = randInt(2, 9), b = randInt(1, a - 1)
      const big1 = v2 ? xPlus(a, 2) : xPlus(a), small = v2 ? xPlus(b) : `${b}`
      const res = v2 ? `(${xPlus(a - b)})(${xPlus(a + b, 3)})` : `(${xPlus(a - b)})(${xPlus(a + b)})`
      const S = v2 ? 6 + a : 3 + a, s = v2 ? 3 + b : b
      const o = (S - s) / 2
      const pts = hiddenPoints({ A: [0, 0], B: [S, 0], C: [S, S], D: [0, S], E: [o, o], G: [o + s, o], H: [o + s, o + s], K: [o, o + s] })
      return T('Le bassin', expression(
        v2
          ? `Un carré de côté (${big1}) m contient un carré de côté (${small}) m. Exprime l'aire de la partie colorée en fonction de x, sous forme factorisée (produit de deux facteurs du premier degré).`
          : `Dans une dalle carrée de côté (${big1}) m, on creuse un bassin carré de côté ${small} m. Exprime l'aire de la partie restante (colorée) en fonction de x, sous forme factorisée.`,
        res, 'factored', {
          explanation: `A² − B² = (A − B)(A + B) avec A = ${big1} et B = ${small} : (${big1} − ${v2 ? `(${small})` : small})(${big1} + ${small}) = ${res}.`,
        }), {
        points: pts,
        polygons: [{ pts: ['A', 'B', 'C', 'D', 'A', 'E', 'K', 'H', 'G', 'E'], fill: FILL }],
        segments: [...rect('A', 'B', 'C', 'D'), ...rect('E', 'G', 'H', 'K')],
        notes: [noteAt(pts.A, pts.B, 0, 15, big1), noteAt(pts.K, pts.H, 0, -6, small)],
      })
    },
    // Facteur commun déguisé : un carré et un rectangle accolés ou retirés.
    () => {
      const p = pick([2, 3]), a = randInt(1, 9)
      let b = randInt(1, 9)
      const sum = Math.random() < 0.5
      while (!sum && b === a) b = randInt(1, 9)
      const A = xPlus(a, p)
      const res = sum ? `(${A})(${xPlus(a + b, p + 1)})` : `(${A})(${xPlus(a - b, p - 1)})`
      return T('Le facteur caché', expression(
        sum
          ? `Un enclos est formé d'un carré de côté (${A}) m et d'un rectangle accolé de côtés (${A}) m et (${xPlus(b)}) m. Exprime l'aire totale de l'enclos en fonction de x, sous forme factorisée.`
          : `Dans un carré de côté (${A}) m, on retire une bande rectangulaire de côtés (${A}) m et (${xPlus(b)}) m. Exprime l'aire restante en fonction de x, sous forme factorisée.`,
        res, 'factored', {
          explanation: `(${A})² ${sum ? '+' : '−'} (${A})(${xPlus(b)}) = (${A})[(${A}) ${sum ? '+' : '−'} (${xPlus(b)})] = ${res}.`,
        }))
    },
    // Compléter pour obtenir un carré parfait.
    () => {
      const p = randInt(1, 5), q = randInt(1, 9)
      const P = poly([p * p, 'x²'])
      const v = pick(['k+', 'k-', 'c'])
      if (v === 'c') {
        return T('Le carré parfait', numeric(
          `Quelle valeur faut-il donner à c pour que ${poly([p * p, 'x²'], [2 * p * q, 'x'])} + c soit le carré d'une expression du premier degré ?`, q * q, {
            explanation: `(${xPlus(q, p)})² = ${poly([p * p, 'x²'], [2 * p * q, 'x'], [q * q, ''])} (car 2 × ${p === 1 ? 'x' : `${p}x`} × ${q} = ${2 * p * q}x), donc c = ${q * q}.`,
          }))
      }
      const s = v === 'k+' ? '+' : '−'
      return T('Le carré parfait', numeric(
        `Pour quelle valeur positive de k l'expression ${P} ${s} kx + ${q * q} est-elle le carré d'une expression du premier degré ?`, 2 * p * q, {
          explanation: `${P} = (${p === 1 ? 'x' : `${p}x`})² et ${q * q} = ${q}², donc on veut (${xPlus(v === 'k+' ? q : -q, p)})², dont le terme en x vaut ${s} 2 × ${p === 1 ? 'x' : `${p}x`} × ${q} : k = ${2 * p * q}.`,
        }))
    },
    // Grands nombres : poser x pour voir l'identité.
    () => {
      const n = randInt(1000, 99999), d = randInt(1, 9)
      const v = pick([0, 1, 2])
      const [txt, val, why] = v === 0
        ? [`${big(n)}² − ${big(n - d)} × ${big(n + d)}`, d * d, `x² − (${xPlus(-d)})(${xPlus(d)}) = x² − (x² − ${d * d}) = ${d * d}`]
        : v === 1
          ? [`${big(n - d)} × ${big(n + d)} − ${big(n)}²`, -d * d, `(${xPlus(-d)})(${xPlus(d)}) − x² = −${d * d}`]
          : [`${big(n)} × ${big(n + 2 * d)} − ${big(n + d)}²`, -d * d, `x(${xPlus(2 * d)}) − (${xPlus(d)})² = x² + ${2 * d}x − x² − ${2 * d}x − ${d * d} = −${d * d}`]
      return T('Le calcul impossible', numeric(`Sans calculatrice, calcule : ${txt}.`, val, {
        explanation: `On pose x = ${big(n)} : ${why}.`,
      }))
    },
  ],
]

// ═════════════════════════════════════════════════════════════════════════
// Équations & inéquations
// ═════════════════════════════════════════════════════════════════════════
const eq: Ladder = [
  [
    // Problème d'âges.
    () => {
      const [A, B] = deuxPrenoms()
      for (;;) {
        const M = randInt(25, 60), f = randInt(2, 20), v = pick(['double', 'triple', 'passé'])
        if (v === 'double') {
          const t = M - 2 * f
          if (t < 1 || t > 25) continue
          return T('Question d’âge', numeric(`${A} a ${M} ans et ${B} a ${f} ans. Dans combien d'années l'âge de ${A} sera-t-il le double de celui de ${B} ?`, t, {
            explanation: `${M} + t = 2(${f} + t) ⟺ ${M} + t = ${2 * f} + 2t ⟺ t = ${M} − ${2 * f} = ${t}.`,
          }))
        }
        if (v === 'triple') {
          const t2 = M - 3 * f
          if (t2 < 2 || t2 % 2 || t2 / 2 > 20) continue
          return T('Question d’âge', numeric(`${A} a ${M} ans et ${B} a ${f} ans. Dans combien d'années l'âge de ${A} sera-t-il le triple de celui de ${B} ?`, t2 / 2, {
            explanation: `${M} + t = 3(${f} + t) ⟺ ${M} + t = ${3 * f} + 3t ⟺ 2t = ${t2} ⟺ t = ${t2 / 2}.`,
          }))
        }
        const t2 = 3 * f - M
        if (t2 < 2 || t2 % 2 || t2 / 2 >= f) continue
        return T('Question d’âge', numeric(`${A} a ${M} ans et ${B} a ${f} ans. Il y a combien d'années l'âge de ${A} était-il le triple de celui de ${B} ?`, t2 / 2, {
          explanation: `${M} − t = 3(${f} − t) ⟺ ${M} − t = ${3 * f} − 3t ⟺ 2t = ${t2} ⟺ t = ${t2 / 2}.`,
        }))
      }
    },
    // Recette d'une billetterie (une seule inconnue).
    () => {
      const ctx = pick([
        { intro: (p1: number, p2: number) => `Au musée, une entrée adulte coûte ${p1} € et une entrée enfant ${p2} €.`, sold: (N: number, R: number) => `Un dimanche, ${N} entrées ont été vendues pour ${R} €.`, q: 'Combien d’entrées enfant ont été vendues ?', u: '€', p1: [8, 15], p2: [3, 7] },
        { intro: (p1: number, p2: number) => `Au tournoi de chevalerie, une place en tribune coûte ${p1} écus et une place debout ${p2} écus.`, sold: (N: number, R: number) => `${N} places ont rapporté ${R} écus.`, q: 'Combien de places debout ont été vendues ?', u: 'écus', p1: [6, 12], p2: [2, 5] },
        { intro: (p1: number, p2: number) => `Une bourse contient des pièces d'or valant ${p1} écus et des pièces d'argent valant ${p2} écus.`, sold: (N: number, R: number) => `Il y a ${N} pièces en tout, pour une valeur de ${R} écus.`, q: 'Combien y a-t-il de pièces d’argent ?', u: 'écus', p1: [5, 10], p2: [1, 3] },
        { intro: (p1: number, p2: number) => `Pour un concert, le plein tarif est à ${p1} € et le tarif réduit à ${p2} €.`, sold: (N: number, R: number) => `${N} billets ont été vendus pour une recette de ${R} €.`, q: 'Combien de billets au tarif réduit ont été vendus ?', u: '€', p1: [18, 35], p2: [8, 15] },
      ])
      const p1 = randInt(ctx.p1[0], ctx.p1[1]), p2 = randInt(ctx.p2[0], Math.min(ctx.p2[1], p1 - 1))
      const N = randInt(4, 20) * 10, x = randInt(5, N - 5), R = p1 * (N - x) + p2 * x
      return T('La recette', numeric(`${ctx.intro(p1, p2)} ${ctx.sold(N, R)} ${ctx.q}`, x, {
        explanation: `Avec x l'inconnue : ${p1}(${N} − x) + ${tm(p2, 'x')} = ${R} ⟺ ${p1 * N} − ${tm(p1 - p2, 'x')} = ${R} ⟺ x = ${p1 * N - R} ÷ ${p1 - p2} = ${x}.`,
      }))
    },
    // Charge maximale : inéquation et plus grand entier.
    () => {
      const ctx = pick([
        { veh: 'Une charrette', pers: 'Le cocher', item: 'sacs de blé', M: [600, 1000], p: [60, 90], c: [25, 50] },
        { veh: 'Un ascenseur', pers: 'Un livreur', item: 'cartons', M: [400, 630], p: [60, 95], c: [12, 30] },
        { veh: 'Une barque', pers: 'Le passeur', item: 'tonneaux', M: [300, 500], p: [55, 85], c: [20, 40] },
        { veh: 'Un monte-charge', pers: 'Une ouvrière', item: 'parpaings', M: [500, 900], p: [50, 80], c: [15, 25] },
      ])
      for (;;) {
        const M = randInt(ctx.M[0] / 10, ctx.M[1] / 10) * 10, p = randInt(ctx.p[0], ctx.p[1]), c = randInt(ctx.c[0], ctx.c[1])
        if ((M - p) % c === 0) continue
        const n = Math.floor((M - p) / c)
        return T('Charge maximale', numeric(`${ctx.veh} peut transporter au plus ${M} kg. ${ctx.pers}, qui pèse ${p} kg, y charge des ${ctx.item} de ${c} kg chacun. Combien de ${ctx.item} au maximum peut-on embarquer ?`, n, {
          explanation: `${p} + ${c}n ≤ ${M} ⟺ n ≤ ${M - p} ÷ ${c} ≈ ${fmt(Math.floor(((M - p) / c) * 100) / 100)}. Le plus grand entier possible est ${n}.`,
        }))
      }
    },
    // Note minimale à obtenir.
    () => {
      for (;;) {
        const k = randInt(2, 4), notes = Array.from({ length: k }, () => randInt(6, 19)), c = pick([2, 2, 3]), m = pick([10, 12, 14, 15])
        const S = notes.reduce((s, v) => s + v, 0)
        const x = r6((m * (k + c) - S) / c)
        if (x <= 2 || x > 20 || !isClean(x, 2)) continue
        const who = prenom()
        return T('Le dernier contrôle', numeric(
          `${who} a obtenu ${notes.join(' ; ')} (coefficient 1 chacune). Le dernier contrôle compte coefficient ${c}. Quelle note minimale lui faut-il à ce contrôle pour avoir au moins ${m} de moyenne ?`,
          x, { explanation: `(${S} + ${c}x) ÷ ${k + c} ≥ ${m} ⟺ ${S} + ${c}x ≥ ${m * (k + c)} ⟺ x ≥ ${m * (k + c) - S} ÷ ${c} = ${fmt(x)}.` }))
      }
    },
    // Partage d'un trésor : fractions de l'inconnue.
    () => {
      const [p, q] = pick([[2, 3], [3, 4], [2, 5], [3, 5], [4, 5], [4, 6], [2, 6], [5, 10], [3, 8], [4, 8], [2, 8]])
      const L = lcm(p, q), x = randInt(2, 15) * L, R = x - x / p - x / q
      const ctx = pick([
        `Un pirate partage un trésor : ${F(1, p)} des pièces pour l'aîné, ${F(1, q)} pour le cadet, et il reste ${R} pièces pour la benjamine. Combien de pièces le trésor contenait-il ?`,
        `On utilise ${F(1, p)} de l'eau d'une citerne pour arroser et ${F(1, q)} pour les animaux ; il reste ${R} L. Combien de litres la citerne contenait-elle ?`,
        `Un marchand vend ${F(1, p)} de ses pommes le matin et ${F(1, q)} l'après-midi ; il lui en reste ${R}. Combien de pommes avait-il ?`,
      ])
      return T('Le partage', numeric(ctx, x, {
        explanation: `x − ${F('x', p)} − ${F('x', q)} = ${R} ⟺ ${Fr(L - L / p - L / q, L)}x = ${R} ⟺ x = ${R} × ${Fr(L, L - L / p - L / q)} = ${x}.`,
      }))
    },
  ],
  [
    // Fraction du reste.
    () => {
      const p = randInt(2, 5), q = randInt(2, 5), k = randInt(1, 12), x = k * p * q, R = k * (p - 1) * (q - 1)
      const ctx = pick([
        { s: `Le premier jour, une randonneuse parcourt ${F(1, p)} de son trajet. Le deuxième jour, elle parcourt ${F(1, q)} de ce qui reste. Il lui reste alors ${R} km.`, q: 'Quelle est la longueur totale du trajet (en km) ?' },
        { s: `${prenom()} lit ${F(1, p)} d'un roman le samedi, puis ${F(1, q)} des pages restantes le dimanche. Il reste ${R} pages à lire.`, q: 'Combien de pages compte le roman ?' },
        { s: `Un chevalier dépense ${F(1, p)} de sa bourse à la forge, puis ${F(1, q)} de ce qui lui reste à l'auberge. Il lui reste ${R} écus.`, q: 'Combien d’écus avait-il au départ ?' },
      ])
      return T('Ce qui reste', numeric(`${ctx.s} ${ctx.q}`, x, {
        explanation: `Après le 1er temps, il reste ${F(p - 1, p)} x ; après le 2e, ${F(q - 1, q)} de ce reste : ${Fr((p - 1) * (q - 1), p * q)}x = ${R}, donc x = ${x}.`,
      }))
    },
    // (x ± a)² = s² : racine positive.
    () => {
      const s = randInt(4, 15), a = randInt(1, s - 2), grow = Math.random() < 0.6, disc = Math.random() < 0.3
      const x = grow ? s - a : s + a
      const p = disc
        ? `Si l'on ${grow ? 'augmente' : 'diminue'} de ${a} cm le rayon d'un disque, son aire devient ${s * s}π cm². Quel est le rayon du disque de départ (en cm) ?`
        : `Si l'on ${grow ? 'augmente' : 'diminue'} de ${a} cm le côté d'un carré, on obtient un carré d'aire ${s * s} cm². Quel est le côté du carré de départ (en cm) ?`
      return T('Retour au départ', numeric(p, x, {
        explanation: `${disc ? `π(${xPlus(grow ? a : -a)})² = ${s * s}π ⟺ ` : ''}(${xPlus(grow ? a : -a)})² = ${s * s}. Une longueur est positive, donc ${xPlus(grow ? a : -a)} = ${s} et x = ${x}.`,
      }))
    },
    // Rattrapage.
    () => {
      const ctx = pick([
        { A: 'à pied', B: 'à cheval', v1: [4, 6], g: [6, 8, 10, 12, 14] },
        { A: 'en courant', B: 'à vélo', v1: [8, 12], g: [4, 6, 8, 10, 12] },
        { A: 'à vélo', B: 'en scooter', v1: [12, 20], g: [6, 10, 15, 20] },
        { A: 'en barque', B: 'en voilier', v1: [3, 6], g: [2, 3, 4, 6] },
      ])
      const [A, B] = deuxPrenoms()
      const DUR: Record<string, string> = { '0.25': 'Un quart d’heure', '0.5': 'Une demi-heure', '1': 'Une heure', '1.5': 'Une heure et demie', '2': 'Deux heures' }
      for (;;) {
        const v1 = randInt(ctx.v1[0], ctx.v1[1]), g = pick(ctx.g), d = pick([0.25, 0.5, 1, 1.5, 2])
        const v2 = v1 + g, t = r6((v1 * d) / g)
        if (!isClean(t * 4, 0) || t > 5 || t < 0.25) continue
        const askDist = Math.random() < 0.4
        const base = `${A} part ${ctx.A} à ${v1} km/h. ${DUR[String(d)]} plus tard, ${B} part du même endroit, par la même route, ${ctx.B} à ${v2} km/h.`
        const expl = `Avec t le temps (en h) depuis le départ de ${B} : ${v2}t = ${v1}(t + ${fmt(d)}) ⟺ ${g}t = ${fmt(v1 * d)} ⟺ t = ${fmt(t)} h`
        return T('La poursuite', askDist
          ? numeric(`${base} À quelle distance du point de départ (en km) le rattrapage a-t-il lieu ?`, r6(v2 * t), { explanation: `${expl}, soit ${v2} × ${fmt(t)} = ${fmt(r6(v2 * t))} km.` })
          : numeric(`${base} Au bout de combien d'heures, comptées depuis le départ de ${B}, le rattrapage a-t-il lieu ?`, t, { explanation: `${expl}.` }))
      }
    },
    // Périmètre encadré : double inéquation.
    () => {
      const a = randInt(1, 8)
      const shape = pick([
        { desc: `d'un rectangle de longueur (${xPlus(a, 2)}) m et de largeur x m`, k: 6, c: 2 * a, P: `2(${xPlus(a, 2)} + x) = ${xPlus(2 * a, 6)}` },
        { desc: `d'un triangle isocèle de base (${xPlus(a)}) m dont les deux autres côtés mesurent 2x m`, k: 5, c: a, P: `${xPlus(a)} + 2x + 2x = ${xPlus(a, 5)}` },
        { desc: `d'un trapèze dont les côtés mesurent x, x, 2x et (${xPlus(a)}) m`, k: 5, c: a, P: `x + x + 2x + ${xPlus(a)} = ${xPlus(a, 5)}` },
      ])
      const x1 = randInt(2, 8), x2 = x1 + randInt(2, 10), loC = Math.random() < 0.5, hiC = Math.random() < 0.5
      const P1 = shape.k * x1 + shape.c, P2 = shape.k * x2 + shape.c
      const R: Interval = { lo: x1, hi: x2, loClosed: loC, hiClosed: hiC }
      return T('La clôture', interval(
        `Un enclos a la forme ${shape.desc}. Pour respecter le budget de clôture, son périmètre doit être ${loC ? 'd’au moins' : 'strictement supérieur à'} ${P1} m et ${hiC ? 'd’au plus' : 'strictement inférieur à'} ${P2} m. À quel intervalle x doit-il appartenir ?`,
        R, { explanation: `Périmètre : ${shape.P}. ${P1} ${loC ? '≤' : '<'} ${xPlus(shape.c, shape.k)} ${hiC ? '≤' : '<'} ${P2} ⟺ ${P1 - shape.c} ${loC ? '≤' : '<'} ${shape.k}x ${hiC ? '≤' : '<'} ${P2 - shape.c} ⟺ x ∈ ${intervalText(R)}.` }))
    },
    // Thalès pour poser une équation.
    () => {
      for (;;) {
        const x = randInt(2, 12), a = randInt(2, 12), s = pick([0.5, 1, 1.5, 2, 2.5, 3])
        const m = r6(x * s), n = r6((x + a) * s)
        if (!isClean(m, 1) || !isClean(n, 1) || n > 40 || m < 2) continue
        const ratio = Math.min(0.7, Math.max(0.3, x / (x + a)))
        return T('Thalès à l’envers', numeric(
          `Sur la figure, les droites (MN) et (BC) sont parallèles. On donne MB = ${a} cm, MN = ${fmt(m)} cm et BC = ${fmt(n)} cm. Calcule AM = x (en cm).`,
          x, { explanation: `Thalès : ${F('AM', 'AB')} = ${F('MN', 'BC')}, soit ${F('x', `x + ${a}`)} = ${F(fmt(m), fmt(n))}. Produit en croix : ${fmt(n)}x = ${fmt(m)}x + ${fmt(r6(m * a))}, donc ${tm(n - m, 'x')} = ${fmt(r6(m * a))} et x = ${x}.` }),
          thalesFigure({ ratio, labels: { AM: 'x', MB: `${a}`, MN: fmt(m), BC: fmt(n) } }))
      }
    },
  ],
  [
    // A² = B² : équation produit.
    () => {
      for (;;) {
        const k = pick([2, 3]), a = randNonZero(-9, 9), b = randNonZero(-9, 9)
        const s1 = r6((a + b) / (k - 1)), s2 = r6((b - a) / (k + 1))
        if (!isClean(s1, 2) || !isClean(s2, 2) || s1 === s2) continue
        return T('Carrés égaux', solutionSet(`Trouve tous les réels x tels que (${xPlus(a)})² = (${xPlus(-b, k)})².`, [s1, s2], {
          explanation: `A² = B² ⟺ (A − B)(A + B) = 0 ⟺ A = B ou A = −B. ${xPlus(a)} = ${xPlus(-b, k)} donne x = ${fmt(s1)} ; ${xPlus(a)} = ${poly([-k, 'x'], [b, ''])} donne x = ${fmt(s2)}.`,
        }))
      }
    },
    // L'aire est multipliée par K quand on agrandit le côté.
    () => {
      for (;;) {
        const [K, k] = pick([[4, 2], [9, 3], [16, 4], [2.25, 1.5], [6.25, 2.5]])
        const a = randInt(1, 12), grow = Math.random() < 0.6
        const x = r6(grow ? a / (k - 1) : (a * k) / (k - 1))
        if (!isClean(x, 2)) continue
        return T('L’aire démultipliée', numeric(grow
          ? `Quand on augmente de ${a} cm le côté d'un carré, son aire est multipliée par ${fmt(K)}. Quel est le côté du carré de départ (en cm) ?`
          : `Quand on diminue de ${a} cm le côté d'un carré, son aire est divisée par ${fmt(K)}. Quel est le côté du carré de départ (en cm) ?`,
        x, {
          explanation: grow
            ? `(${xPlus(a)})² = ${fmt(K)}x². Les longueurs sont positives, donc ${xPlus(a)} = ${fmt(k)}x, d'où ${tm(k - 1, 'x')} = ${a} et x = ${fmt(x)}.`
            : `(${xPlus(-a)})² = ${F('x²', fmt(K))}. Les longueurs sont positives, donc ${xPlus(-a)} = ${F('x', fmt(k))}, d'où ${fmt(k)}x − ${fmt(a * k)} = x et x = ${fmt(x)}.`,
        }))
      }
    },
    // Mélange de deux concentrations.
    () => {
      const ctx = pick([
        { s: (V: number, r: number, p: number, q: number) => `On veut obtenir ${V} L d'une boisson à ${r} % de jus de fruits en mélangeant une boisson à ${p} % et une autre à ${q} %.`, q: (p: number) => `Quel volume de la boisson à ${p} % faut-il utiliser (en L) ?`, u: 'L' },
        { s: (V: number, r: number, p: number, q: number) => `Un orfèvre veut fondre ${V} g d'un alliage à ${r} % d'or à partir d'un alliage à ${p} % d'or et d'un autre à ${q} %.`, q: (p: number) => `Quelle masse de l'alliage à ${p} % doit-il utiliser (en g) ?`, u: 'g' },
        { s: (V: number, r: number, p: number, q: number) => `Un alchimiste prépare ${V} L de saumure à ${r} % de sel avec une saumure à ${p} % et une autre à ${q} %.`, q: (p: number) => `Quel volume de la saumure à ${p} % doit-il verser (en L) ?`, u: 'L' },
      ])
      for (;;) {
        const V = pick([10, 20, 30, 40, 50, 60, 100]), q = randInt(1, 6) * 5, p = q + randInt(2, 10) * 5, r = randInt(q / 5 + 1, p / 5 - 1) * 5
        const x = r6((V * (r - q)) / (p - q))
        if (!isClean(x, 1)) continue
        return T('Le mélange', numeric(`${ctx.s(V, r, p, q)} ${ctx.q(p)}`, x, {
          explanation: `Avec x la quantité à ${p} % : ${fmt(p / 100)}x + ${fmt(q / 100)}(${V} − x) = ${fmt(r / 100)} × ${V} ⟺ ${fmt((p - q) / 100)}x = ${fmt(((r - q) * V) / 100)} ⟺ x = ${fmt(x)} ${ctx.u}.`,
        }))
      }
    },
    // Travail en commun : équation avec inverses.
    () => {
      const trio = Math.random() < 0.25
      const ctx = pick([
        { who: ['Un premier robinet', 'un second', 'un troisième'], task: 'remplit une citerne', q: 'En combien d’heures la remplissent-ils s’ils coulent ensemble ?' },
        { who: ['Un premier maçon', 'un deuxième', 'un troisième'], task: 'construit le mur d’enceinte', q: 'En combien d’heures le construisent-ils en travaillant ensemble ?' },
        { who: ['Une première imprimante', 'une deuxième', 'une troisième'], task: 'imprime toutes les affiches du festival', q: 'En combien d’heures les impriment-elles en fonctionnant ensemble ?' },
      ])
      const set = trio ? pick([[2, 3, 6], [4, 6, 12], [3, 6, 6], [6, 10, 15], [4, 12, 6], [10, 15, 30], [3, 4, 12]])
        : pick([[3, 6], [4, 12], [6, 12], [10, 15], [4, 6], [12, 24], [2, 3], [5, 20], [8, 24], [2, 6], [6, 30], [10, 40], [20, 30], [3, 12], [12, 36]])
      const den = set.reduce((p, v) => lcm(p, v), 1), num = set.reduce((s, v) => s + den / v, 0), t = r6(den / num)
      const parts = set.map((v, i) => `${i === 0 ? ctx.who[0] : ctx.who[i]} en ${v} h`)
      return T('Ensemble, c’est plus rapide', numeric(
        `${parts[0].replace(' en', ` ${ctx.task} en`)}, ${parts.slice(1).join(', ')}. ${ctx.q}`, t, {
          explanation: `En 1 h, on fait ${set.map((v) => F(1, v)).join(' + ')} = ${fracText(num, den)} du travail. Il faut donc t = 1 ÷ ${fracText(num, den)} = ${fmt(t)} h.`,
        }))
    },
    // Rectangle et carré de même aire.
    () => {
      for (;;) {
        const a = randInt(1, 12), b = randInt(1, 12), c = randInt(1, 12)
        const den = a + b - 2 * c
        if (den === 0 || a === b) continue
        const x = r6((c * c - a * b) / den)
        if (x <= 0 || x > 40 || !isClean(x, 1)) continue
        return T('Même aire', numeric(
          `Un rectangle a pour dimensions (${xPlus(a)}) m et (${xPlus(b)}) m ; un carré a pour côté (${xPlus(c)}) m. Pour quelle valeur de x ont-ils la même aire ?`, x, {
            explanation: `${poly([1, 'x²'], [a + b, 'x'], [a * b, ''])} = ${poly([1, 'x²'], [2 * c, 'x'], [c * c, ''])} ⟺ ${poly([den, 'x'])} = ${fmt(c * c - a * b)}${den === 1 ? '' : ` ⟺ x = ${fmt(x)}`}.`,
          }))
      }
    },
  ],
]

// ═════════════════════════════════════════════════════════════════════════
// Fonctions
// ═════════════════════════════════════════════════════════════════════════
const fct: Ladder = [
  [
    // Tarif affine déterminé par deux relevés.
    () => {
      const ctx = pick([
        { s: 'Le prix d’une course de taxi est une fonction affine de la distance.', ph: (d: number) => `une course de ${d} km`, p: [2, 6], c: [1, 1.2, 1.5, 1.6, 2], d: [2, 30] },
        { s: 'Le prix de location d’un vélo est une fonction affine de la durée.', ph: (d: number) => `une location de ${d} h`, p: [2, 5], c: [1.5, 2, 2.5, 3], d: [1, 10] },
        { s: 'Le tarif d’un plombier est une fonction affine du temps passé.', ph: (d: number) => `une intervention de ${d} h`, p: [30, 60], c: [35, 40, 45, 50], d: [1, 8] },
        { s: 'Le prix d’envoi d’un colis est une fonction affine de sa masse.', ph: (d: number) => `l’envoi d’un colis de ${d} kg`, p: [3, 8], c: [0.5, 0.8, 1.2, 1.5], d: [1, 20] },
      ])
      const p = randInt(ctx.p[0] * 2, ctx.p[1] * 2) / 2, c = pick(ctx.c)
      const ds = new Set<number>()
      while (ds.size < 3) ds.add(randInt(ctx.d[0], ctx.d[1]))
      const [d1, d2, d3] = [...ds]
      const P = (d: number) => r6(p + c * d)
      return T('Le tarif caché', numeric(
        `${ctx.s} ${ctx.ph(d1)[0].toUpperCase()}${ctx.ph(d1).slice(1)} coûte ${fmt(P(d1))} € et ${ctx.ph(d2)} coûte ${fmt(P(d2))} €. Combien coûte ${ctx.ph(d3)} (en €) ?`,
        P(d3), { explanation: `Coefficient : (${fmt(P(d2))} − ${fmt(P(d1))}) ÷ (${d2} − ${d1}) = ${fmt(c)}. Partie fixe : ${fmt(P(d1))} − ${fmt(c)} × ${d1} = ${fmt(p)}. Prix : ${fmt(p)} + ${fmt(c)} × ${d3} = ${fmt(P(d3))} €.` }))
    },
    // Chute libre : fonction carré.
    () => {
      const k = pick([1, 1.5, 2, 2.5, 3, 3.5, 4, 5, 6]), H = r6(5 * k * k)
      const obj = pick(['d’une tour', 'd’une falaise', 'd’un pont', 'du donjon', 'd’une montgolfière immobile'])
      const ask = Math.random() < 0.5
      const h = randInt(2, 30)
      return T('La chute', ask
        ? numeric(`On lâche une pierre du haut ${obj} de ${fmt(H)} m. La distance parcourue (en m) au bout de t secondes est d(t) = 5t². Au bout de combien de secondes la pierre touche-t-elle le sol ?`, k, {
          explanation: `5t² = ${fmt(H)} ⟺ t² = ${fmt(r6(k * k))} ; t > 0, donc t = ${fmt(k)} s.`,
        })
        : numeric(`On lâche une pierre du haut ${obj} de ${fmt(r6(H + h))} m. La distance parcourue (en m) au bout de t secondes est d(t) = 5t². Au bout de combien de secondes est-elle à ${h} m du sol ?`, k, {
          explanation: `Elle a alors parcouru ${fmt(r6(H + h))} − ${h} = ${fmt(H)} m : 5t² = ${fmt(H)} ⟺ t² = ${fmt(r6(k * k))} ; t > 0, donc t = ${fmt(k)} s.`,
        }))
    },
    // Grandeurs inversement proportionnelles.
    () => {
      for (;;) {
        if (Math.random() < 0.5) {
          const v1 = randInt(3, 12) * 10, t1 = pick([1, 1.5, 2, 2.5, 3, 4]), v2 = randInt(3, 13) * 10
          const t2 = r6((v1 * t1) / v2)
          if (v1 === v2 || !isClean(t2, 2)) continue
          return T('Plus vite !', numeric(`À ${v1} km/h, un car met ${fmt(t1)} h pour faire un trajet. La durée est t(v) = ${F('D', 'v')}, où D est la distance. Combien d'heures faut-il pour faire le même trajet à ${v2} km/h ?`, t2, {
            explanation: `D = ${v1} × ${fmt(t1)} = ${fmt(v1 * t1)} km, puis t = ${fmt(v1 * t1)} ÷ ${v2} = ${fmt(t2)} h.`,
          }))
        }
        const n1 = randInt(2, 12), j1 = randInt(2, 15), n2 = randInt(2, 15), j2 = r6((n1 * j1) / n2)
        if (n1 === n2 || !isClean(j2, 1)) continue
        const job = pick(['construisent un rempart', 'moissonnent un champ', 'repeignent le château', 'creusent un canal'])
        return T('Plus on est…', numeric(`${n1} ouvriers ${job} en ${j1} jours. En combien de jours ${n2} ouvriers, travaillant au même rythme, feraient-ils le même travail ?`, j2, {
          explanation: `Le travail vaut ${n1} × ${j1} = ${n1 * j1} « jours-ouvrier ». Avec ${n2} ouvriers : ${n1 * j1} ÷ ${n2} = ${fmt(j2)} jours.`,
        }))
      }
    },
    // Seuil de rentabilité.
    () => {
      const ctx = pick([
        { who: 'Un food-truck', sg: 'crêpe', pl: 'crêpes', c: [1, 2], pv: [3, 5], F: [20, 60] },
        { who: 'Un atelier de poterie', sg: 'bol', pl: 'bols', c: [3, 6], pv: [9, 15], F: [30, 90] },
        { who: 'Le forgeron', sg: 'épée', pl: 'épées', c: [10, 20], pv: [25, 45], F: [20, 60] },
        { who: 'Un studio de jeux vidéo', sg: 'jeu', pl: 'jeux', c: [2, 5], pv: [12, 20], F: [100, 300] },
      ])
      const c = randInt(ctx.c[0], ctx.c[1]), pv = randInt(Math.max(ctx.pv[0], c + 1), ctx.pv[1]), Fx = randInt(ctx.F[0], ctx.F[1]) * 10
      const n = Math.floor(Fx / (pv - c)) + 1
      return T('Rentable ?', numeric(
        `${ctx.who} a ${big(Fx)} € de frais fixes par mois. Chaque ${ctx.sg} coûte ${c} € à fabriquer et est vendu${ctx.sg === 'crêpe' || ctx.sg === 'épée' ? 'e' : ''} ${pv} €. À partir de combien de ${ctx.pl} vendu${ctx.sg === 'crêpe' || ctx.sg === 'épée' ? 'e' : ''}s dans le mois le bénéfice est-il strictement positif ?`,
        n, { explanation: `B(n) = ${pv}n − (${Fx} + ${c}n) = ${tm(pv - c, 'n')} − ${Fx} > 0 ⟺ n > ${Fx} ÷ ${pv - c} ≈ ${fmt(Math.floor((Fx / (pv - c)) * 100) / 100)}. Le premier entier qui convient est ${n}.` }))
    },
    // Deux bougies : égalité de deux fonctions affines.
    () => {
      for (;;) {
        const t = pick([1, 1.5, 2, 2.5, 3, 4, 5]), v2 = randInt(1, 4), v1 = v2 + randInt(1, 4)
        const h2 = randInt(Math.ceil(v2 * t) + 2, 30), h1 = r6(h2 + (v1 - v2) * t)
        if (!isClean(h1, 1) || h1 > 45 || h1 - v1 * t <= 0) continue
        const ctx = pick([
          [`Une bougie de ${fmt(h1)} cm diminue de ${v1} cm par heure ; une autre, de ${h2} cm, diminue de ${v2} cm par heure. On les allume en même temps.`, 'Au bout de combien d’heures auront-elles la même hauteur ?'],
          [`Une citerne contient ${fmt(h1)} hL et perd ${v1} hL par jour ; une autre contient ${h2} hL et perd ${v2} hL par jour.`, 'Au bout de combien de jours contiendront-elles la même quantité ?'],
        ])
        return T('Même hauteur', numeric(`${ctx[0]} ${ctx[1]}`, t, {
          explanation: `${fmt(h1)} − ${v1}t = ${h2} − ${v2}t ⟺ ${tm(v1 - v2, 't')} = ${fmt(r6(h1 - h2))} ⟺ t = ${fmt(t)}.`,
        }))
      }
    },
  ],
  [
    // Comparer deux offres : inéquation, intervalle.
    () => {
      const ctx = pick([
        { s: 'Location d’une voiture pour une journée', unit: 'km', per: 'par km', q: 'distances x (en km, x ≥ 0)' },
        { s: 'Abonnement d’électricité', unit: 'kWh', per: 'par kWh', q: 'consommations x (en kWh, x ≥ 0)' },
        { s: 'Location d’un bateau', unit: 'h', per: 'par heure', q: 'durées x (en heures, x ≥ 0)' },
      ])
      for (;;) {
        const q = pick([0.1, 0.15, 0.2, 0.25, 0.3, 0.5, 1, 1.5, 2]), d = pick([0.05, 0.1, 0.15, 0.2, 0.25, 0.5, 1])
        const p = r6(q + d), x0 = randInt(2, 40) * (d < 0.5 ? 10 : 2), a = randInt(10, 60), b = r6(a + x0 * d)
        if (!isClean(b, 2) || b > 400) continue
        const target = pick(['A', 'B', 'A≤'])
        const R: Interval = target === 'B' ? { lo: x0, hi: Infinity, loClosed: false, hiClosed: false } : { lo: 0, hi: x0, loClosed: true, hiClosed: target === 'A≤' }
        return T('Le bon plan', interval(
          `${ctx.s} : offre A, ${a} € plus ${fmt(p)} € ${ctx.per} ; offre B, ${fmt(b)} € plus ${fmt(q)} € ${ctx.per}. Pour quelles ${ctx.q} l'offre ${target === 'B' ? 'B est-elle strictement moins chère que A' : target === 'A' ? 'A est-elle strictement moins chère que B' : 'A est-elle moins chère que B ou au même prix'} ? Réponds par un intervalle.`,
          R, { explanation: `A(x) = ${poly([p, 'x'], [a, ''])} et B(x) = ${poly([q, 'x'], [b, ''])}. A(x) = B(x) ⟺ ${tm(d, 'x')} = ${fmt(r6(b - a))} ⟺ x = ${x0}. Avant ${x0}, A est moins chère ; après, c'est B. Réponse : ${intervalText(R)}.` }))
      }
    },
    // Modèle affine à partir de deux mesures, puis zéro.
    () => {
      const ctx = pick([
        { s: 'La hauteur d’une bougie diminue de façon affine avec le temps.', m: (t: number, h: number) => `au bout de ${t} h, elle mesure ${fmt(h)} cm`, q0: 'Quelle était sa hauteur au moment de l’allumage (en cm) ?', qz: 'Au bout de combien d’heures sera-t-elle entièrement consumée ?', u: 'cm', tu: 'h', v: [0.5, 1, 1.5, 2], max: 40 },
        { s: 'Le volume d’eau d’un réservoir qui se vide diminue de façon affine avec le temps.', m: (t: number, h: number) => `après ${t} min, il reste ${fmt(h)} L`, q0: 'Combien de litres contenait-il au départ ?', qz: 'Au bout de combien de minutes sera-t-il vide ?', u: 'L', tu: 'min', v: [2, 2.5, 4, 5, 8, 10], max: 400 },
        { s: 'La charge d’une batterie (en %) diminue de façon affine avec le temps d’utilisation.', m: (t: number, h: number) => `après ${t} h, elle affiche ${fmt(h)} %`, q0: 'Quelle était sa charge au départ (en %) ?', qz: 'Au bout de combien d’heures sera-t-elle vide ?', u: '%', tu: 'h', v: [4, 5, 8, 10, 12.5], max: 100 },
      ])
      const v = pick(ctx.v), T0 = randInt(6, Math.min(30, Math.floor(ctx.max / v))), h0 = r6(v * T0)
      const t1 = randInt(1, Math.floor(T0 / 2)), t2 = t1 + randInt(1, Math.floor(T0 / 2) - 1 || 1)
      const H = (t: number) => r6(h0 - v * t)
      const askZero = Math.random() < 0.6
      const m1 = ctx.m(t1, H(t1))
      return T('Le compte à rebours', numeric(
        `${ctx.s} ${m1[0].toUpperCase()}${m1.slice(1)} ; ${ctx.m(t2, H(t2))}. ${askZero ? ctx.qz : ctx.q0}`, askZero ? T0 : h0, {
          explanation: `Coefficient : (${fmt(H(t2))} − ${fmt(H(t1))}) ÷ (${t2} − ${t1}) = ${fmt(-v)}. Valeur initiale : ${fmt(H(t1))} + ${fmt(v)} × ${t1} = ${fmt(h0)} ${ctx.u}.${askZero ? ` Puis ${fmt(h0)} − ${tm(v, 't')} = 0 ⟺ t = ${T0} ${ctx.tu}.` : ''}`,
        }))
    },
    // Fonction inverse : encadrement d'une durée.
    () => {
      for (;;) {
        const D = pick([12, 15, 18, 20, 24, 30, 36, 40, 45, 60, 90, 120]), v1 = pick([4, 5, 6, 8, 10, 12, 15, 16, 20, 24, 25]), v2 = pick([5, 6, 8, 10, 12, 15, 20, 24, 25, 30, 40])
        if (v2 <= v1 || !isClean(D / v1, 2) || !isClean(D / v2, 2)) continue
        const c1 = Math.random() < 0.5, c2 = Math.random() < 0.5
        const R: Interval = { lo: r6(D / v2), hi: r6(D / v1), loClosed: c2, hiClosed: c1 }
        const who = prenom()
        const s = (b: boolean) => (b ? '≤' : '<')
        return T('Le temps de parcours', interval(
          `${who} doit parcourir ${D} km. Sa vitesse moyenne v (en km/h) vérifie ${v1} ${s(c1)} v ${s(c2)} ${v2}. À quel intervalle appartient la durée du trajet t = ${F(D, 'v')} (en heures) ?`,
          R, { explanation: `La fonction v ↦ ${F(D, 'v')} est décroissante pour v > 0 : les inégalités changent de sens. ${fmt(R.lo)} ${s(c2)} t ${s(c1)} ${fmt(R.hi)}.` }))
      }
    },
    // Remise, taxe, commission : écrire la fonction affine.
    () => {
      const v = pick(['remise', 'taxe', 'commission'])
      if (v === 'remise') {
        const r = pick([10, 15, 20, 25, 30, 40]), c = randInt(3, 12)
        return T('La facture', expression(`Une boutique en ligne applique une remise de ${r} % sur le prix affiché x (en €), puis ajoute ${c} € de frais de livraison. Exprime le prix payé f(x) en fonction de x.`,
          poly([cmul(-r), 'x'], [c, '']), 'any', { inputHint: 'ex. 0,8x + 5', explanation: `Remise de ${r} % : on multiplie par ${fmt(cmul(-r))} ; puis + ${c}. f(x) = ${poly([cmul(-r), 'x'], [c, ''])}.` }))
      }
      if (v === 'taxe') {
        const t = pick([5, 10, 20]), c = randInt(2, 15)
        return T('La facture', expression(`Un magasin ajoute une taxe de ${t} % au prix hors taxe x (en €), puis retire un bon de réduction de ${c} €. Exprime le prix payé f(x) en fonction de x.`,
          poly([cmul(t), 'x'], [-c, '']), 'any', { inputHint: 'ex. 1,2x − 5', explanation: `Hausse de ${t} % : on multiplie par ${fmt(cmul(t))} ; puis − ${c}. f(x) = ${poly([cmul(t), 'x'], [-c, ''])}.` }))
      }
      const S = randInt(12, 20) * 100, r = pick([2, 3, 4, 5, 8, 10])
      return T('Le salaire', expression(`Un vendeur touche un fixe de ${big(S)} € par mois, plus ${r} % du montant x (en €) de ses ventes. Exprime son salaire mensuel s(x) en fonction de x.`,
        poly([r / 100, 'x'], [S, '']), 'any', { inputHint: 'ex. 0,05x + 1500', explanation: `${r} % de x = ${fmt(r / 100)}x. s(x) = ${poly([r / 100, 'x'], [S, ''])}.` }))
    },
    // Aire d'un trapèze en fonction de x.
    () => {
      const L = randInt(5, 14), l = 2 * randInt(2, 6), left = Math.random() < 0.5
      const res = left ? poly([l / 2, 'x'], [(L * l) / 2, '']) : poly([-l / 2, 'x'], [L * l, ''])
      const x0 = L * 0.38
      const pts = fitPoints({ A: [0, 0], B: [L, 0], C: [L, l], D: [0, l], M: [x0, 0] }, undefined, undefined, 46)
      pts.M = { ...pts.M, pos: 's' }
      const quad = left ? 'AMCD' : 'MBCD'
      return T('L’aire qui glisse', expression(
        `ABCD est un rectangle avec AB = ${L} cm et AD = ${l} cm. M est un point de [AB] et on note AM = x (en cm). Exprime l'aire du quadrilatère ${quad} (zone colorée) en fonction de x.`,
        res, 'any', {
          inputHint: 'ex. 3x + 12',
          explanation: left
            ? `${quad} est un trapèze de bases AM = x et DC = ${L}, de hauteur ${l} : ${F(`(x + ${L}) × ${l}`, 2)} = ${res}.`
            : `${quad} est un trapèze de bases MB = ${L} − x et DC = ${L}, de hauteur ${l} : ${F(`(${L} − x + ${L}) × ${l}`, 2)} = ${res}.`,
        }), {
        points: pts,
        polygons: [{ pts: left ? ['A', 'M', 'C', 'D'] : ['M', 'B', 'C', 'D'], fill: FILL }],
        segments: [
          { a: 'A', b: 'B' }, { a: 'B', b: 'C' }, { a: 'C', b: 'D', label: `${L} cm` }, { a: 'D', b: 'A' },
          { a: left ? 'M' : 'D', b: left ? 'C' : 'M' }, { a: 'A', b: 'M', label: 'x', color: 'transparent' },
        ],
        notes: [noteAt(pts.B, pts.C, sideDx(`${l} cm`), 4, `${l} cm`)],
      })
    },
  ],
  [
    // Minimum grâce à la forme canonique.
    () => {
      const k = pick([1, 1, 2]), a = randInt(1, 9), m0 = randInt(1, 40), c = m0 + k * a * a
      const ctx = pick([
        { s: (e: string) => `Le coût de fabrication (en centaines d'euros) de x tonnes de farine est C(x) = ${e}, pour x ≥ 0.`, qv: 'Quel est le coût minimal (en centaines d’euros) ?', qx: 'Pour quelle quantité x (en tonnes) ce coût est-il minimal ?', f: 'C' },
        { s: (e: string) => `La consommation (en L pour 100 km) d'un véhicule roulant à x dizaines de km/h est modélisée par f(x) = ${e}.`, qv: 'Quelle est la consommation minimale ?', qx: 'Pour quelle valeur de x est-elle minimale ?', f: 'f' },
        { s: (e: string) => `Dans un jeu vidéo, l'énergie dépensée par un dragon qui vole à l'altitude x est E(x) = ${e}.`, qv: 'Quelle est l’énergie minimale ?', qx: 'À quelle altitude x est-elle minimale ?', f: 'E' },
      ])
      const e = poly([k, 'x²'], [-2 * k * a, 'x'], [c, ''])
      const askX = Math.random() < 0.3
      return T('Le minimum', numeric(`${ctx.s(e)} ${askX ? ctx.qx : ctx.qv}`, askX ? a : m0, {
        explanation: `${ctx.f}(x) = ${k === 1 ? '' : k}(${xPlus(-a)})² + ${m0} (on développe pour vérifier). Un carré est positif ou nul, donc ${ctx.f}(x) ≥ ${m0}, avec égalité pour x = ${a}.`,
      }))
    },
    // Aire maximale d'un enclos.
    () => {
      const n = randInt(3, 30), P = 4 * n, wall = Math.random() < 0.5
      return T('Le plus grand enclos', wall
        ? numeric(`Avec ${P} m de clôture, on veut fermer un enclos rectangulaire adossé à un long mur (le mur forme un côté, sans clôture). Quelle est l'aire maximale possible (en m²) ?`, 2 * n * n, {
          explanation: `Côtés perpendiculaires au mur : x ; côté parallèle : ${P} − 2x. A(x) = x(${P} − 2x) = ${2 * n * n} − 2(${xPlus(-n)})² ≤ ${2 * n * n}, maximum pour x = ${n}.`,
        })
        : numeric(`Avec ${P} m de clôture, on veut fermer un enclos rectangulaire. Quelle est l'aire maximale possible (en m²) ?`, n * n, {
          explanation: `Largeur x, longueur ${2 * n} − x. A(x) = x(${2 * n} − x) = ${n * n} − (${xPlus(-n)})² ≤ ${n * n}, maximum pour x = ${n} (un carré).`,
        }))
    },
    // Fonction carré sur un intervalle.
    () => {
      const cl = () => Math.random() < 0.5
      const kind = Math.random() < 0.65 ? 0 : pick([1, -1])
      let lo = 0, hi = 0
      if (kind === 0) { do { lo = -randInt(1, 9); hi = randInt(1, 9) } while (-lo === hi) }
      else { const u = randInt(1, 7), w = u + randInt(1, 5); [lo, hi] = kind > 0 ? [u, w] : [-w, -u] }
      const I: Interval = { lo, hi, loClosed: cl(), hiClosed: cl() }
      let R: Interval
      if (kind === 0) {
        const fromLo = -lo > hi
        R = { lo: 0, hi: fromLo ? lo * lo : hi * hi, loClosed: true, hiClosed: fromLo ? I.loClosed : I.hiClosed }
      } else if (kind > 0) R = { lo: lo * lo, hi: hi * hi, loClosed: I.loClosed, hiClosed: I.hiClosed }
      else R = { lo: hi * hi, hi: lo * lo, loClosed: I.hiClosed, hiClosed: I.loClosed }
      return T('Le carré piégé', interval(`On sait que x ∈ ${intervalText(I)}. À quel intervalle appartient x² ?`, R, {
        explanation: kind === 0
          ? `L'intervalle contient 0 : x² prend la valeur 0, et sa plus grande valeur vient de l'extrémité la plus éloignée de 0, ${fmt(-lo > hi ? lo : hi)}. Donc x² ∈ ${intervalText(R)}.`
          : `La fonction carré est ${kind > 0 ? 'croissante sur [0 ; +∞[' : 'décroissante sur ]−∞ ; 0]'} : x² ∈ ${intervalText(R)}.`,
      }))
    },
    // Trois formules : quand la formule B est-elle la meilleure ?
    () => {
      const q = pick([2, 3, 4, 5, 6, 8]), d = randInt(2, 5), x1 = randInt(2, 10), x2 = x1 + randInt(2, 10)
      const p = q + d, a = d * x1, Fx = a + q * x2
      const ctx = pick([
        { s: 'Pour louer un kayak', u: 'de l’heure', x: 'durées x (en heures)' },
        { s: 'Pour une place de parking', u: 'de l’heure', x: 'durées x (en heures)' },
        { s: 'Pour une console en location', u: 'par jour', x: 'durées x (en jours, x réel)' },
      ])
      const R: Interval = { lo: x1, hi: x2, loClosed: false, hiClosed: false }
      return T('Trois formules', interval(
        `${ctx.s}, trois formules : A, ${p} € ${ctx.u} ; B, ${a} € puis ${q} € ${ctx.u} ; C, un forfait de ${Fx} € quelle que soit la durée. Pour quelles ${ctx.x} la formule B est-elle strictement la moins chère des trois ? Réponds par un intervalle.`,
        R, { explanation: `B < A ⟺ ${a} + ${q}x < ${p}x ⟺ x > ${x1}. B < C ⟺ ${a} + ${q}x < ${Fx} ⟺ x < ${x2}. Donc x ∈ ${intervalText(R)}.` }))
    },
    // Trajectoire parabolique : retour à la hauteur de départ ou sommet.
    () => {
      const v = pick([6, 8, 10, 12, 14, 15, 16, 20]), h0 = pick([1, 1.5, 2, 2.5])
      const obj = pick(['Une balle', 'Une flèche', 'Un ballon de basket', 'Une boule de neige', 'Un caillou'])
      const e = poly([-5, 't²'], [v, 't'], [h0, ''])
      const askMax = Math.random() < 0.45
      const tr = r6(v / 5), hm = r6(h0 + (v * v) / 20)
      return T('La trajectoire', askMax
        ? numeric(`${obj} est lancé${obj.startsWith('Un ') ? '' : 'e'} vers le haut ; sa hauteur (en m) après t secondes est h(t) = ${e}. Quelle hauteur maximale atteint-${obj.startsWith('Un ') ? 'il' : 'elle'} (en m) ?`, hm, {
          explanation: `h(t) = ${fmt(h0)} ⟺ t(${v} − 5t) = 0 ⟺ t = 0 ou t = ${fmt(tr)}. Par symétrie de la parabole, le sommet est au milieu, t = ${fmt(tr / 2)} : h(${fmt(tr / 2)}) = ${fmt(hm)} m.`,
        })
        : numeric(`${obj} est lancé${obj.startsWith('Un ') ? '' : 'e'} vers le haut ; sa hauteur (en m) après t secondes est h(t) = ${e}. À quel instant t > 0 repasse-t-${obj.startsWith('Un ') ? 'il' : 'elle'} à sa hauteur de départ ?`, tr, {
          explanation: `h(t) = ${fmt(h0)} ⟺ −5t² + ${v}t = 0 ⟺ t(${v} − 5t) = 0 ⟺ t = 0 ou t = ${fmt(tr)} s.`,
        }))
    },
  ],
]

// ═════════════════════════════════════════════════════════════════════════
// Vecteurs & repérage
// ═════════════════════════════════════════════════════════════════════════
const P6 = () => [randInt(-6, 6), randInt(-6, 6)] as const
const notAligned = (a: readonly number[], b: readonly number[], c: readonly number[]) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]) !== 0

const vect: Ladder = [
  [
    // Parallélogramme de centre connu.
    () => {
      let A = P6(), B = P6(), D = P6()
      while (!notAligned(A, B, D)) { A = P6(); B = P6(); D = P6() }
      const I = [(B[0] + D[0]) / 2, (B[1] + D[1]) / 2]
      const C = [A[0] + D[0] - B[0], A[1] + D[1] - B[1]]
      const askVec = Math.random() < 0.5
      return T('Le centre du parallélogramme', askVec
        ? pair(`ABCD est un parallélogramme de centre I. On donne A${pt(A[0], A[1])}, B${pt(B[0], B[1])} et I${pt(I[0], I[1])}. Donne les coordonnées du vecteur BC⃗.`, C[0] - B[0], C[1] - B[1], {
          explanation: `Les diagonales se coupent en leur milieu : I est le milieu de [AC], donc C = (2 × ${par(I[0])} − ${par(A[0])} ; 2 × ${par(I[1])} − ${par(A[1])}) = ${pt(C[0], C[1])}. Puis BC⃗${pt(C[0] - B[0], C[1] - B[1])}.`,
        })
        : pair(`ABCD est un parallélogramme de centre I. On donne A${pt(A[0], A[1])}, B${pt(B[0], B[1])} et I${pt(I[0], I[1])}. Donne les coordonnées de D.`, D[0], D[1], {
          explanation: `Les diagonales se coupent en leur milieu : I est le milieu de [BD], donc D = (2 × ${par(I[0])} − ${par(B[0])} ; 2 × ${par(I[1])} − ${par(B[1])}) = ${pt(D[0], D[1])}.`,
        }))
    },
    // Symétrique puis translation.
    () => {
      const A = P6(), M = P6(), u = [randNonZero(-5, 5), randNonZero(-5, 5)]
      const B = [2 * M[0] - A[0], 2 * M[1] - A[1]], C = [B[0] + u[0], B[1] + u[1]]
      return T('Saut et glissade', pair(
        `B est le symétrique de A${pt(A[0], A[1])} par rapport à M${pt(M[0], M[1])}, puis C est l'image de B par la translation de vecteur u⃗${pt(u[0], u[1])}. Donne les coordonnées de C.`,
        C[0], C[1], { explanation: `M est le milieu de [AB] : B = 2M − A = ${pt(B[0], B[1])}. Puis C = B + u⃗ = ${pt(C[0], C[1])}.` }))
    },
    // Droite des milieux.
    () => {
      let A = P6(), B = P6(), C = P6()
      while (!notAligned(A, B, C)) { A = P6(); B = P6(); C = P6() }
      const I = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2], J = [(A[0] + C[0]) / 2, (A[1] + C[1]) / 2]
      return T('La droite des milieux', pair(
        `Dans un triangle ABC, I est le milieu de [AB] et J celui de [AC]. On donne B${pt(B[0], B[1])}, I${pt(I[0], I[1])} et J${pt(J[0], J[1])}. Donne les coordonnées de C.`,
        C[0], C[1], { explanation: `A = 2I − B = ${pt(A[0], A[1])}, puis C = 2J − A = ${pt(C[0], C[1])}. (Ou directement : BC⃗ = 2IJ⃗.)` }))
    },
    // Périmètre d'un triangle dans un repère.
    () => {
      for (;;) {
        const A = [randInt(-4, 4), randInt(-4, 4)], u = tripleVec(13, true), v = tripleVec(13, true)
        const B = [A[0] + u[0], A[1] + u[1]], C = [A[0] + v[0], A[1] + v[1]]
        const bc2 = (C[0] - B[0]) ** 2 + (C[1] - B[1]) ** 2, bc = Math.round(Math.sqrt(bc2))
        if (bc * bc !== bc2 || !notAligned(A, B, C) || [...B, ...C].some((c) => Math.abs(c) > 9)) continue
        const [k1, k2, k3] = [u[2], bc, v[2]]
        return T('Le tour du triangle', numeric(
          `Dans un repère orthonormé (unité : 1 km), A${pt(A[0], A[1])}, B${pt(B[0], B[1])} et C${pt(C[0], C[1])}. Calcule le périmètre du triangle ABC (en km).`,
          k1 + k2 + k3, { explanation: `AB⃗${pt(u[0], u[1])} donc AB = √${u[2] * u[2]} = ${k1} ; BC⃗${pt(C[0] - B[0], C[1] - B[1])} donc BC = √${bc2} = ${k2} ; AC⃗${pt(v[0], v[1])} donc CA = √${v[2] * v[2]} = ${k3}. Périmètre : ${k1 + k2 + k3} km.` }),
          repere({ A: [A[0], A[1]], B: [B[0], B[1]], C: [C[0], C[1]] }, [{ a: 'A', b: 'B' }, { a: 'B', b: 'C' }, { a: 'C', b: 'A' }]))
      }
    },
    // Navigation : somme de vecteurs puis distance.
    () => {
      const [tx, ty, r] = tripleVec(17)
      const u = [randNonZero(-6, 6), randNonZero(-6, 6)], v = [randNonZero(-6, 6), randNonZero(-6, 6)]
      const w = [tx - u[0] - v[0], ty - u[1] - v[1]]
      const P = P6()
      if (w[0] === 0 || w[1] === 0) return vect[0][4]()
      return T('Le navigateur', numeric(
        `Un navire quitte le port P${pt(P[0], P[1])}. Il se déplace successivement selon les vecteurs u⃗${pt(u[0], u[1])}, v⃗${pt(v[0], v[1])} puis w⃗${pt(w[0], w[1])} (repère orthonormé, unité : 1 km). À quelle distance du port se trouve-t-il alors (en km) ?`,
        r, { explanation: `Déplacement total : u⃗ + v⃗ + w⃗ = ${pt(tx, ty)}. Distance : √(${par(tx)}² + ${par(ty)}²) = √${r * r} = ${r} km.` }))
    },
  ],
  [
    // Point défini par une combinaison de vecteurs.
    () => {
      let A = P6(), B = P6(), C = P6()
      while (!notAligned(A, B, C)) { A = P6(); B = P6(); C = P6() }
      let al = pick([2, 3, -1, -2]), be = pick([1, -1, 2, -2, 3])
      if (al === be) { al = 2; be = -1 }
      const M = [A[0] + al * (B[0] - A[0]) + be * (C[0] - A[0]), A[1] + al * (B[1] - A[1]) + be * (C[1] - A[1])]
      return T('Le point visé', pair(
        `On donne A${pt(A[0], A[1])}, B${pt(B[0], B[1])} et C${pt(C[0], C[1])}. Le point M est défini par AM⃗ = ${coefOf(al, 'AB⃗', true)}${coefOf(be, 'AC⃗', false)}. Donne les coordonnées de M.`,
        M[0], M[1], { explanation: `AB⃗${pt(B[0] - A[0], B[1] - A[1])}, AC⃗${pt(C[0] - A[0], C[1] - A[1])}, donc AM⃗${pt(M[0] - A[0], M[1] - A[1])} et M = A + AM⃗ = ${pt(M[0], M[1])}.` }))
    },
    // Où la flèche touche-t-elle le sol ? (colinéarité)
    () => {
      for (;;) {
        const xa = randInt(-3, 3), ya = randInt(4, 10), dx = randInt(1, 5), dy = -randInt(1, 3)
        if (ya + dy <= 0) continue
        const r = r6(xa + (dx * ya) / -dy)
        if (!isClean(r, 2)) continue
        const B = [xa + dx, ya + dy]
        return T('La flèche', numeric(
          `Un archer tire depuis A${pt(xa, ya)}. Sa flèche suit une ligne droite qui passe par B${pt(B[0], B[1])}. En quel point de l'axe des abscisses (le sol) se plante-t-elle ? Donne son abscisse.`,
          r, { explanation: `Le point C(x ; 0) est aligné avec A et B : AB⃗${pt(dx, dy)} et AC⃗(x − ${par(xa)} ; ${fmt(-ya)}) sont colinéaires, donc ${dx} × ${par(-ya)} − ${par(dy)} × (x − ${par(xa)}) = 0, soit x = ${fmt(r)}.` }))
      }
    },
    // Aire d'un triangle rectangle dans un repère.
    () => {
      const B = P6(), p = randInt(-4, 4), q = randNonZero(-4, 4), k = pick([1, 2, 3]) * pick([1, -1])
      const A = [B[0] + p, B[1] + q], C = [B[0] - k * q, B[1] + k * p]
      const n2 = p * p + q * q, area = r6((Math.abs(k) * n2) / 2)
      return T('Le triangle rectangle', numeric(
        `On donne A${pt(A[0], A[1])}, B${pt(B[0], B[1])} et C${pt(C[0], C[1])} dans un repère orthonormé. Le triangle ABC est rectangle en B (tu peux le vérifier avec la réciproque de Pythagore). Calcule son aire.`,
        area, { explanation: `BA = √${n2}, BC = √${k * k * n2} = ${Math.abs(k) === 1 ? '' : Math.abs(k)}√${n2}. Aire = ${F('BA × BC', 2)} = ${F(Math.abs(k) * n2, 2)} = ${fmt(area)}.` }))
    },
    // Trapèze : DC⃗ = k AB⃗.
    () => {
      const k = pick([2, 3, 0.5, 1.5]), A = P6(), C = P6()
      let ab = [randNonZero(-4, 4), randNonZero(-4, 4)]
      if (k === 0.5 || k === 1.5) ab = ab.map((v) => 2 * v)
      const B = [A[0] + ab[0], A[1] + ab[1]], D = [C[0] - k * ab[0], C[1] - k * ab[1]]
      if (!notAligned(A, B, C)) return vect[1][3]()
      return T('Le trapèze', pair(
        `ABCD est un trapèze de bases [AB] et [DC] tel que DC⃗ = ${k === 0.5 ? F(1, 2) : fmt(k)}AB⃗. On donne A${pt(A[0], A[1])}, B${pt(B[0], B[1])} et C${pt(C[0], C[1])}. Donne les coordonnées de D.`,
        D[0], D[1], { explanation: `AB⃗${pt(ab[0], ab[1])}, donc DC⃗${pt(k * ab[0], k * ab[1])}. D = C − DC⃗ = ${pt(D[0], D[1])}.` }))
    },
    // Parallélogramme, puis longueur d'une diagonale.
    () => {
      const B = P6(), A = P6(), [tx, ty, r] = tripleVec(15)
      const C = [tx + 2 * B[0] - A[0], ty + 2 * B[1] - A[1]], D = [A[0] + C[0] - B[0], A[1] + C[1] - B[1]]
      if (!notAligned(A, B, C) || [...C, ...D].some((v) => Math.abs(v) > 14)) return vect[1][4]()
      return T('La diagonale', numeric(
        `On donne A${pt(A[0], A[1])}, B${pt(B[0], B[1])} et C${pt(C[0], C[1])} dans un repère orthonormé. On construit D tel que ABCD soit un parallélogramme. Calcule la longueur BD.`,
        r, { explanation: `AD⃗ = BC⃗ donne D = A + BC⃗ = ${pt(D[0], D[1])}. BD⃗${pt(tx, ty)}, donc BD = √(${par(tx)}² + ${par(ty)}²) = ${r}.` }))
    },
  ],
  [
    // Point d'un axe équidistant de deux points.
    () => {
      for (;;) {
        const A = P6(), B = P6(), onX = Math.random() < 0.6
        const [a1, a2, b1, b2] = onX ? [A[0], A[1], B[0], B[1]] : [A[1], A[0], B[1], B[0]]
        if (a1 === b1) continue
        const x = r6((b1 * b1 + b2 * b2 - a1 * a1 - a2 * a2) / (2 * (b1 - a1)))
        if (!isClean(x, 1) || Math.abs(x) > 15) continue
        const axe = onX ? 'la route rectiligne qui suit l’axe des abscisses' : 'le canal qui suit l’axe des ordonnées'
        return T('Le puits équitable', numeric(
          `Deux fermes sont situées en A${pt(A[0], A[1])} et B${pt(B[0], B[1])} (repère orthonormé). On veut creuser un puits sur ${axe}, à égale distance des deux fermes. Quelle est ${onX ? 'l’abscisse' : 'l’ordonnée'} du puits ?`,
          x, { explanation: `Avec M${onX ? '(t ; 0)' : '(0 ; t)'} : MA² = MB² ⟺ ${sqd('t', a1, a2)} = ${sqd('t', b1, b2)}. Les t² s'éliminent : ${fmt(2 * (b1 - a1))}t = ${fmt(b1 * b1 + b2 * b2 - a1 * a1 - a2 * a2)}, donc t = ${fmt(x)}.` }))
      }
    },
    // Colinéarité menant à m² = ab.
    () => {
      const m0 = randInt(2, 9), divs = Array.from({ length: m0 * m0 }, (_, i) => i + 1).filter((d) => (m0 * m0) % d === 0 && d <= 30 && (m0 * m0) / d <= 30)
      const s = pick([1, -1]), a = s * pick(divs), b = (m0 * m0) / a
      return T('Colinéaires ?', { ...solutionSet(
        `Pour quelles valeurs de m les vecteurs u⃗(m ; ${fmt(a)}) et v⃗(${fmt(b)} ; m) sont-ils colinéaires ?`, [-m0, m0], {
          explanation: `det(u⃗, v⃗) = m × m − ${par(a)} × ${par(b)} = m² − ${m0 * m0}. Il est nul pour m² = ${m0 * m0}, soit m = ${m0} ou m = −${m0}.`,
        }), answer: `−${m0} ; ${m0}` })
    },
    // Point défini par une relation vectorielle nulle.
    () => {
      for (;;) {
        const A = P6(), B = P6(), C = P6(), v = pick([0, 1, 2])
        let M: number[], rel: string, how: string
        if (v === 0) {
          M = [(A[0] + B[0] + C[0]) / 3, (A[1] + B[1] + C[1]) / 3]; rel = 'MA⃗ + MB⃗ + MC⃗ = 0⃗'
          how = `(A − M) + (B − M) + (C − M) = 0⃗, donc M = ${F('A + B + C', 3)}`
        } else if (v === 1) {
          M = [(A[0] + 2 * B[0]) / 3, (A[1] + 2 * B[1]) / 3]; rel = 'MA⃗ + 2MB⃗ = 0⃗'
          how = `(A − M) + 2(B − M) = 0⃗, donc M = ${F('A + 2B', 3)}`
        } else {
          M = [(3 * B[0] - A[0]) / 2, (3 * B[1] - A[1]) / 2]; rel = 'MA⃗ − 3MB⃗ = 0⃗'
          how = `(A − M) − 3(B − M) = 0⃗, soit 2M = 3B − A, donc M = ${F('3B − A', 2)}`
        }
        if (!M.every((c) => isClean(c, 0))) continue
        return T('Le point d’équilibre', pair(
          `On donne A${pt(A[0], A[1])}, B${pt(B[0], B[1])}${v === 0 ? ` et C${pt(C[0], C[1])}` : ''}. Donne les coordonnées du point M tel que ${rel}.`,
          M[0], M[1], { explanation: `En coordonnées : ${how} = ${pt(M[0], M[1])}.` }))
      }
    },
    // Points d'une droite à une distance donnée.
    () => {
      const A = P6(), [p, q, r] = pick(TRIPLES.filter((t) => t[2] <= 15)), [pp, qq] = Math.random() < 0.5 ? [p, q] : [q, p]
      const k = A[1] + qq * pick([1, -1])
      return T('À portée de tir', solutionSet(
        `Un trébuchet placé en A${pt(A[0], A[1])} a une portée de ${r} unités (repère orthonormé). Sur la route d'équation y = ${fmt(k)}, quels points sont exactement à la limite de portée ? Donne leurs abscisses.`,
        [A[0] - pp, A[0] + pp], { explanation: `M(x ; ${fmt(k)}) : AM² = (x − ${par(A[0])})² + ${qq}² = ${r * r} ⟺ (x − ${par(A[0])})² = ${pp * pp} ⟺ x = ${fmt(A[0] - pp)} ou x = ${fmt(A[0] + pp)}.` }))
    },
    // Combinaison colinéaire à un vecteur donné.
    () => {
      for (;;) {
        const u = [randInt(-5, 5), randInt(-5, 5)], v = [randNonZero(-4, 4), randNonZero(-4, 4)], w = [randNonZero(-4, 4), randNonZero(-4, 4)]
        const duw = u[0] * w[1] - u[1] * w[0], dvw = v[0] * w[1] - v[1] * w[0]
        if (dvw === 0 || duw === 0 || u[0] * v[1] - u[1] * v[0] === 0 || Math.abs(duw / dvw) > 8) continue
        return T('Le bon dosage', fraction(
          `On donne u⃗${pt(u[0], u[1])}, v⃗${pt(v[0], v[1])} et w⃗${pt(w[0], w[1])}. Pour quelle valeur de k le vecteur u⃗ + kv⃗ est-il colinéaire à w⃗ ?`, -duw, dvw, {
            explanation: `u⃗ + kv⃗(${poly([u[0], ''], [v[0], 'k'])} ; ${poly([u[1], ''], [v[1], 'k'])}). det(u⃗ + kv⃗, w⃗) = (${poly([u[0], ''], [v[0], 'k'])}) × ${par(w[1])} − (${poly([u[1], ''], [v[1], 'k'])}) × ${par(w[0])} = ${poly([duw, ''], [dvw, 'k'])} = 0, donc k = ${fracText(-duw, dvw)}.`,
          }))
      }
    },
  ],
]

// ═════════════════════════════════════════════════════════════════════════
// Droites & systèmes
// ═════════════════════════════════════════════════════════════════════════
const eqLine = (m: number, p: number) => `y = ${poly([m, 'x'], [p, ''])}`
const slopeClean = (dy: number, dx: number) => dx !== 0 && isClean(dy / dx, 2)

const droites: Ladder = [
  [
    // Deux voyageurs qui se croisent.
    () => {
      const ctx = pick([
        { who: 'Deux cavaliers partent en même temps de deux châteaux', v: [10, 20], from: 'du premier château' },
        { who: 'Deux cyclistes partent en même temps de deux villes', v: [15, 30], from: 'de la ville de départ du premier' },
        { who: 'Deux trains partent en même temps de deux gares', v: [60, 150], from: 'de la gare de départ du premier' },
      ])
      const v1 = randInt(ctx.v[0], ctx.v[1]), v2 = randInt(ctx.v[0], ctx.v[1]), t = pick([0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3])
      const D = r6((v1 + v2) * t)
      if (!isClean(D, 1) || !isClean(v1 * t, 2)) return droites[0][0]()
      const askPos = Math.random() < 0.45
      const base = `${ctx.who} distant${ctx.who.includes('villes') || ctx.who.includes('gares') ? 'e' : ''}s de ${fmt(D)} km et roulent l'un vers l'autre, le premier à ${v1} km/h, le second à ${v2} km/h.`
      const expl = `Positions (en km, depuis le départ du premier) : y = ${v1}t et y = ${fmt(D)} − ${v2}t. Elles sont égales quand ${v1 + v2}t = ${fmt(D)}, soit t = ${fmt(t)} h`
      return T('La rencontre', askPos
        ? numeric(`${base} À quelle distance ${ctx.from} se croisent-ils (en km) ?`, r6(v1 * t), { explanation: `${expl}, à ${v1} × ${fmt(t)} = ${fmt(r6(v1 * t))} km.` })
        : numeric(`${base} Au bout de combien d'heures se croisent-ils ?`, t, { explanation: `${expl}.` }))
    },
    // Têtes et pattes : système 2 × 2.
    () => {
      const ctx = pick([
        { s: 'Dans une ferme, on compte des poules et des lapins', n: 'têtes', k: 'pattes', a: 2, b: 4, A: 'poules', B: 'lapins' },
        { s: 'Sur un parking, il y a des motos et des voitures', n: 'véhicules', k: 'roues', a: 2, b: 4, A: 'motos', B: 'voitures' },
        { s: 'Dans la taverne, il y a des tabourets à 3 pieds et des chaises à 4 pieds', n: 'sièges', k: 'pieds', a: 3, b: 4, A: 'tabourets', B: 'chaises' },
        { s: 'Dans un terrarium vivent des araignées (8 pattes) et des scarabées (6 pattes)', n: 'bestioles', k: 'pattes', a: 8, b: 6, A: 'araignées', B: 'scarabées' },
        { s: 'Un loueur propose des vélos et des tricycles', n: 'engins', k: 'roues', a: 2, b: 3, A: 'vélos', B: 'tricycles' },
      ])
      const x = randInt(3, 40), y = randInt(3, 40), askA = Math.random() < 0.5
      const N = x + y, K = ctx.a * x + ctx.b * y
      return T('Têtes et pattes', numeric(`${ctx.s} : ${N} ${ctx.n} et ${K} ${ctx.k} en tout. Combien y a-t-il de ${askA ? ctx.A : ctx.B} ?`, askA ? x : y, {
        explanation: `Système : x + y = ${N} et ${ctx.a}x + ${ctx.b}y = ${K} (x ${ctx.A}, y ${ctx.B}). En remplaçant y = ${N} − x : ${ctx.a}x + ${ctx.b}(${N} − x) = ${K}, d'où x = ${x} et y = ${y}.`,
      }))
    },
    // Parallèle à (AB) passant par C.
    () => {
      for (;;) {
        const A = P6(), dx = randNonZero(-4, 4), dy = randNonZero(-6, 6), C = P6()
        if (!slopeClean(dy, dx)) continue
        const B = [A[0] + dx, A[1] + dy], m = r6(dy / dx), p = r6(C[1] - m * C[0])
        if (!isClean(p, 2) || !notAligned(A, B, C)) continue
        return T('La parallèle', expression(
          `On donne A${pt(A[0], A[1])}, B${pt(B[0], B[1])} et C${pt(C[0], C[1])}. Donne l'équation réduite de la droite parallèle à (AB) passant par C.`,
          poly([m, 'x'], [p, '']), 'any', { answer: eqLine(m, p), inputHint: 'y = mx + p', explanation: `Coefficient directeur de (AB) : ${Fs(dy, dx)} = ${fmt(m)}. La parallèle a le même : y = ${tm(m, 'x')} + p, avec ${fmt(C[1])} = ${fmt(m)} × ${par(C[0])} + p, donc p = ${fmt(p)}.` }))
      }
    },
    // Équation d'une droite à partir de ses points sur les axes.
    () => {
      for (;;) {
        const a = randNonZero(-8, 8), b = randNonZero(-9, 9)
        if (!slopeClean(b, a)) continue
        const m = r6(-b / a)
        return T('Les deux axes', expression(
          `La droite d coupe l'axe des abscisses en A(${fmt(a)} ; 0) et l'axe des ordonnées en B(0 ; ${fmt(b)}). Donne son équation réduite.`,
          poly([m, 'x'], [b, '']), 'any', { answer: eqLine(m, b), inputHint: 'y = mx + p', explanation: `p = ${fmt(b)} (ordonnée à l'origine). m = ${F(`0 − ${par(b)}`, `${fmt(a)} − 0`)} = ${fmt(m)}. Donc ${eqLine(m, b)}.` }),
          repere({ A: [a, 0], B: [0, b] }, [{ a: 'A', b: 'B', extend: 30 }]))
      }
    },
    // Intersection : une droite par son équation, l'autre par un point et une pente.
    () => {
      for (;;) {
        const X = randInt(-5, 5), Y = randInt(-6, 6), m1 = randNonZero(-4, 4), m2 = randNonZero(-4, 4)
        if (m1 === m2) continue
        const p1 = Y - m1 * X, qx = X + randNonZero(-3, 3), Q = [qx, Y + m2 * (qx - X)]
        if (Math.abs(Q[1]) > 15) continue
        return T('Le croisement', pair(
          `La droite d₁ a pour équation ${eqLine(m1, p1)}. La droite d₂ a pour coefficient directeur ${fmt(m2)} et passe par Q${pt(Q[0], Q[1])}. Donne les coordonnées du point d'intersection de d₁ et d₂.`,
          X, Y, { explanation: `d₂ : ${eqLine(m2, Q[1] - m2 * Q[0])}. ${poly([m1, 'x'], [p1, ''])} = ${poly([m2, 'x'], [Q[1] - m2 * Q[0], ''])} ⟺ x = ${fmt(X)}, puis y = ${fmt(Y)}.` }))
      }
    },
  ],
  [
    // Mélange de deux produits : système.
    () => {
      const ctx = pick([
        { who: 'Un torréfacteur mélange deux cafés', u: 'kg', p: [12, 30] },
        { who: 'Une épicière mélange deux sortes de thé', u: 'kg', p: [20, 60] },
        { who: 'Un confiseur mélange deux sortes de bonbons', u: 'kg', p: [8, 20] },
        { who: 'Un herboriste mélange deux plantes séchées', u: 'kg', p: [15, 40] },
      ])
      for (;;) {
        const x = randInt(2, 20), y = randInt(2, 20), q = randInt(ctx.p[0] * 2, ctx.p[1] * 2) / 2, p = q + randInt(2, 16) / 2
        const M = x + y, Tt = r6(p * x + q * y)
        if (!isClean(Tt, 2)) continue
        return T('Le mélange', numeric(
          `${ctx.who}, l'un à ${fmt(p)} €/kg et l'autre à ${fmt(q)} €/kg, pour obtenir ${M} kg d'un mélange qui vaut ${fmt(Tt)} € au total. Combien de kg du produit à ${fmt(p)} €/kg utilise-t-il ?`,
          x, { explanation: `x + y = ${M} et ${fmt(p)}x + ${fmt(q)}y = ${fmt(Tt)}. Avec y = ${M} − x : ${tm(p - q, 'x')} = ${fmt(Tt)} − ${fmt(r6(q * M))} = ${fmt(r6(Tt - q * M))}, donc x = ${x} kg.` }))
      }
    },
    // Intersection de deux trajectoires données par des points.
    () => {
      for (;;) {
        const X = [randInt(-4, 4), randInt(-4, 4)]
        const d1 = [pick([1, 2]), randNonZero(-3, 3)], d2 = [pick([1, 2]), randNonZero(-3, 3)]
        if (d1[0] * d2[1] - d1[1] * d2[0] === 0) continue
        const s = [randNonZero(-3, 3), randNonZero(-3, 3)], t = [randNonZero(-3, 3), randNonZero(-3, 3)]
        if (s[0] === s[1] || t[0] === t[1]) continue
        const A = [X[0] + s[0] * d1[0], X[1] + s[0] * d1[1]], B = [X[0] + s[1] * d1[0], X[1] + s[1] * d1[1]]
        const C = [X[0] + t[0] * d2[0], X[1] + t[0] * d2[1]], D = [X[0] + t[1] * d2[0], X[1] + t[1] * d2[1]]
        if ([...A, ...B, ...C, ...D].some((v) => Math.abs(v) > 10)) continue
        const m1 = r6(d1[1] / d1[0]), m2 = r6(d2[1] / d2[0]), p1 = r6(A[1] - m1 * A[0]), p2 = r6(C[1] - m2 * C[0])
        return T('Routes croisées', pair(
          `Le navire N₁ suit une route rectiligne passant par A${pt(A[0], A[1])} et B${pt(B[0], B[1])} ; le navire N₂ suit une route passant par C${pt(C[0], C[1])} et D${pt(D[0], D[1])}. En quel point leurs routes se croisent-elles ?`,
          X[0], X[1], { explanation: `(AB) : ${eqLine(m1, p1)} ; (CD) : ${eqLine(m2, p2)}. ${poly([m1, 'x'], [p1, ''])} = ${poly([m2, 'x'], [p2, ''])} ⟺ x = ${fmt(X[0])}, puis y = ${fmt(X[1])}.` }),
          repere({ A: [A[0], A[1]], B: [B[0], B[1]], C: [C[0], C[1]], D: [D[0], D[1]] }, [{ a: 'A', b: 'B', extend: 25, color: '#2f5fb3' }, { a: 'C', b: 'D', extend: 25, color: '#b8362f' }]))
      }
    },
    // Aire du triangle formé avec les axes.
    () => {
      for (;;) {
        const p = randNonZero(-10, 10), m = pick([-4, -3, -2, -1.5, -1, -0.5, 0.5, 1, 1.5, 2, 3, 4])
        const xa = r6(-p / m), area = r6((Math.abs(p) * Math.abs(xa)) / 2)
        if (!isClean(xa, 2) || !isClean(area, 2) || Math.abs(xa) < 1 || Math.abs(xa) > 20) continue
        return T('Le triangle des axes', numeric(
          `La droite d d'équation ${eqLine(m, p)} coupe l'axe des abscisses en A et l'axe des ordonnées en B. Calcule l'aire du triangle OAB, O étant l'origine (en unités d'aire).`,
          area, { explanation: `B(0 ; ${fmt(p)}) ; A : ${poly([m, 'x'], [p, ''])} = 0 ⟺ x = ${fmt(xa)}. OAB est rectangle en O : aire = ${F(`${fmt(Math.abs(xa))} × ${Math.abs(p)}`, 2)} = ${fmt(area)}.` }),
          repere({ A: [xa, 0], B: [0, p] }, [{ a: 'A', b: 'B', extend: 25 }], [{ pts: ['O', 'A', 'B'], fill: FILL }]))
      }
    },
    // Droites parallèles avec un paramètre.
    () => {
      for (;;) {
        if (Math.random() < 0.5) {
          const a = randInt(-6, 6), b = pick([2, 3, -1, -2]), e = randInt(-6, 6), c1 = randNonZero(-6, 6), c2 = randNonZero(-6, 6)
          const m = r6((a - e) / (b - 1))
          if (!isClean(m, 2) || a === e) continue
          return T('Les parallèles', numeric(
            `Pour quelle valeur de m les droites d : y = (${poly([1, 'm'], [a, ''])})x${term(c1, '')} et d′ : y = (${poly([b, 'm'], [e, ''])})x${term(c2, '')} sont-elles parallèles ?`,
            m, { explanation: `Deux droites sont parallèles si elles ont le même coefficient directeur : ${poly([1, 'm'], [a, ''])} = ${poly([b, 'm'], [e, ''])} ⟺ ${poly([1 - b, 'm'])} = ${fmt(e - a)} ⟺ m = ${fmt(m)}.` }))
        }
        const x1 = randInt(-3, 3), dx = randInt(1, 4), k = pick([2, 3, -1]), c = randInt(-5, 5), s = randNonZero(-4, 4), q = randInt(-5, 5)
        const m = r6((s * dx - c) / (k - 1))
        if (!isClean(m, 2)) continue
        return T('Les parallèles', numeric(
          `La droite d passe par A(${fmt(x1)} ; m) et B(${fmt(x1 + dx)} ; ${poly([k, 'm'], [c, ''])}). Pour quelle valeur de m est-elle parallèle à la droite d′ : ${eqLine(s, q)} ?`,
          m, { explanation: `Coefficient de d : ${F(`(${poly([k, 'm'], [c, ''])}) − m`, dx)} = ${F(poly([k - 1, 'm'], [c, '']), dx)}. On veut ${F(poly([k - 1, 'm'], [c, '']), dx)} = ${fmt(s)}, soit ${poly([k - 1, 'm'], [c, ''])} = ${fmt(s * dx)} et m = ${fmt(m)}.` }))
      }
    },
    // Nombre à deux chiffres.
    () => {
      const a = randInt(1, 9)
      let b = randInt(1, 9)
      while (b === a) b = randInt(1, 9)
      const D = 9 * Math.abs(b - a)
      return T('Les chiffres inversés', numeric(
        `Un nombre de deux chiffres a une somme de chiffres égale à ${a + b}. Si l'on inverse ses deux chiffres, on obtient un nombre ${b > a ? 'plus grand' : 'plus petit'} de ${D}. Quel est ce nombre ?`,
        10 * a + b, { explanation: `Dizaines d, unités u : d + u = ${a + b} et (10u + d) − (10d + u) = 9(u − d) = ${b > a ? '' : '−'}${D}, donc u − d = ${fmt(b - a)}. On trouve d = ${a}, u = ${b} : ${10 * a + b}.` }))
    },
  ],
  [
    // Aire du triangle formé par deux droites et l'axe des abscisses.
    () => {
      for (;;) {
        const xp = randInt(-4, 4), yp = randNonZero(-8, 8), r1 = randInt(-8, 8), r2 = randInt(-8, 8)
        if (r1 === r2 || r1 === xp || r2 === xp) continue
        const m1 = r6(yp / (xp - r1)), m2 = r6(yp / (xp - r2))
        if (!isClean(m1, 2) || !isClean(m2, 2)) continue
        const p1 = r6(-m1 * r1), p2 = r6(-m2 * r2), area = r6((Math.abs(r1 - r2) * Math.abs(yp)) / 2)
        if (!isClean(p1, 2) || !isClean(p2, 2)) continue
        return T('Le triangle de trois droites', numeric(
          `Les droites d₁ : ${eqLine(m1, p1)} et d₂ : ${eqLine(m2, p2)} forment avec l'axe des abscisses un triangle. Calcule son aire (en unités d'aire).`,
          area, { explanation: `d₁ coupe l'axe en x = ${fmt(r1)}, d₂ en x = ${fmt(r2)} : base ${Math.abs(r1 - r2)}. d₁ et d₂ se coupent en ${pt(xp, yp)} : hauteur ${Math.abs(yp)}. Aire = ${F(`${Math.abs(r1 - r2)} × ${Math.abs(yp)}`, 2)} = ${fmt(area)}.` }))
      }
    },
    // Avec ou contre le courant.
    () => {
      for (;;) {
        const plane = Math.random() < 0.35
        const v = plane ? pick([500, 600, 700, 800, 900]) : randInt(8, 30), c = plane ? pick([50, 100, 150]) : randInt(1, Math.min(8, v - 2))
        const L = lcm(v + c, v - c)
        const kmax = Math.floor((plane ? 4000 : 150) / L)
        if (kmax < 1) continue
        const D = L * randInt(1, kmax), t1 = D / (v + c), t2 = D / (v - c)
        if (t1 > 12 || t2 > 15) continue
        const askC = Math.random() < 0.6
        const s = plane
          ? `Un avion parcourt ${big(D)} km en ${fmt(t1)} h avec le vent dans le dos, et met ${fmt(t2)} h pour le trajet retour, vent de face. On suppose sa vitesse propre et celle du vent constantes.`
          : `Une péniche parcourt ${D} km en ${fmt(t1)} h en descendant le fleuve, et met ${fmt(t2)} h pour remonter la même distance. On suppose sa vitesse propre et celle du courant constantes.`
        const q = askC ? (plane ? 'Quelle est la vitesse du vent (en km/h) ?' : 'Quelle est la vitesse du courant (en km/h) ?') : (plane ? 'Quelle est la vitesse propre de l’avion (en km/h) ?' : 'Quelle est la vitesse propre de la péniche (en km/h) ?')
        return T('À contre-courant', numeric(`${s} ${q}`, askC ? c : v, {
          explanation: `v + c = ${big(D)} ÷ ${fmt(t1)} = ${v + c} et v − c = ${big(D)} ÷ ${fmt(t2)} = ${v - c}. En additionnant : 2v = ${2 * v}, donc v = ${v} et c = ${c}.`,
        }))
      }
    },
    // Trois droites concourantes.
    () => {
      for (;;) {
        const X = randNonZero(-5, 5), Y = randInt(-6, 6), m1 = randNonZero(-4, 4), m2 = randNonZero(-4, 4), c = randNonZero(-6, 6)
        if (m1 === m2) continue
        const m = r6((Y - c) / X)
        if (!isClean(m, 2)) continue
        return T('Le point de rendez-vous', numeric(
          `Pour quelle valeur de m les droites d₁ : ${eqLine(m1, Y - m1 * X)}, d₂ : ${eqLine(m2, Y - m2 * X)} et d₃ : y = mx${term(c, '')} sont-elles concourantes ?`,
          m, { explanation: `d₁ et d₂ se coupent en ${pt(X, Y)} (on résout ${poly([m1, 'x'], [Y - m1 * X, ''])} = ${poly([m2, 'x'], [Y - m2 * X, ''])}). d₃ doit passer par ce point : ${fmt(Y)} = m × ${par(X)}${term(c, '')}, donc m = ${fmt(m)}.` }))
      }
    },
    // Droite passant par une intersection et parallèle à (AB).
    () => {
      for (;;) {
        const X = randInt(-5, 5), Y = randInt(-6, 6), m1 = randNonZero(-4, 4), m2 = randNonZero(-4, 4)
        if (m1 === m2) continue
        const A = P6(), dx = randNonZero(-4, 4), dy = randNonZero(-6, 6)
        if (!slopeClean(dy, dx)) continue
        const m3 = r6(dy / dx), p3 = r6(Y - m3 * X)
        if (!isClean(p3, 2) || m3 === m1 || m3 === m2) continue
        return T('Par le carrefour', expression(
          `Donne l'équation réduite de la droite qui passe par le point d'intersection de d₁ : ${eqLine(m1, Y - m1 * X)} et d₂ : ${eqLine(m2, Y - m2 * X)}, et qui est parallèle à (AB), avec A${pt(A[0], A[1])} et B${pt(A[0] + dx, A[1] + dy)}.`,
          poly([m3, 'x'], [p3, '']), 'any', { answer: eqLine(m3, p3), inputHint: 'y = mx + p', explanation: `Intersection : ${pt(X, Y)}. Coefficient de (AB) : ${Fs(dy, dx)} = ${fmt(m3)}. p = ${fmt(Y)} − ${par(m3)} × ${par(X)} = ${fmt(p3)}.` }))
      }
    },
    // Système avec des pourcentages.
    () => {
      const ctx = pick([
        { s: 'Une épée et un bouclier', u: 'écus', A: 'de l’épée', B: 'du bouclier' },
        { s: 'Un vélo et un casque', u: '€', A: 'du vélo', B: 'du casque' },
        { s: 'Une console et un jeu', u: '€', A: 'de la console', B: 'du jeu' },
        { s: 'Un cheval et une selle', u: 'écus', A: 'du cheval', B: 'de la selle' },
      ])
      const x = randInt(3, 25) * 20, y = randInt(1, 15) * 20, a = pick([10, 20, 25, 30, 50]), b = pick([10, 20, 25, 40, 50])
      const Tt = x + y, T2 = r6(x * cmul(a) + y * cmul(-b))
      return T('Hausse et baisse', numeric(
        `${ctx.s} coûtent ensemble ${Tt} ${ctx.u}. Le prix ${ctx.A} augmente de ${a} % et celui ${ctx.B} baisse de ${b} % : ensemble, ils coûtent maintenant ${fmt(T2)} ${ctx.u}. Quel était le prix initial ${ctx.A} (en ${ctx.u}) ?`,
        x, { explanation: `x + y = ${Tt} et ${fmt(cmul(a))}x + ${fmt(cmul(-b))}y = ${fmt(T2)}. Avec y = ${Tt} − x : ${tm(cmul(a) - cmul(-b), 'x')} = ${fmt(T2)} − ${fmt(r6(cmul(-b) * Tt))}, donc x = ${x}.` }))
    },
  ],
]

// ═════════════════════════════════════════════════════════════════════════
// Statistiques & probabilités
// ═════════════════════════════════════════════════════════════════════════
const stat: Ladder = [
  [
    // Tableau croisé décrit en phrases.
    () => {
      const ctx = pick([
        { intro: (N: number, a: number, b: number, ab: number) => `Un lycée compte ${N} élèves de seconde : ${a} sont des filles, ${b} font du latin, dont ${ab} filles.`, u: 'que ce soit une fille ou un élève qui fait du latin', n: 'que ce soit un garçon qui ne fait pas de latin', ab: 'que ce soit un garçon qui fait du latin', who: 'un élève' },
        { intro: (N: number, a: number, b: number, ab: number) => `Une armée compte ${N} soldats : ${a} sont des archers (les autres sont des fantassins), ${b} sont des vétérans, dont ${ab} archers.`, u: 'que ce soit un archer ou un vétéran', n: 'que ce soit un fantassin qui n’est pas vétéran', ab: 'que ce soit un fantassin vétéran', who: 'un soldat' },
        { intro: (N: number, a: number, b: number, ab: number) => `Un festival accueille ${N} visiteurs : ${a} sont des enfants, ${b} ont un billet VIP, dont ${ab} enfants.`, u: 'que ce soit un enfant ou un VIP', n: 'que ce soit un adulte sans billet VIP', ab: 'que ce soit un adulte avec un billet VIP', who: 'un visiteur' },
        { intro: (N: number, a: number, b: number, ab: number) => `Un club compte ${N} membres : ${a} font de la natation, ${b} font du tennis, dont ${ab} qui font aussi de la natation.`, u: 'qu’il pratique au moins un des deux sports', n: 'qu’il ne pratique aucun des deux sports', ab: 'qu’il fasse du tennis mais pas de natation', who: 'un membre' },
      ])
      for (;;) {
        const N = randInt(10, 40) * 10, a = randInt(N / 5, (3 * N) / 5), b = randInt(N / 10, N / 2), ab = randInt(1, Math.min(a, b) - 1)
        if (a + b - ab >= N) continue
        const q = pick(['u', 'n', 'ab'] as const)
        const fav = q === 'u' ? a + b - ab : q === 'n' ? N - a - b + ab : b - ab
        return T('Le tableau croisé', fraction(
          `${ctx.intro(N, a, b, ab)} On choisit ${ctx.who} au hasard. Quelle est la probabilité ${ctx[q]} ?`, fav, N, {
            explanation: `Tableau à double entrée : A et B : ${ab} ; A seul : ${a - ab} ; B seul : ${b - ab} ; ni l'un ni l'autre : ${N - a - b + ab}. Cas favorables : ${fav} sur ${N}, soit ${fracText(fav, N)}.`,
          }))
      }
    },
    // Deux évolutions successives différentes.
    () => {
      for (;;) {
        const a = randInt(1, 10) * 5 * pick([1, -1]), b = randInt(1, 10) * 5 * pick([1, -1])
        if (a === -b || a <= -100 || b <= -100) continue
        const g = r6((cmul(a) * cmul(b) - 1) * 100)
        if (g === 0) continue
        const ctx = pick([
          ['Le prix d’un vélo', 'en janvier', 'en février'], ['Le nombre d’abonnés d’une chaîne vidéo', 'le premier mois', 'le second mois'],
          ['La population d’un village', 'en 2023', 'en 2024'], ['Le cours d’une action', 'lundi', 'mardi'], ['Le prix du blé au marché', 'au printemps', 'en été'],
        ])
        const verb = (t: number) => (t > 0 ? 'augmente' : 'baisse')
        return T('Évolutions en chaîne', numeric(
          `${ctx[0]} ${verb(a)} de ${Math.abs(a)} % ${ctx[1]}, puis ${verb(b)} de ${Math.abs(b)} % ${ctx[2]}. Quelle est l'évolution globale, en % ? (Réponse signée : négative pour une baisse.)`,
          g, { explanation: `Coefficient global : ${fmt(cmul(a))} × ${fmt(cmul(b))} = ${fmt(r6(cmul(a) * cmul(b)))}, soit une évolution de ${evo(g)}.` }))
      }
    },
    // Moyenne de deux groupes réunis.
    () => {
      const ctx = pick([
        { g: 'La classe A', g2: 'la classe B', who: 'élèves', what: 'une moyenne de', u: '', all: 'des élèves des deux classes' },
        { g: 'L’équipe A', g2: 'l’équipe B', who: 'joueurs', what: 'une taille moyenne de', u: ' cm', all: 'des joueurs des deux équipes' },
        { g: 'Le village A', g2: 'le village B', who: 'habitants', what: 'un âge moyen de', u: ' ans', all: 'des habitants des deux villages' },
      ])
      for (;;) {
        const tot = pick([20, 25, 40, 50]), n1 = randInt(6, tot - 6), n2 = tot - n1
        if (n1 === n2) continue
        const base = ctx.u === ' cm' ? 170 : ctx.u === ' ans' ? 35 : 11
        const m1 = r6(base + randInt(-8, 8) * 0.5), m2 = r6(base + randInt(-8, 8) * 0.5)
        const mm = r6((n1 * m1 + n2 * m2) / (n1 + n2))
        if (m1 === m2 || !isClean(mm, 2)) continue
        return T('Les deux groupes', numeric(
          `${ctx.g} compte ${n1} ${ctx.who} avec ${ctx.what} ${fmt(m1)}${ctx.u} ; ${ctx.g2} compte ${n2} ${ctx.who} avec ${ctx.what} ${fmt(m2)}${ctx.u}. Quelle est la moyenne ${ctx.all}${ctx.u ? ` (en${ctx.u})` : ''} ?`,
          mm, { explanation: `Moyenne pondérée par les effectifs : (${n1} × ${fmt(m1)} + ${n2} × ${fmt(m2)}) ÷ ${n1 + n2} = ${fmt(r6(n1 * m1 + n2 * m2))} ÷ ${n1 + n2} = ${fmt(mm)}.` }))
      }
    },
    // Proportion de proportion de proportion.
    () => {
      for (;;) {
        const a = pick([20, 25, 40, 50, 60, 75, 80]), b = pick([10, 20, 25, 30, 40, 50]), c = pick([10, 20, 25, 40, 50, 60])
        const res = r6((a * b * c) / 10000)
        if (!isClean(res, 2)) continue
        const ctx = pick([
          `Dans un royaume, ${a} % des habitants vivent en ville. Parmi eux, ${b} % sont artisans, et parmi ces artisans, ${c} % sont forgerons. Quel pourcentage des habitants du royaume sont des forgerons citadins ?`,
          `Dans un lycée, ${a} % des élèves mangent à la cantine. Parmi eux, ${b} % sont en seconde, et parmi ces élèves de seconde, ${c} % sont internes. Quel pourcentage des élèves du lycée sont des internes de seconde qui mangent à la cantine ?`,
          `Parmi les joueurs d'un jeu en ligne, ${a} % jouent sur téléphone. Parmi eux, ${b} % ont un compte premium, et parmi ces derniers, ${c} % jouent tous les jours. Quel pourcentage des joueurs sont des joueurs quotidiens premium sur téléphone ?`,
        ])
        return T('Proportions emboîtées', numeric(ctx, res, {
          explanation: `On multiplie les proportions : ${fmt(a / 100)} × ${fmt(b / 100)} × ${fmt(c / 100)} = ${fmt(res / 100)}, soit ${fmt(res)} %.`,
        }))
      }
    },
    // Retrouver le prix initial après deux évolutions.
    () => {
      for (;;) {
        const P0 = randInt(2, 20) * 20, a = pick([10, 20, 25, 50, -10, -20]), b = pick([-10, -20, -25, -40, 10, 20])
        const P = r6(P0 * cmul(a) * cmul(b))
        if (!isClean(P, 2) || r6(cmul(a) * cmul(b)) === 1) continue
        const obj = pick(['une paire de baskets', 'un casque audio', 'une lanterne', 'un manteau', 'un jeu de société'])
        const w = (t: number) => (t > 0 ? `une hausse de ${t} %` : `une baisse de ${-t} %`)
        return T('Le prix d’origine', numeric(
          `Après ${w(a)} puis ${w(b)}, ${obj} coûte ${fmt(P)} €. Quel était son prix initial (en €) ?`, P0, {
            explanation: `P × ${fmt(cmul(a))} × ${fmt(cmul(b))} = ${fmt(P)}, soit P × ${fmt(r6(cmul(a) * cmul(b)))} = ${fmt(P)}, donc P = ${fmt(P)} ÷ ${fmt(r6(cmul(a) * cmul(b)))} = ${P0} €.`,
          }))
      }
    },
  ],
  [
    // Ni l'un ni l'autre : retrouver l'intersection.
    () => {
      for (;;) {
        const pA = randInt(6, 16) * 5, pB = randInt(4, 14) * 5, pN = randInt(1, 6) * 5
        const pAB = pA + pB - (100 - pN)
        if (pAB <= 0 || pAB >= Math.min(pA, pB)) continue
        const ctx = pick([
          ['Dans un club', 'des membres font du tir à l’arc', 'de l’équitation', 'ne pratiquent aucune des deux activités', 'un membre', 'qu’il pratique les deux activités', 'des membres pratique les deux activités'],
          ['Dans un lycée', 'des élèves suivent l’option théâtre', 'l’option musique', 'ne suivent aucune des deux options', 'un élève', 'qu’il suive les deux options', 'des élèves suit les deux options'],
          ['Dans un tournoi', 'des joueurs jouent sur console', 'sur ordinateur', 'ne jouent sur aucun des deux', 'un joueur', 'qu’il joue sur les deux supports', 'des joueurs joue sur les deux supports'],
        ])
        const asProb = Math.random() < 0.4
        return T('Ni l’un ni l’autre', numeric(
          `${ctx[0]}, ${pA} % ${ctx[1]}, ${pB} % ${ctx[2]} et ${pN} % ${ctx[3]}. ${asProb ? `On choisit ${ctx[4]} au hasard : quelle est la probabilité ${ctx[5]} ? (nombre décimal)` : `Quel pourcentage ${ctx[6]} ?`}`,
          asProb ? pAB / 100 : pAB, { explanation: `P(A ∪ B) = 1 − ${fmt(pN / 100)} = ${fmt((100 - pN) / 100)}. P(A ∩ B) = P(A) + P(B) − P(A ∪ B) = ${fmt(pA / 100)} + ${fmt(pB / 100)} − ${fmt((100 - pN) / 100)} = ${fmt(pAB / 100)}, soit ${pAB} %.` }))
      }
    },
    // Seconde évolution à trouver.
    () => {
      for (;;) {
        const a = pick([10, 20, 25, 50, 60, 100, -20, -50, -10]), x = randInt(1, 12) * 5 * pick([1, -1])
        if (x === -a || x <= -100) continue
        const g = r6((cmul(a) * cmul(x) - 1) * 100)
        if (g === 0 || !isClean(g, 2)) continue
        const what = pick(['Un prix', 'Le nombre de visiteurs d’un musée', 'La production d’un verger', 'Le loyer d’une échoppe'])
        return T('L’évolution manquante', numeric(
          `${what} ${a > 0 ? 'augmente' : 'baisse'} de ${Math.abs(a)} %, puis subit une seconde évolution. Au total, l'évolution est de ${evo(g)}. Quel est le taux de la seconde évolution, en % ? (Réponse signée.)`,
          x, { explanation: `${fmt(cmul(a))} × c = ${fmt(cmul(g))}, donc c = ${fmt(cmul(g))} ÷ ${fmt(cmul(a))} = ${fmt(cmul(x))}, soit ${evo(x)}.` }))
      }
    },
    // Médiane d'une série donnée par ses effectifs.
    () => {
      const ctx = pick([
        { s: 'Dans une classe, on a relevé le nombre de livres lus pendant l’été', v0: 0, un: (v: number) => `${v} livre${v > 1 ? 's' : ''}`, who: 'élève' },
        { s: 'On a relevé le nombre de buts marqués par une équipe à chaque match de la saison', v0: 0, un: (v: number) => `${v} but${v > 1 ? 's' : ''}`, who: 'match' },
        { s: 'Un magasin a noté les pointures des chaussures vendues dans la journée', v0: 36, un: (v: number) => `pointure ${v}`, who: 'paire' },
        { s: 'Une archère a noté ses scores lors de ses tirs d’entraînement', v0: 5, un: (v: number) => `${v} points`, who: 'tir' },
      ])
      const k = randInt(4, 6)
      const counts = Array.from({ length: k }, () => randInt(1, 9))
      const N = counts.reduce((s, c) => s + c, 0)
      const vals: number[] = []
      counts.forEach((c, i) => { for (let j = 0; j < c; j++) vals.push(ctx.v0 + i) })
      const med = N % 2 ? vals[(N - 1) / 2] : (vals[N / 2 - 1] + vals[N / 2]) / 2
      const list = counts.map((c, i) => `${ctx.un(ctx.v0 + i)} : ${c} ${ctx.who}${c > 1 ? 's' : ''}`).join(' ; ')
      return T('La valeur du milieu', numeric(`${ctx.s} : ${list}. Quelle est la médiane de cette série ?`, med, {
        explanation: `Effectif total : ${N}. ${N % 2 ? `La médiane est la ${(N + 1) / 2}e valeur` : `La médiane est la moyenne des ${N / 2}e et ${N / 2 + 1}e valeurs`} dans l'ordre croissant (effectifs cumulés : ${counts.map((_, i) => counts.slice(0, i + 1).reduce((s, c) => s + c, 0)).join(', ')}) : ${fmt(med)}.`,
      }))
    },
    // Deux dés : tableau à double entrée.
    () => {
      const ev = pick([
        (() => { const s = randInt(4, 10); return { txt: `que la somme des deux dés soit égale à ${s}`, ok: (a: number, b: number) => a + b === s } })(),
        (() => { const s = randInt(5, 10); return { txt: `que la somme des deux dés soit supérieure ou égale à ${s}`, ok: (a: number, b: number) => a + b >= s } })(),
        { txt: 'que le produit des deux dés soit pair', ok: (a: number, b: number) => (a * b) % 2 === 0 },
        (() => { const k = randInt(1, 6); return { txt: `d’obtenir au moins un ${k}`, ok: (a: number, b: number) => a === k || b === k } })(),
        (() => { const d = randInt(1, 3); return { txt: `que l’écart entre les deux dés soit égal à ${d}`, ok: (a: number, b: number) => Math.abs(a - b) === d } })(),
        (() => { const p = pick([6, 8, 10, 12]); return { txt: `que le produit des deux dés soit supérieur ou égal à ${p}`, ok: (a: number, b: number) => a * b >= p } })(),
      ])
      let fav = 0
      for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) if (ev.ok(a, b)) fav++
      return T('Les deux dés', fraction(`On lance deux dés équilibrés à 6 faces. Quelle est la probabilité ${ev.txt} ?`, fav, 36, {
        explanation: `Le tableau à double entrée compte 36 issues équiprobables ; ${fav} conviennent. P = ${F(fav, 36)} = ${fracText(fav, 36)}.`,
      }))
    },
    // Coefficient inconnu.
    () => {
      for (;;) {
        const c1 = randInt(1, 4), x = randInt(1, 6), n1 = randInt(4, 19), n2 = randInt(4, 19)
        if (n1 === n2 || x === c1) continue
        const m = r6((n1 * c1 + n2 * x) / (c1 + x))
        if (!isClean(m, 2)) continue
        const who = prenom()
        return T('Le coefficient oublié', numeric(
          `${who} a obtenu ${n1} à un devoir de coefficient ${c1} et ${n2} à un examen dont le coefficient a été oublié. Sa moyenne sur ces deux notes vaut ${fmt(m)}. Quel est le coefficient de l'examen ?`,
          x, { explanation: `(${n1} × ${c1} + ${n2}x) ÷ (${c1} + x) = ${fmt(m)} ⟺ ${n1 * c1} + ${n2}x = ${fmt(r6(m * c1))} + ${fmt(m)}x ⟺ ${tm(n2 - m, 'x')} = ${fmt(r6(m * c1 - n1 * c1))} ⟺ x = ${x}.` }))
      }
    },
  ],
  [
    // Taux moyen sur deux périodes.
    () => {
      const t = pick([5, 10, 20, 25, 30, 40, 50, -10, -20, -30, -50])
      const g = r6((cmul(t) ** 2 - 1) * 100)
      const ctx = pick([
        ['En deux ans, la population d’une ville a', 'Quel taux annuel, identique les deux années, donne cette évolution ?'],
        ['En deux mois, le prix d’un article a', 'Quel taux mensuel, identique les deux mois, donne cette évolution ?'],
        ['En deux saisons, le nombre de joueurs d’un jeu a', 'Quel taux par saison, identique les deux fois, donne cette évolution ?'],
      ])
      return T('Le taux moyen', numeric(
        `${ctx[0]} ${g > 0 ? 'augmenté' : 'baissé'} de ${fmt(Math.abs(g))} %. ${ctx[1]} (en %, signé)`, t, {
          explanation: `(1 + t)² = ${fmt(cmul(g))}. Comme 1 + t > 0, 1 + t = √${fmt(cmul(g))} = ${fmt(cmul(t))}, soit t = ${evo(t)}.`,
        }))
    },
    // Fréquence conditionnelle.
    () => {
      for (;;) {
        const a = randInt(2, 8) * 10, b = pick([5, 10, 15, 20, 25, 30, 40]), c = pick([5, 10, 15, 20, 25, 30, 40])
        if (b === c) continue
        const ctx = pick([
          { s: `Dans une entreprise, ${a} % des employés sont des femmes. ${b} % des femmes et ${c} % des hommes sont cadres.`, q: 'Quelle proportion des cadres sont des femmes ?', A: 'femmes cadres', B: 'hommes cadres' },
          { s: `Dans une armée, ${a} % des soldats sont des archers. ${b} % des archers et ${c} % des autres soldats sont des vétérans.`, q: 'Quelle proportion des vétérans sont des archers ?', A: 'archers vétérans', B: 'autres vétérans' },
          { s: `Dans un lycée, ${a} % des élèves sont internes. ${b} % des internes et ${c} % des externes font partie d'un club.`, q: 'Quelle proportion des membres des clubs sont internes ?', A: 'internes en club', B: 'externes en club' },
        ])
        const nA = a * b, nB = (100 - a) * c
        return T('La part cachée', fraction(`${ctx.s} ${ctx.q} (fraction ou décimal)`, nA, nA + nB, {
          explanation: `Sur 10 000 personnes : ${ctx.A} : ${big(a * 100)} × ${fmt(b / 100)} = ${big(nA)} ; ${ctx.B} : ${big((100 - a) * 100)} × ${fmt(c / 100)} = ${big(nB)}. Proportion : ${F(nA, nA + nB)} = ${fracText(nA, nA + nB)}.`,
        }))
      }
    },
    // Effectif manquant pour obtenir une moyenne.
    () => {
      for (;;) {
        const n1 = randInt(5, 30), m1 = randInt(8, 17), m2 = randInt(6, 18), m = r6(randInt(Math.min(m1, m2) * 2 + 1, Math.max(m1, m2) * 2 - 1) / 2)
        if (m1 === m2 || m === m1 || m === m2) continue
        const n2 = r6((n1 * (m1 - m)) / (m - m2))
        if (!isClean(n2, 0) || n2 < 2 || n2 > 60) continue
        const ctx = pick([['Le groupe A', 'élèves', 'le groupe B', 'note moyenne', 'd’élèves'], ['La troupe A', 'archers', 'la troupe B', 'note moyenne au tir', 'd’archers'], ['L’équipe A', 'joueurs', 'l’équipe B', 'moyenne de points', 'de joueurs']])
        return T('Combien sont-ils ?', numeric(
          `${ctx[0]} compte ${n1} ${ctx[1]}, avec une ${ctx[3]} de ${m1} ; ${ctx[2]} a une ${ctx[3]} de ${m2}. Ensemble, leur ${ctx[3]} vaut ${fmt(m)}. Combien ${ctx[4]} compte ${ctx[2]} ?`,
          n2, { explanation: `(${n1} × ${m1} + ${m2}n) ÷ (${n1} + n) = ${fmt(m)} ⟺ ${n1 * m1} + ${m2}n = ${fmt(r6(m * n1))} + ${fmt(m)}n ⟺ ${tm(m2 - m, 'n')} = ${fmt(r6(m * n1 - n1 * m1))} ⟺ n = ${n2}.` }))
      }
    },
    // Multiples de a ou de b.
    () => {
      const a = randInt(2, 9)
      let b = randInt(2, 9)
      while (b === a || a % b === 0 || b % a === 0) b = randInt(2, 9)
      const N = randInt(30, 120), L = lcm(a, b)
      const na = Math.floor(N / a), nb = Math.floor(N / b), nab = Math.floor(N / L)
      const neither = Math.random() < 0.35
      const fav = neither ? N - na - nb + nab : na + nb - nab
      return T('Le tirage des jetons', fraction(
        `Un sac contient ${N} jetons numérotés de 1 à ${N}. On en tire un au hasard. Quelle est la probabilité que son numéro ${neither ? `ne soit ni un multiple de ${a}, ni un multiple de ${b}` : `soit un multiple de ${a} ou de ${b}`} ?`,
        fav, N, { explanation: `Multiples de ${a} : ${na} ; de ${b} : ${nb} ; des deux (multiples de ${L}) : ${nab}. Multiples de ${a} ou de ${b} : ${na} + ${nb} − ${nab} = ${na + nb - nab}.${neither ? ` Les autres : ${N} − ${na + nb - nab} = ${fav}.` : ''} P = ${fracText(fav, N)}.` }))
    },
    // Évolution globale de deux populations.
    () => {
      for (;;) {
        const nA = randInt(2, 30) * 100, nB = randInt(2, 30) * 100, a = randInt(1, 10) * 5, b = randInt(1, 10) * 5
        const g = r6(((nA * a - nB * b) / (nA + nB)))
        if (g === 0 || !isClean(g, 2)) continue
        const ctx = pick([
          ['Le magasin A a vendu', 'articles l’an dernier, et le magasin B', 'Cette année, les ventes de A augmentent', 'celles de B baissent', 'des ventes des deux magasins'],
          ['Le village A comptait', 'habitants, et le village B', 'En dix ans, la population de A augmente', 'celle de B baisse', 'de la population totale des deux villages'],
          ['La section judo d’un club comptait', 'licenciés, et la section escrime', 'Cette saison, les effectifs du judo augmentent', 'ceux de l’escrime baissent', 'des effectifs des deux sections réunies'],
        ])
        return T('L’évolution d’ensemble', numeric(
          `${ctx[0]} ${big(nA)} ${ctx[1]} ${big(nB)}. ${ctx[2]} de ${a} % et ${ctx[3]} de ${b} %. Quelle est l'évolution ${ctx[4]}, en % ? (Réponse signée.)`,
          g, { explanation: `Avant : ${big(nA + nB)}. Après : ${big(nA)} × ${fmt(cmul(a))} + ${big(nB)} × ${fmt(cmul(-b))} = ${fmt(r6(nA * cmul(a) + nB * cmul(-b)))}. Taux : (${fmt(r6(nA * cmul(a) + nB * cmul(-b)))} − ${big(nA + nB)}) ÷ ${big(nA + nB)} = ${evo(g)}.` }))
      }
    },
  ],
]

export const UPGRADES_2NDE: Record<string, Ladder> = {
  '2-nombres': nombres,
  '2-lit': lit,
  '2-eq': eq,
  '2-fct': fct,
  '2-vect': vect,
  '2-droites': droites,
  '2-stat': stat,
}
