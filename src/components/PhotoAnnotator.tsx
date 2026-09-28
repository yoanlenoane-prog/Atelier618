import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Annotation, FileRef } from '../types';
import { useFileUrl } from './FileImage';
import { IconClose } from './Icons';

type Outil = Annotation['type'];

const OUTILS: [Outil, string][] = [
  ['fleche', 'Flèche'],
  ['cercle', 'Cercle'],
  ['rect', 'Cadre'],
  ['trait', 'Main levée'],
  ['texte', 'Texte'],
];
const COULEURS = ['#e0301e', '#f2b705', '#1e6fe0', '#111111', '#ffffff'];

/** Épaisseur du trait, proportionnelle à la taille de l'image. */
const epaisseur = (w: number, h: number) => Math.max(4, Math.round(Math.max(w, h) / 160));

function dessiner(ctx: CanvasRenderingContext2D, a: Annotation, lw: number) {
  ctx.strokeStyle = a.couleur;
  ctx.fillStyle = a.couleur;
  ctx.lineWidth = lw;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  if (a.type === 'trait') {
    a.points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.stroke();
  } else if (a.type === 'rect') {
    ctx.strokeRect(Math.min(a.x1, a.x2), Math.min(a.y1, a.y2), Math.abs(a.x2 - a.x1), Math.abs(a.y2 - a.y1));
  } else if (a.type === 'cercle') {
    ctx.ellipse((a.x1 + a.x2) / 2, (a.y1 + a.y2) / 2, Math.abs(a.x2 - a.x1) / 2, Math.abs(a.y2 - a.y1) / 2, 0, 0, Math.PI * 2);
    ctx.stroke();
  } else if (a.type === 'fleche') {
    const ang = Math.atan2(a.y2 - a.y1, a.x2 - a.x1);
    const t = lw * 4.5;
    ctx.moveTo(a.x1, a.y1);
    ctx.lineTo(a.x2 - Math.cos(ang) * t * 0.6, a.y2 - Math.sin(ang) * t * 0.6);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(a.x2, a.y2);
    ctx.lineTo(a.x2 - t * Math.cos(ang - 0.45), a.y2 - t * Math.sin(ang - 0.45));
    ctx.lineTo(a.x2 - t * Math.cos(ang + 0.45), a.y2 - t * Math.sin(ang + 0.45));
    ctx.closePath();
    ctx.fill();
  } else if (a.type === 'texte') {
    const size = lw * 8;
    ctx.font = `700 ${size}px Inter, system-ui, sans-serif`;
    ctx.textBaseline = 'middle';
    // Contour pour rester lisible sur n'importe quel fond
    ctx.lineWidth = size / 5;
    ctx.strokeStyle = a.couleur === '#ffffff' ? '#111111' : '#ffffff';
    ctx.strokeText(a.texte, a.x, a.y);
    ctx.fillText(a.texte, a.x, a.y);
  }
}

/**
 * Annotation d'une photo : flèches, cercles, cadres, traits et textes.
 * Les formes sont conservées (re-modifiables) et une image annotée est générée à l'enregistrement.
 */
export function PhotoAnnotator({
  file,
  annotations: init = [],
  onSave,
  onClose,
}: {
  /** Photo d'origine, sans annotations. */
  file: FileRef;
  annotations?: Annotation[];
  /** blob = image annotée, ou null s'il n'y a plus d'annotation (retour à l'original). */
  onSave: (blob: Blob | null, annotations: Annotation[]) => void | Promise<void>;
  onClose: () => void;
}) {
  const { url } = useFileUrl(file);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [formes, setFormes] = useState<Annotation[]>(init);
  const [enCours, setEnCours] = useState<Annotation | null>(null);
  const [outil, setOutil] = useState<Outil>('fleche');
  const [couleur, setCouleur] = useState(COULEURS[0]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!url) return;
    const i = new Image();
    i.onload = () => setImg(i);
    i.src = url;
  }, [url]);

  // Échap ferme l'outil sans fermer la fenêtre de la pastille située dessous
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopImmediatePropagation();
      onClose();
    };
    window.addEventListener('keydown', k, true);
    return () => window.removeEventListener('keydown', k, true);
  }, [onClose]);

  const lw = img ? epaisseur(img.naturalWidth, img.naturalHeight) : 4;

  const rendre = (liste: Annotation[]) => {
    const c = canvas.current;
    if (!c || !img) return;
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    const ctx = c.getContext('2d')!;
    ctx.drawImage(img, 0, 0);
    for (const a of liste) dessiner(ctx, a, lw);
  };

  useEffect(() => {
    rendre(enCours ? [...formes, enCours] : formes);
  }); // à chaque rendu

  const point = (e: React.PointerEvent): [number, number] => {
    const c = canvas.current!;
    const r = c.getBoundingClientRect();
    return [((e.clientX - r.left) * c.width) / r.width, ((e.clientY - r.top) * c.height) / r.height];
  };

  const down = (e: React.PointerEvent) => {
    if (!img) return;
    const [x, y] = point(e);
    if (outil === 'texte') {
      const texte = window.prompt('Texte à ajouter sur la photo :')?.trim();
      if (texte) setFormes([...formes, { type: 'texte', couleur, x, y, texte }]);
      return;
    }
    (e.target as Element).setPointerCapture(e.pointerId);
    setEnCours(outil === 'trait' ? { type: 'trait', couleur, points: [[x, y]] } : { type: outil, couleur, x1: x, y1: y, x2: x, y2: y });
  };
  const move = (e: React.PointerEvent) => {
    if (!enCours) return;
    const [x, y] = point(e);
    if (enCours.type === 'trait') setEnCours({ ...enCours, points: [...enCours.points, [x, y]] });
    else if (enCours.type !== 'texte') setEnCours({ ...enCours, x2: x, y2: y });
  };
  const up = () => {
    if (!enCours) return;
    const utile =
      enCours.type === 'trait' ? enCours.points.length > 1 : enCours.type === 'texte' || Math.hypot(enCours.x2 - enCours.x1, enCours.y2 - enCours.y1) > lw * 2;
    if (utile) setFormes([...formes, enCours]);
    setEnCours(null);
  };

  const enregistrer = async () => {
    if (!img) return;
    setBusy(true);
    try {
      if (formes.length === 0) {
        await onSave(null, []);
      } else {
        rendre(formes);
        const blob = await new Promise<Blob | null>((res) => canvas.current!.toBlob(res, 'image/jpeg', 0.9));
        if (!blob) throw new Error('Image non générée');
        await onSave(blob, formes);
      }
      onClose();
    } finally {
      setBusy(false);
    }
  };

  // Rendu au-dessus de tout (y compris d'une fenêtre ouverte depuis le plan)
  return createPortal(
    <div className="annot">
      <div className="annot-bar">
        <div className="seg">
          {OUTILS.map(([v, l]) => (
            <button key={v} className={outil === v ? 'on' : ''} onClick={() => setOutil(v)}>{l}</button>
          ))}
        </div>
        <div className="row" style={{ gap: 6 }}>
          {COULEURS.map((c) => (
            <button key={c} className={'swatch' + (couleur === c ? ' on' : '')} style={{ background: c }} aria-label={`Couleur ${c}`} onClick={() => setCouleur(c)} />
          ))}
        </div>
        <div className="row wrap" style={{ gap: 6, marginLeft: 'auto' }}>
          <button className="btn ghost sm" disabled={!formes.length} onClick={() => setFormes(formes.slice(0, -1))}>Annuler</button>
          <button className="btn ghost sm" disabled={!formes.length} onClick={() => window.confirm('Effacer toutes les annotations ?') && setFormes([])}>Tout effacer</button>
          <button className="btn sm save" disabled={busy || !img} onClick={enregistrer}>{busy ? 'Enregistrement…' : 'Enregistrer'}</button>
          <button className="btn sand sm icon" aria-label="Fermer sans enregistrer" onClick={onClose}><IconClose /></button>
        </div>
      </div>
      <div className="annot-stage">
        {img ? (
          <canvas ref={canvas} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} />
        ) : (
          <span style={{ color: '#fff' }}>Chargement…</span>
        )}
      </div>
      <div className="annot-hint">
        {outil === 'texte' ? 'Touchez la photo à l’endroit où placer le texte.' : 'Dessinez directement sur la photo.'}
      </div>
    </div>,
    document.body
  );
}
