import { CINQUIEME } from './cinquieme'
import { SECONDE } from './seconde'
import { MAX_LEVEL, SERIES_SIZE } from '../data/curriculum'
import { shuffle, type Difficulty, type Exercise, type Tiers } from './utils'

export const TIERS: Record<string, Tiers> = { ...CINQUIEME, ...SECONDE }

/** Le palier suit la jauge : cran 0 → palier 1, …, cran 4 et plus → palier 5. Les séries d'élite sont au palier 5. */
export function difficultyForLevel(level: number, elite = false): Difficulty {
  return (elite ? MAX_LEVEL : Math.min(MAX_LEVEL, level + 1)) as Difficulty
}

/** Série de 5 exercices du palier courant, en variant les modèles d'exercices. */
export function makeSeries(chapterId: string, level: number, elite = false): Exercise[] {
  const pool = TIERS[chapterId][difficultyForLevel(level, elite) - 1]
  const series: Exercise[] = []
  const seen = new Set<string>()
  let order = shuffle(pool)
  let guard = 0
  while (series.length < SERIES_SIZE && guard++ < 100) {
    if (order.length === 0) order = shuffle(pool)
    const ex = order.shift()!()
    if (seen.has(ex.prompt)) continue
    seen.add(ex.prompt)
    series.push(ex)
  }
  return series
}

export type { Exercise }
