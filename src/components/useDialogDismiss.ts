import { useEffect, useRef, useState } from 'react';

/** Allow a dialog's exit transition to finish before restoring focus and unmounting. */
export function useDialogDismiss(onClose: () => void) {
  const [closing, setClosing] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  function dismiss(afterClose = onClose) {
    if (timer.current) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { afterClose(); return; }
    setClosing(true);
    timer.current = setTimeout(afterClose, 160);
  }
  return { closing, dismiss };
}
