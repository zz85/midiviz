// Fingering → left-hand and bow motion (Experiment #033).
//
// Pure functions of the fingered note list, so pause, seek and speed are free.
// After research/02_algorithms.md §12.6–12.7:
//
//  left hand  the frame base glides between positions: a shift starts as late
//             as it can (≈0.3 s, less when the notes are faster, measured
//             shifts take 0.29–0.46 s whatever the tempo) and arrives just
//             before the note, on a minimum-jerk path. A finger is down on
//             its stop from just before the onset to the end of the note;
//             lower fingers stay down on the same string while the hand keeps
//             its position (the "fingers down" habit); free fingers hover over
//             their slots of the current frame. A repeated note keeps its
//             finger down (the bow re-articulates it). Long stopped notes get
//             vibrato (≈5.5 Hz, starting a little after the onset).
//  bow        one stroke per note, or one per slurred group (fast legato notes
//             share a bow, up to 4); strokes alternate down / up, starting down
//             and restarting down after a long rest. Bow speed = stroke length
//             / duration, with the length scaled by dynamics and clamped to the
//             hair; the bow lifts and retakes in long rests. The bowed string
//             (a float: 1.5 = a double stop on strings 1 and 2) ramps to the
//             next string just before its onset; 3–4 note chords roll from the
//             low pair to the high pair.
//
// Units: centimetres along the string from the nut (u), string index (s).

import { stopMM, INSTRUMENTS } from './fingering.js'

const smooth5 = x => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * x * (x * (6 * x - 15) + 10))
// natural offset of each finger above finger 1 (semitones): violin / viola
// span a fourth, the cello's closed hand a minor third (one finger per semitone)
// (index 5 = the thumb); the bass's closed hand spans a whole tone with 3 next
// to 4, and in thumb position the thumb lies on the string below finger 1
const SLOT = [0, 0, 2, 4, 5, -2], SLOT_CELLO = [0, 0, 1, 2, 3, -2], SLOT_BASS = [0, 0, 1, 2, 2, -2], SLOT_THUMB = [0, 1, 3, 4, 6, 0]
export const BOW_HAIR = 65            // usable hair length (cm)

/**
 * notes: fingered notes ({ pitch, on, off, string, finger, base, offset }).
 * Returns { poseAt(t), strokes, instrument }.
 */
export function buildMotion(notes, { instrument = 'violin', lead = 0.04, vibrato = true, bowStart = 1, keepBow = false } = {}) {
  const inst = typeof instrument === 'object' ? instrument : INSTRUMENTS[instrument]
  const Lcm = inst.L / 10
  const slotOf = thumb => thumb ? SLOT_THUMB : inst.L > 900 ? SLOT_BASS : inst.L > 500 ? SLOT_CELLO : SLOT
  const uOf = semis => stopMM(semis, inst.L) / 10
  const ns = notes.filter(n => n.string != null).sort((a, b) => a.on - b.on || a.pitch - b.pitch)

  // events (onset groups)
  const events = []
  for (const n of ns) {
    const e = events[events.length - 1]
    if (e && n.on - e.on < 0.03) e.notes.push(n)
    else events.push({ on: n.on, off: n.off, notes: [n] })
  }
  for (const e of events) e.off = Math.max(...e.notes.map(n => n.off))

  // ── hand anchor keyframes: [t, base] with shift windows ──
  const anchorKeys = []          // { t0, t1, from, to }
  let cur = events.length ? (events[0].notes.find(n => n.finger)?.base ?? 2) : 2
  let curTh = events.length ? !!events[0].notes.find(n => n.finger)?.thumb : false
  const startBase = cur, startTh = curTh
  for (let i = 0; i < events.length; i++) {
    const e = events[i]
    const stopped = e.notes.find(n => n.finger)
    const b = stopped ? stopped.base : null
    const th = stopped ? !!stopped.thumb : curTh
    if (b == null || (b === cur && th === curTh)) continue
    // shift: during an open string or rest it can start early; otherwise late
    const prev = events[i - 1]
    const avail = prev ? e.on - prev.on : 0.3
    const prevOpen = prev && prev.notes.every(n => !n.finger)
    const dur = Math.max(0.06, Math.min(0.32, (prevOpen ? 0.9 : 0.55) * avail))
    anchorKeys.push({ t0: e.on - lead - dur, t1: e.on - lead * 0.5, from: cur, to: b, th })
    cur = b; curTh = th
  }
  // thumb position (bass, cello): switches halfway through the shift into it
  const thumbAt = t => {
    let th = startTh
    for (const k of anchorKeys) { if (t < (k.t0 + k.t1) / 2) break; th = k.th }
    return th
  }
  const baseAt = t => {
    let b = startBase
    for (const k of anchorKeys) {
      if (t < k.t0) break
      b = t >= k.t1 ? k.to : k.from + (k.to - k.from) * smooth5((t - k.t0) / (k.t1 - k.t0))
    }
    return b
  }

  // ── fingers: press intervals ──
  // per finger: [{ t0, t1, s, semis, note }] (semis above the open string)
  const press = [null, [], [], [], [], []]
  // A repeated note on the same finger needs no lift: the bow re-articulates
  // it while the finger stays on the string (unlike a piano key). The finger
  // only leaves the stop when the next note is a different note or an open
  // string.
  let prevEv = null
  for (const e of events) {
    for (const n of e.notes) {
      if (!n.finger) continue
      const semis = n.pitch - inst.open[n.string]
      const last = press[n.finger][press[n.finger].length - 1]
      const repeat = last && prevEv && prevEv.notes.includes(last.note) && last.s === n.string && last.semis === semis && n.on - last.t1 < 1.0
      if (repeat) { last.t1 = n.off; last.note = n; continue }
      press[n.finger].push({ t0: n.on - lead, t1: n.off, s: n.string, semis, base: n.base, note: n })
    }
    prevEv = e
  }
  // fingers down: a lower finger that just played on this string in this position stays on its stop
  for (const n of ns) {
    if (!n.finger || n.finger === 5) continue
    for (let g = 1; g < n.finger; g++) {
      const list = press[g]
      let last = null
      for (const p of list) if (p.t0 < n.on - 0.01 && !p.held) last = p
      if (last && last.s === n.string && last.base === n.base && n.on - last.t1 < 0.8 && last.semis < n.pitch - inst.open[n.string]) {
        list.push({ t0: last.t1, t1: n.off, s: last.s, semis: last.semis, base: n.base, held: true })
      }
    }
  }
  for (const f of [1, 2, 3, 4, 5]) press[f].sort((a, b) => a.t0 - b.t0)

  // the string each finger hovers over: the string of its next note (or last)
  const fingerAt = (f, t, b, th) => {
    const list = press[f]
    let on = null, prev = null, next = null
    for (const p of list) {
      if (p.t0 <= t && t <= p.t1 && (!on || !p.held)) on = p
      if (p.t1 < t) prev = p
      if (p.t0 > t && !next) next = p
    }
    if (on) {
      const r = on.held ? 0.85 : 1
      return { s: on.s, u: uOf(on.semis), press: r, held: !!on.held, note: on.note || null }
    }
    // hovering: drift from the last string to the next one, over the frame slot
    let s = next ? next.s : prev ? prev.s : 2
    if (prev && next) {
      const k = Math.min(1, Math.max(0, (t - prev.t1) / Math.max(0.05, next.t0 - prev.t1)))
      s = prev.s + (next.s - prev.s) * smooth5(k)
    }
    let lift = 1
    // approach in the last 80 ms, release over 40 ms
    if (next && next.t0 - t < 0.08) lift = (next.t0 - t) / 0.08
    if (prev && t - prev.t1 < 0.04) lift = Math.min(lift, (t - prev.t1) / 0.04)
    const target = next && next.t0 - t < 0.08 ? uOf(next.semis) : uOf(b + slotOf(th)[f])
    return { s, u: target, press: 0, lift: Math.max(0, lift), held: false, note: null }
  }

  // ── vibrato on long stopped notes ──
  const vibAt = t => {
    if (!vibrato) return 0
    for (const n of ns) {
      if (n.on > t) break
      if (!n.finger || t > n.off || n.off - n.on < 0.35) continue
      const age = t - n.on - 0.15
      if (age <= 0) continue
      const env = Math.min(1, age / 0.25) * Math.min(1, (n.off - t) / 0.1)
      return 0.22 * env * Math.sin(2 * Math.PI * 5.6 * age)
    }
    return 0
  }

  // ── bow strokes ──
  const strokes = []
  // bowStart: the first stroke (1 down, -1 up); keepBow: no retake to a down-bow after rests
  let dir = bowStart, pos = 8, lastOff = -Infinity
  for (let i = 0; i < events.length; i++) {
    const e = events[i]
    // slur: fast notes that join the previous one, up to 4 per bow, single notes only
    const prevStroke = strokes[strokes.length - 1]
    // a plan from strings/articulation.js (a score's slurs, a timed MIDI's overlaps, or inference) decides when present
    const planned = e.notes.every(n => n.art?.source)
    const slur = planned ? !!prevStroke && e.notes.every(n => n.art.slurPrev) : prevStroke && e.notes.length === 1 && prevStroke.events.length < 4 &&
      e.on - lastOff < 0.03 && (e.off - e.on) < 0.2 && prevStroke.events[prevStroke.events.length - 1].notes.length === 1 &&
      (prevStroke.t1 - prevStroke.t0) < 0.5 && prevStroke.events.every(x => x.off - x.on < 0.2)
    if (slur) {
      prevStroke.events.push(e)
      prevStroke.t1 = Math.max(prevStroke.t1, e.off)   // a held note in the stroke keeps the bow going
    } else {
      if (prevStroke && e.on - lastOff > 0.6 && !keepBow) dir = bowStart  // retake: new phrase on the starting bow
      else if (prevStroke) dir = -prevStroke.dir
      // a bow sign in the score (⊓ down, V up) sets the stroke's direction
      const sign = e.notes.find(n => n.art?.bow)?.art.bow
      if (sign) dir = sign === 'down' ? 1 : -1
      strokes.push({ dir, t0: e.on, t1: e.off, events: [e] })
    }
    lastOff = e.off
  }
  // stroke lengths and positions along the hair (0 = frog … 65 = tip)
  for (let k = 0; k < strokes.length; k++) {
    const st = strokes[k]
    const D = Math.max(0.05, st.t1 - st.t0)
    const vel = st.events[0].notes[0].velocity ?? 0.7
    let len = Math.min(58, Math.max(5, D * (18 + 40 * vel)))
    const prev = strokes[k - 1]
    let start = prev ? prev.end : st.dir > 0 ? 8 : 55
    // a long rest lets the bow lift and go back where the stroke wants to start
    if (!prev || st.t0 - prev.t1 > 0.35) start = st.dir > 0 ? Math.max(4, 30 - len * 0.6) : Math.min(61, 35 + len * 0.6)
    // not enough hair left: use what is there (at least a little)
    const room = st.dir > 0 ? 62 - start : start - 3
    if (room < len) len = Math.max(Math.min(len, 4), room)
    st.start = start
    st.end = start + st.dir * len
    st.end = Math.max(3, Math.min(62, st.end))
    st.lift = prev ? st.t0 - prev.t1 > 0.35 : true
  }

  // bowed string over time: per event a string value; ramp before onsets
  const strKeys = events.map(e => {
    const ss = e.notes.map(n => n.string)
    const lo = Math.min(...ss), hi = Math.max(...ss)
    return { t: e.on, lo, hi, roll: hi - lo >= 2 }
  })
  const bowString = t => {
    if (!strKeys.length) return 2
    let i = 0
    while (i + 1 < strKeys.length && strKeys[i + 1].t <= t) i++
    const k = strKeys[i]
    if (t < k.t && i === 0) return (k.lo + k.hi) / 2
    let s
    if (k.roll) {
      // 3–4 string chord: low pair, then the high pair 60 ms later
      const lowPair = k.lo + 0.5, highPair = k.hi - 0.5
      s = lowPair + (highPair - lowPair) * smooth5((t - k.t) / 0.07)
    } else s = (k.lo + k.hi) / 2
    const n = strKeys[i + 1]
    if (n) {
      const ns2 = n.roll ? n.lo + 0.5 : (n.lo + n.hi) / 2
      const ramp = Math.min(0.06, 0.5 * (n.t - k.t))
      if (t > n.t - ramp) s = s + (ns2 - s) * smooth5((t - (n.t - ramp)) / ramp)
    }
    return s
  }

  const bowAt = t => {
    // find the stroke (or the gap) at t
    let st = null, i = 0
    for (; i < strokes.length; i++) { if (strokes[i].t0 > t) break; st = strokes[i] }
    const next = strokes[i]
    if (!st) {
      // before the first stroke: resting above the string near the start point
      return { pos: next ? next.start : 8, dir: next ? next.dir : 1, lift: 1, speed: 0, s: bowString(t), playing: false }
    }
    if (t <= st.t1) {
      const k = (t - st.t0) / Math.max(1e-3, st.t1 - st.t0)
      // slight ease at the ends of a stroke (bow changes)
      const kk = k + 0.08 * Math.sin(2 * Math.PI * k) / (2 * Math.PI) * -1
      const pos = st.start + (st.end - st.start) * Math.min(1, Math.max(0, kk))
      return { pos, dir: st.dir, lift: 0, speed: (st.end - st.start) / Math.max(1e-3, st.t1 - st.t0), s: bowString(t), playing: true }
    }
    // between strokes: stay on the string for a short gap, lift for a long one and travel to the next start
    const gap = next ? next.t0 - st.t1 : Infinity
    if (!next || next.lift) {
      const k = next ? Math.min(1, (t - st.t1) / Math.max(0.05, gap)) : Math.min(1, (t - st.t1) / 0.4)
      const target = next ? next.start : st.end
      const lift = next ? Math.sin(Math.PI * smooth5(k)) : Math.min(1, (t - st.t1) / 0.25)
      return { pos: st.end + (target - st.end) * smooth5(k), dir: next ? next.dir : st.dir, lift: Math.min(1, lift * 1.3), speed: 0, s: bowString(t), playing: false }
    }
    return { pos: st.end, dir: st.dir, lift: 0, speed: 0, s: bowString(t), playing: false }
  }

  function poseAt(t) {
    const b = baseAt(t)
    const vib = vibAt(t)
    const th = thumbAt(t)
    const fingers = [null]
    for (const f of [1, 2, 3, 4, 5]) {
      const F = fingerAt(f, t, b, th)
      if (F.press > 0) F.u += vib * (F.held ? 0.5 : 1)
      fingers.push(F)
    }
    const sounding = []
    for (const n of ns) {
      if (n.on > t) break
      if (t < n.off) sounding.push({ s: n.string, u: n.finger ? uOf(n.pitch - inst.open[n.string]) + vib : 0, pitch: n.pitch, note: n })
    }
    return { base: b, thumb: th, anchorU: uOf(b) + vib, vib, fingers, bow: bowAt(t), sounding, Lcm }
  }

  return { poseAt, strokes, instrument: inst, uOf, Lcm }
}
