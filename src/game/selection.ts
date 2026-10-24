// Choix des sujets : un sujet (chapitre) par maison, parmi ceux du niveau dont les exercices existent.
import { levelById, type Subject } from '../data/curriculum'
import { hasContent } from '../exercises'
import { shuffle } from '../exercises/utils'

/** Sujets jouables d'un niveau (exercices écrits). */
export const availableSubjects = (levelId: string): Subject[] => levelById(levelId).subjects.filter((s) => hasContent(s.id))

/** Un niveau est jouable s'il offre au moins un sujet par maison. */
export const levelPlayable = (levelId: string) => availableSubjects(levelId).length >= levelById(levelId).houses.length

/**
 * Sélection valide : un sujet jouable et différent par maison. On garde les choix existants, on complète par les
 * sujets par défaut, puis par les premiers sujets libres.
 */
export function normalizeSelection(levelId: string, selection?: readonly string[]): string[] {
  const lvl = levelById(levelId)
  const ok = new Set(availableSubjects(levelId).map((s) => s.id))
  const used = new Set<string>()
  const out: string[] = []
  lvl.houses.forEach((_, i) => {
    const wanted = [selection?.[i], lvl.defaults[i]].find((id) => id && ok.has(id) && !used.has(id))
    const id = wanted ?? [...ok].find((x) => !used.has(x)) ?? lvl.defaults[i]
    used.add(id)
    out.push(id)
  })
  return out
}

/** Sélection tirée au hasard (pour l'ordinateur ou le bouton « Au hasard »). */
export function randomSelection(levelId: string): string[] {
  const pool = shuffle(availableSubjects(levelId).map((s) => s.id))
  return normalizeSelection(levelId, pool.slice(0, levelById(levelId).houses.length))
}

const KEY = (levelId: string) => `mathmuscles:chapitres:${levelId}`

/** Les 7 chapitres choisis dans les Options pour ce niveau (défauts du niveau sinon). */
export function loadChosen(levelId: string): string[] {
  let saved: string[] | undefined
  try {
    saved = JSON.parse(localStorage.getItem(KEY(levelId)) ?? 'null') ?? undefined
  } catch {
    saved = undefined
  }
  return normalizeSelection(levelId, saved)
}

export function saveChosen(levelId: string, chosen: string[]) {
  try {
    localStorage.setItem(KEY(levelId), JSON.stringify(chosen))
  } catch {
    /* choix non mémorisé */
  }
}

/** Répartition aléatoire des chapitres choisis entre les 7 maisons (à chaque nouvelle partie). */
export function randomAssignment(levelId: string): string[] {
  return normalizeSelection(levelId, shuffle(loadChosen(levelId)))
}

/** Les deux sélections portent-elles sur les mêmes chapitres (dans n'importe quel ordre) ? */
export const sameChapters = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every((x) => b.includes(x))
