# Notice d’utilisation — Atelier 618

Atelier 618 est votre carnet de chantier numérique. Il réunit au même endroit le **planning (Gantt)**, les **plans avec pastilles**, les **observations** (texte + photos) et les **comptes rendus**. Toutes les données sont enregistrées dans **votre Google Drive**.

> Principe clé : une information n’est saisie qu’une seule fois. Une pastille P-021 apparaît à la fois sur le plan, dans la liste des observations, dans le sous-bloc concerné, dans le Gantt et dans les comptes rendus. Si vous la modifiez, elle est mise à jour partout.

## 1. Première configuration (une seule fois)

L’application a besoin d’une « clé » Google pour pouvoir écrire dans votre Drive. C’est gratuit et ne prend que 5 minutes.

### Créer l’identifiant Google

1. Ouvrez **console.cloud.google.com** avec votre compte Google.
2. Créez un projet (par exemple « Atelier 618 »).
3. Menu **API et services → Bibliothèque** : recherchez **Google Drive API** et cliquez sur **Activer**.
4. Menu **API et services → Écran de consentement OAuth** : choisissez « Externe », donnez un nom, votre adresse e-mail, puis ajoutez votre propre adresse dans **Utilisateurs test**.
5. Menu **API et services → Identifiants → Créer des identifiants → ID client OAuth** : type **Application Web**.
6. Dans **Origines JavaScript autorisées**, ajoutez l’adresse de l’application (elle est affichée dans **Réglages**, par exemple `https://votre-nom.github.io`).
7. Copiez l’**ID client** (il se termine par `.apps.googleusercontent.com`).

### Connecter l’application

1. Ouvrez l’application, allez dans **Réglages**.
2. Collez l’ID client, cliquez sur **Enregistrer**.
3. Cliquez sur **Se connecter avec Google** et acceptez l’accès.

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

## 3. Organiser le chantier : blocs et sous-blocs

Menu **Blocs & sous-blocs**.

- Un **bloc** est une grande catégorie de travaux (ex. 01 — GROS ŒUVRE).
- Un **sous-bloc** est un lot ou une tâche (ex. 01.03 — Murs).
- Boutons **Nouveau bloc**, **+ Sous-bloc**, flèches pour réordonner, corbeille pour supprimer.
- Cliquez sur un sous-bloc pour saisir ses dates et son entreprise.

Pour chaque sous-bloc, renseignez :

- **Début prévu / Fin prévue** : la planification initiale ;
- **Début réel / Fin réelle** : ce qui s’est réellement passé (boutons rapides « Démarré aujourd’hui » et « Terminé aujourd’hui ») ;
- **Avancement** (curseur en %) pour une tâche en cours.

Les dates d’un bloc sont **calculées automatiquement** à partir de ses sous-blocs : inutile de les saisir.

Cette même structure sert partout : Gantt, observations, comptes rendus, recherche.

## 4. Lire le Gantt

Menu **Gantt**. Chaque ligne affiche deux barres :

- **barre beige hachurée (haut)** : ce qui était **prévu** ;
- **barre noire (bas)** : ce qui est **réellement** fait ;
- **partie rouge** : le **dépassement** au-delà de la fin prévue ;
- **barre verte** : tâche terminée **en avance** ;
- **barre en pointillés** : la **projection** — la date de fin estimée si le rythme actuel continue ;
- **ligne verticale rouge « AUJOURD’HUI »** : la date du jour, recalculée automatiquement chaque jour.

À droite des barres, une étiquette indique l’écart : **Retard +7 j** (rouge) ou **Avance −4 j** (vert). La mention « (est.) » signifie que l’écart est une estimation (tâche pas encore terminée).

Une pastille rouge **● 2** à côté d’un sous-bloc signale **2 observations non résolues**.

Astuces :

- **Jours / Semaines / Mois** : change l’échelle.
- **Aujourd’hui** : recentre sur la date du jour.
- Cliquez sur le nom d’un bloc pour le **réduire ou le développer** ; **Tout réduire** donne une vue globale.
- Cliquez sur une ligne pour modifier ses dates.

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
3. La pastille reçoit automatiquement le numéro suivant (P-001, P-002…) et sa fiche s’ouvre : titre, statut, bloc/sous-bloc, photos, texte.

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
- le **bloc / sous-bloc** concerné et l’**entreprise** ;
- un **contenu** libre : alternez **paragraphes** et **photos** dans l’ordre que vous voulez (flèches pour réordonner) ;
- une **action demandée** et une **échéance** ;
- un **historique** : chaque changement de statut y est noté automatiquement ; ajoutez vos propres étapes (« Entreprise informée », « Travaux commencés »…).

Tout est **enregistré automatiquement**, il n’y a pas de bouton « Enregistrer ».

La liste peut être affichée **par pastille** ou **par bloc / sous-bloc**, et filtrée par statut, bloc, sous-bloc ou mot-clé.

Les photos sont rangées dans Drive dans `Photos / P-012 /`. Elles sont automatiquement allégées (≈ 2000 px) pour économiser l’espace.

## 7. Sur le chantier, avec le téléphone

Créer une observation en quelques secondes :

1. Ouvrez le projet, touchez le bouton rond **+** en bas à droite.
2. Touchez l’endroit du problème sur le plan.
3. Tapez un titre, touchez **Photo** pour prendre une ou plusieurs photos.
4. Choisissez le sous-bloc, ajoutez un paragraphe si besoin.
5. Touchez **Valider**.

Le soir, sur l’ordinateur, la pastille, ses photos et son texte sont déjà là.

> Pas de réseau ? Pas de problème : tout est gardé sur le téléphone et envoyé vers Drive dès que la connexion revient.

## 8. Comptes rendus

Menu **Comptes rendus → Nouveau compte rendu**.

1. Le numéro, la date et les participants (repris du CR précédent) sont pré-remplis.
2. Les **observations ouvertes** et celles modifiées depuis le dernier CR sont cochées automatiquement : ajustez la sélection.
3. Écrivez sous chaque **rubrique** (bloc et sous-bloc). Les rubriques vides n’apparaissent pas.
4. Choisissez la présentation : **par bloc / sous-bloc** ou **par pastille** — même contenu, sans double saisie.
5. Cochez **Inclure les plans avec les pastilles** pour montrer la localisation des observations.
6. Onglet **Aperçu** pour relire.

### Exporter en PDF

1. Cliquez sur **Exporter en PDF**, puis **Imprimer / PDF**.
2. Choisissez l’imprimante **« Enregistrer au format PDF »**.
3. Pour ranger le PDF dans Drive, cliquez sur **Joindre le PDF à Drive** et sélectionnez le fichier : il est envoyé dans le dossier **Comptes rendus** du projet.

Le PDF contient : en-tête, participants, météo, avancement, retards de planning, plans avec pastilles, observations avec photos, et un tableau des **actions à réaliser**.

Tous les comptes rendus restent accessibles dans la liste ; depuis une observation, vous voyez dans quels CR elle a été citée.

## 9. Tableau de bord et documents

Le **Tableau de bord** résume le projet : avancement, jours restants, sous-blocs en retard, observations ouvertes, dernières visites, dernières photos et prochaines échéances.

Le menu **Documents** permet d’ajouter devis, contrats, CR signés… Ils sont envoyés dans le dossier **Documents** (ou **Comptes rendus**) du projet sur Drive. L’icône nuage devient verte une fois le fichier envoyé.

## 10. Recherche

Icône loupe en haut de l’écran. Tapez :

- un numéro de pastille : `P-021` ou `21` ;
- un mot : `électricité`, `gaine` ;
- une entreprise, un bloc, un sous-bloc ;
- une date : `23/09/2026`.

Les résultats sont regroupés par type : pastilles, comptes rendus, sous-blocs, plans, documents…

## 11. Synchronisation et hors connexion

L’indicateur en bas du menu (ou sur l’accueil) montre l’état :

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
- `Documents` et `Comptes rendus` : vos fichiers.

L’espace utilisé est celui de votre Drive : si celui-ci est plein, les nouveaux fichiers ne pourront plus être envoyés (un message l’indique).

## 13. Questions fréquentes

### « Identifiant client Google non configuré »

Suivez la section 1 et collez l’ID client dans **Réglages**.

### La connexion Google affiche « accès bloqué »

Vérifiez que votre adresse est bien dans les **Utilisateurs test** de l’écran de consentement, et que l’adresse de l’application figure dans les **Origines JavaScript autorisées**.

### Une photo affiche « Image indisponible hors connexion »

Elle a été prise sur un autre appareil et n’a pas encore été téléchargée sur celui-ci. Elle s’affichera dès que vous serez connecté.

### J’ai supprimé un projet par erreur

Son dossier est dans la **corbeille de Google Drive** pendant 30 jours : restaurez-le, puis cliquez sur l’indicateur de synchronisation.
