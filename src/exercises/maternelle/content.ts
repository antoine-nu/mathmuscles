// Exercices de maternelle : tout se joue en images (et la consigne est lue à voix haute).
// La difficulté monte à chaque cran : nombres jusqu'à 5, 8, 10, 12 puis 15 ; écarts de plus en plus faibles dans les
// comparaisons (il faut compter, l'œil ne suffit plus) ; davantage de réponses proposées.
// Chaque maison a ses propres familles d'exercices (doigts, boîte de 10, balance, verres, encastrements…).
import { pick, randInt, shuffle, withMeta, type Exercise, type Ladder, type Maker, type SubjectContent, type Tiers } from '../utils'
import {
  COLOR_IDS, SHAPES, THINGS, THING_IDS, dice, line, scatter,
  type ColorName, type Pic, type Placed, type Relation, type Shape, type Thing,
} from './pics'

// ── Outils ──────────────────────────────────────────────────────────────
/** Exercice à choix en images : `good` est la bonne réponse, mélangée aux autres. */
function kid(o: { say: string; scene?: Pic; good: Pic; bad: Pic[]; explanation: string }): Exercise {
  const opts = shuffle([{ p: o.good, ok: true }, ...o.bad.map((p) => ({ p, ok: false }))])
  const answer = String(opts.findIndex((x) => x.ok))
  return {
    prompt: o.say,
    kind: 'choice',
    choices: opts.map((_, i) => String(i)),
    answer,
    explanation: o.explanation,
    check: (v) => v === answer,
    kid: { say: o.say, scene: o.scene, options: opts.map((x) => x.p) },
  }
}

/** Nombres en jeu à chaque palier (cran 1 à 5). */
const RANGE: [number, number][] = [[1, 5], [3, 8], [5, 10], [7, 12], [9, 15]]
/** Nombre de réponses proposées selon le palier. */
const CHOICES = [3, 3, 4, 4, 4]
/** Écart minimal entre les quantités à comparer (1 : il faut compter). */
const GAP = [3, 2, 1, 1, 1]
const inRange = (t: number, cap = 99) => randInt(Math.min(RANGE[t][0], cap), Math.min(RANGE[t][1], cap))
const plur = (t: Thing) => THINGS[t].plur
const sing = (t: Thing) => THINGS[t].sing
const fem = (t: Thing) => THINGS[t].art === 'une'
/** « le » / « la » */
const le = (t: Thing) => (fem(t) ? 'la' : 'le')
/** « la pomme », « l'étoile », « le ballon » */
const the = (t: Thing) => (/^[aeéiouh]/i.test(sing(t)) ? `l’${sing(t)}` : `${le(t)} ${sing(t)}`)
const noun = (n: number, t: Thing) => `${n} ${n > 1 ? plur(t) : sing(t)}`
const counting = (n: number) => Array.from({ length: n }, (_, i) => i + 1).join(', ')
const numWord = (n: number) => (n >= 10 ? 'le nombre' : 'le chiffre')
const digit = (n: number): Pic => ({ t: 'digit', n })
/** k − 1 nombres proches de n (le plus souvent à ±1 ou ±2), entre lo et hi, différents de n. */
function near(n: number, lo: number, hi: number, k: number): number[] {
  const pool = []
  for (let d = Math.max(0, lo); d <= hi; d++) if (d !== n) pool.push({ d, w: Math.abs(d - n) + Math.random() * 1.6 })
  return pool.sort((a, b) => a.w - b.w).slice(0, k - 1).map((x) => x.d)
}
const nearT = (n: number, t: number) => near(n, Math.max(1, RANGE[t][0] - 2), RANGE[t][1] + 2, CHOICES[t])
const setOf = (n: number, th: Thing, how: 'scatter' | 'line' | 'dice' = 'scatter', color?: ColorName, s?: number): Pic =>
  ({ t: 'set', items: how === 'dice' ? dice(n, th, color) : (how === 'line' && n <= 10 ? line : scatter)(n, () => ({ thing: th, color, s })) })
const thing = () => pick(THING_IDS)
const things = (k: number) => shuffle([...THING_IDS]).slice(0, k)
/** k quantités différentes entre lo et hi, séparées d'au moins gap. */
function counts(k: number, lo: number, hi: number, gap: number): number[] {
  for (let g = 0; g < 300; g++) {
    const c = shuffle(Array.from({ length: hi - lo + 1 }, (_, i) => lo + i)).slice(0, k)
    const sorted = [...c].sort((a, b) => a - b)
    if (sorted.every((v, i) => i === 0 || v - sorted[i - 1] >= gap)) return c
  }
  return Array.from({ length: k }, (_, i) => lo + i * gap)
}
const pickMore = () => Math.random() < 0.5

/** Tiers construits palier par palier : maker(t) renvoie les modèles du palier t (0 à 4). */
const tiersOf = (maker: (t: number) => Maker[]): Tiers => [maker(0), maker(1), maker(2), maker(3), maker(4)]

// ── Compter (collections, doigts, boîte de 10) ─────────────────────────
function compter(t: number): Maker[] {
  const count = (how: 'scatter' | 'line') => () => {
    const th = thing(), N = how === 'line' ? inRange(t, 10) : inRange(t)
    return kid({
      say: pick([`Combien y a-t-il de ${plur(th)} ?`, `Compte les ${plur(th)}. Combien y en a-t-il ?`, `Combien vois-tu de ${plur(th)} ?`]),
      scene: setOf(N, th, how),
      good: digit(N), bad: nearT(N, t).map(digit),
      explanation: `On compte en touchant chaque ${sing(th)} une seule fois : ${counting(N)}. Il y en a ${N}.`,
    })
  }
  const mixed = () => {
    const [a, b] = things(2), N = inRange(t), m = randInt(2, 2 + t)
    const kinds = shuffle([...Array(N).fill(a), ...Array(m).fill(b)] as Thing[])
    return kid({
      say: `Combien y a-t-il de ${plur(a)} ? Attention, ne compte que les ${plur(a)} !`,
      scene: { t: 'set', items: scatter(N + m, (i) => ({ thing: kinds[i] })) },
      good: digit(N), bad: nearT(N, t).map(digit),
      explanation: `On ne compte que les ${plur(a)} : ${counting(N)}. Il y en a ${N}.`,
    })
  }
  const fingers = () => {
    const N = randInt(Math.min(RANGE[t][0], 6), Math.min(10, RANGE[t][1]))
    return kid({
      say: pick(['Combien de doigts sont levés ?', 'Compte les doigts levés.', 'Combien de doigts vois-tu ?']),
      scene: { t: 'hands', n: N },
      good: digit(N), bad: near(N, 1, 10, CHOICES[t]).map(digit),
      explanation: N > 5 ? `Une main entière, c'est 5 ; plus ${N - 5}, cela fait ${N}.` : `${counting(N)} : ${N} doigts.`,
    })
  }
  const frame = () => {
    const N = inRange(t), color = pick(COLOR_IDS)
    return kid({
      say: pick(['Combien de jetons dans la boîte ?', 'Compte les jetons. Combien y en a-t-il ?', 'La boîte a dix cases. Combien de jetons ?']),
      scene: { t: 'frame', n: N, color },
      good: digit(N), bad: nearT(N, t).map(digit),
      explanation: N >= 5 ? `Une rangée pleine, c'est 5 ; une boîte pleine, c'est 10. Ici, il y a ${N} jetons.` : `Il y a ${N} jeton${N > 1 ? 's' : ''}.`,
    })
  }
  const showBox = () => {
    const th = thing(), N = inRange(t)
    return kid({
      say: `Montre la boîte où il y a ${noun(N, th)}.`,
      scene: digit(N),
      good: setOf(N, th), bad: nearT(N, t).map((d) => setOf(d, th)),
      explanation: `${N}, c'est ${counting(N)}.`,
    })
  }
  if (t === 0) return [count('scatter'), count('line'), fingers, showBox]
  if (t === 1) return [count('scatter'), count('line'), fingers, frame, showBox]
  return [count('scatter'), mixed, fingers, frame, showBox]
}

// ── Les nombres écrits (reconnaître, comptine, avant/après, comparer) ───
function chiffres(t: number): Maker[] {
  const max = RANGE[t][1], k = CHOICES[t]
  const hear = () => {
    const N = randInt(1, max)
    // à partir du cran 4, un piège : le nombre « à l'envers » (12 et 21)
    const mirror = N >= 10 && t >= 3 ? Number(String(N).split('').reverse().join('')) : 0
    const bad = [...new Set([...(mirror && mirror !== N ? [mirror] : []), ...near(N, 1, max + 2, k)])].filter((d) => d !== N).slice(0, k - 1)
    return kid({
      say: pick([`Montre ${numWord(N)} ${N}.`, `Où est ${numWord(N)} ${N} ?`, `Trouve ${numWord(N)} ${N}.`]),
      good: digit(N), bad: bad.map(digit),
      explanation: `C'est ${numWord(N)} ${N}.`,
    })
  }
  const after = () => {
    const N = randInt(Math.min(4, max), max), len = t >= 2 ? 4 : 3
    const start = Math.max(1, N - len)
    const row = Array.from({ length: N - start }, (_, i) => digit(start + i))
    return kid({
      say: pick([`Quel nombre vient après ${N - 1} ?`, 'Continue la comptine. Quel nombre vient après ?', 'Quel est le nombre suivant ?']),
      scene: { t: 'row', items: row, hole: row.length },
      good: digit(N), bad: near(N, 1, max + 2, k).map(digit),
      explanation: `On récite la comptine : ${counting(N)}. Après ${N - 1} vient ${N}.`,
    })
  }
  const before = () => {
    const N = randInt(1, max - 3)
    return kid({
      say: pick([`Quel nombre vient juste avant ${N + 1} ?`, 'Quel nombre manque au début ?', 'Quel nombre vient avant ?']),
      scene: { t: 'row', items: [digit(N + 1), digit(N + 2), digit(N + 3)], hole: 0 },
      good: digit(N), bad: near(N, 1, max, k).map(digit),
      explanation: `${N}, puis ${N + 1}, ${N + 2}, ${N + 3} : avant ${N + 1} vient ${N}.`,
    })
  }
  const missing = (back: boolean) => () => {
    const start = randInt(1, max - 4), hole = randInt(1, 3)
    const nums = [start, start + 1, start + 2, start + 3, start + 4]
    if (back) nums.reverse()
    const N = nums[hole]
    return kid({
      say: back ? pick(['Compte à rebours. Quel nombre manque ?', 'On compte en reculant. Quel nombre manque ?', 'Fusée ! Quel nombre manque ?']) : pick(['Quel nombre manque ?', 'Il manque un nombre. Lequel ?', 'Trouve le nombre qui manque.']),
      scene: { t: 'row', items: nums.filter((_, i) => i !== hole).map(digit), hole },
      good: digit(N), bad: near(N, 1, max + 1, k).map(digit),
      explanation: `${nums.join(', ')} : il manquait ${N}.`,
    })
  }
  const biggest = () => {
    const more = pickMore(), c = counts(k, 1, max, t >= 3 ? 1 : 2), best = more ? Math.max(...c) : Math.min(...c)
    return kid({
      say: more ? pick(['Montre le plus grand nombre.', 'Quel nombre est le plus grand ?', 'Trouve le nombre le plus grand.']) : pick(['Montre le plus petit nombre.', 'Quel nombre est le plus petit ?', 'Trouve le nombre le plus petit.']),
      good: digit(best), bad: c.filter((x) => x !== best).map(digit),
      explanation: `Dans la comptine, ${best} vient ${more ? 'après' : 'avant'} les autres : c'est le plus ${more ? 'grand' : 'petit'}.`,
    })
  }
  const diceFace = () => {
    const N = randInt(1, 6)
    return kid({
      say: pick(['Combien de points sur le dé ?', 'Regarde le dé. Combien de points ?', 'Quel chiffre va avec ce dé ?']),
      scene: { t: 'dice', n: N },
      good: digit(N), bad: near(N, 1, 7, k).map(digit),
      explanation: `Le dé montre ${N} point${N > 1 ? 's' : ''}.`,
    })
  }
  const twoDice = () => {
    const a = randInt(1, 6), b = randInt(1, 6)
    return kid({
      say: pick(['Combien de points en tout sur les deux dés ?', 'Compte tous les points des deux dés.', 'Deux dés : combien de points en tout ?']),
      scene: { t: 'row', items: [{ t: 'dice', n: a }, { t: 'dice', n: b }] },
      good: digit(a + b), bad: near(a + b, 2, 12, k).map(digit),
      explanation: `${a} et ${b}, cela fait ${a + b}.`,
    })
  }
  const toFingers = () => {
    const N = randInt(Math.min(RANGE[t][0], 6), Math.min(10, max))
    return kid({
      say: pick([`Montre la main qui fait ${N}.`, `Quelles mains montrent ${N} doigts ?`, `Trouve ${N} doigts levés.`]),
      scene: digit(N),
      good: { t: 'hands', n: N }, bad: near(N, 1, 10, Math.min(k, 3)).map((d) => ({ t: 'hands', n: d } as Pic)),
      explanation: N > 5 ? `${N}, c'est une main entière et encore ${N - 5}.` : `${N} doigts levés.`,
    })
  }
  if (t === 0) return [hear, after, diceFace, toFingers]
  if (t === 1) return [hear, after, missing(false), diceFace, biggest]
  if (t === 2) return [hear, before, missing(false), biggest, toFingers]
  if (t === 3) return [hear, before, missing(true), biggest, twoDice]
  return [hear, after, before, missing(true), biggest, twoDice]
}

// ── Plus, moins, autant ────────────────────────────────────────────────
function quantites(t: number): Maker[] {
  const [lo, hi] = RANGE[t], k = t < 2 ? 2 : 3
  const most = () => {
    const more = pickMore(), th = thing(), c = counts(k, Math.max(1, lo - 1), hi, GAP[t])
    const best = more ? Math.max(...c) : Math.min(...c)
    // à partir du cran 3, la boîte la plus remplie n'a pas forcément l'air la plus pleine : objets de tailles différentes
    const box = (n: number) => setOf(n, th, 'scatter', undefined, t >= 2 ? (n === best ? (more ? 0.75 : 1.25) : 0.9 + Math.random() * 0.25) : undefined)
    return kid({
      say: more ? pick([`Où y a-t-il le plus de ${plur(th)} ?`, `Montre la boîte avec le plus de ${plur(th)}.`, `Quelle boîte a le plus de ${plur(th)} ?`])
        : pick([`Où y a-t-il le moins de ${plur(th)} ?`, `Montre la boîte avec le moins de ${plur(th)}.`, `Quelle boîte a le moins de ${plur(th)} ?`]),
      good: box(best), bad: c.filter((x) => x !== best).map(box),
      explanation: `Il y en a ${c.join(', ')} : c'est ${best} le ${more ? 'plus' : 'moins'}.`,
    })
  }
  const towers = () => {
    const more = pickMore(), c = counts(k, Math.max(1, lo - 1), Math.min(14, hi), GAP[t]), color = pick(COLOR_IDS)
    const best = more ? Math.max(...c) : Math.min(...c)
    // à partir du cran 2, des cubes de tailles différentes : les tours ont presque la même hauteur, il faut compter
    const H = randInt(140, 195)
    const size = (n: number) => (t >= 1 ? Math.max(8, Math.min(48, Math.round((t >= 2 ? H : H * 0.6 + n * 9) / n))) : 14)
    const tower = (n: number): Pic => ({ t: 'tower', n, color, size: size(n) })
    return kid({
      say: more ? pick(['Quelle tour a le plus de cubes ?', 'Montre la tour avec le plus de cubes.', 'Où y a-t-il le plus de cubes ?'])
        : pick(['Quelle tour a le moins de cubes ?', 'Montre la tour avec le moins de cubes.', 'Où y a-t-il le moins de cubes ?']),
      good: tower(best), bad: c.filter((x) => x !== best).map(tower),
      explanation: `Les tours ont ${c.join(', ')} cubes${t >= 2 ? ' : la plus haute n’est pas forcément celle qui en a le plus' : ''}.`,
    })
  }
  const same = () => {
    const th = thing(), N = inRange(t), other = t >= 1 ? thing() : th
    const scene: Pic = t >= 3 ? { t: 'frame', n: N, color: pick(COLOR_IDS) } : setOf(N, th, 'line')
    return kid({
      say: t >= 3 ? pick(['Trouve la boîte avec autant d’objets que de jetons.', 'Compte les jetons. Où y a-t-il autant d’objets ?', 'Montre la boîte qui a le même nombre d’objets que de jetons.']) : pick(['Trouve la boîte où il y en a autant.', 'Montre la boîte qui en a pareil.', 'Où y en a-t-il autant ?']),
      scene,
      good: setOf(N, other), bad: nearT(N, t).slice(0, CHOICES[t] - 1).map((d) => setOf(d, other)),
      explanation: `Il y en a ${N} de chaque côté : autant.`,
    })
  }
  const howManyMore = () => {
    const [a, b] = things(2), A = randInt(Math.max(3, lo), Math.min(10, hi)), diff = randInt(1, Math.min(4, A - 1)), B = A - diff
    const gap = Math.min(190 / A, 40), s = Math.min(1, gap / 40)
    const items: Placed[] = [
      ...Array.from({ length: A }, (_, i) => ({ thing: a, x: 100 + (i - (A - 1) / 2) * gap, y: 42, s })),
      ...Array.from({ length: B }, (_, i) => ({ thing: b, x: 100 + (i - (A - 1) / 2) * gap, y: 108, s })),
    ]
    return kid({
      say: `Combien de ${plur(b)} faut-il ajouter pour en avoir autant que de ${plur(a)} ?`,
      scene: { t: 'set', items },
      good: digit(diff), bad: near(diff, 0, 6, CHOICES[t]).map(digit),
      explanation: `Il y a ${A} ${plur(a)} et ${B} ${B > 1 ? plur(b) : sing(b)} : il en manque ${diff}.`,
    })
  }
  if (t < 2) return [most, towers, same, () => (pickMore() ? most() : towers())]
  if (t === 2) return [most, towers, same, howManyMore]
  return [most, towers, same, howManyMore, storyAdd(hi), storyRemove(hi)]
}

// ── Grand, petit, long, court, lourd, plein ────────────────────────────
function grandeurs(t: number): Maker[] {
  const k = CHOICES[t]
  /** k valeurs distinctes, d'autant plus proches que le palier est élevé. */
  const values = (lo: number, hi: number, step: number) => {
    const base = lo + Math.random() * Math.max(0, hi - lo - step * (k - 1))
    return shuffle(Array.from({ length: k }, (_, i) => base + i * step))
  }
  const STEP = [0.35, 0.27, 0.2, 0.15, 0.11]
  const size = () => {
    const big = pickMore(), th = thing(), s = values(0.55, 1.65, STEP[t]), best = big ? Math.max(...s) : Math.min(...s)
    const adj = big ? (fem(th) ? 'grande' : 'grand') : fem(th) ? 'petite' : 'petit'
    return kid({
      say: pick([`Montre ${le(th)} plus ${adj} ${sing(th)}.`, `${fem(th) ? 'Quelle' : 'Quel'} ${sing(th)} est ${le(th)} plus ${adj} ?`, `Trouve ${the(th)} ${le(th)} plus ${adj}.`]),
      good: { t: 'thing', thing: th, s: best }, bad: s.filter((x) => x !== best).map((x) => ({ t: 'thing', thing: th, s: x } as Pic)),
      explanation: big ? 'C’est celui qui prend le plus de place.' : 'C’est celui qui prend le moins de place.',
    })
  }
  const pencil = () => {
    const long = pickMore(), l = values(0.15, 1, STEP[t] * 0.7), best = long ? Math.max(...l) : Math.min(...l), color = pick(COLOR_IDS)
    // à partir du cran 3, les crayons ne partent pas du même endroit : on regarde les deux bouts
    const from = () => (t >= 2 ? Math.random() * 0.3 : 0)
    return kid({
      say: long ? pick(['Montre le crayon le plus long.', 'Quel crayon est le plus long ?', 'Trouve le plus long crayon.']) : pick(['Montre le crayon le plus court.', 'Quel crayon est le plus court ?', 'Trouve le plus court crayon.']),
      good: { t: 'bar', len: best, color, from: from() }, bad: l.filter((x) => x !== best).map((x) => ({ t: 'bar', len: x, color, from: from() } as Pic)),
      explanation: t >= 2 ? 'Attention : les crayons ne partent pas du même endroit. On regarde le début et la fin de chacun.' : long ? 'C’est celui qui va le plus loin.' : 'C’est celui qui s’arrête le plus tôt.',
    })
  }
  const balance = () => {
    const [a, b] = things(2), heavier = pickMore() ? 'left' : 'right'
    const heavy = heavier === 'left' ? a : b, light = heavier === 'left' ? b : a
    const askHeavy = pickMore()
    const want = askHeavy ? heavy : light
    return kid({
      say: askHeavy ? pick(['Quel objet est le plus lourd ?', 'Regarde la balance. Montre le plus lourd.', 'Qui est le plus lourd ?']) : pick(['Quel objet est le plus léger ?', 'Regarde la balance. Montre le plus léger.', 'Qui est le plus léger ?']),
      scene: { t: 'balance', left: a, right: b, heavier },
      good: { t: 'thing', thing: want }, bad: [{ t: 'thing', thing: want === a ? b : a }, ...(t >= 3 ? [{ t: 'thing', thing: pick(THING_IDS.filter((x) => x !== a && x !== b)) } as Pic] : [])],
      explanation: `Le côté le plus lourd descend : ${the(heavy)} est plus lourd${fem(heavy) ? 'e' : ''} que ${the(light)}.`,
    })
  }
  const glass = () => {
    const full = pickMore(), l = values(0.15, 0.95, STEP[t] * 0.75), best = full ? Math.max(...l) : Math.min(...l)
    return kid({
      say: full ? pick(['Montre le verre le plus rempli.', 'Quel verre contient le plus d’eau ?', 'Où y a-t-il le plus d’eau ?']) : pick(['Montre le verre le moins rempli.', 'Quel verre contient le moins d’eau ?', 'Où y a-t-il le moins d’eau ?']),
      good: { t: 'glass', level: best }, bad: l.filter((x) => x !== best).map((x) => ({ t: 'glass', level: x } as Pic)),
      explanation: full ? 'L’eau monte le plus haut dans ce verre.' : 'L’eau monte le moins haut dans ce verre.',
    })
  }
  const sameLength = () => {
    const l = shuffle([0.2, 0.4, 0.6, 0.8, 1]).slice(0, k), target = l[0], color = pick(COLOR_IDS)
    return kid({
      say: pick(['Trouve le crayon aussi long que celui-ci.', 'Quel crayon a la même longueur ?', 'Montre le crayon pareil.']),
      scene: { t: 'bar', len: target, color: 'violet' },
      good: { t: 'bar', len: target, color, from: Math.random() * 0.3 }, bad: l.slice(1).map((x) => ({ t: 'bar', len: x, color, from: Math.random() * 0.3 } as Pic)),
      explanation: 'Les deux crayons ont la même longueur, même s’ils ne commencent pas au même endroit.',
    })
  }
  const order = () => {
    const th = thing(), up = pickMore()
    const sz = up ? [0.55, 0.8, 1.05, 1.3, 1.55] : [1.55, 1.3, 1.05, 0.8, 0.55]
    return kid({
      say: pick(['Qu’est-ce qui vient après ?', 'Continue : quelle image vient ensuite ?', 'Quelle image va dans la case vide ?']),
      scene: { t: 'row', items: sz.slice(0, 4).map((s) => ({ t: 'thing', thing: th, s: s * 0.7 } as Pic)), hole: 4 },
      good: { t: 'thing', thing: th, s: sz[4] }, bad: [{ t: 'thing', thing: th, s: sz[2] }, { t: 'thing', thing: th, s: up ? 0.4 : 1.6 }, ...(k > 3 ? [{ t: 'thing', thing: th, s: sz[3] } as Pic] : [])],
      explanation: up ? 'Les images grandissent à chaque fois.' : 'Les images rapetissent à chaque fois.',
    })
  }
  if (t === 0) return [size, pencil, glass, () => (pickMore() ? size() : pencil())]
  if (t === 1) return [size, pencil, balance, glass]
  return [size, pencil, balance, glass, sameLength, order]
}

// ── Les formes ─────────────────────────────────────────────────────────
const SHAPE_SETS: Shape[][] = [['rond', 'carre', 'triangle'], ['rond', 'carre', 'triangle', 'rectangle'], ['rond', 'carre', 'triangle', 'rectangle', 'ovale'], ['rond', 'carre', 'triangle', 'rectangle', 'losange', 'ovale'], ['rond', 'carre', 'triangle', 'rectangle', 'losange', 'ovale']]
/** Formes qui se ressemblent (pièges des derniers crans). */
const CLOSE: Record<Shape, Shape[]> = { rond: ['ovale'], ovale: ['rond', 'rectangle'], carre: ['rectangle', 'losange'], rectangle: ['carre', 'ovale'], losange: ['carre', 'triangle'], triangle: ['losange'] }
const shapeName = (s: Shape) => `${SHAPES[s].art}${SHAPES[s].art.endsWith("'") ? '' : ' '}${SHAPES[s].name}`
function formes(t: number): Maker[] {
  const set = SHAPE_SETS[t], k = CHOICES[t]
  // un carré tourné ressemble à un losange : on ne tourne que les autres formes
  const rot = (shape: Shape) => (t >= 2 && shape !== 'rond' && shape !== 'carre' ? pick([0, 30, 90, 180]) : 0)
  const sh = (shape: Shape, color = pick(COLOR_IDS)): Pic => ({ t: 'shape', shape, color, s: t >= 1 ? 0.65 + Math.random() * 0.5 : 1, rot: rot(shape) })
  /** Autres formes, en commençant par les ressemblantes aux derniers crans. */
  const others = (target: Shape) => [...new Set([...(t >= 3 ? CLOSE[target].filter((x) => set.includes(x)) : []), ...shuffle(set.filter((x) => x !== target))])].filter((x) => x !== target)
  const find = () => {
    const target = pick(set)
    return kid({
      say: pick([`Montre ${shapeName(target)}.`, `Où est ${shapeName(target)} ?`, `Trouve ${shapeName(target)}.`]),
      good: sh(target), bad: others(target).slice(0, k - 1).map((o) => sh(o)),
      explanation: `C'est ${shapeName(target)}.`,
    })
  }
  const same = () => {
    const target = pick(set), c = pick(COLOR_IDS)
    return kid({
      say: pick(['Trouve la même forme.', 'Montre la forme pareille.', 'Quelle forme est pareille ?']),
      scene: { t: 'shape', shape: target, color: c },
      // dès le cran 2, la bonne forme n'a pas la même couleur : c'est la forme qui compte
      good: sh(target, t >= 1 ? pick(COLOR_IDS.filter((x) => x !== c)) : c), bad: others(target).slice(0, k - 1).map((o) => sh(o, t >= 1 ? c : pick(COLOR_IDS))),
      explanation: `C'est ${shapeName(target)}, même si la couleur, la taille ou la position change.`,
    })
  }
  const odd = () => {
    const a = pick(set), b = others(a)[0], color = t >= 2 ? undefined : pick(COLOR_IDS)
    return kid({
      say: pick(['Trouve l’intrus : la forme qui n’est pas pareille.', 'Quelle forme n’est pas comme les autres ?', 'Montre l’intrus.']),
      good: sh(b, color ?? pick(COLOR_IDS)), bad: Array.from({ length: Math.max(3, k) - 1 }, () => sh(a, color ?? pick(COLOR_IDS))),
      explanation: `Les autres sont des ${SHAPES[a].name}s ; l'intrus est ${shapeName(b)}.`,
    })
  }
  const count = () => {
    const target = pick(set), rest = others(target)
    const N = randInt(Math.min(2 + t, 6), Math.min(3 + t * 2, 9)), extra = randInt(2, 2 + t)
    const items = shuffle([...Array(N).fill(target), ...Array.from({ length: extra }, () => pick(rest))] as Shape[]).map((s) => sh(s))
    return kid({
      say: `Combien y a-t-il de ${SHAPES[target].name}s ?`,
      scene: { t: 'row', items },
      good: digit(N), bad: near(N, 1, N + 3, k).map(digit),
      explanation: `On ne compte que les ${SHAPES[target].name}s : il y en a ${N}.`,
    })
  }
  const colorShape = () => {
    const [target, other] = shuffle([...set]), [c1, c2] = shuffle([...COLOR_IDS])
    return kid({
      say: `Montre ${shapeName(target)} ${c1}.`,
      good: sh(target, c1), bad: [sh(target, c2), sh(other, c1), ...(k > 3 ? [sh(other, c2)] : [])],
      explanation: `Il faut la bonne forme et la bonne couleur : ${shapeName(target)} ${c1}.`,
    })
  }
  const puzzle = () => {
    const target = pick(set), r = rot(target)
    return kid({
      say: pick(['Quelle pièce rentre dans le trou ?', 'Trouve la pièce qui va dans le trou.', 'Quelle forme bouche le trou ?']),
      scene: { t: 'hole', shape: target, rot: r },
      good: { t: 'shape', shape: target, color: pick(COLOR_IDS), rot: t >= 3 ? (r + 90) % 180 : r }, bad: others(target).slice(0, k - 1).map((o) => ({ t: 'shape', shape: o, color: pick(COLOR_IDS) } as Pic)),
      explanation: `Le trou a la forme ${SHAPES[target].art === "l'" ? "de l'" : SHAPES[target].art === 'la' ? 'de la ' : 'du '}${SHAPES[target].name}.`,
    })
  }
  if (t === 0) return [find, same, odd, puzzle]
  if (t === 1) return [find, same, odd, count, puzzle]
  return [find, same, odd, count, colorShape, puzzle]
}

// ── Les suites (algorithmes) ───────────────────────────────────────────
type Kind = 'color' | 'shape' | 'thing' | 'size'
function alphabet(kind: Kind, n: number): Pic[] {
  if (kind === 'color') return shuffle([...COLOR_IDS]).slice(0, n).map((c) => ({ t: 'shape', shape: 'rond', color: c } as Pic))
  if (kind === 'shape') { const c = pick(COLOR_IDS); return shuffle(['rond', 'carre', 'triangle', 'losange'] as Shape[]).slice(0, n).map((s) => ({ t: 'shape', shape: s, color: c } as Pic)) }
  if (kind === 'size') { const th = thing(); return shuffle([0.55, 1.0, 1.45]).slice(0, n).map((s) => ({ t: 'thing', thing: th, s } as Pic)) }
  return things(n).map((th) => ({ t: 'thing', thing: th } as Pic))
}
const MOTIFS = [['AB'], ['AB', 'AAB'], ['ABC', 'AAB', 'ABB'], ['AABB', 'ABBC', 'ABC', 'AAB'], ['AABC', 'ABCC', 'AABB', 'ABAC']]
function suites(t: number): Maker[] {
  const make = (kind: Kind, middle: boolean) => () => {
    const motif = pick(MOTIFS[t])
    const letters = [...new Set(motif)]
    const al = alphabet(kind, Math.max(letters.length, 3))
    const unit = (ch: string) => al[letters.indexOf(ch)]
    const len = Math.min(10, Math.max(6, motif.length * 2 + 1))
    const seq = Array.from({ length: len }, (_, i) => motif[i % motif.length])
    const hole = middle ? randInt(motif.length, len - 2) : len - 1
    const answer = seq[hole]
    const shown = seq.filter((_, i) => i !== hole).map(unit)
    const pool = al.filter((_, i) => i !== letters.indexOf(answer))
    const extra = alphabet(kind, 4).filter((u) => !al.some((a) => JSON.stringify(a) === JSON.stringify(u)))
    return kid({
      say: middle ? pick(['Qu’est-ce qui manque ?', 'Quelle image va dans la case vide ?', 'Trouve ce qui manque dans le collier.'])
        : pick(['Qu’est-ce qui vient après ?', 'Continue le collier. Qu’est-ce qui vient ensuite ?', 'Quelle image vient ensuite ?']),
      scene: { t: 'row', items: shown, hole },
      good: unit(answer), bad: [...pool, ...extra].slice(0, CHOICES[t] - 1),
      explanation: `Le motif se répète : ${motif.split('').join(' ')}, puis encore ${motif.split('').join(' ')}…`,
    })
  }
  const kinds: Kind[] = t === 0 ? ['color', 'shape', 'thing'] : ['color', 'shape', 'thing', 'size']
  return [...kinds.map((k) => make(k, false)), make(pick(kinds), true), ...(t >= 2 ? [make('color', true)] : [])]
}

// ── Les lettres ────────────────────────────────────────────────────────
const LETTERS = [['A', 'O', 'I', 'X', 'L', 'T', 'S'], ['A', 'O', 'I', 'X', 'L', 'T', 'S', 'E', 'M', 'U', 'V', 'B', 'R', 'P'], ['E', 'F', 'O', 'Q', 'C', 'M', 'N', 'P', 'R', 'B', 'U', 'V', 'I', 'L'], 'ABCDEFGHIJKLMNOPRSTUV'.split(''), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')]
const LOOKALIKE: Record<string, string[]> = { E: ['F', 'B'], F: ['E', 'P'], O: ['Q', 'C'], Q: ['O', 'G'], C: ['G', 'O'], M: ['N', 'W'], N: ['M', 'Z'], P: ['R', 'B'], R: ['P', 'B'], B: ['R', 'P'], U: ['V', 'J'], V: ['U', 'Y'], I: ['L', 'T'], L: ['I', 'T'] }
const txt = (text: string, font?: 'cap' | 'script'): Pic => ({ t: 'text', text, font })
function lettres(t: number): Maker[] {
  const set = LETTERS[t], k = CHOICES[t]
  const others = (L: string) => {
    const close = t >= 2 ? (LOOKALIKE[L] ?? []) : []
    return [...new Set([...close, ...shuffle(set.filter((x) => x !== L))])].filter((x) => x !== L).slice(0, k - 1)
  }
  const same = () => {
    const L = pick(set)
    return kid({
      say: pick(['Trouve la même lettre.', 'Montre la lettre pareille.', 'Quelle lettre est pareille ?']),
      scene: txt(L),
      good: txt(L), bad: others(L).map((x) => txt(x)),
      explanation: `C'est la lettre ${L}.`,
    })
  }
  const hear = () => {
    const L = pick(set)
    return kid({
      say: pick([`Montre la lettre ${L}.`, `Où est la lettre ${L} ?`, `Trouve la lettre ${L}.`]),
      good: txt(L), bad: others(L).map((x) => txt(x)),
      explanation: `C'est la lettre ${L}.`,
    })
  }
  const odd = () => {
    const L = pick(set), O = others(L)[0]
    return kid({
      say: pick(['Trouve l’intrus : la lettre qui n’est pas pareille.', 'Quelle lettre n’est pas comme les autres ?', 'Montre la lettre différente.']),
      good: txt(O), bad: Array.from({ length: Math.max(3, k) - 1 }, () => txt(L)),
      explanation: `Les autres sont des ${L} ; l'intrus est ${O}.`,
    })
  }
  const letterOrDigit = () => {
    const L = pick(set.filter((x) => !'OISZB'.includes(x))), ds = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]).slice(0, k - 1)
    const D = randInt(1, 9), Ls = shuffle(set.filter((x) => !'OISZB'.includes(x))).slice(0, k - 1)
    return pickMore()
      ? kid({ say: pick(['Montre la lettre. Les autres sont des chiffres.', 'Où est la lettre ?', 'Trouve la lettre parmi les chiffres.']), good: txt(L), bad: ds.map(digit), explanation: `${L} est une lettre ; les autres sont des chiffres.` })
      : kid({ say: pick(['Montre le chiffre. Les autres sont des lettres.', 'Où est le chiffre ?', 'Trouve le chiffre parmi les lettres.']), good: digit(D), bad: Ls.map((x) => txt(x)), explanation: `${D} est un chiffre ; les autres sont des lettres.` })
  }
  const first = () => {
    const th = thing(), L = THINGS[th].word[0]
    return kid({
      say: pick([`Par quelle lettre commence le mot ${sing(th)} ?`, `${sing(th)} : montre sa première lettre.`, `Quelle est la première lettre de ${sing(th)} ?`]).replace(/^./, (c) => c.toUpperCase()),
      scene: { t: 'word', thing: th },
      good: txt(L), bad: [...new Set([...(LOOKALIKE[L] ?? []), ...shuffle('ABCDEFLMOPRSTUV'.split(''))])].filter((x) => x !== L).slice(0, k - 1).map((x) => txt(x)),
      explanation: `${THINGS[th].word} commence par la lettre ${L}.`,
    })
  }
  const capScript = () => {
    const L = pick('ABDEFGHLMNRT'.split(''))
    return kid({
      say: pick(['Trouve la même lettre, écrite en petit.', 'Quelle petite lettre va avec la grande ?', 'Montre la même lettre en minuscule.']),
      scene: txt(L),
      good: txt(L.toLowerCase(), 'script'), bad: shuffle('abdeghmnrt'.split('').filter((x) => x !== L.toLowerCase())).slice(0, k - 1).map((x) => txt(x, 'script')),
      explanation: `La grande lettre ${L} s'écrit ${L.toLowerCase()} en petit.`,
    })
  }
  const sameWord = () => {
    const th = thing(), w = THINGS[th].word
    const variants = new Set<string>()
    for (let g = 0; g < 60 && variants.size < k - 1; g++) {
      const a = w.split('')
      const i = randInt(0, a.length - 1)
      if (Math.random() < 0.5 && i < a.length - 1) [a[i], a[i + 1]] = [a[i + 1], a[i]]
      else a[i] = pick((LOOKALIKE[a[i]] ?? ['A', 'O', 'E', 'I']).filter((x) => x !== a[i]))
      const v = a.join('')
      if (v !== w) variants.add(v)
    }
    return kid({
      say: pick(['Trouve le même mot.', 'Montre le mot écrit pareil.', 'Quel mot est exactement pareil ?']),
      scene: txt(w),
      good: txt(w), bad: [...variants].map((v) => txt(v)),
      explanation: `Il faut regarder chaque lettre, dans l'ordre : ${w.split('').join(' ')}.`,
    })
  }
  if (t < 2) return [same, hear, odd, letterOrDigit]
  if (t < 3) return [same, hear, odd, letterOrDigit, first]
  if (t < 4) return [same, hear, odd, first, capScript]
  return [hear, odd, first, capScript, sameWord]
}

// ── Se repérer et observer ─────────────────────────────────────────────
const REL_SAY: Record<Relation, string> = { dessus: 'sur la table', dessous: 'sous la table', 'a-cote': 'à côté de la table', dedans: 'dans la boîte', devant: 'devant la boîte', derriere: 'derrière la boîte' }
const RELS: Relation[][] = [['dessus', 'dessous'], ['dessus', 'dessous', 'a-cote', 'dedans'], ['dessus', 'dessous', 'a-cote', 'dedans', 'devant', 'derriere'], ['dessus', 'dessous', 'a-cote', 'dedans', 'devant', 'derriere'], ['dessus', 'dessous', 'a-cote', 'dedans', 'devant', 'derriere']]
const ASYM: Thing[] = ['poisson', 'voiture', 'lune']
function espace(t: number): Maker[] {
  const k = CHOICES[t]
  const where = () => {
    const th = pick(['ballon', 'pomme', 'etoile', 'poisson', 'coeur'] as Thing[])
    const [r, ...rest] = shuffle([...RELS[t]])
    return kid({
      say: `Montre ${the(th)} ${REL_SAY[r]}.`,
      good: { t: 'scene', rel: r, thing: th }, bad: rest.slice(0, Math.min(k, rest.length + 1) - 1).map((x) => ({ t: 'scene', rel: x, thing: th } as Pic)),
      explanation: `${the(th).replace(/^./, (c) => c.toUpperCase())} est ${REL_SAY[r]}.`,
    })
  }
  const shadow = () => {
    // aux derniers crans, les autres images ont presque la même silhouette (mêmes objets retournés ou autrement colorés)
    const [th, ...rest] = things(k)
    return kid({
      say: pick(['À qui est cette ombre ?', 'Trouve l’image qui va avec cette ombre.', 'Quelle image a cette ombre ?']),
      scene: { t: 'thing', thing: th, silhouette: true, s: 1.3 },
      good: { t: 'thing', thing: th }, bad: rest.map((x) => ({ t: 'thing', thing: x } as Pic)),
      explanation: `C'est l'ombre ${/^[aeéiouh]/i.test(sing(th)) ? `de l’${sing(th)}` : fem(th) ? `de la ${sing(th)}` : `du ${sing(th)}`}.`,
    })
  }
  const samePicture = () => {
    const n = [2, 3, 4, 4, 5][t]
    const base = things(n)
    const rowOf = (ths: Thing[]): Pic => ({ t: 'row', items: ths.map((x) => ({ t: 'thing', thing: x } as Pic)) })
    const seen = new Set<string>([base.join()])
    const out: Pic[] = []
    for (let g = 0; g < 60 && out.length < k - 1; g++) {
      // variantes de plus en plus proches : deux images échangées, ou une seule image changée
      const v = [...base]
      if (Math.random() < 0.5) { const i = randInt(0, n - 2); [v[i], v[i + 1]] = [v[i + 1], v[i]] } else v[randInt(0, n - 1)] = pick(THING_IDS.filter((y) => !base.includes(y)))
      if (!seen.has(v.join())) { seen.add(v.join()); out.push(rowOf(v)) }
    }
    return kid({
      say: pick(['Trouve le même dessin.', 'Montre la rangée pareille.', 'Quelle rangée est exactement pareille ?']),
      scene: rowOf(base),
      good: rowOf(base), bad: out,
      explanation: 'Mêmes images, dans le même ordre.',
    })
  }
  const odd = () => {
    if (t >= 3) {
      // l'intrus ne diffère que par sa couleur : il faut bien regarder
      const th = pick(['pomme', 'etoile', 'coeur', 'ballon', 'fleur', 'poisson'] as Thing[]), [c1, c2] = shuffle([...COLOR_IDS])
      return kid({
        say: pick(['Trouve l’intrus.', 'Quelle image n’est pas comme les autres ?', 'Montre l’image différente.']),
        good: { t: 'thing', thing: th, color: c2 }, bad: Array.from({ length: k - 1 }, () => ({ t: 'thing', thing: th, color: c1 } as Pic)),
        explanation: 'L’intrus n’a pas la même couleur que les autres.',
      })
    }
    const [a, b] = things(2)
    return kid({
      say: pick(['Trouve l’intrus.', 'Quelle image n’est pas comme les autres ?', 'Montre l’image différente.']),
      good: { t: 'thing', thing: b }, bad: Array.from({ length: Math.max(3, k) - 1 }, () => ({ t: 'thing', thing: a } as Pic)),
      explanation: `Les autres sont des ${plur(a)}.`,
    })
  }
  const direction = () => {
    const th = pick(ASYM), flip = pickMore()
    return kid({
      say: pick(['Trouve l’image tournée du même côté.', 'Laquelle regarde du même côté ?', 'Montre l’image tournée pareil.']),
      scene: { t: 'thing', thing: th, flip },
      good: { t: 'thing', thing: th, flip }, bad: [{ t: 'thing', thing: th, flip: !flip }, ...(t >= 3 ? [{ t: 'thing', thing: pick(ASYM.filter((x) => x !== th)), flip } as Pic] : [])],
      explanation: 'Il faut regarder de quel côté l’image est tournée.',
    })
  }
  return t < 2 ? [where, shadow, samePicture, odd] : [where, shadow, samePicture, odd, direction]
}

// ── Petits problèmes : ajouter, enlever ────────────────────────────────
const STORY_THINGS: Thing[] = ['pomme', 'ballon', 'fleur', 'poisson', 'etoile']
function storyAdd(max: number): Maker {
  return () => {
    const th = pick(STORY_THINGS)
    const a = randInt(1, max - 1), b = randInt(1, Math.min(4, max - a)), N = a + b
    return withMeta(kid({
      say: pick([`Il y a ${noun(a, th)}. On en ajoute ${b}. Combien y en a-t-il maintenant ?`, `${noun(a, th)}, et encore ${b}. Combien en tout ?`, `On met ${noun(a, th)}, puis ${b} de plus. Combien y en a-t-il ?`]),
      scene: { t: 'row', items: [setOf(a, th, 'line'), { t: 'mark', ch: '+' }, setOf(b, th, 'line')] },
      good: digit(N), bad: near(N, 1, max + 1, 3).map(digit),
      explanation: `${a} et encore ${b}, cela fait ${N}.`,
    }), { title: pick(['Le panier', 'La récolte', 'Le cadeau']) })
  }
}
function storyRemove(max: number): Maker {
  return () => {
    const th = pick(STORY_THINGS)
    const a = randInt(3, Math.min(10, max)), b = randInt(1, Math.min(4, a - 1)), N = a - b
    const items = line(a, () => ({ thing: th })).map((p, i) => ({ ...p, gone: i >= a - b }))
    return withMeta(kid({
      say: pick([`Il y avait ${noun(a, th)}. On en enlève ${b}. Combien en reste-t-il ?`, `${noun(a, th)}, et ${b} s'en vont. Combien en reste-t-il ?`, `On barre ${noun(b, th)} sur ${a}. Combien en reste-t-il ?`]),
      scene: { t: 'set', items },
      good: digit(N), bad: near(N, 1, a + 1, 3).map(digit),
      explanation: `${a} moins ${b}, il en reste ${N}.`,
    }), { title: pick(['Le goûter', 'Les ballons envolés', 'Le marché']) })
  }
}

/** Améliorations : modèles des paliers 3, 4, 5 ; hôtel de ville : paliers 2, 3, 4 (+ petits problèmes). */
function content(maker: (t: number) => Maker[], stories = false): SubjectContent {
  const titled = (ms: Maker[], title: string) => ms.map((m) => () => withMeta(m(), { title }))
  const ladder = (offset: number, title: string): Ladder => [titled(maker(offset), title), titled(maker(offset + 1), title), titled(maker(offset + 2), title)]
  const age = ladder(1, 'Mission')
  if (stories) {
    age[0] = [...age[0], storyAdd(6), storyRemove(6)]
    age[1] = [...age[1], storyAdd(10), storyRemove(10)]
    age[2] = [...age[2], storyAdd(15), storyRemove(12)]
  }
  return { tiers: tiersOf(maker), upgrades: ladder(2, 'Défi'), age }
}

export const MATERNELLE: Record<string, SubjectContent> = {
  'M-compter': content(compter, true),
  'M-chiffres': content(chiffres, true),
  'M-quantites': content(quantites, true),
  'M-grandeurs': content(grandeurs),
  'M-formes': content(formes),
  'M-suites': content(suites),
  'M-lettres': content(lettres),
  'M-espace': content(espace),
}
