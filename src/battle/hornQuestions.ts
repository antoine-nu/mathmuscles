// Questions de calcul mental pour sonner le cor de guerre pendant la bataille : rapides, sans papier.
import { fmt, numeric, par, pick, randInt, randNonZero, type Exercise } from '../exercises/utils'

const CINQUIEME: (() => Exercise)[] = [
  () => { const a = randInt(3, 12), b = randInt(3, 12); return numeric(`${a} × ${b} = ?`, a * b, { explanation: `${a} × ${b} = ${a * b}` }) },
  () => { const a = randNonZero(-15, 15), b = randNonZero(-15, 15); return numeric(`${fmt(a)} + ${par(b)} = ?`, a + b, { explanation: `${fmt(a + b)}` }) },
  () => { const n = 2 * randInt(6, 40); return numeric(`La moitié de ${n} ?`, n / 2, { explanation: `${n / 2}` }) },
  () => { const a = randInt(20, 90), b = randInt(11, 49); return numeric(`${a} + ${b} = ?`, a + b, { explanation: `${a + b}` }) },
  () => { const p = pick([10, 25, 50]), n = pick([40, 80, 120, 200]); return numeric(`${p} % de ${n} ?`, (p * n) / 100, { explanation: `${(p * n) / 100}` }) },
]

const SECONDE: (() => Exercise)[] = [
  () => { const a = randInt(11, 19); return numeric(`${a}² = ?`, a * a, { explanation: `${a * a}` }) },
  () => { const a = randNonZero(-12, 12), b = randNonZero(-9, 9); return numeric(`${par(a)} × ${par(b)} = ?`, a * b, { explanation: `${fmt(a * b)}` }) },
  () => { const n = randInt(3, 10); return numeric(`2^${n} = ?`, 2 ** n, { explanation: `${2 ** n}` }) },
  () => { const a = randInt(2, 9), x = randInt(-6, 6), b = randInt(-9, 9); return numeric(`f(x) = ${a}x ${b < 0 ? '−' : '+'} ${Math.abs(b)} : f(${fmt(x)}) = ?`, a * x + b, { explanation: `${fmt(a * x + b)}` }) },
  () => { const k = randInt(4, 15); return numeric(`√{${k * k}} = ?`, k, { explanation: `${k}` }) },
]

export function hornQuestion(levelId: string): Exercise {
  return pick(levelId === '2nde' ? SECONDE : CINQUIEME)()
}
