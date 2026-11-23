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

test('the velocity comes from the fingertip\'s speed through the key: soft notes press slowly, loud ones fast, read back in order', { skip }, async () => {
  const { simulateContacts } = await load()
  const { buildMotion, TOUCH, KEY } = await import('../../fingering/motion.js')
  // a slow scale, one finger each, velocities 0.2 .. 1
  const vs = [0.2, 0.4, 0.6, 0.8, 1.0, 0.3, 0.5, 0.7, 0.9]
  const notes = vs.map((v, i) => ({ pitch: 60 + [0, 2, 4, 5, 7][i % 5], on: 1 + i * 0.6, off: 1.5 + i * 0.6, hand: 'R', finger: 1 + i % 5, velocity: v }))
  const r = await simulateContacts(notes, dims, { fps: 240 })
  assert.equal(r.notes.length, 9)
  // (on the piece's scale, its 10th to 95th percentile: the loudest note reads as the 95th, 0.9)
  const { loudnessScale } = await import('../../fingering/motion.js'), [lo, hi] = loudnessScale(notes)
  assert.deepEqual([lo, hi], [0.2, 0.9])
  for (let i = 0; i < 9; i++) assert.ok(Math.abs(r.notes[i].velocity - Math.min(hi, Math.max(lo, vs[i]))) < 0.03, `note ${i}: read ${r.notes[i].velocity.toFixed(2)} written ${vs[i]}`)
  // the press itself: the quietest note's key takes TRAVEL.pp to go down, the loudest TRAVEL.ff; the hammer leaves (press 0.75) at the onset
  const m = buildMotion(notes, { touch: 'fall' })
  const pressAt = (n, t) => m.poseAt(t).R.fingers[n.finger - 1].press
  for (const [n, T] of [[notes[0], TOUCH.TRAVEL.pp], [notes[4], TOUCH.TRAVEL.ff]]) {
    assert.ok(Math.abs(pressAt(n, n.on) - TOUCH.STRIKE) < 0.02, `press at the onset ${pressAt(n, n.on)}`)
    let t0 = null, t1 = null
    for (let t = n.on - 0.15; t < n.on + 0.1; t += 0.0005) { const p = pressAt(n, t); if (t0 == null && p > 0.001) t0 = t; if (p > 0.999 && t1 == null) t1 = t }
    assert.ok(Math.abs(t1 - t0 - T) < 0.004, `travel ${(t1 - t0).toFixed(3)} vs ${T}`)
    assert.ok(Math.abs(m.poseAt(n.on).R.fingers[n.finger - 1].strike - KEY.DIP / T) < 0.5)
  }
})

test('a fast soft trill: each finger has half the time free, the key is pressed part way at the soft speed, so it stays soft; the same finger legato can\'t, and is louder', { skip }, async () => {
  const { simulateContacts } = await load()
  const { buildMotion, TOUCH, KEY } = await import('../../fingering/motion.js')
  // the piece's scale: a loud chord sets ff, the trill is pp, 2nd and 3rd fingers every 110 ms, legato
  const chord = [{ pitch: 48, on: 0.5, off: 0.9, hand: 'L', finger: 5, velocity: 1 }, { pitch: 52, on: 0.5, off: 0.9, hand: 'L', finger: 1, velocity: 1 }]
  const trill = [...chord]
  for (let i = 0; i < 12; i++) trill.push({ pitch: 60 + (i % 2) * 2, on: 2 + i * 0.11, off: 2.11 + i * 0.11, hand: 'R', finger: 2 + i % 2, velocity: 0.2 })
  const r = await simulateContacts(trill, dims, { fps: 240 })
  const run = r.notes.filter(n => n.midi >= 60)
  assert.equal(run.length, 12)
  for (const n of run) assert.ok(n.velocity < 0.25, `trill read ${n.velocity.toFixed(2)}`)
  const m = buildMotion(trill, { touch: 'fall' }), p = m.poseAt(2 + 4 * 0.11 + 0.02).R.fingers[1]
  assert.ok(p.dip >= TOUCH.STRIKE && p.dip < 1, `dip ${p.dip}`)
  assert.ok(Math.abs(p.strike - KEY.DIP / TOUCH.TRAVEL.pp) < 0.5, `strike ${p.strike} (the soft speed)`)
  // the same run on one finger: the key has to come up each time, the press is quicker, and louder
  const same = [...chord]
  for (let i = 0; i < 12; i++) same.push({ pitch: 60 + (i % 4) * 2, on: 2 + i * 0.11, off: 2.11 + i * 0.11, hand: 'R', finger: 2, velocity: 0.2 })
  const r2 = await simulateContacts(same, dims, { fps: 240 })
  const run2 = r2.notes.filter(n => n.midi >= 60)
  assert.equal(run2.length, 12)
  assert.ok(run2[0].velocity < 0.25 && run2.slice(1).every(n => n.velocity > 0.4 && n.velocity < 1), `same finger read ${run2.map(n => n.velocity.toFixed(2)).join(' ')}`)
})
