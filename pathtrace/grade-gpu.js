// A film grade for the WebGPU picture (pathtrace/live-gpu.js), in TSL, after
// The Mechanical Pianist's (../mechanical-pianist, src/presentation/PostPipeline.ts
// gradeFS and its streak passes, and VisualStyles.ts for the looks), in place
// of matching the WebGL page's bloom-then-AgX one to one.
//
// On the HDR picture, in order:
//   chromatic aberration (red and blue pulled apart toward the corners)
//   → anamorphic streaks (bright parts smeared sideways: a half-resolution
//     extract above a threshold, blurred horizontally three times at growing spacing)
//   → white balance (warmth) → highlight roll-off (the top end compressed
//     before the curve) → tone curve: AgX, as the WebGL page, or ACES (fitted),
//     as The Mechanical Pianist
//   → lift / gamma / gain → split toning (shadow and highlight tints)
//   → saturation, with an accent hue kept (cyan, for the Noir, cyan look) → sRGB → contrast about mid grey
//   → black tint (the deepest shadows keep a colour) → fade (lifted blacks)
//   → the page's own vignette and grain (the amounts of its sliders, the
//     grain the same at every resolution) → letterbox bars
//
// GRADES holds the looks; 'stage' is the WebGL page's picture (AgX and nothing
// else), so the page looks the same until a look is chosen. Each look sets the
// grade alone: the stage's lights are the page's own (The Mechanical Pianist's
// looks also set its room's lights, which this stage doesn't have).

import * as THREE from 'three/webgpu'
import {
  Fn, uniform, uv, vec2, vec3, vec4, float, mat3, dot, mix, max, min, pow, smoothstep, clamp, floor, fract, sin, length, select, step,
  agxToneMapping, toneMappingExposure, sRGBTransferOETF, convertToTexture,
} from 'three/tsl'
import { gaussianBlur } from 'three/addons/tsl/display/GaussianBlurNode.js'

const N = { contrast: 1, saturation: 1, accent: 0, warmth: 0, rolloff: 0, fade: 0, lift: [0, 0, 0], gamma: [1, 1, 1], gain: [1, 1, 1], shadowTint: [1, 1, 1], highlightTint: [1, 1, 1], blackTint: [0, 0, 0], aberration: 0, streaks: 0, streakThreshold: 1.2, letterbox: 0, grain: 1, vignette: 1, curve: 'agx' }

/** The looks. grain and vignette multiply the page's sliders; the rest are as The Mechanical Pianist's grade takes them. */
export const GRADES = {
  stage: { label: 'Stage (as the WebGL page)', ...N },
  // (no tone curve: a page whose WebGL renderer has none, such as #038 Duo; values above 1 clip)
  flat: { label: 'No tone curve', ...N, curve: 'none' },
  golden: {
    label: 'Golden hour', ...N, curve: 'aces', warmth: 0.55, rolloff: 0.6, saturation: 0.92, contrast: 1.06,
    lift: [0.012, 0.006, 0], gain: [1.03, 1, 0.94], shadowTint: [1.04, 0.98, 0.9], highlightTint: [1.03, 1, 0.94], blackTint: [0.025, 0.012, 0], aberration: 0.004, streaks: 0.25,
  },
  noir: {
    label: 'Noir', ...N, curve: 'aces', saturation: 0, contrast: 1.55, rolloff: 0.9, grain: 1.9, vignette: 1.7,
    aberration: 0.004, streaks: 0.6, letterbox: 2.39,
  },
  noirCyan: {
    label: 'Noir, cyan', ...N, curve: 'aces', saturation: 0, accent: 1, contrast: 1.55, rolloff: 0.9, grain: 1.7, vignette: 1.7,
    aberration: 0.004, streaks: 0.9, letterbox: 2.39,
  },
  moonlight: {
    label: 'Moonlight', ...N, curve: 'aces', warmth: -0.6, contrast: 1.2, saturation: 0.72, rolloff: 0.7, grain: 1.2, vignette: 1.3,
    shadowTint: [0.9, 0.96, 1.08], highlightTint: [0.97, 1, 1.04], blackTint: [0, 0.006, 0.02], streaks: 0.9,
  },
  faded: {
    label: 'Faded film', ...N, curve: 'aces', warmth: 0.7, contrast: 0.98, saturation: 0.6, rolloff: 1.2, fade: 0.75, grain: 2.3, vignette: 1.9,
    letterbox: 1.85, aberration: 0.006,
  },
  studio: { label: 'Studio', ...N, curve: 'aces', warmth: 0.05, contrast: 1.05, saturation: 0.95, rolloff: 0.4, grain: 0.4, vignette: 0.6 },
}

const LUMA = vec3(0.2126, 0.7152, 0.0722)

// ACES, fitted (Stephen Hill's), as The Mechanical Pianist's acesFitted
const acesFitted = Fn(([c0]) => {
  const IN = mat3(0.59719, 0.07600, 0.02840, 0.35458, 0.90834, 0.13383, 0.04823, 0.01566, 0.83777)
  const OUT = mat3(1.60475, -0.10208, -0.00327, -0.53108, 1.10813, -0.07276, -0.07367, -0.00605, 1.07602)
  const v = IN.mul(c0)
  const a = v.mul(v.add(0.0245786)).sub(0.000090537), b = v.mul(v.mul(0.983729).add(0.4329510)).add(0.238081)
  return clamp(OUT.mul(a.div(b)), 0, 1)
})

/**
 * The grade, on an HDR node. page: { grainAmt, vig, time, res } (the page's uniforms,
 * as live-gpu.js keeps them). Answers { node, uniforms, set(name) }.
 */
export function grade(hdr, page) {
  const U = {
    contrast: uniform(1), saturation: uniform(1), accent: uniform(0), warmth: uniform(0), rolloff: uniform(0), fade: uniform(0),
    lift: uniform(new THREE.Vector3()), gamma: uniform(new THREE.Vector3(1, 1, 1)), gain: uniform(new THREE.Vector3(1, 1, 1)),
    shadowTint: uniform(new THREE.Vector3(1, 1, 1)), highlightTint: uniform(new THREE.Vector3(1, 1, 1)), blackTint: uniform(new THREE.Vector3()),
    aberration: uniform(0), streaks: uniform(0), streakThreshold: uniform(1.2), letterbox: uniform(0), grain: uniform(1), vignette: uniform(1),
    aces: uniform(0), flat: uniform(0),
  }
  const src = convertToTexture(hdr)

  // anamorphic streaks: what is brighter than the threshold, smeared sideways
  const extract = Fn(() => {
    const c = src.sample(uv()).rgb, l = dot(c, LUMA)
    return vec4(min(c.mul(max(l.sub(U.streakThreshold), 0).div(max(l, 1e-4))), vec3(30)), 1)
  })()
  let streak = extract
  for (const k of [1, 3, 9]) streak = gaussianBlur(streak, vec2(k, 0), 4, { resolutionScale: 0.5 })
  // (a cool tint, as a lens's coating gives a streak)
  const streakRGB = streak.rgb.mul(vec3(0.75, 0.9, 1.25))

  const node = Fn(() => {
    const d = uv().sub(0.5), aspect = page.res.x.div(page.res.y)
    const r2 = dot(d.mul(vec2(aspect, 1)), d.mul(vec2(aspect, 1)))
    const ca = d.mul(U.aberration).mul(r2)
    let c = vec3(src.sample(uv().sub(ca)).r, src.sample(uv()).g, src.sample(uv().add(ca)).b)
    c = c.add(streakRGB.mul(U.streaks))
    c = c.mul(vec3(U.warmth.mul(0.12).add(1), U.warmth.mul(0.015).add(1), float(1).sub(U.warmth.mul(0.12))))
    // the exposure, as the renderer's tone mapping takes it
    c = c.mul(toneMappingExposure)
    // highlight roll-off before the curve
    c = c.div(U.rolloff.mul(max(dot(c, LUMA).sub(0.35), 0)).add(1))
    c = select(U.flat.greaterThan(0.5), clamp(c, 0, 1), select(U.aces.greaterThan(0.5), acesFitted(c), agxToneMapping(c, float(1))))
    c = c.mul(U.gain).add(U.lift.mul(float(1).sub(c)))
    c = pow(max(c, 0), vec3(1).div(U.gamma))
    c = c.mul(mix(U.shadowTint, U.highlightTint, smoothstep(0.05, 0.7, dot(c, LUMA))))
    const l = dot(c, LUMA), chroma = c.sub(vec3(l))
    const cyan = smoothstep(0.55, 0.85, dot(chroma.div(max(length(chroma), 1e-5)), vec3(-0.85, 0.3, 0.43))).mul(smoothstep(0.015, 0.06, length(chroma)))
    c = max(mix(vec3(l), c, max(U.saturation, U.accent.mul(cyan).mul(1.2))), 0)
    let s = sRGBTransferOETF(clamp(c, 0, 1))
    s = clamp(s.sub(0.5).mul(U.contrast).add(0.5), 0, 1)
    s = s.add(U.blackTint.mul(pow(float(1).sub(dot(s, vec3(0.333))), 5)))
    s = s.mul(float(1).sub(U.fade.mul(0.13))).add(vec3(0.095, 0.08, 0.065).mul(U.fade))
    // the page's vignette and grain (pathtrace/app.js), by its sliders
    const q = uv().sub(0.5)
    s = s.mul(float(1).sub(page.vig.mul(U.vignette).mul(dot(q, q)).mul(1.6)))
    const h = Fn(([p]) => fract(sin(dot(p, vec2(12.9898, 78.233)).add(fract(page.time.mul(7.13)).mul(91.7))).mul(43758.5453)))
    const n = Fn(([p]) => {
      const i = floor(p), f0 = fract(p), f = f0.mul(f0).mul(float(3).sub(f0.mul(2)))
      return mix(mix(h(i), h(i.add(vec2(1, 0))), f.x), mix(h(i.add(vec2(0, 1))), h(i.add(vec2(1, 1))), f.x), f.y)
    })
    const k = page.res.y.div(1080), cells = max(k, 1)
    const g = select(cells.greaterThan(1), n(uv().mul(page.res).div(cells)).sub(0.5).mul(1.5), h(floor(uv().mul(page.res))).sub(0.5)).mul(min(k, 1))
    s = s.add(g.mul(page.grainAmt).mul(U.grain))
    // letterbox: bars where the frame is wider than the look's aspect allows
    const bar = max(0, float(0.5).mul(float(1).sub(aspect.div(max(U.letterbox, 1e-3)))))
    const inBar = U.letterbox.greaterThan(0).and(uv().y.lessThan(bar).or(uv().y.greaterThan(float(1).sub(bar))))
    return vec4(select(inBar, vec3(0), s), 1)
  })()

  let current = 'stage'
  function set(name) {
    const g = GRADES[name] || GRADES.stage
    current = GRADES[name] ? name : 'stage'
    for (const [k, v] of Object.entries(g)) {
      if (k === 'label') continue
      if (k === 'curve') { U.aces.value = v === 'aces' ? 1 : 0; U.flat.value = v === 'none' ? 1 : 0; continue }
      if (Array.isArray(v)) U[k].value.set(...v); else U[k].value = v
    }
    return g
  }
  set('stage')
  return { node, uniforms: U, set, get: () => ({ id: current, ...GRADES[current] }) }
}
