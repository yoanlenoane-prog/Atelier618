/**
 * Synchronisation données locales ⇄ Google Drive.
 *
 *   ChantierApp/
 *     01 - Maison Dupont/
 *       Projet/projet.json      ← toutes les données de l'application
 *       Plans/                  ← plans importés
 *       Photos/P-012/…          ← photos rangées par pastille
 *       Documents/
 *       Comptes rendus/
 */
import type { FileRef, Project } from '../types';
import * as drive from './drive';
import { getBlob } from './files';
import { idbGet, idbSet } from './idb';
import { pastilleLabel } from './ids';
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
  kind: 'plan' | 'photo' | 'document' | 'cr';
  numero?: number;
}

function forEachRef(p: Project, cb: (c: RefCtx) => void) {
  for (const pl of p.plans) {
    cb({ ref: pl.image, kind: 'plan' });
    if (pl.source) cb({ ref: pl.source, kind: 'plan' });
  }
  for (const o of p.observations) for (const c of o.contenu) if (c.type === 'photo') cb({ ref: c.file, kind: 'photo', numero: o.numero });
  for (const d of p.documents) cb({ ref: d.file, kind: d.categorie === 'Compte rendu' ? 'cr' : 'document' });
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
    if (c.kind === 'cr') parent = f.cr;
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
        if (x.ref.localId === c.ref.localId) x.ref.driveId = up.id;
      })
    );
  }
  return host.get(p.id)!;
}

async function syncOne(host: SyncHost, id: string, root: string, remoteJson?: drive.DriveFile) {
  let p = host.get(id)!;
  p = await ensureProjectFolders(host, p, root);
  p = await uploadPending(host, p);

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
