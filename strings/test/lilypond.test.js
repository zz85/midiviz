// node --test strings/test/lilypond.test.js   (LilyPond input, strings/lilypond.js)
// The full check against LilyPond's own MIDI output is strings/test/lilypond.js (Mutopia sources).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readLilyPond, readLilyPondFiles, mainLyFile } from '../lilypond.js'
import { readScoreFile } from '../score.js'

const pitches = r => r.notes.map(n => n.pitch)
const onsets = r => r.notes.map(n => +n.q.toFixed(4))

test('LilyPond: \\relative octaves (with and without a start pitch, chords, octave checks), durations that carry over, dots, rests', () => {
  // c'' then d e (up a step), b (down), g' (octave mark), c,, ; the chord's first note is the next reference
  const r = readLilyPond(`\\relative c'' { c4 d8 e b4. g'16 c,, <c e g>2 d4 r4 s4 c=''4 }`)
  assert.deepEqual(pitches(r), [72, 74, 76, 71, 79, 60, 60, 64, 67, 62, 72])
  assert.deepEqual(onsets(r), [0, 1, 1.5, 2, 3.5, 3.75, 4, 4, 4, 6, 9])
  assert.equal(+(r.notes[3].off - r.notes[3].on).toFixed(3), 1.5, 'a dotted quarter at 60 bpm')
  // no start pitch: the first note is absolute (as if relative to f)
  assert.deepEqual(pitches(readLilyPond(`\\relative { c' d e c'' }`)), [60, 62, 64, 84])
  assert.deepEqual(pitches(readLilyPond(`\\absolute { c' d'' e, }`)), [60, 74, 40])
  assert.deepEqual(pitches(readLilyPond(`\\fixed c' { c d' b, }`)), [60, 74, 59])
  // a duration apart from its pitch, and multipliers
  assert.deepEqual(onsets(readLilyPond(`{ c'4 d' 2 R1*2 e'4 }`)), [0, 1, 11])
})

test('LilyPond: slurs and ties (postfix, also after a space), marks, bowings, dynamics, tuplets, grace notes skipped, glissando, q', () => {
  const r = readLilyPond(`\\version "2.18.2"
\\header { title = "Test" }
music = \\relative g' {
  \\time 3/4 \\tempo 4 = 120
  g8 ( a b ) c-. d->\\upbow e\\downbow ~ |
  e4 \\times 2/3 { f8\\p( g a) } \\grace b16 c4 |
  d4\\glissando a'4 <a c>8-- q8 |
}
\\score { \\new Staff \\music \\layout { } \\midi { } }`)
  assert.equal(r.title, 'Test')
  assert.deepEqual(pitches(r), [67, 69, 71, 72, 74, 76, 77, 79, 81, 84, 86, 93, 93, 96, 93, 96])
  const [g, a, b, c, d, e, f, gg, aa] = r.notes
  assert.ok(g.art.slur != null && g.art.slur === a.art.slur && a.art.slur === b.art.slur && c.art.slur == null, 'slur g a b')
  assert.equal(+(e.off - e.on).toFixed(3), 1.5 * 0.5, 'e tied over the bar: an eighth and a quarter (0.75 s at 120)')
  assert.equal(c.art.stroke, 'staccato'); assert.equal(d.art.stroke, 'accent'); assert.equal(d.art.bow, 'up'); assert.equal(e.art.bow, 'down')
  assert.ok(f.art.slur != null && f.art.slur === aa.art.slur, 'slur inside the triplet')
  assert.deepEqual(onsets(r).slice(6, 10), [4, 4.3333, 4.6667, 5], 'triplet eighths, the grace note takes no time')
  assert.ok(Math.abs(f.velocity - 0.42) < 1e-6, '\\p')
  assert.equal(r.notes[11].art.port, true, 'glissando into a\'')
  assert.equal(r.notes[12].art.stroke, 'tenuto')
  assert.deepEqual([r.notes[14].q, r.notes[15].q], [8.5, 8.5], 'q repeats the chord')
  assert.deepEqual(r.tempo.map(t => t.bpm), [120])
  assert.deepEqual(r.meter.map(m => [m.beats, m.beatType]), [[3, 4]])
  assert.deepEqual(r.notes.map(n => n.measure).slice(0, 7), [1, 1, 1, 1, 1, 1, 2])
})

test('LilyPond: \\repeat (volta once unless \\unfoldRepeats, unfold with alternatives), \\partial beats, \\midi tempo, voices with \\\\', () => {
  const body = `\\relative c'' { \\partial 4 g4 \\repeat volta 2 { c2 } \\alternative { { d2 } { e2 } } }`
  assert.deepEqual(pitches(readLilyPond(body)), [67, 72, 74, 76], 'as printed: body, then each alternative')
  const u = readLilyPond(`\\score { \\unfoldRepeats ${body} \\midi { \\tempo 4 = 90 } }`)
  assert.deepEqual(pitches(u), [67, 72, 74, 72, 76])
  assert.deepEqual(u.tempo.map(t => t.bpm), [90], 'the \\midi block\'s tempo')
  assert.deepEqual(u.notes.map(n => [n.measure, n.beat]).slice(0, 2), [[0, 3], [1, 0]], 'the upbeat is beat 3 of a 4/4 bar')
  // two voices in one staff: the second voice continues from the first voice's last pitch (LilyPond's order)
  const v = readLilyPond(`\\relative c'' { << { c4 d } \\\\ { g, a } >> }`)
  assert.deepEqual(v.notes.map(n => [n.pitch, n.q, n.voice]), [[67, 0, 2], [72, 0, 1], [69, 1, 2], [74, 1, 1]])
})

test('LilyPond: staves and parts (violin chosen), \\include as text, \\include "english.ly", variables, \\transpose', async () => {
  const files = new Map([
    ['piece/notes.ily', `\\include "english.ly"\nviolin = \\relative c'' { \\set Staff.instrumentName = "Violino" cs4 bf ef2 }\npiano = \\relative c' { c1 }`],
    ['piece/score.ly', `\\include "notes.ily"
\\score { << \\new Staff \\with { instrumentName = "Piano" } \\piano \\new Staff \\violin \\new Staff \\transpose c d \\piano >> \\midi { } }
\\score { \\new Staff \\piano \\layout { } }`],
  ])
  assert.equal(mainLyFile(files), 'piece/score.ly')
  const r = readLilyPondFiles(files)
  assert.deepEqual(r.parts.map(p => p.name), ['Piano', 'Violino', 'Staff 3'], 'the \\midi score only')
  assert.equal(r.part, 1, 'the violin by default')
  assert.deepEqual(pitches(r), [73, 70, 75])
  assert.deepEqual(pitches(readLilyPondFiles(files, { part: 2 })), [62], 'transposed up a tone')
  // by name, as the page opens files
  const one = await readScoreFile('x.ly', new TextEncoder().encode(`{ c'4 d' }`))
  assert.deepEqual(pitches(one), [60, 62])
})

test('violin pieces: the Mutopia score\'s slurs on the MIDI LilyPond made from it (violinist/score-art.js, violinist/scores)', async () => {
  const { readFileSync, existsSync } = await import('node:fs')
  const { createRequire } = await import('node:module')
  const { matchScore } = await import('../../violinist/score-art.js')
  const { planArticulation } = await import('../articulation.js')
  const root = new URL('../../violinist/', import.meta.url).pathname
  const index = JSON.parse(readFileSync(root + 'midis/index.json', 'utf8'))
  assert.equal(index.filter(e => e.score).length, index.length, 'every piece has its score')
  assert.ok(index.every(e => e.score.matched > 0.95), 'and it matches the MIDI')
  const e = index.find(x => x.file === 'bach_1001_1_adagio.mid')
  if (!existsSync(root + 'scores/' + e.score.main)) return
  const files = new Map(e.score.files.map(f => [f, readFileSync(root + 'scores/' + f, 'utf8')]))
  const s = readLilyPondFiles(files, { main: e.score.main, part: e.score.part })
  const { Midi } = createRequire(import.meta.url)('../../tonejs-midi.js')
  const midi = new Midi(readFileSync(root + 'midis/' + e.file))
  const tr = midi.tracks.find(t => t.notes.length === e.violinNotes)
  const notes = tr.notes.map(n => ({ pitch: n.midi, on: n.time, off: n.time + n.duration, q: n.ticks / midi.header.ppq }))
  const m = matchScore(notes, s.notes)
  assert.ok(m.matched >= 0.99 * notes.length, `${m.matched} / ${notes.length}`)
  planArticulation(notes, { mode: 'score' })
  const slurred = notes.filter(n => n.art.slurPrev).length
  assert.ok(slurred > 0.4 * notes.length, `the Adagio is mostly slurred: ${slurred} / ${notes.length}`)
  assert.ok(notes.every(n => n.art.source === 'score'))
})

test('a written-out volta (\\unfoldRepeats) keeps where it repeats', () => {
  const sc = readLilyPond(`\\score { \\unfoldRepeats { \\relative c'' { \\time 4/4 \\repeat volta 2 { a4 b c d } e1 } } }`)
  assert.equal(sc.notes.length, 9)
  assert.deepEqual(sc.repeats.map(r => ({ from: r.from, to: r.to, keep: r.keep, unfolded: r.unfolded })), [{ from: 0, to: 8, keep: [[0, 4]], unfolded: true }])
})

