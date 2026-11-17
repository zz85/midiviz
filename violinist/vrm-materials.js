// Which material class the VRoid models' MToon is loaded as (pianist/alt-model.js,
// violinist/character.js): three-vrm's GLSL MToonMaterial for the WebGL renderer,
// or its MToonNodeMaterial for three.js's WebGPU renderer, which runs no GLSL
// (@pixiv/three-vrm's nodes build, which the page then imports). A page that
// draws with WebGPU sets it before it loads a model.

let materialType = null

/** The MToon material class to load the models with (null: three-vrm's own, GLSL). */
export function setMToonMaterialType(type) { materialType = type }

/** The VRMLoaderPlugin options for a loader's parser, with the class set above. */
export function vrmPluginOptions(mod, parser) {
  return materialType ? { mtoonMaterialPlugin: new mod.MToonMaterialLoaderPlugin(parser, { materialType }) } : undefined
}
