import { useState } from 'react';
import type { Project } from '../types';
import { useStore } from '../store';
import { uid } from '../lib/ids';
import { storeLocal } from '../lib/files';
import { ganttPdf, planGanttPdf, type GanttDetail } from '../lib/ganttPdf';
import { fmt } from '../lib/dates';
import { Modal, Seg, toast, useToday } from './ui';
import { IconPrint } from './Icons';

/** Export du Gantt en PDF paysage, au format adapté à la durée du projet. */
export function GanttExportModal({ p, onClose }: { p: Project; onClose: () => void }) {
  const store = useStore();
  const auj = useToday();
  const [detail, setDetail] = useState<GanttDetail>('complet');
  const [drive, setDrive] = useState(true);
  const [busy, setBusy] = useState(false);
  const plan = planGanttPdf(p, auj, detail);

  const run = async () => {
    setBusy(true);
    try {
      const { blob, name } = await ganttPdf(p, auj, detail);
      // Téléchargement
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      // Copie dans le dossier Documents du projet (Google Drive)
      if (drive) {
        const ref = await storeLocal(new Blob([blob], { type: 'application/pdf' }), name);
        await store.update(p.id, (d) => {
          d.documents.push({ id: uid('d'), nom: name, file: ref, date: auj, categorie: 'Planning', updatedAt: Date.now() });
        });
      }
      toast(drive ? 'PDF créé — une copie part dans Documents (Drive)' : 'PDF créé');
      onClose();
    } catch (e) {
      toast('Export impossible : ' + (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title="Exporter le Gantt en PDF"
      onClose={onClose}
      footer={
        <>
          <button className="btn ghost" onClick={onClose}>Annuler</button>
          <button className="btn" disabled={busy} onClick={run}>
            <IconPrint /> {busy ? 'Création…' : 'Créer le PDF'}
          </button>
        </>
      }
    >
      <div className="stack">
        <div className="f" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span className="eyebrow">Contenu</span>
          <Seg value={detail} onChange={setDetail} options={[['complet', 'Blocs et sous-blocs'], ['blocs', 'Blocs seuls']]} />
        </div>
        <div className="card" style={{ padding: '12px 14px', background: 'var(--paper)' }}>
          <div className="row between wrap">
            <span className="eyebrow">Mise en page automatique</span>
            <span className="tag dark">{plan.format.nom} paysage</span>
          </div>
          <div className="small" style={{ marginTop: 6 }}>
            Période du {fmt(plan.debut)} au {fmt(plan.fin)} ({plan.jours} jours) — {plan.pages} page{plan.pages > 1 ? 's' : ''}.
          </div>
          <div className="tiny muted" style={{ marginTop: 4 }}>
            Le format grandit avec la durée du chantier (A4 → A3 → A2…) pour que tout le planning tienne sur la largeur de la page.
          </div>
        </div>
        <label className="check">
          <input type="checkbox" checked={drive} onChange={(e) => setDrive(e.target.checked)} />
          Enregistrer aussi une copie dans Google Drive (Documents du projet)
        </label>
      </div>
    </Modal>
  );
}
