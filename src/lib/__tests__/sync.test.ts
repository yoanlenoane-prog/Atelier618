import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Project } from '../../types';

// ——— Faux Google Drive en mémoire ———
interface F { id: string; name: string; mimeType: string; parents?: string[]; trashed?: boolean; appProperties?: Record<string, string>; modifiedTime: string; content?: unknown }
const files = new Map<string, F>();
let n = 0;
const FOLDER = 'application/vnd.google-apps.folder';
const now = () => new Date(Date.now() + n).toISOString();
function match(f: F, q: string): boolean {
  return q.split(' and ').every((c) => {
    c = c.trim();
    let m;
    if ((m = c.match(/^name='(.*)'$/))) return f.name === m[1].replace(/\\'/g, "'");
    if ((m = c.match(/^mimeType='(.*)'$/))) return f.mimeType === m[1];
    if (c === 'trashed=false') return !f.trashed;
    if ((m = c.match(/^'(.*)' in parents$/))) return !!f.parents?.includes(m[1]);
    throw new Error('requête non gérée : ' + c);
  });
}
vi.mock('../drive', () => ({
  FOLDER,
  ROOT_NAME: 'ChantierApp',
  listFiles: async (q: string) => [...files.values()].filter((f) => match(f, q)),
  findFolder: async (name: string, parent?: string) => [...files.values()].find((f) => f.name === name && f.mimeType === FOLDER && !f.trashed && (!parent || f.parents?.includes(parent))),
  createFolder: async (name: string, parent?: string, appProperties?: Record<string, string>) => {
    const f: F = { id: 'F' + ++n, name, mimeType: FOLDER, parents: parent ? [parent] : [], appProperties, modifiedTime: now() };
    files.set(f.id, f);
    return f;
  },
  ensureFolder: async (name: string, parent?: string) => {
    const ex = [...files.values()].find((f) => f.name === name && f.mimeType === FOLDER && !f.trashed && (!parent || f.parents?.includes(parent)));
    if (ex) return ex.id;
    const f: F = { id: 'F' + ++n, name, mimeType: FOLDER, parents: parent ? [parent] : [], modifiedTime: now() };
    files.set(f.id, f);
    return f.id;
  },
  uploadFile: async (blob: Blob, meta: { name: string; parents?: string[]; mimeType?: string; appProperties?: Record<string, string> }) => {
    if (meta.parents?.some((p) => !p || !files.has(p))) throw new Error('Parent inexistant : ' + meta.parents);
    const f: F = { id: 'D' + ++n, name: meta.name, mimeType: meta.mimeType || blob.type, parents: meta.parents, appProperties: meta.appProperties, modifiedTime: now(), content: await blob.text() };
    files.set(f.id, f);
    return f;
  },
  updateFileContent: async (id: string, blob: Blob) => {
    const f = files.get(id)!;
    f.content = await blob.text();
    f.modifiedTime = now();
    n++;
    return f;
  },
  updateMeta: async (id: string, meta: Record<string, unknown>) => Object.assign(files.get(id)!, meta),
  createShortcut: async (targetId: string, name: string, parent: string) => {
    if (!files.has(targetId) || !files.has(parent)) throw new Error('raccourci invalide');
    const f: F = { id: 'S' + ++n, name, mimeType: 'application/vnd.google-apps.shortcut', parents: [parent], modifiedTime: now() };
    files.set(f.id, f);
    return f;
  },
  moveFile: async (id: string, to: string, from?: string) => {
    const f = files.get(id);
    if (!f || !files.has(to)) throw new Error('déplacement invalide');
    f.parents = [...(f.parents || []).filter((p) => p !== from), to];
    return f;
  },
  getFile: async (id: string) => files.get(id) ?? null,
  downloadBlob: async (id: string) => new Blob([String(files.get(id)?.content ?? '')]),
  downloadJSON: async (id: string) => JSON.parse(String(files.get(id)!.content)),
  trash: async (id: string) => { files.get(id)!.trashed = true; },
}));
// Stockage local : en mémoire
const idb = new Map<string, unknown>();
vi.mock('../idb', () => ({
  idbGet: async (s: string, k: string) => idb.get(s + ':' + k),
  idbSet: async (s: string, k: string, v: unknown) => void idb.set(s + ':' + k, v),
  idbDel: async (s: string, k: string) => void idb.delete(s + ':' + k),
  idbAll: async () => [],
}));
vi.mock('../google', () => ({ currentToken: () => 'x' }));

const { syncAll } = await import('../sync');
const { mergeProjects } = await import('../merge');
const { createSample } = await import('../sample');
const { storeLocal } = await import('../files');

function host(projects: Record<string, Project>) {
  return {
    get: (id: string) => projects[id],
    patch: async (id: string, fn: (p: Project) => void) => { const c = structuredClone(projects[id]); fn(c); projects[id] = c; return c; },
    absorb: async (r: Project) => (projects[r.id] = projects[r.id] ? mergeProjects(projects[r.id], r) : r),
    remove: async (id: string) => void delete projects[id],
    deletedProjects: async () => ({}),
    clearDeleted: async () => {},
    onProgress: () => {},
  };
}

beforeEach(() => {
  files.clear();
  idb.clear();
  globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} } as unknown as Storage;
});

describe('synchronisation complète (faux Drive)', () => {
  it('envoie un projet avec image, dossiers, photos de documents, contacts et dépendances, puis se resynchronise', async () => {
    const p = await createSample(1);
    p.info.image = await storeLocal(new Blob(['img'], { type: 'image/jpeg' }), 'Image du projet.jpg');
    p.info.contacts = [{ id: 'c1', categorie: 'entreprise', societe: 'Bâti Ouest', nom: 'Paul', email: 'p@x.fr' }];
    p.dossiers = [{ id: 'k1', nom: 'Devis', updatedAt: 1 }, { id: 'k2', nom: 'Signés', parentId: 'k1', updatedAt: 1 }];
    p.documents.push(
      { id: 'd1', nom: 'devis.pdf', file: await storeLocal(new Blob(['pdf'], { type: 'application/pdf' }), 'devis.pdf'), date: '2026-10-01', dossierId: 'k2', updatedAt: 1 },
      { id: 'd2', nom: 'photo.jpg', file: await storeLocal(new Blob(['jpg'], { type: 'image/jpeg' }), 'photo.jpg'), date: '2026-10-01', updatedAt: 1 },
    );
    p.blocs[1].sousBlocs[1].dependances = [{ id: p.blocs[1].sousBlocs[0].id }];
    const projects: Record<string, Project> = { [p.id]: p };
    const h = host(projects);

    await syncAll(h, [p.id]);
    const s = projects[p.id];
    expect(s.drive?.projet).toBeTruthy();
    expect(s.info.image?.driveId).toBeTruthy();
    expect(files.get(s.info.image!.driveId!)!.parents).toEqual([s.drive!.projet]);
    expect(s.dossiers!.every((d) => d.driveId)).toBe(true);
    const devis = s.documents.find((d) => d.id === 'd1')!;
    expect(files.get(devis.file.driveId!)!.parents).toEqual([s.dossiers![1].driveId]);
    expect(s.documents.find((d) => d.id === 'd2')!.driveRaccourci).toBeTruthy();

    // Deuxième synchro sans changement, puis après déplacement d'un document
    await syncAll(h, [p.id]);
    projects[p.id] = { ...projects[p.id], documents: projects[p.id].documents.map((d) => (d.id === 'd1' ? { ...d, dossierId: undefined } : d)) };
    await syncAll(h, [p.id]);
    const moved = projects[p.id].documents.find((d) => d.id === 'd1')!;
    expect(files.get(moved.file.driveId!)!.parents).toEqual([projects[p.id].drive!.documents]);
  });

  it('récupère sur un second appareil un projet créé ailleurs', async () => {
    const p = await createSample(1);
    p.info.image = await storeLocal(new Blob(['img'], { type: 'image/jpeg' }), 'Image du projet.jpg');
    await syncAll(host({ [p.id]: p }), [p.id]);
    const autre: Record<string, Project> = {};
    idb.clear();
    await syncAll(host(autre), []);
    expect(autre[p.id]?.info.image?.driveId).toBeTruthy();
  });
});
