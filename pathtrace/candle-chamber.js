// Experiment #045: the candlelit chamber for the pianist's stage.
//
// A copy of the Candlelit chamber from #030's stage presets
// (concertstage/stage-presets.js: candleChamber, its environment panels and
// its light colours), kept here so #045 does not depend on that file while it
// is being worked on. If the two diverge, that file is the original.
//
//   const set = buildCandleChamber(THREE, lowQuality)   // { root, update(dt, time) }
//   const env = candleEnvironment(THREE)                // { scene, sigma, far }: the panels, for PMREM and the path tracers
//
// Turned a quarter round from #030's (FACING): #030 puts the back wall across
// the keyboard from her (-z), so she plays facing it with her back to the
// hall. In a recital the piano stands side-on, its lid opening to the hall
// (+x, the audience side, az 90 in pianist/director.js) and the wall behind
// the piano's spine (-x): here the wall, the candle tiers and the panels'
// glow are there, and the side candles in front of the keyboard and past the tail.
export const FACING = Math.PI / 2
//   CANDLE: background, environment intensity, and #030's candle and concert light rigs

export const CANDLE = {
  environmentIntensity: 0.68,   // (#030's black stage: 0.7)
  stageEnvironmentIntensity: 0.7,
  background: 0x080302,
  lights: {
    key: { color: 0xffbf78, intensity: 4.8 }, back: { color: 0xff8e48, intensity: 2.4 },
    fill: { color: 0xffddb5, intensity: 1.15 }, lid: { color: 0xff9b55, intensity: 0.72 },
  },
  // #030's concert rig, to scale the page's own lights by
  concert: { key: 6, back: 4, fill: 0.9, lid: 0.55 },
}

const seeded = (start = 1) => {
  let state = start
  return () => (state = state * 16807 % 2147483647) / 2147483647
}

export function candleEnvironment(THREE) {
  const panel = (scene, width, height, position, intensity, color = 0xffffff, look = [0, 80, -60]) => {
    const material = new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity), side: THREE.DoubleSide })
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material)
    mesh.position.set(...position); mesh.lookAt(...look); scene.add(mesh)
  }
  const floor = (scene, color, y = -80) => {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000), new THREE.MeshBasicMaterial({ color }))
    mesh.rotation.x = -Math.PI / 2; mesh.position.y = y; scene.add(mesh)
  }
  // (#030 prefilters the panels here; the caller does, so they stay for the path tracers)
  const s = new THREE.Scene(); s.background = new THREE.Color(0x050201)
  panel(s, 380, 260, [-230, 450, 260], 5.5, 0xffa85e)
  panel(s, 1100, 170, [0, 560, -300], 0.65, 0xff8d48)
  panel(s, 90, 420, [-700, 210, -240], 2.5, 0xff7235)
  panel(s, 90, 420, [700, 210, -240], 2.2, 0xff8a45)
  panel(s, 700, 280, [100, 260, -850], 0.7, 0x864020)
  floor(s, 0x120705)
  // (the room turned with the set; the first panel is the key light's own and stays)
  const up = new THREE.Vector3(0, 1, 0)
  s.children.slice(1, 5).forEach(m => { m.position.applyAxisAngle(up, FACING); m.lookAt(new THREE.Vector3(0, 80, -60).applyAxisAngle(up, FACING)) })
  return { scene: s, sigma: 0.025, far: 5000 }
}

export function buildCandleChamber(THREE, lowQuality = false) {
  const root = new THREE.Group(); root.name = 'stage-candlelit-chamber'
  root.rotation.y = FACING
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

  // (#030: 220; a few more here, and a third group in front, so the candles
  // stand round the piano on every side but the wall's)
  const count = lowQuality ? 160 : 300, random = seeded(30)
  const waxGeometry = new THREE.CylinderGeometry(0.72, 0.92, 1, 8)
  const wax = new THREE.InstancedMesh(waxGeometry, new THREE.MeshStandardMaterial({ color: 0xf1cda0, roughness: 0.78 }), count)
  const flameGeometry = new THREE.SphereGeometry(0.75, 7, 5)
  const flameMaterial = new THREE.MeshBasicMaterial({ color: 0xffbd61, toneMapped: false })
  const flames = new THREE.InstancedMesh(flameGeometry, flameMaterial, count)
  const matrix = new THREE.Matrix4(), quaternion = new THREE.Quaternion(), scale = new THREE.Vector3()
  const flamePositions = new Float32Array(count * 3)
  // each flame's own flicker: [x, y, z, width, height, phase, rate]
  const flameParts = new Float32Array(count * 7)
  for (let i = 0; i < count; i++) {
    let x, z, front = false
    if (i < count * 0.5) {
      x = (random() - 0.5) * 900; z = -250 - random() * 205
    } else if (i < count * 0.78) {
      const side = random() < 0.5 ? -1 : 1
      x = side * (215 + random() * 285); z = 130 - random() * 430
    } else {
      // in front (the hall's side): an arc round the piano's middle (x 75 here),
      // kept 60 cm and more off the open lid, shorter so they don't hide it
      front = true
      const a = (random() * 2 - 1) * 55 * Math.PI / 180, r = 1.1 + random() * 0.3
      x = 75 + 330 * Math.sin(a) * r; z = 240 * Math.cos(a) * r
    }
    // Leave the piano and bench footprint clear (here, turned: the piano runs
    // along this x, from the bench at -60 to the tail at +211)
    if (!front && Math.abs(x) < 235 && z > -265) x += x < 0 ? -240 : 240
    const baseY = z < -370 ? 18 : z < -300 ? 9 : 0
    const height = front ? 5 + random() * 11 : 8 + random() * 19, radius = 0.78 + random() * 0.58
    scale.set(radius, height, radius); matrix.compose(new THREE.Vector3(x, baseY + height / 2, z), quaternion, scale); wax.setMatrixAt(i, matrix)
    const fy = baseY + height + 1.4
    scale.set(radius * 0.82, 3.1 + random(), radius * 0.82); matrix.compose(new THREE.Vector3(x, fy, z), quaternion, scale); flames.setMatrixAt(i, matrix)
    flamePositions.set([x, fy, z], i * 3)
    flameParts.set([x, fy, z, scale.x, scale.y, random() * Math.PI * 2, 0.8 + 0.5 * random()], i * 7)
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
  // (each glow's brightness, per point: its flame's flicker)
  const glowShade = new Float32Array(count * 3).fill(1)
  glowGeometry.setAttribute('color', new THREE.BufferAttribute(glowShade, 3))
  const glowMaterial = new THREE.PointsMaterial({ color: 0xffb05b, size: 11, vertexColors: true, map: new THREE.CanvasTexture(glowCanvas), transparent: true, opacity: 0.58, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })
  const flameGlows = new THREE.Points(glowGeometry, glowMaterial); flameGlows.renderOrder = 3; root.add(flameGlows)

  const glowPositions = [[-260, 48, -335], [260, 48, -335], [-350, 42, 20], [350, 42, 15], [75, 32, 225]]
  const glowLights = glowPositions.map((position, index) => {
    const light = new THREE.PointLight(0xff843f, 82, 270, 2)
    light.position.set(...position); light.userData.phase = index * 1.7; root.add(light); return light
  })
  const poolCanvas = document.createElement('canvas'); poolCanvas.width = poolCanvas.height = 128
  const pg = poolCanvas.getContext('2d'), poolGradient = pg.createRadialGradient(64, 64, 0, 64, 64, 64)
  poolGradient.addColorStop(0, '#ffffff'); poolGradient.addColorStop(0.35, '#777777'); poolGradient.addColorStop(1, '#000000')
  pg.fillStyle = poolGradient; pg.fillRect(0, 0, 128, 128)
  const poolAlpha = new THREE.CanvasTexture(poolCanvas)
  for (const [x, z, radius] of [[-280, -335, 115], [280, -335, 115], [-365, 5, 105], [365, 5, 105], [75, 230, 130]]) {
    const pool = new THREE.Mesh(new THREE.CircleGeometry(radius, 40), new THREE.MeshBasicMaterial({ color: 0xb84a20, alphaMap: poolAlpha, transparent: true, opacity: 0.18, depthWrite: false, blending: THREE.AdditiveBlending }))
    pool.rotation.x = -Math.PI / 2; pool.position.set(x, 0.35, z); root.add(pool)
  }
  return {
    root,
    update(_dt, time) {
      for (const light of glowLights) light.intensity = 80 + Math.sin(time * 2.7 + light.userData.phase) * 7 + Math.sin(time * 6.1 + light.userData.phase) * 3
      // every flame on its own: its own phase and rate, a slow wander and a
      // quicker shiver, taller as it brightens, its glow with it
      const m = matrix, p = new THREE.Vector3(), sc = scale
      for (let i = 0; i < count; i++) {
        const o = i * 7, ph = flameParts[o + 5], k = flameParts[o + 6]
        const f = Math.sin(time * 3.1 * k + ph) * 0.06 + Math.sin(time * 7.9 * k + 2.3 * ph) * 0.035 + Math.sin(time * 13.7 * k + 4.1 * ph) * 0.015
        p.set(flameParts[o], flameParts[o + 1] + f * flameParts[o + 4] * 0.5, flameParts[o + 2])
        sc.set(flameParts[o + 3] * (1 - 0.4 * f), flameParts[o + 4] * (1 + f), flameParts[o + 3] * (1 - 0.4 * f))
        flames.setMatrixAt(i, m.compose(p, quaternion, sc))
        glowShade[i * 3] = glowShade[i * 3 + 1] = glowShade[i * 3 + 2] = 1 + 1.6 * f
      }
      flames.instanceMatrix.needsUpdate = true
      glowGeometry.attributes.color.needsUpdate = true
    },
  }
}
