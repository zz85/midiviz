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
// - creases: the upper eyelid's fold and the line under the eye, the
//   nasolabial folds, faint forehead and neck lines, and the creases across
//   the fingers' joints, placed from the skeleton's face and finger joints.
//
// Roughness: oilier on the forehead, nose and chin (the T-zone), moist on the
// lips, drier on the cheeks and the body, a little rougher in the pores.
//
// Colour: the skin texture times a tint, in linear light: blotchy redness on
// the cheeks, nose, chin, ears, elbows, knees and knuckles, faint mottling all
// over, darker skin under the eyes, and freckles on the nose and cheeks
// (?freckles=0..1, 0.5 by default). It is composed again when the skin
// texture changes (ch.setSkin).
//
// Occlusion and thickness, per vertex by rays through the rest mesh (a grid
// of its triangles): ambient occlusion within 5 cm, in the creases of the
// eyes, nose, lips, ears and between the fingers; and how far light goes in
// along -N before it leaves the body, for the light through the ears,
// nostrils and fingers (pianist/skin.js). One texture holds both with the
// roughness, as three.js reads it: R occlusion (aoMap), G roughness
// (roughnessMap), B thickness.
//
// Units: centimetres.

import * as THREE from 'three'
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js'

const VERT = /* glsl */`
attribute vec3 restPos, tanU, tanV;
attribute vec4 pore, furrow;   // pore: spacing, radius, depth, rough; furrow: spacing, depth, lips, texel cm
attribute vec4 tone;           // redness, freckles, under the eye, face
attribute vec4 occl;           // occlusion, thickness, a finger joint's distance along the finger (cm), its weight
varying vec3 vP, vT, vB; varying vec4 vPore, vFurrow, vTone, vOccl; varying vec2 vUv;
void main() {
  vP = restPos; vT = tanU; vB = tanV; vPore = pore; vFurrow = furrow; vTone = tone; vOccl = occl; vUv = uv;
  gl_Position = vec4( uv * 2.0 - 1.0, 0.0, 1.0 );
}`

const FRAG = /* glsl */`
uniform float mode, strength, freckles;
uniform sampler2D tMap;
uniform vec3 uEye, uNaso[4];   // the left eye's centre and the nasolabial line, |x|
uniform float uNeck;           // the neck's lines' height
varying vec3 vP, vT, vB; varying vec4 vPore, vFurrow, vTone, vOccl; varying vec2 vUv;
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
float vnoise( vec3 p ) {
  vec3 i = floor( p ), f = fract( p ); f = f * f * ( 3.0 - 2.0 * f );
  float n = 0.0;
  for ( int k = 0; k < 8; k ++ ) { vec3 o = vec3( k & 1, ( k >> 1 ) & 1, k >> 2 ); vec3 w = mix( 1.0 - f, f, o ); n += hash3( i + o ).x * w.x * w.y * w.z; }
  return n;
}
float groove( float d, float w ) { return exp( - d * d / ( w * w ) ); }
float segDist( vec2 p, vec2 a, vec2 b, out float t ) { vec2 ab = b - a; t = clamp( dot( p - a, ab ) / dot( ab, ab ), 0.0, 1.0 ); return length( p - a - ab * t ); }
// creases of the face and the fingers, cm (negative)
float creases( vec3 p ) {
  float texel = vFurrow.w, h = 0.0, face = vTone.w;
  vec3 q = vec3( abs( p.x ), p.yz );
  float wmin = texel * 0.8;
  if ( face > 0.0 ) {
    // the eyelid's fold above the eye and the line under it, round its centre
    vec2 e = ( q.xy - uEye.xy ) / vec2( 1.55, 1.0 );
    float r = length( e ), front = smoothstep( uEye.z - 0.2, uEye.z - 0.9, q.z );
    float up = smoothstep( 0.15, 0.45, e.y ) * smoothstep( 1.2, 0.7, abs( e.x ) );
    h -= 0.035 * up * front * groove( ( r - 1.08 ) * 1.0, max( 0.075, wmin ) );
    float dn = smoothstep( -0.15, -0.45, e.y ) * smoothstep( 1.1, 0.5, abs( e.x ) );
    h -= 0.014 * dn * front * groove( ( r - 1.12 ) * 1.0, max( 0.07, wmin ) );
    // the nasolabial fold, from the nose's wing to beside the mouth's corner
    float t, best = 9.0, along = 0.0;
    for ( int i = 0; i < 3; i ++ ) { float d = segDist( q.xy, uNaso[i].xy, uNaso[i + 1].xy, t ); if ( d < best ) { best = d; along = ( float( i ) + t ) / 3.0; } }
    float zf = smoothstep( -10.5, -12.0, q.z );
    h -= 0.012 * zf * smoothstep( 0.0, 0.25, along ) * smoothstep( 0.95, 0.6, along ) * groove( best, max( 0.22, wmin ) );
    // faint lines across the forehead
    float fy = q.y - uEye.y - 2.4 + 0.12 * sin( q.x * 0.8 + 1.3 );
    float fl = smoothstep( 0.0, 0.5, fy ) * smoothstep( 2.6, 1.8, fy ) * smoothstep( 4.5, 2.5, q.x ) * smoothstep( -9.0, -11.0, q.z );
    float ph = fract( fy / 0.9 ) - 0.5;
    h -= 0.008 * fl * groove( ph * 0.9, max( 0.06, wmin ) );
  }
  // two lines round the neck
  float ny = p.y - uNeck, nk = smoothstep( 5.5, 3.5, q.x ) * smoothstep( -2.0, -5.5, q.z ) * ( 1.0 - face );
  h -= 0.012 * nk * ( groove( ny, max( 0.09, wmin ) ) + groove( ny + 2.1, max( 0.09, wmin ) ) * 0.7 );
  // across each finger's joints: a few lines either side of the joint
  if ( vOccl.w > 0.0 ) {
    float s = vOccl.z, k = 0.0;
    for ( int i = -2; i <= 2; i ++ ) k += groove( s - float( i ) * 0.14, max( 0.035, wmin ) ) * ( 1.0 - abs( float( i ) ) * 0.3 );
    h -= 0.018 * vOccl.w * k;
  }
  return h;
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
  float width = max( vFurrow.x * 0.09, texel * 0.7 );
  h -= vFurrow.y * vFurrow.x * 0.04 * ( 1.0 - smoothstep( 0.0, width, edge ) );
  return h + creases( p );
}
vec3 toSRGB( vec3 c ) { return mix( c * 12.92, 1.055 * pow( c, vec3( 1.0 / 2.4 ) ) - 0.055, step( 0.0031308, c ) ); }
// the skin's colour times its tint (linear)
vec3 tint( vec3 p ) {
  vec3 t = vec3( 1.0 );
  // mottling: broad, faint, red against yellow
  float m1 = vnoise( p * 0.35 ) + 0.5 * vnoise( p * 0.9 + 3.1 ) - 0.75, m2 = vnoise( p * 2.2 + 7.7 ) - 0.5;
  t *= vec3( 1.0 + 0.05 * m1, 1.0 - 0.03 * m1, 1.0 - 0.05 * m1 ) * ( 1.0 + 0.035 * m2 );
  // redness, blotchy
  float red = vTone.x * ( 0.55 + 0.6 * vnoise( p * 1.6 + 11.0 ) );
  t *= mix( vec3( 1.0 ), vec3( 1.0, 0.74, 0.74 ), clamp( red, 0.0, 1.0 ) );
  // under the eyes: thinner skin, darker and cooler
  t *= mix( vec3( 1.0 ), vec3( 0.9, 0.84, 0.9 ), vTone.z );
  // freckles: some of the cells of a 2.4 mm Worley grid, of different sizes and tones
  float fd = vTone.y * freckles;
  if ( fd > 0.0 ) {
    vec3 c = p / 0.24;
    vec3 i = floor( c ), f = fract( c );
    float spot = 0.0;
    for ( int z = -1; z <= 1; z ++ ) for ( int y = -1; y <= 1; y ++ ) for ( int x = -1; x <= 1; x ++ ) {
      vec3 g = vec3( x, y, z ), hs = hash3( i + g + 41.0 );
      if ( hs.x > fd * 0.8 ) continue;
      vec3 o = hash3( i + g );
      float rad = ( 0.12 + 0.25 * hs.y ) * 0.24, d = length( ( g + o - f ) * 0.24 );
      float soft = max( rad * 0.5, vFurrow.w );
      spot = max( spot, ( 1.0 - smoothstep( rad - soft, rad + soft * 0.5, d ) ) * ( 0.45 + 0.55 * hs.z ) );
    }
    t *= mix( vec3( 1.0 ), vec3( 0.64, 0.48, 0.36 ), spot );
  }
  return t;
}
void main() {
  if ( mode > 1.5 ) {
    gl_FragColor = vec4( toSRGB( texture2D( tMap, vUv ).rgb * tint( vP ) ), 1.0 );
    return;
  }
  if ( mode > 0.5 ) {
    // occlusion (R), roughness (G), with the pores a little rougher, thickness (B)
    float r = vPore.w;
    if ( vPore.z > 0.0 ) r += 0.08 * ( 1.0 - smoothstep( 0.0, vPore.y, worley( vP / vPore.x + 17.0 ).x * vPore.x ) ) * smoothstep( 0.6, 1.6, vPore.y / vFurrow.w );
    gl_FragColor = vec4( vOccl.x, r, vOccl.y, 1.0 );
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

const COPY = /* glsl */`
uniform sampler2D tMap; varying vec2 vUv;
vec3 toSRGB( vec3 c ) { return mix( c * 12.92, 1.055 * pow( c, vec3( 1.0 / 2.4 ) ) - 0.055, step( 0.0031308, c ) ); }
void main() { gl_FragColor = vec4( toSRGB( texture2D( tMap, vUv ).rgb ), 1.0 ); }`

const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t) }
const mix = (a, b, t) => a + (b - a) * t

/** Per-vertex settings: [pore spacing, radius, depth, roughness], [furrow spacing, depth, lips 0-1], [redness, freckles, under the eye, face] */
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
  const fs = mix(mix(0.32, 0.18, head), 0.07, lips), fd = mix(mix(0.4, 0.6, head), 1.6, lips)
  // colour: redness on the cheeks' apples, the nose, chin and ears, the elbows, knees and knuckles
  const front = smooth(eye.z + 2.5, eye.z - 0.5, z)
  const cheek = face * front * smooth(2.6, 0.6, Math.hypot(ax - 3.9, y - (eye.y - 2.8)))
  const ear = head * smooth(5.8, 6.6, ax) * smooth(-9, -7, z) * smooth(1.5, -1.5, z) * smooth(4.5, 3, Math.abs(y - (eye.y - 1.2)))
  const near = (names, rad) => { let m = 0; for (const n of names) { const j = J[n]; if (j) m = Math.max(m, smooth(rad, rad * 0.3, Math.hypot(x - j.x, y - j.y, z - j.z))) } return m }
  const elbows = near(['lowerarm01.L____head', 'lowerarm01.R____head'], 4), knees = near(['lowerleg01.L____head', 'lowerleg01.R____head'], 6)
  const knuckles = near(FINGER_JOINTS, 1.0)
  const red = Math.min(1, cheek * 0.75 + nose * 0.6 + chin * 0.3 + ear * 0.55 + forehead * 0.1 + elbows * 0.45 + knees * 0.45 + knuckles * 0.5 + lips * 0)
  // freckles: the nose's bridge and the cheeks below the eyes, a few on the shoulders
  const fr = face * front * Math.max(smooth(3.6, 1.0, Math.hypot(ax - 2.4, y - (eye.y - 1.9))), nose * 0.9) * (1 - lips)
  const shoulders = smooth(10, 14, ax) * smooth(120, 128, y) * smooth(138, 132, y) * 0.35
  const under = face * front * smooth(1.25, 0.35, Math.hypot((ax - eye.x) / 1.5, (y - (eye.y - 1.15)) / 0.55))
  // where light comes through: the ears, the nose's wings and tip, the fingers (other thin places
  // the rays find, the eyelids and the cheeks over the mouth, open onto the eyes and the mouth the body lacks)
  const thin = Math.max(ear, nose * 0.5 * smooth(0.4, 1.0, ax), near(FINGER_JOINTS, 2.0))
  return [[sp, r, d, rough], [fs, fd, lips], [red, Math.max(fr, shoulders), under, face], thin]
}
const FINGER_JOINTS = [1, 2, 3, 4, 5].flatMap(f => [1, 2, 3].flatMap(k => ['L', 'R'].map(s => `finger${f}-${k}.${s}____head`)))

// Rays through a mesh: its triangles in a grid of cubes, CELL cm a side
const CELL = 1.5
function triGrid(P, I) {
  const NT = I.length / 3, lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9]
  for (let i = 0; i < P.length; i += 3) for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], P[i + k]); hi[k] = Math.max(hi[k], P[i + k]) }
  const n = [0, 1, 2].map(k => Math.max(1, Math.ceil((hi[k] - lo[k]) / CELL) + 1))
  const cell = (k, v) => Math.min(n[k] - 1, Math.max(0, Math.floor((v - lo[k]) / CELL)))
  const count = new Uint32Array(n[0] * n[1] * n[2] + 1), boxes = new Int32Array(NT * 6)
  for (let t = 0; t < NT; t++) for (let k = 0; k < 3; k++) {
    const a = P[I[t * 3] * 3 + k], b = P[I[t * 3 + 1] * 3 + k], c = P[I[t * 3 + 2] * 3 + k]
    boxes[t * 6 + k] = cell(k, Math.min(a, b, c)); boxes[t * 6 + 3 + k] = cell(k, Math.max(a, b, c))
  }
  const each = (t, f) => { for (let z = boxes[t * 6 + 2]; z <= boxes[t * 6 + 5]; z++) for (let y = boxes[t * 6 + 1]; y <= boxes[t * 6 + 4]; y++) for (let x = boxes[t * 6]; x <= boxes[t * 6 + 3]; x++) f((z * n[1] + y) * n[0] + x) }
  for (let t = 0; t < NT; t++) each(t, c => count[c + 1]++)
  for (let c = 1; c < count.length; c++) count[c] += count[c - 1]
  const fill = count.slice(), tris = new Uint32Array(count[count.length - 1])
  for (let t = 0; t < NT; t++) each(t, c => { tris[fill[c]++] = t })
  const stamp = new Uint32Array(NT); let ray = 0
  // the distance to the first triangle along the ray (o, unit d) within maxT, or Infinity
  function cast(ox, oy, oz, dx, dy, dz, maxT) {
    ray++
    let cx = cell(0, ox), cy = cell(1, oy), cz = cell(2, oz)
    const st = [Math.sign(dx), Math.sign(dy), Math.sign(dz)], o = [ox, oy, oz], d = [dx, dy, dz], c = [cx, cy, cz]
    const tmax = [0, 0, 0], tdel = [0, 0, 0]
    for (let k = 0; k < 3; k++) {
      if (!st[k]) { tmax[k] = tdel[k] = Infinity; continue }
      const edge = lo[k] + (c[k] + (st[k] > 0 ? 1 : 0)) * CELL
      tmax[k] = (edge - o[k]) / d[k]; tdel[k] = CELL / Math.abs(d[k])
    }
    let best = Infinity, t0 = 0
    while (t0 <= maxT && t0 < best) {
      const ci = (c[2] * n[1] + c[1]) * n[0] + c[0]
      for (let j = count[ci]; j < count[ci + 1]; j++) {
        const t = tris[j]; if (stamp[t] === ray) continue; stamp[t] = ray
        const a = I[t * 3] * 3, b = I[t * 3 + 1] * 3, e = I[t * 3 + 2] * 3
        const e1x = P[b] - P[a], e1y = P[b + 1] - P[a + 1], e1z = P[b + 2] - P[a + 2], e2x = P[e] - P[a], e2y = P[e + 1] - P[a + 1], e2z = P[e + 2] - P[a + 2]
        const px = dy * e2z - dz * e2y, py = dz * e2x - dx * e2z, pz = dx * e2y - dy * e2x, det = e1x * px + e1y * py + e1z * pz
        if (Math.abs(det) < 1e-12) continue
        const inv = 1 / det, sx = ox - P[a], sy = oy - P[a + 1], sz = oz - P[a + 2], u = (sx * px + sy * py + sz * pz) * inv
        if (u < 0 || u > 1) continue
        const qx = sy * e1z - sz * e1y, qy = sz * e1x - sx * e1z, qz = sx * e1y - sy * e1x, v = (dx * qx + dy * qy + dz * qz) * inv
        if (v < 0 || u + v > 1) continue
        const tt = (e2x * qx + e2y * qy + e2z * qz) * inv
        if (tt > 0.02 && tt < best) best = tt
      }
      const k = tmax[0] < tmax[1] ? (tmax[0] < tmax[2] ? 0 : 2) : (tmax[1] < tmax[2] ? 1 : 2)
      t0 = tmax[k]; c[k] += st[k]; tmax[k] += tdel[k]
      if (c[k] < 0 || c[k] >= n[k]) break
    }
    return best <= maxT ? best : Infinity
  }
  return cast
}

/** Per vertex: [occlusion 0-1, thickness 0-1 (1 thin)], by rays from the rest mesh */
function occlusion(P, N, I, NV) {
  const cast = triGrid(P, I), out = new Float32Array(NV * 2)
  const AO_RAYS = 32, AO_MAX = 5, TH_RAYS = 6, TH_MAX = 3
  // a fixed set of directions round +z, cosine-weighted, turned to each normal
  const dirs = []
  for (let i = 0; i < AO_RAYS; i++) { const a = i * 2.39996, r = Math.sqrt((i + 0.5) / AO_RAYS); dirs.push([r * Math.cos(a), r * Math.sin(a), Math.sqrt(1 - r * r)]) }
  const cone = []
  for (let i = 0; i < TH_RAYS; i++) { const a = i * 2.39996, r = 0.35 * Math.sqrt((i + 0.5) / TH_RAYS); cone.push([r * Math.cos(a), r * Math.sin(a), Math.sqrt(1 - r * r)]) }
  for (let v = 0; v < NV; v++) {
    let nx = N[v * 3], ny = N[v * 3 + 1], nz = N[v * 3 + 2]; const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l
    // a frame round the normal
    let tx = Math.abs(nx) < 0.9 ? 1 : 0, ty = tx ? 0 : 1, tz = 0
    const dd = tx * nx + ty * ny; tx -= nx * dd; ty -= ny * dd; tz -= nz * dd; const tl = Math.hypot(tx, ty, tz); tx /= tl; ty /= tl; tz /= tl
    const bx = ny * tz - nz * ty, by = nz * tx - nx * tz, bz = nx * ty - ny * tx
    const ox = P[v * 3], oy = P[v * 3 + 1], oz = P[v * 3 + 2]
    let occ = 0
    for (const [a, b, c] of dirs) {
      const t = cast(ox + nx * 0.01, oy + ny * 0.01, oz + nz * 0.01, a * tx + b * bx + c * nx, a * ty + b * by + c * ny, a * tz + b * bz + c * nz, AO_MAX)
      if (t < Infinity) occ += 1 - (t / AO_MAX) ** 2
    }
    let th = 0
    for (const [a, b, c] of cone) {
      const t = cast(ox - nx * 0.01, oy - ny * 0.01, oz - nz * 0.01, a * tx + b * bx - c * nx, a * ty + b * by - c * ny, a * tz + b * bz - c * nz, TH_MAX)
      th += Math.min(t, TH_MAX)
    }
    out[v * 2] = 1 - occ / AO_RAYS
    out[v * 2 + 1] = smooth(1.2, 0.3, th / TH_RAYS)
  }
  return out
}

/** Per vertex: [cm along its finger from the nearest finger joint, weight] for the creases across the joints */
function knuckles(P, J, NV) {
  const out = new Float32Array(NV * 2), bones = []
  for (const n of FINGER_JOINTS) {
    const h = J[n], t = J[n.replace('____head', '____tail')]
    if (!h || !t) continue
    const d = new THREE.Vector3().subVectors(t, h), len = d.length()
    bones.push({ h, d: d.normalize(), len, k: +n.match(/-(\d)/)[1] })
  }
  const p = new THREE.Vector3()
  for (let v = 0; v < NV; v++) {
    p.fromArray(P, v * 3)
    let best = 1e9, s = 0, w = 0
    for (const b of bones) {
      const r = p.clone().sub(b.h), along = r.dot(b.d), perp = r.addScaledVector(b.d, -along).length()
      const dist = Math.hypot(Math.max(0, Math.abs(along) - 0.3), Math.max(0, perp - 1.1))
      if (dist < best) { best = dist; s = along; w = smooth(0.9, 0.25, Math.abs(along)) * smooth(1.6, 1.0, perp) * (b.k === 1 ? 0.5 : 1) }
    }
    out[v * 2] = s; out[v * 2 + 1] = w
  }
  return out
}

/** Bake the body's detail maps: { normal, roughness } textures, size² texels. */
export function bakeSkinDetail(renderer, ch, { size = 4096, strength = 1, freckles = FRECKLES } = {}) {
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
  const pore = new Float32Array(NV * 4), furrow = new Float32Array(NV * 4), tone = new Float32Array(NV * 4), occl = new Float32Array(NV * 4)
  const t1 = performance.now()
  const ao = occlusion(P, body.attributes.normal.array, I, NV), kn = knuckles(P, J, NV)
  const tRays = performance.now() - t1
  console.log(`skin occlusion rays: ${Math.round(tRays)} ms`)
  for (let v = 0; v < NV; v++) {
    const [p, f, c, thin] = regions(P, J, v)
    pore.set(p, v * 4); tone.set(c, v * 4)
    furrow.set([...f, ua[v] ? Math.sqrt(wa[v] / (ua[v] * size * size)) : 0.05], v * 4)
    occl.set([ao[v * 2], ao[v * 2 + 1] * thin, kn[v * 2], kn[v * 2 + 1]], v * 4)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(NV * 3), 3))
  g.setAttribute('uv', body.attributes.uv)
  g.setAttribute('restPos', new THREE.BufferAttribute(Float32Array.from(P), 3))
  g.setAttribute('tanU', new THREE.BufferAttribute(tu, 3)); g.setAttribute('tanV', new THREE.BufferAttribute(tv, 3))
  g.setAttribute('pore', new THREE.BufferAttribute(pore, 4)); g.setAttribute('furrow', new THREE.BufferAttribute(furrow, 4))
  g.setAttribute('tone', new THREE.BufferAttribute(tone, 4)); g.setAttribute('occl', new THREE.BufferAttribute(occl, 4))
  g.setIndex(new THREE.BufferAttribute(I, 1))
  const mat = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, side: THREE.DoubleSide, depthTest: false, depthWrite: false,
    uniforms: { mode: { value: 0 }, strength: { value: strength }, freckles: { value: freckles }, tMap: { value: null },
      uEye: { value: J['eye.L____head'].clone().setX(Math.abs(J['eye.L____head'].x)) },
      // the nasolabial line: the levator chain from the nose's wing to beside the mouth, a little out
      uNaso: { value: ['levator03.L____head', 'levator04.L____head', 'levator05.L____head', 'levator05.L____tail'].map(n => J[n].clone().setX(Math.abs(J[n].x) + 0.25)) },
      uNeck: { value: J['jaw____tail'].y - 4.5 } } })
  const mesh = new THREE.Mesh(g, mat); mesh.frustumCulled = false
  const scene = new THREE.Scene(); scene.add(mesh)
  const cam = new THREE.Camera()
  const rt = () => new THREE.WebGLRenderTarget(size, size, { generateMipmaps: false, minFilter: THREE.LinearFilter, depthBuffer: false })
  const A = rt(), B = rt()
  const dil = new THREE.ShaderMaterial({ vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4( position.xy, 0.0, 1.0 ); }', fragmentShader: DILATE,
    uniforms: { tMap: { value: null }, texel: { value: new THREE.Vector2(1 / size, 1 / size) } } })
  const quad = new FullScreenQuad(dil)
  const copy = new FullScreenQuad(new THREE.ShaderMaterial({ vertexShader: dil.vertexShader, fragmentShader: COPY, uniforms: { tMap: { value: null } } }))
  const bake = (mode, map) => {
    mat.uniforms.mode.value = mode
    renderer.setClearColor(0x000000, 0); renderer.setRenderTarget(A); renderer.clear()
    let src = A, dst = B
    if (mode === 2) {
      // the colour: the texture as it is outside the body's triangles, tinted on them
      mat.uniforms.tMap.value = copy.material.uniforms.tMap.value = map
      copy.render(renderer)
      const auto = renderer.autoClear; renderer.autoClear = false; renderer.render(scene, cam); renderer.autoClear = auto
    } else {
      renderer.render(scene, cam)
      for (let i = 0; i < 8; i++) { dil.uniforms.tMap.value = src.texture; renderer.setRenderTarget(dst); quad.render(renderer); [src, dst] = [dst, src] }
    }
    // read back into a canvas, flipped so the canvas texture's flipY puts it back
    const px = new Uint8Array(size * size * 4)
    renderer.readRenderTargetPixels(src, 0, 0, size, size, px)
    const c = document.createElement('canvas'); c.width = c.height = size
    const ctx = c.getContext('2d'), img = ctx.createImageData(size, size), row = size * 4
    for (let y = 0; y < size; y++) img.data.set(px.subarray((size - 1 - y) * row, (size - y) * row), y * row)
    for (let i = 3; i < img.data.length; i += 4) img.data[i] = 255
    ctx.putImageData(img, 0, 0)
    const tex = new THREE.CanvasTexture(c)
    tex.anisotropy = 8; tex.colorSpace = mode === 2 ? THREE.SRGBColorSpace : THREE.NoColorSpace
    return tex
  }
  const run = f => {
    const prev = { target: renderer.getRenderTarget(), alpha: renderer.getClearAlpha(), color: renderer.getClearColor(new THREE.Color()), tm: renderer.toneMapping }
    renderer.toneMapping = THREE.NoToneMapping
    try { return f() } finally { renderer.setRenderTarget(prev.target); renderer.setClearColor(prev.color, prev.alpha); renderer.toneMapping = prev.tm }
  }
  const normal = run(() => bake(0)), orm = run(() => bake(1))
  // the colour, composed again for each skin texture; the bake's geometry kept for it
  const colour = (map, f = freckles) => map?.image ? run(() => { mat.uniforms.freckles.value = f; return bake(2, map) }) : null
  const dispose = () => { for (const x of [A, B, mat, dil, g, copy.material]) x.dispose(); quad.dispose(); copy.dispose() }
  return { normal, orm, colour, dispose, rays: Math.round(tRays), ms: Math.round(performance.now() - t0) }
}

const FRECKLES = (() => { const v = typeof location !== 'undefined' && new URLSearchParams(location.search).get('freckles'); return v !== null && v !== false && v !== '' && isFinite(+v) ? +v : 0.5 })()

/** The skin textures with freckles of their own (ch.setSkin's keys) */
const OWN_FRECKLES = new Set(['freckled', 'ginger', 'zoey'])

/** Put the baked maps on the skin (the tiled pores replaced), and the tinted
 * colour on each skin texture ch.setSkin puts on; ?pores=tiled keeps the old. */
export function useSkinDetail(renderer, ch, opts) {
  if (typeof location !== 'undefined' && new URLSearchParams(location.search).get('pores') === 'tiled') return null
  const d = bakeSkinDetail(renderer, ch, opts), m = ch.materials.skin
  m.normalMap = d.normal; m.normalScale.set(1, 1)
  m.roughnessMap = d.orm; m.roughness = 1
  m.aoMap = d.orm; m.aoMapIntensity = 1
  // the colour: composed from each skin texture once, and kept
  const tinted = new Map()
  // (a skin with freckles painted in gets none of ours)
  let key = 'caucasian'
  const tint = () => {
    const src = m.userData.skinSource && tinted.get(m.userData.skinSource) === m.map ? m.userData.skinSource : m.map
    if (!src) return
    if (!tinted.has(src)) { const t0 = performance.now(); tinted.set(src, d.colour(src, OWN_FRECKLES.has(key) ? 0 : undefined)); console.log(`skin colour composed in ${Math.round(performance.now() - t0)} ms`) }
    const t = tinted.get(src)
    if (t) { m.userData.skinSource = src; m.map = t }
  }
  tint()
  const setSkin = ch.setSkin
  ch.setSkin = async k => { key = k; const ok = await setSkin(k); tint(); m.needsUpdate = true; return ok }
  m.needsUpdate = true
  return d
}
