// Variations et extremums (2nde) : croissance / décroissance, tableaux de variations et courbes, maximum /
// minimum, comparaison d'images, nombre de solutions de f(x) = k, extremum d'un trinôme en contexte.
import {
  F, choice, fmt, gcd, interval, numeric, par, pick, poly, randInt, randNonZero, variants, fresh, withMeta,
  type Exercise, type Ladder, type SubjectContent, type Tiers,
} from '../utils'
import { graphFigure, type Figure } from '../figure'
import { T, retry, unionEx, iv, vf } from './2-ens'
import { prenom } from '../contexts'

// ── Aides locales ───────────────────────────────────────────────────────
type Node = [number, number]
const rnd = randInt
const RED = '#b8362f'
const BLUE = '#3f6fb0'
const INF = Infinity

/** Points « tournants » d'une fonction : abscisses croissantes, sens de variation alterné. */
function genNodes(n: number, o: { yMin?: number; yMax?: number; dy?: [number, number]; span?: number; x0?: [number, number] } = {}): Node[] {
  const yMin = o.yMin ?? -5, yMax = o.yMax ?? 7, [d0, d1] = o.dy ?? [2, 6]
  return retry(() => {
    const xs = [rnd(...(o.x0 ?? [-6, -1]))]
    for (let i = 1; i < n; i++) xs.push(xs[i - 1] + rnd(2, 4))
    if (xs[n - 1] - xs[0] > (o.span ?? 14) || xs.includes(0)) return null
    let dir = pick([1, -1])
    const ys = [rnd(yMin, yMax)]
    for (let i = 1; i < n; i++) { ys.push(ys[i - 1] + dir * rnd(d0, d1)); dir = -dir }
    if (ys.some((y) => y < yMin || y > yMax)) return null
    const mx = Math.max(...ys), mn = Math.min(...ys)
    if (ys.filter((y) => y === mx).length > 1 || ys.filter((y) => y === mn).length > 1) return null
    return xs.map((x, i) => [x, ys[i]] as Node)
  })
}
/** Interpolation « en cosinus » : monotone entre deux nœuds, tangente horizontale aux nœuds. */
const smooth = (N: Node[]) => (x: number) => {
  let i = 0
  while (i < N.length - 2 && x > N[i + 1][0]) i++
  const [xa, ya] = N[i], [xb, yb] = N[i + 1]
  const t = Math.min(1, Math.max(0, (x - xa) / (xb - xa)))
  return ya + ((yb - ya) * (1 - Math.cos(Math.PI * t))) / 2
}
interface Piece { a: number; b: number; ya: number; yb: number; up: boolean }
const piecesOf = (N: Node[]): Piece[] => N.slice(1).map((p, i) => ({ a: N[i][0], b: p[0], ya: N[i][1], yb: p[1], up: p[1] > N[i][1] }))
/** Nombre de solutions de f(x) = k (f strictement monotone entre deux nœuds). */
function nSol(N: Node[], k: number) {
  let n = N.filter((p) => p[1] === k).length
  for (const P of piecesOf(N)) if ((k - P.ya) * (k - P.yb) < 0) n++
  return n
}
/** Valeur k (entière, jamais une valeur du tableau), le plus souvent comprise entre le minimum et le maximum. */
const pickK = (N: Node[]) => retry(() => {
  const lo = Math.min(...N.map((p) => p[1])), hi = Math.max(...N.map((p) => p[1]))
  const v = Math.random() < 0.85 ? rnd(lo + 1, hi - 1) : pick([lo - rnd(1, 3), hi + rnd(1, 3)])
  return N.every((p) => p[1] !== v) ? v : null
})
const maxOf = (N: Node[]) => N.reduce((m, p) => (p[1] > m[1] ? p : m))
const minOf = (N: Node[]) => N.reduce((m, p) => (p[1] < m[1] ? p : m))
const dom = (N: Node[]) => `[${fmt(N[0][0])} ; ${fmt(N[N.length - 1][0])}]`
const word = (up: boolean) => (up ? 'croissante' : 'décroissante')

/** Tableau de variations dessiné (lignes x et f(x), flèches). */
function varTable(N: Node[], o: { fn?: string; v?: string } = {}): Figure {
  const fn = o.fn ?? 'f', v = o.v ?? 'x'
  const w = 320, h = 122, xL = 56, top = 6, mid = 34, bot = 116
  const fig: Figure = { w, h, points: {}, segments: [], notes: [], caption: '' }
  const P = fig.points
  const hid = (k: string, x: number, y: number) => { P[k] = { x, y, hidden: true, label: '' } }
  hid('_c1', 4, top); hid('_c2', w - 4, top); hid('_c3', w - 4, bot); hid('_c4', 4, bot)
  hid('_m1', 4, mid); hid('_m2', w - 4, mid); hid('_v1', xL, top); hid('_v2', xL, bot)
  for (const [a, b] of [['_c1', '_c2'], ['_c2', '_c3'], ['_c3', '_c4'], ['_c4', '_c1'], ['_m1', '_m2'], ['_v1', '_v2']]) fig.segments!.push({ a, b })
  fig.notes!.push({ x: xL / 2 + 2, y: 25, text: v }, { x: xL / 2 + 2, y: 80, text: `${fn}(${v})` })
  const n = N.length, X = (i: number) => xL + 22 + (i * (w - xL - 44)) / (n - 1)
  const high = N.map((p, i) => (i > 0 ? p[1] > N[i - 1][1] : p[1] > N[1][1]))
  N.forEach((p, i) => {
    fig.notes!.push({ x: X(i), y: 25, text: fmt(p[0]) })
    fig.notes!.push({ x: X(i), y: high[i] ? 54 : 110, text: fmt(p[1]) })
  })
  for (let i = 0; i < n - 1; i++) {
    const up = N[i + 1][1] > N[i][1]
    hid(`_a${i}`, X(i) + 16, up ? 96 : 56); hid(`_b${i}`, X(i + 1) - 16, up ? 56 : 96)
    fig.segments!.push({ a: `_a${i}`, b: `_b${i}`, head: true })
  }
  return fig
}
/** Repère adapté à des nœuds (et éventuellement d'autres points à voir). */
function windowFor(xs: number[], ys: number[]) {
  const xMin = Math.min(-1, Math.floor(Math.min(...xs)) - 1), xMax = Math.max(1, Math.ceil(Math.max(...xs)) + 1)
  const yMin = Math.min(-1, Math.floor(Math.min(...ys)) - 1), yMax = Math.max(1, Math.ceil(Math.max(...ys)) + 1)
  const sx = xMax - xMin, sy = yMax - yMin
  return { xMin, xMax, yMin, yMax, labelStep: sx > 13 ? 2 : 1, ystep: sy > 16 ? 2 : 1, ylabelStep: sy > 16 ? 4 : sy > 10 ? 2 : 1, h: 240 }
}
/** Courbe lisse passant par les nœuds, tracée sur son ensemble de définition (extrémités marquées). */
function curveFig(N: Node[], color = RED): Figure {
  const g = graphFigure(windowFor(N.map((p) => p[0]), N.map((p) => p[1])))
  g.plot(smooth(N), { a: N[0][0], b: N[N.length - 1][0], color })
  for (const [k, p] of [N[0], N[N.length - 1]].entries()) {
    const [x, y] = g.at(p[0], p[1])
    g.figure.points[`_e${k}`] = { x, y, label: '' }
  }
  return g.figure
}
/** Courbe d'une fonction quelconque sur [a ; b], dans une fenêtre qui contient les points utiles. */
function fnFig(f: (x: number) => number, a: number, b: number, extraY: number[] = [], opts: { names?: [string, string] } = {}) {
  const ys: number[] = [...extraY]
  for (let i = 0; i <= 40; i++) ys.push(f(a + ((b - a) * i) / 40))
  const W = windowFor([a, b], ys)
  const g = graphFigure(W)
  g.plot(f, { a, b })
  if (opts.names && g.figure.axes) g.figure.axes.names = opts.names
  return g
}
/** Intervalle fermé [a ; b] (réponse). */
const closed = (a: number, b: number) => iv(a, b, true, true)
/** Fraction réduite empilée (ou entier). */
const fr = (n: number, d: number) => { const g = gcd(n, d); return d / g === 1 ? fmt(n / g) : F(n / g, d / g) }
/** Monôme (n/d)x : x, 2x, {2/3}x. */
const frx = (n: number, d: number) => (n === d ? 'x' : `${fr(n, d)}x`)
const ivT = (a: number, b: number) => `[${fmt(a)} ; ${fmt(b)}]`
/** Valeur non entière (milieu décalé) strictement à l'intérieur de ]a ; b[. */
const inside = (a: number, b: number) => {
  return retry(() => {
    const v = Math.round((a + (b - a) * pick([0.25, 0.4, 0.5, 0.6, 0.75])) * 10) / 10
    return v !== 0 && v !== a && v !== b ? v : null
  })
}
/** Trinôme écrit sous forme canonique a(x − α)² + β. */
const canon = (a: number, al: number, be: number) => {
  const sq = al === 0 ? 'x²' : `(${poly([1, 'x'], [-al, ''])})²`
  const head = a === 1 ? sq : a === -1 ? `−${sq}` : `${fmt(a)}${sq}`
  return be === 0 ? head : `${head} ${be < 0 ? '−' : '+'} ${fmt(Math.abs(be))}`
}
const tri = (a: number, b: number, c: number, v = 'x') => poly([a, `${v}²`], [b, v], [c, ''])

/** Nombre d'entiers k pour lesquels f(x) = k a `want` solutions (−1 : au moins une), lu sur un tableau. */
function countK(n: number, want: number, what: string, expl: (ks: number[], c: number, N: Node[]) => string): Exercise {
  const N = genNodes(n, { yMin: -9, yMax: 12, dy: [3, 9] }), fn = pick(['f', 'g', 'h', 'u']), v = pick(['x', 't'])
  const ks: number[] = []
  for (let k = -12; k <= 15; k++) if (want < 0 ? nSol(N, k) >= 1 : nSol(N, k) === want) ks.push(k)
  return withMeta(numeric(`Voici le tableau de variations de ${fn}. Pour combien de valeurs entières de k l'équation ${fn}(${v}) = k admet-elle ${what} ?`, ks.length, {
    explanation: expl(ks, ks.length, N).replace(/^f /, `${fn} `),
  }), { figure: varTable(N, { fn, v }) })
}

const CONTEXTS = [
  { fn: 'h', v: 't', what: 'la hauteur h(t) (en m) d’un cerf-volant', noun: 'la hauteur', pr: 'elle', unit: 'min', up: 'monte', down: 'descend' },
  { fn: 'T', v: 't', what: 'la température T(t) (en °C) d’un four', noun: 'la température', pr: 'elle', unit: 'min', up: 'augmente', down: 'baisse' },
  { fn: 'N', v: 't', what: 'le niveau N(t) (en dm) de l’eau du puits', noun: 'le niveau de l’eau', pr: 'il', unit: 'h', up: 'monte', down: 'baisse' },
  { fn: 'V', v: 't', what: 'le nombre V(t) de visiteurs (en centaines) à la foire', noun: 'le nombre de visiteurs', pr: 'il', unit: 'h', up: 'augmente', down: 'diminue' },
] as const

// ── Entraînement ────────────────────────────────────────────────────────
const tiers: Tiers = [
  // Palier 1 : lire un tableau, une courbe ; extremums
  [
    // Tableau de variations → intervalle de croissance / décroissance
    variants(
      () => { const N = genNodes(3), up = pick([true, false]), P = piecesOf(N).find((p) => p.up === up)!; return withMeta(interval(`Voici le tableau de variations d'une fonction f définie sur ${dom(N)}. Sur quel intervalle f est-elle ${word(up)} ?`, closed(P.a, P.b), { explanation: `La flèche ${up ? 'monte' : 'descend'} de x = ${fmt(P.a)} à x = ${fmt(P.b)} : f est ${word(up)} sur ${ivT(P.a, P.b)}.` }), { figure: varTable(N) }) },
      () => { const N = genNodes(4), P = piecesOf(N)[1]; return withMeta(interval(`D'après le tableau de variations de g, donne le plus grand intervalle sur lequel g est ${word(P.up)}.`, closed(P.a, P.b), { explanation: `Une seule flèche ${P.up ? 'monte' : 'descend'} : celle qui va de ${fmt(P.a)} à ${fmt(P.b)}. g est ${word(P.up)} sur ${ivT(P.a, P.b)}.` }), { figure: varTable(N, { fn: 'g' }) }) },
      () => { const N = genNodes(3, { x0: [0, 2] }), C = pick(CONTEXTS), up = pick([true, false]), P = piecesOf(N).find((p) => p.up === up)!; return withMeta(interval(`Le tableau donne les variations de ${C.what} en fonction du temps t (en ${C.unit}). Sur quel intervalle de temps ${C.noun} ${up ? C.up : C.down}-t-${C.pr} ?`, closed(P.a, P.b), { explanation: `On lit la flèche qui ${up ? 'monte' : 'descend'} : de t = ${fmt(P.a)} à t = ${fmt(P.b)}, soit ${ivT(P.a, P.b)}.` }), { figure: varTable(N, { fn: C.fn, v: C.v }) }) },
      () => { const N = genNodes(4), P = piecesOf(N)[pick([0, 2])], u = inside(P.a, P.b); return withMeta(interval(`Le tableau de variations de f montre deux intervalles où f est ${word(P.up)}. Donne celui qui contient ${fmt(u)}.`, closed(P.a, P.b), { explanation: `${fmt(u)} est entre ${fmt(P.a)} et ${fmt(P.b)} ; sur ${ivT(P.a, P.b)} la flèche ${P.up ? 'monte' : 'descend'}.` }), { figure: varTable(N) }) },
    ),
    // Courbe → maximum / minimum
    fresh(variants(
      () => { const N = genNodes(pick([3, 4])), M = maxOf(N); return withMeta(numeric(`Voici la courbe d'une fonction f définie sur ${dom(N)}. Quel est le maximum de f ?`, M[1], { explanation: `Le point le plus haut de la courbe est (${fmt(M[0])} ; ${fmt(M[1])}) : le maximum est ${fmt(M[1])}, atteint en x = ${fmt(M[0])}.` }), { figure: curveFig(N) }) },
      () => { const N = genNodes(pick([3, 4])), M = minOf(N); return withMeta(numeric(`La courbe représente une fonction g définie sur ${dom(N)}. Quel est le minimum de g ?`, M[1], { explanation: `Le point le plus bas est (${fmt(M[0])} ; ${fmt(M[1])}) : le minimum est ${fmt(M[1])}.` }), { figure: curveFig(N) }) },
      () => { const N = genNodes(pick([3, 4])), M = maxOf(N); return withMeta(numeric(`D'après la courbe de f, en quelle valeur de x le maximum de f est-il atteint ?`, M[0], { explanation: `Le point le plus haut a pour abscisse ${fmt(M[0])} (et pour ordonnée ${fmt(M[1])}, le maximum).` }), { figure: curveFig(N) }) },
      () => { const N = genNodes(pick([3, 4])), M = minOf(N); return withMeta(numeric(`On a tracé la courbe de h. Pour quelle valeur de x h(x) est-il le plus petit possible ?`, M[0], { explanation: `Le point le plus bas a pour abscisse ${fmt(M[0])} : le minimum ${fmt(M[1])} est atteint en x = ${fmt(M[0])}.` }), { figure: curveFig(N) }) },
    )),
    // Tableau de valeurs en contexte → intervalle
    variants(
      ...CONTEXTS.map((C) => () => {
        const n = rnd(5, 7), peak = rnd(1, n - 2), up = pick([true, false])
        const ys = retry(() => {
          const out = [up ? rnd(0, 5) : rnd(12, 20)]
          for (let i = 1; i < n; i++) out.push(out[i - 1] + (i <= peak === up ? 1 : -1) * rnd(1, 4))
          return out.every((y) => y >= 0) ? out : null
        })
        const t0 = rnd(0, 3), ts = ys.map((_, i) => t0 + i)
        const ask = pick([true, false])
        const I = ask === up ? closed(ts[0], ts[peak]) : closed(ts[peak], ts[n - 1])
        return interval(`Relevés : pour t = ${ts.join(' ; ')} (en ${C.unit}), ${C.fn}(t) = ${ys.join(' ; ')}, où ${C.fn}(t) est ${C.noun}${C.fn === 'h' ? ' d’un cerf-volant' : C.fn === 'T' ? ' d’un four' : C.fn === 'N' ? ' du puits' : ' à la foire (en centaines)'}. Entre deux relevés, ${C.fn} varie toujours dans le même sens. Sur quel intervalle la fonction ${C.fn} est-elle ${word(ask)} ?`, I, {
          explanation: `Les valeurs ${up ? 'augmentent' : 'diminuent'} jusqu'à t = ${ts[peak]} puis ${up ? 'diminuent' : 'augmentent'} : ${C.fn} est ${word(ask)} sur ${ivT(I.lo, I.hi)}.`,
        })
      }),
    ),
    // Tableau de variations → extremums
    fresh(variants(
      () => { const N = genNodes(pick([3, 4]), { yMin: -20, yMax: 30, dy: [3, 15] }), M = maxOf(N); return withMeta(numeric(`D'après le tableau de variations, quel est le maximum de f sur ${dom(N)} ?`, M[1], { explanation: `La plus grande valeur du tableau est ${fmt(M[1])}, atteinte en x = ${fmt(M[0])}.` }), { figure: varTable(N) }) },
      () => { const N = genNodes(pick([3, 4]), { yMin: -20, yMax: 30, dy: [3, 15] }), M = minOf(N); return withMeta(numeric(`Quel est le minimum de la fonction f dont voici le tableau de variations ?`, M[1], { explanation: `La plus petite valeur de la ligne f(x) est ${fmt(M[1])}, atteinte en x = ${fmt(M[0])}.` }), { figure: varTable(N) }) },
      () => { const N = genNodes(pick([3, 4]), { yMin: -20, yMax: 30, dy: [3, 15] }), M = maxOf(N); return withMeta(numeric(`En quelle valeur de x la fonction g atteint-elle son maximum ?`, M[0], { explanation: `Le maximum ${fmt(M[1])} se lit au-dessus de x = ${fmt(M[0])}.` }), { figure: varTable(N, { fn: 'g' }) }) },
      () => { const N = genNodes(pick([3, 4]), { yMin: -20, yMax: 30, dy: [3, 15] }), M = minOf(N); return withMeta(numeric(`Pour quelle valeur de t la fonction u atteint-elle son minimum ?`, M[0], { explanation: `Le minimum ${fmt(M[1])} est atteint en t = ${fmt(M[0])}.` }), { figure: varTable(N, { fn: 'u', v: 't' }) }) },
    )),
  ],
  // Palier 2 : comparer, lire des intervalles sur une courbe, nombre de solutions
  [
    // Comparer deux images sur un même intervalle de monotonie
    variants(
      () => { const N = genNodes(3), P = pick(piecesOf(N)), u = inside(P.a, P.b), v = retry(() => { const w = inside(P.a, P.b); return w !== u ? w : null }); const [s, t] = u < v ? [u, v] : [v, u]; const ans = P.up ? `f(${fmt(s)}) < f(${fmt(t)})` : `f(${fmt(s)}) > f(${fmt(t)})`; return withMeta(choice(`D'après le tableau de variations, compare f(${fmt(s)}) et f(${fmt(t)}).`, ans, [P.up ? `f(${fmt(s)}) > f(${fmt(t)})` : `f(${fmt(s)}) < f(${fmt(t)})`, `f(${fmt(s)}) = f(${fmt(t)})`, 'On ne peut pas conclure'], `${fmt(s)} et ${fmt(t)} sont dans ${ivT(P.a, P.b)} où f est ${word(P.up)} ; ${P.up ? 'une fonction croissante conserve l’ordre' : 'une fonction décroissante inverse l’ordre'}.`), { figure: varTable(N) }) },
      () => { const a = rnd(-5, 2), b = a + rnd(4, 8), up = pick([true, false]), s = a + rnd(1, 2) + 0.5, t = s + rnd(1, b - s - 0.5 > 1 ? 2 : 1); const ans = up ? `f(${fmt(s)}) < f(${fmt(t)})` : `f(${fmt(s)}) > f(${fmt(t)})`; return choice(`f est ${word(up)} sur [${fmt(a)} ; ${fmt(b)}]. Compare f(${fmt(s)}) et f(${fmt(t)}).`, ans, [up ? `f(${fmt(s)}) > f(${fmt(t)})` : `f(${fmt(s)}) < f(${fmt(t)})`, `f(${fmt(s)}) = f(${fmt(t)})`, 'On ne peut pas conclure'], `${fmt(s)} < ${fmt(t)} dans [${fmt(a)} ; ${fmt(b)}] et f y est ${word(up)}, donc ${ans}.`) },
      () => { const a = rnd(-5, 2), b = a + rnd(4, 8), up = pick([true, false]), s = a + rnd(1, 2) + 0.5, t = s + 1; const ans = up ? `g(${fmt(t)}) > g(${fmt(s)})` : `g(${fmt(t)}) < g(${fmt(s)})`; return choice(`La fonction g est ${word(up)} sur [${fmt(a)} ; ${fmt(b)}]. Quelle inégalité est vraie ?`, ans, [up ? `g(${fmt(t)}) < g(${fmt(s)})` : `g(${fmt(t)}) > g(${fmt(s)})`, `g(${fmt(t)}) = g(${fmt(s)})`], `${fmt(s)} < ${fmt(t)} et g est ${word(up)} : ${up ? 'les images sont rangées dans le même ordre' : 'l’ordre est inversé'}, donc ${ans}.`) },
      () => { const N = genNodes(3), P = pick(piecesOf(N)), u = inside(P.a, P.b), v = retry(() => { const w = inside(P.a, P.b); return w !== u ? w : null }); const [s, t] = u < v ? [u, v] : [v, u]; const ans = P.up ? `f(${fmt(s)}) < f(${fmt(t)})` : `f(${fmt(s)}) > f(${fmt(t)})`; return withMeta(choice(`Sans lire de valeurs, utilise le sens de variation de f (courbe ci-dessous) pour comparer f(${fmt(s)}) et f(${fmt(t)}).`, ans, [P.up ? `f(${fmt(s)}) > f(${fmt(t)})` : `f(${fmt(s)}) < f(${fmt(t)})`, `f(${fmt(s)}) = f(${fmt(t)})`], `Sur ${ivT(P.a, P.b)}, f est ${word(P.up)} et ${fmt(s)} < ${fmt(t)}, donc ${ans}.`), { figure: curveFig(N) }) },
    ),
    // Courbe → intervalles de monotonie
    variants(
      () => { const N = genNodes(3), up = pick([true, false]), P = piecesOf(N).find((p) => p.up === up)!; return withMeta(interval(`Voici la courbe de f, définie sur ${dom(N)}. Sur quel intervalle f est-elle ${word(up)} ?`, closed(P.a, P.b), { explanation: `La courbe ${up ? 'monte' : 'descend'} entre x = ${fmt(P.a)} et x = ${fmt(P.b)} : f est ${word(up)} sur ${ivT(P.a, P.b)}.` }), { figure: curveFig(N) }) },
      () => { const N = genNodes(4), P = piecesOf(N)[1]; return withMeta(interval(`La courbe représente g sur ${dom(N)}. Sur quel intervalle g est-elle ${word(P.up)} ?`, closed(P.a, P.b), { explanation: `La courbe ne ${P.up ? 'monte' : 'descend'} qu'entre x = ${fmt(P.a)} et x = ${fmt(P.b)} : ${ivT(P.a, P.b)}.` }), { figure: curveFig(N) }) },
      () => { const N = genNodes(4), P = piecesOf(N)[pick([0, 2])], u = inside(P.a, P.b); return withMeta(interval(`D'après la courbe, donne le plus grand intervalle contenant ${fmt(u)} sur lequel f est ${word(P.up)}.`, closed(P.a, P.b), { explanation: `Autour de ${fmt(u)}, la courbe ${P.up ? 'monte' : 'descend'} de x = ${fmt(P.a)} jusqu'à x = ${fmt(P.b)}.` }), { figure: curveFig(N) }) },
      () => { const N = genNodes(3, { x0: [0, 2] }), C = pick(CONTEXTS), up = pick([true, false]), P = piecesOf(N).find((p) => p.up === up)!; return withMeta(interval(`La courbe donne ${C.what.replace(/ \(en [^)]*\)/, '')} en fonction du temps t (en ${C.unit}). Sur quel intervalle de temps ${C.noun} ${up ? C.up : C.down}-t-${C.pr} ?`, closed(P.a, P.b), { explanation: `La courbe ${up ? 'monte' : 'descend'} de t = ${fmt(P.a)} à t = ${fmt(P.b)}.` }), { figure: curveFig(N) }) },
    ),
    // Nombre de solutions de f(x) = k (tableau)
    fresh(variants(
      () => { const N = genNodes(pick([3, 4]), { yMin: -12, yMax: 15, dy: [3, 9] }), k = pickK(N), n = nSol(N, k); return withMeta(numeric(`Combien de solutions l'équation f(x) = ${fmt(k)} admet-elle sur ${dom(N)} ?`, n, { explanation: `On compte les flèches qui « passent » par ${fmt(k)} (une solution par flèche qui va d'une valeur inférieure à une valeur supérieure à ${fmt(k)}, ou l'inverse) : ${n ? n : 'aucune'}.` }), { figure: varTable(N) }) },
      () => { const N = genNodes(pick([3, 4]), { yMin: -12, yMax: 15, dy: [3, 9] }), k = pickK(N), n = nSol(N, k); return withMeta(numeric(`Combien le nombre ${fmt(k)} a-t-il d'antécédents par f ?`, n, { explanation: `Chaque flèche qui encadre ${fmt(k)} donne un antécédent : ${n ? `il y en a ${n}` : 'aucune ne le fait, donc aucun antécédent'}.` }), { figure: varTable(N) }) },
      () => { const N = genNodes(pick([3, 4]), { yMin: -12, yMax: 15, dy: [3, 9] }), k = pickK(N), n = nSol(N, k); return withMeta(numeric(`La droite d'équation y = ${fmt(k)} coupe la courbe de f en combien de points ?`, n, { explanation: `C'est le nombre de solutions de f(x) = ${fmt(k)} : ${n} d'après le tableau.` }), { figure: varTable(N) }) },
      () => { const N = genNodes(3, { yMin: -12, yMax: 15, dy: [3, 9] }), k = pick([N[0][1], N[2][1]]), n = nSol(N, k); return withMeta(numeric(`Combien de solutions l'équation g(x) = ${fmt(k)} admet-elle sur ${dom(N)} ? Attention : ${fmt(k)} figure dans le tableau.`, n, { explanation: `${fmt(k)} est atteint en une borne de l'intervalle (c'est une solution), et ${n > 1 ? 'aussi sur l’autre flèche, qui passe par cette valeur' : 'l’autre flèche ne passe pas par cette valeur'} : ${n} solution${n > 1 ? 's' : ''}.` }), { figure: varTable(N, { fn: 'g' }) }) },
    )),
    // Extremum sur un sous-intervalle (tableau)
    fresh(variants(
      () => { const N = genNodes(4, { yMin: -12, yMax: 15, dy: [3, 9] }), i = pick([0, 1]), S = N.slice(i, i + 3), M = maxOf(S); return withMeta(numeric(`Quel est le maximum de f sur [${fmt(S[0][0])} ; ${fmt(S[2][0])}] ?`, M[1], { explanation: `Sur cet intervalle, on ne regarde que les valeurs ${S.map((p) => fmt(p[1])).join(' ; ')} : le maximum est ${fmt(M[1])}.` }), { figure: varTable(N) }) },
      () => { const N = genNodes(4, { yMin: -12, yMax: 15, dy: [3, 9] }), i = pick([0, 1]), S = N.slice(i, i + 3), M = minOf(S); return withMeta(numeric(`Quel est le minimum de f sur [${fmt(S[0][0])} ; ${fmt(S[2][0])}] ?`, M[1], { explanation: `Sur cet intervalle, les valeurs du tableau sont ${S.map((p) => fmt(p[1])).join(' ; ')} : le minimum est ${fmt(M[1])}.` }), { figure: varTable(N) }) },
      () => { const N = genNodes(4), i = pick([0, 1]), S = N.slice(i, i + 3), M = maxOf(S); return withMeta(numeric(`D'après la courbe, quel est le maximum de f sur l'intervalle [${fmt(S[0][0])} ; ${fmt(S[2][0])}] ?`, M[1], { explanation: `On ne garde que la partie de la courbe entre x = ${fmt(S[0][0])} et x = ${fmt(S[2][0])} : son point le plus haut a pour ordonnée ${fmt(M[1])}.` }), { figure: curveFig(N) }) },
      () => { const N = genNodes(4), i = pick([0, 1]), S = N.slice(i, i + 3), M = minOf(S); return withMeta(numeric(`D'après la courbe, quel est le minimum de f sur l'intervalle [${fmt(S[0][0])} ; ${fmt(S[2][0])}] ?`, M[1], { explanation: `Entre x = ${fmt(S[0][0])} et x = ${fmt(S[2][0])}, le point le plus bas a pour ordonnée ${fmt(M[1])}.` }), { figure: curveFig(N) }) },
    )),
  ],
  // Palier 3 : solutions sur une courbe, comparaisons délicates, encadrement, trinôme (sommet)
  [
    // Nombre de solutions de f(x) = k (courbe)
    fresh(variants(
      () => { const N = genNodes(pick([3, 4, 5]), { span: 14 }), k = pickK(N), n = nSol(N, k); return withMeta(numeric(`Voici la courbe de f sur ${dom(N)}. Combien de solutions l'équation f(x) = ${fmt(k)} admet-elle ?`, n, { explanation: `On trace la droite horizontale y = ${fmt(k)} : ${n ? `elle coupe la courbe en ${n} point${n > 1 ? 's' : ''}` : 'elle ne coupe pas la courbe'}.` }), { figure: curveFig(N) }) },
      () => { const N = genNodes(pick([3, 4, 5]), { span: 14 }), k = pickK(N), n = nSol(N, k); return withMeta(numeric(`D'après la courbe de g, combien le nombre ${fmt(k)} a-t-il d'antécédents par g ?`, n, { explanation: `Les antécédents de ${fmt(k)} sont les abscisses des points de la courbe d'ordonnée ${fmt(k)} : ${n ? `il y en a ${n}` : 'il n’y en a aucun'}.` }), { figure: curveFig(N) }) },
      () => { const N = genNodes(pick([4, 5]), { span: 14 }), n = nSol(N, 0); return N.every((p) => p[1] !== 0) ? withMeta(numeric(`En combien de points la courbe de f coupe-t-elle l'axe des abscisses ?`, n, { explanation: `On compte les solutions de f(x) = 0 : ${n}.` }), { figure: curveFig(N) }) : withMeta(numeric(`Combien de solutions l'équation f(x) = 0 a-t-elle (la courbe peut toucher l'axe sans le traverser) ?`, n, { explanation: `On compte tous les points de la courbe sur l'axe des abscisses : ${n}.` }), { figure: curveFig(N) }) },
      () => { const N = genNodes(pick([3, 4])), M = pick([maxOf(N), minOf(N)]), n = nSol(N, M[1]); return withMeta(numeric(`Combien de solutions l'équation f(x) = ${fmt(M[1])} admet-elle ? (Regarde bien la courbe.)`, n, { explanation: `${fmt(M[1])} est ${M === maxOf(N) ? 'le maximum' : 'le minimum'} de f : il n'est atteint qu'en x = ${fmt(M[0])}, donc ${n} solution.` }), { figure: curveFig(N) }) },
    )),
    // Comparaison : conclure ou non
    variants(
      () => retry(() => { const N = genNodes(3, { yMin: -12, yMax: 15, dy: [3, 12] }), [P, Q] = piecesOf(N), u = inside(P.a, P.b), v = inside(Q.a, Q.b); const loP = Math.min(P.ya, P.yb), hiP = Math.max(P.ya, P.yb), loQ = Math.min(Q.ya, Q.yb), hiQ = Math.max(Q.ya, Q.yb); const ans = hiP <= loQ ? `f(${fmt(u)}) < f(${fmt(v)})` : hiQ <= loP ? `f(${fmt(u)}) > f(${fmt(v)})` : 'On ne peut pas conclure'; return withMeta(choice(`D'après le tableau de variations, peut-on comparer f(${fmt(u)}) et f(${fmt(v)}) ?`, ans, [`f(${fmt(u)}) < f(${fmt(v)})`, `f(${fmt(u)}) > f(${fmt(v)})`, 'On ne peut pas conclure'], `f(${fmt(u)}) est strictement entre ${fmt(loP)} et ${fmt(hiP)} ; f(${fmt(v)}) est strictement entre ${fmt(loQ)} et ${fmt(hiQ)}. ${ans === 'On ne peut pas conclure' ? 'Ces encadrements se chevauchent : on ne peut pas conclure.' : `Les encadrements ne se chevauchent pas, donc ${ans}.`}`), { figure: varTable(N) }) }),
      () => { const N = genNodes(3, { yMin: -12, yMax: 15, dy: [3, 12] }), P = pick(piecesOf(N)), u = inside(P.a, P.b), c = pick([P.ya, P.yb]); const ans = c === Math.max(P.ya, P.yb) ? `f(${fmt(u)}) < ${fmt(c)}` : `f(${fmt(u)}) > ${fmt(c)}`; return withMeta(choice(`D'après le tableau de variations, compare f(${fmt(u)}) et ${fmt(c)}.`, ans, [ans.includes('<') ? `f(${fmt(u)}) > ${fmt(c)}` : `f(${fmt(u)}) < ${fmt(c)}`, `f(${fmt(u)}) = ${fmt(c)}`, 'On ne peut pas conclure'], `Sur ${ivT(P.a, P.b)}, f va de ${fmt(P.ya)} à ${fmt(P.yb)} ; ${fmt(u)} étant strictement à l'intérieur, f(${fmt(u)}) est strictement entre ces deux valeurs, donc ${ans}.`), { figure: varTable(N) }) },
      () => { const N = genNodes(3, { yMin: -12, yMax: 15, dy: [3, 12] }), M = pick([maxOf(N), minOf(N)]), isMax = M === maxOf(N), u = retry(() => { const v = inside(N[0][0], N[2][0]); return v !== M[0] ? v : null }); const ans = isMax ? `f(${fmt(u)}) < f(${fmt(M[0])})` : `f(${fmt(u)}) > f(${fmt(M[0])})`; return withMeta(choice(`Compare f(${fmt(u)}) et f(${fmt(M[0])}) à l'aide du tableau de variations.`, ans, [isMax ? `f(${fmt(u)}) > f(${fmt(M[0])})` : `f(${fmt(u)}) < f(${fmt(M[0])})`, 'On ne peut pas conclure'], `f(${fmt(M[0])}) = ${fmt(M[1])} est le ${isMax ? 'maximum' : 'minimum'} de f, atteint seulement en ${fmt(M[0])}, donc ${ans}.`), { figure: varTable(N) }) },
    ),
    // Encadrement : ensemble des valeurs prises
    variants(
      () => { const N = genNodes(pick([3, 4]), { yMin: -12, yMax: 15, dy: [3, 9] }), lo = minOf(N)[1], hi = maxOf(N)[1]; return withMeta(interval(`x décrit ${dom(N)}. Donne le plus petit intervalle qui contient toutes les valeurs f(x).`, closed(lo, hi), { explanation: `Le minimum de f est ${fmt(lo)} et son maximum ${fmt(hi)} : pour tout x de ${dom(N)}, ${fmt(lo)} ≤ f(x) ≤ ${fmt(hi)}.` }), { figure: varTable(N) }) },
      () => { const N = genNodes(4, { yMin: -12, yMax: 15, dy: [3, 9] }), i = pick([0, 1]), S = N.slice(i, i + 3), lo = minOf(S)[1], hi = maxOf(S)[1]; return withMeta(interval(`Pour x ∈ [${fmt(S[0][0])} ; ${fmt(S[2][0])}], encadre f(x) le plus précisément possible (donne l'intervalle).`, closed(lo, hi), { explanation: `Sur [${fmt(S[0][0])} ; ${fmt(S[2][0])}], le minimum est ${fmt(lo)} et le maximum ${fmt(hi)}.` }), { figure: varTable(N) }) },
      () => { const N = genNodes(pick([3, 4])), lo = minOf(N)[1], hi = maxOf(N)[1]; return withMeta(interval(`D'après la courbe, quel est l'ensemble des valeurs prises par f(x) quand x parcourt ${dom(N)} ?`, closed(lo, hi), { explanation: `La courbe va du niveau ${fmt(lo)} (point le plus bas) au niveau ${fmt(hi)} (point le plus haut) sans « trou » : ${ivT(lo, hi)}.` }), { figure: curveFig(N) }) },
      () => { const N = genNodes(3, { yMin: -12, yMax: 15, dy: [3, 9] }), P = pick(piecesOf(N)); return withMeta(interval(`Si x ∈ ${ivT(P.a, P.b)}, à quel intervalle appartient f(x) ?`, closed(Math.min(P.ya, P.yb), Math.max(P.ya, P.yb)), { explanation: `Sur ${ivT(P.a, P.b)}, f est ${word(P.up)} : f(x) va de ${fmt(P.ya)} à ${fmt(P.yb)}.` }), { figure: varTable(N) }) },
    ),
    // Trinôme : abscisse et ordonnée du sommet
    variants(
      () => { const al = randNonZero(-6, 6), d = rnd(1, 5), y = randInt(-9, 9); return numeric(`La parabole représentant une fonction du second degré passe par les points (${fmt(al - d)} ; ${fmt(y)}) et (${fmt(al + d)} ; ${fmt(y)}). Quelle est l'abscisse de son sommet ?`, al, { explanation: `Une parabole est symétrique par rapport à la droite verticale passant par son sommet : l'abscisse du sommet est le milieu de ${fmt(al - d)} et ${fmt(al + d)}, soit ${fmt(al)}.` }) },
      () => fresh(() => { const al = randNonZero(-6, 6), c = randInt(-9, 9); return numeric(`f(x) = ${tri(1, -2 * al, c)}. En quelle valeur de x f atteint-elle son minimum ?`, al, { explanation: `Pour ax² + bx + c, l'extremum est atteint en x = −${F('b', '2a')} = −${F(par(-2 * al), 2)} = ${fmt(al)}.` }) })(),
      () => fresh(() => { const p = randInt(-7, 5), q = p + 2 * rnd(1, 4), s = pick([1, -1]); return numeric(`f(x) = ${s < 0 ? '−' : ''}(${poly([1, 'x'], [-p, ''])})(${poly([1, 'x'], [-q, ''])}). En quelle valeur de x f atteint-elle son ${s > 0 ? 'minimum' : 'maximum'} ?`, (p + q) / 2, { explanation: `f s'annule en ${fmt(p)} et ${fmt(q)} ; par symétrie, l'extremum est au milieu : x = ${fmt((p + q) / 2)}.` }) })(),
      () => { const al = randInt(-4, 4), be = randInt(-4, 5), a = pick([1, -1]); const f = (x: number) => a * (x - al) ** 2 + be, g = fnFig(f, al - 3, al + 3, [be]); return withMeta(numeric(`On a tracé la courbe de f, fonction du second degré. Quel est l'extremum (${a > 0 ? 'minimum' : 'maximum'}) de f ?`, be, { explanation: `Le sommet de la parabole est le point (${fmt(al)} ; ${fmt(be)}) : l'extremum vaut ${fmt(be)}.` }), { figure: g.figure }) },
      () => { const al = randNonZero(-5, 5), be = randInt(-9, 9), a = pick([2, 3, -2, -3, 1, -1]); return numeric(`f(x) = ${canon(a, al, be)}. Quelle est la valeur ${a > 0 ? 'minimale' : 'maximale'} de f(x) ?`, be, { explanation: `${canon(a, al, 0)} est ${a > 0 ? 'positif' : 'négatif'} et s'annule en x = ${fmt(al)} : f(x) ${a > 0 ? '≥' : '≤'} ${fmt(be)} avec égalité en ${fmt(al)}.` }) },
    ),
  ],
  // Palier 4 : trinôme développé, sens de variation d'un trinôme, solutions sans figure, vrai / faux
  [
    // Extremum de ax² + bx + c
    fresh(variants(
      () => { const a = pick([1, 2, 3]), al = randNonZero(-5, 5), c = randInt(-9, 9), v = c - a * al * al; return numeric(`Quelle est la valeur minimale de f(x) = ${tri(a, -2 * a * al, c)} ?`, v, { explanation: `Le minimum est atteint en x = −${F('b', '2a')} = ${fmt(al)}, et f(${fmt(al)}) = ${fmt(v)}.` }) },
      () => { const a = pick([-1, -2, -3]), al = randNonZero(-5, 5), c = randInt(-9, 9), v = c - a * al * al; return numeric(`Quelle est la valeur maximale de g(x) = ${tri(a, -2 * a * al, c)} ?`, v, { explanation: `a = ${fmt(a)} < 0 : maximum en x = −${F('b', '2a')} = ${fmt(al)}, et g(${fmt(al)}) = ${fmt(v)}.` }) },
      () => { const a = pick([-1, -2, 2, 1]), al = randNonZero(-5, 5), c = randInt(-9, 9); return numeric(`f(x) = ${tri(a, -2 * a * al, c)}. Pour quelle valeur de x f atteint-elle son ${a > 0 ? 'minimum' : 'maximum'} ?`, al, { explanation: `x = −${F('b', '2a')} = −${F(par(-2 * a * al), par(2 * a))} = ${fmt(al)}.` }) },
      () => { const a = pick([1, -1]), al = randNonZero(-5, 5), c = randInt(-9, 9), v = c - a * al * al; return numeric(`Le trinôme h(x) = ${tri(a, -2 * a * al, c)} admet un ${a > 0 ? 'minimum' : 'maximum'}. Calcule-le.`, v, { explanation: `Forme canonique : h(x) = ${canon(a, al, v)}. L'extremum est ${fmt(v)}, atteint en ${fmt(al)}.` }) },
    )),
    // Sens de variation d'un trinôme
    variants(
      () => { const a = pick([1, 2, -1, -2]), al = randNonZero(-5, 5), c = randInt(-9, 9), up = pick([true, false]); const I = (a > 0) === up ? iv(al, INF, true, false) : iv(-INF, al, false, true); return interval(`Sur quel intervalle f(x) = ${tri(a, -2 * a * al, c)} est-elle ${word(up)} ?`, I, { explanation: `a = ${fmt(a)} ${a > 0 ? '> 0 : f décroît puis croît' : '< 0 : f croît puis décroît'}, le changement ayant lieu en x = ${fmt(al)}. f est ${word(up)} sur ${I.lo === -INF ? `]−∞ ; ${fmt(al)}]` : `[${fmt(al)} ; +∞[`}.` }) },
      () => { const a = pick([1, 3, -1, -3]), al = randNonZero(-5, 5), be = randInt(-9, 9), up = pick([true, false]); const I = (a > 0) === up ? iv(al, INF, true, false) : iv(-INF, al, false, true); return interval(`f(x) = ${canon(a, al, be)}. Donne le plus grand intervalle sur lequel f est ${word(up)}.`, I, { explanation: `Le sommet a pour abscisse ${fmt(al)} et a = ${fmt(a)} ${a > 0 ? '> 0 (parabole « vers le haut »)' : '< 0 (parabole « vers le bas »)'}.` }) },
      () => { const p = randInt(-7, 3), q = p + 2 * rnd(1, 4), s = pick([1, -1]), up = pick([true, false]), m = (p + q) / 2; const I = (s > 0) === up ? iv(m, INF, true, false) : iv(-INF, m, false, true); return interval(`f(x) = ${s < 0 ? '−' : ''}(${poly([1, 'x'], [-p, ''])})(${poly([1, 'x'], [-q, ''])}). Sur quel intervalle f est-elle ${word(up)} ?`, I, { explanation: `Le sommet est au milieu des racines ${fmt(p)} et ${fmt(q)} : x = ${fmt(m)}. La parabole est tournée vers le ${s > 0 ? 'haut' : 'bas'}.` }) },
      () => retry(() => { const a = pick([1, -1]), al = randInt(-3, 5), lo = al - rnd(1, 4), hi = al + rnd(1, 4), c = randInt(-9, 9), up = pick([true, false]); const I = (a > 0) === up ? closed(al, hi) : closed(lo, al); return interval(`f(x) = ${tri(a, -2 * a * al, c)} est définie sur [${fmt(lo)} ; ${fmt(hi)}]. Sur quel intervalle est-elle ${word(up)} ?`, I, { explanation: `Sommet en x = ${fmt(al)} ; a = ${fmt(a)}. Sur [${fmt(lo)} ; ${fmt(hi)}], f est ${word(up)} sur ${ivT(I.lo, I.hi)}.` }) }),
    ),
    // Solutions de f(x) = k à partir d'une description
    fresh(variants(
      () => { const N = genNodes(3, { yMin: -12, yMax: 15, dy: [3, 9] }), k = pickK(N), [P, Q] = piecesOf(N), n = nSol(N, k); return numeric(`f est définie sur ${dom(N)}, ${word(P.up)} sur ${ivT(P.a, P.b)} et ${word(Q.up)} sur ${ivT(Q.a, Q.b)}, avec f(${fmt(N[0][0])}) = ${fmt(N[0][1])}, f(${fmt(N[1][0])}) = ${fmt(N[1][1])} et f(${fmt(N[2][0])}) = ${fmt(N[2][1])}. Combien de solutions l'équation f(x) = ${fmt(k)} admet-elle ?`, n, { explanation: `Dresse le tableau de variations : ${fmt(k)} est atteint une fois sur chaque intervalle où f passe par ${fmt(k)}, soit ${n} fois.` }) },
      () => { const N = genNodes(4, { yMin: -12, yMax: 15, dy: [3, 9] }), k = pickK(N), n = nSol(N, k); return numeric(`Une fonction g change de sens de variation en ${fmt(N[1][0])} et en ${fmt(N[2][0])}. On sait que g(${N.map((p) => `${fmt(p[0])}) = ${fmt(p[1])}`).join(', g(')}. Combien de fois g prend-elle la valeur ${fmt(k)} sur ${dom(N)} ?`, n, { explanation: `Entre deux valeurs successives, g est monotone : on compte les intervalles dont les valeurs aux bornes encadrent ${fmt(k)}. Il y en a ${n}.` }) },
      () => { const N = genNodes(3, { yMin: -12, yMax: 15, dy: [3, 9] }), k = N[1][1], [P, Q] = piecesOf(N), n = nSol(N, k); return numeric(`f est ${word(P.up)} sur ${ivT(P.a, P.b)} puis ${word(Q.up)} sur ${ivT(Q.a, Q.b)} ; f(${fmt(N[0][0])}) = ${fmt(N[0][1])}, f(${fmt(N[1][0])}) = ${fmt(N[1][1])}, f(${fmt(N[2][0])}) = ${fmt(N[2][1])}. Combien de solutions l'équation f(x) = ${fmt(k)} a-t-elle ?`, n, { explanation: `${fmt(k)} est l'extremum atteint en ${fmt(N[1][0])} : une seule solution, x = ${fmt(N[1][0])}.` }) },
      () => { const N = genNodes(3, { yMin: -12, yMax: 15, dy: [3, 9] }), [P, Q] = piecesOf(N), M = P.up ? maxOf(N)[1] : minOf(N)[1], k = M + (P.up ? 1 : -1) * rnd(1, 4), n = nSol(N, k); return numeric(`f est ${word(P.up)} sur ${ivT(P.a, P.b)} puis ${word(Q.up)} sur ${ivT(Q.a, Q.b)} ; f(${fmt(N[0][0])}) = ${fmt(N[0][1])}, f(${fmt(N[1][0])}) = ${fmt(N[1][1])}, f(${fmt(N[2][0])}) = ${fmt(N[2][1])}. Combien de solutions l'équation f(x) = ${fmt(k)} a-t-elle ?`, n, { explanation: `f(x) ${P.up ? '≤' : '≥'} ${fmt(M)} pour tout x, et ${fmt(k)} est ${P.up ? 'plus grand' : 'plus petit'} : aucune solution.` }) },
    )),
    // Vrai / faux sur un tableau de variations
    variants(
      () => { const N = genNodes(pick([3, 4]), { yMin: -12, yMax: 15, dy: [3, 9] }), M = maxOf(N)[1], c = M + pick([-2, -1, 1, 3]); return withMeta(vf(`Vrai ou faux : « pour tout x de ${dom(N)}, f(x) ≤ ${fmt(c)} ».`, M <= c, `Le maximum de f est ${fmt(M)} ; ${M <= c ? `${fmt(M)} ≤ ${fmt(c)}, donc c'est vrai` : `f atteint ${fmt(M)} > ${fmt(c)}, donc c'est faux`}.`), { figure: varTable(N) }) },
      () => { const N = genNodes(pick([3, 4]), { yMin: -12, yMax: 15, dy: [3, 9] }), m = minOf(N)[1], c = m + pick([-2, -1, 1, 2]); return withMeta(vf(`Vrai ou faux : « f(x) > ${fmt(c)} pour tout x de ${dom(N)} ».`, m > c, `Le minimum de f est ${fmt(m)} ; ${m > c ? `il est > ${fmt(c)}, donc c'est vrai` : `f atteint ${fmt(m)} ≤ ${fmt(c)}, donc c'est faux`}.`), { figure: varTable(N) }) },
      () => { const N = genNodes(pick([3, 4]), { yMin: -12, yMax: 15, dy: [3, 9] }), lo = minOf(N)[1], hi = maxOf(N)[1], ok = lo <= 0 && hi >= 0; return withMeta(vf(`Vrai ou faux : « l'équation f(x) = 0 admet au moins une solution sur ${dom(N)} ».`, ok, `f prend toutes les valeurs entre ${fmt(lo)} et ${fmt(hi)} (sans trou). ${ok ? '0 est entre les deux : vrai.' : '0 n’est pas entre les deux : faux.'}`), { figure: varTable(N) }) },
      () => { const N = genNodes(4, { yMin: -12, yMax: 15, dy: [3, 9] }), P = piecesOf(N), i = pick([0, 1]), a = N[i][0], b = N[i + 2][0]; return withMeta(vf(`Vrai ou faux : « f est ${word(P[i].up)} sur [${fmt(a)} ; ${fmt(b)}] ».`, false, `Sur [${fmt(a)} ; ${fmt(b)}], f est d'abord ${word(P[i].up)} puis ${word(P[i + 1].up)} : elle n'est pas monotone sur cet intervalle.`), { figure: varTable(N) }) },
      () => { const N = genNodes(3, { yMin: -12, yMax: 15, dy: [3, 9] }), P = pick(piecesOf(N)), u = inside(P.a, P.b); return withMeta(vf(`Vrai ou faux : « f est ${word(P.up)} sur [${fmt(P.a)} ; ${fmt(u)}] ».`, true, `[${fmt(P.a)} ; ${fmt(u)}] est contenu dans ${ivT(P.a, P.b)} où f est ${word(P.up)} : c'est vrai.`), { figure: varTable(N) }) },
    ),
  ],
  // Palier 5 : optimisation, paramètre, comparaisons fines, extremum sur un intervalle
  [
    // Optimisation en contexte
    fresh(variants(
      () => { const L = 4 * rnd(5, 25); return numeric(`Avec ${L} m de clôture, on entoure un enclos rectangulaire adossé à un mur (le mur forme un côté, sans clôture). Les deux côtés perpendiculaires au mur mesurent x m. Quelle aire maximale (en m²) peut-on obtenir ?`, (L * L) / 8, { explanation: `A(x) = x(${L} − 2x) = −2x² + ${L}x, maximale en x = ${F(L, 4)} = ${L / 4} : A = ${L / 4} × ${L / 2} = ${(L * L) / 8} m².` }) },
      () => { const t = rnd(1, 4), v = 10 * t, h0 = rnd(1, 3); return numeric(`La hauteur (en m) d'une flèche tirée vers le haut est h(t) = ${tri(-5, v, h0, 't')} au bout de t secondes. Quelle hauteur maximale atteint-elle ?`, h0 + 5 * t * t, { explanation: `Le maximum est en t = −${F(v, '(−10)')} = ${t} s : h(${t}) = −5 × ${t * t} + ${v * t} + ${h0} = ${h0 + 5 * t * t} m.` }) },
      () => { const b = 2 * rnd(10, 40), c = rnd(10, 90); return numeric(`L'atelier fabrique x objets par jour ; son bénéfice (en écus) est B(x) = ${tri(-1, b, -c)}. Quel est le bénéfice maximal ?`, (b * b) / 4 - c, { explanation: `Maximum en x = ${F(b, 2)} = ${b / 2} : B(${b / 2}) = −${(b / 2) ** 2} + ${(b * b) / 2} − ${c} = ${(b * b) / 4 - c} écus.` }) },
      () => { const S = 2 * rnd(5, 30); return numeric(`Deux nombres ont pour somme ${S}. Quel est le plus grand produit possible de ces deux nombres ?`, (S * S) / 4, { explanation: `Si l'un vaut x, l'autre vaut ${S} − x ; P(x) = x(${S} − x) est maximal en x = ${S / 2} : P = ${S / 2}² = ${(S * S) / 4}.` }) },
      () => { const P = 4 * rnd(3, 25); return numeric(`Parmi tous les rectangles de périmètre ${P} cm, quelle est l'aire maximale (en cm²) ?`, (P * P) / 16, { explanation: `Avec une largeur x, la longueur est ${P / 2} − x et A(x) = x(${P / 2} − x), maximale en x = ${P / 4} : c'est le carré de côté ${P / 4}, d'aire ${(P * P) / 16} cm².` }) },
    )),
    // Paramètre k et nombre de solutions
    fresh(variants(
      () => countK(3, 2, 'exactement deux solutions', (ks, c) => `La droite y = k doit couper les deux flèches (sans passer par le sommet) : k = ${ks.map(fmt).join(' ; ')}, soit ${c} valeurs.`),
      () => countK(3, -1, 'au moins une solution', (_ks, c, N) => `f prend toutes les valeurs de ${fmt(minOf(N)[1])} à ${fmt(maxOf(N)[1])} : il y a ${c} entiers dans cet intervalle.`),
      () => countK(3, 1, 'une seule solution', (ks, c) => `On cherche les k atteints une seule fois : k = ${ks.map(fmt).join(' ; ')}, soit ${c} valeurs.`),
      () => countK(4, 3, 'exactement trois solutions', (ks, c) => (c ? `La droite y = k doit couper les trois flèches : k = ${ks.map(fmt).join(' ; ')}, soit ${c} valeur${c > 1 ? 's' : ''}.` : 'Aucune droite horizontale ne coupe les trois flèches : la réponse est zéro.')),
    )),
    // Comparaisons avec des nombres proches
    variants(
      () => { const [a, b, why] = pick<[string, string, string]>([['√2', '1,4', '√2 ≈ 1,414 > 1,4'], ['π', '3,14', 'π ≈ 3,1416 > 3,14'], ['√10', '3,2', '√10 ≈ 3,162 < 3,2'], [F(1, 3), '0,33', `${F(1, 3)} = 0,333… > 0,33`], [F(2, 3), '0,67', `${F(2, 3)} = 0,666… < 0,67`]]), up = pick([true, false]), aBig = why.includes('>'); const ans = (aBig === up) ? `f(${a}) > f(${b})` : `f(${a}) < f(${b})`; return choice(`f est ${word(up)} sur ℝ. Compare f(${a}) et f(${b}).`, ans, [ans.includes('>') ? `f(${a}) < f(${b})` : `f(${a}) > f(${b})`, `f(${a}) = f(${b})`], `${why} ; f étant ${word(up)}, ${up ? 'l’ordre est conservé' : 'l’ordre est inversé'} : ${ans}.`) },
      () => { const [a, b, why] = pick<[string, string, string]>([['−√3', '−1,7', '−√3 ≈ −1,732 < −1,7'], ['−π', '−3,15', '−π ≈ −3,1416 > −3,15'], ['−' + F(1, 3), '−0,3', `−${F(1, 3)} = −0,333… < −0,3`]]), up = pick([true, false]), aBig = why.includes('>'); const ans = (aBig === up) ? `g(${a}) > g(${b})` : `g(${a}) < g(${b})`; return choice(`g est ${word(up)} sur ℝ. Compare g(${a}) et g(${b}).`, ans, [ans.includes('>') ? `g(${a}) < g(${b})` : `g(${a}) > g(${b})`, `g(${a}) = g(${b})`], `${why} ; g étant ${word(up)}, ${up ? 'l’ordre est conservé' : 'l’ordre est inversé'} : ${ans}.`) },
      () => { const up = pick([true, false]), k = randNonZero(-5, 5), c = randInt(-9, 9); const res = (k > 0) === up; return choice(`f est ${word(up)} sur ℝ. Quel est le sens de variation de g(x) = ${k === 1 ? '' : k === -1 ? '−' : fmt(k)}f(x)${c ? ` ${c < 0 ? '−' : '+'} ${Math.abs(c)}` : ''} ?`, `g est ${word(res)}`, [`g est ${word(!res)}`, 'On ne peut pas savoir'], `Multiplier par ${fmt(k)} ${k > 0 ? 'conserve' : 'inverse'} l'ordre ; ajouter une constante ne change rien. g est donc ${word(res)}.`) },
      () => { const up = pick([true, false]), a = rnd(2, 9), n = a * a + rnd(1, 2 * a), sf = `f(√${n})`, tf = `f(${a + 1})`; const ans = up ? `${sf} < ${tf}` : `${sf} > ${tf}`; return choice(`f est ${word(up)} sur [0 ; +∞[. Compare ${sf} et ${tf}.`, ans, [up ? `${sf} > ${tf}` : `${sf} < ${tf}`, `${sf} = ${tf}`], `${a * a} < ${n} < ${(a + 1) ** 2}, donc ${a} < √${n} < ${a + 1} ; f étant ${word(up)}, ${ans}.`) },
    ),
    // Extremum d'un trinôme sur un intervalle
    fresh(variants(
      () => retry(() => { const al = randInt(-4, 4), a = rnd(-6, 2), b = a + rnd(3, 7), c = randInt(-9, 9); if (al <= a || al >= b || a * b === 0) return null; const f = (x: number) => x * x - 2 * al * x + c, M = Math.max(f(a), f(b)); return numeric(`f(x) = ${tri(1, -2 * al, c)} sur [${fmt(a)} ; ${fmt(b)}]. Quel est le maximum de f sur cet intervalle ?`, M, { explanation: `f décroît sur [${fmt(a)} ; ${fmt(al)}] puis croît sur [${fmt(al)} ; ${fmt(b)}] : le maximum est en une borne. f(${fmt(a)}) = ${fmt(f(a))}, f(${fmt(b)}) = ${fmt(f(b))}, donc ${fmt(M)}.` }) }),
      () => retry(() => { const al = randInt(-4, 4), a = al + rnd(1, 3), b = a + rnd(2, 5), c = randInt(-9, 9); if (a * b === 0) return null; const f = (x: number) => x * x - 2 * al * x + c; return numeric(`f(x) = ${tri(1, -2 * al, c)} sur [${fmt(a)} ; ${fmt(b)}]. Quel est le minimum de f sur cet intervalle ?`, f(a), { explanation: `Le sommet est en x = ${fmt(al)}, à gauche de l'intervalle : f est croissante sur [${fmt(a)} ; ${fmt(b)}], le minimum est f(${fmt(a)}) = ${fmt(f(a))}.` }) }),
      () => retry(() => { const al = randInt(-4, 4), be = randInt(-6, 9), b = al - rnd(1, 3), a = b - rnd(2, 5); if (a * b === 0) return null; const f = (x: number) => -((x - al) ** 2) + be; return numeric(`g(x) = ${canon(-1, al, be)} sur [${fmt(a)} ; ${fmt(b)}]. Quel est le maximum de g sur cet intervalle ?`, f(b), { explanation: `Le sommet (x = ${fmt(al)}) est à droite de l'intervalle : g est croissante sur [${fmt(a)} ; ${fmt(b)}], le maximum est g(${fmt(b)}) = ${fmt(f(b))}.` }) }),
      () => retry(() => { const al = randNonZero(-4, 4), a = al - rnd(1, 4), b = al + rnd(1, 4), c = randInt(-9, 9); if (a * b === 0) return null; const f = (x: number) => -(x * x) + 2 * al * x + c; return numeric(`h(x) = ${tri(-1, 2 * al, c)} sur [${fmt(a)} ; ${fmt(b)}]. Quel est le maximum de h sur cet intervalle ?`, f(al), { explanation: `Le sommet x = ${fmt(al)} est dans l'intervalle et a = −1 < 0 : le maximum est h(${fmt(al)}) = ${fmt(f(al))}.` }) }),
    )),
  ],
]

// ── Problèmes d'amélioration ────────────────────────────────────────────
const upgrades: Ladder = [
  [
    // Sommet par symétrie puis valeur
    () => fresh(() => {
      const al = randNonZero(-5, 5), d = retry(() => { const v = rnd(1, 4); return v !== Math.abs(al) ? v : null }), m = randInt(-9, 9), y = m + d * d
      return T('Le sommet caché', numeric(`f(x) = x² + bx + c vérifie f(${fmt(al - d)}) = f(${fmt(al + d)}) = ${fmt(y)}. Quel est le minimum de f ?`, m, {
        explanation: `Par symétrie, le sommet est en x = ${fmt(al)} (milieu de ${fmt(al - d)} et ${fmt(al + d)}). Donc f(x) = (${poly([1, 'x'], [-al, ''])})² + m et f(${fmt(al + d)}) = ${d * d} + m = ${fmt(y)}, d'où m = ${fmt(m)}.`,
      }))
    })(),
    // Retrouver c
    () => fresh(() => {
      const al = randNonZero(-6, 6), m = randInt(-9, 9)
      return T('Le bon réglage', numeric(`On veut que f(x) = ${poly([1, 'x²'], [-2 * al, 'x'])} + c ait pour minimum ${fmt(m)}. Quelle valeur faut-il donner à c ?`, al * al + m, {
        explanation: `Le minimum est en x = ${fmt(al)} : f(${fmt(al)}) = ${al * al} − ${2 * al * al} + c = c − ${al * al}. On veut c − ${al * al} = ${fmt(m)}, donc c = ${fmt(al * al + m)}.`,
      }))
    })(),
    // Inéquation par monotonie
    () => {
      const a = randNonZero(-9, 9), up = pick([true, false]), lt = pick([true, false])
      const I = (up === lt) ? iv(-INF, a, false, false) : iv(a, INF, false, false)
      return T('Le signe par la monotonie', unionEx(`f est strictement ${word(up)} sur ℝ et f(${fmt(a)}) = 0. Résous f(x) ${lt ? '<' : '>'} 0.`, [I], `f(x) ${lt ? '<' : '>'} 0 ⟺ f(x) ${lt ? '<' : '>'} f(${fmt(a)}) ⟺ x ${(up === lt) ? '<' : '>'} ${fmt(a)} (${up ? 'f conserve l’ordre' : 'f inverse l’ordre'}). Solution : ${I.lo === -INF ? `]−∞ ; ${fmt(a)}[` : `]${fmt(a)} ; +∞[`}.`, 'ex. ]−∞ ; 2['))
    },
  ],
  [
    // Exactement 3 solutions
    () => fresh(() => {
      const N = genNodes(4, { yMin: -9, yMax: 12, dy: [3, 9] })
      const ks: number[] = []
      for (let k = -12; k <= 15; k++) if (nSol(N, k) === 2) ks.push(k)
      const fn = pick(['f', 'g', 'h']), par0 = pick(['k', 'm', 'a'])
      return T('Deux rencontres exactement', withMeta(numeric(`Voici le tableau de variations de ${fn} sur ${dom(N)}. Pour combien de valeurs entières de ${par0} l'équation ${fn}(x) = ${par0} admet-elle exactement deux solutions ?`, ks.length, {
        explanation: `On fait glisser la droite y = ${par0} de bas en haut et on compte les points de rencontre avec la courbe (un sommet atteint ne compte qu'une fois). Exactement deux solutions pour ${ks.length ? `${par0} = ${ks.map(fmt).join(' ; ')} : ${ks.length} valeur${ks.length > 1 ? 's' : ''}` : `aucune valeur de ${par0} : la réponse est zéro`}.`,
      }), { figure: varTable(N) }))
    })(),
    // Rectangle sous une droite
    () => {
      const a = 2 * rnd(2, 5), b = a * pick([0.5, 1, 2])
      const g = graphFigure({ xMin: -1, xMax: a + 1, yMin: -1, yMax: b + 1, h: 220, ...(b > 12 ? { ystep: 2, ylabelStep: 4 } : b > 8 ? { ylabelStep: 2 } : {}) })
      g.plot((x) => b - (b / a) * x, { a: 0, b: a })
      const x0 = a * 0.35, y0 = b - (b / a) * x0
      const at = (k: string, x: number, y: number) => { const [px, py] = g.at(x, y); g.figure.points[k] = { x: px, y: py, label: k === 'M' ? 'M' : '', hidden: k !== 'M' } }
      at('_o', 0, 0); at('_p', x0, 0); at('M', x0, y0); at('_q', 0, y0)
      g.figure.polygons = [{ pts: ['_o', '_p', 'M', '_q'], fill: '#d9a441' }]
      return T('Le rectangle sous la droite', numeric(`M est un point de la droite d'équation y = ${poly([-b / a, 'x'], [b, ''])} d'abscisse x ∈ [0 ; ${a}]. Le rectangle coloré a pour sommets O, M et des points des axes. Quelle est son aire maximale ?`, (a * b) / 4, {
        explanation: `A(x) = x(${poly([-b / a, 'x'], [b, ''])}) = ${tri(-b / a, b, 0)}, maximale en x = ${fmt(a / 2)} (milieu de 0 et ${a}) : A = ${fmt(a / 2)} × ${fmt(b / 2)} = ${fmt((a * b) / 4)}.`,
      }), g.figure)
    },
    // Somme de carrés minimale
    () => fresh(() => {
      const S = 2 * rnd(3, 20)
      return T('Les carrés équilibrés', numeric(`Deux nombres réels ont pour somme ${S}. Quelle est la plus petite valeur possible de la somme de leurs carrés ?`, (S * S) / 2, {
        explanation: `Avec x et ${S} − x : f(x) = x² + (${S} − x)² = 2x² − ${2 * S}x + ${S * S}, minimale en x = ${S / 2}. f(${S / 2}) = 2 × ${(S / 2) ** 2} = ${(S * S) / 2}.`,
      }))
    })(),
  ],
  [
    // Le carré dans le carré
    () => {
      const c = 2 * rnd(2, 9), askX = pick([true, false])
      const k = 0.3, S = 6
      const raw: Record<string, [number, number]> = { A: [0, 0], B: [S, 0], C: [S, S], D: [0, S], M: [k * S, 0], N: [S, k * S], P: [S - k * S, S], Q: [0, S - k * S] }
      const pts: Figure['points'] = {}
      for (const [n, [x, y]] of Object.entries(raw)) pts[n] = { x: 95 + x * 22, y: 190 - y * 22 - 25, label: n }
      const fig: Figure = {
        w: 320, h: 200, points: pts, caption: 'La figure n’est pas à l’échelle.',
        segments: [{ a: 'A', b: 'M', label: 'x' }, { a: 'M', b: 'B' }, { a: 'B', b: 'N', label: 'x' }, { a: 'N', b: 'C' }, { a: 'C', b: 'P', label: 'x' }, { a: 'P', b: 'D' }, { a: 'D', b: 'Q', label: 'x' }, { a: 'Q', b: 'A' }, { a: 'M', b: 'N' }, { a: 'N', b: 'P' }, { a: 'P', b: 'Q' }, { a: 'Q', b: 'M' }],
        polygons: [{ pts: ['M', 'N', 'P', 'Q'], fill: '#d9a441' }],
      }
      return T('Le carré dans le carré', numeric(`ABCD est un carré de côté ${c} cm. On place M, N, P, Q sur ses côtés avec AM = BN = CP = DQ = x : MNPQ est un carré. ${askX ? 'Pour quelle valeur de x son aire est-elle minimale ?' : 'Quelle est l’aire minimale (en cm²) de MNPQ ?'}`, askX ? c / 2 : (c * c) / 2, {
        explanation: `Pythagore dans AMQ : MQ² = x² + (${c} − x)², donc l'aire vaut A(x) = 2x² − ${2 * c}x + ${c * c}, minimale en x = ${F(2 * c, 4)} = ${c / 2} : A = ${(c / 2) ** 2} + ${(c / 2) ** 2} = ${(c * c) / 2} cm².`,
      }), fig)
    },
    // Recette maximale
    () => fresh(() => {
      const B = rnd(2, 10), p0 = rnd(3, 12), A = 2 * B * p0
      return T('Le prix du billet', numeric(`Au prix de p écus, on vend ${A} − ${B}p billets pour le tournoi. La recette est R(p) = p(${A} − ${B}p). Quelle recette maximale (en écus) peut-on espérer ?`, B * p0 * p0, {
        explanation: `R(p) = −${B}p² + ${A}p est maximale en p = ${F(A, 2 * B)} = ${p0} écus : R(${p0}) = ${p0} × ${A - B * p0} = ${B * p0 * p0} écus.`,
      }))
    })(),
    // Ensemble des valeurs d'un trinôme sur un intervalle
    () => retry(() => {
      const al = randInt(-3, 3), be = randInt(-6, 6), a = al - rnd(1, 4), b = al + rnd(1, 4), s = pick([1, -1])
      const f = (x: number) => s * (x - al) ** 2 + be
      if (f(a) === f(b) || a * b === 0) return null
      const ext = s > 0 ? Math.max(f(a), f(b)) : Math.min(f(a), f(b))
      const I = s > 0 ? closed(be, ext) : closed(ext, be)
      return T('Toutes les valeurs', interval(`Quand x parcourt [${fmt(a)} ; ${fmt(b)}], quel est l'ensemble des valeurs prises par f(x) = ${canon(s, al, be)} ?`, I, {
        explanation: `Le sommet (${fmt(al)} ; ${fmt(be)}) est dans l'intervalle : ${s > 0 ? 'minimum' : 'maximum'} ${fmt(be)}. Aux bornes : f(${fmt(a)}) = ${fmt(f(a))}, f(${fmt(b)}) = ${fmt(f(b))}. L'ensemble des valeurs est ${ivT(I.lo, I.hi)}.`,
      }))
    }),
  ],
]

// ── Problèmes de l'hôtel de ville ───────────────────────────────────────
const age: Ladder = [
  [
    // La flèche de l'archer
    () => {
      const t = rnd(2, 4), H = rnd(5, 12), T0 = 2 * t
      const f = (x: number) => H - (H / (t * t)) * (x - t) ** 2
      const g = fnFig(f, 0, T0, [0], { names: ['t', 'h'] })
      const askTime = pick([true, false])
      return T('La flèche de l’archer', numeric(`${prenom()} tire une flèche vers le haut ${pick(['depuis le sol', 'au tournoi', 'dans la cour du château', 'au concours d’archerie'])}. La courbe donne sa hauteur h (en m) en fonction du temps t (en s), jusqu'à son retour au sol. ${askTime ? 'Au bout de combien de secondes la flèche est-elle au plus haut ?' : 'Quelle hauteur maximale (en m) la flèche atteint-elle ?'}`, askTime ? t : H, {
        explanation: `Le sommet de la courbe est le point (${t} ; ${H}) : la flèche monte pendant ${t} s jusqu'à ${H} m, puis redescend.`,
      }), g.figure)
    },
    // La crue de la rivière
    () => {
      const N = genNodes(pick([3, 4]), { yMin: 2, yMax: 30, dy: [3, 12], x0: [1, 3] })
      const M = maxOf(N), askDay = pick([true, false])
      return T('La crue de la rivière', numeric(`Le tableau donne les variations de la hauteur d'eau H (en dm) ${pick(['de la rivière', 'du fleuve', 'du torrent', 'du canal'])} en fonction du jour j du mois ${pick(['de mars', 'd’avril', 'de mai', 'd’octobre', 'de novembre'])}. ${askDay ? 'Quel jour le niveau est-il le plus haut ?' : 'Quelle hauteur maximale (en dm) l’eau atteint-elle ?'}`, askDay ? M[0] : M[1], {
        explanation: `Le maximum du tableau est ${fmt(M[1])} dm, atteint le jour ${fmt(M[0])}.`,
      }), varTable(N, { fn: 'H', v: 'j' }))
    },
    // Le prix du blé
    () => {
      const N = genNodes(pick([4, 5]), { yMin: 1, yMax: 9, x0: [0, 1], span: 14 })
      const up = pick([true, false])
      const sel = piecesOf(N).filter((p) => p.up === up), tot = sel.reduce((s, p) => s + p.b - p.a, 0)
      const g = graphFigure(windowFor(N.map((p) => p[0]), N.map((p) => p[1])))
      g.plot(smooth(N), { a: N[0][0], b: N[N.length - 1][0] })
      if (g.figure.axes) g.figure.axes.names = ['mois', 'prix']
      return T('Le prix du blé', numeric(`La courbe donne le prix d'un sac ${pick(['de blé', 'd’orge', 'de seigle', 'd’avoine'])} (en écus) ${pick(['au marché', 'à la foire', 'au moulin', 'au port'])} en fonction du mois. Pendant combien de mois au total le prix a-t-il ${up ? 'augmenté' : 'baissé'} ?`, tot, {
        explanation: `Le prix ${up ? 'augmente' : 'baisse'} sur ${sel.map((p) => ivT(p.a, p.b)).join(' et ')}, soit ${sel.map((p) => p.b - p.a).join(' + ')} = ${tot} mois.`,
      }), g.figure)
    },
  ],
  [
    // L'enclos du berger
    () => fresh(() => {
      const L = 4 * rnd(8, 30), askX = pick([true, false])
      const fig: Figure = {
        w: 320, h: 170, caption: 'La figure n’est pas à l’échelle.',
        points: {
          _r1: { x: 20, y: 30, hidden: true, label: '' }, _r2: { x: 300, y: 30, hidden: true, label: '' },
          A: { x: 90, y: 36, label: '' }, B: { x: 230, y: 36, label: '' }, C: { x: 230, y: 130, label: '' }, D: { x: 90, y: 130, label: '' },
        },
        segments: [{ a: '_r1', b: '_r2', color: BLUE }, { a: 'A', b: 'D', label: 'x' }, { a: 'D', b: 'C' }, { a: 'C', b: 'B', label: 'x' }],
        polygons: [{ pts: ['A', 'B', 'C', 'D'], fill: '#6aa86a' }],
        notes: [{ x: 160, y: 22, text: 'rivière' }],
      }
      return T('L’enclos du berger', numeric(`Un berger dispose de ${L} m de clôture pour faire un enclos rectangulaire le long d'une rivière (pas de clôture côté rivière). Les côtés perpendiculaires à la rivière mesurent x m. ${askX ? 'Quelle valeur de x donne l’aire maximale ?' : 'Quelle est l’aire maximale (en m²) ?'}`, askX ? L / 4 : (L * L) / 8, {
        explanation: `Le côté parallèle à la rivière mesure ${L} − 2x, donc A(x) = x(${L} − 2x) = −2x² + ${L}x. Maximum en x = ${F(L, 4)} = ${L / 4} m, et A = ${L / 4} × ${L / 2} = ${(L * L) / 8} m².`,
      }), fig)
    })(),
    // Le bénéfice de l'atelier
    () => fresh(() => {
      const m = rnd(3, 8), c = rnd(2, m * m - 4), b = 2 * m
      const f = (x: number) => -x * x + b * x - c
      const g = fnFig(f, 0, b, [m * m - c, -c])
      if (g.figure.axes) g.figure.axes.names = ['x', 'B']
      const askX = pick([true, false])
      return T('Le bénéfice de l’atelier', numeric(`Un atelier fabrique x lanternes par jour (0 ≤ x ≤ ${b}). Son bénéfice (en écus) est B(x) = ${tri(-1, b, -c)}, représenté ci-contre. ${askX ? 'Combien de lanternes faut-il fabriquer pour un bénéfice maximal ?' : 'Quel est le bénéfice maximal (en écus) ?'}`, askX ? m : m * m - c, {
        explanation: `B est maximal en x = −${F(b, '(−2)')} = ${m} : B(${m}) = −${m * m} + ${b * m} − ${c} = ${m * m - c} écus.`,
      }), g.figure)
    })(),
    // Le four du boulanger
    () => fresh(() => retry(() => {
      const N = genNodes(pick([4, 5]), { yMin: 2, yMax: 25, dy: [4, 16], x0: [1, 1], span: 16 }).map(([x, y]) => [(x - 1) * 5, y * 10] as Node)
      const k = 10 * rnd(3, 24)
      if (N.some((p) => p[1] === k) || nSol(N, k) < 1) return null
      const n = nSol(N, k)
      return T('Le four du boulanger', numeric(`Le tableau donne les variations de la température T (en °C) du four en fonction du temps t (en min). Le pain doit être enfourné quand le four est exactement à ${k} °C. Combien de fois cela se produit-il ?`, n, {
        explanation: `On compte les flèches qui passent par ${k} °C (une valeur strictement entre les deux nombres aux extrémités de la flèche) : ${n} fois.`,
      }), varTable(N, { fn: 'T', v: 't' }))
    }))(),
  ],
  [
    // Le prix du billet
    () => fresh(() => {
      const B = rnd(2, 8), p0 = rnd(4, 15), A = 2 * B * p0
      return T('Les billets du tournoi', numeric(`Pour le grand tournoi, si le billet coûte p écus, ${A} − ${B}p spectateurs viennent (pour 0 ≤ p ≤ ${A / B}). À quel prix (en écus) faut-il vendre le billet pour que la recette soit maximale ?`, p0, {
        explanation: `Recette R(p) = p(${A} − ${B}p) = −${B}p² + ${A}p, maximale en p = −${F(A, `(−${2 * B})`)} = ${p0} écus (recette ${B * p0 * p0} écus).`,
      }))
    })(),
    // La bannière (rectangle dans un triangle) avec dimension demandée
    () => {
      const a = 2 * rnd(2, 8), b = 2 * rnd(2, 6), askW = pick([true, false])
      const fig: Figure = (() => {
        const g = graphFigure({ xMin: -1, xMax: a + 1, yMin: -1, yMax: b + 1, h: 220, grid: false })
        const pt = (k: string, x: number, y: number, lab = '') => { const [px, py] = g.at(x, y); g.figure.points[k] = { x: px, y: py, label: lab, hidden: !lab } }
        const x0 = a * 0.35
        pt('A', 0, 0, 'A'); pt('B', a, 0, 'B'); pt('C', 0, b, 'C'); pt('_p', x0, 0); pt('M', x0, b - (b / a) * x0, 'M'); pt('_q', 0, b - (b / a) * x0)
        g.figure.axes = undefined
        g.figure.segments = [{ a: 'A', b: 'B', label: `${a} m` }, { a: 'A', b: 'C', label: `${b} m` }, { a: 'B', b: 'C' }]
        g.figure.polygons = [{ pts: ['A', '_p', 'M', '_q'], fill: '#d9a441' }]
        g.figure.caption = 'La figure n’est pas à l’échelle.'
        return g.figure
      })()
      return T('Le potager du coin', numeric(`Un terrain a la forme d'un triangle ABC rectangle en A, avec AB = ${a} m et AC = ${b} m. On y trace un potager rectangulaire de sommets A et M ∈ [BC] (côtés le long des murs [AB] et [AC]). ${askW ? 'Quelle longueur (en m) le long de [AB] donne le plus grand potager ?' : 'Quelle est l’aire maximale (en m²) du potager ?'}`, askW ? a / 2 : (a * b) / 4, {
        explanation: `Avec x le côté le long de [AB], l'autre côté vaut ${b} − ${frx(b, a)} (Thalès). A(x) = x(${b} − ${frx(b, a)}) est maximale en x = ${a / 2} m (milieu de 0 et ${a}), et A = ${a / 2} × ${b / 2} = ${(a * b) / 4} m².`,
      }), fig)
    },
    // Le boulet de la catapulte
    () => retry(() => {
      const D = 2 * rnd(4, 8), H = rnd(4, 10), d = rnd(1, D - 1), m = rnd(1, H)
      const f = (x: number) => (-4 * H / (D * D)) * x * (x - D)
      const hd = f(d), diff = Math.round((hd - m) * 100) / 100
      if (Math.abs(diff * 4) % 1 > 1e-9 || diff <= 0) return null
      const g = fnFig(f, 0, D, [0, m])
      const [wx, wy] = g.at(d, 0), [tx, ty] = g.at(d, m)
      g.figure.points._w1 = { x: wx, y: wy, hidden: true, label: '' }
      g.figure.points._w2 = { x: tx, y: ty, hidden: true, label: '' }
      g.figure.segments!.push({ a: '_w1', b: '_w2', color: '#3a2410' })
      g.figure.curves!.push({ pts: [[wx, wy], [tx, ty]], color: '#3a2410', width: 6 })
      return T('Le boulet de la catapulte', numeric(`Un boulet part du sol et y retombe ${D} m plus loin ; sa trajectoire est une parabole dont le sommet est à ${H} m de haut. Un mur de ${m} m de haut se dresse à ${d} m de la catapulte. De combien de mètres le boulet passe-t-il au-dessus du mur ?`, diff, {
        explanation: `La hauteur est h(x) = k·x(x − ${D}) avec un sommet en x = ${D / 2} : h(${D / 2}) = ${H} donne k = −${fr(4 * H, D * D)}. Alors h(${d}) = ${fmt(Math.round(hd * 100) / 100)} m, soit ${fmt(diff)} m au-dessus du mur.`,
      }), g.figure)
    }),
  ],
]

export const CONTENT: SubjectContent | null = { tiers, upgrades, age }
