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
//             stroke, source: 'score' | 'timing' | 'inferred', portato?:
//             'portato' | 'loure' (a pulse in the same bow), rebow?: 'repeat',
//             port?: true (a slide mark or a quiet overlap) | 'inferred', ... }
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
  // s: notes longer than this start their own bow (0.34 tuned on Bach; the editions'
  // tempos are fast, so the score is the same at 0.8, which lets slow movements and
  // lyrical MIDIs slur pairs of eighths: Ave Maria, Bach's Bourrée 0 → 14 / 49 %)
  maxDur: 0.8,
  maxBow: 2,         // s: a slurred group must fit in one bow (a slow mf bow lasts ~2 s)
  maxRatio: 2.1,     // a slur does not join notes whose lengths differ by more than this
  maxLeap: 3,        // semitones: a wider leap takes a new bow (slurs follow steps)
  maxGroup: 8,       // notes per bow at most
  beatBreak: true,   // a note on the beat starts a new bow…
  beatMin: 1,        // …once the group has this many notes
  // stroke types for separately bowed notes (n.art.stroke):
  //   'spiccato'  off the string: the bow is dropped and bounces off, the
  //               string rings between notes. Fast détaché runs (≥ 5 notes /
  //               s, ≤ spicMax s apart, at least two in a row), not loud
  //   'martele'   on the string: pinched before it moves, a fast bitten
  //               stroke, then the bow stops on the string. Loud separate
  //               notes of moderate length, or accented ones
  strokes: true,
  spicMax: 0.2,      // s between onsets, at most, for spiccato
  spicMin: 0.06,     // faster than this is sautillé / tremolo territory: left to détaché
  marMin: 0.15,      // s between onsets, at least, for martelé
  marMax: 0.6,
  // repeated notes and marked notes under a slur (score input):
  //   a repeat with no mark is played in the same bow with a gentle pulse
  //   (louré), or re-bowed with repeats: 'rebow'; dots or a dash under the
  //   slur are portato (a deeper pulse), a line louré. n.art.portato =
  //   'portato' | 'loure', n.art.rebow = 'repeat'
  repeats: 'portato',
  // expressive slides (n.art.port) inferred on slow legato leaps: both notes
  // at least portMin s (portMinBow across a bow change), the second 1.5× that, an interval of portIv[0]–portIv[1] semitones, at most
  // one per portEvery s (a slide on every leap is sentimental)
  portMin: 0.3, portMinBow: 0.45, portIv: [3, 12], portEvery: 6,
  loud: 0.1,         // martelé: velocity this much above the piece's median (or ≥ 0.85 when velocities vary)
}

/**
 * Stroke types from the plan (slurPrev) and the notes: spiccato and martelé
 * (see INFER). Marks from a score win: spiccato / staccato marks on fast notes
 * become spiccato, staccato on slower ones, accent and marcato become martelé.
 */
function planStrokes(ev, P) {
  const vels = ev.map(e => e.top.velocity ?? 0.7).sort((a, b) => a - b)
  const med = vels[vels.length >> 1], varied = vels[vels.length - 1] - vels[0] > 0.05
  // time to the next onset, or the note's own length before a rest (the last note of a run belongs to it)
  const ioi = i => (ev[i + 1] && ev[i + 1].on - ev[i].off < 0.3 ? ev[i + 1].on : ev[i].off) - ev[i].on
  const sep = i => ev[i] && !ev[i].top.art.slurPrev && !(ev[i + 1] && ev[i + 1].top.art.slurPrev) && ev[i].notes.length === 1
  const fastSep = i => sep(i) && ioi(i) <= P.spicMax && ioi(i) >= P.spicMin
  for (let i = 0; i < ev.length; i++) {
    const e = ev[i], n = e.top, d = ioi(i), mark = n.art.stroke
    if (!sep(i)) { if (mark === 'spiccato' || mark === 'martele') n.art.stroke = null; continue }
    let k = null
    if (mark === 'spiccato' || ((mark === 'staccato' || mark === 'staccatissimo') && d <= P.spicMax)) k = 'spiccato'
    else if (mark === 'staccato' || mark === 'staccatissimo' || mark === 'accent' || mark === 'marcato') k = 'martele'
    else if (!mark && P.strokes) {
      const loud = varied && ((n.velocity ?? 0.7) >= med + P.loud || (n.velocity ?? 0.7) >= 0.85)
      if (fastSep(i) && (fastSep(i - 1) || fastSep(i + 1)) && !loud) k = 'spiccato'
      else if (loud && d >= P.marMin && d <= P.marMax) k = 'martele'
    }
    if (k) for (const m of e.notes) m.art.stroke = k
  }
}

const PORTATO_MARKS = new Set(['staccato', 'staccatissimo', 'spiccato', 'tenuto', 'portato'])

/**
 * Expressive slides where the plan has none: slow legato leaps are the classic
 * place (a lyrical shift in the same bow, or on the old bow before a change),
 * at most one every P.portEvery s. A score's slide marks (score.js) and a timed
 * MIDI's quiet overlaps (Layer 1) are kept as they are.
 */
function planSlides(ev, P) {
  // marked slides first: an inferred one keeps portEvery from them on both sides
  const marked = ev.filter(e => e.notes.some(n => n.art.port)).map(e => e.on)
  const clear = t => marked.every(m => Math.abs(m - t) >= P.portEvery)
  let last = -Infinity
  for (let i = 1; i < ev.length; i++) {
    const a = ev[i - 1], b = ev[i]
    if (b.notes.some(n => n.art.port) || !clear(b.on)) continue
    if (a.notes.length > 1 || b.notes.length > 1) continue
    const iv = Math.abs(b.top.pitch - a.top.pitch)
    // slurred, or across a legato bow change when both notes are long (the
    // slide is on the old bow, then the bow changes: Flesch's B-portamento)
    // the note slid into is longer: it lands and sings
    const min = b.top.art.slurPrev ? P.portMin : P.portMinBow
    const slow = a.off - a.on >= min && b.off - b.on >= 1.5 * min && (b.top.art.slurPrev || b.on - a.off < 0.1)
    if (slow && iv >= P.portIv[0] && iv <= P.portIv[1] && b.on - last >= P.portEvery) { b.top.art.port = 'inferred'; last = b.on }
  }
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

/** A note's marks from a score (score.js), as first read: { slur, stroke, bow, port? } or null. */
function scoreMarks(n) {
  const a = n.art
  if (!a) return null
  if (a.orig) return a.orig
  if (a.source !== 'score') return null
  return { slur: a.slur ?? null, stroke: a.stroke ?? null, bow: a.bow ?? null, ...(a.port ? { port: true } : {}) }
}

/**
 * Remove a plan (the fixed rule in motion.js decides again) but keep a score's
 * marks for the next planArticulation.
 */
export function clearArticulation(notes) {
  for (const n of notes) { const o = scoreMarks(n); if (o) n.art = { ...o, orig: o }; else delete n.art }
  return notes
}

export function planArticulation(notes, opts = {}) {
  const { mode = 'auto', meter = null, tempo = null } = opts
  const P = { ...INFER, ...opts }
  const ev = eventsOf(notes)
  // start from the score's own marks (kept in art.orig), never from an earlier plan
  for (const n of notes) {
    const o = scoreMarks(n)
    n.art = o ? { ...o, source: 'score', orig: o, slurPrev: false } : { slur: null, stroke: null, bow: null, slurPrev: false }
  }
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
      let cont = sa != null && sa === sb
      // under a slur: a repeated note (nothing else changes, so it needs the bow
      // to speak) and marked notes are pulsed in the same bow, or a repeat re-bows
      let portato = null
      if (cont) {
        const repeat = a.notes.length === b.notes.length && a.notes.every((n, k) => n.pitch === b.notes[k].pitch)
        const mark = b.notes.map(n => n.art.stroke).find(k => PORTATO_MARKS.has(k))
        if (mark) portato = mark === 'tenuto' ? 'loure' : 'portato'
        else if (repeat && P.repeats === 'rebow') cont = false
        else if (repeat) portato = 'loure'
        if (!cont) for (const n of b.notes) n.art.rebow = 'repeat'
      }
      for (const n of b.notes) { n.art.slurPrev = cont; n.art.source = 'score'; if (portato) n.art.portato = portato }
    }
    for (const n of ev[0].notes) n.art.source = 'score'
    planStrokes(ev, P)
    if (P.slides !== false) planSlides(ev, P)
    return notes
  }

  // Layer 1, the timing: an overlap is a slur (SWAM / JBV) and a clear gap a new
  // bow, its size the stroke. Notes that touch, or leave the small uniform gap
  // of a sequencer's gate (B. Fisher's Tchaikovsky: each note 94 % of its
  // slot, 81 % of its pairs), say nothing about the bow: Layer 2 decides
  // those, as it does every pair of an untimed export.
  const cue = new Array(ev.length).fill(null)
  if (use === 'timing') {
    const rel = i => (ev[i].on - ev[i - 1].off) / Math.max(1e-3, ev[i].on - ev[i - 1].on)
    const gs = []; for (let i = 1; i < ev.length; i++) { const g = rel(i); if (g >= -0.01 && g < 0.45) gs.push(g) }
    gs.sort((a, b) => a - b)
    const gate = Math.max(0.15, (gs[gs.length >> 1] ?? 0) + 0.1)   // a gap up to this is the file's legato
    for (let i = 1; i < ev.length; i++) {
      const a = ev[i - 1], b = ev[i], ioi = b.on - a.on, gap = rel(i)
      const single = a.notes.length === 1 && b.notes.length === 1
      if (gap < -0.01 && single) {
        cue[i] = true
        // a quiet overlapping note: a slide (SWAM's portamento by velocity)
        for (const n of b.notes) if ((n.velocity ?? 0.7) < 0.75 * (a.top.velocity ?? 0.7)) n.art.port = true
      } else if (gap > gate) cue[i] = false
      // the gap's size: the stroke (JBV's Adaptive Shorts): short and fast → spiccato
      const stroke = gap > Math.max(0.45, gate + 0.2) ? (ioi < 0.2 ? 'spiccato' : 'staccato') : gap > gate ? 'staccato' : null
      for (const n of a.notes) if (!n.art.stroke) n.art.stroke = stroke
    }
  }

  // ── Layer 2: inference ──
  // an accented note takes its own bow, and so does the note after it: a jump
  // of ≥ 0.15 in velocity, in a file whose velocities vary
  const vs = ev.map(e => e.top.velocity ?? 0.7), vVaried = Math.max(...vs) - Math.min(...vs) > 0.05
  let group = 1, g0 = ev[0]?.on ?? 0
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
      const bowFull = b.off - g0 > P.maxBow   // the group would not fit in one bow
      const accent = vVaried && Math.abs((b.top.velocity ?? 0.7) - (a.top.velocity ?? 0.7)) >= 0.15
      slur = cue[i] ?? (nb && !rest && !repeat && !leap && !long && !ratio && !bowFull && !accent && group < P.maxGroup)
      // a group ends at a beat: the note on the beat takes a new bow
      if (slur && cue[i] == null && P.beatBreak && beatAt && group >= (P.beatMin ?? 2)) {
        const x = beatAt(b.on), frac = x - Math.round(x)
        if (Math.abs(frac) < 0.02) slur = false
      }
    }
    group = slur ? group + 1 : 1
    if (!slur) g0 = b.on
    for (const n of b.notes) { n.art.slurPrev = slur; if (!n.art.stroke) n.art.stroke = null; n.art.source = use === 'timing' ? 'timing' : 'inferred' }
  }
  planStrokes(ev, P)
  if (P.slides !== false) planSlides(ev, P)
  return notes
}
