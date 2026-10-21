// Renders tuner/icon.svg to the PWA icons (tuner/icon-{180,192,512}.png) in
// Chromium, with the page's Cormorant Garamond.
//   node tuner/tools/icons.mjs   (needs playwright-core and a Chromium:
//   PLAYWRIGHT_CORE=/path/to/playwright-core CHROMIUM=/path/to/chrome)
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '../..')
const { chromium } = await import(process.env.PLAYWRIGHT_CORE ? pathToFileURL(path.join(process.env.PLAYWRIGHT_CORE, 'index.mjs')).href : 'playwright-core')
const font = fs.readFileSync(path.join(root, 'fonts/cormorant-garamond-latin-600-normal.woff2')).toString('base64')
const svg = fs.readFileSync(path.join(root, 'tuner/icon.svg'), 'utf8')
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined })
for (const size of [180, 192, 512]) {
  const page = await browser.newPage({ viewport: { width: size, height: size } })
  await page.setContent(`<style>@font-face{font-family:'Cormorant Garamond';font-weight:600;src:url(data:font/woff2;base64,${font})}
    html,body{margin:0;background:#0b0b0c}svg{display:block;width:${size}px;height:${size}px}</style>${svg}`)
  await page.evaluate(() => document.fonts.ready)
  await page.screenshot({ path: path.join(root, `tuner/icon-${size}.png`) })
  await page.close()
}
await browser.close()
