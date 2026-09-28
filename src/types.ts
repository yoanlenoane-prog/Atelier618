/**
 * Modèle de données — « une donnée, plusieurs vues ».
 * Tout le projet tient dans un seul document JSON (projet.json dans Drive).
 * Les fichiers lourds (photos, plans, documents) sont référencés par FileRef.
 */

/** Date au format ISO « AAAA-MM-JJ » (sans heure). */
export type ISODate = string;

/** Référence vers un fichier : copie locale (IndexedDB) et/ou fichier Google Drive. */
export interface FileRef {
  /** Clé du blob dans IndexedDB (copie locale / cache hors connexion). */
  localId?: string;
  /** Identifiant du fichier dans Google Drive, une fois envoyé. */
  driveId?: string;
  name: string;
  mime: string;
  size?: number;
  /** Dossier Drive où le fichier a été placé (pour le déplacer si on le range ailleurs). */
  driveParent?: string;
}

/** Forme dessinée sur une photo (coordonnées en pixels de l'image d'origine). */
export type Annotation =
  | { type: 'fleche' | 'cercle' | 'rect'; couleur: string; x1: number; y1: number; x2: number; y2: number }
  | { type: 'trait'; couleur: string; points: [number, number][] }
  | { type: 'texte'; couleur: string; x: number; y: number; texte: string };

/** Champs communs aux photos annotables : l'image affichée est l'original + les annotations. */
export interface Annotable {
  /** Photo d'origine, sans annotations (présente seulement si la photo a été annotée). */
  original?: FileRef;
  annotations?: Annotation[];
}

export type ProjectStatus = 'etude' | 'preparation' | 'en_cours' | 'reception' | 'termine' | 'suspendu';

export interface SousBloc {
  id: string;
  nom: string;
  entreprise?: string;
  debutPrevu?: ISODate;
  finPrevue?: ISODate;
  debutReel?: ISODate;
  finReelle?: ISODate;
  /** Avancement saisi (0–100). Ignoré (=100) si une fin réelle est saisie. */
  avancement?: number;
}

export interface Bloc {
  id: string;
  nom: string;
  sousBlocs: SousBloc[];
}

export interface Plan {
  id: string;
  nom: string;
  /** Image affichée (JPG/PNG, ou page du PDF convertie en image). */
  image: FileRef;
  /** Fichier d'origine si différent de l'image (ex. PDF). */
  source?: FileRef;
  largeur?: number;
  hauteur?: number;
  updatedAt: number;
}

export type ObsStatus = 'a_faire' | 'en_cours' | 'termine' | 'sans_suite';

export type ContentItem =
  | { id: string; type: 'texte'; texte: string }
  | ({ id: string; type: 'photo'; file: FileRef; legende?: string } & Annotable);

export interface HistoryEntry {
  id: string;
  date: ISODate;
  texte: string;
}

export interface Observation {
  id: string;
  /** Numéro de pastille : 12 → « P-012 ». */
  numero: number;
  titre: string;
  statut: ObsStatus;
  date: ISODate;
  blocId?: string;
  sousBlocId?: string;
  entreprise?: string;
  planId?: string;
  /** Position relative sur le plan (0–1). */
  x?: number;
  y?: number;
  contenu: ContentItem[];
  actionDemandee?: string;
  echeance?: ISODate;
  historique: HistoryEntry[];
  updatedAt: number;
}

export type ReportMode = 'pastille' | 'bloc';

/** Objet du compte rendu. */
export type ReportType = 'avancement' | 'reunion' | 'observation';

export interface CompteRendu {
  id: string;
  numero: number;
  date: ISODate;
  /** Objet du compte rendu (« avancement » par défaut). */
  type?: ReportType;
  /**
   * Entreprises concernées (avancement / observation) ou participants cochés (réunion),
   * par leur nom. « Chantier » (CR_CHANTIER) = l'ensemble du chantier.
   */
  concernes?: string[];
  /** Participants saisis librement, un par ligne (en plus des participants cochés). */
  participants: string;
  /** Afficher l'avancement estimé (oui par défaut). */
  afficherAvancement?: boolean;
  meteo?: string;
  notesGenerales?: string;
  /** Texte libre saisi sous chaque rubrique (clé = id du bloc ou du sous-bloc). */
  rubriques: Record<string, string>;
  observationIds: string[];
  mode: ReportMode;
  inclurePlans: boolean;
  /** Afficher le tableau « Planning — points de vigilance » (oui par défaut). */
  inclurePlanning?: boolean;
  prochaineVisite?: ISODate;
  updatedAt: number;
}

export interface DocumentFile extends Annotable {
  id: string;
  nom: string;
  file: FileRef;
  date: ISODate;
  /** Dossier de rangement (absent = racine « Documents »). */
  dossierId?: string;
  /** Ancienne catégorie (avant les dossiers) ; « Compte rendu » = dossier Comptes rendus. */
  categorie?: string;
  updatedAt: number;
}

/** Dossier de documents créé par l'utilisateur (recréé à l'identique dans Google Drive). */
export interface Dossier {
  id: string;
  nom: string;
  /** Dossier parent (absent = racine « Documents »). */
  parentId?: string;
  /** Dossier correspondant dans Drive, et nom sous lequel il y a été créé / renommé. */
  driveId?: string;
  driveNom?: string;
  updatedAt: number;
}

export interface Intervenant {
  id: string;
  nom: string;
  lot?: string;
  contact?: string;
}

export interface DriveFolders {
  /** Dossier du projet « 01 - Maison Dupont ». */
  racine?: string;
  projet: string;
  plans: string;
  photos: string;
  documents: string;
  cr: string;
  /** Sous-dossiers Photos/P-012 déjà créés : numéro → id. */
  photosPastilles?: Record<string, string>;
  /** Dossiers Drive de dossiers supprimés dans l'application, à mettre à la corbeille. */
  dossiersSupprimes?: string[];
}

export interface ProjectInfo {
  nom: string;
  numero: number;
  adresse: string;
  client: string;
  architecte: string;
  maitreOuvrage: string;
  maitreOeuvre: string;
  dateDebut?: ISODate;
  dateFinPrevue?: ISODate;
  description: string;
  statut: ProjectStatus;
  entreprises: Intervenant[];
}

export interface Project {
  id: string;
  schema: 1;
  info: ProjectInfo;
  blocs: Bloc[];
  plans: Plan[];
  observations: Observation[];
  comptesRendus: CompteRendu[];
  documents: DocumentFile[];
  /** Dossiers de rangement des documents (absent sur les anciens projets). */
  dossiers?: Dossier[];
  /** Dernier numéro de pastille attribué. */
  compteurPastille: number;

  // — Synchronisation —
  createdAt: number;
  updatedAt: number;
  infoUpdatedAt: number;
  blocsUpdatedAt: number;
  /** Éléments supprimés (id → date), pour propager les suppressions. */
  supprimes: Record<string, number>;
  drive?: DriveFolders;
}

export type Collection = 'plans' | 'observations' | 'comptesRendus' | 'documents' | 'dossiers';
