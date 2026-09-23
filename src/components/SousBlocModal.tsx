import { useState } from 'react';
import type { Project, SousBloc } from '../types';
import { useStore } from '../store';
import { analyseSousBloc, codeSousBloc, formatEcart, TASK_STATE_LABEL } from '../lib/planning';
import { fmt } from '../lib/dates';
import { href } from '../router';
import { Modal, useToday } from './ui';
import { OBS_STATUS_LABEL } from '../lib/labels';
import { pastilleLabel } from '../lib/ids';

/** Fiche d'un sous-bloc : dates prévues / réelles, avancement, observations liées. */
export function SousBlocModal({ p, sousBlocId, onClose }: { p: Project; sousBlocId: string; onClose: () => void }) {
  const store = useStore();
  const auj = useToday();
  const bloc = p.blocs.find((b) => b.sousBlocs.some((s) => s.id === sousBlocId))!;
  const initial = bloc.sousBlocs.find((s) => s.id === sousBlocId)!;
  const [sb, setSb] = useState<SousBloc>(initial);
  const a = analyseSousBloc(sb, auj);
  const obs = p.observations.filter((o) => o.sousBlocId === sousBlocId).sort((x, y) => x.numero - y.numero);
  const set = <K extends keyof SousBloc>(k: K, v: SousBloc[K]) => setSb({ ...sb, [k]: v });

  const save = async () => {
    await store.update(p.id, (d) => {
      const b = d.blocs.find((x) => x.id === bloc.id)!;
      b.sousBlocs = b.sousBlocs.map((s) => (s.id === sb.id ? sb : s));
    });
    onClose();
  };

  const date = (k: 'debutPrevu' | 'finPrevue' | 'debutReel' | 'finReelle', label: string) => (
    <label className="f">
      {label}
      <input type="date" value={sb[k] || ''} onChange={(e) => set(k, e.target.value || undefined)} />
    </label>
  );

  return (
    <Modal
      title={
        <>
          <span className="muted" style={{ fontSize: 16 }}>{codeSousBloc(p, sb.id)} · {bloc.nom}</span>
          <br />
          {sb.nom}
        </>
      }
      onClose={onClose}
      footer={
        <>
          <button className="btn ghost" onClick={onClose}>Annuler</button>
          <button className="btn" onClick={save}>Enregistrer</button>
        </>
      }
    >
      <div className="stack">
        <div className="row wrap">
          <span className={'tag ' + (a.enRetard ? 'late' : a.enAvance ? 'early' : '')}>{TASK_STATE_LABEL[a.state]}</span>
          {a.ecartFin !== undefined && (
            <span className={'tag ' + (a.ecartFin > 0 ? 'late' : a.ecartFin < 0 ? 'early' : '')}>
              {a.ecartDefinitif ? 'Écart' : 'Écart estimé'} : {formatEcart(a.ecartFin)}
            </span>
          )}
          {a.finEstimee && <span className="tag line">Fin estimée {fmt(a.finEstimee)}</span>}
        </div>
        <div className="form-grid">
          <label className="f full">
            Nom
            <input type="text" value={sb.nom} onChange={(e) => set('nom', e.target.value)} />
          </label>
          <label className="f full">
            Entreprise
            <input type="text" list="entreprises" value={sb.entreprise || ''} onChange={(e) => set('entreprise', e.target.value || undefined)} />
            <datalist id="entreprises">
              {p.info.entreprises.map((e) => <option key={e.id} value={e.nom} />)}
            </datalist>
          </label>
        </div>
        <div className="eyebrow">Planification (prévisionnel)</div>
        <div className="form-grid">
          {date('debutPrevu', 'Début prévu')}
          {date('finPrevue', 'Fin prévue')}
        </div>
        <div className="eyebrow">Réalisation (réel)</div>
        <div className="form-grid">
          {date('debutReel', 'Début réel')}
          {date('finReelle', 'Fin réelle')}
        </div>
        <div className="row wrap">
          {!sb.debutReel && <button className="btn ghost sm" onClick={() => set('debutReel', auj)}>Démarré aujourd’hui</button>}
          {sb.debutReel && !sb.finReelle && <button className="btn ghost sm" onClick={() => setSb({ ...sb, finReelle: auj, avancement: 100 })}>Terminé aujourd’hui</button>}
        </div>
        {!sb.finReelle && sb.debutReel && (
          <label className="f">
            Avancement estimé : {sb.avancement ?? a.avancement} %{sb.avancement === undefined && ' (calculé d’après le temps écoulé)'}
            <input type="range" min={0} max={100} step={5} value={sb.avancement ?? a.avancement} onChange={(e) => set('avancement', Number(e.target.value))} />
          </label>
        )}
        <div>
          <div className="eyebrow" style={{ marginBottom: 6 }}>Observations liées ({obs.length})</div>
          {obs.length === 0 && <div className="muted small">Aucune observation sur ce sous-bloc.</div>}
          <div className="list">
            {obs.map((o) => (
              <a key={o.id} className="item" href={href(`/p/${p.id}/obs/${o.id}`)}>
                <span className={'pchip ' + o.statut}>{pastilleLabel(o.numero)}</span>
                <span className="grow">{o.titre || 'Sans titre'}</span>
                <span className="tiny muted">{OBS_STATUS_LABEL[o.statut]}</span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}
