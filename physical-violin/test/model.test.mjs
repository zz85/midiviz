import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { renderNote } from './offline.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..', '..');
const diagnosticParams = {
  vibratoDepth: 0,
  bowWander: 0,
  pressureWander: 0,
  positionWander: 0,
  bowNoise: 0,
  bowRandomPos: 0,
  cycleJitter: 0,
  frictionNoise: 0,
};

test('the bowed-string model is pitched, stable and in Helmholtz motion', () => {
  for (const midi of [55, 62, 69, 76, 88]) {
    const result = renderNote(midi, diagnosticParams);
    assert.equal(result.bad, false, `MIDI ${midi} produced non-finite samples`);
    assert.ok(Math.abs(result.cents) < 8, `MIDI ${midi} was ${result.cents.toFixed(1)} cents off`);
    assert.ok(result.clarity > 0.9, `MIDI ${midi} clarity was ${result.clarity.toFixed(2)}`);
    assert.ok(result.slipsPerPeriod > 0.9 && result.slipsPerPeriod < 1.1,
      `MIDI ${midi} had ${result.slipsPerPeriod.toFixed(2)} slips per period`);
    assert.ok(result.rms > 0.02, `MIDI ${midi} was unexpectedly quiet`);
  }
});

test('the experiment page contains every control required by the app', async () => {
  const html = await readFile(resolve(root, '048_bowed_violin.html'), 'utf8');
  for (const id of ['start', 'note', 'stats', 'xypad', 'padSpring', 'padBow', 'preset',
    'body', 'ir', 'roomMix', 'rt60', 'params', 'scope']) {
    assert.match(html, new RegExp(`id=["']${id}["']`), `missing #${id}`);
  }
  assert.match(html, /physical-violin\/app\.js/);
});

test('bow pressure and stickiness change the sound without destabilising it', () => {
  const loose = renderNote(69, { ...diagnosticParams, bowForce: 0.25, stickiness: 0.2 });
  const firm = renderNote(69, { ...diagnosticParams, bowForce: 0.8, stickiness: 0.8 });
  for (const [name, result] of [['loose', loose], ['firm', firm]]) {
    assert.equal(result.bad, false, `${name} bowing produced non-finite samples`);
    assert.ok(Math.abs(result.cents) < 12, `${name} bowing was ${result.cents.toFixed(1)} cents off`);
    assert.ok(result.clarity > 0.85, `${name} bowing clarity was ${result.clarity.toFixed(2)}`);
    assert.ok(result.rms > 0.01, `${name} bowing was unexpectedly quiet`);
  }
  assert.ok(Math.abs(loose.rms - firm.rms) > 0.002,
    'bow pressure and stickiness did not measurably change the output');
});
