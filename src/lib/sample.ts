/** Projet d'exemple « Maison Dupont », calé sur la date du jour pour une démonstration parlante. */
import type { Observation, Project } from '../types';
import { addDays, today } from './dates';
import { emptyInfo, newProject } from './factory';
import { storeLocal } from './files';
import { uid } from './ids';

const PLAN_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800" width="1200" height="800">
<rect width="1200" height="800" fill="#fff"/>
<g fill="none" stroke="#111" stroke-width="10">
<rect x="100" y="100" width="1000" height="600"/>
<path d="M500 100v250M500 450v250M100 400h300M700 100v200M700 380v320M700 400h400"/>
</g>
<g fill="none" stroke="#111" stroke-width="2">
<path d="M400 400a100 100 0 0 1 100-100M700 300a80 80 0 0 0 80 80"/>
<rect x="130" y="130" width="160" height="90"/><rect x="920" y="130" width="150" height="110"/>
</g>
<g font-family="Helvetica, Arial" font-size="26" fill="#555" letter-spacing="3">
<text x="200" y="270">SÉJOUR</text><text x="200" y="570">CUISINE</text><text x="540" y="560">ENTRÉE</text>
<text x="840" y="230">CHAMBRE 1</text><text x="820" y="560">SALLE D’EAU</text><text x="560" y="230">DGT</text>
</g>
<text x="100" y="770" font-family="Georgia" font-size="30" fill="#111">PLAN RDC — éch. 1/100</text>
</svg>`;

export async function createSample(numero: number): Promise<Project> {
  const t = today();
  const d = (n: number) => addDays(t, n);
  const info = {
    ...emptyInfo(numero),
    nom: 'Maison Dupont (exemple)',
    adresse: '12 rue des Tilleuls, 44000 Nantes',
    client: 'M. et Mme Dupont',
    architecte: 'Atelier 618',
    maitreOuvrage: 'M. et Mme Dupont',
    maitreOeuvre: 'Atelier 618',
    dateDebut: d(-60),
    dateFinPrevue: d(80),
    description: 'Rénovation complète d’une maison individuelle et extension de 30 m².',
    statut: 'en_cours' as const,
    entreprises: [
      { id: uid('e'), nom: 'Bâti Ouest', lot: 'Gros œuvre', contact: '02 40 00 00 01' },
      { id: uid('e'), nom: 'Élec Services', lot: 'Électricité', contact: '06 00 00 00 02' },
      { id: uid('e'), nom: 'Plomberie Martin', lot: 'Plomberie / Chauffage', contact: '06 00 00 00 03' },
    ],
  };
  const s = (nom: string, dp: number, fp: number, dr?: number, fr?: number, entreprise?: string, avancement?: number) => ({
    id: uid('s'), nom, debutPrevu: d(dp), finPrevue: d(fp), debutReel: dr !== undefined ? d(dr) : undefined,
    finReelle: fr !== undefined ? d(fr) : undefined, entreprise, avancement,
  });
  const blocs = [
    { id: uid('b'), nom: 'Gros œuvre', sousBlocs: [
      s('Terrassement', -60, -52, -60, -53, 'Bâti Ouest'),
      s('Fondations', -55, -40, -53, -37, 'Bâti Ouest'),
      s('Murs', -42, -18, -38, -12, 'Bâti Ouest'),
      s('Dalle', -20, -8, -12, -4, 'Bâti Ouest'),
    ] },
    { id: uid('b'), nom: 'Second œuvre', sousBlocs: [
      s('Cloisons', -10, 8, -6, undefined, undefined, 60),
      s('Électricité', -12, -3, -9, undefined, 'Élec Services', 70),
      s('Plomberie', -5, 12, -5, undefined, 'Plomberie Martin', 40),
      s('Chauffage', 5, 20, undefined, undefined, 'Plomberie Martin'),
    ] },
    { id: uid('b'), nom: 'Finitions', sousBlocs: [
      s('Peinture', 22, 45),
      s('Sols', 35, 55),
      s('Menuiseries', 45, 80),
    ] },
  ];
  const p = newProject(info, blocs);
  const img = await storeLocal(new Blob([PLAN_SVG], { type: 'image/svg+xml' }), 'Plan RDC.svg');
  const planId = uid('pl');
  p.plans.push({ id: planId, nom: 'RDC', image: img, largeur: 1200, hauteur: 800, updatedAt: Date.now() });

  const obs = (numero: number, titre: string, statut: Observation['statut'], blocIdx: number, sbIdx: number, x: number, y: number, texte: string, date: number, action?: string): Observation => ({
    id: uid('o'), numero, titre, statut, date: d(date), blocId: blocs[blocIdx].id, sousBlocId: blocs[blocIdx].sousBlocs[sbIdx].id,
    entreprise: blocs[blocIdx].sousBlocs[sbIdx].entreprise, planId, x, y,
    contenu: [{ id: uid('c'), type: 'texte', texte }], actionDemandee: action,
    historique: [{ id: uid('h'), date: d(date), texte: 'Observation créée' }], updatedAt: Date.now(),
  });
  p.observations = [
    obs(1, 'Passage de gaine à reprendre', 'a_faire', 1, 1, 0.6, 0.3, 'La gaine électrique n’est pas positionnée conformément au plan, au niveau de la cloison de la chambre 1.', -2, 'Reprendre le passage avant fermeture de la cloison.'),
    obs(2, 'Fuite sur raccord PER', 'en_cours', 1, 2, 0.78, 0.66, 'Légère fuite constatée sur le raccord de la salle d’eau.', -1, 'Remplacer le raccord et faire un essai en pression.'),
    obs(3, 'Réservation trémie oubliée', 'termine', 0, 3, 0.35, 0.62, 'La réservation pour la trémie de ventilation n’a pas été prévue dans la dalle.', -10),
    obs(4, 'Aplomb cloison séjour', 'a_faire', 1, 0, 0.42, 0.28, 'Défaut d’aplomb de 8 mm sur 2,50 m.', 0, 'Reprise à la charge de l’entreprise.'),
  ];
  p.observations[2].historique.push({ id: uid('h'), date: d(-8), texte: 'Entreprise informée' }, { id: uid('h'), date: d(-5), texte: 'Observation terminée' });
  p.compteurPastille = 4;
  p.comptesRendus = [
    {
      id: uid('r'), numero: 1, date: d(-7), participants: 'Architecte — Atelier 618\nBâti Ouest\nÉlec Services', meteo: 'Ensoleillé',
      notesGenerales: 'Visite hebdomadaire. Le gros œuvre est achevé.', rubriques: {}, observationIds: [p.observations[2].id],
      mode: 'bloc', inclurePlans: true, updatedAt: Date.now(),
    },
  ];
  return p;
}
