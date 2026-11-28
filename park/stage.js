// The park (#051) as a stage set for the solo pianist pages (#032, and #045, #049, #050
// through pathtrace/app.js): Sorairo's hillside around her and the piano, as #038 has it
// around the duo (park/park.js does the drawing; this is the host's side of it, once).
//
//   const parkStage = createParkStage({ renderer, scene, camera, stageParts, foreground, hair })
//   await parkStage.set(true)          // builds the park the first time (a few seconds)
//   each frame: parkStage.update(dt)   // the park's clock, her lights, her layer
//   to draw:    parkStage.draw()       // in place of the page's own composer
//   on resize:  parkStage.setSize()
//
// The page's post (depth of field, bloom, grain) is the hall's: in the park its own chain
// (light shafts, grade, the painterly pass) takes its place. Her, her hair, dress and shoes
// go on layer 1, drawn and graded above the painted park; the piano stays on layer 0 and
// is painted with it. The hall's lights are hidden; a sun and the sky's light take their
// place, from the park's hour. The sun is a far spot light, not a directional one: the
// strand hair's shader (pianist/hair.js) is lit by the scene's spot lights.
import * as THREE from 'three'
import { createPark, TIMES } from './park.js'

export const PARK_TIMES = TIMES
export { PARK_TREES } from './controls.js'   // (the controls, once, for every page: park/controls.js)

// For the duo (#038): layout 'keys' or 'curve' (the lawn centred on the two, park/park.js),
// center the middle of them, and sun 'directional' (#038's own: her VRM hair is lit by any light)
// with its shadow box; the pianist pages keep the solo layout and the far spot light.
export function createParkStage({ renderer, scene, camera, stageParts = () => [], foreground = () => [], hair = () => null,
  center = new THREE.Vector3(0, 80, 20), lightK = 0.75, onStatus = () => {}, layout = 'solo', sun: sunKind = 'spot', near = 4 }) {
  let park = null, on = false, building = null, envFor = -1, envMap = null
  // turn: the piano and her on the lawn, in degrees, positive clockwise seen from above (?pturn=)
  const opts = { time: 1, style: 'summer', scale: 0.45, turn: 90, painted: false, azimuth: 55, ambience: 0.7, wind: 1.2, clouds: 0.5 }
  const saved = {}
  const hidden = new Map()

  // the sun and the sky's light, for her and the piano
  const directional = sunKind === 'directional', sunDist = directional ? 1500 : 2000
  const sun = directional ? new THREE.DirectionalLight(0xffffff, 1) : new THREE.SpotLight(0xffffff, 1, 0, 0.42, 0.35, 0)
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048)
  if (directional) {
    Object.assign(sun.shadow.camera, { left: -450, right: 450, top: 450, bottom: -450, near: 10, far: 3000 })
    sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.6
  } else {
    sun.shadow.camera.near = 1200; sun.shadow.camera.far = 3200
    sun.shadow.bias = -0.0012; sun.shadow.normalBias = 1.2; sun.shadow.radius = 3   // (her skin and hair self-shadow in stipples below these)
  }
  sun.target.position.copy(center)
  const sky = new THREE.HemisphereLight(0xffffff, 0x446633, 1)
  for (const l of [sun, sky]) l.layers.enable(1)
  sun.shadow.camera.layers.enable(1)
  sun.name = 'park sun'; sky.name = 'park sky'

  const lift = root => root?.traverse(o => { if (o.layers.mask !== 2) o.layers.set(1) })
  const drop = root => root?.traverse(o => { if (o.layers.mask === 2) o.layers.set(0) })

  function lights() {
    const s = park.sun
    sun.position.copy(center).addScaledVector(s.dir, sunDist)
    sun.color.copy(s.color); sun.intensity = Math.PI * lightK
    sky.color.copy(s.ambient); sky.groundColor.copy(s.ground).multiplyScalar(1 / Math.max(1e-3, s.ambient.r)); sky.intensity = Math.PI * lightK
    const h = hair()
    if (h?.uniforms?.uAmbient) {
      if (!h.uniforms.uAmbient.userData) h.uniforms.uAmbient.userData = { stage: h.uniforms.uAmbient.value.clone() }
      h.uniforms.uAmbient.value.copy(s.ambient).multiplyScalar(0.3)
    }
    // the lacquer, the plate and her skin reflect the sky (once per change of the hour)
    if (envFor !== s.changed) {
      envFor = s.changed
      const pm = new THREE.PMREMGenerator(renderer), es = new THREE.Scene()
      const g = new THREE.SphereGeometry(100, 32, 16), col = [], P = g.attributes.position
      for (let i = 0; i < P.count; i++) { const y = P.getY(i) / 100; const c = y > 0 ? s.horizon.clone().lerp(s.sky, Math.sqrt(y)) : s.ground.clone().multiplyScalar(0.6); col.push(c.r, c.g, c.b) }
      g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3))
      es.add(new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })))
      envMap?.dispose()
      envMap = pm.fromScene(es, 0.02).texture
      scene.environment = envMap; scene.environmentIntensity = 0.6
      pm.dispose(); g.dispose()
    }
  }

  async function build() {
    onStatus('Growing the park…')
    park = await createPark(renderer, { time: opts.time + 0.4, style: opts.style, scale: opts.scale, layout, turn: layout === 'solo' ? -opts.turn * Math.PI / 180 : 0, azimuth: opts.azimuth, wind: opts.wind, clouds: opts.clouds })
    park.setAmbience(opts.ambience)
    park.S.paintPerformers = opts.painted
    onStatus('')
  }

  async function set(want) {
    if (want === on) return
    if (want) {
      if (!park) { building ??= build(); await building }
      Object.assign(saved, { background: scene.background, fog: scene.fog, environment: scene.environment, envIntensity: scene.environmentIntensity, near: camera.near, far: camera.far })
      for (const o of stageParts()) if (o) { hidden.set(o, o.visible); o.visible = false }
      scene.background = null; scene.fog = null
      // the park's camera is this one at scale/100: its 0.1-8000 m, here in cm
      camera.near = near; camera.far = 800000 * opts.scale; camera.updateProjectionMatrix()
      scene.add(sun, sun.target, sky)
      envFor = -1
      on = true
      park.setSize()
    } else {
      on = false
      scene.remove(sun, sun.target, sky)
      for (const [o, v] of hidden) o.visible = v
      hidden.clear()
      scene.background = saved.background; scene.fog = saved.fog
      scene.environment = saved.environment; scene.environmentIntensity = saved.envIntensity
      camera.near = saved.near; camera.far = saved.far; camera.updateProjectionMatrix()
      for (const r of foreground()) drop(r)
      const h = hair(); if (h?.uniforms?.uAmbient?.userData?.stage) h.uniforms.uAmbient.value.copy(h.uniforms.uAmbient.userData.stage)
      park.sound.setOn(false)
    }
  }

  return {
    get on() { return on },
    get park() { return park },
    opts,
    set,
    /** Whether a stage part should show (for the page's own switches, such as the dust). */
    shows: o => !on || !hidden.has(o),
    keepHidden(o) { if (on) { hidden.set(o, hidden.get(o) ?? true); o.visible = false } },
    setTime(i) { opts.time = +i; park?.setTime(opts.time + 0.4) },
    setStyle(s) { opts.style = s; park?.setStyle(s) },
    /** Paint her with the park (true) or grade her apart and lay her over it (false, the default). */
    setPainted(v) { opts.painted = !!v; if (park) park.S.paintPerformers = opts.painted },
    setSound(v) { if (park) park.sound.setOn(!!v && on) },
    setAzimuth(a) { opts.azimuth = +a; park?.setAzimuth(opts.azimuth) },
    setAmbience(k) { opts.ambience = +k; park?.setAmbience(opts.ambience) },
    setWind(w) { opts.wind = +w; park?.setWind(opts.wind) },
    setClouds(c) { opts.clouds = +c; park?.setClouds(opts.clouds) },
    update(dt) {
      if (!on) return
      park.update(dt)
      lights()
      // her, hair, dress and shoes over the painted park (made and swapped at any time: every frame)
      for (const r of foreground()) lift(r)
    },
    draw() { camera.updateMatrixWorld(); park.update(0, camera); park.render(scene, camera) },
    setSize() { if (on) park.setSize() },
  }
}
