// Renders scripts/promo-video.html to MP4, frame-accurately.
//
// Setup (tools are not project dependencies):
//   npm i --no-save playwright ffmpeg-static && npx playwright install chromium
//   npm run dev -- --port 5199
// Render:
//   node scripts/render-promo.mjs qivi-promo.mp4              # 1920×1080
//   node scripts/render-promo.mjs qivi-vertical.mp4 --vertical
//   node scripts/render-promo.mjs check.mp4 --stills 2.6,8,14.2 # PNG stills only
//
// The browser clock is faked and Math.random seeded, so every frame is the real QiviAvatar at
// exactly t = frame / fps. The soundtrack is rendered offline by the page from the same beat grid,
// then the result is loudness-normalised to about -14 LUFS.
import { spawn } from "node:child_process";
import fs from "node:fs";
import { chromium } from "playwright";
import ffmpeg from "ffmpeg-static";

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const out = args[0] && !args[0].startsWith("--") ? args[0] : "qivi-promo.mp4";
const FPS = Number(opt("--fps", 30));
const stills = opt("--stills", "") ? opt("--stills").split(",").map(Number) : null;
const URL = opt("--url", "http://localhost:5199/scripts/promo-video.html") + (args.includes("--vertical") ? "?vertical" : "");
const withQuery = (q) => URL + (URL.includes("?") ? "&" : "?") + q;
const SEED = `(() => { let s = 1234567; Math.random = () => ((s = Math.imul(s ^ (s >>> 15), 2246822507) + 0x9e3779b9 | 0) >>> 0) / 4294967296; })()`;
const run = (argv) => new Promise((resolve, reject) => spawn(ffmpeg, argv, { stdio: "inherit" }).on("close", (c) => (c ? reject(new Error(`ffmpeg exited ${c}`)) : resolve())));

const browser = await chromium.launch({ args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] });
try {
  // 1 · soundtrack
  const wav = out.replace(/\.mp4$/, ".wav");
  if (!stills) {
    const ap = await browser.newPage();
    await ap.addInitScript(SEED);
    await ap.goto(withQuery("audio"));
    await ap.waitForFunction(() => window.__renderAudio);
    fs.writeFileSync(wav, Buffer.from(await ap.evaluate(() => window.__renderAudio()), "base64"));
    await ap.close();
  }

  // 2 · frames
  const page = await browser.newPage({ deviceScaleFactor: 1 });
  page.on("pageerror", (e) => console.log("page error:", e.message));
  await page.addInitScript(SEED);
  await page.clock.install({ time: 0 });
  await page.goto(URL);
  await page.waitForFunction(() => window.__seek && window.__promo);
  const { duration, width, height } = await page.evaluate(() => window.__promo);
  await page.setViewportSize({ width, height });
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => window.__seek(0));
  await page.clock.runFor(800); // let WebGL initialise before frame 0

  const frames = Math.round(duration * FPS);
  const raw = out.replace(/\.mp4$/, ".raw.mp4");
  const enc = stills ? null : spawn(ffmpeg, ["-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(FPS), "-i", "-", "-i", wav,
    "-c:v", "libx264", "-preset", "slow", "-crf", "16", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-shortest", raw], { stdio: ["pipe", "inherit", "inherit"] });
  const want = stills ? new Set(stills.map((s) => Math.round(s * FPS))) : null;
  const last = stills ? Math.max(...want) : frames - 1;
  for (let i = 0; i <= last; i++) {
    await page.evaluate((t) => window.__seek(t), i / FPS);
    await page.clock.runFor(1000 / FPS);
    if (want && !want.has(i)) continue;
    let png = null;
    for (let attempt = 0; !png; attempt++) {
      try { png = await page.screenshot({ type: "png", timeout: 8000 }); }
      catch (e) { if (attempt >= 3) throw e; console.log(`frame ${i}: screenshot stalled, retrying`); }
    }
    if (want) fs.writeFileSync(`${out.replace(/\.mp4$/, "")}-${(i / FPS).toFixed(2)}.png`, png);
    else if (!enc.stdin.write(png)) await new Promise((r) => enc.stdin.once("drain", r));
    if (!want && i % 150 === 0) console.log(`frame ${i}/${frames}`);
  }
  if (enc) {
    enc.stdin.end();
    await new Promise((r) => enc.on("close", r));
    // 3 · loudness for social platforms
    await run(["-y", "-loglevel", "error", "-i", raw, "-c:v", "copy", "-af", "loudnorm=I=-14:TP=-1:LRA=11", "-ar", "48000", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", out]);
    fs.rmSync(raw); fs.rmSync(wav);
    console.log("video ->", out);
  }
} finally {
  await browser.close();
}
