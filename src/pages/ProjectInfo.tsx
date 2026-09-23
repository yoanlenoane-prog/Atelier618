import { useEffect, useState } from 'react';
import type { Project, ProjectInfo } from '../types';
import { useStore } from '../store';
import { navigate } from '../router';
import { PROJECT_STATUS } from '../lib/labels';
import { uid } from '../lib/ids';
import { folderLink } from '../lib/drive';
import { confirmAction, toast } from '../components/ui';
import { IconExternal, IconPlus, IconTrash } from '../components/Icons';

export function InfoFields({ info, onChange, compact }: { info: ProjectInfo; onChange: (i: ProjectInfo) => void; compact?: boolean }) {
  const set = <K extends keyof ProjectInfo>(k: K, v: ProjectInfo[K]) => onChange({ ...info, [k]: v });
  const txt = (k: keyof ProjectInfo, label: string, full = false) => (
    <label className={'f' + (full ? ' full' : '')}>
      {label}
      <input type="text" value={(info[k] as string) || ''} onChange={(e) => set(k, e.target.value as any)} />
    </label>
  );
  return (
    <div className="form-grid">
      <label className="f full">
        Nom du projet
        <input type="text" value={info.nom} autoFocus={compact} placeholder="ex. Maison Dupont" onChange={(e) => set('nom', e.target.value)} />
      </label>
      {txt('adresse', 'Adresse', true)}
      {txt('client', 'Client')}
      {txt('architecte', 'Architecte')}
      {txt('maitreOuvrage', 'Maître d’ouvrage')}
      {txt('maitreOeuvre', 'Maître d’œuvre')}
      <label className="f">
        Début du chantier
        <input type="date" value={info.dateDebut || ''} onChange={(e) => set('dateDebut', e.target.value || undefined)} />
      </label>
      <label className="f">
        Fin prévisionnelle
        <input type="date" value={info.dateFinPrevue || ''} onChange={(e) => set('dateFinPrevue', e.target.value || undefined)} />
      </label>
      <label className="f">
        Statut
        <select value={info.statut} onChange={(e) => set('statut', e.target.value as ProjectInfo['statut'])}>
          {PROJECT_STATUS.map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
      </label>
      <label className="f">
        N° de projet
        <input type="number" min={1} value={info.numero} onChange={(e) => set('numero', Math.max(1, Number(e.target.value) || 1))} />
      </label>
      {!compact && (
        <label className="f full">
          Description
          <textarea value={info.description} onChange={(e) => set('description', e.target.value)} />
        </label>
      )}
    </div>
  );
}

export function ProjectInfoPage({ p }: { p: Project }) {
  const store = useStore();
  const [info, setInfo] = useState(p.info);
  useEffect(() => setInfo(p.info), [p.info]);
  const dirty = JSON.stringify(info) !== JSON.stringify(p.info);

  const save = async () => {
    await store.update(p.id, (d) => {
      d.info = info;
    });
    toast('Informations enregistrées');
  };

  const ent = info.entreprises;
  const setEnt = (list: ProjectInfo['entreprises']) => setInfo({ ...info, entreprises: list });

  return (
    <div className="stack lg">
      <div className="card">
        <h2>Informations générales</h2>
        <InfoFields info={info} onChange={setInfo} />
      </div>

      <div className="card">
        <div className="row between">
          <h2>Entreprises</h2>
          <button className="btn ghost sm" onClick={() => setEnt([...ent, { id: uid('e'), nom: '' }])}>
            <IconPlus /> Ajouter
          </button>
        </div>
        {ent.length === 0 && <p className="muted small">Aucune entreprise. Ajoutez les entreprises intervenant sur le chantier.</p>}
        <div className="stack">
          {ent.map((e, i) => (
            <div key={e.id} className="row wrap" style={{ alignItems: 'flex-end' }}>
              <label className="f grow" style={{ minWidth: 160 }}>
                Entreprise
                <input type="text" value={e.nom} onChange={(ev) => setEnt(ent.map((x, j) => (j === i ? { ...x, nom: ev.target.value } : x)))} />
              </label>
              <label className="f grow" style={{ minWidth: 140 }}>
                Lot
                <input type="text" value={e.lot || ''} onChange={(ev) => setEnt(ent.map((x, j) => (j === i ? { ...x, lot: ev.target.value } : x)))} />
              </label>
              <label className="f grow" style={{ minWidth: 140 }}>
                Contact
                <input type="text" value={e.contact || ''} onChange={(ev) => setEnt(ent.map((x, j) => (j === i ? { ...x, contact: ev.target.value } : x)))} />
              </label>
              <button className="btn danger sm icon" aria-label="Retirer" onClick={() => setEnt(ent.filter((_, j) => j !== i))}>
                <IconTrash />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="row wrap between">
        <button className="btn" disabled={!dirty} onClick={save}>Enregistrer</button>
        <div className="row wrap">
          {p.drive && (
            <a className="btn ghost" href={folderLink(p.drive.racine || p.drive.projet)} target="_blank" rel="noreferrer">
              <IconExternal /> Dossier Drive
            </a>
          )}
          <button
            className="btn danger"
            onClick={async () => {
              if (!confirmAction(`Supprimer le projet « ${p.info.nom} » ?\n\nSon dossier Google Drive sera placé dans la corbeille (récupérable 30 jours).`)) return;
              await store.remove(p.id);
              toast('Projet supprimé');
              navigate('/');
            }}
          >
            <IconTrash /> Supprimer le projet
          </button>
        </div>
      </div>
    </div>
  );
}
