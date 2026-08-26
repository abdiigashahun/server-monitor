import { useState, useEffect } from 'react';

export interface Route {
  tab: string;
  id?: string;
}

// Lightweight hash router (no react-router dependency). Routes look like
// `#/servers` or `#/servers/<id>`.
export function parseHash(): Route {
  const raw = window.location.hash.replace(/^#\/?/, '');
  const [tab, id] = raw.split('/');
  return { tab: tab || 'dashboard', id: id || undefined };
}

export function navigate(tab: string, id?: string): void {
  window.location.hash = id ? `#/${tab}/${id}` : `#/${tab}`;
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(parseHash);
  useEffect(() => {
    const handler = () => setRoute(parseHash());
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  }, []);
  return route;
}
