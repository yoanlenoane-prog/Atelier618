import { useState } from 'react';
import { useStore } from '../store';
import { href } from '../router';
import { getClientId, setClientId, wasConnected } from '../lib/google';
import { toast } from '../components/ui';
import { IconCloud, IconSync } from '../components/Icons';

export function Settings() {
  const store = useStore();
  const [clientId, setId] = useState(getClientId());
  const [busy, setBusy] = useState(false);
  const connected = wasConnected() && store.sync.status !== 'local';
  const origin = location.origin + location.pathname.replace(/index\.html$/, '');

  return (
    <div className="stack lg" style={{ maxWidth: 760 }}>
      <div className="card">
        <div className="row between wrap">
          <h2>Google Drive</h2>
          <span className={'tag ' + (connected ? 'early' : '')}>{connected ? 'Connecté' : 'Non connecté'}</span>
        </div>
        <p className="small muted">
          Toutes les données sont enregistrées dans votre Google Drive, dans le dossier <strong>ChantierApp</strong>. L’application n’a accès
          qu’aux fichiers qu’elle a elle-même créés.
        </p>
        <div className="row wrap">
          {!connected ? (
            <button
              className="btn"
              disabled={!getClientId() || busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await store.connect();
                  toast('Google Drive connecté');
                } catch (e) {
                  toast((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              <IconCloud /> Se connecter avec Google
            </button>
          ) : (
            <>
              <button className="btn" onClick={() => store.syncNow(true)}><IconSync /> Synchroniser maintenant</button>
              <button className="btn ghost" onClick={() => { store.disconnect(); toast('Déconnecté — les données restent sur l’appareil et dans Drive'); }}>Se déconnecter</button>
            </>
          )}
        </div>
        {store.sync.message && <p className="small" style={{ marginTop: 10 }}>{store.sync.message}</p>}
        {store.sync.lastSync && <p className="tiny muted">Dernière synchronisation : {new Date(store.sync.lastSync).toLocaleString('fr-FR')}</p>}
      </div>

      <div className="card">
        <h2>Identifiant client Google</h2>
        <p className="small muted">
          Nécessaire une seule fois pour autoriser l’application à accéder à Google Drive (voir la <a href={href('/aide')}>notice</a>, section « Première
          configuration »). Origine JavaScript autorisée à déclarer : <code>{location.origin}</code>
        </p>
        <div className="row wrap">
          <input type="text" className="grow" style={{ minWidth: 240 }} placeholder="xxxxxxxx.apps.googleusercontent.com" value={clientId} onChange={(e) => setId(e.target.value)} />
          <button
            className="btn ghost"
            disabled={clientId.trim() === getClientId()}
            onClick={() => {
              setClientId(clientId);
              toast('Identifiant enregistré');
            }}
          >
            Enregistrer
          </button>
        </div>
        <p className="tiny muted" style={{ marginTop: 8 }}>Adresse de l’application : {origin}</p>
      </div>

      <div className="card">
        <h2>Installer sur le téléphone</h2>
        <ul className="small" style={{ paddingLeft: 18, margin: 0 }}>
          <li><strong>iPhone (Safari)</strong> : bouton Partager → « Sur l’écran d’accueil ».</li>
          <li><strong>Android (Chrome)</strong> : menu ⋮ → « Installer l’application ».</li>
          <li><strong>Ordinateur (Chrome / Edge)</strong> : icône d’installation dans la barre d’adresse.</li>
        </ul>
      </div>

      <div className="card">
        <h2>Données sur cet appareil</h2>
        <p className="small muted">
          {store.projects.length} projet(s) enregistrés localement pour le travail hors connexion.
          {store.sync.pending > 0 && ` ${store.sync.pending} projet(s) ont des modifications pas encore envoyées vers Drive.`}
        </p>
      </div>
    </div>
  );
}
