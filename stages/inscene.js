// The stage sets drawn inside the page's own scene, by its own renderer and composer, for the
// solo pianist pages (#032 and, through pathtrace/app.js, #045, #049, #050, #054): the black
// stage, the candlelit chamber (pathtrace/candle-chamber.js, from #030) and the hall of water
// (waterhall/). The sets that take over the picture (the park, the lake) are stages/sets.js's.
//
//   const inscene = createInsceneStages({ THREE, renderer, scene, pmrem, floor, floorMat, lowQuality, gpu })
//   inscene.set(name)            // builds its props the first time, then background, floor, environment;
//                                // answers the name it set ('stage' for one it doesn't hold)
//   inscene.lights(name)         // its colours and strengths for the page's six hall lights
//   inscene.props                // { candle, hall }: each built set's { root, update(dt, t), ... }
//   inscene.envScene             // the panels behind scene.environment (the path tracers bake them)
//   each frame: inscene.update(dt, t)
//
// Each set is a descriptor in INSCENE: its look (background, floor colour, whether the floor
// shows), its light palette (key spot, face key, rim, back, key fill, lid: the page's LIGHTS
// order), how its props are built and its environment made. A new in-scene set is one entry.
import { buildCandleChamber, candleEnvironment, CANDLE } from '../pathtrace/candle-chamber.js'
import { buildWaterHall, HALL } from '../waterhall/water-hall.js'

// the black stage's reflections: a few glowing panels around it
function blackStageEnvironment(THREE) {
  const s = new THREE.Scene(); s.background = new THREE.Color(0x010101)
  const box = (w, h, p, k, c = 0xffffff) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k), side: THREE.DoubleSide })); m.position.set(...p); m.lookAt(0, 90, 0); s.add(m) }
  box(260, 260, [-200, 640, 300], 8, 0xffcf9a)
  box(900, 140, [0, 650, -150], 0.8, 0xffd7a8)
  box(60, 500, [-900, 300, -300], 2, 0xffbf80)
  box(60, 500, [900, 260, -100], 1.4, 0xffc890)
  box(700, 220, [150, 420, -900], 2, 0xffe2c0)
  box(1400, 300, [0, 120, 1100], 0.1, 0x8fa6c8)
  return { scene: s, sigma: 0.015, far: 6000 }
}

export const INSCENE = {
  stage: {
    label: 'Black stage', about: 'the piano under its spotlights on a dark floor',
    look: { background: 0x000000, floor: 0x1a1512 },
    lights: [[0xffd2a0, 1], [0xffd9b8, 1], [0xffe6c8, 1], [0xffe2c0, 1], [0xfff0e0, 1], [0xffc28a, 1]],
    environment: h => blackStageEnvironment(h.THREE), envIntensity: 0.55,
  },
  // after #030's candle rig: its key / back / fill / lid against its concert rig, the face key and rim warmed to match
  candle: {
    label: 'Candlelit chamber', about: 'from #030: a stone wall with arches behind the piano, some 200 candles on two tiers and along the sides, sconces, a warm candle palette for the lights and the reflections',
    look: { background: CANDLE.background, floor: 0x180d08 },
    lights: ((L, C) => [[L.key.color, L.key.intensity / C.key], [0xffc890, 0.85], [0xffb070, 0.8], [L.back.color, L.back.intensity / C.back], [L.fill.color, L.fill.intensity / C.fill], [L.lid.color, L.lid.intensity / C.lid]])(CANDLE.lights, CANDLE.concert),
    build: h => buildCandleChamber(h.THREE, h.lowQuality),
    // (the page's 0.55 against #030's 0.7 for the black stage, kept in proportion)
    environment: h => candleEnvironment(h.THREE), envIntensity: 0.55 * CANDLE.environmentIntensity / CANDLE.stageEnvironmentIntensity,
  },
  // the slit overhead is the key (waterhall/); the hall's lights dimmed and gilded for her face.
  // Its water light is traced in WebGL shaders: not on ?gpu=webgpu
  hall: {
    label: 'The hall of water', about: 'waterhall/, after the Wallace sets of Blade Runner 2049: the piano on a wooden deck in a flooded concrete room, light off the water climbing the walls, a slit of light swinging over her; path traced with the walls glowing with that light',
    look: { background: HALL.background, floor: 0x1a1512, noFloor: true }, webgpu: false,
    lights: [[0xffc060, 0.3], [0xffcf90, 0.75], [0xffb050, 0.6], [0xffa040, 0.35], [0xffd8a0, 0.4], [0xffb060, 0.9]],
    build: h => buildWaterHall(h.renderer, { lowQuality: h.lowQuality }),
    environment: (h, props) => props.environment(), envIntensity: HALL.environmentIntensity,
  },
}

export function createInsceneStages(host) {
  const { scene, pmrem, floor, floorMat, gpu = false } = host
  const props = {}, envs = {}
  let current = 'stage', envScene = null
  const usable = name => INSCENE[name] && !(gpu && INSCENE[name].webgpu === false)
  function environment(name) {
    const d = INSCENE[name]
    if (!envs[name]) {
      const e = d.environment(host, props[name])
      envs[name] = { scene: e.scene, map: pmrem.fromScene(e.scene, e.sigma, 1, e.far).texture, intensity: d.envIntensity }
    }
    const E = envs[name]
    envScene = E.scene; scene.environment = E.map; scene.environmentIntensity = E.intensity
  }
  const api = {
    INSCENE,
    props,
    get current() { return current },
    get envScene() { return envScene },
    has: usable,
    set(name) {
      if (!usable(name)) name = 'stage'
      const d = INSCENE[name]
      if (d.build && !props[name]) { props[name] = d.build(host); scene.add(props[name].root) }
      for (const [k, p] of Object.entries(props)) p.root.visible = k === name
      environment(name)
      scene.background.setHex(d.look.background)
      floorMat.color.setHex(d.look.floor)
      floor.visible = !d.look.noFloor
      current = name
      return name
    },
    lights: name => (INSCENE[name] ?? INSCENE.stage).lights,
    update(dt, t) { for (const p of Object.values(props)) if (p.root.visible) p.update?.(dt, t) },
  }
  environment('stage')
  return api
}
