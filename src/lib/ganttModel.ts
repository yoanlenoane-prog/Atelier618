/**
 * Géométrie des barres du Gantt, en jours (partagée entre l'écran et l'export PDF).
 */
import type { Bloc, ISODate, Project, SousBloc } from '../types';
import { dayNum } from './dates';
import { analyseBloc, analyseSousBloc, isOpen } from './planning';

export type SegmentKind = 'plan' | 'real' | 'early' | 'over' | 'proj' | 'projLate';

export interface Segment {
  kind: SegmentKind;
  /** Jour de début (numéro de jour, inclus). */
  start: number;
  /** Jour de fin (numéro de jour, exclu). */
  end: number;
}

export interface RowBars {
  segments: Segment[];
  ecart?: number;
  ecartDefinitif: boolean;
  /** Extrémité droite de la dernière barre (pour placer l'étiquette d'écart). */
  rightMost: number;
}

export interface BarsInput {
  debutPrevu?: ISODate;
  finPrevue?: ISODate;
  debutReel?: ISODate;
  finReel?: ISODate;
  finEstimee?: ISODate;
  termine: boolean;
  ecart?: number;
  ecartDefinitif?: boolean;
  nonDemarre?: boolean;
  auj: ISODate;
}

export function rowBars(i: BarsInput): RowBars {
  const segments: Segment[] = [];
  let rightMost = -Infinity;
  const end = (d: ISODate) => dayNum(d) + 1; // la date de fin est incluse

  if (i.debutPrevu && i.finPrevue) {
    segments.push({ kind: 'plan', start: dayNum(i.debutPrevu), end: end(i.finPrevue) });
    rightMost = end(i.finPrevue);
  }
  if (i.debutReel && i.finReel) {
    const r0 = dayNum(i.debutReel);
    const r1 = end(i.finReel);
    const limit = i.finPrevue ? end(i.finPrevue) : Infinity;
    const early = i.termine && (i.ecart ?? 0) < 0;
    const normalEnd = Math.min(r1, limit);
    if (normalEnd > r0) segments.push({ kind: early ? 'early' : 'real', start: r0, end: normalEnd });
    if (r1 > limit) segments.push({ kind: 'over', start: Math.max(r0, limit), end: r1 });
    rightMost = Math.max(rightMost, r1);
  }
  if (!i.termine && i.finEstimee) {
    const s = i.nonDemarre || !i.finReel ? dayNum(i.auj) : end(i.finReel);
    const e = end(i.finEstimee);
    if (e > s) {
      const late = i.finPrevue ? dayNum(i.finEstimee) > dayNum(i.finPrevue) : false;
      segments.push({ kind: late ? 'projLate' : 'proj', start: s, end: e });
      rightMost = Math.max(rightMost, e);
    }
  }
  const show = i.ecart !== undefined && (i.ecart !== 0 || !!i.ecartDefinitif);
  return { segments, ecart: show ? i.ecart : undefined, ecartDefinitif: !!i.ecartDefinitif, rightMost };
}

export function blocBars(bloc: Bloc, auj: ISODate): RowBars {
  const ba = analyseBloc(bloc, auj);
  return rowBars({
    auj, debutPrevu: ba.debutPrevu, finPrevue: ba.finPrevue, debutReel: ba.debutReel, finReel: ba.finBarreReelle,
    finEstimee: ba.finEstimee, termine: ba.termine, ecart: ba.ecartFin, ecartDefinitif: ba.termine,
  });
}

export function sousBlocBars(sb: SousBloc, auj: ISODate): RowBars {
  const a = analyseSousBloc(sb, auj);
  return rowBars({
    auj, debutPrevu: sb.debutPrevu, finPrevue: sb.finPrevue, debutReel: sb.debutReel, finReel: a.finBarreReelle,
    finEstimee: a.finEstimee, termine: a.state === 'termine', ecart: a.ecartFin, ecartDefinitif: a.ecartDefinitif,
    nonDemarre: a.state === 'retard_demarrage',
  });
}

/** Nombre d'observations non résolues (à faire + en cours) d'un sous-bloc ou d'un bloc. */
export function openObsCount(p: Project, opts: { sousBlocId?: string; blocId?: string }): number {
  return p.observations.filter((o) => isOpen(o) && (opts.sousBlocId ? o.sousBlocId === opts.sousBlocId : o.blocId === opts.blocId)).length;
}
