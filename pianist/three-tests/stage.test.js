// bun test pianist/three-tests — pages' helpers that need the real three.js r185, on disk:
// THREE=<path to three.module.js>, default /tmp/three/three.module.js
//   mkdir -p /tmp/three && for f in three.module.js three.core.js; do curl -so /tmp/three/$f https://cdn.jsdelivr.net/npm/three@0.185.1/build/$f; done
// (Kept apart from pianist/test, which mocks three with a small stand-in: bun hangs when two
// test files mock the same module, so everything that needs the real one is in this one file.)
//  • where intertitles go (pianist/frame-space.js)
//  • the depth of field's focus puller (pianist/focus-puller.js) and its lens for the path
//    tracers (pathtrace/engines.js lensFromBokeh)
import { test, expect, mock } from 'bun:test'
const THREE_JS = process.env.THREE || '/tmp/three/three.module.js'
mock.module('three', () => import(THREE_JS))
const THREE = await import(THREE_JS)
const { createFrameSpace, LANDSCAPE_PLACES, portraitPlaces } = await import('../frame-space.js')
const { createFocusPuller } = await import('../focus-puller.js')
globalThis.location ||= { search: '' }
const { lensFromBokeh } = await import('../../pathtrace/engines.js')

function setup({ pianoAt, herAt }) {
  const camera = new THREE.PerspectiveCamera(40, 16 / 9, 1, 5000)
  camera.position.set(0, 0, 600); camera.lookAt(0, 0, 0); camera.updateMatrixWorld()
  const piano = new THREE.Group()
  const box = new THREE.Mesh(new THREE.BoxGeometry(150, 80, 40), new THREE.MeshBasicMaterial())
  box.position.set(...pianoAt); piano.add(box); piano.updateMatrixWorld(true)
  const bones = []
  let parent = null
  for (let k = 0; k < 6; k++) {
    const b = new THREE.Bone(); b.name = k === 5 ? 'head' : 'spine0' + k
    if (parent) { b.position.set(0, 14, 0); parent.add(b) } else b.position.set(...herAt)
    bones.push(b); parent = b
  }
  bones[0].updateMatrixWorld(true)
  return { camera, piano, skeleton: new THREE.Skeleton(bones) }
}

test('the emptiest corner: away from her and from the piano', () => {
  // the piano across the bottom left, her on the top right: the line goes bottom right or top left
  let s = setup({ pianoAt: [-90, -70, 0], herAt: [100, 20, 0] })
  let sp = createFrameSpace({ objects: [s.piano], skeleton: s.skeleton })
  let r = sp.pick(s.camera, LANDSCAPE_PLACES)
  expect(r.scores['bottom-left']).toBeGreaterThan(0.25)      // the piano fills it
  expect(r.scores['top-right']).toBeGreaterThan(0.25)        // she is in it, if small
  expect(['bottom-right', 'top-left']).toContain(r.place)
  // the old rule (away from her only) would have taken bottom left, over the piano
  // a preference holds only while it isn't clearly worse
  expect(sp.pick(s.camera, LANDSCAPE_PLACES, 'bottom-left').place).not.toBe('bottom-left')
  expect(sp.pick(s.camera, LANDSCAPE_PLACES, 'top-left').place).toBe(r.scores['top-left'] <= r.scores['bottom-right'] + 0.04 ? 'top-left' : 'bottom-right')
  // her over the piano's place counts more than the piano alone
  s = setup({ pianoAt: [-90, 60, 0], herAt: [90, -110, 0] })
  sp = createFrameSpace({ objects: [s.piano], skeleton: s.skeleton })
  r = sp.pick(s.camera, LANDSCAPE_PLACES)
  expect(r.scores['bottom-right']).toBeGreaterThan(r.scores['top-left'])
  expect(['bottom-left', 'top-right']).toContain(r.place)
  // a hidden object doesn't count
  s.piano.visible = false
  expect(createFrameSpace({ objects: [s.piano] }).pick(s.camera, LANDSCAPE_PLACES).scores['top-left']).toBe(0)
})

test('a tall frame: top or bottom of the safe area', () => {
  const s = setup({ pianoAt: [0, -60, 0], herAt: [0, -40, 0] })
  s.camera.aspect = 9 / 16; s.camera.updateProjectionMatrix()
  const sp = createFrameSpace({ objects: [s.piano], skeleton: s.skeleton })
  const r = sp.pick(s.camera, portraitPlaces({ x0: 0.06, y0: 0.12, x1: 0.88, y1: 0.77 }))
  expect(r.place).toBe('top-center')
})

const cam = () => { const c = new THREE.PerspectiveCamera(34, 16 / 9, 2, 6000); c.position.set(0, 120, 200); c.lookAt(0, 80, 0); c.updateMatrixWorld(); return c }
const hand = (x, y, z, press = 0) => ({ visible: true, joints: { M: new THREE.Vector3(x, y, z) }, diag: { press: [press, 0, 0, 0, 0] } })
test('focus along the view axis, frame-rate independent, shallower close up', () => {
  const c = cam(), p = createFocusPuller(), fwd = c.getWorldDirection(new THREE.Vector3())
  // off-centre subject: its depth, not its distance
  const eyes = new THREE.Vector3(60, 110, 0)
  const f = p.update({ camera: c, subject: 'head', eyes, snap: true })
  expect(f.focus).toBeCloseTo(eyes.clone().sub(c.position).dot(fwd), 6)
  expect(f.focus).toBeLessThan(c.position.distanceTo(eyes))
  // the same pull at 60 fps and at 12 fps over one second
  const run = fps => { const q = createFocusPuller(); q.update({ camera: c, subject: 'head', eyes: new THREE.Vector3(0, 80, 0), snap: true }); let r; for (let i = 0; i < Math.round(fps * 0.25); i++) r = q.update({ camera: c, dt: 1 / fps, subject: 'head', eyes: new THREE.Vector3(0, 80, -100) }); return r.focus }
  expect(Math.abs(run(60) - run(12))).toBeLessThan(1)
  // closer = shallower (larger aperture uniform)
  const near = createFocusPuller().update({ camera: c, subject: 'target', target: new THREE.Vector3(0, 110, 120), snap: true })
  const far = createFocusPuller().update({ camera: c, subject: 'target', target: new THREE.Vector3(0, 80, -400), snap: true })
  expect(near.aperture).toBeGreaterThan(far.aperture)
})
test('hands: one hand kept until the other clearly wins for 1.5 s; level hands both sharp', () => {
  const c = cam(), p = createFocusPuller()
  const L = hand(-40, 76, -10, 1), R = hand(30, 76, 40, 0)
  p.update({ camera: c, subject: 'hands', hands: { L, R }, snap: true })
  const first = p.hand
  // the other becomes busier: no switch for a moment
  ;(first === 'L' ? R : L).diag.press = [1, 1, 1, 1, 1]; (first === 'L' ? L : R).diag.press = [0, 0, 0, 0, 0]
  for (let i = 0; i < 30; i++) p.update({ camera: c, dt: 1 / 30, subject: 'hands', hands: { L, R } })
  expect(p.hand).toBe(first)
  for (let i = 0; i < 30; i++) p.update({ camera: c, dt: 1 / 30, subject: 'hands', hands: { L, R } })
  expect(p.hand).not.toBe(first)
  // both at the same depth: between them
  const q = createFocusPuller(), A = hand(-30, 76, 0), B = hand(30, 76, 4)
  const f = q.update({ camera: c, subject: 'hands', hands: { L: A, R: B }, snap: true })
  const fwd = c.getWorldDirection(new THREE.Vector3()), dA = A.joints.M.clone().sub(c.position).dot(fwd), dB = B.joints.M.clone().sub(c.position).dot(fwd)
  expect(f.focus).toBeCloseTo((dA + dB) / 2, 6)
})
test('lensFromBokeh: the same blur as the page near the focus plane', () => {
  const c = cam(), s = 150, ap = 0.00012, lens = lensFromBokeh({ focus: s, aperture: ap }, c)
  // page: blur diameter as a fraction of the frame height per cm = 0.8·aperture·aspect
  const page = 0.8 * ap * c.aspect
  // lens: CoC (A·Δ/(s+Δ)) over the frame height at s (2·s·tan): for a small Δ
  const D = 1, coc = lens.aperture * D / (s + D) / (2 * s * Math.tan(THREE.MathUtils.degToRad(c.fov) / 2))
  expect(coc / page).toBeGreaterThan(0.98); expect(coc / page).toBeLessThan(1.02)
  expect(lensFromBokeh({ focus: 0, aperture: 1 }, c)).toBe(null)
})
