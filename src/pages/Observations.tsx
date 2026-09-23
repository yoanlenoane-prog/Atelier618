import { useState } from 'react';
import type { Observation, ObsStatus, Project } from '../types';
import { useStore } from '../store';
import { href, navigate } from '../router';
import { pastilleLabel } from '../lib/ids';
import { fmt } from '../lib/dates';
import { OBS_STATUS, OBS_STATUS_LABEL } from '../lib/labels';
import { codeBloc, codeSousBloc, findSousBloc, isOpen } from '../lib/planning';
import { createObservation, BlocSelect } from '../components/ObservationEditor';
import { FileImage } from '../components/FileImage';
import { Empty, Seg } from '../components/ui';
import { IconPlan, IconPlus } from '../components/Icons';

function obsText(o: Observation) {
  return [o.titre, o.entreprise, o.actionDemandee, ...o.contenu.map((c) => (c.type === 'texte' ? c.texte : c.legende || ''))].join(' ').toLowerCase();
}

export function ObsRow({ p, o }: { p: Project; o: Observation }) {
  const firstPhoto = o.contenu.find((c) => c.type === 'photo');
  const nPhotos = o.contenu.filter((c) => c.type === 'photo').length;
  const sb = findSousBloc(p, o.sousBlocId);
  const bloc = p.blocs.find((b) => b.id === o.blocId);
  const plan = p.plans.find((x) => x.id === o.planId);
  return (
    <a className="item" href={href(`/p/${p.id}/obs/${o.id}`)}>
      <span className={'pchip ' + o.statut}>{pastilleLabel(o.numero)}</span>
      <div className="grow">
        <div style={{ fontWeight: 500 }}>{o.titre || <span className="muted">Sans titre</span>}</div>
        <div className="tiny muted">
          {sb ? `${codeSousBloc(p, sb.sb.id)} ${sb.sb.nom}` : bloc ? `${codeBloc(p, bloc.id)} ${bloc.nom}` : 'Non classé'}
          {' · '}
          {fmt(o.date)}
          {plan && ` · ${plan.nom}`}
          {nPhotos > 0 && ` · ${nPhotos} photo${nPhotos > 1 ? 's' : ''}`}
        </div>
      </div>
      <span className="tag line nowrap">{OBS_STATUS_LABEL[o.statut]}</span>
      {firstPhoto && firstPhoto.type === 'photo' && (
        <div style={{ width: 48, height: 48, borderRadius: 6, overflow: 'hidden', flex: 'none', background: 'var(--sand-soft)' }}>
          <FileImage file={firstPhoto.file} style={{ width: 48, height: 48, objectFit: 'cover' }} />
        </div>
      )}
    </a>
  );
}

export function Observations({ p, query }: { p: Project; query: URLSearchParams }) {
  const store = useStore();
  const [q, setQ] = useState('');
  const [statut, setStatut] = useState<'ouvertes' | 'toutes' | ObsStatus>((query.get('statut') as any) || 'toutes');
  const [bloc, setBloc] = useState<{ b?: string; s?: string }>({ s: query.get('sb') || undefined, b: query.get('bloc') || undefined });
  const [mode, setMode] = useState<'pastille' | 'bloc'>(() => (localStorage.getItem('obs.mode') as any) || 'pastille');

  let list = [...p.observations].sort((a, b) => b.numero - a.numero);
  if (statut === 'ouvertes') list = list.filter(isOpen);
  else if (statut !== 'toutes') list = list.filter((o) => o.statut === statut);
  if (bloc.s) list = list.filter((o) => o.sousBlocId === bloc.s);
  else if (bloc.b) list = list.filter((o) => o.blocId === bloc.b);
  if (q.trim()) {
    const t = q.trim().toLowerCase().replace(/^p-?0*/, '');
    list = list.filter((o) => obsText(o).includes(q.trim().toLowerCase()) || String(o.numero) === t);
  }

  const counts = Object.fromEntries(OBS_STATUS.map(([s]) => [s, p.observations.filter((o) => o.statut === s).length]));

  return (
    <div className="stack lg">
      <div className="section-title">
        <div>
          <h2>Observations</h2>
          <div className="small muted">
            {OBS_STATUS.map(([s, l]) => `${counts[s]} ${l.toLowerCase()}`).join(' · ')}
          </div>
        </div>
        <div className="row wrap">
          <a className="btn ghost" href={href(`/p/${p.id}/plans?placer=1`)}><IconPlan /> Sur un plan</a>
          <button
            className="btn"
            onClick={async () => {
              const id = await createObservation(store, p, { blocId: bloc.b, sousBlocId: bloc.s });
              navigate(`/p/${p.id}/obs/${id}`);
            }}
          >
            <IconPlus /> Observation
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: 14 }}>
        <div className="form-grid">
          <input type="search" placeholder="Rechercher (P-012, mot, entreprise…)" value={q} onChange={(e) => setQ(e.target.value)} />
          <select value={statut} onChange={(e) => setStatut(e.target.value as any)}>
            <option value="toutes">Tous les statuts</option>
            <option value="ouvertes">Ouvertes (à faire + en cours)</option>
            {OBS_STATUS.map(([s, l]) => <option key={s} value={s}>{l}</option>)}
          </select>
          <BlocSelect p={p} blocId={bloc.b} sousBlocId={bloc.s} onChange={(b, s) => setBloc({ b, s })} />
        </div>
        <div className="row between wrap" style={{ marginTop: 12 }}>
          <Seg value={mode} onChange={(m) => { setMode(m); localStorage.setItem('obs.mode', m); }} options={[['pastille', 'Par pastille'], ['bloc', 'Par bloc / sous-bloc']]} />
          <span className="small muted">{list.length} résultat{list.length > 1 ? 's' : ''}</span>
        </div>
      </div>

      {list.length === 0 ? (
        <Empty title="Aucune observation">
          <p>Placez une pastille sur un plan, ou créez une observation.</p>
        </Empty>
      ) : mode === 'pastille' ? (
        <div className="card" style={{ padding: '4px 16px' }}>
          <div className="list">{list.map((o) => <ObsRow key={o.id} p={p} o={o} />)}</div>
        </div>
      ) : (
        <GroupedByBloc p={p} list={list} />
      )}
    </div>
  );
}

/** Même données, présentées par bloc puis sous-bloc. */
export function GroupedByBloc({ p, list }: { p: Project; list: Observation[] }) {
  const sorted = [...list].sort((a, b) => a.numero - b.numero);
  const orphan = sorted.filter((o) => !p.blocs.some((b) => b.id === o.blocId));
  return (
    <div className="stack">
      {p.blocs.map((b, bi) => {
        const inBloc = sorted.filter((o) => o.blocId === b.id);
        if (!inBloc.length) return null;
        const direct = inBloc.filter((o) => !o.sousBlocId || !b.sousBlocs.some((s) => s.id === o.sousBlocId));
        return (
          <div className="card" key={b.id} style={{ padding: '14px 16px' }}>
            <h3 style={{ color: 'var(--ink)', fontSize: 14 }}>{String(bi + 1).padStart(2, '0')} — {b.nom}</h3>
            {direct.length > 0 && <div className="list">{direct.map((o) => <ObsRow key={o.id} p={p} o={o} />)}</div>}
            {b.sousBlocs.map((s, si) => {
              const os = inBloc.filter((o) => o.sousBlocId === s.id);
              if (!os.length) return null;
              return (
                <div key={s.id} style={{ marginTop: 8 }}>
                  <div className="eyebrow" style={{ paddingLeft: 4 }}>{String(bi + 1).padStart(2, '0')}.{String(si + 1).padStart(2, '0')} — {s.nom}</div>
                  <div className="list">{os.map((o) => <ObsRow key={o.id} p={p} o={o} />)}</div>
                </div>
              );
            })}
          </div>
        );
      })}
      {orphan.length > 0 && (
        <div className="card" style={{ padding: '14px 16px' }}>
          <h3>Non classées</h3>
          <div className="list">{orphan.map((o) => <ObsRow key={o.id} p={p} o={o} />)}</div>
        </div>
      )}
    </div>
  );
}
