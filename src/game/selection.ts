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

/** Affecte un sujet à une maison ; s'il était déjà pris par une autre maison, les deux échangent. */
export function assignSubject(selection: readonly string[], house: number, subjectId: string): string[] {
  const out = [...selection]
  const j = out.indexOf(subjectId)
  if (j >= 0) out[j] = out[house]
  out[house] = subjectId
  return out
}

const KEY = (levelId: string) => `mathmuscles:selection:${levelId}`

/** Dernière sélection utilisée pour ce niveau en duel (mémorisée dans le navigateur). */
export function loadSelection(levelId: string): string[] {
  let saved: string[] | undefined
  try {
    saved = JSON.parse(localStorage.getItem(KEY(levelId)) ?? 'null') ?? undefined
  } catch {
    saved = undefined
  }
  return normalizeSelection(levelId, saved)
}

export function saveSelection(levelId: string, selection: string[]) {
  try {
    localStorage.setItem(KEY(levelId), JSON.stringify(selection))
  } catch {
    /* sélection non mémorisée */
  }
}
