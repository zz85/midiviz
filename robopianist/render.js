// three.js view of a MuJoCo World (Experiment #031).
//
// After zalo's mujoco_wasm example loader (MIT): one Group per body, one Mesh
// per visible geom, poses copied from xpos / xquat every frame. MuJoCo is
// z-up, three.js y-up: (x, y, z) → (x, z, −y). Mesh buffers are copied rather
// than swizzled in place, so the physics' own mesh data is left alone.

import * as THREE from 'three'

const GEOM = { PLANE: 0, HFIELD: 1, SPHERE: 2, CAPSULE: 3, ELLIPSOID: 4, CYLINDER: 5, BOX: 6, MESH: 7 }

const setPos = (buf, i, v) => v.set(buf[3 * i], buf[3 * i + 2], -buf[3 * i + 1])
const setQuat = (buf, i, q) => q.set(-buf[4 * i + 1], -buf[4 * i + 3], buf[4 * i + 2], -buf[4 * i])

export function buildView(world, { skipFloor = true } = {}) {
  const { model } = world
  const root = new THREE.Group()
  root.name = 'mujoco'
  const bodies = new Map()
  const meshCache = new Map()
  const keyMeshes = new Array(88)
  const keyOfBody = new Map(world.keys.map(k => [k.body, k]))
  const gt = model.geom_type(), gs = model.geom_size(), gb = model.geom_bodyid(), gg = model.geom_group()
  const grgba = model.geom_rgba(), gmat = model.geom_matid(), mrgba = model.mat_rgba()
  const gpos = model.geom_pos(), gquat = model.geom_quat(), gdata = model.geom_dataid()

  for (let g = 0; g < model.ngeom(); g++) {
    if (!(gg[g] < 3)) continue // groups 3+ are collision-only, as in simulate
    const type = gt[g]
    if (type === GEOM.PLANE && skipFloor) continue
    const b = gb[g]
    const size = [gs[3 * g], gs[3 * g + 1], gs[3 * g + 2]]
    let geometry
    switch (type) {
      case GEOM.SPHERE: geometry = new THREE.SphereGeometry(size[0], 20, 14); break
      case GEOM.CAPSULE: geometry = new THREE.CapsuleGeometry(size[0], size[1] * 2, 8, 16); break
      case GEOM.ELLIPSOID: geometry = new THREE.SphereGeometry(1, 20, 14); break
      case GEOM.CYLINDER: geometry = new THREE.CylinderGeometry(size[0], size[0], size[1] * 2, 20); break
      case GEOM.BOX: geometry = new THREE.BoxGeometry(size[0] * 2, size[2] * 2, size[1] * 2); break
      case GEOM.MESH: geometry = meshGeometry(model, gdata[g], meshCache); break
      case GEOM.PLANE: geometry = new THREE.PlaneGeometry(4, 4); break
      default: continue
    }
    let c = [grgba[4 * g], grgba[4 * g + 1], grgba[4 * g + 2], grgba[4 * g + 3]]
    const m = gmat[g]
    if (m >= 0) c = [mrgba[4 * m], mrgba[4 * m + 1], mrgba[4 * m + 2], mrgba[4 * m + 3]]
    const key = keyOfBody.get(b)
    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(c[0], c[1], c[2]).convertSRGBToLinear(),
      transparent: c[3] < 1, opacity: c[3],
      roughness: key ? (key.black ? 0.35 : 0.45) : 0.55, metalness: 0.05,
    })
    const mesh = new THREE.Mesh(geometry, material)
    mesh.castShadow = true
    mesh.receiveShadow = true
    setPos(gpos, g, mesh.position)
    if (type !== GEOM.PLANE) setQuat(gquat, g, mesh.quaternion)
    else mesh.rotateX(-Math.PI / 2)
    if (type === GEOM.ELLIPSOID) mesh.scale.set(size[0], size[2], size[1])
    let group = bodies.get(b)
    if (!group) {
      group = new THREE.Group()
      group.name = world.name(model.name_bodyadr(), b)
      bodies.set(b, group)
      root.add(group)
    }
    group.add(mesh)
    if (key && !keyMeshes[key.k]) {
      keyMeshes[key.k] = mesh
      mesh.userData.base = material.color.clone()
    }
  }

  function sync() {
    const xp = world.sim.xpos(), xq = world.sim.xquat()
    for (const [b, group] of bodies) {
      setPos(xp, b, group.position)
      setQuat(xq, b, group.quaternion)
    }
  }
  sync()

  /** Colour key k: null = its own colour. */
  function tintKey(k, color) {
    const mesh = keyMeshes[k]
    if (!mesh) return
    if (color == null) mesh.material.color.copy(mesh.userData.base)
    else mesh.material.color.set(color)
  }

  function dispose() {
    root.traverse(o => { if (o.isMesh) { o.material.dispose() } })
    for (const g of meshCache.values()) g.dispose()
  }

  return { root, sync, tintKey, dispose }
}

function meshGeometry(model, id, cache) {
  if (cache.has(id)) return cache.get(id)
  const va = model.mesh_vertadr()[id], vn = model.mesh_vertnum()[id]
  const fa = model.mesh_faceadr()[id], fn = model.mesh_facenum()[id]
  const V = model.mesh_vert(), N = model.mesh_normal(), F = model.mesh_face()
  const pos = new Float32Array(vn * 3), nor = new Float32Array(vn * 3)
  for (let v = 0; v < vn; v++) {
    const i = (va + v) * 3
    pos[3 * v] = V[i]; pos[3 * v + 1] = V[i + 2]; pos[3 * v + 2] = -V[i + 1]
    nor[3 * v] = N[i]; nor[3 * v + 1] = N[i + 2]; nor[3 * v + 2] = -N[i + 1]
  }
  const index = new Uint32Array(fn * 3)
  for (let f = 0; f < fn * 3; f++) index[f] = F[fa * 3 + f]
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  geometry.setAttribute('normal', new THREE.BufferAttribute(nor, 3))
  geometry.setIndex(new THREE.BufferAttribute(index, 1))
  cache.set(id, geometry)
  return geometry
}
