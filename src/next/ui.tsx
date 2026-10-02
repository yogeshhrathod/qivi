import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Icon, type IconName } from './icons';

/** Native modal dialog: bottom sheet on phones, side drawer on wide screens. Animates out before unmounting. */
export function Sheet({ title, subtitle, onClose, children, footer, side = 'right', wide = false }: {
  title: string; subtitle?: string; onClose: () => void; children: ReactNode; footer?: ReactNode; side?: 'right' | 'center'; wide?: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [closing, setClosing] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const titleId = useId();
  useEffect(() => {
    const element = dialog.current!;
    element.showModal();
    return () => { if (timer.current) clearTimeout(timer.current); element.close(); };
  }, []);
  function dismiss() {
    if (timer.current) return;
    if (document.documentElement.classList.contains('nx-reduce')) { onClose(); return; }
    setClosing(true);
    timer.current = setTimeout(onClose, 220);
  }
  return <dialog ref={dialog} className={`nx-sheet nx-sheet-${side} ${wide ? 'is-wide' : ''} ${closing ? 'is-closing' : ''}`} aria-labelledby={titleId}
    onCancel={event => { event.preventDefault(); dismiss(); }}
    onClick={event => { if (event.target === dialog.current) dismiss(); }}>
    <div className="nx-sheet-body">
      <div className="nx-sheet-handle" aria-hidden="true" />
      <header className="nx-sheet-header">
        <div><h2 id={titleId}>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>
        <IconButton icon="close" label={`Close ${title.toLowerCase()}`} onClick={dismiss} />
      </header>
      <div className="nx-sheet-scroll">{children}</div>
      {footer && <footer className="nx-sheet-footer">{footer}</footer>}
    </div>
  </dialog>;
}

export function IconButton({ icon, label, onClick, pressed, className, disabled, expanded }: {
  icon: IconName; label: string; onClick?: () => void; pressed?: boolean; className?: string; disabled?: boolean; expanded?: boolean;
}) {
  return <button type="button" className={`nx-icon-btn ${className ?? ''}`} aria-label={label} title={label} aria-pressed={pressed} aria-expanded={expanded} disabled={disabled} onClick={onClick}>
    <Icon name={icon} />
  </button>;
}

export function Field({ label, icon, hint, children }: { label: string; icon?: IconName; hint?: string; children: ReactNode }) {
  return <fieldset className="nx-field">
    <legend>{icon && <Icon name={icon} size={16} />}{label}{hint && <span className="nx-field-hint">{hint}</span>}</legend>
    {children}
  </fieldset>;
}

export function Chips<T extends string>({ options, value, onChange, label, render, scroll = false }: {
  options: readonly T[]; value: T | null; onChange: (value: T) => void; label: string; render?: (value: T) => ReactNode; scroll?: boolean;
}) {
  return <div className={`nx-chips ${scroll ? 'is-scroll' : ''}`} role="group" aria-label={label}>
    {options.map(option => <button key={option} type="button" className="nx-chip" aria-pressed={value === option} onClick={() => onChange(option)}>{render ? render(option) : option}</button>)}
  </div>;
}

export function Segmented<T extends string>({ options, value, onChange, label }: {
  options: readonly { value: T; label: string; icon?: IconName }[]; value: T; onChange: (value: T) => void; label: string;
}) {
  const index = Math.max(0, options.findIndex(option => option.value === value));
  return <div className="nx-segmented" role="group" aria-label={label} style={{ '--count': options.length, '--index': index } as React.CSSProperties}>
    <span className="nx-segmented-thumb" aria-hidden="true" />
    {options.map(option => <button key={option.value} type="button" aria-pressed={value === option.value} onClick={() => onChange(option.value)}>
      {option.icon && <Icon name={option.icon} size={16} />}<span>{option.label}</span>
    </button>)}
  </div>;
}

export function Slider({ label, value, min, max, step, onChange, format, disabled }: {
  label: string; value: number; min: number; max: number; step: number; onChange: (value: number) => void; format?: (value: number) => string; disabled?: boolean;
}) {
  const id = useId();
  const text = format ? format(value) : Number.isInteger(value) ? String(value) : value.toFixed(2);
  return <div className="nx-slider" style={{ '--fill': `${((value - min) / (max - min)) * 100}%` } as React.CSSProperties}>
    <label htmlFor={id}><span>{label}</span><output htmlFor={id}>{text}</output></label>
    <input id={id} type="range" min={min} max={max} step={step} value={value} disabled={disabled} aria-valuetext={text} onChange={event => onChange(+event.target.value)} />
  </div>;
}

export function Toggle({ label, checked, onChange, description }: { label: string; checked: boolean; onChange: (value: boolean) => void; description?: string }) {
  return <label className="nx-toggle">
    <span className="nx-toggle-text"><span>{label}</span>{description && <small>{description}</small>}</span>
    <input type="checkbox" role="switch" checked={checked} onChange={event => onChange(event.target.checked)} />
    <span className="nx-toggle-track" aria-hidden="true"><span /></span>
  </label>;
}

export function useCopy() {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  async function copy(text: string) {
    try { await navigator.clipboard.writeText(text); setCopied(true); }
    catch { setCopied(false); return false; }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1800);
    return true;
  }
  return { copied, copy };
}

export function CodeBlock({ code, label = 'Code', compact = false }: { code: string; label?: string; compact?: boolean }) {
  const { copied, copy } = useCopy();
  const [failed, setFailed] = useState(false);
  return <figure className={`nx-code ${compact ? 'is-compact' : ''}`}>
    <figcaption><span><Icon name="terminal" size={16} />{label}</span>
      <button type="button" className="nx-code-copy" onClick={async () => setFailed(!(await copy(code)))} aria-live="polite">
        <Icon name={copied ? 'check' : 'copy'} size={16} />{copied ? 'Copied' : failed ? 'Select to copy' : 'Copy'}
      </button>
    </figcaption>
    <pre tabIndex={0}><code>{code}</code></pre>
  </figure>;
}

export function PageHeader({ eyebrow, title, text, icon, children }: { eyebrow?: string; title: ReactNode; text?: string; icon?: IconName; children?: ReactNode }) {
  return <header className="nx-page-header">
    <div>
      {eyebrow && <p className="nx-eyebrow">{icon && <Icon name={icon} size={16} />}{eyebrow}</p>}
      <h1>{title}</h1>
      {text && <p className="nx-lede">{text}</p>}
    </div>
    {children}
  </header>;
}
