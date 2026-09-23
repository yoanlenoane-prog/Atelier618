import type { Project } from '../types';
import { useStore } from '../store';
import { href, navigate } from '../router';
import { uid } from '../lib/ids';
import { fmt, today } from '../lib/dates';
import { isOpen } from '../lib/planning';
import { Empty } from '../components/ui';
import { IconPlus } from '../components/Icons';

export function Reports({ p }: { p: Project }) {
  const store = useStore();
  const list = [...p.comptesRendus].sort((a, b) => b.numero - a.numero);

  const create = async () => {
    const last = list[0];
    const id = uid('r');
    const numero = Math.max(0, ...p.comptesRendus.map((c) => c.numero)) + 1;
    // Par défaut : observations ouvertes + observations modifiées depuis le dernier CR
    const since = last ? new Date(last.date).getTime() : 0;
    const obsIds = p.observations.filter((o) => isOpen(o) || o.updatedAt >= since).map((o) => o.id);
    await store.update(p.id, (d) => {
      d.comptesRendus.push({
        id,
        numero,
        date: today(),
        participants: last?.participants || [p.info.architecte && `${p.info.architecte} — architecte`, ...p.info.entreprises.map((e) => e.nom)].filter(Boolean).join('\n'),
        rubriques: {},
        observationIds: obsIds,
        mode: last?.mode || 'bloc',
        inclurePlans: last?.inclurePlans ?? true,
        inclurePlanning: last?.inclurePlanning ?? true,
        updatedAt: Date.now(),
      });
    });
    navigate(`/p/${p.id}/cr/${id}`);
  };

  return (
    <div className="stack lg">
      <div className="section-title">
        <div>
          <h2>Comptes rendus</h2>
          <div className="small muted">Chaque compte rendu reste accessible et reprend les observations dans leur contexte.</div>
        </div>
        <button className="btn" onClick={create}><IconPlus /> Nouveau compte rendu</button>
      </div>
      {list.length === 0 ? (
        <Empty title="Aucun compte rendu">
          <p>Après une visite de chantier, créez un compte rendu : les observations ouvertes y sont ajoutées automatiquement.</p>
        </Empty>
      ) : (
        <div className="card" style={{ padding: '4px 16px' }}>
          <div className="list">
            {list.map((c) => (
              <a key={c.id} className="item" href={href(`/p/${p.id}/cr/${c.id}`)}>
                <span className="serif" style={{ fontSize: 26, width: 64 }}>{String(c.numero).padStart(3, '0')}</span>
                <div className="grow">
                  <div style={{ fontWeight: 500 }}>CR n°{String(c.numero).padStart(3, '0')} — {fmt(c.date)}</div>
                  <div className="tiny muted">
                    {c.observationIds.length} observation{c.observationIds.length > 1 ? 's' : ''} · {c.mode === 'bloc' ? 'par bloc' : 'par pastille'}
                    {c.participants && ` · ${c.participants.split('\n').filter(Boolean).length} participant(s)`}
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
