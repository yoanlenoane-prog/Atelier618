import { describe, expect, it } from 'vitest';
import { emptyInfo, newProject } from '../factory';
import { nomsPastilles } from '../planning';
import type { Observation } from '../../types';

const obs = (id: string, numero: number, blocId?: string, sousBlocId?: string): Observation => ({
  id, numero, titre: id, statut: 'a_faire', date: '2026-10-01', blocId, sousBlocId, contenu: [], historique: [], updatedAt: 1,
});

describe('nom des pastilles (lot + tâche)', () => {
  it('lot 1 tâche 2 → 0102, puis 0102-2… ; lot seul → 01 ; non classée → P-012', () => {
    const p = newProject({ ...emptyInfo(1), nom: 'X' });
    p.blocs = [
      { id: 'b1', nom: 'GO', sousBlocs: [{ id: 's11', nom: 'Fondations' }, { id: 's12', nom: 'Murs' }] },
      { id: 'b2', nom: 'SO', sousBlocs: [{ id: 's21', nom: 'Cloisons' }] },
    ];
    p.observations = [
      obs('c', 5, 'b1', 's12'),
      obs('a', 2, 'b1', 's12'),
      obs('d', 7, 'b2', 's21'),
      obs('e', 8, 'b1'),
      obs('f', 12),
      obs('g', 9, undefined, 's21'), // tâche connue sans lot : on retrouve le lot
    ];
    const n = nomsPastilles(p);
    expect(n.get('a')).toBe('0102'); // la plus ancienne garde le nom simple
    expect(n.get('c')).toBe('0102-2');
    expect(n.get('d')).toBe('0201');
    expect(n.get('g')).toBe('0201-2');
    expect(n.get('e')).toBe('01');
    expect(n.get('f')).toBe('P-012');
  });
});
