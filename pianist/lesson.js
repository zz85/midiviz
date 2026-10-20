// Lesson view for #032 (the hands half of a stacked Short): #030's falling
// notes on the bare keyboard, seen from above her head. Notes in the right /
// left hand's colour (from the fingering) slide down a lane behind the keys
// onto the hit line, with the finger number in a disc at the leading end; the
// keys they press light up in the hand's colour, with a halo and sparks.
//
// Everything is a function of song time (the sparks too: hashed, not random),
// so a seek or the offline export draws the same picture. It is drawn only in
// its own viewport: begin() hides the piano's case and shows the lane, end()
// puts both back, so the other half keeps the concert picture.
import * as THREE from 'three'

const LANE_LEN = 150, LOOKAHEAD = 2.6   // cm of lane, seconds it shows
const GLYPHS = ['L', 'R', '1', '2', '3', '4', '5']
const BLACK = new Set([1, 3, 6, 8, 10])
const hash = (k, s = 0) => { const x = Math.sin(k * 127.1 + s * 311.7 + 0.5) * 43758.5453; return x - Math.floor(x) }
// the cameras, as #030's lesson views; the page moves each back along its line
// until the whole keyboard fits the half's width. tilt: the lane's rise behind
// the keys (degrees; 0 = flat on the piano).
//   top:   high over the front of the keys, a little ahead of her head (so it
//          never hides the keys), the lane flat
//   first: as she sees the keys, the lane standing up behind them (#030's First
//          Person, tilt 62°) so the notes fall onto the keys like a wall of
//          light. From just in front of her face (her head is behind the lens,
//          her forearms come in from below), so this one keeps its place and
//          widens its lens instead (fit: 'fov')
export const LESSON_VIEWS = {
  first: { pos: [0, 182, 6], target: [0, 104, -58], fov: 50, tilt: 62, fit: 'fov' },
  top: { pos: [0, 190, 12], target: [0, 74, -50], fov: 42, tilt: 0 },
}
export const LESSON_VIEW = LESSON_VIEWS.top

/**
 * piano: buildGrandPiano() (keyX, keys, root); DIM: its dimensions; LOW..HIGH: the keyboard.
 * colors: { R, L } css colours.
 */
export function createLessonView({ piano, DIM, LOW, HIGH, colors = { R: '#ffc93c', L: '#2f8bff' } }) {
  const HIT_Z = DIM.KEY_BACK - 0.6, HIT_Y = DIM.KEY_TOP + DIM.BLACK_RISE + 0.35
  const group = new THREE.Group()
  group.visible = false
  const handColor = { R: new THREE.Color(colors.R), L: new THREE.Color(colors.L) }

  // glyph atlas: L R 1 2 3 4 5
  const atlas = (() => {
    const c = document.createElement('canvas'); c.width = 64 * GLYPHS.length; c.height = 64
    const g = c.getContext('2d')
    g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '700 44px -apple-system, Arial, sans-serif'
    GLYPHS.forEach((ch, i) => g.fillText(ch, i * 64 + 32, 35))
    const t = new THREE.CanvasTexture(c); t.anisotropy = 4
    return t
  })()
  const MAX_NOTES = 1600
  const noteGeo = new THREE.InstancedBufferGeometry()
  {
    const base = new THREE.PlaneGeometry(1, 1)
    noteGeo.index = base.index
    noteGeo.setAttribute('position', base.attributes.position)
    noteGeo.setAttribute('uv', base.attributes.uv)
  }
  const aRect = new THREE.InstancedBufferAttribute(new Float32Array(MAX_NOTES * 4), 4)
  const aCol = new THREE.InstancedBufferAttribute(new Float32Array(MAX_NOTES * 3), 3)
  const aInfo = new THREE.InstancedBufferAttribute(new Float32Array(MAX_NOTES * 2), 2)
  for (const a of [aRect, aCol, aInfo]) a.setUsage(THREE.DynamicDrawUsage)
  noteGeo.setAttribute('aRect', aRect); noteGeo.setAttribute('aCol', aCol); noteGeo.setAttribute('aInfo', aInfo)
  noteGeo.instanceCount = 0
  const noteMat = new THREE.ShaderMaterial({
    uniforms: {
      uHit: { value: new THREE.Vector3(0, HIT_Y, HIT_Z) }, uAlong: { value: new THREE.Vector3(0, 0, -1) },
      uLane: { value: LANE_LEN }, uAtlas: { value: atlas }, uGlyphs: { value: GLYPHS.length }, uLabels: { value: 1 },
    },
    vertexShader: /* glsl */`
      attribute vec4 aRect; attribute vec3 aCol; attribute vec2 aInfo;
      uniform vec3 uHit, uAlong;
      varying vec2 vLocal; varying vec2 vSize; varying vec3 vCol; varying vec2 vInfo; varying float vAlong;
      void main() {
        float u = position.x, v = position.y + 0.5;
        float along = mix(aRect.z, aRect.w, v);
        vec3 p = uHit + vec3(aRect.x + u * aRect.y, 0.0, 0.0) + uAlong * along;
        vLocal = vec2(u * aRect.y, along - aRect.z);
        vSize = vec2(aRect.y, aRect.w - aRect.z);
        vCol = aCol; vInfo = aInfo; vAlong = along;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: /* glsl */`
      uniform sampler2D uAtlas; uniform float uGlyphs, uLane, uLabels;
      varying vec2 vLocal; varying vec2 vSize; varying vec3 vCol; varying vec2 vInfo; varying float vAlong;
      float rbox(vec2 p, vec2 b, float r) { vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
      void main() {
        vec2 c = vec2(0.0, vSize.y * 0.5);
        float r = min(0.55, vSize.x * 0.45);
        float d = rbox(vLocal - c, vSize * 0.5, r);
        float aa = fwidth(d) + 1e-4;
        float a = 1.0 - smoothstep(-aa, aa, d);
        if (a <= 0.0) discard;
        float edge = smoothstep(-0.35, 0.0, d);
        float isOn = vInfo.y;
        vec3 col = vCol * (0.85 + 0.35 * (1.0 - vLocal.y / max(vSize.y, 1.0))) * (1.0 + isOn * 1.6);
        col += vCol * edge * 0.9 + vec3(1.0) * edge * 0.15;
        if (uLabels > 0.5 && vInfo.x >= 0.0 && vSize.y > vSize.x * 1.05) {
          vec2 lc = vec2(0.0, vSize.x * 0.5);
          float rr = vSize.x * 0.36;
          float dd = length(vLocal - lc) - rr;
          float disc = 1.0 - smoothstep(-aa, aa, dd);
          vec2 g = (vLocal - lc) / (rr * 2.0) + 0.5;
          float glyph = texture2D(uAtlas, vec2((vInfo.x + g.x) / uGlyphs, 1.0 - g.y)).a * disc;
          col = mix(col, vec3(0.06), disc * 0.85);
          col = mix(col, vec3(1.0), glyph);
        }
        float fade = 1.0 - smoothstep(uLane * 0.8, uLane, vAlong);
        gl_FragColor = vec4(col, a * fade);
      }`,
    transparent: true, depthWrite: false, depthTest: false, side: THREE.DoubleSide,
  })
  const notesMesh = new THREE.Mesh(noteGeo, noteMat)
  notesMesh.frustumCulled = false
  notesMesh.renderOrder = 5
  group.add(notesMesh)
  // the lane's bed and lines turn about the hit line with the tilt (the notes
  // follow through uAlong)
  const pivot = new THREE.Group()
  pivot.position.set(0, HIT_Y, HIT_Z)
  group.add(pivot)
  // a dark bed under the lane, and faint octave lines on it
  const bed = new THREE.Mesh(new THREE.PlaneGeometry(132, LANE_LEN), new THREE.MeshBasicMaterial({ color: 0x050505, transparent: true, opacity: 0.88, depthWrite: false, side: THREE.DoubleSide }))
  bed.rotation.x = -Math.PI / 2; bed.position.set(0, -0.4, -LANE_LEN / 2 - 0.2); bed.renderOrder = 4
  pivot.add(bed)
  {
    const pts = []
    for (let m = 24; m <= 108; m += 12) { const x = piano.keyX(m) - 1.175; pts.push(x, 0, 0, x, 0, -LANE_LEN * 0.8) }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3))
    const l = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0x5a5a5a, transparent: true, opacity: 0.35, depthTest: false }))
    l.position.set(0, -0.05, 0); l.renderOrder = 4
    pivot.add(l)
  }
  // the hit line: a thin glowing bar where notes land
  const hitBar = new THREE.Mesh(new THREE.PlaneGeometry(126, 0.35), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, depthTest: false, blending: THREE.AdditiveBlending }))
  hitBar.rotation.x = -Math.PI / 2; hitBar.position.set(0, HIT_Y, HIT_Z); hitBar.renderOrder = 6
  group.add(hitBar)
  // a halo at the hit line over each sounding key
  const haloTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 128
    const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64)
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,0.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)')
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128)
    return new THREE.CanvasTexture(c)
  })()
  const halos = new Map()
  for (let m = LOW; m <= HIGH; m++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex, color: 0xffffff, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, depthTest: false, opacity: 0 }))
    s.position.set(piano.keyX(m), HIT_Y + 0.6, HIT_Z + 0.6)
    s.scale.setScalar(9); s.renderOrder = 6; s.visible = false
    group.add(s); halos.set(m, s)
  }
  // sparks from where notes land: each note's sparks are a function of the
  // time since its onset (hashed by the note), so any frame can be drawn alone
  const SPARK_N = 8, SPARK_LIFE = 0.9, MAX_SPARKS = 1200
  const sPos = new Float32Array(MAX_SPARKS * 3), sCol = new Float32Array(MAX_SPARKS * 3), sLife = new Float32Array(MAX_SPARKS)
  const sGeo = new THREE.BufferGeometry()
  sGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3).setUsage(THREE.DynamicDrawUsage))
  sGeo.setAttribute('color', new THREE.BufferAttribute(sCol, 3).setUsage(THREE.DynamicDrawUsage))
  sGeo.setAttribute('life', new THREE.BufferAttribute(sLife, 1).setUsage(THREE.DynamicDrawUsage))
  const sMat = new THREE.ShaderMaterial({
    uniforms: { uScale: { value: 600 } },
    vertexShader: `attribute vec3 color; attribute float life; uniform float uScale; varying vec3 vC; varying float vL;
      void main() { vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv;
        gl_PointSize = life > 0.0 ? clamp(uScale * 0.9 * life / -mv.z, 1.0, 9.0) : 0.0; vC = color; vL = life; }`,
    fragmentShader: `varying vec3 vC; varying float vL;
      void main() { float d = length(gl_PointCoord - 0.5); if (d > 0.5 || vL <= 0.0) discard;
        gl_FragColor = vec4(vC * (2.0 + 2.0 * vL), (1.0 - d * 2.0) * min(1.0, vL * 1.5)); }`,
    transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
  })
  const sparks = new THREE.Points(sGeo, sMat)
  sparks.frustumCulled = false; sparks.renderOrder = 7
  group.add(sparks)

  const _c = new THREE.Color(), hidden = [], glowSaved = []
  let notes = [], hands = null
  const colorOf = i => handColor[hands?.[i]?.[0]] || handColor[notes[i].midi < 60 ? 'L' : 'R']
  const api = {
    group,
    /** the song's notes (sorted by time) and the fingering's [hand, finger] per note */
    setNotes(ns, hf) { notes = ns || []; hands = hf || null },
    setColors({ R, L }) { if (R) handColor.R.set(R); if (L) handColor.L.set(L) },
    /** the lane's rise behind the keys, degrees (0 flat, #030's First Person 62) */
    setTilt(deg) {
      const a = deg * Math.PI / 180
      noteMat.uniforms.uAlong.value.set(0, Math.sin(a), -Math.cos(a))
      pivot.rotation.x = a
    },
    /** lay out the lane for song time t; viewportH: the half's height in pixels (spark size) */
    update(t, viewportH = 600) {
      sMat.uniforms.uScale.value = viewportH
      const speed = LANE_LEN / LOOKAHEAD
      let lo = 0, hi = notes.length
      const tMin = t - 8
      while (lo < hi) { const m = (lo + hi) >> 1; notes[m].time < tMin ? lo = m + 1 : hi = m }
      let n = 0, ns = 0
      const on = new Map()
      for (let i = lo; i < notes.length; i++) {
        const nt = notes[i]
        if (nt.time > t + LOOKAHEAD) break
        const end = nt.time + Math.max(nt.duration, 0.06), c = colorOf(i)
        if (nt.time <= t && end > t) on.set(nt.midi, c)
        // sparks for SPARK_LIFE after the onset
        const age = t - nt.time
        if (age >= 0 && age < SPARK_LIFE) {
          const k = Math.max(3, Math.round(SPARK_N * (0.4 + (nt.velocity ?? 0.7))))
          for (let j = 0; j < k && ns < MAX_SPARKS; j++, ns++) {
            const h = i * 13 + j, life = (0.6 + 0.5 * hash(h, 1)) - age * 1.1
            if (life <= 0) { ns--; continue }
            // v·(1 − e^(−1.6 a))/1.6 with gravity, as #030's integration settles to
            const vx = (hash(h, 2) - 0.5) * 9, vy = 6 + hash(h, 3) * 22 * (0.5 + (nt.velocity ?? 0.7)), vz = -4 - hash(h, 4) * 18
            const k1 = (1 - Math.exp(-1.6 * age)) / 1.6, gy = -18 * (age / 1.6 - k1 / 1.6)
            sPos.set([piano.keyX(nt.midi) + (hash(h, 5) - 0.5) * 1.6 + vx * k1, HIT_Y + 0.4 + vy * k1 + gy, HIT_Z - hash(h, 6) * 1.5 + vz * k1], ns * 3)
            sCol.set([c.r, c.g, c.b], ns * 3); sLife[ns] = life
          }
        }
        if (end < t || n >= MAX_NOTES) continue
        const d0 = Math.max(0, (nt.time - t) * speed), d1 = Math.min(LANE_LEN, (end - t) * speed)
        if (d1 <= d0 + 0.05) continue
        aRect.setXYZW(n, piano.keyX(nt.midi), BLACK.has(nt.midi % 12) ? 1.35 : 2.1, d0, d1)
        aCol.setXYZ(n, c.r, c.g, c.b)
        const f = hands?.[i]?.[1], glyph = f ? 1 + f : (hands?.[i]?.[0] === 'L' ? 0 : 1)
        aInfo.setXY(n, (nt.time - t) * speed < 0.5 ? -1 : glyph, nt.time <= t ? 1 : 0)
        n++
      }
      noteGeo.instanceCount = n
      aRect.needsUpdate = aCol.needsUpdate = aInfo.needsUpdate = true
      for (let j = ns; j < MAX_SPARKS; j++) sLife[j] = 0
      sGeo.setDrawRange(0, Math.max(1, ns))
      sGeo.attributes.position.needsUpdate = sGeo.attributes.life.needsUpdate = sGeo.attributes.color.needsUpdate = true
      for (const [m, s] of halos) {
        const c = on.get(m)
        if (c) s.material.color.copy(c)
        s.material.opacity = c ? 0.85 : 0
        s.visible = !!c
      }
      api.on = on
    },
    /** before drawing the lesson viewport: the bare keyboard, the lane, lit keys */
    begin() {
      hidden.length = 0
      for (const c of piano.root.children) if (!c.userData.kb && c !== piano.bench && c.visible) { c.visible = false; hidden.push(c) }
      group.visible = true
      glowSaved.length = 0
      for (const [m, c] of api.on || []) {
        const k = piano.keys.get(m); if (!k?.top?.emissive) continue
        glowSaved.push([k.top, k.top.emissive.getHex(), k.top.emissiveIntensity])
        k.top.emissive.copy(_c.copy(c)); k.top.emissiveIntensity = k.black ? 1.4 : 0.9
      }
    },
    end() {
      for (const c of hidden) c.visible = true
      hidden.length = 0
      group.visible = false
      for (const [m, hex, i] of glowSaved) { m.emissive.setHex(hex); m.emissiveIntensity = i }
      glowSaved.length = 0
    },
  }
  return api
}
