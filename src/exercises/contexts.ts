// Banque de contextes pour varier les énoncés : prénoms, métiers, lieux, objets, univers.
// Chaque tirage pioche au hasard : deux parties ne racontent jamais exactement la même histoire.
import { pick, randInt } from './utils'

export const PRENOMS = [
  'Léa', 'Hugo', 'Inès', 'Malik', 'Chloé', 'Nathan', 'Yasmine', 'Lucas', 'Zoé', 'Adam', 'Jade', 'Rayan',
  'Manon', 'Théo', 'Aïcha', 'Gabriel', 'Lina', 'Noah', 'Camille', 'Sacha', 'Emma', 'Mehdi', 'Louise', 'Tom',
  'Sofia', 'Ibrahim', 'Clara', 'Enzo', 'Maëlys', 'Kenji', 'Alice', 'Bilal', 'Romane', 'Diego', 'Nour', 'Jules',
] as const

/** Personnages médiévaux (avec article défini, pour « le forgeron vend… »). */
export const PERSONNAGES = [
  { nom: 'le forgeron', il: 'il' }, { nom: 'la meunière', il: 'elle' }, { nom: 'le marchand', il: 'il' },
  { nom: 'la reine', il: 'elle' }, { nom: 'le capitaine', il: 'il' }, { nom: 'la tisserande', il: 'elle' },
  { nom: "l'intendant", il: 'il' }, { nom: 'la boulangère', il: 'elle' }, { nom: 'le charpentier', il: 'il' },
  { nom: "l'alchimiste", il: 'il' }, { nom: 'la cartographe', il: 'elle' }, { nom: 'le seigneur', il: 'il' },
  { nom: 'la guérisseuse', il: 'elle' }, { nom: 'le brasseur', il: 'il' }, { nom: 'la maîtresse d’armes', il: 'elle' },
] as const

export const LIEUX = [
  'au château', 'au marché', 'au village', 'à la forge', 'au moulin', 'au port', 'à la caserne',
  'au monastère', 'à la foire', 'dans la forêt', 'au camp', 'à la bibliothèque',
] as const

/** Objets comptables au pluriel, avec un prix unitaire plausible (en écus). */
export const MARCHANDISES = [
  { nom: 'flèches', prix: [1, 3] }, { nom: 'pains', prix: [1, 4] }, { nom: 'torches', prix: [2, 5] },
  { nom: 'boucliers', prix: [12, 30] }, { nom: 'épées', prix: [20, 45] }, { nom: 'tonneaux', prix: [8, 20] },
  { nom: 'sacs de blé', prix: [4, 12] }, { nom: 'cordes', prix: [3, 9] }, { nom: 'lanternes', prix: [5, 14] },
  { nom: 'manuscrits', prix: [15, 40] }, { nom: 'fers à cheval', prix: [2, 6] }, { nom: 'pots de miel', prix: [3, 8] },
] as const

/** Univers modernes, pour ne pas rester que dans le Moyen Âge. */
export const UNIVERS_MODERNES = [
  { lieu: 'au club de basket', objet: 'ballons', action: 'marque' },
  { lieu: 'à la cantine', objet: 'plateaux', action: 'sert' },
  { lieu: 'au festival', objet: 'billets', action: 'vend' },
  { lieu: 'dans un jeu vidéo', objet: 'gemmes', action: 'récolte' },
  { lieu: 'à la piscine', objet: 'longueurs', action: 'nage' },
  { lieu: 'au cinéma', objet: 'places', action: 'réserve' },
] as const

export const prenom = () => pick(PRENOMS)
/** Deux prénoms distincts. */
export function deuxPrenoms(): [string, string] {
  const a = prenom()
  let b = prenom()
  while (b === a) b = prenom()
  return [a, b]
}
export const personnage = () => pick(PERSONNAGES)
export const lieu = () => pick(LIEUX)
export function marchandise() {
  const m = pick(MARCHANDISES)
  return { nom: m.nom, prix: randInt(m.prix[0], m.prix[1]) }
}
export const univers = () => pick(UNIVERS_MODERNES)

/** Met une majuscule au début d'une phrase (« le forgeron » → « Le forgeron »). */
export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
