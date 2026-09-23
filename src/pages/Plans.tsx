import { useEffect, useRef, useState } from 'react';
import type { FileRef, ObsStatus, Project } from '../types';
import { useStore } from '../store';
import { href, navigate } from '../router';
import { uid, pastilleLabel } from '../lib/ids';
import { imageSize, storeLocal } from '../lib/files';
import { OBS_STATUS, OBS_STATUS_LABEL } from '../lib/labels';
import { codeSousBloc, findSousBloc } from '../lib/planning';
import { PlanView } from '../components/PlanView';
import { Empty, Modal, toast } from '../components/ui';
import { createObservation, ObservationEditor } from '../components/ObservationEditor';
import { IconEdit, IconMove, IconPlus, IconTrash, IconZoomIn, IconZoomOut } from '../components/Icons';

export function Plans({ p, planId, query }: { p: Project; planId?: string; query: URLSearchParams }) {
  const store = useStore();
  const plan = p.plans.find((x) => x.id === planId) || p.plans.find((x) => x.id === localStorage.getItem('plan.' + p.id)) || p.plans[0];
  const [zoom, setZoom] = useState(1);
  const [placing, setPlacing] = useState(query.get('placer') === '1');
  const [moving, setMoving] = useState(false);
  const [selected, setSelected] = useState<string | undefined>(query.get('obs') || undefined);
  const [quickId, setQuickId] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [hidden, setHidden] = useState<Record<ObsStatus, boolean>>({ a_faire: false, en_cours: false, termine: false, sans_suite: true });

  useEffect(() => {
    if (plan) localStorage.setItem('plan.' + p.id, plan.id);
  }, [plan, p.id]);

  const focusObs = p.observations.find((o) => o.id === query.get('obs'));

  if (!plan)
    return (
      <>
        <Empty title="Aucun plan">
          <p>Importez un plan (PDF, JPG ou PNG) pour y placer vos pastilles d’observation.</p>
          <div className="row wrap" style={{ justifyContent: 'center' }}>
            <button className="btn" onClick={() => setImporting(true)}><IconPlus /> Importer un plan</button>
            <button
              className="btn ghost"
              onClick={async () => {
                const id = await createObservation(store, p, {});
                navigate(`/p/${p.id}/obs/${id}`);
              }}
            >
              Observation sans plan
            </button>
          </div>
        </Empty>
        {importing && <ImportPlan p={p} onClose={() => setImporting(false)} />}
      </>
    );

  const obsOnPlan = p.observations.filter((o) => o.planId === plan.id);
  const visible = obsOnPlan.filter((o) => !hidden[o.statut]);
  const sel = p.observations.find((o) => o.id === selected);

  const place = async (x: number, y: number) => {
    setPlacing(false);
    const id = await createObservation(store, p, { planId: plan.id, x, y });
    setSelected(id);
    setQuickId(id);
  };

  return (
    <div>
      <div className="plan-tools">
        <select value={plan.id} onChange={(e) => navigate(`/p/${p.id}/plans/${e.target.value}`, true)} style={{ width: 'auto', minWidth: 140, fontWeight: 600 }}>
          {p.plans.map((pl) => (
            <option key={pl.id} value={pl.id}>{pl.nom}</option>
          ))}
        </select>
        <button className={'btn ' + (placing ? 'sand' : '')} onClick={() => { setPlacing(!placing); setMoving(false); }}>
          <IconPlus /> {placing ? 'Touchez le plan…' : 'Pastille'}
        </button>
        <button className={'btn ' + (moving ? 'sand' : 'ghost')} onClick={() => { setMoving(!moving); setPlacing(false); }} title="Déplacer les pastilles">
          <IconMove /> {moving ? 'Glissez les pastilles' : 'Déplacer'}
        </button>
        <div className="row" style={{ gap: 4 }}>
          <button className="btn ghost icon" aria-label="Zoom arrière" onClick={() => setZoom(Math.max(1, zoom / 1.3))}><IconZoomOut /></button>
          <button className="btn ghost sm" onClick={() => setZoom(1)}>{Math.round(zoom * 100)} %</button>
          <button className="btn ghost icon" aria-label="Zoom avant" onClick={() => setZoom(Math.min(6, zoom * 1.3))}><IconZoomIn /></button>
        </div>
        <span className="grow" />
        <button className="btn ghost sm" onClick={() => setImporting(true)}><IconPlus /> Plan</button>
        <button
          className="btn ghost sm icon"
          aria-label="Renommer le plan"
          onClick={() => {
            const nom = window.prompt('Nom du plan', plan.nom)?.trim();
            if (nom) store.update(p.id, (d) => { d.plans = d.plans.map((x) => (x.id === plan.id ? { ...x, nom } : x)); });
          }}
        >
          <IconEdit />
        </button>
        <button
          className="btn danger sm icon"
          aria-label="Supprimer le plan"
          onClick={() => {
            if (!window.confirm(`Supprimer le plan « ${plan.nom} » ?\nLes ${obsOnPlan.length} observation(s) sont conservées mais ne seront plus localisées.`)) return;
            store.update(p.id, (d) => {
              d.plans = d.plans.filter((x) => x.id !== plan.id);
              d.observations = d.observations.map((o) => (o.planId === plan.id ? { ...o, planId: undefined, x: undefined, y: undefined } : o));
            });
          }}
        >
          <IconTrash />
        </button>
      </div>

      <div className="row wrap small" style={{ marginBottom: 10, gap: 14 }}>
        {OBS_STATUS.map(([s, l]) => (
          <label key={s} className="check small">
            <input type="checkbox" checked={!hidden[s]} onChange={() => setHidden({ ...hidden, [s]: !hidden[s] })} />
            <span className={'dot ' + s} /> {l} ({obsOnPlan.filter((o) => o.statut === s).length})
          </label>
        ))}
      </div>

      <PlanView
        plan={plan}
        observations={visible}
        zoom={zoom}
        onZoom={setZoom}
        placing={placing}
        moving={moving}
        selectedId={selected}
        focus={focusObs && focusObs.planId === plan.id ? { x: focusObs.x!, y: focusObs.y! } : undefined}
        onPlace={place}
        onSelect={(id) => setSelected(id)}
        onMove={(id, x, y) =>
          store.update(p.id, (d) => {
            d.observations = d.observations.map((o) => (o.id === id ? { ...o, x, y } : o));
          })
        }
      />

      {sel && sel.planId === plan.id && !quickId && (
        <div className="card" style={{ marginTop: 12 }}>
          <div className="row between wrap">
            <div className="row">
              <span className={'pchip ' + sel.statut}>{pastilleLabel(sel.numero)}</span>
              <div>
                <strong>{sel.titre || 'Sans titre'}</strong>
                <div className="tiny muted">
                  {OBS_STATUS_LABEL[sel.statut]}
                  {sel.sousBlocId && ` · ${codeSousBloc(p, sel.sousBlocId)} ${findSousBloc(p, sel.sousBlocId)?.sb.nom}`}
                  {` · ${sel.contenu.filter((c) => c.type === 'photo').length} photo(s)`}
                </div>
              </div>
            </div>
            <div className="row">
              <button className="btn ghost sm" onClick={() => setQuickId(sel.id)}>Modifier ici</button>
              <a className="btn sm" href={href(`/p/${p.id}/obs/${sel.id}`)}>Ouvrir la fiche</a>
            </div>
          </div>
        </div>
      )}

      {quickId && (
        <Modal
          title={
            <>
              Pastille <span className="mono">{pastilleLabel(p.observations.find((o) => o.id === quickId)?.numero ?? 0)}</span>
            </>
          }
          onClose={() => setQuickId(null)}
          footer={
            <>
              <a className="btn ghost" href={href(`/p/${p.id}/obs/${quickId}`)}>Fiche complète</a>
              <button className="btn" onClick={() => { setQuickId(null); toast('Observation enregistrée'); }}>Valider</button>
            </>
          }
        >
          <ObservationEditor p={p} obsId={quickId} quick />
        </Modal>
      )}
      {importing && <ImportPlan p={p} onClose={() => setImporting(false)} />}
    </div>
  );
}

function ImportPlan({ p, onClose }: { p: Project; onClose: () => void }) {
  const store = useStore();
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [nom, setNom] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [busy, setBusy] = useState(false);
  const isPdf = file?.type === 'application/pdf' || file?.name.toLowerCase().endsWith('.pdf');

  const pick = async (f: File) => {
    setFile(f);
    setNom(nom || f.name.replace(/\.[^.]+$/, ''));
    if (f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')) {
      try {
        const { pdfPageCount } = await import('../lib/pdfplan');
        setPages(await pdfPageCount(f));
      } catch {
        setPages(1);
      }
    }
  };

  const submit = async () => {
    if (!file) return;
    setBusy(true);
    try {
      let image: FileRef, source: FileRef | undefined, w: number, h: number;
      if (isPdf) {
        const { renderPdfPage } = await import('../lib/pdfplan');
        const r = await renderPdfPage(file, page);
        image = await storeLocal(r.blob, `${nom || 'Plan'}${pages > 1 ? ` p${page}` : ''}.png`);
        source = await storeLocal(file, file.name);
        w = r.w;
        h = r.h;
      } else {
        const s = await imageSize(file);
        image = await storeLocal(file, file.name);
        w = s.w;
        h = s.h;
      }
      const id = uid('pl');
      await store.update(p.id, (d) => {
        d.plans.push({ id, nom: nom.trim() || 'Plan', image, source, largeur: w, hauteur: h, updatedAt: Date.now() });
      });
      onClose();
      navigate(`/p/${p.id}/plans/${id}`, true);
      toast('Plan importé');
    } catch (e) {
      toast('Import impossible : ' + (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title="Importer un plan"
      onClose={onClose}
      footer={
        <>
          <button className="btn ghost" onClick={onClose}>Annuler</button>
          <button className="btn" disabled={!file || busy} onClick={submit}>{busy ? 'Import…' : 'Importer'}</button>
        </>
      }
    >
      <div className="stack">
        <button className="newcard" style={{ minHeight: 110 }} onClick={() => input.current?.click()}>
          {file ? file.name : 'Choisir un fichier PDF, JPG ou PNG'}
        </button>
        <input ref={input} type="file" hidden accept="application/pdf,image/*" onChange={(e) => e.target.files?.[0] && pick(e.target.files[0])} />
        <label className="f">
          Nom du plan
          <input type="text" value={nom} placeholder="ex. RDC, R+1, Façade Nord…" onChange={(e) => setNom(e.target.value)} />
        </label>
        {isPdf && pages > 1 && (
          <label className="f">
            Page du PDF à utiliser (1 à {pages})
            <input type="number" min={1} max={pages} value={page} onChange={(e) => setPage(Number(e.target.value) || 1)} />
          </label>
        )}
        <p className="tiny muted">Le fichier est enregistré dans le dossier « Plans » du projet sur Google Drive. Les PDF sont convertis en image pour y placer les pastilles.</p>
      </div>
    </Modal>
  );
}
