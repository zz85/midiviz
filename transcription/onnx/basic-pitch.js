// Basic Pitch (Spotify, ICASSP 2022) without TensorFlow: the windowing, output
// unwrapping and note creation around the model, written against flat
// Float32Arrays so any runtime can supply the model (onnxruntime-web here).
//
// Ported from spotify/basic-pitch (Python: inference.py, note_creation.py) and
// basic-pitch-ts (toMidi.ts, inference.ts), both Apache-2.0, Copyright Spotify AB.
// Differences from the TS port, all toward the Python reference:
//   - onsets are peaks with scipy's edge rule (first/last frame never peak), >= threshold
//   - frequency limits round like librosa, min/max freq are optional
//   - the melodia pass walks cells in descending order once instead of a global
//     argmax per note (same result: energies only ever drop to 0)
//   - frame times come from the exact window geometry rather than the
//     "magic offset" approximation (differs from it by < 10 ms per minute)
//
// Model I/O (basic-pitch-nmp.onnx, from basic_pitch/saved_models/icassp_2022):
//   in  'serving_default_input_2:0'  [batch, 43844, 1]  mono audio at 22050 Hz
//   out 'StatefulPartitionedCall:1'  [batch, 172, 88]   note (frame) activations
//       'StatefulPartitionedCall:2'  [batch, 172, 88]   onset activations
//       'StatefulPartitionedCall:0'  [batch, 172, 264]  pitch contour, 3 bins / semitone

export const SAMPLE_RATE = 22050
export const FFT_HOP = 256
export const N_NOTES = 88
export const N_CONTOUR = 264
export const MIDI_OFFSET = 21
export const WINDOW = SAMPLE_RATE * 2 - FFT_HOP          // 43844 samples
export const FRAMES_PER_WINDOW = 172
export const N_OVERLAP = 30                               // frames shared by neighbouring windows
export const OVERLAP_SAMPLES = N_OVERLAP * FFT_HOP        // 7680
export const HOP = WINDOW - OVERLAP_SAMPLES               // 36164 samples (1.64 s)
export const KEEP = FRAMES_PER_WINDOW - N_OVERLAP         // 142 frames kept per window
export const LEAD = N_OVERLAP / 2                         // 15 frames trimmed each side
export const PAD = OVERLAP_SAMPLES / 2                    // zeros in front of the audio
export const FPS = SAMPLE_RATE / FFT_HOP                  // 86.13 frames per second

export const ONNX_IO = {
  input: 'serving_default_input_2:0',
  note: 'StatefulPartitionedCall:1',
  onset: 'StatefulPartitionedCall:2',
  contour: 'StatefulPartitionedCall:0',
}

export const DEFAULTS = {
  onsetThreshold: 0.5,
  frameThreshold: 0.3,
  minNoteMs: 127.7,
  minFreq: null,
  maxFreq: null,
  inferOnsets: true,
  melodia: true,
  energyTolerance: 11,
  pitchBends: true,
}

export const hzToMidi = hz => 12 * Math.log2(hz / 440) + 69
export const midiToHz = m => 440 * 2 ** ((m - 69) / 12)

/** Time in seconds (in the original audio) of output frame f. */
export function frameTime(f) {
  const w = Math.floor(f / KEEP)
  return (w * HOP - PAD + (f - w * KEEP + LEAD) * FFT_HOP) / SAMPLE_RATE
}

/** Output frames kept for `nSamples` of audio (inference.py unwrap_output trims to this). */
export const framesFor = nSamples => Math.floor((nSamples / HOP) * KEEP)

/**
 * Incremental windowing: push audio as it arrives (a whole file or live
 * microphone chunks), take windows as soon as they are complete, then
 * append the model's outputs. Holds the unwrapped note / onset / contour
 * matrices (row-major, frames x bins) that grow as windows are added.
 */
export class Transcriber {
  constructor() { this.reset() }

  reset() {
    this.buf = new Float32Array(PAD + WINDOW * 2)   // starts with PAD zeros
    this.len = PAD                                  // valid samples in buf
    this.taken = 0                                  // windows handed out
    this.samples = 0                                // audio pushed so far
    this.frames = 0                                 // frames appended
    this.note = new Float32Array(0)
    this.onset = new Float32Array(0)
    this.contour = new Float32Array(0)
    this.ended = false
  }

  push(audio) {
    if (this.len + audio.length > this.buf.length) {
      const nb = new Float32Array(Math.max(this.buf.length * 2, this.len + audio.length))
      nb.set(this.buf.subarray(0, this.len)); this.buf = nb
    }
    this.buf.set(audio, this.len)
    this.len += audio.length
    this.samples += audio.length
  }

  /** Windows ready to run, as one Float32Array of n * WINDOW samples. With `end`, pads out the tail. */
  take(end = false) {
    // window k starts at k*HOP in the padded signal; it is ready once complete
    // (or, at the end, while it starts before the end of the padded signal)
    let n = 0
    while (true) {
      const start = (this.taken + n) * HOP - this.base()
      if (start + WINDOW <= this.len || (end && (this.taken + n) * HOP < PAD + this.samples)) n++
      else break
    }
    if (end) this.ended = true
    const out = new Float32Array(n * WINDOW)
    for (let i = 0; i < n; i++) {
      const start = (this.taken + i) * HOP - this.base()
      const stop = Math.min(start + WINDOW, this.len)
      out.set(this.buf.subarray(start, stop), i * WINDOW)
    }
    this.taken += n
    // drop audio no later window needs
    const keepFrom = this.taken * HOP - this.base()
    if (keepFrom > 0) {
      this.buf.copyWithin(0, keepFrom, this.len); this.len -= keepFrom; this.dropped = (this.dropped || 0) + keepFrom
    }
    return { windows: out, count: n }
  }

  base() { return this.dropped || 0 }

  /** Append model outputs for `count` windows (flat [count, 172, bins] arrays). */
  append(note, onset, contour, count) {
    const add = count * KEEP
    const grow = (a, bins) => { const b = new Float32Array((this.frames + add) * bins); b.set(a); return b }
    const n2 = grow(this.note, N_NOTES), o2 = grow(this.onset, N_NOTES), c2 = grow(this.contour, N_CONTOUR)
    for (let w = 0; w < count; w++) {
      const src = w * FRAMES_PER_WINDOW + LEAD, dst = this.frames + w * KEEP
      n2.set(note.subarray(src * N_NOTES, (src + KEEP) * N_NOTES), dst * N_NOTES)
      o2.set(onset.subarray(src * N_NOTES, (src + KEEP) * N_NOTES), dst * N_NOTES)
      c2.set(contour.subarray(src * N_CONTOUR, (src + KEEP) * N_CONTOUR), dst * N_CONTOUR)
    }
    this.note = n2; this.onset = o2; this.contour = c2
    this.frames += add
  }

  /** The matrices trimmed to the audio pushed so far (or all frames before the end). */
  output() {
    const n = this.ended ? Math.min(this.frames, framesFor(this.samples)) : this.frames
    return {
      frames: n,
      note: this.note.subarray(0, n * N_NOTES),
      onset: this.onset.subarray(0, n * N_NOTES),
      contour: this.contour.subarray(0, n * N_CONTOUR),
    }
  }
}

/** Number of windows the reference produces for nSamples of audio. */
export const windowCount = nSamples => Math.ceil((PAD + nSamples) / HOP)

/**
 * Model output → note events, as basic_pitch.note_creation.output_to_notes_polyphonic
 * followed by get_pitch_bends. Inputs are not modified.
 * Returns [{ pitch, start, end, startFrame, endFrame, amplitude, velocity, bends? }].
 */
export function notesFromOutput(out, opts = {}) {
  const o = { ...DEFAULTS, ...opts }
  const T = out.frames, F = N_NOTES
  if (T < 2) return []
  const minLen = Math.round((o.minNoteMs / 1000) * FPS)
  const thr = o.frameThreshold
  const frames = Float32Array.from(out.note.subarray(0, T * F))
  let onsets = Float32Array.from(out.onset.subarray(0, T * F))

  // constrain_frequency
  const lo = o.minFreq ? Math.max(0, Math.round(hzToMidi(o.minFreq) - MIDI_OFFSET)) : 0
  const hi = o.maxFreq ? Math.min(F, Math.round(hzToMidi(o.maxFreq) - MIDI_OFFSET)) : F
  if (lo > 0 || hi < F) {
    for (let t = 0; t < T; t++) for (let f = 0; f < F; f++) if (f < lo || f >= hi) frames[t * F + f] = onsets[t * F + f] = 0
  }

  // get_infered_onsets: onsets where the frame activation jumps (over 1 and 2 frames)
  if (o.inferOnsets) {
    const diff = new Float32Array(T * F)
    let dmax = 0, omax = 0
    for (let i = 0; i < T * F; i++) if (onsets[i] > omax) omax = onsets[i]
    for (let t = 2; t < T; t++) {
      for (let f = 0; f < F; f++) {
        const v = frames[t * F + f]
        const d = Math.min(v - frames[(t - 1) * F + f], v - frames[(t - 2) * F + f])
        if (d > 0) { diff[t * F + f] = d; if (d > dmax) dmax = d }
      }
    }
    if (dmax > 0) {
      const s = omax / dmax, merged = new Float32Array(T * F)
      for (let i = 0; i < T * F; i++) merged[i] = Math.max(onsets[i], diff[i] * s)
      onsets = merged
    }
  }

  // peaks in time (scipy.signal.argrelmax, axis 0, edges excluded) at or above the onset threshold
  const starts = []
  for (let t = 1; t < T - 1; t++) {
    for (let f = 0; f < F; f++) {
      const v = onsets[t * F + f]
      if (v >= o.onsetThreshold && v > onsets[(t - 1) * F + f] && v > onsets[(t + 1) * F + f]) starts.push(t * F + f)
    }
  }

  const energy = Float32Array.from(frames)
  const clear = (t, f) => {
    energy[t * F + f] = 0
    if (f < F - 1) energy[t * F + f + 1] = 0
    if (f > 0) energy[t * F + f - 1] = 0
  }
  const mean = (a, b, f) => { let s = 0; for (let t = a; t < b; t++) s += frames[t * F + f]; return s / (b - a) }
  const events = []

  // each onset, latest first, extends while the frame energy stays up
  for (let s = starts.length - 1; s >= 0; s--) {
    const t0 = Math.floor(starts[s] / F), f = starts[s] % F
    if (t0 >= T - 1) continue
    let i = t0 + 1, k = 0
    while (i < T - 1 && k < o.energyTolerance) {
      k = energy[i * F + f] < thr ? k + 1 : 0
      i++
    }
    i -= k
    if (i - t0 <= minLen) continue
    for (let t = t0; t < i; t++) clear(t, f)
    events.push([t0, i, f, mean(t0, i, f)])
  }

  // melodia trick: notes grown in both directions from the strongest leftover energy
  if (o.melodia) {
    const cand = []
    for (let i = 0; i < T * F; i++) if (energy[i] > thr) cand.push(i)
    cand.sort((a, b) => energy[b] - energy[a] || a - b)
    const orig = Float32Array.from(energy)
    for (const idx of cand) {
      if (energy[idx] !== orig[idx] || energy[idx] <= thr) continue   // already consumed
      const tm = Math.floor(idx / F), f = idx % F
      energy[idx] = 0
      let i = tm + 1, k = 0
      while (i < T - 1 && k < o.energyTolerance) {
        k = energy[i * F + f] < thr ? k + 1 : 0
        clear(i, f); i++
      }
      const iEnd = i - 1 - k
      i = tm - 1; k = 0
      while (i > 0 && k < o.energyTolerance) {
        k = energy[i * F + f] < thr ? k + 1 : 0
        clear(i, f); i--
      }
      const iStart = i + 1 + k
      if (iEnd - iStart <= minLen) continue
      events.push([iStart, iEnd, f, mean(iStart, iEnd, f)])
    }
  }

  const notes = events.map(([a, b, f, amp]) => ({
    pitch: f + MIDI_OFFSET,
    start: frameTime(a),
    end: frameTime(b),
    startFrame: a,
    endFrame: b,
    amplitude: amp,
    velocity: Math.max(1, Math.min(127, Math.round(127 * amp))),
  }))
  if (o.pitchBends) addPitchBends(out.contour, notes)
  return notes.sort((a, b) => a.start - b.start || a.pitch - b.pitch)
}

/** get_pitch_bends: per frame, the contour peak near the note (Gaussian-weighted, ±25 bins), in 1/3 semitones. */
export function addPitchBends(contour, notes, tol = 25) {
  const W = tol * 2 + 1, gauss = new Float32Array(W)
  for (let n = 0; n < W; n++) gauss[n] = Math.exp(-0.5 * ((n - tol) / 5) ** 2)
  for (const note of notes) {
    const c = Math.round(36 * Math.log2(midiToHz(note.pitch) / 27.5))
    const a = Math.max(c - tol, 0), b = Math.min(N_CONTOUR, c + tol + 1)
    const g0 = Math.max(0, tol - c), shift = tol - g0
    const bends = new Array(note.endFrame - note.startFrame)
    for (let t = note.startFrame; t < note.endFrame; t++) {
      let best = -Infinity, bi = 0
      for (let j = a; j < b; j++) {
        const v = contour[t * N_CONTOUR + j] * gauss[g0 + j - a]
        if (v > best) { best = v; bi = j - a }
      }
      bends[t - note.startFrame] = bi - shift
    }
    note.bends = bends
  }
  return notes
}

/** Linear-interpolating resampler (for audio already band-limited by the browser's decode). */
export function resample(x, from, to = SAMPLE_RATE) {
  if (from === to) return x
  const n = Math.floor((x.length * to) / from), y = new Float32Array(n), r = from / to
  for (let i = 0; i < n; i++) {
    const p = i * r, j = Math.floor(p), u = p - j
    y[i] = (x[j] || 0) * (1 - u) + (x[j + 1] || 0) * u
  }
  return y
}
