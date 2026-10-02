import { useDialogDismiss } from "./useDialogDismiss";
import { useEffect, useRef } from 'react';
import { QiviAvatar } from '@yogeshhrathod/qivi';
import { Gallery } from './Gallery';
import { ControlIcon } from './ControlIcon';

export function ExamplesDialog({ onClose, appearance, reducedMotion }: { onClose: () => void; appearance: 'light' | 'dark'; reducedMotion: boolean | 'auto' }) {
  const { closing, dismiss } = useDialogDismiss(onClose);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { const element = dialog.current!; element.showModal(); return () => element.close(); }, []);
  return <dialog ref={dialog} className={`examples-dialog ${closing ? "is-closing" : ""}`} aria-labelledby="examples-title" onCancel={event => { event.preventDefault(); dismiss(); }}>
    <header className="examples-header"><div><h2 id="examples-title">A feeling for every moment</h2><p>Real particles. Independent personalities. One component.</p></div><button className="header-icon" aria-label="Close avatar examples" onClick={() => dismiss()}><ControlIcon kind="close" /></button></header>
    <div className="examples-content"><Gallery appearance={appearance} reducedMotion={reducedMotion} /><div className="sizes" aria-label="Size variants">{[16, 24, 32, 48].map(size => <figure key={size}><QiviAvatar size={size} quality="static" appearance={appearance} /><figcaption>{size}px</figcaption></figure>)}<p>Small avatars use a vector version of the same face. Larger avatars come alive with particles.</p></div></div>
  </dialog>;
}
