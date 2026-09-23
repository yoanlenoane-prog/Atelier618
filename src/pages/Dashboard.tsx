import type { ContentItem, Project } from '../types';
import { href } from '../router';
import { diffDays, fmt, fmtShort } from '../lib/dates';
import { pastilleLabel } from '../lib/ids';
import { analyseSousBloc, avancementProjet, codeSousBloc, formatEcart, isOpen, sousBlocsEnRetard } from '../lib/planning';
import { PROJECT_STATUS_LABEL } from '../lib/labels';
import { FileImage } from '../components/FileImage';
import { Progress, useToday } from '../components/ui';
import { IconDocs, IconGantt, IconInfo, IconObs, IconPlan, IconReport, IconSearch, IconStructure } from '../components/Icons';

export function Dashboard({ p }: { p: Project }) {
  const auj = useToday();
  const pct = avancementProjet(p, auj);
  const jours = p.info.dateFinPrevue ? diffDays(auj, p.info.dateFinPrevue) : undefined;
  const retards = sousBlocsEnRetard(p, auj);
  const count = (s: string) => p.observations.filter((o) => o.statut === s).length;
  const crs = [...p.comptesRendus].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 4);
  const photos = p.observations
    .flatMap((o) => o.contenu.filter((c): c is ContentItem & { type: 'photo' } => c.type === 'photo').map((c) => ({ c, o })))
    .sort((a, b) => b.o.updatedAt - a.o.updatedAt)
    .slice(0, 8);

  // Prochaines échéances : débuts / fins prévus dans les 30 jours + échéances d'observations
  const echeances: { date: string; label: string; link: string }[] = [];
  for (const b of p.blocs)
    for (const sb of b.sousBlocs) {
      const a = analyseSousBloc(sb, auj);
      if (sb.debutPrevu && !sb.debutReel && sb.debutPrevu >= auj) echeances.push({ date: sb.debutPrevu, label: `Début ${sb.nom}`, link: `/p/${p.id}/gantt` });
      if (sb.finPrevue && a.state !== 'termine' && sb.finPrevue >= auj) echeances.push({ date: sb.finPrevue, label: `Fin ${sb.nom}`, link: `/p/${p.id}/gantt` });
    }
  for (const o of p.observations)
    if (o.echeance && isOpen(o) && o.echeance >= auj) echeances.push({ date: o.echeance, label: `${pastilleLabel(o.numero)} ${o.titre}`, link: `/p/${p.id}/obs/${o.id}` });
  echeances.sort((a, b) => (a.date < b.date ? -1 : 1));

  const shortcuts = [
    { to: 'gantt', label: 'Gantt', icon: IconGantt },
    { to: 'plans', label: 'Plans', icon: IconPlan },
    { to: 'obs', label: 'Observations', icon: IconObs },
    { to: 'cr', label: 'Comptes rendus', icon: IconReport },
    { to: 'docs', label: 'Documents', icon: IconDocs },
    { to: 'structure', label: 'Blocs & sous-blocs', icon: IconStructure },
    { to: 'infos', label: 'Informations', icon: IconInfo },
    { to: 'recherche', label: 'Recherche', icon: IconSearch },
  ];

  return (
    <div className="stack lg">
      <div className="row between wrap">
        <div>
          <div className="eyebrow">Projet {String(p.info.numero).padStart(2, '0')} · {PROJECT_STATUS_LABEL[p.info.statut]}</div>
          <div className="muted small">{[p.info.adresse, p.info.client].filter(Boolean).join(' — ')}</div>
        </div>
      </div>

      <div className="grid c4">
        <div className="card kpi">
          <div className="v">{pct} %</div>
          <div className="l eyebrow">Avancement estimé</div>
          <div style={{ marginTop: 10 }}><Progress value={pct} /></div>
        </div>
        <div className="card kpi">
          <div className={'v' + (jours !== undefined && jours < 0 ? ' late' : '')}>{jours === undefined ? '—' : Math.abs(jours)}</div>
          <div className="l eyebrow">{jours === undefined ? 'Fin prévue non saisie' : jours >= 0 ? `jours avant la fin (${fmt(p.info.dateFinPrevue)})` : 'jours de dépassement'}</div>
        </div>
        <a className="card kpi" href={href(`/p/${p.id}/gantt`)} style={{ textDecoration: 'none' }}>
          <div className={'v' + (retards.length ? ' late' : '')}>{retards.length}</div>
          <div className="l eyebrow">Sous-blocs en retard</div>
        </a>
        <a className="card kpi" href={href(`/p/${p.id}/obs?statut=ouvertes`)} style={{ textDecoration: 'none' }}>
          <div className="v">{count('a_faire') + count('en_cours')}</div>
          <div className="l eyebrow">Observations ouvertes</div>
          <div className="tiny muted" style={{ marginTop: 6 }}>
            {count('a_faire')} à faire · {count('en_cours')} en cours · {count('termine')} terminées
          </div>
        </a>
      </div>

      <div className="grid c2">
        <div className="card">
          <h3>Planning — retards</h3>
          {retards.length === 0 ? (
            <div className="small muted">Aucun sous-bloc en retard. 👌</div>
          ) : (
            <div className="list">
              {retards.map(({ sb, a }) => (
                <a key={sb.id} className="item" href={href(`/p/${p.id}/gantt`)}>
                  <span className="tiny muted mono">{codeSousBloc(p, sb.id)}</span>
                  <span className="grow">{sb.nom}</span>
                  <span className="tag late">{formatEcart(a.ecartFin ?? a.ecartDebut)}</span>
                </a>
              ))}
            </div>
          )}
        </div>
        <div className="card">
          <h3>Prochaines échéances</h3>
          {echeances.length === 0 ? (
            <div className="small muted">Rien de prévu prochainement.</div>
          ) : (
            <div className="list">
              {echeances.slice(0, 6).map((e, i) => (
                <a key={i} className="item" href={href(e.link)}>
                  <span className="mono small" style={{ width: 48 }}>{fmtShort(e.date)}</span>
                  <span className="grow">{e.label}</span>
                  <span className="tiny muted">J-{diffDays(auj, e.date)}</span>
                </a>
              ))}
            </div>
          )}
        </div>
        <div className="card">
          <div className="row between">
            <h3>Dernières visites</h3>
            <a className="small" href={href(`/p/${p.id}/cr`)}>Tout voir</a>
          </div>
          {crs.length === 0 ? (
            <div className="small muted">Aucun compte rendu.</div>
          ) : (
            <div className="list">
              {crs.map((c) => (
                <a key={c.id} className="item" href={href(`/p/${p.id}/cr/${c.id}`)}>
                  <strong>CR {String(c.numero).padStart(3, '0')}</strong>
                  <span className="grow muted small">{fmt(c.date)}</span>
                  <span className="tiny muted">{c.observationIds.length} obs.</span>
                </a>
              ))}
            </div>
          )}
        </div>
        <div className="card">
          <h3>Dernières photos</h3>
          {photos.length === 0 ? (
            <div className="small muted">Aucune photo.</div>
          ) : (
            <div className="thumbs">
              {photos.map(({ c, o }) => (
                <a key={c.id} className="thumb" href={href(`/p/${p.id}/obs/${o.id}`)} title={`${pastilleLabel(o.numero)} ${o.titre}`}>
                  <FileImage file={c.file} />
                </a>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid c4">
        {shortcuts.map((s) => (
          <a key={s.to} className="card row" href={href(`/p/${p.id}/${s.to}`)} style={{ textDecoration: 'none', padding: '14px 16px' }}>
            <s.icon width={20} height={20} />
            <span>{s.label}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
