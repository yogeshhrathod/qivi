import { useCallback, useEffect, useRef, useState } from "react";
import { STATES } from "@yogeshhrathod/qivi";
import type { QiviExpression, QiviState } from "@yogeshhrathod/qivi";
import { QiviVoice } from "@yogeshhrathod/qivi";
import { mockResponder, type Finding, type Responder } from "./responder";

export interface Message {
  id: number;
  role: "user" | "qivi";
  text: string;
  tone?: "success" | "warning" | "error";
  streaming?: boolean;
}

const TERMINAL_HOLD = { success: 2600, warning: 4200, error: 3600 } as const;

interface RecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start(): void;
  stop(): void;
}

function createRecognition(): RecognitionLike | null {
  const w = window as unknown as { SpeechRecognition?: new () => RecognitionLike; webkitSpeechRecognition?: new () => RecognitionLike };
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
}

/**
 * Turns conversation activity into Qivi state/expression/voice. The engine blends between whatever
 * this returns, so the hook only decides *what* Qivi is doing, never *how* it transitions.
 *
 * Voice: the microphone drives "listening" (with speech-to-text where the browser supports it),
 * spoken replies drive "talking", and keystrokes pulse the listening state while typing.
 */
export function useQiviAgent(responder: Responder = mockResponder) {
  const [state, setState] = useState<QiviState>("idle");
  const [moment, setMoment] = useState<QiviExpression | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [focused, setFocused] = useState(false);
  const [typing, setTyping] = useState(false);
  const [micVoice, setMicVoice] = useState<QiviVoice | null>(null);
  const [speechVoice, setSpeechVoice] = useState<QiviVoice | null>(null);
  const [transcript, setTranscript] = useState("");
  const [micError, setMicError] = useState<string | null>(null);
  const [speakReplies, setSpeakReplies] = useState(false);
  const speakRef = useRef(speakReplies);
  speakRef.current = speakReplies;
  const typingVoice = useRef(QiviVoice.manual());
  const recognition = useRef<RecognitionLike | null>(null);
  const busy = useRef(false);
  const abort = useRef<AbortController | null>(null);
  const timers = useRef<number[]>([]);
  const typingTimer = useRef<number>(0);
  const nextId = useRef(1);

  const later = (ms: number, fn: () => void) => timers.current.push(window.setTimeout(fn, ms));
  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  useEffect(() => {
    if (busy.current) return;
    if (["success", "warning", "error", "talking"].includes(state)) return;
    setState(focused || micVoice ? "listening" : "idle");
  }, [focused, state, micVoice]);

  const onType = useCallback(() => {
    setTyping(true);
    typingVoice.current.pulse(0.55);
    clearTimeout(typingTimer.current);
    typingTimer.current = window.setTimeout(() => setTyping(false), 1400);
  }, []);

  const stopSpeaking = useCallback(() => {
    setSpeechVoice((v) => {
      v?.dispose();
      return null;
    });
  }, []);

  const send = useCallback(
    async (query: string) => {
      const q = query.trim();
      if (!q) return;
      abort.current?.abort();
      stopSpeaking();
      clearTimers();
      const ac = new AbortController();
      abort.current = ac;
      busy.current = true;
      setMoment(null);
      setFindings([]);
      const qiviId = nextId.current + 1;
      setMessages((m) => [...m, { id: nextId.current, role: "user", text: q }, { id: qiviId, role: "qivi", text: "", streaming: true }]);
      nextId.current += 2;
      let answer = "";

      try {
        for await (const ev of responder(q, ac.signal)) {
          if (ev.type === "phase") {
            setState(ev.phase);
            if (ev.phase === "found") later(650, () => setMoment("happy"));
          } else if (ev.type === "findings") setFindings(ev.items);
          else if (ev.type === "token") {
            answer += ev.text;
            setState((s) => (s === "error" ? s : "answering"));
            setMoment(null);
            setMessages((m) => m.map((x) => (x.id === qiviId ? { ...x, text: x.text + ev.text } : x)));
          } else {
            setMessages((m) => m.map((x) => (x.id === qiviId ? { ...x, streaming: false, tone: ev.tone } : x)));
            if (speakRef.current && answer && !ac.signal.aborted) {
              // read the reply aloud: Qivi's mouth and body follow its own voice
              const { voice, done } = QiviVoice.speak(answer);
              setSpeechVoice(voice);
              setState("talking");
              await done;
              voice.dispose();
              setSpeechVoice((v) => (v === voice ? null : v));
              if (ac.signal.aborted) return;
            }
            setState(ev.tone);
            busy.current = false;
            later(TERMINAL_HOLD[ev.tone], () => setState("idle"));
          }
        }
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          setMessages((m) => m.map((x) => (x.id === qiviId ? { ...x, streaming: false, tone: "error", text: "The request failed before I could answer. Try again." } : x)));
          setState("error");
          later(TERMINAL_HOLD.error, () => setState("idle"));
        }
      } finally {
        busy.current = false;
      }
    },
    [responder, stopSpeaking],
  );

  const stopMic = useCallback(() => {
    recognition.current?.stop();
    recognition.current = null;
    setMicVoice((v) => {
      v?.dispose();
      return null;
    });
  }, []);

  const startMic = useCallback(async () => {
    setMicError(null);
    stopSpeaking();
    try {
      const voice = await QiviVoice.microphone();
      setMicVoice(voice);
    } catch {
      setMicError("Microphone access was blocked. Allow it in the browser's site settings to talk to Qivi.");
      return;
    }
    const rec = createRecognition();
    if (!rec) return;
    recognition.current = rec;
    rec.lang = navigator.language || "en-US";
    rec.interimResults = true;
    rec.continuous = false;
    let finalText = "";
    rec.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalText += r[0].transcript;
        else interim += r[0].transcript;
      }
      setTranscript(finalText + interim);
    };
    rec.onend = () => {
      const text = finalText.trim();
      setTranscript("");
      stopMic();
      if (text) void send(text);
    };
    rec.onerror = () => stopMic();
    rec.start();
  }, [send, stopMic, stopSpeaking]);

  useEffect(
    () => () => {
      abort.current?.abort();
      clearTimers();
      recognition.current?.stop();
    },
    [],
  );

  const expression: QiviExpression = moment ?? (state === "listening" && !typing && !micVoice ? "neutral" : STATES[state].hint);
  const voice = state === "talking" ? speechVoice : micVoice ?? (state === "listening" ? typingVoice.current : null);

  return {
    state,
    expression,
    messages,
    findings,
    voice,
    send,
    mic: { on: !!micVoice, start: startMic, stop: stopMic, transcript, error: micError, supported: typeof navigator !== "undefined" && !!navigator.mediaDevices },
    speech: { on: speakReplies, set: setSpeakReplies, speaking: !!speechVoice, stop: stopSpeaking },
    inputProps: { onFocus: () => setFocused(true), onBlur: () => setFocused(false), onType },
  };
}
