// Reusable visual stage presets for #030. A preset owns the visible environment
// and recommends a light rig; the user may override the rig independently.
// Everything is procedural so shared links and offline video exports are stable.

export const PROJECTION_STYLES = {
  auto: { label: 'Automatic by section', uniform: null },
  aurora: { label: 'Aurora and rings', uniform: 0 },
  constellation: { label: 'Constellations', uniform: 1 },
  score: { label: 'Flowing score', uniform: 2 },
  geometry: { label: 'Geometric pulse', uniform: 3 },
}

export const LIGHTING_PRESETS = {
  concert: {
    label: 'Classical gold',
    key: { color: 0xffd6a6, intensity: 6, position: [-150, 560, 230], target: [5, 70, -55] },
    back: { color: 0xffe2c0, intensity: 4, position: [120, 460, -560], target: [-10, 95, -80], sqrt: true },
    fill: { color: 0xfff0e0, intensity: 0.9, position: [40, 260, 320], target: [0, 74, -10] },
    lid: { color: 0xffc28a, intensity: 0.55 },
  },
  studio: {
    label: 'Soft studio',
    key: { color: 0xffe3ca, intensity: 4, position: [-180, 460, 300], target: [0, 82, -45] },
    back: { color: 0xdde8ff, intensity: 2, position: [180, 390, -470], target: [0, 100, -70], sqrt: true },
    fill: { color: 0xfff6ee, intensity: 2.2, position: [80, 250, 330], target: [0, 80, -20] },
    lid: { color: 0xffd2a8, intensity: 0.5 },
  },
  candle: {
    label: 'Candle glow',
    key: { color: 0xffbf78, intensity: 4.8, position: [-180, 430, 245], target: [0, 82, -45] },
    back: { color: 0xff8e48, intensity: 2.4, position: [130, 330, -430], target: [-5, 105, -60], sqrt: true },
    fill: { color: 0xffddb5, intensity: 1.15, position: [45, 220, 275], target: [0, 82, -5] },
    lid: { color: 0xff9b55, intensity: 0.72 },
  },
  blueHour: {
    label: 'Overcast blue hour',
    key: { color: 0xc8d7f2, intensity: 4.1, position: [-190, 470, 260], target: [0, 82, -48] },
    back: { color: 0x7f9dcc, intensity: 3.8, position: [170, 390, -510], target: [-5, 105, -75], sqrt: true },
    fill: { color: 0xdbe5f7, intensity: 1.15, position: [55, 245, 330], target: [0, 78, -5] },
    lid: { color: 0xd8b4aa, intensity: 0.48 },
  },
  projection: {
    label: 'Projection neutral',
    key: { color: 0xffe2ce, intensity: 4.5, position: [-175, 455, 255], target: [0, 84, -45] },
    back: { color: 0x8bbcff, intensity: 3.8, position: [150, 360, -470], target: [0, 110, -65], sqrt: true },
    fill: { color: 0xd8e5ff, intensity: 1.15, position: [55, 235, 310], target: [0, 78, -8] },
    lid: { color: 0xf1a8ff, intensity: 0.5 },
  },
}

/*
Future stage catalog (keep these notes beside the implemented presets):

1. Modern wood recital hall — strongest candidate for the channel's repeatable
   "home" venue. Curved ceiling ribs, vertical acoustic fins, a shallow audience
   rake, mustard/deep-blue seats and warm aisle lights. It works for almost every
   repertoire, makes wide shots meaningful, and naturally pairs with `recital`
   or `hall` acoustics. Build the shell from repeated instanced fins; keep an
   unobstructed keyboard-side camera corridor.

2. Projection cyclorama — the first pass is implemented below. Next iterations
   can add selectable ink, constellation, staff-line and harmonic-geometry looks.
   Keep composition changes on phrases/sections, not every note: constant fast
   reactions compete with the hands. The screen remains the principal background
   source while a separate neutral key protects skin and keys. Reference idea:
   Shards uses animation on a circular screen as illumination.

3. Rainy glass pavilion — intimate, cinematic and cheaper than a detailed hall.
   Tall panes, animated rain streaks, defocused garden/city practicals, a polished
   stone floor, two plants and one pendant cluster. It gives a long performance
   continuous low-frequency motion without distracting from the pianist. Pair
   with studio/recital acoustics rather than trying to make the glass sound real.

4. Forest clearing at dawn — excellent thumbnail and nature identity for quiet
   Chopin, Debussy, Satie and contemporary pieces. Use a few layered trunk cards,
   silhouette foliage, ground fog, pollen and one warm shaft; do not model a full
   forest. A low timber platform prevents the piano from looking abandoned in mud.

5. Salon in the round — strongest audience-presence concept. Twenty to forty
   restrained silhouettes around a rug or low circular dais, table lamps and low
   pendants. It creates foreground depth and emotional proximity, but chairs and
   people must leave protected paths for the automatic camera and never obscure
   fingers in the favored keyboard-side shots.

6. Cathedral / ruined chapel — reserve for Bach, Liszt, sacred music and large
   climaxes. Tall columns, a rose-window gobo and cool moon shafts are enough;
   complete architecture is unnecessary. Pair with the cathedral acoustic only
   for slower repertoire because its long decay muddies fast passages.

7. Minimal light sculpture — the lower-cost abstract alternative: black stage,
   suspended vertical tubes or a halo behind the piano, plus reflected lines in
   the lacquer. Animate brightness by musical section. Distinctive, reusable and
   much lighter than architecture, but it needs disciplined camera composition.

Design rule for every future entry: provide both `establish` and `venue` shots,
keep environment/props independent from LIGHTING_PRESETS, supply a clear floor or
platform contact, expose no more than one dominant visual idea, and prefer slow,
deterministic animation so live playback and offline export render identically.
*/

export const STAGE_PRESETS = {
  stage: {
    label: 'Black stage', lighting: 'concert', environment: 'stage', environmentIntensity: 0.7, dust: true,
    background: 0x000000, floor: { visible: true, color: 0x9a8a7a },
    shots: {
      establish: { pos: [410, 245, 480], target: [0, 82, -90], fov: 42, dof: 0.25 },
      venue: { pos: [-470, 285, 560], target: [0, 95, -125], fov: 45, dof: 0.15 },
    },
  },
  studio: {
    label: 'Photo studio', lighting: 'studio', environment: 'studio', environmentIntensity: 0.9, dust: false,
    background: 0x0b0b0b, floor: { visible: true, color: 0x777777 },
    shots: {
      establish: { pos: [390, 230, 455], target: [0, 82, -75], fov: 40, dof: 0.2 },
      venue: { pos: [-430, 265, 525], target: [0, 95, -105], fov: 44, dof: 0.12 },
    },
  },
  candle: {
    label: 'Candlelit chamber', lighting: 'candle', environment: 'candle', environmentIntensity: 0.68, dust: true,
    background: 0x080302, floor: { visible: true, color: 0x8e5635 }, props: 'candle',
    shots: {
      establish: { pos: [430, 245, 500], target: [0, 100, -150], fov: 42, dof: 0.24 },
      venue: { pos: [-500, 290, 570], target: [0, 125, -205], fov: 45, dof: 0.14 },
    },
  },
  water: {
    label: 'Blue-hour water', lighting: 'blueHour', environment: 'blueHour', environmentIntensity: 0.78, dust: false,
    background: 'blueHour', floor: { visible: false, color: 0xffffff }, props: 'water',
    shots: {
      establish: { pos: [0, 148, 760], target: [0, 58, -92], fov: 43, dof: 0.16 },
      venue: { pos: [485, 215, 650], target: [0, 70, -105], fov: 43, dof: 0.12 },
    },
  },
  projection: {
    label: 'Projection cyclorama', lighting: 'projection', environment: 'projection', environmentIntensity: 0.62, dust: false,
    background: 0x02030a, floor: { visible: true, color: 0x28304a }, props: 'projection',
    shots: {
      establish: { pos: [420, 235, 490], target: [0, 105, -170], fov: 42, dof: 0.2 },
      venue: { pos: [-500, 280, 590], target: [0, 135, -225], fov: 45, dof: 0.12 },
    },
  },
}

const seeded = (start = 1) => {
  let state = start
  return () => (state = state * 16807 % 2147483647) / 2147483647
}

function environmentBuilders(THREE, pmrem) {
  const panel = (scene, width, height, position, intensity, color = 0xffffff, look = [0, 80, -60]) => {
    const material = new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity), side: THREE.DoubleSide })
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material)
    mesh.position.set(...position); mesh.lookAt(...look); scene.add(mesh)
  }
  const floor = (scene, color, y = -80) => {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000), new THREE.MeshBasicMaterial({ color }))
    mesh.rotation.x = -Math.PI / 2; mesh.position.y = y; scene.add(mesh)
  }
  return {
    stage() {
      const s = new THREE.Scene(); s.background = new THREE.Color(0x010101)
      panel(s, 260, 260, [-180, 700, 280], 9, 0xffcf9a)
      panel(s, 900, 140, [0, 650, -150], 0.9, 0xffd7a8)
      panel(s, 60, 500, [-900, 300, -300], 2.2, 0xffbf80)
      panel(s, 60, 500, [900, 260, -100], 1.6, 0xffc890)
      panel(s, 700, 220, [150, 420, -900], 2.2, 0xffe2c0)
      panel(s, 1400, 300, [0, 120, 1100], 0.12, 0x8fa6c8)
      floor(s, 0x060504)
      return pmrem.fromScene(s, 0.015, 1, 6000).texture
    },
    studio() {
      const s = new THREE.Scene()
      const room = new THREE.Mesh(new THREE.BoxGeometry(2400, 1200, 2400), new THREE.MeshBasicMaterial({ color: 0x151515, side: THREE.BackSide }))
      room.position.y = 510; s.add(room); floor(s, 0x24221f, -89)
      panel(s, 520, 300, [0, 600, -60], 6, 0xffffff, [0, 0, -60])
      panel(s, 800, 260, [900, 160, -120], 4.5, 0xfff6ee, [0, 60, -100])
      panel(s, 120, 600, [-800, 250, 100], 7, 0xfff1e2, [0, 60, 0])
      panel(s, 600, 200, [-200, 300, -900], 3.5, 0xe8efff, [0, 60, -100])
      panel(s, 700, 200, [0, 250, 900], 1.8, 0xffffff, [0, 60, 0])
      return pmrem.fromScene(s, 0.02, 1, 5000).texture
    },
    candle() {
      const s = new THREE.Scene(); s.background = new THREE.Color(0x050201)
      panel(s, 380, 260, [-230, 450, 260], 5.5, 0xffa85e)
      panel(s, 1100, 170, [0, 560, -300], 0.65, 0xff8d48)
      panel(s, 90, 420, [-700, 210, -240], 2.5, 0xff7235)
      panel(s, 90, 420, [700, 210, -240], 2.2, 0xff8a45)
      panel(s, 700, 280, [100, 260, -850], 0.7, 0x864020)
      floor(s, 0x120705)
      return pmrem.fromScene(s, 0.025, 1, 5000).texture
    },
    blueHour() {
      const s = new THREE.Scene(); s.background = new THREE.Color(0x07162d)
      panel(s, 2200, 650, [0, 520, -900], 1.25, 0x6d94ce)
      panel(s, 1800, 260, [0, 80, -1050], 0.45, 0xf0a176)
      panel(s, 500, 340, [-260, 500, 420], 3.8, 0xffca8a)
      panel(s, 900, 240, [300, 440, -850], 1.4, 0x9fc8ff)
      floor(s, 0x15345d, -110)
      return pmrem.fromScene(s, 0.03, 1, 6000).texture
    },
    projection() {
      const s = new THREE.Scene(); s.background = new THREE.Color(0x010208)
      panel(s, 1250, 620, [0, 280, -760], 1.35, 0x536fd6)
      panel(s, 260, 500, [-780, 260, -320], 1.6, 0x4ad8e8)
      panel(s, 260, 500, [780, 260, -320], 1.45, 0xc263e8)
      panel(s, 480, 300, [-180, 470, 330], 3.5, 0xffdfc4)
      floor(s, 0x090b16)
      return pmrem.fromScene(s, 0.02, 1, 5500).texture
    },
  }
}

function blueHourBackground(THREE) {
  // The reference is overcast, not starry: layered cobalt cloud banks, a low
  // steel-blue horizon and only a narrow remnant of pink after sunset.
  const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 512
  const g = canvas.getContext('2d'), sky = g.createLinearGradient(0, 0, 0, canvas.height)
  sky.addColorStop(0, '#194f91'); sky.addColorStop(0.42, '#235a9a')
  sky.addColorStop(0.72, '#416f9d'); sky.addColorStop(0.88, '#7889a4'); sky.addColorStop(1, '#2b5278')
  g.fillStyle = sky; g.fillRect(0, 0, canvas.width, canvas.height)
  const random = seeded(91)
  g.save(); g.filter = 'blur(24px)'
  for (let i = 0; i < 58; i++) {
    const x = random() * 1120 - 48, y = 20 + random() * 330
    const width = 110 + random() * 310, height = 20 + random() * 58
    const shade = random() < 0.62 ? '24,53,94' : '113,137,173'
    g.fillStyle = `rgba(${shade},${0.08 + random() * 0.18})`
    g.beginPath(); g.ellipse(x, y, width, height, random() * 0.16 - 0.08, 0, Math.PI * 2); g.fill()
  }
  g.restore()
  const cloudBank = g.createLinearGradient(0, 95, 0, 325)
  cloudBank.addColorStop(0, 'rgba(18,45,84,0)'); cloudBank.addColorStop(0.38, 'rgba(18,45,84,.2)')
  cloudBank.addColorStop(0.68, 'rgba(29,61,101,.28)'); cloudBank.addColorStop(1, 'rgba(60,92,130,0)')
  g.fillStyle = cloudBank; g.fillRect(0, 80, canvas.width, 270)
  const dusk = g.createLinearGradient(0, 0, canvas.width, 0)
  dusk.addColorStop(0, 'rgba(224,139,157,0)'); dusk.addColorStop(0.55, 'rgba(224,139,157,.08)')
  dusk.addColorStop(0.82, 'rgba(246,154,174,.32)'); dusk.addColorStop(1, 'rgba(246,154,174,.08)')
  g.fillStyle = dusk; g.fillRect(0, 332, canvas.width, 30)
  const haze = g.createLinearGradient(0, 385, 0, 465)
  haze.addColorStop(0, 'rgba(192,209,229,0)'); haze.addColorStop(0.55, 'rgba(192,209,229,.15)'); haze.addColorStop(1, 'rgba(75,106,140,0)')
  g.fillStyle = haze; g.fillRect(0, 375, canvas.width, 100)
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace
  texture.minFilter = THREE.LinearFilter; texture.magFilter = THREE.LinearFilter
  return texture
}

function candleChamber(THREE, lowQuality) {
  const root = new THREE.Group(); root.name = 'stage-candlelit-chamber'
  const stone = new THREE.MeshStandardMaterial({ color: 0x351812, roughness: 0.82, metalness: 0.02, emissive: 0x100403, emissiveIntensity: 0.7 })
  const trim = new THREE.MeshStandardMaterial({ color: 0x6b3925, roughness: 0.68, emissive: 0x160603, emissiveIntensity: 0.65 })
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(1150, 560), stone)
  wall.position.set(0, 265, -500); root.add(wall)
  const archXs = [-330, 0, 330]
  for (const x of archXs) {
    for (const side of [-1, 1]) {
      const column = new THREE.Mesh(new THREE.BoxGeometry(28, 300, 28), trim)
      column.position.set(x + side * 112, 150, -482); column.castShadow = column.receiveShadow = true; root.add(column)
    }
    const arch = new THREE.Mesh(new THREE.TorusGeometry(112, 14, 10, 40, Math.PI), trim)
    arch.position.set(x, 300, -482); arch.castShadow = true; root.add(arch)
    const recess = new THREE.Mesh(new THREE.PlaneGeometry(205, 285), new THREE.MeshStandardMaterial({ color: 0x090302, roughness: 1 }))
    recess.position.set(x, 150, -484); root.add(recess)
  }
  const cornice = new THREE.Mesh(new THREE.BoxGeometry(1150, 22, 36), trim)
  cornice.position.set(0, 505, -478); root.add(cornice)
  // Two shallow altar-like tiers make the rear candles legible as groups,
  // rather than an even field of lights at floor level.
  const tierMaterial = new THREE.MeshStandardMaterial({ color: 0x2f150e, roughness: 0.72, emissive: 0x0d0302, emissiveIntensity: 0.6 })
  for (const [width, height, z] of [[920, 9, -325], [840, 18, -405]]) {
    const tier = new THREE.Mesh(new THREE.BoxGeometry(width, height, 72), tierMaterial)
    tier.position.set(0, height / 2, z); tier.receiveShadow = true; root.add(tier)
  }
  // Small wall sconces reveal the arches in wide shots without washing the
  // chamber. They are practicals, not substitutes for the pianist's key.
  for (const [index, x] of [-330, 0, 330].entries()) {
    const bracket = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 3.2, 15, 8), trim)
    bracket.position.set(x, 185, -466); root.add(bracket)
    const flame = new THREE.Mesh(new THREE.SphereGeometry(2.1, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff9f45, toneMapped: false }))
    flame.scale.y = 2.2; flame.position.set(x, 196, -464); root.add(flame)
    const light = new THREE.PointLight(0xff7b36, 52, 190, 2)
    light.position.set(x, 200, -448); light.userData.phase = index * 2.1; root.add(light)
  }

  const count = lowQuality ? 120 : 220, random = seeded(30)
  const waxGeometry = new THREE.CylinderGeometry(0.72, 0.92, 1, 8)
  const wax = new THREE.InstancedMesh(waxGeometry, new THREE.MeshStandardMaterial({ color: 0xf1cda0, roughness: 0.78 }), count)
  const flameGeometry = new THREE.SphereGeometry(0.75, 7, 5)
  const flameMaterial = new THREE.MeshBasicMaterial({ color: 0xffbd61, toneMapped: false })
  const flames = new THREE.InstancedMesh(flameGeometry, flameMaterial, count)
  const matrix = new THREE.Matrix4(), quaternion = new THREE.Quaternion(), scale = new THREE.Vector3()
  const flamePositions = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    let x, z
    if (i < count * 0.62) {
      x = (random() - 0.5) * 900; z = -250 - random() * 205
    } else {
      const side = random() < 0.5 ? -1 : 1
      x = side * (215 + random() * 285); z = 130 - random() * 430
    }
    // Leave the piano and bench footprint clear.
    if (Math.abs(x) < 205 && z > -265) x += x < 0 ? -210 : 210
    const baseY = z < -370 ? 18 : z < -300 ? 9 : 0
    const height = 8 + random() * 19, radius = 0.78 + random() * 0.58
    scale.set(radius, height, radius); matrix.compose(new THREE.Vector3(x, baseY + height / 2, z), quaternion, scale); wax.setMatrixAt(i, matrix)
    const fy = baseY + height + 1.4
    scale.set(radius * 0.82, 3.1 + random(), radius * 0.82); matrix.compose(new THREE.Vector3(x, fy, z), quaternion, scale); flames.setMatrixAt(i, matrix)
    flamePositions.set([x, fy, z], i * 3)
  }
  wax.instanceMatrix.needsUpdate = flames.instanceMatrix.needsUpdate = true
  wax.castShadow = false; wax.receiveShadow = true; flames.renderOrder = 4
  root.add(wax, flames)

  // Soft sprites around every flame provide the luminous mass that real candle
  // clusters have on camera. The small solid mesh remains the hot core.
  const glowCanvas = document.createElement('canvas'); glowCanvas.width = glowCanvas.height = 64
  const gg = glowCanvas.getContext('2d'), glowGradient = gg.createRadialGradient(32, 32, 0, 32, 32, 32)
  glowGradient.addColorStop(0, 'rgba(255,242,190,1)'); glowGradient.addColorStop(0.12, 'rgba(255,167,72,.9)')
  glowGradient.addColorStop(0.45, 'rgba(255,92,26,.24)'); glowGradient.addColorStop(1, 'rgba(255,70,20,0)')
  gg.fillStyle = glowGradient; gg.fillRect(0, 0, 64, 64)
  const glowGeometry = new THREE.BufferGeometry(); glowGeometry.setAttribute('position', new THREE.BufferAttribute(flamePositions, 3))
  const glowMaterial = new THREE.PointsMaterial({ color: 0xffb05b, size: 11, map: new THREE.CanvasTexture(glowCanvas), transparent: true, opacity: 0.58, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })
  const flameGlows = new THREE.Points(glowGeometry, glowMaterial); flameGlows.renderOrder = 3; root.add(flameGlows)

  const glowPositions = [[-260, 48, -335], [260, 48, -335], [-350, 42, 20], [350, 42, 15]]
  const glowLights = glowPositions.map((position, index) => {
    const light = new THREE.PointLight(0xff843f, 82, 270, 2)
    light.position.set(...position); light.userData.phase = index * 1.7; root.add(light); return light
  })
  const poolCanvas = document.createElement('canvas'); poolCanvas.width = poolCanvas.height = 128
  const pg = poolCanvas.getContext('2d'), poolGradient = pg.createRadialGradient(64, 64, 0, 64, 64, 64)
  poolGradient.addColorStop(0, '#ffffff'); poolGradient.addColorStop(0.35, '#777777'); poolGradient.addColorStop(1, '#000000')
  pg.fillStyle = poolGradient; pg.fillRect(0, 0, 128, 128)
  const poolAlpha = new THREE.CanvasTexture(poolCanvas)
  for (const [x, z, radius] of [[-280, -335, 115], [280, -335, 115], [-365, 5, 105], [365, 5, 105]]) {
    const pool = new THREE.Mesh(new THREE.CircleGeometry(radius, 40), new THREE.MeshBasicMaterial({ color: 0xb84a20, alphaMap: poolAlpha, transparent: true, opacity: 0.18, depthWrite: false, blending: THREE.AdditiveBlending }))
    pool.rotation.x = -Math.PI / 2; pool.position.set(x, 0.35, z); root.add(pool)
  }
  return {
    root,
    update(_dt, time) {
      for (const light of glowLights) light.intensity = 80 + Math.sin(time * 2.7 + light.userData.phase) * 7 + Math.sin(time * 6.1 + light.userData.phase) * 3
      glowMaterial.opacity = 0.54 + Math.sin(time * 3.7) * 0.035
      // A very small collective shimmer avoids visibly static LED flames.
      flames.scale.y = 1 + Math.sin(time * 4.3) * 0.025
    },
  }
}

function calmWaterNormals(THREE, size) {
  // Seamless filtered value noise avoids the visibly periodic sine bands of the
  // first prototype while retaining enough slope for soft moving reflections.
  const random = seeded(607), count = size * size
  let fine = new Float32Array(count)
  for (let i = 0; i < count; i++) fine[i] = random()
  const blur = (source, passes) => {
    let input = source
    for (let pass = 0; pass < passes; pass++) {
      const output = new Float32Array(count)
      for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
        const left = y * size + (x + size - 1) % size, right = y * size + (x + 1) % size
        const up = ((y + size - 1) % size) * size + x, down = ((y + 1) % size) * size + x
        const i = y * size + x
        output[i] = (input[i] * 4 + input[left] + input[right] + input[up] + input[down]) / 8
      }
      input = output
    }
    return input
  }
  fine = blur(fine, 2); const broad = blur(fine, 7), data = new Uint8Array(count * 4)
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const at = (px, py, field) => field[(py + size) % size * size + (px + size) % size]
    const dx = (at(x + 1, y, fine) - at(x - 1, y, fine)) * 0.34 + (at(x + 2, y, broad) - at(x - 2, y, broad)) * 0.72
    const dy = (at(x, y + 1, fine) - at(x, y - 1, fine)) * 0.34 + (at(x, y + 2, broad) - at(x, y - 2, broad)) * 0.72
    const length = Math.hypot(dx, dy, 1), i = (y * size + x) * 4
    data[i] = Math.round((-dx / length * 0.5 + 0.5) * 255)
    data[i + 1] = Math.round((-dy / length * 0.5 + 0.5) * 255)
    data[i + 2] = Math.round((1 / length * 0.5 + 0.5) * 255); data[i + 3] = 255
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat)
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.needsUpdate = true
  return texture
}

function urbanShoreline(THREE) {
  const group = new THREE.Group(); group.name = 'blue-hour-shoreline'
  const shore = new THREE.Mesh(new THREE.BoxGeometry(2800, 12, 120), new THREE.MeshBasicMaterial({ color: 0x132c43 }))
  shore.position.set(0, -25, -1110); group.add(shore)
  const random = seeded(47), count = 42
  const buildings = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 0x29445a }), count)
  const matrix = new THREE.Matrix4(), rotation = new THREE.Quaternion(), scale = new THREE.Vector3()
  for (let i = 0; i < count; i++) {
    const x = -1320 + i * 64 + random() * 24, width = 34 + random() * 54
    const height = 22 + random() * 55, depth = 35 + random() * 45
    scale.set(width, height, depth); matrix.compose(new THREE.Vector3(x, -18 + height / 2, -1070 + random() * 32), rotation, scale); buildings.setMatrixAt(i, matrix)
  }
  buildings.instanceMatrix.needsUpdate = true; group.add(buildings)
  const treeMaterial = new THREE.MeshBasicMaterial({ color: 0x173847 })
  for (let i = 0; i < 34; i++) {
    const crown = new THREE.Mesh(new THREE.SphereGeometry(18 + random() * 26, 7, 5), treeMaterial)
    crown.scale.y = 0.65 + random() * 0.8; crown.position.set(-1350 + random() * 2700, 2 + random() * 24, -1015 + random() * 34); group.add(crown)
  }
  // One distant church/spire, the strongest landmark in the reference horizon.
  const tower = new THREE.Mesh(new THREE.BoxGeometry(32, 92, 34), new THREE.MeshBasicMaterial({ color: 0x20394d }))
  tower.position.set(430, 28, -1065); group.add(tower)
  const spire = new THREE.Mesh(new THREE.ConeGeometry(24, 92, 5), new THREE.MeshBasicMaterial({ color: 0x152e43 }))
  spire.position.set(430, 120, -1065); group.add(spire)
  const windowPositions = []
  for (let i = 0; i < 55; i++) windowPositions.push(-1250 + random() * 2500, -3 + random() * 42, -1012)
  const windows = new THREE.BufferGeometry(); windows.setAttribute('position', new THREE.Float32BufferAttribute(windowPositions, 3))
  group.add(new THREE.Points(windows, new THREE.PointsMaterial({ color: 0xe0a68e, size: 2.2, transparent: true, opacity: 0.45, sizeAttenuation: true, toneMapped: false })))
  return group
}

function blueHourAtmosphere(THREE, Sky, lowQuality) {
  if (!Sky) throw new Error('Blue-hour water requires the Three.js Sky addon')
  const sky = new Sky(); sky.name = 'blue-hour-atmospheric-sky'; sky.scale.setScalar(4500)
  const skyUniforms = sky.material.uniforms
  skyUniforms.turbidity.value = 11.5
  skyUniforms.rayleigh.value = 2.35
  skyUniforms.mieCoefficient.value = 0.0055
  skyUniforms.mieDirectionalG.value = 0.84
  const elevation = -2.2, azimuth = 218
  const phi = THREE.MathUtils.degToRad(90 - elevation), theta = THREE.MathUtils.degToRad(azimuth)
  const sun = new THREE.Vector3().setFromSphericalCoords(1, phi, theta)
  skyUniforms.sunPosition.value.copy(sun)
  sky.material.depthWrite = false; sky.renderOrder = -1000
  // Grade the physical atmosphere into a saturated blue hour and add broad
  // cloud structure in the same shader. Unlike a uniform translucent tint this
  // retains a dark zenith, luminous horizon and visible overcast cloud banks.
  const tintUniforms = { stageTime: { value: 0 } }
  const tint = new THREE.Mesh(new THREE.SphereGeometry(4400, lowQuality ? 24 : 40, lowQuality ? 12 : 20), new THREE.ShaderMaterial({
    uniforms: tintUniforms,
    vertexShader: /* glsl */`
      varying vec3 vDirection;
      void main() { vDirection = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
    `,
    fragmentShader: /* glsl */`
      uniform float stageTime;
      varying vec3 vDirection;
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
      float noise(vec2 p) {
        vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + 1.0), f.x), f.y);
      }
      float fbm(vec2 p) {
        float value = 0.0, amplitude = 0.55;
        for (int i = 0; i < 5; i++) { value += noise(p) * amplitude; p = p * 2.03 + vec2(17.1, 9.2); amplitude *= 0.48; }
        return value;
      }
      void main() {
        vec3 d = normalize(vDirection);
        vec2 uv = vec2(atan(d.z, d.x) / 6.2831853 + 0.5, asin(clamp(d.y, -1.0, 1.0)) / 3.1415926 + 0.5);
        float height = smoothstep(-0.12, 0.72, d.y);
        // Measured from the reference photo: cobalt zenith, deeper blue toward the shore.
        vec3 horizon = vec3(0.1, 0.24, 0.5);
        vec3 zenith = vec3(0.25, 0.45, 0.86);
        vec3 color = mix(horizon, zenith, height);
        float horizonHaze = exp(-abs(d.y - 0.015) * 8.0);
        color = mix(color, vec3(0.3, 0.42, 0.66), horizonHaze * 0.25);

        vec2 drift = vec2(stageTime * 0.0014, -stageTime * 0.00035);
        float broad = fbm(uv * vec2(3.4, 5.2) + drift);
        float detail = fbm(uv * vec2(8.5, 7.5) - drift * 1.3);
        float cloud = smoothstep(0.43, 0.73, broad * 0.76 + detail * 0.24);
        float ceiling = smoothstep(-0.02, 0.16, d.y) * (1.0 - smoothstep(0.72, 0.98, d.y));
        float bank = exp(-abs(d.y - 0.13) * 5.0);
        float cloudMask = clamp(cloud * ceiling * 0.58 + bank * smoothstep(0.48, 0.72, broad) * 0.34, 0.0, 0.7);
        vec3 cloudDark = vec3(0.12, 0.23, 0.45);
        vec3 cloudLight = vec3(0.42, 0.44, 0.68);
        color = mix(color, mix(cloudDark, cloudLight, detail * 0.5), cloudMask);

        vec2 duskDirection = normalize(vec2(0.82, -0.57));
        float duskFacing = pow(max(dot(normalize(d.xz), duskDirection), 0.0), 6.0);
        float dusk = duskFacing * exp(-abs(d.y - 0.025) * 13.0);
        color += vec3(0.44, 0.12, 0.2) * dusk * 0.3;
        // Colours above are display-referred (sampled from the photo); the
        // composer works in linear light and encodes once in OutputPass.
        gl_FragColor = vec4(pow(color, vec3(2.2)), 1.0);
      }
    `,
    side: THREE.BackSide, depthWrite: false, toneMapped: false,
  }))
  tint.name = 'blue-hour-sky-tint'; tint.renderOrder = -999.5

  // Three's atmospheric model supplies the physically based blue gradient and
  // low sun. A separate inner veil adds the reference's overcast cloud ceiling.
  return { sky, tint, sun, update(time) { tintUniforms.stageTime.value = time } }
}

function blueHourWater(THREE, lowQuality, context = {}) {
  const { Water, Sky, piano } = context
  if (!Water) throw new Error('Blue-hour water requires the Three.js Water addon')
  const root = new THREE.Group(); root.name = 'stage-blue-hour-water'
  const atmosphere = blueHourAtmosphere(THREE, Sky, lowQuality)
  const waterLevel = -35, waterNormals = calmWaterNormals(THREE, lowQuality ? 128 : 256)
  const water = new Water(new THREE.PlaneGeometry(5000, 4200), {
    textureWidth: lowQuality ? 256 : 1024, textureHeight: lowQuality ? 256 : 1024,
    waterNormals, alpha: 0.96, sunDirection: atmosphere.sun,
    sunColor: 0x4a6fae, waterColor: 0x0a2a5a, distortionScale: 0.1, size: 0.18, fog: false,
  })
  water.name = 'blue-hour-three-water'; water.rotation.x = -Math.PI / 2; water.position.set(0, waterLevel, -520)
  water.renderOrder = -10
  // Water renders a mirrored scene internally. Suppress it in depth/AO override
  // passes and hide the piano's own fallboard reflector during that nested pass.
  // Three's Water adds a constant vec3(0.1) grey under the reflection, which
  // turns a dark blue-hour lake grey at grazing angles. Use the lake colour.
  const greyFloor = 'vec3( 0.1 ) + reflectionSample'
  if (water.material.fragmentShader.includes(greyFloor)) {
    water.material.fragmentShader = water.material.fragmentShader.replace(greyFloor, 'waterColor * 0.35 + reflectionSample')
  }
  const reflect = water.onBeforeRender
  water.onBeforeRender = function(renderer, scene, camera, geometry, material, group) {
    if (scene.overrideMaterial) return
    const mirrorVisible = piano?.mirror?.visible
    if (piano?.mirror) piano.mirror.visible = false
    try { reflect.call(this, renderer, scene, camera, geometry, material, group) }
    finally { if (piano?.mirror) piano.mirror.visible = mirrorVisible }
  }
  root.add(atmosphere.sky, atmosphere.tint, water, urbanShoreline(THREE))

  const wood = new THREE.MeshStandardMaterial({ color: 0x2c2524, roughness: 0.72, metalness: 0.02 })
  const darkWood = new THREE.MeshStandardMaterial({ color: 0x171719, roughness: 0.78 })
  const matrix = new THREE.Matrix4(), rotation = new THREE.Quaternion()
  const layers = [[660, 18, 470, -26], [590, 14, 420, -15], [520, 14, 370, -7]]
  for (const [width, height, depth, y] of layers) {
    const deck = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), y < -20 ? darkWood : wood)
    deck.position.set(0, y, -80); deck.castShadow = deck.receiveShadow = true; root.add(deck)
  }
  const plankMaterial = new THREE.MeshStandardMaterial({ color: 0x4a4140, roughness: 0.68 })
  const deckPlanks = new THREE.InstancedMesh(new THREE.BoxGeometry(515, 1.2, 13), plankMaterial, 25)
  for (let i = 0; i < 25; i++) {
    const shade = 0.68 + (i % 4) * 0.045
    matrix.compose(new THREE.Vector3(0, 0.6, -249 + i * 14), rotation, new THREE.Vector3(1, 1, 1)); deckPlanks.setMatrixAt(i, matrix)
    deckPlanks.setColorAt(i, new THREE.Color().setRGB(shade, shade * 0.9, shade * 0.88))
  }
  deckPlanks.instanceMatrix.needsUpdate = true; deckPlanks.instanceColor.needsUpdate = true; deckPlanks.receiveShadow = true; root.add(deckPlanks)

  const walkBase = new THREE.Mesh(new THREE.BoxGeometry(102, 9, 820), darkWood)
  walkBase.position.set(0, -4.5, 510); walkBase.castShadow = walkBase.receiveShadow = true; root.add(walkBase)
  const walkCount = 49, walkPlanks = new THREE.InstancedMesh(new THREE.BoxGeometry(96, 1.25, 14), plankMaterial, walkCount)
  for (let i = 0; i < walkCount; i++) {
    matrix.compose(new THREE.Vector3(0, 0.65, 122 + i * 16.5), rotation, new THREE.Vector3(1, 1, 1)); walkPlanks.setMatrixAt(i, matrix)
    const shade = 0.56 + (i % 5) * 0.035; walkPlanks.setColorAt(i, new THREE.Color().setRGB(shade, shade * 0.91, shade * 0.92))
  }
  walkPlanks.instanceMatrix.needsUpdate = true; walkPlanks.instanceColor.needsUpdate = true; walkPlanks.receiveShadow = true; root.add(walkPlanks)
  for (const x of [-51, 51]) {
    const edge = new THREE.Mesh(new THREE.BoxGeometry(3, 4, 820), darkWood)
    edge.position.set(x, 1.2, 510); root.add(edge)
  }
  return {
    root, effects: [water],
    update(_dt, elapsed, signal = {}) {
      const time = Number.isFinite(signal.time) ? signal.time : elapsed
      water.material.uniforms.time.value = time * 0.055
      atmosphere.update(time)
    },
  }
}

// Coarse deterministic form analysis for visual direction. It intentionally
// detects changes in texture (energy, onset density, register and phrase gaps),
// not musicological sonata-form labels. That makes it useful for arbitrary MIDI
// files while keeping seeks and offline exports identical.
export function analyzeProjectionSections(song = {}) {
  const notes = (song.notes || []).filter(note => Number.isFinite(note.time) && Number.isFinite(note.midi)).map(note => ({
    time: Math.max(0, note.time), duration: Math.max(0.02, Number(note.duration) || 0.1),
    velocity: Math.max(0, Math.min(1, Number(note.velocity) || 0.6)), midi: note.midi,
  })).sort((a, b) => a.time - b.time || a.midi - b.midi)
  const duration = Math.max(0, Number(song.duration) || notes.reduce((end, note) => Math.max(end, note.time + note.duration), 0))
  if (!notes.length || duration <= 0) return []
  const stats = (start, end) => {
    const span = Math.max(0.1, end - start)
    let energy = 0, onsets = 0, register = 0, weight = 0
    for (const note of notes) {
      if (note.time >= end) break
      const overlap = Math.max(0, Math.min(end, note.time + note.duration) - Math.max(start, note.time))
      if (!overlap) continue
      const w = overlap * (0.35 + note.velocity * 0.65)
      energy += note.velocity * note.velocity * overlap
      register += (note.midi - 60) * w; weight += w
      if (note.time >= start) onsets++
    }
    return { energy: energy / span, density: onsets / span, register: weight ? register / weight / 24 : 0 }
  }
  if (duration < 18) {
    const one = stats(0, duration)
    return [{ start: 0, end: duration, label: 'Complete piece', energy: 1, density: 1, register: Math.max(-1, Math.min(1, one.register)), style: 0 }]
  }
  const targetCount = Math.max(2, Math.min(8, Math.round(duration / 24)))
  const global = stats(0, duration), candidateTimes = new Set()
  for (let time = 4; time < duration - 4; time += 4) candidateTimes.add(time)
  let latestEnd = 0
  for (const note of notes) {
    const gap = note.time - latestEnd
    if (gap >= 0.16 && note.time > 6 && note.time < duration - 5) candidateTimes.add(note.time)
    latestEnd = Math.max(latestEnd, note.time + note.duration)
  }
  const candidates = [...candidateTimes].map(time => {
    const left = stats(Math.max(0, time - 6), time), right = stats(time, Math.min(duration, time + 6))
    let beforeEnd = 0, afterStart = duration
    for (const note of notes) {
      const end = note.time + note.duration
      if (end <= time) beforeEnd = Math.max(beforeEnd, end)
      if (note.time >= time) { afterStart = Math.min(afterStart, note.time); break }
    }
    const gap = Math.max(0, afterStart - beforeEnd)
    const energyChange = Math.abs(right.energy - left.energy) / Math.max(0.03, global.energy)
    const densityChange = Math.abs(right.density - left.density) / Math.max(0.08, global.density)
    const registerChange = Math.abs(right.register - left.register)
    const gapBonus = Math.min(1.8, gap / 0.35)
    return { time, score: energyChange * 1.2 + densityChange * 0.85 + registerChange * 0.6 + gapBonus * 1.45 }
  }).sort((a, b) => b.score - a.score || a.time - b.time)
  const minSpacing = Math.max(8, duration / (targetCount * 1.9)), boundaries = [0, duration]
  for (const candidate of candidates) {
    if (boundaries.length >= targetCount + 1) break
    if (boundaries.every(time => Math.abs(time - candidate.time) >= minSpacing)) boundaries.push(candidate.time)
  }
  // Sparse music may not expose enough strong changes; fill the requested form
  // near equal divisions, snapped to the closest candidate when possible.
  for (let i = 1; boundaries.length < targetCount + 1 && i < targetCount; i++) {
    const ideal = duration * i / targetCount
    const nearest = [...candidates].sort((a, b) => Math.abs(a.time - ideal) - Math.abs(b.time - ideal))[0]?.time || ideal
    const time = boundaries.every(value => Math.abs(value - nearest) >= minSpacing * 0.7) ? nearest : ideal
    if (boundaries.every(value => Math.abs(value - time) >= minSpacing * 0.55)) boundaries.push(time)
  }
  boundaries.sort((a, b) => a - b)
  const sections = boundaries.slice(0, -1).map((start, index) => ({ start, end: boundaries[index + 1], ...stats(start, boundaries[index + 1]) }))
  const maxEnergy = Math.max(...sections.map(section => section.energy), 0.001)
  const maxDensity = Math.max(...sections.map(section => section.density), 0.001)
  for (const [index, section] of sections.entries()) {
    section.energy = Math.max(0, Math.min(1, section.energy / maxEnergy))
    section.density = Math.max(0, Math.min(1, section.density / maxDensity))
    section.register = Math.max(-1, Math.min(1, section.register))
    if (index === 0) section.label = 'Opening'
    else if (index === sections.length - 1) section.label = 'Finale'
    else if (section.energy > 0.76) section.label = 'Climax'
    else if (section.energy > sections[index - 1].energy + 0.14) section.label = 'Build'
    else if (section.energy < 0.42) section.label = 'Reflection'
    else section.label = 'Development'
    section.style = index === 0 ? 0 : section.energy > 0.76 ? 3 : section.density < 0.38 ? 1 : index % 2 ? 2 : 0
  }
  return sections
}

export function projectionSectionAt(sections, time) {
  if (!sections?.length) return null
  const last = sections.length - 1, clamped = Math.max(0, Math.min(Number(time) || 0, sections[last].end))
  let index = last
  for (let i = 0; i < sections.length; i++) if (clamped < sections[i].end || i === last) { index = i; break }
  const section = sections[index], span = Math.max(0.001, section.end - section.start)
  return { ...section, index, count: sections.length, progress: Math.max(0, Math.min(1, (clamped - section.start) / span)) }
}

function projectionCyclorama(THREE, lowQuality) {
  const root = new THREE.Group(); root.name = 'stage-projection-cyclorama'
  const geometry = new THREE.PlaneGeometry(1050, 500, lowQuality ? 40 : 80, 1)
  const positions = geometry.attributes.position
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i) / 525
    positions.setZ(i, x * x * 92) // concave screen: the wings wrap toward the stage
  }
  positions.needsUpdate = true; geometry.computeVertexNormals()
  const uniforms = {
    stageTime: { value: 0 }, energy: { value: 0 }, activity: { value: 0 }, register: { value: 0 },
    style: { value: 0 }, sectionEnergy: { value: 0.4 }, sectionDensity: { value: 0.4 },
    sectionRegister: { value: 0 }, sectionIndex: { value: 0 }, sectionProgress: { value: 0 },
    cool: { value: new THREE.Color(0x49d5e8) }, violet: { value: new THREE.Color(0x7452d7) },
    warm: { value: new THREE.Color(0xffaf62) }, dark: { value: new THREE.Color(0x030612) },
  }
  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: /* glsl */`
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
    `,
    fragmentShader: /* glsl */`
      uniform float stageTime, energy, activity, register, style;
      uniform float sectionEnergy, sectionDensity, sectionRegister, sectionIndex, sectionProgress;
      uniform vec3 cool, violet, warm, dark;
      varying vec2 vUv;
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float weight(float value, float target) { return max(0.0, 1.0 - abs(value - target)); }
      void main() {
        vec2 p = (vUv - 0.5) * vec2(2.15, 1.0);
        float shapedEnergy = clamp(energy * 0.7 + sectionEnergy * 0.3, 0.0, 1.0);
        float shapedActivity = clamp(activity * 0.6 + sectionDensity * 0.4, 0.0, 1.0);
        float focusX = mix(register, sectionRegister, 0.45) * 0.38;
        float t = stageTime * (0.05 + shapedActivity * 0.038) + sectionIndex * 0.73;
        float wAurora = weight(style, 0.0), wStars = weight(style, 1.0);
        float wScore = weight(style, 2.0), wGeometry = weight(style, 3.0);

        // Aurora: fabric-like filaments and a broad moving color ribbon.
        float curtain = sin(p.x * 6.0 + sin(p.y * 5.0 + t * 3.0) * 1.3 - t * 2.0);
        float filament = smoothstep(0.9, 0.995, curtain) * (0.2 + shapedActivity * 0.28);
        float auroraY = 0.2 * sin(p.x * 2.7 - t * 1.7) + 0.08 * sin(p.x * 7.0 + t);
        float aurora = exp(-abs(p.y - auroraY) * (7.0 - shapedActivity * 1.8));

        // Constellations: round nodes with restrained links on a coarse field.
        vec2 starGrid = vec2(24.0, 12.0), starCell = floor(vUv * starGrid)
          , starLocal = fract(vUv * starGrid) - 0.5;
        float starSeed = hash(starCell + floor(sectionIndex) * 19.7);
        float node = step(0.73 - shapedActivity * 0.1, starSeed) * smoothstep(0.16, 0.025, length(starLocal));
        float linkH = step(0.72, starSeed) * step(0.68, hash(starCell + vec2(1.0, 0.0))) * smoothstep(0.045, 0.012, abs(starLocal.y));
        float linkD = step(0.8, starSeed) * smoothstep(0.04, 0.012, abs(starLocal.y - starLocal.x * 0.5));
        float constellation = node + (linkH + linkD) * 0.28;

        // Flowing score: five-line systems with note heads travelling right.
        float systemY = abs(p.y) < 0.34 ? p.y : 9.0;
        float staffCoord = (systemY + 0.24) / 0.12;
        float staff = smoothstep(0.07, 0.018, abs(fract(staffCoord) - 0.5)) * step(abs(systemY), 0.31);
        vec2 noteGrid = vec2(fract(vUv.x * 11.0 - t * 0.42), fract((vUv.y + sectionIndex * 0.071) * 10.0));
        vec2 noteP = noteGrid - vec2(0.5);
        float noteSeed = hash(floor(vec2(vUv.x * 11.0 - t * 0.42, (vUv.y + sectionIndex * 0.071) * 10.0)));
        float noteHead = step(0.58 - shapedActivity * 0.2, noteSeed) * smoothstep(0.2, 0.055, length(noteP * vec2(0.7, 1.4)));
        float scoreMarks = staff * 0.36 + noteHead;

        // Geometry: centered rings and rotating polygon-like radial spokes.
        vec2 gp = (p - vec2(focusX, 0.02)) * vec2(0.72, 1.0);
        float radius = length(gp), angle = atan(gp.y, gp.x);
        float rings = smoothstep(0.86, 0.99, sin(radius * (17.0 + shapedActivity * 4.0) - t * 5.0 - shapedEnergy * 1.8));
        rings *= smoothstep(1.05, 0.1, radius) * (0.16 + shapedEnergy * 0.42);
        float spokes = smoothstep(0.9, 0.995, sin(angle * (5.0 + mod(sectionIndex, 3.0)) + t * 2.2)) * smoothstep(0.98, 0.18, radius);
        float geometryPattern = rings + spokes * 0.2;

        float paletteTurn = fract(sectionIndex * 0.37);
        vec3 sectionCool = mix(cool, violet, paletteTurn * 0.42);
        vec3 sectionWarm = mix(warm, cool, paletteTurn * 0.25);
        vec3 gradient = mix(violet, sectionCool, clamp(vUv.x + focusX * 0.45, 0.0, 1.0));
        vec3 color = dark;
        color += wAurora * gradient * (aurora * 0.32 + filament * 0.27);
        color += wStars * mix(sectionCool, sectionWarm, shapedEnergy) * constellation * (0.3 + shapedEnergy * 0.22);
        color += wScore * mix(sectionCool, sectionWarm, vUv.x) * scoreMarks * (0.28 + shapedEnergy * 0.25);
        color += wGeometry * mix(sectionCool, sectionWarm, shapedEnergy * 0.7) * geometryPattern * 0.42;
        float boundaryGlow = exp(-sectionProgress * 8.0) * 0.08;
        color += sectionWarm * (shapedEnergy * shapedEnergy * 0.05 + boundaryGlow);
        float vignette = smoothstep(1.1, 0.28, length(p * vec2(0.62, 1.0)));
        color *= 0.42 + vignette * 0.78;
        gl_FragColor = vec4(color, 1.0);
      }
    `,
    side: THREE.DoubleSide,
  })
  const screen = new THREE.Mesh(geometry, material)
  screen.position.set(0, 250, -535); root.add(screen)
  const frameMaterial = new THREE.MeshStandardMaterial({ color: 0x111525, roughness: 0.46, metalness: 0.58 })
  for (const x of [-535, 535]) {
    const wing = new THREE.Mesh(new THREE.BoxGeometry(18, 520, 24), frameMaterial)
    wing.position.set(x, 250, -440); root.add(wing)
  }
  const top = new THREE.Mesh(new THREE.BoxGeometry(1085, 16, 24), frameMaterial)
  top.position.set(0, 505, -490); root.add(top)
  const apron = new THREE.Mesh(new THREE.CircleGeometry(310, 96), new THREE.MeshPhysicalMaterial({ color: 0x080a13, roughness: 0.4, clearcoat: 0.45, clearcoatRoughness: 0.25 }))
  apron.rotation.x = -Math.PI / 2; apron.position.set(0, 0.25, -60); apron.receiveShadow = true; root.add(apron)
  const edge = new THREE.Mesh(new THREE.TorusGeometry(310, 1.2, 8, 96), new THREE.MeshBasicMaterial({ color: 0x617bd7, toneMapped: false }))
  edge.rotation.x = Math.PI / 2; edge.position.set(0, 0.8, -60); root.add(edge)
  return {
    root,
    update(dt, elapsed, signal = {}) {
      const section = signal.section || {}
      uniforms.stageTime.value = Number.isFinite(signal.time) ? signal.time : elapsed
      const fixed = PROJECTION_STYLES[signal.style] || PROJECTION_STYLES.auto
      const targetStyle = fixed.uniform ?? (signal.sectionsEnabled && Number.isFinite(section.style) ? section.style : 0)
      uniforms.style.value += (targetStyle - uniforms.style.value) * Math.min(1, dt * 0.75)
      uniforms.energy.value += ((signal.energy || 0) - uniforms.energy.value) * Math.min(1, dt * 4.5)
      uniforms.activity.value += ((signal.activity || 0) - uniforms.activity.value) * Math.min(1, dt * 2.2)
      uniforms.register.value += ((signal.register || 0) - uniforms.register.value) * Math.min(1, dt * 1.8)
      uniforms.sectionEnergy.value += ((signal.sectionsEnabled ? section.energy : signal.energy) || 0) * Math.min(1, dt * 1.4) - uniforms.sectionEnergy.value * Math.min(1, dt * 1.4)
      uniforms.sectionDensity.value += ((signal.sectionsEnabled ? section.density : signal.activity) || 0) * Math.min(1, dt * 1.4) - uniforms.sectionDensity.value * Math.min(1, dt * 1.4)
      uniforms.sectionRegister.value += ((signal.sectionsEnabled ? section.register : signal.register) || 0) * Math.min(1, dt * 1.2) - uniforms.sectionRegister.value * Math.min(1, dt * 1.2)
      uniforms.sectionIndex.value = signal.sectionsEnabled ? section.index || 0 : 0
      uniforms.sectionProgress.value = signal.sectionsEnabled && Number.isFinite(section.progress) ? section.progress : 0.5
      edge.material.color.setRGB(0.32 + uniforms.energy.value * 0.42, 0.43, 0.85 - uniforms.energy.value * 0.25)
    },
  }
}

export function createStagePresetSystem({ THREE, Water, Sky, scene, renderer, piano, lights, floor, contactShadow, lowQuality = false }) {
  const pmrem = new THREE.PMREMGenerator(renderer)
  const buildEnvironment = environmentBuilders(THREE, pmrem)
  const environments = new Map(), backgrounds = new Map(), props = new Map()
  let activeName = 'stage', lightingChoice = 'auto', lessonMode = false, projectionStyle = 'auto', projectionSections = true

  const obtainProps = name => {
    if (!name) return null
    if (!props.has(name)) {
      const factories = { candle: candleChamber, water: blueHourWater, projection: projectionCyclorama }
      const value = factories[name]?.(THREE, lowQuality, { Water, Sky, piano, renderer, scene })
      if (!value) return null
      value.root.visible = false; scene.add(value.root); props.set(name, value)
    }
    return props.get(name)
  }
  const applyNode = (node, spec) => {
    node.color.setHex(spec.color)
    if (spec.position) node.position.set(...spec.position)
    if (node.target && spec.target) node.target.position.set(...spec.target)
  }
  const applyLighting = (amount = 1) => {
    const stage = STAGE_PRESETS[activeName], name = lightingChoice === 'auto' ? stage.lighting : lightingChoice
    const preset = LIGHTING_PRESETS[name] || LIGHTING_PRESETS[stage.lighting]
    for (const role of ['key', 'back', 'fill']) {
      const node = lights[role], spec = preset[role]; applyNode(node, spec)
      node.intensity = spec.intensity * (spec.sqrt ? Math.sqrt(amount) : amount)
    }
    lights.lid.color.setHex(preset.lid.color); lights.lid.intensity = preset.lid.intensity * amount
    lights.lid.visible = piano.lidMode !== 'closed'
    return name
  }
  const refreshVisibility = () => {
    const stage = STAGE_PRESETS[activeName]
    floor.visible = !lessonMode && stage.floor.visible
    contactShadow.visible = !lessonMode
    for (const value of props.values()) value.root.visible = !lessonMode && value === props.get(stage.props)
  }
  const setStage = name => {
    activeName = STAGE_PRESETS[name] ? name : 'stage'
    const preset = STAGE_PRESETS[activeName]
    if (!environments.has(preset.environment)) environments.set(preset.environment, buildEnvironment[preset.environment]())
    scene.environment = environments.get(preset.environment); scene.environmentIntensity = preset.environmentIntensity
    if (preset.background === 'blueHour') {
      if (!backgrounds.has('blueHour')) backgrounds.set('blueHour', blueHourBackground(THREE))
      scene.background = backgrounds.get('blueHour')
    } else scene.background = new THREE.Color(preset.background)
    floor.material.color.setHex(preset.floor.color)
    obtainProps(preset.props)
    refreshVisibility(); applyLighting(Number(document.getElementById('light')?.value || 1))
    return activeName
  }
  return {
    setStage,
    setLighting(name) { lightingChoice = name === 'auto' || LIGHTING_PRESETS[name] ? name : 'auto'; return applyLighting(Number(document.getElementById('light')?.value || 1)) },
    applyLighting,
    setLessonMode(value) { lessonMode = !!value; refreshVisibility() },
    update(dt, time, signal) { const preset = STAGE_PRESETS[activeName], value = props.get(preset.props); if (!lessonMode) value?.update?.(dt, time, { ...signal, style: projectionStyle, sectionsEnabled: projectionSections }) },
    setProjectionStyle(name) { projectionStyle = PROJECTION_STYLES[name] ? name : 'auto'; return projectionStyle },
    setProjectionSections(value) { projectionSections = !!value; return projectionSections },
    get projectionStyle() { return projectionStyle },
    get projectionSections() { return projectionSections },
    get allowsDust() { return !!STAGE_PRESETS[activeName].dust },
    get active() { return activeName },
    get lighting() { return lightingChoice },
    get resolvedLighting() { return lightingChoice === 'auto' ? STAGE_PRESETS[activeName].lighting : lightingChoice },
    shot(name) {
      const shot = STAGE_PRESETS[activeName].shots?.[name] || STAGE_PRESETS.stage.shots[name]
      return shot ? { ...shot, pos: [...shot.pos], target: [...shot.target] } : null
    },
    presets: STAGE_PRESETS,
    lightingPresets: LIGHTING_PRESETS,
  }
}
