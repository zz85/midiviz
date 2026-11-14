// The page's GLSL material patches in TSL, for three.js's WebGPU renderer
// (pathtrace/live-gpu.js). Each WebGL module that patches a material with
// onBeforeCompile tags it (pianist/tsl-tags.js); the WebGPU renderer turns
// each material it draws into a node material (NodeLibrary.fromMaterial),
// and installPatches() applies the tagged patches to that node material:
//
//  • outline  (pianist/look.js, the cel look's ink): the inverted hull pushed
//    out along the skinned normal by `width`, after skinning as the GLSL is;
//  • skinWrap (pianist/character.js): skin's wrapped, red-shifted diffuse, in
//    place of Lambert's in the lighting model (the GLSL's SKIN_WRAP);
//  • hairCloth (pianist/hair-cloth.js): the simulated hair's displacement, read
//    from the cloth's texture by each vertex's four particles and weights;
//  • lace (pianist/fabric.js): the lining under the lace by the lace's coverage;
//  • pleat (pianist/fabric.js): knife pleats about her body's axis on a garment
//    whose UVs don't run round her, the long face tilted one way and the turn
//    the other, the crease darker.
//
// The material's own colour, maps and settings stay those of the WebGL
// material (fromMaterial copies them, and its uniforms read the original), so a
// colour or a fabric changed later reaches the node material as it does the GLSL.

import * as THREE from 'three/webgpu'
import {
  Fn, attribute, uniform, reference, texture, uv, vec2, vec3, vec4, float, mod, floor, fract, atan, normalize, cross, dot, mix, clamp,
  smoothstep, select, max, min, positionLocal, positionGeometry, normalLocal, normalView, normalViewGeometry, materialColor,
  transformDirection, cameraViewMatrix, BRDF_Lambert, diffuseColor, normalMap, luminance, materialOpacity,
  interleavedGradientNoise, screenCoordinate, frameId,
} from 'three/tsl'
import { tslTags } from '../pianist/tsl-tags.js'

const PATCHES = {
  outline(nm, { width }) {
    nm.positionNode = positionLocal.add(normalize(normalLocal).mul(width))
  },

  skinWrap(nm) {
    // the GLSL: wd = clamp((nl + w) / (1 + w)), w = (0.5, 0.24, 0.16), softened, in place of nl
    const base = nm.setupLightingModel
    nm.setupLightingModel = function (builder) {
      const lm = base.call(this, builder)
      const direct = lm.direct.bind(lm)
      lm.direct = (inputs, b) => {
        direct(inputs, b)
        const { lightDirection, lightColor, reflectedLight } = inputs
        const nl = normalViewGeometry.dot(lightDirection), w = vec3(0.5, 0.24, 0.16)
        const wd0 = clamp(vec3(nl).add(w).div(w.add(1)), 0, 1)
        const wd = wd0.mul(wd0.mul(wd0.mul(-2).add(3)).mul(0.35).add(0.65))
        // (the base model added Lambert's dotNL term: take it back out)
        const dotNL = normalView.dot(lightDirection).clamp()
        reflectedLight.directDiffuse.addAssign(wd.sub(dotNL).mul(lightColor).mul(BRDF_Lambert({ diffuseColor: diffuseColor.rgb })))
      }
      return lm
    }
  },

  hairCloth(nm, { U, TEXW, TEXH }) {
    const disp = texture(U.clothDisp.value), on = reference('value', 'float', U.clothOn)
    const idx = attribute('clothIdx', 'vec4'), wt = attribute('clothW', 'vec4')
    const at = id => vec2(mod(id, TEXW).add(0.5).div(TEXW), floor(id.div(TEXW)).add(0.5).div(TEXH))
    const d = disp.sample(at(idx.x)).xyz.mul(wt.x).add(disp.sample(at(idx.y)).xyz.mul(wt.y))
      .add(disp.sample(at(idx.z)).xyz.mul(wt.z)).add(disp.sample(at(idx.w)).xyz.mul(wt.w))
    nm.positionNode = (nm.positionNode || positionLocal).add(d.mul(on))
  },

  lace(nm, u, src) {
    const T = uniform(u.uLaceT.value), lining = uniform(u.uLaceLining.value)
    const lm = texture(u.uLaceMask.value, T.mul(vec3(uv(), 1)).xy).rg
    // the lining keeps the garment texture's light and shade (its folds), not its colour
    const lb = src.map ? vec3(dot(texture(src.map).rgb, vec3(0.3, 0.59, 0.11)).mul(1.6)) : vec3(1)
    nm.colorNode = vec4(mix(lining.mul(lb), materialColor.rgb.mul(lm.g), lm.r), materialColor.a)
  },

  pleat(nm, u, src) {
    const C = uniform(u.uPleatC.value), n = reference('value', 'float', u.uPleatN), depth = reference('value', 'float', u.uPleatDepth)
    // the angle round her axis, in the garment's rest coordinates (as the GLSL's)
    const R = positionGeometry.xz.sub(C)
    const pf = fract(atan(R.x, R.y).mul(n).div(6.2831853))
    // the way round her, horizontal and square to the surface: up × normal
    // (the GLSL skins the tangent of the rest pose; a seated skirt's is close to horizontal)
    const base = src.normalMap ? normalMap(texture(src.normalMap), uniform(src.normalScale)) : normalView
    const up = transformDirection(vec3(0, 1, 0), cameraViewMatrix)
    const tv = normalize(cross(up, base).add(1e-6))
    const tilt = select(pf.lessThan(0.82), float(0.35), float(-1.3))
    nm.normalNode = normalize(base.add(tv.mul(tilt).mul(depth)))
    nm.colorNode = vec4(materialColor.rgb.mul(smoothstep(0, 0.12, min(pf, float(0.82).sub(pf).add(0.18))).mul(0.22).add(0.78)), materialColor.a)
  },
}

// Alpha to coverage (the card hair's, the brows'): the WebGL page draws it on its
// multisampled target, which the WebGPU scene pass isn't, so it would come out as a
// hard alpha test. In its place each fragment is kept above the material's alpha test
// where its alpha beats a noise that changes every frame, and TRAA averages the dither
// into the same soft edge (as the strand hair's, pianist/hair-tsl.js)
function ditherCoverage(nm, src) {
  const a = src.map ? texture(src.map).a.mul(materialOpacity) : materialOpacity
  const n = interleavedGradientNoise(screenCoordinate.xy.add(vec2(float(frameId).mul(5.588238), float(frameId).mul(3.13))))
  nm.maskNode = a.greaterThan(max(float(src.alphaTest || 0), n))
  nm.alphaToCoverage = false; nm.alphaTest = 0
}

/** Apply each material's tagged patches as the WebGPU renderer converts it. */
export function installPatches(renderer) {
  const lib = renderer.library, from = lib.fromMaterial.bind(lib)
  lib.fromMaterial = material => {
    const nm = from(material)
    if (nm && !material.isNodeMaterial && material.alphaToCoverage && !material.transparent) ditherCoverage(nm, material)
    const tags = nm && !material.isNodeMaterial ? tslTags(material) : null
    if (tags) for (const [kind, params] of Object.entries(tags)) {
      try { PATCHES[kind]?.(nm, params, material) } catch (e) { console.warn(`tsl-patches: ${kind}:`, e) }
    }
    return nm
  }
}
