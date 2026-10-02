import { useId, useMemo } from "react";
import { STATES, paletteFor, composeTarget } from "./presets";
import { DEFAULT_CONFIG } from "./types";
import type { QiviConfig, QiviExpression, QiviPersonality, QiviState, QiviTheme } from "./types";

interface Props {
  character?: QiviConfig["character"];
  presentation?: QiviConfig["presentation"];
  expressionStrength?: number;
  expressionDefinition?: QiviConfig["expressionDefinition"];
  params?: QiviConfig["params"];
  size?: number;
  personality?: QiviPersonality;
  theme?: QiviTheme;
  expression?: QiviExpression;
  state?: QiviState;
  className?: string;
  title?: string;
}

function rng(seed: number) {
  return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
}

/**
 * Tier C/D proxy: a static vector Qivi derived from the same canonical definition
 * (eye spacing, palette, expression table). Use for favicons, notifications, lists.
 */
export function QiviIcon({ size = 48, personality = "core", theme = "auto", expression = "neutral", state = "idle", className, title, character, presentation, expressionStrength, expressionDefinition, params }: Props) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const pal = paletteFor({ personality, theme, character });
  const face = composeTarget({ ...DEFAULT_CONFIG, personality, theme, state, expression, character, presentation, expressionStrength, expressionDefinition, params }, expression);
  const status = STATES[state].status;
  const statusMix = STATES[state].set?.statusMix ?? 0;
  const dots = useMemo(() => {
    const r = rng(7);
    const n = size < 28 ? 8 : size < 64 ? 36 : 90;
    return Array.from({ length: n }, () => {
      const a = r() * Math.PI * 2;
      const d = 30 + r() * 16;
      const left = Math.cos(a) < 0;
      return { x: 48 + Math.cos(a) * d * (left ? 1.15 : 1), y: 54 + Math.sin(a) * d * 0.92, r: 0.5 + r() * 1.3, o: 0.25 + r() * 0.5, warm: !left && Math.sin(a) < 0.3 };
    });
  }, [size]);

  const cx = 48 + face.faceX * 34;
  const cy = 54 - face.faceY * 34;
  const dx = 0.34 * 34 * face.spacing * (size < 32 ? 1.12 : 1);
  const R = 0.19 * 34 * (size < 32 ? 1.3 : 1);
  const eye = (x: number, open: number, arc: number, scale: number) => {
    const r = R * scale;
    if (face.xMix > 0.5) {
      const l = r * 0.7;
      return <path d={`M${x - l} ${cy - l}L${x + l} ${cy + l}M${x - l} ${cy + l}L${x + l} ${cy - l}`} stroke="#fff" strokeWidth={r * 0.36} strokeLinecap="round" />;
    }
    if (open < 0.3) {
      const k = arc * r * 0.9;
      return <path d={`M${x - r} ${cy + k * 0.3}Q${x} ${cy - k * 1.4} ${x + r} ${cy + k * 0.3}`} fill="none" stroke={arc > 0 ? "#fffaf4" : "#0a1028"} strokeWidth={r * 0.32} strokeLinecap="round" />;
    }
    return (
      <g>
        <circle cx={x} cy={cy} r={r} fill="#fffcf7" />
        <circle cx={x + r * 0.17 + face.lookX * r * 0.25} cy={cy - face.lookY * r * 0.25} r={r * 0.8 * face.pupil} fill="#090f29" />
        {size >= 28 && <circle cx={x + r * 0.45} cy={cy - r * 0.32} r={r * 0.14} fill="#fff" />}
      </g>
    );
  };

  return (
    <svg className={className} width={size} height={size} viewBox="0 0 100 100" role={title ? "img" : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      <defs>
        <radialGradient id={`b${id}`} cx="0.44" cy="0.46" r="0.6">
          <stop offset="0" stopColor={pal.deep} />
          <stop offset="0.55" stopColor={pal.mid} />
          <stop offset="1" stopColor={pal.pale} stopOpacity="0.2" />
        </radialGradient>
        <radialGradient id={`w${id}`} cx="0.85" cy="0.3" r="0.55">
          <stop offset="0" stopColor={pal.warm} stopOpacity="0.95" />
          <stop offset="1" stopColor={pal.warm} stopOpacity="0" />
        </radialGradient>
        <filter id={`f${id}`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation={size < 32 ? 1.2 : 2.2} />
        </filter>
      </defs>
      <ellipse cx="48" cy="90" rx="30" ry="3.5" fill={pal.deep} opacity="0.12" />
      <g filter={`url(#f${id})`}>
        <path d="M14 58C14 32 30 20 49 20C69 20 84 32 84 56C84 76 70 88 49 88C28 88 14 78 14 58Z" fill={`url(#b${id})`} />
        <path d="M14 58C14 32 30 20 49 20C69 20 84 32 84 56C84 76 70 88 49 88C28 88 14 78 14 58Z" fill={`url(#w${id})`} />
        {status && <path d="M14 58C14 32 30 20 49 20C69 20 84 32 84 56C84 76 70 88 49 88C28 88 14 78 14 58Z" fill={status} opacity={statusMix * 0.7} />}
      </g>
      {dots.map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y} r={d.r} fill={d.warm ? pal.warm : pal.mid} opacity={d.o} />
      ))}
      {eye(cx - dx, face.openL, face.arcL, face.scaleL)}
      {eye(cx + dx, face.openR, face.arcR, face.scaleR)}
      <circle cx="86" cy="18" r={size < 28 ? 6 : 5} fill={status ?? pal.accent} />
    </svg>
  );
}
