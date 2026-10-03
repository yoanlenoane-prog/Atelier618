import { describe, expect, it } from 'vitest';
import { appliquerDependances, predecesseurs } from '../planning';
import type { Bloc } from '../../types';

const blocs = (): Bloc[] => [
  {
    id: 'b1',
    nom: 'Gros œuvre',
    sousBlocs: [
      { id: 'a', nom: 'Fondations', debutPrevu: '2026-10-01', finPrevue: '2026-10-10' },
      { id: 'b', nom: 'Murs', debutPrevu: '2026-10-05', finPrevue: '2026-10-09', dependances: [{ id: 'a' }] },
    ],
  },
  {
    id: 'b2',
    nom: 'Second œuvre',
    sousBlocs: [{ id: 'c', nom: 'Cloisons', debutPrevu: '2026-10-01', finPrevue: '2026-10-03', dependances: [{ id: 'b', decalage: 2 }] }],
  },
];

describe('appliquerDependances', () => {
  it('démarre la tâche le lendemain de la fin de la précédente, en gardant sa durée, et propage en chaîne', () => {
    const l = blocs();
    expect(appliquerDependances(l)).toBe(2);
    const [, b] = l[0].sousBlocs;
    const [c] = l[1].sousBlocs;
    expect(b.debutPrevu).toBe('2026-10-11');
    expect(b.finPrevue).toBe('2026-10-15'); // 5 jours conservés
    expect(c.debutPrevu).toBe('2026-10-18'); // fin de « Murs » + 1 + 2 jours de délai
    expect(c.finPrevue).toBe('2026-10-20');
  });

  it('suit la tâche précédente quand elle est décalée', () => {
    const l = blocs();
    appliquerDependances(l);
    l[0].sousBlocs[0].finPrevue = '2026-10-20';
    appliquerDependances(l);
    expect(l[0].sousBlocs[1].debutPrevu).toBe('2026-10-21');
    expect(l[1].sousBlocs[0].debutPrevu).toBe('2026-10-28');
  });

  it('prend la plus tardive des tâches précédentes et ne boucle pas sur un cycle', () => {
    const l = blocs();
    l[1].sousBlocs[0].dependances = [{ id: 'a' }, { id: 'b' }];
    appliquerDependances(l);
    expect(l[1].sousBlocs[0].debutPrevu).toBe('2026-10-16');
    l[0].sousBlocs[0].dependances = [{ id: 'c' }]; // cycle a → b → c → a
    expect(() => appliquerDependances(l)).not.toThrow();
    expect(predecesseurs(l, 'c').has('c')).toBe(true);
  });
});
