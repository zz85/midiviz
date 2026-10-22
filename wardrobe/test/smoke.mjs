// #047: load the wardrobe headless, cycle every rail, check nothing throws,
// and save pictures along the way.
//   node wardrobe/test/smoke.mjs [out dir]
// env: BASE (default http://127.0.0.1:8000/midiviz/), PLAYWRIGHT, CHROME,
//      FULL=1 (every dress and hair, not a sample), PT=1 (a small path-traced still)
// Needs the parent folder served, playwright-core and a Chromium, as
// pathtrace/test/stills.mjs. Runs on SwiftShader without a GPU.
const BASE = process.env.BASE || 'http://127.0.0.1:8000/midiviz/'
const PW = process.env.PLAYWRIGHT || '/tmp/pw/node_modules/playwright-core/index.mjs'
const CHROME = process.env.CHROME || `${process.env.HOME}/.cache/ms-playwright/chromium-1232/chrome-linux/chrome`
const [out = '/tmp/wardrobe_smoke'] = process.argv.slice(2)
const { chromium } = await import(PW)
const fs = await import('node:fs')
fs.mkdirSync(out, { recursive: true })
const browser = await chromium.launch({ executablePath: CHROME, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--enable-unsafe-webgpu', '--use-webgpu-adapter=swiftshader', '--enable-features=Vulkan'] })
const page = await browser.newPage({ viewport: { width: 1200, height: 800 } })
const errors = []
page.on('pageerror', e => errors.push('pageerror: ' + e.message))
page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push('console: ' + m.text().slice(0, 300)) })
page.on('response', r => { if (r.status() >= 400 && !/favicon/.test(r.url())) errors.push(`${r.status()} ${r.url()}`) })
page.setDefaultTimeout(0)
const t0 = Date.now()
await page.goto(`${BASE}047_wardrobe.html?shot&q=low${process.env.EXTRA || ''}`)
await page.waitForFunction(() => window.__wardrobe, null, { timeout: 300000 })
console.log(`loaded in ${((Date.now() - t0) / 1000).toFixed(1)} s`)
const save = async name => {
  const png = await page.evaluate(() => window.__wardrobe.shot(20))
  fs.writeFileSync(`${out}/${name}.png`, Buffer.from(png.split(',')[1], 'base64'))
  // the whole page too (the rails) for the first one
}
await save('00_start')
await page.screenshot({ path: `${out}/00_page.png` })

// one step along a rail, timed until the build is done
async function step(k, d = 1) {
  return page.evaluate(async ({ k, d }) => {
    const w = window.__wardrobe, t = performance.now()
    await w.cycle(k, d); await w.idle()
    return { v: w.W[k], ms: Math.round(performance.now() - t) }
  }, { k, d })
}
const report = []
const steps = process.env.FULL ? { dress: 40, hair: 22, shoes: 5, outfit: 15 } : { dress: 4, hair: 4, shoes: 3, outfit: 4, fabric: 4, skinTex: 3, backdrop: 2 }
for (const [k, n] of Object.entries(steps)) {
  for (let i = 0; i < n; i++) {
    const r = await step(k)
    report.push({ rail: k, ...r })
    console.log(k.padEnd(8), String(r.v).padEnd(20), `${r.ms} ms`)
    if (i < 2 || process.env.FULL) await save(`${k}_${i}_${String(r.v).replace(/\W+/g, '')}`)
  }
}
// every outfit (OUTFITS=1): one picture each, from the front and the side
if (process.env.OUTFITS) {
  const keys = await page.evaluate(() => [...document.querySelectorAll('[data-k=outfit] option')].map(o => o.value).filter(Boolean))
  for (const k of keys) {
    const ms = await page.evaluate(async k => { const w = window.__wardrobe, t = performance.now(); await w.choose('outfit', k); await w.idle(); return Math.round(performance.now() - t) }, k)
    console.log('outfit  ', k.padEnd(20), `${ms} ms`)
    await page.evaluate(() => window.__wardrobe.frameTo('full', 0, true)); await save(`outfit_${k}`)
    await page.evaluate(() => window.__wardrobe.frameTo('full', 40, true)); await save(`outfit_${k}_34`)
  }
}
// skins and faces
for (const [sk, f] of [['asian', null], ['african', null], ['caucasian', null], ['caucasian', 0.6]]) {
  const r = await page.evaluate(async ({ sk, f }) => {
    const w = window.__wardrobe, t = performance.now()
    await w.choose('skinTex', sk); await w.idle()
    if (f != null) { await w.setFace('asian', f, true); await w.idle() }
    w.frameTo('face', 0, true)
    return { ms: Math.round(performance.now() - t), face: w.ch.face }
  }, { sk, f })
  console.log('skin    ', sk.padEnd(10), JSON.stringify(r.face), `${r.ms} ms`)
  await save(`skin_${sk}${f != null ? '_face' + f : ''}`)
}
await page.evaluate(() => { window.__wardrobe.choose('skinTex', 'caucasian'); window.__wardrobe.frameTo('full', 0, true) })
await page.evaluate(() => window.__wardrobe.idle())
// a colour change is a paint, no rebuild
const col = await page.evaluate(() => { const w = window.__wardrobe, t = performance.now(); w.setColor('dressColor', '#1d6f73'); w.setColor('hairColor', '#a5532a'); return Math.round(performance.now() - t) })
console.log('colours  ', `${col} ms`)
await save('colours')
for (const lk of ['stylized', 'cel']) { await page.evaluate(lk => window.__wardrobe.setLook(lk), lk); await save('look_' + lk) }
await page.evaluate(() => window.__wardrobe.setColor('dressColor', '#c8102e'))
await save('look_cel_recolored')
await page.evaluate(() => window.__wardrobe.setLook('realistic'))
for (const p of ['stand', 'seated', 'sides']) { await page.evaluate(p => window.__wardrobe.setPose(p), p); await save('pose_' + p) }
for (const l of ['stage', 'day', 'studio']) { await page.evaluate(l => window.__wardrobe.setLight(l), l); await save('light_' + l) }
for (const f of ['face', 'feet', 'half', 'full']) { await page.evaluate(f => window.__wardrobe.frameTo(f, null, true), f); await save('frame_' + f) }
await page.evaluate(async () => { await window.__wardrobe.shuffleAll(); await window.__wardrobe.idle() })
await save('shuffle')
await page.screenshot({ path: `${out}/zz_page.png` })

if (process.env.PT) {
  const r = await page.evaluate(async () => {
    const res = await window.__wardrobe.pt.run(['gpt-webgl'], { samples: 8, bounces: 3, denoise: false, fx: false, hairFraction: 0.25, size: [320, 400] }, { headless: true })
    return res.map(x => ({ engine: x.engine, info: x.info, png: x.canvas?.toDataURL('image/png') }))
  })
  for (const x of r) { console.log(x.engine, x.info); if (x.png) fs.writeFileSync(`${out}/pt_${x.engine}.png`, Buffer.from(x.png.split(',')[1], 'base64')) }
}

fs.writeFileSync(`${out}/report.json`, JSON.stringify({ report, errors }, null, 1))
console.log(errors.length ? `${errors.length} errors:\n` + errors.join('\n') : 'no errors')
await browser.close()
process.exit(errors.length ? 1 : 0)
