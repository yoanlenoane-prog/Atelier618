import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Collection, Project } from './types';
import { idbAll, idbDel, idbGet, idbSet } from './lib/idb';
import { mergeProjects } from './lib/merge';
import { isDirty, syncAll, type SyncHost } from './lib/sync';
import { currentToken, getClientId, requestToken, signOut, wasConnected } from './lib/google';

export type SyncStatus = 'local' | 'idle' | 'syncing' | 'error' | 'offline' | 'reconnect';

export interface SyncState {
  status: SyncStatus;
  message?: string;
  lastSync?: number;
  pending: number;
}

interface Store {
  loaded: boolean;
  projects: Project[];
  get(id: string): Project | undefined;
  create(p: Project): Promise<void>;
  update(id: string, fn: (p: Project) => void): Promise<Project>;
  remove(id: string): Promise<void>;
  sync: SyncState;
  syncNow(interactive?: boolean): Promise<void>;
  connect(): Promise<void>;
  disconnect(): void;
}

const Ctx = createContext<Store | null>(null);

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('Store manquant');
  return s;
}

export function useProject(id: string): Project | undefined {
  return useStore().get(id);
}

const COLLECTIONS: Collection[] = ['plans', 'observations', 'comptesRendus', 'documents'];
const DELETED_KEY = 'deletedProjects';

/** Horodate automatiquement ce qui a changé entre deux versions (utile à la fusion). */
function stamp(prev: Project, next: Project): boolean {
  const now = Date.now();
  let changed = false;
  for (const c of COLLECTIONS) {
    const before = new Map<string, string>((prev[c] as any[]).map((i) => [i.id, JSON.stringify(i)]));
    const ids = new Set<string>();
    for (const item of next[c] as any[]) {
      ids.add(item.id);
      if (before.get(item.id) !== JSON.stringify(item)) {
        item.updatedAt = now;
        changed = true;
      }
    }
    for (const id of before.keys())
      if (!ids.has(id)) {
        next.supprimes = { ...next.supprimes, [id]: now };
        changed = true;
      }
  }
  if (JSON.stringify(prev.info) !== JSON.stringify(next.info)) {
    next.infoUpdatedAt = now;
    changed = true;
  }
  if (JSON.stringify(prev.blocs) !== JSON.stringify(next.blocs)) {
    next.blocsUpdatedAt = now;
    changed = true;
  }
  if (JSON.stringify(prev.drive) !== JSON.stringify(next.drive)) changed = true;
  if (changed) next.updatedAt = now;
  return changed;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Record<string, Project>>({});
  const [loaded, setLoaded] = useState(false);
  const ref = useRef<Record<string, Project>>({});
  const [sync, setSync] = useState<SyncState>({ status: 'local', pending: 0 });
  const syncing = useRef(false);
  const again = useRef(false);
  const timer = useRef<number | undefined>(undefined);

  const commit = useCallback(async (p: Project) => {
    ref.current = { ...ref.current, [p.id]: p };
    setProjects(ref.current);
    await idbSet('projects', p.id, p);
  }, []);

  const drop = useCallback(async (id: string) => {
    const { [id]: _gone, ...rest } = ref.current;
    void _gone;
    ref.current = rest;
    setProjects(rest);
    await idbDel('projects', id);
  }, []);

  const refreshPending = useCallback(async () => {
    let n = 0;
    for (const p of Object.values(ref.current)) if (await isDirty(p)) n++;
    setSync((s) => ({ ...s, pending: n }));
  }, []);

  const runSync = useCallback(
    async (interactive: boolean) => {
      if (!getClientId() || (!wasConnected() && !interactive)) {
        setSync((s) => ({ ...s, status: 'local' }));
        await refreshPending();
        return;
      }
      if (!navigator.onLine) {
        setSync((s) => ({ ...s, status: 'offline', message: 'Hors connexion — les modifications sont conservées sur l’appareil' }));
        await refreshPending();
        return;
      }
      if (syncing.current) {
        again.current = true;
        return;
      }
      if (!currentToken()) {
        if (!interactive) {
          setSync((s) => ({ ...s, status: 'reconnect', message: 'Session Google expirée' }));
          await refreshPending();
          return;
        }
        try {
          await requestToken(true);
        } catch (e) {
          setSync((s) => ({ ...s, status: 'reconnect', message: (e as Error).message }));
          return;
        }
      }
      syncing.current = true;
      setSync((s) => ({ ...s, status: 'syncing', message: 'Synchronisation…' }));
      const host: SyncHost = {
        get: (id) => ref.current[id],
        patch: async (id, fn) => {
          const prev = ref.current[id];
          const next = structuredClone(prev);
          fn(next);
          stamp(prev, next);
          await commit(next);
          return next;
        },
        absorb: async (remote) => {
          const local = ref.current[remote.id];
          const merged = local ? mergeProjects(local, remote) : remote;
          await commit(merged);
          return merged;
        },
        remove: drop,
        deletedProjects: async () => (await idbGet<Record<string, string | undefined>>('meta', DELETED_KEY)) || {},
        clearDeleted: async (id) => {
          const d = (await idbGet<Record<string, string | undefined>>('meta', DELETED_KEY)) || {};
          delete d[id];
          await idbSet('meta', DELETED_KEY, d);
        },
        onProgress: (message) => setSync((s) => ({ ...s, message })),
      };
      try {
        await syncAll(host, Object.keys(ref.current));
        setSync((s) => ({ ...s, status: 'idle', message: undefined, lastSync: Date.now() }));
      } catch (e) {
        const msg = (e as Error).message;
        const auth = /401|Non connecté|invalid/i.test(msg) && !currentToken();
        setSync((s) => ({ ...s, status: auth ? 'reconnect' : 'error', message: msg }));
      } finally {
        syncing.current = false;
        await refreshPending();
        if (again.current) {
          again.current = false;
          scheduleSync(1500);
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [commit, drop, refreshPending]
  );

  const scheduleSync = useCallback(
    (delay = 3000) => {
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => runSync(false), delay);
    },
    [runSync]
  );

  // Chargement initial depuis l'appareil, puis synchro
  useEffect(() => {
    (async () => {
      const all = await idbAll<Project>('projects');
      ref.current = Object.fromEntries(all.map((p) => [p.id, p]));
      setProjects(ref.current);
      setLoaded(true);
      runSync(false);
    })();
    const onOnline = () => scheduleSync(500);
    const onVisible = () => document.visibilityState === 'visible' && scheduleSync(500);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOnline);
    document.addEventListener('visibilitychange', onVisible);
    const iv = window.setInterval(() => scheduleSync(0), 5 * 60_000);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOnline);
      document.removeEventListener('visibilitychange', onVisible);
      window.clearInterval(iv);
    };
  }, [runSync, scheduleSync]);

  const store = useMemo<Store>(
    () => ({
      loaded,
      projects: Object.values(projects).sort((a, b) => a.info.numero - b.info.numero || a.info.nom.localeCompare(b.info.nom)),
      get: (id) => projects[id],
      create: async (p) => {
        await commit(p);
        scheduleSync(500);
      },
      update: async (id, fn) => {
        const prev = ref.current[id];
        if (!prev) throw new Error('Projet introuvable');
        const next = structuredClone(prev);
        fn(next);
        if (!stamp(prev, next)) return prev;
        await commit(next);
        setSync((s) => ({ ...s, pending: Math.max(s.pending, 1) }));
        scheduleSync();
        return next;
      },
      remove: async (id) => {
        const p = ref.current[id];
        const d = (await idbGet<Record<string, string | undefined>>('meta', DELETED_KEY)) || {};
        d[id] = p?.drive?.projet;
        await idbSet('meta', DELETED_KEY, d);
        await drop(id);
        scheduleSync(500);
      },
      sync,
      syncNow: (interactive = true) => runSync(interactive),
      connect: async () => {
        await requestToken(true);
        await runSync(true);
      },
      disconnect: () => {
        signOut();
        setSync((s) => ({ ...s, status: 'local', message: undefined }));
      },
    }),
    [loaded, projects, sync, commit, drop, runSync, scheduleSync]
  );

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}
