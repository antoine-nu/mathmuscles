import { CINQUIEME } from './cinquieme'
import { SECONDE } from './seconde'
import * as U5 from './upgrades5e'
import * as U2 from './upgrades2nde'
import * as A5 from './age5e'
import * as A2 from './age2nde'
import { SUBJECT_CONTENT } from './subjects'
import { MATERNELLE } from './maternelle/content'
import { MAX_LEVEL, SERIES_SIZE, levelById } from '../data/curriculum'
import type { Difficulty, Exercise, Ladder, Maker, Tiers } from './utils'

const extra = [...Object.entries(SUBJECT_CONTENT), ...Object.entries(MATERNELLE)]
export const TIERS: Record<string, Tiers> = { ...CINQUIEME, ...SECONDE, ...Object.fromEntries(extra.map(([id, c]) => [id, c.tiers])) }
type Registry = Record<string, Ladder>
const reg = (m: object, name: string): Registry => ((m as Record<string, Registry | undefined>)[name] ?? {})
export const UPGRADE_PROBLEMS: Registry = { ...reg(U5, 'UPGRADES_5E'), ...reg(U2, 'UPGRADES_2NDE'), ...Object.fromEntries(extra.map(([id, c]) => [id, c.upgrades])) }
export const AGE_PROBLEMS: Registry = { ...reg(A5, 'AGE_5E'), ...reg(A2, 'AGE_2NDE'), ...Object.fromEntries(extra.map(([id, c]) => [id, c.age])) }
/** Sujet jouable : ses exercices existent. */
export const hasContent = (subjectId: string) => subjectId in TIERS

/** Palier des exercices selon les crans terminés et le niveau (5e, 2nde : cran 0 → palier 1 … cran 4 → palier 5 ;
 *  les niveaux adultes jouent les paliers 1 à 3 ou 2 à 5 des sujets de Terminale). */
export function difficultyForLevel(level: number, levelId?: string): Difficulty {
  const table = levelId ? levelById(levelId).difficulty : null
  return (table ? table[Math.min(table.length - 1, level)] : Math.min(MAX_LEVEL, level + 1)) as Difficulty
}

// ── Mémoire des modèles déjà vus ───────────────────────────────────────
// Pour qu'une partie ne ressemble pas à la précédente, on retient (dans le navigateur) quand chaque
// modèle d'exercice a été servi, et on privilégie toujours les modèles les moins récemment vus.
const HISTORY_KEY = 'mathmuscles:history'
type History = Record<string, number>
let history: History = (() => {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '{}') as History
  } catch {
    return {}
  }
})()
let clock = Math.max(0, ...Object.values(history))

function remember(key: string) {
  history[key] = ++clock
  try {
    const entries = Object.entries(history)
    if (entries.length > 4000) history = Object.fromEntries(entries.sort((a, b) => b[1] - a[1]).slice(0, 3000))
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history))
  } catch {
    /* stockage indisponible */
  }
}

/** Ordonne les modèles du moins récemment vu au plus récent (ex æquo mélangés). */
function freshOrder(prefix: string, pool: Maker[]): number[] {
  return pool
    .map((_, i) => ({ i, seen: history[`${prefix}#${i}`] ?? 0, r: Math.random() }))
    .sort((a, b) => a.seen - b.seen || a.r - b.r)
    .map((o) => o.i)
}

/** Type d'exercice (modèle) d'un cran : le moins récemment vu du palier, pour varier d'une partie à l'autre. */
export function pickDrill(chapterId: string, level: number, levelId?: string): number {
  const d = difficultyForLevel(level, levelId)
  return freshOrder(`t:${chapterId}:${d}`, TIERS[chapterId][d - 1])[0]
}

/** Série de 5 exercices d'un même type (entraînement par répétition), avec des nombres différents à chaque fois. */
export function makeSeries(chapterId: string, level: number, model: number, levelId?: string): Exercise[] {
  const d = difficultyForLevel(level, levelId)
  const pool = TIERS[chapterId][d - 1]
  const i = model % pool.length
  const key = `t:${chapterId}:${d}#${i}`
  remember(key)
  const series: Exercise[] = []
  // on évite de reposer les énoncés de la série précédente du même type, et les doublons dans la série
  // (sauf si le modèle offre trop peu de variantes)
  const seen = new Set<string>(lastPrompts.get(key))
  let guard = 0
  while (series.length < SERIES_SIZE) {
    const ex = pool[i]()
    if (seen.has(ex.prompt) && guard++ < 80) continue
    seen.add(ex.prompt)
    series.push(ex)
  }
  lastPrompts.set(key, series.map((e) => e.prompt))
  return series
}
const lastPrompts = new Map<string, string[]>()

/** `count` exercices d'un même modèle du palier donné (le moins récemment vu), aux énoncés différents. */
export function makeTierExercises(chapterId: string, tier: Difficulty, count: number): Exercise[] {
  const pool = TIERS[chapterId][tier - 1]
  const i = freshOrder(`t:${chapterId}:${tier}`, pool)[0]
  remember(`t:${chapterId}:${tier}#${i}`)
  const out: Exercise[] = []
  const seen = new Set<string>()
  let guard = 0
  while (out.length < count) {
    const ex = pool[i]()
    if (seen.has(ex.prompt) && guard++ < 80) continue
    seen.add(ex.prompt)
    out.push(ex)
  }
  return out
}

function fromLadder(kind: 'u' | 'a', ladders: Record<string, Ladder>, chapterId: string, n: 1 | 2 | 3): Exercise {
  const pool = ladders[chapterId]?.[n - 1]
  if (!pool || pool.length === 0) {
    // Repli si un problème manque : un exercice du palier 5 (ne devrait pas arriver).
    return TIERS[chapterId][4][0]()
  }
  const prefix = `${kind}:${chapterId}:${n}`
  const i = freshOrder(prefix, pool)[0]
  remember(`${prefix}#${i}`)
  return pool[i]()
}

/** Problème permettant d'obtenir l'amélioration n (1 à 3) d'une maison. */
export const makeUpgradeProblem = (chapterId: string, n: 1 | 2 | 3) => fromLadder('u', UPGRADE_PROBLEMS, chapterId, n)
/** Problème de l'hôtel de ville de niveau n (rapporte n points d'âge). */
export const makeAgeProblem = (chapterId: string, n: 1 | 2 | 3) => fromLadder('a', AGE_PROBLEMS, chapterId, n)

export type { Exercise }
