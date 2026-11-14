// The Mechanical Pianist's fingering tests (larroy/mechanical-pianist,
// tests/fingering.test.ts and tests/interpretation.test.ts), run on our
// engine. The cases with one right answer are the mp suite of exercises.js,
// graded by bench.js; these are the ones stated as properties. Their tests
// run on the whole planner (hand split included), so here too the hands are
// left to fingerPiece unless the case gives them.
//   node --test fingering/test/mp.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { isBlack, parseNote, noteName } from '../keyboard.js'
import { fingerPiece } from '../fingering.js'
import { assignHands } from '../hands.js'
import { mpExercises } from '../exercises.js'
import { runSuite } from './bench.js'
import { songNotes, heldConflicts } from './golden.js'

/** "C4 D4+F4 r E4" at a fixed step → notes without a hand (MP's helpers.line) */
function line(text, { step = 0.2, dur = step * 1.02, start = 0, hand } = {}) {
  const out = []
  let t = start
  for (const tok of text.trim().split(/\s+/)) {
    if (tok !== 'r') for (const p of tok.split('+')) out.push({ pitch: parseNote(p), on: t, off: t + dur, velocity: 0.6, ...(hand ? { hand } : {}) })
    t += step
  }
  return out
}
const play = (...parts) => { const notes = parts.flat(); fingerPiece(notes); return notes.sort((a, b) => a.on - b.on || a.pitch - b.pitch) }
const fingers = (notes, hand) => notes.filter(n => !hand || n.hand === hand).map(n => n.finger).join('')

/** Three thumb crossings, each after 3 or 4, ending 3-4-5 (any 123-1234 order). */
function scaleShape(f, ascending) {
  assert.equal(f.startsWith('1'), ascending, f)
  const crossings = [...f.matchAll(/([2-5])1/g)]
  assert.equal(crossings.length, 3, f)
  for (const c of crossings) assert.ok(['3', '4'].includes(c[1]), f)
  assert.ok(f.endsWith('345'), f)
}

test('mp suite: every exact case matches (scales, arpeggios, chords)', () => {
  const rows = runSuite({}, e => e.suite === 'mp')
  assert.equal(rows.length, 38) // 24 scales, 6 arpeggios, 8 chords
  const miss = rows.filter(r => !r.exact)
  assert.equal(miss.length, 0, miss.map(r => `${r.id} got ${r.got} want ${r.want[0]}`).join('\n'))
})

test('24 major scales, two octaves up and down: each within 3 notes of convention, > 96 % overall', () => {
  const rows = runSuite({}, e => e.id.startsWith('mp-scale-'))
  let match = 0, total = 0
  for (const r of rows) {
    const m = [...r.want[0]].filter((c, i) => c === r.got[i]).length
    assert.ok(m >= r.want[0].length - 3, `${r.id}: ${r.got}`)
    match += m; total += r.want[0].length
  }
  assert.ok(match / total > 0.96)
})

test('five-finger position, hands split automatically', () => {
  const n = play(line('C4 D4 E4 F4 G4', { step: 0.25 }))
  assert.equal(fingers(n), '12345')
  assert.deepEqual(new Set(n.map(x => x.hand)), new Set(['R']))
})

test('right hand C major, two octaves up: thumb passes under after 3 and 4', () => {
  scaleShape(fingers(play(line('C4 D4 E4 F4 G4 A4 B4 C5 D5 E5 F5 G5 A5 B5 C6', { step: 0.15 }))), true)
})

test('right hand C major, two octaves down: fingers cross over the thumb', () => {
  scaleShape([...fingers(play(line('C6 B5 A5 G5 F5 E5 D5 C5 B4 A4 G4 F4 E4 D4 C4', { step: 0.15 })))].reverse().join(''), true)
})

test('left hand C major, one octave up (hand chosen automatically)', () => {
  const n = play(line('C3 D3 E3 F3 G3 A3 B3 C4', { step: 0.15 }))
  assert.deepEqual(new Set(n.map(x => x.hand)), new Set(['L']))
  assert.equal(fingers(n), '54321321')
})

test('A harmonic minor keeps the thumb off G#', () => {
  const n = play(line('A4 B4 C5 D5 E5 F5 G#5 A5 B5 C6 D6 E6 F6 G#6 A6', { step: 0.15 }))
  assert.equal(n.filter(x => x.finger === 1 && isBlack(x.pitch)).length, 0)
  scaleShape(fingers(n), true)
})

test('triads: 1-3-5 right, 5-3-1 left (hands chosen automatically)', () => {
  const n = play(line('C4+E4+G4', { step: 1 }), line('C3+E3+G3', { step: 1, start: 2 }))
  assert.equal(fingers(n, 'R'), '135')
  assert.equal(fingers(n, 'L'), '531')
})

test('a fast trill alternates two fingers', () => {
  const n = play(line('C5 D5 C5 D5 C5 D5 C5 D5 C5 D5', { step: 0.08 }))
  const c = new Set(n.filter(x => x.pitch === 72).map(x => x.finger)), d = new Set(n.filter(x => x.pitch === 74).map(x => x.finger))
  assert.equal(c.size, 1); assert.equal(d.size, 1); assert.notDeepEqual(c, d)
})

test('fast repeated notes change finger and never step back up by one; slow ones keep it', () => {
  const ex = id => { const e = mpExercises().find(x => x.id === id); const n = e.notes.map(x => ({ ...x })); fingerPiece(n); return n.map(x => x.finger) }
  const fast = ex('mp-repeat-fast')
  for (let i = 1; i < fast.length; i++) {
    assert.notEqual(fast[i], fast[i - 1], fast.join(''))
    assert.notEqual(fast[i] - fast[i - 1], 1, fast.join(''))
  }
  assert.equal(new Set(ex('mp-repeat-slow')).size, 1)
})

test('a repeated figure after a different approach keeps its fingering', () => {
  const fig = 'E5 G5 F5 D5 E5'
  const f = fingers(play(line(`C5 D5 ${fig} B4 C5 D5 C5 ${fig}`, { step: 0.2 })))
  assert.equal(f.slice(2, 7), f.slice(11, 16))
})

test('a melody that dips below middle C stays in one hand', () => {
  assert.equal(new Set(play(line('E4 D4 C4 B3 A3 B3 C4 D4 E4', { step: 0.3 })).map(n => n.hand)).size, 1)
})

test('simultaneous bass and treble split between hands', () => {
  assert.equal(play(line('C2+C6', { step: 1 })).map(n => n.hand).join(''), 'LR')
})

test('two lines crossing middle C keep the hands their named tracks give them', () => {
  const lh = line('G3 A3 B3 C4 D4 C4 B3 A3', { step: 0.4 }).map(n => ({ ...n, track: 1 }))
  const rh = line('E4 D4 C4 B3 C4 D4 E4 F4', { step: 0.4, start: 0.2 }).map(n => ({ ...n, track: 0 }))
  const sched = [...rh, ...lh].map(n => ({ ...n, midi: n.pitch, time: n.on, duration: n.off - n.on }))
  assignHands(sched, ['Right Hand', 'Left Hand'], 'tracks')
  const notes = sched.map(n => ({ pitch: n.midi, on: n.time, off: n.time + n.duration, track: n.track, hand: n.hand }))
  fingerPiece(notes)
  assert.ok(notes.filter(n => n.track === 1).every(n => n.hand === 'L'))
  assert.ok(notes.filter(n => n.track === 0).every(n => n.hand === 'R'))
})

test('twelve notes at once: flagged, not faked (five fingers per hand, the rest unfingered)', () => {
  // (MP gives the extra notes their neighbour's finger for display and flags
  // them chord-overflow; ours leaves them at finger 0, which the hands skip)
  const n = play(line('C2+E2+G2+C3+E3+G3+C5+E5+G5+C6+E6+G6', { step: 1 }))
  assert.ok(n.every(x => x.hand))
  for (const hand of ['L', 'R']) {
    const f = n.filter(x => x.hand === hand && x.finger).map(x => x.finger)
    assert.ok(f.length <= 5 && new Set(f).size === f.length, hand + ' ' + f)
  }
  assert.ok(n.filter(x => !x.finger).length >= 2)
})

test('a low octave left ringing: the chord above is shared, not stretched over two octaves', () => {
  // Clair de lune, bar 15: D#1-D#2 held, then F-G♭-B♭ (LH) and F-B♭-F (RH)
  const n = play(line('D#1+D#2', { step: 2.5 }), line('F4+F#4+A#4+F5+A#5+F6', { start: 0.65, step: 1.4 }))
  assert.equal(n.map(x => `${noteName(x.pitch)}${x.hand}`).join(' '), 'Eb1L Eb2L F4L F#4L Bb4L F5R Bb5R F6R')
})

// Held to none, now that a finger struck again lets go of what it held and
// the keys one finger takes together on purpose (the thumb across two, a
// cluster) aren't counted (heldConflicts in golden.js; over the whole song
// list it was 25,029 before that, most in Rush E, Rachmaninov 3 and Hedwig's
// Theme). Those three are the densest music the song list holds.
const HELD_SONGS = ['Prelude1.mid', 'entertainer.mid', 'minute_waltz.mid', 'Fugue1.mid', 'JVKE - golden hour.mid', 'rachmaninov3.mid', 'rush_e_real.mid']
test('no finger holds two keys (shipped songs, dense ones included)', () => {
  for (const file of HELD_SONGS) {
    const notes = songNotes(fileURLToPath(new URL('../../' + file, import.meta.url)))
    fingerPiece(notes)
    assert.equal(heldConflicts(notes), 0, file)
  }
})
