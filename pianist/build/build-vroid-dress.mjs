// Builds the concert dress for the VRoid AvatarSample_A pianist (?model=vroida):
// VRoid HairSample_Female's dress (CC0) refitted onto her body.
//
//   node pianist/build/build-vroid-dress.mjs [donor.vrm]
//
// donor: HairSample_Female.vrm from https://opengameart.org/sites/default/files/hairsample_female.zip
// (default violinist/assets/models/candidates/vroid-hairsample-female.vrm, git-ignored).
// Needs the parent folder of midiviz served over http (BASE, default
// http://127.0.0.1:8000/midiviz/), playwright-core (PLAYWRIGHT) and a Chromium
// (CHROME), and ffmpeg for the WebP texture. Writes
// pianist/assets/models/vroid-a-dress.json and vroid-a-dress.webp.

import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(HERE, '../..')
const BASE = process.env.BASE || 'http://127.0.0.1:8000/midiviz/'
const PW = process.env.PLAYWRIGHT || '/tmp/pw/node_modules/playwright-core/index.mjs'
const CHROME = process.env.CHROME || `${process.env.HOME}/.cache/ms-playwright/chromium-1134/chrome-linux/chrome`
const donor = path.resolve(process.argv[2] || path.join(ROOT, 'violinist/assets/models/candidates/vroid-hairsample-female.vrm'))
const target = path.join(ROOT, 'pianist/assets/models/vroid-avatarsample-a.vrm')
const rel = p => path.relative(path.join(ROOT, 'pianist/build'), p)
if (!fs.existsSync(donor)) throw new Error(`no donor VRM at ${donor}`)

const { chromium } = await import(PW)
const browser = await chromium.launch({ executablePath: CHROME, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
const page = await browser.newPage()
page.on('pageerror', e => console.error('page error:', e.message))
await page.goto(`${BASE}pianist/build/vroid-dress.html?donor=${encodeURIComponent(rel(donor))}&target=${encodeURIComponent(rel(target))}`)
await page.waitForFunction('window.__done', null, { timeout: 240000 })
const r = await page.evaluate(() => window.__info)
await browser.close()
for (const l of r.log) console.log(l)

const out = path.join(ROOT, 'pianist/assets/models/vroid-a-dress')
fs.writeFileSync(out + '.json', JSON.stringify(r.dress))
const png = out + '.tmp.png'
fs.writeFileSync(png, Buffer.from(r.texture.split(',')[1], 'base64'))
execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', png, '-vf', 'scale=1024:1024', '-quality', '88', out + '.webp'])
fs.unlinkSync(png)
console.log(`wrote ${path.relative(ROOT, out)}.json (${(fs.statSync(out + '.json').size / 1024).toFixed(0)} KB) and .webp (${(fs.statSync(out + '.webp').size / 1024).toFixed(0)} KB)`)
