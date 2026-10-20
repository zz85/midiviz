// node --test bosh/test/bosh.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { Track, Rider, step, makeLine, lineCells, POINTS, STRIDE, FPS, SCENERY } from '../physics.js'
import { readTrack, writeTrack } from '../track.js'
import { onsetsOf, onsetsOfNotes, pickHits } from '../music.js'
import { planTrack, verifyPlan } from '../planner.js'
import { beatGrid } from '../../harmony/harmony.js'
import { frameHash } from './hash.js'

const { Midi } = createRequire(import.meta.url)('../../tonejs-midi.js')
const fixture = JSON.parse(readFileSync(new URL('./fixture.json', import.meta.url), 'utf8'))
const elise = new Midi(readFileSync(new URL('../../midis/elise.mid', import.meta.url)))

test('physics: every frame identical to lr-core (crash, red lines, flipped lines, a planned track)', () => {
	for (const t of fixture.tracks) {
		const track = new Track(t.lines)
		const r = new Rider(t.start, t.velocity)
		for (let f = 0; f <= t.frames; f++) {
			if (f > 0) step(track, r)
			const pts = POINTS.map((_, i) => ({ x: r.s[i * STRIDE], y: r.s[i * STRIDE + 1] }))
			assert.equal(frameHash(pts, r.mounted, r.sledIntact), t.hashes[f], `${t.name}: frame ${f}`)
		}
		assert.equal(!r.crashed, t.mountedAtEnd, t.name)
	}
	assert.ok(fixture.tracks.some(t => !t.mountedAtEnd), 'a fixture where he comes off')
})

test('physics: lines, cells and the grid', () => {
	const l = makeLine({ id: 7, type: 0, x1: 0, y1: 0, x2: 100, y2: 0 })
	assert.deepEqual([l.nx, l.ny], [-0, 1]) // a left-to-right floor holds from above
	const f = makeLine({ id: 8, type: 0, x1: 0, y1: 0, x2: 100, y2: 0, flipped: true })
	assert.equal(f.ny, -1)
	assert.equal(makeLine({ id: 9, type: 0, x1: 0, y1: 0, x2: 100, y2: 0, extended: 3 }).right, 1.1)
	assert.deepEqual(lineCells(l).map(c => [c.x, c.y]), [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [7, 0]])
	const track = new Track([l, { id: 3, type: 0, x1: 0, y1: 5, x2: 30, y2: 5 }, { id: 5, type: SCENERY, x1: 0, y1: 0, x2: 9, y2: 9 }])
	assert.deepEqual(track.nearCell(0, 0).map(x => x.id).slice(0, 2), [7, 3], 'newest first')
	assert.ok(![...track.linesNear(5, 5)].some(x => x.id === 5), 'scenery is not collidable')
	track.remove(7)
	assert.deepEqual([...new Set(track.nearCell(0, 0).map(x => x.id))], [3])
})

test('track: .track.json round trip and readers', () => {
	const lines = [makeLine({ id: 1, type: 0, x1: 0, y1: 5, x2: 30, y2: 9, leftExtended: true }), makeLine({ id: 2, type: 1, x1: 30, y1: 9, x2: 10, y2: 9, flipped: true }), makeLine({ id: 3, type: 2, x1: 0, y1: 0, x2: 1, y2: 1 })]
	const json = writeTrack({ label: 'x', duration: 99.6, lines })
	assert.equal(json.version, '6.2')
	assert.equal(json.duration, 100)
	assert.deepEqual(json.riders[0].startVelocity, { x: 0.4, y: 0 })
	const back = readTrack(JSON.parse(JSON.stringify(json)))
	assert.deepEqual(back.lines.map(l => [l.id, l.type, l.flipped, l.leftExtended, l.rightExtended]), [[1, 0, false, true, false], [2, 1, true, false, false], [3, 2, undefined, undefined, undefined]])
	// Flash-era files: extended as bits, 0 / 1 for booleans, no riders
	const old = readTrack({ startPosition: { x: 5, y: 6 }, lines: [{ id: 4, type: 0, x1: 0, y1: 0, x2: 1, y2: 0, extended: 2, flipped: 1 }] })
	assert.deepEqual([old.start, old.lines[0].rightExtended, old.lines[0].leftExtended, old.lines[0].flipped], [{ x: 5, y: 6 }, true, false, true])
})

test('music: landings at least the gap apart, about the rate asked, strong beats preferred', () => {
	const groups = onsetsOf(elise, { beats: beatGrid(elise).beats }).filter(g => g.time < 40)
	for (const rate of [1, 2, 3]) {
		const hits = pickHits(groups, { rate, minGap: 0.25 })
		const span = (hits.at(-1).frame - hits[0].frame) / FPS
		assert.ok(hits.length / span <= rate * 1.1 && hits.length / span > rate * 0.6, `rate ${rate}: ${(hits.length / span).toFixed(2)}`)
		for (let i = 1; i < hits.length; i++) assert.ok(hits[i].frame - hits[i - 1].frame >= 10)
		assert.ok(hits[0].frame >= 70, 'a run-up first')
	}
	// a bar of 4/4 sixteenths: at one landing a beat, the downbeats and beats win
	const notes = [], beats = []
	for (let k = 0; k < 64; k++) notes.push({ pitch: 60 + (k % 5), time: k * 0.125, duration: 0.1, velocity: 0.7 })
	for (let b = 0; b < 16; b++) beats.push({ time: b * 0.5, strength: b % 4 === 0 ? 1 : 0.4 })
	const hits = pickHits(onsetsOfNotes(notes, { beats }), { rate: 2, minGap: 0.3, lead: 0 })
	const onBeat = hits.filter(h => Math.abs(h.time / 0.5 - Math.round(h.time / 0.5)) < 1e-6).length
	assert.ok(onBeat / hits.length > 0.8, `${onBeat} of ${hits.length} on the beat`)
})

test('planner: every landing first touches its pad on the note frame, and he stays on', () => {
	const hits = pickHits(onsetsOf(elise, { beats: beatGrid(elise).beats }).filter(g => g.time < 25), { rate: 2 })
	const plan = planTrack(hits, { seed: 2 })
	assert.equal(plan.pads.length + plan.skipped.length, hits.length)
	assert.ok(plan.skipped.length <= 1)
	const check = verifyPlan(plan.lines, plan.pads, { frames: plan.duration })
	assert.equal(check.crash, null)
	assert.equal(check.exact, plan.pads.length)
	// the same take twice is the same track
	const again = planTrack(hits, { seed: 2 })
	assert.deepEqual(again.lines.map(l => [l.x1, l.y1, l.x2, l.y2]), plan.lines.map(l => [l.x1, l.y1, l.x2, l.y2]))
	assert.notDeepEqual(planTrack(hits, { seed: 5 }).lines.length && planTrack(hits, { seed: 5 }).lines.map(l => l.x2), plan.lines.map(l => l.x2))
})

test('planner: gaps from 0.25 s to 3 s', () => {
	const gaps = [10, 12, 16, 20, 28, 40, 60, 90, 120, 40, 10, 10, 14]
	let f = 80
	const hits = gaps.map((g, i) => ({ frame: f += g, strength: (i % 3) / 2, energy: 0.5, contour: (i % 4) - 2 }))
	const plan = planTrack(hits, { seed: 1 })
	const check = verifyPlan(plan.lines, plan.pads, { frames: plan.duration })
	assert.equal(check.crash, null)
	assert.equal(check.exact, plan.pads.length)
	assert.ok(plan.pads.length >= gaps.length - 1, `${plan.pads.length} of ${gaps.length}`)
	const long = plan.pads.filter(p => p.gap >= 60 && p.hit > 0) // (the first is the run-up)
	assert.ok(long.every(p => p.Tf >= 20), 'long gaps get real flights')
})
