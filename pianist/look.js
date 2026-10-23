// Looks for the Experiment #032 pianist.
//
//  • realistic — the default physically based materials.
//  • stylized  — a softer, animated-feature take (think Pixar): a slightly
//    larger head, smooth skin without pores, warmer subsurface wrap, a
//    satin dress.
//  • cel       — toon shading with ink outlines (an FF9 / anime feel):
//    MeshToonMaterial with a three-step ramp on everything, and an inverted
//    hull per mesh (the skinned geometry pushed out along its normals,
//    back faces only, drawn black).

import * as THREE from 'three'

let ramp = null
function toonRamp() {
  if (ramp) return ramp
  const d = new Uint8Array([105, 105, 105, 255, 185, 185, 185, 255, 255, 255, 255, 255])
  ramp = new THREE.DataTexture(d, 3, 1, THREE.RGBAFormat)
  ramp.minFilter = ramp.magFilter = THREE.NearestFilter
  ramp.needsUpdate = true
  return ramp
}

function outlineMaterial(width) {
  const m = new THREE.MeshBasicMaterial({ color: 0x0c0806, side: THREE.BackSide })
  m.onBeforeCompile = s => {
    s.vertexShader = s.vertexShader.replace('#include <skinning_vertex>', `#include <skinning_vertex>
      #ifdef USE_SKINNING
        transformed += normalize(objectNormal) * ${width.toFixed(3)};
      #else
        transformed += normalize(normal) * ${width.toFixed(3)};
      #endif`)
  }
  return m
}

export function createLook(ch) {
  const state = { look: 'realistic', outlines: [] }
  const NO_OUTLINE = /eyes|eyebrows|eyelashes|cap|hem|edge/
  function meshes(extra) {
    const list = []
    ch.group.traverse(o => { if ((o.isSkinnedMesh || o.isMesh) && !o.userData.outline) list.push(o) })
    for (const o of extra) o?.traverse?.(c => { if (c.isMesh && !c.userData.outline && !list.includes(c) && !c.isInstancedMesh && !c.material.isShaderMaterial) list.push(c) })
    return list.filter(o => !o.material.isShaderMaterial && o.material.colorWrite !== false)
  }
  function clearOutlines() {
    for (const o of state.outlines) { o.removeFromParent(); o.material.dispose() }
    state.outlines = []
  }
  function restore(list) {
    for (const o of list) if (o.userData.origMat) { o.material.dispose(); o.material = o.userData.origMat; delete o.userData.origMat }
  }
  const headBone = ch.byName.head
  // a swapped material's colour, from its original (also run by recolor())
  const STYLIZED_SKIN = new THREE.Color(1, 0.9 / 0.94, 0.84 / 0.9)   // (1, 0.9, 0.84) from the skin's own (1, 0.94, 0.9)
  function tint(o, src, look) {
    if (look === 'cel') {
      // flat colour, as painted. Toon shading has no falloff to darken it,
      // so the clothes would read pastel (a magenta gown as candy pink):
      // deepen them (AgX also pales a bright saturated colour)
      if (src === ch.materials.skin) return src.color.clone().multiplyScalar(0.78)
      if (/hair|eye|brow|lash|teeth|tongue/.test(o.name)) return src.color.clone().multiplyScalar(1.1)
      // the clothes, by how saturated they are: whites and greys stay as they are
      const hsl = {}; src.color.getHSL(hsl)
      return src.color.clone().multiplyScalar(1 - 0.82 * hsl.s)
    }
    if (src === ch.materials.skin) return src.color.clone().multiply(STYLIZED_SKIN)
    return src.color.clone()
  }
  function apply(look, extra = []) {
    const list = meshes(extra)
    restore(list); clearOutlines()
    state.look = look
    headBone.scale.setScalar(look === 'stylized' ? 1.1 : 1)
    if (look === 'realistic') return
    for (const o of list) {
      if (look === 'cel' && /eyes|eyebrows|eyelashes/.test(o.name)) continue
      const src = o.material
      let m
      if (look === 'cel') {
        m = new THREE.MeshToonMaterial({
          color: src.color, map: src.map, gradientMap: toonRamp(),
          alphaTest: src.alphaTest, transparent: src.transparent, depthWrite: src.depthWrite,
          side: src.side, alphaToCoverage: src.alphaToCoverage,
          polygonOffset: src.polygonOffset, polygonOffsetFactor: src.polygonOffsetFactor, polygonOffsetUnits: src.polygonOffsetUnits,
        })
        m.color = tint(o, src, look)
      } else {
        m = src.clone()
        if (src === ch.materials.skin) {
          m.normalScale = new THREE.Vector2(0, 0); m.roughness = 0.62; m.sheen = 0.6
          m.color = tint(o, src, look)
          if (src.onBeforeCompile) { m.onBeforeCompile = src.onBeforeCompile; m.customProgramCacheKey = src.customProgramCacheKey }
        } else if (o.parent?.name === 'dress' || /dress/.test(o.name) || src.normalMap) {
          if (m.normalScale) m.normalScale = new THREE.Vector2(0.25, 0.25)
          if ('sheen' in m) { m.sheen = 0.9; m.sheenRoughness = 0.3; m.roughness = 0.7 }
        }
      }
      // a fabric's shader (pleats) travels with the swapped material
      if (src.userData.fabricShader) { m.onBeforeCompile = src.onBeforeCompile; m.customProgramCacheKey = src.customProgramCacheKey }
      o.userData.origMat = src
      o.material = m
      if (look === 'cel' && !NO_OUTLINE.test(o.name) && !src.alphaTest) {
        const w = o.name === 'body' ? 0.14 : 0.12
        const ol = o.isSkinnedMesh ? new THREE.SkinnedMesh(o.geometry, outlineMaterial(w)) : new THREE.Mesh(o.geometry, outlineMaterial(w))
        ol.userData.outline = true; ol.frustumCulled = false
        o.parent.add(ol)
        if (o.isSkinnedMesh) ol.bind(ch.skeleton, new THREE.Matrix4())
        ol.userData.src = o
        state.outlines.push(ol)
      }
    }
  }
  return {
    get look() { return state.look },
    apply,
    /** after a colour (or a tinted map) changed on the original materials: carry it to the swapped ones, no rebuild */
    recolor(extra = []) {
      if (state.look === 'realistic') return
      const list = []
      ch.group.traverse(o => { if (o.isMesh && o.userData.origMat) list.push(o) })
      for (const x of extra) x?.traverse?.(c => { if (c.isMesh && c.userData.origMat && !list.includes(c)) list.push(c) })
      for (const o of list) {
        const src = o.userData.origMat, m = o.material
        m.color.copy(tint(o, src, state.look))
        if (m.map !== src.map) { m.map = src.map; m.needsUpdate = true }
        if (state.look !== 'cel' && m.sheenColor && src.sheenColor) m.sheenColor.copy(src.sheenColor)
      }
    },
    update() { for (const o of state.outlines) o.visible = o.userData.src.visible && o.userData.src.parent?.visible !== false },
  }
}
