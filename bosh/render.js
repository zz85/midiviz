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
	return { x: lx, y: ly, bodyX: cx, bodyY: cy }
}

export function cameraAt(cam, f) {
	const n = cam.x.length
	const f0 = Math.max(0, Math.min(n - 1, Math.floor(f))), f1 = Math.min(n - 1, f0 + 1), k = Math.min(1, Math.max(0, f - f0))
	return { x: cam.x[f0] + (cam.x[f1] - cam.x[f0]) * k, y: cam.y[f0] + (cam.y[f1] - cam.y[f0]) * k }
}

export const THEMES = {
	paper: { bg: '#f6f3ec', line: '#1d1d1f', faint: 'rgba(29,29,31,0.08)', rider: '#1d1d1f', skin: '#ffffff', scarfA: '#d8342c', scarfB: '#ffffff', sled: '#6b4a2b', trail: 'rgba(29,29,31,0.10)', accel: '#d8342c' },
	night: { bg: '#0f1220', line: '#e8e6df', faint: 'rgba(232,230,223,0.06)', rider: '#e8e6df', skin: '#0f1220', scarfA: '#ff5a4f', scarfB: '#f0ede6', sled: '#c99a62', trail: 'rgba(232,230,223,0.10)', accel: '#ff5a4f' },
}

const PC_HUE = [0, 30, 55, 90, 140, 175, 200, 220, 250, 280, 310, 340]
export const pitchColour = (pitch, light = 52, alpha = 1) => `hsla(${PC_HUE[((pitch % 12) + 12) % 12]}, 72%, ${light}%, ${alpha})`

/**
 * Draw frame `f` (fractional) of a ride. `view` = {w, h, zoom}; `pads` = Map(lineId → {frame, pitch, strength}).
 */
export function drawFrame(ctx, { lines, ride, cam, pads, f, view, theme = THEMES.paper, trail = true, fps = FPS, centre = null }) {
	const { w, h, zoom } = view
	const c = centre ?? cameraAt(cam, f)
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

	// lines
	ctx.lineCap = 'round'
	for (const l of lines) {
		if (Math.max(l.x1, l.x2) < x0 || Math.min(l.x1, l.x2) > x1 || Math.max(l.y1, l.y2) < y0 || Math.min(l.y1, l.y2) > y1) continue
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
		} else {
			ctx.strokeStyle = l.type === SCENERY ? 'rgba(80,140,80,0.6)' : theme.line
			ctx.lineWidth = l.type === SCENERY ? (l.width ?? 1) : 1.6
		}
		ctx.beginPath(); ctx.moveTo(l.x1, l.y1); ctx.lineTo(l.x2, l.y2); ctx.stroke()
		if (l.type === ACCEL) {
			// red lines as linerider.com shows them: a red rail on the solid side, chevrons the way they push
			const nx = l.nx * 1.6, ny = l.ny * 1.6
			ctx.strokeStyle = theme.accel; ctx.lineWidth = 1
			ctx.beginPath(); ctx.moveTo(l.x1 + nx, l.y1 + ny); ctx.lineTo(l.x2 + nx, l.y2 + ny); ctx.stroke()
			const len = l.length, ux = l.vx / len, uy = l.vy / len
			const dir = (l.ax * ux + l.ay * uy) > 0 ? -1 : 1 // they push against their acc vector (it moves prevPos)
			ctx.beginPath()
			for (let d = 5; d < len - 2; d += 7) {
				const cx = l.x1 + ux * d + nx * 2.2, cy = l.y1 + uy * d + ny * 2.2
				ctx.moveTo(cx - ux * 1.6 * dir + l.nx * 1.2, cy - uy * 1.6 * dir + l.ny * 1.2)
				ctx.lineTo(cx, cy)
				ctx.lineTo(cx - ux * 1.6 * dir - l.nx * 1.2, cy - uy * 1.6 * dir - l.ny * 1.2)
			}
			ctx.stroke()
		}
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
