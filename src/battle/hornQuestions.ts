// Questions du cor de guerre : uniquement du calcul mental, de petites opérations sur des nombres simples,
// sans énoncé à lire. Le niveau dépend de la classe : tables et opérations posées de tête en 5e,
// relatifs, carrés, puissances et priorités en 2nde.
import { fmt, numeric, par, pick, randInt, randNonZero, type Exercise } from '../exercises/utils'

const calc = (expr: string, value: number) => numeric(`${expr} = ?`, value, { explanation: `${expr} = ${fmt(value)}` })

const CINQUIEME: (() => Exercise)[] = [
  // tables de multiplication
  () => { const a = randInt(3, 9), b = randInt(3, 9); return calc(`${a} × ${b}`, a * b) },
  // divisions exactes des tables
  () => { const a = randInt(3, 9), b = randInt(3, 9); return calc(`${a * b} ÷ ${a}`, b) },
  // additions à deux chiffres
  () => { const a = randInt(12, 68), b = randInt(11, 29); return calc(`${a} + ${b}`, a + b) },
  // soustractions à deux chiffres
  () => { const a = randInt(40, 99), b = randInt(11, a - 12); return calc(`${a} − ${b}`, a - b) },
  // multiplier par 10, 100 ou par 0,1
  () => { const a = randInt(2, 99) / pick([1, 10]), k = pick([10, 100]); return calc(`${fmt(a)} × ${k}`, Math.round(a * k * 100) / 100) },
  // nombres relatifs simples
  () => { const a = randNonZero(-9, 9), b = randNonZero(-9, 9); return calc(`${fmt(a)} + ${par(b)}`, a + b) },
  // priorités (petits nombres)
  () => { const a = randInt(2, 9), b = randInt(2, 6), c = randInt(2, 6); return calc(`${a} + ${b} × ${c}`, a + b * c) },
]

const SECONDE: (() => Exercise)[] = [
  // produits de relatifs
  () => { const a = -randInt(2, 9), b = pick([-1, 1]) * randInt(2, 9); return Math.random() < 0.5 ? calc(`${par(a)} × ${par(b)}`, a * b) : calc(`${par(b)} × ${par(a)}`, a * b) },
  // sommes de relatifs
  () => { const a = randNonZero(-20, 20), b = -randInt(2, 20), c = pick([-1, 1]) * randInt(2, 9); return calc(`${fmt(a)} + ${par(b)} − ${par(c)}`, a + b - c) },
  // carrés jusqu'à 15
  () => { const a = randInt(4, 15); return calc(`${a}²`, a * a) },
  // racines carrées parfaites
  () => { const k = randInt(2, 13); return numeric(`√{${k * k}} = ?`, k, { explanation: `${k}² = ${k * k}` }) },
  // puissances de 2 et de 10
  () => pick([() => { const n = randInt(2, 10); return calc(`2^${n}`, 2 ** n) }, () => { const n = randInt(-3, 4); return calc(`10^${n}`, 10 ** n) }])(),
  // priorités avec relatifs
  () => { const a = randInt(2, 9), b = randNonZero(-6, 6), c = randInt(2, 6); return calc(`${a} − ${b < 0 ? par(b) : b} × ${c}`, a - b * c) },
  // division et produit enchaînés
  () => { const a = randInt(2, 9), b = randInt(2, 9), c = randInt(2, 5); return calc(`${a * b} ÷ ${a} × ${c}`, b * c) },
]

export function hornQuestion(levelId: string): Exercise {
  return pick(levelId === '2nde' ? SECONDE : CINQUIEME)()
}
