import { useEffect, useMemo, useState } from "react";
import { CHARACTERS, EXPRESSIONS, QiviAvatar, QiviVoice, STATES, type QiviExpression, type QiviState } from "qivi-react";

const characters = Object.keys(CHARACTERS) as (keyof typeof CHARACTERS)[];

export function App() {
  const [state, setState] = useState<QiviState>("idle");
  const [expression, setExpression] = useState<QiviExpression>("neutral");
  const [character, setCharacter] = useState<keyof typeof CHARACTERS>("qivi");

  // "talking" needs a voice source; simulate() babbles without audio. Use QiviVoice.microphone(),
  // fromMediaElement(audio) or fromStream(stream) for real sound.
  const voice = useMemo(() => (state === "talking" ? QiviVoice.simulate() : null), [state]);
  useEffect(() => () => voice?.dispose(), [voice]);

  return (
    <main style={page}>
      <QiviAvatar size={280} character={CHARACTERS[character]} state={state} expression={expression} voice={voice} appearance="dark" />

      <Row label="State">
        {(Object.keys(STATES) as QiviState[]).map((s) => (
          <Chip key={s} active={s === state} onClick={() => setState(s)}>{STATES[s].label}</Chip>
        ))}
      </Row>
      <Row label="Expression">
        {(Object.keys(EXPRESSIONS) as QiviExpression[]).map((e) => (
          <Chip key={e} active={e === expression} onClick={() => setExpression(e)}>{EXPRESSIONS[e].label}</Chip>
        ))}
      </Row>
      <Row label="Character">
        {characters.map((c) => (
          <Chip key={c} active={c === character} onClick={() => setCharacter(c)}>{CHARACTERS[c].name}</Chip>
        ))}
      </Row>
    </main>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section style={{ maxWidth: 720, textAlign: "center" }}>
      <h2 style={{ font: "600 12px system-ui", letterSpacing: 2, textTransform: "uppercase", color: "#f2453a", margin: "0 0 8px" }}>{label}</h2>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center" }}>{children}</div>
    </section>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} aria-pressed={active} style={{
      padding: "6px 12px", borderRadius: 999, cursor: "pointer", font: "500 13px system-ui",
      border: `1px solid ${active ? "#f2453a" : "#2a3566"}`, background: active ? "#f2453a" : "transparent", color: "#e8ecf7",
    }}>{children}</button>
  );
}

const page: React.CSSProperties = {
  minHeight: "100vh", margin: 0, padding: "32px 16px", boxSizing: "border-box", display: "flex", flexDirection: "column",
  alignItems: "center", gap: 20, background: "#070b20", color: "#e8ecf7",
};
