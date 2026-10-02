import { useState } from 'react';
import { EXPRESSIONS, PALETTES, PERSONALITIES, STATES } from '@yogeshhrathod/qivi';
import llms from '../../../library/qivi/llms.txt?raw';
import guide from '../../../library/qivi/docs/performance.md?raw';
import bannerLight from '../../../docs/assets/qivi-banner-light.png';
import bannerDark from '../../../docs/assets/qivi-banner-dark.png';
import { Icon, type IconName } from '../icons';
import { href } from '../router';
import { useStore } from '../store';
import { CodeBlock, PageHeader, Segmented } from '../ui';

const INSTALL = 'npm install @yogeshhrathod/qivi react@^19 react-dom@^19 three@^0.180';
const SNIPPETS = {
  start: { label: 'Quick start', code: `import { QiviAvatar } from "@yogeshhrathod/qivi";\nimport "@yogeshhrathod/qivi/styles.css";\n\nexport function Companion() {\n  return <QiviAvatar size={160} personality="core" state="idle" />;\n}` },
  agent: { label: 'Chat agent', code: `// Map your backend's progress to avatar states.\nconst [state, setState] = useState<QiviState>("idle");\n\nasync function ask(question: string, signal: AbortSignal) {\n  setState("thinking");\n  for await (const event of yourBackend(question, signal)) {\n    if (event.type === "progress") setState(event.phase); // searching, analyzing…\n    if (event.type === "token") setState("answering");\n  }\n  setState("success");\n}\n\n<QiviAvatar state={state} expression={state === "error" ? "concern" : undefined} />` },
  voice: { label: 'Voice', code: `import { QiviAvatar, QiviVoice } from "@yogeshhrathod/qivi";\n\n// Microphone: call from a click handler.\nconst mic = await QiviVoice.microphone();\n<QiviAvatar state="listening" voice={mic} />\n\n// Your TTS audio: mouth follows the real waveform.\nconst audio = new Audio(ttsUrl);\nconst voice = QiviVoice.fromMediaElement(audio);\n<QiviAvatar state="talking" voice={voice} />\nawait audio.play();\n// dispose() when finished` },
  character: { label: 'Character', code: `import { QiviAvatar, CHARACTERS, type QiviCharacter } from "@yogeshhrathod/qivi";\n\nconst Pip: QiviCharacter = {\n  ...CHARACTERS.qivi,\n  name: "Pip",\n  personality: "spark",\n  theme: { deep: "#0f3b2e", mid: "#1f9d74", pale: "#b9f0d8",\n           warm: "#ffc04d", hi: "#fff0b8", accent: "#ff8a3d" },\n  params: { width: 0.96, spacing: 0.9 },\n};\n\n<QiviAvatar character={Pip} expression="excited" />` },
} as const;
type SnippetKey = keyof typeof SNIPPETS;

const FACTS: { value: string; label: string; icon: IconName }[] = [
  { value: String(Object.keys(STATES).length), label: 'activity states', icon: 'gauge' },
  { value: String(Object.keys(EXPRESSIONS).length), label: 'expressions', icon: 'smile' },
  { value: String(Object.keys(PERSONALITIES).length), label: 'personalities', icon: 'sparkle' },
  { value: String(Object.keys(PALETTES).length), label: 'palettes + custom', icon: 'palette' },
  { value: '9', label: 'gestures', icon: 'zap' },
  { value: '6', label: 'characters', icon: 'characters' },
];
const FEATURES: { title: string; text: string; icon: IconName }[] = [
  { title: 'Voice-reactive', text: 'Microphone, audio elements, speech synthesis, manual pulses or simulation.', icon: 'wave' },
  { title: 'Timed performances', text: 'Cue feelings, gestures and shapes against any playback clock.', icon: 'story' },
  { title: 'Flies across your UI', text: 'A viewport layer follows anchors and streams particles at targets.', icon: 'guide' },
  { title: 'Graceful fallback', text: 'A crisp SVG face for small sizes and devices without WebGL.', icon: 'layers' },
  { title: 'Respectful by default', text: 'Follows reduced motion, pauses offscreen and dozes when idle.', icon: 'moon' },
  { title: 'Provider-independent', text: 'No model SDK or API key inside. Bring any backend.', icon: 'shield' },
];

const download = (text: string) => `data:text/plain;charset=utf-8,${encodeURIComponent(text)}`;

export function BuildPage() {
  const { appearance } = useStore();
  const [snippet, setSnippet] = useState<SnippetKey>('start');
  return <div className="nx-page nx-build">
    <PageHeader eyebrow="For developers" icon="build" title="Add a companion in one line." text="Qivi is a React 19 component with Three.js particles, typed presets and an imperative handle for gestures." />

    <img className="nx-banner" src={appearance === 'dark' ? bannerDark : bannerLight} alt="Qivi particle avatars, captured from the live component" width={1200} height={440} decoding="async" />

    <ul className="nx-facts">{FACTS.map((f, i) => <li key={f.label} style={{ '--i': i } as React.CSSProperties}><Icon name={f.icon} size={18} /><strong>{f.value}</strong><span>{f.label}</span></li>)}</ul>

    <section className="nx-build-section" aria-labelledby="install-title">
      <h2 id="install-title"><span className="nx-step-num">1</span>Install</h2>
      <CodeBlock code={INSTALL} label="Terminal" compact />
      <p className="nx-panel-note">React, React DOM and Three.js are peer dependencies. Import the stylesheet once at your entry point; in server-component frameworks render Qivi inside a client component.</p>
    </section>

    <section className="nx-build-section" aria-labelledby="use-title">
      <h2 id="use-title"><span className="nx-step-num">2</span>Use it</h2>
      <div className="nx-snippet-tabs"><Segmented label="Example" value={snippet} onChange={setSnippet} options={(Object.keys(SNIPPETS) as SnippetKey[]).map(k => ({ value: k, label: SNIPPETS[k].label }))} /></div>
      <CodeBlock code={SNIPPETS[snippet].code} label={SNIPPETS[snippet].label} />
    </section>

    <section className="nx-build-section" aria-labelledby="features-title">
      <h2 id="features-title"><span className="nx-step-num">3</span>Go further</h2>
      <ul className="nx-feature-list">{FEATURES.map(f => <li key={f.title}><span className="nx-feature-icon"><Icon name={f.icon} /></span><span><strong>{f.title}</strong>{f.text}</span></li>)}</ul>
      <div className="nx-build-links">
        <a className="nx-btn" href={href('scenes')}><Icon name="scenes" size={18} />See every scenario</a>
        <a className="nx-btn" href={href('studio')}><Icon name="studio" size={18} />Design yours in the studio</a>
      </div>
    </section>

    <section className="nx-build-section" aria-labelledby="docs-title">
      <h2 id="docs-title"><span className="nx-step-num">4</span>Docs & community</h2>
      <div className="nx-resource-grid">
        <a className="nx-resource" download="qivi-performance.md" href={download(guide)}><Icon name="book" /><span><strong>Full API guide</strong><small>Characters, expressions, performance, audio</small></span><Icon name="download" size={18} /></a>
        <a className="nx-resource" download="llms.txt" href={download(llms)}><Icon name="terminal" /><span><strong>LLM guide</strong><small>Machine-readable index for AI tools</small></span><Icon name="download" size={18} /></a>
        <a className="nx-resource" href="https://github.com/yogeshhrathod/qivi" target="_blank" rel="noopener noreferrer"><Icon name="github" /><span><strong>GitHub</strong><small>Source, issues and releases</small></span><Icon name="external" size={18} /><span className="sr-only"> (opens in a new tab)</span></a>
        <a className="nx-resource is-sponsor" href="https://github.com/sponsors/yogeshhrathod" target="_blank" rel="noopener noreferrer"><Icon name="heart" /><span><strong>Sponsor</strong><small>Support independent development</small></span><Icon name="external" size={18} /><span className="sr-only"> (opens in a new tab)</span></a>
      </div>
    </section>

    <footer className="nx-footer"><span>Qivi is maintained by <a href="https://github.com/yogeshhrathod" target="_blank" rel="noopener noreferrer">Yogesh Rathod</a>.</span><a href="../">Classic showcase</a></footer>
  </div>;
}
