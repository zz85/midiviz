// linerider.com's .track.json: read one (theirs, LRA's or ours), write one linerider.com and
// Line Rider Advanced load as they are.
import { START_VELOCITY, SCENERY, lineToJSON } from './physics.js'

/** { label, creator, description, start, velocity, duration, lines } from a .track.json object. */
export function readTrack(json) {
	if (typeof json === 'string') json = JSON.parse(json)
	if (!Array.isArray(json.lines)) throw new Error('not a .track.json with a "lines" array')
	const rider = json.riders?.[0]
	const start = rider?.startPosition ?? json.startPosition ?? { x: 0, y: 0 }
	const velocity = rider?.startVelocity ?? START_VELOCITY
	const lines = json.lines.map(l => {
		const out = { id: l.id, type: l.type, x1: +l.x1, y1: +l.y1, x2: +l.x2, y2: +l.y2 }
		if (l.type !== SCENERY) {
			let left = !!l.leftExtended, right = !!l.rightExtended
			if (l.extended) { left = !!(l.extended & 1); right = !!(l.extended & 2) }
			Object.assign(out, { flipped: !!l.flipped, leftExtended: left, rightExtended: right })
		}
		if (l.width != null) out.width = l.width
		return out
	})
	return {
		label: json.label ?? '', creator: json.creator ?? '', description: json.description ?? '',
		version: json.version ?? '6.2', duration: json.duration ?? 0,
		start: { x: +start.x, y: +start.y }, velocity: { x: +velocity.x, y: +velocity.y }, lines,
	}
}

/** A .track.json object (6.2 physics) for linerider.com / LRA. */
export function writeTrack({ label = '', creator = '', description = '', duration = 0, start = { x: 0, y: 0 }, velocity = START_VELOCITY, lines }) {
	const list = (lines instanceof Map ? [...lines.values()] : lines).map(l => lineToJSON(l)).sort((a, b) => a.id - b.id)
	return {
		label, creator, description, duration: Math.round(duration), version: '6.2',
		audio: null,
		startPosition: { x: start.x, y: start.y },
		riders: [{ startPosition: { x: start.x, y: start.y }, startVelocity: { x: velocity.x, y: velocity.y }, remountable: false }],
		lines: list,
	}
}
