// The live picture on three.js's WebGPU renderer (?gpu=webgpu; #045, #049, #050),
// with screen-space global illumination (SSGI) and reflections (SSR) in its
// post chain. Work in progress: the WebGL page (pathtrace/app.js's own chain)
// stays the default until this one draws everything it draws.
//
// createLiveGPU() makes the renderer; livePost() builds the chain as a TSL
// RenderPipeline and answers the same shapes app.js drives the WebGL chain by
// (composer, bokeh, bloom, grain), so the page's code runs on either:
//
//   scene pass, MRT: colour, diffuse colour, view normal, metalness/roughness, velocity
//   → SSGI: indirect light (diffuse × GI) and ambient occlusion on the colour
//   → SSR: reflections, added (SSR's output is premultiplied)
//   → TRAA: temporal anti-aliasing, which SSGI's and SSR's noise is made for
//   → depth of field (DepthOfFieldNode), bloom (BloomNode)
//   → tone mapping, then vignette and grain (the WebGL page's grain, in TSL)
//
// The attachments: normal, metalness/roughness and diffuse are 8-bit (three's
// SSR example does the same), and the renderer asks for 64 bytes of colour
// attachments a pixel; WebGPU's default is 32, which five targets exceed.
//
// Headless (SwiftShader), Chrome loses the WebGPU device as soon as a frame is
// presented to a canvas; offscreen: true renders into a target instead, which
// frame() reads back.

import * as THREE from 'three/webgpu'
import {
  pass, mrt, output, normalView, metalness, roughness, diffuseColor, velocity, packNormalToRGB, unpackRGBToNormal,
  sample, vec2, vec3, vec4, add, uniform, uv, Fn, float, fract, sin, cos, dot, floor, mix, max, min, renderOutput, select,
  attribute, abs, clamp, length, convertToTexture, clearcoat, clearcoatRoughness, positionViewDirection, pow, varying, modelViewMatrix, screenDPR, Discard, screenUV, positionView, perspectiveDepthToViewZ, cameraNear, cameraFar,
} from 'three/tsl'
import { ssgi } from 'three/addons/tsl/display/SSGINode.js'
import { ssr } from 'three/addons/tsl/display/SSRNode.js'
import { traa } from 'three/addons/tsl/display/TRAANode.js'
import { dof } from 'three/addons/tsl/display/DepthOfFieldNode.js'
import { bloom as bloomNode } from 'three/addons/tsl/display/BloomNode.js'

let gradeMod = null

/** The WebGPU renderer, initialised. */
export async function createLiveGPU({ antialias = false } = {}) {
  // the area lights are drawn with the LTC tables, which WebGPU loads apart (as engines.js does)
  const { RectAreaLightTexturesLib } = await import('three/addons/lights/RectAreaLightTexturesLib.js')
  THREE.RectAreaLightNode.setLTC(RectAreaLightTexturesLib.init())
  const renderer = new THREE.WebGPURenderer({ antialias, powerPreference: 'high-performance', requiredLimits: { maxColorAttachmentBytesPerSample: 64 } })
  await renderer.init()
  gradeMod = await import('./grade-gpu.js')
  // the page's GLSL material patches, in TSL, as the renderer converts each material
  ;(await import('./tsl-patches.js')).installPatches(renderer)
  if (!renderer.backend?.isWebGPUBackend) console.warn('live-gpu: no WebGPU here, three.js fell back to WebGL 2 (SSGI and SSR still run, slower)')
  return renderer
}

/**
 * The post chain. Returns { composer, bokeh, bloom, grain, fx, frame }: composer.render()
 * draws a frame, bokeh/bloom/grain hold the settings app.js sets (as the WebGL passes'),
 * fx the SSGI / SSR switches and strengths.
 */
export function livePost(renderer, scene, camera, { offscreen = false } = {}) {
  if (!gradeMod) throw new Error('live-gpu: createLiveGPU() first (it loads the grade)')
  const pipe = new THREE.RenderPipeline(renderer)
  pipe.outputColorTransform = false   // (tone mapping and the colour space are applied before the grain, below)
  const sp = pass(scene, camera)
  // SSR reflects by metalness alone (it skips a non-metal), so the lacquer, a black
  // dielectric under a clearcoat, would reflect nothing: its "metalness" here is the
  // larger of the metal's and the coat's reflectance, the coat's by Fresnel, as the
  // WebGL page's fallboard mirror weights it (0.045 at normal incidence, 1 at grazing),
  // with the coat's roughness where the coat is what reflects
  const coatF = clearcoat.mul(pow(float(1).sub(clamp(dot(normalView, positionViewDirection), 0, 1)), 5).mul(0.955).add(0.045))
  const reflectance = max(metalness, coatF), reflRough = select(coatF.greaterThan(metalness), clearcoatRoughness, roughness)
  sp.setMRT(mrt({ output, diffuseColor, normal: packNormalToRGB(normalView), metalrough: vec2(reflectance, reflRough), velocity }))
  for (const k of ['normal', 'metalrough', 'diffuseColor']) sp.getTexture(k).type = THREE.UnsignedByteType
  const col = sp.getTextureNode('output'), dif = sp.getTextureNode('diffuseColor'), depth = sp.getTextureNode('depth')
  const nrmT = sp.getTextureNode('normal'), mr = sp.getTextureNode('metalrough'), vel = sp.getTextureNode('velocity')
  const normal = sample(u => unpackRGBToNormal(nrmT.sample(u)))

  // settings, as uniforms the page changes without rebuilding the chain
  const U = {
    gi: uniform(1), ao: uniform(1), refl: uniform(1), sharpen: uniform(0.6),
    focus: uniform(150), aperture: uniform(0.00011), maxblur: uniform(0.006), dofOn: uniform(1),
    bloomOn: uniform(1),
    grainAmt: uniform(0.035), vig: uniform(0.55), time: uniform(0), res: uniform(new THREE.Vector2(1920, 1080)),
  }

  // SSGI: GI (rgb) and AO, composited as three's example does, each by its strength
  const giPass = ssgi(col, depth, normal, camera)
  giPass.sliceCount.value = 2; giPass.stepCount.value = 8
  // (three's defaults are in metres; the stage is in centimetres: 12 m of reach is far
  // beyond what screen space holds, and 1 m of thickness swallows her)
  giPass.radius.value = 120; giPass.thickness.value = 4
  const gi = giPass.getGINode(), ao = giPass.getAONode()
  const lit = vec4(add(col.rgb.mul(mix(float(1), ao, U.ao)), dif.rgb.mul(gi.rgb).mul(U.gi)), col.a)

  // SSR, from the scene's own colour (as three's example), over the lit picture
  const ssrPass = ssr(col, depth, normal, { metalnessNode: mr.r, roughnessNode: mr.g, camera })
  // (in cm, as above: rays up to 3 m, a hit within 1.5 cm of the depth)
  ssrPass.maxDistance.value = 300; ssrPass.thickness.value = 1.5
  const reflected = vec4(lit.rgb.add(ssrPass.rgb.mul(U.refl)), lit.a)

  const aa0 = traa(reflected, depth, vel, camera)
  // TRAA's resampling of its history softens what is a pixel or two wide (the hair
  // cards' strands, the strings): a contrast-adaptive sharpen (after AMD's CAS) gives
  // the detail back, less where the neighbourhood already has contrast, so edges don't ring
  const aaT = convertToTexture(aa0), px = vec2(1).div(U.res)
  const aa = Fn(() => {
    const c = aaT.sample(uv()), n = aaT.sample(uv().add(vec2(0, px.y))).rgb, s0 = aaT.sample(uv().sub(vec2(0, px.y))).rgb
    const e = aaT.sample(uv().add(vec2(px.x, 0))).rgb, w = aaT.sample(uv().sub(vec2(px.x, 0))).rgb
    const mn = min(min(min(n, s0), min(e, w)), c.rgb), mx = max(max(max(n, s0), max(e, w)), c.rgb)
    const amp = clamp(min(mn, vec3(2).sub(mx)).div(max(mx, 1e-4)), 0, 1).sqrt()
    const k = amp.mul(U.sharpen.mul(-0.2))
    const out = c.rgb.add(n.add(s0).add(e).add(w).mul(k)).div(k.mul(4).add(1))
    return vec4(max(out, 0), c.a)
  })()

  // depth of field: BokehPass blurs by |focus − depth| × aperture (in the frame's width),
  // up to maxblur, and samples out to 0.4 of that; DepthOfFieldNode reaches its full blur
  // at focalLength from the focus, over bokehScale pixels. So focalLength = maxblur / aperture
  // and bokehScale = 0.4 × maxblur × width
  const viewZ = sp.getViewZNode()
  const focalLen = U.maxblur.div(max(U.aperture, 1e-7))
  const dofPass = dof(aa, viewZ, U.focus, focalLen, U.maxblur.mul(U.res.x).mul(0.4).mul(U.dofOn))

  // the dust in the beam, a pass of its own after TRAA: TRAA's clamp to each pixel's
  // neighbours takes out a mote a pixel or two wide, as it does any lone speck. The
  // motes test the scene pass's depth themselves (dustSprites), so she still hides them
  const overlay = new THREE.Scene()
  sceneDepth = depth
  const dustPass = pass(overlay, camera)
  const withDust = vec4(dofPass.rgb.add(dustPass.getTextureNode('output').rgb), 1)

  const bl = bloomNode(withDust, 0.12, 0.4, 0.92)
  const bloomed = withDust.add(bl.mul(U.bloomOn))

  // the grade (pathtrace/grade-gpu.js): tone curve, colour, the page's vignette and grain
  // and the look's own lens and film effects; 'stage' is the WebGL page's picture
  const graded = gradeMod.grade(bloomed, { grainAmt: U.grainAmt, vig: U.vig, time: U.time, res: U.res })
  pipe.outputNode = graded.node

  // the target a frame renders into in place of the canvas: always where offscreen
  // (headless), and while capturing (the exports, which read every frame back)
  let target = null, capturing = false
  const size = new THREE.Vector2()
  const ensureTarget = () => {
    target ||= new THREE.RenderTarget(1, 1, { type: THREE.UnsignedByteType, depthBuffer: false })
    if (target.width !== U.res.value.x || target.height !== U.res.value.y) target.setSize(U.res.value.x, U.res.value.y)
    return target
  }
  const setSize = (w, h2) => { U.res.value.set(w * renderer.getPixelRatio(), h2 * renderer.getPixelRatio()); if (target) ensureTarget() }
  renderer.getSize(size); setSize(size.x, size.y)

  const uniformsOf = map => Object.fromEntries(Object.entries(map).map(([k, u]) => [k, u]))
  const bokeh = {
    enabled: true,
    uniforms: uniformsOf({ focus: U.focus, aperture: U.aperture, maxblur: U.maxblur, aspect: { value: 1 } }),
    render() {},
  }
  const bloom = {
    enabled: true,
    get strength() { return bl.strength.value }, set strength(v) { bl.strength.value = v },
    get radius() { return bl.radius.value }, set radius(v) { bl.radius.value = v },
    get threshold() { return bl.threshold.value }, set threshold(v) { bl.threshold.value = v },
  }
  const grain = { uniforms: uniformsOf({ uTime: U.time, uAmount: U.grainAmt, uVig: U.vig, uRes: U.res }), material: { vertexShader: '', fragmentShader: '' } }
  const fx = {
    get ssgi() { return U.gi.value > 0 || U.ao.value > 0 }, set ssgi(on) { U.gi.value = on ? 1 : 0; U.ao.value = on ? 1 : 0 },
    get ssr() { return U.refl.value > 0 }, set ssr(on) { U.refl.value = on ? 1 : 0 },
    uniforms: U, nodes: { scene: sp, lit, reflected, giPass, ssrPass, traa: aa0, sharpened: aa, dof: dofPass, bloom: bl, withDust, bloomed, graded },
    /** a look of grade-gpu.js's GRADES, by name */
    grade: name => graded.set(name), grades: gradeMod.GRADES,
  }
  // The nodes that read the camera (SSGI's, SSR's, TRAA's jitter) update once a node
  // frame, and three advances the node frame in its animation loop's requestAnimationFrame.
  // An export renders many frames between two of those, with the camera moved each time:
  // a render after another in the same node frame starts a new one itself
  const nodeFrame = renderer._nodes?.nodeFrame
  let lastFrame = -1
  const composer = {
    render() {
      U.dofOn.value = bokeh.enabled ? 1 : 0; U.bloomOn.value = bloom.enabled ? 1 : 0
      if (nodeFrame) {
        if (nodeFrame.frameId === lastFrame) { nodeFrame.update(); renderer.info.frame = nodeFrame.frameId }
        lastFrame = nodeFrame.frameId
      }
      const t = offscreen || capturing ? ensureTarget() : null
      if (t) renderer.setRenderTarget(t)
      pipe.render()
      if (t) renderer.setRenderTarget(null)
    },
    setSize, setPixelRatio() {},
  }
  /** the last frame's pixels, RGBA top-down, read back from the target */
  async function pixels() {
    const t = ensureTarget(), w = t.width, h2 = t.height
    const px = await renderer.readRenderTargetPixelsAsync(t, 0, 0, w, h2)
    return { w, h: h2, data: new Uint8ClampedArray(px.buffer, px.byteOffset, w * h2 * 4) }   // (WebGPU's rows run top-down, as a canvas's)
  }
  /** offscreen: the last frame, as a PNG data URL */
  async function frame() {
    if (!offscreen && !capturing) return renderer.domElement.toDataURL('image/png')
    const { w, h, data } = await pixels()
    const c = document.createElement('canvas'); c.width = w; c.height = h
    c.getContext('2d').putImageData(new ImageData(data, w, h), 0, 0)
    return c.toDataURL('image/png')
  }
  /**
   * For the exports: capture(true) renders each frame into the target instead of the
   * canvas (the canvas of a WebGPU context can't be read back once it is presented, and
   * a headless browser loses the device presenting one); picture() is the last frame
   * as an ImageBitmap, which VideoFrame and drawImage both take.
   */
  const capture = on => { capturing = !!on }
  async function picture() {
    const { w, h, data } = await pixels()
    return createImageBitmap(new ImageData(data, w, h))
  }

  // quality of the live picture: what SSGI, SSR and TRAA cost, against how they look
  // (three's SSGI presets, with temporal filtering: low 1 × 12, medium 2 × 8, high 3 × 16)
  const QUALITY = {
    low: { slices: 1, steps: 12, giScale: 0.5, ssrScale: 0.5, ssrQuality: 0.3 },
    medium: { slices: 2, steps: 8, giScale: 1, ssrScale: 0.5, ssrQuality: 0.5 },
    high: { slices: 3, steps: 16, giScale: 1, ssrScale: 1, ssrQuality: 0.75 },
  }
  let quality = 'medium'
  function setQuality(q) {
    const Q = QUALITY[q] || QUALITY.medium
    quality = QUALITY[q] ? q : 'medium'
    giPass.sliceCount.value = Q.slices; giPass.stepCount.value = Q.steps; giPass.resolutionScale = Q.giScale
    ssrPass.resolutionScale = Q.ssrScale; ssrPass.quality.value = Q.ssrQuality
    return quality
  }
  setQuality('medium')
  fx.setQuality = setQuality; fx.qualities = Object.keys(QUALITY)
  Object.defineProperty(fx, 'quality', { get: () => quality })
  return { composer, bokeh, bloom, grain, fx, frame, pipe, overlay, capture, picture }
}

// the scene pass's depth, for the dust's own depth test (set by livePost)
let sceneDepth = null

/**
 * The page's GLSL materials in TSL, in place: { hair }, a strand hair of
 * pianist/hair.js (its ribbons' shader, pianist/hair-tsl.js); other hair kinds
 * are plain materials and stay as they are.
 */
export async function toNodeMaterials({ hair } = {}) {
  if (hair?.kind === 'strands' && hair.strandMesh && !hair.strandMesh.material.isNodeMaterial) {
    const { hairNodeMaterial } = await import('../pianist/hair-tsl.js')
    const old = hair.strandMesh.material
    hair.strandMesh.material = hairNodeMaterial(hair.uniforms, hair.MAXL)
    old.dispose()
  }
}

/**
 * The dust in the beam (app.js's Points and its GLSL) as sprites: WebGPU draws a
 * point primitive one pixel wide, so each mote is an instanced quad of a
 * PointsNodeMaterial, sized as the GLSL sizes it. Answers the mesh, whose
 * material.uniforms hold uTime, uScale and uOpacity as the Points' did. Add it to
 * livePost's overlay scene, not to the scene.
 */
export function dustSprites(points) {
  const src = points.geometry, N = src.attributes.position.count
  const quad = new THREE.PlaneGeometry(1, 1)
  const geo = new THREE.InstancedBufferGeometry()
  geo.index = quad.index
  geo.setAttribute('position', quad.attributes.position); geo.setAttribute('uv', quad.attributes.uv)
  geo.setAttribute('center', new THREE.InstancedBufferAttribute(src.attributes.position.array, 3))
  geo.setAttribute('seed', new THREE.InstancedBufferAttribute(src.attributes.seed.array, 1))
  geo.instanceCount = N
  const U = points.material.uniforms
  const uTime = uniform(U.uTime.value), uScale = uniform(U.uScale.value), uOpacity = uniform(U.uOpacity.value)
  const seed = attribute('seed', 'float'), c = attribute('center', 'vec3')
  // the GLSL's drift, size and twinkle (pathtrace/app.js)
  const p = c.add(vec3(sin(uTime.mul(0.07).add(seed)).mul(9), sin(uTime.mul(0.05).add(seed.mul(1.7))).mul(7), cos(uTime.mul(0.06).add(seed.mul(0.7))).mul(9)))
  const mvz = modelViewMatrix.mul(vec4(p, 1)).z
  const MIN_PX = 1.5
  const px = clamp(uScale.mul(0.22).div(mvz.negate()), uScale.mul(0.000926), uScale.mul(0.00324))
  const vA = varying(abs(sin(uTime.mul(0.4).add(seed.mul(3)))).mul(0.6).add(0.4).mul(min(1, px.mul(px).div(MIN_PX * MIN_PX))), 'vDustA')
  const m = new THREE.PointsNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: false })
  m.name = 'DustTSL'
  m.positionNode = p
  m.sizeNode = max(px, MIN_PX).div(screenDPR)   // (in device pixels, as gl_PointSize; the material scales by the DPR)
  m.colorNode = Fn(() => {
    const d = length(uv().sub(0.5))
    Discard(d.greaterThan(0.5))
    // behind what the scene pass drew there: hidden (the motes are drawn in a pass of their own)
    if (sceneDepth) Discard(positionView.z.lessThan(perspectiveDepthToViewZ(sceneDepth.sample(screenUV).x, cameraNear, cameraFar)))
    return vec4(vec3(1, 0.85, 0.65).mul(1.4), float(1).sub(d.mul(2)).mul(vA).mul(uOpacity))
  })()
  m.uniforms = { uTime, uScale, uOpacity }
  const mesh = new THREE.Mesh(geo, m)
  mesh.frustumCulled = false
  mesh.name = 'dust'
  points.geometry = new THREE.BufferGeometry(); points.material.dispose()
  return mesh
}
