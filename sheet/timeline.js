// Where the music is in the score: performed time → (score bar, place in the bar).
//
//   const tl = createTimeline({ ppq, ticksToSeconds, endTick }, { meter: [3, 4], form: [[1, 16], [1, 16], [17, 32], [17, 32]] })
//   tl.at(t)  → { i, bar, tick, frac, t0, t1 }   i: the performed bar (0-based), bar: the score's
//             bar it plays (1-based), tick: ticks into the bar, frac: tick / bar length
//   tl.bars   [{ i, bar, t0, t1 }]   every performed bar
//
// The performance is a MIDI file, which may play the repeats (written out) or
// not (Mutopia's LilyPond MIDI doesn't); the score prints each repeat once. `form` lists the score's bars in the order
// they are played, as runs [first, last]; without it, performed bar i is score
// bar i + 1. A pickup bar (`pickup`, in ticks) shifts every bar after it.
// The MIDI's own time signature is often missing (the Goldberg Aria's is), so
// the meter comes from the score's manifest.

export function expandForm(form) {
  const out = []
  for (const [a, b] of form) for (let n = a; n <= b; n++) out.push(n)
  return out
}

export function createTimeline({ ppq, ticksToSeconds, endTick }, { meter = [4, 4], form = null, pickup = 0, played = 0 } = {}) {
  // `played`, the number of bars the file plays, where known (the form's length, else the
  // score's bar count), sets the bar's length in ticks: files don't always count a beat as
  // ppq ticks (Mutopia's Aria counts a quarter as two)
  played ||= form ? expandForm(form).length : 0
  const barTicks = played ? Math.round((endTick - pickup) / played / (ppq / 8)) * (ppq / 8) : Math.round(ppq * 4 * meter[0] / meter[1])
  const starts = [0]
  if (pickup > 0) starts.push(pickup)
  while (starts[starts.length - 1] + barTicks < endTick - ppq / 8) starts.push(starts[starts.length - 1] + barTicks)
  const order = form ? expandForm(form) : starts.map((_, i) => i + 1)
  const n = Math.min(starts.length, order.length)
  const bars = []
  for (let i = 0; i < n; i++) {
    const a = starts[i], b = i + 1 < starts.length ? starts[i + 1] : a + barTicks
    bars.push({ i, bar: order[i], tick0: a, ticks: b - a, t0: ticksToSeconds(a), t1: ticksToSeconds(b) })
  }
  const mismatch = form && order.length !== starts.length ? { performed: starts.length, form: order.length } : null
  const at = seeker(bars)
  return { at, bars, barTicks, meter, mismatch }
}

// the bar at song time t: the last one begun by then (between movements, the last bar of the
// one before, held at its end), and the place in it
function seeker(bars) {
  let last = 0
  return function at(t) {
    if (!bars.length) return null
    // (the last bar found, then a step either way: playback moves on a little at a time)
    let i = Math.min(last, bars.length - 1)
    while (i > 0 && t < bars[i].t0) i--
    while (i < bars.length - 1 && t >= bars[i + 1].t0) i++
    last = i
    const b = bars[i], f = Math.max(0, Math.min(1, (t - b.t0) / (b.t1 - b.t0 || 1)))
    // ticks by time within the bar (one tempo a bar, as the files here have)
    return { i, bar: b.bar, tick: f * b.ticks, frac: f, t0: b.t0, t1: b.t1, ticks: b.ticks, movement: b.movement }
  }
}

/**
 * A timeline for a work of many movements, from its manifest (sheet/tools/goldberg.mjs):
 * `movements` [{ id, bars, starts (s, from the movement's start), end }] and `sequence`, the
 * movements' ids in the order the file plays them (the Goldberg's Aria twice). The file plays
 * them one after another with a silence between (1.5 s or more), which finds where each starts.
 * A bar's key is its place in the whole score, movement by movement as `movements` lists them,
 * from 1, so a movement played twice (the da capo), or a half repeated, is on the same bars
 * each time. `performance`: the file's own order of the bars (a manifest's `performances`).
 * `notes`: [{ time, duration }] in seconds.
 */
export function createMovementTimeline(notes, { movements, sequence }, { gap = 1.5, performance = null } = {}) {
  const segs = []
  let end = -Infinity
  for (const n of [...notes].sort((a, b) => a.time - b.time)) {
    if (!segs.length || n.time - end >= gap) segs.push(n.time)
    end = Math.max(end, n.time + n.duration)
  }
  const byId = new Map(), base = new Map()
  let key = 0
  for (const m of movements) { byId.set(m.id, m); base.set(m.id, key); key += m.starts.length }
  const bars = [], spans = []
  // (`performance`: a file's own order of the printed bars, movement by movement, as
  // [{ id, played: [[bar from 0, t0, t1]], end }], where it plays repeats or leaves out
  // an ending; else each movement's bars once each, as printed)
  const order = performance ?? sequence.map(id => { const m = byId.get(id); return { id, played: m.starts.map((s, j) => [j, s, j + 1 < m.starts.length ? m.starts[j + 1] : m.end]), end: m.end } })
  order.slice(0, segs.length).forEach(({ id, played, end }, k) => {
    const m = byId.get(id), t = segs[k] - played[0][1]
    for (const [j, a, b] of played) bars.push({ i: bars.length, bar: base.get(id) + j + 1, movement: id, n: j + 1, tick0: 0, ticks: 1, t0: t + a, t1: t + b })
    spans.push({ id, title: m.title, t0: t + played[0][1], t1: t + end })
  })
  const mismatch = segs.length !== order.length ? { performed: segs.length, form: order.length } : null
  return { at: seeker(bars), bars, movements: spans, meter: null, mismatch }
}

/** createMovementTimeline for a tonejs Midi. */
export function timelineOfMovements(midi, manifest, opts) {
  return createMovementTimeline(midi.tracks.flatMap(t => t.notes), manifest, opts)
}

/** createTimeline for a tonejs Midi. */
export function timelineOfMidi(midi, opts) {
  let endTick = 0
  for (const t of midi.tracks) for (const n of t.notes) endTick = Math.max(endTick, n.ticks + n.durationTicks)
  return createTimeline({ ppq: midi.header.ppq, ticksToSeconds: k => midi.header.ticksToSeconds(k), endTick }, opts)
}
