import { useState } from 'react';
import type { Project } from '../types';
import { href } from '../router';
import { Empty, useToday } from './ui';
import { diffDays, fmt, fmtShort, addDays } from '../lib/dates';
import { pastilleLabel } from '../lib/ids';
import { analyseSousBloc, codeSousBloc, formatEcart, isOpen, sousBlocsEnRetard } from '../lib/planning';

const INACTIFS = ['termine', 'suspendu'];
const HORIZON = 14;

interface Ligne {
  key: string;
  projet: Project;
  date?: string;
  label: string;
  detail?: string;
  badge?: string;
  link: string;
}

/** Tableau de bord multi-chantiers : ce qui demande de l'attention, tous projets confondus. */
export function Overview({ projects }: { projects: Project[] }) {
  const auj = useToday();
  const actifs = projects.filter((p) => !INACTIFS.includes(p.info.statut));
  const echues: Ligne[] = [];
  const retards: Ligne[] = [];
  const aVenir: Ligne[] = [];
  const limite = addDays(auj, HORIZON);
  let ouvertes = 0;

  for (const p of actifs) {
    for (const o of p.observations) {
      if (!isOpen(o)) continue;
      ouvertes++;
      const lien = `/p/${p.id}/obs/${o.id}`;
      if (o.echeance && o.echeance < auj)
        echues.push({ key: o.id, projet: p, date: o.echeance, label: `${pastilleLabel(o.numero)} ${o.actionDemandee || o.titre || 'Sans titre'}`, detail: o.entreprise, badge: `+${diffDays(o.echeance, auj)} j`, link: lien });
      else if (o.echeance && o.echeance <= limite)
        aVenir.push({ key: o.id, projet: p, date: o.echeance, label: `Échéance ${pastilleLabel(o.numero)} ${o.titre}`, detail: o.entreprise, link: lien });
    }
    for (const { sb, a } of sousBlocsEnRetard(p, auj).filter((x) => x.a.state !== 'termine'))
      retards.push({ key: sb.id, projet: p, label: `${codeSousBloc(p, sb.id)} ${sb.nom}`, detail: sb.entreprise, badge: formatEcart(a.ecartFin ?? a.ecartDebut), link: `/p/${p.id}/gantt` });
    for (const b of p.blocs)
      for (const sb of b.sousBlocs) {
        const a = analyseSousBloc(sb, auj);
        if (sb.debutPrevu && !sb.debutReel && sb.debutPrevu >= auj && sb.debutPrevu <= limite)
          aVenir.push({ key: 'd' + sb.id, projet: p, date: sb.debutPrevu, label: `Début ${sb.nom}`, detail: sb.entreprise, link: `/p/${p.id}/gantt` });
        if (sb.finPrevue && a.state !== 'termine' && sb.finPrevue >= auj && sb.finPrevue <= limite)
          aVenir.push({ key: 'f' + sb.id, projet: p, date: sb.finPrevue, label: `Fin ${sb.nom}`, detail: sb.entreprise, link: `/p/${p.id}/gantt` });
      }
    const dernier = [...p.comptesRendus].sort((a, b) => (a.date < b.date ? 1 : -1))[0];
    if (dernier?.prochaineVisite && dernier.prochaineVisite >= auj && dernier.prochaineVisite <= limite)
      aVenir.push({ key: 'v' + dernier.id, projet: p, date: dernier.prochaineVisite, label: 'Visite de chantier', link: `/p/${p.id}/cr` });
  }
  echues.sort((a, b) => (a.date! < b.date! ? -1 : 1));
  aVenir.sort((a, b) => (a.date! < b.date! ? -1 : 1));

  if (projects.length === 0)
    return (
      <Empty title="Aucun projet">
        <p>La vue d’ensemble regroupera les échéances et retards de tous vos chantiers.</p>
        <a className="btn" href={href('/')}>Mes projets</a>
      </Empty>
    );

  return (
    <div className="stack lg">
      <div className="small muted">
        Ce qui demande votre attention sur tous les chantiers actifs (hors projets terminés ou suspendus).
      </div>
      <div className="grid c4">
        <a className="card kpi" href={href('/')} style={{ textDecoration: 'none', color: 'inherit' }} title="Voir mes projets">
          <div className="v">{actifs.length}</div>
          <div className="l eyebrow">Chantiers actifs</div>
          <div className="tiny muted" style={{ marginTop: 6 }}>Voir mes projets →</div>
        </a>
        <div className="card kpi"><div className="v">{ouvertes}</div><div className="l eyebrow">Observations ouvertes</div></div>
        <div className="card kpi"><div className={'v' + (echues.length ? ' late' : '')}>{echues.length}</div><div className="l eyebrow">Échéances dépassées</div></div>
        <div className="card kpi"><div className={'v' + (retards.length ? ' late' : '')}>{retards.length}</div><div className="l eyebrow">Lots en retard</div></div>
      </div>
      <div className="grid c3">
        <Liste titre="Échéances dépassées" vide="Aucune échéance dépassée. 👌" lignes={echues} badgeClass="late" />
        <Liste titre="Lots en retard" vide="Aucun lot en retard." lignes={retards} badgeClass="late" />
        <Liste titre={`Dans les ${HORIZON} prochains jours`} vide="Rien de prévu." lignes={aVenir} auj={auj} />
      </div>
    </div>
  );
}

function Liste({ titre, vide, lignes, badgeClass, auj }: { titre: string; vide: string; lignes: Ligne[]; badgeClass?: string; auj?: string }) {
  const [tout, setTout] = useState(false);
  const shown = tout ? lignes : lignes.slice(0, 6);
  return (
    <div className="card">
      <h3>{titre} {lignes.length > 0 && <span className="muted small">({lignes.length})</span>}</h3>
      {lignes.length === 0 ? (
        <div className="small muted">{vide}</div>
      ) : (
        <div className="list">
          {shown.map((l) => (
            <a key={l.key} className="item" href={href(l.link)} style={{ alignItems: 'flex-start' }}>
              {l.date && auj && <span className="mono small" style={{ width: 44 }}>{fmtShort(l.date)}</span>}
              <span className="grow" style={{ minWidth: 0 }}>
                <span style={{ display: 'block', wordBreak: 'break-word' }}>{l.label}</span>
                <span className="tiny muted">
                  N° {String(l.projet.info.numero).padStart(2, '0')} {l.projet.info.nom}
                  {l.detail && ` · ${l.detail}`}
                  {l.date && !auj && ` · ${fmt(l.date)}`}
                </span>
              </span>
              {l.badge && <span className={'tag ' + (badgeClass || '')}>{l.badge}</span>}
              {auj && l.date && <span className="tiny muted nowrap">J-{diffDays(auj, l.date)}</span>}
            </a>
          ))}
          {lignes.length > 6 && (
            <button className="btn ghost sm" style={{ marginTop: 6 }} onClick={() => setTout(!tout)}>
              {tout ? 'Réduire' : `Voir les ${lignes.length - 6} autres`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
