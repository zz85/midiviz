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
  assert.equal(timed[0].art.stroke, 'martele', 'a 60 % gap at 4 notes / s: a stopped stroke (martelé; spiccato when faster)')
  // inference on touching notes
  const melody = [[69, 0], [71, 0.125], [72, 0.25], [72, 0.375], [74, 0.5], [86, 0.625], [84, 0.75], [83, 1.75]].map(([pitch, on], i, a) => ({ pitch, on, off: a[i + 1]?.[1] ?? on + 1 }))
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

test('stroke types: fast separate notes are spiccato (the bow leaves the string), loud separate ones martelé (pinched, then stopped on the string)', async () => {
  const { renderPerformance, channel } = await import('../sound/performance.js')
  const { CH } = await import('../sound/bowed.js')
  // a fast détaché run (leaps keep it separate) and loud accented quarters among quieter ones
  const run = [69, 76, 69, 76, 69, 76, 69, 76].map((pitch, k) => ({ pitch, on: k * 0.15, off: (k + 1) * 0.15, velocity: 0.6 }))
  const qs = [69, 71, 73, 74, 76, 78].map((pitch, k) => ({ pitch, on: 2 + k * 0.4, off: 2 + (k + 1) * 0.4, velocity: k % 2 ? 0.95 : 0.6 }))
  const notes = [...run, ...qs]
  planArticulation(notes, { mode: 'infer' })
  assert.ok(run.every(n => n.art.stroke === 'spiccato'), `run: ${run.map(n => n.art.stroke)}`)
  assert.deepEqual(qs.map(n => n.art.stroke), [null, 'martele', null, 'martele', null, 'martele'])
  // flat velocities (MIDI exports at 127): no martelé from velocity
  const flat = qs.map(n => ({ ...n, velocity: 1, art: undefined })); planArticulation(flat, { mode: 'infer' })
  assert.ok(flat.every(n => n.art.stroke == null))
  fingerLine(notes, { instrument: 'violin' })
  const perf = renderPerformance(notes, { style: { vibrato: 0, timing: 0, intonation: 0, variance: 0, autoBow: 0 } })
  const at = (n, ch, t) => channel(perf, n.string, ch)[Math.round(t * perf.frameRate)]
  // spiccato: the bow is off the string for the last part of each note
  const sp = perf.notes.find(n => n.pitch === 76 && n.on > 0.1 && n.on < 1)
  assert.ok(at(sp, CH.force, sp.on + 0.03) > 0.2 && at(sp, CH.force, sp.on + 0.12) === 0 && at(sp, CH.vel, sp.on + 0.12) === 0, 'spiccato: off the string after the bounce')
  // martelé: force before the bow moves, then the bow stops and rests on the string before the next note
  const ma = perf.notes.find(n => n.pitch === 71)
  assert.ok(at(ma, CH.force, ma.on - 0.006) > 0.3 && at(ma, CH.vel, ma.on - 0.006) === 0, 'martelé: pinched before it moves')
  assert.ok(Math.abs(at(ma, CH.vel, ma.on + 0.36)) < 0.01 && at(ma, CH.force, ma.on + 0.36) > 0.1, 'martelé: stopped, resting on the string')
})

test('timing: a sequencer\'s uniform gate (every note 94 % of its slot) is legato, so inference decides; overlaps still slur, clear gaps still re-bow', () => {
  // B. Fisher's Tchaikovsky concerto: 16ths by step, each 112 of 119 ms
  const ns = [69, 71, 73, 74, 76, 74, 73, 71, 69, 71, 73, 74, 76, 78, 80, 81].map((pitch, k) => ({ pitch, on: k * 0.119, off: k * 0.119 + 0.112, velocity: 0.88 }))
  planArticulation(ns, { meter: [{ t: 0, beats: 4, beatType: 4 }], tempo: [{ t: 0, bpm: 126 }] })
  assert.equal(ns[0].art.source, 'timing')
  assert.ok(ns.filter(n => n.art.slurPrev).length >= 8, `slurred: ${ns.map(n => n.art.slurPrev ? '‿' : '|').join('')}`)
  // the same with a real gap in the middle: a new bow there, and an overlap still slurs across a leap
  const g = ns.map(n => ({ ...n, art: undefined })); g[7].off = g[7].on + 0.05; g[11].off = g[12].on + 0.02; g[12].pitch = 86
  planArticulation(g, { meter: [{ t: 0, beats: 4, beatType: 4 }], tempo: [{ t: 0, bpm: 126 }] })
  assert.ok(!g[8].art.slurPrev, 'a clear gap re-bows'); assert.ok(g[12].art.slurPrev, 'an overlap slurs')
})

// a slur over A A (a repeat), B with a dot and C with a dash under the slur, then a slide mark into a high E
const XML2 = `<?xml version="1.0"?><score-partwise><part-list><score-part id="P1"><part-name>Violin</part-name></score-part></part-list>
<part id="P1"><measure number="1"><attributes><divisions>2</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes>
<direction><sound tempo="60"/></direction>
<note><pitch><step>A</step><octave>4</octave></pitch><duration>2</duration><voice>1</voice><notations><slur type="start" number="1"/></notations></note>
<note><pitch><step>A</step><octave>4</octave></pitch><duration>2</duration><voice>1</voice></note>
<note><pitch><step>B</step><octave>4</octave></pitch><duration>2</duration><voice>1</voice><notations><articulations><staccato/></articulations></notations></note>
<note><pitch><step>C</step><alter>1</alter><octave>5</octave></pitch><duration>2</duration><voice>1</voice><notations><articulations><tenuto/></articulations><slur type="stop" number="1"/></notations></note>
</measure><measure number="2">
<note><pitch><step>A</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice><notations><slide type="start" number="1"/></notations></note>
<note><pitch><step>E</step><octave>5</octave></pitch><duration>4</duration><voice>1</voice><notations><slide type="stop" number="1"/></notations></note>
</measure></part></score-partwise>`

test('repeats and marks under a slur: one bow with a louré / portato pulse (or a re-bow); slide marks and slow slurred leaps slide', async () => {
  const { renderPerformance, channel } = await import('../sound/performance.js')
  const { CH } = await import('../sound/bowed.js')
  const s = readMusicXML(XML2)
  assert.ok(Math.abs(s.notes[2].off - s.notes[2].on - 0.85) < 1e-6, 'a dot under a slur keeps the note nearly full')
  planArticulation(s.notes, { meter: s.meter, tempo: s.tempo })
  assert.deepEqual(s.notes.map(n => n.art.slurPrev), [false, true, true, true, false, false])
  assert.deepEqual(s.notes.map(n => n.art.portato ?? null), [null, 'loure', 'portato', 'loure', null, null])
  assert.deepEqual(s.notes.map(n => !!n.art.port), [false, false, false, false, false, true], 'no inferred slide next to a marked one')
  assert.equal(s.notes[5].art.port, true, 'the slide mark')
  // re-bow instead: the repeat starts a new bow, the marked notes still pulse
  const r = readMusicXML(XML2).notes; planArticulation(r, { repeats: 'rebow' })
  assert.deepEqual(r.map(n => n.art.slurPrev), [false, false, true, true, false, false]); assert.equal(r[1].art.rebow, 'repeat')
  // the sound: a dip at a pulsed note, deeper for portato, while one bow keeps going
  // (a re-bow of the repeat dips 19-23 dB here; with no pulse only the 1-2 dB of the phrasing)
  const { renderCurves } = await import('../sound/bowed.js')
  const notes = s.notes.map(n => ({ ...n })); fingerLine(notes, { instrument: 'violin' })
  const flat = { vibrato: 0, timing: 0, intonation: 0, variance: 0, autoBow: 0 }, SR = 48000
  const dips = portato => {
    const perf = renderPerformance(notes, { style: { ...flat, portato } })
    const [L] = renderCurves(perf, { sampleRate: SR, model: 'source', tail: 0, params: { body: 'phil' } })
    const env = t => { const a = Math.round((t - 0.0125) * SR), z = Math.round((t + 0.0125) * SR); let e = 0; for (let i = a; i < z; i++) e += L[i] * L[i]; return 10 * Math.log10(e / (z - a) + 1e-12) }
    return { perf, d: perf.notes.slice(1, 4).map(n => { let lo = 0; for (let x = -0.06; x <= 0.04; x += 0.005) lo = Math.min(lo, env(n.on + x) - env(n.on - 0.15)); return -lo }) }
  }
  const off = dips(0).d, { perf, d: on } = dips(1)
  assert.ok(off.every(x => x < 2.5), `no pulse: ${off.map(x => x.toFixed(1))} dB`)
  assert.ok(on[0] > 3 && on[0] < 7 && on[2] > 3 && on[2] < 7 && on[1] > 6 && on[1] < 11, `louré, portato, louré: ${on.map(x => x.toFixed(1))} dB`)
  assert.equal(perf.strokes[0].events.length, 4, 'all in one bow')
  const [, , , , a2, e2] = perf.notes
  // the slide mark: a heard slide (≥ 90 ms) from A4 to E5 on one string
  assert.equal(a2.string, e2.string, "the slide keeps one string (fingering.js SLIDE_CROSS)")
  const slideMs = p => {
    const n = p.notes[5], f = channel(p, n.string, CH.f0)
    let k = 0; for (let i = Math.round((n.on - 0.3) * p.frameRate); i < Math.round((n.on + 0.1) * p.frameRate); i++) if (f[i] > 452 && f[i] < 640) k++
    return 1000 * k / p.frameRate
  }
  const unmarked = notes.map(n => ({ ...n, art: { ...n.art, port: undefined } }))
  const plain = slideMs(renderPerformance(unmarked, { style: flat })), marked = slideMs(perf)
  assert.ok(marked >= 70 && marked > 1.5 * plain, `slide ${marked.toFixed(0)} ms, ${plain.toFixed(0)} ms without the mark`)
  // inferred: slow slurred leaps slide, at most one every 6 s
  const m = []; for (let k = 0; k < 16; k++) m.push({ pitch: k % 2 ? 76 : 69, on: k * 0.75, off: (k + 1) * 0.75, velocity: 0.6 })
  planArticulation(m, { mode: 'infer' })
  const slid = m.filter(n => n.art.port).map(n => n.on)
  assert.ok(slid.length >= 1 && slid.every((t, k) => k === 0 || t - slid[k - 1] >= 6), `slides at ${slid}`)
})
