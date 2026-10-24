// bun test pianist/test/frame-space.test.js — where intertitles go (pianist/frame-space.js).
// Needs three.js r185 on disk (as pathtrace/test/snapshot-cache.test.js): THREE=<three.module.js>, default /tmp/three
import { test, expect, mock } from 'bun:test'
const THREE_JS = process.env.THREE || '/tmp/three/three.module.js'
mock.module('three', () => import(THREE_JS))
const THREE = await import(THREE_JS)
const { createFrameSpace, LANDSCAPE_PLACES, portraitPlaces } = await import('../frame-space.js')

// a camera looking down -z at the origin; a "piano" (a wide box) and a "pianist" (a bone chain)
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
