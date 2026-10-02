import { createRoot } from "react-dom/client";
import { QiviAvatar, QiviIcon } from "../library/qivi/src/index";
import "../library/qivi/src/qivi.css";

// Capture this page in a real browser; all avatar visuals come from the library.
const options = new URLSearchParams(location.search);
const icon = options.has("icon");
const dark = options.get("theme") === "dark";
const iconSize = Number(options.get("size")) || 512;
const style = document.createElement("style");
style.textContent = `
  * { box-sizing: border-box; }
  body { margin: 0; background: transparent; }
  .banner { width: 1200px; height: 440px; position: relative; overflow: hidden;
    background: transparent; color: ${dark ? "#e8ecf7" : "#16245e"}; font-family: "Avenir Next", "Segoe UI", sans-serif; }
  .copy { position: absolute; left: 72px; top: 72px; z-index: 2; }
  h1 { font-size: 88px; letter-spacing: -5px; line-height: 1; margin: 0 0 28px; font-weight: 700; }
  .dot { color: #f2453a; }
  .tagline { font-size: 29px; line-height: 1.35; letter-spacing: -.6px; margin: 0; }
  .detail { font-size: 16px; color: ${dark ? "#aebbd8" : "#586988"}; margin: 22px 0 0; }
  .signature { position: absolute; bottom: 34px; left: 72px; color: ${dark ? "#aebbd8" : "#586988"}; font-size: 13px; }
  .avatar { position: absolute; left: 695px; top: 45px; width: 340px; height: 340px; }
  .icon { width: 512px; height: 512px; display: grid; place-items: center; }
`;
document.head.append(style);
createRoot(document.getElementById("root")!).render(
  icon ? <main className="icon"><QiviIcon size={iconSize} personality="core" theme="default" title="Qivi" /></main> :
  <main className="banner">
    <div className="copy">
      <h1>Qivi<span className="dot">.</span></h1>
      <p className="tagline">A little presence.<br />A lot of personality.</p>
      <p className="detail">An expressive particle companion for React.</p>
    </div>
    <div className="avatar">
      <QiviAvatar size={340} personality="core" theme="default" state="idle" expression="neutral"
        appearance={dark ? "dark" : "light"} quality="high" accent="always" glyphs={false} interactive={false}
        autoSleep={false} autoEmote={false} reducedMotion={false} />
    </div>
    <span className="signature">Real particles. Rendered by @yogeshhrathod/qivi.</span>
  </main>
);
