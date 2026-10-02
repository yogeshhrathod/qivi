# Qivi brand assets

`qivi-banner.png` is an unedited browser screenshot of `scripts/brand-preview.html`, which renders the actual `QiviAvatar` component from this repository. It uses the default palette, core personality, idle state, neutral expression, high particle quality, and light appearance. No image-generation model was used.

The SVG icon and transparent 512px PNG in `library/qivi/assets` come from the actual `QiviIcon` component. `public/favicon.svg` is a separate export rendered with `size={32}` for small-size readability.

## Recreate the captures

1. Run `npm ci` and `npm run dev`.
2. Open `/scripts/brand-preview.html` at the Vite URL in a WebGL-capable browser.
3. Set the viewport to 1200 × 440, allow the avatar to settle, and capture the viewport as `qivi-banner.png`.
4. Open `/scripts/brand-preview.html?icon` and export the SVG element, adding the SVG XML namespace when saving it as a standalone file. Capture `.icon` with a transparent background for the 512px PNG.
5. Open `/scripts/brand-preview.html?icon&size=32` to export the favicon SVG.

The banner includes live particles, so exact particle positions may vary between captures. The capture page is a development tool and is not included in the production showcase build.

## Light and dark themes

`qivi-banner-light.png` and `qivi-banner-dark.png` are transparent browser captures; their backgrounds blend with the README page. The README selects the matching version through a `<picture>` element. Capture with `?theme=light` or `?theme=dark` and Playwright `omitBackground: true`. The showcase wordmark uses SVG `currentColor`, so it inherits the page theme without a background panel.
