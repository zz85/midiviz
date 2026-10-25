// Write each Goldberg note's hand into the MIDI, from the score: a "Right hand"
// and a "Left hand" track (#032 Pianist reads the names: handsFromTracks).
//
//   node midis/tools/bach_goldberg_hands.mjs [--dry]
//
// The files hold one track, so a player had to guess the hands, and #032's
// split (fingering.js splitHands) charges for every left-hand note above the
// right: it played none of the crossings Bach wrote for two manuals (Var. 5:
// 83 left-hand notes sounding above the right in the score, 2 in the split).
//
// Each movement is aligned with its Mutopia LilyPond source (bach_ornaments.mjs
// align, written grace notes included). The source has two parts, upper and
// lower, and a part is a hand: when the left hand crosses over, its part only
// changes clef (Var. 5 bar 1: g8 r8 \clef "treble" b'8 …), and the odd notes the
// upper part writes on the lower staff (\staffDown, Var. 5 bar 26) are still the
// right hand's, the left hand being busy there. A note the score does not have
// (the notes of a realized ornament) takes the hand of the written note it
// decorates: a matched note sounding then, nearest in pitch.
//
// Reads and rewrites midis/bach_goldberg.mid and bach_goldberg_aria.mid in place
// (the tracks are merged first, so it can run again). Run after
// bach_goldberg_voicing.mjs, which calls it; onsets, durations, pitches and
// velocities are untouched.
import { readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { PIECES, align, fetchSource, readSource, splitSegments } from './bach_ornaments.mjs'

const here = fileURLToPath(new URL('.', import.meta.url))
const root = here + '../../'
const { Midi } = createRequire(import.meta.url)(root + 'tonejs-midi.js')
const TARGETS = ['bach_goldberg', 'bach_goldberg_aria']
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

export async function handsFor(file, midi) {
  const notes = midi.tracks.flatMap(t => t.notes)
  const dirs = PIECES[file]
  const segments = splitSegments(notes, dirs.length)
  const report = []
  let matched = 0, written = 0
  for (const [index, dir] of dirs.entries()) {
    const seg = segments[index].slice().sort((a, b) => a.ticks - b.ticks || a.midi - b.midi)
    const score = readSource(await fetchSource(dir)).notes
    const pairs = align(score, seg)
    const hit = []
    for (const [i, j] of pairs) { seg[j].hand = score[i].staff === 0 ? 'R' : 'L'; hit.push(seg[j]) }
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
  const counts = { R: midi.tracks[0].notes.length, L: midi.tracks[1].notes.length }
  if (counts.R + counts.L !== notes.length) throw new Error(`${file}: ${counts.R + counts.L} notes written of ${notes.length}`)
  if (!dry) writeFileSync(path, Buffer.from(midi.toArray()))
  console.log(`${file}: ${notes.length} notes, ${matched} of the score's ${written} matched; right ${counts.R}, left ${counts.L}${dry ? ' (dry run)' : ''}`)
  const busy = report.filter(r => r.crossings).map(r => `${r.dir.split('-').pop()} ${r.crossings}`)
  if (busy.length) console.log(`  left-hand notes above the right: ${busy.join(', ')}`)
}

async function main() {
  const dry = process.argv.includes('--dry')
  for (const file of TARGETS) await writeHands(file, { dry })
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await main()
