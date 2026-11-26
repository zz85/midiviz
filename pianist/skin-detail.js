// Skin detail maps, made procedurally for the body's own UVs: a normal map of
// pores and the skin's fine furrows, and a roughness map, baked once on the
// GPU and read back into canvases (so the path tracers and the WebGPU
// renderer take them as any texture).
//
// The pattern is noise in the rest pose's 3D space, in centimetres, so it is
// seamless across the UV seams and the pores are round on the skin however
// the UVs stretch:
// - pores: Worley noise's nearest-cell distance (F1), a pit at each cell's
//   point, closer and deeper on the nose, finer on the cheeks and forehead,
//   faint on the body, none on the lips;
// - furrows (the skin's microrelief, the fine lines that cross it in
//   polygons): Worley's F2 - F1, the cell borders, a few millimetres apart;
// - the lips: furrows stretched up and down, the vertical lines of the lips.
// Each region comes from the rest pose's position near the face's joints, as
// per-vertex settings the bake interpolates. A feature smaller than a texel
// fades out, so the map doesn't alias; the furrows' gradient is taken half a
// texel apart along the UV's own directions on the skin, for the normal map's
// tangent frame (three.js derives it from the UVs).
//
// Roughness: oilier on the forehead, nose and chin (the T-zone), moist on the
// lips, drier on the cheeks and the body, a little rougher in the pores.
//
// Units: centimetres.

import * as THREE from 'three'
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js'

const VERT = /* glsl */`
attribute vec3 restPos, tanU, tanV;
attribute vec4 pore, furrow;   // pore: spacing, radius, depth, rough; furrow: spacing, depth, lips, texel cm
varying vec3 vP, vT, vB; varying vec4 vPore, vFurrow;
void main() {
  vP = restPos; vT = tanU; vB = tanV; vPore = pore; vFurrow = furrow;
  gl_Position = vec4( uv * 2.0 - 1.0, 0.0, 1.0 );
}`

const FRAG = /* glsl */`
uniform float mode, strength;
varying vec3 vP, vT, vB; varying vec4 vPore, vFurrow;
vec3 hash3( vec3 p ) {
  p = vec3( dot( p, vec3( 127.1, 311.7, 74.7 ) ), dot( p, vec3( 269.5, 183.3, 246.1 ) ), dot( p, vec3( 113.5, 271.9, 124.6 ) ) );
  return fract( sin( p ) * 43758.5453123 );
}
// Worley: (F1, F2), the distances to the nearest and next cell points, in cells
vec2 worley( vec3 p ) {
  vec3 i = floor( p ), f = fract( p );
  float d1 = 8.0, d2 = 8.0;
  for ( int z = -1; z <= 1; z ++ ) for ( int y = -1; y <= 1; y ++ ) for ( int x = -1; x <= 1; x ++ ) {
    vec3 g = vec3( x, y, z ), o = hash3( i + g );
    float d = length( g + o - f );
    if ( d < d1 ) { d2 = d1; d1 = d; } else if ( d < d2 ) d2 = d;
  }
  return vec2( d1, d2 );
}
// the height of the skin's surface, cm (pits negative)
float height( vec3 p ) {
  float texel = vFurrow.w;
  // pores: round pits of radius vPore.y cm at cells vPore.x cm apart
  float h = 0.0;
  if ( vPore.z > 0.0 ) {
    float f1 = worley( p / vPore.x + 17.0 ).x * vPore.x;
    float fade = smoothstep( 0.6, 1.6, vPore.y / texel );
    h -= vPore.z * fade * vPore.y * 0.5 * ( 1.0 - smoothstep( 0.0, vPore.y, f1 ) );
  }
  // furrows: grooves along the cell borders, vFurrow.x cm cells; on the lips, stretched up and down
  vec3 q = p / vFurrow.x;
  q.y *= mix( 1.0, 0.18, vFurrow.z ); q.xz *= mix( 1.0, 1.6, vFurrow.z );
  vec2 w = worley( q );
  float edge = ( w.y - w.x ) * vFurrow.x;   // cm from the border
  float width = max( vFurrow.x * 0.06, texel * 0.7 );
  h -= vFurrow.y * vFurrow.x * 0.04 * ( 1.0 - smoothstep( 0.0, width, edge ) );
  return h;
}
void main() {
  if ( mode > 0.5 ) {
    // roughness (G), with the pores a little rougher
    float r = vPore.w;
    if ( vPore.z > 0.0 ) r += 0.08 * ( 1.0 - smoothstep( 0.0, vPore.y, worley( vP / vPore.x + 17.0 ).x * vPore.x ) ) * smoothstep( 0.6, 1.6, vPore.y / vFurrow.w );
    gl_FragColor = vec4( r, r, r, 1.0 );
    return;
  }
  float e = vFurrow.w * 0.5;
  vec3 T = normalize( vT ), B = normalize( vB );
  float h0 = height( vP );
  float du = ( height( vP + T * e ) - h0 ) / e, dv = ( height( vP + B * e ) - h0 ) / e;
  vec3 n = normalize( vec3( - du * strength, - dv * strength, 1.0 ) );
  gl_FragColor = vec4( n * 0.5 + 0.5, 1.0 );
}`

// fills the texels outside the UV islands from their neighbours, so filtering
// and mipmaps don't pull the flat background in along a seam
const DILATE = /* glsl */`
uniform sampler2D tMap; uniform vec2 texel;
varying vec2 vUv;
void main() {
  vec4 c = texture2D( tMap, vUv );
  if ( c.a > 0.5 ) { gl_FragColor = c; return; }
  vec4 s = vec4( 0.0 );
  for ( int y = -1; y <= 1; y ++ ) for ( int x = -1; x <= 1; x ++ ) { vec4 t = texture2D( tMap, vUv + vec2( x, y ) * texel ); s += vec4( t.rgb * t.a, t.a ); }
  gl_FragColor = s.a > 0.0 ? vec4( s.rgb / s.a, 1.0 ) : vec4( 0.0 );
}`

const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t) }
const mix = (a, b, t) => a + (b - a) * t

/** Per-vertex settings: [pore spacing, radius, depth, roughness], [furrow spacing, depth, lips 0-1] */
function regions(P, J, v) {
  const x = P[v * 3], y = P[v * 3 + 1], z = P[v * 3 + 2]
  const eye = J['eye.L____head'], mouth = J['oris01____head']
  const ax = Math.abs(x)
  // (the face: in front of the ears, above the jaw's line)
  const face = smooth(-3, -7, z) * smooth(mouth.y - 8, mouth.y - 5, y)
  const head = smooth(mouth.y - 9, mouth.y - 6, y)
  const nose = face * smooth(2.0, 1.2, ax) * smooth(mouth.y + 1.2, mouth.y + 2.2, y) * smooth(eye.y + 0.5, eye.y - 0.8, y) * smooth(eye.z - 0.5, eye.z - 1.6, z)
  const lips = face * smooth(2.8, 2.2, ax) * smooth(mouth.y - 1.6, mouth.y - 1.0, y) * smooth(mouth.y + 2.7, mouth.y + 2.1, y) * smooth(mouth.z + 2.2, mouth.z + 1.2, z)
  const forehead = face * smooth(eye.y + 1.2, eye.y + 2.5, y)
  const chin = face * smooth(3.4, 2.4, ax) * smooth(mouth.y - 1.8, mouth.y - 2.8, y)
  const tzone = Math.max(nose, forehead, chin)
  // pores (cm): body faint and fine, the face finer, the nose deepest
  let sp = mix(0.12, 0.075, head), r = mix(0.012, 0.018, head), d = mix(0.35, 0.8, head)
  sp = mix(sp, 0.06, nose); r = mix(r, 0.026, nose); d = mix(d, 1.3, nose)
  d *= 1 - lips
  const rough = mix(mix(0.56, 0.52, face), 0.45, tzone) * (1 - lips) + 0.4 * lips
  // furrows: coarser on the body, fine on the face, the lips' own lines
  const fs = mix(mix(0.32, 0.18, head), 0.07, lips), fd = mix(mix(0.9, 0.7, head), 1.6, lips)
  return [[sp, r, d, rough], [fs, fd, lips]]
}

/** Bake the body's detail maps: { normal, roughness } textures, size² texels. */
export function bakeSkinDetail(renderer, ch, { size = 4096, strength = 1 } = {}) {
  const t0 = performance.now()
  const body = ch.parts.body.geometry, J = ch.joints
  const P = body.userData.rest || body.attributes.position.array, U = body.attributes.uv.array, I = ch.parts.body.index0 || body.index.array
  const NV = P.length / 3
  // the UV's directions on the skin (dP/du, dP/dv) and its texel's size, per vertex
  const tu = new Float32Array(NV * 3), tv = new Float32Array(NV * 3), wa = new Float32Array(NV), ua = new Float32Array(NV)
  for (let t = 0; t < I.length; t += 3) {
    const a = I[t], b = I[t + 1], c = I[t + 2]
    const e1 = [0, 1, 2].map(k => P[b * 3 + k] - P[a * 3 + k]), e2 = [0, 1, 2].map(k => P[c * 3 + k] - P[a * 3 + k])
    const du1 = U[b * 2] - U[a * 2], dv1 = U[b * 2 + 1] - U[a * 2 + 1], du2 = U[c * 2] - U[a * 2], dv2 = U[c * 2 + 1] - U[a * 2 + 1]
    const det = du1 * dv2 - du2 * dv1
    if (Math.abs(det) < 1e-12) continue
    const f = 1 / det
    const T = [0, 1, 2].map(k => (e1[k] * dv2 - e2[k] * dv1) * f), B = [0, 1, 2].map(k => (e2[k] * du1 - e1[k] * du2) * f)
    const cr = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]]
    const area = Math.hypot(...cr) / 2, uarea = Math.abs(det) / 2
    for (const v of [a, b, c]) { for (let k = 0; k < 3; k++) { tu[v * 3 + k] += T[k]; tv[v * 3 + k] += B[k] } wa[v] += area; ua[v] += uarea }
  }
  const pore = new Float32Array(NV * 4), furrow = new Float32Array(NV * 4)
  for (let v = 0; v < NV; v++) {
    const [p, f] = regions(P, J, v)
    pore.set(p, v * 4)
    furrow.set([...f, ua[v] ? Math.sqrt(wa[v] / (ua[v] * size * size)) : 0.05], v * 4)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(NV * 3), 3))
  g.setAttribute('uv', body.attributes.uv)
  g.setAttribute('restPos', new THREE.BufferAttribute(Float32Array.from(P), 3))
  g.setAttribute('tanU', new THREE.BufferAttribute(tu, 3)); g.setAttribute('tanV', new THREE.BufferAttribute(tv, 3))
  g.setAttribute('pore', new THREE.BufferAttribute(pore, 4)); g.setAttribute('furrow', new THREE.BufferAttribute(furrow, 4))
  g.setIndex(new THREE.BufferAttribute(I, 1))
  const mat = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, side: THREE.DoubleSide, depthTest: false, depthWrite: false,
    uniforms: { mode: { value: 0 }, strength: { value: strength } } })
  const mesh = new THREE.Mesh(g, mat); mesh.frustumCulled = false
  const scene = new THREE.Scene(); scene.add(mesh)
  const cam = new THREE.Camera()
  const rt = () => new THREE.WebGLRenderTarget(size, size, { generateMipmaps: false, minFilter: THREE.LinearFilter, depthBuffer: false })
  const A = rt(), B = rt()
  const dil = new THREE.ShaderMaterial({ vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4( position.xy, 0.0, 1.0 ); }', fragmentShader: DILATE,
    uniforms: { tMap: { value: null }, texel: { value: new THREE.Vector2(1 / size, 1 / size) } } })
  const quad = new FullScreenQuad(dil)
  const prev = { target: renderer.getRenderTarget(), alpha: renderer.getClearAlpha(), color: renderer.getClearColor(new THREE.Color()), auto: renderer.autoClear, tm: renderer.toneMapping }
  renderer.toneMapping = THREE.NoToneMapping
  const bake = (mode) => {
    mat.uniforms.mode.value = mode
    renderer.setClearColor(0x000000, 0); renderer.setRenderTarget(A); renderer.clear(); renderer.render(scene, cam)
    let src = A, dst = B
    for (let i = 0; i < 8; i++) { dil.uniforms.tMap.value = src.texture; renderer.setRenderTarget(dst); quad.render(renderer); [src, dst] = [dst, src] }
    // read back into a canvas, flipped so the canvas texture's flipY puts it back
    const px = new Uint8Array(size * size * 4)
    renderer.readRenderTargetPixels(src, 0, 0, size, size, px)
    const c = document.createElement('canvas'); c.width = c.height = size
    const ctx = c.getContext('2d'), img = ctx.createImageData(size, size), row = size * 4
    for (let y = 0; y < size; y++) img.data.set(px.subarray((size - 1 - y) * row, (size - y) * row), y * row)
    for (let i = 3; i < img.data.length; i += 4) img.data[i] = 255
    ctx.putImageData(img, 0, 0)
    const tex = new THREE.CanvasTexture(c)
    tex.anisotropy = 8; tex.colorSpace = THREE.NoColorSpace
    return tex
  }
  const normal = bake(0), roughness = bake(1)
  renderer.setRenderTarget(prev.target); renderer.setClearColor(prev.color, prev.alpha); renderer.toneMapping = prev.tm
  for (const x of [A, B, mat, dil, g]) x.dispose(); quad.dispose()
  return { normal, roughness, ms: Math.round(performance.now() - t0) }
}

/** Put the baked maps on the skin (the tiled pores replaced); ?pores=tiled keeps them. */
export function useSkinDetail(renderer, ch, opts) {
  if (typeof location !== 'undefined' && new URLSearchParams(location.search).get('pores') === 'tiled') return null
  const d = bakeSkinDetail(renderer, ch, opts), m = ch.materials.skin
  m.normalMap = d.normal; m.normalScale.set(1, 1)
  m.roughnessMap = d.roughness; m.roughness = 1
  m.needsUpdate = true
  return d
}
