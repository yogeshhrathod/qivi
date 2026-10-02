import { useRef, useState } from 'react';
import { EXPRESSIONS, PALETTES, PERSONALITIES, QiviAvatar, QiviIcon, paletteFor, type QiviAvatarHandle, type QiviExpression, type QiviImpulse, type QiviPersonality, type QiviPresentation, type QiviThemeName } from '@yogeshhrathod/qivi';
import { Icon, type IconName } from '../icons';
import { href } from '../router';
import { lookToJsx, useLookProps, useStore, type ShapeChoice } from '../store';
import { Chips, CodeBlock, Field, Segmented, Slider, Toggle } from '../ui';

type Tab = 'identity' | 'mood' | 'shape' | 'render' | 'code';
const TABS: { value: Tab; label: string; icon: IconName }[] = [
  { value: 'identity', label: 'Identity', icon: 'user' },
  { value: 'mood', label: 'Mood', icon: 'smile' },
  { value: 'shape', label: 'Shape', icon: 'shapes' },
  { value: 'render', label: 'Render', icon: 'sparkle' },
  { value: 'code', label: 'Code', icon: 'build' },
];
const THEMES: ('auto' | QiviThemeName)[] = ['auto', ...Object.keys(PALETTES) as QiviThemeName[]];
const SHAPES: { value: ShapeChoice; label: string; path: string }[] = [
  { value: 'auto', label: 'Automatic', path: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z M8 12h8' },
  { value: 'blob', label: 'Blob', path: 'M12 3c5 0 9 3.5 9 8.5S17 21 12 21s-9-3.5-9-9.5S7 3 12 3Z' },
  { value: 'heart', label: 'Heart', path: 'M12 20s-8-4.6-8-10.2A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 8 2.8C20 15.4 12 20 12 20Z' },
  { value: 'shield', label: 'Shield', path: 'M12 3 4.5 6v5.5c0 4.6 3.2 8 7.5 9.5 4.3-1.5 7.5-4.9 7.5-9.5V6Z' },
  { value: 'hex', label: 'Hexagon', path: 'm12 3 8 4.5v9L12 21l-8-4.5v-9Z' },
  { value: 'star', label: 'Star', path: 'm12 3 2.6 5.8 6.4.7-4.8 4.3 1.4 6.2L12 16.9 6.4 20l1.4-6.2L3 9.5l6.4-.7Z' },
  { value: 'flower', label: 'Flower', path: 'M12 4a3 3 0 0 1 3 3 3 3 0 0 1 3 5 3 3 0 0 1-3 5 3 3 0 0 1-6 0 3 3 0 0 1-3-5 3 3 0 0 1 3-5 3 3 0 0 1 3-3Z' },
  { value: 'custom', label: 'Custom', path: 'M12 3l2 4 4-1-1 4 4 2-4 2 1 4-4-1-2 4-2-4-4 1 1-4-4-2 4-2-1-4 4 1Z' },
];
const IMPULSES: QiviImpulse[] = ['bounce', 'burst', 'surprise', 'flick', 'anticipate', 'glitch', 'ripple', 'sweep', 'shiver'];

export function StudioPage() {
  const { look, setLook, resetLook, appearance } = useStore();
  const lookProps = useLookProps();
  const avatar = useRef<QiviAvatarHandle>(null);
  const [tab, setTab] = useState<Tab>('identity');
  const [preview, setPreview] = useState<QiviExpression>('neutral');
  const [talking, setTalking] = useState(false);
  const [staticPreview, setStaticPreview] = useState(false);

  return <div className="nx-page nx-studio">
    <div className="nx-studio-preview">
      <div className="nx-studio-stage">
        <span className="nx-spotlight" aria-hidden="true" />
        {staticPreview
          ? <QiviAvatar {...lookProps} size={176} quality="static" expression={preview} />
          : <QiviAvatar ref={avatar} {...lookProps} size="100%" particles={look.particles} expression={preview} state={talking ? 'talking' : 'idle'} voice={talking ? 'simulate' : null} />}
      </div>
      <div className="nx-studio-caption">
        <div><strong>{look.name || 'Your character'}</strong><span>{PERSONALITIES[look.personality].label} · {look.presentation} · {look.theme === 'auto' ? 'personality palette' : look.theme}</span></div>
        <div className="nx-studio-quick">
          <button type="button" className="nx-icon-btn" aria-pressed={talking} aria-label="Preview speaking" title="Preview speaking" onClick={() => setTalking(t => !t)}><Icon name="wave" /></button>
          <button type="button" className="nx-icon-btn" aria-label="Reset to character defaults" title="Reset to character defaults" onClick={() => { resetLook(); setPreview('neutral'); }}><Icon name="reset" /></button>
        </div>
      </div>
    </div>

    <div className="nx-studio-controls">
      <header className="nx-studio-header">
        <div><p className="nx-eyebrow"><Icon name="studio" size={16} />Studio</p><h1>Make it yours.</h1></div>
        <a className="nx-btn nx-btn-quiet nx-hide-sm" href={href('chat')}><Icon name="chat" size={18} />Try in chat</a>
      </header>
      <div className="nx-studio-tabs"><Segmented label="Studio sections" value={tab} onChange={setTab} options={TABS} /></div>

      <div className="nx-studio-panel" key={tab}>
        {tab === 'identity' && <>
          <div className="nx-input"><label htmlFor="studio-name">Character name</label>
            <input id="studio-name" value={look.name} maxLength={40} autoComplete="off" enterKeyHint="done" onChange={e => setLook({ name: e.target.value })} /></div>
          <Field label="Presentation" icon="user" hint="Visual only; never changes personality">
            <Segmented label="Presentation" value={look.presentation} onChange={(presentation: QiviPresentation) => setLook({ presentation })}
              options={[{ value: 'neutral', label: 'Neutral' }, { value: 'feminine', label: 'Feminine' }, { value: 'masculine', label: 'Masculine' }]} />
          </Field>
          <Field label="Personality" icon="sparkle" hint={PERSONALITIES[look.personality].blurb}>
            <Chips label="Personality" value={look.personality} options={Object.keys(PERSONALITIES) as QiviPersonality[]} onChange={personality => setLook({ personality })} render={p => PERSONALITIES[p].label} />
          </Field>
          <Field label="Palette" icon="palette">
            <div className="nx-swatches" role="group" aria-label="Palette">
              {THEMES.map(t => {
                const pal = t === 'auto' ? paletteFor({ theme: 'auto', personality: look.personality }) : PALETTES[t];
                return <button key={t} type="button" aria-pressed={look.theme === t} onClick={() => setLook({ theme: t })}>
                  <span className="nx-swatch" style={{ background: `conic-gradient(${pal.deep} 0 25%, ${pal.mid} 0 50%, ${pal.warm} 0 75%, ${pal.hi} 0)` }} />
                  <span>{t === 'auto' ? 'Personality' : t}</span>
                </button>;
              })}
            </div>
          </Field>
          <Field label="Proportions" icon="move">
            <Slider label="Eye spacing" value={look.spacing} min={.7} max={1.4} step={.05} onChange={spacing => setLook({ spacing })} />
            <Slider label="Body width" value={look.width} min={.8} max={1.4} step={.05} onChange={width => setLook({ width })} />
            <Slider label="Blink every" value={look.blink} min={1} max={8} step={.5} format={v => `${v}s`} onChange={blink => setLook({ blink })} />
          </Field>
        </>}

        {tab === 'mood' && <>
          <Field label="Preview expression" icon="smile" hint="Preview only">
            <ul className="nx-face-grid is-compact" aria-label="Expressions">
              {(Object.keys(EXPRESSIONS) as QiviExpression[]).map(key => <li key={key}><button type="button" aria-pressed={preview === key} onClick={() => setPreview(key)}>
                <QiviIcon size={36} expression={key} character={lookProps.character} theme={lookProps.theme} /><span>{EXPRESSIONS[key].label}</span>
              </button></li>)}
            </ul>
          </Field>
          <Field label="Feeling" icon="gauge">
            <Slider label="Expression strength" value={look.strength} min={0} max={2} step={.1} format={v => `${v.toFixed(1)}×`} onChange={strength => setLook({ strength })} />
            <Slider label="Transition time" value={look.transition} min={.5} max={4} step={.1} format={v => `${v.toFixed(1)}×`} onChange={transition => setLook({ transition })} />
            <Toggle label="Custom “dramatic warning” face" description="Replaces the selected expression with your own definition" checked={look.customExpression} onChange={customExpression => setLook({ customExpression })} />
            <Toggle label="Automatic gestures" description="Small reactions when the expression changes" checked={look.autoEmote} onChange={autoEmote => setLook({ autoEmote })} />
          </Field>
          <Field label="Fire a gesture" icon="zap">
            <div className="nx-chips">{IMPULSES.map(i => <button key={i} type="button" className="nx-chip" onClick={() => avatar.current?.impulse(i)}>{i}</button>)}</div>
          </Field>
        </>}

        {tab === 'shape' && <>
          <Field label="Silhouette" icon="shapes" hint="Morphs in place without remounting">
            <div className="nx-shape-grid" role="group" aria-label="Silhouette">
              {SHAPES.map(s => <button key={s.value} type="button" aria-pressed={look.shape === s.value} onClick={() => setLook({ shape: s.value })}>
                <svg viewBox="0 0 24 24" width="32" height="32" aria-hidden="true"><path d={s.path} /></svg><span>{s.label}</span>
              </button>)}
            </div>
          </Field>
          {look.shape === 'custom' && <Field label="Custom outline" icon="studio">
            <Slider label="Lobes" value={look.lobes} min={3} max={10} step={1} onChange={lobes => setLook({ lobes })} />
            <Slider label="Outline depth" value={look.depth} min={.05} max={.4} step={.05} onChange={depth => setLook({ depth })} />
          </Field>}
          <Slider label="Morph transition time" value={look.transition} min={.5} max={4} step={.1} format={v => `${v.toFixed(1)}×`} onChange={transition => setLook({ transition })} />
          <p className="nx-panel-note">Custom outlines use <code>createRadialShape</code>: solid radial silhouettes, not holes or 3D meshes. The static fallback shows a blob.</p>
        </>}

        {tab === 'render' && <>
          <Field label="Accent orb" icon="eye">
            <Segmented label="Accent orb" value={look.accent} onChange={accent => setLook({ accent })} options={[{ value: 'auto', label: 'When signalling' }, { value: 'always', label: 'Always' }, { value: 'never', label: 'Hidden' }]} />
          </Field>
          <Field label="Light & body" icon="sun">
            <Slider label="Lighting" value={look.lighting} min={0} max={1} step={.05} format={v => `${Math.round(v * 100)}%`} onChange={lighting => setLook({ lighting })} />
            <Slider label="Body deformation" value={look.intensity} min={0} max={1} step={.05} format={v => `${Math.round(v * 100)}%`} onChange={intensity => setLook({ intensity })} />
            <Slider label="Particles" value={look.particles} min={4000} max={40000} step={2000} format={v => `${Math.round(v / 1000)}k`} onChange={particles => setLook({ particles })} />
          </Field>
          <Field label="Details" icon="sparkle">
            <Toggle label="Signal glyphs" description="Question marks, sparks and alerts" checked={look.glyphs} onChange={glyphs => setLook({ glyphs })} />
            <Toggle label="Resting smile" checked={look.smile} onChange={smile => setLook({ smile })} />
            <Toggle label="Doze when idle" description="Falls asleep after 40 seconds of quiet" checked={look.autoSleep} onChange={autoSleep => setLook({ autoSleep })} />
            <Toggle label="Reduced motion" description="Also calms the whole showcase" checked={look.reducedMotion === true} onChange={v => setLook({ reducedMotion: v ? true : 'auto' })} />
            <Toggle label="Static SVG fallback" description="What users without WebGL see" checked={staticPreview} onChange={setStaticPreview} />
          </Field>
          <p className="nx-panel-note">Rendering on a {appearance} background. Dark mode switches to luminous additive particles.</p>
        </>}

        {tab === 'code' && <>
          <p className="nx-panel-note">Your configuration as a component. Paste it into any React 19 app.</p>
          <CodeBlock code={lookToJsx(look)} label="Your Qivi" />
          <a className="nx-btn" href={href('build')}><Icon name="package" size={18} />Install & integration guide</a>
        </>}
      </div>
    </div>
  </div>;
}
