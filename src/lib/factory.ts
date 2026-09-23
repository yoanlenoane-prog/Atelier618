import type { Bloc, Project, ProjectInfo } from '../types';
import { uid } from './ids';

export function emptyInfo(numero: number): ProjectInfo {
  return {
    nom: '',
    numero,
    adresse: '',
    client: '',
    architecte: '',
    maitreOuvrage: '',
    maitreOeuvre: '',
    description: '',
    statut: 'preparation',
    entreprises: [],
  };
}

export function newProject(info: ProjectInfo, blocs: Bloc[] = []): Project {
  const now = Date.now();
  return {
    id: uid('p'),
    schema: 1,
    info,
    blocs,
    plans: [],
    observations: [],
    comptesRendus: [],
    documents: [],
    compteurPastille: 0,
    createdAt: now,
    updatedAt: now,
    infoUpdatedAt: now,
    blocsUpdatedAt: now,
    supprimes: {},
  };
}

/** Structure type proposée à la création d'un projet. */
export const MODELE_STRUCTURE: { nom: string; sousBlocs: string[] }[] = [
  { nom: 'Gros œuvre', sousBlocs: ['Terrassement', 'Fondations', 'Murs', 'Dalle'] },
  { nom: 'Second œuvre', sousBlocs: ['Cloisons', 'Électricité', 'Plomberie', 'Chauffage'] },
  { nom: 'Finitions', sousBlocs: ['Peinture', 'Sols', 'Menuiseries'] },
];

export function blocsFromModele(): Bloc[] {
  return MODELE_STRUCTURE.map((b) => ({
    id: uid('b'),
    nom: b.nom,
    sousBlocs: b.sousBlocs.map((nom) => ({ id: uid('s'), nom })),
  }));
}
