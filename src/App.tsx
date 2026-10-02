import { useEffect, useRef, useState } from "react";
import { useQiviAgent } from "./agent/useQiviAgent";
import { ChatPanel } from "./components/ChatPanel";
import { Gallery } from "./components/Gallery";
import { Studio, type Placement, type StudioSettings } from "./components/Studio";
import { QiviAvatar, STATES, type QiviExpression, type QiviState } from "@yogeshhrathod/qivi";

const FEATURES = [
  { title: "Ask", text: "Security insights in plain language", prompt: "What changed in my environment this week?" },
  { title: "Explore", text: "Find what matters first", prompt: "Show me critical vulnerabilities on exposed assets" },
  { title: "Analyze", text: "Go deeper into a finding", prompt: "Which patches should I deploy tonight?" },
  { title: "Simplify", text: "Turn noise into next steps", prompt: "Why did the inventory sync fail?" },
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

export default function App() {
  const agent = useQiviAgent();
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
    document.documentElement.classList.toggle("theme-dark", settings.dark);
  }, [settings.dark]);

  const state = stateOverride ?? agent.state;
  const expression = exprOverride ?? (stateOverride ? STATES[stateOverride].hint : agent.expression);
  const appearance = settings.dark ? "dark" : "light";

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="wordmark">
            Qivi<span className="wordmark-dot" />
          </span>
          <span className="tagline">Your AI Companion</span>
        </div>
        <StatusChip state={state} />
      </header>

      <main className="stage-grid">
        <section className="intro" aria-label="What Qivi can do">
          <ul className="features">
            {FEATURES.map((f) => (
              <li key={f.title}>
                <button type="button" className="feature" onClick={() => agent.send(f.prompt)}>
                  <span className="feature-title">{f.title}</span>
                  <span className="feature-text">{f.text}</span>
                </button>
              </li>
            ))}
          </ul>
          <p className="intro-note">Pick a prompt or type your own. Qivi reacts as it listens, searches, and answers.</p>
        </section>

        <section className="hero" aria-label="Qivi">
          <div className="hero-anchor">
            <QiviAvatar
              layer="viewport"
              size="100%"
              anchor={placement === "hero" ? null : els[placement]}
              voice={stateOverride === "listening" || stateOverride === "talking" ? "simulate" : agent.voice}
              personality={settings.personality}
              state={state}
              expression={expression}
              theme={settings.theme}
              appearance={appearance}
              shape={settings.shape}
              accent={settings.accent}
              glyphs={settings.glyphs}
              smile={settings.smile}
              lighting={settings.lighting}
              intensity={settings.intensity}
              particles={settings.particles}
              reducedMotion={settings.reducedMotion}
              autoSleep={settings.autoSleep}
            />
          </div>
          <div className="hero-copy">
            <h1>Always with you.</h1>
            <p>Tap the mic and talk: Qivi listens to your voice. Turn on spoken replies and it talks back.</p>
          </div>
          {placement !== "hero" && <span className="hero-empty">Qivi moved to the {placement === "dock" ? "chat" : "corner"}.</span>}
        </section>

        <ChatPanel
          messages={agent.messages}
          findings={agent.findings}
          state={state}
          onSend={agent.send}
          inputProps={agent.inputProps}
          mic={agent.mic}
          speech={agent.speech}
          bindInput={bind("input")}
          bindFindings={bind("findings")}
          bindAnswer={bind("answer")}
          bindDock={bind("dock")}
          docked={placement === "dock"}
          personality={settings.personality}
          theme={settings.theme}
        />
      </main>

      <div className="corner-anchor" ref={bind("corner")} aria-hidden="true" />

      <Studio
        settings={settings}
        onChange={(p) => setSettings((s) => ({ ...s, ...p }))}
        state={state}
        expression={expression}
        stateOverride={stateOverride}
        exprOverride={exprOverride}
        onStateOverride={setStateOverride}
        onExprOverride={setExprOverride}
        placement={placement}
        onPlacement={setPlacement}
      />

      <Gallery appearance={appearance} reducedMotion={settings.reducedMotion} />

      <footer className="sizes" aria-label="Size variants">
        {[16, 24, 32, 48].map((s) => (
          <figure key={s}>
            <QiviAvatar size={s} quality="static" personality={settings.personality} theme={settings.theme} expression={expression} state={state} />
            <figcaption>{s}px</figcaption>
          </figure>
        ))}
        <p>Under 48px, QiviAvatar switches to a static vector built from the same eye geometry and palette. Avatars that scroll offscreen pause their particle simulation.</p>
      </footer>
    </div>
  );
}

function StatusChip({ state }: { state: QiviState }) {
  const icon = state === "success" ? "✓" : state === "warning" ? "!" : state === "error" ? "×" : state === "idle" ? "•" : "…";
  return (
    <div className={`status status-${state}`} role="status" aria-live="polite">
      <span className="status-icon" aria-hidden="true">{icon}</span>
      Qivi: {STATES[state].text}
    </div>
  );
}
