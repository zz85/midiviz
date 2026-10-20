// Evaluation corpus for #040: songs with known beats, downbeats, meter and
// swing, rendered with OxiSynth and the Creative GM soundfont, and a crude
// microphone model on top.
//
//   synthetic(spec)   drum kit + bass + chords from a style table (rock,
//                     house, funk, shuffle, jazz swing, waltz, 6/8, reggae,
//                     drum & bass, bossa, metal, ballad, piano only, a tempo
//                     ramp, a sudden tempo change), human timing jitter
//   midiSong(file)    a repo MIDI with its own tempo map and time signatures
//   mic(x, sr, o)     laptop-microphone model: high-pass, low-pass, a room
//                     (exponentially decaying noise impulse response), pink
//                     noise floor, a little level drift
//
// Everything is deterministic (seeded).

import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const require = createRequire(import.meta.url)

export function rng(seed = 1) {
  let s = seed >>> 0 || 1
  return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296 }
}

let synthMod = null, fontBytes = null
export async function loadSynth() {
  if (synthMod) return
  synthMod = await import(path.join(ROOT, 'soundfont-engine/vendor/oxisynth/oxisynth.js'))
  synthMod.initSync({ module: fs.readFileSync(path.join(ROOT, 'soundfont-engine/vendor/oxisynth/oxisynth_bg.wasm')) })
  fontBytes = new Uint8Array(fs.readFileSync(path.join(ROOT, 'soundfonts/Creative(emu10k1)8MBGMSFX.sf2')))
}

/** notes: [{ time, dur, ch, key, vel (1–127) }], programs: { ch: program } → mono Float32Array */
export function render(notes, duration, sr, programs = {}) {
  const synth = new synthMod.OxiSynthRaw(sr)
  synth.add_soundfont(fontBytes)
  for (let ch = 0; ch < 16; ch++) { synth.program_change(ch, programs[ch] ?? 0); synth.control_change(ch, 7, 100) }
  const ev = []
  for (const n of notes) {
    if (n.time >= duration) continue
    ev.push({ f: Math.max(0, Math.round(n.time * sr)), on: 1, n })
    ev.push({ f: Math.max(1, Math.round((n.time + Math.max(0.02, n.dur)) * sr)), on: 0, n })
  }
  ev.sort((a, b) => a.f - b.f || a.on - b.on)
  const total = Math.ceil(duration * sr), out = new Float32Array(total)
  let f = 0, i = 0
  while (f < total) {
    while (i < ev.length && ev[i].f <= f) {
      const e = ev[i++]
      if (e.on) synth.note_on(e.n.ch, e.n.key, Math.max(1, Math.min(127, Math.round(e.n.vel))))
      else synth.note_off(e.n.ch, e.n.key)
    }
    const n = Math.min(total, i < ev.length ? ev[i].f : Infinity, f + 4096) - f
    const buf = synth.render(n)
    for (let j = 0; j < n; j++) out[f + j] = 0.5 * (buf[2 * j] + buf[2 * j + 1])
    f += n
  }
  synth.free?.()
  return out
}

// ---- synthetic songs ------------------------------------------------------

const K = { kick: 36, snare: 38, rim: 37, clap: 39, chh: 42, phh: 44, ohh: 46, ride: 51, crash: 49, tomL: 45, tomH: 50, shaker: 70, clave: 75, cowbell: 56 }

// patterns: one bar, `steps` per beat; x = accent, o = normal, . = rest
export const STYLES = {
  rock:     { bpm: 120, meter: 4, steps: 4, kick: 'x.......x.o.....', snare: '....x.......x...', chh: 'o.o.o.o.o.o.o.o.', bass: 'roots8', chords: 'half' },
  house:    { bpm: 124, meter: 4, steps: 4, kick: 'x...x...x...x...', clap: '....x.......x...', ohh: '..o...o...o...o.', chh: 'o.o.o.o.o.o.o.o.', bass: 'offbeat', chords: 'stab' },
  funk:     { bpm: 96, meter: 4, steps: 4, kick: 'x..o..o...x..o..', snare: '....x..o.o..x...', chh: 'oooooooooooooooo', bass: 'funk', chords: 'stab16' },
  hiphop:   { bpm: 88, meter: 4, steps: 4, swing: 1.5, kick: 'x......o..x.....', snare: '....x.......x...', chh: 'o.o.o.o.o.o.o.o.', bass: 'roots', chords: 'whole' },
  shuffle:  { bpm: 104, meter: 4, steps: 4, swing: 2, kick: 'x.......x.......', snare: '....x.......x...', chh: 'o.o.o.o.o.o.o.o.', bass: 'walk8', chords: 'half' },
  jazz:     { bpm: 168, meter: 4, steps: 4, swing: 1.7, ride: 'x...o.o.x...o.o.', phh: '....x.......x...', kick: 'o...............', bass: 'walk', chords: 'comp' },
  waltz:    { bpm: 144, meter: 3, steps: 4, kick: 'x...........', snare: '....o...o...', chh: 'o...o...o...', bass: 'roots', chords: 'waltz' },
  sixeight: { bpm: 66, meter: 2, steps: 3, kick: 'x.....', snare: '...x..', chh: 'ooo ooo'.replace(/ /g, ''), bass: 'roots', chords: 'arp3' },
  reggae:   { bpm: 76, meter: 4, steps: 4, kick: '........x.......', rim: '........x.......', chh: 'o.o.o.o.o.o.o.o.', bass: 'reggae', chords: 'skank' },
  dnb:      { bpm: 172, meter: 4, steps: 4, kick: 'x.........x.....', snare: '....x.......x...', chh: 'o.o.o.o.o.o.o.o.', bass: 'whole', chords: 'whole' },
  bossa:    { bpm: 132, meter: 4, steps: 4, kick: 'x..ox..ox..ox..o', rim: 'x..x..x...x..x..', shaker: 'oooooooooooooooo', bass: 'bossa', chords: 'bossa' },
  metal:    { bpm: 184, meter: 4, steps: 4, kick: 'xoxoxoxoxoxoxoxo', snare: '....x.......x...', crashBar: true, ride: 'o.o.o.o.o.o.o.o.', bass: 'roots8', chords: 'power' },
  ballad:   { bpm: 70, meter: 4, steps: 4, kick: 'x.......x.......', snare: '....x.......x...', chh: 'o.o.o.o.o.o.o.o.', bass: 'roots', chords: 'arp' },
  piano:    { bpm: 92, meter: 4, steps: 4, bass: 'roots', chords: 'quarters' },
  ramp:     { bpm: [100, 132], meter: 4, steps: 4, kick: 'x.......x.o.....', snare: '....x.......x...', chh: 'o.o.o.o.o.o.o.o.', bass: 'roots8', chords: 'half' },
  jump:     { bpm: [108, 140], jump: true, meter: 4, steps: 4, kick: 'x.......x.o.....', snare: '....x.......x...', chh: 'o.o.o.o.o.o.o.o.', bass: 'roots8', chords: 'half' },
  fourfloor150: { bpm: 150, meter: 4, steps: 4, kick: 'x...x...x...x...', snare: '....x.......x...', ohh: '..o...o...o...o.', bass: 'offbeat', chords: 'stab' },
  slowwaltz:{ bpm: 84, meter: 3, steps: 4, bass: 'roots', chords: 'waltz' },
}

const PROG = [[0, 4, 7], [9, 0, 4], [5, 9, 0], [7, 11, 2]]           // I vi IV V (C major)
const ROOTS = [48, 45, 41, 43]

export function synthetic(name, { seconds = 30, seed = 1, bpm: bpmOverride } = {}) {
  const st = STYLES[name]
  const R = rng(seed)
  const meter = st.meter, steps = st.steps
  const [b0, b1] = Array.isArray(st.bpm) ? st.bpm : [bpmOverride ?? st.bpm, bpmOverride ?? st.bpm]
  // beat times from the tempo curve
  const beats = []
  let t = 0.5
  while (t < seconds + 2) {
    beats.push(t)
    const x = Math.min(1, t / seconds)
    const bpm = st.jump ? (t < seconds / 2 ? b0 : b1) : b0 + (b1 - b0) * x
    t += 60 / bpm
  }
  const at = pos => { // beat position → time
    const k = Math.floor(pos), f = pos - k
    if (k + 1 >= beats.length) return beats[beats.length - 1] + f * (beats[beats.length - 1] - beats[beats.length - 2])
    return beats[k] + f * (beats[k + 1] - beats[k])
  }
  const swing = st.swing || 1, q = swing / (1 + swing)
  const stepPos = s => { // step within a beat → fraction of the beat (8th-note swing)
    if (steps !== 4) return s / steps
    return [0, q / 2, q, q + (1 - q) / 2][s]
  }
  const notes = []
  const jitter = () => (R() - 0.5) * 0.012
  const hit = (pos, key, vel, ch = 9, dur = 0.1) => notes.push({ time: Math.max(0, at(pos) + jitter()), dur, ch, key, vel: vel * (0.85 + 0.3 * R()) })
  const bars = Math.floor(beats.length / meter)
  for (let bar = 0; bar < bars; bar++) {
    const b = bar * meter
    for (const inst of ['kick', 'snare', 'chh', 'ohh', 'phh', 'ride', 'rim', 'clap', 'shaker']) {
      const pat = st[inst]; if (!pat) continue
      for (let i = 0; i < pat.length; i++) {
        if (pat[i] === '.') continue
        const pos = b + Math.floor(i / steps) + stepPos(i % steps)
        hit(pos, K[inst], pat[i] === 'x' ? 105 : 70, 9, inst === 'ohh' ? 0.2 : 0.1)
      }
    }
    if (st.crashBar && bar % 4 === 0) hit(b, K.crash, 100)
    if (!st.crashBar && st.kick && bar % 8 === 0) hit(b, K.crash, 90)
    // harmony: one chord per bar
    const ci = bar % 4, chord = PROG[ci], root = ROOTS[ci]
    const len = at(b + meter) - at(b)
    const bass = (pos, key, d, v = 90) => notes.push({ time: at(pos) + jitter(), dur: d, ch: 1, key, vel: v * (0.9 + 0.2 * R()) })
    const pn = (pos, keys, d, v = 70) => { for (const k of keys) notes.push({ time: at(pos) + jitter() * 0.5, dur: d, ch: 0, key: k, vel: v * (0.9 + 0.2 * R()) }) }
    const triad = chord.map(c => 60 + c)
    const spb = len / meter
    switch (st.bass) {
      case 'roots': bass(b, root, len * 0.9); break
      case 'roots8': for (let i = 0; i < meter * 2; i++) bass(b + i / 2, root, spb * 0.45, i % 2 ? 75 : 95); break
      case 'offbeat': for (let i = 0; i < meter; i++) bass(b + i + 0.5, root, spb * 0.4); break
      case 'funk': for (const [p, k] of [[0, 0], [0.75, 12], [1.5, 0], [2.5, 7], [3, 0], [3.5, 10]]) bass(b + p, root + k, spb * 0.25); break
      case 'walk': for (let i = 0; i < meter; i++) bass(b + i, root + [0, 4, 7, 9][i], spb * 0.85); break
      case 'walk8': for (let i = 0; i < meter; i++) { bass(b + i, root + [0, 4, 7, 9][i], spb * 0.5); bass(b + i + q, root + [0, 4, 7, 9][i], spb * 0.3, 70) } break
      case 'reggae': bass(b + 0.5, root, spb * 0.8); bass(b + 2, root + 7, spb * 0.8); bass(b + 3, root + 12, spb * 0.4); break
      case 'whole': bass(b, root, len); break
      case 'bossa': bass(b, root, spb * 1.4); bass(b + 1.5, root + 7, spb * 0.4); bass(b + 2, root + 7, spb * 1.4); bass(b + 3.5, root, spb * 0.4); break
    }
    switch (st.chords) {
      case 'half': pn(b, triad, len / 2 * 0.95); pn(b + meter / 2, triad, len / 2 * 0.95, 60); break
      case 'whole': pn(b, triad, len * 0.98, 60); break
      case 'stab': for (let i = 0; i < meter; i++) pn(b + i + 0.5, triad, spb * 0.25, 65); break
      case 'stab16': for (const p of [0.25, 1.75, 2.25, 3.5]) pn(b + p, triad, spb * 0.2, 65); break
      case 'comp': pn(b + 1.5 - 1 + q, triad.map(k => k + 4), spb * 0.6, 55); pn(b + 2 + q, triad, spb * 0.4, 55); break
      case 'waltz': pn(b, [root + 12], spb * 0.9, 85); pn(b + 1, triad, spb * 0.5, 55); pn(b + 2, triad, spb * 0.5, 55); break
      case 'arp3': for (let i = 0; i < meter * steps; i++) pn(b + i / steps, [triad[[0, 1, 2, 1, 2, 1][i % 6]] + 12], spb / 3, 60); break
      case 'skank': for (let i = 0; i < meter; i++) pn(b + i + 0.5, triad.map(k => k + 12), spb * 0.2, 70); break
      case 'bossa': for (const p of [0, 1.5, 2.5, 3]) pn(b + p, triad, spb * 0.4, 60); break
      case 'power': pn(b, [root + 12, root + 19, root + 24], len * 0.95, 75); break
      case 'arp': for (let i = 0; i < meter * 2; i++) pn(b + i / 2, [triad[i % 3] + (i % 6 > 2 ? 12 : 0)], spb, 60); break
      case 'quarters': for (let i = 0; i < meter; i++) pn(b + i, i ? triad : [root + 12, ...triad], spb * 0.8, i ? 55 : 80); break
    }
  }
  const programs = { 0: st.chords === 'power' ? 30 : st.chords === 'skank' || st.chords === 'stab' ? 4 : 0, 1: st.bass === 'walk' || st.bass === 'walk8' ? 32 : 33 }
  const inRange = beats.filter(x => x < seconds)
  return {
    name, notes, programs, seconds,
    beats: inRange,
    downbeats: inRange.filter((_, i) => i % meter === 0),
    meter, sub: steps === 3 ? 3 : 2, swing,
    bpm: [b0, b1],
  }
}

// ---- MIDI files -------------------------------------------------------------

/** A repo MIDI: notes with programs, and beats / downbeats from its tempo map and time signatures. */
export function midiSong(file, { seconds = 40, start = 0 } = {}) {
  const { Midi } = require(path.join(ROOT, 'tonejs-midi.js'))
  const p = fs.existsSync(path.join(ROOT, 'midis', file)) ? path.join(ROOT, 'midis', file) : path.join(ROOT, file)
  const m = new Midi(fs.readFileSync(p))
  const ppq = m.header.ppq
  const notes = [], programs = {}
  for (const tr of m.tracks) {
    if (tr.channel !== 9) programs[tr.channel] = tr.instrument.number
    for (const n of tr.notes) notes.push({ time: n.time - start, dur: n.duration, ch: tr.channel, key: n.midi, vel: n.velocity * 127 })
  }
  // beats: the time signature's beat (compound meters: the dotted beat)
  const ts = m.header.timeSignatures.length ? m.header.timeSignatures : [{ ticks: 0, timeSignature: [4, 4] }]
  const endTick = m.header.secondsToTicks(start + seconds)
  const beats = [], downbeats = []
  for (let s = 0; s < ts.length; s++) {
    const [num, den] = ts[s].timeSignature
    // compound meters beat in dotted quarters; other x/8 meters (Libertango's 8/8) in quarters
    const compound = den === 8 && num % 3 === 0 && num > 3
    const eighths = den === 8 && !compound && num % 2 === 0
    const beatTicks = ppq * 4 / den * (compound ? 3 : eighths ? 2 : 1)
    const perBar = compound ? num / 3 : eighths ? num / 2 : num
    const t1 = s + 1 < ts.length ? ts[s + 1].ticks : endTick
    let k = 0
    for (let tick = ts[s].ticks; tick < t1 && tick <= endTick; tick += beatTicks, k++) {
      const sec = m.header.ticksToSeconds(tick) - start
      if (sec < 0) continue
      beats.push(sec)
      if (k % perBar === 0) downbeats.push(sec)
    }
  }
  const [num, den] = ts[0].timeSignature
  return {
    name: path.basename(file, '.mid'), notes: notes.filter(n => n.time >= 0), programs, seconds, beats, downbeats,
    meter: den === 8 && num % 3 === 0 && num > 3 ? num / 3 : num, sub: den === 8 && num % 3 === 0 && num > 3 ? 3 : 2,
  }
}

// ---- microphone model ---------------------------------------------------------

function biquad(x, sr, type, f0, Q = 0.707) {
  const w = 2 * Math.PI * f0 / sr, c = Math.cos(w), s = Math.sin(w), a = s / (2 * Q)
  let b0, b1, b2
  if (type === 'hp') { b0 = (1 + c) / 2; b1 = -(1 + c); b2 = (1 + c) / 2 } else { b0 = (1 - c) / 2; b1 = 1 - c; b2 = (1 - c) / 2 }
  const a0 = 1 + a, a1 = -2 * c, a2 = 1 - a
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0
  const y = new Float32Array(x.length)
  for (let i = 0; i < x.length; i++) {
    const v = (b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0
    x2 = x1; x1 = x[i]; y2 = y1; y1 = v; y[i] = v
  }
  return y
}

/** FFT convolution-free room: a sparse exponentially decaying noise IR applied by direct sparse taps. */
function room(x, sr, rt60, wet, R) {
  const taps = []
  const len = Math.round(rt60 * sr)
  for (let n = Math.round(0.004 * sr); n < len; n += Math.max(1, Math.round(sr * 0.0015 * (0.5 + R())))) {
    taps.push([n, (R() * 2 - 1) * Math.exp(-6.9 * n / len)])
  }
  let e = 0; for (const [, g] of taps) e += g * g
  const k = wet / Math.sqrt(e)
  const y = Float32Array.from(x)
  for (const [n, g] of taps) { const gg = g * k; for (let i = n; i < x.length; i++) y[i] += gg * x[i - n] }
  return y
}

export function mic(x, sr, { hp = 150, lp = 7000, rt60 = 0.5, wet = 0.6, snrDb = 30, seed = 7 } = {}) {
  const R = rng(seed)
  let y = room(x, sr, rt60, wet, R)
  y = biquad(y, sr, 'hp', hp); y = biquad(y, sr, 'hp', hp)
  y = biquad(y, sr, 'lp', lp)
  let e = 0; for (let i = 0; i < y.length; i++) e += y[i] * y[i]
  const rms = Math.sqrt(e / y.length), nr = rms * 10 ** (-snrDb / 20)
  // pink-ish noise (Paul Kellet's economy filter) and slow level drift
  let b0 = 0, b1 = 0, b2 = 0
  for (let i = 0; i < y.length; i++) {
    const w = R() * 2 - 1
    b0 = 0.99765 * b0 + w * 0.0990460; b1 = 0.96300 * b1 + w * 0.2965164; b2 = 0.57000 * b2 + w * 1.0526913
    const pink = (b0 + b1 + b2 + w * 0.1848) * 0.2
    y[i] = y[i] * (1 + 0.3 * Math.sin(2 * Math.PI * i / sr / 11)) + nr * pink
  }
  return y
}

export const MIDI_SET = [
  'mario_ground.mid', 'zelda_overworld.mid', 'tetris.mid', 'entertainer.mid', 'libertango.mid', 'mozart_eine_kleine.mid',
  'ff_battle.mid', 'minecraft_sweden.mid', 'comptine.mid', 'una_mattina.mid', 'mario_castle.mid', 'zelda_gerudo_valley.mid',
  'mz_545_1.mid', 'mz_331_3.mid', 'river_flows_in_you.mid', 'skyrim_sons.mid',
]
