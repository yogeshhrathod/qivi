import { useEffect, useRef, useState } from 'react';
import { CHARACTERS, PALETTES, PERSONALITIES, QiviAvatar, QiviIcon, type QiviThemeName } from 'qivi';
import { Icon } from '../icons';
import { href } from '../router';
import { CHARACTER_INFO, CHARACTER_KEYS, useStore } from '../store';
import { PageHeader } from '../ui';

export function CharactersPage() {
  const { look, chooseCharacter, appearance, reduceMotion } = useStore();
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(() => CHARACTER_KEYS.indexOf(look.character));
  const [chosen, setChosen] = useState<string | null>(null);
  const initial = useRef(index);
  useEffect(() => { const el = track.current!; el.scrollLeft = initial.current * el.clientWidth; }, []);

  function go(next: number) {
    const value = (next + CHARACTER_KEYS.length) % CHARACTER_KEYS.length;
    track.current?.scrollTo({ left: value * track.current.clientWidth, behavior: reduceMotion ? 'auto' : 'smooth' });
  }
  const key = CHARACTER_KEYS[index];
  const selected = look.character === key;
  const activePalette = PALETTES[(CHARACTERS[key].theme as QiviThemeName) ?? 'default'];

  return <div className="nx-page nx-characters">
    <PageHeader eyebrow="Six ready-made identities" icon="characters" title="Meet the cast." text="Each character has its own silhouette, palette, gaze, breathing and personality. Swipe, use the arrows, or pick a face." />

    <div className="nx-carousel" role="region" aria-roledescription="carousel" aria-label="Characters"
      onKeyDown={event => { if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { event.preventDefault(); go(index + (event.key === 'ArrowRight' ? 1 : -1)); } }}>
      <div className="nx-carousel-stage" style={{ '--c-mid': activePalette.mid, '--c-warm': activePalette.warm } as React.CSSProperties}>
        <span className="nx-spotlight" aria-hidden="true" />
        {/* One avatar that morphs between characters as you swipe. */}
        <QiviAvatar character={CHARACTERS[key]} expression={CHARACTER_INFO[key].expression} size="100%" particles={20000} appearance={appearance} reducedMotion={look.reducedMotion} autoSleep={false} interactive={false} />
      </div>
      <button type="button" className="nx-carousel-arrow is-prev" aria-label="Previous character" onClick={() => go(index - 1)}><Icon name="left" /></button>
      <div ref={track} className="nx-carousel-track" tabIndex={0} aria-label="Swipe through characters"
        onScroll={event => { const el = event.currentTarget; setIndex(Math.max(0, Math.min(CHARACTER_KEYS.length - 1, Math.round(el.scrollLeft / el.clientWidth)))); }}>
        {CHARACTER_KEYS.map((k, i) => {
          const c = CHARACTERS[k];
          const palette = PALETTES[(c.theme as QiviThemeName) ?? 'default'];
          return <div key={k} className={`nx-slide ${index === i ? 'is-active' : ''}`} role="group" aria-roledescription="slide" aria-label={`${i + 1} of ${CHARACTER_KEYS.length}: ${c.name}`} inert={index !== i}>
            {/* Empty swipe area; the live avatar is drawn above the track so its particles are never clipped. */}
            <div className="nx-slide-preview" aria-hidden="true" />
            <div className="nx-slide-info">
              <p className="nx-eyebrow">{PERSONALITIES[c.personality].label} personality</p>
              <h2>{c.name}</h2>
              <p className="nx-slide-tagline">{CHARACTER_INFO[k].tagline}. {PERSONALITIES[c.personality].blurb}.</p>
              <ul className="nx-traits">{CHARACTER_INFO[k].traits.map(t => <li key={t}>{t}</li>)}</ul>
              <div className="nx-palette" aria-label={`${c.theme} palette`}>{Object.entries(palette).map(([name, color]) => <span key={name} style={{ background: color }} title={`${name} ${color}`} />)}</div>
            </div>
          </div>;
        })}
      </div>
      <button type="button" className="nx-carousel-arrow is-next" aria-label="Next character" onClick={() => go(index + 1)}><Icon name="right" /></button>
    </div>

    <div className="nx-cast-picker" role="group" aria-label="Jump to character">
      {CHARACTER_KEYS.map((k, i) => <button key={k} type="button" aria-pressed={index === i} aria-label={`Preview ${CHARACTERS[k].name}`} onClick={() => go(i)}>
        <QiviIcon size={40} character={CHARACTERS[k]} expression={CHARACTER_INFO[k].expression} />
        <span>{CHARACTERS[k].name}</span>{look.character === k && <span className="nx-current-dot" aria-label="current" />}
      </button>)}
    </div>

    <div className="nx-characters-action">
      <span aria-live="polite">{chosen ? `${chosen} is now your companion everywhere.` : selected ? `${CHARACTERS[key].name} is your current companion.` : `${index + 1} of ${CHARACTER_KEYS.length}`}</span>
      {selected
        ? <a className="nx-btn nx-btn-primary" href={href('chat')}><Icon name="chat" size={18} />Chat with {CHARACTERS[key].name}</a>
        : <button type="button" className="nx-btn nx-btn-primary" onClick={() => { chooseCharacter(key); setChosen(CHARACTERS[key].name); }}><Icon name="check" size={18} />Choose {CHARACTERS[key].name}</button>}
      <a className="nx-btn" href={href('studio')}><Icon name="studio" size={18} />Customize</a>
    </div>
  </div>;
}
