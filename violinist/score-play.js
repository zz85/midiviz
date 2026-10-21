// A piece's score as the thing #037 plays (and #038 can): the Mutopia LilyPond
// source (violinist/scores, strings/lilypond.js) read directly, instead of the
// MIDI file LilyPond made from it. The score brings what the MIDI lost or
// flattened: slurs, strokes and bow signs on the notes themselves, dynamics
// with hairpins as note loudness, grace notes as written, each staff's
// instrument (and a pizzicato change inside a part), and note lengths before
// LilyPond's MIDI shortening.
//
//   const piece = await scorePiece(entry)       // null: no score, or it does not read
//   piece.violin  [{ pitch, on, off, q, dq, velocity, art, voice, … }]
//   piece.others  [{ name, program (GM), notes: [{ pitch, on, off, q, dq, velocity, program }] }]
//
// Things recorded or printed against the MIDI's notes (a performer's timing,
// an IMSLP edition's bowing) reach the score's notes through matchMidi: each
// MIDI note pairs with the score note of the same pitch at the same place.
import { readLilyPondFiles } from '../strings/lilypond.js'
import { planArticulation } from '../strings/articulation.js'
import { bowingFor } from './score-art.js'

// General MIDI programs by the names LilyPond's midiInstrument uses
const GM = ['acoustic grand', 'bright acoustic', 'electric grand', 'honky-tonk', 'electric piano 1', 'electric piano 2', 'harpsichord', 'clav', 'celesta', 'glockenspiel', 'music box', 'vibraphone', 'marimba', 'xylophone', 'tubular bells', 'dulcimer',
  'drawbar organ', 'percussive organ', 'rock organ', 'church organ', 'reed organ', 'accordion', 'harmonica', 'concertina', 'acoustic guitar (nylon)', 'acoustic guitar (steel)', 'electric guitar (jazz)', 'electric guitar (clean)', 'electric guitar (muted)', 'overdriven guitar', 'distorted guitar', 'guitar harmonics',
  'acoustic bass', 'electric bass (finger)', 'electric bass (pick)', 'fretless bass', 'slap bass 1', 'slap bass 2', 'synth bass 1', 'synth bass 2', 'violin', 'viola', 'cello', 'contrabass', 'tremolo strings', 'pizzicato strings', 'orchestral harp', 'timpani',
  'string ensemble 1', 'string ensemble 2', 'synthstrings 1', 'synthstrings 2', 'choir aahs', 'voice oohs', 'synth voice', 'orchestra hit', 'trumpet', 'trombone', 'tuba', 'muted trumpet', 'french horn', 'brass section', 'synthbrass 1', 'synthbrass 2',
  'soprano sax', 'alto sax', 'tenor sax', 'baritone sax', 'oboe', 'english horn', 'bassoon', 'clarinet', 'piccolo', 'flute', 'recorder', 'pan flute', 'blown bottle', 'shakuhachi', 'whistle', 'ocarina']
/** GM program of a LilyPond midiInstrument name (or a staff name when it has none); null: unknown. */
export function gmProgram(name, staffName = '') {
  const n = (name || '').toLowerCase().trim()
  let k = GM.indexOf(n)
  if (k < 0 && n === 'acoustic grand piano') k = 0
  if (k >= 0) return k
  // no midiInstrument: from the staff's name
  const s = (staffName || '').toLowerCase()
  const by = [[/piano|klavier|pianoforte/, 0], [/harpsichord|cembalo|continuo/, 6], [/organ|organo/, 19], [/violin|violino/, 48], [/viola|alto/, 48], [/cello|violoncell|basso|bass/, 48],
    [/flaut|flute/, 73], [/oboe|oboi/, 68], [/clarinet/, 71], [/fagott|bassoon/, 70], [/corn|horn/, 60], [/tromb|trumpet/, 56], [/timpani/, 47]]
  for (const [re, p] of by) if (re.test(s)) return p
  return null
}

// LilyPond writes a few instruments as GM programs that do not sound like the score
// (as #037's accompProgram): English horn for horns and trumpets in some sources
const fixProgram = (p, staffName) => p === 69 && /corn|horn/i.test(staffName) ? 60 : p === 69 && /tromb|trumpet/i.test(staffName) ? 56 : p === 6 && /piano/i.test(staffName) ? 0 : p

/**
 * Grace notes as played: each group (the notes squeezed at one main note, as
 * strings/lilypond.js keeps them with { graces: true }) takes time from a
 * neighbour. \appoggiatura on the beat, taking half the main note (two thirds
 * when it is dotted) or its written length when shorter; \grace and
 * \acciaccatura short (about 70 ms each, at most a quarter of the main note)
 * on the beat, the main note after; \afterGrace at the end of the note before.
 * Notes without a main note are dropped. In place; returns the notes.
 */
export function realizeGraces(notes, secPerQAt) {
  const graces = notes.filter(n => n.art?.grace), main = notes.filter(n => !n.art?.grace)
  const groups = new Map()
  for (const g of graces) { const k = `${g.voice}:${g.art.graceAt.toFixed(4)}:${g.art.grace === 'afterGrace'}`; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(g) }
  const drop = new Set()
  for (const gs of groups.values()) {
    const g0 = gs[0], after = g0.art.grace === 'afterGrace', at = g0.art.graceAt
    // the main note: the one starting at graceAt in the same voice (after: the one ending there)
    const same = n => n.voice === g0.voice
    let m = after ? main.filter(n => same(n) && n.q < at - 1e-6).sort((a, b) => b.q - a.q)[0] : main.find(n => same(n) && Math.abs(n.q - at) < 1e-4)
    if (!m) m = main.find(n => Math.abs(n.q - at) < 1e-4)
    if (!m) { gs.forEach(g => drop.add(g)); continue }
    // chord graces: one onset per distinct q-order (several pitches at once are a chord)
    const steps = [...new Set(gs.map(g => g.q.toFixed(6)))]
    const len = m.off - m.on
    // (a dotted note is 1.5 × a power of two quarters)
    const dotted = Number.isInteger(Math.log2(m.dq / 1.5))
    let each
    if (g0.art.grace === 'appoggiatura') each = Math.min(g0.art.graceDur * secPerQAt(m.on), len * (dotted ? 2 / 3 : 0.5)) / steps.length
    else each = Math.min(0.07, len * 0.25 / steps.length)
    const t0 = after ? m.off - each * steps.length : m.on
    gs.forEach(g => {
      const k = steps.indexOf(g.q.toFixed(6))
      g.on = t0 + k * each; g.off = g.on + each * 0.98
      g.velocity = (m.velocity ?? 0.7) * (g0.art.grace === 'appoggiatura' ? 1.05 : 0.9)
      g.art = { ...g.art, slur: m.art?.slur ?? null }
    })
    // the main note: after the graces (on the beat), or shortened by them (after)
    if (after) m.off = Math.max(m.on + 0.03, t0)
    else { for (const n of main) if (Math.abs(n.on - m.on) < 1e-4 && same(n)) n.on = t0 + each * steps.length; if (g0.art.grace === 'appoggiatura') m.velocity = (m.velocity ?? 0.7) * 0.9 }
    // a slur from the grace into its note: they are played in one bow
    if (m.art && m.art.slur == null) { const id = `g${at}:${g0.voice}`; m.art.slur = id; gs.forEach(g => (g.art.slur = id)) }
  }
  const out = notes.filter(n => !drop.has(n))
  out.sort((a, b) => a.on - b.on || a.pitch - b.pitch)
  notes.length = 0; notes.push(...out)
  return notes
}

const cache = new Map()
/**
 * The score of an index.json entry as notes to play: { violin, others, title,
 * tempo, meter, credit } in score seconds (its tempo marks), or null when the
 * entry has no score or the source does not read. Fetched and read once.
 */
export async function scorePiece(entry, base = 'violinist/scores/') {
  const sc = entry?.score
  if (!sc) return null
  if (!cache.has(entry.file)) cache.set(entry.file, (async () => {
    const files = new Map(await Promise.all(sc.files.map(async f => [f, await (await fetch(base + f)).text()])))
    return readLilyPondFiles(files, { main: sc.main, part: sc.part, graces: true, allParts: true })
  })().catch(e => { cache.delete(entry.file); console.warn('score:', e.message); return null }))
  const s = await cache.get(entry.file)
  if (!s) return null
  // a copy per call: the page changes the notes in place (fingering, performer, bowing)
  const copy = ns => ns.map(n => ({ ...n, art: n.art && { ...n.art } }))
  // seconds per quarter at a time (score seconds)
  const secPerQ = sec => { let b = s.tempo[0]?.bpm ?? 60; for (const t of s.tempo) { if (t.t > sec + 1e-6) break; b = t.bpm } return 60 / b }
  const violin = realizeGraces(copy(s.notes), secPerQ)
  const others = s.others.filter(p => p.notes.length).map(p => {
    const staffName = p.name.split(': ').pop(), def = fixProgram(gmProgram(p.midi, staffName) ?? 48, staffName)
    const notes = realizeGraces(copy(p.notes), secPerQ).map(n => ({ ...n, program: n.instrument ? fixProgram(gmProgram(n.instrument, staffName) ?? def, staffName) : def }))
    return { name: staffName, program: def, notes }
  })
  // section ends (repeats and their endings, quarters), for strings/expression-model.js
  const sections = [...new Set((s.repeats || []).flatMap(r => [r.to, ...(r.alts || []).map(a => a[1])]))].sort((a, b) => a - b)
  return { violin, others, title: s.title, tempo: s.tempo, meter: s.meter, sections }
}

/**
 * Pair a MIDI file's notes with the score's: the same pitch at the same place
 * (q within 1/64 of a quarter, else the nearest of the same pitch within an
 * eighth). Returns a Map midiNote → scoreNote.
 */
export function matchMidi(midiNotes, scoreNotes) {
  const key = (p, q) => `${p}@${Math.round(q * 64)}`
  const idx = new Map()
  for (const n of scoreNotes) { if (n.art?.grace) continue; const k = key(n.pitch, n.q); if (!idx.has(k)) idx.set(k, []); idx.get(k).push(n) }
  const pairs = new Map(), taken = new Set()
  const left = []
  for (const m of midiNotes) {
    const s = idx.get(key(m.pitch, m.q))?.find(n => !taken.has(n))
    if (s) { pairs.set(m, s); taken.add(s) } else left.push(m)
  }
  // near misses: LilyPond's MIDI moves notes after grace notes by a few ticks
  const byPitch = new Map()
  for (const n of scoreNotes) if (!taken.has(n) && !n.art?.grace) { if (!byPitch.has(n.pitch)) byPitch.set(n.pitch, []); byPitch.get(n.pitch).push(n) }
  for (const m of left) {
    let best = null
    for (const n of byPitch.get(m.pitch) || []) if (!taken.has(n) && Math.abs(n.q - m.q) <= 0.5 && (!best || Math.abs(n.q - m.q) < Math.abs(best.q - m.q))) best = n
    if (best) { pairs.set(m, best); taken.add(best) }
  }
  return pairs
}

/**
 * Carry what was put on the MIDI notes onto the score's: the recorded timing
 * and pitch curves of a performer (on, off, velocity, rec) along a tempo map
 * t(q) for the notes without a partner, and / or the articulation plan (art)
 * of an edition. opts: { timing: t(q) | null, art: true }. In place.
 */
export function carryOver(pairs, scoreNotes, { timing = null, art = false } = {}) {
  const has = new Set()
  for (const [m, s] of pairs) {
    has.add(s)
    if (timing) { s.on = m.on; s.off = m.off; s.velocity = m.velocity; if (m.rec) s.rec = m.rec; else delete s.rec }
    if (art) { const keep = s.art ? { ...(s.art.orn ? { orn: s.art.orn } : {}), ...(s.art.fermata ? { fermata: true } : {}) } : {}; s.art = m.art ? { ...m.art, ...keep } : (Object.keys(keep).length ? { slur: null, stroke: null, bow: null, source: 'score', ...keep } : null) }
  }
  if (timing) for (const s of scoreNotes) if (!has.has(s)) {
    // a note the MIDI does not have (a grace note, a note LilyPond's MIDI dropped): along the map
    const on = timing(s.q), off = timing(s.q + s.dq)
    const len = s.off - s.on
    s.on = on; s.off = Math.max(on + 0.03, s.art?.grace ? on + len : off)
  }
  if (art) {
    // the notes the edition has no mark for: a grace note joins its main note's slur
    for (const s of scoreNotes) if (!has.has(s) && s.art) { const keep = s.art.grace; s.art = keep ? { ...s.art } : { slur: null, stroke: null, bow: null, source: 'score' } }
  }
  scoreNotes.sort((a, b) => a.on - b.on || a.pitch - b.pitch)
}

/**
 * What the expression model reads from the score, on MIDI notes (Notes: MIDI
 * file): each paired note's place in the bar, ornaments, fermatas and written
 * dynamic (as n.written; a MIDI file's velocities are often all 127). In place.
 */
export function enrichFromScore(midiNotes, scoreNotes) {
  for (const [m, s] of matchMidi(midiNotes, scoreNotes)) {
    m.beat = s.beat; m.beatsPerBar = s.beatsPerBar; m.measure = s.measure; m.written = s.velocity
    if (s.art?.orn || s.art?.fermata) m.art = { ...(m.art || {}), ...(s.art.orn ? { orn: s.art.orn } : {}), ...(s.art.fermata ? { fermata: true } : {}) }
  }
}

/**
 * The bowing of the score's own notes (#037, #038): its slurs and marks
 * (Bowing: score), a printed edition's (violinist/editions, aligned to the
 * MIDI's notes: read there and carried over), inferred, or the fixed rule.
 * notes: the score's violin notes; midiNotes: the MIDI file's ({ pitch, q }).
 * Returns what score-art.js bowingFor returns.
 */
export async function bowScore(entry, notes, midiNotes, mode = 'score') {
  if (mode === 'fixed') {
    // no plan (motion.js's rule bows), but grace notes, ornaments and fermatas stay known
    for (const n of notes) { const a = n.art; n.art = a && (a.grace || a.orn || a.fermata) ? { ...(a.grace ? { grace: a.grace, graceAt: a.graceAt, graceDur: a.graceDur } : {}), ...(a.orn ? { orn: a.orn } : {}), ...(a.fermata ? { fermata: true } : {}) } : undefined; if (!n.art) delete n.art }
    return { mode, matched: 0, total: notes.length, slurs: 0 }
  }
  if (mode === 'infer') { planArticulation(notes, { mode: 'infer' }); return { mode, matched: 0, total: notes.length, slurs: notes.filter(n => n.art?.slurPrev).length } }
  if (mode.startsWith('edition:')) {
    const mn = midiNotes.map(n => ({ ...n })), b = await bowingFor(entry, mn, mode)
    if (b.edition) {
      carryOver(matchMidi(mn, notes), notes, { art: true })
      planArticulation(notes, { mode: 'score' })
      return { ...b, slurs: notes.filter(n => n.art?.slurPrev).length, bows: notes.filter(n => n.art?.bow).length }
    }
  }
  planArticulation(notes, { mode: 'score' })
  return { mode: 'score', matched: notes.length, total: notes.length, slurs: notes.filter(n => n.art?.slurPrev).length }
}
