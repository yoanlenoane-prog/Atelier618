import { useEffect, useRef, useState } from 'react';
import type { Observation, Plan } from '../types';
import { pastilleLabel } from '../lib/ids';
import { useFileUrl } from './FileImage';

interface Props {
  plan: Plan;
  observations: Observation[];
  zoom: number;
  onZoom?: (z: number) => void;
  placing?: boolean;
  moving?: boolean;
  selectedId?: string;
  onPlace?: (x: number, y: number) => void;
  onMove?: (id: string, x: number, y: number) => void;
  onSelect?: (id: string) => void;
  /** Hauteur fixe (vignette) : pas de défilement ni de zoom. */
  static?: boolean;
  focus?: { x: number; y: number };
}

const clamp = (v: number) => Math.min(1, Math.max(0, v));

/** Affiche un plan avec ses pastilles, positionnées en coordonnées relatives (0–1). */
export function PlanView({ plan, observations, zoom, onZoom, placing, moving, selectedId, onPlace, onMove, onSelect, static: isStatic, focus }: Props) {
  const { url, loading } = useFileUrl(plan.image);
  const stage = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLDivElement>(null);
  const [stageW, setStageW] = useState(800);
  const [ratio, setRatio] = useState(plan.hauteur && plan.largeur ? plan.hauteur / plan.largeur : 0.7);
  const [drag, setDrag] = useState<{ id: string; x: number; y: number; moved: boolean } | null>(null);
  const pinch = useRef<{ d: number; z: number } | null>(null);

  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setStageW(el.clientWidth));
    ro.observe(el);
    setStageW(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  // Centrer sur une pastille
  useEffect(() => {
    const el = stage.current;
    if (!el || !focus || isStatic) return;
    const w = stageW * zoom;
    el.scrollTo({ left: focus.x * w - el.clientWidth / 2, top: focus.y * w * ratio - el.clientHeight / 2 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus?.x, focus?.y, zoom, url]);

  const width = Math.max(100, stageW * zoom - (isStatic ? 0 : 2));
  const height = width * ratio;

  const rel = (clientX: number, clientY: number) => {
    const r = canvas.current!.getBoundingClientRect();
    return { x: clamp((clientX - r.left) / r.width), y: clamp((clientY - r.top) / r.height) };
  };

  // Zoom à deux doigts (téléphone / tablette) et Ctrl + molette (ordinateur)
  useEffect(() => {
    const el = stage.current;
    if (!el || isStatic || !onZoom) return;
    const dist = (t: TouchList) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
    const ts = (e: TouchEvent) => {
      if (e.touches.length === 2) pinch.current = { d: dist(e.touches), z: zoom };
    };
    const tm = (e: TouchEvent) => {
      if (e.touches.length === 2 && pinch.current) {
        e.preventDefault();
        onZoom(Math.min(6, Math.max(1, (pinch.current.z * dist(e.touches)) / pinch.current.d)));
      }
    };
    const te = () => (pinch.current = null);
    const wheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      onZoom(Math.min(6, Math.max(1, zoom * (e.deltaY < 0 ? 1.12 : 0.89))));
    };
    el.addEventListener('touchstart', ts, { passive: true });
    el.addEventListener('touchmove', tm, { passive: false });
    el.addEventListener('touchend', te);
    el.addEventListener('wheel', wheel, { passive: false });
    return () => {
      el.removeEventListener('touchstart', ts);
      el.removeEventListener('touchmove', tm);
      el.removeEventListener('touchend', te);
      el.removeEventListener('wheel', wheel);
    };
  }, [zoom, onZoom, isStatic]);

  return (
    <div
      ref={stage}
      className={'plan-stage' + (placing ? ' placing' : '')}
      style={isStatic ? { height: 'auto', minHeight: 0, overflow: 'hidden' } : undefined}
    >
      <div
        ref={canvas}
        className="plan-canvas"
        style={{ width, height }}
        onClick={(e) => {
          if (!placing || !onPlace) return;
          const { x, y } = rel(e.clientX, e.clientY);
          onPlace(x, y);
        }}
      >
        {url ? (
          <img
            src={url}
            alt={plan.nom}
            onLoad={(e) => {
              const im = e.currentTarget;
              if (im.naturalWidth) setRatio(im.naturalHeight / im.naturalWidth);
            }}
          />
        ) : (
          <div className="ph-missing" style={{ background: '#fff' }}>{loading ? 'Chargement du plan…' : 'Plan indisponible hors connexion (pas encore téléchargé sur cet appareil)'}</div>
        )}
        {observations
          .filter((o) => o.planId === plan.id && o.x !== undefined && o.y !== undefined)
          .map((o) => {
            const pos = drag?.id === o.id ? drag : o;
            return (
              <div
                key={o.id}
                className={'pastille ' + o.statut + (o.id === selectedId ? ' sel' : '') + (drag?.id === o.id ? ' dragging' : '')}
                style={{ left: `${pos.x! * 100}%`, top: `${pos.y! * 100}%` }}
                title={`${pastilleLabel(o.numero)} — ${o.titre}`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!drag?.moved) onSelect?.(o.id);
                }}
                onPointerDown={(e) => {
                  if (!moving || !onMove) return;
                  e.stopPropagation();
                  (e.target as HTMLElement).setPointerCapture(e.pointerId);
                  setDrag({ id: o.id, x: o.x!, y: o.y!, moved: false });
                }}
                onPointerMove={(e) => {
                  if (!drag || drag.id !== o.id) return;
                  const r = rel(e.clientX, e.clientY);
                  setDrag({ id: o.id, ...r, moved: true });
                }}
                onPointerUp={() => {
                  if (drag && drag.id === o.id && drag.moved) onMove?.(o.id, drag.x, drag.y);
                  setTimeout(() => setDrag(null), 0);
                }}
              >
                {pastilleLabel(o.numero)}
              </div>
            );
          })}
      </div>
    </div>
  );
}
