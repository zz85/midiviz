// Experiment #045: the frame as the native renderers read it.
//
// The page's MuTracer engines trace MU.fromTHREEScene(snapshot) — MuTracer's own conversion of the page's
// frozen three.js scene to OpenPBR meshes, lights and textures. This runs that same conversion and writes its
// result out as it stands, so a native renderer traces the scene the page would have traced:
//   scene.json  the objects, with MuTracer's own field names (materials by OpenPBR property name)
//   scene.bin   their arrays and pixels, little-endian, each 4-byte aligned; scene.json refers to them as
//               { o: byte offset, n: element count }
// pathtrace/native/src/bin/mu-trace.rs rebuilds it with native MuTracer (its Scene API, properties set by
// MuTracer's schema); pathtrace/native/threert/midiviz-ir.ts with ThreeRT.
//
//   const { manifest, buffer, stats } = await encodeScene(MU, snapshotScene, MU.fromTHREECamera(camera, lens),
//                                                         { width, height, exposure, toneMapping })

// texture slots MuTracer decodes from sRGB (materialTextureSlots.js); the others read the stored values
const SRGB_SLOTS = new Set(['map', 'emissiveMap', 'fuzzColorMap', 'specularColorMap'])

class BlobWriter {
  chunks = []; size = 0
  put(view) {
    const bytes = new Uint8Array(view.buffer, view.byteOffset, view.byteLength)
    const o = this.size
    this.chunks.push(bytes); this.size += bytes.byteLength
    const pad = (4 - (this.size % 4)) % 4
    if (pad) { this.chunks.push(new Uint8Array(pad)); this.size += pad }
    return { o, n: view.length }
  }
  finish() {
    const out = new Uint8Array(this.size)
    let at = 0
    for (const c of this.chunks) { out.set(c, at); at += c.byteLength }
    return out.buffer
  }
}

const isTexture = v => v && typeof v === 'object' && 'uvScale' in v && 'wrapS' in v
const sourceOf = t => t.pixels ?? t.image

// RGBA8 bytes of an image source exactly as stored (no premultiplication, no colour conversion), rows in the
// image's own order (top first), through a WebGL 2 upload and read-back
let gl = null
function imagePixels(src) {
  const w = src.naturalWidth || src.videoWidth || src.width, h = src.naturalHeight || src.videoHeight || src.height
  gl ||= new OffscreenCanvas(1, 1).getContext('webgl2', { premultipliedAlpha: false })
  const tex = gl.createTexture(), fb = gl.createFramebuffer()
  gl.bindTexture(gl.TEXTURE_2D, tex)
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false)
  gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, src)
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb)
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0)
  const px = new Uint8Array(w * h * 4)
  gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px)
  gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.deleteFramebuffer(fb); gl.deleteTexture(tex)
  return { width: w, height: h, data: px }
}

// (a video's textures stay the same from frame to frame: their pixels are read once, again only when the
// texture's version moves on)
const pixelCache = new WeakMap()
function texturePixels(t) {
  const src = sourceOf(t)
  if (!src || typeof src !== 'object') return readPixels(t)
  const hit = pixelCache.get(src)
  if (hit && hit.version === t.version) return hit.px
  const px = readPixels(t)
  pixelCache.set(src, { version: t.version, px })
  return px
}

/** RGBA pixels of a MuTracer texture: { width, height, data: Uint8Array | Float32Array } */
function readPixels(t) {
  const src = sourceOf(t)
  if (src?.data) {
    const { width, height, data } = src, n = width * height, ch = data.length / n
    if (data instanceof Int32Array) return { width, height, data: Float32Array.from(data) }
    if (ch === 4) return { width, height, data: data instanceof Uint8ClampedArray ? new Uint8Array(data.buffer, data.byteOffset, data.length) : data }
    const out = new data.constructor(n * 4), one = data instanceof Float32Array ? 1 : 255
    for (let i = 0; i < n; i++) for (let c = 0; c < 4; c++) out[i * 4 + c] = c < ch ? data[i * ch + c] : c === 3 ? one : 0
    return { width, height, data: out }
  }
  if (src?.type === 'ProceduralSky' || !src) return null
  return imagePixels(src)
}

const srgbToLinear = c => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4

export async function encodeScene(MU, threeScene, camera, { width, height, exposure = 1, toneMapping = 'agx' } = {}) {
  const t0 = performance.now()
  const s = MU.fromTHREEScene(threeScene)
  const t1 = performance.now()
  const blob = new BlobWriter()
  const leftOut = new Set()
  const textures = new Map(), geometries = new Map(), materials = new Map()
  const out = { format: 'midiviz-mutracer-scene', version: 1, mutracer: MU.VERSION, size: [width, height],
    display: { toneMapping, exposure }, textures: [], geometries: [], materials: [], meshes: [], lights: [], environment: null, background: null }

  // materials first: which slots each texture is read through decides how its pixels go across.
  // Only what differs from a new material goes across: the rest is the schema's default on both sides
  // (and some defaults, such as displacementStepSize 0 for "automatic", are not values native takes)
  const slotsOf = new Map()
  const fresh = new MU.OpenPBRMaterial(), same = (a, b) => a === b || (Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((x, i) => x === b[i]))
  const materialIndex = m => {
    if (materials.has(m)) return materials.get(m)
    const props = {}, maps = {}
    for (const [k, v] of Object.entries(m)) {
      if (k.startsWith('_') || k === 'name' || v == null) continue
      if (isTexture(v)) { maps[k] = v; (slotsOf.get(v) || slotsOf.set(v, new Set()).get(v)).add(k) }
      else if (same(v, fresh[k])) continue
      else if (typeof v === 'number' || typeof v === 'boolean' || typeof v === 'string') props[k] = v
      else if (Array.isArray(v) && v.every(x => typeof x === 'number')) props[k] = [...v]
    }
    const i = out.materials.length
    out.materials.push({ name: m.name || '', props, maps })
    materials.set(m, i)
    return i
  }
  for (const mesh of s.meshes) {
    if (mesh.isInstancedMesh || mesh.instances) { leftOut.add('instanced meshes'); continue }
    for (const m of mesh.materials) materialIndex(m)
  }
  // (a renderer that maps the values itself, as ThreeRT does, needs the defaults the materials leave out)
  out.materialDefaults = Object.fromEntries(Object.entries(fresh).filter(([k, v]) => !k.startsWith('_') && v != null && !isTexture(v) &&
    (['number', 'boolean', 'string'].includes(typeof v) || (Array.isArray(v) && v.every(x => typeof x === 'number')))).map(([k, v]) => [k, Array.isArray(v) ? [...v] : v]))
  for (const l of s.lights) if (l.type === 'RectLight' && l.texture) slotsOf.set(l.texture, slotsOf.get(l.texture) || new Set(['rectLight']))
  for (const l of s.lights) if (l.type === 'EnvironmentLight' && l.map) slotsOf.set(l.map, slotsOf.get(l.map) || new Set(['environment']))
  const bgMap = isTexture(s.background) ? s.background : s.background?.map
  if (bgMap) slotsOf.set(bgMap, slotsOf.get(bgMap) || new Set(['background']))

  // textures: pixels once per image source
  const pixelRefs = new Map(), pixelsOf = new Map()
  let promoted = 0
  const textureIndex = t => {
    if (!t) return null
    if (textures.has(t)) return textures.get(t)
    const px = pixelsOf.has(sourceOf(t)) ? pixelsOf.get(sourceOf(t)) : pixelsOf.set(sourceOf(t), texturePixels(t)).get(sourceOf(t))
    if (!px) { leftOut.add('procedural sky'); return null }
    const float = px.data instanceof Float32Array
    // MuTracer reads a texture as linear when it says so, else when it holds floats (MaterialTable.js);
    // native MuTracer decides by storage alone (bytes sRGB, floats linear), so bytes the page reads as linear
    // through an sRGB slot go across as floats, and floats it reads as sRGB are decoded here
    const linear = t.colorSpace ? t.colorSpace === 'linear' : float
    const srgbSlot = [...(slotsOf.get(t) || [])].some(k => SRGB_SLOTS.has(k))
    const mode = srgbSlot && linear && !float ? 'bytes-as-floats' : srgbSlot && !linear && float ? 'decoded-floats' : 'as-is'
    const src = sourceOf(t), cached = pixelRefs.get(src) || pixelRefs.set(src, {}).get(src)
    if (!cached[mode]) {
      const data = mode === 'bytes-as-floats' ? Float32Array.from(px.data, v => v / 255)
        : mode === 'decoded-floats' ? Float32Array.from(px.data, (v, i) => i % 4 === 3 ? v : srgbToLinear(v)) : px.data
      if (mode === 'bytes-as-floats') promoted++
      cached[mode] = { ...blob.put(data), storage: data instanceof Float32Array ? 'rgba32f' : 'rgba8' }
    }
    const ref = cached[mode]
    const i = out.textures.length
    out.textures.push({ width: px.width, height: px.height, storage: ref.storage, data: { o: ref.o, n: ref.n }, flipY: !!t.flipY, uvChannel: t.uvChannel || 0,
      uvScale: [...t.uvScale], uvOffset: [...t.uvOffset], wrapS: t.wrapS, wrapT: t.wrapT, linear, slots: [...(slotsOf.get(t) || [])] })
    textures.set(t, i)
    return i
  }
  for (const m of out.materials) for (const k of Object.keys(m.maps)) m.maps[k] = textureIndex(m.maps[k])

  const geometryIndex = g => {
    if (geometries.has(g)) return geometries.get(g)
    const f32 = a => a ? (a.array instanceof Float32Array ? a.array : Float32Array.from(a.array)) : null
    const e = { position: blob.put(f32(g.position)), indices: blob.put(g.indices.array instanceof Uint32Array ? g.indices.array : Uint32Array.from(g.indices.array)) }
    for (const k of ['normal', 'tangent', 'uv', 'uv1']) if (g[k]) e[k] = blob.put(f32(g[k]))
    if (g.color) e.color = { ...blob.put(f32(g.color)), itemSize: g.color.itemSize }
    if (g.materialIndex) e.materialIndex = blob.put(Uint32Array.from(g.materialIndex.array))
    const i = out.geometries.length
    out.geometries.push(e); geometries.set(g, i)
    return i
  }
  let triangles = 0
  for (const mesh of s.meshes) {
    if (mesh.isInstancedMesh || mesh.instances) continue
    out.meshes.push({ name: mesh.name || '', geometry: geometryIndex(mesh.geometry), materials: mesh.materials.map(materialIndex), transform: [...mesh.transform] })
    triangles += mesh.geometry.triangleCount
  }

  const T = l => [...l.transform]
  for (const l of s.lights) {
    switch (l.type) {
      case 'SpotLight': out.lights.push({ type: l.type, color: [...l.color], intensity: l.intensity, radius: l.radius, innerAngle: l.innerAngle, outerAngle: l.outerAngle, transform: T(l) }); if (l.iesProfile) leftOut.add('IES profiles'); break
      case 'RectLight': out.lights.push({ type: l.type, color: [...l.color], intensity: l.intensity, size: [...l.size], spread: l.spread, texture: textureIndex(l.texture), transform: T(l) }); break
      case 'SphereLight': out.lights.push({ type: l.type, color: [...l.color], intensity: l.intensity, radius: l.radius, transform: T(l) }); break
      case 'DirectionalLight': out.lights.push({ type: l.type, color: [...l.color], intensity: l.intensity, transform: T(l) }); break
      case 'EnvironmentLight': {
        const m = l.transform
        out.environment = { texture: textureIndex(l.map), intensity: l.intensity, rotation: Math.atan2(-m[2], m[0]) }
        break
      }
      default: out.lights.push({ type: l.type, color: l.color && [...l.color], intensity: l.intensity })
    }
  }
  const bg = s.background
  if (Array.isArray(bg)) out.background = { color: [bg[0], bg[1], bg[2], bg[3] ?? 1] }
  else if (isTexture(bg)) out.background = { texture: textureIndex(bg), intensity: 1, rotation: 0 }
  else if (bg?.type === 'Equirect') out.background = { texture: textureIndex(bg.map), intensity: bg.intensity ?? 1, rotation: bg.transform ? Math.atan2(-bg.transform[2], bg.transform[0]) : 0 }
  else if (bg) leftOut.add('background ' + bg.type)

  const c = camera
  out.camera = { projection: c.projection, fov: c.fov, near: c.near, far: c.far, left: c.left, right: c.right, bottom: c.bottom, top: c.top, zoom: c.zoom,
    fStop: c.fStop, focusDistance: c.focusDistance, sensorHeight: c.sensorHeight, metersPerUnit: c.metersPerUnit, aspect: width / height, transform: [...c.transform] }
  out.leftOut = [...leftOut]
  const buffer = blob.finish()
  const stats = { meshes: out.meshes.length, triangles, materials: out.materials.length, textures: out.textures.length, lights: out.lights.length,
    floatTextures: promoted, megabytes: +(buffer.byteLength / 1e6).toFixed(1), convertMs: Math.round(t1 - t0), encodeMs: Math.round(performance.now() - t1) }
  out.stats = stats
  return { manifest: JSON.stringify(out), buffer, stats }
}
