// #049 headless: while a video renders the page takes no input but Cancel
// (pathtrace/render-lock.js). Keys, a click, the wheel and a drag during a render
// change nothing; a real click on Cancel stops it; a key after it works again.
//   node pathtrace/test/render-lock.mjs
// Needs the parent folder served (BASE, default http://127.0.0.1:8000/midiviz/),
// playwright-core (PLAYWRIGHT) and a Chromium (CHROME).
const BASE = process.env.BASE || 'http://127.0.0.1:8000/midiviz/'
const PW = process.env.PLAYWRIGHT || '/tmp/pw/node_modules/playwright-core/index.mjs'
const CHROME = process.env.CHROME || `${process.env.HOME}/.cache/ms-playwright/chromium-1194/chrome-linux/chrome`
const { chromium } = await import(PW)
const b = await chromium.launch({ executablePath: CHROME, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] })
const p = await b.newPage({ viewport: { width: 960, height: 540 }, acceptDownloads: true }); p.setDefaultTimeout(0)
const errs = []; p.on('pageerror', e => errs.push(e.message))
let fails = 0
const check = (ok, what) => { console.log(ok ? 'ok  ' : 'FAIL', what); if (!ok) fails++ }
await p.goto(`${BASE}049_sheet_scan.html?q=low&hairsim=0&clothsim=0&sw=0&song=midis/bach_goldberg_aria.mid&exres=854x480&exfps=5&extitle=none&exlen=60`)
await p.waitForFunction(() => window.__pianist?.pt && document.getElementById('songTitle')?.textContent.trim(), null, { timeout: 300000 })
await p.evaluate(() => document.getElementById('playBtn').click())
await p.waitForFunction(() => /systems/.test(document.getElementById('sNote')?.textContent || ''), null, { timeout: 120000 })
await p.evaluate(() => document.getElementById('playBtn').click())
const state = () => p.evaluate(() => ({ outfit: document.getElementById('outfit').value, dress: document.getElementById('dressStyle').value, sheet: document.getElementById('sOn').checked, hideui: document.body.classList.contains('hideui'), lock: !!document.getElementById('renderLock'), disabled: document.getElementById('dressStyle').disabled }))
const status = () => p.evaluate(() => document.getElementById('exStatus').textContent)
await p.evaluate(() => { window.showSaveFilePicker = undefined })
// (the fingering may still be on its way: Export says so, and is pressed again)
for (let k = 0; k < 80; k++) { await p.evaluate(() => { document.getElementById('exStart').onclick() }); await p.waitForTimeout(1500); if (/frames/.test(await status())) break }
for (let k = 0; k < 120 && !/frames/.test(await status()); k++) await p.waitForTimeout(500)
const s0 = await state()
check(s0.lock && s0.disabled, `rendering: the note shows (${s0.lock}), the controls are disabled (${s0.disabled}): ${await status()}`)
for (const k of ['3', '7', 's', 'S', 'Escape', ' ', 'ArrowRight']) await p.keyboard.press(k)
await p.mouse.click(480, 300); await p.mouse.wheel(0, 400)
await p.mouse.move(480, 300); await p.mouse.down(); await p.mouse.move(700, 200, { steps: 5 }); await p.mouse.up()
await p.waitForTimeout(800)
const s1 = await state()
check(s1.outfit === s0.outfit && s1.dress === s0.dress && s1.sheet === s0.sheet && !s1.hideui, `keys, a click, the wheel and a drag changed nothing (${JSON.stringify(s1)})`)
// Cancel, by a real click
await p.evaluate(() => { document.getElementById('renderPop').classList.add('open'); document.getElementById('exCancel').scrollIntoView({ block: 'center' }) })
const box = await p.evaluate(() => { const r = document.getElementById('exCancel').getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2] })
await p.mouse.click(box[0], box[1])
for (let k = 0; k < 60 && !/^(Done|Failed|Cancelled)/.test(await status()); k++) await p.waitForTimeout(500)
const s2 = await state()
check(/^Cancelled/.test(await status()) && !s2.lock && !s2.disabled, `a click on Cancel stops it, and the controls come back (${await status()})`)
await p.keyboard.press('3'); await p.waitForTimeout(800)
check((await state()).outfit !== s0.outfit, 'a key after it works again (outfit preset 3)')
check(!errs.length, 'no page errors ' + errs.join(' | '))
await b.close()
console.log(fails ? `${fails} failed` : 'all passed')
process.exit(fails ? 1 : 0)
