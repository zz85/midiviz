// Lays a Line Rider track so Bosh lands on every hit frame: for each landing it tries kickers and
// drops off the pad he is on, simulates each one with the real physics, puts a pad under him on
// the hit's frame, and keeps the best few runs (beam search). Nothing is drawn by hand and nothing
// is faked: the exported track rides the same on linerider.com.
import { Track, Rider, step, makeLine, SOLID, ACCEL, FPS, GRAVITY, P, N_CONTACT, STRIDE } from './physics.js'

const DEG = Math.PI / 180
const RING = 5

export const DEFAULTS = {
	beam: 4,
	seed: 1,
	speedLow: 4.5, // px / frame wanted in quiet music
	speedHigh: 8.5, //  … and in busy, loud music
	startAngle: 26 * DEG,
	maxStress: 0.8, // of the binding that throws Bosh off the sled
	descent: 0.3, // px / frame the track sinks on average
	pitchScale: 3, // px a semitone higher the melody puts the pads
	air: 0.72, // share of the time between landings spent flying (short gaps)
	arc: 0.85, // apex height against an even hop
}

function mulberry32(a) {
	return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296 }
}
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))

/** The planner's track: one Track holding the lines of one branch of the search at a time. */
class World {
	constructor() { this.track = new Track(); this.node = null }
	use(node) {
		let a = this.node, b = node
		const add = []
		while (a !== b) {
			if (a && (!b || a.depth >= b.depth)) { for (const l of a.lines) this.track.remove(l.id); a = a.parent }
			else { add.push(b); b = b.parent }
		}
		for (let i = add.length - 1; i >= 0; i--) for (const l of add[i].lines) this.track.add(l)
		this.node = node
	}
}

const solid = (id, x1, y1, x2, y2, leftExtended, rightExtended) => makeLine({ id, type: SOLID, x1, y1, x2, y2, flipped: false, leftExtended, rightExtended })

/** A landing pad from p1 (left) to p2 (right): plain, or red to speed him up or slow him down. */
function padLine(id, p1, p2, type) {
	if (type === 'boost') return makeLine({ id, type: ACCEL, x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y, flipped: false, leftExtended: false, rightExtended: true })
	if (type === 'brake') return makeLine({ id, type: ACCEL, x1: p2.x, y1: p2.y, x2: p1.x, y2: p1.y, flipped: true, leftExtended: true, rightExtended: false })
	return solid(id, p1.x, p1.y, p2.x, p2.y, false, true)
}

const childSpeed = r => { const v = r.velocity(); return Math.hypot(v.x, v.y) }

/** Pad continuation: straight on, an arc up to the exit angle, a straight exit to stop him spinning. */
function continuation(pad, c, id0) {
	const pts = [{ x: pad.ex, y: pad.ey }]
	let heading = pad.theta
	const go = (h, len) => { const p = pts.at(-1); pts.push({ x: p.x + Math.cos(h) * len, y: p.y + Math.sin(h) * len }) }
	if (c.s > 0.5) go(heading, c.s)
	const turn = c.phi - heading
	if (turn < -0.5 * DEG) {
		const m = Math.ceil(-turn / (6 * DEG))
		const len = 2 * c.R * Math.sin(-turn / (2 * m))
		for (let k = 1; k <= m; k++) go(heading + turn * (k - 0.5) / m, len)
		heading = c.phi
	}
	if (c.e > 0.5) go(heading, c.e)
	// joints extended as the editor would, but not back past the pad's end: the landing frame must not change
	const lines = []
	for (let k = 1; k < pts.length; k++) lines.push(solid(id0 + k - 1, pts[k - 1].x, pts[k - 1].y, pts[k].x, pts[k].y, k > 1, k < pts.length - 1))
	return { lines, exit: pts.at(-1), heading }
}

function segmentsCross(a, b) {
	const shared = (p, q) => Math.abs(p.x - q.x) < 1e-6 && Math.abs(p.y - q.y) < 1e-6
	const a1 = { x: a.x1, y: a.y1 }, a2 = { x: a.x2, y: a.y2 }, b1 = { x: b.x1, y: b.y1 }, b2 = { x: b.x2, y: b.y2 }
	if (shared(a1, b1) || shared(a1, b2) || shared(a2, b1) || shared(a2, b2)) return false
	const d = (p, q, r) => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x)
	const d1 = d(b1, b2, a1), d2 = d(b1, b2, a2), d3 = d(a1, a2, b1), d4 = d(a1, a2, b2)
	return (d1 > 0) !== (d2 > 0) && (d3 > 0) !== (d4 > 0)
}

/** Would a new line have pushed Bosh anywhere he has already been (before frame `before`)? */
function haunts(line, histories, before) {
	const x0 = Math.min(line.x1, line.x2) - 14, x1 = Math.max(line.x1, line.x2) + 14
	const y0 = Math.min(line.y1, line.y2) - 14, y1 = Math.max(line.y1, line.y2) + 14
	for (const h of histories) {
		if (h.xmax < x0 || h.xmin > x1) continue
		const n = h.count
		for (let k = 0; k < n; k++) {
			if (h.from + k >= before) break
			for (let i = 0; i < N_CONTACT; i++) {
				const px = h.pts[(k * N_CONTACT + i) * 2], py = h.pts[(k * N_CONTACT + i) * 2 + 1]
				if (px < x0 || px > x1 || py < y0 || py > y1) continue
				const ox = px - line.x1, oy = py - line.y1
				const perp = line.nx * ox + line.ny * oy
				const along = (line.vx * ox + line.vy * oy) * line.invLengthSq * line.length
				if (perp > -1.5 && perp < 11.5 && along > line.left * line.length - 1.5 && along < line.right * line.length + 1.5) return true
			}
		}
	}
	return false
}

function newHistory(from, capacity) { return { from, count: 0, pts: new Float32Array(capacity * N_CONTACT * 2), xmin: Infinity, xmax: -Infinity } }
function record(h, r) {
	const o = h.count * N_CONTACT * 2
	for (let i = 0; i < N_CONTACT; i++) {
		const x = r.s[i * STRIDE], y = r.s[i * STRIDE + 1]
		h.pts[o + i * 2] = x; h.pts[o + i * 2 + 1] = y
		if (x < h.xmin) h.xmin = x
		if (x > h.xmax) h.xmax = x
	}
	h.count++
}

const sledAngle = r => Math.atan2(r.y(P.NOSE) - r.y(P.TAIL), r.x(P.NOSE) - r.x(P.TAIL))

/**
 * Plan a track for `hits` ([{frame, strength 0–1, energy 0–1}], frames ascending, the first well
 * after 0 for the run-up). Returns the lines, which landing pad belongs to which hit, and stats.
 */
export function planTrack(hits, options = {}) {
	const o = { ...DEFAULTS, ...options }
	const rand = mulberry32(o.seed * 7919 + 17)
	const world = new World()
	const t0 = Date.now()
	let simulated = 0
	const why = {}
	const no = k => { why[k] = (why[k] || 0) + 1 }

	// the start: Bosh at (0, 0) above a slope that passes just under the tail of his sled
	const th0 = o.startAngle, L0 = 30
	const sx = 0 - Math.cos(th0) * 6, sy = 5.25 - Math.sin(th0) * 6
	const ex = sx + Math.cos(th0) * L0, ey = sy + Math.sin(th0) * L0
	const root = {
		parent: null, depth: 0, cost: 0, frame: 0, hit: -1,
		rider: new Rider({ x: 0, y: 0 }, undefined, { scarf: false }),
		lines: [solid(1, sx, sy, ex, ey, false, true)], nextId: 2,
		pad: { ex, ey, theta: th0, id: 1 }, hist: newHistory(1, 0), histH: newHistory(0, 1), info: { start: true },
	}

	record(root.histH, root.rider)

	const ring = Array.from({ length: RING }, () => new Rider({ x: 0, y: 0 }, undefined, { scarf: false }))
	const touched = []

	/** Every way on from `node` to a landing on frame H, scored. */
	function expand(node, H, hit, wide) {
		world.use(node)
		const track = world.track
		const D = H - node.frame
		const r0 = node.rider
		const v0 = r0.velocity(), speed = Math.hypot(v0.x, v0.y)
		const th = node.pad.theta
		const tx = Math.cos(th), ty = Math.sin(th)
		const dE = tx * (node.pad.ex - r0.x(P.TAIL)) + ty * (node.pad.ey - r0.y(P.TAIL))
		const acc = GRAVITY * Math.sin(th)
		const vWant = o.speedLow + (o.speedHigh - o.speedLow) * (hit.energy ?? 0.5)
		const tfWant = node.depth === 0 ? Math.min(22, D * 0.35) : D <= 16 ? D * 0.6 : D < 60 ? D * 0.72 : 43 + (D - 60) * 0.45
		const yWant = o.descent * H - o.pitchScale * (hit.contour ?? 0)
		const histories = []
		for (let n = node, k = 0; n && k < 12; n = n.parent, k++) histories.push(n.hist, n.histH)
		const recentLines = []
		for (let n = node, k = 0; n && k < 8; n = n.parent, k++) recentLines.push(...n.lines)

		// candidate flights. A kick leaves at angle phi and speed vt; left alone he comes back to the
		// take-off height after Tn = 2 vt sin(-phi) / g frames, so flights are chosen around that.
		const cands = []
		const rideDist = r => r <= 0 ? 0 : Math.max(0, speed * r + 0.5 * acc * r * r)
		const vAfter = r => Math.max(0.6, speed + acc * r)
		const jitter = () => 0.94 + rand() * 0.12
		for (const k of wide ? [0.35, 0.5, 0.7, 0.9] : [0.45, 0.7]) {
			const Tf = clamp(Math.round(Math.min(16, D * k) * jitter()), 3, D - 2)
			cands.push({ kind: 'drop', Tf, s: Math.max(0, rideDist(D - Tf) - dE), phi: th, R: 0, e: 0 })
		}
		for (const deg of wide ? [-3, -8, -14, -20, -27, -34, -42, -50] : [-5, -12, -20, -30, -40]) {
			const phi = deg * DEG * jitter()
			if (phi > th - 3 * DEG) continue
			for (const g of wide ? [2, 3.5, 6] : [2.5, 5]) {
				for (const k of wide ? [0.75, 0.95, 1.15, 1.4, 1.8] : [0.9, 1.25]) {
					let vt = vAfter(D * 0.4), Tf = 0, s = 0, R = 0, e = 0, arc = 0
					for (let pass = 0; pass < 2; pass++) {
						R = clamp(vt * vt / (g * GRAVITY), 15, 220)
						arc = R * (th - phi)
						e = clamp(vt * 2.4, 14, 40)
						Tf = Math.max(4, Math.round(2 * vt * Math.sin(-phi) / GRAVITY * k))
						const r = D - Tf
						s = rideDist(r) - dE - arc - e
						vt = vAfter(r) - GRAVITY * R * (1 - Math.cos(th - phi)) / Math.max(1, vt) // the arc's climb
						if (vt < 1.2) break
					}
					if (vt < 1.2 || Tf > D - 2 || s < -6) continue
					cands.push({ kind: 'kick', Tf, s: Math.max(0, s), phi, R, e })
				}
			}
		}
		const children = []
		const tried = new Set()
		for (const c of cands) {
			const key = `${c.kind}|${Math.round(c.s / 2)}|${Math.round(c.phi / DEG)}|${Math.round(c.R / 4)}`
			if (tried.has(key)) continue
			tried.add(key)
			const cont = continuation(node.pad, c, node.nextId)
			let ok = true
			for (const l of cont.lines) if (haunts(l, histories, node.frame + 1) || recentLines.some(m => m.id !== node.pad.id && segmentsCross(l, m))) { ok = false; break }
			if (!ok) { no('haunted run'); continue }
			for (const l of cont.lines) track.add(l)
			const padIds = new Set([node.pad.id, ...cont.lines.map(l => l.id)])
			const r = r0.clone()
			const hist = newHistory(node.frame + 1, D)
			let lastContact = node.frame, stress = 0, fail = null, apexY = Infinity, minVx = Infinity
			let takeoffY = null
			for (let f = node.frame + 1; f < H; f++) {
				touched.length = 0
				step(track, r, touched)
				simulated++
				if (r.crashed || r.sledBroken) { fail = 'crash'; break }
				for (let k = 0; k < touched.length; k++) if (!padIds.has(touched[k])) { fail = 'touched'; break }
				if (fail) break
				if (touched.length) lastContact = f
				const st = r.stress()
				if (st > stress) stress = st
				if (stress > o.maxStress) { fail = 'stress'; break }
				const vx = r.velocity().x
				if (vx < minVx) minVx = vx
				if (vx < 0.5 && (node.depth > 0 || f > 40)) { fail = 'stalled'; break }
				record(hist, r)
				ring[f % RING].copyFrom(r)
			}
			if (!fail && H - (lastContact + 1) < 3) fail = 'no flight'
			if (!fail && H - node.frame < RING + 1) fail = 'short'
			if (fail) { no(c.kind + ':' + fail); for (const l of cont.lines) track.remove(l.id); continue }
			// flight: apex and the height he took off at
			const off = lastContact + 1
			for (let k = off - node.frame - 1; k < hist.count; k++) {
				let cy = 0
				for (let i = 0; i < N_CONTACT; i++) cy += hist.pts[(k * N_CONTACT + i) * 2 + 1]
				cy /= N_CONTACT
				if (takeoffY == null) takeoffY = cy
				if (cy < apexY) apexY = cy
			}
			const before = ring[(H - 1) % RING]
			const free = before.clone()
			touched.length = 0
			step(track, free, touched)
			if (touched.length) { no('touch at H'); for (const l of cont.lines) track.remove(l.id); continue }
			const vel = free.velocity()
			const av = Math.atan2(vel.y, vel.x)
			const speedLand = Math.hypot(vel.x, vel.y)
			const Tf = H - off
			const deltaWant = (9 + 13 * (hit.strength ?? 0.5)) * DEG
			const sled = sledAngle(before)
			const angles = (wide ? [-8, -3, 0, 5, 10, 16] : [-4, 0, 6]).map(dk => av - deltaWant - dk * DEG)
			if (av - sled > 4 * DEG && av - sled < 40 * DEG) angles.push(sled) // flat onto the sled
			const types = ['solid']
			if (speedLand > vWant * 1.08) types.push('brake')
			if (speedLand < vWant * 0.92) types.push('boost')
			for (const [ai, angle] of angles.entries()) for (const type of types) {
				if (type !== 'solid' && ai > 1 && ai !== angles.length - 1) continue
				const theta = clamp(angle, -30 * DEG, 52 * DEG)
				const delta = av - theta
				if (delta < 3 * DEG) { no('flat'); continue }
				const nx = -Math.sin(theta), ny = Math.cos(theta), ux = Math.cos(theta), uy = Math.sin(theta)
				let mPrev = -Infinity, mNow = -Infinity, aMin = Infinity, aMax = -Infinity
				for (let i = 0; i < N_CONTACT; i++) {
					const q = before.s[i * STRIDE] * nx + before.s[i * STRIDE + 1] * ny
					const w = free.s[i * STRIDE] * nx + free.s[i * STRIDE + 1] * ny
					const a = free.s[i * STRIDE] * ux + free.s[i * STRIDE + 1] * uy
					if (q > mPrev) mPrev = q
					if (w > mNow) mNow = w
					if (a < aMin) aMin = a
					if (a > aMax) aMax = a
				}
				if (mNow - mPrev < 0.5) { no('not falling'); continue }
				const d = mPrev + 0.5 * (mNow - mPrev)
				const p1 = { x: nx * d + ux * (aMin - 7), y: ny * d + uy * (aMin - 7) }
				const p2 = { x: nx * d + ux * (aMax + 3), y: ny * d + uy * (aMax + 3) }
				const pad = padLine(cont.lines.length ? cont.lines.at(-1).id + 1 : node.nextId, p1, p2, type)
				if (haunts(pad, [hist, ...histories], H - RING + 2)) { no('haunted pad'); continue }
				if (cont.lines.some(m => segmentsCross(pad, m)) || recentLines.some(m => segmentsCross(pad, m))) { no('crossing'); continue }
				track.add(pad)
				const r2 = ring[(H - RING + 1) % RING].clone()
				let landed = false, early = false
				for (let f = H - RING + 2; f <= H; f++) {
					touched.length = 0
					step(track, r2, touched)
					simulated++
					if (touched.includes(pad.id)) { if (f < H) early = true; else landed = true }
					else if (touched.length && f === H) early = true
				}
				let childRider = null, settle = 0, orient = 0
				if (landed && !early && !r2.crashed) {
					childRider = r2.clone()
					orient = Math.abs(sled - theta)
					// a few frames on a provisional run-out: does he survive the landing?
					const run = solid(pad.id + 1, p2.x, p2.y, p2.x + ux * 60, p2.y + uy * 60, true, false)
					track.add(run)
					for (let f = 0; f < 5 && !r2.crashed; f++) { step(track, r2); simulated++; settle = Math.max(settle, r2.stress()) }
					track.remove(run.id)
					if (r2.crashed || r2.sledBroken || settle > o.maxStress) childRider = null
				}
				track.remove(pad.id)
				if (!childRider) { no(c.kind + ':' + (landed ? (early ? 'early' : r2.crashed ? 'landing crash' : r2.sledBroken ? 'sled broke' : 'landing stress') : early ? 'early' : 'missed')); continue }
				const histH = newHistory(H, 1)
				record(histH, childRider)
				const apexH = takeoffY - apexY
				const landY = childRider.centre().y
				const dropWant = 0.12 * Tf + 4
				const worst = Math.max(stress, settle)
				const cost =
					1.2 * ((Tf - tfWant) / (3 + 0.25 * tfWant)) ** 2
					+ 0.6 * ((landY - takeoffY - dropWant) / (6 + 0.25 * Tf)) ** 2 * (o.pitchScale ? 0.3 : 1)
					+ (o.pitchScale ? 1.2 * ((landY - yWant) / 16) ** 2 : 0)
					+ 2.0 * ((childSpeed(childRider) - vWant) / vWant) ** 2
					+ 8 * Math.max(0, worst - 0.35) ** 2
					+ (orient / (28 * DEG)) ** 2
					+ 0.5 * ((delta - deltaWant) / (10 * DEG)) ** 2
					+ (Math.max(0, Math.abs(theta) - 38 * DEG) / (8 * DEG)) ** 2
					+ (speedLand > 11 ? (speedLand - 11) ** 2 : 0)
					+ rand() * 0.05
				children.push({
					parent: node, depth: node.depth + 1, frame: H, hit: hit.index, cost: node.cost + cost,
					rider: childRider, lines: [...cont.lines, pad], nextId: pad.id + 1,
					pad: { ex: p2.x, ey: p2.y, theta, id: pad.id }, hist, histH,
					info: { kind: c.kind, pad: type, gap: D, Tf, takeoff: off, apex: apexH, drop: landY - takeoffY, speed: speedLand, theta, delta, stress: worst, orient, step: cost },
				})
			}
			for (const l of cont.lines) track.remove(l.id)
		}
		return children
	}

	let beam = [root]
	const skipped = []
	for (let i = 0; i < hits.length; i++) {
		const hit = { ...hits[i], index: i }
		let children = []
		for (const node of beam) children.push(...expand(node, hit.frame, hit, false))
		if (!children.length) for (const node of beam) children.push(...expand(node, hit.frame, hit, true))
		if (!children.length) { skipped.push(i); continue }
		children.sort((a, b) => a.cost - b.cost)
		const next = []
		for (const c of children) {
			const p = c.rider.centre(), v = c.rider.velocity()
			if (next.some(n => { const q = n.rider.centre(), u = n.rider.velocity(); return Math.hypot(p.x - q.x, p.y - q.y) < 2.5 && Math.hypot(v.x - u.x, v.y - u.y) < 0.25 })) continue
			next.push(c)
			if (next.length >= o.beam) break
		}
		beam = next
		o.onProgress?.({ done: i + 1, total: hits.length, frames: simulated, ms: Date.now() - t0 })
	}

	// the run-out after the last landing: a long, gentle slope he can ride off into
	let end = null
	for (const node of beam) {
		world.use(node)
		const pad = node.pad
		const c = continuation(pad, { s: 20, phi: Math.min(pad.theta, 8 * DEG), R: 120, e: 900 }, node.nextId)
		for (const l of c.lines) world.track.add(l)
		const r = node.rider.clone()
		let ok = true
		for (let f = 0; f < 4 * FPS; f++) { step(world.track, r); if (r.crashed || r.sledBroken) { ok = false; break } }
		for (const l of c.lines) world.track.remove(l.id)
		if (ok) { end = { node, lines: c.lines }; break }
	}
	if (!end) end = { node: beam[0], lines: [] }

	const path = []
	for (let n = end.node; n; n = n.parent) path.push(n)
	path.reverse()
	const lines = path.flatMap(n => n.lines).concat(end.lines)
	const pads = path.slice(1).map(n => ({ hit: n.hit, frame: n.frame, lineId: n.pad.id, ...n.info }))
	const lastFrame = end.node.frame + 4 * FPS
	return {
		lines, start: { x: 0, y: 0 }, duration: lastFrame, pads, skipped,
		why,
		stats: { hits: hits.length, landed: pads.length, skipped: skipped.length, frames: simulated, ms: Date.now() - t0, lines: lines.length },
	}
}

/**
 * Ride a planned (or loaded) track from the start and check every landing: Bosh must first touch
 * each pad exactly on its hit's frame, and never come off. Returns per-pad results.
 */
export function verifyPlan(lines, pads, { start = { x: 0, y: 0 }, velocity, frames } = {}) {
	const track = new Track(lines)
	const r = new Rider(start, velocity, { scarf: false })
	const first = new Map()
	const touched = []
	const n = frames ?? Math.max(...pads.map(p => p.frame)) + 2 * FPS
	let crash = null
	for (let f = 1; f <= n; f++) {
		touched.length = 0
		step(track, r, touched)
		for (const id of touched) if (!first.has(id)) first.set(id, f)
		if (crash == null && (r.crashed || r.sledBroken)) crash = f
	}
	const results = pads.map(p => ({ ...p, touchedAt: first.get(p.lineId) ?? null, exact: first.get(p.lineId) === p.frame }))
	return { results, exact: results.filter(p => p.exact).length, crash }
}
