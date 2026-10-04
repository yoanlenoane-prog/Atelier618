import { useState } from 'react';
import type { Project, SousBloc } from '../types';
import { useStore } from '../store';
import { analyseSousBloc, codeSousBloc, debutContraint, duree, formatEcart, predecesseurs, TASK_STATE_LABEL, toutesTaches, nomPastille } from '../lib/planning';
import { addDays } from '../lib/dates';
import { fmt } from '../lib/dates';
import { href } from '../router';
import { Modal, useToday } from './ui';
import { OBS_STATUS_LABEL } from '../lib/labels';

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

  // Dépendances : tâches possibles = toutes sauf elle-même et celles qui dépendent déjà d'elle (boucle)
  const deps = sb.dependances || [];
  const candidats = p.blocs.map((b) => ({
    bloc: b,
    taches: b.sousBlocs.filter((t) => t.id !== sb.id && !predecesseurs(p.blocs, t.id).has(sb.id)),
  }));
  const debutCalcule = deps.length ? debutContraint(sb, new Map(toutesTaches(p.blocs).map((t) => [t.id, t]))) : undefined;
  const setDeps = (list: NonNullable<SousBloc['dependances']>) => {
    const next = { ...sb, dependances: list.length ? list : undefined };
    // Aperçu immédiat des nouvelles dates (recalculées aussi à l'enregistrement)
    const d = debutContraint(next, new Map(toutesTaches(p.blocs).map((t) => [t.id, t])));
    if (d) {
      const dur = sb.debutPrevu && sb.finPrevue ? duree(sb.debutPrevu, sb.finPrevue) : 1;
      next.debutPrevu = d;
      next.finPrevue = addDays(d, dur - 1);
    }
    setSb(next);
  };
  const selectTache = (value: string, onChange: (id: string) => void, placeholder?: string) => (
    <select value={value} onChange={(e) => onChange(e.target.value)} style={{ flex: 1, minWidth: 180 }}>
      {placeholder && <option value="">{placeholder}</option>}
      {candidats.map(({ bloc: b, taches }) =>
        taches.length ? (
          <optgroup key={b.id} label={b.nom}>
            {taches.map((t) => (
              <option key={t.id} value={t.id}>{codeSousBloc(p, t.id)} — {t.nom}{t.finPrevue ? ` (fin ${fmt(t.finPrevue)})` : ''}</option>
            ))}
          </optgroup>
        ) : null
      )}
    </select>
  );

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
        <div className="eyebrow">Enchaînement — démarre après la fin de…</div>
        <div className="stack" style={{ gap: 8 }}>
          {deps.map((d, i) => (
            <div key={i} className="row wrap" style={{ gap: 6 }}>
              {selectTache(d.id, (id) => setDeps(deps.map((x, j) => (j === i ? { ...x, id } : x))))}
              <label className="row small" style={{ gap: 6 }}>
                + <input type="number" min={0} value={d.decalage || 0} style={{ width: 70 }} onChange={(e) => setDeps(deps.map((x, j) => (j === i ? { ...x, decalage: Math.max(0, Number(e.target.value) || 0) } : x)))} /> j
              </label>
              <button className="btn danger sm icon" aria-label="Retirer la dépendance" onClick={() => setDeps(deps.filter((_, j) => j !== i))}>×</button>
            </div>
          ))}
          {selectTache('', (id) => id && setDeps([...deps, { id }]), deps.length ? '+ Ajouter une autre tâche…' : '+ Lier à la fin d’une tâche…')}
          {deps.length > 0 && (
            <div className="small muted">
              Le début prévu est calculé automatiquement{debutCalcule ? ` : ${fmt(debutCalcule)}` : ' dès que les tâches précédentes ont une fin prévue'} (la durée de la tâche est conservée). Le « + j » ajoute un délai après la fin.
            </div>
          )}
        </div>
        <div className="eyebrow">Planification (prévisionnel)</div>
        <div className="form-grid">
          {deps.length > 0 ? (
            <label className="f">
              Début prévu (calculé)
              <input type="date" value={sb.debutPrevu || ''} disabled />
            </label>
          ) : (
            date('debutPrevu', 'Début prévu')
          )}
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
          {obs.length === 0 && <div className="muted small">Aucune observation sur cette tâche.</div>}
          <div className="list">
            {obs.map((o) => (
              <a key={o.id} className="item" href={href(`/p/${p.id}/obs/${o.id}`)}>
                <span className={'pchip ' + o.statut}>{nomPastille(p, o)}</span>
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
