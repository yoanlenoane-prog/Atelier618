import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/inter';
import '@fontsource/instrument-serif/400.css';
import '@fontsource/instrument-serif/400-italic.css';
import './styles.css';
import { StoreProvider } from './store';
import { App } from './App';
import { handleRedirectReturn } from './lib/google';

// Retour de la page de connexion Google (connexion par redirection)
const authError = handleRedirectReturn();
if (authError) setTimeout(() => alert(authError), 500);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StoreProvider>
      <App />
    </StoreProvider>
  </StrictMode>
);

// Service worker : application disponible hors connexion
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}

// Demande au navigateur de ne pas effacer les données locales (photos prises hors ligne…)
navigator.storage?.persist?.().catch(() => {});
