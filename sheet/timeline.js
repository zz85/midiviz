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
  let last = 0
  function at(t) {
    if (!bars.length) return null
    // (the last bar found, then a step either way: playback moves on a little at a time)
    let i = Math.min(last, bars.length - 1)
    while (i > 0 && t < bars[i].t0) i--
    while (i < bars.length - 1 && t >= bars[i].t1) i++
    last = i
    const b = bars[i], f = Math.max(0, Math.min(1, (t - b.t0) / (b.t1 - b.t0 || 1)))
    // ticks by time within the bar (one tempo a bar, as the files here have)
    return { i, bar: b.bar, tick: f * b.ticks, frac: f, t0: b.t0, t1: b.t1, ticks: b.ticks }
  }
  return { at, bars, barTicks, meter, mismatch }
}

/** createTimeline for a tonejs Midi. */
export function timelineOfMidi(midi, opts) {
  let endTick = 0
  for (const t of midi.tracks) for (const n of t.notes) endTick = Math.max(endTick, n.ticks + n.durationTicks)
  return createTimeline({ ppq: midi.header.ppq, ticksToSeconds: k => midi.header.ticksToSeconds(k), endTick }, opts)
}
