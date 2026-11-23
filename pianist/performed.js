// The schedule the piano plays when it follows her hands (Experiment #032,
// Performance > Piano plays).
//
// The MIDI file says what is written; the hands (hand-driver.js setNotes)
// play less: a key the fingering left unfingered (more than five keys at
// once with no cluster to take them, fingering.js sharedUnits) is never
// touched, and a key is let go before its written end where the hand can't
// keep it down (letGoTimes), has moved on (SHIFT), bounces for a repeated
// chord or octave (detached) or leaves to leap (leapDetached). This builds
// the schedule of what the hands do, from the file's notes and the hands'
// notes, so the sound and the keys can follow the picture instead of the
// file. Pedals (the file's control changes) are kept as written.
//
// Notes are matched by pitch and onset (as hand-driver.js letGoTimes keys
// them); two written notes of one pitch at one onset (a doubled track) take
// the hands' notes in order.

/** the least a sounding note lasts, s (a release the hands planned earlier than this is held to it) */
export const MIN_SOUND = 0.03

/**
 * @param {{notes: {midi, time, duration, velocity}[], controlChanges?, duration?, title?}} song  the file, as midiToSchedule gives it
 * @param {{pitch, on, off, release?, hand, finger, shared?}[]} played  the hands' notes (rig.hands.notes: the fingering's, fingers >= 1 and not shared), plus the shared ones where given
 * @returns {{notes, controlChanges, duration, title, stats: {written, played, silent, early, cut}}}
 *   notes: the file's notes the hands play, each ending where the hand lets go; silent: the written notes not played;
 *   early: how many end before their written end; cut: the seconds of written sound they lose, in all
 */
export function performedSchedule(song, played) {
  const at = new Map()   // pitch@on → the hands' notes there, in order
  const key = (p, on) => p + '@' + on
  for (const m of played) {
    if (!(m.finger >= 1)) continue
    const k = key(m.pitch, m.on)
    const a = at.get(k); if (a) a.push(m); else at.set(k, [m])
  }
  // a shared key (a cluster or the thumb across two keys) sounds, held as
  // long as the finger that leads it: its release is the lead's, matched by
  // hand, finger and onset
  const leads = new Map()
  for (const m of played) if (m.finger >= 1 && !m.shared) leads.set(m.hand + m.finger + '@' + m.on, m)
  const notes = []
  let silent = 0, early = 0, cut = 0
  for (const n of song.notes) {
    const a = at.get(key(n.midi, n.time))
    const m = a?.shift()
    if (!m) { silent++; continue }
    let end = m.shared ? (leads.get(m.hand + m.finger + '@' + m.on)?.release ?? m.off) : (m.release ?? m.off)
    end = Math.max(n.time + MIN_SOUND, Math.min(n.time + n.duration, end))
    const duration = end - n.time
    if (duration < n.duration - 1e-6) { early++; cut += n.duration - duration }
    notes.push(duration === n.duration ? n : { ...n, duration })
  }
  return {
    ...song, notes,
    controlChanges: song.controlChanges || [],
    stats: { written: song.notes.length, played: notes.length, silent, early, cut },
  }
}

/** one line for the panel: "as written", or "12 silent, 87 let go early (41 s)" */
export function describePerformed(stats) {
  if (!stats) return ''
  if (!stats.silent && !stats.early) return 'as written'
  const parts = []
  if (stats.silent) parts.push(`${stats.silent} silent`)
  if (stats.early) parts.push(`${stats.early} let go early (${stats.cut < 10 ? stats.cut.toFixed(1) : Math.round(stats.cut)} s)`)
  return parts.join(', ')
}
