// État d'un joueur : maisons (jauges, améliorations), points d'âge, problèmes résolus, temps de recharge.
import { useCallback, useEffect, useState } from 'react'
import {
  AGE_PROBLEM_CRAN, LEVELS, UPGRADE_AGE, UPGRADE_CRAN, ageFromPoints,
  levelFromPoints, maxPoints, type Chapter, type Level,
} from '../data/curriculum'
import { figuresFor, garrison } from '../battle/units'
import type { Rules } from './rules'
import { randomTheme, type ThemeId } from './themes'

export interface HouseState {
  points: number
  series: number
  upgrades: string[]
}

export interface PlayerState {
  levelId: string
  houses: Record<string, HouseState>
  agePoints: number
  /** Problèmes de l'hôtel de ville réussis : « chapitre:niveau ». */
  solved: string[]
  /** Fin des temps d'attente après un échec (horodatage ms), par clé « a:chapitre:n » ou « u:chapitre:n ». */
  cooldowns: Record<string, number>
  answered: number
  correct: number
  /** Type d'exercice tiré pour chaque cran d'une maison (« chapitre:cran » → n° du modèle) : on s'entraîne
   *  par répétition sur le même type jusqu'au cran suivant. */
  drills?: Record<string, number>
  /** Décor de la carte (et du champ de bataille). */
  mapTheme?: ThemeId
}

export const EMPTY_HOUSE: HouseState = { points: 0, series: 0, upgrades: [] }

export function emptyPlayer(levelId: string, mapTheme?: ThemeId): PlayerState {
  return { levelId, houses: {}, agePoints: 0, solved: [], cooldowns: {}, answered: 0, correct: 0, mapTheme }
}

export const levelOf = (p: PlayerState): Level => LEVELS.find((l) => l.id === p.levelId) ?? LEVELS[0]
export const houseOf = (p: PlayerState, chapterId: string): HouseState => p.houses[chapterId] ?? EMPTY_HOUSE
export const ageOf = (p: PlayerState, rules: Rules) => ageFromPoints(p.agePoints, rules.ageThresholds)

// ── Mises à jour (pures) ────────────────────────────────────────────────
const withHouse = (p: PlayerState, id: string, fn: (h: HouseState) => HouseState): PlayerState => ({
  ...p, houses: { ...p.houses, [id]: fn(houseOf(p, id)) },
})

export function addSeries(p: PlayerState, chapterId: string, correct: number, answered: number, rules: Rules): PlayerState {
  const next = withHouse(p, chapterId, (h) => ({ ...h, points: Math.min(maxPoints(rules.ppc), h.points + correct), series: h.series + 1 }))
  return { ...next, answered: p.answered + answered, correct: p.correct + correct }
}

export function addUpgrade(p: PlayerState, chapter: Chapter, n: number): PlayerState {
  const id = chapter.upgrades[n - 1].id
  return withHouse(p, chapter.id, (h) => ({ ...h, upgrades: h.upgrades.includes(id) ? h.upgrades : [...h.upgrades, id] }))
}

export function solveAgeProblem(p: PlayerState, chapterId: string, n: number): PlayerState {
  const key = `${chapterId}:${n}`
  if (p.solved.includes(key)) return p
  return { ...p, solved: [...p.solved, key], agePoints: p.agePoints + n }
}

export const setCooldown = (p: PlayerState, key: string, until: number): PlayerState => ({ ...p, cooldowns: { ...p.cooldowns, [key]: until } })

export const drillKey = (chapterId: string, cran: number) => `${chapterId}:${cran}`
export const setDrill = (p: PlayerState, key: string, model: number): PlayerState => ({ ...p, drills: { ...p.drills, [key]: model } })

// ── Disponibilités ─────────────────────────────────────────────────────
export type Availability =
  | { state: 'owned' }
  | { state: 'available' }
  | { state: 'cooldown'; until: number }
  | { state: 'locked'; reason: string }

const AGE_NAMES_SHORT = ['', 'Âge féodal', 'Âge des châteaux', 'Âge impérial']

export function upgradeAvailability(p: PlayerState, chapter: Chapter, n: 1 | 2 | 3, rules: Rules, now: number): Availability {
  const h = houseOf(p, chapter.id)
  if (h.upgrades.includes(chapter.upgrades[n - 1].id)) return { state: 'owned' }
  if (n > 1 && !h.upgrades.includes(chapter.upgrades[n - 2].id)) return { state: 'locked', reason: `Obtiens d’abord « ${chapter.upgrades[n - 2].name} »` }
  const cran = levelFromPoints(h.points, rules.ppc)
  const age = ageOf(p, rules)
  const needs: string[] = []
  if (cran < UPGRADE_CRAN[n]) needs.push(`cran ${UPGRADE_CRAN[n]} terminé`)
  if (age < UPGRADE_AGE[n]) needs.push(AGE_NAMES_SHORT[UPGRADE_AGE[n]])
  if (needs.length) return { state: 'locked', reason: `Requis : ${needs.join(' et ')}` }
  const until = p.cooldowns[`u:${chapter.id}:${n}`] ?? 0
  if (until > now) return { state: 'cooldown', until }
  return { state: 'available' }
}

export function ageProblemAvailability(p: PlayerState, chapter: Chapter, n: 1 | 2 | 3, rules: Rules, now: number): Availability {
  if (p.solved.includes(`${chapter.id}:${n}`)) return { state: 'owned' }
  const cran = levelFromPoints(houseOf(p, chapter.id).points, rules.ppc)
  if (cran < AGE_PROBLEM_CRAN[n]) return { state: 'locked', reason: `Termine le cran ${AGE_PROBLEM_CRAN[n]}` }
  const until = p.cooldowns[`a:${chapter.id}:${n}`] ?? 0
  if (until > now) return { state: 'cooldown', until }
  return { state: 'available' }
}

// ── Armée ──────────────────────────────────────────────────────────────
export interface Regiment {
  chapterId: string
  kind: Chapter['unit']
  tier: number
  upgrades: number
  /** Bonnes réponses accumulées par la maison. */
  points: number
  /** Nombre d'unités sur le champ de bataille (points ÷ coût de l'unité). */
  figures: number
}

export interface ArmySpec {
  levelId: string
  age: number
  regiments: Regiment[]
}

export function regimentOf(p: PlayerState, chapter: Chapter): Regiment {
  const h = houseOf(p, chapter.id)
  const g = garrison(chapter.unit, h.points)
  return { chapterId: chapter.id, kind: chapter.unit, tier: g.tier, upgrades: h.upgrades.length, points: h.points, figures: g.units }
}

export function armyOf(p: PlayerState, rules: Rules): ArmySpec {
  return { levelId: p.levelId, age: ageOf(p, rules), regiments: levelOf(p).chapters.map((c) => regimentOf(p, c)) }
}

/** Village reconstitué à partir d'une armée (pour revoir celui de l'adversaire après la bataille) :
 *  les améliorations s'obtiennent dans l'ordre, et l'âge donne le minimum de points d'âge. */
export function playerFromArmy(army: ArmySpec, rules: Rules, mapTheme?: ThemeId): PlayerState {
  const p = emptyPlayer(army.levelId, mapTheme)
  for (const r of army.regiments) {
    const chapter = levelOf(p).chapters.find((c) => c.id === r.chapterId)
    if (!chapter) continue
    p.houses[r.chapterId] = { points: r.points, series: 0, upgrades: chapter.upgrades.slice(0, r.upgrades).map((u) => u.id) }
  }
  p.agePoints = army.age > 0 ? rules.ageThresholds[army.age - 1] : 0
  return p
}

/** Nombre total d'unités de l'armée. */
export const populationOf = (p: PlayerState) =>
  levelOf(p).chapters.reduce((s, c) => s + garrison(c.unit, houseOf(p, c.id).points).units, 0)

/** Population maximale (toutes les maisons au complet). */
export const maxPopulationOf = (p: PlayerState, rules: Rules) =>
  levelOf(p).chapters.reduce((s, c) => s + figuresFor(c.unit, maxPoints(rules.ppc)), 0)

// ── Sauvegarde de l'entraînement libre ─────────────────────────────────
const STORE_KEY = 'mathmuscles:v2'
const OLD_KEY = 'mathmuscles:v1'

function loadStore(): Record<string, PlayerState> {
  let store: Record<string, PlayerState> = {}
  try {
    const raw = localStorage.getItem(STORE_KEY)
    const old = localStorage.getItem(OLD_KEY)
    if (raw) store = JSON.parse(raw) as Record<string, PlayerState>
    else if (old) store = migrate(JSON.parse(old) as Record<string, Record<string, HouseState>>)
  } catch {
    /* stockage indisponible ou illisible : on repart de zéro */
  }
  // chaque classe reçoit un décor tiré au hasard, conservé ensuite
  for (const level of LEVELS) store[level.id] = { ...(store[level.id] ?? emptyPlayer(level.id)), mapTheme: store[level.id]?.mapTheme ?? randomTheme() }
  return store
}

/** Ancienne sauvegarde (v1) : on garde les jauges et les améliorations encore valides. */
function migrate(old: Record<string, Record<string, HouseState>>): Record<string, PlayerState> {
  const out: Record<string, PlayerState> = {}
  for (const level of LEVELS) {
    const p = emptyPlayer(level.id)
    for (const c of level.chapters) {
      const h = old[level.id]?.[c.id]
      if (!h) continue
      const valid = c.upgrades.map((u) => u.id)
      p.houses[c.id] = { points: h.points, series: h.series, upgrades: (h.upgrades ?? []).filter((u) => valid.includes(u)) }
    }
    out[level.id] = p
  }
  return out
}

/** État persistant de l'entraînement libre, par classe. */
export function useSoloPlayers() {
  const [store, setStore] = useState<Record<string, PlayerState>>(loadStore)
  useEffect(() => {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(store))
    } catch {
      /* stockage indisponible : la partie reste en mémoire */
    }
  }, [store])
  const get = useCallback((levelId: string) => store[levelId] ?? emptyPlayer(levelId), [store])
  const update = useCallback((levelId: string, fn: (p: PlayerState) => PlayerState) => {
    setStore((s) => ({ ...s, [levelId]: fn(s[levelId] ?? emptyPlayer(levelId)) }))
  }, [])
  return { store, get, update }
}
