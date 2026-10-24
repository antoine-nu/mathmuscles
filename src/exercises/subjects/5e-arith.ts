// Arithmétique (5e) : multiples, diviseurs, critères de divisibilité (2, 3, 5, 9, 10), nombres premiers,
// division euclidienne (dividende = diviseur × quotient + reste), problèmes de partage, de rangement, de cycles.
import {
  F, choice, fraction, fresh, gcd, numeric, pick, randInt, shuffle, variants, withMeta,
  type Exercise, type Maker, type SubjectContent,
} from '../utils'
import { prenom } from '../contexts'
import { fitPoints, type FigPoint, type FigSegment, type Figure } from '../figure'

// ── Aides locales ───────────────────────────────────────────────────────
const RED = '#b8362f'
const GREEN = '#2f8f4e'
const BLUE = '#2f5fb3'
const GOLD = '#d9a020'
const PURPLE = '#7a4bb0'
const sum = (a: number[]) => a.reduce((t, v) => t + v, 0)
const s = (n: number) => (n > 1 ? 's' : '')
const range = (a: number, b: number) => Array.from({ length: Math.max(0, b - a + 1) }, (_, i) => a + i)
const lcm = (a: number, b: number) => (a / gcd(a, b)) * b
const isPrime = (n: number) => {
  if (n < 2) return false
  for (let d = 2; d * d <= n; d++) if (n % d === 0) return false
  return true
}
const divisors = (n: number) => range(1, n).filter((d) => n % d === 0)
const primesIn = (a: number, b: number) => range(a, b).filter(isPrime)
const factorize = (n: number) => {
  const f: number[] = []
  let m = n
  for (let p = 2; p * p <= m; p++) while (m % p === 0) { f.push(p); m /= p }
  if (m > 1) f.push(m)
  return f
}
/** Décomposition écrite avec exposants : 2^3 × 3 × 5 */
const factText = (fs: number[]) =>
  [...new Set(fs)].sort((a, b) => a - b).map((p) => {
    const e = fs.filter((x) => x === p).length
    return e > 1 ? `${p}^${e}` : `${p}`
  }).join(' × ')
const digitSum = (n: number) => sum(String(n).split('').map(Number))
const digitsPlus = (n: number) => String(n).split('').filter((c) => c !== '0').join(' + ')
/** Égalité de la division euclidienne : « 47 = 6 × 7 + 5 » (sans « + 0 »). */
const eu = (a: number, b: number) => `${a} = ${b} × ${Math.floor(a / b)}${a % b ? ` + ${a % b}` : ''}`
/** Somme des chiffres d'un nombre à trou ★ (chiffres nuls omis). */
const starSum = (...ds: (number | string)[]) => ds.filter((d) => d !== 0).join(' + ')
/** Décalage dans la semaine. */
const advance = (r: number, from: string) => (r === 0 ? `c'est le même jour de la semaine que le ${from}` : `on avance de ${r} jour${s(r)} à partir du ${from}`)
const andList = (a: (string | number)[]) => (a.length === 1 ? `${a[0]}` : `${a.slice(0, -1).join(', ')} et ${a[a.length - 1]}`)
const ord = (n: number) => (n === 1 ? '1re' : `${n}e`)
const ordM = (n: number) => (n === 1 ? '1er' : `${n}e`)
const JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']

/** Relance le tirage tant que le générateur renvoie null (nombres pas assez « propres »). */
function retry(draw: () => Exercise | null): Exercise {
  for (let i = 0; i < 5000; i++) {
    const ex = draw()
    if (ex) return ex
  }
  throw new Error('tirage introuvable')
}
/** Variante d'entraînement avec rejet. */
const R = (draw: () => Exercise | null): Maker => () => retry(draw)
/** Problème titré (avec rejet). */
const model = (title: string, draw: () => Exercise | null): Maker => () => {
  const ex = retry(draw)
  return withMeta(ex, { title: ex.title ?? title })
}

// ── Constructeurs de réponses propres au chapitre ───────────────────────
/** Liste d'entiers (ordre indifférent), saisie « 1 ; 2 ; 4 ». */
function intList(prompt: string, values: number[], explanation: string): Exercise {
  const want = [...new Set(values)].sort((a, b) => a - b)
  const read = (v: string) => {
    const t = v.replace(/\bet\b/gi, ' ')
    if (!/\d/.test(t) || !/^[\d\s;,{}()]+$/.test(t)) return null
    return [...new Set((t.match(/\d+/g) ?? []).map(Number))].sort((a, b) => a - b)
  }
  return {
    prompt,
    kind: 'input',
    answer: want.join(' ; '),
    explanation,
    inputHint: 'Nombres séparés par ;',
    format: 'des nombres entiers séparés par ;, par exemple 1 ; 2 ; 4',
    keypad: [';'],
    isValid: (v) => read(v) !== null,
    diagnose: (v) => {
      const got = read(v)
      if (!got) return undefined
      if (got.every((x) => want.includes(x)) && got.length < want.length) return 'Ces nombres conviennent, mais il en manque.'
      return undefined
    },
    check: (v) => {
      const got = read(v)
      return !!got && got.length === want.length && got.every((x, i) => x === want[i])
    },
  }
}

/** Quotient et reste d'une division euclidienne, saisis « 12 ; 3 ». */
function quotRest(prompt: string, q: number, r: number, explanation: string): Exercise {
  const read = (v: string) => v.match(/\d+/g)?.map(Number) ?? []
  return {
    prompt,
    kind: 'input',
    answer: `quotient ${q} ; reste ${r}`,
    explanation,
    inputHint: 'quotient ; reste',
    format: 'le quotient puis le reste, séparés par ; (par exemple 12 ; 3)',
    keypad: [';'],
    isValid: (v) => read(v).length === 2,
    diagnose: (v) => {
      const g = read(v)
      return g.length === 2 && g[0] === r && g[1] === q ? 'Tu as inversé : écris d’abord le quotient, puis le reste.' : undefined
    },
    check: (v) => {
      const g = read(v)
      return g.length === 2 && g[0] === q && g[1] === r
    },
  }
}

/** Produit de facteurs premiers (ordre indifférent), saisi « 2^2 × 3 × 5 » ou « 2 × 2 × 3 × 5 ». */
function primeProduct(prompt: string, n: number, explanation: string, shown?: string): Exercise {
  const SUP: Record<string, string> = { '²': '^2', '³': '^3', '⁴': '^4', '⁵': '^5', '⁶': '^6', '⁷': '^7' }
  const read = (v: string): number[] | null => {
    const t = v.replace(/[²³⁴⁵⁶⁷]/g, (c) => SUP[c]).replace(/\s+/g, '').replace(/^\d+=/, '').replace(/[×x·*.]/g, '*')
    if (!t) return null
    const out: number[] = []
    for (const p of t.split('*')) {
      const m = /^(\d+)(?:\^(\d+))?$/.exec(p)
      if (!m) return null
      const e = Number(m[2] ?? 1)
      if (e < 1 || e > 20) return null
      for (let i = 0; i < e; i++) out.push(Number(m[1]))
    }
    return out
  }
  const prod = (a: number[]) => a.reduce((t, v) => t * v, 1)
  return {
    prompt,
    kind: 'input',
    answer: shown ?? factText(factorize(n)),
    explanation,
    inputHint: 'ex. 2^2 × 3 × 5',
    format: 'un produit de nombres premiers, par exemple 2 × 2 × 3 × 5 ou 2^2 × 3 × 5',
    keypad: ['×', '^'],
    isValid: (v) => read(v) !== null,
    diagnose: (v) => {
      const f = read(v)
      if (!f) return undefined
      if (prod(f) === n && !f.every(isPrime)) return 'Le produit vaut bien ' + n + ', mais tous les facteurs ne sont pas premiers.'
      return undefined
    },
    check: (v) => {
      const f = read(v)
      return !!f && f.length >= 1 && f.every(isPrime) && prod(f) === n
    },
  }
}

const normWord = (v: string) =>
  v.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/^(le|la|les|l'|l’|c'est|c’est)\s*/, '').replace(/[.!\s]+$/, '')
    .replace(/^(.{3,}?)(es|e|s)$/, '$1').replace(/(tt|ll|nn)$/, (m) => m[0])
/** Réponse en un mot (jour, couleur, prénom, lettre). */
function word(prompt: string, answer: string, explanation: string, hint = 'Un mot'): Exercise {
  return {
    prompt,
    kind: 'input',
    answer,
    explanation,
    inputHint: hint,
    format: 'un mot, par exemple jeudi',
    isValid: (v) => /[a-zA-ZÀ-ÿ]/.test(v),
    check: (v) => normWord(v) === normWord(answer),
  }
}

// ── Schémas ─────────────────────────────────────────────────────────────
const hiddenPt = (x: number, y: number): FigPoint => ({ x, y, hidden: true, label: '' })

/** Perles d'un collier (couleurs), en ligne, suivies de « … ». */
function beadsFigure(cols: { c: string; l: string }[]): Figure {
  const n = cols.length, step = Math.min(30, 270 / n), r = Math.min(11, step / 2 - 2)
  const x0 = (320 - step * (n - 1)) / 2 - 12, y = 100
  const points: Record<string, FigPoint> = { s0: hiddenPt(8, y), s1: hiddenPt(312, y) }
  const segments: FigSegment[] = [{ a: 's0', b: 's1', color: '#8a7a5a' }]
  const polygons: { pts: string[]; fill: string }[] = []
  const notes: { x: number; y: number; text: string }[] = []
  const circles: { c: string; r: number }[] = []
  cols.forEach((col, i) => {
    const cx = x0 + i * step
    points[`c${i}`] = hiddenPt(cx, y)
    const names: string[] = []
    for (let k = 0; k < 12; k++) {
      const a = (k * Math.PI) / 6
      points[`p${i}-${k}`] = hiddenPt(cx + r * Math.cos(a), y + r * Math.sin(a))
      names.push(`p${i}-${k}`)
    }
    polygons.push({ pts: names, fill: col.c })
    circles.push({ c: `c${i}`, r })
    notes.push({ x: cx, y: y + 4, text: col.l }, { x: cx, y: y + r + 16, text: String(i + 1) })
  })
  notes.push({ x: x0 + n * step - 2, y: y + 5, text: '…' })
  return { points, segments, polygons, circles, notes, caption: 'Les numéros indiquent le rang des perles.' }
}

/** Rectangle coté (proportions respectées). */
function rectFigure(a: number, b: number, la: string, lb: string, extra: { dots?: boolean } = {}): Figure {
  const pts = fitPoints({ A: [0, 0], B: [a, 0], C: [a, b], D: [0, b] }, 320, 220, 40)
  for (const k of ['A', 'B', 'C', 'D']) pts[k] = { ...pts[k], hidden: !extra.dots, label: '' }
  const segments: FigSegment[] = [{ a: 'A', b: 'B', label: la }, { a: 'B', b: 'C', label: lb }, { a: 'C', b: 'D' }, { a: 'D', b: 'A' }]
  const out: Figure = { points: pts, segments, polygons: [{ pts: ['A', 'B', 'C', 'D'], fill: extra.dots ? GREEN : GOLD }] }
  if (extra.dots) out.caption = 'Un arbre à chaque coin, puis d’autres arbres régulièrement espacés sur les côtés.'
  else out.caption = ''
  return out
}

/** Deux roues dentées qui s'engrènent. */
function gearsFigure(t1: number, t2: number): Figure {
  const r1 = 22 + t1 * 1.6, r2 = 22 + t2 * 1.6
  const k = Math.min(1, 250 / (2 * r1 + 2 * r2 + 16), 150 / (2 * Math.max(r1, r2) + 16))
  const a = r1 * k, b = r2 * k
  const cx1 = 160 - (a + b + 4) / 2 + 0, cx2 = cx1 + a + b + 4, cy = 105
  const points: Record<string, FigPoint> = { O1: { x: cx1, y: cy, label: '' }, O2: { x: cx2, y: cy, label: '' } }
  const segments: FigSegment[] = []
  const teeth = (name: string, cx: number, rr: number, t: number, phase: number) => {
    for (let i = 0; i < t; i++) {
      const ang = phase + (2 * Math.PI * i) / t
      points[`${name}i${i}`] = hiddenPt(cx + rr * Math.cos(ang), cy + rr * Math.sin(ang))
      points[`${name}o${i}`] = hiddenPt(cx + (rr + 5) * Math.cos(ang), cy + (rr + 5) * Math.sin(ang))
      segments.push({ a: `${name}i${i}`, b: `${name}o${i}` })
    }
  }
  teeth('A', cx1, a, t1, 0)
  teeth('B', cx2, b, t2, Math.PI / t2)
  return {
    points, segments,
    circles: [{ c: 'O1', r: a }, { c: 'O2', r: b }],
    notes: [{ x: cx1, y: cy + a + 22, text: `${t1} dents` }, { x: cx2, y: cy + b + 22, text: `${t2} dents` }],
    caption: '',
  }
}

/** Calendrier d'un mois : `start` = indice du jour de la semaine du 1er (0 = lundi). */
function calendarFigure(start: number, days: number, mark: number): Figure {
  const rows = Math.ceil((start + days) / 7)
  const cw = 40, ch = Math.min(30, 170 / (rows + 1)), x0 = 20, y0 = 14
  const points: Record<string, FigPoint> = {}
  const segments: FigSegment[] = []
  for (let i = 0; i <= rows + 1; i++) {
    points[`h${i}a`] = hiddenPt(x0, y0 + i * ch); points[`h${i}b`] = hiddenPt(x0 + 7 * cw, y0 + i * ch)
    segments.push({ a: `h${i}a`, b: `h${i}b` })
  }
  for (let j = 0; j <= 7; j++) {
    points[`v${j}a`] = hiddenPt(x0 + j * cw, y0); points[`v${j}b`] = hiddenPt(x0 + j * cw, y0 + (rows + 1) * ch)
    segments.push({ a: `v${j}a`, b: `v${j}b` })
  }
  const notes = ['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((t, j) => ({ x: x0 + j * cw + cw / 2, y: y0 + ch / 2 + 5, text: t }))
  const polygons: { pts: string[]; fill: string }[] = []
  for (let d = 1; d <= days; d++) {
    const idx = start + d - 1, r = Math.floor(idx / 7) + 1, c = idx % 7
    notes.push({ x: x0 + c * cw + cw / 2, y: y0 + r * ch + ch / 2 + 5, text: String(d) })
    if (d === mark) {
      const k = `m${d}`
      points[`${k}a`] = hiddenPt(x0 + c * cw, y0 + r * ch); points[`${k}b`] = hiddenPt(x0 + (c + 1) * cw, y0 + r * ch)
      points[`${k}c`] = hiddenPt(x0 + (c + 1) * cw, y0 + (r + 1) * ch); points[`${k}d`] = hiddenPt(x0 + c * cw, y0 + (r + 1) * ch)
      polygons.push({ pts: [`${k}a`, `${k}b`, `${k}c`, `${k}d`], fill: RED })
    }
  }
  return { w: 320, h: Math.ceil(y0 + (rows + 1) * ch + 14), points, segments, notes, polygons, caption: '' }
}

// ═══ Palier 1 ═══════════════════════════════════════════════════════════
// Multiples d'un nombre
const multiples1 = variants(
  fresh(() => {
    const a = randInt(3, 9), k = randInt(4, 12), m = a * k
    return numeric(`Complète l'égalité : ${m} = ${a} × … (le nombre ${m} est donc un multiple de ${a}).`, k, {
      explanation: `On cherche combien de fois ${a} est contenu dans ${m} : ${m} ÷ ${a} = ${k}, car ${a} × ${k} = ${m}.`,
    })
  }),
  R(() => {
    const a = randInt(3, 12), n = randInt(20, 99)
    if (n % a === 0) return null
    const q = Math.floor(n / a)
    return numeric(`Quel est le plus petit multiple de ${a} strictement supérieur à ${n} ?`, a * (q + 1), {
      explanation: `${a} × ${q} = ${a * q} est inférieur à ${n}, et ${a} × ${q + 1} = ${a * (q + 1)} le dépasse : c'est ${a * (q + 1)}.`,
    })
  }),
  R(() => {
    const a = randInt(3, 12), n = randInt(20, 99)
    if (n % a === 0) return null
    const q = Math.floor(n / a)
    return numeric(`Quel est le plus grand multiple de ${a} inférieur à ${n} ?`, a * q, {
      explanation: `${a} × ${q} = ${a * q} est inférieur à ${n}, mais ${a} × ${q + 1} = ${a * (q + 1)} le dépasse : c'est ${a * q}.`,
    })
  }),
  () => {
    const a = randInt(3, 12), k = randInt(6, 15)
    return numeric(`Les multiples de ${a} sont ${a}, ${2 * a}, ${3 * a}, ${4 * a}, … Quel est le ${k}e nombre de cette liste ?`, a * k, {
      explanation: `Le ${k}e multiple de ${a} est ${a} × ${k} = ${a * k}.`,
    })
  },
  R(() => {
    const a = pick([5, 6, 8, 12, 15]), n = randInt(7, 58), p = prenom()
    if (n % a === 0) return null
    const next = (Math.floor(n / a) + 1) * a
    return numeric(`Les cloches du monastère sonnent toutes les ${a} minutes à partir de midi. ${p} arrive ${n} minutes après midi. Combien de minutes d'attente y aura-t-il avant que ${p} entende les cloches ?`, next - n, {
      explanation: `Les cloches sonnent aux multiples de ${a} minutes. Le premier multiple de ${a} après ${n} est ${next}. Attente : ${next} − ${n} = ${next - n} minute${s(next - n)}.`,
    })
  }),
)

// Critères de divisibilité par 2, 5, 10
const DIV_WORD: Record<number, string> = { 2: 'deux', 3: 'trois', 5: 'cinq', 9: 'neuf', 10: 'dix' }
const RULE: Record<number, string> = {
  2: 'un nombre est divisible par 2 si son chiffre des unités est 0, 2, 4, 6 ou 8',
  5: 'un nombre est divisible par 5 si son chiffre des unités est 0 ou 5',
  10: 'un nombre est divisible par 10 si son chiffre des unités est 0',
  3: 'un nombre est divisible par 3 si la somme de ses chiffres est divisible par 3',
  9: 'un nombre est divisible par 9 si la somme de ses chiffres est divisible par 9',
}
/** Liste de nombres dont exactement k sont divisibles par d. */
function listWith(d: number, k: number, n: number, lo: number, hi: number): number[] {
  const out: number[] = []
  while (out.length < n) {
    const x = randInt(lo, hi), want = out.length < k
    if ((x % d === 0) === want && !out.includes(x)) out.push(x)
  }
  return shuffle(out)
}
const countDiv = (d: number) => () => {
  const k = randInt(1, 5), nums = listWith(d, k, 6, 10, 9999), good = nums.filter((x) => x % d === 0)
  return numeric(`Combien des nombres suivants sont divisibles par ${DIV_WORD[d]} ? ${nums.join(' ; ')}`, k, {
    explanation: `Règle : ${RULE[d]}. Ici : ${andList(good)}, soit ${k} nombre${s(k)}.`,
  })
}
const crit1 = variants(
  countDiv(2), countDiv(5), countDiv(10),
  () => {
    const n = randInt(100, 9999)
    return numeric(`Quel est le reste de la division euclidienne de ${n} par 10 ?`, n % 10, {
      explanation: `${eu(n, 10)} : le reste de la division par 10 est le chiffre des unités, ${n % 10}.`,
    })
  },
  R(() => {
    const n = randInt(100, 9999)
    if (n % 10 === 0) return null
    const m = (Math.floor(n / 10) + 1) * 10
    return numeric(`Quel est le plus petit nombre strictement supérieur à ${n} qui est divisible à la fois par 2 et par 5 ?`, m, {
      explanation: `Divisible par 2 et par 5, c'est se terminer par 0 (divisible par 10). Après ${n}, le premier nombre terminé par 0 est ${m}.`,
    })
  }),
)

// Diviseurs d'un petit nombre
const SMALL_COMPOSITES = range(12, 48).filter((n) => divisors(n).length >= 4)
const divisors1 = variants(
  () => {
    const n = pick(SMALL_COMPOSITES), d = divisors(n)
    return intList(`Écris la liste de tous les diviseurs de ${n}.`, d, `On cherche les produits égaux à ${n} : ${d.filter((x) => x * x <= n).map((x) => `${x} × ${n / x}`).join(', ')}. Diviseurs : ${d.join(' ; ')}.`)
  },
  fresh(() => {
    const n = pick(SMALL_COMPOSITES), d = divisors(n)
    return numeric(`Combien le nombre ${n} a-t-il de diviseurs ?`, d.length, {
      explanation: `Les diviseurs de ${n} sont ${d.join(' ; ')} (on les trouve par paires : ${d.filter((x) => x * x <= n).map((x) => `${x} × ${n / x}`).join(', ')}). Il y en a ${d.length}.`,
    })
  }),
  () => {
    const n = pick(SMALL_COMPOSITES), p = factorize(n)[0]
    return numeric(`Quel est le plus grand diviseur de ${n} différent de ${n} lui-même ?`, n / p, {
      explanation: `On divise ${n} par son plus petit diviseur supérieur à 1, qui est ${p} : ${n} = ${p} × ${n / p}. Le plus grand diviseur autre que ${n} est ${n / p}.`,
    })
  },
  fresh(() => {
    const n = pick(SMALL_COMPOSITES.filter((x) => x % 2 === 1 || Math.random() < 0.4)), p = factorize(n)[0]
    return numeric(`Quel est le plus petit diviseur de ${n} strictement supérieur à 1 ?`, p, {
      explanation: `On essaie 2, 3, 4… : ${range(2, p - 1).map((d) => `${n} n'est pas divisible par ${d}`).concat([`${n} = ${p} × ${n / p}`]).join(' ; ')}. Réponse : ${p}.`,
    })
  }),
)

// Division euclidienne simple
const BOXES: [string, string, string, boolean][] = [['œufs', 'boîtes', 'boîte', true], ['pommes', 'cagettes', 'cagette', true], ['flèches', 'carquois', 'carquois', false], ['crayons', 'trousses', 'trousse', true]]
const divEuc1 = variants(
  R(() => {
    const b = randInt(3, 9), q = randInt(3, 15), r = randInt(1, b - 1), a = b * q + r
    if (a > 99) return null
    return quotRest(`Effectue la division euclidienne de ${a} par ${b}. Donne le quotient et le reste.`, q, r, `${b} × ${q} = ${b * q} et ${b} × ${q + 1} = ${b * (q + 1)} dépasse ${a}. Donc ${a} = ${b} × ${q} + ${r} : quotient ${q}, reste ${r} (et ${r} < ${b}).`)
  }),
  fresh(() => {
    const b = randInt(3, 9), q = randInt(3, 15), r = randInt(1, b - 1), a = b * q + r
    return numeric(`Quel est le reste de la division euclidienne de ${a} par ${b} ?`, r, {
      explanation: `${a} = ${b} × ${q} + ${r}, avec ${r} < ${b} : le reste est ${r}.`,
    })
  }),
  fresh(() => {
    const b = randInt(3, 9), q = randInt(3, 15), r = randInt(1, b - 1), a = b * q + r
    return numeric(`Quel est le quotient de la division euclidienne de ${a} par ${b} ?`, q, {
      explanation: `${a} = ${b} × ${q} + ${r}, avec ${r} < ${b} : le quotient est ${q}.`,
    })
  }),
  fresh(() => {
    const [obj, cont] = pick(BOXES), b = pick([6, 8, 10, 12, 4]), q = randInt(3, 12), r = randInt(1, b - 1), a = b * q + r
    return numeric(`On range ${a} ${obj} dans des ${cont} de ${b}. Combien de ${cont} peut-on remplir complètement ?`, q, {
      explanation: `${a} = ${b} × ${q} + ${r} : on remplit ${q} ${cont} et il reste ${r} ${obj}.`,
    })
  }),
  fresh(() => {
    const [obj, cont, one, fem] = pick(BOXES), b = pick([6, 8, 10, 12, 4]), q = randInt(3, 12), r = randInt(1, b - 1), a = b * q + r
    return numeric(`On range ${a} ${obj} dans des ${cont} de ${b}, en remplissant complètement chaque ${one}. Combien de ${obj} restent en dehors ?`, r, {
      explanation: `${a} = ${b} × ${q} + ${r} : ${q} ${cont} ${fem ? 'pleines' : 'pleins'}, et il reste ${r} ${obj}.`,
    })
  }),
)

// ═══ Palier 2 ═══════════════════════════════════════════════════════════
const countDiv39 = (d: 3 | 9) => () => {
  const k = randInt(1, 4), nums = listWith(d, k, 5, 100, 9999), good = nums.filter((x) => x % d === 0)
  return numeric(`Combien des nombres suivants sont divisibles par ${DIV_WORD[d]} ? ${nums.join(' ; ')}`, k, {
    explanation: `Règle : ${RULE[d]}. Sommes des chiffres : ${nums.map((x) => `${x} → ${digitSum(x)}`).join(', ')}. Conviennent : ${andList(good)}, soit ${k} nombre${s(k)}.`,
  })
}
const crit2 = variants(
  countDiv39(3), countDiv39(9),
  fresh(() => {
    const a = randInt(1, 9), c = randInt(0, 9), base = a + c
    const x = (3 - (base % 3)) % 3
    return numeric(`On remplace ★ par un chiffre dans le nombre ${a}★${c}. Quel est le plus petit chiffre possible pour que ce nombre soit divisible par trois ?`, x, {
      explanation: `La somme des chiffres ${starSum(a, '★', c)} = ${base} + ★ doit être un multiple de 3. ${x === 0 ? `${base} est déjà un multiple de 3 : le plus petit chiffre qui convient est 0.` : `Le plus petit chiffre qui convient est ${x} (${base} + ${x} = ${base + x}).`}`,
    })
  }),
  R(() => {
    const a = randInt(1, 9), c = randInt(0, 9), base = a + c, x = (9 - (base % 9)) % 9
    if (x === 0) return null
    return numeric(`On remplace ★ par un chiffre dans le nombre ${a}★${c}. Quel chiffre faut-il écrire pour que ce nombre soit divisible par neuf ?`, x, {
      explanation: `La somme des chiffres ${starSum(a, '★', c)} = ${base} + ★ doit être un multiple de 9 : ★ = ${x} (${base} + ${x} = ${base + x}). On vérifie : ${a}${x}${c} = 9 × ${(a * 100 + x * 10 + c) / 9}.`,
    })
  }),
)

const CRIT = [2, 3, 5, 9, 10]
const critAll = (n: number) => CRIT.filter((d) => n % d === 0)
const critWhy = (n: number) =>
  `chiffre des unités ${n % 10}, somme des chiffres ${digitsPlus(n)} = ${digitSum(n)}`
const PAIRS: [number, number][] = [[2, 3], [2, 9], [3, 5], [5, 9], [9, 10], [2, 5], [3, 10]]
const crit3 = variants(
  R(() => {
    const n = randInt(100, 9999), g = critAll(n)
    if (g.length < 1 || g.length > 4) return null
    return intList(`Parmi les nombres 2, 3, 5, 9 et 10, écris tous ceux qui sont des diviseurs de ${n}.`, g, `Pour ${n} : ${critWhy(n)}. Il est divisible par ${andList(g)}${CRIT.filter((d) => !g.includes(d)).length ? `, mais pas par ${andList(CRIT.filter((d) => !g.includes(d)))}` : ''}.`)
  }),
  R(() => {
    const n = randInt(100, 9999), g = critAll(n)
    if (g.length < 1 || g.length > 4) return null
    return numeric(`Combien des cinq nombres deux, trois, cinq, neuf et dix sont des diviseurs de ${n} ?`, g.length, {
      explanation: `Pour ${n} : ${critWhy(n)}. Il est divisible par ${andList(g)} : ${g.length} diviseur${s(g.length)} parmi les cinq.`,
    })
  }),
  R(() => {
    const [p, q] = pick(PAIRS), L = lcm(p, q), m = L * randInt(Math.ceil(60 / L), Math.floor(990 / L))
    const a = m - randInt(1, L - 2), b = a + L - 2
    if (m < 50 || a < 10) return null
    return numeric(`Je suis un nombre compris entre ${a} et ${b}. Je suis divisible par ${p} et par ${q}. Qui suis-je ?`, m, {
      explanation: `Un nombre divisible par ${p} et par ${q} est un multiple de ${L}. Entre ${a} et ${b}, le seul multiple de ${L} est ${m} = ${L} × ${m / L}.`,
    })
  }),
  R(() => {
    const [p, q] = pick(PAIRS), L = lcm(p, q), n = randInt(50, 500)
    if (n % L === 0) return null
    const m = (Math.floor(n / L) + 1) * L
    return numeric(`Quel est le plus petit nombre strictement supérieur à ${n} qui est divisible à la fois par ${p} et par ${q} ?`, m, {
      explanation: `Être divisible par ${p} et par ${q}, c'est être un multiple de ${L}. Après ${n}, le premier multiple de ${L} est ${m} = ${L} × ${m / L}.`,
    })
  }),
)

const primeWhy = (n: number) => (isPrime(n) ? `${n} est premier` : `${n} = ${factorize(n)[0]} × ${n / factorize(n)[0]}`)
const primes2 = variants(
  fresh(() => {
    const a = randInt(2, 25), b = a + randInt(8, 15), P = primesIn(a, b)
    return numeric(`Combien y a-t-il de nombres premiers compris entre ${a} et ${b} (${a} et ${b} inclus) ?`, P.length, {
      explanation: `Un nombre premier a exactement deux diviseurs : 1 et lui-même. Entre ${a} et ${b} : ${andList(P)}, soit ${P.length} nombre${s(P.length)} premier${s(P.length)}.`,
    })
  }),
  () => {
    const n = randInt(8, 46), p = range(n + 1, 100).find(isPrime)!
    return numeric(`Quel est le plus petit nombre premier strictement supérieur à ${n} ?`, p, {
      explanation: `${range(n + 1, p - 1).map(primeWhy).join(' ; ')}${p > n + 1 ? ' ; ' : ''}${p} n'a que deux diviseurs, 1 et ${p} : il est premier.`,
    })
  },
  () => {
    const n = randInt(10, 50), p = range(2, n - 1).reverse().find(isPrime)!
    return numeric(`Quel est le plus grand nombre premier strictement inférieur à ${n} ?`, p, {
      explanation: `${range(p + 1, n - 1).reverse().map(primeWhy).join(' ; ')}${n - 1 > p ? ' ; ' : ''}${p} n'a que deux diviseurs, 1 et ${p} : il est premier.`,
    })
  },
  R(() => {
    const k = randInt(1, 4), pr = shuffle(primesIn(5, 50)).slice(0, k)
    const comp = shuffle(range(4, 50).filter((x) => !isPrime(x) && (x % 2 === 1 || x % 10 === 7 || Math.random() < 0.3))).slice(0, 6 - k)
    const nums = shuffle([...pr, ...comp])
    return numeric(`Combien des nombres suivants sont premiers ? ${nums.join(' ; ')}`, k, {
      explanation: `${nums.map(primeWhy).join(' ; ')}. Il y a ${k} nombre${s(k)} premier${s(k)}.`,
    })
  }),
)

const partage2 = variants(
  R(() => {
    const b = randInt(6, 25), q = randInt(5, 30), r = randInt(1, b - 1), N = b * q + r
    const [who, boat, go, one] = pick([['soldats', 'barques', 'traverser le fleuve', 'soldat'], ['élèves', 'minibus', 'aller au stade', 'élève'], ['pèlerins', 'charrettes', 'rejoindre l’abbaye', 'pèlerin'], ['supporters', 'cars', 'se rendre au match', 'supporter']])
    return numeric(`${N} ${who} doivent ${go} à bord de ${boat} de ${b} places. Combien de ${boat} faut-il au minimum ?`, q + 1, {
      explanation: `${N} = ${b} × ${q} + ${r} : avec ${q} ${boat} remplis, il reste encore ${r} ${r > 1 ? who : one} à transporter. Il en faut donc un de plus : ${q + 1} ${boat}.`,
    })
  }),
  fresh(() => {
    const b = randInt(3, 12), q = randInt(12, 60), r = randInt(1, b - 1), N = b * q + r
    return numeric(`Le seigneur partage équitablement ${N} pièces d'or entre ses ${b} chevaliers, en donnant à chacun le plus possible. Combien de pièces reste-t-il dans le coffre ?`, r, {
      explanation: `${N} = ${b} × ${q} + ${r} (avec ${r} < ${b}) : chaque chevalier reçoit ${q} pièces et il en reste ${r}.`,
    })
  }),
  fresh(() => {
    const b = randInt(3, 12), q = randInt(12, 60), r = randInt(1, b - 1), N = b * q + r
    return numeric(`Une équipe de ${b} joueurs se partage équitablement ${N} cartes, chacun en recevant le plus possible. Combien de cartes chaque joueur reçoit-il ?`, q, {
      explanation: `${N} = ${b} × ${q} + ${r} (avec ${r} < ${b}) : chacun reçoit ${q} cartes et il en reste ${r}.`,
    })
  }),
  fresh(() => {
    const b = pick([15, 20, 25, 30, 12, 18]), q = randInt(6, 40), r = randInt(1, b - 1), N = b * q + r
    return numeric(`Une corde de ${N} cm est coupée en morceaux de ${b} cm. Combien de morceaux complets obtient-on ?`, q, {
      explanation: `${N} = ${b} × ${q} + ${r} : on obtient ${q} morceaux de ${b} cm et une chute de ${r} cm.`,
    })
  }),
)

// ═══ Palier 3 ═══════════════════════════════════════════════════════════
const MID_COMPOSITES = range(36, 100).filter((n) => divisors(n).length >= 6)
const pairsText = (n: number) => divisors(n).filter((x) => x * x <= n).map((x) => `${x} × ${n / x}`).join(', ')
const commonPair = () => {
  for (;;) {
    const g = pick([4, 6, 8, 9, 10, 12, 14, 15, 18]), u = randInt(2, 9), v = randInt(2, 9)
    if (u !== v && gcd(u, v) === 1 && g * u <= 120 && g * v <= 120) return [g * u, g * v, g]
  }
}
const divisors3 = variants(
  () => {
    const n = pick(MID_COMPOSITES), d = divisors(n)
    return intList(`Écris la liste de tous les diviseurs de ${n}.`, d, `On les cherche par paires : ${pairsText(n)}. Diviseurs de ${n} : ${d.join(' ; ')}.`)
  },
  fresh(() => {
    const n = pick(MID_COMPOSITES), d = divisors(n)
    return numeric(`Combien le nombre ${n} a-t-il de diviseurs ?`, d.length, {
      explanation: `Par paires : ${pairsText(n)}. Les diviseurs sont ${d.join(' ; ')} : il y en a ${d.length}.`,
    })
  }),
  () => {
    const [a, b] = commonPair(), c = divisors(a).filter((x) => b % x === 0)
    return intList(`Écris la liste de tous les diviseurs communs à ${a} et ${b}.`, c, `Diviseurs de ${a} : ${divisors(a).join(' ; ')}. Diviseurs de ${b} : ${divisors(b).join(' ; ')}. Communs : ${c.join(' ; ')}.`)
  },
  () => {
    const [a, b, g] = commonPair()
    return numeric(`Quel est le plus grand diviseur commun à ${a} et ${b} ?`, g, {
      explanation: `Diviseurs de ${a} : ${divisors(a).join(' ; ')}. Diviseurs de ${b} : ${divisors(b).join(' ; ')}. Le plus grand diviseur commun est ${g}.`,
    })
  },
)

const egalite3 = variants(
  () => {
    const b = randInt(6, 25), q = randInt(8, 40), r = randInt(1, b - 1), a = b * q + r
    return numeric(`Dans une division euclidienne, le diviseur est ${b}, le quotient ${q} et le reste ${r}. Quel est le dividende ?`, a, {
      explanation: `Dividende = diviseur × quotient + reste = ${b} × ${q} + ${r} = ${b * q} + ${r} = ${a}.`,
    })
  },
  R(() => {
    const b = randInt(6, 25), q = randInt(5, 30), ok = Math.random() < 0.5
    const r = ok ? randInt(1, b - 1) : randInt(b, b + 12), a = b * q + r
    if (!ok && r >= b && r % b === 0) return null
    return choice(`L'égalité ${a} = ${b} × ${q} + ${r} est vraie. Traduit-elle la division euclidienne de ${a} par ${b} ?`,
      ok ? 'Oui' : 'Non', [ok ? 'Non' : 'Oui'],
      ok ? `Oui : l'égalité est juste et le reste ${r} est inférieur au diviseur ${b}.` : `Non : le reste ${r} n'est pas inférieur au diviseur ${b}. La vraie division est ${eu(a, b)}.`)
  }),
  R(() => {
    const b = randInt(6, 20), q = randInt(4, 25), r = randInt(1, b - 1), a = b * q + r
    if (q === b) return null
    const ok = r < q
    return choice(`On sait que ${a} = ${b} × ${q} + ${r}. Cette égalité traduit-elle aussi la division euclidienne de ${a} par ${q} ?`,
      ok ? 'Oui' : 'Non', [ok ? 'Non' : 'Oui'],
      ok ? `Oui : ${a} = ${q} × ${b} + ${r} et le reste ${r} est inférieur à ${q}. Le quotient est ${b}.` : `Non : il faudrait un reste inférieur à ${q}, or ${r} ≥ ${q}. La vraie division est ${eu(a, q)}.`)
  }),
  R(() => {
    const b = randInt(6, 25), q = randInt(6, 30), r = randInt(1, b - 1), a = b * q + r
    if (r >= q || b === q) return null
    return numeric(`Dans une division euclidienne, le dividende est ${a}, le quotient ${q} et le reste ${r}. Quel est le diviseur ?`, b, {
      explanation: `${a} = diviseur × ${q} + ${r}, donc diviseur × ${q} = ${a} − ${r} = ${a - r}, et diviseur = ${a - r} ÷ ${q} = ${b} (on vérifie que ${r} < ${b}).`,
    })
  }),
  fresh(() => {
    const b = randInt(12, 45), a = randInt(500, 3000), q = Math.floor(a / b), r = a % b
    return numeric(`Pose la division : quel est le reste de la division euclidienne de ${a} par ${b} ?`, r, {
      explanation: `${eu(a, b)} : ${b} × ${q} = ${b * q} et ${b} × ${q + 1} = ${b * (q + 1)} dépasse ${a}. Le reste est ${r}.`,
    })
  }),
)

const ODD_COMPOSITES = range(33, 99).filter((n) => n % 2 && n % 5 && !isPrime(n))
const SEMIPRIMES = range(10, 99).filter((n) => factorize(n).length === 2)
const primes3 = variants(
  fresh(() => {
    const n = pick(ODD_COMPOSITES), p = factorize(n)[0]
    return numeric(`Le nombre ${n} n'est pas premier. Quel est son plus petit diviseur strictement supérieur à 1 ?`, p, {
      explanation: `${n} est impair (pas divisible par 2), ne se termine ni par 0 ni par 5. ${p === 3 ? `Somme des chiffres ${digitsPlus(n)} = ${digitSum(n)}, multiple de 3 : ` : `Il n'est pas divisible par 3 (somme des chiffres ${digitSum(n)}). `}${n} = ${p} × ${n / p}.`,
    })
  }),
  () => {
    const n = randInt(50, 96), p = range(n + 1, 120).find(isPrime)!
    return numeric(`Quel est le plus petit nombre premier strictement supérieur à ${n} ?`, p, {
      explanation: `${range(n + 1, p - 1).map(primeWhy).join(' ; ')}${p > n + 1 ? ' ; ' : ''}${p} n'est divisible ni par 2, ni par 3, ni par 5, ni par 7 : il est premier.`,
    })
  },
  fresh(() => {
    const a = randInt(30, 80), b = a + randInt(10, 20), P = primesIn(a, b)
    return numeric(`Combien y a-t-il de nombres premiers compris entre ${a} et ${b} (${a} et ${b} inclus) ?`, P.length, {
      explanation: `On élimine les multiples de 2, 3, 5 et 7. Restent : ${andList(P)}, soit ${P.length} nombre${s(P.length)} premier${s(P.length)}.`,
    })
  }),
  () => {
    const n = pick(SEMIPRIMES), f = factorize(n)
    return primeProduct(`Écris ${n} comme un produit de deux nombres premiers.`, n, `${n} = ${f[0]} × ${f[1]}, et ${f[0] === f[1] ? `${f[0]} est premier` : `${f[0]} et ${f[1]} sont premiers`}.`, `${f[0]} × ${f[1]}`)
  },
)

const rangs3 = variants(
  R(() => {
    const N = pick(range(24, 96).filter((n) => divisors(n).length >= 6)), d = divisors(N).filter((x) => x > 1 && x < N)
    return numeric(`Le capitaine range ses ${N} soldats en rangées complètes, toutes de la même longueur, avec au moins 2 rangées et au moins 2 soldats par rangée. Combien de nombres de rangées différents sont possibles ?`, d.length, {
      explanation: `Le nombre de rangées doit être un diviseur de ${N}, autre que 1 et ${N} : ${d.join(' ; ')}. Il y a ${d.length} possibilités.`,
    })
  }),
  R(() => {
    const N = pick(range(20, 100).filter((n) => divisors(n).length >= 6)), d = divisors(N), k = Math.ceil(d.length / 2)
    return numeric(`On veut former un rectangle avec ${N} carreaux carrés identiques, en les utilisant tous. Combien de rectangles différents peut-on obtenir ? (Un rectangle de 2 sur 5 et un rectangle de 5 sur 2 comptent pour un seul.)`, k, {
      explanation: `Les dimensions sont des paires de diviseurs de ${N} : ${pairsText(N)}. Cela fait ${k} rectangles.`,
    })
  }),
  R(() => {
    const N = randInt(40, 150), lo = randInt(5, 9), hi = lo + randInt(2, 4), ok = divisors(N).filter((d) => d >= lo && d <= hi)
    if (ok.length !== 1) return null
    return numeric(`Les ${N} élèves de 5e doivent former des équipes de même effectif, sans personne de côté. Chaque équipe doit compter entre ${lo} et ${hi} élèves. Combien d'élèves y aura-t-il par équipe ?`, ok[0], {
      explanation: `L'effectif d'une équipe doit être un diviseur de ${N} compris entre ${lo} et ${hi} : ${range(lo, hi).map((d) => (N % d === 0 ? `${N} = ${d} × ${N / d}` : `${d} ne divise pas ${N}`)).join(' ; ')}. Réponse : ${ok[0]}.`,
    })
  }),
  fresh(() => {
    const k = randInt(6, 15), q = randInt(4, 20), r = randInt(1, k - 1), N = k * q + r
    const [what, who] = pick([['rosiers', 'Le jardinier plante'], ['ceps de vigne', 'Le vigneron plante'], ['piquets', 'Le paysan plante']])
    return numeric(`${who} ${N} ${what} en rangées de ${k}. Combien de ${what} doit-il acheter au minimum en plus pour que toutes ses rangées soient complètes ?`, k - r, {
      explanation: `${N} = ${k} × ${q} + ${r} : ${q} rangées complètes et une rangée de ${r}. Pour la compléter, il manque ${k} − ${r} = ${k - r} ${what}.`,
    })
  }),
)

// ═══ Palier 4 ═══════════════════════════════════════════════════════════
const COULEURS = [
  { nom: 'rouge', c: RED, l: 'R' }, { nom: 'bleue', c: BLUE, l: 'B' }, { nom: 'verte', c: GREEN, l: 'V' },
  { nom: 'jaune', c: GOLD, l: 'J' }, { nom: 'violette', c: PURPLE, l: 'Vi' },
]
const GARDES = ['Aldric', 'Bertrand', 'Cyprien', 'Dagobert', 'Enguerrand', 'Foulques']
const cycles4 = variants(
  () => {
    const j = randInt(0, 6), n = randInt(20, 200), r = n % 7, ans = JOURS[(j + r) % 7]
    return word(`Aujourd'hui, nous sommes ${JOURS[j]}. Quel jour de la semaine serons-nous dans ${n} jours ?`, ans,
      `Les jours reviennent tous les 7 jours. ${eu(n, 7)} : ${r === 0 ? `dans ${n} jours, on retombe sur le même jour` : `dans ${n} jours, c'est comme dans ${r} jour${s(r)} après ${JOURS[j]}`}, donc ${ans}.`, 'Un jour de la semaine')
  },
  () => {
    const k = randInt(3, 5), motif = shuffle(COULEURS).slice(0, k), n = randInt(25, 150), r = n % k, col = motif[(r + k - 1) % k]
    return word(`${prenom()} enfile des perles en répétant toujours le même motif : une perle ${motif.map((m) => m.nom).join(', une ')}, puis de nouveau une ${motif[0].nom}, etc. De quelle couleur est la ${n}e perle ?`, col.nom,
      `Le motif compte ${k} perles. ${eu(n, k)} : ${r === 0 ? `la ${n}e perle est la dernière d'un motif complet` : `après ${Math.floor(n / k)} motifs complets, la ${n}e perle est la ${ord(r)} du motif`}, elle est ${col.nom}.`, 'Une couleur')
  },
  fresh(() => {
    const h = randInt(0, 23), n = randInt(30, 150), ans = (h + n) % 24
    return numeric(`Il est ${h} h. Quelle heure sera-t-il dans ${n} heures ? (Donne l'heure entre 0 et 23.)`, ans, {
      explanation: `Les heures reviennent tous les 24 h. ${eu(n, 24)} : ${n % 24 === 0 ? 'on retombe sur la même heure' : `on avance de ${n % 24} h. ${h} + ${n % 24} = ${h + (n % 24)}${h + (n % 24) >= 24 ? `, soit ${ans} h (on passe minuit)` : ' h'}`}. Réponse : ${ans} h.`,
    })
  }),
  () => {
    const k = randInt(3, 5), g = shuffle(GARDES).slice(0, k), n = randInt(20, 120), r = n % k, who = g[(r + k - 1) % k]
    return word(`${andList(g)} montent la garde au château à tour de rôle, une nuit chacun, toujours dans cet ordre. ${g[0]} garde la 1re nuit. Qui garde la ${n}e nuit ?`, who,
      `Le tour de garde dure ${k} nuits. ${eu(n, k)} : ${r === 0 ? `la ${n}e nuit termine un tour complet` : `la ${n}e nuit est la ${ord(r)} d'un tour`}, c'est ${who}.`, 'Un prénom')
  },
)

const packPair = () => {
  for (;;) {
    const g = randInt(4, 18), u = randInt(2, 9), v = randInt(2, 9)
    if (u !== v && gcd(u, v) === 1 && g * u <= 200 && g * v <= 200) return { a: g * u, b: g * v, g }
  }
}
const pgcd4 = variants(
  () => {
    const { a, b, g } = packPair(), [x, y] = pick([['croissants', 'pains au chocolat'], ['flèches', 'arcs'], ['billes rouges', 'billes bleues'], ['roses', 'tulipes']])
    return numeric(`On a ${a} ${x} et ${b} ${y}. On veut faire le plus grand nombre possible de lots identiques en utilisant tout. Combien de lots peut-on faire ?`, g, {
      explanation: `Le nombre de lots doit diviser ${a} et ${b}. Diviseurs communs : ${divisors(g).join(' ; ')}. Le plus grand est ${g} (${a} = ${g} × ${a / g} et ${b} = ${g} × ${b / g}).`,
    })
  },
  fresh(() => {
    const { a, b, g } = packPair(), [x, y] = pick([['croissants', 'pains au chocolat'], ['flèches', 'arcs'], ['billes rouges', 'billes bleues'], ['roses', 'tulipes']])
    return numeric(`On a ${a} ${x} et ${b} ${y}. On fait le plus grand nombre possible de lots identiques en utilisant tout. Combien de ${x} y a-t-il dans chaque lot ?`, a / g, {
      explanation: `Le plus grand diviseur commun à ${a} et ${b} est ${g} : on fait ${g} lots, avec ${a} ÷ ${g} = ${a / g} ${x} et ${b} ÷ ${g} = ${b / g} ${y} dans chacun.`,
    })
  }),
  () => {
    const { a, b, g } = packPair()
    return numeric(`Une salle rectangulaire mesure ${a} dm sur ${b} dm. On veut la carreler avec des dalles carrées identiques, les plus grandes possibles, sans découpe. Quelle est la longueur du côté d'une dalle (en dm) ?`, g, {
      explanation: `Le côté doit diviser ${a} et ${b}. Le plus grand diviseur commun est ${g} (diviseurs communs : ${divisors(g).join(' ; ')}).`,
    })
  },
  fresh(() => {
    const { a, b, g } = packPair()
    return numeric(`Une salle rectangulaire mesure ${a} dm sur ${b} dm. On la carrelle avec des dalles carrées identiques, les plus grandes possibles, sans découpe. Combien de dalles faut-il ?`, (a / g) * (b / g), {
      explanation: `Le plus grand diviseur commun à ${a} et ${b} est ${g} : dalles de ${g} dm. Il en faut ${a / g} × ${b / g} = ${(a / g) * (b / g)}.`,
    })
  }),
)

const lcmPair = () => {
  for (;;) {
    const a = randInt(4, 20), b = randInt(4, 24), L = lcm(a, b)
    if (a < b && b % a !== 0 && L < a * b && L <= 200) return { a, b, L }
  }
}
const multiplesOf = (a: number, L: number) => range(1, L / a).map((k) => k * a).join(', ')
const ppcm4 = variants(
  () => {
    const { a, b, L } = lcmPair()
    return numeric(`Un phare s'allume toutes les ${a} secondes, un autre toutes les ${b} secondes. Ils viennent de s'allumer ensemble. Dans combien de secondes s'allumeront-ils de nouveau ensemble ?`, L, {
      explanation: `On cherche le plus petit multiple commun non nul. Multiples de ${b} : ${multiplesOf(b, L)}… Le premier qui est aussi multiple de ${a} est ${L}.`,
    })
  },
  () => {
    const { a, b, L } = lcmPair()
    return numeric(`Au monastère, une cloche sonne toutes les ${a} minutes et une autre toutes les ${b} minutes. Elles sonnent ensemble à midi. Combien de minutes après midi sonneront-elles de nouveau ensemble ?`, L, {
      explanation: `Multiples de ${b} : ${multiplesOf(b, L)}… Le premier qui est aussi multiple de ${a} est ${L} : ${L} minutes.`,
    })
  },
  fresh(() => {
    const { a, b, L } = lcmPair()
    return numeric(`Deux roues dentées s'engrènent : la petite a ${a} dents, la grande ${b}. On marque une dent de chacune au point de contact. Combien de tours la petite roue fait-elle avant que les deux marques se retrouvent en contact pour la première fois ?`, L / a, {
      explanation: `Il doit passer un nombre de dents multiple de ${a} et de ${b} : le plus petit est ${L}. La petite roue fait ${L} ÷ ${a} = ${L / a} tours.`,
    })
  }),
  () => {
    const { a, b, L } = lcmPair()
    return numeric(`Quel est le plus petit nombre non nul qui est à la fois multiple de ${a} et multiple de ${b} ?`, L, {
      explanation: `Multiples de ${b} : ${multiplesOf(b, L)}… Le premier qui est aussi multiple de ${a} est ${L} = ${a} × ${L / a}.`,
    })
  },
)

const smooth = (lo: number, hi: number, minF = 3) => range(lo, hi).filter((n) => factorize(n).length >= minF && factorize(n).every((p) => p <= 13))
const factExpl = (n: number) => {
  const f = factorize(n)
  let m = n
  const steps: string[] = []
  for (const p of f) { steps.push(`${m} = ${p} × ${m / p}`); m /= p }
  return `${steps.slice(0, -1).join(' ; ')}${steps.length > 1 ? ' ; ' : ''}donc ${n} = ${f.join(' × ')} = ${factText(f)}.`
}
const decomp4 = variants(
  () => {
    const n = pick(smooth(24, 200))
    return primeProduct(`Décompose ${n} en produit de facteurs premiers.`, n, `On divise par des nombres premiers tant que c'est possible : ${factExpl(n)}`)
  },
  fresh(() => {
    const n = pick(smooth(30, 300).filter((x) => factorize(x).some((p) => p >= 5)))
    const f = factorize(n)
    return numeric(`Quel est le plus grand facteur premier de ${n} ?`, Math.max(...f), {
      explanation: `${factExpl(n)} Le plus grand facteur premier est ${Math.max(...f)}.`,
    })
  }),
  () => {
    const n = pick(smooth(30, 400)), f = factorize(n)
    return numeric(`Quel nombre a pour décomposition en produit de facteurs premiers ${factText(f)} ?`, n, {
      explanation: `${factText(f)} = ${f.join(' × ')} = ${n}.`,
    })
  },
  () => {
    const a = pick([4, 6, 8, 9, 10, 12, 14, 15]), b = pick([6, 9, 10, 12, 14, 15, 18, 21]), n = a * b
    return primeProduct(`On sait que ${n} = ${a} × ${b}. Décompose ${n} en produit de facteurs premiers.`, n, `${a} = ${factorize(a).join(' × ')} et ${b} = ${factorize(b).join(' × ')}, donc ${n} = ${factorize(n).join(' × ')} = ${factText(factorize(n))}.`)
  },
)

// ═══ Palier 5 ═══════════════════════════════════════════════════════════
type Cond = { txt: string; ok: (n: number) => boolean; kind?: 'c' | 'r' | 'u' | 'd' }
const COND_POOL = (): Cond[] => {
  const h = randInt(1, 9), u = randInt(0, 9), t = randInt(0, 9)
  return [
    { txt: 'Je suis divisible par 2.', ok: (n) => n % 2 === 0 },
    { txt: 'Je ne suis pas divisible par 2.', ok: (n) => n % 2 === 1 },
    { txt: 'Je suis divisible par 3.', ok: (n) => n % 3 === 0 },
    { txt: 'Je suis divisible par 9.', ok: (n) => n % 9 === 0 },
    { txt: 'Je suis divisible par 5.', ok: (n) => n % 5 === 0 },
    { txt: 'Je ne suis pas divisible par 5.', ok: (n) => n % 5 !== 0 },
    { txt: 'Je suis divisible par 10.', ok: (n) => n % 10 === 0 },
    { txt: `Mon chiffre des centaines est ${h}.`, ok: (n) => Math.floor(n / 100) === h, kind: 'c' },
    { txt: `Mon chiffre des unités est ${u}.`, ok: (n) => n % 10 === u, kind: 'u' },
    { txt: `Mon chiffre des dizaines est ${t}.`, ok: (n) => Math.floor(n / 10) % 10 === t, kind: 'd' },
    { txt: `Je suis compris entre ${h}00 et ${h}50.`, ok: (n) => n >= h * 100 && n <= h * 100 + 50, kind: 'r' },
  ]
}
/** Indice réécrit à la troisième personne : « Je suis divisible par 3. » → « il est divisible par 3 ». */
const third = (txt: string) => txt.replace(/^Je suis /, 'il est ').replace(/^Je ne suis pas /, 'il n’est pas ').replace(/^Mon /, 'son ').replace(/^Mes /, 'ses ')
  .replace(/^La somme de mes/, 'la somme de ses').replace(/ mon /g, ' son ').replace(/\.$/, '')
/** Indices acceptables : au plus deux indices sur les chiffres, pas de redondance évidente. */
function fairConds(conds: Cond[]): boolean {
  const kinds = conds.map((c) => c.kind).filter(Boolean)
  const txt = conds.map((c) => c.txt).join(' ')
  if (kinds.length > 2 || (kinds.includes('c') && kinds.includes('r'))) return false
  if (/par 2\./.test(txt) && /pas divisible par 2/.test(txt)) return false
  if (/par 10/.test(txt) && /par (2|5)\./.test(txt)) return false
  if (/par 9/.test(txt) && /par 3\./.test(txt)) return false
  return true
}
const enigme5 = variants(
  ...[3, 4].map((k) => R(() => {
    const conds = shuffle(COND_POOL()).slice(0, k)
    if (!fairConds(conds)) return null
    const sol = range(100, 999).filter((n) => conds.every((c) => c.ok(n)))
    if (sol.length !== 1) return null
    return numeric(`Je suis un nombre de trois chiffres. ${conds.map((c) => c.txt).join(' ')} Qui suis-je ?`, sol[0], {
      explanation: `On vérifie ${sol[0]} : ${conds.map((c) => third(c.txt)).join(' ; ')}. C'est le seul nombre de trois chiffres qui convient.`,
    })
  })),
  fresh(R(() => {
    const p = pick([3, 9]), q = pick([2, 5, 10]), h = randInt(1, 9), u = q === 10 ? 0 : q === 5 ? pick([0, 5]) : pick([0, 2, 4, 6, 8])
    const sol = range(100, 999).filter((n) => n % p === 0 && n % q === 0 && Math.floor(n / 100) === h && n % 10 === u)
    if (sol.length < 2) return null
    return numeric(`Combien de nombres de trois chiffres ont ${h} pour chiffre des centaines, ${u} pour chiffre des unités, et sont divisibles par ${p} ?`, sol.filter((n) => n % p === 0).length, {
      explanation: `On cherche ${h}★${u} avec ${starSum(h, '★', u)} multiple de ${p} : ${sol.map((n) => `${n} (somme ${digitSum(n)})`).join(', ')}. Il y en a ${sol.length}.`,
    })
  })),
)

const restes5 = variants(
  ...(['billes', 'soldats', 'œufs'] as const).map((obj) => R(() => {
    const a = randInt(3, 7), b = randInt(4, 9)
    if (a >= b || gcd(a, b) !== 1) return null
    const r1 = randInt(1, a - 1), r2 = randInt(0, b - 1), L = a * b, lo = randInt(4, 15) * 10, hi = lo + L - 1
    const sol = range(lo, hi).filter((n) => n % a === r1 && n % b === r2)
    if (sol.length !== 1) return null
    const ctx = obj === 'billes' ? [`${prenom()} possède entre ${lo} et ${hi} billes. Quand on les range par paquets de ${a}`, `par paquets de ${b}`, 'billes', 'Combien y a-t-il de billes ?']
      : obj === 'soldats' ? [`Une armée compte entre ${lo} et ${hi} soldats. Rangés en rangées de ${a}`, `en rangées de ${b}`, 'soldats', 'Combien y a-t-il de soldats ?']
        : [`Une fermière a ramassé entre ${lo} et ${hi} œufs. En les rangeant par boîtes de ${a}`, `par boîtes de ${b}`, 'œufs', 'Combien a-t-elle ramassé d’œufs ?']
    return numeric(`${ctx[0]}, il en reste ${r1} ; ${ctx[1]}, il en reste ${r2}. ${ctx[3]}`, sol[0], {
      explanation: `Entre ${lo} et ${hi}, les nombres dont le reste par ${b} est ${r2} sont : ${range(lo, hi).filter((n) => n % b === r2).join(', ')}. Parmi eux, le seul dont le reste par ${a} est ${r1} est ${sol[0]} = ${a} × ${Math.floor(sol[0] / a)} + ${r1}.`,
    })
  })),
  R(() => {
    const ds = pick([[2, 3, 4], [3, 4, 5], [2, 5, 6], [4, 6, 9], [2, 3, 5]]), r = 1, L = ds.reduce(lcm), lo = randInt(1, 3) * 100
    const sol = range(lo, lo + 99).filter((n) => ds.every((d) => n % d === r))
    if (sol.length !== 1) return null
    return numeric(`Un fermier compte ses moutons entre ${lo} et ${lo + 99}. Qu'il les groupe par ${andList(ds)}, il en reste toujours un. Combien a-t-il de moutons ?`, sol[0], {
      explanation: `En enlevant un mouton, on obtient un multiple de ${andList(ds)}, donc un multiple de ${L}. Entre ${lo - 1} et ${lo + 98}, c'est ${sol[0] - 1} = ${L} × ${(sol[0] - 1) / L}. Il y a donc ${sol[0]} moutons.`,
    })
  }),
)

const fracPair = () => {
  for (;;) {
    const g = pick([6, 9, 12, 14, 15, 18, 21, 24, 30, 36]), u = randInt(2, 11), v = randInt(2, 13)
    if (u < v && gcd(u, v) === 1 && g * v <= 400) return { a: g * u, b: g * v, u, v, g }
  }
}
const frac5 = variants(
  () => {
    const { a, b, u, v, g } = fracPair()
    return fraction(`Rends irréductible la fraction ${F(a, b)}.`, a, b, {
      irreducible: true,
      explanation: `${a} = ${factText(factorize(a))} et ${b} = ${factText(factorize(b))}. On simplifie par les facteurs communs (${g}) : ${F(a, b)} = ${F(u, v)}.`,
    })
  },
  () => {
    const { a, b, u, v, g } = fracPair(), [x, y] = pick([['archers', 'soldats'], ['filles', 'élèves'], ['moutons noirs', 'moutons'], ['pièces d’argent', 'pièces']])
    return fraction(`Dans un groupe de ${b} ${y}, il y a ${a} ${x}. Quelle fraction des ${y} représentent les ${x} ? (Fraction irréductible.)`, a, b, {
      irreducible: true,
      explanation: `La fraction est ${F(a, b)}. ${a} = ${factText(factorize(a))} et ${b} = ${factText(factorize(b))} : on simplifie par ${g}, ${F(a, b)} = ${F(u, v)}.`,
    })
  },
  () => {
    const { a, b, u, v, g } = fracPair()
    return numeric(`Par quel nombre faut-il simplifier ${F(a, b)} pour obtenir directement une fraction irréductible ?`, g, {
      explanation: `${a} = ${factText(factorize(a))} et ${b} = ${factText(factorize(b))}. Leur plus grand diviseur commun est ${g} : ${F(a, b)} = ${F(`${u} × ${g}`, `${v} × ${g}`)} = ${F(u, v)}.`,
    })
  },
)

const MOIS: [string, number][] = [['janvier', 31], ['février', 28], ['mars', 31], ['avril', 30], ['mai', 31], ['juin', 30], ['juillet', 31], ['août', 31], ['septembre', 30], ['octobre', 31]]
const cycles5 = variants(
  () => {
    const j = randInt(0, 6), m = randInt(1, 9), d = randInt(1, MOIS[m][1])
    const before = MOIS.slice(0, m).reduce((t, x) => t + x[1], 0), n = before + d - 1, ans = JOURS[(j + n) % 7]
    return word(`Cette année (non bissextile), le 1er janvier est un ${JOURS[j]}. Quel jour de la semaine sera le ${d === 1 ? '1er' : d} ${MOIS[m][0]} ?`, ans,
      `Du 1er janvier au ${d} ${MOIS[m][0]}, il s'écoule ${MOIS.slice(0, m).map((x) => x[1]).join(' + ')}${d > 1 ? ` + ${d - 1}` : ''} = ${n} jours. ${eu(n, 7)} : ${advance(n % 7, JOURS[j])}, donc ${ans}.`, 'Un jour de la semaine')
  },
  R(() => {
    const a = pick([3, 4, 5, 6]), b = pick([4, 6, 8, 9, 10]), L = lcm(a, b), j = randInt(0, 6)
    if (a >= b || L === a * b && L > 40) return null
    const ans = JOURS[(j + L) % 7]
    return word(`Un garde est de service tous les ${a} jours, un autre tous les ${b} jours. Ils sont de service ensemble ce ${JOURS[j]}. Quel jour de la semaine seront-ils de nouveau de service ensemble pour la première fois ?`, ans,
      `Ils se retrouvent après le plus petit multiple commun de ${a} et ${b}, soit ${L} jours. ${eu(L, 7)} : ${advance(L % 7, JOURS[j])}, donc ${ans}.`, 'Un jour de la semaine')
  }),
  () => {
    const k = randInt(4, 7), cols = 'ABCDEFG'.slice(0, k).split(''), n = randInt(50, 400), r = n % k, col = cols[(r + k - 1) % k]
    return word(`On écrit les nombres 1, 2, 3, 4… dans un tableau de ${k} colonnes nommées ${andList(cols)}, ligne après ligne : 1 dans la colonne A, 2 dans la colonne B, etc. Dans quelle colonne se trouve ${n} ?`, col,
      `Chaque ligne contient ${k} nombres. ${eu(n, k)} : ${r === 0 ? `${n} termine la ${Math.floor(n / k)}e ligne` : `${n} est le ${ordM(r)} nombre de la ligne suivante`}, colonne ${col}.`, 'Une lettre')
  },
  () => {
    const w = pick(['CHATEAU', 'DRAGON', 'EPEE', 'BLASON', 'MATHS', 'DONJON']), n = randInt(100, 2026), r = n % w.length, ans = w[(r + w.length - 1) % w.length]
    return word(`On écrit en boucle le mot ${w} : ${w}${w}${w}… Quelle est la ${n}e lettre écrite ?`, ans,
      `Le mot a ${w.length} lettres. ${eu(n, w.length)} : ${r === 0 ? 'c’est la dernière lettre du mot' : `c'est la ${ord(r)} lettre du mot`}, ${ans}.`, 'Une lettre')
  },
)

// ═══ Problèmes d'amélioration ═══════════════════════════════════════════
const up1: Maker[] = [
  model('Les multiples dans un intervalle', () => {
    const a = randInt(6, 19), m = randInt(100, 400), M = m + randInt(100, 400)
    const first = Math.ceil(m / a), last = Math.floor(M / a), n = last - first + 1
    return numeric(`Combien y a-t-il de multiples de ${a} compris entre ${m} et ${M} ?`, n, {
      explanation: `Le premier est ${a} × ${first} = ${a * first}, le dernier est ${a} × ${last} = ${a * last}. Ce sont ${a} × ${first}, ${a} × ${first + 1}, …, ${a} × ${last} : il y en a ${last} − ${first} + 1 = ${n}.`,
    })
  }),
  model('Le chiffre caché', () => {
    const d = pick([6, 15, 18, 45, 12]), a = randInt(1, 9), b = randInt(0, 9), c = pick([0, 2, 4, 5, 6, 8])
    const ok = range(0, 9).filter((x) => (a * 1000 + x * 100 + b * 10 + c) % d === 0)
    if (ok.length < 1 || ok.length > 4) return null
    const crit = d === 6 ? 'par 2 et par 3' : d === 15 ? 'par 3 et par 5' : d === 18 ? 'par 2 et par 9' : d === 45 ? 'par 5 et par 9' : 'par 3 et par 4'
    return numeric(`Dans le nombre ${a}★${b}${c}, on remplace ★ par un chiffre. Combien de chiffres différents rendent ce nombre divisible par ${d} ?`, ok.length, {
      explanation: `Être divisible par ${d}, c'est être divisible ${crit}. ${d === 12 ? `Pour 4, on regarde le nombre formé par les deux derniers chiffres (${b}${c}). ` : ''}Conviennent : ${ok.map((x) => `${a}${x}${b}${c}`).join(', ')}, soit ${ok.length} chiffre${s(ok.length)}.`,
    })
  }),
  model('Le nombre aux nombreux diviseurs', () => {
    const k = pick([4, 6, 8, 9, 10, 12]), lo = pick([1, 20, 50, 100])
    const n = range(lo + 1, 2000).find((x) => divisors(x).length === k)!
    return numeric(`Quel est le plus petit nombre entier strictement supérieur à ${lo} qui possède exactement ${k} diviseurs ?`, n, {
      explanation: `On compte les diviseurs des nombres à partir de ${lo + 1}. ${n} a pour diviseurs ${divisors(n).join(' ; ')} : il en a ${k}, et aucun nombre plus petit (au-dessus de ${lo}) n'en a exactement ${k}.`,
    })
  }),
]

const up2: Maker[] = [
  model('Le reste qui voyage', () => {
    const b = randInt(5, 12), r = randInt(1, b - 1), k = randInt(b + 1, 3 * b), mode = randInt(0, 2)
    const ans = mode === 0 ? (r + k) % b : mode === 1 ? (2 * r) % b : (3 * r) % b
    const what = mode === 0 ? `N + ${k}` : mode === 1 ? '2 × N' : '3 × N'
    if (ans === r) return null
    return numeric(`Un nombre entier N a pour reste ${r} dans la division euclidienne par ${b}. Quel est le reste de la division euclidienne de ${what} par ${b} ?`, ans, {
      explanation: mode === 0
        ? `N = ${b} × q + ${r}, donc N + ${k} = ${b} × q + ${r + k}, et ${eu(r + k, b)}. Le reste est ${ans}. (Exemple : N = ${b + r}, N + ${k} = ${eu(b + r + k, b)}.)`
        : `N = ${b} × q + ${r}, donc ${what} = ${b} × (${mode === 1 ? 2 : 3}q) + ${(mode === 1 ? 2 : 3) * r}, et ${eu((mode === 1 ? 2 : 3) * r, b)}. Le reste est ${ans}.`,
    })
  }),
  model('Les nombres premiers d’une dizaine', () => {
    const u = pick([1, 3, 7, 9]), a = randInt(1, 5) * 10, b = a + randInt(4, 8) * 10, P = primesIn(a, b).filter((p) => p % 10 === u)
    if (P.length < 2) return null
    return numeric(`Combien de nombres premiers compris entre ${a} et ${b} se terminent par le chiffre ${u} ?`, P.length, {
      explanation: `Candidats terminés par ${u} : ${range(a, b).filter((n) => n % 10 === u).map(primeWhy).join(' ; ')}. Il y en a ${P.length} de premiers : ${andList(P)}.`,
    })
  }),
  model('Les diviseurs partagés', () => {
    const { a, b, g } = packPair(), c = divisors(g)
    if (c.length < 3) return null
    return numeric(`Combien de diviseurs communs les nombres ${a} et ${b} ont-ils ?`, c.length, {
      explanation: `Diviseurs de ${a} : ${divisors(a).join(' ; ')}. Diviseurs de ${b} : ${divisors(b).join(' ; ')}. Communs : ${c.join(' ; ')}, soit ${c.length}. (Ce sont exactement les diviseurs de ${g}.)`,
    })
  }),
]

const up3: Maker[] = [
  model('Divisible par l’un ou l’autre', () => {
    const [a, b] = pick([[2, 3], [3, 5], [2, 5], [4, 6], [3, 7], [5, 7], [4, 10]]), N = randInt(5, 30) * 10
    const na = Math.floor(N / a), nb = Math.floor(N / b), L = lcm(a, b), nl = Math.floor(N / L), ans = na + nb - nl
    return numeric(`Combien de nombres entiers entre 1 et ${N} sont divisibles par ${a} ou par ${b} (ou les deux) ?`, ans, {
      explanation: `Multiples de ${a} : ${na}. Multiples de ${b} : ${nb}. Ceux qui sont multiples des deux (multiples de ${L}) ont été comptés deux fois : ${nl}. Total : ${na} + ${nb} − ${nl} = ${ans}.`,
    })
  }),
  model('Le reste obstiné', () => {
    const ds = pick([[2, 3, 4], [2, 3, 5], [3, 4, 5], [2, 5, 7], [4, 5, 6], [3, 5, 7]]), L = ds.reduce(lcm)
    const minus = Math.random() < 0.5
    const n = minus ? L - 1 : L + 1
    return numeric(minus
      ? `Quel est le plus petit nombre entier qui, divisé par ${andList(ds)}, donne à chaque fois un reste égal au diviseur moins 1 ?`
      : `Quel est le plus petit nombre entier supérieur à 1 qui, divisé par ${andList(ds)}, donne à chaque fois un reste de 1 ?`, n, {
      explanation: minus
        ? `Si on ajoute 1 à ce nombre, la division tombe juste par ${andList(ds)} : le nombre + 1 est le plus petit multiple commun, ${L}. Le nombre est ${L} − 1 = ${n}.`
        : `Si on retire 1 à ce nombre, la division tombe juste par ${andList(ds)} : le nombre − 1 est un multiple commun non nul, le plus petit est ${L}. Le nombre est ${L} + 1 = ${n}.`,
    })
  }),
  model('Les nombres parfaits', () => {
    const n = pick([12, 18, 20, 24, 28, 30, 36, 40, 42, 45, 48, 64, 60, 66, 70, 72, 84, 88, 90, 96])
    const d = divisors(n).filter((x) => x < n), sm = sum(d)
    return numeric(`Un nombre est dit « parfait » s'il est égal à la somme de ses diviseurs autres que lui-même (comme 6 = 1 + 2 + 3). Calcule la somme des diviseurs de ${n} autres que ${n}.`, sm, {
      explanation: `Diviseurs de ${n} autres que ${n} : ${d.join(' ; ')}. Somme : ${d.join(' + ')} = ${sm}. ${sm === n ? `${n} est donc parfait !` : `${n} n'est donc pas parfait (${sm} ${sm > n ? '>' : '<'} ${n}).`}`,
    })
  }),
]

// ═══ Problèmes de l'hôtel de ville ═══════════════════════════════════════
const age1: Maker[] = [
  model('Le collier de la reine', () => {
    const k = randInt(3, 4), motif = shuffle(COULEURS.slice(0, 4)).slice(0, k), red = motif.findIndex((m) => m.nom === 'rouge')
    if (red < 0) return null
    const N = randInt(40, 120), full = Math.floor(N / k), r = N % k, ans = full + (red < r ? 1 : 0)
    const shown = range(0, 2 * k + 1).map((i) => motif[i % k])
    return withMeta(numeric(`Le joaillier de la reine enfile ${N} perles en répétant toujours le même motif, comme sur le schéma (R = rouge, B = bleu, V = vert, J = jaune). Combien de perles rouges le collier comptera-t-il ?`, ans, {
      explanation: `Le motif compte ${k} perles dont une rouge (la ${ord(red + 1)}). ${eu(N, k)} : ${full} motifs complets, donc ${full} perles rouges${r ? `, puis ${r} perle${s(r)} de plus (${motif.slice(0, r).map((m) => m.l).join(', ')})${red < r ? ', dont une rouge' : ', sans rouge'}` : ''}. Total : ${ans}.`,
    }), { figure: beadsFigure(shown) })
  }),
  model('Les barques du passeur', () => {
    const b = randInt(8, 15), q = randInt(10, 30), r = randInt(1, b - 1), N = b * q + r, p = randInt(3, 9)
    return numeric(`Le passeur doit faire traverser la rivière à ${N} soldats. Sa barque transporte au plus ${b} soldats, et chaque aller-retour lui est payé ${p} deniers. Combien de deniers gagnera-t-il au minimum ?`, (q + 1) * p, {
      explanation: `${N} = ${b} × ${q} + ${r} : ${q} traversées pleines ne suffisent pas, il en faut ${q + 1}. Il gagne ${q + 1} × ${p} = ${(q + 1) * p} deniers.`,
    })
  }),
  model('Le dallage de la grande salle', () => {
    const { a, b, g } = packPair()
    const ask = randInt(0, 1)
    return withMeta(numeric(`La grande salle du château est un rectangle de ${a} dm sur ${b} dm. Le maître d'œuvre veut la paver avec des dalles carrées toutes identiques, les plus grandes possibles, sans en couper aucune. ${ask === 0 ? 'Quel sera le côté des dalles (en dm) ?' : 'Combien de dalles faudra-t-il ?'}`, ask === 0 ? g : (a / g) * (b / g), {
      explanation: `Le côté d'une dalle doit diviser ${a} et ${b} ; le plus grand diviseur commun est ${g}. ${ask === 0 ? `Les dalles ont ${g} dm de côté.` : `Il faut ${a} ÷ ${g} = ${a / g} dalles en longueur et ${b} ÷ ${g} = ${b / g} en largeur, soit ${(a / g) * (b / g)} dalles.`}`,
    }), { figure: rectFigure(a, b, `${a} dm`, `${b} dm`) })
  }),
]

const age2: Maker[] = [
  model('Les engrenages du moulin', () => {
    const a = randInt(8, 18), b = randInt(12, 30), L = lcm(a, b)
    if (a >= b || b % a === 0 || L === a * b || L > 240) return null
    const ask = randInt(0, 1)
    return withMeta(numeric(`Dans le moulin, deux roues dentées s'engrènent (voir le schéma). La petite roue a ${a} dents, la grande en a ${b}. On peint en rouge une dent de chaque roue, à l'endroit où elles se touchent. ${ask === 0 ? `Combien de tours fera la grande roue avant que les deux dents rouges se touchent à nouveau ?` : `Combien de tours fera la petite roue avant que les deux dents rouges se touchent à nouveau ?`}`, ask === 0 ? L / b : L / a, {
      explanation: `Le nombre de dents passées au point de contact doit être un multiple de ${a} et de ${b} : le plus petit est ${L}. La petite roue fait ${L} ÷ ${a} = ${L / a} tours, la grande ${L} ÷ ${b} = ${L / b} tours.`,
    }), { figure: gearsFigure(a, b) })
  }),
  model('Le trésor des pirates', () => {
    const a = randInt(5, 8), b = randInt(6, 9), r1 = randInt(1, a - 1), r2 = randInt(1, b - 1)
    if (a >= b || gcd(a, b) !== 1) return null
    const sol = range(1, a * b - 1).filter((n) => n % a === r1 && n % b === r2)
    if (sol.length !== 1 || sol[0] < 15) return null
    return numeric(`Un coffre contient moins de ${a * b} pièces d'or. Si ${a} pirates se les partagent équitablement, il en reste ${r1}. Si ${b} pirates se les partagent, il en reste ${r2}. Combien de pièces contient le coffre ?`, sol[0], {
      explanation: `Les nombres inférieurs à ${a * b} de reste ${r2} dans la division par ${b} : ${range(1, a * b - 1).filter((n) => n % b === r2).join(', ')}. Le seul de reste ${r1} dans la division par ${a} est ${sol[0]} = ${a} × ${Math.floor(sol[0] / a)} + ${r1}.`,
    })
  }),
  model('Le calendrier du tournoi', () => {
    const start = randInt(0, 6), days = pick([30, 31]), mark = randInt(1, days), n = randInt(40, 150), ans = JOURS[(start + mark - 1 + n) % 7]
    return withMeta(word(`Voici le calendrier du mois en cours. Le héraut annonce que le grand tournoi aura lieu ${n} jours après le ${mark === 1 ? '1er' : mark} (case rouge). Quel jour de la semaine aura lieu le tournoi ?`, ans,
      `Sur le calendrier, le ${mark === 1 ? '1er' : mark} est un ${JOURS[(start + mark - 1) % 7]}. ${eu(n, 7)} : ${advance(n % 7, JOURS[(start + mark - 1) % 7])}, donc ${ans}.`, 'Un jour de la semaine'), { figure: calendarFigure(start, days, mark) })
  }),
]

const age3: Maker[] = [
  model('Le code du coffre', () => {
    const conds = shuffle(COND_POOL()).slice(0, 3)
    if (!fairConds(conds)) return null
    const extra = pick<Cond>([
      { txt: 'La somme de mes chiffres est 18.', ok: (n) => digitSum(n) === 18 },
      { txt: 'Je suis divisible par 7.', ok: (n) => n % 7 === 0 },
      { txt: 'Mon chiffre des unités est le double de mon chiffre des centaines.', ok: (n) => n % 10 === 2 * Math.floor(n / 100) },
      { txt: 'Mes trois chiffres sont différents.', ok: (n) => new Set(String(n)).size === 3 },
    ])
    const all = [...conds, extra], sol = range(100, 999).filter((n) => all.every((c) => c.ok(n)))
    if (sol.length !== 1 || conds.every((c) => c.ok(sol[0])) && range(100, 999).filter((n) => conds.every((c) => c.ok(n))).length === 1) return null
    return numeric(`Le code du coffre de l'intendant est un nombre de trois chiffres. Sur un parchemin, on lit : « ${all.map((c) => c.txt).join(' ')} » Quel est le code ?`, sol[0], {
      explanation: `On liste les nombres de trois chiffres qui vérifient les premiers indices, puis on applique le dernier : seul ${sol[0]} convient (${all.map((c) => third(c.txt)).join(' ; ')}).`,
    })
  }),
  model('Les deux phares', () => {
    const { a, b, L } = lcmPair(), T = pick([10, 15, 20, 30]) * 60
    const n = Math.floor(T / L)
    if (n < 3) return null
    return numeric(`Deux phares gardent l'entrée du port : le premier s'allume toutes les ${a} secondes, le second toutes les ${b} secondes. À minuit pile, ils s'allument ensemble. Combien de fois s'allumeront-ils de nouveau ensemble pendant les ${T / 60} minutes qui suivent (minuit pile non compté) ?`, n, {
      explanation: `Ils s'allument ensemble toutes les ${L} secondes (le plus petit multiple commun de ${a} et ${b}). En ${T / 60} minutes = ${T} secondes : ${eu(T, L)}, donc ${n} fois.`,
    })
  }),
  model('Le verger du monastère', () => {
    const { a, b, g } = packPair()
    if (a > 120 || b > 120) return null
    const P = 2 * (a + b), n = P / g
    return withMeta(numeric(`Les moines veulent planter des pommiers tout autour d'un champ rectangulaire de ${a} m sur ${b} m : un pommier à chaque coin, et les autres régulièrement espacés sur les côtés, avec le même écart partout, le plus grand possible. Combien de pommiers faut-il ?`, n, {
      explanation: `L'écart doit diviser ${a} et ${b} : le plus grand diviseur commun est ${g} m. Le tour du champ mesure 2 × (${a} + ${b}) = ${P} m. Sur un tour fermé, il y a autant d'arbres que d'intervalles : ${P} ÷ ${g} = ${n} pommiers.`,
    }), { figure: rectFigure(a, b, `${a} m`, `${b} m`, { dots: true }) })
  }),
]

export const CONTENT: SubjectContent | null = {
  tiers: [
    [multiples1, crit1, divisors1, divEuc1],
    [crit2, crit3, primes2, partage2],
    [divisors3, egalite3, primes3, rangs3],
    [cycles4, pgcd4, ppcm4, decomp4],
    [enigme5, restes5, frac5, cycles5],
  ],
  upgrades: [up1, up2, up3],
  age: [age1, age2, age3],
}
