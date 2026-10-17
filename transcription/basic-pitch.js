// Basic Pitch (Spotify, ICASSP 2022) for midiviz: windowing, streaming,
// note extraction, scoring. Runs in a worker, on the main thread or in node.
//
// The model (vendor/basic-pitch/model.json, 900 KB tfjs graph) maps a 2 s
// window of 22050 Hz mono audio (43844 samples) to three posteriorgrams at
// 86.13 frames/s (hop 256): note frames and onsets over 88 keys and pitch
// contours over 264 bins (3 per semitone). Windows overlap by 30 frames; the
// first and last 15 output frames of each are dropped and the rest
// concatenated, exactly as in @spotify/basic-pitch's evaluateModel(), so the
// rows we produce are identical to the library's (test/basic-pitch.test.js).
//
// Notes come from the library's own post-processing (vendor/basic-pitch/
// toMidi.js, Apache-2.0), wrapped so it can be re-run with new thresholds on
// the stored posteriorgrams without touching the model again.

import { outputToNotesPoly, addPitchBendsToNoteEvents, noteFramesToTime } from './vendor/basic-pitch/toMidi.js'

export const SR = 22050
export const HOP = 256
export const FPS = Math.floor(SR / HOP)            // 86 (the library's rounding)
export const WIN = SR * 2 - HOP                    // 43844 samples per window
export const OVERLAP = 30 * HOP                    // 7680 samples
export const STEP = WIN - OVERLAP                  // 36164 samples between windows
export const PAD = OVERLAP / 2                     // zeros prepended to the audio
export const TRIM = 15                             // frames dropped at each end of a window
export const WIN_FRAMES = 172                      // model output frames per window
export const KEEP = WIN_FRAMES - 2 * TRIM          // 142 frames kept per window
export const NOTES = 88, BINS = 264, MIDI_LOW = 21
export const OUT = { frames: 'Identity_1', onsets: 'Identity_2', contours: 'Identity' }

// Same frame → seconds mapping as the library (it corrects the 0.73-frame
// mismatch between window step and kept frames once per 172 frames).
const WINDOW_OFFSET = (HOP / SR) * (WIN_FRAMES - WIN / HOP) + 0.0018
export const frameToTime = f => (f * HOP) / SR - WINDOW_OFFSET * Math.floor(f / WIN_FRAMES)

/** Number of output frames the library keeps for `n` input samples. */
export const framesForSamples = n => Math.floor(n * (FPS / SR))

/** Window `i` covers input samples [start, start + WIN) (start may be negative: zero padding). */
export const windowStart = i => i * STEP - PAD

/** Windows needed for `n` samples (tf.signal.frame with pad_end over PAD + n samples). */
export const windowCount = n => Math.max(1, Math.ceil((PAD + n) / STEP))

/** Load the graph model. `src` is a URL, or an IOHandler (tf.io.fromMemory in node). */
export async function loadModel(tf, src) {
  const model = await tf.loadGraphModel(src)
  return model
}

/**
 * Run the model on a batch of windows. `wins` is an array of Float32Array(WIN).
 * Returns { frames, onsets, contours } as Float32Array [nWin × 172 × width].
 */
export async function runWindows(tf, model, wins) {
  const n = wins.length
  const input = new Float32Array(n * WIN)
  wins.forEach((w, i) => input.set(w, i * WIN))
  const x = tf.tensor3d(input, [n, WIN, 1])
  const outs = model.execute(x, [OUT.frames, OUT.onsets, OUT.contours])
  const [frames, onsets, contours] = await Promise.all(outs.map(t => t.data()))
  x.dispose(); outs.forEach(t => t.dispose())
  return { frames, onsets, contours, n }
}

/** Cut window `i` out of `audio` (zero padded both sides). */
export function sliceWindow(audio, i, available = audio.length) {
  const w = new Float32Array(WIN)
  const s = windowStart(i)
  const a = Math.max(0, s), b = Math.min(available, s + WIN)
  if (b > a) w.set(audio.subarray(a, b), a - s)
  return w
}

/**
 * Growable posteriorgram store: rows of 88 (frames, onsets) and 264 (contours)
 * values in flat Float32Arrays. `length` is the number of committed rows.
 */
export class Posteriorgram {
  constructor(cap = 4096) {
    this.length = 0
    this.cap = cap
    this.frames = new Float32Array(cap * NOTES)
    this.onsets = new Float32Array(cap * NOTES)
    this.contours = new Float32Array(cap * BINS)
  }
  reserve(n) {
    if (n <= this.cap) return
    let cap = this.cap
    while (cap < n) cap *= 2
    for (const [k, w] of [['frames', NOTES], ['onsets', NOTES], ['contours', BINS]]) {
      const a = new Float32Array(cap * w); a.set(this[k]); this[k] = a
    }
    this.cap = cap
  }
  /** Append rows (row-major Float32Arrays of equal row counts). */
  append(frames, onsets, contours) {
    const n = frames.length / NOTES
    this.reserve(this.length + n)
    this.frames.set(frames, this.length * NOTES)
    this.onsets.set(onsets, this.length * NOTES)
    this.contours.set(contours, this.length * BINS)
    this.length += n
  }
  truncate(n) { this.length = Math.min(this.length, n) }
  /** Rows as arrays of Float32Array views; `copy` first (the library edits in place). */
  rows(key, from = 0, to = this.length, copy = true) {
    const w = key === 'contours' ? BINS : NOTES
    const src = copy ? this[key].slice(from * w, to * w) : this[key].subarray(from * w, to * w)
    const out = new Array(to - from)
    for (let r = 0; r < out.length; r++) out[r] = src.subarray(r * w, (r + 1) * w)
    return out
  }
}

/** Keep the middle KEEP rows of window `k` in a batch result; `limit` caps the count. */
export function keptRows(res, k, limit = KEEP) {
  const n = Math.max(0, Math.min(KEEP, limit))
  const pick = (arr, w) => arr.subarray((k * WIN_FRAMES + TRIM) * w, (k * WIN_FRAMES + TRIM + n) * w)
  return { frames: pick(res.frames, NOTES), onsets: pick(res.onsets, NOTES), contours: pick(res.contours, BINS), n }
}

/**
 * Streaming transcriber. Push 22050 Hz mono samples as they arrive; every full
 * window is run once and its kept rows committed. `peek()` runs the pending
 * (incomplete) window on what has arrived so far, zero padded like the last
 * window of a file, to show provisional rows with low latency. `finish()`
 * runs the rest and trims to the library's frame count, so the committed rows
 * of a streamed file equal those of a whole-file run.
 */
export class StreamTranscriber {
  constructor(tf, model, { batch = 4 } = {}) {
    this.tf = tf; this.model = model; this.batch = batch
    this.audio = new Float32Array(SR * 60)
    this.n = 0
    this.next = 0            // next window index to run
    this.pg = new Posteriorgram()
    this.ms = 0              // model time spent
  }
  push(samples) {
    if (this.n + samples.length > this.audio.length) {
      let cap = this.audio.length
      while (cap < this.n + samples.length) cap *= 2
      const a = new Float32Array(cap); a.set(this.audio.subarray(0, this.n)); this.audio = a
    }
    this.audio.set(samples, this.n)
    this.n += samples.length
  }
  /** Windows whose samples have all arrived and not yet run. */
  readyWindows() {
    let k = 0
    while (windowStart(this.next + k) + WIN <= this.n) k++
    return k
  }
  async _run(count, available) {
    const t0 = performance.now()
    const wins = []
    for (let k = 0; k < count; k++) wins.push(sliceWindow(this.audio, this.next + k, available))
    const res = await runWindows(this.tf, this.model, wins)
    this.ms += performance.now() - t0
    return res
  }
  /** Run all complete windows (in batches). Returns the number of new rows. */
  async step() {
    const before = this.pg.length
    let k
    while ((k = Math.min(this.batch, this.readyWindows())) > 0) {
      const res = await this._run(k, this.n)
      for (let j = 0; j < k; j++) { const r = keptRows(res, j); this.pg.append(r.frames, r.onsets, r.contours) }
      this.next += k
    }
    return this.pg.length - before
  }
  /** Provisional rows for the audio past the committed windows: { from, frames, onsets, contours, n }. */
  async peek() {
    const s = windowStart(this.next)
    const valid = Math.floor((this.n - s) / HOP) - TRIM   // rows backed by real audio
    if (valid <= 0) return null
    const res = await this._run(1, this.n)
    const r = keptRows(res, 0, valid)
    return { from: this.next * KEEP, ...r }
  }
  /** Run the remaining windows and trim to the library's length. */
  async finish() {
    await this.step()
    const total = windowCount(this.n)
    while (this.next < total) {
      const k = Math.min(this.batch, total - this.next)
      const res = await this._run(k, this.n)
      for (let j = 0; j < k; j++) { const r = keptRows(res, j); this.pg.append(r.frames, r.onsets, r.contours) }
      this.next += k
    }
    this.pg.truncate(framesForSamples(this.n))
    return this.pg
  }
}

/** Whole-buffer transcription (22050 Hz mono). onProgress(0..1). */
export async function transcribe(tf, model, audio, { batch = 4, onProgress } = {}) {
  const st = new StreamTranscriber(tf, model, { batch })
  st.audio = audio; st.n = audio.length
  const total = windowCount(audio.length)
  while (st.next < total) {
    const k = Math.min(batch, total - st.next)
    const res = await st._run(k, audio.length)
    for (let j = 0; j < k; j++) { const r = keptRows(res, j); st.pg.append(r.frames, r.onsets, r.contours) }
    st.next += k
    onProgress?.(st.next / total)
  }
  st.pg.truncate(framesForSamples(audio.length))
  return { pg: st.pg, ms: st.ms }
}

export const DEFAULTS = {
  onsetThresh: 0.5,      // library defaults (basicpitch.io uses 0.5 / 0.3 too)
  frameThresh: 0.3,
  minNoteMs: 127.7,      // python default (11 frames); the TS default is 5 frames
  inferOnsets: true,
  melodiaTrick: true,
  energyTolerance: 11,
  minMidi: null,
  maxMidi: null,
  pitchBends: true,
}

const midiHz = m => 440 * 2 ** ((m - 69) / 12)
const hzToMidi = hz => 12 * (Math.log2(hz) - Math.log2(440)) + 69

/**
 * Same result as the library's outputToNotesPoly(), in linear time on flat
 * arrays. The library rescans the whole matrix for every note its "melodia
 * trick" pass recovers (O(frames² · 88): 40 s for 3 min of audio); here a max
 * tree over per-row maxima finds the next peak. Arithmetic, tie-breaking and
 * visiting order follow the library line by line (test/basic-pitch.test.js
 * checks equality on real model output).
 *   frames, onsets: Float32Array(n × 88), row-major (not modified)
 *   returns [{ startFrame, durationFrames, pitchMidi, amplitude }]
 */
export function notesPoly(framesIn, onsetsIn, n, onsetThresh = 0.5, frameThresh = 0.3, minNoteLen = 5,
  inferOnsets = true, maxFreq = null, minFreq = null, melodiaTrick = true, energyTolerance = 11) {
  const W = NOTES
  if (n === 0) return []
  const frames = Float64Array.from(framesIn.subarray(0, n * W))
  let onsets = Float64Array.from(onsetsIn.subarray(0, n * W))
  let thresh = frameThresh
  if (thresh === null) {
    let s = 0, s2 = 0
    for (const v of frames) { s += v; s2 += v * v }
    const c = frames.length
    thresh = s / c + Math.sqrt((1 / (c - 1)) * (s2 - (s * s) / c))
  }
  // constrainFrequency (TypedArray.fill truncates fractional indices, as Array.fill does)
  const fillCols = (a, from, to) => { from = Math.trunc(from); to = Math.trunc(to); if (from < 0) from = Math.max(0, W + from); if (to < 0) to = Math.max(0, W + to); for (let r = 0; r < n; r++) a.fill(0, r * W + Math.min(W, from), r * W + Math.min(W, to)) }
  if (maxFreq) { const k = hzToMidi(maxFreq) - MIDI_LOW; fillCols(onsets, k, W); fillCols(frames, k, W) }
  if (minFreq) { const k = hzToMidi(minFreq) - MIDI_LOW; fillCols(onsets, 0, k); fillCols(frames, 0, k) }

  if (inferOnsets) {
    // frame_diff = max(0, min over n=1,2 of frames[r] - frames[r-n]); rows < 2 zeroed; rescaled to max(onsets)
    const diff = new Float64Array(n * W)
    let onsetMax = 0, diffMax = 0
    for (let i = 0; i < n * W; i++) if (onsets[i] > onsetMax) onsetMax = onsets[i]
    for (let r = 2; r < n; r++) {
      for (let c = 0; c < W; c++) {
        const v = frames[r * W + c]
        const d = Math.max(Math.min(v - frames[(r - 1) * W + c], v - frames[(r - 2) * W + c]), 0)
        diff[r * W + c] = d
        if (d > diffMax) diffMax = d
      }
    }
    const inf = new Float64Array(n * W)
    for (let i = 0; i < n * W; i++) inf[i] = Math.max(onsets[i], (onsetMax * diff[i]) / diffMax)
    onsets = inf
  }

  // onset peaks (argrelmax over time, order 1) above threshold, visited in reverse row-major order
  const starts = []
  for (let r = n - 1; r >= 0; r--) {
    for (let c = W - 1; c >= 0; c--) {
      const v = onsets[r * W + c]
      if (!(v > onsetThresh)) continue
      if (r > 0 && !(v > onsets[(r - 1) * W + c])) continue
      if (r < n - 1 && !(v > onsets[(r + 1) * W + c])) continue
      starts.push(r, c)
    }
  }

  const energy = frames.slice()
  const events = []
  const mean = (a, b, c) => { let s = 0; for (let j = a; j < b; j++) s += frames[j * W + c]; return s / (b - a) }
  const zero3 = (j, c) => { energy[j * W + c] = 0; if (c < W - 1) energy[j * W + c + 1] = 0; if (c > 0) energy[j * W + c - 1] = 0 }
  for (let q = 0; q < starts.length; q += 2) {
    const s = starts[q], c = starts[q + 1]
    if (s >= n - 1) continue
    let i = s + 1, k = 0
    while (i < n - 1 && k < energyTolerance) { if (energy[i * W + c] < thresh) k++; else k = 0; i++ }
    i -= k
    if (i - s <= minNoteLen) continue
    for (let j = s; j < i; j++) zero3(j, c)
    events.push({ startFrame: s, durationFrames: i - s, pitchMidi: c + MIDI_LOW, amplitude: mean(s, i, c) })
  }

  if (melodiaTrick) {
    // max tree over row maxima; a row's argmax is its LAST maximal column, the tree keeps the FIRST maximal row
    const rowMax = new Float64Array(n), rowArg = new Int32Array(n)
    const scanRow = r => { let m = -Infinity, a = 0; for (let c = 0; c < W; c++) { const v = energy[r * W + c]; if (!(m > v)) { m = v; a = c } } rowMax[r] = m; rowArg[r] = a }
    let size = 1; while (size < n) size <<= 1
    const tree = new Int32Array(2 * size).fill(-1)
    const better = (a, b) => a < 0 ? b : b < 0 ? a : (rowMax[b] > rowMax[a] ? b : rowMax[a] > rowMax[b] ? a : Math.min(a, b))
    for (let r = 0; r < n; r++) { scanRow(r); tree[size + r] = r }
    for (let p = size - 1; p >= 1; p--) tree[p] = better(tree[2 * p], tree[2 * p + 1])
    const dirty = new Set()
    const update = () => {
      for (const r of dirty) { scanRow(r); let p = (size + r) >> 1; while (p >= 1) { tree[p] = better(tree[2 * p], tree[2 * p + 1]); p >>= 1 } }
      dirty.clear()
    }
    while (true) {
      const top = tree[1]
      if (!(Math.max(0, rowMax[top]) > thresh)) break // globalMax() starts from 0
      const iMid = top
      // the library's scan starts from cell (0, 0) and only moves on a strictly larger value
      const c = top === 0 && energy[0] === rowMax[0] ? 0 : rowArg[top]
      energy[iMid * W + c] = 0; dirty.add(iMid)
      let i = iMid + 1, k = 0
      while (i < n - 1 && k < energyTolerance) { if (energy[i * W + c] < thresh) k++; else k = 0; zero3(i, c); dirty.add(i); i++ }
      const iEnd = i - 1 - k
      i = iMid - 1; k = 0
      while (i > 0 && k < energyTolerance) { if (energy[i * W + c] < thresh) k++; else k = 0; zero3(i, c); dirty.add(i); i-- }
      const iStart = i + 1 + k
      update()
      if (iEnd - iStart <= minNoteLen) continue
      events.push({ startFrame: iStart, durationFrames: iEnd - iStart, pitchMidi: c + MIDI_LOW, amplitude: mean(iStart, iEnd, c) })
    }
  }
  return events
}

/**
 * The library's own outputToNotesPoly() on plain-array copies (float64 rows,
 * as tfjs' .array() gives it): the reference notesPoly() is tested against.
 */
export function referenceNotesPoly(frames, onsets, n, ...args) {
  const rows = a => Array.from({ length: n }, (_, r) => Array.from(a.subarray(r * NOTES, (r + 1) * NOTES)))
  return outputToNotesPoly(rows(frames), rows(onsets), ...args)
}

/**
 * Notes from a posteriorgram with the given options. Returns
 * [{ pitch, on, off, velocity, bends?, startFrame, durationFrames }].
 * `from`/`to` limit the rows used (frame indices); times stay absolute.
 */
export function extractNotes(pg, opts = {}, from = 0, to = pg.length) {
  const o = { ...DEFAULTS, ...opts }
  if (to - from < 2) return []
  const minLen = Math.max(1, Math.round((o.minNoteMs / 1000) * (SR / HOP)))
  let ev = (o.reference ? referenceNotesPoly : notesPoly)(
    pg.frames.subarray(from * NOTES, to * NOTES), pg.onsets.subarray(from * NOTES, to * NOTES), to - from,
    o.onsetThresh, o.frameThresh, minLen, o.inferOnsets,
    // the library truncates hzToMidi(f) - 21 to a column index: +1.5 / +0.5 land inside the right column
    o.maxMidi != null ? midiHz(o.maxMidi + 1.5) : null, o.minMidi != null ? midiHz(o.minMidi + 0.5) : null,
    o.melodiaTrick, o.energyTolerance)
  if (o.pitchBends && ev.length) ev = addPitchBendsToNoteEvents(pg.rows('contours', from, to, false), ev)
  ev = ev.map(e => ({ ...e, startFrame: e.startFrame + from }))
  const times = noteFramesToTime(ev)
  return ev.map((e, i) => ({
    pitch: e.pitchMidi,
    on: times[i].startTimeSeconds,
    off: times[i].startTimeSeconds + times[i].durationSeconds,
    velocity: Math.max(0.05, Math.min(1, e.amplitude)),
    bends: e.pitchBends, // contour bins (1/3 semitone) per frame, relative to the note
    startFrame: e.startFrame,
    durationFrames: e.durationFrames,
  })).sort((a, b) => a.on - b.on || a.pitch - b.pitch)
}

/**
 * Note-level scoring in the style of mir_eval.transcription: a reference and
 * an estimated note match when the pitch is equal and the onsets are within
 * `onsetTol` s; with `offsets`, the offset must also be within
 * max(offsetTol, offsetRatio × reference duration). One-to-one matching,
 * greedy by onset distance (mir_eval uses maximum bipartite matching; the
 * difference is rare with a 50 ms window).
 */
export function scoreNotes(est, ref, { onsetTol = 0.05, offsets = false, offsetRatio = 0.2, offsetTol = 0.05 } = {}) {
  const pairs = []
  const byPitch = new Map()
  ref.forEach((r, j) => { if (!byPitch.has(r.pitch)) byPitch.set(r.pitch, []); byPitch.get(r.pitch).push(j) })
  est.forEach((e, i) => {
    for (const j of byPitch.get(e.pitch) || []) {
      const r = ref[j], d = Math.abs(e.on - r.on)
      if (d > onsetTol) continue
      if (offsets && Math.abs(e.off - r.off) > Math.max(offsetTol, offsetRatio * (r.off - r.on))) continue
      pairs.push([d, i, j])
    }
  })
  pairs.sort((a, b) => a[0] - b[0])
  const usedE = new Int32Array(est.length).fill(-1), usedR = new Int32Array(ref.length).fill(-1)
  let tp = 0
  for (const [, i, j] of pairs) if (usedE[i] < 0 && usedR[j] < 0) { usedE[i] = j; usedR[j] = i; tp++ }
  const p = est.length ? tp / est.length : 0, r = ref.length ? tp / ref.length : 0
  return { tp, fp: est.length - tp, fn: ref.length - tp, precision: p, recall: r, f1: p + r ? (2 * p * r) / (p + r) : 0, estMatch: usedE, refMatch: usedR }
}

/** Mix an AudioBuffer-like ({ numberOfChannels, getChannelData }) down to mono. */
export function toMono(buf) {
  const n = buf.length, ch = buf.numberOfChannels
  if (ch === 1) return buf.getChannelData(0).slice()
  const out = new Float32Array(n)
  for (let c = 0; c < ch; c++) { const d = buf.getChannelData(c); for (let i = 0; i < n; i++) out[i] += d[i] / ch }
  return out
}

/**
 * Streaming resampler for live input (when the capture context can't run at
 * 22050 Hz): windowed-sinc interpolation with the cutoff at the lower Nyquist.
 */
export class Resampler {
  constructor(from, to = SR, taps = 16) {
    this.ratio = from / to; this.taps = taps
    this.cut = Math.min(1, to / from)
    this.hist = new Float32Array(0); this.pos = 0 // pos: next output position in input samples, relative to hist[0]
  }
  push(x) {
    const buf = new Float32Array(this.hist.length + x.length)
    buf.set(this.hist); buf.set(x, this.hist.length)
    const out = []
    const T = this.taps, c = this.cut
    while (this.pos + T < buf.length) {
      const p = this.pos, i0 = Math.floor(p)
      let s = 0, wsum = 0
      for (let k = i0 - T + 1; k <= i0 + T; k++) {
        if (k < 0) continue
        const d = p - k
        const sinc = d === 0 ? 1 : Math.sin(Math.PI * c * d) / (Math.PI * c * d)
        const win = 0.5 + 0.5 * Math.cos((Math.PI * d) / (T + 1))
        const w = sinc * win
        s += buf[k] * w; wsum += w
      }
      out.push(wsum ? s / wsum : 0)
      this.pos += this.ratio
    }
    const drop = Math.max(0, Math.floor(this.pos) - T)
    this.hist = buf.slice(drop); this.pos -= drop
    return Float32Array.from(out)
  }
}

/** 16-bit PCM WAV bytes for mono Float32 samples. */
export function encodeWav(samples, sampleRate = SR) {
  const n = samples.length, buf = new ArrayBuffer(44 + n * 2), v = new DataView(buf)
  const str = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)) }
  str(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); str(8, 'WAVE'); str(12, 'fmt ')
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true)
  v.setUint32(24, sampleRate, true); v.setUint32(28, sampleRate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true)
  str(36, 'data'); v.setUint32(40, n * 2, true)
  for (let i = 0; i < n; i++) v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, samples[i])) * 32767, true)
  return new Uint8Array(buf)
}
