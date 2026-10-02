import type { Palette, QiviConfig, QiviExpression, QiviImpulse, QiviPersonality, QiviShape, QiviState, QiviThemeName } from "./types";

/**
 * Canonical Qivi definition. Every rendered Qivi (hero, avatar, icon) derives from these numbers.
 * All values are continuous, so any change of personality/state/expression is a smooth blend.
 */
export const BASE = {
  // body / silhouette
  width: 1.06,
  height: 0.98,
  lean: 0,
  stretch: 0,
  breath: 0.018,
  breathPeriod: 4.8,
  density: 1,
  opacity: 1,
  pointSize: 3.4,
  // particle physics
  noise: 1,
  loose: 1,
  noiseSpeed: 0.35,
  freeSpread: 1,
  freeSpeed: 1,
  chaos: 0,
  orbit: 0,
  orbitSpeed: 0.9,
  stream: 0,
  streamSpeed: 0.6,
  streamDir: 1,
  grid: 0,
  dissolve: 0,
  glitch: 0,
  attend: 0,
  // color
  warm: 1,
  statusMix: 0,
  // face (eye units are relative to eye radius)
  openL: 1,
  openR: 1,
  arcL: 0,
  arcR: 0,
  lidL: 1.3,
  lidR: 1.3,
  lidTilt: 0,
  xMix: 0,
  sparkle: 0,
  pupil: 1,
  scaleL: 1,
  scaleR: 1,
  mouth: 0.55,
  mouthCurve: 1,
  ring: 0,
  lookX: 0,
  lookY: 0,
  faceX: 0.1,
  faceY: 0.08,
  spacing: 1,
  // signal glyphs
  gQuestion: 0,
  gExclaim: 0,
  gZzz: 0,
  // accent orb
  accentX: 0.9,
  accentY: 0.86,
  accentPulse: 0,
  accentScale: 1,
  accentOrbit: 0,
  accentAlpha: 0,
  // silhouette morph weights
  morphHeart: 0,
  morphShield: 0,
  morphHex: 0,
  morphStar: 0,
  // lighting
  light: 1,
  shiver: 0,
  // thinking: inner swirl, synapse sparks, ponder sway
  think: 0,
};

export type ParamKey = keyof typeof BASE;
export type Params = Record<ParamKey, number>;
type Partial2 = Partial<Params>;

const FACE_KEYS = new Set<ParamKey>([
  "openL", "openR", "arcL", "arcR", "lidL", "lidR", "lidTilt", "xMix", "sparkle", "pupil",
  "scaleL", "scaleR", "mouth", "mouthCurve", "ring", "lookX", "lookY", "faceX", "faceY", "spacing",
]);
const GLYPH_KEYS = new Set<ParamKey>(["gQuestion", "gExclaim", "gZzz"]);

/** Smoothing time constants (seconds). Derived from the timing guidance in the design doc. */
export function tauFor(key: ParamKey): number {
  if (FACE_KEYS.has(key)) return 0.09;
  if (GLYPH_KEYS.has(key)) return 0.18;
  switch (key) {
    case "dissolve":
      return 0.45;
    case "stream":
    case "orbit":
    case "grid":
      return 0.38;
    case "streamDir":
      return 0.3;
    case "statusMix":
    case "warm":
      return 0.35;
    case "glitch":
      return 0.12;
    case "morphHeart":
    case "morphShield":
    case "morphHex":
    case "morphStar":
      return 0.42;
    case "accentAlpha":
      return 0.3;
    case "breathPeriod":
      return 1.2;
    case "think":
      return 0.5;
    default:
      return 0.25;
  }
}

/** Keys driven by an underdamped spring so the body overshoots and settles. */
export const SPRING_KEYS: ParamKey[] = ["width", "height", "lean", "stretch"];

export interface PersonalityDef {
  label: string;
  blurb: string;
  palette: QiviThemeName | Palette;
  params: Partial2;
  blink: [number, number];
  saccade: [number, number];
  gridAffinity: number;
  randomBurst?: number;
  probe?: number;
}

export const PALETTES: Record<QiviThemeName, Palette> = {
  // every theme is dual tone: a cool body family (deep/mid/pale) + a contrasting second hue (warm/hi)
  default: { deep: "#16245e", mid: "#2d5fd0", pale: "#a9c4ef", warm: "#ff5a36", hi: "#ffb38a", accent: "#f2453a" },
  midnight: { deep: "#0a1236", mid: "#2a3fb8", pale: "#8a9ae6", warm: "#19c6d8", hi: "#a6f2ff", accent: "#3be0f0" },
  arctic: { deep: "#0f4c7a", mid: "#2f9ad6", pale: "#c4e8f6", warm: "#36d6a0", hi: "#bdf7e0", accent: "#22d39a" },
  sunset: { deep: "#3a1f5c", mid: "#7b3f9a", pale: "#d8b0e8", warm: "#ff7a3d", hi: "#ffc58a", accent: "#ff5a36" },
  mint: { deep: "#0b4a4a", mid: "#14a38b", pale: "#a6ead6", warm: "#ffb84d", hi: "#ffe2a6", accent: "#ff9a3d" },
  amber: { deep: "#5a1f0a", mid: "#e07a1c", pale: "#ffd09a", warm: "#7d5cff", hi: "#cbbcff", accent: "#7d5cff" },
  lavender: { deep: "#3a2a8a", mid: "#7a5ae0", pale: "#d6c8ff", warm: "#ff8fb8", hi: "#ffd3e4", accent: "#ff6fa5" },
};

export const PERSONALITIES: Record<QiviPersonality, PersonalityDef> = {
  core: {
    label: "Core",
    blurb: "Balanced & friendly",
    palette: "default",
    params: {},
    blink: [2.6, 6],
    saccade: [1.2, 3.2],
    gridAffinity: 1,
  },
  scout: {
    label: "Scout",
    blurb: "Curious & energetic",
    palette: { deep: "#12406b", mid: "#2a8fb5", pale: "#a8dbe8", warm: "#ff7a4a", hi: "#ffc2a0", accent: "#ff5a36" },
    params: { lean: 0.07, freeSpread: 1.35, freeSpeed: 1.8, noiseSpeed: 0.5, pupil: 0.88, lookX: 0.25, breathPeriod: 3.6 },
    blink: [2, 4.5],
    saccade: [0.5, 1.4],
    gridAffinity: 0.8,
    probe: 6,
  },
  analyst: {
    label: "Analyst",
    blurb: "Focused & precise",
    palette: { deep: "#23508f", mid: "#5a9be0", pale: "#d2e5f8", warm: "#f39a7a", hi: "#ffd4be", accent: "#f2553a" },
    params: { noise: 0.6, freeSpread: 0.6, density: 1.15, ring: 1, lidL: 0.85, lidR: 0.85, morphHex: 0.12 },
    blink: [3.5, 7],
    saccade: [1.8, 4],
    gridAffinity: 1.4,
  },
  guardian: {
    label: "Guardian",
    blurb: "Protective & serious",
    palette: { deep: "#4a0f24", mid: "#a8203a", pale: "#f2a8ae", warm: "#ffb23d", hi: "#ffe3a3", accent: "#ffb23d" },
    params: { width: 1.14, density: 1.3, freeSpread: 0.7, noise: 0.7, lidL: 0.7, lidR: 0.7, lidTilt: 0.2, mouth: 0.15, morphShield: 0.3 },
    blink: [3, 6.5],
    saccade: [2, 4.5],
    gridAffinity: 1,
  },
  sage: {
    label: "Sage",
    blurb: "Calm & thoughtful",
    palette: { deep: "#2f3c80", mid: "#7f93d6", pale: "#e1e6f7", warm: "#f5906e", hi: "#ffd6c2", accent: "#f26a4a" },
    params: { noiseSpeed: 0.18, breathPeriod: 6.5, freeSpread: 1.25, freeSpeed: 0.5, density: 0.85, lidL: 0.42, lidR: 0.42, lidTilt: -0.15, mouth: 0.7 },
    blink: [4, 8],
    saccade: [3, 6],
    gridAffinity: 0.6,
  },
  chaos: {
    label: "Chaos",
    blurb: "Creative & unpredictable",
    palette: { deep: "#34156e", mid: "#8a3fe0", pale: "#dcbcff", warm: "#2fe0c8", hi: "#b8fff2", accent: "#ff4fb8" },
    params: { noise: 1.6, loose: 1.5, chaos: 1, freeSpread: 1.5, freeSpeed: 2, scaleR: 1.1, noiseSpeed: 0.55, morphStar: 0.12 },
    blink: [1.6, 4],
    saccade: [0.4, 1.2],
    gridAffinity: 0.5,
    randomBurst: 4.5,
  },
};

export interface ExpressionDef {
  label: string;
  face: Partial2;
  body?: Partial2;
  glyph?: Partial2;
  impulse?: QiviImpulse | QiviImpulse[];
}

export const EXPRESSIONS: Record<QiviExpression, ExpressionDef> = {
  neutral: { label: "Default", face: {} },
  happy: {
    label: "Happy",
    face: { openL: 0, openR: 0, arcL: 1, arcR: 1, mouth: 0.85 },
    body: { width: 0.04, height: 0.02, breath: 0.01 },
    impulse: "bounce",
  },
  love: {
    label: "Love",
    face: { openL: 0, openR: 0, arcL: 1, arcR: 1, mouth: 1 },
    body: { width: 0.03, breath: 0.015, morphHeart: 0.95 },
    impulse: ["bounce", "sweep"],
  },
  excited: {
    label: "Excited",
    face: { openL: 1.1, openR: 1.1, scaleL: 1.12, scaleR: 1.12, sparkle: 1, mouth: 0.75 },
    body: { height: 0.06, freeSpread: 0.4, noise: 0.3, morphStar: 0.55 },
    glyph: { gExclaim: 0.6 },
    impulse: ["burst", "sweep"],
  },
  curious: {
    label: "Curious",
    face: { scaleL: 0.9, scaleR: 1.1, lookX: 0.55, lookY: 0.12, lidL: 0.75 },
    body: { lean: 0.08, accentX: 0.18, accentAlpha: 1 },
  },
  focused: {
    label: "Focused",
    face: { lidL: 0.38, lidR: 0.38, lidTilt: 0.1, mouth: 0 },
    body: { freeSpread: -0.6, noise: -0.4, density: 0.25, width: -0.02 },
  },
  confused: {
    label: "Confused",
    face: { scaleL: 0.84, scaleR: 1.14, lidL: 0.5, lookX: -0.2, lookY: 0.3, mouth: 0.25, mouthCurve: -0.6 },
    body: { lean: -0.07, chaos: 0.45 },
    glyph: { gQuestion: 1 },
  },
  thinking: {
    label: "Thinking",
    face: { lookX: 0.45, lookY: 0.7, lidL: 0.62, lidR: 0.62, mouth: 0.2 },
    body: { stretch: -0.03, loose: 0.4 },
  },
  surprised: {
    label: "Surprised",
    face: { openL: 1.15, openR: 1.15, scaleL: 1.18, scaleR: 1.18, pupil: 0.72, mouth: 0 },
    glyph: { gExclaim: 1 },
    impulse: "surprise",
  },
  sleepy: {
    label: "Sleepy",
    face: { openL: 0, openR: 0, arcL: -0.9, arcR: -0.9, mouth: 0.2, lookY: -0.3 },
    body: { height: -0.06, width: 0.03, noiseSpeed: -0.25, breath: 0.012, breathPeriod: 2.2, freeSpread: -0.3 },
    glyph: { gZzz: 1 },
  },
  playful: {
    label: "Playful",
    face: { openR: 0, arcR: 0.85, scaleL: 1.08, lookX: 0.3, mouth: 0.95 },
    body: { lean: 0.06 },
    impulse: "flick",
  },
  concern: {
    label: "Concern",
    face: { lidL: 0.72, lidR: 0.72, lidTilt: -0.28, mouth: 0.15, mouthCurve: -0.6 },
    body: { density: 0.3, freeSpread: -0.25 },
  },
};

export interface StateDef {
  label: string;
  add?: Partial2;
  set?: Partial2;
  face?: Partial2;
  glyph?: Partial2;
  impulse?: QiviImpulse | QiviImpulse[];
  status?: string;
  /** Expression the agent should show when it is in this state and no explicit expression is chosen. */
  hint: QiviExpression;
  /** Plain-language description used for accessible status text. */
  text: string;
}

export const STATES: Record<QiviState, StateDef> = {
  idle: { label: "Idle", hint: "neutral", text: "Ready" },
  listening: {
    label: "Listening",
    add: { noise: -0.2 },
    set: { attend: 0.7, accentAlpha: 1 },
    face: { lookY: -0.1 },
    hint: "curious",
    text: "Listening",
  },
  thinking: {
    label: "Thinking",
    add: { loose: 0.5, noise: 0.15 },
    set: { orbit: 0.38, orbitSpeed: 0.55, accentOrbit: 1, accentAlpha: 1, think: 1 },
    hint: "thinking",
    text: "Thinking",
  },
  searching: {
    label: "Searching",
    add: { loose: 0.6 },
    set: { stream: 0.6, streamDir: 1, orbit: 0.32, streamSpeed: 0.7, accentAlpha: 1, accentOrbit: 1, think: 0.45 },
    hint: "focused",
    text: "Searching your environment",
  },
  analyzing: {
    label: "Analyzing",
    add: { density: 0.2 },
    set: { grid: 0.22, orbit: 0.3, stream: 0.4, accentAlpha: 1, morphHex: 0.85, think: 0.35 },
    hint: "focused",
    text: "Analyzing findings",
  },
  found: {
    label: "Found it!",
    set: { stream: 0.55, streamDir: 0, streamSpeed: 1.1, accentAlpha: 1, accentPulse: 1 },
    impulse: ["anticipate", "sweep"],
    hint: "surprised",
    text: "Found results",
  },
  answering: {
    label: "Answering",
    set: { stream: 0.32, streamDir: 1, streamSpeed: 0.9, accentAlpha: 0.7 },
    hint: "neutral",
    text: "Answering",
  },
  talking: {
    label: "Talking",
    add: { noise: -0.1 },
    set: { accentAlpha: 0.55 },
    hint: "neutral",
    text: "Speaking",
  },
  success: {
    label: "Success",
    add: { width: 0.04, freeSpread: -0.3 },
    set: { statusMix: 0.32 },
    impulse: ["bounce", "sweep"],
    status: "#22b39a",
    hint: "happy",
    text: "Done",
  },
  warning: {
    label: "Warning",
    add: { density: 0.35, freeSpread: -0.3 },
    set: { statusMix: 0.72, accentAlpha: 1, accentPulse: 1, morphShield: 0.9 },
    glyph: { gExclaim: 1 },
    impulse: "sweep",
    status: "#e8473a",
    hint: "concern",
    text: "Attention needed",
  },
  error: {
    label: "Error",
    set: { glitch: 1, statusMix: 0.75, accentAlpha: 1 },
    face: { xMix: 1, mouth: 0 },
    impulse: ["glitch", "shiver"],
    status: "#b8233a",
    hint: "concern",
    text: "Something went wrong",
  },
  dissolving: {
    label: "Dissolving",
    set: { dissolve: 0.82 },
    face: { openL: 0, openR: 0, arcL: -0.5, arcR: -0.5 },
    hint: "sleepy",
    text: "Resting",
  },
};

export const ADDITIVE_BODY: ParamKey[] = ["width", "height", "lean", "stretch", "breath", "breathPeriod", "noise", "loose", "noiseSpeed", "freeSpread", "density", "chaos", "accentX", "accentY"];

export function paletteFor(cfg: Pick<QiviConfig, "theme" | "personality" | "character">): Palette {
  if (typeof cfg.theme === "object") return cfg.theme;
  if (cfg.theme !== "auto") return PALETTES[cfg.theme];
  const p = cfg.character?.theme && cfg.character.theme !== "auto" ? cfg.character.theme : PERSONALITIES[cfg.personality].palette;
  if (typeof p === "object") return p;
  return typeof p === "string" ? PALETTES[p] : p;
}

const MORPH_KEYS: Record<Exclude<QiviShape, "blob">, ParamKey> = { heart: "morphHeart", shield: "morphShield", hex: "morphHex", star: "morphStar" };

/** Which silhouette dominates a target vector (used to fire a light sweep when the shape changes). */
export function dominantShape(t: Params): QiviShape {
  let best: QiviShape = "blob";
  let max = 0.35;
  for (const [shape, key] of Object.entries(MORPH_KEYS) as [QiviShape, ParamKey][]) {
    if (t[key] > max) {
      max = t[key];
      best = shape;
    }
  }
  return best;
}

export const PRESENTATIONS = {
  neutral: {},
  masculine: { width: 1.12, height: 0.94, scaleL: 0.96, scaleR: 0.96, spacing: 1.08 },
  feminine: { width: 1.02, height: 1.04, scaleL: 1.06, scaleR: 1.06, spacing: 0.96 },
} satisfies Record<string, Partial<Params>>;

export function personalityFor(cfg: Pick<QiviConfig, "personality" | "character">): PersonalityDef {
  const base = PERSONALITIES[cfg.personality];
  return { ...base, ...cfg.character?.behavior, params: { ...base.params, ...cfg.character?.params } };
}

/** Compose personality -> expression -> state into one continuous target vector. */
export function composeTarget(cfg: QiviConfig, expression: QiviExpression): Params {
  const k = Math.max(0, Math.min(1, cfg.intensity));
  const pers = personalityFor(cfg);
  const expr = cfg.expressionDefinition ?? EXPRESSIONS[expression];
  const strength = Number.isFinite(cfg.expressionStrength) ? Math.max(0, Math.min(2, cfg.expressionStrength!)) : 1;
  const st = STATES[cfg.state];
  const t: Params = { ...BASE, ...PERSONALITIES[cfg.personality].params, ...PRESENTATIONS[cfg.presentation ?? cfg.character?.presentation ?? "neutral"], ...cfg.character?.params };
  const neutral = { ...t };

  for (const [key, v] of Object.entries(expr.body ?? {}) as [ParamKey, number][]) {
    t[key] = ADDITIVE_BODY.includes(key) ? t[key] + v * k * strength : t[key] + (v - t[key]) * strength;
  }
  for (const [key, v] of Object.entries({ ...expr.face, ...expr.glyph }) as [ParamKey, number][]) t[key] = neutral[key] + (v - neutral[key]) * strength;
  for (const [key, v] of Object.entries(st.add ?? {}) as [ParamKey, number][]) t[key] += v * k;
  for (const [key, v] of Object.entries(st.set ?? {}) as [ParamKey, number][]) {
    t[key] = key === "grid" ? Math.max(t[key], v * pers.gridAffinity) : v;
  }
  Object.assign(t, st.face, st.glyph);
  if (cfg.state === "error" || cfg.state === "warning") t.gQuestion = 0;
  t.noiseSpeed = Math.max(0.04, t.noiseSpeed);

  // user customization wins over behaviour
  if (cfg.shape !== "auto") {
    for (const key of Object.values(MORPH_KEYS)) t[key] = 0;
    if (cfg.shape !== "blob") t[MORPH_KEYS[cfg.shape]] = 1;
  }
  for (const key of Object.values(MORPH_KEYS)) t[key] *= k;
  if (cfg.customShape && cfg.customShape.length >= 3) {
    for (const key of Object.values(MORPH_KEYS)) t[key] = 0;
    t.morphHeart = 1;
  }
  for (const [key, value] of Object.entries(cfg.params ?? {}) as [ParamKey, number][]) {
    if (key in BASE && Number.isFinite(value)) t[key] = value;
  }
  t.noiseSpeed = Math.max(0.04, t.noiseSpeed);
  t.breathPeriod = Math.max(0.1, t.breathPeriod);
  if (cfg.accent !== "auto") t.accentAlpha = cfg.accent === "always" ? 1 : 0;
  if (!cfg.glyphs) t.gQuestion = t.gExclaim = t.gZzz = 0;
  if (!cfg.smile) t.mouth = 0;
  t.light = Math.max(0, Math.min(1, cfg.lighting));
  return t;
}
