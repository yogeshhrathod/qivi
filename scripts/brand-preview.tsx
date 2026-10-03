import { createRoot } from "react-dom/client";
import { QiviAvatar, QiviIcon } from "../library/qivi/src/index";
import "../library/qivi/src/qivi.css";

// Capture this page in a real browser; all avatar visuals come from the library.
const options = new URLSearchParams(location.search);
const icon = options.has("icon");
const social = options.has("social"); // 1280×640 GitHub/OG social preview
const dark = social || options.get("theme") === "dark";
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
  .social { width: 1280px; height: 640px; background: radial-gradient(110% 90% at 72% 45%, #0d1640 0%, #070b20 55%, #03050d 100%); }
  .social .copy { left: 88px; top: 150px; }
  .social h1 { font-size: 112px; }
  .social .tagline { font-size: 34px; }
  .social .detail { font-size: 22px; }
  .social .avatar { left: 700px; top: 80px; width: 480px; height: 480px; }
  .install { display: inline-block; margin-top: 34px; padding: 12px 22px; border-radius: 12px; background: rgba(20,30,72,0.85);
    border: 1px solid #24305f; font: 500 24px "SF Mono", Menlo, monospace; color: #e8ecf7; }
  .social .signature { left: 88px; bottom: 44px; font-size: 18px; }
`;
document.head.append(style);
createRoot(document.getElementById("root")!).render(
  icon ? <main className="icon"><QiviIcon size={iconSize} personality="core" theme="default" title="Qivi" /></main> :
  <main className={social ? "banner social" : "banner"}>
    <div className="copy">
      <h1>Qivi<span className="dot">.</span></h1>
      <p className="tagline">A little presence.<br />A lot of personality.</p>
      <p className="detail">An expressive particle companion for React.</p>
      {social && <code className="install">npm i qivi-react</code>}
    </div>
    <div className="avatar">
      <QiviAvatar size={social ? 480 : 340} personality="core" theme="default" state="idle" expression="neutral"
        appearance={dark ? "dark" : "light"} quality="high" accent="always" glyphs={false} interactive={false}
        autoSleep={false} autoEmote={false} reducedMotion={false} />
    </div>
    <span className="signature">{social ? "github.com/yogeshhrathod/qivi · MIT" : "Real particles. Rendered by qivi-react."}</span>
  </main>
);
