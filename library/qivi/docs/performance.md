# Custom characters and expressive performance

Qivi separates identity, activity, emotion, gestures, silhouette, and audio. You can use any TTS provider, recorded audio, browser speech, or a manual clock. The library does not infer semantic emotion from sound; the host supplies expression cues. It animates speaking energy from audio rather than providing phoneme-level lip sync.

## Character profiles

```tsx
import { QiviAvatar, type QiviCharacter } from '@yogeshhrathod/qivi';
import '@yogeshhrathod/qivi/styles.css';

const nova: QiviCharacter = {
  name: 'Nova',
  personality: 'guardian',
  presentation: 'feminine',
  theme: 'lavender',
  shape: 'shield',
  params: { spacing: 1.05, breath: 0.024, scaleL: 1.08, scaleR: 1.08 },
  behavior: { blink: [2, 4], saccade: [0.8, 2], gridAffinity: 0.6 },
};

export function Companion() {
  return <QiviAvatar character={nova} size={280} expressionStrength={1.5}
    reducedMotion="auto" autoSleep={false} />;
}
```

Profiles do not register global mutable presets. Keep profile objects stable outside render or memoize dynamic ones. Swapping `character` on the same component blends numeric targets and colors; do not change its React `key` when you want a continuous morph.

Personality bases: `core`, `scout`, `analyst`, `guardian`, `sage`, `chaos`, `spark`, `diplomat`. Each supplies particle/body parameters, blink and gaze intervals, and optional spontaneous behaviors. Override numeric targets through `character.params`; override behavior through `character.behavior`. `blink` and `saccade` are positive `[min, max]` intervals in seconds; `gridAffinity` is 0–1; `randomBurst` and `probe` are positive intervals, with 0 disabling them.

Presentation presets: `neutral`, `masculine`, `feminine`. These alter body and eye proportions only, independently of personality, palette and voice. They are editable visual starting points, not human models or gendered behaviors. For masculine/feminine voice variants choose the voice in your own speech adapter.

Precedence: base personality → presentation preset → character parameters → expression → activity state → absolute `params` overrides → visibility/lighting controls. Explicit `personality`, `presentation` and `shape` props override profile defaults. Explicit named/custom `theme` wins; `theme="auto"` follows `character.theme`, then the personality palette.

## Expression customization

Use any built-in expression: `neutral`, `happy`, `love`, `excited`, `curious`, `focused`, `confused`, `thinking`, `surprised`, `sleepy`, `playful`, `concern`.

| Prop | Meaning |
| --- | --- |
| `expressionStrength` | 0–2; default 1. Zero removes expression-specific changes, 1 uses the preset, above 1 exaggerates it. State behavior still applies. |
| `intensity` | Existing 0–1 body deformation control; distinct from facial expression strength. |
| `expressionDefinition` | Custom `ExpressionDef` replacing the selected preset; state and interaction behavior still apply. |
| `params` | Absolute numeric target overrides from exported `Params`; useful for fine face/body tuning. |
| `transitionSpeed` | Transition time multiplier clamped to 0.5–4; default 1, smaller means faster. Uses engine damping/springs, not a fixed-duration tween. |
| `autoEmote` | Default true; false suppresses automatic expression/state/shape impulses while retaining manually requested gestures. |

```tsx
import { QiviAvatar, type ExpressionDef } from '@yogeshhrathod/qivi';

const critical: ExpressionDef = {
  label: 'Critical warning',
  face: { lidL: 0.6, lidR: 0.6, lidTilt: -0.35, mouth: 0.12, mouthCurve: -0.75 },
  body: { lean: -0.05, density: 0.4, freeSpread: -0.3 },
  glyph: { gExclaim: 0.9 },
  impulse: 'shiver',
};
// In a client render:
// <QiviAvatar state="talking" expression="concern" expressionDefinition={critical}
//   expressionStrength={1.4} shape="shield" />
```

`ExpressionDef.face` and `.glyph` contain absolute target values; `.body` uses additive offsets for width, height, lean, stretch, breath, breathPeriod, noise, loose, noiseSpeed, freeSpread, density, chaos, accentX and accentY. Other body values are absolute. `impulse` can be one gesture or an array. Exported `BASE`, `Params`, and `ParamKey` describe the low-level controls. Use finite values near existing presets; those controls are not all normalized. Visibility controls (`glyphs`, `smile`, `accent`) apply after custom targets. Audio speaking overlays can still open the mouth when `smile=false`.

## Shapes and character morphing

Built-in `shape`: `auto`, `blob`, `heart`, `shield`, `hex`, `star`. With `auto`, state, expression and personality influence morph weights. Explicit shapes override automatic selection; existing intensity still scales built-in morph strength.

```tsx
import { createRadialShape, QiviAvatar } from '@yogeshhrathod/qivi';
const flower = createRadialShape(angle => 0.95 + 0.18 * Math.cos(6 * angle));
// <QiviAvatar customShape={flower} />
```

`customShape` overrides built-in shape selection. It is an immutable array of radii sampled counter-clockwise from -π. At least 3 samples are required; `createRadialShape` defaults to 128 and validates 3–4096 samples and radii 0.1–2. Samples are resampled to 128 rays by the engine. Set `customShape` back to undefined to resume built-in shapes. Shape radius changes blend per instance, including transitions between custom silhouettes; nothing mutates another avatar's geometry.

These are star-convex silhouettes around the origin, not arbitrary 3D mesh morph targets. They cannot represent holes or separated limbs. Numeric profile/palette/shape changes blend; name and personality-specific behavior switch at the cue boundary. Static SVG fallback displays a blob proxy with supported face/profile colors rather than animated silhouettes.

## Timed performance

`QiviPerformance` accepts a mounted avatar handle and an array of `QiviPerformanceCue` objects:

```ts
const cues = [
  { at: 0, frame: { state: 'talking', expression: 'focused', autoEmote: false } },
  { at: 1.2, duration: 2, frame: { expression: 'concern', expressionStrength: 1.6, shape: 'shield' }, impulse: 'shiver' },
  { at: 4, frame: { expression: 'happy', expressionStrength: 1.4, shape: 'blob' }, impulse: 'bounce' },
];
```

Times are in **seconds** on the actual audio playback clock. Cues sort by `at`, preserving input order for ties. Active frames merge in chronological order: later cues win per field. Frame objects merge shallowly; `params`, `character` and `expressionDefinition` replace earlier objects rather than deep merging. A finite `duration` expires back to earlier active cues or current component props; omitting it holds the frame until a later cue overrides it or the performance stops. Duration zero has no active pose/gesture.

A frame can override character, personality, presentation, theme, shape, customShape, state, expression, expressionStrength, expressionDefinition, params, intensity, transitionSpeed, autoEmote, glyphs, smile, accent and lighting. Voice, reduced-motion policy, particle budget, DOM anchors and sizing remain owned by component props.

| Method | Behavior |
| --- | --- |
| `update(seconds, emitImpulses=true)` | Reconstruct pose at the supplied time; backward seeks suppress gestures. Pass false for explicit forward seeks. |
| `play(() => seconds)` | Follow a custom clock via requestAnimationFrame; host calls stop on completion. |
| `followMedia(audio)` | Follow real media currentTime, pauses, seeks, playback rate, end and error. Does not start audio. |
| `stop()` | Detach scheduler/listeners, restore current avatar props and cancel queued reactions. Controller can be reused. |
| `dispose()` | Stop permanently; safe to call repeatedly. |

The avatar handle exposes `perform(frame)` (replace the temporary overlay), `resetPerformance()` (restore current props and clear queued impulses), and `impulse(kind)` (one-off gesture). Supported gestures: bounce, burst, surprise, flick, anticipate, glitch, ripple, sweep, shiver. A controller owns its target overlay; use one active controller per avatar. It polls the clock each animation frame but updates React only at cue boundaries. Reduced motion and the static fallback still apply.

## Complete audio integration

This client component works with a recorded URL or a URL created from any speech provider's response. It starts playback following user interaction and releases resources when playback stops or the component unmounts.

```tsx
import { useEffect, useRef, useState } from 'react';
import { QiviAvatar, QiviPerformance, QiviVoice,
  type QiviAvatarHandle, type QiviPerformanceCue } from '@yogeshhrathod/qivi';
import '@yogeshhrathod/qivi/styles.css';

export function SpokenAvatar({ audioUrl, cues }: {
  audioUrl: string; cues: readonly QiviPerformanceCue[];
}) {
  const avatar = useRef<QiviAvatarHandle>(null);
  const session = useRef<{ audio: HTMLAudioElement; performance: QiviPerformance; voice: QiviVoice } | null>(null);
  const [voice, setVoice] = useState<QiviVoice | null>(null);
  const [error, setError] = useState('');

  function release() {
    const current = session.current;
    if (!current) return;
    session.current = null;
    current.audio.onended = current.audio.onerror = null;
    current.audio.pause();
    current.performance.dispose();
    current.voice.dispose();
    setVoice(null);
  }
  useEffect(() => () => {
    const current = session.current;
    session.current = null;
    if (current) {
      current.audio.onended = current.audio.onerror = null;
      current.audio.pause();
      current.performance.dispose();
      current.voice.dispose();
    }
  }, []);

  async function speak() {
    release();
    setError('');
    if (!avatar.current) return;
    const audio = new Audio(audioUrl);
    // When using a cross-origin URL, set crossOrigin before src and ensure
    // the server allows CORS, or Web Audio analysis may receive silence.
    const nextVoice = QiviVoice.fromMediaElement(audio);
    const performance = new QiviPerformance(avatar.current, cues);
    const next = { audio, performance, voice: nextVoice };
    session.current = next;
    setVoice(nextVoice);
    performance.followMedia(audio);
    audio.onended = () => { if (session.current === next) release(); };
    audio.onerror = () => {
      if (session.current === next) { release(); setError('Audio could not play.'); }
    };
    try { await audio.play(); }
    catch { if (session.current === next) { release(); setError('Audio could not play.'); } }
  }

  return <>
    <QiviAvatar ref={avatar} size={300} state="idle" expression="neutral"
      voice={voice} autoEmote={false} autoSleep={false} reducedMotion="auto" />
    <button onClick={() => void speak()}>Speak</button>
    <button onClick={release}>Stop</button>
    {error && <p role="status">{error}</p>}
  </>;
}
```

This example assumes local or same-origin audio URLs. If the host creates a blob URL, it also owns revoking that URL after playback stops. If props change during playback, stop the old session before starting the new reply. For streaming audio, use your playback buffer's clock and `play(clock)`; network chunk arrival time is not a playback clock. A browser-speech adapter can call `update()` using speech boundary timing and must handle cancellation itself.

## Bot call adapter

For voice-call applications, keep integration inside the call experience. The host maps grounded reply intent (warning, critical, reassuring, success, question) to expressions, strength, shape and gestures. Convert speech-provider alignment to phrase start/end seconds, then produce cue objects. Feed actual audio to QiviVoice and the same playback clock to QiviPerformance. Do not estimate sentence timing from character counts when alignment is available. Keep provider API keys server-side; no provider dependency belongs in this library.

Supply separate speech delivery instructions to your TTS adapter. Visual cues do not change vocal tone automatically. A warning → action plan → reassurance sequence should use concern → focused → happy/neutral with deliberate gestures and smoothly settling transitions. This library work provides the API; the bot adapter is a separate implementation step.

## Ready-made male and female versions

`CHARACTERS.qivi`, `CHARACTERS.female` (Nova), and `CHARACTERS.male` (Sol) are reusable `QiviCharacter` profiles. Nova uses a taller silhouette and larger, closer eyes; Sol uses a wider silhouette and smaller, wider-set eyes. Their parameters and presentation can be overridden independently of behavioral personality and voice. These remain particle characters, not human models.

The new behavioral bases `spark` and `diplomat` provide enthusiastic and composed behavior, respectively. Either can be used with any presentation.

```tsx
import { QiviAvatar, CHARACTERS } from '@yogeshhrathod/qivi';
export function FemaleCompanion() {
  return <QiviAvatar character={CHARACTERS.female} size={240} />;
}
export function MaleCompanion() {
  return <QiviAvatar character={{ ...CHARACTERS.male, personality: 'spark' }} size={240} />;
}
```
