import "./qivi.css";
export { QiviAvatar, type QiviAvatarHandle, type QiviAvatarProps } from "./QiviAvatar";
export { QiviIcon } from "./QiviIcon";
export { QiviVoice, type VoiceFrame } from "./voice";
export { EXPRESSIONS, PALETTES, PERSONALITIES, STATES, paletteFor } from "./presets";
export type { Palette, QiviExpression, QiviImpulse, QiviPersonality, QiviShape, QiviState, QiviTheme, QiviThemeName } from "./types";

export { QiviPerformance, type QiviPerformanceFrame, type QiviPerformanceCue, type QiviPerformanceTarget } from "./performance";
export { PRESENTATIONS, BASE, composeTarget, type Params, type ParamKey, type ExpressionDef, type PersonalityDef } from "./presets";
export type { QiviCharacter, QiviPresentation } from "./types";
export { createRadialShape } from "./shapes";
