// bun test pianist/test/focus-puller.test.js
// The focus puller (pianist/focus-puller.js): her face and her hands in one frame.
import { test, expect, mock } from 'bun:test'
const shim = await import('./three-shim.mjs')
mock.module('three', () => shim)
const { createFocusPuller, SHARP, SPLIT_MIN } = await import('../focus-puller.js')
const { Vector3 } = shim

// a camera at the origin looking down -z (fov 36, 16:9), the bits the puller uses; points
// at depth d straight ahead are (0, 0, -d). (The shim has no camera: project() is the
// pinhole's, written out here.)
Vector3.prototype.project = function (cam) { return cam.ndc(this) }
Vector3.prototype.dot ??= function (v) { return this.x * v.x + this.y * v.y + this.z * v.z }
function camera() {
  const t = Math.tan(18 * Math.PI / 180), aspect = 16 / 9
  return {
    position: new Vector3(0, 0, 0), near: 1,
    updateMatrixWorld() {}, getWorldDirection(v) { return v.set(0, 0, -1) },
    ndc(p) { const d = -p.z; return p.set(p.x / (d * t * aspect), p.y / (d * t), d > 0 ? 0.5 : 2) },
  }
}
const hand = (x, y, d) => ({ visible: true, joints: { M: new Vector3(x, y, -d) }, diag: { press: [1] } })
// the blur on a subject at depth d: |d - focus| × aperture, as three's BokehShader has it
const blur = (f, d) => Math.abs(d - f.focus) * f.aperture

test('face and hands close in depth: both sharp, focus between them', () => {
  const p = createFocusPuller(), cam = camera()
  const f = p.update({ camera: cam, subject: 'head', eyes: new Vector3(0, 20, -200), hands: { L: hand(-20, -20, 220), R: hand(20, -20, 215) }, snap: true })
  expect(f.mode).toBe('both')
  expect(f.focus).toBeCloseTo(210, 5)
  expect(blur(f, 200)).toBeLessThanOrEqual(SHARP + 1e-9)
  expect(blur(f, 220)).toBeLessThanOrEqual(SHARP + 1e-9)
  // the room 2 m behind still blurs (well past what reads as sharp)
  expect(blur(f, 410)).toBeGreaterThan(10 * SHARP)
  // without the split: the eyes alone, the far hand soft
  const g = createFocusPuller().update({ camera: cam, subject: 'head', eyes: new Vector3(0, 20, -200), hands: { L: hand(-20, -20, 220), R: hand(20, -20, 215) }, snap: true, split: false })
  expect(g.focus).toBeCloseTo(200, 5)
  expect(blur(g, 220)).toBeGreaterThan(SHARP)
})

test('too far apart in depth: the subject, and her eyes while she looks up', () => {
  const p = createFocusPuller(), cam = camera()
  const at = { camera: cam, subject: 'hands', eyes: new Vector3(0, 30, -110), hands: { L: hand(-15, -25, 150), R: hand(15, -25, 152) } }
  const f0 = p.update({ ...at, snap: true })
  expect(f0.mode).toBe('subject')
  expect(f0.focus).toBeCloseTo(151, 5)
  // she looks up: the focus racks to her eyes, over about 0.6 s, not at once
  let f = p.update({ ...at, dt: 1 / 30, glance: true })
  expect(f.mode).toBe('eyes')
  expect(f.focus).toBeGreaterThan(130)
  for (let i = 0; i < 20; i++) f = p.update({ ...at, dt: 1 / 30, glance: true })
  expect(f.focus).toBeLessThan(112)   // (95 % of the way after 0.6 s)
  // and back to the keys after
  for (let i = 0; i < 30; i++) f = p.update({ ...at, dt: 1 / 30 })
  expect(f.focus).toBeGreaterThan(150)
  expect(SPLIT_MIN).toBeGreaterThan(0)
})

test('only one of them in the frame: as before', () => {
  const p = createFocusPuller(), cam = camera()
  // the hands below the frame
  const f = p.update({ camera: cam, subject: 'head', eyes: new Vector3(0, 0, -120), hands: { L: hand(0, -400, 150), R: hand(0, -400, 150) }, snap: true })
  expect(f.mode).toBe('subject')
  expect(f.focus).toBeCloseTo(120, 5)
})

test('both hands in a close shot of the keys: both sharp where the lens allows', () => {
  const cam = camera(), hands = { L: hand(-25, 0, 125), R: hand(25, 0, 105) }
  const f = createFocusPuller().update({ camera: cam, subject: 'hands', hands, eyes: new Vector3(0, 300, -60), snap: true, shot: 1.4 })
  expect(f.mode).toBe('both')
  expect(blur(f, 105)).toBeLessThanOrEqual(SHARP + 1e-9)
  expect(blur(f, 125)).toBeLessThanOrEqual(SHARP + 1e-9)
})
