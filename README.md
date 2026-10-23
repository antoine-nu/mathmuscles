# MathMuscles

Muscle-toi en maths en bâtissant une armée façon *Age of Empires* : chaque chapitre du programme est un corps d'armée qui grossit à chaque exercice réussi.

## Démarrer

```bash
npm install
npm run dev        # http://localhost:5173
```

Autres commandes :

| Commande | Rôle |
| --- | --- |
| `npm run build` | build de production dans `dist/` (vérifie aussi les types) |
| `npm run preview` | sert le build localement |
| `npm run typecheck` | vérification TypeScript seule |

La galerie de toutes les unités est visible sur <http://localhost:5173/?galerie>.

## Déployer sur Vercel

Importer le dépôt dans Vercel : le framework **Vite** est détecté automatiquement (build `npm run build`, sortie `dist`). Aucune configuration supplémentaire.

## Règles du jeu (maquette)

- Une **série** = 5 exercices, générés aléatoirement pour le chapitre.
- Chaque bonne réponse = 1 point. **10 points = 1 cran de jauge**, 5 crans → 50 bonnes réponses pour un corps d'armée complet.
- L'armée grossit **à chaque série** : de 1 villageois à 3, 5, 8, 11 puis 15 soldats aux crans 1 à 5, avec des recrues intermédiaires entre deux crans.
- Rang des soldats : villageois (cran 0), recrue (crans 1-2), vétéran (crans 3-4), élite (cran 5).
- **5 paliers de difficulté par chapitre** : le palier n correspond au cran n − 1 (cran 0 → palier 1, … cran 4 et plus → palier 5). Les paliers élevés contiennent des problèmes rédigés.
- Réponses **ouvertes** autant que possible : nombres, fractions (irréductibles si demandé), expressions en x (contrôle « développé et réduit » ou « factorisé »), a√b, couples (x ; y), intervalles, ensembles de solutions. Un clavier de symboles accompagne la saisie ; une réponse illisible est signalée sans être comptée fausse.
- Sur la carte, chaque bâtiment porte un **écusson** : cran en chiffres romains, anneau de progression vers le cran suivant, effectif du corps. Les nouvelles recrues arrivent avec une animation.
- Jauge pleine → 3 **améliorations** par corps (armure, arme, étendard…), chacune obtenue par une *série d'élite* (palier 5) réussie à 4/5 au moins.
- La progression est sauvegardée dans le navigateur (`localStorage`).
- Le **mode démo** (case en haut à droite) permet de simuler la progression pour voir l'évolution des armées.

## Organisation du code

```
src/
  data/curriculum.ts      niveaux, chapitres, corps d'armée, améliorations, règles de progression
  exercises/              exercices par chapitre et par palier (5e, 2nde) + moteur de correction (expressions, intervalles…)
  game/                   progression (localStorage), projection isométrique, couleurs
  components/
    WorldMap.tsx          carte isométrique SVG (terrain, camps, formations, pan/zoom)
    UnitSprite.tsx        sprites vectoriels des unités (rangs + améliorations)
    Buildings.tsx         bâtiments isométriques, bannières, hôtel de ville
    Scenery.tsx           arbres, rochers, buissons, gibier
    CommandPanel.tsx      panneau du bas : portrait, jauge, rangs, entraînement, améliorations
    ExerciseModal.tsx     parchemin de série d'exercices + mini-rendu mathématique
    LevelSelect.tsx       choix de la classe
```
