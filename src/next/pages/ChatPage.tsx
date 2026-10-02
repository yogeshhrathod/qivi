import { useEffect, useRef, useState } from 'react';
import { CHARACTERS, EXPRESSIONS, QiviAvatar, QiviIcon, STATES, type QiviAvatarHandle, type QiviExpression, type QiviState } from '@yogeshhrathod/qivi';
import { useQiviAgent, type Message } from '../../agent/useQiviAgent';
import { Icon, type IconName } from '../icons';
import { href } from '../router';
import { CHARACTER_INFO, CHARACTER_KEYS, useLookProps, useStore } from '../store';
import { Chips, Field, IconButton, Segmented, Sheet, Slider, Toggle } from '../ui';

type Placement = 'hero' | 'dock' | 'corner';
type Reaction = 'happy' | 'thinking' | 'warning' | 'playful';

const PROMPTS: { title: string; prompt: string; icon: IconName }[] = [
  { title: 'Write', prompt: 'Help me draft a friendly follow-up email', icon: 'mail' },
  { title: 'Plan', prompt: 'Plan a focused afternoon', icon: 'gauge' },
  { title: 'Learn', prompt: 'Explain how rainbows form', icon: 'book' },
  { title: 'Create', prompt: 'Brainstorm names for a coffee shop', icon: 'sparkle' },
];
const REACTIONS: { kind: Reaction; label: string; icon: IconName }[] = [
  { kind: 'happy', label: 'Joy', icon: 'smile' },
  { kind: 'thinking', label: 'Think', icon: 'sparkle' },
  { kind: 'warning', label: 'Alert', icon: 'alert' },
  { kind: 'playful', label: 'Play', icon: 'zap' },
];
const STATE_KEYS = Object.keys(STATES) as QiviState[];
const EXPRESSION_KEYS = Object.keys(EXPRESSIONS) as QiviExpression[];

export function ChatPage() {
  const agent = useQiviAgent();
  const { look, setLook, chooseCharacter, appearance } = useStore();
  const lookProps = useLookProps();
  const avatar = useRef<QiviAvatarHandle>(null);
  const [stateOverride, setStateOverride] = useState<QiviState | null>(null);
  const [exprOverride, setExprOverride] = useState<QiviExpression | null>(null);
  const [placement, setPlacement] = useState<Placement>('hero');
  const [controlsOpen, setControlsOpen] = useState(false);
  const [dock, setDock] = useState<HTMLElement | null>(null);
  const [corner, setCorner] = useState<HTMLElement | null>(null);
  const [answer, setAnswer] = useState<HTMLElement | null>(null);
  const reactionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (reactionTimer.current) clearTimeout(reactionTimer.current); }, []);

  const state = stateOverride ?? agent.state;
  const autoExpression = stateOverride ? STATES[stateOverride].hint : agent.expression;
  const expression = exprOverride ?? (state === 'idle' ? CHARACTER_INFO[look.character].expression : autoExpression);
  const hasMessages = agent.messages.length > 0;

  function send(text: string) {
    if (reactionTimer.current) clearTimeout(reactionTimer.current);
    setStateOverride(null); setExprOverride(null);
    void agent.send(text);
  }
  function react(reaction: Reaction) {
    if (reactionTimer.current) clearTimeout(reactionTimer.current);
    setStateOverride(reaction === 'thinking' || reaction === 'warning' ? reaction : null);
    setExprOverride(reaction === 'warning' ? 'concern' : reaction);
    avatar.current?.impulse(reaction === 'happy' ? 'bounce' : reaction === 'playful' ? 'flick' : 'ripple');
    reactionTimer.current = setTimeout(() => { setStateOverride(null); setExprOverride(null); }, 3500);
  }

  const voice = stateOverride === 'listening' || stateOverride === 'talking' ? 'simulate' : agent.voice;
  const anchor = placement === 'dock' ? dock : placement === 'corner' ? corner : null;

  return <div className={`nx-chat ${hasMessages ? 'has-messages' : ''} placement-${placement}`}>
    <section className="nx-chat-stage" aria-label="Live avatar">
      <div className="nx-stage-avatar">
        <span className="nx-spotlight" aria-hidden="true" />
        <QiviAvatar ref={avatar} {...lookProps} layer={placement === 'hero' ? 'contained' : 'viewport'} anchor={anchor} size="100%"
          particles={look.particles} state={state} expression={expression} voice={voice}
          streamTarget={placement !== 'hero' && state === 'answering' ? answer : null} />
        {placement !== 'hero' && <p className="nx-stage-away">{look.name} moved to the {placement === 'dock' ? 'composer' : 'corner'}.</p>}
      </div>
      <div className="nx-stage-meta">
        <div className="nx-stage-id"><strong>{look.name}</strong><span>{CHARACTER_INFO[look.character].tagline}</span></div>
        <StatusChip state={state} name={look.name} />
        <IconButton icon="studio" label="Live avatar controls" className="nx-stage-controls" expanded={controlsOpen} onClick={() => setControlsOpen(true)} />
      </div>
      <div className="nx-stage-rail">
        <div className="nx-rail-group" role="group" aria-label="Try a reaction">
          {REACTIONS.map(r => <button key={r.kind} type="button" className="nx-reaction" aria-pressed={r.kind === 'warning' ? stateOverride === 'warning' : exprOverride === r.kind} onClick={() => react(r.kind)}>
            <Icon name={r.icon} size={18} /><span>{r.label}</span>
          </button>)}
        </div>
        <span className="nx-rail-divider" aria-hidden="true" />
        <div className="nx-rail-group" role="group" aria-label="Switch character">
          {CHARACTER_KEYS.map(key => <button key={key} type="button" className="nx-cast" aria-pressed={look.character === key} aria-label={`Switch to ${CHARACTERS[key].name}`} title={CHARACTERS[key].name}
            onClick={() => { chooseCharacter(key); setExprOverride(null); setStateOverride(null); }}>
            <QiviIcon size={30} character={CHARACTERS[key]} expression={CHARACTER_INFO[key].expression} />
          </button>)}
          <a className="nx-cast nx-cast-more" href={href('characters')} aria-label="Meet all characters" title="Meet all characters"><Icon name="right" size={18} /></a>
        </div>
      </div>
    </section>

    <section className="nx-chat-convo" aria-label={`Conversation with ${look.name}`}>
      <header className="nx-convo-header">
        <h1>{hasMessages ? 'Conversation' : 'Say hello.'}</h1>
        <p>{hasMessages ? `${look.name} reacts to every phase of a reply.` : `Ask anything. Watch ${look.name} listen, think, and answer.`}</p>
      </header>
      <ChatLog messages={agent.messages} name={look.name} lookProps={lookProps} bindAnswer={setAnswer} onPrompt={send} />
      <Composer name={look.name} onSend={send} inputProps={agent.inputProps} mic={agent.mic} speech={agent.speech} bindDock={setDock} docked={placement === 'dock'} busy={['thinking', 'searching', 'analyzing', 'found', 'answering'].includes(agent.state)} />
      <p className="nx-demo-note"><Icon name="info" size={14} />Interactive demo · replies are sample responses</p>
    </section>
    <div className="nx-corner-anchor" ref={setCorner} aria-hidden="true" />

    {controlsOpen && <Sheet title="Live controls" subtitle="Direct the avatar. Changes apply instantly." onClose={() => setControlsOpen(false)}
      footer={<a className="nx-btn nx-btn-quiet" href={href('studio')}><Icon name="studio" size={18} />Open the full studio</a>}>
      <Field label="Placement" icon="move" hint="Viewport layer flies between anchors">
        <Segmented label="Avatar placement" value={placement} onChange={setPlacement} options={[{ value: 'hero', label: 'Stage', icon: 'layers' }, { value: 'dock', label: 'Composer', icon: 'chat' }, { value: 'corner', label: 'Corner', icon: 'move' }]} />
      </Field>
      <Field label="Activity state" icon="gauge" hint={stateOverride ? 'Manual' : `Following chat: ${STATES[agent.state].label}`}>
        <Chips label="Activity state" value={stateOverride ?? 'follow'} options={['follow', ...STATE_KEYS] as const}
          onChange={value => setStateOverride(value === 'follow' ? null : value as QiviState)} render={value => value === 'follow' ? 'Follow chat' : STATES[value as QiviState].label} />
      </Field>
      <Field label="Expression" icon="smile" hint={exprOverride ? 'Manual' : `Automatic: ${EXPRESSIONS[expression].label}`}>
        <Chips label="Expression" value={exprOverride ?? 'auto'} options={['auto', ...EXPRESSION_KEYS] as const}
          onChange={value => setExprOverride(value === 'auto' ? null : value as QiviExpression)} render={value => value === 'auto' ? 'Automatic' : EXPRESSIONS[value as QiviExpression].label} />
      </Field>
      <Field label="Rendering" icon="sparkle">
        <Slider label="Particles" value={look.particles} min={4000} max={40000} step={2000} format={v => `${Math.round(v / 1000)}k`} onChange={particles => setLook({ particles })} />
        <Toggle label="Reduced motion" description="Calmer avatar and interface motion" checked={look.reducedMotion === true} onChange={v => setLook({ reducedMotion: v ? true : 'auto' })} />
        <Toggle label="Doze when idle" description="Falls asleep after 40 seconds of quiet" checked={look.autoSleep} onChange={autoSleep => setLook({ autoSleep })} />
      </Field>
      <p className="nx-muted-note">Appearance: {appearance}. Change the theme from the header.</p>
    </Sheet>}
  </div>;
}

function StatusChip({ state, name }: { state: QiviState; name: string }) {
  const tone = state === 'success' ? 'ok' : state === 'warning' || state === 'error' ? 'warn' : state === 'idle' ? 'idle' : 'busy';
  return <div className={`nx-status is-${tone}`} role="status" aria-live="polite">
    <span className="nx-status-dot" aria-hidden="true" />{STATES[state].text}<span className="sr-only"> · {name}</span>
  </div>;
}

function ChatLog({ messages, name, lookProps, bindAnswer, onPrompt }: {
  messages: Message[]; name: string; lookProps: ReturnType<typeof useLookProps>; bindAnswer: (el: HTMLElement | null) => void; onPrompt: (text: string) => void;
}) {
  const log = useRef<HTMLDivElement>(null);
  const following = useRef(true);
  const [edges, setEdges] = useState({ top: false, bottom: false });
  const [announcement, setAnnouncement] = useState('');
  const lastReply = [...messages].reverse().find(m => m.role === 'qivi');

  const updateEdges = () => {
    const el = log.current; if (!el) return;
    const top = el.scrollTop > 8, bottom = el.scrollHeight - el.clientHeight - el.scrollTop > 12;
    setEdges(previous => previous.top === top && previous.bottom === bottom ? previous : { top, bottom });
  };
  useEffect(() => {
    const el = log.current;
    if (el && following.current) el.scrollTop = el.scrollHeight;
    updateEdges();
  }, [messages]);
  useEffect(() => {
    const el = log.current; if (!el) return;
    // Keeps the newest message visible while the keyboard or stage resizes the log.
    const observer = new ResizeObserver(() => { if (following.current) el.scrollTop = el.scrollHeight; updateEdges(); });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  useEffect(() => { if (lastReply && !lastReply.streaming && lastReply.text) setAnnouncement(`${name}: ${lastReply.text}`); }, [lastReply?.streaming, lastReply?.text, name]);

  if (!messages.length) return <div className="nx-prompts" role="list" aria-label="Conversation starters">
    {PROMPTS.map((p, i) => <button key={p.title} role="listitem" type="button" className="nx-prompt" style={{ '--i': i } as React.CSSProperties} onClick={() => onPrompt(p.prompt)}>
      <span className="nx-prompt-icon"><Icon name={p.icon} /></span><span className="nx-prompt-text"><small>{p.title}</small>{p.prompt}</span><Icon name="send" size={16} className="nx-prompt-go" />
    </button>)}
  </div>;

  return <div className={`nx-log-wrap ${edges.top ? 'fade-top' : ''} ${edges.bottom ? 'fade-bottom' : ''}`}>
    <div className="nx-log" ref={log} tabIndex={0} aria-label="Messages" onScroll={() => {
      const el = log.current!;
      following.current = el.scrollHeight - el.clientHeight - el.scrollTop < 48;
      updateEdges();
    }}>
      {messages.map(m => <div key={m.id} className={`nx-msg is-${m.role} ${m.tone ? `tone-${m.tone}` : ''}`} ref={m === lastReply ? bindAnswer : undefined}>
        {m.role === 'qivi' && <QiviAvatar {...lookProps} size={28} label={name} expression={m.tone === 'success' ? 'happy' : m.streaming ? 'thinking' : 'neutral'} state={m.tone === 'error' ? 'error' : 'idle'} />}
        <div className="nx-msg-body">
          <span className="sr-only">{m.role === 'user' ? 'You' : name}: </span>
          {m.text || <span className="nx-typing" aria-label="Working on it"><span /><span /><span /></span>}
          {m.streaming && m.text && <span className="nx-caret" aria-hidden="true" />}
        </div>
      </div>)}
    </div>
    {edges.bottom && <button type="button" className="nx-jump" aria-label="Scroll to latest message" onClick={() => {
      following.current = true;
      log.current?.scrollTo({ top: log.current.scrollHeight, behavior: document.documentElement.classList.contains('nx-reduce') ? 'auto' : 'smooth' });
    }}><Icon name="down" size={18} /></button>}
    <p className="sr-only" aria-live="polite">{announcement}</p>
  </div>;
}

function Composer({ name, onSend, inputProps, mic, speech, bindDock, docked, busy }: {
  name: string; onSend: (text: string) => void; busy: boolean;
  inputProps: { onFocus: () => void; onBlur: () => void; onType: () => void };
  mic: { on: boolean; start: () => void; stop: () => void; transcript: string; error: string | null; supported: boolean };
  speech: { on: boolean; set: (v: boolean) => void; stop: () => void };
  bindDock: (el: HTMLElement | null) => void; docked: boolean;
}) {
  const [value, setValue] = useState('');
  const field = useRef<HTMLTextAreaElement>(null);
  const shown = mic.on ? mic.transcript : value;
  useEffect(() => {
    const el = field.current; if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 5 * 24 + 20)}px`;
  }, [shown]);
  function submit() {
    if (!value.trim() || mic.on) return;
    onSend(value); setValue('');
  }
  return <>
    <form className={`nx-composer ${mic.on ? 'is-listening' : ''}`} onSubmit={event => { event.preventDefault(); submit(); }}>
      <div className={`nx-dock ${docked ? 'is-docked' : ''}`} ref={bindDock} aria-hidden="true" />
      <label className="sr-only" htmlFor="nx-message">Message {name}</label>
      <textarea id="nx-message" ref={field} rows={1} value={shown} readOnly={mic.on} placeholder={mic.on ? 'Listening… speak now' : `Message ${name}…`}
        enterKeyHint="send" autoComplete="off" autoCapitalize="sentences" spellCheck
        onChange={event => { setValue(event.target.value); inputProps.onType(); }} onFocus={inputProps.onFocus} onBlur={inputProps.onBlur}
        onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); submit(); } }} />
      <div className="nx-composer-actions">
        <IconButton icon={speech.on ? 'speaker' : 'mute'} pressed={speech.on} label={speech.on ? 'Stop reading replies aloud' : 'Read replies aloud'} onClick={() => { if (speech.on) speech.stop(); speech.set(!speech.on); }} />
        {mic.supported && <IconButton icon="mic" className={mic.on ? 'is-live' : ''} pressed={mic.on} label={mic.on ? 'Stop listening' : `Talk to ${name}`} onClick={() => (mic.on ? mic.stop() : mic.start())} />}
        <button type="submit" className="nx-send" disabled={mic.on || !value.trim()} aria-label={busy ? 'Send (replaces the current reply)' : 'Send message'} title="Send"><Icon name="send" /></button>
      </div>
    </form>
    {mic.error && <p className="nx-inline-error" role="alert"><Icon name="alert" size={16} />{mic.error}</p>}
  </>;
}
