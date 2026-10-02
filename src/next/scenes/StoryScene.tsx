import { useEffect, useRef, useState } from 'react';
import { CHARACTERS, QiviAvatar, QiviPerformance, QiviVoice, type QiviAvatarHandle, type QiviCharacter, type QiviPerformanceCue } from '@yogeshhrathod/qivi';
import { Icon, type IconName } from '../icons';
import { useLookProps } from '../store';
import { Segmented } from '../ui';

type Scenario = 'warning' | 'handoff';
type Source = 'silent' | 'tones' | 'upload';
type Status = 'ready' | 'loading' | 'playing' | 'paused' | 'finished';
interface Session {
  timeline: QiviPerformance; voice: QiviVoice; audio: HTMLAudioElement | null; url: string | null;
  raf: number; start: number; offset: number; paused: boolean; duration: number; speed: number;
}

const HANDOFF: QiviCharacter[] = [CHARACTERS.qivi, CHARACTERS.female, CHARACTERS.male];
const SCRIPTS: Record<Scenario, { phase: string; caption: string; icon: IconName }[]> = {
  warning: [
    { phase: 'Critical warning', caption: '“Your payment server is exposed to the internet.”', icon: 'alert' },
    { phase: 'Action plan', caption: '“Here’s the plan: rotate the keys, then close the port.”', icon: 'form' },
    { phase: 'New discovery', caption: '“Wait — the backup was never affected!”', icon: 'sparkle' },
    { phase: 'Reassurance', caption: '“You’re safe. Everything is back to normal.”', icon: 'success' },
  ],
  handoff: [
    { phase: 'Qivi introduces', caption: '“Hi, I’m Qivi. Let me introduce the team.”', icon: 'user' },
    { phase: 'Nova explores', caption: '“I’m Nova! I love finding new ideas.”', icon: 'sparkle' },
    { phase: 'Sol protects', caption: '“I’m Sol. I keep things calm and steady.”', icon: 'shield' },
    { phase: 'Qivi returns', caption: '“And together, we’ve got you covered.”', icon: 'heart' },
  ],
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

function cuesFor(kind: Scenario, duration: number): QiviPerformanceCue[] {
  const at = (fraction: number) => duration * fraction;
  if (kind === 'handoff') return [
    { at: 0, frame: { customShape: undefined, expressionDefinition: undefined, state: 'talking', character: HANDOFF[0], expression: 'curious', autoEmote: false } },
    { at: at(.25), frame: { character: HANDOFF[1], expression: 'excited' }, impulse: 'burst' },
    { at: at(.5), frame: { character: HANDOFF[2], expression: 'focused' }, impulse: 'sweep' },
    { at: at(.75), frame: { character: HANDOFF[0], expression: 'happy' }, impulse: 'bounce' },
  ];
  return [
    { at: 0, frame: { customShape: undefined, expressionDefinition: undefined, state: 'talking', expression: 'concern', expressionStrength: 1.5, shape: 'shield', autoEmote: false }, impulse: 'shiver' },
    { at: at(.25), frame: { expression: 'focused', shape: 'hex' }, impulse: 'sweep' },
    { at: at(.5), duration: duration * .25, frame: { expression: 'surprised', shape: 'star' }, impulse: 'surprise' },
    { at: at(.75), frame: { expression: 'happy', shape: 'blob' }, impulse: 'bounce' },
  ];
}

export function StoryScene() {
  const lookProps = useLookProps();
  const [scenario, setScenario] = useState<Scenario>('warning');
  const [source, setSource] = useState<Source>('silent');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [status, setStatus] = useState<Status>('ready');
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
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; release(); }; }, []);
  function reset() { release(); avatar.current?.resetPerformance(); setTime(0); setStatus('ready'); setFeedback(''); }

  const clock = (current: Session) => current.audio ? current.audio.currentTime : current.offset + (current.paused ? 0 : (performance.now() - current.start) / 1000 * current.speed);

  async function start() {
    release(); setFeedback('');
    if (!avatar.current) return;
    if (source === 'upload' && !audioFile) { setFeedback('Choose an audio file first.'); return; }
    const version = generation.current;
    setStatus('loading');
    let audio: HTMLAudioElement | null = null, url: string | null = null, current: Session | null = null;
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
      const timeline = new QiviPerformance(avatar.current!, cuesFor(scenario, length));
      current = { timeline, voice: nextVoice, audio, url, raf: 0, start: performance.now(), offset: 0, paused: false, duration: length, speed };
      session.current = current; setVoice(nextVoice); setDuration(length); setTime(0);
      if (audio) {
        timeline.followMedia(audio);
        audio.onended = () => { if (session.current === current) { release(); avatar.current?.resetPerformance(); setTime(length); setStatus('finished'); } };
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
        if (!audio && position >= length) { release(); avatar.current?.resetPerformance(); setTime(length); setStatus('finished'); return; }
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
    if (!current.paused) { current.offset = clock(current); current.paused = true; current.audio?.pause(); setStatus('paused'); return; }
    current.start = performance.now(); current.paused = false;
    try { await current.audio?.play(); if (session.current === current) setStatus('playing'); }
    catch { release(); setStatus('ready'); setFeedback('Audio could not resume. Press play to restart.'); }
  }
  function seek(value: number) {
    const current = session.current; if (!current) return;
    current.offset = value; current.start = performance.now();
    if (current.audio) current.audio.currentTime = value;
    current.timeline.update(value, false); setTime(value);
  }
  function setPlaybackSpeed(value: number) {
    const current = session.current;
    if (current) { current.offset = clock(current); current.start = performance.now(); current.speed = value; if (current.audio) current.audio.playbackRate = value; }
    setSpeed(value);
  }

  const script = SCRIPTS[scenario];
  const live = status === 'playing' || status === 'paused';
  const active = Math.min(3, Math.floor(time / duration * 4));
  const progress = Math.min(1, time / duration);

  return <div className="nx-scene nx-story">
    <div className={`nx-scene-stage is-${status}`}>
      <span className="nx-spotlight" aria-hidden="true" />
      <QiviAvatar ref={avatar} {...lookProps} size="100%" state="idle" voice={voice} autoSleep={false} />
      <p className={`nx-subtitle ${live ? 'is-live' : ''}`} aria-live="polite">{live ? script[active].caption : status === 'finished' ? 'Performance complete.' : 'Press play to start the performance.'}</p>
    </div>

    <div className="nx-scene-panel">
      <Segmented label="Sequence" value={scenario} onChange={value => { reset(); setScenario(value); }}
        options={[{ value: 'warning', label: 'Warning → calm', icon: 'alert' }, { value: 'handoff', label: 'Character handoff', icon: 'characters' }]} />

      <div className="nx-timeline" style={{ '--progress': progress } as React.CSSProperties}>
        <div className="nx-timeline-track" aria-hidden="true"><span className="nx-timeline-fill" /><span className="nx-timeline-head" /></div>
        <ol className="nx-timeline-cues">
          {script.map((s, i) => <li key={s.phase}><button type="button" disabled={!live} aria-pressed={live && active === i} onClick={() => seek(duration * i / 4)}>
            <span className="nx-cue-icon"><Icon name={s.icon} size={16} /></span><span><small>{(duration * i / 4).toFixed(1)}s</small>{s.phase}</span>
          </button></li>)}
        </ol>
        <label className="sr-only" htmlFor="story-seek">Playback position</label>
        <input id="story-seek" className="nx-seek" type="range" min={0} max={duration} step={.1} value={time} disabled={!live} aria-valuetext={`${time.toFixed(1)} of ${duration.toFixed(1)} seconds`} onChange={e => seek(+e.target.value)} />
      </div>

      <div className="nx-transport">
        <button type="button" className="nx-play" disabled={status === 'loading'} aria-label={live ? (status === 'paused' ? 'Resume' : 'Pause') : 'Play performance'} onClick={() => void (live ? togglePause() : start())}>
          <Icon name={status === 'playing' ? 'pause' : 'play'} size={26} />
        </button>
        <div className="nx-transport-meta"><strong>{status === 'loading' ? 'Loading audio…' : live ? `${status === 'paused' ? 'Paused' : 'Playing'} · ${time.toFixed(1)}s` : status === 'finished' ? 'Finished' : 'Ready'}</strong><small>{duration.toFixed(1)}s performance · {speed}× speed</small></div>
        <button type="button" className="nx-icon-btn" aria-label="Stop and reset" title="Stop and reset" onClick={reset}><Icon name="stop" /></button>
      </div>

      <div className="nx-panel-row">
        <label className="nx-select"><span><Icon name="music" size={16} />Audio</span>
          <select value={source} onChange={e => { reset(); setSource(e.target.value as Source); }}>
            <option value="silent">Silent · simulated voice</option><option value="tones">Demo tones (not speech)</option><option value="upload">Your recording</option>
          </select></label>
        <label className="nx-select"><span><Icon name="motion" size={16} />Speed</span>
          <select value={speed} onChange={e => setPlaybackSpeed(+e.target.value)}>{[.5, 1, 1.5, 2].map(v => <option key={v} value={v}>{v}×</option>)}</select></label>
      </div>
      {source === 'upload' && <label className="nx-file"><Icon name="upload" size={18} /><span>{audioFile ? audioFile.name : 'Choose an audio file'}</span>
        <input type="file" accept="audio/*" onChange={e => { reset(); setAudioFile(e.target.files?.[0] ?? null); }} /></label>}
      <p className="nx-panel-note">{source === 'tones' ? 'Synthesized tones, not spoken words. Mouth and body follow the real waveform.' : source === 'upload' ? 'Your file stays in this browser. Cues are spread across its duration; a speech provider can supply exact phrase timings.' : 'No provider or API key needed. A local clock and simulated speaking energy drive the preview.'}</p>
      {feedback && <p className="nx-inline-error" role="alert"><Icon name="alert" size={16} />{feedback}</p>}
    </div>
  </div>;
}
