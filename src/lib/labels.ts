import type { CompteRendu, ObsStatus, Project, ProjectStatus, ReportType } from '../types';

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

export const REPORT_TYPE: [ReportType, string][] = [
  ['avancement', 'Avancement de chantier'],
  ['reunion', 'Réunion'],
  ['observation', 'Observation'],
];
export const REPORT_TYPE_LABEL = Object.fromEntries(REPORT_TYPE) as Record<ReportType, string>;

/** Valeur de « concernes » désignant l'ensemble du chantier. */
export const CR_CHANTIER = 'Chantier';

/** Personnes proposées comme participants d'une réunion. */
export function reunionCandidats(p: Project): { nom: string; detail?: string }[] {
  const i = p.info;
  const out: { nom: string; detail?: string }[] = [];
  if (i.architecte) out.push({ nom: i.architecte, detail: 'Architecte' });
  if (i.maitreOuvrage) out.push({ nom: i.maitreOuvrage, detail: 'Maître d’ouvrage' });
  if (i.maitreOeuvre) out.push({ nom: i.maitreOeuvre, detail: 'Maître d’œuvre' });
  if (i.client) out.push({ nom: i.client, detail: 'Client' });
  for (const e of i.entreprises) if (e.nom) out.push({ nom: e.nom, detail: e.lot });
  return out.filter((c, k) => out.findIndex((x) => x.nom === c.nom) === k);
}

/** Participants affichés : cochés (réunion) + saisis librement. */
export function crParticipants(cr: CompteRendu): string[] {
  const libres = cr.participants.split('\n').map((s) => s.trim()).filter(Boolean);
  return cr.type === 'reunion' ? Array.from(new Set([...(cr.concernes || []), ...libres])) : libres;
}

/** Entreprises concernées (avancement / observation), en toutes lettres. */
export function crConcernesLabel(cr: CompteRendu): string {
  if (cr.type === 'reunion') return '';
  return (cr.concernes || []).map((c) => (c === CR_CHANTIER ? 'Ensemble du chantier' : c)).join(', ');
}
