import type { Bloc, ISODate, Observation, Project, SousBloc } from '../types';
import { analyseSousBloc, isOpen, type TaskAnalysis } from './planning';

/** Clé de comparaison d'un nom d'entreprise (casse et espaces ignorés). */
export const cleEntreprise = (nom?: string) => (nom || '').trim().replace(/\s+/g, ' ').toLowerCase();

export interface FicheEntreprise {
  cle: string;
  nom: string;
  lot?: string;
  contact?: string;
  /** Tâches (sous-blocs) attribuées à l'entreprise. */
  lots: { bloc: Bloc; sb: SousBloc; a: TaskAnalysis }[];
  /** Tâches non terminées en retard (démarrage ou fin). */
  lotsEnRetard: { bloc: Bloc; sb: SousBloc; a: TaskAnalysis }[];
  ouvertes: Observation[];
  /** Observations ouvertes dont l'échéance est dépassée. */
  echues: Observation[];
  terminees: Observation[];
}

/**
 * Toutes les entreprises du projet : celles des Informations, plus celles citées
 * dans les observations ou le planning.
 */
export function entreprisesDuProjet(p: Project, auj: ISODate): FicheEntreprise[] {
  const fiches = new Map<string, FicheEntreprise>();
  const fiche = (nom: string) => {
    const cle = cleEntreprise(nom);
    if (!cle) return undefined;
    let f = fiches.get(cle);
    if (!f) {
      f = { cle, nom: nom.trim(), lots: [], lotsEnRetard: [], ouvertes: [], echues: [], terminees: [] };
      fiches.set(cle, f);
    }
    return f;
  };
  for (const e of p.info.entreprises) {
    const f = fiche(e.nom);
    if (f) Object.assign(f, { nom: e.nom.trim(), lot: e.lot, contact: e.contact });
  }
  for (const bloc of p.blocs)
    for (const sb of bloc.sousBlocs) {
      const f = sb.entreprise && fiche(sb.entreprise);
      if (!f) continue;
      const a = analyseSousBloc(sb, auj);
      f.lots.push({ bloc, sb, a });
      if (a.enRetard && a.state !== 'termine') f.lotsEnRetard.push({ bloc, sb, a });
    }
  for (const o of [...p.observations].sort((a, b) => a.numero - b.numero)) {
    const f = o.entreprise && fiche(o.entreprise);
    if (!f) continue;
    if (isOpen(o)) {
      f.ouvertes.push(o);
      if (o.echeance && o.echeance < auj) f.echues.push(o);
    } else if (o.statut === 'termine') f.terminees.push(o);
  }
  return [...fiches.values()].sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
}

/**
 * Ajoute aux entreprises du projet (Informations) celles saisies sur les tâches du Gantt
 * et pas encore connues. Modifie `p` sur place ; renvoie les noms ajoutés.
 */
export function ajouterEntreprisesDesTaches(p: Project, newId: () => string): string[] {
  const connues = new Set(p.info.entreprises.map((e) => cleEntreprise(e.nom)));
  const ajouts: string[] = [];
  for (const b of p.blocs)
    for (const t of b.sousBlocs) {
      const nom = t.entreprise?.trim().replace(/\s+/g, ' ');
      const cle = cleEntreprise(nom);
      if (!nom || connues.has(cle)) continue;
      connues.add(cle);
      p.info.entreprises = [...p.info.entreprises, { id: newId(), nom }];
      ajouts.push(nom);
    }
  return ajouts;
}

/**
 * Entreprises proposées dans un compte rendu : celles du projet, celles des tâches du Gantt
 * pas encore enregistrées, et celles déjà cochées (pour pouvoir les décocher).
 */
export function entreprisesProposees(p: Project, cochees: string[] = []): { nom: string; detail?: string }[] {
  const out: { nom: string; detail?: string }[] = [];
  const vus = new Set<string>();
  const add = (nom: string | undefined, detail?: string) => {
    const k = cleEntreprise(nom);
    if (!k || k === cleEntreprise('Chantier') || vus.has(k)) return;
    vus.add(k);
    out.push({ nom: nom!.trim(), detail });
  };
  for (const e of p.info.entreprises) add(e.nom, e.lot);
  for (const b of p.blocs) for (const t of b.sousBlocs) add(t.entreprise, 'planning');
  for (const c of cochees) add(c);
  return out;
}
