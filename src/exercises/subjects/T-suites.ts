// Suites (Terminale, spécialité) : suites arithmétiques et géométriques (terme général, sommes), raisonnement par
// récurrence, limites de suites (opérations, croissances comparées, suites géométriques, comparaison, gendarmes),
// suites arithmético-géométriques en contexte.
// Paliers 1 à 3 : adultes qui reprennent (rappels guidés) ; paliers 2 à 5 : adultes aguerris.
import {
  choice, evalExpr, fmt, fracText, fraction, fresh, numeric, parseExpr, parseNumber, pick, randInt, randNonZero, variants, withMeta,
  type Exercise, type Ladder, type SubjectContent, type Tiers,
} from '../utils'
import { graphFigure, type Figure } from '../figure'

// ── Aides locales ───────────────────────────────────────────────────────
const RED = '#b8362f'
const BLUE = '#5b8fc7'
const T = (title: string, ex: Exercise, figure?: Figure): Exercise => withMeta(ex, figure ? { title, figure } : { title })

const SUBS: Record<string, string> = {
  '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄', '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
  '+': '₊', '-': '₋', '−': '₋', 'n': 'ₙ', 'k': 'ₖ', 'p': 'ₚ',
}
/** Indice en caractères souscrits : sb(12) → ₁₂, sb('n+1') → ₙ₊₁. */
const sb = (i: number | string) => String(i).split('').map((c) => SUBS[c] ?? c).join('')
/** Terme d'une suite : u(3) → u₃. */
const u = (i: number | string, name = 'u') => `${name}${sb(i)}`
const UN = 'uₙ', UN1 = 'uₙ₊₁', VN = 'vₙ'

const r6 = (v: number) => Math.round(v * 1e6) / 1e6
/** Grand entier avec espaces : 16 384 (pas d'espace en dessous de 10 000). */
const big = (n: number) => (Math.abs(n) < 10000 ? fmt(n) : fmt(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' '))
/** « + 3 » ou « − 3 » à coller après un terme (rien si 0). */
const tail = (p: number) => (p === 0 ? '' : ` ${p < 0 ? '−' : '+'} ${fmt(Math.abs(p))}`)
/** Coefficient devant un terme : 1 → rien, −1 → « − ». */
const cf = (k: number) => (k === 1 ? '' : k === -1 ? '−' : fmt(k))
/** a × qⁿ lisible ; q négatif entre parenthèses. */
const geo = (a: number, q: number, e = 'n') => `${a === 1 ? '' : a === -1 ? '−' : `${fmt(a)} × `}${q < 0 ? `(${fmt(q)})` : fmt(q)}^${e.length > 1 ? `{${e}}` : e}`
/** Expression affine en n : 3 + 2n, 7 − n, −2n… */
const affN = (a: number, r: number) => {
  if (a === 0) return `${cf(r)}n`
  if (r === 0) return fmt(a)
  return `${fmt(a)} ${r < 0 ? '−' : '+'} ${Math.abs(r) === 1 ? '' : fmt(Math.abs(r))}n`
}

/** Réponse : expression en n (comparée aux valeurs attendues pour n = 0 … 8). */
function seqExpr(prompt: string, f: (n: number) => number, answer: string, explanation: string): Exercise {
  const prep = (v: string) => v.trim()
    .replace(/^[a-zA-Z]\s*(?:_?\s*\(?n\)?|ₙ)\s*=/, '')
    .replace(/\^\{([^}]*)\}/g, '^($1)')
    .replace(/ₙ/g, 'n')
    .replace(/n/g, 'x')
  const ok = (v: string) => {
    const node = parseExpr(prep(v))
    if (!node) return false
    for (let n = 0; n <= 8; n++) {
      const a = evalExpr(node, n), b = f(n)
      if (!Number.isFinite(a) || Math.abs(a - b) > 1e-6 * Math.max(1, Math.abs(b))) return false
    }
    return true
  }
  return {
    prompt,
    kind: 'input',
    answer,
    explanation,
    inputHint: 'Expression en n, ex. 5 × 2^n',
    format: 'une expression en n, par exemple 3 + 2n ou 5 × 2^n',
    keypad: ['n', '^', '(', ')', '−', '×', '/'],
    isValid: (v) => parseExpr(prep(v)) !== null,
    check: ok,
  }
}

/** Lit une limite : nombre, fraction, ou ±∞ (« +inf », « -∞ », « plus l'infini »…). */
function parseLimit(raw: string): number {
  const s = raw.trim().toLowerCase().replace(/[−–—]/g, '-').replace(/l['’]/g, '').replace(/\s+/g, '')
  if (/^(\+?(∞|inf|infini|infinity)|plusinfini|plus∞)$/.test(s)) return Infinity
  if (/^(-(∞|inf|infini|infinity)|moinsinfini|moins∞)$/.test(s)) return -Infinity
  return parseNumber(raw)
}
const limText = (v: number) => (v === Infinity ? '+∞' : v === -Infinity ? '−∞' : fmt(v))
/** Réponse : une limite (nombre, fraction n/d, +∞ ou −∞). */
function lim(prompt: string, value: number | [number, number], explanation: string): Exercise {
  const v = Array.isArray(value) ? value[0] / value[1] : value
  const answer = Array.isArray(value) ? fracText(value[0], value[1]) : limText(value)
  return {
    prompt,
    kind: 'input',
    answer,
    explanation,
    inputHint: 'Un nombre, +∞ ou −∞',
    format: 'un nombre (ou une fraction), +∞ ou −∞ (on peut écrire +inf, -inf)',
    keypad: ['+∞', '−∞', '−', '/'],
    isValid: (x) => !Number.isNaN(parseLimit(x)),
    check: (x) => {
      const got = parseLimit(x)
      return Number.isFinite(v) ? Number.isFinite(got) && Math.abs(got - v) < 1e-6 * Math.max(1, Math.abs(v)) : got === v
    },
  }
}

const fact = (n: number): number => (n <= 1 ? 1 : n * fact(n - 1))
/** Nombre entre parenthèses s'il est négatif. */
const par = (n: number) => (n < 0 ? `(${fmt(n)})` : fmt(n))
const num = (prompt: string, value: number, explanation: string) => numeric(prompt, value, { explanation, answer: big(value) })

/** Pas de graduation « rond » pour une étendue donnée. */
function niceStep(span: number, ticks = 8) {
  const raw = span / ticks
  const p = 10 ** Math.floor(Math.log10(raw))
  for (const m of [1, 2, 5, 10]) if (m * p >= raw) return m * p
  return 10 * p
}

/** Abscisse minimale de la fenêtre qui laisse la place aux nombres écrits sur l'axe des ordonnées (largeur ≈ 6,5 px par caractère). */
function padX(xMax: number, yMax: number) {
  const need = 6.5 * fmt(yMax).length + 8 - 22
  return need <= 0 ? 0 : -(need * xMax) / (276 - need)
}

/** Nuage des premiers termes d'une suite (n en abscisse), avec une droite horizontale facultative. */
function seqGraph(f: (n: number) => number, N: number, opts: { level?: number; caption?: string } = {}): Figure {
  const vals = Array.from({ length: N + 1 }, (_, n) => f(n))
  const all = [...vals, 0, ...(opts.level !== undefined ? [opts.level] : [])]
  let lo = Math.min(...all), hi = Math.max(...all)
  const st = niceStep(hi - lo || 1)
  lo = Math.floor(lo / st) * st
  hi = Math.ceil(hi / st) * st
  if (hi === lo) hi = lo + st
  const g = graphFigure({ xMin: padX(N + 0.5, Math.max(Math.abs(lo), hi) * (lo < 0 ? -1 : 1)), xMax: N + 0.5, yMin: lo, yMax: hi + st * 0.3, step: 1, labelStep: N > 10 ? 2 : 1, ystep: st, ylabelStep: (hi - lo) / st > 6 ? 2 * st : st })
  if (opts.level !== undefined) g.plot(() => opts.level!, { a: 0, dashed: true, color: BLUE })
  vals.forEach((y, n) => g.point(`p${n}`, n, y, ''))
  g.figure.axes!.names = ['n', '']
  g.figure.caption = opts.caption ?? 'Premiers termes de la suite.'
  return g.figure
}

/** Suites arithmético-géométriques « propres » : coefficient a et multiple de ℓ qui rend b entier. */
const AG = [
  { a: 0.5, m: 2 }, { a: 0.8, m: 5 }, { a: 0.9, m: 10 }, { a: 0.75, m: 4 }, { a: 0.6, m: 5 }, { a: 0.2, m: 5 },
] as const

// ═══ Entraînement ═══════════════════════════════════════════════════════
const tiers: Tiers = [
  // ── Palier 1 : rappels guidés ──
  [
    // Suite arithmétique : calcul d'un terme
    variants(
      fresh(() => {
        const a = randInt(-10, 20), r = randNonZero(-9, 9), k = randInt(4, 15)
        return numeric(`(${UN}) est arithmétique de premier terme ${u(0)} = ${fmt(a)} et de raison ${fmt(r)}. Calcule ${u(k)}. (Rappel : ${UN} = ${u(0)} + n × r.)`, a + k * r,
          { explanation: `${u(k)} = ${u(0)} + ${k}r = ${fmt(a)} + ${k} × ${r < 0 ? `(${fmt(r)})` : fmt(r)} = ${fmt(a + k * r)}.` })
      }),
      fresh(() => {
        const a = randInt(-5, 30), r = randNonZero(-7, 7), k = randInt(5, 12)
        return numeric(`(${UN}) est arithmétique, avec ${u(1)} = ${fmt(a)} et de raison ${fmt(r)}. Calcule ${u(k)}. (Rappel : ${UN} = ${u(1)} + (n − 1) × r.)`, a + (k - 1) * r,
          { explanation: `${u(k)} = ${u(1)} + ${k - 1}r = ${fmt(a)} + ${k - 1} × ${r < 0 ? `(${fmt(r)})` : fmt(r)} = ${fmt(a + (k - 1) * r)}.` })
      }),
      fresh(() => {
        const a = randInt(1, 20), r = randNonZero(-6, 9)
        const terms = [0, 1, 2, 3].map((i) => fmt(a + i * r)).join(' ; ')
        const k = randInt(8, 12)
        return numeric(`La suite ${terms} ; … est arithmétique (on ajoute toujours le même nombre). Le premier terme écrit est ${u(0)}. Calcule ${u(k)}.`, a + k * r,
          { explanation: `La raison est ${fmt(a + r)} − ${par(a)} = ${fmt(r)}, donc ${u(k)} = ${fmt(a)} + ${k} × ${par(r)} = ${fmt(a + k * r)}.` })
      }),
      fresh(() => {
        const a = randInt(8, 20), r = randInt(2, 6), k = randInt(8, 20)
        return numeric(`Un maçon pose ${a} rangs de briques le premier jour, puis chaque jour ${r} rangs de plus que la veille. Combien de rangs pose-t-il le ${k}e jour ?`, a + (k - 1) * r,
          { explanation: `Suite arithmétique de premier terme ${a} et de raison ${r} : le ${k}e jour, ${a} + ${k - 1} × ${r} = ${a + (k - 1) * r} rangs.` })
      }),
    ),
    // Suite géométrique : calcul d'un terme
    variants(
      fresh(() => {
        const a = randInt(1, 6), q = pick([2, 3, -2, 4]), k = randInt(3, 5)
        return numeric(`(${UN}) est géométrique de premier terme ${u(0)} = ${a} et de raison ${fmt(q)}. Calcule ${u(k)}. (Rappel : ${UN} = ${u(0)} × q^n.)`, a * q ** k,
          { explanation: `${u(k)} = ${a} × ${q < 0 ? `(${fmt(q)})` : fmt(q)}^${k} = ${a} × ${fmt(q ** k)} = ${fmt(a * q ** k)}.` })
      }),
      fresh(() => {
        const q = pick([2, 3, 5]), a = randInt(1, 9), p = randInt(1, 3)
        return numeric(`(${UN}) est géométrique, avec ${u(p)} = ${fmt(a * q ** p)} et ${u(p + 1)} = ${fmt(a * q ** (p + 1))}. Quelle est sa raison ? (On divise un terme par le précédent.)`, q,
          { explanation: `q = {${u(p + 1)}/${u(p)}} = {${fmt(a * q ** (p + 1))}/${fmt(a * q ** p)}} = ${q}.` })
      }),
      fresh(() => {
        const a = randInt(2, 5), q = pick([2, 3]), k = randInt(4, 6)
        return numeric(`Au jour 0, ${a} villageois connaissent une rumeur. Chaque jour, ce nombre est multiplié par ${q}. Combien de villageois la connaissent au jour ${k} ?`, a * q ** k,
          { explanation: `Suite géométrique : ${a} × ${q}^${k} = ${a} × ${q ** k} = ${a * q ** k}.` })
      }),
      fresh(() => {
        const k = randInt(3, 6), a = 2 ** randInt(k + 1, 9)
        return numeric(`(${UN}) est géométrique de premier terme ${u(0)} = ${a} et de raison ${'{1/2}'}. Calcule ${u(k)}.`, a / 2 ** k,
          { explanation: `${u(k)} = ${a} × ({1/2})^${k} = {${a}/${2 ** k}} = ${fmt(a / 2 ** k)}.` })
      }),
    ),
    // Calcul de termes (explicite ou récurrence)
    variants(
      fresh(() => {
        const b = randInt(-5, 5), c = randInt(-9, 9), k = randInt(3, 9)
        return numeric(`Pour tout entier naturel n, ${UN} = n²${b === 0 ? '' : ` ${b < 0 ? '−' : '+'} ${Math.abs(b) === 1 ? '' : Math.abs(b)}n`}${tail(c)}. Calcule ${u(k)}.`, k * k + b * k + c,
          { explanation: `On remplace n par ${k} : ${k}²${b === 0 ? '' : ` ${b < 0 ? '−' : '+'} ${Math.abs(b)} × ${k}`}${tail(c)} = ${fmt(k * k + b * k + c)}.` })
      }),
      fresh(() => {
        const a = pick([2, 3, -1, -2]), b = randInt(-5, 5), u0 = randInt(-3, 4)
        const u1 = a * u0 + b, u2 = a * u1 + b
        return numeric(`On définit ${u(0)} = ${fmt(u0)} et, pour tout n, ${UN1} = ${cf(a)}${UN}${tail(b)}. Calcule ${u(2)}. (Calcule d'abord ${u(1)}.)`, u2,
          { explanation: `${u(1)} = ${fmt(a)} × ${par(u0)}${tail(b)} = ${fmt(u1)}, puis ${u(2)} = ${fmt(a)} × ${par(u1)}${tail(b)} = ${fmt(u2)}.` })
      }),
      fresh(() => {
        const u0 = randInt(-5, 10)
        const vals = [u0]
        for (let n = 0; n < 4; n++) vals.push(vals[n] + n)
        return numeric(`On définit ${u(0)} = ${fmt(u0)} et, pour tout n, ${UN1} = ${UN} + n. Calcule ${u(4)}.`, vals[4],
          { explanation: `${u(1)} = ${u(0)} = ${fmt(vals[1])} (on ajoute n = 0) ; ${u(2)} = ${u(1)} + 1 = ${fmt(vals[2])} ; ${u(3)} = ${u(2)} + 2 = ${fmt(vals[3])} ; ${u(4)} = ${u(3)} + 3 = ${fmt(vals[4])}.` })
      }),
      () => {
        const a = randInt(1, 5), b = randInt(1, 5), c = randInt(1, 4), k = randInt(2, 8)
        return fraction(`Pour tout entier naturel n, ${UN} = {${cf(a)}n + ${b}/${c === 1 ? '' : c}n + ${a + c + 1}}. Calcule ${u(k)} (fraction irréductible).`, a * k + b, c * k + a + c + 1,
          { irreducible: true, explanation: `${u(k)} = {${a} × ${k} + ${b}/${c} × ${k} + ${a + c + 1}} = {${a * k + b}/${c * k + a + c + 1}} = ${fracText(a * k + b, c * k + a + c + 1)}.` })
      },
    ),
    // Reconnaître une suite arithmétique ou géométrique
    variants(
      () => {
        const a = randInt(-5, 15), r = randNonZero(-6, 6)
        return choice(`La suite dont les premiers termes sont ${[0, 1, 2, 3, 4].map((i) => fmt(a + i * r)).join(' ; ')} semble :`, 'arithmétique', ['géométrique', 'ni arithmétique ni géométrique'],
          `On passe d'un terme au suivant en ajoutant ${fmt(r)} : elle semble arithmétique de raison ${fmt(r)}.`)
      },
      () => {
        const a = randInt(1, 5), q = pick([2, 3, -2, -3])
        return choice(`La suite dont les premiers termes sont ${[0, 1, 2, 3, 4].map((i) => fmt(a * q ** i)).join(' ; ')} semble :`, 'géométrique', ['arithmétique', 'ni arithmétique ni géométrique'],
          `On passe d'un terme au suivant en multipliant par ${fmt(q)} : elle semble géométrique de raison ${fmt(q)}.`)
      },
      () => {
        const c = randInt(-3, 3)
        return choice(`La suite définie par ${UN} = n²${tail(c)} est :`, 'ni arithmétique ni géométrique', ['arithmétique', 'géométrique'],
          `${u(0)} = ${fmt(c)}, ${u(1)} = ${fmt(1 + c)}, ${u(2)} = ${fmt(4 + c)} : les écarts (1 puis 3) changent, et les quotients aussi.`)
      },
      () => {
        const a = randInt(-8, 8), r = randNonZero(-5, 5)
        return pick([
          () => choice(`La suite définie par ${UN} = ${affN(a, r)} est :`, 'arithmétique', ['géométrique', 'ni arithmétique ni géométrique'],
            `${UN1} − ${UN} = ${fmt(r)} est constant : suite arithmétique de raison ${fmt(r)}.`),
          () => choice(`La suite définie par ${u(0)} = ${fmt(a)} et ${UN1} = ${UN}${tail(r)} est :`, 'arithmétique', ['géométrique', 'ni arithmétique ni géométrique'],
            `On ajoute ${fmt(r)} à chaque étape : suite arithmétique.`),
          () => choice(`La suite définie par ${u(0)} = ${fmt(a === 0 ? 2 : a)} et ${UN1} = ${fmt(r === 1 || r === -1 ? 3 : r)}${UN} est :`, 'géométrique', ['arithmétique', 'ni arithmétique ni géométrique'],
            `On multiplie par ${fmt(r === 1 || r === -1 ? 3 : r)} à chaque étape : suite géométrique.`),
        ])()
      },
      () => {
        const a = randInt(1, 3), r = randInt(1, 3)
        const fig = seqGraph((n) => a + r * n, 6, { caption: 'Les sept premiers termes de la suite (uₙ).' })
        return withMeta(choice(`D'après le graphique, la suite (${UN}) semble :`, 'arithmétique', ['géométrique', 'ni arithmétique ni géométrique'],
          `Les points sont alignés et montent de ${r} à chaque pas : la suite semble arithmétique de raison ${r}.`), { figure: fig })
      },
    ),
    // Limites de référence
    variants(
      () => {
        const q = pick([0.5, 0.2, 0.9, 0.75, 0.3])
        return lim(`Quelle est la limite de la suite (${fmt(q)}^n) ? (Rappel : si −1 < q < 1, qⁿ tend vers 0 ; si q > 1, qⁿ tend vers +∞.)`, 0,
          `−1 < ${fmt(q)} < 1, donc ${fmt(q)}^n tend vers 0.`)
      },
      () => {
        const q = pick([2, 3, 1.5, 1.1, 5])
        return lim(`Quelle est la limite de la suite (${fmt(q)}^n) ? (Rappel : si q > 1, qⁿ tend vers +∞.)`, Infinity,
          `${fmt(q)} > 1, donc ${fmt(q)}^n tend vers +∞.`)
      },
      () => {
        const f = pick([
          { t: `{1/n}`, v: 0, e: 'Quand n devient très grand, 1/n devient aussi proche de 0 que l’on veut.' },
          { t: `n²`, v: Infinity, e: 'n² devient aussi grand que l’on veut.' },
          { t: `√n`, v: Infinity, e: '√n dépasse n’importe quel nombre pour n assez grand.' },
          { t: `{1/n²}`, v: 0, e: 'n² tend vers +∞, donc son inverse tend vers 0.' },
          { t: `−n³`, v: -Infinity, e: 'n³ tend vers +∞, donc −n³ tend vers −∞.' },
          { t: `{1/√n}`, v: 0, e: '√n tend vers +∞, donc son inverse tend vers 0.' },
        ])
        return lim(`Quelle est la limite, quand n tend vers +∞, de ${f.t} ?`, f.v, f.e)
      },
      () => {
        const a = randInt(2, 9), s = pick([1, -1])
        return lim(`Quelle est la limite de la suite définie par ${UN} = ${s < 0 ? '−' : ''}${a}n ?`, s * Infinity,
          `n tend vers +∞ et on multiplie par ${s < 0 ? '−' : ''}${a} ${s < 0 ? '(négatif)' : '(positif)'} : la limite est ${s < 0 ? '−∞' : '+∞'}.`)
      },
      () => {
        const a = randInt(2, 6), b = pick([0.5, 0.8, 0.6])
        const fig = seqGraph((n) => a + 3 * b ** n, 10, { caption: 'Premiers termes de la suite (uₙ).' })
        return withMeta(lim(`Voici les premiers termes d'une suite (${UN}) ; on admet qu'ils continuent de se rapprocher de la même valeur. Quelle semble être la limite de (${UN}) ?`, a,
          `Les points se rapprochent de la droite horizontale d'ordonnée ${a} : la suite semble converger vers ${a}.`), { figure: fig })
      },
    ),
  ],
  // ── Palier 2 : application directe ──
  [
    // Terme général
    variants(
      () => {
        const a = randInt(-9, 15), r = randNonZero(-8, 8)
        return seqExpr(`(${UN}) est arithmétique de premier terme ${u(0)} = ${fmt(a)} et de raison ${fmt(r)}. Exprime ${UN} en fonction de n.`, (n) => a + r * n, affN(a, r),
          `${UN} = ${u(0)} + nr = ${affN(a, r)}.`)
      },
      () => {
        const a = randNonZero(-5, 7), q = pick([2, 3, 5, -2, 0.5])
        return seqExpr(`(${UN}) est géométrique de premier terme ${u(0)} = ${fmt(a)} et de raison ${fmt(q)}. Exprime ${UN} en fonction de n.`, (n) => a * q ** n, geo(a, q),
          `${UN} = ${u(0)} × qⁿ = ${geo(a, q)}.`)
      },
      () => {
        const a = randInt(-9, 15), r = randNonZero(-8, 8)
        return seqExpr(`(${UN}) est arithmétique, avec ${u(1)} = ${fmt(a)} et de raison ${fmt(r)}. Exprime ${UN} en fonction de n (pour n ≥ 1).`, (n) => a + r * (n - 1), affN(a - r, r),
          `${UN} = ${u(1)} + (n − 1)r = ${fmt(a)} + ${par(r)}(n − 1) = ${affN(a - r, r)}.`)
      },
      () => {
        const a = randNonZero(-6, 8), q = pick([2, 3, 4, -3])
        return seqExpr(`On définit ${u(0, 'v')} = ${fmt(a)} et, pour tout n, ${u('n+1', 'v')} = ${fmt(q)}${VN}. Exprime ${VN} en fonction de n.`, (n) => a * q ** n, geo(a, q),
          `On multiplie par ${fmt(q)} à chaque étape : suite géométrique, ${VN} = ${geo(a, q)}.`)
      },
    ),
    // Deux termes connus
    variants(
      fresh(() => {
        const r = randNonZero(-7, 7), p = randInt(2, 6), q = p + randInt(3, 8), a = randInt(-10, 20)
        return numeric(`(${UN}) est arithmétique, avec ${u(p)} = ${fmt(a + p * r)} et ${u(q)} = ${fmt(a + q * r)}. Quelle est sa raison ?`, r,
          { explanation: `Entre ${u(p)} et ${u(q)}, on ajoute ${q - p} fois la raison : r = {${fmt(a + q * r)} − ${par(a + p * r)}/${q - p}} = ${fmt(r)}.` })
      }),
      fresh(() => {
        const r = randNonZero(-7, 7), p = randInt(2, 6), q = p + randInt(3, 8), a = randInt(-10, 20)
        return numeric(`(${UN}) est arithmétique, avec ${u(p)} = ${fmt(a + p * r)} et ${u(q)} = ${fmt(a + q * r)}. Calcule ${u(0)}.`, a,
          { explanation: `r = {${fmt(a + q * r)} − ${par(a + p * r)}/${q - p}} = ${fmt(r)}, puis ${u(0)} = ${u(p)} − ${p}r = ${fmt(a + p * r)} − ${p} × ${par(r)} = ${fmt(a)}.` })
      }),
      fresh(() => {
        const q = pick([2, 3, 4, 5]), a = randInt(1, 6), p = randInt(1, 3)
        return numeric(`(${UN}) est géométrique de raison positive, avec ${u(p)} = ${fmt(a * q ** p)} et ${u(p + 2)} = ${fmt(a * q ** (p + 2))}. Quelle est sa raison ?`, q,
          { explanation: `${u(p + 2)} = ${u(p)} × q², donc q² = {${fmt(a * q ** (p + 2))}/${fmt(a * q ** p)}} = ${q * q} et q = ${q} (q > 0).` })
      }),
      fresh(() => {
        const a = randInt(-10, 20), r = randInt(2, 9), n = randInt(8, 40)
        return numeric(`(${UN}) est arithmétique de premier terme ${u(0)} = ${fmt(a)} et de raison ${r}. Pour quel entier n a-t-on ${UN} = ${fmt(a + n * r)} ?`, n,
          { explanation: `${fmt(a)} + ${r}n = ${fmt(a + n * r)} donne ${r}n = ${n * r}, soit n = ${n}.` })
      }),
    ),
    // Sommes arithmétiques
    variants(
      () => {
        const n = pick([10, 20, 25, 30, 40, 50, 60, 99, 100, 200])
        return num(`Calcule la somme 1 + 2 + 3 + … + ${n}.`, (n * (n + 1)) / 2,
          `1 + 2 + … + n = {n(n + 1)/2} : {${n} × ${n + 1}/2} = ${big((n * (n + 1)) / 2)}.`)
      },
      () => {
        const a = randInt(1, 20), r = randInt(2, 6), N = randInt(10, 20)
        const last = a + (N - 1) * r
        return num(`(${UN}) est arithmétique de premier terme ${u(0)} = ${a} et de raison ${r}. Calcule ${u(0)} + ${u(1)} + … + ${u(N - 1)}.`, (N * (a + last)) / 2,
          `${N} termes, du premier ${a} au dernier ${u(N - 1)} = ${last} : S = ${N} × {${a} + ${last}/2} = ${big((N * (a + last)) / 2)}.`)
      },
      () => {
        const a = randInt(10, 30), r = pick([2, 3, 4]), N = randInt(8, 20)
        const last = a + (N - 1) * r
        return num(`Un théâtre compte ${N} rangées : ${a} places au premier rang, puis ${r} places de plus à chaque rang. Combien de places au total ?`, (N * (a + last)) / 2,
          `Somme arithmétique : dernier rang ${a} + ${N - 1} × ${r} = ${last} places ; total ${N} × {${a} + ${last}/2} = ${big((N * (a + last)) / 2)}.`)
      },
      () => {
        const n = randInt(8, 50)
        return num(`Calcule la somme des ${n} premiers nombres impairs : 1 + 3 + 5 + … + ${2 * n - 1}.`, n * n,
          `${n} termes, de 1 à ${2 * n - 1} : ${n} × {1 + ${2 * n - 1}/2} = ${n} × ${n} = ${big(n * n)}.`)
      },
    ),
    // Sommes géométriques
    variants(
      () => {
        const n = randInt(5, 13)
        return num(`Calcule 1 + 2 + 2² + … + 2^${n}. (Rappel : 1 + q + … + qⁿ = (q^{n+1} − 1) ÷ (q − 1).)`, 2 ** (n + 1) - 1,
          `{2^${n + 1} − 1/2 − 1} = ${2 ** (n + 1)} − 1 = ${big(2 ** (n + 1) - 1)}.`)
      },
      () => {
        const n = randInt(3, 7)
        return num(`Calcule 1 + 3 + 3² + … + 3^${n}.`, (3 ** (n + 1) - 1) / 2,
          `{3^${n + 1} − 1/3 − 1} = {${3 ** (n + 1)} − 1/2} = ${big((3 ** (n + 1) - 1) / 2)}.`)
      },
      () => {
        const a = randInt(2, 7), q = pick([2, 3]), N = randInt(4, 7)
        const s = (a * (q ** N - 1)) / (q - 1)
        return num(`(${UN}) est géométrique de premier terme ${u(0)} = ${a} et de raison ${q}. Calcule la somme des ${N} premiers termes ${u(0)} + … + ${u(N - 1)}.`, s,
          `S = ${u(0)} × {q^${N} − 1/q − 1} = ${a} × {${q ** N} − 1/${q - 1}} = ${big(s)}.`)
      },
      () => {
        const k = randInt(6, 12)
        return num(`Un sage demande au roi 1 grain de blé sur la 1re case d'un échiquier, 2 sur la 2e, 4 sur la 3e, et ainsi de suite en doublant. Combien de grains au total sur les ${k} premières cases ?`, 2 ** k - 1,
          `1 + 2 + … + 2^${k - 1} = 2^${k} − 1 = ${big(2 ** k - 1)}.`)
      },
    ),
    // Limites par opérations
    variants(
      fresh(() => {
        const a = randNonZero(-9, 9), b = randNonZero(-9, 9)
        return lim(`Quelle est la limite de la suite ${UN} = ${fmt(a)} ${b < 0 ? '−' : '+'} {${Math.abs(b)}/n} ?`, a,
          `{${Math.abs(b)}/n} tend vers 0, donc ${UN} tend vers ${fmt(a)}.`)
      }),
      () => {
        const a = randInt(1, 6), b = randInt(1, 9), s = pick([1, -1])
        return lim(`Quelle est la limite de ${UN} = ${s < 0 ? '−' : ''}${cf(a)}n² ${s < 0 ? '−' : '+'} ${b}n ?`, s * Infinity,
          `Les deux termes tendent vers ${s < 0 ? '−∞' : '+∞'} : par somme, ${UN} tend vers ${s < 0 ? '−∞' : '+∞'}.`)
      },
      () => {
        const d = pick([2, 3, 4, 5]), q = pick([0.5, 0.9, 0.2, 0.7])
        let c = randInt(1, 12)
        while (c % d === 0 || (d === 4 && c % 2 === 0)) c = randInt(1, 12)
        return lim(`Quelle est la limite de ${UN} = {${c} + ${fmt(q)}^n/${d}} ?`, [c, d],
          `${fmt(q)}^n tend vers 0 (car 0 < ${fmt(q)} < 1), donc ${UN} tend vers {${c}/${d}}.`)
      },
      () => {
        const a = randNonZero(-6, 6), q = pick([2, 3, 1.5, 4]), b = randInt(-9, 9)
        return lim(`Quelle est la limite de ${UN} = ${geo(a, q)}${tail(b)} ?`, a > 0 ? Infinity : -Infinity,
          `${fmt(q)} > 1 donc ${fmt(q)}^n tend vers +∞ ; multiplié par ${fmt(a)} ${a > 0 ? '(positif)' : '(négatif)'}, il tend vers ${a > 0 ? '+∞' : '−∞'}.`)
      },
      () => {
        const a = randInt(2, 9), b = randInt(1, 9), s = pick([1, -1])
        return lim(`Quelle est la limite de ${UN} = ${s < 0 ? '−' : ''}${a}√{n} ${s < 0 ? '−' : '+'} ${b} ?`, s * Infinity,
          `√n tend vers +∞, donc ${s < 0 ? '−' : ''}${a}√n aussi vers ${s < 0 ? '−∞' : '+∞'} et ${UN} de même.`)
      },
    ),
  ],
  // ── Palier 3 : standard de Terminale ──
  [
    // Récurrence : hérédité
    variants(
      () => {
        const K = randInt(2, 9)
        const prop = pick([`${UN} ≤ ${K}`, `${UN} ≥ ${K}`, `0 < ${UN} < ${K}`, `${UN} > ${K}`])
        const next = prop.replace(UN, UN1)
        return choice(`On veut démontrer par récurrence que, pour tout entier naturel n, ${prop}. Dans l'hérédité, on suppose que ${prop} pour un entier n fixé. Que doit-on démontrer ?`,
          next, [`${prop.replace(UN, u(0))}`, `${prop} pour tout n`, `${prop.replace(UN, u('n−1'))}`],
          `L'hérédité consiste à montrer que si la propriété est vraie au rang n, elle l'est au rang n + 1 : on doit établir ${next}.`)
      },
      () => {
        const a = pick([2, 3]), k = randInt(1, 4)
        const b = -(a - 1) * k
        return seqExpr(`On pose ${u(0)} = ${k + 1} et ${UN1} = ${a}${UN}${tail(b)}. On conjecture que ${UN} = ${a}^n + ${k}. Dans l'hérédité, on suppose ${UN} = ${a}^n + ${k}. Exprime alors ${UN1} en fonction de n, sous une forme simplifiée.`,
          (n) => a ** (n + 1) + k, `${a}^{n+1} + ${k}`,
          `${UN1} = ${a}(${a}^n + ${k})${tail(b)} = ${a}^{n+1} + ${a * k}${tail(b)} = ${a}^{n+1} + ${k} : c'est bien la formule au rang n + 1.`)
      },
      () => {
        const c = randInt(0, 5)
        return seqExpr(`On pose ${u(0)} = ${c} et ${UN1} = ${UN} + 2n + 1. On conjecture que ${UN} = n²${tail(c)}. En supposant ${UN} = n²${tail(c)}, exprime ${UN1} en fonction de n (développe).`,
          (n) => (n + 1) ** 2 + c, `n² + 2n + ${1 + c}`,
          `${UN1} = ${UN} + 2n + 1 = n²${tail(c)} + 2n + 1 = n² + 2n + ${1 + c}, qui est bien égal à (n + 1)²${tail(c)}.`)
      },
      () => {
        const n0 = randInt(3, 9)
        return numeric(`On veut démontrer par récurrence que 1 + 2 + … + n = {n(n + 1)/2}. Dans l'hérédité, on suppose la formule vraie au rang n = ${n0}. Quelle valeur de la somme 1 + 2 + … + ${n0 + 1} doit-on alors retrouver ?`, ((n0 + 1) * (n0 + 2)) / 2,
          { explanation: `Au rang ${n0 + 1} : 1 + … + ${n0} + ${n0 + 1} = {${n0} × ${n0 + 1}/2} + ${n0 + 1} = ${(n0 * (n0 + 1)) / 2} + ${n0 + 1} = ${((n0 + 1) * (n0 + 2)) / 2} = {${n0 + 1} × ${n0 + 2}/2}.` })
      },
    ),
    // Limites : formes indéterminées (fractions rationnelles)
    variants(
      () => {
        const a = randNonZero(-6, 6), c = randInt(1, 6), b = randInt(-9, 9), d = randInt(1, 9)
        return lim(`Quelle est la limite de ${UN} = {${cf(a)}n²${tail(b)}/${cf(c)}n² + ${d}} ?`, [a, c],
          `Forme « ∞/∞ » : on factorise par n² en haut et en bas ; il reste (${fmt(a)}${b === 0 ? '' : ` ${b < 0 ? '−' : '+'} ${Math.abs(b)}/n²`}) ÷ (${c} + ${d}/n²), qui tend vers {${fmt(a)}/${c}} = ${fracText(a, c)}.`)
      },
      () => {
        const a = randNonZero(-6, 6), b = randInt(-9, 9), c = randInt(1, 5), d = randInt(1, 9)
        return lim(`Quelle est la limite de ${UN} = {${cf(a)}n${tail(b)}/${cf(c)}n² + ${d}} ?`, 0,
          `En factorisant par n² : ${UN} = (${fmt(a)}/n${b === 0 ? '' : ` ${b < 0 ? '−' : '+'} ${Math.abs(b)}/n²`}) ÷ (${c} + ${d}/n²) ; le numérateur tend vers 0 et le dénominateur vers ${c}, donc ${UN} → 0.`)
      },
      () => {
        const a = randNonZero(-5, 5), b = randInt(-9, 9), c = randInt(1, 5), d = randInt(1, 9)
        return lim(`Quelle est la limite de ${UN} = {${cf(a)}n²${tail(b)}/${cf(c)}n + ${d}} ?`, a > 0 ? Infinity : -Infinity,
          `On factorise : ${UN} = n × (${fmt(a)}${b === 0 ? '' : ` ${b < 0 ? '−' : '+'} ${Math.abs(b)}/n²`}) ÷ (${c} + ${d}/n) ; le quotient tend vers {${fmt(a)}/${c}} ${a > 0 ? '> 0' : '< 0'} et n vers +∞ : ${a > 0 ? '+∞' : '−∞'}.`)
      },
      () => {
        const a = randInt(1, 5), b = randInt(1, 20), s = pick([1, -1])
        return lim(`Quelle est la limite de ${UN} = ${s < 0 ? '−' : ''}${cf(a)}n² ${s < 0 ? '+' : '−'} ${b}n ? (Attention : forme indéterminée.)`, s * Infinity,
          `Forme « ∞ − ∞ » : ${UN} = n(${s < 0 ? '−' : ''}${cf(a)}n ${s < 0 ? '+' : '−'} ${b}) ; la parenthèse tend vers ${s < 0 ? '−∞' : '+∞'} donc ${UN} aussi.`)
      },
      () => {
        const a = randNonZero(-6, 6), c = randInt(1, 6), b = randInt(-9, 9), d = randInt(1, 9)
        return lim(`Quelle est la limite de ${UN} = {${cf(a)}n${tail(b)}/${cf(c)}n + ${d}} ?`, [a, c],
          `On factorise par n en haut et en bas : (${fmt(a)}${b === 0 ? '' : ` ${b < 0 ? '−' : '+'} ${Math.abs(b)}/n`}) ÷ (${c} + ${d}/n) → {${fmt(a)}/${c}} = ${fracText(a, c)}.`)
      },
    ),
    // Limites et suites géométriques
    variants(
      fresh(() => {
        const a = randNonZero(-6, 6), q = pick([0.5, 0.9, 0.3, 0.8]), b = randNonZero(-9, 9), c = randInt(2, 6), d = randNonZero(-5, 5)
        return lim(`Quelle est la limite de ${UN} = (${fmt(b)} ${a < 0 ? '−' : '+'} ${geo(Math.abs(a), q)})(${c} ${d < 0 ? '−' : '+'} {${Math.abs(d)}/n}) ?`, b * c,
          `${fmt(q)}^n → 0 et {${Math.abs(d)}/n} → 0 : la première parenthèse tend vers ${fmt(b)}, la seconde vers ${c} ; par produit, ${UN} → ${fmt(b * c)}.`)
      }),
      () => {
        const [p, d] = pick([[1, 2], [1, 3], [2, 3], [1, 4], [3, 4], [1, 5]] as const)
        return lim(`Quelle est la limite de Sₙ = 1 + {${p}/${d}} + ({${p}/${d}})² + … + ({${p}/${d}})^n ?`, [d, d - p],
          `Sₙ = (1 − (${p}/${d})^{n+1}) ÷ (1 − ${p}/${d}) et (${p}/${d})^{n+1} → 0, donc Sₙ → 1 ÷ (1 − ${p}/${d}) = ${fracText(d, d - p)}.`)
      },
      () => {
        const [a, b] = pick([[2, 3], [3, 4], [4, 5], [3, 5], [5, 4], [4, 3], [3, 2], [7, 5]] as const)
        return lim(`Quelle est la limite de ${UN} = {${a}^n/${b}^n} ?`, a < b ? 0 : Infinity,
          `${UN} = ({${a}/${b}})^n avec {${a}/${b}} ${a < b ? '< 1' : '> 1'} : la limite est ${a < b ? '0' : '+∞'}.`)
      },
      () => {
        const c = randInt(100, 900), t = pick([2, 3, 5, 10])
        return lim(`Un capital de ${c} écus est placé à ${t} % d'intérêts composés par an. On note Cₙ le capital au bout de n années. Quelle est la limite de (Cₙ) ?`, Infinity,
          `Cₙ = ${c} × ${fmt(1 + t / 100)}^n avec ${fmt(1 + t / 100)} > 1 : Cₙ tend vers +∞.`)
      },
    ),
    // Arithmético-géométriques
    variants(
      () => {
        const g = pick(AG), l = g.m * randInt(1, 12) * pick([1, 10]), b = r6(l * (1 - g.a))
        return numeric(`On définit ${UN1} = ${fmt(g.a)}${UN} + ${fmt(b)}. Détermine le réel ℓ tel que ℓ = ${fmt(g.a)}ℓ + ${fmt(b)} (valeur « fixe » de la suite).`, l,
          { explanation: `ℓ − ${fmt(g.a)}ℓ = ${fmt(b)}, soit ${fmt(r6(1 - g.a))}ℓ = ${fmt(b)}, d'où ℓ = ${fmt(l)}.` })
      },
      fresh(() => {
        const g = pick(AG), l = g.m * randInt(1, 12), b = r6(l * (1 - g.a)), u0 = l + randNonZero(-20, 20)
        return numeric(`On définit ${u(0)} = ${fmt(u0)} et ${UN1} = ${fmt(g.a)}${UN} + ${fmt(b)}. On pose ${VN} = ${UN} − ${fmt(l)} ; on admet que (${VN}) est géométrique. Calcule ${u(0, 'v')}.`, u0 - l,
          { explanation: `${u(0, 'v')} = ${u(0)} − ${fmt(l)} = ${fmt(u0)} − ${fmt(l)} = ${fmt(u0 - l)}.` })
      }),
      () => {
        const g = pick(AG), l = g.m * randInt(1, 10), b = r6(l * (1 - g.a)), d = randNonZero(-20, 20), u0 = l + d
        return seqExpr(`On définit ${u(0)} = ${fmt(u0)} et ${UN1} = ${fmt(g.a)}${UN} + ${fmt(b)}. La suite ${VN} = ${UN} − ${fmt(l)} est géométrique de raison ${fmt(g.a)}. Exprime ${UN} en fonction de n.`,
          (n) => l + d * g.a ** n, `${fmt(l)} ${d < 0 ? '−' : '+'} ${geo(Math.abs(d), g.a)}`,
          `${u(0, 'v')} = ${fmt(u0)} − ${fmt(l)} = ${fmt(d)}, donc ${VN} = ${geo(d, g.a)} et ${UN} = ${VN} + ${fmt(l)} = ${fmt(l)} ${d < 0 ? '−' : '+'} ${geo(Math.abs(d), g.a)}.`)
      },
      () => {
        const g = pick(AG), l = g.m * randInt(1, 12) * pick([1, 10]), b = r6(l * (1 - g.a)), u0 = randInt(0, 5) * 10
        return lim(`On définit ${u(0)} = ${u0} et ${UN1} = ${fmt(g.a)}${UN} + ${fmt(b)}. On admet que ${UN} = ℓ + (${u(0)} − ℓ) × ${fmt(g.a)}^n, où ℓ est le point fixe. Quelle est la limite de (${UN}) ?`, l,
          `Point fixe : ℓ = ${fmt(g.a)}ℓ + ${fmt(b)} donne ℓ = ${fmt(l)} ; comme ${fmt(g.a)}^n → 0, ${UN} → ${fmt(l)}.`)
      },
    ),
    // Sens de variation
    variants(
      () => {
        const b = randInt(-6, 6), c = randInt(-5, 5)
        return seqExpr(`Pour tout n, ${UN} = n²${b === 0 ? '' : ` ${b < 0 ? '−' : '+'} ${Math.abs(b) === 1 ? '' : Math.abs(b)}n`}${tail(c)}. Exprime ${UN1} − ${UN} en fonction de n (forme réduite).`,
          (n) => 2 * n + 1 + b, `2n${tail(b + 1)}`,
          `${UN1} − ${UN} = (n + 1)² − n²${b === 0 ? '' : ` ${b < 0 ? '−' : '+'} ${Math.abs(b)}(n + 1 − n)`} = 2n + 1${tail(b)} = 2n${tail(b + 1)}.`)
      },
      () => {
        const u0 = randNonZero(-9, 9), q = pick([2, 3, 0.5, 0.2, 1.5, 0.8])
        const inc = (u0 > 0) === (q > 1)
        return choice(`(${UN}) est géométrique de premier terme ${u(0)} = ${fmt(u0)} et de raison ${fmt(q)}. Elle est :`, inc ? 'croissante' : 'décroissante', [inc ? 'décroissante' : 'croissante', 'ni croissante ni décroissante'],
          `${UN1} − ${UN} = ${UN}(q − 1) = ${u(0)} × qⁿ × (q − 1) : ${u(0)} ${u0 > 0 ? '> 0' : '< 0'} et q − 1 ${q > 1 ? '> 0' : '< 0'}, donc la suite est ${inc ? 'croissante' : 'décroissante'}.`)
      },
      () => {
        const u0 = randNonZero(-9, 9), q = pick([-2, -3, -0.5])
        return choice(`(${UN}) est géométrique de premier terme ${u(0)} = ${fmt(u0)} et de raison ${fmt(q)}. Elle est :`, 'ni croissante ni décroissante', ['croissante', 'décroissante'],
          `La raison est négative : les termes changent de signe à chaque rang, la suite n'est pas monotone.`)
      },
      fresh(() => {
        const k = randInt(2, 9), u0 = randInt(-5, 5)
        return numeric(`On définit ${u(0)} = ${fmt(u0)} et ${UN1} = ${UN} − 2n + ${2 * k - 1}. À partir de quel rang n a-t-on ${UN1} < ${UN} ?`, k,
          { explanation: `${UN1} − ${UN} = −2n + ${2 * k - 1} < 0 ⇔ n > ${fmt(k - 0.5)}, soit n ≥ ${k}.` })
      }),
    ),
  ],
  // ── Palier 4 ──
  [
    // Comparaison, gendarmes
    variants(
      () => {
        const f = pick([
          { t: `{cos(n)/n}`, v: 0, e: `−{1/n} ≤ {cos(n)/n} ≤ {1/n} et les deux bornes tendent vers 0 : théorème des gendarmes, limite 0.` },
          { t: `{(−1)^n/n²}`, v: 0, e: `−{1/n²} ≤ ${UN} ≤ {1/n²}, bornes de limite 0 : par les gendarmes, ${UN} → 0.` },
          { t: `{3 + sin(n)/n}`, v: 0, e: `2 ≤ 3 + sin(n) ≤ 4 donc {2/n} ≤ ${UN} ≤ {4/n} : gendarmes, limite 0.` },
          { t: `{sin(n)/√n}`, v: 0, e: `|${UN}| ≤ {1/√n} qui tend vers 0 : gendarmes, limite 0.` },
        ])
        return lim(`Quelle est la limite de ${UN} = ${f.t} ?`, f.v, f.e)
      },
      () => {
        const f = pick([
          { t: `n + (−1)^n`, v: Infinity, e: `${UN} ≥ n − 1, qui tend vers +∞ : par comparaison, ${UN} → +∞.` },
          { t: `n² + 3 sin(n)`, v: Infinity, e: `${UN} ≥ n² − 3, qui tend vers +∞ : par comparaison, ${UN} → +∞.` },
          { t: `−n + cos(n)`, v: -Infinity, e: `${UN} ≤ −n + 1, qui tend vers −∞ : par comparaison, ${UN} → −∞.` },
          { t: `2n − sin(n)`, v: Infinity, e: `${UN} ≥ 2n − 1 → +∞ : par comparaison, ${UN} → +∞.` },
        ])
        return lim(`Quelle est la limite de ${UN} = ${f.t} ?`, f.v, f.e)
      },
      () => {
        const [a, c] = pick([[1, 2], [3, 2], [1, 3], [2, 3], [5, 2], [3, 4], [5, 3], [4, 3]] as const)
        const f = pick([
          { t: `{${cf(a)}n + (−1)^n/${c}n}`, e: `${UN} = {${a}/${c}} + {(−1)^n/${c}n} et ce dernier terme est encadré par ±{1/${c}n} → 0 : ${UN} → {${a}/${c}}.` },
          { t: `{${cf(a)}n + sin(n)/${c}n}`, e: `${UN} = {${a}/${c}} + {sin(n)/${c}n} avec |sin(n)| ≤ 1, donc ce terme tend vers 0 : ${UN} → {${a}/${c}}.` },
          { t: `{${cf(a)}n² + cos(n)/${c}n²}`, e: `${UN} = {${a}/${c}} + {cos(n)/${c}n²} et ce dernier terme tend vers 0 (gendarmes) : ${UN} → {${a}/${c}}.` },
        ])
        return lim(`Quelle est la limite de ${UN} = ${f.t} ?`, [a, c], f.e)
      },
      () => {
        const [a, c] = pick([[1, 2], [3, 2], [1, 3], [2, 3], [5, 2], [3, 4], [5, 3], [4, 3]] as const), b = randInt(1, 3)
        return lim(`On sait que, pour tout n ≥ 1, {${cf(a)}n − ${b}/${c}n} ≤ ${UN} ≤ {${cf(a)}n + ${b}/${c}n}. Quelle est la limite de (${UN}) ?`, [a, c],
          `Les deux bornes valent {${a}/${c}} ∓ {${b}/${c}n} et tendent vers {${a}/${c}} : par le théorème des gendarmes, ${UN} → {${a}/${c}}.`)
      },
    ),
    // Croissances comparées
    variants(
      () => {
        const k = randInt(2, 5)
        return lim(`Quelle est la limite de ${UN} = {n^${k}/eⁿ} ?`, 0, `Croissances comparées : l'exponentielle l'emporte sur toute puissance de n, donc {n^${k}/eⁿ} → 0.`)
      },
      () => {
        const k = randInt(2, 6)
        return lim(`Quelle est la limite de ${UN} = {eⁿ/n^${k}} ?`, Infinity, `Croissances comparées : {eⁿ/n^${k}} → +∞.`)
      },
      () => {
        const f = pick([
          { t: `{ln(n)/n}`, v: 0, e: 'Croissances comparées : n l’emporte sur ln(n), le quotient tend vers 0.' },
          { t: `n − ln(n)`, v: Infinity, e: `n − ln(n) = n(1 − {ln(n)/n}) et {ln(n)/n} → 0 : la limite est +∞.` },
          { t: `{n/ln(n)}`, v: Infinity, e: 'Inverse de ln(n)/n, qui tend vers 0 par valeurs positives : +∞.' },
          { t: `{ln(n)/n²}`, v: 0, e: 'ln(n)/n² = (ln(n)/n) × (1/n) → 0 × 0 = 0.' },
        ])
        return lim(`Quelle est la limite de ${UN} = ${f.t} ?`, f.v, f.e)
      },
      () => {
        const k = randInt(2, 4), q = pick([2, 3, 1.5])
        return pick([
          () => lim(`Quelle est la limite de ${UN} = {n^${k}/${fmt(q)}^n} ?`, 0, `Une suite géométrique de raison > 1 l'emporte sur toute puissance de n : la limite est 0.`),
          () => lim(`Quelle est la limite de ${UN} = eⁿ − n^${k} ?`, Infinity, `${UN} = eⁿ(1 − {n^${k}/eⁿ}) et {n^${k}/eⁿ} → 0 : ${UN} → +∞.`),
          () => lim(`Quelle est la limite de ${UN} = n^${k} e⁻ⁿ ?`, 0, `n^${k} e⁻ⁿ = {n^${k}/eⁿ} → 0 par croissances comparées.`),
        ])()
      },
    ),
    // Arithmético-géométrique en contexte
    variants(
      () => {
        const s = pick([10, 20, 25]), a = 1 - s / 100, l = pick([2000, 3000, 4000, 5000, 6000]), b = r6(l * (1 - a)), u0 = pick([500, 1000, 1500])
        return numeric(`Un journal a ${u0} abonnés. Chaque année, ${s} % des abonnés résilient, mais ${fmt(b)} nouveaux s'abonnent. Vers quel nombre d'abonnés la suite (${UN}) converge-t-elle ?`, l,
          { explanation: `${UN1} = ${fmt(a)}${UN} + ${fmt(b)}. Limite ℓ : ℓ = ${fmt(a)}ℓ + ${fmt(b)}, soit ${fmt(s / 100)}ℓ = ${fmt(b)}, d'où ℓ = ${fmt(l)}.` })
      },
      () => {
        const s = pick([20, 25, 40, 50]), a = 1 - s / 100, d = pick([2, 3, 4, 5, 6])
        const l = r6(d / (1 - a))
        return numeric(`Un patient reçoit ${d} mg d'un médicament chaque heure ; entre deux injections, son corps en élimine ${s} %. On note ${UN} la quantité (en mg) présente juste après la n-ième injection. Vers quelle quantité ${UN} se stabilise-t-elle ?`, l,
          { explanation: `${UN1} = ${fmt(a)}${UN} + ${d}. Limite : ℓ = ${fmt(a)}ℓ + ${d}, soit ℓ = {${d}/${fmt(s / 100)}} = ${fmt(l)} mg.` })
      },
      fresh(() => {
        const s = pick([10, 20, 25, 50]), a = 1 - s / 100, add = pick([100, 200, 300, 400]), u0 = pick([1000, 2000, 4000, 800])
        const u1 = r6(a * u0 + add), u2 = r6(a * u1 + add)
        return numeric(`Un étang contient ${u0} poissons. Chaque année, ${s} % disparaissent et on en réintroduit ${add}. Combien y en a-t-il au bout de 2 ans ?`, u2,
          { explanation: `${UN1} = ${fmt(a)}${UN} + ${add} : ${u(1)} = ${fmt(a)} × ${u0} + ${add} = ${fmt(u1)}, ${u(2)} = ${fmt(a)} × ${fmt(u1)} + ${add} = ${fmt(u2)}.` })
      }),
      () => {
        const g = pick(AG), l = g.m * randInt(2, 20) * 10, b = r6(l * (1 - g.a))
        return numeric(`Une forêt compte ${UN} arbres l'année n, avec ${UN1} = ${fmt(g.a)}${UN} + ${fmt(b)}. Combien d'arbres compte-t-elle à long terme (limite de la suite) ?`, l,
          { explanation: `ℓ = ${fmt(g.a)}ℓ + ${fmt(b)} donne ${fmt(r6(1 - g.a))}ℓ = ${fmt(b)}, d'où ℓ = ${fmt(l)} ; comme 0 < ${fmt(g.a)} < 1, la suite converge vers ℓ.` })
      },
    ),
    // Seuils
    variants(
      () => {
        const N = pick([100, 500, 1000, 2000, 5000, 10000, 50000])
        const n = Math.floor(Math.log2(N)) + 1
        return numeric(`Quel est le plus petit entier n tel que 2^n > ${big(N)} ?`, n,
          { explanation: `2^${n - 1} = ${big(2 ** (n - 1))} ≤ ${big(N)} et 2^${n} = ${big(2 ** n)} > ${big(N)} : n = ${n}.` })
      },
      () => {
        const N = pick([50, 100, 500, 1000, 3000, 10000])
        let n = 0
        while (3 ** n <= N) n++
        return numeric(`Une colonie compte 1 insecte au mois 0 et triple chaque mois : elle compte 3^n insectes au mois n. À partir de quel mois dépasse-t-elle ${big(N)} insectes ?`, n,
          { explanation: `3^${n - 1} = ${big(3 ** (n - 1))} ≤ ${big(N)} < 3^${n} = ${big(3 ** n)} : à partir du mois ${n}.` })
      },
      () => {
        const p = pick([2, 3, 4])
        const n = Math.ceil(Math.log2(10 ** p) + 1e-9)
        return numeric(`Quel est le plus petit entier n tel que 0,5^n < 10^{−${p}} ?`, n,
          { explanation: `0,5^n < 10^{−${p}} ⇔ 2^n > ${big(10 ** p)} ; 2^${n - 1} = ${big(2 ** (n - 1))} et 2^${n} = ${big(2 ** n)}, donc n = ${n}.` })
      },
      fresh(() => {
        const a = randInt(-20, 20), r = randInt(3, 9), N = randInt(100, 600)
        const n = Math.floor((N - a) / r) + 1
        return numeric(`(${UN}) est arithmétique de premier terme ${u(0)} = ${fmt(a)} et de raison ${r}. Quel est le plus petit n tel que ${UN} > ${N} ?`, n,
          { explanation: `${fmt(a)} + ${r}n > ${N} ⇔ n > {${N - a}/${r}} ≈ ${fmt(Math.round(((N - a) / r) * 100) / 100)} : n = ${n}.` })
      }),
      () => {
        const N = pick([100, 200, 500, 1000, 2000])
        let n = 0
        while ((n * (n + 1)) / 2 <= N) n++
        return numeric(`Quel est le plus petit entier n tel que 1 + 2 + … + n > ${N} ?`, n,
          { explanation: `{n(n + 1)/2} > ${N} : pour n = ${n - 1}, la somme vaut ${((n - 1) * n) / 2} ; pour n = ${n}, ${(n * (n + 1)) / 2}. Donc n = ${n}.` })
      },
    ),
    // Sommes générales
    variants(
      () => {
        const p = randInt(2, 5), N = p + randInt(4, 8)
        return num(`(${UN}) est géométrique de premier terme ${u(0)} = 1 et de raison 2. Calcule ${u(p)} + ${u(p + 1)} + … + ${u(N)}.`, 2 ** (N + 1) - 2 ** p,
          `${N - p + 1} termes à partir de ${u(p)} = 2^${p} : 2^${p} × {2^${N - p + 1} − 1/2 − 1} = 2^${N + 1} − 2^${p} = ${big(2 ** (N + 1) - 2 ** p)}.`)
      },
      () => {
        const a = randInt(-10, 10), r = randInt(2, 6), p = randInt(3, 10), q = p + randInt(10, 30)
        const s = ((q - p + 1) * (2 * a + (p + q) * r)) / 2
        return num(`(${UN}) est arithmétique de premier terme ${u(0)} = ${fmt(a)} et de raison ${r}. Calcule ${u(p)} + ${u(p + 1)} + … + ${u(q)}.`, s,
          `${q - p + 1} termes, de ${u(p)} = ${fmt(a + p * r)} à ${u(q)} = ${fmt(a + q * r)} : S = ${q - p + 1} × {${fmt(a + p * r)} + ${fmt(a + q * r)}/2} = ${big(s)}.`)
      },
      () => {
        const a = randInt(2, 6), k = randInt(5, 9)
        return num(`Le premier jour, un marchand gagne ${a} écus ; chaque jour, il gagne le double de la veille. Combien a-t-il gagné en tout au bout de ${k} jours ?`, a * (2 ** k - 1),
          `${a}(1 + 2 + … + 2^${k - 1}) = ${a}(2^${k} − 1) = ${a} × ${2 ** k - 1} = ${big(a * (2 ** k - 1))}.`)
      },
      () => {
        const k = randInt(3, 6), a = 3 ** k * pick([1, 2])
        const s = (a * (1 - (1 / 3) ** (k + 1))) / (1 - 1 / 3)
        return num(`Calcule ${a} + {${a}/3} + {${a}/9} + … + {${a}/3^${k}} (${k + 1} termes).`, Math.round(s),
          `Somme géométrique de raison {1/3} : ${a} × (1 − (1/3)^${k + 1}) ÷ (1 − 1/3) = {3 × ${a}/2} × (1 − {1/${3 ** (k + 1)}}) = ${big(Math.round(s))}.`)
      },
    ),
  ],
  // ── Palier 5 : exigeant ──
  [
    // Conjecturer puis démontrer par récurrence le terme général
    variants(
      () => {
        const c = randInt(0, 6)
        return seqExpr(`On pose ${u(0)} = ${c} et ${UN1} = ${UN} + 2n + 1. Conjecture une expression de ${UN} en fonction de n (que l'on démontrerait par récurrence).`, (n) => n * n + c, `n²${tail(c)}`,
          `${u(1)} = ${1 + c}, ${u(2)} = ${4 + c}, ${u(3)} = ${9 + c} : on conjecture ${UN} = n²${tail(c)}. Hérédité : n²${tail(c)} + 2n + 1 = (n + 1)²${tail(c)}.`)
      },
      () => {
        const a = pick([2, 3]), k = randInt(1, 3)
        // uₙ₊₁ = a uₙ + (a − 1) × 1… on vise uₙ = k aⁿ − 1 : u₀ = k − 1, uₙ₊₁ = a uₙ + a − 1
        return seqExpr(`On pose ${u(0)} = ${k - 1} et ${UN1} = ${a}${UN} + ${a - 1}. Conjecture puis démontre par récurrence une expression de ${UN} en fonction de n.`, (n) => k * a ** n - 1, `${k === 1 ? '' : `${k} × `}${a}^n − 1`,
          `${UN} + 1 est multiplié par ${a} à chaque étape (${UN1} + 1 = ${a}(${UN} + 1)) et vaut ${k} au départ : ${UN} = ${k === 1 ? '' : `${k} × `}${a}^n − 1.`)
      },
      () => seqExpr(`On pose ${u(0)} = 1 et ${UN1} = {${UN}/1 + ${UN}}. Calcule quelques termes, conjecture puis démontre une expression de ${UN} en fonction de n.`, (n) => 1 / (n + 1), '1/(n + 1)',
        `${u(1)} = {1/2}, ${u(2)} = {1/3}, ${u(3)} = {1/4} : ${UN} = {1/n + 1}. Hérédité : si ${UN} = {1/n + 1}, alors 1 + ${UN} = {n + 2/n + 1}, et ${UN1} = {1/n + 1} × {n + 1/n + 2} = {1/n + 2}.`),
      () => {
        const c = randInt(1, 4)
        return seqExpr(`On pose ${u(0)} = ${c} et ${UN1} = ${UN} + 4n + 2. Conjecture une expression de ${UN} en fonction de n.`, (n) => 2 * n * n + c, `2n²${tail(c)}`,
          `Les écarts 2, 6, 10, … donnent ${UN} = ${c} + 2 + 6 + … + (4n − 2) = 2n²${tail(c)}. Hérédité : 2n²${tail(c)} + 4n + 2 = 2(n + 1)²${tail(c)}.`)
      },
      () => {
        const c = randInt(2, 6)
        return seqExpr(`On pose ${u(0)} = ${c} et ${UN1} = 3${UN} − 2. Conjecture puis démontre une expression de ${UN} en fonction de n.`, (n) => (c - 1) * 3 ** n + 1, `${c - 1 === 1 ? '' : `${c - 1} × `}3^n + 1`,
          `${UN1} − 1 = 3(${UN} − 1) : la suite ${UN} − 1 est géométrique de raison 3 et de premier terme ${c - 1}, donc ${UN} = ${c - 1 === 1 ? '' : `${c - 1} × `}3^n + 1.`)
      },
    ),
    // Limite par point fixe
    variants(
      () => {
        const l = randInt(2, 6), a = randInt(1, l - 1), b = l * l - a * l
        return numeric(`On définit ${u(0)} = 0 et ${UN1} = √{${a === 1 ? '' : a}${UN} + ${b}}. On admet que (${UN}) est croissante et majorée, donc convergente. Quelle est sa limite ?`, l,
          { explanation: `La limite ℓ ≥ 0 vérifie ℓ = √(${a}ℓ + ${b}), soit ℓ² − ${a}ℓ − ${b} = 0, de racines ${l} et ${fmt(a - l)} : ℓ = ${l}.` })
      },
      () => {
        const k = randInt(2, 9)
        return numeric(`On définit ${u(0)} = ${k + randInt(1, 5)} et ${UN1} = {1/2}(${UN} + {${k * k}/${UN}}) (méthode de Héron). On admet que la suite converge vers un réel ℓ > 0. Que vaut ℓ ?`, k,
          { explanation: `ℓ = {1/2}(ℓ + {${k * k}/ℓ}) ⇔ ℓ = {${k * k}/ℓ} ⇔ ℓ² = ${k * k}, donc ℓ = ${k}.` })
      },
      () => {
        const l = randInt(1, 4), k = l * (l + 1)
        return numeric(`On définit ${u(0)} = 1 et ${UN1} = {${k}/1 + ${UN}}. On admet que (${UN}) converge vers un réel ℓ > 0. Que vaut ℓ ?`, l,
          { explanation: `ℓ = {${k}/1 + ℓ} ⇔ ℓ² + ℓ − ${k} = 0, de racines ${l} et ${fmt(-l - 1)} : ℓ = ${l} car ℓ > 0.` })
      },
      () => {
        const g = pick(AG), l = g.m * randInt(1, 12), b = r6(l * (1 - g.a)), c = randInt(2, 5)
        return numeric(`On définit ${u(0)} = 0 et ${UN1} = ${fmt(g.a)}${UN} + ${fmt(b)}. On admet que (${UN}) converge. Quelle est la limite de ${c}${UN} − 1 ?`, c * l - 1,
          { explanation: `La limite ℓ vérifie ℓ = ${fmt(g.a)}ℓ + ${fmt(b)}, d'où ℓ = ${fmt(l)} ; par opérations, ${c}${UN} − 1 → ${c} × ${fmt(l)} − 1 = ${fmt(c * l - 1)}.` })
      },
    ),
    // Arithmético-géométrique complète
    variants(
      () => {
        const a = pick([2, 3]), l = randNonZero(-5, 5), d = randNonZero(-4, 4), b = l * (1 - a)
        return seqExpr(`On définit ${u(0)} = ${fmt(l + d)} et ${UN1} = ${a}${UN}${tail(b)}. Exprime ${UN} en fonction de n.`, (n) => l + d * a ** n, `${geo(d, a)}${tail(l)}`,
          `Point fixe : ℓ = ${a}ℓ${tail(b)} donne ℓ = ${fmt(l)}. ${UN} − ${par(l)} est géométrique de raison ${a} et de premier terme ${fmt(d)} : ${UN} = ${geo(d, a)}${tail(l)}.`)
      },
      () => {
        const a = pick([2, 3]), l = randNonZero(-5, 5), d = randNonZero(-4, 4), b = l * (1 - a)
        return lim(`On définit ${u(0)} = ${fmt(l + d)} et ${UN1} = ${a}${UN}${tail(b)}. Quelle est la limite de (${UN}) ?`, d > 0 ? Infinity : -Infinity,
          `Point fixe ℓ = ${fmt(l)} ; ${UN} = ${geo(d, a)}${tail(l)}. Comme ${a}^n → +∞ et ${fmt(d)} ${d > 0 ? '> 0' : '< 0'}, la limite est ${d > 0 ? '+∞' : '−∞'}.`)
      },
      fresh(() => {
        const l = pick([10, 20, 40, 100]), d = -l, k = randInt(3, 6)
        const val = l + d * 0.5 ** k
        return numeric(`On définit ${u(0)} = 0 et ${UN1} = 0,5${UN} + ${fmt(l / 2)}. Calcule ${u(k)} à l'aide de l'expression de ${UN} en fonction de n.`, val,
          { explanation: `Point fixe ℓ = ${l} ; ${UN} = ${l} − ${l} × 0,5^n, donc ${u(k)} = ${l} − {${l}/${2 ** k}} = ${fmt(val)}.` })
      }),
      () => {
        const g = pick(AG.filter((x) => x.a <= 0.6)), l = g.m * randInt(2, 10), b = r6(l * (1 - g.a))
        return seqExpr(`On définit ${u(0)} = 0 et ${UN1} = ${fmt(g.a)}${UN} + ${fmt(b)}. Exprime ${UN} en fonction de n.`, (n) => l - l * g.a ** n, `${fmt(l)} − ${geo(l, g.a)}`,
          `Point fixe ℓ = {${fmt(b)}/1 − ${fmt(g.a)}} = ${fmt(l)}. ${VN} = ${UN} − ${fmt(l)} est géométrique de raison ${fmt(g.a)}, ${u(0, 'v')} = −${fmt(l)} : ${UN} = ${fmt(l)} − ${geo(l, g.a)}.`)
      },
    ),
    // Sommes et limites
    variants(
      () => {
        const a = randInt(2, 9), [p, d] = pick([[1, 2], [1, 3], [2, 3], [1, 4], [3, 4]] as const)
        return lim(`Quelle est la limite de Sₙ = ${a} + ${a} × {${p}/${d}} + ${a} × ({${p}/${d}})² + … + ${a} × ({${p}/${d}})^n ?`, [a * d, d - p],
          `Sₙ = ${a} × (1 − (${p}/${d})^{n+1}) ÷ (1 − ${p}/${d}) → ${a} ÷ (1 − ${p}/${d}) = ${fracText(a * d, d - p)}.`)
      },
      () => lim(`On pose Sₙ = 1 + 2 + … + n. Quelle est la limite de {Sₙ/n²} ?`, [1, 2],
        `Sₙ = {n(n + 1)/2}, donc {Sₙ/n²} = {n + 1/2n} = {1/2} + {1/2n} → {1/2}.`),
      () => {
        const k = randInt(2, 5)
        return lim(`On pose Sₙ = 1 + 3 + 5 + … + (2n − 1). Quelle est la limite de {Sₙ/${k}n²} ?`, [1, k],
          `Sₙ = n² (somme des n premiers impairs), donc {Sₙ/${k}n²} = {1/${k}}.`)
      },
      () => {
        const q = pick([2, 3])
        return lim(`On pose Sₙ = 1 + ${q} + ${q}² + … + ${q}^n. Quelle est la limite de {Sₙ/${q}^n} ?`, [q, q - 1],
          q === 2 ? `Sₙ = 2^{n+1} − 1, donc {Sₙ/2^n} = 2 − 2^{−n} → 2.` : `Sₙ = (${q}^{n+1} − 1) ÷ ${q - 1}, donc {Sₙ/${q}^n} = (${q} − ${q}^{−n}) ÷ ${q - 1} → {${q}/${q - 1}}.`)
      },
    ),
    // Formes indéterminées avancées
    variants(
      () => {
        const a = randInt(1, 9)
        return lim(`Quelle est la limite de ${UN} = √{n + ${a}} − √{n} ?`, 0,
          `Avec la quantité conjuguée : ${UN} = {${a}/√(n + ${a}) + √n} → 0.`)
      },
      () => {
        const a = randNonZero(-8, 8)
        return lim(`Quelle est la limite de ${UN} = √{n² ${a < 0 ? '−' : '+'} ${Math.abs(a) === 1 ? '' : Math.abs(a)}n} − n ?`, [a, 2],
          `${UN} = {${cf(a)}n/√(n² ${a < 0 ? '−' : '+'} ${Math.abs(a) === 1 ? '' : Math.abs(a)}n) + n} = ${fmt(a)} ÷ (√(1 ${a < 0 ? '−' : '+'} ${Math.abs(a)}/n) + 1) → {${fmt(a)}/2} = ${fracText(a, 2)}.`)
      },
      () => {
        const [a, b] = pick([[3, 2], [5, 2], [4, 3], [5, 3], [5, 4]] as const)
        return lim(`Quelle est la limite de ${UN} = {${a}^n − ${b}^n/${a}^n + ${b}^n} ?`, 1,
          `On divise par ${a}^n en haut et en bas : ${UN} = (1 − (${b}/${a})^n) ÷ (1 + (${b}/${a})^n) et (${b}/${a})^n → 0 : la limite est 1.`)
      },
      () => {
        const [a, b, c] = pick([[2, 5, 4], [3, 5, 4], [2, 3, 2], [4, 3, 5], [2, 3, 4], [6, 5, 7]] as const)
        const top = Math.max(a, b)
        return lim(`Quelle est la limite de ${UN} = {${a}^n + ${b}^n/${c}^n} ?`, top > c ? Infinity : 0,
          `${UN} = (${a}/${c})^n + (${b}/${c})^n ; ${top > c ? `(${top}/${c})^n → +∞ (raison > 1), l'autre terme est positif` : `les deux raisons sont dans ]0 ; 1[, les deux termes tendent vers 0`} : la limite est ${top > c ? '+∞' : '0'}.`)
      },
      () => {
        const a = randInt(1, 5), c = randInt(2, 6)
        return lim(`Quelle est la limite de ${UN} = {${a === 1 ? '' : a}n² + (−1)^n n/${c}n² + 1} ?`, [a, c],
          `On divise par n² en haut et en bas : ${UN} = (${a} + (−1)^n/n) ÷ (${c} + 1/n²) ; (−1)^n/n → 0 (gendarmes), donc ${UN} → {${a}/${c}}.`)
      },
    ),
  ],
]

// ═══ Problèmes d'amélioration ═══════════════════════════════════════════
const upgrades: Ladder = [
  [
    () => {
      const r = randNonZero(-5, 6), a = randNonZero(-10, 20), p = randInt(3, 6), q = p + randInt(4, 8)
      let N = randInt(15, 30)
      if (a + N * r === 0) N++
      const s = ((N + 1) * (2 * a + N * r)) / 2
      return T('La somme cachée', num(`(${UN}) est arithmétique, avec ${u(p)} = ${fmt(a + p * r)} et ${u(q)} = ${fmt(a + q * r)}. Calcule ${u(0)} + ${u(1)} + … + ${u(N)}.`, s,
        `r = {${fmt(a + q * r)} − ${par(a + p * r)}/${q - p}} = ${fmt(r)}, ${u(0)} = ${fmt(a)}, ${u(N)} = ${fmt(a + N * r)} ; S = ${N + 1} × {${fmt(a)} + ${par(a + N * r)}/2} = ${big(s)}.`))
    },
    () => {
      const n = randInt(20, 120)
      return T('Les impairs', num(`Calcule 1 + 3 + 5 + … + ${2 * n - 1}.`, n * n,
        `Il y a ${n} nombres impairs de 1 à ${2 * n - 1} ; leur somme vaut ${n} × {1 + ${2 * n - 1}/2} = ${n}² = ${big(n * n)}.`))
    },
    () => {
      const q = pick([2, 3, -2, -3]), a = randNonZero(-4, 4), p = randInt(1, 3)
      return T('La raison au cube', numeric(`(${UN}) est géométrique, avec ${u(p)} = ${fmt(a * q ** p)} et ${u(p + 3)} = ${fmt(a * q ** (p + 3))}. Quelle est sa raison ?`, q,
        { explanation: `q³ = {${u(p + 3)}/${u(p)}} = ${fmt(q ** 3)}, et un cube détermine la raison : q = ${fmt(q)}.` }))
    },
    () => {
      const n = randInt(8, 15)
      return T('Les marches du donjon', num(`Le premier jour, un garde monte 1 marche ; le deuxième jour 3 marches ; le troisième 5 ; et ainsi de suite (2 de plus chaque jour). Combien de marches a-t-il montées en tout au bout de ${n} jours ?`, n * n,
        `1 + 3 + … + ${2 * n - 1} = ${n}² = ${n * n} marches.`))
    },
  ],
  [
    () => {
      const h = pick([2, 3, 4, 6, 8, 9, 12]), [p, d] = pick([[1, 2], [2, 3], [3, 4], [1, 3]] as const)
      const total = h + (2 * h * p) / (d - p)
      return T('La balle qui rebondit', numeric(`On lâche une balle d'une hauteur de ${h} m. À chaque rebond, elle remonte aux {${p}/${d}} de la hauteur précédente. Quelle distance totale (montées et descentes) aura-t-elle parcourue à la limite, quand le nombre de rebonds tend vers +∞ ?`, total,
        { answer: fracText(h * (d - p) + 2 * h * p, d - p), explanation: `Descente initiale ${h} m, puis chaque rebond hₖ = ${h} × (${p}/${d})^k est parcouru deux fois : ${h} + 2 × ${h} × (${p}/${d}) ÷ (1 − ${p}/${d}) = ${h} + ${fracText(2 * h * p, d - p)} = ${fracText(h * (d - p) + 2 * h * p, d - p)} m.` }))
    },
    () => {
      const g = pick(AG), l = g.m * randInt(1, 15), b = r6(l * (1 - g.a))
      return T('La suite immobile', numeric(`On définit ${UN1} = ${fmt(g.a)}${UN} + ${fmt(b)}. Quelle valeur faut-il donner à ${u(0)} pour que la suite soit constante ?`, l,
        { explanation: `La suite est constante si ${u(1)} = ${u(0)}, c'est-à-dire ${u(0)} = ${fmt(g.a)}${u(0)} + ${fmt(b)}, soit ${u(0)} = ${fmt(l)} (le point fixe).` }))
    },
    () => {
      const N = pick([1000, 2000, 5000, 10000]), a = pick([1, 2, 3, 5])
      let n = 0
      while (a * (2 ** (n + 1) - 1) < N) n++
      return T('Le trésor du sage', numeric(`Un sage reçoit ${a} pièce${a > 1 ? 's' : ''} le jour 0, ${2 * a} le jour 1, ${4 * a} le jour 2, et ainsi de suite en doublant. À la fin de quel jour son trésor total atteint-il au moins ${big(N)} pièces ?`, n,
        { explanation: `Après le jour n, il possède ${a === 1 ? '' : `${a} × `}(1 + 2 + … + 2ⁿ) = ${a === 1 ? '' : `${a} × `}(2^{n+1} − 1) pièces. Au jour ${n - 1} : ${big(a * (2 ** n - 1))} < ${big(N)} ; au jour ${n} : ${big(a * (2 ** (n + 1) - 1))} ≥ ${big(N)}. Réponse : jour ${n}.` }))
    },
    () => {
      const a = pick([0.5, 0.8, 0.9]), u0 = pick([2, 3, 5]), k = randInt(2, 6)
      return T('La limite paramétrée', lim(`On définit ${u(0)} = ${u0} et ${UN1} = ${fmt(a)}${UN} + ${k}. Quelle est la limite de (${UN}) ?`, r6(k / (1 - a)),
        `Comme 0 < ${fmt(a)} < 1, la suite converge vers le point fixe ℓ = {${k}/1 − ${fmt(a)}} = ${fmt(r6(k / (1 - a)))}.`))
    },
  ],
  [
    () => {
      const cases = [
        { t: '2^n > n²', f: (n: number) => 2 ** n > n * n },
        { t: '2^n > n³', f: (n: number) => 2 ** n > n ** 3 },
        { t: '3^n > n³', f: (n: number) => 3 ** n > n ** 3 },
        { t: 'n! > 2^n', f: (n: number) => fact(n) > 2 ** n },
        { t: 'n! > 3^n', f: (n: number) => fact(n) > 3 ** n },
        { t: '2^n > 5n', f: (n: number) => 2 ** n > 5 * n },
        { t: '2^n > 3n', f: (n: number) => 2 ** n > 3 * n },
        { t: '2^n > 10n', f: (n: number) => 2 ** n > 10 * n },
        { t: '3^n > 10n²', f: (n: number) => 3 ** n > 10 * n * n },
        { t: '2^n > n² + 1', f: (n: number) => 2 ** n > n * n + 1 },
        { t: '3^n > 2^n + 10', f: (n: number) => 3 ** n > 2 ** n + 10 },
        { t: 'n! > 4^n', f: (n: number) => fact(n) > 4 ** n },
      ]
      const c = pick(cases)
      let n0 = 60
      while (n0 > 0 && c.f(n0 - 1)) n0--
      return T('Le rang décisif', numeric(`Quel est le plus petit entier n₀ tel que ${c.t} pour tout entier n ≥ n₀ ? (On le démontrerait ensuite par récurrence.)`, n0,
        { explanation: `L'inégalité est fausse pour n = ${n0 - 1} et vraie pour n = ${n0}, puis l'hérédité se démontre par récurrence à partir de ce rang : n₀ = ${n0}.` }))
    },
    () => {
      const n = randInt(5, 30)
      return T('La somme télescopique', fraction(`Calcule {1/1 × 2} + {1/2 × 3} + … + {1/${n} × ${n + 1}}. (Indice : {1/k(k + 1)} = {1/k} − {1/k + 1}.)`, n, n + 1,
        { explanation: `Les termes se télescopent : (1 − {1/2}) + ({1/2} − {1/3}) + … = 1 − {1/${n + 1}} = {${n}/${n + 1}}.` }))
    },
    () => {
      const u0 = randInt(-3, 5)
      return T('La limite par morceaux', lim(`On définit ${u(0)} = ${fmt(u0)} et ${UN1} = ${UN} + {1/2^n}. Quelle est la limite de (${UN}) ?`, u0 + 2,
        `${UN} = ${u(0)} + 1 + {1/2} + … + {1/2ⁿ⁻¹} = ${fmt(u0)} + 2(1 − {1/2^n}) → ${fmt(u0)} + 2 = ${fmt(u0 + 2)}.`))
    },
    () => {
      const k = randInt(2, 6), c = randInt(0, 4)
      return T('Le cercle vertueux', seqExpr(`On définit ${u(0)} = ${c} et ${UN1} = ${UN} + 2n + ${k}. Exprime ${UN} en fonction de n.`, (n) => n * n + (k - 1) * n + c,
        `n² + ${k - 1 === 1 ? '' : k - 1}n${tail(c)}`, `${UN} = ${u(0)} + Σ (2j + ${k}) pour j de 0 à n − 1 = ${c === 0 ? '' : `${c} + `}n(n − 1) + ${k}n = n² + ${k - 1}n${tail(c)} (puis récurrence pour le démontrer).`))
    },
  ],
]

// ═══ Problèmes de l'hôtel de ville ══════════════════════════════════════
/** Toile d'araignée : y = f(x), y = x, et l'escalier/spirale des premiers termes. */
function cobweb(a: number, b: number, u0: number, steps: number, win: { xMax: number; yMax: number; step: number }): Figure {
  const g = graphFigure({ xMin: padX(win.xMax, win.yMax), xMax: win.xMax, yMin: 0, yMax: win.yMax, step: win.step, ystep: win.step, labelStep: win.step * 2, ylabelStep: win.step * 2 })
  g.plot((x) => a * x + b, { a: 0, color: RED })
  g.plot((x) => x, { a: 0, color: BLUE, dashed: true })
  const pts: [number, number][] = [g.at(u0, 0)]
  let x = u0
  for (let i = 0; i < steps; i++) {
    const y = a * x + b
    pts.push(g.at(x, y), g.at(y, y))
    x = y
  }
  g.figure.curves!.push({ pts, color: '#3a2410', width: 1.4 })
  g.point('U', u0, 0, u(0), 's')
  g.figure.caption = `En rouge, y = ${fmt(a)}x + ${fmt(b)} ; en pointillés, y = x ; l'escalier construit ${u(1)}, ${u(2)}, …`
  return g.figure
}

/** Flocon de von Koch à l'étape n, cadré dans la figure. */
function kochFigure(level: number): Figure {
  const h3 = Math.sqrt(3) / 2
  // triangle parcouru dans le sens horaire (y vers le haut) : les pointes partent vers l'extérieur
  let pts: [number, number][] = [[0, 0], [0.5, h3], [1, 0], [0, 0]]
  for (let l = 0; l < level; l++) {
    const next: [number, number][] = []
    for (let i = 0; i < pts.length - 1; i++) {
      const [x1, y1] = pts[i], [x2, y2] = pts[i + 1]
      const dx = (x2 - x1) / 3, dy = (y2 - y1) / 3
      const a: [number, number] = [x1 + dx, y1 + dy], b: [number, number] = [x1 + 2 * dx, y1 + 2 * dy]
      // pointe : rotation de (dx ; dy) de +60° (vers la gauche du sens de parcours, donc l'extérieur)
      const c: [number, number] = [a[0] + dx * 0.5 - dy * h3, a[1] + dy * 0.5 + dx * h3]
      next.push([x1, y1], a, c, b)
    }
    next.push(pts[pts.length - 1])
    pts = next
  }
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1])
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys)
  const k = Math.min(280 / (maxX - minX), 190 / (maxY - minY))
  const ox = (320 - (maxX - minX) * k) / 2, oy = (220 - (maxY - minY) * k) / 2
  return {
    w: 320, h: 220, points: {},
    curves: [{ pts: pts.map(([x, y]) => [ox + (x - minX) * k, 220 - (oy + (y - minY) * k)] as [number, number]), color: RED, width: 1.6 }],
    caption: `Le flocon à l'étape ${level}.`,
  }
}

const age: Ladder = [
  [
    () => {
      const s = pick([1200, 1500, 1800, 2000]), r = pick([30, 40, 50, 60, 75, 100]), n = randInt(5, 15)
      return T('Le salaire du tailleur de pierre', num(`Un tailleur de pierre est payé ${s} écus la première année ; son salaire augmente ensuite de ${r} écus chaque année. Combien gagne-t-il au total sur ses ${n} premières années ?`, n * s + (r * n * (n - 1)) / 2,
        `Suite arithmétique : la ${n}e année, il gagne ${s} + ${n - 1} × ${r} = ${s + (n - 1) * r} écus. Total : ${n} × {${s} + ${s + (n - 1) * r}/2} = ${big(n * s + (r * n * (n - 1)) / 2)} écus.`))
    },
    () => {
      const a = randInt(2, 5), q = pick([2, 3]), k = randInt(4, 7)
      const v = a * q ** k
      return T('La rumeur du village', num(`Le jour 0, ${a} villageois connaissent une rumeur. Chaque jour, le nombre de personnes au courant est multiplié par ${q}. Combien de personnes la connaissent au jour ${k} ?`, v,
        `Suite géométrique de raison ${q} : ${a} × ${q}^${k} = ${big(v)}.`), seqGraph((n) => a * q ** n, k, { caption: 'Nombre de personnes au courant, jour après jour.' }))
    },
    () => {
      const n = randInt(8, 25)
      return T('La pyramide de boulets', num(`Au château, les boulets de canon sont empilés en un mur triangulaire : 1 boulet au sommet, 2 dans la rangée en dessous, 3 dans la suivante… La rangée du bas compte ${n} boulets. Combien de boulets au total ?`, (n * (n + 1)) / 2,
        `1 + 2 + … + ${n} = {${n} × ${n + 1}/2} = ${(n * (n + 1)) / 2}.`))
    },
    () => {
      const t = randInt(3, 8), d = pick([5, 4.9])
      const D = r6(d * t * t)
      return T('Le puits du château', num(`Une pierre tombe dans un puits : elle parcourt ${fmt(d)} m pendant la 1re seconde, ${fmt(3 * d)} m pendant la 2e, ${fmt(5 * d)} m pendant la 3e, et ainsi de suite (${fmt(2 * d)} m de plus à chaque seconde). Elle touche l'eau au bout de ${t} secondes. Quelle est la profondeur du puits (en m) ?`, D,
        `Somme arithmétique de ${t} termes : ${t} × {${fmt(d)} + ${fmt(r6(d * (2 * t - 1)))}/2} = ${fmt(D)} m.`))
    },
  ],
  [
    () => {
      const N = pick([1000, 10000, 100000, 1000000]), a = pick([1, 2, 3])
      let k = 0
      while (a * (2 ** k - 1) <= N) k++
      return T("L'échiquier du sage", numeric(`Un sage demande au roi ${a} grain${a > 1 ? 's' : ''} de blé sur la première case de l'échiquier, ${2 * a} sur la deuxième, ${4 * a} sur la troisième, en doublant à chaque case. Combien faut-il remplir de cases, au minimum, pour que le total dépasse ${big(N)} grains ?`, k,
        { explanation: `Sur k cases, le total est ${a === 1 ? '' : `${a} × `}(1 + 2 + … + 2^{k−1}) = ${a === 1 ? '' : `${a} × `}(2^k − 1). Sur ${k - 1} cases : ${big(a * (2 ** (k - 1) - 1))} ; sur ${k} cases : ${big(a * (2 ** k - 1))} > ${big(N)}. Il faut ${k} cases.` }))
    },
    () => {
      const s = pick([20, 25, 50]), a = 1 - s / 100, add = pick([100, 150, 200, 300])
      const l = add / (1 - a)
      const u0 = pick([100, 200, 1000, 1500].filter((x) => x !== l))
      return T('Le lac aux carpes', numeric(`Un lac contient ${u0} carpes. Chaque année, ${s} % des carpes sont pêchées, puis on en relâche ${add}. On note ${UN} le nombre de carpes au bout de n années. Vers quel nombre de carpes la population tend-elle ?`, l,
        { explanation: `${UN1} = ${fmt(a)}${UN} + ${add}. Le point fixe vérifie ℓ = ${fmt(a)}ℓ + ${add}, soit ℓ = {${add}/${fmt(1 - a)}} = ${fmt(l)} ; comme 0 < ${fmt(a)} < 1, ${UN} → ${fmt(l)}.` }),
      seqGraph((n) => l + (u0 - l) * a ** n, 10, { level: l, caption: 'Nombre de carpes (points) ; en pointillés, la valeur limite.' }))
    },
    () => {
      const h = pick([2, 4, 8, 16]) * pick([1, 3]), [p, d] = pick([[1, 2], [3, 4], [2, 3]] as const), k = randInt(2, 4)
      const v = h * (p / d) ** k
      const f = seqGraph((n) => h * (p / d) ** n, 6, { caption: 'Hauteur atteinte après chaque rebond.' })
      return T('La balle du jongleur', fraction(`Un jongleur lâche une balle de ${h} m de haut. À chaque rebond, la balle remonte aux {${p}/${d}} de sa hauteur précédente. À quelle hauteur (en m) remonte-t-elle après le ${k}e rebond ?`, h * p ** k, d ** k,
        { explanation: `Suite géométrique de raison {${p}/${d}} : ${h} × ({${p}/${d}})^${k} = ${fracText(h * p ** k, d ** k)} m${Number.isInteger(v) ? '' : ` ≈ ${fmt(Math.round(v * 100) / 100)} m`}.` }), f)
    },
    () => {
      const k = randInt(5, 12), s = pick([1, 2, 5])
      return T('La tour de Hanoï', num(`Pour déplacer une tour de n disques, un moine doit d'abord déplacer les n − 1 disques du dessus, puis le grand disque, puis de nouveau les n − 1 disques : hₙ₊₁ = 2hₙ + 1, avec h₁ = 1. Il déplace un disque ${s === 1 ? 'chaque seconde' : `toutes les ${s} secondes`}. Combien de secondes lui faut-il pour une tour de ${k} disques ?`, s * (2 ** k - 1),
        `hₙ + 1 double à chaque étape et h₁ + 1 = 2, donc hₙ = 2^n − 1 ; h${sb(k)} = ${big(2 ** k - 1)} déplacements, soit ${big(s * (2 ** k - 1))} s.`))
    },
  ],
  [
    () => {
      const g = pick([{ a: 0.8, m: 5 }, { a: 0.5, m: 2 }, { a: 0.75, m: 4 }]), l = g.m * randInt(20, 40) * 10, b = r6(l * (1 - g.a)), u0 = pick([100, 200])
      const st = niceStep(l * 1.25)
      const fig = cobweb(g.a, b, u0, 4, { xMax: Math.ceil((l * 1.25) / st) * st, yMax: Math.ceil((l * 1.25) / st) * st, step: st })
      return T('Les cerfs de la forêt royale', seqExpr(`Une forêt compte ${u0} cerfs. Chaque hiver, ${fmt((1 - g.a) * 100)} % des cerfs disparaissent, puis ${fmt(b)} cerfs naissent au printemps. On note ${UN} le nombre de cerfs après n années : ${UN1} = ${fmt(g.a)}${UN} + ${fmt(b)}. Exprime ${UN} en fonction de n.`,
        (n) => l + (u0 - l) * g.a ** n, `${fmt(l)} − ${geo(l - u0, g.a)}`,
        `Point fixe ℓ = {${fmt(b)}/${fmt(r6(1 - g.a))}} = ${fmt(l)}. ${VN} = ${UN} − ${fmt(l)} est géométrique de raison ${fmt(g.a)}, de premier terme ${fmt(u0 - l)} : ${UN} = ${fmt(l)} − ${geo(l - u0, g.a)}. La population tend vers ${fmt(l)}.`), fig)
    },
    () => {
      const s = pick([20, 25, 40, 50]), L = pick([10, 12, 15, 20, 24, 30])
      const d = r6((L * s) / 100)
      return T('Le remède de la guérisseuse', numeric(`Une guérisseuse administre chaque matin une même dose D (en mg) d'un remède ; d'un matin à l'autre, le corps en élimine ${s} %. La quantité présente juste après la n-ième prise vérifie ${UN1} = ${fmt(1 - s / 100)}${UN} + D. Pour être efficace, la quantité doit se stabiliser à ${L} mg. Quelle dose D faut-il donner ?`, d,
        { explanation: `La limite est ℓ = {D/${fmt(s / 100)}}. On veut ℓ = ${L}, donc D = ${L} × ${fmt(s / 100)} = ${fmt(d)} mg.` }))
    },
    () => {
      const k = randInt(2, 4), c = pick([27, 54, 81])
      const intro = `Un verrier découpe un vitrail en forme de flocon : il part d'un triangle équilatéral de côté ${c} cm (étape 0), puis à chaque étape remplace chaque côté par 4 côtés trois fois plus courts (on ajoute une « pointe » au milieu).`
      const kk = Math.min(k, 3)
      return T('Le flocon du verrier', pick([
        () => num(`${intro} Combien de côtés le flocon compte-t-il à l'étape ${k} ?`, 3 * 4 ** k,
          `Le nombre de côtés est multiplié par 4 à chaque étape : 3 × 4^${k} = ${big(3 * 4 ** k)}.`),
        () => num(`${intro} Quel est le périmètre (en cm) du flocon à l'étape ${kk} ?`, 3 * c * (4 / 3) ** kk,
          `Le périmètre est multiplié par {4/3} à chaque étape : 3 × ${c} × ({4/3})^${kk} = ${fmt(r6(3 * c * (4 / 3) ** kk))} cm.`),
        () => fraction(`${intro} Quelle est la longueur (en cm) d'un côté à l'étape ${k} ?`, c, 3 ** k,
          { explanation: `La longueur d'un côté est divisée par 3 à chaque étape : {${c}/3^${k}} = ${fracText(c, 3 ** k)} cm.` }),
      ])(), kochFigure(kk))
    },
    () => {
      const t = pick([2, 4, 5]), D = pick([100, 200, 300])
      const a = 1 + t / 100
      const l = r6((100 * D) / t)
      const u0 = pick([1000, 2000, 3000, 6000, 8000, 12000].filter((x) => x !== l))
      const ans = u0 > l ? Infinity : u0 < l ? -Infinity : l
      return T("Le coffre de l'usurier", lim(`Un usurier place ${u0} écus à ${t} % par an ; à la fin de chaque année, après les intérêts, il retire ${D} écus. On note ${UN} son capital après n années : ${UN1} = ${fmt(a)}${UN} − ${D}. Quelle est la limite de (${UN}) (on prolonge le modèle même si le capital devenait négatif) ?`, ans,
        `Point fixe ℓ = {${D}/${fmt(r6(a - 1))}} = ${fmt(l)}. ${UN} − ${fmt(l)} = (${u0} − ${fmt(l)}) × ${fmt(a)}^n, avec ${fmt(a)}^n → +∞ et ${u0} − ${fmt(l)} ${u0 > l ? '> 0' : '< 0'} : ${UN} → ${limText(ans)}.`))
    },
  ],
]

export const CONTENT: SubjectContent | null = { tiers, upgrades, age }
