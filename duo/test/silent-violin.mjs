// #038 Duo: a piano MIDI file with the violin silent, headless.
//   node duo/test/silent-violin.mjs [file.mid] [out dir]
// Opens the file (a keyboard-only file starts silent), plays a few seconds and checks that he has
// no notes and stands back, she has all of them, then picks his top line (he comes back to his
// place) and silent again; and that the page raised no errors. Needs the folder served (BASE) and
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
const state = () => page.evaluate(() => ({ choice: document.getElementById('vpart').value, violin: window.__song.violin.length, piano: window.__song.piano.length, ppart: document.getElementById('ppart').disabled, him: window.__duoHim() }))
await page.waitForFunction(() => { const h = window.__duoHim(); return h && (h[2] < -100) && !document.getElementById('status')?.textContent }, null, { timeout: 120000 }).catch(() => {})
const before = await state()
const pick = v => page.evaluate(v => { const s = document.getElementById('vpart'); s.value = v; s.dispatchEvent(new Event('change')) }, v)
await page.evaluate(() => { document.getElementById('cam').value = 'wide'; document.getElementById('cam').dispatchEvent(new Event('change')) })
await page.evaluate(() => (document.getElementById('start')?.click(), document.getElementById('play')?.click()))
await page.waitForTimeout(14000)
fs.writeFileSync(`${out}/silent.png`, await page.screenshot())
await page.evaluate(() => { document.getElementById('cam').value = 'her'; document.getElementById('cam').dispatchEvent(new Event('change')) })
await page.waitForTimeout(3000)
fs.writeFileSync(`${out}/silent_her.png`, await page.screenshot())
const after = await state()
// his top line, then silent again
await pick([...(await page.$$eval('#vpart option', os => os.map(o => o.value)))].find(v => v.endsWith(':top')))
await page.waitForFunction(() => window.__song.violin.length > 0, null, { timeout: 300000 })
await page.waitForFunction(() => { const h = window.__duoHim(); return h && (h[2] === 0) && !document.getElementById('status')?.textContent }, null, { timeout: 120000 }).catch(() => {})
const back = await state()
await pick('none')
await page.waitForFunction(() => window.__song.violin.length === 0, null, { timeout: 300000 })
await page.waitForFunction(() => { const h = window.__duoHim(); return h && (h[2] < -100) && !document.getElementById('status')?.textContent }, null, { timeout: 120000 }).catch(() => {})
const again = await state()
await page.evaluate(() => { document.getElementById('cam').value = 'front'; document.getElementById('cam').dispatchEvent(new Event('change')) })
await page.evaluate(() => document.getElementById('play')?.click())
await page.waitForTimeout(5000)
fs.writeFileSync(`${out}/silent_front.png`, await page.screenshot())
console.log('opened:', before, '\nplayed:', after, '\ntop:   ', back, '\nsilent:', again, errs.length ? '\n' + errs.join('\n') : '')
await browser.close()
const ok = !errs.length && before.choice === 'none' && before.violin === 0 && before.him[2] < -100 && back.violin > 0 && back.piano < before.piano && back.him[2] === 0 && again.him[2] < -100
console.log(ok ? 'passed' : 'FAILED', '· picture in', out)
process.exit(ok ? 0 : 1)
