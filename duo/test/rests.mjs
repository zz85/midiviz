// #038 Duo: hands relaxed in a long silence. duo/test/fixtures/rests.mid: the violin rests
// 8-18 s, the left hand 6-18 s, the right hand plays throughout. Headless frames at 4 s (all
// playing), 13 s (the violin lowered, her left hand in her lap, the right hand playing), 17.3 s
// (coming back up) and 20 s (all playing again); the rig's own numbers checked at each.
//   node duo/test/rests.mjs [out dir]
const BASE = process.env.BASE || 'http://127.0.0.1:8000/midiviz/'
const PW = process.env.PLAYWRIGHT || '/tmp/pw/node_modules/playwright-core/index.mjs'
const CHROME = process.env.CHROME || `${process.env.HOME}/.cache/ms-playwright/chromium-1194/chrome-linux/chrome`
const [out = '/tmp/duo_rests'] = process.argv.slice(2)
const { chromium } = await import(PW)
const fs = await import('node:fs')
fs.mkdirSync(out, { recursive: true })
const browser = await chromium.launch({ executablePath: CHROME, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
let failed = 0
for (const t of [4, 13, 17.3, 20]) {
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } }), errs = []
  page.on('pageerror', e => errs.push('pageerror: ' + e.message))
  page.on('console', m => { if (m.type() === 'error' && !/favicon|404/.test(m.text())) errs.push('console: ' + m.text().slice(0, 300)) })
  page.setDefaultTimeout(0)
  await page.goto(`${BASE}038_duo.html?q=low&view=front&intro=0&start=0`)
  await page.waitForFunction(() => window.__song?.piano?.length && window.__duoSeek, null, { timeout: 300000 })
  await page.setInputFiles('#file', 'duo/test/fixtures/rests.mid')
  await page.waitForFunction(() => window.__song?.entry?.local && window.__song.violin.length === 32, null, { timeout: 300000 })
  await page.evaluate(t => window.__duoSeek(t), t)
  await page.waitForTimeout(1500)
  fs.writeFileSync(`${out}/rests_${t}.png`, await page.screenshot())
  const r = await page.evaluate(t => ({ violinRest: +window.__song.drive.restAt(t).toFixed(2), L: +(window.__duoRig().pRig.hands.restAt('L', t + window.__duoRig().pRig.hands.lead)).toFixed(2), R: +(window.__duoRig().pRig.hands.restAt('R', t + window.__duoRig().pRig.hands.lead)).toFixed(2), wristL: +window.__duoRig().pRig.pos('wrist.L').y.toFixed(0), wristR: +window.__duoRig().pRig.pos('wrist.R').y.toFixed(0) }), t)
  const want = { 4: [0, 0], 13: [1, 1], 17.3: [0, 0], 20: [0, 0] }[t]
  // (her wrists over the keys are ~78 cm up; in her lap ~62)
  const ok = !errs.length && r.violinRest === want[0] && r.L === want[1] && r.R === 0 && (want[1] ? r.wristL < 70 : r.wristL > 74) && r.wristR > 74
  if (!ok) failed++
  console.log(`t=${t}`.padEnd(7), ok ? 'ok ' : 'BAD', JSON.stringify(r), errs.join(' '))
  await page.close()
}
await browser.close()
console.log(failed ? `${failed} failed` : 'all passed', '· pictures in', out)
process.exit(failed ? 1 : 0)
