import { useDialogDismiss } from "./useDialogDismiss";
import { OptionIcon } from "./OptionIcon";
import { useEffect, useRef, useState } from 'react';
import { ControlIcon } from './ControlIcon';
import { FeaturePlayground } from './FeaturePlayground';

export function PlaygroundDialog({ onClose, appearance, reducedMotion }: {
  onClose: () => void; appearance: 'light' | 'dark'; reducedMotion: boolean | 'auto';
}) {
  const [settingsOpen, setSettingsOpen] = useState(() => window.matchMedia('(min-width: 900px)').matches);
  const { closing, dismiss } = useDialogDismiss(onClose);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current!;
    const overflow = document.body.style.overflow;
    element.showModal();
    document.body.style.overflow = 'hidden';
    return () => { element.close(); document.body.style.overflow = overflow; };
  }, []);
  return <dialog ref={dialog} className={`playground-dialog ${closing ? "is-closing" : ""}`} aria-label="Avatar feature playground" onCancel={event => { event.preventDefault(); dismiss(); }}>
    <div className="playground-dialog-header"><span>Avatar playground</span><div className="dialog-actions"><button type="button" className="header-icon" aria-label="Playground settings" title="Live configuration" aria-expanded={settingsOpen} onClick={() => setSettingsOpen(open => !open)}><ControlIcon kind="settings" /></button><button type="button" onClick={() => dismiss()} autoFocus><OptionIcon name="back" />Back to showcase</button></div></div>
    <FeaturePlayground settingsOpen={settingsOpen} appearance={appearance} reducedMotion={reducedMotion} />
  </dialog>;
}
