// The pianist's own hands (#032's MakeHuman woman, pianist/character.js) on
// another model (pianist/alt-model.js): an anime model's hands are mitten-like,
// the fingers fused, nails painted on, so seen at the keys they look wrong.
//
// Each hand of the MakeHuman body, with a few cm of the forearm, is cut out and
// set on the other model's wrist whole: one rotation (her hand's frame, wrist to
// middle knuckle and index to little knuckle, onto the model's) and one uniform
// scale, HAND_SCALE. Its shape
// and proportions are the MakeHuman hand's own: the anime hand's (a palm 0.61 of
// the length, fingers as long or longer) are not taken, as fitting bone by bone
// to them made a small palm with swollen fingers and pinched joints.
// The model's proxy skeleton (the MakeHuman-named bones the rig drives) is moved
// to the new hand's joints, so the rig reaches the keys with the fingers that are
// drawn. Call it before the rig is made (createRig reads the skeleton's rest pose).
// The model's own hands are folded into the wrist (their bones scaled to nothing).
//
// The MakeHuman fingers are short for its palm: wrist joint to the middle
// knuckle 9.1 cm, knuckle to fingertip 7.5 (0.82 of it). Seen from the back of
// the hand, the middle finger from the web to the tip is 0.78 of the back of the
// hand from the web to the wrist crease, where in photographs of women's hands
// the two are about equal (1.0). Fingers 2-5 are lengthened by FINGER_K (1.25:
// 0.78 → 1.0, measured the same way on pianist/test/handview.html) along their bones,
// as character.js lengthens the thumbs: longer, not thicker.
//
// look: 'toon' (the default) cel-shades them in her face's MToon material,
// coloured as her face's skin, with its ink outline (the page's Ink switch reaches it: the meshes sit in her VRM's scene);
// 'real' keeps #032's skin (texture, pores, sheen).
//
//   await graftPianistHands(alt, { base, look })   // alt: loadAltCharacter(); before createRig(alt)
import * as THREE from 'three'
import { loadCharacter } from './character.js'

const v3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z)
// how far up the forearm the cut goes, from the wrist, cm
const FOREARM_CM = 4
// The hand's size. The VRoid model (scaled to the MakeHuman woman's arm length)
// has a 12.5 cm hand, wrist to the middle fingertip, and a wrist 1.6-2.0 cm in
// radius 2 cm up the arm; the MakeHuman hand is 16.6 cm, its wrist 1.85-2.0 cm.
// At 0.88 the wrist meets hers (1.6-1.75 cm) and the hand is 14.6 cm, a small
// woman's (about the 5th percentile, Greiner 1991), in keeping with her slim arms
// (with FINGER_K the hand is 18.4 cm, 16.2 at this scale: an average woman's is 18)
export const HAND_SCALE = 0.88
export const FINGER_K = 1.25
const HAND_BONES = /^(wrist|metacarpal\d|finger\d-\d)\./

/** The frame of a hand (rotation, columns x y z, at the wrist) and of its forearm, from joints. */
function frames(J, side) {
  const d = '.' + side
  const H = n => J[n + d + '____head']
  const W = H('wrist'), across = H('finger5-1').clone().sub(H('finger2-1'))
  const frame = y => {
    y = y.clone().normalize()
    const x = across.clone().addScaledVector(y, -across.dot(y)).normalize()
    const z = v3().crossVectors(x, y)
    return new THREE.Matrix4().makeBasis(x, y, z)
  }
  return { W, hand: frame(H('finger3-1').clone().sub(W)), forearm: frame(W.clone().sub(H('lowerarm01'))) }
}
/** v ↦ the model's frame at its wrist, from the MakeHuman frame at hers (rotated, scaled by k). */
const mapper = (a, b, key, k = HAND_SCALE) => {
  const R = b[key].clone().multiply(a[key].clone().transpose())
  return v => v.clone().sub(a.W).applyMatrix4(R).multiplyScalar(k).add(b.W)
}
// the proxy bone that carries a MakeHuman bone's vertices
const proxyOf = (name, d) => /^finger\d-\d\./.test(name) ? name : /^(wrist|metacarpal)/.test(name) ? 'wrist' + d : /^lowerarm0[12]\./.test(name) ? name : 'lowerarm01' + d

/** Rebuild a proxy bone's rest from its joints (alt-model.js's rule: x as near the world x as the bone allows). */
function rebuildBone(alt, name) {
  const i = alt.bones.findIndex(b => b.name === name), bone = alt.bones[i]
  const h = alt.joints[name + '____head'], t = alt.joints[name + '____tail']
  const y = t.clone().sub(h); if (y.lengthSq() < 1e-8) y.set(0, 1, 0); y.normalize()
  const x = Math.abs(y.x) > 0.9 ? v3(0, 0, 1) : v3(1, 0, 0)
  x.addScaledVector(y, -x.dot(y)).normalize()
  const W = new THREE.Matrix4().makeBasis(x, y, v3().crossVectors(x, y)).setPosition(h)
  const pi = alt.bones.indexOf(bone.parent)
  const local = pi >= 0 ? alt.restWorld[pi].clone().invert().multiply(W) : W.clone()
  local.decompose(bone.position, bone.quaternion, bone.scale)
  alt.restWorld[i].copy(W)
}

/** Her skin's MToon materials (main and outline), cloned, untextured, coloured as her face.
 *  The face is what the hands are seen against: its material (lit and shade colours,
 *  toony shading, ink) and the median colour of its skin texels (its own mesh is skin
 *  only; the body's skin is authored darker, 0.4 of the face's colour factor, and its
 *  hand texels carry painted nails and creases). */
function toonSkin(alt) {
  const skinOf = rx => { let m = null; alt.model.traverse(o => { if (o.isSkinnedMesh && !m && rx.test([].concat(o.material)[0]?.name || '')) m = o }); return m }
  const face = skinOf(/Face.*SKIN/i) || skinOf(/SKIN/i)
  const mats = face && [].concat(face.material)
  if (!mats?.[0]?.isMToonMaterial) return null
  const g = face.geometry, UV = g.attributes.uv, img = mats[0].map?.image
  let tint = new THREE.Color(1, 1, 1)
  if (img && UV) {
    const N = 256, cv = document.createElement('canvas'); cv.width = cv.height = N
    const cx = cv.getContext('2d', { willReadFrequently: true }); cx.drawImage(img, 0, 0, N, N)
    const px = cx.getImageData(0, 0, N, N).data
    const ch = [[], [], []]
    for (let i = 0; i < UV.count; i++) {
      let u = UV.getX(i) % 1, v = UV.getY(i) % 1; if (u < 0) u++; if (v < 0) v++
      const x = Math.min(N - 1, Math.floor(u * N)), y = Math.min(N - 1, Math.floor((mats[0].map.flipY ? 1 - v : v) * N))
      const k = (y * N + x) * 4
      if (px[k + 3] < 128) continue
      for (let c = 0; c < 3; c++) ch[c].push(px[k + c])
    }
    const med = a => { a.sort((x, y) => x - y); return a[a.length >> 1] / 255 }
    if (ch[0].length) tint = new THREE.Color().setRGB(med(ch[0]), med(ch[1]), med(ch[2]), THREE.SRGBColorSpace)
  }
  return mats.map((m, i) => {
    const c = m.clone()
    c.name = 'PianistHand' + (i ? ' (Outline)' : '')
    for (const k of ['map', 'shadeMultiplyTexture', 'normalMap', 'shadingShiftTexture', 'rimMultiplyTexture', 'outlineWidthMultiplyTexture', 'uvAnimationMaskTexture']) if (c[k]) c[k] = null
    c.color?.multiply(tint)
    c.shadeColorFactor?.multiply(tint)
    c.needsUpdate = true
    return c
  })
}

export async function graftPianistHands(alt, { base = new URL('./assets/', import.meta.url).href, look = 'toon' } = {}) {
  const mh = await loadCharacter(base, { fingers: { 2: FINGER_K, 3: FINGER_K, 4: FINGER_K, 5: FINGER_K } })
  const toon = look === 'toon' ? toonSkin(alt) : null
  const src = mh.meshes.body.geometry, srcBones = mh.bones.map(b => b.name)
  const P = src.attributes.position, UV = src.attributes.uv, SI = src.attributes.skinIndex, SW = src.attributes.skinWeight, IDX = src.index
  const meshes = []
  // the proxy's rest, kept to put back (set(false) needs a page reload: the rig was made on the new one)
  const saved = { joints: Object.fromEntries(Object.entries(alt.joints).map(([k, v]) => [k, v.clone()])) }
  for (const side of ['L', 'R']) {
    const d = '.' + side
    const A = frames(mh.joints, side), B = frames(alt.joints, side)
    const toHand = mapper(A, B, 'hand'), toArm = mapper(A, B, 'forearm')
    const up = v3(0, 1, 0).applyMatrix4(A.forearm)            // along her forearm, toward the hand
    // the vertices: any weight on this hand's bones, or on the forearm within FOREARM_CM of the wrist
    const keep = new Int32Array(P.count).fill(-1), list = [], handW = []
    const p = v3()
    for (let i = 0; i < P.count; i++) {
      let hand = 0, arm = 0
      for (let c = 0; c < 4; c++) {
        const n = srcBones[SI.getComponent(i, c)], w = SW.getComponent(i, c)
        if (!n?.endsWith(d)) continue
        if (HAND_BONES.test(n)) hand += w; else if (/^lowerarm0\d\./.test(n)) arm += w
      }
      p.fromBufferAttribute(P, i)
      const back = -p.clone().sub(A.W).dot(up)
      if (hand > 0.01 || arm > 0.5 && back < FOREARM_CM && back > -3) { keep[i] = list.length; list.push(i); handW.push(Math.min(1, hand)) }
    }
    const n = list.length
    const pos = new Float32Array(n * 3), uv = new Float32Array(n * 2), si = new Uint16Array(n * 4), sw = new Float32Array(n * 4)
    const proxyIndex = new Map(alt.bones.map((b, i) => [b.name, i]))
    list.forEach((i, j) => {
      p.fromBufferAttribute(P, i)
      // the hand rigidly onto hers; the forearm onto her forearm, blended across the wrist by the hand's weight
      toArm(p).lerp(toHand(p), handW[j]).toArray(pos, j * 3)
      uv[j * 2] = UV.getX(i); uv[j * 2 + 1] = UV.getY(i)
      const ws = new Map()
      for (let c = 0; c < 4; c++) {
        const w = SW.getComponent(i, c); if (!w) continue
        const name = srcBones[SI.getComponent(i, c)]
        const pb = proxyIndex.get(name?.endsWith(d) ? proxyOf(name, d) : 'lowerarm01' + d)
        ws.set(pb, (ws.get(pb) || 0) + w)
      }
      const top = [...ws].sort((x, y) => y[1] - x[1]).slice(0, 4), sum = top.reduce((a, x) => a + x[1], 0)
      top.forEach(([b, w], c) => { si[j * 4 + c] = b; sw[j * 4 + c] = w / sum })
    })
    const tri = []
    for (let t = 0; t < IDX.count; t += 3) {
      const a = keep[IDX.getX(t)], b = keep[IDX.getX(t + 1)], c = keep[IDX.getX(t + 2)]
      if (a >= 0 && b >= 0 && c >= 0) tri.push(a, b, c)
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
    g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4))
    g.setAttribute('skinWeight', new THREE.BufferAttribute(sw, 4))
    g.setIndex(tri)
    g.computeVertexNormals()
    // the proxy's wrist and fingers onto the new hand's joints
    const J = alt.joints, MJ = mh.joints
    J['wrist' + d + '____tail'] = toHand(MJ['finger3-1' + d + '____head'])
    for (let f = 1; f <= 5; f++) for (let k = 1; k <= 3; k++) {
      const nm = `finger${f}-${k}${d}`
      J[nm + '____head'] = toHand(MJ[nm + '____head']); J[nm + '____tail'] = toHand(MJ[nm + '____tail'])
    }
    rebuildBone(alt, 'wrist' + d)
    for (let f = 1; f <= 5; f++) for (let k = 1; k <= 3; k++) rebuildBone(alt, `finger${f}-${k}${d}`)
    if (toon) for (let i = 0; i < toon.length; i++) g.addGroup(0, tri.length, i)
    const mesh = new THREE.SkinnedMesh(g, toon ? (toon.length > 1 ? toon : toon[0]) : mh.materials.skin)
    mesh.name = 'pianist-hand' + d
    mesh.castShadow = mesh.receiveShadow = true
    mesh.frustumCulled = false
    meshes.push({ mesh, geometry: g })
  }
  alt.group.updateMatrixWorld(true)
  // (in her VRM's scene with toon skin, so the page's ink switch reaches the outline:
  // a skinned mesh draws where its bones are, whatever its parent)
  const home = toon && alt.vrm ? alt.vrm.scene : alt.group
  for (const { mesh } of meshes) {
    home.add(mesh)
    // bound at the proxy's (new) rest: alt.restWorld, in the group's frame
    mesh.bind(new THREE.Skeleton(alt.bones, alt.restWorld.map(m => m.clone().invert())), new THREE.Matrix4())
  }
  // the model's own hands: folded into the wrist
  for (const b of ['leftHand', 'rightHand'].map(k => alt.humanoid[k]).filter(Boolean)) { b.scale.setScalar(0.02); b.updateMatrixWorld(true) }
  return { meshes: meshes.map(m => m.mesh), material: toon || mh.materials.skin, look: toon ? 'toon' : 'real', saved }
}
