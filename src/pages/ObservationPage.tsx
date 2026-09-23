import type { Project } from '../types';
import { useStore } from '../store';
import { href, navigate } from '../router';
import { pastilleLabel } from '../lib/ids';
import { fmt } from '../lib/dates';
import { ObservationEditor } from '../components/ObservationEditor';
import { PlanView } from '../components/PlanView';
import { Empty, toast } from '../components/ui';
import { IconPlan, IconTrash } from '../components/Icons';

export function ObservationPage({ p, obsId }: { p: Project; obsId: string }) {
  const store = useStore();
  const o = p.observations.find((x) => x.id === obsId);
  if (!o)
    return (
      <Empty title="Observation introuvable">
        <a className="btn ghost" href={href(`/p/${p.id}/obs`)}>Retour aux observations</a>
      </Empty>
    );
  const plan = p.plans.find((x) => x.id === o.planId);
  const crs = p.comptesRendus.filter((c) => c.observationIds.includes(o.id)).sort((a, b) => a.numero - b.numero);

  return (
    <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))', alignItems: 'start' }}>
      <div className="card">
        <div className="row between" style={{ marginBottom: 14 }}>
          <span className={'pchip ' + o.statut} style={{ fontSize: 16, padding: '4px 14px' }}>{pastilleLabel(o.numero)}</span>
          <button
            className="btn danger sm"
            onClick={async () => {
              if (!window.confirm(`Supprimer l’observation ${pastilleLabel(o.numero)} ?`)) return;
              await store.update(p.id, (d) => {
                d.observations = d.observations.filter((x) => x.id !== o.id);
                d.comptesRendus = d.comptesRendus.map((c) => ({ ...c, observationIds: c.observationIds.filter((id) => id !== o.id) }));
              });
              toast('Observation supprimée');
              navigate(`/p/${p.id}/obs`);
            }}
          >
            <IconTrash /> Supprimer
          </button>
        </div>
        <ObservationEditor p={p} obsId={o.id} />
      </div>

      <div className="stack">
        <div className="card">
          <div className="row between">
            <h3 style={{ margin: 0 }}>Localisation</h3>
            {plan && (
              <a className="btn ghost sm" href={href(`/p/${p.id}/plans/${plan.id}?obs=${o.id}`)}>
                <IconPlan /> Voir sur le plan
              </a>
            )}
          </div>
          {plan && o.x !== undefined ? (
            <div style={{ marginTop: 10 }}>
              <div className="small muted" style={{ marginBottom: 6 }}>
                {plan.nom} — X = {Math.round(o.x * 100)} %, Y = {Math.round((o.y ?? 0) * 100)} %
              </div>
              <PlanView plan={plan} observations={[o]} zoom={1} static selectedId={o.id} />
            </div>
          ) : (
            <div className="stack" style={{ marginTop: 10 }}>
              <div className="small muted">Cette observation n’est pas placée sur un plan.</div>
              {p.plans.length > 0 && (
                <div className="row wrap">
                  {p.plans.map((pl) => (
                    <button
                      key={pl.id}
                      className="btn ghost sm"
                      onClick={async () => {
                        await store.update(p.id, (d) => {
                          d.observations = d.observations.map((x) => (x.id === o.id ? { ...x, planId: pl.id, x: 0.5, y: 0.5 } : x));
                        });
                        navigate(`/p/${p.id}/plans/${pl.id}?obs=${o.id}`);
                        toast('Pastille placée au centre : utilisez « Déplacer » pour l’ajuster');
                      }}
                    >
                      Placer sur {pl.nom}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        <div className="card">
          <h3>Comptes rendus</h3>
          {crs.length === 0 ? (
            <div className="small muted">Pas encore citée dans un compte rendu.</div>
          ) : (
            <div className="list">
              {crs.map((c) => (
                <a key={c.id} className="item" href={href(`/p/${p.id}/cr/${c.id}`)}>
                  <strong>CR n°{String(c.numero).padStart(3, '0')}</strong>
                  <span className="muted small">{fmt(c.date)}</span>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
