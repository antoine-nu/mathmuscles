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

type Action =
  | { kind: 'series'; chapterId: string; ends: number; correct: number }
  | { kind: 'upgrade' | 'age'; chapterId: string; n: 1 | 2 | 3; ends: number; ok: boolean }

export class Bot {
  state: PlayerState
  private action: Action | null = null
  private focus: string[]
  private readonly skill: number
  private readonly pace: number

  constructor(levelId: string, public grade: number, private rules: Rules) {
    // l'ordinateur choisit ses 7 sujets au hasard parmi ceux du niveau
    this.state = emptyPlayer(levelId, undefined, randomSelection(levelId))
    const chapters = chaptersOf(this.state).map((c) => c.id)
    // chaque partie, l'ordinateur privilégie 3 à 5 maisons différentes
    const n = 3 + Math.floor(Math.random() * 3)
    this.focus = [...chapters].sort(() => Math.random() - 0.5).slice(0, n)
    this.skill = Math.max(0.12, Math.min(0.97, 0.2 + grade * 0.038))
    this.pace = 1.65 - grade * 0.045 // 20/20 : 0,75 × le temps de référence ; 8/20 : 1,3 ×
  }

  private chance(base: number) {
    return Math.max(0.05, Math.min(0.97, base))
  }

  /** À appeler régulièrement : termine l'action en cours si son temps est écoulé, puis en choisit une autre. */
  tick(now: number): PlayerState {
    if (this.action && now >= this.action.ends) {
      const a = this.action
      const chapter = chaptersOf(this.state).find((c) => c.id === a.chapterId)!
      if (a.kind === 'series') {
        this.state = addSeries(this.state, a.chapterId, a.correct, 5, this.rules)
      } else if (a.kind === 'upgrade') {
        this.state = a.ok ? addUpgrade(this.state, chapter, a.n) : setCooldown(this.state, `u:${a.chapterId}:${a.n}`, now + this.rules.upgradeCooldown)
      } else {
        this.state = a.ok ? solveAgeProblem(this.state, a.chapterId, a.n) : setCooldown(this.state, `a:${a.chapterId}:${a.n}`, now + this.rules.problemCooldown)
      }
      this.action = null
    }
    if (!this.action) this.action = this.choose(now)
    return this.state
  }

  private choose(now: number): Action {
    // ordre mélangé : l'ordinateur ne favorise pas les premières maisons de la liste
    const chapters = [...chaptersOf(this.state)].sort(() => Math.random() - 0.5)
    // 1. un problème de l'hôtel de ville disponible ? (le plus rentable d'abord)
    if (Math.random() < 0.55) {
      for (const n of [3, 2, 1] as const) {
        const c = chapters.find((ch) => ageProblemAvailability(this.state, ch, n, this.rules, now).state === 'available')
        if (c) {
          const ok = Math.random() < this.chance(this.skill - 0.12 - 0.09 * n)
          return { kind: 'age', chapterId: c.id, n, ok, ends: now + (60 + 35 * n) * this.pace * 1000 * (0.8 + Math.random() * 0.4) }
        }
      }
    }
    // 2. une amélioration disponible ?
    if (Math.random() < 0.45) {
      for (const c of chapters) {
        for (const n of [1, 2, 3] as const) {
          if (upgradeAvailability(this.state, c, n, this.rules, now).state === 'available') {
            const ok = Math.random() < this.chance(this.skill - 0.06 - 0.07 * n)
            return { kind: 'upgrade', chapterId: c.id, n, ok, ends: now + (40 + 20 * n) * this.pace * 1000 * (0.8 + Math.random() * 0.4) }
          }
        }
      }
    }
    // 3. une série d'entraînement, dans la maison de prédilection la moins avancée (parfois une autre)
    const pool = Math.random() < 0.85 ? this.focus : chapters.map((c) => c.id)
    const chapterId = [...pool].sort((a, b) => houseOf(this.state, a).points - houseOf(this.state, b).points + (Math.random() - 0.5) * this.rules.ppc)[0]
    const tier = difficultyForLevel(levelFromPoints(houseOf(this.state, chapterId).points, this.rules.ppc), this.state.levelId)
    const p = this.chance(this.skill - 0.035 * (tier - 1))
    let correct = 0
    for (let i = 0; i < 5; i++) if (Math.random() < p) correct++
    const perExercise = (10 + 4 * tier) * this.pace
    return { kind: 'series', chapterId, correct, ends: now + 5 * perExercise * 1000 * (0.85 + Math.random() * 0.3) }
  }

  /** Pendant la bataille : l'ordinateur sonne-t-il le cor maintenant ? (appelé une fois par seconde) */
  wantsHorn(): boolean {
    return Math.random() < 0.06 * this.skill
  }
}
