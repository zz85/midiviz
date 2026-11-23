// #038 Duo: a piano MIDI file with the violin silent, headless.
//   node duo/test/silent-violin.mjs [file.mid] [out dir]
// Opens the file, picks Violin: silent, plays a few seconds and checks that he has no notes,
// she has all of them, and the page raised no errors. Needs the folder served (BASE) and
// playwright-core (PLAYWRIGHT), as park/test/stage.mjs.
const BASE = process.env.BASE || 'http://127.0.0.1:8000/midiviz/'
const PW = process.env.PLAYWRIGHT || '/tmp/pw/node_modules/playwright-core/index.mjs'
const CHROME = process.env.CHROME || `${process.env.HOME}/.cache/ms-playwright/chromium-1194/chrome-linux/chrome`
const [file = 'midis/appass_1.mid', out = '/tmp/duo_silent'] = process.argv.slice(2)
const { chromium } = await import(PW)
const fs = await import('node:fs')
fs.mkdirSync(out, { recursive: true })
const browser = await chromium.launch({ executablePath: CHROME, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] })
const page = await browser.newPage({ viewport: { width: 960, height: 540 } })
const errs = []
page.on('pageerror', e => errs.push('pageerror: ' + e.message))
page.on('console', m => { if (m.type() === 'error' && !/favicon|404/.test(m.text())) errs.push('console: ' + m.text().slice(0, 300)) })
page.setDefaultTimeout(0)
await page.goto(BASE + '038_duo.html?q=low')
await page.waitForFunction(() => window.__song?.piano?.length, null, { timeout: 300000 })
await page.setInputFiles('#file', file)
await page.waitForFunction(() => !document.getElementById('vpart').hidden && window.__song?.entry?.local, null, { timeout: 300000 })
const before = await page.evaluate(() => ({ choice: document.getElementById('vpart').value, violin: window.__song.violin.length, piano: window.__song.piano.length }))
await page.evaluate(() => { const s = document.getElementById('vpart'); s.value = 'none'; s.dispatchEvent(new Event('change')) })
await page.waitForFunction(() => window.__song.violin.length === 0 && window.__song.piano.length > 0, null, { timeout: 300000 })
const after = await page.evaluate(() => ({ choice: document.getElementById('vpart').value, violin: window.__song.violin.length, piano: window.__song.piano.length, duration: +window.__song.duration.toFixed(1), ppart: document.getElementById('ppart').disabled }))
await page.evaluate(() => (document.getElementById('start')?.click(), document.getElementById('play')?.click()))
await page.waitForTimeout(6000)
fs.writeFileSync(`${out}/silent.png`, await page.screenshot())
// and back to a violin track
await page.evaluate(() => { const s = document.getElementById('vpart'); s.value = s.options[1].value; s.dispatchEvent(new Event('change')) })
await page.waitForFunction(() => window.__song.violin.length > 0, null, { timeout: 300000 })
const back = await page.evaluate(() => ({ choice: document.getElementById('vpart').value, violin: window.__song.violin.length, piano: window.__song.piano.length }))
console.log('opened:', before, '\nsilent:', after, '\nback:  ', back, errs.length ? '\n' + errs.join('\n') : '')
await browser.close()
const ok = !errs.length && after.violin === 0 && after.piano >= before.piano && back.violin > 0
console.log(ok ? 'passed' : 'FAILED', '· picture in', out)
process.exit(ok ? 0 : 1)
