/**
 * stage.js — three.js scene for the 3D notation player: extruded score on a
 * paper plane, bouncing balls (one per staff) that land on each onset,
 * notehead pops, ripples, particles, comet trails, bloom and a follow camera.
 */
import * as THREE from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'

export const STAFF_COLORS = ['#ff5a8a', '#3fb6ff', '#9be15d', '#ffb340', '#c77dff', '#2ee6c5', '#ffe14d', '#7b8cff']

export const THEMES = {
	night: {
		bgTop: '#2a2219', bgBottom: '#0d0b08', paper: '#211c15', ink: '#e2d2ae', staff: '#9a876a', text: '#cdb991',
		fog: '#120f0b', hemi: 0.45, key: 2.0, env: 0.3, bloom: 0.8, threshold: 1.05, playedMix: 0.75,
	},
	paper: {
		bgTop: '#d9ccb0', bgBottom: '#8f826a', paper: '#e6dbc3', ink: '#120d08', staff: '#2e261c', text: '#1c160f',
		fog: '#c9bc9f', hemi: 0.45, key: 1.5, env: 0.25, bloom: 0.45, threshold: 1.15, playedMix: 0.85,
	},
}

// Camera offsets in score space (x right, y up the page, z out of the page),
// as multiples of the framing distance. `hop` = axis the balls bounce along.
export const VIEWS = {
	flat: { offset: [0, 0, 1], lead: 0.18, hop: 'y', fov: 30 },
	tilt: { offset: [-0.12, -0.32, 0.94], lead: 0.2, hop: 'y', fov: 34 },
	table: { offset: [0, -0.95, 0.62], lead: 0.12, hop: 'z', fov: 38, up: [0, 0, 1] },
	low: { offset: [-0.5, -0.9, 0.3], lead: 0.12, hop: 'z', fov: 42, up: [0, 0, 1] },
	free: { offset: [-0.2, -0.6, 0.8], lead: 0.15, hop: 'z', fov: 38 },
}

const BALL_R = 0.48
const MAX_PARTICLES = 2400
const TRAIL_N = 16

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
		this.opts = { bloom: true, fx: true, shadows: true, trail: true, bounce: 1, zoom: 1, view: 'tilt', theme: 'night' }

		const renderer = this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
		renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
		renderer.shadowMap.enabled = true
		renderer.shadowMap.type = THREE.PCFSoftShadowMap
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
		key.shadow.mapSize.set(2048, 2048)
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
		this.paperMat = new THREE.MeshStandardMaterial({ roughness: 0.92, metalness: 0, map: paperTexture() })

		// Effects
		this.fxGroup = new THREE.Group()
		scene.add(this.fxGroup)
		this._initParticles()
		this._initRipples()

		// Post
		this.composer = new EffectComposer(renderer)
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

		this.setTheme(this.opts.theme)
		this.setView(this.opts.view)
		this.resize()
		new ResizeObserver(() => this.resize()).observe(container)
	}

	// ── setup helpers ──
	_initParticles() {
		const geo = new THREE.BufferGeometry()
		this.pPos = new Float32Array(MAX_PARTICLES * 3)
		this.pCol = new Float32Array(MAX_PARTICLES * 3)
		this.pVel = new Float32Array(MAX_PARTICLES * 3)
		this.pLife = new Float32Array(MAX_PARTICLES)
		this.pBase = new Float32Array(MAX_PARTICLES * 3)
		geo.setAttribute('position', new THREE.BufferAttribute(this.pPos, 3).setUsage(THREE.DynamicDrawUsage))
		geo.setAttribute('color', new THREE.BufferAttribute(this.pCol, 3).setUsage(THREE.DynamicDrawUsage))
		this.pNext = 0
		this.particles = new THREE.Points(geo, new THREE.PointsMaterial({
			size: 0.32, map: dotTexture(), vertexColors: true, transparent: true, depthWrite: false,
			blending: THREE.AdditiveBlending, toneMapped: false,
		}))
		this.particles.frustumCulled = false
		this.fxGroup.add(this.particles)
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
	resize() {
		const w = this.container.clientWidth || 1, h = this.container.clientHeight || 1
		this.renderer.setSize(w, h, false)
		this.renderer.domElement.style.width = w + 'px'
		this.renderer.domElement.style.height = h + 'px'
		this.composer.setSize(w, h)
		this.bloomPass.resolution.set(w / 2, h / 2)
		this.camera.aspect = w / h
		this.camera.updateProjectionMatrix()
		this._snapCamera = true
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
		this.paperMat.color.set(th.paper)
		this.bloomPass.strength = th.bloom
		this.bloomPass.threshold = th.threshold
		if (this.score) {
			this.score.built.group.traverse(o => { if (o.userData.isText) o.material.color.set(th.text) })
			this._recolorAll(this._lastT)
		}
		this._textColor = th.text
	}

	setView(name) {
		this.opts.view = VIEWS[name] ? name : 'tilt'
		const v = this.view = VIEWS[this.opts.view]
		this.camera.fov = v.fov
		this.camera.updateProjectionMatrix()
		this.controls.enabled = name === 'free'
		if (name === 'free') this.camera.up.set(0, 1, 0)
		this._snapCamera = true
		for (const b of this.balls) b.trailHist.length = 0
	}

	setOption(key, value) {
		this.opts[key] = value
		if (key === 'shadows') this.keyLight.castShadow = value
		if (key === 'trail') for (const b of this.balls) b.trail.visible = value
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
		for (const b of this.balls) { b.mesh.removeFromParent(); b.trail.removeFromParent() }
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
		this.paperMat.map.repeat.set((width + 400) / 24, (height + 3000) / 24)
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

		// Balls
		const geo = new THREE.SphereGeometry(BALL_R, 32, 20)
		const trailGeo = new THREE.SphereGeometry(BALL_R * 0.55, 10, 8)
		perStaff.forEach((onsets, si) => {
			if (!onsets.length) return
			const color = new THREE.Color(STAFF_COLORS[si % STAFF_COLORS.length])
			const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
				color, emissive: color, emissiveIntensity: 1.6, roughness: 0.25, metalness: 0.1,
			}))
			mesh.castShadow = true
			mesh.userData.sharedGeo = true
			if (this.balls.length < 4) {
				const light = new THREE.PointLight(color, 6, 9, 1.6)
				mesh.add(light)
			}
			const trail = new THREE.InstancedMesh(trailGeo, new THREE.MeshBasicMaterial({
				transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
			}), TRAIL_N)
			trail.frustumCulled = false
			trail.visible = this.opts.trail
			trail.userData.sharedGeo = true
			for (let i = 0; i < TRAIL_N; i++) trail.setColorAt(i, color)
			root.add(mesh, trail)
			this.balls.push({ staff: si, onsets, mesh, trail, color, lastIdx: -2, trailHist: [], pos: new THREE.Vector3() })
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
			c.set(STAFF_COLORS[st.staff % STAFF_COLORS.length])
			const base = c.clone()
			c.lerpColors(this.inkColor, base, this.theme.playedMix)
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
		// particles
		const n = 14 + Math.min(16, onset.heads.length * 4)
		for (let i = 0; i < n; i++) {
			const k = this.pNext++ % MAX_PARTICLES
			const a = Math.random() * Math.PI * 2, sp = 2 + Math.random() * 5
			this.pPos[k * 3] = top.x
			this.pPos[k * 3 + 1] = hop === 'y' ? top.top : top.y
			this.pPos[k * 3 + 2] = top.depth + 0.1
			if (hop === 'y') {
				this.pVel[k * 3] = Math.cos(a) * sp
				this.pVel[k * 3 + 1] = Math.abs(Math.sin(a)) * sp * 1.2
				this.pVel[k * 3 + 2] = (Math.random() - 0.3) * 3
			} else {
				this.pVel[k * 3] = Math.cos(a) * sp
				this.pVel[k * 3 + 1] = Math.sin(a) * sp
				this.pVel[k * 3 + 2] = 2 + Math.random() * 5
			}
			this.pLife[k] = 0.7 + Math.random() * 0.6
			const c = ball.color
			const w = Math.random() * 0.4
			this.pBase[k * 3] = lerp(c.r, 1, w) * 2.5
			this.pBase[k * 3 + 1] = lerp(c.g, 1, w) * 2.5
			this.pBase[k * 3 + 2] = lerp(c.b, 1, w) * 2.5
		}
	}

	/** Ball position at music time t (score space). Returns onset index (≤ t). */
	_ballAt(ball, t, out) {
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
				if (this.opts.trail) {
					b.trailHist.unshift(b.pos.clone())
					if (b.trailHist.length > TRAIL_N * 2) b.trailHist.length = TRAIL_N * 2
					const M = this._tmpM
					for (let i = 0; i < TRAIL_N; i++) {
						const p = b.trailHist[Math.min(b.trailHist.length - 1, i * 2 + 1)] || b.pos
						const sc = playing ? (1 - i / TRAIL_N) * 0.9 : 0
						M.makeScale(sc, sc, sc).setPosition(p)
						b.trail.setMatrixAt(i, M)
					}
					b.trail.instanceMatrix.needsUpdate = true
				}
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
		this._lastT = t
		if (this.opts.bloom) this.composer.render()
		else this.renderer.render(this.scene, this.camera)
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
		// particles
		const hop = this.view.hop
		const g = 14
		let alive = false
		for (let k = 0; k < MAX_PARTICLES; k++) {
			if (this.pLife[k] <= 0) { this.pCol[k * 3] = this.pCol[k * 3 + 1] = this.pCol[k * 3 + 2] = 0; continue }
			alive = true
			this.pLife[k] -= dt
			const i = k * 3
			if (hop === 'y') this.pVel[i + 1] -= g * dt
			else this.pVel[i + 2] -= g * dt
			this.pVel[i] *= 0.985; this.pVel[i + 1] *= 0.985; this.pVel[i + 2] *= 0.985
			this.pPos[i] += this.pVel[i] * dt
			this.pPos[i + 1] += this.pVel[i + 1] * dt
			this.pPos[i + 2] += this.pVel[i + 2] * dt
			if (hop === 'z' && this.pPos[i + 2] < 0.05) { this.pPos[i + 2] = 0.05; this.pVel[i + 2] *= -0.45 }
			const f = clamp(this.pLife[k], 0, 1)
			this.pCol[i] = this.pBase[i] * f; this.pCol[i + 1] = this.pBase[i + 1] * f; this.pCol[i + 2] = this.pBase[i + 2] * f
		}
		if (alive || this._pAlive) {
			this.particles.geometry.attributes.position.needsUpdate = true
			this.particles.geometry.attributes.color.needsUpdate = true
		}
		this._pAlive = alive
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
