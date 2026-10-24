import {
  F, choice, expression, fmt, fraction, gcd, numeric, par, pick, poly, randInt, randNonZero, shuffle, signed, withMeta, xPlus,
  type Exercise, type Maker, type Tiers,
} from './utils'
import { cap, lieu, marchandise, prenom } from './contexts'
import { fitPoints, parallelsFigure, triangleFigure, triangleFromAngles, type Figure } from './figure'

// Chaque chapitre : 5 paliers de difficulté (palier n ↔ cran n − 1 de la jauge), au moins 4 modèles par palier.
// Un cran fait travailler UN SEUL modèle pendant 10 exercices (entraînement par répétition) : chaque modèle
// garde la même mécanique mais tire au hasard parmi plusieurs variantes (contexte, configuration, forme de
// l'expression, nombre de données), pour que l'énoncé ne se répète pas. Réponses ouvertes (QCM exceptionnel).

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

/**
 * Modèle d'entraînement à plusieurs variantes (contexte, configuration, forme de l'expression…).
 * Les variantes sont tirées dans un « sac » mélangé, sans remise : une série de 5 exercices les parcourt
 * sans jamais servir deux fois de suite la même. Pour peser plus lourd, une variante peut figurer deux fois.
 */
function variants(...makers: Maker[]): Maker {
  let bag: number[] = []
  let last = -1
  return () => {
    if (!bag.length) {
      bag = shuffle(makers.map((_, i) => i))
      const n = bag.length
      if (n > 1 && makers[bag[n - 1]] === makers[last]) [bag[0], bag[n - 1]] = [bag[n - 1], bag[0]]
    }
    last = bag.pop()!
    return makers[last]()
  }
}

/** La réponse (nombre) est-elle déjà écrite telle quelle dans l'énoncé ? */
const echoes = (ex: Exercise) => (ex.prompt.match(/−?\d+(?:,\d+)?/g) ?? ([] as string[])).includes(ex.answer.trim())
/** Retire les tirages où la réponse se lit dans l'énoncé (on ne la « donne » pas à l'élève). */
function fresh(make: Maker): Maker {
  return () => {
    let ex = make()
    for (let i = 0; i < 40 && echoes(ex); i++) ex = make()
    return ex
  }
}

// ═══ Enchaînements d'opérations ═════════════════════════════════════════
const prio: Tiers = [
  [
    // La multiplication avant l'addition ou la soustraction
    variants(
      () => {
        const a = randInt(5, 30), b = randInt(2, 9), c = randInt(2, 9)
        return numeric(`Calcule : ${a} + ${b} × ${c}`, a + b * c, {
          explanation: `La multiplication est prioritaire : ${b} × ${c} = ${b * c}, puis ${a} + ${b * c} = ${a + b * c}.`,
        })
      },
      () => {
        const a = randInt(5, 30), b = randInt(2, 9), c = randInt(2, 9)
        return numeric(`Calcule : ${b} × ${c} + ${a}`, a + b * c, {
          explanation: `D'abord ${b} × ${c} = ${b * c}, puis ${b * c} + ${a} = ${a + b * c}.`,
        })
      },
      () => {
        const b = randInt(2, 9), c = randInt(2, 9), a = b * c + randInt(1, 30)
        return numeric(`Calcule : ${a} − ${b} × ${c}`, a - b * c, {
          explanation: `La multiplication est prioritaire : ${b} × ${c} = ${b * c}, puis ${a} − ${b * c} = ${a - b * c}.`,
        })
      },
      () => {
        const b = randInt(3, 12), c = randInt(2, 9), a = randInt(1, b * c - 1)
        return numeric(`Calcule : ${b} × ${c} − ${a}`, b * c - a, {
          explanation: `D'abord ${b} × ${c} = ${b * c}, puis ${b * c} − ${a} = ${b * c - a}.`,
        })
      },
    ),
    // La division avant l'addition ou la soustraction
    variants(
      () => {
        const c = randInt(2, 9), q = randInt(2, 9), a = randInt(3, 25)
        return numeric(`Calcule : ${a} + ${c * q} ÷ ${c}`, a + q, {
          explanation: `La division est prioritaire : ${c * q} ÷ ${c} = ${q}, puis ${a} + ${q} = ${a + q}.`,
        })
      },
      () => {
        const c = randInt(2, 9), q = randInt(2, 9), a = randInt(3, 25)
        return numeric(`Calcule : ${c * q} ÷ ${c} + ${a}`, a + q, {
          explanation: `D'abord ${c * q} ÷ ${c} = ${q}, puis ${q} + ${a} = ${a + q}.`,
        })
      },
      () => {
        const c = randInt(2, 9), q = randInt(2, 9), a = q + randInt(1, 25)
        return numeric(`Calcule : ${a} − ${c * q} ÷ ${c}`, a - q, {
          explanation: `La division est prioritaire : ${c * q} ÷ ${c} = ${q}, puis ${a} − ${q} = ${a - q}.`,
        })
      },
      () => {
        const c = randInt(2, 6), q = randInt(6, 15), a = randInt(1, q - 1)
        return numeric(`Calcule : ${c * q} ÷ ${c} − ${a}`, q - a, {
          explanation: `D'abord ${c * q} ÷ ${c} = ${q}, puis ${q} − ${a} = ${q - a}.`,
        })
      },
    ),
    // Les parenthèses d'abord
    variants(
      () => {
        const a = randInt(2, 9), b = randInt(2, 9), c = randInt(2, 6)
        return numeric(`Calcule : (${a} + ${b}) × ${c}`, (a + b) * c, {
          explanation: `On commence par la parenthèse : ${a} + ${b} = ${a + b}, puis ${a + b} × ${c} = ${(a + b) * c}.`,
        })
      },
      () => {
        const a = randInt(2, 9), b = randInt(2, 9), c = randInt(2, 6)
        return numeric(`Calcule : ${c} × (${a} + ${b})`, (a + b) * c, {
          explanation: `Parenthèse d'abord : ${a} + ${b} = ${a + b}, puis ${c} × ${a + b} = ${(a + b) * c}.`,
        })
      },
      () => {
        const b = randInt(2, 12), a = b + randInt(2, 9), c = randInt(2, 6)
        return numeric(`Calcule : (${a} − ${b}) × ${c}`, (a - b) * c, {
          explanation: `Parenthèse d'abord : ${a} − ${b} = ${a - b}, puis ${a - b} × ${c} = ${(a - b) * c}.`,
        })
      },
      () => {
        const c = randInt(2, 6), q = randInt(2, 9), a = randInt(1, c * q - 1), b = c * q - a
        return numeric(`Calcule : (${a} + ${b}) ÷ ${c}`, q, {
          explanation: `Parenthèse d'abord : ${a} + ${b} = ${c * q}, puis ${c * q} ÷ ${c} = ${q}.`,
        })
      },
      () => {
        const b = randInt(2, 12), c = randInt(2, 12), a = b + c + randInt(1, 25)
        return numeric(`Calcule : ${a} − (${b} + ${c})`, a - b - c, {
          explanation: `Parenthèse d'abord : ${b} + ${c} = ${b + c}, puis ${a} − ${b + c} = ${a - b - c}.`,
        })
      },
    ),
    // Calcul mental : regrouper astucieusement
    variants(
      () => {
        const [u, v] = pick([[4, 25], [2, 5], [5, 20], [2, 50], [25, 4], [5, 2], [50, 2], [20, 5]])
        const n = randInt(3, 19)
        return numeric(`Calcule mentalement : ${u} × ${n} × ${v}`, u * n * v, {
          explanation: `On regroupe astucieusement : ${u} × ${v} = ${u * v}, puis ${n} × ${u * v} = ${u * n * v}.`,
        })
      },
      () => {
        const [u, v] = pick([[2, 5], [4, 25], [5, 20], [2, 50]])
        const n = randInt(3, 9), m = randInt(2, 9)
        return numeric(`Calcule mentalement : ${u} × ${n} × ${v} × ${m}`, u * n * v * m, {
          explanation: `${u} × ${v} = ${u * v} et ${n} × ${m} = ${n * m}, donc ${n * m} × ${u * v} = ${u * n * v * m}.`,
        })
      },
      () => {
        const T = pick([50, 100]), a = randInt(11, T - 11), b = randInt(5, 60)
        const terms = pick([[a, b, T - a], [a, T - a, b], [b, a, T - a]])
        return numeric(`Calcule astucieusement : ${terms.join(' + ')}`, T + b, {
          explanation: `On regroupe ${a} + ${T - a} = ${T}, puis ${T} + ${b} = ${T + b}.`,
        })
      },
      () => {
        const a = randInt(1, 9), b = randInt(1, 9), x = randInt(1, 6) * 10 + a, y = randInt(1, 6) * 10 + b
        const x2 = randInt(1, 6) * 10 + (10 - a), y2 = randInt(1, 6) * 10 + (10 - b)
        return numeric(`Calcule astucieusement : ${x} + ${y} + ${x2} + ${y2}`, x + y + x2 + y2, {
          explanation: `On regroupe les nombres dont les unités se complètent : ${x} + ${x2} = ${x + x2} et ${y} + ${y2} = ${y + y2}, total ${x + y + x2 + y2}.`,
        })
      },
    ),
    // Petit problème : écrire et effectuer un calcul à deux opérations
    variants(
      () => {
        const p = prenom(), g = randInt(3, 6), per = randInt(4, 9), extra = randInt(2, 9)
        const obj = pick(['billes', 'cartes', 'autocollants', 'perles', 'jetons', 'images'])
        return numeric(`${p} a ${g} paquets de ${per} ${obj} et ${extra} ${obj} en vrac. Combien ${de(obj)} cela fait-il en tout ?`, g * per + extra, {
          explanation: `${g} × ${per} + ${extra} = ${g * per} + ${extra} = ${g * per + extra}.`,
        })
      },
      () => {
        const r = randInt(3, 8), c = randInt(4, 10), b = randInt(2, 9)
        return numeric(`Une compagnie compte ${r} rangs de ${c} soldats. ${b} soldats, malades, restent au camp. Combien de soldats partent en mission ?`, r * c - b, {
          explanation: `${r} × ${c} − ${b} = ${r * c} − ${b} = ${r * c - b}.`,
        })
      },
      () => {
        const p = prenom(), m = marchandise(), n = randInt(2, 6), q = randInt(3, 15)
        return numeric(`${p} achète ${n} ${m.nom} à ${m.prix} écus pièce et une besace à ${q} écus. Quelle est la dépense totale (en écus) ?`, n * m.prix + q, {
          explanation: `${n} × ${m.prix} + ${q} = ${n * m.prix} + ${q} = ${n * m.prix + q} écus.`,
        })
      },
      () => {
        const p = prenom(), n = randInt(2, 6), pr = randInt(2, 8), B = pick([20, 50, 100].filter((v) => v > n * pr))
        const obj = pick(['pains', 'torches', 'pots de miel', 'cordes'])
        return numeric(`${p} achète ${n} ${obj} à ${pr} écus pièce et paie avec une pièce de ${B} écus. Combien lui rend-on (en écus) ?`, B - n * pr, {
          explanation: `Il dépense ${n} × ${pr} = ${n * pr} écus, on lui rend ${B} − ${n * pr} = ${B - n * pr} écus.`,
        })
      },
      () => {
        const k = randInt(2, 6), q = randInt(5, 20), a = randInt(1, k * q - 1), b = k * q - a
        return numeric(`Deux coffres contiennent ${a} et ${b} pièces d'or. On partage le tout équitablement entre ${k} chevaliers. Combien de pièces reçoit chacun ?`, q, {
          explanation: `(${a} + ${b}) ÷ ${k} = ${k * q} ÷ ${k} = ${q} pièces.`,
        })
      },
    ),
  ],
  [
    // Trois opérations sans parenthèses : × et ÷ d'abord
    variants(
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
        const a = randInt(3, 20), b = randInt(2, 9), c = randInt(2, 9), d = randInt(1, a + b * c - 1)
        return numeric(`Calcule : ${a} + ${b} × ${c} − ${d}`, a + b * c - d, {
          explanation: `${b} × ${c} = ${b * c}, puis ${a} + ${b * c} − ${d} = ${a + b * c - d}.`,
        })
      },
      () => {
        const c = randInt(2, 6), d = randInt(2, 6), a = randInt(4, 9), b = randInt(Math.ceil((c * d + 1) / a), 9)
        return numeric(`Calcule : ${a} × ${b} − ${c} × ${d}`, a * b - c * d, {
          explanation: `Les deux produits d'abord : ${a * b} et ${c * d}, puis ${a * b} − ${c * d} = ${a * b - c * d}.`,
        })
      },
      () => {
        const c = randInt(2, 6), q = randInt(2, 9), a = randInt(2, 9), b = randInt(2, 9)
        return numeric(`Calcule : ${a} × ${b} + ${c * q} ÷ ${c}`, a * b + q, {
          explanation: `${a} × ${b} = ${a * b} et ${c * q} ÷ ${c} = ${q}, puis ${a * b} + ${q} = ${a * b + q}.`,
        })
      },
    ),
    // Même priorité : on calcule de gauche à droite
    variants(
      () => {
        const c = randInt(2, 6), q = randInt(2, 9), d = randInt(2, 5)
        return numeric(`Calcule : ${c * q} ÷ ${c} × ${d}`, q * d, {
          explanation: `÷ et × ont la même priorité : de gauche à droite. ${c * q} ÷ ${c} = ${q}, puis ${q} × ${d} = ${q * d}.`,
        })
      },
      () => {
        const b = randInt(5, 15), a = b + randInt(3, 25), c = randInt(2, 9)
        return numeric(`Calcule : ${a} − ${b} + ${c}`, a - b + c, {
          explanation: `+ et − ont la même priorité : de gauche à droite. ${a} − ${b} = ${a - b}, puis ${a - b} + ${c} = ${a - b + c}.`,
        })
      },
      () => {
        const b = randInt(2, 5), c = randInt(2, 5), q = randInt(2, 9)
        return numeric(`Calcule : ${b * c * q} ÷ ${b} ÷ ${c}`, q, {
          explanation: `De gauche à droite : ${b * c * q} ÷ ${b} = ${c * q}, puis ${c * q} ÷ ${c} = ${q}.`,
        })
      },
      () => {
        const c = randInt(2, 6), k = randInt(2, 6), a = c * k, b = randInt(2, 9)
        return numeric(`Calcule : ${a} × ${b} ÷ ${c}`, k * b, {
          explanation: `De gauche à droite : ${a} × ${b} = ${a * b}, puis ${a * b} ÷ ${c} = ${k * b}.`,
        })
      },
      () => {
        const b = randInt(3, 12), c = randInt(2, 9), a = b + c + randInt(2, 20)
        return numeric(`Calcule : ${a} − ${b} − ${c}`, a - b - c, {
          explanation: `De gauche à droite : ${a} − ${b} = ${a - b}, puis ${a - b} − ${c} = ${a - b - c}.`,
        })
      },
    ),
    // Une parenthèse et deux opérations
    variants(
      () => {
        const a = randInt(2, 12), b = randInt(2, 12), c = randInt(2, 6), e = randInt(1, 15)
        return numeric(`Calcule : (${a} + ${b}) × ${c} − ${e}`, (a + b) * c - e, {
          explanation: `Parenthèse : ${a + b} ; puis × ${c} = ${(a + b) * c} ; enfin − ${e} = ${(a + b) * c - e}.`,
        })
      },
      () => {
        const c = randInt(1, 9), b = c + randInt(2, 12), a = randInt(b - c + 1, 40)
        return numeric(`Calcule : ${a} − (${b} − ${c})`, a - (b - c), {
          explanation: `Parenthèse d'abord : ${b} − ${c} = ${b - c}, puis ${a} − ${b - c} = ${a - b + c}.`,
        })
      },
      () => {
        const b = randInt(2, 9), a = b + randInt(1, 8), c = randInt(2, 6), e = randInt(2, 20)
        return numeric(`Calcule : ${e} + (${a} − ${b}) × ${c}`, e + (a - b) * c, {
          explanation: `Parenthèse : ${a - b} ; puis × ${c} = ${(a - b) * c} (prioritaire) ; enfin ${e} + ${(a - b) * c} = ${e + (a - b) * c}.`,
        })
      },
      () => {
        const c = randInt(2, 9), q = randInt(2, 9), a = randInt(1, c * q - 1), b = c * q - a, d = randInt(2, 15)
        return numeric(`Calcule : (${a} + ${b}) ÷ ${c} + ${d}`, q + d, {
          explanation: `Parenthèse : ${c * q}, puis ${c * q} ÷ ${c} = ${q}, enfin ${q} + ${d} = ${q + d}.`,
        })
      },
      () => {
        const a = randInt(2, 6), b = randInt(2, 9), c = randInt(2, 9), d = randInt(1, a * (b + c) - 1)
        return numeric(`Calcule : ${a} × (${b} + ${c}) − ${d}`, a * (b + c) - d, {
          explanation: `Parenthèse : ${b + c} ; puis ${a} × ${b + c} = ${a * (b + c)} ; enfin − ${d} = ${a * (b + c) - d}.`,
        })
      },
    ),
    // Le nombre manquant (on remonte les priorités)
    variants(
      fresh(() => {
        const a = randInt(2, 20), b = randInt(2, 9), x = randInt(2, 9)
        return numeric(`Quel nombre manque ? ${a} + ${b} × ? = ${a + b * x}`, x, {
          explanation: `${b} × ? doit valoir ${a + b * x} − ${a} = ${b * x}, donc ? = ${b * x} ÷ ${b} = ${x}.`,
        })
      }),
      fresh(() => {
        const b = randInt(2, 9), x = randInt(3, 12), a = randInt(1, b * x - 1)
        return numeric(`Quel nombre manque ? ? × ${b} − ${a} = ${b * x - a}`, x, {
          explanation: `? × ${b} doit valoir ${b * x - a} + ${a} = ${b * x}, donc ? = ${b * x} ÷ ${b} = ${x}.`,
        })
      }),
      fresh(() => {
        const a = randInt(2, 12), x = randInt(2, 12), c = randInt(2, 6)
        return numeric(`Quel nombre manque ? (${a} + ?) × ${c} = ${(a + x) * c}`, x, {
          explanation: `La parenthèse vaut ${(a + x) * c} ÷ ${c} = ${a + x}, donc ? = ${a + x} − ${a} = ${x}.`,
        })
      }),
      fresh(() => {
        const b = randInt(2, 9), x = randInt(2, 9), a = b * x + randInt(1, 20)
        return numeric(`Quel nombre manque ? ${a} − ${b} × ? = ${a - b * x}`, x, {
          explanation: `${b} × ? doit valoir ${a} − ${a - b * x} = ${b * x}, donc ? = ${b * x} ÷ ${b} = ${x}.`,
        })
      }),
      fresh(() => {
        const c = randInt(2, 6), q = randInt(2, 9), a = randInt(2, 15)
        return numeric(`Quel nombre manque ? ? ÷ ${c} + ${a} = ${q + a}`, c * q, {
          explanation: `? ÷ ${c} doit valoir ${q + a} − ${a} = ${q}, donc ? = ${q} × ${c} = ${c * q}.`,
        })
      }),
    ),
    // Petit problème à trois opérations
    variants(
      () => {
        const p = prenom(), a = randInt(2, 5), pa = randInt(3, 9), b = randInt(2, 5), pb = randInt(2, 8)
        const [o1, o2] = pick([['pains', 'pots de miel'], ['torches', 'cordes'], ['flèches', 'lanternes'], ['fromages', 'tartes']])
        return numeric(`${p} achète ${a} ${o1} à ${pa} écus et ${b} ${o2} à ${pb} écus. Quel est le prix total (en écus) ?`, a * pa + b * pb, {
          explanation: `${a} × ${pa} + ${b} × ${pb} = ${a * pa} + ${b * pb} = ${a * pa + b * pb} écus.`,
        })
      },
      () => {
        const r = randInt(3, 7), c = randInt(4, 9), b = randInt(2, 9), n = randInt(2, 12)
        return numeric(`Un camp compte ${r} tentes de ${c} soldats. ${b} soldats partent en éclaireurs, puis ${n} renforts arrivent. Combien de soldats y a-t-il maintenant au camp ?`, r * c - b + n, {
          explanation: `${r} × ${c} − ${b} + ${n} = ${r * c} − ${b} + ${n} = ${r * c - b + n}.`,
        })
      },
      () => {
        const p = prenom(), sem = randInt(3, 8), hebdo = randInt(2, 6), cad = randInt(5, 20), dep = randInt(5, sem * hebdo + cad - 1)
        return numeric(`${p} reçoit ${hebdo} € d'argent de poche par semaine pendant ${sem} semaines, plus ${cad} € pour son anniversaire, puis s'offre un livre à ${dep} €. Combien d'argent lui reste-t-il (en €) ?`, sem * hebdo + cad - dep, {
          explanation: `${sem} × ${hebdo} + ${cad} − ${dep} = ${sem * hebdo} + ${cad} − ${dep} = ${sem * hebdo + cad - dep} €.`,
        })
      },
      () => {
        const k = randInt(2, 6), q = randInt(4, 12), a = randInt(1, k * q - 1), b = k * q - a, d = randInt(2, 10)
        return numeric(`Deux paysans récoltent ${a} et ${b} choux. Ils les répartissent en ${k} cageots égaux, puis ajoutent ${d} choux dans le premier cageot. Combien de choux contient ce premier cageot ?`, q + d, {
          explanation: `(${a} + ${b}) ÷ ${k} + ${d} = ${k * q} ÷ ${k} + ${d} = ${q} + ${d} = ${q + d}.`,
        })
      },
    ),
  ],
  [
    // Expressions à quatre opérations
    variants(
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
        const c = randInt(2, 9), q = randInt(2, 9), a = randInt(1, c * q - 1), b = c * q - a, d = randInt(2, 6), e = randInt(2, 9)
        return numeric(`Calcule : (${a} + ${b}) ÷ ${c} + ${d} × ${e}`, q + d * e, {
          explanation: `(${a} + ${b}) ÷ ${c} = ${c * q} ÷ ${c} = ${q} et ${d} × ${e} = ${d * e}, total ${q + d * e}.`,
        })
      },
      () => {
        const e = randInt(2, 6), q = randInt(2, 8), c = randInt(1, e * q - 1), d = e * q - c, a = randInt(3, 9), b = randInt(Math.ceil((q + 1) / a), 9)
        return numeric(`Calcule : ${a} × ${b} − (${c} + ${d}) ÷ ${e}`, a * b - q, {
          explanation: `${a} × ${b} = ${a * b} et (${c} + ${d}) ÷ ${e} = ${e * q} ÷ ${e} = ${q}, donc ${a * b} − ${q} = ${a * b - q}.`,
        })
      },
    ),
    // Calcul astucieux : la distributivité
    variants(
      () => {
        const n = randInt(12, 89)
        const [p, q] = pick([[8, 2], [7, 3], [6, 4], [9, 1], [99, 1], [55, 45], [3, 7], [65, 35]])
        return numeric(`Calcule astucieusement : ${n} × ${p} + ${n} × ${q}`, n * (p + q), {
          explanation: `On met ${n} en facteur : ${n} × (${p} + ${q}) = ${n} × ${p + q} = ${n * (p + q)}.`,
        })
      },
      () => {
        const n = randInt(12, 89)
        const [p, q] = pick([[12, 2], [13, 3], [11, 1], [105, 5], [110, 10], [17, 7]])
        return numeric(`Calcule astucieusement : ${n} × ${p} − ${n} × ${q}`, n * (p - q), {
          explanation: `On met ${n} en facteur : ${n} × (${p} − ${q}) = ${n} × ${p - q} = ${n * (p - q)}.`,
        })
      },
      () => {
        const n = randInt(12, 89)
        const [p, q] = pick([[8, 2], [7, 3], [6, 4], [3, 7], [45, 55]])
        return numeric(`Calcule astucieusement : ${p} × ${n} + ${q} × ${n}`, n * (p + q), {
          explanation: `${n} est un facteur commun : (${p} + ${q}) × ${n} = ${p + q} × ${n} = ${n * (p + q)}.`,
        })
      },
      () => {
        const n = randInt(12, 89), up = Math.random() < 0.5
        return numeric(`Calcule astucieusement : ${n} × ${up ? 101 : 99}`, n * (up ? 101 : 99), {
          explanation: `${n} × ${up ? 101 : 99} = ${n} × (100 ${up ? '+' : '−'} 1) = ${n * 100} ${up ? '+' : '−'} ${n} = ${n * (up ? 101 : 99)}.`,
        })
      },
    ),
    // Les parenthèses changent le résultat : comparer deux expressions
    variants(
      () => {
        const a = randInt(2, 12), b = randInt(2, 9), c = randInt(2, 9)
        const A = a + b * c, B = (a + b) * c
        return numeric(`On pose A = ${a} + ${b} × ${c} et B = (${a} + ${b}) × ${c}. Calcule B − A.`, B - A, {
          explanation: `A = ${a} + ${b * c} = ${A} ; B = ${a + b} × ${c} = ${B} ; B − A = ${B - A}. Les parenthèses changent tout !`,
        })
      },
      () => {
        const a = randInt(3, 9), c = randInt(2, 6), b = c + randInt(2, 8)
        const A = a * b - c, B = a * (b - c)
        return numeric(`On pose A = ${a} × ${b} − ${c} et B = ${a} × (${b} − ${c}). Calcule A − B.`, A - B, {
          explanation: `A = ${a * b} − ${c} = ${A} ; B = ${a} × ${b - c} = ${B} ; A − B = ${A - B}.`,
        })
      },
      () => {
        const b = randInt(3, 12), c = randInt(2, 9), a = b + c + randInt(3, 20)
        const A = a - b + c, B = a - (b + c)
        return numeric(`On pose A = ${a} − ${b} + ${c} et B = ${a} − (${b} + ${c}). Calcule A − B.`, A - B, {
          explanation: `A = ${a - b} + ${c} = ${A} (de gauche à droite) ; B = ${a} − ${b + c} = ${B} ; A − B = ${A - B}.`,
        })
      },
      () => {
        const a = randInt(2, 9), b = randInt(2, 9), c = randInt(2, 9)
        const A = a * b + c, B = a * (b + c)
        return numeric(`On pose A = ${a} × ${b} + ${c} et B = ${a} × (${b} + ${c}). Calcule B − A.`, B - A, {
          explanation: `A = ${a * b} + ${c} = ${A} ; B = ${a} × ${b + c} = ${B} ; B − A = ${B - A}.`,
        })
      },
    ),
    // Traduire une phrase par un calcul
    variants(
      () => {
        const a = randInt(2, 15), b = randInt(2, 15), c = randInt(2, 6)
        return numeric(`Calcule le produit de la somme de ${a} et ${b} par ${c}.`, (a + b) * c, {
          explanation: `« Le produit de la somme… » : (${a} + ${b}) × ${c} = ${a + b} × ${c} = ${(a + b) * c}.`,
        })
      },
      () => {
        const a = randInt(2, 9), b = randInt(2, 9), d = randInt(2, 6), q = randInt(2, 9)
        return numeric(`Calcule la somme du produit de ${a} par ${b} et du quotient de ${d * q} par ${d}.`, a * b + q, {
          explanation: `${a} × ${b} + ${d * q} ÷ ${d} = ${a * b} + ${q} = ${a * b + q}.`,
        })
      },
      () => {
        const b = randInt(2, 9), c = randInt(2, 9), a = b * c + randInt(3, 30)
        return numeric(`Calcule la différence entre ${a} et le produit de ${b} par ${c}.`, a - b * c, {
          explanation: `${a} − ${b} × ${c} = ${a} − ${b * c} = ${a - b * c}.`,
        })
      },
      () => {
        const c = randInt(2, 9), q = randInt(2, 9), a = randInt(1, c * q - 1), b = c * q - a
        return numeric(`Calcule le quotient de la somme de ${a} et ${b} par ${c}.`, q, {
          explanation: `(${a} + ${b}) ÷ ${c} = ${c * q} ÷ ${c} = ${q}.`,
        })
      },
      () => {
        const b = randInt(2, 15), a = b + randInt(2, 12), c = randInt(2, 7)
        return numeric(`Calcule le produit de ${c} par la différence entre ${a} et ${b}.`, c * (a - b), {
          explanation: `${c} × (${a} − ${b}) = ${c} × ${a - b} = ${c * (a - b)}.`,
        })
      },
    ),
  ],
  [
    // Crochets et parenthèses emboîtées
    variants(
      () => {
        const d = randInt(1, 6), e = randInt(d + 1, d + 5), c = randInt(2, 6), b = randInt(1, 9), a = randInt(2, 6)
        const v = a * (b + c * (e - d))
        return numeric(`Calcule : ${a} × [${b} + ${c} × (${e} − ${d})]`, v, {
          explanation: `On part des parenthèses les plus intérieures : ${e} − ${d} = ${e - d}, puis ${b} + ${c} × ${e - d} = ${b + c * (e - d)}, enfin × ${a} = ${v}.`,
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
        let a = 0, b = 0, c = 0, d = 0, e = 0, q = 0
        while (a <= 0) {
          e = randInt(2, 6); q = randInt(3, 12); b = randInt(2, 6); d = randInt(1, 6); c = d + randInt(1, 4)
          a = e * q - b * (c - d)
        }
        return numeric(`Calcule : [${a} + ${b} × (${c} − ${d})] ÷ ${e}`, q, {
          explanation: `${c} − ${d} = ${c - d}, puis ${b} × ${c - d} = ${b * (c - d)}, ${a} + ${b * (c - d)} = ${e * q}, enfin ${e * q} ÷ ${e} = ${q}.`,
        })
      },
      () => {
        const d = randInt(1, 5), e = randInt(1, 5), c = d + e + randInt(1, 6), a = randInt(2, 9), b = randInt(2, 9)
        const v = (a + b) * (c - (d + e))
        return numeric(`Calcule : (${a} + ${b}) × [${c} − (${d} + ${e})]`, v, {
          explanation: `${d} + ${e} = ${d + e}, puis ${c} − ${d + e} = ${c - d - e} ; ${a} + ${b} = ${a + b} ; enfin ${a + b} × ${c - d - e} = ${v}.`,
        })
      },
    ),
    // Le trait de fraction regroupe comme des parenthèses
    variants(
      fresh(() => {
        const den = randInt(2, 9), q = randInt(3, 15), b = randInt(1, den * q - 1), a = den * q - b, d = randInt(1, 9)
        return numeric(`Calcule : {${a} + ${b}/${den + d} − ${d}}`, q, {
          explanation: `Le trait de fraction joue le rôle de parenthèses : en haut ${a + b}, en bas ${den}, et ${a + b} ÷ ${den} = ${q}.`,
        })
      }),
      fresh(() => {
        const d = randInt(2, 6), e = randInt(1, 6), den = d + e, q = randInt(3, 12), num = den * q
        const b = randInt(2, 9), a = Math.floor(num / b) + randInt(1, 3), c = a * b - num
        return numeric(`Calcule : {${a} × ${b} − ${c}/${d} + ${e}}`, q, {
          explanation: `En haut : ${a * b} − ${c} = ${num}. En bas : ${d} + ${e} = ${den}. Donc ${num} ÷ ${den} = ${q}.`,
        })
      }),
      fresh(() => {
        const den = randInt(2, 6), q = randInt(2, 9), b = randInt(1, den * q - 1), a = den * q - b, k = randInt(2, 15)
        return numeric(`Calcule : {${a} + ${b}/${den}} + ${k}`, q + k, {
          explanation: `D'abord la fraction : (${a} + ${b}) ÷ ${den} = ${den * q} ÷ ${den} = ${q}, puis ${q} + ${k} = ${q + k}.`,
        })
      }),
      fresh(() => {
        const den = randInt(2, 5), q = randInt(2, 9), m = randInt(2, 6), c = randInt(1, 9), a = den * q + c
        return numeric(`Calcule : ${m} × {${a} − ${c}/${den}}`, m * q, {
          explanation: `La fraction d'abord : (${a} − ${c}) ÷ ${den} = ${den * q} ÷ ${den} = ${q}, puis ${m} × ${q} = ${m * q}.`,
        })
      }),
    ),
    // Programmes de calcul à trois étapes
    variants(
      () => {
        const a = randInt(10, 40), b = randInt(3, 9), c = randInt(3, 9)
        return numeric(`Calcule la somme de ${a} et du produit de ${b} par ${c}, puis multiplie le résultat par 2.`, (a + b * c) * 2, {
          explanation: `(${a} + ${b} × ${c}) × 2 = ${a + b * c} × 2 = ${(a + b * c) * 2}.`,
        })
      },
      () => {
        const n = randInt(2, 12), k = randInt(2, 6), a = randInt(1, 15), m = randInt(2, 4)
        return numeric(`Programme de calcul : choisis ${n}, multiplie-le par ${k}, ajoute ${a}, puis multiplie le résultat par ${m}. Quel nombre obtiens-tu ?`, (n * k + a) * m, {
          explanation: `${n} × ${k} = ${n * k} ; ${n * k} + ${a} = ${n * k + a} ; ${n * k + a} × ${m} = ${(n * k + a) * m}. En une ligne : (${n} × ${k} + ${a}) × ${m}.`,
        })
      },
      () => {
        const n = randInt(2, 15), a = randInt(1, 12), k = randInt(2, 6), b = randInt(1, (n + a) * k - 1)
        return numeric(`Programme de calcul : choisis ${n}, ajoute ${a}, multiplie le résultat par ${k}, puis soustrais ${b}. Quel nombre obtiens-tu ?`, (n + a) * k - b, {
          explanation: `${n} + ${a} = ${n + a} ; ${n + a} × ${k} = ${(n + a) * k} ; ${(n + a) * k} − ${b} = ${(n + a) * k - b}. En une ligne : (${n} + ${a}) × ${k} − ${b}.`,
        })
      },
      () => {
        const d = pick([2, 3, 4, 5]), k = randInt(2, 6), a = randInt(1, 9)
        let n = a + randInt(1, 10)
        while (((n - a) * k) % d) n++
        return numeric(`Programme de calcul : choisis ${n}, soustrais ${a}, multiplie le résultat par ${k}, puis divise par ${d}. Quel nombre obtiens-tu ?`, ((n - a) * k) / d, {
          explanation: `${n} − ${a} = ${n - a} ; ${n - a} × ${k} = ${(n - a) * k} ; ${(n - a) * k} ÷ ${d} = ${((n - a) * k) / d}. En une ligne : (${n} − ${a}) × ${k} ÷ ${d}.`,
        })
      },
    ),
    // Priorités avec des nombres décimaux
    variants(
      () => {
        const a = pick([0.5, 1.5, 2.5, 0.25, 1.25]), b = pick([4, 8, 12]), c = pick([0.2, 0.4, 0.6, 1.2]), d = pick([5, 10, 15])
        return numeric(`Calcule : ${fmt(a)} × ${b} + ${fmt(c)} × ${d}`, a * b + c * d, {
          explanation: `${fmt(a)} × ${b} = ${fmt(a * b)} et ${fmt(c)} × ${d} = ${fmt(c * d)}, donc ${fmt(a * b + c * d)}.`,
        })
      },
      () => {
        const b = pick([1.5, 2.5, 0.5, 3.5, 1.2]), c = pick([2, 4, 6]), a = Math.ceil(b * c) + randInt(1, 12)
        return numeric(`Calcule : ${a} − ${fmt(b)} × ${c}`, a - b * c, {
          explanation: `La multiplication d'abord : ${fmt(b)} × ${c} = ${fmt(b * c)}, puis ${a} − ${fmt(b * c)} = ${fmt(a - b * c)}.`,
        })
      },
      () => {
        const a = pick([1.5, 2.5, 0.5, 3.5, 4.5]), b = pick([0.5, 1.5, 2.5]), c = randInt(2, 6)
        return numeric(`Calcule : (${fmt(a)} + ${fmt(b)}) × ${c}`, (a + b) * c, {
          explanation: `Parenthèse : ${fmt(a)} + ${fmt(b)} = ${fmt(a + b)}, puis × ${c} = ${fmt((a + b) * c)}.`,
        })
      },
      () => {
        const a = pick([1.2, 2.4, 3.6, 0.8, 4.5]), c = pick([2, 4, 5]), q = randInt(2, 9)
        return numeric(`Calcule : ${fmt(a)} + ${c * q} ÷ ${c} × ${fmt(0.5)}`, a + q * 0.5, {
          explanation: `÷ et × d'abord, de gauche à droite : ${c * q} ÷ ${c} = ${q}, ${q} × 0,5 = ${fmt(q * 0.5)} ; puis ${fmt(a)} + ${fmt(q * 0.5)} = ${fmt(a + q * 0.5)}.`,
        })
      },
    ),
  ],
  [
    // Bilan d'un marchand (recettes et dépenses)
    variants(
      () => {
        const ne = randInt(2, 6), pe = randInt(15, 40), nb = randInt(2, 6), pb = randInt(8, 25), r = randInt(5, 30)
        return numeric(`Le forgeron vend ${ne} épées à ${pe} écus pièce et ${nb} boucliers à ${pb} écus pièce. Il rend ${r} écus à un client mécontent. Combien d'écus a-t-il gagnés ?`, ne * pe + nb * pb - r, {
          explanation: `${ne} × ${pe} + ${nb} × ${pb} − ${r} = ${ne * pe} + ${nb * pb} − ${r} = ${ne * pe + nb * pb - r}.`,
        })
      },
      () => {
        const a = randInt(20, 60), pa = randInt(1, 3), b = randInt(5, 15), pb = randInt(3, 6), f = randInt(10, 40)
        return numeric(`La boulangère vend ${a} pains à ${pa} écu${s(pa)} et ${b} brioches à ${pb} écus. Elle paie ${f} écus de farine. Quel est son bénéfice (en écus) ?`, a * pa + b * pb - f, {
          explanation: `Recettes : ${a} × ${pa} + ${b} × ${pb} = ${a * pa + b * pb} écus ; bénéfice : ${a * pa + b * pb} − ${f} = ${a * pa + b * pb - f} écus.`,
        })
      },
      () => {
        const n = randInt(4, 12), pa = randInt(8, 20), pv = pa + randInt(3, 12), t = randInt(5, 20)
        return numeric(`Un marchand achète ${n} tonneaux de cidre à ${pa} écus pièce et les revend ${pv} écus pièce. Le transport lui coûte ${t} écus. Quel est son bénéfice (en écus) ?`, n * pv - n * pa - t, {
          explanation: `${n} × ${pv} − ${n} × ${pa} − ${t} = ${n * pv} − ${n * pa} − ${t} = ${n * pv - n * pa - t} écus.`,
        })
      },
      () => {
        const ad = randInt(20, 80), pa = randInt(8, 15), en = randInt(10, 50), pe = randInt(3, 7), f = randInt(50, 200)
        return numeric(`Un festival vend ${ad} billets adulte à ${pa} € et ${en} billets enfant à ${pe} €. La location de la scène coûte ${f} €. Combien reste-t-il dans la caisse (en €) ?`, ad * pa + en * pe - f, {
          explanation: `${ad} × ${pa} + ${en} × ${pe} − ${f} = ${ad * pa} + ${en * pe} − ${f} = ${ad * pa + en * pe - f} €.`,
        })
      },
    ),
    // Regrouper puis partager équitablement
    variants(
      () => {
        const rows = randInt(4, 9), cols = randInt(5, 12), gone = randInt(3, 12), groups = pick([2, 3, 4, 5])
        const g2 = gone + ((rows * cols - gone) % groups)
        return numeric(`Une armée de ${rows} rangs de ${cols} soldats perd ${g2} soldats, puis se répartit en ${groups} groupes égaux. Combien de soldats par groupe ?`, (rows * cols - g2) / groups, {
          explanation: `(${rows} × ${cols} − ${g2}) ÷ ${groups} = ${rows * cols - g2} ÷ ${groups} = ${(rows * cols - g2) / groups}.`,
        })
      },
      () => {
        const c = randInt(3, 8), per = randInt(12, 30), k = pick([3, 4, 5, 6])
        const extra = (k - ((c * per) % k)) % k + k * randInt(1, 2)
        return numeric(`Au verger, on remplit ${c} caisses de ${per} pommes, et il reste ${extra} pommes à part. On met toutes les pommes dans des sacs de ${k}. Combien de sacs remplit-on ?`, (c * per + extra) / k, {
          explanation: `(${c} × ${per} + ${extra}) ÷ ${k} = ${c * per + extra} ÷ ${k} = ${(c * per + extra) / k} sacs.`,
        })
      },
      () => {
        const n = randInt(2, 5), pc = randInt(20, 60), k = pick([3, 4, 5, 6])
        const b = (k - ((n * pc) % k)) % k + k * randInt(1, 4)
        return numeric(`Le butin compte ${n} coffres de ${pc} pièces d'or et une bourse de ${b} pièces. Les ${k} pirates se le partagent à parts égales. Combien de pièces reçoit chacun ?`, (n * pc + b) / k, {
          explanation: `(${n} × ${pc} + ${b}) ÷ ${k} = ${n * pc + b} ÷ ${k} = ${(n * pc + b) / k} pièces.`,
        })
      },
      () => {
        const cl = randInt(3, 6), el = randInt(22, 29), t = pick([4, 6, 8, 10])
        let ad = randInt(4, 12)
        while ((cl * el + ad) % t === 0) ad++
        const tot = cl * el + ad, tables = Math.ceil(tot / t), libres = tables * t - tot
        return numeric(`Pour la fête du collège, ${cl} classes de ${el} élèves et ${ad} adultes s'installent à des tables de ${t} places. On remplit les tables les unes après les autres. Combien de places restent libres à la dernière table ?`, libres, {
          explanation: `${cl} × ${el} + ${ad} = ${tot} personnes. ${tables} tables offrent ${tables} × ${t} = ${tables * t} places : il en reste ${tables * t} − ${tot} = ${libres} de libres.`,
        })
      },
    ),
    // Compter des points
    variants(
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
        const p = prenom(), c = randInt(2, 6), a = randInt(3, 8), r = randInt(1, 4)
        const tot = 10 * c + 5 * a - 2 * r
        return numeric(`Au tournoi de tir à l'arc, une flèche au centre rapporte 10 points, une flèche dans l'anneau 5 points, et une flèche ratée fait perdre 2 points. ${p} place ${c} flèches au centre, ${a} dans l'anneau et en rate ${r}. Quel est son score ?`, tot, {
          explanation: `${c} × 10 + ${a} × 5 − ${r} × 2 = ${10 * c} + ${5 * a} − ${2 * r} = ${tot}.`,
        })
      },
      () => {
        const p = prenom(), b = randInt(8, 15), f = randInt(1, Math.min(5, 19 - b)), v = 20 - b - f, pts = 4 * b - f
        return numeric(`À un quiz de 20 questions, une bonne réponse rapporte 4 points, une mauvaise en retire 1 et une question sans réponse ne compte pas. ${p} donne ${b} bonnes réponses, ${f} mauvaise${s(f)} et laisse ${v} question${s(v)} sans réponse. Quel est son score ?`, pts, {
          explanation: `${b} × 4 − ${f} × 1 + ${v} × 0 = ${4 * b} − ${f} = ${pts}.`,
        })
      },
    ),
    // Retrouver le nombre de départ (on remonte les étapes)
    variants(
      fresh(() => {
        const x = randInt(2, 15), k = randInt(2, 9), a = randInt(1, 20)
        return numeric(`Je pense à un nombre. Je le multiplie par ${k}, puis j'ajoute ${a} : j'obtiens ${k * x + a}. Quel est ce nombre ?`, x, {
          explanation: `On remonte les étapes : ${k * x + a} − ${a} = ${k * x}, puis ${k * x} ÷ ${k} = ${x}.`,
        })
      }),
      fresh(() => {
        const x = randInt(2, 15), k = randInt(2, 9), a = randInt(1, 20)
        return numeric(`Je pense à un nombre. J'ajoute ${a}, puis je multiplie le résultat par ${k} : j'obtiens ${k * (x + a)}. Quel est ce nombre ?`, x, {
          explanation: `On remonte les étapes : ${k * (x + a)} ÷ ${k} = ${x + a}, puis ${x + a} − ${a} = ${x}.`,
        })
      }),
      fresh(() => {
        const k = randInt(2, 6), q = randInt(3, 15), x = k * q, a = randInt(1, q - 1)
        return numeric(`Je pense à un nombre. Je le divise par ${k}, puis je retranche ${a} : j'obtiens ${q - a}. Quel est ce nombre ?`, x, {
          explanation: `On remonte les étapes : ${q - a} + ${a} = ${q}, puis ${q} × ${k} = ${x}.`,
        })
      }),
      fresh(() => {
        const a = randInt(1, 12), x = a + randInt(2, 12), k = randInt(2, 6), b = randInt(1, 15)
        return numeric(`Je pense à un nombre. Je lui retranche ${a}, je multiplie le résultat par ${k}, puis j'ajoute ${b} : j'obtiens ${(x - a) * k + b}. Quel est ce nombre ?`, x, {
          explanation: `On remonte : ${(x - a) * k + b} − ${b} = ${(x - a) * k}, puis ${(x - a) * k} ÷ ${k} = ${x - a}, enfin ${x - a} + ${a} = ${x}.`,
        })
      }),
    ),
    // Une dépense commune partagée
    variants(
      () => {
        const ad = randInt(2, 4), en = randInt(1, 4), pa = randInt(8, 12), pe = randInt(4, 7), r = pick([4, 5, 6, 8, 10])
        const total = ad * pa + en * pe - r
        return numeric(`Deux familles vont au cinéma : ${ad} places adulte à ${pa} € et ${en} place${s(en)} enfant à ${pe} €, avec un bon de réduction de ${r} €. Elles partagent la note à parts égales. Combien paie chaque famille (en €) ?`, total / 2, {
          explanation: `(${ad} × ${pa} + ${en} × ${pe} − ${r}) ÷ 2 = (${ad * pa} + ${en * pe} − ${r}) ÷ 2 = ${total} ÷ 2 = ${fmt(total / 2)} €.`,
        })
      },
      () => {
        const n = randInt(20, 30), rep = randInt(8, 15), sub = randInt(1, 5) * 10, car = n * randInt(5, 12) + sub
        const tot = car + n * rep - sub
        return numeric(`Pour une sortie, ${n} élèves louent un car à ${car} € et prennent chacun un repas à ${rep} €. Le foyer du collège offre ${sub} €. Combien chaque élève doit-il payer (en €) ?`, tot / n, {
          explanation: `(${car} + ${n} × ${rep} − ${sub}) ÷ ${n} = (${car} + ${n * rep} − ${sub}) ÷ ${n} = ${tot} ÷ ${n} = ${tot / n} €.`,
        })
      },
      () => {
        const pz = randInt(3, 6), pp = randInt(9, 14), bo = randInt(2, 5), pb = randInt(2, 4), k = pick([2, 4, 5])
        const tot = pz * pp + bo * pb
        return numeric(`${k} amis commandent ${pz} pizzas à ${pp} € et ${bo} bouteilles à ${pb} €. Ils partagent la note à parts égales. Combien paie chacun (en €) ?`, tot / k, {
          explanation: `(${pz} × ${pp} + ${bo} × ${pb}) ÷ ${k} = (${pz * pp} + ${bo * pb}) ÷ ${k} = ${tot} ÷ ${k} = ${fmt(tot / k)} €.`,
        })
      },
      () => {
        const ch = randInt(3, 6), pc = randInt(20, 40), k = randInt(3, 6)
        let fo = randInt(3, 9) * 10
        while ((ch * pc + fo) % k) fo++
        const tot = ch * pc + fo
        return numeric(`${k} chevaliers louent ${ch} chevaux à ${pc} écus et achètent ${fo} écus de fourrage. Ils partagent la dépense à parts égales. Combien paie chacun (en écus) ?`, tot / k, {
          explanation: `(${ch} × ${pc} + ${fo}) ÷ ${k} = (${ch * pc} + ${fo}) ÷ ${k} = ${tot} ÷ ${k} = ${tot / k} écus.`,
        })
      },
    ),
  ],
]

// ═══ Nombres relatifs (addition et soustraction) ════════════════════════
/** Explication de la somme de deux relatifs (règle des signes). */
const sumRule = (a: number, b: number) => (a * b < 0
  ? `Signes contraires : on soustrait les distances à zéro et on garde le signe de celui qui a la plus grande. Résultat : ${fmt(a + b)}.`
  : `Même signe : on additionne les distances à zéro et on garde le signe. Résultat : ${fmt(a + b)}.`)
const VILLES: [string, number][] = [
  ['Paris', 1], ['Londres', 0], ['New York', -5], ['Los Angeles', -8], ['Tokyo', 9], ['Dubaï', 4],
  ['Rio de Janeiro', -3], ['Moscou', 3], ['Pékin', 8], ['Mexico', -6],
]
const utc = (o: number) => (o === 0 ? 'UTC' : `UTC${o > 0 ? '+' : '−'}${Math.abs(o)}`)

const rel: Tiers = [
  [
    // Somme de deux relatifs, sous plusieurs écritures
    variants(
      () => {
        let a = randNonZero(-15, 15), b = randNonZero(-15, 15)
        while (a > 0 && b > 0) { a = randNonZero(-15, 15); b = randNonZero(-15, 15) }
        return numeric(`Calcule : ${signed(a)} + ${signed(b)}`, a + b, { explanation: sumRule(a, b) })
      },
      () => {
        let a = randNonZero(-15, 15), b = randNonZero(-15, 15)
        while (a > 0 && b > 0) { a = randNonZero(-15, 15); b = randNonZero(-15, 15) }
        return numeric(`Calcule : ${chain([a, b])}`, a + b, {
          explanation: `On lit ${chain([a, b])} comme la somme de ${fmt(a)} et de ${par(b)}. ${sumRule(a, b)}`,
        })
      },
      () => {
        const a = randNonZero(-15, 15), b = randNonZero(-15, -1)
        return numeric(`Calcule la somme de ${fmt(a)} et de ${fmt(b)}.`, a + b, { explanation: `${fmt(a)} + ${par(b)} : ${sumRule(a, b)}` })
      },
      () => {
        const a = randNonZero(-15, -1), b = randNonZero(-15, 15)
        return numeric(`Quel nombre obtient-on en ajoutant ${par(b)} à ${fmt(a)} ?`, a + b, { explanation: `${fmt(a)} + ${par(b)} : ${sumRule(a, b)}` })
      },
    ),
    // Se repérer et comparer sur une droite graduée
    variants(
      () => {
        const a = randInt(-9, 9), d = randInt(2, 9), right = Math.random() < 0.5
        const r = right ? a + d : a - d
        return numeric(`Sur une droite graduée, quel nombre est situé ${d} unités à ${right ? 'droite' : 'gauche'} de ${fmt(a)} ?`, r, {
          explanation: `Aller à ${right ? 'droite' : 'gauche'}, c'est ${right ? 'ajouter' : 'soustraire'} : ${fmt(a)} ${right ? '+' : '−'} ${d} = ${fmt(r)}.`,
        })
      },
      () => {
        const a = -randInt(2, 9), b = randInt(-1, 9)
        return numeric(`Combien de nombres entiers sont strictement compris entre ${fmt(a)} et ${fmt(b)} ?`, b - a - 1, {
          explanation: `Ce sont les entiers de ${fmt(a + 1)} à ${fmt(b - 1)} : il y en a ${b - a - 1}.`,
        })
      },
      () => {
        const t = -randInt(1, 6)
        let vals: number[] = []
        while (new Set(vals).size !== 6 || vals.includes(t)) vals = Array.from({ length: 6 }, () => randInt(-12, 10))
        const n = vals.filter((v) => v < t).length
        return numeric(`Parmi les nombres ${vals.map(fmt).join(' ; ')}, combien sont strictement inférieurs à ${fmt(t)} ?`, n, {
          explanation: `Ceux qui sont à gauche de ${fmt(t)} sur la droite graduée : ${vals.filter((v) => v < t).map(fmt).join(' ; ') || 'aucun'}. Il y en a ${n}.`,
        })
      },
      () => {
        const k = randInt(1, 9), d = randInt(1, 9), low = Math.random() < 0.5
        const x = -(k + d / 10)
        return numeric(`Le nombre ${fmt(x)} est compris entre deux nombres entiers consécutifs. Quel est le ${low ? 'plus petit' : 'plus grand'} des deux ?`, low ? -k - 1 : -k, {
          explanation: `Sur la droite graduée, ${fmt(x)} est entre ${fmt(-k - 1)} et ${fmt(-k)} : ${fmt(-k - 1)} < ${fmt(x)} < ${fmt(-k)}.`,
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
    ),
    // Une variation en contexte
    variants(
      () => {
        const t = randInt(-12, -1), up = randInt(2, 15)
        return numeric(`Il fait ${fmt(t)} °C ${lieu()}. La température monte de ${up} °C. Quelle température fait-il maintenant (en °C) ?`, t + up, {
          explanation: `${fmt(t)} + ${up} = ${fmt(t + up)} °C.`,
        })
      },
      () => {
        const t = randInt(1, 9), down = t + randInt(1, 9)
        return numeric(`Il fait ${t} °C ${lieu()} en fin d'après-midi. Pendant la nuit, la température baisse de ${down} °C. Quelle température fait-il au petit matin (en °C) ?`, t - down, {
          explanation: `${t} − ${down} = ${fmt(t - down)} °C : on passe sous zéro.`,
        })
      },
      () => {
        const st = -randInt(1, 3), up = randInt(2, 8)
        return numeric(`L'ascenseur d'un immeuble part du niveau ${fmt(st)} (au sous-sol) et monte de ${up} étages. À quel niveau arrive-t-il ?`, st + up, {
          explanation: `${fmt(st)} + ${up} = ${fmt(st + up)}.`,
        })
      },
      () => {
        const d = randInt(8, 30), u = randInt(2, 20)
        return numeric(`Un plongeur est à l'altitude ${fmt(-d)} m, sous la surface de l'eau. Il remonte de ${u} m. À quelle altitude se trouve-t-il (en m) ?`, -d + u, {
          explanation: `${fmt(-d)} + ${u} = ${fmt(-d + u)} m.`,
        })
      },
      () => {
        const p = prenom(), d = randInt(5, 40), dep = randInt(5, 60)
        return numeric(`Le compte en banque ${de(p)} affiche ${fmt(-d)} €. ${p} y dépose ${dep} €. Quel est le nouveau solde (en €) ?`, dep - d, {
          explanation: `${fmt(-d)} + ${dep} = ${fmt(dep - d)} €.`,
        })
      },
    ),
    // L'écart entre un nombre négatif et un nombre positif
    variants(
      () => {
        const a = randInt(1, 12), b = randInt(1, 12)
        return numeric(`Sur une droite graduée, A a pour abscisse ${fmt(-a)} et B a pour abscisse ${b}. Combien d'unités séparent A et B ?`, a + b, {
          explanation: `De ${fmt(-a)} à 0 : ${a} unités ; de 0 à ${b} : ${b} unités. En tout ${a} + ${b} = ${a + b}.`,
        })
      },
      () => {
        const a = randInt(1, 12), b = randInt(1, 15)
        return numeric(`${cap(lieu())}, la température la plus basse de la journée a été ${fmt(-a)} °C et la plus haute ${b} °C. Quel est l'écart entre les deux (en °C) ?`, a + b, {
          explanation: `De ${fmt(-a)} à 0 : ${a} degrés, puis de 0 à ${b} : ${b} degrés. Écart : ${a + b} °C.`,
        })
      },
      () => {
        const a = randInt(2, 15), b = randInt(2, 15)
        return numeric(`Un plongeur est à ${fmt(-a)} m (sous la surface) et une mouette vole à ${b} m au-dessus de l'eau. Quelle distance verticale les sépare (en m) ?`, a + b, {
          explanation: `${a} m jusqu'à la surface, puis ${b} m jusqu'à la mouette : ${a} + ${b} = ${a + b} m.`,
        })
      },
      () => {
        const a = randInt(1, 4), b = randInt(2, 12)
        return numeric(`Un ascenseur monte du niveau ${fmt(-a)} (parking) au niveau ${b}. De combien d'étages est-il monté ?`, a + b, {
          explanation: `${a} étage${s(a)} pour remonter au niveau 0, puis ${b} : ${a + b} étages.`,
        })
      },
    ),
  ],
  [
    // Soustraire un relatif : ajouter son opposé
    variants(
      () => {
        const a = randNonZero(-15, 15), b = randNonZero(-15, 15)
        return numeric(`Calcule : ${signed(a)} − ${signed(b)}`, a - b, {
          explanation: `Soustraire ${signed(b)}, c'est ajouter son opposé ${signed(-b)} : ${signed(a)} + ${signed(-b)} = ${fmt(a - b)}.`,
        })
      },
      () => {
        const a = randNonZero(-15, 15), b = randNonZero(-15, -1)
        return numeric(`Calcule : ${fmt(a)} − ${par(b)}`, a - b, {
          explanation: `Soustraire ${par(b)}, c'est ajouter ${-b} : ${fmt(a)} + ${-b} = ${fmt(a - b)}.`,
        })
      },
      () => {
        const a = randNonZero(-15, 15), b = randNonZero(-15, 15)
        return numeric(`Soustrais ${par(b)} à ${fmt(a)}.`, a - b, {
          explanation: `${fmt(a)} − ${par(b)} = ${fmt(a)} + ${par(-b)} = ${fmt(a - b)}.`,
        })
      },
      () => {
        let b = randNonZero(-15, 15), a = b + randInt(-12, 12)
        while (a >= 0 && b > 0) { b = randNonZero(-15, 15); a = b + randInt(-12, 12) }
        return numeric(`Calcule la différence ${fmt(a)} − ${par(b)}.`, a - b, {
          explanation: `On ajoute l'opposé de ${par(b)} : ${fmt(a)} + ${par(-b)} = ${fmt(a - b)}.`,
        })
      },
    ),
    // Le terme manquant d'une addition
    variants(
      fresh(() => {
        const a = randNonZero(-20, 20), b = randNonZero(-20, 20)
        return numeric(`Quel nombre faut-il ajouter à ${fmt(a)} pour obtenir ${fmt(b)} ?`, b - a, {
          explanation: `On calcule ${fmt(b)} − ${par(a)} = ${fmt(b - a)}.`,
        })
      }),
      fresh(() => {
        const a = randNonZero(-15, 15), x = randNonZero(-15, 15)
        return numeric(`Complète : ${fmt(a)} + ? = ${fmt(a + x)}`, x, {
          explanation: `? = ${fmt(a + x)} − ${par(a)} = ${fmt(x)}. Vérification : ${fmt(a)} + ${par(x)} = ${fmt(a + x)}.`,
        })
      }),
      fresh(() => {
        const a = randNonZero(-15, 15), x = randNonZero(-15, 15)
        return numeric(`Complète : ? + ${par(a)} = ${fmt(a + x)}`, x, {
          explanation: `? = ${fmt(a + x)} − ${par(a)} = ${fmt(x)}.`,
        })
      }),
      fresh(() => {
        const a = randInt(-12, -1), x = randNonZero(-10, 15)
        return numeric(`Le thermomètre indique ${fmt(a)} °C. De combien de degrés la température doit-elle varier pour atteindre ${fmt(a + x)} °C ? (réponse négative si elle baisse)`, x, {
          explanation: `Variation = arrivée − départ = ${fmt(a + x)} − ${par(a)} = ${fmt(x)} °C.`,
        })
      }),
    ),
    // Somme de trois relatifs
    variants(
      () => {
        let v = [1]
        while (v.every((x) => x > 0) || v.every((x) => x < 0)) v = [randNonZero(-12, 12), randNonZero(-12, 12), randNonZero(-12, 12)]
        return numeric(`Calcule : ${chain(v)}`, sum(v), {
          explanation: `De gauche à droite : ${chain(v.slice(0, 2))} = ${fmt(v[0] + v[1])}, puis ${chain([v[0] + v[1], v[2]])} = ${fmt(sum(v))}.`,
        })
      },
      () => {
        let v = [1]
        while (v.every((x) => x > 0) || v.every((x) => x < 0)) v = [randNonZero(-12, 12), randNonZero(-12, 12), randNonZero(-12, 12)]
        return numeric(`Calcule : ${v.map(signed).join(' + ')}`, sum(v), {
          explanation: `On peut regrouper les positifs (${fmt(sum(v.filter((x) => x > 0)))}) et les négatifs (${fmt(sum(v.filter((x) => x < 0)))}) : total ${fmt(sum(v))}.`,
        })
      },
      () => {
        let v = [1]
        while (v.every((x) => x > 0) || v.every((x) => x < 0)) v = [randNonZero(-12, 12), randNonZero(-12, 12), randNonZero(-12, 12)]
        return numeric(`Calcule la somme des trois nombres ${v.map(fmt).join(' ; ')}.`, sum(v), {
          explanation: `${fmt(v[0])} + ${par(v[1])} + ${par(v[2])} = ${fmt(v[0] + v[1])} + ${par(v[2])} = ${fmt(sum(v))}.`,
        })
      },
      () => {
        const p = prenom(), g1 = randInt(5, 20), l = randInt(10, 30), g2 = randInt(3, 15)
        return numeric(`Au jeu de l'oie, ${p} avance de ${g1} cases, recule de ${l} cases, puis avance de ${g2} cases. Quel est le déplacement total (en cases, négatif en cas de recul) ?`, g1 - l + g2, {
          explanation: `${g1} + ${par(-l)} + ${g2} = ${fmt(g1 - l + g2)}.`,
        })
      },
    ),
    // Variation en contexte : arrivée − départ
    variants(
      () => {
        const m = randInt(-12, -1), a = randInt(1, 15)
        return numeric(`Ce matin, le thermomètre ${lieu()} indiquait ${fmt(m)} °C ; cet après-midi, il indique ${a} °C. De combien de degrés la température a-t-elle augmenté ?`, a - m, {
          explanation: `${a} − ${par(m)} = ${a} + ${-m} = ${a - m} °C.`,
        })
      },
      () => {
        const d1 = randInt(20, 40), d2 = randInt(3, d1 - 5)
        return numeric(`Un plongeur passe de l'altitude ${fmt(-d1)} m à l'altitude ${fmt(-d2)} m. De combien de mètres est-il remonté ?`, d1 - d2, {
          explanation: `${fmt(-d2)} − ${par(-d1)} = ${fmt(-d2)} + ${d1} = ${d1 - d2} m.`,
        })
      },
      () => {
        const p = prenom(), x = randInt(5, 50), y = randInt(5, 80)
        return numeric(`Le solde du compte ${de(p)} passe de ${fmt(-x)} € à ${y} € grâce à un seul dépôt. Quel est le montant de ce dépôt (en €) ?`, x + y, {
          explanation: `${y} − ${par(-x)} = ${y} + ${x} = ${x + y} €.`,
        })
      },
      () => {
        const start = randInt(-3, -1), up = randInt(4, 9), down = randInt(2, up + 2)
        const r = start + up - down
        return numeric(`Dans un immeuble avec parking souterrain, l'ascenseur part du niveau ${fmt(start)}, monte de ${up} étages, puis descend de ${down} étages. À quel niveau arrive-t-il ?`, r, {
          explanation: `${fmt(start)} + ${up} − ${down} = ${fmt(r)}.`,
        })
      },
      () => {
        const p = prenom(), a = randInt(5, 40), b = randInt(5, 60)
        return numeric(`Dans un jeu, le score ${de(p)} passe de ${fmt(-a)} points à ${b} points. Combien de points a-t-il gagnés ?`, a + b, {
          explanation: `${b} − ${par(-a)} = ${b} + ${a} = ${a + b} points.`,
        })
      },
    ),
  ],
  [
    // Suites d'additions et de soustractions
    variants(
      () => {
        const a = randNonZero(-12, 12), b = randNonZero(-12, 12), c = randNonZero(-12, 12), e = randNonZero(-12, 12)
        const r = a + b - c + e
        return numeric(`Calcule : ${fmt(a)} + ${par(b)} − ${par(c)} + ${par(e)}`, r, {
          explanation: `On remplace la soustraction par l'addition de l'opposé : ${fmt(a)} + ${par(b)} + ${par(-c)} + ${par(e)} = ${fmt(r)}.`,
        })
      },
      () => {
        let v = [1]
        while (v.filter((x) => x < 0).length < 2) v = Array.from({ length: 5 }, () => randNonZero(-12, 12))
        return numeric(`Calcule : ${chain(v)}`, sum(v), {
          explanation: `Positifs : ${fmt(sum(v.filter((x) => x > 0)))} ; négatifs : ${fmt(sum(v.filter((x) => x < 0)))} ; total ${fmt(sum(v))}.`,
        })
      },
      () => {
        const a = randNonZero(-12, 12), b = randNonZero(-12, 12), c = randNonZero(-12, 12), d = randNonZero(-12, 12)
        const r = a - b - c + d
        return numeric(`Calcule : ${signed(a)} − ${signed(b)} − ${signed(c)} + ${signed(d)}`, r, {
          explanation: `${signed(a)} + ${signed(-b)} + ${signed(-c)} + ${signed(d)} = ${fmt(r)}.`,
        })
      },
      () => {
        const a = randNonZero(-12, 12), b = randNonZero(-12, 12), c = randNonZero(-12, 12), d = randNonZero(-12, 12)
        const r = a - b + c - d
        return numeric(`Calcule : ${fmt(a)} − ${par(b)} + ${par(c)} − ${par(d)}`, r, {
          explanation: `${fmt(a)} + ${par(-b)} + ${par(c)} + ${par(-d)} = ${fmt(r)}.`,
        })
      },
    ),
    // Distance et écart entre deux relatifs
    variants(
      () => {
        const a = randNonZero(-15, -1), b = randNonZero(1, 15)
        return numeric(`Sur une droite graduée, A a pour abscisse ${fmt(a)} et B a pour abscisse ${fmt(b)}. Quelle est la distance AB ?`, b - a, {
          explanation: `AB = ${fmt(b)} − ${par(a)} = ${b - a}.`,
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
      () => {
        const a = randInt(150, 900), b = randInt(20, 400)
        return numeric(`Le sommet d'une colline est à ${a} m d'altitude et le fond d'un lac voisin à ${fmt(-b)} m. Quelle est la différence d'altitude entre les deux (en m) ?`, a + b, {
          explanation: `${a} − ${par(-b)} = ${a} + ${b} = ${a + b} m.`,
        })
      },
      () => {
        const a = randInt(1, 20), b = randInt(a + 2, 35)
        return numeric(`Sur une droite graduée, C a pour abscisse ${fmt(-a)} et D a pour abscisse ${fmt(-b)}. Quelle est la distance CD ?`, b - a, {
          explanation: `CD = plus grande abscisse − plus petite = ${fmt(-a)} − ${par(-b)} = ${b - a}.`,
        })
      },
    ),
    // Calculer astucieusement en regroupant
    variants(
      fresh(() => {
        const a = randInt(5, 19)
        let b = randInt(3, 15)
        while (b === a) b = randInt(3, 15)
        const c = randNonZero(-12, 12), d = randNonZero(-12, 12)
        const terms = shuffle([a, -a, b, -b, c, d])
        return numeric(`Calcule astucieusement : ${chain(terms)}`, c + d, {
          explanation: `${a} et −${a} s'annulent, ${b} et −${b} aussi : il reste ${fmt(c)} + ${par(d)} = ${fmt(c + d)}.`,
        })
      }),
      () => {
        const u = randInt(1, 9), pos = [10 * randInt(1, 3) + u, 10 * randInt(1, 3) + 10 - u], neg = [randInt(3, 19), randInt(3, 19)]
        const P = pos[0] + pos[1], N = neg[0] + neg[1]
        const terms = [pos[0], -neg[0], pos[1], -neg[1]]
        return numeric(`Calcule astucieusement : ${chain(terms)}`, P - N, {
          explanation: `On regroupe les positifs : ${pos[0]} + ${pos[1]} = ${P}, et les négatifs : −${neg[0]} − ${neg[1]} = −${N}. Total : ${P} − ${N} = ${fmt(P - N)}.`,
        })
      },
      () => {
        const u = randInt(1, 9), v = randInt(1, 9)
        const n1 = 10 * randInt(0, 2) + u, n2 = 10 * randInt(1, 2) + (10 - u), p1 = 10 * randInt(1, 3) + v, p2 = 10 * randInt(0, 2) + (10 - v)
        const terms = [-n1, p1, -n2, p2]
        return numeric(`Calcule astucieusement : ${chain(terms)}`, p1 + p2 - n1 - n2, {
          explanation: `−${n1} − ${n2} = −${n1 + n2} et ${p1} + ${p2} = ${p1 + p2}, puis ${p1 + p2} − ${n1 + n2} = ${fmt(p1 + p2 - n1 - n2)}.`,
        })
      },
    ),
    // Retrouver un terme manquant
    variants(
      fresh(() => {
        const a = randNonZero(-12, 12), x = randNonZero(-12, 12), b = a - x
        return numeric(`Complète : ${fmt(a)} − ? = ${fmt(b)}`, x, {
          explanation: `? = ${fmt(a)} − ${par(b)} = ${fmt(x)}. Vérification : ${fmt(a)} − ${par(x)} = ${fmt(b)}.`,
        })
      }),
      fresh(() => {
        const a = randNonZero(-12, 12), x = randNonZero(-12, 12)
        return numeric(`Complète : ? − ${par(a)} = ${fmt(x - a)}`, x, {
          explanation: `? = ${fmt(x - a)} + ${par(a)} = ${fmt(x)}.`,
        })
      }),
      fresh(() => {
        const x = randNonZero(-15, 15), b = randNonZero(-12, 12), c = x - b
        return numeric(`Quand on soustrait ${par(b)} à un nombre, on obtient ${fmt(c)}. Quel est ce nombre ?`, x, {
          explanation: `On fait l'opération inverse : ${fmt(c)} + ${par(b)} = ${fmt(x)}.`,
        })
      }),
      fresh(() => {
        const x = randNonZero(-15, 15), b = randNonZero(-12, -1), c = x + b
        return numeric(`Quand on ajoute ${fmt(b)} à un nombre, on obtient ${fmt(c)}. Quel est ce nombre ?`, x, {
          explanation: `On fait l'opération inverse : ${fmt(c)} − ${par(b)} = ${fmt(x)}.`,
        })
      }),
    ),
    // Plusieurs variations en contexte
    variants(
      () => {
        const p = prenom(), s0 = -randInt(10, 60), dep = randInt(20, 90), pay = randInt(10, 70)
        const r = s0 + dep - pay
        return numeric(`Le compte en banque ${de(p)} affiche ${fmt(s0)} €. ${p} dépose ${dep} €, puis paie ${pay} € en ligne. Quel est le nouveau solde (en €) ?`, r, {
          explanation: `${fmt(s0)} + ${dep} − ${pay} = ${fmt(s0 + dep)} − ${pay} = ${fmt(r)} €.`,
        })
      },
      () => {
        const t0 = randInt(-8, 4), a = randInt(2, 9), b = randInt(3, 12), c = randInt(1, 6)
        const r = t0 + a - b + c
        return numeric(`À 6 h, il fait ${fmt(t0)} °C. La température monte de ${a} °C jusqu'à midi, baisse de ${b} °C pendant un orage, puis remonte de ${c} °C. Quelle température fait-il alors (en °C) ?`, r, {
          explanation: `${fmt(t0)} + ${a} − ${b} + ${c} = ${fmt(r)} °C.`,
        })
      },
      () => {
        const st = randInt(-3, 2), m = [randInt(2, 7), -randInt(3, 9), randInt(1, 5)]
        const r = st + sum(m)
        return numeric(`L'ascenseur part du niveau ${fmt(st)}, monte de ${m[0]} étages, descend de ${-m[1]} étages, puis monte de ${m[2]} étage${s(m[2])}. À quel niveau est-il ?`, r, {
          explanation: `${fmt(st)} + ${m[0]} − ${-m[1]} + ${m[2]} = ${fmt(r)}.`,
        })
      },
      () => {
        const h = -randInt(5, 30) * 10, d = randInt(5, 20) * 10, u = randInt(10, 40) * 10
        const r = h - d + u
        return numeric(`Un sous-marin navigue à ${fmt(h)} m. Il plonge de ${d} m, puis remonte de ${u} m. À quelle altitude se trouve-t-il (en m) ?`, r, {
          explanation: `${fmt(h)} − ${d} + ${u} = ${fmt(h - d)} + ${u} = ${fmt(r)} m.`,
        })
      },
    ),
  ],
  [
    // Sommes et différences avec parenthèses
    variants(
      () => {
        const a = randNonZero(-12, 12), b = randNonZero(-12, 12), c = randNonZero(-12, 12)
        return numeric(`Calcule : ${fmt(a)} − (${fmt(b)} + ${par(c)})`, a - (b + c), {
          explanation: `Parenthèse d'abord : ${fmt(b)} + ${par(c)} = ${fmt(b + c)}, puis ${fmt(a)} − ${par(b + c)} = ${fmt(a - b - c)}.`,
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
        const a = randNonZero(-12, 12), b = randNonZero(-12, 12), c = randNonZero(-12, 12)
        return numeric(`Calcule : ${fmt(a)} − (${fmt(b)} − ${par(c)})`, a - (b - c), {
          explanation: `Parenthèse d'abord : ${fmt(b)} − ${par(c)} = ${fmt(b - c)}, puis ${fmt(a)} − ${par(b - c)} = ${fmt(a - b + c)}.`,
        })
      },
      () => {
        let a = 0, b = 0, c = 0, d = 0
        while (a + b === 0 || c - d === 0) { a = randNonZero(-12, 12); b = randNonZero(-12, 12); c = randNonZero(-12, 12); d = randNonZero(-12, 12) }
        const X = a + b, Y = c - d
        return numeric(`Calcule : (${fmt(a)} + ${par(b)}) + (${fmt(c)} − ${par(d)})`, X + Y, {
          explanation: `Première parenthèse : ${fmt(X)} ; seconde : ${fmt(Y)} ; puis ${fmt(X)} + ${par(Y)} = ${fmt(X + Y)}.`,
        })
      },
    ),
    // Milieu et symétrique sur une droite graduée
    variants(
      () => {
        const a = 2 * randNonZero(-9, 9)
        let b = a + 2 * randInt(1, 9)
        if (b === 0) b = 2
        return numeric(`A a pour abscisse ${fmt(a)} et B a pour abscisse ${fmt(b)}. Quelle est l'abscisse du milieu de [AB] ?`, (a + b) / 2, {
          explanation: `AB = ${fmt(b)} − ${par(a)} = ${b - a} ; le milieu est à ${(b - a) / 2} de A : ${fmt(a)} + ${(b - a) / 2} = ${fmt((a + b) / 2)}.`,
        })
      },
      fresh(() => {
        const m = randNonZero(-8, 8), d = randInt(2, 9), b = m - d, c = m + d
        const left = Math.random() < 0.5
        return numeric(`Sur une droite graduée, A est le milieu de [BC]. A a pour abscisse ${fmt(m)} et ${left ? 'B' : 'C'} a pour abscisse ${fmt(left ? b : c)}. Quelle est l'abscisse de ${left ? 'C' : 'B'} ?`, left ? c : b, {
          explanation: `${left ? 'B' : 'C'} est à ${d} unités de A ; ${left ? 'C' : 'B'} est à ${d} unités de l'autre côté : ${fmt(m)} ${left ? '+' : '−'} ${d} = ${fmt(left ? c : b)}.`,
        })
      }),
      fresh(() => {
        const o = randNonZero(-6, 6), a = o + randNonZero(-9, 9)
        return numeric(`Sur une droite graduée, O a pour abscisse ${fmt(o)} et A pour abscisse ${fmt(a)}. Quelle est l'abscisse du symétrique de A par rapport à O ?`, 2 * o - a, {
          explanation: `A est à ${Math.abs(a - o)} unité${s(Math.abs(a - o))} de O, à ${a > o ? 'droite' : 'gauche'} ; son symétrique est à la même distance de l'autre côté : ${fmt(o)} ${a > o ? '−' : '+'} ${Math.abs(a - o)} = ${fmt(2 * o - a)}.`,
        })
      }),
    ),
    // Programmes de calcul avec des relatifs
    variants(
      () => {
        const st = randNonZero(-9, 9), a = randInt(3, 15), b = randInt(-9, -1), c = randInt(2, 12)
        const r = st + a - b - c
        return numeric(`Programme de calcul : choisis ${fmt(st)}, ajoute ${a}, soustrais ${par(b)}, puis enlève ${c}. Quel résultat obtiens-tu ?`, r, {
          explanation: `${fmt(st)} + ${a} = ${fmt(st + a)} ; ${fmt(st + a)} − ${par(b)} = ${fmt(st + a - b)} ; ${fmt(st + a - b)} − ${c} = ${fmt(r)}.`,
        })
      },
      () => {
        const st = randNonZero(-9, 9), a = randInt(5, 15), b = randInt(-9, -1), c = randInt(-9, -1)
        const r = st - a + b - c
        return numeric(`Programme de calcul : choisis ${fmt(st)}, soustrais ${a}, ajoute ${par(b)}, puis soustrais ${par(c)}. Quel résultat obtiens-tu ?`, r, {
          explanation: `${fmt(st)} − ${a} = ${fmt(st - a)} ; ${fmt(st - a)} + ${par(b)} = ${fmt(st - a + b)} ; ${fmt(st - a + b)} − ${par(c)} = ${fmt(r)}.`,
        })
      },
      () => {
        const st = randNonZero(-12, 12), a = randNonZero(-9, 9), b = randInt(2, 12)
        const r = st - a - b
        return numeric(`Programme de calcul : choisis ${fmt(st)}, ajoute l'opposé de ${fmt(a)}, puis retire ${b}. Quel résultat obtiens-tu ?`, r, {
          explanation: `L'opposé de ${fmt(a)} est ${fmt(-a)} : ${fmt(st)} + ${par(-a)} = ${fmt(st - a)}, puis ${fmt(st - a)} − ${b} = ${fmt(r)}.`,
        })
      },
    ),
    // Pyramides, carrés magiques et suites de relatifs
    variants(
      () => {
        let a = 0, b = 0, c = 0
        while (a + b === 0 || b + c === 0 || a + 2 * b + c === 0) { a = randNonZero(-9, 9); b = randNonZero(-9, 9); c = randNonZero(-9, 9) }
        const X = a + b, Y = b + c
        return numeric(`Dans une pyramide de nombres, chaque brique est la somme des deux briques sur lesquelles elle repose. La rangée du bas contient, dans l'ordre, ${fmt(a)} ; ${fmt(b)} ; ${fmt(c)}. Quel nombre est au sommet ?`, X + Y, {
          explanation: `Rangée du milieu : ${fmt(a)} + ${par(b)} = ${fmt(X)} et ${fmt(b)} + ${par(c)} = ${fmt(Y)}. Sommet : ${fmt(X)} + ${par(Y)} = ${fmt(X + Y)}.`,
        })
      },
      fresh(() => {
        let a = 0, x = 0, c = 0
        while (a + 2 * x + c === 0) { a = randNonZero(-9, 9); x = randNonZero(-9, 9); c = randNonZero(-9, 9) }
        const T = a + 2 * x + c
        return numeric(`Dans une pyramide de nombres, chaque brique est la somme des deux briques sur lesquelles elle repose. La rangée du bas contient ${fmt(a)} ; ? ; ${fmt(c)} et le sommet vaut ${fmt(T)}. Quel est le nombre manquant ?`, x, {
          explanation: `Le sommet vaut ${fmt(a)} + 2 × ? + ${par(c)}, donc 2 × ? = ${fmt(T)} − ${par(a)} − ${par(c)} = ${fmt(2 * x)} et ? = ${fmt(x)}.`,
        })
      }),
      fresh(() => {
        const r1 = [randNonZero(-9, 9), randNonZero(-9, 9), randNonZero(-9, 9)], S = sum(r1)
        const d = randNonZero(-9, 9), e = randNonZero(-9, 9), x = S - d - e
        return numeric(`Dans un carré magique, toutes les lignes ont la même somme. Une ligne contient ${r1.map(fmt).join(' ; ')}. Une autre contient ${fmt(d)} ; ? ; ${fmt(e)}. Quel est le nombre manquant ?`, x, {
          explanation: `Somme d'une ligne : ${fmt(r1[0])} + ${par(r1[1])} + ${par(r1[2])} = ${fmt(S)}. Donc ? = ${fmt(S)} − ${par(d)} − ${par(e)} = ${fmt(x)}.`,
        })
      }),
      fresh(() => {
        const st = randInt(-12, 12), r = randNonZero(-7, 7)
        const seq = [st, st + r, st + 2 * r, st + 3 * r]
        return numeric(`Dans cette suite, on ajoute toujours le même nombre pour passer d'un terme au suivant : ${seq.map(fmt).join(' ; ')} ; … Quel est le terme suivant ?`, st + 4 * r, {
          explanation: `On ajoute ${par(r)} à chaque fois : ${fmt(seq[3])} + ${par(r)} = ${fmt(st + 4 * r)}.`,
        })
      }),
    ),
  ],
  [
    // Températures sur une journée
    variants(
      () => {
        const t0 = randInt(-15, -2), up = randInt(5, 18), down = randInt(4, 20)
        return numeric(`À l'aube, il fait ${fmt(t0)} °C au campement. La température monte de ${up} °C, puis baisse de ${down} °C la nuit. Quelle est la température finale (en °C) ?`, t0 + up - down, {
          explanation: `${fmt(t0)} + ${up} − ${down} = ${fmt(t0 + up)} − ${down} = ${fmt(t0 + up - down)}.`,
        })
      },
      fresh(() => {
        const t0 = randInt(-15, 5), up = randInt(5, 15), down = randInt(4, 20), fin = t0 + up - down
        return numeric(`Au sommet du col, la température a monté de ${up} °C dans la matinée, puis baissé de ${down} °C le soir. Il fait maintenant ${fmt(fin)} °C. Quelle température faisait-il au départ (en °C) ?`, t0, {
          explanation: `On remonte le temps : ${fmt(fin)} + ${down} − ${up} = ${fmt(t0)} °C.`,
        })
      }),
      () => {
        const t = [randInt(-12, -3), randInt(-2, 6), randInt(4, 14), randInt(-6, 3)]
        const v = [t[1] - t[0], t[2] - t[1], t[3] - t[2]]
        return numeric(`Relevés de la journée au poste de garde : 6 h ${fmt(t[0])} °C ; 10 h ${fmt(t[1])} °C ; 14 h ${fmt(t[2])} °C ; 20 h ${fmt(t[3])} °C. Quelle est la variation de température entre 6 h et 20 h (en °C, négative si elle a baissé) ?`, t[3] - t[0], {
          explanation: `Variation = arrivée − départ = ${fmt(t[3])} − ${par(t[0])} = ${fmt(t[3] - t[0])} °C. (On peut aussi additionner les variations : ${v.map(fmt).join(' ; ')}.)`,
        })
      },
      () => {
        const t0 = randInt(30, 45), down = t0 + randInt(5, 15), up = randInt(3, 12)
        return numeric(`Dans le désert, il fait ${t0} °C à midi. La nuit, la température chute de ${down} °C, puis remonte de ${up} °C au lever du soleil. Quelle température fait-il alors (en °C) ?`, t0 - down + up, {
          explanation: `${t0} − ${down} + ${up} = ${fmt(t0 - down)} + ${up} = ${fmt(t0 - down + up)} °C.`,
        })
      },
    ),
    // Altitudes au-dessus et au-dessous de zéro
    variants(
      () => {
        const d = randInt(20, 60), u = randInt(5, 18), dd = randInt(5, 25)
        return numeric(`Un plongeur est à −${d} m. Il remonte de ${u} m, puis redescend de ${dd} m. À quelle altitude se trouve-t-il (en m) ?`, -d + u - dd, {
          explanation: `−${d} + ${u} − ${dd} = ${fmt(-d + u)} − ${dd} = ${fmt(-d + u - dd)}.`,
        })
      },
      () => {
        const t = randInt(8, 30), gal = randInt(15, 60), dd = randInt(20, 90)
        return numeric(`Dans une mine, l'entrée d'une galerie est à l'altitude −${gal} m, et le fond du puits se trouve ${dd} m plus bas que cette galerie. Le sommet de la tour de guet est à ${t} m. Quelle distance verticale sépare le sommet de la tour du fond du puits (en m) ?`, t + gal + dd, {
          explanation: `Fond du puits : −${gal} − ${dd} = −${gal + dd} m. Distance : ${t} − (−${gal + dd}) = ${t + gal + dd} m.`,
        })
      },
      () => {
        const sm = randInt(50, 250), av = randInt(3, 9) * 1000 + randInt(1, 9) * 100
        return numeric(`Un sous-marin navigue à ${fmt(-sm)} m pendant qu'un avion le survole à ${av} m d'altitude. Quelle distance verticale les sépare (en m) ?`, av + sm, {
          explanation: `${av} − ${par(-sm)} = ${av} + ${sm} = ${av + sm} m.`,
        })
      },
      fresh(() => {
        const st = -randInt(10, 40), a = randInt(5, 20), b = randInt(10, 35), fin = st + a - b
        return numeric(`Un spéléologue descend de ${b} m, après être remonté de ${a} m. Il se trouve maintenant à ${fmt(fin)} m. À quelle altitude était-il au départ (en m) ?`, st, {
          explanation: `On remonte les étapes : ${fmt(fin)} + ${b} − ${a} = ${fmt(st)} m.`,
        })
      }),
    ),
    // Chronologie : avant et après J.-C.
    variants(
      () => {
        const y1 = -randInt(100, 600), y2 = randInt(1000, 1500)
        return numeric(`Un empire naît en ${fmt(y1)} (c'est-à-dire ${-y1} av. J.-C.) et s'effondre en ${y2}. Combien de temps a-t-il duré (en années, sans année 0) ?`, y2 - y1 - 1, {
          explanation: `${y2} − ${par(y1)} = ${y2 - y1}, moins 1 car il n'y a pas d'année 0 : ${y2 - y1 - 1}.`,
        })
      },
      () => {
        const y1 = -randInt(500, 900), y2 = -randInt(50, 450)
        return numeric(`Une cité est fondée en ${fmt(y1)} et détruite en ${fmt(y2)} (années avant J.-C.). Combien d'années a-t-elle existé ?`, y2 - y1, {
          explanation: `${fmt(y2)} − ${par(y1)} = ${fmt(y2)} + ${-y1} = ${y2 - y1} ans (pas de passage par l'an 0 ici).`,
        })
      },
      () => {
        const born = -randInt(300, 600), age = randInt(40, 85)
        return numeric(`Un savant grec est né en ${fmt(born)} (${-born} av. J.-C.) et il est mort à ${age} ans, avant J.-C. En quelle année est-il mort ? (réponds par un nombre négatif)`, born + age, {
          explanation: `${fmt(born)} + ${age} = ${fmt(born + age)}, soit ${-(born + age)} av. J.-C.`,
        })
      },
      () => {
        const y = -randInt(50, 800), now = 2026
        return numeric(`Une pièce de monnaie date de ${fmt(y)} (${-y} av. J.-C.). Quel âge a-t-elle en ${now} (sans année 0) ?`, now - y - 1, {
          explanation: `${now} − ${par(y)} = ${now - y}, moins 1 car il n'y a pas d'année 0 : ${now - y - 1} ans.`,
        })
      },
    ),
    // Retrouver la valeur de départ
    variants(
      fresh(() => {
        const p = prenom(), g = [randInt(5, 20), -randInt(5, 25), randInt(5, 20), -randInt(5, 25)], fin = randInt(-20, 30)
        const bilan = sum(g), start = fin - bilan
        return numeric(`Dans un jeu vidéo, ${p} gagne ${g[0]} points, en perd ${-g[1]}, en regagne ${g[2]}, puis en perd ${-g[3]}. La partie se termine avec un score de ${fmt(fin)}. Quel était le score de départ ?`, start, {
          explanation: `Bilan de la partie : ${chain(g)} = ${fmt(bilan)}. Départ : ${fmt(fin)} − ${par(bilan)} = ${fmt(start)}.`,
        })
      }),
      fresh(() => {
        const p = prenom(), dep = randInt(20, 80), pay = [randInt(10, 50), randInt(10, 50)], fin = randInt(-40, 20)
        const start = fin - dep + sum(pay)
        return numeric(`${p} dépose ${dep} € sur son compte, puis paie deux achats de ${pay[0]} € et ${pay[1]} €. Son solde est alors de ${fmt(fin)} €. Quel était le solde de départ (en €) ?`, start, {
          explanation: `Bilan des opérations : +${dep} − ${pay[0]} − ${pay[1]} = ${fmt(dep - sum(pay))} €. Départ : ${fmt(fin)} − ${par(dep - sum(pay))} = ${fmt(start)} €.`,
        })
      }),
      fresh(() => {
        const m = [randInt(3, 8), -randInt(2, 9), -randInt(1, 6)], fin = randInt(-3, 6), start = fin - sum(m)
        return numeric(`Un ascenseur monte de ${m[0]} étages, descend de ${-m[1]} étages, puis de ${-m[2]} autre${s(-m[2])}. Il s'arrête au niveau ${fmt(fin)}. De quel niveau était-il parti ?`, start, {
          explanation: `Bilan : ${chain(m)} = ${fmt(sum(m))}. Départ : ${fmt(fin)} − ${par(sum(m))} = ${fmt(start)}.`,
        })
      }),
    ),
    // Fuseaux horaires
    variants(
      () => {
        let A = pick(VILLES), B = pick(VILLES), h = randInt(0, 23)
        while (A === B || h + B[1] - A[1] < 0 || h + B[1] - A[1] > 23) { A = pick(VILLES); B = pick(VILLES); h = randInt(0, 23) }
        const d = B[1] - A[1], r = h + d
        return numeric(`En hiver, ${A[0]} est à l'heure ${utc(A[1])} et ${B[0]} à l'heure ${utc(B[1])}. Quand il est ${h} h à ${A[0]}, quelle heure est-il à ${B[0]} (le même jour) ?`, r, {
          explanation: `Décalage : ${fmt(B[1])} − ${par(A[1])} = ${fmt(d)} h. Donc ${h} ${sgn(d)} = ${r} h.`, inputHint: 'Heure (nombre)',
        })
      },
      () => {
        let A = pick(VILLES), B = pick(VILLES)
        while (A === B) { A = pick(VILLES); B = pick(VILLES) }
        return numeric(`En hiver, ${A[0]} est à l'heure ${utc(A[1])} et ${B[0]} à l'heure ${utc(B[1])}. Quel est le décalage horaire de ${B[0]} par rapport à ${A[0]} (en heures, négatif si ${B[0]} est en retard) ?`, B[1] - A[1], {
          explanation: `${fmt(B[1])} − ${par(A[1])} = ${fmt(B[1] - A[1])} h.`, inputHint: 'Décalage (nombre)',
        })
      },
      () => {
        let A = pick(VILLES), B = pick(VILLES), h = randInt(0, 23), dur = randInt(2, 12)
        while (A === B || h + dur + B[1] - A[1] < 0 || h + dur + B[1] - A[1] > 23) { A = pick(VILLES); B = pick(VILLES); h = randInt(0, 23); dur = randInt(2, 12) }
        const r = h + dur + B[1] - A[1]
        return numeric(`Un avion décolle de ${A[0]} (${utc(A[1])}) à ${h} h, heure locale, pour un vol de ${dur} h vers ${B[0]} (${utc(B[1])}). À quelle heure locale atterrit-il (le même jour) ?`, r, {
          explanation: `Heure de ${A[0]} à l'arrivée : ${h} + ${dur} = ${h + dur} h. Décalage : ${fmt(B[1] - A[1])} h, donc ${h + dur} ${sgn(B[1] - A[1])} = ${r} h à ${B[0]}.`, inputHint: 'Heure (nombre)',
        })
      },
    ),
  ],
]

// ═══ Fractions ══════════════════════════════════════════════════════════
/** Numérateur n (1 ≤ n < d) premier avec d. */
function coprimeNum(d: number, min = 1): number {
  let n = randInt(min, d - 1)
  while (gcd(n, d) !== 1) n = randInt(min, d - 1)
  return n
}
/** Fraction irréductible n/m (n < m), avec m ≤ maxDen. */
function properFrac(maxNum = 9, maxDen = 11): [number, number] {
  let n = randInt(1, maxNum), m = randInt(2, maxDen)
  while (gcd(n, m) !== 1 || n >= m) { n = randInt(1, maxNum); m = randInt(2, maxDen) }
  return [n, m]
}
const PART_NAMES: Record<number, string> = { 2: 'demis', 3: 'tiers', 4: 'quarts', 5: 'cinquièmes', 6: 'sixièmes', 8: 'huitièmes', 10: 'dixièmes' }

const fracs: Tiers = [
  [
    // Simplifier une fraction
    variants(
      () => {
        const [n, m] = properFrac(), k = randInt(2, 9)
        return fraction(`Simplifie au maximum : ${F(n * k, m * k)}`, n, m, { irreducible: true, explanation: `On divise numérateur et dénominateur par ${k} : ${n}/${m}.` })
      },
      () => {
        const [n, m] = properFrac(), k = randInt(2, 9)
        return fraction(`Écris la fraction irréductible égale à ${F(n * k, m * k)}.`, n, m, {
          irreducible: true, explanation: `${n * k} = ${k} × ${n} et ${m * k} = ${k} × ${m} : on simplifie par ${k}, d'où ${n}/${m}.`,
        })
      },
      () => {
        const [n, m] = properFrac(5, 8), k = randInt(2, 6)
        const [who, what] = pick([['élèves de la classe', 'sont demi-pensionnaires'], ['chevaux de l’écurie', 'sont bais'], ['soldats du fort', 'sont des archers'], ['pages du grimoire', 'sont enluminées']])
        return fraction(`Sur ${m * k} ${who}, ${n * k} ${what}. Quelle fraction cela représente-t-il ? Donne-la sous forme irréductible.`, n, m, {
          irreducible: true, explanation: `${F(n * k, m * k)} : on simplifie par ${k}, ce qui donne ${n}/${m}.`,
        })
      },
      () => {
        const [n, m] = properFrac(), k = pick([2, 3, 5]), j = randInt(2, 4)
        return fraction(`Simplifie au maximum : ${F(n * k * j, m * k * j)} (on peut simplifier en plusieurs étapes).`, n, m, {
          irreducible: true, explanation: `On peut simplifier par ${k}, puis par ${j} (ou directement par ${k * j}) : ${n}/${m}.`,
        })
      },
    ),
    // Compléter une égalité de fractions
    variants(
      fresh(() => {
        const n = randInt(1, 8), m = randInt(n + 1, 10), k = randInt(2, 6)
        return numeric(`Complète l'égalité : ${F(n, m)} = ${F('?', m * k)}. Quel est le numérateur manquant ?`, n * k, {
          explanation: `${m} × ${k} = ${m * k}, donc on multiplie aussi ${n} par ${k} : ${n * k}.`,
        })
      }),
      fresh(() => {
        const [n, m] = properFrac(8, 10), k = randInt(2, 6)
        return numeric(`Complète l'égalité : ${F(n, m)} = ${F(n * k, '?')}. Quel est le dénominateur manquant ?`, m * k, {
          explanation: `${n} × ${k} = ${n * k}, donc on multiplie aussi ${m} par ${k} : ${m * k}.`,
        })
      }),
      fresh(() => {
        const [n, m] = properFrac(8, 10), k = randInt(2, 6)
        return numeric(`Complète l'égalité : ${F(n * k, m * k)} = ${F('?', m)}. Quel est le numérateur manquant ?`, n, {
          explanation: `${m * k} ÷ ${k} = ${m}, donc on divise aussi ${n * k} par ${k} : ${n}.`,
        })
      }),
      fresh(() => {
        const n = randInt(2, 6), d = randInt(2, 6)
        return numeric(`Complète l'égalité : ${n} = ${F('?', d)}. Quel est le numérateur manquant ?`, n * d, {
          explanation: `${n} unités, c'est ${n} × ${d} = ${n * d} parts de ${F(1, d)} : ${n} = ${F(n * d, d)}.`,
        })
      }),
    ),
    // Prendre une fraction unitaire d'une quantité
    variants(
      () => {
        const d = pick([2, 3, 4, 5, 10]), q = d * randInt(2, 15)
        return numeric(`Combien vaut ${F(1, d)} de ${q} ?`, q / d, { explanation: `Prendre ${F(1, d)}, c'est diviser par ${d} : ${q} ÷ ${d} = ${q / d}.` })
      },
      () => {
        const [d, w] = pick<[number, string]>([[2, 'la moitié'], [3, 'le tiers'], [4, 'le quart'], [10, 'le dixième'], [5, 'le cinquième']])
        const q = d * randInt(3, 20)
        return numeric(`Calcule ${w} de ${q}.`, q / d, { explanation: `${cap(w)}, c'est ${F(1, d)} : ${q} ÷ ${d} = ${q / d}.` })
      },
      () => {
        const d = pick([3, 4, 5, 6]), q = d * randInt(3, 12)
        const [who, what] = pick([['soldats', 'montent la garde cette nuit'], ['moutons du troupeau', 'sont noirs'], ['élèves', 'mangent à la cantine le mercredi'], ['tonneaux', 'contiennent du cidre']])
        return numeric(`Sur ${q} ${who}, ${F(1, d)} ${what}. Combien cela fait-il ?`, q / d, { explanation: `${F(1, d)} de ${q} = ${q} ÷ ${d} = ${q / d}.` })
      },
      () => {
        const d = pick([2, 3, 4, 5, 6]), q = d * randInt(4, 25)
        const [obj, u] = pick([['Un ruban', 'cm'], ['Une corde', 'm'], ['Une planche', 'cm'], ['Un chemin', 'km']])
        return numeric(`${obj} mesure ${q} ${u}. Combien mesure ${F(1, d)} de sa longueur (en ${u}) ?`, q / d, { explanation: `${q} ÷ ${d} = ${q / d} ${u}.` })
      },
    ),
    // Fractions et nombres décimaux
    variants(
      () => {
        const [n, d] = pick([[1, 2], [1, 4], [3, 4], [1, 5], [2, 5], [3, 5], [4, 5], [5, 4], [3, 2], [7, 4], [7, 2], [6, 5], [1, 20]])
        return decimalOnly(numeric(`Écris ${F(n, d)} sous la forme d'un nombre décimal.`, n / d, { explanation: `${n} ÷ ${d} = ${fmt(n / d)}.` }))
      },
      () => {
        const [n, d] = pick([[1, 2], [1, 4], [3, 4], [1, 5], [2, 5], [3, 5], [4, 5], [3, 2], [5, 4], [7, 4]])
        return fraction(`Écris ${fmt(n / d)} sous la forme d'une fraction irréductible.`, n, d, {
          irreducible: true, explanation: `${fmt(n / d)} = ${F(Math.round((n / d) * 100), 100)} = ${F(n, d)} après simplification.`,
        })
      },
      () => {
        const big = Math.random() < 0.5, n = big ? randInt(1, 99) : randInt(1, 9)
        const d = big ? 100 : 10
        return decimalOnly(numeric(`Écris ${F(n, d)} sous la forme d'un nombre décimal.`, n / d, {
          explanation: `${F(n, d)} = ${n} ${big ? 'centième' : 'dixième'}${s(n)} = ${fmt(n / d)}.`,
        }))
      },
      fresh(() => {
        const [n, d] = pick([[1, 4], [3, 4], [1, 5], [2, 5], [3, 5], [4, 5], [1, 2], [3, 2], [7, 4]])
        const k = pick([1, 2, 3])
        return numeric(`Complète : ${fmt(n / d)} = ${F('?', d * k)}`, n * k, {
          explanation: `${fmt(n / d)} = ${F(n, d)} = ${F(n * k, d * k)}. Vérification : ${n * k} ÷ ${d * k} = ${fmt(n / d)}.`,
        })
      }),
    ),
    // Une fraction pour décrire un partage
    variants(
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
        const parts = pick([6, 8, 10, 12]), m = randInt(1, parts - 2), p = prenom()
        return fraction(`Un gâteau est coupé en ${parts} parts égales. ${p} et ses amis en mangent ${m}. Quelle fraction du gâteau reste-t-il ?`, parts - m, parts, {
          explanation: `Il reste ${parts} − ${m} = ${parts - m} parts sur ${parts} : ${F(parts - m, parts)}.`,
        })
      },
      () => {
        const tot = pick([9, 10, 12, 15, 16, 20]), r = randInt(2, tot - 2)
        const [what, col] = pick([['vitrail de la chapelle', 'carreaux rouges'], ['drapeau', 'bandes bleues'], ['carrelage de la cour', 'dalles noires'], ['jardin du monastère', 'parcelles de choux']])
        return fraction(`Le ${what} compte ${tot} parties égales, dont ${r} ${col}. Quelle fraction du ${what.split(' ')[0]} représentent les ${col} ?`, r, tot, {
          explanation: `${r} parties sur ${tot} : ${F(r, tot)}.`,
        })
      },
      fresh(() => {
        const d = pick([2, 3, 4]), k = pick([2, 3]), D = d * k, n = coprimeNum(d)
        return numeric(`Une pizza est coupée en ${D} parts égales. Combien de parts faut-il prendre pour avoir ${F(n, d)} de la pizza ?`, n * k, {
          explanation: `${F(n, d)} = ${F(n * k, D)} : il faut ${n * k} parts.`,
        })
      }),
    ),
  ],
  [
    // Ajouter et soustraire avec le même dénominateur
    variants(
      () => {
        const den = randInt(3, 12), a = randInt(1, den - 1), b = randInt(1, den - 1)
        return fraction(`Calcule : ${F(a, den)} + ${F(b, den)}`, a + b, den, { explanation: `Même dénominateur : ${a} + ${b} = ${a + b}, donc ${a + b}/${den}.` })
      },
      () => {
        const den = randInt(4, 12), b = randInt(1, den - 2), a = randInt(b + 1, den - 1)
        return fraction(`Calcule : ${F(a, den)} − ${F(b, den)}`, a - b, den, { explanation: `Même dénominateur : ${a} − ${b} = ${a - b}, donc ${a - b}/${den}.` })
      },
      () => {
        const den = randInt(5, 12), a = randInt(2, den - 1), b = randInt(1, den - 1), c = randInt(1, a + b - 1)
        return fraction(`Calcule : ${F(a, den)} + ${F(b, den)} − ${F(c, den)}`, a + b - c, den, {
          explanation: `On garde le dénominateur ${den} : ${a} + ${b} − ${c} = ${a + b - c}, donc ${a + b - c}/${den}.`,
        })
      },
      () => {
        const den = pick([4, 5, 6, 8, 10]), a = randInt(1, den - 2), b = randInt(1, den - 1 - a), p = prenom()
        const [obj, m1, m2] = pick([['d’une bouteille de jus', 'le matin', 'le soir'], ['d’un livre', 'samedi', 'dimanche'], ['d’un puzzle', 'lundi', 'mardi'], ['du rempart à peindre', 'la première semaine', 'la deuxième']])
        return fraction(`${p} utilise ${F(a, den)} ${obj} ${m1} et ${F(b, den)} ${m2}. Quelle fraction a été utilisée en tout ?`, a + b, den, {
          explanation: `${F(a, den)} + ${F(b, den)} = ${F(a + b, den)}.`,
        })
      },
    ),
    // Prendre une fraction d'une quantité
    variants(
      () => {
        const den = pick([2, 3, 4, 5]), num = randInt(1, den - 1), q = den * randInt(2, 12)
        return numeric(`Calcule ${F(num, den)} de ${q}.`, (num * q) / den, {
          explanation: `${q} ÷ ${den} = ${q / den}, puis × ${num} = ${(num * q) / den}.`,
        })
      },
      () => {
        const den = pick([3, 4, 5, 6]), num = coprimeNum(den, 2), q = den * randInt(3, 15)
        return numeric(`Un trésor contient ${q} pièces d'or. Le roi en garde les ${F(num, den)}. Combien de pièces garde-t-il ?`, (num * q) / den, {
          explanation: `${q} ÷ ${den} = ${q / den}, puis × ${num} = ${(num * q) / den}.`,
        })
      },
      () => {
        const [num, den] = pick([[1, 2], [1, 4], [3, 4], [1, 3], [2, 3], [1, 6], [5, 6], [1, 5], [2, 5], [3, 10]])
        return numeric(`Combien de minutes y a-t-il dans ${F(num, den)} d'heure ?`, (60 * num) / den, {
          explanation: `60 ÷ ${den} = ${60 / den}, puis × ${num} = ${(60 * num) / den} minutes.`,
        })
      },
      () => {
        const den = pick([3, 4, 5]), num = coprimeNum(den, 2), q = den * randInt(4, 8)
        const [who, what] = pick([['élèves de la classe', 'viennent à vélo'], ['moines du monastère', 'travaillent au jardin'], ['joueurs du club', 'viennent à l’entraînement du samedi']])
        return numeric(`Les ${F(num, den)} des ${q} ${who} ${what}. Combien sont-ils ?`, (num * q) / den, {
          explanation: `${q} ÷ ${den} × ${num} = ${q / den} × ${num} = ${(num * q) / den}.`,
        })
      },
    ),
    // Égalités de fractions et unités
    variants(
      fresh(() => {
        const [n, m] = properFrac(8, 12), k = randInt(2, 7)
        return numeric(`Complète l'égalité : ${F(n * k, '?')} = ${F(n, m)}. Quel est le dénominateur manquant ?`, m * k, {
          explanation: `${n} × ${k} = ${n * k}, donc le dénominateur est aussi multiplié par ${k} : ${m} × ${k} = ${m * k}.`,
        })
      }),
      fresh(() => {
        const d = pick([2, 3, 4, 5, 10]), n = randInt(2, 9)
        return numeric(`Combien de ${PART_NAMES[d]} faut-il pour faire ${n} unités ?`, n * d, {
          explanation: `Une unité, c'est ${d} ${PART_NAMES[d]}, donc ${n} unités = ${n * d} ${PART_NAMES[d]} : ${n} = ${F(n * d, d)}.`,
        })
      }),
      fresh(() => {
        const [a, b] = pick([[1, 2], [1, 3], [2, 3], [1, 4], [3, 4], [2, 5], [3, 5]]), k = pick([2, 3, 4])
        const D = b * k
        return numeric(`Combien de ${PART_NAMES[D] ?? `fractions ${F(1, D)}`} y a-t-il dans ${F(a, b)} ?`, a * k, {
          explanation: `${F(a, b)} = ${F(a * k, D)} : il y en a ${a * k}.`,
        })
      }),
      fresh(() => {
        const d = pick([2, 3, 4, 5, 6, 8]), q = randInt(2, 6), r = randInt(1, d - 1)
        return numeric(`Complète : ${F(q * d + r, d)} = ${q} + ${F('?', d)}`, r, {
          explanation: `${q} = ${F(q * d, d)}, et ${q * d + r} − ${q * d} = ${r} : ${F(q * d + r, d)} = ${q} + ${F(r, d)}.`,
        })
      }),
    ),
    // Ce qui reste : compléter à l'unité
    variants(
      () => {
        const d = randInt(3, 12), a = randInt(1, d - 1), p = prenom()
        return fraction(`${p} a déjà lu ${F(a, d)} de son livre. Quelle fraction du livre reste-t-il à lire ?`, d - a, d, {
          explanation: `Le livre entier vaut ${F(d, d)} : ${F(d, d)} − ${F(a, d)} = ${F(d - a, d)}.`,
        })
      },
      () => {
        const d = randInt(3, 12), a = randInt(1, d - 1)
        return fraction(`Les maçons ont construit ${F(a, d)} du rempart. Quelle fraction du rempart reste-t-il à construire ?`, d - a, d, {
          explanation: `Le rempart entier vaut ${F(d, d)} : ${F(d, d)} − ${F(a, d)} = ${F(d - a, d)}.`,
        })
      },
      () => {
        const d = randInt(3, 12), a = randInt(1, d - 1)
        return fraction(`Le réservoir est rempli aux ${F(a, d)}. Quelle fraction du réservoir est encore vide ?`, d - a, d, {
          explanation: `Le réservoir plein vaut ${F(d, d)} : ${F(d, d)} − ${F(a, d)} = ${F(d - a, d)}.`,
        })
      },
      () => {
        const d = pick([5, 6, 8, 10, 12]), a = randInt(1, d - 2), b = randInt(1, d - 1 - a)
        return fraction(`Dans une classe, ${F(a, d)} des élèves viennent à pied et ${F(b, d)} à vélo ; les autres viennent en bus. Quelle fraction des élèves vient en bus ?`, d - a - b, d, {
          explanation: `${F(d, d)} − ${F(a, d)} − ${F(b, d)} = ${F(d - a - b, d)}.`,
        })
      },
    ),
  ],
  [
    // Réduire au même dénominateur (un dénominateur multiple de l'autre)
    variants(
      () => {
        const den = randInt(2, 6), k = randInt(2, 4), a = coprimeNum(den), b = coprimeNum(den * k)
        return fraction(`Calcule : ${F(a, den)} + ${F(b, den * k)}`, a * k + b, den * k, {
          explanation: `${F(a, den)} = ${F(a * k, den * k)}, puis ${a * k} + ${b} = ${a * k + b} : ${a * k + b}/${den * k}.`,
        })
      },
      () => {
        const den = randInt(2, 6), k = randInt(2, 4), b = coprimeNum(den)
        let a = b * k + randInt(1, den * k)
        while (a % (den * k) === 0) a++
        return fraction(`Calcule : ${F(a, den * k)} − ${F(b, den)}`, a - b * k, den * k, {
          explanation: `${F(b, den)} = ${F(b * k, den * k)}, puis ${a} − ${b * k} = ${a - b * k} : ${a - b * k}/${den * k}.`,
        })
      },
      () => {
        const den = randInt(2, 6), k = randInt(2, 4), a = coprimeNum(den), b = coprimeNum(den * k)
        return fraction(`Calcule : ${F(b, den * k)} + ${F(a, den)}`, a * k + b, den * k, {
          explanation: `${F(a, den)} = ${F(a * k, den * k)}, puis ${b} + ${a * k} = ${a * k + b} : ${a * k + b}/${den * k}.`,
        })
      },
      () => {
        const den = randInt(2, 5), k = randInt(2, 3), a = coprimeNum(den), b = coprimeNum(den * k)
        const c = randInt(1, a * k + b - 1)
        return fraction(`Calcule : ${F(a, den)} + ${F(b, den * k)} − ${F(c, den * k)}`, a * k + b - c, den * k, {
          explanation: `${F(a, den)} = ${F(a * k, den * k)}, puis ${a * k} + ${b} − ${c} = ${a * k + b - c} : ${a * k + b - c}/${den * k}.`,
        })
      },
    ),
    // Une fraction d'une quantité, en situation
    variants(
      () => {
        const den = pick([3, 4, 5, 6, 8, 10]), num = coprimeNum(den, 2), q = den * randInt(3, 15)
        return numeric(`Une armée de ${q} soldats compte ${F(num, den)} d'archers. Combien y a-t-il d'archers ?`, (num * q) / den, {
          explanation: `${q} ÷ ${den} = ${q / den}, puis × ${num} = ${(num * q) / den}.`,
        })
      },
      () => {
        const den = pick([3, 4, 5, 8, 10]), num = coprimeNum(den, 2), q = den * randInt(3, 20)
        return numeric(`Un trajet mesure ${q} km. Une caravane en a déjà parcouru les ${F(num, den)}. Combien de kilomètres a-t-elle parcourus ?`, (num * q) / den, {
          explanation: `${q} ÷ ${den} × ${num} = ${q / den} × ${num} = ${(num * q) / den} km.`,
        })
      },
      () => {
        const den = pick([3, 4, 5, 6]), num = coprimeNum(den, 2), q = den * randInt(4, 20), p = prenom()
        return numeric(`${p} a ${q} € d'économies et en dépense les ${F(num, den)} pour un vélo. Combien coûte le vélo (en €) ?`, (num * q) / den, {
          explanation: `${q} ÷ ${den} = ${q / den}, puis × ${num} = ${(num * q) / den} €.`,
        })
      },
      () => {
        const den = pick([4, 5, 8, 10]), num = coprimeNum(den, 2), q = den * randInt(5, 25)
        return numeric(`Un tonneau de ${q} litres est rempli aux ${F(num, den)}. Combien de litres contient-il ?`, (num * q) / den, {
          explanation: `${q} ÷ ${den} × ${num} = ${q / den} × ${num} = ${(num * q) / den} L.`,
        })
      },
    ),
    // Comparer des fractions
    variants(
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
        const den = pick([6, 8, 9, 10, 12, 15]), k = pick([2, 3, 4, 5].filter((v) => den % v === 0 && den / v >= 2)), small = den / k
        let a = randInt(1, den - 1), b = randInt(1, small - 1)
        while (a === b * k) { a = randInt(1, den - 1); b = randInt(1, small - 1) }
        const lo = a < b * k
        return fraction(`Quelle est la plus petite des fractions ${F(b, small)} et ${F(a, den)} ? Écris-la.`, lo ? a : b, lo ? den : small, {
          explanation: `${F(b, small)} = ${F(b * k, den)} ; on compare ${b * k} et ${a} : la plus petite est ${lo ? F(a, den) : F(b, small)}.`,
        })
      },
      fresh(() => {
        let fr: [number, number][] = []
        while (new Set(fr.map(([n, d]) => n / d)).size !== 5 || fr.every(([n, d]) => n <= d) || fr.some(([n, d]) => n % d === 0)) fr = Array.from({ length: 5 }, () => [randInt(1, 12), randInt(2, 9)] as [number, number])
        const n = fr.filter(([a, b]) => a > b).length
        return numeric(`Parmi les fractions ${fr.map(([a, b]) => F(a, b)).join(' ; ')}, combien sont strictement plus grandes que 1 ?`, n, {
          explanation: `Une fraction est plus grande que 1 quand son numérateur dépasse son dénominateur : ${fr.filter(([a, b]) => a > b).map(([a, b]) => `${a}/${b}`).join(' ; ') || 'aucune'}. Il y en a ${n}.`,
        })
      }),
    ),
    // Fractions d'heure, de journée, d'année, de semaine
    variants(
      () => {
        const m = pick([5, 10, 12, 15, 20, 25, 30, 35, 40, 45, 50])
        return fraction(`Quelle fraction d'heure représentent ${m} minutes ? Donne-la sous forme irréductible.`, m, 60, {
          irreducible: true, explanation: `Une heure = 60 min : ${F(m, 60)} = ${F(m / gcd(m, 60), 60 / gcd(m, 60))}.`,
        })
      },
      () => {
        const h = pick([2, 3, 4, 6, 8, 9, 10, 15, 16, 18, 20])
        return fraction(`Quelle fraction d'une journée représentent ${h} heures ? Donne-la sous forme irréductible.`, h, 24, {
          irreducible: true, explanation: `Une journée = 24 h : ${F(h, 24)} = ${F(h / gcd(h, 24), 24 / gcd(h, 24))}.`,
        })
      },
      () => {
        const mo = pick([2, 3, 4, 6, 8, 9, 10])
        return fraction(`Quelle fraction d'une année représentent ${mo} mois ? Donne-la sous forme irréductible.`, mo, 12, {
          irreducible: true, explanation: `Une année = 12 mois : ${F(mo, 12)} = ${F(mo / gcd(mo, 12), 12 / gcd(mo, 12))}.`,
        })
      },
      () => {
        const sec = pick([10, 12, 15, 20, 24, 30, 36, 40, 45, 48, 50])
        return fraction(`Quelle fraction de minute représentent ${sec} secondes ? Donne-la sous forme irréductible.`, sec, 60, {
          irreducible: true, explanation: `Une minute = 60 s : ${F(sec, 60)} = ${F(sec / gcd(sec, 60), 60 / gcd(sec, 60))}.`,
        })
      },
    ),
  ],
  [
    // Somme ou différence, résultat irréductible
    variants(
      () => {
        const den = randInt(2, 5), k = randInt(2, 3), b = randInt(1, den * k - 1)
        let a = randInt(Math.ceil((b + 1) / k), den * 2)
        if (a % den === 0) a += 1
        return fraction(`Calcule et donne le résultat sous forme irréductible : ${F(a, den)} − ${F(b, den * k)}`, a * k - b, den * k, {
          irreducible: true, explanation: `${a * k}/${den * k} − ${b}/${den * k} = ${a * k - b}/${den * k}, puis on simplifie si possible.`,
        })
      },
      () => {
        const den = randInt(2, 5), k = randInt(2, 3), b = coprimeNum(den * k)
        let a = randInt(1, den * 2)
        if (a % den === 0) a += 1
        return fraction(`Calcule et donne le résultat sous forme irréductible : ${F(a, den)} + ${F(b, den * k)}`, a * k + b, den * k, {
          irreducible: true, explanation: `${a * k}/${den * k} + ${b}/${den * k} = ${a * k + b}/${den * k}, puis on simplifie si possible.`,
        })
      },
      () => {
        const ch = pick([[2, 4, 8], [3, 6, 12], [2, 6, 12], [2, 4, 12], [5, 10, 20], [2, 10, 20], [3, 9, 18]])
        const nums = ch.map((d) => coprimeNum(d))
        const L = ch[2]
        const tot = sum(nums.map((n, i) => (n * L) / ch[i]))
        return fraction(`Calcule et donne le résultat sous forme irréductible : ${nums.map((n, i) => F(n, ch[i])).join(' + ')}`, tot, L, {
          irreducible: true, explanation: `Tout au dénominateur ${L} : ${nums.map((n, i) => `${(n * L) / ch[i]}/${L}`).join(' + ')} = ${tot}/${L}, puis on simplifie si possible.`,
        })
      },
    ),
    // Un entier et une fraction
    variants(
      () => {
        const n = randInt(2, 4), den = randInt(2, 9), a = coprimeNum(den)
        return fraction(`Calcule : ${n} − ${F(a, den)}`, n * den - a, den, { explanation: `${n} = ${n * den}/${den}, donc ${n * den}/${den} − ${a}/${den} = ${n * den - a}/${den}.` })
      },
      () => {
        const n = randInt(1, 4), den = randInt(2, 9), a = coprimeNum(den)
        return fraction(`Calcule : ${n} + ${F(a, den)}`, n * den + a, den, { explanation: `${n} = ${n * den}/${den}, donc ${n * den}/${den} + ${a}/${den} = ${n * den + a}/${den}.` })
      },
      () => {
        const n = randInt(2, 4), den = randInt(3, 9), a = randInt(1, den - 1), b = randInt(1, den - 1)
        return fraction(`Calcule : ${n} − ${F(a, den)} − ${F(b, den)}`, n * den - a - b, den, {
          explanation: `${n} = ${n * den}/${den}, puis ${n * den} − ${a} − ${b} = ${n * den - a - b} : ${n * den - a - b}/${den}.`,
        })
      },
      () => {
        const n = randInt(1, 3), den = randInt(3, 9), a = coprimeNum(den)
        return fraction(`Combien faut-il ajouter à ${F(a, den)} pour obtenir ${n} ?`, n * den - a, den, {
          explanation: `${n} − ${F(a, den)} = ${F(n * den, den)} − ${F(a, den)} = ${F(n * den - a, den)}.`,
        })
      },
    ),
    // Ranger trois fractions
    variants(
      () => {
        const [fr, sorted, D] = threeFractions()
        const mid = sorted[1]
        return fraction(`Range dans l'ordre croissant : ${fr.map(([n, d]) => F(n, d)).join(' ; ')}. Quelle fraction se trouve au milieu ?`, mid[0], mid[1], {
          explanation: `Au dénominateur ${D} : ${sorted.map(([n, d]) => `${(n * D) / d}/${D}`).join(' < ')}. Au milieu : ${mid[0]}/${mid[1]}.`,
        })
      },
      () => {
        const [fr, sorted, D] = threeFractions()
        const lo = sorted[0]
        return fraction(`Quelle est la plus petite de ces fractions : ${fr.map(([n, d]) => F(n, d)).join(' ; ')} ?`, lo[0], lo[1], {
          explanation: `Au dénominateur ${D} : ${sorted.map(([n, d]) => `${(n * D) / d}/${D}`).join(' < ')}. La plus petite : ${lo[0]}/${lo[1]}.`,
        })
      },
      () => {
        const [fr, sorted, D] = threeFractions()
        const hi = sorted[2]
        return fraction(`Quelle est la plus grande de ces fractions : ${fr.map(([n, d]) => F(n, d)).join(' ; ')} ?`, hi[0], hi[1], {
          explanation: `Au dénominateur ${D} : ${sorted.map(([n, d]) => `${(n * D) / d}/${D}`).join(' < ')}. La plus grande : ${hi[0]}/${hi[1]}.`,
        })
      },
    ),
    // Retrouver le tout à partir d'une partie
    variants(
      fresh(() => {
        const d = pick([3, 4, 5, 6, 8, 10]), n = coprimeNum(d, 2), unit = randInt(2, 12)
        return numeric(`Les ${F(n, d)} d'un nombre valent ${n * unit}. Quel est ce nombre ?`, d * unit, {
          explanation: `${F(1, d)} du nombre vaut ${n * unit} ÷ ${n} = ${unit}, donc le nombre vaut ${unit} × ${d} = ${d * unit}.`,
        })
      }),
      fresh(() => {
        const d = pick([3, 4, 5, 6, 8]), n = coprimeNum(d), unit = randInt(2, 9)
        const who = pick(['Un randonneur', 'Une caravane de marchands', 'Une cycliste', 'Un pèlerin'])
        return numeric(`${who} a parcouru ${n * unit} km, soit ${F(n, d)} de son itinéraire. Quelle est la longueur totale de l'itinéraire (en km) ?`, d * unit, {
          explanation: `${F(1, d)} du trajet = ${n * unit} ÷ ${n} = ${unit} km ; trajet total : ${unit} × ${d} = ${d * unit} km.`,
        })
      }),
      fresh(() => {
        const d = pick([3, 4, 5, 8, 10]), n = coprimeNum(d, 2), unit = randInt(3, 15)
        return numeric(`Un tonneau rempli aux ${F(n, d)} contient ${n * unit} litres. Quelle est sa contenance totale (en litres) ?`, d * unit, {
          explanation: `${F(1, d)} du tonneau = ${n * unit} ÷ ${n} = ${unit} L ; contenance : ${unit} × ${d} = ${d * unit} L.`,
        })
      }),
      fresh(() => {
        const d = pick([3, 4, 5, 6]), n = coprimeNum(d), unit = randInt(4, 20), p = prenom()
        return numeric(`${p} a dépensé ${n * unit} €, ce qui représente ${F(n, d)} de ses économies. À combien s'élevaient ses économies (en €) ?`, d * unit, {
          explanation: `${F(1, d)} des économies = ${n * unit} ÷ ${n} = ${unit} € ; total : ${unit} × ${d} = ${d * unit} €.`,
        })
      }),
    ),
    // Ce qu'il manque pour compléter
    variants(
      () => {
        const ctx = pick([['Un tonneau', 'L', 'litres'], ['Une citerne', 'L', 'litres'], ['Le réservoir d’essence d’une moto', 'L', 'litres'], ['Un bassin', 'm³', 'mètres cubes']])
        const d = pick([3, 4, 5, 8, 10]), n = coprimeNum(d), capa = d * randInt(3, 25)
        const inside = (capa * n) / d
        return numeric(`${ctx[0]} de ${capa} ${ctx[1]} est rempli${ctx[0].startsWith('Une') ? 'e' : ''} aux ${F(n, d)}. Combien ${de(ctx[2])} faut-il ajouter pour ${ctx[0].startsWith('Une') ? 'la' : 'le'} remplir complètement ?`, capa - inside, {
          explanation: `Il contient ${capa} ÷ ${d} × ${n} = ${inside} ${ctx[1]}, il manque ${capa} − ${inside} = ${capa - inside} ${ctx[1]}.`,
        })
      },
      () => {
        const d = pick([3, 4, 5, 6, 8]), n = coprimeNum(d), q = d * randInt(4, 20)
        return numeric(`Un messager doit parcourir ${q} km. Il en a déjà fait les ${F(n, d)}. Combien de kilomètres lui reste-t-il ?`, q - (q * n) / d, {
          explanation: `Déjà parcouru : ${q} ÷ ${d} × ${n} = ${(q * n) / d} km. Reste : ${q} − ${(q * n) / d} = ${q - (q * n) / d} km.`,
        })
      },
      () => {
        const d = pick([3, 4, 5, 10]), n = coprimeNum(d), q = d * randInt(5, 30), p = prenom()
        return numeric(`${p} achète un instrument de musique à ${q} € et en paie d'abord les ${F(n, d)}. Combien reste-t-il à payer (en €) ?`, q - (q * n) / d, {
          explanation: `Déjà payé : ${q} ÷ ${d} × ${n} = ${(q * n) / d} €. Reste : ${q} − ${(q * n) / d} = ${q - (q * n) / d} €.`,
        })
      },
      () => {
        const d = pick([4, 5, 6, 8]), n = coprimeNum(d), q = d * randInt(20, 60)
        return numeric(`Pour bâtir une tour, il faut ${q} pierres. Les maçons en ont posé les ${F(n, d)}. Combien de pierres reste-t-il à poser ?`, q - (q * n) / d, {
          explanation: `Déjà posées : ${q} ÷ ${d} × ${n} = ${(q * n) / d}. Reste : ${q} − ${(q * n) / d} = ${q - (q * n) / d} pierres.`,
        })
      },
    ),
  ],
  [
    // Plusieurs parts d'un tout : combien pour le reste ?
    variants(
      () => {
        const [[a, b], [c, d]] = pick([[[1, 3], [1, 4]], [[1, 2], [1, 3]], [[1, 4], [1, 6]], [[2, 5], [1, 4]], [[1, 2], [1, 5]], [[1, 3], [1, 6]]])
        const L = (b * d) / gcd(b, d), total = L * randInt(2, 8)
        const x = (total * a) / b, y = (total * c) / d
        return numeric(`Une armée de ${total} soldats compte ${F(a, b)} d'archers et ${F(c, d)} de lanciers ; le reste sont des chevaliers. Combien y a-t-il de chevaliers ?`, total - x - y, {
          explanation: `Archers : ${total} × ${F(a, b)} = ${x} ; lanciers : ${total} × ${F(c, d)} = ${y} ; chevaliers : ${total} − ${x} − ${y} = ${total - x - y}.`,
        })
      },
      () => {
        const [[a, b], [c, d]] = pick([[[1, 2], [1, 3]], [[1, 4], [1, 3]], [[2, 5], [1, 2]], [[1, 6], [1, 2]]])
        const L = (b * d) / gcd(b, d), total = L * randInt(3, 12)
        const x = (total * a) / b, y = (total * c) / d
        return numeric(`La bibliothèque du monastère contient ${total} livres : ${F(a, b)} sont en latin, ${F(c, d)} en grec, et les autres en français. Combien de livres sont en français ?`, total - x - y, {
          explanation: `Latin : ${x} ; grec : ${y} ; français : ${total} − ${x} − ${y} = ${total - x - y}.`,
        })
      },
      () => {
        const [[a, b], [c, d]] = pick([[[1, 3], [1, 4]], [[1, 2], [1, 4]], [[1, 5], [1, 2]], [[1, 3], [2, 9]]])
        const L = (b * d) / gcd(b, d), total = L * randInt(2, 10)
        const x = (total * a) / b, y = (total * c) / d
        return numeric(`Au verger, on cueille ${total} kg de fruits : ${F(a, b)} de pommes, ${F(c, d)} de poires et le reste en prunes. Quelle masse de prunes a-t-on cueillie (en kg) ?`, total - x - y, {
          explanation: `Pommes : ${x} kg ; poires : ${y} kg ; prunes : ${total} − ${x} − ${y} = ${total - x - y} kg.`,
        })
      },
    ),
    // Plusieurs parts d'un tout : quelle fraction reste ?
    variants(
      () => {
        const [a, b] = pick([[2, 6], [3, 6], [2, 8], [4, 8], [3, 9], [2, 10], [3, 12], [4, 12], [5, 10]])
        return reste(`Un forgeron utilise ${F(1, a)} de son fer le lundi et ${F(1, b)} le mardi. Quelle fraction du stock lui reste-t-il ? (forme irréductible)`, a, b)
      },
      () => {
        const [a, b] = pick([[2, 3], [3, 4], [2, 5], [4, 6], [3, 5], [4, 5], [2, 7]])
        return reste(`Dans un sac de blé, le meunier prend ${F(1, a)} pour faire du pain et ${F(1, b)} pour les poules. Quelle fraction du sac reste-t-il ? (forme irréductible)`, a, b)
      },
      () => {
        const [a, b] = pick([[2, 3], [3, 4], [2, 6], [4, 8], [3, 6], [4, 6]])
        return reste(`${prenom()} lit ${F(1, a)} de son roman samedi et ${F(1, b)} dimanche. Quelle fraction du roman lui reste-t-il à lire ? (forme irréductible)`, a, b)
      },
      () => {
        const [a, b] = pick([[3, 4], [2, 5], [3, 5], [4, 5], [3, 8], [4, 10]])
        return reste(`Une commune consacre ${F(1, a)} de son budget aux écoles et ${F(1, b)} aux routes. Quelle fraction du budget reste-t-il pour les autres dépenses ? (forme irréductible)`, a, b)
      },
    ),
    // Une fraction de ce qui reste
    variants(
      () => {
        const p = prenom(), d1 = pick([3, 4, 5]), n1 = randInt(1, d1 - 1), d2 = pick([2, 3, 4]), total = d1 * d2 * randInt(2, 8)
        const r1 = total - (total * n1) / d1, sp2 = r1 / d2, fin = r1 - sp2
        return numeric(`${p} part au marché avec ${total} écus. Les ${F(n1, d1)} de sa bourse servent d'abord à acheter du tissu, puis ${F(1, d2)} de ce qui reste sert à acheter des épices. Combien d'écus lui reste-t-il ?`, fin, {
          explanation: `Tissu : ${total} ÷ ${d1} × ${n1} = ${(total * n1) / d1}, il reste ${r1}. Épices : ${r1} ÷ ${d2} = ${sp2}. Reste : ${r1} − ${sp2} = ${fin}.`,
        })
      },
      () => {
        const d1 = pick([3, 4]), d2 = pick([2, 3]), n = d1 * d2 * randInt(1, 4)
        const a = n / d1, r1 = n - a, b = r1 / d2
        return numeric(`Une tarte est coupée en ${n} parts. On en mange ${F(1, d1)} au déjeuner, puis ${F(1, d2)} des parts restantes au goûter. Combien de parts reste-t-il ?`, r1 - b, {
          explanation: `Déjeuner : ${n} ÷ ${d1} = ${a} parts, il en reste ${r1}. Goûter : ${r1} ÷ ${d2} = ${b}. Reste : ${r1} − ${b} = ${r1 - b} parts.`,
        })
      },
      () => {
        const d1 = pick([2, 3, 4, 5]), d2 = pick([2, 3, 4]), total = d1 * d2 * randInt(3, 10)
        const a = total / d1, r1 = total - a, b = r1 / d2
        return numeric(`Une troupe doit parcourir ${total} km. Le premier jour, elle en fait ${F(1, d1)} ; le deuxième jour, ${F(1, d2)} de la distance restante. Combien de kilomètres reste-t-il après ces deux jours ?`, r1 - b, {
          explanation: `Jour 1 : ${total} ÷ ${d1} = ${a} km, reste ${r1} km. Jour 2 : ${r1} ÷ ${d2} = ${b} km. Reste : ${r1} − ${b} = ${r1 - b} km.`,
        })
      },
    ),
    // Fractions d'une durée, d'une masse… (deux étapes)
    variants(
      () => {
        const d = pick([3, 4, 5, 6, 8]), n = coprimeNum(d), unit = randInt(2, 9)
        const who = pick(['Un randonneur', 'Une caravane de marchands', 'Une cycliste', 'Un pèlerin'])
        return numeric(`${who} a parcouru ${n * unit} km, ce qui représente ${F(n, d)} de son itinéraire. Combien de kilomètres reste-t-il à parcourir ?`, (d - n) * unit, {
          explanation: `${F(1, d)} du trajet = ${n * unit} ÷ ${n} = ${unit} km ; trajet total : ${d * unit} km ; reste ${d * unit} − ${n * unit} = ${(d - n) * unit} km.`,
        })
      },
      () => {
        const d = pick([3, 4, 5, 6]), n = coprimeNum(d), unit = randInt(3, 12)
        return numeric(`Le chantier de la cathédrale a déjà duré ${n * unit} ans, soit ${F(n, d)} de la durée prévue. Combien d'années de travaux reste-t-il ?`, (d - n) * unit, {
          explanation: `${F(1, d)} de la durée = ${n * unit} ÷ ${n} = ${unit} ans ; durée totale : ${d * unit} ans ; reste ${(d - n) * unit} ans.`,
        })
      },
      () => {
        const d = pick([4, 5, 8, 10]), n = coprimeNum(d), unit = randInt(2, 10)
        return numeric(`Le cuisinier a utilisé ${n * unit} kg de farine, soit ${F(n, d)} de sa réserve. Quelle masse de farine lui reste-t-il (en kg) ?`, (d - n) * unit, {
          explanation: `${F(1, d)} de la réserve = ${n * unit} ÷ ${n} = ${unit} kg ; réserve : ${d * unit} kg ; reste ${(d - n) * unit} kg.`,
        })
      },
    ),
    // Additionner des fractions en situation
    variants(
      () => {
        const [d1, d2] = pick([[4, 8], [3, 6], [2, 8], [4, 12], [3, 12], [5, 10], [2, 6], [2, 10]])
        const a = randInt(1, d1 - 1), k = d2 / d1, b = coprimeNum(d2)
        const [ing1, ing2] = pick([['de lait', 'de crème'], ["d'eau", 'de jus de pomme'], ['de bouillon', 'de lait']])
        return fraction(`Pour une recette, ${prenom()} verse ${F(a, d1)} de litre ${ing1} et ${F(b, d2)} de litre ${ing2} dans une casserole. Quelle quantité de liquide y a-t-il au total ? (en litre, fraction irréductible)`, a * k + b, d2, {
          irreducible: true, explanation: `${F(a, d1)} = ${F(a * k, d2)}, donc ${F(a * k, d2)} + ${F(b, d2)} = ${F(a * k + b, d2)}, puis on simplifie.`,
        })
      },
      () => {
        let trap: number[] = [], potion: number[] = [], dragon: number[] = [], r = 0
        while (r <= 0) {
          trap = pick([[1, 6], [1, 4], [1, 3]]); potion = pick([[1, 12], [1, 6]]); dragon = pick([[1, 4], [1, 3], [1, 2], [1, 6], [5, 12]])
          r = 12 - (trap[0] * 12) / trap[1] + (potion[0] * 12) / potion[1] - (dragon[0] * 12) / dragon[1]
        }
        const t12 = (f: number[]) => (f[0] * 12) / f[1]
        return fraction(`Dans un jeu vidéo, la barre de vie de ton héros est pleine. Un piège lui retire ${F(trap[0], trap[1])} de sa barre, une potion lui en rend ${F(potion[0], potion[1])}, puis un dragon lui retire ${F(dragon[0], dragon[1])}. Quelle fraction de la barre de vie lui reste-t-il ? (forme irréductible)`, r, 12, {
          irreducible: true, explanation: `En douzièmes : 12/12 − ${t12(trap)}/12 + ${t12(potion)}/12 − ${t12(dragon)}/12 = ${r}/12, puis on simplifie.`,
        })
      },
      () => {
        const [d1, d2] = pick([[3, 6], [4, 8], [2, 6], [4, 12], [3, 9]])
        const a = 1, k = d2 / d1
        let b = coprimeNum(d2)
        while (b > d2 - k) b = coprimeNum(d2)
        const [p1, p2] = [prenom(), prenom()]
        return fraction(`${p1} mange ${F(a, d1)} d'une pizza et ${p2 === p1 ? 'son frère' : p2} en mange ${F(b, d2)}. Quelle fraction de la pizza a été mangée en tout ? (forme irréductible)`, a * k + b, d2, {
          irreducible: true, explanation: `${F(a, d1)} = ${F(a * k, d2)}, donc ${F(a * k, d2)} + ${F(b, d2)} = ${F(a * k + b, d2)}, puis on simplifie.`,
        })
      },
    ),
  ],
]

/** Trois fractions de dénominateurs « compatibles », avec leur ordre et le dénominateur commun. */
function threeFractions(): [[number, number][], [number, number][], number] {
  const D = pick([8, 12])
  const divs = D === 8 ? [2, 4, 8] : shuffle([2, 3, 4, 6, 12]).slice(0, 3)
  let fr: [number, number][] = []
  while (new Set(fr.map(([n, d]) => (n * D) / d)).size !== 3) fr = divs.map((d) => [coprimeNum(d), d])
  const sorted = [...fr].sort((x, y) => x[0] / x[1] - y[0] / y[1])
  return [fr, sorted, D]
}

/** Il reste 1 − 1/a − 1/b (fraction irréductible). */
function reste(prompt: string, a: number, b: number) {
  const den = (a * b) / gcd(a, b)
  const num = den - den / a - den / b
  return fraction(prompt, num, den, {
    irreducible: true, explanation: `Au dénominateur ${den} : ${F(1, a)} + ${F(1, b)} = ${den / a + den / b}/${den}, il reste ${den}/${den} − ${den / a + den / b}/${den} = ${num}/${den}, puis on simplifie.`,
  })
}

// ═══ Calcul littéral ════════════════════════════════════════════════════
/** k et a, b premiers entre eux : kax + kb = k(ax + b). */
function kab(): [number, number, number] {
  let k = pick([2, 3, 4, 5, 6]), a = randInt(1, 6), b = randInt(1, 7)
  while (gcd(a, b) !== 1) { k = pick([2, 3, 4, 5, 6]); a = randInt(1, 6); b = randInt(1, 7) }
  return [k, a, b]
}

const lit: Tiers = [
  [
    // Remplacer la lettre par un nombre
    variants(
      fresh(() => {
        const a = randInt(2, 9), b = randInt(1, 12), x = randInt(1, 10)
        return numeric(`Calcule ${a}x + ${b} pour x = ${x}.`, a * x + b, { explanation: `${a}x signifie ${a} × x : ${a} × ${x} + ${b} = ${a * x} + ${b} = ${a * x + b}.` })
      }),
      fresh(() => {
        const a = randInt(2, 9), b = randInt(1, 9), x = randInt(b + 1, 12)
        return numeric(`Calcule ${a}(x − ${b}) pour x = ${x}.`, a * (x - b), { explanation: `${a} × (${x} − ${b}) = ${a} × ${x - b} = ${a * (x - b)}.` })
      }),
      fresh(() => {
        const a = randInt(2, 9), b = randInt(5, 30), x = randInt(1, 10)
        return numeric(`Calcule ${b} + ${a}y pour y = ${x}.`, b + a * x, { explanation: `${b} + ${a} × ${x} = ${b} + ${a * x} = ${b + a * x} (la multiplication d'abord).` })
      }),
      fresh(() => {
        const a = randInt(3, 9), x = randInt(2, 10), b = randInt(1, a * x - 1)
        return numeric(`Calcule ${a}t − ${b} pour t = ${x}.`, a * x - b, { explanation: `${a} × ${x} − ${b} = ${a * x} − ${b} = ${a * x - b}.` })
      }),
    ),
    // Utiliser une formule
    variants(
      () => {
        const c = randInt(2, 15)
        return numeric(`Le périmètre d'un carré de côté c est donné par la formule P = 4 × c. Calcule P pour c = ${c} cm (en cm).`, 4 * c, { explanation: `P = 4 × ${c} = ${4 * c} cm.` })
      },
      () => {
        const c = randInt(2, 15)
        return numeric(`Le périmètre d'un triangle équilatéral de côté c est P = 3 × c. Calcule P pour c = ${c} m (en m).`, 3 * c, { explanation: `P = 3 × ${c} = ${3 * c} m.` })
      },
      () => {
        const L = randInt(3, 15), l = randInt(2, L - 1)
        return numeric(`L'aire d'un rectangle est donnée par la formule A = L × l. Calcule A pour L = ${L} m et l = ${l} m (en m²).`, L * l, { explanation: `A = ${L} × ${l} = ${L * l} m².` })
      },
      () => {
        const L = randInt(3, 15), l = randInt(2, L - 1)
        return numeric(`Le périmètre d'un rectangle est donné par la formule P = 2 × L + 2 × l. Calcule P pour L = ${L} cm et l = ${l} cm (en cm).`, 2 * L + 2 * l, {
          explanation: `P = 2 × ${L} + 2 × ${l} = ${2 * L} + ${2 * l} = ${2 * L + 2 * l} cm.`,
        })
      },
      () => {
        const n = randInt(2, 12)
        return numeric(`Un forgeron fabrique des chaînes : pour n maillons, il lui faut F = 3 × n + 2 clous. Combien de clous pour ${n} maillons ?`, 3 * n + 2, {
          explanation: `F = 3 × ${n} + 2 = ${3 * n} + 2 = ${3 * n + 2} clous.`,
        })
      },
    ),
    // Réduire une somme de termes en x
    variants(
      () => {
        const n = randInt(3, 7)
        return expression(`Réduis : ${Array(n).fill('x').join(' + ')}`, poly([n, 'x']), 'developed', {
          explanation: `On ajoute ${n} fois x : c'est ${n} × x, qu'on écrit ${n}x.`,
        })
      },
      () => {
        const k = randInt(2, 9)
        return expression(`Réduis : ${k}x + x`, poly([k + 1, 'x']), 'developed', { explanation: `x, c'est 1 × x : ${k} + 1 = ${k + 1}, donc ${k + 1}x.` })
      },
      () => {
        const k = randInt(2, 9)
        return expression(`Réduis : x + ${k}x + x`, poly([k + 2, 'x']), 'developed', { explanation: `x, c'est 1 × x : 1 + ${k} + 1 = ${k + 2}, donc ${k + 2}x.` })
      },
      () => {
        const k = randInt(3, 9)
        return expression(`Réduis : ${k}x − x`, poly([k - 1, 'x']), 'developed', { explanation: `x, c'est 1 × x : ${k} − 1 = ${k - 1}, donc ${poly([k - 1, 'x'])}.` })
      },
      () => {
        const a = randInt(2, 9), b = randInt(2, 9)
        return expression(`Réduis : ${a}x + ${b}x`, poly([a + b, 'x']), 'developed', { explanation: `${a} fois x plus ${b} fois x : ${a} + ${b} = ${a + b}, donc ${a + b}x.` })
      },
    ),
    // Calculer une expression à deux lettres
    variants(
      fresh(() => {
        const p = randInt(2, 9), q = randInt(2, 9), a = randInt(1, 10), b = randInt(1, 10)
        return numeric(`Calcule ${p}a + ${q}b pour a = ${a} et b = ${b}.`, p * a + q * b, {
          explanation: `${p} × ${a} + ${q} × ${b} = ${p * a} + ${q * b} = ${p * a + q * b}.`,
        })
      }),
      fresh(() => {
        const q = randInt(2, 5), b = randInt(1, 6), p = randInt(2, 9), a = randInt(Math.ceil((q * b + 1) / p), 12)
        return numeric(`Calcule ${p}a − ${q}b pour a = ${a} et b = ${b}.`, p * a - q * b, {
          explanation: `${p} × ${a} − ${q} × ${b} = ${p * a} − ${q * b} = ${p * a - q * b}.`,
        })
      }),
      fresh(() => {
        const a = randInt(2, 9), b = randInt(2, 9), c = randInt(1, 15)
        return numeric(`Calcule a × b + ${c} pour a = ${a} et b = ${b}.`, a * b + c, {
          explanation: `${a} × ${b} + ${c} = ${a * b} + ${c} = ${a * b + c}.`,
        })
      }),
      fresh(() => {
        const k = randInt(2, 5), a = randInt(1, 9), b = randInt(1, 9)
        return numeric(`Calcule ${k}(a + b) pour a = ${a} et b = ${b}.`, k * (a + b), {
          explanation: `${k} × (${a} + ${b}) = ${k} × ${a + b} = ${k * (a + b)}.`,
        })
      }),
    ),
    // Écrire sans le signe ×
    variants(
      () => {
        const a = randInt(2, 9), b = randInt(2, 9)
        return expression(`Écris plus simplement : ${a} × x × ${b}`, poly([a * b, 'x']), 'developed', {
          explanation: `On regroupe les nombres : ${a} × ${b} = ${a * b}, d'où ${a * b}x.`,
        })
      },
      () => {
        const a = randInt(2, 9), b = randInt(2, 9)
        return expression(`Écris plus simplement : x × ${a} × ${b}`, poly([a * b, 'x']), 'developed', {
          explanation: `On regroupe les nombres et on les écrit devant la lettre : ${a} × ${b} = ${a * b}, d'où ${a * b}x.`,
        })
      },
      () => {
        const a = randInt(2, 9), b = randInt(1, 12)
        return expression(`Écris plus simplement : x × ${a} + ${b}`, poly([a, 'x'], [b, '']), 'developed', {
          explanation: `x × ${a} = ${a} × x, qu'on écrit ${a}x : d'où ${poly([a, 'x'], [b, ''])}.`,
        })
      },
      () => {
        const a = randInt(2, 9), b = randInt(2, 9), c = randInt(1, 12)
        return expression(`Écris plus simplement : ${a} × ${b} × x − ${c}`, poly([a * b, 'x'], [-c, '']), 'developed', {
          explanation: `${a} × ${b} = ${a * b}, donc ${a * b}x − ${c}.`,
        })
      },
    ),
  ],
  [
    // Réduire une somme de termes en x
    variants(
      () => {
        const a = randInt(2, 9), b = randInt(2, 9), c = randInt(1, a + b - 2)
        return expression(`Réduis : ${poly([a, 'x'], [b, 'x'], [-c, 'x'])}`, poly([a + b - c, 'x']), 'developed', {
          explanation: `${a} + ${b} − ${c} = ${a + b - c}, donc ${poly([a + b - c, 'x'])}.`,
        })
      },
      () => {
        const a = randInt(5, 12), b = randInt(1, a - 2), c = randInt(2, 9)
        return expression(`Réduis : ${poly([a, 'x'], [-b, 'x'], [c, 'x'])}`, poly([a - b + c, 'x']), 'developed', {
          explanation: `${a} − ${b} + ${c} = ${a - b + c}, donc ${poly([a - b + c, 'x'])}.`,
        })
      },
      () => {
        const a = randInt(2, 9), b = randInt(2, a)
        return expression(`Réduis : x + ${a}x − ${b}x`, poly([1 + a - b, 'x']), 'developed', {
          explanation: `x, c'est 1 × x : 1 + ${a} − ${b} = ${1 + a - b}, donc ${poly([1 + a - b, 'x'])}.`,
        })
      },
      () => {
        const a = randInt(2, 9), b = randInt(2, 9), c = randInt(2, 9)
        return expression(`Réduis : ${a}x + ${b}x + ${c}x`, poly([a + b + c, 'x']), 'developed', {
          explanation: `${a} + ${b} + ${c} = ${a + b + c}, donc ${a + b + c}x.`,
        })
      },
    ),
    // Calculer une expression avec un carré
    variants(
      fresh(() => {
        const a = randInt(2, 5), b = randInt(1, 9), x = randInt(2, 6)
        return numeric(`Calcule ${a}x² + ${b} pour x = ${x}.`, a * x * x + b, { explanation: `x² = ${x} × ${x} = ${x * x}, puis ${a} × ${x * x} + ${b} = ${a * x * x + b}.` })
      }),
      fresh(() => {
        const x = randInt(3, 9), b = randInt(1, x * x - 1)
        return numeric(`Calcule x² − ${b} pour x = ${x}.`, x * x - b, { explanation: `x² = ${x} × ${x} = ${x * x}, puis ${x * x} − ${b} = ${x * x - b}.` })
      }),
      fresh(() => {
        const a = randInt(1, 6), x = randInt(2, 7)
        return numeric(`Calcule (x + ${a})² pour x = ${x}.`, (x + a) ** 2, { explanation: `La parenthèse d'abord : ${x} + ${a} = ${x + a}, puis ${x + a}² = ${x + a} × ${x + a} = ${(x + a) ** 2}.` })
      }),
      fresh(() => {
        const x = randInt(2, 9)
        return numeric(`Calcule x² + x pour x = ${x}.`, x * x + x, { explanation: `${x} × ${x} + ${x} = ${x * x} + ${x} = ${x * x + x}.` })
      }),
    ),
    // Une formule en situation
    variants(
      () => {
        const a = randInt(2, 6), b = randInt(2, 8), n = randInt(2, 9)
        return numeric(`Le prix (en €) de la location d'un vélo pendant n heures est P = ${a}n + ${b}. Combien coûte une location de ${n} heures (en €) ?`, a * n + b, { explanation: `P = ${a} × ${n} + ${b} = ${a * n + b} €.` })
      },
      () => {
        const a = randInt(2, 3), b = randInt(3, 7), d = randInt(3, 15)
        return numeric(`Le prix (en €) d'une course de taxi de d kilomètres est P = ${a}d + ${b}. Combien coûte une course de ${d} km (en €) ?`, a * d + b, { explanation: `P = ${a} × ${d} + ${b} = ${a * d + b} €.` })
      },
      () => {
        const a = randInt(20, 40), b = randInt(10, 30), j = randInt(2, 7)
        return numeric(`Le prix (en €) d'un forfait de ski de j jours est P = ${a}j + ${b}. Combien coûte un forfait de ${j} jours (en €) ?`, a * j + b, { explanation: `P = ${a} × ${j} + ${b} = ${a * j + b} €.` })
      },
      () => {
        const a = randInt(3, 6), b = randInt(10, 30), n = randInt(4, 15)
        return numeric(`Avec la carte d'abonnement du cinéma, le prix (en €) de n séances est P = ${b} + ${a}n. Combien coûtent ${n} séances (en €) ?`, b + a * n, { explanation: `P = ${b} + ${a} × ${n} = ${b} + ${a * n} = ${b + a * n} €.` })
      },
      () => {
        const a = randInt(2, 4), t = randInt(2, 8), H = a * t + randInt(5, 20)
        return numeric(`Une bougie de ${H} cm se consume : après t heures, sa hauteur (en cm) est h = ${H} − ${a}t. Quelle est sa hauteur après ${t} heures (en cm) ?`, H - a * t, {
          explanation: `h = ${H} − ${a} × ${t} = ${H} − ${a * t} = ${H - a * t} cm.`,
        })
      },
    ),
    // Écrire un produit le plus simplement possible
    variants(
      () => {
        const a = randInt(2, 9)
        return expression(`Écris le plus simplement possible : ${pick([`${a} × x × x`, `x × ${a} × x`])}`, poly([a, 'x²']), 'developed', {
          explanation: `x × x s'écrit x², donc ${a}x².`,
        })
      },
      () => {
        const a = randInt(2, 9), b = randInt(2, 9)
        return expression(`Écris le plus simplement possible : ${a}x × ${b}`, poly([a * b, 'x']), 'developed', { explanation: `${a} × ${b} = ${a * b}, donc ${a * b}x.` })
      },
      () => {
        const a = randInt(2, 9), b = randInt(2, 9)
        return expression(`Écris le plus simplement possible : ${a}x × ${b}x`, poly([a * b, 'x²']), 'developed', {
          explanation: `${a} × ${b} = ${a * b} et x × x = x², donc ${a * b}x².`,
        })
      },
      () => {
        const a = randInt(2, 6)
        return expression(`Écris le plus simplement possible : x × ${a} × x × x`, poly([a, 'x³']), 'developed', {
          explanation: `x × x × x s'écrit x³, donc ${a}x³.`,
        })
      },
    ),
    // Traduire une phrase par une expression
    variants(
      ...(() => {
        const mk = (f: (b: number) => [string, string]) => () => {
          const b = randInt(2, 9)
          const [txt, exp] = f(b)
          return expression(`Traduis par une expression en fonction de x : « ${txt} ».`, exp, 'any', { explanation: `On traduit mot à mot : ${exp}.`, answer: exp })
        }
        return [
          mk((b) => [`le triple de x augmenté de ${b}`, poly([3, 'x'], [b, ''])]),
          mk((b) => [`le double de x diminué de ${b}`, poly([2, 'x'], [-b, ''])]),
          mk((b) => [`${b} de plus que le quadruple de x`, poly([4, 'x'], [b, ''])]),
          mk((b) => [`le carré de x augmenté de ${b}`, poly([1, 'x²'], [b, ''])]),
          mk((b) => [`le double de la somme de x et de ${b}`, `2(${xPlus(b)})`]),
          mk((b) => [`la différence entre ${b} fois x et 1`, poly([b, 'x'], [-1, ''])]),
        ]
      })(),
    ),
    // Développer k(x + b)
    variants(
      () => {
        const k = randInt(2, 9), b = randInt(1, 9)
        return expression(`Développe : ${k}(${xPlus(b)})`, poly([k, 'x'], [k * b, '']), 'developed', {
          explanation: `${k} × x + ${k} × ${b} = ${poly([k, 'x'], [k * b, ''])}.`,
        })
      },
      () => {
        const k = randInt(2, 9), b = randInt(1, 9)
        return expression(`Développe : ${k}(${xPlus(-b)})`, poly([k, 'x'], [-k * b, '']), 'developed', {
          explanation: `${k} × x − ${k} × ${b} = ${poly([k, 'x'], [-k * b, ''])}.`,
        })
      },
      () => {
        const k = randInt(2, 9), b = randInt(1, 9)
        return expression(`Développe : (${xPlus(b)}) × ${k}`, poly([k, 'x'], [k * b, '']), 'developed', {
          explanation: `x × ${k} + ${b} × ${k} = ${poly([k, 'x'], [k * b, ''])}.`,
        })
      },
      () => {
        const k = randInt(2, 9), b = randInt(1, 9)
        return expression(`Développe : ${k}(${b} + x)`, poly([k * b, ''], [k, 'x']), 'developed', {
          explanation: `${k} × ${b} + ${k} × x = ${poly([k * b, ''], [k, 'x'])}.`,
        })
      },
    ),
  ],
  [
    // Réduire : les x ensemble, les nombres ensemble
    variants(
      () => {
        const a = randInt(3, 9), b = randInt(1, 9), c = randInt(1, a - 2), d = randInt(1, 9)
        return expression(`Réduis : ${poly([a, 'x'], [b, ''], [-c, 'x'], [d, ''])}`, poly([a - c, 'x'], [b + d, '']), 'developed', {
          explanation: `On regroupe les x : ${a} − ${c} = ${a - c}, puis les nombres : ${b} + ${d} = ${b + d}.`,
        })
      },
      () => {
        const a = randInt(5, 15), b = randInt(2, 9), c = randInt(1, a - 1), d = randInt(2, 9)
        return expression(`Réduis : ${poly([a, ''], [b, 'x'], [-c, ''], [d, 'x'])}`, poly([b + d, 'x'], [a - c, '']), 'developed', {
          explanation: `Les x : ${b} + ${d} = ${b + d} ; les nombres : ${a} − ${c} = ${a - c}.`,
        })
      },
      () => {
        const a = randInt(4, 9), b = randInt(2, 12), d = randInt(2, a - 1), c = randInt(b + 1, b + 12)
        return expression(`Réduis : ${poly([a, 'x'], [-b, ''], [c, ''], [-d, 'x'])}`, poly([a - d, 'x'], [c - b, '']), 'developed', {
          explanation: `Les x : ${a} − ${d} = ${a - d} ; les nombres : −${b} + ${c} = ${c - b}.`,
        })
      },
      () => {
        const a = randInt(2, 9), b = randInt(1, 9), c = randInt(1, 9), d = randInt(1, 9)
        return expression(`Réduis : ${poly([a, 'x'], [b, ''], [c, 'x'], [d, ''], [1, 'x'])}`, poly([a + c + 1, 'x'], [b + d, '']), 'developed', {
          explanation: `Les x : ${a} + ${c} + 1 = ${a + c + 1} ; les nombres : ${b} + ${d} = ${b + d}.`,
        })
      },
    ),
    // Développer k(ax + b)
    variants(
      () => {
        const k = randInt(2, 9), a = randInt(2, 9), b = randInt(1, 12)
        return expression(`Développe : ${k}(${poly([a, 'x'], [b, ''])})`, poly([k * a, 'x'], [k * b, '']), 'developed', {
          explanation: `${k} × ${poly([a, 'x'])} + ${k} × ${b} = ${poly([k * a, 'x'], [k * b, ''])}.`,
        })
      },
      () => {
        const k = randInt(2, 9), a = randInt(2, 7), b = randInt(1, 9)
        return expression(`Développe : ${k}(${poly([a, 'x'], [-b, ''])})`, poly([k * a, 'x'], [-k * b, '']), 'developed', {
          explanation: `${k} × ${a}x − ${k} × ${b} = ${poly([k * a, 'x'], [-k * b, ''])}.`,
        })
      },
      () => {
        const k = randInt(2, 9), a = randInt(2, 7), b = randInt(1, 9)
        return expression(`Développe : ${k}(${poly([b, ''], [-a, 'x'])})`, poly([k * b, ''], [-k * a, 'x']), 'developed', {
          explanation: `${k} × ${b} − ${k} × ${a}x = ${poly([k * b, ''], [-k * a, 'x'])}.`,
        })
      },
      () => {
        const a = randInt(1, 9)
        return expression(`Développe : x(${xPlus(a)})`, poly([1, 'x²'], [a, 'x']), 'developed', {
          explanation: `x × x + x × ${a} = ${poly([1, 'x²'], [a, 'x'])}.`,
        })
      },
    ),
    // Factoriser par un facteur commun numérique
    variants(
      () => {
        const k = randInt(2, 9), b = randInt(1, 9)
        return expression(`Factorise : ${poly([k, 'x'], [k * b, ''])}`, `${k}(${xPlus(b)})`, 'factored', {
          explanation: `${k * b} = ${k} × ${b}, donc ${k} est un facteur commun : ${k}(${xPlus(b)}).`,
        })
      },
      () => {
        const k = randInt(2, 9), b = randInt(1, 9)
        return expression(`Factorise : ${poly([k, 'x'], [-k * b, ''])}`, `${k}(${xPlus(-b)})`, 'factored', {
          explanation: `${k * b} = ${k} × ${b}, donc ${k} est un facteur commun : ${k}(${xPlus(-b)}).`,
        })
      },
      () => {
        const k = randInt(2, 9), b = randInt(1, 9)
        return expression(`Factorise : ${poly([k * b, ''], [k, 'x'])}`, `${k}(${b} + x)`, 'factored', {
          explanation: `${k * b} = ${k} × ${b} et ${k}x = ${k} × x : ${k}(${b} + x).`,
        })
      },
      () => {
        const k = randInt(2, 12)
        return expression(`Factorise : ${k}x + ${k}`, `${k}(x + 1)`, 'factored', { explanation: `${k} = ${k} × 1, donc ${k}x + ${k} = ${k}(x + 1).` })
      },
    ),
    // Calculer une expression du second degré
    variants(
      fresh(() => {
        let a = randInt(2, 5), b = randInt(1, 6), x = randInt(2, 5)
        while (a * x <= b) { a = randInt(2, 5); b = randInt(1, 6); x = randInt(2, 5) }
        const c = randInt(1, 9), v = a * x * x - b * x + c
        return numeric(`Calcule ${poly([a, 'x²'], [-b, 'x'], [c, ''])} pour x = ${x}.`, v, {
          explanation: `${a} × ${x * x} − ${b} × ${x} + ${c} = ${a * x * x} − ${b * x} + ${c} = ${v}.`,
        })
      }),
      fresh(() => {
        const a = randInt(1, 6), x = randInt(2, 9)
        return numeric(`Calcule x(x + ${a}) pour x = ${x}.`, x * (x + a), { explanation: `${x} × (${x} + ${a}) = ${x} × ${x + a} = ${x * (x + a)}.` })
      }),
      fresh(() => {
        const a = randInt(1, 6), b = randInt(1, 4), x = randInt(b + 1, 8)
        return numeric(`Calcule (x + ${a})(x − ${b}) pour x = ${x}.`, (x + a) * (x - b), {
          explanation: `(${x} + ${a}) × (${x} − ${b}) = ${x + a} × ${x - b} = ${(x + a) * (x - b)}.`,
        })
      }),
      fresh(() => {
        const a = randInt(2, 5), b = randInt(1, 9), x = randInt(2, 6)
        return numeric(`Calcule ${poly([1, 'x²'], [a, 'x'], [b, ''])} pour x = ${x}.`, x * x + a * x + b, {
          explanation: `${x * x} + ${a} × ${x} + ${b} = ${x * x} + ${a * x} + ${b} = ${x * x + a * x + b}.`,
        })
      }),
    ),
    // Réduire sans mélanger x² et x
    variants(
      () => {
        const a = randInt(2, 7), c = randInt(1, 6), b = randInt(2, 9)
        let d = randInt(1, 9)
        while (d === b) d = randInt(1, 9)
        return expression(`Réduis : ${poly([a, 'x²'], [b, 'x'], [c, 'x²'], [-d, 'x'])}`, poly([a + c, 'x²'], [b - d, 'x']), 'developed', {
          explanation: `Les x² ensemble : ${a} + ${c} = ${a + c} ; les x ensemble : ${b} − ${d} = ${fmt(b - d)}. On ne mélange pas x² et x !`,
        })
      },
      () => {
        const a = randInt(2, 7), b = randInt(1, 9), c = randInt(1, 6), d = randInt(1, 9)
        return expression(`Réduis : ${poly([a, 'x²'], [b, ''], [c, 'x²'], [d, ''])}`, poly([a + c, 'x²'], [b + d, '']), 'developed', {
          explanation: `Les x² : ${a} + ${c} = ${a + c} ; les nombres : ${b} + ${d} = ${b + d}.`,
        })
      },
      () => {
        const a = randInt(2, 9), b = randInt(2, 9), c = randInt(1, b - 1)
        return expression(`Réduis : ${poly([a, 'x'], [b, 'x²'], [-c, 'x²'], [1, 'x'])}`, poly([b - c, 'x²'], [a + 1, 'x']), 'developed', {
          explanation: `Les x² : ${b} − ${c} = ${b - c} ; les x : ${a} + 1 = ${a + 1}.`,
        })
      },
      () => {
        const a = randInt(3, 9), b = randInt(2, 9), c = randInt(1, a - 1), d = randInt(1, 9), e = randInt(1, 9)
        return expression(`Réduis : ${poly([a, 'x²'], [b, 'x'], [d, ''], [-c, 'x²'], [e, 'x'])}`, poly([a - c, 'x²'], [b + e, 'x'], [d, '']), 'developed', {
          explanation: `Les x² : ${a} − ${c} = ${a - c} ; les x : ${b} + ${e} = ${b + e} ; le nombre ${d} reste seul.`,
        })
      },
    ),
  ],
  [
    // Développer puis réduire
    variants(
      () => {
        const k = randInt(2, 6), a = randInt(1, 5), b = randInt(1, 9), c = randInt(1, 9)
        return expression(`Développe et réduis : ${k}(${poly([a, 'x'], [b, ''])}) + ${poly([c, 'x'])}`, poly([k * a + c, 'x'], [k * b, '']), 'developed', {
          explanation: `${k}(${poly([a, 'x'], [b, ''])}) = ${poly([k * a, 'x'], [k * b, ''])}, puis on ajoute ${poly([c, 'x'])} : ${poly([k * a + c, 'x'], [k * b, ''])}.`,
        })
      },
      () => {
        const k = randInt(2, 5), a = randInt(1, 4), b = randInt(1, 6), m = randInt(2, 5), c = randInt(1, 4), d = randInt(1, 6)
        return expression(`Développe et réduis : ${k}(${poly([a, 'x'], [b, ''])}) + ${m}(${poly([c, 'x'], [d, ''])})`, poly([k * a + m * c, 'x'], [k * b + m * d, '']), 'developed', {
          explanation: `${poly([k * a, 'x'], [k * b, ''])} + ${poly([m * c, 'x'], [m * d, ''])} = ${poly([k * a + m * c, 'x'], [k * b + m * d, ''])}.`,
        })
      },
      () => {
        const k = randInt(2, 6), a = randInt(1, 5), b = randInt(2, 9), c = randInt(1, k * b - 1)
        return expression(`Développe et réduis : ${k}(${poly([a, 'x'], [b, ''])}) − ${c}`, poly([k * a, 'x'], [k * b - c, '']), 'developed', {
          explanation: `${k}(${poly([a, 'x'], [b, ''])}) = ${poly([k * a, 'x'], [k * b, ''])}, puis ${k * b} − ${c} = ${k * b - c} : ${poly([k * a, 'x'], [k * b - c, ''])}.`,
        })
      },
      () => {
        const k = randInt(2, 6), a = randInt(1, 5), b = randInt(1, 9), c = randInt(2, 9), d = randInt(1, 9)
        return expression(`Développe et réduis : ${poly([c, 'x'], [d, ''])} + ${k}(${poly([a, 'x'], [-b, ''])})`, poly([c + k * a, 'x'], [d - k * b, '']), 'developed', {
          explanation: `${k}(${poly([a, 'x'], [-b, ''])}) = ${poly([k * a, 'x'], [-k * b, ''])}, puis les x : ${c} + ${k * a} = ${c + k * a} et les nombres : ${d} − ${k * b} = ${fmt(d - k * b)}.`,
        })
      },
    ),
    // Factoriser (facteur commun à trouver)
    variants(
      () => {
        const [k, a, b] = kab()
        return expression(`Factorise : ${poly([k * a, 'x'], [k * b, ''])}`, `${k}(${poly([a, 'x'], [b, ''])})`, 'factored', {
          explanation: `${k} est un facteur commun : ${poly([k * a, 'x'])} = ${k} × ${poly([a, 'x'])} et ${k * b} = ${k} × ${b}.`,
        })
      },
      () => {
        const [k, a, b] = kab()
        return expression(`Factorise : ${poly([k * a, 'x'], [-k * b, ''])}`, `${k}(${poly([a, 'x'], [-b, ''])})`, 'factored', {
          explanation: `${k} est un facteur commun : ${poly([k * a, 'x'])} = ${k} × ${poly([a, 'x'])} et ${k * b} = ${k} × ${b}.`,
        })
      },
      () => {
        const [k, a, b] = kab()
        return expression(`Factorise : ${poly([k * b, ''], [k * a, 'x'])}`, `${k}(${poly([b, ''], [a, 'x'])})`, 'factored', {
          explanation: `${k} est un facteur commun : ${k * b} = ${k} × ${b} et ${poly([k * a, 'x'])} = ${k} × ${poly([a, 'x'])}.`,
        })
      },
      () => {
        const k = randInt(2, 12)
        return expression(`Factorise : ${k}x − ${k}`, `${k}(x − 1)`, 'factored', { explanation: `${k} = ${k} × 1, donc ${k}x − ${k} = ${k}(x − 1).` })
      },
      () => {
        const a = randInt(2, 4), kk = randInt(2, 6)
        return expression(`Factorise : ${kk * a}x + ${kk}`, `${kk}(${poly([a, 'x'], [1, ''])})`, 'factored', {
          explanation: `${kk * a}x = ${kk} × ${a}x et ${kk} = ${kk} × 1 : ${kk}(${poly([a, 'x'], [1, ''])}).`,
        })
      },
    ),
    // Périmètres en fonction de x
    variants(
      () => {
        const a = randInt(1, 9), k = randInt(2, 4)
        return expression(`Un triangle a pour côtés x, ${xPlus(a)} et ${k}x (en cm). Exprime son périmètre en fonction de x (forme réduite).`, poly([k + 2, 'x'], [a, '']), 'developed', {
          explanation: `P = x + x + ${a} + ${k}x = ${poly([k + 2, 'x'], [a, ''])}.`,
        })
      },
      () => {
        const a = randInt(1, 9)
        return expression(`Un pentagone a trois côtés de longueur x et deux côtés de longueur ${xPlus(a)} (en m). Exprime son périmètre en fonction de x (forme réduite).`, poly([5, 'x'], [2 * a, '']), 'developed', {
          explanation: `P = 3x + 2(${xPlus(a)}) = 3x + 2x + ${2 * a} = ${poly([5, 'x'], [2 * a, ''])}.`,
        })
      },
      () => {
        const a = randInt(1, 9)
        return expression(`Un carré a pour côté ${xPlus(a)} (en cm). Exprime son périmètre en fonction de x (forme développée et réduite).`, poly([4, 'x'], [4 * a, '']), 'developed', {
          explanation: `P = 4(${xPlus(a)}) = ${poly([4, 'x'], [4 * a, ''])}.`,
        })
      },
      () => {
        const a = randInt(1, 4)
        return expression(`Un hexagone régulier a pour côté ${xPlus(-a)} (en m, avec x > ${a}). Exprime son périmètre en fonction de x (forme développée et réduite).`, poly([6, 'x'], [-6 * a, '']), 'developed', {
          explanation: `Six côtés égaux : P = 6(${xPlus(-a)}) = ${poly([6, 'x'], [-6 * a, ''])}.`,
        })
      },
    ),
    // Formules avec des nombres décimaux
    variants(
      () => {
        const L = pick([2.5, 1.5, 3, 4]), l = pick([2, 4, 6]), h = randInt(2, 5)
        return numeric(`Le volume d'un pavé droit est V = L × l × h. Calcule V pour L = ${fmt(L)} m, l = ${l} m et h = ${h} m (en m³).`, L * l * h, {
          explanation: `V = ${fmt(L)} × ${l} × ${h} = ${fmt(L * l)} × ${h} = ${fmt(L * l * h)} m³.`,
        })
      },
      () => {
        const L = randInt(4, 15), l = pick([1.5, 2.5, 3.5, 0.5])
        return numeric(`Le périmètre d'un rectangle est P = 2 × (L + l). Calcule P pour L = ${L} cm et l = ${fmt(l)} cm (en cm).`, 2 * (L + l), {
          explanation: `P = 2 × (${L} + ${fmt(l)}) = 2 × ${fmt(L + l)} = ${fmt(2 * (L + l))} cm.`,
        })
      },
      () => {
        const v = pick([12, 15, 18, 40, 60, 80]), t = pick([0.5, 1.5, 2.5, 3])
        return numeric(`La distance parcourue à vitesse constante est d = v × t. Calcule d pour v = ${v} km/h et t = ${fmt(t)} h (en km).`, v * t, {
          explanation: `d = ${v} × ${fmt(t)} = ${fmt(v * t)} km.`,
        })
      },
      () => {
        const b = pick([3, 5, 7, 4.5, 6.5]), h = pick([2, 4, 6, 8])
        return numeric(`L'aire d'un triangle est A = b × h ÷ 2. Calcule A pour b = ${fmt(b)} cm et h = ${h} cm (en cm²).`, (b * h) / 2, {
          explanation: `A = ${fmt(b)} × ${h} ÷ 2 = ${fmt(b * h)} ÷ 2 = ${fmt((b * h) / 2)} cm².`,
        })
      },
    ),
  ],
  [
    // Exprimer une longueur ou une aire en fonction de x
    variants(
      () => {
        const b = randInt(2, 9)
        return expression(`Un enclos rectangulaire mesure x + ${b} mètres de long et x mètres de large. Exprime son périmètre en fonction de x (développé et réduit).`, poly([4, 'x'], [2 * b, '']), 'developed', {
          explanation: `P = 2 × (x + ${b} + x) = 2 × (2x + ${b}) = 4x + ${2 * b}.`,
        })
      },
      () => {
        const a = randInt(1, 9), k = randInt(2, 9)
        return expression(`Un rectangle mesure ${xPlus(a)} cm de long et ${k} cm de large. Exprime son aire en fonction de x (forme développée).`, poly([k, 'x'], [k * a, '']), 'developed', {
          explanation: `A = ${k} × (${xPlus(a)}) = ${poly([k, 'x'], [k * a, ''])}.`,
        })
      },
      () => {
        const a = randInt(1, 9)
        return expression(`Un potager carré de côté x mètres est agrandi de ${a} m dans la longueur (la largeur reste x). Exprime sa nouvelle aire en fonction de x (forme développée).`, poly([1, 'x²'], [a, 'x']), 'developed', {
          explanation: `A = x × (${xPlus(a)}) = x × x + x × ${a} = ${poly([1, 'x²'], [a, 'x'])}.`,
        })
      },
      () => {
        const a = randInt(2, 6), b = randInt(1, 5)
        return expression(`Un rectangle a une longueur de ${xPlus(a)} cm et une largeur de ${xPlus(b)} cm. Exprime son périmètre en fonction de x (forme réduite).`, poly([4, 'x'], [2 * (a + b), '']), 'developed', {
          explanation: `P = 2 × (${xPlus(a)} + ${xPlus(b)}) = 2 × (${poly([2, 'x'], [a + b, ''])}) = ${poly([4, 'x'], [2 * (a + b), ''])}.`,
        })
      },
    ),
    // Trouver la valeur de x
    variants(
      fresh(() => {
        const a = randInt(2, 9), x = randInt(2, 12), b = randInt(1, 20)
        return numeric(`Quel nombre x vérifie l'égalité ${a}x + ${b} = ${a * x + b} ?`, x, {
          explanation: `${a}x doit valoir ${a * x + b} − ${b} = ${a * x}, donc x = ${a * x} ÷ ${a} = ${x}.`,
        })
      }),
      fresh(() => {
        const a = randInt(2, 9), x = randInt(3, 12), b = randInt(1, a * x - 1)
        return numeric(`Quel nombre x vérifie l'égalité ${a}x − ${b} = ${a * x - b} ?`, x, {
          explanation: `${a}x doit valoir ${a * x - b} + ${b} = ${a * x}, donc x = ${a * x} ÷ ${a} = ${x}.`,
        })
      }),
      fresh(() => {
        const [name, k] = pick<[string, number]>([['double', 2], ['triple', 3], ['quadruple', 4], ['quintuple', 5]])
        const a = randInt(1, 9), x = randInt(1, 12)
        return numeric(`Le ${name} de la somme de x et de ${a} vaut ${k * (x + a)}. Que vaut x ?`, x, {
          explanation: `${k}(x + ${a}) = ${k * (x + a)}, donc x + ${a} = ${k * (x + a)} ÷ ${k} = ${x + a}, puis x = ${x + a} − ${a} = ${x}.`,
        })
      }),
      fresh(() => {
        const l = randInt(2, 9), x = randInt(l + 1, 20), P = 2 * (x + l)
        return numeric(`Un rectangle a pour longueur x cm et pour largeur ${l} cm. Son périmètre vaut ${P} cm, c'est-à-dire 2(x + ${l}) = ${P}. Que vaut x ?`, x, {
          explanation: `x + ${l} = ${P} ÷ 2 = ${P / 2}, donc x = ${P / 2} − ${l} = ${x}.`,
        })
      }),
    ),
    // Tester une égalité
    variants(
      () => {
        const a = randInt(2, 6), b = randInt(1, 9), c = randInt(1, a - 1), x = randInt(1, 6)
        let dd = 0
        while (dd === 0) dd = Math.random() < 0.5 ? (a - c) * x + b : (a - c) * x + b + randNonZero(-3, 3)
        const ok = a * x + b === c * x + dd
        return choice(`L'égalité ${poly([a, 'x'], [b, ''])} = ${poly([c, 'x'], [dd, ''])} est-elle vraie pour x = ${x} ?`, ok ? 'Oui' : 'Non', [ok ? 'Non' : 'Oui'],
          `À gauche : ${a} × ${x} + ${b} = ${a * x + b}. À droite : ${c} × ${x} ${sgn(dd)} = ${c * x + dd}. ${ok ? 'Égaux : elle est vraie.' : 'Différents : elle est fausse.'}`)
      },
      () => {
        const p = randInt(1, 5), q = randInt(p + 1, 6)
        const x = Math.random() < 0.5 ? pick([p, q]) : pick([1, 2, 3, 4, 5, 6].filter((v) => v !== p && v !== q))
        const ok = x === p || x === q
        return choice(`L'égalité x² + ${p * q} = ${q + p}x est-elle vraie pour x = ${x} ?`, ok ? 'Oui' : 'Non', [ok ? 'Non' : 'Oui'],
          `À gauche : ${x}² + ${p * q} = ${x * x} + ${p * q} = ${x * x + p * q}. À droite : ${q + p} × ${x} = ${(q + p) * x}. ${ok ? 'Égaux : elle est vraie.' : 'Différents : elle est fausse.'}`)
      },
      fresh(() => {
        const a = randInt(2, 6), c = randInt(1, a - 1), x = randInt(2, 9), b = randInt(1, 9), d = (a - c) * x + b
        return numeric(`En testant des valeurs, trouve le nombre entier x, compris entre 0 et 10, qui vérifie l'égalité ${poly([a, 'x'], [b, ''])} = ${poly([c, 'x'], [d, ''])}.`, x, {
          explanation: `On teste : pour x = ${x}, à gauche ${a} × ${x} + ${b} = ${a * x + b} et à droite ${c} × ${x} + ${d} = ${c * x + d}. Égaux !`,
        })
      }),
    ),
    // Programme de calcul : exprimer le résultat en fonction de x
    variants(
      () => {
        const a = randInt(1, 9), k = randInt(2, 6)
        let b = randInt(1, 12)
        while (b === k * a) b = randInt(1, 12)
        return expression(`Programme de calcul : choisis un nombre x, ajoute ${a}, multiplie le résultat par ${k}, puis soustrais ${b}. Exprime le résultat en fonction de x (forme développée et réduite).`, poly([k, 'x'], [k * a - b, '']), 'developed', {
          explanation: `${k}(${xPlus(a)}) − ${b} = ${poly([k, 'x'], [k * a, ''])} − ${b} = ${poly([k, 'x'], [k * a - b, ''])}.`,
        })
      },
      () => {
        const a = randInt(1, 9), k = randInt(2, 6), m = randInt(2, 4)
        return expression(`Programme de calcul : choisis un nombre x, multiplie-le par ${k}, ajoute ${a}, puis multiplie le résultat par ${m}. Exprime le résultat en fonction de x (forme développée).`, poly([k * m, 'x'], [a * m, '']), 'developed', {
          explanation: `${m}(${poly([k, 'x'], [a, ''])}) = ${poly([k * m, 'x'], [a * m, ''])}.`,
        })
      },
      () => {
        const a = randInt(1, 6), k = randInt(2, 5)
        return expression(`Programme de calcul : choisis un nombre x, soustrais ${a}, multiplie le résultat par ${k}, puis ajoute le nombre de départ. Exprime le résultat en fonction de x (forme développée et réduite).`, poly([k + 1, 'x'], [-k * a, '']), 'developed', {
          explanation: `${k}(${xPlus(-a)}) + x = ${poly([k, 'x'], [-k * a, ''])} + x = ${poly([k + 1, 'x'], [-k * a, ''])}.`,
        })
      },
      () => {
        const a = randInt(1, 9), k = randInt(3, 6)
        return expression(`Programme de calcul : choisis un nombre x, multiplie-le par ${k}, ajoute ${a}, puis retranche le nombre de départ. Exprime le résultat en fonction de x (forme réduite).`, poly([k - 1, 'x'], [a, '']), 'developed', {
          explanation: `${k}x + ${a} − x = ${poly([k - 1, 'x'], [a, ''])}.`,
        })
      },
    ),
  ],
]

// ═══ Proportionnalité ═══════════════════════════════════════════════════
const prop: Tiers = [
  [
    // Passer par l'unité (nombres entiers)
    variants(
      fresh(() => {
        const m = marchandise(), n = randInt(2, 6), k = randInt(n + 1, 12)
        return numeric(`${n} ${m.nom} coûtent ${n * m.prix} écus. Combien coûtent ${k} ${m.nom} (en écus) ?`, k * m.prix, {
          explanation: `Un objet coûte ${n * m.prix} ÷ ${n} = ${m.prix} écus, donc ${k} × ${m.prix} = ${k * m.prix} écus.`,
        })
      }),
      fresh(() => {
        const n = randInt(2, 5), u = randInt(4, 15), k = randInt(n + 1, 10)
        return numeric(`En ${n} heures, un artisan taille ${n * u} flèches. Combien en taille-t-il en ${k} heures, au même rythme ?`, k * u, {
          explanation: `En 1 heure : ${n * u} ÷ ${n} = ${u} flèches, donc en ${k} heures : ${k} × ${u} = ${k * u} flèches.`,
        })
      }),
      fresh(() => {
        const n = randInt(2, 6), u = randInt(5, 25), k = randInt(2, 12)
        return numeric(`${n} sacs de blé identiques pèsent ${n * u} kg. Combien pèsent ${k} de ces sacs (en kg) ?`, k * u, {
          explanation: `Un sac pèse ${n * u} ÷ ${n} = ${u} kg, donc ${k} sacs pèsent ${k} × ${u} = ${k * u} kg.`,
        })
      }),
      fresh(() => {
        const [sujet, v] = pick<[string, number]>([
          ['Un randonneur marche', pick([4, 5])], ['Une cycliste roule', pick([12, 15, 18, 20])],
          ['Un car roule', pick([60, 70, 80, 90])], ['Un cheval galope', pick([20, 25, 30])],
        ])
        const t = randInt(2, 5)
        return numeric(`${sujet} à ${v} km/h pendant ${t} h. Quelle distance est parcourue (en km) ?`, v * t, {
          explanation: `En 1 h : ${v} km, donc en ${t} h : ${v} × ${t} = ${v * t} km.`,
        })
      }),
    ),
    // Adapter une recette
    variants(
      fresh(() => {
        const [ing, unit, q] = pick<[string, string, number]>([['pâtes', 'g', pick([150, 200, 250])], ['riz', 'g', pick([120, 150, 180])], ['lait', 'cL', pick([25, 30, 40])], ['chocolat', 'g', pick([60, 80, 100])]])
        const p = pick([2, 3, 4]), k = randInt(2, 5)
        return numeric(`Pour ${p} personnes, il faut ${q} ${unit} de ${ing}. Combien en faut-il pour ${p * k} personnes (en ${unit}) ?`, q * k, {
          explanation: `${p * k} personnes, c'est ${k} fois plus que ${p} : ${q} × ${k} = ${q * k} ${unit}.`,
        })
      }),
      fresh(() => {
        const [ing, unit, q] = pick<[string, string, number]>([['farine', 'g', pick([100, 150, 200])], ['sucre', 'g', pick([40, 60, 80])], ['crème', 'cL', pick([10, 15, 20])]])
        const p = pick([2, 3]), k = pick([2, 3, 4])
        return numeric(`Pour ${p * k} personnes, une recette demande ${q * k} ${unit} de ${ing}. Combien en faut-il pour ${p} personnes (en ${unit}) ?`, q, {
          explanation: `${p} personnes, c'est ${k} fois moins que ${p * k} : ${q * k} ÷ ${k} = ${q} ${unit}.`,
        })
      }),
      fresh(() => {
        const n = pick([4, 6, 8]), e = pick([1, 2, 3]), k = randInt(2, 5)
        return numeric(`Pour ${n} crêpes, il faut ${e} œuf${s(e)}. Combien d'œufs faut-il pour ${n * k} crêpes ?`, e * k, {
          explanation: `${n * k} crêpes, c'est ${k} fois plus que ${n} : ${e} × ${k} = ${e * k} œufs.`,
        })
      }),
      fresh(() => {
        const a = pick([5, 10, 12, 15]), b = randInt(1, 3), k = randInt(2, 6)
        return numeric(`Pour peindre ${a} m² de mur, il faut ${b} L de peinture. Combien de litres faut-il pour ${a * k} m² ?`, b * k, {
          explanation: `${a * k} m², c'est ${k} fois ${a} m² : ${b} × ${k} = ${b * k} L.`,
        })
      }),
    ),
    // Compléter un tableau de proportionnalité
    variants(
      fresh(() => {
        const a = randInt(2, 9), c = randInt(2, 9)
        let b = randInt(2, 12)
        while (b === a) b = randInt(2, 12)
        return numeric(`Dans un tableau de proportionnalité, ${a} correspond à ${a * c}. À quel nombre correspond ${b} ?`, b * c, {
          explanation: `On passe de ${a} à ${a * c} en multipliant par ${c}, donc ${b} × ${c} = ${b * c}.`,
        })
      }),
      fresh(() => {
        const a = randInt(2, 9), c = randInt(2, 9)
        let b = randInt(2, 12)
        while (b === a) b = randInt(2, 12)
        return numeric(`Dans un tableau de proportionnalité, ${a} correspond à ${a * c}. Quel nombre correspond à ${b * c} ?`, b, {
          explanation: `On passe de la 2ᵉ ligne à la 1ʳᵉ en divisant par ${c} : ${b * c} ÷ ${c} = ${b}.`,
        })
      }),
      fresh(() => {
        const a = randInt(2, 9), c = randInt(2, 12)
        return numeric(`Dans un tableau de proportionnalité, ${a} correspond à ${a * c}. Quel est le coefficient de proportionnalité (le nombre par lequel on multiplie) ?`, c, {
          explanation: `${a * c} ÷ ${a} = ${c} : on multiplie par ${c}.`,
        })
      }),
      fresh(() => {
        const a = randInt(2, 6), c = randInt(2, 9)
        let b = randInt(2, 6)
        while (b === a) b = randInt(2, 6)
        return numeric(`Dans un tableau de proportionnalité, ${a} correspond à ${a * c} et ${b} correspond à ${b * c}. À quel nombre correspond ${a + b} ?`, (a + b) * c, {
          explanation: `${a + b} = ${a} + ${b}, donc il correspond à ${a * c} + ${b * c} = ${(a + b) * c} (ou ${a + b} × ${c}).`,
        })
      }),
    ),
    // Pourcentages simples : 50 %, 25 %, 10 %
    variants(
      () => {
        const base = 2 * randInt(5, 90)
        return numeric(`Calcule 50 % de ${base}.`, base / 2, { explanation: `50 %, c'est la moitié : ${base} ÷ 2 = ${base / 2}.` })
      },
      () => {
        const base = 10 * randInt(2, 40)
        return numeric(`Calcule 10 % de ${base}.`, base / 10, { explanation: `10 %, c'est le dixième : ${base} ÷ 10 = ${base / 10}.` })
      },
      () => {
        const base = 4 * randInt(3, 30)
        return numeric(`Calcule 25 % de ${base}.`, base / 4, { explanation: `25 %, c'est le quart : ${base} ÷ 4 = ${base / 4}.` })
      },
      () => {
        const [p, d, w] = pick<[number, number, string]>([[50, 2, 'la moitié'], [10, 10, 'le dixième'], [25, 4, 'le quart']])
        const base = d * randInt(3, 30)
        const [who, what] = pick([['élèves du collège', 'déjeunent à la cantine'], ['soldats de la garnison', 'sont des archers'], ['habitants du village', 'sont des paysans'], ['moutons du troupeau', 'sont tondus']])
        return numeric(`Sur ${base} ${who}, ${p} % ${what}. Combien cela fait-il ?`, base / d, { explanation: `${p} %, c'est ${w} : ${base} ÷ ${d} = ${base / d}.` })
      },
    ),
    // Utiliser une échelle simple
    variants(
      fresh(() => {
        const u = pick([2, 5, 10, 20, 50]), n = randInt(2, 12), plan = pick(['du château', 'du collège', 'du parc', 'du village', 'du stade'])
        return numeric(`Sur le plan ${plan}, 1 cm représente ${u} m. Quelle longueur réelle (en m) représentent ${n} cm ?`, n * u, {
          explanation: `${n} × ${u} = ${n * u} m.`,
        })
      }),
      fresh(() => {
        const u = pick([2, 5, 10, 20, 50]), n = randInt(2, 12)
        return numeric(`Sur un plan, 1 cm représente ${u} m. Un mur mesure ${n * u} m en réalité. Combien mesure-t-il sur le plan (en cm) ?`, n, {
          explanation: `${n * u} ÷ ${u} = ${n} cm.`,
        })
      }),
      fresh(() => {
        const u = pick([3, 5, 10, 25]), n = randInt(2, 9)
        return numeric(`Sur une carte, 1 cm représente ${u} km. Deux villes sont à ${n} cm l'une de l'autre sur la carte. Quelle est la distance réelle (en km) ?`, n * u, {
          explanation: `${n} × ${u} = ${n * u} km.`,
        })
      }),
      fresh(() => {
        const u = pick([10, 20, 50, 100]), n = randInt(2, 30)
        return numeric(`Sur la maquette d'un bateau, 1 cm représente ${u} cm du vrai bateau. Le mât mesure ${n} cm sur la maquette. Combien mesure le vrai mât (en cm) ?`, n * u, {
          explanation: `${n} × ${u} = ${n * u} cm.`,
        })
      }),
    ),
  ],
  [
    // Pourcentages courants
    variants(
      () => {
        const p = pick([20, 25, 75, 10]), base = randInt(2, 20) * 20
        return numeric(`Calcule ${p} % de ${base}.`, (p * base) / 100, { explanation: `${base} × ${p} ÷ 100 = ${fmt((p * base) / 100)}.` })
      },
      () => {
        const p = pick([20, 25, 75]), base = randInt(4, 30) * 20
        return numeric(`Un collège compte ${base} élèves ; ${p} % d'entre eux sont en 5ᵉ. Combien y a-t-il d'élèves de 5ᵉ ?`, (p * base) / 100, {
          explanation: `${p} % de ${base} = ${base} × ${p} ÷ 100 = ${(p * base) / 100}.`,
        })
      },
      () => {
        const p = pick([10, 20, 25, 30]), price = randInt(2, 30) * 10
        return numeric(`Un article à ${price} € bénéficie d'une remise de ${p} %. Quel est le montant de la remise (en €) ?`, (p * price) / 100, {
          explanation: `${p} % de ${price} = ${price} × ${p} ÷ 100 = ${fmt((p * price) / 100)} €.`,
        })
      },
      () => {
        const p = pick([20, 25, 75, 40]), base = randInt(2, 25) * 20
        return numeric(`Une armée compte ${base} soldats, dont ${p} % de cavaliers. Combien y a-t-il de cavaliers ?`, (p * base) / 100, {
          explanation: `${base} × ${p} ÷ 100 = ${(p * base) / 100} cavaliers.`,
        })
      },
    ),
    // Prix unitaires décimaux
    variants(
      fresh(() => {
        const n = randInt(2, 5), price = randInt(3, 10) * 0.5, m = randInt(n + 1, 12)
        return numeric(`${n} cahiers coûtent ${fmt(n * price)} €. Combien coûtent ${m} cahiers (en €) ?`, m * price, {
          explanation: `Prix d'un cahier : ${fmt(n * price)} ÷ ${n} = ${fmt(price)} €, donc ${m} × ${fmt(price)} = ${fmt(m * price)} €.`,
        })
      }),
      fresh(() => {
        const n = pick([10, 20, 30, 40]), u = pick([1.5, 1.6, 1.8, 1.9, 2]), m = pick([5, 15, 25, 35, 45])
        return numeric(`${n} litres d'essence coûtent ${fmt(n * u)} €. Combien coûtent ${m} litres (en €) ?`, m * u, {
          explanation: `Prix d'un litre : ${fmt(n * u)} ÷ ${n} = ${fmt(u)} €, donc ${m} × ${fmt(u)} = ${fmt(m * u)} €.`,
        })
      }),
      fresh(() => {
        const n = randInt(2, 6), u = randInt(5, 15) * 0.5, m = randInt(2, 9)
        return numeric(`${n} mètres de tissu coûtent ${fmt(n * u)} écus. Combien coûtent ${m} mètres de ce tissu (en écus) ?`, m * u, {
          explanation: `Prix d'un mètre : ${fmt(n * u)} ÷ ${n} = ${fmt(u)} écus, donc ${m} × ${fmt(u)} = ${fmt(m * u)} écus.`,
        })
      }),
      fresh(() => {
        const n = randInt(2, 5), u = randInt(3, 9) * 0.5, m = randInt(2, 8), fruit = pick(['pommes', 'cerises', 'tomates', 'poires'])
        return numeric(`${n} kg de ${fruit} coûtent ${fmt(n * u)} €. Combien coûtent ${m} kg (en €) ?`, m * u, {
          explanation: `Prix d'un kilo : ${fmt(n * u)} ÷ ${n} = ${fmt(u)} €, donc ${m} × ${fmt(u)} = ${fmt(m * u)} €.`,
        })
      }),
    ),
    // Tableau de proportionnalité, coefficient décimal
    variants(
      fresh(() => {
        const c = pick([1.5, 2.5, 0.5, 3.5]), a = 2 * randInt(1, 6)
        let b = 2 * randInt(1, 9)
        while (b === a) b = 2 * randInt(1, 9)
        return numeric(`Dans un tableau de proportionnalité, ${a} correspond à ${fmt(a * c)}. À quel nombre correspond ${b} ?`, b * c, {
          explanation: `Coefficient : ${fmt(a * c)} ÷ ${a} = ${fmt(c)}, donc ${b} × ${fmt(c)} = ${fmt(b * c)}.`,
        })
      }),
      fresh(() => {
        const c = pick([1.5, 2.5, 0.5, 1.2]), a = 2 * randInt(1, 6)
        let b = 2 * randInt(1, 9)
        while (b === a) b = 2 * randInt(1, 9)
        return numeric(`Dans un tableau de proportionnalité, ${a} correspond à ${fmt(a * c)}. Quel nombre correspond à ${fmt(b * c)} ?`, b, {
          explanation: `Coefficient : ${fmt(a * c)} ÷ ${a} = ${fmt(c)}, donc ${fmt(b * c)} ÷ ${fmt(c)} = ${b}.`,
        })
      }),
      fresh(() => {
        const c = pick([0.5, 1.5, 2.5, 0.2, 1.2]), a = 10 * randInt(1, 5)
        return numeric(`Dans un tableau de proportionnalité, ${a} correspond à ${fmt(a * c)}. Quel est le coefficient de proportionnalité ?`, c, {
          explanation: `${fmt(a * c)} ÷ ${a} = ${fmt(c)}.`,
        })
      }),
    ),
    // Vitesse, distance, durée (heures entières)
    variants(
      fresh(() => {
        const [sujet, v] = pick<[string, number]>([['Un car', pick([60, 70, 80, 90])], ['Un messager à cheval', pick([12, 15, 18, 20])], ['Un train régional', pick([80, 100, 120])], ['Une cycliste', pick([14, 16, 18])]])
        const t = randInt(2, 4)
        return numeric(`${sujet} parcourt ${v * t} km en ${t} h à vitesse constante. Quelle est sa vitesse (en km/h) ?`, v, {
          explanation: `Distance parcourue en 1 h : ${v * t} ÷ ${t} = ${v} km, soit ${v} km/h.`,
        })
      }),
      fresh(() => {
        const v = pick([4, 5, 12, 15, 20, 60, 80]), t = randInt(2, 6)
        return numeric(`Combien d'heures faut-il pour parcourir ${v * t} km à ${v} km/h ?`, t, {
          explanation: `En 1 h on parcourt ${v} km ; ${v * t} ÷ ${v} = ${t} h.`,
        })
      }),
      fresh(() => {
        const v = pick([45, 50, 70, 90, 110]), t = randInt(2, 5)
        return numeric(`Une voiture roule ${t} h à la vitesse moyenne de ${v} km/h. Quelle distance parcourt-elle (en km) ?`, v * t, {
          explanation: `d = v × t = ${v} × ${t} = ${v * t} km.`,
        })
      }),
    ),
    // Recettes : passer par l'unité
    variants(
      fresh(() => {
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
      }),
      fresh(() => {
        const n = pick([4, 6]), u = pick([2, 3, 5]), m = pick([5, 7, 9, 10, 11])
        return numeric(`Pour ${n} personnes, le cuisinier du château prépare ${n * u} pommes de terre. Combien en faut-il pour ${m} personnes ?`, m * u, {
          explanation: `Par personne : ${n * u} ÷ ${n} = ${u} ; pour ${m} personnes : ${m} × ${u} = ${m * u}.`,
        })
      }),
      fresh(() => {
        const n = pick([3, 4, 6]), u = pick([25, 40, 50, 75]), m = pick([5, 7, 10])
        return numeric(`Une boisson pour ${n} verres demande ${n * u} mL de sirop. Combien de sirop faut-il pour ${m} verres (en mL) ?`, m * u, {
          explanation: `Par verre : ${n * u} ÷ ${n} = ${u} mL ; pour ${m} verres : ${m} × ${u} = ${m * u} mL.`,
        })
      }),
    ),
    // Distances sur une carte
    variants(
      fresh(() => {
        const a = randInt(2, 4), b = pick([3, 5, 7, 10, 25]), k = randInt(2, 6)
        return numeric(`Sur une carte, ${a} cm représentent ${b} km. Combien de kilomètres représentent ${a * k} cm ?`, b * k, {
          explanation: `${a * k} cm, c'est ${k} fois ${a} cm, donc ${b} × ${k} = ${b * k} km.`,
        })
      }),
      fresh(() => {
        const a = randInt(2, 4), b = pick([3, 5, 7, 10, 25]), k = randInt(2, 6)
        return numeric(`Sur une carte, ${a} cm représentent ${b} km. Combien de centimètres représentent ${b * k} km ?`, a * k, {
          explanation: `${b * k} km, c'est ${k} fois ${b} km, donc ${a} × ${k} = ${a * k} cm.`,
        })
      }),
      fresh(() => {
        const b = pick([2, 4, 5, 8, 10]), n = randInt(3, 15)
        return numeric(`Sur une carte, 2 cm représentent ${2 * b} km. Deux villages sont à ${n} cm l'un de l'autre sur la carte. Quelle est la distance réelle (en km) ?`, n * b, {
          explanation: `1 cm représente ${2 * b} ÷ 2 = ${b} km, donc ${n} cm représentent ${n} × ${b} = ${n * b} km.`,
        })
      }),
    ),
  ],
  [
    // Rendements : une quantité en donne une autre
    variants(
      fresh(() => {
        const [a, b] = pick([[4, 3], [5, 4], [8, 6], [10, 7], [10, 8], [5, 3], [8, 5]]), k = randInt(2, 9)
        return numeric(`${a} kg de blé donnent ${b} kg de farine au moulin. Combien de farine obtient-on avec ${a * k} kg de blé (en kg) ?`, b * k, {
          explanation: `${a * k} = ${a} × ${k}, donc ${b} × ${k} = ${b * k} kg.`,
        })
      }),
      fresh(() => {
        const [a, b] = pick([[3, 2], [5, 3], [4, 3], [10, 7]]), k = randInt(2, 8)
        return numeric(`Au pressoir, ${a} kg de raisin donnent ${b} L de jus. Quelle masse de raisin faut-il pour obtenir ${b * k} L de jus (en kg) ?`, a * k, {
          explanation: `${b * k} L, c'est ${k} fois ${b} L, donc il faut ${a} × ${k} = ${a * k} kg de raisin.`,
        })
      }),
      fresh(() => {
        const [a, b] = pick([[20, 1], [25, 1], [10, 1]]), k = pick([3, 4, 5, 6, 8])
        return numeric(`Il faut ${a} L de lait pour fabriquer ${b} kg de beurre. Combien de litres de lait faut-il pour ${k} kg de beurre ?`, a * k, {
          explanation: `${k} kg, c'est ${k} fois 1 kg : ${a} × ${k} = ${a * k} L.`,
        })
      }),
      fresh(() => {
        const [a, b] = pick([[6, 4], [9, 6], [12, 8], [15, 10]]), k = randInt(2, 7)
        return numeric(`Le forgeron obtient ${b} kg de fer avec ${a} kg de minerai. Combien de fer obtient-il avec ${a * k} kg de minerai (en kg) ?`, b * k, {
          explanation: `${a * k} kg de minerai, c'est ${k} fois ${a} kg : ${b} × ${k} = ${b * k} kg de fer.`,
        })
      }),
    ),
    // Pourcentage d'une quantité
    variants(
      () => {
        const p = pick([5, 15, 30, 35, 40, 60, 75]), base = randInt(2, 30) * 20
        return numeric(`Calcule ${p} % de ${base}.`, (p * base) / 100, { explanation: `${base} × ${p} ÷ 100 = ${fmt((p * base) / 100)}.` })
      },
      () => {
        const p = pick([15, 30, 35, 45, 60]), base = randInt(2, 20) * 20
        return numeric(`Lors d'un sondage auprès de ${base} villageois, ${p} % déclarent préférer le marché du samedi. Combien de villageois cela représente-t-il ?`, (p * base) / 100, {
          explanation: `${p} % de ${base} = ${base} × ${p} ÷ 100 = ${(p * base) / 100}.`,
        })
      },
      () => {
        const p = pick([5, 15, 35, 45]), base = randInt(3, 20) * 20
        return numeric(`Un paysan récolte ${base} kg de pommes ; ${p} % sont abîmées. Quelle masse de pommes est abîmée (en kg) ?`, (p * base) / 100, {
          explanation: `${base} × ${p} ÷ 100 = ${fmt((p * base) / 100)} kg.`,
        })
      },
      () => {
        const p = pick([15, 35, 45, 65]), base = randInt(2, 10) * 100
        return numeric(`Le seigneur prélève un impôt de ${p} % sur une récolte de ${base} écus. Combien d'écus prélève-t-il ?`, (p * base) / 100, {
          explanation: `${base} × ${p} ÷ 100 = ${(p * base) / 100} écus.`,
        })
      },
    ),
    // Quel pourcentage cela représente-t-il ?
    variants(
      fresh(() => {
        const total = pick([20, 25, 40, 50]), pct = pick([10, 20, 30, 40, 60, 80].filter((q) => (total * q) % 100 === 0).concat(total === 20 || total === 40 ? [15, 35, 45] : [12, 24, 36, 44]))
        const part = (total * pct) / 100
        const [who, what] = pick([['élèves de la classe', 'font de la natation'], ['joueurs du club', 'sont gauchers'], ['soldats de la garnison', 'sont blessés'], ['moutons du troupeau', 'sont noirs']])
        return numeric(`Sur ${total} ${who}, ${part} ${what}. Quel pourcentage cela représente-t-il ?`, pct, {
          explanation: `${part} ÷ ${total} = ${fmt(part / total)}, soit ${pct} %.`,
        })
      }),
      fresh(() => {
        const total = pick([20, 25, 50]), part = randInt(1, total - 1)
        return numeric(`À un quiz de ${total} questions, ${prenom()} répond correctement à ${part} questions. Quel est son pourcentage de bonnes réponses ?`, (part / total) * 100, {
          explanation: `${part} ÷ ${total} = ${fmt(part / total)}, soit ${fmt((part / total) * 100)} %.`,
        })
      }),
      fresh(() => {
        const total = pick([200, 400, 500]), part = (total / 100) * pick([12, 15, 35, 45, 64])
        return numeric(`Un sac contient ${total} billes, dont ${part} rouges. Quel pourcentage des billes est rouge ?`, (part / total) * 100, {
          explanation: `${part} ÷ ${total} = ${fmt(part / total)}, soit ${fmt((part / total) * 100)} %.`,
        })
      }),
    ),
    // Vitesse, distance, durée (durées décimales)
    variants(
      fresh(() => {
        const v = pick([40, 50, 60, 80, 90]), t = pick([0.5, 1.5, 2.5, 3.5]), d = v * t
        return numeric(`Combien de temps faut-il pour parcourir ${fmt(d)} km à ${v} km/h ? (en heures)`, t, {
          explanation: `Durée = distance ÷ vitesse = ${fmt(d)} ÷ ${v} = ${fmt(t)} h.`,
        })
      }),
      fresh(() => {
        const v = pick([12, 16, 30, 50, 70]), t = pick([0.5, 1.5, 2.5])
        return numeric(`Un cavalier galope pendant ${fmt(t)} h à ${v} km/h. Quelle distance parcourt-il (en km) ?`, v * t, {
          explanation: `d = v × t = ${v} × ${fmt(t)} = ${fmt(v * t)} km.`,
        })
      }),
      fresh(() => {
        const v = pick([8, 12, 20, 40, 60]), t = pick([0.5, 1.5, 2.5])
        return numeric(`Une barque parcourt ${fmt(v * t)} km en ${fmt(t)} h à vitesse constante. Quelle est sa vitesse (en km/h) ?`, v, {
          explanation: `v = d ÷ t = ${fmt(v * t)} ÷ ${fmt(t)} = ${v} km/h.`,
        })
      }),
    ),
    // Échelle d'un plan (1/n)
    variants(
      fresh(() => {
        const scale = pick([100, 200, 250, 500, 1000]), cm = randInt(2, 15)
        const obj = pick(['la grande salle du château', 'le terrain de handball', 'la cour du collège', 'le jardin du monastère'])
        return numeric(`Sur un plan à l'échelle 1/${scale}, ${obj} mesure ${cm} cm de long. Quelle est sa longueur réelle (en m) ?`, (cm * scale) / 100, {
          explanation: `${cm} × ${scale} = ${cm * scale} cm = ${fmt((cm * scale) / 100)} m.`,
        })
      }),
      fresh(() => {
        const scale = pick([100, 200, 500, 1000]), cm = randInt(2, 15)
        const real = (cm * scale) / 100
        return numeric(`Un mur mesure ${fmt(real)} m de long. Combien mesure-t-il sur un plan à l'échelle 1/${scale} (en cm) ?`, cm, {
          explanation: `${fmt(real)} m = ${cm * scale} cm, puis ${cm * scale} ÷ ${scale} = ${cm} cm.`,
        })
      }),
      fresh(() => {
        const scale = pick([10, 20, 50]), cm = randInt(3, 20)
        return numeric(`La maquette d'une catapulte est à l'échelle 1/${scale}. Le bras mesure ${cm} cm sur la maquette. Quelle est sa longueur réelle (en cm) ?`, cm * scale, {
          explanation: `Les longueurs réelles sont ${scale} fois plus grandes : ${cm} × ${scale} = ${cm * scale} cm.`,
        })
      }),
    ),
    // Que peut-on acheter avec cette somme ?
    variants(
      fresh(() => {
        const fruit = pick(['pommes', 'cerises', 'tomates', 'carottes', 'poires']), u = randInt(3, 9) * 0.5, n = randInt(2, 6)
        let m = randInt(2, 10)
        while (m === n) m = randInt(2, 10)
        return numeric(`${n} kg de ${fruit} coûtent ${fmt(n * u)} €. Quelle masse de ${fruit} peut-on acheter avec ${fmt(m * u)} € (en kg) ?`, m, {
          explanation: `Prix d'un kilo : ${fmt(n * u)} ÷ ${n} = ${fmt(u)} €, puis ${fmt(m * u)} ÷ ${fmt(u)} = ${m} kg.`,
        })
      }),
      fresh(() => {
        const n = randInt(2, 5), u = randInt(2, 8) * 0.5
        let m = randInt(3, 12)
        while (m === n) m = randInt(3, 12)
        return numeric(`${n} mètres de corde coûtent ${fmt(n * u)} écus. Quelle longueur de corde peut-on acheter avec ${fmt(m * u)} écus (en m) ?`, m, {
          explanation: `Prix d'un mètre : ${fmt(n * u)} ÷ ${n} = ${fmt(u)} écus, puis ${fmt(m * u)} ÷ ${fmt(u)} = ${m} m.`,
        })
      }),
      fresh(() => {
        const n = pick([10, 20]), u = pick([1.5, 1.8, 2, 2.5]), m = pick([15, 25, 30, 40])
        return numeric(`${n} litres d'huile de lampe coûtent ${fmt(n * u)} écus. Combien de litres peut-on acheter avec ${fmt(m * u)} écus ?`, m, {
          explanation: `Prix d'un litre : ${fmt(n * u)} ÷ ${n} = ${fmt(u)} écus, puis ${fmt(m * u)} ÷ ${fmt(u)} = ${m} L.`,
        })
      }),
    ),
  ],
  [
    // Vitesse et durées en minutes
    variants(
      fresh(() => {
        const v = randInt(3, 12) * 4, mins = pick([15, 30, 45, 75, 90, 105])
        return numeric(`Un messager galope à ${v} km/h pendant ${mins} minutes. Quelle distance parcourt-il (en km) ?`, (v * mins) / 60, {
          explanation: `${mins} min = ${fmt(mins / 60)} h, donc ${v} × ${fmt(mins / 60)} = ${fmt((v * mins) / 60)} km.`,
        })
      }),
      fresh(() => {
        const v = pick([4, 5, 6, 8, 10, 12]), d = v * pick([0.5, 1.5, 2, 2.5, 3])
        return numeric(`Une troupe marche à ${v} km/h. Combien de minutes lui faut-il pour parcourir ${fmt(d)} km ?`, (d / v) * 60, {
          explanation: `Durée = ${fmt(d)} ÷ ${v} = ${fmt(d / v)} h = ${fmt((d / v) * 60)} min.`,
        })
      }),
      fresh(() => {
        let v = 0, min = 0, d = 0.25
        while (!Number.isInteger(d * 10)) { v = pick([6, 9, 12, 15, 18, 24, 30, 36]); min = pick([10, 12, 15, 20, 30]); d = (v * min) / 60 }
        const who = pick(['Un cheval', 'Une coureuse', 'Un cycliste', 'Un chien de traîneau'])
        return numeric(`${who} parcourt ${fmt(d)} km en ${min} minutes à allure régulière. Quelle est sa vitesse (en km/h) ?`, v, {
          explanation: `1 h = 60 min = ${fmt(60 / min)} × ${min} min, donc ${fmt(d)} × ${fmt(60 / min)} = ${v} km/h.`,
        })
      }),
    ),
    // Échelle d'une carte (1/n)
    variants(
      fresh(() => {
        const cm = randInt(2, 14), scale = pick([25000, 50000, 100000])
        return numeric(`Sur une carte à l'échelle 1/${scale}, deux châteaux sont à ${cm} cm l'un de l'autre. Quelle est la distance réelle (en km) ?`, (cm * scale) / 100000, {
          explanation: `${cm} × ${scale} = ${cm * scale} cm = ${fmt((cm * scale) / 100000)} km.`,
        })
      }),
      fresh(() => {
        const scale = pick([10000, 20000, 25000, 50000, 100000, 200000]), cm = randInt(2, 12)
        const real = (cm * scale) / 100000
        return numeric(`Sur une carte, deux villages distants de ${fmt(real)} km sont séparés de ${cm} cm. L'échelle de la carte s'écrit 1/n : que vaut n ?`, scale, {
          explanation: `${fmt(real)} km = ${fmt(real * 100000)} cm, et ${fmt(real * 100000)} ÷ ${cm} = ${scale} : l'échelle est 1/${scale}.`, inputHint: 'n',
        })
      }),
      fresh(() => {
        const scale = pick([25000, 50000, 100000, 200000]), cm = randInt(2, 15)
        const real = (cm * scale) / 100000
        return numeric(`Deux tours de guet sont distantes de ${fmt(real)} km. À quelle distance sont-elles sur une carte à l'échelle 1/${scale} (en cm) ?`, cm, {
          explanation: `${fmt(real)} km = ${fmt(real * 100000)} cm, puis ${fmt(real * 100000)} ÷ ${scale} = ${cm} cm.`,
        })
      }),
    ),
    // Augmentations et diminutions en pourcentage
    variants(
      () => {
        const price = randInt(2, 15) * 20, r = pick([5, 10, 15, 20, 25, 30, 50])
        const obj = pick(['Le billet du festival', "L'abonnement au club de basket", 'La location d’un étal au marché', 'Un jeu vidéo', 'Une trottinette'])
        return numeric(`${obj} coûtait ${price} €. Son prix augmente de ${r} %. Quel est le nouveau prix (en €) ?`, price * (1 + r / 100), {
          explanation: `Hausse : ${price} × ${r} ÷ 100 = ${fmt((price * r) / 100)} €, donc ${price} + ${fmt((price * r) / 100)} = ${fmt(price * (1 + r / 100))} €.`,
        })
      },
      () => {
        const n = randInt(5, 30) * 20, r = pick([10, 15, 20, 25, 40])
        const what = pick(['Un village comptait', 'Une forêt comptait', 'Un troupeau comptait'])
        const unit = what.includes('village') ? 'habitants' : what.includes('forêt') ? 'arbres' : 'moutons'
        return numeric(`${what} ${n} ${unit}. Ce nombre a diminué de ${r} %. Combien y a-t-il ${de(unit)} maintenant ?`, n * (1 - r / 100), {
          explanation: `Baisse : ${n} × ${r} ÷ 100 = ${(n * r) / 100}, donc ${n} − ${(n * r) / 100} = ${fmt(n * (1 - r / 100))}.`,
        })
      },
      () => {
        const sal = randInt(10, 40) * 10, r = pick([2, 3, 4, 5, 10])
        return numeric(`Un apprenti gagne ${sal} écus par an. Son salaire augmente de ${r} %. De combien d'écus augmente-t-il ?`, (sal * r) / 100, {
          explanation: `${sal} × ${r} ÷ 100 = ${fmt((sal * r) / 100)} écus.`,
        })
      },
    ),
    // Quatrième proportionnelle avec des décimaux
    variants(
      fresh(() => {
        const n = randInt(3, 8), u = randInt(11, 39) / 10, m = randInt(2, 12)
        return numeric(`${n} kg de fromage coûtent ${fmt(n * u)} €. Combien coûtent ${m} kg (en €) ?`, m * u, {
          explanation: `Prix d'un kilo : ${fmt(n * u)} ÷ ${n} = ${fmt(u)} €, donc ${m} × ${fmt(u)} = ${fmt(m * u)} €.`,
        })
      }),
      fresh(() => {
        const n = pick([4, 5, 8]), u = pick([0.25, 0.75, 1.25, 2.5]), m = randInt(3, 15)
        return numeric(`${n} bouteilles identiques contiennent ${fmt(n * u)} L. Quel volume contiennent ${m} bouteilles (en L) ?`, m * u, {
          explanation: `Une bouteille : ${fmt(n * u)} ÷ ${n} = ${fmt(u)} L, donc ${m} × ${fmt(u)} = ${fmt(m * u)} L.`,
        })
      }),
      fresh(() => {
        const n = randInt(3, 6), u = pick([2.4, 3.6, 4.8, 1.2]), m = randInt(2, 9)
        return numeric(`En ${n} minutes, un robinet remplit ${fmt(n * u)} L d'eau. Combien de litres remplit-il en ${m} minutes ?`, m * u, {
          explanation: `En 1 minute : ${fmt(n * u)} ÷ ${n} = ${fmt(u)} L, donc en ${m} minutes : ${fmt(m * u)} L.`,
        })
      }),
    ),
  ],
  [
    // Prix après une remise
    variants(
      () => {
        const price = randInt(8, 40) * 20, r = pick([10, 15, 20, 25, 30, 40])
        return numeric(`Une armure coûte ${price} écus. Le marchand fait une remise de ${r} %. Quel est le nouveau prix (en écus) ?`, price * (1 - r / 100), {
          explanation: `Remise : ${price} × ${r} ÷ 100 = ${fmt((price * r) / 100)}, donc ${price} − ${fmt((price * r) / 100)} = ${fmt(price * (1 - r / 100))}.`,
        })
      },
      () => {
        const price = randInt(3, 20) * 10, r = pick([20, 30, 40, 50])
        const obj = pick(['un blouson', 'une paire de baskets', 'un sac à dos', 'une raquette'])
        return numeric(`Pendant les soldes, ${obj} à ${price} € est affiché${obj.startsWith('une') ? 'e' : ''} « −${r} % ». Combien le paie-t-on (en €) ?`, price * (1 - r / 100), {
          explanation: `Remise : ${price} × ${r} ÷ 100 = ${fmt((price * r) / 100)} €, donc ${price} − ${fmt((price * r) / 100)} = ${fmt(price * (1 - r / 100))} €.`,
        })
      },
      () => {
        const price = randInt(5, 30) * 20, r = pick([10, 20, 25])
        return numeric(`Un abonnement coûte ${price} € par an. Les étudiants ont droit à ${r} % de réduction. Combien paie un étudiant (en €) ?`, price * (1 - r / 100), {
          explanation: `Il paie ${100 - r} % du prix : ${price} × ${100 - r} ÷ 100 = ${fmt(price * (1 - r / 100))} €.`,
        })
      },
    ),
    // Proportionnalité en plusieurs étapes
    variants(
      fresh(() => {
        const p = randInt(2, 6), per = pick([50, 75, 100, 120, 150]), g = p * per
        let m = randInt(p + 1, 20)
        while (m % p === 0) m = randInt(p + 1, 20)
        return numeric(`Pour un banquet de ${p} convives, le cuisinier utilise ${g} g de viande. Combien de grammes pour ${m} convives ?`, per * m, {
          explanation: `${g} ÷ ${p} = ${per} g par convive, puis × ${m} = ${per * m} g.`,
        })
      }),
      fresh(() => {
        const q = pick([3, 4, 5, 6]), t = randInt(2, 5), k = randInt(3, 12)
        return numeric(`Un robinet remplit ${q * t} L en ${t} minutes. Combien de minutes faut-il pour remplir un bassin de ${q * k} L ?`, k, {
          explanation: `Débit : ${q * t} ÷ ${t} = ${q} L par minute ; ${q * k} ÷ ${q} = ${k} minutes.`,
        })
      }),
      fresh(() => {
        const a = pick([4, 6, 8]), l = randInt(1, 3), m = randInt(5, 15) * 2
        return numeric(`Avec ${l} L de peinture, on couvre ${a * l} m². Combien de litres faut-il pour un mur de ${a * m / 2} m² ?`, m / 2, {
          explanation: `1 L couvre ${a * l} ÷ ${l} = ${a} m², donc ${a * m / 2} ÷ ${a} = ${fmt(m / 2)} L.`,
        })
      }),
    ),
    // Retrouver le prix initial
    variants(
      fresh(() => {
        const r = pick([10, 20, 25, 40, 50]), initial = randInt(3, 30) * 20, fin = initial * (1 - r / 100)
        const obj = pick(['un vélo', 'une console', 'un manteau', 'une tente de camping'])
        return numeric(`Après une remise de ${r} %, ${obj} coûte ${fmt(fin)} €. Quel était son prix avant la remise (en €) ?`, initial, {
          explanation: `Le prix payé représente ${100 - r} % du prix initial. 1 % vaut ${fmt(fin)} ÷ ${100 - r} = ${fmt(initial / 100)} €, donc 100 % = ${initial} €.`,
        })
      }),
      fresh(() => {
        const r = pick([10, 20, 25, 50]), initial = randInt(3, 25) * 20, fin = initial * (1 + r / 100)
        const obj = pick(['Le prix du pain', 'Le loyer de l’échoppe', 'Le prix d’un cheval'])
        return numeric(`${obj} a augmenté de ${r} % et vaut maintenant ${fmt(fin)} écus. Combien valait-il avant la hausse (en écus) ?`, initial, {
          explanation: `Le nouveau prix représente ${100 + r} % de l'ancien. 1 % vaut ${fmt(fin)} ÷ ${100 + r} = ${fmt(initial / 100)}, donc 100 % = ${initial} écus.`,
        })
      }),
      fresh(() => {
        const r = pick([10, 20, 25, 30]), N = randInt(4, 20) * 10, part = (N * r) / 100
        return numeric(`Dans une école, ${part} élèves font du théâtre, ce qui représente ${r} % des élèves. Combien l'école compte-t-elle d'élèves ?`, N, {
          explanation: `${r} % ↔ ${part} élèves, donc 1 % ↔ ${fmt(part / r)} et 100 % ↔ ${N} élèves.`,
        })
      }),
    ),
    // Comparer deux offres
    variants(
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
        const aL = pick([1, 1.5, 2]), bL = pick([0.5, 2.5, 3, 5]), aU = randInt(8, 20) / 10
        let bU = randInt(8, 20) / 10
        while (bU === aU) bU = randInt(8, 20) / 10
        const best = Math.min(aU, bU)
        return numeric(`Une bouteille de jus de ${fmt(aL)} L coûte ${fmt(aL * aU)} € et une autre de ${fmt(bL)} L coûte ${fmt(bL * bU)} €. Quel est le prix au litre le plus bas (en €) ?`, best, {
          explanation: `${fmt(aL * aU)} ÷ ${fmt(aL)} = ${fmt(aU)} €/L et ${fmt(bL * bU)} ÷ ${fmt(bL)} = ${fmt(bU)} €/L : le prix le plus bas est ${fmt(best)} €/L.`,
        })
      },
      () => {
        const a = pick([3, 4, 6]), b = pick([10, 12, 20])
        const aU = randInt(20, 40) / 10
        let bU = randInt(20, 40) / 10
        while (bU === aU) bU = randInt(20, 40) / 10
        const diff = Math.abs(aU - bU)
        return numeric(`Un lot de ${a} carnets coûte ${fmt(a * aU)} € et un lot de ${b} carnets coûte ${fmt(b * bU)} €. Quel est l'écart de prix d'un carnet entre les deux lots (en €) ?`, diff, {
          explanation: `Un carnet : ${fmt(a * aU)} ÷ ${a} = ${fmt(aU)} € et ${fmt(b * bU)} ÷ ${b} = ${fmt(bU)} € ; écart : ${fmt(diff)} €.`,
        })
      },
    ),
    // Un voyage en deux étapes
    variants(
      fresh(() => {
        const v1 = pick([10, 12, 16, 20]), t1 = pick([1, 1.5, 2, 2.5]), v2 = pick([6, 8, 14, 18]), t2 = pick([0.5, 1, 1.5, 2])
        return numeric(`Un cavalier parcourt ${fmt(v1 * t1)} km à ${v1} km/h, puis ${fmt(v2 * t2)} km à ${v2} km/h dans la montagne. Combien de temps dure son voyage au total (en heures) ?`, t1 + t2, {
          explanation: `${fmt(v1 * t1)} ÷ ${v1} = ${fmt(t1)} h, puis ${fmt(v2 * t2)} ÷ ${v2} = ${fmt(t2)} h : total ${fmt(t1 + t2)} h.`,
        })
      }),
      fresh(() => {
        const v1 = pick([60, 80, 90, 100]), t1 = pick([1, 1.5, 2]), v2 = pick([40, 50, 70]), t2 = pick([0.5, 1, 1.5])
        return numeric(`Une voiture roule ${fmt(t1)} h à ${v1} km/h sur l'autoroute, puis ${fmt(t2)} h à ${v2} km/h sur la route. Quelle distance totale parcourt-elle (en km) ?`, v1 * t1 + v2 * t2, {
          explanation: `${v1} × ${fmt(t1)} = ${fmt(v1 * t1)} km, puis ${v2} × ${fmt(t2)} = ${fmt(v2 * t2)} km : total ${fmt(v1 * t1 + v2 * t2)} km.`,
        })
      }),
      fresh(() => {
        const [d1, t1, d2, t2] = pick([[30, 2, 10, 1], [45, 3, 15, 2], [50, 2, 40, 3], [24, 2, 12, 2], [36, 3, 24, 1]])
        return numeric(`Un messager parcourt ${d1} km en ${t1} h, puis ${d2} km en ${t2} h. Quelle est sa vitesse moyenne sur l'ensemble du trajet (en km/h) ?`, (d1 + d2) / (t1 + t2), {
          explanation: `Distance totale : ${d1 + d2} km ; durée totale : ${t1 + t2} h ; vitesse moyenne : ${d1 + d2} ÷ ${t1 + t2} = ${fmt((d1 + d2) / (t1 + t2))} km/h.`,
        })
      }),
    ),
    // Échelle et aire réelle
    variants(
      () => {
        const scale = pick([100, 200, 500, 1000]), L = randInt(3, 10), l = randInt(2, L - 1)
        const RL = (L * scale) / 100, Rl = (l * scale) / 100
        return numeric(`Sur un plan à l'échelle 1/${scale}, un jardin rectangulaire mesure ${L} cm sur ${l} cm. Quelle est son aire réelle (en m²) ?`, RL * Rl, {
          explanation: `Dimensions réelles : ${L} × ${scale} cm = ${fmt(RL)} m et ${l} × ${scale} cm = ${fmt(Rl)} m. Aire : ${fmt(RL)} × ${fmt(Rl)} = ${fmt(RL * Rl)} m².`,
        })
      },
      () => {
        const scale = pick([100, 200, 500]), L = randInt(3, 12), l = randInt(2, L - 1)
        const RL = (L * scale) / 100, Rl = (l * scale) / 100
        return numeric(`Sur un plan à l'échelle 1/${scale}, une cour rectangulaire mesure ${L} cm sur ${l} cm. Quelle longueur de clôture faut-il pour en faire le tour (en m) ?`, 2 * (RL + Rl), {
          explanation: `Dimensions réelles : ${fmt(RL)} m et ${fmt(Rl)} m. Périmètre : 2 × (${fmt(RL)} + ${fmt(Rl)}) = ${fmt(2 * (RL + Rl))} m.`,
        })
      },
      () => {
        const scale = pick([100, 200, 500]), c = randInt(2, 9)
        const R = (c * scale) / 100
        return numeric(`Sur un plan à l'échelle 1/${scale}, une salle carrée a un côté de ${c} cm. Quelle est son aire réelle (en m²) ?`, R * R, {
          explanation: `Côté réel : ${c} × ${scale} cm = ${fmt(R)} m. Aire : ${fmt(R)} × ${fmt(R)} = ${fmt(R * R)} m².`,
        })
      },
    ),
  ],
]

// ═══ Angles & triangles, aires et volumes ═══════════════════════════════
const withFigure = (ex: Exercise, figure: Figure): Exercise => withMeta(ex, { figure })
type Corner = 'ne' | 'nw' | 'se' | 'sw'
type At = 'I' | 'J'
const CORNERS: Corner[] = ['ne', 'nw', 'se', 'sw']
/** Inclinaison de la sécante pour que l'angle connu ait l'air de sa mesure. */
const tiltFor = (corner: Corner, v: number) => (corner === 'ne' || corner === 'sw' ? v : 180 - v)
/** Mesure d'angle « plausible » pour une figure (pas trop proche de 90°). */
function parAngle() {
  let v = randInt(40, 140)
  while (Math.abs(v - 90) < 10) v = randInt(40, 140)
  return v
}
const TRI = () => pick([['A', 'B', 'C'], ['R', 'S', 'T'], ['E', 'F', 'G'], ['K', 'L', 'M'], ['I', 'J', 'K']] as [string, string, string][])
const QUAD = () => pick([['A', 'B', 'C', 'D'], ['E', 'F', 'G', 'H'], ['M', 'N', 'O', 'P'], ['R', 'S', 'T', 'U']])

/** Deux droites sécantes en O ; secteurs 0 à 3 dans le sens direct, le secteur 0 mesure v. */
function crossFigure(v: number, known: number, asked: number, knownLabel: string): Figure {
  const t = (v * Math.PI) / 180
  const points = fitPoints({ O: [0, 0], E: [3, 0], W: [-3, 0], U: [3 * Math.cos(t), 3 * Math.sin(t)], D: [-3 * Math.cos(t), -3 * Math.sin(t)] })
  for (const k of ['E', 'W', 'U', 'D']) points[k] = { ...points[k], hidden: true, label: '' }
  const sec = [['E', 'U'], ['U', 'W'], ['W', 'D'], ['D', 'E']]
  const free = [0, 1, 2, 3].find((k) => k !== known && k !== asked) ?? 0
  points.O = { ...points.O, pos: (['ne', 'nw', 'sw', 'se'] as const)[free] }
  return {
    points,
    segments: [{ a: 'W', b: 'E' }, { a: 'D', b: 'U' }],
    angles: [
      { vertex: 'O', a: sec[known][0], b: sec[known][1], label: knownLabel, radius: 24 },
      { vertex: 'O', a: sec[asked][0], b: sec[asked][1], label: '?', color: RED, radius: 24 },
    ],
  }
}
/** Mesure du secteur s de crossFigure. */
const sector = (v: number, s: number) => (s % 2 === 0 ? v : 180 - v)

/** Angle AOB (droit ou plat) partagé par la demi-droite [OC) : AOC connu, COB cherché. */
function splitFigure(total: 90 | 180, a: number, known: string): Figure {
  const r = (d: number): [number, number] => [3 * Math.cos((d * Math.PI) / 180), 3 * Math.sin((d * Math.PI) / 180)]
  const points = fitPoints({ O: [0, 0], A: r(0), C: r(a), B: r(total) })
  points.O = { ...points.O, pos: total === 90 ? 'sw' : 's' }
  return {
    points,
    segments: [{ a: 'O', b: 'A' }, { a: 'O', b: 'C' }, { a: 'O', b: 'B' }],
    angles: [
      ...(total === 90 ? [{ vertex: 'O', a: 'A', b: 'B', right: true }] : []),
      { vertex: 'O', a: 'A', b: 'C', label: known, radius: 30 },
      { vertex: 'O', a: 'C', b: 'B', label: '?', color: RED, radius: 30 },
    ],
  }
}

/** Triangle ABC avec [BC] prolongé au-delà de C (angle extérieur en C). Les étiquettes « ? » sont en rouge. */
function exteriorFigure(a: number, b: number, lab: { A?: string; B?: string; C?: string; ext?: string }): Figure {
  const r = triangleFromAngles(a, b)
  const D: [number, number] = [r.C[0] + (r.C[0] - r.B[0]) * 0.55, r.C[1] + (r.C[1] - r.B[1]) * 0.55]
  const points = fitPoints({ A: r.A, B: r.B, C: r.C, D })
  points.D = { ...points.D, label: '', hidden: true }
  const col = (l?: string) => (l === '?' ? RED : undefined)
  const angles = [
    lab.A && { vertex: 'A', a: 'B', b: 'C', label: lab.A, color: col(lab.A) },
    lab.B && { vertex: 'B', a: 'C', b: 'A', label: lab.B, color: col(lab.B) },
    lab.C && { vertex: 'C', a: 'A', b: 'B', label: lab.C, color: col(lab.C) },
    lab.ext && { vertex: 'C', a: 'D', b: 'A', label: lab.ext, color: col(lab.ext) },
  ].filter(Boolean) as Figure['angles']
  return {
    points,
    segments: [{ a: 'A', b: 'B' }, { a: 'B', b: 'C' }, { a: 'C', b: 'A' }, { a: 'C', b: 'D', dashed: true }],
    angles,
  }
}

/** Deux parallèles (d) et (d′) ; A sur (d), B et C sur (d′) ; « Z » formé par la sécante (AB). */
function zFigure(alpha: number, gamma: number, lab: { alpha: string; beta: string; gamma: string }): Figure {
  const t = triangleFromAngles(alpha, gamma, 7)
  const B = t.A, C = t.B, A = t.C
  const points = fitPoints({
    A, B, C, L: [A[0] - 5.5, A[1]], R: [A[0] + 2, A[1]], P: [Math.min(-2, A[0] - 5.5), 0], Q: [Math.max(10, A[0] + 2), 0],
  })
  for (const k of ['L', 'R', 'P', 'Q']) points[k] = { ...points[k], hidden: true, label: '' }
  points.A = { ...points.A, pos: 'n' }
  const col = (l: string) => (l === '?' ? RED : undefined)
  return {
    points,
    segments: [{ a: 'L', b: 'R', mark: 'arrow' }, { a: 'P', b: 'Q', mark: 'arrow' }, { a: 'A', b: 'B' }, { a: 'A', b: 'C' }],
    angles: [
      { vertex: 'A', a: 'L', b: 'B', label: lab.alpha, color: col(lab.alpha) },
      { vertex: 'C', a: 'A', b: 'B', label: lab.gamma, color: col(lab.gamma) },
      { vertex: 'A', a: 'B', b: 'C', label: lab.beta, color: col(lab.beta) },
    ],
    notes: [{ x: points.L.x + 14, y: points.L.y - 10, text: '(d)' }, { x: points.Q.x - 14, y: points.Q.y - 10, text: '(d′)' }],
  }
}

/** Parallèles coupées par une sécante : angle égal (correspondants, alternes) ou supplémentaire. */
function parallelEx(kind: 'egal' | 'cointernes' | 'coexternes' | 'voisin'): Exercise {
  const v = parAngle()
  const kAt: At = pick(['I', 'J'] as const), other: At = kAt === 'I' ? 'J' : 'I'
  const internal: Record<At, Corner[]> = { I: ['se', 'sw'], J: ['ne', 'nw'] }
  const opp: Record<Corner, Corner> = { ne: 'sw', sw: 'ne', nw: 'se', se: 'nw' }
  const flipH: Record<Corner, Corner> = { ne: 'nw', nw: 'ne', se: 'sw', sw: 'se' }
  const flipV: Record<Corner, Corner> = { ne: 'se', se: 'ne', nw: 'sw', sw: 'nw' }
  let kc: Corner, ac: Corner, ans: number, explanation: string
  if (kind === 'egal') {
    const sub = pick(['correspondants', 'alternes-internes', 'alternes-externes'] as const)
    kc = sub === 'correspondants' ? pick(CORNERS) : sub === 'alternes-internes' ? pick(internal[kAt]) : pick(CORNERS.filter((c) => !internal[kAt].includes(c)))
    ac = sub === 'correspondants' ? kc : opp[kc]
    ans = v
    explanation = `Les deux angles sont ${sub} et les droites (d) et (d′) sont parallèles : ils ont la même mesure, ${v}°.`
  } else {
    kc = kind === 'cointernes' ? pick(internal[kAt]) : kind === 'coexternes' ? pick(CORNERS.filter((c) => !internal[kAt].includes(c))) : pick(CORNERS)
    ac = kind === 'voisin' ? flipH[kc] : flipV[kc]
    ans = 180 - v
    explanation = `En ${other}, l'angle correspondant à celui de ${v}° (même position) mesure aussi ${v}°, car (d) // (d′). L'angle marqué « ? » lui est adjacent et forme avec lui un angle plat : 180 − ${v} = ${180 - v}°.`
  }
  const known = { at: kAt, corner: kc, label: `${v}°` }
  const asked = { at: other, corner: ac, label: '?' }
  const prompt = pick([
    `Les droites (d) et (d′) sont parallèles et l'angle marqué en ${kAt} mesure ${v}°. Combien mesure l'angle marqué « ? » en ${other} (en °) ?`,
    `Sur la figure, (d) // (d′) et la sécante les coupe en I et J. L'angle connu en ${kAt} mesure ${v}°. Quelle est la mesure de l'angle rouge en ${other} (en °) ?`,
    `On sait que (d) et (d′) sont parallèles. Sachant que l'angle marqué en ${kAt} vaut ${v}°, calcule l'angle marqué « ? » en ${other} (en °).`,
  ])
  return withFigure(numeric(prompt, ans, { explanation }), parallelsFigure({ tilt: tiltFor(known.corner, v), known, asked }))
}

const geo: Tiers = [
  [
    // Angles complémentaires, supplémentaires, opposés par le sommet
    variants(
      () => {
        let a = randInt(5, 85)
        while (a === 45) a = randInt(5, 85)
        return numeric(`Deux angles sont complémentaires. L'un mesure ${a}°. Combien mesure l'autre (en °) ?`, 90 - a, {
          explanation: `Complémentaires : leur somme vaut 90°. 90 − ${a} = ${90 - a}°.`,
        })
      },
      () => {
        let a = randInt(10, 170)
        while (a === 90) a = randInt(10, 170)
        return numeric(`Deux angles sont supplémentaires. L'un mesure ${a}°. Combien mesure l'autre (en °) ?`, 180 - a, {
          explanation: `Supplémentaires : leur somme vaut 180°. 180 − ${a} = ${180 - a}°.`,
        })
      },
      () => {
        let a = randInt(15, 75)
        while (a === 45) a = randInt(15, 75)
        return withFigure(numeric(`Sur la figure, l'angle AÔB est droit et la demi-droite [OC) le partage en deux. AÔC mesure ${a}°. Combien mesure CÔB (en °) ?`, 90 - a, {
          explanation: `AÔC + CÔB = AÔB = 90°, donc CÔB = 90 − ${a} = ${90 - a}°.`,
        }), splitFigure(90, a, `${a}°`))
      },
      () => {
        let a = randInt(25, 155)
        while (Math.abs(a - 90) < 6) a = randInt(25, 155)
        return withFigure(numeric(`Sur la figure, A, O et B sont alignés. L'angle AÔC mesure ${a}°. Combien mesure l'angle CÔB (en °) ?`, 180 - a, {
          explanation: `AÔB est un angle plat (180°), donc CÔB = 180 − ${a} = ${180 - a}°.`,
        }), splitFigure(180, a, `${a}°`))
      },
      () => {
        const a = randInt(20, 80), b = randInt(20, 150 - a)
        return numeric(`Trois angles adjacents forment ensemble un angle plat. Deux d'entre eux mesurent ${a}° et ${b}°. Combien mesure le troisième (en °) ?`, 180 - a - b, {
          explanation: `Un angle plat mesure 180° : 180 − ${a} − ${b} = ${180 - a - b}°.`,
        })
      },
      () => {
        const v = parAngle(), s0 = randInt(0, 3)
        return withFigure(numeric(`Deux droites se coupent en O. L'un des angles formés mesure ${sector(v, s0)}°. Combien mesure l'angle marqué « ? », qui lui est opposé par le sommet (en °) ?`, sector(v, s0), {
          explanation: `Deux angles opposés par le sommet ont la même mesure : ${sector(v, s0)}°.`,
        }), crossFigure(v, s0, (s0 + 2) % 4, `${sector(v, s0)}°`))
      },
    ),
    // La somme des angles d'un triangle
    variants(
      () => {
        const a = randInt(20, 100), b = randInt(20, 160 - a)
        return numeric(`Dans un triangle, deux angles mesurent ${a}° et ${b}°. Combien mesure le troisième (en °) ?`, 180 - a - b, {
          explanation: `La somme des angles d'un triangle vaut 180° : 180 − ${a} − ${b} = ${180 - a - b}°.`,
        })
      },
      () => {
        const [A, B, C] = TRI(), a = randInt(30, 95), b = randInt(30, 150 - a)
        return withFigure(numeric(`Dans le triangle ${A}${B}${C}, l'angle en ${A} mesure ${a}° et l'angle en ${B} mesure ${b}°. Combien mesure l'angle en ${C} (en °) ?`, 180 - a - b, {
          explanation: `${a} + ${b} = ${a + b}, et 180 − ${a + b} = ${180 - a - b}°.`,
        }), triangleFigure({ names: [A, B, C], shape: [a, b], angles: { A: `${a}°`, B: `${b}°`, C: '?' }, highlight: 'C' }))
      },
      () => {
        const [A, B, C] = TRI()
        let b = randInt(15, 75)
        while (b === 50) b = randInt(15, 75) // (50° est réservé par triangleFigure à la forme par défaut)
        return withFigure(numeric(`Le triangle ${A}${B}${C} est rectangle en ${A} et l'angle en ${B} mesure ${b}°. Combien mesure l'angle en ${C} (en °) ?`, 90 - b, {
          explanation: `L'angle droit mesure 90°, donc les deux autres angles se partagent 180 − 90 = 90° : 90 − ${b} = ${90 - b}°.`,
        }), triangleFigure({ names: [A, B, C], right: 'A', shape: [90, b], angles: { B: `${b}°`, C: '?' }, highlight: 'C' }))
      },
      () => {
        let a = randInt(20, 85)
        while (a === 60) a = randInt(20, 85)
        return numeric(`Dans un triangle, deux angles mesurent chacun ${a}°. Combien mesure le troisième angle (en °) ?`, 180 - 2 * a, {
          explanation: `180 − ${a} − ${a} = 180 − ${2 * a} = ${180 - 2 * a}°.`,
        })
      },
    ),
    // Aires : base × hauteur
    variants(
      () => {
        const b = randInt(3, 15), h = randInt(2, 12)
        return numeric(`Un parallélogramme a une base de ${b} cm et une hauteur associée de ${h} cm. Quelle est son aire (en cm²) ?`, b * h, {
          explanation: `Aire = base × hauteur = ${b} × ${h} = ${b * h} cm².`,
        })
      },
      () => {
        const L = randInt(4, 20), l = randInt(2, L - 1)
        const obj = pick(['Un champ rectangulaire', 'La cour du château', 'Un tapis rectangulaire', 'Un potager rectangulaire'])
        const u = obj.startsWith('Un tapis') ? 'dm' : 'm'
        return numeric(`${obj} mesure ${L} ${u} de long et ${l} ${u} de large. Quelle est son aire (en ${u}²) ?`, L * l, {
          explanation: `Aire du rectangle = longueur × largeur = ${L} × ${l} = ${L * l} ${u}².`,
        })
      },
      () => {
        const c = randInt(3, 15)
        return numeric(`Une dalle carrée a un côté de ${c} dm. Quelle est son aire (en dm²) ?`, c * c, {
          explanation: `Aire du carré = côté × côté = ${c} × ${c} = ${c * c} dm².`,
        })
      },
      fresh(() => {
        const L = randInt(4, 15), l = randInt(2, 12)
        return numeric(`Un rectangle a une aire de ${L * l} m² et une largeur de ${l} m. Quelle est sa longueur (en m) ?`, L, {
          explanation: `Longueur × ${l} = ${L * l}, donc longueur = ${L * l} ÷ ${l} = ${L} m.`,
        })
      }),
    ),
    // Périmètres de polygones
    variants(
      () => {
        const c = randInt(2, 20)
        return numeric(`Un triangle équilatéral a un périmètre de ${3 * c} cm. Combien mesure chacun de ses côtés (en cm) ?`, c, {
          explanation: `Ses trois côtés sont égaux : ${3 * c} ÷ 3 = ${c} cm.`,
        })
      },
      () => {
        const c = randInt(2, 25)
        return numeric(`Un enclos carré a un périmètre de ${4 * c} m. Combien mesure un côté (en m) ?`, c, {
          explanation: `Ses quatre côtés sont égaux : ${4 * c} ÷ 4 = ${c} m.`,
        })
      },
      () => {
        const L = randInt(4, 20), l = randInt(2, L - 1)
        return numeric(`Un rectangle mesure ${L} cm sur ${l} cm. Quel est son périmètre (en cm) ?`, 2 * (L + l), {
          explanation: `P = 2 × (${L} + ${l}) = 2 × ${L + l} = ${2 * (L + l)} cm.`,
        })
      },
      () => {
        const c = randInt(5, 15), b = randInt(2, 2 * c - 1)
        return numeric(`Un triangle isocèle a deux côtés égaux de ${c} cm et une base de ${b} cm. Quel est son périmètre (en cm) ?`, 2 * c + b, {
          explanation: `P = ${c} + ${c} + ${b} = ${2 * c + b} cm.`,
        })
      },
      () => {
        const c = randInt(3, 15)
        return numeric(`Un losange a des côtés de ${c} cm. Quel est son périmètre (en cm) ?`, 4 * c, {
          explanation: `Les quatre côtés d'un losange sont égaux : 4 × ${c} = ${4 * c} cm.`,
        })
      },
    ),
  ],
  [
    // Triangles isocèles et rectangles
    variants(
      () => {
        const [A, B, C] = TRI(), apex = randInt(10, 80) * 2
        const base = (180 - apex) / 2
        return withFigure(numeric(`Le triangle ${A}${B}${C} est isocèle en ${A} et l'angle au sommet ${A} mesure ${apex}°. Combien mesure chaque angle à la base (en °) ?`, base, {
          explanation: `Les deux angles à la base sont égaux : (180 − ${apex}) ÷ 2 = ${180 - apex} ÷ 2 = ${base}°.`,
        }), triangleFigure({ names: [B, C, A], shape: [base, base], angles: { C: `${apex}°`, A: '?' }, highlight: 'A', marks: { BC: 'tick', CA: 'tick' } }))
      },
      () => {
        const [A, B, C] = TRI(), base = randInt(25, 80)
        return withFigure(numeric(`Le triangle ${A}${B}${C} est isocèle en ${C} et ses angles à la base mesurent ${base}°. Combien mesure l'angle en ${C} (en °) ?`, 180 - 2 * base, {
          explanation: `Les deux angles à la base sont égaux : 180 − 2 × ${base} = ${180 - 2 * base}°.`,
        }), triangleFigure({ names: [A, B, C], shape: [base, base], angles: { A: `${base}°`, B: `${base}°`, C: '?' }, highlight: 'C', marks: { BC: 'tick', CA: 'tick' } }))
      },
      () => {
        const [A, B, C] = TRI(), b = randInt(15, 75)
        return numeric(`${A}${B}${C} est un triangle rectangle en ${B}, et l'angle en ${A} mesure ${b}°. Combien mesure l'angle en ${C} (en °) ?`, 90 - b, {
          explanation: `Les deux angles aigus d'un triangle rectangle sont complémentaires : 90 − ${b} = ${90 - b}°.`,
        })
      },
      () => {
        const apex = randInt(10, 80) * 2
        return numeric(`Un triangle isocèle a un angle au sommet de ${apex}°. Quelle est la somme de ses deux angles à la base (en °) ?`, 180 - apex, {
          explanation: `Les trois angles font 180° : 180 − ${apex} = ${180 - apex}° pour les deux angles à la base (soit ${(180 - apex) / 2}° chacun).`,
        })
      },
    ),
    // Les quatre angles formés par deux droites sécantes
    variants(
      () => {
        const v = parAngle(), s0 = randInt(0, 3), s1 = (s0 + pick([1, 3])) % 4
        return withFigure(numeric(`Deux droites se coupent en O. L'angle marqué mesure ${sector(v, s0)}°. Combien mesure l'angle marqué « ? », qui lui est adjacent (en °) ?`, sector(v, s1), {
          explanation: `Les deux angles sont adjacents et forment un angle plat : 180 − ${sector(v, s0)} = ${sector(v, s1)}°.`,
        }), crossFigure(v, s0, s1, `${sector(v, s0)}°`))
      },
      () => {
        const a = randInt(20, 160)
        return numeric(`Deux droites sécantes forment quatre angles. L'un d'eux mesure ${a}°. Quelle est la somme des trois autres (en °) ?`, 360 - a, {
          explanation: `Les quatre angles font le tour complet du point, soit 360° : 360 − ${a} = ${360 - a}°.`,
        })
      },
      () => {
        const S = 2 * randInt(15, 75)
        return numeric(`Deux droites se coupent. Deux angles opposés par le sommet ont pour somme ${S}°. Combien mesure chacun des deux autres angles (en °) ?`, 180 - S / 2, {
          explanation: `Les deux angles opposés sont égaux : ${S} ÷ 2 = ${S / 2}° chacun. Un angle voisin forme avec l'un d'eux un angle plat : 180 − ${S / 2} = ${180 - S / 2}°.`,
        })
      },
      () => {
        const d = 2 * randInt(5, 50)
        return numeric(`Deux droites se coupent. L'un des angles formés mesure ${d}° de plus que son voisin. Combien mesure le plus grand des deux (en °) ?`, (180 + d) / 2, {
          explanation: `Les deux voisins font 180° : le petit vaut (180 − ${d}) ÷ 2 = ${(180 - d) / 2}°, le grand ${(180 - d) / 2} + ${d} = ${(180 + d) / 2}°.`,
        })
      },
      () => {
        const v = parAngle(), s0 = randInt(0, 3)
        return withFigure(numeric(`Deux droites se coupent en O. Sur la figure, l'angle connu mesure ${sector(v, s0)}°. Combien mesure l'angle marqué « ? » (en °) ?`, sector(v, s0), {
          explanation: `Les deux angles sont opposés par le sommet : ils ont la même mesure, ${sector(v, s0)}°.`,
        }), crossFigure(v, s0, (s0 + 2) % 4, `${sector(v, s0)}°`))
      },
    ),
    // Aire d'un triangle
    variants(
      () => {
        let b = randInt(3, 14), h = randInt(2, 12)
        while ((b * h) % 2) { b = randInt(3, 14); h = randInt(2, 12) }
        return numeric(`Un triangle a une base de ${b} cm et une hauteur relative à cette base de ${h} cm. Quelle est son aire (en cm²) ?`, (b * h) / 2, {
          explanation: `Aire = base × hauteur ÷ 2 = ${b} × ${h} ÷ 2 = ${(b * h) / 2} cm².`,
        })
      },
      () => {
        let a = randInt(3, 12), b = randInt(3, 12)
        while ((a * b) % 2) { a = randInt(3, 12); b = randInt(3, 12) }
        const [A, B, C] = TRI()
        return numeric(`Le triangle ${A}${B}${C} est rectangle en ${A}, avec ${A}${B} = ${a} cm et ${A}${C} = ${b} cm. Quelle est son aire (en cm²) ?`, (a * b) / 2, {
          explanation: `Dans un triangle rectangle, un côté de l'angle droit est une hauteur pour l'autre : ${a} × ${b} ÷ 2 = ${(a * b) / 2} cm².`,
        })
      },
      fresh(() => {
        const b = randInt(3, 12), h = randInt(2, 12)
        let bb = b
        while ((bb * h) % 2) bb++
        return numeric(`Un triangle a une aire de ${(bb * h) / 2} cm² et une base de ${bb} cm. Quelle est la hauteur relative à cette base (en cm) ?`, h, {
          explanation: `base × hauteur ÷ 2 = aire, donc hauteur = 2 × ${(bb * h) / 2} ÷ ${bb} = ${bb * h} ÷ ${bb} = ${h} cm.`,
        })
      }),
      () => {
        let b = randInt(2, 8), h = randInt(3, 10)
        while ((b * h) % 2) { b = randInt(2, 8); h = randInt(3, 10) }
        return numeric(`La voile triangulaire d'un navire a une base de ${b} m et une hauteur de ${h} m. Quelle est son aire (en m²) ?`, (b * h) / 2, {
          explanation: `${b} × ${h} ÷ 2 = ${(b * h) / 2} m².`,
        })
      },
    ),
    // Parallélogrammes : côtés, périmètre, diagonales
    variants(
      () => {
        const [P, Q, R, S] = QUAD(), a = randInt(4, 15), b = randInt(2, a - 1)
        return numeric(`${P}${Q}${R}${S} est un parallélogramme avec ${P}${Q} = ${a} cm et ${Q}${R} = ${b} cm. Quel est son périmètre (en cm) ?`, 2 * (a + b), {
          explanation: `Les côtés opposés d'un parallélogramme ont la même longueur : 2 × (${a} + ${b}) = ${2 * (a + b)} cm.`,
        })
      },
      fresh(() => {
        const a = randInt(4, 15), b = randInt(2, 12)
        return numeric(`Un parallélogramme a un périmètre de ${2 * (a + b)} cm et un côté de ${a} cm. Combien mesure un côté consécutif à celui-ci (en cm) ?`, b, {
          explanation: `Demi-périmètre : ${2 * (a + b)} ÷ 2 = ${a + b} cm, donc l'autre côté mesure ${a + b} − ${a} = ${b} cm.`,
        })
      }),
      () => {
        const [P, Q, R, S] = QUAD(), d = randInt(3, 15) * 2
        return numeric(`${P}${Q}${R}${S} est un parallélogramme de centre O, et la diagonale [${P}${R}] mesure ${d} cm. Combien mesure ${P}O (en cm) ?`, d / 2, {
          explanation: `Les diagonales d'un parallélogramme se coupent en leur milieu : ${P}O = ${d} ÷ 2 = ${d / 2} cm.`,
        })
      },
      fresh(() => {
        const c = randInt(3, 15)
        return numeric(`Un losange a un périmètre de ${4 * c} cm. Combien mesure un côté (en cm) ?`, c, {
          explanation: `Les quatre côtés d'un losange sont égaux : ${4 * c} ÷ 4 = ${c} cm.`,
        })
      }),
    ),
    // Symétrie centrale
    variants(
      () => {
        const d = randInt(3, 25) / 2
        return numeric(`A′ est le symétrique de A par rapport au point O, et OA = ${fmt(d)} cm. Quelle est la longueur AA′ (en cm) ?`, 2 * d, {
          explanation: `O est le milieu de [AA′] : AA′ = 2 × ${fmt(d)} = ${fmt(2 * d)} cm.`,
        })
      },
      () => {
        const d = randInt(3, 25) / 2
        return numeric(`M′ est le symétrique de M par rapport au point O, et MM′ = ${fmt(2 * d)} cm. Quelle est la longueur OM (en cm) ?`, d, {
          explanation: `O est le milieu de [MM′] : OM = ${fmt(2 * d)} ÷ 2 = ${fmt(d)} cm.`,
        })
      },
      fresh(() => {
        const o = randInt(4, 12), a = o + randNonZero(-4, 6)
        return numeric(`Sur une droite graduée, O a pour abscisse ${o} et A a pour abscisse ${a}. Quelle est l'abscisse du symétrique de A par rapport à O ?`, 2 * o - a, {
          explanation: `A est à ${Math.abs(a - o)} unité${s(Math.abs(a - o))} de O ; son symétrique est à la même distance, de l'autre côté : ${2 * o - a}.`,
        })
      }),
      () => {
        const c = randInt(3, 12), fig = pick([['carré', 4], ['triangle équilatéral', 3]] as [string, number][])
        return numeric(`On trace le symétrique d'un ${fig[0]} de côté ${c} cm par rapport à un point. Quel est le périmètre de la figure obtenue (en cm) ?`, fig[1] * c, {
          explanation: `La symétrie centrale conserve les longueurs : l'image est un ${fig[0]} de côté ${c} cm, de périmètre ${fig[1]} × ${c} = ${fig[1] * c} cm.`,
        })
      },
    ),
  ],
  [
    // Parallèles coupées par une sécante (angles égaux ou supplémentaires)
    variants(
      () => parallelEx('egal'),
      () => parallelEx('cointernes'),
      () => parallelEx('coexternes'),
      () => parallelEx('voisin'),
      () => parallelEx('voisin'),
    ),
    // Angles du parallélogramme et du losange
    variants(
      () => {
        const [P, Q, R, S] = QUAD(), a = randInt(30, 150)
        return numeric(`${P}${Q}${R}${S} est un parallélogramme et l'angle en ${P} mesure ${a}°. Combien mesure l'angle en ${Q} (en °) ?`, 180 - a, {
          explanation: `Deux angles consécutifs d'un parallélogramme sont supplémentaires : 180 − ${a} = ${180 - a}°.`,
        })
      },
      () => {
        const [P, Q, R, S] = QUAD(), a = randInt(30, 150)
        return numeric(`Dans le parallélogramme ${P}${Q}${R}${S}, l'angle en ${R} mesure ${a}°. Combien mesure l'angle en ${S} (en °) ?`, 180 - a, {
          explanation: `Les angles en ${R} et en ${S} sont consécutifs, donc supplémentaires : 180 − ${a} = ${180 - a}°.`,
        })
      },
      () => {
        const [P, Q, R, S] = QUAD(), Sm = 2 * randInt(20, 70)
        return numeric(`Dans le parallélogramme ${P}${Q}${R}${S}, la somme des angles en ${P} et en ${R} vaut ${Sm}°. Combien mesure l'angle en ${Q} (en °) ?`, 180 - Sm / 2, {
          explanation: `Les angles en ${P} et en ${R} sont opposés, donc égaux : ${Sm / 2}° chacun. L'angle en ${Q} est consécutif à celui en ${P} : 180 − ${Sm / 2} = ${180 - Sm / 2}°.`,
        })
      },
      () => {
        let a = randInt(30, 150)
        while (a === 90) a = randInt(30, 150)
        return numeric(`Un losange a un angle de ${a}°. Combien mesure un angle qui lui est consécutif (en °) ?`, 180 - a, {
          explanation: `Un losange est un parallélogramme : deux angles consécutifs sont supplémentaires, 180 − ${a} = ${180 - a}°.`,
        })
      },
      () => {
        const [P, Q, R, S] = QUAD(), a = randInt(30, 150)
        return numeric(`${P}${Q}${R}${S} est un parallélogramme et l'angle en ${P} mesure ${a}°. Combien mesure l'angle en ${R} (en °) ?`, a, {
          explanation: `Dans un parallélogramme, deux angles opposés ont la même mesure : ${a}°.`,
        })
      },
    ),
    // Inégalité triangulaire
    variants(
      () => {
        const a = randInt(3, 12), b = randInt(3, 12)
        return numeric(`Un triangle a deux côtés de ${a} cm et ${b} cm. Le troisième côté mesure un nombre entier de cm. Quelle est sa longueur maximale (en cm) ?`, a + b - 1, {
          explanation: `Inégalité triangulaire : il doit être strictement inférieur à ${a} + ${b} = ${a + b}, donc au plus ${a + b - 1} cm.`,
        })
      },
      () => {
        const a = randInt(3, 12), b = randInt(a + 2, 15)
        return numeric(`Un triangle a deux côtés de ${a} cm et ${b} cm. Le troisième côté mesure un nombre entier de cm. Quelle est sa longueur minimale (en cm) ?`, b - a + 1, {
          explanation: `Il doit être strictement supérieur à ${b} − ${a} = ${b - a}, donc au moins ${b - a + 1} cm.`,
        })
      },
      () => {
        const a = randInt(2, 8), b = randInt(a, 12)
        return numeric(`Deux côtés d'un triangle mesurent ${a} cm et ${b} cm. Combien de longueurs entières (en cm) sont possibles pour le troisième côté ?`, 2 * a - 1, {
          explanation: `Le troisième côté doit être strictement entre ${b} − ${a} = ${b - a} et ${a} + ${b} = ${a + b} : de ${b - a + 1} à ${a + b - 1}, soit ${2 * a - 1} valeurs.`,
        })
      },
      () => {
        const a = randInt(3, 12), b = randInt(3, 12)
        return numeric(`Un triangle a deux côtés de ${a} cm et ${b} cm, et son troisième côté mesure un nombre entier de cm. Quel est son plus grand périmètre possible (en cm) ?`, 2 * (a + b) - 1, {
          explanation: `Le troisième côté vaut au plus ${a + b} − 1 = ${a + b - 1} cm, donc le périmètre vaut au plus ${a} + ${b} + ${a + b - 1} = ${2 * (a + b) - 1} cm.`,
        })
      },
    ),
    // Périmètre d'un cercle
    variants(
      () => {
        const r = randInt(2, 12)
        return numeric(`Calcule le périmètre d'un cercle de rayon ${r} cm. Prends π ≈ 3,14 (en cm).`, 2 * 3.14 * r, {
          explanation: `P = 2 × π × r ≈ 2 × 3,14 × ${r} = ${fmt(6.28 * r)} cm.`,
        })
      },
      () => {
        const d = 2 * randInt(2, 12)
        const obj = pick(['Une roue de charrette', 'Une table ronde', 'Un bouclier rond', 'Un cerceau'])
        return numeric(`${obj} a un diamètre de ${d} dm. Quel est son périmètre (en dm) ? Prends π ≈ 3,14.`, 3.14 * d, {
          explanation: `P = π × diamètre ≈ 3,14 × ${d} = ${fmt(3.14 * d)} dm.`,
        })
      },
      () => {
        const d = 2 * randInt(2, 10)
        return numeric(`Une fenêtre a la forme d'un demi-disque de diamètre ${d} dm. Quelle est la longueur de son contour (arc et diamètre compris, en dm) ? Prends π ≈ 3,14.`, (3.14 * d) / 2 + d, {
          explanation: `Demi-cercle : 3,14 × ${d} ÷ 2 = ${fmt((3.14 * d) / 2)} dm, plus le diamètre ${d} dm : ${fmt((3.14 * d) / 2 + d)} dm.`,
        })
      },
      () => {
        const d = pick([5, 6, 8, 10]), n = randInt(3, 20)
        return numeric(`Une roue de ${d} dm de diamètre fait ${n} tours complets. Quelle distance parcourt-elle (en dm) ? Prends π ≈ 3,14.`, 3.14 * d * n, {
          explanation: `Un tour : 3,14 × ${d} = ${fmt(3.14 * d)} dm ; ${n} tours : ${fmt(3.14 * d)} × ${n} = ${fmt(3.14 * d * n)} dm.`,
        })
      },
    ),
    // Volume d'un pavé droit ou d'un cube
    variants(
      () => {
        const L = randInt(3, 15), l = randInt(2, 10), h = randInt(2, 10)
        const obj = pick(['Un coffre', 'Un aquarium', 'Une boîte à chaussures', 'Une caisse de pommes'])
        return numeric(`${obj} a la forme d'un pavé droit de ${L} cm de long, ${l} cm de large et ${h} cm de haut. Quel est son volume (en cm³) ?`, L * l * h, {
          explanation: `V = L × l × h = ${L} × ${l} × ${h} = ${L * l * h} cm³.`,
        })
      },
      () => {
        const c = randInt(2, 12)
        return numeric(`Un dé géant est un cube d'arête ${c} cm. Quel est son volume (en cm³) ?`, c ** 3, {
          explanation: `V = c × c × c = ${c} × ${c} × ${c} = ${c ** 3} cm³.`,
        })
      },
      fresh(() => {
        const L = randInt(3, 12), l = randInt(2, 8), h = randInt(2, 10)
        return numeric(`Un pavé droit a un volume de ${L * l * h} cm³, une longueur de ${L} cm et une largeur de ${l} cm. Quelle est sa hauteur (en cm) ?`, h, {
          explanation: `Aire de la base : ${L} × ${l} = ${L * l} cm² ; hauteur = ${L * l * h} ÷ ${L * l} = ${h} cm.`,
        })
      }),
      () => {
        const L = randInt(3, 9), l = randInt(2, 6), h = randInt(2, 6)
        return numeric(`Un abreuvoir a la forme d'un pavé droit de ${L} dm sur ${l} dm, et ${h} dm de profondeur. Combien de litres d'eau peut-il contenir ? (1 dm³ = 1 L)`, L * l * h, {
          explanation: `V = ${L} × ${l} × ${h} = ${L * l * h} dm³, soit ${L * l * h} L.`,
        })
      },
    ),
  ],
  [
    // Angle extérieur d'un triangle
    variants(
      () => {
        const a = randInt(30, 80), b = randInt(30, 150 - a)
        return withFigure(numeric(`Dans le triangle ABC, Â = ${a}° et B̂ = ${b}°. On prolonge [BC] au-delà de C. Combien mesure l'angle extérieur en C (en °) ?`, a + b, {
          explanation: `Ĉ = 180 − ${a} − ${b} = ${180 - a - b}°, et l'angle extérieur vaut 180 − ${180 - a - b} = ${a + b}°.`,
        }), exteriorFigure(a, b, { A: `${a}°`, B: `${b}°`, ext: '?' }))
      },
      () => {
        const a = randInt(30, 80), b = randInt(30, 150 - a)
        return withFigure(numeric(`Sur la figure, [BC] est prolongé au-delà de C. L'angle extérieur en C mesure ${a + b}° et Â = ${a}°. Combien mesure B̂ (en °) ?`, b, {
          explanation: `Ĉ = 180 − ${a + b} = ${180 - a - b}° (angle plat), puis B̂ = 180 − ${a} − ${180 - a - b} = ${b}°.`,
        }), exteriorFigure(a, b, { A: `${a}°`, B: '?', ext: `${a + b}°` }))
      },
      () => {
        const a = randInt(30, 80), b = randInt(30, 150 - a)
        return withFigure(numeric(`Dans le triangle ABC, on prolonge [BC] au-delà de C : l'angle extérieur en C mesure ${a + b}° et B̂ = ${b}°. Combien mesure Â (en °) ?`, a, {
          explanation: `Ĉ = 180 − ${a + b} = ${180 - a - b}°, puis Â = 180 − ${b} − ${180 - a - b} = ${a}°.`,
        }), exteriorFigure(a, b, { A: '?', B: `${b}°`, ext: `${a + b}°` }))
      },
      () => {
        const c = randInt(30, 140), a = randInt(20, 160 - c), b = 180 - a - c
        return withFigure(numeric(`Dans le triangle ABC, Ĉ = ${c}°. On prolonge [BC] au-delà de C. Combien mesure l'angle extérieur en C (en °) ?`, 180 - c, {
          explanation: `L'angle extérieur et Ĉ forment un angle plat : 180 − ${c} = ${180 - c}°.`,
        }), exteriorFigure(a, b, { C: `${c}°`, ext: '?' }))
      },
    ),
    // Parallèles et triangle
    variants(
      () => {
        let alpha = randInt(35, 75), gamma = randInt(35, 80)
        while (180 - alpha - gamma < 30) { alpha = randInt(35, 75); gamma = randInt(35, 80) }
        return withFigure(numeric(`Sur la figure, les droites (d) et (d′) sont parallèles, A est sur (d), B et C sont sur (d′). L'angle entre (d) et [AB] mesure ${alpha}° et AĈB = ${gamma}°. Combien mesure l'angle BÂC (en °) ?`, 180 - alpha - gamma, {
          explanation: `L'angle de ${alpha}° en A et l'angle AB̂C sont alternes-internes : AB̂C = ${alpha}°. Dans le triangle ABC : 180 − ${alpha} − ${gamma} = ${180 - alpha - gamma}°.`,
        }), zFigure(alpha, gamma, { alpha: `${alpha}°`, gamma: `${gamma}°`, beta: '?' }))
      },
      () => {
        let alpha = randInt(35, 75), gamma = randInt(35, 80)
        while (180 - alpha - gamma < 30) { alpha = randInt(35, 75); gamma = randInt(35, 80) }
        const beta = 180 - alpha - gamma
        return withFigure(numeric(`Les droites (d) et (d′) sont parallèles. L'angle entre (d) et [AB] mesure ${alpha}° et BÂC = ${beta}°. Combien mesure l'angle AĈB (en °) ?`, gamma, {
          explanation: `Alternes-internes : AB̂C = ${alpha}°. Dans le triangle ABC : AĈB = 180 − ${alpha} − ${beta} = ${gamma}°.`,
        }), zFigure(alpha, gamma, { alpha: `${alpha}°`, gamma: '?', beta: `${beta}°` }))
      },
      () => {
        let alpha = randInt(35, 75), gamma = randInt(35, 80)
        while (180 - alpha - gamma < 30) { alpha = randInt(35, 75); gamma = randInt(35, 80) }
        const beta = 180 - alpha - gamma
        return withFigure(numeric(`Sur la figure, (d) // (d′). On sait que BÂC = ${beta}° et AĈB = ${gamma}°. Combien mesure l'angle marqué « ? » entre (d) et [AB] (en °) ?`, alpha, {
          explanation: `Dans le triangle ABC : AB̂C = 180 − ${beta} − ${gamma} = ${alpha}°. L'angle « ? » et AB̂C sont alternes-internes, donc égaux : ${alpha}°.`,
        }), zFigure(alpha, gamma, { alpha: '?', gamma: `${gamma}°`, beta: `${beta}°` }))
      },
    ),
    // Aire d'un disque
    variants(
      () => {
        const r = randInt(1, 10)
        return numeric(`Calcule l'aire d'un disque de rayon ${r} cm. Prends π ≈ 3,14 (en cm²).`, 3.14 * r * r, {
          explanation: `A = π × r² ≈ 3,14 × ${r} × ${r} = 3,14 × ${r * r} = ${fmt(3.14 * r * r)} cm².`,
        })
      },
      () => {
        const r = randInt(1, 10)
        return numeric(`Un bassin circulaire a un diamètre de ${2 * r} m. Quelle est sa surface (en m²) ? Prends π ≈ 3,14.`, 3.14 * r * r, {
          explanation: `Rayon : ${2 * r} ÷ 2 = ${r} m. A = π × r² ≈ 3,14 × ${r * r} = ${fmt(3.14 * r * r)} m².`,
        })
      },
      () => {
        const r = randInt(2, 10)
        return numeric(`Une table a la forme d'un demi-disque de rayon ${r} dm. Quelle est son aire (en dm²) ? Prends π ≈ 3,14.`, (3.14 * r * r) / 2, {
          explanation: `Disque entier : 3,14 × ${r * r} = ${fmt(3.14 * r * r)} dm² ; la moitié : ${fmt((3.14 * r * r) / 2)} dm².`,
        })
      },
      () => {
        const r = 2 * randInt(1, 6)
        return numeric(`Une chèvre attachée au coin d'un pré, par une corde de ${r} m, peut brouter un quart de disque de rayon ${r} m. Quelle aire peut-elle brouter (en m²) ? Prends π ≈ 3,14.`, (3.14 * r * r) / 4, {
          explanation: `Disque entier : 3,14 × ${r * r} = ${fmt(3.14 * r * r)} m² ; le quart : ${fmt((3.14 * r * r) / 4)} m².`,
        })
      },
    ),
    // Volume d'un prisme droit
    variants(
      () => {
        let a = randInt(2, 9), b = randInt(2, 9)
        while ((a * b) % 2) { a = randInt(2, 9); b = randInt(2, 9) }
        const H = randInt(3, 15)
        return numeric(`Un prisme droit a pour base un triangle rectangle dont les côtés de l'angle droit mesurent ${a} cm et ${b} cm. Sa hauteur est de ${H} cm. Quel est son volume (en cm³) ?`, ((a * b) / 2) * H, {
          explanation: `Aire de la base : ${a} × ${b} ÷ 2 = ${(a * b) / 2} cm². Volume = aire de la base × hauteur = ${(a * b) / 2} × ${H} = ${((a * b) / 2) * H} cm³.`,
        })
      },
      () => {
        let b = randInt(2, 10), h = randInt(2, 8)
        while ((b * h) % 2) { b = randInt(2, 10); h = randInt(2, 8) }
        const L = randInt(5, 20)
        return numeric(`Une tente a la forme d'un prisme droit couché : ses faces avant et arrière sont des triangles de base ${b} dm et de hauteur ${h} dm, et elle mesure ${L} dm de long. Quel est son volume (en dm³) ?`, ((b * h) / 2) * L, {
          explanation: `Aire du triangle : ${b} × ${h} ÷ 2 = ${(b * h) / 2} dm². Volume : ${(b * h) / 2} × ${L} = ${((b * h) / 2) * L} dm³.`,
        })
      },
      fresh(() => {
        const B = randInt(4, 30), H = randInt(2, 12)
        return numeric(`Un prisme droit a un volume de ${B * H} cm³ et sa base a une aire de ${B} cm². Quelle est sa hauteur (en cm) ?`, H, {
          explanation: `V = aire de la base × hauteur, donc hauteur = ${B * H} ÷ ${B} = ${H} cm.`,
        })
      }),
      () => {
        const B = randInt(5, 40), H = randInt(3, 15)
        return numeric(`Un prisme droit a une base d'aire ${B} cm² et une hauteur de ${H} cm. Quel est son volume (en cm³) ?`, B * H, {
          explanation: `V = aire de la base × hauteur = ${B} × ${H} = ${B * H} cm³.`,
        })
      },
    ),
  ],
  [
    // Angles d'un triangle : mise en équation
    variants(
      () => {
        const [k, b] = pick([[2, 45], [3, 36], [4, 30], [7, 20], [8, 18]])
        return numeric(`Dans un triangle isocèle, l'angle au sommet est ${k} fois plus grand que chaque angle à la base. Combien mesure un angle à la base (en °) ?`, b, {
          explanation: `Si un angle à la base mesure b, alors b + b + ${k}b = 180, soit ${k + 2}b = 180 et b = ${b}°.`,
        })
      },
      () => {
        const [k, apex] = pick([[2, 36], [4, 20], [7, 12]])
        return numeric(`Dans un triangle isocèle, chaque angle à la base est ${k} fois plus grand que l'angle au sommet. Combien mesure un angle à la base (en °) ?`, k * apex, {
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
        let c = randInt(30, 110), d = 2 * randInt(3, 20)
        while (180 - c - d < 20 || (180 - c - d) % 2) { c = randInt(30, 110); d = 2 * randInt(3, 20) }
        const b = (180 - c - d) / 2
        return numeric(`Dans un triangle ABC, Ĉ = ${c}° et Â mesure ${d}° de plus que B̂. Combien mesure Â (en °) ?`, b + d, {
          explanation: `B̂ + (B̂ + ${d}) = 180 − ${c} = ${180 - c}, donc 2B̂ = ${180 - c - d}, B̂ = ${b}° et Â = ${b + d}°.`,
        })
      },
      () => {
        const k = pick([2, 3, 4, 5, 8, 9]), B = 180 / (k + 1)
        const [P, Q, R, S] = QUAD()
        const askBig = Math.random() < 0.5
        return numeric(`${P}${Q}${R}${S} est un parallélogramme dont l'angle en ${P} est ${k} fois plus grand que l'angle en ${Q}. Combien mesure l'angle en ${askBig ? P : Q} (en °) ?`, askBig ? k * B : B, {
          explanation: `Les angles en ${P} et en ${Q} sont consécutifs donc supplémentaires : ${k}b + b = 180 (b = angle en ${Q}), soit ${k + 1}b = 180, b = ${B}° et l'angle en ${P} mesure ${k * B}°.`,
        })
      },
    ),
    // Volume d'un cylindre
    variants(
      () => {
        const r = randInt(1, 5), h = randInt(2, 10)
        const [obj, u] = pick([['Une citerne cylindrique', 'm'], ['Une tour cylindrique', 'm'], ['Une boîte de conserve', 'cm']])
        return numeric(`${obj} a un rayon de ${r} ${u} et une hauteur de ${h} ${u}. Quel est son volume (en ${u}³) ? Prends π ≈ 3,14.`, 3.14 * r * r * h, {
          explanation: `V = π × r² × h ≈ 3,14 × ${r * r} × ${h} = ${fmt(3.14 * r * r * h)} ${u}³.`,
        })
      },
      () => {
        const r = randInt(1, 4), h = randInt(3, 10)
        return numeric(`Un tonneau cylindrique a un rayon de ${r} dm et une hauteur de ${h} dm. Combien de litres peut-il contenir ? Prends π ≈ 3,14 (1 dm³ = 1 L).`, 3.14 * r * r * h, {
          explanation: `V ≈ 3,14 × ${r * r} × ${h} = ${fmt(3.14 * r * r * h)} dm³, soit ${fmt(3.14 * r * r * h)} L.`,
        })
      },
      () => {
        const d = 2 * randInt(1, 5), h = randInt(2, 12)
        return numeric(`Un puits cylindrique a un diamètre de ${d} m et une profondeur de ${h} m. Quel est son volume (en m³) ? Prends π ≈ 3,14.`, 3.14 * (d / 2) ** 2 * h, {
          explanation: `Rayon : ${d} ÷ 2 = ${d / 2} m. V ≈ 3,14 × ${(d / 2) ** 2} × ${h} = ${fmt(3.14 * (d / 2) ** 2 * h)} m³.`,
        })
      },
      () => {
        const r = 2 * randInt(1, 3), L = randInt(5, 20)
        return numeric(`Une auge a la forme d'un demi-cylindre couché de rayon ${r} dm et de longueur ${L} dm. Quel est son volume (en dm³) ? Prends π ≈ 3,14.`, (3.14 * r * r * L) / 2, {
          explanation: `Cylindre entier : 3,14 × ${r * r} × ${L} = ${fmt(3.14 * r * r * L)} dm³ ; la moitié : ${fmt((3.14 * r * r * L) / 2)} dm³.`,
        })
      },
    ),
    // Aires de figures composées
    variants(
      () => {
        const r = randInt(1, 6), L = 2 * r, H = randInt(3, 12)
        return numeric(`Un vitrail est formé d'un rectangle de ${L} dm de large et ${H} dm de haut, surmonté d'un demi-disque de diamètre ${L} dm. Quelle est son aire totale (en dm²) ? Prends π ≈ 3,14.`, L * H + (3.14 * r * r) / 2, {
          explanation: `Rectangle : ${L} × ${H} = ${L * H} dm². Demi-disque de rayon ${r} : 3,14 × ${r * r} ÷ 2 = ${fmt((3.14 * r * r) / 2)} dm². Total : ${fmt(L * H + (3.14 * r * r) / 2)} dm².`,
        })
      },
      () => {
        const r = randInt(1, 4), L = randInt(2 * r + 4, 25), l = randInt(2 * r + 2, L)
        return numeric(`Un jardin rectangulaire de ${L} m sur ${l} m contient un bassin circulaire de rayon ${r} m. Quelle surface reste-t-il pour la pelouse (en m²) ? Prends π ≈ 3,14.`, L * l - 3.14 * r * r, {
          explanation: `Jardin : ${L} × ${l} = ${L * l} m². Bassin : 3,14 × ${r * r} = ${fmt(3.14 * r * r)} m². Pelouse : ${L * l} − ${fmt(3.14 * r * r)} = ${fmt(L * l - 3.14 * r * r)} m².`,
        })
      },
      () => {
        const c = randInt(4, 12), h = randInt(2, 8)
        return numeric(`La façade d'une maison est formée d'un carré de ${c} m de côté surmonté d'un triangle de base ${c} m et de hauteur ${h} m. Quelle est l'aire de la façade (en m²) ?`, c * c + (c * h) / 2, {
          explanation: `Carré : ${c} × ${c} = ${c * c} m². Triangle : ${c} × ${h} ÷ 2 = ${fmt((c * h) / 2)} m². Total : ${fmt(c * c + (c * h) / 2)} m².`,
        })
      },
      () => {
        const r = randInt(2, 6), L = randInt(10, 30)
        return numeric(`Une piste est formée d'un rectangle de ${L} m sur ${2 * r} m, avec un demi-disque de diamètre ${2 * r} m à chaque bout. Quelle est l'aire de la piste (en m²) ? Prends π ≈ 3,14.`, L * 2 * r + 3.14 * r * r, {
          explanation: `Rectangle : ${L} × ${2 * r} = ${L * 2 * r} m². Deux demi-disques = un disque de rayon ${r} : 3,14 × ${r * r} = ${fmt(3.14 * r * r)} m². Total : ${fmt(L * 2 * r + 3.14 * r * r)} m².`,
        })
      },
    ),
    // Angles en plusieurs étapes
    variants(
      () => {
        const a = 2 * randInt(10, 70), base = (180 - a) / 2
        return withFigure(numeric(`Le triangle ABC est isocèle en A et Â = ${a}°. On prolonge [BC] au-delà de C. Combien mesure l'angle extérieur en C (en °) ?`, 180 - base, {
          explanation: `Angles à la base : (180 − ${a}) ÷ 2 = ${base}°. L'angle extérieur en C forme un angle plat avec Ĉ : 180 − ${base} = ${180 - base}°.`,
        }), exteriorFigure(a, base, { A: `${a}°`, ext: '?' }))
      },
      () => {
        let a = randInt(30, 90), b = randInt(30, 90)
        while (180 - a - b < 30 || (180 - a - b) % 2) { a = randInt(30, 90); b = randInt(30, 90) }
        const c = 180 - a - b
        return numeric(`Dans le triangle ABC, Â = ${a}° et B̂ = ${b}°. La demi-droite [CD) est la bissectrice de l'angle Ĉ. Combien mesure l'angle AĈD (en °) ?`, c / 2, {
          explanation: `Ĉ = 180 − ${a} − ${b} = ${c}°. La bissectrice le partage en deux angles égaux : ${c} ÷ 2 = ${c / 2}°.`,
        })
      },
      () => {
        const b = randInt(20, 70)
        return numeric(`ABC est rectangle en A, et H est le pied de la hauteur issue de A. Sachant que l'angle AB̂C mesure ${b}°, combien mesure l'angle BÂH (en °) ?`, 90 - b, {
          explanation: `Le triangle ABH est rectangle en H : ses angles aigus sont complémentaires, donc BÂH = 90 − ${b} = ${90 - b}°.`,
        })
      },
      () => {
        const e = 2 * randInt(30, 80)
        return numeric(`Le triangle ABC est isocèle en C. On prolonge [BC] au-delà de C : l'angle extérieur en C mesure ${e}°. Combien mesure Â (en °) ?`, e / 2, {
          explanation: `Ĉ = 180 − ${e} = ${180 - e}°. Les angles à la base sont égaux : Â = (180 − ${180 - e}) ÷ 2 = ${e / 2}°.`,
        })
      },
    ),
  ],
]

// ═══ Statistiques & probabilités (les érudits du monastère) ═════════════
/** n valeurs entières de moyenne exacte `mean`, à ±spread autour, entre min et max (aucune égale à la moyenne). */
function seriesWithMean(n: number, mean: number, spread: number, min = 1, max = Infinity): number[] {
  let vals: number[] = []
  while (!vals.length || vals.some((v) => v < min || v > max) || vals.includes(mean)) {
    vals = Array.from({ length: n - 1 }, () => mean + randNonZero(-spread, spread))
    vals.push(mean * n - sum(vals))
  }
  return vals
}
const meanExpl = (vals: number[], unit = '') =>
  `Somme : ${vals.join(' + ')} = ${sum(vals)} ; on divise par le nombre de valeurs, ${vals.length} : ${sum(vals)} ÷ ${vals.length} = ${fmt(sum(vals) / vals.length)}${unit}.`

const stat: Tiers = [
  [
    // Calculer une moyenne
    variants(
      fresh(() => {
        const n = randInt(3, 5), vals = seriesWithMean(n, randInt(8, 15), 4)
        return numeric(`Notes d'un élève : ${vals.join(' ; ')}. Quelle est sa moyenne ?`, sum(vals) / n, { explanation: meanExpl(vals) })
      }),
      fresh(() => {
        const n = randInt(2, 4), jours = ['lundi', 'mardi', 'mercredi', 'jeudi'].slice(0, n)
        const vals = n === 2 ? [randInt(6, 25), randInt(6, 25)] : seriesWithMean(n, randInt(10, 20), 6)
        return numeric(`${cap(frere())} copie ${jours.map((j, i) => `${vals[i]} pages ${j}`).join(', ').replace(/, ([^,]*)$/, ' et $1')}. Combien de pages copie-t-il en moyenne par jour ?`, sum(vals) / n, {
          explanation: meanExpl(vals, ' pages'),
        })
      }),
      fresh(() => {
        const n = randInt(4, 6), vals = seriesWithMean(n, randInt(5, 8), 3, 1, 10)
        return numeric(`Au concours, un archer tire ${n} flèches et marque ${vals.join(' ; ')} points. Quel est son score moyen par flèche ?`, sum(vals) / n, { explanation: meanExpl(vals, ' points') })
      }),
      fresh(() => {
        const n = randInt(3, 6), vals = seriesWithMean(n, randInt(12, 30), 8, 1)
        return numeric(`Les ${n} novices du monastère ont cueilli ${vals.join(' kg ; ')} kg de pommes. Quelle masse de pommes un novice a-t-il cueillie en moyenne (en kg) ?`, sum(vals) / n, {
          explanation: meanExpl(vals, ' kg'),
        })
      }),
      fresh(() => {
        const n = randInt(4, 6), vals = seriesWithMean(n, randInt(12, 24), 5)
        return numeric(`Températures relevées à midi pendant ${n} jours : ${vals.map((v) => `${v} °C`).join(' ; ')}. Quelle est la température moyenne (en °C) ?`, sum(vals) / n, {
          explanation: meanExpl(vals, ' °C'),
        })
      }),
      fresh(() => {
        const n = randInt(4, 6), vals = seriesWithMean(n, randInt(2, 4), 2)
        return numeric(`Lors de ses ${n} derniers matchs, une équipe de handball a marqué ${vals.map((v) => v + 20).join(' ; ')} buts. Combien de buts marque-t-elle en moyenne par match ?`, sum(vals) / n + 20, {
          explanation: meanExpl(vals.map((v) => v + 20), ' buts'),
        })
      }),
    ),
    // Calculer une étendue
    variants(
      ...([
        ['Nombre de flèches tirées par les archers', 8, 40, ''], ['Âges des moines du scriptorium', 19, 78, ' ans'],
        ['Buts marqués par les équipes du tournoi', 0, 12, ' buts'], ['Nombre de pommes cueillies par les novices', 10, 60, ' pommes'],
        ['Tailles (en cm) des élèves d’un groupe', 138, 172, ' cm'],
      ] as [string, number, number, string][]).map(([txt, lo, hi, unit]) => () => {
        const n = randInt(5, 7), vals = Array.from({ length: n }, () => randInt(lo, hi))
        const e = Math.max(...vals) - Math.min(...vals)
        return numeric(`${txt} : ${vals.join(' ; ')}. Quelle est l'étendue de cette série ?`, e, {
          explanation: `Étendue = plus grande valeur − plus petite valeur = ${Math.max(...vals)} − ${Math.min(...vals)} = ${e}${unit}.`,
        })
      }),
    ),
    // Une probabilité simple
    variants(
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
        const N = pick([4, 8, 10, 12, 20]), k = randInt(2, N - 1)
        const [txt, n] = pick<[string, number]>([
          ['un nombre pair', Math.floor(N / 2)], [`un nombre supérieur ou égal à ${k}`, N - k + 1], ['un multiple de 4', Math.floor(N / 4)],
        ].filter((e) => (e[1] as number) > 0) as [string, number][])
        return fraction(`On lance un dé équilibré à ${N} faces, numérotées de 1 à ${N}. Quelle est la probabilité d'obtenir ${txt} ?`, n, N, {
          explanation: `${n} face${s(n)} favorable${s(n)} sur ${N} : ${F(n, N)}.`,
        })
      },
      () => {
        const N = pick([5, 6, 8, 10, 12]), k = randInt(1, N - 1)
        const col = pick(['rouges', 'dorés', 'bleus', 'verts'])
        return fraction(`Une roue de loterie est partagée en ${N} secteurs égaux, dont ${k} ${col}. On fait tourner la roue. Quelle est la probabilité de tomber sur un secteur ${col.slice(0, -1)} ?`, k, N, {
          explanation: `${k} secteur${s(k)} favorable${s(k)} sur ${N}, tous équiprobables : ${F(k, N)}.`,
        })
      },
      () => {
        const word = pick(['CHATEAU', 'CHEVALIER', 'DONJON', 'MONASTERE', 'ARMURE', 'CATAPULTE', 'FORTERESSE'])
        const v = [...word].filter((c) => 'AEIOUY'.includes(c)).length
        return fraction(`On écrit chaque lettre du mot ${word} sur un jeton, puis on tire un jeton au hasard. Quelle est la probabilité de tirer une voyelle ?`, v, word.length, {
          explanation: `${word.length} jetons, dont ${v} voyelles : ${F(v, word.length)}.`,
        })
      },
    ),
    // Calculer une fréquence
    variants(
      () => {
        const p = prenom(), n = pick([10, 20, 25, 50]), k = randInt(1, n - 1)
        return fraction(`${p} lance une pièce ${n} fois et obtient ${k} fois « pile ». Quelle est la fréquence de « pile » ? (donne une fraction)`, k, n, {
          explanation: `Fréquence = effectif ÷ effectif total = ${F(k, n)}.`,
        })
      },
      () => {
        const n = pick([12, 18, 24, 30, 36]), k = randInt(1, n / 3)
        return fraction(`On lance un dé ${n} fois ; le 6 sort ${k} fois. Quelle est la fréquence d'apparition du 6 ? (donne une fraction)`, k, n, {
          explanation: `${k} fois sur ${n} lancers : ${F(k, n)}.`,
        })
      },
      () => {
        const n = randInt(22, 30), k = randInt(3, n - 3)
        const what = pick(['ont un animal de compagnie', 'font du sport en club', 'jouent d’un instrument', 'sont nés en hiver'])
        return fraction(`Dans une classe de ${n} élèves, ${k} ${what}. Quelle est la fréquence de ces élèves dans la classe ? (donne une fraction)`, k, n, {
          explanation: `Effectif ${k}, effectif total ${n} : fréquence ${F(k, n)}.`,
        })
      },
      () => {
        const n = pick([10, 20, 30, 40]), k = randInt(1, n - 1)
        return fraction(`Un archer tire ${n} flèches et touche le centre de la cible ${k} fois. Quelle est la fréquence des tirs au centre ? (donne une fraction)`, k, n, {
          explanation: `${k} tirs au centre sur ${n} : ${F(k, n)}.`,
        })
      },
    ),
  ],
  [
    // Tirer au hasard dans un sac
    variants(
      () => {
        const r = randInt(2, 9), b = randInt(1, 9), v = randInt(0, 5), total = r + b + v
        return fraction(`Un sac contient ${r} jetons rouges${v ? ', ' : ' et '}${b} bleu${s(b)}${v ? ` et ${v} vert${s(v)}` : ''}. On tire un jeton au hasard. Quelle est la probabilité qu'il soit rouge ?`, r, total, {
          explanation: `${r} cas favorables sur ${total} cas possibles : ${F(r, total)}.`,
        })
      },
      () => {
        const c = randInt(2, 8), f = randInt(2, 8), m = randInt(1, 6), total = c + f + m
        return fraction(`Une boîte contient ${c} bonbons au citron, ${f} à la fraise et ${m} à la menthe. On en prend un au hasard. Quelle est la probabilité qu'il soit à la fraise ?`, f, total, {
          explanation: `${f} bonbons à la fraise sur ${total} : ${F(f, total)}.`,
        })
      },
      () => {
        const N = pick([10, 12, 15, 20, 24, 30]), k = pick([3, 4, 5].filter((v) => v < N)), n = Math.floor(N / k)
        return fraction(`On tire au hasard une carte parmi ${N} cartes numérotées de 1 à ${N}. Quelle est la probabilité d'obtenir un multiple de ${k} ?`, n, N, {
          explanation: `Les multiples de ${k} sont ${Array.from({ length: n }, (_, i) => k * (i + 1)).join(', ')} : ${n} sur ${N}, soit ${F(n, N)}.`,
        })
      },
      () => {
        const g = randInt(3, 15), p = randInt(10, 40), total = g + p
        return fraction(`À la tombola de la fête du village, il y a ${g} tickets gagnants et ${p} tickets perdants. On achète un ticket au hasard. Quelle est la probabilité de gagner ?`, g, total, {
          explanation: `${g} tickets gagnants sur ${total} tickets : ${F(g, total)}.`,
        })
      },
    ),
    // Étendue d'une série de décimaux ou de relatifs
    variants(
      () => {
        const vals = Array.from({ length: 6 }, () => randInt(120, 165))
        const e = (Math.max(...vals) - Math.min(...vals)) / 10
        return numeric(`Temps (en secondes) de six coureurs au 100 m : ${vals.map((v) => fmt(v / 10)).join(' ; ')}. Quelle est l'étendue de cette série (en s) ?`, e, {
          explanation: `${fmt(Math.max(...vals) / 10)} − ${fmt(Math.min(...vals) / 10)} = ${fmt(e)} s.`,
        })
      },
      () => {
        const vals = Array.from({ length: 5 }, () => randInt(138, 175))
        const e = (Math.max(...vals) - Math.min(...vals)) / 100
        return numeric(`Tailles (en m) des cinq joueurs d'une équipe : ${vals.map((v) => fmt(v / 100)).join(' ; ')}. Quelle est l'étendue de cette série (en m) ?`, e, {
          explanation: `${fmt(Math.max(...vals) / 100)} − ${fmt(Math.min(...vals) / 100)} = ${fmt(e)} m.`,
        })
      },
      () => {
        let vals: number[] = []
        while (!vals.some((v) => v < 0) || !vals.some((v) => v > 0)) vals = Array.from({ length: 6 }, () => randInt(-12, 10))
        const e = Math.max(...vals) - Math.min(...vals)
        return numeric(`Températures minimales (en °C) relevées au monastère pendant six nuits : ${vals.map(fmt).join(' ; ')}. Quelle est l'étendue de cette série (en °C) ?`, e, {
          explanation: `${fmt(Math.max(...vals))} − ${par(Math.min(...vals))} = ${e} °C.`,
        })
      },
      () => {
        const vals = Array.from({ length: 5 }, () => randInt(35, 95) * 10)
        const e = (Math.max(...vals) - Math.min(...vals)) / 1000
        return numeric(`Masses (en kg) des pains sortis du four : ${vals.map((v) => fmt(v / 1000)).join(' ; ')}. Quelle est l'étendue de cette série (en kg) ?`, e, {
          explanation: `${fmt(Math.max(...vals) / 1000)} − ${fmt(Math.min(...vals) / 1000)} = ${fmt(e)} kg.`,
        })
      },
    ),
    // Moyenne (résultat décimal possible)
    variants(
      () => {
        const vals = Array.from({ length: 4 }, () => randInt(6, 22))
        return numeric(`${cap(frere())}, apiculteur du monastère, pèse le miel récolté dans ses 4 ruches : ${vals.map((v) => `${v} kg`).join(' ; ')}. Quelle est la masse moyenne par ruche (en kg) ?`, sum(vals) / 4, {
          explanation: meanExpl(vals, ' kg'),
        })
      },
      () => {
        const n = pick([4, 5]), vals = Array.from({ length: n }, () => randInt(1, 25))
        return numeric(`Hauteurs de pluie (en mm) relevées pendant ${n} jours : ${vals.join(' ; ')}. Quelle est la hauteur de pluie moyenne par jour (en mm) ?`, sum(vals) / n, {
          explanation: meanExpl(vals, ' mm'),
        })
      },
      () => {
        let vals: number[] = []
        while (!vals.length || vals[3] < 3 || vals[3] > 12) {
          const m = randInt(10, 20) / 2
          vals = Array.from({ length: 3 }, () => randInt(6, 24) / 2)
          vals.push(4 * m - sum(vals))
        }
        return numeric(`Prix (en €) d'un même livre dans 4 librairies : ${vals.map(fmt).join(' ; ')}. Quel est le prix moyen (en €) ?`, sum(vals) / 4, {
          explanation: `Somme : ${vals.map(fmt).join(' + ')} = ${fmt(sum(vals))} ; ${fmt(sum(vals))} ÷ 4 = ${fmt(sum(vals) / 4)} €.`,
        })
      },
      () => {
        const n = pick([4, 5]), vals = Array.from({ length: n }, () => randInt(40, 90))
        return numeric(`Un marchand compte les clients de son étal pendant ${n} jours de foire : ${vals.join(' ; ')}. Combien de clients a-t-il eus en moyenne par jour ?`, sum(vals) / n, {
          explanation: meanExpl(vals, ' clients'),
        })
      },
    ),
    // Fréquence sous forme irréductible
    variants(
      ...([['moines du monastère', 'sont copistes'], ['élèves de la classe', 'viennent à vélo'], ['chevaux de l’écurie', 'sont blancs'], ['livres de la bibliothèque', 'sont en latin']] as [string, string][]).map(([who, what]) => () => {
        let n = pick([12, 15, 18, 20, 24, 30, 40]), k = randInt(2, n - 1)
        while (gcd(k, n) === 1) { n = pick([12, 15, 18, 20, 24, 30, 40]); k = randInt(2, n - 1) }
        return fraction(`Sur ${n} ${who}, ${k} ${what}. Quelle est la fréquence correspondante ? (fraction irréductible)`, k, n, {
          irreducible: true, explanation: `${F(k, n)} = ${F(k / gcd(k, n), n / gcd(k, n))} en simplifiant par ${gcd(k, n)}.`,
        })
      }),
    ),
    // L'événement contraire
    variants(
      () => {
        const p = randInt(1, 19) * 5
        const [e, ne] = pick([['qu’il pleuve demain', 'qu’il ne pleuve pas demain'], ['que l’équipe gagne le match', 'que l’équipe ne gagne pas le match'], ['que le bus soit en retard', 'que le bus ne soit pas en retard']])
        return decimalOnly(numeric(`La probabilité ${e} est de ${fmt(p / 100)}. Quelle est la probabilité ${ne} ? (écriture décimale)`, (100 - p) / 100, {
          explanation: `Les deux événements sont contraires : 1 − ${fmt(p / 100)} = ${fmt((100 - p) / 100)}.`,
        }))
      },
      () => {
        const d = pick([5, 7, 8, 9, 10, 12]), n = randInt(1, d - 1)
        return fraction(`La probabilité que la cloche du monastère sonne à l'heure est ${F(n, d)}. Quelle est la probabilité qu'elle ne sonne pas à l'heure ?`, d - n, d, {
          explanation: `Événement contraire : 1 − ${F(n, d)} = ${F(d, d)} − ${F(n, d)} = ${F(d - n, d)}.`,
        })
      },
      () => {
        const p = randInt(1, 19) * 5
        return numeric(`La météo annonce ${p} % de risque d'orage pour le tournoi. Quelle est la probabilité, en %, qu'il n'y ait pas d'orage ?`, 100 - p, {
          explanation: `Événement contraire : 100 − ${p} = ${100 - p} %.`,
        })
      },
    ),
  ],
  [
    // Moyenne à partir d'un tableau d'effectifs ou de coefficients
    variants(
      ...([
        ['Au concours de tir à l’arc', 'ont marqué', ' points', 'archers'], ['Au contrôle de maths', 'ont eu', ' sur 20', 'élèves'],
        ['Au scriptorium, en une journée', 'ont copié', ' pages', 'moines'],
      ] as [string, string, string, string][]).map(([ctx, verb, unit, who]) => () => {
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
      }),
      () => {
        let a = 0, b = 0, ca = 0, cb = 0
        while (!a || ((a * ca + b * cb) * 100) % (ca + cb)) { a = randInt(6, 18); b = randInt(6, 18); ca = randInt(1, 3); cb = randInt(1, 3) }
        const m = (a * ca + b * cb) / (ca + cb)
        return numeric(`${prenom()} a eu ${a} à un devoir de coefficient ${ca} et ${b} à un devoir de coefficient ${cb}. Quelle est sa moyenne ?`, m, {
          explanation: `(${a} × ${ca} + ${b} × ${cb}) ÷ (${ca} + ${cb}) = ${a * ca + b * cb} ÷ ${ca + cb} = ${fmt(m)}.`,
        })
      },
    ),
    // Fréquence en pourcentage
    variants(
      fresh(() => {
        const total = pick([20, 25, 40, 50]), part = randInt(1, total - 1)
        return numeric(`Dans une armée de ${total} soldats, ${part} sont des archers. Quelle est la fréquence des archers (en %) ?`, (part / total) * 100, {
          explanation: `${part} ÷ ${total} = ${fmt(part / total)}, soit ${fmt((part / total) * 100)} %.`,
        })
      }),
      fresh(() => {
        const total = pick([20, 25, 50]), part = randInt(2, total - 1)
        return numeric(`Sur ${total} élèves interrogés, ${part} préfèrent le football. Quelle est la fréquence de cette réponse (en %) ?`, (part / total) * 100, {
          explanation: `${part} ÷ ${total} = ${fmt(part / total)}, soit ${fmt((part / total) * 100)} %.`,
        })
      }),
      fresh(() => {
        const total = pick([40, 50, 200]), part = randInt(1, total - 1)
        return numeric(`Un lanceur de javelot réussit ${part} lancers sur ${total}. Quelle est la fréquence de réussite (en %) ?`, (part / total) * 100, {
          explanation: `${part} ÷ ${total} = ${fmt(part / total)}, soit ${fmt((part / total) * 100)} %.`,
        })
      }),
    ),
    // Probabilités : cartes, dés, lettres
    variants(
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
        const word = pick(['ALCHIMISTE', 'TOURNOI', 'BIBLIOTHEQUE', 'PARCHEMIN', 'ENLUMINURE', 'MATHEMATIQUES'])
        const letter = pick([...new Set(word)].filter((c) => [...word].filter((x) => x === c).length > 1).concat([...new Set(word)].slice(0, 2)))
        const n = [...word].filter((x) => x === letter).length
        return fraction(`On place les lettres du mot ${word} dans un sac (une lettre par jeton) et on en tire une au hasard. Quelle est la probabilité de tirer la lettre ${letter} ?`, n, word.length, {
          explanation: `Le mot a ${word.length} lettres, dont ${n} « ${letter} » : ${F(n, word.length)}.`,
        })
      },
      () => {
        const couples: [number, number][] = []
        for (let i = 1; i <= 6; i++) for (let j = 1; j <= 6; j++) couples.push([i, j])
        const [txt, ok] = pick<[string, (c: [number, number]) => boolean]>([
          ['une somme égale à 7', (c) => c[0] + c[1] === 7], ['un double', (c) => c[0] === c[1]],
          ['une somme supérieure ou égale à 10', (c) => c[0] + c[1] >= 10], ['une somme égale à 4', (c) => c[0] + c[1] === 4],
          ['une somme égale à 11', (c) => c[0] + c[1] === 11], ['une somme égale à 9', (c) => c[0] + c[1] === 9],
        ])
        const fav = couples.filter(ok)
        return fraction(`On lance deux dés équilibrés à six faces et on note le couple de résultats (36 couples équiprobables). Quelle est la probabilité d'obtenir ${txt} ?`, fav.length, 36, {
          explanation: `Couples favorables : ${fav.map((c) => c.join('-')).join(', ')}, soit ${fav.length} sur 36 : ${F(fav.length, 36)}.`,
        })
      },
    ),
    // Étendue : retrouver une valeur extrême
    variants(
      () => {
        const old = randInt(60, 85), e = randInt(30, old - 18)
        return numeric(`Au monastère, le moine le plus âgé a ${old} ans et l'étendue des âges est de ${e} ans. Quel âge a le plus jeune ?`, old - e, {
          explanation: `Étendue = plus âgé − plus jeune, donc plus jeune = ${old} − ${e} = ${old - e} ans.`,
        })
      },
      () => {
        const young = randInt(16, 25), e2 = randInt(35, 60)
        return numeric(`Au monastère, le plus jeune novice a ${young} ans et l'étendue des âges est de ${e2} ans. Quel âge a le moine le plus âgé ?`, young + e2, {
          explanation: `Plus âgé = plus jeune + étendue = ${young} + ${e2} = ${young + e2} ans.`,
        })
      },
      () => {
        const lo = randInt(-8, 5), e = randInt(8, 20)
        return numeric(`Cette semaine, la température la plus basse a été ${fmt(lo)} °C et l'étendue des températures est de ${e} °C. Quelle a été la température la plus haute (en °C) ?`, lo + e, {
          explanation: `Plus haute = plus basse + étendue = ${fmt(lo)} + ${e} = ${fmt(lo + e)} °C.`,
        })
      },
      () => {
        const hi = randInt(15, 20), e = randInt(5, 12)
        return numeric(`Dans une classe, la meilleure note du contrôle est ${hi} et l'étendue des notes est ${e}. Quelle est la plus basse note ?`, hi - e, {
          explanation: `Plus basse = meilleure − étendue = ${hi} − ${e} = ${hi - e}.`,
        })
      },
    ),
    // Fréquence de la catégorie restante (en %)
    variants(
      () => {
        const N = pick([20, 25, 40, 50])
        let a = randInt(1, N - 2), b = randInt(1, N - 2)
        while (a + b >= N) { a = randInt(1, N - 2); b = randInt(1, N - 2) }
        const c = N - a - b
        return numeric(`La bibliothèque du monastère possède ${N} manuscrits : ${a} en latin, ${b} en grec et les autres en hébreu. Quelle est la fréquence des manuscrits en hébreu (en %) ?`, (c / N) * 100, {
          explanation: `Manuscrits en hébreu : ${N} − ${a} − ${b} = ${c}. Fréquence : ${c} ÷ ${N} = ${fmt(c / N)}, soit ${fmt((c / N) * 100)} %.`,
        })
      },
      () => {
        const N = pick([20, 25, 50])
        let a = randInt(1, N - 2), b = randInt(1, N - 2)
        while (a + b >= N) { a = randInt(1, N - 2); b = randInt(1, N - 2) }
        const c = N - a - b
        return numeric(`Sur les ${N} élèves d'une classe, ${a} viennent à pied, ${b} en bus et les autres à vélo. Quelle est la fréquence des élèves venant à vélo (en %) ?`, (c / N) * 100, {
          explanation: `À vélo : ${N} − ${a} − ${b} = ${c}. Fréquence : ${c} ÷ ${N} = ${fmt(c / N)}, soit ${fmt((c / N) * 100)} %.`,
        })
      },
      () => {
        const p1 = randInt(2, 6) * 5, p2 = randInt(2, 8) * 5
        return numeric(`Dans le verger, ${p1} % des arbres sont des pommiers, ${p2} % des poiriers, et les autres des pruniers. Quelle est la fréquence des pruniers (en %) ?`, 100 - p1 - p2, {
          explanation: `Le total des fréquences vaut 100 % : 100 − ${p1} − ${p2} = ${100 - p1 - p2} %.`,
        })
      },
    ),
  ],
  [
    // Probabilité de « ne pas… »
    variants(
      () => {
        const r = randInt(2, 9), b = randInt(2, 9), v = randInt(1, 6), total = r + b + v
        return fraction(`Un coffre contient ${r} rubis, ${b} saphirs et ${v} émeraude${s(v)}. On en prend une pierre au hasard. Quelle est la probabilité que ce ne soit PAS un rubis ?`, b + v, total, {
          explanation: `${b} + ${v} = ${b + v} pierres ne sont pas des rubis, sur ${total} : ${F(b + v, total)}.`,
        })
      },
      () => {
        const face = randInt(1, 6)
        return fraction(`On lance un dé équilibré à six faces. Quelle est la probabilité de ne PAS obtenir le ${face} ?`, 5, 6, {
          explanation: `Événement contraire de « obtenir le ${face} » (probabilité ${F(1, 6)}) : 1 − ${F(1, 6)} = ${F(5, 6)}.`,
        })
      },
      () => {
        const deck = pick([32, 52]), [txt, n] = pick<[string, number]>([['un cœur', deck / 4], ['un as', 4], ['une figure', 12], ['un roi', 4]])
        return fraction(`On tire une carte dans un jeu de ${deck} cartes. Quelle est la probabilité de ne PAS tirer ${txt} ?`, deck - n, deck, {
          explanation: `${n} cartes donnent « ${txt} », donc ${deck} − ${n} = ${deck - n} ne le donnent pas : ${F(deck - n, deck)}.`,
        })
      },
      () => {
        const N = pick([20, 30, 50, 100]), g = randInt(1, N / 5)
        return fraction(`À la loterie de la foire, ${g} billets sur ${N} sont gagnants. Quelle est la probabilité qu'un billet acheté au hasard ne soit pas gagnant ?`, N - g, N, {
          explanation: `${N} − ${g} = ${N - g} billets perdants sur ${N} : ${F(N - g, N)}.`,
        })
      },
    ),
    // Moyenne pondérée, arrondie
    variants(
      () => {
        const v1 = randInt(8, 14), n1 = randInt(1, 5), v2 = randInt(15, 20), n2 = randInt(1, 5)
        const mean = (v1 * n1 + v2 * n2) / (n1 + n2), r = Math.round(mean * 10) / 10
        return numeric(`${n1} soldat${s(n1)} ${n1 > 1 ? 'ont' : 'a'} ${v1} ans d'expérience et ${n2} soldat${s(n2)} en ${n2 > 1 ? 'ont' : 'a'} ${v2}. Quelle est l'expérience moyenne (arrondie au dixième) ?`, r, {
          explanation: `(${v1} × ${n1} + ${v2} × ${n2}) ÷ ${n1 + n2} = ${v1 * n1 + v2 * n2} ÷ ${n1 + n2} ≈ ${fmt(r)} ans.`,
        })
      },
      () => {
        const a = randInt(6, 18), b = randInt(6, 18), c = randInt(6, 18), ca = randInt(1, 3), cb = randInt(1, 3), cc = randInt(1, 3)
        const m = (a * ca + b * cb + c * cc) / (ca + cb + cc), r = Math.round(m * 10) / 10
        return numeric(`${prenom()} a obtenu ${a} (coefficient ${ca}), ${b} (coefficient ${cb}) et ${c} (coefficient ${cc}). Quelle est sa moyenne, arrondie au dixième ?`, r, {
          explanation: `(${a} × ${ca} + ${b} × ${cb} + ${c} × ${cc}) ÷ ${ca + cb + cc} = ${a * ca + b * cb + c * cc} ÷ ${ca + cb + cc} ≈ ${fmt(r)}.`,
        })
      },
      () => {
        const t = [randInt(140, 150), randInt(151, 160), randInt(161, 170)], c = t.map(() => randInt(2, 9))
        const m = sum(t.map((v, i) => v * c[i])) / sum(c), r = Math.round(m * 10) / 10
        return numeric(`Dans un club, ${c[0]} enfants mesurent ${t[0]} cm, ${c[1]} mesurent ${t[1]} cm et ${c[2]} mesurent ${t[2]} cm. Quelle est leur taille moyenne (en cm, arrondie au dixième) ?`, r, {
          explanation: `(${t.map((v, i) => `${v} × ${c[i]}`).join(' + ')}) ÷ ${sum(c)} = ${sum(t.map((v, i) => v * c[i]))} ÷ ${sum(c)} ≈ ${fmt(r)} cm.`,
        })
      },
    ),
    // Une nouvelle valeur change la moyenne
    variants(
      fresh(() => {
        let n = 0, m = 0, x = 0
        while (!n || !Number.isInteger(((n * m + x) * 100) / (n + 1))) { n = randInt(3, 5); m = randInt(9, 14); x = randInt(5, 20) }
        const p = prenom()
        return numeric(`Après ${n} contrôles, ${p} a une moyenne de ${m}. ${p} obtient ${x} au contrôle suivant. Quelle est sa nouvelle moyenne ?`, (n * m + x) / (n + 1), {
          explanation: `Total des ${n} premières notes : ${n} × ${m} = ${n * m}. Nouveau total : ${n * m + x}, divisé par ${n + 1} : ${fmt((n * m + x) / (n + 1))}.`,
        })
      }),
      fresh(() => {
        let n = 0, m = 0, x = 0
        while (!n || ((n * m + x) % (n + 1))) { n = randInt(4, 9); m = randInt(20, 40); x = randInt(10, 60) }
        return numeric(`Les ${n} moines d'un atelier ont en moyenne ${m} ans. Un nouveau moine de ${x} ans les rejoint. Quel est le nouvel âge moyen (en années) ?`, (n * m + x) / (n + 1), {
          explanation: `Somme des âges : ${n} × ${m} = ${n * m}, puis + ${x} = ${n * m + x}. Moyenne : ${n * m + x} ÷ ${n + 1} = ${(n * m + x) / (n + 1)} ans.`,
        })
      }),
      fresh(() => {
        let n = 0, m = 0, x = 0
        while (!n || ((n * m - x) % (n - 1)) || x >= n * m) { n = randInt(4, 6); m = randInt(10, 15); x = randInt(3, 9) }
        return numeric(`Sur ${n} devoirs, ${prenom()} a ${m} de moyenne. Le professeur décide d'enlever la plus mauvaise note, ${x}. Quelle est la nouvelle moyenne ?`, (n * m - x) / (n - 1), {
          explanation: `Total : ${n} × ${m} = ${n * m}. Sans la note ${x} : ${n * m - x}, divisé par ${n - 1} : ${(n * m - x) / (n - 1)}.`,
        })
      }),
    ),
    // Probabilité en écriture décimale
    variants(
      () => {
        const N = pick([4, 5, 10, 20, 25, 50]), k = randInt(1, N - 1)
        return decimalOnly(numeric(`Le frère cellérier range ${N} bouteilles dans la cave, dont ${k} de cidre. Il en prend une au hasard. Quelle est la probabilité que ce soit une bouteille de cidre ? (écriture décimale)`, k / N, {
          explanation: `${k} cas favorables sur ${N} : ${k} ÷ ${N} = ${fmt(k / N)}.`,
        }))
      },
      () => {
        const N = pick([4, 5, 10, 20, 25, 50]), k = randInt(1, N - 1)
        return decimalOnly(numeric(`Une urne contient ${N} boules, dont ${k} verte${s(k)}. On tire une boule au hasard. Quelle est la probabilité qu'elle soit verte ? (écriture décimale)`, k / N, {
          explanation: `${k} cas favorables sur ${N} : ${k} ÷ ${N} = ${fmt(k / N)}.`,
        }))
      },
      () => {
        const N = pick([4, 5, 8, 10, 20]), k = randInt(1, N - 1)
        return decimalOnly(numeric(`Une roue de loterie est partagée en ${N} secteurs égaux, dont ${k} gagnant${s(k)}. On fait tourner la roue. Quelle est la probabilité de tomber sur un secteur gagnant ? (écriture décimale)`, k / N, {
          explanation: `${k} cas favorables sur ${N} : ${k} ÷ ${N} = ${fmt(k / N)}.`,
        }))
      },
    ),
    // Retrouver un effectif à partir d'une fréquence
    variants(
      () => {
        let N = 0, p = 0
        while (!N || (N * p) % 100) { N = pick([40, 60, 80, 120, 150, 200]); p = pick([5, 10, 15, 20, 25, 30, 35, 45]) }
        const role = pick(['copistes', 'jardiniers', 'chantres', 'enlumineurs'])
        return numeric(`Le monastère compte ${N} moines. La fréquence des ${role} est de ${p} %. Combien y a-t-il de ${role} ?`, (N * p) / 100, {
          explanation: `${p} % de ${N} = ${N} × ${p} ÷ 100 = ${(N * p) / 100}.`,
        })
      },
      () => {
        const [n, d] = pick([[1, 4], [3, 4], [2, 5], [3, 10], [5, 8], [1, 3]]), N = d * randInt(4, 12)
        return numeric(`Dans un collège de ${N} élèves, la fréquence des demi-pensionnaires est ${F(n, d)}. Combien y a-t-il de demi-pensionnaires ?`, (N * n) / d, {
          explanation: `${F(n, d)} de ${N} = ${N} ÷ ${d} × ${n} = ${(N * n) / d}.`,
        })
      },
      () => {
        const f = pick([0.1, 0.2, 0.25, 0.4, 0.75]), N = pick([20, 40, 60, 80, 100])
        return numeric(`Sur ${N} lancers, la fréquence des tirs réussis est ${fmt(f)}. Combien de tirs ont été réussis ?`, f * N, {
          explanation: `${N} × ${fmt(f)} = ${fmt(f * N)} tirs.`,
        })
      },
    ),
  ],
  [
    // La note (ou la valeur) manquante pour atteindre une moyenne
    variants(
      fresh(() => {
        let target = 0, a = 0, b = 0, c = 0, need = -1
        while (need < 0 || need > 20) { target = randInt(10, 14); a = randInt(6, 18); b = randInt(6, 18); c = randInt(6, 18); need = 4 * target - a - b - c }
        return numeric(`Un élève a eu ${a}, ${b} et ${c}. Quelle note doit-il obtenir au 4ᵉ devoir pour avoir exactement ${target} de moyenne ?`, need, {
          explanation: `Il faut un total de 4 × ${target} = ${4 * target}, il a déjà ${a + b + c}, donc ${4 * target} − ${a + b + c} = ${need}.`,
        })
      }),
      fresh(() => {
        let target = 0, vals: number[] = [], need = -1
        while (need < 0 || need > 10) { target = randInt(5, 8); vals = Array.from({ length: 4 }, () => randInt(2, 10)); need = 5 * target - sum(vals) }
        return numeric(`Un archer a marqué ${vals.join(' ; ')} points lors de ses quatre premières flèches. Combien doit-il marquer à la cinquième pour avoir une moyenne de ${target} points par flèche ?`, need, {
          explanation: `Total visé : 5 × ${target} = ${5 * target}. Déjà marqués : ${sum(vals)}. Il manque ${5 * target} − ${sum(vals)} = ${need} points.`,
        })
      }),
      fresh(() => {
        let target = 0, vals: number[] = [], need = -100
        while (need < -5 || need > 25) { target = randInt(8, 16); vals = Array.from({ length: 4 }, () => randInt(2, 22)); need = 5 * target - sum(vals) }
        return numeric(`Températures relevées à midi du lundi au jeudi : ${vals.map((v) => `${v} °C`).join(' ; ')}. Quelle température faut-il vendredi pour que la moyenne des cinq jours soit ${target} °C ?`, need, {
          explanation: `Total visé : 5 × ${target} = ${5 * target}. Déjà : ${sum(vals)}. Vendredi : ${5 * target} − ${sum(vals)} = ${fmt(need)} °C.`,
        })
      }),
    ),
    // Modifier une urne pour obtenir une probabilité
    variants(
      fresh(() => {
        const r = randInt(2, 6), b = r + randInt(2, 8)
        return numeric(`Un sac contient ${r} boules rouges et ${b} boules bleues. Combien de boules rouges faut-il ajouter pour que la probabilité de tirer une rouge soit de ${F(1, 2)} ?`, b - r, {
          explanation: `Il faut autant de rouges que de bleues : ${b} − ${r} = ${b - r}.`,
        })
      }),
      fresh(() => {
        const r = randInt(3, 8), b = randInt(1, 2 * r - 1)
        return numeric(`Un sac contient ${r} boules rouges et ${b} boules bleue${s(b)}. Combien de boules bleues faut-il ajouter pour que la probabilité de tirer une rouge soit de ${F(1, 3)} ?`, 2 * r - b, {
          explanation: `Pour une probabilité de ${F(1, 3)}, il faut 2 bleues pour 1 rouge : ${2 * r} bleues. On en ajoute ${2 * r} − ${b} = ${2 * r - b}.`,
        })
      }),
      fresh(() => {
        const g = randInt(2, 5), k = pick([4, 5]), p = g * (k - 1) + randInt(1, 6)
        return numeric(`Une roue de loterie a ${g} secteurs gagnants et ${p} perdants, tous de même taille. Combien de secteurs perdants faut-il enlever pour que la probabilité de gagner soit ${F(1, k)} ?`, p - g * (k - 1), {
          explanation: `Pour ${F(1, k)}, il faut ${k - 1} perdants par gagnant : ${g} × ${k - 1} = ${g * (k - 1)} perdants. On en enlève ${p} − ${g * (k - 1)} = ${p - g * (k - 1)}.`,
        })
      }),
    ),
    // Moyenne de deux groupes réunis
    variants(
      () => {
        let n1 = 0, n2 = 0, m1 = 0, m2 = 0
        while (!n1 || ((n1 * m1 + n2 * m2) * 10) % (n1 + n2)) { n1 = randInt(5, 15); n2 = randInt(3, 12); m1 = randInt(35, 60); m2 = randInt(16, 25) }
        const N = n1 + n2, S = n1 * m1 + n2 * m2
        return numeric(`Au monastère, les ${n1} moines ont en moyenne ${m1} ans et les ${n2} novices ont en moyenne ${m2} ans. Quel est l'âge moyen de toute la communauté (en années) ?`, S / N, {
          explanation: `Somme des âges : ${n1} × ${m1} + ${n2} × ${m2} = ${n1 * m1} + ${n2 * m2} = ${S}. Moyenne : ${S} ÷ ${N} = ${fmt(S / N)} ans.`,
        })
      },
      () => {
        let n1 = 0, n2 = 0, m1 = 0, m2 = 0
        while (!n1 || m1 === m2 || ((n1 * m1 + n2 * m2) * 10) % (n1 + n2)) { n1 = randInt(20, 30); n2 = randInt(20, 30); m1 = randInt(9, 14); m2 = randInt(9, 14) }
        const N = n1 + n2, S = n1 * m1 + n2 * m2
        return numeric(`Au contrôle commun, les ${n1} élèves de 5ᵉ A ont ${m1} de moyenne et les ${n2} élèves de 5ᵉ B ont ${m2}. Quelle est la moyenne des deux classes réunies ?`, S / N, {
          explanation: `Total des notes : ${n1} × ${m1} + ${n2} × ${m2} = ${S}. Moyenne : ${S} ÷ ${N} = ${fmt(S / N)}.`,
        })
      },
      () => {
        let n1 = 0, n2 = 0, m1 = 0, m2 = 0
        while (!n1 || ((n1 * m1 + n2 * m2) * 10) % (n1 + n2)) { n1 = randInt(3, 10); n2 = randInt(3, 10); m1 = randInt(20, 40); m2 = randInt(40, 70) }
        const N = n1 + n2, S = n1 * m1 + n2 * m2
        return numeric(`Une caravane compte ${n1} ânes portant en moyenne ${m1} kg et ${n2} chevaux portant en moyenne ${m2} kg. Quelle est la charge moyenne par animal (en kg) ?`, S / N, {
          explanation: `Charge totale : ${n1} × ${m1} + ${n2} × ${m2} = ${S} kg. Moyenne : ${S} ÷ ${N} = ${fmt(S / N)} kg.`,
        })
      },
    ),
    // Retrouver un effectif à partir d'une probabilité
    variants(
      () => {
        const d = pick([3, 4, 5, 6, 8]), n = pick([1, 2, 3, 5, 7].filter((v) => v < d && gcd(v, d) === 1)), N = d * randInt(3, 10)
        return numeric(`Le frère bibliothécaire range ${N} manuscrits dans un coffre. Si on en prend un au hasard, la probabilité qu'il soit enluminé est ${F(n, d)}. Combien de manuscrits enluminés y a-t-il ?`, (N * n) / d, {
          explanation: `${F(n, d)} des ${N} manuscrits : ${N} ÷ ${d} × ${n} = ${(N * n) / d}.`,
        })
      },
      () => {
        const p = pick([0.2, 0.25, 0.4, 0.6, 0.75]), N = pick([20, 40, 60, 80])
        return numeric(`Une urne contient ${N} boules. La probabilité de tirer une boule blanche est ${fmt(p)}. Combien y a-t-il de boules blanches ?`, p * N, {
          explanation: `${N} × ${fmt(p)} = ${fmt(p * N)} boules blanches.`,
        })
      },
      fresh(() => {
        const d = pick([3, 4, 5, 6]), k = randInt(1, 4)
        return numeric(`Sur une roue de loterie, il y a ${k} secteur${s(k)} gagnant${s(k)} et la probabilité de gagner est ${F(1, d)}. Combien la roue a-t-elle de secteurs en tout ?`, k * d, {
          explanation: `Les secteurs gagnants représentent ${F(1, d)} du total : ${k} × ${d} = ${k * d} secteurs.`,
        })
      }),
    ),
    // Corriger une moyenne
    variants(
      fresh(() => {
        let n = 0, m = 0, wrong = 0, right = 0
        while (!n || wrong === right || !Number.isInteger(((n * m - wrong + right) * 100) / n)) { n = pick([4, 5, 8, 10, 20]); m = randInt(10, 18); wrong = randInt(5, 20); right = randInt(5, 20) }
        return numeric(`${cap(frere())} a calculé une moyenne de ${m} sur ${n} relevés de pluie (en mm). Il s'aperçoit qu'il a recopié ${wrong} au lieu de ${right}. Quelle est la vraie moyenne ?`, (n * m - wrong + right) / n, {
          explanation: `Total faux : ${n} × ${m} = ${n * m}. Total corrigé : ${n * m} − ${wrong} + ${right} = ${n * m - wrong + right}. Moyenne : ${n * m - wrong + right} ÷ ${n} = ${fmt((n * m - wrong + right) / n)}.`,
        })
      }),
      fresh(() => {
        let n = 0, m = 0, x = 0
        while (!n || !Number.isInteger(((n * m + x) * 100) / (n + 1))) { n = randInt(4, 9); m = randInt(10, 16); x = randInt(4, 20) }
        return numeric(`Le professeur a calculé une moyenne de ${m} sur ${n} copies, mais il avait oublié une copie notée ${x}. Quelle est la vraie moyenne des ${n + 1} copies ?`, (n * m + x) / (n + 1), {
          explanation: `Total : ${n} × ${m} + ${x} = ${n * m + x}. Moyenne : ${n * m + x} ÷ ${n + 1} = ${fmt((n * m + x) / (n + 1))}.`,
        })
      }),
      fresh(() => {
        let n = 0, m = 0, d = 0
        while (!n || !Number.isInteger((d * 100) / n)) { n = pick([4, 5, 8, 10]); m = randInt(10, 15); d = randInt(1, 6) }
        return numeric(`Après correction, chacune des ${n} notes d'un élève est augmentée de ${d} point${s(d)}, sauf une qui ne change pas. La moyenne valait ${m}. Que vaut la nouvelle moyenne ?`, m + (d * (n - 1)) / n, {
          explanation: `Le total augmente de ${d} × ${n - 1} = ${d * (n - 1)}. Nouvelle moyenne : (${n} × ${m} + ${d * (n - 1)}) ÷ ${n} = ${fmt(m + (d * (n - 1)) / n)}.`,
        })
      }),
    ),
    // Probabilité après un premier tirage
    variants(
      () => {
        const r = randInt(5, 12), b = randInt(3, 10), k = randInt(1, r - 2)
        return fraction(`Dans le panier du frère cellérier, il y a ${r} pommes rouges et ${b} pommes vertes. Il mange ${k} pomme${s(k)} rouge${s(k)}. On prend ensuite une pomme au hasard dans le panier : quelle est la probabilité qu'elle soit rouge ?`, r - k, r - k + b, {
          explanation: `Il reste ${r - k} rouges et ${b} vertes, soit ${r - k + b} pommes : probabilité ${F(r - k, r - k + b)}.`,
        })
      },
      () => {
        const r = randInt(3, 8), b = randInt(3, 8)
        return fraction(`Un sac contient ${r} jetons rouges et ${b} jetons bleus. On tire un jeton bleu et on le garde. On tire ensuite un deuxième jeton : quelle est la probabilité qu'il soit bleu ?`, b - 1, r + b - 1, {
          explanation: `Il reste ${r} rouges et ${b - 1} bleu${s(b - 1)}, soit ${r + b - 1} jetons : probabilité ${F(b - 1, r + b - 1)}.`,
        })
      },
      () => {
        const deck = 32, n = randInt(1, 3)
        return fraction(`On retire ${n} as d'un jeu de 32 cartes. On tire ensuite une carte au hasard parmi les cartes restantes : quelle est la probabilité que ce soit un as ?`, 4 - n, deck - n, {
          explanation: `Il reste ${4 - n} as parmi ${deck - n} cartes : ${F(4 - n, deck - n)}.`,
        })
      },
    ),
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
