import { useStore } from '../store';
import { navigate } from '../router';
import { IconSync } from './Icons';

/** Bouton d'état / de synchronisation Google Drive (compact : texte masqué sur téléphone). */
export function SyncPill({ compact }: { compact?: boolean }) {
  const { sync, syncNow } = useStore();
  const label = (() => {
    switch (sync.status) {
      case 'local': return 'Local (Drive non connecté)';
      case 'syncing': return sync.message || 'Synchronisation…';
      case 'offline': return sync.pending ? `Hors ligne · ${sync.pending} en attente` : 'Hors ligne';
      case 'reconnect': return 'Reconnecter Google Drive';
      case 'error': return 'Erreur de synchro — réessayer';
      default:
        return sync.pending ? `${sync.pending} modif. en attente` : 'Synchronisé avec Drive';
    }
  })();
  return (
    <button
      className={'syncpill ' + sync.status + (compact ? ' compact' : '')}
      title={sync.message || label}
      onClick={() => (sync.status === 'local' ? navigate('/reglages') : syncNow(true))}
    >
      <i />
      <IconSync className="syncpill-ico" />
      <span className="syncpill-txt" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
    </button>
  );
}
