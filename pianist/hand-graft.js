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

// The seam at the wrist, seen on bare forearms (pixiv's twist sample). Her own hand is
// folded away (its bones scaled to nothing), which left her forearm ending in a stump at
// the wrist, a little wider than the new hand's forearm (2.0 cm in radius against its
// 1.9): her arm's ink ran round the wrist where her stump stood out of it, and the
// MakeHuman forearm cut out with the hand (FOREARM_CM of it) ended in an edge of its own.
// The two arms are made to hand over smoothly, each end inside the other:
//  • the new hand's forearm is shaped to hers, angle by angle round the arm: from inside
//    hers at its cut end (CUT_IN cm in, its ink with it), out to OVER cm outside hers by
//    OVER_AT cm from the wrist, and into the hand's own wrist over the last WRIST_CM;
//  • her own forearm's skin (its SKIN materials: a sleeve keeps its cuff) is drawn in
//    toward the arm's axis from OVER_AT cm to the wrist, to TAPER of its width, so her
//    stump and its ink end inside the new hand's forearm; her skin over the last
//    FOLD_SKIN_CM folds away with her hand, and her folded hand sits FOLD_CM up inside
//    her forearm, not at the wrist.
// Only the drawn meshes change: the joints, and so the rig and the fingering, are as before.
const FOLD_CM = 2, FOLD_SKIN_CM = 1.4, OVER_AT = 2.4, WRIST_CM = 2.4, CUT_IN = 0.3, OVER = 0.15, TAPER = 0.6
const BINS = 24
const smooth01 = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t) }
/** The arm's frame at the wrist: its axis toward the hand, and two directions across it. */
function armFrame(alt, d) {
  const W = alt.joints['wrist' + d + '____head'], E = alt.joints['lowerarm01' + d + '____head']
  if (!W || !E) return null
  const dir = W.clone().sub(E).normalize(), x = v3(1, 0, 0)
  if (Math.abs(x.dot(dir)) > 0.9) x.set(0, 0, 1)
  x.addScaledVector(dir, -x.dot(dir)).normalize()
  const y = v3().crossVectors(dir, x)
  const q = v3()
  /** a point's distance up the arm from the wrist (back), its radius and its angle bin; q: its radial vector */
  const at = p => { q.subVectors(p, W); const back = -q.dot(dir); q.addScaledVector(dir, back); const r = q.length()
    return { back, r, bin: Math.floor((Math.atan2(q.dot(y), q.dot(x)) / (2 * Math.PI) + 0.5) * BINS) % BINS } }
  return { W, dir, at, q }
}
/** Her forearm's radius at each angle round the arm, from OVER_AT to FOREARM_CM cm up from the
 *  wrist: the outermost of her visible meshes there (skin or a sleeve); gaps from their neighbours. */
function forearmRadii(alt, F) {
  const bins = new Float32Array(BINS), v = v3()
  alt.group.updateMatrixWorld(true)
  alt.model.traverse(o => {
    if (!o.isSkinnedMesh || /HAIR|EYE|FACE/i.test([].concat(o.material)[0]?.name || '')) return
    for (let a = o; a; a = a.parent) if (!a.visible) return
    o.skeleton.update()
    const P = o.geometry.attributes.position
    for (let i = 0; i < P.count; i++) {
      o.getVertexPosition(i, v); alt.group.worldToLocal(v.applyMatrix4(o.matrixWorld))
      const { back, r, bin } = F.at(v)
      if (back < OVER_AT || back > FOREARM_CM + 0.5 || r > 5) continue
      if (r > bins[bin]) bins[bin] = r
    }
  })
  const got = [...bins].filter(r => r > 0.3)
  if (got.length < BINS / 2) return null
  for (let k = 0; k < BINS; k++) if (!(bins[k] > 0.3)) {
    let a = 1; while (!(bins[(k - a + BINS) % BINS] > 0.3)) a++
    let b = 1; while (!(bins[(k + b) % BINS] > 0.3)) b++
    bins[k] = (bins[(k - a + BINS) % BINS] * b + bins[(k + b) % BINS] * a) / (a + b)
  }
  return bins
}
/** The new hand's forearm onto hers (pos: its vertices, in the group's frame; handW: their hand weights). */
function fitStub(alt, d, pos, handW) {
  const F = armFrame(alt, d); if (!F) return null
  const her = forearmRadii(alt, F); if (!her) return null
  const p = v3()
  for (let j = 0; j < handW.length; j++) {
    const { back, r, bin } = F.at(p.fromArray(pos, j * 3))
    if (back <= 0 || r < 1e-6) continue
    const outside = her[bin] + OVER, inside = her[bin] - CUT_IN - 0.14
    // the radius it takes: its own at the wrist, outside hers from OVER_AT, inside hers at its cut
    const target = r + (outside - r) * smooth01(0, WRIST_CM, back) + (inside - outside) * smooth01(OVER_AT, FOREARM_CM, back)
    const s = 1 + (target / r - 1) * (1 - handW[j])
    p.sub(F.q).addScaledVector(F.q, s).toArray(pos, j * 3)
  }
  return her
}
/** Her forearm's skin drawn in toward the arm's axis near the wrist (see above), in its bind shape. */
function taperForearm(alt, d, backs = new Map()) {
  const F = armFrame(alt, d); if (!F) return
  const v = v3(), inv = new THREE.Matrix4()
  alt.group.updateMatrixWorld(true)
  alt.model.traverse(o => {
    const name = [].concat(o.material)[0]?.name || ''
    if (!o.isSkinnedMesh || !/SKIN/i.test(name) || /Face/i.test(name)) return
    o.skeleton.update()
    const P = o.geometry.attributes.position
    // mesh-local -> the group's frame and back (at rest the skinned shape is the bind shape)
    const toG = alt.group.matrixWorld.clone().invert().multiply(o.matrixWorld)
    inv.copy(toG).invert()
    // her folded hand's bone: the skin nearest the wrist is given to it whole, so it folds
    // away with the hand (into the arm, on its axis) rather than ending in a stump there
    const hb = o.skeleton.bones.indexOf(alt.humanoid[d === '.L' ? 'leftHand' : 'rightHand'])
    const SI = o.geometry.attributes.skinIndex, SW = o.geometry.attributes.skinWeight
    let n = 0
    const B = backs.get(o) || backs.set(o, new Float32Array(P.count).fill(99)).get(o)
    for (let i = 0; i < P.count; i++) {
      o.getVertexPosition(i, v).applyMatrix4(toG)
      const { back, r } = F.at(v)
      if (r < 4 && back > -6) B[i] = Math.min(B[i], back)
      if (back < -1 || back > OVER_AT || r > 4) continue
      if (hb >= 0 && back < FOLD_SKIN_CM) { SI.setXYZW(i, hb, 0, 0, 0); SW.setXYZW(i, 1, 0, 0, 0) }
      const k = 1 - (1 - TAPER) * smooth01(OVER_AT, OVER_AT - 1.2, back)
      const pOld = v.clone().applyMatrix4(inv), pNew = v.addScaledVector(F.q, k - 1).applyMatrix4(inv)
      P.setXYZ(i, P.getX(i) + pNew.x - pOld.x, P.getY(i) + pNew.y - pOld.y, P.getZ(i) + pNew.z - pOld.z)
      n++
    }
    if (n) { P.needsUpdate = SI.needsUpdate = SW.needsUpdate = true; o.geometry.computeBoundingSphere() }
  })
}

/**
 * Her forearm's ink taken off near the wrist, where her arm goes in under the new hand's
 * forearm: in the render her folded stump still stood out of it in places (the constraint
 * twist bones of pixiv's sample turn her forearm's skin another way from the new hand's),
 * and its outline drew the ring. The MToon outline's width is multiplied by a texture of
 * her mesh's UVs (outlineWidthMultiplyTexture, its green), painted here per triangle from
 * its distance up the arm: none below INK_FROM cm, all of it from INK_TO.
 */
const INK_FROM = 0.6, INK_TO = FOREARM_CM - 0.4, INK_TEX = 1024
function unInkWrists(backs) {
  for (const [o, B] of backs) {
    const mats = [].concat(o.material), ol = mats.find(m => m.isOutline)
    const UV = o.geometry.attributes.uv, IDX = o.geometry.index
    if (!ol || !UV || !IDX || ol.outlineWidthMultiplyTexture) continue
    const cv = document.createElement('canvas'); cv.width = cv.height = INK_TEX
    const cx = cv.getContext('2d')
    cx.fillStyle = '#fff'; cx.fillRect(0, 0, INK_TEX, INK_TEX)
    let painted = 0
    for (let t = 0; t < IDX.count; t += 3) {
      const ids = [IDX.getX(t), IDX.getX(t + 1), IDX.getX(t + 2)]
      const back = (B[ids[0]] + B[ids[1]] + B[ids[2]]) / 3
      if (!(back < INK_TO)) continue
      const g = Math.round(255 * smooth01(INK_FROM, INK_TO, back))
      cx.fillStyle = `rgb(${g},${g},${g})`; cx.strokeStyle = cx.fillStyle; cx.lineWidth = 1.5
      cx.beginPath()
      ids.forEach((i, k) => { const x = UV.getX(i) * INK_TEX, y = UV.getY(i) * INK_TEX; k ? cx.lineTo(x, y) : cx.moveTo(x, y) })
      cx.closePath(); cx.fill(); cx.stroke(); painted++
    }
    if (!painted) continue
    const tex = new THREE.CanvasTexture(cv)
    tex.flipY = false; tex.colorSpace = THREE.NoColorSpace
    ol.outlineWidthMultiplyTexture = tex
    ol.needsUpdate = true
  }
}

// The forearm follows her arm, not the proxy's. Her forearm's skin turns with its own
// twist bones (pixiv's twist sample: J_Roll and constraint bones), the proxy's lower arm
// doesn't, so a forearm skinned to the proxy turned another way from hers: with the hand
// turned in, the two arms parted in a ring and a notch at the wrist, which read as a
// robot's joint. Each vertex of the new hand's forearm takes the skin weights and the
// normal of the nearest vertex of her forearm (at rest, before taperForearm), blended in
// from the wrist over SKIN_FROM..SKIN_TO cm, and its shape lies on hers (SKIN_GAP outside),
// so the two meet at the cut with the same surface, the same shading and the same turn.
const SKIN_FROM = 0.3, SKIN_TO = 2.2, SKIN_GAP = 0.05, SKIN_SIGMA = 0.8, SKIN_REACH = 2.4
/** Her forearm near the wrist: each skin vertex's place and normal (group frame) and its
 *  weights on her own bones, her hand and the bones under it left out. */
function forearmSkin(alt, d) {
  const F = armFrame(alt, d); if (!F) return null
  const handBone = alt.humanoid[d === '.L' ? 'leftHand' : 'rightHand']
  const under = b => { for (let x = b; x; x = x.parent) if (x === handBone) return true; return false }
  const pts = [], v = v3(), w = v3(), n = v3()
  alt.group.updateMatrixWorld(true)
  alt.model.traverse(o => {
    const name = [].concat(o.material)[0]?.name || ''
    if (!o.isSkinnedMesh || !/SKIN/i.test(name) || /Face/i.test(name)) return
    o.skeleton.update()
    const P = o.geometry.attributes.position, N = o.geometry.attributes.normal, SI = o.geometry.attributes.skinIndex, SW = o.geometry.attributes.skinWeight
    if (!N || !SI) return
    const toG = alt.group.matrixWorld.clone().invert().multiply(o.matrixWorld)
    for (let i = 0; i < P.count; i++) {
      o.getVertexPosition(i, v).applyMatrix4(toG)
      const { back, r } = F.at(v)
      if (back < -0.5 || back > FOREARM_CM + 2 || r > 4) continue
      const ws = []
      for (let c = 0; c < 4; c++) { const x = SW.getComponent(i, c), b = o.skeleton.bones[SI.getComponent(i, c)]; if (x > 0 && b && !under(b)) ws.push([b, x]) }
      const sum = ws.reduce((a, x) => a + x[1], 0); if (sum < 0.5) continue
      // the skinned normal: a point a little off the bind position, through the same bones
      w.fromBufferAttribute(P, i).addScaledVector(n.fromBufferAttribute(N, i), 0.5)
      o.applyBoneTransform(i, w); w.applyMatrix4(toG).sub(v).normalize()
      pts.push({ p: v.clone(), n: w.clone(), ws: ws.map(([b, x]) => [b, x / sum]) })
    }
  })
  return pts.length >= 20 ? { F, pts } : null
}
/** The new hand's forearm vertices onto her forearm's skin: weights (onto `extra`, her bones
 *  added after the proxy's), normals, and the shape a hair outside hers. */
function followForearm(alt, skin, pos, nrm, si, sw, handW, extra) {
  const { F, pts } = skin, p = v3(), m = v3()
  const nb = alt.bones.length
  const indexOf = b => { let k = extra.list.indexOf(b); if (k < 0) { k = extra.list.push(b) - 1; extra.rest.push(alt.group.matrixWorld.clone().invert().multiply(b.matrixWorld)) } return nb + k }
  for (let j = 0; j < handW.length; j++) {
    p.fromArray(pos, j * 3)
    const { back } = F.at(p)
    // the shape and the shading come over SKIN_FROM..SKIN_TO; the weights all the way down
    // to the hand, so no stretch of the stub takes up the turn between her twist and the proxy's
    const t = smooth01(SKIN_FROM, SKIN_TO, back) * (1 - handW[j]), tw = 1 - handW[j]
    if (tw <= 0) continue
    // her nearby vertices, blended smoothly (a Gaussian of distance): the nearest alone
    // would give the weights in cells, which tore the forearm apart where her twist turned it
    const near = []
    for (const q of pts) { const d2 = q.p.distanceToSquared(p); if (d2 < SKIN_REACH * SKIN_REACH) near.push([q, d2]) }
    if (!near.length) { let bd = Infinity, b = null; for (const q of pts) { const d2 = q.p.distanceToSquared(p); if (d2 < bd) { bd = d2; b = q } } near.push([b, 0]) }
    let tot = 0; const n0 = v3(), off0 = { v: 0 }, wsH = new Map()
    for (const [q, d2] of near) {
      const k = Math.exp(-d2 / (2 * SKIN_SIGMA * SKIN_SIGMA)) + 1e-9; tot += k
      n0.addScaledVector(q.n, k); off0.v += k * p.clone().sub(q.p).dot(q.n)
      for (const [b, x] of q.ws) wsH.set(b, (wsH.get(b) || 0) + x * k)
    }
    n0.normalize(); const off = off0.v / tot
    // the shape: onto her surface along her normal there, SKIN_GAP outside
    p.addScaledVector(n0, t * (SKIN_GAP - off)).toArray(pos, j * 3)
    // the normal
    m.fromArray(nrm, j * 3).lerp(n0, t).normalize().toArray(nrm, j * 3)
    // the weights: the hand's (the proxy's), and hers by t
    const ws = new Map()
    for (let c = 0; c < 4; c++) if (sw[j * 4 + c] > 0) ws.set(si[j * 4 + c], (ws.get(si[j * 4 + c]) || 0) + sw[j * 4 + c] * (1 - tw))
    for (const [b, x] of wsH) { const k = indexOf(b); ws.set(k, (ws.get(k) || 0) + x / tot * tw) }
    const top = [...ws].sort((a, b) => b[1] - a[1]).slice(0, 4), sum = top.reduce((a, x) => a + x[1], 0)
    for (let c = 0; c < 4; c++) { si[j * 4 + c] = top[c]?.[0] ?? 0; sw[j * 4 + c] = top[c] ? top[c][1] / sum : 0 }
  }
}
/** The new hand's forearm ink faded out toward its cut, as hers fades in (unInkWrists),
 *  so the arm's outline runs on across the join: a texture of the hand's UVs. */
function fadeStubInk(toon, geoms) {
  const ol = toon?.find(m => m.isOutline); if (!ol) return
  const cv = document.createElement('canvas'); cv.width = cv.height = INK_TEX
  const cx = cv.getContext('2d'); cx.fillStyle = '#fff'; cx.fillRect(0, 0, INK_TEX, INK_TEX)
  for (const { g, backs, handW } of geoms) {
    const UV = g.attributes.uv, IDX = g.index
    for (let t = 0; t < IDX.count; t += 3) {
      const ids = [IDX.getX(t), IDX.getX(t + 1), IDX.getX(t + 2)]
      if (ids.some(i => handW[i] > 0.5)) continue
      const back = (backs[ids[0]] + backs[ids[1]] + backs[ids[2]]) / 3
      if (!(back > INK_FROM)) continue
      const k = Math.round(255 * (1 - smooth01(INK_FROM, INK_TO, back)))
      cx.fillStyle = cx.strokeStyle = `rgb(${k},${k},${k})`; cx.lineWidth = 1.5
      cx.beginPath(); ids.forEach((i, c) => { const x = UV.getX(i) * INK_TEX, y = UV.getY(i) * INK_TEX; c ? cx.lineTo(x, y) : cx.moveTo(x, y) }); cx.closePath(); cx.fill(); cx.stroke()
    }
  }
  const tex = new THREE.CanvasTexture(cv); tex.flipY = false; tex.colorSpace = THREE.NoColorSpace
  ol.outlineWidthMultiplyTexture = tex; ol.needsUpdate = true
}

/** Her skin's MToon materials (main and outline), cloned, untextured, coloured as her
 *  forearm, where the hand joins her: the body's skin material (lit and shade colours,
 *  toony shading, ink) and the median colour of its forearm texels (its hand texels carry
 *  painted nails and creases, so the forearm's are read). Coloured as her face, which was
 *  the rule before, the hand met her arm at a visible edge: the body's skin is authored
 *  with another colour factor and texture than the face's. A model without forearm skin
 *  (vertices held by a lower arm bone), or whose forearm skin reads much darker than
 *  its face (painted for under a sleeve), falls back to the face. */
function toonSkin(alt) {
  const skinOf = rx => { let m = null; alt.model.traverse(o => { if (o.isSkinnedMesh && !m && rx.test([].concat(o.material)[0]?.name || '')) m = o }); return m }
  // her forearm, where the hand joins her: its material, and the colour of its skin texels
  // (the face's, all of them, where the model has no forearm skin to read)
  const body = skinOf(/Body.*SKIN/i), face = skinOf(/Face.*SKIN/i) || skinOf(/SKIN/i)
  const forearm = o => {
    const SI = o?.geometry.attributes.skinIndex, SW = o?.geometry.attributes.skinWeight
    if (!SI || !SW) return null
    const ok = o.skeleton.bones.map(b => /LowerArm|Elbow/i.test(b.name) && !/Hand/i.test(b.name)), out = []
    for (let i = 0; i < SI.count; i++) { let b = 0, w = -1; for (let c = 0; c < 4; c++) { const x = SW.getComponent(i, c); if (x > w) { w = x; b = SI.getComponent(i, c) } } if (ok[b]) out.push(i) }
    return out.length >= 20 ? out : null
  }
  const arm = body && [].concat(body.material)[0]?.isMToonMaterial ? forearm(body) : null
  // the material and its skin's median colour, from a mesh (its vertices `only`, else all)
  const sample = (mesh, only) => {
    const mats = mesh && [].concat(mesh.material)
    if (!mats?.[0]?.isMToonMaterial) return null
    const g = mesh.geometry, UV = g.attributes.uv, img = mats[0].map?.image
    let tint = new THREE.Color(1, 1, 1)
    if (img && UV) {
      const N = 256, cv = document.createElement('canvas'); cv.width = cv.height = N
      const cx = cv.getContext('2d', { willReadFrequently: true }); cx.drawImage(img, 0, 0, N, N)
      const px = cx.getImageData(0, 0, N, N).data
      const ch = [[], [], []]
      for (const i of only ?? Array.from({ length: UV.count }, (_, i) => i)) {
        let u = UV.getX(i) % 1, v = UV.getY(i) % 1; if (u < 0) u++; if (v < 0) v++
        const x = Math.min(N - 1, Math.floor(u * N)), y = Math.min(N - 1, Math.floor((mats[0].map.flipY ? 1 - v : v) * N))
        const k = (y * N + x) * 4
        if (px[k + 3] < 128) continue
        for (let c = 0; c < 3; c++) ch[c].push(px[k + c])
      }
      const med = a => { a.sort((x, y) => x - y); return a[a.length >> 1] / 255 }
      if (ch[0].length) tint = new THREE.Color().setRGB(med(ch[0]), med(ch[1]), med(ch[2]), THREE.SRGBColorSpace)
    }
    const lit = mats[0].color.clone().multiply(tint)
    return { mats, tint, lum: 0.2126 * lit.r + 0.7152 * lit.g + 0.0722 * lit.b }
  }
  const fromFace = sample(face), fromArm = arm ? sample(body, arm) : null
  // (a forearm kept under long sleeves can be painted darker, or not at all: AvatarSample_A's
  // read a deep brown. Her face's colour then, as before)
  const pick = fromArm && (!fromFace || fromArm.lum >= 0.75 * fromFace.lum) ? fromArm : fromFace
  if (!pick) return null
  const { mats, tint } = pick
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
  // (the realistic skin drawn on both sides: the forearm's cut end, inside her arm, is open,
  // and seen past her arm's edge its inside showed as a dark band round the wrist; the
  // toon skin's outline pass draws its back faces already)
  const realSkin = toon ? null : Object.assign(mh.materials.skin.clone(), { side: THREE.DoubleSide })
  if (realSkin) { realSkin.onBeforeCompile = mh.materials.skin.onBeforeCompile; realSkin.customProgramCacheKey = mh.materials.skin.customProgramCacheKey }
  const src = mh.meshes.body.geometry, srcBones = mh.bones.map(b => b.name)
  const P = src.attributes.position, UV = src.attributes.uv, SI = src.attributes.skinIndex, SW = src.attributes.skinWeight, IDX = src.index
  const meshes = []
  // the proxy's rest, kept to put back (set(false) needs a page reload: the rig was made on the new one)
  const saved = { joints: Object.fromEntries(Object.entries(alt.joints).map(([k, v]) => [k, v.clone()])) }
  const backs = new Map(), extra = { list: [], rest: [] }, stubs = []
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
    const skin = forearmSkin(alt, d)   // (before taperForearm changes her)
    if (!skin) fitStub(alt, d, pos, handW)
    taperForearm(alt, d, backs)
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
    if (skin) {
      // (the geometry's own arrays: Uint16BufferAttribute copies si)
      const A = g.attributes
      followForearm(alt, skin, A.position.array, A.normal.array, A.skinIndex.array, A.skinWeight.array, handW, extra)
      A.position.needsUpdate = A.normal.needsUpdate = A.skinIndex.needsUpdate = A.skinWeight.needsUpdate = true
      const F = skin.F, q = v3()
      stubs.push({ g, handW, backs: Float32Array.from({ length: n }, (_, j) => F.at(q.fromArray(pos, j * 3)).back) })
    }
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
    const mesh = new THREE.SkinnedMesh(g, toon ? (toon.length > 1 ? toon : toon[0]) : realSkin)
    mesh.name = 'pianist-hand' + d
    mesh.castShadow = mesh.receiveShadow = true
    mesh.frustumCulled = false
    meshes.push({ mesh, geometry: g })
  }
  unInkWrists(backs)
  fadeStubInk(toon, stubs)
  alt.group.updateMatrixWorld(true)
  // (in her VRM's scene with toon skin, so the page's ink switch reaches the outline:
  // a skinned mesh draws where its bones are, whatever its parent)
  const home = toon && alt.vrm ? alt.vrm.scene : alt.group
  for (const { mesh } of meshes) {
    home.add(mesh)
    // bound at the proxy's (new) rest: alt.restWorld, in the group's frame
    // (and her own forearm bones, which its forearm follows: followForearm)
    mesh.bind(new THREE.Skeleton([...alt.bones, ...extra.list], [...alt.restWorld, ...extra.rest].map(m => m.clone().invert())), new THREE.Matrix4())
  }
  // the model's own hands: folded into the wrist
  // (FOLD_CM up her forearm: a fixed place in her lower arm's frame, which the rig turns)
  for (const b of ['leftHand', 'rightHand'].map(k => alt.humanoid[k]).filter(Boolean)) {
    const par = b.parent, h = b.getWorldPosition(v3()), e = par.getWorldPosition(v3())
    const g = alt.group.getWorldScale(v3()).x, len = h.distanceTo(e)
    if (len > 1e-6) b.position.copy(par.worldToLocal(h.lerp(e, Math.min(0.5, FOLD_CM * g / len))))
    b.scale.setScalar(0.02); b.updateMatrixWorld(true)
  }
  return { meshes: meshes.map(m => m.mesh), material: toon || realSkin, look: toon ? 'toon' : 'real', saved }
}
