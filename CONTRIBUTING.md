# Contributing to Qivi

Start with [AGENTS.md](AGENTS.md), then the [architecture](docs/architecture.md) and [development guide](docs/development.md).

## Local setup

```sh
git clone https://github.com/yogeshhrathod/qivi.git
cd qivi
nvm use
npm ci
npm run dev
```

If nvm is unavailable, install Node 22 directly. Open the URL Vite prints (normally localhost:5173; occupied ports may cause it to choose another). The demo works without API keys; its responder is synthetic. Microphone features need browser permission and a secure context such as localhost or HTTPS.

## Working on a change

1. Create a branch for a focused change. Inspect current files before editing and preserve other work in progress.
2. Implement in the library or showcase according to the architecture boundary.
3. Update docs for user-visible behavior, props, exports, or setup changes.
4. Run relevant checks from AGENTS.md. For visual changes, review actual browser screenshots in both themes and on a phone.
5. Open a pull request with the problem, resulting behavior, validation, and screenshots when useful. Use the repository PR template.

Root dependencies support both the demo and library builds; run `npm ci` at the root. The demo resolves the package import to library source through Vite/TypeScript aliases. For testing installation into another app, use an npm archive rather than assuming the development alias exists there.

## Review conventions

Prefer plain TypeScript and existing components over new dependencies. Keep animation work out of React render loops. Preserve public API compatibility, resource cleanup, reduced motion, and SVG fallback. Keep mock content clearly synthetic and never commit API keys or employer-specific material.

Qivi is released under the [MIT License](LICENSE). Contributions are accepted under the same license. See [release guidance](docs/releasing.md).
