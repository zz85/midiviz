// Checks bosh/physics.js against lr-core (the engine linerider.com runs), every point of every frame,
// to the last bit.
//   npm install --ignore-scripts lr-core@0.8.2   (anywhere outside the repo)
//   node bosh/test/oracle.mjs --lrcore <path to node_modules/lr-core> <track.json> … [--frames N]
// Exits 1 on the first mismatch.
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { Track, Rider, step, POINTS, N_POINTS, STRIDE } from '../physics.js'
import { readTrack } from '../track.js'

const args = process.argv.slice(2)
const opt = (name, fallback) => { const i = args.indexOf(name); if (i < 0) return fallback; const [, v] = args.splice(i, 2); return v }
const lrPath = opt('--lrcore', process.env.LRCORE)
const framesOpt = opt('--frames', null)
if (!lrPath || !args.length) { console.error('usage: node bosh/test/oracle.mjs --lrcore <node_modules/lr-core> <track.json> … [--frames N]'); process.exit(2) }
const lr = createRequire(import.meta.url)(lrPath + '/line-rider-engine')

let failed = false
for (const file of args) {
	const json = JSON.parse(readFileSync(file, 'utf8'))
	if (json.version && json.version !== '6.2') { console.log(`${file}: version ${json.version}, skipped (6.2 only)`); continue }
	const t = readTrack(json)
	const frames = +(framesOpt ?? Math.max(t.duration || 0, 400))
	let engine = new lr.default().setStart(t.start, t.velocity)
	engine = engine.addLine(t.lines.map(l => lr.createLineFromJson({ ...l })))
	const track = new Track(t.lines)
	const rider = new Rider(t.start, t.velocity)
	let bad = null, crashAt = null, contacts = 0
	const touched = []
	const t0 = performance.now()
	for (let f = 0; f <= frames && !bad; f++) {
		if (f > 0) { touched.length = 0; step(track, rider, touched); contacts += touched.length }
		const ref = engine.getRider(f)
		for (let i = 0; i < N_POINTS && !bad; i++) {
			const p = ref.get(POINTS[i]).pos, o = i * STRIDE
			if (p.x !== rider.s[o] || p.y !== rider.s[o + 1]) bad = { f, point: POINTS[i], lr: p, bosh: { x: rider.s[o], y: rider.s[o + 1] } }
		}
		const mounted = ref.get('RIDER_MOUNTED').framesSinceUnbind, intact = ref.get('SLED_INTACT').framesSinceUnbind
		if (!bad && (mounted !== rider.mounted || intact !== rider.sledIntact)) bad = { f, point: 'bindings', lr: { mounted, intact }, bosh: { mounted: rider.mounted, intact: rider.sledIntact } }
		if (crashAt == null && rider.mounted !== -1) crashAt = f
	}
	const ms = performance.now() - t0
	if (bad) { failed = true; console.log(`${file}: MISMATCH at frame ${bad.f}, ${bad.point}: lr-core ${JSON.stringify(bad.lr)} bosh ${JSON.stringify(bad.bosh)}`) }
	else console.log(`${file}: ${t.lines.length} lines, ${frames + 1} frames × ${N_POINTS} points identical (${contacts} contacts, ${crashAt == null ? 'no crash' : 'crash at ' + crashAt}; ${ms.toFixed(0)} ms)`)
}
process.exit(failed ? 1 : 0)
