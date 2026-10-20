// Portrait contact sheet for #032 Shorts: every portrait-rated spot (and the
// director's frames over a clip) rendered at 9:16, saved as PNGs.
//   node pianist/test/shorts_sheet.mjs [song] [t] [out dir]
// Needs the parent folder served (BASE, default http://127.0.0.1:8000/midiviz/),
// playwright-core (PLAYWRIGHT) and a Chromium (CHROME), as violinist/test/collisions.mjs.
const BASE = process.env.BASE || 'http://127.0.0.1:8000/midiviz/'
const PW = process.env.PLAYWRIGHT || '/tmp/pw/node_modules/playwright-core/index.mjs'
const CHROME = process.env.CHROME || `${process.env.HOME}/.cache/ms-playwright/chromium-1134/chrome-linux/chrome`
const [song = 'Prelude1.mid', T = '40', out = '/tmp/shorts_sheet'] = process.argv.slice(2)
const VIEWS = (process.env.VIEWS || 'keysUp,keysTop,keys,bassKeys,hands,treble,handsRight,shoulder,above,profile,headside,face,front,bust,profileMed,lowRight,lowShoulder,lowLeft,lowRightBack,back,overKeys,hammers,pedalsClose').split(',')
const AUTO = (process.env.AUTO || '').split(',').filter(Boolean)   // song times for the director's frames
const { chromium } = await import(PW)
const fs = await import('node:fs')
fs.mkdirSync(out, { recursive: true })
const browser = await chromium.launch({ executablePath: CHROME, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
const W = +(process.env.W || 360), H = Math.round(W * 16 / 9)
const jobs = [...VIEWS.map(v => ({ view: v, t: T })), ...AUTO.map(t => ({ view: 'auto', t }))]
for (const { view, t } of jobs) for (let tries = 0; tries < 2; tries++) try {
  const page = await browser.newPage({ viewport: { width: W, height: H } })
  const errors = []
  page.on('pageerror', e => errors.push(e.message))
  const clip = process.env.CLIP || `${Math.max(0, +T - 5)}-${+T + 30}`
  await page.goto(`${BASE}032_pianist.html?shot&q=low&hairsim=0&clothsim=0&short=1&clip=${clip}&view=${view}&song=${song}&t=${t}`)
  await page.waitForFunction(() => window.__shot, null, { timeout: 180000 })
  await page.evaluate(() => window.__shot())
  const info = await page.evaluate(() => window.__shotInfo ? window.__shotInfo.name + ' ' + window.__shotInfo.move : '')
  const f = `${out}/${view === 'auto' ? 'auto_' + t : view}.png`
  // (the frame __shot drew, read back from the canvas: a screenshot waits on a busy swiftshader)
  const png = await page.evaluate(() => { window.__pianist.exportStage.renderer.setAnimationLoop(null); return document.querySelector('canvas').toDataURL('image/png') })
  fs.writeFileSync(f, Buffer.from(png.split(',')[1], 'base64'))
  console.log(f, info, errors.length ? 'ERRORS: ' + errors.join(' | ') : '')
  await page.close()
  break
} catch (e) { console.log(view, t, 'retry:', e.message.split('\n')[0]) }
await browser.close()
