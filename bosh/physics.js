// Line Rider 6.2 physics, rewritten after lr-core (David Lu, MIT, github.com/conundrumer/lr-core),
// the engine linerider.com runs. Same rider, same order of operations and the same floating-point
// arithmetic, so a track rides here frame for frame as it does there (bosh/test/oracle.mjs checks
// it against lr-core itself). Mutable and allocation-free per frame, so the planner can afford
// millions of frames.

export const FPS = 40
export const GRAVITY = 0.175
export const ITERATIONS = 6
export const GRID_SIZE = 14
export const MAX_FORCE_LENGTH = 10
const MIN_EXTENSION_RATIO = 0.25
const ACC = 0.1
export const START_VELOCITY = Object.freeze({ x: 0.4, y: 0 })
export const SOLID = 0, ACCEL = 1, SCENERY = 2

// Bosh: 10 contact points, then the 7 points of the scarf (which never touch anything).
export const POINTS = ['PEG', 'TAIL', 'NOSE', 'STRING', 'BUTT', 'SHOULDER', 'RHAND', 'LHAND', 'LFOOT', 'RFOOT',
	'SCARF_0', 'SCARF_1', 'SCARF_2', 'SCARF_3', 'SCARF_4', 'SCARF_5', 'SCARF_6']
export const P = Object.fromEntries(POINTS.map((n, i) => [n, i]))
const BODY_XY = [[0, 0], [0, 5], [15, 5], [17.5, 0], [5, 0], [5, -5.5], [11.5, -5], [11.5, -5], [10, 5], [10, 5],
	[3, -5.5], [1, -5.5], [-1, -5.5], [-3, -5.5], [-5, -5.5], [-7, -5.5], [-9, -5.5]]
const FRICTION = [0.8, 0, 0, 0, 0.8, 0.8, 0.1, 0.1, 0, 0]
export const N_CONTACT = 10, N_POINTS = 17, STRIDE = 6 // x, y, prevX, prevY, velX, velY

const STICK = 0, BIND = 1, REPEL = 2
const ENDURANCE = 0.057
// [type, p1, p2] in lr-core's order (SHOULDER_RHAND twice, as in the Flash original)
const CONSTRAINTS = [
	[STICK, 'PEG', 'TAIL'], [STICK, 'TAIL', 'NOSE'], [STICK, 'NOSE', 'STRING'], [STICK, 'STRING', 'PEG'],
	[STICK, 'PEG', 'NOSE'], [STICK, 'STRING', 'TAIL'],
	[BIND, 'PEG', 'BUTT'], [BIND, 'TAIL', 'BUTT'], [BIND, 'NOSE', 'BUTT'],
	[STICK, 'SHOULDER', 'BUTT'], [STICK, 'SHOULDER', 'LHAND'], [STICK, 'SHOULDER', 'RHAND'],
	[STICK, 'BUTT', 'LFOOT'], [STICK, 'BUTT', 'RFOOT'], [STICK, 'SHOULDER', 'RHAND'],
	[BIND, 'SHOULDER', 'PEG'], [BIND, 'STRING', 'LHAND'], [BIND, 'STRING', 'RHAND'],
	[BIND, 'LFOOT', 'NOSE'], [BIND, 'RFOOT', 'NOSE'],
	[REPEL, 'SHOULDER', 'LFOOT'], [REPEL, 'SHOULDER', 'RFOOT'],
]
const restDist = (a, b) => {
	const dx = BODY_XY[b][0] - BODY_XY[a][0], dy = BODY_XY[b][1] - BODY_XY[a][1]
	return Math.sqrt(dx * dx + dy * dy)
}
const C_TYPE = new Uint8Array(CONSTRAINTS.length), C_A = new Uint8Array(CONSTRAINTS.length), C_B = new Uint8Array(CONSTRAINTS.length)
const C_REST = new Float64Array(CONSTRAINTS.length), C_ENDURANCE = new Float64Array(CONSTRAINTS.length)
CONSTRAINTS.forEach(([type, a, b], i) => {
	C_TYPE[i] = type; C_A[i] = P[a]; C_B[i] = P[b]
	let length = restDist(P[a], P[b])
	length *= type === REPEL ? 0.5 : 1
	C_REST[i] = length
	C_ENDURANCE[i] = ENDURANCE * length * 0.5
})
export const BIND_STICKS = [...C_TYPE.keys()].filter(i => C_TYPE[i] === BIND)
const SCARF_REST = new Float64Array(7)
for (let i = 0; i < 7; i++) SCARF_REST[i] = restDist(i === 0 ? P.SHOULDER : P.SCARF_0 + i - 1, P.SCARF_0 + i)

// ── Lines ───────────────────────────────────────────────────────────────

/** A line from linerider.com's JSON ({id, type, x1, y1, x2, y2, flipped, leftExtended, rightExtended}, or `extended` as bits) with lr-core's precomputed values. */
export function makeLine(data) {
	const type = data.type ?? SOLID
	const flipped = !!data.flipped
	let leftExtended = !!data.leftExtended, rightExtended = !!data.rightExtended
	if (data.extended) { leftExtended = !!(data.extended & 1); rightExtended = !!(data.extended & 2) }
	const { id, x1, y1, x2, y2 } = data
	const vx = x2 - x1, vy = y2 - y1
	const lengthSq = vx * vx + vy * vy
	const length = Math.sqrt(lengthSq)
	const k = 1 / length * (flipped ? -1 : 1)
	const nx = -vy * k, ny = vx * k
	const extension = Math.min(MIN_EXTENSION_RATIO, MAX_FORCE_LENGTH / length)
	const s = ACC * (flipped ? -1 : 1)
	return {
		id, type, x1, y1, x2, y2, flipped, leftExtended, rightExtended,
		collidable: type === SOLID || type === ACCEL,
		vx, vy, nx, ny, invLengthSq: 1 / lengthSq, length,
		left: leftExtended ? -extension : 0, right: rightExtended ? 1 + extension : 1,
		ax: type === ACCEL ? -ny * s : 0, ay: type === ACCEL ? nx * s : 0,
		...(data.width != null ? { width: data.width } : {}),
	}
}

export function lineToJSON(l) {
	const o = { id: l.id, type: l.type, x1: l.x1, y1: l.y1, x2: l.x2, y2: l.y2 }
	if (l.type !== SCENERY) Object.assign(o, { flipped: l.flipped, leftExtended: l.leftExtended, rightExtended: l.rightExtended })
	if (l.width != null) o.width = l.width
	return o
}

// lr-core's hashIntPair: every pair of integers to a unique integer
export function hashIntPair(a, b) {
	const A = a >= 0 ? 2 * a : -2 * a - 1
	const B = b >= 0 ? 2 * b : -2 * b - 1
	const C = (A >= B) ? (A * A + A + B) : (B * B + A)
	return (C & 1) ? -(C - 1) / 2 - 1 : C / 2
}

function cellOf(px, py) {
	const x = Math.floor(px / GRID_SIZE), y = Math.floor(py / GRID_SIZE)
	return { x, y, gx: px - GRID_SIZE * x, gy: py - GRID_SIZE * y }
}

/** The 6.2 grid cells a line is filed in (lr-core's classicCells). */
export function lineCells(line) {
	const start = cellOf(line.x1, line.y1), end = cellOf(line.x2, line.y2)
	const out = [start]
	const { vx, vy } = line
	if (vx === 0 && vy === 0 || start.x === end.x && start.y === end.y) return out
	const left = Math.min(start.x, end.x), right = Math.max(start.x, end.x)
	const top = Math.min(start.y, end.y), bottom = Math.max(start.y, end.y)
	let cell = start, x = line.x1, y = line.y1
	while (cell) {
		let dx, dy
		if (cell.x < 0) dx = (GRID_SIZE + cell.gx) * (vx > 0 ? 1 : -1)
		else dx = -cell.gx + (vx > 0 ? GRID_SIZE : -1)
		if (cell.y < 0) dy = (GRID_SIZE + cell.gy) * (vy > 0 ? 1 : -1)
		else dy = -cell.gy + (vy > 0 ? GRID_SIZE : -1)
		let nx, ny
		if (vx === 0) { nx = x; ny = y + dy }
		else if (vy === 0) { nx = x + dx; ny = y }
		else {
			const slope = vy / vx
			const yNext = y + slope * dx
			if (Math.abs(yNext - y) < Math.abs(dy)) { nx = x + dx; ny = yNext }
			else if (Math.abs(yNext - y) === Math.abs(dy)) { nx = x + dx; ny = y + dy }
			else { nx = x + vx * dy / vy; ny = y + dy }
		}
		const next = cellOf(nx, ny)
		if (next.x === cell.x && next.y === cell.y) break
		if (next.x >= left && next.x <= right && next.y >= top && next.y <= bottom) {
			out.push(next); cell = next; x = nx; y = ny
		} else cell = null
	}
	return out
}

/** Lines and lr-core's 14 px collision grid; each cell keeps its lines newest (highest id) first. */
export class Track {
	constructor(lines = []) {
		this.lines = new Map()
		this.cells = new Map()
		this.near = new Map() // centre cell → the lines of its 3 × 3 cells in lookup order, with repeats
		this.version = 0
		this.maxId = 0
		for (const l of lines) this.add(l)
	}
	add(data) {
		const line = data.nx !== undefined ? data : makeLine(data)
		if (this.lines.has(line.id)) throw new Error(`line ${line.id} already in the track`)
		this.lines.set(line.id, line)
		if (line.id > this.maxId) this.maxId = line.id
		if (!line.collidable || !(line.length > 0)) return line
		line.cellsXY = lineCells(line)
		line.cells = line.cellsXY.map(c => hashIntPair(c.x, c.y))
		this.forget(line)
		for (const key of line.cells) {
			let list = this.cells.get(key)
			if (!list) this.cells.set(key, list = [])
			let lo = 0, hi = list.length
			while (lo < hi) { const m = (lo + hi) >> 1; if (list[m].id > line.id) lo = m + 1; else hi = m }
			if (list[lo]?.id !== line.id) list.splice(lo, 0, line)
		}
		return line
	}
	remove(id) {
		const line = this.lines.get(id)
		if (!line) return
		this.lines.delete(id)
		if (line.cells) this.forget(line)
		for (const key of line.cells || []) {
			const list = this.cells.get(key)
			const i = list?.indexOf(line) ?? -1
			if (i >= 0) list.splice(i, 1)
			if (list && !list.length) this.cells.delete(key)
		}
	}
	forget() { this.version++ } // the neighbourhood lists rebuild when next asked for
	/** lr-core's getLinesNearEntity for a point in cell (gx, gy): the 3 × 3 cells, x outer, each newest first. */
	nearCell(gx, gy) {
		const key = hashIntPair(gx, gy)
		let entry = this.near.get(key)
		if (entry === undefined || entry.version !== this.version) {
			const list = []
			for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) { const c = this.cells.get(hashIntPair(i + gx, j + gy)); if (c) for (const l of c) list.push(l) }
			if (entry === undefined) this.near.set(key, entry = { version: this.version, list })
			else { entry.version = this.version; entry.list = list }
		}
		return entry.list
	}
	nextId() { return this.maxId + 1 }
	/** Collidable lines whose cells are near (x, y) — as the rider would look them up. */
	linesNear(x, y) {
		const gx = Math.floor(x / GRID_SIZE), gy = Math.floor(y / GRID_SIZE), out = new Set()
		for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (const l of this.cells.get(hashIntPair(gx + i, gy + j)) || []) out.add(l)
		return out
	}
}

// ── Rider ───────────────────────────────────────────────────────────────

export class Rider {
	/** Bosh at `start` moving at `velocity`; `scarf: false` skips the scarf, which never affects the ride. */
	constructor(start = { x: 0, y: 0 }, velocity = START_VELOCITY, { scarf = true } = {}) {
		this.s = new Float64Array(N_POINTS * STRIDE)
		this.mounted = -1 // lr-core Binding.framesSinceUnbind: -1 while bound
		this.sledIntact = -1
		this.scarf = scarf
		this.frame = 0
		this.cache = { track: null, version: -1, g: new Float64Array(N_CONTACT * 2), lists: new Array(N_CONTACT) }
		for (let i = 0; i < N_POINTS; i++) {
			const o = i * STRIDE
			const x = BODY_XY[i][0] + start.x, y = BODY_XY[i][1] + start.y
			this.s[o] = x; this.s[o + 1] = y
			this.s[o + 2] = x - velocity.x; this.s[o + 3] = y - velocity.y
			this.s[o + 4] = velocity.x; this.s[o + 5] = velocity.y
		}
	}
	clone() {
		const r = Object.create(Rider.prototype)
		r.s = this.s.slice(); r.mounted = this.mounted; r.sledIntact = this.sledIntact; r.scarf = this.scarf; r.frame = this.frame
		r.cache = { track: null, version: -1, g: new Float64Array(N_CONTACT * 2), lists: new Array(N_CONTACT) }
		return r
	}
	copyFrom(o) { this.s.set(o.s); this.mounted = o.mounted; this.sledIntact = o.sledIntact; this.scarf = o.scarf; this.frame = o.frame; return this }
	get crashed() { return this.mounted !== -1 }
	get sledBroken() { return this.sledIntact !== -1 }
	x(i) { return this.s[i * STRIDE] }
	y(i) { return this.s[i * STRIDE + 1] }
	/** Mean of the 6 body points, as lr-core's getRider(frame).position. */
	position() {
		let x = 0, y = 0
		for (const i of BODY) { x += this.s[i * STRIDE]; y += this.s[i * STRIDE + 1] }
		return { x: x / 6, y: y / 6 }
	}
	/** Mean velocity of the 10 contact points (their centre of mass flies ballistically). */
	velocity() {
		let x = 0, y = 0
		for (let i = 0; i < N_CONTACT; i++) { const o = i * STRIDE; x += this.s[o] - this.s[o + 2]; y += this.s[o + 1] - this.s[o + 3] }
		return { x: x / N_CONTACT, y: y / N_CONTACT }
	}
	centre() {
		let x = 0, y = 0
		for (let i = 0; i < N_CONTACT; i++) { x += this.s[i * STRIDE]; y += this.s[i * STRIDE + 1] }
		return { x: x / N_CONTACT, y: y / N_CONTACT }
	}
	/** How close the body-to-sled bindings are to breaking, 0 (relaxed) to 1 (dismount). */
	stress() {
		let worst = 0
		const s = this.s
		for (const c of BIND_STICKS) {
			const a = C_A[c] * STRIDE, b = C_B[c] * STRIDE
			const dx = s[b] - s[a], dy = s[b + 1] - s[a + 1]
			const length = Math.sqrt(dx * dx + dy * dy)
			const diff = length === 0 ? 0 : (length - C_REST[c]) / length * 0.5
			if (diff / C_ENDURANCE[c] > worst) worst = diff / C_ENDURANCE[c]
		}
		return worst
	}
}
const BODY = [P.BUTT, P.SHOULDER, P.RHAND, P.LHAND, P.LFOOT, P.RFOOT]

// GLSL's canonical rand, as lr-core seeds the scarf's flutter
const rand = (x, y) => (Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1

function crossJoint(s, p1, p2, q1, q2) {
	const ax = s[p2 * STRIDE] - s[p1 * STRIDE], ay = s[p2 * STRIDE + 1] - s[p1 * STRIDE + 1]
	const bx = s[q2 * STRIDE] - s[q1 * STRIDE], by = s[q2 * STRIDE + 1] - s[q1 * STRIDE + 1]
	return ax * by - ay * bx
}

function resolveStick(s, a, b, diff) {
	const dx = (s[a] - s[b]) * diff, dy = (s[a + 1] - s[b + 1]) * diff
	s[a] = s[a] - dx; s[a + 1] = s[a + 1] - dy
	s[b] = dx + s[b]; s[b + 1] = dy + s[b + 1]
}

/**
 * Advance the rider one frame (1/40 s) on the track: step, then 6 × (constraints, collisions), then
 * the joints that can break the sled or throw Bosh off, then the scarf. Each line touched is pushed
 * to `contacts` (with repeats) if given; `contactPoints` gets the point index alongside.
 */
export function step(track, r, contacts = null, contactPoints = null) {
	const s = r.s
	if (r.mounted !== -1) r.mounted++
	if (r.sledIntact !== -1) r.sledIntact++
	const n = r.scarf ? N_POINTS : N_CONTACT
	for (let i = 0; i < n; i++) {
		const o = i * STRIDE
		const x = s[o], y = s[o + 1]
		let vx, vy
		if (i < N_CONTACT) { vx = (x - s[o + 2]) * 1 + 0; vy = (y - s[o + 3]) * 1 + GRAVITY }
		else { const k = 1 - 0.2; vx = (x - s[o + 2]) * k + 0; vy = (y - s[o + 3]) * k + GRAVITY }
		let nx = x + vx, ny = y + vy
		if (i >= N_CONTACT) {
			const speed = Math.pow(vx * vx + vy * vy, 0.25)
			let mag = rand(vx, vy)
			let ang = rand(x, y)
			mag *= 2 * speed * -Math.expm1(-speed / 40)
			ang *= 2 * Math.PI
			nx = nx + mag * Math.cos(ang); ny = ny + mag * Math.sin(ang)
		}
		s[o] = nx; s[o + 1] = ny; s[o + 2] = x; s[o + 3] = y; s[o + 4] = vx; s[o + 5] = vy
	}
	const cache = r.cache
	if (cache.track !== track || cache.version !== track.version) { cache.track = track; cache.version = track.version; cache.g.fill(NaN) }
	const g = cache.g, lists = cache.lists
	for (let it = 0; it < ITERATIONS; it++) {
		for (let c = 0; c < C_TYPE.length; c++) {
			const type = C_TYPE[c]
			if (type === BIND && r.mounted !== -1) continue
			const a = C_A[c] * STRIDE, b = C_B[c] * STRIDE
			const dx = s[b] - s[a], dy = s[b + 1] - s[a + 1]
			const length = Math.sqrt(dx * dx + dy * dy)
			if (type === REPEL && length >= C_REST[c]) continue
			const diff = (length === 0 ? 0 : (length - C_REST[c]) / length) * 0.5
			if (type === BIND && diff > C_ENDURANCE[c]) { r.mounted = 0; continue }
			resolveStick(s, a, b, diff)
		}
		for (let i = 0; i < N_CONTACT; i++) {
			const o = i * STRIDE
			const gx = Math.floor(s[o] / GRID_SIZE), gy = Math.floor(s[o + 1] / GRID_SIZE)
			const friction = FRICTION[i]
			let list
			if (g[2 * i] === gx && g[2 * i + 1] === gy) list = lists[i]
			else { list = lists[i] = track.nearCell(gx, gy); g[2 * i] = gx; g[2 * i + 1] = gy }
			for (let li = 0; li < list.length; li++) {
				const l = list[li]
				const px = s[o], py = s[o + 1]
				const ox = px - l.x1, oy = py - l.y1
				const perp = l.nx * ox + l.ny * oy
				if (!(l.nx * s[o + 4] + l.ny * s[o + 5] > 0)) continue
				if (!(perp > 0 && perp < MAX_FORCE_LENGTH)) continue
				const along = (l.vx * ox + l.vy * oy) * l.invLengthSq
				if (!(along >= l.left && along <= l.right)) continue
				const qx = (l.nx * perp - px) * -1, qy = (l.ny * perp - py) * -1
				let fx = l.ny * friction * perp, fy = -l.nx * friction * perp
				if (s[o + 2] >= qx) fx *= -1
				if (s[o + 3] < qy) fy *= -1
				s[o] = qx; s[o + 1] = qy
				s[o + 2] = fx + s[o + 2] + l.ax; s[o + 3] = fy + s[o + 3] + l.ay
				if (contacts) { contacts.push(l.id); contactPoints?.push(i) }
			}
		}
	}
	// joints: Bosh off the sled if his back crosses the sled's peg, the sled broken if it folds
	if (r.mounted === -1 && !(crossJoint(s, P.SHOULDER, P.BUTT, P.STRING, P.PEG) >= 0)) r.mounted = 0
	if (r.sledIntact === -1 && !(crossJoint(s, P.PEG, P.TAIL, P.STRING, P.PEG) >= 0)) r.sledIntact = 0
	if (r.mounted === -1 && !(crossJoint(s, P.PEG, P.TAIL, P.STRING, P.PEG) >= 0)) r.mounted = 0
	if (r.scarf) {
		for (let i = 0; i < 7; i++) {
			const a = (i === 0 ? P.SHOULDER : P.SCARF_0 + i - 1) * STRIDE, b = (P.SCARF_0 + i) * STRIDE
			const dx = s[b] - s[a], dy = s[b + 1] - s[a + 1]
			const length = Math.sqrt(dx * dx + dy * dy)
			const diff = length === 0 ? 0 : (length - SCARF_REST[i]) / length
			s[b] = (s[a] - s[b]) * diff + s[b]; s[b + 1] = (s[a + 1] - s[b + 1]) * diff + s[b + 1]
		}
	}
	r.frame++
	return r
}

/** Every frame from 0 to `frames` of a rider on a track (clones). */
export function simulate(track, frames, { start = { x: 0, y: 0 }, velocity = START_VELOCITY, scarf = true } = {}) {
	const r = new Rider(start, velocity, { scarf })
	const out = [r.clone()]
	for (let f = 1; f <= frames; f++) out.push(step(track, r).clone())
	return out
}
