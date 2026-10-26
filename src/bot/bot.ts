// Adversaire ordinateur : simule un élève dont on choisit la note sur 20.
// Il s'entraîne, tente des améliorations et des problèmes de l'hôtel de ville, avec une vitesse et une
// réussite qui dépendent de sa note et de la difficulté, en respectant exactement les mêmes règles que le joueur.
import { levelFromPoints } from '../data/curriculum'
import { randomSelection } from '../game/selection'
import { difficultyForLevel } from '../exercises'
import type { Rules } from '../game/rules'
import {
  addSeries, addUpgrade, ageProblemAvailability, chaptersOf, emptyPlayer, houseOf, setCooldown, solveAgeProblem, upgradeAvailability,
  type PlayerState,
} from '../game/state'

export const BOT_NAMES = ['Sire Algorithme', 'Dame Calculette', 'Baron Pythagore', 'Comtesse Fraction', 'Duc des Décimales', 'Marquise Médiane']

/**
 * Rythme de l'ordinateur selon sa note (sur 20) — les réglages se font ici.
 * - correctPerMin : bonnes réponses par minute sur les exercices les plus simples (5/20 ≈ 0,7, 10/20 ≈ 1,5,
 *   15/20 ≈ 2,3, 20/20 ≈ 3,3) : c'est ce qui fixe la taille de son armée (1 bonne réponse = 1 point).
 *   SLOWDOWN ralentit toutes les notes dans la même proportion.
 * - accuracy : part de réponses justes (le reste du temps est perdu en erreurs).
 * - ambition : probabilité de tenter un problème de l'hôtel de ville ou une amélioration quand il y en a un.
 * - solve : chance de réussir un problème de rang 1 (moins pour les rangs 2 et 3).
 */
/** Facteur de vitesse commun à toutes les notes (2/3 : un tiers plus lent que le premier réglage). */
const SLOWDOWN = 2 / 3

export function botPace(grade: number) {
  const g = Math.max(0, Math.min(20, grade))
  return {
    correctPerMin: (0.2 + 0.16 * g + 0.004 * g * g) * SLOWDOWN,
    accuracy: Math.min(0.95, 0.35 + 0.03 * g),
    ambition: Math.min(0.85, 0.1 + 0.035 * g),
    solve: Math.min(0.95, 0.05 + 0.045 * g),
  }
}

/** Maisons qui donnent un soldat de combat dès la première bonne réponse. */
const QUICK_UNITS = ['infantry', 'spear', 'archer', 'scout']

type Action =
  | { kind: 'exercise'; chapterId: string; ends: number; ok: boolean }
  | { kind: 'upgrade' | 'age'; chapterId: string; n: 1 | 2 | 3; ends: number; ok: boolean }

export class Bot {
  state: PlayerState
  private action: Action | null = null
  private focus: string[]
  private readonly pace: ReturnType<typeof botPace>
  /** Facteur de vitesse par rapport à un élève moyen (10/20 → 1). */
  private readonly speed: number

  constructor(levelId: string, public grade: number, private rules: Rules) {
    // l'ordinateur choisit ses 7 sujets au hasard parmi ceux du niveau
    this.state = emptyPlayer(levelId, undefined, randomSelection(levelId))
    const chapters = [...chaptersOf(this.state)].sort(() => Math.random() - 0.5)
    // chaque partie, l'ordinateur privilégie 3 à 5 maisons, dont au moins deux qui forment vite des soldats
    // (il commence par elles : même faible, il aligne quelques combattants dès les premières minutes)
    const quick = chapters.filter((c) => QUICK_UNITS.includes(c.unit)).slice(0, 2)
    const others = chapters.filter((c) => !quick.includes(c))
    // (un bon élève se concentre sur 3 maisons pour franchir des crans et débloquer améliorations et problèmes)
    const n = grade >= 12 ? 3 : 3 + Math.floor(Math.random() * 3)
    this.focus = [...quick, ...others].slice(0, n).map((c) => c.id)
    this.pace = botPace(grade)
    this.speed = this.pace.correctPerMin / botPace(10).correctPerMin
  }

  /**
   * À appeler régulièrement : termine les actions dont le temps est écoulé et enchaîne les suivantes. Si les appels
   * ont été espacés (onglet en arrière-plan, écran en veille), l'ordinateur rattrape tout le travail de l'intervalle.
   */
  tick(now: number): PlayerState {
    if (!this.action) this.action = this.choose(now)
    for (let guard = 0; guard < 10_000 && now >= this.action.ends; guard++) {
      const a = this.action
      const chapter = chaptersOf(this.state).find((c) => c.id === a.chapterId)!
      if (a.kind === 'exercise') {
        this.state = addSeries(this.state, a.chapterId, a.ok ? 1 : 0, 1, this.rules)
      } else if (a.kind === 'upgrade') {
        this.state = a.ok ? addUpgrade(this.state, chapter, a.n) : setCooldown(this.state, `u:${a.chapterId}:${a.n}`, a.ends + this.rules.upgradeCooldown)
      } else {
        this.state = a.ok ? solveAgeProblem(this.state, a.chapterId, a.n) : setCooldown(this.state, `a:${a.chapterId}:${a.n}`, a.ends + this.rules.problemCooldown)
      }
      this.action = this.choose(a.ends)
    }
    return this.state
  }

  /** Durée (ms) d'une tâche qui prendrait `seconds` à un élève moyen, avec un peu de hasard. */
  private time(seconds: number) {
    return (seconds / this.speed) * 1000 * (0.8 + Math.random() * 0.4)
  }

  private choose(now: number): Action {
    const { accuracy, ambition, solve } = this.pace
    // ordre mélangé : l'ordinateur ne favorise pas les premières maisons de la liste
    const chapters = [...chaptersOf(this.state)].sort(() => Math.random() - 0.5)
    // il ne se lance dans les problèmes qu'une fois quelques soldats formés
    const trained = this.state.correct >= 4
    // 1. un problème de l'hôtel de ville disponible ? (le plus rentable d'abord)
    if (trained && Math.random() < ambition * 0.6) {
      for (const n of [3, 2, 1] as const) {
        const c = chapters.find((ch) => ageProblemAvailability(this.state, ch, n, this.rules, now).state === 'available')
        if (c) return { kind: 'age', chapterId: c.id, n, ok: Math.random() < solve - 0.12 * (n - 1), ends: now + this.time(50 + 30 * n) }
      }
    }
    // 2. une amélioration disponible ?
    if (trained && Math.random() < ambition * 0.5) {
      for (const c of chapters) {
        for (const n of [1, 2, 3] as const) {
          if (upgradeAvailability(this.state, c, n, this.rules, now).state === 'available') {
            return { kind: 'upgrade', chapterId: c.id, n, ok: Math.random() < solve + 0.05 - 0.1 * (n - 1), ends: now + this.time(35 + 15 * n) }
          }
        }
      }
    }
    // 3. un exercice d'entraînement, dans la maison de prédilection la moins avancée (parfois une autre)
    const pool = !trained || Math.random() < 0.85 ? this.focus : chapters.map((c) => c.id)
    const chapterId = [...pool].sort((a, b) => houseOf(this.state, a).points - houseOf(this.state, b).points + (trained ? (Math.random() - 0.5) * this.rules.ppc : 0))[0]
    const tier = difficultyForLevel(levelFromPoints(houseOf(this.state, chapterId).points, this.rules.ppc), this.state.levelId)
    // les exercices plus difficiles prennent plus de temps et réussissent un peu moins ; les trois tout premiers,
    // très simples, sont réussis vite (même faible, l'ordinateur aligne vite quelques soldats)
    const warmUp = this.state.answered < 3
    const ok = warmUp || Math.random() < Math.max(0.15, accuracy - 0.03 * (tier - 1))
    const perAttempt = ((60 * accuracy) / this.pace.correctPerMin) * (1 + 0.12 * (tier - 1)) * (warmUp ? 0.5 : 1)
    return { kind: 'exercise', chapterId, ok, ends: now + perAttempt * 1000 * (0.8 + Math.random() * 0.4) }
  }

  /** Pendant la bataille : l'ordinateur sonne-t-il le cor maintenant ? (appelé une fois par seconde) */
  wantsHorn(): boolean {
    return Math.random() < 0.06 * this.pace.accuracy
  }
}
