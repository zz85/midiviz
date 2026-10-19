// Loudness of #034's six engines, for LEVEL_TRIM in strings/sound/engines.js.
// Renders a test performance on every engine through the page (Export WAV's
// render, at the engine's playing level, before the hall) and prints the
// K-weighted loudness (ITU-R BS.1770, LUFS) of the whole and of each part:
// scales of quarter-second notes and long notes at velocity 0.3 / 0.6 / 0.9,
// double stops, low (G string) and high (D6–G6) notes at 0.6. With song
// arguments it measures their first 45 s of sound instead.
//
//   node strings/test/loudness.mjs [engines=waveguide,source,...] [song.mid …]
//
// Needs the repo's parent folder served over http (BASE, default
// http://127.0.0.1:8000/midiviz/), playwright-core (PLAYWRIGHT, default
// /tmp/pw/node_modules/playwright-core/index.mjs; `npm i playwright-core` in
// any folder) and a Chromium (CHROME, default playwright's chromium-1134).
// DDSP renders slowly on CPU (a minute or more per 45 s).

const BASE = process.env.BASE || 'http://127.0.0.1:8000/midiviz/'
const PW = process.env.PLAYWRIGHT || '/tmp/pw/node_modules/playwright-core/index.mjs'
const CHROME = process.env.CHROME || `${process.env.HOME}/.cache/ms-playwright/chromium-1134/chrome-linux/chrome`
const { chromium } = await import(PW)
const args = process.argv.slice(2)
const engines = (args.find(a => a.startsWith('engines='))?.slice(8) || 'waveguide,source,ddsp,vsco,gm,hybrid').split(',')
const songs = args.filter(a => !a.startsWith('engines='))

const b = await chromium.launch({ executablePath: CHROME, args: ['--autoplay-policy=no-user-gesture-required'] })
const p = await b.newPage()
const errs = []; p.on('pageerror', e => errs.push(e.message))

// runs in the page
async function measure({ engines, test, clip }) {
  const { lab, loadPiece } = window.__lab
  const kLoudness = (chans, sr) => {
    const biq = (x, [b0, b1, b2, a1, a2]) => { const y = new Float32Array(x.length); let x1 = 0, x2 = 0, y1 = 0, y2 = 0; for (let i = 0; i < x.length; i++) { const v = b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2; x2 = x1; x1 = x[i]; y2 = y1; y1 = v; y[i] = v } return y }
    let K = Math.tan(Math.PI * 1681.974450955533 / sr), Q = 0.7071752369554196, Vh = Math.pow(10, 3.999843853973347 / 20), Vb = Math.pow(Vh, 0.4996667741545416), a0 = 1 + K / Q + K * K
    const s1 = [(Vh + Vb * K / Q + K * K) / a0, 2 * (K * K - Vh) / a0, (Vh - Vb * K / Q + K * K) / a0, 2 * (K * K - 1) / a0, (1 - K / Q + K * K) / a0]
    K = Math.tan(Math.PI * 38.13547087602444 / sr); Q = 0.5003270373238773; a0 = 1 + K / Q + K * K
    const s2 = [1, -2, 1, 2 * (K * K - 1) / a0, (1 - K / Q + K * K) / a0]
    const ys = chans.map(x => biq(biq(x, s1), s2)), B = Math.round(0.4 * sr), H = Math.round(0.1 * sr), z = []
    for (let s = 0; s + B <= ys[0].length; s += H) { let e = 0; for (const y of ys) for (let i = s; i < s + B; i++) e += y[i] * y[i]; z.push(e / B) }
    const L = e => -0.691 + 10 * Math.log10(e)
    let g = z.filter(e => L(e) > -70); if (!g.length) return -Infinity
    const m = g.reduce((a, b) => a + b, 0) / g.length
    g = g.filter(e => L(e) > L(m) - 10)
    return L(g.reduce((a, b) => a + b, 0) / g.length)
  }
  const segs = []
  if (test) {
    const raw = []; let t = 0.5
    const scale = [67, 69, 71, 72, 74, 76, 78, 79, 81, 79, 78, 76, 74, 72, 71, 69]
    for (const [kind, v] of [['run', 0.3], ['run', 0.6], ['run', 0.9], ['long', 0.3], ['long', 0.6], ['long', 0.9], ['dbl', 0.6], ['low', 0.6], ['high', 0.6]]) {
      if (kind === 'run') for (let k = 0; k < 16; k++) raw.push({ pitch: scale[k], on: t + k * 0.25, off: t + (k + 1) * 0.25, velocity: v })
      if (kind === 'long') for (let k = 0; k < 3; k++) raw.push({ pitch: [69, 74, 76][k], on: t + k * 1.33, off: t + (k + 1) * 1.33, velocity: v })
      if (kind === 'dbl') for (let k = 0; k < 3; k++) for (const pitch of [[62, 69], [64, 71], [66, 74]][k]) raw.push({ pitch, on: t + k * 1.33, off: t + (k + 1) * 1.33, velocity: v })
      if (kind === 'low') for (let k = 0; k < 4; k++) raw.push({ pitch: [55, 57, 59, 60][k], on: t + k, off: t + k + 1, velocity: v })
      if (kind === 'high') for (let k = 0; k < 4; k++) raw.push({ pitch: [86, 88, 90, 91][k], on: t + k, off: t + k + 1, velocity: v })
      segs.push([`${kind} ${v}`, t, t + 4]); t += 5
    }
    loadPiece(raw, { title: 'loudness test', fit: false })
  }
  const out = {}
  for (const e of engines) {
    let res = null
    for (let tries = 0; tries < 3 && !res; tries++) {
      try {
        await lab.use(e); lab.engine(e).invalidate(); lab.engine(e).prepare(lab.perf)
        res = await Promise.race([lab.exportWav(), new Promise(r => setTimeout(() => r(null), 400000))])
      } catch (err) { out[e] = { error: err.message } }
    }
    if (!res) { out[e] ??= { error: 'no render' }; continue }
    const { chans, sr } = res, row = {}
    if (test) {
      row.all = kLoudness(chans, sr)
      for (const [name, a, z] of segs) row[name] = kLoudness(chans.map(c => c.subarray(Math.round(a * sr), Math.round(z * sr))), sr)
    } else {
      let a = 0; while (a < chans[0].length && Math.abs(chans[0][a]) < 1e-4) a++
      row.first45 = kLoudness(chans.map(c => c.subarray(a, a + Math.round(clip * sr))), sr)
    }
    out[e] = row
  }
  return out
}

const print = (title, r) => {
  const names = Object.keys(Object.values(r).find(x => !x.error) ?? {})
  console.log([title.padEnd(12), ...names.map(n => n.padStart(9))].join(''))
  for (const [e, row] of Object.entries(r)) console.log(row.error ? `${e.padEnd(12)}${row.error}` : [e.padEnd(12), ...names.map(n => row[n].toFixed(1).padStart(9))].join(''))
}
if (!songs.length) {
  await p.goto(BASE + '034_violin_sound.html', { waitUntil: 'load' })
  await p.waitForFunction(() => window.__lab?.loadPiece, null, { timeout: 30000 })
  print('LUFS', await p.evaluate(measure, { engines, test: true }))
} else for (const song of songs) {
  await p.goto(BASE + '034_violin_sound.html?song=' + song, { waitUntil: 'load' })
  await p.waitForFunction(() => window.__lab?.state?.perf, null, { timeout: 30000 })
  print(song.split('/').pop(), await p.evaluate(measure, { engines, test: false, clip: 45 }))
}
if (errs.length) console.log('page errors', errs.slice(0, 3))
await b.close()
