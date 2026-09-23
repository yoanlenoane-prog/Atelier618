import type { FileRef } from '../types';
import { idbGet, idbSet } from './idb';
import { uid } from './ids';
import { downloadBlob } from './drive';
import { currentToken } from './google';

/** Enregistre un fichier localement (IndexedDB) et renvoie sa référence. */
export async function storeLocal(blob: Blob, name: string): Promise<FileRef> {
  const localId = uid('f');
  await idbSet('blobs', localId, blob);
  return { localId, name, mime: blob.type || 'application/octet-stream', size: blob.size };
}

const urlCache = new Map<string, Promise<string | null>>();

function cacheKey(ref: FileRef) {
  return ref.localId || ref.driveId || '';
}

/** Récupère le contenu d'un fichier : copie locale d'abord, sinon Google Drive (et mise en cache). */
export async function getBlob(ref: FileRef): Promise<Blob | null> {
  if (ref.localId) {
    const b = await idbGet<Blob>('blobs', ref.localId);
    if (b) return b;
  }
  if (ref.driveId) {
    const cached = await idbGet<Blob>('blobs', 'd:' + ref.driveId);
    if (cached) return cached;
    if (!currentToken() || !navigator.onLine) return null;
    try {
      const b = await downloadBlob(ref.driveId);
      await idbSet('blobs', 'd:' + ref.driveId, b);
      return b;
    } catch {
      return null;
    }
  }
  return null;
}

/** URL affichable (object URL), mémorisée. */
export function fileUrl(ref: FileRef): Promise<string | null> {
  const key = cacheKey(ref);
  if (!key) return Promise.resolve(null);
  let p = urlCache.get(key);
  if (!p) {
    p = getBlob(ref).then((b) => (b ? URL.createObjectURL(b) : null));
    p.then((u) => {
      if (!u) urlCache.delete(key);
    });
    urlCache.set(key, p);
  }
  return p;
}

/** Lecture d'une image → dimensions. */
export function imageSize(blob: Blob): Promise<{ w: number; h: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      resolve({ w: img.naturalWidth, h: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => reject(new Error('Image illisible'));
    img.src = url;
  });
}

/**
 * Réduit une photo de téléphone (souvent 4–12 Mo) avant stockage :
 * côté le plus long limité à `max` px, JPEG qualité 0,85.
 */
export async function compressPhoto(file: Blob, max = 2000): Promise<Blob> {
  if (!file.type.startsWith('image/') || file.type === 'image/gif' || file.type === 'image/svg+xml') return file;
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' } as ImageBitmapOptions);
    const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
    if (scale === 1 && file.size < 1_500_000) return file;
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const out = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.85));
    return out && out.size < file.size ? out : file;
  } catch {
    return file;
  }
}

export function photoName(prefix: string): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${prefix}_${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}.jpg`;
}

export function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

export function humanSize(n?: number): string {
  if (!n) return '';
  if (n < 1024) return `${n} o`;
  if (n < 1024 ** 2) return `${Math.round(n / 1024)} Ko`;
  return `${(n / 1024 ** 2).toFixed(1).replace('.', ',')} Mo`;
}
