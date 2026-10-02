import type { Params, PersonalityDef, ExpressionDef } from "./presets";
import type { QiviShape } from "./shapes";

export type { QiviShape };

export type QiviPersonality = "core" | "scout" | "analyst" | "guardian" | "sage" | "chaos" | "spark" | "diplomat";

export type QiviState =
  | "idle"
  | "listening"
  | "thinking"
  | "searching"
  | "analyzing"
  | "found"
  | "answering"
  | "talking"
  | "success"
  | "warning"
  | "error"
  | "dissolving";

export type QiviExpression =
  | "neutral"
  | "happy"
  | "love"
  | "excited"
  | "curious"
  | "focused"
  | "confused"
  | "thinking"
  | "surprised"
  | "sleepy"
  | "playful"
  | "concern";

export type QiviThemeName = "default" | "midnight" | "arctic" | "sunset" | "mint" | "amber" | "lavender";
/** "auto" follows the personality palette; a Palette object gives full custom colors. */
export type QiviTheme = "auto" | QiviThemeName | Palette;

export interface Palette {
  deep: string;
  mid: string;
  pale: string;
  warm: string;
  hi: string;
  accent: string;
}

/** Custom identity; presentation is visual only and never determines personality or voice. */
export interface QiviCharacter {
  name?: string;
  personality?: QiviPersonality;
  theme?: QiviTheme;
  shape?: "auto" | QiviShape;
  presentation?: QiviPresentation;
  params?: Partial<Params>;
  behavior?: Partial<Pick<PersonalityDef, "blink" | "saccade" | "gridAffinity" | "randomBurst" | "probe">>;
}
export type QiviPresentation = "neutral" | "masculine" | "feminine";

export interface QiviConfig {
  character?: QiviCharacter;
  presentation?: QiviPresentation;
  /** 0..2; 1 is canonical, 2 exaggerates the expression. */
  expressionStrength?: number;
  /** Custom definition replacing the selected expression preset. */
  expressionDefinition?: ExpressionDef;
  /** Absolute target overrides; explicit visibility controls still win. */
  params?: Partial<Params>;
  /** Positive radial samples around the origin, counter-clockwise starting at -PI. */
  customShape?: readonly number[];
  /** Positive multiplier for transition time constants (smaller is faster). */
  transitionSpeed?: number;
  /** Disable automatic expression/state/shape gestures when supplying your own timeline. */
  autoEmote?: boolean;
  personality: QiviPersonality;
  state: QiviState;
  expression: QiviExpression;
  theme: QiviTheme;
  /** "auto" lets state/expression/personality pick a silhouette; anything else forces it. */
  shape: "auto" | QiviShape;
  /** Accent orb: shown only in signalling states ("auto"), always, or never. */
  accent: "auto" | "always" | "never";
  glyphs: boolean;
  smile: boolean;
  /** 0..1 strength of key/rim/specular lighting. */
  lighting: number;
  intensity: number;
  particleBudget: number;
  reducedMotion: boolean;
  interactive: boolean;
  dark: boolean;
  autoSleep: boolean;
}

export const DEFAULT_CONFIG: QiviConfig = {
  personality: "core",
  state: "idle",
  expression: "neutral",
  theme: "auto",
  shape: "auto",
  accent: "auto",
  glyphs: true,
  smile: true,
  lighting: 1,
  intensity: 1,
  particleBudget: 38000,
  reducedMotion: false,
  interactive: true,
  dark: false,
  autoSleep: true,
};

export type QiviImpulse = "bounce" | "burst" | "surprise" | "flick" | "anticipate" | "glitch" | "ripple" | "sweep" | "shiver";
