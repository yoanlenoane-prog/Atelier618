/**
 * Couleur discrète de chaque rubrique (tons sourds de matériaux), pour distinguer les fenêtres
 * sans quitter la charte noir et blanc : liseré, icônes, fond très légèrement teinté.
 */
export const ACCENT: Record<string, string> = {
  home: '#1d1d1b', // Mes projets — noir de la charte
  ensemble: '#4a5866', // Vue d'ensemble — ardoise
  '': '#4a5866', // Tableau de bord — ardoise
  gantt: '#3f6475', // Gantt — bleu acier
  plans: '#5f7356', // Plans — sauge
  obs: '#8f6b60', // Observations / pastilles — brique douce (distinct du rouge « à faire »)
  cr: '#8a6a45', // Comptes rendus — chêne
  entreprises: '#6a5f86', // Entreprises — lavande grise
  docs: '#7a7456', // Documents — lin (distinct du jaune « en cours »)
  structure: '#6e6259', // Lots & tâches — taupe
  infos: '#5c6b6b', // Informations — pierre
  recherche: '#4f5d70', // Recherche — gris bleu
  aide: '#6f6f6e',
  reglages: '#6f6f6e',
};

export const accent = (key: string | undefined): string => ACCENT[key ?? ''] ?? ACCENT.home;
