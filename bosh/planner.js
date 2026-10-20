// Lays a Line Rider track so Bosh lands on every hit frame: for each landing it tries kickers, dives,
// drops and loops off the pad he is on (smooth curves, cut into short lines), simulates each one
// with the real physics, puts a pad under him on the hit's frame, and keeps the best few runs (beam
// search). A take-off note fixes the frame he leaves the lip on too: the run-up is solved for it.
// Nothing is drawn by hand and nothing is faked: the exported track rides the same on linerider.com.
import { Track, Rider, step, makeLine, SOLID, ACCEL, FPS, GRAVITY, P, N_CONTACT, STRIDE } from './physics.js'
import { smoothPath, chainLines, DEG } from './geometry.js'

const RING = 5
const TWO_PI = 2 * Math.PI

export const DEFAULTS = {
	beam: 4,
	seed: 1,
	speedLow: 4.5, // px / frame wanted in quiet music
	speedHigh: 8.5, //  … and in busy, loud music
	startAngle: 26 * DEG,
	maxStress: 0.8, // of the binding that throws Bosh off the sled
	descent: 0.3, // px / frame the track sinks on average
	pitchScale: 3, // px a semitone higher the melody puts the pads
	excitement: 0.5, // 0–1: bigger air, faster, more loops
	red: false, // acceleration lines: red pads to speed him up or slow him down, red-lined loops. Off, his
	//            speed comes only from gravity: slopes and drops speed him up, climbs and hard landings slow him
	ds: 6, // px: the longest line on a curve
}

function mulberry32(a) {
	return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296 }
}
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))
const hub = x => Math.abs(x) <= 1 ? x * x : 2 * Math.abs(x) - 1 // squared near, linear far

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

const speedOf = r => { const v = r.velocity(); return Math.hypot(v.x, v.y) }
const sledAngle = r => Math.atan2(r.y(P.NOSE) - r.y(P.TAIL), r.x(P.NOSE) - r.x(P.TAIL))

// ── Shapes ──────────────────────────────────────────────────────────────

/** Length of a smooth turn by `turn` that pulls at most G × gravity at speed v (peak curvature 2 turn / len). */
const turnLen = (turn, v, G) => Math.max(10, 2 * Math.abs(turn) * v * v / (G * GRAVITY))

/**
 * What a candidate lays from the end of the pad he is on (heading th):
 * drop  — straight on for s, and off the end
 * kick  — straight s, curve up to phi, straight exit e (so he leaves without spinning)
 * dive  — straight s, curve down to beta, straight d, curve up to phi, exit e: speed for a big jump
 * climb — straight s, curve up to phi, uphill for c, over a rounded crest and off: slows him down
 * loop  — from a steep pad, most of a circle (radius R) up and over to heading `out`, straight s,
 *         then off the end or curved up to phi with exit e
 * `s` is the length a take-off note is solved on.
 */
function piecesOf(c, th) {
	if (c.kind === 'drop') return [{ len: c.s }]
	if (c.kind === 'kick') return [{ len: c.s }, { len: c.L, turn: c.phi - th, ease: 0.5 }, { len: c.e }]
	if (c.kind === 'dive') return [{ len: c.s }, { len: c.L1, turn: c.beta - th, ease: 0.5 }, { len: c.d }, { len: c.L2, turn: c.phi - c.beta, ease: 0.5 }, { len: c.e }]
	if (c.kind === 'climb') return [{ len: c.s }, { len: c.L1, turn: c.phi - th, ease: 0.5 }, { len: c.c }, { len: c.L2, turn: c.crest - c.phi, ease: 0.5 }]
	const turn = c.out - th - TWO_PI
	const p = [{ len: c.R * Math.abs(turn) / 0.8, turn, ease: 0.2 }, { len: c.s }]
	if (c.phi != null) p.push({ len: c.L, turn: c.phi - c.out, ease: 0.5 }, { len: c.e })
	return p
}

function shapeLines(pad, c, id0, ds) {
	const pieces = piecesOf(c, pad.theta)
	const { pts } = smoothPath({ x: pad.ex, y: pad.ey }, pad.theta, pieces, { ds })
	const lines = chainLines(pts, id0) // not extended back past the pad's end, nor off the lip
	if (!c.red) return lines
	// red lines (pushing the way he goes) over the first part of the loop
	const redLen = pieces[0].len * c.red
	let along = 0
	return lines.map(l => { const red = along < redLen; along += l.length; return red ? makeLine({ ...l, type: ACCEL }) : l })
}

function segmentsCross(a, b) {
	if (Math.max(a.x1, a.x2) < Math.min(b.x1, b.x2) || Math.max(b.x1, b.x2) < Math.min(a.x1, a.x2) || Math.max(a.y1, a.y2) < Math.min(b.y1, b.y2) || Math.max(b.y1, b.y2) < Math.min(a.y1, a.y2)) return false
	const shared = (px, py, qx, qy) => Math.abs(px - qx) < 1e-6 && Math.abs(py - qy) < 1e-6
	if (shared(a.x1, a.y1, b.x1, b.y1) || shared(a.x1, a.y1, b.x2, b.y2) || shared(a.x2, a.y2, b.x1, b.y1) || shared(a.x2, a.y2, b.x2, b.y2)) return false
	const d = (px, py, qx, qy, rx, ry) => (qx - px) * (ry - py) - (qy - py) * (rx - px)
	const d1 = d(b.x1, b.y1, b.x2, b.y2, a.x1, a.y1), d2 = d(b.x1, b.y1, b.x2, b.y2, a.x2, a.y2)
	const d3 = d(a.x1, a.y1, a.x2, a.y2, b.x1, b.y1), d4 = d(a.x1, a.y1, a.x2, a.y2, b.x2, b.y2)
	return (d1 > 0) !== (d2 > 0) && (d3 > 0) !== (d4 > 0)
}

/** Does a loop's way out (its lines after the turn) keep clear of the pad he came in on? */
function loopClear(node, lines) {
	const pad = node.lines.find(l => l.id === node.pad.id)
	if (!pad) return true
	let turned = 0, prev = Math.atan2(lines[0].vy, lines[0].vx)
	for (const l of lines) {
		const h = Math.atan2(l.vy, l.vx)
		let d = h - prev
		while (d > Math.PI) d -= TWO_PI
		while (d < -Math.PI) d += TWO_PI
		turned += d; prev = h
		if (turned > -Math.PI) continue // still on the way round
		for (const [px, py] of [[pad.x1, pad.y1], [pad.x2, pad.y2]]) if (pointSegment(px, py, l) < 24) return false
	}
	return true
}
const pointSegment = (px, py, l) => {
	const t = clamp(((px - l.x1) * l.vx + (py - l.y1) * l.vy) * l.invLengthSq, 0, 1)
	return Math.hypot(px - l.x1 - t * l.vx, py - l.y1 - t * l.vy)
}

// ── Where he has been ───────────────────────────────────────────────────

function newHistory(from, capacity) { return { from, count: 0, pts: new Float32Array(capacity * N_CONTACT * 4), xmin: Infinity, xmax: -Infinity, ymin: Infinity, ymax: -Infinity } }
function record(h, r) {
	const o = h.count * N_CONTACT * 4
	for (let i = 0; i < N_CONTACT; i++) {
		const s = i * STRIDE, x = r.s[s], y = r.s[s + 1]
		h.pts[o + i * 4] = x; h.pts[o + i * 4 + 1] = y
		h.pts[o + i * 4 + 2] = x - r.s[s + 2]; h.pts[o + i * 4 + 3] = y - r.s[s + 3]
		if (x < h.xmin) h.xmin = x
		if (x > h.xmax) h.xmax = x
		if (y < h.ymin) h.ymin = y
		if (y > h.ymax) h.ymax = y
	}
	h.count++
}
const overlaps = (h, b, m) => h.count && h.xmax >= b.x0 - m && h.xmin <= b.x1 + m && h.ymax >= b.y0 - m && h.ymin <= b.y1 + m

/**
 * Would a new line have caught Bosh anywhere he has been (before frame `before`)? Only from its
 * solid side: passing through a line from behind is how loops and jumps into them work.
 */
function haunts(line, histories, before) {
	const x0 = Math.min(line.x1, line.x2) - 14, x1 = Math.max(line.x1, line.x2) + 14
	const y0 = Math.min(line.y1, line.y2) - 14, y1 = Math.max(line.y1, line.y2) + 14
	for (const h of histories) {
		if (!h || h.xmax < x0 || h.xmin > x1 || h.ymax < y0 || h.ymin > y1) continue
		for (let k = 0; k < h.count; k++) {
			if (h.from + k >= before) break
			for (let i = 0; i < N_CONTACT; i++) {
				const o = (k * N_CONTACT + i) * 4
				const px = h.pts[o], py = h.pts[o + 1]
				if (px < x0 || px > x1 || py < y0 || py > y1) continue
				const ox = px - line.x1, oy = py - line.y1
				const perp = line.nx * ox + line.ny * oy
				if (!(perp > -1.5 && perp < 11.5)) continue
				const along = (line.vx * ox + line.vy * oy) * line.invLengthSq * line.length
				if (!(along > line.left * line.length - 1.5 && along < line.right * line.length + 1.5)) continue
				if (line.nx * h.pts[o + 2] + line.ny * h.pts[o + 3] > -0.4) return true
			}
		}
	}
	return false
}

/**
 * Plan a track for `hits` ([{frame, strength 0–1, energy 0–1, contour, takeoff?, move?, echo?}],
 * frames ascending, the first well after 0 for the run-up). Returns the lines, which landing pad
 * belongs to which hit, and stats.
 */
export function planTrack(hits, options = {}) {
	const o = { ...DEFAULTS, ...options }
	const exc = clamp(o.excitement, 0, 1)
	const maxSpeed2 = (15 + 3 * exc) ** 2
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
	const addAll = lines => { for (const l of lines) world.track.add(l) }
	const removeAll = lines => { for (const l of lines) world.track.remove(l.id) }

	/** Ride from `node` on the track as it is now, frames node.frame + 1 … until − 1. */
	function ride(node, until, allowed, { hist = null, loopy = false } = {}) {
		const r = node.rider.clone()
		let lastContact = node.frame, stress = 0, fail = null
		for (let f = node.frame + 1; f < until; f++) {
			touched.length = 0
			step(world.track, r, touched)
			simulated++
			if (r.crashed || r.sledBroken) { fail = 'crash'; break }
			for (let k = 0; k < touched.length; k++) if (!allowed.has(touched[k])) { fail = 'touched'; break }
			if (fail) break
			if (touched.length) lastContact = f
			const st = r.stress()
			if (st > stress) stress = st
			if (stress > o.maxStress) { fail = 'stress'; break }
			const v = r.velocity(), v2 = v.x * v.x + v.y * v.y
			if ((loopy ? v2 < 0.5 : v.x < 0.5) && (node.depth > 0 || f > 40)) { fail = 'stalled'; break }
			if (v2 > maxSpeed2) { fail = 'too fast'; break } // squeezed between lines and shot out: real, but silly
			if (hist) { record(hist, r); ring[f % RING].copyFrom(r) }
		}
		return { r, lastContact, stress, fail }
	}

	/** The first frame he is in the air (for 3 frames) off shape `c`, or NaN if the ride fails. */
	function takeoffOf(node, c, until, allowed0) {
		const lines = shapeLines(node.pad, c, node.nextId, c.ds ?? o.ds)
		addAll(lines)
		const allowed = new Set([...allowed0, ...lines.map(l => l.id)])
		const res = ride(node, until, allowed, { loopy: c.kind === 'loop' })
		removeAll(lines)
		return res.fail ? NaN : res.lastContact + 1
	}

	/** Solve the run-up `c.s` so he leaves the lip on frame `toff` (bisection: a longer run-up is a later take-off). */
	function timeTakeoff(node, c, toff, allowed0, vLip) {
		const probe = s => { c.s = s; return takeoffOf(node, c, toff + 3, allowed0) }
		const first = probe(0)
		if (!(first <= toff)) return false
		if (first === toff) return true
		let lo = 0, hi = Math.max(24, vLip * (toff - node.frame)), t = probe(hi)
		for (let k = 0; k < 3 && t < toff; k++) { lo = hi; hi *= 2; t = probe(hi) }
		if (t < toff) return false
		for (let k = 0; k < 9; k++) { const m = (lo + hi) / 2; if (probe(m) < toff) lo = m; else hi = m }
		for (const f of [0.45, 0.25, 0.1, 0]) { const s = hi + f * vLip; if (probe(s) === toff) { c.s = s; return true } }
		return false
	}

	/** Shapes to try from `node` towards a landing on frame H. */
	function shapes(node, H, hit, wide, ctx) {
		const { speed, th, dE, acc, tfWant, vWant, toff } = ctx
		const D = H - node.frame
		const out = []
		const rideDist = r => r <= 0 ? 0 : Math.max(0, speed * r + 0.5 * acc * r * r)
		const vAfter = r => Math.max(0.6, speed + acc * r)
		const jit = () => 0.94 + rand() * 0.12
		const ascend = hit.move === 'loop' // arrive still climbing, onto the wall of a loop
		if (node.loopEntry) {
			// a loop loses most of his speed (each frame's collision takes off the part of his velocity
			// the curve turns away): with red lines its climbing half is red, as Line Rider builders do;
			// without, it is small and he needs the speed of a dive to get in. Out steeply, so the way out
			// passes the pad he came in on: by R (1 − cos(out + φ)) − 20 sin(out + φ) px
			for (const R of o.red ? [38, 48] : [22, 28, 34]) for (const outDeg of [62, 76, 88]) {
				const outA = outDeg * DEG
				for (const kick of [false, true]) for (const t of toff != null ? [toff, null] : [null]) {
					out.push({ kind: 'loop', R, out: outA, red: o.red ? 0.55 : 0, s: 16, toff: t, untimed: toff != null && t == null, ...(kick ? { phi: -12 * DEG, L: turnLen(outA + 12 * DEG, 6, 4), e: 18 } : {}) })
				}
			}
		}
		const timedOnly = toff != null && !wide
		// drops
		const dropTfs = toff != null ? [H - toff] : (wide ? [0.35, 0.5, 0.7, 0.9] : [0.45, 0.7]).map(k => clamp(Math.round(Math.min(16, D * k) * jit()), 3, D - 2))
		for (const Tf of dropTfs) out.push({ kind: 'drop', s: Math.max(0, rideDist(D - Tf) - dE), toff })
		// kicks: leave at phi and speed vt; left alone he is back at the take-off height after
		// Tn = 2 vt sin(−phi) / g frames, so flights are chosen around that (before its middle onto a loop)
		const phis = ascend ? [-40, -52, -62] : timedOnly ? [-8, -18, -30, -42] : wide ? [-4, -10, -17, -25, -33, -42, -52] : [-6, -14, -24, -36]
		const Gs = timedOnly ? [4] : wide ? [2.5, 4, 6] : [3, 5]
		const ks = toff != null ? [1] : ascend ? [0.25, 0.35, 0.45] : wide ? [0.7, 0.9, 1.15, 1.4] : [0.85, 1.2]
		for (const deg of phis) {
			const phi = deg * DEG * jit()
			if (phi > th - 3 * DEG) continue
			for (const G of Gs) for (const k of ks) {
				let vt = vAfter(D * 0.4), Tf = 0, s = 0, L = 0, e = 0
				for (let pass = 0; pass < 2; pass++) {
					L = turnLen(th - phi, vt, G)
					e = clamp(vt * 2.4, 14, 40)
					Tf = toff != null ? H - toff : Math.max(4, Math.round(2 * vt * Math.sin(-phi) / GRAVITY * k))
					const r = D - Tf
					s = rideDist(r) - dE - L - e
					vt = vAfter(r) - GRAVITY * L * 0.5 * Math.sin(th - phi) / Math.max(1, vt) // the climb
					if (vt < 1.2) break
				}
				if (vt < 1.2 || Tf > D - 2 || (toff == null && s < -6)) continue
				out.push({ kind: 'kick', phi, L, e, s: Math.max(0, s), toff })
			}
		}
		// climbs: uphill and over a crest, his speed turned into height, when he is going too fast
		if (!ascend && !node.loopEntry && D >= 20) {
			const fast = speed > vWant * 1.05
			for (const deg of fast || wide ? [-10, -20] : [-12]) for (const c of timedOnly ? [30] : fast || wide ? [40, 100] : [50]) {
				const phi = deg * DEG
				if (phi > th - 3 * DEG) continue
				const L1 = turnLen(th - phi, speed, 3), crest = 14 * DEG, L2 = turnLen(crest - phi, Math.max(2, speed * 0.85), 2)
				const climbT = (dE + L1 + c + L2) / Math.max(1, speed * 0.9)
				const Tf = toff != null ? H - toff : clamp(Math.round(Math.min(16, (D - climbT) * 0.6)), 3, D - 2)
				if (toff == null && D - Tf < climbT) continue
				out.push({ kind: 'climb', phi, L1, c, L2, crest, s: toff != null ? 0 : Math.max(0, rideDist(D - Tf) - dE - L1 - c - L2), toff })
			}
		}
		// dives: steeper first, for the speed of a big jump or a loop
		if ((D >= 36 || ascend || speed < vWant - 1.2) && th < 40 * DEG) {
			const betas = timedOnly ? [46] : [40, 54], ds = timedOnly ? [60] : wide ? [30, 80, 160] : [40, 100]
			const dphis = ascend ? [-36, -50] : timedOnly ? [-20, -36] : [-16, -30, -42]
			for (const b of betas) for (const d of ds) for (const deg of dphis) {
				const beta = b * DEG, phi = deg * DEG
				const L1 = turnLen(beta - th, Math.max(speed, 2), 4)
				const fall = d * Math.sin(beta) + L1 * 0.5 * (Math.sin(th) + Math.sin(beta))
				const vd = Math.sqrt(speed * speed + 2 * GRAVITY * Math.max(0, fall))
				const L2 = turnLen(beta - phi, vd, 4), e = clamp(vd * 2.4, 14, 40)
				const vt = vd * 0.92
				const Tf = toff != null ? H - toff : Math.round(2 * vt * Math.sin(-phi) / GRAVITY * (ascend ? 0.35 : 1))
				const rideT = (dE + L1 + d + L2 + e) / Math.max(1, (speed + vd) / 2)
				if (toff == null && D - Tf < rideT) continue
				out.push({ kind: 'dive', beta, d, L1, L2, phi, e, s: 0, toff })
			}
		}
		return out
	}

	/** Every way on from `node` to a landing on frame H, scored. */
	function expand(node, H, hit, wide) {
		world.use(node)
		const D = H - node.frame
		if (D < RING + 1) return []
		const track = world.track
		const r0 = node.rider
		const speed = speedOf(r0)
		const th = node.pad.theta
		const dE = Math.cos(th) * (node.pad.ex - r0.x(P.TAIL)) + Math.sin(th) * (node.pad.ey - r0.y(P.TAIL))
		const acc = GRAVITY * Math.sin(th)
		let vWant = (o.speedLow + (o.speedHigh - o.speedLow) * (hit.energy ?? 0.5)) * (1 + 0.2 * exc)
		if (hit.move === 'loop') vWant = Math.max(vWant, 6.5)
		const tfWant = node.depth === 0 ? Math.min(22, D * 0.35) : D <= 16 ? D * 0.6 : D < 60 ? D * (0.72 + 0.1 * exc) : 43 + (D - 60) * (0.45 + 0.15 * exc)
		// the melody's contour from the last landing: higher notes, higher pads (relative, so a loop or a big drop is not paid for forever)
		// and lower when he should be faster, higher when slower: without red lines, height is the only
		// store of speed (v² changes by 2 g Δh), so the pace the music asks for is asked of the slopes
		const dropForPace = o.red ? 0 : clamp(0.6 * (vWant * vWant - speed * speed) / (2 * GRAVITY) * Math.min(1, D / 80), -90, 90)
		const yWant = r0.centre().y + o.descent * D - o.pitchScale * ((hit.contour ?? 0) - (node.contour ?? 0)) + dropForPace
		const musical = hit.takeoff != null && hit.takeoff - node.frame >= 4 && H - hit.takeoff >= 4 ? hit.takeoff : null
		const histories = []
		for (let n = node, k = 0; n && k < 14; n = n.parent, k++) histories.push(n.hist, n.histH)
		const recentLines = []
		for (let n = node, k = 0; n && k < 8; n = n.parent, k++) recentLines.push(...n.lines)
		// the same choreography as last time this bar came: the move landed on `echo`
		let echo = null
		if (hit.echo != null) for (let n = node, k = 0; n && k < hit.index - hit.echo + 4; n = n.parent, k++) if (n.hit === hit.echo) { echo = n.info; break }

		const ctx = { speed, th, dE, acc, tfWant, vWant, toff: musical }
		const cands = shapes(node, H, hit, wide, ctx)
		// untimed too when there is a loop to get into (climbing onto its wall matters more than the take-off note)
		if ((wide || hit.move === 'loop') && musical != null) for (const c of shapes(node, H, hit, wide, { ...ctx, toff: null })) if (!c.untimed) cands.push({ ...c, untimed: true })
		// Optional per-landing segmentation: callers can derive this from the
		// score's structure. It is applied before simulation, never as a
		// geometry-changing post-process after a ride has been verified.
		const segmentLength = clamp(hit.lineLength ?? o.ds, 2, 24)
		for (const c of cands) c.ds = segmentLength
		const children = []
		const tried = new Set()
		const allowed0 = [node.pad.id]
		for (const c of cands) {
			let timed = false
			if (c.toff != null) {
				timed = timeTakeoff(node, c, c.toff, allowed0, Math.max(1, speed))
				if (!timed) {
					no(c.kind + ':untimed')
					continue
				}
			}
			const key = `${c.kind}|${Math.round(c.s / 2)}|${Math.round((c.phi ?? 0) / DEG)}|${Math.round((c.L ?? c.R ?? 0) / 4)}|${c.beta ?? 0}|${c.d ?? 0}|${c.out ?? 0}|${c.c ?? 0}|${c.R ?? 0}`
			if (tried.has(key)) continue
			tried.add(key)
			const lines = shapeLines(node.pad, c, node.nextId, c.ds ?? o.ds)
			// (a loop passes over the flight that brought him, and over lines he no longer touches: the ride
			// and pastIntact check it exactly instead)
			if (c.kind !== 'loop' && lines.some(l => haunts(l, histories, node.frame + 1) || recentLines.some(m => segmentsCross(l, m)))) { no(c.kind + ':haunted run'); continue }
			if (c.kind === 'loop' && !loopClear(node, lines)) { no('loop:closes on itself'); continue }
			addAll(lines)
			const allowed = new Set([node.pad.id, ...lines.map(l => l.id)])
			const hist = newHistory(node.frame + 1, D)
			const res = ride(node, H, allowed, { hist, loopy: c.kind === 'loop' })
			let fail = res.fail
			if (!fail && H - (res.lastContact + 1) < 3) fail = 'no flight'
			if (fail) { no(c.kind + ':' + fail); if (c.kind === 'loop') o.onLoopFail?.({ rider: node.rider.clone(), frame: node.frame, H, c: { ...c }, lines: [...world.track.lines.values()], fail }); removeAll(lines); continue }
			const off = res.lastContact + 1
			// the flight: the height he took off at, and the apex
			// his pace over the whole move (what you see as his speed: path length a frame)
			let path = 0
			for (let k = 1; k < hist.count; k++) {
				let dx = 0, dy = 0
				for (let i = 0; i < N_CONTACT; i++) { const o4 = (k * N_CONTACT + i) * 4, p4 = o4 - N_CONTACT * 4; dx += hist.pts[o4] - hist.pts[p4]; dy += hist.pts[o4 + 1] - hist.pts[p4 + 1] }
				path += Math.hypot(dx, dy) / N_CONTACT
			}
			const pace = hist.count > 1 ? path / (hist.count - 1) : speed
			let takeoffY = null, apexY = Infinity
			for (let k = off - node.frame - 1; k < hist.count; k++) {
				let cy = 0
				for (let i = 0; i < N_CONTACT; i++) cy += hist.pts[(k * N_CONTACT + i) * 4 + 1]
				cy /= N_CONTACT
				if (takeoffY == null) takeoffY = cy
				if (cy < apexY) apexY = cy
			}
			const before = ring[(H - 1) % RING]
			const free = before.clone()
			touched.length = 0
			step(track, free, touched)
			if (touched.length) { no('touch at H'); removeAll(lines); continue }
			const vel = free.velocity()
			const av = Math.atan2(vel.y, vel.x)
			const speedLand = Math.hypot(vel.x, vel.y)
			const Tf = H - off
			const sled = sledAngle(before)
			const deltaWant = (9 + 13 * (hit.strength ?? 0.5)) * DEG
			// pads: under his direction by delta (harder for stronger notes); onto a loop's wall if climbing
			const variants = []
			// Red loop entries can catch a rider near the crest, not only while
			// already travelling steeply upward; the red wall supplies the
			// remaining speed into the loop.
			const climbing = hit.move === 'loop' && (o.red
				? av < 12 * DEG && speedLand >= 2.5
				: av < -8 * DEG && speedLand >= 6)
			if (climbing) for (const dk of [8, 14, 20]) variants.push({ angle: av - dk * DEG, type: 'solid', entry: true })
			// (without red pads, the pad's angle is how the landing speeds him up or slows him down: steeper is
			// less of a bump and downhill after, flatter takes more of his speed off)
			const exitWant = (o.speedLow + (o.speedHigh - o.speedLow) * (hits[hit.index + 1]?.energy ?? hit.energy ?? 0.5)) * (1 + 0.2 * exc)
			const dks = wide ? [-8, -3, 0, 5, 10, 16] : [-4, 0, 6]
			if (!o.red && speedLand < exitWant * 0.9) dks.push(-9, -13)
			if (!o.red && speedLand > exitWant * 1.1) dks.push(11, 16)
			const angles = dks.map(dk => av - deltaWant - dk * DEG)
			if (av - sled > 4 * DEG && av - sled < 40 * DEG) angles.push(sled) // flat onto the sled
			const types = ['solid']
			if (o.red && speedLand > vWant * 1.08) types.push('brake')
			if (o.red && speedLand < vWant * 0.92) types.push('boost')
			for (const [ai, angle] of angles.entries()) for (const type of types) if (type === 'solid' || ai <= 1 || ai === angles.length - 1) variants.push({ angle, type })
			for (const { angle, type, entry = false } of variants) {
				const theta = entry ? clamp(angle, -85 * DEG, -12 * DEG) : clamp(angle, -30 * DEG, 52 * DEG)
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
				const back = entry ? 3 : 7 // a loop's way out passes under the pad's back end
				const p1 = { x: nx * d + ux * (aMin - back), y: ny * d + uy * (aMin - back) }
				const p2 = { x: nx * d + ux * (aMax + 3), y: ny * d + uy * (aMax + 3) }
				const pad = padLine(lines.length ? lines.at(-1).id + 1 : node.nextId, p1, p2, type)
				if (haunts(pad, [hist, ...histories], H - RING + 2)) { no('haunted pad'); continue }
				if (lines.some(m => segmentsCross(pad, m)) || recentLines.some(m => segmentsCross(pad, m))) { no('crossing'); continue }
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
				const worst = Math.max(res.stress, settle)
				const apexWant = (0.45 + 0.55 * exc) * GRAVITY * Tf * Tf / 8
				const spectacle = entry || c.kind === 'loop'
				const parts = {
					air: 1.2 * hub((Tf - tfWant) / (3 + 0.25 * tfWant)) * (timed ? 0.3 : 1) * (spectacle ? 0.3 : 1),
					drop: 0.6 * hub((landY - takeoffY - dropWant) / (6 + 0.25 * Tf)) * (o.pitchScale ? 0.3 : 1) * (spectacle ? 0.2 : 1),
					contour: o.pitchScale ? 1.2 * (1 - 0.5 * exc) * hub((landY - yWant) / 16) * (spectacle ? 0.2 : 1) : 0,
					speed: 2.5 * ((pace - vWant) / vWant) ** 2 + 1.5 * ((speedOf(childRider) - exitWant) / exitWant) ** 2,
					air2: entry || c.kind === 'loop' ? 0 : 0.8 * exc * (Math.max(0, apexWant - apexH) / (6 + 0.4 * apexWant)) ** 2,
					stress: 8 * Math.max(0, worst - 0.35) ** 2,
					orient: (orient / (28 * DEG)) ** 2,
					delta: 0.5 * ((delta - deltaWant) / (10 * DEG)) ** 2,
					steep: entry ? 0 : (Math.max(0, Math.abs(theta) - 38 * DEG) / (8 * DEG)) ** 2 * (c.kind === 'loop' ? 0.3 : 1),
					fast: speedLand > 11 + 2 * exc ? (speedLand - 11 - 2 * exc) ** 2 : 0,
					loop: (hit.move === 'loop' ? (entry ? -1.2 * (0.5 + exc) : 0.3) : 0) + (node.loopEntry ? (c.kind === 'loop' ? -2.5 * (0.5 + exc) : 0.6) : 0),
					untimed: c.untimed ? 1.2 : 0,
					echo: echo ? 0.5 * ((echo.kind !== c.kind ? 1 : 0) + Math.min(1, Math.abs(Tf - echo.Tf) / Math.max(4, echo.Tf)) + Math.min(1, Math.abs(apexH - echo.apex) / (4 + echo.apex))) : 0,
				}
				let cost = rand() * 0.05
				for (const k in parts) cost += parts[k]
				if (entry) no('entry child')
				if (c.kind === 'loop') no('loop child')
				children.push({
					parent: node, depth: node.depth + 1, frame: H, hit: hit.index, cost: node.cost + cost,
					rider: childRider, lines: [...lines, pad], nextId: pad.id + 1, loopEntry: entry,
					pad: { ex: p2.x, ey: p2.y, theta, id: pad.id }, hist, histH, contour: hit.contour ?? 0,
					info: {
						kind: c.kind, pad: type, gap: D, Tf, takeoff: off, ...(timed ? { toff: c.toff } : {}), onNote: timed && c.toff === musical, wanted: musical != null, entry,
						apex: apexH, drop: landY - takeoffY, speed: speedLand, pace, theta, delta, stress: worst, orient, step: cost,
						...(c.kind === 'loop' ? { radius: c.R } : {}), ...(o.keepParts ? { parts } : {}),
					},
				})
			}
			removeAll(lines)
		}
		return children
	}

	/** Bit for bit, does Bosh still do what he did before this child's lines? Ride again from far enough back. */
	function pastIntact(child) {
		const b = { x0: Infinity, x1: -Infinity, y0: Infinity, y1: -Infinity }
		for (const l of child.lines) { b.x0 = Math.min(b.x0, l.x1, l.x2); b.x1 = Math.max(b.x1, l.x1, l.x2); b.y0 = Math.min(b.y0, l.y1, l.y2); b.y1 = Math.max(b.y1, l.y1, l.y2) }
		let a = child.parent
		for (let k = 0; a.parent && k < 10 && (overlaps(a.hist, b, 24) || overlaps(a.histH, b, 24)); k++) a = a.parent
		world.use(child)
		const r = a.rider.clone()
		for (let f = a.frame + 1; f <= child.frame; f++) { step(world.track, r); simulated++ }
		if (r.mounted !== child.rider.mounted || r.sledIntact !== child.rider.sledIntact) return false
		for (let i = 0; i < N_CONTACT * STRIDE; i++) if (r.s[i] !== child.rider.s[i]) return false
		return true
	}

	let beam = [root]
	const skipped = []
	for (let i = 0; i < hits.length; i++) {
		const hit = { ...hits[i], index: i }
		let children = []
		for (const node of beam) children.push(...expand(node, hit.frame, hit, false))
		if (!children.length) for (const node of beam) children.push(...expand(node, hit.frame, hit, true))
		children.sort((a, b) => a.cost - b.cost)
		// keep a loop in the running when the music asked for one: the best loop entry or loop goes first
		const special = children.find(c => c.loopEntry || c.info.kind === 'loop')
		if (special) children.unshift(special)
		const next = []
		for (const c of children) {
			if (next.includes(c)) continue
			const p = c.rider.centre(), v = c.rider.velocity()
			if (next.some(n => { const q = n.rider.centre(), u = n.rider.velocity(); return Math.hypot(p.x - q.x, p.y - q.y) < 2.5 && Math.hypot(v.x - u.x, v.y - u.y) < 0.25 })) continue
			if (!pastIntact(c)) { no('past changed'); continue }
			if (c.loopEntry) no('entry kept')
			next.push(c)
			if (next.length >= o.beam) break
		}
		if (!next.length) { skipped.push(i); continue }
		o.onStep?.(i, children, next)
		beam = next
		o.onProgress?.({ done: i + 1, total: hits.length, frames: simulated, ms: Date.now() - t0 })
	}

	// the run-out after the last landing: a long, gentle slope he can ride off into
	let end = null
	for (const node of beam) {
		world.use(node)
		const th = node.pad.theta
		const lines = shapeLines(node.pad, { kind: 'kick', s: 20, phi: Math.min(th, 8 * DEG), L: 140, e: 900 }, node.nextId, o.ds)
		addAll(lines)
		const r = node.rider.clone()
		let ok = true
		for (let f = 0; f < 4 * FPS; f++) { step(world.track, r); if (r.crashed || r.sledBroken) { ok = false; break } }
		removeAll(lines)
		if (ok) { end = { node, lines }; break }
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
		stats: {
			hits: hits.length, landed: pads.length, skipped: skipped.length, frames: simulated, ms: Date.now() - t0, lines: lines.length,
			loops: pads.filter(p => p.kind === 'loop').length, onNote: pads.filter(p => p.onNote).length, takeoffNotes: pads.filter(p => p.wanted).length,
		},
	}
}

/**
 * Ride a planned (or loaded) track from the start and check every landing: Bosh must first touch
 * each pad exactly on its hit's frame, leave the lip exactly on a take-off note's frame (touching
 * nothing from then to the landing), and never come off. Returns per-pad results.
 */
export function verifyPlan(lines, pads, { start = { x: 0, y: 0 }, velocity, frames } = {}) {
	const track = new Track(lines)
	const r = new Rider(start, velocity, { scarf: false })
	const first = new Map()
	const touched = []
	const n = frames ?? Math.max(...pads.map(p => p.frame)) + 2 * FPS
	const contact = new Uint8Array(n + 1)
	let crash = null
	for (let f = 1; f <= n; f++) {
		touched.length = 0
		step(track, r, touched)
		if (touched.length) contact[f] = 1
		for (const id of touched) if (!first.has(id)) first.set(id, f)
		if (crash == null && (r.crashed || r.sledBroken)) crash = f
	}
	const results = pads.map(p => {
		const exact = first.get(p.lineId) === p.frame
		let offExact = null
		if (p.toff != null) {
			offExact = contact[p.toff - 1] === 1
			for (let f = p.toff; f < p.frame && offExact; f++) if (contact[f]) offExact = false
		}
		return { ...p, touchedAt: first.get(p.lineId) ?? null, exact, offExact }
	})
	return { results, exact: results.filter(p => p.exact).length, takeoffs: results.filter(p => p.offExact).length, crash }
}
