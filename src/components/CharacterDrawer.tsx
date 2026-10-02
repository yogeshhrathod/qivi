import { useDialogDismiss } from "./useDialogDismiss";
import { useEffect, useRef, useState } from 'react';
import { CHARACTERS, QiviAvatar, type QiviExpression } from '@yogeshhrathod/qivi';
import { ControlIcon } from './ControlIcon';
import { OptionIcon } from './OptionIcon';
import './character-drawer.css';

type CharacterKey = keyof typeof CHARACTERS;
const keys = Object.keys(CHARACTERS) as CharacterKey[];
interface Props {
  selected: CharacterKey;
  previews: Record<CharacterKey, { expression: QiviExpression; description: string }>;
  appearance: 'light' | 'dark';
  reducedMotion: boolean | 'auto';
  onSelect: (key: CharacterKey) => void;
  onClose: () => void;
}

export function CharacterDrawer({ selected, previews, appearance, reducedMotion, onSelect, onClose }: Props) {
  const { closing, dismiss } = useDialogDismiss(onClose);
  const dialog = useRef<HTMLDialogElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(keys.indexOf(selected));
  const initial = useRef(index);
  const motion = reducedMotion === true || (reducedMotion === 'auto' && matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const element = dialog.current!;
    element.showModal();
    const el = track.current!;
    el.scrollLeft = initial.current * el.clientWidth;
    return () => element.close();
  }, []);
  function go(next: number) {
    const value = (next + keys.length) % keys.length;
    track.current?.scrollTo({ left: value * track.current.clientWidth, behavior: motion ? 'auto' : 'smooth' });
  }
  const current = keys[index];
  return <dialog ref={dialog} className={`character-drawer ${closing ? "is-closing" : ""}`} id="hero-characters" aria-labelledby="character-drawer-title" onCancel={event => { event.preventDefault(); dismiss(); }} onClick={event => { if (event.target === dialog.current) { const rect = dialog.current.getBoundingClientRect(); if (event.clientY < rect.top || event.clientX < rect.left || event.clientX > rect.right) dismiss(); } }}>
    <div className="character-drawer-handle" aria-hidden="true" />
    <header className="character-drawer-header"><div><h2 id="character-drawer-title">Choose your companion</h2><p>Swipe or use the arrows to explore.</p></div><button className="header-icon" aria-label="Close character chooser" onClick={() => dismiss()}><ControlIcon kind="close" /></button></header>
    <div className="character-carousel" role="region" aria-roledescription="carousel" aria-label="Live character previews" onKeyDown={event => { if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { event.preventDefault(); go(index + (event.key === 'ArrowRight' ? 1 : -1)); } }}>
      <button className="header-icon carousel-arrow" aria-label="Previous character" onClick={() => go(index - 1)}><OptionIcon name="back" /></button>
      <div ref={track} className="character-carousel-track" tabIndex={0} aria-label="Swipe through characters" onScroll={event => { const el = event.currentTarget; setIndex(Math.max(0, Math.min(keys.length - 1, Math.round(el.scrollLeft / el.clientWidth)))); }}>
        {keys.map((key, i) => <div key={key} className="character-slide" role="group" aria-roledescription="slide" aria-label={`${i + 1} of ${keys.length}: ${CHARACTERS[key].name}`} inert={index !== i}>
          <div className="character-live-preview">{Math.abs(index - i) <= 1 && <QiviAvatar character={CHARACTERS[key]} expression={previews[key].expression} size="100%" particles={1600} appearance={appearance} reducedMotion={reducedMotion} autoSleep={false} interactive={false} />}</div>
          <h3>{CHARACTERS[key].name}</h3><p>{previews[key].description}</p>
        </div>)}
      </div>
      <button className="header-icon carousel-arrow" aria-label="Next character" onClick={() => go(index + 1)}><span className="carousel-next"><OptionIcon name="back" /></span></button>
    </div>
    <div className="character-carousel-dots" role="group" aria-label="Jump to character">{keys.map((key, i) => <button key={key} aria-label={`Preview ${CHARACTERS[key].name}`} aria-pressed={index === i} onClick={() => go(i)}><span /></button>)}</div>
    <footer className="character-drawer-footer"><span aria-live="polite">{index + 1} / {keys.length}{selected === current ? ' · Current character' : ''}</span><button className="character-use" onClick={() => dismiss(() => onSelect(current))}><OptionIcon name="person" />Use {CHARACTERS[current].name}</button></footer>
  </dialog>;
}
