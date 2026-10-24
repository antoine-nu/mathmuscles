# MathMuscles

Muscle-toi en maths en bâtissant une armée façon *Age of Empires* : chaque chapitre du programme est une maison qui
forme un corps d'armée, chaque bonne réponse forme des troupes… et on peut défier un camarade en direct.

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
`/?bataille` (bataille de démonstration immédiate), `/?bataille=artillerie` (démonstration avec engins de siège).

## Modes de jeu

- **Entraînement libre** : on fait grandir son royaume à son rythme ; la progression est sauvegardée dans le navigateur.
- **Défier l'ordinateur** : on choisit la durée et la **note sur 20** de l'adversaire (sa vitesse et sa réussite en dépendent).
- **Défier un camarade** : l'un crée une partie et donne le **code à 4 caractères**, l'autre le saisit. L'hôte choisit la
  durée (15, 30, 45 min ou 1 heure). Les deux classes peuvent être différentes (5e contre 2nde) : les unités sont les
  mêmes, seuls les exercices changent ; sur 1 200 batailles simulées entre élèves de même niveau (15 min à 1 h),
  chaque classe gagne entre 47 et 53 % du temps.

Avant chaque partie, un écran de **préparation** présente le **Codex des armées** (vie, attaque, armures, portée,
vitesse, coût, forces et faiblesses, améliorations de chaque unité, avec la maison et le thème qui la forment) ; chaque
joueur clique sur « Je suis prêt », puis un compte à rebours lance le chrono. Le Codex reste consultable pendant
l'entraînement (bouton 📜).

**Musique** (synthétisée, sans fichier) : ambiance calme mais tendue pendant l'entraînement, cornes de guerre puis
musique de combat pendant la bataille, fanfare finale. Bouton 🔊 pour couper le son. Bruitages très discrets à chaque
clic, ouverture ou fermeture de fenêtre, bonne ou mauvaise réponse ; le cor de guerre retentit à chaque calcul mental
réussi (celui de l'adversaire sonne plus grave et plus lointain).

Une partie en duel : **compte à rebours d'entraînement** (chacun forme la plus grande armée possible, améliorations et
âges compris ; la progression est la même quelle que soit la durée, si bien qu'une partie courte donne une petite armée
et qu'il faut une longue partie pour bâtir un grand empire ; on voit l'âge et la population de l'adversaire, pas sa composition) → **bataille** (les armées se
déploient, se ruent l'une sur l'autre et combattent jusqu'à l'élimination d'un camp ; au bout de 2 min 30, la plus
grande valeur d'armée restante l'emporte). Pendant la bataille, le **cor de guerre** : un calcul mental juste (tables, relatifs,
carrés… selon la classe, sans limite de temps pour répondre) donne +25 % d'attaque pendant 5 s, 3 fois au plus ; un
bandeau et une aura dorée sur les troupes montrent qu'il est actif.

### La tuyauterie du duel

Pas de serveur à héberger : les deux navigateurs se parlent directement (WebRTC) et se trouvent grâce à
[Trystero](https://github.com/dmotz/trystero), qui passe par des relais publics Nostr. L'hôte calcule la bataille et en
envoie dix images par seconde à l'invité. Certains réseaux (établissements, pare-feu stricts) bloquent ces connexions :
en cas d'échec, essayer depuis un autre réseau (partage de connexion d'un téléphone par exemple).

**Sur deux ordinateurs, sans installation** : copier `dist-usb/MathMuscles.html` (produit par `npm run build:usb`)
sur une clé USB, puis sur chaque ordinateur, l'ouvrir d'un double-clic (Chrome, Edge ou Firefox). Les deux ordinateurs
doivent avoir accès à Internet (les relais servent à se trouver). Le premier joueur choisit « Défier un camarade » →
« Créer une partie » et lit le code à l'autre, qui le saisit puis clique sur « Rejoindre ».

Pour tester seul : ouvrir deux onglets sur `/?reseau=local` (les onglets se parlent sans Internet) ; ajouter
`&chrono=30` pour un entraînement de 30 secondes.

## Règles

Les règles sont **les mêmes en entraînement libre et en duel, quelle que soit la durée**.

**Maisons et crans.** Chaque bonne réponse vaut 1 point. Un cran = 10 points ; 5 crans par maison (numérotés de 1 à 5).
**Coût** d'une unité = nombre de bonnes réponses pour la former : la maison forme une unité chaque fois que ce nombre est
atteint (1 lancier par bonne réponse, 1 chevalier toutes les 2, 1 engin de siège toutes les 3), et à la fin du chrono
toutes les unités formées partent au combat. Pendant le cran 1, chaque maison forme des villageois (1 par bonne
réponse) ; une fois le cran 1 terminé, ils deviennent des soldats de la maison. Rangs : recrue après le cran 1, vétéran
après le cran 3, élite après le cran 5.

**Entraînement.** Séries de 5 exercices. Pendant tout un cran, les exercices sont **du même type** (entraînement par
répétition, avec des nombres différents) ; au cran suivant, le type change et la difficulté augmente (5 paliers). Le
type de chaque cran est tiré parmi les modèles les moins récemment vus, pour que deux parties ne se ressemblent pas.

**Améliorations** (3 par maison, effets réels en bataille). Chacune s'obtient en résolvant **un problème** de
généralisation, plus difficile que l'entraînement : n°1 avec l'Âge féodal et le cran 2 terminé, n°2 avec l'Âge des
châteaux et le cran 3 terminé, n°3 avec l'Âge impérial et le cran 4 terminé. Échec → nouvel essai après une courte attente.

**Hôtel de ville et âges.** Clic sur l'hôtel de ville : pour chaque maison, un problème à 1, 2 ou 3 points (le problème à
n points s'ouvre une fois le cran n de la maison terminé), chacun une fois par partie. Les points font passer de l'Âge
sombre à l'Âge féodal (3 points), des châteaux (8) puis impérial (14). Chaque âge donne +8 % de points de vie et
d'attaque à toute l'armée.

### Grille des unités (rang « recrue »)

| Unité | Coût | PV | Attaque | Armure (mêlée / flèches) | Portée | Vitesse | Fort contre | Faible contre |
|---|---|---|---|---|---|---|---|---|
| Infanterie | 1 | 50 | 7 | 1 / 0 | contact | 1,0 | lanciers, siège | archers, éclaireurs, chevaliers, moines |
| Lanciers | 1 | 38 | 4 (+12 contre cavalerie) | 0 / 0 | 1,3 | 1,0 | chevaliers, éclaireurs, siège | infanterie, archers, moines |
| Archers | 1 | 33 | 5 (+3 contre fantassins) | 0 / 0 | 9 | 0,95 | infanterie, lanciers, moines | éclaireurs, chevaliers, siège |
| Éclaireurs | 1 | 76 | 7 (+5 archers, +10 siège, +13 moines) | 1 / 2 | contact | **1,8** | infanterie, archers, siège, moines | lanciers, chevaliers |
| Chevaliers | 2 | 145 | 11 | 2 / 2 | contact | 1,4 | infanterie, archers, éclaireurs, siège | lanciers, moines |
| Engins de siège | 3 | 70 | 16, **zone** (3 cibles au plus) | 1 / 6 | **20** | 0,6 | archers, moines | infanterie, lanciers, éclaireurs, chevaliers |
| Moines | 2 | 48 | **conversion** 37 % / 3,5 s, soins | 0 / 0 | 6 | 0,8 | infanterie, lanciers, chevaliers | archers, éclaireurs, siège |

Coût = bonnes réponses pour former une unité. Rangs : vétéran ×1,3 PV, +2 attaque, +1 armure ; élite ×1,6 PV, +4, +2.
Valeurs validées par `npm run balance` : sur des armées mixtes aléatoires de 60 bonnes réponses, aucune unité ne fait
gagner plus de 58 % ni moins de 45 % des batailles. La taille des armées compte : l'infanterie, les lanciers et les
éclaireurs brillent dans les petites batailles, l'artillerie, les chevaliers et les moines dans les grandes.
L'artillerie avance jusqu'à 20 m de sa cible puis bombarde : elle tire dès le début de la mêlée.

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
