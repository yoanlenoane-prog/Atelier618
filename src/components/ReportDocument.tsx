import type { CompteRendu, Observation, Project } from '../types';
import { fmt, fmtLong } from '../lib/dates';
import { pastilleLabel } from '../lib/ids';
import { OBS_STATUS_LABEL } from '../lib/labels';
import { avancementProjet, codeSousBloc, findSousBloc, formatEcart, isOpen, sousBlocsEnRetard } from '../lib/planning';
import { FileImage } from './FileImage';
import { PlanView } from './PlanView';

function ObsBlock({ p, o, showLoc }: { p: Project; o: Observation; showLoc?: boolean }) {
  const sb = findSousBloc(p, o.sousBlocId);
  const photos = o.contenu.filter((c) => c.type === 'photo');
  const plan = p.plans.find((x) => x.id === o.planId);
  return (
    <div className="r-obs">
      <div className="row wrap" style={{ gap: 8 }}>
        <span className={'pchip ' + o.statut} style={{ printColorAdjust: 'exact' }}>{pastilleLabel(o.numero)}</span>
        <span className="ttl">{o.titre || 'Sans titre'}</span>
        <span style={{ color: '#777', fontSize: 12 }}>
          {showLoc && sb && `${codeSousBloc(p, sb.sb.id)} ${sb.sb.nom} · `}
          {OBS_STATUS_LABEL[o.statut]} · {fmt(o.date)}
          {plan && ` · ${plan.nom}`}
          {o.entreprise && ` · ${o.entreprise}`}
        </span>
      </div>
      {o.contenu.map((c) =>
        c.type === 'texte' ? (
          c.texte.trim() && <p key={c.id} style={{ margin: '6px 0', whiteSpace: 'pre-line' }}>{c.texte}</p>
        ) : null
      )}
      {photos.length > 0 && (
        <div className="r-photos">
          {photos.map((c) => c.type === 'photo' && <FileImage key={c.id} file={c.file} alt={c.legende} />)}
        </div>
      )}
      {o.actionDemandee && (
        <p style={{ margin: '6px 0 0' }}>
          <strong>Action demandée : </strong>
          {o.actionDemandee}
          {o.echeance && <em> — pour le {fmt(o.echeance)}</em>}
        </p>
      )}
    </div>
  );
}

/** Mise en page du compte rendu (aperçu, impression, PDF). */
export function ReportDocument({ p, cr, auj }: { p: Project; cr: CompteRendu; auj: string }) {
  const obs = cr.observationIds.map((id) => p.observations.find((o) => o.id === id)).filter((o): o is Observation => !!o).sort((a, b) => a.numero - b.numero);
  const retards = sousBlocsEnRetard(p, cr.date <= auj ? cr.date : auj);
  const plans = p.plans.filter((pl) => obs.some((o) => o.planId === pl.id && o.x !== undefined));
  const actions = obs.filter(isOpen).filter((o) => o.actionDemandee || o.entreprise);
  const rub = (id: string) => (cr.rubriques[id] || '').trim();

  return (
    <article className="report">
      <div className="r-head">
        <div>
          <div className="r-logo">{p.info.architecte || 'Atelier 618'}</div>
          <div style={{ fontSize: 11, color: '#777', letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: 4 }}>Maîtrise d’œuvre</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#777' }}>Compte rendu de chantier</div>
          <h1>N° {String(cr.numero).padStart(3, '0')}</h1>
          <div>{fmtLong(cr.date)}</div>
        </div>
      </div>

      <h1 style={{ fontSize: 28, marginBottom: 10 }}>{p.info.nom}</h1>
      <dl className="r-meta">
        {p.info.adresse && (<><dt>Adresse</dt><dd>{p.info.adresse}</dd></>)}
        {p.info.maitreOuvrage && (<><dt>Maître d’ouvrage</dt><dd>{p.info.maitreOuvrage}</dd></>)}
        {p.info.maitreOeuvre && (<><dt>Maître d’œuvre</dt><dd>{p.info.maitreOeuvre}</dd></>)}
        {cr.participants && (<><dt>Participants</dt><dd>{cr.participants}</dd></>)}
        {cr.meteo && (<><dt>Météo</dt><dd>{cr.meteo}</dd></>)}
        <dt>Avancement estimé</dt><dd>{avancementProjet(p, cr.date)} %{p.info.dateFinPrevue && ` — fin prévue le ${fmt(p.info.dateFinPrevue)}`}</dd>
        {cr.prochaineVisite && (<><dt>Prochaine visite</dt><dd>{fmtLong(cr.prochaineVisite)}</dd></>)}
      </dl>

      {cr.notesGenerales?.trim() && (
        <>
          <h2>Généralités</h2>
          <p style={{ whiteSpace: 'pre-line' }}>{cr.notesGenerales}</p>
        </>
      )}

      {cr.inclurePlanning !== false && retards.length > 0 && (
        <>
          <h2>Planning — points de vigilance</h2>
          <table>
            <thead><tr><th>Lot</th><th>Prévu</th><th>Réel</th><th>Écart</th></tr></thead>
            <tbody>
              {retards.map(({ sb, a }) => (
                <tr key={sb.id}>
                  <td>{codeSousBloc(p, sb.id)} {sb.nom}{sb.entreprise && <span style={{ color: '#777' }}> — {sb.entreprise}</span>}</td>
                  <td className="nowrap">{fmt(sb.debutPrevu)} → {fmt(sb.finPrevue)}</td>
                  <td className="nowrap">{fmt(sb.debutReel)} → {sb.finReelle ? fmt(sb.finReelle) : 'en cours'}</td>
                  <td className="nowrap" style={{ color: '#a3412c', fontWeight: 700 }}>{formatEcart(a.ecartFin ?? a.ecartDebut)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {cr.inclurePlans && plans.length > 0 && (
        <>
          <h2>Localisation des observations</h2>
          {plans.map((pl) => (
            <div key={pl.id}>
              <h3>{pl.nom}</h3>
              <div className="r-plan">
                <PlanView plan={pl} observations={obs.filter((o) => o.planId === pl.id)} zoom={1} static />
              </div>
            </div>
          ))}
        </>
      )}

      {cr.mode === 'pastille' ? (
        <>
          {obs.length > 0 && <h2>Observations</h2>}
          {obs.map((o) => <ObsBlock key={o.id} p={p} o={o} showLoc />)}
          {p.blocs.some((b) => rub(b.id) || b.sousBlocs.some((s) => rub(s.id))) && <h2>Notes par lot</h2>}
          {p.blocs.map((b, bi) => (
            <div key={b.id}>
              {rub(b.id) && <><h3>{String(bi + 1).padStart(2, '0')} — {b.nom}</h3><p style={{ whiteSpace: 'pre-line' }}>{rub(b.id)}</p></>}
              {b.sousBlocs.map((s, si) => rub(s.id) && (
                <div key={s.id}>
                  <h3>{String(bi + 1).padStart(2, '0')}.{String(si + 1).padStart(2, '0')} — {s.nom}</h3>
                  <p style={{ whiteSpace: 'pre-line' }}>{rub(s.id)}</p>
                </div>
              ))}
            </div>
          ))}
        </>
      ) : (
        <>
          {p.blocs.map((b, bi) => {
            const inBloc = obs.filter((o) => o.blocId === b.id);
            const hasContent = rub(b.id) || inBloc.length || b.sousBlocs.some((s) => rub(s.id));
            if (!hasContent) return null;
            const direct = inBloc.filter((o) => !o.sousBlocId || !b.sousBlocs.some((s) => s.id === o.sousBlocId));
            return (
              <section key={b.id}>
                <h2>{String(bi + 1).padStart(2, '0')} — {b.nom}</h2>
                {rub(b.id) && <p style={{ whiteSpace: 'pre-line' }}>{rub(b.id)}</p>}
                {direct.map((o) => <ObsBlock key={o.id} p={p} o={o} />)}
                {b.sousBlocs.map((s, si) => {
                  const os = inBloc.filter((o) => o.sousBlocId === s.id);
                  if (!os.length && !rub(s.id)) return null;
                  return (
                    <div key={s.id}>
                      <h3>{String(bi + 1).padStart(2, '0')}.{String(si + 1).padStart(2, '0')} — {s.nom.toUpperCase()}</h3>
                      {rub(s.id) && <p style={{ whiteSpace: 'pre-line' }}>{rub(s.id)}</p>}
                      {os.map((o) => <ObsBlock key={o.id} p={p} o={o} />)}
                    </div>
                  );
                })}
              </section>
            );
          })}
          {obs.filter((o) => !p.blocs.some((b) => b.id === o.blocId)).length > 0 && (
            <>
              <h2>Autres observations</h2>
              {obs.filter((o) => !p.blocs.some((b) => b.id === o.blocId)).map((o) => <ObsBlock key={o.id} p={p} o={o} />)}
            </>
          )}
        </>
      )}

      {actions.length > 0 && (
        <>
          <h2>Actions à réaliser</h2>
          <table>
            <thead><tr><th>Pastille</th><th>Action</th><th>Entreprise</th><th>Échéance</th></tr></thead>
            <tbody>
              {actions.map((o) => (
                <tr key={o.id}>
                  <td className="nowrap"><strong>{pastilleLabel(o.numero)}</strong></td>
                  <td>{o.actionDemandee || o.titre}</td>
                  <td>{o.entreprise || '—'}</td>
                  <td className="nowrap">{fmt(o.echeance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      <div className="r-foot">
        <span>{p.info.nom} — CR n°{String(cr.numero).padStart(3, '0')} du {fmt(cr.date)}</span>
        <span>{p.info.architecte || 'Atelier 618'}</span>
      </div>
    </article>
  );
}
