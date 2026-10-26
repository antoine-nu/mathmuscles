# Écrire un sujet (chapitre) d'Age of Equations

Un sujet = un chapitre du programme. Le joueur choisit 7 sujets de son niveau, un par « maison » de son village ; chaque
bonne réponse dans une maison forme des soldats. Chaque sujet vit dans **son propre fichier**
`src/exercises/subjects/<id>.ts` et exporte :

```ts
import type { SubjectContent } from '../utils'
export const CONTENT: SubjectContent | null = { tiers, upgrades, age }
```

- `tiers: Tiers` — **entraînement**, 5 paliers de difficulté croissante (`[Maker[], Maker[], Maker[], Maker[], Maker[]]`),
  **au moins 4 modèles par palier**. Un `Maker` est une fonction sans argument qui renvoie un `Exercise`
  (voir `../utils.ts`).
- `upgrades: Ladder` — **problèmes d'amélioration** : 3 niveaux (`[Maker[], Maker[], Maker[]]`), au moins 3 modèles
  par niveau. Ce sont des problèmes de **généralisation / approfondissement**, plus difficiles que l'entraînement,
  difficulté croissante du niveau 1 au niveau 3. Un seul exercice par problème.
- `age: Ladder` — **problèmes de l'hôtel de ville** : 3 niveaux (rapportent 1, 2, 3 points), au moins 3 modèles par
  niveau. Ce sont de **vrais problèmes avec énoncé** (une situation, un `title` court comme « Le pont-levis », des
  données, une question), difficulté croissante. Mettez des **schémas** (`figure`) dès que la notion s'y prête
  (géométrie, fonctions, repérage, statistiques) : le professeur les apprécie beaucoup.

Ne modifiez **que vos propres fichiers de sujets**. D'autres personnes écrivent les autres sujets en même temps.
Écrivez dans votre fichier les petites aides dont vous avez besoin, au lieu de modifier `utils.ts` ou `figure.ts`.

## Règles du jeu à respecter
- Pendant une série de 5 exercices, l'élève répète **un seul modèle** d'un palier (il en change à la série suivante) : la
  **mécanique** se répète, mais pas l'énoncé. Chaque modèle d'entraînement doit donc tirer au hasard parmi
  **3 à 6 variantes** (contexte, configuration, forme, nombre de données…) de la même compétence, de difficulté
  homogène. Utilisez `variants(...)` et `fresh(...)` de `../utils` (voir leurs commentaires).
- Une configuration « triviale » (réponse écrite dans l'énoncé) peut exister mais doit rester minoritaire (< 25 %).
- Au cran suivant, l'élève passe aux modèles d'un palier plus difficile.
- Paliers : 5e et 2nde utilisent les paliers 1 à 5 (cran 1 → palier 1 … cran 5 → palier 5). Les sujets de
  **Terminale** (`T-*`) servent à deux niveaux « adultes » : « remise en jambes » (adultes qui ont un peu oublié)
  joue les paliers **1 à 3**, « aguerris » joue les paliers **2 à 5**. Pour les sujets T : palier 1 = rappel
  élémentaire très guidé (définition, application directe), palier 3 = exercice standard de Terminale,
  palier 5 = exercice exigeant mais faisable de tête ou au brouillon en 1 à 3 minutes.

## Réponses
Réponses **ouvertes** autant que possible (le QCM `choice` seulement si la notion l'exige : vrai/faux, choix de
méthode…). Constructeurs disponibles dans `../utils.ts` : `numeric` (nombre, accepte fractions et décimaux),
`fraction`, `expression` (expression en x, avec contrôle « développé » / « factorisé »), `radical` (a√b), `pair`
(couple), `interval`, `solutionSet` (ensemble de solutions), `choice`. Vous pouvez écrire vos propres constructeurs
dans votre fichier (un `Exercise` a `prompt`, `kind: 'input'`, `answer`, `check(v)`, `isValid?(v)`, `format?`,
`keypad?`, `inputHint?`, `explanation`). Toute réponse doit être vérifiable automatiquement et **l'explication**
(`explanation`) doit toujours être présente et juste.

## Écriture
- Français soigné ; signe moins « − » (U+2212) ; virgule décimale ; nombres via `fmt`, nombres négatifs entre
  parenthèses via `par` ; fractions empilées `F(a, b)` → `{a/b}` ; exposants `x^2` ou `x^{n+1}` ; racines `√{2}` ;
  indices `u_n`, `x_B` (une lettre) ; vecteur : `AB⃗` (lettres suivies de U+20D7).
- Contextes variés (médiévaux bienvenus — c'est un jeu façon Age of Empires — mais aussi modernes).
- Programme Python : champ `code` de l'exercice (texte multiligne, indentation conservée), la question dans `prompt`.

## Schémas (`figure`, voir `../figure.ts`)
- `triangleFigure`, `parallelsFigure`, `thalesFigure`, `fitPoints` (points en coordonnées mathématiques placés dans le
  cadre), segments (`label`, `dashed`, `extend`, `mark`, `head` pour une flèche de vecteur), angles (`label`, `right`,
  `color`), `polygons` (zones colorées), `circles`, `notes` (textes), `curves` (lignes brisées).
- **`graphFigure({ xMin, xMax, yMin, yMax, step?, labelStep? })`** : repère gradué avec quadrillage ; renvoie
  `{ figure, at, plot, point, segment, note }` — `plot(f)` trace une courbe, `point('A', x, y)` place un point,
  `segment('A', 'B', { head: true })` trace un vecteur. Idéal pour lire une image, un antécédent, des variations,
  un coefficient directeur, des coordonnées, un nuage de points, un histogramme…
- Une figure doit être **cohérente avec les données** tirées (pas d'étiquette contredite par le dessin quand la
  figure se veut fidèle ; sinon la légende par défaut indique « La figure n'est pas à l'échelle »).

## Vérification (obligatoire avant de rendre)
- `npm run check:exercises -- <id>` (ex. `npm run check:exercises -- T-suites`) : anomalies d'écriture, réponses
  refusées, explications manquantes, figures hors cadre, variété, et « Monotonie » (moins de 3 formulations par
  modèle d'entraînement, ou réponse écrite dans l'énoncé). Objectif : **0 anomalie, 0 remarque** pour vos sujets.
  `RUNS=150` accélère pendant le travail. `npm run check:exercises -- samples <id>` affiche un exemple par modèle.
- `npx tsc -b --noEmit` doit passer pour vos fichiers (ignorez les erreurs dans les fichiers des autres).
- Relisez des échantillons : justesse mathématique, niveau adapté, variété réelle, énoncés naturels.
- Page de relecture visuelle (figures comprises) : `/?problemes&chapitre=<id>` dans le jeu (`npm run dev`).
