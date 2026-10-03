import { useEffect, useRef, useState } from 'react';
import type { Project, ProjectInfo } from '../types';
import { useStore } from '../store';
import { navigate } from '../router';
import { PROJECT_STATUS } from '../lib/labels';
import { uid } from '../lib/ids';
import { folderLink } from '../lib/drive';
import { toast } from '../components/ui';
import { FileImage } from '../components/FileImage';
import { ContactsEditor } from '../components/Contacts';
import { compressPhoto, storeLocal } from '../lib/files';
import { IconExternal, IconPlus, IconTrash } from '../components/Icons';

/** Supprime un projet après confirmation (son dossier Drive va dans la corbeille Google). */
export async function supprimerProjet(store: ReturnType<typeof useStore>, p: Project): Promise<boolean> {
  const nom = p.info.nom || 'Sans nom';
  if (!window.confirm(`Supprimer définitivement le projet « ${nom} » ?\n\nIl disparaîtra de l’application sur tous vos appareils. Son dossier Google Drive sera placé dans la corbeille (récupérable pendant 30 jours).`)) return false;
  await store.remove(p.id);
  toast(`Projet « ${nom} » supprimé`);
  return true;
}

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
  // Une modification arrivée d'ailleurs (synchronisation Drive…) ne doit pas effacer une saisie en cours :
  // on ne reprend la version enregistrée que si le formulaire n'a pas été modifié.
  const base = useRef(p.info);
  useEffect(() => {
    setInfo((cur) => (JSON.stringify(cur) === JSON.stringify(base.current) ? p.info : cur));
    base.current = p.info;
  }, [p.info]);
  // L'image du projet est enregistrée immédiatement (sans attendre « Enregistrer »)
  const setImage = async (image: ProjectInfo['image']) => {
    setInfo((cur) => ({ ...cur, image }));
    await store.update(p.id, (d) => { d.info.image = image; });
    toast(image ? 'Image du projet enregistrée' : 'Image du projet retirée');
  };
  const dirty = JSON.stringify(info) !== JSON.stringify(p.info);

  const save = async () => {
    await store.update(p.id, (d) => {
      d.info = info;
    });
    toast('Informations enregistrées');
  };

  const imgInput = useRef<HTMLInputElement>(null);
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
                Corps d’état
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

      <div className="card">
        <h2>Personnes &amp; contacts</h2>
        <p className="small muted" style={{ marginTop: -4 }}>
          Annuaire du projet : ces personnes peuvent être cochées comme présentes et convoquées dans les comptes rendus.
        </p>
        <ContactsEditor p={p} contacts={info.contacts || []} onChange={(contacts) => setInfo({ ...info, contacts })} />
      </div>

      <div className="card">
        <h2>Image du projet</h2>
        <p className="small muted" style={{ marginTop: -4 }}>Perspective ou photo, affichée en haut à droite des comptes rendus.</p>
        <div className="row wrap" style={{ alignItems: 'flex-start' }}>
          {info.image && (
            <div className="proj-image">
              <FileImage file={info.image} alt="Image du projet" />
            </div>
          )}
          <div className="row wrap">
            <button className="btn ghost sm" onClick={() => imgInput.current?.click()}>
              <IconPlus /> {info.image ? 'Changer l’image' : 'Choisir une image'}
            </button>
            {info.image && (
              <button className="btn danger sm" onClick={() => setImage(undefined)}>
                <IconTrash /> Retirer
              </button>
            )}
            <input
              ref={imgInput}
              type="file"
              accept="image/*"
              hidden
              onChange={async (e) => {
                const f = e.target.files?.[0];
                e.target.value = '';
                if (!f) return;
                const ref = await storeLocal(await compressPhoto(f), `Image du projet.jpg`);
                await setImage(ref);
              }}
            />
          </div>
        </div>
      </div>

      <div className="row wrap between save-bar">
        <button className="btn" disabled={!dirty} onClick={save}>{dirty ? 'Enregistrer les modifications' : 'Enregistré'}</button>
        <div className="row wrap">
          {p.drive && (
            <a className="btn ghost" href={folderLink(p.drive.racine || p.drive.projet)} target="_blank" rel="noreferrer">
              <IconExternal /> Dossier Drive
            </a>
          )}
          <button
            className="btn danger"
            onClick={async () => {
              if (await supprimerProjet(store, p)) navigate('/');
            }}
          >
            <IconTrash /> Supprimer le projet
          </button>
        </div>
      </div>
    </div>
  );
}
