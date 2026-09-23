import type { ReactNode } from 'react';
import { useStore } from './store';
import { href, useRoute } from './router';
import { ToastHost } from './components/ui';
import {
  IconBack, IconDash, IconDocs, IconGantt, IconHelp, IconHome, IconObs, IconPlan, IconPlus, IconReport, IconSearch, IconSettings, IconStructure, IconInfo,
} from './components/Icons';
import { SyncPill } from './components/SyncPill';
import { Home } from './pages/Home';
import { Settings } from './pages/Settings';
import { Help } from './pages/Help';
import { Dashboard } from './pages/Dashboard';
import { ProjectInfoPage } from './pages/ProjectInfo';
import { Structure } from './pages/Structure';
import { Gantt } from './pages/Gantt';
import { Plans } from './pages/Plans';
import { Observations } from './pages/Observations';
import { ObservationPage } from './pages/ObservationPage';
import { Reports } from './pages/Reports';
import { ReportEdit } from './pages/ReportEdit';
import { ReportPrint } from './pages/ReportPrint';
import { Documents } from './pages/Documents';
import { Search } from './pages/Search';

const PROJECT_NAV: { key: string; label: string; short: string; icon: (p: any) => ReactNode; mobile?: boolean }[] = [
  { key: '', label: 'Tableau de bord', short: 'Accueil', icon: IconDash, mobile: true },
  { key: 'gantt', label: 'Gantt', short: 'Gantt', icon: IconGantt, mobile: true },
  { key: 'plans', label: 'Plans', short: 'Plans', icon: IconPlan, mobile: true },
  { key: 'obs', label: 'Observations', short: 'Pastilles', icon: IconObs, mobile: true },
  { key: 'cr', label: 'Comptes rendus', short: 'CR', icon: IconReport, mobile: true },
  { key: 'docs', label: 'Documents', short: 'Docs', icon: IconDocs },
  { key: 'structure', label: 'Blocs & sous-blocs', short: 'Structure', icon: IconStructure },
  { key: 'infos', label: 'Informations', short: 'Infos', icon: IconInfo },
  { key: 'recherche', label: 'Recherche', short: 'Recherche', icon: IconSearch },
];

export function App() {
  const route = useRoute();
  const store = useStore();
  const [section, pid, sub, subId, extra] = route.parts;

  if (!store.loaded) return <div className="empty">Chargement…</div>;

  // Page d'impression plein écran (sans navigation)
  if (section === 'p' && sub === 'cr' && subId && extra === 'imprimer') return <ReportPrint projectId={pid} reportId={subId} />;

  const project = section === 'p' ? store.get(pid) : undefined;
  let page: ReactNode;
  let title: ReactNode = '';
  let back: string | undefined;

  if (section === 'p') {
    if (!project) {
      page = (
        <div className="empty">
          <span className="serif">Projet introuvable</span>
          <a className="btn ghost" href={href('/')}>Retour aux projets</a>
        </div>
      );
    } else {
      back = '/';
      title = project.info.nom || 'Projet';
      switch (sub) {
        case undefined: page = <Dashboard p={project} />; break;
        case 'infos': page = <ProjectInfoPage p={project} />; break;
        case 'structure': page = <Structure p={project} />; break;
        case 'gantt': page = <Gantt p={project} />; break;
        case 'plans': page = <Plans p={project} planId={subId} query={route.query} />; break;
        case 'obs':
          if (subId) { page = <ObservationPage p={project} obsId={subId} />; back = `/p/${pid}/obs`; }
          else page = <Observations p={project} query={route.query} />;
          break;
        case 'cr':
          if (subId) { page = <ReportEdit p={project} reportId={subId} />; back = `/p/${pid}/cr`; }
          else page = <Reports p={project} />;
          break;
        case 'docs': page = <Documents p={project} />; break;
        case 'recherche': page = <Search p={project} query={route.query} />; break;
        default: page = <Dashboard p={project} />;
      }
    }
  } else if (section === 'reglages') {
    page = <Settings />; title = 'Réglages'; back = '/';
  } else if (section === 'aide') {
    page = <Help />; title = 'Notice d’utilisation'; back = '/';
  } else {
    page = <Home />;
  }

  const isHome = !section;
  const wide = sub === 'gantt' || sub === 'plans';

  return (
    <div className="shell">
      <aside className="sidebar">
        <a className="brand" href={href('/')}>
          <span className="serif">Atelier</span>
          <span className="num">618</span>
        </a>
        <nav className="nav">
          <a href={href('/')} className={isHome ? 'on' : ''}><IconHome /> Mes projets</a>
        </nav>
        {project && (
          <>
            <div className="proj-name">
              <span className="eyebrow" style={{ color: '#8f8578' }}>Projet {String(project.info.numero).padStart(2, '0')}</span>
              <span className="serif">{project.info.nom}</span>
            </div>
            <nav className="nav">
              {PROJECT_NAV.map((n) => (
                <a key={n.key} href={href(`/p/${project.id}${n.key ? '/' + n.key : ''}`)} className={(sub ?? '') === n.key ? 'on' : ''}>
                  <n.icon /> {n.label}
                </a>
              ))}
            </nav>
          </>
        )}
        <div className="foot">
          <nav className="nav">
            <a href={href('/aide')} className={section === 'aide' ? 'on' : ''}><IconHelp /> Notice</a>
            <a href={href('/reglages')} className={section === 'reglages' ? 'on' : ''}><IconSettings /> Réglages</a>
          </nav>
          <SyncPill />
        </div>
      </aside>

      <div className="main">
        {!isHome && (
          <header className="topbar no-print">
            {back !== undefined && (
              <a className="btn ghost sm icon back" href={href(back)} aria-label="Retour"><IconBack /></a>
            )}
            <h1 className="grow" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</h1>
            {project && (
              <a className="btn ghost sm icon" href={href(`/p/${project.id}/recherche`)} aria-label="Rechercher"><IconSearch /></a>
            )}
          </header>
        )}
        <main className={'content' + (wide ? ' wide' : '')}>{page}</main>
      </div>

      {project && (
        <>
          <nav className="bottomnav no-print">
            {PROJECT_NAV.filter((n) => n.mobile).map((n) => (
              <a key={n.key} href={href(`/p/${project.id}${n.key ? '/' + n.key : ''}`)} className={(sub ?? '') === n.key ? 'on' : ''}>
                <n.icon /> {n.short}
              </a>
            ))}
          </nav>
          {sub !== 'plans' && !(sub === 'obs' && subId) && (
            <a className="fab no-print" href={href(`/p/${project.id}/plans?placer=1`)} aria-label="Nouvelle observation">
              <IconPlus />
            </a>
          )}
        </>
      )}
      {isHome && (
        <nav className="bottomnav no-print">
          <a href={href('/')} className="on"><IconHome /> Projets</a>
          <a href={href('/aide')}><IconHelp /> Notice</a>
          <a href={href('/reglages')}><IconSettings /> Réglages</a>
        </nav>
      )}
      <ToastHost />
    </div>
  );
}
