// Stage and cel look for Experiment #037.
//
//  • buildStage: a dark concert stage (black floor with a soft warm pool under
//    one spotlight, a back light rimming the figure from behind, a dim hall
//    beyond), in the manner of Nodame Cantabile's concert scenes
//    (research/02_character_look.md §1).
//  • toonify: the #033 violin and bow get flat two-tone toon materials and an
//    ink outline of constant screen width (an inverted hull pushed out in
//    clip space, so a stretched string or a scaled part keeps the same line).
//  • tuneMToon: the VRoid MToon materials made a little more two-tone, with a
//    warm rim, and dimmed so they don't burn out under the spotlight.
//
// Units: centimetres, the violinist at the origin facing +z.

import * as THREE from 'three'

let ramp = null
export function toonRamp() {
  if (ramp) return ramp
  const d = new Uint8Array([110, 100, 110, 255, 255, 255, 255, 255])
  ramp = new THREE.DataTexture(d, 2, 1, THREE.RGBAFormat)
  ramp.minFilter = ramp.magFilter = THREE.NearestFilter
  ramp.needsUpdate = true
  return ramp
}

/** Back faces pushed out by `px` pixels in clip space, drawn in ink. */
export function inkMaterial(px = 1.6, color = 0x1a0f0c) {
  return new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: { width: { value: px }, res: { value: new THREE.Vector2(1920, 1080) }, color: { value: new THREE.Color(color) } },
    vertexShader: `
      uniform float width; uniform vec2 res;
      void main() {
        vec4 c = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        vec3 n = normalize(normalMatrix * normal);
        vec2 d = (projectionMatrix * vec4(n, 0.0)).xy;
        float l = length(d);
        if (l > 1e-5) c.xy += d / l * width * 2.0 / res * c.w;
        gl_Position = c;
      }`,
    fragmentShader: `uniform vec3 color; void main() { gl_FragColor = vec4(color, 1.0); }`,
  })
}

const inks = new Set()
export function setInkResolution(w, h) { for (const m of inks) m.uniforms.res.value.set(w, h) }

/** Toon materials and ink outlines on every mesh under the given groups. Returns the outline meshes. */
export function toonify(groups, { px = 1.4 } = {}) {
  const outlines = []
  const ink = inkMaterial(px)
  inks.add(ink)
  const cache = new Map()
  for (const g of groups) g.traverse(o => {
    if (!o.isMesh || o.userData.ink) return
    const src = o.material
    if (!cache.has(src)) {
      const m = new THREE.MeshToonMaterial({
        color: src.color ? src.color.clone() : new THREE.Color(1, 1, 1), map: src.map || null, gradientMap: toonRamp(),
        transparent: src.transparent, opacity: src.opacity, side: src.side, depthWrite: src.depthWrite,
        emissive: src.emissive ? src.emissive.clone() : new THREE.Color(0), emissiveIntensity: src.emissiveIntensity ?? 1,
      })
      if (src.metalness > 0.5) m.color.multiplyScalar(0.8)
      cache.set(src, m)
    }
    o.material = cache.get(src)
    // no ink on the transparent string blur, the hair ribbon or very thin parts
    o.geometry.computeBoundingSphere()
    if (src.transparent || o.geometry.type === 'PlaneGeometry') return
    if (o.geometry.type === 'CylinderGeometry' && o.geometry.parameters.radiusTop < 0.2) return
    const ol = new THREE.Mesh(o.geometry, ink)
    ol.userData.ink = true
    ol.castShadow = false
    o.add(ol)
    outlines.push(ol)
  })
  return outlines
}

/** VRoid MToon: crisper two-tone, warm rim, colours scaled for the stage light. */
export function tuneMToon(vrm, { gain = 0.85 } = {}) {
  vrm.scene.traverse(o => {
    if (!o.isMesh) return
    for (const m of [].concat(o.material)) {
      if (!m.isMToonMaterial) continue
      const g = /HAIR/.test(m.name) ? Math.sqrt(gain) : gain
      if (m.color) m.color.multiplyScalar(g)
      if (m.shadeColorFactor) m.shadeColorFactor.multiplyScalar(g)
      if ('shadingToonyFactor' in m) m.shadingToonyFactor = Math.max(m.shadingToonyFactor, 0.92)
      if ('parametricRimColorFactor' in m) {
        m.parametricRimColorFactor.setRGB(1.0, 0.72, 0.42).multiplyScalar(0.35)
        m.parametricRimFresnelPowerFactor = 4
        m.parametricRimLiftFactor = 0.05
      }
      // the outline is in the model's units (metres) and scales with it
      if ('giEqualizationFactor' in m) m.giEqualizationFactor = 0.9
    }
  })
}

export function buildStage(scene, renderer) {
  scene.background = new THREE.Color(0x050405)
  scene.fog = new THREE.Fog(0x050405, 900, 3200)
  // floor: dark lacquered boards, a warm pool painted under the spot
  const c = document.createElement('canvas')
  c.width = c.height = 1024
  const g = c.getContext('2d')
  g.fillStyle = '#120c09'; g.fillRect(0, 0, 1024, 1024)
  for (let i = 0; i < 64; i++) { g.fillStyle = `rgba(${40 + (i * 37) % 20},${24 + (i * 13) % 10},16,${0.25 + ((i * 7) % 5) / 20})`; g.fillRect(i * 16, 0, 15, 1024) }
  g.fillStyle = 'rgba(0,0,0,0.5)'; for (let i = 0; i < 64; i++) g.fillRect(i * 16 + 15, 0, 1, 1024)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(6, 6)
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(3200, 1400), new THREE.MeshToonMaterial({ map: tex, gradientMap: toonRamp(), color: 0x8a7a70 }))
  floor.rotation.x = -Math.PI / 2
  floor.position.z = -230
  floor.receiveShadow = true
  scene.add(floor)
  // the pool of light on the boards (a soft decal, as anime paints it)
  const pc = document.createElement('canvas')
  pc.width = pc.height = 256
  const pg = pc.getContext('2d')
  const rg = pg.createRadialGradient(128, 128, 10, 128, 128, 128)
  rg.addColorStop(0, 'rgba(255,200,130,0.55)'); rg.addColorStop(0.55, 'rgba(255,170,90,0.22)'); rg.addColorStop(1, 'rgba(255,150,70,0)')
  pg.fillStyle = rg; pg.fillRect(0, 0, 256, 256)
  const pool = new THREE.Mesh(new THREE.PlaneGeometry(420, 420), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(pc), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }))
  pool.rotation.x = -Math.PI / 2
  pool.position.set(0, 0.3, 20)
  scene.add(pool)
  // back of the stage: a dark wooden shell fading into black
  const shell = new THREE.Mesh(new THREE.CylinderGeometry(900, 900, 900, 64, 1, true, Math.PI * 0.6, Math.PI * 0.8),
    new THREE.MeshToonMaterial({ color: 0x1c120c, gradientMap: toonRamp(), side: THREE.BackSide }))
  shell.position.set(0, 450, 300)
  scene.add(shell)
  // lights: one warm key spot from the front-left above, a cool back rim, a dim fill
  const key = new THREE.SpotLight(0xffe2b8, 4.2, 0, 0.28, 0.6, 0)
  key.position.set(-260, 620, 520)
  key.target.position.set(10, 110, 10)
  key.castShadow = true
  key.shadow.mapSize.set(2048, 2048)
  key.shadow.camera.near = 300; key.shadow.camera.far = 1400
  key.shadow.bias = -0.0004
  key.shadow.normalBias = 0.6
  const rim = new THREE.SpotLight(0xbcd0ff, 3, 0, 0.3, 0.7, 0)
  rim.position.set(240, 520, -520)
  rim.target.position.set(0, 130, 0)
  const fill = new THREE.HemisphereLight(0xffe6cc, 0x1a1210, 0.55)
  scene.add(key, key.target, rim, rim.target, fill)
  // a few rows of the dim hall beyond the stage edge (silhouettes)
  const seats = new THREE.InstancedMesh(new THREE.BoxGeometry(48, 70, 40), new THREE.MeshBasicMaterial({ color: 0x0b0808 }), 400)
  let n = 0
  const m = new THREE.Matrix4()
  for (let r = 0; r < 10; r++) for (let i = -20; i < 20; i++) m.makeTranslation(i * 56 + (r % 2) * 28, -60 + r * 22, 520 + r * 90), seats.setMatrixAt(n++, m)
  scene.add(seats)
  const edge = new THREE.Mesh(new THREE.BoxGeometry(3200, 100, 10), new THREE.MeshBasicMaterial({ color: 0x0a0706 }))
  edge.position.set(0, -50, 470)
  scene.add(edge)
  setInkResolution(renderer.domElement.width, renderer.domElement.height)
  addEventListener('resize', () => setTimeout(() => setInkResolution(renderer.domElement.width, renderer.domElement.height), 0))
  return { key, rim, fill, floor, update(t) {} }
}
