# Age of Equations

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
| `npm run build:usb` | fichier unique `dist-usb/AgeOfEquations.html`, à ouvrir d'un double-clic (clé USB) |
| `npm run preview` | sert le build localement |
| `npm run typecheck` | vérification TypeScript seule |
| `npm run check:exercises` | vérifie tous les modèles d'exercices (justesse, écriture, variété). `-- samples 5e-geo` affiche des exemples |
| `npm run balance` | tournoi automatique d'équilibrage des unités |

Pages utiles : `/?problemes` (relecture de tous les exercices et problèmes, avec figures), `/?galerie` (toutes les unités),
`/?bataille` (bataille de démonstration immédiate), `/?bataille=artillerie` (démonstration avec engins de siège).

## Niveaux et chapitres

Cinq niveaux : **Maternelle**, **Cinquième**, **Seconde**, et deux niveaux **adultes** sur tout le programme de Terminale
(spécialité, options maths expertes et complémentaires) : « remise en jambes » (paliers de difficulté 1 à 3, pour qui a
un peu oublié) et « aguerris » (paliers 2 à 5).

Le village a toujours **7 maisons**, une par type d'unité (infanterie, lanciers, archers, chevaliers, éclaireurs,
siège, moines). Dans les **Options** (bouton ⚙ de l'accueil), chacun choisit les **7 chapitres** sur lesquels il veut
s'entraîner parmi le programme complet de son niveau (8 en maternelle, 15 chapitres en 5e, 13 en 2nde, 18 pour les adultes) : on
sélectionne ou désélectionne un chapitre en cliquant sur sa ligne ; le choix est mémorisé par niveau. À chaque partie,
ces 7 chapitres sont **répartis au hasard** entre les maisons (en entraînement libre, la répartition change quand on
modifie ses chapitres ; la progression de chaque chapitre est conservée). L'ordinateur tire ses chapitres au hasard.
Un chapitre dont les exercices ne sont pas encore écrits n'est pas proposé ; un niveau sans assez de chapitres reste
verrouillé.

### Maternelle

Pour les enfants qui ne lisent pas encore : **tout passe par l'image et la voix**.
- 8 chapitres : *Compter*, *Les chiffres*, *Plus, moins, autant*, *Grand, petit, long, court*, *Les formes*,
  *Les suites* (colliers, motifs), *Les lettres* (lettres pareilles, lettre ou chiffre, première lettre d'un mot,
  capitale et minuscule, mots pareils), *Se repérer et observer* (sur, sous, dans, devant…, ombres, intrus, dessins
  pareils).
- **Chaque maison a ses propres exercices** : doigts levés et boîte de 10 jetons (Compter) ; comptine, avant/après,
  compte à rebours, plus grand nombre, deux dés (Les chiffres) ; tours de cubes, « combien faut-il en ajouter »,
  petites histoires (Plus, moins, autant) ; balance, verres plus ou moins remplis, crayons décalés (Grandeurs) ;
  encastrements (Formes)…
- **La difficulté monte à chaque cran** : nombres de 1 à 5, puis jusqu'à 8, 10, 12 et 15 ; 3 puis 4 réponses ;
  comparaisons qui obligent à compter (écart d'un seul objet, objets de tailles différentes, tours de même hauteur
  faites de cubes de tailles différentes, crayons qui ne partent pas du même endroit) ; formes tournées et formes
  ressemblantes ; lettres qui se ressemblent (E/F, O/Q, P/R…).
- La **consigne est lue à voix haute** (synthèse vocale du navigateur, voix française uniquement ; bouton
  haut-parleur pour la réécouter ; coupée par le bouton de sourdine). La phrase est aussi écrite en petit pour
  l'adulte. Sans voix française (fréquent sous Windows avec Firefox), le jeu se tait et conseille d'ouvrir le jeu
  avec Microsoft Edge (voix françaises intégrées) ou Chrome connecté à Internet (« Google français »).
- **Réponses en grandes images** à toucher ; verdict ✓ / ✗ en couleur, la bonne réponse s'allume, gros bouton ▶ pour
  continuer ; bilan en étoiles.
- **Gros pointeur** jaune cerclé de noir sur tout le jeu dès que le niveau Maternelle est choisi.
- Code : `src/exercises/maternelle/` (images et exercices), `src/components/PicView.tsx` (dessins),
  `src/audio/speech.ts` (voix).

## Modes de jeu

L'accueil sépare **La conquête** (le village et l'assaut final : entraînement libre, duel contre un camarade ou contre
l'ordinateur) et **L'entraînement** (sans village ni bataille : la quête du savoir et le siège des tables).

- **Entraînement libre** : on fait grandir son royaume à son rythme ; la progression est sauvegardée dans le navigateur.

- **La quête du savoir** : entraînement hors bataille sur un ou plusieurs chapitres du niveau, sur une carte de
  campagne en trois étapes : **la caserne** (10 exercices d'entraînement, deux par palier, de plus en plus difficiles),
  **l'hôtel de ville** (5 missions : petits problèmes avec une situation à comprendre) et **le monastère** (2 défis
  qui vont un peu au-delà du cours). Les exercices de chaque étape s'enchaînent dans un même parchemin ; si on le
  referme avant la fin, les réponses déjà données sont gardées et on reprend là où on s'était arrêté. Les pastilles de chaque étape montrent la progression ; chaque bonne réponse
  rapporte 1, 2 ou 3 points de gloire selon l'étape, et la quête se termine par un titre (Recrue, Écuyer, Chevalier,
  Maître d'armes). Le meilleur résultat est mémorisé pour chaque chapitre. Code : `src/quest/quest.ts`,
  `src/screens/QuestScreen.tsx`.

- **Le siège des tables** (tous niveaux) : entraînement aux tables de multiplication ou d'addition. On choisit une ou
  plusieurs tables (de 1 à 10), ou un **défi** (Tables faciles : 2 à 5 ; Tables difficiles : 6 à 9 ; Toutes les
  tables : 2 à 9 ; sans × 1 ni × 10, et jamais deux fois la même opération), et une garnison : **Écuyer** (environ 9 s par réponse), **Chevalier** (environ 4,3 s) ou
  **Conquérant** (environ 2,5 s). Chaque bonne réponse fait tirer une catapulte : il faut 20 boulets pour abattre le
  château, qui se fissure, perd ses créneaux, s'ouvre d'une brèche, prend feu puis s'effondre ; pendant ce temps, sa
  garnison décime l'armée du joueur : les soldats tombent un à un, et le château détruit une catapulte d'une pierre
  enflammée quand l'armée passe sous 2/3 puis 1/3 de sa vie (la dernière tombe avec elle). Une réponse fausse est
  signalée et la catapulte attend la bonne réponse ; l'opération ratée revient quelques questions plus tard.
  **Médailles** (bronze, argent, or selon la garnison) : une victoire sur **une seule table** donne la médaille de
  cette table, une victoire sur un **défi** celle du défi ; plusieurs tables choisies librement ne donnent pas de
  médaille. Le bilan liste les opérations à revoir. Musique propre, discrète (cordes pincées, tambour feutré).

Chaque partie tire un **décor** : plaine, mer et montagnes, désert, hiver ou automne (bouton 🗺 pour en changer en
entraînement libre). Le village est entouré de forêts, de mer ou de montagnes selon le décor, et le champ de la bataille
finale reprend le même thème. En duel, l'hôte tire le décor pour les deux joueurs. Démonstration :
`/?bataille&theme=desert` (plaine, cote, desert, hiver, automne).
- **Défier l'ordinateur** : on choisit la durée et la **note sur 20** de l'adversaire. Son rythme se règle dans
  `src/bot/bot.ts` (`botPace`) : environ 0,7 bonne réponse par minute à 5/20, 1,5 à 10/20, 2,3 à 15/20 et 3,3 à 20/20 ;
  il commence par les maisons qui forment vite des soldats, si bien que même à 5/20 il bat un joueur qui ne fait rien.
  Les bons élèves (12/20 et plus) se concentrent sur 3 maisons pour débloquer améliorations et problèmes.
- **Défier un camarade** : l'un crée une partie et donne le **code à 4 caractères**, l'autre le saisit. L'hôte choisit la
  durée (15, 30, 45 min, 1 heure ou une durée personnalisée de 1 à 180 min). Les deux classes peuvent être différentes (5e contre 2nde) : les unités sont les
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
carrés… selon la classe, sans limite de temps pour répondre) donne +25 % d'attaque pendant 5 s, 5 fois au plus ; un
bandeau et une aura dorée sur les troupes montrent qu'il est actif. La bataille se joue à vitesse normale ; contre l'ordinateur,
le bouton « ⏩ Accélérer » la fait défiler deux fois plus vite (pas en duel entre camarades, pour laisser à chacun le
temps du cor).

Après la bataille, **« Bilan et villages »** : pour chaque corps, unités engagées, survivants, ennemis mis hors de combat
et corps adverse qui lui a fait le plus de pertes ; quelques conseils tirés de ces chiffres (composition adverse et ce
qui la contre, corps le plus meurtrier, écart de bonnes réponses, d'âge, d'améliorations) ; et la visite des deux
villages tels qu'ils étaient à la fin de l'entraînement.

### La tuyauterie du duel

Pas de serveur à héberger : les deux navigateurs se parlent directement (WebRTC) et se trouvent grâce à
[Trystero](https://github.com/dmotz/trystero), qui passe par des relais publics Nostr. L'hôte calcule la bataille et en
envoie dix images par seconde à l'invité. Certains réseaux (établissements, pare-feu stricts) bloquent ces connexions :
en cas d'échec, essayer depuis un autre réseau (partage de connexion d'un téléphone par exemple).

**Sur deux ordinateurs, sans installation** : copier `dist-usb/AgeOfEquations.html` (produit par `npm run build:usb`)
sur une clé USB, puis sur chaque ordinateur, l'ouvrir d'un double-clic (Chrome, Edge ou Firefox). Les deux ordinateurs
doivent avoir accès à Internet (les relais servent à se trouver). Le premier joueur choisit « Défier un camarade » →
« Créer une partie » et lit le code à l'autre, qui le saisit puis clique sur « Rejoindre ».

**Partie de test (développeur)** : durée « Autre » de 5 minutes ou moins : le « Mode démo » est alors disponible
pendant l'entraînement (+1 cran, améliorations, points d'âge) pour former vite une armée et voir une bataille.

Pour tester seul : ouvrir deux onglets sur `/?reseau=local` (les onglets se parlent sans Internet) ; ajouter
`&chrono=30` pour un entraînement de 30 secondes.

## Règles

Les règles sont **les mêmes en entraînement libre et en duel, quelle que soit la durée**.

**Maisons et crans.** Chaque bonne réponse vaut 1 point. Un cran = 10 points ; 5 crans par maison (numérotés de 1 à 5).
**Coût** d'une unité = nombre de bonnes réponses pour la former : la maison forme une unité chaque fois que ce nombre est
atteint (1 lancier par bonne réponse, 1 chevalier toutes les 2, 1 engin de siège toutes les 3), et à la fin du chrono
toutes les unités formées partent au combat. Chaque maison commence avec un villageois, qui garde le camp jusqu'au
premier soldat. Rangs des soldats : recrue, vétéran après le cran 3, élite après le cran 5.

**Entraînement.** Séries de 5 exercices. Les 5 exercices d'une série sont **du même type** (entraînement par
répétition, avec des nombres différents) ; à la série suivante, le type change, et à chaque nouveau cran la difficulté
augmente (5 paliers). Le type de chaque série est tiré parmi les modèles les moins récemment vus du palier, pour varier
d'une série et d'une partie à l'autre.

**Améliorations** (3 par maison, effets réels en bataille). Chacune s'obtient en résolvant **un problème** de
généralisation, plus difficile que l'entraînement : n°1 avec l'Âge féodal et le cran 1 terminé, n°2 avec l'Âge des
châteaux et le cran 2 terminé, n°3 avec l'Âge impérial et le cran 3 terminé. Échec → nouvel essai après une courte attente.

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

46 chapitres (15 en 5e, 13 en 2nde, 18 de Terminale pour les adultes) et 2 101 modèles d'exercices générés
aléatoirement (1 074 d'entraînement, 510 problèmes d'amélioration, 517 problèmes de l'hôtel de ville), dont 681 avec
figure : triangles, parallèles, solides en perspective, repères et courbes, arbres, tableaux, graphes, cercle
trigonométrique… Les exercices d'algorithmique affichent des programmes Python. Chaque modèle d'entraînement varie ses énoncés (3 à 6 contextes ou configurations de la même mécanique) et
ne donne pas la réponse dans l'énoncé : `npm run check:exercises` le vérifie (section « Monotonie »). Réponses ouvertes autant que possible : nombres, fractions,
expressions en x (contrôle « développé » / « factorisé »), a√b, couples, intervalles, ensembles de solutions.

## Organisation du code

```
src/
  data/curriculum.ts      niveaux, maisons (types d'unités), catalogue des chapitres, améliorations, crans, âges
  exercises/              chapitres d'origine : entraînement (cinquieme.ts, seconde.ts), améliorations
                          (upgrades*.ts), hôtel de ville (age*.ts) ; nouveaux chapitres : un fichier par chapitre dans
                          subjects/ (guide de rédaction : subjects/README.md) ; moteur de correction (utils.ts),
                          figures (figure.ts : triangles, parallèles, Thalès, repères et courbes), contextes
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
