import type { QiviConfig, QiviImpulse } from './types';

/** Visual-only overlay; audio and provider metadata belong to the host application. */
export type QiviPerformanceFrame = Partial<Pick<QiviConfig,
  'character' | 'personality' | 'state' | 'expression' | 'theme' | 'shape' |
  'presentation' | 'expressionStrength' | 'expressionDefinition' | 'params' |
  'customShape' | 'transitionSpeed' | 'autoEmote' | 'intensity' | 'glyphs' | 'smile' | 'accent' | 'lighting'>>;
export interface QiviPerformanceCue {
  /** Seconds on the playback clock. */
  at: number;
  /** Omit to hold until overridden/stopped. */
  duration?: number;
  frame?: QiviPerformanceFrame;
  impulse?: QiviImpulse | QiviImpulse[];
}
export interface QiviPerformanceTarget {
  perform(frame: QiviPerformanceFrame): void;
  resetPerformance(): void;
  impulse(kind: QiviImpulse | QiviImpulse[]): void;
}

/** Provider-independent timeline; update() supports manually supplied clocks and SSR tests. */
export class QiviPerformance {
  private cues: QiviPerformanceCue[];
  private previous = -1;
  private signature = '';
  private raf: number | null = null;
  private cleanup: (() => void) | null = null;
  private disposed = false;
  constructor(private target: QiviPerformanceTarget, cues: readonly QiviPerformanceCue[]) {
    this.cues = cues.map(cue => {
      if (!Number.isFinite(cue.at) || cue.at < 0 || (cue.duration !== undefined && (!Number.isFinite(cue.duration) || cue.duration < 0))) throw new RangeError('Cue times must be finite, non-negative seconds');
      return { ...cue, frame: cue.frame ? { ...cue.frame } : undefined };
    }).sort((a, b) => a.at - b.at);
  }
  /** Seek reconstructs state; pass false to suppress gestures on explicit forward seeks. */
  update(seconds: number, emitImpulses = true): void {
    if (this.disposed) return;
    if (!Number.isFinite(seconds) || seconds < 0) throw new RangeError('Playback time must be finite and non-negative');
    const active: number[] = [];
    let frame: QiviPerformanceFrame = {};
    this.cues.forEach((cue, i) => {
      if (cue.at <= seconds && (cue.duration === undefined || seconds < cue.at + cue.duration)) {
        active.push(i);
        frame = { ...frame, ...cue.frame };
      }
    });
    const signature = active.join(',');
    if (signature !== this.signature) { this.target.perform(frame); this.signature = signature; }
    if (emitImpulses && seconds >= this.previous) {
      for (const cue of this.cues) {
        if (cue.at > this.previous && cue.at <= seconds && cue.impulse && (cue.duration === undefined || seconds < cue.at + cue.duration)) this.target.impulse(cue.impulse);
      }
    }
    this.previous = seconds;
  }
  /** Clock returns seconds. Call stop() when your custom playback finishes. */
  play(clock: () => number): void {
    if (this.disposed) throw new Error('Performance is disposed');
    this.detach();
    const tick = () => {
      try { this.update(clock()); } catch (error) { this.stop(); throw error; }
      this.raf = requestAnimationFrame(tick);
    };
    tick();
  }
  /** Does not start or own audio. Follows pause, seek, playback speed, end and error. */
  followMedia(media: HTMLMediaElement): void {
    if (this.disposed) throw new Error('Performance is disposed');
    this.detach();
    const sync = () => this.update(media.currentTime, false);
    const play = () => {
      if (this.raf !== null) cancelAnimationFrame(this.raf);
      const tick = () => { this.update(media.currentTime, !media.seeking); this.raf = requestAnimationFrame(tick); };
      tick();
    };
    const pause = () => {
      if (this.raf !== null) cancelAnimationFrame(this.raf);
      this.raf = null;
      sync();
    };
    const end = () => this.stop();
    media.addEventListener('play', play);
    media.addEventListener('pause', pause);
    media.addEventListener('seeked', sync);
    media.addEventListener('ended', end);
    media.addEventListener('error', end);
    this.cleanup = () => {
      media.removeEventListener('play', play);
      media.removeEventListener('pause', pause);
      media.removeEventListener('seeked', sync);
      media.removeEventListener('ended', end);
      media.removeEventListener('error', end);
    };
    if (!media.paused) play(); else this.update(media.currentTime);
  }
  private detach(): void {
    if (this.raf !== null) cancelAnimationFrame(this.raf);
    this.raf = null;
    this.cleanup?.(); this.cleanup = null;
  }
  /** Restore current component props. Safe to call repeatedly. */
  stop(): void {
    this.detach(); this.previous = -1; this.signature = '';
    this.target.resetPerformance();
  }
  dispose(): void { if (!this.disposed) { this.stop(); this.disposed = true; } }
}
