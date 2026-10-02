import { lazy, Suspense, useEffect, useRef } from 'react';
import { Icon, type IconName } from './icons';
import { href, useRoute, type Section } from './router';
import { useStore, type ThemeMode } from './store';
import { useViewport } from './useViewport';
import { ChatPage } from './pages/ChatPage';

const ScenesPage = lazy(() => import('./pages/ScenesPage').then(m => ({ default: m.ScenesPage })));
const CharactersPage = lazy(() => import('./pages/CharactersPage').then(m => ({ default: m.CharactersPage })));
const StudioPage = lazy(() => import('./pages/StudioPage').then(m => ({ default: m.StudioPage })));
const BuildPage = lazy(() => import('./pages/BuildPage').then(m => ({ default: m.BuildPage })));

const NAV: { section: Section; label: string; icon: IconName }[] = [
  { section: 'chat', label: 'Chat', icon: 'chat' },
  { section: 'scenes', label: 'Scenes', icon: 'scenes' },
  { section: 'characters', label: 'Characters', icon: 'characters' },
  { section: 'studio', label: 'Studio', icon: 'studio' },
  { section: 'build', label: 'Build', icon: 'build' },
];
const THEMES: { mode: ThemeMode; icon: IconName; label: string }[] = [
  { mode: 'system', icon: 'system', label: 'System theme' },
  { mode: 'light', icon: 'sun', label: 'Light theme' },
  { mode: 'dark', icon: 'moon', label: 'Dark theme' },
];

export function Wordmark() {
  return <svg className="nx-wordmark" viewBox="0 0 200 108" width="76" height="40" aria-hidden="true">
    <text x="0" y="88" fontFamily="Avenir Next, Segoe UI, sans-serif" fontSize="88" fontWeight="700" letterSpacing="-5" fill="currentColor">Qivi<tspan fill="#f2453a">.</tspan></text>
  </svg>;
}

export default function App() {
  const route = useRoute();
  useViewport();
  const { themeMode, setThemeMode } = useStore();
  const main = useRef<HTMLElement>(null);
  const navIndex = NAV.findIndex(item => item.section === route.section);
  const theme = THEMES.find(item => item.mode === themeMode)!;
  const nextTheme = THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length];

  // New section: start at the top and give the page a meaningful title.
  useEffect(() => {
    main.current?.scrollTo({ top: 0 });
    document.title = route.section === 'chat' ? 'Qivi — a companion with character' : `${NAV[navIndex].label} · Qivi`;
  }, [route.section, route.detail, navIndex]);

  return <div className={`nx-app is-${route.section}`}>
    <a className="nx-skip" href="#nx-main">Skip to content</a>
    <header className="nx-topbar">
      <a className="nx-brand" href={href('chat')} aria-label="Qivi home"><Wordmark /></a>
      <nav className="nx-topnav" aria-label="Sections" style={{ '--index': navIndex } as React.CSSProperties}>
        <span className="nx-topnav-thumb" aria-hidden="true" />
        {NAV.map(item => <a key={item.section} href={href(item.section)} aria-current={route.section === item.section ? 'page' : undefined}><Icon name={item.icon} size={18} />{item.label}</a>)}
      </nav>
      <div className="nx-topbar-actions">
        <button type="button" className="nx-icon-btn" onClick={() => setThemeMode(nextTheme.mode)} aria-label={`${theme.label}. Switch to ${nextTheme.label.toLowerCase()}`} title={`${theme.label} — switch to ${nextTheme.label.toLowerCase()}`}>
          <Icon name={theme.icon} />
        </button>
        <a className="nx-icon-btn nx-hide-sm" href="https://github.com/yogeshhrathod/qivi" target="_blank" rel="noopener noreferrer" aria-label="GitHub repository (opens in a new tab)" title="GitHub"><Icon name="github" /></a>
        <a className="nx-sponsor" href="https://github.com/sponsors/yogeshhrathod" target="_blank" rel="noopener noreferrer"><Icon name="heart" size={18} /><span>Sponsor</span><span className="sr-only"> (opens in a new tab)</span></a>
      </div>
    </header>

    <main id="nx-main" ref={main} className="nx-main" tabIndex={-1}>
      <Suspense fallback={<div className="nx-loading" role="status"><span className="nx-spinner" aria-hidden="true" />Loading…</div>}>
        {route.section === 'chat' && <ChatPage />}
        {route.section === 'scenes' && <ScenesPage scene={route.detail} />}
        {route.section === 'characters' && <CharactersPage />}
        {route.section === 'studio' && <StudioPage />}
        {route.section === 'build' && <BuildPage />}
      </Suspense>
    </main>

    <nav className="nx-tabbar" aria-label="Sections" style={{ '--index': navIndex } as React.CSSProperties}>
      <span className="nx-tabbar-thumb" aria-hidden="true" />
      {NAV.map(item => <a key={item.section} href={href(item.section)} aria-current={route.section === item.section ? 'page' : undefined}>
        <Icon name={item.icon} size={22} /><span>{item.label}</span>
      </a>)}
    </nav>
  </div>;
}
