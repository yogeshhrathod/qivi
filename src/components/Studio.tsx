import { OptionIcon } from "./OptionIcon";
import { useState } from "react";
import { EXPRESSIONS, PALETTES, PERSONALITIES, STATES, paletteFor } from "@yogeshhrathod/qivi";
import type { QiviExpression, QiviPersonality, QiviShape, QiviState, QiviTheme, QiviThemeName } from "@yogeshhrathod/qivi";

export type Placement = "hero" | "dock" | "corner";

export interface StudioSettings {
  personality: QiviPersonality;
  theme: QiviTheme;
  shape: "auto" | QiviShape;
  accent: "auto" | "always" | "never";
  glyphs: boolean;
  smile: boolean;
  lighting: number;
  intensity: number;
  particles: number;
  reducedMotion: boolean | "auto";
  dark: boolean;
  autoSleep: boolean;
}

interface Props {
  embedded?: boolean;
  settings: StudioSettings;
  onChange: (p: Partial<StudioSettings>) => void;
  state: QiviState;
  expression: QiviExpression;
  stateOverride: QiviState | null;
  exprOverride: QiviExpression | null;
  onStateOverride: (s: QiviState | null) => void;
  onExprOverride: (e: QiviExpression | null) => void;
  placement: Placement;
  onPlacement: (p: Placement) => void;
}

const THEMES: ("auto" | QiviThemeName)[] = ["auto", "default", "midnight", "arctic", "sunset", "mint", "amber", "lavender"];
const SHAPES: { key: "auto" | QiviShape; label: string }[] = [
  { key: "auto", label: "Automatic" },
  { key: "blob", label: "Blob" },
  { key: "heart", label: "Heart" },
  { key: "shield", label: "Shield" },
  { key: "hex", label: "Hexagon" },
  { key: "star", label: "Star" },
];

export function Studio(p: Props) {
  const [open, setOpen] = useState(p.embedded ?? false);
  const { settings: s } = p;

  return (
    <aside className={`studio ${open ? "is-open" : ""}`} aria-label="Qivi studio controls">
      {!p.embedded && <button type="button" className="studio-toggle" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        {open ? "Close avatar settings" : "Avatar settings"}
      </button>}
      {open && (
        <div className="studio-body">
          <Group label="Personality">
            {(Object.keys(PERSONALITIES) as QiviPersonality[]).map((k) => (
              <Chip key={k} active={s.personality === k} onClick={() => p.onChange({ personality: k })} title={PERSONALITIES[k].blurb}>
                {PERSONALITIES[k].label}
              </Chip>
            ))}
          </Group>

          <Group label="Color theme">
            {THEMES.map((t) => {
              const pal = t === "auto" ? paletteFor({ theme: "auto", personality: s.personality }) : PALETTES[t];
              return (
                <button key={t} type="button" className={`swatch ${s.theme === t ? "is-active" : ""}`} onClick={() => p.onChange({ theme: t })} aria-pressed={s.theme === t}>
                  <span className="swatch-dot" style={{ background: `linear-gradient(135deg, ${pal.deep} 0%, ${pal.mid} 48%, ${pal.warm} 52%, ${pal.hi} 100%)` }} />
                  {t === "auto" ? "Personality" : t[0].toUpperCase() + t.slice(1)}
                </button>
              );
            })}
          </Group>

          <Group label="State" hint={p.stateOverride ? "Manual" : `Following chat: ${STATES[p.state].label}`}>
            <Chip active={!p.stateOverride} onClick={() => p.onStateOverride(null)}>Follow chat</Chip>
            {(Object.keys(STATES) as QiviState[]).map((k) => (
              <Chip key={k} active={p.stateOverride === k} onClick={() => p.onStateOverride(k)}>
                {STATES[k].label}
              </Chip>
            ))}
          </Group>

          <Group label="Expression" hint={p.exprOverride ? "Manual" : `Automatic: ${EXPRESSIONS[p.expression].label}`}>
            <Chip active={!p.exprOverride} onClick={() => p.onExprOverride(null)}>Automatic</Chip>
            {(Object.keys(EXPRESSIONS) as QiviExpression[]).map((k) => (
              <Chip key={k} active={p.exprOverride === k} onClick={() => p.onExprOverride(k)}>
                {EXPRESSIONS[k].label}
              </Chip>
            ))}
          </Group>

          <Group label="Shape" hint={s.shape === "auto" ? "Morphs with state and mood" : "Locked"}>
            {SHAPES.map(({ key, label }) => (
              <Chip key={key} active={s.shape === key} onClick={() => p.onChange({ shape: key })}>
                <OptionIcon name={label} />{label}
              </Chip>
            ))}
          </Group>

          <Group label="Accent orb">
            {(["auto", "always", "never"] as const).map((k) => (
              <Chip key={k} active={s.accent === k} onClick={() => p.onChange({ accent: k })}>
                {k === "auto" ? "When signalling" : k === "always" ? "Always" : "Hidden"}
              </Chip>
            ))}
          </Group>

          <Group label="Placement">
            {(["hero", "dock", "corner"] as Placement[]).map((k) => (
              <Chip key={k} active={p.placement === k} onClick={() => p.onPlacement(k)}>
                {k === "hero" ? "Hero" : k === "dock" ? "Chat dock" : "Corner"}
              </Chip>
            ))}
          </Group>

          <div className="studio-row">
            <Slider label="Lighting" min={0} max={1} step={0.05} value={s.lighting} onChange={(v) => p.onChange({ lighting: v })} />
            <Slider label="Intensity" min={0} max={1} step={0.05} value={s.intensity} onChange={(v) => p.onChange({ intensity: v })} />
            <Slider label="Particles" min={4000} max={40000} step={2000} value={s.particles} onChange={(v) => p.onChange({ particles: v })} display={`${(s.particles / 1000).toFixed(0)}k`} />
          </div>
          <div className="studio-row">
            <Toggle label="Dark theme" checked={s.dark} onChange={(v) => p.onChange({ dark: v })} />
            <Toggle label="Smile" checked={s.smile} onChange={(v) => p.onChange({ smile: v })} />
            <Toggle label="Signal glyphs" checked={s.glyphs} onChange={(v) => p.onChange({ glyphs: v })} />
            <Toggle label="Reduced motion" checked={s.reducedMotion === true} onChange={(v) => p.onChange({ reducedMotion: v ? true : "auto" })} />
            <Toggle label="Doze when idle" checked={s.autoSleep} onChange={(v) => p.onChange({ autoSleep: v })} />
          </div>
        </div>
      )}
    </aside>
  );
}

function Group({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="group" role="group" aria-label={label}>
      <div className="group-label">
        <OptionIcon name={label} />{label}
        {hint && <span className="group-hint">{hint}</span>}
      </div>
      <div className="group-items">{children}</div>
    </div>
  );
}

function Chip({ active, onClick, children, title }: { active: boolean; onClick: () => void; children: React.ReactNode; title?: string }) {
  return (
    <button type="button" className={`chip ${active ? "is-active" : ""}`} aria-pressed={active} onClick={onClick} title={title}>
      <OptionIcon name={typeof children === "string" ? children : "settings"} />{children}
    </button>
  );
}

function Slider({ label, value, onChange, display, ...range }: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; display?: string }) {
  return (
    <label className="slider">
      <span className="option-label"><OptionIcon name={label} />{label}</span>
      <input type="range" {...range} value={value} onChange={(e) => onChange(+e.target.value)} />
      <span className="slider-value">{display ?? `${Math.round(value * 100)}%`}</span>
    </label>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="toggle">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="toggle-track" aria-hidden="true" />
      <span className="option-label"><OptionIcon name={label} />{label}</span>
    </label>
  );
}
