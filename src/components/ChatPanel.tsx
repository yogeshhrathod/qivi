import { useEffect, useRef, useState } from "react";
import type { Finding } from "../agent/responder";
import type { Message } from "../agent/useQiviAgent";
import { QiviAvatar } from "@yogeshhrathod/qivi";
import type { QiviPersonality, QiviState, QiviTheme } from "@yogeshhrathod/qivi";

interface Props {
  messages: Message[];
  findings: Finding[];
  state: QiviState;
  onSend: (q: string) => void;
  inputProps: { onFocus: () => void; onBlur: () => void; onType: () => void };
  bindInput: (el: HTMLElement | null) => void;
  bindFindings: (el: HTMLElement | null) => void;
  bindAnswer: (el: HTMLElement | null) => void;
  bindDock: (el: HTMLElement | null) => void;
  docked: boolean;
  personality: QiviPersonality;
  theme: QiviTheme;
  mic: { on: boolean; start: () => void; stop: () => void; transcript: string; error: string | null; supported: boolean };
  speech: { on: boolean; set: (v: boolean) => void; speaking: boolean; stop: () => void };
}

const MicIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
    <rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor" />
    <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);
const SpeakerIcon = ({ on }: { on: boolean }) => (
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
    <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor" />
    {on ? <path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /> : <path d="M16 9.5l5 5M21 9.5l-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />}
  </svg>
);

const TONE_LABEL = { success: "Done", warning: "Needs attention", error: "Failed" } as const;

export function ChatPanel({ messages, findings, state, onSend, inputProps, bindInput, bindFindings, bindAnswer, bindDock, docked, personality, theme, mic, speech }: Props) {
  const [value, setValue] = useState("");
  const logRef = useRef<HTMLDivElement>(null);
  const lastQivi = [...messages].reverse().find((m) => m.role === "qivi");

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    onSend(value);
    setValue("");
  };

  return (
    <section className="chat" aria-label="Conversation with Qivi">
      <div className="chat-log" ref={logRef} aria-live="polite">
        {messages.length === 0 && (
          <div className="chat-empty">
            <p className="chat-empty-title">Ask about your security posture</p>
            <p>Try “Show me critical vulnerabilities” or “Which patches should I deploy?”</p>
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`msg msg-${m.role} ${m.tone ? `tone-${m.tone}` : ""}`} ref={m === lastQivi ? bindAnswer : undefined}>
            {m.role === "qivi" && <QiviAvatar size={26} label="Qivi" personality={personality} theme={theme} expression={m.tone === "success" ? "happy" : "neutral"} state={m.tone === "error" ? "error" : "idle"} />}
            <div className="msg-body">
              {m.tone && m.tone !== "success" && <span className="msg-tone">{TONE_LABEL[m.tone]}</span>}
              {m.text || <span className="msg-pending">Working on it</span>}
              {m.streaming && m.text && <span className="caret" aria-hidden="true" />}
            </div>
          </div>
        ))}
      </div>

      <div className={`findings ${findings.length ? "has-items" : ""} ${["searching", "analyzing", "found"].includes(state) ? "is-active" : ""}`} ref={bindFindings} aria-label="Findings">
        <div className="findings-head">
          <span>Findings</span>
          <span className="findings-count">{findings.length ? `${findings.length} results` : state === "searching" || state === "analyzing" ? "Scanning…" : "None yet"}</span>
        </div>
        <ul>
          {findings.map((f) => (
            <li key={f.id} className={`finding sev-${f.severity}`}>
              <span className="sev">{f.severity}</span>
              <div>
                <div className="finding-title">{f.title}</div>
                <div className="finding-meta">
                  {f.id} on {f.asset}. {f.detail}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <form className="composer" onSubmit={submit}>
        <div className={`dock ${docked ? "is-docked" : ""}`} ref={bindDock} aria-hidden="true" />
        <label className="sr-only" htmlFor="qivi-input">Message Qivi</label>
        <input
          id="qivi-input"
          ref={bindInput}
          value={mic.on ? mic.transcript : value}
          readOnly={mic.on}
          placeholder={mic.on ? "Listening… speak now" : "Ask Qivi anything…"}
          autoComplete="off"
          onChange={(e) => {
            setValue(e.target.value);
            inputProps.onType();
          }}
          onFocus={inputProps.onFocus}
          onBlur={inputProps.onBlur}
        />
        <button
          type="button"
          className={`icon-btn ${speech.on ? "is-on" : ""}`}
          aria-pressed={speech.on}
          aria-label={speech.on ? "Stop reading replies aloud" : "Read replies aloud"}
          title={speech.on ? "Replies are read aloud" : "Read replies aloud"}
          onClick={() => {
            if (speech.on) speech.stop();
            speech.set(!speech.on);
          }}
        >
          <SpeakerIcon on={speech.on} />
        </button>
        {mic.supported && (
          <button
            type="button"
            className={`icon-btn mic-btn ${mic.on ? "is-on" : ""}`}
            aria-pressed={mic.on}
            aria-label={mic.on ? "Stop listening" : "Talk to Qivi"}
            title={mic.on ? "Stop listening" : "Talk to Qivi"}
            onClick={() => (mic.on ? mic.stop() : mic.start())}
          >
            <MicIcon />
          </button>
        )}
        <button type="submit" disabled={mic.on || !value.trim()}>Send</button>
      </form>
      {mic.error && <p className="mic-error" role="alert">{mic.error}</p>}
    </section>
  );
}
