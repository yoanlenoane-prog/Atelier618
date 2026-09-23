import type { ObsStatus, ProjectStatus } from '../types';

export const OBS_STATUS: [ObsStatus, string][] = [
  ['a_faire', 'À faire'],
  ['en_cours', 'En cours'],
  ['termine', 'Terminé'],
  ['sans_suite', 'Sans suite'],
];
export const OBS_STATUS_LABEL = Object.fromEntries(OBS_STATUS) as Record<ObsStatus, string>;

export const PROJECT_STATUS: [ProjectStatus, string][] = [
  ['etude', 'Études'],
  ['preparation', 'Préparation'],
  ['en_cours', 'Chantier en cours'],
  ['reception', 'Réception'],
  ['termine', 'Terminé'],
  ['suspendu', 'Suspendu'],
];
export const PROJECT_STATUS_LABEL = Object.fromEntries(PROJECT_STATUS) as Record<ProjectStatus, string>;
