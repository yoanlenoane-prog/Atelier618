import { useEffect, useRef, useState } from 'react';
import type { ContentItem, ObsStatus, Observation, Project } from '../types';
import { useStore } from '../store';
import { uid, pastilleLabel } from '../lib/ids';
import { today, fmt } from '../lib/dates';
import { compressPhoto, photoName, storeLocal } from '../lib/files';
import { OBS_STATUS, OBS_STATUS_LABEL } from '../lib/labels';
import { FileImage, useFileUrl } from './FileImage';
import { IconCamera, IconClose, IconDown, IconPlus, IconText, IconTrash, IconUp } from './Icons';
import { toast } from './ui';

/** Crée une observation (pastille) et renvoie son id. */
export async function createObservation(
  store: ReturnType<typeof useStore>,
  p: Project,
  init: Partial<Observation>
): Promise<string> {
  const id = uid('o');
  await store.update(p.id, (d) => {
    d.compteurPastille = Math.max(d.compteurPastille, ...d.observations.map((o) => o.numero), 0) + 1;
    d.observations.push({
      id,
      numero: d.compteurPastille,
      titre: '',
      statut: 'a_faire',
      date: today(),
      contenu: [],
      historique: [{ id: uid('h'), date: today(), texte: 'Observation créée' }],
      updatedAt: Date.now(),
      ...init,
    });
  });
  return id;
}

export function StatusPicker({ value, onChange }: { value: ObsStatus; onChange: (s: ObsStatus) => void }) {
  return (
    <div className="status-pick">
      {OBS_STATUS.map(([v, l]) => (
        <button key={v} type="button" className={value === v ? 'on' : ''} onClick={() => onChange(v)}>
          <span className={'dot ' + v} />
          {l}
        </button>
      ))}
    </div>
  );
}

export function BlocSelect({ p, blocId, sousBlocId, onChange }: { p: Project; blocId?: string; sousBlocId?: string; onChange: (b?: string, s?: string) => void }) {
  const value = sousBlocId ? `s:${sousBlocId}` : blocId ? `b:${blocId}` : '';
  return (
    <select
      value={value}
      onChange={(e) => {
        const v = e.target.value;
        if (!v) return onChange(undefined, undefined);
        if (v.startsWith('b:')) return onChange(v.slice(2), undefined);
        const sid = v.slice(2);
        const b = p.blocs.find((x) => x.sousBlocs.some((s) => s.id === sid));
        onChange(b?.id, sid);
      }}
    >
      <option value="">— Non classé —</option>
      {p.blocs.map((b, bi) => (
        <optgroup key={b.id} label={`${String(bi + 1).padStart(2, '0')} — ${b.nom}`}>
          <option value={`b:${b.id}`}>{b.nom} (bloc entier)</option>
          {b.sousBlocs.map((s, si) => (
            <option key={s.id} value={`s:${s.id}`}>
              {String(bi + 1).padStart(2, '0')}.{String(si + 1).padStart(2, '0')} — {s.nom}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}

export function PhotoButtons({ onFiles, compact }: { onFiles: (files: File[]) => void; compact?: boolean }) {
  const cam = useRef<HTMLInputElement>(null);
  const lib = useRef<HTMLInputElement>(null);
  const handle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (files.length) onFiles(files);
  };
  return (
    <>
      <button type="button" className="btn sand" onClick={() => cam.current?.click()}>
        <IconCamera /> {compact ? 'Photo' : 'Prendre une photo'}
      </button>
      <button type="button" className="btn ghost" onClick={() => lib.current?.click()}>
        <IconPlus /> {compact ? 'Galerie' : 'Ajouter depuis la galerie'}
      </button>
      <input ref={cam} type="file" accept="image/*" capture="environment" hidden onChange={handle} />
      <input ref={lib} type="file" accept="image/*" multiple hidden onChange={handle} />
    </>
  );
}

export function Lightbox({ item, onClose }: { item: ContentItem & { type: 'photo' }; onClose: () => void }) {
  const { url } = useFileUrl(item.file);
  return (
    <div className="lightbox" onClick={onClose}>
      {url ? <img src={url} alt={item.legende || ''} /> : <span style={{ color: '#fff' }}>Chargement…</span>}
      <button className="btn sand sm icon" aria-label="Fermer"><IconClose /></button>
    </div>
  );
}

/**
 * Édition d'une observation. Les modifications sont enregistrées automatiquement
 * (une seule donnée, répercutée sur le plan, le Gantt, les comptes rendus…).
 */
export function ObservationEditor({ p, obsId, quick }: { p: Project; obsId: string; quick?: boolean }) {
  const store = useStore();
  const stored = p.observations.find((o) => o.id === obsId);
  const [draft, setDraft] = useState<Observation | undefined>(stored);
  const [light, setLight] = useState<(ContentItem & { type: 'photo' }) | null>(null);
  const [busy, setBusy] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const pendingRef = useRef<Observation | undefined>(undefined);

  // Si l'observation est modifiée ailleurs (synchro), on reprend la version enregistrée
  useEffect(() => {
    if (!pendingRef.current) setDraft(stored);
  }, [stored]);

  const flush = () => {
    window.clearTimeout(timer.current);
    const o = pendingRef.current;
    pendingRef.current = undefined;
    if (o)
      return store.update(p.id, (d) => {
        d.observations = d.observations.map((x) => (x.id === o.id ? o : x));
      });
  };
  useEffect(() => () => void flush(), []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!draft) return <div className="muted">Observation supprimée.</div>;

  const change = (o: Observation, immediate = false) => {
    setDraft(o);
    pendingRef.current = o;
    window.clearTimeout(timer.current);
    if (immediate) flush();
    else timer.current = window.setTimeout(flush, 500);
  };
  const set = <K extends keyof Observation>(k: K, v: Observation[K], immediate = false) => change({ ...draft, [k]: v }, immediate);

  const setStatut = (s: ObsStatus) => {
    if (s === draft.statut) return;
    change({ ...draft, statut: s, historique: [...draft.historique, { id: uid('h'), date: today(), texte: `Statut : ${OBS_STATUS_LABEL[s]}` }] }, true);
  };

  const addPhotos = async (files: File[]) => {
    setBusy(true);
    try {
      const items: ContentItem[] = [];
      for (const f of files) {
        const blob = await compressPhoto(f);
        const ref = await storeLocal(blob, photoName(pastilleLabel(draft.numero)));
        items.push({ id: uid('c'), type: 'photo', file: ref });
      }
      change({ ...draft, contenu: [...draft.contenu, ...items] }, true);
      toast(files.length > 1 ? `${files.length} photos ajoutées` : 'Photo ajoutée');
    } catch (e) {
      toast('Photo non enregistrée : ' + (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const updItem = (id: string, patch: Partial<ContentItem>) =>
    set('contenu', draft.contenu.map((c) => (c.id === id ? ({ ...c, ...patch } as ContentItem) : c)));
  const moveItem = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= draft.contenu.length) return;
    const c = [...draft.contenu];
    [c[i], c[j]] = [c[j], c[i]];
    set('contenu', c, true);
  };

  const photos = draft.contenu.filter((c): c is ContentItem & { type: 'photo' } => c.type === 'photo');

  return (
    <div className="stack lg">
      <div className="stack">
        <label className="f">
          Titre
          <input type="text" value={draft.titre} autoFocus={quick && !draft.titre} placeholder="ex. Passage de gaine à reprendre" onChange={(e) => set('titre', e.target.value)} />
        </label>
        <div className="f" style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <span className="eyebrow">Statut</span>
          <StatusPicker value={draft.statut} onChange={setStatut} />
        </div>
        <div className="form-grid">
          <label className="f">
            Bloc / sous-bloc
            <BlocSelect p={p} blocId={draft.blocId} sousBlocId={draft.sousBlocId} onChange={(b, s) => {
              const sb = p.blocs.flatMap((x) => x.sousBlocs).find((x) => x.id === s);
              change({ ...draft, blocId: b, sousBlocId: s, entreprise: draft.entreprise || sb?.entreprise }, true);
            }} />
          </label>
          <label className="f">
            Date
            <input type="date" value={draft.date} onChange={(e) => set('date', e.target.value || today(), true)} />
          </label>
          {!quick && (
            <>
              <label className="f">
                Entreprise concernée
                <input type="text" list="obs-entreprises" value={draft.entreprise || ''} onChange={(e) => set('entreprise', e.target.value || undefined)} />
                <datalist id="obs-entreprises">
                  {p.info.entreprises.map((e) => <option key={e.id} value={e.nom} />)}
                </datalist>
              </label>
              <label className="f">
                Échéance
                <input type="date" value={draft.echeance || ''} onChange={(e) => set('echeance', e.target.value || undefined, true)} />
              </label>
            </>
          )}
        </div>
      </div>

      <div className="stack">
        <div className="row between wrap">
          <span className="eyebrow">Contenu — texte et photos</span>
          <div className="row wrap">
            <button type="button" className="btn ghost" onClick={() => set('contenu', [...draft.contenu, { id: uid('c'), type: 'texte', texte: '' }], true)}>
              <IconText /> Paragraphe
            </button>
            <PhotoButtons onFiles={addPhotos} compact />
          </div>
        </div>
        {busy && <div className="muted small">Traitement des photos…</div>}
        {draft.contenu.length === 0 && <div className="muted small">Ajoutez une description et des photos.</div>}
        {draft.contenu.map((c, i) => (
          <div className="content-item" key={c.id}>
            {c.type === 'texte' ? (
              <textarea value={c.texte} placeholder="Description…" onChange={(e) => updItem(c.id, { texte: e.target.value })} />
            ) : (
              <div className="stack" style={{ gap: 6 }}>
                <button type="button" className="photo linkbtn" style={{ textDecoration: 'none', width: '100%' }} onClick={() => setLight(c)}>
                  <FileImage file={c.file} alt={c.legende} />
                </button>
                <input type="text" placeholder="Légende (facultatif)" value={c.legende || ''} onChange={(e) => updItem(c.id, { legende: e.target.value })} />
              </div>
            )}
            <div className="row" style={{ justifyContent: 'flex-end', marginTop: 6, gap: 4 }}>
              <button type="button" className="btn ghost sm icon" aria-label="Monter" onClick={() => moveItem(i, -1)}><IconUp /></button>
              <button type="button" className="btn ghost sm icon" aria-label="Descendre" onClick={() => moveItem(i, 1)}><IconDown /></button>
              <button
                type="button"
                className="btn danger sm icon"
                aria-label="Supprimer"
                onClick={() => window.confirm(c.type === 'photo' ? 'Retirer cette photo de l’observation ?' : 'Supprimer ce paragraphe ?') && set('contenu', draft.contenu.filter((x) => x.id !== c.id), true)}
              >
                <IconTrash />
              </button>
            </div>
          </div>
        ))}
        {photos.length > 1 && (
          <div className="thumbs">
            {photos.map((ph) => (
              <button key={ph.id} className="thumb" onClick={() => setLight(ph)}>
                <FileImage file={ph.file} />
              </button>
            ))}
          </div>
        )}
      </div>

      <label className="f">
        Action demandée
        <textarea style={{ minHeight: 60 }} value={draft.actionDemandee || ''} placeholder="ex. Reprendre le passage avant fermeture de la cloison" onChange={(e) => set('actionDemandee', e.target.value || undefined)} />
      </label>

      {!quick && <History draft={draft} onChange={(h) => set('historique', h, true)} />}
      {light && <Lightbox item={light} onClose={() => setLight(null)} />}
    </div>
  );
}

function History({ draft, onChange }: { draft: Observation; onChange: (h: Observation['historique']) => void }) {
  const [txt, setTxt] = useState('');
  const [date, setDate] = useState(today());
  const sorted = [...draft.historique].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  return (
    <div className="stack">
      <span className="eyebrow">Historique</span>
      <ul className="timeline">
        {sorted.map((h) => (
          <li key={h.id}>
            <div className="row between">
              <div>
                <div className="tiny muted mono">{fmt(h.date)}</div>
                <div>{h.texte}</div>
              </div>
              <button className="btn ghost sm icon" aria-label="Retirer" onClick={() => onChange(draft.historique.filter((x) => x.id !== h.id))}>
                <IconClose />
              </button>
            </div>
          </li>
        ))}
      </ul>
      <div className="row wrap">
        <input type="date" value={date} onChange={(e) => setDate(e.target.value || today())} style={{ width: 160 }} />
        <input type="text" className="grow" style={{ minWidth: 180 }} placeholder="ex. Entreprise informée" value={txt} onChange={(e) => setTxt(e.target.value)} />
        <button
          className="btn ghost"
          disabled={!txt.trim()}
          onClick={() => {
            onChange([...draft.historique, { id: uid('h'), date, texte: txt.trim() }]);
            setTxt('');
          }}
        >
          Ajouter
        </button>
      </div>
      <div className="row wrap">
        {['Entreprise informée', 'Travaux commencés', 'Vérifié sur place'].map((s) => (
          <button key={s} className="btn ghost sm" onClick={() => onChange([...draft.historique, { id: uid('h'), date: today(), texte: s }])}>
            + {s}
          </button>
        ))}
      </div>
    </div>
  );
}
