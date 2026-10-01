/**
 * stage.js — three.js scene for the 3D notation player: extruded score on a
 * marble / paper table, glowing notehead "balls" (one per staff) that hop onto
 * each onset leaving arc streaks, sparkle + dust particles, played notes that
 * stay lit, a 3D title, bloom and a follow camera. Look inspired by Note Bounce.
 */
import * as THREE from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { FontLoader } from 'three/addons/loaders/FontLoader.js'
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js'

const TITLE_FONT = 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/fonts/droid/droid_serif_bold.typeface.json'

export const STAFF_COLORS = ['#ff8a2a', '#2f86ff', '#ff4f8b', '#3ee0b0', '#ffd23f', '#b06bff', '#7cff4f', '#4fd8ff']

// playedGlow > 0: played noteheads stay lit (emissive, feeds bloom)
export const THEMES = {
	marble: {
		surface: 'marble', bgTop: '#3a4148', bgBottom: '#15181b', ink: '#0b0c0e', staff: '#121417', text: '#0d0e10',
		fog: '#1f2428', hemi: 0.5, key: 1.2, env: 0.3, bloom: 1.15, threshold: 0.95, playedMix: 1, playedGlow: 2.2,
		title: '#1fae8a', titleGlow: 0.55, roughness: 0.55,
	},
	night: {
		bgTop: '#2a2219', bgBottom: '#0d0b08', paper: '#211c15', ink: '#e2d2ae', staff: '#9a876a', text: '#cdb991',
		fog: '#120f0b', hemi: 0.45, key: 2.0, env: 0.3, bloom: 0.8, threshold: 1.05, playedMix: 0.75,
		title: '#d4a056', titleGlow: 0.5, roughness: 0.92,
	},
	paper: {
		bgTop: '#d9ccb0', bgBottom: '#8f826a', paper: '#e6dbc3', ink: '#120d08', staff: '#2e261c', text: '#1c160f',
		fog: '#c9bc9f', hemi: 0.45, key: 1.5, env: 0.25, bloom: 0.45, threshold: 1.15, playedMix: 0.85,
		title: '#7a1f2b', titleGlow: 0, roughness: 0.92,
	},
}

// Camera offsets in score space (x right, y up the page, z out of the page),
// as multiples of the framing distance. `hop` = axis the balls bounce along.
export const VIEWS = {
	bounce: { offset: [-0.42, -0.78, 0.5], lead: 0.1, hop: 'z', fov: 40, up: [0, 0, 1] },
	flat: { offset: [0, 0, 1], lead: 0.18, hop: 'y', fov: 30 },
	tilt: { offset: [-0.12, -0.32, 0.94], lead: 0.2, hop: 'y', fov: 34 },
	table: { offset: [0, -0.95, 0.62], lead: 0.12, hop: 'z', fov: 38, up: [0, 0, 1] },
	low: { offset: [-0.5, -0.9, 0.3], lead: 0.12, hop: 'z', fov: 42, up: [0, 0, 1] },
	free: { offset: [-0.2, -0.6, 0.8], lead: 0.15, hop: 'z', fov: 38 },
}

const BALL_R = 0.48
const QUALITY_TIERS = [
	{ pr: 1, msaa: true },
	{ pr: 1 },
	{ pr: 0.85 },
	{ pr: 0.7, noShadow: true },
	{ pr: 0.55, noShadow: true },
]
const STREAK_N = 36        // samples along each arc streak
const STREAK_SPAN = 0.34   // seconds of trajectory the streak covers

function gradientTexture(top, bottom) {
	const c = document.createElement('canvas')
	c.width = 2; c.height = 256
	const g = c.getContext('2d')
	const grd = g.createLinearGradient(0, 0, 0, 256)
	grd.addColorStop(0, top); grd.addColorStop(1, bottom)
	g.fillStyle = grd; g.fillRect(0, 0, 2, 256)
	const t = new THREE.CanvasTexture(c)
	t.colorSpace = THREE.SRGBColorSpace
	return t
}

function paperTexture() {
	const c = document.createElement('canvas')
	c.width = c.height = 256
	const g = c.getContext('2d')
	const img = g.createImageData(256, 256)
	for (let i = 0; i < img.data.length; i += 4) {
		const v = 236 + Math.random() * 19
		img.data[i] = img.data[i + 1] = img.data[i + 2] = v
		img.data[i + 3] = 255
	}
	g.putImageData(img, 0, 0)
	g.globalAlpha = 0.05
	for (let i = 0; i < 160; i++) {
		g.strokeStyle = Math.random() < 0.5 ? '#000' : '#fff'
		g.beginPath()
		const x = Math.random() * 256, y = Math.random() * 256, a = Math.random() * Math.PI
		g.moveTo(x, y); g.lineTo(x + Math.cos(a) * 30, y + Math.sin(a) * 30)
		g.stroke()
	}
	const t = new THREE.CanvasTexture(c)
	t.wrapS = t.wrapT = THREE.RepeatWrapping
	t.colorSpace = THREE.SRGBColorSpace
	return t
}

/** Tileable procedural marble (colour + bump). Dark slate with pale and warm veins. */
function marbleTextures(size = 512) {
	const hash = (i, j, s) => { const v = Math.sin(i * 127.1 + j * 311.7 + s * 74.7) * 43758.5453; return v - Math.floor(v) }
	const noise = (x, y, period, s) => {
		const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi
		const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf)
		const w = i => ((i % period) + period) % period
		const a = hash(w(xi), w(yi), s), b = hash(w(xi + 1), w(yi), s)
		const c = hash(w(xi), w(yi + 1), s), d = hash(w(xi + 1), w(yi + 1), s)
		return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v
	}
	const fbm = (x, y, s) => { let f = 0, amp = 0.5, P = 4; for (let o = 0; o < 6; o++) { f += amp * noise(x, y, P, s); x *= 2; y *= 2; P *= 2; amp *= 0.5 } return f }
	const col = document.createElement('canvas'), bmp = document.createElement('canvas')
	col.width = col.height = bmp.width = bmp.height = size
	const ci = col.getContext('2d').createImageData(size, size), bi = bmp.getContext('2d').createImageData(size, size)
	for (let py = 0; py < size; py++) for (let px = 0; px < size; px++) {
		const x = px / size * 4, y = py / size * 4
		const n = fbm(x, y, 1), n2 = fbm(x + 7.3, y + 2.1, 2)
		// sin args are periodic over the 4-unit tile (coefficients × 4 are even)
		const v1 = Math.pow(1 - Math.abs(Math.sin((x * 0.5 + y * 0.5 + n * 3.2) * Math.PI)), 18)
		const v2 = Math.pow(1 - Math.abs(Math.sin((x * 1.5 - y * 0.5 + n2 * 4.0) * Math.PI)), 30)
		const mott = n * 0.6 + n2 * 0.4
		let r = 30 + mott * 26, g = 36 + mott * 28, b = 41 + mott * 30
		r += v1 * 30; g += v1 * 33; b += v1 * 36           // pale grey veins
		r += v2 * 48; g += v2 * 32; b += v2 * 12           // warm brown/gold veins
		const k = (py * size + px) * 4
		ci.data[k] = Math.min(255, r); ci.data[k + 1] = Math.min(255, g); ci.data[k + 2] = Math.min(255, b); ci.data[k + 3] = 255
		const h = 160 + mott * 60 - (v1 * 50 + v2 * 70)    // veins slightly recessed
		bi.data[k] = bi.data[k + 1] = bi.data[k + 2] = Math.max(0, Math.min(255, h)); bi.data[k + 3] = 255
	}
	col.getContext('2d').putImageData(ci, 0, 0)
	bmp.getContext('2d').putImageData(bi, 0, 0)
	const map = new THREE.CanvasTexture(col), bump = new THREE.CanvasTexture(bmp)
	for (const t of [map, bump]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8 }
	map.colorSpace = THREE.SRGBColorSpace
	return { map, bump }
}

/** Ring-buffer point sprites with gravity along the current "up" axis. */
class Particles {
	constructor(max, { size, texture, gravity = 14, drag = 0.985, floor = true, blending = THREE.AdditiveBlending, opacity = 1 }) {
		this.max = max
		this.pos = new Float32Array(max * 3); this.vel = new Float32Array(max * 3)
		this.col = new Float32Array(max * 3); this.base = new Float32Array(max * 3)
		this.life = new Float32Array(max); this.life0 = new Float32Array(max)
		this.next = 0; this.gravity = gravity; this.drag = drag; this.floor = floor; this.alive = false
		const geo = new THREE.BufferGeometry()
		geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage))
		geo.setAttribute('color', new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage))
		this.points = new THREE.Points(geo, new THREE.PointsMaterial({
			size, map: texture, vertexColors: true, transparent: true, depthWrite: false, blending, toneMapped: false, opacity,
		}))
		this.points.frustumCulled = false
	}
	spawn(x, y, z, vx, vy, vz, life, r, g, b) {
		const k = this.next++ % this.max, i = k * 3
		this.pos[i] = x; this.pos[i + 1] = y; this.pos[i + 2] = z
		this.vel[i] = vx; this.vel[i + 1] = vy; this.vel[i + 2] = vz
		this.base[i] = r; this.base[i + 1] = g; this.base[i + 2] = b
		this.life[k] = this.life0[k] = life
	}
	update(dt, upAxis) {
		let alive = false
		const { pos, vel, col, base, life, life0, drag } = this
		for (let k = 0; k < this.max; k++) {
			const i = k * 3
			if (life[k] <= 0) { if (col[i] || col[i + 1] || col[i + 2]) col[i] = col[i + 1] = col[i + 2] = 0; continue }
			alive = true
			life[k] -= dt
			vel[i + upAxis] -= this.gravity * dt
			vel[i] *= drag; vel[i + 1] *= drag; vel[i + 2] *= drag
			pos[i] += vel[i] * dt; pos[i + 1] += vel[i + 1] * dt; pos[i + 2] += vel[i + 2] * dt
			if (this.floor && upAxis === 2 && pos[i + 2] < 0.05) { pos[i + 2] = 0.05; vel[i + 2] *= -0.45 }
			const f = Math.max(0, life[k] / life0[k])
			const a = f * f * (3 - 2 * f)
			col[i] = base[i] * a; col[i + 1] = base[i + 1] * a; col[i + 2] = base[i + 2] * a
		}
		if (alive || this.alive) {
			this.points.geometry.attributes.position.needsUpdate = true
			this.points.geometry.attributes.color.needsUpdate = true
		}
		this.alive = alive
	}
}

function dotTexture() {
	const c = document.createElement('canvas')
	c.width = c.height = 64
	const g = c.getContext('2d')
	const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32)
	grd.addColorStop(0, 'rgba(255,255,255,1)')
	grd.addColorStop(0.35, 'rgba(255,255,255,0.6)')
	grd.addColorStop(1, 'rgba(255,255,255,0)')
	g.fillStyle = grd; g.fillRect(0, 0, 64, 64)
	return new THREE.CanvasTexture(c)
}

/** MeshStandardMaterial where instance colours > 1.0 become emission (for glow). */
function makeGlyphMaterial() {
	const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.38, metalness: 0.12 })
	m.onBeforeCompile = sh => {
		sh.fragmentShader = sh.fragmentShader
			.replace('#include <color_fragment>', `
				vec3 instGlow = vec3(0.0);
				#if defined( USE_COLOR )
					instGlow = max(vColor - vec3(1.0), vec3(0.0));
					diffuseColor.rgb *= min(vColor, vec3(1.0));
				#endif`)
			.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
				totalEmissiveRadiance += instGlow;`)
	}
	m.customProgramCacheKey = () => 'glyph-hdr-instance'
	return m
}

const lerp = (a, b, t) => a + (b - a) * t
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

function upperBound(arr, t, key) {
	// index of first element with key > t
	let lo = 0, hi = arr.length
	while (lo < hi) { const mid = (lo + hi) >> 1; if (arr[mid][key] <= t) lo = mid + 1; else hi = mid }
	return lo
}

export class NotationStage {
	constructor(container) {
		this.container = container
		this.opts = { bloom: true, fx: true, shadows: true, trail: true, bounce: 1, zoom: 1, view: 'bounce', theme: 'marble' }

		// No antialias on the default framebuffer: with bloom on, everything is
		// rendered offscreen and the final pass is a fullscreen quad, so canvas
		// MSAA would cost fill-rate for nothing. MSAA lives on the composer target.
		const renderer = this.renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' })
		this.maxPixelRatio = Math.min(window.devicePixelRatio || 1, 1.5)
		this.pixelRatio = this.maxPixelRatio
		renderer.setPixelRatio(this.pixelRatio)
		renderer.shadowMap.enabled = true
		renderer.shadowMap.type = THREE.PCFShadowMap
		renderer.toneMapping = THREE.ACESFilmicToneMapping
		renderer.toneMappingExposure = 1.0
		container.appendChild(renderer.domElement)

		const scene = this.scene = new THREE.Scene()
		const pmrem = new THREE.PMREMGenerator(renderer)
		this.envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
		scene.environment = this.envTex

		this.camera = new THREE.PerspectiveCamera(34, 1, 0.1, 4000)
		this.controls = new OrbitControls(this.camera, renderer.domElement)
		this.controls.enableDamping = true
		this.controls.enabled = false

		// Lights
		this.hemi = new THREE.HemisphereLight(0xfff4e0, 0x403020, 0.5)
		scene.add(this.hemi)
		const key = this.keyLight = new THREE.DirectionalLight(0xfff0d8, 2)
		key.castShadow = true
		key.shadow.mapSize.set(1024, 1024)
		key.shadow.bias = -0.0004
		key.shadow.normalBias = 0.03
		scene.add(key, key.target)
		this.rim = new THREE.DirectionalLight(0x9fc4ff, 0.5)
		scene.add(this.rim, this.rim.target)

		// Materials (colours set by theme)
		this.inkColor = new THREE.Color()
		this.materials = {
			staff: new THREE.MeshStandardMaterial({ roughness: 0.6, metalness: 0.05 }),
			ink: new THREE.MeshStandardMaterial({ roughness: 0.45, metalness: 0.1 }),
			glyph: makeGlyphMaterial(),
			text: new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false }),
			inkColor: this.inkColor,
		}
		this.surfaces = { paper: { map: paperTexture(), tile: 24 }, marble: { ...marbleTextures(), tile: 120 } }
		this.paperMat = new THREE.MeshStandardMaterial({ roughness: 0.92, metalness: 0, map: this.surfaces.paper.map })
		this._surfaceSize = [100, 100]

		// Effects
		this.fxGroup = new THREE.Group()
		scene.add(this.fxGroup)
		this._initParticles()
		this._initRipples()

		// Post
		const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 0 })
		this.composer = new EffectComposer(renderer, rt)
		this.composer.addPass(new RenderPass(scene, this.camera))
		this.bloomPass = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.8, 0.5, 0.9)
		this.composer.addPass(this.bloomPass)
		this.composer.addPass(new OutputPass())

		this.balls = []
		this.score = null
		this.focus = new THREE.Vector3()
		this._camPos = new THREE.Vector3()
		this._camTarget = new THREE.Vector3()
		this._lastT = 0
		this._lastFocusX = null
		this._snapCamera = true
		this._tmpM = new THREE.Matrix4()
		this._tmpM2 = new THREE.Matrix4()
		this._tmpC = new THREE.Color()
		this._tmpC2 = new THREE.Color()
		this._frameEMA = 16
		this._qualityTimer = 0
		this.tier = 1
		this._msaaOff = true

		this.setTheme(this.opts.theme)
		this.setView(this.opts.view)
		this.resize()
		new ResizeObserver(() => this.resize()).observe(container)
	}

	// ── setup helpers ──
	_initParticles() {
		const tex = dotTexture()
		this.sparks = new Particles(3000, { size: 0.26, texture: tex, gravity: 6, drag: 0.97 })
		this.dust = new Particles(700, { size: 2.6, texture: tex, gravity: -0.6, drag: 0.94, floor: false, opacity: 0.5 })
		this.fxGroup.add(this.dust.points, this.sparks.points)
	}

	_initRipples() {
		this.ripples = []
		const geo = new THREE.RingGeometry(0.62, 0.78, 48)
		for (let i = 0; i < 48; i++) {
			const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
				transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false,
			}))
			m.visible = false
			m.userData.start = -1
			this.fxGroup.add(m)
			this.ripples.push(m)
		}
		this.rippleNext = 0
	}

	// ── public API ──
	resize(snap = true) {
		const w = this.container.clientWidth || 1, h = this.container.clientHeight || 1
		this.renderer.setPixelRatio(this.pixelRatio)
		this.renderer.setSize(w, h, false)
		this.renderer.domElement.style.width = w + 'px'
		this.renderer.domElement.style.height = h + 'px'
		// MSAA only where it pays: at high pixel ratios the extra resolution
		// already antialiases, and adaptive quality drops it first when slow.
		const samples = this.pixelRatio < 1.25 && !this._msaaOff ? 4 : 0
		for (const target of [this.composer.renderTarget1, this.composer.renderTarget2]) {
			if (target.samples !== samples) { target.samples = samples; target.dispose() }
		}
		this.composer.setPixelRatio(this.pixelRatio)
		this.composer.setSize(w, h)
		// Bloom is soft anyway: run its mip chain at reduced resolution
		this.bloomPass.resolution.set(w * this.pixelRatio / 3, h * this.pixelRatio / 3)
		this.camera.aspect = w / h
		this.camera.updateProjectionMatrix()
		if (snap) this._snapCamera = true
	}

	setTheme(name) {
		const th = this.theme = THEMES[name] || THEMES.night
		this.opts.theme = name
		this.scene.background = gradientTexture(th.bgTop, th.bgBottom)
		this.scene.fog = new THREE.Fog(th.fog, 60, 400)
		this.scene.environmentIntensity = th.env
		this.hemi.intensity = th.hemi
		this.keyLight.intensity = th.key
		this.inkColor.set(th.ink)
		this.materials.ink.color.set(th.ink)
		this.materials.staff.color.set(th.staff)
		const surf = this.surfaces[th.surface || 'paper']
		this.paperMat.map = surf.map
		this.paperMat.bumpMap = surf.bump || null
		this.paperMat.bumpScale = 0.6
		this.paperMat.roughness = th.roughness ?? 0.92
		this.paperMat.color.set(th.surface === 'marble' ? '#ffffff' : th.paper)
		this.paperMat.needsUpdate = true
		this._updateSurfaceRepeat()
		if (this.titleMesh) this._styleTitle()
		this.bloomPass.strength = th.bloom
		this.bloomPass.threshold = th.threshold
		if (this.score) {
			this.score.built.group.traverse(o => { if (o.userData.isText) o.material.color.set(th.text) })
			this._recolorAll(this._lastT)
		}
		this._textColor = th.text
	}

	_updateSurfaceRepeat() {
		const surf = this.surfaces[this.theme.surface || 'paper']
		const [w, h] = this._surfaceSize
		surf.map.repeat.set(w / surf.tile, h / surf.tile)
		if (surf.bump) surf.bump.repeat.copy(surf.map.repeat)
	}

	_styleTitle() {
		const th = this.theme, m = this.titleMesh.material
		m.color.set(th.title)
		m.emissive.set(th.title)
		m.emissiveIntensity = th.titleGlow
	}

	/** 3D extruded song title lying on the table above the first system. */
	async setTitle(text) {
		const seq = (this._titleSeq = (this._titleSeq || 0) + 1)
		if (this.titleMesh) { this.titleMesh.removeFromParent(); this.titleMesh.geometry.dispose(); this.titleMesh = null }
		if (!text || !this.score) return
		try {
			this._font ||= new FontLoader().loadAsync(TITLE_FONT)
			const font = await this._font
			if (seq !== this._titleSeq || !this.score) return
			const geo = new TextGeometry(text.slice(0, 60), {
				font, size: 2.4, depth: 0.45, curveSegments: 4,
				bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.06, bevelSegments: 2,
			})
			geo.computeBoundingBox()
			const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ roughness: 0.35, metalness: 0.1 }))
			const s = this.score
			mesh.position.set(s.minX + 2, s.centerY + s.height / 2 + 5, 0)
			mesh.castShadow = true
			this.titleMesh = mesh
			this._styleTitle()
			s.root.add(mesh)
		} catch (e) { console.warn('title font failed', e) }
	}

	setView(name) {
		this.opts.view = VIEWS[name] ? name : 'tilt'
		const v = this.view = VIEWS[this.opts.view]
		this.camera.fov = v.fov
		this.camera.updateProjectionMatrix()
		this.controls.enabled = name === 'free'
		if (name === 'free') this.camera.up.set(0, 1, 0)
		this._snapCamera = true
			}

	setOption(key, value) {
		this.opts[key] = value
		if (key === 'shadows') this.keyLight.castShadow = value && !QUALITY_TIERS[this.tier].noShadow
		if (key === 'trail') for (const b of this.balls) b.streak.visible = value
		if (key === 'zoom') this._snapCamera = false
	}

	clear() {
		if (this.score) {
			this.score.root.removeFromParent()
			this.score.root.traverse(o => {
				if (o.geometry && !o.userData.sharedGeo) o.geometry.dispose()
				if (o.userData.isText) { o.material.map?.dispose(); o.material.dispose() }
			})
		}
		for (const b of this.balls) b.streak.geometry.dispose()
		this.titleMesh = null
		this.balls = []
		this.score = null
	}

	/**
	 * @param {object} built - from buildScoreMeshes
	 * @param {Array<Array<{time, heads}>>} perStaff - onsets per staff, time-sorted
	 */
	setScore(built, perStaff) {
		this.clear()
		const root = new THREE.Group()
		root.add(built.group)

		const b = built.bounds
		const width = b.max.x - b.min.x
		const height = b.max.y - b.min.y
		const paper = new THREE.Mesh(new THREE.PlaneGeometry(width + 400, height + 3000), this.paperMat)
		paper.position.set((b.min.x + b.max.x) / 2 + 150, (b.min.y + b.max.y) / 2, -0.01)
		paper.receiveShadow = true
		this._surfaceSize = [width + 400, height + 3000]
		this._updateSurfaceRepeat()
		root.add(paper)
		this.scene.add(root)

		built.group.traverse(o => { if (o.userData.isText) o.material.color.set(this._textColor) })

		// Heads with first-hit time and staff
		const headState = new Map()
		perStaff.forEach((onsets, si) => {
			for (const o of onsets) for (const h of o.heads) {
				if (!headState.has(h)) headState.set(h, { h, time: o.time, staff: si, glowStart: -1 })
			}
		})

		// Global timeline for camera: (time, x) using the leftmost head at each time
		const pts = []
		for (const onsets of perStaff) for (const o of onsets) pts.push({ time: o.time, x: Math.min(...o.heads.map(h => h.x)) })
		pts.sort((a, b) => a.time - b.time || a.x - b.x)
		const timeline = []
		for (const p of pts) {
			const last = timeline[timeline.length - 1]
			if (last && Math.abs(last.time - p.time) < 1e-4) continue
			// keep camera monotonic within a pass (repeats may jump back)
			timeline.push(p)
		}

		// Vertical framing: union of staves (heads + staff lines)
		this.score = {
			built, root, perStaff, headState, timeline,
			centerY: (b.min.y + b.max.y) / 2, height: Math.max(height, 8), minX: b.min.x, maxX: b.max.x,
			active: new Set(),
		}

		// Balls: glowing, notehead-shaped (tilted flat ellipsoid)
		const geo = new THREE.SphereGeometry(BALL_R, 28, 16)
		geo.scale(1.3, 0.92, 0.55)
		geo.rotateZ(0.38)
		this._streakMat ||= new THREE.MeshBasicMaterial({
			vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false,
		})
		perStaff.forEach((onsets, si) => {
			if (!onsets.length) return
			const color = new THREE.Color(STAFF_COLORS[si % STAFF_COLORS.length])
			const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: color.clone().lerp(new THREE.Color(1, 1, 1), 0.35).multiplyScalar(2.6), toneMapped: false }))
			mesh.castShadow = true
			mesh.userData.sharedGeo = true
			// Fake light pool on the table (cheap additive decal instead of a PointLight)
			const glow = new THREE.Mesh(this._glowGeo || (this._glowGeo = new THREE.PlaneGeometry(1, 1)), new THREE.MeshBasicMaterial({
				map: this._glowTex || (this._glowTex = dotTexture()), color: color.clone().multiplyScalar(0.9),
				transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
			}))
			glow.userData.sharedGeo = true
			glow.renderOrder = 1
			// Arc streak: camera-facing ribbon along the last STREAK_SPAN seconds of trajectory
			const sg = new THREE.BufferGeometry()
			sg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(STREAK_N * 6), 3).setUsage(THREE.DynamicDrawUsage))
			sg.setAttribute('color', new THREE.BufferAttribute(new Float32Array(STREAK_N * 6), 3).setUsage(THREE.DynamicDrawUsage))
			const idx = []
			for (let k = 0; k < STREAK_N - 1; k++) { const a = k * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2) }
			sg.setIndex(idx)
			const streak = new THREE.Mesh(sg, this._streakMat)
			streak.frustumCulled = false
			streak.visible = this.opts.trail
			streak.renderOrder = 2
			root.add(glow, mesh, streak)
			const samples = Array.from({ length: STREAK_N }, () => new THREE.Vector3())
			this.balls.push({ staff: si, onsets, mesh, streak, glow, color, samples, lastIdx: -2, pos: new THREE.Vector3() })
		})

		this._snapCamera = true
		this._recolorAll(0)
		this._lastT = 0
	}

	/** Recompute every notehead's colour for time t (after load / seek / theme). */
	_recolorAll(t) {
		const s = this.score
		if (!s) return
		s.built.setInkColor(this.inkColor)
		for (const st of s.headState.values()) {
			st.glowStart = -1
			this._applyHead(st, st.time <= t + 1e-4 ? 'played' : 'ink', 0)
		}
		s.active.clear()
		for (const b of this.balls) b.lastIdx = upperBound(b.onsets, t, 'time') - 1
	}

	_staffColor(si) { return this._tmpC.set(STAFF_COLORS[si % STAFF_COLORS.length]) }

	_applyHead(st, mode, glow) {
		const { mesh, index, matrix, x, y } = st.h
		const c = this._tmpC
		if (mode === 'ink') c.copy(this.inkColor)
		else {
			const base = this._tmpC2.set(STAFF_COLORS[st.staff % STAFF_COLORS.length])
			c.lerpColors(this.inkColor, base, this.theme.playedMix)
			if (this.theme.playedGlow) c.multiplyScalar(this.theme.playedGlow)
			if (glow > 0) c.lerp(base.multiplyScalar(5), glow)
		}
		mesh.setColorAt(index, c)
		mesh.instanceColor.needsUpdate = true
		if (glow > 0) {
			const s = 1 + 0.55 * glow
			const M = this._tmpM.makeTranslation(-x, -y, 0)
			M.premultiply(this._tmpM2.makeScale(s, s, 1 + glow))
			M.premultiply(this._tmpM2.makeTranslation(x, y, 0.25 * glow))
			M.multiply(matrix)
			mesh.setMatrixAt(index, M)
		} else mesh.setMatrixAt(index, matrix)
		mesh.instanceMatrix.needsUpdate = true
	}

	_impact(ball, onset, wallTime) {
		const hop = this.view.hop
		for (const h of onset.heads) {
			const st = this.score.headState.get(h)
			if (!st) continue
			st.glowStart = wallTime
			this.score.active.add(st)
		}
		if (!this.opts.fx) return
		const top = onset.heads.reduce((a, h) => (h.top > a.top ? h : a), onset.heads[0])
		// ripple
		const r = this.ripples[this.rippleNext++ % this.ripples.length]
		r.visible = true
		r.userData.start = wallTime
		r.position.set(top.x, top.y, top.depth + 0.02)
		r.material.color.copy(ball.color).multiplyScalar(2.2)
		// burst of sparks + a puff of coloured dust
		const c = ball.color
		const px = top.x, py = hop === 'y' ? top.top : top.y, pz = top.depth + 0.1
		const n = 12 + Math.min(14, onset.heads.length * 4)
		for (let i = 0; i < n; i++) {
			const a = Math.random() * Math.PI * 2, sp = 1.5 + Math.random() * 4.5, w = Math.random() * 0.5
			const [vx, vy, vz] = hop === 'y'
				? [Math.cos(a) * sp, Math.abs(Math.sin(a)) * sp * 1.2, (Math.random() - 0.3) * 3]
				: [Math.cos(a) * sp, Math.sin(a) * sp, 1.5 + Math.random() * 4]
			this.sparks.spawn(px, py, pz, vx, vy, vz, 0.6 + Math.random() * 0.7, lerp(c.r, 1, w) * 3, lerp(c.g, 1, w) * 3, lerp(c.b, 1, w) * 3)
		}
		for (let i = 0; i < 3; i++) {
			const a = Math.random() * Math.PI * 2
			this.dust.spawn(px, py, pz + 0.3, Math.cos(a) * 0.8, Math.sin(a) * 0.8, 0.4, 1.2 + Math.random(), c.r * 0.35, c.g * 0.35, c.b * 0.35)
		}
	}

	/** Ball position at music time t (score space). Returns onset index (≤ t). */
	_ballAt(ball, t, out, sample = false) {
		const on = ball.onsets
		const hop = this.view.hop
		const land = (o, v) => {
			const h = o.heads.reduce((a, b) => (b.top > a.top ? b : a), o.heads[0])
			if (hop === 'y') v.set(h.x, h.top + BALL_R * 0.92, h.depth * 0.6)
			else v.set(h.x, h.y, h.depth + BALL_R * 0.92)
			return v
		}
		const axis = hop === 'y' ? 'y' : 'z'
		const idx = upperBound(on, t, 'time') - 1
		const A = this._va || (this._va = new THREE.Vector3())
		const B = this._vb || (this._vb = new THREE.Vector3())
		if (sample && idx >= on.length - 1) return idx >= 0 ? (land(on[on.length - 1], out), idx) : idx
		let squash = 0
		if (idx < 0) {
			// waiting above the first note, dropping in during the last second
			land(on[0], B)
			const lead = 1.2
			const u = clamp(1 - (on[0].time - t) / lead, 0, 1)
			out.copy(B)
			out.x -= (1 - u) * 3
			out[axis] += (1 - u * u) * 6 * this.opts.bounce
			squash = on[0].time - t < 0.05 ? 1 - (on[0].time - t) / 0.05 : 0
		} else if (idx >= on.length - 1) {
			land(on[on.length - 1], out)
			const since = t - on[on.length - 1].time
			squash = since < 0.08 ? 1 - since / 0.08 : 0
		} else {
			const o0 = on[idx], o1 = on[idx + 1]
			land(o0, A); land(o1, B)
			const dt = o1.time - o0.time
			const u = clamp((t - o0.time) / dt, 0, 1)
			const dx = Math.abs(B.x - A.x)
			const h = Math.min(8, 0.35 + dt * 4.5 + dx * 0.12) * this.opts.bounce
			out.lerpVectors(A, B, u)
			out[axis] += h * 4 * u * (1 - u)
			const near = Math.min(t - o0.time, o1.time - t)
			squash = near < 0.05 ? (1 - near / 0.05) * clamp(dt * 6, 0.3, 1) : 0
		}
		if (sample) return idx
		const s = ball.mesh.scale
		const k = squash * 0.32
		if (axis === 'y') s.set(1 + k, 1 - k, 1 + k)
		else s.set(1 + k, 1 + k, 1 - k)
		return idx
	}

	_timelineX(t) {
		const tl = this.score.timeline
		if (!tl.length) return 0
		const i = upperBound(tl, t, 'time')
		if (i <= 0) return tl[0].x - 4 * clamp(tl[0].time - t, 0, 1)
		if (i >= tl.length) return tl[tl.length - 1].x
		const a = tl[i - 1], b = tl[i]
		return lerp(a.x, b.x, clamp((t - a.time) / (b.time - a.time), 0, 1))
	}

	/**
	 * Advance the scene to music time t.
	 * @param {number} t - seconds
	 * @param {number} dt - wall-clock delta seconds
	 * @param {boolean} playing
	 */
	update(t, dt, playing) {
		const s = this.score
		const wall = performance.now() / 1000
		if (s) {
			const jumped = Math.abs(t - this._lastT) > 0.6 || t < this._lastT - 1e-3
			if (jumped) this._recolorAll(t)

			// Balls + impacts
			for (const b of this.balls) {
				const idx = this._ballAt(b, t, b.pos)
				b.mesh.position.copy(b.pos)
				if (!jumped && idx > b.lastIdx) {
					for (let i = Math.max(b.lastIdx + 1, idx - 3); i <= idx; i++) if (i >= 0) this._impact(b, b.onsets[i], wall)
				}
				b.lastIdx = idx
				// trail
				// light pool under the ball: brighter and tighter when close to the page
				const lift = this.view.hop === 'y' ? 0.6 : Math.max(0, b.pos.z - 0.6)
				const gs = 3.2 + lift * 0.6
				b.glow.position.set(b.pos.x, this.view.hop === 'y' ? b.pos.y - 0.6 : b.pos.y, 0.015)
				b.glow.scale.set(gs, gs, 1)
				b.glow.material.opacity = 0.85 / (1 + lift * 0.35)
				if (this.opts.trail) this._updateStreak(b, t)
				if (this.opts.fx && playing) this._emitTrail(b, dt)
			}

			// Active notehead glows
			for (const st of s.active) {
				const age = wall - st.glowStart
				const g = Math.exp(-age / 0.28) * (age < 0.06 ? age / 0.06 : 1)
				if (age > 1.5) { this._applyHead(st, 'played', 0); s.active.delete(st) }
				else this._applyHead(st, 'played', g)
			}

			this._updateCamera(t, dt)
		}

		this._updateFx(wall, dt)
		this._adaptQuality(dt)
		this._lastT = t
		this.bloomPass.enabled = this.opts.bloom
		this.composer.render()
	}

	/** Rebuild a ball's arc-streak ribbon from its analytic trajectory. */
	_updateStreak(b, t) {
		const P = b.samples, N = STREAK_N
		for (let k = 0; k < N; k++) this._ballAt(b, t - (k / (N - 1)) * STREAK_SPAN, P[k], true)
		P[0].copy(b.pos)
		const pos = b.streak.geometry.attributes.position.array
		const col = b.streak.geometry.attributes.color.array
		const cam = this.camera.position
		const T = this._vt || (this._vt = new THREE.Vector3())
		const V = this._vv || (this._vv = new THREE.Vector3())
		const S = this._vs || (this._vs = new THREE.Vector3())
		const c = b.color
		const moving = P[0].distanceToSquared(P[N - 1]) > 0.04
		for (let k = 0; k < N; k++) {
			const p = P[k]
			T.subVectors(P[Math.max(0, k - 1)], P[Math.min(N - 1, k + 1)])
			V.subVectors(cam, p)
			S.crossVectors(T, V)
			const len = S.length()
			const f = 1 - k / (N - 1)
			const w = moving && len > 1e-6 ? BALL_R * 0.55 * Math.pow(f, 0.65) / len : 0
			S.multiplyScalar(w)
			const i = k * 6
			pos[i] = p.x + S.x; pos[i + 1] = p.y + S.y; pos[i + 2] = p.z + S.z
			pos[i + 3] = p.x - S.x; pos[i + 4] = p.y - S.y; pos[i + 5] = p.z - S.z
			// hot white head → staff colour → fade
			const hot = Math.max(0, 1 - k / (N * 0.22))
			const br = 2.8 * Math.pow(f, 1.4)
			const r = lerp(c.r, 1, hot) * br, g = lerp(c.g, 1, hot) * br, bl = lerp(c.b, 1, hot) * br
			col[i] = col[i + 3] = r; col[i + 1] = col[i + 4] = g; col[i + 2] = col[i + 5] = bl
		}
		b.streak.geometry.attributes.position.needsUpdate = true
		b.streak.geometry.attributes.color.needsUpdate = true
	}

	/** Sparkles shed along the streak, plus a soft coloured dust cloud. */
	_emitTrail(b, dt) {
		const c = b.color, P = b.samples
		b._emit = (b._emit || 0) + dt * 70
		while (b._emit >= 1) {
			b._emit--
			const p = P[Math.floor(Math.random() * STREAK_N * 0.5)]
			const j = () => (Math.random() - 0.5) * 0.9
			const w = Math.random() * 0.6
			this.sparks.spawn(p.x + j() * 0.4, p.y + j() * 0.4, p.z + j() * 0.4, j(), j(), j() + 0.3, 0.4 + Math.random() * 0.8,
				lerp(c.r, 1, w) * 2.2, lerp(c.g, 1, w) * 2.2, lerp(c.b, 1, w) * 2.2)
		}
		b._dust = (b._dust || 0) + dt * 14
		while (b._dust >= 1) {
			b._dust--
			const p = P[Math.floor(Math.random() * STREAK_N * 0.7)]
			const j = () => (Math.random() - 0.5) * 0.6
			this.dust.spawn(p.x, p.y, p.z, j(), j(), j() + 0.2, 1 + Math.random() * 1.2, c.r * 0.22, c.g * 0.22, c.b * 0.22)
		}
	}

	/**
	 * Adaptive quality: keep frames under ~20ms by stepping through tiers
	 * (cheapest visual loss first). Tier 0 = MSAA (only kicks in on fast GPUs).
	 */
	_applyTier() {
		const T = QUALITY_TIERS[this.tier]
		this.pixelRatio = Math.max(0.6, this.maxPixelRatio * T.pr)
		this._msaaOff = !T.msaa
		this.keyLight.castShadow = this.opts.shadows && !T.noShadow
		this.resize(false)
	}

	_adaptQuality(dt) {
		if (!(dt > 0) || dt > 0.5) return // tab switch / stalls
		this._frameEMA += (dt * 1000 - this._frameEMA) * 0.05
		this._qualityTimer += dt
		const slow = this._frameEMA > 21, fast = this._frameEMA < (this.tier === 1 ? 10 : 13)
		if (slow && this._qualityTimer > 1.5 && this.tier < QUALITY_TIERS.length - 1) this.tier++
		else if (fast && this._qualityTimer > 4 && this.tier > 0) this.tier--
		else return
		this._qualityTimer = 0
		this._applyTier()
	}

	_updateCamera(t, dt) {
		const s = this.score
		const v = this.view
		const fx = this.balls.length ? this.balls.reduce((a, b) => a + b.pos.x, 0) / this.balls.length * 0.35 + this._timelineX(t) * 0.65 : this._timelineX(t)
		const fovR = THREE.MathUtils.degToRad(this.camera.fov)
		const D = ((s.height / 2 + 7) / Math.tan(fovR / 2)) / this.opts.zoom
		const viewW = 2 * D * Math.tan(fovR / 2) * this.camera.aspect
		const target = this._camTarget.set(fx + viewW * v.lead, s.centerY, 0)
		const pos = this._camPos.set(target.x + v.offset[0] * D, target.y + v.offset[1] * D, v.offset[2] * D)

		if (v === VIEWS.free) {
			// Orbit controls own the camera; slide the rig along with the music
			const dx = this._lastFocusX == null ? 0 : target.x - this._lastFocusX
			if (this._snapCamera || this._lastFocusX == null) {
				this.camera.position.copy(pos)
				this.controls.target.copy(target)
			} else {
				this.camera.position.x += dx
				this.controls.target.x += dx
			}
			this.controls.update()
		} else {
			const k = this._snapCamera ? 1 : 1 - Math.exp(-dt * 7)
			this.camera.position.lerp(pos, k)
			this._lookAt = this._lookAt || target.clone()
			if (this._snapCamera) this._lookAt.copy(target)
			else this._lookAt.lerp(target, k)
			this.camera.up.set(...(v.up || [0, 1, 0]))
			this.camera.lookAt(this._lookAt)
		}
		this._lastFocusX = target.x
		this._snapCamera = false

		// Fog range follows framing distance
		this.scene.fog.near = D * 2.2
		this.scene.fog.far = D * 7

		// Key light + shadow frustum follow the focus
		const key = this.keyLight
		key.position.set(target.x - 14, target.y + 22, 34)
		key.target.position.set(target.x, target.y, 0)
		const sc = key.shadow.camera
		const half = viewW * 0.75 + 10
		sc.left = -half; sc.right = half; sc.top = s.height + 20; sc.bottom = -s.height - 20
		sc.near = 1; sc.far = 120
		sc.updateProjectionMatrix()
		this.rim.position.set(target.x + 20, target.y - 15, 10)
		this.rim.target.position.copy(key.target.position)
	}

	_updateFx(wall, dt) {
		dt = Math.min(dt, 0.05)
		// ripples
		for (const r of this.ripples) {
			if (!r.visible) continue
			const a = (wall - r.userData.start) / 0.65
			if (a >= 1) { r.visible = false; continue }
			const sc = 1 + a * 3.2
			r.scale.set(sc, sc, sc)
			r.material.opacity = (1 - a) * (1 - a)
		}
		const up = this.view.hop === 'y' ? 1 : 2
		this.sparks.update(dt, up)
		this.dust.update(dt, up)
	}
}

/**
 * Build per-staff onset lists from (time, staffIndex, token) hits.
 * @param {Array<{time:number, staff:number, token:object}>} hits
 * @param {Map} heads - drawing element → head info (from buildScoreMeshes)
 * @param {number} staffCount
 */
export function buildOnsets(hits, heads, staffCount) {
	const perStaff = Array.from({ length: staffCount }, () => [])
	const seen = new Set()
	hits = [...hits].sort((a, b) => a.time - b.time)
	for (const { time, staff, token } of hits) {
		const key = staff + ':' + time.toFixed(4) + ':' + (token._uid ??= Math.random())
		if (seen.has(key)) continue
		seen.add(key)
		const els = token.type === 'Chord' && token.notes
			? token.notes.map(n => n.drawingNoteHead).filter(Boolean)
			: [token.drawingNoteHead].filter(Boolean)
		const hs = els.map(e => heads.get(e)).filter(Boolean)
		if (!hs.length) continue
		// merge simultaneous tokens in one staff (e.g. split-stem chords)
		const list = perStaff[staff]
		const last = list[list.length - 1]
		if (last && Math.abs(last.time - time) < 1e-3) { for (const h of hs) if (!last.heads.includes(h)) last.heads.push(h) }
		else list.push({ time, heads: hs })
	}
	for (const l of perStaff) l.sort((a, b) => a.time - b.time)
	return perStaff
}
