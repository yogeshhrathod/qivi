import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { QiviEngine } from "./engine";
import { STATES } from "./presets";
import { QiviIcon } from "./QiviIcon";
import type { QiviConfig, QiviExpression, QiviImpulse, QiviPersonality, QiviShape, QiviState, QiviTheme } from "./types";
import { DEFAULT_CONFIG } from "./types";
import type { QiviPerformanceFrame } from "./performance";
import type { QiviVoice } from "./voice";

export interface QiviAvatarHandle {
  /** Fire a one-off reaction: "bounce", "burst", "sweep", "shiver", "ripple", ... */
  impulse(kind: QiviImpulse | QiviImpulse[]): void;
  perform(frame: QiviPerformanceFrame): void;
  resetPerformance(): void;
}

export interface QiviAvatarProps {
  character?: QiviConfig["character"];
  presentation?: QiviConfig["presentation"];
  expressionStrength?: number;
  expressionDefinition?: QiviConfig["expressionDefinition"];
  params?: QiviConfig["params"];
  customShape?: QiviConfig["customShape"];
  transitionSpeed?: number;
  autoEmote?: boolean;
  /** Box size. Numbers are px; strings are any CSS length (e.g. "100%"). Default 160. */
  size?: number | string;
  personality?: QiviPersonality;
  state?: QiviState;
  expression?: QiviExpression;
  /** Palette name, "auto" (follow personality), or a full custom palette object. */
  theme?: QiviTheme;
  /** Background the avatar sits on. Dark switches to luminous additive rendering. */
  appearance?: "light" | "dark";
  /** Force a silhouette, or "auto" to let state/expression morph it. */
  shape?: "auto" | QiviShape;
  /** Accent orb visibility. "auto" shows it only in signalling states. */
  accent?: "auto" | "always" | "never";
  glyphs?: boolean;
  smile?: boolean;
  /** 0..1 strength of key/rim/specular lighting. */
  lighting?: number;
  /** 0..1 how strongly expressions/states deform the body. */
  intensity?: number;
  /** Rendering tier. "auto" picks by size; "static" renders the vector proxy. */
  quality?: "auto" | "high" | "medium" | "low" | "static";
  /** Explicit particle count (overrides quality). */
  particles?: number;
  interactive?: boolean;
  /** true/false, or "auto" to follow prefers-reduced-motion. */
  reducedMotion?: boolean | "auto";
  autoSleep?: boolean;
  /**
   * "contained": canvas around the box (with bleed for the particle haze).
   * "viewport": one fixed full-screen layer, so Qivi can fly to `anchor` and stream into the UI.
   */
  layer?: "contained" | "viewport";
  /** Contained only: extra canvas around the box, as a fraction of its size. Default 0.6. */
  bleed?: number;
  /** Element Qivi should live in instead of its own box (viewport layer). */
  anchor?: HTMLElement | null;
  /**
   * Voice that drives the "listening" (user speaking) and "talking" (Qivi speaking) states:
   * a QiviVoice (microphone, <audio>, speechSynthesis, manual pulses), or "simulate" for previews.
   */
  voice?: QiviVoice | "simulate" | null;
  /** Element particles stream to while searching/answering. */
  streamTarget?: HTMLElement | null;
  /** Accessible label. Defaults to "Qivi, <state>". */
  label?: string;
  className?: string;
  style?: CSSProperties;
  onPoke?: () => void;
}

const QUALITY_BUDGET = { high: 38000, medium: 16000, low: 6000 } as const;

function usePrefersReducedMotion() {
  const [v, setV] = useState(() => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => setV(m.matches);
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
  return v;
}

/** Customizable, living Qivi. Smoothly blends between any props you change. */
export const QiviAvatar = forwardRef<QiviAvatarHandle, QiviAvatarProps>(function QiviAvatar(props, ref) {
  const {
    size = 160,
    personality = DEFAULT_CONFIG.personality,
    state = DEFAULT_CONFIG.state,
    expression,
    theme = DEFAULT_CONFIG.theme,
    appearance = "light",
    shape = DEFAULT_CONFIG.shape,
    accent = DEFAULT_CONFIG.accent,
    glyphs = DEFAULT_CONFIG.glyphs,
    smile = DEFAULT_CONFIG.smile,
    lighting = DEFAULT_CONFIG.lighting,
    intensity = DEFAULT_CONFIG.intensity,
    quality = "auto",
    particles,
    interactive = DEFAULT_CONFIG.interactive,
    reducedMotion = "auto",
    autoSleep = DEFAULT_CONFIG.autoSleep,
    layer = "contained",
    bleed = 0.6,
    anchor,
    streamTarget,
    voice,
    label,
    className,
    style,
    onPoke,
  } = props;
  const { character, presentation, expressionStrength, expressionDefinition, params, customShape, transitionSpeed, autoEmote } = props;
  const [performanceFrame, setPerformanceFrame] = useState<QiviPerformanceFrame>({});

  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<QiviEngine | null>(null);
  const pokeRef = useRef(onPoke);
  pokeRef.current = onPoke;
  const [failed, setFailed] = useState(false);
  const prefersReduced = usePrefersReducedMotion();

  const px = typeof size === "number" ? size : null;
  const isStatic = quality === "static" || (px !== null && px < 48) || failed;
  const budget =
    particles ??
    (quality === "high" || quality === "medium" || quality === "low"
      ? QUALITY_BUDGET[quality]
      : px === null
        ? QUALITY_BUDGET.high
        : Math.round(Math.min(38000, Math.max(4000, px * px * 0.45))));

  const config = useMemo<QiviConfig>(
    () => ({
      personality: props.personality ?? character?.personality ?? personality,
      character, presentation, expressionStrength, expressionDefinition, params, customShape, transitionSpeed, autoEmote,
      state,
      expression: expression ?? STATES[state].hint,
      theme,
      shape: props.shape ?? character?.shape ?? shape,
      accent,
      glyphs,
      smile,
      lighting,
      intensity,
      particleBudget: budget,
      reducedMotion: reducedMotion === "auto" ? prefersReduced : reducedMotion,
      interactive,
      dark: appearance === "dark",
      autoSleep,
    }),
    [props.personality, props.shape, character, presentation, expressionStrength, expressionDefinition, params, customShape, transitionSpeed, autoEmote, personality, state, expression, theme, shape, accent, glyphs, smile, lighting, intensity, budget, reducedMotion, prefersReduced, interactive, appearance, autoSleep],
  );

  useEffect(() => {
    if (isStatic || !canvasRef.current) return;
    let engine: QiviEngine;
    try {
      engine = new QiviEngine(canvasRef.current, { onPoke: () => pokeRef.current?.() });
    } catch (e) {
      console.warn("Qivi: WebGL unavailable, using static avatar", e);
      setFailed(true);
      return;
    }
    engineRef.current = engine;
    if (import.meta.env?.DEV) (window as unknown as { __qivi?: QiviEngine }).__qivi ??= engine;
    return () => {
      engine.dispose();
      engineRef.current = null;
      if (import.meta.env?.DEV && (window as unknown as { __qivi?: QiviEngine }).__qivi === engine) delete (window as unknown as { __qivi?: QiviEngine }).__qivi;
    };
  }, [isStatic, layer]);

  const liveConfig = useMemo(() => {
    const merged = { ...config, ...performanceFrame };
    if (performanceFrame.character) {
      if (performanceFrame.personality === undefined) merged.personality = performanceFrame.character.personality ?? config.personality;
      if (performanceFrame.shape === undefined) merged.shape = performanceFrame.character.shape ?? config.shape;
    }
    if (performanceFrame.state !== undefined && performanceFrame.expression === undefined) merged.expression = STATES[performanceFrame.state].hint;
    return merged;
  }, [config, performanceFrame]);
  useEffect(() => engineRef.current?.setConfig(liveConfig), [liveConfig, isStatic, layer]);
  useEffect(() => engineRef.current?.setAnchor(anchor ?? boxRef.current), [anchor, isStatic, layer]);
  useEffect(() => engineRef.current?.setStreamTarget(streamTarget ?? null), [streamTarget, isStatic, layer]);
  useEffect(() => engineRef.current?.setVoice(voice ?? null), [voice, isStatic, layer]);

  // never animate avatars that are offscreen
  useEffect(() => {
    if (isStatic || layer === "viewport" || !boxRef.current) return;
    const io = new IntersectionObserver(([e]) => engineRef.current?.setActive(e.isIntersecting), { rootMargin: "120px" });
    io.observe(boxRef.current);
    return () => io.disconnect();
  }, [isStatic, layer]);

  useImperativeHandle(ref, () => ({
    impulse: (k) => engineRef.current?.impulse(k),
    perform: (frame) => setPerformanceFrame({ ...frame }),
    resetPerformance: () => { engineRef.current?.resetReactions(); setPerformanceFrame({}); },
  }), []);

  const aria = label ?? `${liveConfig.character?.name ?? "Qivi"}, ${STATES[liveConfig.state].text.toLowerCase()}`;
  const boxStyle: CSSProperties = { width: size, height: size, ...style };

  if (isStatic) {
    return (
      <div className={`qivi-avatar is-static ${className ?? ""}`} style={boxStyle} role="img" aria-label={aria}>
        <QiviIcon size={px ?? 48} personality={liveConfig.personality} theme={liveConfig.theme} expression={liveConfig.expression} state={liveConfig.state} character={liveConfig.character} presentation={liveConfig.presentation} expressionStrength={liveConfig.expressionStrength} expressionDefinition={liveConfig.expressionDefinition} params={liveConfig.params} />
      </div>
    );
  }

  const canvas =
    layer === "viewport" ? (
      createPortal(<canvas ref={canvasRef} className="qivi-stage" aria-hidden="true" />, document.body)
    ) : (
      <canvas ref={canvasRef} className="qivi-avatar-canvas" aria-hidden="true" style={{ inset: `-${bleed * 100}%`, width: `${100 + bleed * 200}%`, height: `${100 + bleed * 200}%` }} />
    );

  return (
    <div ref={boxRef} className={`qivi-avatar ${className ?? ""}`} style={boxStyle} role="img" aria-label={aria}>
      {canvas}
    </div>
  );
});
