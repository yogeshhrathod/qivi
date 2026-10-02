import { useEffect, useRef, useState } from 'react';
import { QiviAvatar, QiviVoice, type QiviExpression, type QiviState } from 'qivi';
import { Icon } from '../icons';
import { canListen, canSpeak, createRecognition, type RecognitionLike } from '../speech';
import { useLookProps, useStore } from '../store';

type Phase = 'idle' | 'listening' | 'thinking' | 'talking' | 'preview';
interface Caption { id: number; who: 'you' | 'qivi'; text: string; pending?: boolean }
interface Session { voice?: QiviVoice; recognition?: RecognitionLike; timers: number[]; cancelled: boolean }

const LINES: { label: string; text: string; expression: QiviExpression }[] = [
  { label: 'Greeting', text: 'Hi there! I’m happy to help. Ask me anything, and I’ll walk you through it.', expression: 'happy' },
  { label: 'Heads-up', text: 'Quick heads-up: two of your tasks are overdue. Want me to move them to tomorrow?', expression: 'concern' },
  { label: 'Celebrate', text: 'You did it! Every task is complete. That deserves a little celebration.', expression: 'excited' },
];

function replyFor(heard: string, name: string) {
  const text = heard.toLowerCase();
  if (/(hello|hi\b|hey)/.test(text)) return `Hello! I’m ${name}. It’s nice to hear your voice.`;
  if (/(weather|rain|sun)/.test(text)) return 'I can’t check the weather in this demo, but in your app this reply would come from your own backend.';
  if (heard) return `I heard: ${heard}. In a real app, your words would go to your backend and my reply would stream back as audio.`;
  return 'I could feel you speaking, even though this browser can’t transcribe it. My body followed the sound of your voice.';
}

export function VoiceScene() {
  const lookProps = useLookProps();
  const { look } = useStore();
  const [phase, setPhase] = useState<Phase>('idle');
  const [voice, setVoice] = useState<QiviVoice | 'simulate' | null>(null);
  const [expression, setExpression] = useState<QiviExpression | undefined>(undefined);
  const [captions, setCaptions] = useState<Caption[]>([]);
  const [error, setError] = useState('');
  const session = useRef<Session | null>(null);
  const nextId = useRef(1);
  const mounted = useRef(true);

  function release(s = session.current) {
    if (!s) return;
    s.cancelled = true;
    s.timers.forEach(clearTimeout);
    if (s.recognition) { s.recognition.onend = s.recognition.onresult = s.recognition.onerror = null; s.recognition.abort ? s.recognition.abort() : s.recognition.stop(); }
    s.voice?.dispose();
    if (session.current === s) session.current = null;
  }
  function stop() { release(); setVoice(null); setPhase('idle'); setExpression(undefined); }
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; release(); }; }, []);

  const caption = (who: Caption['who'], text: string, pending = false) => {
    const id = nextId.current++;
    setCaptions(list => [...list.slice(-5), { id, who, text, pending }]);
    return id;
  };
  const updateCaption = (id: number, text: string, pending = false) => setCaptions(list => list.map(c => c.id === id ? { ...c, text, pending } : c));

  async function speak(text: string, mood: QiviExpression, s: Session = { timers: [], cancelled: false }) {
    if (session.current !== s) { release(); session.current = s; }
    setError('');
    const spoken = QiviVoice.speak(text);
    s.voice = spoken.voice;
    setVoice(spoken.voice); setExpression(mood); setPhase('talking');
    caption('qivi', text);
    await spoken.done;
    if (!mounted.current || s.cancelled) return;
    release(s); setVoice(null); setPhase('idle'); setExpression(undefined);
  }

  async function listen() {
    release(); setError('');
    const s: Session = { timers: [], cancelled: false };
    session.current = s;
    let mic: QiviVoice;
    try { mic = await QiviVoice.microphone(); }
    catch {
      if (session.current === s) { session.current = null; setError('Microphone access was blocked. Allow it in site settings, or try “Hear a line” — it needs no permission.'); }
      return;
    }
    if (s.cancelled || !mounted.current) { mic.dispose(); return; }
    s.voice = mic;
    setVoice(mic); setPhase('listening'); setExpression(undefined);
    const heardId = caption('you', 'Listening…', true);
    let heard = '';
    const finish = () => {
      if (s.cancelled) return;
      s.recognition = undefined;
      mic.dispose(); s.voice = undefined;
      updateCaption(heardId, heard || 'No transcript — this browser can’t convert speech to text.');
      setVoice(null); setPhase('thinking');
      s.timers.push(window.setTimeout(() => void speak(replyFor(heard.trim(), look.name), heard ? 'happy' : 'curious', s), 700));
    };
    const recognition = createRecognition();
    if (!recognition) { s.timers.push(window.setTimeout(finish, 4000)); return; }
    s.recognition = recognition;
    recognition.lang = navigator.language || 'en-US';
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.onresult = event => {
      let text = '';
      for (let i = 0; i < event.results.length; i++) text += event.results[i][0].transcript;
      heard = text;
      updateCaption(heardId, text || 'Listening…', true);
    };
    recognition.onend = finish;
    recognition.onerror = finish;
    recognition.start();
  }

  function preview() {
    if (phase === 'preview') { stop(); return; }
    release(); setError('');
    setVoice('simulate'); setPhase('preview'); setExpression(undefined);
  }

  const state: QiviState = phase === 'preview' ? 'talking' : phase;
  const busy = phase !== 'idle';
  const label = { idle: 'Ready when you are', listening: 'Listening to you', thinking: 'Thinking of a reply', talking: `${look.name} is speaking`, preview: 'Simulated speech, no audio' }[phase];

  return <div className="nx-scene nx-voice">
    <div className={`nx-scene-stage is-${phase}`}>
      <span className="nx-spotlight" aria-hidden="true" />
      <span className="nx-voice-rings" aria-hidden="true"><i /><i /><i /></span>
      <QiviAvatar {...lookProps} size="100%" state={state} expression={expression} voice={voice} autoSleep={false} />
      <p className="nx-stage-caption" role="status"><span className={`nx-live-dot ${busy ? 'is-on' : ''}`} aria-hidden="true" />{label}</p>
    </div>

    <div className="nx-scene-panel">
      <div className="nx-voice-primary">
        <button type="button" className={`nx-mic ${phase === 'listening' ? 'is-live' : ''}`} onClick={() => (phase === 'listening' || phase === 'thinking' ? stop() : void listen())} disabled={!canListen()} aria-pressed={phase === 'listening'}>
          <span className="nx-mic-icon"><Icon name={phase === 'listening' ? 'stop' : 'mic'} size={28} /></span>
          <span><strong>{phase === 'listening' ? 'Stop listening' : 'Talk to ' + look.name}</strong><small>{canListen() ? 'Uses your microphone; nothing is recorded or sent' : 'Microphone is not available in this browser'}</small></span>
        </button>
      </div>
      {error && <p className="nx-inline-error" role="alert"><Icon name="alert" size={16} />{error}</p>}

      <div className="nx-panel-block">
        <h3><Icon name="speaker" size={18} />Hear a line</h3>
        <p className="nx-panel-note">{canSpeak() ? 'Browser speech synthesis. The mouth follows a matching speech envelope.' : 'Speech synthesis is unavailable; the avatar still animates silently.'}</p>
        <div className="nx-line-buttons">
          {LINES.map(line => <button key={line.label} type="button" className="nx-btn" onClick={() => void speak(line.text, line.expression)}><Icon name="play" size={16} />{line.label}</button>)}
        </div>
      </div>

      <div className="nx-panel-block">
        <h3><Icon name="wave" size={18} />Silent preview</h3>
        <p className="nx-panel-note">Procedural speech energy for previews and design reviews — no audio, no permissions.</p>
        <button type="button" className="nx-btn" aria-pressed={phase === 'preview'} onClick={preview}><Icon name={phase === 'preview' ? 'pause' : 'wave'} size={16} />{phase === 'preview' ? 'Stop preview' : 'Simulate talking'}</button>
        {busy && phase !== 'preview' && <button type="button" className="nx-btn nx-btn-quiet" onClick={stop}><Icon name="stop" size={16} />Stop everything</button>}
      </div>

      <div className="nx-captions" aria-label="Captions">
        <h3><Icon name="chat" size={18} />Captions</h3>
        {captions.length === 0 ? <p className="nx-panel-note">Your words and {look.name}’s replies appear here. Replies are sample text.</p>
          : <ol>{captions.map(c => <li key={c.id} className={`is-${c.who} ${c.pending ? 'is-pending' : ''}`}><b>{c.who === 'you' ? 'You' : look.name}</b>{c.text}</li>)}</ol>}
      </div>
    </div>
  </div>;
}
