import { useEffect, useState } from 'react';

/** Routage par « # » : fonctionne sur n'importe quel hébergement statique (GitHub Pages…). */
export interface Route {
  parts: string[];
  query: URLSearchParams;
}

function parse(): Route {
  const raw = location.hash.replace(/^#\/?/, '');
  const [path, qs] = raw.split('?');
  return { parts: path.split('/').filter(Boolean).map(decodeURIComponent), query: new URLSearchParams(qs || '') };
}

export function useRoute(): Route {
  const [route, setRoute] = useState(parse);
  useEffect(() => {
    const on = () => {
      setRoute(parse());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}

export function navigate(path: string, replace = false) {
  const h = '#' + (path.startsWith('/') ? path : '/' + path);
  if (replace) history.replaceState(null, '', h), window.dispatchEvent(new HashChangeEvent('hashchange'));
  else location.hash = h;
}

export function href(path: string): string {
  return '#' + (path.startsWith('/') ? path : '/' + path);
}
