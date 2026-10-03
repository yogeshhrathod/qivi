# Qivi quickstart

A minimal Vite + React 19 app using [`qivi-react`](https://www.npmjs.com/package/qivi-react) from npm. Switch states, expressions, and characters to see what the avatar can do.

[![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/yogeshhrathod/qivi/tree/main/examples/quickstart?file=src%2FApp.tsx)

Run locally:

```sh
npm install
npm run dev
```

The whole integration is three lines:

```tsx
import { QiviAvatar } from "qivi-react";
import "qivi-react/styles.css";

<QiviAvatar size={280} state="thinking" />
```

"Talking" uses `QiviVoice.simulate()` so it moves without audio. Connect real sound with `QiviVoice.microphone()`, `QiviVoice.fromMediaElement(audio)`, or `QiviVoice.fromStream(stream)`; see the [OpenAI Realtime example](../openai-realtime) for a full voice agent.

MIT licensed.
