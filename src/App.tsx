import { CharacterDrawer } from "./components/CharacterDrawer";
import { OptionIcon } from "./components/OptionIcon";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useQiviAgent } from "./agent/useQiviAgent";
import { ChatPanel } from "./components/ChatPanel";

import { ControlIcon } from "./components/ControlIcon";

import { Studio, type Placement, type StudioSettings } from "./components/Studio";
import { QiviAvatar, STATES, CHARACTERS, type QiviAvatarHandle, type QiviExpression, type QiviState } from "@yogeshhrathod/qivi";

const PlaygroundDialog = lazy(() => import('./components/PlaygroundDialog').then(module => ({ default: module.PlaygroundDialog })));
const ExamplesDialog = lazy(() => import('./components/ExamplesDialog').then(module => ({ default: module.ExamplesDialog })));

const FEATURES = [
  { title: "Write", prompt: "Help me draft a friendly follow-up email" },
  { title: "Plan", prompt: "Plan a focused afternoon" },
  { title: "Learn", prompt: "Explain how rainbows form" },
  { title: "Create", prompt: "Brainstorm names for a coffee shop" },
];

const INITIAL: StudioSettings = {
  personality: "core",
  theme: "auto",
  shape: "auto",
  accent: "auto",
  glyphs: true,
  smile: true,
  lighting: 1,
  intensity: 1,
  particles: 38000,
  reducedMotion: "auto",
  dark: false,
  autoSleep: true,
};

type ThemeMode = 'system' | 'light' | 'dark';
function readTheme(): ThemeMode {
  try { const value = localStorage.getItem('qivi-theme-mode'); if (value === 'light' || value === 'dark') return value; } catch { /* Storage is optional. */ }
  return 'system';
}
const CHARACTER_PREVIEWS = {
  qivi: { expression: 'curious', description: 'Curious explorer' },
  female: { expression: 'excited', description: 'Lively bursts' },
  male: { expression: 'happy', description: 'Gentle motion' },
  ember: { expression: 'playful', description: 'Playful star' },
  sage: { expression: 'neutral', description: 'Slow breathing' },
  atlas: { expression: 'focused', description: 'Steady shield' },
} as const;
export default function App() {
  const agent = useQiviAgent();
  const avatar = useRef<QiviAvatarHandle>(null);
  const settingsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (settingsTimer.current) clearTimeout(settingsTimer.current); }, []);
  const reactionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (reactionTimer.current) clearTimeout(reactionTimer.current); }, []);
  useEffect(() => {
    const viewport = window.visualViewport;
    const update = () => document.documentElement.style.setProperty('--showcase-height', `${viewport?.height ?? window.innerHeight}px`);
    update();
    viewport?.addEventListener('resize', update);
    window.addEventListener('resize', update);
    return () => {
      viewport?.removeEventListener('resize', update);
      window.removeEventListener('resize', update);
      document.documentElement.style.removeProperty('--showcase-height');
    };
  }, []);
  const [playgroundOpen, setPlaygroundOpen] = useState(false);
  const [examplesOpen, setExamplesOpen] = useState(false);
  const [charactersOpen, setCharactersOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsClosing, setSettingsClosing] = useState(false);
  function closeSettings() {
    if (settingsTimer.current) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { setSettingsOpen(false); return; }
    setSettingsClosing(true);
    settingsTimer.current = setTimeout(() => { setSettingsOpen(false); setSettingsClosing(false); settingsTimer.current = null; }, 160);
  }
  const [characterVersion, setCharacterVersion] = useState<keyof typeof CHARACTERS>('qivi');
  const [themeMode, setThemeMode] = useState<ThemeMode>(readTheme);
  const [systemDark, setSystemDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches);
  const dark = themeMode === 'dark' || (themeMode === 'system' && systemDark);
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const update = () => setSystemDark(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    if (!settingsOpen) return;
    const focus = document.activeElement as HTMLElement | null;
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') closeSettings(); };
    window.addEventListener('keydown', close);
    return () => { window.removeEventListener('keydown', close); focus?.focus(); };
  }, [settingsOpen]);
  const [settings, setSettings] = useState<StudioSettings>(INITIAL);
  const [stateOverride, setStateOverride] = useState<QiviState | null>(null);
  const [exprOverride, setExprOverride] = useState<QiviExpression | null>(null);
  const [placement, setPlacement] = useState<Placement>("hero");
  const [els, setEls] = useState<Record<string, HTMLElement | null>>({});
  const binders = useRef(new Map<string, (el: HTMLElement | null) => void>());
  const bind = (key: string) => {
    let fn = binders.current.get(key);
    if (!fn) {
      fn = (el) => setEls((m) => (m[key] === el ? m : { ...m, [key]: el }));
      binders.current.set(key, fn);
    }
    return fn;
  };

  useEffect(() => {
    document.documentElement.classList.toggle("theme-dark", dark);
    document.documentElement.style.colorScheme = dark ? "dark" : "light";
    try { localStorage.setItem('qivi-theme-mode', themeMode); } catch { /* Storage is optional. */ }
  }, [dark, themeMode]);

  const state = stateOverride ?? agent.state;
  const expression = exprOverride ?? (stateOverride ? STATES[stateOverride].hint : agent.expression);
  const appearance = dark ? "dark" : "light";

  const send = (text: string) => {
    if (reactionTimer.current) clearTimeout(reactionTimer.current);
    setStateOverride(null);
    setExprOverride(null);
    agent.send(text);
  };
  const react = (reaction: 'happy' | 'thinking' | 'warning' | 'playful') => {
    if (reactionTimer.current) clearTimeout(reactionTimer.current);
    setStateOverride(reaction === 'thinking' || reaction === 'warning' ? reaction : null);
    setExprOverride(reaction === 'warning' ? 'concern' : reaction);
    avatar.current?.impulse(reaction === 'happy' ? 'bounce' : reaction === 'playful' ? 'flick' : 'ripple');
    reactionTimer.current = setTimeout(() => { setStateOverride(null); setExprOverride(null); }, 3500);
  };

  return (
    <div className={`app ${settingsOpen ? 'settings-open' : ''}`}>
      <header className="topbar">
        <a className="brand" href="/" aria-label="Qivi home">
          <svg className="brand-wordmark" width="88" height="46" viewBox="0 0 200 108" aria-hidden="true">
            <text x="0" y="88" fontFamily="Avenir Next, Segoe UI, sans-serif" fontSize="88" fontWeight="700" letterSpacing="-5" fill="currentColor">Qivi<tspan fill="#f2453a">.</tspan></text>
          </svg>
          <span className="tagline">A companion with character</span>
        </a>
        <div className="topbar-actions">
          <button className="header-icon" aria-label="Change character" title="Change character" aria-expanded={charactersOpen} onClick={() => setCharactersOpen(true)}><OptionIcon name="person" /></button>
          <button className="nav-action" aria-label="Explore features" title="Avatar playground" onClick={() => setPlaygroundOpen(true)}><ControlIcon kind="playground" /><span>Playground</span></button>
          <button className="header-icon" aria-label="Avatar settings" title="Live avatar settings" aria-expanded={settingsOpen} aria-controls="avatar-settings" onClick={() => settingsOpen ? closeSettings() : setSettingsOpen(true)}><ControlIcon kind="settings" /></button>
        </div>
      </header>

      <main className={`chat-showcase ${agent.messages.length ? 'has-conversation' : ''}`}>
        <section className="hero" aria-label="Live avatar stage">
          <div className="hero-copy"><h1>A little character.<br />A lot of feeling.</h1><p>Say something. See what happens.</p></div>
          <div className="hero-anchor">
            <QiviAvatar ref={avatar} character={CHARACTERS[characterVersion]} layer={placement === 'hero' ? 'contained' : 'viewport'} size="100%" anchor={placement === 'hero' ? null : els[placement]}
              voice={stateOverride === 'listening' || stateOverride === 'talking' ? 'simulate' : agent.voice}
              personality={settings.personality} state={state} expression={exprOverride ?? (state === 'idle' ? CHARACTER_PREVIEWS[characterVersion].expression : expression)}
              theme={settings.theme} appearance={appearance} shape={settings.shape} accent={settings.accent} glyphs={settings.glyphs} smile={settings.smile}
              lighting={settings.lighting} intensity={settings.intensity} particles={settings.particles} reducedMotion={settings.reducedMotion} autoSleep={settings.autoSleep} />
          </div>
          <div className="stage-controls">
            <div className="character-identity"><strong>{CHARACTERS[characterVersion].name}</strong><span>{CHARACTER_PREVIEWS[characterVersion].description}</span></div>
            <button className="character-trigger" aria-label="Change stage character" aria-expanded={charactersOpen} onClick={() => setCharactersOpen(true)}><OptionIcon name="person" /><span>Change character</span></button>
          </div>
          <div className="reaction-controls" role="group" aria-label="Try an avatar reaction">
            <span className="reaction-caption">Try a feeling</span>
            {(['happy', 'thinking', 'warning', 'playful'] as const).map(reaction => <button key={reaction} aria-label={`Show ${reaction} reaction`} aria-pressed={reaction === 'warning' ? stateOverride === 'warning' : exprOverride === reaction} onClick={() => react(reaction)}><OptionIcon name={reaction === 'happy' ? 'smile' : reaction === 'warning' ? 'warning' : reaction === 'playful' ? 'spark' : 'thinking'} /><span>{reaction === 'happy' ? 'Joy' : reaction === 'thinking' ? 'Think' : reaction === 'warning' ? 'Alert' : 'Play'}</span></button>)}
          </div>
          {placement !== 'hero' && <span className="hero-empty">{CHARACTERS[characterVersion].name} is in the {placement === 'dock' ? 'chat' : 'corner'}.</span>}
        </section>

        <div className="conversation-pane">
          <header className="conversation-heading"><div><h2>{agent.messages.length ? 'Our conversation' : 'Say hello.'}</h2><p>{agent.messages.length ? 'Keep the conversation going.' : 'A question, a thought, a little curiosity.'}</p></div><StatusChip state={state} name={CHARACTERS[characterVersion].name} /></header>
          {agent.messages.length === 0 && <section className="intro" aria-label="Conversation starters"><ul className="features">{FEATURES.map(feature => <li key={feature.title}><button className="feature" onClick={() => send(feature.prompt)}><OptionIcon name={feature.title} /><span>{feature.prompt}</span><small>{feature.title}</small></button></li>)}</ul></section>}
          <ChatPanel character={CHARACTERS[characterVersion]} messages={agent.messages} findings={agent.findings} state={state} onSend={send} inputProps={agent.inputProps} mic={agent.mic} speech={agent.speech}
            bindInput={bind('input')} bindFindings={bind('findings')} bindAnswer={bind('answer')} bindDock={bind('dock')} docked={placement === 'dock'} personality={settings.personality} theme={settings.theme} />
        </div>
      </main>

      <footer className="showcase-footer">
        <button className="examples-link" onClick={() => setExamplesOpen(true)}><OptionIcon name="eye" /><span>See Qivi in action</span></button>
        <nav className="project-links" aria-label="Project links"><a href="https://github.com/yogeshhrathod/qivi" target="_blank" rel="noopener noreferrer"><OptionIcon name="code" />GitHub<span className="sr-only"> (opens in a new tab)</span></a><a href="https://github.com/sponsors/yogeshhrathod" target="_blank" rel="noopener noreferrer"><OptionIcon name="heart" />Sponsor<span className="sr-only"> (opens in a new tab)</span></a></nav>
      </footer>
      <div className="corner-anchor" ref={bind('corner')} aria-hidden="true" />

      <Suspense fallback={<div className="loading-notice" role="status">Opening showcase…</div>}>
        {playgroundOpen && <PlaygroundDialog onClose={() => setPlaygroundOpen(false)} appearance={appearance} reducedMotion={settings.reducedMotion} />}
        {examplesOpen && <ExamplesDialog onClose={() => setExamplesOpen(false)} appearance={appearance} reducedMotion={settings.reducedMotion} />}
      </Suspense>
      {settingsOpen && <aside id="avatar-settings" className={`avatar-settings ${settingsClosing ? "is-closing" : ""}`} aria-label="Avatar settings">
        <div className="settings-header"><div><h2>Make it yours</h2><p>Every change appears live.</p></div><button className="header-icon" aria-label="Close avatar settings" onClick={closeSettings}><ControlIcon kind="close" /></button></div>
        <div className="settings-scroll">
          <fieldset className="settings-group"><legend><OptionIcon name="palette" />Page theme</legend><div className="settings-options">{(['system', 'light', 'dark'] as const).map(mode => <button key={mode} aria-pressed={themeMode === mode} onClick={() => setThemeMode(mode)}><OptionIcon name={mode} />{mode}</button>)}</div></fieldset>
          <Studio embedded settings={{ ...settings, dark }} onChange={({ dark: selectedDark, ...patch }) => { if (selectedDark !== undefined) setThemeMode(selectedDark ? 'dark' : 'light'); setSettings(previous => ({ ...previous, ...patch })); }} state={state} expression={expression} stateOverride={stateOverride} exprOverride={exprOverride} onStateOverride={setStateOverride} onExprOverride={setExprOverride} placement={placement} onPlacement={setPlacement} />
        </div>
      </aside>}
      {charactersOpen && <CharacterDrawer selected={characterVersion} previews={CHARACTER_PREVIEWS} appearance={appearance} reducedMotion={settings.reducedMotion} onClose={() => setCharactersOpen(false)} onSelect={version => {
        const character = CHARACTERS[version]; setCharacterVersion(version);
        setSettings(previous => ({ ...previous, personality: character.personality, theme: character.theme, shape: character.shape }));
        setExprOverride(null); setStateOverride(null); setCharactersOpen(false);
      }} />}
    </div>
  );
}

function StatusChip({ state, name }: { state: QiviState; name: string }) {
  const icon = state === "success" ? "✓" : state === "warning" ? "!" : state === "error" ? "×" : state === "idle" ? "•" : "…";
  return (
    <div className={`status status-${state}`} role="status" aria-live="polite">
      <span className="status-icon" aria-hidden="true">{icon}</span>
      <span>{STATES[state].text}<span className="sr-only"> · {name}</span></span>
    </div>
  );
}
