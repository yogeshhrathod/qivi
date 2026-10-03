# Give your OpenAI Realtime voice agent a face with Qivi

A small sample app that connects to the [OpenAI Realtime API](https://developers.openai.com/api/docs/guides/realtime-webrtc) over WebRTC and drives a [Qivi](https://github.com/yogeshhrathod/qivi) avatar (`qivi-react`) from the session's events:

| Realtime server event | Qivi |
| --- | --- |
| `input_audio_buffer.speech_started` | `listening`, reacting to your microphone |
| `input_audio_buffer.speech_stopped`, `response.created` | `thinking` |
| `output_audio_buffer.started` (WebRTC only) | `talking`, lip-synced to the assistant's audio via `QiviVoice.fromStream(remoteStream)` |
| `output_audio_buffer.stopped` (WebRTC only) | `idle` |
| `error`, or `response.done` with status `failed` | `error` |

This is a sample, not production code. It has no auth, rate limiting, or abuse protection on the token endpoint.

## How it works

- `server.mjs` is a dependency-free Node server. It holds `OPENAI_API_KEY` and exposes `POST /session`, which calls `POST https://api.openai.com/v1/realtime/client_secrets` and returns only the short-lived client secret. The API key never reaches the browser.
- The Vite dev server proxies `/session` to `server.mjs`, so the client calls its own origin.
- `src/App.tsx` asks for the microphone on Start, creates an `RTCPeerConnection`, opens the `oai-events` data channel, posts its SDP offer to `https://api.openai.com/v1/realtime/calls` with the client secret, and plays the remote audio through an `<audio>` element. Stop (or unmounting) closes the connection, stops the microphone, and disposes the Qivi voices.

## Run it

Requires Node 22 and an OpenAI API key with Realtime access. Use two terminals in this folder:

```sh
npm install
OPENAI_API_KEY=sk-... npm run server   # token server on http://localhost:3001
```

```sh
npm run dev                            # open the printed http://localhost:5173 URL
```

Press **Start**, allow the microphone, and talk. Set `OPENAI_REALTIME_MODEL` to use a different model (default `gpt-realtime-2.1`) and `PORT` to move the token server (update the proxy in `vite.config.ts` to match).

## References

- WebRTC guide (client secret, SDP exchange, `oai-events`): https://developers.openai.com/api/docs/guides/realtime-webrtc
- Server events reference: https://developers.openai.com/api/reference/resources/realtime/server-events
- Create client secret: https://developers.openai.com/api/reference/resources/realtime/subresources/client_secrets/methods/create
- Qivi API: [`library/qivi/README.md`](../../library/qivi/README.md)

## License

MIT, like Qivi.
