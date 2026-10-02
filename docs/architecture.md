# Architecture

Qivi has two layers: a reusable React library and an interactive showcase. The showcase demonstrates behavior; consumers should depend on the library rather than importing demo code.

## Source map

| File | Responsibility |
| --- | --- |
| `library/qivi/src/index.ts` | Public exports and stylesheet import. |
| `library/qivi/src/QiviAvatar.tsx` | Props, imperative handle, engine lifecycle, static fallback, layout integration. |
| `library/qivi/src/types.ts` | Configuration and public state/theme/shape types. |
| `library/qivi/src/presets.ts` | Base parameters, palettes, personality/expression/state tables, target composition. |
| `library/qivi/src/shapes.ts` | Radial silhouette definitions and custom radial shape validation. |
| `library/qivi/src/engine.ts` | Three.js renderer, frame updates, damping, behaviors, uniforms, GPU cleanup. |
| `library/qivi/src/shaders.ts` | Particle positioning and visual layers in GLSL. |
| `library/qivi/src/QiviIcon.tsx` | Static SVG fallback and canonical icon. |
| `library/qivi/src/voice.ts` | Audio analysis, speech/manual signals, voice source lifecycle. |
| `library/qivi/src/performance.ts` | Clock-driven expression/gesture/shape/character cues. |
| `src/App.tsx` | Showcase orchestration, avatar settings, placement, and page composition. |
| `src/components/` | Showcase controls, gallery, studio, chat, and additional UI. |
| `next/index.html`, `src/next/` | Redesigned showcase served at `/next/`: hash-routed Chat, Scenes, Characters, Studio and Build sections sharing one persisted avatar look (`store.tsx`). Will replace the current showcase. |
| `src/agent/responder.ts` | Abortable async event stream and mock responder. |
| `src/agent/useQiviAgent.ts` | Conversation activity mapped to avatar state, expression, voice, and stream targets. |

## Rendering and state

React supplies configuration and layout anchors. `QiviAvatar` creates and disposes an engine; contained mode manages a canvas around its box, while viewport mode follows anchors on a full-screen layer. Contained avatars pause offscreen. Small avatars or static quality use the SVG icon; WebGL is not required for that fallback.

The engine composes target parameters, damps toward them, integrates animation time, and updates uniforms. Particle positions are computed in the shader from home points, seeds, and uniforms. Face, accent, aura, and glyph layers are rendered separately. New preset behavior usually belongs in tables, not a parallel animation implementation.

State and emotion are independent: a talking avatar may also look concerned. Explicit configuration and custom expression definitions participate in target composition; consult `composeTarget()` and the customization guide before changing precedence.

## Voice and performance

`QiviVoice` supplies audio-reactive signals. `QiviPerformance` supplies semantic timed cues against an actual playback clock. Audio waveforms do not infer emotion or phoneme visemes. Stop/dispose both systems appropriately; cancellation and media listeners belong to the host lifecycle.

## Backend boundary

`Responder` is an async iterable of phase, findings, token, and done events and receives an AbortSignal. A host can replace the mock responder with a backend while keeping avatar choreography separate. No provider SDK, API key, or model service belongs in the library.

## Distribution

The root package is the private demo workspace. `library/qivi/package.json` defines the public package entry points, TypeScript declarations, CSS, documentation, and brand assets. React, React DOM, and Three.js are peer dependencies. The showcase aliases the package name to source for development; installed consumers use the built package.
