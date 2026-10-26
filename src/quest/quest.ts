// La quête du savoir : une séance d'entraînement hors bataille, en trois étapes sur la carte de campagne.
// 1. La caserne : 10 exercices d'entraînement, deux par palier, de plus en plus difficiles.
// 2. L'hôtel de ville : 5 petits problèmes avec une situation à comprendre.
// 3. Le monastère : 2 défis qui vont un peu au-delà du cours et demandent plus de réflexion.
import { difficultyForLevel, makeAgeProblem, makeTierExercises, makeUpgradeProblem, type Exercise } from '../exercises'
import { shuffle } from '../exercises/utils'
import { SUBJECTS } from '../data/curriculum'

export type StageId = 'caserne' | 'hotel' | 'monastere'

export interface Stage {
  id: StageId
  place: string
  name: string
  text: string
  icon: string
  /** Gloire rapportée par une bonne réponse. */
  glory: number
}

export const STAGES: Stage[] = [
  { id: 'caserne', place: 'La caserne', name: 'Entraînement', text: '10 exercices pour s’échauffer, de plus en plus difficiles', icon: '⚒', glory: 1 },
  { id: 'hotel', place: 'L’hôtel de ville', name: 'Missions', text: '5 problèmes : comprendre la situation, trouver quoi calculer', icon: '📜', glory: 2 },
  { id: 'monastere', place: 'Le monastère', name: 'Réflexion', text: '2 défis pour aller un peu plus loin que le cours', icon: '✦', glory: 3 },
]

/** Une étape : un seul parchemin qui enchaîne tous ses exercices (10, 5 ou 2). */
export interface Trial {
  stage: StageId
  /** Chapitres de l'étape (sans doublon). */
  chapterIds: string[]
  exercises: Exercise[]
  /** Chapitre et difficulté de chaque exercice, affichés dans le parchemin. */
  captions: string[]
}

/**
 * Prépare la quête sur les chapitres choisis (au moins un). Les chapitres alternent d'un exercice à l'autre ;
 * chaque paire d'exercices de la caserne répète un même modèle (la mécanique s'ancre), un palier plus haut à chaque fois.
 */
export function buildQuest(levelId: string, chapterIds: string[]): Trial[] {
  const order = shuffle([...chapterIds])
  let k = 0
  const next = () => order[k++ % order.length]
  const title = (id: string) => SUBJECTS.get(id)?.title ?? id
  const trial = (stage: StageId, items: { chapterId: string; ex: Exercise; caption: string }[]): Trial => ({
    stage,
    chapterIds: [...new Set(items.map((i) => i.chapterId))],
    exercises: items.map((i) => i.ex),
    captions: items.map((i) => (chapterIds.length > 1 ? `${title(i.chapterId)} · ${i.caption}` : i.caption)),
  })
  // la caserne : 10 exercices enchaînés, deux par palier (crans 1 à 5 du niveau)
  const practice: { chapterId: string; ex: Exercise; caption: string }[] = []
  for (let step = 0; step < 5; step++) {
    const chapterId = next()
    for (const ex of makeTierExercises(chapterId, difficultyForLevel(step, levelId), 2)) practice.push({ chapterId, ex, caption: `niveau ${step + 1}` })
  }
  // l'hôtel de ville : 5 problèmes de l'hôtel de ville enchaînés (rangs 1, 1, 1, 2, 2)
  const missions = ([1, 1, 1, 2, 2] as const).map((n) => {
    const chapterId = next()
    return { chapterId, ex: makeAgeProblem(chapterId, n), caption: n === 1 ? 'mission simple' : 'mission délicate' }
  })
  // le monastère : un problème de généralisation, puis un défi de fin de chapitre
  const a = next(), b = next()
  const challenges = [
    { chapterId: a, ex: makeUpgradeProblem(a, 3), caption: 'défi du sage' },
    { chapterId: b, ex: makeAgeProblem(b, 3), caption: 'grand défi' },
  ]
  return [trial('caserne', practice), trial('hotel', missions), trial('monastere', challenges)]
}

export const stageOf = (id: StageId) => STAGES.find((s) => s.id === id)!
/** Nombre d'exercices de chaque étape (10, 5, 2). */
export const stageSize = (trials: Trial[], id: StageId) => trials.filter((t) => t.stage === id).reduce((s, t) => s + t.exercises.length, 0)
export const maxGlory = (trials: Trial[]) => trials.reduce((s, t) => s + t.exercises.length * stageOf(t.stage).glory, 0)

/** Titre obtenu selon la part de gloire gagnée. */
export function questRank(ratio: number): { name: string; icon: string } {
  if (ratio >= 0.85) return { name: 'Maître d’armes', icon: '👑' }
  if (ratio >= 0.65) return { name: 'Chevalier', icon: '⚔' }
  if (ratio >= 0.4) return { name: 'Écuyer', icon: '🛡' }
  return { name: 'Recrue', icon: '⚒' }
}

// ── Mémoire : chapitres choisis et meilleur résultat par chapitre (en %), par niveau ──
interface Saved {
  chosen: string[]
  best: Record<string, number>
}
const KEY = (levelId: string) => `mathmuscles:quete:${levelId}`

export function loadQuest(levelId: string): Saved {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY(levelId)) ?? 'null') as Saved | null
    if (raw && Array.isArray(raw.chosen)) return { chosen: raw.chosen, best: raw.best ?? {} }
  } catch {
    /* sauvegarde illisible */
  }
  return { chosen: [], best: {} }
}

export function saveQuest(levelId: string, s: Saved) {
  try {
    localStorage.setItem(KEY(levelId), JSON.stringify(s))
  } catch {
    /* non mémorisé */
  }
}

/** Enregistre une quête terminée : son score compte pour chacun de ses chapitres. */
export function recordQuest(levelId: string, chapterIds: string[], percent: number) {
  const s = loadQuest(levelId)
  for (const id of chapterIds) s.best[id] = Math.max(s.best[id] ?? 0, percent)
  saveQuest(levelId, s)
}
