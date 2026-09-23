import { useRef, useState } from 'react';
import type { DocumentFile, Project } from '../types';
import { useStore } from '../store';
import { uid } from '../lib/ids';
import { fmt, today } from '../lib/dates';
import { getBlob, humanSize, storeLocal } from '../lib/files';
import { driveLink, folderLink } from '../lib/drive';
import { Empty, toast } from '../components/ui';
import { IconCloud, IconExternal, IconPlus, IconTrash } from '../components/Icons';

const CATEGORIES = ['Document', 'Compte rendu', 'Devis', 'Contrat', 'Planning', 'Photo', 'Autre'];

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
  const docs = [...p.documents].sort((a, b) => (a.date < b.date ? 1 : -1)).filter((d) => !filter || d.categorie === filter);

  const add = async (files: File[]) => {
    for (const f of files) {
      const ref = await storeLocal(f, f.name);
      await store.update(p.id, (d) => {
        d.documents.push({ id: uid('d'), nom: f.name, file: ref, date: today(), categorie: cat, updatedAt: Date.now() });
      });
    }
    toast(`${files.length} document(s) ajouté(s)`);
  };

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
        {CATEGORIES.filter((c) => p.documents.some((d) => d.categorie === c)).map((c) => (
          <button key={c} className={'btn sm ' + (filter === c ? '' : 'ghost')} onClick={() => setFilter(c)}>{c}</button>
        ))}
      </div>

      {docs.length === 0 ? (
        <Empty title="Aucun document"><p>Ajoutez devis, contrats, CR signés, notices…</p></Empty>
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
                <button
                  className="btn danger sm icon"
                  aria-label="Retirer"
                  onClick={() => window.confirm(`Retirer « ${d.nom} » de l’application ?\n(Le fichier reste dans Google Drive.)`) && store.update(p.id, (x) => { x.documents = x.documents.filter((y) => y.id !== d.id); })}
                >
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
