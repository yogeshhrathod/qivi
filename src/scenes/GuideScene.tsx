import { useRef, useState } from 'react';
import { QiviAvatar, type QiviAvatarHandle, type QiviExpression } from 'qivi-react';
import { Icon, type IconName } from '../icons';
import { useLookProps, useStore } from '../store';

type Target = 'welcome' | 'nav' | 'stats' | 'create' | 'done';
const STEPS: { target: Target; title: string; text: string; expression: QiviExpression }[] = [
  { target: 'welcome', title: 'Welcome aboard', text: 'I’ll show you around this workspace. It takes four steps.', expression: 'happy' },
  { target: 'nav', title: 'Find your way', text: 'Projects, billing and settings all live in the sidebar.', expression: 'curious' },
  { target: 'stats', title: 'Numbers at a glance', text: 'These cards update live, so you always know where things stand.', expression: 'focused' },
  { target: 'create', title: 'Start something new', text: 'Press New project whenever inspiration strikes.', expression: 'excited' },
  { target: 'done', title: 'That’s the tour', text: 'I’ll stay nearby if you need me. Happy building!', expression: 'love' },
];
const NAV: { label: string; icon: IconName }[] = [{ label: 'Home', icon: 'layers' }, { label: 'Projects', icon: 'package' }, { label: 'Billing', icon: 'form' }, { label: 'Settings', icon: 'studio' }];

export function GuideScene() {
  const lookProps = useLookProps();
  const { look } = useStore();
  const avatar = useRef<QiviAvatarHandle>(null);
  const [step, setStep] = useState(0);
  const [spots, setSpots] = useState<Partial<Record<Target, HTMLElement | null>>>({});
  const binders = useRef(new Map<Target, (el: HTMLElement | null) => void>());
  const bind = (key: Target) => {
    let fn = binders.current.get(key);
    if (!fn) { fn = el => setSpots(m => (m[key] === el ? m : { ...m, [key]: el })); binders.current.set(key, fn); }
    return fn;
  };
  function go(index: number) {
    const next = Math.max(0, Math.min(STEPS.length - 1, index));
    setStep(next);
    avatar.current?.impulse(next === STEPS.length - 1 ? ['bounce', 'sweep'] : 'anticipate');
  }
  const current = STEPS[step];
  const focusTarget = (target: Target) => go(STEPS.findIndex(s => s.target === target));

  return <div className="nx-scene nx-guide">
    <QiviAvatar ref={avatar} {...lookProps} layer="viewport" anchor={spots[current.target] ?? null} particles={12000} expression={current.expression} state={step === 0 ? 'idle' : 'answering'} autoSleep={false}
      style={{ position: 'absolute', width: 0, height: 0 }} />

    <div className="nx-guide-app" data-step={current.target} aria-label="Example workspace">
      <header className="nx-guide-top"><span className="nx-guide-logo"><Icon name="layers" size={18} />Northwind</span><span className="nx-guide-search"><Icon name="search" size={16} />Search</span><span className="nx-guide-user" aria-hidden="true">AL</span></header>
      <aside className={`nx-guide-nav ${current.target === 'nav' ? 'is-target' : ''}`}>
        {NAV.map((item, i) => <button key={item.label} type="button" className={i === 0 ? 'is-active' : ''} onClick={() => focusTarget('nav')}><Icon name={item.icon} size={18} /><span>{item.label}</span></button>)}
        <span className="nx-guide-spot is-nav" ref={bind('nav')} />
      </aside>
      <section className="nx-guide-main">
        <div className="nx-guide-hello"><h3>Good morning, Ada</h3><p>Here’s what happened while you were away.</p><span className="nx-guide-spot is-welcome" ref={bind('welcome')} /></div>
        <div className={`nx-guide-stats ${current.target === 'stats' ? 'is-target' : ''}`}>
          {[['Active', '12', 'zap'], ['Visitors', '4.2k', 'eye'], ['Uptime', '99.9%', 'gauge']].map(([label, value, icon]) => <div key={label}><Icon name={icon as IconName} size={16} /><small>{label}</small><strong>{value}</strong></div>)}
          <span className="nx-guide-spot is-stats" ref={bind('stats')} />
        </div>
        <div className="nx-guide-chart" aria-hidden="true">{[38, 52, 44, 68, 60, 82, 74, 90].map((h, i) => <i key={i} style={{ height: `${h}%`, '--i': i } as React.CSSProperties} />)}</div>
        <div className="nx-guide-create">
          <button type="button" className={`nx-btn nx-btn-primary ${current.target === 'create' ? 'is-target' : ''}`} onClick={() => focusTarget('create')}><Icon name="sparkle" size={18} />New project</button>
          <span className="nx-guide-spot is-create" ref={bind('create')} />
        </div>
      </section>
      <span className="nx-guide-spot is-done" ref={bind('done')} />
    </div>

    <div className="nx-guide-card" aria-live="polite">
      <div className="nx-guide-card-text"><small>Step {step + 1} of {STEPS.length} · {look.name}</small><h3>{current.title}</h3><p>{current.text}</p></div>
      <div className="nx-guide-controls">
        <div className="nx-dots" role="group" aria-label="Tour steps">{STEPS.map((s, i) => <button key={s.target} type="button" aria-label={`Step ${i + 1}: ${s.title}`} aria-pressed={i === step} onClick={() => go(i)}><span /></button>)}</div>
        <button type="button" className="nx-btn" onClick={() => go(step - 1)} disabled={step === 0}><Icon name="left" size={16} />Back</button>
        {step < STEPS.length - 1
          ? <button type="button" className="nx-btn nx-btn-primary" onClick={() => go(step + 1)}>Next<Icon name="right" size={16} /></button>
          : <button type="button" className="nx-btn nx-btn-primary" onClick={() => go(0)}><Icon name="reset" size={16} />Restart</button>}
      </div>
    </div>
  </div>;
}
