// #038 Duo on three.js's WebGPU renderer (?gpu=webgpu, the hall alone): the same
// renderer and post chain as #045's (pathtrace/live-gpu.js), with the duo's own
// materials in place of the GLSL ones WebGPU can't run:
//  • the VRoid models' MToon as three-vrm's MToonNodeMaterial (violinist/vrm-materials.js),
//    marked as MToon so the page's own tuning (tuneMToon, the ink's width, her hands'
//    skin) finds it as before;
//  • the violin's and bow's ink (violinist/stage.js) and the cel patches as TSL
//    (pathtrace/tsl-patches.js).
// The park (#051) keeps WebGL: its sky, grass and painterly finish are GLSL passes.

import { setMToonMaterialType } from '../violinist/vrm-materials.js'

/** The WebGPU renderer, with the models' MToon set to load as node materials. */
export async function createRenderer() {
  const { MToonNodeMaterial } = await import('@pixiv/three-vrm/nodes')
  class MToonNode extends MToonNodeMaterial { get isMToonMaterial() { return true } }
  setMToonMaterialType(MToonNode)
  const GPU = await import('../pathtrace/live-gpu.js')
  const renderer = await GPU.createLiveGPU()
  const TG = await import('three/webgpu')
  return { renderer, GPU, TG }
}

/**
 * The post chain for the duo: SSGI, SSR, TRAA and the grade, without the depth of
 * field and the bloom (the WebGL page has neither). draw() renders a frame.
 */
export function duoPost({ renderer, GPU }, scene, camera, { offscreen = false, grade = 'stage', quality = 'medium' } = {}) {
  const live = GPU.livePost(renderer, scene, camera, { offscreen })
  live.bokeh.enabled = false; live.bloom.enabled = false
  live.grain.uniforms.uAmount.value = 0; live.grain.uniforms.uVig.value = 0
  live.fx.grade(grade); live.fx.setQuality(quality)
  // addDisplay: the stage's pool of light on the boards, added on the encoded picture as the
  // WebGL canvas adds it (pathtrace/live-gpu.js)
  return { live, draw: () => live.composer.render(), setSize: (w, h) => live.composer.setSize(w, h), addDisplay: m => live.addDisplay(m) }
}
