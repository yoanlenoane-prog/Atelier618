import { describe, expect, it } from 'vitest';
import { analyseBloc, analyseSousBloc, avancementPondere } from '../planning';
import type { Bloc } from '../../types';

const auj = '2026-10-25';

describe('analyseSousBloc', () => {
  it('retard définitif quand la fin réelle dépasse la fin prévue', () => {
    const a = analyseSousBloc({ id: 's', nom: 'Élec', debutPrevu: '2026-10-01', finPrevue: '2026-10-20', debutReel: '2026-10-01', finReelle: '2026-10-27' }, auj);
    expect(a.state).toBe('termine');
    expect(a.ecartFin).toBe(7);
    expect(a.ecartDefinitif).toBe(true);
    expect(a.enRetard).toBe(true);
  });

  it('avance quand la tâche finit plus tôt', () => {
    const a = analyseSousBloc({ id: 's', nom: 'Élec', debutPrevu: '2026-10-01', finPrevue: '2026-10-20', debutReel: '2026-10-01', finReelle: '2026-10-16' }, auj);
    expect(a.ecartFin).toBe(-4);
    expect(a.enAvance).toBe(true);
  });

  it('dépassement en cours : la barre réelle va jusqu’à aujourd’hui', () => {
    const a = analyseSousBloc({ id: 's', nom: 'Élec', debutPrevu: '2026-10-01', finPrevue: '2026-10-20', debutReel: '2026-10-04' }, auj);
    expect(a.state).toBe('en_depassement');
    expect(a.finBarreReelle).toBe(auj);
    expect(a.enRetard).toBe(true);
    expect(a.ecartFin).toBeGreaterThanOrEqual(5);
  });

  it('démarrage en retard si non commencé après la date prévue', () => {
    const a = analyseSousBloc({ id: 's', nom: 'Peinture', debutPrevu: '2026-10-20', finPrevue: '2026-10-30' }, auj);
    expect(a.state).toBe('retard_demarrage');
    expect(a.ecartDebut).toBe(5);
    expect(a.finEstimee).toBe('2026-11-04');
  });

  it('à venir', () => {
    expect(analyseSousBloc({ id: 's', nom: 'Sols', debutPrevu: '2026-11-01', finPrevue: '2026-11-10' }, auj).state).toBe('a_venir');
  });
});

describe('analyseBloc', () => {
  it('déduit les dates du bloc de ses sous-blocs', () => {
    const bloc: Bloc = {
      id: 'b', nom: 'Gros œuvre', sousBlocs: [
        { id: '1', nom: 'Terrassement', debutPrevu: '2026-09-01', finPrevue: '2026-09-10' },
        { id: '2', nom: 'Fondations', debutPrevu: '2026-09-05', finPrevue: '2026-09-20' },
        { id: '3', nom: 'Murs', debutPrevu: '2026-09-15', finPrevue: '2026-10-10' },
        { id: '4', nom: 'Dalle', debutPrevu: '2026-10-01', finPrevue: '2026-10-15' },
      ],
    };
    const a = analyseBloc(bloc, '2026-08-01');
    expect(a.debutPrevu).toBe('2026-09-01');
    expect(a.finPrevue).toBe('2026-10-15');
  });

  it('avancement pondéré par la durée', () => {
    expect(avancementPondere([
      { id: '1', nom: 'a', debutPrevu: '2026-01-01', finPrevue: '2026-01-10', debutReel: '2026-01-01', finReelle: '2026-01-10' },
      { id: '2', nom: 'b', debutPrevu: '2026-01-11', finPrevue: '2026-01-20' },
    ], '2026-01-05')).toBe(50);
  });
});
