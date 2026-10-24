// Puissances (5e) : carrés et cubes de nombres entiers (et de décimaux simples) — calcul, écriture a² / a³,
// reconnaître un carré ou un cube, aire d'un carré, volume d'un cube, priorités, ordres de grandeur.
import {
  F, fmt, fraction, fresh, numeric, pick, randInt, variants, withMeta,
  type Exercise, type Maker, type SubjectContent,
} from '../utils'
import type { FigPoint, FigSegment, Figure } from '../figure'

// ── Aides locales ───────────────────────────────────────────────────────
const RED = '#b8362f'
const GREEN = '#2f8f4e'
const BLUE = '#2f5fb3'
const GOLD = '#d9a020'
const range = (a: number, b: number) => Array.from({ length: Math.max(0, b - a + 1) }, (_, i) => a + i)
const sum = (a: number[]) => a.reduce((t, v) => t + v, 0)
/** Carré / cube écrits avec exposant typographique : 7², 4³, 0,5² */
const sq = (a: number) => `${fmt(a)}²`
const cu = (a: number) => `${fmt(a)}³`
const r6 = (x: number) => Math.round(x * 1e6) / 1e6
const isSquare = (n: number) => Number.isInteger(Math.sqrt(n))
const isCube = (n: number) => Math.round(Math.cbrt(n)) ** 3 === n

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

// ── Constructeurs de réponses propres au chapitre ───────────────────────
/** Écriture avec exposant : « 5³ », « 5^3 » (base nombre ou lettre). */
function powerForm(prompt: string, base: string, exp: 2 | 3, explanation: string): Exercise {
  const norm = (v: string) => v.replace(/\s+/g, '').replace(/²/g, '^2').replace(/³/g, '^3').replace(/\*\*/g, '^').replace(/,/g, '.')
  const want = `${base.replace(/,/g, '.')}^${exp}`
  return {
    prompt,
    kind: 'input',
    answer: `${base}${exp === 2 ? '²' : '³'}`,
    explanation,
    inputHint: 'ex. 7²',
    format: 'un nombre avec un exposant, par exemple 7² ou 7^2',
    keypad: ['²', '³', '^'],
    isValid: (v) => /^[\w,.]+(\^|²|³|\*\*)/.test(v.replace(/\s+/g, '')),
    check: (v) => norm(v) === want,
  }
}

/** Deux entiers positifs a ; b avec a² + b² = N (ordre indifférent). */
function twoSquares(prompt: string, N: number, a: number, b: number, explanation: string): Exercise {
  const read = (v: string) => (v.match(/\d+/g) ?? []).map(Number)
  return {
    prompt,
    kind: 'input',
    answer: `${a} et ${b}`,
    explanation,
    inputHint: 'deux nombres : a ; b',
    format: 'deux nombres entiers séparés par ;, par exemple 3 ; 4',
    keypad: [';'],
    isValid: (v) => read(v).length === 2,
    diagnose: (v) => {
      const g = read(v)
      return g.length === 2 && g[0] ** 2 + g[1] ** 2 !== N && g[0] + g[1] === a + b ? 'Vérifie : ce sont les carrés qui doivent avoir pour somme ' + N + '.' : undefined
    },
    check: (v) => {
      const g = read(v)
      return g.length === 2 && g[0] > 0 && g[1] > 0 && g[0] ** 2 + g[1] ** 2 === N
    },
  }
}

// ── Schémas ─────────────────────────────────────────────────────────────
const P = (x: number, y: number): FigPoint => ({ x, y, hidden: true, label: '' })
/** Constructeur de figure en coordonnées du cadre. */
function canvas(w = 320, h = 220) {
  const points: Record<string, FigPoint> = {}
  const segments: FigSegment[] = []
  const polygons: { pts: string[]; fill: string }[] = []
  const notes: { x: number; y: number; text: string }[] = []
  let k = 0
  const pt = (x: number, y: number) => { const n = `q${k++}`; points[n] = P(x, y); return n }
  return {
    line(x1: number, y1: number, x2: number, y2: number, opts: Omit<FigSegment, 'a' | 'b'> = {}) { segments.push({ a: pt(x1, y1), b: pt(x2, y2), ...opts }) },
    poly(pts: [number, number][], fill: string, outline = true) {
      const names = pts.map(([x, y]) => pt(x, y))
      polygons.push({ pts: names, fill })
      if (outline) names.forEach((n, i) => segments.push({ a: n, b: names[(i + 1) % names.length] }))
    },
    note(x: number, y: number, text: string) { notes.push({ x, y, text }) },
    figure(caption = ''): Figure { return { w, h, points, segments, polygons, notes, caption } },
  }
}

/** Cube en perspective cavalière, découpé en n × n × n petits cubes (n = 1 : cube plein). */
function cubeFigure(n: number, label?: string, colorFaces = false): Figure {
  const c = canvas()
  const S = 120, d = 50, x0 = 90, y0 = 70 // face avant : (x0, y0) → (x0 + S, y0 + S)
  const front: [number, number][] = [[x0, y0], [x0 + S, y0], [x0 + S, y0 + S], [x0, y0 + S]]
  const top: [number, number][] = [[x0, y0], [x0 + d, y0 - d * 0.8], [x0 + S + d, y0 - d * 0.8], [x0 + S, y0]]
  const side: [number, number][] = [[x0 + S, y0], [x0 + S + d, y0 - d * 0.8], [x0 + S + d, y0 + S - d * 0.8], [x0 + S, y0 + S]]
  c.poly(front, colorFaces ? RED : GOLD); c.poly(top, colorFaces ? RED : GOLD); c.poly(side, colorFaces ? RED : GOLD)
  for (let i = 1; i < n; i++) {
    const t = (i * S) / n, u = i / n
    c.line(x0 + t, y0, x0 + t, y0 + S, { color: '#6b5a3a' }) // face avant, verticales
    c.line(x0, y0 + t, x0 + S, y0 + t, { color: '#6b5a3a' }) // face avant, horizontales
    c.line(x0 + t, y0, x0 + t + d, y0 - d * 0.8, { color: '#6b5a3a' }) // dessus
    c.line(x0 + d * u, y0 - d * 0.8 * u, x0 + S + d * u, y0 - d * 0.8 * u, { color: '#6b5a3a' })
    c.line(x0 + S, y0 + t, x0 + S + d, y0 + t - d * 0.8, { color: '#6b5a3a' }) // côté
    c.line(x0 + S + d * u, y0 - d * 0.8 * u, x0 + S + d * u, y0 + S - d * 0.8 * u, { color: '#6b5a3a' })
  }
  if (label) c.note(x0 + S / 2, y0 + S + 22, label)
  return c.figure()
}

/** Carré coté (et éventuellement un carré intérieur évidé, centré). */
function squareFigure(label: string, inner?: { ratio: number; label?: string }, fill = GREEN): Figure {
  const c = canvas()
  const S = 150, x0 = 85, y0 = 30
  if (inner) {
    const s2 = S * inner.ratio, o = (S - s2) / 2, x1 = x0 + o, y1 = y0 + o, x2 = x1 + s2, y2 = y1 + s2
    // le cadre : quatre bandes colorées, l'intérieur reste vide
    c.poly([[x0, y0], [x0 + S, y0], [x0 + S, y1], [x0, y1]], fill, false)
    c.poly([[x0, y2], [x0 + S, y2], [x0 + S, y0 + S], [x0, y0 + S]], fill, false)
    c.poly([[x0, y1], [x1, y1], [x1, y2], [x0, y2]], fill, false)
    c.poly([[x2, y1], [x0 + S, y1], [x0 + S, y2], [x2, y2]], fill, false)
    c.poly([[x0, y0], [x0 + S, y0], [x0 + S, y0 + S], [x0, y0 + S]], 'none')
    c.poly([[x1, y1], [x2, y1], [x2, y2], [x1, y2]], 'none')
    if (inner.label) c.note(x0 + S / 2, y1 + s2 / 2 + 5, inner.label)
  } else c.poly([[x0, y0], [x0 + S, y0], [x0 + S, y0 + S], [x0, y0 + S]], fill)
  c.note(x0 + S / 2, y0 + S + 20, label)
  return c.figure()
}

/** Motifs de jetons carrés n × n (n = 1, 2, 3, 4). */
function tokensFigure(sizes: number[]): Figure {
  const c = canvas()
  const step = 13, slot = (n: number) => Math.max(n * step, 62)
  const total = sum(sizes.map(slot))
  let x = (320 - total) / 2
  const pts: Record<string, FigPoint> = {}
  sizes.forEach((n, m) => {
    const x0 = x + (slot(n) - (n - 1) * step) / 2
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) pts[`t${m}-${i}-${j}`] = { x: x0 + j * step, y: 150 - i * step, label: '' }
    c.note(x + slot(n) / 2, 178, `motif ${m + 1}`)
    x += slot(n)
  })
  const f = c.figure()
  return { ...f, points: { ...f.points, ...pts } }
}

/** Pyramide de boulets vue de face : rangées de n, n − 1, …, 1 cercles. */
function pyramidFigure(n: number): Figure {
  const r = Math.min(14, 150 / n, 175 / (2 + 1.75 * (n - 1))), cx = 160, base = 195
  const points: Record<string, FigPoint> = {}
  const circles: { c: string; r: number }[] = []
  for (let row = 0; row < n; row++) {
    const k = n - row
    for (let i = 0; i < k; i++) {
      const name = `b${row}-${i}`
      points[name] = P(cx + (i - (k - 1) / 2) * 2 * r, base - r - row * r * 1.75)
      circles.push({ c: name, r })
    }
  }
  return { points, circles, caption: 'Vue de face : chaque étage est un carré de boulets.' }
}

/** Quadrillage de m colonnes et n lignes (carré si m = n). */
function gridFigure(n: number, m = n): Figure {
  const c = canvas()
  const u = Math.min(160 / n, 260 / m), W = u * m, H = u * n, x0 = (320 - W) / 2, y0 = 25
  c.poly([[x0, y0], [x0 + W, y0], [x0 + W, y0 + H], [x0, y0 + H]], GOLD)
  for (let i = 1; i < m; i++) c.line(x0 + i * u, y0, x0 + i * u, y0 + H)
  for (let i = 1; i < n; i++) c.line(x0, y0 + i * u, x0 + W, y0 + i * u)
  return c.figure()
}
/** Nombre de carrés de toutes tailles dans un quadrillage m × n. */
const squaresIn = (m: number, n: number) => sum(range(1, Math.min(m, n)).map((k) => (m - k + 1) * (n - k + 1)))

/** Carré agrandi : carré initial + bandes ajoutées de largeur k. */
function growFigure(a: string, k: string, ratio: number): Figure {
  const c = canvas()
  const T = 160, s = T * ratio, x0 = 70, y0 = 30
  c.poly([[x0, y0 + T - s], [x0 + s, y0 + T - s], [x0 + s, y0 + T], [x0, y0 + T]], GREEN)
  c.poly([[x0 + s, y0 + T - s], [x0 + T, y0 + T - s], [x0 + T, y0 + T], [x0 + s, y0 + T]], GOLD)
  c.poly([[x0, y0], [x0 + T, y0], [x0 + T, y0 + T - s], [x0, y0 + T - s]], GOLD)
  c.note(x0 + s / 2, y0 + T + 18, a)
  c.note(x0 + s + (T - s) / 2, y0 + T + 18, k)
  c.note(x0 + s / 2, y0 + T - s / 2 + 5, 'ancien champ')
  return c.figure('La partie jaune est la surface ajoutée.')
}

/** Croix formée de 5 carrés identiques. */
function crossFigure(label: string): Figure {
  const c = canvas()
  const u = 50, x0 = 85, y0 = 20
  const cells: [number, number][] = [[1, 0], [0, 1], [1, 1], [2, 1], [1, 2]]
  for (const [i, j] of cells) c.poly([[x0 + i * u, y0 + j * u], [x0 + (i + 1) * u, y0 + j * u], [x0 + (i + 1) * u, y0 + (j + 1) * u], [x0 + i * u, y0 + (j + 1) * u]], BLUE)
  c.note(x0 + u * 1.5, y0 + 3 * u + 20, label)
  return c.figure()
}

// ═══ Palier 1 ═══════════════════════════════════════════════════════════
const carre1 = variants(
  () => {
    const a = randInt(2, 15)
    return numeric(`Calcule ${sq(a)}.`, a * a, { explanation: `${sq(a)} = ${a} × ${a} = ${a * a} (et non ${a} × 2 !).` })
  },
  () => {
    const a = randInt(2, 15)
    return numeric(`Quel est le carré de ${a} ?`, a * a, { explanation: `Le carré de ${a} est ${sq(a)} = ${a} × ${a} = ${a * a}.` })
  },
  () => {
    const a = randInt(3, 15)
    return numeric(`Calcule l'aire d'un carré de côté ${a} cm (en cm²).`, a * a, { explanation: `Aire = côté × côté = ${sq(a)} = ${a} × ${a} = ${a * a} cm².` })
  },
  () => {
    const a = randInt(4, 15)
    return numeric(`Le sol d'une tour carrée est pavé de ${a} rangées de ${a} dalles. Combien de dalles y a-t-il en tout ?`, a * a, { explanation: `${a} rangées de ${a} dalles : ${a} × ${a} = ${sq(a)} = ${a * a} dalles.` })
  },
)

const cube1 = variants(
  () => {
    const a = pick([2, 3, 4, 5, 6, 10])
    return numeric(`Calcule ${cu(a)}.`, a ** 3, { explanation: `${cu(a)} = ${a} × ${a} × ${a} = ${a * a} × ${a} = ${a ** 3} (et non ${a} × 3 !).` })
  },
  () => {
    const a = pick([2, 3, 4, 5, 6, 10])
    return numeric(`Quel est le cube de ${a} ?`, a ** 3, { explanation: `Le cube de ${a} est ${cu(a)} = ${a} × ${a} × ${a} = ${a ** 3}.` })
  },
  () => {
    const a = pick([2, 3, 4, 5, 6, 10])
    return numeric(`Calcule le volume d'un cube d'arête ${a} cm (en cm³).`, a ** 3, { explanation: `Volume = arête × arête × arête = ${cu(a)} = ${a} × ${a} × ${a} = ${a ** 3} cm³.` })
  },
  () => {
    const a = pick([3, 4, 5, 6])
    return fig(numeric(`Un grand cube est formé de petits cubes identiques : ${a} sur la longueur, ${a} sur la largeur et ${a} sur la hauteur (voir le schéma). Combien de petits cubes contient-il ?`, a ** 3, {
      explanation: `Une couche contient ${a} × ${a} = ${a * a} petits cubes, et il y a ${a} couches : ${a * a} × ${a} = ${cu(a)} = ${a ** 3}.`,
    }), cubeFigure(a))
  },
)

const LETTERS = ['a', 'b', 'c', 'x', 'y', 'n']
const ecriture1 = variants(
  () => {
    const a = randInt(2, 12)
    return powerForm(`Écris ${a} × ${a} × ${a} sous la forme d'une puissance (avec un exposant).`, String(a), 3, `Trois facteurs égaux à ${a} : ${a} × ${a} × ${a} = ${a}³ (« ${a} au cube »).`)
  },
  () => {
    const a = randInt(2, 15)
    return powerForm(`Écris ${a} × ${a} sous la forme d'une puissance (avec un exposant).`, String(a), 2, `Deux facteurs égaux à ${a} : ${a} × ${a} = ${a}² (« ${a} au carré »).`)
  },
  () => {
    const l = pick(LETTERS), e = pick([2, 3] as const)
    return powerForm(`Écris ${Array(e).fill(l).join(' × ')} avec un exposant.`, l, e, `${e} facteurs égaux à ${l} : ${l}${e === 2 ? '²' : '³'} (« ${l} au ${e === 2 ? 'carré' : 'cube'} »).`)
  },
  () => {
    const a = randInt(2, 15), e = pick([2, 3] as const)
    return powerForm(`Écris « le ${e === 2 ? 'carré' : 'cube'} de ${a} » avec un exposant.`, String(a), e, `Le ${e === 2 ? 'carré' : 'cube'} de ${a} s'écrit ${a}${e === 2 ? '²' : '³'} = ${Array(e).fill(a).join(' × ')}.`)
  },
)

const dizaines1 = variants(
  () => {
    const a = randInt(2, 9) * 10
    return numeric(`Calcule ${sq(a)}.`, a * a, { explanation: `${sq(a)} = ${a} × ${a} = ${a / 10} × ${a / 10} × 100 = ${(a / 10) ** 2} × 100 = ${a * a}.` })
  },
  () => {
    const a = pick([10, 20, 30, 40, 50])
    return numeric(`Calcule ${cu(a)}.`, a ** 3, { explanation: `${cu(a)} = ${a} × ${a} × ${a} = ${cu(a / 10)} × 1000 = ${(a / 10) ** 3} × 1000 = ${a ** 3}.` })
  },
  () => {
    const a = randInt(2, 9) * 10
    return numeric(`Un champ carré mesure ${a} m de côté. Quelle est son aire (en m²) ?`, a * a, { explanation: `Aire = ${sq(a)} = ${a} × ${a} = ${a * a} m².` })
  },
  () => {
    const a = pick([100, 200, 300, 110, 120])
    return numeric(`Calcule ${sq(a)}.`, a * a, { explanation: `${sq(a)} = ${a} × ${a} = ${a * a}.` })
  },
)

// ═══ Palier 2 ═══════════════════════════════════════════════════════════
const racine2 = variants(
  () => {
    const a = randInt(4, 15)
    return numeric(`Quel nombre entier positif a pour carré ${a * a} ?`, a, { explanation: `${a} × ${a} = ${a * a}, donc ${sq(a)} = ${a * a} : c'est ${a}.` })
  },
  () => {
    const a = randInt(4, 15)
    return numeric(`Complète avec un nombre positif : …² = ${a * a}.`, a, { explanation: `${sq(a)} = ${a} × ${a} = ${a * a}.` })
  },
  () => {
    const a = randInt(4, 20)
    return numeric(`Un carré a une aire de ${a * a} cm². Quelle est la longueur de son côté (en cm) ?`, a, { explanation: `On cherche le nombre dont le carré est ${a * a} : ${a} × ${a} = ${a * a}, donc le côté mesure ${a} cm.` })
  },
  fresh(() => {
    const n = randInt(30, 300), k = Math.floor(Math.sqrt(n))
    return numeric(`Combien de nombres entiers compris entre 1 et ${n} sont des carrés de nombres entiers ?`, k, {
      explanation: `Ce sont ${sq(1)}, ${sq(2)}, …, ${sq(k)} = ${k * k} ; ${sq(k + 1)} = ${(k + 1) ** 2} dépasse ${n}. Il y en a ${k}.`,
    })
  }),
)

const racineCube2 = variants(
  () => {
    const a = pick([2, 3, 4, 5, 6, 10])
    return numeric(`Quel nombre entier a pour cube ${a ** 3} ?`, a, { explanation: `${a} × ${a} × ${a} = ${a ** 3}, donc ${cu(a)} = ${a ** 3} : c'est ${a}.` })
  },
  () => {
    const a = pick([2, 3, 4, 5, 6, 10])
    return numeric(`Complète : …³ = ${a ** 3}.`, a, { explanation: `${cu(a)} = ${a} × ${a} × ${a} = ${a ** 3}.` })
  },
  () => {
    const a = pick([2, 3, 4, 5, 6, 7, 10])
    return numeric(`Une caisse cubique a un volume de ${a ** 3} dm³. Quelle est la longueur de son arête (en dm) ?`, a, { explanation: `On cherche le nombre dont le cube est ${a ** 3} : ${a} × ${a} × ${a} = ${a ** 3}, donc l'arête mesure ${a} dm.` })
  },
  R(() => {
    const n = randInt(30, 700), k = Math.floor(Math.cbrt(n + 1e-9))
    if (isCube(n)) return null
    return numeric(`Quel est le plus grand cube d'un nombre entier strictement inférieur à ${n} ?`, k ** 3, {
      explanation: `${cu(k)} = ${k ** 3} est inférieur à ${n}, mais ${cu(k + 1)} = ${(k + 1) ** 3} le dépasse. Réponse : ${k ** 3}.`,
    })
  }),
)

const prio2 = variants(
  () => {
    const a = randInt(2, 30), b = randInt(2, 9)
    return numeric(`Calcule : ${a} + ${sq(b)}`, a + b * b, { explanation: `Le carré d'abord : ${sq(b)} = ${b * b}, puis ${a} + ${b * b} = ${a + b * b}.` })
  },
  () => {
    const a = randInt(2, 9), b = randInt(2, 9)
    return numeric(`Calcule : ${a} × ${sq(b)}`, a * b * b, { explanation: `Le carré d'abord : ${sq(b)} = ${b * b}, puis ${a} × ${b * b} = ${a * b * b}.` })
  },
  () => {
    const a = randInt(2, 9), b = randInt(2, 6)
    return numeric(`Calcule : (${a} + ${b})²`, (a + b) ** 2, { explanation: `La parenthèse d'abord : ${a} + ${b} = ${a + b}, puis ${sq(a + b)} = ${(a + b) ** 2}.` })
  },
  R(() => {
    const b = randInt(3, 12), a = randInt(1, b * b - 1)
    if (a === b) return null
    return numeric(`Calcule : ${sq(b)} − ${a}`, b * b - a, { explanation: `Le carré d'abord : ${sq(b)} = ${b * b}, puis ${b * b} − ${a} = ${b * b - a}.` })
  }),
  () => {
    const a = randInt(2, 9), b = randInt(2, 9)
    return numeric(`Calcule : ${sq(a)} + ${sq(b)}`, a * a + b * b, { explanation: `${sq(a)} = ${a * a} et ${sq(b)} = ${b * b}, donc ${a * a} + ${b * b} = ${a * a + b * b}.` })
  },
)

const decimaux2 = variants(
  () => {
    const a = randInt(1, 9) / 10
    return numeric(`Calcule ${sq(a)}.`, r6(a * a), { explanation: `${sq(a)} = ${fmt(a)} × ${fmt(a)} = ${fmt(r6(a * a))} (${a * 10} × ${a * 10} = ${a * a * 100}, et deux chiffres après la virgule).` })
  },
  () => {
    const a = pick([1.1, 1.2, 1.5, 2.5, 0.5, 1.3, 3.5])
    return numeric(`Calcule ${sq(a)}.`, r6(a * a), { explanation: `${sq(a)} = ${fmt(a)} × ${fmt(a)} = ${fmt(r6(a * a))}.` })
  },
  () => {
    const a = pick([0.1, 0.2, 0.3, 0.5])
    return numeric(`Calcule ${cu(a)}.`, r6(a ** 3), { explanation: `${cu(a)} = ${fmt(a)} × ${fmt(a)} × ${fmt(a)} = ${fmt(r6(a * a))} × ${fmt(a)} = ${fmt(r6(a ** 3))}.` })
  },
  () => {
    const a = pick([0.5, 1.5, 2.5, 0.3, 0.6, 0.8, 1.2])
    return numeric(`Un carreau carré mesure ${fmt(a)} m de côté. Quelle est son aire (en m²) ?`, r6(a * a), { explanation: `Aire = ${sq(a)} = ${fmt(a)} × ${fmt(a)} = ${fmt(r6(a * a))} m².` })
  },
)

// ═══ Palier 3 ═══════════════════════════════════════════════════════════
const prio3 = variants(
  () => {
    const a = randInt(2, 20), b = randInt(2, 6), c = randInt(2, 6)
    return numeric(`Calcule : ${a} + ${b} × ${sq(c)}`, a + b * c * c, { explanation: `Puissance d'abord : ${sq(c)} = ${c * c} ; puis la multiplication : ${b} × ${c * c} = ${b * c * c} ; enfin ${a} + ${b * c * c} = ${a + b * c * c}.` })
  },
  R(() => {
    const a = randInt(2, 8), b = randInt(2, 8), c = randInt(2, 9), v = (a + b) ** 2 - c * c
    if (v < 0 || c === a + b) return null
    return numeric(`Calcule : (${a} + ${b})² − ${sq(c)}`, v, { explanation: `Parenthèse : ${a} + ${b} = ${a + b} ; puissances : ${sq(a + b)} = ${(a + b) ** 2} et ${sq(c)} = ${c * c} ; enfin ${(a + b) ** 2} − ${c * c} = ${v}.` })
  }),
  () => {
    const a = randInt(2, 5), b = randInt(2, 9)
    return numeric(`Calcule : ${cu(a)} + ${sq(b)}`, a ** 3 + b * b, { explanation: `${cu(a)} = ${a ** 3} et ${sq(b)} = ${b * b}, donc ${a ** 3} + ${b * b} = ${a ** 3 + b * b}.` })
  },
  R(() => {
    const k = randInt(2, 5), a = randInt(2, 4), b = randInt(2, 9), v = k * a ** 3 - b * b
    if (v <= 0) return null
    return numeric(`Calcule : ${k} × ${cu(a)} − ${sq(b)}`, v, { explanation: `${cu(a)} = ${a ** 3}, donc ${k} × ${a ** 3} = ${k * a ** 3} ; ${sq(b)} = ${b * b} ; enfin ${k * a ** 3} − ${b * b} = ${v}.` })
  }),
  R(() => {
    const a = randInt(2, 6), x = a * a + randInt(1, 15), b = randInt(2, 9)
    return numeric(`Calcule : (${x} − ${sq(a)}) × ${b}`, (x - a * a) * b, { explanation: `Dans la parenthèse, la puissance d'abord : ${sq(a)} = ${a * a}, puis ${x} − ${a * a} = ${x - a * a} ; enfin ${x - a * a} × ${b} = ${(x - a * a) * b}.` })
  }),
)

const mesures3 = variants(
  () => {
    const a = randInt(3, 15)
    return numeric(`Un carré a un périmètre de ${4 * a} cm. Quelle est son aire (en cm²) ?`, a * a, { explanation: `Côté = ${4 * a} ÷ 4 = ${a} cm, puis aire = ${sq(a)} = ${a * a} cm².` })
  },
  () => {
    const a = randInt(2, 10)
    return fig(numeric(`Quelle est l'aire totale des six faces d'un cube d'arête ${a} cm (en cm²) ?`, 6 * a * a, { explanation: `Chaque face est un carré d'aire ${sq(a)} = ${a * a} cm². Six faces : 6 × ${a * a} = ${6 * a * a} cm².` }), cubeFigure(1, `arête ${a} cm`))
  },
  () => {
    const a = pick([2, 3, 4, 5, 6, 10])
    return numeric(`Un cube a un volume de ${a ** 3} cm³. Quelle est l'aire d'une de ses faces (en cm²) ?`, a * a, { explanation: `L'arête est le nombre dont le cube est ${a ** 3} : ${a} cm. Une face a pour aire ${sq(a)} = ${a * a} cm².` })
  },
  () => {
    const c = pick([2, 3, 5]), k = randInt(2, 5)
    return numeric(`Combien de dés cubiques de ${c} cm d'arête peut-on ranger dans une boîte cubique de ${c * k} cm d'arête ?`, k ** 3, { explanation: `${c * k} ÷ ${c} = ${k} dés par arête, donc ${k} × ${k} × ${k} = ${cu(k)} = ${k ** 3} dés.` })
  },
  () => {
    const a = randInt(3, 15)
    return numeric(`Un enclos carré a une aire de ${a * a} m². Quel est son périmètre (en m) ?`, 4 * a, { explanation: `Le côté est le nombre dont le carré est ${a * a} : ${a} m. Périmètre = 4 × ${a} = ${4 * a} m.` })
  },
)

const encadre3 = variants(
  R(() => {
    const N = randInt(20, 400), k = Math.floor(Math.sqrt(N))
    if (isSquare(N)) return null
    return numeric(`Quel est le plus grand nombre entier dont le carré est inférieur à ${N} ?`, k, { explanation: `${sq(k)} = ${k * k} < ${N} mais ${sq(k + 1)} = ${(k + 1) ** 2} > ${N}. Réponse : ${k}.` })
  }),
  R(() => {
    const N = randInt(10, 1000), k = Math.floor(Math.cbrt(N + 1e-9)) + 1
    if (isCube(N)) return null
    return numeric(`Quel est le plus petit nombre entier dont le cube dépasse ${N} ?`, k, { explanation: `${cu(k - 1)} = ${(k - 1) ** 3} ≤ ${N} mais ${cu(k)} = ${k ** 3} > ${N}. Réponse : ${k}.` })
  }),
  R(() => {
    const N = randInt(20, 300), k = Math.floor(Math.sqrt(N))
    if (isSquare(N)) return null
    return numeric(`Un carré a une aire de ${N} cm². Son côté est compris entre deux nombres entiers consécutifs. Quel est le plus petit des deux ?`, k, { explanation: `${sq(k)} = ${k * k} < ${N} < ${sq(k + 1)} = ${(k + 1) ** 2} : le côté est entre ${k} cm et ${k + 1} cm.` })
  }),
  fresh(R(() => {
    const a = randInt(10, 150), b = a + randInt(40, 200), sqs = range(1, 20).filter((n) => n * n >= a && n * n <= b)
    if (sqs.length < 2) return null
    return numeric(`Combien de nombres entiers positifs ont un carré compris entre ${a} et ${b} ?`, sqs.length, { explanation: `${sqs.map((n) => `${sq(n)} = ${n * n}`).join(', ')} sont entre ${a} et ${b} (et ${sq(sqs[0] - 1)} = ${(sqs[0] - 1) ** 2}, ${sq(sqs[sqs.length - 1] + 1)} = ${(sqs[sqs.length - 1] + 1) ** 2} n'y sont pas). Il y en a ${sqs.length}.` })
  })),
)

const somme3 = variants(
  () => {
    const a = randInt(2, 9), b = randInt(2, 9), v = (a + b) ** 2 - a * a - b * b
    return numeric(`Calcule : (${a} + ${b})² − (${sq(a)} + ${sq(b)})`, v, { explanation: `(${a} + ${b})² = ${sq(a + b)} = ${(a + b) ** 2} ; ${sq(a)} + ${sq(b)} = ${a * a} + ${b * b} = ${a * a + b * b}. Différence : ${(a + b) ** 2} − ${a * a + b * b} = ${v}. Le carré d'une somme n'est pas la somme des carrés !` })
  },
  R(() => {
    const a = randInt(4, 15), b = randInt(2, a - 1)
    return numeric(`Calcule : ${sq(a)} − ${sq(b)}`, a * a - b * b, { explanation: `${sq(a)} = ${a * a} et ${sq(b)} = ${b * b}, donc ${a * a} − ${b * b} = ${a * a - b * b}.` })
  }),
  R(() => {
    const a = randInt(6, 20), b = randInt(2, a - 2)
    return numeric(`Calcule : (${a} − ${b})²`, (a - b) ** 2, { explanation: `La parenthèse d'abord : ${a} − ${b} = ${a - b}, puis ${sq(a - b)} = ${(a - b) ** 2}.` })
  }),
  R(() => {
    const n = randInt(1, 6), d = randInt(n + 1, 9)
    if (n !== 1 && d % n === 0) return null
    return fraction(`Calcule : (${F(n, d)})² (fraction).`, n * n, d * d, { explanation: `(${F(n, d)})² = ${F(`${n} × ${n}`, `${d} × ${d}`)} = ${F(n * n, d * d)}.` })
  }),
)

// ═══ Palier 4 ═══════════════════════════════════════════════════════════
const equa4 = variants(
  () => {
    const a = randInt(4, 20)
    return numeric(`Trouve le nombre positif x tel que x² = ${a * a}.`, a, { explanation: `On cherche le nombre positif dont le carré est ${a * a} : ${a} × ${a} = ${a * a}, donc x = ${a}.` })
  },
  R(() => {
    const a = randInt(3, 12), b = randInt(5, 60)
    if (b === a) return null
    return numeric(`Trouve le nombre positif x tel que x² + ${b} = ${a * a + b}.`, a, { explanation: `x² = ${a * a + b} − ${b} = ${a * a}, et ${sq(a)} = ${a * a}, donc x = ${a}.` })
  }),
  () => {
    const a = pick([2, 3, 4, 5, 6, 7, 10])
    return numeric(`Trouve le nombre x tel que x³ = ${a ** 3}.`, a, { explanation: `${a} × ${a} × ${a} = ${a ** 3}, donc x = ${a}.` })
  },
  R(() => {
    const k = randInt(2, 6), a = randInt(3, 10)
    if (k === a) return null
    return numeric(`Trouve le nombre positif x tel que ${k} × x² = ${k * a * a}.`, a, { explanation: `x² = ${k * a * a} ÷ ${k} = ${a * a}, donc x = ${a} (car ${sq(a)} = ${a * a}).` })
  }),
)

const ordre4 = variants(
  R(() => {
    const t = randInt(2, 9), u = pick([1, 2, 3, 7, 8, 9]), n = u > 5 ? t * 10 - (10 - u) : t * 10 + u, r = Math.round(n / 10) * 10
    return numeric(`En arrondissant ${n} à la dizaine la plus proche, donne un ordre de grandeur de ${sq(n)}.`, r * r, { explanation: `${n} ≈ ${r}, donc ${sq(n)} ≈ ${sq(r)} = ${r * r} (valeur exacte : ${n * n}).` })
  }),
  R(() => {
    const t = randInt(1, 4), u = pick([1, 2, 8, 9]), n = u > 5 ? t * 10 - (10 - u) : t * 10 + u, r = Math.round(n / 10) * 10
    if (n < 8) return null
    return numeric(`En arrondissant ${n} à la dizaine la plus proche, donne un ordre de grandeur de ${cu(n)}.`, r ** 3, { explanation: `${n} ≈ ${r}, donc ${cu(n)} ≈ ${cu(r)} = ${r ** 3} (valeur exacte : ${n ** 3}).` })
  }),
  R(() => {
    const n = randInt(11, 99), d = String(n * n).length
    return numeric(`Sans calculatrice, combien de chiffres le nombre ${sq(n)} a-t-il ?`, d, { explanation: `${n * n < 1000 ? `${n} < 32 et ${sq(32)} = 1024, donc ${sq(n)} < 1000` : `${n} ≥ 32 et ${sq(32)} = 1024, donc ${sq(n)} ≥ 1000 ; et ${sq(n)} < ${sq(100)} = 10000`} : il a ${d} chiffres (${sq(n)} = ${n * n}).` })
  }),
  R(() => {
    const a = randInt(3, 12), d = pick([1, 2, 8, 9]) / 10, x = r6(d < 0.5 ? a + d : a - 1 + d), rr = Math.round(x)
    return numeric(`Une place carrée mesure ${fmt(x)} m de côté. En arrondissant le côté à l'unité, donne un ordre de grandeur de son aire (en m²).`, rr * rr, { explanation: `${fmt(x)} ≈ ${rr}, donc l'aire ≈ ${sq(rr)} = ${rr * rr} m² (valeur exacte : ${fmt(r6(x * x))} m²).` })
  }),
)

const motifs4 = variants(
  () => {
    const n = randInt(5, 30)
    return fig(numeric(`Le motif n° 1 est un jeton, le motif n° 2 un carré de 2 × 2 jetons, le motif n° 3 un carré de 3 × 3 jetons, etc. Combien de jetons faut-il ajouter pour passer du motif n° ${n} au motif n° ${n + 1} ?`, 2 * n + 1, {
      explanation: `Motif n° ${n} : ${sq(n)} = ${n * n} jetons ; motif n° ${n + 1} : ${sq(n + 1)} = ${(n + 1) ** 2} jetons. On ajoute ${(n + 1) ** 2} − ${n * n} = ${2 * n + 1} jetons.`,
    }), tokensFigure([1, 2, 3, 4]))
  },
  () => {
    const n = randInt(6, 25)
    return fig(numeric(`Avec ces motifs carrés de jetons (le motif n° k est un carré de k × k jetons), quel est le numéro du motif qui contient ${n * n} jetons ?`, n, {
      explanation: `Le motif n° k contient k² jetons. On cherche k tel que k² = ${n * n} : ${sq(n)} = ${n * n}, c'est le motif n° ${n}.`,
    }), tokensFigure([1, 2, 3, 4]))
  },
  () => {
    const n = randInt(5, 30)
    return numeric(`On dispose des jetons en carré plein de ${n} × ${n}. Combien de jetons se trouvent sur le bord du carré ?`, 4 * n - 4, {
      explanation: `Carré plein : ${sq(n)} = ${n * n} jetons. L'intérieur est un carré de ${n - 2} × ${n - 2} = ${(n - 2) ** 2} jetons. Bord : ${n * n} − ${(n - 2) ** 2} = ${4 * n - 4}.`,
    })
  },
  () => {
    const n = randInt(3, 7), tot = sum(range(1, n).map((k) => k * k))
    return fig(numeric(`On empile des boulets en pyramide à base carrée : 1 boulet au sommet, puis 2 × 2, puis 3 × 3, etc. La pyramide a ${n} étages. Combien de boulets contient-elle ?`, tot, {
      explanation: `${range(1, n).map((k) => sq(k)).join(' + ')} = ${range(1, n).map((k) => k * k).join(' + ')} = ${tot} boulets.`,
    }), pyramidFigure(n))
  },
)

const agrand4 = variants(
  () => {
    const k = randInt(2, 10)
    return numeric(`On multiplie par ${k} le côté d'un carré. Par combien son aire est-elle multipliée ?`, k * k, { explanation: `Aire = côté × côté : chaque côté est multiplié par ${k}, donc l'aire est multipliée par ${k} × ${k} = ${sq(k)} = ${k * k}.` })
  },
  () => {
    const k = randInt(2, 5)
    return numeric(`On multiplie par ${k} l'arête d'un cube. Par combien son volume est-il multiplié ?`, k ** 3, { explanation: `Volume = arête × arête × arête, donc il est multiplié par ${k} × ${k} × ${k} = ${cu(k)} = ${k ** 3}.` })
  },
  R(() => {
    const a = randInt(2, 8), k = randInt(2, 5), A = (k * a) ** 2
    return numeric(`Un carré de ${a} cm de côté a une aire de ${a * a} cm². Quelle est l'aire d'un carré ${k === 2 ? 'deux' : k === 3 ? 'trois' : k === 4 ? 'quatre' : 'cinq'} fois plus grand en longueur (côté ${k * a} cm) ?`, A, { explanation: `${sq(k * a)} = ${A} cm², soit ${k * k} fois ${a * a} cm² (${k} × ${k} = ${k * k}).` })
  }),
  () => {
    const a = pick([2, 3, 4, 5]), V = a ** 3
    return numeric(`Un cube a un volume de ${V} cm³. On double la longueur de son arête. Quel est le volume du nouveau cube (en cm³) ?`, 8 * V, { explanation: `L'arête passe de ${a} cm à ${2 * a} cm : ${cu(2 * a)} = ${8 * V} cm³, soit 2 × 2 × 2 = 8 fois plus.` })
  },
)

// ═══ Palier 5 ═══════════════════════════════════════════════════════════
const prio5 = variants(
  R(() => {
    const a = randInt(3, 7), b = randInt(2, a * a - 1), c = randInt(2, 5), d = randInt(2, 4), v = (a * a - b) * c + d ** 3
    return numeric(`Calcule : (${sq(a)} − ${b}) × ${c} + ${cu(d)}`, v, { explanation: `Parenthèse : ${sq(a)} = ${a * a}, ${a * a} − ${b} = ${a * a - b} ; puissance : ${cu(d)} = ${d ** 3} ; multiplication : ${a * a - b} × ${c} = ${(a * a - b) * c} ; enfin ${(a * a - b) * c} + ${d ** 3} = ${v}.` })
  }),
  R(() => {
    const a = randInt(3, 6), b = randInt(2, 6), c = randInt(2, 5), d = randInt(1, 20), v = a ** 3 - b * c * c + d
    if (v <= 0 || b * c * c >= a ** 3) return null
    return numeric(`Calcule : ${cu(a)} − ${b} × ${sq(c)} + ${d}`, v, { explanation: `Puissances : ${cu(a)} = ${a ** 3}, ${sq(c)} = ${c * c} ; multiplication : ${b} × ${c * c} = ${b * c * c} ; puis de gauche à droite : ${a ** 3} − ${b * c * c} = ${a ** 3 - b * c * c}, ${a ** 3 - b * c * c} + ${d} = ${v}.` })
  }),
  R(() => {
    const a = randInt(1, 6), b = randInt(1, 6), c = randInt(2, 5), v = 2 * (a + b) ** 2 - c ** 3
    if (v <= 0) return null
    return numeric(`Calcule : 2 × (${a} + ${b})² − ${cu(c)}`, v, { explanation: `Parenthèse : ${a + b} ; puissances : ${sq(a + b)} = ${(a + b) ** 2}, ${cu(c)} = ${c ** 3} ; 2 × ${(a + b) ** 2} = ${2 * (a + b) ** 2} ; enfin ${2 * (a + b) ** 2} − ${c ** 3} = ${v}.` })
  }),
  R(() => {
    const a = randInt(2, 9), b = randInt(2, 9), c = pick([2, 5, 10, 4]), s = a * a + b * b
    if (s % c !== 0) return null
    return numeric(`Calcule : (${sq(a)} + ${sq(b)}) ÷ ${c}`, s / c, { explanation: `Parenthèse : ${a * a} + ${b * b} = ${s}, puis ${s} ÷ ${c} = ${s / c}.` })
  }),
  R(() => {
    const b = randInt(4, 9), c = randInt(1, b - 1), a = randInt(1, 6), v = (a + (b - c) ** 2) ** 2
    if (v > 900) return null
    return numeric(`Calcule : (${a} + (${b} − ${c})²)²`, v, { explanation: `Parenthèse intérieure : ${b} − ${c} = ${b - c}, ${sq(b - c)} = ${(b - c) ** 2} ; puis ${a} + ${(b - c) ** 2} = ${a + (b - c) ** 2} ; enfin ${sq(a + (b - c) ** 2)} = ${v}.` })
  }),
)

const PAINT = [
  { q: 'n’ont aucune face peinte', f: (n: number) => (n - 2) ** 3, e: (n: number) => `Les cubes sans peinture forment le cube intérieur de ${n - 2} × ${n - 2} × ${n - 2} : ${cu(n - 2)} = ${(n - 2) ** 3}.` },
  { q: 'ont exactement une face peinte', f: (n: number) => 6 * (n - 2) ** 2, e: (n: number) => `Sur chacune des 6 faces, les cubes du milieu (hors arêtes) forment un carré de ${n - 2} × ${n - 2} = ${(n - 2) ** 2}. Total : 6 × ${(n - 2) ** 2} = ${6 * (n - 2) ** 2}.` },
  { q: 'ont exactement deux faces peintes', f: (n: number) => 12 * (n - 2), e: (n: number) => `Ce sont les cubes des arêtes, sans les coins : ${n - 2} par arête, et un cube a 12 arêtes : 12 × ${n - 2} = ${12 * (n - 2)}.` },
  { q: 'ont au moins une face peinte', f: (n: number) => n ** 3 - (n - 2) ** 3, e: (n: number) => `Total : ${cu(n)} = ${n ** 3}. Sans peinture : le cube intérieur, ${cu(n - 2)} = ${(n - 2) ** 3}. Au moins une face : ${n ** 3} − ${(n - 2) ** 3} = ${n ** 3 - (n - 2) ** 3}.` },
]
const peint5 = variants(
  ...PAINT.map((p) => () => {
    const n = randInt(3, 8)
    return fig(numeric(`Un grand cube formé de ${n} × ${n} × ${n} petits cubes est trempé dans la peinture rouge, puis séparé en petits cubes. Combien de petits cubes ${p.q} ?`, p.f(n), { explanation: p.e(n) }), cubeFigure(n, undefined, true))
  }),
)

const SUMS2 = range(2, 60).flatMap((n) => range(1, n).filter((m) => m * m + n * n <= 400 && m !== n).map((m) => [m, n] as [number, number]))
const sommes5 = variants(
  () => {
    const [a, b] = pick(SUMS2), N = a * a + b * b
    return twoSquares(`Écris ${N} comme la somme des carrés de deux nombres entiers non nuls. Donne les deux nombres.`, N, a, b, `${N} = ${sq(a)} + ${sq(b)} = ${a * a} + ${b * b}.`)
  },
  () => {
    const n = randInt(3, 20), N = n * n + (n + 1) ** 2
    return numeric(`La somme des carrés de deux nombres entiers consécutifs est ${N}. Quel est le plus petit des deux ?`, n, { explanation: `On essaie : ${sq(n)} + ${sq(n + 1)} = ${n * n} + ${(n + 1) ** 2} = ${N}. (Les deux carrés valent environ la moitié de ${N} chacun.)` })
  },
  () => {
    const n = randInt(5, 60)
    return numeric(`Trouve le nombre entier n tel que (n + 1)² − n² = ${2 * n + 1}.`, n, { explanation: `(n + 1)² − n² = 2 × n + 1 (on ajoute une « bordure » de 2n + 1 jetons à un carré de n × n). Donc 2 × n + 1 = ${2 * n + 1}, 2 × n = ${2 * n}, n = ${n}. Vérification : ${sq(n + 1)} − ${sq(n)} = ${(n + 1) ** 2} − ${n * n} = ${2 * n + 1}.` })
  },
  () => {
    const n = randInt(2, 12), N = n * n + (n + 1) ** 2 + (n + 2) ** 2
    return numeric(`La somme des carrés de trois nombres entiers consécutifs est ${N}. Quel est le plus petit des trois ?`, n, { explanation: `${sq(n)} + ${sq(n + 1)} + ${sq(n + 2)} = ${n * n} + ${(n + 1) ** 2} + ${(n + 2) ** 2} = ${N}. (Chaque carré vaut environ le tiers de ${N}.)` })
  },
)

const composees5 = variants(
  R(() => {
    const a = randInt(6, 20), e = randInt(1, Math.floor(a / 3)), inner = a - 2 * e, A = a * a - inner * inner
    return fig(numeric(`Un cadre carré (en vert) mesure ${a} cm de côté à l'extérieur et ${e} cm de large tout autour. Quelle est l'aire du cadre (en cm²) ?`, A, {
      explanation: `Le carré intérieur a pour côté ${a} − 2 × ${e} = ${inner} cm. Aire du cadre : ${sq(a)} − ${sq(inner)} = ${a * a} − ${inner * inner} = ${A} cm².`,
    }), squareFigure(`${a} cm`, { ratio: inner / a }))
  }),
  R(() => {
    const a = randInt(4, 10), b = randInt(2, a - 2), V = a ** 3 - b ** 3
    return numeric(`Dans un cube de bois de ${a} cm d'arête, on creuse une cavité cubique de ${b} cm d'arête. Quel est le volume de bois restant (en cm³) ?`, V, {
      explanation: `${cu(a)} − ${cu(b)} = ${a ** 3} − ${b ** 3} = ${V} cm³.`,
    })
  }),
  () => {
    const u = randInt(2, 12)
    return fig(numeric(`Cette croix est formée de 5 carrés identiques de ${u} cm de côté. Quelle est son aire (en cm²) ?`, 5 * u * u, {
      explanation: `Un carré : ${sq(u)} = ${u * u} cm². Cinq carrés : 5 × ${u * u} = ${5 * u * u} cm².`,
    }), crossFigure(`côté d'un carré : ${u} cm`))
  },
  R(() => {
    const a = randInt(5, 15), b = randInt(2, a - 2), A = a * a - b * b
    return numeric(`Dans une plaque carrée de ${a} cm de côté, on découpe un coin carré de ${b} cm de côté. Quelle est l'aire de la plaque restante (en cm²) ?`, A, {
      explanation: `${sq(a)} − ${sq(b)} = ${a * a} − ${b * b} = ${A} cm².`,
    })
  }),
)

// ═══ Problèmes d'amélioration ═══════════════════════════════════════════
const up1: Maker[] = [
  model('Le chiffre des unités', () => {
    const n = randInt(100, 999), e = pick([2, 3]), u = n % 10, v = e === 2 ? (u * u) % 10 : (u ** 3) % 10
    return numeric(`Quel est le chiffre des unités de ${e === 2 ? sq(n) : cu(n)} ?`, v, {
      explanation: `Le chiffre des unités ne dépend que du chiffre des unités de ${n}, qui est ${u} : ${e === 2 ? sq(u) : cu(u)} = ${u ** e}, qui se termine par ${v}.`,
    })
  }),
  model('Les nombres impairs', () => {
    const n = randInt(6, 30), last = 2 * n - 1
    return numeric(`Calcule 1 + 3 + 5 + … + ${last} (la somme de tous les nombres impairs de 1 à ${last}). Indice : 1 = 1², 1 + 3 = 2², 1 + 3 + 5 = 3²…`, n * n, {
      explanation: `De 1 à ${last}, il y a ${n} nombres impairs. La somme des n premiers nombres impairs vaut n² : ici ${sq(n)} = ${n * n}.`,
    })
  }),
  model('Carrés voisins', () => {
    const n = randInt(20, 99)
    return numeric(`Sans calculer ${sq(n + 1)} ni ${sq(n)}, trouve la différence ${sq(n + 1)} − ${sq(n)}.`, 2 * n + 1, {
      explanation: `Pour passer d'un carré de ${n} × ${n} jetons à un carré de ${n + 1} × ${n + 1}, on ajoute une rangée de ${n}, une colonne de ${n} et un coin : ${n} + ${n} + 1 = ${2 * n + 1}.`,
    })
  }),
]

const up2: Maker[] = [
  model('Tous les carrés du quadrillage', () => {
    const n = randInt(2, 5), m = n + randInt(0, 3), tot = squaresIn(m, n)
    return withMeta(numeric(`Combien de carrés de toutes tailles peut-on voir dans ce quadrillage de ${m} carreaux sur ${n} ?`, tot, {
      explanation: `${range(1, n).map((k) => `côté ${k} : ${m - k + 1} × ${n - k + 1} = ${(m - k + 1) * (n - k + 1)}`).join(' ; ')}. Total : ${tot}.${m === n ? ` (C'est ${range(1, n).map((k) => sq(k)).join(' + ')}.)` : ''}`,
    }), { figure: gridFigure(n, m) })
  }),
  model('La somme des cubes', () => {
    const n = randInt(4, 15), t = (n * (n + 1)) / 2
    return numeric(`Calcule 1³ + 2³ + 3³ + … + ${cu(n)}. Remarque : 1³ = 1², 1³ + 2³ = 3², 1³ + 2³ + 3³ = 6²…`, t * t, {
      explanation: `La somme des cubes de 1 à n est le carré de 1 + 2 + … + n. Ici 1 + 2 + … + ${n} = ${t}, donc la somme vaut ${sq(t)} = ${t * t}.`,
    })
  }),
  model('Le carré mystère', () => {
    const u = pick([1, 4, 5, 6, 9]), lo = randInt(1, 8) * 100, hi = lo + 300
    const sol = range(1, 40).map((k) => k * k).filter((x) => x >= lo && x <= hi && x % 10 === u)
    if (sol.length !== 1) return null
    return numeric(`Je suis le carré d'un nombre entier, compris entre ${lo} et ${hi}, et mon chiffre des unités est ${u}. Qui suis-je ?`, sol[0], {
      explanation: `Carrés entre ${lo} et ${hi} : ${range(1, 40).map((k) => k * k).filter((x) => x >= lo && x <= hi).join(', ')}. Le seul qui se termine par ${u} est ${sol[0]} = ${sq(Math.sqrt(sol[0]))}.`,
    })
  }),
]

const up3: Maker[] = [
  model('Le cube peint à l’envers', () => {
    const n = randInt(4, 12), m = (n - 2) ** 3, ask = randInt(0, 2)
    const ans = ask === 0 ? n ** 3 - m : ask === 1 ? 12 * (n - 2) : 6 * (n - 2) ** 2
    const q = ask === 0 ? 'ont au moins une face peinte' : ask === 1 ? 'ont exactement deux faces peintes' : 'ont exactement une face peinte'
    return numeric(`Un grand cube formé de petits cubes identiques est peint en rouge sur toutes ses faces, puis découpé. ${m} petits cubes n'ont aucune face peinte. Combien de petits cubes ${q} ?`, ans, {
      explanation: `Les cubes non peints forment le cube intérieur : ${m} = ${cu(n - 2)}, donc ${n - 2} petits cubes par arête à l'intérieur et ${n} pour le grand cube. ${ask === 0 ? `Total ${cu(n)} = ${n ** 3} ; peints : ${n ** 3} − ${m} = ${ans}.` : ask === 1 ? `Deux faces : les cubes des 12 arêtes sans les coins, 12 × ${n - 2} = ${ans}.` : `Une face : sur chacune des 6 faces, un carré de ${n - 2} × ${n - 2}, soit 6 × ${(n - 2) ** 2} = ${ans}.`}`,
    })
  }),
  model('Différence de carrés', () => {
    const a = randInt(10, 60), N = 2 * a + 1
    return numeric(`Le nombre impair ${N} est la différence des carrés de deux nombres entiers consécutifs. Quel est le plus grand des deux ?`, a + 1, {
      explanation: `(n + 1)² − n² = 2n + 1. Donc 2n + 1 = ${N}, n = ${a}, et le plus grand est ${a + 1} : ${sq(a + 1)} − ${sq(a)} = ${(a + 1) ** 2} − ${a * a} = ${N}.`,
    })
  }),
  model('Le carré qui grandit', () => {
    const a = randInt(5, 30), k = randInt(1, 6), D = (a + k) ** 2 - a * a
    return numeric(`On augmente de ${k} cm le côté d'un carré : son aire augmente de ${D} cm². Quel était le côté du carré au départ (en cm) ?`, a, {
      explanation: `L'aire ajoutée est formée de deux bandes de ${k} cm sur le côté c, et d'un petit carré de ${k} × ${k} : 2 × ${k} × c + ${k * k} = ${D}. Donc ${2 * k} × c = ${D - k * k} et c = ${a} cm. Vérification : ${sq(a + k)} − ${sq(a)} = ${(a + k) ** 2} − ${a * a} = ${D}.`,
    })
  }),
]

// ═══ Problèmes de l'hôtel de ville ═══════════════════════════════════════
const age1: Maker[] = [
  model('Le jardin du cloître', () => {
    const a = randInt(6, 25), p = randInt(3, 12)
    return withMeta(numeric(`Le jardin du cloître est un carré de ${a * a} m². Les moines veulent l'entourer d'une haie qui coûte ${p} deniers le mètre. Combien la haie coûtera-t-elle ?`, 4 * a * p, {
      explanation: `Le côté est le nombre dont le carré est ${a * a} : ${a} m. Périmètre : 4 × ${a} = ${4 * a} m. Coût : ${4 * a} × ${p} = ${4 * a * p} deniers.`,
    }), { figure: squareFigure(`aire : ${a * a} m²`) })
  }),
  model('Les coffrets du trésor', () => {
    const c = pick([2, 3, 4, 5]), k = randInt(2, 5), A = c * k
    return withMeta(numeric(`Le trésorier range des coffrets cubiques de ${c} dm d'arête dans un grand coffre cubique de ${A} dm d'arête (voir le schéma). Combien de coffrets peut-il ranger au maximum ?`, k ** 3, {
      explanation: `${A} ÷ ${c} = ${k} coffrets par arête. Le coffre contient ${k} × ${k} × ${k} = ${cu(k)} = ${k ** 3} coffrets (on peut aussi faire ${cu(A)} ÷ ${cu(c)} = ${A ** 3} ÷ ${c ** 3} = ${k ** 3}).`,
    }), { figure: cubeFigure(k, `${A} dm`) })
  }),
  model('La pyramide de boulets', () => {
    const n = randInt(3, 9), tot = sum(range(1, n).map((k) => k * k))
    const [obj, where, e] = pick([['boulets de canon', 'Dans la cour du château', ''], ['oranges', 'Sur l’étal du marchand', 'e'], ['pommes', 'Au marché', 'e'], ['boulets de pierre', 'Près de la catapulte', '']])
    const ask = randInt(0, 1)
    return withMeta(numeric(`${where}, des ${obj} sont empilé${e}s en pyramide à base carrée : ${n} × ${n} au premier étage, ${n - 1} × ${n - 1} au deuxième, et ainsi de suite jusqu'à un${e} seul${e} au sommet (voir le schéma). ${ask === 0 ? `Combien de ${obj} la pyramide contient-elle ?` : `On veut ajouter un nouvel étage en dessous du premier. Combien la pyramide contiendra-t-elle alors de ${obj} ?`}`, ask === 0 ? tot : tot + (n + 1) ** 2, {
      explanation: ask === 0
        ? `${range(1, n).reverse().map((k) => sq(k)).join(' + ')} = ${range(1, n).reverse().map((k) => k * k).join(' + ')} = ${tot}.`
        : `Pyramide actuelle : ${range(1, n).reverse().map((k) => k * k).join(' + ')} = ${tot}. Le nouvel étage est un carré de ${n + 1} × ${n + 1} = ${(n + 1) ** 2}. Total : ${tot} + ${(n + 1) ** 2} = ${tot + (n + 1) ** 2}.`,
    }), { figure: pyramidFigure(n) })
  }),
]

const age2: Maker[] = [
  model('Le carrelage de la salle d’armes', () => {
    const a = randInt(3, 9), c = pick([20, 25, 50]), n = (a * 100) / c, p = pick([2, 3, 4, 5])
    return withMeta(numeric(`La salle d'armes est un carré de ${a} m de côté. On la carrelle avec des carreaux carrés de ${c} cm de côté, vendus ${p} € pièce. Quel est le prix total des carreaux (en €) ?`, n * n * p, {
      explanation: `${a} m = ${a * 100} cm, donc ${a * 100} ÷ ${c} = ${n} carreaux par côté. Il faut ${sq(n)} = ${n * n} carreaux, soit ${n * n} × ${p} = ${n * n * p} €.`,
    }), { figure: squareFigure(`${a} m`, undefined, GOLD) })
  }),
  model('Le cadre du portrait', () => {
    const a = randInt(10, 40), e = randInt(2, Math.floor(a / 4)), inner = a - 2 * e, A = a * a - inner * inner
    return withMeta(numeric(`Le portrait du roi est carré. Avec son cadre doré, l'ensemble forme un carré de ${a} cm de côté ; le cadre a une largeur de ${e} cm tout autour. Quelle est l'aire du cadre doré (en cm²) ?`, A, {
      explanation: `Le portrait mesure ${a} − 2 × ${e} = ${inner} cm de côté. Aire du cadre : ${sq(a)} − ${sq(inner)} = ${a * a} − ${inner * inner} = ${A} cm².`,
    }), { figure: squareFigure(`${a} cm`, { ratio: inner / a, label: 'portrait' }, GOLD) })
  }),
  model('Le cube du menuisier', () => {
    const n = randInt(4, 9), p = PAINT[randInt(1, 2)]
    return withMeta(numeric(`Le menuisier a fabriqué un grand cube de ${n} × ${n} × ${n} petits cubes de bois, puis a peint en rouge toutes ses faces avant de le démonter (voir le schéma). Combien de petits cubes ${p.q} ?`, p.f(n), { explanation: p.e(n) }), { figure: cubeFigure(n, undefined, true) })
  }),
]

const age3: Maker[] = [
  model('Le grand cube peint', () => {
    const n = randInt(4, 9), z = (n - 2) ** 3, one = 6 * (n - 2) ** 2, two = 12 * (n - 2), three = 8
    const ask = randInt(0, 2)
    const q = ask === 0 ? `Combien de petits cubes ont au moins deux faces peintes ?` : ask === 1 ? `Combien de petits cubes ont au plus une face peinte ?` : `Combien de petits cubes ont un nombre impair de faces peintes ?`
    const ans = ask === 0 ? two + three : ask === 1 ? z + one : one + three
    return withMeta(numeric(`Un grand cube de ${n} × ${n} × ${n} petits cubes est peint sur toutes ses faces, puis démonté. ${q}`, ans, {
      explanation: `Aucune face : ${cu(n - 2)} = ${z} ; une face : 6 × ${sq(n - 2)} = ${one} ; deux faces : 12 × ${n - 2} = ${two} ; trois faces (les coins) : 8. Vérification : ${z} + ${one} + ${two} + 8 = ${n ** 3} = ${cu(n)}. Réponse : ${ask === 0 ? `${two} + 8` : ask === 1 ? `${z} + ${one}` : `${one} + 8`} = ${ans}.`,
    }), { figure: cubeFigure(n, undefined, true) })
  }),
  model('Le champ agrandi', () => {
    const a = randInt(8, 40), k = randInt(2, 8), D = (a + k) ** 2 - a * a
    return withMeta(numeric(`Un paysan possède un champ carré. Le seigneur lui accorde une bande de terre de ${k} m de large le long de deux côtés, de sorte que le champ reste carré (voir le schéma). L'aire de son champ augmente alors de ${D} m². Quel était le côté du champ au départ (en m) ?`, a, {
      explanation: `La surface ajoutée = deux rectangles de ${k} m sur c, plus un carré de ${k} × ${k} : 2 × ${k} × c + ${k * k} = ${D}. Donc ${2 * k} × c = ${D - k * k} et c = ${a} m. Vérification : ${sq(a + k)} − ${sq(a)} = ${(a + k) ** 2} − ${a * a} = ${D}.`,
    }), { figure: growFigure('c', `${k} m`, 0.72) })
  }),
  model('Les carrés de la mosaïque', () => {
    const n = randInt(4, 7), tot = sum(range(1, n).map((k) => k * k)), big = randInt(2, n - 1), cnt = (n - big + 1) ** 2
    const ask = randInt(0, 1)
    return withMeta(numeric(ask === 0
      ? `Une mosaïque carrée est formée de ${n} × ${n} petits carreaux (voir le schéma). Combien de carrés de toutes tailles peut-on y voir ?`
      : `Une mosaïque carrée est formée de ${n} × ${n} petits carreaux (voir le schéma). Combien de carrés de ${big} × ${big} carreaux peut-on y voir ?`, ask === 0 ? tot : cnt, {
      explanation: ask === 0
        ? `Côté 1 : ${sq(n)} ; côté 2 : ${sq(n - 1)} ; … ; côté ${n} : 1. Total : ${range(1, n).reverse().map((k) => k * k).join(' + ')} = ${tot}.`
        : `Un carré de ${big} × ${big} peut commencer à ${n - big + 1} positions en largeur et ${n - big + 1} en hauteur : ${sq(n - big + 1)} = ${cnt}.`,
    }), { figure: gridFigure(n) })
  }),
]

export const CONTENT: SubjectContent | null = {
  tiers: [
    [carre1, cube1, ecriture1, dizaines1],
    [racine2, racineCube2, prio2, decimaux2],
    [prio3, mesures3, encadre3, somme3],
    [equa4, ordre4, motifs4, agrand4],
    [prio5, peint5, sommes5, composees5],
  ],
  upgrades: [up1, up2, up3],
  age: [age1, age2, age3],
}
