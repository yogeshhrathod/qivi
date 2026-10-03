# Qivi brand assets

Every visual here is an unedited browser capture of the actual `QiviAvatar` or `QiviIcon` component from this repository. No image- or video-generation model was used. The capture pages in `scripts/` are development tools and are not part of the production showcase build.

| Asset | Source | Use |
| :--- | :--- | :--- |
| `qivi-banner-light.png`, `qivi-banner-dark.png` | `scripts/brand-preview.html?theme=light` / `?theme=dark`, 1200 × 440, transparent | README header; the `<picture>` element picks the one matching the reader's theme |
| `qivi-social.png` | `scripts/brand-preview.html?social`, 1280 × 640 | GitHub social preview (Settings → Social preview) and link cards |
| `qivi-expressions.webp` | 13–18 s of the promo video, cropped, animated WebP | README animation |
| Promo video (not committed) | `scripts/promo-video.html`, rendered by `scripts/render-promo.mjs` | Launch posts; 1920 × 1080 and 1080 × 1920 |

The SVG icon and transparent 512px PNG in `library/qivi/assets` come from `QiviIcon`. `public/favicon.svg` is a separate export rendered with `size={32}` for small-size readability.

## Recreate the captures

1. Run `npm ci`, then `npm i --no-save playwright ffmpeg-static` and `npx playwright install chromium`.
2. Start the dev server: `npm run dev -- --port 5199`.
3. Banners and social preview: open the `brand-preview` URLs above at the listed viewport sizes, let the avatar settle for about three seconds, and capture the viewport. Use Playwright `omitBackground: true` for the transparent banners. Installing a fake clock (`page.clock.install`) and seeding `Math.random` makes captures repeatable.
4. Icons: open `/scripts/brand-preview.html?icon` and export the SVG element, adding the SVG XML namespace when saving it as a standalone file. Capture `.icon` with a transparent background for the 512px PNG. `?icon&size=32` gives the favicon.
5. Promo video: `node scripts/render-promo.mjs qivi-promo.mp4` (landscape) or `node scripts/render-promo.mjs qivi-promo-vertical.mp4 --vertical`. Add `--stills 2.6,8,14.2` to export PNG stills instead. Do not edit files under the Vite root while a render runs: a hot reload interrupts the capture.
6. Expressions loop: `ffmpeg -ss 13 -t 5 -i qivi-promo.mp4 -vf "crop=1200:900:360:60,fps=20,scale=720:-1:flags=lanczos" -c:v libwebp_anim -quality 55 -loop 0 -an qivi-expressions.webp`.

Open `scripts/promo-video.html?play` in a browser to watch the composition in real time with its soundtrack and a scrub bar before rendering.

## How the video is made

`scripts/promo-video.tsx` draws every frame as a pure function of the timeline time `t`. The renderer fakes the browser clock, seeds `Math.random`, and advances exactly one frame (1/30 s) between screenshots, so the real WebGL avatar is captured frame-accurately rather than screen-recorded. The soundtrack is synthesized with Web Audio from the same 120 BPM beat grid, rendered offline, and loudness-normalised to about −14 LUFS.

## Light and dark themes

The banners are transparent, so their backgrounds blend with the README page. The showcase wordmark uses SVG `currentColor`, so it inherits the page theme without a background panel. Live particles mean exact positions vary between captures.
