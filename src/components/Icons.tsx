import type { SVGProps } from 'react';

type P = SVGProps<SVGSVGElement>;
const base = (d: React.ReactNode) => (props: P) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden {...props}>
    {d}
  </svg>
);

export const IconHome = base(<><path d="M3 11 12 4l9 7" /><path d="M5 10v10h14V10" /></>);
export const IconDash = base(<><rect x="3" y="3" width="7" height="9" rx="1" /><rect x="14" y="3" width="7" height="5" rx="1" /><rect x="14" y="12" width="7" height="9" rx="1" /><rect x="3" y="16" width="7" height="5" rx="1" /></>);
export const IconGantt = base(<><path d="M3 4v16h18" /><path d="M7 8h7M9 12h9M7 16h5" strokeWidth={2.6} /></>);
export const IconPlan = base(<><path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3z" /><path d="M9 3v15M15 6v15" /></>);
export const IconObs = base(<><circle cx="12" cy="10" r="3" /><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" /></>);
export const IconReport = base(<><path d="M6 2h9l5 5v15H6z" /><path d="M14 2v6h6M9 13h8M9 17h6" /></>);
export const IconDocs = base(<><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></>);
export const IconSearch = base(<><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>);
export const IconPlus = base(<path d="M12 5v14M5 12h14" />);
export const IconCamera = base(<><path d="M3 8a2 2 0 0 1 2-2h2l2-2h6l2 2h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><circle cx="12" cy="13" r="4" /></>);
export const IconBack = base(<path d="M15 5l-7 7 7 7" />);
export const IconClose = base(<path d="M6 6l12 12M18 6 6 18" />);
export const IconCaret = base(<path d="m6 9 6 6 6-6" />);
export const IconEdit = base(<><path d="M4 20h4L19 9l-4-4L4 16z" /><path d="m13 7 4 4" /></>);
export const IconTrash = base(<><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" /></>);
export const IconSync = base(<><path d="M20 12a8 8 0 0 1-14.3 4.9M4 12A8 8 0 0 1 18.3 7.1" /><path d="M18 3v4.5h-4.5M6 21v-4.5h4.5" /></>);
export const IconSettings = base(<><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></>);
export const IconHelp = base(<><circle cx="12" cy="12" r="9" /><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14M12 17h.01" /></>);
export const IconInfo = base(<><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7.5h.01" /></>);
export const IconStructure = base(<><rect x="3" y="3" width="7" height="5" rx="1" /><rect x="14" y="10" width="7" height="4" rx="1" /><rect x="14" y="17" width="7" height="4" rx="1" /><path d="M6.5 8v10.5H14M6.5 12H14" /></>);
export const IconPrint = base(<><path d="M6 9V3h12v6" /><rect x="3" y="9" width="18" height="8" rx="2" /><path d="M6 14h12v7H6z" /></>);
export const IconExternal = base(<><path d="M14 4h6v6M20 4l-9 9" /><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" /></>);
export const IconUp = base(<path d="m6 15 6-6 6 6" />);
export const IconDown = base(<path d="m6 9 6 6 6-6" />);
export const IconMove = base(<><path d="M12 3v18M3 12h18" /><path d="m9 6 3-3 3 3M9 18l3 3 3-3M6 9l-3 3 3 3M18 9l3 3-3 3" /></>);
export const IconZoomIn = base(<><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4M11 8v6M8 11h6" /></>);
export const IconZoomOut = base(<><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4M8 11h6" /></>);
export const IconText = base(<path d="M5 6h14M5 12h14M5 18h9" />);
export const IconCloud = base(<path d="M7 18a5 5 0 1 1 .9-9.9A6 6 0 0 1 19 10a4 4 0 0 1-1 8z" />);
