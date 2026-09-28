/**
 * Synchronisation données locales ⇄ Google Drive.
 *
 *   ChantierApp/
 *     01 - Maison Dupont/
 *       Projet/projet.json      ← toutes les données de l'application
 *       Plans/                  ← plans importés
 *       Photos/P-012/…          ← photos rangées par pastille
 *       Documents/<dossiers créés dans l'application>/…
 *       Comptes rendus/
 */
import type { DocumentFile, FileRef, Project } from '../types';
import * as drive from './drive';
import { getBlob } from './files';
import { idbGet, idbSet } from './idb';
import { pastilleLabel } from './ids';
import { DOSSIER_CR, dossierDe } from './dossiers';
import { contentSignature, mergeProjects } from './merge';

const ROOT_KEY = 'atelier618.rootFolder';

interface SyncMeta {
  jsonId?: string;
  /** Signature du contenu tel qu'il est sur Drive après la dernière synchro. */
  sig?: string;
  modifiedTime?: string;
  folderName?: string;
}

export interface SyncHost {
  get(id: string): Project | undefined;
  /** Modifie la version locale la plus récente. */
  patch(id: string, fn: (p: Project) => void): Promise<Project>;
  /** Fusionne une version distante dans la version locale. */
  absorb(remote: Project): Promise<Project>;
  remove(id: string): Promise<void>;
  deletedProjects(): Promise<Record<string, string | undefined>>;
  clearDeleted(id: string): Promise<void>;
  onProgress(msg: string): void;
}

async function rootFolder(): Promise<string> {
  const cached = localStorage.getItem(ROOT_KEY);
  if (cached) {
    const f = await drive.getFile(cached);
    if (f && !f.trashed) return cached;
  }
  const id = await drive.ensureFolder(drive.ROOT_NAME);
  localStorage.setItem(ROOT_KEY, id);
  return id;
}

export function folderName(p: Project): string {
  const nom = p.info.nom.replace(/[\\/:*?"<>|]/g, '-').trim() || 'Sans nom';
  return `${String(p.info.numero).padStart(2, '0')} - ${nom}`;
}

async function meta(id: string): Promise<SyncMeta> {
  return (await idbGet<SyncMeta>('meta', 'sync:' + id)) || {};
}
async function setMeta(id: string, m: SyncMeta) {
  await idbSet('meta', 'sync:' + id, m);
}

export async function isDirty(p: Project): Promise<boolean> {
  return (await meta(p.id)).sig !== contentSignature(p);
}

interface RefCtx {
  ref: FileRef;
  kind: 'plan' | 'photo' | 'document';
  numero?: number;
  doc?: DocumentFile;
}

function forEachRef(p: Project, cb: (c: RefCtx) => void) {
  for (const pl of p.plans) {
    cb({ ref: pl.image, kind: 'plan' });
    if (pl.source) cb({ ref: pl.source, kind: 'plan' });
  }
  for (const o of p.observations)
    for (const c of o.contenu)
      if (c.type === 'photo') {
        cb({ ref: c.file, kind: 'photo', numero: o.numero });
        if (c.original) cb({ ref: c.original, kind: 'photo', numero: o.numero });
      }
  for (const d of p.documents) {
    cb({ ref: d.file, kind: 'document', doc: d });
    if (d.original) cb({ ref: d.original, kind: 'document', doc: d });
  }
}

/** Crée / renomme dans Drive les dossiers de documents, et met à la corbeille ceux supprimés. */
async function syncDossiers(host: SyncHost, p: Project): Promise<Project> {
  const todo = [...(p.dossiers || [])];
  // Les parents d'abord
  const depth = (id?: string, n = 0): number => {
    const d = id && todo.find((x) => x.id === id);
    return d && n < 20 ? depth(d.parentId, n + 1) : n;
  };
  todo.sort((a, b) => depth(a.parentId) - depth(b.parentId));
  for (const d0 of todo) {
    const cur = host.get(p.id)!;
    const d = cur.dossiers?.find((x) => x.id === d0.id);
    if (!d) continue;
    const parentDossier = d.parentId ? cur.dossiers?.find((x) => x.id === d.parentId) : undefined;
    const parent = parentDossier ? parentDossier.driveId : cur.drive!.documents;
    if (!parent) continue;
    const nom = d.nom.replace(/[\\/]/g, '-').trim() || 'Sans nom';
    if (d.driveId) {
      const f = await drive.getFile(d.driveId);
      if (f && !f.trashed) {
        // Dossier remonté d'un niveau (son parent a été supprimé dans l'application)
        const ancien = f.parents?.[0];
        if (ancien && ancien !== parent) {
          host.onProgress('Rangement des dossiers…');
          await drive.moveFile(d.driveId, parent, ancien);
        }
        if (d.driveNom !== nom) {
          host.onProgress('Renommage d’un dossier…');
          await drive.updateMeta(d.driveId, { name: nom });
          await host.patch(p.id, (x) => { const y = x.dossiers?.find((z) => z.id === d.id); if (y) y.driveNom = nom; });
        }
        continue;
      }
    }
    host.onProgress('Création des dossiers…');
    const id = await drive.ensureFolder(nom, parent);
    await host.patch(p.id, (x) => {
      const y = x.dossiers?.find((z) => z.id === d.id);
      if (y) Object.assign(y, { driveId: id, driveNom: nom });
    });
  }
  return host.get(p.id)!;
}

/** Dossier Drive attendu pour un document, selon son dossier dans l'application. */
function parentDocument(p: Project, d: DocumentFile): string | undefined {
  const f = p.drive!;
  const dossier = dossierDe(d);
  if (dossier === DOSSIER_CR) return f.cr;
  if (!dossier) return f.documents;
  return p.dossiers?.find((x) => x.id === dossier)?.driveId;
}

/** Range dans Drive les documents déplacés d'un dossier à l'autre dans l'application. */
async function moveDocuments(host: SyncHost, p: Project): Promise<Project> {
  for (const d0 of p.documents) {
    const cur = host.get(p.id)!;
    const d = cur.documents.find((x) => x.id === d0.id);
    if (!d) continue;
    const to = parentDocument(cur, d);
    if (!to) continue;
    for (const ref of [d.file, d.original]) {
      if (!ref?.driveId) continue;
      // Fichiers envoyés avant les dossiers : ils sont dans « Documents » ou « Comptes rendus »
      const from = ref.driveParent ?? (d.categorie === 'Compte rendu' ? cur.drive!.cr : cur.drive!.documents);
      if (from === to) {
        if (!ref.driveParent) await host.patch(p.id, (x) => setDriveParent(x, ref.driveId!, to));
        continue;
      }
      host.onProgress('Rangement des documents…');
      await drive.moveFile(ref.driveId, to, from);
      await host.patch(p.id, (x) => setDriveParent(x, ref.driveId!, to));
    }
  }
  // Dossiers supprimés : leur contenu a été déplacé ci-dessus, on les met à la corbeille
  const cur = host.get(p.id)!;
  for (const id of cur.drive?.dossiersSupprimes || []) {
    const f = await drive.getFile(id);
    if (f && !f.trashed) {
      const reste = await drive.listFiles(`'${id}' in parents and trashed=false`);
      if (reste.length === 0) await drive.trash(id);
    }
  }
  if (cur.drive?.dossiersSupprimes?.length) await host.patch(p.id, (x) => { x.drive!.dossiersSupprimes = []; });
  return host.get(p.id)!;
}

function setDriveParent(p: Project, driveId: string, parent: string) {
  for (const d of p.documents) for (const ref of [d.file, d.original]) if (ref?.driveId === driveId) ref.driveParent = parent;
}

async function ensureProjectFolders(host: SyncHost, p: Project, root: string): Promise<Project> {
  const m = await meta(p.id);
  if (p.drive) {
    const f = await drive.getFile(p.drive.projet);
    // p.drive.projet est l'id du sous-dossier « Projet » ; on retrouve le dossier parent
    const parent = f?.parents?.[0];
    const name = folderName(p);
    if (parent && m.folderName !== name) {
      await drive.updateMeta(parent, { name });
      await setMeta(p.id, { ...m, folderName: name });
    }
    if (f && !f.trashed) return p;
  }
  host.onProgress('Création des dossiers Drive…');
  const name = folderName(p);
  const existing = (await drive.listFiles(`'${root}' in parents and mimeType='${drive.FOLDER}' and trashed=false`)).find(
    (f) => f.appProperties?.chantierProjectId === p.id
  );
  const folder = existing ?? (await drive.createFolder(name, root, { chantierProjectId: p.id }));
  const [projet, plans, photos, documents, cr] = await Promise.all(
    ['Projet', 'Plans', 'Photos', 'Documents', 'Comptes rendus'].map((n) => drive.ensureFolder(n, folder.id))
  );
  await setMeta(p.id, { ...m, folderName: name });
  return host.patch(p.id, (d) => {
    d.drive = { racine: folder.id, projet, plans, photos, documents, cr, photosPastilles: {} };
  });
}

async function uploadPending(host: SyncHost, p: Project): Promise<Project> {
  const pending: RefCtx[] = [];
  forEachRef(p, (c) => {
    if (c.ref.localId && !c.ref.driveId) pending.push(c);
  });
  let i = 0;
  for (const c of pending) {
    i++;
    host.onProgress(`Envoi des fichiers ${i}/${pending.length}…`);
    const blob = await getBlob(c.ref);
    if (!blob) continue;
    const cur = host.get(p.id)!;
    const f = cur.drive!;
    let parent = f.documents;
    if (c.kind === 'plan') parent = f.plans;
    if (c.kind === 'document' && c.doc) parent = parentDocument(cur, c.doc) ?? f.documents;
    if (c.kind === 'photo') {
      const key = pastilleLabel(c.numero ?? 0);
      parent = f.photosPastilles?.[key] ?? (await drive.ensureFolder(key, f.photos));
      if (!f.photosPastilles?.[key])
        await host.patch(p.id, (d) => {
          d.drive!.photosPastilles = { ...(d.drive!.photosPastilles || {}), [key]: parent };
        });
    }
    const up = await drive.uploadFile(blob, { name: c.ref.name, parents: [parent], mimeType: c.ref.mime });
    await idbSet('blobs', 'd:' + up.id, blob);
    await host.patch(p.id, (d) =>
      forEachRef(d, (x) => {
        if (x.ref.localId === c.ref.localId) {
          x.ref.driveId = up.id;
          if (x.kind === 'document') x.ref.driveParent = parent;
        }
      })
    );
  }
  return host.get(p.id)!;
}

async function syncOne(host: SyncHost, id: string, root: string, remoteJson?: drive.DriveFile) {
  let p = host.get(id)!;
  p = await ensureProjectFolders(host, p, root);
  p = await syncDossiers(host, p);
  p = await uploadPending(host, p);
  p = await moveDocuments(host, p);

  const m = await meta(id);
  const jsonFile = remoteJson ?? (m.jsonId ? (await drive.getFile(m.jsonId)) ?? undefined : undefined);
  let remoteSig: string | undefined = m.sig;
  if (jsonFile && jsonFile.modifiedTime !== m.modifiedTime) {
    host.onProgress('Récupération des modifications…');
    const remote = await drive.downloadJSON<Project>(jsonFile.id);
    remoteSig = contentSignature(remote);
    p = await host.absorb(remote);
  }
  const sig = contentSignature(p);
  let saved = jsonFile;
  if (!jsonFile || sig !== remoteSig) {
    host.onProgress('Enregistrement dans Drive…');
    const blob = new Blob([JSON.stringify(p, null, 1)], { type: 'application/json' });
    saved = jsonFile
      ? await drive.updateFileContent(jsonFile.id, blob)
      : await drive.uploadFile(blob, { name: 'projet.json', parents: [p.drive!.projet], appProperties: { chantierProjectId: id } });
  }
  await setMeta(id, { ...(await meta(id)), jsonId: saved!.id, sig, modifiedTime: saved!.modifiedTime });
}

/** Synchronise tous les projets (envoi des modifications locales, réception des modifications distantes). */
export async function syncAll(host: SyncHost, localIds: string[]): Promise<void> {
  host.onProgress('Connexion à Google Drive…');
  const root = await rootFolder();

  // 1. Suppressions faites hors ligne → corbeille Drive
  const deleted = await host.deletedProjects();
  for (const [id, folderId] of Object.entries(deleted)) {
    if (folderId) {
      const f = await drive.getFile(folderId);
      if (f?.parents?.[0] && !f.trashed) await drive.trash(f.parents[0]);
    }
    await host.clearDeleted(id);
  }

  // 2. Inventaire des projets présents dans Drive
  const remotes = await drive.listFiles(`name='projet.json' and trashed=false`);
  const byId = new Map<string, drive.DriveFile>();
  for (const r of remotes) if (r.appProperties?.chantierProjectId) byId.set(r.appProperties.chantierProjectId, r);

  // 3. Projets locaux
  for (const id of localIds) {
    if (id in deleted) continue;
    const m = await meta(id);
    if (m.jsonId && !byId.has(id)) {
      // Déjà synchronisé mais absent de Drive → supprimé depuis un autre appareil ?
      const f = await drive.getFile(m.jsonId);
      if (!f || f.trashed) {
        await host.remove(id);
        continue;
      }
    }
    await syncOne(host, id, root, byId.get(id));
  }

  // 4. Nouveaux projets créés sur un autre appareil
  for (const [id, file] of byId) {
    if (localIds.includes(id) || id in deleted) continue;
    host.onProgress('Téléchargement d’un projet…');
    const remote = await drive.downloadJSON<Project>(file.id);
    await host.absorb(remote);
    await setMeta(id, { jsonId: file.id, sig: contentSignature(remote), modifiedTime: file.modifiedTime, folderName: folderName(remote) });
  }
}

/** Envoie un fichier (ex. compte rendu exporté) dans un dossier du projet. */
export async function uploadToProject(p: Project, blob: Blob, name: string, folder: 'cr' | 'documents'): Promise<drive.DriveFile> {
  if (!p.drive) throw new Error('Projet pas encore synchronisé avec Drive');
  return drive.uploadFile(blob, { name, parents: [p.drive[folder]] });
}

export { mergeProjects };
