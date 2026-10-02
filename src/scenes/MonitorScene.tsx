import { useEffect, useRef, useState } from 'react';
import { QiviAvatar, type QiviExpression, type QiviState } from 'qivi';
import { Icon, type IconName } from '../icons';
import { useLookProps } from '../store';

type Severity = 'critical' | 'high' | 'medium' | 'low';
interface Finding { id: string; title: string; severity: Severity; asset: string }
type Outcome = 'warning' | 'success' | 'error';
type Phase = 'idle' | 'thinking' | 'searching' | 'analyzing' | 'found' | Outcome;

const ASSETS = ['api-gateway', 'billing-service', 'web-frontend', 'auth-worker', 'reports-db', 'cdn-edge'];
const FINDINGS: Finding[] = [
  { id: 'SYN-101', title: 'Outdated TLS configuration', severity: 'critical', asset: 'cdn-edge' },
  { id: 'SYN-214', title: 'Public storage bucket listing', severity: 'high', asset: 'reports-db' },
  { id: 'SYN-318', title: 'Session cookie missing SameSite', severity: 'medium', asset: 'web-frontend' },
  { id: 'SYN-402', title: 'Verbose error messages', severity: 'low', asset: 'api-gateway' },
];
const STEPS: { phase: Phase; label: string; icon: IconName }[] = [
  { phase: 'thinking', label: 'Plan', icon: 'sparkle' },
  { phase: 'searching', label: 'Scan', icon: 'search' },
  { phase: 'analyzing', label: 'Analyze', icon: 'gauge' },
  { phase: 'found', label: 'Report', icon: 'form' },
];
const SEVERITY_ICON: Record<Severity, IconName> = { critical: 'error', high: 'alert', medium: 'info', low: 'check' };
const OUTCOME: Record<Outcome, { title: string; text: string; icon: IconName; expression: QiviExpression }> = {
  warning: { title: '4 findings need attention', text: 'One critical issue should be fixed today.', icon: 'alert', expression: 'concern' },
  success: { title: 'All clear', text: 'No issues across 6 services. Nice work.', icon: 'success', expression: 'happy' },
  error: { title: 'Scan interrupted', text: 'Lost connection to the scanner while reading billing-service.', icon: 'error', expression: 'confused' },
};

export function MonitorScene() {
  const lookProps = useLookProps();
  const [phase, setPhase] = useState<Phase>('idle');
  const [scanned, setScanned] = useState(0);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [stage, setStage] = useState<HTMLElement | null>(null);
  const [results, setResults] = useState<HTMLElement | null>(null);
  const timers = useRef<number[]>([]);
  const clear = () => { timers.current.forEach(clearTimeout); timers.current = []; };
  useEffect(() => clear, []);

  function run(outcome: Outcome) {
    clear(); setFindings([]); setScanned(0); setPhase('thinking');
    let t = 700;
    const at = (delay: number, fn: () => void) => { t += delay; timers.current.push(window.setTimeout(fn, t)); };
    at(0, () => setPhase('searching'));
    const reach = outcome === 'error' ? 2 : ASSETS.length;
    for (let i = 1; i <= reach; i++) at(320, () => setScanned(i));
    if (outcome === 'error') { at(500, () => setPhase('error')); return; }
    at(300, () => setPhase('analyzing'));
    at(1200, () => setPhase('found'));
    if (outcome === 'warning') FINDINGS.forEach(f => at(260, () => setFindings(list => [...list, f])));
    at(700, () => setPhase(outcome));
  }
  function reset() { clear(); setPhase('idle'); setFindings([]); setScanned(0); }

  const running = ['thinking', 'searching', 'analyzing', 'found'].includes(phase);
  const done = phase === 'warning' || phase === 'success' || phase === 'error';
  const stepIndex = STEPS.findIndex(s => s.phase === phase);
  const outcome = done ? OUTCOME[phase as Outcome] : null;
  const counts = (['critical', 'high', 'medium', 'low'] as Severity[]).map(s => [s, findings.filter(f => f.severity === s).length] as const);

  return <div className="nx-scene nx-monitor">
    <div className={`nx-scene-stage is-${phase}`} ref={setStage}>
      <span className="nx-spotlight" aria-hidden="true" />
      {/* Viewport layer: particles can stream out of the stage into the results list. */}
      <QiviAvatar {...lookProps} layer="viewport" anchor={stage} size="100%" particles={16000}
        state={phase as QiviState} expression={outcome?.expression} streamTarget={phase === 'searching' || phase === 'analyzing' ? results : null} autoSleep={false} />
      <p className="nx-stage-caption" role="status">{outcome ? outcome.title : running ? `${STEPS[stepIndex]?.label ?? 'Working'}…` : 'Ready to scan 6 services'}</p>
    </div>

    <div className="nx-scene-panel">
      <div className="nx-monitor-actions">
        <button type="button" className="nx-btn nx-btn-primary" disabled={running} onClick={() => run('warning')}><Icon name="search" size={18} />Run scan</button>
        <button type="button" className="nx-btn" disabled={running} onClick={() => run('success')}><Icon name="success" size={18} />Clean run</button>
        <button type="button" className="nx-btn" disabled={running} onClick={() => run('error')}><Icon name="error" size={18} />Simulate failure</button>
        {(done || running) && <button type="button" className="nx-btn nx-btn-quiet" onClick={reset}><Icon name="reset" size={18} />Reset</button>}
      </div>

      <ol className="nx-stepper" aria-label="Scan progress">
        {STEPS.map((s, i) => {
          const status = phase === 'error' && i === 1 ? 'failed' : done && phase !== 'error' ? 'done' : stepIndex > i || (phase === 'error' && i < 1) ? 'done' : stepIndex === i ? 'active' : 'todo';
          return <li key={s.phase} className={`is-${status}`} aria-current={status === 'active' ? 'step' : undefined}>
            <span className="nx-step-dot"><Icon name={status === 'done' ? 'check' : status === 'failed' ? 'close' : s.icon} size={16} /></span>{s.label}
          </li>;
        })}
      </ol>

      <div className="nx-progress" role="progressbar" aria-label="Services scanned" aria-valuemin={0} aria-valuemax={ASSETS.length} aria-valuenow={scanned}>
        <span style={{ width: `${(scanned / ASSETS.length) * 100}%` }} />
      </div>
      <ul className="nx-assets" aria-label="Services">
        {ASSETS.map((asset, i) => <li key={asset} className={i < scanned ? 'is-done' : phase === 'error' && i === scanned ? 'is-failed' : i === scanned && phase === 'searching' ? 'is-active' : ''}>
          <Icon name={i < scanned ? 'check' : phase === 'error' && i === scanned ? 'error' : 'package'} size={14} />{asset}
        </li>)}
      </ul>

      <section className={`nx-results ${outcome ? `is-${phase}` : ''}`} ref={setResults} aria-label="Scan results">
        <header>
          <h3>{outcome ? <><Icon name={outcome.icon} size={18} />{outcome.title}</> : 'Results'}</h3>
          <span className="nx-badge">Synthetic data</span>
        </header>
        {outcome && <p className="nx-results-text">{outcome.text}</p>}
        {findings.length > 0 && <>
          <div className="nx-severity-bar" aria-hidden="true">{counts.map(([s, n]) => n ? <span key={s} className={`sev-${s}`} style={{ flex: n }} /> : null)}</div>
          <ul className="nx-findings" aria-live="polite">
            {findings.map(f => <li key={f.id} className={`sev-${f.severity}`}>
              <span className="nx-sev"><Icon name={SEVERITY_ICON[f.severity]} size={14} />{f.severity}</span>
              <span className="nx-finding-title">{f.title}<small>{f.id} · {f.asset}</small></span>
            </li>)}
          </ul>
        </>}
        {!outcome && findings.length === 0 && <p className="nx-panel-note">{running ? 'Particles stream toward the work while the avatar searches and analyzes.' : 'Run a scan to see the avatar move through every activity state.'}</p>}
        {phase === 'error' && <button type="button" className="nx-btn" onClick={() => run('warning')}><Icon name="reset" size={16} />Retry scan</button>}
      </section>
    </div>
  </div>;
}
