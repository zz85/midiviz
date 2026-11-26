// The hall of water as a stage set for the pianist (#032): the third set of random-sketches/vibes/caustic
// (scenes.js `hall`, after the Wallace sets in Blade Runner 2049), in centimetres around the piano.
//
//   const set = buildWaterHall(renderer, { lowQuality })   // { root, update(dt, time), environment(), down, lamps }
//
// A dark square room flooded with black water. The grand stands on a low wooden deck in the water, with two
// leather armchairs and a table behind her and stepping stones running off toward the hall (+x). Lamps out in
// the room shine down onto strips of water at the foot of the walls, and the light off the water climbs the
// concrete walls in ripples (CausticLamp, traced each frame). A long ellipse of light hangs on a cable 5 m
// over the deck, swinging slowly, and throws a shadowed beam down onto her and the piano.
//
// The page's own stage floor is hidden in this set (the deck is the floor); its lights stay, dimmed and gilded
// (STAGE_LIGHTS.hall in the page), for her face.
import * as THREE from 'three'
import { Reflector } from 'three/addons/objects/Reflector.js'
import { CausticLamp } from './caustic-lamp.js'

export const HALL = {
  background: 0x000000,
  gold: 0xffb840, gold2: 0xffc050,
  water: -22,               // the water's level: the deck's top is the piano's floor, y = 0
  size: 1500,               // the walls at x, z = +-size
  height: 2000,
  deck: { x: 0, z: -40, w: 1000, d: 900 },
  environmentIntensity: 0.35,
}

// ---------------------------------------------------------------- textures, drawn once

function canvasTex(w, h, draw, { srgb = true, repeat = [1, 1] } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h
  draw(c.getContext('2d'), w, h)
  const t = new THREE.CanvasTexture(c)
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); t.anisotropy = 8
  if (srgb) t.colorSpace = THREE.SRGBColorSpace
  return t
}
function rng(seed) { let s = seed * 9301 + 49297; return () => ((s = (s * 16807) % 2147483647) / 2147483647) }

// cast concrete: big panels with faint formwork streaks, blots, grit and pits; one tile is one panel
function concreteTex(seed = 1) {
  const R = rng(seed)
  const draw = (g, w, h, value) => {
    g.fillStyle = value(0.5); g.fillRect(0, 0, w, h)
    for (let i = 0; i < 25; i++) { const r = 40 + R() * 160; const gr = g.createRadialGradient(R() * w, R() * h, 0, R() * w, R() * h, r); const v = R(); gr.addColorStop(0, `rgba(${v > 0.5 ? 255 : 0},${v > 0.5 ? 255 : 0},${v > 0.5 ? 255 : 0},0.05)`); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h) }
    for (let y = 0; y < h; y += 3) { g.fillStyle = `rgba(0,0,0,${R() * 0.035})`; g.fillRect(0, y, w, 1 + R() * 2) }
    const img = g.getImageData(0, 0, w, h), d = img.data
    for (let i = 0; i < d.length; i += 4) { const n = (R() - 0.5) * 26; d[i] += n; d[i + 1] += n; d[i + 2] += n }
    g.putImageData(img, 0, 0)
    for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(0,0,0,${0.2 + R() * 0.3})`; g.beginPath(); g.arc(R() * w, R() * h, 0.6 + R() * 1.6, 0, 7); g.fill() }
    g.fillStyle = 'rgba(0,0,0,0.55)'; g.fillRect(0, 0, w, 3); g.fillRect(0, 0, 3, h)   // the seams
  }
  const base = new THREE.Color(0x6e6450)
  const map = canvasTex(512, 512, (g, w, h) => draw(g, w, h, k => `rgb(${base.r * 255 * (0.8 + 0.4 * k) | 0},${base.g * 255 * (0.8 + 0.4 * k) | 0},${base.b * 255 * (0.8 + 0.4 * k) | 0})`))
  const bump = canvasTex(512, 512, (g, w, h) => { R(); draw(g, w, h, () => '#808080') }, { srgb: false })
  return { map, bump }
}

// the deck: long boards, 16 cm wide, of a warm oiled timber
function woodTex(seed = 3) {
  const R = rng(seed)
  return canvasTex(1024, 1024, (g, w, h) => {
    const n = 16
    for (let i = 0; i < n; i++) {
      const y = i * h / n, v = 0.85 + R() * 0.3
      g.fillStyle = `rgb(${74 * v | 0},${52 * v | 0},${24 * v | 0})`; g.fillRect(0, y, w, h / n)
      for (let k = 0; k < 40; k++) { g.strokeStyle = `rgba(${R() > 0.5 ? '122,90,48' : '30,20,8'},${0.08 + R() * 0.12})`; g.lineWidth = 0.5 + R() * 1.5; g.beginPath(); const yy = y + R() * h / n; g.moveTo(0, yy); g.bezierCurveTo(w / 3, yy + (R() - 0.5) * 8, 2 * w / 3, yy + (R() - 0.5) * 8, w, yy + (R() - 0.5) * 4); g.stroke() }
      for (let x = R() * w; x < w; x += w * (0.4 + R() * 0.6)) { g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillRect(x, y, 2, h / n) }
      g.fillStyle = 'rgba(0,0,0,0.7)'; g.fillRect(0, y, w, 2)
    }
  })
}

// a tiling field of small ripples for the water's normals (scrolled each frame)
function rippleNormals(seed = 5) {
  const R = rng(seed), N = 256, hgt = new Float32Array(N * N)
  for (let k = 0; k < 18; k++) {
    const fx = Math.round(1 + R() * 9) * (R() < 0.5 ? -1 : 1), fy = Math.round(R() * 9), ph = R() * 7, a = 1 / Math.hypot(fx, fy)
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) hgt[y * N + x] += a * Math.sin(2 * Math.PI * (fx * x + fy * y) / N + ph)
  }
  const data = new Uint8Array(N * N * 4)
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const h = (i, j) => hgt[((j + N) % N) * N + (i + N) % N]
    const dx = (h(x + 1, y) - h(x - 1, y)) * 2, dy = (h(x, y + 1) - h(x, y - 1)) * 2
    const l = Math.hypot(dx, dy, 1), o = (y * N + x) * 4
    data[o] = (-dx / l * 0.5 + 0.5) * 255; data[o + 1] = (-dy / l * 0.5 + 0.5) * 255; data[o + 2] = (1 / l * 0.5 + 0.5) * 255; data[o + 3] = 255
  }
  const t = new THREE.DataTexture(data, N, N); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter; t.needsUpdate = true
  return t
}

// ---------------------------------------------------------------- the set

function box(g, w, h, d, mat, x, y, z, { cast = true, receive = true } = {}) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.castShadow = cast; m.receiveShadow = receive; g.add(m); return m
}
// a mid-century armchair, as the sketch's, in cm: cushion, back, arms, slim legs
function armchair(g, mat, legMat, x, y, z, ry, s = 1) {
  const c = new THREE.Group(); c.position.set(x, y, z); c.rotation.y = ry; c.scale.setScalar(s); g.add(c)
  box(c, 82, 16, 74, mat, 0, 42, 3)
  box(c, 82, 50, 14, mat, 0, 72, -33)
  for (const sx of [-1, 1]) box(c, 12, 30, 78, mat, sx * 43, 56, 0)
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(c, 4, 34, 4, legMat, sx * 36, 17, sz * 30)
  return c
}

export function buildWaterHall(renderer, { lowQuality = false } = {}) {
  const root = new THREE.Group(); root.name = 'water hall'
  const set = new THREE.Group(); root.add(set)   // what the lamps' maps see (the lights go in root)
  const S = HALL.size, H = HALL.height, WY = HALL.water, D = HALL.deck

  // the water: black and still, a mirror of the room (a planar reflection, as the sketch's reflector()) with
  // fine slow ripples bending what it mirrors. It isn't lit itself: everything it shows is the room's light.
  const ripples = rippleNormals()
  const waterShader = {
    uniforms: { color: { value: null }, tDiffuse: { value: null }, textureMatrix: { value: null }, tRipple: { value: ripples }, uOff: { value: new THREE.Vector2() }, uEye: { value: new THREE.Vector3() } },
    vertexShader: /* glsl */`
      uniform mat4 textureMatrix; varying vec4 vUv; varying vec3 vW;
      void main() { vUv = textureMatrix * vec4(position, 1.0); vW = (modelMatrix * vec4(position, 1.0)).xyz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */`
      uniform sampler2D tDiffuse, tRipple; uniform vec2 uOff; uniform vec3 uEye; varying vec4 vUv; varying vec3 vW;
      void main() {
        vec2 n = texture2D(tRipple, vW.xz / 700.0 + uOff).xy * 2.0 - 1.0 + (texture2D(tRipple, vW.xz / 230.0 - uOff * 1.7).xy * 2.0 - 1.0) * 0.5;
        vec4 uv = vUv; uv.xy += n * 0.012 * uv.w;
        vec3 v = normalize(uEye - vW);
        float fres = 0.3 + 0.7 * pow(1.0 - max(v.y, 0.0), 3.0);   // water: weak straight down, strong at a glance
        gl_FragColor = vec4(texture2DProj(tDiffuse, uv).rgb * fres, 1.0);
      }`,
  }
  const water = new Reflector(new THREE.PlaneGeometry(2 * S, 2 * S), { shader: waterShader, textureWidth: lowQuality ? 512 : 1280, textureHeight: lowQuality ? 288 : 720, clipBias: 0.002 })
  water.rotation.x = -Math.PI / 2; water.position.y = WY; water.name = 'hall water'
  {
    const draw = water.onBeforeRender
    // not into another pass's depth render (the depth of field's), and from the eye that's looking
    water.onBeforeRender = function (r, sc, cam, ...rest) { if (sc.overrideMaterial) return; water.material.uniforms.uEye.value.setFromMatrixPosition(cam.matrixWorld); return draw.call(this, r, sc, cam, ...rest) }
  }
  set.add(water)

  // the deck in the water, its top the piano's floor
  const wood = woodTex()
  const deckMat = new THREE.MeshStandardMaterial({ map: wood, roughness: 0.55, metalness: 0 })
  wood.repeat.set(D.w / 260, D.d / 260)
  const deckTop = box(set, D.w, -WY, D.d, deckMat, D.x, WY / 2, D.z, { cast: false })
  deckTop.name = 'hall deck'
  box(set, D.w + 2, 4, D.d + 2, new THREE.MeshStandardMaterial({ color: 0x120c06, roughness: 0.7 }), D.x, WY + 1, D.z, { cast: false })   // its dark skirt at the waterline

  // two armchairs and a table behind her, to her left; another chair and table further back in the dark
  const black = new THREE.MeshPhysicalMaterial({ color: 0x141110, roughness: 0.42, sheen: 0.4, sheenRoughness: 0.5, sheenColor: new THREE.Color(0xffe2bc) })
  const steel = new THREE.MeshStandardMaterial({ color: 0x3a3632, roughness: 0.35, metalness: 1 })
  const lacquer = new THREE.MeshStandardMaterial({ color: 0x0c0a08, roughness: 0.35 })
  armchair(set, black, steel, -330, 0, 300, -2.5, 1.1)
  armchair(set, black, steel, -380, 0, 120, -1.9, 1.1)
  box(set, 90, 42, 60, lacquer, -420, 21, 220)
  for (const [x, h] of [[-440, 22], [-425, 26], [-410, 18]]) box(set, 6, h, 6, new THREE.MeshStandardMaterial({ color: 0x2a1d10, roughness: 0.1 }), x, 42 + h / 2, 220)
  armchair(set, black, steel, -380, 0, -380, -1.4, 1.0)
  box(set, 70, 40, 50, lacquer, -400, 20, -270)

  // the stepping stones: low slabs running off the deck toward the hall along the water
  const stone = new THREE.MeshStandardMaterial({ color: 0x0d0b09, roughness: 0.6 })
  for (let k = 0; k < 8; k++) box(set, 55, 16, 110, stone, D.x + D.w / 2 + 70 + k * 105, WY + 5, -100 + k * 8, { cast: false })

  // four flat walls of big cast panels facing in (so a camera beyond one sees through it), a dark reveal at
  // the waterline, and a black ceiling
  const conc = concreteTex()
  const wallMat = new THREE.MeshStandardMaterial({ map: conc.map, bumpMap: conc.bump, bumpScale: 1.2, roughness: 0.88, metalness: 0 })
  conc.map.repeat.set(2 * S / 480, H / 340); conc.bump.repeat.copy(conc.map.repeat)
  const reveal = new THREE.MeshStandardMaterial({ color: 0x030202, roughness: 0.9 })
  const walls = []
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2, nx = -Math.sin(a), nz = -Math.cos(a)   // inward normals: +z wall faces -z, ...
    const w = new THREE.Mesh(new THREE.PlaneGeometry(2 * S, H), wallMat.clone())   // (one each: each carries its own baked light for the path tracers)
    w.name = 'hall wall'; walls.push(w)
    w.position.set(-nx * S, H / 2 + WY - 50, -nz * S); w.lookAt(0, w.position.y, 0); w.receiveShadow = true
    set.add(w)
    const r = new THREE.Mesh(new THREE.PlaneGeometry(2 * S, 8), reveal)
    r.position.set(-nx * (S - 1), WY + 35, -nz * (S - 1)); r.lookAt(0, r.position.y, 0); set.add(r)
  }
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(2 * S, 2 * S), new THREE.MeshStandardMaterial({ color: 0x020101, roughness: 1 }))
  ceil.rotation.x = Math.PI / 2; ceil.position.y = H + WY - 60; set.add(ceil)

  // the light overhead: a long thin ellipse 5 m over the deck on a cable from the dark, swinging slowly, and
  // the beam it throws down onto the piano and her
  const LEN = 1440
  const pivot = new THREE.Group(); pivot.position.set(-30, 500 + LEN, -40); root.add(pivot)
  const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, LEN, 6), new THREE.MeshBasicMaterial({ color: 0x050403 }))
  cable.position.y = -LEN / 2; pivot.add(cable)
  const slit = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 4, 64), new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.78, 0.4).multiplyScalar(12), toneMapped: true }))
  // (in a path tracer its glow would light the deck a second time beside the spot below, which carries its light)
  slit.material.userData.traceEmissiveScale = 0.08
  slit.name = 'hall slit'; slit.scale.set(340, 1, 70); slit.rotation.y = Math.PI / 4; slit.position.y = -LEN; pivot.add(slit)
  const down = new THREE.SpotLight(HALL.gold2, 3.2, 0, 0.62, 0.65, 0)
  down.name = 'hall slit light'
  down.position.set(0, -LEN - 10, 20); pivot.add(down)
  down.target.position.set(0, 60, -40); root.add(down.target)
  down.castShadow = true; down.shadow.mapSize.set(lowQuality ? 1024 : 2048, lowQuality ? 1024 : 2048)
  down.shadow.camera.near = 200; down.shadow.camera.far = 900; down.shadow.bias = -0.0003; down.shadow.normalBias = 0.05; down.shadow.radius = 4

  // the wall light: lamps out in the room shine down onto long strips of water along the foot of each wall;
  // their reflections climb the walls, brightest at the waterline and breaking into ripples higher up. Each
  // lamp's mirror image sits 22 m from its strip, below the water, on the line from a point 3.6 m up the wall
  // through the strip's middle.
  const res = lowQuality ? 1024 : 1536
  const V3 = a => new THREE.Vector3(...a)
  const src = (c, to, d) => V3(c).addScaledVector(V3(to).sub(V3(c)).normalize(), -d).toArray()
  const IN = S - 410, LONG = 2 * S - 300
  const strips = [
    { at: [-IN, WY, 0], size: [800, LONG], wall: [-S, 360, 0], seed: 5 },   // behind the piano's spine, the wall the hall looks at
    { at: [0, WY, -IN], size: [LONG, 800], wall: [0, 360, -S], seed: 8 },   // past the tail
    { at: [0, WY, IN], size: [LONG, 800], wall: [0, 360, S], seed: 9 },     // behind her
    { at: [IN, WY, 0], size: [800, LONG], wall: [S, 360, 0], seed: 11 },    // the hall's own wall
  ].slice(0, lowQuality ? 3 : 4)
  const lamps = strips.map(s => new CausticLamp(renderer, {
    at: s.at, size: s.size, from: src(s.at, s.wall, 2200), color: HALL.gold, intensity: 5, res, cell: lowQuality ? 3 : 4,
    lMin: 0.5, lMax: 1.8, slope: 0.008, speed: 0.3, edge: 0.3, seed: s.seed,
  }))
  for (const l of lamps) l.bake(set)
  for (const l of lamps) { root.add(l.light, l.light.target); l.light.userData.traceSkip = 'the water lamps (their light is baked into the walls)' }
  // the path tracers don't read a spot light's map: for them, each wall glows with the light the water throws
  // on it, baked from the lamps' traced textures at the moment of the still (bakeWalls below)
  const baker = wallBaker(renderer, walls, lamps, lowQuality ? 512 : 1024)
  for (const w of walls) w.material.userData.traceEmissive = () => baker.texture(w)
  // one bounce of each beam, dim and unshadowed, warming the room from where it lands
  for (const l of lamps) {
    const p = new THREE.PointLight(new THREE.Color(HALL.gold).multiply(new THREE.Color(0x8a7656)), 0.25, 0, 0)
    p.userData.traceSkip = 'the water light\'s bounce lights (the lit walls glow in a path tracer, and bounce for real)'
    p.position.copy(l.hit).add(l.E.clone().sub(l.hit).normalize().multiplyScalar(300)); root.add(p)
  }
  root.add(new THREE.HemisphereLight(0x3a3018, 0x050302, 0.06))

  // what the lacquer, her eyes and the water reflect: the dark room with a glowing band up each wall from the
  // waterline, and the slit overhead
  function environment() {
    const s = new THREE.Scene(); s.background = new THREE.Color(0x010100)
    const glow = (w, h, p, k, c = HALL.gold) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k), side: THREE.DoubleSide })); m.position.set(...p); m.lookAt(0, p[1], 0); s.add(m); return m }
    for (const [x, z] of [[-S, 0], [S, 0], [0, -S], [0, S]]) { glow(2 * S, 300, [x, 120, z], 0.9); glow(2 * S, 600, [x, 560, z], 0.25) }
    const e = glow(680, 140, [-30, 500, -40], 6, 0xffc878); e.lookAt(-30, 0, -40)
    return { scene: s, sigma: 0.03, far: 9000 }
  }

  let since = 1e9
  return {
    root, lamps, down, water, deck: deckTop, walls, environment,
    /** For a path-traced still or frame: bake the water light on the walls now (the snapshot reads it). */
    bakeWalls: () => baker.bake(),
    update(dt, t) {
      // a slow pendulum swing, mostly side to side (5 degrees each way, 7.6 s), wandering a little fore and aft
      pivot.rotation.z = 0.09 * Math.sin(t * 2 * Math.PI / 7.6); pivot.rotation.x = 0.02 * Math.sin(t * 2 * Math.PI / 11.3 + 1.3)
      water.material.uniforms.uOff.value.set(t * 0.004, t * 0.0027)
      // the traced light at the display's rate, or about 30 Hz on a slow machine
      since += dt
      if (!lowQuality || since > 1 / 30) { since = 0; for (const l of lamps) l.update(t) }
    },
    dispose() { for (const l of lamps) l.dispose(); baker.dispose() },
  }
}

// ---------------------------------------------------------------- the walls' light, for the path tracers

// What three's lights give a wall (its albedo / pi times each lamp's irradiance: the colour and strength, the
// spot's map and cone, and the cosine), drawn in the wall's own uv space into a float target, read back and kept
// as an 8-bit sRGB emissive map with its scale. The lamps' shadows are left out: little stands between the strips
// of water and the walls. A mirror of what the page shows the camera, it lights the room in a tracer as the
// walls' glow does in a real one.
const BAKE_VS = /* glsl */`
varying vec3 vW; varying vec2 vUv;
void main() { vUv = uv; vW = (modelMatrix * vec4(position, 1.0)).xyz; gl_Position = vec4(uv * 2.0 - 1.0, 0.0, 1.0); }`
const BAKE_FS = /* glsl */`
uniform sampler2D uAlbedo, uMap0, uMap1, uMap2, uMap3; uniform vec2 uRepeat; uniform vec3 uNormal;
uniform mat4 uMat[4]; uniform vec3 uPos[4], uCol[4], uDir[4]; uniform vec2 uCone[4];
varying vec3 vW; varying vec2 vUv;
vec3 lamp(int i, sampler2D map) {
  vec4 h = uMat[i] * vec4(vW, 1.0); vec3 c = h.xyz / h.w;
  if (h.w <= 0.0 || any(lessThan(c.xy, vec2(0.0))) || any(greaterThan(c.xy, vec2(1.0)))) return vec3(0.0);
  vec3 L = normalize(uPos[i] - vW);
  float cone = smoothstep(uCone[i].x, uCone[i].y, dot(-L, uDir[i]));
  return uCol[i] * texture2D(map, c.xy).r * cone * max(dot(uNormal, L), 0.0);
}
void main() {
  vec3 E = lamp(0, uMap0) + lamp(1, uMap1) + lamp(2, uMap2) + lamp(3, uMap3);   // (an unused lamp has no colour)
  gl_FragColor = vec4(texture2D(uAlbedo, vUv * uRepeat).rgb * E / 3.14159265, 1.0);
}`

function wallBaker(renderer, walls, lamps, res) {
  const N = Math.min(4, lamps.length), h = Math.round(res * HALL.height / (2 * HALL.size))
  const rt = new THREE.WebGLRenderTarget(res, h, { type: THREE.HalfFloatType, depthBuffer: false })
  const px = new Uint16Array(res * h * 4)
  const u = {
    uAlbedo: { value: null }, uRepeat: { value: new THREE.Vector2() }, uNormal: { value: new THREE.Vector3() },
    ...Object.fromEntries([0, 1, 2, 3].map(i => ['uMap' + i, { value: lamps[Math.min(i, N - 1)].rt.texture }])), uMat: { value: [] }, uPos: { value: [] }, uCol: { value: [] }, uDir: { value: [] }, uCone: { value: [] },
  }
  for (let i = 0; i < 4; i++) { u.uMat.value.push(new THREE.Matrix4()); u.uPos.value.push(new THREE.Vector3()); u.uCol.value.push(new THREE.Vector3()); u.uDir.value.push(new THREE.Vector3()); u.uCone.value.push(new THREE.Vector2(1, 1)) }
  const mat = new THREE.ShaderMaterial({ uniforms: u, vertexShader: BAKE_VS, fragmentShader: BAKE_FS, side: THREE.DoubleSide, depthTest: false, depthWrite: false, toneMapped: false })
  const scene = new THREE.Scene(), cam = new THREE.OrthographicCamera(-1, 1, 1, -1, -1, 1)
  const out = new Map()   // wall -> { tex, scale }
  const enc = x => x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055
  return {
    texture(w) {
      // (baked again whenever the lamps have moved on since, once for all four walls)
      const now = lamps.reduce((a, l) => a + l.frames, 0) + ':' + lamps.map(l => l.light.visible && l.light.intensity).join()
      if (now !== this.at) { this.at = now; this.bake() }
      const e = out.get(w); if (!e) return null
      // (the snapshot copies the material: the scale rides on the texture)
      e.tex.userData.emissiveIntensity = e.scale
      return e.tex
    },
    bake() {
      for (let i = 0; i < N; i++) {
        const l = lamps[i].light, c = new THREE.Color(l.color).multiplyScalar(l.visible ? l.intensity : 0)
        l.updateMatrixWorld(); l.target.updateMatrixWorld(); l.shadow.updateMatrices(l)
        u.uMat.value[i].copy(l.shadow.matrix); l.getWorldPosition(u.uPos.value[i]); u.uCol.value[i].set(c.r, c.g, c.b)
        u.uDir.value[i].copy(l.target.getWorldPosition(new THREE.Vector3())).sub(u.uPos.value[i]).normalize()
        u.uCone.value[i].set(Math.cos(l.angle), Math.cos(l.angle * (1 - l.penumbra)))
      }
      const prev = renderer.getRenderTarget()
      for (const w of walls) {
        w.updateMatrixWorld(true)
        const m = new THREE.Mesh(w.geometry, mat); m.matrixAutoUpdate = false; m.matrix.copy(w.matrixWorld); m.matrixWorld.copy(w.matrixWorld); m.frustumCulled = false
        scene.add(m)
        u.uAlbedo.value = w.material.map; u.uRepeat.value.copy(w.material.map.repeat)
        u.uNormal.value.set(0, 0, 1).transformDirection(w.matrixWorld)
        renderer.setRenderTarget(rt); renderer.render(scene, cam)
        renderer.readRenderTargetPixels(rt, 0, 0, res, h, px)
        scene.remove(m)
        let e = out.get(w)
        if (!e) {
          const tex = new THREE.DataTexture(new Uint8Array(res * h * 4), res, h)
          tex.colorSpace = THREE.SRGBColorSpace; tex.magFilter = THREE.LinearFilter; tex.minFilter = THREE.LinearMipmapLinearFilter; tex.generateMipmaps = true
          out.set(w, e = { tex, scale: 1 })
        }
        let max = 1e-6; for (let k = 0; k < px.length; k += 4) for (let j = 0; j < 3; j++) max = Math.max(max, THREE.DataUtils.fromHalfFloat(px[k + j]))
        const d = e.tex.image.data
        for (let k = 0; k < px.length; k += 4) { for (let j = 0; j < 3; j++) d[k + j] = Math.round(255 * enc(THREE.DataUtils.fromHalfFloat(px[k + j]) / max)); d[k + 3] = 255 }
        e.scale = max; e.tex.needsUpdate = true
      }
      renderer.setRenderTarget(prev)
    },
    dispose() { rt.dispose(); mat.dispose(); for (const e of out.values()) e.tex.dispose() },
  }
}
