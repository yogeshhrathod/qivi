import { useRef, useState } from 'react';
import { EXPRESSIONS, QiviAvatar, QiviIcon, STATES, type QiviAvatarHandle, type QiviExpression, type QiviImpulse, type QiviState } from 'qivi';
import { Icon, type IconName } from '../icons';
import { useLookProps } from '../store';
import { Segmented, Slider } from '../ui';

const EXPRESSION_KEYS = Object.keys(EXPRESSIONS) as QiviExpression[];
const STATE_KEYS = (Object.keys(STATES) as QiviState[]);
const STATE_ICON: Record<QiviState, IconName> = {
  idle: 'smile', listening: 'mic', thinking: 'sparkle', searching: 'search', analyzing: 'gauge', found: 'eye',
  answering: 'chat', talking: 'speaker', success: 'success', warning: 'alert', error: 'error', dissolving: 'moon',
};
const IMPULSES: { kind: QiviImpulse; hint: string }[] = [
  { kind: 'bounce', hint: 'Happy hop' }, { kind: 'burst', hint: 'Particles fly out' }, { kind: 'surprise', hint: 'Startled jump' },
  { kind: 'flick', hint: 'Playful flick' }, { kind: 'anticipate', hint: 'Wind-up' }, { kind: 'glitch', hint: 'Digital stutter' },
  { kind: 'ripple', hint: 'Wave through body' }, { kind: 'sweep', hint: 'Shimmer pass' }, { kind: 'shiver', hint: 'Nervous shake' },
];

export function FeelingsScene() {
  const lookProps = useLookProps();
  const avatar = useRef<QiviAvatarHandle>(null);
  const [tab, setTab] = useState<'expressions' | 'states' | 'gestures'>('expressions');
  const [expression, setExpression] = useState<QiviExpression>('happy');
  const [state, setState] = useState<QiviState>('idle');
  const [strength, setStrength] = useState(1);
  const [lastImpulse, setLastImpulse] = useState<QiviImpulse | null>(null);

  return <div className="nx-scene nx-feelings">
    <div className="nx-scene-stage">
      <span className="nx-spotlight" aria-hidden="true" />
      <QiviAvatar ref={avatar} {...lookProps} size="100%" particles={20000} expression={expression} state={state} expressionStrength={strength} autoSleep={false} />
      <p className="nx-stage-caption" role="status"><b>{EXPRESSIONS[expression].label}</b> feeling · <b>{STATES[state].label}</b> state{lastImpulse ? <> · {lastImpulse}</> : null}</p>
    </div>

    <div className="nx-scene-panel">
      <Segmented label="Explore" value={tab} onChange={setTab} options={[{ value: 'expressions', label: 'Feelings', icon: 'smile' }, { value: 'states', label: 'States', icon: 'gauge' }, { value: 'gestures', label: 'Gestures', icon: 'zap' }]} />

      {tab === 'expressions' && <>
        <ul className="nx-face-grid" aria-label="Expressions">
          {EXPRESSION_KEYS.map((key, i) => <li key={key} style={{ '--i': i } as React.CSSProperties}><button type="button" aria-pressed={expression === key} onClick={() => setExpression(key)}>
            <QiviIcon size={44} expression={key} character={lookProps.character} theme={lookProps.theme} />
            <span>{EXPRESSIONS[key].label}</span>
          </button></li>)}
        </ul>
        <Slider label="Expression strength" value={strength} min={0} max={2} step={.1} format={v => `${v.toFixed(1)}×`} onChange={setStrength} />
      </>}

      {tab === 'states' && <>
        <p className="nx-panel-note">Activity states describe what the avatar is doing; they combine with any feeling. Try <b>Warning</b> with <b>Happy</b>.</p>
        <ul className="nx-state-list" aria-label="Activity states">
          {STATE_KEYS.map(key => <li key={key}><button type="button" aria-pressed={state === key} onClick={() => setState(key)}>
            <span className={`nx-state-icon is-${key}`}><Icon name={STATE_ICON[key]} size={18} /></span>
            <span><strong>{STATES[key].label}</strong><small>{STATES[key].text}</small></span>
          </button></li>)}
        </ul>
      </>}

      {tab === 'gestures' && <>
        <p className="nx-panel-note">One-off gestures layer on top of any state and feeling. Call <code>avatar.impulse(kind)</code>.</p>
        <ul className="nx-gesture-grid" aria-label="Gestures">
          {IMPULSES.map(i => <li key={i.kind}><button type="button" className={lastImpulse === i.kind ? 'is-fired' : ''} onClick={() => { avatar.current?.impulse(i.kind); setLastImpulse(i.kind); }}>
            <Icon name="zap" size={18} /><span><strong>{i.kind}</strong><small>{i.hint}</small></span>
          </button></li>)}
        </ul>
        <button type="button" className="nx-btn" onClick={() => { avatar.current?.impulse(['burst', 'sweep', 'bounce']); setLastImpulse('burst'); }}><Icon name="sparkle" size={16} />Combine burst + sweep + bounce</button>
      </>}
    </div>
  </div>;
}
