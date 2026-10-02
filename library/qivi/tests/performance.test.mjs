import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const load = async (file) => {
  const source = readFileSync(new URL(`../src/${file}.ts`, import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } });
  return import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
};
const { QiviPerformance } = await load('performance');
const { createRadialShape } = await load('shapes');
const { CHARACTERS } = await load('characters');
const { composeTarget, BASE, paletteFor, PALETTES } = await load('presets');
const base = { personality: 'core', state: 'idle', expression: 'neutral', shape: 'auto', theme: 'auto', accent: 'auto', glyphs: true, smile: true, intensity: 1, lighting: 1 };
function target() {
  return { frame: {}, gestures: [], calls: 0, perform(f) { this.frame = f; this.calls++; }, resetPerformance() { this.frame = {}; }, impulse(i) { this.gestures.push(i); } };
}
test('overlaps expire back to earlier cues; stop restores props; no frame-by-frame updates', () => {
  const t = target();
  const p = new QiviPerformance(t, [
    { at: 0, frame: { state: 'talking', expression: 'focused' } },
    { at: 2, duration: 1, frame: { expression: 'concern', shape: 'shield' }, impulse: 'shiver' },
  ]);
  p.update(0); p.update(1);
  assert.equal(t.calls, 1);
  p.update(2); p.update(2.5);
  assert.equal(t.frame.expression, 'concern'); assert.deepEqual(t.gestures, ['shiver']);
  p.update(3);
  assert.deepEqual(t.frame, { state: 'talking', expression: 'focused' });
  p.stop(); assert.deepEqual(t.frame, {});
  p.update(2); assert.equal(t.frame.shape, 'shield');
  p.dispose(); p.update(3); assert.deepEqual(t.frame, {});
});
test('seek reconstructs state without replaying impulses; repeated timestamps are stable', () => {
  const t = target(); const p = new QiviPerformance(t, [{ at: 1, frame: { expression: 'happy' }, impulse: 'bounce' }]);
  p.update(2, false); assert.equal(t.frame.expression, 'happy'); assert.equal(t.gestures.length, 0);
  p.update(2); assert.equal(t.gestures.length, 0);
  p.update(0); assert.deepEqual(t.frame, {});
  p.update(1); assert.deepEqual(t.gestures, ['bounce']);
});
test('reject invalid timeline times', () => {
  for (const at of [-1, NaN, Infinity]) assert.throws(() => new QiviPerformance(target(), [{ at }]), RangeError);
  assert.throws(() => new QiviPerformance(target(), [{ at: 0, duration: -1 }]), RangeError);
});
test('expression strength works while talking; custom targets and visibility controls win', () => {
  const neutral = composeTarget({ ...base, state: 'talking', expressionStrength: 0 }, 'concern');
  const strong = composeTarget({ ...base, state: 'talking', expressionStrength: 2 }, 'concern');
  assert.equal(neutral.lidTilt, BASE.lidTilt); assert.equal(strong.lidTilt, -0.56);
  const custom = composeTarget({ ...base, expressionDefinition: { label: 'Mine', face: { scaleL: 1.4 } }, params: { scaleL: 1.6, mouth: 1, gQuestion: 1 }, smile: false, glyphs: false }, 'happy');
  assert.equal(custom.scaleL, 1.6); assert.equal(custom.mouth, 0); assert.equal(custom.gQuestion, 0);
});
test('profiles override presentation geometry and provide palettes; explicit palette wins', () => {
  const character = { presentation: 'feminine', theme: 'mint', params: { width: 1.3 } };
  assert.equal(composeTarget({ ...base, character }, 'neutral').width, 1.3);
  assert.equal(paletteFor({ ...base, character }), PALETTES.mint);
  assert.equal(paletteFor({ ...base, character, theme: 'sunset' }), PALETTES.sunset);
});
test('custom silhouettes use an independent per-instance target', () => {
  const cfg = { ...base, shape: 'shield', customShape: [1, 1.2, 0.8, 1] };
  assert.equal(composeTarget(cfg, 'neutral').morphHeart, 1);
  assert.equal(composeTarget(cfg, 'neutral').morphShield, 0);
  assert.equal(composeTarget(base, 'neutral').morphHeart, 0);
});
test('media playback pause, seek, end and disposal release scheduler/listeners', () => {
  const oldRaf = globalThis.requestAnimationFrame, oldCancel = globalThis.cancelAnimationFrame;
  const callbacks = new Map(); let id = 0;
  globalThis.requestAnimationFrame = cb => { callbacks.set(++id, cb); return id; };
  globalThis.cancelAnimationFrame = i => callbacks.delete(i);
  try {
    const media = new EventTarget(); media.currentTime = 0; media.paused = true; media.seeking = false;
    const t = target(); const p = new QiviPerformance(t, [{ at: 0, frame: { state: 'talking' } }, { at: 2, frame: { expression: 'happy' }, impulse: 'bounce' }]);
    p.followMedia(media); assert.equal(t.frame.state, 'talking');
    media.dispatchEvent(new Event('play')); assert.equal(callbacks.size, 1);
    media.currentTime = 3; media.dispatchEvent(new Event('pause')); assert.equal(callbacks.size, 0);
    assert.equal(t.frame.expression, 'happy'); assert.equal(t.gestures.length, 0);
    media.currentTime = 1; media.dispatchEvent(new Event('seeked')); assert.equal(t.frame.expression, undefined);
    media.dispatchEvent(new Event('ended')); assert.deepEqual(t.frame, {});
    media.dispatchEvent(new Event('play')); assert.equal(callbacks.size, 0);
    p.dispose();
  } finally { globalThis.requestAnimationFrame = oldRaf; globalThis.cancelAnimationFrame = oldCancel; }
});

test('radial shape helper validates shape geometry and returns immutable samples', () => {
  const shape = createRadialShape(angle => 1 + 0.2 * Math.cos(6 * angle));
  assert.equal(shape.length, 128); assert.ok(Object.isFrozen(shape));
  assert.throws(() => createRadialShape(() => NaN), RangeError);
  assert.throws(() => createRadialShape(() => -1), RangeError);
  assert.throws(() => createRadialShape(() => 1, 2), RangeError);
});

test('female and male character profiles have distinct face/body geometry with independent personality', () => {
  const female = composeTarget({ ...base, personality: CHARACTERS.female.personality, character: CHARACTERS.female }, 'neutral');
  const male = composeTarget({ ...base, personality: CHARACTERS.male.personality, character: CHARACTERS.male }, 'neutral');
  assert.ok(female.height > male.height); assert.ok(female.width < male.width);
  assert.ok(female.scaleL > male.scaleL); assert.ok(female.spacing < male.spacing);
  assert.equal(composeTarget({ ...base, personality: 'diplomat', character: CHARACTERS.female }, 'neutral').scaleL, female.scaleL);
});
