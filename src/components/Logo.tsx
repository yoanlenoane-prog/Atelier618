/**
 * Logo Atelier 618 — carré noir traversé de fines lignes blanches
 * (deux droites et un quart de cercle), suivi du nom « atelier618 ».
 */
export function LogoMark({ size = 48, className }: { size?: number; className?: string }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 100 100" aria-hidden>
      <rect width="100" height="100" fill="#1d1d1b" />
      <g fill="none" stroke="#fff" strokeWidth="1.3" strokeLinecap="round">
        <path d="M0.8 0.8 L62 100" />
        <path d="M0 61.5 L99.4 0.6" />
        <path d="M0.4 94 A100 100 0 0 1 98.5 0.4" />
      </g>
    </svg>
  );
}

export function Logo({ size = 'md', sousTitre = true }: { size?: 'sm' | 'md' | 'lg'; sousTitre?: boolean }) {
  const mark = size === 'lg' ? 72 : size === 'sm' ? 36 : 46;
  return (
    <span className={'logo logo-' + size}>
      <LogoMark size={mark} />
      <span className="logo-txt">
        <span className="logo-nom">atelier618</span>
        {sousTitre && <span className="logo-sous">Le Noane <i>|</i> Architecte</span>}
      </span>
    </span>
  );
}
