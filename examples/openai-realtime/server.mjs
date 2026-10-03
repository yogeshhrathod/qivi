// Minimal token server: keeps OPENAI_API_KEY on the server and hands the browser
// a short-lived Realtime client secret. Docs:
// https://developers.openai.com/api/docs/guides/realtime-webrtc
// https://developers.openai.com/api/reference/resources/realtime/subresources/client_secrets/methods/create
import { createServer } from "node:http";

const PORT = Number(process.env.PORT ?? 3001);
const MODEL = process.env.OPENAI_REALTIME_MODEL ?? "gpt-realtime-2.1";
const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.error("Set OPENAI_API_KEY before starting the server.");
  process.exit(1);
}

const sessionConfig = {
  session: {
    type: "realtime",
    model: MODEL,
    instructions: "You are Qivi, a friendly voice assistant. Keep answers short.",
    audio: { output: { voice: "marin" } },
  },
};

createServer(async (req, res) => {
  if (req.method !== "POST" || req.url !== "/session") {
    res.writeHead(404).end();
    return;
  }
  try {
    const r = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(sessionConfig),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data?.error?.message ?? `OpenAI returned ${r.status}`);
    // Only the ephemeral secret leaves the server.
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ value: data.value, expires_at: data.expires_at }));
  } catch (err) {
    console.error(err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Could not create a Realtime session." }));
  }
}).listen(PORT, () => console.log(`Token server on http://localhost:${PORT} (model ${MODEL})`));
