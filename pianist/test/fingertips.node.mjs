// pianist/fingertips.js: notes fired from the #032 hand driver's fingertips.
//   node --test pianist/test/fingertips.node.mjs   (node:test and module hooks: not for bun test)
// Needs a three.js package (three-node.mjs finds one, or set THREE); skipped
// without. The hand is the default character's (hand-dims.json: rig.dims.R).
import { threeFound } from './three-node.mjs'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const skip = !threeFound && 'no three.js package found (set THREE)'
const dims = JSON.parse(readFileSync(new URL('./hand-dims.json', import.meta.url))).R
const load = async () => ({ ...(await import('../fingertips.js')), ...(await import('../../fingering/fingering.js')) })

test('a five-finger position: every note sounds once, within a frame of its onset, and ends near its release', { skip }, async () => {
  const { simulateContacts, fingerPiece } = await load()
  const notes = [60, 62, 64, 65, 67, 65, 64, 62, 60].map((p, i) => ({ pitch: p, on: 1 + i * 0.4, off: 1.38 + i * 0.4, hand: 'R', velocity: 0.7 }))
  fingerPiece(notes)
  const r = await simulateContacts(notes, dims, { fps: 120 })
  assert.equal(r.stats.onsets, 9)
  assert.equal(r.stats.missed, 0)
  assert.deepEqual(r.notes.map(n => n.midi), notes.map(n => n.pitch))
  for (let i = 0; i < 9; i++) {
    // (the planned press passes PRESS_ON a few ms before the onset: motion.js TOUCH.CONTACT 12 ms before, bottom 18 ms after)
    assert.ok(Math.abs(r.notes[i].time - notes[i].on) < 0.02, `onset ${i}: ${r.notes[i].time} vs ${notes[i].on}`)
    assert.ok(Math.abs(r.notes[i].time + r.notes[i].duration - (notes[i].release ?? notes[i].off)) < 0.04, `end ${i}`)
    assert.equal(r.notes[i].velocity, 0.7)
  }
})

test('a repeated note on one key sounds each time', { skip }, async () => {
  const { simulateContacts, fingerPiece } = await load()
  const notes = [0, 1, 2, 3].map(i => ({ pitch: 64, on: 1 + i * 0.25, off: 1.15 + i * 0.25, hand: 'R', velocity: 0.6 }))
  fingerPiece(notes)
  const r = await simulateContacts(notes, dims, { fps: 120 })
  assert.equal(r.notes.length, 4)
  assert.equal(r.stats.missed, 0)
})

test('a chord wider than the hand: the key out of reach is missed, the rest sound', { skip }, async () => {
  const { simulateContacts } = await load()
  // a twelfth in one hand, fingered by hand: the thumb and the fifth can't both be down
  const notes = [{ pitch: 48, on: 1, off: 2, hand: 'R', finger: 1, velocity: 0.7 }, { pitch: 67, on: 1, off: 2, hand: 'R', finger: 5, velocity: 0.7 }]
  const r = await simulateContacts(notes, dims, { fps: 120 })
  assert.equal(r.stats.onsets + r.stats.missed, 2)
  assert.ok(r.stats.missed >= 1, `missed ${r.stats.missed}`)
})

test('the live detector: a finger lifted off its key lets it go, and the same key under two fingers goes up with the last', { skip }, async () => {
  const { createContactDetector, onKey } = await load()
  // a fake pair of hands: diag and joints as hand-driver.js exposes them
  const mk = () => ({ visible: true, diag: { press: [0, 0, 0, 0, 0], pitch: [null, null, null, null, null], vel: [0, 0, 0, 0, 0], on: [null, null, null, null, null] }, joints: { fingers: [null, ...[1, 2, 3, 4, 5].map(() => [null, null, null, { x: 0, y: 72, z: -5 }])] } })
  const hands = { L: mk(), R: mk() }
  const log = []
  const det = createContactDetector(hands, { on: (p, v, h, f) => log.push(['on', p, h, f]), off: p => log.push(['off', p]) })
  const { keyX } = await import('../../fingering/keyboard.js')
  const set = (side, f, pitch, press, on, dy = 0) => { const d = hands[side].diag; d.pitch[f - 1] = pitch; d.press[f - 1] = press; d.on[f - 1] = on; d.vel[f - 1] = 0.5; const T = hands[side].joints.fingers[f][3]; T.x = pitch == null ? 0 : keyX(pitch); T.y = 73 + dy }
  set('R', 1, 60, 0.9, 1); det.update()
  assert.deepEqual(log, [['on', 60, 'R', 1]])
  set('L', 5, 60, 0.9, 1); det.update()          // the left hand's little finger on the same key: no second on
  assert.equal(log.length, 1)
  set('R', 1, 60, 0.9, 1, 3); det.update()       // the right thumb lifted 3 cm: off its key, but the left still holds it
  assert.equal(log.length, 1)
  set('L', 5, 60, 0.1, 1); det.update()          // the left lets go
  assert.deepEqual(log[1], ['off', 60])
  set('R', 1, 62, 0.9, 2); det.update()          // a new note
  assert.deepEqual(log[2], ['on', 62, 'R', 1])
  assert.equal(onKey({ x: keyX(61) + 0.5, y: 73.5 }, 61), true)
  assert.equal(onKey({ x: keyX(61) + 1.2, y: 73.5 }, 61), false)
  assert.equal(onKey({ x: keyX(60), y: 76 }, 60), false)
  det.reset()
  assert.deepEqual(log[3], ['off', 62])
})
