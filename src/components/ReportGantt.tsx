import type { Bloc, CompteRendu, Project, SousBloc } from '../types';
import { dayNum, fmt, fromDayNum, monthLabel } from '../lib/dates';
import { CR_CHANTIER } from '../lib/labels';
import { cleEntreprise } from '../lib/entreprises';
import { codeSousBloc, formatEcart } from '../lib/planning';
import { sousBlocBars, type SegmentKind } from '../lib/ganttModel';

const SEG: Record<SegmentKind, string> = {
  plan: 'rg-bar plan',
  real: 'rg-bar real',
  early: 'rg-bar real early',
  over: 'rg-bar over',
  proj: 'rg-bar proj',
  projLate: 'rg-bar proj late',
};

/** Tâches concernées par le compte rendu : celles des entreprises cochées (toutes si « Chantier »). */
export function tachesConcernees(p: Project, cr: CompteRendu): { bloc: Bloc; taches: SousBloc[] }[] {
  const concernes = cr.concernes || [];
  const tout = concernes.length === 0 || concernes.includes(CR_CHANTIER);
  const cles = new Set(concernes.map(cleEntreprise));
  return p.blocs
    .map((bloc) => ({
      bloc,
      taches: bloc.sousBlocs.filter((t) => (t.debutPrevu || t.debutReel) && (tout || (t.entreprise && cles.has(cleEntreprise(t.entreprise))))),
    }))
    .filter((g) => g.taches.length);
}

/** Extrait du Gantt (prévu / réel) pour le compte rendu d'avancement. */
export function ReportGantt({ p, cr, date: refDate }: { p: Project; cr: CompteRendu; date: string }) {
  const groupes = tachesConcernees(p, cr);
  if (!groupes.length) return null;
  const rows = groupes.flatMap((g) => g.taches.map((t) => ({ t, bars: sousBlocBars(t, refDate) })));
  let start = dayNum(refDate);
  let end = dayNum(refDate) + 1;
  for (const r of rows) for (const s of r.bars.segments) (start = Math.min(start, s.start)), (end = Math.max(end, s.end));
  start -= 2;
  end += 2;
  const span = end - start;
  const pct = (d: number) => `${((d - start) / span) * 100}%`;
  const mois: { left: string; label: string }[] = [];
  for (let n = start; n < end; n++) {
    const d = fromDayNum(n);
    if (d.endsWith('-01') || n === start) mois.push({ left: pct(n), label: monthLabel(d, true) });
  }

  return (
    <div className="rg">
      <div className="rg-row rg-head">
        <div className="rg-lbl">Tâche</div>
        <div className="rg-track">
          {mois.map((m) => <span key={m.left} className="rg-month" style={{ left: m.left }}>{m.label}</span>)}
        </div>
      </div>
      {groupes.map(({ bloc, taches }) => (
        <div key={bloc.id}>
          <div className="rg-lot">{bloc.nom}</div>
          {taches.map((t) => {
            const bars = rows.find((r) => r.t.id === t.id)!.bars;
            return (
              <div key={t.id} className="rg-row">
                <div className="rg-lbl">
                  <span className="rg-code">{codeSousBloc(p, t.id)}</span> {t.nom}
                  {t.entreprise && <span className="rg-ent"> — {t.entreprise}</span>}
                </div>
                <div className="rg-track" title={`Prévu ${fmt(t.debutPrevu)} → ${fmt(t.finPrevue)}`}>
                  {mois.map((m) => <i key={m.left} className="rg-grid" style={{ left: m.left }} />)}
                  {bars.segments.map((s) => (
                    <i key={s.kind} className={SEG[s.kind]} style={{ left: pct(s.start), width: `${((s.end - s.start) / span) * 100}%` }} />
                  ))}
                  {bars.ecart !== undefined && bars.ecart !== 0 && (
                    <span className={'rg-ecart ' + (bars.ecart > 0 ? 'late' : 'early')} style={{ left: `calc(${pct(bars.rightMost)} + 3px)` }}>
                      {formatEcart(bars.ecart)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ))}
      <div className="rg-today" style={{ left: `calc(36% + 64% * ${(dayNum(refDate) - start + 0.5) / span})` }} />
      <div className="rg-legend">
        <span><i className="rg-bar plan" /> Prévu</span>
        <span><i className="rg-bar real" /> Réel</span>
        <span><i className="rg-bar over" /> Dépassement</span>
        <span><i className="rg-bar proj" /> Projection</span>
        <span><i className="rg-today-key" /> Date du compte rendu</span>
      </div>
    </div>
  );
}
