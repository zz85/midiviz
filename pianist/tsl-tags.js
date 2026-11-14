// What a material's GLSL patch does, for the renderers that don't run GLSL
// (three.js's WebGPU renderer: pathtrace/live-gpu.js and pathtrace/tsl-patches.js).
//
// A module that patches a material with onBeforeCompile also tags it here, with
// the patch's kind and the uniforms it reads: the WebGPU renderer turns each
// material it draws into a node material and applies the tagged patches in TSL.
// The tags live in a WeakMap, not in userData, which a clone copies through JSON.

const TAGS = new WeakMap()

/** Tag material m with a patch: kind, and what it reads (uniform objects kept by reference). */
export function tagTSL(m, kind, params = {}) {
  const t = TAGS.get(m) || {}
  t[kind] = params
  TAGS.set(m, t)
  if (m.version !== undefined) m.needsUpdate = true
}
/** Take patch kind off m. */
export function untagTSL(m, kind) {
  const t = TAGS.get(m)
  if (t && kind in t) { delete t[kind]; m.needsUpdate = true }
}
/** m's tags, { kind: params }, or null. */
export const tslTags = m => TAGS.get(m) || null
/** Give m the tags of src (a material cloned from src, its patches copied with it). */
export function copyTSL(m, src, kinds = null) {
  const t = TAGS.get(src)
  if (!t) return
  for (const [k, p] of Object.entries(t)) if (!kinds || kinds.includes(k)) tagTSL(m, k, p)
}
