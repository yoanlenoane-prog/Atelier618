# Atelier 618 — suivi de chantier

Application personnelle de suivi de chantier pour architecte : **Gantt prévisionnel / réel**, **plans avec pastilles**, **observations** (texte + photos), **comptes rendus** exportables en PDF. Toutes les données sont stockées dans le **Google Drive** de l’utilisateur. PWA installable sur téléphone et ordinateur, utilisable hors connexion.

👉 **Application en ligne : https://yoanlenoane-prog.github.io/Atelier618/**

👉 **Notice d’utilisation : [docs/NOTICE.md](docs/NOTICE.md)** (également disponible dans l’application, menu « Notice »).

## Fonctionnalités

| Domaine | Contenu |
|---|---|
| Projets | création, modification, suppression, numérotation, intervenants, statut |
| Structure | blocs / sous-blocs (réordonnables), dates de bloc déduites des sous-blocs |
| Gantt | export PDF paysage au format adapté à la durée (A4 → A0), barres prévu / réel, ligne « Aujourd’hui » automatique, dépassement en rouge, avance en vert, projection de fin, écarts en jours, blocs repliables, zoom jour/semaine/mois, observations ouvertes par ligne |
| Plans | import PDF (page au choix) / JPG / PNG, zoom (pincement, Ctrl + molette), plusieurs plans par projet |
| Pastilles | numérotation P-001…, placement en coordonnées relatives, déplacement, couleur selon le statut, filtres |
| Observations | titre, statut, bloc/sous-bloc, entreprise, paragraphes et photos ordonnés, action demandée, échéance, historique |
| Comptes rendus | numérotation, participants, météo, rubriques par bloc/sous-bloc, présentation par bloc **ou** par pastille (sans double saisie), plans avec pastilles, tableau des actions, export PDF |
| Transverse | tableau de bord, recherche (pastille, mot, entreprise, date…), documents |
| Drive | dossiers `ChantierApp/NN - Projet/{Projet,Plans,Photos/P-xxx,Documents,Comptes rendus}`, `projet.json` |
| Hors ligne | données et fichiers en local (IndexedDB), file d’envoi, fusion par élément entre appareils, service worker |

## Architecture

```
src/
  types.ts            modèle de données (un projet = un JSON)
  store.tsx           état, persistance locale, horodatage, synchro auto
  lib/planning.ts     calculs retards / avances / projections / avancement
  lib/merge.ts        fusion de deux versions d’un projet (multi-appareils)
  lib/sync.ts         synchronisation Google Drive
  lib/drive.ts        API REST Google Drive v3
  lib/google.ts       authentification Google Identity Services (portée drive.file)
  pages/              écrans (Gantt, Plans, Observations, CR…)
docs/NOTICE.md        notice utilisateur
```

Aucun serveur : l’application est un site statique. Le navigateur obtient un jeton Google et parle directement à l’API Drive. La portée `drive.file` limite l’accès aux seuls fichiers créés par l’application.

## Développement

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # tests unitaires (planning, fusion)
npm run build      # site statique dans dist/
```

L’identifiant client OAuth Google peut être fourni via `VITE_GOOGLE_CLIENT_ID` (voir `.env.example`) ou saisi dans l’application (Réglages). Voir la notice, section 1.

## Hébergement gratuit (GitHub Pages)

1. Dans le dépôt GitHub : **Settings → Pages → Source : GitHub Actions**.
2. (Optionnel) **Settings → Secrets and variables → Actions → Variables** : `GOOGLE_CLIENT_ID`.
3. Chaque push sur `main` déploie l’application (`.github/workflows/deploy.yml`).
4. Dans l’ID client Google : origine autorisée `https://<utilisateur>.github.io`, URI de redirection autorisé `https://<utilisateur>.github.io/<dépôt>/` (connexion par redirection utilisée dans l’application installée sur téléphone).
