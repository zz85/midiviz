// Piano plays (pianist/performed.js) on the #032 pianist, headless: loads a
// piece, waits for the fingering, reads the schedule of what the hands play,
// switches the piano to it while the song runs and checks that the scheduler
// kept its place and now plays it, and that the keys follow the shorter
// notes. Exits 1 on a failure.
//
//   node pianist/test/performed.mjs [song.mid]
//
// Needs the parent folder served (BASE), playwright-core (PLAYWRIGHT) and a
// Chromium (CHROME), as wrist.mjs.
const BASE = process.env.BASE || 'http://127.0.0.1:8000/midiviz/'
const PW = process.env.PLAYWRIGHT || '/tmp/pw/node_modules/playwright-core/index.mjs'
const CHROME = process.env.CHROME || `${process.env.HOME}/.cache/ms-playwright/chromium-1134/chrome-linux/chrome`
const song = process.argv[2] || 'chpn-p15.mid'
const { chromium } = await import(PW)
const browser = await chromium.launch({ executablePath: CHROME, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] })
let failed = 0
const check = (ok, what) => { console.log((ok ? 'ok   ' : 'FAIL ') + what); if (!ok) failed++ }
try {
  const page = await browser.newPage({ viewport: { width: 320, height: 240 } })
  const errors = []
  page.on('pageerror', e => errors.push(e.message))
  await page.goto(`${BASE}032_pianist.html?q=low&hairsim=0&clothsim=0&start=0&sw=0&song=${encodeURIComponent(song)}`)
  await page.waitForFunction(() => window.__pianist?.rig, null, { timeout: 180000 })
  // play (the audio context runs without a gesture under the flag above)
  await page.evaluate(() => document.getElementById('playBtn')?.click() ?? document.getElementById('start').click())
  await page.waitForFunction(() => window.__pianist.rig.hands.notes.length > 0 && window.__pianist.performed(), null, { timeout: 240000 })
  const r = await page.evaluate(async () => {
    const P = window.__pianist, $ = id => document.getElementById(id)
    const file = P.sounding(), stats = P.performed().stats
    const out = { stats, fileNotes: file.notes.length, value0: $('played').value, text0: $('playedV').textContent }
    // wait until the song has run a few seconds, then switch
    await new Promise(r => setTimeout(r, 3000))
    const sch = P.scheduler ?? null
    const tBefore = P.songNow()
    $('played').value = 'hands'; $('played').dispatchEvent(new Event('change'))
    const now = P.sounding()
    out.text1 = $('playedV').textContent
    out.swapped = now !== file && now.notes.length === stats.played
    out.tBefore = tBefore; out.tAfter = P.songNow()
    // the keys: 1.5 s on, a key held in the file but let go by the hands should be up
    await new Promise(r => setTimeout(r, 1500))
    const t = P.songNow()
    const downFile = file.notes.filter(n => n.time <= t - 0.1 && n.time + n.duration > t + 0.1).map(n => n.midi)
    const byKey = new Map(now.notes.map(n => [n.midi + '@' + n.time, n]))
    const letGo = file.notes.filter(n => n.time <= t - 0.1 && n.time + n.duration > t + 0.1 && (!byKey.has(n.midi + '@' + n.time) || byKey.get(n.midi + '@' + n.time).time + byKey.get(n.midi + '@' + n.time).duration < t - 0.1)).map(n => n.midi)
    const held = P.heldKeys()
    out.t = t; out.downFile = downFile; out.letGo = letGo; out.held = held
    // back to the file: the keys come back
    $('played').value = 'midi'; $('played').dispatchEvent(new Event('change'))
    out.back = P.sounding() === file
    return out
  })
  console.log(JSON.stringify(r))
  check(r.value0 === 'midi' && r.text0 === '', 'starts on the MIDI file with no readout')
  check(r.stats.played + r.stats.silent === r.fileNotes, `every written note accounted for (${r.stats.played} played + ${r.stats.silent} silent = ${r.fileNotes})`)
  check(r.stats.early > 0, `some keys let go early (${r.stats.early}, ${r.stats.cut.toFixed(1)} s)`)
  check(r.swapped, 'the scheduler holds the hands\' schedule after the switch')
  check(Math.abs(r.tAfter - r.tBefore) < 0.3, `the song kept its place over the switch (${r.tBefore.toFixed(2)} → ${r.tAfter.toFixed(2)} s)`)
  check(/let go early|silent|as written/.test(r.text1), `readout: "${r.text1}"`)
  check(r.back, 'back to the file on the switch back')
  check(!errors.length, 'no page errors' + (errors.length ? ': ' + errors.join(' | ') : ''))
} catch (e) { console.log('FAIL', e.message); failed++ }
await browser.close().catch(() => {})
process.exit(failed ? 1 : 0)
