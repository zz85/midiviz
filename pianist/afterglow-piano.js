// Afterglow's procedural D-class concert grand (2.74 m) as a midiviz piano.
//
// The piano itself is Afterglow's code, copied unchanged into pianist/afterglow/piano/
// (MIT, pianist/afterglow/LICENSE; only layout_d.json became layout_d.js, so it imports
// without an import attribute). This file wraps it in the interface the pages already use
// for concertstage/concert-grand.js and pianist/upright-piano.js: noteOn/noteOff,
// setSustain/setPedal, setLid, setFinish, update(dt), root, bench, lid, keys, keyX.
//
// Frames. Afterglow works in metres in its piano frame: x along the keyboard bass -> treble,
// z toward the tail, y up, origin on the floor below the front-left case corner (that frame
// is left-handed). Midiviz works in centimetres: x bass -> treble with x = 0 between E4 and
// F4, z toward the player with the keys' front edge at z = 0, white key tops at y = 73. So
//   page = (100 (x - 0.780), 100 y + LIFT, -100 (z - 0.022))
// The white keys have the same 23.5 mm pitch in both. Afterglow's key tops are 71.5 cm off
// the floor against midiviz's 73, so the case is lifted 1.5 cm and the legs, lyre and pedals
// are stretched by the same 1.5 cm to keep the casters on the floor. The bench stands apart
// on the floor and is raised so its seat meets the pianist's (SEAT_Y 55.4 in the pages).
//
// Lighting: the art-directed lacquer looks of the film are tied to Afterglow's lake world
// (its glow, its skyline), so the piano runs on the 'physical' look and the page's own
// scene.environment; the reflection probe, planar mirrors and interior fill shadow need the
// film's render core and are off.

import * as THREE from 'three'
import { create as createAfterglowPiano } from './afterglow/piano/index.js'
import { LAYOUT, KEY_DIP_RAD, PEDAL_MAX_RAD, BENCH } from './afterglow/piano/layout.js'

export const LOW = 21
export const HIGH = 108

const K = LAYOUT.keyboard
const KEY_TOP = 73
const LIFT = KEY_TOP - 100 * K.topY          // 1.5 cm
const SEAT_TOP = 55.4                          // the pages' SEAT_Y: the pianist's seat height
const LID_DEG = { full: LAYOUT.lid?.fullStickDeg ?? 33, half: 13, closed: 0 }

// piano frame (m) -> page (cm), for points the rest of midiviz reads (legs, lyre, keys)
export const toPage = ([x, y, z]) => [100 * (x - K.center), 100 * y + LIFT, -100 * (z - K.frontZ)]
const toPageXZ = ([x, z]) => { const p = toPage([x, 0, z]); return [p[0], p[2]] }

export const FINISHES = {
  ebony: { label: 'Polished ebony', color: '#050505' },
  satin: { label: 'Satin ebony', color: '#0a0a0b', roughness: 0.5, clearcoat: 0.35, clearcoatRoughness: 0.35 },
  white: { label: 'Polished white', color: '#efece6', roughness: 0.3, clearcoatRoughness: 0.03 },
  walnut: { label: 'Walnut', color: '#4a2a16', roughness: 0.32, clearcoatRoughness: 0.04 },
  mahogany: { label: 'Mahogany', color: '#5a1f10', roughness: 0.3, clearcoatRoughness: 0.04 },
  red: { label: 'Lacquer red', color: '#6a0a0c', roughness: 0.3, clearcoatRoughness: 0.03 },
}

const smooth = (x, a, b) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t) }

export async function loadAfterglowPiano({ bench: withBench = true } = {}) {
  const ag = await createAfterglowPiano({ options: { piano: { placeInRig: false, bench: withBench, envProbe: 'off', lacquerLook: 'physical', fillShadow: 'off', tracks: false } } })
  const { case: caseParts, legs, bench: agBench } = ag.parts

  const root = new THREE.Group(); root.name = 'afterglow-piano'
  // the piano frame inside the page's: scale (100, 100, -100) mirrors it right-handed
  const frame = new THREE.Group(); frame.name = 'afterglow-piano-frame'
  frame.scale.set(100, 100, -100)
  frame.position.set(-100 * K.center, LIFT, 100 * K.frontZ)
  root.add(frame)
  frame.userData.kb = true      // the keys live in this one group (an InstancedMesh), so lesson
                                // views that keep only the keyboard keep the whole piano

  // legs, lyre and pedals: stretched 1.5 cm so the casters stay on the floor
  {
    ag.group.updateMatrixWorld(true)
    const box = new THREE.Box3().setFromObject(legs.group)   // piano frame: ag.group isn't parented yet
    const top = box.max.y || 0.71, s = 1 + (LIFT / 100) / top
    legs.group.scale.y = s
    legs.group.position.y = -LIFT / 100
  }
  frame.add(ag.group)

  // the bench: on the floor, its own group in page cm, placed by the page (bench.position.z)
  const bench = new THREE.Group(); bench.name = 'afterglow-bench'
  const benchHolder = new THREE.Group()     // the pages scale / lift the bench's children; this one is reset each frame
  bench.add(benchHolder)
  const benchFrame = new THREE.Group()
  benchFrame.scale.set(100, 100, -100)
  benchHolder.add(benchFrame)
  const seatBase = Math.min(BENCH.heightRange[1], Math.max(BENCH.heightRange[0], SEAT_TOP / 100))
  if (agBench) {
    agBench.group.parent?.remove(agBench.group)
    agBench.group.position.set(0, 0, 0)     // centred under the seat; x = 0 = the pianist's centre line
    benchFrame.add(agBench.group)
    ag.setBenchHeight(seatBase)
  }
  bench.position.set(0, 0, 47)
  root.add(bench)

  // the lid's light anchor, as concert-grand.js's lid (the pages add a RectAreaLight to it)
  const lid = new THREE.Group(); lid.name = 'afterglow-lid-anchor'
  lid.position.set(-74.8, 100 * LAYOUT.heights.rimTop + LIFT, 0)
  root.add(lid)

  root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true } })

  // ── keys, hammers, pedals ──────────────────────────────────────────────
  const keyAngles = new Float32Array(88), hammers = new Float32Array(88)
  const keys = new Map()
  for (const k of LAYOUT.keys) {
    const black = k.color === 'black'
    keys.set(k.midi, { midi: k.midi, black, x: 100 * (k.x_center - K.center), held: false, target: 0, value: 0, velocity: 0.7, blow: -1, tint: null })
  }
  const strike = ag.hammerStrikeAngles, check = ag.hammerCheckAngles
  const pedals = [0, 0, 0], pedalTarget = [0, 0, 0]
  const PEDAL_MAX = [PEDAL_MAX_RAD.unaCorda, PEDAL_MAX_RAD.sostenuto, PEDAL_MAX_RAD.sustain]
  let lidDeg = LID_DEG.full, lidTarget = LID_DEG.full, sustain = false

  const lacquers = ['lacquer', 'lacquerLocal', 'lacquerLeg', 'lacquerLegLocal'].map(n => ag.materials[n]).filter(Boolean)
  const base = lacquers.map(m => ({ roughness: m.roughness, clearcoat: m.clearcoat, clearcoatRoughness: m.clearcoatRoughness }))

  const api = {
    kind: 'afterglow', root, keys, keyMeshes: [], bench, lid, mirror: null, afterglow: ag,
    materials: ag.materials, keyboardOnly: false, lidMode: 'full', keyGlow: 0,
    // the page's piano frame: where its legs and lyre stand (lake/stage.js rings them)
    legs: [...LAYOUT.legs.front, LAYOUT.legs.rear].map(toPageXZ),
    lyre: toPageXZ([LAYOUT.lyre.x, LAYOUT.lyre.z]),
    feet: [...[...LAYOUT.legs.front, LAYOUT.legs.rear].map(toPageXZ), toPageXZ([LAYOUT.lyre.x, LAYOUT.lyre.z])],
    length: 100 * LAYOUT.caseLength, width: 100 * LAYOUT.caseWidth,
    keyX: midi => keys.get(midi)?.x ?? 0,
    noteOn(midi, velocity = 0.7) {
      const k = keys.get(midi); if (!k) return
      k.held = true; k.target = 1; k.velocity = velocity; k.blow = 0
    },
    noteOff(midi) {
      const k = keys.get(midi); if (!k) return
      k.held = false; k.target = 0
    },
    setSustain(on) { sustain = !!on; pedalTarget[2] = on ? 1 : 0 },
    setPedal(i, on) { if (i === 2) return api.setSustain(on); if (i === 0 || i === 1) pedalTarget[i] = on ? 1 : 0 },
    setKeyTint(midi, color) { const k = keys.get(midi); if (k) k.tint = color ? new THREE.Color(color) : null },
    setDesk() {},
    setLid(mode) { lidTarget = LID_DEG[mode] ?? LID_DEG.full; api.lidMode = LID_DEG[mode] !== undefined ? mode : 'full' },
    setFinish(name) {
      const f = FINISHES[name] || FINISHES.ebony
      lacquers.forEach((m, i) => {
        m.color.set(f.color)
        m.roughness = f.roughness ?? base[i].roughness
        m.clearcoat = f.clearcoat ?? base[i].clearcoat
        m.clearcoatRoughness = f.clearcoatRoughness ?? base[i].clearcoatRoughness
      })
    },
    update(dt) {
      dt = Math.min(0.05, Math.max(0, dt || 0))
      for (const [m, k] of keys) {
        const i = m - LOW
        // the key goes down fast and comes up a little slower, as the other two pianos'
        const speed = k.target ? 22 + k.velocity * 18 : 14
        k.value += (k.target - k.value) * Math.min(1, dt * speed)
        keyAngles[i] = k.value * (k.black ? KEY_DIP_RAD.black : KEY_DIP_RAD.white)
        // the blow: the hammer flies to the string (faster when louder), falls back and is
        // caught at the check while the key is held; at rest with the key up
        const rest = check[i] * smooth(k.value, 0.02, 0.98)
        if (k.blow >= 0) {
          const fly = 0.045 - 0.025 * k.velocity, fall = 0.05
          k.blow += dt
          if (k.blow < fly) hammers[i] = rest + (strike[i] - rest) * smooth(k.blow / fly, 0, 1)
          else if (k.blow < fly + fall) hammers[i] = strike[i] + (rest - strike[i]) * smooth((k.blow - fly) / fall, 0, 1)
          else { hammers[i] = rest; k.blow = -1 }
        } else hammers[i] = rest
      }
      for (let i = 0; i < 3; i++) pedals[i] += (pedalTarget[i] * PEDAL_MAX[i] - pedals[i]) * Math.min(1, dt * 18)
      lidDeg += (lidTarget - lidDeg) * Math.min(1, dt * 2.2)
      if (Math.abs(lidTarget - lidDeg) < 0.05) lidDeg = lidTarget
      // the bench: the pages lift it with bench.userData.lift (cm) and scale / move its
      // children; here the seat rides on Afterglow's own height mechanism instead
      benchHolder.position.set(0, 0, 0); benchHolder.scale.set(1, 1, 1)
      if (agBench) ag.setBenchHeight(Math.min(BENCH.heightRange[1], Math.max(BENCH.heightRange[0], seatBase + (bench.userData.lift || 0) / 100)))
      bench.visible = benchVisible && !api.keyboardOnly
      ag.setKeyAngles(keyAngles)
      ag.setHammerAngles(hammers)
      ag.setDamperLifts(null)          // the dampers follow the keys and the sustain pedal
      ag.setPedals(pedals)
      ag.setLidAngle(lidDeg)
      ag.update(0, null)
    },
    get sustain() { return sustain },
    set benchVisible(v) { benchVisible = !!v; bench.visible = benchVisible && !api.keyboardOnly },
  }
  let benchVisible = true
  api.setFinish('ebony')
  api.update(0)
  return api
}
