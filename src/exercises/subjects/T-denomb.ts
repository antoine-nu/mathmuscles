// Combinatoire et dénombrement (Terminale, spécialité) : principe multiplicatif, k-uplets, arrangements,
// permutations, factorielles, combinaisons (coefficients binomiaux, triangle de Pascal), parties d'un ensemble,
// dénombrements en contexte (codes, comités, mains de cartes, chemins).
// Paliers 1 à 3 : adultes qui reprennent (rappels guidés) ; paliers 2 à 5 : adultes aguerris.
import {
  fmt, fresh, numeric, pick, randInt, shuffle, variants, withMeta,
  type Exercise, type Ladder, type SubjectContent, type Tiers,
} from '../utils'
import { fitPoints, type Figure } from '../figure'
import { cap, deuxPrenoms, personnage, prenom } from '../contexts'

// ── Aides locales ───────────────────────────────────────────────────────
const RED = '#b8362f'
const T = (title: string, ex: Exercise, figure?: Figure): Exercise => withMeta(ex, figure ? { title, figure } : { title })

const fact = (n: number): number => (n <= 1 ? 1 : n * fact(n - 1))
/** Nombre d'arrangements de k éléments parmi n : n × (n − 1) × … (k facteurs). */
const arr = (n: number, k: number) => {
  let r = 1
  for (let i = 0; i < k; i++) r *= n - i
  return r
}
/** Coefficient binomial « k parmi n ». */
const C = (n: number, k: number): number => {
  if (k < 0 || k > n) return 0
  const kk = Math.min(k, n - k)
  let r = 1
  for (let i = 1; i <= kk; i++) r = (r * (n - kk + i)) / i
  return Math.round(r)
}
/** Grand entier avec espaces : 3 628 800 (pas d'espace en dessous de 10 000). */
const big = (n: number) => (Math.abs(n) < 10000 ? fmt(n) : fmt(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' '))
/** « 3 parmi 7 » */
const parmi = (k: number | string, n: number | string) => `« ${k} parmi ${n} »`
/** Produit écrit : 7 × 6 × 5 */
const prodText = (n: number, k: number) => Array.from({ length: k }, (_, i) => n - i).join(' × ')
/** Réponse entière (les espaces entre les milliers sont acceptés). */
const num = (prompt: string, value: number, explanation: string) =>
  numeric(prompt, value, { explanation, answer: big(value), inputHint: 'Un nombre entier' })

const COULEURS = ['pique', 'cœur', 'carreau', 'trèfle'] as const
const JEU32 = 'un jeu de 32 cartes (4 couleurs : pique, cœur, carreau, trèfle ; 8 valeurs : 7, 8, 9, 10, valet, dame, roi, as)'
const VALEURS = [{ s: 'un as', p: 'as' }, { s: 'un roi', p: 'rois' }, { s: 'une dame', p: 'dames' }, { s: 'un valet', p: 'valets' }] as const

/** Mots à lettres toutes distinctes, pour les anagrammes. */
const MOTS_DISTINCTS = ['ROI', 'LUNE', 'DUC', 'ORGE', 'CHEVAL', 'MAISON', 'PRINCE', 'FORGE', 'TOUR', 'CARTE', 'MOULIN', 'CASQUE']
/** Mots à lettres répétées : nombre d'anagrammes = n! / (produit des factorielles des répétitions). */
const MOTS_REPETES = ['ANANAS', 'PAPA', 'BALLE', 'MAMAN', 'RADAR', 'CERCLE', 'ABBAYE', 'BANANE', 'ROCOCO', 'ELLE', 'TATOU', 'COCOTTE', 'BOBO']
function anagrams(w: string) {
  const counts = new Map<string, number>()
  for (const c of w) counts.set(c, (counts.get(c) ?? 0) + 1)
  const reps = [...counts.entries()].filter(([, c]) => c > 1)
  let den = 1
  for (const [, c] of reps) den *= fact(c)
  return { value: fact(w.length) / den, reps, n: w.length }
}

/**
 * Quadrillage de rues m × n : A en bas à gauche, B en haut à droite.
 * `via` : point de passage obligé (nom affiché `viaName`) ; `avoid` : carrefour interdit (entouré en rouge).
 */
function gridFigure(m: number, n: number, opts: { via?: [number, number]; viaName?: string; avoid?: [number, number][]; caption?: string } = {}): Figure {
  const raw: Record<string, [number, number]> = {}
  for (let i = 0; i <= m; i++) { raw[`_b${i}`] = [i, 0]; raw[`_t${i}`] = [i, n] }
  for (let j = 0; j <= n; j++) { raw[`_l${j}`] = [0, j]; raw[`_r${j}`] = [m, j] }
  raw.A = [0, 0]
  raw.B = [m, n]
  if (opts.via) raw.V = opts.via
  const bad = (opts.avoid ?? []).map((p, i) => { const k = 'XY'[i]; raw[k] = p; return k })
  const pts = fitPoints(raw, 320, 220, 30)
  for (const [k, p] of Object.entries(pts)) if (k.startsWith('_')) { p.hidden = true; p.label = '' }
  pts.A.pos = 'sw'
  pts.B.pos = 'ne'
  if (pts.V) { pts.V.label = opts.viaName ?? 'C'; pts.V.pos = 'se' }
  for (const k of bad) pts[k].pos = 'se'
  const segments = [
    ...Array.from({ length: m + 1 }, (_, i) => ({ a: `_b${i}`, b: `_t${i}` })),
    ...Array.from({ length: n + 1 }, (_, j) => ({ a: `_l${j}`, b: `_r${j}` })),
  ]
  return {
    points: pts,
    segments,
    circles: bad.length ? bad.map((c) => ({ c, r: 9, color: RED })) : undefined,
    caption: opts.caption ?? 'On se déplace le long des rues, uniquement vers la droite ou vers le haut.',
  }
}

/** Nombre de chemins « droite / haut » de (0 ; 0) à (m ; n). */
const paths = (m: number, n: number) => C(m + n, m)
/** Taille du quadrillage en mots. */
const dims = (m: number, n: number) => `${m} pâtés de maisons de large sur ${n} de haut`
/** Position d'un carrefour par rapport à A. */
const at = (p: number, q: number) => `${p} rue${p > 1 ? 's' : ''} à droite et ${q} rue${q > 1 ? 's' : ''} au-dessus de A`
/** « de Léa », « d’Adam ». */
const de = (nom: string) => (/^[AEIOUYÉÈÂÎ]/.test(nom) ? `d’${nom}` : `de ${nom}`)

// ═══ Entraînement ═══════════════════════════════════════════════════════
const tiers: Tiers = [
  // ── Palier 1 : rappels guidés ──
  [
    // Principe multiplicatif
    variants(
      () => {
        const e = randInt(2, 5), p = randInt(3, 6), d = randInt(2, 5)
        return num(`À la taverne, un menu se compose d'une entrée, d'un plat et d'un dessert. Il y a ${e} entrées, ${p} plats et ${d} desserts au choix. Combien de menus différents peut-on composer ? (Principe multiplicatif : on multiplie les nombres de choix.)`, e * p * d,
          `Chaque entrée peut s'associer à chaque plat, puis à chaque dessert : ${e} × ${p} × ${d} = ${e * p * d} menus.`)
      },
      () => {
        const c = randInt(2, 5), b = randInt(2, 6), e = randInt(2, 4)
        return num(`Un chevalier choisit un casque parmi ${c}, un bouclier parmi ${b} et une épée parmi ${e}. Combien d'équipements complets différents peut-il former ?`, c * b * e,
          `Principe multiplicatif : ${c} × ${b} × ${e} = ${c * b * e} équipements.`)
      },
      () => {
        const r1 = randInt(2, 5), r2 = randInt(2, 5)
        return num(`Pour aller du village au château, il faut passer par le moulin. ${r1} chemins mènent du village au moulin et ${r2} chemins du moulin au château. Combien de trajets différents mènent du village au château ?`, r1 * r2,
          `Pour chacun des ${r1} chemins de la première étape, on a ${r2} choix pour la seconde : ${r1} × ${r2} = ${r1 * r2} trajets.`)
      },
      () => {
        const t = randInt(3, 7), p = randInt(2, 5), s = randInt(2, 4)
        return num(`Dans l'armoire ${de(prenom())}, il y a ${t} tee-shirts, ${p} pantalons et ${s} paires de chaussures. Combien de tenues différentes (un tee-shirt, un pantalon, une paire de chaussures) peut-on composer ?`, t * p * s,
          `On multiplie les nombres de choix : ${t} × ${p} × ${s} = ${t * p * s} tenues.`)
      },
      () => {
        const s = randInt(3, 8)
        return num(`Une étiquette est formée d'une lettre choisie parmi les ${s} premières lettres de l'alphabet, suivie d'un chiffre (de 0 à 9). Combien d'étiquettes différentes peut-on fabriquer ?`, s * 10,
          `${s} choix pour la lettre et 10 choix pour le chiffre : ${s} × 10 = ${s * 10} étiquettes.`)
      },
    ),
    // Factorielles
    variants(
      () => {
        const n = randInt(4, 7)
        return num(`Calcule ${n}! (rappel : ${n}! = 1 × 2 × … × ${n}).`, fact(n), `${n}! = ${Array.from({ length: n }, (_, i) => i + 1).join(' × ')} = ${big(fact(n))}.`)
      },
      () => {
        const n = randInt(3, 6)
        return num(`De combien de façons peut-on ranger ${n} livres différents côte à côte sur une étagère ?`, fact(n),
          `Ranger ${n} objets distincts, c'est former une permutation : ${n}! = ${prodText(n, n)} = ${fact(n)} façons.`)
      },
      () => {
        const n = randInt(5, 10)
        return num(`Calcule {${n}!/${n - 2}!} (simplifie avant de calculer).`, n * (n - 1),
          `${n}! = ${n} × ${n - 1} × ${n - 2}!, donc {${n}!/${n - 2}!} = ${n} × ${n - 1} = ${n * (n - 1)}.`)
      },
      () => {
        const n = randInt(4, 6)
        return num(`${n} candidats passent un oral les uns après les autres. Combien d'ordres de passage différents sont possibles ?`, fact(n),
          `Un ordre de passage est une permutation des ${n} candidats : ${n}! = ${fact(n)}.`)
      },
      () => {
        const n = randInt(6, 9)
        return num(`On sait que ${n}! = ${big(fact(n))}. Calcule ${n + 1}! (sans tout recalculer).`, fact(n + 1),
          `${n + 1}! = ${n + 1} × ${n}! = ${n + 1} × ${big(fact(n))} = ${big(fact(n + 1))}.`)
      },
    ),
    // k-uplets (listes avec répétition)
    variants(
      () => {
        const k = randInt(2, 4)
        return num(`Un digicode est formé de ${k} chiffres (de 0 à 9), les répétitions étant permises. Combien de codes différents existe-t-il ? (Chaque chiffre a 10 possibilités.)`, 10 ** k,
          `${k} positions, 10 choix pour chacune : 10^${k} = ${big(10 ** k)} codes.`)
      },
      () => {
        const k = randInt(3, 8)
        return num(`On lance une pièce ${k} fois de suite et on note la suite des résultats (pile ou face). Combien de suites différentes peut-on obtenir ?`, 2 ** k,
          `Chaque lancer a 2 issues : 2^${k} = ${2 ** k} suites.`)
      },
      () => {
        const m = randInt(2, 5), k = randInt(2, 4)
        const letters = 'ABCDE'.slice(0, m).split('').join(', ')
        return num(`Avec les lettres ${letters} (répétitions permises), combien de « mots » de ${k} lettres (ayant un sens ou non) peut-on écrire ?`, m ** k,
          `Chacune des ${k} positions peut recevoir ${m} lettres : ${m}^${k} = ${m ** k} mots.`)
      },
      () => {
        const k = randInt(3, 6), m = pick([3, 4])
        return num(`Un questionnaire compte ${k} questions ; chacune propose ${m} réponses et on coche exactement une réponse par question. Combien de façons de remplir le questionnaire y a-t-il ?`, m ** k,
          `${m} choix pour chacune des ${k} questions : ${m}^${k} = ${big(m ** k)}.`)
      },
      () => {
        const k = pick([2, 3])
        return num(`On lance un dé à six faces ${k} fois et on note la liste ordonnée des résultats. Combien de listes différentes sont possibles ?`, 6 ** k,
          `6 issues à chaque lancer : 6^${k} = ${6 ** k} listes.`)
      },
    ),
    // Arrangements guidés
    variants(
      () => {
        const n = randInt(5, 10)
        return num(`${n} archers participent à un concours. Combien de podiums (or, argent, bronze) différents sont possibles ? (${n} choix pour l'or, puis ${n - 1} pour l'argent, puis…)`, arr(n, 3),
          `${prodText(n, 3)} = ${arr(n, 3)} podiums.`)
      },
      () => {
        const n = randInt(5, 12)
        return num(`Une association de ${n} membres élit un président et un trésorier (deux personnes différentes). Combien de bureaux différents sont possibles ? (On choisit le président, puis le trésorier parmi les autres.)`, arr(n, 2),
          `${n} choix pour le président, puis ${n - 1} pour le trésorier : ${n} × ${n - 1} = ${arr(n, 2)}.`)
      },
      () => {
        const n = randInt(5, 9)
        return num(`Un sac contient ${n} jetons numérotés. On tire successivement 2 jetons sans les remettre et on note les numéros dans l'ordre. Combien de résultats sont possibles ? (Le second tirage se fait parmi les jetons restants.)`, arr(n, 2),
          `${n} possibilités pour le premier jeton, ${n - 1} pour le second : ${n} × ${n - 1} = ${arr(n, 2)}.`)
      },
      () => {
        const k = pick([2, 3])
        return num(`Combien de codes de ${k} chiffres (de 0 à 9) ont tous leurs chiffres différents ? (10 choix pour le premier, 9 pour le deuxième…)`, arr(10, k),
          `${prodText(10, k)} = ${arr(10, k)} codes.`)
      },
    ),
    // Combinaisons simples
    variants(
      () => {
        const n = randInt(4, 12)
        return num(`Calcule ${parmi(2, n)} à l'aide de la formule ${parmi(2, 'n')} = {n(n − 1)/2}.`, C(n, 2),
          `${parmi(2, n)} = {${n} × ${n - 1}/2} = ${C(n, 2)}.`)
      },
      () => {
        const n = randInt(4, 12)
        return num(`Lors d'une réunion, ${n} personnes se serrent la main, chacune une seule fois avec chacune des autres. Combien de poignées de main sont échangées ? (Une poignée de main correspond à une paire de personnes.)`, C(n, 2),
          `On compte les paires : ${parmi(2, n)} = {${n} × ${n - 1}/2} = ${C(n, 2)}.`)
      },
      () => {
        const n = randInt(5, 9)
        return num(`Calcule ${parmi(3, n)} à l'aide de la formule ${parmi(3, 'n')} = {n(n − 1)(n − 2)/6}.`, C(n, 3),
          `${parmi(3, n)} = {${n} × ${n - 1} × ${n - 2}/6} = {${arr(n, 3)}/6} = ${C(n, 3)}.`)
      },
      () => {
        const n = randInt(4, 7)
        const set = 'abcdefg'.slice(0, n).split('').join(' ; ')
        return num(`Combien de parties à 2 éléments l'ensemble {${set}} possède-t-il ? (Une partie ne tient pas compte de l'ordre.)`, C(n, 2),
          `C'est ${parmi(2, n)} = {${n} × ${n - 1}/2} = ${C(n, 2)}.`)
      },
      () => {
        const n = randInt(4, 10)
        return num(`Dans un tournoi, ${n} équipes se rencontrent chacune une fois. Combien de matchs faut-il organiser ?`, C(n, 2),
          `Un match = une paire d'équipes : ${parmi(2, n)} = {${n} × ${n - 1}/2} = ${C(n, 2)}.`)
      },
    ),
  ],
  // ── Palier 2 : application directe des formules ──
  [
    // Arrangements
    variants(
      () => {
        const n = randInt(6, 12)
        return num(`${n} chevaux prennent le départ d'une course. Combien de tiercés dans l'ordre (1er, 2e, 3e) sont possibles ?`, arr(n, 3),
          `Arrangements de 3 parmi ${n} : ${prodText(n, 3)} = ${arr(n, 3)}.`)
      },
      () => {
        const n = randInt(6, 12)
        return num(`Un club de ${n} membres élit un président, un secrétaire et un trésorier (trois personnes différentes). Combien de bureaux possibles ?`, arr(n, 3),
          `L'ordre (les rôles) compte : ${prodText(n, 3)} = ${arr(n, 3)}.`)
      },
      () => {
        const m = randInt(5, 8), k = 3
        return num(`Combien de mots de ${k} lettres toutes différentes peut-on former avec un alphabet de ${m} lettres ?`, arr(m, k),
          `${prodText(m, k)} = ${arr(m, k)} mots.`)
      },
      () => {
        const n = randInt(6, 10), k = pick([3, 4])
        return num(`Une urne contient ${n} boules numérotées. On tire successivement et sans remise ${k} boules, en notant l'ordre. Combien de tirages possibles ?`, arr(n, k),
          `Tirage ordonné sans remise : ${prodText(n, k)} = ${big(arr(n, k))}.`)
      },
    ),
    // Combinaisons
    variants(
      () => {
        const n = randInt(7, 12), k = pick([3, 4])
        return num(`Le seigneur doit choisir ${k} gardes parmi ${n} pour l'escorter (sans rôles particuliers). Combien d'escortes différentes peut-il former ?`, C(n, k),
          `L'ordre ne compte pas : ${parmi(k, n)} = {${prodText(n, k)}/${k}!} = ${C(n, k)}.`)
      },
      () => {
        const n = randInt(6, 10), k = pick([2, 3])
        return num(`Une urne contient ${n} boules. On en tire ${k} simultanément. Combien de tirages différents sont possibles ?`, C(n, k),
          `Tirage simultané = partie à ${k} éléments : ${parmi(k, n)} = ${C(n, k)}.`)
      },
      () => {
        const n = randInt(8, 12), k = pick([3, 4])
        return num(`Avant de partir en voyage, ${prenom()} choisit ${k} livres parmi les ${n} de sa bibliothèque. Combien de choix différents possibles ?`, C(n, k),
          `${parmi(k, n)} = {${prodText(n, k)}/${k}!} = ${C(n, k)}.`)
      },
      () => {
        const n = randInt(7, 10)
        return num(`Calcule ${parmi(3, n)} avec la formule {n!/k!(n − k)!}.`, C(n, 3),
          `${parmi(3, n)} = {${n}!/3! × ${n - 3}!} = {${prodText(n, 3)}/6} = ${C(n, 3)}.`)
      },
    ),
    // Permutations
    variants(
      () => {
        const w = pick(MOTS_DISTINCTS)
        return num(`Combien d'anagrammes (ayant un sens ou non) le mot ${w} possède-t-il ? Ses lettres sont toutes différentes.`, fact(w.length),
          `On permute ${w.length} lettres distinctes : ${w.length}! = ${fact(w.length)}.`)
      },
      () => {
        const n = randInt(5, 7)
        return num(`${n} amis font la queue devant le cinéma. Combien d'ordres différents dans la file sont possibles ?`, fact(n),
          `${n}! = ${prodText(n, n)} = ${big(fact(n))}.`)
      },
      () => {
        const n = randInt(5, 7), who = prenom()
        return num(`${n} personnes, dont ${who}, s'alignent pour une photo. Combien d'alignements placent ${who} à l'extrémité gauche ?`, fact(n - 1),
          `${who} est placé(e) ; on permute les ${n - 1} autres : ${n - 1}! = ${fact(n - 1)}.`)
      },
      () => {
        const digits = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]).slice(0, randInt(4, 6)).sort()
        return num(`Combien de nombres peut-on écrire en utilisant une et une seule fois chacun des chiffres ${digits.join(', ')} ?`, fact(digits.length),
          `Chaque nombre est une permutation des ${digits.length} chiffres : ${digits.length}! = ${fact(digits.length)}.`)
      },
    ),
    // Parties d'un ensemble
    variants(
      () => {
        const n = randInt(3, 10)
        return num(`Combien de parties (sous-ensembles, y compris l'ensemble vide et l'ensemble lui-même) possède un ensemble à ${n} éléments ?`, 2 ** n,
          `Pour chaque élément, on décide s'il est dans la partie ou non : 2^${n} = ${2 ** n} parties.`)
      },
      () => {
        const n = randInt(4, 10)
        return num(`Une pizzeria propose ${n} garnitures ; on peut en choisir autant qu'on veut, ou aucune. Combien de pizzas différentes peut-on commander ?`, 2 ** n,
          `Chaque garniture est prise ou non : 2^${n} = ${2 ** n} pizzas.`)
      },
      () => {
        const n = randInt(3, 9)
        return num(`Combien de parties non vides possède un ensemble à ${n} éléments ?`, 2 ** n - 1,
          `Il y a 2^${n} = ${2 ** n} parties, dont une vide : ${2 ** n} − 1 = ${2 ** n - 1}.`)
      },
      () => {
        const n = randInt(4, 8)
        const set = Array.from({ length: n }, (_, i) => i + 1).join(' ; ')
        return num(`Combien de parties de E = {${set}} contiennent l'élément 1 ?`, 2 ** (n - 1),
          `1 est imposé ; pour chacun des ${n - 1} autres éléments, on choisit de le prendre ou non : 2^${n - 1} = ${2 ** (n - 1)}.`)
      },
    ),
    // Principe multiplicatif mixte
    variants(
      () => num(`Une plaque est formée de 2 lettres (parmi 26) suivies de 3 chiffres (de 0 à 9), répétitions permises. Combien de plaques différentes ?`, 26 * 26 * 1000,
        `26 × 26 × 10 × 10 × 10 = 676 × 1 000 = 676 000.`),
      () => {
        const k = randInt(3, 4)
        return num(`Un code PIN de ${k} chiffres ne peut pas commencer par 0. Combien de codes sont possibles ?`, 9 * 10 ** (k - 1),
          `9 choix pour le premier chiffre, 10 pour chacun des ${k - 1} autres : 9 × 10^${k - 1} = ${big(9 * 10 ** (k - 1))}.`)
      },
      () => {
        const v = randInt(3, 6), c = randInt(3, 8)
        return num(`Un mot de passe est formé d'une voyelle (parmi ${v}), puis de deux chiffres (de 0 à 9), puis d'un symbole (parmi ${c}). Combien de mots de passe différents ?`, v * 100 * c,
          `${v} × 10 × 10 × ${c} = ${big(v * 100 * c)}.`)
      },
      () => {
        const k = randInt(2, 3)
        return num(`Combien de nombres de ${k + 1} chiffres (le premier n'est pas 0) n'ont que des chiffres impairs ?`, 5 ** (k + 1),
          `Chaque chiffre est l'un des 5 chiffres impairs 1, 3, 5, 7, 9 (aucun n'est 0) : 5^${k + 1} = ${5 ** (k + 1)}.`)
      },
    ),
  ],
  // ── Palier 3 : exercices standard de Terminale ──
  [
    // Triangle de Pascal, formules
    variants(
      fresh(() => {
        const n = randInt(6, 11), k = randInt(2, n - 3)
        const a = C(n, k), b = C(n, k + 1)
        return num(`On donne ${parmi(k, n)} = ${a} et ${parmi(k + 1, n)} = ${b}. À l'aide de la relation de Pascal, calcule ${parmi(k + 1, n + 1)}.`, a + b,
          `Relation de Pascal : ${parmi(k + 1, n + 1)} = ${parmi(k, n)} + ${parmi(k + 1, n)} = ${a} + ${b} = ${a + b}.`)
      }),
      fresh(() => {
        const n = randInt(6, 11), k = randInt(2, n - 3)
        const a = C(n, k), c = C(n + 1, k + 1)
        return num(`On sait que ${parmi(k, n)} = ${a} et ${parmi(k + 1, n + 1)} = ${c}. Déduis-en ${parmi(k + 1, n)}.`, c - a,
          `Pascal : ${parmi(k + 1, n + 1)} = ${parmi(k, n)} + ${parmi(k + 1, n)}, donc ${parmi(k + 1, n)} = ${c} − ${a} = ${c - a}.`)
      }),
      () => {
        const n = randInt(5, 12)
        return num(`Que vaut la somme ${parmi(0, n)} + ${parmi(1, n)} + … + ${parmi(n, n)} ?`, 2 ** n,
          `C'est le nombre total de parties d'un ensemble à ${n} éléments : 2^${n} = ${big(2 ** n)}.`)
      },
      () => {
        const n = randInt(5, 7)
        const row = Array.from({ length: n + 1 }, (_, k) => C(n, k))
        const k = randInt(2, n - 1)
        return num(`La ligne ${n} du triangle de Pascal est : ${row.join(' ; ')}. Quel est le coefficient ${parmi(k, n + 1)} de la ligne suivante ?`, C(n + 1, k),
          `On additionne les deux coefficients situés au-dessus : ${C(n, k - 1)} + ${C(n, k)} = ${C(n + 1, k)}.`)
      },
    ),
    // Mains de cartes
    variants(
      () => num(`On tire simultanément 3 cartes dans ${JEU32}. Combien de mains de 3 cartes contiennent exactement un as ?`, 4 * C(28, 2),
        `1 as parmi 4, puis 2 cartes parmi les 28 qui ne sont pas des as : 4 × ${parmi(2, 28)} = 4 × 378 = ${4 * C(28, 2)}.`),
      () => {
        const col = pick(COULEURS)
        return num(`On tire simultanément 3 cartes dans ${JEU32}. Combien de mains contiennent exactement 2 cartes de ${col} ?`, C(8, 2) * 24,
          `2 ${col}s parmi 8, et 1 carte parmi les 24 autres : ${parmi(2, 8)} × 24 = 28 × 24 = ${28 * 24}.`)
      },
      () => {
        const col = pick(COULEURS)
        return num(`On tire simultanément 4 cartes dans ${JEU32}. Combien de mains ne contiennent que des ${col}s ?`, C(8, 4),
          `On choisit 4 cartes parmi les 8 de ${col} : ${parmi(4, 8)} = 70.`)
      },
      () => {
        const k = pick([2, 3])
        return num(`On tire simultanément ${k} cartes dans ${JEU32}. Combien de mains différentes sont possibles ?`, C(32, k),
          `${parmi(k, 32)} = {${prodText(32, k)}/${k}!} = ${big(C(32, k))}.`)
      },
      () => {
        const v = pick(VALEURS)
        return num(`On tire simultanément 3 cartes dans ${JEU32}. Combien de mains contiennent exactement 2 ${v.p} ?`, C(4, 2) * 28,
          `2 ${v.p} parmi 4, puis 1 carte parmi les 28 autres : ${parmi(2, 4)} × 28 = 6 × 28 = 168.`)
      },
    ),
    // Avec remise, sans remise, simultané
    variants(
      () => {
        const n = randInt(5, 10), k = pick([2, 3])
        return num(`Un sac contient ${n} jetons numérotés de 1 à ${n}. On tire ${k} jetons successivement AVEC remise, en notant les numéros dans l'ordre. Combien de résultats possibles ?`, n ** k,
          `Avec remise, chaque tirage a ${n} issues : ${n}^${k} = ${n ** k} (${k}-uplets).`)
      },
      () => {
        const n = randInt(5, 10), k = pick([2, 3])
        return num(`Un sac contient ${n} jetons numérotés de 1 à ${n}. On tire ${k} jetons successivement SANS remise, en notant les numéros dans l'ordre. Combien de résultats possibles ?`, arr(n, k),
          `Sans remise et dans l'ordre (arrangements) : ${prodText(n, k)} = ${arr(n, k)}.`)
      },
      () => {
        const n = randInt(6, 10), k = pick([2, 3])
        return num(`Un sac contient ${n} jetons numérotés de 1 à ${n}. On prend ${k} jetons d'une seule poignée. Combien de poignées différentes sont possibles ?`, C(n, k),
          `Tirage simultané (pas d'ordre) : ${parmi(k, n)} = ${C(n, k)}.`)
      },
      () => {
        const n = randInt(4, 6)
        return num(`On distribue ${n} prix différents à ${n} élèves, un prix chacun. Combien de distributions sont possibles ?`, fact(n),
          `C'est une permutation : ${n}! = ${fact(n)}.`)
      },
    ),
    // Codes avec contraintes
    variants(
      () => {
        const k = pick([3, 4])
        return num(`Combien de codes de ${k} chiffres (de 0 à 9) comportent au moins deux chiffres identiques ?`, 10 ** k - arr(10, k),
          `Complémentaire : 10^${k} codes au total, dont ${prodText(10, k)} = ${arr(10, k)} à chiffres tous différents : ${big(10 ** k)} − ${arr(10, k)} = ${big(10 ** k - arr(10, k))}.`)
      },
      () => {
        const k = pick([3, 4])
        return num(`Combien de codes de ${k} chiffres (de 0 à 9) contiennent au moins un 0 ?`, 10 ** k - 9 ** k,
          `Complémentaire : 10^${k} codes, dont 9^${k} = ${9 ** k} sans aucun 0 : ${big(10 ** k)} − ${9 ** k} = ${big(10 ** k - 9 ** k)}.`)
      },
      () => {
        const k = pick([3, 4])
        return num(`Combien de codes de ${k} chiffres (de 0 à 9) ont tous leurs chiffres différents et se terminent par un chiffre pair ?`, 5 * arr(9, k - 1),
          `On commence par le dernier chiffre : 5 choix pairs, puis on remplit les ${k - 1} autres places avec des chiffres différents parmi les 9 restants : 5 × ${prodText(9, k - 1)} = ${big(5 * arr(9, k - 1))}.`)
      },
      () => {
        const k = pick([3, 4])
        return num(`Combien de nombres de ${k} chiffres (le premier chiffre n'est pas 0) ont tous leurs chiffres différents ?`, 9 * arr(9, k - 1),
          `9 choix pour le premier (pas 0), puis ${prodText(9, k - 1)} pour les suivants (0 redevient possible) : ${big(9 * arr(9, k - 1))}.`)
      },
    ),
    // Anagrammes avec répétitions, mots binaires
    variants(
      () => {
        const w = pick(MOTS_REPETES)
        const a = anagrams(w)
        return num(`Combien d'anagrammes (ayant un sens ou non) le mot ${w} possède-t-il ?`, a.value,
          `${a.n} lettres, dont ${a.reps.map(([c, k]) => `${k} « ${c} »`).join(' et ')} : {${a.n}!/${a.reps.map(([, k]) => `${k}!`).join(' × ')}} = ${a.value}.`)
      },
      () => {
        const n = randInt(5, 9), k = randInt(2, 3)
        return num(`Combien de mots binaires de ${n} chiffres (0 ou 1) contiennent exactement ${k} fois le chiffre 1 ?`, C(n, k),
          `On choisit les ${k} positions des 1 parmi ${n} : ${parmi(k, n)} = ${C(n, k)}.`)
      },
      () => {
        const n = randInt(5, 9), k = randInt(2, 4)
        return num(`On lance ${n} fois une pièce. Combien de suites de résultats comportent exactement ${k} « pile » ?`, C(n, k),
          `On choisit les rangs des ${k} « pile » parmi les ${n} lancers : ${parmi(k, n)} = ${C(n, k)}.`)
      },
      () => {
        const d = randInt(2, 4), h = randInt(2, 4)
        return num(`Un robot fait ${d + h} pas : ${d} vers la droite et ${h} vers le haut, dans un ordre quelconque. Combien de trajets différents peut-il suivre ?`, C(d + h, d),
          `Un trajet est un mot de ${d + h} lettres avec ${d} « D » et ${h} « H » : ${parmi(d, d + h)} = ${C(d + h, d)}.`)
      },
    ),
  ],
  // ── Palier 4 ──
  [
    // Chemins sur quadrillage (figure)
    variants(
      () => {
        const m = randInt(3, 6), n = randInt(2, 4)
        return withMeta(num(`Sur le quadrillage ci-dessous (${dims(m, n)}), combien de chemins mènent de A à B ?`, paths(m, n),
          `Un chemin = ${m} pas vers la droite et ${n} vers le haut, soit ${m + n} pas dont on choisit les ${m} vers la droite : ${parmi(m, m + n)} = ${paths(m, n)}.`), { figure: gridFigure(m, n) })
      },
      () => {
        const m = randInt(3, 6), n = randInt(2, 4), p = randInt(1, m - 1), q = randInt(1, n - 1)
        const v = paths(p, q) * paths(m - p, n - q)
        return withMeta(num(`Le quadrillage compte ${dims(m, n)}, et le carrefour C est ${at(p, q)}. Combien de chemins de A à B passent par C ?`, v,
          `De A à C : ${parmi(p, p + q)} = ${paths(p, q)} ; de C à B : ${parmi(m - p, m - p + n - q)} = ${paths(m - p, n - q)}. Total : ${paths(p, q)} × ${paths(m - p, n - q)} = ${v}.`), { figure: gridFigure(m, n, { via: [p, q] }) })
      },
      () => {
        const m = randInt(3, 5), n = randInt(2, 4)
        return withMeta(num(`Un messager va de A à B en suivant les rues d'un quartier de ${dims(m, n)}. Combien d'itinéraires différents (les plus courts) peut-il emprunter ?`, paths(m, n),
          `${m + n} déplacements, dont ${n} vers le haut à placer : ${parmi(n, m + n)} = ${paths(m, n)}.`), { figure: gridFigure(m, n) })
      },
      () => {
        const m = randInt(4, 6), n = randInt(3, 4), p = randInt(1, m - 1), q = randInt(1, n - 1)
        const v = paths(p, q) * paths(m - p, n - q)
        return withMeta(num(`Dans un quartier de ${dims(m, n)}, un messager doit s'arrêter à la taverne T, située ${at(p, q)}. Combien de chemins de A à B passent par T ?`, v,
          `A → T : ${paths(p, q)} chemins ; T → B : ${paths(m - p, n - q)} chemins ; produit : ${v}.`), { figure: gridFigure(m, n, { via: [p, q], viaName: 'T' }) })
      },
    ),
    // Comités avec contraintes
    variants(
      () => {
        const f = randInt(4, 7), h = randInt(4, 7), k = pick([3, 4]), j = randInt(1, k - 1)
        const v = C(f, j) * C(h, k - j)
        return num(`Un conseil de ${k} personnes est choisi parmi ${f} femmes et ${h} hommes. Combien de conseils comptent exactement ${j} femme${j > 1 ? 's' : ''} ?`, v,
          `${parmi(j, f)} × ${parmi(k - j, h)} = ${C(f, j)} × ${C(h, k - j)} = ${v}.`)
      },
      () => {
        const f = randInt(3, 6), h = randInt(4, 7), k = 3
        const v = C(f + h, k) - C(h, k)
        return num(`Un conseil de ${k} personnes est choisi parmi ${f} femmes et ${h} hommes. Combien de conseils comptent au moins une femme ?`, v,
          `Complémentaire : ${parmi(k, f + h)} − ${parmi(k, h)} = ${C(f + h, k)} − ${C(h, k)} = ${v}.`)
      },
      () => {
        const n = randInt(7, 10), k = 3
        const [a, b] = ['Arthur', 'Bertrand']
        const v = C(n, k) - C(n - 2, k - 2)
        return num(`On choisit ${k} chevaliers parmi ${n} pour une mission. ${a} et ${b}, brouillés, refusent de partir ensemble. Combien d'équipes possibles ?`, v,
          `Toutes les équipes : ${parmi(k, n)} = ${C(n, k)} ; celles qui contiennent les deux : ${parmi(k - 2, n - 2)} = ${C(n - 2, k - 2)}. Il reste ${v}.`)
      },
      () => {
        const n = randInt(6, 10), k = pick([3, 4])
        const v = n * C(n - 1, k - 1)
        return num(`Dans un groupe de ${n} personnes, on forme un comité de ${k} membres dont l'un est désigné président. Combien de comités ainsi organisés ?`, v,
          `On choisit le président (${n} choix), puis ${k - 1} autres membres parmi ${n - 1} : ${n} × ${parmi(k - 1, n - 1)} = ${n} × ${C(n - 1, k - 1)} = ${v}.`)
      },
    ),
    // « Au moins un » par le complémentaire
    variants(
      () => {
        const k = randInt(2, 4)
        return num(`On lance un dé ${k} fois (résultats notés dans l'ordre). Combien de listes contiennent au moins un 6 ?`, 6 ** k - 5 ** k,
          `Complémentaire : 6^${k} = ${6 ** k} listes, dont 5^${k} = ${5 ** k} sans 6 : ${6 ** k - 5 ** k}.`)
      },
      () => num(`On tire simultanément 4 cartes dans ${JEU32}. Combien de mains contiennent au moins un as ?`, C(32, 4) - C(28, 4),
        `${parmi(4, 32)} − ${parmi(4, 28)} = 35 960 − 20 475 = 15 485.`),
      () => {
        const k = randInt(4, 8)
        return num(`On lance ${k} fois une pièce. Combien de suites de résultats contiennent au moins un « pile » ?`, 2 ** k - 1,
          `Toutes les suites sauf « face partout » : 2^${k} − 1 = ${2 ** k - 1}.`)
      },
      () => {
        const n = randInt(7, 10), r = randInt(3, n - 3), k = 3
        return num(`Une urne contient ${n} boules dont ${r} rouges. On tire 3 boules simultanément. Combien de tirages contiennent au moins une boule rouge ?`, C(n, k) - C(n - r, k),
          `${parmi(3, n)} − ${parmi(3, n - r)} = ${C(n, k)} − ${C(n - r, k)} = ${C(n, k) - C(n - r, k)}.`)
      },
    ),
    // Retrouver n
    variants(
      fresh(() => {
        const n = randInt(6, 20)
        return num(`Dans une soirée, chaque invité a serré la main de chacun des autres une seule fois. On a compté ${C(n, 2)} poignées de main. Combien d'invités y avait-il ?`, n,
          `{n(n − 1)/2} = ${C(n, 2)} donne n(n − 1) = ${n * (n - 1)} = ${n} × ${n - 1}, donc n = ${n}.`)
      }),
      fresh(() => {
        const n = randInt(5, 14)
        return num(`Dans un championnat, chaque équipe affronte chacune des autres deux fois (match aller et match retour). Il y a eu ${arr(n, 2)} matchs. Combien d'équipes ?`, n,
          `Nombre de matchs : n(n − 1) = ${arr(n, 2)} = ${n} × ${n - 1}, donc n = ${n}.`)
      }),
      fresh(() => {
        const n = randInt(4, 8)
        return num(`Trouve l'entier n tel que n! = ${big(fact(n))}.`, n,
          `${Array.from({ length: n }, (_, i) => i + 1).join(' × ')} = ${big(fact(n))}, donc n = ${n}.`)
      }),
      fresh(() => {
        const n = randInt(4, 10)
        return num(`Un ensemble possède ${2 ** n} parties. Combien d'éléments contient-il ?`, n,
          `2^n = ${2 ** n} = 2^${n}, donc n = ${n}.`)
      }),
    ),
    // Rangements avec contraintes
    variants(
      () => {
        const n = randInt(4, 7)
        return num(`${n} convives s'assoient autour d'une table ronde. Deux placements qui se déduisent l'un de l'autre par rotation sont considérés comme identiques. Combien de placements différents ?`, fact(n - 1),
          `On fixe un convive, puis on permute les ${n - 1} autres : (${n} − 1)! = ${fact(n - 1)}.`)
      },
      () => {
        const n = randInt(4, 7)
        const [a, b] = deuxPrenoms()
        return num(`${n} personnes, dont ${a} et ${b}, s'alignent pour une photo. Combien d'alignements placent ${a} et ${b} côte à côte ?`, 2 * fact(n - 1),
          `On « colle » ${a} et ${b} en un bloc : ${n - 1} éléments à permuter, soit ${n - 1}! = ${fact(n - 1)}, et 2 ordres dans le bloc : ${2 * fact(n - 1)}.`)
      },
      () => {
        const g = randInt(2, 4)
        return num(`${g} garçons et ${g} filles s'alignent en alternant garçon et fille. Combien d'alignements possibles ?`, 2 * fact(g) ** 2,
          `On choisit qui commence (2 choix), puis on permute les garçons (${g}!) et les filles (${g}!) : 2 × ${fact(g)} × ${fact(g)} = ${2 * fact(g) ** 2}.`)
      },
      () => {
        const a = randInt(2, 3), b = randInt(2, 3)
        return num(`On range sur une étagère ${a} livres de maths différents et ${b} livres d'histoire différents, en gardant les livres d'une même matière groupés. Combien de rangements possibles ?`, 2 * fact(a) * fact(b),
          `2 ordres pour les blocs, ${a}! dans le bloc de maths, ${b}! dans celui d'histoire : 2 × ${fact(a)} × ${fact(b)} = ${2 * fact(a) * fact(b)}.`)
      },
    ),
  ],
  // ── Palier 5 : exigeant ──
  [
    // Mains de 5 cartes
    variants(
      () => {
        const v = pick(VALEURS)
        return num(`On distribue une main de 5 cartes d'${JEU32}. Combien de mains contiennent exactement 2 ${v.p} ?`, C(4, 2) * C(28, 3),
          `${parmi(2, 4)} × ${parmi(3, 28)} = 6 × 3 276 = 19 656.`)
      },
      () => num(`On distribue une main de 5 cartes d'${JEU32}. Combien de mains contiennent un « carré » (4 cartes de même valeur) ?`, 8 * 28,
        `On choisit la valeur du carré (8 choix), puis la 5e carte parmi les 28 autres : 8 × 28 = 224.`),
      () => num(`On distribue une main de 5 cartes d'${JEU32}. Combien de mains sont un « full » (3 cartes d'une même valeur et 2 d'une autre valeur) ?`, 8 * 4 * 7 * 6,
        `Valeur du brelan : 8 choix, ses 3 cartes : ${parmi(3, 4)} = 4 ; valeur de la paire : 7 choix, ses 2 cartes : ${parmi(2, 4)} = 6. Total : 8 × 4 × 7 × 6 = 1 344.`),
      () => num(`On distribue une main de 5 cartes d'${JEU32}. Combien de mains ont leurs 5 cartes de la même couleur ?`, 4 * C(8, 5),
        `On choisit la couleur (4 choix), puis 5 cartes parmi ses 8 : 4 × ${parmi(5, 8)} = 4 × 56 = 224.`),
      () => num(`On distribue une main de 5 cartes d'${JEU32}. Combien de mains contiennent exactement un as et exactement un roi ?`, 16 * C(24, 3),
        `4 choix d'as, 4 choix de roi, puis 3 cartes parmi les 24 autres : 4 × 4 × ${parmi(3, 24)} = 16 × 2 024 = 32 384.`),
    ),
    // Chemins évitant un carrefour
    variants(
      () => {
        const m = randInt(3, 5), n = randInt(3, 4), p = randInt(1, m - 1), q = randInt(1, n - 1)
        const via = paths(p, q) * paths(m - p, n - q)
        return withMeta(num(`Dans un quartier de ${dims(m, n)}, le carrefour X, situé ${at(p, q)}, est en travaux. Combien de chemins de A à B l'évitent ?`, paths(m, n) - via,
          `Total : ${parmi(m, m + n)} = ${paths(m, n)} ; par X : ${paths(p, q)} × ${paths(m - p, n - q)} = ${via}. Il reste ${paths(m, n)} − ${via} = ${paths(m, n) - via}.`),
        { figure: gridFigure(m, n, { avoid: [[p, q]] }) })
      },
      () => {
        const m = randInt(4, 6), n = randInt(3, 4), p = randInt(1, m - 1), q = randInt(1, n - 1)
        const via = paths(p, q) * paths(m - p, n - q)
        return withMeta(num(`Une patrouille traverse un quartier de ${dims(m, n)} pour aller de A à B. Un ennemi guette au carrefour X (entouré), ${at(p, q)}. Combien de chemins sûrs (ne passant pas par X) la patrouille peut-elle suivre ?`, paths(m, n) - via,
          `${paths(m, n)} chemins au total, dont ${paths(p, q)} × ${paths(m - p, n - q)} = ${via} par X : ${paths(m, n) - via} chemins sûrs.`),
        { figure: gridFigure(m, n, { avoid: [[p, q]] }) })
      },
      () => {
        const m = randInt(4, 6), n = randInt(3, 4)
        // passer par le milieu de la première rue horizontale : on impose (1 ; 0) → (2 ; 0)
        const v = paths(m - 2, n)
        return withMeta(num(`Le quartier compte ${dims(m, n)}. Combien de chemins de A à B commencent par deux pas vers la droite ?`, v,
          `Après les deux premiers pas, il reste à aller de (2 ; 0) à B : ${m - 2} pas à droite et ${n} vers le haut, soit ${parmi(n, m - 2 + n)} = ${v}.`),
        { figure: gridFigure(m, n) })
      },
      () => {
        const m = randInt(4, 6), n = randInt(3, 4), p = randInt(1, m - 2), q = randInt(1, n - 1)
        // chemins passant par C ou par D (D à droite de C sur la même rue) : on compte par le complémentaire
        const viaC = paths(p, q) * paths(m - p, n - q)
        return withMeta(num(`Le quadrillage compte ${dims(m, n)}. Combien de chemins de A à B ne passent pas par le carrefour X, situé ${at(p, q)} ?`, paths(m, n) - viaC,
          `On retire du total ${paths(m, n)} les ${paths(p, q)} × ${paths(m - p, n - q)} = ${viaC} chemins passant par X : ${paths(m, n) - viaC}.`),
        { figure: gridFigure(m, n, { avoid: [[p, q]] }) })
      },
    ),
    // Géométrie combinatoire
    variants(
      () => {
        const n = randInt(6, 15)
        return num(`Combien de diagonales possède un polygone convexe à ${n} côtés ?`, (n * (n - 3)) / 2,
          `Segments joignant 2 sommets : ${parmi(2, n)} = ${C(n, 2)}, dont ${n} côtés : ${C(n, 2)} − ${n} = ${(n * (n - 3)) / 2}.`)
      },
      () => {
        const n = randInt(6, 12)
        return num(`On place ${n} points sur un cercle. Combien de triangles ont leurs trois sommets parmi ces points ?`, C(n, 3),
          `Trois points d'un cercle ne sont jamais alignés : ${parmi(3, n)} = ${C(n, 3)}.`)
      },
      () => {
        const a = randInt(3, 6), b = randInt(3, 6)
        const v = C(a, 2) * b + C(b, 2) * a
        return num(`On place ${a} points sur une droite d et ${b} points sur une droite d′ parallèle à d. Combien de triangles ont leurs sommets parmi ces ${a + b} points ?`, v,
          `2 points sur d et 1 sur d′ : ${C(a, 2)} × ${b} ; 1 sur d et 2 sur d′ : ${a} × ${C(b, 2)}. Total : ${v}.`)
      },
      () => {
        const a = randInt(2, 5), b = randInt(2, 4)
        const v = C(a + 1, 2) * C(b + 1, 2)
        return num(`Un damier rectangulaire compte ${a} cases en largeur et ${b} en hauteur. Combien de rectangles (de toutes tailles) dont les côtés suivent les lignes du damier peut-on y dessiner ?`, v,
          `Un rectangle = 2 lignes verticales parmi ${a + 1} et 2 lignes horizontales parmi ${b + 1} : ${C(a + 1, 2)} × ${C(b + 1, 2)} = ${v}.`)
      },
    ),
    // Répartitions
    variants(
      () => {
        const n = randInt(3, 5), k = randInt(2, 4)
        return num(`On répartit ${n} lettres différentes dans ${k} boîtes aux lettres (une boîte peut en recevoir plusieurs, ou aucune). Combien de répartitions ?`, k ** n,
          `Chaque lettre choisit sa boîte : ${k}^${n} = ${k ** n}.`)
      },
      () => {
        const n = randInt(2, 4)
        return num(`On partage ${2 * n} joueurs en deux équipes de ${n}, sans nom ni couleur (les équipes sont interchangeables). Combien de partages possibles ?`, C(2 * n, n) / 2,
          `Choisir une équipe : ${parmi(n, 2 * n)} = ${C(2 * n, n)} ; chaque partage est compté deux fois : ${C(2 * n, n) / 2}.`)
      },
      () => {
        const n = pick([3, 4])
        const v = fact(2 * n) / (2 ** n * fact(n))
        return num(`${2 * n} élèves doivent former ${n} binômes. Combien de façons de constituer les binômes ?`, v,
          `Le premier élève (par ordre alphabétique) choisit son partenaire : ${2 * n - 1} choix ; le premier des restants : ${2 * n - 3} choix… : ${Array.from({ length: n }, (_, i) => 2 * n - 1 - 2 * i).join(' × ')} = ${v}.`)
      },
      () => {
        const n = randInt(5, 8)
        return num(`On offre 3 cadeaux différents à ${n} enfants, chaque enfant recevant au plus un cadeau. Combien de distributions ?`, arr(n, 3),
          `On choisit l'enfant du 1er cadeau, puis du 2e, puis du 3e : ${prodText(n, 3)} = ${arr(n, 3)}.`)
      },
    ),
    // Parties avec contraintes
    variants(
      () => {
        const n = randInt(5, 10)
        return num(`Combien de parties de {1 ; 2 ; … ; ${n}} contiennent 1 mais pas 2 ?`, 2 ** (n - 2),
          `1 et 2 sont fixés ; on choisit librement parmi les ${n - 2} autres : 2^${n - 2} = ${2 ** (n - 2)}.`)
      },
      () => {
        const n = randInt(4, 9)
        return num(`Combien de parties d'un ensemble à ${n} éléments ont au moins 2 éléments ?`, 2 ** n - n - 1,
          `On retire la partie vide et les ${n} singletons : 2^${n} − ${n} − 1 = ${2 ** n - n - 1}.`)
      },
      () => {
        const n = randInt(4, 10)
        return num(`Combien de parties d'un ensemble à ${n} éléments ont un nombre pair d'éléments (la partie vide compte) ?`, 2 ** (n - 1),
          `Il y en a autant de cardinal pair que de cardinal impair (on ajoute ou retire un élément fixé), donc 2^${n} ÷ 2 = ${2 ** (n - 1)}.`)
      },
      () => {
        const n = randInt(5, 9), k = randInt(2, 3)
        return num(`Combien de parties à ${k + 1} éléments de {1 ; 2 ; … ; ${n}} contiennent l'élément ${n} ?`, C(n - 1, k),
          `${n} est imposé ; on complète avec ${k} éléments parmi les ${n - 1} autres : ${parmi(k, n - 1)} = ${C(n - 1, k)}.`)
      },
    ),
  ],
]

// ═══ Problèmes d'amélioration ═══════════════════════════════════════════
const upgrades: Ladder = [
  [
    () => {
      const n = randInt(12, 30)
      return T('Le polygone du bâtisseur', num(`Un bâtisseur trace un polygone convexe à ${n} côtés et relie chaque sommet à tous les sommets non voisins. Combien de diagonales trace-t-il ?`, (n * (n - 3)) / 2,
        `Chaque sommet est relié à ${n - 3} sommets (ni lui-même, ni ses deux voisins) ; chaque diagonale est comptée deux fois : {${n} × ${n - 3}/2} = ${(n * (n - 3)) / 2}.`))
    },
    () => {
      const n = randInt(8, 16)
      return T('La ligne du triangle', num(`Calcule la somme de tous les coefficients de la ligne ${n} du triangle de Pascal.`, 2 ** n,
        `Σ ${parmi('k', n)} pour k de 0 à ${n} = nombre de parties d'un ensemble à ${n} éléments = 2^${n} = ${big(2 ** n)}.`))
    },
    () => {
      const n = randInt(8, 12), k = randInt(3, 4)
      return T('Les signaux du phare', num(`Un phare émet des messages de ${n} signaux, chacun long ou bref. Combien de messages comportent exactement ${k} signaux longs ?`, C(n, k),
        `On choisit les rangs des ${k} signaux longs : ${parmi(k, n)} = {${prodText(n, k)}/${k}!} = ${C(n, k)}.`))
    },
    () => {
      const n = randInt(10, 25)
      return T('Le tournoi des seigneurs', num(`${n} seigneurs organisent un tournoi où chacun affronte chacun des autres exactement une fois. Combien de duels faut-il prévoir ?`, C(n, 2),
        `${parmi(2, n)} = {${n} × ${n - 1}/2} = ${C(n, 2)}.`))
    },
  ],
  [
    () => {
      const n = randInt(5, 9), k = randInt(2, n - 2)
      return T('Le coefficient caché', num(`En développant (1 + x)^${n}, quel est le coefficient de x^${k} ?`, C(n, k),
        `Formule du binôme : (1 + x)^${n} = Σ ${parmi('k', n)} x^{k}, donc le coefficient est ${parmi(k, n)} = ${C(n, k)}.`))
    },
    () => {
      const n = randInt(4, 6), k = randInt(1, n - 1)
      const v = C(n, k) * 2 ** (n - k)
      const xk = k === 1 ? 'x' : `x^${k}`
      return T('Le binôme pondéré', num(`En développant (x + 2)^${n}, quel est le coefficient de ${xk} ?`, v,
        `Terme en ${xk} : ${parmi(k, n)} ${xk} × 2^${n - k}, coefficient ${C(n, k)} × ${2 ** (n - k)} = ${v}.`))
    },
    () => {
      const n = randInt(5, 12)
      return T('Les étoiles et les barres', num(`De combien de façons peut-on répartir ${n} pièces d'or identiques entre 3 coffres (un coffre peut rester vide) ?`, C(n + 2, 2),
        `On aligne les ${n} pièces et 2 séparateurs : on choisit la place des 2 séparateurs parmi ${n + 2} positions, ${parmi(2, n + 2)} = ${C(n + 2, 2)}.`))
    },
    () => {
      const n = randInt(5, 14)
      return T('Les parties paires', num(`Calcule ${parmi(0, n)} + ${parmi(2, n)} + ${parmi(4, n)} + … (tous les coefficients d'indice pair de la ligne ${n}).`, 2 ** (n - 1),
        `(1 + 1)^${n} = 2^${n} est la somme de tous les coefficients et (1 − 1)^${n} = 0 leur somme alternée ; en additionnant, deux fois la somme cherchée vaut 2^${n}, d'où 2^${n - 1} = ${2 ** (n - 1)}.`))
    },
  ],
  [
    () => {
      const a = randInt(2, 3), b = randInt(2, 3), c = randInt(1, 2)
      const v = fact(a + b + c) / (fact(a) * fact(b) * fact(c))
      return T('Le chemin dans la tour', num(`Dans une tour en forme de grand cube découpé en salles, un espion va d'un coin à l'autre en faisant ${a} pas vers l'est, ${b} vers le nord et ${c} vers le haut, dans un ordre quelconque. Combien de trajets possibles ?`, v,
        `On place les ${a + b + c} pas : {${a + b + c}!/${a}! × ${b}! × ${c}!} = ${v}.`))
    },
    () => {
      const n = randInt(3, 9)
      if (Math.random() < 0.5) {
        return T('Les paires emboîtées', num(`E est un ensemble à ${n} éléments. Combien de couples (A ; B) de parties de E vérifient A ⊂ B ?`, 3 ** n,
          `Chaque élément de E est : dans A (donc dans B), dans B mais pas dans A, ou hors de B. 3 choix par élément : 3^${n} = ${big(3 ** n)}.`))
      }
      return T('Les paires emboîtées', num(`Un roi possède ${n} domaines. Il en confie certains à son fils aîné (éventuellement aucun), puis choisit, parmi ceux-là, ceux que l'aîné devra partager avec son cadet. Combien de décisions possibles ?`, 3 ** n,
        `Chaque domaine est soit gardé par le roi, soit confié à l'aîné seul, soit confié à l'aîné et partagé : 3 choix par domaine, 3^${n} = ${big(3 ** n)}.`))
    },
    () => {
      const n = pick([3, 4, 5])
      const v = fact(2 * n) / (2 ** n * fact(n))
      const q = pick([
        `Au bal du château, ${2 * n} invités doivent former ${n} couples de danse (sans distinction de rôle dans un couple, ni d'ordre entre les couples). Combien de répartitions en couples sont possibles ?`,
        `Pour la garde de nuit, ${2 * n} soldats doivent être répartis en ${n} binômes (les binômes ne sont pas numérotés). Combien de répartitions possibles ?`,
        `${2 * n} joueurs d'échecs s'apparient pour une ronde de ${n} parties simultanées (on ne tient compte ni des couleurs ni des tables). Combien d'appariements possibles ?`,
      ])
      return T('Le bal du château', num(q, v,
        `${Array.from({ length: n }, (_, i) => 2 * n - 1 - 2 * i).join(' × ')} = ${v} (le premier invité restant choisit à chaque fois son partenaire).`))
    },
    () => {
      const m = randInt(4, 6), n = randInt(3, 4)
      const a = randInt(1, 2), b = 1, c = randInt(a + 1, m - 1), d = randInt(2, n - 1)
      const through1 = paths(a, b) * paths(m - a, n - b)
      const through2 = paths(c, d) * paths(m - c, n - d)
      const both = paths(a, b) * paths(c - a, d - b) * paths(m - c, n - d)
      const v = paths(m, n) - through1 - through2 + both
      const fig = gridFigure(m, n, { avoid: [[a, b], [c, d]] })
      return T('Deux carrefours bloqués', num(`Dans un quartier de ${dims(m, n)}, les carrefours X et Y (entourés) sont bloqués : X est ${at(a, b)} et Y ${at(c, d)}. Combien de chemins de A à B évitent X et Y ?`, v,
        `Total ${paths(m, n)} ; par X : ${through1} ; par Y : ${through2} ; par X et Y : ${both}. Inclusion-exclusion : ${paths(m, n)} − ${through1} − ${through2} + ${both} = ${v}.`), fig)
    },
  ],
]

// ═══ Problèmes de l'hôtel de ville ══════════════════════════════════════
const age: Ladder = [
  [
    () => {
      const e = randInt(3, 5), p = randInt(3, 6), d = randInt(2, 5)
      const v = e * p + p * d + e * p * d
      return T('La taverne du Dragon', num(`À la taverne du Dragon, on peut commander trois formules : « entrée + plat », « plat + dessert » ou « entrée + plat + dessert ». La carte propose ${e} entrées, ${p} plats et ${d} desserts. Combien de repas différents peut-on commander ?`, v,
        `On additionne les trois formules (elles ne se chevauchent pas) : ${e} × ${p} + ${p} × ${d} + ${e} × ${p} × ${d} = ${e * p} + ${p * d} + ${e * p * d} = ${v}.`))
    },
    () => {
      const k = randInt(3, 4)
      const v = 10 ** (k - 1) * 5
      const who = personnage()
      return T('Le cadenas du coffre', num(`${cap(who.nom)} a oublié le code à ${k} chiffres de son coffre. ${cap(who.il)} se souvient seulement que le dernier chiffre est pair. Combien de codes faut-il essayer au maximum ?`, v,
        `Les ${k - 1} premiers chiffres sont libres (10 choix chacun), le dernier a 5 choix (0, 2, 4, 6, 8) : 10^${k - 1} × 5 = ${big(v)}.`))
    },
    () => {
      const n = randInt(8, 14)
      const who = pick(['chevaux courent le grand prix du roi', 'archers tirent au concours de la Saint-Jean', 'coureurs disputent la course des remparts'])
      return T('Le tiercé royal', num(`${n} ${who}. Un parieur doit annoncer les trois premiers dans l'ordre. Combien de pronostics différents sont possibles ?`, arr(n, 3),
        `${n} choix pour le premier, ${n - 1} pour le deuxième, ${n - 2} pour le troisième : ${arr(n, 3)}.`))
    },
    () => {
      const n = randInt(5, 8)
      const where = pick(['Sur les remparts', 'Pour la fête du village', 'À l’entrée du tournoi'])
      return T('Les étendards', num(`${where}, on hisse ${n} étendards de couleurs différentes sur ${n} mâts alignés. Combien de dispositions possibles ?`, fact(n),
        `${n}! = ${prodText(n, n)} = ${big(fact(n))}.`))
    },
  ],
  [
    () => {
      const f = randInt(5, 8), h = randInt(5, 8)
      const v = C(f, 2) * C(h, 2) + C(f, 3) * h + C(f, 4)
      return T('Le conseil de la guilde', num(`La guilde des marchands compte ${f} femmes et ${h} hommes. Elle élit un conseil de 4 membres comptant au moins 2 femmes. Combien de conseils possibles ?`, v,
        `2 femmes : ${C(f, 2)} × ${C(h, 2)} = ${C(f, 2) * C(h, 2)} ; 3 femmes : ${C(f, 3)} × ${h} = ${C(f, 3) * h} ; 4 femmes : ${C(f, 4)}. Total : ${v}.`))
    },
    () => {
      const m = randInt(4, 6), n = randInt(3, 4), p = randInt(1, m - 1), q = randInt(1, n - 1)
      const v = paths(p, q) * paths(m - p, n - q)
      return T('Les ruelles de la cité', num(`Pour aller de sa maison A au marché B, ${prenom()} doit déposer un colis chez le forgeron F, situé ${at(p, q)}, en suivant au plus court les rues d'un quartier de ${dims(m, n)}. Combien d'itinéraires possibles ?`, v,
        `A → F : ${parmi(p, p + q)} = ${paths(p, q)} ; F → B : ${parmi(m - p, m - p + n - q)} = ${paths(m - p, n - q)} ; total ${v}.`), gridFigure(m, n, { via: [p, q], viaName: 'F' }))
    },
    () => {
      const k = pick([4, 5])
      if (Math.random() < 0.5) {
        const v = pick(VALEURS)
        return T('La partie de cartes', num(`Au tripot du port, on joue avec ${JEU32}. Un joueur reçoit ${k} cartes. Combien de mains contiennent au moins ${v.s} ?`, C(32, k) - C(28, k),
          `Complémentaire : ${parmi(k, 32)} − ${parmi(k, 28)} = ${big(C(32, k))} − ${big(C(28, k))} = ${big(C(32, k) - C(28, k))}.`))
      }
      const col = pick(COULEURS)
      return T('La partie de cartes', num(`Au tripot du port, on joue avec ${JEU32}. Un joueur reçoit ${k} cartes. Combien de mains contiennent au moins un ${col} ?`, C(32, k) - C(24, k),
        `Complémentaire : on retire les mains sans ${col}, prises parmi les 24 autres cartes : ${parmi(k, 32)} − ${parmi(k, 24)} = ${big(C(32, k))} − ${big(C(24, k))} = ${big(C(32, k) - C(24, k))}.`))
    },
    () => {
      const n = randInt(4, 7), p = randInt(2, 4)
      const v = p * C(n, 2) + C(p, 2)
      return T('Le tournoi de joute', num(`${p * n} chevaliers sont répartis en ${p} poules de ${n}. Dans chaque poule, chacun affronte chacun une fois ; puis les ${p} vainqueurs de poule s'affrontent à leur tour chacun une fois. Combien de joutes au total ?`, v,
        `Chaque poule : ${parmi(2, n)} = ${C(n, 2)} joutes, soit ${p} × ${C(n, 2)} = ${p * C(n, 2)} ; phase finale : ${parmi(2, p)} = ${C(p, 2)}. Total : ${v}.`))
    },
  ],
  [
    () => {
      const m = randInt(4, 6), n = randInt(3, 4), p = randInt(1, m - 1), q = randInt(1, n - 1)
      const via = paths(p, q) * paths(m - p, n - q)
      return T('Le messager pressé', num(`Un messager doit aller du château A au camp B par le plus court chemin, à travers un bourg de ${dims(m, n)}, mais une embuscade l'attend au carrefour X, ${at(p, q)}. Combien d'itinéraires lui permettent d'éviter X ?`, paths(m, n) - via,
        `Tous les chemins : ${parmi(m, m + n)} = ${paths(m, n)}. Par X : ${paths(p, q)} × ${paths(m - p, n - q)} = ${via}. Sans X : ${paths(m, n) - via}.`), gridFigure(m, n, { avoid: [[p, q]] }))
    },
    () => {
      const [N, g] = pick([[49, 5], [49, 6], [45, 5], [40, 5], [36, 6]] as const)
      const k = randInt(2, g - 1)
      const v = C(g, k) * C(N - g, g - k)
      return T('La loterie du royaume', num(`À la loterie du royaume, on coche ${g} numéros parmi ${N} ; le tirage désigne ${g} numéros gagnants. Combien de grilles ont exactement ${k} bons numéros ?`, v,
        `${k} numéros parmi les ${g} gagnants et ${g - k} parmi les ${N - g} perdants : ${parmi(k, g)} × ${parmi(g - k, N - g)} = ${C(g, k)} × ${big(C(N - g, g - k))} = ${big(v)}.`))
    },
    () => {
      const n = randInt(3, 6)
      const [c1, c2] = pick([['rouge', 'bleue'], ['or', 'argent'], ['du Lion', 'de l’Aigle']])
      return T('Les deux bannières', num(`${2 * n} chevaliers se répartissent en deux équipes de ${n} (bannière ${c1} et bannière ${c2}), puis chaque équipe désigne son capitaine. Combien d'organisations possibles ?`, C(2 * n, n) * n * n,
        `Équipe ${c1} : ${parmi(n, 2 * n)} = ${C(2 * n, n)} ; le reste forme l'équipe ${c2} ; un capitaine dans chaque équipe : ${n} × ${n}. Total : ${C(2 * n, n)} × ${n * n} = ${big(C(2 * n, n) * n * n)}.`))
    },
    () => {
      const n = randInt(7, 12)
      const v = C(n, 3) - n * (n - 4) - n
      const q = pick([
        `${n} tours de guet sont réparties régulièrement sur une muraille circulaire. Le capitaine veut y poster 3 sentinelles, dans 3 tours dont aucune n'est voisine d'une autre. Combien de choix de tours possibles ?`,
        `${n} chaises entourent la table ronde du conseil. On veut y asseoir 3 émissaires rivaux, de sorte qu'aucun ne soit assis juste à côté d'un autre. Combien de choix des 3 chaises possibles ?`,
      ])
      return T('Les tours de guet', num(q, v,
        `Total ${parmi(3, n)} = ${C(n, 3)}. Trois places consécutives : ${n} choix. Exactement deux voisines : ${n} paires de voisines × ${n - 4} troisièmes places non voisines = ${n * (n - 4)}. Reste ${C(n, 3)} − ${n} − ${n * (n - 4)} = ${v}.`))
    },
  ],
]

export const CONTENT: SubjectContent | null = { tiers, upgrades, age }
