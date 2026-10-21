// Expression for a piece no one has recorded: how a violinist would time it and
// shape its dynamics, predicted from the score by a model fitted on the
// recorded performances in violinist/performances (62 recordings of 37 pieces,
// strings/expression.js; fitted by violinist/tools/fit_expression.js into
// violinist/expression-model.json).
//
// The unit is an onset (a note or a chord). Each gets features read from the
// score alone: its length and place in the bar, where it sits in its phrase,
// its height against the line around it, slurs, leaps, written dynamics, the
// end of the piece. Two ridge regressions on those features give
//   tempo: log of the onset's played length (to the next onset) over its
//          written length at the piece's tempo (rubato, phrase ends, the
//          final ritardando, a lingering top note)
//   level: the onset's dynamic, as the lane the recordings were played with
//          on #034's Source model (strings/expression.js: corrected by
//          listening), relative to the piece's own average
// and a learned shape inside long notes (the swell players give them).
//
//   const m = await loadExpressionModel()
//   const ex = predictExpression(notes, m, { secPerQ })   // notes in place
//
// notes: a piece's violin notes with q (quarters), dq, pitch, velocity, beat,
// beatsPerBar, art (planArticulation run); grace notes (art.grace) follow their
// main note. The notes are retimed in place (on, off; the piece's length kept)
// and given velocities from the lane; the result is an expression lane for
// renderPerformance ({ timing: true, phrased: true, rate, t0, dyn }), as a
// recorded performer's is, but leaving our intonation and vibrato rules on.

export const RATE = 50
const clamp = (x, a, b) => Math.max(a, Math.min(b, x))
const median = a => { const s = a.filter(Number.isFinite).sort((x, y) => x - y); return s.length ? s[s.length >> 1] : NaN }

/** Onsets (chords) of the notes, grace notes left out: [{ q, ioiQ, notes, top, … }] in order. */
export function onsets(notes) {
  const main = notes.filter(n => !n.art?.grace).slice().sort((a, b) => a.q - b.q || a.pitch - b.pitch)
  const ev = []
  for (const n of main) {
    const last = ev[ev.length - 1]
    if (last && Math.abs(n.q - last.q) < 1e-4) last.notes.push(n)
    else ev.push({ q: n.q, notes: [n] })
  }
  for (let i = 0; i < ev.length; i++) {
    const e = ev[i], nx = ev[i + 1]
    e.endQ = Math.max(...e.notes.map(n => n.q + (n.dq ?? 0.25)))
    e.ioiQ = nx ? nx.q - e.q : Math.max(0.25, e.endQ - e.q)
    e.top = Math.max(...e.notes.map(n => n.pitch))
    e.size = e.notes.length
  }
  return ev
}

// ── features ────────────────────────────────────────────────────────────────
/** Quarters per beat: Δq / Δbeat between onsets of one bar. */
export function beatOf(ev) {
  const r = []
  for (let i = 1; i < ev.length; i++) { const a = ev[i - 1].notes[0], c = ev[i].notes[0]; if (a.measure === c.measure && c.beat > a.beat + 1e-6) r.push((c.q - a.q) / (c.beat - a.beat)) }
  return median(r) || 1
}
export const FEATURES = [
  'bias', 'logIoi', 'logIoi2', 'downbeat', 'onBeat', 'offBeat', 'chord',
  'height', 'contour', 'peak', 'leapIn', 'leapOut', 'slurIn', 'slurOut', 'slurStart',
  'phraseX', 'phraseArch', 'phraseEnd', 'phraseEnd2', 'phraseStart', 'restAfter',
  'longAfterShort', 'density', 'pieceEnd', 'pieceEnd2', 'pieceStart', 'ornament', 'stroke',
  'barEnd', 'longest', 'fermata', 'fermataNear', 'end1', 'end2', 'end4', 'sectionEnd', 'sectionEnd2', 'sectionStart',
  'arrival', 'beforeArrival', 'phraseEnd4', 'fast',
]

/**
 * Phrases: a new one after a rest (a gap of a quarter of a beat or more before
 * the onset), after a long note that follows shorter ones, and at the latest
 * every 8 bars. Returns an index of the phrase per onset.
 */
function phrases(ev, beatQ) {
  const out = new Int32Array(ev.length)
  let p = 0, start = ev[0]?.q ?? 0
  for (let i = 1; i < ev.length; i++) {
    const a = ev[i - 1], b = ev[i]
    const gap = b.q - a.endQ
    const longEnd = a.ioiQ >= 2 * beatQ && i >= 2 && ev[i - 2].ioiQ < a.ioiQ / 1.9
    if (gap >= 0.25 * beatQ || longEnd || b.q - start > 8 * 4 * beatQ) { p++; start = b.q }
    out[i] = p
  }
  return out
}

/** The feature vector of every onset: [{ f: Float64Array(FEATURES.length) }]. */
export function features(ev, { sections = [] } = {}) {
  if (!ev.length) return []
  const beatQ = beatOf(ev)
  const medIoi = median(ev.map(e => e.ioiQ)) || 0.25
  const tops = ev.map(e => e.top), medTop = median(tops)
  const ph = phrases(ev, beatQ)
  const span = new Map()
  ph.forEach((p, i) => { const s = span.get(p); if (!s) span.set(p, [i, i]); else s[1] = i })
  const endQ = ev[ev.length - 1].q + ev[ev.length - 1].ioiQ, startQ = ev[0].q
  const maxIoi = Math.max(...ev.map(e => e.ioiQ))
  return ev.map((e, i) => {
    const f = new Float64Array(FEATURES.length), set = (k, v) => { f[FEATURES.indexOf(k)] = v }
    const n0 = e.notes.reduce((a, n) => (n.pitch > a.pitch ? n : a))
    const beat = n0.beat ?? 0, bpb = n0.beatsPerBar ?? 4
    const compound = bpb >= 6 && bpb % 3 === 0
    const li = Math.log2(e.ioiQ / medIoi)
    set('bias', 1); set('logIoi', li); set('logIoi2', li * li)
    const onB = Math.abs(beat - Math.round(beat)) < 1e-3 && (!compound || Math.round(beat) % 3 === 0)
    set('downbeat', Math.abs(beat) < 1e-3 ? 1 : 0); set('onBeat', onB ? 1 : 0); set('offBeat', onB ? 0 : 1)
    set('chord', e.size > 1 ? Math.log2(e.size) : 0)
    set('height', (e.top - medTop) / 12)
    const win = tops.slice(Math.max(0, i - 4), i + 5), mean = win.reduce((a, v) => a + v, 0) / win.length
    set('contour', (e.top - mean) / 12)
    set('peak', (i > 0 && i < ev.length - 1 && e.top > tops[i - 1] && e.top >= tops[i + 1]) ? 1 : 0)
    set('leapIn', i ? Math.min(12, Math.abs(e.top - tops[i - 1])) / 12 : 0)
    set('leapOut', i < ev.length - 1 ? Math.min(12, Math.abs(tops[i + 1] - e.top)) / 12 : 0)
    const slurIn = !!n0.art?.slurPrev, nx = ev[i + 1], slurOut = !!nx?.notes.some(n => n.art?.slurPrev)
    set('slurIn', slurIn ? 1 : 0); set('slurOut', slurOut ? 1 : 0); set('slurStart', !slurIn && slurOut ? 1 : 0)
    const [a, b] = span.get(ph[i]), L = Math.max(1, ev[b].q + ev[b].ioiQ - ev[a].q), x = (e.q - ev[a].q) / L
    set('phraseX', x); set('phraseArch', Math.sin(Math.PI * clamp(x, 0, 1)))
    const toEnd = (ev[b].q + ev[b].ioiQ - (e.q + e.ioiQ)) / beatQ
    set('phraseEnd', Math.exp(-toEnd / 1)); set('phraseEnd2', i === b ? 1 : 0); set('phraseStart', i === a ? 1 : 0)
    set('restAfter', nx ? clamp((nx.q - e.endQ) / beatQ, 0, 2) : 1)
    set('longAfterShort', i && e.ioiQ >= 1.9 * ev[i - 1].ioiQ ? 1 : 0)
    let cnt = 0; for (let j = i; j >= 0 && ev[j].q > e.q - 2 * beatQ; j--) cnt++; for (let j = i + 1; j < ev.length && ev[j].q < e.q + 2 * beatQ; j++) cnt++
    set('density', Math.log2(cnt / 4 + 0.25))
    const fromEnd = (endQ - e.q) / beatQ
    set('pieceEnd', Math.exp(-fromEnd / 2)); set('pieceEnd2', i >= ev.length - 2 ? 1 : 0); set('pieceStart', Math.exp(-(e.q - startQ) / beatQ))
    set('ornament', e.notes.some(n => n.art?.orn) ? 1 : 0)
    set('stroke', e.notes.some(n => /stacc|spicc/.test(n.art?.stroke || '')) ? 1 : e.notes.some(n => /accent|marcato/.test(n.art?.stroke || '')) ? -1 : 0)
    set('barEnd', nx && Math.abs(nx.notes[0].beat ?? 1) < 1e-3 ? 1 : 0)
    set('longest', Math.log2(e.ioiQ / maxIoi) > -0.01 ? 1 : 0)
    // a fermata here, or on the next few onsets (players broaden into it)
    set('fermata', e.notes.some(n => n.art?.fermata) ? 1 : 0)
    let fn = 0; for (let j = i + 1; j < ev.length && ev[j].q - e.q <= 2 * beatQ; j++) if (ev[j].notes.some(n => n.art?.fermata)) { fn = Math.exp(-(ev[j].q - e.q) / beatQ); break }
    set('fermataNear', fn)
    // the end of the piece over one, two and four bars (the final ritardando)
    const barQ = beatQ * (compound ? bpb / 3 : bpb), toFin = endQ - (e.q + e.ioiQ)
    set('end1', toFin < barQ ? 1 - toFin / barQ : 0); set('end2', toFin < 2 * barQ ? 1 - toFin / (2 * barQ) : 0); set('end4', toFin < 4 * barQ ? 1 - toFin / (4 * barQ) : 0)
    // sections (the ends of repeats and their endings): the same, smaller
    const nextSec = sections.find(q => q > e.q + 1e-6 && q < endQ - barQ), prevSec = [...sections].reverse().find(q => q <= e.q + 1e-6)
    const toSec = nextSec != null ? nextSec - (e.q + e.ioiQ) : Infinity
    set('sectionEnd', toSec < barQ ? 1 - Math.max(0, toSec) / barQ : 0); set('sectionEnd2', toSec < 2 * barQ ? 1 - Math.max(0, toSec) / (2 * barQ) : 0)
    set('sectionStart', prevSec != null && e.q - prevSec < barQ ? 1 - (e.q - prevSec) / barQ : 0)
    // an arrival: a note at least twice as long as the run before it, on a beat (a cadence's
    // goal, in music without rests); the notes leading into it
    const isArr = j => j > 1 && j < ev.length && ev[j].ioiQ >= 1.9 * Math.max(ev[j - 1].ioiQ, ev[j - 2].ioiQ) && ev[j].ioiQ >= beatQ * 0.99
    set('arrival', isArr(i) ? 1 : 0)
    let ba = 0; for (let j = i + 1; j < ev.length && ev[j].q - e.q <= 2 * beatQ; j++) if (isArr(j)) { ba = 1 - (ev[j].q - e.q) / (2 * beatQ); break }
    set('beforeArrival', ba)
    set('phraseEnd4', Math.exp(-toEnd / 4))
    set('fast', Math.max(0, -Math.log2(e.ioiQ / beatQ) - 1))   // notes faster than half a beat
    return { f }
  })
}

// ── fitting (violinist/tools/fit_expression.js) ─────────────────────────────
/** Ridge regression: weights w minimising Σ(Xw − y)² + λ Σ w² (no penalty on the bias). */
export function ridge(X, y, lambda = 1, wts = null) {
  const d = X[0].length, A = Array.from({ length: d }, () => new Float64Array(d)), b = new Float64Array(d)
  for (let r = 0; r < X.length; r++) {
    const x = X[r], v = wts ? wts[r] : 1
    for (let i = 0; i < d; i++) { if (!x[i]) continue; b[i] += v * x[i] * y[r]; for (let j = 0; j < d; j++) A[i][j] += v * x[i] * x[j] }
  }
  for (let i = 1; i < d; i++) A[i][i] += lambda
  A[0][0] += 1e-9
  // Gaussian elimination
  const M = A.map((row, i) => [...row, b[i]])
  for (let c = 0; c < d; c++) {
    let p = c; for (let r = c + 1; r < d; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r
    ;[M[c], M[p]] = [M[p], M[c]]
    const pv = M[c][c] || 1e-12
    for (let r = 0; r < d; r++) if (r !== c) { const k = M[r][c] / pv; if (k) for (let j = c; j <= d; j++) M[r][j] -= k * M[c][j] }
  }
  return Array.from({ length: d }, (_, i) => M[i][d] / (M[i][i] || 1e-12))
}
/** A model's prediction for one feature vector (ridge weights w). */
export const predictOne = (m, f) => dot(m.w, f)
export const dot = (w, f) => { let s = 0; for (let i = 0; i < f.length; i++) s += w[i] * f[i]; return s }

// ── prediction ──────────────────────────────────────────────────────────────
let modelP = null
/** violinist/expression-model.json, fetched once. */
export function loadExpressionModel(url = 'violinist/expression-model.json') {
  return (modelP ??= fetch(url).then(r => r.json()).catch(e => { modelP = null; throw e }))
}

/**
 * Play the notes as the model would: in place (on, off, velocity), returning
 * an expression lane. opts: { amount (1 = as fitted; scales the timing and the
 * dynamics deviations), level (the piece's mean dynamic, default from the
 * written dynamics) }.
 */
export function predictExpression(notes, model, { amount = 1, sections = [], keepTiming = false, levelGain = model.level.gain ?? 1, tempoGain = model.tempo.gain ?? 1 } = {}) {
  const ev = onsets(notes)
  if (ev.length < 2) return null
  const F = features(ev, { sections })
  // timing: each onset's played length from its written one (the page's own seconds)
  const t0 = Math.min(...notes.map(n => n.on))
  const written = ev.map((e, i) => (ev[i + 1] ? ev[i + 1].notes[0].on : Math.max(...e.notes.map(n => n.off))) - e.notes[0].on)
  let dev = F.map(x => clamp(predictOne(model.tempo, x.f), -0.8, 0.8))
  // smoothing as fitted (players' tempo moves over a few notes, not note by note)
  dev = smooth(dev, model.tempo.smooth ?? 0)
  // (a rest after the onset keeps its length: an orchestra's tutti between two solo
  // passages is not the violinist's to stretch)
  const sounding = ev.map(e => Math.max(...e.notes.map(n => n.off)) - e.notes[0].on)
  const played = written.map((w, i) => { const own = Math.min(Math.max(0.02, w), Math.max(0.02, sounding[i])); return own * Math.exp(amount * tempoGain * dev[i]) + Math.max(0, w - own) })
  // keep the piece's length: the deviations shape the time, the page's tempo stays
  const sw = written.reduce((a, v) => a + Math.max(0.02, v), 0), sp = played.reduce((a, v) => a + v, 0), k = sw / sp
  const newOn = []; let t = t0
  for (let i = 0; i < ev.length; i++) { newOn.push(t); t += played[i] * k }
  // move every note with its onset (its length scaled with that onset's), grace notes with their main note
  const shift = new Map()
  ev.forEach((e, i) => { const s = played[i] * k / Math.max(0.02, written[i]); for (const n of e.notes) shift.set(n, [newOn[i], s]) })
  const graceOf = new Map()
  for (const g of notes.filter(n => n.art?.grace)) {
    const main = ev.reduce((b, e) => Math.abs(e.notes[0].on - g.on) < Math.abs(b.notes[0].on - g.on) ? e : b, ev[0])
    graceOf.set(g, main)
  }
  const oldOn = new Map(ev.map(e => [e, e.notes[0].on]))
  // (the written velocities are kept for the dynamics below, which set new ones)
  for (const n of notes) n.written ??= n.velocity ?? 0.7
  if (!keepTiming) {
    for (const [n, [on, s]] of shift) { const len = (n.off - n.on) * s; n.on = on; n.off = on + Math.max(0.03, len) }
    for (const [g, e] of graceOf) { const d = g.on - oldOn.get(e), len = g.off - g.on; g.on = e.notes[0].on + d; g.off = g.on + len }
  }
  // dynamics: the lane at each onset, held through it, with the learned swell inside long notes
  // the written dynamics as performance.js reads a velocity (the recordings, mostly of
  // Bach's unmarked solo works, cannot teach them), the model's shaping on top
  const base = model.level.mean
  // (half the dynamic a velocity gives: renderPerformance hears the lane twice, as the velocity
  // set from it below and as the lane itself, as it does a recorded lane)
  const writtenDyn = e => 0.6 * (median(e.notes.map(n => n.written ?? n.velocity ?? 0.7)) - 0.7)
  // the model's deviation, centred on this piece (it was fitted on deviations from each
  // recording's mean); its height term is how much the Source model needs a high note
  // pushed to sound level (the lanes were corrected by listening), so it is not scaled
  const hk = FEATURES.indexOf('height'), wh = model.level.w[hk] ?? 0
  const shaped = F.map(x => predictOne(model.level, x.f) - wh * x.f[hk])
  const mid = shaped.reduce((a, v) => a + v, 0) / shaped.length
  // (at most ±0.3 from the written dynamic: a recording's last chord measures as it
  // dies away, which would otherwise ask for a final chord barely touched)
  const lv = F.map((x, i) => base + writtenDyn(ev[i]) + clamp(wh * x.f[hk] + amount * levelGain * (shaped[i] - mid), -0.3, 0.3))
  const end = Math.max(...notes.map(n => n.off)) + 2
  const N = Math.ceil((end - t0 + 1) * RATE) + 1, dyn = new Float32Array(N).fill(base)
  const at = s => Math.round((s - t0) * RATE)
  ev.forEach((e, i) => {
    const a = at(e.notes[0].on), b = i + 1 < ev.length ? at(ev[i + 1].notes[0].on) : at(Math.max(...e.notes.map(n => n.off)))
    const len = (b - a) / RATE, shape = model.swell && len >= model.swell.minLen ? model.swell.shape : null
    for (let j = Math.max(0, a); j < Math.min(N, Math.max(a + 1, b)); j++) {
      const x = (j - a) / Math.max(1, b - a)
      dyn[j] = lv[i] + (shape ? amount * interp(shape, x) * Math.min(1, len / 1.5) : 0)
    }
    if (i + 1 >= ev.length) for (let j = Math.max(0, b); j < N; j++) dyn[j] = lv[i]
  })
  // eased like a recorded lane (60 ms)
  const a = 1 - Math.exp(-1 / (0.06 * RATE))
  let y = dyn[0]
  for (let j = 0; j < N; j++) { y += (dyn[j] - y) * a; dyn[j] = clamp(y, 0.08, 1) }
  // velocities for engines that read them (as violinist/performer.js does with a recording)
  for (const n of notes) { const j = clamp(Math.round((n.on - t0 + 0.06) * RATE), 0, N - 1); n.velocity = clamp(0.7 + (dyn[j] - 0.55) / 1.2, 0.05, 1) }
  notes.sort((p, q) => p.on - q.on || p.pitch - q.pitch)
  // score position (quarters) → the new time, for everything else that plays along;
  // before the violin's first onset and after its last, what plays keeps its own
  // time (orig, the time it had), moved with the violin's first or last onset
  const Q = ev.map(e => e.q), T = ev.map(e => e.notes[0].on), T0 = ev.map(e => oldOn.get(e))
  const tmap = (q, orig = null) => {
    const hi0 = Q.length - 1
    if (q < Q[0]) return orig != null ? orig + (T[0] - T0[0]) : T[0] - (Q[0] - q) * (T0[1] - T0[0]) / Math.max(1e-6, Q[1] - Q[0])
    if (q > Q[hi0]) return orig != null ? orig + (T[hi0] - T0[hi0]) : T[hi0] + (q - Q[hi0]) * (T0[hi0] - T0[hi0 - 1]) / Math.max(1e-6, Q[hi0] - Q[hi0 - 1])
    let lo = 0, hi = hi0
    if (q >= Q[hi]) return T[hi]
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (Q[m] <= q) lo = m; else hi = m }
    return T[lo] + (q - Q[lo]) * (T[hi] - T[lo]) / (Q[hi] - Q[lo])
  }
  return { recorded: false, timing: true, phrased: true, predicted: true, rate: RATE, t0, dyn, tmap }
}
const interp = (s, x) => { const u = clamp(x, 0, 1) * (s.length - 1), k = Math.min(s.length - 2, Math.floor(u)); return s[k] + (s[k + 1] - s[k]) * (u - k) }
export function smooth(v, w) {
  if (!w) return v
  const out = new Array(v.length)
  for (let i = 0; i < v.length; i++) { let s = 0, c = 0; for (let j = Math.max(0, i - w); j <= Math.min(v.length - 1, i + w); j++) { const k = 1 - Math.abs(j - i) / (w + 1); s += k * v[j]; c += k } out[i] = s / c }
  return out
}
