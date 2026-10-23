// Experiment #045: a frozen copy of the live #032 stage for a path tracer.
//
// Both path tracers take a three.js scene, but neither runs the page's own
// shaders, so the stage is baked into plain parts that they both read the
// same way:
//  • every visible mesh as a static Mesh in world space: skinning and morph
//    targets applied on the CPU (as the GPU does: bindMatrixInverse ·
//    Σ w·boneMatrix · bindMatrix, normals by the same 3×3), instanced meshes
//    expanded, only position / normal / uv / color kept;
//  • materials as MeshStandard / MeshPhysical without their onBeforeCompile
//    patches (the skin's wrapped diffuse, outlines, hair-as-cloth offsets),
//    MeshBasic as emissive; anything else the page draws with its own shader
//    is left out and listed (dust motes, the lesson lane, the ink outlines);
//  • the fallboard mirror (a Reflector) as the black lacquer it stands for:
//    a path tracer reflects the keys itself;
//  • the strand hair from pianist/hair.js bakeStrands(): its vertex shader
//    run on the CPU, ribbons facing the camera;
//  • lights in world space, physically: the page's lights have no falloff
//    (decay 0), which MuTracer cannot do, so each becomes an inverse-square
//    light whose intensity is the page's at the point it aims at, with a
//    small radius (soft shadow edges) — the same lights for both tracers;
//  • the environment: the page lights reflections from a PMREM of a few
//    emissive panels around the stage; here the same panels are ray cast
//    into a float equirectangular map (what both tracers sample with MIS),
//    scaled by scene.environmentIntensity.
// Units stay the page's (centimetres).

import * as THREE from 'three'
// (lace's lining is a shader mix: its baked texture stands in for map × colour)
import { traceMapOf } from '../pianist/fabric.js'

const _v = new THREE.Vector3(), _n = new THREE.Vector3(), _m = new THREE.Matrix4(), _m3 = new THREE.Matrix3()

function visibleChain(o) { for (let x = o; x; x = x.parent) if (!x.visible) return false; return true }

/** position (and normal) of a skinned / morphed mesh, in its local space, as the GPU computes them */
function deform(mesh, pos = null, nor = null) {
  const g = mesh.geometry, P = g.attributes.position, Nn = g.attributes.normal
  const n = P.count
  pos ||= new Float32Array(n * 3); if (Nn) nor ||= new Float32Array(n * 3); else nor = null
  const morphP = g.morphAttributes.position, morphN = g.morphAttributes.normal, inf = mesh.morphTargetInfluences
  const rel = g.morphTargetsRelative
  const skinned = mesh.isSkinnedMesh && g.attributes.skinIndex
  if (skinned) mesh.skeleton.update()
  const SI = skinned && g.attributes.skinIndex, SW = skinned && g.attributes.skinWeight
  const bones = skinned && mesh.skeleton.boneMatrices
  const skin = new THREE.Matrix4(), bm = new THREE.Matrix4(), tmp = new THREE.Matrix4()
  const bind = mesh.bindMatrix, bindInv = mesh.bindMatrixInverse
  for (let i = 0; i < n; i++) {
    _v.fromBufferAttribute(P, i)
    if (Nn) _n.fromBufferAttribute(Nn, i)
    if (morphP && inf) {
      const base = _v.clone(), baseN = Nn ? _n.clone() : null
      let sum = 0
      for (let k = 0; k < morphP.length; k++) {
        const w = inf[k]; if (!w) continue
        sum += w
        const a = morphP[k]
        if (rel) _v.x += a.getX(i) * w, _v.y += a.getY(i) * w, _v.z += a.getZ(i) * w
        else _v.x += (a.getX(i) - base.x) * w, _v.y += (a.getY(i) - base.y) * w, _v.z += (a.getZ(i) - base.z) * w
        if (Nn && morphN?.[k]) {
          const b = morphN[k]
          if (rel) _n.x += b.getX(i) * w, _n.y += b.getY(i) * w, _n.z += b.getZ(i) * w
          else _n.x += (b.getX(i) - baseN.x) * w, _n.y += (b.getY(i) - baseN.y) * w, _n.z += (b.getZ(i) - baseN.z) * w
        }
      }
    }
    if (skinned) {
      const e = skin.elements; e.fill(0)
      for (let k = 0; k < 4; k++) {
        const w = SW.getComponent(i, k); if (!w) continue
        const b = SI.getComponent(i, k) * 16
        for (let j = 0; j < 16; j++) e[j] += bones[b + j] * w
      }
      tmp.multiplyMatrices(bindInv, skin).multiply(bind)
      _v.applyMatrix4(tmp)
      if (Nn) _n.applyMatrix3(_m3.setFromMatrix4(tmp))
    }
    _v.toArray(pos, i * 3)
    if (Nn) _n.normalize().toArray(nor, i * 3)
  }
  return { pos, nor }
}

/** a plain geometry with only what a path tracer reads */
function plainGeometry(src, pos, nor, withColor, multi = false) {
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(pos || src.attributes.position.array.slice?.() || src.attributes.position.array, 3))
  if (nor) g.setAttribute('normal', new THREE.BufferAttribute(nor, 3))
  else if (src.attributes.normal) g.setAttribute('normal', src.attributes.normal.clone())
  if (src.attributes.uv) g.setAttribute('uv', src.attributes.uv.clone())
  if (withColor && src.attributes.color) g.setAttribute('color', src.attributes.color.clone())
  if (src.index) g.setIndex(src.index.clone())
  // (groups only for a material array: with one material three draws every
  // group with it, a path tracer would index past it)
  if (multi) for (const gr of src.groups) g.addGroup(gr.start, gr.count, gr.materialIndex)
  if (!g.attributes.normal) g.computeVertexNormals()
  return g
}

// keep: the cache's map (source material → its conversion), kept across frames
// and refreshed from the source each frame (so a colour or texture change shows)
function convertMaterial(m, seen, skipped, keep = null) {
  if (seen.has(m)) return seen.get(m)
  const prev = keep?.get(m) ?? null
  let out = null
  if (m.colorWrite === false || m.visible === false) out = null
  else if (m.isMeshStandardMaterial) {
    out = prev?.type === m.type ? prev.copy(m) : m.clone()
    out.onBeforeCompile = () => {}; out.customProgramCacheKey = () => ''
    out.defines = {}
  } else if (m.isMeshBasicMaterial) {
    out = prev?.isMeshStandardMaterial ? prev : new THREE.MeshStandardMaterial()
    out.setValues({ color: 0x000000, emissive: m.color, emissiveMap: m.map, emissiveIntensity: 1, roughness: 1, metalness: 0,
      alphaMap: m.alphaMap, transparent: m.transparent, opacity: m.opacity, side: m.side, alphaTest: m.alphaTest, vertexColors: m.vertexColors })
    out.map = m.map || null   // (its alpha)
  } else if (m.isMeshLambertMaterial || m.isMeshPhongMaterial || m.isMeshToonMaterial) {
    out = prev?.isMeshStandardMaterial ? prev : new THREE.MeshStandardMaterial()
    out.setValues({ color: m.color, map: m.map, normalMap: m.normalMap, roughness: m.isMeshPhongMaterial ? Math.max(0.15, 1 - Math.sqrt(m.shininess / 200)) : 0.85, metalness: 0,
      emissive: m.emissive, emissiveMap: m.emissiveMap, alphaMap: m.alphaMap, transparent: m.transparent, opacity: m.opacity, side: m.side, alphaTest: m.alphaTest, vertexColors: m.vertexColors })
  } else skipped.add(m.type + (m.name ? ` (${m.name})` : ''))
  const baked = out && m.userData.traceMap ? traceMapOf(m) : null
  if (baked) { out.map = baked; out.color.set(0xffffff) }
  if (prev && prev !== out) prev.dispose()
  if (keep) { if (out) keep.set(m, out); else keep.delete(m) }
  seen.set(m, out)
  return out
}
const HIDDEN = new THREE.MeshStandardMaterial({ visible: false })   // (an empty slot in a material array)
const LACQUER = { color: 0x050505, roughness: 0.04, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.02 }

/**
 * Keeps the copied stage from one frame to the next (a video):
 *  • a mesh whose geometry has not changed (the hall, the case, the strings,
 *    the keys, hammers and lid, which only move) keeps its copy, so the BVH a
 *    tracer hung on it (geometry.boundsTree) is reused and only its matrix is new;
 *  • a mesh that deforms (her body and face, skinned or morphed; the cloth,
 *    moved on the CPU) gets its new vertices written into the same copy and
 *    its BVH refitted, rebuilt from scratch every `rebuildEvery` frames (a
 *    refitted tree is correct but slowly gets looser as she moves);
 *  • an instanced mesh (the strings, pins) is expanded once, again only when
 *    its instances or its place change;
 *  • materials are converted once and refreshed from the page's each frame.
 * The hair ribbons (they face the camera) and the lights are made every frame.
 *   const cache = createSnapshotCache()
 *   snapshotScene(scene, { ..., cache })  ·  disposeSnapshot(snap) (the frame's own parts)  ·  cache.dispose()
 */
export function createSnapshotCache({ rebuildEvery = 30 } = {}) {
  const meshes = new Map(), mats = new Map(), lacquer = new THREE.MeshPhysicalMaterial(LACQUER)
  return {
    meshes, mats, lacquer, rebuildEvery,
    dispose() {
      for (const e of meshes.values()) { e.mesh.geometry.boundsTree = null; e.mesh.geometry.dispose() }
      for (const m of mats.values()) m.dispose()
      lacquer.dispose()
      meshes.clear(); mats.clear()
    },
  }
}

// a copy's vertices replaced in place (same counts): uploads, bounds and the BVH
function refreshed(g, e, cache) {
  for (const k of ['position', 'normal', 'color']) if (g.attributes[k]) g.attributes[k].needsUpdate = true
  // (three-gpu-pathtracer computes tangents once, from the vertices: again)
  if (g.attributes.tangent) g.deleteAttribute('tangent')
  g.computeBoundingBox(); g.computeBoundingSphere()
  if (g.boundsTree) {
    if (++e.refits >= cache.rebuildEvery) { g.boundsTree = null; e.refits = 0 }
    else g.boundsTree.refit()
  }
}

/** an instanced mesh as one merged geometry in world space */
function expandInstances(o) {
  const src = o.geometry, n = o.count, P = src.attributes.position, Nn = src.attributes.normal, UV = src.attributes.uv
  const vc = P.count, pos = new Float32Array(n * vc * 3), nor = new Float32Array(n * vc * 3), uv = UV ? new Float32Array(n * vc * 2) : null
  const ix = src.index ? src.index.array : null, idx = new Uint32Array(n * (ix ? ix.length : vc))
  const im = new THREE.Matrix4()
  for (let k = 0; k < n; k++) {
    o.getMatrixAt(k, im); _m.multiplyMatrices(o.matrixWorld, im); _m3.getNormalMatrix(_m)
    for (let i = 0; i < vc; i++) {
      _v.fromBufferAttribute(P, i).applyMatrix4(_m).toArray(pos, (k * vc + i) * 3)
      if (Nn) _n.fromBufferAttribute(Nn, i).applyMatrix3(_m3).normalize().toArray(nor, (k * vc + i) * 3)
      if (uv) { uv[(k * vc + i) * 2] = UV.getX(i); uv[(k * vc + i) * 2 + 1] = UV.getY(i) }
    }
    if (ix) for (let i = 0; i < ix.length; i++) idx[k * ix.length + i] = ix[i] + k * vc
    else for (let i = 0; i < vc; i++) idx[k * vc + i] = k * vc + i
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3))
  if (uv) g.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
  g.setIndex(new THREE.BufferAttribute(idx, 1))
  if (!Nn) g.computeVertexNormals()
  return g
}

/** the env panels (MeshBasic planes around the origin) ray cast into an equirect float map */
export function bakeEnvironment(envScene, { width = 512, height = 256, intensity = 1, origin = new THREE.Vector3() } = {}) {
  envScene.updateMatrixWorld(true)
  const meshes = []; envScene.traverse(o => { if (o.isMesh) meshes.push(o) })
  const bg = envScene.background?.isColor ? envScene.background : new THREE.Color(0)
  const ray = new THREE.Raycaster(); ray.near = 0; ray.far = 1e7
  const data = new Float32Array(width * height * 4), d = new THREE.Vector3()
  for (let j = 0; j < height; j++) {
    const th = ((j + 0.5) / height - 0.5) * Math.PI
    for (let i = 0; i < width; i++) {
      const ph = ((i + 0.5) / width - 0.5) * Math.PI * 2
      d.set(Math.cos(th) * Math.cos(ph), Math.sin(th), Math.cos(th) * Math.sin(ph))
      ray.set(origin, d)
      const hit = ray.intersectObjects(meshes, false)[0]
      const c = hit ? hit.object.material.color : bg, k = (j * width + i) * 4
      data[k] = c.r * intensity; data[k + 1] = c.g * intensity; data[k + 2] = c.b * intensity; data[k + 3] = 1
    }
  }
  const tex = new THREE.DataTexture(data, width, height, THREE.RGBAFormat, THREE.FloatType)
  tex.mapping = THREE.EquirectangularReflectionMapping
  tex.colorSpace = THREE.LinearSRGBColorSpace
  tex.minFilter = tex.magFilter = THREE.LinearFilter
  tex.generateMipmaps = false
  tex.needsUpdate = true
  return tex
}

/**
 * live: the page's scene; camera: the camera to render from (its world
 * position faces the hair ribbons); hair: the strand hair (pianist/hair.js) or
 * null; envScene / envIntensity: the panels behind scene.environment;
 * hairFraction: share of the strands kept; lightRadius (cm).
 */
export function snapshotScene(live, opts = {}) {
  const { camera, hair = null, envScene = null, envIntensity = live.environmentIntensity ?? 1, envMap = null,
    hairFraction = 0.5, hairSegments = 12, lightRadius = 6 } = opts
  const t0 = performance.now()
  live.updateMatrixWorld(true)
  const out = new THREE.Scene()
  out.background = new THREE.Color(0x000000)
  const seen = new Map(), skipped = new Set(), stats = { meshes: 0, triangles: 0, lights: 0, strands: 0, skipped: [] }
  const cache = opts.cache || null, keep = cache?.mats ?? null
  if (cache) stats.cache = { reused: 0, refreshed: 0, built: 0, builtTriangles: 0 }
  const owned = []   // textures made here (disposeSnapshot frees them; the live scene's own are shared)
  const transient = { geometries: [], materials: [] }   // with a cache: this frame's own parts
  const hairShader = hair?.kind === 'strands' ? hair.object : null
  const tris = g => (g.index ? g.index.count : g.attributes.position.count) / 3
  const add = (geo, mat, matrix, mesh = null) => {
    const m = mesh || new THREE.Mesh(geo, mat)
    if (mesh) m.material = mat
    if (matrix) { m.matrixAutoUpdate = false; m.matrix.copy(matrix); m.matrixWorld.copy(matrix) }
    out.add(m); stats.meshes++
    stats.triangles += tris(m.geometry)
    return m
  }
  // a live mesh's copy: reused as it is, refreshed in place, or (re)built
  //   shape: what forces a rebuild; data: what a refresh brings up to date
  //   (null: refresh every frame, e.g. skinned); build(): the new geometry;
  //   fill(g): writes the current vertices into g
  function copyOf(o, mat, matrix, shape, data, build, fill) {
    let e = cache?.meshes.get(o)
    if (e && e.shape === shape && e.mesh.geometry && (data != null && e.data === data)) { stats.cache.reused++; return add(null, mat, matrix, e.mesh) }
    if (e && e.shape === shape && fill) {
      fill(e.mesh.geometry); refreshed(e.mesh.geometry, e, cache); e.data = data
      stats.cache.refreshed++
      return add(null, mat, matrix, e.mesh)
    }
    const geo = build()
    if (!cache) { transient.geometries.push(geo); return add(geo, mat, matrix) }
    if (e) { e.mesh.geometry.boundsTree = null; e.mesh.geometry.dispose() }
    const mesh = add(geo, mat, matrix)
    cache.meshes.set(o, { mesh, shape, data, refits: 0 })
    stats.cache.built++; stats.cache.builtTriangles += tris(geo)
    return mesh
  }
  const ver = a => a ? a.version : -1
  live.traverse(o => {
    if (!visibleChain(o)) return
    if (o.isLight) return lightOf(o)
    if (!o.isMesh || o.isPoints || o.isLine || o.isSprite) return
    if (o.userData.outline) { skipped.add('ink outline'); return }
    // additive glows (the candle chamber's floor pools): painted-on light for the
    // raster page. A tracer computes the real pools, and neither blends: three-gpu-
    // pathtracer drew each as a hard-edged disc over the floor
    if (!o.isReflector && [o.material].flat().some(m => m?.blending === THREE.AdditiveBlending)) { skipped.add('additive glow'); return }
    if (hairShader && o.parent === hairShader) return   // (the ribbons below; the shadow proxy)
    const G = o.geometry, A = G.attributes
    if (o.isReflector) {
      // the fallboard mirror: black lacquer
      const mat = cache ? cache.lacquer : new THREE.MeshPhysicalMaterial(LACQUER)
      if (!cache) transient.materials.push(mat)
      copyOf(o, mat, o.matrixWorld, `r|${G.id}`, `${ver(A.position)}`, () => plainGeometry(G))
      return
    }
    const srcMats = Array.isArray(o.material) ? o.material : [o.material]
    const mats = srcMats.map(m => convertMaterial(m, seen, skipped, keep))
    if (mats.every(m => !m)) return
    if (!cache) for (const m of mats) if (m && !transient.materials.includes(m)) transient.materials.push(m)
    const multi = Array.isArray(o.material)
    const mat = multi ? mats.map(m => m || HIDDEN) : mats[0]
    const withColor = mats.some(m => m?.vertexColors)
    if (o.isInstancedMesh) {
      // expanded: one merged geometry in world space
      const where = `${o.count}|${ver(o.instanceMatrix)}|${o.matrixWorld.elements.join(',')}`
      copyOf(o, multi ? mat[0] : mat, null, `i|${G.id}|${where}`, '', () => expandInstances(o))
      return
    }
    const moving = (o.isSkinnedMesh && A.skinIndex) || (G.morphAttributes.position && o.morphTargetInfluences?.some(w => w))
    const shape = `${moving ? 'd' : 's'}|${G.id}|${A.position.count}|${ver(G.index)}|${+multi}|${+withColor}`
    if (moving) {
      copyOf(o, mat, o.matrixWorld, shape, null,
        () => { const { pos, nor } = deform(o); return plainGeometry(G, pos, nor, withColor, multi) },
        g => { deform(o, g.attributes.position.array, g.attributes.normal?.array); if (withColor && A.color && g.attributes.color) g.attributes.color.array.set(A.color.array) })
    } else {
      // static (or moved on the CPU, as the cloth): a copy of its arrays
      copyOf(o, mat, o.matrixWorld, shape, `${ver(A.position)}|${ver(A.normal)}|${ver(A.color)}`,
        () => plainGeometry(G, A.position.array.slice(), A.normal?.array.slice(), withColor, multi),
        g => {
          g.attributes.position.array.set(A.position.array)
          if (A.normal && g.attributes.normal) g.attributes.normal.array.set(A.normal.array)
          if (withColor && A.color && g.attributes.color) g.attributes.color.array.set(A.color.array)
        })
    }
  })

  function lightOf(l) {
    if (!l.intensity) return
    const p = l.getWorldPosition(new THREE.Vector3())
    if (l.isSpotLight || l.isPointLight) {
      const target = l.isSpotLight ? l.target.getWorldPosition(new THREE.Vector3()) : null
      const L = l.isSpotLight ? new THREE.SpotLight(l.color, l.intensity, 0, l.angle, l.penumbra, 2) : new THREE.PointLight(l.color, l.intensity, 0, 2)
      // no falloff on the page: the same brightness where it aims (spots) or 3 m away (points)
      if (!l.decay) L.intensity = l.intensity * (target ? p.distanceToSquared(target) : 300 * 300)
      L.position.copy(p)
      L.radius = lightRadius; L.userData.mutracerRadius = lightRadius
      out.add(L)
      if (target) { L.target.position.copy(target); out.add(L.target) }
    } else if (l.isRectAreaLight) {
      const L = new THREE.RectAreaLight(l.color, l.intensity, l.width, l.height)
      const s = new THREE.Vector3(), q = new THREE.Quaternion()
      l.matrixWorld.decompose(L.position, q, s)
      L.quaternion.copy(q); L.width = l.width * s.x; L.height = l.height * s.y
      out.add(L)
    } else if (l.isDirectionalLight) {
      const L = new THREE.DirectionalLight(l.color, l.intensity)
      L.position.copy(p); L.target.position.copy(l.target.getWorldPosition(new THREE.Vector3())); out.add(L, L.target)
    } else if (l.isAmbientLight) out.add(new THREE.AmbientLight(l.color, l.intensity))
    else return skipped.add(l.type)
    stats.lights++
  }

  if (hairShader && hair.bakeStrands) {
    const cam = camera.getWorldPosition(new THREE.Vector3())
    const { geometry, strands, map } = hair.bakeStrands(cam, { fraction: hairFraction, segments: hairSegments, widthScale: 0.8 / Math.sqrt(hairFraction) })
    stats.strands = strands
    owned.push(map)
    // (the colour from the map, not the vertex colours: MuTracer drops those)
    const hm = new THREE.MeshPhysicalMaterial({ map, roughness: 0.42, metalness: 0, sheen: 0.4, sheenRoughness: 0.5, sheenColor: 0x806040, side: THREE.DoubleSide, specularIntensity: 0.6 })
    transient.geometries.push(geometry); transient.materials.push(hm)
    add(geometry, hm, null)
  }

  if (envMap) out.environment = envMap
  else if (envScene) owned.push(out.environment = bakeEnvironment(envScene, { intensity: envIntensity }))
  out.environmentIntensity = 1
  out.updateMatrixWorld(true)
  for (const c of out.children) if (!c.matrixAutoUpdate) c.matrixWorld.copy(c.matrix)
  stats.skipped = [...skipped]
  stats.ms = Math.round(performance.now() - t0)
  return { scene: out, stats, owned, transient }
}

/**
 * Frees a snapshot once traced: the geometries (and the BVH a tracer hung on
 * them, geometry.boundsTree), materials (copies; the textures they share with
 * the live scene stay) and textures it made for this frame alone. Without a
 * cache that is all of it; with one, what the cache keeps stays (its dispose()).
 */
export function disposeSnapshot(snap) {
  for (const g of snap.transient.geometries) { g.boundsTree = null; g.dispose() }
  for (const m of snap.transient.materials) m.dispose()
  for (const t of snap.owned || []) t.dispose()
  snap.scene.clear()
}

/** a camera for the tracer: the page camera's lens and place (with the zoom folded into the fov) */
export function snapshotCamera(cam, aspect) {
  const c = new THREE.PerspectiveCamera(cam.fov, aspect ?? cam.aspect, cam.near, cam.far)
  if (cam.zoom !== 1) c.fov = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2) / cam.zoom))
  cam.updateMatrixWorld(true)
  cam.matrixWorld.decompose(c.position, c.quaternion, c.scale)
  c.updateProjectionMatrix(); c.updateMatrixWorld(true)
  return c
}
