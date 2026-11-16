// Headless check of 053_omr_eval.html: the page loads a run, draws page 4 with its marks, the
// table has a row per page, clicking a row changes the page, and the baseline run loads too.
//   node omr-eval/test/browser.mjs      (serves ~/test on 127.0.0.1:8000 as the other tests, or BASE)
import { writeFileSync, mkdirSync } from 'node:fs'
const BASE = process.env.BASE || 'http://127.0.0.1:8000/midiviz/'
const PW = process.env.PLAYWRIGHT || '/tmp/pw/node_modules/playwright-core/index.mjs'
const CHROME = process.env.CHROME || `${process.env.HOME}/.cache/ms-playwright/chromium-1194/chrome-linux/chrome`
const OUT = process.env.OUT || '/tmp/omr_eval_test'
mkdirSync(OUT, { recursive: true })
const { chromium } = await import(PW)
const browser = await chromium.launch({ executablePath: CHROME })
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } })
const errors = []
page.on('pageerror', e => errors.push(e.message))
let fails = 0
const check = (name, ok, info = '') => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${name} ${info}`); if (!ok) fails++ }

await page.goto(BASE + '053_omr_eval.html?page=4')
await page.waitForFunction(() => document.querySelectorAll('#rows tr').length > 0 && document.getElementById('canvas').width > 0, null, { timeout: 30000 })
await page.waitForTimeout(500)
const rows = await page.evaluate(() => document.querySelectorAll('#rows tr').length)
check('a row per page', rows === 17, String(rows))
check('page 4 shown', await page.evaluate(() => document.getElementById('pageno').textContent.startsWith('page 4')))
const summary = await page.evaluate(() => document.getElementById('summary').textContent)
check('summary has the pitch rate', /pitch right \d+(\.\d+)?%/.test(summary), summary.slice(0, 80))
// the canvas holds marks: red (wrong) and blue (missed) pixels beyond the gray page
const colours = await page.evaluate(() => {
  const c = document.getElementById('canvas'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data
  let red = 0, blue = 0, green = 0
  for (let i = 0; i < d.length; i += 16) { const [r, g, b] = [d[i], d[i + 1], d[i + 2]]; if (r > 160 && g < 110 && b < 110) red++; if (b > 160 && r < 110) blue++; if (g > 120 && r < 120 && b < 140) green++ }
  return { red, blue, green }
})
check('wrong, missed and matched marks drawn', colours.red > 50 && colours.blue > 20 && colours.green > 100, JSON.stringify(colours))
await page.screenshot({ path: `${OUT}/page4.png` })
await page.click('#rows tr[data-page="9"]')
await page.waitForFunction(() => document.getElementById('pageno').textContent.startsWith('page 9'))
check('clicking a row goes to that page', true)
await page.selectOption('#run', 'omr-eval/baseline.json')
const before = summary.match(/pitch right ([\d.]+)%/)[1]
await page.waitForFunction(b => { const m = document.getElementById('summary').textContent.match(/pitch right ([\d.]+)%/); return m && m[1] !== b }, before, { timeout: 30000 })
const base = (await page.evaluate(() => document.getElementById('summary').textContent)).match(/pitch right ([\d.]+)%/)[1]
check('baseline run loads, below the current one', +base < +before, `${base}% < ${before}%`)
check('no page errors', errors.length === 0, errors.join('; '))
await browser.close()
if (fails) { console.log(`${fails} FAILED`); process.exit(1) } else console.log('all ok; screenshots in ' + OUT)
