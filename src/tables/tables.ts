// Siège des tables : entraînement aux tables de multiplication et d'addition.
// Chaque bonne réponse fait tirer une catapulte sur le château ; le château, lui, use l'armée du joueur au fil du temps.

export type Operation = 'mult' | 'add'
export type SiegeLevelId = 'ecuyer' | 'chevalier' | 'conquerant'

export interface SiegeLevel {
  id: SiegeLevelId
  name: string
  hint: string
  icon: string
  /** Bonnes réponses nécessaires pour faire tomber le château. */
  hits: number
  /** Temps (s) que tient l'armée sous le feu du château : il faut répondre en moyenne en seconds / hits. */
  seconds: number
}

export const SIEGE_LEVELS: SiegeLevel[] = [
  { id: 'ecuyer', name: 'Écuyer', hint: 'Le château se défend mollement', icon: '🛡', hits: 20, seconds: 180 },
  { id: 'chevalier', name: 'Chevalier', hint: 'Les archers du château visent juste', icon: '⚔', hits: 20, seconds: 85 },
  { id: 'conquerant', name: 'Conquérant', hint: 'La garnison ne laisse aucun répit', icon: '👑', hits: 20, seconds: 50 },
]
export const siegeLevel = (id: SiegeLevelId) => SIEGE_LEVELS.find((l) => l.id === id) ?? SIEGE_LEVELS[0]

/** Tables proposées : de 1 à 10. */
export const TABLES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

/** Défis : un groupe de tables fixé, avec ses propres médailles. */
export interface Challenge {
  id: 'faciles' | 'difficiles' | 'toutes'
  name: string
  tables: number[]
}
export const CHALLENGES: Challenge[] = [
  { id: 'faciles', name: 'Tables faciles', tables: [2, 3, 4, 5] },
  { id: 'difficiles', name: 'Tables difficiles', tables: [6, 7, 8, 9] },
  { id: 'toutes', name: 'Toutes les tables', tables: [2, 3, 4, 5, 6, 7, 8, 9] },
]
export const challengeById = (id?: string) => CHALLENGES.find((c) => c.id === id)
export const OPERATIONS: { id: Operation; name: string; sign: string }[] = [
  { id: 'mult', name: 'Tables de multiplication', sign: '×' },
  { id: 'add', name: 'Tables d’addition', sign: '+' },
]

export interface Fact {
  a: number
  b: number
  op: Operation
}
export const factText = (f: Fact) => `${f.a} ${f.op === 'mult' ? '×' : '+'} ${f.b}`
export const factAnswer = (f: Fact) => (f.op === 'mult' ? f.a * f.b : f.a + f.b)
const factKey = (f: Fact) => `${f.op}:${Math.min(f.a, f.b)}:${Math.max(f.a, f.b)}`

/**
 * Tirage des opérations : toutes les opérations des tables choisies (table × 1 à 10), dans un ordre mélangé, sans
 * répéter la précédente. Une opération ratée revient un peu plus tard (3 à 5 questions après) pour l'ancrer.
 */
export class FactDeck {
  private bag: Fact[] = []
  private again: { fact: Fact; at: number }[] = []
  private count = 0
  private last = ''

  constructor(private op: Operation, private tables: number[]) {}

  private refill() {
    const all: Fact[] = []
    for (const t of this.tables) {
      for (let k = 1; k <= 10; k++) all.push(Math.random() < 0.5 ? { a: t, b: k, op: this.op } : { a: k, b: t, op: this.op })
    }
    for (let i = all.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[all[i], all[j]] = [all[j], all[i]]
    }
    this.bag = all
  }

  next(): Fact {
    this.count++
    const due = this.again.findIndex((r) => r.at <= this.count)
    if (due >= 0) {
      const { fact } = this.again.splice(due, 1)[0]
      this.last = factKey(fact)
      return fact
    }
    for (let guard = 0; guard < 5; guard++) {
      if (!this.bag.length) this.refill()
      const f = this.bag.pop()!
      if (factKey(f) !== this.last) {
        this.last = factKey(f)
        return f
      }
    }
    if (!this.bag.length) this.refill()
    return this.bag.pop()!
  }

  /** L'élève s'est trompé sur cette opération : elle reviendra bientôt. */
  missed(f: Fact) {
    if (!this.again.some((r) => factKey(r.fact) === factKey(f))) this.again.push({ fact: f, at: this.count + 3 + Math.floor(Math.random() * 3) })
  }
}

// ── Médailles : trois par table (s'entraîner sur une seule table) et trois par défi, pour chaque opération ──
/** Clé de médaille : le numéro de la table (« 7 ») ou l'identifiant du défi (« difficiles »). */
export type Medals = Record<Operation, Record<string, SiegeLevelId[]>>
const KEY = 'mathmuscles:siege'

export function loadMedals(): Medals {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Medals | null
    if (raw?.mult && raw?.add) return raw
  } catch {
    /* sauvegarde illisible */
  }
  return { mult: {}, add: {} }
}

/** Ce que rapporte un siège : une médaille de table (une seule table), de défi, ou rien (plusieurs tables au choix). */
export function medalKey(c: SiegeChoice): string | null {
  if (challengeById(c.challenge)) return c.challenge!
  return c.tables.length === 1 ? String(c.tables[0]) : null
}

/** Ajoute la médaille d'une victoire ; renvoie true si elle est nouvelle. */
export function awardMedal(op: Operation, key: string, level: SiegeLevelId): boolean {
  const m = loadMedals()
  const got = m[op][key] ?? []
  if (got.includes(level)) return false
  m[op][key] = [...got, level]
  try {
    localStorage.setItem(KEY, JSON.stringify(m))
  } catch {
    /* médailles non mémorisées */
  }
  return true
}

/** Choix mémorisés (opération, tables, niveau) pour la prochaine visite. */
export interface SiegeChoice {
  op: Operation
  tables: number[]
  level: SiegeLevelId
  /** Défi choisi (ses tables sont alors imposées). */
  challenge?: Challenge['id']
}
const CHOICE_KEY = 'mathmuscles:siege-choix'
export function loadChoice(): SiegeChoice {
  try {
    const c = JSON.parse(localStorage.getItem(CHOICE_KEY) ?? 'null') as SiegeChoice | null
    if (c && c.tables?.length) return c
  } catch {
    /* choix illisible */
  }
  return { op: 'mult', tables: [2, 3, 4, 5], level: 'ecuyer' }
}
export function saveChoice(c: SiegeChoice) {
  try {
    localStorage.setItem(CHOICE_KEY, JSON.stringify(c))
  } catch {
    /* choix non mémorisé */
  }
}
