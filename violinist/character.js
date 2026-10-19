// Loading a VRoid violinist and dressing him (Experiments #037 and #038).
//
// The VRoid samples share one skeleton (the same 64 J_Bip joints) and one
// body, so the base male's shirt, knit vest, tie, trousers and shoes can be
// bound onto any of them, recoloured for a concert, with a jacket or tailcoat
// cut from his own body skin (jacket.js) on top.
//
// Units: the VRM is scaled to centimetres, standing at the origin facing +z.

import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { tuneMToon } from './stage.js'
import { buildJacket, jacketMaterials, trimUnder } from './jacket.js'

export const MODELS = {
  'vroid-hairsample-male.vrm': 'Black hair (Chiaki-like)',
  'vroid-sakurada-fumiriya.vrm': 'Light brown (Mine-like)',
  'vroid-base-male.vrm': 'Short teal',
}
export const OUTFITS = {
  concert: { label: 'Black suit jacket', Tops: 'vest:0.5', Tie: 0x2a2a30, Bottoms: 0x55555c, Shoes: 0x303034, jacket: 'jacket' },
  tails: { label: 'Tailcoat', Tops: 'vest:2.4', Tie: 0x2a2a30, Bottoms: 0x55555c, Shoes: 0x303034, jacket: 'tails' },
  vest: { label: 'Shirt, vest and tie', Tops: 'vest', Tie: 0x2a2a30, Bottoms: 0x55555c, Shoes: 0x303034 },
  school: { label: 'School uniform' },
  // HairSample_Male's own clothes on any of them (same skeleton): a white hoodie, dark trousers
  casual: { label: 'Casual: white hoodie', donor: 'vroid-hairsample-male.vrm' },
  own: { label: "The model's own" },
}

let loader = null, VRMUtils = null
const donors = new Map()
async function getLoader() {
  if (loader) return loader
  const mod = await import('@pixiv/three-vrm')
  VRMUtils = mod.VRMUtils
  loader = new GLTFLoader()
  loader.register(p => new mod.VRMLoaderPlugin(p))
  return loader
}

/** Load a violinist: base = URL of violinist/assets/models/. Returns the VRM (not added to a scene). */
export async function loadViolinist(file, { base = new URL('./assets/models/', import.meta.url).href, outfit = 'concert', gain } = {}) {
  const L = await getLoader()
  const gltf = await L.loadAsync(base + file)
  const vrm = gltf.userData.vrm
  VRMUtils.removeUnnecessaryVertices(gltf.scene)
  VRMUtils.rotateVRM0(vrm)
  vrm.scene.scale.setScalar(100)     // metres → cm
  vrm.scene.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false } })
  if (outfit !== 'own') await dress(vrm, outfit, base)
  tuneMToon(vrm, gain != null ? { gain } : undefined)
  return vrm
}
export const disposeVRM = vrm => VRMUtils?.deepDispose(vrm.scene)

// the navy knit vest → grey by its brightness × k (0.32 charcoal black, 0.62
// a mid-grey waistcoat that reads inside a black jacket, 2.4 a white one for
// the tailcoat); the white shirt is left alone
const vestCache = new Map()
function blackVest(tex, k = 0.32) {
  if (!tex?.image) return tex
  const key = tex.uuid + k
  if (vestCache.has(key)) return vestCache.get(key)
  const img = tex.image, cv = document.createElement('canvas')
  cv.width = img.width; cv.height = img.height
  const g = cv.getContext('2d'); g.drawImage(img, 0, 0)
  const d = g.getImageData(0, 0, cv.width, cv.height), p = d.data
  for (let i = 0; i < p.length; i += 4) {
    const r = p[i], gg = p[i + 1], b = p[i + 2]
    if (b > r + 12 && (r + gg + b) / 3 < 140) { const l = Math.min(235, (r + gg + b) / 3 * k); p[i] = l; p[i + 1] = l; p[i + 2] = Math.min(240, l * 1.04) }
  }
  g.putImageData(d, 0, 0)
  const t = new THREE.CanvasTexture(cv)
  t.colorSpace = tex.colorSpace; t.flipY = tex.flipY; t.wrapS = tex.wrapS; t.wrapT = tex.wrapT
  vestCache.set(key, t)
  return t
}

async function dress(target, key, base) {
  const tint = OUTFITS[key] || {}
  const file = tint.donor || 'vroid-base-male.vrm'
  if (!donors.has(file)) donors.set(file, (await getLoader()).loadAsync(base + file).catch(e => { donors.delete(file); throw e }))
  const donor = (await donors.get(file)).userData.vrm
  const bones = new Map()
  target.scene.traverse(o => { if (o.isBone) bones.set(o.name, o) })
  const old = []
  target.scene.traverse(o => { if (o.isSkinnedMesh && /^Body/.test(o.name)) old.push(o) })
  if (!old.length) return
  const parent = old[0].parent
  old.forEach(o => o.removeFromParent())
  let body = null, cloth = null
  const under = []
  donor.scene.traverse(o => {
    if (!o.isSkinnedMesh || !/^Body/.test(o.name)) return
    // a donor bone the target lacks (e.g. the hoodie's own spring bones) rides
    // on its nearest ancestor that the target has
    const mapBone = b => { for (let x = b; x; x = x.parent) if (bones.has(x.name)) return bones.get(x.name); return bones.values().next().value }
    const sk = new THREE.Skeleton(o.skeleton.bones.map(mapBone), o.skeleton.boneInverses)
    const mats = [].concat(o.material).map(m => {
      const c = m.clone()
      for (const [k, col] of Object.entries(tint)) {
        if (k === 'jacket' || k === 'label' || k === 'donor') continue
        if (!c.name.includes(k) || c.name.includes('Outline')) continue
        if (typeof col === 'string' && col.startsWith('vest')) { c.map = blackVest(c.map, +(col.split(':')[1] || 0.32)); if (c.shadeMultiplyTexture) c.shadeMultiplyTexture = c.map; continue }
        c.color.multiply(new THREE.Color(col)); c.shadeColorFactor?.multiply(new THREE.Color(col))
      }
      return c
    })
    let g = o.geometry
    // under a jacket only the collar and the V of the shirt and vest still show
    if (tint.jacket && /Tops/.test([].concat(o.material)[0].name)) g = trimUnder(g, o.skeleton, tint.jacket)
    const m = new THREE.SkinnedMesh(g, Array.isArray(o.material) ? mats : mats[0])
    m.name = o.name
    m.bind(sk, o.bindMatrix)
    m.castShadow = m.receiveShadow = true; m.frustumCulled = false
    parent.add(m)
    if (tint.jacket && /SKIN/.test([].concat(o.material)[0].name) && !body) body = m
    if (/Tops/.test([].concat(o.material)[0].name)) { cloth = [].concat(o.material); under.push(g) }
    if (/Tie/.test([].concat(o.material)[0].name)) under.push(g)
  })
  if (tint.jacket && body && cloth) {
    const { geometry } = buildJacket(body, { style: tint.jacket, under })
    const j = new THREE.SkinnedMesh(geometry, jacketMaterials(cloth))
    j.name = 'jacket'
    j.bind(body.skeleton, body.bindMatrix)
    j.castShadow = j.receiveShadow = true; j.frustumCulled = false
    parent.add(j)
  }
}

/** MToon ink outlines on or off (the model's own outline widths are remembered). */
export function setOutline(vrm, on) {
  vrm?.scene.traverse(o => { if (o.isMesh) for (const m of [].concat(o.material)) if (m.isMToonMaterial && m.outlineWidthMode !== undefined) { m.userData.ow ??= m.outlineWidthFactor; m.outlineWidthFactor = on ? m.userData.ow : 0 } })
}
