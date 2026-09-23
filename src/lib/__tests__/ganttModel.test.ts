import { describe, expect, it } from 'vitest';
import { openObsCount, sousBlocBars } from '../ganttModel';
import { dayNum } from '../dates';
import { emptyInfo, newProject } from '../factory';
import type { Observation } from '../../types';

describe('sousBlocBars', () => {
  it('sépare la partie réelle normale et le dépassement', () => {
    const bars = sousBlocBars({ id: 's', nom: 'Élec', debutPrevu: '2026-10-01', finPrevue: '2026-10-20', debutReel: '2026-10-01', finReelle: '2026-10-27' }, '2026-10-28');
    const kinds = bars.segments.map((s) => s.kind);
    expect(kinds).toEqual(['plan', 'real', 'over']);
    const over = bars.segments.find((s) => s.kind === 'over')!;
    expect(over.start).toBe(dayNum('2026-10-21'));
    expect(over.end).toBe(dayNum('2026-10-28'));
    expect(bars.ecart).toBe(7);
  });
});

describe('openObsCount', () => {
  it('ne compte que les observations à faire / en cours', () => {
    const p = newProject({ ...emptyInfo(1), nom: 'X' });
    const o = (id: string, statut: Observation['statut']): Observation => ({ id, numero: 1, titre: '', statut, date: '2026-09-23', sousBlocId: 's1', blocId: 'b1', contenu: [], historique: [], updatedAt: 0 });
    p.observations = [o('1', 'a_faire'), o('2', 'en_cours'), o('3', 'termine'), o('4', 'sans_suite')];
    expect(openObsCount(p, { sousBlocId: 's1' })).toBe(2);
    p.observations[0].statut = 'termine';
    expect(openObsCount(p, { blocId: 'b1' })).toBe(1);
  });
});
