import { CINQUIEME } from './cinquieme'
import { SECONDE } from './seconde'
import { SERIES_SIZE } from '../data/curriculum'
import type { Difficulty, Exercise, Generator } from './utils'

const GENERATORS: Record<string, Generator> = { ...CINQUIEME, ...SECONDE }

/** Difficulté qui suit la jauge : crans 0-1 → 1, 2-3 → 2, 4-5 → 3. Les séries d'élite sont toujours en 3. */
export function difficultyForLevel(level: number): Difficulty {
  return level >= 4 ? 3 : level >= 2 ? 2 : 1
}

/** Une série mélange la difficulté courante et un cran en dessous pour garder du rythme. */
export function makeSeries(chapterId: string, level: number, elite = false): Exercise[] {
  const gen = GENERATORS[chapterId]
  const top = elite ? 3 : difficultyForLevel(level)
  const series: Exercise[] = []
  const seen = new Set<string>()
  let guard = 0
  while (series.length < SERIES_SIZE && guard++ < 50) {
    const d = (elite || series.length >= 2 || top === 1 ? top : Math.max(1, top - 1)) as Difficulty
    const ex = gen(d)
    if (seen.has(ex.prompt)) continue
    seen.add(ex.prompt)
    series.push(ex)
  }
  return series
}

export type { Exercise }
