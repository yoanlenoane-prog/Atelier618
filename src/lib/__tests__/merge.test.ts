import { describe, expect, it } from 'vitest';
import { mergeProjects } from '../merge';
import { emptyInfo, newProject } from '../factory';
import type { Observation } from '../../types';

const obs = (id: string, numero: number, updatedAt: number, titre = ''): Observation => ({
  id, numero, titre, statut: 'a_faire', date: '2026-09-23', contenu: [], historique: [], updatedAt,
});

describe('mergeProjects', () => {
  it('garde la version la plus récente de chaque observation', () => {
    const base = newProject({ ...emptyInfo(1), nom: 'X' });
    const a = { ...base, observations: [obs('o1', 1, 10, 'ancien')], compteurPastille: 1 };
    const b = { ...base, observations: [obs('o1', 1, 20, 'nouveau')], compteurPastille: 1 };
    expect(mergeProjects(a, b).observations[0].titre).toBe('nouveau');
  });

  it('réunit les observations créées sur deux appareils et renumérote les doublons', () => {
    const base = newProject({ ...emptyInfo(1), nom: 'X' });
    const a = { ...base, observations: [obs('a', 5, 10)], compteurPastille: 5 };
    const b = { ...base, observations: [obs('b', 5, 11)], compteurPastille: 5 };
    const m = mergeProjects(a, b);
    expect(m.observations).toHaveLength(2);
    expect(new Set(m.observations.map((o) => o.numero)).size).toBe(2);
    expect(m.compteurPastille).toBe(6);
  });

  it('propage les suppressions', () => {
    const base = newProject({ ...emptyInfo(1), nom: 'X' });
    const a = { ...base, observations: [obs('o1', 1, 10)] };
    const b = { ...base, observations: [], supprimes: { o1: 15 } };
    expect(mergeProjects(a, b).observations).toHaveLength(0);
  });
});
