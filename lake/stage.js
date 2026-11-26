// The lake (#054) as a stage set for the solo pianist pages (#032, #045 and its plugins through
// pathtrace/app.js): Afterglow's world (lake/world/, MIT, github.com/Leonxlnx/afterglow) around
// her and the piano: the sky after sunset, mountains, a still lake whose rings start from the
// piano's legs and the lyre as she plays, and the water's reflection of her, the piano and the
// sky. Same interface as the park (park/stage.js):
//
//   const lakeStage = createLakeStage({ renderer, scene, camera, stageParts, foreground, hair })
//   (the duo, #038: center, the page point that stands at the rig's origin; pianoFrame, the group
//   the piano stands in, whose frame its legs are in; emitters, more feet in the water, page cm;
//   yaw, the rig's turn: 120 deg puts the glow behind the pianist pages' views across the water, 180 the duo's from the hall)
//   await lakeStage.set(true)          // builds the world the first time (a few seconds)
//   each frame: lakeStage.update(dt)   // the lake's clock, her lights
//   to draw:    lakeStage.draw()       // in place of the page's own composer
//   on resize:  lakeStage.setSize()
//   lakeStage.noteOn(midi, velocity), lakeStage.pedal(on)   // from the piano: the rings
//
// Units: the page's scene is in centimetres, the world in metres. The two are drawn as one
// scene so the water reflects her: for the length of draw() the page's scene is a child of
// `bridge` (scale 1/100, turned so the tail points the way Afterglow's does) in the lake's
// scene, and the page's camera is carried across the same transform. Afterwards the page's
// scene is detached and its matrices rebuilt, so nothing of the page sees the change.
// The hall's lights and parts (stageParts) are hidden; a key light from the horizon glow
// (world.glowLight) and the world's environment map light her and the piano. Tone mapping is
// Khronos PBR Neutral, the transform Afterglow's colours were tuned for.
import * as THREE from 'three'
import { create as createWorld } from './world/index.js'

// the sun's elevation (deg), Afterglow's film arc runs from +0.6 to -4.5
// (Afterglow pins the look above -1 deg, params.sunLook, so a higher sun looks like -1)
export const LAKE_TIMES = [[0, 'Afterglow (−1°)'], [1, 'Late glow (−1.6°)'], [2, 'Dusk (−2.5°)'], [3, 'Blue hour (−4.5°)'], [4, 'Over the song']]
const SUN = [-1, -1.6, -2.5, -4.5]
const lum = v => 0.2126 * v.x + 0.7152 * v.y + 0.0722 * v.z

export function createLakeStage({ renderer, scene, camera, stageParts = () => [], foreground = () => [], hair = () => null,
  center = [0, 0], pianoFrame = null, emitters: extraFeet = [], yaw = 120,
  piano = {}, progress = () => 0, onStatus = () => {} }) {
  let world = null, on = false, building = null
  const opts = { time: 0, keyGain: 4, fillGain: 1, envGain: 1.6, envEvery: 0.25, exposure: 1 }
  const saved = {}, hidden = new Map()
  // the page's piano: legs and lyre in its centimetres (concertstage/concert-grand.js)
  const LEGS = piano.legs ?? [[-66.5, -12], [66.5, -12], [-36, -185]], LYRE = piano.lyre ?? [0, -11]

  const lake = new THREE.Scene(); lake.name = 'lake'
  // the rig (Afterglow's: yaw 120 deg, the pianist facing the glow) and the bridge into it
  const rig = new THREE.Group(); rig.name = 'lake rig'; rig.rotation.y = yaw * Math.PI / 180
  const bridge = new THREE.Group(); bridge.name = 'lake bridge'
  bridge.scale.setScalar(0.01); bridge.rotation.y = Math.PI; bridge.position.set(center[0] / 100, -0.03, center[1] / 100)   // the casters just under the surface; `center` at the rig's origin
  rig.add(bridge); lake.add(rig)
  const toRig = ([x, z]) => [-(x - center[0]) / 100, -(z - center[1]) / 100]   // page cm -> rig m (the bridge's turn and scale)
  // a point of the piano's (its own cm) in the page's scene
  const _pm = new THREE.Matrix4(), _pv = new THREE.Vector3()
  const onPiano = ([x, z]) => {
    if (!pianoFrame) return [x, z]
    scene.updateMatrixWorld(true)
    _pm.copy(scene.matrixWorld).invert().multiply(pianoFrame.matrixWorld)
    _pv.set(x, 0, z).applyMatrix4(_pm)
    return [_pv.x, _pv.z]
  }
  const cam = new THREE.PerspectiveCamera(); cam.name = 'lake camera'

  // the key: from the horizon glow, its colour pulled toward white (Afterglow's rimNeutral), soft shadows
  const key = new THREE.SpotLight(0xffffff, 1, 0, 0.09, 0.5, 0)
  key.castShadow = true; key.shadow.mapSize.set(2048, 2048)
  key.shadow.camera.near = 36; key.shadow.camera.far = 45; key.shadow.bias = -0.0004; key.shadow.normalBias = 0.01; key.shadow.radius = 4
  key.name = 'lake key'
  const keyAt = new THREE.Vector3(0, 0.8, 0.4)   // rig: between her and the piano
  key.target.position.copy(keyAt); rig.add(key.target)
  lake.add(key)
  // the fill: the open sky behind the camera side, cool, no shadows (the dusk sky lights the side away from the glow)
  const fill = new THREE.DirectionalLight(0xffffff, 0); fill.name = 'lake fill'
  fill.target.position.copy(keyAt); rig.add(fill.target); lake.add(fill)
  function lights() {
    const g = world.glowLight
    rig.updateMatrixWorld(true)
    const c = keyAt.clone().applyMatrix4(rig.matrixWorld)
    const d = g.direction.clone(); d.y = Math.max(d.y, 0.12); d.normalize()
    key.position.copy(c).addScaledVector(d, 40)
    const li = lum(g.irradiance), n = 0.6
    key.color.setRGB(g.irradiance.x * (1 - n) + li * n, g.irradiance.y * (1 - n) + li * n, g.irradiance.z * (1 - n) + li * n)
    const lc = 0.2126 * key.color.r + 0.7152 * key.color.g + 0.0722 * key.color.b
    if (lc > 0) key.color.multiplyScalar(1 / lc)
    key.intensity = li * opts.keyGain
    // opposite the glow in azimuth, 45 deg up; the blue of the sky away from the sun
    fill.position.copy(c).add(new THREE.Vector3(-d.x, 0, -d.z).normalize().multiplyScalar(28).setY(28))
    fill.color.setRGB(0.62, 0.72, 1.0)
    fill.intensity = li * 0.35 * opts.fillGain
    lake.environmentIntensity = opts.envGain
    const h = hair()
    if (h?.uniforms?.uAmbient) {
      if (!h.uniforms.uAmbient.userData) h.uniforms.uAmbient.userData = { stage: h.uniforms.uAmbient.value.clone() }
      h.uniforms.uAmbient.value.copy(key.color).multiplyScalar(li * 0.6)
    }
  }

  // ── the rings: each key press shakes the legs, the pedal the lyre (Afterglow drives them
  // from its solver's leg and foot vibration; here from the notes as they sound)
  let clock = 0, ripples = [], ripplesDirty = false
  function ring(at, amp, src, ago = 0) { ripples.push({ t: clock - ago, pos: [at[0], 0, at[1]], amp, src }); ripplesDirty = true }
  const legsR = () => LEGS.map(p => toRig(onPiano(p))), lyreR = () => toRig(onPiano(LYRE))
  // (velocity 0-1, as the piano takes it, or MIDI 0-127)
  // (`ago`: seconds since it sounded, to seed a still with the rings already spreading)
  function noteOn(midi, v = 0.7, ago = 0) {
    if (!on) return
    const vel = Math.max(0, Math.min(1, v > 1 ? v / 127 : v)), a = 0.00018 + 0.0011 * vel * vel * (midi < 48 ? 1.4 : midi < 72 ? 1 : 0.6)
    const L = legsR(), f = (midi - 21) / 87   // bass leg, treble leg, the tail for the bass
    ring(f < 0.5 ? L[0] : L[1], a, 'leg', ago)
    if (midi < 45 && vel > 0.45) ring(L[2], a * 0.8, 'leg', ago)
  }
  function pedal(down) { if (on && down) ring(lyreR(), 0.0004, 'lyre') }
  function flushRipples() {
    if (!ripplesDirty) return
    ripples = ripples.filter(r => r.t > clock - 18)
    world.setPerfRipples(ripples)
    ripplesDirty = false
  }

  async function build() {
    onStatus('Filling the lake…')
    const s = renderer.getDrawingBufferSize(new THREE.Vector2())
    world = await createWorld({ renderer, width: s.x, height: s.y, quality: 'preview', rigGroup: rig, scene: lake,
      options: { world: { setSceneEnvironment: false } } })
    lake.add(world.group)
    // the piano's legs and the bench's as continuous micro rings, the bed shallow under the piano
    const bench = piano.bench ?? [[-26, 33], [26, 33], [-26, 61], [26, 61]]
    world.setEmitters([...[...LEGS, ...bench].map(onPiano), ...extraFeet].map(([x, z], i) => { const [rx, rz] = toRig([x, z]); return { x: rx, z: rz, amp: world.params.water.microAmp * (0.7 + 0.15 * (i % 4)), wavelength: world.params.water.microLambda, radius: world.params.water.microRadius, phase: i * 1.7 } }))
    world.setPerfRipples([])
    onStatus('')
  }
  const sunNow = () => opts.time < 4 ? SUN[opts.time] : 0.6 + (-4.5 - 0.6) * Math.max(0, Math.min(1, progress()))

  async function set(want) {
    if (want === on) return
    if (want) {
      if (!world) { building ??= build(); await building }
      for (const o of stageParts()) if (o) { hidden.set(o, o.visible); o.visible = false }
      // every light of the page's own goes out too (the lid's warm panel among them): the lake lights her
      scene.traverse(o => { if (o.isLight && o.visible && !hidden.has(o)) { hidden.set(o, true); o.visible = false } })
      on = true
      lastEnv = -1e9
      setSize()
    } else {
      on = false
      for (const [o, v] of hidden) o.visible = v
      hidden.clear()
      const h = hair(); if (h?.uniforms?.uAmbient?.userData?.stage) h.uniforms.uAmbient.value.copy(h.uniforms.uAmbient.userData.stage)
    }
  }

  // carry the page's camera into the lake (bridge x camera), the lens as it is
  const _m = new THREE.Matrix4(), _p = new THREE.Vector3(), _q = new THREE.Quaternion(), _s = new THREE.Vector3()
  function carryCamera() {
    camera.updateMatrixWorld()
    rig.updateMatrixWorld(true)
    _m.multiplyMatrices(bridge.matrixWorld, camera.matrixWorld).decompose(_p, _q, _s)
    cam.position.copy(_p); cam.quaternion.copy(_q); cam.scale.set(1, 1, 1)
    cam.fov = camera.fov; cam.aspect = camera.aspect; cam.zoom = camera.zoom
    cam.filmGauge = camera.filmGauge; cam.filmOffset = camera.filmOffset
    cam.view = camera.view ? { ...camera.view } : null
    cam.near = Math.max(0.02, camera.near / 100); cam.far = 60000
    cam.layers.mask = camera.layers.mask | 1
    cam.updateProjectionMatrix(); cam.updateMatrixWorld(true)
  }

  let lastEnv = -1e9, lastSun = NaN
  function draw() {
    carryCamera()
    const sun = sunNow()
    world.setSunElevation(sun)
    const env = clock - lastEnv >= opts.envEvery || sun !== lastSun || clock < lastEnv
    if (env) { lastEnv = clock; lastSun = sun }
    flushRipples()
    // the page's scene into the lake for this draw
    const parent = scene.parent
    Object.assign(saved, { tm: renderer.toneMapping, bg: scene.background, envS: scene.environment, fog: scene.fog })
    scene.background = null; scene.fog = null
    bridge.add(scene)
    // a VRM's ink (MToon) in world units would draw 100 times too wide at the bridge's scale
    const inks = []
    scene.traverseVisible(o => { for (const m of [o.material].flat()) if (m?.isMToonMaterial && m.outlineWidthMode === 'worldCoordinates' && !inks.includes(m)) inks.push(m) })
    for (const m of inks) m.outlineWidthFactor *= bridge.scale.x
    try {
      world.prepareFrame(clock, { camera: cam, env })
      lake.environment = world.envMap; lake.environmentIntensity = opts.envGain
      if (env) lights()
      // her materials read scene.environment of the root being drawn (the lake's); her own envMaps stay
      renderer.toneMapping = THREE.NeutralToneMapping
      const ex = renderer.toneMappingExposure
      renderer.toneMappingExposure = ex * opts.exposure * world.params.exposure
      renderer.render(lake, cam)
      renderer.toneMappingExposure = ex
    } finally {
      for (const m of inks) m.outlineWidthFactor /= bridge.scale.x
      bridge.remove(scene)
      if (parent) parent.add(scene)
      renderer.toneMapping = saved.tm
      scene.background = saved.bg; scene.fog = saved.fog; scene.environment = saved.envS
      scene.updateMatrixWorld(true)
    }
  }

  function setSize() {
    if (!world) return
    const s = renderer.getDrawingBufferSize(new THREE.Vector2())
    world.setSize(s.x, s.y)
  }

  return {
    get on() { return on },
    get world() { return world },
    lake, rig, bridge, camera: cam, key, pageScene: scene,
    opts,
    set,
    shows: o => !on || !hidden.has(o),
    keepHidden(o) { if (on) { hidden.set(o, hidden.get(o) ?? true); o.visible = false } },
    setTime(i) { opts.time = +i },
    setKey(g) { opts.keyGain = +g },
    noteOn, pedal,
    update(dt) { if (on) clock += dt },
    draw,
    setSize() { if (on) setSize() },
  }
}
