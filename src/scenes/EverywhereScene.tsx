import { CHARACTERS, QiviAvatar, QiviIcon, type QiviAvatarProps, type QiviExpression } from 'qivi';
import { Icon } from '../icons';
import { useStore } from '../store';

const TILES: { title: string; props: QiviAvatarProps; code: string }[] = [
  { title: 'Qivi · Curious explorer', props: { character: CHARACTERS.qivi, expression: 'curious' }, code: '<QiviAvatar character={CHARACTERS.qivi} />' },
  { title: 'Ember · Playful star', props: { character: CHARACTERS.ember, expression: 'playful' }, code: '<QiviAvatar character={CHARACTERS.ember} />' },
  { title: 'Sage · Slow breathing', props: { character: CHARACTERS.sage }, code: '<QiviAvatar character={CHARACTERS.sage} />' },
  { title: 'Atlas · Steady shield', props: { character: CHARACTERS.atlas, expression: 'focused' }, code: '<QiviAvatar character={CHARACTERS.atlas} />' },
  { title: 'Nova · Feminine', props: { character: CHARACTERS.female, expression: 'excited' }, code: '<QiviAvatar character={CHARACTERS.female} />' },
  { title: 'Sol · Masculine', props: { character: CHARACTERS.male, expression: 'happy' }, code: '<QiviAvatar character={CHARACTERS.male} />' },
  { title: 'Glad you’re here', props: { expression: 'love' }, code: '<QiviAvatar expression="love" />' },
  { title: 'Standing guard', props: { personality: 'guardian', state: 'warning' }, code: '<QiviAvatar personality="guardian" state="warning" />' },
  { title: 'Reading the data', props: { personality: 'analyst', shape: 'hex', expression: 'focused' }, code: '<QiviAvatar personality="analyst" shape="hex" />' },
  { title: 'New idea', props: { personality: 'chaos', expression: 'excited' }, code: '<QiviAvatar personality="chaos" expression="excited" />' },
  { title: 'Custom colors', props: { theme: { deep: '#0f3b2e', mid: '#1f9d74', pale: '#b9f0d8', warm: '#ffc04d', hi: '#fff0b8', accent: '#ff8a3d' }, accent: 'always' }, code: '<QiviAvatar theme={{ deep, mid, … }} accent="always" />' },
];
const NOTIFICATIONS: { title: string; text: string; expression: QiviExpression; time: string }[] = [
  { title: 'Deploy finished', text: 'web-frontend is live in production.', expression: 'happy', time: 'now' },
  { title: 'Needs your review', text: '2 pull requests are waiting on you.', expression: 'curious', time: '4m' },
  { title: 'Budget alert', text: 'Cloud spend is 18% above forecast.', expression: 'concern', time: '1h' },
];

export function EverywhereScene() {
  const { appearance, look } = useStore();
  const character = CHARACTERS[look.character];
  return <div className="nx-everywhere">
    <section className="nx-surface-grid" aria-label="Qivi in product surfaces">
      <article className="nx-surface">
        <h3><Icon name="bell" size={18} />Notifications</h3>
        <ul className="nx-notifications">{NOTIFICATIONS.map((n, i) => <li key={n.title} style={{ '--i': i } as React.CSSProperties}>
          <QiviIcon size={36} expression={n.expression} character={character} />
          <span><strong>{n.title}</strong>{n.text}</span><time>{n.time}</time>
        </li>)}</ul>
      </article>

      <article className="nx-surface">
        <h3><Icon name="chat" size={18} />Inbox & lists</h3>
        <ul className="nx-list-rows">{(['qivi', 'female', 'male', 'atlas'] as const).map((key, i) => <li key={key}>
          <QiviIcon size={28} character={CHARACTERS[key]} expression={(['happy', 'excited', 'neutral', 'focused'] as const)[i]} />
          <span><strong>{CHARACTERS[key].name}</strong><small>{['Your daily summary is ready', 'Found 3 new ideas for you', 'Meeting moved to 3pm', 'All systems protected'][i]}</small></span>
          {i < 2 && <span className="nx-unread" aria-label="Unread" />}
        </li>)}</ul>
      </article>

      <article className="nx-surface">
        <h3><Icon name="system" size={18} />Browser & app icon</h3>
        <div className="nx-browser-tab"><span className="nx-tab-shape"><QiviIcon size={16} expression="happy" character={character} /><span>Qivi · Inbox</span><Icon name="close" size={12} /></span></div>
        <div className="nx-app-icons">{[64, 48, 32].map(size => <span key={size} className="nx-app-icon" style={{ '--s': `${size}px` } as React.CSSProperties}><QiviIcon size={Math.round(size * .78)} expression="happy" character={character} /></span>)}</div>
      </article>

      <article className="nx-surface">
        <h3><Icon name="layers" size={18} />Every size</h3>
        <div className="nx-size-ladder">
          {[16, 24, 32, 48].map(size => <figure key={size}><QiviAvatar size={size} quality="static" appearance={appearance} character={character} /><figcaption>{size}</figcaption></figure>)}
          {[64, 96].map(size => <figure key={size}><QiviAvatar size={size} appearance={appearance} character={character} autoSleep={false} /><figcaption>{size}</figcaption></figure>)}
        </div>
        <p className="nx-panel-note">Below 48px, Qivi renders a crisp vector face. Larger avatars come alive with particles and pause when offscreen.</p>
      </article>
    </section>

    <section className="nx-gallery" aria-labelledby="gallery-title">
      <h2 id="gallery-title">One component, many Qivis</h2>
      <p className="nx-lede">Eleven independent avatars, each configured with a single line.</p>
      <ul className="nx-gallery-grid">
        {TILES.map((t, i) => <li key={t.title} className="nx-tile" style={{ '--i': i } as React.CSSProperties}>
          <div className="nx-tile-avatar"><QiviAvatar size={128} appearance={appearance} autoSleep={false} interactive={false} {...t.props} /></div>
          <strong>{t.title}</strong><code>{t.code}</code>
        </li>)}
      </ul>
    </section>
  </div>;
}
