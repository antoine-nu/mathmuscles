// Vérification automatique de tous les modèles d'exercices et de problèmes.
//   npm run check:exercises            → rapport d'anomalies
//   npm run check:exercises -- samples → affiche aussi un exemple par modèle
//   npm run check:exercises -- samples 5e-frac  → exemples d'un seul chapitre
import { AGE_PROBLEMS, TIERS, UPGRADE_PROBLEMS } from '../src/exercises/index'
import type { Exercise, Maker } from '../src/exercises/utils'
import { FIG_H, FIG_W } from '../src/exercises/figure'

const RUNS = Number(process.env.RUNS ?? 400)
const showSamples = process.argv.includes('samples')
const only = process.argv.find((a) => /^(5e|2|T)-/.test(a))
const problems: string[] = []
const samples: string[] = []
const variety: string[] = []
// Monotonie des modèles d'entraînement : un cran répète le même modèle pendant 10 exercices, il doit donc
// varier ses formulations (contexte, configuration, nombre de données) et ne pas donner la réponse dans l'énoncé.
const monotony: string[] = []
/** Squelette d'un énoncé : nombres remplacés par #, pour compter les formulations différentes. */
const skeleton = (s: string) => s.replace(/−?\d+(?:[,.]\d+)?/g, '#').replace(/\s+/g, ' ')
/** Nombres écrits dans un texte (avec la virgule décimale française). */
const numbersIn = (s: string) => (s.match(/−?\d+(?:,\d+)?/g) ?? []).map((x) => x.replace('−', '-').replace(',', '.'))
// Motifs d'écriture maladroite : « + − », « 1x », « −0 », valeurs non numériques…
const UGLY = /NaN|undefined|Infinity(?!\s*\])|\[object|\+ −|− −|\+ -|--|(?<![\d,])1x|−1x|−0(?![,\d])|\+ 0(?![,\d])|\(\+?0\)/

function inspect(where: string, make: Maker, training = false) {
  const prompts = new Set<string>()
  const skeletons = new Set<string>()
  let answerInPrompt = 0
  for (let i = 0; i < RUNS; i++) {
    let ex: Exercise
    try {
      ex = make()
    } catch (e) {
      problems.push(`${where} EXCEPTION ${(e as Error).message}`)
      return
    }
    prompts.add(ex.prompt)
    skeletons.add(skeleton(ex.prompt))
    if (ex.kind === 'input' && /^−?\d+(?:,\d+)?$/.test(ex.answer.trim())) {
      const ans = ex.answer.trim().replace('−', '-').replace(',', '.')
      if (numbersIn(ex.prompt).includes(ans)) answerInPrompt++
    }
    const txt = [ex.title ?? '', ex.prompt, ex.answer, ex.explanation ?? '', ...(ex.choices ?? [])].join(' ‖ ')
    if (UGLY.test(txt)) problems.push(`${where} ÉCRITURE : ${txt}`)
    if (!ex.check(ex.answer)) problems.push(`${where} RÉPONSE REFUSÉE : ${ex.prompt} → ${ex.answer}`)
    if (ex.isValid && !ex.isValid(ex.answer)) problems.push(`${where} RÉPONSE ILLISIBLE : ${ex.answer}`)
    if (ex.kind === 'choice' && (!ex.choices || ex.choices.length < 2 || !ex.choices.includes(ex.answer))) problems.push(`${where} QCM INVALIDE : ${txt}`)
    if (!ex.explanation) problems.push(`${where} SANS EXPLICATION : ${ex.prompt}`)
    if (ex.figure) {
      const f = ex.figure
      const w = f.w ?? FIG_W, h = f.h ?? FIG_H
      const names = new Set(Object.keys(f.points))
      for (const [k, p] of Object.entries(f.points)) {
        if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) problems.push(`${where} FIGURE point ${k} non fini`)
        else if (!p.hidden && (p.x < 0 || p.y < 0 || p.x > w || p.y > h)) problems.push(`${where} FIGURE point ${k} hors cadre (${p.x.toFixed(0)}, ${p.y.toFixed(0)})`)
      }
      for (const s of f.segments ?? []) if (!names.has(s.a) || !names.has(s.b)) problems.push(`${where} FIGURE segment ${s.a}${s.b} inconnu`)
      for (const a of f.angles ?? []) if (![a.vertex, a.a, a.b].every((n) => names.has(n))) problems.push(`${where} FIGURE angle ${a.vertex} inconnu`)
    }
    if (i === 0 && showSamples) {
      samples.push(`${where}${ex.title ? ` « ${ex.title} »` : ''}${ex.figure ? ' [figure]' : ''}\n    ${ex.prompt}\n    ⇒ ${ex.answer}`)
    }
  }
  if (prompts.size < Math.min(8, RUNS / 4)) variety.push(`${where} : seulement ${prompts.size} énoncés différents sur ${RUNS}`)
  if (training) {
    if (skeletons.size < 3) monotony.push(`${where} : ${skeletons.size} formulation(s) — ${[...skeletons][0].slice(0, 110)}`)
    if (answerInPrompt > RUNS * 0.3) monotony.push(`${where} : réponse écrite dans l'énoncé (${Math.round((answerInPrompt / RUNS) * 100)} %) — ${[...prompts][0].slice(0, 110)}`)
  }
}

for (const [id, tiers] of Object.entries(TIERS)) {
  if (only && id !== only) continue
  tiers.forEach((pool, t) => {
    if (pool.length < 4) variety.push(`${id} palier ${t + 1} : ${pool.length} modèle(s) seulement`)
    pool.forEach((m, i) => inspect(`${id} palier ${t + 1} #${i}`, m, true))
  })
}
for (const [label, reg] of [['amélioration', UPGRADE_PROBLEMS], ['hôtel de ville', AGE_PROBLEMS]] as const) {
  for (const id of Object.keys(TIERS)) {
    if (only && id !== only) continue
    const ladder = reg[id]
    if (!ladder) { problems.push(`${id} ${label} : MANQUANT`); continue }
    ladder.forEach((pool, n) => {
      if (pool.length < 3) variety.push(`${id} ${label} ${n + 1} : ${pool.length} modèle(s) seulement`)
      pool.forEach((m, i) => inspect(`${id} ${label} ${n + 1} #${i}`, m))
    })
  }
}

const uniq = [...new Set(problems.map((p) => p.slice(0, 300)))]
const grouped: Record<string, string[]> = {}
for (const p of uniq) (grouped[p.split(/ (ÉCRITURE|RÉPONSE|QCM|SANS|FIGURE|EXCEPTION|:)/)[0]] ??= []).push(p)
console.log(`Anomalies : ${uniq.length}`)
for (const [k, v] of Object.entries(grouped)) console.log(`- ${k} (${v.length})\n    ${v.slice(0, 2).join('\n    ')}`)
console.log(`\nVariété : ${variety.length} remarque(s)`)
for (const v of variety) console.log(`- ${v}`)
console.log(`\nMonotonie (entraînement) : ${monotony.length} remarque(s)`)
for (const v of monotony) console.log(`- ${v}`)
if (showSamples) console.log('\n' + samples.join('\n'))
process.exitCode = uniq.length ? 1 : 0
