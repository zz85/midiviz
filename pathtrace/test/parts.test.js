// node --test pathtrace/test/parts.test.js
// A render in parts (pathtrace/parts.js): where the parts end, the record, the join script.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { chooseParts, newJob, joinScript, jobLeft, jobDone, settingsOf } from '../parts.js'

// 30 fps, song time t at frame 30 + 30 t (a second of pre-roll), 100 s of frames
const plan = { fps: 30, frames: 3000, frameAt: t => 30 + Math.round(t * 30) }

test('parts: each about the length asked, ending on a cut, never while an intertitle shows', () => {
  const cuts = [8, 19, 31, 38, 52, 61, 70, 83, 90]
  const parts = chooseParts(plan, { cuts, avoid: [[36, 42]], seconds: 20 })
  // they cover every frame once, in order
  assert.equal(parts[0].a, 0); assert.equal(parts.at(-1).b, 3000)
  for (let i = 1; i < parts.length; i++) assert.equal(parts[i].a, parts[i - 1].b)
  // every inner end is a cut's frame, and none falls in the intertitle (36-42 s, with half a second)
  for (const p of parts.slice(0, -1)) {
    assert.ok(cuts.map(plan.frameAt).includes(p.b), `part ends at ${p.b}`)
    assert.ok(p.b < plan.frameAt(36) - 15 || p.b > plan.frameAt(42) + 15, `ends in the intertitle: ${p.b}`)
    assert.ok(p.cut)
  }
  assert.deepEqual(parts.map(p => p.file).slice(0, 2), ['part-001.mp4', 'part-002.mp4'])
  // no cut near: the length asked
  const plain = chooseParts(plan, { seconds: 20 })
  assert.deepEqual(plain.map(p => p.b), [600, 1200, 1800, 2400, 3000])
  assert.equal(plain[0].cut, false)
  // a short render is one part
  assert.equal(chooseParts(plan, { seconds: 120 }).length, 1)
})

test('the record and the join script', () => {
  const job = newJob({ name: 'Goldberg_1080p30.mp4', search: '?song=x&b=1', width: 1920, height: 1080, fps: 30, frames: 3000, songZero: 1, parts: chooseParts(plan, { seconds: 40 }), audio: true })
  assert.equal(job.audio.file, 'Goldberg_1080p30.audio.m4a')
  assert.equal(jobLeft(job).length, 3); assert.equal(jobDone(job), false)
  // (no stub at the end: 1200, 900, 900)
  assert.deepEqual(job.parts.map(p => p.b - p.a), [1200, 900, 900])
  job.parts.forEach(p => { p.done = true }); assert.equal(jobDone(job), false)
  job.audio.done = true; assert.equal(jobDone(job), true)
  const sh = joinScript(job)
  assert.match(sh, /ffmpeg -y -f concat -safe 0 -i parts\.txt -i 'Goldberg_1080p30\.audio\.m4a' -map 0:v -map 1:a -c copy -movflags \+faststart 'Goldberg_1080p30\.mp4'/)
  assert.doesNotMatch(joinScript({ ...job, audio: null }), /audio/)
  // the settings that matter, whatever their order, without the time or the service-worker switch
  assert.equal(settingsOf('?b=1&song=x&t=40&sw=0'), settingsOf('?song=x&b=1'))
  assert.notEqual(settingsOf('?song=x&b=2'), settingsOf('?song=x&b=1'))
})
