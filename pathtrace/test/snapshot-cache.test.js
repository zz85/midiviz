// bun test pathtrace/test — the snapshot cache (pathtrace/snapshot.js) on a small made-up stage.
// Needs three.js r185 on disk (the page gets it from a CDN):
//   mkdir -p /tmp/three && curl -so /tmp/three/three.module.js https://cdn.jsdelivr.net/npm/three@0.185.1/build/three.module.js
//   curl -so /tmp/three/three.core.js https://cdn.jsdelivr.net/npm/three@0.185.1/build/three.core.js
// (or THREE=<path to three.module.js>)
import { test, expect, mock } from 'bun:test'
const THREE_JS = process.env.THREE || '/tmp/three/three.module.js'
mock.module('three', () => import(THREE_JS))
const THREE = await import(THREE_JS)
const { snapshotScene, createSnapshotCache, disposeSnapshot } = await import('../snapshot.js')

function stage() {
  const scene = new THREE.Scene()
  const box = new THREE.Mesh(new THREE.BoxGeometry(10, 10, 10), new THREE.MeshStandardMaterial({ color: 0xff0000 }))
  const key = new THREE.Mesh(new THREE.BoxGeometry(2, 1, 15), new THREE.MeshPhongMaterial({ color: 0xffffff }))
  const inst = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.1, 0.1, 100), new THREE.MeshStandardMaterial(), 50)
  for (let i = 0; i < 50; i++) inst.setMatrixAt(i, new THREE.Matrix4().makeTranslation(i, 0, 0))
  // skinned: two bones
  const g = new THREE.CylinderGeometry(1, 1, 20, 8, 4)
  const P = g.attributes.position, si = [], sw = []
  for (let i = 0; i < P.count; i++) { si.push(0, 1, 0, 0); const w = (P.getY(i) + 10) / 20; sw.push(1 - w, w, 0, 0) }
  g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4)); g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4))
  const b0 = new THREE.Bone(), b1 = new THREE.Bone(); b1.position.y = 10; b0.add(b1)
  const sk = new THREE.SkinnedMesh(g, new THREE.MeshStandardMaterial({ color: 0x00ff00 }))
  sk.add(b0); sk.bind(new THREE.Skeleton([b0, b1]))
  scene.add(box, key, inst, sk, new THREE.PointLight(0xffffff, 1))
  return { scene, box, key, inst, sk, b1 }
}
// a stand-in for the BVH a tracer hangs on a geometry
const hangBVH = snap => snap.scene.traverse(o => { if (o.isMesh && !o.geometry.boundsTree) o.geometry.boundsTree = { refits: 0, refit() { this.refits++ } } })
const cam = new THREE.PerspectiveCamera()

test('a cached stage: static copies kept with their BVH, skinned refreshed and refitted, moved meshes get the new matrix', () => {
  const S = stage(), cache = createSnapshotCache({ rebuildEvery: 3 })
  let snap = snapshotScene(S.scene, { camera: cam, cache })
  expect(snap.stats.cache).toEqual({ reused: 0, refreshed: 0, built: 4, builtTriangles: expect.any(Number) })
  hangBVH(snap)
  const geos = new Map(); snap.scene.traverse(o => o.isMesh && geos.set(o, o.geometry))
  const boxCopy = [...geos.keys()].find(m => m.material.color?.getHex() === 0xff0000)
  disposeSnapshot(snap)
  // frame 2: the key moves, a bone bends, the box turns blue
  S.key.position.x = 5; S.b1.rotation.z = 0.5; S.box.material.color.set(0x0000ff)
  S.scene.updateMatrixWorld(true)
  snap = snapshotScene(S.scene, { camera: cam, cache })
  expect(snap.stats.cache).toMatchObject({ reused: 3, refreshed: 1, built: 0 })
  const meshes = []; snap.scene.traverse(o => o.isMesh && meshes.push(o))
  for (const m of meshes) expect(geos.get(m)).toBe(m.geometry)   // same copies (and BVHs)
  expect(boxCopy.material.color.getHex()).toBe(0x0000ff)           // the material refreshed
  const keyCopy = meshes.find(m => m.geometry.parameters === undefined && m.matrix.elements[12] === 5)
  expect(keyCopy).toBeTruthy()
  const skCopy = meshes.find(m => m.geometry.boundsTree.refits === 1)
  expect(skCopy).toBeTruthy()
  // the skinned copy has the bent pose: its top moved off the axis
  let maxX = 0; const p = skCopy.geometry.attributes.position; for (let i = 0; i < p.count; i++) maxX = Math.max(maxX, Math.abs(p.getX(i)))
  expect(maxX).toBeGreaterThan(2)
  disposeSnapshot(snap)
  // frames 3, 4: refit, then a fresh BVH (rebuildEvery 3)
  snap = snapshotScene(S.scene, { camera: cam, cache }); expect(skCopy.geometry.boundsTree.refits).toBe(2); disposeSnapshot(snap)
  snap = snapshotScene(S.scene, { camera: cam, cache }); expect(skCopy.geometry.boundsTree).toBe(null); disposeSnapshot(snap)
  // the strings re-expanded only when an instance moves
  S.inst.setMatrixAt(3, new THREE.Matrix4().makeTranslation(3, 1, 0)); S.inst.instanceMatrix.needsUpdate = true
  snap = snapshotScene(S.scene, { camera: cam, cache })
  expect(snap.stats.cache.built).toBe(1)
  disposeSnapshot(snap)
  // a CPU-moved mesh (cloth): refreshed in place
  S.box.geometry.attributes.position.array[0] += 1; S.box.geometry.attributes.position.needsUpdate = true
  snap = snapshotScene(S.scene, { camera: cam, cache })
  expect(snap.stats.cache).toMatchObject({ refreshed: 2, built: 0 })
  expect(boxCopy.geometry.attributes.position.array[0]).toBe(S.box.geometry.attributes.position.array[0])
  disposeSnapshot(snap)
  cache.dispose()
})

test('without a cache, everything is the frame\'s own and freed', () => {
  const S = stage()
  const snap = snapshotScene(S.scene, { camera: cam })
  expect(snap.stats.cache).toBeUndefined()
  expect(snap.transient.geometries.length).toBe(4)
  expect(snap.transient.materials.length).toBe(4)
  let freed = 0; for (const g of snap.transient.geometries) g.addEventListener('dispose', () => freed++)
  disposeSnapshot(snap)
  expect(freed).toBe(4)
})
