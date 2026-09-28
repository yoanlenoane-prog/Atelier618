import { useRef, useState } from 'react';
import type { DocumentFile, Dossier, Project } from '../types';
import { useStore } from '../store';
import { href, navigate } from '../router';
import { uid } from '../lib/ids';
import { fmt, today } from '../lib/dates';
import { getBlob, humanSize, storeLocal } from '../lib/files';
import { driveLink, folderLink } from '../lib/drive';
import { DOSSIER_CR, cheminDossier, compteDossier, dossierDe, isImage } from '../lib/dossiers';
import { Empty, Modal, toast } from '../components/ui';
import { FileImage } from '../components/FileImage';
import { PhotoAnnotator } from '../components/PhotoAnnotator';
import { appliquerAnnotation } from '../components/ObservationEditor';
import { IconCloud, IconDocs, IconEdit, IconExternal, IconMove, IconPlus, IconTrash } from '../components/Icons';

async function openDoc(d: DocumentFile) {
  const blob = await getBlob(d.file);
  if (blob) {
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } else if (d.file.driveId) window.open(driveLink(d.file.driveId), '_blank');
  else toast('Fichier indisponible sur cet appareil');
}

/** Tous les dossiers, avec leur chemin complet (pour « Déplacer vers… »). */
function tousLesDossiers(p: Project): { id?: string; label: string }[] {
  const out: { id?: string; label: string }[] = [{ id: undefined, label: 'Documents (racine)' }, { id: DOSSIER_CR, label: 'Comptes rendus' }];
  for (const d of p.dossiers || []) out.push({ id: d.id, label: cheminDossier(p, d.id).map((x) => x.nom).join(' / ') });
  return out.sort((a, b) => (a.id === undefined ? -1 : b.id === undefined ? 1 : a.label.localeCompare(b.label, 'fr')));
}

export function Documents({ p, dossierId }: { p: Project; dossierId?: string }) {
  const store = useStore();
  const input = useRef<HTMLInputElement>(null);
  const [deplacer, setDeplacer] = useState<DocumentFile | null>(null);
  const [annote, setAnnote] = useState<DocumentFile | null>(null);

  const dossiers = p.dossiers || [];
  const courant = dossierId === DOSSIER_CR ? undefined : dossiers.find((d) => d.id === dossierId);
  const cur = dossierId === DOSSIER_CR || courant ? dossierId : undefined;
  const chemin = cheminDossier(p, courant?.id);
  const lien = (id?: string) => href(`/p/${p.id}/docs${id ? '/' + id : ''}`);

  const sousDossiers = (cur === DOSSIER_CR ? [] : dossiers.filter((d) => d.parentId === cur)).sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
  const ici = p.documents
    .filter((d) => dossierDe(d) === cur)
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.updatedAt - a.updatedAt));
  const photos = ici.filter(isImage);
  const fichiers = ici.filter((d) => !isImage(d));
  // Photos rangées par date
  const photosParDate: [string, DocumentFile[]][] = [];
  for (const d of photos) {
    const g = photosParDate.find(([date]) => date === d.date);
    if (g) g[1].push(d);
    else photosParDate.push([d.date, [d]]);
  }

  const driveFolder = p.drive && (cur === DOSSIER_CR ? p.drive.cr : courant ? courant.driveId : p.drive.documents);

  const add = async (files: File[]) => {
    for (const f of files) {
      const ref = await storeLocal(f, f.name);
      await store.update(p.id, (d) => {
        d.documents.push({ id: uid('d'), nom: f.name, file: ref, date: today(), dossierId: cur, updatedAt: Date.now() });
      });
    }
    toast(`${files.length} fichier(s) ajouté(s)`);
  };
  const remove = (d: DocumentFile) =>
    window.confirm(`Retirer « ${d.nom} » de l’application ?\n(Le fichier reste dans Google Drive.)`) &&
    store.update(p.id, (x) => { x.documents = x.documents.filter((y) => y.id !== d.id); });

  const nouveauDossier = async () => {
    const nom = window.prompt('Nom du nouveau dossier :')?.trim();
    if (!nom) return;
    if (sousDossiers.some((d) => d.nom.toLowerCase() === nom.toLowerCase())) return toast('Un dossier porte déjà ce nom ici');
    await store.update(p.id, (x) => {
      x.dossiers = [...(x.dossiers || []), { id: uid('k'), nom, parentId: cur, updatedAt: Date.now() }];
    });
  };
  const renommer = async (d: Dossier) => {
    const nom = window.prompt('Nouveau nom du dossier :', d.nom)?.trim();
    if (!nom || nom === d.nom) return;
    await store.update(p.id, (x) => { const y = x.dossiers?.find((z) => z.id === d.id); if (y) y.nom = nom; });
  };
  const supprimer = async (d: Dossier) => {
    const n = compteDossier(p, d.id);
    const msg = n
      ? `Supprimer le dossier « ${d.nom} » ?\nSes ${n} document(s) et ses sous-dossiers seront remontés d’un niveau (rien n’est effacé).`
      : `Supprimer le dossier vide « ${d.nom} » ?`;
    if (!window.confirm(msg)) return;
    await store.update(p.id, (x) => {
      for (const doc of x.documents) if (doc.dossierId === d.id) doc.dossierId = d.parentId;
      x.dossiers = (x.dossiers || []).filter((y) => y.id !== d.id).map((y) => (y.parentId === d.id ? { ...y, parentId: d.parentId } : y));
      if (d.driveId && x.drive) x.drive.dossiersSupprimes = [...(x.drive.dossiersSupprimes || []), d.driveId];
    });
  };

  const tuile = (id: string, nom: string, n: number, d?: Dossier) => (
    <div key={id} className="folder">
      <a className="folder-link" href={lien(id)}>
        <IconDocs width={22} height={22} />
        <span className="grow" style={{ fontWeight: 500, wordBreak: 'break-word' }}>{nom}</span>
        <span className="tiny muted">{n}</span>
      </a>
      {d && (
        <div className="row" style={{ gap: 2 }}>
          <button className="btn ghost sm icon" aria-label="Renommer" onClick={() => renommer(d)}><IconEdit /></button>
          <button className="btn ghost sm icon" aria-label="Supprimer le dossier" onClick={() => supprimer(d)}><IconTrash /></button>
        </div>
      )}
    </div>
  );

  return (
    <div className="stack lg">
      <div className="section-title">
        <div>
          <h2>Documents</h2>
          <div className="small muted">Créez vos dossiers : ils sont recréés à l’identique, avec leurs fichiers, dans le dossier « Documents » du projet sur Google Drive.</div>
        </div>
        <div className="row wrap">
          {driveFolder && (
            <a className="btn ghost" href={folderLink(driveFolder)} target="_blank" rel="noreferrer">
              <IconExternal /> Ouvrir dans Drive
            </a>
          )}
          {cur !== DOSSIER_CR && <button className="btn ghost" onClick={nouveauDossier}><IconPlus /> Nouveau dossier</button>}
          <button className="btn" onClick={() => input.current?.click()}><IconPlus /> Ajouter des fichiers</button>
          <input ref={input} type="file" multiple hidden onChange={(e) => { const f = Array.from(e.target.files || []); e.target.value = ''; if (f.length) add(f); }} />
        </div>
      </div>

      <nav className="crumbs small">
        <a href={lien()}>Documents</a>
        {cur === DOSSIER_CR && <><span>›</span><span>Comptes rendus</span></>}
        {chemin.map((d, i) => (
          <span key={d.id} className="row" style={{ gap: 6, display: 'inline-flex' }}>
            <span>›</span>
            {i === chemin.length - 1 ? <span>{d.nom}</span> : <a href={lien(d.id)}>{d.nom}</a>}
          </span>
        ))}
      </nav>

      {(sousDossiers.length > 0 || !cur) && (
        <div className="grid c3">
          {!cur && tuile(DOSSIER_CR, 'Comptes rendus', p.documents.filter((d) => dossierDe(d) === DOSSIER_CR).length)}
          {sousDossiers.map((d) => tuile(d.id, d.nom, compteDossier(p, d.id), d))}
        </div>
      )}

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
                      <div className="doc-thumb-actions">
                        <button className="btn sand sm icon" aria-label="Annoter" title="Annoter" onClick={() => setAnnote(d)}><IconEdit /></button>
                        <button className="btn sand sm icon" aria-label="Déplacer" title="Déplacer" onClick={() => setDeplacer(d)}><IconMove /></button>
                        <button className="btn danger sm icon" aria-label="Retirer" title="Retirer" onClick={() => remove(d)}><IconTrash /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {fichiers.length > 0 && (
        <div className="card" style={{ padding: '4px 16px' }}>
          <div className="list">
            {fichiers.map((d) => (
              <div key={d.id} className="item">
                <button className="linkbtn grow" style={{ textAlign: 'left', textDecoration: 'none' }} onClick={() => openDoc(d)}>
                  <div style={{ fontWeight: 500, wordBreak: 'break-word' }}>{d.nom}</div>
                  <div className="tiny muted">{fmt(d.date)} {d.file.size ? `· ${humanSize(d.file.size)}` : ''}</div>
                </button>
                <span title={d.file.driveId ? 'Enregistré dans Drive' : 'En attente d’envoi vers Drive'} style={{ color: d.file.driveId ? 'var(--early)' : 'var(--muted)' }}>
                  <IconCloud width={18} />
                </span>
                <button className="btn ghost sm icon" aria-label="Déplacer" title="Déplacer" onClick={() => setDeplacer(d)}><IconMove /></button>
                <button className="btn danger sm icon" aria-label="Retirer" onClick={() => remove(d)}><IconTrash /></button>
              </div>
            ))}
          </div>
        </div>
      )}

      {ici.length === 0 && sousDossiers.length === 0 && (
        <Empty title={cur ? 'Dossier vide' : 'Aucun document'}>
          <p>Ajoutez devis, contrats, CR signés, notices, photos… {cur !== DOSSIER_CR && 'ou créez des dossiers pour les ranger.'}</p>
          {cur && <button className="btn ghost" onClick={() => navigate(`/p/${p.id}/docs${chemin.length > 1 ? '/' + chemin[chemin.length - 2].id : ''}`)}>Remonter</button>}
        </Empty>
      )}

      {deplacer && (
        <Modal title="Déplacer vers…" onClose={() => setDeplacer(null)}>
          <div className="small muted" style={{ marginBottom: 8, wordBreak: 'break-word' }}>{deplacer.nom}</div>
          <div className="list">
            {tousLesDossiers(p).map((c) => {
              const actuel = dossierDe(deplacer) === c.id;
              return (
                <button
                  key={c.id ?? 'racine'}
                  className="item linkbtn"
                  style={{ textAlign: 'left', textDecoration: 'none', width: '100%', opacity: actuel ? 0.5 : 1 }}
                  disabled={actuel}
                  onClick={async () => {
                    await store.update(p.id, (x) => {
                      const y = x.documents.find((z) => z.id === deplacer.id);
                      if (y) y.dossierId = c.id;
                    });
                    setDeplacer(null);
                    toast(`Déplacé dans « ${c.label} »`);
                  }}
                >
                  <IconDocs width={18} /> <span className="grow">{c.label}</span> {actuel && <span className="tiny muted">(actuel)</span>}
                </button>
              );
            })}
          </div>
        </Modal>
      )}

      {annote && (
        <PhotoAnnotator
          file={annote.original ?? annote.file}
          annotations={annote.annotations}
          onClose={() => setAnnote(null)}
          onSave={async (blob, annotations) => {
            const next = await appliquerAnnotation(annote, blob, annotations);
            await store.update(p.id, (x) => { x.documents = x.documents.map((y) => (y.id === next.id ? next : y)); });
            toast(blob ? 'Annotations enregistrées' : 'Photo d’origine rétablie');
          }}
        />
      )}
    </div>
  );
}
