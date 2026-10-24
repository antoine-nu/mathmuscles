import {
  F, choice, expression, fmt, fraction, gcd, numeric, par, pick, poly, randInt, randNonZero, shuffle, signed, withMeta, xPlus,
  type Exercise, type Tiers,
} from './utils'
import { cap, lieu, marchandise, prenom } from './contexts'
import { fitPoints, parallelsFigure, triangleFigure, triangleFromAngles, type Figure } from './figure'

// Chaque chapitre : 5 paliers de difficulté (palier n ↔ cran n − 1 de la jauge).
// Au moins 5 modèles vraiment différents par palier ; réponses ouvertes (QCM exceptionnel).

// ── Petites aides locales ───────────────────────────────────────────────
const sum = (a: number[]) => a.reduce((s, v) => s + v, 0)
/** « + 5 » ou « − 5 » : écriture simplifiée d'une somme de relatifs. */
const sgn = (n: number) => (n < 0 ? `− ${fmt(-n)}` : `+ ${fmt(n)}`)
/** Somme écrite sans parenthèses : −5 + 8 − 6 */
const chain = (vals: number[]) => vals.map((v, i) => (i === 0 ? fmt(v) : sgn(v))).join(' ')
const s = (n: number) => (n > 1 ? 's' : '')
/** « de pommes », « d'oranges », « d'Enzo » */
const de = (w: string) => (/^[aeiouéèêâîïôAEIOUÉÈÂÎ]/.test(w) ? `d'${w}` : `de ${w}`)
/** Un décimal est attendu : on refuse l'écriture fractionnaire. */
function decimalOnly(ex: Exercise): Exercise {
  return {
    ...ex,
    inputHint: 'Nombre décimal',
    check: (v) => !v.includes('/') && ex.check(v),
    diagnose: (v) => (v.includes('/') ? 'Écris le résultat sous forme décimale, sans trait de fraction.' : undefined),
  }
}
const RED = '#b8362f'
const FRERES = ['Anselme', 'Bernard', 'Colomban', 'Benoît', 'Guillaume', 'Bruno', 'Odon', 'Hugues', 'Gilles', 'Martin', 'Ambroise', 'Bède']
const frere = () => `frère ${pick(FRERES)}`

// ═══ Enchaînements d'opérations ═════════════════════════════════════════
const prio: Tiers = [
  [
    () => {
      const a = randInt(5, 30), b = randInt(2, 9), c = randInt(2, 9)
      return numeric(`Calcule : ${a} + ${b} × ${c}`, a + b * c, {
        explanation: `La multiplication est prioritaire : ${b} × ${c} = ${b * c}, puis ${a} + ${b * c} = ${a + b * c}.`,
      })
    },
    () => {
      const a = randInt(3, 12), b = randInt(2, 9), c = randInt(1, a * b - 1)
      return numeric(`Calcule : ${a} × ${b} − ${c}`, a * b - c, {
        explanation: `D'abord ${a} × ${b} = ${a * b}, puis ${a * b} − ${c} = ${a * b - c}.`,
      })
    },
    () => {
      const c = randInt(2, 9), q = randInt(2, 9), a = randInt(3, 25)
      return numeric(`Calcule : ${a} + ${c * q} ÷ ${c}`, a + q, {
        explanation: `La division est prioritaire : ${c * q} ÷ ${c} = ${q}, puis ${a} + ${q} = ${a + q}.`,
      })
    },
    () => {
      const a = randInt(2, 9), b = randInt(2, 9), c = randInt(2, 6)
      return numeric(`Calcule : (${a} + ${b}) × ${c}`, (a + b) * c, {
        explanation: `On commence par la parenthèse : ${a} + ${b} = ${a + b}, puis ${a + b} × ${c} = ${(a + b) * c}.`,
      })
    },
    () => {
      const [u, v] = pick([[4, 25], [2, 5], [5, 20], [2, 50], [25, 4], [5, 2], [50, 2], [20, 5]])
      const n = randInt(3, 19)
      return numeric(`Calcule mentalement : ${u} × ${n} × ${v}`, u * n * v, {
        explanation: `On regroupe astucieusement : ${u} × ${v} = ${u * v}, puis ${n} × ${u * v} = ${u * n * v}.`,
      })
    },
    () => {
      const p = prenom(), g = randInt(3, 6), per = randInt(4, 9), extra = randInt(2, 9)
      const obj = pick(['billes', 'cartes', 'autocollants', 'perles', 'jetons', 'images'])
      return numeric(`${p} a ${g} paquets de ${per} ${obj} et ${extra} ${obj} en vrac. Combien ${de(obj)} cela fait-il en tout ?`, g * per + extra, {
        explanation: `${g} × ${per} + ${extra} = ${g * per} + ${extra} = ${g * per + extra}.`,
      })
    },
  ],
  [
    () => {
      const a = randInt(2, 12), b = randInt(2, 12), c = randInt(2, 6), e = randInt(1, 15)
      return numeric(`Calcule : (${a} + ${b}) × ${c} − ${e}`, (a + b) * c - e, {
        explanation: `Parenthèses : ${a + b} ; puis × ${c} = ${(a + b) * c} ; enfin − ${e} = ${(a + b) * c - e}.`,
      })
    },
    () => {
      const b = randInt(2, 9), c = randInt(2, 9), a = b * c + randInt(1, 20), d = randInt(2, 15)
      return numeric(`Calcule : ${a} − ${b} × ${c} + ${d}`, a - b * c + d, {
        explanation: `${b} × ${c} = ${b * c}, puis de gauche à droite : ${a} − ${b * c} + ${d} = ${a - b * c + d}.`,
      })
    },
    () => {
      const a = randInt(2, 9), b = randInt(2, 9), c = randInt(2, 9), d = randInt(2, 9)
      return numeric(`Calcule : ${a} × ${b} + ${c} × ${d}`, a * b + c * d, {
        explanation: `Les deux produits d'abord : ${a * b} et ${c * d}, puis ${a * b} + ${c * d} = ${a * b + c * d}.`,
      })
    },
    () => {
      const c = randInt(2, 6), q = randInt(2, 9), d = randInt(2, 5)
      return numeric(`Calcule : ${c * q} ÷ ${c} × ${d}`, q * d, {
        explanation: `÷ et × ont la même priorité : on calcule de gauche à droite. ${c * q} ÷ ${c} = ${q}, puis ${q} × ${d} = ${q * d}.`,
      })
    },
    () => {
      const c = randInt(1, 9), b = c + randInt(2, 12), a = randInt(b - c + 1, 40)
      return numeric(`Calcule : ${a} − (${b} − ${c})`, a - (b - c), {
        explanation: `Parenthèse d'abord : ${b} − ${c} = ${b - c}, puis ${a} − ${b - c} = ${a - b + c}.`,
      })
    },
    () => {
      const a = randInt(2, 20), b = randInt(2, 9), x = randInt(2, 9)
      return numeric(`Quel nombre manque ? ${a} + ${b} × ? = ${a + b * x}`, x, {
        explanation: `${b} × ? doit valoir ${a + b * x} − ${a} = ${b * x}, donc ? = ${b * x} ÷ ${b} = ${x}.`,
      })
    },
  ],
  [
    () => {
      const e = randInt(2, 6), k = randInt(2, 9), a = randInt(8, 20), b = randInt(1, a - 2), c = randInt(2, 5)
      return numeric(`Calcule : (${a} − ${b}) × ${c} + ${e * k} ÷ ${e}`, (a - b) * c + k, {
        explanation: `(${a} − ${b}) × ${c} = ${(a - b) * c} et ${e * k} ÷ ${e} = ${k}, total ${(a - b) * c + k}.`,
      })
    },
    () => {
      const a = randInt(2, 9), b = randInt(2, 9), c = randInt(2, 9), d = randInt(2, 5), e = randInt(1, Math.min(9, Math.floor((a * (b + c)) / d)))
      return numeric(`Calcule : ${a} × (${b} + ${c}) − ${d} × ${e}`, a * (b + c) - d * e, {
        explanation: `${a} × ${b + c} = ${a * (b + c)} et ${d} × ${e} = ${d * e}, donc ${a * (b + c)} − ${d * e} = ${a * (b + c) - d * e}.`,
      })
    },
    () => {
      const a = randInt(2, 9), b = randInt(2, 9), d = randInt(1, 8), c = d + randInt(2, 7)
      return numeric(`Calcule : (${a} + ${b}) × (${c} − ${d})`, (a + b) * (c - d), {
        explanation: `Chaque parenthèse d'abord : ${a + b} et ${c - d}, puis ${a + b} × ${c - d} = ${(a + b) * (c - d)}.`,
      })
    },
    () => {
      const a = randInt(2, 12), b = randInt(2, 9), c = randInt(2, 9)
      const A = a + b * c, B = (a + b) * c
      return numeric(`On pose A = ${a} + ${b} × ${c} et B = (${a} + ${b}) × ${c}. Calcule B − A.`, B - A, {
        explanation: `A = ${a} + ${b * c} = ${A} ; B = ${a + b} × ${c} = ${B} ; B − A = ${B - A}. Les parenthèses changent tout !`,
      })
    },
    () => {
      const n = randInt(12, 89)
      const [p, q] = pick([[8, 2], [7, 3], [6, 4], [9, 1], [99, 1], [55, 45], [3, 7], [65, 35]])
      return numeric(`Calcule astucieusement : ${n} × ${p} + ${n} × ${q}`, n * (p + q), {
        explanation: `On met ${n} en facteur : ${n} × (${p} + ${q}) = ${n} × ${p + q} = ${n * (p + q)}.`,
      })
    },
    () => {
      const c = randInt(2, 9), q = randInt(2, 9), a = randInt(1, c * q - 1), b = c * q - a, d = randInt(2, 15)
      return numeric(`Calcule : (${a} + ${b}) ÷ ${c} + ${d}`, q + d, {
        explanation: `(${a} + ${b}) = ${c * q}, puis ${c * q} ÷ ${c} = ${q}, enfin ${q} + ${d} = ${q + d}.`,
      })
    },
  ],
  [
    () => {
      const d = randInt(1, 6), e = randInt(d + 1, d + 5), c = randInt(2, 6), b = randInt(1, 9), a = randInt(2, 6)
      const v = a * (b + c * (e - d))
      return numeric(`Calcule : ${a} × [${b} + ${c} × (${e} − ${d})]`, v, {
        explanation: `On part des parenthèses les plus intérieures : ${e} − ${d} = ${e - d}, puis ${b} + ${c} × ${e - d} = ${b + c * (e - d)}, enfin × ${a} = ${v}.`,
      })
    },
    () => {
      const den = randInt(2, 9), q = randInt(2, 9), b = randInt(1, den * q - 1), a = den * q - b, d = randInt(1, 9)
      return numeric(`Calcule : {${a} + ${b}/${den + d} − ${d}}`, q, {
        explanation: `Le trait de fraction joue le rôle de parenthèses : en haut ${a + b}, en bas ${den}, et ${a + b} ÷ ${den} = ${q}.`,
      })
    },
    () => {
      const kind = randInt(0, 3)
      if (kind === 0) {
        const a = randInt(2, 15), b = randInt(2, 15), c = randInt(2, 6)
        return numeric(`Calcule le produit de la somme de ${a} et ${b} par ${c}.`, (a + b) * c, {
          explanation: `« Le produit de la somme… » : (${a} + ${b}) × ${c} = ${a + b} × ${c} = ${(a + b) * c}.`,
        })
      }
      if (kind === 1) {
        const a = randInt(2, 9), b = randInt(2, 9), d = randInt(2, 6), q = randInt(2, 9)
        return numeric(`Calcule la somme du produit de ${a} par ${b} et du quotient de ${d * q} par ${d}.`, a * b + q, {
          explanation: `${a} × ${b} + ${d * q} ÷ ${d} = ${a * b} + ${q} = ${a * b + q}.`,
        })
      }
      if (kind === 2) {
        const b = randInt(2, 9), c = randInt(2, 9), a = b * c + randInt(3, 30)
        return numeric(`Calcule la différence entre ${a} et le produit de ${b} par ${c}.`, a - b * c, {
          explanation: `${a} − ${b} × ${c} = ${a} − ${b * c} = ${a - b * c}.`,
        })
      }
      const c = randInt(2, 9), q = randInt(2, 9), a = randInt(1, c * q - 1), b = c * q - a
      return numeric(`Calcule le quotient de la somme de ${a} et ${b} par ${c}.`, q, {
        explanation: `(${a} + ${b}) ÷ ${c} = ${c * q} ÷ ${c} = ${q}.`,
      })
    },
    () => {
      const d = randInt(1, 9), c = d + randInt(1, 9), b = c - d + randInt(1, 9), a = b - (c - d) + randInt(1, 20)
      const v = a - (b - (c - d))
      return numeric(`Calcule : ${a} − [${b} − (${c} − ${d})]`, v, {
        explanation: `${c} − ${d} = ${c - d}, puis ${b} − ${c - d} = ${b - c + d}, enfin ${a} − ${b - c + d} = ${v}.`,
      })
    },
    () => {
      const d = randInt(2, 6), e = randInt(1, 6), den = d + e, q = randInt(2, 7), num = den * q
      const b = randInt(2, 9), a = Math.floor(num / b) + randInt(1, 3), c = a * b - num
      return numeric(`Calcule : {${a} × ${b} − ${c}/${d} + ${e}}`, q, {
        explanation: `En haut : ${a * b} − ${c} = ${num}. En bas : ${d} + ${e} = ${den}. Donc ${num} ÷ ${den} = ${q}.`,
      })
    },
    () => {
      const a = pick([0.5, 1.5, 2.5, 0.25, 1.25]), b = pick([4, 8, 12]), c = pick([0.2, 0.4, 0.6, 1.2]), d = pick([5, 10, 15])
      return numeric(`Calcule : ${fmt(a)} × ${b} + ${fmt(c)} × ${d}`, a * b + c * d, {
        explanation: `${fmt(a)} × ${b} = ${fmt(a * b)} et ${fmt(c)} × ${d} = ${fmt(c * d)}, donc ${fmt(a * b + c * d)}.`,
      })
    },
  ],
  [
    () => {
      const ne = randInt(2, 6), pe = randInt(15, 40), nb = randInt(2, 6), pb = randInt(8, 25), r = randInt(5, 30)
      return numeric(`Le forgeron vend ${ne} épées à ${pe} écus pièce et ${nb} boucliers à ${pb} écus pièce. Il rend ${r} écus à un client mécontent. Combien d'écus a-t-il gagnés ?`, ne * pe + nb * pb - r, {
        explanation: `${ne} × ${pe} + ${nb} × ${pb} − ${r} = ${ne * pe} + ${nb * pb} − ${r} = ${ne * pe + nb * pb - r}.`,
      })
    },
    () => {
      const a = randInt(10, 40), b = randInt(3, 9), c = randInt(3, 9)
      return numeric(`Calcule la somme de ${a} et du produit de ${b} par ${c}, puis multiplie le résultat par 2.`, (a + b * c) * 2, {
        explanation: `(${a} + ${b} × ${c}) × 2 = ${a + b * c} × 2 = ${(a + b * c) * 2}.`,
      })
    },
    () => {
      const rows = randInt(4, 9), cols = randInt(5, 12), gone = randInt(3, 12), groups = pick([2, 3, 4, 5])
      const g2 = gone + ((rows * cols - gone) % groups)
      return numeric(`Une armée de ${rows} rangs de ${cols} soldats perd ${g2} soldats, puis se répartit en ${groups} groupes égaux. Combien de soldats par groupe ?`, (rows * cols - g2) / groups, {
        explanation: `(${rows} × ${cols} − ${g2}) ÷ ${groups} = ${rows * cols - g2} ÷ ${groups} = ${(rows * cols - g2) / groups}.`,
      })
    },
    () => {
      const p = prenom(), d = randInt(3, 9), t = randInt(1, 5), l = randInt(1, 6)
      return numeric(`Au basket, un panier vaut 2 ou 3 points et un lancer franc 1 point. ${p} réussit ${d} paniers à 2 points, ${t} panier${s(t)} à 3 points et ${l} lancer${s(l)} franc${s(l)}. Quel est son total de points ?`, 2 * d + 3 * t + l, {
        explanation: `${d} × 2 + ${t} × 3 + ${l} × 1 = ${2 * d} + ${3 * t} + ${l} = ${2 * d + 3 * t + l}.`,
      })
    },
    () => {
      const p = prenom(), n = randInt(4, 12), g = randInt(10, 25), m = randInt(1, 4), lost = randInt(5, 15)
      const spend = randInt(1, Math.max(1, Math.floor((n * g - m * lost) / 10))) * 5
      const total = n * g - m * lost - spend
      return numeric(`Dans un jeu vidéo, chaque niveau réussi rapporte ${g} gemmes et chaque vie perdue en coûte ${lost}. ${p} réussit ${n} niveaux, perd ${m} vie${s(m)}, puis achète une armure à ${spend} gemmes. Combien de gemmes lui reste-t-il ?`, total, {
        explanation: `${n} × ${g} − ${m} × ${lost} − ${spend} = ${n * g} − ${m * lost} − ${spend} = ${total}.`,
      })
    },
    () => {
      const x = randInt(2, 15), k = randInt(2, 9), a = randInt(1, 20)
      if (Math.random() < 0.5) {
        return numeric(`Je pense à un nombre. Je le multiplie par ${k}, puis j'ajoute ${a} : j'obtiens ${k * x + a}. Quel est ce nombre ?`, x, {
          explanation: `On remonte les étapes : ${k * x + a} − ${a} = ${k * x}, puis ${k * x} ÷ ${k} = ${x}.`,
        })
      }
      return numeric(`Je pense à un nombre. J'ajoute ${a}, puis je multiplie le résultat par ${k} : j'obtiens ${k * (x + a)}. Quel est ce nombre ?`, x, {
        explanation: `On remonte les étapes : ${k * (x + a)} ÷ ${k} = ${x + a}, puis ${x + a} − ${a} = ${x}.`,
      })
    },
    () => {
      const ad = randInt(2, 4), en = randInt(1, 4), pa = randInt(8, 12), pe = randInt(4, 7), r = pick([4, 5, 6, 8, 10])
      const total = ad * pa + en * pe - r
      return numeric(`Deux familles vont au cinéma : ${ad} places adulte à ${pa} € et ${en} place${s(en)} enfant à ${pe} €, avec un bon de réduction de ${r} €. Elles partagent la note à parts égales. Combien paie chaque famille (en €) ?`, total / 2, {
        explanation: `(${ad} × ${pa} + ${en} × ${pe} − ${r}) ÷ 2 = (${ad * pa} + ${en * pe} − ${r}) ÷ 2 = ${total} ÷ 2 = ${fmt(total / 2)} €.`,
      })
    },
  ],
]

// ═══ Nombres relatifs (addition et soustraction) ════════════════════════
const rel: Tiers = [
  [
    () => {
      const a = randNonZero(-15, 15), b = randNonZero(-15, 15)
      return numeric(`Calcule : ${signed(a)} + ${signed(b)}`, a + b, {
        explanation: `${a * b < 0 ? 'Signes contraires : on soustrait les distances à zéro et on garde le signe de la plus grande.' : 'Même signe : on additionne les distances à zéro et on garde le signe.'} Résultat : ${fmt(a + b)}.`,
      })
    },
    () => {
      let vals: number[] = []
      while (new Set(vals).size !== 4 || vals.filter((v) => v < 0).length < 2) vals = Array.from({ length: 4 }, () => randInt(-15, 15))
      const big = Math.random() < 0.5
      const r = big ? Math.max(...vals) : Math.min(...vals)
      return numeric(`Quel est le plus ${big ? 'grand' : 'petit'} de ces nombres : ${vals.map(fmt).join(' ; ')} ?`, r, {
        explanation: big
          ? `Le plus grand est celui situé le plus à droite sur la droite graduée : ${fmt(r)}.`
          : `Le plus petit est celui situé le plus à gauche sur la droite graduée : ${fmt(r)}.`,
      })
    },
    () => {
      const a = randInt(-9, 9), d = randInt(2, 9), right = Math.random() < 0.5
      const r = right ? a + d : a - d
      return numeric(`Sur une droite graduée, quel nombre est situé ${d} unités à ${right ? 'droite' : 'gauche'} de ${fmt(a)} ?`, r, {
        explanation: `Aller à ${right ? 'droite' : 'gauche'}, c'est ${right ? 'ajouter' : 'soustraire'} : ${fmt(a)} ${right ? '+' : '−'} ${d} = ${fmt(r)}.`,
      })
    },
    () => {
      const t = randInt(-12, -1), up = randInt(2, 15)
      return numeric(`Il fait ${fmt(t)} °C ${lieu()}. La température monte de ${up} °C. Quelle température fait-il maintenant (en °C) ?`, t + up, {
        explanation: `${fmt(t)} + ${up} = ${fmt(t + up)} °C.`,
      })
    },
    () => {
      let a = randNonZero(-15, 15), b = randNonZero(-15, 15)
      while (a > 0 && b > 0) { a = randNonZero(-15, 15); b = randNonZero(-15, 15) }
      return numeric(`Calcule : ${chain([a, b])}`, a + b, {
        explanation: `On lit ${chain([a, b])} comme la somme de ${fmt(a)} et de ${par(b)} : ${fmt(a + b)}.`,
      })
    },
  ],
  [
    () => {
      const a = randNonZero(-15, 15), b = randNonZero(-15, 15)
      return numeric(`Calcule : ${signed(a)} − ${signed(b)}`, a - b, {
        explanation: `Soustraire ${signed(b)}, c'est ajouter son opposé ${signed(-b)} : ${fmt(a - b)}.`,
      })
    },
    () => {
      const a = randNonZero(-20, 20), b = randNonZero(-20, 20)
      return numeric(`Quel nombre faut-il ajouter à ${fmt(a)} pour obtenir ${fmt(b)} ?`, b - a, {
        explanation: `On calcule ${fmt(b)} − ${par(a)} = ${fmt(b - a)}.`,
      })
    },
    () => {
      let v = [1]
      while (v.every((x) => x > 0) || v.every((x) => x < 0)) v = [randNonZero(-12, 12), randNonZero(-12, 12), randNonZero(-12, 12)]
      return numeric(`Calcule : ${chain(v)}`, sum(v), {
        explanation: `De gauche à droite : ${chain(v.slice(0, 2))} = ${fmt(v[0] + v[1])}, puis ${chain([v[0] + v[1], v[2]])} = ${fmt(sum(v))}.`,
      })
    },
    () => {
      const m = randInt(-12, -1), a = randInt(1, 15)
      return numeric(`Ce matin, le thermomètre ${lieu()} indiquait ${fmt(m)} °C ; cet après-midi, il indique ${a} °C. De combien de degrés la température a-t-elle augmenté ?`, a - m, {
        explanation: `${a} − ${par(m)} = ${a} + ${-m} = ${a - m} °C.`,
      })
    },
    () => {
      const start = randInt(-3, -1), up = randInt(4, 9), down = randInt(2, up + 2)
      const r = start + up - down
      return numeric(`Dans un immeuble avec parking souterrain, l'ascenseur part du niveau ${fmt(start)}, monte de ${up} étages, puis descend de ${down} étages. À quel niveau arrive-t-il ?`, r, {
        explanation: `${fmt(start)} + ${up} − ${down} = ${fmt(r)}.`,
      })
    },
  ],
  [
    () => {
      const a = randNonZero(-12, 12), b = randNonZero(-12, 12), c = randNonZero(-12, 12), e = randNonZero(-12, 12)
      const r = a + b - c + e
      return numeric(`Calcule : ${fmt(a)} + ${par(b)} − ${par(c)} + ${par(e)}`, r, {
        explanation: `On remplace la soustraction par l'addition de l'opposé : ${fmt(a)} + ${par(b)} + ${par(-c)} + ${par(e)} = ${fmt(r)}.`,
      })
    },
    () => {
      const a = randNonZero(-15, -1), b = randNonZero(1, 15)
      return numeric(`Sur une droite graduée, A a pour abscisse ${fmt(a)} et B a pour abscisse ${fmt(b)}. Quelle est la distance AB ?`, b - a, {
        explanation: `AB = ${fmt(b)} − ${par(a)} = ${b - a}.`,
      })
    },
    () => {
      const a = randInt(5, 19)
      let b = randInt(3, 15)
      while (b === a) b = randInt(3, 15)
      let c = randNonZero(-12, 12)
      while (Math.abs(c) === a || Math.abs(c) === b) c = randNonZero(-12, 12)
      const terms = shuffle([a, b, -a, -b, c])
      return numeric(`Calcule astucieusement : ${chain(terms)}`, c, {
        explanation: `${a} et −${a} s'annulent, ${b} et −${b} aussi : il reste ${fmt(c)}.`,
      })
    },
    () => {
      const a = randNonZero(-12, 12), x = randNonZero(-12, 12), b = a - x
      return numeric(`Complète : ${fmt(a)} − ? = ${fmt(b)}`, x, {
        explanation: `? = ${fmt(a)} − ${par(b)} = ${fmt(x)}. Vérification : ${fmt(a)} − ${par(x)} = ${fmt(b)}.`,
      })
    },
    () => {
      const p = prenom(), s0 = -randInt(10, 60), dep = randInt(20, 90), pay = randInt(10, 70)
      const r = s0 + dep - pay
      return numeric(`Le compte en banque ${de(p)} affiche ${fmt(s0)} €. ${p} dépose ${dep} €, puis paie ${pay} € en ligne. Quel est le nouveau solde (en €) ?`, r, {
        explanation: `${fmt(s0)} + ${dep} − ${pay} = ${fmt(s0 + dep)} − ${pay} = ${fmt(r)} €.`,
      })
    },
    () => {
      const jours = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi']
      let t: number[] = []
      while (!t.some((v) => v < 0) || !t.some((v) => v > 0)) t = jours.map(() => randInt(-10, 12))
      const hi = Math.max(...t), lo = Math.min(...t)
      return numeric(`Températures relevées à l'aube cette semaine : ${jours.map((j, i) => `${j} ${fmt(t[i])} °C`).join(' ; ')}. Quel est l'écart entre la plus haute et la plus basse (en °C) ?`, hi - lo, {
        explanation: `Plus haute : ${fmt(hi)} °C, plus basse : ${fmt(lo)} °C. Écart : ${fmt(hi)} − ${par(lo)} = ${hi - lo} °C.`,
      })
    },
  ],
  [
    () => {
      const a = randNonZero(-12, 12), b = randNonZero(-12, 12), c = randNonZero(-12, 12)
      return numeric(`Calcule : ${fmt(a)} − (${fmt(b)} + ${par(c)})`, a - (b + c), {
        explanation: `Parenthèse d'abord : ${fmt(b)} + ${par(c)} = ${fmt(b + c)}, puis ${fmt(a)} − ${par(b + c)} = ${fmt(a - b - c)}.`,
      })
    },
    () => {
      const a = 2 * randNonZero(-9, 9)
      let b = a + 2 * randInt(1, 9)
      if (b === 0) b = 2
      return numeric(`A a pour abscisse ${fmt(a)} et B a pour abscisse ${fmt(b)}. Quelle est l'abscisse du milieu de [AB] ?`, (a + b) / 2, {
        explanation: `AB = ${fmt(b)} − ${par(a)} = ${b - a} ; le milieu est à ${(b - a) / 2} de A : ${fmt(a)} + ${(b - a) / 2} = ${fmt((a + b) / 2)}.`,
      })
    },
    () => {
      const st = randNonZero(-9, 9), a = randInt(3, 15), b = randInt(-9, -1), c = randInt(2, 12)
      const r = st + a - b - c
      return numeric(`Programme de calcul : choisis ${fmt(st)}, ajoute ${a}, soustrais ${par(b)}, puis enlève ${c}. Quel résultat obtiens-tu ?`, r, {
        explanation: `${fmt(st)} + ${a} = ${fmt(st + a)} ; ${fmt(st + a)} − ${par(b)} = ${fmt(st + a - b)} ; ${fmt(st + a - b)} − ${c} = ${fmt(r)}.`,
      })
    },
    () => {
      const a = randNonZero(-12, 12), b = randNonZero(-12, 12), c = randNonZero(-12, 12), d = randNonZero(-12, 12)
      const X = a - b, Y = c - d
      return numeric(`Calcule : (${fmt(a)} − ${par(b)}) − (${fmt(c)} − ${par(d)})`, X - Y, {
        explanation: `Première parenthèse : ${fmt(X)} ; seconde : ${fmt(Y)} ; puis ${fmt(X)} − ${par(Y)} = ${fmt(X - Y)}.`,
      })
    },
    () => {
      let a = 0, b = 0, c = 0
      while (a + b === 0 || b + c === 0 || a + 2 * b + c === 0) { a = randNonZero(-9, 9); b = randNonZero(-9, 9); c = randNonZero(-9, 9) }
      const X = a + b, Y = b + c
      return numeric(`Dans une pyramide de nombres, chaque brique est la somme des deux briques sur lesquelles elle repose. La rangée du bas contient, dans l'ordre, ${fmt(a)} ; ${fmt(b)} ; ${fmt(c)}. Quel nombre est au sommet ?`, X + Y, {
        explanation: `Rangée du milieu : ${fmt(a)} + ${par(b)} = ${fmt(X)} et ${fmt(b)} + ${par(c)} = ${fmt(Y)}. Sommet : ${fmt(X)} + ${par(Y)} = ${fmt(X + Y)}.`,
      })
    },
    () => {
      const x = randNonZero(-15, 15), b = randNonZero(-12, 12), c = x - b
      return numeric(`Quand on soustrait ${par(b)} à un nombre, on obtient ${fmt(c)}. Quel est ce nombre ?`, x, {
        explanation: `On fait l'opération inverse : ${fmt(c)} + ${par(b)} = ${fmt(x)}.`,
      })
    },
  ],
  [
    () => {
      const t0 = randInt(-15, -2), up = randInt(5, 18), down = randInt(4, 20)
      return numeric(`À l'aube, il fait ${fmt(t0)} °C au campement. La température monte de ${up} °C, puis baisse de ${down} °C la nuit. Quelle est la température finale (en °C) ?`, t0 + up - down, {
        explanation: `${fmt(t0)} + ${up} − ${down} = ${fmt(t0 + up)} − ${down} = ${fmt(t0 + up - down)}.`,
      })
    },
    () => {
      const d = randInt(20, 60), u = randInt(5, 18), dd = randInt(5, 25)
      return numeric(`Un plongeur est à −${d} m. Il remonte de ${u} m, puis redescend de ${dd} m. À quelle altitude se trouve-t-il (en m) ?`, -d + u - dd, {
        explanation: `−${d} + ${u} − ${dd} = ${fmt(-d + u)} − ${dd} = ${fmt(-d + u - dd)}.`,
      })
    },
    () => {
      const y1 = -randInt(100, 600), y2 = randInt(1000, 1500)
      return numeric(`Un empire naît en ${fmt(y1)} (c'est-à-dire ${-y1} av. J.-C.) et s'effondre en ${y2}. Combien de temps a-t-il duré (en années, sans année 0) ?`, y2 - y1 - 1, {
        explanation: `${y2} − ${par(y1)} = ${y2 - y1}, moins 1 car il n'y a pas d'année 0 : ${y2 - y1 - 1}.`,
      })
    },
    () => {
      const p = prenom(), g = [randInt(5, 20), -randInt(5, 25), randInt(5, 20), -randInt(5, 25)], fin = randInt(-20, 30)
      const bilan = sum(g), start = fin - bilan
      return numeric(`Dans un jeu vidéo, ${p} gagne ${g[0]} points, en perd ${-g[1]}, en regagne ${g[2]}, puis en perd ${-g[3]}. La partie se termine avec un score de ${fmt(fin)}. Quel était le score de départ ?`, start, {
        explanation: `Bilan de la partie : ${chain(g)} = ${fmt(bilan)}. Départ : ${fmt(fin)} − ${par(bilan)} = ${fmt(start)}.`,
      })
    },
    () => {
      const t = randInt(8, 30), gal = randInt(15, 60), dd = randInt(20, 90)
      return numeric(`Dans une mine, l'entrée d'une galerie est à l'altitude −${gal} m, et le fond du puits se trouve ${dd} m plus bas que cette galerie. Le sommet de la tour de guet est à ${t} m. Quelle distance verticale sépare le sommet de la tour du fond du puits (en m) ?`, t + gal + dd, {
        explanation: `Fond du puits : −${gal} − ${dd} = −${gal + dd} m. Distance : ${t} − (−${gal + dd}) = ${t + gal + dd} m.`,
      })
    },
    () => {
      const villes: [string, number][] = [
        ['Paris', 1], ['Londres', 0], ['New York', -5], ['Los Angeles', -8], ['Tokyo', 9], ['Dubaï', 4],
        ['Rio de Janeiro', -3], ['Moscou', 3], ['Pékin', 8], ['Mexico', -6],
      ]
      const utc = (o: number) => (o === 0 ? 'UTC' : `UTC${o > 0 ? '+' : '−'}${Math.abs(o)}`)
      let A = pick(villes), B = pick(villes), h = randInt(0, 23)
      while (A === B || h + B[1] - A[1] < 0 || h + B[1] - A[1] > 23) { A = pick(villes); B = pick(villes); h = randInt(0, 23) }
      const d = B[1] - A[1], r = h + d
      return numeric(`En hiver, ${A[0]} est à l'heure ${utc(A[1])} et ${B[0]} à l'heure ${utc(B[1])}. Quand il est ${h} h à ${A[0]}, quelle heure est-il à ${B[0]} (le même jour) ?`, r, {
        explanation: `Décalage : ${fmt(B[1])} − ${par(A[1])} = ${fmt(d)} h. Donc ${h} ${sgn(d)} = ${r} h.`, inputHint: 'Heure (nombre)',
      })
    },
  ],
]

// ═══ Fractions ══════════════════════════════════════════════════════════
const fracs: Tiers = [
  [
    () => {
      let n = randInt(1, 9), m = randInt(2, 11)
      while (gcd(n, m) !== 1 || n === m) { n = randInt(1, 9); m = randInt(2, 11) }
      const k = randInt(2, 9)
      return fraction(`Simplifie au maximum : ${F(n * k, m * k)}`, n, m, { irreducible: true, explanation: `On divise numérateur et dénominateur par ${k} : ${n}/${m}.` })
    },
    () => {
      const n = randInt(1, 8), m = randInt(n + 1, 10), k = randInt(2, 6)
      return numeric(`Complète l'égalité : ${F(n, m)} = ${F('?', m * k)}. Quel est le numérateur manquant ?`, n * k, {
        explanation: `${m} × ${k} = ${m * k}, donc on multiplie aussi ${n} par ${k} : ${n * k}.`,
      })
    },
    () => {
      const food = pick([
        { nom: 'Une pizza', de: 'de la pizza', pp: 'coupée en', unit: 'parts égales' },
        { nom: 'Une tarte', de: 'de la tarte', pp: 'coupée en', unit: 'parts égales' },
        { nom: 'Une tablette de chocolat', de: 'de la tablette', pp: 'formée de', unit: 'carrés' },
        { nom: 'Un gâteau', de: 'du gâteau', pp: 'coupé en', unit: 'parts égales' },
        { nom: 'Une miche de pain', de: 'de la miche', pp: 'coupée en', unit: 'tranches égales' },
      ])
      const parts = pick([4, 5, 6, 8, 10, 12]), m = randInt(1, parts - 1), p = prenom()
      return fraction(`${food.nom} est ${food.pp} ${parts} ${food.unit}. ${p} en mange ${m}. Quelle fraction ${food.de} cela représente-t-il ?`, m, parts, {
        explanation: `${m} part${s(m)} sur ${parts} : ${F(m, parts)}.`,
      })
    },
    () => {
      const d = pick([2, 3, 4, 5, 10]), q = d * randInt(2, 15)
      return numeric(`Combien vaut ${F(1, d)} de ${q} ?`, q / d, { explanation: `Prendre ${F(1, d)}, c'est diviser par ${d} : ${q} ÷ ${d} = ${q / d}.` })
    },
    () => {
      const [n, d] = pick([[1, 2], [1, 4], [3, 4], [1, 5], [2, 5], [3, 5], [4, 5], [3, 10], [7, 10], [9, 10], [5, 4], [3, 2], [7, 4], [7, 2], [6, 5], [1, 20]])
      return decimalOnly(numeric(`Écris ${F(n, d)} sous la forme d'un nombre décimal.`, n / d, { explanation: `${n} ÷ ${d} = ${fmt(n / d)}.` }))
    },
    () => {
      const d = randInt(5, 13)
      let a = randInt(1, d - 1), b = randInt(1, d - 1)
      while (a === b) b = randInt(1, d - 1)
      return fraction(`Quelle est la plus grande des deux fractions ${F(a, d)} et ${F(b, d)} ? Écris-la.`, Math.max(a, b), d, {
        explanation: `Même dénominateur : on compare les numérateurs, ${Math.max(a, b)} > ${Math.min(a, b)}.`,
      })
    },
  ],
  [
    () => {
      const den = randInt(3, 12), a = randInt(1, den - 1), b = randInt(1, den - 1)
      return fraction(`Calcule : ${F(a, den)} + ${F(b, den)}`, a + b, den, { explanation: `Même dénominateur : ${a} + ${b} = ${a + b}, donc ${a + b}/${den}.` })
    },
    () => {
      const den = randInt(4, 12), b = randInt(1, den - 2), a = randInt(b + 1, den - 1)
      return fraction(`Calcule : ${F(a, den)} − ${F(b, den)}`, a - b, den, { explanation: `Même dénominateur : ${a} − ${b} = ${a - b}, donc ${a - b}/${den}.` })
    },
    () => {
      const den = pick([2, 3, 4, 5]), num = randInt(1, den - 1), q = den * randInt(2, 12)
      return numeric(`Calcule ${F(num, den)} de ${q}.`, (num * q) / den, {
        explanation: `${q} ÷ ${den} = ${q / den}, puis × ${num} = ${(num * q) / den}.`,
      })
    },
    () => {
      let n = randInt(1, 8), m = randInt(2, 12)
      while (gcd(n, m) !== 1 || n >= m) { n = randInt(1, 8); m = randInt(2, 12) }
      const k = randInt(2, 7)
      return numeric(`Complète l'égalité : ${F(n * k, '?')} = ${F(n, m)}. Quel est le dénominateur manquant ?`, m * k, {
        explanation: `${n} × ${k} = ${n * k}, donc le dénominateur est aussi multiplié par ${k} : ${m} × ${k} = ${m * k}.`,
      })
    },
    () => {
      const d = pick([2, 3, 4, 5, 10]), n = randInt(2, 9)
      const name: Record<number, string> = { 2: 'demis', 3: 'tiers', 4: 'quarts', 5: 'cinquièmes', 10: 'dixièmes' }
      return numeric(`Combien de ${name[d]} faut-il pour faire ${n} unités ?`, n * d, {
        explanation: `Une unité, c'est ${d} ${name[d]}, donc ${n} unités = ${n * d} ${name[d]} : ${n} = ${F(n * d, d)}.`,
      })
    },
    () => {
      const d = randInt(3, 12), a = randInt(1, d - 1), p = prenom()
      const ctx = pick([
        [`${p} a déjà lu ${F(a, d)} de son livre.`, 'du livre reste-t-il à lire'],
        [`Les maçons ont construit ${F(a, d)} du rempart.`, 'du rempart reste-t-il à construire'],
        [`${p} a déjà parcouru ${F(a, d)} du trajet.`, 'du trajet reste-t-il à parcourir'],
        [`Le réservoir est rempli aux ${F(a, d)}.`, 'du réservoir est encore vide'],
      ])
      return fraction(`${ctx[0]} Quelle fraction ${ctx[1]} ?`, d - a, d, {
        explanation: `Le tout vaut ${F(d, d)} : ${F(d, d)} − ${F(a, d)} = ${F(d - a, d)}.`,
      })
    },
  ],
  [
    () => {
      const den = randInt(2, 6), k = randInt(2, 4), a = randInt(1, den * 2), b = randInt(1, den * k)
      return fraction(`Calcule : ${F(a, den)} + ${F(b, den * k)}`, a * k + b, den * k, {
        explanation: `${F(a, den)} = ${F(a * k, den * k)}, puis ${a * k} + ${b} = ${a * k + b} : ${a * k + b}/${den * k}.`,
      })
    },
    () => {
      const den = pick([3, 4, 5, 6, 8, 10]), num = pick([2, 3, 5, 7, 9].filter((n) => n < den && gcd(n, den) === 1)), q = den * randInt(3, 15)
      return numeric(`Un trésor contient ${q} pièces d'or. Le roi en garde les ${F(num, den)}. Combien de pièces garde-t-il ?`, (num * q) / den, {
        explanation: `${q} ÷ ${den} = ${q / den}, puis × ${num} = ${(num * q) / den}.`,
      })
    },
    () => {
      const den = pick([6, 8, 9, 10, 12, 15]), k = pick([2, 3, 4, 5].filter((v) => den % v === 0 && den / v >= 2)), small = den / k
      let a = randInt(1, den - 1), b = randInt(1, small - 1)
      while (a === b * k) { a = randInt(1, den - 1); b = randInt(1, small - 1) }
      const big = a > b * k
      return fraction(`Quelle est la plus grande des fractions ${F(a, den)} et ${F(b, small)} ? Écris-la.`, big ? a : b, big ? den : small, {
        explanation: `${F(b, small)} = ${F(b * k, den)} ; on compare ${a} et ${b * k} : la plus grande est ${big ? F(a, den) : F(b, small)}.`,
      })
    },
    () => {
      const den = randInt(2, 6), k = randInt(2, 4), b = randInt(1, den * 2)
      const a = b * k + randInt(1, den * k)
      return fraction(`Calcule : ${F(a, den * k)} − ${F(b, den)}`, a - b * k, den * k, {
        explanation: `${F(b, den)} = ${F(b * k, den * k)}, puis ${a} − ${b * k} = ${a - b * k} : ${a - b * k}/${den * k}.`,
      })
    },
    () => {
      if (Math.random() < 0.6) {
        const m = pick([5, 10, 12, 15, 20, 25, 30, 35, 40, 45, 50])
        return fraction(`Quelle fraction d'heure représentent ${m} minutes ? Donne-la sous forme irréductible.`, m, 60, {
          irreducible: true, explanation: `Une heure = 60 min : ${F(m, 60)} = ${F(m / gcd(m, 60), 60 / gcd(m, 60))}.`,
        })
      }
      const h = pick([2, 3, 4, 6, 8, 9, 10, 15, 16, 18, 20])
      return fraction(`Quelle fraction d'une journée représentent ${h} heures ? Donne-la sous forme irréductible.`, h, 24, {
        irreducible: true, explanation: `Une journée = 24 h : ${F(h, 24)} = ${F(h / gcd(h, 24), 24 / gcd(h, 24))}.`,
      })
    },
  ],
  [
    () => {
      const den = randInt(2, 5), k = randInt(2, 3), b = randInt(1, den * k - 1)
      let a = randInt(Math.ceil((b + 1) / k), den * 2)
      if (a % den === 0) a += 1
      return fraction(`Calcule et donne le résultat sous forme irréductible : ${F(a, den)} − ${F(b, den * k)}`, a * k - b, den * k, {
        irreducible: true, explanation: `${a * k}/${den * k} − ${b}/${den * k} = ${a * k - b}/${den * k}, puis on simplifie si possible.`,
      })
    },
    () => {
      const n = randInt(2, 4), den = randInt(2, 9), a = randInt(1, den - 1)
      return fraction(`Calcule : ${n} − ${F(a, den)}`, n * den - a, den, { explanation: `${n} = ${n * den}/${den}, donc ${n * den - a}/${den}.` })
    },
    () => {
      const D = pick([8, 12])
      const divs = D === 8 ? [2, 4, 8] : shuffle([2, 3, 4, 6, 12]).slice(0, 3)
      let fr: [number, number][] = []
      while (new Set(fr.map(([n, d]) => (n * D) / d)).size !== 3) fr = divs.map((d) => [randInt(1, d - 1), d])
      const sorted = [...fr].sort((x, y) => x[0] / x[1] - y[0] / y[1])
      const mid = sorted[1]
      return fraction(`Range dans l'ordre croissant : ${fr.map(([n, d]) => F(n, d)).join(' ; ')}. Quelle fraction se trouve au milieu ?`, mid[0], mid[1], {
        explanation: `Au dénominateur ${D} : ${sorted.map(([n, d]) => `${(n * D) / d}/${D}`).join(' < ')}. Au milieu : ${mid[0]}/${mid[1]}.`,
      })
    },
    () => {
      const d = pick([3, 4, 5, 6, 8, 10])
      let n = randInt(2, d - 1)
      while (gcd(n, d) !== 1) n = randInt(2, d - 1)
      const unit = randInt(2, 12)
      return numeric(`Les ${F(n, d)} d'un nombre valent ${n * unit}. Quel est ce nombre ?`, d * unit, {
        explanation: `${F(1, d)} du nombre vaut ${n * unit} ÷ ${n} = ${unit}, donc le nombre vaut ${unit} × ${d} = ${d * unit}.`,
      })
    },
    () => {
      const ch = pick([[2, 4, 8], [3, 6, 12], [2, 6, 12], [2, 4, 12], [5, 10, 20], [2, 10, 20], [3, 9, 18]])
      const nums = ch.map((d) => {
        let n = randInt(1, d - 1)
        while (gcd(n, d) !== 1) n = randInt(1, d - 1)
        return n
      })
      const L = ch[2]
      const tot = sum(nums.map((n, i) => (n * L) / ch[i]))
      return fraction(`Calcule : ${nums.map((n, i) => F(n, ch[i])).join(' + ')}`, tot, L, {
        explanation: `Tout au dénominateur ${L} : ${nums.map((n, i) => `${(n * L) / ch[i]}/${L}`).join(' + ')} = ${tot}/${L}.`,
      })
    },
    () => {
      const ctx = pick([['Un tonneau', 'L', 'litres'], ['Une citerne', 'L', 'litres'], ['Le réservoir d’essence d’une moto', 'L', 'litres'], ['Un bassin', 'm³', 'mètres cubes']])
      const d = pick([3, 4, 5, 8, 10])
      let n = randInt(1, d - 1)
      while (gcd(n, d) !== 1) n = randInt(1, d - 1)
      const capa = d * randInt(3, 25)
      const inside = (capa * n) / d
      return numeric(`${ctx[0]} de ${capa} ${ctx[1]} est rempli${ctx[0].startsWith('Une') ? 'e' : ''} aux ${F(n, d)}. Combien ${de(ctx[2])} faut-il ajouter pour le remplir complètement ?`, capa - inside, {
        explanation: `Il contient ${capa} ÷ ${d} × ${n} = ${inside} ${ctx[1]}, il manque ${capa} − ${inside} = ${capa - inside} ${ctx[1]}.`,
      })
    },
  ],
  [
    () => {
      const total = pick([24, 36, 48, 60, 72, 84, 96, 120])
      return numeric(`Une armée de ${total} soldats compte ${F(1, 3)} d'archers et ${F(1, 4)} de lanciers ; le reste sont des chevaliers. Combien y a-t-il de chevaliers ?`, total - total / 3 - total / 4, {
        explanation: `Archers : ${total / 3}, lanciers : ${total / 4}, donc ${total} − ${total / 3} − ${total / 4} = ${total - total / 3 - total / 4}.`,
      })
    },
    () => {
      const [a, b] = pick([[2, 6], [3, 6], [2, 8], [4, 8], [3, 9], [2, 10], [3, 12], [4, 12], [5, 10]])
      return reste(a, b)
    },
    () => {
      const p = prenom(), d1 = pick([3, 4, 5]), n1 = randInt(1, d1 - 1), d2 = pick([2, 3, 4]), total = d1 * d2 * randInt(2, 8)
      const r1 = total - (total * n1) / d1, sp2 = r1 / d2, fin = r1 - sp2
      return numeric(`${p} part au marché avec ${total} écus. Les ${F(n1, d1)} de sa bourse servent d'abord à acheter du tissu, puis ${F(1, d2)} de ce qui reste sert à acheter des épices. Combien d'écus lui reste-t-il ?`, fin, {
        explanation: `Tissu : ${total} ÷ ${d1} × ${n1} = ${(total * n1) / d1}, il reste ${r1}. Épices : ${r1} ÷ ${d2} = ${sp2}. Reste : ${r1} − ${sp2} = ${fin}.`,
      })
    },
    () => {
      const d = pick([3, 4, 5, 6, 8])
      let n = randInt(1, d - 1)
      while (gcd(n, d) !== 1) n = randInt(1, d - 1)
      const unit = randInt(2, 9), who = pick(['Un randonneur', 'Une caravane de marchands', 'Une cycliste', 'Un pèlerin'])
      return numeric(`${who} a parcouru ${n * unit} km, ce qui représente ${F(n, d)} de son itinéraire. Combien de kilomètres reste-t-il à parcourir ?`, (d - n) * unit, {
        explanation: `${F(1, d)} du trajet = ${n * unit} ÷ ${n} = ${unit} km ; trajet total : ${d * unit} km ; reste ${d * unit} − ${n * unit} = ${(d - n) * unit} km.`,
      })
    },
    () => {
      const [d1, d2] = pick([[4, 8], [3, 6], [2, 8], [4, 12], [3, 12], [5, 10], [2, 6], [2, 10]])
      const a = randInt(1, d1 - 1), k = d2 / d1
      let b = randInt(1, d2 - 1)
      while (gcd(b, d2) !== 1) b = randInt(1, d2 - 1)
      const [ing1, ing2] = pick([['de lait', 'de crème'], ["d'eau", 'de jus de pomme'], ['de bouillon', 'de lait']])
      return fraction(`Pour une recette, ${prenom()} verse ${F(a, d1)} de litre ${ing1} et ${F(b, d2)} de litre ${ing2} dans une casserole. Quelle quantité de liquide y a-t-il au total ? (en litre, fraction irréductible)`, a * k + b, d2, {
        irreducible: true, explanation: `${F(a, d1)} = ${F(a * k, d2)}, donc ${F(a * k, d2)} + ${F(b, d2)} = ${F(a * k + b, d2)}, puis on simplifie.`,
      })
    },
    () => {
      const trap = pick([[1, 6], [1, 4], [1, 3]]), potion = pick([[1, 12], [1, 6]]), dragon = pick([[1, 4], [1, 3], [1, 2], [1, 6], [5, 12]])
      const t12 = (f: number[]) => (f[0] * 12) / f[1]
      const r = 12 - t12(trap) + t12(potion) - t12(dragon)
      if (r <= 0) return fracs[4][5]()
      return fraction(`Dans un jeu vidéo, la barre de vie de ton héros est pleine. Un piège lui retire ${F(trap[0], trap[1])} de sa barre, une potion lui en rend ${F(potion[0], potion[1])}, puis un dragon lui retire ${F(dragon[0], dragon[1])}. Quelle fraction de la barre de vie lui reste-t-il ? (forme irréductible)`, r, 12, {
        irreducible: true, explanation: `En douzièmes : 12/12 − ${t12(trap)}/12 + ${t12(potion)}/12 − ${t12(dragon)}/12 = ${r}/12, puis on simplifie.`,
      })
    },
  ],
]

/** Problème du forgeron : il reste 1 − 1/a − 1/b. */
function reste(a: number, b: number) {
  const den = (a * b) / gcd(a, b)
  const num = den - den / a - den / b
  return fraction(`Un forgeron utilise ${F(1, a)} de son fer le lundi et ${F(1, b)} le mardi. Quelle fraction du stock lui reste-t-il ? (forme irréductible)`, num, den, {
    irreducible: true, explanation: `${F(1, a)} + ${F(1, b)} = ${den / a + den / b}/${den}, il reste ${num}/${den}, puis on simplifie.`,
  })
}

// ═══ Calcul littéral ════════════════════════════════════════════════════
function factorKab(): Exercise {
  let k = pick([2, 3, 4, 5, 6]), a = randInt(1, 6), b = randInt(1, 7)
  while (gcd(a, b) !== 1) { k = pick([2, 3, 4, 5, 6]); a = randInt(1, 6); b = randInt(1, 7) }
  return expression(`Factorise : ${poly([k * a, 'x'], [k * b, ''])}`, `${k}(${poly([a, 'x'], [b, ''])})`, 'factored', {
    explanation: `${k} est un facteur commun : ${poly([k * a, 'x'])} = ${k} × ${poly([a, 'x'])} et ${k * b} = ${k} × ${b}.`,
  })
}

const lit: Tiers = [
  [
    () => {
      const a = randInt(2, 9), b = randInt(1, 12), x = randInt(1, 10)
      return numeric(`Calcule ${a}x + ${b} pour x = ${x}.`, a * x + b, { explanation: `${a} × ${x} + ${b} = ${a * x} + ${b} = ${a * x + b}.` })
    },
    () => {
      const a = randInt(2, 9), b = randInt(1, 9), x = randInt(b + 1, 12)
      return numeric(`Calcule ${a}(x − ${b}) pour x = ${x}.`, a * (x - b), { explanation: `${a} × (${x} − ${b}) = ${a} × ${x - b} = ${a * (x - b)}.` })
    },
    () => {
      const kind = randInt(0, 2)
      if (kind === 0) {
        const c = randInt(2, 15)
        return numeric(`Le périmètre d'un carré de côté c est donné par la formule P = 4 × c. Calcule P pour c = ${c} cm (en cm).`, 4 * c, { explanation: `P = 4 × ${c} = ${4 * c} cm.` })
      }
      if (kind === 1) {
        const c = randInt(2, 15)
        return numeric(`Le périmètre d'un triangle équilatéral de côté c est P = 3 × c. Calcule P pour c = ${c} m (en m).`, 3 * c, { explanation: `P = 3 × ${c} = ${3 * c} m.` })
      }
      const L = randInt(3, 15), l = randInt(2, L - 1)
      return numeric(`L'aire d'un rectangle est donnée par la formule A = L × l. Calcule A pour L = ${L} m et l = ${l} m (en m²).`, L * l, { explanation: `A = ${L} × ${l} = ${L * l} m².` })
    },
    () => {
      const n = randInt(2, 7), k = randInt(2, 9), kind = randInt(0, 2)
      if (kind === 0) {
        return expression(`Réduis : ${Array(n).fill('x').join(' + ')}`, poly([n, 'x']), 'developed', {
          explanation: `On ajoute ${n} fois x : c'est ${n} × x, qu'on écrit ${n}x.`,
        })
      }
      if (kind === 1) {
        return expression(`Réduis : ${k}x + x`, poly([k + 1, 'x']), 'developed', { explanation: `x, c'est 1 × x : ${k} + 1 = ${k + 1}, donc ${k + 1}x.` })
      }
      return expression(`Réduis : x + ${k}x + x`, poly([k + 2, 'x']), 'developed', { explanation: `x, c'est 1 × x : 1 + ${k} + 1 = ${k + 2}, donc ${k + 2}x.` })
    },
    () => {
      const p = randInt(2, 9), q = randInt(2, 9), a = randInt(1, 10), b = randInt(1, 10)
      return numeric(`Calcule ${p}a + ${q}b pour a = ${a} et b = ${b}.`, p * a + q * b, {
        explanation: `${p} × ${a} + ${q} × ${b} = ${p * a} + ${q * b} = ${p * a + q * b}.`,
      })
    },
    () => {
      const a = randInt(2, 9), b = randInt(2, 9)
      const txt = pick([`${a} × x × ${b}`, `x × ${a} × ${b}`, `${a} × ${b} × x`])
      return expression(`Écris plus simplement : ${txt}`, poly([a * b, 'x']), 'developed', {
        explanation: `On regroupe les nombres : ${a} × ${b} = ${a * b}, d'où ${a * b}x.`,
      })
    },
  ],
  [
    () => {
      const a = randInt(2, 9), b = randInt(2, 9), c = randInt(1, a + b - 2)
      return expression(`Réduis : ${poly([a, 'x'], [b, 'x'], [-c, 'x'])}`, poly([a + b - c, 'x']), 'developed', {
        explanation: `${a} + ${b} − ${c} = ${a + b - c}, donc ${poly([a + b - c, 'x'])}.`,
      })
    },
    () => {
      const a = randInt(2, 5), b = randInt(1, 9), x = randInt(2, 6)
      return numeric(`Calcule ${a}x² + ${b} pour x = ${x}.`, a * x * x + b, { explanation: `x² = ${x} × ${x} = ${x * x}, puis ${a} × ${x * x} + ${b} = ${a * x * x + b}.` })
    },
    () => {
      const kind = randInt(0, 2)
      if (kind === 0) {
        const a = randInt(2, 6), b = randInt(2, 8), n = randInt(2, 9)
        return numeric(`Le prix (en €) de la location d'un vélo pendant n heures est P = ${a}n + ${b}. Combien coûte une location de ${n} heures (en €) ?`, a * n + b, { explanation: `P = ${a} × ${n} + ${b} = ${a * n + b} €.` })
      }
      if (kind === 1) {
        const a = randInt(2, 3), b = randInt(3, 7), d = randInt(3, 15)
        return numeric(`Le prix (en €) d'une course de taxi de d kilomètres est P = ${a}d + ${b}. Combien coûte une course de ${d} km (en €) ?`, a * d + b, { explanation: `P = ${a} × ${d} + ${b} = ${a * d + b} €.` })
      }
      const a = randInt(20, 40), b = randInt(10, 30), j = randInt(2, 7)
      return numeric(`Le prix (en €) d'un forfait de ski de j jours est P = ${a}j + ${b}. Combien coûte un forfait de ${j} jours (en €) ?`, a * j + b, { explanation: `P = ${a} × ${j} + ${b} = ${a * j + b} €.` })
    },
    () => {
      const a = randInt(2, 9), b = randInt(2, 9), kind = randInt(0, 2)
      if (kind === 0) {
        return expression(`Écris le plus simplement possible : ${pick([`${a} × x × x`, `x × ${a} × x`])}`, poly([a, 'x²']), 'developed', {
          explanation: `x × x s'écrit x², donc ${a}x².`,
        })
      }
      if (kind === 1) {
        return expression(`Écris le plus simplement possible : ${a}x × ${b}`, poly([a * b, 'x']), 'developed', { explanation: `${a} × ${b} = ${a * b}, donc ${a * b}x.` })
      }
      return expression(`Écris le plus simplement possible : ${a}x × ${b}x`, poly([a * b, 'x²']), 'developed', {
        explanation: `${a} × ${b} = ${a * b} et x × x = x², donc ${a * b}x².`,
      })
    },
    () => {
      const b = randInt(2, 9)
      const [txt, exp] = pick<[string, string]>([
        [`le triple de x augmenté de ${b}`, poly([3, 'x'], [b, ''])],
        [`le double de x diminué de ${b}`, poly([2, 'x'], [-b, ''])],
        [`${b} de plus que le quadruple de x`, poly([4, 'x'], [b, ''])],
        [`le carré de x augmenté de ${b}`, poly([1, 'x²'], [b, ''])],
        [`le double de la somme de x et de ${b}`, `2(${xPlus(b)})`],
        [`la différence entre ${b} fois x et 1`, poly([b, 'x'], [-1, ''])],
        [`le produit de x par ${b}, diminué de x`, poly([b, 'x'], [-1, 'x'])],
      ])
      return expression(`Traduis par une expression en fonction de x : « ${txt} ».`, exp, 'any', {
        explanation: `On traduit mot à mot : ${exp}.`, answer: exp,
      })
    },
    () => {
      const k = randInt(2, 9), b = randNonZero(-9, 9)
      return expression(`Développe : ${k}(${xPlus(b)})`, poly([k, 'x'], [k * b, '']), 'developed', {
        explanation: `${k} × x ${b < 0 ? '−' : '+'} ${k} × ${Math.abs(b)} = ${poly([k, 'x'], [k * b, ''])}.`,
      })
    },
  ],
  [
    () => {
      const a = randInt(3, 9), b = randInt(1, 9), c = randInt(1, a - 2), d = randInt(1, 9)
      return expression(`Réduis : ${poly([a, 'x'], [b, ''], [-c, 'x'], [d, ''])}`, poly([a - c, 'x'], [b + d, '']), 'developed', {
        explanation: `On regroupe les x : ${a} − ${c} = ${a - c}, puis les nombres : ${b} + ${d} = ${b + d}.`,
      })
    },
    () => {
      const k = randInt(2, 9), a = randInt(2, 9), b = randInt(1, 12)
      return expression(`Développe : ${k}(${poly([a, 'x'], [b, ''])})`, poly([k * a, 'x'], [k * b, '']), 'developed', {
        explanation: `${k} × ${poly([a, 'x'])} + ${k} × ${b} = ${poly([k * a, 'x'], [k * b, ''])}.`,
      })
    },
    () => {
      const k = randInt(2, 9), b = randNonZero(-9, 9)
      return expression(`Factorise : ${poly([k, 'x'], [k * b, ''])}`, `${k}(${xPlus(b)})`, 'factored', {
        explanation: `${k * Math.abs(b)} = ${k} × ${Math.abs(b)}, donc ${k} est un facteur commun : ${k}(${xPlus(b)}).`,
      })
    },
    () => {
      let a = randInt(2, 5), b = randInt(1, 6), x = randInt(2, 5)
      while (a * x <= b) { a = randInt(2, 5); b = randInt(1, 6); x = randInt(2, 5) }
      const c = randInt(1, 9), v = a * x * x - b * x + c
      return numeric(`Calcule ${poly([a, 'x²'], [-b, 'x'], [c, ''])} pour x = ${x}.`, v, {
        explanation: `${a} × ${x * x} − ${b} × ${x} + ${c} = ${a * x * x} − ${b * x} + ${c} = ${v}.`,
      })
    },
    () => {
      const k = randInt(2, 9), a = randInt(2, 7), b = randInt(1, 9)
      if (Math.random() < 0.5) {
        return expression(`Développe : ${k}(${poly([a, 'x'], [-b, ''])})`, poly([k * a, 'x'], [-k * b, '']), 'developed', {
          explanation: `${k} × ${a}x − ${k} × ${b} = ${poly([k * a, 'x'], [-k * b, ''])}.`,
        })
      }
      return expression(`Développe : ${k}(${poly([b, ''], [-a, 'x'])})`, poly([k * b, ''], [-k * a, 'x']), 'developed', {
        explanation: `${k} × ${b} − ${k} × ${a}x = ${poly([k * b, ''], [-k * a, 'x'])}.`,
      })
    },
    () => {
      const a = randInt(2, 7), c = randInt(1, 6), b = randInt(2, 9)
      let d = randInt(1, 9)
      while (d === b) d = randInt(1, 9)
      return expression(`Réduis : ${poly([a, 'x²'], [b, 'x'], [c, 'x²'], [-d, 'x'])}`, poly([a + c, 'x²'], [b - d, 'x']), 'developed', {
        explanation: `Les x² ensemble : ${a} + ${c} = ${a + c} ; les x ensemble : ${b} − ${d} = ${fmt(b - d)}. On ne mélange pas x² et x !`,
      })
    },
  ],
  [
    () => {
      const k = randInt(2, 6), a = randInt(1, 5), b = randInt(1, 9), c = randInt(1, 9)
      return expression(`Développe et réduis : ${k}(${poly([a, 'x'], [b, ''])}) + ${poly([c, 'x'])}`, poly([k * a + c, 'x'], [k * b, '']), 'developed', {
        explanation: `${k}(${poly([a, 'x'], [b, ''])}) = ${poly([k * a, 'x'], [k * b, ''])}, puis on ajoute ${poly([c, 'x'])} : ${poly([k * a + c, 'x'], [k * b, ''])}.`,
      })
    },
    factorKab,
    () => {
      const k = randInt(2, 5), a = randInt(1, 4), b = randInt(1, 6), m = randInt(2, 5), c = randInt(1, 4), d = randInt(1, 6)
      return expression(`Développe et réduis : ${k}(${poly([a, 'x'], [b, ''])}) + ${m}(${poly([c, 'x'], [d, ''])})`, poly([k * a + m * c, 'x'], [k * b + m * d, '']), 'developed', {
        explanation: `${poly([k * a, 'x'], [k * b, ''])} + ${poly([m * c, 'x'], [m * d, ''])} = ${poly([k * a + m * c, 'x'], [k * b + m * d, ''])}.`,
      })
    },
    () => {
      const a = randInt(1, 9), k = randInt(2, 4)
      if (Math.random() < 0.5) {
        return expression(`Un triangle a pour côtés x, ${xPlus(a)} et ${k}x (en cm). Exprime son périmètre en fonction de x (forme réduite).`, poly([k + 2, 'x'], [a, '']), 'developed', {
          explanation: `P = x + x + ${a} + ${k}x = ${poly([k + 2, 'x'], [a, ''])}.`,
        })
      }
      return expression(`Un pentagone a trois côtés de longueur x et deux côtés de longueur ${xPlus(a)} (en m). Exprime son périmètre en fonction de x (forme réduite).`, poly([5, 'x'], [2 * a, '']), 'developed', {
        explanation: `P = 3x + 2(${xPlus(a)}) = 3x + 2x + ${2 * a} = ${poly([5, 'x'], [2 * a, ''])}.`,
      })
    },
    () => {
      const k = randInt(2, 12), kind = randInt(0, 2)
      if (kind === 0) {
        return expression(`Factorise : ${k}x + ${k}`, `${k}(x + 1)`, 'factored', { explanation: `${k} = ${k} × 1, donc ${k}x + ${k} = ${k}(x + 1).` })
      }
      if (kind === 1) {
        return expression(`Factorise : ${k}x − ${k}`, `${k}(x − 1)`, 'factored', { explanation: `${k} = ${k} × 1, donc ${k}x − ${k} = ${k}(x − 1).` })
      }
      const a = randInt(2, 4), kk = randInt(2, 6)
      return expression(`Factorise : ${kk * a}x + ${kk}`, `${kk}(${poly([a, 'x'], [1, ''])})`, 'factored', {
        explanation: `${kk * a}x = ${kk} × ${a}x et ${kk} = ${kk} × 1 : ${kk}(${poly([a, 'x'], [1, ''])}).`,
      })
    },
    () => {
      const kind = randInt(0, 2)
      if (kind === 0) {
        const L = pick([2.5, 1.5, 3, 4]), l = pick([2, 4, 6]), h = randInt(2, 5)
        return numeric(`Le volume d'un pavé droit est V = L × l × h. Calcule V pour L = ${fmt(L)} m, l = ${l} m et h = ${h} m (en m³).`, L * l * h, {
          explanation: `V = ${fmt(L)} × ${l} × ${h} = ${fmt(L * l)} × ${h} = ${fmt(L * l * h)} m³.`,
        })
      }
      if (kind === 1) {
        const L = randInt(4, 15), l = pick([1.5, 2.5, 3.5, 0.5])
        return numeric(`Le périmètre d'un rectangle est P = 2 × (L + l). Calcule P pour L = ${L} cm et l = ${fmt(l)} cm (en cm).`, 2 * (L + l), {
          explanation: `P = 2 × (${L} + ${fmt(l)}) = 2 × ${fmt(L + l)} = ${fmt(2 * (L + l))} cm.`,
        })
      }
      const v = pick([12, 15, 18, 40, 60, 80]), t = pick([0.5, 1.5, 2.5, 3])
      return numeric(`La distance parcourue à vitesse constante est d = v × t. Calcule d pour v = ${v} km/h et t = ${fmt(t)} h (en km).`, v * t, {
        explanation: `d = ${v} × ${fmt(t)} = ${fmt(v * t)} km.`,
      })
    },
  ],
  [
    () => {
      const b = randInt(2, 9)
      return expression(`Un enclos rectangulaire mesure x + ${b} mètres de long et x mètres de large. Exprime son périmètre en fonction de x (développé et réduit).`, poly([4, 'x'], [2 * b, '']), 'developed', {
        explanation: `P = 2 × (x + ${b} + x) = 2 × (2x + ${b}) = 4x + ${2 * b}.`,
      })
    },
    () => {
      const a = randInt(2, 9), x = randInt(2, 12), b = randInt(1, 20)
      return numeric(`Quel nombre x vérifie l'égalité ${a}x + ${b} = ${a * x + b} ?`, x, {
        explanation: `${a}x doit valoir ${a * x + b} − ${b} = ${a * x}, donc x = ${a * x} ÷ ${a} = ${x}.`,
      })
    },
    () => {
      const a = randInt(2, 6), b = randInt(1, 9), c = randInt(1, a - 1), x = randInt(1, 6)
      let dd = 0
      while (dd === 0) dd = Math.random() < 0.5 ? (a - c) * x + b : (a - c) * x + b + randNonZero(-3, 3)
      const ok = a * x + b === c * x + dd
      return choice(`L'égalité ${poly([a, 'x'], [b, ''])} = ${poly([c, 'x'], [dd, ''])} est-elle vraie pour x = ${x} ?`, ok ? 'Oui' : 'Non', [ok ? 'Non' : 'Oui'],
        `À gauche : ${a} × ${x} + ${b} = ${a * x + b}. À droite : ${c} × ${x} ${sgn(dd)} = ${c * x + dd}. ${ok ? 'Égaux : elle est vraie.' : 'Différents : elle est fausse.'}`)
    },
    () => {
      const a = randInt(1, 9)
      if (Math.random() < 0.5) {
        const k = randInt(2, 9)
        return expression(`Un rectangle mesure ${xPlus(a)} cm de long et ${k} cm de large. Exprime son aire en fonction de x (forme développée).`, poly([k, 'x'], [k * a, '']), 'developed', {
          explanation: `A = ${k} × (${xPlus(a)}) = ${poly([k, 'x'], [k * a, ''])}.`,
        })
      }
      return expression(`Un potager carré de côté x mètres est agrandi de ${a} m dans la longueur (la largeur reste x). Exprime sa nouvelle aire en fonction de x (forme développée).`, poly([1, 'x²'], [a, 'x']), 'developed', {
        explanation: `A = x × (${xPlus(a)}) = x × x + x × ${a} = ${poly([1, 'x²'], [a, 'x'])}.`,
      })
    },
    () => {
      const a = randInt(1, 9), k = randInt(2, 6)
      if (Math.random() < 0.5) {
        let b = randInt(1, 12)
        while (b === k * a) b = randInt(1, 12)
        return expression(`Programme de calcul : choisis un nombre x, ajoute ${a}, multiplie le résultat par ${k}, puis soustrais ${b}. Exprime le résultat en fonction de x (forme développée et réduite).`, poly([k, 'x'], [k * a - b, '']), 'developed', {
          explanation: `${k}(${xPlus(a)}) − ${b} = ${poly([k, 'x'], [k * a, ''])} − ${b} = ${poly([k, 'x'], [k * a - b, ''])}.`,
        })
      }
      const m = randInt(2, 4)
      return expression(`Programme de calcul : choisis un nombre x, multiplie-le par ${k}, ajoute ${a}, puis multiplie le résultat par ${m}. Exprime le résultat en fonction de x (forme développée).`, poly([k * m, 'x'], [a * m, '']), 'developed', {
        explanation: `${m}(${poly([k, 'x'], [a, ''])}) = ${poly([k * m, 'x'], [a * m, ''])}.`,
      })
    },
    () => {
      const [name, k] = pick<[string, number]>([['double', 2], ['triple', 3], ['quadruple', 4], ['quintuple', 5]])
      const a = randInt(1, 9), x = randInt(1, 12)
      return numeric(`Le ${name} de la somme de x et de ${a} vaut ${k * (x + a)}. Que vaut x ?`, x, {
        explanation: `${k}(x + ${a}) = ${k * (x + a)}, donc x + ${a} = ${k * (x + a)} ÷ ${k} = ${x + a}, puis x = ${x + a} − ${a} = ${x}.`,
      })
    },
  ],
]

// ═══ Proportionnalité ═══════════════════════════════════════════════════
const prop: Tiers = [
  [
    () => {
      const m = marchandise(), n = randInt(2, 6), k = randInt(n + 1, 12)
      return numeric(`${n} ${m.nom} coûtent ${n * m.prix} écus. Combien coûtent ${k} ${m.nom} (en écus) ?`, k * m.prix, {
        explanation: `Un objet coûte ${n * m.prix} ÷ ${n} = ${m.prix} écus, donc ${k} × ${m.prix} = ${k * m.prix} écus.`,
      })
    },
    () => {
      const [ing, unit, q] = pick<[string, string, number]>([['pâtes', 'g', pick([150, 200, 250])], ['riz', 'g', pick([120, 150, 180])], ['lait', 'cL', pick([25, 30, 40])], ['chocolat', 'g', pick([60, 80, 100])]])
      const p = pick([2, 3, 4]), k = randInt(2, 5)
      return numeric(`Pour ${p} personnes, il faut ${q} ${unit} de ${ing}. Combien en faut-il pour ${p * k} personnes (en ${unit}) ?`, q * k, {
        explanation: `${p * k} personnes, c'est ${k} fois plus que ${p} : ${q} × ${k} = ${q * k} ${unit}.`,
      })
    },
    () => {
      const a = randInt(2, 9), c = randInt(2, 9)
      let b = randInt(2, 12)
      while (b === a) b = randInt(2, 12)
      return numeric(`Dans un tableau de proportionnalité, ${a} correspond à ${a * c}. À quel nombre correspond ${b} ?`, b * c, {
        explanation: `On passe de ${a} à ${a * c} en multipliant par ${c}, donc ${b} × ${c} = ${b * c}.`,
      })
    },
    () => {
      const p = pick([50, 10]), base = p === 50 ? 2 * randInt(5, 90) : 10 * randInt(2, 40)
      return numeric(`Calcule ${p} % de ${base}.`, (p * base) / 100, {
        explanation: p === 50 ? `50 %, c'est la moitié : ${base} ÷ 2 = ${base / 2}.` : `10 %, c'est le dixième : ${base} ÷ 10 = ${base / 10}.`,
      })
    },
    () => {
      const [sujet, v] = pick<[string, number]>([
        ['Un randonneur marche', pick([4, 5])], ['Une cycliste roule', pick([12, 15, 18, 20])],
        ['Un car roule', pick([60, 70, 80, 90])], ['Un cheval galope', pick([20, 25, 30])],
      ])
      const t = randInt(2, 5)
      return numeric(`${sujet} à ${v} km/h pendant ${t} h. Quelle distance est parcourue (en km) ?`, v * t, {
        explanation: `En 1 h : ${v} km, donc en ${t} h : ${v} × ${t} = ${v * t} km.`,
      })
    },
    () => {
      const u = pick([2, 5, 10, 20, 50]), n = randInt(2, 12), plan = pick(['du château', 'du collège', 'du parc', 'du village', 'du stade'])
      return numeric(`Sur le plan ${plan}, 1 cm représente ${u} m. Quelle longueur réelle (en m) représentent ${n} cm ?`, n * u, {
        explanation: `${n} × ${u} = ${n * u} m.`,
      })
    },
  ],
  [
    () => {
      const p = pick([20, 25, 75, 10]), base = randInt(2, 20) * 20
      return numeric(`Calcule ${p} % de ${base}.`, (p * base) / 100, { explanation: `${base} × ${p} ÷ 100 = ${fmt((p * base) / 100)}.` })
    },
    () => {
      const n = randInt(2, 5), price = randInt(3, 10) * 0.5, m = randInt(n + 1, 12)
      return numeric(`${n} cahiers coûtent ${fmt(n * price)} €. Combien coûtent ${m} cahiers (en €) ?`, m * price, {
        explanation: `Prix d'un cahier : ${fmt(n * price)} ÷ ${n} = ${fmt(price)} €, donc ${m} × ${fmt(price)} = ${fmt(m * price)} €.`,
      })
    },
    () => {
      const c = pick([1.5, 2.5, 0.5, 3.5]), a = 2 * randInt(1, 6)
      let b = 2 * randInt(1, 9)
      while (b === a) b = 2 * randInt(1, 9)
      return numeric(`Dans un tableau de proportionnalité, ${a} correspond à ${fmt(a * c)}. À quel nombre correspond ${b} ?`, b * c, {
        explanation: `Coefficient : ${fmt(a * c)} ÷ ${a} = ${fmt(c)}, donc ${b} × ${fmt(c)} = ${fmt(b * c)}.`,
      })
    },
    () => {
      const [sujet, v] = pick<[string, number]>([['Un car', pick([60, 70, 80, 90])], ['Un messager à cheval', pick([12, 15, 18, 20])], ['Un train régional', pick([80, 100, 120])], ['Une cycliste', pick([14, 16, 18])]])
      const t = randInt(2, 4)
      return numeric(`${sujet} parcourt ${v * t} km en ${t} h à vitesse constante. Quelle est sa vitesse (en km/h) ?`, v, {
        explanation: `Distance parcourue en 1 h : ${v * t} ÷ ${t} = ${v} km, soit ${v} km/h.`,
      })
    },
    () => {
      const [prod, ing, unit, u] = pick<[string, string, string, number]>([
        ['crêpes', 'farine', 'g', pick([15, 20, 25])], ['cookies', 'beurre', 'g', pick([10, 12, 15])],
        ['gaufres', 'lait', 'mL', pick([30, 40, 50])], ['muffins', 'sucre', 'g', pick([12, 15, 20])],
      ])
      const n = pick([4, 6, 8])
      let m = randInt(3, 15)
      while (m % n === 0) m = randInt(3, 15)
      return numeric(`Pour ${n} ${prod}, il faut ${n * u} ${unit} de ${ing}. Combien en faut-il pour ${m} ${prod} (en ${unit}) ?`, m * u, {
        explanation: `Pour 1 : ${n * u} ÷ ${n} = ${u} ${unit}, donc pour ${m} : ${m} × ${u} = ${m * u} ${unit}.`,
      })
    },
    () => {
      const a = randInt(1, 4), b = pick([3, 5, 7, 10, 25]), k = randInt(2, 6)
      return numeric(`Sur une carte, ${a} cm représente${a > 1 ? 'nt' : ''} ${b} km. Combien de kilomètres représentent ${a * k} cm ?`, b * k, {
        explanation: `${a * k} cm, c'est ${k} fois ${a} cm, donc ${b} × ${k} = ${b * k} km.`,
      })
    },
  ],
  [
    () => {
      const [a, b] = pick([[4, 3], [5, 4], [8, 6], [10, 7], [10, 8], [5, 3], [8, 5]]), k = randInt(2, 9)
      return numeric(`${a} kg de blé donnent ${b} kg de farine au moulin. Combien de farine obtient-on avec ${a * k} kg de blé (en kg) ?`, b * k, {
        explanation: `${a * k} = ${a} × ${k}, donc ${b} × ${k} = ${b * k} kg.`,
      })
    },
    () => {
      const p = pick([5, 15, 30, 35, 40, 60, 75]), base = randInt(2, 30) * 20
      return numeric(`Calcule ${p} % de ${base}.`, (p * base) / 100, { explanation: `${base} × ${p} ÷ 100 = ${fmt((p * base) / 100)}.` })
    },
    () => {
      const total = pick([20, 25, 40, 50]), pct = pick([10, 20, 30, 40, 60, 80].filter((q) => (total * q) % 100 === 0).concat(total === 20 || total === 40 ? [15, 35, 45] : [12, 24, 36, 44]))
      const part = (total * pct) / 100
      const [who, what] = pick([['élèves de la classe', 'font de la natation'], ['joueurs du club', 'sont gauchers'], ['soldats de la garnison', 'sont blessés'], ['moutons du troupeau', 'sont noirs']])
      return numeric(`Sur ${total} ${who}, ${part} ${what}. Quel pourcentage cela représente-t-il ?`, pct, {
        explanation: `${part} ÷ ${total} = ${fmt(part / total)}, soit ${pct} %.`,
      })
    },
    () => {
      const v = pick([40, 50, 60, 80, 90]), t = pick([0.5, 1.5, 2.5, 2, 3]), d = v * t
      return numeric(`Combien de temps faut-il pour parcourir ${fmt(d)} km à ${v} km/h ? (en heures)`, t, {
        explanation: `Durée = distance ÷ vitesse = ${fmt(d)} ÷ ${v} = ${fmt(t)} h.`,
      })
    },
    () => {
      const scale = pick([100, 200, 250, 500, 1000]), cm = randInt(2, 15)
      const obj = pick(['la grande salle du château', 'le terrain de handball', 'la cour du collège', 'le jardin du monastère'])
      return numeric(`Sur un plan à l'échelle 1/${scale}, ${obj} mesure ${cm} cm de long. Quelle est sa longueur réelle (en m) ?`, (cm * scale) / 100, {
        explanation: `${cm} × ${scale} = ${cm * scale} cm = ${fmt((cm * scale) / 100)} m.`,
      })
    },
    () => {
      const fruit = pick(['pommes', 'cerises', 'tomates', 'carottes', 'poires']), u = randInt(3, 9) * 0.5, n = randInt(2, 6)
      let m = randInt(2, 10)
      while (m === n) m = randInt(2, 10)
      return numeric(`${n} kg de ${fruit} coûtent ${fmt(n * u)} €. Quelle masse de ${fruit} peut-on acheter avec ${fmt(m * u)} € (en kg) ?`, m, {
        explanation: `Prix d'un kilo : ${fmt(n * u)} ÷ ${n} = ${fmt(u)} €, puis ${fmt(m * u)} ÷ ${fmt(u)} = ${m} kg.`,
      })
    },
  ],
  [
    () => {
      const v = randInt(3, 12) * 4, mins = pick([15, 30, 45, 75, 90, 105])
      return numeric(`Un messager galope à ${v} km/h pendant ${mins} minutes. Quelle distance parcourt-il (en km) ?`, (v * mins) / 60, {
        explanation: `${mins} min = ${fmt(mins / 60)} h, donc ${v} × ${fmt(mins / 60)} = ${fmt((v * mins) / 60)} km.`,
      })
    },
    () => {
      const v = pick([4, 5, 6, 8, 10, 12]), d = v * pick([0.5, 1.5, 2, 2.5, 3])
      return numeric(`Une troupe marche à ${v} km/h. Combien de minutes lui faut-il pour parcourir ${fmt(d)} km ?`, (d / v) * 60, {
        explanation: `Durée = ${fmt(d)} ÷ ${v} = ${fmt(d / v)} h = ${fmt((d / v) * 60)} min.`,
      })
    },
    () => {
      const cm = randInt(2, 14), scale = pick([25000, 50000, 100000])
      return numeric(`Sur une carte à l'échelle 1/${scale}, deux châteaux sont à ${cm} cm l'un de l'autre. Quelle est la distance réelle (en km) ?`, (cm * scale) / 100000, {
        explanation: `${cm} × ${scale} = ${cm * scale} cm = ${fmt((cm * scale) / 100000)} km.`,
      })
    },
    () => {
      const price = randInt(2, 15) * 20, r = pick([5, 10, 15, 20, 25, 30, 50])
      const obj = pick(['Le billet du festival', "L'abonnement au club de basket", 'La location d’un étal au marché', 'Un jeu vidéo', 'Une trottinette'])
      return numeric(`${obj} coûtait ${price} €. Son prix augmente de ${r} %. Quel est le nouveau prix (en €) ?`, price * (1 + r / 100), {
        explanation: `Hausse : ${price} × ${r} ÷ 100 = ${fmt((price * r) / 100)} €, donc ${price} + ${fmt((price * r) / 100)} = ${fmt(price * (1 + r / 100))} €.`,
      })
    },
    () => {
      const scale = pick([10000, 20000, 25000, 50000, 100000, 200000]), cm = randInt(2, 12)
      const real = (cm * scale) / 100000
      return numeric(`Sur une carte, deux villages distants de ${fmt(real)} km sont séparés de ${cm} cm. L'échelle de la carte s'écrit 1/n : que vaut n ?`, scale, {
        explanation: `${fmt(real)} km = ${fmt(real * 100000)} cm, et ${fmt(real * 100000)} ÷ ${cm} = ${scale} : l'échelle est 1/${scale}.`, inputHint: 'n',
      })
    },
    () => {
      let v = 0, min = 0, d = 0.25
      while (!Number.isInteger(d * 10)) { v = pick([6, 9, 12, 15, 18, 24, 30, 36]); min = pick([10, 12, 15, 20, 30]); d = (v * min) / 60 }
      const who = pick(['Un cheval', 'Une coureuse', 'Un cycliste', 'Un chien de traîneau'])
      return numeric(`${who} parcourt ${fmt(d)} km en ${min} minutes à allure régulière. Quelle est sa vitesse (en km/h) ?`, v, {
        explanation: `1 h = 60 min = ${fmt(60 / min)} × ${min} min, donc ${fmt(d)} × ${fmt(60 / min)} = ${v} km/h.`,
      })
    },
  ],
  [
    () => {
      const price = randInt(8, 40) * 20, r = pick([10, 15, 20, 25, 30, 40])
      return numeric(`Une armure coûte ${price} écus. Le marchand fait une remise de ${r} %. Quel est le nouveau prix (en écus) ?`, price * (1 - r / 100), {
        explanation: `Remise : ${price} × ${r} ÷ 100 = ${fmt((price * r) / 100)}, donc ${price} − ${fmt((price * r) / 100)} = ${fmt(price * (1 - r / 100))}.`,
      })
    },
    () => {
      const p = randInt(2, 6), per = pick([50, 75, 100, 120, 150]), g = p * per
      let m = randInt(p + 1, 20)
      while (m % p === 0) m = randInt(p + 1, 20)
      return numeric(`Pour un banquet de ${p} convives, le cuisinier utilise ${g} g de viande. Combien de grammes pour ${m} convives ?`, per * m, {
        explanation: `${g} ÷ ${p} = ${per} g par convive, puis × ${m} = ${per * m} g.`,
      })
    },
    () => {
      const r = pick([10, 20, 25, 40, 50]), initial = randInt(3, 30) * 20, fin = initial * (1 - r / 100)
      const obj = pick(['un vélo', 'une console', 'un manteau', 'une tente de camping'])
      return numeric(`Après une remise de ${r} %, ${obj} coûte ${fmt(fin)} €. Quel était son prix avant la remise (en €) ?`, initial, {
        explanation: `Le prix payé représente ${100 - r} % du prix initial. 1 % vaut ${fmt(fin)} ÷ ${100 - r} = ${fmt(initial / 100)} €, donc 100 % = ${initial} €.`,
      })
    },
    () => {
      const fruit = pick(['pommes de terre', 'oranges', 'carottes', 'pommes'])
      const aKg = randInt(2, 5)
      let bKg = randInt(2, 6)
      while (bKg === aKg) bKg = randInt(2, 6)
      const aU = randInt(15, 35) / 10
      let bU = randInt(15, 35) / 10
      while (bU === aU) bU = randInt(15, 35) / 10
      const best = Math.min(aU, bU)
      return numeric(`Au marché, un sac de ${aKg} kg ${de(fruit)} coûte ${fmt(aKg * aU)} € et un sac de ${bKg} kg coûte ${fmt(bKg * bU)} €. Quel est le prix au kilo le plus avantageux (en €) ?`, best, {
        explanation: `${fmt(aKg * aU)} ÷ ${aKg} = ${fmt(aU)} €/kg et ${fmt(bKg * bU)} ÷ ${bKg} = ${fmt(bU)} €/kg : le meilleur prix est ${fmt(best)} €/kg.`,
      })
    },
    () => {
      const v1 = pick([10, 12, 16, 20]), t1 = pick([1, 1.5, 2, 2.5]), v2 = pick([6, 8, 14, 18]), t2 = pick([0.5, 1, 1.5, 2])
      return numeric(`Un cavalier parcourt ${fmt(v1 * t1)} km à ${v1} km/h, puis ${fmt(v2 * t2)} km à ${v2} km/h dans la montagne. Combien de temps dure son voyage au total (en heures) ?`, t1 + t2, {
        explanation: `${fmt(v1 * t1)} ÷ ${v1} = ${fmt(t1)} h, puis ${fmt(v2 * t2)} ÷ ${v2} = ${fmt(t2)} h : total ${fmt(t1 + t2)} h.`,
      })
    },
    () => {
      const scale = pick([100, 200, 500, 1000]), L = randInt(3, 10), l = randInt(2, L - 1)
      const RL = (L * scale) / 100, Rl = (l * scale) / 100
      return numeric(`Sur un plan à l'échelle 1/${scale}, un jardin rectangulaire mesure ${L} cm sur ${l} cm. Quelle est son aire réelle (en m²) ?`, RL * Rl, {
        explanation: `Dimensions réelles : ${L} × ${scale} cm = ${fmt(RL)} m et ${l} × ${scale} cm = ${fmt(Rl)} m. Aire : ${fmt(RL)} × ${fmt(Rl)} = ${fmt(RL * Rl)} m².`,
      })
    },
  ],
]

// ═══ Angles & triangles, aires et volumes ═══════════════════════════════
const withFigure = (ex: Exercise, figure: Figure): Exercise => withMeta(ex, { figure })
type Corner = 'ne' | 'nw' | 'se' | 'sw'
/** Inclinaison de la sécante pour que l'angle connu ait l'air de sa mesure. */
const tiltFor = (corner: Corner, v: number) => (corner === 'ne' || corner === 'sw' ? v : 180 - v)
/** Mesure d'angle « plausible » pour une figure de parallèles (pas trop proche de 90°). */
function parAngle() {
  let v = randInt(40, 140)
  while (Math.abs(v - 90) < 10) v = randInt(40, 140)
  return v
}

/** Triangle ABC avec [BC] prolongé au-delà de C (angle extérieur en C). */
function exteriorFigure(a: number, b: number): Figure {
  const r = triangleFromAngles(a, b)
  const D: [number, number] = [r.C[0] + (r.C[0] - r.B[0]) * 0.55, r.C[1] + (r.C[1] - r.B[1]) * 0.55]
  const points = fitPoints({ A: r.A, B: r.B, C: r.C, D })
  points.D = { ...points.D, label: '', hidden: true }
  return {
    points,
    segments: [{ a: 'A', b: 'B' }, { a: 'B', b: 'C' }, { a: 'C', b: 'A' }, { a: 'C', b: 'D', dashed: true }],
    angles: [
      { vertex: 'A', a: 'B', b: 'C', label: `${a}°` },
      { vertex: 'B', a: 'C', b: 'A', label: `${b}°` },
      { vertex: 'C', a: 'D', b: 'A', label: '?', color: RED },
    ],
  }
}

/** Deux parallèles (d) et (d′) ; A sur (d), B et C sur (d′) ; « Z » formé par la sécante (AB). */
function zFigure(alpha: number, gamma: number): Figure {
  const t = triangleFromAngles(alpha, gamma, 7)
  const B = t.A, C = t.B, A = t.C
  const points = fitPoints({
    A, B, C, L: [A[0] - 5.5, A[1]], R: [A[0] + 2, A[1]], P: [Math.min(-2, A[0] - 5.5), 0], Q: [Math.max(10, A[0] + 2), 0],
  })
  for (const k of ['L', 'R', 'P', 'Q']) points[k] = { ...points[k], hidden: true, label: '' }
  points.A = { ...points.A, pos: 'n' }
  return {
    points,
    segments: [{ a: 'L', b: 'R', mark: 'arrow' }, { a: 'P', b: 'Q', mark: 'arrow' }, { a: 'A', b: 'B' }, { a: 'A', b: 'C' }],
    angles: [
      { vertex: 'A', a: 'L', b: 'B', label: `${alpha}°` },
      { vertex: 'C', a: 'A', b: 'B', label: `${gamma}°` },
      { vertex: 'A', a: 'B', b: 'C', label: '?', color: RED },
    ],
    notes: [{ x: points.L.x + 14, y: points.L.y - 10, text: '(d)' }, { x: points.Q.x - 14, y: points.Q.y - 10, text: '(d′)' }],
  }
}

const geo: Tiers = [
  [
    () => {
      const a = randInt(20, 100), b = randInt(20, 160 - a)
      return numeric(`Dans un triangle, deux angles mesurent ${a}° et ${b}°. Combien mesure le troisième (en °) ?`, 180 - a - b, {
        explanation: `La somme des angles d'un triangle vaut 180° : 180 − ${a} − ${b} = ${180 - a - b}°.`,
      })
    },
    () => {
      const a = randInt(5, 85)
      return numeric(`Deux angles sont complémentaires. L'un mesure ${a}°. Combien mesure l'autre (en °) ?`, 90 - a, {
        explanation: `Complémentaires : leur somme vaut 90°. 90 − ${a} = ${90 - a}°.`,
      })
    },
    () => {
      const a = randInt(10, 170)
      return numeric(`Deux angles sont supplémentaires. L'un mesure ${a}°. Combien mesure l'autre (en °) ?`, 180 - a, {
        explanation: `Supplémentaires : leur somme vaut 180°. 180 − ${a} = ${180 - a}°.`,
      })
    },
    () => {
      const a = randInt(15, 165)
      return numeric(`Deux droites se coupent en un point O. L'un des angles formés mesure ${a}°. Combien mesure l'angle qui lui est opposé par le sommet (en °) ?`, a, {
        explanation: `Deux angles opposés par le sommet ont la même mesure : ${a}°.`,
      })
    },
    () => {
      const b = randInt(3, 15), h = randInt(2, 12)
      return numeric(`Un parallélogramme a une base de ${b} cm et une hauteur associée de ${h} cm. Quelle est son aire (en cm²) ?`, b * h, {
        explanation: `Aire = base × hauteur = ${b} × ${h} = ${b * h} cm².`,
      })
    },
    () => {
      const c = randInt(2, 20)
      return numeric(`Un triangle équilatéral a un périmètre de ${3 * c} cm. Combien mesure chacun de ses côtés (en cm) ?`, c, {
        explanation: `Ses trois côtés sont égaux : ${3 * c} ÷ 3 = ${c} cm.`,
      })
    },
  ],
  [
    () => {
      const apex = randInt(10, 80) * 2
      return numeric(`Un triangle isocèle a un angle au sommet de ${apex}°. Combien mesure chaque angle à la base (en °) ?`, (180 - apex) / 2, {
        explanation: `Les deux angles à la base sont égaux : (180 − ${apex}) ÷ 2 = ${(180 - apex) / 2}°.`,
      })
    },
    () => {
      const a = randInt(15, 75)
      return numeric(`ABC est rectangle en A et l'angle B̂ mesure ${a}°. Combien mesure Ĉ (en °) ?`, 90 - a, {
        explanation: `Les deux angles aigus d'un triangle rectangle sont complémentaires : 90 − ${a} = ${90 - a}°.`,
      })
    },
    () => {
      const a = randInt(20, 160)
      return numeric(`Deux droites sécantes forment quatre angles. L'un d'eux mesure ${a}°. Combien mesure chacun des deux angles qui lui sont adjacents (en °) ?`, 180 - a, {
        explanation: `Deux angles adjacents formés par deux droites sécantes forment un angle plat : 180 − ${a} = ${180 - a}°.`,
      })
    },
    () => {
      let b = randInt(3, 14), h = randInt(2, 12)
      while ((b * h) % 2) { b = randInt(3, 14); h = randInt(2, 12) }
      return numeric(`Un triangle a une base de ${b} cm et une hauteur relative à cette base de ${h} cm. Quelle est son aire (en cm²) ?`, (b * h) / 2, {
        explanation: `Aire = base × hauteur ÷ 2 = ${b} × ${h} ÷ 2 = ${(b * h) / 2} cm².`,
      })
    },
    () => {
      const a = randInt(4, 15), b = randInt(2, a)
      return numeric(`ABCD est un parallélogramme avec AB = ${a} cm et BC = ${b} cm. Quel est son périmètre (en cm) ?`, 2 * (a + b), {
        explanation: `Les côtés opposés d'un parallélogramme ont la même longueur : 2 × (${a} + ${b}) = ${2 * (a + b)} cm.`,
      })
    },
    () => {
      const d = randInt(3, 25) / 2
      if (Math.random() < 0.5) {
        return numeric(`A′ est le symétrique de A par rapport au point O, et OA = ${fmt(d)} cm. Quelle est la longueur AA′ (en cm) ?`, 2 * d, {
          explanation: `O est le milieu de [AA′] : AA′ = 2 × ${fmt(d)} = ${fmt(2 * d)} cm.`,
        })
      }
      return numeric(`M′ est le symétrique de M par rapport au point O, et MM′ = ${fmt(2 * d)} cm. Quelle est la longueur OM (en cm) ?`, d, {
        explanation: `O est le milieu de [MM′] : OM = ${fmt(2 * d)} ÷ 2 = ${fmt(d)} cm.`,
      })
    },
  ],
  [
    () => {
      const base = randInt(25, 75)
      return withFigure(numeric(`Le triangle ABC est isocèle en C et ses angles à la base mesurent ${base}°. Combien mesure l'angle Ĉ (en °) ?`, 180 - 2 * base, {
        explanation: `Les deux angles à la base sont égaux : 180 − 2 × ${base} = ${180 - 2 * base}°.`,
      }), triangleFigure({ shape: [base, base], angles: { A: `${base}°`, B: `${base}°`, C: '?' }, highlight: 'C', marks: { BC: 'tick', CA: 'tick' } }))
    },
    () => {
      const a = randInt(3, 12), b = randInt(3, 12)
      return numeric(`Un triangle a deux côtés de ${a} cm et ${b} cm. Le troisième côté mesure un nombre entier de cm. Quelle est sa longueur maximale (en cm) ?`, a + b - 1, {
        explanation: `Inégalité triangulaire : il doit être strictement inférieur à ${a} + ${b} = ${a + b}, donc au plus ${a + b - 1} cm.`,
      })
    },
    () => {
      const v = parAngle()
      const alt = Math.random() < 0.5
      const c1: Corner = alt ? pick(['se', 'sw'] as const) : pick(['ne', 'nw', 'se', 'sw'] as const)
      const c2: Corner = alt ? (c1 === 'se' ? 'nw' : 'ne') : c1
      const swap = Math.random() < 0.5
      const known = { at: (swap ? 'J' : 'I') as 'I' | 'J', corner: swap ? c2 : c1, label: `${v}°` }
      const asked = { at: (swap ? 'I' : 'J') as 'I' | 'J', corner: swap ? c1 : c2, label: '?' }
      return withFigure(numeric(`Les droites (d) et (d′) sont parallèles et l'angle marqué en ${known.at} mesure ${v}°. Combien mesure l'angle marqué « ? » en ${asked.at} (en °) ?`, v, {
        explanation: `Les deux angles sont ${alt ? 'alternes-internes' : 'correspondants'} et les droites sont parallèles : ils sont égaux, donc ${v}°.`,
      }), parallelsFigure({ tilt: tiltFor(known.corner, v), known, asked }))
    },
    () => {
      const r = randInt(2, 12)
      if (Math.random() < 0.5) {
        return numeric(`Calcule le périmètre d'un cercle de rayon ${r} cm. Prends π ≈ 3,14 (en cm).`, 2 * 3.14 * r, {
          explanation: `P = 2 × π × r ≈ 2 × 3,14 × ${r} = ${fmt(6.28 * r)} cm.`,
        })
      }
      const d = 2 * r
      const obj = pick(['Une roue de charrette', 'Une table ronde', 'Un bouclier rond', 'Un cerceau'])
      return numeric(`${obj} a un diamètre de ${d} dm. Quel est son périmètre (en dm) ? Prends π ≈ 3,14.`, 3.14 * d, {
        explanation: `P = π × diamètre ≈ 3,14 × ${d} = ${fmt(3.14 * d)} dm.`,
      })
    },
    () => {
      const L = randInt(3, 15), l = randInt(2, 10), h = randInt(2, 10)
      const obj = pick(['Un coffre', 'Un aquarium', 'Une boîte à chaussures', 'Une caisse de pommes'])
      return numeric(`${obj} a la forme d'un pavé droit de ${L} cm de long, ${l} cm de large et ${h} cm de haut. Quel est son volume (en cm³) ?`, L * l * h, {
        explanation: `V = L × l × h = ${L} × ${l} × ${h} = ${L * l * h} cm³.`,
      })
    },
    () => {
      const a = randInt(30, 150)
      const [P, Q, R, S] = pick([['A', 'B', 'C', 'D'], ['E', 'F', 'G', 'H'], ['M', 'N', 'O', 'P'], ['R', 'S', 'T', 'U']])
      return numeric(`${P}${Q}${R}${S} est un parallélogramme et l'angle en ${P} mesure ${a}°. Combien mesure l'angle en ${R} (en °) ?`, a, {
        explanation: `Dans un parallélogramme, deux angles opposés ont la même mesure : ${a}°.`,
      })
    },
  ],
  [
    () => {
      const a = randInt(30, 150)
      return numeric(`ABCD est un parallélogramme et Â mesure ${a}°. Combien mesure B̂ (en °) ?`, 180 - a, {
        explanation: `Deux angles consécutifs d'un parallélogramme sont supplémentaires : 180 − ${a} = ${180 - a}°.`,
      })
    },
    () => {
      const a = randInt(3, 12), b = randInt(a + 2, 15)
      return numeric(`Un triangle a deux côtés de ${a} cm et ${b} cm. Le troisième côté mesure un nombre entier de cm. Quelle est sa longueur minimale (en cm) ?`, b - a + 1, {
        explanation: `Il doit être strictement supérieur à ${b} − ${a} = ${b - a}, donc au moins ${b - a + 1} cm.`,
      })
    },
    () => {
      const a = randInt(30, 80), b = randInt(30, 150 - a)
      return withFigure(numeric(`Dans le triangle ABC, Â = ${a}° et B̂ = ${b}°. On prolonge [BC] au-delà de C. Combien mesure l'angle extérieur en C (en °) ?`, a + b, {
        explanation: `Ĉ = 180 − ${a} − ${b} = ${180 - a - b}°, l'angle extérieur vaut 180 − ${180 - a - b} = ${a + b}°.`,
      }), exteriorFigure(a, b))
    },
    () => {
      const v = parAngle()
      const known: { at: 'I' | 'J'; corner: Corner; label: string } = { at: pick(['I', 'J'] as const), corner: pick(['ne', 'nw', 'se', 'sw'] as const), label: `${v}°` }
      const flipH: Record<Corner, Corner> = { ne: 'nw', nw: 'ne', se: 'sw', sw: 'se' }
      const flipV: Record<Corner, Corner> = { ne: 'se', se: 'ne', nw: 'sw', sw: 'nw' }
      const other = known.at === 'I' ? 'J' : 'I'
      const asked = { at: other as 'I' | 'J', corner: Math.random() < 0.5 ? flipH[known.corner] : flipV[known.corner], label: '?' }
      return withFigure(numeric(`Les droites (d) et (d′) sont parallèles et l'angle marqué en ${known.at} mesure ${v}°. Combien mesure l'angle marqué « ? » en ${other} (en °) ?`, 180 - v, {
        explanation: `En ${other}, l'angle correspondant à celui de ${v}° mesure aussi ${v}°. L'angle marqué lui est adjacent et forme avec lui un angle plat : 180 − ${v} = ${180 - v}°.`,
      }), parallelsFigure({ tilt: tiltFor(known.corner, v), known, asked }))
    },
    () => {
      const r = randInt(1, 10)
      if (Math.random() < 0.5) {
        return numeric(`Calcule l'aire d'un disque de rayon ${r} cm. Prends π ≈ 3,14 (en cm²).`, 3.14 * r * r, {
          explanation: `A = π × r² ≈ 3,14 × ${r} × ${r} = 3,14 × ${r * r} = ${fmt(3.14 * r * r)} cm².`,
        })
      }
      return numeric(`Un bassin circulaire a un diamètre de ${2 * r} m. Quelle est sa surface (en m²) ? Prends π ≈ 3,14.`, 3.14 * r * r, {
        explanation: `Rayon : ${2 * r} ÷ 2 = ${r} m. A = π × r² ≈ 3,14 × ${r * r} = ${fmt(3.14 * r * r)} m².`,
      })
    },
    () => {
      let a = randInt(2, 9), b = randInt(2, 9)
      while ((a * b) % 2) { a = randInt(2, 9); b = randInt(2, 9) }
      const H = randInt(3, 15)
      return numeric(`Un prisme droit a pour base un triangle rectangle dont les côtés de l'angle droit mesurent ${a} cm et ${b} cm. Sa hauteur est de ${H} cm. Quel est son volume (en cm³) ?`, ((a * b) / 2) * H, {
        explanation: `Aire de la base : ${a} × ${b} ÷ 2 = ${(a * b) / 2} cm². Volume = aire de la base × hauteur = ${(a * b) / 2} × ${H} = ${((a * b) / 2) * H} cm³.`,
      })
    },
  ],
  [
    () => {
      const T = pick(['ABC', 'RST', 'EFG', 'KLM', 'IJK'])
      if (Math.random() < 0.5) {
        const [k, b] = pick([[2, 45], [3, 36], [4, 30], [7, 20], [8, 18]])
        return numeric(`Dans le triangle ${T} isocèle, l'angle au sommet est ${k} fois plus grand que chaque angle à la base. Combien mesure un angle à la base (en °) ?`, b, {
          explanation: `Si un angle à la base mesure b, alors b + b + ${k}b = 180, soit ${k + 2}b = 180 et b = ${b}°.`,
        })
      }
      const [k, apex] = pick([[2, 36], [4, 20], [7, 12]])
      return numeric(`Dans le triangle ${T} isocèle, chaque angle à la base est ${k} fois plus grand que l'angle au sommet. Combien mesure un angle à la base (en °) ?`, k * apex, {
        explanation: `Si l'angle au sommet mesure s, alors s + ${k}s + ${k}s = 180, soit ${2 * k + 1}s = 180, s = ${apex}° et un angle à la base mesure ${k} × ${apex} = ${k * apex}°.`,
      })
    },
    () => {
      const k = pick([2, 3, 4])
      let c = randInt(20, 120)
      while ((180 - c) % (k + 1)) c = randInt(20, 120)
      const x = (180 - c) / (k + 1)
      return numeric(`Dans un triangle ABC, Ĉ = ${c}° et Â = ${k} × B̂. Combien mesure Â (en °) ?`, k * x, {
        explanation: `${k}B̂ + B̂ = 180 − ${c} = ${180 - c}, donc ${k + 1}B̂ = ${180 - c}, B̂ = ${x}° et Â = ${k * x}°.`,
      })
    },
    () => {
      let alpha = randInt(35, 75), gamma = randInt(35, 80)
      while (180 - alpha - gamma < 30) { alpha = randInt(35, 75); gamma = randInt(35, 80) }
      return withFigure(numeric(`Sur la figure, les droites (d) et (d′) sont parallèles, A est sur (d), B et C sont sur (d′). L'angle entre (d) et [AB] mesure ${alpha}° et AĈB = ${gamma}°. Combien mesure l'angle BÂC (en °) ?`, 180 - alpha - gamma, {
        explanation: `L'angle de ${alpha}° en A et l'angle AB̂C sont alternes-internes : AB̂C = ${alpha}°. Dans le triangle ABC : 180 − ${alpha} − ${gamma} = ${180 - alpha - gamma}°.`,
      }), zFigure(alpha, gamma))
    },
    () => {
      const r = randInt(1, 5), h = randInt(2, 10)
      const [obj, u] = pick([['Une citerne cylindrique', 'm'], ['Un tonneau cylindrique', 'dm'], ['Une tour cylindrique', 'm'], ['Une boîte de conserve', 'cm']])
      return numeric(`${obj} a un rayon de ${r} ${u} et une hauteur de ${h} ${u}. Quel est son volume (en ${u}³) ? Prends π ≈ 3,14.`, 3.14 * r * r * h, {
        explanation: `V = π × r² × h ≈ 3,14 × ${r * r} × ${h} = ${fmt(3.14 * r * r * h)} ${u}³.`,
      })
    },
    () => {
      const r = randInt(1, 6), L = 2 * r, H = randInt(3, 12)
      return numeric(`Un vitrail est formé d'un rectangle de ${L} dm de large et ${H} dm de haut, surmonté d'un demi-disque de diamètre ${L} dm. Quelle est son aire totale (en dm²) ? Prends π ≈ 3,14.`, L * H + (3.14 * r * r) / 2, {
        explanation: `Rectangle : ${L} × ${H} = ${L * H} dm². Demi-disque de rayon ${r} : 3,14 × ${r * r} ÷ 2 = ${fmt((3.14 * r * r) / 2)} dm². Total : ${fmt(L * H + (3.14 * r * r) / 2)} dm².`,
      })
    },
    () => {
      const k = pick([2, 3, 4, 5, 8, 9]), B = 180 / (k + 1)
      const [P, Q, R, S] = pick([['A', 'B', 'C', 'D'], ['E', 'F', 'G', 'H'], ['M', 'N', 'O', 'P'], ['R', 'S', 'T', 'U']])
      const askBig = Math.random() < 0.5
      return numeric(`${P}${Q}${R}${S} est un parallélogramme dont l'angle en ${P} est ${k} fois plus grand que l'angle en ${Q}. Combien mesure l'angle en ${askBig ? P : Q} (en °) ?`, askBig ? k * B : B, {
        explanation: `Les angles en ${P} et en ${Q} sont consécutifs donc supplémentaires : ${k}b + b = 180 (b = angle en ${Q}), soit ${k + 1}b = 180, b = ${B}° et l'angle en ${P} mesure ${k * B}°.`,
      })
    },
  ],
]

// ═══ Statistiques & probabilités (les érudits du monastère) ═════════════
const stat: Tiers = [
  [
    () => {
      const n = pick([3, 4]), mean = randInt(8, 15)
      const vals = Array.from({ length: n - 1 }, () => mean + randInt(-4, 4))
      vals.push(mean * n - sum(vals))
      return numeric(`Notes d'un élève : ${vals.join(' ; ')}. Quelle est sa moyenne ?`, mean, { explanation: `Somme : ${mean * n}, divisée par ${n} : ${mean}.` })
    },
    () => {
      const f = cap(frere()), a = randInt(6, 25), b = randInt(6, 25)
      return numeric(`${f} copie ${a} pages lundi et ${b} pages mardi. Combien de pages copie-t-il en moyenne par jour ?`, (a + b) / 2, {
        explanation: `(${a} + ${b}) ÷ 2 = ${a + b} ÷ 2 = ${fmt((a + b) / 2)} pages.`,
      })
    },
    () => {
      const [txt, lo, hi] = pick<[string, number, number]>([
        ['Nombre de flèches tirées par cinq archers', 8, 40], ['Âges des moines du scriptorium', 19, 78],
        ['Buts marqués par les équipes du tournoi', 0, 12], ['Nombre de pommes cueillies par cinq novices', 10, 60],
      ])
      const vals = Array.from({ length: 5 }, () => randInt(lo, hi))
      const e = Math.max(...vals) - Math.min(...vals)
      return numeric(`${txt} : ${vals.join(' ; ')}. Quelle est l'étendue de cette série ?`, e, {
        explanation: `Étendue = plus grande valeur − plus petite valeur = ${Math.max(...vals)} − ${Math.min(...vals)} = ${e}.`,
      })
    },
    () => {
      const kind = randInt(0, 6), k = randInt(2, 5), face = randInt(1, 6)
      const [txt, n] = ([
        [`le ${face}`, 1], ['un nombre pair', 3], ['un nombre impair', 3], ['un multiple de 3', 2],
        [`un nombre inférieur ou égal à ${k}`, k], [`un nombre strictement supérieur à ${k}`, 6 - k], ['un nombre premier', 3],
      ] as [string, number][])[kind]
      return fraction(`On lance un dé équilibré à six faces. Quelle est la probabilité d'obtenir ${txt} ?`, n, 6, {
        explanation: `${n} face${s(n)} favorable${s(n)} sur 6 : ${F(n, 6)}.`,
      })
    },
    () => {
      const p = prenom(), n = pick([10, 20, 25, 50]), k = randInt(1, n - 1)
      return fraction(`${p} lance une pièce ${n} fois et obtient ${k} fois « pile ». Quelle est la fréquence de « pile » ? (donne une fraction)`, k, n, {
        explanation: `Fréquence = effectif ÷ effectif total = ${F(k, n)}.`,
      })
    },
  ],
  [
    () => {
      const r = randInt(2, 9), b = randInt(1, 9), v = randInt(0, 5), total = r + b + v
      return fraction(`Un sac contient ${r} jetons rouges, ${b} bleu${s(b)}${v ? ` et ${v} vert${s(v)}` : ''}. On tire un jeton au hasard. Quelle est la probabilité qu'il soit rouge ?`, r, total, {
        explanation: `${r} cas favorables sur ${total} cas possibles : ${F(r, total)}.`,
      })
    },
    () => {
      const vals = Array.from({ length: 6 }, () => randInt(120, 165))
      const e = (Math.max(...vals) - Math.min(...vals)) / 10
      return numeric(`Temps (en secondes) de six coureurs au 100 m : ${vals.map((v) => fmt(v / 10)).join(' ; ')}. Quelle est l'étendue de cette série (en s) ?`, e, {
        explanation: `${fmt(Math.max(...vals) / 10)} − ${fmt(Math.min(...vals) / 10)} = ${fmt(e)} s.`,
      })
    },
    () => {
      const vals = Array.from({ length: 4 }, () => randInt(6, 22))
      const m = sum(vals) / 4
      return numeric(`${cap(frere())}, apiculteur du monastère, pèse le miel récolté dans ses 4 ruches : ${vals.map((v) => `${v} kg`).join(' ; ')}. Quelle est la masse moyenne par ruche (en kg) ?`, m, {
        explanation: `(${vals.join(' + ')}) ÷ 4 = ${sum(vals)} ÷ 4 = ${fmt(m)} kg.`,
      })
    },
    () => {
      let n = pick([12, 15, 18, 20, 24, 30, 40]), k = randInt(2, n - 1)
      while (gcd(k, n) === 1) { n = pick([12, 15, 18, 20, 24, 30, 40]); k = randInt(2, n - 1) }
      const [who, what] = pick([['moines du monastère', 'sont copistes'], ['élèves de la classe', 'viennent à vélo'], ['chevaux de l’écurie', 'sont blancs'], ['livres de la bibliothèque', 'sont en latin']])
      return fraction(`Sur ${n} ${who}, ${k} ${what}. Quelle est la fréquence correspondante ? (fraction irréductible)`, k, n, {
        irreducible: true, explanation: `${F(k, n)} = ${F(k / gcd(k, n), n / gcd(k, n))} en simplifiant par ${gcd(k, n)}.`,
      })
    },
    () => {
      const p = randInt(1, 19) * 5
      const [e, ne] = pick([['qu’il pleuve demain', 'qu’il ne pleuve pas demain'], ['que l’équipe gagne le match', 'que l’équipe ne gagne pas le match'], ['que la cloche du monastère sonne à l’heure', 'que la cloche ne sonne pas à l’heure'], ['que le bus soit en retard', 'que le bus ne soit pas en retard']])
      return decimalOnly(numeric(`La probabilité ${e} est de ${fmt(p / 100)}. Quelle est la probabilité ${ne} ? (écriture décimale)`, (100 - p) / 100, {
        explanation: `Les deux événements sont contraires : 1 − ${fmt(p / 100)} = ${fmt((100 - p) / 100)}.`,
      }))
    },
  ],
  [
    () => {
      const n = 5, mean = randInt(9, 16)
      const vals = Array.from({ length: n - 1 }, () => mean + randInt(-6, 6))
      vals.push(mean * n - sum(vals))
      return numeric(`Un archer marque ${vals.join(' ; ')} points en 5 tirs. Quelle est sa moyenne ?`, mean, { explanation: `Somme : ${mean * n}, puis ${mean * n} ÷ ${n} = ${mean}.` })
    },
    () => {
      const total = pick([20, 25, 40, 50]), part = randInt(1, total - 1)
      return numeric(`Dans une armée de ${total} soldats, ${part} sont des archers. Quelle est la fréquence des archers (en %) ?`, (part / total) * 100, {
        explanation: `${part} ÷ ${total} = ${fmt(part / total)}, soit ${fmt((part / total) * 100)} %.`,
      })
    },
    () => {
      const [ctx, verb, unit, who] = pick<[string, string, string, string]>([
        ['Au concours de tir à l’arc', 'ont marqué', ' points', 'archers'], ['Au contrôle de maths', 'ont eu', ' sur 20', 'élèves'],
        ['Au scriptorium, en une journée', 'ont copié', ' pages', 'moines'], ['À la cueillette au verger du monastère', 'ont rempli', ' paniers', 'novices'],
      ])
      let vals: number[] = [], cnt: number[] = []
      while (!vals.length || !Number.isInteger((sum(vals.map((v, i) => v * cnt[i])) * 100) / sum(cnt))) {
        const v1 = randInt(5, 10)
        vals = [v1, v1 + randInt(2, 4), v1 + randInt(5, 9)]
        cnt = vals.map(() => randInt(1, 6))
      }
      const N = sum(cnt), S = sum(vals.map((v, i) => v * cnt[i]))
      return numeric(`${ctx} : ${vals.map((v, i) => `${cnt[i]} ${cnt[i] > 1 ? who : who.slice(0, -1)} ${cnt[i] > 1 ? verb : verb.replace('ont', 'a')} ${v}${unit}`).join(', ')}. Quelle est la moyenne de ces ${N} ${who} ?`, S / N, {
        explanation: `(${vals.map((v, i) => `${v} × ${cnt[i]}`).join(' + ')}) ÷ ${N} = ${S} ÷ ${N} = ${fmt(S / N)}.`,
      })
    },
    () => {
      const deck = pick([32, 52])
      const evts: [string, number][] = [
        ['un roi', 4], ['un cœur', deck / 4], ['une figure (valet, dame ou roi)', 12], ['un as rouge', 2], ['une carte noire', deck / 2],
        ['la dame de pique', 1], ['un trèfle', deck / 4], ['un as', 4], ['un valet ou une dame', 8], ['un 7', 4],
      ]
      const [txt, n] = pick(evts)
      return fraction(`On tire une carte au hasard dans un jeu de ${deck} cartes. Quelle est la probabilité d'obtenir ${txt} ?`, n, deck, {
        explanation: `${n} carte${s(n)} favorable${s(n)} sur ${deck} : ${F(n, deck)}.`,
      })
    },
    () => {
      const old = randInt(60, 85), e = randInt(30, old - 18)
      if (Math.random() < 0.5) {
        return numeric(`Au monastère, le moine le plus âgé a ${old} ans et l'étendue des âges est de ${e} ans. Quel âge a le plus jeune ?`, old - e, {
          explanation: `Étendue = plus âgé − plus jeune, donc plus jeune = ${old} − ${e} = ${old - e} ans.`,
        })
      }
      const young = randInt(16, 25), e2 = randInt(35, 60)
      return numeric(`Au monastère, le plus jeune novice a ${young} ans et l'étendue des âges est de ${e2} ans. Quel âge a le moine le plus âgé ?`, young + e2, {
        explanation: `Plus âgé = plus jeune + étendue = ${young} + ${e2} = ${young + e2} ans.`,
      })
    },
    () => {
      const N = pick([20, 25, 40, 50])
      let a = randInt(1, N - 2), b = randInt(1, N - 2)
      while (a + b >= N) { a = randInt(1, N - 2); b = randInt(1, N - 2) }
      const c = N - a - b
      return numeric(`La bibliothèque du monastère possède ${N} manuscrits : ${a} en latin, ${b} en grec et les autres en hébreu. Quelle est la fréquence des manuscrits en hébreu (en %) ?`, (c / N) * 100, {
        explanation: `Manuscrits en hébreu : ${N} − ${a} − ${b} = ${c}. Fréquence : ${c} ÷ ${N} = ${fmt(c / N)}, soit ${fmt((c / N) * 100)} %.`,
      })
    },
  ],
  [
    () => {
      const r = randInt(2, 9), b = randInt(2, 9), v = randInt(1, 6), total = r + b + v
      return fraction(`Un coffre contient ${r} rubis, ${b} saphirs et ${v} émeraude${s(v)}. On en prend une pierre au hasard. Quelle est la probabilité que ce ne soit PAS un rubis ?`, b + v, total, {
        explanation: `${b} + ${v} = ${b + v} pierres ne sont pas des rubis, sur ${total} : ${F(b + v, total)}.`,
      })
    },
    () => {
      const v1 = randInt(8, 14), n1 = randInt(1, 5), v2 = randInt(15, 20), n2 = randInt(1, 5)
      const mean = (v1 * n1 + v2 * n2) / (n1 + n2), r = Math.round(mean * 10) / 10
      return numeric(`${n1} soldat${s(n1)} ${n1 > 1 ? 'ont' : 'a'} ${v1} ans d'expérience et ${n2} soldat${s(n2)} en ${n2 > 1 ? 'ont' : 'a'} ${v2}. Quelle est l'expérience moyenne (arrondie au dixième) ?`, r, {
        explanation: `(${v1} × ${n1} + ${v2} × ${n2}) ÷ ${n1 + n2} = ${v1 * n1 + v2 * n2} ÷ ${n1 + n2} ≈ ${fmt(r)} ans.`,
      })
    },
    () => {
      let n = 0, m = 0, x = 0
      while (!n || !Number.isInteger(((n * m + x) * 100) / (n + 1))) { n = randInt(3, 5); m = randInt(9, 14); x = randInt(5, 20) }
      const p = prenom()
      return numeric(`Après ${n} contrôles, ${p} a une moyenne de ${m}. ${p} obtient ${x} au contrôle suivant. Quelle est sa nouvelle moyenne ?`, (n * m + x) / (n + 1), {
        explanation: `Total des ${n} premières notes : ${n} × ${m} = ${n * m}. Nouveau total : ${n * m + x}, divisé par ${n + 1} : ${fmt((n * m + x) / (n + 1))}.`,
      })
    },
    () => {
      const N = pick([4, 5, 10, 20, 25, 50]), k = randInt(1, N - 1)
      const ctx = pick([
        `Le frère cellérier range ${N} bouteilles dans la cave, dont ${k} de cidre. Il en prend une au hasard. Quelle est la probabilité que ce soit une bouteille de cidre ?`,
        `Une urne contient ${N} boules, dont ${k} verte${s(k)}. On tire une boule au hasard. Quelle est la probabilité qu'elle soit verte ?`,
        `Une roue de loterie est partagée en ${N} secteurs égaux, dont ${k} gagnant${s(k)}. On fait tourner la roue. Quelle est la probabilité de tomber sur un secteur gagnant ?`,
      ])
      return decimalOnly(numeric(`${ctx} (écriture décimale)`, k / N, {
        explanation: `${k} cas favorables sur ${N} : ${k} ÷ ${N} = ${fmt(k / N)}.`,
      }))
    },
    () => {
      let N = 0, p = 0
      while (!N || (N * p) % 100) { N = pick([40, 60, 80, 120, 150, 200]); p = pick([5, 10, 15, 20, 25, 30, 35, 45]) }
      const role = pick(['copistes', 'jardiniers', 'chantres', 'enlumineurs'])
      return numeric(`Le monastère compte ${N} moines. La fréquence des ${role} est de ${p} %. Combien y a-t-il de ${role} ?`, (N * p) / 100, {
        explanation: `${p} % de ${N} = ${N} × ${p} ÷ 100 = ${(N * p) / 100}.`,
      })
    },
  ],
  [
    () => {
      let target = 0, a = 0, b = 0, c = 0, need = -1
      while (need < 0 || need > 20) { target = randInt(10, 14); a = randInt(6, 18); b = randInt(6, 18); c = randInt(6, 18); need = 4 * target - a - b - c }
      return numeric(`Un élève a eu ${a}, ${b} et ${c}. Quelle note doit-il obtenir au 4ᵉ devoir pour avoir exactement ${target} de moyenne ?`, need, {
        explanation: `Il faut un total de 4 × ${target} = ${4 * target}, il a déjà ${a + b + c}, donc ${4 * target} − ${a + b + c} = ${need}.`,
      })
    },
    () => {
      const r = randInt(2, 6), b = r + randInt(2, 8)
      return numeric(`Un sac contient ${r} boules rouges et ${b} boules bleues. Combien de boules rouges faut-il ajouter pour que la probabilité de tirer une rouge soit de ${F(1, 2)} ?`, b - r, {
        explanation: `Il faut autant de rouges que de bleues : ${b} − ${r} = ${b - r}.`,
      })
    },
    () => {
      let n1 = 0, n2 = 0, m1 = 0, m2 = 0
      while (!n1 || ((n1 * m1 + n2 * m2) * 10) % (n1 + n2)) { n1 = randInt(5, 15); n2 = randInt(3, 12); m1 = randInt(35, 60); m2 = randInt(16, 25) }
      const N = n1 + n2, S = n1 * m1 + n2 * m2
      return numeric(`Au monastère, les ${n1} moines ont en moyenne ${m1} ans et les ${n2} novices ont en moyenne ${m2} ans. Quel est l'âge moyen de toute la communauté (en années) ?`, S / N, {
        explanation: `Somme des âges : ${n1} × ${m1} + ${n2} × ${m2} = ${n1 * m1} + ${n2 * m2} = ${S}. Moyenne : ${S} ÷ ${N} = ${fmt(S / N)} ans.`,
      })
    },
    () => {
      const d = pick([3, 4, 5, 6, 8]), n = pick([1, 2, 3, 5, 7].filter((v) => v < d && gcd(v, d) === 1)), N = d * randInt(3, 10)
      return numeric(`Le frère bibliothécaire range ${N} manuscrits dans un coffre. Si on en prend un au hasard, la probabilité qu'il soit enluminé est ${F(n, d)}. Combien de manuscrits enluminés y a-t-il ?`, (N * n) / d, {
        explanation: `${F(n, d)} des ${N} manuscrits : ${N} ÷ ${d} × ${n} = ${(N * n) / d}.`,
      })
    },
    () => {
      let n = 0, m = 0, wrong = 0, right = 0
      while (!n || wrong === right || !Number.isInteger(((n * m - wrong + right) * 100) / n)) { n = pick([4, 5, 8, 10, 20]); m = randInt(10, 18); wrong = randInt(5, 20); right = randInt(5, 20) }
      return numeric(`${cap(frere())} a calculé une moyenne de ${m} sur ${n} relevés de pluie (en mm). Il s'aperçoit qu'il a recopié ${wrong} au lieu de ${right}. Quelle est la vraie moyenne ?`, (n * m - wrong + right) / n, {
        explanation: `Total faux : ${n} × ${m} = ${n * m}. Total corrigé : ${n * m} − ${wrong} + ${right} = ${n * m - wrong + right}. Moyenne : ${n * m - wrong + right} ÷ ${n} = ${fmt((n * m - wrong + right) / n)}.`,
      })
    },
    () => {
      const r = randInt(5, 12), b = randInt(3, 10), k = randInt(1, r - 2)
      return fraction(`Dans le panier du frère cellérier, il y a ${r} pommes rouges et ${b} pommes vertes. Il mange ${k} pomme${s(k)} rouge${s(k)}. On prend ensuite une pomme au hasard dans le panier : quelle est la probabilité qu'elle soit rouge ?`, r - k, r - k + b, {
        explanation: `Il reste ${r - k} rouges et ${b} vertes, soit ${r - k + b} pommes : probabilité ${F(r - k, r - k + b)}.`,
      })
    },
  ],
]

export const CINQUIEME: Record<string, Tiers> = {
  '5e-prio': prio,
  '5e-rel': rel,
  '5e-frac': fracs,
  '5e-lit': lit,
  '5e-prop': prop,
  '5e-geo': geo,
  '5e-stat': stat,
}
