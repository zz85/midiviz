// The Mechanical Pianist's older upright piano as a reusable three.js module.
//
// Its Blender-built case is loaded from assets/upright-piano-case.glb. The 88
// keys are built here from the same measured layout as the source project, so
// their 2.35 cm pitch and 1 cm dip match Midiviz's pianist rig and grand piano.
// Midiviz works in centimetres; the source model works in metres, so the case
// is scaled by 100 and raised until the white-key tops are at y = 73 cm.

import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { PianoInterior } from './upright-interior.js'

export const LOW = 21
export const HIGH = 108

export const DIM = {
  WHITE_W: 2.35,
  WHITE_L: 15,
  WHITE_H: 2.15,
  GAP: 0.11,
  BLACK_W: 1.28,
  BLACK_L: 9.5,
  BLACK_RISE: 1.22,
  KEY_TOP: 73,
  KEY_BACK: -16.2,
  PIVOT_Z: -25.5,
}

export const FINISHES = {
  ebony: { label: 'Polished ebony', color: 0x050505, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.025 },
  satin: { label: 'Satin ebony', color: 0x0a0a0a, roughness: 0.5, clearcoat: 0.35, clearcoatRoughness: 0.35 },
  white: { label: 'Polished white', color: 0xefece6, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.03 },
  walnut: { label: 'Walnut', color: 0x4a2a16, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.04 },
  mahogany: { label: 'Mahogany', color: 0x5a1f10, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.04 },
  red: { label: 'Lacquer red', color: 0x6a0a0c, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.03 },
}

const WHITE_PITCH = 2.35
const WHITE_GAP = 0.11
const WHITE_FRONT_HEIGHT = 2.15
const BLACK_WIDTH_BOTTOM = 1.28
const BLACK_WIDTH_TOP = 0.98
const BLACK_HEIGHT = 1.22
const BLACK_FRONT_Z = -5.5
const WHITE_PIVOT_Z = -25.5
const BLACK_PIVOT_Z = -27
const PIVOT_Y = -3
const KEY_DIP = 1
const BLACK_DIP = 0.95
const KEY_BACK = -16.2
const BLACK_PC = new Set([1, 3, 6, 8, 10])

export const isBlack = midi => BLACK_PC.has(((midi % 12) + 12) % 12)

function whiteCountFromC0(midi) {
  let n = 0
  for (let p = 12; p < midi; p++) if (!isBlack(p)) n++
  return n
}

const WHITE_COUNT = (() => {
  let n = 0
  for (let midi = LOW; midi <= HIGH; midi++) if (!isBlack(midi)) n++
  return n
})()
const KEYBOARD_WIDTH = WHITE_COUNT * WHITE_PITCH
const LEFT_EDGE = -KEYBOARD_WIDTH / 2
const A0_FROM_C0 = whiteCountFromC0(LOW)

function whiteLeftEdge(midi) {
  return LEFT_EDGE + (whiteCountFromC0(midi) - A0_FROM_C0) * WHITE_PITCH
}

function blackCenterX(midi) {
  const pc = midi % 12
  const octaveC = midi - pc
  const cx = whiteLeftEdge(octaveC)
  const B = BLACK_WIDTH_BOTTOM
  if (pc === 1 || pc === 3) {
    const tail = (3 * WHITE_PITCH - 2 * B) / 3
    const left = pc === 1 ? tail : 2 * tail + B
    return cx + left + B / 2
  }
  const fx = cx + 3 * WHITE_PITCH
  const tail = (4 * WHITE_PITCH - 3 * B) / 4
  const k = pc === 6 ? 0 : pc === 8 ? 1 : 2
  return fx + (k + 1) * tail + k * B + B / 2
}

function buildKeyLayout() {
  const keys = []
  for (let midi = LOW; midi <= HIGH; midi++) {
    const black = isBlack(midi)
    if (black) {
      const x = blackCenterX(midi)
      keys.push({ midi, index: midi - LOW, black, x,
        frontLeft: x - BLACK_WIDTH_BOTTOM / 2, frontRight: x + BLACK_WIDTH_BOTTOM / 2,
        tailLeft: x - BLACK_WIDTH_BOTTOM / 2, tailRight: x + BLACK_WIDTH_BOTTOM / 2,
        pivotZ: BLACK_PIVOT_Z, dip: BLACK_DIP })
    } else {
      const left = whiteLeftEdge(midi), right = left + WHITE_PITCH
      keys.push({ midi, index: midi - LOW, black, x: (left + right) / 2,
        frontLeft: left + WHITE_GAP / 2, frontRight: right - WHITE_GAP / 2,
        tailLeft: left + WHITE_GAP / 2, tailRight: right - WHITE_GAP / 2,
        pivotZ: WHITE_PIVOT_Z, dip: KEY_DIP })
    }
  }
  for (const k of keys) {
    if (k.black) continue
    const below = keys[k.index - 1], above = keys[k.index + 1]
    if (below?.black) k.tailLeft = below.x + BLACK_WIDTH_BOTTOM / 2 + WHITE_GAP * 0.6
    if (above?.black) k.tailRight = above.x - BLACK_WIDTH_BOTTOM / 2 - WHITE_GAP * 0.6
  }
  return keys
}

const KEY_LAYOUT = buildKeyLayout()

function mergeGeometries(geometries) {
  const positions = [], normals = []
  for (const geometry of geometries) {
    const p = geometry.getAttribute('position'), n = geometry.getAttribute('normal')
    for (let i = 0; i < p.count; i++) {
      positions.push(p.getX(i), p.getY(i), p.getZ(i))
      normals.push(n.getX(i), n.getY(i), n.getZ(i))
    }
  }
  const out = new THREE.BufferGeometry()
  out.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  out.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))
  return out
}

function whiteKeyGeometry(k) {
  const l = k.frontLeft - k.x, r = k.frontRight - k.x
  const tl = k.tailLeft - k.x, tr = k.tailRight - k.x
  const zt = BLACK_FRONT_Z - 0.12
  const shape = new THREE.Shape()
  shape.moveTo(l, 0); shape.lineTo(r, 0)
  if (Math.abs(tr - r) > 1e-5) { shape.lineTo(r, zt); shape.lineTo(tr, zt) }
  shape.lineTo(tr, KEY_BACK); shape.lineTo(tl, KEY_BACK)
  if (Math.abs(tl - l) > 1e-5) { shape.lineTo(tl, zt); shape.lineTo(l, zt) }
  shape.lineTo(l, 0)
  const bevel = 0.08
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: WHITE_FRONT_HEIGHT - 2 * bevel,
    bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel,
    bevelOffset: -bevel, bevelSegments: 3, curveSegments: 1,
  })
  geometry.rotateX(Math.PI / 2)
  geometry.translate(0, -bevel, 0)
  return geometry
}

function blackKeyGeometry() {
  const y0 = -1.2, y1 = BLACK_HEIGHT
  const hb = BLACK_WIDTH_BOTTOM / 2, ht = BLACK_WIDTH_TOP / 2, rc = 0.16
  const profile = [[-hb, y0], [hb, y0]]
  for (let i = 0; i <= 5; i++) {
    const a = Math.PI / 2 * i / 5
    profile.push([ht - rc + rc * Math.cos(a), y1 - rc + rc * Math.sin(a)])
  }
  for (let i = 0; i <= 5; i++) {
    const a = Math.PI / 2 + Math.PI / 2 * i / 5
    profile.push([-ht + rc + rc * Math.cos(a), y1 - rc + rc * Math.sin(a)])
  }
  const zFront = y => BLACK_FRONT_Z - (y - y0) / (y1 - y0) * 0.75
  const zBack = KEY_BACK + 0.4, n = profile.length
  const positions = [], indices = []
  for (const [x, y] of profile) positions.push(x, y, zFront(y))
  for (const [x, y] of profile) positions.push(x, y, zBack)
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n
    indices.push(i, n + i, j, j, n + i, n + j)
  }
  const sides = new THREE.BufferGeometry()
  sides.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  sides.setIndex(indices); sides.computeVertexNormals()
  const cap = []
  const center = profile.reduce((a, [x, y]) => [a[0] + x / n, a[1] + y / n], [0, 0])
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n, [x0, y0] = profile[i], [x1, y1] = profile[j]
    cap.push(center[0], center[1], zFront(center[1]), x0, y0, zFront(y0), x1, y1, zFront(y1))
  }
  const front = new THREE.BufferGeometry()
  front.setAttribute('position', new THREE.Float32BufferAttribute(cap, 3)); front.computeVertexNormals()
  return mergeGeometries([sides.toNonIndexed(), front])
}

function hash01(a, b) {
  let x = Math.imul((a | 0) ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul((b | 0) ^ 0xc2b2ae35, 0x27d4eb2f)
  x ^= x >>> 16; x = Math.imul(x, 0x7feb352d); x ^= x >>> 15; x = Math.imul(x, 0x846ca68b); x ^= x >>> 16
  return (x >>> 0) / 4294967296
}

function irregularity(k) {
  const c = seed => hash01(k.midi, seed) * 2 - 1
  return { x: 0.006 * c(11), y: 0.011 * c(12), yaw: 0.0007 * c(13), tilt: 0.0006 * c(14) }
}

function tint(geometry, k) {
  const h = hash01(k.midi, 3), h2 = hash01(k.midi, 5)
  const base = k.black
    ? new THREE.Color().setRGB(1 + (h - 0.5) * 0.25, 1 + (h - 0.5) * 0.2, 1 + (h - 0.5) * 0.15)
    : new THREE.Color().setRGB(1 - h * 0.035, 1 - h * 0.045 - h2 * 0.01, 1 - h * 0.08 - h2 * 0.03)
  const p = geometry.getAttribute('position'), colors = new Float32Array(p.count * 3)
  for (let i = 0; i < p.count; i++) {
    const back = THREE.MathUtils.smoothstep(-p.getZ(i), 9, 16), shade = 1 - back * 0.35
    colors.set([base.r * shade, base.g * shade, base.b * shade], i * 3)
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
}

function keyAngle(k, depression) {
  return Math.asin(Math.min(1, depression * k.dip / -k.pivotZ))
}

function roundedRect(width, height, radius) {
  const shape = new THREE.Shape(), x = -width / 2, y = -height / 2
  shape.moveTo(x + radius, y); shape.lineTo(x + width - radius, y)
  shape.quadraticCurveTo(x + width, y, x + width, y + radius)
  shape.lineTo(x + width, y + height - radius)
  shape.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
  shape.lineTo(x + radius, y + height)
  shape.quadraticCurveTo(x, y + height, x, y + height - radius)
  shape.lineTo(x, y + radius); shape.quadraticCurveTo(x, y, x + radius, y)
  return shape
}

function roundedBox(width, height, depth, radius) {
  const geometry = new THREE.ExtrudeGeometry(roundedRect(width - 2 * radius, height - 2 * radius, radius * 0.5), {
    depth: depth - 2 * radius, bevelEnabled: true, bevelThickness: radius,
    bevelSize: radius, bevelSegments: 3, curveSegments: 4,
  })
  geometry.translate(0, 0, -(depth - 2 * radius) / 2)
  geometry.computeVertexNormals()
  return geometry
}

function buildBench(caseMaterial, brassMaterial) {
  const bench = new THREE.Group()
  bench.name = 'upright-piano-bench'
  const frame = new THREE.Mesh(roundedBox(76, 6, 36, 0.8), caseMaterial)
  frame.position.y = 47
  const cushion = new THREE.Mesh(roundedBox(74, 6, 34, 2.4), new THREE.MeshPhysicalMaterial({ color: 0x130d0b, roughness: 0.48, clearcoat: 0.35, clearcoatRoughness: 0.25 }))
  cushion.position.y = 52.4
  bench.add(frame, cushion)
  const legGeometry = new THREE.CylinderGeometry(2.2, 2.8, 44, 24)
  legGeometry.translate(0, 22, 0)
  for (const [x, z] of [[-33, -14], [33, -14], [-33, 14], [33, 14]]) {
    const leg = new THREE.Mesh(legGeometry, caseMaterial); leg.position.set(x, 0, z); bench.add(leg)
  }
  for (const side of [-1, 1]) {
    const knob = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 2.6, 24), brassMaterial)
    knob.rotation.z = Math.PI / 2; knob.position.set(side * 38, 47, 0); bench.add(knob)
  }
  bench.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true } })
  bench.position.set(0, 0, 52)
  return bench
}

function materials() {
  const lacquer = new THREE.MeshPhysicalMaterial({ color: 0x050505, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.025 })
  const felt = new THREE.MeshPhysicalMaterial({ color: 0x551218, roughness: 0.88, sheen: 0.55, sheenRoughness: 0.8, sheenColor: new THREE.Color(0x7a2830) })
  const brass = new THREE.MeshPhysicalMaterial({ color: 0xe0ad55, metalness: 1, roughness: 0.18, clearcoat: 0.35, clearcoatRoughness: 0.12 })
  const gold = new THREE.MeshPhysicalMaterial({ color: 0xe4b85f, metalness: 0.85, roughness: 0.22 })
  const cloth = new THREE.MeshStandardMaterial({ color: 0x291013, roughness: 0.92 })
  const ivory = new THREE.MeshPhysicalMaterial({ color: 0xf1ead7, roughness: 0.36, clearcoat: 0.35, clearcoatRoughness: 0.2, vertexColors: true })
  const ebony = new THREE.MeshPhysicalMaterial({ color: 0x090909, roughness: 0.24, clearcoat: 0.75, clearcoatRoughness: 0.08, vertexColors: true })
  return { lacquer, felt, brass, gold, cloth, ivory, ebony, byName: { lacquer, felt, brass, gold_leaf: gold, cloth } }
}

function applyCaseMaterials(root, palette) {
  root.traverse(o => {
    if (!o.isMesh) return
    const name = String(o.material?.name || '').replace(/\.\d+$/, '')
    if (palette.byName[name]) o.material = palette.byName[name]
    o.castShadow = true; o.receiveShadow = true
  })
}

/** Separate brass above the keyboard (the sconces) from the pedal brass. */
function splitSconces(caseScene) {
  const brass = caseScene.getObjectByName('Brass')
  if (!brass) return null
  caseScene.updateMatrixWorld(true)
  const group = new THREE.Group()
  group.name = 'Sconces'
  const meshes = []
  brass.traverse(o => { if (o.isMesh) meshes.push(o) })
  const v = new THREE.Vector3()
  for (const mesh of meshes) {
    const geometry = mesh.geometry, position = geometry.getAttribute('position')
    const indices = geometry.index ? Array.from(geometry.index.array) : Array.from({ length: position.count }, (_, i) => i)
    const upper = [], lower = []
    for (let triangle = 0; triangle + 2 < indices.length; triangle += 3) {
      let y = 0
      for (let k = 0; k < 3; k++) y += v.fromBufferAttribute(position, indices[triangle + k]).applyMatrix4(mesh.matrixWorld).y / 3
      ;(y > -0.2 ? upper : lower).push(indices[triangle], indices[triangle + 1], indices[triangle + 2])
    }
    if (!upper.length) continue
    const top = new THREE.Mesh(geometry.clone(), mesh.material)
    top.geometry.setIndex(upper)
    geometry.setIndex(lower)
    top.castShadow = mesh.castShadow; top.receiveShadow = mesh.receiveShadow
    mesh.matrixWorld.decompose(top.position, top.quaternion, top.scale)
    group.add(top)
  }
  caseScene.add(group)
  return group
}

const UPRIGHT_SYMPATHY = [[12, 0.06], [19, 0.035], [24, 0.03], [28, 0.015], [-12, 0.03], [-19, 0.015], [7, 0.012], [-7, 0.01]]

class UprightMechanics {
  constructor(keys) {
    this.keys = keys
    this.time = 0
    this.sustain = 0
    this.sustainTarget = 0
    this.soft = 0
    this.softTarget = 0
    this.strikeAge = new Float64Array(88).fill(Infinity)
    this.prompt = new Float32Array(88)
    this.aftersound = new Float32Array(88)
    this.velocity = new Float32Array(88).fill(0.7)
    this.own = new Float32Array(176)
    this.frame = {
      keys: new Float32Array(88),
      hammers: new Float32Array(88),
      dampers: new Float32Array(88),
      strings: new Float32Array(176),
      damperRail: 0,
      softPedal: 0,
      jacks: new Float32Array(88),
      bridles: new Float32Array(88),
      leans: new Float32Array(88),
      checks: new Float32Array(88).fill(0.6),
    }
    for (let i = 0; i < 88; i++) this.frame.leans[i] = 0.0026 * (2 * hash01(i, 51) - 1)
  }

  noteOn(midi, velocity) {
    const i = midi - LOW
    if (i < 0 || i >= 88) return
    const v = Math.max(0, Math.min(1, velocity ?? 0.7))
    this.velocity[i] = v
    this.strikeAge[i] = 0
    const amplitude = 0.0035 * Math.pow(2, -i / 14) * Math.pow(v, 1.6)
    const left = this.prompt[i] + this.aftersound[i]
    this.prompt[i] = Math.hypot(amplitude * 0.65, left * 0.25)
    this.aftersound[i] = Math.hypot(amplitude * 0.35, left * 0.75)
    this.frame.hammers[i] = 1
    this.frame.checks[i] = Math.max(0.54, Math.min(0.66, 0.635 - 0.07 * v + 0.06 * (hash01(midi * 100003 + Math.round(this.time * 1000), 4) - 0.5)))
    this.frame.leans[i] = 0.0026 * (2 * hash01(i, 51) - 1) + 0.0008 * (2 * hash01(midi * 100003 + Math.round(this.time * 1000), 52) - 1)
  }

  setSustain(value) { this.sustainTarget = value === true ? 1 : value === false ? 0 : Math.max(0, Math.min(1, +value || 0)) }
  setSoft(value) { this.softTarget = value === true ? 1 : value === false ? 0 : Math.max(0, Math.min(1, +value || 0)) }

  update(dt) {
    dt = Math.min(0.05, Math.max(0, dt || 0))
    this.time += dt
    const follow = (value, target, seconds) => target + (value - target) * Math.exp(-dt / seconds)
    this.sustain = follow(this.sustain, this.sustainTarget, 0.06)
    this.soft = follow(this.soft, this.softTarget, 0.1)
    const rail = Math.max(0, Math.min(1, (this.sustain - 0.2) / 0.8))
    const own = this.own

    for (let i = 0; i < 88; i++) {
      const key = this.keys.get(LOW + i)
      const depression = key?.value || 0
      this.frame.keys[i] = depression
      this.strikeAge[i] += dt

      const rest = 0.35 * this.soft
      if (key?.held) {
        const age = this.strikeAge[i]
        const check = this.frame.checks[i]
        const settled = age < 0.008 ? 1 : check + (1 - check) * Math.exp(-(age - 0.008) / 0.045) * Math.cos((age - 0.008) * 54)
        this.frame.hammers[i] = Math.max(rest, Math.min(1, settled))
      } else {
        this.frame.hammers[i] = follow(this.frame.hammers[i], rest, 0.055)
      }

      const keyLift = Math.max(0, Math.min(1, (depression - 0.35) / 0.4))
      const byKey = keyLift * keyLift * (3 - 2 * keyLift)
      const gap = 0.07 * hash01(i, 77)
      const byRail = Math.max(0, Math.min(1, (rail - gap) / (1 - gap)))
      this.frame.dampers[i] = LOW + i >= 89 ? 0 : Math.max(byKey, byRail)
      this.frame.jacks[i] = depression <= 0.6 ? 0 : depression >= 0.9 ? 1 : (depression - 0.6) / 0.3
      const age = this.strikeAge[i]
      const frequency = 3.5 + 1.5 * hash01(i, 31)
      const flutter = Number.isFinite(age) && age > 0 ? 0.0011 * this.velocity[i] * Math.exp(-age / 0.28) * Math.sin(2 * Math.PI * frequency * age + hash01(i, 32) * 6.28) * Math.min(1, age / 0.01) : 0
      this.frame.bridles[i] = 0.00012 * Math.sin(0.9 * this.time + 2.3 * i) * Math.sin(0.37 * this.time + 1.1 * i) + flutter

      const ringTime = Math.exp(1.46 - 0.0172 * i - 0.00078 * Math.max(0, i - 39) ** 2)
      const dampTime = 0.4 * Math.exp(-0.041 * i)
      const free = LOW + i >= 89 || byKey > 0 || this.sustain >= 0.5
      const damping = free ? 1 : Math.exp(-dt / dampTime)
      this.prompt[i] *= Math.exp(-dt / (ringTime / 5)) * damping
      this.aftersound[i] *= Math.exp(-dt / ringTime) * damping
      const amplitude = this.prompt[i] + this.aftersound[i]
      const rho = 0.08 + (0.3 + 0.25 * hash01(i, 3)) * (1 - Math.exp(-Math.min(age, 20) / 0.25))
      own[2 * i] = amplitude
      own[2 * i + 1] = amplitude * rho
    }

    this.frame.strings.set(own)
    for (let i = 0; i < 88; i++) {
      const amplitude = own[2 * i]
      if (amplitude < 2e-6) continue
      for (const [distance, coupling] of UPRIGHT_SYMPATHY) {
        const j = i + distance
        if (j < 0 || j >= 88) continue
        const key = this.keys.get(LOW + j)
        if (LOW + j < 89 && (key?.value || 0) <= 0.35 && this.sustain < 0.5) continue
        const swing = coupling * amplitude
        this.frame.strings[2 * j] = Math.hypot(this.frame.strings[2 * j], swing)
        this.frame.strings[2 * j + 1] = Math.hypot(this.frame.strings[2 * j + 1], 0.5 * swing)
      }
    }

    this.frame.damperRail = rail
    this.frame.softPedal = this.soft
    return this.frame
  }
}

/**
 * Load the upright piano. The returned object follows buildGrandPiano's public
 * contract where the pianist demos use it: root, keys, bench, lid, keyX,
 * noteOn/noteOff, pedals, finish, lid mode, update, mirror and keyboardOnly.
 */
export async function loadUprightPiano({ bench: withBench = true, asset = new URL('./assets/upright-piano-case.glb', import.meta.url) } = {}) {
  const palette = materials()
  const gltf = await new GLTFLoader().loadAsync(String(asset))
  const root = new THREE.Group()
  root.name = 'upright-piano'
  const pianoCase = gltf.scene
  pianoCase.name = 'upright-piano-case'
  const upperPanel = pianoCase.getObjectByName('UpperPanel')
  const sconces = splitSconces(pianoCase)
  pianoCase.scale.setScalar(100)
  pianoCase.position.y = DIM.KEY_TOP
  applyCaseMaterials(pianoCase, palette)
  root.add(pianoCase)

  const interior = new PianoInterior()
  interior.root.scale.setScalar(100)
  interior.root.position.y = DIM.KEY_TOP
  root.add(interior.root)

  const keys = new Map(), keyMeshes = [], pivots = []
  const blackGeometry = blackKeyGeometry()
  for (const layout of KEY_LAYOUT) {
    const pivot = new THREE.Group()
    pivot.name = `KeyPivot${layout.midi}`
    pivot.userData.kb = true
    pivot.position.set(0, DIM.KEY_TOP + PIVOT_Y, layout.pivotZ)
    const geometry = layout.black ? blackGeometry.clone() : whiteKeyGeometry(layout)
    tint(geometry, layout)
    const top = (layout.black ? palette.ebony : palette.ivory).clone()
    const mesh = new THREE.Mesh(geometry, top)
    mesh.name = `Key${layout.midi}`
    mesh.userData.midi = layout.midi
    const irr = irregularity(layout)
    mesh.position.set(layout.x + irr.x, -PIVOT_Y + irr.y, -layout.pivotZ)
    mesh.rotation.y = irr.yaw
    mesh.castShadow = true; mesh.receiveShadow = true
    pivot.add(mesh); root.add(pivot)
    const state = { ...layout, pivot, mesh, top, held: false, target: 0, value: 0, velocity: 0.7, glow: 0, tint: null, restTilt: irr.tilt }
    keys.set(layout.midi, state); keyMeshes.push(mesh); pivots.push(pivot)
  }
  const mechanics = new UprightMechanics(keys)
  interior.update(mechanics.frame)

  const bench = buildBench(palette.lacquer, palette.brass)
  if (withBench) root.add(bench)
  const lid = new THREE.Group()
  lid.name = 'upright-piano-light-anchor'
  lid.position.set(0, 129, 0)
  root.add(lid)

  let sustain = false
  const setPanelOpen = on => {
    on = !!on
    if (upperPanel) upperPanel.visible = !on
    if (sconces) sconces.visible = !on
    interior.root.visible = on
    api.panelOpen = on
    api.lidMode = on ? 'full' : 'closed'
  }
  const api = {
    kind: 'upright', root, keys, keyMeshes, pivots, bench, lid, mirror: null,
    interior, action: mechanics, panelOpen: true,
    materials: palette, keyboardOnly: false, lidMode: 'full', keyGlow: 0,
    keyX: midi => keys.get(midi)?.x ?? 0,
    noteOn(midi, velocity = 0.7) {
      const key = keys.get(midi); if (!key) return
      key.held = true; key.target = 1; key.velocity = velocity
      mechanics.noteOn(midi, velocity)
    },
    noteOff(midi) {
      const key = keys.get(midi); if (!key) return
      key.held = false; key.target = 0
    },
    setSustain(on) { sustain = !!on; mechanics.setSustain(on) },
    setPedal(i, on) {
      if (i === 2) return api.setSustain(on)
      if (i === 0) mechanics.setSoft(on)
    },
    setKeyTint(midi, color) { const key = keys.get(midi); if (key) key.tint = color ? new THREE.Color(color) : null },
    setDesk() {},
    setPanelOpen,
    setLid(mode) { setPanelOpen(mode !== 'closed') },
    setFinish(name) {
      const finish = FINISHES[name] || FINISHES.ebony
      const material = palette.lacquer
      material.color.setHex(finish.color)
      material.roughness = finish.roughness
      material.clearcoat = finish.clearcoat
      material.clearcoatRoughness = finish.clearcoatRoughness
      material.needsUpdate = true
    },
    update(dt) {
      dt = Math.min(0.05, Math.max(0, dt || 0))
      for (const key of keys.values()) {
        const speed = key.target ? 16 + key.velocity * 14 : 12
        key.value += (key.target - key.value) * Math.min(1, dt * speed)
        key.pivot.rotation.x = keyAngle(key, key.value) + key.restTilt
        const goal = key.held && key.tint && api.keyGlow > 0 ? 1 : 0
        key.glow += (goal - key.glow) * Math.min(1, dt * (goal ? 40 : 6))
        if (key.glow > 0.002 || key.top.emissiveIntensity) {
          if (key.tint) key.top.emissive.copy(key.tint)
          key.top.emissiveIntensity = key.glow > 0.002 ? key.glow * api.keyGlow * (key.black ? 1.6 : 1) : 0
        }
      }
      interior.update(mechanics.update(dt))
    },
    keepPrevious() { interior.keepPrevious() },
    get sustain() { return sustain },
    set benchVisible(value) { bench.visible = !!value && !api.keyboardOnly },
  }
  api.setFinish('ebony')
  setPanelOpen(true)
  interior.keepPrevious()
  return api
}
