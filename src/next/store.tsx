import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  BASE, CHARACTERS, createRadialShape,
  type ExpressionDef, type QiviAvatarProps, type QiviCharacter, type QiviImpulse, type QiviPersonality,
  type QiviPresentation, type QiviShape, type QiviThemeName,
} from '@yogeshhrathod/qivi';

export type CharacterKey = keyof typeof CHARACTERS;
export const CHARACTER_KEYS = Object.keys(CHARACTERS) as CharacterKey[];
export type ThemeMode = 'system' | 'light' | 'dark';
export type ShapeChoice = 'auto' | QiviShape | 'flower' | 'custom';

/** Short, human descriptions of the built-in characters. */
export const CHARACTER_INFO: Record<CharacterKey, { tagline: string; expression: 'curious' | 'excited' | 'happy' | 'playful' | 'neutral' | 'focused'; traits: string[] }> = {
  qivi: { tagline: 'Curious explorer', expression: 'curious', traits: ['Balanced', 'Friendly', 'Blob'] },
  female: { tagline: 'Lively and bright', expression: 'excited', traits: ['Spark', 'Feminine', 'Lavender'] },
  male: { tagline: 'Calm and composed', expression: 'happy', traits: ['Diplomat', 'Masculine', 'Arctic'] },
  ember: { tagline: 'Playful star', expression: 'playful', traits: ['Chaos', 'Star', 'Amber'] },
  sage: { tagline: 'Slow, mindful breathing', expression: 'neutral', traits: ['Sage', 'Calm', 'Mint'] },
  atlas: { tagline: 'Steady protector', expression: 'focused', traits: ['Guardian', 'Shield', 'Midnight'] },
};

/** Everything a visitor can customize; it drives every primary avatar in the showcase. */
export interface Look {
  character: CharacterKey;
  name: string;
  personality: QiviPersonality;
  presentation: QiviPresentation;
  theme: 'auto' | QiviThemeName;
  shape: ShapeChoice;
  lobes: number;
  depth: number;
  spacing: number;
  width: number;
  blink: number;
  strength: number;
  transition: number;
  autoEmote: boolean;
  customExpression: boolean;
  accent: 'auto' | 'always' | 'never';
  glyphs: boolean;
  smile: boolean;
  lighting: number;
  intensity: number;
  particles: number;
  reducedMotion: boolean | 'auto';
  autoSleep: boolean;
}

export function lookFor(key: CharacterKey, previous?: Look): Look {
  const c: QiviCharacter = CHARACTERS[key];
  return {
    // rendering preferences survive a character change
    accent: 'auto', glyphs: true, smile: true, lighting: 1, intensity: 1, particles: 38000, reducedMotion: 'auto', autoSleep: true,
    ...(previous && { accent: previous.accent, glyphs: previous.glyphs, smile: previous.smile, lighting: previous.lighting, intensity: previous.intensity, particles: previous.particles, reducedMotion: previous.reducedMotion, autoSleep: previous.autoSleep }),
    character: key, name: c.name ?? 'Qivi', personality: c.personality ?? 'core', presentation: c.presentation ?? 'neutral',
    theme: (c.theme as QiviThemeName | undefined) ?? 'auto', shape: c.shape ?? 'auto', lobes: 6, depth: .2,
    spacing: c.params?.spacing ?? BASE.spacing, width: c.params?.width ?? BASE.width, blink: c.behavior?.blink?.[0] ?? 3,
    strength: 1, transition: 1, autoEmote: true, customExpression: false,
  };
}

export const DRAMATIC_WARNING: ExpressionDef = {
  label: 'Dramatic warning', face: { lidL: .6, lidR: .6, lidTilt: -.35, mouthCurve: -.75, mouth: .12 },
  body: { lean: -.05, density: .4 }, glyph: { gExclaim: .9 }, impulse: 'shiver' as QiviImpulse,
};

/** Translate a Look into QiviAvatar props. Everything else (state, voice, size) is per-scene. */
export function avatarProps(look: Look, appearance: 'light' | 'dark'): QiviAvatarProps {
  const base = CHARACTERS[look.character] as QiviCharacter;
  const custom = look.shape === 'flower' || look.shape === 'custom';
  const shape = custom ? 'auto' : look.shape as 'auto' | QiviShape;
  const character: QiviCharacter = {
    ...base, name: look.name, personality: look.personality, presentation: look.presentation, theme: look.theme,
    shape,
    params: { ...base.params, spacing: look.spacing, width: look.width },
    behavior: { ...base.behavior, blink: [look.blink, look.blink + 1.5] },
  };
  return {
    character, personality: look.personality, theme: look.theme, shape,
    customShape: custom ? createRadialShape(a => 1 + (look.shape === 'flower' ? .2 : look.depth) * Math.cos((look.shape === 'flower' ? 6 : look.lobes) * a)) : undefined,
    expressionStrength: look.strength, transitionSpeed: look.transition, autoEmote: look.autoEmote,
    expressionDefinition: look.customExpression ? DRAMATIC_WARNING : undefined,
    accent: look.accent, glyphs: look.glyphs, smile: look.smile, lighting: look.lighting, intensity: look.intensity,
    reducedMotion: look.reducedMotion, autoSleep: look.autoSleep, appearance,
  };
}

/** A copy-paste JSX snippet that reproduces the current look. */
export function lookToJsx(look: Look): string {
  const base = lookFor(look.character);
  const props: string[] = [`character={CHARACTERS.${look.character}}`];
  const add = (cond: boolean, text: string) => { if (cond) props.push(text); };
  add(look.personality !== base.personality, `personality="${look.personality}"`);
  add(look.theme !== base.theme, `theme="${look.theme}"`);
  add(look.shape !== base.shape && look.shape !== 'flower' && look.shape !== 'custom', `shape="${look.shape}"`);
  add(look.shape === 'flower', `customShape={createRadialShape(a => 1 + 0.2 * Math.cos(6 * a))}`);
  add(look.shape === 'custom', `customShape={createRadialShape(a => 1 + ${look.depth} * Math.cos(${look.lobes} * a))}`);
  add(look.strength !== 1, `expressionStrength={${look.strength}}`);
  add(look.transition !== 1, `transitionSpeed={${look.transition}}`);
  add(!look.autoEmote, `autoEmote={false}`);
  add(look.accent !== 'auto', `accent="${look.accent}"`);
  add(!look.glyphs, `glyphs={false}`);
  add(!look.smile, `smile={false}`);
  add(look.lighting !== 1, `lighting={${look.lighting}}`);
  add(look.intensity !== 1, `intensity={${look.intensity}}`);
  add(look.particles !== 38000, `particles={${look.particles}}`);
  add(look.reducedMotion !== 'auto', `reducedMotion={${look.reducedMotion}}`);
  add(!look.autoSleep, `autoSleep={false}`);
  const changedIdentity = look.name !== base.name || look.presentation !== base.presentation || look.spacing !== base.spacing || look.width !== base.width || look.blink !== base.blink;
  const imports = ['QiviAvatar', 'CHARACTERS', ...(look.shape === 'flower' || look.shape === 'custom' ? ['createRadialShape'] : [])];
  const character = changedIdentity
    ? `\nconst character = {\n  ...CHARACTERS.${look.character},\n  name: "${look.name}",\n  presentation: "${look.presentation}",\n  params: { ...CHARACTERS.${look.character}.params, spacing: ${look.spacing}, width: ${look.width} },\n  behavior: { ...CHARACTERS.${look.character}.behavior, blink: [${look.blink}, ${look.blink + 1.5}] },\n};\n`
    : '';
  if (changedIdentity) props[0] = 'character={character}';
  return `import { ${imports.join(', ')} } from "@yogeshhrathod/qivi";\nimport "@yogeshhrathod/qivi/styles.css";\n${character}\n<QiviAvatar\n  ${props.join('\n  ')}\n  state="idle"\n/>`;
}

interface Store {
  look: Look;
  setLook: (patch: Partial<Look>) => void;
  chooseCharacter: (key: CharacterKey) => void;
  resetLook: () => void;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  appearance: 'light' | 'dark';
  reduceMotion: boolean;
}

const StoreContext = createContext<Store | null>(null);
const LOOK_KEY = 'qivi-next-look';
const THEME_KEY = 'qivi-next-theme';

function readLook(): Look {
  try {
    const saved = JSON.parse(localStorage.getItem(LOOK_KEY) ?? 'null') as Partial<Look> | null;
    if (saved && saved.character && saved.character in CHARACTERS) return { ...lookFor(saved.character), ...saved };
  } catch { /* Storage is optional. */ }
  return lookFor('qivi');
}
function readTheme(): ThemeMode {
  try { const value = localStorage.getItem(THEME_KEY); if (value === 'light' || value === 'dark') return value; } catch { /* Storage is optional. */ }
  return 'system';
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [look, setLookState] = useState(readLook);
  const [themeMode, setThemeMode] = useState(readTheme);
  const [systemDark, setSystemDark] = useState(() => matchMedia('(prefers-color-scheme: dark)').matches);
  const [systemReduce, setSystemReduce] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const dark = matchMedia('(prefers-color-scheme: dark)'), reduce = matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => { setSystemDark(dark.matches); setSystemReduce(reduce.matches); };
    dark.addEventListener('change', update); reduce.addEventListener('change', update);
    return () => { dark.removeEventListener('change', update); reduce.removeEventListener('change', update); };
  }, []);
  const appearance = themeMode === 'dark' || (themeMode === 'system' && systemDark) ? 'dark' : 'light';
  const reduceMotion = look.reducedMotion === true || (look.reducedMotion === 'auto' && systemReduce);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('theme-dark', appearance === 'dark');
    root.classList.toggle('nx-reduce', reduceMotion);
    root.style.colorScheme = appearance;
    // Safari and Android tint the browser chrome from theme-color; follow the in-app theme, not only the system one.
    document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach(meta => { meta.content = appearance === 'dark' ? '#111a30' : '#f5f7fc'; });
    try { localStorage.setItem(THEME_KEY, themeMode); } catch { /* Storage is optional. */ }
  }, [appearance, themeMode, reduceMotion]);
  useEffect(() => { try { localStorage.setItem(LOOK_KEY, JSON.stringify(look)); } catch { /* Storage is optional. */ } }, [look]);

  const value = useMemo<Store>(() => ({
    look, themeMode, setThemeMode, appearance, reduceMotion,
    setLook: patch => setLookState(previous => ({ ...previous, ...patch })),
    chooseCharacter: key => setLookState(previous => lookFor(key, previous)),
    resetLook: () => setLookState(previous => lookFor(previous.character)),
  }), [look, themeMode, appearance, reduceMotion]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const store = useContext(StoreContext);
  if (!store) throw new Error('useStore must be used inside StoreProvider');
  return store;
}

/** Memoized avatar props for the current look. */
export function useLookProps() {
  const { look, appearance } = useStore();
  return useMemo(() => avatarProps(look, appearance), [look, appearance]);
}
