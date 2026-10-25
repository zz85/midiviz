// Offline verification: render notes and report pitch, slips/period, RMS, stability.
// Usage: node test-offline.js [--sweep] [--wav out.wav]
import { ViolinModel, midiToHz } from '../violin-core.js';
import { writeFileSync } from 'node:fs';

const FS = 48000;

function detectPitch(x, fs, fmin = 150, fmax = 3000) {
  let best = 0, bestLag = 0;
  const n = x.length;
  let e0 = 0;
  for (let i = 0; i < n; i++) e0 += x[i] * x[i];
  const rs = [];
  for (let lag = Math.floor(fs / fmax); lag <= Math.ceil(fs / fmin); lag++) {
    let s = 0;
    for (let i = 0; i + lag < n; i++) s += x[i] * x[i + lag];
    rs.push([lag, s / (e0 + 1e-12)]);
  }
  for (const [, r] of rs) best = Math.max(best, r);
  // first local maximum within 3% of the global best avoids octave errors
  for (let k = 1; k + 1 < rs.length; k++) {
    const [lag, r] = rs[k];
    if (r >= 0.97 * best && r >= rs[k - 1][1] && r >= rs[k + 1][1]) { bestLag = lag; best = r; break; }
  }
  if (!bestLag) return { hz: 0, clarity: 0 };
  const ac = (lag) => { let s = 0; for (let i = 0; i + lag < n; i++) s += x[i] * x[i + lag]; return s; };
  const a = ac(bestLag - 1), b = ac(bestLag), c = ac(bestLag + 1);
  const shift = 0.5 * (a - c) / (a - 2 * b + c || 1e-12);   // parabolic interpolation
  return { hz: fs / (bestLag + shift), clarity: best };
}

export function renderNote(midi, params = {}, seconds = 1.5) {
  const m = new ViolinModel(FS);
  m.setParams(params);
  m.noteOnMidi(midi);
  const n = Math.floor(seconds * FS);
  const out = new Float32Array(n);
  const block = 128;
  let slips = 0, slipsLate = 0;
  for (let i = 0; i < n; i += block) {
    const sub = out.subarray(i, Math.min(i + block, n));
    m.process(sub, sub.length);
    const s = m.stats().slips;
    slips += s;
    if (i > n / 2) slipsLate += s;
  }
  const tail = out.subarray(Math.floor(n / 2));
  let rms = 0, peak = 0, bad = false;
  for (const v of tail) { rms += v * v; peak = Math.max(peak, Math.abs(v)); if (!Number.isFinite(v)) bad = true; }
  rms = Math.sqrt(rms / tail.length);
  const p = detectPitch(tail.subarray(0, 8192), FS);
  const f0 = midiToHz(midi);
  const periods = (tail.length / FS) * f0;
  return { out, f0, hz: p.hz, clarity: p.clarity, cents: 1200 * Math.log2((p.hz || 1) / f0), slipsPerPeriod: slipsLate / periods, rms, peak, bad };
}

function wav(path, x) {
  const b = Buffer.alloc(44 + x.length * 2);
  b.write('RIFF', 0); b.writeUInt32LE(36 + x.length * 2, 4); b.write('WAVE', 8); b.write('fmt ', 12);
  b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(FS, 24);
  b.writeUInt32LE(FS * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(x.length * 2, 40);
  for (let i = 0; i < x.length; i++) b.writeInt16LE(Math.round(Math.max(-1, Math.min(1, x[i])) * 32767), 44 + i * 2);
  writeFileSync(path, b);
}

const args = process.argv.slice(2);
const isMain = import.meta.url === `file://${process.argv[1]}`;
const fmt = (r) => `f0 ${r.f0.toFixed(1)} → ${r.hz.toFixed(1)} Hz (${r.cents >= 0 ? '+' : ''}${r.cents.toFixed(0)} c, clarity ${r.clarity.toFixed(2)}) slips/period ${r.slipsPerPeriod.toFixed(2)} rms ${r.rms.toFixed(3)} peak ${r.peak.toFixed(2)}${r.bad ? ' NaN!' : ''}`;

if (!isMain) { /* imported as a module */ } else if (args.includes("--sweep")) {
  for (const forceScale of [0.05, 0.1, 0.2, 0.35, 0.6, 1.0]) {
    for (const bowForce of [0.2, 0.5, 0.8]) {
      const r = renderNote(67, { forceScale, bowForce, vibratoDepth: 0 });
      console.log(`forceScale ${forceScale.toFixed(2)} bowForce ${bowForce}: ${fmt(r)}`);
    }
  }
} else {
  const base = { vibratoDepth: 0 };
  for (const midi of [55, 62, 67, 69, 76, 81, 88]) console.log(`midi ${midi}: ${fmt(renderNote(midi, base))}`);
  const i = args.indexOf('--wav');
  if (i >= 0) {
    const r = renderNote(69, { vibratoDepth: 0.4 }, 3);
    wav(args[i + 1], r.out);
    console.log(`wrote ${args[i + 1]}`);
  }
}
