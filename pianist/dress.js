// The red knit dress of the Experiment #032 pianist.
//
// Concert Creator's pianist wears a sleeveless, high-necked dress in a red
// knit with a fine diamond texture, bare shoulders (a halter cut: the
// fabric runs from the neck down to under the arms), fitted to the waist and
// falling over the knees.
//
//  • Bodice: cut out of the body mesh itself (rest pose, standing) — torso
//    vertices below the neckline, inside the halter line, above the hips —
//    pushed out along the normals and shrink-wrapped (Laplacian smoothing
//    held outside the skin), so it bridges the hollows a knit would span
//    (between the breasts, along the spine). It keeps the body's skin
//    weights: a SkinnedMesh on the same skeleton, so it never lags or
//    slides.
//  • Skirt: a cloth tube hanging from a ring round the hips (carried by the
//    pelvis), simulated on the CPU with position-based dynamics — Verlet
//    integration, stretch / shear / bend distance constraints, collisions
//    against the skin of the hips and legs (skin points with normals carried
//    by their bones, hashed every frame, as the hair does) and the bench. At
//    load it is dropped from an open umbrella onto the seated lap and
//    settles over the thighs, down past the knees and onto the bench.
//  • Knit: a procedural tile (canvas) for colour and normal: rows of small
//    interlocking diamonds with lighter flecks, plus sheen for the fuzz of
//    the yarn the stage light picks out.
//
// Units: centimetres in the piano's frame.

import * as THREE from 'three'
import { cutShell, piping, skinned, hideBody } from './shell.js'
import { applyFabric } from './fabric.js'

let serial = 0   // each dress hides the body under it under its own key (two can overlap while switching)

const v3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z)

function knitTextures(size = 256, cells = 16) {
  // height field of a diamond weave: each cell a raised lozenge, offset rows
  const H = new Float32Array(size * size), C = new Float32Array(size * size)
  let s = 9; const r = () => (s = (s * 16807) % 2147483647) / 2147483647
  const cw = size / cells, chh = size / cells
  const flecks = new Float32Array(cells * cells * 2).map(() => r())
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const row = Math.floor(y / chh), off = (row % 2) * cw * 0.5
    const cx = ((x + off) % cw) / cw - 0.5, cy = (y % chh) / chh - 0.5
    const d = Math.abs(cx) * 1.15 + Math.abs(cy) * 0.95
    const h = Math.max(0, 0.5 - d) * 2
    H[y * size + x] = Math.pow(h, 0.7)
    const col = Math.floor((x + off) / cw) % cells
    C[y * size + x] = flecks[(row % cells) * cells + col]
  }
  const cn = document.createElement('canvas'); cn.width = cn.height = size
  const gn = cn.getContext('2d'), imn = gn.createImageData(size, size)
  const cc = document.createElement('canvas'); cc.width = cc.height = size
  const gc = cc.getContext('2d'), imc = gc.createImageData(size, size)
  const h = (x, y) => H[((y + size) % size) * size + ((x + size) % size)]
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const nx = (h(x - 1, y) - h(x + 1, y)) * 2.2, ny = (h(x, y - 1) - h(x, y + 1)) * 2.2
    const l = Math.hypot(nx, ny, 1), i = (y * size + x) * 4
    imn.data[i] = (nx / l * 0.5 + 0.5) * 255; imn.data[i + 1] = (ny / l * 0.5 + 0.5) * 255; imn.data[i + 2] = (1 / l * 0.5 + 0.5) * 255; imn.data[i + 3] = 255
    // colour: valleys darker, some lozenges lighter (the flecks of the yarn)
    const v = 0.55 + 0.45 * H[y * size + x], f = C[y * size + x]
    const k = (0.8 + 0.2 * v) * (f > 0.85 ? 1.1 : f < 0.12 ? 0.93 : 1)
    imc.data[i] = Math.min(255, 255 * k); imc.data[i + 1] = Math.min(255, 255 * k * (f > 0.82 ? 0.95 : 0.92)); imc.data[i + 2] = Math.min(255, 255 * k * (f > 0.82 ? 0.95 : 0.92)); imc.data[i + 3] = 255
  }
  gn.putImageData(imn, 0, 0); gc.putImageData(imc, 0, 0)
  const normal = new THREE.CanvasTexture(cn), color = new THREE.CanvasTexture(cc)
  for (const t of [normal, color]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8 }
  color.colorSpace = THREE.SRGBColorSpace
  return { normal, color }
}

// Options:
//   length: 'midi' (below the knee, the reference) or 'gown' (to the floor)
//   skirt:  'cloth' (simulated, pulled softly toward the fitted shape) or
//           'fitted' (skinned only — no simulation at all)
//   sleeves: 'none' (the reference's halter), 'short' (a T-shirt sleeve
//           and a round neck) or 'long' (to the wrist, round neck) — the
//           sleeves are cut from the arm's skin like the bodice, so they
//           are skinned to the arm and bend with it
//   slits:  side slits (left and right) from the knee to the
//           hem; on by default for the gown
//   Fabric: plain jersey by default (no pattern, a faint fine weave);
//           setFabric('knit') brings back the diamond knit
export function createDress(ch, rig, { seatY = 55.4, bench = null, color = '#8e1d1b', length = 'midi', skirt: skirtMode = 'cloth', bodice: withBodice = true, waist = 4, sleeves = 'none', slits = length === 'gown' } = {}) {
  const body = ch.parts.body.geometry
  const P = body.attributes.position.array, Nn = body.attributes.normal.array
  const SI = body.attributes.skinIndex.array, SW = body.attributes.skinWeight.array
  const NV = P.length / 3
  const J = ch.joints
  const boneName = i => ch.bones[i].name
  const weightOf = (v, re) => { let w = 0; for (let k = 0; k < 4; k++) if (re.test(boneName(SI[v * 4 + k]))) w += SW[v * 4 + k]; return w }

  // ── Bodice: high halter neck, bare shoulders, to the hips ──
  const neckY = J['neck01____head'].y + 1.2
  const armpitY = J['upperarm01.L____head'].y - 8
  const hipY = J['upperleg01.L____head'].y + 4
  const ARM = /^(upperarm|lowerarm|wrist|finger|metacarpal|clavicle|shoulder)/
  // sleeves: how far down the arm (distance from the shoulder joint, rest pose)
  const sh = { L: J['upperarm01.L____head'], R: J['upperarm01.R____head'] }
  const wristD = sh.L.distanceTo(J['wrist.L____head'])
  const sleeveTo = sleeves === 'long' ? wristD - 2.5 : sleeves === 'short' ? 13 : 0
  const roundNeck = sleeves !== 'none'
  const bodiceKeep = (v, g) => {
    const x = g.P[v * 3], y = g.P[v * 3 + 1]
    const w = re => { let s = 0; for (let k = 0; k < 4; k++) if (re.test(boneName(g.SI[v * 4 + k]))) s += g.SW[v * 4 + k]; return s }
    if (roundNeck) {
      // a round neck a little below the throat, and the arm down to the cuff
      if (y > neckY - 1.5 || y < hipY - 4) return false
      if (w(/^(head|jaw|neck02|neck03|lowerleg|foot|toe|finger|metacarpal)/) > 0.3 || w(/^upperleg/) > 0.75) return false
      if (w(/^wrist/) > 0.25) return false
      const s0 = x > 0 === sh.L.x > 0 ? sh.L : sh.R
      if (w(ARM) > 0.3) return Math.hypot(x - s0.x, y - s0.y, g.P[v * 3 + 2] - s0.z) < sleeveTo
      return true
    }
    if (y > neckY || y < hipY - 4) return false
    // armholes: the halter line above the armpit, the arm's weight below it
    if (w(ARM) > 0.45 + 0.4 * THREE.MathUtils.smoothstep(y - armpitY, 0, 8)) return false
    if (w(/^(head|jaw|neck02|neck03|lowerleg|foot|toe)/) > 0.4 || w(/^upperleg/) > 0.75) return false
    // halter line: narrow at the neck, the full torso under the arms
    const t = THREE.MathUtils.clamp((neckY - y) / (neckY - armpitY), 0, 1)
    const half = 5.6 + (24 - 5.6) * Math.pow(t, 1.8)
    return Math.abs(x) <= half
  }
  // the fabric: MakeHuman's tights helper (a smooth shell over the body made
  // for clothing); the body under it is hidden
  const armGap = (v, g) => { let w = 0; for (let k = 0; k < 4; k++) { const n = boneName(g.SI[v * 4 + k]); if (/^(upperarm|shoulder)/.test(n)) w += g.SW[v * 4 + k] } const y = g.P[v * 3 + 1]; return 0.3 + 0.8 * Math.min(1, w * 2) * THREE.MathUtils.smoothstep(neckY - y, 3, 8) }
  const bodiceShell = cutShell(ch, bodiceKeep, { gap: armGap, offset: 0.35, iterations: 60, obstacleSmooth: roundNeck ? 40 : 20, minLoop: 25, spatial: roundNeck ? 3.2 : 1.6, fillHoles: 400, dropIslands: 60, close: 3, smoothCut: 6 })
  const under = cutShell(ch, bodiceKeep, { iterations: 0, edgeIterations: 0, fillHoles: 400, dropIslands: 60, close: 3, smoothCut: 6 })
  // knit UVs: a cylinder round the torso, one tile = 5.6 cm (16 stitches)
  {
    const p = bodiceShell.geometry.attributes.position.array, uv = bodiceShell.geometry.attributes.uv.array
    for (let i = 0; i < p.length / 3; i++) { uv[i * 2] = Math.atan2(p[i * 3], -p[i * 3 + 2]) * 14 / 5.6; uv[i * 2 + 1] = p[i * 3 + 1] / 5.6 }
  }
  // and the skin round the hips, under the skirt's waistband
  const underWaist = cutShell(ch, (v, g) => { const y = g.P[v * 3 + 1]; return y < hipY + Math.max(2, waist - 2) && y > hipY - 7 && weightOf(v, ARM) < 0.2 }, { iterations: 0, edgeIterations: 0 })
  // the ring along the armholes is hidden too (that skin moves with the arm
  // and pokes through); round the neck the edge skin stays (it shows past the hem)
  const fullIdx = ch.parts.body.index0 || body.index.array
  const armRing = under.coveredAll.filter(t => { const y = (P[fullIdx[t] * 3 + 1] + P[fullIdx[t + 1] * 3 + 1] + P[fullIdx[t + 2] * 3 + 1]) / 3; return y < neckY - 5 })
  const HIDE_KEY = 'bodice#' + (++serial)
  hideBody(ch, HIDE_KEY, withBodice ? [...(roundNeck ? under.coveredAll : [...under.covered, ...armRing]), ...underWaist.covered] : underWaist.covered)

  const tex = knitTextures()
  const base = new THREE.MeshPhysicalMaterial({
    color, normalMap: tex.normal, normalScale: new THREE.Vector2(0.12, 0.12),
    roughness: 0.82, sheen: 0.4, sheenRoughness: 0.5, sheenColor: new THREE.Color(0xc0503c), side: THREE.DoubleSide,
  })
  const withRepeat = (r) => {
    // plain: no colour pattern, the weave only as a faint, finer normal
    const m = base.clone()
    m.map = null; m.normalMap = tex.normal.clone()
    m.normalMap.repeat.set(r * 3, r * 3); m.normalMap.needsUpdate = true
    return m
  }
  const bodiceMat = withRepeat(1)
  // the fabric wins ties with the skin it lies on (sub-millimetre pokes at grazing angles)
  bodiceMat.polygonOffset = true; bodiceMat.polygonOffsetFactor = -1; bodiceMat.polygonOffsetUnits = -2
  const bodice = skinned(ch, bodiceShell.geometry, bodiceMat)
  // (no hem along the lower edge: it is under the skirt's waistband)
  const hem = skinned(ch, piping(bodiceShell.loops.filter(l => l.reduce((s, e) => s + e.p.y, 0) / l.length > hipY + 8), 0.32), bodiceMat)

  // ── Skirt: a tube from a ring round the hips ──
  // the waistband starts above the bodice's lower edge, so the join is
  // always under the skirt (no torn seam where the two meet)
  const TOP = waist   // high-waisted (12) under a separate top
  const L = (length === 'gown' ? hipY - 3 : hipY - 32) + TOP
  const C = 64, R = length === 'gown' ? 36 : 28
  const seg = L / (R - 1)
  const ctr = new THREE.Vector3()
  {
    let c = 0
    for (let v = 0; v < NV; v++) if (Math.abs(P[v * 3 + 1] - hipY) < 1.2 && weightOf(v, ARM) < 0.2) { ctr.x += P[v * 3]; ctr.z += P[v * 3 + 2]; c++ }
    ctr.multiplyScalar(1 / c); ctr.y = hipY
  }
  // the body's cross-section (radius per column) at a height
  function ringAt(y0, pad) {
    const rr = new Float32Array(C)
    for (let v = 0; v < NV; v++) {
      if (Math.abs(P[v * 3 + 1] - y0) > 1.5) continue
      if (weightOf(v, ARM) > 0.2) continue
      const dx = P[v * 3] - ctr.x, dz = P[v * 3 + 2] - ctr.z
      const b = Math.floor(((Math.atan2(dz, dx) + Math.PI) / (2 * Math.PI)) * C) % C
      rr[b] = Math.max(rr[b], Math.hypot(dx, dz))
    }
    for (let it = 0; it < 4; it++) for (let b = 0; b < C; b++) if (!rr[b]) rr[b] = Math.max(rr[(b + C - 1) % C], rr[(b + 1) % C])
    const rs = rr.slice(); for (let b = 0; b < C; b++) rr[b] = (rs[(b + C - 1) % C] + 2 * rs[b] + rs[(b + 1) % C]) / 4 + pad
    return rr
  }
  const gown = length === 'gown'
  // (the gown's waistband hugs the waist a little tighter)
  const ringR = ringAt(hipY, 0.9)
  const ringOf = new Map()   // rows above the hips: follow the waist, over the bodice
  const NPt = C * R
  const id = (r, c) => r * C + ((c + C) % C)
  // rest (standing) shape: a gentle A-line
  const rest = new Float32Array(NPt * 3)
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
    const a = (c + 0.5) / C * 2 * Math.PI - Math.PI
    const y = hipY + TOP - r * seg
    const t = Math.max(0, (hipY - y) / (L - TOP)), flare = 1 + (gown ? 0.55 : 0.3) * t * t + 0.12 * t
    let rad = ringR[c] * flare
    if (y > hipY) { if (!ringOf.has(r)) ringOf.set(r, ringAt(y, gown ? 0.8 : 1.5)); rad = Math.max(ringOf.get(r)[c], 0) * (1 - (hipY - y) / -TOP * 0) ; rad = THREE.MathUtils.lerp(ringR[c], ringOf.get(r)[c], (y - hipY) / TOP) }
    const i = id(r, c) * 3
    rest[i] = ctr.x + Math.cos(a) * rad; rest[i + 1] = y; rest[i + 2] = ctr.z + Math.sin(a) * rad
  }
  // side slits: the tube is open between the columns at her left and right
  // (x extremes: angle 0 and ±π) from slitRow down to the hem
  const slitRow = slits ? Math.max(2, Math.round((hipY + TOP - (J['lowerleg01.L____head'].y - 3)) / seg)) : R
  const SEAMS = [C / 2, C]   // a seam b lies between columns b − 1 and b
  const cut = (r, c, k) => r >= slitRow && SEAMS.some(b => c < b && c + k >= b)
  // skin weights: the nearest leg / hip skin, and for the panel between the
  // legs a blend of both legs (so seated it spans the lap, knee to knee)
  const LEGV = []
  for (let v = 0; v < NV; v += 1) if (P[v * 3 + 1] < hipY + 8 && weightOf(v, ARM) < 0.05) LEGV.push(v)
  // (the waistband rides on the pelvis, not on the thighs)
  const HIPV = LEGV.filter(v => weightOf(v, /^upperleg/) < 0.15)
  // above the hips: the same skin as the bodice under it
  const WAISTV = []
  for (let v = 0; v < NV; v++) if (P[v * 3 + 1] > hipY - 1 && P[v * 3 + 1] < hipY + TOP + 3 && weightOf(v, ARM) < 0.05) WAISTV.push(v)
  const nearestIn = (list, x, y, z) => { let best = -1, bd = 1e9; for (const v of list) { const d = (P[v * 3] - x) ** 2 + (P[v * 3 + 1] - y) ** 2 + (P[v * 3 + 2] - z) ** 2; if (d < bd) { bd = d; best = v } } return best }
  const weights = []
  for (let i = 0; i < NPt; i++) {
    const x = rest[i * 3], y = rest[i * 3 + 1], z = rest[i * 3 + 2]
    const acc = new Map()
    const add = (v, f) => { for (let k = 0; k < 4; k++) if (SW[v * 4 + k] > 0) acc.set(SI[v * 4 + k], (acc.get(SI[v * 4 + k]) || 0) + SW[v * 4 + k] * f) }
    const s = Math.max(0.5 * (1 - THREE.MathUtils.smoothstep(Math.abs(x), 0, 9)), 0.5 * (1 - THREE.MathUtils.smoothstep(y, hipY - 16, hipY - 4)))
    // across the hip crease the pelvis hands over to the thighs gradually
    // (a sharp switch folds the cloth over itself there when she sits)
    const tl = y > hipY ? 0 : 1 - THREE.MathUtils.smoothstep(y, hipY - 18, hipY - 1)
    const on = (x, f) => {
      if (y > hipY) { add(nearestIn(WAISTV, x, y, z), f); return }
      if (tl < 0.99) add(nearestIn(HIPV, x, y, z), f * (1 - tl))
      if (tl > 0.01) add(nearestIn(LEGV, x, y, z), f * tl)
    }
    on(x, 1 - s)
    if (s > 0.01) on(-x, s)
    weights.push(acc)
  }
  // soften along the grid
  for (let it = 0; it < 6; it++) {
    const next = []
    for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
      const acc = new Map()
      const nbs = [[r, c, 2], [r, c - 1, 1], [r, c + 1, 1], [r - 1, c, 1], [r + 1, c, 1]]
      let tw = 0
      for (const [rr, cc, w] of nbs) { if (rr < 0 || rr >= R) continue; tw += w; for (const [b, x] of weights[id(rr, cc)]) acc.set(b, (acc.get(b) || 0) + x * w) }
      for (const [b, x] of acc) acc.set(b, x / tw)
      next.push(acc)
    }
    weights.splice(0, NPt, ...next)
  }
  const skI = new Uint16Array(NPt * 4), skW = new Float32Array(NPt * 4)
  weights.forEach((acc, i) => {
    const top = [...acc.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4)
    const sum = top.reduce((s, e) => s + e[1], 0) || 1
    top.forEach(([b, w], k) => { skI[i * 4 + k] = b; skW[i * 4 + k] = w / sum })
  })
  // geometry: one extra column closes the tube
  const vid = (r, c) => (c === C ? NPt + r : r * C + c)
  const NVt = NPt + R
  const ext = (arr, n) => { const o = new arr.constructor(NVt * n); o.set(arr.subarray(0, NPt * n)); for (let r = 0; r < R; r++) for (let k = 0; k < n; k++) o[(NPt + r) * n + k] = arr[r * C * n + k]; return o }
  const sg = new THREE.BufferGeometry()
  {
    const uvA = new Float32Array(NVt * 2), idx = []
    const circ = 2 * Math.PI * 22
    for (let r = 0; r < R; r++) for (let c = 0; c <= C; c++) { const v = vid(r, c); uvA[v * 2] = c / C * circ / 5.6; uvA[v * 2 + 1] = r * seg / 5.6 }
    for (let r = 0; r + 1 < R; r++) for (let c = 0; c < C; c++) { if (cut(r, c, 1)) continue; const a = vid(r, c), b = vid(r, c + 1), d = vid(r + 1, c), e = vid(r + 1, c + 1); idx.push(a, d, b, b, d, e) }
    sg.setAttribute('uv', new THREE.BufferAttribute(uvA, 2))
    sg.setIndex(idx)
  }
  sg.setAttribute('position', new THREE.BufferAttribute(ext(rest, 3), 3))
  sg.setAttribute('skinIndex', new THREE.BufferAttribute(ext(skI, 4), 4))
  sg.setAttribute('skinWeight', new THREE.BufferAttribute(ext(skW, 4), 4))
  sg.computeVertexNormals()
  const skirtMat = withRepeat(1)
  const fitted = skinned(ch, sg, skirtMat)

  // the same skirt as cloth
  const cg = new THREE.BufferGeometry()
  const cPos = new THREE.BufferAttribute(new Float32Array(NVt * 3), 3)
  cPos.setUsage(THREE.DynamicDrawUsage)
  cg.setAttribute('position', cPos); cg.setAttribute('uv', sg.attributes.uv); cg.setIndex(sg.index)
  cg.userData.topologyFrom = sg.attributes.position.array   // for the smooth option (cPos starts at zero)
  const cloth = new THREE.Mesh(cg, skirtMat)
  cloth.castShadow = cloth.receiveShadow = true
  cloth.frustumCulled = false

  // CPU skinning of the fitted shape (the cloth's anchor and soft target)
  const target = new Float32Array(NPt * 3)
  const _m = new THREE.Matrix4(), _p = new THREE.Vector3(), _q = new THREE.Vector3()
  function skinTarget(rows = R) {
    ch.skeleton.update()
    const BM = ch.skeleton.boneMatrices
    for (let i = 0; i < rows * C; i++) {
      _p.fromArray(rest, i * 3); let x = 0, y = 0, z = 0
      for (let k = 0; k < 4; k++) {
        const w = skW[i * 4 + k]; if (!w) continue
        _m.fromArray(BM, skI[i * 4 + k] * 16); _q.copy(_p).applyMatrix4(_m)
        x += _q.x * w; y += _q.y * w; z += _q.z * w
      }
      target[i * 3] = x; target[i * 3 + 1] = y; target[i * 3 + 2] = z
    }
  }

  const X = new Float32Array(NPt * 3), Xp = new Float32Array(NPt * 3)
  const cons = []
  {
    const d = (a, b) => Math.hypot(rest[a * 3] - rest[b * 3], rest[a * 3 + 1] - rest[b * 3 + 1], rest[a * 3 + 2] - rest[b * 3 + 2])
    const add = (a, b, k) => cons.push([a, b, d(a, b), k])
    for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
      if (!cut(r, c, 1)) add(id(r, c), id(r, c + 1), 1)
      if (r + 1 < R) { add(id(r, c), id(r + 1, c), 1); if (!cut(r, c, 1)) { add(id(r, c), id(r + 1, c + 1), 0.5); add(id(r, c + 1), id(r + 1, c), 0.5) } }
      if (r + 2 < R) add(id(r, c), id(r + 2, c), 0.15)
      if (!cut(r, c, 2)) add(id(r, c), id(r, c + 2), 0.15)
    }
  }
  const CI = new Int32Array(cons.length * 2), CL = new Float32Array(cons.length), CK = new Float32Array(cons.length)
  // compression (bunching) resists only weakly, and not at all over the hip
  // crease: seated, the front of the hip shortens and the cloth would buckle
  const CKc = new Float32Array(cons.length)
  cons.forEach(([a, b, l, k], i) => { CI[i * 2] = a; CI[i * 2 + 1] = b; CL[i] = l; CK[i] = k
    CKc[i] = k * 0.25 * (1 - THREE.MathUtils.smoothstep(Math.max(rest[a * 3 + 1], rest[b * 3 + 1]), hipY - 18, hipY - 4)) })
  // pull toward the fitted shape: firm near the waist, free at the hem
  const kneeRow = Math.round((hipY - J['lowerleg01.L____head'].y) / seg)
  // (and held close over the hip crease, where loose cloth crumples into folds)
  const PULL = new Float32Array(R).map((_, r) => Math.max(0.35 * Math.max(0, 1 - r / (kneeRow + 5)) ** 1.5 + 0.004,
    0.85 * THREE.MathUtils.smoothstep(hipY + TOP - r * seg, hipY - 20, hipY - 10)))
  const PIN = 2

  // collision surface: the skin of the hips and legs, carried by bones
  const SURF = /^(root|pelvis|upperleg|lowerleg|spine0[345]|foot)/
  const surf = { bone: [], p: [], n: [] }
  {
    const inv = new Map()
    for (let v = 0; v < NV; v += 2) {
      if (P[v * 3 + 1] > hipY + 6) continue
      let bi = SI[v * 4], bw = SW[v * 4]
      for (let k = 1; k < 4; k++) if (SW[v * 4 + k] > bw) { bw = SW[v * 4 + k]; bi = SI[v * 4 + k] }
      if (!SURF.test(boneName(bi))) continue
      if (!inv.has(bi)) inv.set(bi, ch.restWorld[bi].clone().invert())
      surf.bone.push(ch.bones[bi])
      surf.p.push(new THREE.Vector3(P[v * 3], P[v * 3 + 1], P[v * 3 + 2]).applyMatrix4(inv.get(bi)))
      surf.n.push(new THREE.Vector3(Nn[v * 3], Nn[v * 3 + 1], Nn[v * 3 + 2]).transformDirection(inv.get(bi)))
    }
  }
  const NS = surf.p.length, SWp = new Float32Array(NS * 3), SNn = new Float32Array(NS * 3)
  const CELL = 3, grid = new Map()
  const _t = new THREE.Vector3()
  const gkey = (x, y, z) => ((x + 512) * 1024 + (y + 512)) * 1024 + (z + 512)
  function updateSurface() {
    grid.clear()
    for (let i = 0; i < NS; i++) {
      const m = surf.bone[i].matrixWorld
      _t.copy(surf.p[i]).applyMatrix4(m); _t.toArray(SWp, i * 3)
      _t.copy(surf.n[i]).transformDirection(m); _t.toArray(SNn, i * 3)
      const k = gkey(Math.floor(SWp[i * 3] / CELL), Math.floor(SWp[i * 3 + 1] / CELL), Math.floor(SWp[i * 3 + 2] / CELL))
      let l = grid.get(k); if (!l) grid.set(k, l = []); l.push(i)
    }
  }
  const THICK = 1.0
  function collide(j) {
    const x = X[j], y = X[j + 1], z = X[j + 2]
    const cx = Math.floor(x / CELL), cy = Math.floor(y / CELL), cz = Math.floor(z / CELL)
    let best = -1, bd = 16
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) {
      const l = grid.get(gkey(cx + dx, cy + dy, cz + dz))
      if (!l) continue
      for (const i of l) { const ex = x - SWp[i * 3], ey = y - SWp[i * 3 + 1], ez = z - SWp[i * 3 + 2], d2 = ex * ex + ey * ey + ez * ez; if (d2 < bd) { bd = d2; best = i } }
    }
    if (best >= 0) {
      const i = best
      const d = (x - SWp[i * 3]) * SNn[i * 3] + (y - SWp[i * 3 + 1]) * SNn[i * 3 + 1] + (z - SWp[i * 3 + 2]) * SNn[i * 3 + 2]
      if (d < THICK && d > -8) {
        const k = THICK - d
        X[j] += SNn[i * 3] * k; X[j + 1] += SNn[i * 3 + 1] * k; X[j + 2] += SNn[i * 3 + 2] * k
        Xp[j] += (X[j] - Xp[j]) * 0.6; Xp[j + 2] += (X[j + 2] - Xp[j + 2]) * 0.6
      }
    }
    if (bench) {
      const bz = bench.position.z, sy = seatY + (bench.userData.lift || 0)   // bench height set by the page
      if (Math.abs(X[j]) < 37 && Math.abs(X[j + 2] - bz) < 17 && X[j + 1] < sy + THICK && X[j + 1] > sy - 8) {
        X[j + 1] = sy + THICK
        Xp[j] += (X[j] - Xp[j]) * 0.7; Xp[j + 2] += (X[j + 2] - Xp[j + 2]) * 0.7
      }
    }
    if (X[j + 1] < 0.5) X[j + 1] = 0.5
  }
  const GRAV = -980
  let started = false
  function start() { skinTarget(); X.set(target); Xp.set(target); started = true }
  function step(dt) {
    skinTarget()
    updateSurface()
    const sub = 2, h = dt / sub
    for (let s = 0; s < sub; s++) {
      for (let i = 0; i < PIN * C; i++) { const j = i * 3; X[j] = Xp[j] = target[j]; X[j + 1] = Xp[j + 1] = target[j + 1]; X[j + 2] = Xp[j + 2] = target[j + 2] }
      for (let i = PIN * C; i < NPt; i++) {
        const j = i * 3, x = X[j], y = X[j + 1], z = X[j + 2]
        X[j] += (x - Xp[j]) * 0.98; X[j + 1] += (y - Xp[j + 1]) * 0.98 + GRAV * h * h; X[j + 2] += (z - Xp[j + 2]) * 0.98
        Xp[j] = x; Xp[j + 1] = y; Xp[j + 2] = z
        const k = PULL[(i / C) | 0]
        X[j] += (target[j] - X[j]) * k; X[j + 1] += (target[j + 1] - X[j + 1]) * k; X[j + 2] += (target[j + 2] - X[j + 2]) * k
      }
      for (let it = 0; it < 6; it++) {
        for (let q = 0; q < CL.length; q++) {
          const a = CI[q * 2], b = CI[q * 2 + 1], ja = a * 3, jb = b * 3
          const dx = X[jb] - X[ja], dy = X[jb + 1] - X[ja + 1], dz = X[jb + 2] - X[ja + 2]
          const d = Math.hypot(dx, dy, dz) || 1e-6
          // stretch resists strongly, compression (bunching) only weakly
          const e = (d - CL[q]) / d * (d > CL[q] ? CK[q] : CKc[q])
          const wa = a < PIN * C ? 0 : 1, wb = b < PIN * C ? 0 : 1, ws = wa + wb
          if (!ws) continue
          const ka = e * wa / ws, kb = e * wb / ws
          X[ja] += dx * ka; X[ja + 1] += dy * ka; X[ja + 2] += dz * ka
          X[jb] -= dx * kb; X[jb + 1] -= dy * kb; X[jb + 2] -= dz * kb
        }
        for (let i = PIN * C; i < NPt; i++) collide(i * 3)
      }
    }
  }
  // fitted: no dynamics — the skinned shape, pushed out of the skin and off
  // the bench, then relaxed along the cloth's edges (no stretch, no kinks)
  function fit() {
    skinTarget()
    updateSurface()
    X.set(target); Xp.set(target)
    for (let it = 0; it < 4; it++) {
      for (let q = 0; q < CL.length; q++) {
        if (CK[q] < 1) continue
        const a = CI[q * 2], b = CI[q * 2 + 1], ja = a * 3, jb = b * 3
        const dx = X[jb] - X[ja], dy = X[jb + 1] - X[ja + 1], dz = X[jb + 2] - X[ja + 2]
        const d = Math.hypot(dx, dy, dz) || 1e-6
        if (d < CL[q]) continue
        const e = (d - CL[q]) / d * 0.5
        const wa = a < PIN * C ? 0 : 1, wb = b < PIN * C ? 0 : 1, ws = wa + wb
        if (!ws) continue
        X[ja] += dx * e * wa / ws * 2; X[ja + 1] += dy * e * wa / ws * 2; X[ja + 2] += dz * e * wa / ws * 2
        X[jb] -= dx * e * wb / ws * 2; X[jb + 1] -= dy * e * wb / ws * 2; X[jb + 2] -= dz * e * wb / ws * 2
      }
      for (let i = PIN * C; i < NPt; i++) collide(i * 3)
    }
  }
  function upload() {
    const a = cPos.array
    a.set(X)
    for (let r = 0; r < R; r++) for (let k = 0; k < 3; k++) a[(NPt + r) * 3 + k] = X[r * C * 3 + k]
    cPos.needsUpdate = true
    cg.computeVertexNormals()
    const nA = cg.attributes.normal.array
    for (let r = 0; r < Math.min(R, slitRow); r++) { const i = r * C, j = NPt + r; for (let k = 0; k < 3; k++) { const m = (nA[i * 3 + k] + nA[j * 3 + k]) / 2; nA[i * 3 + k] = nA[j * 3 + k] = m } }
  }

  const object = new THREE.Group()
  object.name = 'dress'
  object.add(cloth)
  const api = {
    simulate: true, mode: skirtMode, object, bodice, hem, fitted, cloth, X,
    setColor(c) { for (const m of [bodiceMat, skirtMat]) { m.color.set(c); m.sheenColor.set(c).lerp(new THREE.Color(0xffd8c8), 0.25) } },
    setFabric(kind) {
      applyFabric([bodiceMat, skirtMat].map(material => ({ material, scale: 0.5 })), kind === 'knit' ? 'made' : kind)
      // the diamond knit (the reference's texture)
      for (const m of [bodiceMat, skirtMat]) {
        m.map?.dispose(); m.map = null
        if (kind === 'knit') {
          m.map = tex.color.clone(); m.map.needsUpdate = true
          m.normalMap = tex.normal.clone(); m.normalMap.needsUpdate = true; m.normalScale.set(0.8, 0.8)
        }
        m.needsUpdate = true
      }
    },
    setMode(m) { api.mode = m; if (m === 'cloth') started = false },
    settle(seconds = 3) { if (api.mode !== 'cloth') return; start(); for (let i = 0; i < seconds * 60; i++) step(1 / 60); upload() },
    update(dt) {
      const vis = object.visible
      bodice.visible = hem.visible = vis && withBodice
      fitted.visible = false
      cloth.visible = vis
      if (!vis) return
      if (api.mode === 'fitted') { fit(); upload(); return }
      if (!started) { start(); for (let i = 0; i < 120; i++) step(1 / 60) }
      if (api.simulate) step(Math.min(dt, 1 / 30))
      upload()
    },
    dispose() {
      hideBody(ch, HIDE_KEY, null)
      for (const m of [bodice, hem, fitted]) { m.removeFromParent(); m.geometry.dispose() }
      object.removeFromParent(); cg.dispose()
      for (const m of [bodiceMat, skirtMat]) { m.map?.dispose(); m.normalMap?.dispose(); m.dispose() }
    },
  }
  api.setColor(color)
  return api
}
