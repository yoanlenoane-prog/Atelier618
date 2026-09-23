import type { Bloc, ISODate, Observation, Project, SousBloc } from '../types';
import { addDays, dayNum, diffDays, fromDayNum } from './dates';

export type TaskState =
  | 'non_planifie'
  | 'a_venir'
  | 'retard_demarrage'
  | 'en_cours'
  | 'en_depassement'
  | 'termine';

export const TASK_STATE_LABEL: Record<TaskState, string> = {
  non_planifie: 'Non planifié',
  a_venir: 'À venir',
  retard_demarrage: 'Démarrage en retard',
  en_cours: 'En cours',
  en_depassement: 'En dépassement',
  termine: 'Terminé',
};

export interface TaskAnalysis {
  state: TaskState;
  /** Écart sur le début, en jours (>0 : démarré en retard). */
  ecartDebut?: number;
  /** Écart sur la fin, en jours (>0 : retard, <0 : avance). Définitif si terminé, provisoire sinon. */
  ecartFin?: number;
  /** L'écart est-il définitif (fin réelle saisie) ? */
  ecartDefinitif: boolean;
  enRetard: boolean;
  enAvance: boolean;
  avancement: number;
  /** Fin de la barre réelle : fin réelle, ou aujourd'hui si en cours. */
  finBarreReelle?: ISODate;
  /** Fin estimée si les travaux sont en cours (projection). */
  finEstimee?: ISODate;
}

export function duree(debut?: ISODate, fin?: ISODate): number {
  if (!debut || !fin) return 0;
  return Math.max(1, diffDays(debut, fin) + 1);
}

export function analyseSousBloc(sb: SousBloc, auj: ISODate): TaskAnalysis {
  const { debutPrevu, finPrevue, debutReel, finReelle } = sb;
  const res: TaskAnalysis = { state: 'non_planifie', ecartDefinitif: false, enRetard: false, enAvance: false, avancement: 0 };

  if (debutPrevu && debutReel) res.ecartDebut = diffDays(debutPrevu, debutReel);

  if (finReelle) {
    res.state = 'termine';
    res.avancement = 100;
    res.finBarreReelle = finReelle;
    if (finPrevue) {
      res.ecartFin = diffDays(finPrevue, finReelle);
      res.ecartDefinitif = true;
    }
  } else if (debutReel) {
    const late = !!finPrevue && dayNum(auj) > dayNum(finPrevue);
    res.state = late ? 'en_depassement' : 'en_cours';
    res.finBarreReelle = dayNum(auj) >= dayNum(debutReel) ? auj : debutReel;
    res.avancement = sb.avancement ?? estimationTemps(debutReel, finPrevue && debutPrevu ? duree(debutPrevu, finPrevue) : 0, auj);
    res.finEstimee = projection(sb, auj);
    if (finPrevue && res.finEstimee) res.ecartFin = diffDays(finPrevue, res.finEstimee);
    else if (late && finPrevue) res.ecartFin = diffDays(finPrevue, auj);
  } else if (debutPrevu) {
    res.avancement = 0;
    if (dayNum(auj) > dayNum(debutPrevu)) {
      res.state = 'retard_demarrage';
      res.ecartDebut = diffDays(debutPrevu, auj);
      if (finPrevue) {
        // Si les travaux démarraient aujourd'hui, ils finiraient…
        const fin = addDays(auj, duree(debutPrevu, finPrevue) - 1);
        res.finEstimee = fin;
        res.ecartFin = diffDays(finPrevue, fin);
      }
    } else {
      res.state = 'a_venir';
    }
  }

  res.enRetard = (res.ecartFin ?? 0) > 0 || res.state === 'retard_demarrage';
  res.enAvance = !res.enRetard && (res.ecartFin ?? 0) < 0;
  return res;
}

/** Avancement estimé d'après le temps écoulé (plafonné à 95 % tant que la fin n'est pas saisie). */
function estimationTemps(debutReel: ISODate, dureePrevue: number, auj: ISODate): number {
  if (!dureePrevue) return 0;
  const ecoule = diffDays(debutReel, auj) + 1;
  return Math.max(0, Math.min(95, Math.round((ecoule / dureePrevue) * 100)));
}

/** Projection de la date de fin d'une tâche en cours. */
function projection(sb: SousBloc, auj: ISODate): ISODate | undefined {
  if (!sb.debutReel) return undefined;
  const dureePrevue = duree(sb.debutPrevu, sb.finPrevue);
  const ecoule = Math.max(1, diffDays(sb.debutReel, auj) + 1);
  let fin: number;
  if (sb.avancement !== undefined && sb.avancement > 0 && sb.avancement < 100) {
    // Vitesse constante : durée totale = temps écoulé / avancement
    fin = dayNum(sb.debutReel) + Math.round(ecoule / (sb.avancement / 100)) - 1;
  } else if (dureePrevue) {
    fin = dayNum(sb.debutReel) + dureePrevue - 1;
  } else {
    return undefined;
  }
  return fromDayNum(Math.max(fin, dayNum(auj)));
}

export interface BlocAnalysis {
  debutPrevu?: ISODate;
  finPrevue?: ISODate;
  debutReel?: ISODate;
  finBarreReelle?: ISODate;
  finEstimee?: ISODate;
  termine: boolean;
  avancement: number;
  nbRetard: number;
  /** Écart entre la fin prévue du bloc et sa fin réelle / estimée. */
  ecartFin?: number;
  enRetard: boolean;
  enAvance: boolean;
}

function minDate(dates: (ISODate | undefined)[]): ISODate | undefined {
  const v = dates.filter(Boolean) as ISODate[];
  return v.length ? v.reduce((a, b) => (a < b ? a : b)) : undefined;
}
function maxDate(dates: (ISODate | undefined)[]): ISODate | undefined {
  const v = dates.filter(Boolean) as ISODate[];
  return v.length ? v.reduce((a, b) => (a > b ? a : b)) : undefined;
}

/** Les dates du bloc sont déduites de ses sous-blocs. */
export function analyseBloc(bloc: Bloc, auj: ISODate): BlocAnalysis {
  const items = bloc.sousBlocs.map((sb) => ({ sb, a: analyseSousBloc(sb, auj) }));
  const termine = items.length > 0 && items.every((i) => i.a.state === 'termine');
  const nbRetard = items.filter((i) => i.a.enRetard).length;
  const finPrevue = maxDate(bloc.sousBlocs.map((s) => s.finPrevue));
  // Fin réelle ou estimée du bloc = la plus tardive de ses sous-blocs
  const finProbable = maxDate(items.map((i) => i.a.state === 'termine' ? i.a.finBarreReelle : i.a.finEstimee ?? i.sb.finPrevue));
  const ecartFin = finPrevue && finProbable ? diffDays(finPrevue, finProbable) : undefined;
  return {
    debutPrevu: minDate(bloc.sousBlocs.map((s) => s.debutPrevu)),
    finPrevue,
    debutReel: minDate(bloc.sousBlocs.map((s) => s.debutReel)),
    finBarreReelle: maxDate(items.map((i) => i.a.finBarreReelle)),
    finEstimee: termine ? undefined : maxDate(items.map((i) => i.a.finEstimee)),
    termine,
    avancement: avancementPondere(bloc.sousBlocs, auj),
    nbRetard,
    ecartFin,
    enRetard: nbRetard > 0 || (ecartFin ?? 0) > 0,
    enAvance: nbRetard === 0 && (ecartFin ?? 0) < 0,
  };
}

/** Avancement pondéré par la durée prévue de chaque sous-bloc. */
export function avancementPondere(sousBlocs: SousBloc[], auj: ISODate): number {
  let total = 0;
  let fait = 0;
  for (const sb of sousBlocs) {
    const poids = duree(sb.debutPrevu, sb.finPrevue) || 1;
    total += poids;
    fait += (poids * analyseSousBloc(sb, auj).avancement) / 100;
  }
  return total ? Math.round((fait / total) * 100) : 0;
}

export function avancementProjet(p: Project, auj: ISODate): number {
  return avancementPondere(p.blocs.flatMap((b) => b.sousBlocs), auj);
}

/** Étendue du planning (prévu + réel + aujourd'hui). */
export function etendue(p: Project, auj: ISODate): { debut: ISODate; fin: ISODate } {
  const all: (ISODate | undefined)[] = [p.info.dateDebut, p.info.dateFinPrevue, auj];
  for (const b of p.blocs)
    for (const sb of b.sousBlocs) {
      const a = analyseSousBloc(sb, auj);
      all.push(sb.debutPrevu, sb.finPrevue, sb.debutReel, sb.finReelle, a.finEstimee);
    }
  return { debut: minDate(all)!, fin: maxDate(all)! };
}

export function sousBlocsEnRetard(p: Project, auj: ISODate): { bloc: Bloc; sb: SousBloc; a: TaskAnalysis }[] {
  const out: { bloc: Bloc; sb: SousBloc; a: TaskAnalysis }[] = [];
  for (const bloc of p.blocs)
    for (const sb of bloc.sousBlocs) {
      const a = analyseSousBloc(sb, auj);
      if (a.enRetard) out.push({ bloc, sb, a });
    }
  return out;
}

export function isOpen(o: Observation): boolean {
  return o.statut === 'a_faire' || o.statut === 'en_cours';
}

export function formatEcart(e?: number): string {
  if (e === undefined) return '';
  if (e === 0) return 'à l’heure';
  return e > 0 ? `+${e} j` : `−${-e} j`;
}

/** Code hiérarchique « 02 » / « 02.03 ». */
export function codeBloc(p: Project, blocId?: string): string {
  const i = p.blocs.findIndex((b) => b.id === blocId);
  return i < 0 ? '' : String(i + 1).padStart(2, '0');
}

export function codeSousBloc(p: Project, sousBlocId?: string): string {
  for (let i = 0; i < p.blocs.length; i++) {
    const j = p.blocs[i].sousBlocs.findIndex((s) => s.id === sousBlocId);
    if (j >= 0) return `${String(i + 1).padStart(2, '0')}.${String(j + 1).padStart(2, '0')}`;
  }
  return '';
}

export function findSousBloc(p: Project, id?: string): { bloc: Bloc; sb: SousBloc } | undefined {
  if (!id) return undefined;
  for (const bloc of p.blocs) {
    const sb = bloc.sousBlocs.find((s) => s.id === id);
    if (sb) return { bloc, sb };
  }
  return undefined;
}
