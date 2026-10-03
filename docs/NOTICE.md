# Notice d’utilisation — Atelier 618

Atelier 618 est votre carnet de chantier numérique. Il réunit au même endroit le **planning (Gantt)**, les **plans avec pastilles**, les **observations** (texte + photos) et les **comptes rendus**. Toutes les données sont enregistrées dans **votre Google Drive**.

> Principe clé : une information n’est saisie qu’une seule fois. Une pastille P-021 apparaît à la fois sur le plan, dans la liste des observations, dans la tâche concernée, dans le Gantt et dans les comptes rendus. Si vous la modifiez, elle est mise à jour partout.

## 1. Première configuration (une seule fois)

L’application a besoin d’une « clé » Google pour pouvoir écrire dans votre Drive. C’est gratuit et ne prend que 5 minutes.

### Créer l’identifiant Google

1. Ouvrez **console.cloud.google.com** avec votre compte Google.
2. Créez un projet (par exemple « Atelier 618 »).
3. Menu **API et services → Bibliothèque** : recherchez **Google Drive API** et cliquez sur **Activer**.
4. Menu **API et services → Écran de consentement OAuth** : choisissez « Externe », donnez un nom, votre adresse e-mail, puis ajoutez votre propre adresse dans **Utilisateurs test**.
5. Menu **API et services → Identifiants → Créer des identifiants → ID client OAuth** : type **Application Web**.
6. Dans **Origines JavaScript autorisées**, ajoutez l’adresse du site : `https://yoanlenoane-prog.github.io` (elle est rappelée dans **Réglages**).
7. Dans **URI de redirection autorisés**, ajoutez l’adresse complète de l’application : `https://yoanlenoane-prog.github.io/Atelier618/` (également rappelée dans **Réglages**). Elle sert à la connexion depuis l’application installée sur le téléphone.
8. Copiez l’**ID client** (il se termine par `.apps.googleusercontent.com`).

### Ouvrir l’application

L’application est hébergée gratuitement sur GitHub Pages :

**https://yoanlenoane-prog.github.io/Atelier618/**

Elle se met à jour automatiquement à chaque modification du projet. Vos données ne sont pas sur ce site : elles restent sur vos appareils et dans votre Google Drive.

### Connecter l’application

1. Ouvrez l’application, allez dans **Réglages**.
2. Collez l’ID client, cliquez sur **Enregistrer**.
3. Cliquez sur **Se connecter avec Google** et acceptez l’accès.

Sur ordinateur, une petite fenêtre Google s’ouvre. Dans l’application installée sur le téléphone, la page Google s’affiche à la place de l’application puis vous ramène automatiquement dedans (« redirection »). Si la connexion ne s’ouvre pas, choisissez **Redirection** dans **Réglages → Mode de connexion**.

> Sans cette étape, l’application fonctionne quand même, mais les données restent uniquement sur l’appareil utilisé.

### Installer l’application

- **iPhone (Safari)** : bouton Partager → « Sur l’écran d’accueil ».
- **Android (Chrome)** : menu ⋮ → « Installer l’application ».
- **Ordinateur (Chrome / Edge)** : icône d’installation dans la barre d’adresse.

Faites la connexion Google sur chaque appareil (téléphone et ordinateur) : vous retrouverez les mêmes projets partout.

## 2. Créer un projet

1. Sur l’écran d’accueil, cliquez sur **+ Nouveau projet**.
2. Saisissez le nom, l’adresse, le client, les dates de début et de fin prévisionnelle.
3. Laissez cochée la case **structure type** pour partir de Gros œuvre / Second œuvre / Finitions (modifiable ensuite).

Un dossier `ChantierApp / 01 - Nom du projet` est créé automatiquement dans votre Drive, avec les sous-dossiers **Projet, Plans, Photos, Documents, Comptes rendus**.

> Pour découvrir l’application, cliquez sur **Charger un projet exemple** (visible tant que vous n’avez aucun projet).

Les informations (maître d’ouvrage, maître d’œuvre, entreprises, statut…) se modifient dans **Informations**. C’est aussi là que vous pouvez supprimer un projet (son dossier Drive part à la corbeille, récupérable 30 jours).


### Supprimer un projet

Sur la page **Mes projets**, la corbeille en bas à droite de la carte du projet (ou **Informations → Supprimer le projet**). Une confirmation est demandée ; le dossier Google Drive du projet est placé dans la corbeille de Drive (récupérable 30 jours).

## 3. Organiser le chantier : lots et tâches

Menu **Lots & tâches**.

- Un **lot** est une grande catégorie de travaux (ex. 01 — GROS ŒUVRE).
- Une **tâche** est une étape de ce lot (ex. 01.03 — Murs).
- Boutons **Nouveau lot**, **+ Tâche**, flèches pour réordonner, corbeille pour supprimer.
- Cliquez sur une tâche pour saisir ses dates et son entreprise.

Pour chaque tâche, renseignez :

- **Début prévu / Fin prévue** : la planification initiale ;
- **Début réel / Fin réelle** : ce qui s’est réellement passé (boutons rapides « Démarré aujourd’hui » et « Terminé aujourd’hui ») ;
- **Avancement estimé** (curseur en %) pour une tâche en cours.

Les dates d’un lot sont **calculées automatiquement** à partir de ses tâches : inutile de les saisir.

### Enchaîner des tâches (dépendances)

Dans la fiche d’une tâche (clic sur sa ligne dans le Gantt), rubrique **Enchaînement — démarre après la fin de…**, choisissez la ou les tâches qui doivent être terminées avant. Le **début prévu** est alors calculé automatiquement (le lendemain de la fin prévue de la tâche précédente, plus le délai « + j » éventuel) et la durée de la tâche est conservée. Si la tâche précédente est décalée, toutes les tâches qui en dépendent se décalent en chaîne. Dans le Gantt, une flèche relie les tâches enchaînées et le symbole ⛓ les signale.

Cette même structure sert partout : Gantt, observations, comptes rendus, recherche.

## 4. Lire le Gantt

Menu **Gantt**. Chaque ligne affiche deux barres :

- **barre grise hachurée (haut)** : ce qui était **prévu** ;
- **barre noire (bas)** : ce qui est **réellement** fait ;
- **partie rouge** : le **dépassement** au-delà de la fin prévue ;
- **barre verte** : tâche terminée **en avance** ;
- **barre en pointillés** : la **projection** — la date de fin estimée si le rythme actuel continue ;
- **ligne verticale rouge « AUJOURD’HUI »** : la date du jour, recalculée automatiquement chaque jour.

À droite des barres, une étiquette indique l’écart : **Retard +7 j** (rouge) ou **Avance −4 j** (vert). La mention « (est.) » signifie que l’écart est une estimation (tâche pas encore terminée).

À côté d’une tâche, une pastille rouge **● n** indique le nombre d’observations **non résolues** (à faire ou en cours) de cette tâche. Elle disparaît dès que toutes ses observations sont passées à « Terminé » ou « Sans suite ». Quand un lot est réduit, sa pastille totalise ses tâches. Le total du projet est affiché en haut du Gantt (cliquez dessus pour voir la liste).

Astuces :

- **Jours / Semaines / Mois** : change l’échelle.
- **Aujourd’hui** : recentre sur la date du jour.
- Cliquez sur le nom d’un lot pour le **réduire ou le développer** ; **Tout réduire** donne une vue globale.
- Cliquez sur une ligne pour modifier ses dates.

### Exporter le Gantt en PDF

1. Cliquez sur **Exporter en PDF** (en haut du Gantt).
2. Choisissez **Lots et tâches** ou **Lots seuls**.
3. Cliquez sur **Créer le PDF** : le fichier est téléchargé et, si la case est cochée, une copie est rangée dans **Documents** (à la racine), donc dans Google Drive.

Le PDF est **à l’horizontale (paysage)** et sa **taille s’adapte automatiquement à la durée du chantier** : A4 pour un chantier de quelques mois, puis A3, A2… pour les chantiers plus longs, afin que tout le planning tienne sur la largeur de la page. La fenêtre d’export indique le format retenu avant de créer le fichier. S’il y a beaucoup de lignes, le Gantt continue sur une deuxième page.

> Comment l’écart est calculé : si la fin réelle est saisie, écart = fin réelle − fin prévue. Si la tâche est en cours, l’application estime la date de fin à partir du début réel et de l’avancement. Si la tâche n’a pas démarré alors qu’elle aurait dû, elle est signalée « Démarrage en retard ».

## 5. Plans et pastilles

Menu **Plans**.

### Importer un plan

1. Cliquez sur **+ Plan** (ou **Importer un plan**).
2. Choisissez un fichier **PDF, JPG ou PNG** et nommez-le (RDC, R+1, Façade Nord…).
3. Pour un PDF de plusieurs pages, indiquez la page à utiliser.

Le fichier original est enregistré dans le dossier **Plans** de Drive. Utilisez la liste déroulante en haut pour passer d’un plan à l’autre : seules les pastilles du plan affiché sont visibles.

### Placer une pastille

1. Cliquez sur **+ Pastille** (le bouton devient « Touchez le plan… »).
2. Touchez l’endroit concerné sur le plan.
3. La pastille reçoit automatiquement le numéro suivant (P-001, P-002…) et sa fiche s’ouvre : titre, statut, lot/tâche, photos, texte. Sur le plan, **un clic sur une pastille ouvre directement sa fiche** pour la modifier (téléphone et ordinateur).

La position est enregistrée en **pourcentage** du plan : elle reste juste quel que soit l’écran.

### Déplacer, zoomer

- **Déplacer** : activez le mode puis faites glisser les pastilles.
- **Zoom** : boutons + / −, pincement à deux doigts sur téléphone, Ctrl + molette sur ordinateur.
- Cochez / décochez les statuts pour masquer par exemple les pastilles terminées.

### Couleur des pastilles

- **Rouge** : à faire
- **Ocre** : en cours
- **Noir** : terminé
- **Gris barré** : sans suite

La couleur change automatiquement quand vous modifiez le statut.

## 6. Observations

Menu **Observations** (ou clic sur une pastille → **Ouvrir la fiche**).

Une observation contient :

- un **titre**, un **statut** (À faire / En cours / Terminé / Sans suite), une **date** ;
- le **lot / la tâche** concerné(e) et l’**entreprise** ;
- un **contenu** libre : alternez **paragraphes** et **photos** dans l’ordre que vous voulez (flèches pour réordonner) ;
- une **action demandée** et une **échéance** ;
- un **historique** : chaque changement de statut y est noté automatiquement ; ajoutez vos propres étapes (« Entreprise informée », « Travaux commencés »…).

Tout est **enregistré automatiquement**, il n’y a pas de bouton « Enregistrer ».

La liste peut être affichée **par pastille** ou **par lot / tâche**, et filtrée par statut, lot, tâche ou mot-clé.

Les photos sont rangées dans Drive dans `Photos / P-012 /`. Elles sont automatiquement allégées (≈ 2000 px) pour économiser l’espace.

### Annoter une photo

Touchez le **crayon** sur la photo (ou **Annoter** sous la photo, ou dans la photo agrandie) — y compris depuis une pastille ouverte sur le plan : dessinez des **flèches**, **cercles**, **cadres**, traits **à main levée** ou ajoutez du **texte**, dans la couleur de votre choix. **Annuler** retire la dernière forme. Après **Enregistrer**, la photo annotée remplace l’image dans l’observation et le compte rendu ; la photo d’origine est conservée : **Modifier les annotations** permet de les reprendre à tout moment, et **Tout effacer** puis **Enregistrer** rétablit l’original. Les photos de **Documents** s’annotent de la même façon (bouton crayon).

## 7. Sur le chantier, avec le téléphone

Créer une observation en quelques secondes :

1. Ouvrez le projet, touchez le bouton rond **+** en bas à droite.
2. Touchez l’endroit du problème sur le plan.
3. Tapez un titre, touchez **Photo** pour prendre une ou plusieurs photos.
4. Choisissez la tâche, ajoutez un paragraphe si besoin.
5. Touchez **Valider**.

Le soir, sur l’ordinateur, la pastille, ses photos et son texte sont déjà là.

> Pas de réseau ? Pas de problème : tout est gardé sur le téléphone et envoyé vers Drive dès que la connexion revient.

## 8. Comptes rendus

Menu **Comptes rendus → Nouveau compte rendu**.

1. Le numéro et la date sont pré-remplis ; les personnes convoquées au compte rendu précédent sont cochées comme présentes.
2. Choisissez l’**objet** : avancement de chantier, réunion ou observation (avec les entreprises concernées).
3. **Personnes présentes** : cochez les personnes de l’annuaire du projet (agence, client, entreprises et la personne qui suit le chantier, autres prestataires — avec téléphone et e-mail). **Ajouter une personne** l’enregistre dans l’annuaire pour les prochains comptes rendus (l’annuaire se gère aussi dans **Informations**).
4. **Intempéries** : date, nature et jours d’arrêt ; la case **Inclure dans le compte rendu** décide si elles apparaissent.
5. **Interventions prévues dans les semaines à venir** : texte libre, indépendant du Gantt.
6. **Prochaine réunion / prochain rendez-vous** : date, heure et sujet. **Convoquer** : cochez les personnes à convoquer et laissez-leur un message ; **Préparer l’e-mail de convocation** ouvre votre messagerie avec les destinataires et le texte. La convocation figure aussi en fin de compte rendu.
7. Les **observations ouvertes** et celles modifiées depuis le dernier CR sont cochées automatiquement : ajustez la sélection. Chaque pastille cochée apparaît automatiquement sous la **rubrique de sa tâche**.
8. Écrivez sous chaque **rubrique** (lot et tâche). Les rubriques vides n’apparaissent pas.
9. Choisissez la présentation : **par lot / tâche** ou **par pastille** — même contenu, sans double saisie.
5. Cochez **Inclure les plans avec les pastilles** pour montrer la localisation des observations.
6. Cochez ou décochez **Inclure le paragraphe « Planning — points de vigilance »** selon que vous voulez faire apparaître les retards du planning dans le compte rendu.
7. Pour un compte rendu d’**avancement**, la case **Afficher le planning (Gantt) des tâches des entreprises concernées** ajoute un extrait du Gantt (prévu / réel) limité à ces entreprises (toutes si « Chantier » est coché).

L’**image du projet** (perspective, photo — à choisir dans **Informations**) s’affiche en haut à droite du compte rendu, à côté des informations du projet.
8. Onglet **Aperçu** pour relire.

### Exporter en PDF

1. Cliquez sur **Exporter en PDF**, puis **Imprimer / PDF**.
2. Choisissez l’imprimante **« Enregistrer au format PDF »**.
3. Pour ranger le PDF dans Drive, cliquez sur **Joindre le PDF à Drive** et sélectionnez le fichier : il est envoyé dans le dossier **Comptes rendus** du projet.

Le PDF contient : en-tête, participants, météo, avancement estimé, retards de planning (si la case est cochée), plans avec pastilles, observations avec photos, et un tableau des **actions à réaliser**.

Tous les comptes rendus restent accessibles dans la liste ; depuis une observation, vous voyez dans quels CR elle a été citée.

## 9. Tableau de bord, entreprises et documents

L’onglet **Vue d’ensemble** (menu de gauche, ou « Ensemble » en bas sur téléphone) regroupe tous les chantiers actifs (hors projets terminés ou suspendus) : observations ouvertes, **échéances dépassées**, **lots en retard** et tout ce qui est prévu **dans les 14 prochains jours** (débuts et fins de lots, échéances, prochaines visites). Chaque ligne ouvre directement l’élément concerné ; la case **Chantiers actifs** ramène à **Mes projets**.

Le **Tableau de bord** d’un projet résume le projet : avancement estimé, jours restants, tâches en retard, observations ouvertes, dernières visites, dernières photos et prochaines échéances.

Le menu **Entreprises** présente une fiche par entreprise (celles des Informations et celles citées dans les observations ou le planning) : observations ouvertes, échéances dépassées, planning de ses lots, observations levées. **Imprimer / PDF (relance)** produit une fiche à envoyer à l’entreprise.

Le menu **Documents** permet d’ajouter devis, contrats, CR signés, photos… Créez vos propres **dossiers** (et sous-dossiers) avec **Nouveau dossier**, puis ajoutez les fichiers directement dedans ; le bouton **Déplacer** range un fichier ailleurs. Les dossiers sont recréés à l’identique dans le dossier **Documents** du projet sur Drive, et les fichiers y sont déplacés lors de la synchronisation. Renommer un dossier le renomme aussi dans Drive ; le supprimer remonte son contenu d’un niveau (rien n’est effacé). Le dossier **Comptes rendus** reçoit les PDF joints depuis un compte rendu. Les photos s’affichent en vignettes, regroupées par date. L’icône nuage devient verte une fois le fichier envoyé.

## 10. Recherche

Icône loupe en haut de l’écran. Tapez :

- un numéro de pastille : `P-021` ou `21` ;
- un mot : `électricité`, `gaine` ;
- une entreprise, un lot, une tâche ;
- une date : `23/09/2026`.

Les résultats sont regroupés par type : pastilles, comptes rendus, tâches, plans, documents…

## 11. Synchronisation et hors connexion

Le bouton de synchronisation est présent **sur toutes les pages**, en haut à droite (sur téléphone : l’icône ↻ seule). Touchez-le pour synchroniser immédiatement. Il montre l’état :

- **vert — Synchronisé avec Drive** : tout est à jour ;
- **ocre clignotant** : synchronisation en cours ;
- **gris — Hors ligne / en attente** : vos modifications sont gardées sur l’appareil ;
- **rouge — Reconnecter** : la session Google a expiré, cliquez dessus.

La synchronisation est automatique (quelques secondes après chaque modification, au retour du réseau, et toutes les 5 minutes). Cliquez sur l’indicateur pour la lancer manuellement.

Si le même projet a été modifié sur deux appareils, les modifications sont **fusionnées** : pour chaque observation, plan ou compte rendu, la version la plus récente est conservée.

Hors connexion, vous pouvez consulter les projets et plans déjà ouverts sur l’appareil, créer des observations, prendre des photos et placer des pastilles.

## 12. Où sont mes fichiers ?

Dans votre Google Drive :

- `ChantierApp / 01 - Maison Dupont / Projet / projet.json` : les données de l’application (ne pas modifier à la main) ;
- `Plans` : les plans importés ;
- `Photos / P-001, P-002…` : les photos, rangées par pastille ;
- `Photos / Photos` : les photos ajoutées dans **Documents** (raccourcis vers les fichiers rangés dans vos dossiers de documents : même photo, sans espace occupé en double) ;
- `Documents / vos dossiers…` et `Comptes rendus` : vos fichiers, rangés comme dans l’application.

L’espace utilisé est celui de votre Drive : si celui-ci est plein, les nouveaux fichiers ne pourront plus être envoyés (un message l’indique).

## 13. Questions fréquentes

### « Identifiant client Google non configuré »

Suivez la section 1 et collez l’ID client dans **Réglages**.

### La connexion Google affiche « accès bloqué »

Vérifiez que votre adresse est bien dans les **Utilisateurs test** de l’écran de consentement, que `https://yoanlenoane-prog.github.io` figure dans les **Origines JavaScript autorisées** et `https://yoanlenoane-prog.github.io/Atelier618/` dans les **URI de redirection autorisés**.

### « redirect_uri_mismatch »

L’URI de redirection n’est pas déclaré exactement comme indiqué dans **Réglages** (attention à la barre `/` finale).

### Une photo affiche « Image indisponible hors connexion »

Elle a été prise sur un autre appareil et n’a pas encore été téléchargée sur celui-ci. Elle s’affichera dès que vous serez connecté.

### J’ai supprimé un projet par erreur

Son dossier est dans la **corbeille de Google Drive** pendant 30 jours : restaurez-le, puis cliquez sur l’indicateur de synchronisation.
