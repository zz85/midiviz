// The score as #037's input (violinist/score-play.js) and the LilyPond reader's
// loudness from dynamics and hairpins (strings/lilypond.js).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { loudness, readLilyPond } from '../lilypond.js'
import { realizeGraces, scorePiece, matchMidi, gmProgram } from '../../violinist/score-play.js'

const root = fileURLToPath(new URL('../../', import.meta.url))
const require = createRequire(import.meta.url)
const { Midi } = require('../../tonejs-midi.js')

test('loudness: a hairpin ramps to the dynamic that ends it; \\! alone ends it a step away', () => {
  const L = loudness([[0, 0.42], [8, 0.8]], [[4, 'cresc'], [8, 'end']])
  assert.equal(L(2), 0.42)
  assert.ok(Math.abs(L(6) - 0.61) < 1e-9, 'half way up the crescendo')
  assert.equal(L(9), 0.8)
  const D = loudness([[0, 0.8]], [[2, 'dim'], [4, 'end']])
  assert.ok(Math.abs(D(5) - 0.68) < 1e-9, 'a diminuendo with no dynamic after it: one step down')
  // in a real source: p \< … f
  const s = readLilyPond(String.raw`\score { \new Staff \relative c'' { c4\p\< d e f g1\f } \midi { } }`)
  const v = s.notes.map(n => n.velocity)
  assert.ok(v[0] < v[1] && v[1] < v[2] && v[2] < v[3] && v[3] < v[4], v.join(' '))
})

test('grace notes: an appoggiatura takes half its note on the beat, a \\grace is short before the note, \\afterGrace ends the note before', () => {
  const s = readLilyPond(String.raw`\score { \new Staff \relative c'' { \tempo 4 = 60 \appoggiatura d8 c2 \grace e16 d4 \afterGrace e2 { f16 } g4 } \midi { } }`, { graces: true })
  const n = realizeGraces(s.notes.map(x => ({ ...x, art: { ...x.art } })), () => 1)
  const at = p => n.find(x => x.pitch === p)
  assert.equal(n.length, 7)
  assert.ok(Math.abs(at(74).on - 0) < 1e-6 && Math.abs(at(72).on - 0.5) < 1e-6, 'appoggiatura: the D takes 0.5 s of the half note')
  assert.ok(at(76).art.grace && Math.abs(at(76).on - 2) < 1e-6 && at(76).off - at(76).on < 0.08, 'grace E short on the beat')
  const D = n.find(x => x.pitch === 74 && !x.art.grace)
  assert.ok(D.on > 2.05 && D.on < 2.1, 'the D after it')
  const E2 = n.filter(x => x.pitch === 76 && !x.art.grace)[0], F = at(77)
  assert.ok(F.on < 5 && F.off <= 5 + 1e-6 && E2.off <= F.on + 1e-6, 'afterGrace at the end of the E')
  assert.ok(at(79).on >= 5 - 1e-6)
})

test('the Mutopia sources play as the score: every violin piece reads, nearly every MIDI note has its score note, accompaniment staves with GM programs', async () => {
  const fetchOld = globalThis.fetch
  globalThis.fetch = async u => ({ text: async () => readFileSync(root + u, 'utf8') })
  try {
    const index = JSON.parse(readFileSync(root + 'violinist/midis/index.json', 'utf8'))
    let total = 0, paired = 0
    for (const e of index.filter(x => x.score)) {
      const p = await scorePiece(e)
      assert.ok(p, e.file)
      const midi = new Midi(readFileSync(root + 'violinist/midis/' + e.file))
      let solo = midi.tracks.filter(t => t.notes.length === e.violinNotes); if (solo.length !== 1) solo = midi.tracks.filter(t => t.channel === e.violinChannel && t.notes.length)   // (as #037 picks it)
      const mn = solo.flatMap(t => t.notes).map(n => ({ pitch: n.midi, q: n.ticks / midi.header.ppq }))
      const m = matchMidi(mn, p.violin)
      total += mn.length; paired += m.size
      assert.ok(m.size / mn.length > 0.9, `${e.file}: ${m.size}/${mn.length}`)
      for (const o of p.others) assert.ok(o.program >= 0 && o.program < 128, `${e.file} ${o.name}`)
    }
    assert.ok(paired / total > 0.99, `${paired}/${total}`)
  } finally { globalThis.fetch = fetchOld }
  assert.equal(gmProgram('acoustic grand'), 0)
  assert.equal(gmProgram('pizzicato strings'), 45)
  assert.equal(gmProgram(null, 'Violoncello'), 48)
})
