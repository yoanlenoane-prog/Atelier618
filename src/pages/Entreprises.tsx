import { useEffect } from 'react';
import type { Project } from '../types';
import { useStore } from '../store';
import { href } from '../router';
import { diffDays, fmt, fmtLong } from '../lib/dates';
import { OBS_STATUS_LABEL } from '../lib/labels';
import { TASK_STATE_LABEL, codeSousBloc, formatEcart, nomPastille } from '../lib/planning';
import { entreprisesDuProjet, type FicheEntreprise } from '../lib/entreprises';
import { ObsBlock } from '../components/ReportDocument';
import { Logo } from '../components/Logo';
import { Empty, Progress, imprimerQuandPret, useToday } from '../components/ui';
import { IconBack, IconPrint } from '../components/Icons';

const lienFiche = (p: Project, f: FicheEntreprise) => `/p/${p.id}/entreprises/${encodeURIComponent(f.cle)}`;

/** Liste des entreprises du projet, avec ce qu'il leur reste à faire. */
export function Entreprises({ p, cle }: { p: Project; cle?: string }) {
  const auj = useToday();
  const fiches = entreprisesDuProjet(p, auj);
  if (cle) {
    const f = fiches.find((x) => x.cle === cle);
    if (!f) return <Empty title="Entreprise introuvable"><a className="btn ghost" href={href(`/p/${p.id}/entreprises`)}>Retour</a></Empty>;
    return (
      <div className="stack lg">
        <div className="row between wrap">
          <a className="btn ghost" href={href(`/p/${p.id}/entreprises`)}><IconBack /> Toutes les entreprises</a>
          <a className="btn" href={href(lienFiche(p, f) + '/imprimer')}><IconPrint /> Imprimer / PDF (relance)</a>
        </div>
        <FicheDocument p={p} f={f} auj={auj} />
      </div>
    );
  }

  return (
    <div className="stack lg">
      <div className="section-title">
        <div>
          <h2>Entreprises</h2>
          <div className="small muted">
            Ce qui reste à faire pour chaque entreprise : observations ouvertes, échéances dépassées, tâches en retard. Ouvrez une fiche pour l’imprimer et l’envoyer en relance.
          </div>
        </div>
      </div>
      {fiches.length === 0 ? (
        <Empty title="Aucune entreprise">
          <p>Ajoutez les entreprises dans <a href={href(`/p/${p.id}/infos`)}>Informations</a>, puis attribuez-leur des tâches et des observations.</p>
        </Empty>
      ) : (
        <div className="grid c3">
          {fiches.map((f) => {
            const avancement = f.lots.length ? Math.round(f.lots.reduce((n, l) => n + l.a.avancement, 0) / f.lots.length) : undefined;
            return (
              <a key={f.cle} className="card stack" href={href(lienFiche(p, f))} style={{ textDecoration: 'none', color: 'inherit', gap: 10 }}>
                <div>
                  <div className="serif" style={{ fontSize: 17, textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 500 }}>{f.nom}</div>
                  <div className="tiny muted">{[f.lot, f.contact].filter(Boolean).join(' · ') || ' '}</div>
                </div>
                <div className="row wrap" style={{ gap: 6 }}>
                  <span className={'tag ' + (f.ouvertes.length ? 'prog' : '')}>{f.ouvertes.length} observation{f.ouvertes.length > 1 ? 's' : ''} ouverte{f.ouvertes.length > 1 ? 's' : ''}</span>
                  {f.echues.length > 0 && <span className="tag late">{f.echues.length} échéance{f.echues.length > 1 ? 's' : ''} dépassée{f.echues.length > 1 ? 's' : ''}</span>}
                  {f.lotsEnRetard.length > 0 && <span className="tag late">{f.lotsEnRetard.length} tâche{f.lotsEnRetard.length > 1 ? 's' : ''} en retard</span>}
                  {!f.ouvertes.length && !f.lotsEnRetard.length && <span className="tag early">À jour</span>}
                </div>
                {avancement !== undefined && (
                  <div>
                    <div className="tiny muted" style={{ marginBottom: 4 }}>{f.lots.length} tâche{f.lots.length > 1 ? 's' : ''} · avancement {avancement} %</div>
                    <Progress value={avancement} />
                  </div>
                )}
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Fiche entreprise (écran, impression, PDF) : sert de courrier de relance. */
function FicheDocument({ p, f, auj }: { p: Project; f: FicheEntreprise; auj: string }) {
  return (
    <article className="report">
      <div className="r-head">
        <div>
          <Logo />
          <div style={{ fontSize: 10.5, color: '#777', letterSpacing: '0.2em', textTransform: 'uppercase', marginTop: 10 }}>Maîtrise d’œuvre</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#777' }}>Points à traiter</div>
          <h1>{f.nom}</h1>
          <div>{fmtLong(auj)}</div>
        </div>
      </div>

      <dl className="r-meta">
        <dt>Chantier</dt><dd>{p.info.nom}{p.info.adresse && ` — ${p.info.adresse}`}</dd>
        {f.lot && (<><dt>Corps d’état</dt><dd>{f.lot}</dd></>)}
        {f.contact && (<><dt>Contact</dt><dd>{f.contact}</dd></>)}
        <dt>Observations ouvertes</dt><dd>{f.ouvertes.length}{f.echues.length > 0 && ` dont ${f.echues.length} avec échéance dépassée`}</dd>
      </dl>

      {f.echues.length > 0 && (
        <>
          <h2>Échéances dépassées</h2>
          <table>
            <thead><tr><th>Pastille</th><th>Action demandée</th><th>Échéance</th><th>Retard</th></tr></thead>
            <tbody>
              {f.echues.map((o) => (
                <tr key={o.id}>
                  <td className="nowrap"><strong>{nomPastille(p, o)}</strong></td>
                  <td>{o.actionDemandee || o.titre}</td>
                  <td className="nowrap">{fmt(o.echeance)}</td>
                  <td className="nowrap" style={{ color: '#a3412c', fontWeight: 700 }}>
                    {diffDays(o.echeance!, auj)} j
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {f.lots.length > 0 && (
        <>
          <h2>Planning des tâches</h2>
          <table>
            <thead><tr><th>Tâche</th><th>Prévu</th><th>Réel</th><th>État</th><th>Écart</th></tr></thead>
            <tbody>
              {f.lots.map(({ sb, a }) => (
                <tr key={sb.id}>
                  <td>{codeSousBloc(p, sb.id)} {sb.nom}</td>
                  <td className="nowrap">{fmt(sb.debutPrevu)} → {fmt(sb.finPrevue)}</td>
                  <td className="nowrap">{sb.debutReel ? `${fmt(sb.debutReel)} → ${sb.finReelle ? fmt(sb.finReelle) : 'en cours'}` : '—'}</td>
                  <td className="nowrap">{TASK_STATE_LABEL[a.state]}{a.state === 'en_cours' || a.state === 'en_depassement' ? ` (${a.avancement} %)` : ''}</td>
                  <td className="nowrap" style={a.enRetard ? { color: '#a3412c', fontWeight: 700 } : undefined}>{formatEcart(a.ecartFin ?? a.ecartDebut) || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      <h2>Observations ouvertes</h2>
      {f.ouvertes.length === 0 ? <p>Aucune observation ouverte. Merci !</p> : f.ouvertes.map((o) => <ObsBlock key={o.id} p={p} o={o} showLoc />)}

      {f.terminees.length > 0 && (
        <>
          <h2>Observations levées</h2>
          <p style={{ color: '#555' }}>
            {f.terminees.map((o) => `${nomPastille(p, o)} ${o.titre || 'Sans titre'} (${OBS_STATUS_LABEL[o.statut].toLowerCase()})`).join(' · ')}
          </p>
        </>
      )}

      <div className="r-foot">
        <span>{p.info.nom} — {f.nom} — {fmt(auj)}</span>
        <span>{p.info.architecte || 'Atelier 618'}</span>
      </div>
    </article>
  );
}

/** Page d'impression plein écran de la fiche entreprise. */
export function EntreprisePrint({ projectId, cle }: { projectId: string; cle: string }) {
  const p = useStore().get(projectId);
  const auj = useToday();
  const f = p ? entreprisesDuProjet(p, auj).find((x) => x.cle === cle) : undefined;
  useEffect(() => {
    if (!p || !f) return;
    const prev = document.title;
    document.title = `${f.nom} - ${p.info.nom} - ${auj}`;
    return () => {
      document.title = prev;
    };
  }, [p, f, auj]);
  if (!p || !f) return <div className="empty">Entreprise introuvable</div>;
  return (
    <div style={{ padding: '16px 16px 60px' }}>
      <div className="row between wrap no-print" style={{ maxWidth: 820, margin: '0 auto 16px' }}>
        <a className="btn ghost" href={href(lienFiche(p, f))}><IconBack /> Retour</a>
        <div className="row">
          <span className="small muted">Choisissez « Enregistrer au format PDF » comme imprimante.</span>
          <button className="btn" onClick={() => imprimerQuandPret()}><IconPrint /> Imprimer / PDF</button>
        </div>
      </div>
      <FicheDocument p={p} f={f} auj={auj} />
    </div>
  );
}
