import { useEffect, useState } from 'react';

const KEYBOARD_THRESHOLD = 150;

function editableFocused() {
  const el = document.activeElement as HTMLElement | null;
  if (!el) return false;
  if (el.isContentEditable || el.tagName === 'TEXTAREA') return true;
  return el.tagName === 'INPUT' && !/^(button|checkbox|radio|range|color|file|submit|reset|image)$/i.test((el as HTMLInputElement).type);
}

/**
 * Pins the app shell to the visual viewport and detects software keyboards.
 * Writes --vvh / --vv-top and toggles html[data-keyboard="open"]; returns whether the keyboard is open.
 */
export function useViewport() {
  const [keyboard, setKeyboard] = useState(false);
  useEffect(() => {
    const root = document.documentElement;
    const vv = window.visualViewport;
    let baseline = vv?.height ?? window.innerHeight;
    let orientation = screen.orientation?.type ?? String(window.innerWidth > window.innerHeight);
    let frame = 0;

    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const height = vv?.height ?? window.innerHeight;
        const nextOrientation = screen.orientation?.type ?? String(window.innerWidth > window.innerHeight);
        if (nextOrientation !== orientation) { orientation = nextOrientation; baseline = height; }
        const focused = editableFocused();
        if (!focused || height > baseline) baseline = height;
        const open = focused && baseline - height > KEYBOARD_THRESHOLD;
        root.style.setProperty('--vvh', `${Math.round(height)}px`);
        root.style.setProperty('--vv-top', `${Math.round(vv?.offsetTop ?? 0)}px`);
        root.dataset.keyboard = open ? 'open' : 'closed';
        setKeyboard(open);
      });
    };

    update();
    vv?.addEventListener('resize', update);
    vv?.addEventListener('scroll', update);
    window.addEventListener('resize', update);
    document.addEventListener('focusin', update);
    // Focus leaves before the keyboard finishes closing; update again once it has.
    const blur = () => { update(); setTimeout(update, 320); };
    document.addEventListener('focusout', blur);
    return () => {
      cancelAnimationFrame(frame);
      vv?.removeEventListener('resize', update);
      vv?.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      document.removeEventListener('focusin', update);
      document.removeEventListener('focusout', blur);
      root.style.removeProperty('--vvh');
      root.style.removeProperty('--vv-top');
      delete root.dataset.keyboard;
    };
  }, []);
  return keyboard;
}

export function useMedia(query: string) {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setMatches(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, [query]);
  return matches;
}
