import { useStore } from '../store';
import { navigate } from '../router';

export function SyncPill() {
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
      className={'syncpill ' + sync.status}
      title={sync.message || label}
      onClick={() => (sync.status === 'local' ? navigate('/reglages') : syncNow(true))}
    >
      <i />
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
    </button>
  );
}
