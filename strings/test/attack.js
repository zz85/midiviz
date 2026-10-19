// Attack quality of the bowed waveguide (Guettler's criterion), for #034.
//
//   node strings/test/attack.js [--verbose]    (also used by sound.test.js)
//
// A bowed attack is good when Helmholtz motion (one slip per period, at the
// period) starts within a few periods of the bow starting; listeners accept
// up to ~50 ms of pre-Helmholtz transient when it is raucous (too much force
// for the bow's acceleration: periods too long, creaky) and ~90 ms when it is
// loose (too little: several slips per period, swishy) — Guettler &
// Askenfelt, JASA 1997; Guettler, Acta Acustica 2002. This hooks the string's
// friction junction, lists every slip, and for each bow start (a note from
// rest or a bow change) measures the time to the first run of 6 regular
// periods, and whether the slips before it came too seldom (raucous) or too
// often (loose).
import { fileURLToPath } from 'node:url'
import { fingerLine } from '../fingering.js'
import { renderPerformance } from '../sound/performance.js'
import { ViolinSynth, CurveSource, WaveguideString, midiHz, CH, NCH } from '../sound/bowed.js'

const SR = 48000
export const OK_MS = 50          // acceptable pre-Helmholtz time (raucous; loose gets 90 ms)

/** Render a performance through the waveguide; return per string the slip times (s) and the string's sample rate. */
export function slips(perf, { instrument = 'violin', params = {} } = {}) {
  const syn = new ViolinSynth(SR, { instrument, model: 'waveguide', ...params })
  const out = syn.strings.map(() => [])
  const orig = WaveguideString.prototype.tick
  let t = 0
  const idx = new Map(syn.strings.map((s, i) => [s, i]))
  const n = syn.strings.map(() => 0), was = syn.strings.map(() => false), stick = syn.strings.map(() => 0)
  WaveguideString.prototype.tick = function (vb, F, tap) {
    const y = orig.call(this, vb, F, tap)
    const s = idx.get(this)
    if (s != null) {
      // a slip counts after a stick of at least 0.25 period (micro-slips inside one slip phase do not)
      if (!this.slipping) stick[s]++
      else if (!was[s]) { if (stick[s] > 0.25 * this.N && F > 1e-3) out[s].push({ t: n[s] / this.sr, P: this.N / this.sr }); stick[s] = 0 }
      was[s] = this.slipping; n[s]++
    }
    return y
  }
  try {
    const src = new CurveSource(perf), N = Math.ceil((perf.frames / perf.frameRate) * SR), L = new Float32Array(128), R = new Float32Array(128)
    for (let i = 0; i < N; i += 128) t = syn.process(src, t, 1 / SR, L, R, 128)
  } finally { WaveguideString.prototype.tick = orig }
  return out
}

/**
 * Bow starts in a performance: per note that starts a stroke (or follows a
 * bow change), { t (bow start), s, note }. The bow start is where the bow
 * velocity on that string leaves zero (rest) or crosses it (bow change).
 */
export function bowStarts(perf) {
  const W = 4 * NCH, fr = perf.frameRate, out = []
  for (const st of perf.strokes) {
    const n = st.events[0].notes[0], s = n.string
    // search back from the onset to where |v| was last below 2 % of its value 60 ms in
    const i1 = Math.min(perf.frames - 1, Math.round((n.on + 0.06) * fr))
    const vRef = Math.abs(perf.data[i1 * W + s * NCH + CH.vel])
    let i = Math.round(n.on * fr)
    while (i > 0 && Math.abs(perf.data[i * W + s * NCH + CH.vel]) > 0.02 * vRef && Math.sign(perf.data[i * W + s * NCH + CH.vel]) === st.dir) i--
    out.push({ t: i / fr, s, note: n, end: Math.min(st.t1, n.off) })
  }
  return out
}

/** Classify one attack from the slips on its string. */
export function attack(sl, a) {
  const list = sl.filter(x => x.t >= a.t - 0.002 && x.t <= Math.min(a.end, a.t + 0.4))
  if (list.length < 2) return { ms: Infinity, kind: 'silent' }
  let run = 0, start = -1
  for (let j = 1; j < list.length; j++) {
    const d = list[j].t - list[j - 1].t, P = list[j].P
    if (Math.abs(d - P) < 0.12 * P) { if (!run) start = j - 1; if (++run >= 6) break } else run = 0
  }
  if (run < 6) return { ms: Infinity, kind: 'never' }
  const t0 = list[start].t, P = list[start].P
  const ms = (t0 - a.t) * 1000
  // before Helmholtz: time spent in intervals longer than a period (prolonged,
  // raucous) against time in intervals shorter (multiple slipping, loose); the
  // first slip's delay after the bow starts counts as prolonged
  let longT = list[0].t - a.t > 1.5 * P ? list[0].t - a.t : 0, shortT = 0
  for (let j = 1; j <= start; j++) { const d = list[j].t - list[j - 1].t; if (d > 1.12 * P) longT += d; else if (d < 0.88 * P) shortT += d }
  const kind = ms < 2.5 * P * 1000 ? 'perfect' : longT > 2 * shortT ? 'raucous' : shortT > 2 * longT ? 'loose' : 'mixed'
  // also: does it stay in Helmholtz? fraction of regular intervals over the rest of the note
  const rest = list.filter(x => x.t > t0)
  let reg = 0; for (let j = 1; j < rest.length; j++) { const d = rest[j].t - rest[j - 1].t; if (Math.abs(d - P) < 0.12 * P) reg++ }
  return { ms, kind, stays: rest.length > 1 ? reg / (rest.length - 1) : 1 }
}
// a good attack reaches Helmholtz motion in time and stays in it (≥ 90 % regular periods afterwards)
export const good = r => r.ms <= (r.kind === 'loose' ? 90 : OK_MS) && r.stays >= 0.9

/** The test set: from rest and with bow changes, three instruments, all strings, p / mf / f. */
export function suite() {
  const cases = []
  for (const [instrument, open] of [['violin', [55, 62, 69, 76]], ['viola', [48, 55, 62, 69]], ['cello', [36, 43, 50, 57]]]) for (const vel of [0.35, 0.7, 1]) {
    const notes = []
    let t = 0.1
    for (let s = 0; s < 4; s++) for (const d of [0, 3, 7]) {
      // from rest (0.5 s note, 0.4 s rest), then three connected détaché quarter notes (bow changes)
      notes.push({ pitch: open[s] + d, on: t, off: t + 0.5, velocity: vel }); t += 0.9
      for (let k = 0; k < 3; k++) { notes.push({ pitch: open[s] + d + [2, 4, 2][k], on: t, off: t + 0.3, velocity: vel }); t += 0.3 }
      t += 0.5
    }
    cases.push({ instrument, vel, notes })
  }
  return cases
}

/** Run the suite: { total, good, byKind, ms (median), rows }. */
export function evaluate({ params = {}, style = {}, quick = false } = {}) {
  const rows = []
  for (const c of suite()) {
    if (quick && c.vel === 0.7) continue
    const notes = c.notes.map(n => ({ ...n }))
    fingerLine(notes, { instrument: c.instrument })
    const perf = renderPerformance(notes, { instrument: c.instrument, style: { vibrato: 0, timing: 0, intonation: 0, variance: 0, ...style } })
    const sl = slips(perf, { instrument: c.instrument, params })
    for (const a of bowStarts(perf)) {
      const r = attack(sl[a.s], a)
      rows.push({ instrument: c.instrument, vel: c.vel, pitch: a.note.pitch, s: a.s, change: a.t > a.note.on - 0.2 && notes.some(m => Math.abs(m.off - a.note.on) < 0.02), ...r })
    }
  }
  const byKind = {}
  for (const r of rows) byKind[r.kind] = (byKind[r.kind] || 0) + 1
  const fin = rows.map(r => r.ms).filter(isFinite).sort((a, b) => a - b)
  return { total: rows.length, good: rows.filter(good).length, inTime: rows.filter(r => r.ms <= (r.kind === 'loose' ? 90 : OK_MS)).length, stays: rows.filter(r => r.stays >= 0.9).length, byKind, ms: fin[fin.length >> 1], p90: fin[Math.floor(fin.length * 0.9)], rows }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const r = evaluate()
  console.log(`good attacks ${r.good}/${r.total} (in time ${r.inTime}, stays in Helmholtz ${r.stays}); median ${r.ms?.toFixed(1)} ms, p90 ${r.p90?.toFixed(1)} ms; ${JSON.stringify(r.byKind)}`)
  for (const inst of ['violin', 'viola', 'cello']) for (const ch of [false, true]) {
    const sub = r.rows.filter(x => x.instrument === inst && x.change === ch)
    console.log(`  ${inst.padEnd(6)} ${ch ? 'bow change' : 'from rest '}: ${sub.filter(good).length}/${sub.length}`)
  }
  if (process.argv.includes('--verbose')) for (const x of r.rows.filter(x => !good(x))) console.log(`  ${x.instrument} ${x.vel} ${x.pitch} s${x.s} ${x.change ? 'change' : 'rest'}: ${x.kind} ${isFinite(x.ms) ? x.ms.toFixed(0) + ' ms' : ''}`)
}
