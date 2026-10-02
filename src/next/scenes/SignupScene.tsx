import { useEffect, useRef, useState } from 'react';
import { QiviAvatar, QiviVoice, type ExpressionDef, type QiviAvatarHandle, type QiviExpression, type QiviState } from '@yogeshhrathod/qivi';
import { Icon } from '../icons';
import { useLookProps, useStore } from '../store';

type FieldName = 'name' | 'email' | 'password';
const LOOK_AWAY: ExpressionDef = { label: 'Looking away', face: { lookX: -.9, lookY: .45, lidL: .55, lidR: .55, mouth: .3 }, body: { lean: -.08 } };

function strength(password: string) {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return Math.min(4, score);
}
const STRENGTH = ['Too short', 'Weak', 'Okay', 'Strong', 'Excellent'];

export function SignupScene() {
  const lookProps = useLookProps();
  const { look } = useStore();
  const avatar = useRef<QiviAvatarHandle>(null);
  // Created in an effect so StrictMode's mount/unmount/mount cycle never leaves a disposed voice.
  const [typing, setTyping] = useState<QiviVoice | null>(null);
  useEffect(() => { const voice = QiviVoice.manual(); setTyping(voice); return () => voice.dispose(); }, []);
  const [values, setValues] = useState({ name: '', email: '', password: '' });
  const [touched, setTouched] = useState<Record<FieldName, boolean>>({ name: false, email: false, password: false });
  const [focus, setFocus] = useState<FieldName | null>(null);
  const [agree, setAgree] = useState(false);
  const [submitted, setSubmitted] = useState<'none' | 'error' | 'success'>('none');
  const refs = { name: useRef<HTMLInputElement>(null), email: useRef<HTMLInputElement>(null), password: useRef<HTMLInputElement>(null) };

  const errors: Partial<Record<FieldName | 'agree', string>> = {};
  if (!values.name.trim()) errors.name = 'Tell us what to call you.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) errors.email = 'Enter an email like name@example.com.';
  if (values.password.length < 8) errors.password = 'Use at least 8 characters.';
  if (!agree) errors.agree = 'Please accept the demo terms.';
  const score = strength(values.password);
  const visibleError = (field: FieldName) => (touched[field] || submitted === 'error') && errors[field];

  const anyError = (['name', 'email', 'password'] as FieldName[]).some(visibleError) || (submitted === 'error' && !!errors.agree);
  let state: QiviState = focus ? 'listening' : 'idle';
  let expression: QiviExpression | undefined;
  let definition: ExpressionDef | undefined;
  if (submitted === 'success') { state = 'success'; expression = 'love'; }
  else if (focus === 'password') { definition = LOOK_AWAY; expression = 'neutral'; }
  else if (anyError) expression = 'concern';
  else if (focus === 'email' && values.email.includes('@')) expression = 'curious';
  else if (values.name && focus === 'name') expression = 'happy';

  const message = submitted === 'success' ? `Welcome aboard, ${values.name.trim().split(' ')[0]}!`
    : focus === 'password' ? 'I’m not looking. Promise.'
    : anyError ? 'Almost there — a field needs attention.'
    : focus === 'email' ? 'I’ll keep it safe.'
    : focus === 'name' ? (values.name ? `Nice to meet you, ${values.name.trim().split(' ')[0]}.` : 'What should I call you?')
    : `Hi! I’m ${look.name}. Let’s set up your account.`;

  function change(field: FieldName, value: string) {
    setValues(v => ({ ...v, [field]: value }));
    typing?.pulse(.5);
    if (submitted === 'success') setSubmitted('none');
  }
  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (Object.keys(errors).length) {
      setSubmitted('error');
      avatar.current?.impulse('shiver');
      const first = (['name', 'email', 'password'] as FieldName[]).find(f => errors[f]);
      if (first) refs[first].current?.focus();
      return;
    }
    setSubmitted('success');
    avatar.current?.impulse(['bounce', 'burst']);
    (document.activeElement as HTMLElement | null)?.blur();
  }

  const field = (name: FieldName, label: string, props: React.InputHTMLAttributes<HTMLInputElement>) => <div className={`nx-input ${visibleError(name) ? 'is-invalid' : ''}`}>
    <label htmlFor={`signup-${name}`}>{label}</label>
    <input id={`signup-${name}`} ref={refs[name]} value={values[name]} aria-invalid={!!visibleError(name)} aria-describedby={`signup-${name}-note`}
      onChange={e => change(name, e.target.value)} onFocus={() => setFocus(name)} onBlur={() => { setFocus(null); setTouched(t => ({ ...t, [name]: true })); }} {...props} />
    <p id={`signup-${name}-note`} className="nx-input-note" aria-live="polite">{visibleError(name) ? <><Icon name="alert" size={14} />{errors[name]}</> : null}</p>
  </div>;

  return <div className="nx-scene nx-signup">
    <div className={`nx-scene-stage nx-signup-stage is-${submitted}`}>
      <span className="nx-spotlight" aria-hidden="true" />
      <QiviAvatar ref={avatar} {...lookProps} size="100%" particles={16000} state={state} expression={expression} expressionDefinition={definition ?? lookProps.expressionDefinition}
        voice={focus && focus !== 'password' ? typing : null} interactive={focus !== 'password'} autoSleep={false} />
      <p className="nx-speech-bubble" aria-live="polite">{message}</p>
    </div>

    <form className="nx-scene-panel nx-signup-form" noValidate onSubmit={submit}>
      {submitted === 'success' ? <div className="nx-success-card">
        <span className="nx-success-icon"><Icon name="success" size={28} /></span>
        <h3>Account created</h3>
        <p>This is a demo: nothing was sent or stored.</p>
        <button type="button" className="nx-btn" onClick={() => { setValues({ name: '', email: '', password: '' }); setTouched({ name: false, email: false, password: false }); setAgree(false); setSubmitted('none'); }}><Icon name="reset" size={16} />Start over</button>
      </div> : <>
        <h3 className="nx-form-title">Create your account</h3>
        {field('name', 'Name', { type: 'text', autoComplete: 'name', autoCapitalize: 'words', enterKeyHint: 'next', placeholder: 'Ada Lovelace' })}
        {field('email', 'Email', { type: 'email', inputMode: 'email', autoComplete: 'email', autoCapitalize: 'none', spellCheck: false, enterKeyHint: 'next', placeholder: 'ada@example.com' })}
        {field('password', 'Password', { type: 'password', autoComplete: 'new-password', enterKeyHint: 'done' })}
        <div className="nx-strength" data-score={values.password ? score : -1} aria-live="polite">
          <span className="nx-strength-bars" aria-hidden="true"><i /><i /><i /><i /></span>
          <span>{values.password ? STRENGTH[score] : 'Mix letters, numbers and symbols'}</span>
        </div>
        <label className={`nx-check ${submitted === 'error' && errors.agree ? 'is-invalid' : ''}`}>
          <input type="checkbox" checked={agree} onChange={e => { setAgree(e.target.checked); if (e.target.checked) avatar.current?.impulse('bounce'); }} />
          <span className="nx-check-box" aria-hidden="true"><Icon name="check" size={14} /></span>
          I understand this form is a demo.
        </label>
        <button type="submit" className="nx-btn nx-btn-primary nx-btn-block"><Icon name="user" size={18} />Create account</button>
        <p className="nx-panel-note"><Icon name="lock" size={14} />Nothing leaves your browser.</p>
      </>}
    </form>
  </div>;
}
