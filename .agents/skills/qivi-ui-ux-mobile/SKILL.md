---
name: qivi-ui-ux-mobile
description: UI/UX, interaction, motion, and mobile-first design rules for Qivi interfaces, including the showcase in src/. Use when designing or reviewing screens, layouts, navigation, sheets, forms, chat composers, phone keyboards, touch targets, safe areas, animation, iconography, or responsive behavior in the Qivi repository.
---

# Qivi UI/UX and mobile design

Read `AGENTS.md` first. The avatar is the product; every screen exists to show what `QiviAvatar` can do in a real product context. For the showcase's sections and invariants, also follow `.agents/skills/qivi-showcase-design/SKILL.md`.

## Design process

1. **Name the job of the screen** in one sentence ("watch Qivi react while a scan runs"). Remove anything that does not serve it.
2. **Pick one hero.** One large live avatar per view. Supporting avatars use `QiviIcon` or small/low-quality `QiviAvatar`; never mount many large WebGL canvases at once (browsers cap WebGL contexts at about 16).
3. **Design the phone first** at 360×640, then 320px width, then tablet and desktop. Desktop adds space and side-by-side panes; it never adds features that phones lack.
4. **Write the states** before styling: empty, loading, streaming, success, warning, error, permission denied, reduced motion, static fallback.
5. **Verify in a real browser** (see Verification). Screenshots, not assumptions.

## Visual language

- Brand tokens: porcelain `#f5f7fc`, paper `#ffffff`, ink `#17254a`, blue `#345de3`, slate `#596783`, coral `#f2453a`; opaque navy surfaces in dark mode. Always use semantic tokens (`--canvas`, `--paper`, `--ink`, `--muted`, `--line`, `--accent`, `--signal`), never raw hex in components.
- Typeface: Outfit. Hierarchy comes from size, weight, spacing, and alignment. Display 32–56px light weight with tight tracking; body 15–16px; captions 12–13px. Never body text below 15px on phones; inputs are always 16px or larger (prevents iOS focus zoom).
- Keep the `Qivi.` wordmark with the coral dot, transparent on the page background.
- Imagery: compose illustrations from `QiviIcon` faces plus simple SVG UI fragments (bars, fields, waveforms, timelines). Do not use stock photos, AI-generated images, or illustrations that misrepresent the real avatar.
- Icons: one consistent 24px stroke set (1.75px stroke, round caps/joins) from `src/icons.tsx`. Every icon-only control has an accessible name and a tooltip on pointer devices.
- Surfaces: flat and opaque, 1px `--line` borders, radius 12/16/24. A soft, theme-aware radial spotlight behind the hero avatar is allowed; avoid glassmorphism and decorative gradient washes elsewhere.
- Spacing scale: 4, 8, 12, 16, 24, 32, 48, 64. Phone side gutter is 16px.

## Navigation and layout

- Primary sections are reachable in one tap: bottom tab bar on phones (icons + short labels, ≥ 56px tall plus `env(safe-area-inset-bottom)`), segmented top navigation on desktop.
- Use hash routes (`#/scenes/voice`) so every section and scene deep-links on GitHub Pages and the back button works.
- The app shell is fixed to the visual viewport; scrolling happens inside the main region, not on `body`. This keeps the composer and tab bar stable on iOS.
- Secondary configuration opens in a sheet: bottom sheet on phones (drag handle, max 88% height, internal scroll), side drawer on desktop. Use native `<dialog>` with `showModal()` for focus trapping; Escape and backdrop click close it with an exit animation.
- No page-level horizontal scroll. Horizontal chip rows scroll inside their own container with scroll-snap and a fade mask.

## Phone keyboard (required for every text input)

- Viewport meta: `width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content`. Never disable zoom.
- Track `window.visualViewport` (`height`, `offsetTop`) in one hook (`src/useViewport.ts`). Write `--vvh` and `--vv-top` CSS variables and set `data-keyboard="open"` on `<html>` when an editable element is focused and the visual viewport shrank by more than 150px from the orientation baseline.
- When the keyboard is open: hide the bottom tab bar, collapse the hero avatar into a compact header (avatar ~56px + status), keep the composer flush above the keyboard, and keep the newest message visible. Do not move focus or scroll the page programmatically beyond keeping the chat pinned to its latest message.
- Composer: 16px+ font, `enterkeyhint="send"`, `autocomplete="off"`, sentence autocapitalization, auto-growing textarea capped at ~5 lines, Enter sends and Shift+Enter inserts a newline on hardware keyboards. Send stays disabled for empty input and remains reachable with the keyboard open.
- Forms: correct `type`, `inputmode`, `autocomplete`, and `enterkeyhint` per field; labels stay visible (no placeholder-only labels); errors appear inline, are announced (`aria-live`), and never sit under the keyboard.

## Touch and accessibility

- Touch targets ≥ 44×44px with ≥ 8px separation. Primary actions sit in the thumb zone (bottom half) on phones.
- Visible `:focus-visible` rings on every interactive element. Keyboard order follows visual order. Carousels support arrow keys, swipe, buttons, and dots.
- Text contrast ≥ 4.5:1 (3:1 for large text and UI boundaries) in both themes.
- Announce state changes politely (status chips, findings counts, playback position) without flooding screen readers on every streamed token.
- Pair color with an icon or text for severity and status.
- Microphone, speech, and audio start only from a user gesture. A denied permission shows a calm inline message and the rest of the page keeps working.

## Motion

- Vocabulary: press feedback 120ms (`scale(.96)`), color/hover 150ms, content enter 220–280ms (fade + 8–12px rise, `cubic-bezier(.2,.8,.2,1)`), sheets 280–320ms, list stagger 30–40ms per item capped at 8 items. Springy overshoot (`cubic-bezier(.34,1.56,.64,1)`) only for small celebratory elements.
- Animate outcomes (a reply arrives, a scan finds something, a character is chosen), not idle decoration. No infinite decorative loops except the avatar itself and explicit progress indicators.
- Use the View Transitions API for section changes when available and motion is allowed; fall back to a CSS fade.
- Respect reduced motion in CSS (`prefers-reduced-motion` and the showcase's own reduced-motion setting via a root class) and pass `reducedMotion` to every `QiviAvatar`.
- Never drive animation through React state on every frame. Use CSS, the avatar engine, or `requestAnimationFrame` writing to a CSS variable through a ref.

## Avatar usage patterns

- Chat: one hero avatar driven by agent state; small `QiviAvatar size={26}` (static) beside replies.
- Status-heavy UI: use `state` for activity (thinking/searching/analyzing/found/success/warning/error) and `expression` for feeling; they are independent.
- Use `streamTarget` to point particles at the element being worked on (results list, answer bubble) and `layer="viewport"` with `anchor` to fly between UI positions.
- Thumbnails, notifications, lists, and sizes under 48px use `QiviIcon` or `quality="static"`.
- Mount previews only when visible; dispose voices, performances, audio elements, and object URLs on unmount.
- Label demo content honestly: "Sample responses", "Synthetic findings", "Demo tones, not speech".

## Verification

Run from the repository root: `npm run typecheck` and `npm run build:showcase` after code changes. Then check in a browser:

- Widths 320, 375/390, 768, 1024, 1440; one short landscape phone (~740×360).
- Light, dark, and system theme; reduced motion on.
- Focus the composer on a phone-sized viewport: tab bar hides, stage collapses, composer and latest message stay visible, no horizontal overflow.
- Keyboard-only pass through navigation, sheets, carousel, and forms.
- Every scene's primary flow, permission-denied microphone, and WebGL-unavailable static fallback.
- Report what you checked and what you could not check (for example, real iOS/Android keyboards).
