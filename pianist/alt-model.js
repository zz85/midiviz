// Other character models for the #032 pianist (?model=…): any rigged glTF or
// VRM humanoid, played by the same rig as the MakeHuman character.
//
// rig.js is written against MakeHuman's skeleton (bone names, five spine
// bones, split upper and lower arms…). Rather than teach it every rig, this
// builds a *proxy* skeleton with MakeHuman's names whose joints sit on the
// model's own joints, scaled and turned into the piano's frame. The rig poses
// the proxy; every frame each of the model's bones takes the world rotation of
// its proxy bone (times the constant rest offset between the two), so the
// fingertips land where the rig put them. Bones without a proxy (hair, skirt,
// twist and face bones) keep their rest pose, or whatever the model's own
// systems do with them (VRM spring bones and constraints run after).
//
// The model: a humanoid map { hips, spine, chest, upperChest?, neck, head,
// leftEye?, leftShoulder?, leftUpperArm, leftLowerArm, leftHand, leftThumb
// Metacarpal / Proximal / Distal, leftIndex/Middle/Ring/Little Proximal /
// Intermediate / Distal, leftUpperLeg, leftLowerLeg, leftFoot, leftToes,
// and right… } of THREE.Bones, from VRM's humanoid or from bone names.

import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { subdivide } from './subdivide.js'

const v3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z)

export const MODELS = {
  quaternius: {
    label: 'Quaternius · Formal (CC0)', url: 'models/quaternius-formal.gltf', kind: 'gltf',
    credit: 'Ultimate Modular Women by Quaternius, CC0 — quaternius.com',
    // her A-line skirt is skinned rigidly to the thighs, so seated its front
    // stands up off the lap: drape it (see drapeSkirt)
    drape: { material: /LimeGreen/, under: /Legs/ },
    smooth: 1,   // low poly: one level of subdivision by default (?smooth=0 for the original facets)
  },
  vrm: {
    label: 'VRM · pixiv sample (VRM PL 1.0)', url: 'models/vrm1-constraint-twist-sample.vrm', kind: 'vrm',
    credit: 'VRM1_Constraint_Twist_Sample, © pixiv Inc., VRM Public License 1.0',
  },
  vroida: {
    label: 'VRoid · AvatarSample_A (pixiv)', url: 'models/vroid-avatarsample-a.vrm', kind: 'vrm',
    // her MToon is authored darker than pixiv's twist sample (skin shade = lit
    // colour, soft 0.05 toony), so she takes less of the stage dimming
    gain: 0.6,
    // a concert dress in place of her cardigan and shorts (?vdress=, see DRESS_COLORS)
    dress: { url: 'models/vroid-a-dress', hide: /Tops|Bottoms/ },
    drape: { material: /VRoidDress/, under: /./, push: true },
    credit: 'VRoid AvatarSample_A, © pixiv Inc. (VRoid Project); free to use, alter and redistribute under pixiv\'s AvatarSample terms',
  },
}

// ?vdress= colours for a model's concert dress (the dress texture is white,
// shaded in blue-grey, so a colour tints it); 'off' keeps the model's own clothes
export const DRESS_COLORS = { wine: 0x8a1c2c, black: 0x2a2a30, navy: 0x1f2c5c, emerald: 0x15563f, rose: 0xd88a9a, white: 0xffffff }
export const DRESS_DEFAULT = 'wine'

/**
 * A dress built by pianist/build/build-vroid-dress.mjs (geometry in the
 * model's bind space, weights by bone name), skinned to the model's own
 * skeleton, with MToon materials cloned from the model's top and tinted.
 */
async function addDress(model, spec, base, colorKey) {
  const D = await (await fetch(base + spec.url + '.json')).json()
  const tex = await new THREE.TextureLoader().loadAsync(base + spec.url + '.webp')
  tex.colorSpace = THREE.SRGBColorSpace; tex.flipY = false
  let body = null, top = null
  const hidden = []
  model.traverse(o => {
    if (!o.isSkinnedMesh) return
    const name = [].concat(o.material)[0].name
    if (/Body_00_SKIN/.test(name) && !body) body = o
    if (spec.hide.test(name)) { if (/Tops/.test(name) && !top) top = o; hidden.push(o) }
  })
  if (!body || !top) throw new Error('dress: no body or top mesh')
  const inv = new Map(body.skeleton.bones.map((b, i) => [b.name, body.skeleton.boneInverses[i]]))
  const byName = new Map(); model.traverse(o => { if (o.isBone) byName.set(o.name, o) })
  const bones = D.bones.map(n => byName.get(n))
  if (bones.some(b => !b)) throw new Error('dress: missing bones ' + D.bones.filter(n => !byName.get(n)))
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(D.position, 3))
  g.setAttribute('normal', new THREE.Float32BufferAttribute(D.normal, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(D.uv, 2))
  g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(D.skinIndex, 4))
  g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(D.skinWeight, 4))
  g.setIndex(D.index)
  const color = new THREE.Color(DRESS_COLORS[colorKey] ?? DRESS_COLORS[DRESS_DEFAULT])
  const mats = [].concat(top.material).map((m, i) => {
    const c = m.clone()
    c.name = 'VRoidDress' + (i ? ' (Outline)' : '')
    if (c.map !== undefined) c.map = tex
    if (c.shadeMultiplyTexture !== undefined) c.shadeMultiplyTexture = tex
    if (c.normalMap) c.normalMap = null
    // the texture is near white: the lit colour as chosen, the shade deeper
    // (a white dress keeps the texture's own blue-grey folds)
    c.color?.copy(color).multiplyScalar(0.85)
    c.shadeColorFactor?.copy(color).multiplyScalar(0.5)
    if ('shadingToonyFactor' in c && D.mtoon.shadingToony != null) { c.shadingToonyFactor = D.mtoon.shadingToony; c.shadingShiftFactor = D.mtoon.shadingShift }
    c.needsUpdate = true
    return c
  })
  for (let i = 0; i < mats.length; i++) g.addGroup(0, D.index.length, i)
  const mesh = new THREE.SkinnedMesh(g, mats.length > 1 ? mats : mats[0])
  mesh.name = 'concert-dress'
  mesh.bind(new THREE.Skeleton(bones, D.bones.map(n => inv.get(n) || new THREE.Matrix4())), body.bindMatrix)
  body.parent.add(mesh)
  for (const o of hidden) o.visible = false
  return mesh
}

// MakeHuman reference proportions (the build's 165 cm woman), for the scale
const MH_LEG = 78.9   // hip joint → ankle, cm
const MH_ARM = 43.7   // shoulder joint → wrist, cm
const MTOON_GAIN = 0.42

const FINGER = { 1: 'Thumb', 2: 'Index', 3: 'Middle', 4: 'Ring', 5: 'Little' }
const PHAL = { 1: ['Metacarpal', 'Proximal', 'Distal'], 2: ['Proximal', 'Intermediate', 'Distal'] }
const phal = f => PHAL[f === 1 ? 1 : 2]

// ── Humanoid from bone names (glTF without VRM) ──────────────────────────
// Covers Mixamo (mixamorig:LeftHandIndex1), Blender / Rigify-style
// (UpperArm.L, upper_arm.L), Quaternius (Index1.L, Thumb1.L) and UE-style
// (upperarm_l) names. Matched on a normalised name: lower case, no
// separators, the side moved to the front as "l"/"r".
function norm(name) {
  let n = name.replace(/^mixamorig\d*[:_]?/i, '').replace(/^(def|org|mch)[-_.]/i, '')
  let side = ''
  const m = n.match(/^(left|right)(?=[A-Z_.\- ]|$)/i) || n.match(/^(left|right)/i)
  if (m) { side = m[1][0].toLowerCase(); n = n.slice(m[1].length) }
  else {
    const t = n.match(/[._\- ]([LRlr])$|[._\- ](left|right)$/i) || n.match(/([LR])$/)
    if (t) { side = (t[1] || t[2])[0].toLowerCase(); n = n.slice(0, n.length - t[0].length) }
  }
  return side + ':' + n.toLowerCase().replace(/[^a-z0-9]/g, '')
}
const NAME_RULES = {
  hips: [/^:hips?$/, /^:pelvis$/, /^:root$/],   // (a Root bone is usually the armature's, at the floor)
  spine: [/^:(spine|spine0?1|abdomen|waist|lowerback)$/],
  chest: [/^:(chest|spine0?2|torso)$/],
  upperChest: [/^:(upperchest|spine0?3|chest2)$/],
  neck: [/^:(neck|neck0?1)$/],
  head: [/^:head$/],
  Eye: [/^[lr]:eye$/],
  Shoulder: [/^[lr]:(shoulder|clavicle|collar(bone)?)$/],
  UpperArm: [/^[lr]:(upperarm|arm|uparm)$/],
  LowerArm: [/^[lr]:(lowerarm|forearm|elbow)$/],
  Hand: [/^[lr]:(hand|wrist)$/],
  UpperLeg: [/^[lr]:(upperleg|upleg|thigh)$/],
  LowerLeg: [/^[lr]:(lowerleg|leg|shin|calf|knee)$/],
  Foot: [/^[lr]:(foot|ankle)$/],
  Toes: [/^[lr]:(toes?|toebase|ball)$/],
}
const FINGER_RX = { 1: 'thumb', 2: 'index', 3: 'middle', 4: 'ring', 5: '(little|pinky)' }
function humanoidFromNames(root) {
  const bones = []
  root.traverse(o => { if (o.isBone) bones.push(o) })
  const byNorm = new Map()
  for (const b of bones) { const k = norm(b.name); if (!byNorm.has(k)) byNorm.set(k, b) }
  const H = {}
  const find = rx => { for (const [k, b] of byNorm) if (rx.test(k)) return b; return null }
  for (const [key, rules] of Object.entries(NAME_RULES)) {
    const sided = key[0] === key[0].toUpperCase()
    for (const side of sided ? ['l', 'r'] : ['']) {
      const name = sided ? (side === 'l' ? 'left' : 'right') + key : key
      for (const r of rules) {
        const rx = sided ? new RegExp(r.source.replace('^[lr]', '^' + side)) : r
        const b = find(rx); if (b) { H[name] = b; break }
      }
    }
  }
  // fingers: <finger>1..4 (Mixamo: handindex1, Quaternius: index1); the
  // thumb's first bone is its metacarpal
  for (const side of ['l', 'r']) for (const f of [1, 2, 3, 4, 5]) {
    const chain = []
    for (let i = 1; i <= 4; i++) {
      const b = find(new RegExp(`^${side}:(hand)?${FINGER_RX[f]}(finger)?0?${i}$`))
      if (b) chain.push(b)
    }
    // Quaternius / Mixamo-style chains start at the proximal phalanx for the
    // four fingers; a fourth bone is the tip
    phal(f).forEach((p, k) => { if (chain[k]) H[(side === 'l' ? 'left' : 'right') + FINGER[f] + p] = chain[k] })
    if (chain[3]) H[(side === 'l' ? 'left' : 'right') + FINGER[f] + 'Tip'] = chain[3]
  }
  return H
}

/**
 * Load a model. key: a MODELS key. base: URL of pianist/assets/.
 * Returns a character object shaped like loadCharacter()'s, for createRig().
 */
export async function loadAltCharacter(key, base = new URL('./assets/', import.meta.url).href) {
  const spec = MODELS[key]
  if (!spec) throw new Error(`unknown model ${key}`)
  const loader = new GLTFLoader()
  let vrm = null, VRMUtils = null
  if (spec.kind === 'vrm') {
    const mod = await import('@pixiv/three-vrm')
    VRMUtils = mod.VRMUtils
    loader.register(p => new mod.VRMLoaderPlugin(p))
  }
  const gltf = await loader.loadAsync(base + spec.url)
  let model = gltf.scene
  let H
  if (spec.kind === 'vrm') {
    vrm = gltf.userData.vrm
    VRMUtils.removeUnnecessaryVertices(gltf.scene)
    VRMUtils.combineSkeletons?.(gltf.scene)
    model = vrm.scene
    // we pose the raw bones ourselves; no copying from the normalised rig
    vrm.humanoid.autoUpdateHumanBones = false
    if (vrm.lookAt) vrm.lookAt.autoUpdate = false
    if (spec.dress) {
      const q = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('vdress') : null
      if (q !== 'off') await addDress(gltf.scene, spec.dress, base, q).catch(e => console.warn('dress:', e.message))
    }
    H = {}
    for (const name of Object.keys(vrm.humanoid.humanBones)) { const b = vrm.humanoid.getRawBoneNode(name); if (b) H[name] = b }
  } else {
    // the nodes may hold an animation pose (Quaternius' do): start from the
    // bind pose the skins were made in
    model.updateMatrixWorld(true)
    model.traverse(o => { if (o.isSkinnedMesh) o.skeleton.pose() })
    H = humanoidFromNames(model)
  }
  for (const need of ['hips', 'head', 'leftUpperArm', 'leftLowerArm', 'leftHand', 'leftUpperLeg', 'leftLowerLeg', 'leftFoot', 'leftIndexProximal', 'leftMiddleProximal', 'leftLittleProximal', 'leftThumbProximal'])
    if (!H[need]) throw new Error(`${key}: no ${need} bone found`)

  // ── Into the piano frame: centimetres, facing -z, standing on y = 0 ──
  const group = new THREE.Group(); group.name = 'pianist'
  const holder = new THREE.Group(); holder.name = 'model'
  holder.add(model); group.add(holder)
  model.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false } })
  const wp = b => { group.updateMatrixWorld(true); return b.getWorldPosition(v3()) }
  // her left must be at -x (she faces -z): turn the model round if not
  if (wp(H.leftUpperArm).x > wp(H.rightUpperArm || H.leftUpperArm).x + 1e-6 || (!H.rightUpperArm && wp(H.leftUpperArm).x > 0)) holder.rotation.y = Math.PI
  // scale: legs and arms as long as the MakeHuman woman's (on average), so she
  // fits the bench, the pedals and the keyboard
  {
    const leg = wp(H.leftUpperLeg).distanceTo(wp(H.leftFoot))
    const arm = wp(H.leftUpperArm).distanceTo(wp(H.leftHand))
    holder.scale.setScalar(0.5 * (MH_LEG / leg + MH_ARM / arm))
    group.updateMatrixWorld(true)
    const box = new THREE.Box3().setFromObject(model)
    holder.position.y -= box.min.y
    group.updateMatrixWorld(true)
  }
  const box = new THREE.Box3().setFromObject(model)
  if (vrm) {
    // spring bones (hair, skirt) start from the scaled, turned rest pose
    // gravity is in world units per second: scale it with the model (×~100,
    // metres to centimetres), or the hair floats
    for (const j of vrm.springBoneManager?.joints ?? []) j.settings.gravityPower *= holder.scale.x
    vrm.springBoneManager?.setInitState?.()
    vrm.springBoneManager?.reset?.()
    // MToon is close to unlit: under the stage's spotlights it burns out, so
    // take its lit and shade colours down to the scene's exposure
    model.traverse(o => {
      if (!o.isMesh) return
      for (const mt of [].concat(o.material)) {
        if (!mt.isMToonMaterial) continue
        mt.color?.multiplyScalar(spec.gain ?? MTOON_GAIN)
        mt.shadeColorFactor?.multiplyScalar(spec.gain ?? MTOON_GAIN)
      }
    })
  }

  // ── Target joint positions (rest, piano frame) ──
  const P = name => H[name] ? wp(H[name]) : null
  const S = side => side === 'L' ? 'left' : 'right'
  const J = {}
  const put = (n, head, tail) => { J[n + '____head'] = head.clone(); J[n + '____tail'] = tail.clone() }
  const lerp = (a, b, t) => a.clone().lerp(b, t)
  const hips = P('hips'), neck = P('neck') || lerp(P('head'), P('leftUpperArm').add(P('rightUpperArm') || P('leftUpperArm')).multiplyScalar(0.5), 0.5), head = P('head')
  // spine: MakeHuman's five bones, at its proportions along the model's
  // column hips → (spine, chest, upper chest) → neck
  const col = [hips, ...['spine', 'chest', 'upperChest'].map(P).filter(Boolean), neck]
  const lens = col.slice(1).map((p, i) => p.distanceTo(col[i])), total = lens.reduce((a, b) => a + b, 0)
  const along = u => { let d = u * total; for (let i = 0; i < lens.length; i++) { if (d <= lens[i] || i === lens.length - 1) return lerp(col[i], col[i + 1], Math.min(1, d / lens[i])); d -= lens[i] } }
  const SPINE_AT = [0, 0.135, 0.253, 0.417, 0.712, 1]
  const SPINES = ['spine05', 'spine04', 'spine03', 'spine02', 'spine01']
  SPINES.forEach((n, i) => put(n, along(SPINE_AT[i]), along(SPINE_AT[i + 1])))
  put('root', hips, hips.clone().add(v3(0, 0, -8)))
  const top = v3(head.x, box.max.y, head.z)
  for (let i = 0; i < 3; i++) put(`neck0${i + 1}`, lerp(neck, head, i / 3), lerp(neck, head, (i + 1) / 3))
  put('head', head, top)
  const fwd = v3(0, 0, -1)
  for (const side of ['L', 'R']) {
    const s = S(side), d = '.' + side
    // eyes: the model's eye bones, or guessed in front of the head
    const eye = P(s + 'Eye') || head.clone().add(v3(side === 'L' ? -3.2 : 3.2, 0.3 * (top.y - head.y), -0.45 * (top.y - head.y)))
    put('eye' + d, eye, eye.clone().addScaledVector(fwd, 4))
    const ua = P(s + 'UpperArm'), el = P(s + 'LowerArm'), wr = P(s + 'Hand')
    const sh = P(s + 'Shoulder') || lerp(neck, ua, 0.25)
    put('clavicle' + d, sh, ua)
    put('upperarm01' + d, ua, lerp(ua, el, 0.5)); put('upperarm02' + d, lerp(ua, el, 0.5), el)
    put('lowerarm01' + d, el, lerp(el, wr, 0.5)); put('lowerarm02' + d, lerp(el, wr, 0.5), wr)
    put('wrist' + d, wr, P(s + 'MiddleProximal'))
    for (const f of [1, 2, 3, 4, 5]) {
      const names = phal(f).map(p => s + FINGER[f] + p)
      const pts = names.map(P)
      if (!pts[0]) throw new Error(`${key}: no ${names[0]} bone`)
      // a missing joint: along the previous segment
      for (let k = 1; k < 3; k++) if (!pts[k]) pts[k] = pts[k - 1].clone().add(pts[k - 1].clone().sub(k > 1 ? pts[k - 2] : wr).multiplyScalar(0.7))
      // the tip: an end bone if there is one, else the last segment again (shorter)
      const tip = P(s + FINGER[f] + 'Tip') || childTip(H[names[2]], wp) || pts[2].clone().add(pts[2].clone().sub(pts[1]).multiplyScalar(0.85))
      for (let k = 0; k < 3; k++) put(`finger${f}-${k + 1}${d}`, pts[k], k < 2 ? pts[k + 1] : tip)
    }
    const hip = P(s + 'UpperLeg'), kn = P(s + 'LowerLeg'), an = P(s + 'Foot')
    const toe = P(s + 'Toes') || an.clone().add(v3(0, -an.y * 0.7, -0.6 * an.distanceTo(kn) * 0.3))
    const toeTip = childTip(H[s + 'Toes'], wp) || toe.clone().add(v3(0, 0, -4))
    put('pelvis' + d, hips, hip)
    put('upperleg01' + d, hip, lerp(hip, kn, 0.2)); put('upperleg02' + d, lerp(hip, kn, 0.2), kn)
    put('lowerleg01' + d, kn, lerp(kn, an, 0.5)); put('lowerleg02' + d, lerp(kn, an, 0.5), an)
    put('foot' + d, an, toe)
    put('toe2-1' + d, toe, toeTip)
  }

  // ── The proxy skeleton (MakeHuman names), in the piano frame ──
  const PARENT = { root: null, spine05: 'root', spine04: 'spine05', spine03: 'spine04', spine02: 'spine03', spine01: 'spine02', neck01: 'spine01', neck02: 'neck01', neck03: 'neck02', head: 'neck03' }
  for (const d of ['.L', '.R']) {
    Object.assign(PARENT, {
      ['eye' + d]: 'head', ['clavicle' + d]: 'spine01', ['upperarm01' + d]: 'clavicle' + d, ['upperarm02' + d]: 'upperarm01' + d,
      ['lowerarm01' + d]: 'upperarm02' + d, ['lowerarm02' + d]: 'lowerarm01' + d, ['wrist' + d]: 'lowerarm02' + d,
      ['pelvis' + d]: 'root', ['upperleg01' + d]: 'pelvis' + d, ['upperleg02' + d]: 'upperleg01' + d, ['lowerleg01' + d]: 'upperleg02' + d,
      ['lowerleg02' + d]: 'lowerleg01' + d, ['foot' + d]: 'lowerleg02' + d, ['toe2-1' + d]: 'foot' + d,
    })
    for (const f of [1, 2, 3, 4, 5]) for (let k = 1; k <= 3; k++) PARENT[`finger${f}-${k}${d}`] = k === 1 ? 'wrist' + d : `finger${f}-${k - 1}${d}`
  }
  const bones = [], byName = {}, restWorld = []
  const inv = new THREE.Matrix4(), m = new THREE.Matrix4()
  for (const [name, par] of Object.entries(PARENT)) {
    const h = J[name + '____head'], t = J[name + '____tail']
    const y = t.clone().sub(h)
    if (y.lengthSq() < 1e-8) y.set(0, 1, 0)
    y.normalize()
    // roll: x as close to the world x as the bone allows (z if it runs along x)
    const x = Math.abs(y.x) > 0.9 ? v3(0, 0, 1) : v3(1, 0, 0)
    x.addScaledVector(y, -x.dot(y)).normalize()
    const z = v3().crossVectors(x, y)
    const W = new THREE.Matrix4().makeBasis(x, y, z).setPosition(h)
    const bone = new THREE.Bone(); bone.name = name
    if (par) { inv.copy(restWorld[bones.indexOf(byName[par])]).invert(); m.multiplyMatrices(inv, W) } else m.copy(W)
    m.decompose(bone.position, bone.quaternion, bone.scale)
    if (par) byName[par].add(bone)
    bones.push(bone); byName[name] = bone; restWorld.push(W)
  }
  const proxyRoot = byName.root
  group.add(proxyRoot)
  group.updateMatrixWorld(true)

  // ── Which proxy bone drives each model bone ──
  // [model bone, proxy bone(s), blend]: the forearm takes the average of the
  // two proxy forearm halves (they carry the pronation twist 45 % / 85 %)
  const DRIVE = [['hips', 'root']]
  // spine bones: the proxy segment their head sits on
  const segOf = p => { let best = 'spine05', bd = Infinity; for (const n of SPINES) { const h = J[n + '____head'], t = J[n + '____tail'], seg = t.clone().sub(h), u = THREE.MathUtils.clamp(p.clone().sub(h).dot(seg) / seg.lengthSq(), 0, 1), dd = h.clone().addScaledVector(seg, u).distanceTo(p); if (dd < bd - 1e-6) { bd = dd; best = n } } return best }
  for (const n of ['spine', 'chest', 'upperChest']) if (H[n]) DRIVE.push([n, segOf(P(n).add(v3(0, 0.5, 0)))])
  DRIVE.push(['neck', 'neck02'], ['head', 'head'])
  // a bone between the hips and the root that the legs hang from (Quaternius'
  // "Body"): it moves with the pelvis too, or what it carries (the waist of
  // the skirt) stays where she stood
  {
    const lp = H.leftUpperLeg.parent
    if (lp?.isBone && lp !== H.hips && !Object.values(H).includes(lp)) { H.legRoot = lp; DRIVE.push(['legRoot', 'root']) }
  }
  for (const side of ['L', 'R']) {
    const s = S(side), d = '.' + side
    DRIVE.push([s + 'Eye', 'eye' + d], [s + 'Shoulder', 'clavicle' + d], [s + 'UpperArm', 'upperarm01' + d], [s + 'LowerArm', ['lowerarm01' + d, 'lowerarm02' + d, 0.5]],
      [s + 'Hand', 'wrist' + d], [s + 'UpperLeg', 'upperleg02' + d], [s + 'LowerLeg', 'lowerleg02' + d], [s + 'Foot', 'foot' + d])
    for (const f of [1, 2, 3, 4, 5]) phal(f).forEach((p, k) => DRIVE.push([s + FINGER[f] + p, `finger${f}-${k + 1}${d}`]))
  }
  // in hierarchy order (parents before children)
  const depth = o => { let n = 0; while (o.parent) { n++; o = o.parent } return n }
  const drive = DRIVE.filter(([t]) => H[t]).map(([t, p]) => {
    const target = H[t], [a, b, k] = Array.isArray(p) ? p : [p, p, 0]
    const tq = target.getWorldQuaternion(new THREE.Quaternion())
    const pq = byName[a].getWorldQuaternion(new THREE.Quaternion())
    return { target, a: byName[a], b: byName[b], k, offset: pq.invert().multiply(tq), depth: depth(target) }
  }).sort((x, y) => x.depth - y.depth)
  // bones whose model parent is not driven (the hips; feet that are IK
  // controls parented to the root, as in Quaternius' rig; legs hung from a
  // "Body" bone) are also placed: their head rides on the proxy bone
  const drivenSet = new Set(drive.map(d => d.target))
  for (const d of drive) if (!drivenSet.has(d.target.parent)) {
    d.place = d.a.worldToLocal(wp(d.target))
  }
  const _qa = new THREE.Quaternion(), _qb = new THREE.Quaternion(), _qp = new THREE.Quaternion(), _p = v3()

  function sync() {
    // proxy world transforms are current (the caller updated group)
    for (const d of drive) {
      d.a.getWorldQuaternion(_qa)
      if (d.k) { d.b.getWorldQuaternion(_qb); _qa.slerp(_qb, d.k) }
      _qa.multiply(d.offset)
      d.target.parent.getWorldQuaternion(_qp)
      d.target.quaternion.copy(_qp.invert().multiply(_qa))
      if (d.place) d.target.position.copy(d.target.parent.worldToLocal(d.a.localToWorld(_p.copy(d.place))))
      d.target.updateMatrixWorld(true)
    }
  }

  // the rig reads the eyeball centres from the eye geometry: two points
  const eyeGeo = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute([...J['eye.L____head'].toArray(), ...J['eye.R____head'].toArray()], 3))

  let rig = null, draped = false
  // ── Smoothing: Loop subdivision of the skinned meshes (subdivide.js), in
  // their bind pose, so the GPU skins the result. Cached per level; meshes
  // with morph targets (a VRM face) or alpha cards are left alone.
  const smoothable = []
  model.traverse(o => {
    if (!o.isSkinnedMesh || !o.geometry.index || Object.keys(o.geometry.morphAttributes).length) return
    const m = [].concat(o.material)[0]
    if (m.transparent || m.alphaTest > 0) return
    smoothable.push({ mesh: o, cache: { 0: o.geometry } })
  })
  let smoothLevel = 0
  function setSmooth(lv) {
    lv = Math.max(0, Math.min(2, lv | 0))
    if (lv === smoothLevel) return
    smoothLevel = lv
    for (const s of smoothable) {
      if (!s.cache[lv]) {
        try { s.cache[lv] = smoothNormals(subdivide(s.cache[0], lv).geometry) }
        catch (e) { console.warn(`smooth ${s.mesh.name}: ${e.message}`); s.cache[lv] = s.cache[0] }
      }
      s.mesh.geometry = s.cache[lv]
    }
  }
  const ch = {
    kind: key, credit: spec.credit, alt: true, vrm,
    group, bones, byName, restWorld, joints: J, skeleton: new THREE.Skeleton(bones),
    meshes: {}, materials: {}, meta: { community: [] }, parts: { eyes: { geometry: eyeGeo } },
    model, humanoid: H,
    addPart: () => null, ensurePart: async () => {}, partArray: () => null,
    /** let the model follow the rig (blinks too, on a VRM) */
    attachRig(r) { rig = r },
    /** read the smoothing level from here every frame (the page's Smooth menu) */
    smoothFrom: null,
    update(dt) {
      group.updateMatrixWorld(true)
      sync()
      if (!draped) { draped = true; if (spec.drape) { group.updateMatrixWorld(true); drapeSkirt(model, H, spec.drape) } }
      setSmooth(ch.smoothFrom ? ch.smoothFrom() : spec.smooth || 0)
      if (vrm) {
        const em = vrm.expressionManager
        if (em && rig) { em.setValue('blink', Math.max(rig.state.blink || 0, rig.state.lidDrop || 0)) }
        vrm.update(dt)
      }
    },
  }
  return ch
}

// the end of a bone: its first child bone's head, if any
function childTip(bone, wp) {
  const c = bone?.children.find(o => o.isBone)
  return c ? wp(c) : null
}

// smooth shading across the welded positions (the low-poly source is flat
// shaded: every face has its own vertices and normals)
function smoothNormals(g) {
  g.computeVertexNormals()
  const P = g.attributes.position.array, N = g.attributes.normal.array, acc = new Map()
  const key = v => `${Math.round(P[v * 3] * 1e4)},${Math.round(P[v * 3 + 1] * 1e4)},${Math.round(P[v * 3 + 2] * 1e4)}`
  const n = P.length / 3
  for (let v = 0; v < n; v++) { const k = key(v), a = acc.get(k) || [0, 0, 0]; a[0] += N[v * 3]; a[1] += N[v * 3 + 1]; a[2] += N[v * 3 + 2]; acc.set(k, a) }
  for (let v = 0; v < n; v++) { const a = acc.get(key(v)), l = Math.hypot(...a) || 1; N[v * 3] = a[0] / l; N[v * 3 + 1] = a[1] / l; N[v * 3 + 2] = a[2] / l }
  return g
}

// ── Seated skirt ────────────────────────────────────────────────────────────
// A skirt skinned to the thighs keeps its standing flare when she sits: the
// cloth that stood off the front of each thigh now stands up off her lap.
// Once, in the seated pose, every skirt vertex carried by a thigh is pulled in
// over the top of that thigh (its distance from the thigh's axis capped at
// the thigh's radius plus a little, fully on top, not at all underneath, so
// the sides still fall), and the new position is solved back into the bind
// pose through the vertex's own blended skinning matrix. Skinned again, the
// skirt drapes the lap in this pose and stays close to it as the legs work
// the pedals.
const _M = new THREE.Matrix4(), _B = new THREE.Matrix4(), _v = new THREE.Vector3()
function skinMatrix(mesh, si, sw, v, out) {
  const sk = mesh.skeleton
  out.set(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0)
  for (let k = 0; k < 4; k++) {
    const w = sw[v * 4 + k]; if (!w) continue
    const b = si[v * 4 + k]
    _B.multiplyMatrices(sk.bones[b].matrixWorld, sk.boneInverses[b])
    for (let e = 0; e < 16; e++) out.elements[e] += w * _B.elements[e]
  }
  return out.multiply(mesh.bindMatrix)
}
function drapeSkirt(model, H, spec) {
  const thighs = ['left', 'right'].map(s => {
    const a = H[s + 'UpperLeg'], b = H[s + 'LowerLeg']
    const hip = a.getWorldPosition(new THREE.Vector3()), knee = b.getWorldPosition(new THREE.Vector3())
    return { bone: a, hip, knee, L: hip.distanceTo(knee), u: knee.clone().sub(hip).normalize(), R: [] }
  })
  const skirts = [], skins = []
  model.traverse(o => {
    if (!o.isSkinnedMesh) return
    let under = false; for (let p = o; p; p = p.parent) if (spec.under.test(p.name)) under = true
    if (!under || !o.visible) return
    const name = [].concat(o.material)[0].name
    if (spec.material.test(name)) skirts.push(o); else skins.push(o)
  })
  if (!skirts.length) return
  const axis = (T, p) => {
    const t = THREE.MathUtils.clamp(_v.copy(p).sub(T.hip).dot(T.u) / T.L, 0, 1)
    const c = T.hip.clone().addScaledVector(T.u, t * T.L)
    return { t, c, r: p.clone().sub(c) }
  }
  const thighOf = (mesh, si, sw, v) => {
    const bones = mesh.skeleton.bones, w = [0, 0]
    for (let k = 0; k < 4; k++) { const b = bones[si[v * 4 + k]]; thighs.forEach((T, i) => { if (b === T.bone) w[i] += sw[v * 4 + k] }) }
    return w
  }
  // the thighs' radius: the leg skin carried by one thigh, around its middle
  for (const m of skins) {
    const P = m.geometry.attributes.position, si = m.geometry.attributes.skinIndex.array, sw = m.geometry.attributes.skinWeight.array
    for (let v = 0; v < P.count; v++) {
      const w = thighOf(m, si, sw, v), i = w[0] > 0.9 ? 0 : w[1] > 0.9 ? 1 : -1
      if (i < 0) continue
      const p = _v.fromBufferAttribute(P, v).applyMatrix4(skinMatrix(m, si, sw, v, _M)).clone()
      const a = axis(thighs[i], p)
      if (a.t > 0.3 && a.t < 0.7) thighs[i].R.push(a.r.length())
    }
  }
  for (const T of thighs) { T.R.sort((a, b) => a - b); T.radius = T.R.length ? T.R[Math.floor(T.R.length * 0.75)] : 0.09 * T.L }
  for (const m of skirts) {
    const g = m.geometry, P = g.attributes.position, si = g.attributes.skinIndex.array, sw = g.attributes.skinWeight.array
    for (let v = 0; v < P.count; v++) {
      const w = thighOf(m, si, sw, v), tw = w[0] + w[1]
      if (tw < 0.3) continue
      const M = skinMatrix(m, si, sw, v, _M)
      const p = _v.fromBufferAttribute(P, v).applyMatrix4(M).clone()
      const goal = new THREE.Vector3()
      thighs.forEach((T, i) => {
        if (!w[i]) return
        const a = axis(T, p), len = a.r.length() || 1e-6
        // on top (r up) fully, the sides partly, underneath not at all
        const f = THREE.MathUtils.smoothstep(a.r.y / len, -0.45, 0.35)
        let cap = Math.min(len, T.radius * 1.12 + 0.6)
        // a refitted dress can sit inside the seated thigh: push it out too
        if (spec.push) cap = Math.max(cap, T.radius * 1.1 + 0.5)
        goal.add(a.c.addScaledVector(a.r, THREE.MathUtils.lerp(len, cap, spec.push ? Math.max(f, 0.6) : f) / len).multiplyScalar(w[i] / tw))
      })
      p.lerp(goal, Math.min(1, tw))
      // back into the bind pose
      p.applyMatrix4(M.invert())
      P.setXYZ(v, p.x, p.y, p.z)
    }
    P.needsUpdate = true
    g.computeVertexNormals()
  }
}
