// Render a clip of #037 headless: frames at 30 fps from a fixed view, piped to
// ffmpeg as an MP4. For before/after comparisons of the rig (research/06).
//
//   node violinist/tools/render_clip.mjs out.mp4 [song.mid] [view] [from] [seconds]
//
// Environment as violinist/test/collisions.mjs (BASE, PLAYWRIGHT, CHROME).
// `view` is a page preset (bow, left, behind …) or a camera of your own,
// "x,y,z/tx,ty,tz/fov" in the page's cm (the player faces +z, his left at +x).
// The clip is the rig alone (960×540); the sound is not rendered.

import { spawn } from 'node:child_process'

const BASE = process.env.BASE || 'http://127.0.0.1:8000/midiviz/'
const PW = process.env.PLAYWRIGHT || '/tmp/pw/node_modules/playwright-core/index.mjs'
const CHROME = process.env.CHROME || `${process.env.HOME}/.cache/ms-playwright/chromium-1194/chrome-linux/chrome`
const [out = '/tmp/clip.mp4', song = 'bach_1006_1_preludio.mid', view = 'bow', from = '4', seconds = '12'] = process.argv.slice(2)
const FPS = 30, W = 960, Hh = 540

const { chromium } = await import(PW)
const browser = await chromium.launch({ executablePath: CHROME, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
const page = await browser.newPage({ viewport: { width: W, height: Hh }, deviceScaleFactor: 1 })
page.on('pageerror', e => console.error('page error', e.message))
const custom = view.includes('/') ? view.split('/').map(s => s.split(',').map(Number)) : null
await page.goto(`${BASE}037_violinist.html?shot&${new URLSearchParams({ t: from, song, view: custom ? 'free' : view })}`)
await page.waitForFunction('window.__done', null, { timeout: 240000 })
if (custom) await page.evaluate(([p, tg, fov]) => {
  const { camera, controls } = window.__dbg
  camera.position.set(...p); controls.target.set(...tg); camera.fov = fov[0]; camera.updateProjectionMatrix(); controls.update()
}, custom)
const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', out], { stdio: ['pipe', 'inherit', 'inherit'] })
const n = Math.round(+seconds * FPS)
for (let i = 0; i < n; i++) {
  const t = +from + i / FPS
  const b64 = await page.evaluate(([t, fps]) => {
    const { frame, renderer, scene, camera, controls } = window.__dbg
    for (let k = 1; k >= 0; k--) frame(t - k / (2 * fps), 1 / (2 * fps))   // two rig steps per frame, so the springs see 60 Hz
    controls.update(); renderer.render(scene, camera)
    return renderer.domElement.toDataURL('image/png').slice(22)
  }, [t, FPS])
  if (!ff.stdin.write(Buffer.from(b64, 'base64'))) await new Promise(r => ff.stdin.once('drain', r))
  if (i % FPS === 0) process.stderr.write(`\r${(i / FPS).toFixed(0)} / ${seconds} s`)
}
ff.stdin.end()
await new Promise(r => ff.on('close', r))
process.stderr.write(`\nwrote ${out}\n`)
await browser.close()
