// Plans a track off the main thread: onset events in, a verified .track.json out.
import { pickHits } from './music.js'
import { planTrack, verifyPlan } from './planner.js'
import { writeTrack } from './track.js'

self.onmessage = ({ data }) => {
	const { id, groups, pick, plan: planOptions, label } = data
	try {
		const hits = pickHits(groups, pick)
		if (!hits.length) throw new Error('no notes to land on')
		let last = 0
		const plan = planTrack(hits, {
			...planOptions,
			onProgress: p => { const now = Date.now(); if (now - last > 120 || p.done === p.total) { last = now; self.postMessage({ id, progress: p }) } },
		})
		const check = verifyPlan(plan.lines, plan.pads, { frames: plan.duration })
		const track = writeTrack({
			label, creator: 'midiviz #044 Bosh',
			description: `${plan.pads.length} landings on the notes of ${label}${plan.stats.loops ? `, ${plan.stats.loops} loops` : ''}, planned with Line Rider 6.2 physics; music starts at ${hits[0].leadIn.toFixed(2)} s`,
			duration: plan.duration, lines: plan.lines,
		})
		const pads = check.results.map(r => ({ ...r, pitch: hits[r.hit].pitch, strength: hits[r.hit].strength, time: hits[r.hit].time }))
		const loopsWanted = hits.filter(h => h.move === 'loop').length
		self.postMessage({ id, result: { track, pads, hits, skipped: plan.skipped, stats: { ...plan.stats, exact: check.exact, takeoffsExact: check.takeoffs, crash: check.crash, loopsWanted }, leadIn: hits[0].leadIn } })
	} catch (e) {
		self.postMessage({ id, error: e.message })
	}
}
