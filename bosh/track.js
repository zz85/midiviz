// linerider.com's .track.json: read one (theirs, LRA's or ours), write one linerider.com and
// Line Rider Advanced load as they are.
import { START_VELOCITY, SCENERY, lineToJSON } from './physics.js'

/** { label, creator, description, start, velocity, duration, lines } from a .track.json object. */
export function readTrack(json) {
	if (typeof json === 'string') json = JSON.parse(json)
	if (!Array.isArray(json.lines)) throw new Error('not a .track.json with a "lines" array')
	const sourceRiders = json.riders?.length
		? json.riders
		: [{ startPosition: json.startPosition ?? { x: 0, y: 0 }, startVelocity: START_VELOCITY }]
	const riders = sourceRiders.map(rider => ({
		start: { x: +(rider.startPosition?.x ?? 0), y: +(rider.startPosition?.y ?? 0) },
		velocity: { x: +(rider.startVelocity?.x ?? START_VELOCITY.x), y: +(rider.startVelocity?.y ?? START_VELOCITY.y) },
	}))
	const { start, velocity } = riders[0]
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
		start, velocity, riders,
		racerDurations: Array.isArray(json.racerDurations)
			? json.racerDurations.map(value => Math.max(0, Math.round(+value || 0)))
			: null,
		racerLineRanges: Array.isArray(json.racerLineRanges)
			? json.racerLineRanges.map(range => ({ first: +range.first, last: +range.last }))
			: null,
		racerDisplayOffsets: Array.isArray(json.racerDisplayOffsets)
			? json.racerDisplayOffsets.map(value => +value || 0)
			: null,
		racerLineOwners: json.racerLineOwners && typeof json.racerLineOwners === 'object'
			? Object.fromEntries(Object.entries(json.racerLineOwners).map(([id, owner]) => [id, +owner]))
			: null,
		racerStaggerFrames: json.racerStaggerFrames == null
			? null
			: Math.max(0, +json.racerStaggerFrames),
		lines,
	}
}

/** A .track.json object (6.2 physics) for linerider.com / LRA. */
export function writeTrack({ label = '', creator = '', description = '', duration = 0, start = { x: 0, y: 0 }, velocity = START_VELOCITY, riders = null, racerDurations = null, racerLineRanges = null, racerDisplayOffsets = null, racerLineOwners = null, racerStaggerFrames = 0, lines }) {
	const list = (lines instanceof Map ? [...lines.values()] : lines).map(l => lineToJSON(l)).sort((a, b) => a.id - b.id)
	const starts = riders?.length ? riders : [{ start, velocity }]
	return {
		label, creator, description, duration: Math.round(duration), version: '6.2',
		audio: null,
		startPosition: { x: starts[0].start.x, y: starts[0].start.y },
		racerDurations: racerDurations?.length
			? starts.map((_, index) => Math.max(0, Math.round(racerDurations[index] ?? duration)))
			: null,
		racerLineRanges: racerLineRanges?.length
			? starts.map((_, index) => ({
				first: +racerLineRanges[index].first,
				last: +racerLineRanges[index].last,
			}))
			: null,
		racerDisplayOffsets: racerDisplayOffsets?.length
			? starts.map((_, index) => +racerDisplayOffsets[index] || 0)
			: null,
		racerLineOwners: racerLineOwners && Object.keys(racerLineOwners).length
			? { ...racerLineOwners }
			: null,
		racerStaggerFrames: Math.max(0, Math.round(racerStaggerFrames)),
		riders: starts.map(rider => ({
			startPosition: { x: rider.start.x, y: rider.start.y },
			startVelocity: { x: rider.velocity.x, y: rider.velocity.y },
			remountable: false,
		})),
		lines: list,
	}
}
