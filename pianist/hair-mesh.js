// Mesh hair styles for the Experiment #032 pianist: MakeHuman's CC0 hair
// (alpha-textured cards fitted to the body and skinned to the head, neck and
// back by build-character.mjs). Nothing is simulated — the cheap alternative
// to the strand groom in hair.js.
//
// The textures are stored as luminance + alpha so any colour can be dialled
// in; the shading is MeshPhysicalMaterial's anisotropic GGX along the
// strands (the cards run along their V direction) with alpha-to-coverage
// edges, over a hair-coloured scalp so no skin shows between the cards.

import * as THREE from 'three'
import { hairCap } from './hair.js'
import { createHairCloth } from './hair-cloth.js'

export const MESH_HAIR = { bob01: 'Bob', bob02: 'Bob (sleek)', ponytail01: 'Ponytail', braid01: 'Braid', long01: 'Long' }

export async function createMeshHair(ch, style = 'ponytail01', { color = '#5a3e2a' } = {}) {
  const map = await ch.loadTexture(`hair_${style}.png`)
  // normalise the texture's brightness so the colour picker means the same
  // thing for every style
  let gain = 1
  if (map?.image) {
    const c = document.createElement('canvas'); c.width = c.height = 64
    const g = c.getContext('2d'); g.drawImage(map.image, 0, 0, 64, 64)
    const d = g.getImageData(0, 0, 64, 64).data
    let s = 0, n = 0
    for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 128) { s += d[i] / 255; n++ }
    if (n) gain = THREE.MathUtils.clamp(0.42 / (s / n), 0.5, 4)
  }
  const mat = new THREE.MeshPhysicalMaterial({
    map, alphaTest: 0.35, alphaToCoverage: true, side: THREE.DoubleSide,
    roughness: 0.42, metalness: 0,
    anisotropy: 0.85, anisotropyRotation: Math.PI / 2,
    sheen: 0.4, sheenRoughness: 0.35,
    specularIntensity: 0.6,
  })
  const mesh = ch.addPart('hair_' + style, mat)
  mesh.geometry.computeTangents()
  mesh.renderOrder = 1
  // scalp under the cards
  const cap = hairCap(ch, undefined, mesh.geometry, map)
  const capMat = cap.material

  const object = new THREE.Group()
  object.name = 'hair'
  function setColor(hex) {
    const c = new THREE.Color(hex)
    mat.color.copy(c).multiplyScalar(gain)
    mat.sheenColor.copy(c).lerp(new THREE.Color(0xffffff), 0.3)
    capMat.color.copy(c).multiplyScalar(0.45)
  }
  setColor(color)
  // simulated like a piece of cloth pinned at the scalp (hair-cloth.js)
  const cloth = createHairCloth(ch, mesh)
  return {
    kind: 'mesh', style, object, mesh, cap, cloth,
    get simulate() { return cloth.active }, set simulate(v) { cloth.active = v },
    setColor, setDensity() {}, settle(s) { if (cloth.active) cloth.settle(s) },
    update(dt = 1 / 60) { cap.visible = object.visible; cloth.update(dt, object.visible) },
    dispose() {
      cloth.dispose()
      for (const m of [mesh, cap]) m.removeFromParent()
      mesh.geometry.dispose(); cap.geometry.dispose(); mat.dispose(); capMat.dispose(); map?.dispose()
    },
  }
}
