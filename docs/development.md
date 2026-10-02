# Development guide

## Commands

| Command from repository root | Result |
| --- | --- |
| `npm ci` | Install exact locked dependencies. |
| `npm run dev` | Start Vite and edit library/demo source with live updates. |
| `npm run typecheck` | Check the demo and imported library TypeScript. |
| `npm test` | Build library and run Node tests, including compiled documentation examples. |
| `npm run build` | Build demo for `/`. |
| `npm run build:showcase` | Build demo with `/qivi/` asset paths for Pages. |
| `npm run build:library` | Build library JavaScript, CSS, and declarations. |
| `npm run preview -- --host 127.0.0.1` | Serve the existing demo build; use its configured base path. |

## Common changes

**Personality or expressions:** start in `presets.ts`. Keep state and expression independent; document new public names and update types. Use custom character profiles for host-specific identities rather than hardcoding demo behavior into the engine.

**Shapes or shaders:** inspect `shapes.ts`, `engine.ts`, and `shaders.ts` together. Validate radial bounds, transition behavior, reduced motion, fallback limitations, and resource lifecycle. Avoid adding per-particle React elements.

**Public API:** update implementation, `types.ts` where relevant, exports in `index.ts`, and API/example documentation. `library/qivi/tests/docs.test.mjs` typechecks documented TSX examples against the built package.

**Showcase UI:** follow current semantic tokens and interface typography. Keep the avatar prominent and conversation controls stable. If character drawers, settings panels, or dialogs exist, preserve their state, keyboard behavior, and resource cleanup. On phones, reduce the avatar stage before squeezing the composer. Use opaque theme surfaces and transparent branding; avoid a fixed white wordmark background.

**Branding:** use `QiviIcon` for the avatar mark and the Qivi wordmark with coral dot. Capture real avatars from `scripts/brand-preview.html`; preserve transparent light/dark banners and README `<picture>` selection. See [capture details](assets/README.md).

## Verification

Use actual browser rendering for visual changes. Check light and dark, desktop, 320px/standard phone, tablet, and short landscape when layout is affected. Exercise keyboard focus, theme controls, voice permission handling, the touched dialog/panel flows, and chat scrolling. Respect reduced motion and ensure no page-level horizontal overflow.

Library tests live in `library/qivi/tests`. Add meaningful coverage for behavior changes, not tests that merely duplicate implementation. Documentation-only edits need link/command checks, not a redundant full build.

## Debugging

In development, `window.__qivi` exposes an engine for inspection (`cur`, `tgt`, `cfg`); multiple avatars may mean it refers to an earlier mounted instance. Inspect browser console and WebGL support when a particle avatar does not appear. Static quality intentionally uses SVG.

Use a user gesture to start microphone/audio features. A denied permission must not break the demo. Confirm disposal when previews mount/unmount or playback is interrupted.

If Pages assets return 404, check that `build:showcase` was used and generated URLs begin with `/qivi/`. If library imports fail, check package exports and declarations; the demo source alias is not part of a consumer's bundler configuration.
