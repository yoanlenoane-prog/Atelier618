import { useState } from 'react';
import type { Bloc, Project } from '../types';
import { useStore } from '../store';
import { uid } from '../lib/ids';
import { fmtShort } from '../lib/dates';
import { analyseBloc, analyseSousBloc, formatEcart } from '../lib/planning';
import { blocsFromModele } from '../lib/factory';
import { confirmAction, Empty, useToday } from '../components/ui';
import { IconDown, IconPlus, IconTrash, IconUp } from '../components/Icons';
import { SousBlocModal } from '../components/SousBlocModal';

function move<T>(list: T[], i: number, d: number): T[] {
  const j = i + d;
  if (j < 0 || j >= list.length) return list;
  const out = [...list];
  [out[i], out[j]] = [out[j], out[i]];
  return out;
}

export function Structure({ p }: { p: Project }) {
  const store = useStore();
  const auj = useToday();
  const [edit, setEdit] = useState<string | null>(null);
  const upd = (fn: (blocs: Bloc[]) => Bloc[]) =>
    store.update(p.id, (d) => {
      d.blocs = fn(d.blocs);
    });

  const rename = (current: string, label: string) => {
    const v = window.prompt(label, current);
    return v === null ? null : v.trim();
  };

  return (
    <div className="stack lg">
      <div className="section-title">
        <div>
          <h2>Blocs & sous-blocs</h2>
          <div className="muted small">La même structure sert au Gantt, aux observations et aux comptes rendus. Les dates d’un bloc sont déduites de ses sous-blocs.</div>
        </div>
        <button
          className="btn"
          onClick={() => {
            const nom = rename('', 'Nom du nouveau bloc (ex. GROS ŒUVRE)');
            if (nom) upd((b) => [...b, { id: uid('b'), nom, sousBlocs: [] }]);
          }}
        >
          <IconPlus /> Nouveau bloc
        </button>
      </div>

      {p.blocs.length === 0 && (
        <Empty title="Aucun bloc">
          <p>Créez vos blocs de travaux, ou partez de la structure type.</p>
          <button className="btn sand" onClick={() => upd(() => blocsFromModele())}>Utiliser la structure type</button>
        </Empty>
      )}

      {p.blocs.map((bloc, bi) => {
        const ba = analyseBloc(bloc, auj);
        return (
          <div className="card" key={bloc.id}>
            <div className="row between wrap">
              <div className="row">
                <span className="serif" style={{ fontSize: 26, color: 'var(--sand-2)' }}>{String(bi + 1).padStart(2, '0')}</span>
                <h2 style={{ margin: 0 }}>{bloc.nom}</h2>
              </div>
              <div className="row">
                <span className="tiny muted">{ba.debutPrevu ? `${fmtShort(ba.debutPrevu)} → ${fmtShort(ba.finPrevue)}` : 'Non planifié'}</span>
                <button className="btn ghost sm icon" aria-label="Monter" onClick={() => upd((b) => move(b, bi, -1))}><IconUp /></button>
                <button className="btn ghost sm icon" aria-label="Descendre" onClick={() => upd((b) => move(b, bi, 1))}><IconDown /></button>
                <button
                  className="btn ghost sm"
                  onClick={() => {
                    const nom = rename(bloc.nom, 'Nom du bloc');
                    if (nom) upd((b) => b.map((x) => (x.id === bloc.id ? { ...x, nom } : x)));
                  }}
                >
                  Renommer
                </button>
                <button
                  className="btn danger sm icon"
                  aria-label="Supprimer le bloc"
                  onClick={() => {
                    if (confirmAction(`Supprimer le bloc « ${bloc.nom} » et ses ${bloc.sousBlocs.length} sous-blocs ?\nLes observations liées seront conservées (sans bloc).`))
                      upd((b) => b.filter((x) => x.id !== bloc.id));
                  }}
                >
                  <IconTrash />
                </button>
              </div>
            </div>
            <div style={{ marginTop: 10 }}>
              {bloc.sousBlocs.map((sb, si) => {
                const a = analyseSousBloc(sb, auj);
                const nObs = p.observations.filter((o) => o.sousBlocId === sb.id).length;
                return (
                  <div className="sb-row" key={sb.id}>
                    <button className="linkbtn" style={{ textDecoration: 'none', textAlign: 'left' }} onClick={() => setEdit(sb.id)}>
                      <div className="row wrap" style={{ gap: 8 }}>
                        <span className="tiny muted mono">{String(bi + 1).padStart(2, '0')}.{String(si + 1).padStart(2, '0')}</span>
                        <strong style={{ fontWeight: 500 }}>{sb.nom}</strong>
                        {sb.entreprise && <span className="tiny muted">— {sb.entreprise}</span>}
                        {a.ecartFin !== undefined && a.ecartFin !== 0 && (
                          <span className={'tag ' + (a.ecartFin > 0 ? 'late' : 'early')}>{formatEcart(a.ecartFin)}</span>
                        )}
                        {nObs > 0 && <span className="tag">{nObs} obs.</span>}
                      </div>
                      <div className="tiny muted mono">
                        Prévu {fmtShort(sb.debutPrevu)} → {fmtShort(sb.finPrevue)} · Réel {fmtShort(sb.debutReel)} → {fmtShort(sb.finReelle)}
                      </div>
                    </button>
                    <div className="row" style={{ gap: 4 }}>
                      <button className="btn ghost sm icon" aria-label="Monter" onClick={() => upd((b) => b.map((x) => (x.id === bloc.id ? { ...x, sousBlocs: move(x.sousBlocs, si, -1) } : x)))}><IconUp /></button>
                      <button className="btn ghost sm icon" aria-label="Descendre" onClick={() => upd((b) => b.map((x) => (x.id === bloc.id ? { ...x, sousBlocs: move(x.sousBlocs, si, 1) } : x)))}><IconDown /></button>
                      <button
                        className="btn danger sm icon"
                        aria-label="Supprimer"
                        onClick={() => confirmAction(`Supprimer le sous-bloc « ${sb.nom} » ?`) && upd((b) => b.map((x) => (x.id === bloc.id ? { ...x, sousBlocs: x.sousBlocs.filter((s) => s.id !== sb.id) } : x)))}
                      >
                        <IconTrash />
                      </button>
                    </div>
                  </div>
                );
              })}
              <button
                className="btn ghost sm"
                style={{ marginTop: 10 }}
                onClick={() => {
                  const nom = rename('', `Nouveau sous-bloc dans « ${bloc.nom} »`);
                  if (nom) upd((b) => b.map((x) => (x.id === bloc.id ? { ...x, sousBlocs: [...x.sousBlocs, { id: uid('s'), nom }] } : x)));
                }}
              >
                <IconPlus /> Sous-bloc
              </button>
            </div>
          </div>
        );
      })}
      {edit && <SousBlocModal p={p} sousBlocId={edit} onClose={() => setEdit(null)} />}
    </div>
  );
}
