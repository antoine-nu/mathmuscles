// Exercices de maternelle : tout se joue en images (et la consigne est lue à voix haute).
// Chaque modèle a son pictogramme de consigne, toujours le même : l'enfant, accompagné au début, apprend vite
// à reconnaître « compter », « trouver la même forme », « ce qui vient après »…
// Paliers : 1 → jusqu'à 3, 2 → jusqu'à 5, 3 → jusqu'à 6, 4 → jusqu'à 8, 5 → jusqu'à 10 (et choix plus nombreux).
import { pick, randInt, shuffle, withMeta, type Exercise, type Ladder, type Maker, type SubjectContent, type Tiers } from '../utils'
import {
  COLOR_IDS, SHAPES, THINGS, THING_IDS, dice, line, scatter,
  type ColorName, type Pic, type Relation, type Shape, type Thing,
} from './pics'

// ── Outils ──────────────────────────────────────────────────────────────
/** Exercice à choix en images : `good` est la bonne réponse, mélangée aux autres. */
function kid(o: { say: string; icon: Pic[]; scene?: Pic; good: Pic; bad: Pic[]; explanation: string }): Exercise {
  const opts = shuffle([{ p: o.good, ok: true }, ...o.bad.map((p) => ({ p, ok: false }))])
  const answer = String(opts.findIndex((x) => x.ok))
  return {
    prompt: o.say,
    kind: 'choice',
    choices: opts.map((_, i) => String(i)),
    answer,
    explanation: o.explanation,
    check: (v) => v === answer,
    kid: { say: o.say, icon: o.icon, scene: o.scene, options: opts.map((x) => x.p) },
  }
}

const MAX = [3, 5, 6, 8, 10]
/** Nombre de réponses proposées selon le palier. */
const CHOICES = [3, 3, 3, 4, 4]
const plur = (t: Thing) => THINGS[t].plur
const sing = (t: Thing) => THINGS[t].sing
const fem = (t: Thing) => THINGS[t].art === 'une'
/** « le » / « la » */
const le = (t: Thing) => (fem(t) ? 'la' : 'le')
/** « la pomme », « l'étoile », « le ballon » */
const the = (t: Thing) => (/^[aeéiouh]/i.test(sing(t)) ? `l’${sing(t)}` : `${le(t)} ${sing(t)}`)
const counting = (n: number) => Array.from({ length: n }, (_, i) => i + 1).join(', ')
const mark = (ch: string): Pic => ({ t: 'mark', ch })
const digit = (n: number): Pic => ({ t: 'digit', n })
/** k − 1 nombres proches de n, entre lo et hi, différents de n. */
function near(n: number, lo: number, hi: number, k: number): number[] {
  const pool = []
  for (let d = lo; d <= hi; d++) if (d !== n) pool.push({ d, w: Math.abs(d - n) + Math.random() * 1.6 })
  return pool.sort((a, b) => a.w - b.w).slice(0, k - 1).map((x) => x.d)
}
const setOf = (n: number, th: Thing, how: 'scatter' | 'line' | 'dice' = 'scatter', color?: ColorName): Pic =>
  ({ t: 'set', items: how === 'dice' ? dice(n, th, color) : (how === 'line' ? line : scatter)(n, () => ({ thing: th, color })) })
const thing = () => pick(THING_IDS)
const things = (k: number) => shuffle([...THING_IDS]).slice(0, k)

// Pictogrammes de consigne
const ICON = {
  count: [setOf(3, 'pomme', 'line'), mark('='), mark('?')],
  countDice: [{ t: 'dice', n: 3 } as Pic, mark('='), mark('?')],
  showN: [digit(3), mark('→'), setOf(3, 'pomme', 'line')],
  hearDigit: [mark('voix'), mark('→'), digit(3)],
  setToDigit: [setOf(4, 'etoile', 'dice'), mark('→'), digit(4)],
  next: [{ t: 'row', items: [digit(1), digit(2), digit(3)], hole: 3 } as Pic],
  missing: [{ t: 'row', items: [digit(1), digit(3)], hole: 1 } as Pic],
  more: [{ t: 'tower', n: 2, color: 'bleu' } as Pic, { t: 'tower', n: 5, color: 'rouge' } as Pic, mark('+')],
  less: [{ t: 'tower', n: 5, color: 'bleu' } as Pic, { t: 'tower', n: 2, color: 'rouge' } as Pic, mark('−')],
  same: [setOf(3, 'fleur', 'line'), mark('='), setOf(3, 'fleur', 'dice')],
  big: [{ t: 'thing', thing: 'ballon', s: 0.6 } as Pic, { t: 'thing', thing: 'ballon', s: 1.3 } as Pic, mark('+')],
  small: [{ t: 'thing', thing: 'ballon', s: 1.3 } as Pic, { t: 'thing', thing: 'ballon', s: 0.6 } as Pic, mark('−')],
  long: [{ t: 'bar', len: 0.2, color: 'bleu' } as Pic, { t: 'bar', len: 0.9, color: 'rouge' } as Pic],
  short: [{ t: 'bar', len: 0.9, color: 'bleu' } as Pic, { t: 'bar', len: 0.2, color: 'rouge' } as Pic],
  tower: [{ t: 'tower', n: 3, color: 'vert' } as Pic, { t: 'tower', n: 6, color: 'vert' } as Pic],
  hearShape: [mark('voix'), mark('→'), { t: 'shape', shape: 'triangle', color: 'bleu' } as Pic],
  sameShape: [{ t: 'shape', shape: 'carre', color: 'rouge' } as Pic, mark('='), mark('?')],
  oddShape: [{ t: 'shape', shape: 'rond', color: 'vert' } as Pic, { t: 'shape', shape: 'rond', color: 'vert' } as Pic, { t: 'shape', shape: 'carre', color: 'vert' } as Pic, mark('✗')],
  countShape: [{ t: 'shape', shape: 'triangle', color: 'jaune' } as Pic, { t: 'shape', shape: 'triangle', color: 'jaune' } as Pic, mark('='), mark('?')],
  patternNext: [{ t: 'row', items: [{ t: 'shape', shape: 'rond', color: 'rouge' }, { t: 'shape', shape: 'rond', color: 'bleu' }, { t: 'shape', shape: 'rond', color: 'rouge' }], hole: 3 } as Pic],
  patternMissing: [{ t: 'row', items: [{ t: 'shape', shape: 'rond', color: 'rouge' }, { t: 'shape', shape: 'rond', color: 'rouge' }], hole: 1 } as Pic],
  sameLetter: [{ t: 'text', text: 'A' } as Pic, mark('='), mark('?')],
  hearLetter: [mark('voix'), mark('→'), { t: 'text', text: 'A' } as Pic],
  oddLetter: [{ t: 'text', text: 'B' } as Pic, { t: 'text', text: 'B' } as Pic, { t: 'text', text: 'E' } as Pic, mark('✗')],
  letterOrDigit: [{ t: 'text', text: 'A' } as Pic, mark('/'), digit(2)],
  firstLetter: [{ t: 'word', thing: 'pomme' } as Pic, mark('→'), { t: 'text', text: 'P' } as Pic],
  capScript: [{ t: 'text', text: 'A' } as Pic, mark('='), { t: 'text', text: 'a', font: 'script' } as Pic],
  sameWord: [{ t: 'text', text: 'MOT' } as Pic, mark('='), mark('?')],
  position: [mark('voix'), { t: 'scene', rel: 'dessus', thing: 'ballon' } as Pic],
  shadow: [{ t: 'thing', thing: 'poisson', silhouette: true } as Pic, mark('='), { t: 'thing', thing: 'poisson' } as Pic],
  samePicture: [{ t: 'row', items: [{ t: 'thing', thing: 'pomme' }, { t: 'thing', thing: 'etoile' }] } as Pic, mark('='), mark('?')],
  oddThing: [{ t: 'thing', thing: 'fleur' } as Pic, { t: 'thing', thing: 'fleur' } as Pic, { t: 'thing', thing: 'soleil' } as Pic, mark('✗')],
  direction: [{ t: 'thing', thing: 'voiture' } as Pic, mark('='), { t: 'thing', thing: 'voiture', flip: true } as Pic],
  add: [setOf(2, 'pomme', 'line'), mark('+'), setOf(1, 'pomme', 'line'), mark('='), mark('?')],
  remove: [{ t: 'set', items: [...line(3, () => ({ thing: 'pomme' }))].map((p, i) => ({ ...p, gone: i === 2 })) } as Pic, mark('='), mark('?')],
} satisfies Record<string, Pic[]>

/** Tiers construits palier par palier : maker(t) renvoie les modèles du palier t (0 à 4). */
const tiersOf = (maker: (t: number) => Maker[]): Tiers => [maker(0), maker(1), maker(2), maker(3), maker(4)]

// ── Compter ─────────────────────────────────────────────────────────────
function compter(t: number): Maker[] {
  const max = MAX[t], k = CHOICES[t]
  const n = () => randInt(t === 0 ? 1 : 2, max)
  const askCount = (how: 'scatter' | 'line' | 'dice') => () => {
    const th = thing(), N = n()
    return kid({
      say: pick([`Combien y a-t-il de ${plur(th)} ?`, `Compte les ${plur(th)}. Combien y en a-t-il ?`, `Combien vois-tu de ${plur(th)} ?`]),
      icon: how === 'dice' ? ICON.countDice : ICON.count,
      scene: setOf(N, th, how),
      good: digit(N), bad: near(N, 1, max + 1, k).map(digit),
      explanation: `On compte en touchant chaque ${sing(th)} une seule fois : ${counting(N)}. Il y en a ${N}.`,
    })
  }
  const showBox = () => {
    const th = thing(), N = n()
    return kid({
      say: `Montre la boîte où il y a ${N} ${N > 1 ? plur(th) : sing(th)}.`,
      icon: ICON.showN, scene: digit(N),
      good: setOf(N, th), bad: near(N, 1, max + 1, k).map((d) => setOf(d, th)),
      explanation: `${N}, c'est ${counting(N)}.`,
    })
  }
  const mixed = () => {
    const [a, b] = things(2), N = randInt(2, max), m = randInt(2, Math.max(2, max - 2))
    const kinds = shuffle([...Array(N).fill(a), ...Array(m).fill(b)] as Thing[])
    return kid({
      say: `Combien y a-t-il de ${plur(a)} ? Attention, ne compte que les ${plur(a)} !`,
      icon: ICON.count, scene: { t: 'set', items: scatter(N + m, (i) => ({ thing: kinds[i] })) },
      good: digit(N), bad: near(N, 1, max + 1, k).map(digit),
      explanation: `On ne compte que les ${plur(a)} : ${counting(N)}. Il y en a ${N}.`,
    })
  }
  return t < 2 ? [askCount('scatter'), askCount('line'), askCount('dice'), showBox] : [askCount('scatter'), askCount('line'), askCount('dice'), showBox, mixed]
}

// ── Les chiffres ───────────────────────────────────────────────────────
function chiffres(t: number): Maker[] {
  const max = MAX[t], k = CHOICES[t]
  const hear = () => {
    const N = randInt(1, max)
    return kid({
      say: pick([`Montre le chiffre ${N}.`, `Où est le chiffre ${N} ?`, `Trouve le chiffre ${N}.`]).replace('chiffre 10', 'nombre 10'),
      icon: ICON.hearDigit,
      good: digit(N), bad: near(N, 1, Math.max(max, 4), k).map(digit),
      explanation: `C'est le chiffre ${N}.`,
    })
  }
  const toSet = () => {
    const th = thing(), N = randInt(1, max)
    return kid({
      say: pick(['Montre la boîte qui va avec ce chiffre.', `Combien de ${plur(th)} pour ce chiffre ? Montre la bonne boîte.`, 'Trouve la boîte qui a autant d’objets que ce chiffre.']),
      icon: ICON.showN, scene: digit(N),
      good: setOf(N, th, 'line'), bad: near(N, 1, max + 1, k).map((d) => setOf(d, th, 'line')),
      explanation: `Le chiffre ${N} : ${counting(N)}.`,
    })
  }
  const fromSet = () => {
    const th = thing(), N = randInt(1, max)
    return kid({
      say: pick([`Quel chiffre va avec ces ${plur(th)} ?`, `Compte les ${plur(th)}, puis montre le bon chiffre.`, `Quel est le chiffre des ${plur(th)} ?`]),
      icon: ICON.setToDigit, scene: setOf(N, th, 'dice'),
      good: digit(N), bad: near(N, 1, max + 1, k).map(digit),
      explanation: `Il y a ${N} ${N > 1 ? plur(th) : sing(th)} : ${counting(N)}.`,
    })
  }
  const next = () => {
    const N = randInt(Math.min(3, max), max)
    const start = Math.max(1, N - pick([2, 3]))
    const row = Array.from({ length: N - start }, (_, i) => digit(start + i))
    return kid({
      say: pick([`Quel nombre vient après ${N - 1} ?`, 'Compte avec moi. Quel nombre vient après ?', 'Quel est le nombre suivant ?']),
      icon: ICON.next, scene: { t: 'row', items: row, hole: row.length },
      good: digit(N), bad: near(N, 1, max + 1, k).map(digit),
      explanation: `On récite la comptine : ${counting(N)}. Après ${N - 1} vient ${N}.`,
    })
  }
  const missing = () => {
    const start = randInt(1, max - 3), hole = randInt(1, 2)
    const nums = [start, start + 1, start + 2, start + 3]
    const N = nums[hole]
    return kid({
      say: pick(['Quel nombre manque ?', 'Il manque un nombre. Lequel ?', 'Trouve le nombre qui manque.']),
      icon: ICON.missing, scene: { t: 'row', items: nums.filter((_, i) => i !== hole).map(digit), hole },
      good: digit(N), bad: near(N, 1, max + 1, k).map(digit),
      explanation: `${nums.join(', ')} : il manquait ${N}.`,
    })
  }
  const diceFace = () => {
    const N = randInt(1, Math.min(6, max))
    return kid({
      say: pick(['Combien de points sur le dé ?', 'Regarde le dé. Combien de points ?', 'Quel chiffre va avec ce dé ?']),
      icon: ICON.countDice, scene: { t: 'dice', n: N },
      good: digit(N), bad: near(N, 1, Math.max(4, Math.min(7, max + 1)), k).map(digit),
      explanation: `Le dé montre ${N} point${N > 1 ? 's' : ''}.`,
    })
  }
  return t < 2 ? [hear, toSet, fromSet, next, diceFace] : t < 4 ? [hear, toSet, fromSet, next, missing, diceFace] : [hear, toSet, fromSet, next, missing]
}

// ── Plus, moins, autant ────────────────────────────────────────────────
/** k quantités différentes, assez éloignées (gap) pour les petits paliers. */
function counts(k: number, max: number, gap: number): number[] {
  for (let g = 0; g < 200; g++) {
    const c = shuffle(Array.from({ length: max }, (_, i) => i + 1)).slice(0, k)
    const sorted = [...c].sort((a, b) => a - b)
    if (sorted.every((v, i) => i === 0 || v - sorted[i - 1] >= gap)) return c
  }
  return Array.from({ length: k }, (_, i) => 1 + i * gap)
}
function quantites(t: number): Maker[] {
  const max = MAX[t] + (t === 0 ? 2 : 0), k = t < 2 ? 2 : 3
  const gap = [3, 2, 2, 1, 1][t]
  const most = (more: boolean) => () => {
    const th = thing(), c = counts(k, max, gap)
    const best = more ? Math.max(...c) : Math.min(...c)
    return kid({
      say: more ? pick([`Où y a-t-il le plus de ${plur(th)} ?`, `Montre la boîte avec le plus de ${plur(th)}.`, `Quelle boîte a le plus de ${plur(th)} ?`])
        : pick([`Où y a-t-il le moins de ${plur(th)} ?`, `Montre la boîte avec le moins de ${plur(th)}.`, `Quelle boîte a le moins de ${plur(th)} ?`]),
      icon: more ? ICON.more : ICON.less,
      good: setOf(best, th), bad: c.filter((x) => x !== best).map((x) => setOf(x, th)),
      explanation: `Il y en a ${c.join(', ')} : c'est ${best} le ${more ? 'plus' : 'moins'}.`,
    })
  }
  const same = () => {
    const th = thing(), N = randInt(1, MAX[t])
    const other = t >= 2 ? thing() : th
    return kid({
      say: pick(['Trouve la boîte où il y en a autant.', 'Montre la boîte qui en a pareil.', 'Où y en a-t-il autant que dans la grande boîte ?']),
      icon: ICON.same, scene: setOf(N, th, 'line'),
      good: setOf(N, other), bad: near(N, 1, MAX[t] + 1, CHOICES[t]).map((d) => setOf(d, other)),
      explanation: `Il y en a ${N} dans chaque boîte : autant.`,
    })
  }
  const towers = (more: boolean) => () => {
    const c = counts(k, Math.min(8, max), gap), color = pick(COLOR_IDS)
    const best = more ? Math.max(...c) : Math.min(...c)
    return kid({
      say: more ? pick(['Quelle tour a le plus de cubes ?', 'Montre la tour avec le plus de cubes.', 'Où y a-t-il le plus de cubes ?'])
        : pick(['Quelle tour a le moins de cubes ?', 'Montre la tour avec le moins de cubes.', 'Où y a-t-il le moins de cubes ?']),
      icon: more ? ICON.more : ICON.less,
      good: { t: 'tower', n: best, color }, bad: c.filter((x) => x !== best).map((x) => ({ t: 'tower', n: x, color } as Pic)),
      explanation: `Les tours ont ${c.join(', ')} cubes.`,
    })
  }
  // piège : les objets les plus gros ne sont pas les plus nombreux
  const trap = () => {
    const th = thing(), many = randInt(4, Math.max(4, MAX[t])), few = randInt(2, many - 2)
    const big: Pic = { t: 'set', items: scatter(few, () => ({ thing: th, s: 1.35 })) }
    const smallSet: Pic = { t: 'set', items: scatter(many, () => ({ thing: th, s: 0.6 })) }
    return kid({
      say: `Où y a-t-il le plus de ${plur(th)} ? Attention, compte bien !`,
      icon: ICON.more, good: smallSet, bad: [big],
      explanation: `Il y en a ${many} d'un côté et ${few} de l'autre : les gros ne sont pas les plus nombreux.`,
    })
  }
  return t < 2 ? [most(true), most(false), same, towers(true), towers(false)] : [most(true), most(false), same, towers(true), towers(false), trap]
}

// ── Grand, petit, long, court ──────────────────────────────────────────
function grandeurs(t: number): Maker[] {
  const k = CHOICES[t]
  /** k tailles distinctes, d'autant plus proches que le palier est élevé. */
  const sizes = (lo: number, hi: number) => {
    const step = [0.35, 0.28, 0.22, 0.17, 0.13][t]
    const base = lo + Math.random() * Math.max(0, hi - lo - step * (k - 1))
    return shuffle(Array.from({ length: k }, (_, i) => base + i * step))
  }
  const size = (big: boolean) => () => {
    const th = thing(), s = sizes(0.55, 1.6), best = big ? Math.max(...s) : Math.min(...s)
    return kid({
      say: (() => {
        const adj = big ? (fem(th) ? 'grande' : 'grand') : (fem(th) ? 'petite' : 'petit')
        return pick([`Montre ${le(th)} plus ${adj} ${sing(th)}.`, `${fem(th) ? 'Quelle' : 'Quel'} ${sing(th)} est ${le(th)} plus ${adj} ?`, `Trouve ${the(th)} ${le(th)} plus ${adj}.`])
      })(),
      icon: big ? ICON.big : ICON.small,
      good: { t: 'thing', thing: th, s: best }, bad: s.filter((x) => x !== best).map((x) => ({ t: 'thing', thing: th, s: x } as Pic)),
      explanation: big ? 'C’est celui qui prend le plus de place.' : 'C’est celui qui prend le moins de place.',
    })
  }
  const bar = (long: boolean) => () => {
    const l = sizes(0.1, 1).map((x) => Math.min(1, x / 1.6 + 0.1)), best = long ? Math.max(...l) : Math.min(...l)
    const color = pick(COLOR_IDS)
    return kid({
      say: long ? pick(['Montre le crayon le plus long.', 'Quel crayon est le plus long ?', 'Trouve le plus long crayon.'])
        : pick(['Montre le crayon le plus court.', 'Quel crayon est le plus court ?', 'Trouve le plus court crayon.']),
      icon: long ? ICON.long : ICON.short,
      good: { t: 'bar', len: best, color }, bad: l.filter((x) => x !== best).map((x) => ({ t: 'bar', len: x, color } as Pic)),
      explanation: long ? 'On compare en partant du même bout : c’est celui qui va le plus loin.' : 'On compare en partant du même bout : c’est celui qui s’arrête le plus tôt.',
    })
  }
  const tower = () => {
    const high = Math.random() < 0.5, c = counts(k, 8, [3, 2, 2, 1, 1][t]), best = high ? Math.max(...c) : Math.min(...c), color = pick(COLOR_IDS)
    return kid({
      say: high ? pick(['Montre la tour la plus haute.', 'Quelle tour est la plus haute ?', 'Trouve la plus haute tour.']) : pick(['Montre la tour la plus basse.', 'Quelle tour est la plus basse ?', 'Trouve la plus petite tour.']),
      icon: ICON.tower,
      good: { t: 'tower', n: best, color }, bad: c.filter((x) => x !== best).map((x) => ({ t: 'tower', n: x, color } as Pic)),
      explanation: high ? 'C’est la tour qui monte le plus haut.' : 'C’est la tour qui monte le moins haut.',
    })
  }
  const sameLength = () => {
    const l = shuffle([0.15, 0.35, 0.55, 0.75, 0.95]).slice(0, k), target = l[0], color = pick(COLOR_IDS)
    return kid({
      say: pick(['Trouve le crayon aussi long que celui-ci.', 'Quel crayon a la même longueur ?', 'Montre le crayon pareil.']),
      icon: ICON.long, scene: { t: 'bar', len: target, color: 'violet' },
      good: { t: 'bar', len: target, color }, bad: l.slice(1).map((x) => ({ t: 'bar', len: x, color } as Pic)),
      explanation: 'Les deux crayons ont la même longueur.',
    })
  }
  const order = () => {
    const th = thing(), up = Math.random() < 0.5
    const sz = up ? [0.6, 0.85, 1.1, 1.35] : [1.35, 1.1, 0.85, 0.6]
    return kid({
      say: pick(['Qu’est-ce qui vient après ?', 'Continue : quelle image vient ensuite ?', 'Quelle image va dans la case vide ?']),
      icon: ICON.patternNext, scene: { t: 'row', items: sz.slice(0, 3).map((s) => ({ t: 'thing', thing: th, s: s * 0.8 } as Pic)), hole: 3 },
      good: { t: 'thing', thing: th, s: sz[3] }, bad: [{ t: 'thing', thing: th, s: sz[1] }, { t: 'thing', thing: th, s: up ? 0.5 : 1.5 }],
      explanation: up ? 'Les images grandissent à chaque fois.' : 'Les images rapetissent à chaque fois.',
    })
  }
  return t < 2 ? [size(true), size(false), bar(true), bar(false), tower] : [size(true), size(false), bar(true), bar(false), tower, sameLength, order]
}

// ── Les formes ─────────────────────────────────────────────────────────
const SHAPE_SETS: Shape[][] = [['rond', 'carre', 'triangle'], ['rond', 'carre', 'triangle', 'rectangle'], ['rond', 'carre', 'triangle', 'rectangle'], ['rond', 'carre', 'triangle', 'rectangle', 'losange', 'ovale'], ['rond', 'carre', 'triangle', 'rectangle', 'losange', 'ovale']]
const shapeName = (s: Shape) => `${SHAPES[s].art}${SHAPES[s].art.endsWith("'") ? '' : ' '}${SHAPES[s].name}`
function formes(t: number): Maker[] {
  const set = SHAPE_SETS[t], k = CHOICES[t]
  const sh = (shape: Shape, color = pick(COLOR_IDS)): Pic => ({ t: 'shape', shape, color, s: t >= 2 ? 0.7 + Math.random() * 0.45 : 1, rot: t >= 3 && shape === 'triangle' ? pick([0, 180, 90]) : 0 })
  const find = () => {
    const [target, ...others] = shuffle([...set])
    return kid({
      say: pick([`Montre ${shapeName(target)}.`, `Où est ${shapeName(target)} ?`, `Trouve ${shapeName(target)}.`]),
      icon: ICON.hearShape,
      good: sh(target), bad: others.slice(0, k - 1).map((o) => sh(o)),
      explanation: `C'est ${shapeName(target)}.`,
    })
  }
  const same = () => {
    const [target, ...others] = shuffle([...set])
    const c = pick(COLOR_IDS)
    return kid({
      say: pick(['Trouve la même forme.', 'Montre la forme pareille.', 'Quelle forme est pareille ?']),
      icon: ICON.sameShape, scene: { t: 'shape', shape: target, color: c },
      // à partir du palier 2, la bonne forme n'a pas la même couleur : c'est la forme qui compte
      good: sh(target, t >= 1 ? pick(COLOR_IDS.filter((x) => x !== c)) : c), bad: others.slice(0, k - 1).map((o) => sh(o, t >= 1 ? c : pick(COLOR_IDS))),
      explanation: `C'est ${shapeName(target)}, même si la couleur ou la taille change.`,
    })
  }
  const odd = () => {
    const [a, b] = shuffle([...set])
    const n = Math.max(3, k)
    return kid({
      say: pick(['Trouve l’intrus : la forme qui n’est pas pareille.', 'Quelle forme n’est pas comme les autres ?', 'Montre l’intrus.']),
      icon: ICON.oddShape,
      good: sh(b, t >= 2 ? pick(COLOR_IDS) : 'bleu'), bad: Array.from({ length: n - 1 }, () => sh(a, t >= 2 ? pick(COLOR_IDS) : 'bleu')),
      explanation: `Les autres sont des ${SHAPES[a].name}s ; l'intrus est ${shapeName(b)}.`,
    })
  }
  const count = () => {
    const [target, ...others] = shuffle([...set])
    const N = randInt(1, Math.min(5, MAX[t])), extra = randInt(1, 3)
    const items = shuffle([...Array(N).fill(target), ...Array.from({ length: extra }, () => pick(others))] as Shape[]).map((s) => sh(s))
    return kid({
      say: `Combien y a-t-il de ${SHAPES[target].name}s ?`,
      icon: ICON.countShape, scene: { t: 'row', items },
      good: digit(N), bad: near(N, 1, Math.min(6, N + 3), k).map(digit),
      explanation: `On ne compte que les ${SHAPES[target].name}s : il y en a ${N}.`,
    })
  }
  const colorShape = () => {
    const [target, other] = shuffle([...set]), [c1, c2] = shuffle([...COLOR_IDS])
    const names: Record<ColorName, string> = { rouge: 'rouge', bleu: 'bleu', jaune: 'jaune', vert: 'vert', orange: 'orange', violet: 'violet' }
    return kid({
      say: `Montre ${shapeName(target)} ${names[c1]}.`,
      icon: ICON.hearShape,
      good: sh(target, c1), bad: [sh(target, c2), sh(other, c1), ...(k > 3 ? [sh(other, c2)] : [])],
      explanation: `Il faut la bonne forme et la bonne couleur : ${shapeName(target)} ${names[c1]}.`,
    })
  }
  return t < 2 ? [find, same, odd, count] : [find, same, odd, count, colorShape]
}

// ── Les suites (algorithmes) ───────────────────────────────────────────
type Unit = Pic
function alphabet(kind: 'color' | 'shape' | 'thing', n: number): Unit[] {
  if (kind === 'color') return shuffle([...COLOR_IDS]).slice(0, n).map((c) => ({ t: 'shape', shape: 'rond', color: c } as Pic))
  if (kind === 'shape') { const c = pick(COLOR_IDS); return shuffle(['rond', 'carre', 'triangle'] as Shape[]).slice(0, n).map((s) => ({ t: 'shape', shape: s, color: c } as Pic)) }
  return things(n).map((th) => ({ t: 'thing', thing: th } as Pic))
}
const MOTIFS = [['AB'], ['AB'], ['ABC', 'AB'], ['AAB', 'ABB', 'ABC'], ['AABB', 'ABBC', 'AAB', 'ABC']]
function suites(t: number): Maker[] {
  const make = (kind: 'color' | 'shape' | 'thing', middle: boolean) => () => {
    const motif = pick(MOTIFS[t])
    const letters = [...new Set(motif)]
    const al = alphabet(kind, Math.max(letters.length, 3))
    const unit = (ch: string) => al[letters.indexOf(ch)]
    const len = Math.max(6, motif.length * 2 + (t >= 3 ? 1 : 0))
    const seq = Array.from({ length: len }, (_, i) => motif[i % motif.length])
    const hole = middle ? randInt(motif.length, len - 2) : len - 1
    const answer = seq[hole]
    const shown = seq.filter((_, i) => i !== hole).map(unit)
    const pool = al.filter((_, i) => i !== letters.indexOf(answer))
    const extraUnit = alphabet(kind, 4).find((u) => !al.some((a) => JSON.stringify(a) === JSON.stringify(u)))
    const bad = [...pool, ...(extraUnit ? [extraUnit] : [])].slice(0, CHOICES[t] - 1)
    return kid({
      say: middle ? pick(['Qu’est-ce qui manque ?', 'Quelle image va dans la case vide ?', 'Trouve ce qui manque dans le collier.'])
        : pick(['Qu’est-ce qui vient après ?', 'Continue le collier. Qu’est-ce qui vient ensuite ?', 'Quelle image vient ensuite ?']),
      icon: middle ? ICON.patternMissing : ICON.patternNext,
      scene: { t: 'row', items: shown, hole },
      good: unit(answer), bad,
      explanation: `Le motif se répète : ${motif.split('').join(' ')}, puis encore ${motif.split('').join(' ')}…`,
    })
  }
  return [make('color', false), make('shape', false), make('thing', false), make(pick(['color', 'shape', 'thing'] as const), true), ...(t >= 2 ? [make('color', true)] : [])]
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
      icon: ICON.sameLetter, scene: txt(L),
      good: txt(L), bad: others(L).map((x) => txt(x)),
      explanation: `C'est la lettre ${L}.`,
    })
  }
  const hear = () => {
    const L = pick(set)
    return kid({
      say: pick([`Montre la lettre ${L}.`, `Où est la lettre ${L} ?`, `Trouve la lettre ${L}.`]),
      icon: ICON.hearLetter,
      good: txt(L), bad: others(L).map((x) => txt(x)),
      explanation: `C'est la lettre ${L}.`,
    })
  }
  const odd = () => {
    const L = pick(set), O = others(L)[0]
    return kid({
      say: pick(['Trouve l’intrus : la lettre qui n’est pas pareille.', 'Quelle lettre n’est pas comme les autres ?', 'Montre la lettre différente.']),
      icon: ICON.oddLetter,
      good: txt(O), bad: Array.from({ length: Math.max(3, k) - 1 }, () => txt(L)),
      explanation: `Les autres sont des ${L} ; l'intrus est ${O}.`,
    })
  }
  const letterOrDigit = () => {
    const L = pick(set), ds = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]).slice(0, k - 1)
    const wantLetter = Math.random() < 0.6
    const D = randInt(1, 9), Ls = shuffle(set.filter((x) => x !== 'O' && x !== 'I' && x !== 'S')).slice(0, k - 1)
    return wantLetter
      ? kid({ say: pick(['Montre la lettre. Les autres sont des chiffres.', 'Où est la lettre ?', 'Trouve la lettre parmi les chiffres.']), icon: ICON.letterOrDigit, good: txt(L), bad: ds.map(digit), explanation: `${L} est une lettre ; les autres sont des chiffres.` })
      : kid({ say: pick(['Montre le chiffre. Les autres sont des lettres.', 'Où est le chiffre ?', 'Trouve le chiffre parmi les lettres.']), icon: ICON.letterOrDigit, good: digit(D), bad: Ls.map((x) => txt(x)), explanation: `${D} est un chiffre ; les autres sont des lettres.` })
  }
  const first = () => {
    const th = thing(), L = THINGS[th].word[0]
    return kid({
      say: pick([`Par quelle lettre commence le mot ${sing(th)} ?`, `${sing(th)} : montre sa première lettre.`, `Quelle est la première lettre de ${sing(th)} ?`]).replace(/^./, (c) => c.toUpperCase()),
      icon: ICON.firstLetter, scene: { t: 'word', thing: th },
      good: txt(L), bad: [...new Set([...(LOOKALIKE[L] ?? []), ...shuffle('ABCDEFLMOPRSTUV'.split(''))])].filter((x) => x !== L).slice(0, k - 1).map((x) => txt(x)),
      explanation: `${THINGS[th].word} commence par la lettre ${L}.`,
    })
  }
  const capScript = () => {
    const L = pick('ABDEFGHLMNRT'.split(''))
    return kid({
      say: pick(['Trouve la même lettre, écrite en petit.', 'Quelle petite lettre va avec la grande ?', 'Montre la même lettre en minuscule.']),
      icon: ICON.capScript, scene: txt(L),
      good: txt(L.toLowerCase(), 'script'), bad: shuffle('abdeghmnrt'.split('').filter((x) => x !== L.toLowerCase())).slice(0, k - 1).map((x) => txt(x, 'script')),
      explanation: `La grande lettre ${L} s'écrit ${L.toLowerCase()} en petit.`,
    })
  }
  const sameWord = () => {
    const th = thing(), w = THINGS[th].word
    const variants = new Set<string>()
    for (let g = 0; g < 40 && variants.size < k - 1; g++) {
      const a = w.split('')
      const i = randInt(0, a.length - 1)
      if (Math.random() < 0.5 && i < a.length - 1) [a[i], a[i + 1]] = [a[i + 1], a[i]]
      else a[i] = pick((LOOKALIKE[a[i]] ?? ['A', 'O', 'E', 'I']).filter((x) => x !== a[i]))
      const v = a.join('')
      if (v !== w) variants.add(v)
    }
    return kid({
      say: pick(['Trouve le même mot.', 'Montre le mot écrit pareil.', 'Quel mot est exactement pareil ?']),
      icon: ICON.sameWord, scene: txt(w),
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
      icon: ICON.position,
      good: { t: 'scene', rel: r, thing: th }, bad: rest.slice(0, Math.min(k, rest.length + 1) - 1).map((x) => ({ t: 'scene', rel: x, thing: th } as Pic)),
      explanation: `${the(th).replace(/^./, (c) => c.toUpperCase())} est ${REL_SAY[r]}.`,
    })
  }
  const shadow = () => {
    const [th, ...rest] = things(k)
    return kid({
      say: pick(['À qui est cette ombre ?', 'Trouve l’image qui va avec cette ombre.', 'Quelle image a cette ombre ?']),
      icon: ICON.shadow, scene: { t: 'thing', thing: th, silhouette: true, s: 1.3 },
      good: { t: 'thing', thing: th }, bad: rest.map((x) => ({ t: 'thing', thing: x } as Pic)),
      explanation: `C'est l'ombre ${/^[aeéiouh]/i.test(sing(th)) ? `de l’${sing(th)}` : fem(th) ? `de la ${sing(th)}` : `du ${sing(th)}`}.`,
    })
  }
  const samePicture = () => {
    const n = [2, 3, 3, 4, 4][t]
    const base = things(n)
    const rowOf = (ths: Thing[]): Pic => ({ t: 'row', items: ths.map((x) => ({ t: 'thing', thing: x } as Pic)) })
    const bad = new Set<string>()
    const out: Pic[] = []
    for (let g = 0; g < 40 && out.length < k - 1; g++) {
      const v = Math.random() < 0.5 ? shuffle([...base]) : base.map((x, i) => (i === randInt(0, n - 1) ? pick(THING_IDS.filter((y) => !base.includes(y))) : x))
      const key = v.join()
      if (key !== base.join() && !bad.has(key)) { bad.add(key); out.push(rowOf(v)) }
    }
    return kid({
      say: pick(['Trouve le même dessin.', 'Montre la rangée pareille.', 'Quelle rangée est exactement pareille ?']),
      icon: ICON.samePicture, scene: rowOf(base),
      good: rowOf(base), bad: out,
      explanation: 'Mêmes images, dans le même ordre.',
    })
  }
  const odd = () => {
    const [a, b] = things(2)
    return kid({
      say: pick(['Trouve l’intrus.', 'Quelle image n’est pas comme les autres ?', 'Montre l’image différente.']),
      icon: ICON.oddThing,
      good: { t: 'thing', thing: b }, bad: Array.from({ length: Math.max(3, k) - 1 }, () => ({ t: 'thing', thing: a } as Pic)),
      explanation: `Les autres sont des ${plur(a)}.`,
    })
  }
  const direction = () => {
    const th = pick(ASYM), flip = Math.random() < 0.5
    return kid({
      say: pick(['Trouve l’image tournée du même côté.', 'Laquelle regarde du même côté ?', 'Montre l’image tournée pareil.']),
      icon: ICON.direction, scene: { t: 'thing', thing: th, flip },
      good: { t: 'thing', thing: th, flip }, bad: [{ t: 'thing', thing: th, flip: !flip }, ...(t >= 3 ? [{ t: 'thing', thing: pick(ASYM.filter((x) => x !== th)), flip } as Pic] : [])],
      explanation: 'Il faut regarder de quel côté l’image est tournée.',
    })
  }
  return t < 2 ? [where, shadow, samePicture, odd] : [where, shadow, samePicture, odd, direction]
}

// ── Petits problèmes (hôtel de ville) : ajouter, enlever ────────────────
function storyAdd(max: number): Maker {
  return () => {
    const th = pick(['pomme', 'ballon', 'fleur', 'poisson', 'etoile'] as Thing[])
    const a = randInt(1, max - 1), b = randInt(1, Math.min(3, max - a)), N = a + b
    return withMeta(kid({
      say: pick([`Il y a ${a} ${a > 1 ? plur(th) : sing(th)}. On en ajoute ${b}. Combien y en a-t-il maintenant ?`, `${a} ${a > 1 ? plur(th) : sing(th)}, et encore ${b}. Combien en tout ?`, `On met ${a} ${a > 1 ? plur(th) : sing(th)}, puis ${b} de plus. Combien y en a-t-il ?`]),
      icon: ICON.add, scene: { t: 'row', items: [setOf(a, th, 'line'), mark('+'), setOf(b, th, 'line')] },
      good: digit(N), bad: near(N, 1, max + 1, 3).map(digit),
      explanation: `${a} et encore ${b}, cela fait ${N} : ${counting(N)}.`,
    }), { title: pick(['Le panier', 'La récolte', 'Le cadeau']) })
  }
}
function storyRemove(max: number): Maker {
  return () => {
    const th = pick(['pomme', 'ballon', 'fleur', 'poisson', 'etoile'] as Thing[])
    const a = randInt(2, max), b = randInt(1, Math.min(3, a - 1)), N = a - b
    const items = line(a, () => ({ thing: th })).map((p, i) => ({ ...p, gone: i >= a - b }))
    return withMeta(kid({
      say: pick([`Il y avait ${a} ${plur(th)}. On en enlève ${b}. Combien en reste-t-il ?`, `${a} ${plur(th)}, et ${b} s'en vont. Combien en reste-t-il ?`, `On barre ${b} ${b > 1 ? plur(th) : sing(th)} sur ${a}. Combien en reste-t-il ?`]),
      icon: ICON.remove, scene: { t: 'set', items },
      good: digit(N), bad: near(N, 1, a + 1, 3).map(digit),
      explanation: `${a} moins ${b}, il en reste ${N}.`,
    }), { title: pick(['Le goûter', 'Les ballons envolés', 'Le marché']) })
  }
}

/** Améliorations : les modèles des paliers 3, 4, 5 ; hôtel de ville : paliers 2, 3, 4 (+ petits problèmes). */
function content(maker: (t: number) => Maker[], stories = false): SubjectContent {
  const titled = (ms: Maker[], title: string) => ms.map((m) => () => withMeta(m(), { title }))
  const ladder = (offset: number, title: string): Ladder => [titled(maker(offset), title), titled(maker(offset + 1), title), titled(maker(offset + 2), title)]
  const age = ladder(1, 'Mission')
  if (stories) {
    age[0] = [...age[0], storyAdd(5), storyRemove(5)]
    age[1] = [...age[1], storyAdd(7), storyRemove(7)]
    age[2] = [...age[2], storyAdd(10), storyRemove(10)]
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
