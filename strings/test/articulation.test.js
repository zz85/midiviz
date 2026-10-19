// node --test strings/test/articulation.test.js   (score input and the articulation planner)
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readMusicXML } from '../score.js'
import { planArticulation } from '../articulation.js'
import { buildMotion } from '../motion.js'
import { fingerLine } from '../fingering.js'

const XML = `<?xml version="1.0"?><score-partwise><work><work-title>Test</work-title></work>
<part-list><score-part id="P1"><part-name>Violin</part-name></score-part></part-list>
<part id="P1"><measure number="1"><attributes><divisions>2</divisions><time><beats>2</beats><beat-type>4</beat-type></time></attributes>
<direction><sound tempo="120"/></direction>
<note><pitch><step>A</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice><notations><slur type="start" number="1"/></notations></note>
<note><pitch><step>B</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice></note>
<note><pitch><step>C</step><alter>1</alter><octave>5</octave></pitch><duration>1</duration><voice>1</voice><notations><slur type="stop" number="1"/></notations></note>
<note><pitch><step>D</step><octave>5</octave></pitch><duration>1</duration><voice>1</voice><notations><articulations><staccato/></articulations><technical><up-bow/></technical></notations></note>
</measure><measure number="2">
<note><pitch><step>E</step><octave>5</octave></pitch><duration>2</duration><voice>1</voice><tie type="start"/></note>
<note><pitch><step>E</step><octave>5</octave></pitch><duration>2</duration><voice>1</voice><tie type="stop"/></note>
</measure></part></score-partwise>`

test('MusicXML: pitches, times from divisions and tempo, slurs, staccato (half length), bowings, ties merged, beats', () => {
  const s = readMusicXML(XML)
  assert.equal(s.title, 'Test')
  assert.deepEqual(s.notes.map(n => n.pitch), [69, 71, 73, 74, 76])
  // 120 quarters / min, divisions 2: an eighth is 0.25 s
  assert.deepEqual(s.notes.map(n => +n.on.toFixed(3)), [0, 0.25, 0.5, 0.75, 1])
  assert.equal(+(s.notes[3].off - s.notes[3].on).toFixed(3), 0.125, 'staccato sounds half its value')
  assert.equal(+(s.notes[4].off - s.notes[4].on).toFixed(3), 1, 'the tie is one note of two quarters')
  const [a, b, c, d] = s.notes
  assert.ok(a.art.slur != null && a.art.slur === b.art.slur && b.art.slur === c.art.slur && d.art.slur == null)
  assert.equal(d.art.stroke, 'staccato'); assert.equal(d.art.bow, 'up')
  assert.deepEqual(s.notes.map(n => n.beat), [0, 0.5, 1, 1.5, 0])
})

test('planner: the score\'s slur becomes one bow in motion.js; timing (overlap) is a slur; inference never slurs across a rest, a repeat or a leap', () => {
  const s = readMusicXML(XML)
  planArticulation(s.notes, { meter: s.meter, tempo: s.tempo })
  assert.deepEqual(s.notes.map(n => n.art.slurPrev), [false, true, true, false, false])
  const notes = s.notes.map(n => ({ ...n })); fingerLine(notes, { instrument: 'violin' })
  const { strokes } = buildMotion(notes, { instrument: 'violin' })
  assert.deepEqual(strokes.map(st => st.events.length), [3, 1, 1], 'A–B–C# in one bow, D and E separate')
  // timing: overlapping notes are slurred, gapped ones not, and a big gap marks a short stroke
  const timed = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(k => ({ pitch: 69 + (k % 3), on: k * 0.25, off: k * 0.25 + (k % 2 ? 0.27 : 0.1), velocity: 0.7 }))
  planArticulation(timed)
  assert.equal(timed[0].art.source, 'timing')
  assert.ok(timed[2].art.slurPrev && !timed[1].art.slurPrev, 'an overlap slurs, a gap re-bows')
  assert.equal(timed[0].art.stroke, 'staccato', 'a 60 % gap at 4 notes / s: staccato (spiccato when faster)')
  // inference on touching notes
  const melody = [[69, 0], [71, 0.125], [72, 0.25], [72, 0.375], [74, 0.5], [86, 0.625], [84, 0.75], [83, 1.25]].map(([pitch, on], i, a) => ({ pitch, on, off: a[i + 1]?.[1] ?? on + 0.5 }))
  planArticulation(melody, { mode: 'infer', meter: [{ t: 0, beats: 4, beatType: 4 }], tempo: [{ t: 0, bpm: 120 }] })
  const sp = melody.map(n => n.art.slurPrev)
  assert.ok(sp[1] && sp[2], 'steps slur'); assert.ok(!sp[3], 'a repeated pitch re-bows'); assert.ok(!sp[5], 'a leap re-bows'); assert.ok(!sp[7], 'a long note re-bows')
})

test('planner inference agrees with the Bach editions better than the fixed rule (BWV 1001–1006 MusicXML)', async t => {
  const A = await import('./articulation.js')
  if (!A.hasScores()) return t.skip('no Bach Violin Dataset scores')
  const mvs = A.loadMovements()
  const sum = rs => rs.reduce((a, r) => ({ tp: a.tp + r.tp, fp: a.fp + r.fp, fn: a.fn + r.fn, ok: a.ok + r.ok, n: a.n + r.n }), { tp: 0, fp: 0, fn: 0, ok: 0, n: 0 })
  const pl = A.f1(sum(mvs.map(m => A.inferred(m)))), rule = A.f1(sum(mvs.map(A.builtin)))
  // measured: planner F1 50.0 / agreement 67.7 %, rule 38.5 / 59.8 %
  assert.ok(pl.F1 > rule.F1 + 0.08 && pl.acc > rule.acc + 0.05, `slurred-pair F1 ${(100 * pl.F1).toFixed(1)} vs ${(100 * rule.F1).toFixed(1)}, agreement ${(100 * pl.acc).toFixed(1)} vs ${(100 * rule.acc).toFixed(1)} %`)
})
