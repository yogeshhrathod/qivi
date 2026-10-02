---
name: qivi-showcase-design
description: Structure, sections, and product invariants of the Qivi showcase (Chat, Scenes, Characters, Studio, Build). Use when adding or changing showcase sections, scenes, characters, studio controls, or avatar behavior in the Qivi repository, not unrelated Qivi subprojects.
---

# Qivi showcase design

Treat the avatar as the product: the interface gives it space and makes its behavior easy to try. Read `AGENTS.md`, then `.agents/skills/qivi-ui-ux-mobile/SKILL.md` for visual language, mobile, keyboard, and motion rules.

## Structure

- `src/App.tsx`: header with segmented navigation on desktop, bottom tab bar on phones, hash routes (`#/chat`, `#/scenes/<id>`, `#/characters`, `#/studio`, `#/build`), lazy-loaded sections.
- `src/store.tsx`: one persisted look (character, personality, palette, shape, mood, rendering) and theme. Every primary avatar reads it through `useLookProps()`, so a change in Studio or Characters appears everywhere.
- **Chat** (`pages/ChatPage.tsx`): hero avatar driven by `useQiviAgent`, prompts, streaming replies, mic and read-aloud, reactions, quick character switcher, and a Live controls sheet (placement stage/composer/corner, state and expression overrides, particles, reduced motion, doze).
- **Scenes** (`pages/ScenesPage.tsx` + `scenes/`): each scene is a working mini-product with its code pattern. Register new scenes in `SCENES` with an illustration in `SceneArt`.
- **Characters**: swipe carousel; one morphing avatar is drawn above the scroll track so particles are never clipped.
- **Studio**: identity, mood, shape, render, and generated JSX (`lookToJsx`).
- **Build**: install, integration snippets, real banner captures, downloads, GitHub and Sponsor links.

## Product invariants

- Keep live particle previews and distinct character shapes, gaze, breathing, and particle behaviors. Small icons alone do not demonstrate character differences.
- Never clip avatar haze: avoid `overflow: hidden` or scroll containers around live avatars; content scrolls beneath a fading header.
- Use `layer="viewport"` only when the avatar must travel or stream particles; give its box no layout space.
- Preserve system/saved theme, honest sample-response and synthetic-data labels, project links, voice controls, and access to documentation.
- Chat keeps its own scroll area with fade masks and preserves reading position while replies stream.
- Mount WebGL previews only when visible and release voices, performances, audio, and object URLs on unmount.

## Verification

Typecheck and `npm run build:showcase`. Review rendered screenshots in light and dark at 320px, a standard phone, tablet, short landscape, and desktop. Exercise chat, keyboard-open composer, every scene's primary flow, character selection, studio changes reflected in chat, sheets, and theme persistence. Run library tests when changing profiles or engine behavior.
