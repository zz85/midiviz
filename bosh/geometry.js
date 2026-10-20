// Smooth track shapes: curves whose curvature rises and falls smoothly (no kinks where a straight
// meets a bend), cut into short straight lines for the physics. A loop is the same thing with a
// turn of most of a circle.
import { makeLine, SOLID } from './physics.js'

export const DEG = Math.PI / 180

/**
 * Points along a path from `start` heading `heading` (radians, y down: positive turns down / clockwise).
 * `pieces` = [{ len, turn = 0, ease = 0.5 }]: arc length, total change of heading, and how much of
 * the piece the curvature takes to rise (and to fall) — 0.5 a smooth bump, 0.15 nearly a circle.
 * Each piece is cut into steps of at most `ds` px and turning at most `maxTurn` per step.
 */
export function smoothPath(start, heading, pieces, { ds = 6, maxTurn = 3 * DEG } = {}) {
	const pts = [{ x: start.x, y: start.y }]
	let h = heading, x = start.x, y = start.y
	for (const { len, turn = 0, ease = 0.5 } of pieces) {
		if (!(len > 0.25)) continue
		if (Math.abs(turn) < 1e-9) {
			const n = Math.max(1, Math.ceil(len / ds))
			const step = len / n
			for (let k = 0; k < n; k++) {
				x += Math.cos(h) * step; y += Math.sin(h) * step
				pts.push({ x, y })
			}
			continue
		}
		const e = Math.max(0.02, Math.min(0.5, ease))
		const n = Math.max(2, Math.ceil(len / ds), Math.ceil(Math.abs(turn) / maxTurn / (1 - e))) // the curvature peaks at 1 / (1 − e) of its mean
		// heading after a fraction u of the piece: the integral of a curvature that eases in and out
		const H = u => turn * profile(u, e)
		for (let k = 1; k <= n; k++) {
			const u0 = (k - 1) / n, u1 = k / n
			const hm = h + H((u0 + u1) / 2)
			x += Math.cos(hm) * len / n; y += Math.sin(hm) * len / n
			pts.push({ x, y })
		}
		h += turn
	}
	return { pts, heading: h }
}

// ∫ of a curvature that rises over [0, e], holds, falls over [1 − e, 1] (raised cosines), normalised to 1
function profile(u, e) {
	const ramp = t => t - Math.sin(Math.PI * t) / Math.PI // ∫ (1 − cos πt)/1 … scaled: ramp(1) = 1
	const total = 1 - e // area: e/2 + (1 − 2e) + e/2
	if (u <= e) return (e * ramp(u / e) / 2) / total
	if (u >= 1 - e) return (total - e * ramp((1 - u) / e) / 2) / total
	return (e / 2 + (u - e)) / total
}

/** Lines along points, ids from `id0`, joints extended as the editor does except at `noLeft` / `noRight` ends. */
export function chainLines(pts, id0, { noLeft = true, noRight = true } = {}) {
	const lines = []
	for (let k = 1; k < pts.length; k++) {
		lines.push(makeLine({
			id: id0 + k - 1, type: SOLID, x1: pts[k - 1].x, y1: pts[k - 1].y, x2: pts[k].x, y2: pts[k].y,
			flipped: false, leftExtended: k > 1 || !noLeft, rightExtended: k < pts.length - 1 || !noRight,
		}))
	}
	return lines
}

export function pathLength(pieces) { return pieces.reduce((s, p) => s + (p.len > 0.25 ? p.len : 0), 0) }
