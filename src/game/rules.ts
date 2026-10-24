import { createContext, useContext } from 'react'
import { POINTS_PER_LEVEL } from '../data/curriculum'

/** Paramètres d'une partie : entraînement libre (sans limite) ou duel chronométré.
 *  La progression est la même partout : 1 bonne réponse = 1 point, 10 points par cran, mêmes seuils d'âge.
 *  Une partie courte donne donc une petite armée ; il faut du temps pour bâtir un grand empire. */
export interface Rules {
  /** Bonnes réponses par cran de jauge (toujours 10). */
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
  ppc: POINTS_PER_LEVEL,
  ageThresholds: [3, 8, 14],
  problemCooldown: 60_000,
  upgradeCooldown: 30_000,
}

export const DUEL_DURATIONS = [15, 30, 45, 60] as const

/** Règles d'un duel : la même progression qu'en entraînement libre, seules les attentes après un échec sont
 *  plus courtes (le temps est compté). */
export function duelRules(durationMin: number): Rules {
  return {
    ...SOLO_RULES,
    problemCooldown: 45_000,
    upgradeCooldown: 25_000,
    durationMin,
  }
}

export const RulesContext = createContext<Rules>(SOLO_RULES)
export const useRules = () => useContext(RulesContext)
