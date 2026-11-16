// node --test duo/test/motion-bake.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { bakeFixedStep, createReplay, sampleTrack, scalarBinding, transformBinding } from '../motion-bake.js'

const vector = (x = 0, y = 0, z = 0) => ({ x, y, z, set(a, b, c) { this.x = a; this.y = b; this.z = c; return this } })
const quaternion = (x = 0, y = 0, z = 0, w = 1) => ({ x, y, z, w, set(a, b, c, d) { this.x = a; this.y = b; this.z = c; this.w = d; return this } })
const object = () => ({ position: vector(), quaternion: quaternion(), updates: 0, updateMatrix() { this.updates++ } })

test('fixed stepping derives every time from its integer tick and includes both endpoints', async () => {
  let value = 0
  const seen = []
  const binding = scalarBinding('x', 'violinist', [{ name: 'x', get: () => value, set: x => { value = x } }])
  const baked = await bakeFixedStep({ rate: 4, startTick: -2, endTick: 2, bindings: [binding], yieldEvery: 0,
    step: (time, dt, tick, frame) => { seen.push({ time, dt, tick, frame }); value = time },
  })
  assert.deepEqual(baked.timeline, { rate: 4, origin: 'music-start', startTick: -2, endTick: 2, frameCount: 5 })
  assert.deepEqual(seen.map(x => x.time), [-0.5, -0.25, 0, 0.25, 0.5])
  assert.ok(seen.every(x => x.dt === 0.25))
  assert.deepEqual([...baked.tracks[0].data], [-0.5, -0.25, 0, 0.25, 0.5])
})

test('scalar samples interpolate and clamp at timeline endpoints', () => {
  const timeline = { rate: 2, startTick: 0, endTick: 2, frameCount: 3 }
  const track = { id: 'x', type: 'scalar1f', names: ['x'], data: new Float32Array([0, 10, 30]) }
  assert.equal(sampleTrack(track, timeline, -1)[0], 0)
  assert.equal(sampleTrack(track, timeline, 0.25)[0], 5)
  assert.equal(sampleTrack(track, timeline, 0.75)[0], 20)
  assert.equal(sampleTrack(track, timeline, 9)[0], 30)
})

test('transform samples linearly interpolate positions and shortest-arc slerp quaternions', () => {
  const timeline = { rate: 1, startTick: 0, endTick: 1, frameCount: 2 }
  const s = Math.SQRT1_2
  const track = { id: 'pose', type: 'transform7f', names: ['root'], data: new Float32Array([
    0, 0, 0, 0, 0, 0, 1,
    2, 4, 6, 0, 0, s, s,
  ]) }
  const middle = sampleTrack(track, timeline, 0.5)
  assert.deepEqual([...middle.slice(0, 3)], [1, 2, 3])
  assert.ok(Math.abs(middle[5] - Math.sin(Math.PI / 8)) < 1e-6)
  assert.ok(Math.abs(middle[6] - Math.cos(Math.PI / 8)) < 1e-6)

  const sameRotation = { ...track, data: new Float32Array([0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, -1]) }
  const q = sampleTrack(sameRotation, timeline, 0.5).slice(3)
  assert.ok(Math.abs(q[3] - 1) < 1e-6)
})

test('transform bindings capture and apply local transforms by value', () => {
  const a = object(), b = object()
  a.position.set(1, 2, 3); b.quaternion.set(0, 0, 1, 0)
  const binding = transformBinding('pose', 'pianist', [{ name: 'a', object: a }, { name: 'b', object: b }])
  const values = new Float32Array(14)
  binding.read(values, 0)
  a.position.set(9, 9, 9); b.quaternion.set(0, 0, 0, 1)
  binding.write(values)
  assert.deepEqual([a.position.x, a.position.y, a.position.z], [1, 2, 3])
  assert.deepEqual([b.quaternion.x, b.quaternion.y, b.quaternion.z, b.quaternion.w], [0, 0, 1, 0])
  assert.equal(a.updates, 1)
  assert.equal(b.updates, 1)
})

test('replay owns bundles independently and applies only the selected bundle', () => {
  let violin = 0, piano = 0
  const violinBinding = scalarBinding('v', 'violinist', [{ name: 'v', get: () => violin, set: x => { violin = x } }])
  const pianoBinding = scalarBinding('p', 'pianist', [{ name: 'p', get: () => piano, set: x => { piano = x } }])
  const timeline = { rate: 1, startTick: 0, endTick: 1, frameCount: 2 }
  const tracks = [
    { id: 'v', bundle: 'violinist', type: 'scalar1f', names: ['v'], data: new Float32Array([1, 3]) },
    { id: 'p', bundle: 'pianist', type: 'scalar1f', names: ['p'], data: new Float32Array([10, 30]) },
  ]
  const replay = createReplay({ timeline, tracks }, [violinBinding, pianoBinding])
  assert.equal(replay.owns('violinist'), true)
  assert.equal(replay.owns('camera'), false)
  replay.apply(0.5, 'violinist')
  assert.equal(violin, 2)
  assert.equal(piano, 0)
  replay.apply(0.5)
  assert.equal(piano, 20)
})

test('replay rejects a mismatched scene binding instead of applying it', () => {
  const binding = scalarBinding('x', 'violinist', [{ name: 'different', get: () => 0, set() {} }])
  const bake = { timeline: { rate: 1, startTick: 0, endTick: 0, frameCount: 1 }, tracks: [{ id: 'x', bundle: 'violinist', type: 'scalar1f', names: ['expected'], data: new Float32Array([1]) }] }
  assert.throws(() => createReplay(bake, [binding]), /names differ/)
})

test('fixed-step baking rejects an output larger than its memory limit before stepping', async () => {
  const binding = scalarBinding('x', 'violinist', [{ name: 'x', get: () => 0, set() {} }])
  let stepped = false
  await assert.rejects(() => bakeFixedStep({ rate: 1, startTick: 0, endTick: 9, bindings: [binding], maxBytes: 39, step: () => { stepped = true } }), /bake limit/)
  assert.equal(stepped, false)
})
