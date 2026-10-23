import { useCallback, useEffect, useState } from 'react'
import { MAX_POINTS } from '../data/curriculum'

export interface ChapterProgress {
  points: number
  series: number
  upgrades: string[]
}

/** levelId → chapterId → progression */
export type Progress = Record<string, Record<string, ChapterProgress>>

const STORAGE_KEY = 'mathmuscles:v1'

function load(): Progress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Progress) : {}
  } catch {
    return {}
  }
}

export const EMPTY_PROGRESS: ChapterProgress = { points: 0, series: 0, upgrades: [] }

export function useProgress() {
  const [progress, setProgress] = useState<Progress>(load)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progress))
    } catch {
      /* stockage indisponible : la partie reste en mémoire */
    }
  }, [progress])

  const get = useCallback(
    (levelId: string, chapterId: string): ChapterProgress =>
      progress[levelId]?.[chapterId] ?? EMPTY_PROGRESS,
    [progress],
  )

  const update = useCallback(
    (levelId: string, chapterId: string, fn: (p: ChapterProgress) => ChapterProgress) => {
      setProgress((prev) => {
        const current = prev[levelId]?.[chapterId] ?? EMPTY_PROGRESS
        const next = fn(current)
        return {
          ...prev,
          [levelId]: { ...prev[levelId], [chapterId]: { ...next, points: Math.min(MAX_POINTS, next.points) } },
        }
      })
    },
    [],
  )

  const resetLevel = useCallback((levelId: string) => {
    setProgress((prev) => ({ ...prev, [levelId]: {} }))
  }, [])

  return { progress, get, update, resetLevel }
}
