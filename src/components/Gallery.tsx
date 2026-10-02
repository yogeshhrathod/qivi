import { QiviAvatar, CHARACTERS, type QiviAvatarProps } from "@yogeshhrathod/qivi";

interface Props {
  appearance: "light" | "dark";
  reducedMotion: boolean | "auto";
}

const TILES: { title: string; props: QiviAvatarProps; code: string }[] = [
  { title: "Qivi · Curious explorer", props: { character: CHARACTERS.qivi, expression: "curious" }, code: `<QiviAvatar character={CHARACTERS.qivi} />` },
  { title: "Ember · Playful star", props: { character: CHARACTERS.ember, expression: "playful" }, code: `<QiviAvatar character={CHARACTERS.ember} />` },
  { title: "Sage · Slow breathing", props: { character: CHARACTERS.sage }, code: `<QiviAvatar character={CHARACTERS.sage} />` },
  { title: "Atlas · Steady shield", props: { character: CHARACTERS.atlas, expression: "focused" }, code: `<QiviAvatar character={CHARACTERS.atlas} />` },
  { title: "Nova · Female version", props: { character: CHARACTERS.female, expression: "excited" }, code: `<QiviAvatar character={CHARACTERS.female} />` },
  { title: "Sol · Male version", props: { character: CHARACTERS.male, expression: "happy" }, code: `<QiviAvatar character={CHARACTERS.male} />` },
  { title: "Glad you're here", props: { expression: "love" }, code: `<QiviAvatar expression="love" />` },
  { title: "Standing guard", props: { personality: "guardian", state: "warning" }, code: `<QiviAvatar personality="guardian" state="warning" />` },
  { title: "Reading the data", props: { personality: "analyst", shape: "hex", expression: "focused" }, code: `<QiviAvatar personality="analyst" shape="hex" />` },
  { title: "New idea", props: { personality: "chaos", expression: "excited" }, code: `<QiviAvatar personality="chaos" expression="excited" />` },
  { title: "Custom colors", props: { theme: { deep: "#0f3b2e", mid: "#1f9d74", pale: "#b9f0d8", warm: "#ffc04d", hi: "#fff0b8", accent: "#ff8a3d" }, accent: "always" }, code: `<QiviAvatar theme={{ deep, mid, … }} accent="always" />` },
];

/** Several independent QiviAvatar instances: each one is its own customizable component. */
export function Gallery({ appearance, reducedMotion }: Props) {
  return (
    <section className="gallery" aria-label="QiviAvatar examples">
      <h2>One component, many Qivis</h2>
      <div className="gallery-grid">
        {TILES.map((t) => (
          <figure key={t.title} className="tile">
            <QiviAvatar size={150} appearance={appearance} reducedMotion={reducedMotion} autoSleep={false} {...t.props} />
            <figcaption>
              <span className="tile-title">{t.title}</span>
              <code>{t.code}</code>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
