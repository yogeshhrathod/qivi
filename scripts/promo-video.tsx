import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { CHARACTERS, QiviAvatar, QiviVoice, type QiviAvatarHandle, type QiviExpression, type QiviImpulse, type QiviState } from "../library/qivi/src/index";
import "../library/qivi/src/qivi.css";

// Promo video composition. Every visual is a pure function of the timeline time `t`
// (seconds); scripts/render-promo.mjs steps a faked browser clock and calls __seek(t)
// once per frame, so the real QiviAvatar is captured frame-accurately. The soundtrack is
// synthesized from the same beat grid by __renderAudio(). `?vertical` lays the same
// timeline out at 1080×1920 for Shorts/Reels/TikTok.

const V = new URLSearchParams(location.search).has("vertical");
const W = V ? 1080 : 1920, H = V ? 1920 : 1080, DURATION = 30, BPM = 120, BEAT = 60 / BPM;
const CORAL = "#f2453a", INK = "#e8ecf7", MUTED = "#8f9cc2", FONT = '"Avenir Next", "Segoe UI", sans-serif', MONO = '"SF Mono", Menlo, monospace';

// ---------- timing helpers ----------
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const prog = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
const outCubic = (x: number) => 1 - Math.pow(1 - x, 3);
const inOutCubic = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const outBack = (x: number) => { const c = 1.6; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
const lerp = (a: number, b: number, x: number) => a + (b - a) * x;

/** Rise + unblur in, lift + fade out. */
function reveal(t: number, start: number, end = Infinity, dist = 28): CSSProperties {
  const i = outCubic(prog(t, start, start + 0.55));
  const o = Number.isFinite(end) ? inOutCubic(prog(t, end, end + 0.35)) : 0;
  return {
    opacity: i * (1 - o),
    transform: `translateY(${(1 - i) * dist - o * 18}px)`,
    filter: `blur(${(1 - i) * 10 + o * 6}px)`,
  };
}

type Key = { t: number; x: number; y: number; o: number };
function track(keys: Key[], t: number) {
  if (t <= keys[0].t) return keys[0];
  for (let i = 1; i < keys.length; i++) {
    const a = keys[i - 1], b = keys[i];
    if (t <= b.t) {
      const k = inOutCubic(prog(t, a.t, b.t));
      return { t, x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), o: lerp(a.o, b.o, k) };
    }
  }
  return keys[keys.length - 1];
}

// ---------- script ----------
const LANDSCAPE_KEYS: Key[] = [
  { t: 0, x: 0, y: 0, o: 0 },
  { t: 1.5, x: 0, y: 0, o: 0 },
  { t: 2.3, x: 0, y: 0, o: 1 },
  { t: 3.0, x: 0, y: 0, o: 1 },
  { t: 3.7, x: 430, y: 10, o: 1 },
  { t: 12.6, x: 430, y: 10, o: 1 },
  { t: 13.3, x: 0, y: -70, o: 1 },
  { t: 17.5, x: 0, y: -70, o: 1 },
  { t: 18.0, x: 0, y: -70, o: 0 },
  { t: 21.9, x: 470, y: 30, o: 0 },
  { t: 22.4, x: 470, y: 30, o: 1 },
  { t: 25.6, x: 470, y: 30, o: 1 },
  { t: 26.3, x: 0, y: -150, o: 1 },
];
const PORTRAIT_KEYS: Key[] = [
  { t: 0, x: 0, y: -120, o: 0 },
  { t: 1.5, x: 0, y: -120, o: 0 },
  { t: 2.3, x: 0, y: -120, o: 1 },
  { t: 3.0, x: 0, y: -120, o: 1 },
  { t: 3.7, x: 0, y: -400, o: 1 },
  { t: 12.6, x: 0, y: -400, o: 1 },
  { t: 13.3, x: 0, y: -170, o: 1 },
  { t: 17.5, x: 0, y: -170, o: 1 },
  { t: 18.0, x: 0, y: -170, o: 0 },
  { t: 21.9, x: 0, y: -470, o: 0 },
  { t: 22.4, x: 0, y: -470, o: 1 },
  { t: 25.6, x: 0, y: -470, o: 1 },
  { t: 26.3, x: 0, y: -300, o: 1 },
];

/** Where each scene sits in each orientation; the timeline is shared. */
const L = V ? {
  keys: PORTRAIT_KEYS, align: "center" as const,
  title: { left: 90, top: 860, width: 900 }, states: { left: 90, top: 840, width: 900 },
  exprTop: 1160, charsTitleTop: 290, 
  char: (i: number) => ({ x: W / 2 + ((i % 3) - 1) * 330, top: 640 + Math.floor(i / 3) * 430 }),
  code: { left: 60, top: 980, width: 960 }, endTop: 1040,
} : {
  keys: LANDSCAPE_KEYS, align: "left" as const,
  title: { left: 170, top: 330, width: 800 }, states: { left: 170, top: 300, width: 800 },
  exprTop: 760, charsTitleTop: 170, 
  char: (i: number) => ({ x: W / 2 + (i - 2.5) * 290, top: 420 }),
  code: { left: 150, top: 250, width: 900 }, endTop: 640,
};

const STATE_STEPS: { t: number; state: QiviState; label: string; line: string }[] = [
  { t: 7.0, state: "listening", label: "Listening", line: "Hears the mic. Leans in." },
  { t: 8.5, state: "thinking", label: "Thinking", line: "Shows the model is working." },
  { t: 10.0, state: "talking", label: "Talking", line: "Mouth follows real audio." },
  { t: 11.5, state: "success", label: "Done", line: "Celebrates the answer." },
];

const MAIN = 680;
const EXPR_START = 13.0;
const EXPR_STEPS: QiviExpression[] = ["happy", "excited", "curious", "focused", "confused", "surprised", "sleepy", "playful", "love", "happy"];
const EXPR_LABELS: Partial<Record<QiviExpression, string>> = { love: "Love" };

const CHAR_KEYS = ["qivi", "female", "male", "ember", "sage", "atlas"] as const;
const CHAR_START = 18.0, CHAR_STAGGER = 0.25;

const CODE_START = 22.5, CODE_CPS = 55;
const CODE: { text: string; color: string }[] = [
  { text: "$ ", color: MUTED }, { text: "npm i qivi-react\n\n", color: INK },
  { text: "import", color: "#c792ea" }, { text: " { QiviAvatar } ", color: INK }, { text: "from", color: "#c792ea" }, { text: ' "qivi-react"', color: "#ffb38a" }, { text: ";\n\n", color: INK },
  { text: "<", color: MUTED }, { text: "QiviAvatar", color: "#82aaff" }, { text: "\n  state", color: "#a9c4ef" }, { text: "=", color: MUTED }, { text: '"talking"', color: "#ffb38a" },
  { text: "\n  voice", color: "#a9c4ef" }, { text: "=", color: MUTED }, { text: "{voice}", color: INK }, { text: "\n/>", color: MUTED },
];
const CODE_LEN = CODE.reduce((n, s) => n + s.text.length, 0);
const typed = (t: number) => Math.floor(clamp((t - CODE_START) * CODE_CPS, 0, CODE_LEN));

function mainPose(t: number): { state: QiviState; expression?: QiviExpression } {
  if (t < 1.5) return { state: "dissolving" };
  if (t < 4.0) return { state: "idle", expression: "neutral" };
  if (t < 7.0) return { state: "idle", expression: "happy" };
  if (t < 13.0) return { state: [...STATE_STEPS].reverse().find((s) => t >= s.t)!.state };
  if (t < 18.0) return { state: "idle", expression: EXPR_STEPS[Math.min(EXPR_STEPS.length - 1, Math.floor((t - EXPR_START) / BEAT))] };
  if (t < 26.0) return { state: "talking", expression: "happy" };
  return { state: "idle", expression: t < 27.5 ? "excited" : "happy" };
}

const MAIN_IMPULSES: { t: number; kind: QiviImpulse | QiviImpulse[] }[] = [
  { t: 1.5, kind: "burst" }, { t: 4.0, kind: "bounce" }, { t: 7.0, kind: "ripple" },
  { t: 11.5, kind: ["bounce", "burst"] }, { t: 13.0, kind: "sweep" }, { t: 15.5, kind: "surprise" },
  { t: 26.5, kind: "bounce" }, { t: 28.0, kind: "ripple" },
];

// ---------- composition ----------
function Promo() {
  const [t, setT] = useState(0);
  const main = useRef<QiviAvatarHandle>(null);
  const chars = useRef<(QiviAvatarHandle | null)[]>([]);
  const last = useRef(-1);
  const voices = useRef<{ sim?: QiviVoice; keys?: QiviVoice }>({});

  window.__seek = (next: number) => {
    const prev = last.current;
    if (next < prev - 0.25) { voices.current.sim?.dispose(); voices.current.keys?.dispose(); voices.current = {}; }
    if (next >= 10.0 && !voices.current.sim) voices.current.sim = QiviVoice.simulate();
    if (next >= CODE_START && !voices.current.keys) voices.current.keys = QiviVoice.manual();
    flushSync(() => setT(next));
    const crossed = (at: number) => prev < at && next >= at;
    for (const cue of MAIN_IMPULSES) if (crossed(cue.t)) main.current?.impulse(cue.kind);
    CHAR_KEYS.forEach((_, i) => { if (crossed(CHAR_START + i * CHAR_STAGGER)) chars.current[i]?.impulse("bounce"); });
    const keysTyped = typed(next) - typed(Math.max(prev, 0));
    if (keysTyped > 0) voices.current.keys?.pulse(Math.min(0.9, 0.25 * keysTyped));
    last.current = next;
  };

  const pose = mainPose(t);
  const m = track(L.keys, t);
  const voice = t >= 10.0 && t < 11.5 ? voices.current.sim ?? null : t >= CODE_START && t < 26 ? voices.current.keys ?? null : null;
  const beatPulse = Math.pow(1 - ((t % BEAT) / BEAT), 3);
  const end = 1 - prog(t, 29.4, DURATION);

  return (
    <main style={{ ...stage, opacity: end }}>
      <div style={{ ...glow, left: W / 2 + m.x - 700, top: H / 2 + m.y - 700, opacity: 0.55 + 0.12 * beatPulse * (t > 3 && t < 26 ? 1 : 0) }} />

      {/* 1 · cold open: the wordmark dot pulses on the beat, then Qivi bursts out of it */}
      {t < 2.2 && (
        <div style={{ ...center, opacity: 1 - prog(t, 1.45, 1.8) }}>
          <div style={{ width: 34, height: 34, borderRadius: 99, background: CORAL, boxShadow: `0 0 ${40 + 60 * beatPulse}px ${CORAL}`,
            transform: `scale(${(t < 1.5 ? 0.6 + 0.5 * beatPulse * prog(t, 0, 0.2) : 1 + 6 * outCubic(prog(t, 1.5, 1.8)))})` }} />
        </div>
      )}

      {/* main avatar: one persistent WebGL instance moved between scenes */}
      <div style={{ position: "absolute", left: W / 2 - MAIN / 2 + m.x, top: H / 2 - MAIN / 2 + m.y, width: MAIN, height: MAIN, opacity: m.o }}>
        <QiviAvatar ref={main} size={MAIN} personality="core" theme="default" appearance="dark" quality="high" accent="always"
          state={pose.state} expression={pose.expression} voice={voice} transitionSpeed={t >= 13 && t < 18 ? 2.2 : 1}
          glyphs={false} interactive={false} autoSleep={false} autoEmote={false} reducedMotion={false} label="Qivi" />
      </div>

      {/* 2 · title */}
      {t >= 3 && t < 7.4 && (
        <div style={{ position: "absolute", ...L.title, textAlign: L.align }}>
          <div style={{ ...eyebrow, ...reveal(t, 3.1, 6.6) }}>Qivi for React</div>
          <h1 style={headline}>
            <span style={{ display: "inline-block", ...reveal(t, 3.25, 6.7) }}>Give your AI</span><br />
            <span style={{ display: "inline-block", ...reveal(t, 3.75, 6.75) }}>a face<span style={{ color: CORAL }}>.</span></span>
          </h1>
          <p style={{ ...sub, margin: V ? "26px auto 0" : sub.margin, ...reveal(t, 4.4, 6.8) }}>An expressive particle companion that listens, thinks, and talks.</p>
        </div>
      )}

      {/* 3 · states */}
      {t >= 6.9 && t < 13 && (
        <div style={{ position: "absolute", ...L.states, textAlign: L.align }}>
          <div style={{ ...eyebrow, ...reveal(t, 7.0, 12.5) }}>Conversation states</div>
          {STATE_STEPS.map((s, i) => {
            const next = STATE_STEPS[i + 1]?.t ?? 12.5;
            if (t < s.t - 0.1 || t > next + 0.5) return null;
            return (
              <div key={s.state} style={{ position: "absolute", top: 50, left: 0, right: 0 }}>
                <h1 style={{ ...headline, ...reveal(t, s.t, next - 0.3, 40) }}>{s.label}<span style={{ color: CORAL }}>.</span></h1>
                <p style={{ ...sub, margin: V ? "8px auto 0" : "8px 0 0", ...reveal(t, s.t + 0.12, next - 0.3) }}>{s.line}</p>
                <code style={{ ...chip, ...reveal(t, s.t + 0.22, next - 0.3) }}>
                  <span style={{ color: MUTED }}>&lt;</span><span style={{ color: "#82aaff" }}>QiviAvatar</span> <span style={{ color: "#a9c4ef" }}>state</span>
                  <span style={{ color: MUTED }}>=</span><span style={{ color: "#ffb38a" }}>"{s.state}"</span> <span style={{ color: MUTED }}>/&gt;</span>
                </code>
              </div>
            );
          })}
          <div style={{ position: "absolute", top: 420, left: 0, right: 0, display: "flex", justifyContent: V ? "center" : "flex-start", gap: 14, ...reveal(t, 7.2, 12.5) }}>
            {STATE_STEPS.map((s) => <span key={s.state} style={{ width: t >= s.t ? 46 : 14, height: 6, borderRadius: 6, background: t >= s.t ? CORAL : "#2a3566", transition: "none" }} />)}
          </div>
        </div>
      )}

      {/* 4 · expressions, one per beat */}
      {t >= 12.9 && t < 18.2 && (
        <div style={{ position: "absolute", left: 0, right: 0, top: L.exprTop, textAlign: "center" }}>
          <div style={{ ...eyebrow, ...reveal(t, 13.0, 17.6) }}>12 expressions · 7 palettes · custom shapes</div>
          {EXPR_STEPS.map((e, i) => {
            const at = EXPR_START + i * BEAT;
            if (t < at - 0.05 || t > at + BEAT + 0.4) return null;
            const k = outBack(prog(t, at, at + 0.3));
            const out = prog(t, at + BEAT - 0.12, at + BEAT); // gone before the next label lands
            return (
              <h2 key={i} style={{ ...headline, fontSize: 104, position: "absolute", left: 0, right: 0, top: 46,
                opacity: (i === EXPR_STEPS.length - 1 ? 1 - prog(t, 17.6, 17.9) : 1 - out) * prog(t, at, at + 0.08),
                transform: `translateY(${(1 - k) * 40 - out * 30}px) scale(${0.92 + 0.08 * k})` }}>
                {EXPR_LABELS[e] ?? e[0].toUpperCase() + e.slice(1)}
              </h2>
            );
          })}
        </div>
      )}

      {/* 5 · characters */}
      {t >= 16.5 && t < 22.3 && (
        <>
          <div style={{ position: "absolute", left: 60, right: 60, top: L.charsTitleTop, textAlign: "center" }}>
            <h2 style={{ ...headline, fontSize: 84, ...reveal(t, 18.1, 21.7) }}>Six characters<span style={{ color: CORAL }}>.</span></h2>
            <p style={{ ...sub, margin: "18px auto 0", ...reveal(t, 18.5, 21.75) }}>Or design your own: palette, eyes, proportions, personality.</p>
          </div>
          {CHAR_KEYS.map((key, i) => {
            const at = CHAR_START + i * CHAR_STAGGER;
            const k = outBack(prog(t, at, at + 0.45));
            const { x, top } = L.char(i);
            return (
              <div key={key} style={{ position: "absolute", left: x - 150, top, width: 300, textAlign: "center",
                opacity: prog(t, at, at + 0.2) * (1 - prog(t, 21.7, 22.1)), transform: `translateY(${(1 - k) * 80}px)` }}>
                <QiviAvatar ref={(h) => { chars.current[i] = h; }} size={300} character={CHARACTERS[key]} appearance="dark" quality="high"
                  state="idle" expression={t >= at + 1.6 ? (["happy", "playful", "curious", "excited", "love", "focused"] as const)[i] : "neutral"}
                  glyphs={false} interactive={false} autoSleep={false} autoEmote={false} reducedMotion={false} label={CHARACTERS[key].name} />
                <div style={{ font: `600 30px ${FONT}`, color: INK, marginTop: 8, letterSpacing: -0.5 }}>{CHARACTERS[key].name}</div>
              </div>
            );
          })}
        </>
      )}

      {/* 6 · code */}
      {t >= 22.2 && t < 26.2 && (
        <div style={{ position: "absolute", ...L.code, ...reveal(t, 22.25, 25.7, 36) }}>
          <div style={{ ...eyebrow, marginBottom: 24 }}>Three lines to a face</div>
          <div style={codeCard}>
            <div style={{ display: "flex", gap: 10, marginBottom: 28 }}>{["#ff5f57", "#febc2e", "#28c840"].map((c) => <span key={c} style={{ width: 14, height: 14, borderRadius: 9, background: c }} />)}</div>
            <pre style={{ margin: 0, font: `500 34px/1.45 ${MONO}`, whiteSpace: "pre" }}>{renderTyped(typed(t), t)}</pre>
          </div>
        </div>
      )}

      {/* 7 · end card */}
      {t >= 25.9 && (
        <div style={{ position: "absolute", left: 0, right: 0, top: L.endTop, textAlign: "center" }}>
          <h1 style={{ ...headline, fontSize: 150, letterSpacing: -7, ...reveal(t, 26.2) }}>Qivi<span style={{ color: CORAL }}>.</span></h1>
          <div style={{ ...reveal(t, 26.6), marginTop: 22 }}>
            <code style={{ ...chip, fontSize: 34, padding: "16px 30px", marginTop: 0 }}><span style={{ color: MUTED }}>$ </span>npm i qivi-react</code>
          </div>
          <p style={{ ...sub, margin: "30px auto 0", fontSize: 26, ...reveal(t, 27.0) }}>github.com/yogeshhrathod/qivi{V ? <br /> : " · "}MIT · React 19</p>
        </div>
      )}
    </main>
  );
}

function renderTyped(n: number, t: number): ReactNode {
  const out: ReactNode[] = [];
  let left = n;
  CODE.forEach((s, i) => {
    if (left <= 0) return;
    out.push(<span key={i} style={{ color: s.color }}>{s.text.slice(0, left)}</span>);
    left -= s.text.length;
  });
  const blink = n < CODE_LEN || Math.floor(t / BEAT) % 2 === 0;
  out.push(<span key="caret" style={{ display: "inline-block", width: 18, height: 38, background: CORAL, verticalAlign: -6, opacity: blink ? 1 : 0 }} />);
  return out;
}

const stage: CSSProperties = { position: "relative", width: W, height: H, overflow: "hidden", background: "radial-gradient(120% 90% at 50% 40%, #0d1640 0%, #070b20 55%, #03050d 100%)", fontFamily: FONT, color: INK };
const glow: CSSProperties = { position: "absolute", width: 1400, height: 1400, borderRadius: "50%", background: "radial-gradient(circle, rgba(45,95,208,0.22) 0%, rgba(242,69,58,0.06) 35%, transparent 65%)", pointerEvents: "none" };
const center: CSSProperties = { position: "absolute", inset: 0, display: "grid", placeItems: "center" };
const eyebrow: CSSProperties = { font: `600 22px ${FONT}`, letterSpacing: 4, textTransform: "uppercase", color: CORAL, marginBottom: 18 };
const headline: CSSProperties = { font: `700 124px/1.02 ${FONT}`, letterSpacing: -5, margin: 0, color: INK };
const sub: CSSProperties = { font: `400 32px/1.4 ${FONT}`, color: MUTED, margin: "26px 0 0", maxWidth: 820 };
const chip: CSSProperties = { display: "inline-block", marginTop: 34, padding: "12px 22px", borderRadius: 14, background: "rgba(20,30,72,0.85)", border: "1px solid #24305f", font: `500 28px ${MONO}`, color: INK };
const codeCard: CSSProperties = { padding: "28px 40px 40px", borderRadius: 24, background: "rgba(9,14,38,0.92)", border: "1px solid #222d5c", boxShadow: "0 40px 120px rgba(0,0,0,0.45)", minHeight: 430 };

// ---------- soundtrack (same beat grid as the visuals) ----------
async function renderAudio(): Promise<string> {
  const rate = 48000;
  const ctx = new OfflineAudioContext(2, rate * DURATION, rate);
  const master = ctx.createGain(); master.gain.value = 0.8;
  const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 3;
  master.connect(comp).connect(ctx.destination);
  const verb = ctx.createConvolver(); verb.buffer = impulse(ctx, 2.4); const verbGain = ctx.createGain(); verbGain.gain.value = 0.28;
  verb.connect(verbGain).connect(master);
  const noise = ctx.createBuffer(1, rate, rate); noise.getChannelData(0).forEach((_, i, d) => { d[i] = Math.random() * 2 - 1; });
  const hz = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

  const env = (g: GainNode, at: number, a: number, peak: number, d: number) => {
    g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(peak, at + a); g.gain.exponentialRampToValueAtTime(0.0001, at + a + d);
  };
  const tone = (at: number, freq: number, type: OscillatorType, peak: number, a: number, d: number, send = 0.3, pan = 0) => {
    const o = ctx.createOscillator(); o.type = type; o.frequency.value = freq;
    const g = ctx.createGain(); env(g, at, a, peak, d);
    const p = ctx.createStereoPanner(); p.pan.value = pan;
    o.connect(g).connect(p); p.connect(master);
    const s = ctx.createGain(); s.gain.value = send; p.connect(s).connect(verb);
    o.start(at); o.stop(at + a + d + 0.05);
  };
  const kick = (at: number, peak = 0.9) => {
    const o = ctx.createOscillator(); o.frequency.setValueAtTime(150, at); o.frequency.exponentialRampToValueAtTime(42, at + 0.14);
    const g = ctx.createGain(); env(g, at, 0.003, peak, 0.32); o.connect(g).connect(master); o.start(at); o.stop(at + 0.4);
  };
  const hiss = (at: number, dur: number, peak: number, filterFrom: number, filterTo: number, type: BiquadFilterType = "highpass", rise = false) => {
    const s = ctx.createBufferSource(); s.buffer = noise; s.loop = true;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(filterFrom, at); f.frequency.exponentialRampToValueAtTime(filterTo, at + dur);
    const g = ctx.createGain();
    if (rise) { g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(peak, at + dur); g.gain.linearRampToValueAtTime(0, at + dur + 0.02); }
    else env(g, at, 0.002, peak, dur);
    s.connect(f).connect(g).connect(master); const v = ctx.createGain(); v.gain.value = 0.2; g.connect(v).connect(verb);
    s.start(at); s.stop(at + dur + 0.1);
  };

  // 1 · dot pulses, then the burst impact
  [0, 0.5, 1.0].forEach((at, i) => tone(at, hz(81 + i * 2), "sine", 0.35, 0.004, 0.35, 0.6));
  hiss(0.6, 0.9, 0.25, 800, 9000, "bandpass", true);
  const boom = ctx.createOscillator(); boom.frequency.setValueAtTime(110, 1.5); boom.frequency.exponentialRampToValueAtTime(32, 2.6);
  const boomG = ctx.createGain(); env(boomG, 1.5, 0.005, 1.0, 1.4); boom.connect(boomG).connect(master); boom.start(1.5); boom.stop(3);
  hiss(1.5, 1.2, 0.35, 9000, 300, "lowpass");

  // pads: Fmaj7 · Am7 · Dm9 · Cadd9, one chord per bar (2 s)
  const chords = [[53, 57, 60, 64], [57, 60, 64, 67], [50, 57, 60, 65, 64], [48, 55, 62, 64]];
  for (let bar = 0; bar < 14; bar++) {
    const at = 1.5 + bar * 2;
    if (at >= 28) break;
    const ch = chords[bar % 4];
    ch.forEach((n, i) => [-6, 6].forEach((det) => {
      const o = ctx.createOscillator(); o.type = "sawtooth"; o.frequency.value = hz(n); o.detune.value = det;
      const f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 900 + 500 * Math.sin(bar);
      const g = ctx.createGain(); g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(0.035, at + 0.6); g.gain.setValueAtTime(0.035, at + 1.7); g.gain.linearRampToValueAtTime(0, at + 2.3);
      const p = ctx.createStereoPanner(); p.pan.value = (i / (ch.length - 1)) * 1.2 - 0.6;
      o.connect(f).connect(g).connect(p).connect(master); const s = ctx.createGain(); s.gain.value = 0.5; p.connect(s).connect(verb);
      o.start(at); o.stop(at + 2.4);
    }));
  }

  // drums + bass from the title until the end card
  const roots = [41, 45, 38, 36];
  for (let b = 6; b < 52; b++) {
    const at = b * BEAT;
    if (at >= 12.5 && at < 13) continue;
    if (at >= 26) break;
    kick(at, at < 7 ? 0.6 : 0.9);
    if (at >= 7) {
      hiss(at + BEAT / 2, 0.05, 0.12, 7000, 9000);
      if (b % 4 === 2) hiss(at, 0.18, 0.22, 1800, 1200, "bandpass");
      const bar = Math.floor((at - 1.5) / 2);
      tone(at, hz(roots[((bar % 4) + 4) % 4] - 12), "triangle", 0.32, 0.005, 0.38, 0, 0);
      tone(at + BEAT / 2, hz(roots[((bar % 4) + 4) % 4]), "triangle", 0.18, 0.005, 0.2, 0, 0);
    }
  }
  hiss(2.4, 0.6, 0.3, 500, 12000, "bandpass", true);
  hiss(12.0, 1.0, 0.35, 400, 12000, "bandpass", true);

  // state changes and expressions: bright plucks on the beat
  STATE_STEPS.forEach((s, i) => tone(s.t, hz(72 + [0, 3, 7, 12][i]), "triangle", 0.3, 0.004, 0.6, 0.5, 0.3));
  const scale = [72, 74, 76, 79, 81, 84, 86, 88, 91, 93];
  EXPR_STEPS.forEach((_, i) => tone(EXPR_START + i * BEAT, hz(scale[i]), "sine", 0.28, 0.003, 0.4, 0.5, i % 2 ? 0.4 : -0.4));
  CHAR_KEYS.forEach((_, i) => tone(CHAR_START + i * CHAR_STAGGER, hz([69, 72, 76, 79, 81, 84][i]), "triangle", 0.26, 0.003, 0.45, 0.45, (i - 2.5) / 3));

  // typing ticks
  for (let n = 1; n <= CODE_LEN; n++) hiss(CODE_START + n / CODE_CPS, 0.015, 0.08, 4000, 6000, "bandpass");

  // end card: final chord swell
  [53, 60, 64, 69, 72].forEach((n, i) => tone(26.0 + i * 0.04, hz(n), "sine", 0.12, 0.08, 3.6, 0.7, (i - 2) / 3));
  kick(26.0, 1.0); hiss(26.0, 1.5, 0.25, 9000, 400, "lowpass");

  const buf = await ctx.startRendering();
  return wavBase64(buf);
}

function impulse(ctx: BaseAudioContext, seconds: number) {
  const len = ctx.sampleRate * seconds, b = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3); }
  return b;
}

function wavBase64(buf: AudioBuffer) {
  const ch = buf.numberOfChannels, len = buf.length, bytes = new DataView(new ArrayBuffer(44 + len * ch * 2));
  const str = (o: number, s: string) => [...s].forEach((c, i) => bytes.setUint8(o + i, c.charCodeAt(0)));
  str(0, "RIFF"); bytes.setUint32(4, 36 + len * ch * 2, true); str(8, "WAVE"); str(12, "fmt ");
  bytes.setUint32(16, 16, true); bytes.setUint16(20, 1, true); bytes.setUint16(22, ch, true); bytes.setUint32(24, buf.sampleRate, true);
  bytes.setUint32(28, buf.sampleRate * ch * 2, true); bytes.setUint16(32, ch * 2, true); bytes.setUint16(34, 16, true); str(36, "data"); bytes.setUint32(40, len * ch * 2, true);
  const data = [...Array(ch)].map((_, c) => buf.getChannelData(c));
  for (let i = 0, o = 44; i < len; i++) for (let c = 0; c < ch; c++, o += 2) bytes.setInt16(o, clamp(data[c][i], -1, 1) * 0x7fff, true);
  let bin = ""; const u8 = new Uint8Array(bytes.buffer);
  for (let i = 0; i < u8.length; i += 0x8000) bin += String.fromCharCode(...u8.subarray(i, i + 0x8000));
  return btoa(bin);
}

declare global { interface Window { __seek: (t: number) => void; __renderAudio: () => Promise<string>; __promo: { duration: number; width: number; height: number } } }
window.__renderAudio = renderAudio;
window.__promo = { duration: DURATION, width: W, height: H };

// ---------- ?play: real-time preview with soundtrack and scrubbing ----------
// The stage is scaled to fit the window; the controls sit below it.
function Preview() {
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const audio = useRef<HTMLAudioElement | null>(null);
  const raf = useRef(0);

  const loop = () => {
    const a = audio.current!;
    window.__seek(a.currentTime); setT(a.currentTime);
    if (a.ended) { setPlaying(false); return; }
    raf.current = requestAnimationFrame(loop);
  };
  const play = async () => {
    if (!audio.current) {
      setLoading(true);
      const bytes = Uint8Array.from(atob(await renderAudio()), (c) => c.charCodeAt(0));
      audio.current = new Audio(URL.createObjectURL(new Blob([bytes], { type: "audio/wav" })));
      setLoading(false);
    }
    if (audio.current.ended) audio.current.currentTime = 0;
    await audio.current.play(); setPlaying(true); raf.current = requestAnimationFrame(loop);
  };
  const pause = () => { audio.current?.pause(); cancelAnimationFrame(raf.current); setPlaying(false); };
  const scrub = (next: number) => {
    if (audio.current) audio.current.currentTime = next;
    window.__seek(next); setT(next);
  };

  const [fit, setFit] = useState(1);
  useEffect(() => {
    const onResize = () => setFit(Math.min(window.innerWidth / W, (window.innerHeight - 80) / H));
    onResize(); window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <>
      <div style={{ width: W * fit, height: H * fit, margin: "0 auto" }}>
        <div style={{ transform: `scale(${fit})`, transformOrigin: "0 0" }}><Promo /></div>
      </div>
      <div style={{ position: "fixed", left: 16, right: 16, bottom: 16, display: "flex", alignItems: "center", gap: 14, padding: "10px 16px", borderRadius: 14,
        background: "rgba(5,8,22,0.85)", border: "1px solid #24305f", color: INK, font: `500 15px ${FONT}`, zIndex: 10 }}>
        <button onClick={playing ? pause : play} disabled={loading} style={{ minWidth: 92, padding: "8px 14px", borderRadius: 10, border: 0, background: CORAL, color: "white", font: "inherit", cursor: "pointer" }}>
          {loading ? "Loading…" : playing ? "Pause" : "Play"}
        </button>
        <input type="range" min={0} max={DURATION} step={1 / 30} value={t} onChange={(e) => scrub(Number(e.target.value))} style={{ flex: 1, accentColor: CORAL }} aria-label="Timeline" />
        <span style={{ fontVariantNumeric: "tabular-nums", minWidth: 96, textAlign: "right" }}>{t.toFixed(2)} / {DURATION}s</span>
      </div>
    </>
  );
}

const params = new URLSearchParams(location.search);
const style = document.createElement("style");
style.textContent = `* { box-sizing: border-box; } html, body { margin: 0; background: #03050d; overflow: ${params.has("play") ? "auto" : "hidden"}; }`;
document.head.append(style);
if (!params.has("audio")) createRoot(document.getElementById("root")!).render(params.has("play") ? <Preview /> : <Promo />);
