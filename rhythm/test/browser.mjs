// Browser end-to-end test for #040: runs 040_rhythm.html in Chromium on
// (1) the Demo loop source and (2) Chromium's fake microphone fed with a WAV
// of a corpus song through the microphone model, and scores the beats the
// page reports against the true beats.
//
//   node rhythm/test/browser.mjs [song=rock] [seconds=20]
//
// Needs the repo's parent folder served over http (BASE, default
// http://127.0.0.1:8000/midiviz/), playwright-core (PLAYWRIGHT, default
// /tmp/pw/node_modules/playwright-core/index.mjs) and a Chromium (CHROME,
// default playwright's chromium-1134).

import fs from 'node:fs'
import { corpus, audioFor } from './eval.js'
import { scoreBeats } from './metrics.js'

const BASE = process.env.BASE || 'http://127.0.0.1:8000/midiviz/'
const PW = process.env.PLAYWRIGHT || '/tmp/pw/node_modules/playwright-core/index.mjs'
const CHROME = process.env.CHROME || `${process.env.HOME}/.cache/ms-playwright/chromium-1134/chrome-linux/chrome`
const { chromium } = await import(PW)
const arg = Object.fromEntries(process.argv.slice(2).map(a => a.split('=')))
const SONG = arg.song || 'rock', SECONDS = Number(arg.seconds || 20)

function wav16(x, sr) {
  const b = Buffer.alloc(44 + 2 * x.length)
  b.write('RIFF', 0); b.writeUInt32LE(36 + 2 * x.length, 4); b.write('WAVEfmt ', 8)
  b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(sr, 24); b.writeUInt32LE(2 * sr, 28)
  b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(2 * x.length, 40)
  let m = 0; for (const v of x) m = Math.max(m, Math.abs(v))
  for (let i = 0; i < x.length; i++) b.writeInt16LE(Math.round(32767 * 0.8 * x[i] / m), 44 + 2 * i)
  return b
}

async function run(label, url, extraArgs, until) {
  const browser = await chromium.launch({ executablePath: CHROME, args: ['--autoplay-policy=no-user-gesture-required', ...extraArgs] })
  const ctx = await browser.newContext({ permissions: ['microphone'] })
  const page = await ctx.newPage()
  const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()) })
  await page.goto(url)
  await page.click('#startMic')
  await page.waitForFunction(() => window.__rhythm?.ctx?.state === 'running', null, { timeout: 10000 })
  await page.waitForTimeout(until * 1000)
  const out = await page.evaluate(() => {
    const r = window.__rhythm
    return {
      beats: r.R.beats.map(b => b.t), downbeats: r.R.beats.filter(b => b.down).map(b => b.t),
      bpm: r.R.bpm, meter: r.R.meter, load: r.R.load, contextTime: r.contextTime,
      demo: r.demo && { start: r.demo.start, hits: r.demo.hits, beats: r.demo.beats, seconds: r.demo.loop.seconds, ref: r.demo.loop.beats },
      bpmText: document.getElementById('bpm').textContent, feel: document.getElementById('feel').textContent,
      emitLag: r.R.emitLag.reduce((a, b) => a + b, 0) / Math.max(1, r.R.emitLag.length),
    }
  })
  await page.screenshot({ path: `/tmp/rhythm-${label}.png` })
  await browser.close()
  return { ...out, errs }
}

let failed = 0
const check = (ok, msg) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${msg}`); if (!ok) failed++ }

// 1. demo loop, scored by the page against the loop's own beats
{
  const r = await run('demo', `${BASE}040_rhythm.html?source=demo&style=shuffle&bpm=100`, [], SECONDS)
  const ref = []
  for (let k = 0; k < 40; k++) for (const b of r.demo.ref) ref.push(r.demo.start - r.contextTime + k * r.demo.seconds + b)
  const end = r.beats[r.beats.length - 1] + 0.1
  const s = scoreBeats(ref.filter(t => t <= end), r.beats, 6)
  console.log(`demo shuffle 100: ${r.beats.length} beats, page says "${r.bpmText}" "${r.feel}", F ${(100 * s.f).toFixed(1)}, CMLt ${(100 * s.cmlt).toFixed(1)}, load ${r.load.toFixed(1)} %, event lag ${(1000 * r.emitLag).toFixed(0)} ms`)
  check(!r.errs.length, `no page errors ${r.errs.join(' | ')}`)
  check(Math.abs(r.bpm - 100) < 1.5, `tempo ${r.bpm.toFixed(1)} ≈ 100`)
  check(s.f > 0.9, `beat F ${(100 * s.f).toFixed(1)} > 90`)
}

// 2. fake microphone with a corpus song through the microphone model
{
  const song = (await corpus('all')).find(s => s.name === SONG)
  const x = await audioFor(song, 'mic')
  const file = `/tmp/rhythm-${SONG}-mic.wav`
  fs.writeFileSync(file, wav16(x, 44100))
  const r = await run('mic', `${BASE}040_rhythm.html`, ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-audio-capture=${file}`], SECONDS)
  // the fake device starts the file when capture starts; find the offset that best aligns the reference (the song loops)
  let best = { f: -1 }
  for (let off = -1; off <= Math.min(song.seconds, 40); off += 0.005) {
    const ref = []; for (let k = 0; k < 4; k++) for (const b of song.beats) ref.push(off + k * song.seconds + b)
    const e = r.beats.filter(t => t > 6), end = r.beats[r.beats.length - 1] + 0.1
    const s = scoreBeats(ref.filter(t => t > 6 && t <= end), e, 0)
    if (s.f > best.f) best = { ...s, off }
  }
  if (process.env.DEBUG) console.log('beats', r.beats.slice(0, 30).map(t => t.toFixed(3)).join(' '))
  console.log(`fake mic ${SONG}: ${r.beats.length} beats, page says "${r.bpmText}" "${r.feel}", F ${(100 * best.f).toFixed(1)} (file offset ${best.off.toFixed(3)} s), CMLt ${(100 * best.cmlt).toFixed(1)}, load ${r.load.toFixed(1)} %`)
  check(!r.errs.length, `no page errors ${r.errs.join(' | ')}`)
  check(best.f > 0.9, `beat F ${(100 * best.f).toFixed(1)} > 90`)
  check(Math.abs(r.bpm - song.bpm[0]) < 2, `tempo ${r.bpm.toFixed(1)} ≈ ${song.bpm[0]}`)
}
process.exit(failed ? 1 : 0)
