import { useEffect, useRef, useState } from 'react';
import type { CompteRendu, Project, ReportType } from '../types';
import { useStore } from '../store';
import { href, navigate } from '../router';
import { pastilleLabel, uid } from '../lib/ids';
import { fmt, today } from '../lib/dates';
import { storeLocal } from '../lib/files';
import { DOSSIER_CR } from '../lib/dossiers';
import { CR_CHANTIER, OBS_STATUS_LABEL, REPORT_TYPE, reunionCandidats } from '../lib/labels';
import { isOpen } from '../lib/planning';
import { Empty, Seg, toast, useToday } from '../components/ui';
import { ReportDocument } from '../components/ReportDocument';
import { IntemperiesCard, PresentsCard, RendezVousCard } from '../components/ReportExtras';
import { IconPrint, IconTrash } from '../components/Icons';

export function ReportEdit({ p, reportId }: { p: Project; reportId: string }) {
  const store = useStore();
  const auj = useToday();
  const stored = p.comptesRendus.find((c) => c.id === reportId);
  const [cr, setCr] = useState<CompteRendu | undefined>(stored);
  const [tab, setTab] = useState<'rediger' | 'apercu'>('rediger');
  const pending = useRef<CompteRendu | undefined>(undefined);
  const timer = useRef<number | undefined>(undefined);
  const pdfInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!pending.current) setCr(stored);
  }, [stored]);

  const flush = () => {
    window.clearTimeout(timer.current);
    const c = pending.current;
    pending.current = undefined;
    if (c) store.update(p.id, (d) => { d.comptesRendus = d.comptesRendus.map((x) => (x.id === c.id ? c : x)); });
  };
  useEffect(() => () => flush(), []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!cr) return <Empty title="Compte rendu introuvable"><a className="btn ghost" href={href(`/p/${p.id}/cr`)}>Retour</a></Empty>;

  const change = (c: CompteRendu) => {
    setCr(c);
    pending.current = c;
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(flush, 500);
  };
  const set = <K extends keyof CompteRendu>(k: K, v: CompteRendu[K]) => change({ ...cr, [k]: v });
  const toggleObs = (id: string) =>
    set('observationIds', cr.observationIds.includes(id) ? cr.observationIds.filter((x) => x !== id) : [...cr.observationIds, id]);

  const type = cr.type || 'avancement';
  const concernes = cr.concernes || [];
  const choix = type === 'reunion'
    ? reunionCandidats(p)
    : p.info.entreprises.filter((e) => e.nom).map((e) => ({ nom: e.nom, detail: e.lot }));
  // Changer d'objet réinitialise la sélection (entreprises ≠ participants)
  const setType = (t: ReportType) => t !== type && change({ ...cr, type: t, concernes: t === 'avancement' ? [CR_CHANTIER] : [] });
  const toggleConcerne = (nom: string) =>
    set('concernes', concernes.includes(nom) ? concernes.filter((x) => x !== nom) : [...concernes, nom]);

  const allObs = [...p.observations].sort((a, b) => a.numero - b.numero);
  const selection = allObs.filter((o) => cr.observationIds.includes(o.id));
  const rubrique = (id: string, label: string, obs: typeof allObs, strong = false) => (
    <div className="stack" style={{ gap: 6 }} key={id}>
      <label className="f">
        <span style={strong ? { color: 'var(--ink)', fontSize: 13 } : undefined}>{label}</span>
        <textarea style={{ minHeight: 56 }} value={cr.rubriques[id] || ''} onChange={(e) => set('rubriques', { ...cr.rubriques, [id]: e.target.value })} />
      </label>
      {obs.length > 0 && (
        <div className="rub-obs">
          {obs.map((o) => (
            <a key={o.id} className="rub-obs-item" href={href(`/p/${p.id}/obs/${o.id}`)} title="Ouvrir la pastille">
              <span className={'pchip ' + o.statut}>{pastilleLabel(o.numero)}</span>
              <span className="grow">{o.titre || 'Sans titre'}</span>
              <span className="tiny muted nowrap">{OBS_STATUS_LABEL[o.statut]}</span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
  const sansTache = selection.filter((o) => !p.blocs.some((b) => b.id === o.blocId));

  const attachPdf = async (f: File) => {
    const ref = await storeLocal(f, f.name);
    await store.update(p.id, (d) => {
      d.documents.push({ id: uid('d'), nom: f.name, file: ref, date: today(), dossierId: DOSSIER_CR, updatedAt: Date.now() });
    });
    toast('PDF ajouté — il sera envoyé dans « Comptes rendus » sur Drive');
  };

  return (
    <div className="stack lg">
      <div className="row between wrap">
        <Seg value={tab} onChange={setTab} options={[['rediger', 'Rédiger'], ['apercu', 'Aperçu']]} />
        <div className="row wrap">
          <button className="btn" onClick={() => { flush(); navigate(`/p/${p.id}/cr/${cr.id}/imprimer`); }}>
            <IconPrint /> Exporter en PDF
          </button>
          <button className="btn ghost" onClick={() => pdfInput.current?.click()}>Joindre le PDF à Drive</button>
          <input ref={pdfInput} type="file" accept="application/pdf" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) attachPdf(f); }} />
        </div>
      </div>

      {tab === 'apercu' ? (
        <ReportDocument p={p} cr={cr} auj={auj} />
      ) : (
        <>
          <div className="card">
            <h2>Compte rendu n°{String(cr.numero).padStart(3, '0')}</h2>
            <div className="form-grid">
              <label className="f">
                N°
                <input type="number" min={1} value={cr.numero} onChange={(e) => set('numero', Math.max(1, Number(e.target.value) || 1))} />
              </label>
              <label className="f">
                Date de visite
                <input type="date" value={cr.date} onChange={(e) => set('date', e.target.value || today())} />
              </label>
              <label className="f">
                Météo
                <input type="text" value={cr.meteo || ''} placeholder="ex. Ensoleillé, 18 °C" onChange={(e) => set('meteo', e.target.value)} />
              </label>
              <label className="f full">
                Généralités
                <textarea value={cr.notesGenerales || ''} onChange={(e) => set('notesGenerales', e.target.value)} />
              </label>
            </div>
          </div>

          <div className="card">
            <div className="row between wrap">
              <h2>Objet du compte rendu</h2>
              <Seg value={type} onChange={setType} options={REPORT_TYPE} />
            </div>
            {type === 'reunion' ? (
              <div className="small muted" style={{ margin: '4px 0 0' }}>
                Cochez les participants dans « Personnes présentes » ci-dessous.
                {concernes.length > 0 && (
                  <> Participants déjà notés (ancien format) : {concernes.join(', ')}.{' '}
                    <button className="linkbtn" onClick={() => set('concernes', [])}>Effacer</button>
                  </>
                )}
              </div>
            ) : (
            <>
            <div className="small muted" style={{ margin: '4px 0 8px' }}>Entreprises concernées :</div>
            <div className="list">
              {type === 'avancement' && (
                <label className="item check" style={{ cursor: 'pointer' }}>
                  <input type="checkbox" checked={concernes.includes(CR_CHANTIER)} onChange={() => toggleConcerne(CR_CHANTIER)} />
                  <span className="grow"><strong>Chantier</strong> <span className="tiny muted">— l’ensemble du chantier</span></span>
                </label>
              )}
              {choix.map((c) => (
                <label key={c.nom} className="item check" style={{ cursor: 'pointer' }}>
                  <input type="checkbox" checked={concernes.includes(c.nom)} onChange={() => toggleConcerne(c.nom)} />
                  <span className="grow">{c.nom}{c.detail && <span className="tiny muted"> — {c.detail}</span>}</span>
                </label>
              ))}
            </div>
            {choix.length === 0 && (
              <div className="small muted">
                Aucune entreprise renseignée — ajoutez-les dans <a href={href(`/p/${p.id}/infos`)}>les informations du projet</a>.
              </div>
            )}
            </>
            )}
          </div>

          <PresentsCard p={p} cr={cr} set={set} change={change} />

          <IntemperiesCard cr={cr} set={set} />

          <div className="card">
            <h2>Interventions prévues dans les semaines à venir</h2>
            <textarea
              style={{ minHeight: 90 }}
              value={cr.interventionsPrevues || ''}
              placeholder="ex. Semaine 42 : pose des menuiseries extérieures (Menuiserie Le Goff). Semaine 43 : début des cloisons."
              onChange={(e) => set('interventionsPrevues', e.target.value || undefined)}
            />
            <p className="tiny muted" style={{ marginTop: 6 }}>Texte libre, indépendant du Gantt. Laissé vide, ce paragraphe n’apparaît pas.</p>
          </div>

          <RendezVousCard p={p} cr={cr} set={set} />

          <div className="card">
            <div className="row between wrap">
              <h2>Présentation</h2>
              <Seg value={cr.mode} onChange={(m) => set('mode', m)} options={[['bloc', 'Par lot / tâche'], ['pastille', 'Par pastille']]} />
            </div>
            <label className="check">
              <input type="checkbox" checked={cr.inclurePlans} onChange={(e) => set('inclurePlans', e.target.checked)} />
              Inclure les plans avec les pastilles
            </label>
            <label className="check" style={{ marginTop: 8 }}>
              <input type="checkbox" checked={cr.inclurePlanning !== false} onChange={(e) => set('inclurePlanning', e.target.checked)} />
              Inclure le paragraphe « Planning — points de vigilance »
            </label>
            <label className="check" style={{ marginTop: 8 }}>
              <input type="checkbox" checked={cr.afficherAvancement !== false} onChange={(e) => set('afficherAvancement', e.target.checked)} />
              Afficher l’avancement estimé
            </label>
            {type === 'avancement' && (
              <label className="check" style={{ marginTop: 8 }}>
                <input type="checkbox" checked={cr.inclureGanttEntreprises !== false} onChange={(e) => set('inclureGanttEntreprises', e.target.checked)} />
                Afficher le planning (Gantt) des tâches des entreprises concernées
              </label>
            )}
          </div>

          <div className="card">
            <div className="row between wrap">
              <h2>Observations ({cr.observationIds.length})</h2>
              <div className="row wrap">
                <button className="btn ghost sm" onClick={() => set('observationIds', Array.from(new Set([...cr.observationIds, ...p.observations.filter(isOpen).map((o) => o.id)])))}>+ Toutes les ouvertes</button>
                <button className="btn ghost sm" onClick={() => set('observationIds', [])}>Aucune</button>
              </div>
            </div>
            {allObs.length === 0 && <div className="muted small">Aucune observation dans ce projet.</div>}
            <div className="list">
              {allObs.map((o) => (
                <label key={o.id} className="item check" style={{ cursor: 'pointer' }}>
                  <input type="checkbox" checked={cr.observationIds.includes(o.id)} onChange={() => toggleObs(o.id)} />
                  <span className={'pchip ' + o.statut}>{pastilleLabel(o.numero)}</span>
                  <span className="grow">{o.titre || 'Sans titre'}</span>
                  <span className="tiny muted nowrap">{OBS_STATUS_LABEL[o.statut]} · {fmt(o.date)}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="card">
            <h2>Rubriques par lot / tâche</h2>
            <p className="small muted">Écrivez directement sous chaque rubrique ; les pastilles sélectionnées s’affichent sous la tâche associée. Les rubriques vides n’apparaissent pas dans le compte rendu.</p>
            <div className="stack">
              {p.blocs.map((b, bi) => (
                <div key={b.id} className="stack" style={{ gap: 8 }}>
                  {rubrique(
                    b.id,
                    `${String(bi + 1).padStart(2, '0')} — ${b.nom.toUpperCase()}`,
                    selection.filter((o) => o.blocId === b.id && (!o.sousBlocId || !b.sousBlocs.some((s) => s.id === o.sousBlocId))),
                    true
                  )}
                  <div className="stack" style={{ gap: 8, paddingLeft: 16, borderLeft: '2px solid var(--line)' }}>
                    {b.sousBlocs.map((s, si) =>
                      rubrique(s.id, `${String(bi + 1).padStart(2, '0')}.${String(si + 1).padStart(2, '0')} — ${s.nom}`, selection.filter((o) => o.sousBlocId === s.id))
                    )}
                  </div>
                </div>
              ))}
              {sansTache.length > 0 && (
                <div className="stack" style={{ gap: 6 }}>
                  <span className="eyebrow">Pastilles sans lot / tâche</span>
                  <div className="rub-obs">
                    {sansTache.map((o) => (
                      <a key={o.id} className="rub-obs-item" href={href(`/p/${p.id}/obs/${o.id}`)}>
                        <span className={'pchip ' + o.statut}>{pastilleLabel(o.numero)}</span>
                        <span className="grow">{o.titre || 'Sans titre'}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="row">
            <button
              className="btn danger"
              onClick={async () => {
                if (!window.confirm(`Supprimer le compte rendu n°${cr.numero} ? (les observations sont conservées)`)) return;
                pending.current = undefined;
                await store.update(p.id, (d) => { d.comptesRendus = d.comptesRendus.filter((x) => x.id !== cr.id); });
                navigate(`/p/${p.id}/cr`);
              }}
            >
              <IconTrash /> Supprimer ce compte rendu
            </button>
          </div>
        </>
      )}
    </div>
  );
}
