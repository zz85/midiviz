// The Experiment #032 pianist: loads the MakeHuman-derived character built by
// pianist/build/build-character.mjs and turns it into three.js meshes on one
// skeleton.
//
// Coordinates: the build writes the figure standing on y = 0 facing +z; the
// loader turns it round (x → -x, z → -z) so it faces the keyboard in the
// piano's frame (keys at z ≤ 0, the pianist at +z), in centimetres. Bones are
// a real hierarchy (MakeHuman's 163-bone default rig); rig.js poses them.
//
// Materials:
//  • skin — MeshPhysicalMaterial on MakeHuman's young light-skinned female
//    diffuse, with a fine procedural pore normal map, a little sheen for the
//    peach fuzz the rim light catches, and a wrapped, red-shifted diffuse
//    term (light bleeds past the terminator further in red than in blue: the
//    cheap stand-in for subsurface scattering);
//  • eyes — the high-poly eye proxy with a wet clearcoat;
//  • eyebrows and eyelashes — alpha-tested cards, tinted to the hair.

import * as THREE from 'three'

const SKIN_WRAP = /* glsl */`
#ifdef SKIN_WRAP
  {
    float nl = dot( geometryNormal, directLight.direction );
    vec3 w = vec3( 0.5, 0.24, 0.16 );
    vec3 wd = clamp( ( vec3( nl ) + w ) / ( 1.0 + w ), 0.0, 1.0 );
    wd *= wd * ( 3.0 - 2.0 * wd ) * 0.35 + 0.65;   // soften the falloff a little
    reflectedLight.directDiffuse += wd * directLight.color * BRDF_Lambert( material.diffuseColor );
  }
#else
  reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
#endif
`

/** Patch a physical material so its direct diffuse wraps like skin. */
export function useSkinWrap(material) {
  const prev = material.onBeforeCompile
  material.onBeforeCompile = (shader, r) => {
    prev?.(shader, r)
    shader.fragmentShader = shader.fragmentShader.replace('#include <lights_physical_pars_fragment>',
      THREE.ShaderChunk.lights_physical_pars_fragment.replace(
        'reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );', SKIN_WRAP))
  }
  material.defines = { ...(material.defines || {}), SKIN_WRAP: '' }
  const key = material.customProgramCacheKey?.bind(material)
  material.customProgramCacheKey = () => (key ? key() : '') + '|skinwrap'
  return material
}

// Tiling pore / fine-wrinkle normal map (canvas): many small dimples and a
// faint cross-hatch, converted from a height field.
function poreNormalMap(size = 512, seed = 7) {
  let s = seed
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647
  const H = new Float32Array(size * size)
  const add = (cx, cy, r, d) => {
    const r2 = r * r
    for (let y = Math.floor(cy - r); y <= cy + r; y++) for (let x = Math.floor(cx - r); x <= cx + r; x++) {
      const dx = x - cx, dy = y - cy, q = (dx * dx + dy * dy) / r2
      if (q >= 1) continue
      const xx = (x + size) % size, yy = (y + size) % size
      H[yy * size + xx] -= d * (1 - q) * (1 - q)
    }
  }
  for (let i = 0; i < 5200; i++) add(rnd() * size, rnd() * size, 1.2 + rnd() * 1.8, 0.6 + rnd() * 0.6)
  // fine lines
  for (let i = 0; i < 260; i++) {
    let x = rnd() * size, y = rnd() * size
    const a = (rnd() < 0.5 ? 0.6 : 2.2) + rnd() * 0.4, len = 10 + rnd() * 30
    for (let k = 0; k < len; k++) { add(x, y, 1.1, 0.12); x += Math.cos(a); y += Math.sin(a) }
  }
  const c = document.createElement('canvas'); c.width = c.height = size
  const g = c.getContext('2d'), img = g.createImageData(size, size)
  const h = (x, y) => H[((y + size) % size) * size + ((x + size) % size)]
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const nx = (h(x - 1, y) - h(x + 1, y)) * 0.9, ny = (h(x, y - 1) - h(x, y + 1)) * 0.9
    const l = Math.hypot(nx, ny, 1), i = (y * size + x) * 4
    img.data[i] = (nx / l * 0.5 + 0.5) * 255; img.data[i + 1] = (ny / l * 0.5 + 0.5) * 255; img.data[i + 2] = (1 / l * 0.5 + 0.5) * 255; img.data[i + 3] = 255
  }
  g.putImageData(img, 0, 0)
  const t = new THREE.CanvasTexture(c)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.colorSpace = THREE.NoColorSpace
  return t
}

const flip = (a, n = 3) => { for (let i = 0; i < a.length; i += n) { a[i] = -a[i]; a[i + 2] = -a[i + 2] } return a }

/**
 * Load the character. base: URL of the assets folder.
 * Returns { group, skeleton, bones, byName, meshes, materials, meta, parts }.
 */
export async function loadCharacter(base = new URL('./assets/', import.meta.url).href, { hairColor = 0x4a3324 } = {}) {
  const [meta, bin] = await Promise.all([
    fetch(base + 'character.json').then(r => r.json()),
    fetch(base + 'character.bin').then(r => r.arrayBuffer()),
  ])
  // community parts live in their own .bin files, fetched on demand (ensurePart)
  const bins = {}
  const arr = (T, ref, name) => new T(bins[name] || bin, ref.offset, ref.length)
  const tl = new THREE.TextureLoader()
  const tex = (f, srgb = true) => new Promise(res => tl.load(base + f, t => { if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; res(t) }, undefined, () => res(null)))
  const [skinMap, eyeMap, browMap, lashMap] = await Promise.all([tex('skin.jpg'), tex('eye.png'), tex('eyebrow.png'), tex('eyelashes.png')])
  for (const t of [skinMap, eyeMap, browMap, lashMap]) if (t) t.flipY = true

  // ── Skeleton (rest pose, turned to face -z) ──
  const bones = [], byName = {}, restWorld = []
  const m = new THREE.Matrix4(), inv = new THREE.Matrix4()
  for (const b of meta.bones) {
    const x = new THREE.Vector3(-b.x[0], b.x[1], -b.x[2]), y = new THREE.Vector3(-b.y[0], b.y[1], -b.y[2]), z = new THREE.Vector3(-b.z[0], b.z[1], -b.z[2])
    const head = new THREE.Vector3(-b.head[0], b.head[1], -b.head[2])
    const W = new THREE.Matrix4().makeBasis(x, y, z).setPosition(head)
    restWorld.push(W)
    const bone = new THREE.Bone()
    bone.name = b.name
    if (b.parent >= 0) { inv.copy(restWorld[b.parent]).invert(); m.multiplyMatrices(inv, W) } else m.copy(W)
    m.decompose(bone.position, bone.quaternion, bone.scale)
    if (b.parent >= 0) bones[b.parent].add(bone)
    bones.push(bone); byName[b.name] = bone
  }
  const group = new THREE.Group()
  group.name = 'pianist'
  group.add(bones[0])
  group.updateMatrixWorld(true)
  const skeleton = new THREE.Skeleton(bones)

  // ── Geometry ──
  const parts = {}
  function geometry(name) {
    const p = meta.parts[name]
    const g = new THREE.BufferGeometry()
    const a = (T, ref) => arr(T, ref, name).slice()
    g.setAttribute('position', new THREE.BufferAttribute(flip(a(Float32Array, p.position)), 3))
    g.setAttribute('uv', new THREE.BufferAttribute(a(Float32Array, p.uv), 2))
    g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(a(Uint16Array, p.skinIndex), 4))
    g.setAttribute('skinWeight', new THREE.BufferAttribute(a(Float32Array, p.skinWeight), 4))
    g.setIndex(new THREE.BufferAttribute(p.indexType === 'u32' ? a(Uint32Array, p.index) : a(Uint16Array, p.index), 1))
    // smooth normals across UV seams: average by position
    g.computeVertexNormals()
    weldNormals(g)
    parts[name] = { geometry: g, source: arr(Uint16Array, p.source, name).slice() }
    return g
  }

  const hair = new THREE.Color(hairColor)
  const skin = useSkinWrap(new THREE.MeshPhysicalMaterial({
    map: skinMap, roughness: 0.52, metalness: 0,
    normalMap: poreNormalMap(), normalScale: new THREE.Vector2(0.22, 0.22),
    sheen: 0.35, sheenRoughness: 0.45, sheenColor: new THREE.Color(0xffd8c4),
    specularIntensity: 0.55, specularColor: new THREE.Color(0xffffff),
  }))
  skin.normalMap.repeat.set(36, 36)
  skin.color.setRGB(1.0, 0.94, 0.9)
  const eye = new THREE.MeshPhysicalMaterial({ map: eyeMap, alphaTest: 0.5, roughness: 0.35, clearcoat: 1, clearcoatRoughness: 0.03 })
  const brow = new THREE.MeshStandardMaterial({ map: browMap, color: hair.clone().multiplyScalar(0.7), alphaTest: 0.25, transparent: true, depthWrite: false, roughness: 0.8, polygonOffset: true, polygonOffsetFactor: -2 })
  const lash = new THREE.MeshStandardMaterial({ map: lashMap, color: 0x120c08, alphaTest: 0.2, transparent: true, depthWrite: false, side: THREE.DoubleSide, roughness: 0.7 })

  const mk = (name, mat, shadow = true) => {
    const mesh = new THREE.SkinnedMesh(geometry(name), mat)
    mesh.name = name
    mesh.castShadow = shadow; mesh.receiveShadow = true
    mesh.frustumCulled = false
    group.add(mesh)
    mesh.bind(skeleton, new THREE.Matrix4())
    return mesh
  }
  const meshes = {
    body: mk('body', skin),
    eyes: mk('eyes', eye),
    eyebrows: mk('eyebrows', brow, false),
    eyelashes: mk('eyelashes', lash, false),
  }
  meshes.eyebrows.renderOrder = 2; meshes.eyelashes.renderOrder = 3
  // helper shells (hair roots, dress): geometry only, not rendered
  for (const h of ['helper_hair', 'helper_tights', 'helper_skirt']) geometry(h)

  // joints as world positions in the rest pose (turned round)
  const joints = {}
  for (const [k, v] of Object.entries(meta.joints)) joints[k] = new THREE.Vector3(-v[0], v[1], -v[2])

  // extra skinned parts on demand (the mesh hair styles)
  const addPart = (name, mat, shadow = true) => meta.parts[name] ? mk(name, mat, shadow) : null
  /** fetch a part's own .bin (community assets) before addPart / partArray */
  const ensurePart = async name => {
    const f = meta.parts[name]?.bin
    if (f && !bins[name]) bins[name] = await fetch(base + f).then(r => { if (!r.ok) throw new Error(`${f}: ${r.status}`); return r.arrayBuffer() })
  }
  return { group, skeleton, bones, byName, restWorld, meshes, materials: { skin, eye, brow, lash }, meta, parts, joints, addPart, ensurePart, loadTexture: tex, baseUrl: base,
    /** a raw array of a part (e.g. a garment's deleteVerts) */
    partArray: (name, field, T) => meta.parts[name]?.[field] ? arr(T, meta.parts[name][field], name).slice() : null }
}

// Average normals of vertices that share a position (UV seams).
function weldNormals(g) {
  const p = g.attributes.position.array, n = g.attributes.normal.array
  const map = new Map()
  for (let i = 0; i < p.length / 3; i++) {
    const k = `${Math.round(p[i * 3] * 1000)},${Math.round(p[i * 3 + 1] * 1000)},${Math.round(p[i * 3 + 2] * 1000)}`
    let l = map.get(k); if (!l) map.set(k, l = []); l.push(i)
  }
  for (const l of map.values()) {
    if (l.length < 2) continue
    let x = 0, y = 0, z = 0
    for (const i of l) { x += n[i * 3]; y += n[i * 3 + 1]; z += n[i * 3 + 2] }
    const len = Math.hypot(x, y, z) || 1
    for (const i of l) { n[i * 3] = x / len; n[i * 3 + 1] = y / len; n[i * 3 + 2] = z / len }
  }
  g.attributes.normal.needsUpdate = true
}
