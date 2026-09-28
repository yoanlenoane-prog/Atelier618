import type { DocumentFile, Dossier, Project } from '../types';

/** Dossier fixe « Comptes rendus » (dossier Drive du même nom). */
export const DOSSIER_CR = 'cr';

/** Dossier d'un document (les anciens documents « Compte rendu » vont dans « Comptes rendus »). */
export function dossierDe(d: DocumentFile): string | undefined {
  if (d.dossierId) return d.dossierId;
  return d.categorie === 'Compte rendu' ? DOSSIER_CR : undefined;
}

export function isImage(d: DocumentFile): boolean {
  return (d.file.mime || '').startsWith('image/');
}

/** Chemin d'un dossier, de la racine jusqu'à lui. */
export function cheminDossier(p: Project, id?: string): Dossier[] {
  const out: Dossier[] = [];
  let cur = id ? p.dossiers?.find((d) => d.id === id) : undefined;
  while (cur && out.length < 20) {
    out.unshift(cur);
    const parentId: string | undefined = cur.parentId;
    cur = parentId ? p.dossiers?.find((d) => d.id === parentId) : undefined;
  }
  return out;
}

/** Nombre de documents dans un dossier et ses sous-dossiers. */
export function compteDossier(p: Project, id: string): number {
  const sous = (p.dossiers || []).filter((d) => d.parentId === id);
  return p.documents.filter((d) => dossierDe(d) === id).length + sous.reduce((n, d) => n + compteDossier(p, d.id), 0);
}
