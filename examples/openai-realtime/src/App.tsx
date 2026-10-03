// Qivi + OpenAI Realtime (WebRTC). Event names and endpoints confirmed against:
//   https://developers.openai.com/api/docs/guides/realtime-webrtc
//   https://developers.openai.com/api/reference/resources/realtime/server-events
import { useEffect, useRef, useState } from "react";
import { QiviAvatar, QiviVoice, type QiviState } from "qivi-react";

type Status = "off" | "connecting" | "live";

interface Conn {
  pc: RTCPeerConnection;
  mic: MediaStream;
  micVoice: QiviVoice;
  remoteVoice?: QiviVoice;
}

export function App() {
  const [status, setStatus] = useState<Status>("off");
  const [state, setState] = useState<QiviState>("idle");
  const [voice, setVoice] = useState<QiviVoice | null>(null);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const conn = useRef<Conn | null>(null);

  function stop() {
    const c = conn.current;
    conn.current = null;
    if (c) {
      c.pc.close();
      c.mic.getTracks().forEach((t) => t.stop());
      c.micVoice.dispose();
      c.remoteVoice?.dispose();
    }
    if (audioRef.current) audioRef.current.srcObject = null;
    setVoice(null);
    setStatus("off");
  }

  function fail(message: string) {
    setError(message);
    setState("error");
    stop();
  }

  // Drive Qivi from Realtime server events on the "oai-events" data channel.
  function onServerEvent(ev: { type: string; [k: string]: any }) {
    const c = conn.current;
    if (!c) return;
    switch (ev.type) {
      case "input_audio_buffer.speech_started": // user began speaking (server VAD)
        setState("listening");
        setVoice(c.micVoice);
        break;
      case "input_audio_buffer.speech_stopped": // user finished; model is working
      case "response.created":
        setState("thinking");
        setVoice(null);
        break;
      case "output_audio_buffer.started": // WebRTC only: assistant audio is playing
        setState("talking");
        setVoice(c.remoteVoice ?? null);
        break;
      case "output_audio_buffer.stopped": // WebRTC only: assistant audio fully drained
        setState("idle");
        setVoice(null);
        break;
      case "response.done":
        if (ev.response?.status === "failed") setState("error");
        break;
      case "error":
        setError(ev.error?.message ?? "Realtime error");
        setState("error");
        break;
    }
  }

  async function start() {
    setError(null);
    setStatus("connecting");
    setState("thinking");
    let c: Conn | null = null;
    try {
      // Mic first, inside the click handler, so permission and audio playback are unlocked.
      const mic = await navigator.mediaDevices.getUserMedia({ audio: true });
      const pc = new RTCPeerConnection();
      c = { pc, mic, micVoice: QiviVoice.fromStream(mic) };
      conn.current = c;
      const self = c;

      pc.ontrack = (e) => {
        const remote = e.streams[0];
        if (audioRef.current) audioRef.current.srcObject = remote; // playback
        self.remoteVoice?.dispose();
        self.remoteVoice = QiviVoice.fromStream(remote); // analysis only, no double playback
      };
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "failed") fail("Connection lost.");
      };
      mic.getTracks().forEach((t) => pc.addTrack(t, mic));

      const dc = pc.createDataChannel("oai-events");
      dc.onmessage = (m) => onServerEvent(JSON.parse(m.data));
      dc.onopen = () => {
        setStatus("live");
        setState("idle");
      };

      // 1. Ephemeral secret from our server (the API key never reaches the browser).
      const tokenRes = await fetch("/session", { method: "POST" });
      if (!tokenRes.ok) throw new Error("Token server error. Is server.mjs running?");
      const { value } = (await tokenRes.json()) as { value: string };

      // 2. SDP offer/answer with OpenAI.
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      const sdpRes = await fetch("https://api.openai.com/v1/realtime/calls", {
        method: "POST",
        body: offer.sdp,
        headers: { Authorization: `Bearer ${value}`, "Content-Type": "application/sdp" },
      });
      if (!sdpRes.ok) throw new Error(`Realtime call failed (${sdpRes.status}).`);
      if (conn.current !== c) return; // stopped while connecting
      await pc.setRemoteDescription({ type: "answer", sdp: await sdpRes.text() });
    } catch (err) {
      if (c && conn.current !== c) return; // user pressed Stop mid-connect
      fail(err instanceof Error ? err.message : String(err));
    }
  }

  useEffect(() => stop, []); // clean up on unmount

  const live = status !== "off";
  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ display: "grid", justifyItems: "center", gap: 24 }}>
        <QiviAvatar size={280} state={state} voice={voice} />
        <p aria-live="polite" style={{ margin: 0, minHeight: "1.5em" }}>
          {error ?? (status === "connecting" ? "Connecting..." : live ? `Qivi is ${state}` : "Press Start and say hello")}
        </p>
        <button
          onClick={() => (live ? (stop(), setState("idle")) : void start())}
          style={{ font: "inherit", padding: "10px 28px", borderRadius: 999, cursor: "pointer" }}
        >
          {live ? "Stop" : "Start"}
        </button>
        <audio ref={audioRef} autoPlay />
      </div>
    </main>
  );
}
