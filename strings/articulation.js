// Articulation planner for the strings experiments (#034, research/06_articulation.md).
//
// Decides, before bowing (motion.js), which notes share a bow (slurs) and how
// each stroke is played. It works on any note source:
//
//   score (MusicXML / .mxl via score.js, MuseScore, Mutopia after python-ly):
//            n.art.slur ids and n.art.stroke come from the score; the planner
//            only turns them into per-note decisions
//   timed MIDI (a performance, or an export that keeps note lengths): Layer 1,
//            SWAM's and the Joshua Bell Violin's cues: an overlap is a slur, a
//            gap a new bow, and the gap's size the stroke (détaché / staccato /
//            spiccato)
//   untimed MIDI (score exports where every note touches the next, 95 % of
//            our violin MIDIs): Layer 2, inference from the music: short notes
//            are slurred in groups that start on beats, never across a rest,
//            a repeated pitch (rebow), a long note, a chord or a wide leap
//
// planArticulation(notes, opts) mutates and returns notes, setting on each
//   n.art = { slurPrev: true when it continues the previous note's bow,
//             stroke, source: 'score' | 'timing' | 'inferred', ... }
// opts: { mode: 'auto' | 'score' | 'timing' | 'infer' | 'off', meter (from
//         score.js, or [{ t, beats, beatType }]), tempo ([{ t, bpm }]),
//         ...INFER (the Layer 2 rule parameters) }
//
// Layer 2's parameters are tuned on the Bach Violin Dataset's MusicXML scores
// (strings/test/articulation.js): slurs stripped, inferred, compared.

// Tuned on the even-numbered movements of BWV 1001–1006 (strings/test/articulation.js):
// held out (odd movements), slurred-pair F1 41 % and agreement 60 %, against
// motion.js's fixed rule's 34 % and 47 %. Bach's slurs are an editor's and
// vary by movement (27 % of note pairs slurred; train F1 61 %), so this is a
// plausible bowing, not the edition's.
export const INFER = {
  maxDur: 0.34,      // s: notes longer than this start their own bow
  maxRatio: 2.1,     // a slur does not join notes whose lengths differ by more than this
  maxLeap: 3,        // semitones: a wider leap takes a new bow (slurs follow steps)
  maxGroup: 8,       // notes per bow at most
  beatBreak: true,   // a note on the beat starts a new bow…
  beatMin: 1,        // …once the group has this many notes
}

/** onset groups (chords / double stops together), in time order */
function eventsOf(notes) {
  const ns = notes.filter(n => !n.unplayable).sort((a, b) => a.on - b.on || a.pitch - b.pitch)
  const ev = []
  for (const n of ns) {
    const e = ev[ev.length - 1]
    if (e && n.on - e.on < 0.03) e.notes.push(n)
    else ev.push({ on: n.on, notes: [n] })
  }
  for (const e of ev) { e.off = Math.max(...e.notes.map(n => n.off)); e.top = e.notes[e.notes.length - 1] }
  return ev
}

/** Beat index of time t from a meter list ([{ t, beats, beatType }]) and tempo list ([{ t, bpm }], quarters per minute). */
function beatClock(meter, tempo) {
  if (!meter?.length || !tempo?.length) return null
  // seconds → quarters (piecewise constant tempo)
  const q = t => { let s = 0; for (let i = 0; i < tempo.length; i++) { const a = tempo[i].t, b = tempo[i + 1]?.t ?? Infinity; if (t <= a) break; s += (Math.min(t, b) - a) * tempo[i].bpm / 60 } return s }
  return t => {
    let m = meter[0]; for (const x of meter) if (x.t <= t + 1e-6) m = x
    const beatQ = 4 / m.beatType
    // compound meters (6/8, 9/8, 12/8, 3/8 fast): the beat is the dotted quarter, i.e. three 8ths
    const unit = m.beatType === 8 && m.beats % 3 === 0 ? 3 * beatQ : beatQ
    return (q(t) - q(m.t)) / unit
  }
}

export function planArticulation(notes, opts = {}) {
  const { mode = 'auto', meter = null, tempo = null } = opts
  const P = { ...INFER, ...opts }
  const ev = eventsOf(notes)
  for (const n of notes) n.art = { slur: null, stroke: null, bow: null, ...(n.art || {}), slurPrev: false }
  if (mode === 'off' || ev.length < 2) return notes
  const hasScore = notes.some(n => n.art.source === 'score')
  // does the timing say anything? (a score export: almost every note touches the next)
  let touch = 0, pairs = 0
  for (let i = 1; i < ev.length; i++) {
    const ioi = ev[i].on - ev[i - 1].on; if (ioi <= 0.02 || ioi > 1.5) continue
    pairs++; if (Math.abs(ev[i].on - ev[i - 1].off) < 0.02 * ioi + 0.002) touch++
  }
  const timed = pairs > 8 && touch / pairs < 0.85
  const use = mode === 'auto' ? (hasScore ? 'score' : timed ? 'timing' : 'infer') : mode
  const beatAt = beatClock(meter, tempo)

  if (use === 'score') {
    for (let i = 1; i < ev.length; i++) {
      const a = ev[i - 1], b = ev[i]
      const sa = a.notes.map(n => n.art.slur).find(x => x != null), sb = b.notes.map(n => n.art.slur).find(x => x != null)
      // same slur id, and the earlier note is not where that slur stopped (a slur over one note is just a mark)
      const cont = sa != null && sa === sb
      for (const n of b.notes) { n.art.slurPrev = cont; n.art.source = 'score' }
    }
    for (const n of ev[0].notes) n.art.source = 'score'
    return notes
  }

  if (use === 'timing') {
    for (let i = 1; i < ev.length; i++) {
      const a = ev[i - 1], b = ev[i], ioi = b.on - a.on
      const gap = (b.on - a.off) / Math.max(1e-3, ioi)
      const single = a.notes.length === 1 && b.notes.length === 1
      // overlap: a slur (SWAM / JBV); a quiet overlapping note: a slide (SWAM's portamento by velocity)
      const over = gap < -0.01 && single
      for (const n of b.notes) {
        n.art.slurPrev = over
        n.art.source = 'timing'
        if (over && (n.velocity ?? 0.7) < 0.75 * (a.top.velocity ?? 0.7)) n.art.port = true
      }
    }
    for (const e of ev) {
      const i = ev.indexOf(e), next = ev[i + 1]
      if (!next) continue
      const ioi = next.on - e.on, gap = (next.on - e.off) / Math.max(1e-3, ioi)
      // the gap's size: the stroke (JBV's Adaptive Shorts): short and fast → spiccato
      const stroke = gap > 0.45 ? (ioi < 0.2 ? 'spiccato' : 'staccato') : gap > 0.15 ? 'staccato' : null
      for (const n of e.notes) { if (!n.art.stroke) n.art.stroke = stroke; n.art.source = 'timing' }
    }
    return notes
  }

  // ── Layer 2: inference ──
  let group = 1
  for (let i = 0; i < ev.length; i++) {
    const b = ev[i], a = ev[i - 1]
    let slur = false
    if (a) {
      const da = a.off - a.on, db = b.off - b.on, ioiA = b.on - a.on
      const nb = b.notes.length === 1 && a.notes.length === 1
      const rest = b.on - a.off > 0.03 + 0.1 * ioiA
      const repeat = b.top.pitch === a.top.pitch
      const leap = Math.abs(b.top.pitch - a.top.pitch) > P.maxLeap
      const long = Math.max(ioiA, db) > P.maxDur
      const ratio = Math.max(da, db) / Math.max(1e-3, Math.min(da, db)) > P.maxRatio
      slur = nb && !rest && !repeat && !leap && !long && !ratio && group < P.maxGroup
      // a group ends at a beat: the note on the beat takes a new bow
      if (slur && P.beatBreak && beatAt && group >= (P.beatMin ?? 2)) {
        const x = beatAt(b.on), frac = x - Math.round(x)
        if (Math.abs(frac) < 0.02) slur = false
      }
    }
    group = slur ? group + 1 : 1
    for (const n of b.notes) { n.art.slurPrev = slur; if (!n.art.stroke) n.art.stroke = null; n.art.source = 'inferred' }
  }
  return notes
}
