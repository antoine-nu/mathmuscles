import { createContext, useContext } from 'react'

/** Paramètres d'une partie : entraînement libre (sans limite) ou duel chronométré. */
export interface Rules {
  /** Bonnes réponses par cran de jauge. */
  ppc: number
  /** Points d'âge cumulés pour atteindre l'Âge féodal, des châteaux, impérial. */
  ageThresholds: [number, number, number]
  /** Attente après un échec à un problème de l'hôtel de ville (ms). */
  problemCooldown: number
  /** Attente après un échec à un problème d'amélioration (ms). */
  upgradeCooldown: number
  /** Durée de la phase d'entraînement en duel (minutes) ; absente en entraînement libre. */
  durationMin?: number
}

export const SOLO_RULES: Rules = {
  ppc: 10,
  ageThresholds: [3, 8, 14],
  problemCooldown: 60_000,
  upgradeCooldown: 30_000,
}

export const DUEL_DURATIONS = [15, 30, 45, 60] as const

/**
 * Règles d'un duel, proportionnées à la durée : un cran coûte plus cher dans une longue partie, et les âges
 * demandent davantage de points. En 15 min, un très bon élève atteint l'Âge féodal ou des châteaux ;
 * l'Âge impérial reste un exploit, même en une heure.
 */
export function duelRules(durationMin: number): Rules {
  const k = Math.pow(durationMin / 15, 0.75)
  return {
    ppc: Math.max(2, Math.round(durationMin / 12)),
    ageThresholds: [1, Math.max(2, Math.round(3 * k)), Math.max(4, Math.round(6 * k))],
    problemCooldown: 45_000,
    upgradeCooldown: 25_000,
    durationMin,
  }
}

export const RulesContext = createContext<Rules>(SOLO_RULES)
export const useRules = () => useContext(RulesContext)
