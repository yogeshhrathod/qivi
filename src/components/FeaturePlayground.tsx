import { OptionIcon } from "./OptionIcon";
import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  QiviAvatar, QiviPerformance, QiviVoice, EXPRESSIONS, PERSONALITIES, PALETTES, CHARACTERS, createRadialShape,
  type QiviAvatarHandle, type QiviAvatarProps, type QiviCharacter, type QiviExpression,
  type QiviImpulse, type QiviPerformanceCue, type QiviPersonality, type QiviPresentation, type QiviShape,
} from '@yogeshhrathod/qivi';
import llms from '../../library/qivi/llms.txt?raw';
import guide from '../../library/qivi/docs/performance.md?raw';
import './feature-playground.css';

const IDENTITIES: QiviCharacter[] = [CHARACTERS.qivi, CHARACTERS.female, CHARACTERS.male];
const MODES = ['Character', 'Expressions', 'Morphing', 'Performance', 'Advanced'] as const;
type Mode = typeof MODES[number];
const IMPULSES: QiviImpulse[] = ['bounce', 'burst', 'surprise', 'flick', 'anticipate', 'glitch', 'ripple', 'sweep', 'shiver'];
function storedMode(): Mode {
  try { const value = localStorage.getItem('qivi-playground-mode'); if (MODES.includes(value as Mode)) return value as Mode; } catch { /* Storage is optional. */ }
  return 'Character';
}

const INITIAL = {
  name: 'Qivi', personality: 'core' as QiviPersonality, presentation: 'neutral' as QiviPresentation,
  theme: 'default' as keyof typeof PALETTES, shape: 'auto' as 'auto' | QiviShape | 'flower' | 'custom',
  expression: 'neutral' as QiviExpression, strength: 1.5, transition: 1, lobes: 6, depth: 0.2,
  spacing: 1, width: 1.06, blink: 3, customExpression: false, autoEmote: true,
  glyphs: true, smile: true, intensity: 1, lighting: 1, static: false, voicePreview: false,
};
type Settings = typeof INITIAL;
type Session = {
  timeline: QiviPerformance; voice: QiviVoice; audio: HTMLAudioElement | null; url: string | null;
  raf: number; start: number; offset: number; paused: boolean; duration: number; speed: number;
};

/** Local audible pulses, deliberately labelled as tones rather than generated speech. */
function demoTones() {
  const rate = 16000, seconds = 12, samples = rate * seconds;
  const buffer = new ArrayBuffer(44 + samples * 2), view = new DataView(buffer);
  const text = (at: number, value: string) => [...value].forEach((c, i) => view.setUint8(at + i, c.charCodeAt(0)));
  text(0, 'RIFF'); view.setUint32(4, buffer.byteLength - 8, true); text(8, 'WAVE'); text(12, 'fmt ');
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, rate, true); view.setUint32(28, rate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true);
  text(36, 'data'); view.setUint32(40, samples * 2, true);
  for (let i = 0; i < samples; i++) {
    const t = i / rate, syllable = (t * 3.5) % 1;
    const envelope = Math.sin(syllable * Math.PI) ** 4 * Math.min(1, t * 8, (seconds - t) * 8);
    const value = envelope * (Math.sin(t * Math.PI * 2 * 180) + 0.3 * Math.sin(t * Math.PI * 2 * 470)) * 0.12;
    view.setInt16(44 + i * 2, value * 32767, true);
  }
  return new Blob([buffer], { type: 'audio/wav' });
}

function cuesFor(kind: string, duration: number, strength: number): QiviPerformanceCue[] {
  const at = (fraction: number) => duration * fraction;
  if (kind === 'handoff') return [
    { at: 0, frame: { customShape: undefined, expressionDefinition: undefined, state: 'talking', character: IDENTITIES[0], expression: 'curious', expressionStrength: strength, autoEmote: false } },
    { at: at(.25), frame: { character: IDENTITIES[1], expression: 'excited' }, impulse: 'burst' },
    { at: at(.5), frame: { character: IDENTITIES[2], expression: 'focused' }, impulse: 'sweep' },
    { at: at(.75), frame: { character: IDENTITIES[0], expression: 'happy' }, impulse: 'bounce' },
  ];
  return [
    { at: 0, frame: { customShape: undefined, expressionDefinition: undefined, state: 'talking', expression: 'concern', expressionStrength: strength, shape: 'shield', autoEmote: false }, impulse: 'shiver' },
    { at: at(.25), frame: { expression: 'focused', shape: 'hex' }, impulse: 'sweep' },
    { at: at(.5), duration: duration * .25, frame: { expression: 'surprised', shape: 'star' }, impulse: 'surprise' },
    { at: at(.75), frame: { expression: 'happy', shape: 'blob' }, impulse: 'bounce' },
  ];
}

export function FeaturePlayground({ appearance, reducedMotion, settingsOpen = true }: { appearance: 'light' | 'dark'; reducedMotion: boolean | 'auto'; settingsOpen?: boolean }) {
  const [mode, setMode] = useState<Mode>(storedMode);
  const [settings, setSettings] = useState(INITIAL);
  useEffect(() => { try { localStorage.setItem('qivi-playground-mode', mode); } catch { /* Storage is optional. */ } }, [mode]);
  const [scenario, setScenario] = useState('warning');
  const [source, setSource] = useState('silent');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [status, setStatus] = useState<'ready' | 'loading' | 'playing' | 'paused' | 'finished'>('ready');
  const [time, setTime] = useState(0), [duration, setDuration] = useState(12), [speed, setSpeed] = useState(1);
  const [voice, setVoice] = useState<QiviVoice | null>(null);
  const [feedback, setFeedback] = useState('');
  const avatar = useRef<QiviAvatarHandle>(null), session = useRef<Session | null>(null);
  const generation = useRef(0), mounted = useRef(true);

  function release() {
    ++generation.current;
    const current = session.current;
    session.current = null;
    if (current) {
      cancelAnimationFrame(current.raf);
      if (current.audio) { current.audio.onended = current.audio.onerror = null; current.audio.pause(); }
      current.timeline.dispose(); current.voice.dispose();
      if (current.url) URL.revokeObjectURL(current.url);
    }
    if (mounted.current) setVoice(null);
  }
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; release(); };
  }, []);

  function resetPlayback() { release(); avatar.current?.resetPerformance(); setTime(0); setStatus('ready'); setFeedback(''); }
  function change(patch: Partial<Settings>) { resetPlayback(); setSettings(s => ({ ...s, ...patch })); }

  const character = useMemo<QiviCharacter>(() => ({ name: settings.name, personality: settings.personality,
    presentation: settings.presentation, theme: settings.theme,
    params: { ...IDENTITIES.find(identity => identity.name === settings.name)?.params, spacing: settings.spacing, width: settings.width }, behavior: { blink: [settings.blink, settings.blink + 1.5] },
  }), [settings.name, settings.personality, settings.presentation, settings.theme, settings.spacing, settings.width, settings.blink]);
  const customShape = useMemo(() => settings.shape === 'flower' || settings.shape === 'custom'
    ? createRadialShape(a => 1 + (settings.shape === 'flower' ? .2 : settings.depth) * Math.cos((settings.shape === 'flower' ? 6 : settings.lobes) * a))
    : undefined, [settings.shape, settings.depth, settings.lobes]);
  const customExpression = useMemo(() => settings.customExpression ? {
    label: 'Dramatic warning', face: { lidL: .6, lidR: .6, lidTilt: -.35, mouthCurve: -.75, mouth: .12 },
    body: { lean: -.05, density: .4 }, glyph: { gExclaim: .9 }, impulse: 'shiver' as QiviImpulse,
  } : undefined, [settings.customExpression]);
  const avatarProps = useMemo<QiviAvatarProps>(() => ({ character, shape: customShape ? 'auto' : settings.shape as 'auto' | QiviShape,
    customShape, expression: settings.expression, expressionStrength: settings.strength, expressionDefinition: customExpression,
    transitionSpeed: settings.transition, autoEmote: settings.autoEmote, glyphs: settings.glyphs, smile: settings.smile,
    intensity: settings.intensity, lighting: settings.lighting,
  }), [character, customShape, customExpression, settings]);

  function clock(current: Session) {
    return current.audio ? current.audio.currentTime : current.offset + (current.paused ? 0 : (performance.now() - current.start) / 1000 * current.speed);
  }
  async function start() {
    release(); setFeedback('');
    if (!avatar.current) return;
    if (settings.static) { setFeedback('Switch off static rendering to see an animated performance.'); return; }
    if (source === 'upload' && !audioFile) { setFeedback('Choose an audio file first.'); return; }
    const version = generation.current;
    setStatus('loading');
    let audio: HTMLAudioElement | null = null, url: string | null = null;
    let current: Session | null = null;
    try {
      if (source !== 'silent') {
        url = URL.createObjectURL(source === 'upload' ? audioFile! : demoTones());
        audio = new Audio(url); audio.playbackRate = speed;
        await new Promise<void>((resolve, reject) => {
          audio!.onloadedmetadata = () => resolve(); audio!.onerror = () => reject(new Error('This audio file could not be loaded. Try an MP3 or WAV recording.'));
        });
        audio.onloadedmetadata = audio.onerror = null;
      }
      if (!mounted.current || generation.current !== version) { if (url) URL.revokeObjectURL(url); return; }
      const length = audio && Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : 12;
      const nextVoice = audio ? QiviVoice.fromMediaElement(audio) : QiviVoice.simulate();
      const timeline = new QiviPerformance(avatar.current!, cuesFor(scenario, length, settings.strength));
      current = { timeline, voice: nextVoice, audio, url, raf: 0, start: performance.now(), offset: 0, paused: false, duration: length, speed };
      session.current = current; setVoice(nextVoice); setDuration(length); setTime(0);
      if (audio) {
        timeline.followMedia(audio);
        audio.onended = () => { if (session.current === current) { release(); setTime(length); setStatus('finished'); } };
        audio.onerror = () => { if (session.current === current) { release(); setStatus('ready'); setFeedback('Audio playback failed. Try another recording.'); } };
        await audio.play();
      } else timeline.play(() => Math.min(length, clock(current!)));
      if (generation.current !== version || session.current !== current) return;
      setStatus('playing');
      let lastUi = 0;
      const tick = () => {
        if (session.current !== current) return;
        const position = Math.min(length, clock(current!));
        if (performance.now() - lastUi > 100) { setTime(position); lastUi = performance.now(); }
        if (!audio && position >= length) { release(); setTime(length); setStatus('finished'); return; }
        current!.raf = requestAnimationFrame(tick);
      };
      current.raf = requestAnimationFrame(tick);
    } catch (error) {
      if (generation.current !== version || !mounted.current) { if (url && !current) URL.revokeObjectURL(url); return; }
      release(); if (url && !current) URL.revokeObjectURL(url);
      setStatus('ready'); setFeedback(error instanceof Error ? error.message : 'Playback could not start.');
    }
  }
  async function togglePause() {
    const current = session.current; if (!current) return;
    if (!current.paused) {
      current.offset = clock(current); current.paused = true; current.audio?.pause(); setStatus('paused');
    } else {
      current.start = performance.now(); current.paused = false;
      try { await current.audio?.play(); if (session.current === current) setStatus('playing'); }
      catch { release(); setStatus('ready'); setFeedback('Audio could not resume. Press Play performance to restart.'); }
    }
  }
  function seek(value: number) {
    const current = session.current; if (!current) return;
    current.offset = value; current.start = performance.now();
    if (current.audio) current.audio.currentTime = value;
    current.timeline.update(value, false); setTime(value);
  }
  function setPlaybackSpeed(value: number) {
    const current = session.current;
    if (current) {
      current.offset = clock(current); current.start = performance.now(); current.speed = value;
      if (current.audio) current.audio.playbackRate = value;
    }
    setSpeed(value);
  }
  async function copy() {
    try { await navigator.clipboard.writeText(JSON.stringify(avatarProps, null, 2)); setFeedback('Avatar configuration copied.'); }
    catch { setFeedback('Clipboard is unavailable. Select and copy the configuration below.'); }
  }
  const phases = scenario === 'handoff' ? ['Qivi introduces', 'Nova explores', 'Sol protects', 'Qivi returns'] : ['Critical warning', 'Action plan', 'New discovery', 'Reassurance'];
  const activePhase = Math.min(3, Math.floor(time / duration * 4));

  return <section id="feature-playground" className={`playground ${settingsOpen ? "controls-open" : "controls-closed"}`} aria-labelledby="playground-title">
    <div className="playground-heading"><div><h2 id="playground-title">Make Qivi your own.</h2><p>Change its character, shape and reactions. Then put it all in motion.</p></div><span className="playground-badge">Feature playground</span></div>
    <div className="playground-layout">
      <div className="playground-preview">
        <div className="playground-avatar"><QiviAvatar ref={avatar} {...avatarProps} size={settings.static ? 160 : "100%"} quality={settings.static ? 'static' : 'medium'}
          appearance={appearance} reducedMotion={reducedMotion} autoSleep={false}
          state={settings.voicePreview ? 'talking' : 'idle'} voice={voice ?? (settings.voicePreview ? 'simulate' : null)} /></div>
        <div className="playground-caption"><strong>{settings.name || 'Your character'}</strong><span>{status === 'playing' || status === 'paused' ? `${phases[activePhase]} · ${status}` : `${settings.presentation} presentation · ${PERSONALITIES[settings.personality].label}`}</span></div>
        <div className="playground-preview-actions"><button onClick={() => { resetPlayback(); setSettings(INITIAL); }}><OptionIcon name="reset" />Reset avatar</button><button onClick={() => void copy()}><OptionIcon name="copy" />Copy configuration</button></div>

      </div>
      <div className="playground-controls" hidden={!settingsOpen} aria-label="Playground configuration sidebar">
        <div className="playground-modes" role="group" aria-label="Feature categories">{MODES.map(item => <button key={item} aria-pressed={mode === item} onClick={() => { resetPlayback(); setMode(item); }}><OptionIcon name={item} />{item}</button>)}</div>
        <div className="playground-panel">
          {mode === 'Character' && <>
            <PanelTitle title="A character with its own identity" text="Build your own character with custom proportions, presentation, color and personality. Meet the ready-made companions in the showcase hero." />
            <label className="playground-field"><span className="option-label"><OptionIcon name="Character name" />Character name</span><input value={settings.name} maxLength={40} onChange={e => change({ name: e.target.value })} /></label>
            <Group label="Presentation">{(['neutral', 'masculine', 'feminine'] as const).map(value => <Choice key={value} active={settings.presentation === value} onClick={() => change({ presentation: value })}>{value}</Choice>)}</Group>
            <Group label="Personality">{(Object.keys(PERSONALITIES) as QiviPersonality[]).map(value => <Choice key={value} active={settings.personality === value} onClick={() => change({ personality: value })}>{PERSONALITIES[value].label}</Choice>)}</Group>
            <p className="playground-note">{PERSONALITIES[settings.personality].blurb}</p>
            <Group label="Palette">{(Object.keys(PALETTES) as Settings['theme'][]).map(value => <Choice key={value} active={settings.theme === value} onClick={() => change({ theme: value })}><span className="playground-color" style={{ background: PALETTES[value].mid }} />{value}</Choice>)}</Group>
            <Range label="Eye spacing" value={settings.spacing} min={.7} max={1.4} step={.05} onChange={value => change({ spacing: value })} />
            <Range label="Body width" value={settings.width} min={.8} max={1.4} step={.05} onChange={value => change({ width: value })} />
            <Range label="Blink interval" value={settings.blink} min={1} max={8} step={.5} suffix="s" onChange={value => change({ blink: value })} />
          </>}
          {mode === 'Expressions' && <>
            <PanelTitle title="Give every moment a feeling" text="Try all twelve expressions, exaggerate them, or replace the face with your own definition." />
            <Group label="Expression">{(Object.keys(EXPRESSIONS) as QiviExpression[]).map(value => <Choice key={value} active={settings.expression === value} onClick={() => change({ expression: value })}>{value}</Choice>)}</Group>
            <Range label="Expression strength" value={settings.strength} min={0} max={2} step={.1} suffix="×" onChange={value => change({ strength: value })} />
            <Range label="Transition time" value={settings.transition} min={.5} max={4} step={.1} suffix="×" onChange={value => change({ transition: value })} />
            <Check label="Use a custom dramatic warning expression" checked={settings.customExpression} onChange={value => change({ customExpression: value })} />
            <Check label="Automatic gestures on expression changes" checked={settings.autoEmote} onChange={value => change({ autoEmote: value })} />
            <Group label="One-off gestures">{IMPULSES.map(value => <Choice key={value} onClick={() => avatar.current?.impulse(value)}>{value}</Choice>)}</Group>
          </>}
          {mode === 'Morphing' && <>
            <PanelTitle title="One avatar, changing silhouettes" text="Morph in place without remounting. Custom shapes use a radial outline around the face." />
            <Group label="Shape">{(['auto', 'blob', 'heart', 'shield', 'hex', 'star', 'flower', 'custom'] as const).map(value => <Choice key={value} active={settings.shape === value} onClick={() => change({ shape: value })}>{value}</Choice>)}</Group>
            {settings.shape === 'custom' && <><Range label="Shape lobes" value={settings.lobes} min={3} max={10} step={1} onChange={value => change({ lobes: value })} /><Range label="Outline depth" value={settings.depth} min={.05} max={.4} step={.05} onChange={value => change({ depth: value })} /></>}
            <Range label="Morph transition time" value={settings.transition} min={.5} max={4} step={.1} suffix="×" onChange={value => change({ transition: value })} />
            <p className="playground-note">Custom outlines support solid silhouettes, not holes or arbitrary 3D meshes. Static rendering shows a blob proxy.</p>
          </>}
          {mode === 'Performance' && <>
            <PanelTitle title="Expressions that follow the moment" text="Play, pause and seek a sequence of emotions, gestures and morphs using the library’s performance timeline." />
            <Group label="Sequence"><Choice active={scenario === 'warning'} onClick={() => { resetPlayback(); setScenario('warning'); }}>Warning to reassurance</Choice><Choice active={scenario === 'handoff'} onClick={() => { resetPlayback(); setScenario('handoff'); }}>Character handoff</Choice></Group>
            <label className="playground-field"><span className="option-label"><OptionIcon name="Audio source" />Audio source</span><select value={source} onChange={e => { resetPlayback(); setSource(e.target.value); }}><option value="silent">Silent preview with simulated voice movement</option><option value="tones">Local demo tones</option><option value="upload">Your audio recording</option></select></label>
            {source === 'upload' && <label className="playground-field"><span className="option-label"><OptionIcon name="Audio recording" />Audio recording</span><input type="file" accept="audio/*" onChange={e => { resetPlayback(); setAudioFile(e.target.files?.[0] ?? null); }} /></label>}
            <p className="playground-note">{source === 'tones' ? 'These are synthesized tones, not spoken words. Mouth and body movement follow the real waveform.' : source === 'upload' ? 'Your file stays in this browser. The four example cues are spaced across its duration; a speech provider can supply exact phrase timings.' : 'No provider or API key needed. This preview uses a local clock and simulated speaking energy.'}</p>
            <div className="playground-sequence">{phases.map((phase, i) => <button key={phase} disabled={!session.current} aria-pressed={activePhase === i && status !== 'ready'} onClick={() => seek(duration * i / 4)}><span>{i + 1}</span><OptionIcon name={phase} />{phase}</button>)}</div>
            <Range label="Playback position" value={time} min={0} max={duration} step={.1} suffix="s" disabled={!session.current} onChange={seek} />
            <label className="playground-field"><span className="option-label"><OptionIcon name="Playback speed" />Playback speed</span><select value={speed} onChange={e => setPlaybackSpeed(+e.target.value)}>{[.5, 1, 1.5, 2].map(value => <option key={value} value={value}>{value}×</option>)}</select></label>
            <div className="playground-playback"><button className="playground-primary" disabled={status === 'loading'} onClick={() => void start()}><OptionIcon name="play" />{status === 'loading' ? 'Loading audio…' : 'Play performance'}</button><button disabled={status !== 'playing' && status !== 'paused'} onClick={() => void togglePause()}><OptionIcon name={status === 'paused' ? 'play' : 'pause'} />{status === 'paused' ? 'Resume' : 'Pause'}</button><button onClick={resetPlayback}><OptionIcon name="stop" />Stop & reset</button></div>
            <p className="playground-note" role="status">{status === 'finished' ? 'Performance complete. The avatar has returned to your configuration.' : `${status} · ${time.toFixed(1)} / ${duration.toFixed(1)}s`}</p>
          </>}
          {mode === 'Advanced' && <>
            <PanelTitle title="Rendering and speaking controls" text="Explore rendering controls here and use Avatar settings on the showcase for its configuration. The guide covers every public property and extension point." />
            <Range label="Body deformation" value={settings.intensity} min={0} max={1} step={.05} onChange={value => change({ intensity: value })} />
            <Range label="Lighting strength" value={settings.lighting} min={0} max={1} step={.05} onChange={value => change({ lighting: value })} />
            <Check label="Show signal glyphs" checked={settings.glyphs} onChange={value => change({ glyphs: value })} />
            <Check label="Show resting smile" checked={settings.smile} onChange={value => change({ smile: value })} />
            <Check label="Simulated speaking movement" checked={settings.voicePreview} onChange={value => change({ voicePreview: value })} />
            <Check label="Static SVG fallback" checked={settings.static} onChange={value => change({ static: value })} />
            <p className="playground-note">Use the showcase’s Avatar settings sidebar for particle count, activity states, accent visibility, placement, theme and reduced motion. The chat demo also supports browser speech and microphone input.</p>
            <div className="playground-docs"><a download="llms.txt" href={`data:text/plain;charset=utf-8,${encodeURIComponent(llms)}`}><OptionIcon name="code" />Download LLM guide</a><a download="qivi-performance.md" href={`data:text/plain;charset=utf-8,${encodeURIComponent(guide)}`}><OptionIcon name="code" />Download full API guide</a></div>
          </>}
        <details className="playground-code"><summary><OptionIcon name="code" />View configuration</summary><pre>{JSON.stringify(avatarProps, null, 2)}</pre></details>
          {feedback && <p className="playground-feedback" role="status">{feedback}</p>}
        </div>
      </div>
    </div>
  </section>;
}
function PanelTitle({ title, text }: { title: string; text: string }) { return <div className="playground-panel-title"><h3>{title}</h3><p>{text}</p></div>; }
function Group({ label, children }: { label: string; children: ReactNode }) { return <fieldset className="playground-group"><legend><OptionIcon name={label} />{label}</legend><div>{children}</div></fieldset>; }
function Choice({ active, onClick, children }: { active?: boolean; onClick: () => void; children: ReactNode }) { return <button type="button" className="playground-choice" aria-pressed={active} onClick={onClick}><OptionIcon name={typeof children === "string" ? children : "palette"} />{children}</button>; }
function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) { return <label className="playground-check"><input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} /><OptionIcon name={label} />{label}</label>; }
function Range({ label, value, onChange, suffix = '', ...props }: { label: string; value: number; min: number; max: number; step: number; suffix?: string; disabled?: boolean; onChange: (value: number) => void }) { const id = useId(); return <label htmlFor={id} className="playground-range"><span><OptionIcon name={label} />{label}<span className="playground-range-value" aria-hidden="true">{Number.isInteger(value) ? value : value.toFixed(2)}{suffix}</span></span><input id={id} type="range" {...props} aria-valuetext={`${value.toFixed(2)}${suffix}`} value={value} onChange={e => onChange(+e.target.value)} /></label>; }
