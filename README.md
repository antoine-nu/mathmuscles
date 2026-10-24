# MathMuscles

Muscle-toi en maths en bâtissant une armée façon *Age of Empires* : chaque chapitre du programme est une maison qui
forme un corps d'armée, chaque exercice réussi entraîne un soldat… et on peut défier un camarade en direct.

## Démarrer

```bash
npm install
npm run dev        # http://localhost:5173
```

| Commande | Rôle |
| --- | --- |
| `npm run build` | build de production dans `dist/` (vérifie aussi les types) |
| `npm run build:usb` | fichier unique `dist-usb/MathMuscles.html`, à ouvrir d'un double-clic (clé USB) |
| `npm run preview` | sert le build localement |
| `npm run typecheck` | vérification TypeScript seule |
| `npm run check:exercises` | vérifie tous les modèles d'exercices (justesse, écriture, variété). `-- samples 5e-geo` affiche des exemples |
| `npm run balance` | tournoi automatique d'équilibrage des unités |

Pages utiles : `/?problemes` (relecture de tous les exercices et problèmes, avec figures), `/?galerie` (toutes les unités),
`/?bataille` (bataille de démonstration immédiate).

## Modes de jeu

- **Entraînement libre** : on fait grandir son royaume à son rythme ; la progression est sauvegardée dans le navigateur.
- **Défier l'ordinateur** : on choisit la durée et la **note sur 20** de l'adversaire (sa vitesse et sa réussite en dépendent).
- **Défier un camarade** : l'un crée une partie et donne le **code à 4 caractères**, l'autre le saisit. L'hôte choisit la
  durée (5, 10, 15 ou 20 min) et lance la partie. Les deux classes peuvent être différentes (5e contre 2nde).

Une partie en duel : **compte à rebours d'entraînement** (chacun forme la plus grande armée possible, améliorations et
âges compris ; on voit l'âge et la population de l'adversaire, pas sa composition) → **bataille** (les armées se
déploient, se ruent l'une sur l'autre et combattent jusqu'à l'élimination d'un camp ; au bout de 2 min 30, la plus
grande valeur d'armée restante l'emporte). Pendant la bataille, le **cor de guerre** : une question de calcul mental
juste donne +25 % d'attaque pendant 5 s (3 fois au plus).

### La tuyauterie du duel

Pas de serveur à héberger : les deux navigateurs se parlent directement (WebRTC) et se trouvent grâce à
[Trystero](https://github.com/dmotz/trystero), qui passe par des relais publics Nostr. L'hôte calcule la bataille et en
envoie dix images par seconde à l'invité. Certains réseaux (établissements, pare-feu stricts) bloquent ces connexions :
en cas d'échec, essayer depuis un autre réseau (partage de connexion d'un téléphone par exemple).

Pour tester seul : ouvrir deux onglets sur `/?reseau=local` (les onglets se parlent sans Internet) ; ajouter
`&chrono=30` pour un entraînement de 30 secondes.

## Règles

**Maisons et crans.** Chaque bonne réponse vaut 1 point. Un cran de jauge = 10 points en entraînement libre, 2 en duel
(3 pour les parties de 20 min). 5 crans par maison ; l'effectif passe de 1 villageois à 3, 5, 8, 11 puis 15 soldats, avec
des recrues intermédiaires. Rang des soldats : villageois (cran 0), recrue (1-2), vétéran (3-4), élite (5).

**Entraînement.** Séries de 5 exercices ; 5 paliers de difficulté par chapitre (cran 0 → palier 1 … cran 4+ → palier 5).
Les modèles les moins récemment vus sont proposés en priorité, pour que deux parties ne se ressemblent pas.

**Améliorations** (3 par maison, effets réels en bataille). Chacune s'obtient en résolvant **un problème** de
généralisation, plus difficile que l'entraînement : n°1 avec l'Âge féodal et le cran 2, n°2 avec l'Âge des châteaux et le
cran 3, n°3 avec l'Âge impérial et le cran 4. Échec → nouvel essai après une courte attente.

**Hôtel de ville et âges.** Clic sur l'hôtel de ville : pour chaque maison, un problème à 1, 2 ou 3 points (débloqués aux
crans 2, 3 et 4), chacun une fois par partie. Les points font passer de l'Âge sombre à l'Âge féodal, des châteaux puis
impérial (seuils 3/8/14 en entraînement libre, 1/3/6 pour un duel de 15 min). Chaque âge donne +8 % de points de vie et
d'attaque à toute l'armée.

### Grille des unités (rang « recrue »)

| Unité | Coût | PV | Attaque | Armure (mêlée / flèches) | Portée | Vitesse | Fort contre | Faible contre |
|---|---|---|---|---|---|---|---|---|
| Infanterie | 1 | 55 | 7 | 1 / 0 | contact | 1,0 | lanciers, éclaireurs, moines | archers, chevaliers, siège |
| Lanciers | 1 | 45 | 4 (+12 contre cavalerie) | 0 / 0 | 1,3 | 1,0 | chevaliers, éclaireurs, siège | infanterie, archers, moines |
| Archers | 1 | 30 | 5 (+3 contre fantassins) | 0 / 0 | 9 | 0,95 | infanterie, lanciers, moines | éclaireurs, chevaliers, siège |
| Éclaireurs | 1,25 | 88 | 8 (+6 archers, +12 siège, +10 moines) | 1 / 2 | contact | **1,8** | archers, siège, moines | infanterie, lanciers, chevaliers |
| Chevaliers | 2 | 140 | 11 | 2 / 2 | contact | 1,4 | infanterie, archers, éclaireurs | lanciers, moines |
| Engins de siège | 3 | 70 | 22, **zone** | 1 / 6 | 11 | 0,5 | masses de fantassins et d'archers | lanciers, éclaireurs |
| Moines | 2 | 40 | **conversion** 35 % / 3,5 s, soins | 0 / 0 | 6 | 0,8 | chevaliers, siège | infanterie, archers, éclaireurs |

Le coût indique la part d'effectif consommée : une maison de chevaliers donne deux fois moins d'unités qu'une maison de
lanciers. Rangs : vétéran ×1,3 PV, +2 attaque, +1 armure ; élite ×1,6 PV, +4, +2. Valeurs validées par `npm run balance`
(sur des armées mixtes aléatoires, aucune unité ne fait gagner plus de 59 % ni moins de 44 % des batailles).

## Contenu

821 modèles d'exercices générés aléatoirement (395 d'entraînement, 211 problèmes d'amélioration, 215 problèmes de
l'hôtel de ville), dont 117 avec figure de géométrie. Réponses ouvertes autant que possible : nombres, fractions,
expressions en x (contrôle « développé » / « factorisé »), a√b, couples, intervalles, ensembles de solutions.

## Organisation du code

```
src/
  data/curriculum.ts      niveaux, chapitres (maisons), améliorations, crans, âges
  exercises/              entraînement (cinquieme.ts, seconde.ts), améliorations (upgrades*.ts),
                          hôtel de ville (age*.ts), moteur de correction (utils.ts), figures (figure.ts), contextes
  game/                   état du joueur, règles (libre / duel), projection isométrique
  battle/                 grille des unités, simulation, rendu canvas, flux réseau, questions du cor
  bot/                    adversaire ordinateur
  net/                    transport du duel (Trystero ou onglets locaux) et protocole
  screens/                accueil, entraînement, duels, bataille
  components/             carte isométrique, sprites, bâtiments, parchemin, hôtel de ville, figures
scripts/                  vérification des exercices, équilibrage, build clé USB
```

## Déployer sur Vercel

Importer le dépôt dans Vercel : le framework **Vite** est détecté automatiquement (build `npm run build`, sortie `dist`).
