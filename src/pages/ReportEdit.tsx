import { useEffect, useRef, useState } from 'react';
import type { CompteRendu, Project } from '../types';
import { useStore } from '../store';
import { href, navigate } from '../router';
import { pastilleLabel, uid } from '../lib/ids';
import { fmt, today } from '../lib/dates';
import { storeLocal } from '../lib/files';
import { OBS_STATUS_LABEL } from '../lib/labels';
import { isOpen } from '../lib/planning';
import { Empty, Seg, toast, useToday } from '../components/ui';
import { ReportDocument } from '../components/ReportDocument';
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

  const allObs = [...p.observations].sort((a, b) => a.numero - b.numero);
  const rubrique = (id: string, label: string, strong = false) => (
    <label className="f" key={id}>
      <span style={strong ? { color: 'var(--ink)', fontSize: 13 } : undefined}>{label}</span>
      <textarea style={{ minHeight: 56 }} value={cr.rubriques[id] || ''} onChange={(e) => set('rubriques', { ...cr.rubriques, [id]: e.target.value })} />
    </label>
  );

  const attachPdf = async (f: File) => {
    const ref = await storeLocal(f, f.name);
    await store.update(p.id, (d) => {
      d.documents.push({ id: uid('d'), nom: f.name, file: ref, date: today(), categorie: 'Compte rendu', updatedAt: Date.now() });
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
              <label className="f">
                Prochaine visite
                <input type="date" value={cr.prochaineVisite || ''} onChange={(e) => set('prochaineVisite', e.target.value || undefined)} />
              </label>
              <label className="f full">
                Participants (un par ligne)
                <textarea value={cr.participants} onChange={(e) => set('participants', e.target.value)} />
              </label>
              <label className="f full">
                Généralités
                <textarea value={cr.notesGenerales || ''} onChange={(e) => set('notesGenerales', e.target.value)} />
              </label>
            </div>
          </div>

          <div className="card">
            <div className="row between wrap">
              <h2>Présentation</h2>
              <Seg value={cr.mode} onChange={(m) => set('mode', m)} options={[['bloc', 'Par bloc / sous-bloc'], ['pastille', 'Par pastille']]} />
            </div>
            <label className="check">
              <input type="checkbox" checked={cr.inclurePlans} onChange={(e) => set('inclurePlans', e.target.checked)} />
              Inclure les plans avec les pastilles
            </label>
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
            <h2>Rubriques par bloc / sous-bloc</h2>
            <p className="small muted">Écrivez directement sous chaque rubrique. Les rubriques vides n’apparaissent pas dans le compte rendu.</p>
            <div className="stack">
              {p.blocs.map((b, bi) => (
                <div key={b.id} className="stack" style={{ gap: 8 }}>
                  {rubrique(b.id, `${String(bi + 1).padStart(2, '0')} — ${b.nom.toUpperCase()}`, true)}
                  <div className="stack" style={{ gap: 8, paddingLeft: 16, borderLeft: '2px solid var(--line)' }}>
                    {b.sousBlocs.map((s, si) => rubrique(s.id, `${String(bi + 1).padStart(2, '0')}.${String(si + 1).padStart(2, '0')} — ${s.nom}`))}
                  </div>
                </div>
              ))}
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
