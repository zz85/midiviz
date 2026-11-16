// node duo/test/motion-bake.browser.mjs
// Needs the parent folder served at BASE and Playwright/Chromium as in the other browser tests.
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

const BASE = process.env.BASE || 'http://127.0.0.1:8000/midiviz/'
const PW = process.env.PLAYWRIGHT || '/tmp/pw/node_modules/playwright-core/index.mjs'
const CHROME = process.env.CHROME || `${process.env.HOME}/.cache/ms-playwright/chromium-1194/chrome-linux/chrome`
const { chromium } = await import(PW)
const browser = await chromium.launch({ executablePath: CHROME, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] })
const page = await browser.newPage({ viewport: { width: 960, height: 540 }, acceptDownloads: true })
page.setDefaultTimeout(300000)
const errors = []
page.on('pageerror', error => errors.push(error.message))
let failed = false
const check = (condition, message) => { console.log(condition ? 'ok  ' : 'FAIL', message); if (!condition) failed = true }
const url = `${BASE}038_duo.html?sw=0&intro=0`

await page.goto(url)
await page.waitForFunction(() => window.__duo?.motion)
let state = await page.evaluate(() => window.__duo.motion.state())
check(state.mode === 'live' && state.bytes === 0, 'ordinary Duo playback starts with live simulation')

await page.evaluate(() => window.__duo.motion.bake(0.05))
state = await page.evaluate(() => window.__duo.motion.state())
check(state.mode === 'baked' && state.bundles.join(',') === 'violinist,pianist', 'fixed-step bake activates both performer bundles')
check(state.bytes > 1000, `codec produced a ${state.bytes}-byte .duobake`)
const bakedSpec = await page.evaluate(() => window.__duo.motion.spec())
const seekReplay = await page.evaluate(() => {
  const pose = () => { const values = []; window.__duo.her.group.traverse(object => { if (object.isBone) values.push(object.position.x, object.position.y, object.position.z, object.quaternion.x, object.quaternion.y, object.quaternion.z, object.quaternion.w) }); return values }
  window.__duo.motion.apply(0); const a = pose()
  window.__duo.motion.apply(0.05); const b = pose()
  window.__duo.motion.apply(0); const c = pose()
  return { repeat: JSON.stringify(a) === JSON.stringify(c), moves: a.some((value, i) => Math.abs(value - b[i]) > 1e-7) }
})
check(seekReplay.repeat && seekReplay.moves, 'replay seeks directly and returns to the same recorded pose')

const saved = path.join(os.tmpdir(), `duo-motion-${process.pid}.duobake`)
const savedBytes = await page.evaluate(() => window.__duo.motion.bytes())
await fs.writeFile(saved, Buffer.from(savedBytes))
check((await fs.stat(saved)).size === state.bytes, 'Save bake bytes match the encoded file')
check(await page.evaluate(() => !document.getElementById('motionSave').hidden && typeof document.getElementById('motionSave').onclick === 'function'), 'Save bake control is enabled')
const [download] = await Promise.all([
  page.waitForEvent('download', { timeout: 10000 }),
  page.evaluate(() => document.getElementById('motionSave').click()),
])
check(download.suggestedFilename().endsWith('.duobake'), 'Save bake downloads a .duobake file')

await page.goto(url)
await page.waitForFunction(() => window.__duo?.motion)
await page.setInputFiles('#motionFile', saved)
await page.waitForFunction(() => window.__duo.motion.state().mode === 'baked')
const loaded = await page.evaluate(() => window.__duo.motion.state())
check(loaded.bundles.join(',') === 'violinist,pianist' && loaded.bytes > 1000, 'Load bake validates and activates both bundles')

await page.goto(`${url}&outfit=casual`)
await page.waitForFunction(() => window.__duo?.motion)
const partialError = await page.evaluate(async bytes => { try { await window.__duo.motion.load(new File([new Uint8Array(bytes)], 'partial.duobake', { type: 'application/gzip' })); return '' } catch (error) { return error.message } }, savedBytes)
const partial = await page.evaluate(async () => ({ ...window.__duo.motion.state(), status: document.getElementById('status').textContent, spec: await window.__duo.motion.spec() }))
check(partial.bundles.join(',') === 'pianist', `a violin-only setting mismatch leaves the compatible pianist bundle usable (${partialError || partial.bundles.join(',')})`)
if (partialError) console.log('     original bundles', JSON.stringify(bakedSpec.bundles), '\n     changed bundles ', JSON.stringify(partial.spec.bundles))

async function freshDigest() {
  await page.goto(url)
  await page.waitForFunction(() => window.__duo?.motion)
  await page.evaluate(() => sessionStorage.setItem(`midiviz:duobake:${location.pathname}`, JSON.stringify({ search: location.search, endSeconds: 0.05 })))
  await page.reload()
  await page.waitForFunction(() => window.__duo?.motion?.state().mode === 'baked')
  return page.evaluate(() => window.__duo.motion.state().digest)
}
const firstDigest = await freshDigest()
const secondDigest = await freshDigest()
check(firstDigest === secondDigest, `two fresh fixed-step bakes have the same payload digest (${firstDigest.slice(0, 12)})`)

check(!errors.length, 'no page errors: ' + errors.join(' | '))

await fs.rm(saved, { force: true })
await browser.close()
process.exit(failed ? 1 : 0)
