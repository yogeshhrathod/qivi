---
name: qivi-showcase-design
description: Design and refine the Qivi particle-avatar showcase, its conversation layout, character drawer, live settings, responsive behavior, and interaction motion. Use for visual work in the Qivi repository, not unrelated Qivi subprojects.
---

# Qivi showcase design

Treat the avatar as the product: the interface gives it space and makes its behavior easy to try. Read `AGENTS.md` and inspect current components before changing the layout.

## Visual direction

Prefer a spacious live stage beside a quiet conversation area. Let the avatar sit directly on the page; avoid a filled box behind it. Map character, playground, and example dialog surfaces to the same canvas token, with a subtle theme-aware backdrop tint. On phones, place a compact live stage above the conversation and keep its composer within the visual viewport. Use flat, opaque surfaces and a cool palette; avoid decorative gradient washes, glass controls, repetitive rounded feature cards, and marketing text that competes with the avatar.

The current palette uses porcelain `#f5f7fc`, white `#ffffff`, ink `#17254a`, blue `#345de3`, muted slate `#596783`, and particle coral `#f2453a`. Map these through semantic tokens, with opaque navy surfaces in dark mode. Keep Outfit as the interface typeface and the existing Qivi wordmark. Make hierarchy through scale, spacing, and alignment rather than ornamental labels.

## Product invariants

- Keep live particle previews and distinct character shapes, gaze, breathing, and particle behaviors. Small icons alone do not demonstrate character differences.
- Open character selection as a carousel drawer with swipe, arrows, dots, a clear selection action, and the currently selected character restored on reopening.
- Settings update the avatar live. Keep detailed configuration in the settings sidebar or playground rather than the main stage.
- Preserve system/saved themes, general chat demo prompts, honest sample-response labeling, project links, voice controls, and access to examples and documentation.
- Give chat its own scroll area. Fade content with a mask so the actual surface shows through, and preserve reading position while replies stream.
- Avoid rendering hidden WebGL previews. Mount previews on demand and release them on close; keep animation in the library engine rather than frame-by-frame React state.

## Interaction and mobile

Use a consistent motion vocabulary: short color/press feedback, slightly longer drawer travel, and damped avatar morphs. Keep content stable while replies stream. Animate action outcomes rather than adding unsolicited loops. Respect reduced motion in both CSS and the avatar engine.

Preserve native dialog focus behavior, keyboard navigation, descriptive accessible names, and at least 44px touch targets. At short viewport heights, reduce the avatar stage before squeezing the composer. Use visualViewport height to respond to software keyboards; never disable zoom.

## Verification

Run avatar commands from the repository root. Typecheck and build after code changes. Review rendered screenshots in light and dark mode, including 320px phone, a standard phone, tablet, short landscape, and desktop. Verify prompts/chat, scrolling, keyboard focus, theme persistence, character selection, drawer dismissal, live settings, and playground access. Confirm the composer and dialog actions remain visible with no page-level horizontal overflow. Run library tests when changing profiles or engine behavior.
