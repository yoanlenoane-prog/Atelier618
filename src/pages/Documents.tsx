import { useRef, useState } from 'react';
import type { DocumentFile, Project } from '../types';
import { useStore } from '../store';
import { uid } from '../lib/ids';
import { fmt, today } from '../lib/dates';
import { getBlob, humanSize, storeLocal } from '../lib/files';
import { driveLink, folderLink } from '../lib/drive';
import { Empty, toast } from '../components/ui';
import { FileImage } from '../components/FileImage';
import { IconCloud, IconExternal, IconPlus, IconTrash } from '../components/Icons';

const CATEGORIES = ['Document', 'Compte rendu', 'Devis', 'Contrat', 'Planning', 'Photo', 'Autre'];

/** Toute image est rangée avec les photos, quelle que soit la catégorie choisie. */
const isPhoto = (d: DocumentFile) => d.categorie === 'Photo' || (d.file.mime || '').startsWith('image/');

async function openDoc(d: DocumentFile) {
  const blob = await getBlob(d.file);
  if (blob) {
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } else if (d.file.driveId) window.open(driveLink(d.file.driveId), '_blank');
  else toast('Fichier indisponible sur cet appareil');
}

export function Documents({ p }: { p: Project }) {
  const store = useStore();
  const input = useRef<HTMLInputElement>(null);
  const [cat, setCat] = useState('Document');
  const [filter, setFilter] = useState('');
  const all = [...p.documents].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.updatedAt - a.updatedAt));
  const photos = all.filter((d) => isPhoto(d) && (!filter || filter === 'Photo'));
  const docs = all.filter((d) => !isPhoto(d) && (!filter || d.categorie === filter));
  // Photos rangées par date
  const photosParDate: [string, DocumentFile[]][] = [];
  for (const d of photos) {
    const g = photosParDate.find(([date]) => date === d.date);
    if (g) g[1].push(d);
    else photosParDate.push([d.date, [d]]);
  }

  const add = async (files: File[]) => {
    for (const f of files) {
      const ref = await storeLocal(f, f.name);
      // Les images sont automatiquement rangées avec les photos
      const categorie = ref.mime.startsWith('image/') ? 'Photo' : cat;
      await store.update(p.id, (d) => {
        d.documents.push({ id: uid('d'), nom: f.name, file: ref, date: today(), categorie, updatedAt: Date.now() });
      });
    }
    toast(`${files.length} document(s) ajouté(s)`);
  };
  const remove = (d: DocumentFile) =>
    window.confirm(`Retirer « ${d.nom} » de l’application ?\n(Le fichier reste dans Google Drive.)`) &&
    store.update(p.id, (x) => { x.documents = x.documents.filter((y) => y.id !== d.id); });

  return (
    <div className="stack lg">
      <div className="section-title">
        <div>
          <h2>Documents</h2>
          <div className="small muted">Les fichiers sont enregistrés dans les dossiers « Documents » et « Comptes rendus » du projet sur Google Drive.</div>
        </div>
        <div className="row wrap">
          {p.drive && (
            <a className="btn ghost" href={folderLink(p.drive.racine || p.drive.documents)} target="_blank" rel="noreferrer">
              <IconExternal /> Ouvrir dans Drive
            </a>
          )}
          <select value={cat} onChange={(e) => setCat(e.target.value)} style={{ width: 'auto' }}>
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
          <button className="btn" onClick={() => input.current?.click()}><IconPlus /> Ajouter</button>
          <input ref={input} type="file" multiple hidden onChange={(e) => { const f = Array.from(e.target.files || []); e.target.value = ''; if (f.length) add(f); }} />
        </div>
      </div>

      <div className="row wrap">
        <button className={'btn sm ' + (filter ? 'ghost' : '')} onClick={() => setFilter('')}>Tous</button>
        {CATEGORIES.filter((c) => p.documents.some((d) => (c === 'Photo' ? isPhoto(d) : !isPhoto(d) && d.categorie === c))).map((c) => (
          <button key={c} className={'btn sm ' + (filter === c ? '' : 'ghost')} onClick={() => setFilter(c)}>{c}</button>
        ))}
      </div>

      {photos.length > 0 && (
        <div className="card">
          <h2>Photos ({photos.length})</h2>
          <div className="stack">
            {photosParDate.map(([date, list]) => (
              <div key={date} className="stack" style={{ gap: 6 }}>
                <div className="tiny muted">{fmt(date)}</div>
                <div className="thumbs doc-thumbs">
                  {list.map((d) => (
                    <div key={d.id} className="doc-thumb">
                      <button className="thumb" title={d.nom} onClick={() => openDoc(d)}>
                        <FileImage file={d.file} alt={d.nom} loading="lazy" />
                      </button>
                      <button className="btn danger sm icon doc-thumb-del" aria-label="Retirer" onClick={() => remove(d)}>
                        <IconTrash />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {docs.length === 0 ? (
        photos.length === 0 && <Empty title="Aucun document"><p>Ajoutez devis, contrats, CR signés, notices, photos…</p></Empty>
      ) : (
        <div className="card" style={{ padding: '4px 16px' }}>
          <div className="list">
            {docs.map((d) => (
              <div key={d.id} className="item">
                <button className="linkbtn grow" style={{ textAlign: 'left', textDecoration: 'none' }} onClick={() => openDoc(d)}>
                  <div style={{ fontWeight: 500, wordBreak: 'break-word' }}>{d.nom}</div>
                  <div className="tiny muted">{d.categorie} · {fmt(d.date)} {d.file.size ? `· ${humanSize(d.file.size)}` : ''}</div>
                </button>
                <span title={d.file.driveId ? 'Enregistré dans Drive' : 'En attente d’envoi vers Drive'} style={{ color: d.file.driveId ? 'var(--early)' : 'var(--muted)' }}>
                  <IconCloud width={18} />
                </span>
                <button className="btn danger sm icon" aria-label="Retirer" onClick={() => remove(d)}>
                  <IconTrash />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
