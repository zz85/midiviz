// Her fingertips (pianist/fingertips.js) on the #032 pianist, headless: plays a
// piece with Piano plays = Her fingertips and logs every key the fingertips put
// down against the hands' schedule: how many of the written onsets in the
// stretch sounded, how many were missed, and how far from the written onset
// each key went down (the picture's clock; the ear's hands run ahead of it).
//
//   node pianist/test/fingertips.mjs [song.mid] [seconds]
//
// Needs the parent folder served (BASE), playwright-core (PLAYWRIGHT) and a
// Chromium (CHROME), as wrist.mjs.
const BASE = process.env.BASE || 'http://127.0.0.1:8000/midiviz/'
const PW = process.env.PLAYWRIGHT || '/tmp/pw/node_modules/playwright-core/index.mjs'
const CHROME = process.env.CHROME || `${process.env.HOME}/.cache/ms-playwright/chromium-1134/chrome-linux/chrome`
const song = process.argv[2] || 'chpn-p15.mid', SECONDS = +(process.argv[3] || 20)
const { chromium } = await import(PW)
const browser = await chromium.launch({ executablePath: CHROME, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] })
let failed = 0
const check = (ok, what) => { console.log((ok ? 'ok   ' : 'FAIL ') + what); if (!ok) failed++ }
try {
  const page = await browser.newPage({ viewport: { width: 320, height: 240 } })
  const errors = []
  page.on('pageerror', e => errors.push(e.message))
  await page.goto(`${BASE}032_pianist.html?q=low&hairsim=0&clothsim=0&start=0&sw=0&played=fingers&song=${encodeURIComponent(song)}`)
  await page.waitForFunction(() => window.__pianist?.rig, null, { timeout: 180000 })
  await page.evaluate(() => document.getElementById('playBtn').click())
  await page.waitForFunction(() => window.__pianist.rig.hands.notes.length > 0 && window.__pianist.performed(), null, { timeout: 240000 })
  const r = await page.evaluate(async SECONDS => {
    const P = window.__pianist
    // log the keys as the fingertips put them down (the picture's clock)
    const log = []
    const piano = P.piano, on0 = piano.noteOn.bind(piano)
    piano.noteOn = (m, v) => { log.push([m, P.songNow(), v]); on0(m, v) }
    let frames = 0; const raf = () => { frames++; requestAnimationFrame(raf) }; requestAnimationFrame(raf)
    const t0 = P.songNow(), w0 = performance.now()
    await new Promise(r => setTimeout(r, SECONDS * 1000))
    const t1 = P.songNow(), fps = frames / ((performance.now() - w0) / 1000)
    piano.noteOn = on0
    const written = P.rig.hands.notes.filter(n => n.on > t0 + 0.5 && n.on < t1 - 0.5)
    // each written onset: the nearest logged key of its pitch
    let hit = 0, dts = []
    for (const n of written) {
      let best = null
      for (const [m, t] of log) if (m === n.pitch && t - n.on > -0.15 && t - n.on < 0.15 + 2 / fps && (!best || Math.abs(t - n.on) < Math.abs(best - n.on))) best = t
      if (best != null) { hit++; dts.push(best - n.on) }
    }
    dts.sort((a, b) => a - b)
    const q = p => dts.length ? dts[Math.floor(p * (dts.length - 1))] : null
    return { fps, t0, t1, written: written.length, hit, logged: log.length, keys: P.keysDet.stats, ear: P.earDet()?.stats, lag: P.avs.lag, measured: P.avs.measured,
      dtMedian: q(0.5), dt10: q(0.1), dt90: q(0.9), text: document.getElementById('playedV').textContent }
  }, SECONDS)
  console.log(JSON.stringify(r))
  const frame = 1 / r.fps
  console.log(`${r.fps.toFixed(1)} fps: a key can go down up to ${(frame * 1000).toFixed(0)} ms after the fingertip reaches it`)
  check(r.written > 20, `${r.written} written onsets in ${(r.t1 - r.t0).toFixed(1)} s`)
  check(r.hit >= (r.fps >= 30 ? 0.9 : 0.6) * r.written, `${r.hit} of ${r.written} sounded on the keys (${(100 * r.hit / r.written).toFixed(1)} %)`)
  check(r.dtMedian != null && r.dtMedian > -0.03 && r.dtMedian < 0.03 + frame, `key down ${(r.dtMedian * 1000).toFixed(0)} ms from the written onset (median; 10-90 %: ${(r.dt10 * 1000).toFixed(0)}..${(r.dt90 * 1000).toFixed(0)} ms)`)
  check(r.ear && r.ear.onsets > 0, `the ear's hands sounded ${r.ear?.onsets} notes (${r.ear?.missed} missed); the keys ${r.keys.onsets} (${r.keys.missed} missed); audio lag ${(r.lag * 1000).toFixed(0)} ms${r.measured ? '' : ' (not measured)'}`)
  check(/sounded/.test(r.text), `readout: "${r.text}"`)
  check(!errors.length, 'no page errors' + (errors.length ? ': ' + errors.join(' | ') : ''))
} catch (e) { console.log('FAIL', e.message); failed++ }
await browser.close().catch(() => {})
process.exit(failed ? 1 : 0)
