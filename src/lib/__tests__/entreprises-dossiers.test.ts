import { describe, expect, it } from 'vitest';
import { emptyInfo, newProject } from '../factory';
import { entreprisesDuProjet } from '../entreprises';
import { DOSSIER_CR, cheminDossier, compteDossier, dossierDe } from '../dossiers';
import { mergeProjects } from '../merge';
import type { DocumentFile, Observation, Project } from '../../types';

const obs = (id: string, numero: number, entreprise: string, extra: Partial<Observation> = {}): Observation => ({
  id, numero, titre: id, statut: 'a_faire', date: '2026-09-01', entreprise, contenu: [], historique: [], updatedAt: 1, ...extra,
});
const doc = (id: string, extra: Partial<DocumentFile> = {}): DocumentFile => ({
  id, nom: id, file: { name: id, mime: 'application/pdf' }, date: '2026-09-01', updatedAt: 1, ...extra,
});

describe('entreprisesDuProjet', () => {
  it('regroupe les observations et les lots par entreprise, sans tenir compte de la casse', () => {
    const p = newProject({ ...emptyInfo(1), nom: 'X', entreprises: [{ id: 'e1', nom: 'Bâti Ouest', lot: 'Gros œuvre' }] });
    p.blocs = [{ id: 'b', nom: 'GO', sousBlocs: [{ id: 's', nom: 'Murs', entreprise: 'bâti ouest ', debutPrevu: '2026-08-01', finPrevue: '2026-08-10' }] }];
    p.observations = [
      obs('o1', 1, 'BÂTI OUEST', { echeance: '2026-09-10' }),
      obs('o2', 2, 'Bâti Ouest', { statut: 'termine' }),
      obs('o3', 3, 'Élec Services'),
    ];
    const f = entreprisesDuProjet(p, '2026-09-20');
    expect(f.map((x) => x.nom)).toEqual(['Bâti Ouest', 'Élec Services']);
    const bati = f[0];
    expect(bati.lot).toBe('Gros œuvre');
    expect(bati.ouvertes.map((o) => o.id)).toEqual(['o1']);
    expect(bati.echues.map((o) => o.id)).toEqual(['o1']);
    expect(bati.terminees.map((o) => o.id)).toEqual(['o2']);
    expect(bati.lots).toHaveLength(1);
    expect(bati.lotsEnRetard).toHaveLength(1);
  });
});

describe('dossiers', () => {
  const p: Project = {
    ...newProject({ ...emptyInfo(1), nom: 'X' }),
    dossiers: [
      { id: 'a', nom: 'Devis', updatedAt: 1 },
      { id: 'b', nom: 'Signés', parentId: 'a', updatedAt: 1 },
    ],
    documents: [doc('d1', { dossierId: 'a' }), doc('d2', { dossierId: 'b' }), doc('d3', { categorie: 'Compte rendu' }), doc('d4')],
  };
  it('range les anciens documents « Compte rendu » dans Comptes rendus', () => {
    expect(dossierDe(p.documents[2])).toBe(DOSSIER_CR);
    expect(dossierDe(p.documents[3])).toBeUndefined();
  });
  it('calcule le chemin et le nombre de documents (sous-dossiers compris)', () => {
    expect(cheminDossier(p, 'b').map((d) => d.nom)).toEqual(['Devis', 'Signés']);
    expect(compteDossier(p, 'a')).toBe(2);
  });
  it('fusionne un projet sans dossiers (ancienne version) avec un projet qui en a', () => {
    const ancien = { ...p, dossiers: undefined };
    expect(mergeProjects(ancien, p).dossiers?.map((d) => d.id)).toEqual(['a', 'b']);
  });
});
