/**
 * Tiny hash router: `#/` hub, `#/games/<id>` game pages, `#/heroes` hero gallery. Hash routing works from file:// (the APK)
 * and from any static host without server rewrites.
 */
import { lazy, Suspense, useEffect, useState, type ComponentType } from 'react';
import type { GameId } from '../store/useGameStore';

export const navigate = (path: string): void => { window.location.hash = path; };
function useHashPath(): string {
  const read = () => window.location.hash.replace(/^#/, '') || '/';
  const [path, setPath] = useState(read);
  useEffect(() => { const on = () => setPath(read()); window.addEventListener('hashchange', on); return () => window.removeEventListener('hashchange', on); }, []);
  return path;
}

const PAGES: Record<GameId, ComponentType> = {
  'totem-cases': lazy(() => import('./games/totem-cases/page')),
  hyperloop: lazy(() => import('./games/hyperloop/page')),
  monoliths: lazy(() => import('./games/monoliths/page')),
  anagram: lazy(() => import('./games/anagram/page')),
  baiterek: lazy(() => import('./games/baiterek/page')),
  gravity: lazy(() => import('./games/gravity/page')),
  city: lazy(() => import('./games/city/page')),
  lego: lazy(() => import('./games/lego/page'))
};
const Hub = lazy(() => import('./page'));
const Heroes = lazy(() => import('./heroes/page'));

export function Router() {
  const path = useHashPath();
  const m = /^\/games\/([a-z-]+)/.exec(path);
  const Page = m && (PAGES as Record<string, ComponentType | undefined>)[m[1]];
  return (
    <Suspense fallback={<div className="grid h-full place-items-center text-turq-300">◌</div>}>
      {Page ? <Page /> : path.startsWith('/heroes') ? <Heroes /> : <Hub />}
    </Suspense>
  );
}
