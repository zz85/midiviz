// Write each note's hand into the Bach MIDI files, from the score: a "Right
// hand" and a "Left hand" track (#032 Pianist reads the names: handsFromTracks).
//
//   node midis/tools/bach_hands.mjs [--dry] [--only bach_wtc1_03]
//
// The files hold one track, so a player had to guess the hands, and #032's
// split (fingering.js splitHands) charges for every left-hand note above the
// right: it played none of the crossings Bach wrote for two manuals in the
// Goldberg (Var. 5: 83 left-hand notes sounding above the right in the score,
// 2 in the split), and an inner voice went to whichever hand was nearer.
//
// Each movement is aligned with its Mutopia LilyPond source (bach_ornaments.mjs
// align, written grace notes included). Where the source has two parts, upper
// and lower, a part is a hand: when the left hand crosses over, its part only
// changes clef (Goldberg Var. 5 bar 1: g8 r8 \clef "treble" b'8 …), and the odd
// notes the upper part writes on the lower staff (\staffDown, Var. 5 bar 26)
// are still the right hand's, the left hand being busy there. In the fugues
// the staves are the edition's choice of hand for each inner-voice note, as
// players read them. A source written as one part whose voices move between
// the staves with \change Staff (WTC I No. 12's prelude), which the reader does
// not follow, says nothing about hands: its notes go in a third track, "Piano",
// for the player's own split (splitting it by voice, tenor and bass to the
// left, missed keys on 11 % of the left hand's frames, against 6.5 %).
// A note the score does not have (the notes of a realized ornament,
// a cadence trill) takes the hand of the written note it decorates: a matched
// note sounding then, nearest in pitch.
//
// Reads and rewrites the files in place (the tracks are merged first, so it can
// run again); onsets, durations, pitches and velocities are untouched.
// bach_ornaments.mjs (and so bach_goldberg_voicing.mjs) ends by calling it.
import { readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { PIECES, align, fetchSource, readSource, splitSegments } from './bach_ornaments.mjs'

const here = fileURLToPath(new URL('.', import.meta.url))
const root = here + '../../'
const { Midi } = createRequire(import.meta.url)(root + 'tonejs-midi.js')
const NAMES = { R: 'Right hand', L: 'Left hand' }

// a note the score lacks: the hand of a matched note sounding at its onset
// (or nearest to it), nearest in pitch
function nearestHand(n, matched) {
  let best = null, cost = Infinity
  for (const m of matched) {
    const gap = Math.max(0, m.time - n.time, n.time - (m.time + m.duration))
    if (gap > 1) continue
    const c = 40 * gap + Math.abs(m.midi - n.midi)
    if (c < cost) { cost = c; best = m }
  }
  return best?.hand ?? (n.midi < 60 ? 'L' : 'R')
}

// left-hand notes sounding above a right-hand note
function crossings(ns) {
  let c = 0
  for (const a of ns) if (a.hand === 'L' && ns.some(b => b.hand === 'R' && b.time < a.time + a.duration - 1e-3 && b.time + b.duration > a.time + 1e-3 && b.midi < a.midi)) c++
  return c
}

// the score's hand for each of its notes: by part (upper: right); null for a
// one-part source, which says nothing about hands
function handsOfScore(score) {
  if (new Set(score.map(n => n.staff)).size > 1) return n => n.staff === 0 ? 'R' : 'L'
  return null
}

export async function handsFor(file, midi) {
  const notes = midi.tracks.flatMap(t => t.notes)
  const dirs = dirsOf(file)
  const segments = splitSegments(notes, dirs.length)
  const report = []
  let matched = 0, written = 0
  for (const [index, dir] of dirs.entries()) {
    const seg = segments[index].slice().sort((a, b) => a.ticks - b.ticks || a.midi - b.midi)
    const score = readSource(await fetchSource(dir)).notes
    const pairs = align(score, seg)
    const handOf = handsOfScore(score)
    if (!handOf) { for (const n of seg) n.hand = null; report.push({ dir, notes: seg.length, matched: 0, crossings: 0, unknown: true }); continue }
    const hit = []
    for (const [i, j] of pairs) { seg[j].hand = handOf(score[i]); hit.push(seg[j]) }
    for (const n of seg) if (!n.hand) n.hand = nearestHand(n, hit)
    matched += pairs.length; written += score.length
    report.push({ dir, notes: seg.length, matched: pairs.length, crossings: crossings(seg) })
  }
  // (against the score's notes: the file has more, the realized ornaments)
  if (matched < 0.9 * written) throw new Error(`${file}: only ${matched} of the score's ${written} notes found in the file`)
  return { notes, report, matched, written }
}

export async function writeHands(file, { dry = false } = {}) {
  const path = `${root}midis/${file}.mid`
  const midi = new Midi(readFileSync(path))
  const { notes, report, matched, written } = await handsFor(file, midi)
  const proto = midi.tracks.find(t => t.notes.length) ?? midi.tracks[0]
  const channel = proto.channel, instrument = proto.instrument.number
  midi.tracks.splice(0)
  for (const h of ['R', 'L']) {
    const t = midi.addTrack()
    t.name = NAMES[h]; t.channel = channel; t.instrument.number = instrument
    for (const n of notes.filter(n => n.hand === h).sort((a, b) => a.ticks - b.ticks || a.midi - b.midi))
      t.addNote({ midi: n.midi, ticks: n.ticks, durationTicks: n.durationTicks, velocity: n.velocity })
  }
  // (a movement whose source has one part: its notes without a hand, for the
  // player's own split)
  const rest = notes.filter(n => !n.hand)
  if (rest.length) {
    const t = midi.addTrack()
    t.name = 'Piano'; t.channel = channel; t.instrument.number = instrument
    for (const n of rest.sort((a, b) => a.ticks - b.ticks || a.midi - b.midi)) t.addNote({ midi: n.midi, ticks: n.ticks, durationTicks: n.durationTicks, velocity: n.velocity })
  }
  const counts = { R: midi.tracks[0].notes.length, L: midi.tracks[1].notes.length, none: rest.length }
  if (counts.R + counts.L + counts.none !== notes.length) throw new Error(`${file}: ${counts.R + counts.L} notes written of ${notes.length}`)
  if (!dry) writeFileSync(path, Buffer.from(midi.toArray()))
  console.log(`${file}: ${notes.length} notes, ${matched} of the score's ${written} matched; right ${counts.R}, left ${counts.L}${counts.none ? `, ${counts.none} left to the player (${report.filter(r => r.unknown).map(r => r.dir.split('/').pop()).join(', ')}: one part)` : ''}${dry ? ' (dry run)' : ''}`)
  const busy = report.filter(r => r.crossings).map(r => `${r.dir.split('/').pop().replace(/^bwv-988-/, '')} ${r.crossings}`)
  if (busy.length) console.log(`  left-hand notes above the right: ${busy.join(', ')}`)
}

// files cut from another for the Shorts (not rebuilt by bach_ornaments.mjs):
// their movements' sources
const EXTRA = { bach_wtc1_11p: PIECES.bach_wtc1_11.slice(0, 1) }
const dirsOf = file => PIECES[file] ?? EXTRA[file]

async function main() {
  const args = process.argv.slice(2), dry = args.includes('--dry')
  const only = args.includes('--only') ? args[args.indexOf('--only') + 1] : null
  for (const file of [...Object.keys(PIECES), ...Object.keys(EXTRA)]) if (!only || file === only) await writeHands(file, { dry })
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await main()
