import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { ISODate, Project } from '../types';
import { addDays, dayNum, fmt, fromDayNum, monthLabel, weekday } from '../lib/dates';
import { analyseSousBloc, etendue, finEstimeeProjet, formatEcart, isOpen, sousBlocsEnRetard, TASK_STATE_LABEL } from '../lib/planning';
import { href } from '../router';
import { Empty, Seg, useToday } from '../components/ui';
import { IconCaret, IconPrint } from '../components/Icons';
import { GanttExportModal } from '../components/GanttExportModal';
import { SousBlocModal } from '../components/SousBlocModal';
import { blocBars, openObsCount, sousBlocBars, type RowBars, type SegmentKind } from '../lib/ganttModel';

type Zoom = 'jour' | 'semaine' | 'mois';
const DAY_W: Record<Zoom, number> = { jour: 30, semaine: 12, mois: 4 };

function useNarrow() {
  const [n, setN] = useState(() => window.matchMedia('(max-width: 700px)').matches);
  useEffect(() => {
    const m = window.matchMedia('(max-width: 700px)');
    const on = () => setN(m.matches);
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, []);
  return n;
}

const SEG_CLASS: Record<SegmentKind, string> = {
  plan: 'g-bar plan',
  real: 'g-bar real',
  early: 'g-bar real early',
  over: 'g-bar over',
  proj: 'g-bar proj',
  projLate: 'g-bar proj lateproj',
};
const SEG_TITLE: Record<SegmentKind, string> = {
  plan: 'Prévu',
  real: 'Réel',
  early: 'Réel — terminé en avance',
  over: 'Dépassement de la date de fin prévue',
  proj: 'Projection (fin estimée)',
  projLate: 'Projection (fin estimée, après la fin prévue)',
};

/** Barres prévu / réel / projection d'une ligne du Gantt. */
function Bars({ bars, start, dayW }: { bars: RowBars; start: number; dayW: number }) {
  const px = (d: number) => (d - start) * dayW;
  const out: ReactNode[] = bars.segments.map((s) => (
    <div
      key={s.kind}
      className={SEG_CLASS[s.kind]}
      style={{ left: px(s.start), width: px(s.end) - px(s.start) }}
      title={`${SEG_TITLE[s.kind]} : ${fmt(fromDayNum(s.start))} – ${fmt(fromDayNum(s.end - 1))}`}
    />
  ));
  const e = bars.ecart;
  if (e !== undefined) {
    out.push(
      <span key="ecart" className={'g-ecart ' + (e > 0 ? 'late' : e < 0 ? 'early' : 'ok')} style={{ left: px(bars.rightMost) + 6 }} title={bars.ecartDefinitif ? 'Écart définitif' : 'Écart estimé'}>
        {e > 0 ? 'Retard ' : e < 0 ? 'Avance ' : ''}
        {formatEcart(e)}
        {!bars.ecartDefinitif && ' (est.)'}
      </span>
    );
  }
  return <>{out}</>;
}

export function Gantt({ p }: { p: Project }) {
  const auj = useToday();
  const narrow = useNarrow();
  const [zoom, setZoom] = useState<Zoom>(() => (localStorage.getItem('gantt.zoom') as Zoom) || 'semaine');
  const [closed, setClosed] = useState<Record<string, boolean>>({});
  const [edit, setEdit] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const labelW = narrow ? 138 : 250;
  const dayW = DAY_W[zoom];

  useEffect(() => localStorage.setItem('gantt.zoom', zoom), [zoom]);

  const hasPlanning = p.blocs.some((b) => b.sousBlocs.some((s) => s.debutPrevu && s.finPrevue));
  const range = useMemo(() => {
    const e = etendue(p, auj);
    return { start: addDays(e.debut, -7), end: addDays(e.fin, 21) };
  }, [p, auj]);
  const days = dayNum(range.end) - dayNum(range.start) + 1;
  const width = days * dayW;
  const x = (d: ISODate) => (dayNum(d) - dayNum(range.start)) * dayW;

  const scrollToToday = () => {
    const el = scroller.current;
    if (el) el.scrollTo({ left: Math.max(0, x(auj) - (el.clientWidth - labelW) / 2), behavior: 'smooth' });
  };
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollLeft = Math.max(0, x(auj) - (el.clientWidth - labelW) / 2);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom, hasPlanning]);

  // Échelle de temps
  const months: { left: number; width: number; label: string }[] = [];
  const ticks: { left: number; label: string; we?: boolean; w: number }[] = [];
  for (let n = dayNum(range.start); n <= dayNum(range.end); n++) {
    const d = fromDayNum(n);
    const dd = Number(d.slice(8));
    if (dd === 1 || n === dayNum(range.start)) {
      const last = months[months.length - 1];
      if (last) last.width = x(d) - last.left;
      months.push({ left: x(d), width: 0, label: monthLabel(d, zoom === 'mois') });
    }
    const wd = weekday(d);
    if (zoom === 'jour') ticks.push({ left: x(d), label: String(dd), we: wd === 0 || wd === 6, w: dayW });
    else if (zoom === 'semaine' && wd === 1) ticks.push({ left: x(d), label: `${String(dd).padStart(2, '0')}`, w: dayW * 7 });
  }
  if (months.length) months[months.length - 1].width = width - months[months.length - 1].left;

  const retards = sousBlocsEnRetard(p, auj);
  const finProjet = finEstimeeProjet(p, auj);
  const totalOuvertes = p.observations.filter(isOpen).length;

  if (!hasPlanning)
    return (
      <Empty title="Planning vide">
        <p>Renseignez les dates prévues de vos sous-blocs pour afficher le Gantt.</p>
        <a className="btn" href={href(`/p/${p.id}/structure`)}>Saisir la structure et les dates</a>
      </Empty>
    );

  return (
    <div>
      <div className="gantt-tools">
        <Seg value={zoom} onChange={setZoom} options={[['jour', 'Jours'], ['semaine', 'Semaines'], ['mois', 'Mois']]} />
        <button className="btn ghost sm" onClick={scrollToToday}>Aujourd’hui</button>
        <button className="btn ghost sm" onClick={() => setClosed(Object.values(closed).some(Boolean) ? {} : Object.fromEntries(p.blocs.map((b) => [b.id, true])))}>
          {Object.values(closed).some(Boolean) ? 'Tout développer' : 'Tout réduire'}
        </button>
        <span className="grow" />
        <span className={'tag ' + (retards.length ? 'late' : 'early')}>
          {retards.length ? `${retards.length} sous-bloc${retards.length > 1 ? 's' : ''} en retard` : 'Aucun retard'}
        </span>
        <a className={'tag ' + (totalOuvertes ? 'late' : 'line')} href={href(`/p/${p.id}/obs?statut=ouvertes`)} style={{ textDecoration: 'none' }}>
          {totalOuvertes} observation{totalOuvertes > 1 ? 's' : ''} non résolue{totalOuvertes > 1 ? 's' : ''}
        </a>
        {finProjet && p.info.dateFinPrevue && (
          <span className={'tag ' + (finProjet > p.info.dateFinPrevue ? 'late' : 'line')}>
            Fin estimée {fmt(finProjet)} (prévue {fmt(p.info.dateFinPrevue)})
          </span>
        )}
        <button className="btn sm" onClick={() => setExporting(true)}>
          <IconPrint /> Exporter en PDF
        </button>
      </div>

      <div className="gantt" ref={scroller}>
        <div className="gantt-inner" style={{ width: labelW + width }}>
          <div className="g-head">
            <div className="g-corner" style={{ width: labelW }}>
              <span className="eyebrow">Blocs / sous-blocs</span>
            </div>
            <div className="g-scale" style={{ width, height: 46 }}>
              {months.map((m) => (
                <div key={m.left} className="g-month" style={{ left: m.left, width: m.width }}>{m.label}</div>
              ))}
              {ticks.map((t) => (
                <div key={t.left} className={'g-tick' + (t.we ? ' we' : '')} style={{ left: t.left, width: t.w }}>{t.label}</div>
              ))}
            </div>
          </div>

          <div style={{ position: 'relative' }}>
            {/* Ligne « Aujourd'hui » : recalculée automatiquement chaque jour */}
            <div className="g-today" style={{ left: labelW + x(auj) + dayW / 2 }}>
              <span>AUJOURD’HUI · {fmt(auj).slice(0, 5)}</span>
            </div>
            {zoom !== 'jour' &&
              months.map((m) => <div key={'g' + m.left} className="g-grid" style={{ left: labelW + m.left }} />)}

            {p.blocs.map((bloc, bi) => {
              const isClosed = closed[bloc.id];
              const openObsBloc = openObsCount(p, { blocId: bloc.id });
              return (
                <div key={bloc.id}>
                  <div className="g-row bloc">
                    <div className="g-label" style={{ width: labelW }} onClick={() => setClosed({ ...closed, [bloc.id]: !isClosed })}>
                      <IconCaret className={'caret' + (isClosed ? ' closed' : '')} />
                      <span className="code">{String(bi + 1).padStart(2, '0')}</span>
                      <span className="nm grow" title={bloc.nom}>{bloc.nom}</span>
                      {openObsBloc > 0 && isClosed && <span className="tag late" title={`${openObsBloc} observation(s) non résolue(s) dans ce bloc`}>● {openObsBloc}</span>}
                    </div>
                    <div className="g-track" style={{ width }}>
                      <Bars bars={blocBars(bloc, auj)} start={dayNum(range.start)} dayW={dayW} />
                    </div>
                  </div>
                  {!isClosed &&
                    bloc.sousBlocs.map((sb, si) => {
                      const a = analyseSousBloc(sb, auj);
                      const openObs = openObsCount(p, { sousBlocId: sb.id });
                      return (
                        <div className="g-row" key={sb.id}>
                          <div className="g-label" style={{ width: labelW, paddingLeft: narrow ? 12 : 30 }} onClick={() => setEdit(sb.id)} title={`${sb.nom} — ${TASK_STATE_LABEL[a.state]}`}>
                            {!narrow && <span className="code">{String(bi + 1).padStart(2, '0')}.{String(si + 1).padStart(2, '0')}</span>}
                            <span className="nm grow">{sb.nom}</span>
                            {openObs > 0 && <span className="tag late" title={`${openObs} observation(s) non résolue(s)`}>● {openObs}</span>}
                          </div>
                          <div className="g-track" style={{ width, cursor: 'pointer' }} onClick={() => setEdit(sb.id)}>
                            <Bars bars={sousBlocBars(sb, auj)} start={dayNum(range.start)} dayW={dayW} />
                          </div>
                        </div>
                      );
                    })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="legend" style={{ marginTop: 12 }}>
        <span><i style={{ background: 'repeating-linear-gradient(135deg, #cbb899 0 5px, #d8c9ae 5px 10px)', border: '1px solid #b39f7d' }} /> Prévu</span>
        <span><i style={{ background: 'var(--ink)' }} /> Réel</span>
        <span><i style={{ background: 'var(--late)' }} /> Dépassement</span>
        <span><i style={{ background: 'var(--early)' }} /> Terminé en avance</span>
        <span><i style={{ border: '1.5px dashed var(--ink-2)' }} /> Projection</span>
        <span><i style={{ width: 2, height: 14, background: 'var(--late)' }} /> Aujourd’hui</span>
        <span><span className="tag late">● n</span> n observations non résolues (à faire / en cours) sur la ligne</span>
      </div>
      {edit && <SousBlocModal p={p} sousBlocId={edit} onClose={() => setEdit(null)} />}
      {exporting && <GanttExportModal p={p} onClose={() => setExporting(false)} />}
    </div>
  );
}
