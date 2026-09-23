/**
 * Petit wrapper IndexedDB : stockage local des projets (JSON) et des fichiers (Blob).
 * C'est ce qui permet de travailler hors connexion ; Google Drive reste la référence.
 */
const DB_NAME = 'atelier618';
const VERSION = 1;
export type StoreName = 'projects' | 'blobs' | 'meta';

let dbPromise: Promise<IDBDatabase> | null = null;

function open(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        for (const s of ['projects', 'blobs', 'meta']) if (!db.objectStoreNames.contains(s)) db.createObjectStore(s);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
}

function wrap<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function idbGet<T>(store: StoreName, key: string): Promise<T | undefined> {
  const db = await open();
  return wrap(db.transaction(store).objectStore(store).get(key)) as Promise<T | undefined>;
}

export async function idbSet(store: StoreName, key: string, value: unknown): Promise<void> {
  const db = await open();
  await wrap(db.transaction(store, 'readwrite').objectStore(store).put(value, key));
}

export async function idbDel(store: StoreName, key: string): Promise<void> {
  const db = await open();
  await wrap(db.transaction(store, 'readwrite').objectStore(store).delete(key));
}

export async function idbAll<T>(store: StoreName): Promise<T[]> {
  const db = await open();
  return wrap(db.transaction(store).objectStore(store).getAll()) as Promise<T[]>;
}

export async function idbKeys(store: StoreName): Promise<string[]> {
  const db = await open();
  return wrap(db.transaction(store).objectStore(store).getAllKeys()) as Promise<string[]>;
}
