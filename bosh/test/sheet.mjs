// Contact sheet of a ride, drawn by bosh/render.js in Chromium: an overview of the whole track and
// tiles around landings.
//   node bosh/test/sheet.mjs <track.json> <pads.json> <out.png> [first-pad=0] [tiles=11]
// Needs playwright-core (PLAYWRIGHT, path to its index.mjs) and a Chromium (CHROME).
import http from 'node:http'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { extname, join, normalize } from 'node:path'

const PW = process.env.PLAYWRIGHT || '/tmp/pw/node_modules/playwright-core/index.mjs'
const CHROME = process.env.CHROME || `${process.env.HOME}/Library/Caches/ms-playwright/chromium_headless_shell-1208/chrome-headless-shell-mac-arm64/chrome-headless-shell`
const [trackFile, padsFile, out, firstArg = '0', tilesArg = '11', only = ''] = process.argv.slice(2)
if (!out) { console.error('usage: node bosh/test/sheet.mjs <track.json> <pads.json> <out.png> [first-pad] [tiles]'); process.exit(2) }

const root = new URL('../../', import.meta.url).pathname
const types = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.html': 'text/html', '.json': 'application/json' }
const server = http.createServer((req, res) => {
	const path = normalize(join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname)))
	if (!path.startsWith(root) || !existsSync(path)) { res.writeHead(404); return res.end() }
	if (path === root) { res.writeHead(200, { 'content-type': 'text/html' }); return res.end('<!doctype html><body></body>') }
	res.writeHead(200, { 'content-type': types[extname(path)] || 'application/octet-stream' })
	res.end(readFileSync(path))
}).listen(0, '127.0.0.1')
await new Promise(r => server.once('listening', r))
const base = `http://127.0.0.1:${server.address().port}/`

const { chromium } = await import(PW)
const browser = await chromium.launch({ executablePath: CHROME })
const page = await browser.newPage()
page.on('console', m => console.log('page:', m.text()))
await page.goto(base)
let padList = JSON.parse(readFileSync(padsFile, 'utf8'))
const data = { track: JSON.parse(readFileSync(trackFile, 'utf8')), pads: padList, first: +firstArg, tiles: +tilesArg, only }
const png = await page.evaluate(async ({ track, pads, first, tiles, only }) => {
	const { rideFrames, cameraPath, drawFrame, drawBosh, THEMES, pitchColour } = await import('/bosh/render.js')
	const { readTrack } = await import('/bosh/track.js')
	const { makeLine } = await import('/bosh/physics.js')
	const t = readTrack(track)
	t.lines = t.lines.map(makeLine)
	const ride = rideFrames(t.lines, { start: t.start, velocity: t.velocity, frames: t.duration })
	const cam = cameraPath(ride)
	const padMap = new Map(pads.map(p => [p.lineId, { frame: p.frame, pitch: p.pitch ?? 60 + (p.hit % 12), strength: p.strength ?? 0.5 }]))
	const W = 480, Hh = 300, cols = 4, rows = Math.ceil((tiles + 1) / cols)
	const canvas = Object.assign(document.createElement('canvas'), { width: W * cols, height: Hh * rows })
	const ctx = canvas.getContext('2d')
	ctx.fillStyle = '#ddd'; ctx.fillRect(0, 0, canvas.width, canvas.height)
	// overview
	{
		let xa = Infinity, xb = -Infinity, ya = Infinity, yb = -Infinity
		for (const l of t.lines) { xa = Math.min(xa, l.x1, l.x2); xb = Math.max(xb, l.x1, l.x2); ya = Math.min(ya, l.y1, l.y2); yb = Math.max(yb, l.y1, l.y2) }
		const z = Math.min((W - 20) / (xb - xa), (Hh - 20) / (yb - ya))
		ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, Hh); ctx.clip()
		ctx.fillStyle = THEMES.paper.bg; ctx.fillRect(0, 0, W, Hh)
		ctx.translate(10 - xa * z, 10 - ya * z); ctx.scale(z, z)
		ctx.strokeStyle = 'rgba(0,0,200,0.25)'; ctx.lineWidth = 1 / z; ctx.beginPath()
		for (let f = 0; f <= ride.frames; f++) { const x = cam.bodyX[f], y = cam.bodyY[f]; f ? ctx.lineTo(x, y) : ctx.moveTo(x, y) }
		ctx.stroke()
		for (const l of t.lines) { const p = padMap.get(l.id); ctx.strokeStyle = p ? pitchColour(p.pitch) : '#222'; ctx.lineWidth = (p ? 2.5 : 1.2) / z; ctx.beginPath(); ctx.moveTo(l.x1, l.y1); ctx.lineTo(l.x2, l.y2); ctx.stroke() }
		ctx.restore()
		ctx.fillStyle = '#000'; ctx.font = '12px sans-serif'; ctx.fillText(`${t.lines.length} lines, ${ride.frames} frames, ${pads.length} pads, crash ${ride.crash}`, 8, Hh - 8)
	}
	const shown = only ? pads.map((p, i) => [p, i]).filter(([p]) => p.kind === only) : pads.map((p, i) => [p, i])
	for (let k = 0; k < tiles; k++) {
		const [pad, idx] = shown[first + k] ?? []
		if (!pad) break
		const col = (k + 1) % cols, row = Math.floor((k + 1) / cols)
		const f = pad.frame
		ctx.save(); ctx.translate(col * W, row * Hh); ctx.beginPath(); ctx.rect(0, 0, W, Hh); ctx.clip()
		const fc = pad.kind === 'loop' ? Math.round(f - pad.gap * 0.55) : f
		const c = { x: cam.bodyX[fc] + (pad.kind === 'loop' ? 0 : 25), y: cam.bodyY[fc] - 8 }
		drawFrame(ctx, { lines: t.lines, ride, cam, pads: padMap, f, view: { w: W, h: Hh, zoom: pad.kind === 'loop' ? 1.5 : 3 }, centre: c })
		// ghosts of the frames before the landing
		const zz = pad.kind === 'loop' ? 1.5 : 3
		ctx.translate(W / 2, Hh / 2); ctx.scale(zz, zz)
		ctx.translate(-c.x, -c.y); ctx.globalAlpha = 0.18
		for (let g = pad.kind === 'loop' ? f - pad.gap : pad.takeoff ?? f - 8; g < f; g += 3) drawBosh(ctx, ride, g)
		ctx.restore()
		ctx.fillStyle = '#000'; ctx.font = '12px sans-serif'
		const touch = ride.firstTouch.get(pad.lineId)
		ctx.fillText(`pad ${idx} hit ${pad.hit} f${f} touch ${touch} ${pad.kind} Tf ${pad.Tf} apex ${pad.apex?.toFixed(1)} v ${pad.speed?.toFixed(1)} s ${pad.stress?.toFixed(2)}`, col * W + 6, row * Hh + 14)
	}
	return canvas.toDataURL('image/png')
}, data)
writeFileSync(out, Buffer.from(png.split(',')[1], 'base64'))
await browser.close()
server.close()
console.log('wrote', out)
