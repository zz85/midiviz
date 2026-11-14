// pianist/replan.js: the fingering checked on the #032 hand driver.
//   node --test pianist/test/replan.node.mjs   (node:test and module hooks: not for bun test)
// Needs a three.js package (three-node.mjs finds one, or set THREE); skipped
// without. The hand is the default character's, measured on the page
// (hand-dims.json: rig.dims.R).
import { threeFound } from './three-node.mjs'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const skip = !threeFound && 'no three.js package found (set THREE)'
const dims = JSON.parse(readFileSync(new URL('./hand-dims.json', import.meta.url))).R
const song = f => fileURLToPath(new URL('../../' + f, import.meta.url))
const load = async () => ({
  ...(await import('../replan.js')),
  ...(await import('../../fingering/fingering.js')),
  ...(await import('../../fingering/test/golden.js')),
})

test('a five-finger position played slowly: no misses, nothing banned, fingering unchanged', { skip }, async () => {
  const { replan, fingerPiece } = await load()
  const notes = [60, 62, 64, 65, 67, 65, 64, 62, 60].map((p, i) => ({ pitch: p, on: 1 + i * 0.4, off: 1.38 + i * 0.4, hand: 'R' }))
  const plain = notes.map(n => ({ ...n })); fingerPiece(plain)
  const r = await replan(notes, {}, dims)
  assert.equal(r.before.missFrames, 0)
  assert.equal(r.bans.size, 0)
  assert.equal(r.kept, false)
  assert.deepEqual(notes.map(n => n.finger), plain.map(n => n.finger))
})

test('never worse than the fingering alone, and close to it (shipped songs)', { skip }, async () => {
  const { replan, fingerPiece, songNotes, heldConflicts } = await load()
  for (const f of ['minute_waltz.mid', 'Prelude1.mid', 'entertainer.mid']) {
    const notes = songNotes(song(f))
    const plain = notes.map(n => ({ ...n })); fingerPiece(plain)
    const r = await replan(notes, {}, dims)
    assert.ok(r.after.missFrames <= r.before.missFrames, `${f}: ${r.before.missFrames} → ${r.after.missFrames}`)
    if (!r.kept) assert.deepEqual(notes.map(n => n.hand + n.finger), plain.map(n => n.hand + n.finger), f)
    const changed = notes.filter((n, i) => n.hand !== plain[i].hand || n.finger !== plain[i].finger).length
    assert.ok(changed <= 0.01 * notes.length, `${f}: ${changed} notes changed`)
    assert.ok(heldConflicts(notes) <= heldConflicts(plain), f)
  }
})

test('the Minute Waltz: the shapes the hand missed are refingered, fewer frames missed', { skip }, async () => {
  const { replan, songNotes } = await load()
  const r = await replan(songNotes(song('minute_waltz.mid')), {}, dims)
  assert.ok(r.kept && r.bans.size > 0)
  assert.ok(r.after.missFrames < r.before.missFrames, `${r.before.missFrames} → ${r.after.missFrames}`)
})
