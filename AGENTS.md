# Qivi: developer and AI-agent instructions

Read this file before changing the project. It is the canonical guidance for humans and AI coding tools; `agent.md`, `CLAUDE.md`, and Copilot instructions point here.

## Start here

- [CONTRIBUTING.md](CONTRIBUTING.md): setup, workflow, and review expectations.
- [Architecture](docs/architecture.md): library, renderer, voice, and demo boundaries.
- [Development](docs/development.md): common changes, design conventions, and verification.
- [Releases](docs/releasing.md): GitHub Pages and npm packaging.
- [Library API](library/qivi/README.md) and [customization guide](library/qivi/docs/performance.md).

## Identity and scope

Qivi is a personal React particle-avatar library maintained by Yogesh Rathod. Repository: https://github.com/yogeshhrathod/qivi. Package: `qivi-react` on npmjs.com (npm rejects plain `qivi` as too similar to existing names), mirrored as `@yogeshhrathod/qivi` on GitHub Packages by the release workflow. Showcase: https://yogeshhrathod.github.io/qivi/. Sponsor: https://github.com/sponsors/yogeshhrathod.

Keep contributions independent of employer branding, corporate accounts, internal URLs, credentials, and private datasets. Use synthetic demo content and label sample responses clearly. If working in a larger workspace, change only the avatar project unless explicitly asked to work elsewhere.

## Commands

Run from the project root (the directory containing this file):

```sh
npm ci
npm run dev
npm run typecheck
npm test
npm run build:showcase
npm run build:library
```

Use Node 22 (`.nvmrc`), matching CI. `npm run build` builds for `/`; `build:showcase` builds for `/qivi/`. Root package.json is private because it is a demo workspace. Publishable code lives in `library/qivi`.

## Implementation rules

- Public exports belong in `library/qivi/src/index.ts`; preserve documented API and peer dependencies.
- Prefer preset tables in `presets.ts` for personality/expression/state behavior. Avoid duplicating engine animations in demo components.
- Keep animation in `QiviEngine` and shaders, not React state updated every frame.
- `QiviAvatar` owns renderer setup/cleanup and contained/viewport integration; preserve static fallback, reduced motion, and offscreen pausing.
- Dispose renderers, GPU resources, voice analyzers, media listeners, and performance controllers when their owner unmounts. Mount expensive previews only when visible.
- Keep the library provider-independent. A real responder belongs behind the `Responder` boundary, with cancellation and server-side credentials.
- Update API documentation and integration examples when changing public types or behavior.
- Do not edit generated `dist` files, vendor node_modules, or unrelated work already in progress.

## UI and branding

- The avatar is the product: give it space; keep conversation and configuration readable.
- Follow existing semantic color tokens, interface typography, and component conventions rather than imposing a new design system.
- Preserve the `Qivi.` wordmark and coral dot. It must blend with the page: no white background panel; inherit theme colors in the showcase.
- Preserve light/dark themes, responsive layouts, keyboard focus, meaningful accessible labels, voice controls, and GitHub/Sponsor links.
- README banners are real browser captures of `QiviAvatar`, not illustrations or AI-generated substitutes. Keep transparent light/dark captures and automatic theme selection. See `docs/assets/README.md`.
- Icon assets derive from `QiviIcon`; preserve the same palette and facial identity.

## Verification and completion

- Code changes: typecheck and build. Library behavior/API changes: run `npm test` and inspect npm pack contents.
- UI changes: inspect desktop and phone, light and dark, reduced motion, keyboard focus, scroll behavior, and open/close flows touched by the change. Check overflow and composer visibility at short heights.
- Documentation-only changes: verify commands, relative links, and source claims; a full test run is unnecessary unless examples/API change.
- Report changed behavior, checks performed, and remaining limitations. Do not claim a deployment or npm publication without confirming it.
- Pushing `main` triggers showcase CI/deployment. Publishing a GitHub Release runs `.github/workflows/release.yml` (see `docs/releasing.md`); create releases only when explicitly asked. The project is MIT licensed.

For showcase structure and sections, read `.agents/skills/qivi-showcase-design/SKILL.md`. For any UI/UX, mobile, phone-keyboard, navigation, or motion work, read `.agents/skills/qivi-ui-ux-mobile/SKILL.md`. Both skills are linked into `.claude/skills/` for Claude Code.
