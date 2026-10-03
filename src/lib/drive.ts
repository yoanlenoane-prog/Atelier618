/**
 * Accès à l'API Google Drive v3 (appels REST directs depuis le navigateur).
 */
import { currentToken, invalidateToken } from './google';

const API = 'https://www.googleapis.com/drive/v3';
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3';
export const FOLDER = 'application/vnd.google-apps.folder';
export const ROOT_NAME = 'ChantierApp';

export class DriveError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
  parents?: string[];
  appProperties?: Record<string, string>;
  webViewLink?: string;
  size?: string;
}

/** Erreur réseau (ex. Safari : « Load failed », Chrome : « Failed to fetch ») — on peut réessayer. */
const isNetworkError = (e: unknown) => e instanceof TypeError;

async function call(url: string, init: RequestInit = {}): Promise<Response> {
  const token = currentToken();
  if (!token) throw new DriveError('Non connecté à Google Drive', 401);
  let res: Response | undefined;
  // Connexion mobile instable : jusqu'à 3 tentatives sur une coupure réseau
  for (let essai = 1; ; essai++) {
    try {
      res = await fetch(url, { ...init, headers: { ...(init.headers || {}), Authorization: `Bearer ${token}` } });
      break;
    } catch (e) {
      if (!isNetworkError(e) || essai >= 3) throw new DriveError(`Connexion à Google Drive interrompue (${(e as Error).message})`, 0);
      await new Promise((r) => setTimeout(r, essai * 1500));
    }
  }
  if (res.status === 401) invalidateToken();
  if (!res.ok) {
    let msg = res.statusText;
    try {
      msg = (await res.json()).error?.message || msg;
    } catch {
      /* ignore */
    }
    if (res.status === 403 && /quota|storage/i.test(msg)) msg = 'Espace Google Drive insuffisant : ' + msg;
    throw new DriveError(msg, res.status);
  }
  return res;
}

const FIELDS = 'id,name,mimeType,modifiedTime,parents,appProperties,webViewLink,size';

function esc(s: string) {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

export async function listFiles(q: string): Promise<DriveFile[]> {
  const out: DriveFile[] = [];
  let pageToken = '';
  do {
    const params = new URLSearchParams({ q, fields: `nextPageToken,files(${FIELDS})`, pageSize: '1000', spaces: 'drive' });
    if (pageToken) params.set('pageToken', pageToken);
    const r = await (await call(`${API}/files?${params}`)).json();
    out.push(...r.files);
    pageToken = r.nextPageToken || '';
  } while (pageToken);
  return out;
}

export async function findFolder(name: string, parent?: string): Promise<DriveFile | undefined> {
  const q = [`name='${esc(name)}'`, `mimeType='${FOLDER}'`, 'trashed=false', parent ? `'${parent}' in parents` : ''].filter(Boolean).join(' and ');
  return (await listFiles(q))[0];
}

export async function createFolder(name: string, parent?: string, appProperties?: Record<string, string>): Promise<DriveFile> {
  const res = await call(`${API}/files?fields=${FIELDS}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, mimeType: FOLDER, parents: parent ? [parent] : undefined, appProperties }),
  });
  return res.json();
}

export async function ensureFolder(name: string, parent?: string): Promise<string> {
  return (await findFolder(name, parent))?.id ?? (await createFolder(name, parent)).id;
}

export async function uploadFile(
  blob: Blob,
  meta: { name: string; parents?: string[]; mimeType?: string; appProperties?: Record<string, string> }
): Promise<DriveFile> {
  // Le contenu est lu en mémoire puis envoyé en « multipart/related » construit à la main :
  // Safari (iPhone) échoue (« Load failed ») avec un FormData contenant un fichier relu depuis le stockage local.
  const data = await lireOctets(blob);
  const mime = meta.mimeType || blob.type || 'application/octet-stream';
  const boundary = 'atelier618-' + Math.random().toString(36).slice(2);
  const enc = new TextEncoder();
  const head = enc.encode(
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify({ ...meta, mimeType: mime })}\r\n` +
      `--${boundary}\r\nContent-Type: ${mime}\r\n\r\n`
  );
  const tail = enc.encode(`\r\n--${boundary}--`);
  const body = new Uint8Array(head.length + data.length + tail.length);
  body.set(head, 0);
  body.set(data, head.length);
  body.set(tail, head.length + data.length);
  const res = await call(`${UPLOAD}/files?uploadType=multipart&fields=${FIELDS}`, {
    method: 'POST',
    headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
    body,
  });
  return res.json();
}

/** Lit le contenu d'un fichier ; erreur claire s'il n'est plus lisible sur l'appareil. */
async function lireOctets(blob: Blob): Promise<Uint8Array<ArrayBuffer>> {
  try {
    return new Uint8Array(await blob.arrayBuffer());
  } catch (e) {
    throw new DriveError(`fichier illisible sur cet appareil (${(e as Error).message})`, 0);
  }
}

export async function updateFileContent(id: string, blob: Blob): Promise<DriveFile> {
  const res = await call(`${UPLOAD}/files/${id}?uploadType=media&fields=${FIELDS}`, {
    method: 'PATCH',
    headers: { 'Content-Type': blob.type || 'application/octet-stream' },
    body: await lireOctets(blob),
  });
  return res.json();
}

export async function updateMeta(id: string, meta: Record<string, unknown>): Promise<DriveFile> {
  const res = await call(`${API}/files/${id}?fields=${FIELDS}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(meta),
  });
  return res.json();
}

/** Crée un raccourci Drive (le fichier apparaît aussi dans un autre dossier, sans copie). */
export async function createShortcut(targetId: string, name: string, parent: string): Promise<DriveFile> {
  const res = await call(`${API}/files?fields=${FIELDS}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, mimeType: 'application/vnd.google-apps.shortcut', shortcutDetails: { targetId }, parents: [parent] }),
  });
  return res.json();
}

/** Déplace un fichier ou un dossier d'un dossier parent à un autre. */
export async function moveFile(id: string, to: string, from?: string): Promise<DriveFile> {
  const params = new URLSearchParams({ addParents: to, fields: FIELDS });
  if (from) params.set('removeParents', from);
  const res = await call(`${API}/files/${id}?${params}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  return res.json();
}

export async function getFile(id: string): Promise<(DriveFile & { trashed?: boolean }) | null> {
  try {
    return await (await call(`${API}/files/${id}?fields=${FIELDS},trashed`)).json();
  } catch (e) {
    if (e instanceof DriveError && e.status === 404) return null;
    throw e;
  }
}

export async function downloadBlob(id: string): Promise<Blob> {
  return (await call(`${API}/files/${id}?alt=media`)).blob();
}

export async function downloadJSON<T>(id: string): Promise<T> {
  return (await call(`${API}/files/${id}?alt=media`)).json();
}

export async function trash(id: string): Promise<void> {
  await updateMeta(id, { trashed: true });
}

export function driveLink(id: string): string {
  return `https://drive.google.com/file/d/${id}/view`;
}

export function folderLink(id: string): string {
  return `https://drive.google.com/drive/folders/${id}`;
}
