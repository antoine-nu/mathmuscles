// Tournoi automatique d'équilibrage : chaque type d'unité affronte chaque autre à coût égal.
//   npm run balance            (BUDGET=24 TIER=2 RUNS=24 par défaut)
import { Battle } from '../src/battle/sim'
import { UNIT_STATS } from '../src/battle/units'
import type { ArmySpec, Regiment } from '../src/game/state'
import type { UnitKind } from '../src/data/curriculum'

const KINDS: UnitKind[] = ['infantry', 'spear', 'archer', 'scout', 'knight', 'siege', 'monk']
const BUDGET = Number(process.env.BUDGET ?? 24)
const TIER = Number(process.env.TIER ?? 2)
const RUNS = Number(process.env.RUNS ?? 24)
const UPS = Number(process.env.UPS ?? 0)

function reg(kind: UnitKind, points: number): Regiment {
  // rang imposé : on applique directement le coût de l’unité (sans la règle des villageois du cran 0)
  return { chapterId: kind, kind, tier: TIER, upgrades: UPS, points, figures: Math.floor(points / UNIT_STATS[kind].cost) }
}
const mono = (kind: UnitKind): ArmySpec => ({ levelId: 'x', age: 1, regiments: [reg(kind, BUDGET)] })
const mixed = (kinds: UnitKind[]): ArmySpec => ({ levelId: 'x', age: 1, regiments: kinds.map((k) => reg(k, Math.round(BUDGET / kinds.length))) })

function duel(a: ArmySpec, b: ArmySpec) {
  let wa = 0, dur = 0
  for (let i = 0; i < RUNS; i++) {
    // on alterne les côtés pour annuler tout biais de déploiement
    const flip = i % 2 === 1
    const r = new Battle(flip ? [b, a] : [a, b], 1000 + i).run()!
    const aWon = flip ? r.winner === 1 : r.winner === 0
    wa += aWon ? 1 : r.winner === -1 ? 0.5 : 0
    dur += r.duration
  }
  return { rate: wa / RUNS, dur: dur / RUNS }
}

const pad = (s: string, n: number) => s.padEnd(n).slice(0, n)
console.log(`Budget ${BUDGET} bonnes réponses, rang ${TIER}, améliorations ${UPS}, ${RUNS} batailles par duel\n`)
console.log(pad('', 10) + KINDS.map((k) => pad(k, 9)).join('') + ' moyenne')
const avg: Record<string, number> = {}
for (const a of KINDS) {
  let line = pad(a, 10), sum = 0
  for (const b of KINDS) {
    if (a === b) { line += pad('  —', 9); continue }
    const { rate } = duel(mono(a), mono(b))
    sum += rate
    line += pad(`  ${Math.round(rate * 100)}%`, 9)
  }
  avg[a] = sum / (KINDS.length - 1)
  console.log(line + `  ${Math.round(avg[a] * 100)}%`)
}
console.log('\nFigurines par armée : ' + KINDS.map((k) => `${k} ${Math.floor(BUDGET / UNIT_STATS[k].cost)}`).join(', '))

const combos: UnitKind[][] = [
  ['infantry', 'archer', 'knight'], ['spear', 'archer', 'monk'], ['infantry', 'spear', 'archer', 'scout', 'knight', 'siege', 'monk'],
  ['knight', 'scout'], ['archer', 'siege'],
]
console.log('\nArmées mixtes contre armées d’un seul type (taux de victoire de la mixte) :')
for (const c of combos) {
  const rates = KINDS.map((k) => duel(mixed(c), mono(k)).rate)
  console.log(`  ${pad(c.join('+'), 52)} ` + rates.map((r, i) => `${KINDS[i].slice(0, 5)} ${Math.round(r * 100)}%`).join(' · '))
}
const d = duel(mono('infantry'), mono('archer'))
console.log(`\nDurée moyenne infanterie vs archers : ${d.dur.toFixed(1)} s`)
console.log(`Stats : ` + KINDS.map((k) => `${k} ${UNIT_STATS[k].hp}pv`).join(', '))

// ── Armées mixtes réalistes (plafond de 50 bonnes réponses par maison) ──
const rnd = (() => { let a = 12345; return () => ((a = (a * 1664525 + 1013904223) >>> 0) / 4294967296) })()
function randomArmy(budget: number): ArmySpec {
  const n = 2 + Math.floor(rnd() * 4)
  const kinds = [...KINDS].sort(() => rnd() - 0.5).slice(0, n)
  const weights = kinds.map(() => 0.3 + rnd())
  const total = weights.reduce((a, b) => a + b, 0)
  return { levelId: 'x', age: 1, regiments: kinds.map((k, i) => reg(k, Math.min(50, Math.max(1, Math.round((budget * weights[i]) / total))))) }
}
const MIX = Number(process.env.MIX ?? 300)
const MIXB = Number(process.env.MIXB ?? 60)
const presence: Record<string, { more: number; win: number }> = Object.fromEntries(KINDS.map((k) => [k, { more: 0, win: 0 }]))
for (let i = 0; i < MIX; i++) {
  const a = randomArmy(MIXB), b = randomArmy(MIXB)
  const r = new Battle([a, b], 5000 + i).run()!
  if (r.winner === -1) continue
  const share = (army: ArmySpec, k: string) => army.regiments.filter((g) => g.kind === k).reduce((s, g) => s + g.points, 0)
  const sizeA = a.regiments.reduce((s, g) => s + g.points, 0), sizeB = b.regiments.reduce((s, g) => s + g.points, 0)
  for (const k of KINDS) {
    const da = share(a, k) / sizeA, db = share(b, k) / sizeB
    if (Math.abs(da - db) < 0.1) continue
    presence[k].more++
    if ((da > db) === (r.winner === 0)) presence[k].win++
  }
}
console.log(`\nArmées mixtes aléatoires (${MIX} batailles, ~${MIXB} bonnes réponses) — l'armée qui a le plus de X gagne :`)
console.log('  ' + KINDS.map((k) => `${k} ${Math.round((presence[k].win / Math.max(1, presence[k].more)) * 100)}%`).join(' · '))
