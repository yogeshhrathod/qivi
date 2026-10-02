/**
 * Voice drivers for Qivi's listening / talking states.
 *
 * A QiviVoice produces a VoiceFrame every animation frame: loudness, three spectral bands, a pitch
 * estimate and syllable onsets. Real audio (microphone, <audio>, MediaStream) is analysed with Web
 * Audio. Browser speechSynthesis cannot be tapped, so it is driven by a prosody envelope generated
 * from the text and re-synced on word-boundary events.
 */

export interface VoiceFrame {
  /** 0..1 loudness */
  level: number;
  /** 0..1 band energies: low (body/chest), mid (vowels), high (sibilants) */
  low: number;
  mid: number;
  high: number;
  /** -1..1 relative pitch (spectral brightness / intonation) */
  pitch: number;
  /** 0..1 syllable onset impulse */
  onset: number;
}

export const SILENT: VoiceFrame = { level: 0, low: 0, mid: 0, high: 0, pitch: 0, onset: 0 };

let sharedCtx: AudioContext | null = null;
function audioContext() {
  sharedCtx ??= new AudioContext();
  if (sharedCtx.state === "suspended") void sharedCtx.resume();
  return sharedCtx;
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const hash = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

interface Syllable {
  t: number;
  dur: number;
  amp: number;
  pitch: number;
  open: number;
  hiss: number;
  char: number;
}

/** Turn text into a speech-like syllable timeline (seconds at rate 1). */
function prosody(text: string, rate = 1) {
  const syl: Syllable[] = [];
  const words: { char: number; t: number }[] = [];
  let t = 0.05;
  const sentences = text.match(/[^.!?]+[.!?]*/g) ?? [text];
  let charBase = 0;
  for (const sentence of sentences) {
    const question = /\?\s*$/.test(sentence);
    const tokens = [...sentence.matchAll(/[\p{L}\p{N}'’-]+|[,;:]/gu)];
    const wordCount = tokens.filter((m) => !/[,;:]/.test(m[0])).length || 1;
    let wi = 0;
    for (const m of tokens) {
      const w = m[0];
      const char = charBase + (m.index ?? 0);
      if (/[,;:]/.test(w)) {
        t += 0.16 / rate;
        continue;
      }
      words.push({ char, t });
      const groups = w.toLowerCase().match(/[aeiouyàâéèêëîïôûü]+/g) ?? ["a"];
      const progress = wi / wordCount;
      groups.forEach((g, gi) => {
        const dur = (0.11 + Math.min(g.length, 3) * 0.035 + hash(char + gi) * 0.05) / rate;
        const decl = 0.35 - progress * 0.6 + (question && progress > 0.7 ? (progress - 0.7) * 2.6 : 0);
        syl.push({
          t,
          dur,
          amp: (gi === 0 ? 0.95 : 0.7) * (0.75 + hash(char * 3.1 + gi) * 0.25),
          pitch: Math.max(-1, Math.min(1, decl + (hash(char + gi * 7) - 0.5) * 0.35)),
          open: /[ao]/.test(g) ? 1 : /[eu]/.test(g) ? 0.7 : 0.5,
          hiss: /[szfcx]|sh|ch|th/.test(w) ? 0.7 : 0.15,
          char,
        });
        t += dur + 0.03 / rate;
      });
      t += 0.05 / rate;
      wi++;
    }
    t += (/[.!?]\s*$/.test(sentence) ? 0.34 : 0.12) / rate;
    charBase += sentence.length;
  }
  return { syl, words, duration: t };
}

function envelopeAt(syl: Syllable[], t: number): VoiceFrame {
  let level = 0, open = 0, hiss = 0, pitch = 0, onset = 0, wsum = 0;
  for (const s of syl) {
    if (t < s.t - 0.05) break;
    const local = t - s.t;
    if (local > s.dur + 0.18) continue;
    const env = local < 0 ? 0 : local < 0.035 ? local / 0.035 : Math.exp(-(local - 0.035) / (s.dur * 0.55));
    const e = env * s.amp;
    level = Math.max(level, e);
    open += s.open * e;
    hiss += s.hiss * e;
    pitch += s.pitch * e;
    wsum += e;
    if (local >= 0 && local < 0.05) onset = Math.max(onset, 1 - local / 0.05);
  }
  const w = wsum || 1;
  return { level: clamp01(level), low: clamp01(level * 0.75), mid: clamp01((open / w) * level), high: clamp01((hiss / w) * level), pitch: wsum ? pitch / w : 0, onset };
}

type Kind = "analyser" | "speech" | "manual" | "simulate";

export class QiviVoice {
  private analyser?: AnalyserNode;
  private freq?: Uint8Array<ArrayBuffer>;
  private time?: Float32Array<ArrayBuffer>;
  private cleanup: (() => void)[] = [];
  private prevLevel = 0;
  private pulseLevel = 0;
  private lastPulseAt = 0;
  private speechStart = 0;
  private speechOffset = 0;
  private timeline?: ReturnType<typeof prosody>;
  private stopped = false;

  private constructor(readonly kind: Kind) {}

  /** Live microphone (asks for permission). */
  static async microphone(): Promise<QiviVoice> {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    const v = QiviVoice.fromStream(stream, false);
    v.cleanup.push(() => stream.getTracks().forEach((t) => t.stop()));
    return v;
  }

  /** Any MediaStream (WebRTC voice call, remote TTS stream...). Not played back by default. */
  static fromStream(stream: MediaStream, playback = false): QiviVoice {
    const ctx = audioContext();
    const v = new QiviVoice("analyser");
    const src = ctx.createMediaStreamSource(stream);
    v.attach(src, playback);
    return v;
  }

  /** An <audio>/<video> element, e.g. a TTS mp3 from your backend. Audio keeps playing normally. */
  static fromMediaElement(el: HTMLMediaElement): QiviVoice {
    const ctx = audioContext();
    const v = new QiviVoice("analyser");
    const src = ctx.createMediaElementSource(el);
    v.attach(src, true);
    return v;
  }

  /**
   * Speak text with the browser's speechSynthesis and drive Qivi from a matching prosody envelope.
   * `done` resolves when speech ends (or immediately-silent fallback finishes).
   */
  static speak(text: string, opts: { rate?: number; pitch?: number; voice?: SpeechSynthesisVoice; lang?: string } = {}) {
    const v = new QiviVoice("speech");
    const rate = opts.rate ?? 1.02;
    v.timeline = prosody(text, rate);
    const done = new Promise<void>((resolve) => {
      const finish = () => {
        v.stopped = true;
        resolve();
      };
      const synth = typeof window !== "undefined" ? window.speechSynthesis : undefined;
      if (!synth) {
        v.speechStart = performance.now() / 1000;
        setTimeout(finish, v.timeline!.duration * 1000);
        return;
      }
      const u = new SpeechSynthesisUtterance(text);
      u.rate = rate;
      u.pitch = opts.pitch ?? 1.05;
      if (opts.voice) u.voice = opts.voice;
      if (opts.lang) u.lang = opts.lang;
      u.onstart = () => (v.speechStart = performance.now() / 1000);
      u.onboundary = (e) => {
        // re-sync the envelope to where the synthesiser actually is
        const w = v.timeline!.words.reduce((best, wd) => (wd.char <= e.charIndex ? wd : best), v.timeline!.words[0]);
        if (w) v.speechOffset = w.t - (performance.now() / 1000 - v.speechStart);
      };
      u.onend = finish;
      u.onerror = finish;
      // some platforms never fire onend (no voices installed): never leave Qivi stuck talking
      const guard = setTimeout(finish, (v.timeline!.duration / rate) * 1600 + 2500);
      v.cleanup.push(() => {
        clearTimeout(guard);
        synth.cancel();
        finish();
      });
      v.speechStart = performance.now() / 1000;
      synth.cancel();
      synth.speak(u);
    });
    return { voice: v, done };
  }

  /** A source you drive yourself: call pulse() on keystrokes, tokens, etc. */
  static manual(): QiviVoice {
    return new QiviVoice("manual");
  }

  /** Procedural babble for previews (no audio). */
  static simulate(): QiviVoice {
    const v = new QiviVoice("simulate");
    v.timeline = prosody("Hello there! I found a few things worth a look, and two of them need your attention today. Want me to walk you through them?");
    v.speechStart = performance.now() / 1000;
    return v;
  }

  /** Inject energy (manual sources). */
  pulse(amount = 0.6) {
    this.pulseLevel = Math.min(1, this.pulseLevel + amount);
    this.lastPulseAt = performance.now() / 1000;
  }

  private attach(src: AudioNode, playback: boolean) {
    const ctx = audioContext();
    const an = ctx.createAnalyser();
    an.fftSize = 1024;
    an.smoothingTimeConstant = 0.45;
    src.connect(an);
    if (playback) an.connect(ctx.destination);
    this.analyser = an;
    this.freq = new Uint8Array(an.frequencyBinCount);
    this.time = new Float32Array(an.fftSize);
    this.cleanup.push(() => {
      src.disconnect();
      an.disconnect();
    });
  }

  sample(nowSec = performance.now() / 1000): VoiceFrame {
    if (this.stopped) return SILENT;
    if (this.kind === "speech" || this.kind === "simulate") {
      const tl = this.timeline!;
      let t = nowSec - this.speechStart + this.speechOffset;
      if (this.kind === "simulate") t = t % (tl.duration + 0.8);
      return envelopeAt(tl.syl, t);
    }
    if (this.kind === "manual") {
      const age = nowSec - this.lastPulseAt;
      const lvl = this.pulseLevel * Math.exp(-age / 0.18);
      if (age > 1) this.pulseLevel = 0;
      return { level: lvl, low: lvl * 0.6, mid: lvl * 0.5, high: lvl * 0.8, pitch: Math.sin(this.lastPulseAt * 9) * 0.3, onset: age < 0.05 ? 1 : 0 };
    }
    const an = this.analyser!;
    an.getByteFrequencyData(this.freq!);
    an.getFloatTimeDomainData(this.time!);
    let rms = 0;
    for (const s of this.time!) rms += s * s;
    rms = Math.sqrt(rms / this.time!.length);
    const db = 20 * Math.log10(rms + 1e-8);
    const level = clamp01((db + 58) / 42);
    const hz = an.context.sampleRate / 2 / this.freq!.length;
    const band = (a: number, b: number) => {
      let s = 0, n = 0;
      for (let i = Math.floor(a / hz); i <= Math.min(this.freq!.length - 1, Math.ceil(b / hz)); i++) { s += this.freq![i]; n++; }
      return n ? s / n / 255 : 0;
    };
    let num = 0, den = 0;
    for (let i = 2; i < this.freq!.length; i++) { num += i * hz * this.freq![i]; den += this.freq![i]; }
    const centroid = den ? num / den : 0;
    const onset = level - this.prevLevel > 0.07 ? 1 : 0;
    this.prevLevel = level;
    const gate = level > 0.06 ? 1 : 0;
    return {
      level,
      low: clamp01((band(80, 300) - 0.25) * 1.8) * gate,
      mid: clamp01((band(300, 2000) - 0.2) * 1.9) * gate,
      high: clamp01((band(2000, 8000) - 0.08) * 2.4) * gate,
      pitch: gate ? Math.max(-1, Math.min(1, (centroid - 1400) / 1400)) : 0,
      onset: onset * gate,
    };
  }

  dispose() {
    this.stopped = true;
    this.cleanup.forEach((f) => f());
    this.cleanup = [];
  }
}
