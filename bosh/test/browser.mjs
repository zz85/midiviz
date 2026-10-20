// Runs 044_bosh.html in Chromium: plans a song, checks the page's own verification, and saves
// screenshots along the ride.
//   node bosh/test/browser.mjs [song=midis/elise.mid] [shots=4] [out=/tmp/bosh-shots] [query=…]
// Needs playwright-core (PLAYWRIGHT, path to its index.mjs) and a Chromium (CHROME).
import http from 'node:http'
import { readFileSync, existsSync, mkdirSync } from 'node:fs'
import { extname, join, normalize } from 'node:path'

const PW = process.env.PLAYWRIGHT || '/tmp/pw/node_modules/playwright-core/index.mjs'
const CHROME = process.env.CHROME || `${process.env.HOME}/Library/Caches/ms-playwright/chromium_headless_shell-1208/chrome-headless-shell-mac-arm64/chrome-headless-shell`
const arg = Object.fromEntries(process.argv.slice(2).map(a => [a.slice(0, a.indexOf('=')), a.slice(a.indexOf('=') + 1)]))
const SONG = arg.song || 'midis/elise.mid', SHOTS = +(arg.shots || 4), OUT = arg.out || '/tmp/bosh-shots'
mkdirSync(OUT, { recursive: true })

const root = new URL('../../', import.meta.url).pathname
const types = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.html': 'text/html', '.json': 'application/json', '.wasm': 'application/wasm' }
const server = http.createServer((req, res) => {
	const path = normalize(join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname)))
	if (!path.startsWith(root) || !existsSync(path)) { res.writeHead(404); return res.end() }
	res.writeHead(200, { 'content-type': types[extname(path)] || 'application/octet-stream', 'cross-origin-opener-policy': 'same-origin', 'cross-origin-embedder-policy': 'require-corp' })
	res.end(readFileSync(path))
}).listen(0, '127.0.0.1')
await new Promise(r => server.once('listening', r))

const { chromium } = await import(PW)
const browser = await chromium.launch({ executablePath: CHROME, args: ['--autoplay-policy=no-user-gesture-required'] })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
const errors = []
page.on('pageerror', e => errors.push(e.message))
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()) })
const t0 = Date.now()
await page.goto(`http://127.0.0.1:${server.address().port}/044_bosh.html?song=${encodeURIComponent(SONG)}${arg.query ? '&' + arg.query : ''}`)
await page.waitForFunction(() => window.bosh?.ride.result, null, { timeout: 300000 })
const info = await page.evaluate(() => {
	const { ride } = window.bosh
	window.bosh.pause()
	const exact = ride.padList.filter(p => ride.frames.firstTouch.get(p.lineId) === p.frame).length
	return { pads: ride.padList.length, exact, crash: ride.frames.crash, lines: ride.lines.length, duration: ride.duration, stats: ride.result.stats, ms: ride.result.ms }
})
console.log(SONG, `planned in ${(info.ms / 1000).toFixed(1)} s (page up ${((Date.now() - t0) / 1000).toFixed(1)} s):`, info.exact, '/', info.pads, 'pads on their frame, crash', info.crash, '·', info.lines, 'lines ·', info.duration.toFixed(0), 's')
for (let k = 0; k < SHOTS; k++) {
	const t = info.duration * (k + 0.5) / SHOTS
	await page.evaluate(t => window.bosh.seekTo(t), t)
	await page.waitForTimeout(150)
	await page.screenshot({ path: `${OUT}/shot${k}.png` })
}
console.log('screenshots in', OUT, errors.length ? '\nerrors:\n' + errors.join('\n') : '')
await browser.close()
server.close()
process.exit(info.exact === info.pads && info.crash == null && !errors.length ? 0 : 1)
