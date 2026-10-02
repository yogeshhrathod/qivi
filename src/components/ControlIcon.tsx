export function ControlIcon({ kind }: { kind: 'settings' | 'playground' | 'close' }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {kind === 'settings' ? <><path d="M4 7h16M4 17h16" /><circle cx="9" cy="7" r="3" fill="var(--canvas)" /><circle cx="15" cy="17" r="3" fill="var(--canvas)" /></> : kind === 'close' ? <path d="m6 6 12 12M18 6 6 18" /> : <><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8" /><circle cx="12" cy="12" r="3" /></>}
  </svg>;
}
