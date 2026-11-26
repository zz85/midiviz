// Screen-space subsurface scattering of the skin (Jimenez et al., "Separable
// Subsurface Scattering", Computer Graphics Forum 2015), for a WebGL page.
//
// Light that enters skin spreads under it, red furthest, before it comes out.
// Each frame:
//   1. the scene, as the page draws it, into a float target with its depth;
//   2. the skin alone, its diffuse light only (pianist/skin.js SKIN_PASS),
//      where that depth shows the skin itself, alpha its coverage, and its
//      colour (albedo) in a second target;
//   3. the light it receives (the diffuse over the colour) blurred across
//      the screen, so the colour's own detail (brows, lips, freckles) stays
//      sharp, along x then y, by the skin's
//      diffusion profile (d'Eon and Luebke's six Gaussians, red widest), its
//      width in millimetres on the skin turned to pixels at each pixel's depth,
//      and a sample across a depth step or off the skin left out;
//   4. the picture: the scene, less the skin's sharp diffuse, plus the blurred
//      light times the colour, tone mapped as the renderer would.
// The specular, the sheen and everything else stay sharp. A frame with no
// skin material on show (a look that swaps it) is drawn as before.
//
// Units: centimetres in the scene, millimetres in the profile.

import * as THREE from 'three'
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js'
import { SKIN_PASS, SKIN_SCENE_DEPTH, SKIN_RES } from './skin.js'

// d'Eon and Luebke's skin profile (GPU Gems 3, ch. 14): [variance mm^2, [r, g, b]]
const PROFILE = [
  [0.0064, [0.233, 0.455, 0.649]], [0.0484, [0.100, 0.336, 0.344]], [0.187, [0.118, 0.198, 0.0]],
  [0.567, [0.113, 0.007, 0.007]], [1.99, [0.358, 0.004, 0.0]], [7.41, [0.078, 0.0, 0.0]],
]
const TAPS = 21
// The kernel along one axis: the profile's marginal (a 1D Gaussian of each),
// taps denser near the middle out to RANGE mm, each weighted by the stretch
// it stands for; each channel's weights sum to 1
function kernel() {
  const RANGE = 3 * Math.sqrt(PROFILE[PROFILE.length - 1][0])
  const x = [], w = []
  for (let i = 0; i < TAPS; i++) { const t = (i / (TAPS - 1)) * 2 - 1; x.push(RANGE * Math.sign(t) * t * t) }
  const g = (d, c) => PROFILE.reduce((s, [v, k]) => s + k[c] * Math.exp(-d * d / (2 * v)) / Math.sqrt(2 * Math.PI * v), 0)
  for (let i = 0; i < TAPS; i++) {
    const area = ((i < TAPS - 1 ? x[i + 1] : x[i]) - (i > 0 ? x[i - 1] : x[i])) / 2
    w.push([0, 1, 2].map(c => g(x[i], c) * area))
  }
  for (let c = 0; c < 3; c++) { const s = w.reduce((a, k) => a + k[c], 0); for (const k of w) k[c] /= s }
  return { x, w: w.map(k => new THREE.Vector3(...k)) }
}

const VERT = /* glsl */`varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4( position.xy, 0.0, 1.0 ); }`

const BLUR = /* glsl */`
#include <packing>
uniform sampler2D tColor, tDepth, tAlbedo;
uniform vec2 dir, res;
uniform float near, far, pxPerCm, width, unpremultiply;
uniform float offsets[ ${TAPS} ];
uniform vec3 weights[ ${TAPS} ];
varying vec2 vUv;
float depthAt( vec2 uv ) { return - perspectiveDepthToViewZ( texture2D( tDepth, uv ).r, near, far ); }
// (first pass: the light received, the coverage-weighted diffuse over the colour)
vec3 lightAt( vec4 c, vec2 uv ) {
  if ( unpremultiply < 0.5 ) return c.rgb;
  vec4 a = texture2D( tAlbedo, uv );
  return c.rgb / max( a.rgb, vec3( 0.02 * a.a ) );
}
void main() {
  vec4 c = texture2D( tColor, vUv );
  if ( c.a < 0.01 ) { gl_FragColor = vec4( 0.0 ); return; }
  vec3 centre = lightAt( c, vUv );
  float z = depthAt( vUv );
  // pixels per millimetre of skin at this depth
  float step = pxPerCm * 0.1 / z * width;
  vec3 sum = vec3( 0.0 );
  for ( int i = 0; i < ${TAPS}; i ++ ) {
    vec2 uv = vUv + dir * offsets[ i ] * step / res;
    vec4 s = texture2D( tColor, uv );
    vec3 sc = s.a < 0.01 ? centre : lightAt( s, uv );
    // (across a step in depth, such as from the cheek to the nose's side, the sample is another surface)
    sc = mix( sc, centre, clamp( abs( depthAt( uv ) - z ) / 0.6, 0.0, 1.0 ) );
    sum += sc * weights[ i ];
  }
  gl_FragColor = vec4( sum, c.a );
}`

const COMPOSE = /* glsl */`
uniform sampler2D tScene, tDiffuse, tBlur, tAlbedo;
uniform float debug;
varying vec2 vUv;
void main() {
  vec4 a = texture2D( tScene, vUv ), d = texture2D( tDiffuse, vUv ), b = texture2D( tBlur, vUv ), c = texture2D( tAlbedo, vUv );
  gl_FragColor = vec4( max( a.rgb - d.rgb + b.rgb * c.rgb, 0.0 ), 1.0 );
  if ( debug == 1.0 ) gl_FragColor.rgb = c.rgb; else if ( debug == 2.0 ) gl_FragColor.rgb = b.rgb * 0.3; else if ( debug == 3.0 ) gl_FragColor.rgb = d.rgb;   // (?sssdebug=albedo, light, diffuse)
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`

export function createSkinSSS(renderer, scene, camera, skinMaterial) {
  const target = (depth, samples, count = 1) => {
    const t = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples, count })
    if (depth) { t.depthTexture = new THREE.DepthTexture(1, 1); t.depthTexture.type = THREE.UnsignedIntType }
    return t
  }
  const sceneT = target(true, 4), skinT = target(false, 4, 2), blurX = target(false, 0), blurY = target(false, 0)
  const K = kernel()
  const blurMat = new THREE.ShaderMaterial({
    vertexShader: VERT, fragmentShader: BLUR, depthTest: false, depthWrite: false,
    uniforms: { tColor: { value: null }, tDepth: { value: sceneT.depthTexture }, tAlbedo: { value: skinT.textures[1] }, dir: { value: new THREE.Vector2() }, res: { value: new THREE.Vector2() },
      near: { value: 1 }, far: { value: 1 }, pxPerCm: { value: 1 }, width: { value: 1 }, unpremultiply: { value: 1 },
      offsets: { value: K.x }, weights: { value: K.w } },
  })
  const composeMat = new THREE.ShaderMaterial({
    vertexShader: VERT, fragmentShader: COMPOSE, depthTest: false, depthWrite: false, toneMapped: true,
    uniforms: { tScene: { value: sceneT.texture }, tDiffuse: { value: skinT.textures[0] }, tBlur: { value: blurY.texture }, tAlbedo: { value: skinT.textures[1] }, debug: { value: ['', 'albedo', 'light', 'diffuse'].indexOf(typeof location !== 'undefined' && new URLSearchParams(location.search).get('sssdebug') || '') } },
  })
  const quad = new FullScreenQuad(blurMat)
  const size = new THREE.Vector2(), clear = new THREE.Color()
  const api = {
    enabled: true,
    /** the blur's width, a multiple of measured skin's */
    width: +(typeof location !== 'undefined' && new URLSearchParams(location.search).get('sssw')) || 1.5,
    render() {
      // (nothing to blur: the page as it was)
      let skin = false
      scene.traverseVisible(o => { if (!skin && o.isMesh && o.material === skinMaterial) skin = true })
      if (!api.enabled || !skin) { renderer.setRenderTarget(null); renderer.render(scene, camera); return }
      renderer.getDrawingBufferSize(size)
      if (sceneT.width !== size.x || sceneT.height !== size.y) for (const t of [sceneT, skinT, blurX, blurY]) t.setSize(size.x, size.y)
      // 1. the scene
      renderer.setRenderTarget(sceneT); renderer.render(scene, camera)
      // 2. the skin's diffuse light, alone
      const hidden = [], bg = scene.background, alpha = renderer.getClearAlpha(), auto = renderer.shadowMap.autoUpdate
      renderer.getClearColor(clear)
      scene.traverse(o => { if ((o.isMesh || o.isPoints || o.isLine || o.isSprite) && o.visible && o.material !== skinMaterial) { o.visible = false; hidden.push(o) } })
      scene.background = null; renderer.setClearColor(0x000000, 0); renderer.shadowMap.autoUpdate = false
      SKIN_PASS.value = 1; SKIN_SCENE_DEPTH.value = sceneT.depthTexture; SKIN_RES.value.copy(size)
      renderer.setRenderTarget(skinT); renderer.clear(); renderer.render(scene, camera)
      SKIN_PASS.value = 0
      for (const o of hidden) o.visible = true
      scene.background = bg; renderer.setClearColor(clear, alpha); renderer.shadowMap.autoUpdate = auto
      // 3. the blur, x then y
      const u = blurMat.uniforms
      u.res.value.copy(size); u.near.value = camera.near; u.far.value = camera.far; u.width.value = api.width
      u.pxPerCm.value = camera.projectionMatrix.elements[5] * 0.5 * size.y
      quad.material = blurMat
      u.tColor.value = skinT.textures[0]; u.dir.value.set(1, 0); u.unpremultiply.value = 1
      renderer.setRenderTarget(blurX); quad.render(renderer)
      u.tColor.value = blurX.texture; u.dir.value.set(0, 1); u.unpremultiply.value = 0
      renderer.setRenderTarget(blurY); quad.render(renderer)
      // 4. the picture
      quad.material = composeMat
      renderer.setRenderTarget(null); quad.render(renderer)
    },
    dispose() { for (const t of [sceneT, skinT, blurX, blurY]) t.dispose(); blurMat.dispose(); composeMat.dispose(); quad.dispose() },
  }
  return api
}
