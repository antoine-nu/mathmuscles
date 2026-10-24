// Problèmes d'amélioration (5e) : 3 niveaux croissants par maison.
// Un cran au-dessus du palier 5 de l'entraînement : généralisation de la notion, notion déguisée dans un énoncé.
import {
  F, expression, fmt, fraction, gcd, numeric, par, pick, poly, randInt, shuffle, term, withMeta,
  type Exercise, type Ladder, type Maker,
} from './utils'
import { fitPoints, parallelsFigure, triangleFigure, triangleFromAngles, type FigAngle, type FigSegment, type Figure, type LabelPos } from './figure'
import { PRENOMS, cap, deuxPrenoms, prenom } from './contexts'

// ── Aides locales ───────────────────────────────────────────────────────
const sum = (a: number[]) => a.reduce((s, v) => s + v, 0)
/** Vrai si n a au plus d décimales. */
const dec = (n: number, d = 2) => Math.abs(n * 10 ** d - Math.round(n * 10 ** d)) < 1e-6
/** Montant en euros : « 12 » ou « 2,40 ». */
const eur = (n: number) => {
  const r = Math.round(n * 100) / 100
  return Number.isInteger(r) ? fmt(r) : r.toFixed(2).replace('.', ',').replace('-', '−')
}
/** « de Léa », « d'Inès ». */
const deP = (n: string) => (/^[AEIOUYÉÈÂÎ]/.test(n) ? `d'${n}` : `de ${n}`)
/** n prénoms distincts. */
const prenoms = (n: number): string[] => shuffle([...PRENOMS]).slice(0, n)
/** Angle à trois lettres, accent sur le sommet : AÔB. */
const ang = (a: string, o: string, b: string) => `${a}${o}̂${b}`
/** Angle à une lettre : Â. */
const hat = (v: string) => `${v}̂`
/** Fraction précédée de son article : « 1/3 », « la moitié », « les 2/5 ». */
const les = (n: number, d: number) => (n === 1 ? (d === 2 ? 'la moitié' : F(1, d)) : `les ${F(n, d)}`)

/** Relance le tirage tant qu'il est rejeté (null). */
function retry(draw: () => Exercise | null): Exercise {
  for (let i = 0; i < 5000; i++) {
    const ex = draw()
    if (ex) return ex
  }
  throw new Error('tirage impossible')
}
/** Modèle de problème titré (le tirage peut fixer lui-même son titre). */
const model = (title: string, draw: () => Exercise | null): Maker => () => {
  const ex = retry(draw)
  return withMeta(ex, { title: ex.title ?? title })
}

/** Figure libre : points en coordonnées mathématiques, certains cachés, positions de noms imposées. */
function freeFig(
  raw: Record<string, [number, number]>,
  opts: { hide?: string[]; pos?: Partial<Record<string, LabelPos>>; segments?: FigSegment[]; angles?: FigAngle[]; polygons?: Figure['polygons']; caption?: string },
): Figure {
  const pts = fitPoints(raw)
  for (const k of opts.hide ?? []) pts[k] = { ...pts[k], hidden: true, label: '' }
  for (const [k, p] of Object.entries(opts.pos ?? {})) if (p) pts[k] = { ...pts[k], pos: p }
  return { points: pts, segments: opts.segments, angles: opts.angles, polygons: opts.polygons, caption: opts.caption }
}
const RED = '#b8362f'
const rad = (d: number) => (d * Math.PI) / 180
const deg = (r: number) => (r * 180) / Math.PI

// ── Opérations écrites (priorités) ──────────────────────────────────────
type Op = '+' | '−' | '×'
const applyOp = (x: number, o: Op, y: number) => (o === '+' ? x + y : o === '−' ? x - y : x * y)
/** Les termes après avoir effectué les multiplications. */
function prioTerms(nums: number[], ops: Op[]) {
  const terms: number[] = [nums[0]]
  const signs: Op[] = []
  ops.forEach((o, i) => {
    if (o === '×') terms[terms.length - 1] *= nums[i + 1]
    else {
      signs.push(o)
      terms.push(nums[i + 1])
    }
  })
  return { terms, signs }
}
function evalPrio(nums: number[], ops: Op[]): number {
  const { terms, signs } = prioTerms(nums, ops)
  return terms.slice(1).reduce((acc, t, i) => applyOp(acc, signs[i], t), terms[0])
}
const evalLeft = (nums: number[], ops: Op[]) => ops.reduce((acc, o, i) => applyOp(acc, o, nums[i + 1]), nums[0])
const opsText = (nums: number[], ops: Op[]) => nums.map((n, i) => (i ? ` ${ops[i - 1]} ${n}` : `${n}`)).join('')

// ═════════════════════════════ 5e-prio ═════════════════════════════════
const prio: Ladder = [
  [
    model('Le calcul astucieux', () => {
      const a = randInt(12, 79)
      const v = randInt(0, 2)
      if (v === 0) {
        const b = randInt(11, 89), c = 100 - b
        return numeric(`Calcule de tête, sans poser d'opération : ${a} × ${b} + ${a} × ${c}`, a * 100, {
          explanation: `${a} est un facteur commun : ${a} × (${b} + ${c}) = ${a} × 100 = ${a * 100}.`,
        })
      }
      if (v === 1) {
        const c = randInt(2, 39), b = 100 + c
        return numeric(`Calcule de tête, sans poser d'opération : ${b} × ${a} − ${c} × ${a}`, a * 100, {
          explanation: `${a} est un facteur commun : (${b} − ${c}) × ${a} = 100 × ${a} = ${a * 100}.`,
        })
      }
      const b10 = randInt(11, 89)
      if (b10 % 10 === 0) return null
      const b = b10 / 10, c = (100 - b10) / 10
      return numeric(`Calcule de tête, sans poser d'opération : ${fmt(b)} × ${a} + ${a} × ${fmt(c)}`, a * 10, {
        explanation: `${a} est un facteur commun : ${a} × (${fmt(b)} + ${fmt(c)}) = ${a} × 10 = ${a * 10}.`,
      })
    }),
    model('La monnaie', () => {
      const [it1, it2, r1, r2] = pick([
        ['cahiers', 'stylos', [150, 400], [50, 180]],
        ['croissants', 'pains au chocolat', [90, 140], [100, 160]],
        ['paquets de cartes', 'pochettes de stickers', [300, 650], [120, 250]],
        ['bouteilles d’eau', 'barres de céréales', [60, 150], [80, 200]],
        ['places de cinéma', 'boissons', [650, 1100], [250, 450]],
        ['balles de tennis', 'bandeaux', [250, 400], [350, 700]],
      ] as const)
      const n1 = randInt(2, 5), n2 = randInt(2, 6)
      const c1 = 5 * randInt(r1[0] / 5, r1[1] / 5), c2 = 5 * randInt(r2[0] / 5, r2[1] / 5)
      const tot = n1 * c1 + n2 * c2
      const billet = [10, 20, 50, 100].find((b) => b * 100 > tot + 100)
      if (!billet || c1 % 100 === 0 || c2 % 100 === 0) return null
      const rend = billet * 100 - tot
      const p = prenom()
      return numeric(`${p} achète ${n1} ${it1} à ${eur(c1 / 100)} € l'unité et ${n2} ${it2} à ${eur(c2 / 100)} € l'unité, puis paie avec un billet de ${billet} €. Combien doit-on lui rendre (en €) ?`, rend / 100, {
        explanation: `${billet} − (${n1} × ${eur(c1 / 100)} + ${n2} × ${eur(c2 / 100)}) = ${billet} − (${eur((n1 * c1) / 100)} + ${eur((n2 * c2) / 100)}) = ${billet} − ${eur(tot / 100)} = ${eur(rend / 100)} €.`,
      })
    }),
    model('La sortie en groupe', () => {
      const where = pick(['au stade', 'au parc d’attractions', 'au musée', 'à la patinoire', 'au zoo', 'au festival'])
      const na = randInt(2, 6), nc = randInt(3, 9), pa = randInt(9, 25), pc = randInt(4, pa - 3)
      const f = randInt(2, 4), r = 5 * randInt(2, 12)
      const tot = na * pa + nc * pc - r
      if (tot % f !== 0 || tot <= 0) return null
      const nb = ['', '', 'Deux', 'Trois', 'Quatre'][f]
      return numeric(`${nb} familles vont ensemble ${where} : ${na} adultes à ${pa} € l'entrée et ${nc} enfants à ${pc} € l'entrée. Le groupe obtient une réduction de ${r} € sur le total, et la dépense est partagée équitablement entre les familles. Combien paie chaque famille (en €) ?`, tot / f, {
        explanation: `(${na} × ${pa} + ${nc} × ${pc} − ${r}) ÷ ${f} = (${na * pa} + ${nc * pc} − ${r}) ÷ ${f} = ${tot} ÷ ${f} = ${tot / f} €.`,
      })
    }),
    model('La phrase à traduire', () => {
      const v = randInt(0, 3)
      if (v === 0) {
        const q = randInt(2, 9), d = randInt(2, 9), s = q * d, a = randInt(1, s - 1), b = s - a, D = randInt(2, 20), C = D + d
        return numeric(`Calcule le quotient de la somme de ${a} et ${b} par la différence entre ${C} et ${D}.`, q, {
          explanation: `(${a} + ${b}) ÷ (${C} − ${D}) = ${s} ÷ ${d} = ${q}.`,
        })
      }
      if (v === 1) {
        const a = randInt(3, 20), b = randInt(3, 20), d = randInt(2, 9), D = randInt(2, 25), C = D + d
        return numeric(`Calcule le produit de la somme de ${a} et ${b} par la différence entre ${C} et ${D}.`, (a + b) * d, {
          explanation: `(${a} + ${b}) × (${C} − ${D}) = ${a + b} × ${d} = ${(a + b) * d}.`,
        })
      }
      if (v === 2) {
        const a = randInt(3, 12), b = randInt(3, 12), d = randInt(2, 9), k = randInt(2, 9), c = d * k
        if (a * b <= k) return null
        return numeric(`Calcule la différence entre le produit de ${a} par ${b} et le quotient de ${c} par ${d}.`, a * b - k, {
          explanation: `${a} × ${b} − ${c} ÷ ${d} = ${a * b} − ${k} = ${a * b - k}.`,
        })
      }
      const a = randInt(4, 20), b = 4 * randInt(2, 15), c = randInt(2, 15)
      const v3 = 3 * a + b / 4 - 2 * c
      if (v3 <= 0) return null
      return numeric(`Calcule la somme du triple de ${a} et du quart de ${b}, puis retranche le double de ${c}.`, v3, {
        explanation: `3 × ${a} + ${b} ÷ 4 − 2 × ${c} = ${3 * a} + ${b / 4} − ${2 * c} = ${v3}.`,
      })
    }),
    model('La terrasse', () => {
      const L = randInt(8, 15), l = randInt(6, 12), s = randInt(2, Math.min(l - 3, 5)), colors = randInt(2, 4)
      const rest = L * l - s * s
      if (rest % colors !== 0) return null
      return numeric(`Une terrasse rectangulaire est pavée de ${L} rangées de ${l} dalles. Au centre, on retire un carré de ${s} dalles sur ${s} pour planter un arbre. Les dalles restantes sont peintes en ${colors} couleurs, avec autant de dalles de chaque couleur. Combien y a-t-il de dalles de chaque couleur ?`, rest / colors, {
        explanation: `(${L} × ${l} − ${s} × ${s}) ÷ ${colors} = (${L * l} − ${s * s}) ÷ ${colors} = ${rest} ÷ ${colors} = ${rest / colors}.`,
      })
    }),
  ],
  [
    model('Le nombre pensé', () => {
      type Step = { t: '+' | '-' | '*' | '/'; v: number }
      const x = randInt(2, 15), k = randInt(2, 6), m = randInt(2, 5), a = randInt(2, 15), b = randInt(2, 15)
      const plan: Step[] = pick([
        [{ t: '*', v: k }, { t: '+', v: a }, { t: '*', v: m }],
        [{ t: '+', v: a }, { t: '*', v: k }, { t: '-', v: b }],
        [{ t: '*', v: k }, { t: '-', v: a }, { t: '/', v: m }],
        [{ t: '-', v: a }, { t: '*', v: k }, { t: '+', v: b }],
        [{ t: '+', v: a }, { t: '/', v: m }, { t: '*', v: k }],
      ] as Step[][])
      const vals = [x]
      for (const s of plan) {
        const c = vals[vals.length - 1]
        const n = s.t === '+' ? c + s.v : s.t === '-' ? c - s.v : s.t === '*' ? c * s.v : c / s.v
        if (!Number.isInteger(n) || n <= 0) return null
        vals.push(n)
      }
      const said = plan.map((s, i) => {
        if (s.t === '+') return i ? `j'ajoute ${s.v}` : `je lui ajoute ${s.v}`
        if (s.t === '-') return i ? `je retire ${s.v}` : `je lui retire ${s.v}`
        if (s.t === '*') return i ? `je multiplie le résultat par ${s.v}` : `je le multiplie par ${s.v}`
        return i ? `je divise le résultat par ${s.v}` : `je le divise par ${s.v}`
      })
      const inv = { '+': '−', '-': '+', '*': '÷', '/': '×' }
      const back = plan.map((s, i) => `${vals[i + 1]} ${inv[s.t]} ${s.v} = ${vals[i]}`).reverse()
      const res = vals[vals.length - 1]
      return numeric(`${prenom()} dit : « Je pense à un nombre. ${cap(said.join(', '))}, et j'obtiens ${res}. » Quel est le nombre pensé ?`, x, {
        explanation: `On remonte le programme avec les opérations inverses : ${back.join(' ; ')}. Le nombre pensé est ${x}.`,
      })
    }),
    model('Les parenthèses magiques', () => {
      const nums = Array.from({ length: 4 }, () => randInt(2, 9))
      const ops = Array.from({ length: 3 }, () => pick(['+', '−', '×'] as Op[]))
      if (!ops.includes('×') || ops.every((o) => o === ops[0])) return null
      const [a, b, c, d] = nums
      const [o1, o2, o3] = ops
      const forms: [number, string][] = [
        [applyOp(applyOp(applyOp(a, o1, b), o2, c), o3, d), `((${a} ${o1} ${b}) ${o2} ${c}) ${o3} ${d}`],
        [applyOp(applyOp(a, o1, applyOp(b, o2, c)), o3, d), `(${a} ${o1} (${b} ${o2} ${c})) ${o3} ${d}`],
        [applyOp(applyOp(a, o1, b), o2, applyOp(c, o3, d)), `(${a} ${o1} ${b}) ${o2} (${c} ${o3} ${d})`],
        [applyOp(a, o1, applyOp(applyOp(b, o2, c), o3, d)), `${a} ${o1} ((${b} ${o2} ${c}) ${o3} ${d})`],
        [applyOp(a, o1, applyOp(b, o2, applyOp(c, o3, d))), `${a} ${o1} (${b} ${o2} (${c} ${o3} ${d}))`],
      ]
      const best = forms.reduce((mx, f) => (f[0] > mx[0] ? f : mx))
      const plain = evalPrio(nums, ops)
      if (best[0] <= plain) return null
      return numeric(`Sans changer l'ordre des nombres ni les opérations, on peut ajouter des parenthèses (autant qu'on veut) dans le calcul ${opsText(nums, ops)}. Quel est le plus grand résultat que l'on peut obtenir ?`, best[0], {
        explanation: `Sans parenthèses, les priorités donnent ${fmt(plain)}. En essayant tous les placements, le meilleur est ${best[1]} = ${fmt(best[0])}.`,
      })
    }),
    model('Le grand rangement', () => {
      const ctx = pick([
        { intro: 'Un entrepôt contient', g1: 'palettes', g2: 'cartons', u: 'bouteilles', box: 'packs', verb: 'On range toutes les bouteilles' },
        { intro: 'Un maraîcher possède', g1: 'champs', g2: 'rangées', u: 'choux', box: 'cagettes', verb: 'Il range tous ses choux' },
        { intro: 'Une bibliothèque possède', g1: 'armoires', g2: 'étagères', u: 'livres', box: 'cartons', verb: 'Pour un déménagement, on range tous les livres' },
        { intro: 'Un verger compte', g1: 'parcelles', g2: 'rangées', u: 'pommiers', box: 'lots', verb: 'Le propriétaire vend tous les pommiers' },
      ])
      const f1 = randInt(2, 5), r1 = randInt(6, 15), c1 = randInt(8, 24), f2 = randInt(2, 4), r2 = randInt(5, 12), c2 = randInt(8, 24)
      const q = pick([6, 8, 10, 12, 15, 24])
      const tot = f1 * r1 * c1 + f2 * r2 * c2
      if (tot % q !== 0 || c1 === c2) return null
      return numeric(`${ctx.intro} ${f1} ${ctx.g1} de ${r1} ${ctx.g2} de ${c1} ${ctx.u}, et ${f2} ${ctx.g1} de ${r2} ${ctx.g2} de ${c2} ${ctx.u}. ${ctx.verb} par ${ctx.box} de ${q}. Combien de ${ctx.box} obtient-on ?`, tot / q, {
        explanation: `(${f1} × ${r1} × ${c1} + ${f2} × ${r2} × ${c2}) ÷ ${q} = (${f1 * r1 * c1} + ${f2 * r2 * c2}) ÷ ${q} = ${tot} ÷ ${q} = ${tot / q}.`,
      })
    }),
    model('Le compte à rebours', () => {
      if (Math.random() < 0.5) {
        const d = randInt(1, 4), h = randInt(1, 23), m = randInt(1, 59)
        const s = d * 86400 + h * 3600 + m * 60
        return numeric(`Le compte à rebours avant le lancement d'une fusée affiche ${d} j ${h} h ${m} min. Combien de secondes cela représente-t-il ?`, s, {
          explanation: `${d} × 24 × 3600 + ${h} × 3600 + ${m} × 60 = ${d * 86400} + ${h * 3600} + ${m * 60} = ${s}.`,
        })
      }
      const w = randInt(1, 3), d = randInt(1, 6), h = randInt(1, 23)
      const mn = w * 7 * 24 * 60 + d * 24 * 60 + h * 60
      return numeric(`Dans un jeu vidéo, le prochain événement commence dans ${w} semaine${w > 1 ? 's' : ''}, ${d} jour${d > 1 ? 's' : ''} et ${h} heure${h > 1 ? 's' : ''}. Combien de minutes cela représente-t-il ?`, mn, {
        explanation: `${w} × 7 × 24 × 60 + ${d} × 24 × 60 + ${h} × 60 = ${w * 10080} + ${d * 1440} + ${h * 60} = ${mn}.`,
      })
    }),
    model('Le score final', () => {
      const g = randInt(20, 60), pg = pick([10, 15, 20, 25]), c = randInt(2, 8), pc = pick([30, 40, 50, 75]), bonus = 10 * randInt(5, 30), mult = randInt(2, 3)
      if (g * pg <= c * pc) return null
      const s = (g * pg - c * pc) * mult + bonus
      return numeric(`Dans un jeu de plateforme, chaque gemme ramassée rapporte ${pg} points et chaque chute en fait perdre ${pc}. En fin de niveau, le score est multiplié par ${mult} (bonus de vitesse), puis on ajoute ${bonus} points de bonus de vie. ${prenom()} a ramassé ${g} gemmes et a chuté ${c} fois. Quel est son score final ?`, s, {
        explanation: `(${g} × ${pg} − ${c} × ${pc}) × ${mult} + ${bonus} = (${g * pg} − ${c * pc}) × ${mult} + ${bonus} = ${(g * pg - c * pc) * mult} + ${bonus} = ${s}.`,
      })
    }),
  ],
  [
    model('La case vide', () => {
      const x = randInt(2, 14), k = randInt(2, 6), m = randInt(2, 5), a = randInt(1, 12), b = randInt(1, 15), d = randInt(2, 6)
      const v = randInt(0, 3)
      if (v === 0) {
        const u = m * (x + a) - b
        if (u <= 0) return null
        const R = k * u
        return numeric(`Quel nombre faut-il écrire à la place des pointillés pour que l'égalité soit vraie ? ${k} × [${m} × (… + ${a}) − ${b}] = ${R}`, x, {
          explanation: `On remonte : ${R} ÷ ${k} = ${u} ; ${u} + ${b} = ${u + b} ; ${u + b} ÷ ${m} = ${x + a} ; ${x + a} − ${a} = ${x}.`,
        })
      }
      if (v === 1) {
        const t = x * k - a
        if (t <= 0 || t % d !== 0) return null
        const R = t / d + b
        return numeric(`Quel nombre faut-il écrire à la place des pointillés pour que l'égalité soit vraie ? (… × ${k} − ${a}) ÷ ${d} + ${b} = ${R}`, x, {
          explanation: `On remonte : ${R} − ${b} = ${t / d} ; ${t / d} × ${d} = ${t} ; ${t} + ${a} = ${x * k} ; ${x * k} ÷ ${k} = ${x}.`,
        })
      }
      if (v === 2) {
        const xx = x + a
        const R0 = k * (xx - a) + randInt(5, 60), s = R0 - k * (xx - a)
        return numeric(`Quel nombre faut-il écrire à la place des pointillés pour que l'égalité soit vraie ? ${R0} − ${k} × (… − ${a}) = ${s}`, xx, {
          explanation: `${k} × (… − ${a}) doit valoir ${R0} − ${s} = ${R0 - s}, donc … − ${a} = ${R0 - s} ÷ ${k} = ${xx - a}, et … = ${xx}.`,
        })
      }
      const R = m * (k * x + a) - b
      return numeric(`Quel nombre faut-il écrire à la place des pointillés pour que l'égalité soit vraie ? ${m} × (${k} × … + ${a}) − ${b} = ${R}`, x, {
        explanation: `On remonte : ${R} + ${b} = ${R + b} ; ${R + b} ÷ ${m} = ${k * x + a} ; ${k * x + a} − ${a} = ${k * x} ; ${k * x} ÷ ${k} = ${x}.`,
      })
    }),
    model('L’erreur de calcul', () => {
      const nums = Array.from({ length: 5 }, () => randInt(2, 9))
      const ops = Array.from({ length: 4 }, () => pick(['+', '−', '×'] as Op[]))
      if (ops.filter((o) => o === '×').length < 2 || ops.every((o) => o === '×')) return null
      const left = evalLeft(nums, ops), right = evalPrio(nums, ops)
      if (left === right) return null
      const p = prenom()
      const { terms, signs } = prioTerms(nums, ops)
      const detail = terms.map((t, i) => (i ? ` ${signs[i - 1]} ${t}` : `${t}`)).join('')
      return withMeta(numeric(`${p} calcule ${opsText(nums, ops)} en effectuant les opérations dans l'ordre, de gauche à droite, sans respecter les priorités. Quel est l'écart entre son résultat et le bon résultat ?`, Math.abs(left - right), {
        explanation: `De gauche à droite, ${p} trouve ${fmt(left)}. Avec les priorités : ${detail} = ${fmt(right)}. L'écart vaut ${Math.abs(left - right)}.`,
      }), { title: `L’erreur ${deP(p).replace("d'", 'd’')}` })
    }),
    model('Le budget du tournoi', () => {
      const sport = pick(['handball', 'basket', 'volley', 'rugby', 'football', 'judo'])
      const n = randInt(12, 24), s = randInt(8, 25), N = randInt(1, 3), h = randInt(18, 45), M = randInt(3, 7), rc = 50 * randInt(13, 30), sv = randInt(5, 20)
      const per = s + N * h + (M * rc) / 100 - sv
      if (rc % 100 === 0) return null
      return numeric(`Un club de ${sport} de ${n} joueurs part en tournoi. Le car coûte ${s * n} €, à partager entre les joueurs. Chacun paie aussi ${N === 1 ? 'une nuit' : `${N} nuits`} d'hôtel à ${h} € la nuit et ${M} repas à ${eur(rc / 100)} € le repas. La mairie verse une subvention de ${sv * n} €, répartie équitablement entre les joueurs. Combien chaque joueur doit-il payer (en €) ?`, per, {
        explanation: `${s * n} ÷ ${n} + ${N} × ${h} + ${M} × ${eur(rc / 100)} − ${sv * n} ÷ ${n} = ${s} + ${N * h} + ${eur((M * rc) / 100)} − ${sv} = ${eur(per)} €.`,
      })
    }),
    model('Les œufs du pâtissier', () => {
      const q = pick([6, 12, 30]), boxes = q === 30 ? randInt(2, 5) : randInt(5, 15), E = boxes * q
      const ge = randInt(3, 5), ef = pick([2, 3].filter((e) => e !== ge))
      const g = randInt(3, Math.floor(E / ge) - 3)
      const rest = E - g * ge
      if (rest < 2 * ef) return null
      const ans = Math.floor(rest / ef), left = rest % ef
      return numeric(`Un pâtissier dispose de ${boxes} boîtes de ${q} œufs. Chaque gâteau demande ${ge} œufs et chaque flan ${ef} œufs. Il prépare d'abord ${g} gâteaux. Combien de flans peut-il préparer, au maximum, avec les œufs qui restent ?`, ans, {
        explanation: `${boxes} × ${q} − ${g} × ${ge} = ${E} − ${g * ge} = ${rest} œufs restants. ${rest} = ${ef} × ${ans}${left ? ` + ${left}` : ''} : il peut faire ${ans} flans${left ? ` (il restera ${left} œuf${left > 1 ? 's' : ''})` : ''}.`,
      })
    }),
    model('Le bon abonnement', () => {
      const ctx = pick(['à la piscine', 'à la salle d’escalade', 'au cinéma', 'au bowling', 'au club de tir à l’arc', 'à la patinoire'])
      const u = randInt(2, 6), v = u + randInt(2, 5), f = randInt(15, 60)
      const g = v - u, n = Math.floor(f / g) + 1
      const q = f / g
      return numeric(`${cap(ctx)}, deux tarifs sont proposés. Tarif A : un abonnement de ${f} € pour l'année, puis ${u} € par séance. Tarif B : ${v} € par séance, sans abonnement. À partir de combien de séances le tarif A devient-il strictement moins cher que le tarif B ?`, n, {
        explanation: `Avec A, chaque séance coûte ${g} € de moins qu'avec B : il faut rattraper les ${f} € d'abonnement. ${Number.isInteger(q) ? `${f} ÷ ${g} = ${q} : à ${q} séances, les deux tarifs sont égaux` : `${f} ÷ ${g} ≈ ${fmt(Math.round(q * 10) / 10)}`}, donc il faut ${n} séances (A : ${f} + ${n} × ${u} = ${f + u * n} € ; B : ${n} × ${v} = ${v * n} €).`,
      })
    }),
  ],
]

// ═════════════════════════════ 5e-rel ══════════════════════════════════
/** Écrit une suite d'additions de relatifs : « −3 + 5 − 7 ». */
const chain = (vals: number[]) => vals.map((v, i) => (i ? (v < 0 ? ` − ${-v}` : ` + ${v}`) : fmt(v))).join('')
/** Somme lisible de relatifs avec parenthèses : « −3 + (−5) + 2 ». */
const plusChain = (vals: number[]) => vals.map((v, i) => (i ? ` + ${par(v)}` : fmt(v))).join('')

const rel: Ladder = [
  [
    model('Le relevé de compte', () => {
      const pool = shuffle([
        { l: 'paiement d’un baby-sitting', s: 1 }, { l: 'achat d’un jeu vidéo', s: -1 }, { l: 'courses', s: -1 },
        { l: 'remboursement d’un ami', s: 1 }, { l: 'abonnement musical', s: -1 }, { l: 'vente d’un vieux vélo', s: 1 },
        { l: 'place de concert', s: -1 }, { l: 'cadeau d’anniversaire', s: 1 }, { l: 'facture de téléphone', s: -1 },
      ]).slice(0, 4)
      if (!pool.some((o) => o.s > 0) || !pool.some((o) => o.s < 0)) return null
      const ops = pool.map((o) => ({ ...o, v: o.s * (o.s > 0 ? randInt(20, 150) : randInt(10, 90)) }))
      const start = -randInt(10, 80)
      const fin = start + sum(ops.map((o) => o.v))
      if (fin === 0) return null
      return numeric(`Le compte en banque ${deP(prenom())} affiche ${fmt(start)} €. Ensuite, dans l'ordre : ${ops.map((o) => `${o.l} (${o.v > 0 ? '+' : '−'}${Math.abs(o.v)} €)`).join(', ')}. Quel est le nouveau solde du compte (en €) ?`, fin, {
        explanation: `${chain([start, ...ops.map((o) => o.v)])} = ${fmt(fin)} €.`,
      })
    }),
    model('Du fond au sommet', () => {
      if (Math.random() < 0.5) {
        const a = 10 * randInt(20, 90), b = 10 * randInt(30, 180), c = 10 * randInt(5, a / 10 - 5)
        return numeric(`Le fond d'une fosse marine se trouve à l'altitude −${a} m. Juste à côté, une île volcanique culmine à ${b} m. Un robot sous-marin part du fond de la fosse et remonte de ${c} m. Quelle distance verticale le sépare alors du sommet de l'île (en m) ?`, a + b - c, {
          explanation: `Le robot est à −${a} + ${c} = ${fmt(c - a)} m. Distance au sommet : ${b} − ${par(c - a)} = ${a + b - c} m.`,
        })
      }
      const A = 10 * randInt(20, 80), D = 10 * randInt(A / 10 + 5, A / 10 + 60), U = 10 * randInt(3, (D - A) / 10 - 1)
      return numeric(`L'entrée d'une mine se trouve à ${A} m d'altitude. La cage d'ascenseur descend de ${D} m, puis remonte de ${U} m pour atteindre une galerie. À quelle altitude se trouve cette galerie (en m) ?`, A - D + U, {
        explanation: `${A} − ${D} + ${U} = ${fmt(A - D + U)} m : la galerie est sous le niveau de la mer.`,
      })
    }),
    model('L’amplitude thermique', () => {
      const cities = shuffle(['Oslo', 'Moscou', 'Montréal', 'Reykjavik', 'Helsinki', 'Québec', 'Anchorage', 'Oulan-Bator', 'Stockholm']).slice(0, 4)
      const data = cities.map((name) => {
        const lo = randInt(-25, 2)
        return { name, lo, hi: lo + randInt(3, 18) }
      })
      if (data.some((d) => d.hi > 12)) return null
      const amps = data.map((d) => d.hi - d.lo)
      const best = Math.max(...amps)
      if (amps.filter((x) => x === best).length > 1 || data.filter((d) => d.hi > 0).length === 0) return null
      return numeric(`Voici les températures minimale et maximale relevées un même jour d'hiver : ${data.map((d) => `${d.name} : de ${fmt(d.lo)} °C à ${fmt(d.hi)} °C`).join(' ; ')}. Quelle est la plus grande amplitude thermique de la journée (écart entre la maximale et la minimale), en °C ?`, best, {
        explanation: `Amplitudes : ${data.map((d, i) => `${d.name} ${fmt(d.hi)} − ${par(d.lo)} = ${amps[i]}`).join(' ; ')}. La plus grande vaut ${best} °C.`,
      })
    }),
    model('La pyramide de nombres', () => {
      const b = Array.from({ length: 4 }, () => randInt(-15, 15))
      if (b.filter((v) => v < 0).length < 2 || b.includes(0)) return null
      const r2 = [b[0] + b[1], b[1] + b[2], b[2] + b[3]], r3 = [r2[0] + r2[1], r2[1] + r2[2]], top = r3[0] + r3[1]
      if ([...r2, ...r3].includes(0)) return null
      return numeric(`Dans une pyramide de nombres, chaque brique contient la somme des deux briques sur lesquelles elle repose. La rangée du bas contient, de gauche à droite : ${b.map(fmt).join(' ; ')}. Quel nombre est inscrit tout en haut ?`, top, {
        explanation: `2ᵉ rangée : ${r2.map(fmt).join(' ; ')}. 3ᵉ rangée : ${r3.map(fmt).join(' ; ')}. Sommet : ${fmt(r3[0])} + ${par(r3[1])} = ${fmt(top)}.`,
      })
    }),
    model('L’ascenseur', () => {
      const start = randInt(-4, 2)
      const moves = Array.from({ length: 5 }, (_, i) => (i % 2 === 0 ? 1 : -1) * randInt(2, 9) * (Math.random() < 0.5 ? 1 : -1))
      const path = [start]
      for (const m of moves) path.push(path[path.length - 1] + m)
      const lo = Math.min(...path)
      if (lo < -6 || Math.max(...path) > 15 || lo === start || lo === path[5] || path.filter((v) => v === lo).length > 1) return null
      const said = moves.map((m) => (m > 0 ? `monte de ${m} étages` : `descend de ${-m} étages`))
      return numeric(`Un ascenseur part de l'étage ${fmt(start)} (les étages négatifs sont les sous-sols). Successivement, il ${said.join(', ')}. Quel est l'étage le plus bas atteint pendant ce trajet ?`, lo, {
        explanation: `Étages successifs : ${path.map(fmt).join(' ; ')}. Le plus bas est ${fmt(lo)}.`,
      })
    }),
  ],
  [
    model('La brique manquante', () => {
      const a = randInt(-15, 15), b = randInt(-15, 15), c = randInt(-15, 15)
      if ([a, b, c].filter((v) => v < 0).length < 1 || [a, b, c].includes(0)) return null
      const T = a + 2 * b + c
      const right = b + c, left = T - right
      return numeric(`Dans une pyramide de nombres, chaque brique contient la somme des deux briques sur lesquelles elle repose. La rangée du bas contient, de gauche à droite : ? ; ${fmt(b)} ; ${fmt(c)}. Le sommet vaut ${fmt(T)}. Quel nombre manque en bas à gauche ?`, a, {
        explanation: `Brique du milieu à droite : ${fmt(b)} + ${par(c)} = ${fmt(right)}. Celle de gauche vaut ${fmt(T)} − ${par(right)} = ${fmt(left)}. La brique manquante vaut ${fmt(left)} − ${par(b)} = ${fmt(a)}.`,
      })
    }),
    model('Dettes et créances', () => {
      const names = prenoms(3)
      const pairs: [number, number][] = shuffle([[0, 1], [1, 0], [0, 2], [2, 0], [1, 2], [2, 1]] as [number, number][]).slice(0, 4)
      const X = randInt(0, 2)
      if (pairs.filter(([f, t]) => f === X || t === X).length < 3) return null
      const debts = pairs.map(([f, t]) => ({ f, t, v: randInt(3, 25) }))
      const got = debts.filter((d) => d.t === X), owe = debts.filter((d) => d.f === X)
      if (!got.length || !owe.length) return null
      const bil = sum(got.map((d) => d.v)) - sum(owe.map((d) => d.v))
      if (bil === 0) return null
      return numeric(`${cap(debts.map((d) => `${names[d.f]} doit ${d.v} € à ${names[d.t]}`).join(', '))}. Quand toutes les dettes seront remboursées, quel sera le bilan ${deP(names[X])} en euros (positif si ${names[X]} récupère de l'argent au total, négatif si ${names[X]} en perd) ?`, bil, {
        explanation: `${names[X]} reçoit ${got.map((d) => d.v).join(' + ')} € et rend ${owe.map((d) => d.v).join(' + ')} € : ${chain([...got.map((d) => d.v), ...owe.map((d) => -d.v)])} = ${fmt(bil)} €.`,
      })
    }),
    model('Retour en arrière', () => {
      const vars = Array.from({ length: 4 }, () => randInt(2, 9) * (Math.random() < 0.5 ? 1 : -1))
      const start = randInt(-10, 8), T = start + sum(vars)
      if (T >= 0 || T < -20 || vars.every((v) => v < 0) || vars.every((v) => v > 0)) return null
      const said = vars.map((v, i) => `${i === 0 ? "d'abord " : i === 3 ? 'enfin ' : 'puis '}${v > 0 ? 'monté' : 'baissé'} de ${Math.abs(v)} °C`)
      return numeric(`Au cours d'une journée en montagne, la température a ${said.join(', ')}. Le soir, il fait ${fmt(T)} °C. Quelle température faisait-il le matin (en °C) ?`, start, {
        explanation: `On défait les variations : ${fmt(T)}${chain([0, ...vars.map((v) => -v)]).slice(1)} = ${fmt(start)} °C (ou : variation totale ${fmt(sum(vars))}, et ${fmt(T)} − ${par(sum(vars))} = ${fmt(start)}).`,
      })
    }),
    model('Le point symétrique', () => {
      const a = randInt(-40, 40) / 2, m = randInt(-30, 30) / 2
      if (Math.abs(a - m) < 2 || (Number.isInteger(a) && Number.isInteger(m))) return null
      const B = 2 * m - a
      return numeric(`Sur une droite graduée, le point A a pour abscisse ${fmt(a)} et le point M, milieu du segment [AB], a pour abscisse ${fmt(m)}. Quelle est l'abscisse du point B ?`, B, {
        explanation: `De A à M, on se déplace de ${fmt(m)} − ${par(a)} = ${fmt(m - a)}. De M à B, on se déplace d'autant : ${fmt(m)} + ${par(m - a)} = ${fmt(B)}.`,
      })
    }),
    model('Pas d’année zéro', () => {
      const a = randInt(5, 80) * 10, b = 50 * randInt(Math.floor(a / 50) + 1, Math.floor(a / 50) + 30)
      const what = pick(['une cité', 'un royaume', 'un temple', 'une bibliothèque'])
      const fem = what.startsWith('une')
      return numeric(`${cap(what)} a été ${fem ? 'fondée' : 'fondé'} en ${a} av. J.-C., c'est-à-dire en l'an −${a}. En quelle année ${fem ? 'a-t-elle' : 'a-t-il'} fêté son ${b}ᵉ anniversaire ? Attention : il n'y a pas d'année 0, l'an 1 suit directement l'an −1.`, b - a + 1, {
        explanation: `−${a} + ${b} = ${b - a}, mais en passant de −1 à 1 on saute l'année 0 : il faut ajouter 1, d'où l'an ${b - a + 1}.`,
      })
    }),
  ],
  [
    model('La somme qui alterne', () => {
      const n = randInt(15, 60), v = randInt(0, 2)
      if (v === 0) {
        return numeric(`Calcule astucieusement : 1 − 2 + 3 − 4 + 5 − 6 + … + ${2 * n - 1} − ${2 * n}`, -n, {
          explanation: `On groupe par deux : (1 − 2) + (3 − 4) + … + (${2 * n - 1} − ${2 * n}). Il y a ${n} paquets valant chacun −1 : la somme vaut −${n}.`,
        })
      }
      if (v === 1) {
        return numeric(`Calcule astucieusement : −1 + 2 − 3 + 4 − 5 + 6 − … − ${2 * n - 1} + ${2 * n}`, n, {
          explanation: `On groupe par deux : (−1 + 2) + (−3 + 4) + … + (−${2 * n - 1} + ${2 * n}). Il y a ${n} paquets valant chacun 1 : la somme vaut ${n}.`,
        })
      }
      return numeric(`Calcule astucieusement : 1 − 2 + 3 − 4 + … − ${2 * n} + ${2 * n + 1}`, n + 1, {
        explanation: `On groupe : 1 + (−2 + 3) + (−4 + 5) + … + (−${2 * n} + ${2 * n + 1}). Après le 1, il y a ${n} paquets valant 1 : la somme vaut ${n + 1}.`,
      })
    }),
    model('Tous les entiers', () => {
      const a = randInt(5, 40), b = a + pick([-5, -4, -3, -2, 2, 3, 4, 5])
      if (b < 3) return null
      const lo = Math.min(a, b)
      const rest = b > a ? Array.from({ length: b - a }, (_, i) => a + 1 + i) : Array.from({ length: a - b }, (_, i) => -(b + 1 + i))
      const S = sum(rest)
      return numeric(`Calcule la somme de tous les nombres entiers relatifs compris entre −${a} et ${b} (−${a} et ${b} inclus).`, S, {
        explanation: `Les nombres de −${lo} à ${lo} s'annulent deux à deux (−1 avec 1, −2 avec 2…). Il reste ${plusChain(rest)} = ${fmt(S)}.`,
      })
    }),
    model('La sonde qui plonge', () => {
      const [start, h0] = pick([
        ['lâché depuis un pont, à', randInt(8, 40)], ['lâché depuis le pont d’un navire, à', randInt(5, 15)], ['posé sur un quai, à', randInt(2, 6)],
      ] as [string, number][])
      const v = randInt(6, 15), L = 10 * randInt(8, 40)
      const n = Math.floor((h0 + L) / v) + 1
      return numeric(`Un robot sous-marin est ${start} ${h0} m au-dessus du niveau de la mer. Il descend ensuite à vitesse constante : ${v} m de moins chaque minute. Au bout de combien de minutes entières se trouvera-t-il pour la première fois en dessous de l'altitude −${L} m ?`, n, {
        explanation: `Pour passer sous −${L} m, il doit descendre de plus de ${h0} − ${par(-L)} = ${h0 + L} m. ${h0 + L} ÷ ${v} ${(h0 + L) % v === 0 ? `= ${(h0 + L) / v} : à cette minute il est exactement à −${L} m` : `≈ ${fmt(Math.floor(((h0 + L) / v) * 10) / 10)}`}. Donc il faut ${n} minutes : ${h0} − ${v} × ${n} = ${fmt(h0 - v * n)} m (à ${n - 1} minutes, il est encore à ${fmt(h0 - v * (n - 1))} m).`,
      })
    }),
    model('Le partage des frais', () => {
      const n = randInt(3, 4), names = prenoms(n)
      const paid = names.map(() => (Math.random() < 0.3 ? 0 : randInt(4, 60)))
      const T = sum(paid)
      if (T % n !== 0 || paid.filter((p) => p > 0).length < 2) return null
      const share = T / n, X = randInt(0, n - 1), bal = paid[X] - share
      if (bal === 0 || paid.filter((p) => p === 0).length > 1) return null
      const desc = names.map((nm, i) => (paid[i] ? `${nm} a payé ${paid[i]} €` : `${nm} n'a rien payé`))
      return numeric(`${names.slice(0, -1).join(', ')} et ${names[n - 1]} partent en week-end et partagent toutes les dépenses à parts égales. ${cap(desc.join(', '))}. Quel est le solde ${deP(names[X])} en euros : positif si ${names[X]} doit récupérer de l'argent, négatif si ${names[X]} doit en verser ?`, bal, {
        explanation: `Total : ${paid.filter((v) => v > 0).join(' + ')} = ${T} €, soit ${share} € par personne. ${names[X]} a payé ${paid[X]} € : ${paid[X]} − ${share} = ${fmt(bal)} €.`,
      })
    }),
    model('Les écarts à l’objectif', () => {
      const ctx = pick([
        { who: 'Une boulangère', what: 'pains vendus', B: 10 * randInt(15, 40), u: 'pains', r: 25 },
        { who: 'Un cinéma', what: 'spectateurs', B: 10 * randInt(20, 60), u: 'spectateurs', r: 40 },
        { who: 'Une cycliste', what: 'kilomètres parcourus', B: 5 * randInt(6, 16), u: 'km', r: 12 },
        { who: 'Un food-truck', what: 'repas servis', B: 10 * randInt(8, 20), u: 'repas', r: 20 },
      ])
      const devs = Array.from({ length: 6 }, () => randInt(-ctx.r, ctx.r))
      if (devs.includes(0) || devs.filter((d) => d < 0).length < 2 || devs.filter((d) => d > 0).length < 2) return null
      const S = sum(devs)
      const txt = devs.map((d) => (d > 0 ? `+${d}` : fmt(d))).join(' ; ')
      const intro = `${ctx.who} note chaque jour l'écart entre le nombre de ${ctx.what} et son objectif quotidien de ${ctx.B} ${ctx.u}. Du lundi au samedi, les écarts sont : ${txt}.`
      if (Math.random() < 0.5) {
        if (S === 0) return null
        return numeric(`${intro} Quel écart faut-il noter dimanche pour que le total de la semaine soit exactement de 7 × ${ctx.B} = ${7 * ctx.B} ${ctx.u} ?`, -S, {
          explanation: `Sur la semaine, la somme des écarts doit être nulle. Somme des 6 écarts : ${chain(devs)} = ${fmt(S)}. Il faut donc un écart de ${fmt(-S)} dimanche (soit ${ctx.B - S} ${ctx.u}).`,
        })
      }
      const d7 = randInt(-ctx.r, ctx.r)
      if (d7 === 0 || S + d7 === 0) return null
      const tot = 7 * ctx.B + S + d7
      return numeric(`${intro} Dimanche, l'écart est de ${d7 > 0 ? `+${d7}` : fmt(d7)}. Quel est le nombre total de ${ctx.u} sur la semaine ?`, tot, {
        explanation: `Somme des écarts : ${chain([...devs, d7])} = ${fmt(S + d7)}. Total : 7 × ${ctx.B} + ${par(S + d7)} = ${7 * ctx.B} + ${par(S + d7)} = ${tot} ${ctx.u}.`,
      })
    }),
  ],
]

// ═════════════════════════════ 5e-frac ═════════════════════════════════
/** Numérateur au hasard, premier avec le dénominateur. */
const coprimeNum = (d: number, max = d - 1) => {
  const c = Array.from({ length: max }, (_, i) => i + 1).filter((n) => gcd(n, d) === 1)
  return pick(c)
}
/** Fraction réduite empilée. */
const Fr = (n: number, d: number) => {
  const g = gcd(n, d) || 1
  return d / g === 1 ? fmt(n / g) : F(n / g, d / g)
}

const fracs: Ladder = [
  [
    model('Le butin', () => {
      const ctx = pick([
        { who: 'Un pirate', obj: 'pièces d’or', g1: 'à son second', g2: 'au mousse' },
        { who: 'Une collectionneuse', obj: 'cartes', g1: 'à son frère', g2: 'à sa voisine' },
        { who: 'Un cueilleur', obj: 'pommes', g1: 'au marché', g2: 'à ses amis' },
        { who: 'Une joueuse', obj: 'gemmes', g1: 'à son équipe', g2: 'à un débutant' },
      ])
      const a = randInt(2, 6), b = randInt(2, 6), n1 = coprimeNum(a), n2 = coprimeNum(b), k = randInt(1, 6)
      const N = a * b * k
      if (N < 24 || N > 240) return null
      const r1 = N - (N * n1) / a, g2 = (r1 * n2) / b, rest = r1 - g2
      return numeric(`${ctx.who} possède ${N} ${ctx.obj}. ${ctx.who.startsWith('Une') ? 'Elle' : 'Il'} en donne ${les(n1, a)} ${ctx.g1}, puis ${les(n2, b)} de ce qui lui reste ${ctx.g2}. Combien lui en reste-t-il ?`, rest, {
        explanation: `${F(n1, a)} de ${N} = ${(N * n1) / a}, il en reste ${r1}. ${F(n2, b)} de ${r1} = ${g2}, il en reste ${r1} − ${g2} = ${rest}.`,
      })
    }),
    model('La plus grande gorgée', () => {
      const [d1, d2, d3] = pick([[4, 8, 16], [3, 6, 12], [5, 10, 20], [2, 6, 12], [3, 9, 18], [2, 4, 8]])
      const fr = shuffle([[coprimeNum(d1), d1], [coprimeNum(d2), d2], [coprimeNum(d3), d3]])
      const vals = fr.map(([n, d]) => (n * d3) / d)
      if (new Set(vals).size < 3) return null
      const names = prenoms(3)
      const most = Math.random() < 0.5
      const ext = most ? Math.max(...vals) : Math.min(...vals)
      const i = vals.indexOf(ext)
      const conv = fr.map(([n, d], j) => `${F(n, d)} = ${F(vals[j], d3)}`).join(' ; ')
      const intro = `Trois amis ont la même gourde, pleine au départ. ${names[0]} a bu ${F(fr[0][0], fr[0][1])} de sa gourde, ${names[1]} ${F(fr[1][0], fr[1][1])} et ${names[2]} ${F(fr[2][0], fr[2][1])}.`
      if (most) {
        return fraction(`${intro} Quelle fraction de sa gourde a bue celui qui a bu le plus ?`, ext, d3, {
          explanation: `Au même dénominateur : ${conv}. La plus grande est ${F(ext, d3)} (${names[i]}).`,
        })
      }
      return fraction(`${intro} Quelle fraction de sa gourde reste-t-il à celui qui a bu le moins ?`, d3 - ext, d3, {
        explanation: `Au même dénominateur : ${conv}. ${names[i]} a bu le moins (${F(ext, d3)}), il lui reste ${F(d3, d3)} − ${F(ext, d3)} = ${F(d3 - ext, d3)}.`,
      })
    }),
    model('Le réservoir', () => {
      const ctx = pick([
        { nom: 'Le réservoir d’une voiture', fem: false, use: 'Pendant un trajet, on consomme', liq: 'd’essence' },
        { nom: 'Une cuve de récupération d’eau de pluie', fem: true, use: 'Pour arroser le potager, on prélève', liq: 'd’eau' },
        { nom: 'Le tonneau du brasseur', fem: false, use: 'Pour la fête du village, on tire', liq: 'de cidre' },
        { nom: 'L’aquarium du collège', fem: false, use: 'Pour le nettoyer, on retire', liq: 'd’eau' },
      ])
      const [q, s] = shuffle(pick([[4, 8], [3, 6], [5, 10], [2, 8], [3, 12], [4, 12]]))
      const p = coprimeNum(q), r = coprimeNum(s)
      if (p === 1) return null
      const L = (q * s) / gcd(q, s), C = L * randInt(1, Math.max(1, Math.floor(120 / L)))
      const left = (C * p) / q - (C * r) / s
      if (left <= 0 || C < 20) return null
      return numeric(`${ctx.nom} a une contenance de ${C} L. ${ctx.fem ? 'Elle est remplie' : 'Il est rempli'} aux ${F(p, q)}. ${ctx.use} une quantité ${ctx.liq} égale ${r === 1 ? 'à' : 'aux'} ${F(r, s)} de sa contenance. Combien de litres reste-t-il ?`, left, {
        explanation: `${F(p, q)} de ${C} L = ${(C * p) / q} L ; ${F(r, s)} de ${C} L = ${(C * r) / s} L ; il reste ${(C * p) / q} − ${(C * r) / s} = ${left} L.`,
      })
    }),
    model('Le tout et la partie', () => {
      const q = randInt(3, 9), p = coprimeNum(q), u = randInt(2, q < 5 ? 40 : 20)
      const total = q * u, part = p * u
      if (p === 1 && Math.random() < 0.6) return null
      const fr = les(p, q)
      const ctx = pick([
        { t: `${cap(fr)} des élèves d'un collège, soit ${part} élèves, mangent à la cantine. Combien d'élèves compte ce collège ?`, u: 'élèves' },
        { t: `${prenom()} a déjà parcouru ${fr} d'un sentier de randonnée, soit ${part} km. Quelle est la longueur totale du sentier (en km) ?`, u: 'km' },
        { t: `${cap(fr)} d'une cagnotte, soit ${part} €, ont servi à acheter un cadeau. Combien contenait la cagnotte (en €) ?`, u: '€' },
        { t: `Un réservoir rempli ${p === 1 ? 'au' : 'aux'} ${F(p, q)} contient ${part} L. Quelle est sa contenance (en L) ?`, u: 'L' },
        { t: `Dans un jeu vidéo, ${prenom()} a terminé ${fr} des niveaux, soit ${part} niveaux. Combien le jeu compte-t-il de niveaux ?`, u: 'niveaux' },
      ])
      return numeric(ctx.t, total, {
        explanation: `${F(p, q)} ↔ ${part} ${ctx.u}, donc ${F(1, q)} ↔ ${part} ÷ ${p} = ${u} ${ctx.u}, et le tout ↔ ${u} × ${q} = ${total} ${ctx.u}.`,
      })
    }),
    model('Des fractions d’heure', () => {
      const dens = shuffle([2, 3, 4, 5, 6, 10, 12, 15, 20]).slice(0, 3)
      const fr = dens.map((d) => [coprimeNum(d), d])
      const mins = fr.map(([n, d]) => (60 * n) / d)
      const tot = sum(mins)
      const p = prenom(), act = shuffle(['à ses devoirs', 'au basket', 'à jouer du piano', 'à lire', 'à dessiner', 'au jardin']).slice(0, 3)
      return numeric(`Mercredi, ${p} a passé ${F(fr[0][0], fr[0][1])} h ${act[0]}, ${F(fr[1][0], fr[1][1])} h ${act[1]} et ${F(fr[2][0], fr[2][1])} h ${act[2]}. Combien de minutes cela fait-il en tout ?`, tot, {
        explanation: `${fr.map(([n, d], i) => `${F(n, d)} h = 60 ÷ ${d} × ${n} = ${mins[i]} min`).join(' ; ')}. Total : ${mins.join(' + ')} = ${tot} min.`,
      })
    }),
  ],
  [
    model('Le porte-monnaie', () => {
      const d = randInt(2, 6), k = randInt(2, 3), D = d * k
      if (D > 16) return null
      const a = coprimeNum(d), b = coprimeNum(D)
      const rem = D - a * k - b
      if (rem <= 0) return null
      const u = randInt(2, 12), T = u * D, R = u * rem
      const p = prenom()
      return numeric(`${p} dépense ${les(a, d)} de son argent de poche pour un livre, puis ${les(b, D)} de cette même somme pour une place de concert. Il reste ${R} € à ${p}. Quelle était la somme de départ (en €) ?`, T, {
        explanation: `Fraction dépensée : ${F(a * k, D)} + ${F(b, D)} = ${F(a * k + b, D)}. Il reste ${F(rem, D)} de la somme, soit ${R} €. Donc ${F(1, D)} de la somme vaut ${R} ÷ ${rem} = ${u} €, et la somme vaut ${u} × ${D} = ${T} €.`,
      })
    }),
    model('Le champ partagé', () => {
      const [d1, d2, d3] = pick([[2, 4, 8], [3, 6, 12], [2, 6, 12], [4, 8, 16], [5, 10, 20], [3, 9, 18], [2, 10, 20], [4, 12, 24]])
      const n = [coprimeNum(d1), coprimeNum(d2), coprimeNum(d3)]
      const parts = [(n[0] * d3) / d1, (n[1] * d3) / d2, n[2]]
      const rest = d3 - sum(parts)
      if (rest <= 0) return null
      const crops = shuffle(['blé', 'orge', 'colza', 'maïs', 'tournesol', 'lin']).slice(0, 3)
      return fraction(`Un agriculteur sème ${F(n[0], d1)} de son champ en ${crops[0]}, ${F(n[1], d2)} en ${crops[1]} et ${F(n[2], d3)} en ${crops[2]}. Le reste du champ est laissé en jachère. Quelle fraction du champ est en jachère ? (fraction irréductible)`, rest, d3, {
        irreducible: true,
        explanation: `Au dénominateur ${d3} : ${F(parts[0], d3)} + ${F(parts[1], d3)} + ${F(parts[2], d3)} = ${F(sum(parts), d3)}. Il reste ${F(rest, d3)}${gcd(rest, d3) > 1 ? ` = ${Fr(rest, d3)}` : ''}.`,
      })
    }),
    model('La fraction mystère', () => {
      const D = pick([12, 16, 18, 20, 24, 30])
      const divs = [2, 3, 4, 5, 6, 8, 10, 12].filter((x) => D % x === 0 && x < D)
      const b = pick(divs), d = pick(divs), a = coprimeNum(b), c = coprimeNum(d)
      const lo = (a * D) / b, hi = (c * D) / d
      if (hi - lo !== 2) return null
      const n = lo + 1
      const g = gcd(n, D)
      return fraction(`Je suis une fraction de dénominateur ${D}, strictement comprise entre ${F(a, b)} et ${F(c, d)}. Qui suis-je ? Écris-moi sous forme irréductible.`, n, D, {
        irreducible: true,
        explanation: `${F(a, b)} = ${F(lo, D)} et ${F(c, d)} = ${F(hi, D)}. Le seul numérateur possible est ${n} : ${F(n, D)}${g > 1 ? ` = ${Fr(n, D)}` : ', déjà irréductible'}.`,
      })
    }),
    model('La jauge d’essence', () => {
      const engin = pick(['d’une moto', 'd’une voiture', 'd’un scooter', 'd’un bateau à moteur', 'd’un tracteur'])
      const [q, s] = pick([[8, 4], [8, 2], [6, 3], [10, 5], [12, 4], [12, 6], [12, 3], [16, 8], [16, 4]])
      const a = coprimeNum(q), b = coprimeNum(s)
      const diff = a - (b * q) / s // en q-ièmes
      if (diff <= 0) return null
      const C = q * randInt(1, Math.floor(80 / q))
      const V = (C * diff) / q
      if (C < 8 || !dec(V, 1)) return null
      return numeric(`Au départ, la jauge du réservoir ${engin} indique ${F(a, q)}. Après un trajet, elle indique ${F(b, s)}. Le trajet a consommé ${fmt(V)} L d'essence. Quelle est la contenance du réservoir (en L) ?`, C, {
        explanation: `${F(a, q)} − ${F(b, s)} = ${F(a, q)} − ${F((b * q) / s, q)} = ${F(diff, q)} du réservoir, soit ${fmt(V)} L. Donc ${F(1, q)} ↔ ${fmt(V / diff)} L et le réservoir contient ${fmt(V / diff)} × ${q} = ${C} L.`,
      })
    }),
    model('Le club', () => {
      const q = randInt(3, 9), p = coprimeNum(q, Math.ceil(q / 2) - 1)
      if (q - 2 * p <= 0) return null
      const u = randInt(3, 20), T = q * u, diff = (q - 2 * p) * u
      const sport = pick(['d’échecs', 'de natation', 'de théâtre', 'd’escalade', 'de tennis'])
      return numeric(`Dans un club ${sport}, ${les(p, q)} des membres sont des enfants, les autres sont des adultes. Il y a ${diff} adultes de plus que d'enfants. Combien le club compte-t-il de membres ?`, T, {
        explanation: `Les adultes forment ${F(q - p, q)} des membres. L'écart vaut ${F(q - p, q)} − ${F(p, q)} = ${F(q - 2 * p, q)} des membres, soit ${diff} personnes. Donc ${F(1, q)} des membres = ${u} et le club compte ${u} × ${q} = ${T} membres.`,
      })
    }),
  ],
  [
    model('Le trésor du roi', () => {
      const a = randInt(2, 6), b = randInt(2, 6), n1 = coprimeNum(a), n2 = coprimeNum(b), u = randInt(1, 12)
      const T = a * b * u * 10
      const r1 = (T * (a - n1)) / a, s2 = (r1 * n2) / b, R = r1 - s2
      if (R <= 0 || T > 1500) return null
      return numeric(`Un roi partage son trésor entre ses trois enfants. L'aînée reçoit ${les(n1, a)} du trésor, le deuxième reçoit ${les(n2, b)} de ce qui reste, et la benjamine reçoit le reste, soit ${R} pièces d'or. Combien de pièces d'or comptait le trésor ?`, T, {
        explanation: `La benjamine reçoit ${F(b - n2, b)} du premier reste, soit ${R} pièces : ce reste vaut ${R} ÷ ${b - n2} × ${b} = ${r1}. Ce reste représente ${F(a - n1, a)} du trésor : le trésor vaut ${r1} ÷ ${a - n1} × ${a} = ${T} pièces.`,
      })
    }),
    model('La baignoire qui fuit', () => {
      const a = randInt(4, 12), k = pick([2, 3, 4, 5])
      const t = (k * a) / (k - 1)
      if (!dec(t, 1)) return null
      const w = pick([
        { s: 'Un robinet remplit une baignoire vide', il: 'il', leak: 'la bonde fuit et vide', c: 'la baignoire', fem: true },
        { s: 'Une pompe remplit une piscine gonflable vide', il: 'elle', leak: 'une fissure laisse échapper', c: 'la piscine', fem: true },
        { s: 'Un tuyau remplit un abreuvoir vide', il: 'il', leak: 'un trou laisse fuir', c: 'l’abreuvoir', fem: false },
      ])
      return numeric(`${w.s} en ${a} minutes : chaque minute, ${w.il} en remplit ${F(1, a)}. Mais ${w.leak} ${F(1, k * a)} de ${w.c} par minute. Au bout de combien de minutes ${w.c} sera-t-${w.fem ? 'elle pleine' : 'il plein'} ?`, t, {
        explanation: `Chaque minute : ${F(1, a)} − ${F(1, k * a)} = ${F(k, k * a)} − ${F(1, k * a)} = ${F(k - 1, k * a)}. Il faut ${k * a} ÷ ${k - 1} = ${fmt(t)} minutes pour remplir les ${F(k * a, k * a)}.`,
      })
    }),
    model('L’escargot obstiné', () => {
      const [q, c, s] = pick([[4, 3, 2], [4, 3, 1], [8, 5, 2], [8, 7, 4], [8, 5, 3], [8, 7, 3], [6, 5, 3], [10, 7, 5]])
      const H = randInt(2, 6)
      const need = H * q - c // position (en q-ièmes) à atteindre au début d'un jour
      const full = Math.ceil(need / (c - s))
      const day = full + 1
      return numeric(`Un escargot est au pied d'un mur de ${H} m. Chaque jour, il monte de ${Fr(c, q)} m ; chaque nuit, il glisse et redescend de ${Fr(s, q)} m. Il commence à grimper le jour 1. Quel jour atteindra-t-il le haut du mur ?`, day, {
        explanation: `Un jour complet (jour + nuit) lui fait gagner ${Fr(c, q)} − ${Fr(s, q)} = ${Fr(c - s, q)} m. Pour atteindre le haut en montant de ${Fr(c, q)} m, il doit partir d'au moins ${H} − ${Fr(c, q)} = ${Fr(need, q)} m. Il lui faut ${full} jours complets (${full} × ${Fr(c - s, q)} = ${Fr(full * (c - s), q)} m), puis il arrive en haut le jour ${day}.`,
      })
    }),
    model('Les bonbons à rebours', () => {
      const a = randInt(2, 5), b = randInt(2, 4), u = randInt(2, 8), c = randInt(2, 9)
      const T = a * b * u
      const r1 = T - T / a, r2 = r1 - r1 / b, e = r2 - c
      if (e <= 0) return null
      const [A, B, C] = prenoms(3)
      return numeric(`Dans un paquet de bonbons, ${A} prend ${F(1, a)} des bonbons, puis ${B} prend ${F(1, b)} de ce qui reste, et enfin ${C} en prend ${c}. Il reste alors ${e} bonbons. Combien y avait-il de bonbons dans le paquet ?`, T, {
        explanation: `On remonte : avant ${C}, il y en avait ${e} + ${c} = ${r2}. Ces ${r2} bonbons sont ${les(b - 1, b)} de ce qu'a trouvé ${B} : ${r2} ÷ ${b - 1} × ${b} = ${r1}. Ces ${r1} bonbons sont ${les(a - 1, a)} du paquet : ${r1} ÷ ${a - 1} × ${a} = ${T}.`,
      })
    }),
    model('Le terrain des trois frères', () => {
      const [d, k] = pick([[4, 2], [4, 4], [3, 2], [3, 4], [5, 2], [6, 2], [2, 4], [2, 8]])
      const D = d * k, n1 = coprimeNum(d), n2 = coprimeNum(D)
      const aine = n1 * k, ben = D - aine - n2
      if (ben <= 0 || ben === aine) return null
      const u = 10 * randInt(2, 30), T = u * D, X = u * Math.abs(aine - ben)
      const more = aine > ben
      return numeric(`Trois frères se partagent un terrain. L'aîné en reçoit ${les(n1, d)}, le cadet ${les(n2, D)}, et le benjamin reçoit le reste. La part ${more ? "de l'aîné dépasse celle du benjamin" : "du benjamin dépasse celle de l'aîné"} de ${X} m². Quelle est l'aire du terrain (en m²) ?`, T, {
        explanation: `Au dénominateur ${D} : l'aîné a ${F(aine, D)}, le cadet ${F(n2, D)}, le benjamin ${F(D, D)} − ${F(aine, D)} − ${F(n2, D)} = ${F(ben, D)}. L'écart vaut ${F(Math.abs(aine - ben), D)} du terrain, soit ${X} m² : ${F(1, D)} ↔ ${u} m², et le terrain mesure ${u} × ${D} = ${T} m².`,
      })
    }),
  ],
]

// ═════════════════════════════ 5e-lit ══════════════════════════════════
const FRISES = [
  { nom: 'carrés', un: 'carré', k: 3, de: 'de carrés', nv: 'nouveau' },
  { nom: 'triangles', un: 'triangle', k: 2, de: 'de triangles', nv: 'nouveau' },
  { nom: 'pentagones', un: 'pentagone', k: 4, de: 'de pentagones', nv: 'nouveau' },
  { nom: 'hexagones', un: 'hexagone', k: 5, de: 'd’hexagones', nv: 'nouvel' },
] as const
/** « k × x » lisible : « x », « 3x ». */
const kx = (k: number) => term(k, 'x', true)

const lit: Ladder = [
  [
    model('La frise d’allumettes', () => {
      const f = pick(FRISES), n = randInt(25, 90)
      return numeric(`On construit une frise ${f.de} avec des allumettes, chaque ${f.nv} ${f.un} partageant un côté avec le précédent : 1 ${f.un} → ${f.k + 1} allumettes, 2 ${f.nom} → ${2 * f.k + 1}, 3 ${f.nom} → ${3 * f.k + 1}. Combien d'allumettes faut-il pour ${n} ${f.nom} ?`, f.k * n + 1, {
        explanation: `Il y a 1 allumette de départ, puis chaque ${f.un} en ajoute ${f.k} : pour x ${f.nom}, il faut ${f.k}x + 1 allumettes. Ici : ${f.k} × ${n} + 1 = ${f.k * n + 1}.`,
      })
    }),
    model('Le tour de magie', () => {
      const a = randInt(2, 12), k = randInt(2, 6), b = randInt(1, 9), v = randInt(0, 2)
      const p = prenom()
      let steps: string, res: number, algebra: string
      if (v === 0) {
        steps = `Ajoute ${a}. Multiplie le résultat par ${k}. Retranche ${k} fois le nombre choisi au départ`
        res = k * a
        algebra = `${k}(x + ${a}) − ${k}x = ${k}x + ${k * a} − ${k}x = ${res}`
      } else if (v === 1) {
        steps = `Multiplie-le par 2. Ajoute ${a}. Multiplie le résultat par ${k}. Retranche ${2 * k} fois le nombre choisi au départ`
        res = k * a
        algebra = `${k}(2x + ${a}) − ${2 * k}x = ${2 * k}x + ${k * a} − ${2 * k}x = ${res}`
      } else {
        if (k * a <= b) return null
        steps = `Ajoute ${a}. Multiplie le résultat par ${k}. Retranche ${b}. Retranche enfin ${k} fois le nombre choisi au départ`
        res = k * a - b
        algebra = `${k}(x + ${a}) − ${b} − ${k}x = ${k}x + ${k * a} − ${b} − ${k}x = ${res}`
      }
      return numeric(`Voici le tour de magie ${deP(p)} : « Choisis un nombre. ${steps}. » ${p} affirme que l'on obtient toujours le même résultat, quel que soit le nombre choisi. Quel est ce résultat ?`, res, {
        explanation: `Avec un nombre x quelconque : ${algebra}. Le x disparaît : on trouve toujours ${res}.`,
      })
    }),
    model('La bonne formule', () => {
      const v = randInt(0, 2)
      if (v === 0) {
        const n = randInt(8, 30)
        return numeric(`Dans un tournoi, chacun des n joueurs rencontre une seule fois chacun des autres. Le nombre de matchs est alors n × (n − 1) ÷ 2 (vérifie : 3 joueurs, 3 matchs). Combien de matchs faut-il organiser avec ${n} joueurs ?`, (n * (n - 1)) / 2, {
          explanation: `On remplace n par ${n} : ${n} × (${n} − 1) ÷ 2 = ${n} × ${n - 1} ÷ 2 = ${(n * (n - 1)) / 2}.`,
        })
      }
      if (v === 1) {
        const n = randInt(6, 20)
        return numeric(`Le nombre de diagonales d'un polygone à n côtés est donné par la formule n × (n − 3) ÷ 2 (vérifie : un carré a 2 diagonales). Combien de diagonales possède un polygone à ${n} côtés ?`, (n * (n - 3)) / 2, {
          explanation: `On remplace n par ${n} : ${n} × (${n} − 3) ÷ 2 = ${n} × ${n - 3} ÷ 2 = ${(n * (n - 3)) / 2}.`,
        })
      }
      const n = randInt(6, 20)
      return numeric(`Dans un championnat, chacune des n équipes reçoit une fois chacune des autres sur son terrain (matchs aller et retour). Le nombre de matchs est n × (n − 1) (vérifie : 3 équipes, 6 matchs). Combien de matchs compte un championnat de ${n} équipes ?`, n * (n - 1), {
        explanation: `On remplace n par ${n} : ${n} × (${n} − 1) = ${n} × ${n - 1} = ${n * (n - 1)}.`,
      })
    }),
    () => {
      const ex = retry(() => {
        const t = randInt(3, 12), dv = randInt(1, 4), v2 = randInt(1, 4), v1 = v2 + dv, gap = t * dv
        if (Math.random() < 0.5) {
          const H2 = randInt(v2 * t + 2, v2 * t + 15), H1 = H2 + gap
          if (H1 - v1 * t <= 0 || H1 > 60) return null
          return withMeta(numeric(`La bougie A mesure ${H1} cm et raccourcit de ${v1} cm par heure. La bougie B mesure ${H2} cm et raccourcit de ${v2} cm par heure. On les allume en même temps. Au bout de combien d'heures auront-elles la même hauteur ?`, t, {
            explanation: `Après x heures, A mesure ${H1} − ${kx(v1)} et B mesure ${H2} − ${kx(v2)}. L'écart de départ (${gap} cm) diminue de ${dv} cm par heure : il s'annule après ${gap} ÷ ${dv} = ${t} h. Vérification : ${H1} − ${v1} × ${t} = ${H2} − ${v2} × ${t} = ${H1 - v1 * t} cm.`,
          }), { title: 'Les deux bougies' })
        }
        const [A, B] = deuxPrenoms()
        const s1 = randInt(2, 8), s2 = s1 + dv * randInt(1, 3), D = s2 - s1, T0 = t * D, a2 = randInt(5, 40), a1 = a2 + T0
        return withMeta(numeric(`${A} a ${a1} € dans sa tirelire et y ajoute ${s1} € chaque semaine. ${B} a ${a2} € et ajoute ${s2} € chaque semaine. Au bout de combien de semaines auront-ils exactement la même somme ?`, t, {
          explanation: `Après x semaines : ${a1} + ${kx(s1)} et ${a2} + ${kx(s2)}. L'écart de départ (${T0} €) se réduit de ${D} € par semaine : il s'annule après ${T0} ÷ ${D} = ${t} semaines (${a1 + s1 * t} € chacun).`,
        }), { title: 'Les deux tirelires' })
      })
      return ex
    },
    model('Le billet familial', () => {
      const k = randInt(2, 3), b = randInt(1, 9), na = randInt(2, 3), nc = randInt(2, 5)
      const lieu = pick(['Au parc d’attractions', 'Au zoo', 'À l’aquarium', 'Au musée des sciences', 'Au parc aquatique'])
      const res = poly([na * k + nc, 'x'], [na * b, ''])
      return expression(`${lieu}, un billet enfant coûte x € et un billet adulte coûte ${k === 2 ? 'le double' : 'le triple'} du prix enfant, augmenté de ${b} €. Exprime, en fonction de x, le prix payé par une famille de ${na} adultes et ${nc} enfants (expression réduite).`, res, 'developed', {
        explanation: `Un adulte paie ${k}x + ${b}. Total : ${na}(${k}x + ${b}) + ${nc}x = ${na * k}x + ${na * b} + ${nc}x = ${res}.`,
      })
    }),
  ],
  [
    model('Le banquet', () => {
      const t = pick([
        { nom: 'carrées', k: 2, ex: [4, 6, 8] },
        { nom: 'hexagonales', k: 4, ex: [6, 10, 14] },
        { nom: 'en trapèze', k: 3, ex: [5, 8, 11] },
      ])
      const n = randInt(15, 60), P = t.k * n + 2
      return numeric(`Pour un banquet, on place des tables ${t.nom} bout à bout en une seule longue rangée. Avec 1 table, on peut asseoir ${t.ex[0]} personnes ; avec 2 tables, ${t.ex[1]} ; avec 3 tables, ${t.ex[2]}. Combien de tables faut-il pour asseoir exactement ${P} personnes ?`, n, {
        explanation: `Chaque table ajoutée apporte ${t.k} places, plus 2 places aux bouts : avec x tables, ${t.k}x + 2 places. ${t.k}x + 2 = ${P} donne ${t.k}x = ${P - 2}, donc x = ${n}.`,
      })
    }),
    model('Le programme de calcul', () => {
      const a = randInt(2, 6), b = randInt(1, 9), c = randInt(2, 5), d = pick([-1, 1, 2, -2, -3, 3])
      const lastTxt: Record<number, string> = {
        [-1]: 'Retranche le nombre choisi au départ', 1: 'Ajoute le nombre choisi au départ', 2: 'Ajoute le double du nombre de départ',
        [-2]: 'Retranche le double du nombre de départ', [-3]: 'Retranche le triple du nombre de départ', 3: 'Ajoute le triple du nombre de départ',
      }
      const res = poly([c * a + d, 'x'], [c * b, ''])
      return expression(`Programme de calcul : « Choisis un nombre. Multiplie-le par ${a}. Ajoute ${b}. Multiplie le résultat par ${c}. ${lastTxt[d]}. » On note x le nombre choisi. Écris le résultat du programme en fonction de x, sous forme réduite.`, res, 'developed', {
        explanation: `${c}(${a}x + ${b}) ${d < 0 ? '−' : '+'} ${kx(Math.abs(d))} = ${c * a}x + ${c * b} ${d < 0 ? '−' : '+'} ${kx(Math.abs(d))} = ${res}.`,
      })
    }),
    model('La pelouse', () => {
      const k = randInt(4, 9), b = randInt(2, 9), c = randInt(2, k - 1)
      const res = poly([k, 'x'], [k * b - c * c, ''])
      const W = 8, H = 4.4, s = 1.7
      const figure = freeFig({ P1: [0, 0], P2: [W, 0], P3: [W, H - s], P4: [W - s, H - s], P5: [W - s, H], P6: [0, H] }, {
        hide: ['P1', 'P2', 'P3', 'P4', 'P5', 'P6'],
        segments: [
          { a: 'P1', b: 'P2', label: `x + ${b}` }, { a: 'P2', b: 'P3' }, { a: 'P3', b: 'P4', label: `${c}` },
          { a: 'P4', b: 'P5', label: `${c}` }, { a: 'P5', b: 'P6' }, { a: 'P6', b: 'P1', label: `${k}` },
        ],
        polygons: [{ pts: ['P1', 'P2', 'P3', 'P4', 'P5', 'P6'], fill: '#6fa84a' }],
        caption: 'Longueurs en mètres. La figure n’est pas à l’échelle.',
      })
      return withMeta(expression(`Une pelouse a la forme d'un rectangle de ${k} m de large et de (x + ${b}) m de long, dont on a retiré un coin carré de ${c} m de côté pour installer un cabanon (voir la figure). Exprime l'aire de la pelouse en fonction de x, en m², sous forme développée et réduite.`, res, 'developed', {
        explanation: `Aire du rectangle moins celle du carré : ${k}(x + ${b}) − ${c} × ${c} = ${k}x + ${k * b} − ${c * c} = ${res}.`,
      }), { figure })
    }),
    model('Les âges de la famille', () => {
      const [p, f] = deuxPrenoms()
      const a = randInt(2, 9), k = randInt(2, 3), b = randInt(1, 9), withGp = Math.random() < 0.5, younger = Math.random() < 0.4
      const sib = younger ? poly([1, 'x'], [-a, '']) : poly([1, 'x'], [a, ''])
      const coefX = 2 + k + (withGp ? 2 * k : 0)
      const cst = (younger ? -a : a) + b + (withGp ? 2 * b : 0)
      const res = poly([coefX, 'x'], [cst, ''])
      if (cst === 0) return null
      const de = deP(p)
      return expression(`Dans une famille, ${p} a x ans et ${f} a ${a} ans de ${younger ? 'moins' : 'plus'}. Leur mère a ${k === 2 ? 'le double' : 'le triple'} de l'âge ${de}, augmenté de ${b} ans${withGp ? ", et leur grand-père a le double de l'âge de leur mère" : ''}. Exprime en fonction de x la somme des âges de ${withGp ? 'ces quatre personnes' : 'ces trois personnes'} (expression réduite).`, res, 'developed', {
        explanation: `x + (${sib}) + (${k}x + ${b})${withGp ? ` + 2(${k}x + ${b})` : ''} = x + ${sib} + ${k}x + ${b}${withGp ? ` + ${2 * k}x + ${2 * b}` : ''} = ${res}.`,
      })
    }),
    model('La longueur cachée', () => {
      const k = randInt(2, 9), a = randInt(1, 6), b = randInt(1, 9)
      const res = poly([a, 'x'], [b, ''])
      const big = poly([k * a, 'x'], [k * b, ''])
      const v = randInt(0, 2)
      const txt = [
        `Un rectangle a une aire de (${big}) cm² et une largeur de ${k} cm. Exprime sa longueur en fonction de x, sous forme réduite (sans parenthèses).`,
        `${k} sachets de graines identiques pèsent en tout (${big}) g. Exprime la masse d'un sachet en fonction de x, sous forme réduite (sans parenthèses).`,
        `Une corde de (${big}) m est coupée en ${k} morceaux de même longueur. Exprime la longueur d'un morceau en fonction de x, sous forme réduite (sans parenthèses).`,
      ][v]
      return expression(txt, res, 'developed', {
        explanation: `On factorise par ${k} : ${big} = ${k} × ${kx(a)} + ${k} × ${b} = ${k}(${res}). Il reste donc ${res}.`,
      })
    }),
  ],
  [
    model('Le mur en escalier', () => {
      const n = randInt(12, 40)
      if (Math.random() < 0.5) {
        return numeric(`Un maçon construit un mur en escalier : la 1ʳᵉ colonne compte 1 pierre, la 2ᵉ en compte 2, la 3ᵉ en compte 3, et ainsi de suite. Astuce : en accolant deux escaliers identiques (l'un retourné), on obtient un rectangle de n colonnes de n + 1 pierres. Combien de pierres faut-il pour un escalier de ${n} colonnes ?`, (n * (n + 1)) / 2, {
          explanation: `Deux escaliers forment un rectangle de n × (n + 1) pierres, donc un escalier en compte n × (n + 1) ÷ 2. Pour n = ${n} : ${n} × ${n + 1} ÷ 2 = ${(n * (n + 1)) / 2}.`,
        })
      }
      return numeric(`Une pyramide de pierres a des marches de plus en plus longues : la marche du haut compte 1 pierre, la suivante 3 pierres, puis 5, puis 7… (2 de plus à chaque fois). Avec 2 marches il faut 4 pierres, avec 3 marches 9 pierres, avec 4 marches 16 pierres. Combien de pierres faut-il pour ${n} marches ?`, n * n, {
        explanation: `1 = 1 × 1, 1 + 3 = 2 × 2, 1 + 3 + 5 = 3 × 3, 1 + 3 + 5 + 7 = 4 × 4 : avec n marches, il faut n × n pierres. Pour n = ${n} : ${n} × ${n} = ${n * n}.`,
      })
    }),
    model('Les programmes jumeaux', () => {
      const r = randInt(2, 4), p = randInt(1, 3), m = randInt(1, 3), a = randInt(2, 9)
      const k = r * p + m
      if ((k * a) % r !== 0) return null
      const q = (k * a) / r
      const rem = m === 1 ? 'le nombre de départ' : `${m} fois le nombre de départ`
      return numeric(`Programme A : « Choisis un nombre, ajoute ${a}, multiplie le résultat par ${k}, puis retranche ${rem}. » Programme B : « Choisis un nombre, ${p === 1 ? '' : `multiplie-le par ${p}, `}ajoute un nombre mystère, puis multiplie le résultat par ${r}. » Quel doit être le nombre mystère pour que les deux programmes donnent toujours le même résultat, quel que soit le nombre choisi ?`, q, {
        explanation: `A : ${k}(x + ${a}) − ${kx(m)} = ${k}x + ${k * a} − ${kx(m)} = ${poly([k - m, 'x'], [k * a, ''])}. B : ${r}(${kx(p)} + ?) = ${kx(r * p)} + ${r} × ?. Les termes en x sont identiques ; il faut ${r} × ? = ${k * a}, donc ? = ${q}.`,
      })
    }),
    model('Le triangle isocèle', () => {
      const x = randInt(4, 15), a = randInt(1, 9), b = randInt(2, 3), c = randInt(1, 9) * (Math.random() < 0.5 ? -1 : 1)
      const side = x + a, base = b * x + c
      if (base <= 2 || base / (2 * side) > 0.9 || base / (2 * side) < 0.26) return null
      const P = 2 * side + base
      const baseTxt = poly([b, 'x'], [c, ''])
      const names = pick([['A', 'B', 'C'], ['R', 'S', 'T'], ['E', 'F', 'G'], ['K', 'L', 'M']]) as [string, string, string]
      const theta = deg(Math.acos(base / (2 * side)))
      const figure = triangleFigure({ names, shape: [theta, theta], sides: { AB: baseTxt, BC: `x + ${a}`, CA: `x + ${a}` }, marks: { BC: 'tick', CA: 'tick' } })
      const cst = 2 * a + c
      return withMeta(numeric(`Le triangle ${names.join('')} est isocèle en ${names[2]} (voir la figure, longueurs en cm). Ses côtés égaux mesurent x + ${a} et sa base mesure ${baseTxt}. Son périmètre vaut ${P} cm. Combien vaut x ?`, x, {
        explanation: `Périmètre : 2(x + ${a}) + ${baseTxt} = ${poly([b + 2, 'x'], [cst, ''])}. ${poly([b + 2, 'x'], [cst, ''])} = ${P} donne ${b + 2}x = ${P - cst}, donc x = ${x}.`,
      }), { figure })
    }),
    model('Les entiers consécutifs', () => {
      const v = randInt(0, 2), n = randInt(10, 120)
      if (v === 0) {
        const S = 3 * n + 3
        return numeric(`La somme de trois nombres entiers consécutifs vaut ${S}. Quel est le plus grand des trois ?`, n + 2, {
          explanation: `Avec n le plus petit : n + (n + 1) + (n + 2) = 3n + 3 = ${S}, donc 3n = ${S - 3} et n = ${n}. Le plus grand est ${n + 2}.`,
        })
      }
      if (v === 1) {
        const S = 4 * n + 6
        return numeric(`La somme de quatre nombres entiers consécutifs vaut ${S}. Quel est le plus petit des quatre ?`, n, {
          explanation: `Avec n le plus petit : n + (n + 1) + (n + 2) + (n + 3) = 4n + 6 = ${S}, donc 4n = ${S - 6} et n = ${n}.`,
        })
      }
      const e = 2 * n, S = 3 * e + 6
      return numeric(`La somme de trois nombres pairs consécutifs vaut ${S}. Quel est le plus grand des trois ?`, e + 4, {
        explanation: `Avec n le plus petit : n + (n + 2) + (n + 4) = 3n + 6 = ${S}, donc 3n = ${S - 6} et n = ${e}. Le plus grand est ${e + 4}.`,
      })
    }),
    model('La grille d’allumettes', () => {
      const r = randInt(2, 5)
      const f = (x: number) => (2 * r + 1) * x + r
      const res = poly([2 * r + 1, 'x'], [r, ''])
      const intro = `Avec des allumettes, on construit des grilles de carrés de ${r} rangées. Une grille de ${r} rangées et 1 colonne utilise ${f(1)} allumettes ; avec 2 colonnes, ${f(2)} ; avec 3 colonnes, ${f(3)}.`
      const why = `Allumettes horizontales : ${r + 1} lignes de x allumettes, soit ${r + 1}x. Verticales : ${r} rangées de (x + 1) allumettes, soit ${r}(x + 1) = ${r}x + ${r}. Total : ${res}`
      if (Math.random() < 0.5) {
        return expression(`${intro} Exprime le nombre d'allumettes d'une grille de ${r} rangées et x colonnes, sous forme réduite.`, res, 'developed', {
          explanation: `${why} (vérification : x = 2 donne ${f(2)}).`,
        })
      }
      const n = randInt(15, 60)
      return numeric(`${intro} Combien d'allumettes faut-il pour une grille de ${r} rangées et ${n} colonnes ?`, f(n), {
        explanation: `${why}. Pour x = ${n} : ${2 * r + 1} × ${n} + ${r} = ${f(n)}.`,
      })
    }),
  ],
]

// ═════════════════════════════ 5e-prop ═════════════════════════════════
/** Durée en minutes écrite « 1 h 30 min », « 45 min », « 2 h ». */
const dur = (m: number) => {
  const h = Math.floor(m / 60), r = m % 60
  return h ? `${h} h${r ? ` ${r} min` : ''}` : `${r} min`
}
const ITEMS = ['pull', 'jeu vidéo', 'casque audio', 'vélo', 'sac à dos', 'skateboard', 'manteau', 'ballon de basket']

const prop: Ladder = [
  [
    model('La recette', () => {
      const r = pick([
        { dish: 'crêpes', ing: 'farine', unit: 'g', per: [25, 30, 37.5, 40, 50, 62.5] }, { dish: 'gâteau au chocolat', ing: 'chocolat', unit: 'g', per: [25, 30, 37.5, 40, 50] },
        { dish: 'quiche', ing: 'crème', unit: 'cL', per: [5, 6, 7.5, 10, 12.5] }, { dish: 'cookies', ing: 'beurre', unit: 'g', per: [12.5, 15, 20, 25] },
        { dish: 'soupe', ing: 'carottes', unit: 'g', per: [75, 100, 125, 150] },
      ])
      const p = pick([4, 6, 8]), u = pick(r.per), q = u * p
      if (!Number.isInteger(q)) return null
      if (Math.random() < 0.5) {
        const m = randInt(2, 15)
        if (m === p || m % p === 0 || !dec(u * m, 1)) return null
        return numeric(`Pour ${p} personnes, une recette de ${r.dish} demande ${q} ${r.unit} de ${r.ing}. Quelle quantité de ${r.ing} faut-il pour ${m} personnes (en ${r.unit}) ?`, u * m, {
          explanation: `Pour 1 personne : ${q} ÷ ${p} = ${fmt(u)} ${r.unit}. Pour ${m} personnes : ${fmt(u)} × ${m} = ${fmt(u * m)} ${r.unit}.`,
        })
      }
      const m = randInt(2, 15), Q = u * m
      if (m === p || m % p === 0 || !Number.isInteger(Q)) return null
      return numeric(`Pour ${p} personnes, une recette de ${r.dish} demande ${q} ${r.unit} de ${r.ing}. ${prenom()} n'a que ${Q} ${r.unit} de ${r.ing}. Pour combien de personnes peut-on préparer la recette, en respectant les proportions ?`, m, {
        explanation: `Pour 1 personne : ${q} ÷ ${p} = ${fmt(u)} ${r.unit}. Avec ${Q} ${r.unit} : ${Q} ÷ ${fmt(u)} = ${m} personnes.`,
      })
    }),
    model('Le plan de l’appartement', () => {
      const e = pick([50, 100, 200, 250]), L = randInt(6, 20) / 2, l = randInt(5, 14) / 2
      const Lc = (L * 100) / e, lc = (l * 100) / e
      if (!dec(Lc, 1) || !dec(lc, 1) || L === l) return null
      const [room, deRoom] = pick([['le salon', 'du salon'], ['la cuisine', 'de la cuisine'], ['la chambre', 'de la chambre'], ['le garage', 'du garage'], ['la terrasse', 'de la terrasse']])
      return numeric(`Sur le plan d'un appartement à l'échelle ${F(1, e)}, ${room} est un rectangle de ${fmt(Lc)} cm sur ${fmt(lc)} cm. Quelle est l'aire réelle ${deRoom} (en m²) ?`, L * l, {
        explanation: `1 cm sur le plan représente ${e} cm = ${fmt(e / 100)} m. Dimensions réelles : ${fmt(Lc)} × ${fmt(e / 100)} = ${fmt(L)} m et ${fmt(lc)} × ${fmt(e / 100)} = ${fmt(l)} m. Aire : ${fmt(L)} × ${fmt(l)} = ${fmt(L * l)} m².`,
      })
    }),
    model('La vitesse moyenne', () => {
      const w = pick([
        { who: 'Une cycliste', v: [15, 30] }, { who: 'Un coureur', v: [8, 16] }, { who: 'Un rameur', v: [6, 12] },
        { who: 'Une skieuse de fond', v: [10, 20] }, { who: 'Un roller', v: [12, 22] },
      ])
      const v = randInt(w.v[0], w.v[1]), t = pick([12, 15, 20, 24, 36, 40, 45, 48, 50, 75, 90])
      const d = (v * t) / 60
      if (!dec(d, 1)) return null
      return numeric(`${w.who} parcourt ${fmt(d)} km en ${t} min. Quelle est sa vitesse moyenne (en km/h) ?`, v, {
        explanation: `${fmt(d)} km ↔ ${t} min, et on cherche la distance pour 60 min : ${fmt(d)} × 60 ÷ ${t} = ${v} km/h.`,
      })
    }),
    model('Les soldes', () => {
      const r = pick([10, 15, 20, 25, 30, 35, 40, 50, 60]), P = 5 * randInt(4, 40)
      const item = pick(ITEMS)
      if (Math.random() < 0.6) {
        const N = (P * (100 - r)) / 100
        if (!dec(N, 2)) return null
        return numeric(`Pendant les soldes, le prix d'un ${item} passe de ${eur(P)} € à ${eur(N)} €. Quel est le pourcentage de réduction ?`, r, {
          explanation: `Réduction : ${eur(P)} − ${eur(N)} = ${eur(P - N)} €. ${eur(P - N)} ÷ ${P} = ${fmt(r / 100)}, soit ${r} %.`,
        })
      }
      const N = (P * (100 + r)) / 100
      if (!dec(N, 2)) return null
      return numeric(`Le prix d'un abonnement à une plateforme de ${pick(['musique', 'films', 'jeux vidéo', 'livres audio'])} passe de ${eur(P)} € à ${eur(N)} € par an. De quel pourcentage a-t-il augmenté ?`, r, {
        explanation: `Hausse : ${eur(N)} − ${eur(P)} = ${eur(N - P)} €. ${eur(N - P)} ÷ ${P} = ${fmt(r / 100)}, soit ${r} %.`,
      })
    }),
    model('Le débit', () => {
      if (Math.random() < 0.5) {
        const r = pick([4, 5, 6, 7.5, 8, 12, 2.5, 3.5]), t1 = randInt(2, 6), V1 = r * t1, T = randInt(8, 40) / 2, V2 = r * T
        if (!dec(V1, 1) || !dec(V2, 1) || T === t1) return null
        return numeric(`Un robinet débite ${fmt(V1)} L d'eau en ${t1} minutes. Combien de minutes faut-il pour remplir un aquarium de ${fmt(V2)} L ?`, T, {
          explanation: `Débit : ${fmt(V1)} ÷ ${t1} = ${fmt(r)} L par minute. Durée : ${fmt(V2)} ÷ ${fmt(r)} = ${fmt(T)} min.`,
        })
      }
      const ppm = pick([12, 15, 18, 20, 24, 30]), t1 = randInt(2, 5), n1 = ppm * t1, n2 = randInt(3, 30) * 5
      const sec = (n2 / ppm) * 60
      if (!Number.isInteger(sec) || n2 === n1) return null
      return numeric(`Une imprimante imprime ${n1} pages en ${t1} minutes. Combien de secondes lui faut-il pour imprimer ${n2} pages ?`, sec, {
        explanation: `Elle imprime ${n1} ÷ ${t1} = ${ppm} pages par minute, soit une page toutes les 60 ÷ ${ppm} = ${fmt(60 / ppm)} s. Pour ${n2} pages : ${n2} × ${fmt(60 / ppm)} = ${sec} s.`,
      })
    }),
  ],
  [
    model('L’ingrédient qui manque', () => {
      const N = pick([12, 16, 20, 24, 30])
      const fp = pick([10, 12.5, 15, 20]), e = N / pick([4, 5, 6]), lp = pick([2, 2.5, 4, 5])
      if (!Number.isInteger(e)) return null
      const f = fp * N, l = lp * N
      if (!Number.isInteger(f) || !Number.isInteger(l)) return null
      const cF = randInt(N / 2, 3 * N), Fs = cF * fp
      const E = randInt(2, 12), cE = (E * N) / e
      const Ls = pick([0.5, 0.75, 1, 1.25, 1.5, 2]), cL = (Ls * 100) / lp
      if (!Number.isInteger(Fs) || !Number.isInteger(cL) || new Set([cF, cE, cL]).size < 3) return null
      const best = Math.min(cF, cE, cL)
      return numeric(`Une recette de ${N} crêpes demande ${f} g de farine, ${e} œufs et ${l} cL de lait. Il reste dans la cuisine ${Fs} g de farine, ${E} œufs et ${fmt(Ls)} L de lait. En respectant les proportions, combien de crêpes peut-on faire au maximum ?`, best, {
        explanation: `Farine : ${Fs} g ↔ ${Fs} ÷ ${f} × ${N} = ${cF} crêpes. Œufs : ${E} ↔ ${E} ÷ ${e} × ${N} = ${cE} crêpes. Lait : ${fmt(Ls * 100)} cL ↔ ${fmt(Ls * 100)} ÷ ${l} × ${N} = ${cL} crêpes. L'ingrédient qui manque le plus limite à ${best} crêpes.`,
      })
    }),
    model('Le trajet en deux étapes', () => {
      const w = pick([
        { who: 'Une automobiliste roule', v: [40, 110] }, { who: 'Un cycliste roule', v: [12, 28] }, { who: 'Un bateau navigue', v: [12, 40] },
      ])
      const v1 = 4 * randInt(w.v[0] / 4, w.v[1] / 4), v2 = 4 * randInt(w.v[0] / 4, w.v[1] / 4)
      const t1 = pick([30, 45, 60, 90, 120, 15, 75]), t2 = pick([30, 45, 60, 90, 120, 15, 75])
      const d1 = (v1 * t1) / 60, d2 = (v2 * t2) / 60, T = (t1 + t2) / 60, avg = (d1 + d2) / T
      if (v1 === v2 || !dec(avg, 1) || t1 === t2) return null
      return numeric(`${w.who} pendant ${dur(t1)} à ${v1} km/h, puis pendant ${dur(t2)} à ${v2} km/h. Quelle est sa vitesse moyenne sur l'ensemble du trajet (en km/h) ?`, avg, {
        explanation: `Distances : ${v1} × ${fmt(t1 / 60)} = ${fmt(d1)} km et ${v2} × ${fmt(t2 / 60)} = ${fmt(d2)} km. En tout ${fmt(d1 + d2)} km en ${fmt(T)} h : ${fmt(d1 + d2)} ÷ ${fmt(T)} = ${fmt(avg)} km/h.`,
      })
    }),
    model('Retrouver l’échelle', () => {
      const e = pick([10000, 20000, 25000, 50000, 100000, 200000, 250000]), d = randInt(4, 30) / 2
      const D = (d * e) / 100000
      if (!dec(D, 2) || D < 0.5) return null
      const what = pick(['deux villages', 'deux phares', 'deux sommets', 'deux châteaux', 'deux refuges'])
      return numeric(`Sur une carte, ${what} distants de ${fmt(D)} km à vol d'oiseau sont représentés à ${fmt(d)} cm l'un de l'autre. L'échelle de la carte s'écrit ${F(1, '?')}. Quel nombre remplace le « ? » ?`, e, {
        explanation: `${fmt(D)} km = ${fmt(D * 100000)} cm. ${fmt(d)} cm sur la carte ↔ ${fmt(D * 100000)} cm en réalité, donc 1 cm ↔ ${fmt(D * 100000)} ÷ ${fmt(d)} = ${e} cm.`,
      })
    }),
    model('Hausse puis baisse', () => {
      const P = 10 * randInt(2, 30), a = pick([10, 20, 25, 30, 40, 50]), b = pick([10, 20, 25, 30, 40, 50])
      const up = Math.random() < 0.5
      const mid = up ? (P * (100 + a)) / 100 : (P * (100 - a)) / 100
      const fin = up ? (mid * (100 - b)) / 100 : (mid * (100 + b)) / 100
      if (!dec(mid, 2) || !dec(fin, 2)) return null
      const item = pick(ITEMS)
      return numeric(`Un ${item} coûte ${P} €. Son prix ${up ? 'augmente' : 'baisse'} de ${a} %, puis le nouveau prix ${up ? 'baisse' : 'augmente'} de ${b} %. Quel est le prix final (en €) ?`, fin, {
        explanation: `${up ? 'Hausse' : 'Baisse'} : ${a} % de ${P} = ${eur((P * a) / 100)} €, nouveau prix ${eur(mid)} €. ${up ? 'Baisse' : 'Hausse'} : ${b} % de ${eur(mid)} = ${eur((mid * b) / 100)} €, prix final ${eur(fin)} €${a === b ? ' (ce n’est pas le prix de départ !)' : ''}.`,
      })
    }),
    model('Kilomètres par heure, mètres par seconde', () => {
      const v = randInt(0, 2)
      if (v === 0) {
        const kmh = 18 * randInt(1, 8), t = randInt(5, 40)
        const [who, il] = pick([['Un train régional', 'il'], ['Une voiture', 'elle'], ['Un cerf au galop', 'il'], ['Une moto', 'elle'], ['Un drone', 'il']])
        return numeric(`${who} se déplace à ${kmh} km/h. Quelle distance parcourt-${il} en ${t} secondes (en m) ?`, (kmh / 3.6) * t, {
          explanation: `${kmh} km/h = ${kmh * 1000} m en 3600 s, soit ${kmh * 1000} ÷ 3600 = ${fmt(kmh / 3.6)} m par seconde. En ${t} s : ${fmt(kmh / 3.6)} × ${t} = ${fmt((kmh / 3.6) * t)} m.`,
        })
      }
      if (v === 1) {
        const ms = randInt(5, 35)
        const who = pick(['Un guépard', 'Un faucon en piqué', 'Un TGV au démarrage', 'Un skieur de vitesse'])
        return numeric(`${who} atteint la vitesse de ${ms} m/s. Combien cela fait-il en km/h ?`, ms * 3.6, {
          explanation: `En 1 h = 3600 s, on parcourt ${ms} × 3600 = ${ms * 3600} m = ${fmt(ms * 3.6)} km : ${fmt(ms * 3.6)} km/h.`,
        })
      }
      const t = pick([10, 12, 20, 25, 40, 50]), ms = pick([2, 4, 5, 6, 8, 9, 10]), d = ms * t
      return numeric(`Un sprinteur parcourt ${d} m en ${t} secondes à vitesse constante. Quelle est sa vitesse en km/h ?`, ms * 3.6, {
        explanation: `${d} ÷ ${t} = ${ms} m par seconde. En 3600 s : ${ms} × 3600 = ${ms * 3600} m = ${fmt(ms * 3.6)} km, donc ${fmt(ms * 3.6)} km/h.`,
      })
    }),
  ],
  [
    model('L’aller-retour', () => {
      const [v1, v2] = shuffle(pick([[60, 40], [30, 20], [90, 60], [15, 10], [12, 6], [20, 5], [60, 30], [120, 80], [24, 12], [40, 10], [45, 30], [75, 50], [100, 150]]))
      const avg = (2 * v1 * v2) / (v1 + v2)
      const L = (v1 * v2) / gcd(v1, v2)
      const D = (L / 4) * randInt(1, 12)
      if (D < 10 || D > 300 || !dec(D, 1)) return null
      const t1 = D / v1, t2 = D / v2
      const how = Math.max(v1, v2) <= 30 ? 'à vélo' : 'en voiture'
      const p = prenom()
      return numeric(`${p} fait ${how} l'aller-retour entre deux villes distantes de ${fmt(D)} km. À l'aller, la vitesse moyenne est de ${v1} km/h ; au retour, de ${v2} km/h. Quelle est la vitesse moyenne sur l'ensemble du trajet (en km/h) ?`, avg, {
        explanation: `Aller : ${fmt(D)} ÷ ${v1} = ${fmt(t1)} h ; retour : ${fmt(D)} ÷ ${v2} = ${fmt(t2)} h. En tout ${fmt(2 * D)} km en ${fmt(t1 + t2)} h : ${fmt(2 * D)} ÷ ${fmt(t1 + t2)} = ${fmt(avg)} km/h (et non ${fmt((v1 + v2) / 2)}, la moyenne des deux vitesses).`,
      })
    }),
    model('Le sirop', () => {
      const r = randInt(5, 8), p = prenom()
      if (Math.random() < 0.5) {
        const m = pick([10, 15, 20, 25, 30, 40, 50]), w = randInt(2, Math.floor((r * m) / 10) - 1) / 10
        const add = r * m - 100 * w
        if (!dec(w, 1) || add <= 0) return null
        return numeric(`Sur une bouteille de sirop, on lit : « 1 volume de sirop pour ${r} volumes d'eau ». ${p} a versé ${m} cL de sirop et ${fmt(w)} L d'eau dans une carafe. Combien de cL d'eau faut-il encore ajouter pour respecter la recette ?`, add, {
          explanation: `Pour ${m} cL de sirop, il faut ${r} × ${m} = ${r * m} cL d'eau. Il y en a ${fmt(w)} L = ${fmt(100 * w)} cL : il manque ${r * m} − ${fmt(100 * w)} = ${fmt(add)} cL.`,
        })
      }
      const W = 10 * randInt(10, 30), need = W / r, m = randInt(1, Math.floor(need) - 1)
      if (!dec(need, 1) || need - m <= 0) return null
      return numeric(`Sur une bouteille de sirop, on lit : « 1 volume de sirop pour ${r} volumes d'eau ». ${p} a versé ${fmt(W / 100)} L d'eau et seulement ${m} cL de sirop dans une carafe. Combien de cL de sirop faut-il encore ajouter pour respecter la recette ?`, need - m, {
        explanation: `${fmt(W / 100)} L = ${W} cL d'eau, qui demandent ${W} ÷ ${r} = ${fmt(need)} cL de sirop. Il manque ${fmt(need)} − ${m} = ${fmt(need - m)} cL de sirop.`,
      })
    }),
    model('Le lac sur la carte', () => {
      const e = pick([10000, 20000, 25000, 50000]), a = randInt(3, 16) / 2, b = randInt(2, 10) / 2
      const A = (a * e) / 100, B = (b * e) / 100, m2 = A * B, ha = m2 / 10000
      if (a === b || !dec(ha, 2) || ha > 2000) return null
      return numeric(`Sur une carte à l'échelle ${F(1, e)}, un lac a à peu près la forme d'un rectangle de ${fmt(a)} cm sur ${fmt(b)} cm. Quelle est son aire réelle, en hectares ? (1 ha = 10 000 m²)`, ha, {
        explanation: `1 cm sur la carte ↔ ${e} cm = ${e / 100} m. Dimensions réelles : ${fmt(A)} m × ${fmt(B)} m = ${fmt(m2)} m², soit ${fmt(m2)} ÷ 10 000 = ${fmt(ha)} ha.`,
      })
    }),
    model('Avant le changement de prix', () => {
      const p = pick([5, 10, 15, 20, 25, 30, 40, 50]), P = randInt(4, 80) * 5, up = Math.random() < 0.6
      const N = (P * (up ? 100 + p : 100 - p)) / 100
      if (!dec(N, 2)) return null
      const item = pick(ITEMS)
      return withMeta(numeric(`Après ${up ? 'une hausse' : 'une baisse'} de ${p} %, un ${item} coûte ${eur(N)} €. Quel était son prix avant ${up ? 'la hausse' : 'la baisse'} (en €) ?`, P, {
        explanation: `Le nouveau prix représente ${up ? `100 + ${p}` : `100 − ${p}`} = ${up ? 100 + p : 100 - p} % de l'ancien : ${up ? 100 + p : 100 - p} % ↔ ${eur(N)} €. Donc 100 % ↔ ${eur(N)} × 100 ÷ ${up ? 100 + p : 100 - p} = ${eur(P)} € (et non ${eur(N)} ${up ? '−' : '+'} ${p} % de ${eur(N)}).`,
      }), { title: up ? 'Avant la hausse' : 'Avant la baisse' })
    }),
    model('La rencontre', () => {
      const D = randInt(20, 90), v1 = 2 * randInt(6, 15), v2 = 2 * randInt(6, 15), delay = pick([0, 0, 15, 20, 30])
      const rest = D - (v1 * delay) / 60
      const after = (rest / (v1 + v2)) * 60
      if (rest <= 0 || !Number.isInteger(after) || after < 20) return null
      const [A, B] = deuxPrenoms()
      const tot = delay + after
      return numeric(`Deux villages sont distants de ${D} km. ${A} part du premier à vélo à ${v1} km/h ; ${delay ? `${delay} minutes plus tard` : 'au même moment'}, ${B} part du second, à sa rencontre, à ${v2} km/h. Combien de minutes après le départ de ${A} vont-ils se croiser ?`, tot, {
        explanation: `${delay ? `Pendant les ${delay} premières minutes, ${A} parcourt ${v1} × ${fmt(delay / 60)} = ${fmt((v1 * delay) / 60)} km ; il reste ${fmt(rest)} km. ` : ''}Ensemble, ils se rapprochent de ${v1} + ${v2} = ${v1 + v2} km par heure : ${fmt(rest)} km prennent ${fmt(rest)} ÷ ${v1 + v2} × 60 = ${after} min.${delay ? ` Total : ${delay} + ${after} = ${tot} min.` : ''}`,
      })
    }),
  ],
]

// ═════════════════════════════ 5e-geo ══════════════════════════════════
type Pt = [number, number]
const add = (p: Pt, q: Pt, k = 1): Pt => [p[0] + k * q[0], p[1] + k * q[1]]
const unit = (p: Pt, q: Pt): Pt => {
  const l = Math.hypot(q[0] - p[0], q[1] - p[1])
  return [(q[0] - p[0]) / l, (q[1] - p[1]) / l]
}
/** Intersection de la demi-droite issue de P (direction u) avec l'axe des abscisses. */
const hitX = (P: Pt, u: Pt): Pt => add(P, u, -P[1] / u[1])
const NAMES3 = [['A', 'B', 'C'], ['R', 'S', 'T'], ['E', 'F', 'G'], ['K', 'L', 'M'], ['P', 'Q', 'R']] as const
const NAMES4 = [['A', 'B', 'C', 'D'], ['E', 'F', 'G', 'H'], ['M', 'N', 'P', 'Q'], ['R', 'S', 'T', 'U']] as const
type Corner = 'ne' | 'nw' | 'se' | 'sw'

const geo: Ladder = [
  [
    model('Les deux parallèles', () => {
      const alpha = randInt(38, 76)
      const corners: Corner[] = ['ne', 'nw', 'se', 'sw']
      const val = (c: Corner) => (c === 'ne' || c === 'sw' ? alpha : 180 - alpha)
      const kAt = pick(['I', 'J'] as const), aAt = kAt === 'I' ? 'J' : 'I'
      const kc = pick(corners), ac = pick(corners)
      const altInt = (kAt === 'I' && ((kc === 'se' && ac === 'nw') || (kc === 'sw' && ac === 'ne'))) || (kAt === 'J' && ((kc === 'nw' && ac === 'se') || (kc === 'ne' && ac === 'sw')))
      if (kc === ac || altInt) return null
      // les noms I (au nord-ouest) et J (au sud-est) chevaucheraient l'arc
      if ((kAt === 'I' && kc === 'nw') || (kAt === 'J' && kc === 'se') || (aAt === 'I' && ac === 'nw') || (aAt === 'J' && ac === 'se')) return null
      const kv = val(kc), av = val(ac)
      const opp = val(kc) === val(ac)
      const figure = parallelsFigure({ tilt: alpha, known: { at: kAt, corner: kc, label: `${kv}°` }, asked: { at: aAt, corner: ac, label: '?' } })
      return withMeta(numeric(`Les droites (d) et (d′) sont parallèles ; une sécante les coupe en I et J (voir la figure). L'angle de sommet ${kAt} mesure ${kv}°. Combien mesure l'angle marqué « ? » en ${aAt} (en °) ?`, av, {
        explanation: `Angles correspondants (droites parallèles) : en ${aAt}, l'angle placé au même endroit que l'angle connu mesure aussi ${kv}°. Cet angle et l'angle cherché sont ${opp ? `opposés par le sommet, donc égaux : ${av}°` : `adjacents sur une même droite, donc supplémentaires : 180 − ${kv} = ${av}°`}.`,
      }), { figure })
    }),
    model('L’angle extérieur', () => {
      const [A, B, C, D] = pick(NAMES4)
      const a = randInt(35, 80), b = randInt(30, 75)
      if (a + b > 150 || Math.abs(a - b) < 6) return null
      const e = a + b, askA = Math.random() < 0.5
      const raw = triangleFromAngles(a, b)
      const Dp = add(raw.C, [raw.C[0] - raw.B[0], raw.C[1] - raw.B[1]], 0.55)
      const known = askA ? { v: B, x: b, s: ang(A, B, C) } : { v: A, x: a, s: ang(B, A, C) }
      const target = askA ? A : B
      const figure = freeFig({ [A]: raw.A, [B]: raw.B, [C]: raw.C, [D]: Dp }, {
        segments: [{ a: A, b: B }, { a: B, b: D }, { a: C, b: A }],
        angles: [
          { vertex: C, a: D, b: A, label: `${e}°` },
          askA ? { vertex: B, a: A, b: C, label: `${b}°` } : { vertex: A, a: B, b: C, label: `${a}°` },
          askA ? { vertex: A, a: B, b: C, label: '?', color: RED } : { vertex: B, a: A, b: C, label: '?', color: RED },
        ],
      })
      return withMeta(numeric(`Dans le triangle ${A}${B}${C}, on a prolongé le côté [${B}${C}] au-delà de ${C} jusqu'au point ${D} (voir la figure). L'angle ${ang(D, C, A)} mesure ${e}° et l'angle ${known.s} mesure ${known.x}°. Combien mesure l'angle ${hat(target)} du triangle (en °) ?`, askA ? a : b, {
        explanation: `${ang(A, C, B)} = 180 − ${e} = ${180 - e}° (angles supplémentaires). Dans le triangle : ${hat(target)} = 180 − ${180 - e} − ${known.x} = ${askA ? a : b}°. (L'angle extérieur vaut la somme des deux autres angles du triangle.)`,
      }), { figure })
    }),
    model('Le pignon du toit', () => {
      const [A, B, C, D] = pick(NAMES4)
      const e = randInt(100, 140), base = 180 - e, apex = 180 - 2 * base
      const pA: Pt = [3, 3 * Math.tan(rad(base))]
      const figure = freeFig({ [A]: pA, [B]: [0, 0], [C]: [6, 0], [D]: [-2.6, 0] }, {
        segments: [{ a: A, b: B, mark: 'tick' }, { a: A, b: C, mark: 'tick' }, { a: D, b: C }],
        angles: [{ vertex: B, a: D, b: A, label: `${e}°` }, { vertex: A, a: B, b: C, label: '?', color: RED }],
      })
      return withMeta(numeric(`Le pignon d'une maison a la forme d'un triangle ${A}${B}${C} isocèle en ${A}. On prolonge [${C}${B}] au-delà de ${B} jusqu'au point ${D} : l'angle ${ang(D, B, A)} mesure ${e}° (voir la figure). Combien mesure l'angle au sommet ${hat(A)} (en °) ?`, apex, {
        explanation: `${ang(A, B, C)} = 180 − ${e} = ${base}° (angles supplémentaires). Le triangle est isocèle en ${A}, donc ${hat(C)} = ${base}° aussi. Enfin ${hat(A)} = 180 − 2 × ${base} = ${apex}°.`,
      }), { figure })
    }),
    model('Le parallélogramme', () => {
      const [A, B, C, D] = pick(NAMES4)
      let va: number, vb: number, rel: string, how: string
      if (Math.random() < 0.5) {
        const d = 2 * randInt(5, 50)
        const big = (180 + d) / 2, small = (180 - d) / 2
        const aBig = Math.random() < 0.5
        va = aBig ? big : small
        vb = aBig ? small : big
        rel = aBig ? `l'angle ${hat(A)} mesure ${d}° de plus que l'angle ${hat(B)}` : `l'angle ${hat(B)} mesure ${d}° de plus que l'angle ${hat(A)}`
        how = `Deux angles consécutifs sont supplémentaires : ${hat(A)} + ${hat(B)} = 180°. Le plus grand vaut (180 + ${d}) ÷ 2 = ${big}° et le plus petit (180 − ${d}) ÷ 2 = ${small}°`
      } else {
        const k = pick([2, 3, 4, 5])
        const small = 180 / (k + 1), big = 180 - small
        const aBig = Math.random() < 0.5
        va = aBig ? big : small
        vb = aBig ? small : big
        rel = aBig ? `l'angle ${hat(A)} est ${k} fois plus grand que l'angle ${hat(B)}` : `l'angle ${hat(B)} est ${k} fois plus grand que l'angle ${hat(A)}`
        how = `Deux angles consécutifs sont supplémentaires : ${hat(A)} + ${hat(B)} = 180°, soit ${k + 1} fois le plus petit. Le plus petit vaut 180 ÷ ${k + 1} = ${small}° et le plus grand ${big}°`
      }
      const ask = pick([C, D])
      const ans = ask === C ? va : vb
      const pD: Pt = [3.6 * Math.cos(rad(va)), 3.6 * Math.sin(rad(va))]
      const figure = freeFig({ [A]: [0, 0], [B]: [6, 0], [C]: add([6, 0], pD), [D]: pD }, {
        segments: [{ a: A, b: B }, { a: B, b: C }, { a: C, b: D }, { a: D, b: A }],
        angles: [ask === C ? { vertex: C, a: B, b: D, label: '?', color: RED } : { vertex: D, a: C, b: A, label: '?', color: RED }],
      })
      return withMeta(numeric(`${A}${B}${C}${D} est un parallélogramme et ${rel}. Combien mesure l'angle ${hat(ask)} (en °) ?`, ans, {
        explanation: `${how}. Les angles opposés d'un parallélogramme sont égaux : ${hat(ask)} = ${ask === C ? hat(A) : hat(B)} = ${ans}°.`,
      }), { figure })
    }),
    model('Les droites sécantes', () => {
      const [P, Q, R, S] = pick([['A', 'B', 'C', 'D'], ['E', 'F', 'G', 'H'], ['P', 'Q', 'R', 'S'], ['K', 'L', 'M', 'N']])
      let th: number, rel: string, how: string
      if (Math.random() < 0.5) {
        const k = pick([2, 3, 4, 5, 8, 9])
        th = 180 / (k + 1)
        rel = `l'angle ${ang(Q, 'O', R)} mesure ${k} fois l'angle ${ang(P, 'O', Q)}`
        how = `${ang(P, 'O', Q)} et ${ang(Q, 'O', R)} sont supplémentaires : ensemble ils font ${k + 1} fois ${ang(P, 'O', Q)}, donc ${ang(P, 'O', Q)} = 180 ÷ ${k + 1} = ${th}° et ${ang(Q, 'O', R)} = ${180 - th}°`
      } else {
        const d = 2 * randInt(10, 60)
        th = (180 - d) / 2
        rel = `l'angle ${ang(Q, 'O', R)} mesure ${d}° de plus que l'angle ${ang(P, 'O', Q)}`
        how = `${ang(P, 'O', Q)} et ${ang(Q, 'O', R)} sont supplémentaires : ${ang(P, 'O', Q)} = (180 − ${d}) ÷ 2 = ${th}° et ${ang(Q, 'O', R)} = ${180 - th}°`
      }
      const askSmall = Math.random() < 0.5
      const asked = askSmall ? ang(R, 'O', S) : ang(S, 'O', P)
      const ans = askSmall ? th : 180 - th
      const t = rad(Math.max(th, 24))
      const q: Pt = [4 * Math.cos(t), 4 * Math.sin(t)]
      const figure = freeFig({ O: [0, 0], [P]: [4.4, 0], [Q]: q, [R]: [-4.4, 0], [S]: [-q[0], -q[1]] }, {
        pos: { O: 'n' },
        segments: [{ a: P, b: R }, { a: Q, b: S }],
        angles: [
          askSmall ? { vertex: 'O', a: R, b: S, label: '?', color: RED } : { vertex: 'O', a: S, b: P, label: '?', color: RED },
        ],
      })
      return withMeta(numeric(`Les droites (${P}${R}) et (${Q}${S}) se coupent en O (voir la figure) et ${rel}. Combien mesure l'angle ${asked} (en °) ?`, ans, {
        explanation: `${how}. L'angle ${asked} est opposé par le sommet à ${askSmall ? ang(P, 'O', Q) : ang(Q, 'O', R)}, donc il mesure ${ans}°.`,
      }), { figure })
    }),
  ],
  [
    model('La parallèle au sommet', () => {
      const [A, B, C] = pick(NAMES3)
      const [D, E] = A === 'A' ? ['D', 'E'] : ['X', 'Y']
      const a = randInt(35, 75), b = randInt(35, 75), c = 180 - a - b
      if (c < 35) return null
      const raw = triangleFromAngles(a, b)
      const pts = { [A]: raw.A, [B]: raw.B, [C]: raw.C, [D]: add(raw.C, [-2.6, 0]), [E]: add(raw.C, [2.6, 0]) }
      const segs: FigSegment[] = [{ a: A, b: B, mark: 'arrow' }, { a: B, b: C }, { a: C, b: A }, { a: D, b: E, mark: 'arrow' }]
      if (Math.random() < 0.5) {
        const figure = freeFig(pts, {
          segments: segs,
          angles: [{ vertex: C, a: D, b: A, label: `${a}°`, radius: 24 }, { vertex: B, a: A, b: C, label: `${b}°` }, { vertex: C, a: A, b: B, label: '?', color: RED, radius: 16 }],
        })
        return withMeta(numeric(`Dans le triangle ${A}${B}${C}, la droite (${D}${E}) passe par ${C} et est parallèle à (${A}${B}) (voir la figure). On sait que ${ang(D, C, A)} = ${a}° et ${hat(B)} = ${b}°. Combien mesure l'angle ${ang(A, C, B)} (en °) ?`, c, {
          explanation: `${ang(D, C, A)} et ${ang(C, A, B)} sont alternes-internes, avec (${D}${E}) // (${A}${B}) et la sécante (${A}${C}) : ${hat(A)} = ${a}°. Dans le triangle : ${ang(A, C, B)} = 180 − ${a} − ${b} = ${c}°.`,
        }), { figure })
      }
      const figure = freeFig(pts, {
        segments: segs,
        angles: [{ vertex: A, a: B, b: C, label: `${a}°` }, { vertex: C, a: A, b: B, label: `${c}°`, radius: 16 }, { vertex: C, a: E, b: B, label: '?', color: RED, radius: 24 }],
      })
      return withMeta(numeric(`Dans le triangle ${A}${B}${C}, la droite (${D}${E}) passe par ${C} et est parallèle à (${A}${B}) (voir la figure). On sait que ${hat(A)} = ${a}° et ${ang(A, C, B)} = ${c}°. Combien mesure l'angle ${ang(E, C, B)} (en °) ?`, b, {
        explanation: `Dans le triangle : ${hat(B)} = 180 − ${a} − ${c} = ${b}°. ${ang(E, C, B)} et ${ang(C, B, A)} sont alternes-internes, avec (${D}${E}) // (${A}${B}) et la sécante (${B}${C}) : ${ang(E, C, B)} = ${b}°.`,
      }), { figure })
    }),
    model('La bissectrice', () => {
      const [A, B, C] = pick(NAMES3)
      const D = A === 'A' ? 'D' : 'I'
      const a = randInt(30, 85), b = randInt(30, 85), c = 180 - a - b
      if (c < 30 || c % 2 !== 0) return null
      const raw = triangleFromAngles(a, b)
      const u = add(unit(raw.C, raw.A), unit(raw.C, raw.B))
      const pD = hitX(raw.C, u)
      const onA = Math.random() < 0.5
      const ans = onA ? 180 - a - c / 2 : 180 - b - c / 2
      const figure = freeFig({ [A]: raw.A, [B]: raw.B, [C]: raw.C, [D]: pD }, {
        pos: { [D]: 's' },
        segments: [{ a: A, b: B }, { a: B, b: C }, { a: C, b: A }, { a: C, b: D }],
        angles: [
          { vertex: A, a: B, b: C, label: `${a}°` }, { vertex: B, a: A, b: C, label: `${b}°` },
          { vertex: C, a: A, b: D, radius: 18 }, { vertex: C, a: D, b: B, radius: 22 },
          onA ? { vertex: D, a: A, b: C, label: '?', color: RED } : { vertex: D, a: C, b: B, label: '?', color: RED },
        ],
      })
      const tri = onA ? `${A}${D}${C}` : `${B}${D}${C}`
      return withMeta(numeric(`Dans le triangle ${A}${B}${C}, ${hat(A)} = ${a}° et ${hat(B)} = ${b}°. La bissectrice de l'angle ${hat(C)} coupe [${A}${B}] en ${D} (voir la figure). Combien mesure l'angle ${onA ? ang(A, D, C) : ang(B, D, C)} (en °) ?`, ans, {
        explanation: `${hat(C)} = 180 − ${a} − ${b} = ${c}°, donc la bissectrice donne ${onA ? ang(A, C, D) : ang(B, C, D)} = ${c / 2}°. Dans le triangle ${tri} : ${onA ? ang(A, D, C) : ang(B, D, C)} = 180 − ${onA ? a : b} − ${c / 2} = ${ans}°.`,
      }), { figure })
    }),
    model('Les baguettes', () => {
      const L = shuffle(Array.from({ length: 15 }, (_, i) => i + 2)).slice(0, 5).sort((x, y) => x - y)
      const ok: number[][] = []
      for (let i = 0; i < 5; i++) for (let j = i + 1; j < 5; j++) for (let k = j + 1; k < 5; k++) if (L[i] + L[j] > L[k]) ok.push([L[i], L[j], L[k]])
      if (ok.length < 2 || ok.length > 8) return null
      return numeric(`${prenom()} a cinq baguettes de ${L.slice(0, 4).join(' cm, ')} cm et ${L[4]} cm. Combien de triangles différents peut-on construire en choisissant trois de ces baguettes (une baguette par côté) ?`, ok.length, {
        explanation: `Trois longueurs forment un triangle si la plus grande est strictement inférieure à la somme des deux autres. Sur les 10 choix possibles, ${ok.length} conviennent : ${ok.map((t) => `(${t.join(' ; ')})`).join(', ')}.`,
      })
    }),
    model('La somme des angles du quadrilatère', () => {
      const [A, B, C, D] = pick(NAMES4)
      const va = randInt(55, 130), vb = randInt(55, 130), vc = randInt(55, 130), vd = 360 - va - vb - vc
      if (vd < 50 || vd > 150) return null
      const dir = (t: number): Pt => [Math.cos(rad(t)), Math.sin(rad(t))]
      const d1 = 180 - vb, d2 = d1 + 180 - vc, d3 = d2 + 180 - vd
      const u2 = dir(d2), u3 = dir(d3)
      let sol: [number, number, number] | null = null
      for (const l2 of [4, 3.5, 4.5, 3, 5, 5.5]) {
        const r: Pt = [-(6 + l2 * dir(d1)[0]), -(l2 * dir(d1)[1])]
        const det = u2[0] * u3[1] - u3[0] * u2[1]
        const l3 = (r[0] * u3[1] - u3[0] * r[1]) / det, l4 = (u2[0] * r[1] - r[0] * u2[1]) / det
        if (l3 > 2.5 && l4 > 2.5 && l3 < 9 && l4 < 9) { sol = [l2, l3, l4]; break }
      }
      if (!sol) return null
      const pB: Pt = [6, 0], pC = add(pB, dir(d1), sol[0]), pD = add(pC, u2, sol[1])
      const figure = freeFig({ [A]: [0, 0], [B]: pB, [C]: pC, [D]: pD }, {
        segments: [{ a: A, b: B }, { a: B, b: C }, { a: C, b: D }, { a: D, b: A }, { a: A, b: C, dashed: true }],
        angles: [
          { vertex: A, a: B, b: D, label: `${va}°` }, { vertex: B, a: C, b: A, label: `${vb}°` },
          { vertex: C, a: D, b: B, label: `${vc}°` }, { vertex: D, a: A, b: C, label: '?', color: RED },
        ],
      })
      return withMeta(numeric(`${A}${B}${C}${D} est un quadrilatère (voir la figure). La diagonale [${A}${C}] le partage en deux triangles. Sachant que ${hat(A)} = ${va}°, ${hat(B)} = ${vb}° et ${hat(C)} = ${vc}°, combien mesure ${hat(D)} (en °) ?`, vd, {
        explanation: `Les angles des triangles ${A}${B}${C} et ${A}${C}${D} recouvrent exactement ceux du quadrilatère : la somme des angles de ${A}${B}${C}${D} vaut 2 × 180 = 360°. Donc ${hat(D)} = 360 − ${va} − ${vb} − ${vc} = ${vd}°.`,
      }), { figure })
    }),
    model('La diagonale du parallélogramme', () => {
      const [A, B, C, D] = pick(NAMES4)
      const be = randInt(60, 130), b = randInt(20, 50), g = 180 - be - b
      if (g < 20) return null
      const s = (6 * Math.sin(rad(b))) / Math.sin(rad(g))
      if (s < 2.2 || s > 8) return null
      const pC = add([6, 0], [Math.cos(rad(180 - be)), Math.sin(rad(180 - be))], s)
      const figure = freeFig({ [A]: [0, 0], [B]: [6, 0], [C]: pC, [D]: add(pC, [-6, 0]) }, {
        segments: [{ a: A, b: B }, { a: B, b: C }, { a: C, b: D }, { a: D, b: A }, { a: A, b: C }],
        angles: [{ vertex: B, a: C, b: A, label: `${be}°` }, { vertex: A, a: B, b: C, label: `${b}°`, radius: 30 }, { vertex: A, a: C, b: D, label: '?', color: RED, radius: 20 }],
      })
      return withMeta(numeric(`${A}${B}${C}${D} est un parallélogramme et [${A}${C}] est une de ses diagonales (voir la figure). On sait que ${ang(A, B, C)} = ${be}° et ${ang(B, A, C)} = ${b}°. Combien mesure l'angle ${ang(C, A, D)} (en °) ?`, g, {
        explanation: `Dans le triangle ${A}${B}${C} : ${ang(A, C, B)} = 180 − ${be} − ${b} = ${g}°. Les côtés (${A}${D}) et (${B}${C}) sont parallèles : ${ang(C, A, D)} et ${ang(A, C, B)} sont alternes-internes (sécante (${A}${C})), donc ${ang(C, A, D)} = ${g}°.`,
      }), { figure })
    }),
    model('Le triangle isocèle mystère', () => {
      const a = randInt(2, 8), b = randInt(2 * a, 2 * a + 8)
      return numeric(`Un triangle isocèle a un côté de ${a} cm et un autre côté de ${b} cm. Quel est son périmètre (en cm) ?`, 2 * b + a, {
        explanation: `Deux possibilités : ${a}, ${a}, ${b} ou ${b}, ${b}, ${a}. La première est impossible : ${a} + ${a} = ${2 * a} n'est pas strictement plus grand que ${b} (inégalité triangulaire). Les côtés mesurent donc ${b}, ${b} et ${a} cm : P = ${2 * b + a} cm.`,
      })
    }),
  ],
  [
    model('Le zigzag entre deux parallèles', () => {
      const al = randInt(25, 70), be = randInt(25, 70)
      if (Math.abs(al - be) < 5) return null
      const pA: Pt = [0, 4], pB: Pt = [randInt(-10, 10) / 10, 0]
      const u: Pt = [Math.cos(rad(al)), -Math.sin(rad(al))], v: Pt = [Math.cos(rad(be)), Math.sin(rad(be))]
      // pA + t u = pB + s v
      const det = u[0] * -v[1] - -v[0] * u[1]
      const rx = pB[0] - pA[0], ry = pB[1] - pA[1]
      const t = (rx * -v[1] - -v[0] * ry) / det
      const M = add(pA, u, t)
      const xr = M[0] + 2.5
      const f = freeFig({ A: pA, B: pB, M, A1: [-2.5, 4], A2: [xr, 4], B1: [-2.5, 0], B2: [xr, 0] }, {
        hide: ['A1', 'A2', 'B1', 'B2'],
        pos: { A: 'n', B: 's', M: 'e' },
        segments: [{ a: 'A1', b: 'A2', mark: 'arrow' }, { a: 'B1', b: 'B2', mark: 'arrow' }, { a: 'A', b: 'M' }, { a: 'M', b: 'B' }],
        angles: [
          { vertex: 'A', a: 'A2', b: 'M', label: `${al}°`, radius: 24 },
          { vertex: 'B', a: 'B2', b: 'M', label: `${be}°`, radius: 24 },
          { vertex: 'M', a: 'A', b: 'B', label: '?', color: RED },
        ],
      })
      const figure: Figure = { ...f, notes: [{ x: f.points.A1.x + 8, y: f.points.A1.y - 8, text: '(d)' }, { x: f.points.B1.x + 8, y: f.points.B1.y - 8, text: '(d′)' }] }
      const why = `On trace par M la parallèle à (d) (elle est aussi parallèle à (d′)). Elle partage ${ang('A', 'M', 'B')} en deux angles : l'un est alterne-interne avec l'angle marqué en A (sécante (AM)), l'autre avec l'angle marqué en B (sécante (BM)). Donc ${ang('A', 'M', 'B')} = ${al} + ${be} = ${al + be}°`
      if (Math.random() < 0.5) {
        return withMeta(numeric(`Les droites (d) et (d′) sont parallèles, A est sur (d), B est sur (d′) et le point M est situé entre les deux droites (voir la figure). L'angle marqué en A mesure ${al}° et celui marqué en B mesure ${be}°. Combien mesure l'angle ${ang('A', 'M', 'B')} (en °) ?`, al + be, {
          explanation: `${why}.`,
        }), { figure })
      }
      const fig2: Figure = { ...figure, angles: [figure.angles![0], { ...figure.angles![1], label: '?', color: RED }, { ...figure.angles![2], label: `${al + be}°`, color: undefined }] }
      return withMeta(numeric(`Les droites (d) et (d′) sont parallèles, A est sur (d), B est sur (d′) et le point M est situé entre les deux droites (voir la figure). L'angle marqué en A mesure ${al}° et l'angle ${ang('A', 'M', 'B')} mesure ${al + be}°. Combien mesure l'angle marqué « ? » en B (en °) ?`, be, {
        explanation: `${why} ; ici l'angle cherché vaut ${al + be} − ${al} = ${be}°.`,
      }), { figure: fig2 })
    }),
    model('Les angles d’un polygone', () => {
      const v = randInt(0, 2)
      const n = pick([5, 6, 8, 9, 10, 12])
      const S = 180 * (n - 2)
      const polyFig = (k: number): Figure => {
        const raw: Record<string, Pt> = {}
        for (let i = 0; i < k; i++) raw[`P${i}`] = [3 * Math.cos(rad(-90 + (360 * i) / k)), 3 * Math.sin(rad(-90 + (360 * i) / k))]
        const fg = freeFig(raw, { hide: Object.keys(raw).slice(1), pos: { P0: 's' } })
        fg.points.P0 = { ...fg.points.P0, label: '' }
        const segs: FigSegment[] = []
        for (let i = 0; i < k; i++) segs.push({ a: `P${i}`, b: `P${(i + 1) % k}` })
        for (let i = 2; i < k - 1; i++) segs.push({ a: 'P0', b: `P${i}`, dashed: true })
        return { ...fg, segments: segs }
      }
      if (v === 0) {
        return withMeta(numeric(`Un polygone régulier a ${n} côtés de même longueur et ${n} angles de même mesure. En traçant toutes les diagonales issues d'un même sommet, on le découpe en triangles (voir la figure). Combien mesure chacun de ses angles (en °) ?`, S / n, {
          explanation: `Les diagonales issues d'un sommet découpent le polygone en ${n} − 2 = ${n - 2} triangles, dont les angles recouvrent exactement ceux du polygone : la somme des angles vaut ${n - 2} × 180 = ${S}°. Chaque angle mesure ${S} ÷ ${n} = ${S / n}°.`,
        }), { figure: polyFig(n) })
      }
      if (v === 1) {
        const m = randInt(7, 15)
        return withMeta(numeric(`En traçant toutes les diagonales issues d'un même sommet, on découpe un polygone en triangles (voir l'exemple de la figure). Quelle est la somme des angles d'un polygone (non croisé) à ${m} côtés (en °) ?`, 180 * (m - 2), {
          explanation: `Depuis un sommet, on trace des diagonales vers tous les sommets sauf lui-même et ses deux voisins : on obtient ${m} − 2 = ${m - 2} triangles. Somme des angles : ${m - 2} × 180 = ${180 * (m - 2)}°.`,
        }), { figure: { ...polyFig(6), caption: 'Exemple avec un hexagone : 4 triangles.' } })
      }
      const X = S / n
      return numeric(`Chaque angle d'un polygone régulier mesure ${X}°. Combien ce polygone a-t-il de côtés ?`, n, {
        explanation: `Avec n côtés, la somme des angles vaut (n − 2) × 180 = n × 180 − 360, et aussi n × ${X}. Donc n × (180 − ${X}) = 360, soit n = 360 ÷ ${180 - X} = ${n}. Vérification : ${n - 2} × 180 = ${S} = ${n} × ${X}.`,
      })
    }),
    model('Deux triangles isocèles', () => {
      const [A, B, C] = pick(NAMES3)
      const D = A === 'A' ? 'D' : 'I'
      const a = 2 * randInt(10, 27), be = (180 - a) / 2
      const bd = (180 - Math.max(a, 36)) / 2 // forme du dessin (un triangle trop pointu serait illisible)
      const pA: Pt = [2, 2 * Math.tan(rad(bd))], pC: Pt = [4, 0]
      const pD = add(pC, unit(pC, pA), 8 * Math.cos(rad(bd)))
      const askABD = Math.random() < 0.5
      const ans = askABD ? be - a : 180 - be
      const figure = freeFig({ [A]: pA, [B]: [0, 0], [C]: pC, [D]: pD }, {
        segments: [{ a: A, b: B, mark: 'tick' }, { a: A, b: C, mark: 'tick' }, { a: B, b: C, mark: 'tick2' }, { a: B, b: D, mark: 'tick2' }],
        angles: [
          { vertex: A, a: B, b: C, label: `${a}°` },
          askABD ? { vertex: B, a: A, b: D, label: '?', color: RED, radius: 26 } : { vertex: D, a: A, b: B, label: '?', color: RED },
        ],
      })
      return withMeta(numeric(`Le triangle ${A}${B}${C} est isocèle en ${A}, avec ${hat(A)} = ${a}°. Le point ${D} est sur le côté [${A}${C}] et le triangle ${B}${C}${D} est isocèle en ${B} : ${B}${D} = ${B}${C} (voir la figure). Combien mesure l'angle ${askABD ? ang(A, B, D) : ang(A, D, B)} (en °) ?`, ans, {
        explanation: `Dans ${A}${B}${C} : ${hat(B)} = ${hat(C)} = (180 − ${a}) ÷ 2 = ${be}°. ${B}${C}${D} est isocèle en ${B}, donc ${ang(B, D, C)} = ${hat(C)} = ${be}°${askABD ? ` et ${ang(D, B, C)} = 180 − 2 × ${be} = ${a}°. Enfin ${ang(A, B, D)} = ${be} − ${a} = ${ans}°.` : `. Enfin ${ang(A, D, B)} = 180 − ${be} = ${ans}° (angles supplémentaires).`}`,
      }), { figure })
    }),
    model('Hauteur et bissectrice', () => {
      const [A, B, C] = pick(NAMES3)
      const [H, D] = A === 'A' ? ['H', 'D'] : ['U', 'V']
      const b = pick([...Array.from({ length: 18 }, (_, i) => 20 + i), ...Array.from({ length: 18 }, (_, i) => 53 + i)])
      const Lc = 7, pA: Pt = [Lc * Math.cos(rad(b)) ** 2, Lc * Math.cos(rad(b)) * Math.sin(rad(b))]
      const pH: Pt = [pA[0], 0]
      const pD = hitX(pA, add(unit(pA, [0, 0]), unit(pA, [Lc, 0])))
      const bah = 90 - b, ans = Math.abs(bah - 45)
      const figure = freeFig({ [A]: pA, [B]: [0, 0], [C]: [Lc, 0], [H]: pH, [D]: pD }, {
        pos: { [A]: 'n', [H]: 's', [D]: 's' },
        segments: [{ a: A, b: B }, { a: B, b: C }, { a: C, b: A }, { a: A, b: H, dashed: true }, { a: A, b: D }],
        angles: [
          { vertex: A, a: B, b: C, right: true }, { vertex: H, a: A, b: C, right: true },
          { vertex: B, a: C, b: A, label: `${b}°` }, { vertex: A, a: H, b: D, label: '?', color: RED, radius: 40 },
        ],
      })
      return withMeta(numeric(`Le triangle ${A}${B}${C} est rectangle en ${A} et ${hat(B)} = ${b}°. ${H} est le pied de la hauteur issue de ${A}, et ${D} est le point où la bissectrice de l'angle droit ${ang(B, A, C)} coupe [${B}${C}] (voir la figure). Combien mesure l'angle ${ang(H, A, D)} (en °) ?`, ans, {
        explanation: `Dans le triangle ${A}${B}${H} rectangle en ${H} : ${ang(B, A, H)} = 90 − ${b} = ${bah}°. La bissectrice partage l'angle droit : ${ang(B, A, D)} = 45°. Donc ${ang(H, A, D)} = ${bah > 45 ? `${bah} − 45` : `45 − ${bah}`} = ${ans}°.`,
      }), { figure })
    }),
    model('Les deux hauteurs', () => {
      const L = randInt(6, 14), h = randInt(3, 10), m = randInt(h + 2, 15)
      const hk = (L * h) / m
      if (!dec(hk, 1) || hk === h) return null
      const s = Math.sqrt(m * m - h * h)
      if (s > L - 1) return null
      const w: Pt = [s / m, h / m], proj = (L * s) / m
      const pK: Pt = [w[0] * proj, w[1] * proj]
      const pts: Record<string, Pt> = { A: [0, 0], B: [L, 0], C: [L + s, h], D: [s, h], H: [s, 0], K: pK }
      const segs: FigSegment[] = [
        { a: 'A', b: 'B', label: `${L} cm` }, { a: 'B', b: 'C' }, { a: 'C', b: 'D' }, { a: 'D', b: 'A', label: `${m} cm` },
        { a: 'D', b: 'H', dashed: true, label: `${h} cm` }, { a: 'B', b: 'K', dashed: true, label: '?' },
      ]
      if (proj > m) segs.push({ a: 'D', b: 'K', dashed: true })
      const figure = freeFig(pts, {
        hide: ['H', 'K'],
        segments: segs,
        angles: [{ vertex: 'H', a: 'D', b: 'B', right: true }, { vertex: 'K', a: 'B', b: 'A', right: true }],
      })
      return withMeta(numeric(`ABCD est un parallélogramme avec AB = ${L} cm et AD = ${m} cm. La hauteur relative au côté [AB] mesure ${h} cm (voir la figure). Combien mesure la hauteur relative au côté [AD] (en cm) ?`, hk, {
        explanation: `L'aire d'un parallélogramme vaut « côté × hauteur relative à ce côté », quel que soit le côté choisi : ${L} × ${h} = ${L * h} cm². Avec le côté [AD] : ${m} × ? = ${L * h}, donc ? = ${L * h} ÷ ${m} = ${fmt(hk)} cm.`,
      }), { figure })
    }),
  ],
]

// ═════════════════════════════ 5e-stat ═════════════════════════════════
type Card = { r: string; s: string; red: boolean; fig: boolean }
const deck = (n: 32 | 52): Card[] => {
  const ranks = n === 32 ? ['7', '8', '9', '10', 'valet', 'dame', 'roi', 'as'] : ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'valet', 'dame', 'roi', 'as']
  return ['cœur', 'carreau', 'trèfle', 'pique'].flatMap((s) => ranks.map((r) => ({ r, s, red: s === 'cœur' || s === 'carreau', fig: ['valet', 'dame', 'roi'].includes(r) })))
}

const stat: Ladder = [
  [
    model('La moyenne d’un tableau', () => {
      const ctx = pick([
        { q: 'Nombre de buts marqués par match au cours de la saison', u: (v: number) => `${v} but${v > 1 ? 's' : ''}`, c: 'matchs', vals: [0, 1, 2, 3, 4] },
        { q: 'Nombre de frères et sœurs des élèves d’une classe', u: (v: number) => `${v}`, c: 'élèves', vals: [0, 1, 2, 3, 4] },
        { q: 'Nombre de livres lus pendant l’été par les membres d’un club', u: (v: number) => `${v} livre${v > 1 ? 's' : ''}`, c: 'membres', vals: [1, 2, 3, 4, 5, 6] },
        { q: 'Nombre de passagers par voiture à l’entrée d’un péage', u: (v: number) => `${v} passager${v > 1 ? 's' : ''}`, c: 'voitures', vals: [1, 2, 3, 4, 5] },
      ])
      const counts = ctx.vals.map(() => randInt(1, 9))
      const N = sum(counts), S = sum(ctx.vals.map((v, i) => v * counts[i])), m = S / N
      if (!dec(m, 2) || Number.isInteger(m)) return null
      return numeric(`${ctx.q} : ${ctx.vals.map((v, i) => `${ctx.u(v)} → ${counts[i]} ${ctx.c}`).join(' ; ')}. Quelle est la moyenne de cette série ?`, m, {
        explanation: `Effectif total : ${counts.join(' + ')} = ${N}. Somme des valeurs : ${ctx.vals.map((v, i) => `${v} × ${counts[i]}`).join(' + ')} = ${S}. Moyenne : ${S} ÷ ${N} = ${fmt(m)}.`,
      })
    }),
    model('Le sondage', () => {
      const N = pick([200, 250, 300, 400, 500, 600, 800]), p1 = randInt(15, 45), p2 = randInt(10, 35), p3 = 100 - p1 - p2
      const ans = (N * p3) / 100
      if (p3 < 10 || !Number.isInteger(ans)) return null
      const [t, a, b] = pick([
        ['leur sport préféré', 'le football', 'le basket'],
        ['leur moyen de transport pour venir au collège', 'le bus', 'la marche'],
        ['leur genre de film préféré', 'les comédies', 'les films d’action'],
        ['leur fruit préféré', 'la fraise', 'la mangue'],
      ])
      return numeric(`On a interrogé ${N} élèves sur ${t} : ${p1} % ont répondu ${a}, ${p2} % ${b}, et les autres ont donné une autre réponse. Combien d'élèves ont donné une autre réponse ?`, ans, {
        explanation: `Autres réponses : 100 − ${p1} − ${p2} = ${p3} %. ${p3} % de ${N} = ${N} × ${p3} ÷ 100 = ${ans} élèves.`,
      })
    }),
    model('Le jeu de cartes', () => {
      const n = pick([32, 52] as const), cards = deck(n)
      const ev = pick([
        { t: 'un cœur ou un roi', f: (c: Card) => c.s === 'cœur' || c.r === 'roi', why: (k: number) => `${k / 4} cœurs + 3 autres rois` },
        { t: 'une figure (valet, dame ou roi)', f: (c: Card) => c.fig, why: () => '3 figures dans chacune des 4 couleurs' },
        { t: 'un as ou une carte noire', f: (c: Card) => c.r === 'as' || !c.red, why: (k: number) => `${k / 2} cartes noires + 2 as rouges` },
        { t: 'une carte rouge qui n’est pas une figure', f: (c: Card) => c.red && !c.fig, why: (k: number) => `${k / 2} cartes rouges − 6 figures rouges` },
        { t: 'un pique ou une dame', f: (c: Card) => c.s === 'pique' || c.r === 'dame', why: (k: number) => `${k / 4} piques + 3 autres dames` },
      ])
      const fav = cards.filter(ev.f).length
      return fraction(`On tire une carte au hasard dans un jeu de ${n} cartes (4 couleurs : cœur et carreau en rouge, trèfle et pique en noir ; dans chaque couleur : ${n === 32 ? '7, 8, 9, 10' : 'de 2 à 10'}, valet, dame, roi, as). Quelle est la probabilité de tirer ${ev.t} ?`, fav, n, {
        explanation: `Cas favorables : ${ev.why(n)}, soit ${fav} cartes sur ${n}. Probabilité : ${F(fav, n)}${gcd(fav, n) > 1 ? ` = ${Fr(fav, n)}` : ''}.`,
      })
    }),
    model('Une note de plus', () => {
      const n = randInt(4, 9), m = randInt(16, 30) / 2, x = randInt(4, 20)
      const nm = (n * m + x) / (n + 1)
      if (!dec(nm, 2) || nm === m) return null
      const p = prenom()
      return numeric(`Après ${n} contrôles, ${p} a ${fmt(m)} de moyenne. Au contrôle suivant, ${p} obtient ${x}. Quelle est sa nouvelle moyenne ?`, nm, {
        explanation: `Total des ${n} premières notes : ${n} × ${fmt(m)} = ${fmt(n * m)}. Nouveau total : ${fmt(n * m)} + ${x} = ${fmt(n * m + x)}, pour ${n + 1} notes : ${fmt(n * m + x)} ÷ ${n + 1} = ${fmt(nm)}.`,
      })
    }),
    model('La valeur effacée', () => {
      const n = 7, M = randInt(-8, 10) / 2
      const known = Array.from({ length: n - 1 }, () => Math.round(M) + randInt(-6, 6))
      const x = n * M - sum(known)
      if (!Number.isInteger(x) || x < -12 || x > 15 || known.every((v) => v >= 0)) return null
      const pos = randInt(0, n - 1)
      const shown = [...known.slice(0, pos).map(fmt), '?', ...known.slice(pos).map(fmt)]
      const city = pick(['Strasbourg', 'Chamonix', 'Montréal', 'Oslo', 'Briançon', 'Helsinki'])
      return numeric(`Voici les températures relevées à midi pendant une semaine à ${city}, mais l'une d'elles a été effacée : ${shown.join(' ; ')} (en °C). La moyenne de la semaine est ${fmt(M)} °C. Quelle était la température effacée (en °C) ?`, x, {
        explanation: `Somme des 7 températures : 7 × ${par(M)} = ${fmt(n * M)}. Somme des 6 connues : ${fmt(sum(known))}. Température effacée : ${fmt(n * M)} − ${par(sum(known))} = ${fmt(x)} °C.`,
      })
    }),
  ],
  [
    model('Deux groupes, une classe', () => {
      const n1 = randInt(8, 18), n2 = randInt(8, 18), m1 = randInt(16, 30) / 2, m2 = randInt(16, 30) / 2
      const m = (n1 * m1 + n2 * m2) / (n1 + n2)
      if (Math.abs(m1 - m2) < 1.5 || !dec(m, 2) || n1 === n2) return null
      return numeric(`Dans une classe, les ${n1} élèves du groupe A ont ${fmt(m1)} de moyenne et les ${n2} élèves du groupe B ont ${fmt(m2)} de moyenne au même contrôle. Quelle est la moyenne de la classe entière ?`, m, {
        explanation: `Total des points : ${n1} × ${fmt(m1)} + ${n2} × ${fmt(m2)} = ${fmt(n1 * m1)} + ${fmt(n2 * m2)} = ${fmt(n1 * m1 + n2 * m2)}. Pour ${n1 + n2} élèves : ${fmt(n1 * m1 + n2 * m2)} ÷ ${n1 + n2} = ${fmt(m)} (et non ${fmt((m1 + m2) / 2)} : les groupes n'ont pas le même effectif).`,
      })
    }),
    model('Le contrôle qui compte double', () => {
      const a = randInt(5, 18), b = randInt(5, 18), c = randInt(5, 18), T = randInt(10, 15)
      const x = (5 * T - a - b - c) / 2
      if (x < 4 || x > 20 || !dec(x, 1) || x === T) return null
      return numeric(`${prenom()} a obtenu ${a}, ${b} et ${c} à trois contrôles de coefficient 1. Le contrôle final compte double (coefficient 2). Quelle note faut-il obtenir à ce contrôle final pour avoir exactement ${T} de moyenne ?`, x, {
        explanation: `Coefficients : 1 + 1 + 1 + 2 = 5, il faut donc un total de 5 × ${T} = ${5 * T} points. Les trois notes en apportent ${a + b + c} ; il en manque ${5 * T - a - b - c}, qui comptent double : la note doit être ${5 * T - a - b - c} ÷ 2 = ${fmt(x)}.`,
      })
    }),
    model('Pourcentages et effectifs', () => {
      const N = 20 * randInt(5, 30), p1 = pick([5, 10, 15, 20, 25, 30, 35, 40, 12, 45]), p2 = pick([10, 15, 20, 25, 30, 40, 45, 55])
      const c1 = (N * p1) / 100, c2 = (N * p2) / 100
      if (!Number.isInteger(c1) || !Number.isInteger(c2) || p1 + p2 > 100 || p1 === p2) return null
      if (N === 100) return null
      const [ctx, a, b, tot, q] = pick([
        ['Sur un parking', 'des voitures sont rouges', 'Les voitures grises représentent', 'voitures', 'Combien y a-t-il de voitures grises ?'],
        ['Dans une bibliothèque', 'des livres sont des BD', 'Les romans représentent', 'livres', 'Combien y a-t-il de romans ?'],
        ['Dans une forêt', 'des arbres sont des chênes', 'Les pins représentent', 'arbres', 'Combien y a-t-il de pins ?'],
        ['Dans un festival', 'des spectateurs sont venus en train', 'Les spectateurs venus à vélo représentent', 'spectateurs', 'Combien de spectateurs sont venus à vélo ?'],
      ])
      return numeric(`${ctx}, ${p1} % ${a}, ce qui représente ${c1} ${tot}. ${b} ${p2} % du total. ${q}`, c2, {
        explanation: `${p1} % ↔ ${c1}, donc 1 % ↔ ${c1} ÷ ${p1} = ${fmt(N / 100)} et le total vaut ${N} ${tot}. Enfin ${p2} % de ${N} = ${c2}.`,
      })
    }),
    model('Trois couleurs, aucun nombre', () => {
      const k = randInt(2, 5), j = randInt(1, 4), tot = 1 + k + j
      const v = randInt(0, 2)
      const [ev, fav] = v === 0 ? ['une boule rouge', 1] : v === 1 ? ['une boule qui n’est pas bleue', 1 + j] : ['une boule bleue', k]
      return fraction(`Un sac contient des boules rouges, bleues et vertes. Il y a ${k} fois plus de boules bleues que de rouges, et ${j === 1 ? 'autant de vertes que de rouges' : `${j} fois plus de vertes que de rouges`}. On tire une boule au hasard. Quelle est la probabilité de tirer ${ev} ?`, fav, tot, {
        explanation: `Pour chaque boule rouge, il y a ${k} bleues et ${j} verte${j > 1 ? 's' : ''} : les boules vont par paquets de ${tot}, dont ${fav} favorable${fav > 1 ? 's' : ''}. La probabilité vaut ${F(fav, tot)}${gcd(fav, tot) > 1 ? ` = ${Fr(fav, tot)}` : ''}, quel que soit le nombre de boules.`,
      })
    }),
    model('La note retirée', () => {
      const n = randInt(5, 8), m1 = randInt(18, 30) / 2, m2 = m1 + randInt(1, 4) / 2
      const r = n * m1 - (n - 1) * m2
      if (r < 0 || r >= m1 - 1 || !dec(r, 1)) return null
      const p = prenom()
      return numeric(`La moyenne des ${n} notes ${deP(p)} est ${fmt(m1)}. Si on retire sa plus mauvaise note, la moyenne des ${n - 1} notes restantes passe à ${fmt(m2)}. Quelle était cette plus mauvaise note ?`, r, {
        explanation: `Total des ${n} notes : ${n} × ${fmt(m1)} = ${fmt(n * m1)}. Total des ${n - 1} autres : ${n - 1} × ${fmt(m2)} = ${fmt((n - 1) * m2)}. La note retirée vaut ${fmt(n * m1)} − ${fmt((n - 1) * m2)} = ${fmt(r)}.`,
      })
    }),
  ],
  [
    model('Les deux dés', () => {
      const v = randInt(0, 3)
      const all: [number, number][] = []
      for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) all.push([a, b])
      let t: string, f: (p: [number, number]) => boolean
      if (v === 0) {
        const s = randInt(3, 11)
        t = `la somme des deux nombres soit égale à ${s}`
        f = ([a, b]) => a + b === s
      } else if (v === 1) {
        const s = randInt(8, 11)
        t = `la somme des deux nombres soit supérieure ou égale à ${s}`
        f = ([a, b]) => a + b >= s
      } else if (v === 2) {
        const d = randInt(1, 4)
        t = `l'écart entre les deux nombres (le plus grand moins le plus petit) soit égal à ${d}`
        f = ([a, b]) => Math.abs(a - b) === d
      } else {
        const k = randInt(2, 5)
        t = `au moins un des deux dés affiche ${k}`
        f = ([a, b]) => a === k || b === k
      }
      const ok = all.filter(f)
      return fraction(`On lance deux dés équilibrés à six faces, un rouge et un bleu. Quelle est la probabilité que ${t} ?`.replace('que au', "qu'au"), ok.length, 36, {
        explanation: `Il y a 6 × 6 = 36 résultats (rouge ; bleu) équiprobables. ${ok.length} sont favorables${ok.length <= 8 ? ` : ${ok.map((p) => `(${p[0]} ; ${p[1]})`).join(', ')}` : ''}. Probabilité : ${F(ok.length, 36)}${gcd(ok.length, 36) > 1 ? ` = ${Fr(ok.length, 36)}` : ''}.`,
      })
    }),
    model('La remontée', () => {
      const n1 = randInt(3, 6), n2 = randInt(2, 3), m1 = randInt(14, 26) / 2, T = randInt(10, 14)
      const x = ((n1 + n2) * T - n1 * m1) / n2
      if (x <= m1 || x > 20 || !dec(x, 2) || x - T < 1) return null
      const p = prenom()
      return numeric(`Après ${n1} contrôles, ${p} a ${fmt(m1)} de moyenne. Il reste ${n2} contrôles dans le trimestre. Quelle moyenne faut-il obtenir sur ces ${n2} derniers contrôles pour terminer le trimestre avec exactement ${T} de moyenne ?`, x, {
        explanation: `Total visé pour ${n1 + n2} contrôles : ${n1 + n2} × ${T} = ${(n1 + n2) * T}. Déjà obtenu : ${n1} × ${fmt(m1)} = ${fmt(n1 * m1)}. Il manque ${fmt((n1 + n2) * T - n1 * m1)} points sur ${n2} contrôles : ${fmt((n1 + n2) * T - n1 * m1)} ÷ ${n2} = ${fmt(x)} de moyenne.`,
      })
    }),
    model('Rééquilibrer le sac', () => {
      const r = randInt(2, 9), b = randInt(2, 12)
      if (Math.random() < 0.5) {
        const k = randInt(3, 6), x = r * k - r - b
        if (x < 1) return null
        return numeric(`Un sac contient ${r} boules rouges et ${b} boules bleues. Combien de boules bleues faut-il ajouter pour que la probabilité de tirer une boule rouge soit égale à ${F(1, k)} ?`, x, {
          explanation: `Les ${r} rouges doivent représenter ${F(1, k)} du total : il faut ${r} × ${k} = ${r * k} boules en tout, donc ajouter ${r * k} − ${r} − ${b} = ${x} bleues.`,
        })
      }
      const [p, q] = pick([[2, 3], [3, 4], [2, 5], [3, 5], [4, 5], [5, 6]])
      const tot = (b * q) / (q - p), x = tot - r - b
      if (!Number.isInteger(tot) || x < 1) return null
      return numeric(`Un sac contient ${r} boules rouges et ${b} boules bleues. Combien de boules rouges faut-il ajouter pour que la probabilité de tirer une boule rouge soit égale à ${F(p, q)} ?`, x, {
        explanation: `Le nombre de bleues ne change pas : les ${b} bleues devront représenter ${F(q - p, q)} du total. Le total sera donc ${b} ÷ ${q - p} × ${q} = ${tot} boules, et il faut ajouter ${tot} − ${r} − ${b} = ${x} rouges.`,
      })
    }),
    model('La moyenne cachée', () => {
      const N = randInt(24, 32), nb = randInt(9, N - 9), M = randInt(20, 28) / 2, mb = randInt(16, 30) / 2
      const mg = (N * M - nb * mb) / (N - nb)
      if (!dec(mg, 2) || mg > 20 || mg < 4 || Math.abs(mg - mb) < 1) return null
      const [g1, g2] = pick([['garçons', 'filles'], ['filles', 'garçons'], ['externes', 'demi-pensionnaires']])
      return numeric(`Dans une classe de ${N} élèves, la moyenne au dernier contrôle est ${fmt(M)}. Les ${nb} ${g1} ont ${fmt(mb)} de moyenne. Quelle est la moyenne des ${g2} ?`, mg, {
        explanation: `Total de la classe : ${N} × ${fmt(M)} = ${fmt(N * M)}. Total des ${g1} : ${nb} × ${fmt(mb)} = ${fmt(nb * mb)}. Les ${N - nb} ${g2} totalisent ${fmt(N * M - nb * mb)}, soit une moyenne de ${fmt(N * M - nb * mb)} ÷ ${N - nb} = ${fmt(mg)}.`,
      })
    }),
    model('L’association sportive', () => {
      const N = pick([200, 300, 400, 500, 600, 800]), pf = 5 * randInt(8, 12), a = 5 * randInt(4, 14), b = 5 * randInt(4, 14)
      const Fn = (N * pf) / 100, G = N - Fn, fa = (Fn * a) / 100, gb = (G * b) / 100, pct = ((fa + gb) / N) * 100
      if (!Number.isInteger(fa) || !Number.isInteger(gb) || a === b || !dec(pct, 2)) return null
      return numeric(`Un collège compte ${N} élèves, dont ${pf} % de filles. ${a} % des filles et ${b} % des garçons sont inscrits à l'association sportive. Quel pourcentage des élèves du collège est inscrit à l'association sportive ?`, pct, {
        explanation: `Filles : ${Fn}, garçons : ${G}. Inscrits : ${a} % de ${Fn} = ${fa} filles et ${b} % de ${G} = ${gb} garçons, soit ${fa + gb} élèves. ${fa + gb} ÷ ${N} = ${fmt(pct / 100)}, soit ${fmt(pct)} %.`,
      })
    }),
  ],
]

export const UPGRADES_5E: Record<string, Ladder> = {
  '5e-prio': prio,
  '5e-rel': rel,
  '5e-frac': fracs,
  '5e-lit': lit,
  '5e-prop': prop,
  '5e-geo': geo,
  '5e-stat': stat,
}
