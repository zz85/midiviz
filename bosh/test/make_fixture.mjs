// Writes bosh/test/fixture.json: test tracks with lr-core's answer for every frame (a hash of all
// 17 points' positions and the two bindings), so bosh.test.js can check the physics without lr-core.
//   node bosh/test/make_fixture.mjs --lrcore <node_modules/lr-core>
import { readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { POINTS } from '../physics.js'
import { onsetsOf, pickHits } from '../music.js'
import { planTrack } from '../planner.js'
import { beatGrid } from '../../harmony/harmony.js'
import { frameHash } from './hash.js'

const args = process.argv.slice(2)
const lrPath = args[args.indexOf('--lrcore') + 1] || process.env.LRCORE
if (!lrPath) { console.error('usage: node bosh/test/make_fixture.mjs --lrcore <node_modules/lr-core>'); process.exit(2) }
const lr = createRequire(import.meta.url)(lrPath + '/line-rider-engine')
const { Midi } = createRequire(import.meta.url)('../../tonejs-midi.js')

const tracks = []
// 1. 12 s of a generated track (kickers, drops, red pads)
{
	const midi = new Midi(readFileSync(new URL('../../midis/elise.mid', import.meta.url)))
	const hits = pickHits(onsetsOf(midi, { beats: beatGrid(midi).beats }).filter(g => g.time < 12), { rate: 2 })
	const plan = planTrack(hits, { seed: 3 })
	tracks.push({ name: 'planned Für Elise, 12 s', start: { x: 0, y: 0 }, velocity: { x: 0.4, y: 0 }, frames: plan.duration, lines: plan.lines.map(l => ({ id: l.id, type: l.type, x1: l.x1, y1: l.y1, x2: l.x2, y2: l.y2, flipped: l.flipped, leftExtended: l.leftExtended, rightExtended: l.rightExtended })) })
}
// 1b. 25 s of a generated track with loops (red-lined loops, take-offs on notes)
{
	const midi = new Midi(readFileSync(new URL('../../midis/mz_331_3.mid', import.meta.url)))
	const hits = pickHits(onsetsOf(midi, { beats: beatGrid(midi).beats }).filter(g => g.time < 25), { rate: 1.26, minGap: 0.25, excitement: 1, loops: true, takeoffs: true })
	const plan = planTrack(hits, { excitement: 1 })
	if (!plan.stats.loops) throw new Error('expected a loop in the excerpt')
	tracks.push({ name: `planned Rondo alla Turca, 25 s, ${plan.stats.loops} loops`, start: { x: 0, y: 0 }, velocity: { x: 0.4, y: 0 }, frames: plan.duration, lines: plan.lines.map(l => ({ id: l.id, type: l.type, x1: l.x1, y1: l.y1, x2: l.x2, y2: l.y2, flipped: l.flipped, leftExtended: l.leftExtended, rightExtended: l.rightExtended })) })
}
// 2. into a wall: Bosh comes off the sled
tracks.push({
	name: 'crash into a wall', start: { x: 0, y: 0 }, velocity: { x: 0.4, y: 0 }, frames: 200,
	lines: [
		{ id: 1, type: 0, x1: -10, y1: 6, x2: 300, y2: 200, flipped: false, leftExtended: false, rightExtended: true },
		{ id: 2, type: 0, x1: 300, y1: 200, x2: 400, y2: 200, flipped: false, leftExtended: true, rightExtended: false },
		{ id: 3, type: 0, x1: 400, y1: 210, x2: 400, y2: 120, flipped: false, leftExtended: false, rightExtended: false },
	],
})
// 3. red lines both ways, a flipped ceiling, a quarter pipe of short segments and a scenery line
{
	const lines = [
		{ id: 1, type: 1, x1: -10, y1: 6, x2: 80, y2: 20, flipped: false, leftExtended: false, rightExtended: true },
		{ id: 2, type: 0, x1: 80, y1: 20, x2: 160, y2: 24, flipped: false, leftExtended: true, rightExtended: true },
		{ id: 3, type: 1, x1: 260, y1: 30, x2: 160, y2: 24, flipped: true, leftExtended: true, rightExtended: true },
		{ id: 4, type: 2, x1: 0, y1: 40, x2: 300, y2: 40 },
		{ id: 5, type: 0, x1: 400, y1: -30, x2: 300, y2: -32, flipped: true, leftExtended: false, rightExtended: false },
	]
	let x = 260, y = 30, a = 4 * Math.PI / 180, id = 6
	for (let k = 0; k < 16; k++) { const nx = x + Math.cos(a) * 9, ny = y + Math.sin(a) * 9; lines.push({ id: id++, type: 0, x1: x, y1: y, x2: nx, y2: ny, flipped: false, leftExtended: true, rightExtended: true }); x = nx; y = ny; a -= 6 * Math.PI / 180 }
	tracks.push({ name: 'red lines, flipped line, quarter pipe', start: { x: 0, y: 0 }, velocity: { x: 0.4, y: 0 }, frames: 400, lines })
}

for (const t of tracks) {
	let engine = new lr.default().setStart(t.start, t.velocity)
	engine = engine.addLine(t.lines.map(l => lr.createLineFromJson({ ...l })))
	t.hashes = []
	for (let f = 0; f <= t.frames; f++) {
		const r = engine.getRider(f)
		t.hashes.push(frameHash(POINTS.map(n => r.get(n).pos), r.get('RIDER_MOUNTED').framesSinceUnbind, r.get('SLED_INTACT').framesSinceUnbind))
	}
	const end = engine.getRider(t.frames)
	t.mountedAtEnd = end.get('RIDER_MOUNTED').framesSinceUnbind === -1
	t.sledIntactAtEnd = end.get('SLED_INTACT').framesSinceUnbind === -1
	console.log(t.name, t.lines.length, 'lines', t.frames, 'frames, mounted at end', t.mountedAtEnd, 'sled intact', t.sledIntactAtEnd)
}
writeFileSync(new URL('./fixture.json', import.meta.url), JSON.stringify({ about: 'lr-core 0.8.2 (MIT) frame hashes for bosh/test/bosh.test.js; made by make_fixture.mjs', tracks }))
