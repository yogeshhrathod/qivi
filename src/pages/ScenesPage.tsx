import { lazy, Suspense, type ComponentType, type LazyExoticComponent } from 'react';
import { CHARACTERS, QiviIcon, type QiviExpression, type QiviState } from 'qivi-react';
import { Icon, type IconName } from '../icons';
import { href } from '../router';
import { useStore } from '../store';
import { CodeBlock, PageHeader } from '../ui';

interface SceneMeta {
  id: string; title: string; kicker: string; summary: string; icon: IconName; uses: string[];
  component: LazyExoticComponent<ComponentType>; code: string;
}

const scene = (load: () => Promise<Record<string, ComponentType>>, name: string) => lazy(() => load().then(m => ({ default: m[name] })));

export const SCENES: SceneMeta[] = [
  {
    id: 'voice', title: 'Voice companion', kicker: 'Talk & listen', icon: 'wave',
    summary: 'Microphone input drives listening; speech synthesis drives talking. Mouth and body follow the real waveform.',
    uses: ['QiviVoice.microphone()', 'QiviVoice.speak()', 'state="listening" | "talking"'],
    component: scene(() => import('../scenes/VoiceScene'), 'VoiceScene'),
    code: `const voice = await QiviVoice.microphone(); // after a user gesture\n<QiviAvatar state="listening" voice={voice} />\n\nconst { voice: reply, done } = QiviVoice.speak("Hi, I'm Qivi.");\n<QiviAvatar state="talking" voice={reply} />\nawait done; reply.dispose();`,
  },
  {
    id: 'monitor', title: 'Live monitor', kicker: 'Status & findings', icon: 'shield',
    summary: 'A security scan walks through thinking, searching and analyzing, streams particles into results, then lands on success, warning or error.',
    uses: ['state', 'streamTarget', 'Responder events'],
    component: scene(() => import('../scenes/MonitorScene'), 'MonitorScene'),
    code: `for await (const event of responder(query, signal)) {\n  if (event.type === "phase") setState(event.phase); // thinking → searching → analyzing → found\n  if (event.type === "findings") setFindings(event.items);\n  if (event.type === "done") setState(event.tone);  // success | warning | error\n}\n<QiviAvatar state={state} streamTarget={resultsRef.current} />`,
  },
  {
    id: 'signup', title: 'Form buddy', kicker: 'Forms & validation', icon: 'form',
    summary: 'The avatar listens while you type, looks away for passwords, worries about errors and celebrates success.',
    uses: ['QiviVoice.manual().pulse()', 'expression', 'impulse()'],
    component: scene(() => import('../scenes/SignupScene'), 'SignupScene'),
    code: `const typing = useMemo(() => QiviVoice.manual(), []);\n<input onChange={() => typing.pulse(0.5)} />\n<QiviAvatar ref={avatar} state={focused ? "listening" : "idle"}\n  expression={error ? "concern" : "neutral"} voice={typing} />\navatar.current?.impulse(error ? "shiver" : "bounce");`,
  },
  {
    id: 'story', title: 'Performance', kicker: 'Timeline & audio', icon: 'story',
    summary: 'Cue expressions, gestures, shapes and even characters against a playback clock. Play, pause, seek and change speed.',
    uses: ['QiviPerformance', 'followMedia()', 'QiviVoice.fromMediaElement()'],
    component: scene(() => import('../scenes/StoryScene'), 'StoryScene'),
    code: `const cues = [\n  { at: 0, frame: { expression: "concern", shape: "shield" }, impulse: "shiver" },\n  { at: 3, frame: { expression: "focused", shape: "hex" } },\n  { at: 9, frame: { expression: "happy", shape: "blob" }, impulse: "bounce" },\n];\nconst performance = new QiviPerformance(avatarRef.current, cues);\nperformance.followMedia(audio); // or performance.play(clock)`,
  },
  {
    id: 'guide', title: 'Tour guide', kicker: 'Fly across the UI', icon: 'guide',
    summary: 'One viewport-layer avatar flies between anchors to point out parts of an interface, like an onboarding tour.',
    uses: ['layer="viewport"', 'anchor', 'spring-follow'],
    component: scene(() => import('../scenes/GuideScene'), 'GuideScene'),
    code: `const [anchor, setAnchor] = useState<HTMLElement | null>(null);\n<button ref={setAnchor}>Billing</button>\n<QiviAvatar layer="viewport" anchor={anchor} expression="curious" />`,
  },
  {
    id: 'feelings', title: 'Feelings', kicker: 'Expressions & gestures', icon: 'smile',
    summary: 'Twelve expressions, twelve activity states and nine one-off gestures. State and feeling are independent.',
    uses: ['EXPRESSIONS', 'STATES', 'impulse()'],
    component: scene(() => import('../scenes/FeelingsScene'), 'FeelingsScene'),
    code: `<QiviAvatar ref={avatar} state="answering" expression="excited"\n  expressionStrength={1.4} />\navatar.current?.impulse(["burst", "sweep"]);`,
  },
  {
    id: 'everywhere', title: 'Everywhere', kicker: 'Sizes & surfaces', icon: 'bell',
    summary: 'From a 16px favicon to a full stage. Small sizes render a crisp vector face; larger ones come alive with particles.',
    uses: ['QiviIcon', 'quality="static"', 'size', 'theme'],
    component: scene(() => import('../scenes/EverywhereScene'), 'EverywhereScene'),
    code: `<QiviIcon size={24} expression="happy" />          // lists, toasts, favicons\n<QiviAvatar size={32} quality="static" />          // vector proxy\n<QiviAvatar size={160} personality="guardian" />   // live particles`,
  },
];

export function ScenesPage({ scene: id }: { scene: string | null }) {
  const current = SCENES.find(s => s.id === id);
  if (current) return <SceneView meta={current} />;
  return <div className="nx-page">
    <PageHeader eyebrow="Real product scenarios" icon="scenes" title={<>Seven ways Qivi<br className="nx-hide-sm" /> brings an interface to life.</>}
      text="Each scene is a working mini-product built with the public API. Open one, play with it, then copy the pattern." />
    <ul className="nx-scene-grid">
      {SCENES.map((s, i) => <li key={s.id} style={{ '--i': i } as React.CSSProperties}>
        <a className="nx-scene-card" href={href('scenes', s.id)}>
          <SceneArt id={s.id} />
          <span className="nx-scene-card-body">
            <span className="nx-scene-kicker"><Icon name={s.icon} size={16} />{s.kicker}</span>
            <strong>{s.title}</strong>
            <span className="nx-scene-summary">{s.summary}</span>
            <span className="nx-scene-uses">{s.uses.map(u => <code key={u}>{u}</code>)}</span>
          </span>
          <span className="nx-scene-go" aria-hidden="true"><Icon name="right" size={18} /></span>
        </a>
      </li>)}
    </ul>
  </div>;
}

function SceneView({ meta }: { meta: SceneMeta }) {
  const Scene = meta.component;
  const index = SCENES.indexOf(meta);
  const next = SCENES[(index + 1) % SCENES.length];
  return <div className="nx-page nx-scene-page">
    <nav className="nx-crumbs" aria-label="Breadcrumb"><a href={href('scenes')}><Icon name="back" size={18} />All scenes</a><span aria-hidden="true">/</span><span aria-current="page">{meta.title}</span></nav>
    <PageHeader eyebrow={meta.kicker} icon={meta.icon} title={meta.title} text={meta.summary} />
    <Suspense fallback={<div className="nx-loading" role="status"><span className="nx-spinner" aria-hidden="true" />Preparing scene…</div>}>
      <Scene />
    </Suspense>
    <section className="nx-scene-code" aria-label="How it is built">
      <h2><Icon name="build" size={18} />How it’s built</h2>
      <CodeBlock code={meta.code} label="Pattern" />
    </section>
    <a className="nx-next-scene" href={href('scenes', next.id)}><span><small>Next scene</small>{next.title}</span><Icon name="right" /></a>
  </div>;
}

/** Card illustrations composed from the real static Qivi face and simple UI fragments. */
function SceneArt({ id }: { id: string }) {
  const { appearance } = useStore();
  const face = (size: number, expression: QiviExpression = 'neutral', character: keyof typeof CHARACTERS = 'qivi', state: QiviState = 'idle') =>
    <QiviIcon size={size} expression={expression} character={CHARACTERS[character]} state={state} />;
  return <span className={`nx-art nx-art-${id}`} data-appearance={appearance} aria-hidden="true">
    {id === 'voice' && <>{face(84, 'happy')}<span className="nx-art-wave">{Array.from({ length: 11 }, (_, i) => <i key={i} style={{ '--i': i } as React.CSSProperties} />)}</span></>}
    {id === 'monitor' && <>{face(72, 'concern', 'atlas', 'warning')}<span className="nx-art-rows">{['crit', 'high', 'med'].map(s => <i key={s} className={`is-${s}`}><b /><em /></i>)}</span></>}
    {id === 'signup' && <><span className="nx-art-form"><i /><i /><i className="is-btn" /></span>{face(68, 'curious', 'female')}</>}
    {id === 'story' && <>{face(64, 'excited', 'ember')}<span className="nx-art-track"><i /><i /><i /><i /><b /></span></>}
    {id === 'guide' && <><svg className="nx-art-path" viewBox="0 0 200 100"><path d="M20 80 C 60 10, 120 110, 180 24" /><circle cx="20" cy="80" r="5" /><circle cx="100" cy="58" r="5" /></svg><span className="nx-art-guide-face">{face(56, 'curious', 'sage')}</span></>}
    {id === 'feelings' && <span className="nx-art-faces">{(['happy', 'love', 'surprised', 'sleepy', 'confused', 'playful'] as const).map(e => <i key={e}>{face(40, e)}</i>)}</span>}
    {id === 'everywhere' && <><span className="nx-art-sizes">{[16, 24, 32, 48].map(s => <i key={s}>{face(s, 'happy')}</i>)}</span><span className="nx-art-toast">{face(24, 'happy')}<b /><em /></span></>}
  </span>;
}
