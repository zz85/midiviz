// The strand hair's shading (pianist/hair.js) for three.js's WebGPU renderer, in
// TSL (pathtrace/live-gpu.js). The same shader, line for line: each child strand a
// camera-facing ribbon swept along a Catmull-Rom spline through its three guide
// hairs (texture uGuides), clumped toward the tips, a little frizz on loose hair;
// shaded Kajiya-Kay with two shifted Marschner-style lobes and transmission from
// the scene's spot lights (hair.js puts up to MAXL of them in its uniforms).
//
// Two things change with the renderer:
//  • coverage: the GLSL page draws the soft ribbon edges with alpha to coverage on
//    its multisampled target; the WebGPU scene pass isn't multisampled, so a
//    fragment is kept where its coverage beats an interleaved-gradient noise that
//    changes every frame, and TRAA averages the dither into the same soft edge;
//  • the scene pass's other attachments (live-gpu.js's MRT): the hair writes its
//    base colour as the diffuse colour SSGI lights, the fibre's normal in view
//    space, and no metalness with a roughness of 0.45, so SSGI and SSR see hair.
//
// The output is linear, as every material's in that pass: tone mapping comes at
// the end of the chain.

import * as THREE from 'three/webgpu'
import {
  Fn, attribute, uniform, textureLoad, ivec2, int, vec2, vec3, vec4, float, mat3, select, clamp, floor, sqrt, max, min, pow, sin, cos,
  smoothstep, mix, normalize, cross, dot, length, abs, varying, modelWorldMatrix, cameraViewMatrix, cameraProjectionMatrix,
  cameraPosition, screenCoordinate, interleavedGradientNoise, frameId, Discard, mrt, packNormalToRGB, transformDirection,
} from 'three/tsl'

/** A node material for hair.js's strand mesh, reading its uniforms (whose values hair.js changes in place). */
export function hairNodeMaterial(U, MAXL) {
  const uGuides = U.uGuides.value, uNP = uniform(U.uNP.value), uHeadRot = uniform(U.uHeadRot.value), uWidth = uniform(U.uWidth.value)
  const uRoot = uniform(U.uRoot.value), uTip = uniform(U.uTip.value), uHi = uniform(U.uHi.value), uAmbient = uniform(U.uAmbient.value)
  const L = Array.from({ length: MAXL }, (_, i) => ({ pos: uniform(U.uLightPos.value[i]), col: uniform(U.uLightCol.value[i]), dir: uniform(U.uLightDir.value[i]), cone: uniform(U.uLightCone.value[i]) }))
  const aT = attribute('aT', 'float'), aSide = attribute('aSide', 'float')
  const aG = attribute('aG', 'vec3'), aW = attribute('aW', 'vec3'), aO = attribute('aO', 'vec3'), aR = attribute('aR', 'vec4')

  const gp = Fn(([g, i]) => textureLoad(uGuides, ivec2(int(clamp(i, 0, uNP.sub(1))), int(g))).xyz)
  const cr = Fn(([g, u]) => {
    const i = floor(u), f = u.sub(i)
    const p1 = gp(g, i), p2 = gp(g, i.add(1))
    const p0 = select(i.lessThan(1), p1.mul(2).sub(p2), gp(g, i.sub(1)))
    const p3 = select(i.add(2).greaterThan(uNP.sub(1)), p2.mul(2).sub(p1), gp(g, i.add(2)))
    const f2 = f.mul(f), f3 = f2.mul(f)
    return p1.mul(2).add(p2.sub(p0).mul(f)).add(p0.mul(2).sub(p1.mul(5)).add(p2.mul(4)).sub(p3).mul(f2)).add(p0.negate().add(p1.mul(3)).sub(p2.mul(3)).add(p3).mul(f3)).mul(0.5)
  })
  const strand = Fn(([t]) => {
    const u = t.mul(uNP.sub(1))
    const p = cr(aG.x, u).mul(aW.x).add(cr(aG.y, u).mul(aW.y)).add(cr(aG.z, u).mul(aW.z))
    const kind = aR.w
    // clump toward the tips (loose), gather into the bun (tied)
    const keep = select(kind.lessThan(0.5), float(1).sub(pow(t, 1.3).mul(0.55)), select(kind.lessThan(1.5), float(1).sub(t.mul(0.85)), float(1)))
    const ph = aR.z.mul(40)
    // a little frizz and waviness along loose hair
    const frizz = vec3(sin(t.mul(23).add(ph)), cos(t.mul(17).add(ph.mul(1.3))), sin(t.mul(29).add(ph.mul(0.7)))).mul(t.mul(0.12))
    const o = uHeadRot.mul(aO.mul(keep)).add(select(kind.lessThan(0.5), uHeadRot.mul(frizz), vec3(0)))
    return p.add(o)
  })

  // ── vertex ──
  // shorter children here and there
  const len = select(aR.w.lessThan(0.5), pow(aR.x, 0.6).mul(0.28).add(0.72), float(1))
  const t = aT.mul(len)
  const p = strand(t)
  const T = normalize(strand(min(t.add(0.02), 1)).sub(strand(max(t.sub(0.02), 0))))
  const wp0 = modelWorldMatrix.mul(vec4(p, 1)).xyz
  const V0 = normalize(cameraPosition.sub(wp0))
  const S = normalize(cross(T, V0))
  // keep at least ~0.7 px wide so strands do not alias away
  const cvz = cameraViewMatrix.mul(vec4(wp0, 1)).z
  const w = max(uWidth.mul(aR.x.mul(0.6).add(0.7)).mul(float(1).sub(pow(aT, 1.6).mul(0.8))), cvz.negate().mul(0.0012))
  const wp = wp0.add(S.mul(aSide).mul(w))
  const vT = varying(T, 'vHairT'), vP = varying(wp, 'vHairP'), vAcross = varying(aSide, 'vHairAcross'), vAlong = varying(aT, 'vHairAlong')
  const vR = varying(aR, 'vHairR'), vN = varying(normalize(cross(S, T)), 'vHairN')

  // ── fragment ──
  const Tn = normalize(vT), V = normalize(cameraPosition.sub(vP))
  // round the ribbon into a fibre: normal across it
  const a = vAcross
  const N = normalize(vN.mul(sqrt(max(0, float(1).sub(a.mul(a))))).add(normalize(cross(Tn, V)).mul(a)))
  // colour: dark roots, lighter lengths, sun-bleached highlights on some strands
  const hi = smoothstep(0.5, 1, vR.y).mul(smoothstep(0.1, 0.8, vAlong))
  const base = mix(mix(uRoot, uTip, smoothstep(0, 0.9, vAlong)), uHi, hi.mul(0.5)).mul(vR.x.mul(0.08).add(0.96))
  // self-shadowing stand-in: inner and root hair darker
  const occ = select(vR.w.greaterThan(0.5), select(vR.w.greaterThan(1.5), float(0.82), float(0.92)), mix(0.8, 1, smoothstep(0, 0.25, vAlong)))
  let col = uAmbient.mul(base).mul(occ).mul(2)
  const TV = dot(Tn, V), sinTV = sqrt(max(0, float(1).sub(TV.mul(TV))))
  for (const l of L) {
    const Ld = l.pos.sub(vP), Ln = Ld.div(length(Ld))
    const cone = smoothstep(l.cone.x, l.cone.y, dot(Ln.negate(), l.dir))
    const TL = dot(Tn, Ln), sinTL = sqrt(max(0, float(1).sub(TL.mul(TL))))
    // Kajiya-Kay diffuse, wrapped a little
    const diff = mix(0.25, 1, sinTL).mul(clamp(dot(N, Ln).mul(0.5).add(0.5), 0, 1))
    // two shifted lobes (Marschner R / TRT): cone around the fibre
    const s1 = TL.add(0.12), s2 = TL.sub(0.1)
    const h1 = sqrt(max(0, float(1).sub(s1.mul(s1)))).mul(sinTV).sub(s1.mul(TV))
    const h2 = sqrt(max(0, float(1).sub(s2.mul(s2)))).mul(sinTV).sub(s2.mul(TV))
    const spec1 = pow(max(h1, 0), 90).mul(0.55), spec2 = pow(max(h2, 0), 22).mul(0.5)
    // transmission: light from behind glows through the strands (TT)
    const tt = pow(max(0, dot(Ln.negate(), V)), 6).mul(0.9)
    col = col.add(l.col.mul(cone).mul(occ).mul(base.mul(diff).add(vec3(spec1)).add(base.mul(1.6).mul(spec2).mul(hi.add(0.6))).add(base.mul(1.8).mul(tt))))
  }
  // coverage: soft across the ribbon, thinning at the tips
  const cov = float(1).sub(smoothstep(0.45, 1, abs(a))).mul(float(1).sub(smoothstep(0.6, 1, vAlong)))
    .mul(select(vR.w.greaterThan(1.5), float(1), smoothstep(0, select(vR.w.greaterThan(0.5), float(0.07), float(0.05)), vAlong).mul(0.85).add(0.15)))

  const m = new THREE.MeshBasicNodeMaterial({ side: THREE.DoubleSide })
  m.name = 'HairStrandsTSL'
  m.vertexNode = cameraProjectionMatrix.mul(cameraViewMatrix).mul(vec4(wp, 1))
  m.colorNode = Fn(() => {
    // the dither stands in for alpha to coverage (see above)
    const n = interleavedGradientNoise(screenCoordinate.xy.add(vec2(float(frameId).mul(5.588238), float(frameId).mul(3.13))))
    Discard(cov.lessThan(n))
    return vec4(col, 1)
  })()
  m.mrtNode = mrt({ diffuseColor: vec4(base, 1), normal: packNormalToRGB(transformDirection(N, cameraViewMatrix)), metalrough: vec2(0, 0.45) })
  return m
}
