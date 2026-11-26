// A lamp whose light comes off moving water, for WebGLRenderer: the WebGL 2 port of `Trough` in
// random-sketches/vibes/caustic/caustics.js (its vertex-shader trace; the WebGPU compute trace isn't
// ported). Units are centimetres, as in the pianist pages; the waves are set in metres.
//
//   const lamp = new CausticLamp(renderer, { at, size, from, ... })   // the water and its apparent source
//   lamp.bake(group)        // once the set is built: the map of the set seen from the source
//   group.add(lamp.light, lamp.light.target)
//   each frame: lamp.update(t)
//
// How it works (caustic/POST.md has the long version):
//  - The lamp shines down into a trough of water. The light that comes off the water seems to come from the
//    lamp's mirror image under the water (`from`), so a SpotLight sits there, aimed through the water.
//  - Once, the set is drawn from that source into a float target holding world positions (the water's own
//    side left out), so a ray can be pushed out to the surface it really lands on.
//  - Each update, a grid of rays, spread evenly over the spot light's own projection, is bent by the wave
//    normals (the mirror law), thrown out to the set (the position map read three times), and drawn where it
//    lands, each fragment adding the flat water's footprint area over the wavy water's: flat water gives 1
//    over the footprint, and the waves bunch it into lines where neighbouring rays cross.
//  - The result, blurred a little by the lamp's size and mipmapped, is the SpotLight's `map`, so every
//    standard material in the scene is lit by it, through the spot's own projection.
//
// One difference from the sketch: three's WebGL spot map lights a point outside the map's frustum at the
// spot's plain colour, so the projection is square and the cone inscribed in it (the sketch fits an
// off-centre frustum to the footprint instead), which spends more texels outside the light.
import * as THREE from 'three'

const WAVES = 12

const TRACE_VS = /* glsl */`
uniform mat4 uM, uMinv;
uniform vec3 uE, uLamp, uC, uT, uB, uN;
uniform vec2 uSize, uPosSize, uStep;
uniform sampler2D uPos;
uniform float uTime, uAmp, uDepth, uFar, uSlosh, uWsl, uThrow;
uniform vec4 uWaves[${WAVES}];
uniform float uPhase[${WAVES}];
varying float vDet;
varying vec2 vG, vA, vB;
vec2 proj(vec3 P) { vec4 h = uM * vec4(P, 1.0); return h.xy / h.w; }
float reach(vec3 p, vec2 u) { vec4 R = textureLod(uPos, u, 0.0); return R.w > 0.5 ? length(R.xyz - p) : uFar; }
// the same blended between the four texels around u where they lie on one surface (within 6%), so a ray's
// throw changes smoothly, and not across an edge between a wall and the floor far behind it
float reachSmooth(vec3 p, vec2 u) {
  vec2 f = u * uPosSize - 0.5, i = floor(f), w = f - i;
  vec4 Ra = textureLod(uPos, (i + vec2(0.5, 0.5)) / uPosSize, 0.0), Rb = textureLod(uPos, (i + vec2(1.5, 0.5)) / uPosSize, 0.0);
  vec4 Rc = textureLod(uPos, (i + vec2(0.5, 1.5)) / uPosSize, 0.0), Rd = textureLod(uPos, (i + vec2(1.5, 1.5)) / uPosSize, 0.0);
  float a = Ra.w > 0.5 ? length(Ra.xyz - p) : uFar, b = Rb.w > 0.5 ? length(Rb.xyz - p) : uFar;
  float c = Rc.w > 0.5 ? length(Rc.xyz - p) : uFar, d = Rd.w > 0.5 ? length(Rd.xyz - p) : uFar;
  float lo = min(min(a, b), min(c, d)), hi = max(max(a, b), max(c, d));
  float blend = mix(mix(a, b, w.x), mix(c, d, w.x), w.y);
  return hi - lo < lo * 0.06 ? blend : reach(p, u);
}
// the water's slope at x (metres, in its frame), g in [0, 1]^2 over the trough
vec2 slopeAt(vec2 x, vec2 g) {
  vec2 o = vec2(0.0);
  for (int i = 0; i < ${WAVES}; i++) {
    vec4 w = uWaves[i];
    o += normalize(w.xy) * w.z * sin(dot(w.xy, x) - w.w * uTime + uPhase[i]);
  }
  o.y += sin(g.y * 3.14159265) * cos(uTime * uWsl) * uSlosh;
  return o * uAmp;
}
// one ray: from the source through the water at place uv of the projection, mirrored by the wave normal,
// thrown to the surface it lands on
vec4 land(vec2 uv) {
  vec4 Q = uMinv * vec4(uv, 0.5, 1.0);
  vec3 dq = Q.xyz / Q.w - uE;
  vec3 p = uE + dq * (dot(uC - uE, uN) / dot(dq, uN));
  vec3 r = p - uC;
  vec2 x = vec2(dot(r, uT), dot(r, uB)), g = x / uSize + 0.5;
  vec2 sl = slopeAt(x * 0.01, g);
  vec3 n = normalize(uN - uT * sl.x - uB * sl.y);
  vec3 d = reflect(normalize(p - uLamp), n);
  float D0 = reach(p, uv);
  float D1 = reachSmooth(p, proj(p + d * D0 * uDepth));
  float D2 = reachSmooth(p, proj(p + d * D1 * uDepth));
  return vec4(proj(p + d * D2 * uDepth), g);
}
void main() {
  vec2 uv = position.xy;
  vec4 r0 = land(uv), rx = land(uv + vec2(uStep.x, 0.0)), ry = land(uv + vec2(0.0, uStep.y));
  vec2 jx = (rx.xy - r0.xy) / uStep.x, jy = (ry.xy - r0.xy) / uStep.y;
  vDet = jx.x * jy.y - jx.y * jy.x;
  vG = r0.zw; vA = uv; vB = r0.xy;
  gl_Position = vec4(r0.xy * 2.0 - 1.0, 0.0, 1.0);
}`

const TRACE_FS = /* glsl */`
uniform float uEdge, uSoft;
varying float vDet;
varying vec2 vG, vA, vB;
void main() {
  float e = uEdge;
  float rim = smoothstep(0.0, e, vG.x) * smoothstep(0.0, e, 1.0 - vG.x) * smoothstep(0.0, e, vG.y) * smoothstep(0.0, e, 1.0 - vG.y);
  // the lamp's size rounds a fold's peak; and never more than twice the triangle's own area ratio, which
  // conserves the light, so a vertex with a near-0 determinant on an unfolded triangle doesn't bead
  vec2 a = dFdx(vA), b = dFdy(vA), c = dFdx(vB), f = dFdy(vB);
  float tri = abs(a.x * b.y - a.y * b.x) / max(abs(c.x * f.y - c.y * f.x), 1e-14);
  float v = min(1.0 / sqrt(vDet * vDet + uSoft * uSoft), tri * 2.0);
  gl_FragColor = vec4(vec3(v * rim), 1.0);
}`

const QUAD_VS = /* glsl */`varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`
const BLUR_FS = /* glsl */`
uniform sampler2D uSrc; uniform vec2 uDir;
varying vec2 vUv;
void main() {
  // (one channel: a mirror doesn't split colours)
  float c = textureLod(uSrc, vUv - 2.0 * uDir, 0.0).r * 0.06 + textureLod(uSrc, vUv - uDir, 0.0).r * 0.24 + textureLod(uSrc, vUv, 0.0).r * 0.4
    + textureLod(uSrc, vUv + uDir, 0.0).r * 0.24 + textureLod(uSrc, vUv + 2.0 * uDir, 0.0).r * 0.06;
  gl_FragColor = vec4(vec3(c), 1.0);
}`

const POS_VS = /* glsl */`varying vec3 vW; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`
const POS_FS = /* glsl */`
uniform vec3 uC, uRoom; varying vec3 vW;
void main() { if (dot(vW - uC, uRoom) < 0.5) discard; gl_FragColor = vec4(vW, 1.0); }`

export class CausticLamp {
  /*
   * at: the water's centre (cm); size: [along T, along B] in cm; turn: T's turn about up;
   * from: the apparent source, the lamp's mirror image under the water (cm);
   * intensity: the spot's strength (decay 0, as the page's other lights);
   * waves: lMin/lMax wavelengths in metres, slope (rms), dir/spread (radians in the water's frame), speed (1 = real
   * water), slosh; res: the traced texture's side; cell: texels per grid cell; posRes: the position map's side;
   * edge: the trough's soft rim (share of its size); soft: how much the lamp's size rounds a fold's peak.
   */
  constructor(renderer, {
    at, size, turn = 0, from, color = 0xffb840, intensity = 1, lMin = 0.5, lMax = 1.8, slope = 0.009, dir = 0, spread = Math.PI,
    speed = 0.3, slosh = 0, res = 1024, cell = 4, posRes = 384, near = 50, far = 9000, seed = 1, edge = 0.15, soft = 0.035, blur = 0.6,
  }) {
    this.renderer = renderer; this.speed = speed
    this.C = new THREE.Vector3(...at)
    this.N = new THREE.Vector3(0, 1, 0)
    this.T = new THREE.Vector3(Math.cos(turn), 0, -Math.sin(turn))
    this.B = new THREE.Vector3().crossVectors(this.N, this.T).negate()
    this.size = new THREE.Vector2(...size)
    this.E = new THREE.Vector3(...from)
    const side = this.E.clone().sub(this.C).dot(this.N)
    if (side >= 0) throw new Error('caustic lamp: the source (the mirror image of the lamp) must be under the water')
    this.lamp = this.E.clone().addScaledVector(this.N, -2 * side)

    // the spot: at the source, aimed at the middle of the water's outline as seen from it, its square
    // projection just wide enough for the outline, the cone inscribed in it
    const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => this.C.clone().addScaledVector(this.T, a * size[0] / 2).addScaledVector(this.B, b * size[1] / 2))
    const cam = new THREE.PerspectiveCamera(60, 1, near, far)
    cam.position.copy(this.E); cam.lookAt(this.C); cam.updateMatrixWorld()
    const tan = q => { const v = q.clone().applyMatrix4(cam.matrixWorldInverse); return [v.x / -v.z, v.y / -v.z] }
    let cx = 0, cy = 0; for (const q of corners) { const [a, b] = tan(q); cx += a / 4; cy += b / 4 }
    const aimAt = new THREE.Vector3(cx, cy, -1).applyMatrix4(cam.matrixWorld)
    cam.lookAt(aimAt); cam.updateMatrixWorld()
    let R = 0; for (const q of corners) { const [a, b] = tan(q); R = Math.max(R, Math.hypot(a, b)) }
    R = R * 1.12 + 0.02   // room for light the waves throw past the flat footprint

    const l = this.light = new THREE.SpotLight(color, intensity, 0, Math.atan(R), 0.02, 0)
    l.position.copy(this.E)
    l.target.position.copy(this.E).add(aimAt.sub(this.E).normalize().multiplyScalar(1000))
    l.castShadow = false
    l.shadow.camera.near = near; l.shadow.camera.far = far; l.shadow.mapSize.set(1, 1); l.shadow.focus = 1
    l.name = 'caustic lamp'

    this.rt = new THREE.WebGLRenderTarget(res, res, { type: THREE.HalfFloatType, depthBuffer: false, magFilter: THREE.LinearFilter, minFilter: THREE.LinearMipmapLinearFilter, generateMipmaps: true })
    this.rt.texture.anisotropy = 4
    this.rtH = new THREE.WebGLRenderTarget(res, res, { type: THREE.HalfFloatType, format: THREE.RedFormat, depthBuffer: false, magFilter: THREE.LinearFilter, minFilter: THREE.LinearFilter })
    this.posRT = new THREE.WebGLRenderTarget(posRes, posRes, { type: THREE.FloatType, depthBuffer: true, magFilter: THREE.NearestFilter, minFilter: THREE.NearestFilter })
    l.map = this.rt.texture

    // waves: log-uniform wavelengths, slope amplitude ~ k^-1/2, scaled to an rms slope, deep-water speeds slowed
    let s = seed * 9301 + 49297
    const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647)
    const W = [], P = []; let ss = 0
    for (let i = 0; i < WAVES; i++) {
      const lam = lMin * (lMax / lMin) ** rnd(), k = 2 * Math.PI / lam, a = dir + (rnd() * 2 - 1) * spread, sl = k ** -0.5
      ss += sl * sl / 2
      W.push(new THREE.Vector4(k * Math.cos(a), k * Math.sin(a), sl, Math.sqrt(9.81 * k + 0.074 / 1000 * k ** 3) * (0.85 + 0.3 * rnd())))
      P.push(rnd() * Math.PI * 2)
    }
    for (const w of W) w.z *= slope / Math.sqrt(ss)
    const kSl = Math.PI / (size[1] / 100)

    const nx = Math.max(32, Math.round(res / cell)), ny = nx
    this.u = {
      uM: { value: new THREE.Matrix4() }, uMinv: { value: new THREE.Matrix4() },
      uE: { value: this.E }, uLamp: { value: this.lamp }, uC: { value: this.C }, uT: { value: this.T }, uB: { value: this.B }, uN: { value: this.N },
      uSize: { value: this.size }, uPosSize: { value: new THREE.Vector2(posRes, posRes) }, uStep: { value: new THREE.Vector2(0.5 / nx, 0.5 / ny) },
      uPos: { value: this.posRT.texture }, uTime: { value: 0 }, uAmp: { value: 1 }, uDepth: { value: 1 }, uFar: { value: far * 0.5 },
      uSlosh: { value: slosh }, uWsl: { value: Math.sqrt(9.81 * kSl * Math.tanh(kSl * 0.25)) },
      uWaves: { value: W }, uPhase: { value: P }, uEdge: { value: edge }, uSoft: { value: soft },
    }
    const geo = new THREE.PlaneGeometry(1, 1, nx, ny); geo.translate(0.5, 0.5, 0)
    const mt = new THREE.ShaderMaterial({
      uniforms: this.u, vertexShader: TRACE_VS, fragmentShader: TRACE_FS,
      depthTest: false, depthWrite: false, side: THREE.DoubleSide, transparent: true,
      blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, blendEquation: THREE.AddEquation, toneMapped: false,
    })
    this.trace = new THREE.Scene()
    const grid = new THREE.Mesh(geo, mt); grid.frustumCulled = false; this.trace.add(grid)
    this.quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, -1, 1)
    const blurPass = (src, dx, dy) => {
      const q = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
        uniforms: { uSrc: { value: src.texture }, uDir: { value: new THREE.Vector2(dx / res, dy / res).multiplyScalar(blur) } },
        vertexShader: QUAD_VS, fragmentShader: BLUR_FS, depthTest: false, depthWrite: false, toneMapped: false,
      }))
      q.frustumCulled = false; const sc = new THREE.Scene(); sc.add(q); return sc
    }
    this.blurH = blurPass(this.rt, 1, 0); this.blurV = blurPass(this.rtH, 0, 1)
    this.posMat = new THREE.ShaderMaterial({ uniforms: { uC: { value: this.C }, uRoom: { value: this.N } }, vertexShader: POS_VS, fragmentShader: POS_FS, side: THREE.DoubleSide })
  }

  // the map of the set from the source (group: the set's root), and the projection the trace and the spot share
  bake(group) {
    const l = this.light, r = this.renderer
    group.updateMatrixWorld(true); l.updateMatrixWorld(); l.target.updateMatrixWorld()
    l.shadow.updateMatrices(l)
    this.u.uM.value.copy(l.shadow.matrix); this.u.uMinv.value.copy(l.shadow.matrix).invert()
    const tmp = new THREE.Scene(), parent = group.parent
    tmp.add(group); tmp.overrideMaterial = this.posMat
    const prev = r.getRenderTarget(), cc = r.getClearColor(new THREE.Color()), ca = r.getClearAlpha()
    r.setRenderTarget(this.posRT); r.setClearColor(0x000000, 0); r.clear(); r.render(tmp, l.shadow.camera)
    r.setRenderTarget(prev); r.setClearColor(cc, ca)
    tmp.remove(group); if (parent) parent.add(group)
    // where the beam's axis lands, for a bounce light
    const ray = new THREE.Raycaster(this.E, l.target.position.clone().sub(this.E).normalize(), 0, 9000)
    const hit = ray.intersectObject(group, true).find(h => h.object.isMesh && h.point.y > this.C.y + 1)
    this.hit = hit ? hit.point.clone() : this.C.clone()
    this.baked = true
  }

  update(t) {
    this.frames = (this.frames || 0) + 1
    this.u.uTime.value = t * this.speed
    const r = this.renderer, prev = r.getRenderTarget(), ac = r.autoClear, cc = r.getClearColor(new THREE.Color()), ca = r.getClearAlpha()
    r.setRenderTarget(this.rt); r.setClearColor(0x000000, 0); r.clear(); r.autoClear = false
    r.render(this.trace, this.quadCam)
    r.setRenderTarget(this.rtH); r.render(this.blurH, this.quadCam)
    r.setRenderTarget(this.rt); r.render(this.blurV, this.quadCam)
    r.autoClear = ac; r.setRenderTarget(prev); r.setClearColor(cc, ca)
  }

  dispose() { for (const t of [this.rt, this.rtH, this.posRT]) t.dispose() }
}
