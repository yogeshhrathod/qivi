import { useEffect, useState } from 'react';
import { flushSync } from 'react-dom';

export type Section = 'chat' | 'scenes' | 'characters' | 'studio' | 'build';
export interface Route { section: Section; detail: string | null }

const SECTIONS: Section[] = ['chat', 'scenes', 'characters', 'studio', 'build'];

function parse(hash: string): Route {
  const [section, detail] = hash.replace(/^#\/?/, '').split('/');
  return SECTIONS.includes(section as Section) ? { section: section as Section, detail: detail || null } : { section: 'chat', detail: null };
}

export const href = (section: Section, detail?: string) => `#/${section}${detail ? `/${detail}` : ''}`;

/** Hash routes deep-link on GitHub Pages and keep the browser back button meaningful. */
export function useRoute() {
  const [route, setRoute] = useState(() => parse(location.hash));
  useEffect(() => {
    const update = () => {
      const next = parse(location.hash);
      const reduce = document.documentElement.classList.contains('nx-reduce') || matchMedia('(prefers-reduced-motion: reduce)').matches;
      const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };
      if (doc.startViewTransition && !reduce) doc.startViewTransition(() => flushSync(() => setRoute(next)));
      else setRoute(next);
    };
    window.addEventListener('hashchange', update);
    return () => window.removeEventListener('hashchange', update);
  }, []);
  return route;
}
