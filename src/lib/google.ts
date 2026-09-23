/**
 * Authentification Google (Google Identity Services, flux « token » côté navigateur).
 * Aucun serveur n'est nécessaire : le jeton d'accès est obtenu directement par le navigateur.
 * Portée « drive.file » : l'application ne voit que les fichiers qu'elle a elle-même créés.
 */

const SCOPE = 'https://www.googleapis.com/auth/drive.file';
const TOKEN_KEY = 'atelier618.token';
const CLIENT_KEY = 'atelier618.clientId';
const CONNECTED_KEY = 'atelier618.connected';

interface StoredToken {
  access_token: string;
  expires_at: number;
}

declare global {
  interface Window {
    google?: any;
  }
}

let scriptPromise: Promise<void> | null = null;
let tokenClient: any = null;
let pending: { resolve: (t: string) => void; reject: (e: Error) => void } | null = null;

export function getClientId(): string {
  return localStorage.getItem(CLIENT_KEY) || (import.meta.env.VITE_GOOGLE_CLIENT_ID as string) || '';
}

export function setClientId(id: string) {
  localStorage.setItem(CLIENT_KEY, id.trim());
  tokenClient = null;
}

/** L'utilisateur a-t-il déjà connecté son compte Google sur cet appareil ? */
export function wasConnected(): boolean {
  return localStorage.getItem(CONNECTED_KEY) === '1';
}

function loadScript(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://accounts.google.com/gsi/client';
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => {
        scriptPromise = null;
        reject(new Error('Impossible de charger le service de connexion Google (hors ligne ?)'));
      };
      document.head.appendChild(s);
    });
  }
  return scriptPromise;
}

function stored(): StoredToken | null {
  try {
    const t = JSON.parse(localStorage.getItem(TOKEN_KEY) || 'null') as StoredToken | null;
    return t && t.expires_at > Date.now() + 60_000 ? t : null;
  } catch {
    return null;
  }
}

/** Jeton valide déjà disponible (sans interaction). */
export function currentToken(): string | null {
  return stored()?.access_token ?? null;
}

async function ensureClient() {
  const clientId = getClientId();
  if (!clientId) throw new Error('Identifiant client Google non configuré (voir Réglages).');
  await loadScript();
  if (!tokenClient) {
    tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPE,
      callback: (resp: any) => {
        const p = pending;
        pending = null;
        if (resp.error) {
          p?.reject(new Error(resp.error_description || resp.error));
          return;
        }
        const tok: StoredToken = { access_token: resp.access_token, expires_at: Date.now() + Number(resp.expires_in || 3600) * 1000 };
        localStorage.setItem(TOKEN_KEY, JSON.stringify(tok));
        localStorage.setItem(CONNECTED_KEY, '1');
        p?.resolve(tok.access_token);
      },
      error_callback: (err: any) => {
        const p = pending;
        pending = null;
        p?.reject(new Error(err?.message || err?.type || 'Connexion Google annulée'));
      },
    });
  }
}

/**
 * Demande un jeton. `interactive` = appelé suite à un clic de l'utilisateur
 * (la fenêtre Google peut alors s'ouvrir).
 */
export async function requestToken(interactive: boolean): Promise<string> {
  const cur = currentToken();
  if (cur) return cur;
  await ensureClient();
  return new Promise((resolve, reject) => {
    pending = { resolve, reject };
    tokenClient.requestAccessToken({ prompt: interactive && !wasConnected() ? 'consent' : '' });
  });
}

export function signOut() {
  const t = currentToken();
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(CONNECTED_KEY);
  if (t && window.google?.accounts?.oauth2) window.google.accounts.oauth2.revoke(t, () => {});
}

export function invalidateToken() {
  localStorage.removeItem(TOKEN_KEY);
}
