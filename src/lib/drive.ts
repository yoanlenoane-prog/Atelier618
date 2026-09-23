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

async function call(url: string, init: RequestInit = {}): Promise<Response> {
  const token = currentToken();
  if (!token) throw new DriveError('Non connecté à Google Drive', 401);
  const res = await fetch(url, { ...init, headers: { ...(init.headers || {}), Authorization: `Bearer ${token}` } });
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
  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify({ ...meta, mimeType: meta.mimeType || blob.type })], { type: 'application/json' }));
  form.append('file', blob);
  const res = await call(`${UPLOAD}/files?uploadType=multipart&fields=${FIELDS}`, { method: 'POST', body: form });
  return res.json();
}

export async function updateFileContent(id: string, blob: Blob): Promise<DriveFile> {
  const res = await call(`${UPLOAD}/files/${id}?uploadType=media&fields=${FIELDS}`, {
    method: 'PATCH',
    headers: { 'Content-Type': blob.type || 'application/octet-stream' },
    body: blob,
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
