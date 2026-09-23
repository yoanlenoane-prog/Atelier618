/**
 * Fusion de deux versions d'un même projet (ex. téléphone hors ligne + PC).
 * Règle : pour chaque élément (observation, plan, compte rendu, document),
 * la version modifiée le plus récemment l'emporte ; les suppressions sont propagées.
 */
import type { Collection, Project } from '../types';

const COLLECTIONS: Collection[] = ['plans', 'observations', 'comptesRendus', 'documents'];

type WithId = { id: string; updatedAt: number };

function mergeList<T extends WithId>(a: T[], b: T[], supprimes: Record<string, number>): T[] {
  const map = new Map<string, T>();
  const order: string[] = [];
  for (const item of [...a, ...b]) {
    const cur = map.get(item.id);
    if (!cur) order.push(item.id);
    if (!cur || item.updatedAt > cur.updatedAt) map.set(item.id, item);
  }
  return order.map((id) => map.get(id)!).filter((it) => !(supprimes[it.id] && supprimes[it.id] >= it.updatedAt));
}

/** Deux éléments ne doivent jamais partager le même numéro (P-012, CR n°4…). */
function renumber<T extends WithId & { numero: number }>(list: T[], start: number): { list: T[]; max: number } {
  let max = Math.max(start, ...list.map((i) => i.numero), 0);
  const seen = new Set<number>();
  const sorted = [...list].sort((x, y) => x.numero - y.numero || (x.id < y.id ? -1 : 1));
  const renum = new Map<string, number>();
  for (const it of sorted) {
    if (seen.has(it.numero)) renum.set(it.id, ++max);
    else seen.add(it.numero);
  }
  return {
    list: renum.size ? list.map((i) => (renum.has(i.id) ? { ...i, numero: renum.get(i.id)!, updatedAt: i.updatedAt + 1 } : i)) : list,
    max,
  };
}

export function mergeProjects(a: Project, b: Project): Project {
  const base = a.updatedAt >= b.updatedAt ? a : b;
  const supprimes: Record<string, number> = { ...a.supprimes };
  for (const [k, v] of Object.entries(b.supprimes || {})) supprimes[k] = Math.max(supprimes[k] || 0, v);

  const out: Project = {
    ...base,
    info: a.infoUpdatedAt >= b.infoUpdatedAt ? a.info : b.info,
    infoUpdatedAt: Math.max(a.infoUpdatedAt, b.infoUpdatedAt),
    blocs: a.blocsUpdatedAt >= b.blocsUpdatedAt ? a.blocs : b.blocs,
    blocsUpdatedAt: Math.max(a.blocsUpdatedAt, b.blocsUpdatedAt),
    supprimes,
    updatedAt: Math.max(a.updatedAt, b.updatedAt),
    drive: a.drive || b.drive
      ? { ...(b.drive || a.drive)!, ...(a.drive || {}), photosPastilles: { ...(b.drive?.photosPastilles || {}), ...(a.drive?.photosPastilles || {}) } }
      : undefined,
  };
  for (const c of COLLECTIONS) (out as any)[c] = mergeList((a as any)[c] || [], (b as any)[c] || [], supprimes);

  const obs = renumber(out.observations, Math.max(a.compteurPastille, b.compteurPastille));
  out.observations = obs.list;
  out.compteurPastille = obs.max;
  out.comptesRendus = renumber(out.comptesRendus, 0).list;
  return out;
}

/** Signature du contenu (hors métadonnées de synchro) pour savoir si un envoi est nécessaire. */
export function contentSignature(p: Project): string {
  const { drive, ...rest } = p;
  void drive;
  return JSON.stringify(rest);
}
