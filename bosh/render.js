// Drawing a ride: the track's lines, the hit pads lighting up as Bosh lands on them, Bosh himself
// (sled, body, scarf), and a camera that follows him. Canvas 2D; the same code draws the page and
// the contact sheets.
import { Track, Rider, step, P, N_POINTS, STRIDE, FPS, SCENERY, ACCEL } from './physics.js'

/** Every frame of a track ridden from the start: Float32Array [frame][point][x, y] plus contacts and crash frame. */
export function rideFrames(lines, { start = { x: 0, y: 0 }, velocity, frames }) {
	const track = new Track(lines)
	const r = new Rider(start, velocity)
	const pts = new Float32Array((frames + 1) * N_POINTS * 2)
	const firstTouch = new Map()
	const touched = []
	let crash = null
	const put = f => { for (let i = 0; i < N_POINTS; i++) { pts[(f * N_POINTS + i) * 2] = r.s[i * STRIDE]; pts[(f * N_POINTS + i) * 2 + 1] = r.s[i * STRIDE + 1] } }
	put(0)
	for (let f = 1; f <= frames; f++) {
		touched.length = 0
		step(track, r, touched)
		for (const id of touched) if (!firstTouch.has(id)) firstTouch.set(id, f)
		if (crash == null && (r.crashed || r.sledBroken)) crash = f
		put(f)
	}
	return { pts, frames, firstTouch, crash }
}

/** Rider point i at fractional frame f. */
export function pointAt(ride, f, i) {
	const f0 = Math.max(0, Math.min(ride.frames, Math.floor(f))), f1 = Math.min(ride.frames, f0 + 1), k = Math.min(1, Math.max(0, f - f0))
	const a = (f0 * N_POINTS + i) * 2, b = (f1 * N_POINTS + i) * 2
	return { x: ride.pts[a] + (ride.pts[b] - ride.pts[a]) * k, y: ride.pts[a + 1] + (ride.pts[b + 1] - ride.pts[a + 1]) * k }
}

const BODY = [P.BUTT, P.SHOULDER, P.RHAND, P.LHAND, P.LFOOT, P.RFOOT]

/**
 * A smooth camera for the whole ride, decided in advance (so a video export frames it the same):
 * the centre of Bosh, eased over ~0.6 s, led a little in the direction he is going.
 */
export function cameraPath(ride, { lead = 0.35, ease = 0.6 } = {}) {
	const n = ride.frames + 1
	const cx = new Float32Array(n), cy = new Float32Array(n)
	for (let f = 0; f < n; f++) {
		let x = 0, y = 0
		for (const i of BODY) { x += ride.pts[(f * N_POINTS + i) * 2]; y += ride.pts[(f * N_POINTS + i) * 2 + 1] }
		cx[f] = x / 6; cy[f] = y / 6
	}
	const lx = new Float32Array(n), ly = new Float32Array(n)
	const ahead = Math.round(lead * FPS)
	for (let f = 0; f < n; f++) { const g = Math.min(n - 1, f + ahead); lx[f] = cx[g]; ly[f] = cy[g] }
	// forward-backward exponential smoothing: no lag, no overshoot
	const a = 1 - Math.exp(-1 / (ease * FPS))
	for (const arr of [lx, ly]) {
		for (let f = 1; f < n; f++) arr[f] = arr[f - 1] + (arr[f] - arr[f - 1]) * a
		for (let f = n - 2; f >= 0; f--) arr[f] = arr[f + 1] + (arr[f] - arr[f + 1]) * a
	}
	// zoom out when the next and last second spread wide (a loop, a big jump), back in after
	const zoom = new Float32Array(n), w = FPS
	for (let f = 0; f < n; f++) {
		let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity
		for (let g = Math.max(0, f - w); g <= Math.min(n - 1, f + w); g += 2) { x0 = Math.min(x0, cx[g]); x1 = Math.max(x1, cx[g]); y0 = Math.min(y0, cy[g]); y1 = Math.max(y1, cy[g]) }
		const spread = Math.max(x1 - x0, (y1 - y0) * 1.9)
		zoom[f] = Math.min(1, Math.max(0.4, 300 / Math.max(300, spread)))
	}
	const az = 1 - Math.exp(-1 / (1.0 * FPS))
	for (let f = 1; f < n; f++) zoom[f] = zoom[f - 1] + (zoom[f] - zoom[f - 1]) * az
	for (let f = n - 2; f >= 0; f--) zoom[f] = zoom[f + 1] + (zoom[f] - zoom[f + 1]) * az
	return { x: lx, y: ly, bodyX: cx, bodyY: cy, zoom }
}

export function cameraAt(cam, f) {
	const n = cam.x.length
	const f0 = Math.max(0, Math.min(n - 1, Math.floor(f))), f1 = Math.min(n - 1, f0 + 1), k = Math.min(1, Math.max(0, f - f0))
	const lerp = a => a ? a[f0] + (a[f1] - a[f0]) * k : 1
	return { x: lerp(cam.x), y: lerp(cam.y), zoom: lerp(cam.zoom) }
}

export const THEMES = {
	paper: { bg: '#f6f3ec', line: '#1d1d1f', faint: 'rgba(29,29,31,0.08)', rider: '#1d1d1f', skin: '#ffffff', scarfA: '#d8342c', scarfB: '#ffffff', sled: '#6b4a2b', trail: 'rgba(29,29,31,0.10)', accel: '#d8342c' },
	night: { bg: '#0f1220', line: '#e8e6df', faint: 'rgba(232,230,223,0.06)', rider: '#e8e6df', skin: '#0f1220', scarfA: '#ff5a4f', scarfB: '#f0ede6', sled: '#c99a62', trail: 'rgba(232,230,223,0.10)', accel: '#ff5a4f' },
}

/** Runs of lines that join end to start (a ramp, a loop), each with its points and bounds; cached per line list. */
const chainCache = new WeakMap()
export function chainsOf(lines) {
	let chains = chainCache.get(lines)
	if (chains) return chains
	chains = []
	let cur = null
	const ends = l => l.flipped && l.type === ACCEL ? [{ x: l.x2, y: l.y2 }, { x: l.x1, y: l.y1 }] : [{ x: l.x1, y: l.y1 }, { x: l.x2, y: l.y2 }]
	for (const l of [...lines].sort((a, b) => a.id - b.id)) {
		const [a, b] = ends(l)
		const last = cur?.pts.at(-1)
		if (cur && (l.type === SCENERY) === cur.scenery && Math.abs(last.x - a.x) < 1e-6 && Math.abs(last.y - a.y) < 1e-6) { cur.lines.push(l); cur.pts.push(b) }
		else { cur = { lines: [l], pts: [a, b], scenery: l.type === SCENERY }; chains.push(cur) }
	}
	for (const ch of chains) {
		ch.x0 = Math.min(...ch.pts.map(p => p.x)); ch.x1 = Math.max(...ch.pts.map(p => p.x))
		ch.y0 = Math.min(...ch.pts.map(p => p.y)); ch.y1 = Math.max(...ch.pts.map(p => p.y))
	}
	chainCache.set(lines, chains)
	return chains
}

const PC_HUE = [0, 30, 55, 90, 140, 175, 200, 220, 250, 280, 310, 340]
export const pitchColour = (pitch, light = 52, alpha = 1) => `hsla(${PC_HUE[((pitch % 12) + 12) % 12]}, 72%, ${light}%, ${alpha})`

/**
 * Draw frame `f` (fractional) of a ride. `view` = {w, h, zoom}; `pads` = Map(lineId → {frame, pitch, strength}).
 */
export function drawFrame(ctx, { lines, ride, cam, pads, takeoffs = null, f, view, theme = THEMES.paper, trail = true, fps = FPS, centre = null, autoZoom = true }) {
	const { w, h } = view
	const c = centre ?? cameraAt(cam, f)
	const zoom = view.zoom * (autoZoom && !centre ? c.zoom : 1)
	ctx.save()
	ctx.fillStyle = theme.bg
	ctx.fillRect(0, 0, w, h)
	ctx.translate(w / 2, h / 2)
	ctx.scale(zoom, zoom)
	ctx.translate(-c.x, -c.y)
	const x0 = c.x - w / 2 / zoom - 20, x1 = c.x + w / 2 / zoom + 20, y0 = c.y - h / 2 / zoom - 20, y1 = c.y + h / 2 / zoom + 20

	// paper grid
	ctx.strokeStyle = theme.faint
	ctx.lineWidth = 1 / zoom
	const gs = 40
	ctx.beginPath()
	for (let x = Math.floor(x0 / gs) * gs; x < x1; x += gs) { ctx.moveTo(x, y0); ctx.lineTo(x, y1) }
	for (let y = Math.floor(y0 / gs) * gs; y < y1; y += gs) { ctx.moveTo(x0, y); ctx.lineTo(x1, y) }
	ctx.stroke()

	// trail: where he has been over the last 2 s
	if (trail) {
		ctx.strokeStyle = theme.trail
		ctx.lineWidth = 2.2
		ctx.lineCap = 'round'
		ctx.beginPath()
		const from = Math.max(0, Math.floor(f) - 2 * fps)
		for (let g = from; g <= Math.floor(f); g++) { const x = cam.bodyX[g], y = cam.bodyY[g]; g === from ? ctx.moveTo(x, y) : ctx.lineTo(x, y) }
		ctx.stroke()
	}

	// lines: connected runs drawn as one smooth stroke (quadratic through the midpoints)
	ctx.lineCap = 'round'; ctx.lineJoin = 'round'
	for (const ch of chainsOf(lines)) {
		if (ch.x1 < x0 || ch.x0 > x1 || ch.y1 < y0 || ch.y0 > y1) continue
		const pts = ch.pts
		ctx.strokeStyle = ch.scenery ? 'rgba(80,140,80,0.6)' : theme.line
		ctx.lineWidth = ch.scenery ? (ch.lines[0].width ?? 1) : 1.6
		ctx.beginPath()
		ctx.moveTo(pts[0].x, pts[0].y)
		for (let i = 1; i < pts.length - 1; i++) ctx.quadraticCurveTo(pts[i].x, pts[i].y, (pts[i].x + pts[i + 1].x) / 2, (pts[i].y + pts[i + 1].y) / 2)
		ctx.lineTo(pts.at(-1).x, pts.at(-1).y)
		ctx.stroke()
		for (const l of ch.lines) {
			const pad = pads?.get(l.id)
			if (pad) {
				const since = (f - pad.frame) / fps
				const glow = since >= 0 ? Math.exp(-since * 3.2) : 0
				if (glow > 0.01) {
					ctx.strokeStyle = pitchColour(pad.pitch, 60, 0.35 * glow)
					ctx.lineWidth = 2 + 9 * glow * (0.6 + 0.4 * pad.strength)
					ctx.beginPath(); ctx.moveTo(l.x1, l.y1); ctx.lineTo(l.x2, l.y2); ctx.stroke()
				}
				ctx.strokeStyle = since >= 0 ? pitchColour(pad.pitch, 48 + 20 * glow) : pitchColour(pad.pitch, 50, 0.55)
				ctx.lineWidth = 2.1
				ctx.beginPath(); ctx.moveTo(l.x1, l.y1); ctx.lineTo(l.x2, l.y2); ctx.stroke()
			}
			if (l.type === ACCEL) {
				// red lines as linerider.com shows them: a red rail on the solid side, chevrons the way they push
				const nx = l.nx * 1.6, ny = l.ny * 1.6
				ctx.strokeStyle = theme.accel; ctx.lineWidth = 1
				ctx.beginPath(); ctx.moveTo(l.x1 + nx, l.y1 + ny); ctx.lineTo(l.x2 + nx, l.y2 + ny); ctx.stroke()
				const len = l.length, ux = l.vx / len, uy = l.vy / len
				const dir = (l.ax * ux + l.ay * uy) > 0 ? -1 : 1 // they push against their acc vector (it moves prevPos)
				ctx.beginPath()
				for (let d = len > 9 ? 5 : len / 2; d < len - 0.5; d += 7) {
					const cx = l.x1 + ux * d + nx * 2.2, cy = l.y1 + uy * d + ny * 2.2
					ctx.moveTo(cx - ux * 1.6 * dir + l.nx * 1.2, cy - uy * 1.6 * dir + l.ny * 1.2)
					ctx.lineTo(cx, cy)
					ctx.lineTo(cx - ux * 1.6 * dir - l.nx * 1.2, cy - uy * 1.6 * dir - l.ny * 1.2)
				}
				ctx.stroke()
			}
		}
	}

	// take-offs on a note: a ring from the lip
	for (const t of takeoffs || []) {
		const since = (f - t.frame) / fps
		if (since < 0 || since > 0.45 || t.x < x0 || t.x > x1 || t.y < y0 || t.y > y1) continue
		ctx.strokeStyle = pitchColour(t.pitch, 55, 0.8 * (1 - since / 0.45))
		ctx.lineWidth = 1.4
		ctx.beginPath(); ctx.arc(t.x, t.y, 3 + since * 40, 0, Math.PI * 2); ctx.stroke()
	}

	drawBosh(ctx, ride, f, theme)
	ctx.restore()
	return c
}

export function drawBosh(ctx, ride, f, theme = THEMES.paper) {
	const p = i => pointAt(ride, f, i)
	const peg = p(P.PEG), tail = p(P.TAIL), nose = p(P.NOSE), str = p(P.STRING)
	const butt = p(P.BUTT), sh = p(P.SHOULDER), rh = p(P.RHAND), lh = p(P.LHAND), lf = p(P.LFOOT), rf = p(P.RFOOT)
	const line = (a, b, wdt, col) => { ctx.strokeStyle = col; ctx.lineWidth = wdt; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke() }
	ctx.lineCap = 'round'; ctx.lineJoin = 'round'
	// scarf, behind him: red and white stripes
	let prev = sh
	for (let i = 0; i < 7; i++) { const q = p(P.SCARF_0 + i); line(prev, q, 1.8, i % 2 ? theme.scarfB : theme.scarfA); prev = q }
	// back leg, sled, rope
	line(butt, lf, 2.2, theme.rider)
	ctx.strokeStyle = theme.sled; ctx.lineWidth = 1.5
	ctx.beginPath(); ctx.moveTo(peg.x, peg.y); ctx.lineTo(tail.x, tail.y); ctx.lineTo(nose.x, nose.y)
	ctx.quadraticCurveTo(nose.x + (nose.x - tail.x) * 0.16, nose.y + (nose.y - tail.y) * 0.16, str.x, str.y)
	ctx.stroke()
	line(peg, { x: peg.x + (str.x - peg.x) * 0.25, y: peg.y + (str.y - peg.y) * 0.25 }, 1.2, theme.sled)
	line(str, lh, 0.6, theme.rider)
	line(str, rh, 0.6, theme.rider)
	// body
	line(butt, sh, 5.2, theme.rider)
	line(butt, sh, 3.6, theme.skin)
	line(butt, rf, 2.2, theme.rider)
	line(sh, lh, 1.7, theme.rider)
	line(sh, rh, 1.7, theme.rider)
	// head and hat, along his back
	const dx = sh.x - butt.x, dy = sh.y - butt.y, len = Math.hypot(dx, dy) || 1
	const ux = dx / len, uy = dy / len
	const hx = sh.x + ux * 3.4, hy = sh.y + uy * 3.4
	ctx.fillStyle = theme.skin; ctx.strokeStyle = theme.rider; ctx.lineWidth = 1
	ctx.beginPath(); ctx.arc(hx, hy, 2.9, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
	ctx.fillStyle = theme.scarfA
	ctx.beginPath(); ctx.arc(hx, hy, 2.9, Math.atan2(uy, ux) - Math.PI / 2, Math.atan2(uy, ux) + Math.PI / 2); ctx.closePath(); ctx.fill()
	ctx.beginPath(); ctx.arc(hx + ux * 3.3, hy + uy * 3.3, 0.9, 0, Math.PI * 2); ctx.fill()
}
