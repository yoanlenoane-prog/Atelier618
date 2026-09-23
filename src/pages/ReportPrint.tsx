import { useEffect } from 'react';
import { useStore } from '../store';
import { href } from '../router';
import { ReportDocument } from '../components/ReportDocument';
import { useToday } from '../components/ui';
import { IconBack, IconPrint } from '../components/Icons';

/** Page d'impression : « Imprimer » → « Enregistrer au format PDF ». */
export function ReportPrint({ projectId, reportId }: { projectId: string; reportId: string }) {
  const p = useStore().get(projectId);
  const auj = useToday();
  const cr = p?.comptesRendus.find((c) => c.id === reportId);
  useEffect(() => {
    if (!p || !cr) return;
    const prev = document.title;
    // Nom proposé pour le fichier PDF
    document.title = `CR${String(cr.numero).padStart(3, '0')} - ${p.info.nom} - ${cr.date}`;
    return () => {
      document.title = prev;
    };
  }, [p, cr]);
  if (!p || !cr) return <div className="empty">Compte rendu introuvable</div>;
  return (
    <div style={{ padding: '16px 16px 60px' }}>
      <div className="row between wrap no-print" style={{ maxWidth: 820, margin: '0 auto 16px' }}>
        <a className="btn ghost" href={href(`/p/${p.id}/cr/${cr.id}`)}><IconBack /> Retour</a>
        <div className="row">
          <span className="small muted">Choisissez « Enregistrer au format PDF » comme imprimante.</span>
          <button className="btn" onClick={() => window.print()}><IconPrint /> Imprimer / PDF</button>
        </div>
      </div>
      <ReportDocument p={p} cr={cr} auj={auj} />
    </div>
  );
}
