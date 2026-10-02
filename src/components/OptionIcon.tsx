const paths: Record<string, string> = {
  warning: 'm12 3 10 18H2ZM12 9v5M12 17h.01',
  thinking: 'M8 4a4 4 0 0 0-4 4 4 4 0 0 0 0 8 4 4 0 0 0 8 1V7a4 4 0 0 0-4-3ZM16 4a4 4 0 0 1 4 4 4 4 0 0 1 0 8 4 4 0 0 1-8 1V7a4 4 0 0 1 4-3Z',
  settings: 'M4 7h16M4 17h16M9 4v6M15 14v6',
  person: 'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 21v-2a8 8 0 0 1 16 0v2',
  sun: 'M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8ZM12 2v2M12 20v2M2 12h2M20 12h2M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2',
  moon: 'M20 15A9 9 0 0 1 9 4a9 9 0 1 0 11 11Z',
  system: 'M3 4h18v13H3ZM8 21h8M12 17v4',
  write: 'm4 16 12-12 4 4L8 20H4ZM14 6l4 4',
  plan: 'M4 5h16v16H4ZM8 3v4M16 3v4M4 10h16M8 14h2M14 14h2M8 18h2',
  learn: 'M3 4h7l2 2 2-2h7v15h-7l-2 2-2-2H3ZM12 6v15',
  spark: 'm12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z',
  heart: 'M12 21 3 12a5 5 0 0 1 9-7 5 5 0 0 1 9 7Z',
  smile: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM8 9h.01M16 9h.01M7 14q5 6 10 0',
  shape: 'm12 3 9 5v8l-9 5-9-5V8Z',
  play: 'm8 4 13 8-13 8Z', pause: 'M8 4v16M16 4v16', stop: 'M5 5h14v14H5Z',
  reset: 'M3 11a9 9 0 1 1 2 7M3 4v7h7', copy: 'M8 8h13v13H8ZM3 16V3h13',
  send: 'M12 20V4M5 11l7-7 7 7', down: 'M12 4v16M5 13l7 7 7-7', back: 'M20 12H4m7-7-7 7 7 7',
  code: 'm8 6-6 6 6 6m8-12 6 6-6 6m-3-15-2 18',
  voice: 'M9 3h6v11H9ZM5 11a7 7 0 0 0 14 0M12 18v4',
  motion: 'M3 8h8M3 16h6M13 4l7 8-7 8',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7ZM15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
  palette: 'M21 12a9 9 0 1 0-9 9h2a2 2 0 0 0 0-4 2 2 0 0 1 0-4h5a2 2 0 0 0 2-1ZM7 10h.01M10 6h.01M15 7h.01',
};
export function OptionIcon({ name }: { name: string }) {
  const value = name.toLowerCase();
  const kind = paths[value] ? value : /copy/.test(value) ? 'copy' : /reset/.test(value) ? 'reset' : /pause/.test(value) ? 'pause' : /stop/.test(value) ? 'stop' : /play|resume|performance/.test(value) ? 'play' : /config|advanced|documentation|llm/.test(value) ? 'code' : /dark|doze/.test(value) ? 'moon' : /light|intensity/.test(value) ? 'sun' : /theme|color|palette/.test(value) ? 'palette' : /character|personality|female|male|neutral|nova|sol|qivi/.test(value) ? 'person' : /shape|morph|blob|hex|shield/.test(value) ? 'shape' : /heart|love/.test(value) ? 'heart' : /expression|smile|happy/.test(value) ? 'smile' : /voice|audio|talk|listen/.test(value) ? 'voice' : /motion|speed|transition|bounce|ripple/.test(value) ? 'motion' : /hidden|gaze|eye/.test(value) ? 'eye' : /create|star|particle|spark|glyph/.test(value) ? 'spark' : 'settings';
  return <svg className="option-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[kind]} /></svg>;
}
