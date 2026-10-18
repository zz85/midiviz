// Build the sample bank for #034's hybrid sampler (strings/sound/hybrid.js)
// from the University of Iowa Musical Instrument Samples (2012 violin, arco,
// pp / mf / ff, recorded string by string; "may be downloaded and used for
// any projects, without restrictions", https://theremin.music.uiowa.edu/MIS.html).
//
//   node strings/test/build_iowa.js [--instrument=violin] [--kbps=96] [--no-download]
//
// Needs ffmpeg (with libopus) on the PATH. Steps:
//   1. download the chromatic-scale AIFFs (center mic, mono) to strings/data/iowa/<instrument>/
//      (git-ignored);
//   2. cut each scale into notes at the silences, pitch-track every note and
//      name it by its measured pitch;
//   3. measure what the engine needs: onset, end of the attack, start of the
//      release, sustain RMS, a pitch track (cents around the note at 100 Hz,
//      so the engine can take the player's vibrato out) and a pitch-synchronous
//      loop in the steady part;
//   4. write one Ogg Opus file per string and dynamic (notes back to back,
//      48 kHz mono) and manifest.json to strings/sound/samples/iowa/<instrument>/.
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { parseNote } from '../fingering.js'

const here = fileURLToPath(new URL('.', import.meta.url))
const arg = (k, d) => { const a = process.argv.find(x => x.startsWith(`--${k}=`)); return a ? a.split('=')[1] : d }
const INSTRUMENT = arg('instrument', 'violin')
const KBPS = +arg('kbps', 64)
const HEAD = 3.2, TAIL_PRE = 0.12, TAIL = 0.7   // s
const SR = 48000
const SRC = here + `../data/iowa/${INSTRUMENT}/`
const OUT = here + `../sound/samples/iowa/${INSTRUMENT}/`
const PAGE = { violin: 'MISviolin2012.html', viola: 'MISviola2012.html', cello: 'MIScello2012.html' }[INSTRUMENT]
const BASE = 'https://theremin.music.uiowa.edu/'
const STRINGS = { violin: ['G', 'D', 'A', 'E'], viola: ['C', 'G', 'D', 'A'], cello: ['C', 'G', 'D', 'A'] }[INSTRUMENT]
const OPEN = { violin: [55, 62, 69, 76], viola: [48, 55, 62, 69], cello: [36, 43, 50, 57] }[INSTRUMENT]
const DYNS = ['pp', 'mf', 'ff']

// ── 1. download ──
mkdirSync(SRC, { recursive: true }); mkdirSync(OUT, { recursive: true })
if (!process.argv.includes('--no-download')) {
  const html = execFileSync('curl', ['-sfL', BASE + PAGE], { encoding: 'latin1', maxBuffer: 1 << 26 })
  const links = [...new Set([...html.matchAll(/href="([^"]*\.arco\.[^"]*\.mono\.aif)"/g)].map(m => m[1]))]
  console.log(`${links.length} arco scale files on ${PAGE}`)
  for (const l of links) {
    const name = l.split('/').pop().replace(/\s+/g, '')
    if (existsSync(SRC + name) && statSync(SRC + name).size > 1000) continue
    const url = BASE + l.split('/').map(encodeURIComponent).join('/')
    try { execFileSync('curl', ['-sf', '-o', SRC + name, url]); console.log('  got', name) } catch (e) { console.warn('  missing', name) }
  }
}

// ── helpers ──
// rate: the true sample rate when a file's header is wrong (see below)
const decode = (f, rate = 0) => {
  const af = (rate ? `asetrate=${rate},aresample=${SR},` : '') + 'highpass=f=60:poles=2'
  const buf = execFileSync('ffmpeg', ['-v', 'error', '-i', f, '-ac', '1', '-ar', String(SR), '-af', af, '-f', 'f32le', '-'], { maxBuffer: 1 << 30 })
  return new Float32Array(buf.buffer, buf.byteOffset, buf.length / 4).slice()
}
const median = a => { const s = Float64Array.from(a).sort(); return s.length ? s[s.length >> 1] : NaN }

/** RMS envelope at hop H. */
function envelope(x, H = 240) {
  const n = Math.floor(x.length / H), e = new Float32Array(n)
  for (let k = 0; k < n; k++) { let s = 0; for (let i = k * H; i < (k + 1) * H; i++) s += x[i] * x[i]; e[k] = Math.sqrt(s / H) }
  return e
}

/** Normalised autocorrelation pitch near f (±range semitones), parabolic refinement. */
function pitchNear(x, i0, N, f, range = 1.5) {
  const lo = Math.floor(SR / (f * 2 ** (range / 12))), hi = Math.ceil(SR / (f / 2 ** (range / 12)))
  if (i0 + N + hi + 2 > x.length) return null
  let best = -1, bl = lo
  const r = new Float64Array(hi + 2)
  let e0 = 0; for (let i = 0; i < N; i++) e0 += x[i0 + i] ** 2
  for (let l = lo - 1; l <= hi + 1; l++) {
    let s = 0, e1 = 0
    for (let i = 0; i < N; i++) { const a = x[i0 + i], b = x[i0 + i + l]; s += a * b; e1 += b * b }
    r[l] = s / Math.sqrt(e0 * e1 + 1e-20)
  }
  for (let l = lo; l <= hi; l++) if (r[l] > best) { best = r[l]; bl = l }
  const a = r[bl - 1], b = r[bl], c = r[bl + 1], d = (a - 2 * b + c) ? 0.5 * (a - c) / (a - 2 * b + c) : 0
  return { f0: SR / (bl + d), clarity: b }
}

/** Coarse pitch over a wide range (for naming): autocorrelation, first strong peak. */
function pitchWide(x, i0, N, fmin = 150, fmax = 3600) {
  const lo = Math.floor(SR / fmax), hi = Math.ceil(SR / fmin)
  const r = new Float64Array(hi + 2)
  let e0 = 0; for (let i = 0; i < N; i++) e0 += x[i0 + i] ** 2
  for (let l = lo; l <= hi + 1; l++) {
    let s = 0, e1 = 0
    for (let i = 0; i < N; i++) { const a = x[i0 + i], b = x[i0 + i + l]; s += a * b; e1 += b * b }
    r[l] = s / Math.sqrt(e0 * e1 + 1e-20)
  }
  let max = 0; for (let l = lo; l <= hi; l++) max = Math.max(max, r[l])
  for (let l = lo + 1; l <= hi; l++) if (r[l] >= 0.9 * max && r[l] >= r[l - 1] && r[l] >= r[l + 1]) return SR / l
  return NaN
}

// ── 2–3. cut and measure ──
const H = 960                                     // 20 ms envelope hop
const notes = []                                  // { string, dyn, midi, x, ... }
// names: Violin.arco.pp.sulG.G3B3.mono.aif, Viola.arco.sulC.pp.C3B3.mono.aif
const parseName = f => {
  const m = f.match(/\.arco\.(?:(pp|mf|ff)\.sul([A-G])|sul([A-G])\.(pp|mf|ff))\.([A-Gb#0-9]+)\.mono\.aif$/)
  return m && [m[1] || m[4], m[2] || m[3], m[5]]
}
const files = readdirSync(SRC).filter(parseName).sort()
for (const f of files) {
  const [dyn, sname, range] = parseName(f)
  const s = STRINGS.indexOf(sname)
  const m = range.match(/^([A-G]b?\d)([A-G]b?\d)?$/)
  const toMidi = nm => parseNote(nm.replace(/^([A-G])b/, '$1b'))
  const lo = toMidi(m[1]), hi = m[2] ? toMidi(m[2]) : lo
  let x = decode(SRC + f)
  // Some files (the 2012 viola) hold 96 kHz audio under a 44.1 kHz header, so
  // they sound 13.5 semitones low and 2.18 times too slow: test the loudest
  // stretch against the file's range and re-read at 96 kHz if needed
  {
    const e = envelope(x, 4800)
    let k = 0; for (let j = 1; j < e.length; j++) if (e[j] > e[k]) k = j
    const fw = pitchWide(x, Math.max(0, k * 4800 - 2048), 4096, 0.4 * 440 * 2 ** ((OPEN[0] - 69) / 12))
    const mi = 69 + 12 * Math.log2(fw / 440), up = 12 * Math.log2(96000 / 44100)
    if (isFinite(mi) && mi < lo - 3 && mi + up > lo - 1.5 && mi + up < hi + 1.5) { console.log(`  ${f}: 96 kHz under a 44.1 kHz header, re-read`); x = decode(SRC + f, 96000) }
  }
  // the scales are edited with digital silence between notes: split at runs of
  // (near) zeros of 20 ms or more
  const segs = []
  {
    let start = -1, zeros = 0
    for (let i = 0; i < x.length; i++) {
      if (Math.abs(x[i]) < 2e-5) { zeros++; if (zeros === 960 && start >= 0) { segs.push([start, i - zeros]); start = -1 } }
      else { if (start < 0) start = i; zeros = 0 }
    }
    if (start >= 0) segs.push([start, x.length])
  }
  // some instruments (the viola) were edited without digital silence: split
  // at the noise floor instead (50 ms frames, half-way in dB between the floor
  // and the loudest frame, gaps of at least 250 ms)
  if (segs.filter(([a, b]) => b - a > 0.4 * SR).length < 0.7 * (hi - lo + 1)) {
    segs.length = 0
    const F = 2400, e = envelope(x, F), db = [...e].map(v => 20 * Math.log10(v + 1e-9))
    const sorted = [...db].sort((a, b) => a - b)
    const thr = (sorted[Math.floor(sorted.length * 0.1)] + sorted[sorted.length - 1]) / 2
    let start = -1, below = 0
    for (let k = 0; k < db.length; k++) {
      if (db[k] > thr) { if (start < 0) start = k; below = 0 }
      else if (start >= 0 && ++below >= 5) { segs.push([Math.max(0, start - 4) * F, (k - below + 3) * F]); start = -1 }
    }
    if (start >= 0) segs.push([Math.max(0, start - 4) * F, x.length])
  }
  let got = 0
  const cand = []
  for (const [i0, i1] of segs) {
    if (i1 - i0 < 0.4 * SR) continue
    // the bowed part: 50 ms frames within 12 dB of the loudest
    const e = envelope(x.subarray(i0, i1), 2400)
    const pk = Math.max(...e)
    let kb = 0; while (e[kb] < pk / 4) kb++
    let ke = e.length - 1; while (ke > kb && e[ke] < pk / 4) ke--
    if ((ke - kb) * 0.05 < 0.25) continue
    const mid = i0 + Math.round((kb + ke) / 2 * 2400)
    cand.push({ i0, i1, fw: pitchWide(x, mid - 2048, 4096, 0.8 * 440 * 2 ** ((OPEN[0] - 69) / 12)) })
  }
  // the files are chromatic scales: with one segment per note, the order names them
  const byOrder = cand.length === hi - lo + 1
  // a file whose notes all read the same few semitones off its name (the
  // viola's sulC.mf.C4C5 holds Bb3–Bb4) is renamed by its readings
  let shift = 0
  if (byOrder) {
    const d = cand.map(({ fw }, j) => isFinite(fw) ? Math.round(69 + 12 * Math.log2(fw / 440)) - (lo + j) : NaN).filter(v => isFinite(v) && Math.abs(v) <= 3)
    const mode = [-3, -2, -1, 1, 2, 3].map(v => [v, d.filter(x => x === v).length]).sort((a, b) => b[1] - a[1])[0]
    if (mode[1] >= 0.6 * cand.length) { shift = mode[0]; console.log(`  ${f}: notes read ${shift} semitones from the name, renamed`) }
  }
  cand.forEach(({ i0, i1, fw }, j) => {
    let midi = isFinite(fw) ? Math.round(69 + 12 * Math.log2(fw / 440)) : NaN
    if (byOrder) {
      if (isFinite(midi) && ((midi - (lo + j)) % 12 + 12) % 12 !== 0 && Math.abs(midi - lo - j) !== 7 && Math.abs(midi - lo - j) !== 19) console.warn(`  ${f}: note ${j} reads ${midi}, scale says ${lo + j}`)
      midi = lo + j + shift
    } else if (midi < lo || midi > hi) for (const d of [-12, 12, -24, 19, -19, 7, -7]) if (midi + d >= lo && midi + d <= hi) { midi += d; break }
    if (!(midi >= lo + shift && midi <= hi + shift) || midi < OPEN[s]) { console.warn(`  ${f}: segment at ${(i0 / SR).toFixed(2)} s reads ${midi}, outside ${lo}–${hi}`); return }
    notes.push({ string: s, dyn, midi, src: f, x: x.subarray(Math.max(0, i0 - 240), i1) })
    got++
  })
  console.log(`${f}: ${got} notes (expected ${hi - lo + 1})${byOrder ? '' : ' by pitch'}`)
}

// keep one note per (string, dyn, midi): the longest
const key = n => `${n.string}_${n.dyn}_${n.midi}`
const byKey = new Map()
for (const n of notes) if (!byKey.has(key(n)) || byKey.get(key(n)).x.length < n.x.length) byKey.set(key(n), n)

function analyse(n) {
  const x = n.x, f = 440 * 2 ** ((n.midi - 69) / 12)
  const e = envelope(x, H)
  const peak = Math.max(...e)
  // onset: first frame above 3 % of the peak
  let k = 0; while (k < e.length && e[k] < peak * 0.03) k++
  const onset = Math.max(0, k * H - 120)
  // the bowed part: frames within 12 dB of the peak
  let kb = k; while (kb < e.length && e[kb] < peak / 4) kb++
  let ke = e.length - 1; while (ke > kb && e[ke] < peak / 4) ke--
  const sus = median(e.subarray(kb, ke + 1))
  // attack end: first frame at 80 % of the bowed median (at least 60 ms in)
  let ka = k; while (ka < ke && e[ka] < 0.8 * sus) ka++
  const attackEnd = Math.min(ke * H, Math.max(ka * H, onset + Math.round(0.06 * SR)))
  // release: the bow leaves where the level falls below half the bowed median for good
  let kr = ke; while (kr > ka && e[kr] < 0.5 * sus) kr--
  const release = Math.max(attackEnd + Math.round(0.08 * SR), (kr + 1) * H)
  // pitch track, 10 ms hop, 2048-sample windows, from the onset to just after the release
  const N = 2048, hop = 480
  const track = []
  for (let i = onset; i + N + 1200 < x.length && i < release + 0.3 * SR; i += hop) {
    const p = pitchNear(x, i, N, f, 1.2)
    track.push(p && p.clarity > 0.8 ? p.f0 : NaN)
  }
  const steadyFrom = Math.ceil((attackEnd - onset) / hop), steadyTo = Math.floor((release - onset) / hop)
  const steady = track.slice(steadyFrom, steadyTo).filter(isFinite)
  const fm = steady.length ? median(steady) : f
  let cents = track.map(v => isFinite(v) ? 1200 * Math.log2(v / fm) : NaN)
  // fill gaps by holding, drop outliers (> 60 cents off: tracker slips)
  let last = 0
  cents = cents.map((c, i) => (isFinite(c) && (Math.abs(c) < 60 || i < steadyFrom) ? (last = c) : last))
  cents = cents.map((c, i) => median([cents[i - 1] ?? c, c, cents[i + 1] ?? c]))
  const sc = cents.slice(steadyFrom, steadyTo)
  const mean = sc.reduce((a, b) => a + b, 0) / Math.max(1, sc.length)
  const vib = Math.sqrt(sc.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(1, sc.length))
  // sustain RMS over the part that is kept (the head), which the engine levels by
  const rEnd = Math.min(release, onset + Math.round(HEAD * SR))
  let ss = 0; for (let i = attackEnd; i < rEnd; i++) ss += x[i] * x[i]
  const rms = Math.sqrt(ss / Math.max(1, rEnd - attackEnd))
  // loop: the pair of points in the steady part whose surroundings match best (pitch-synchronous)
  const period = SR / fm
  const L0 = Math.round(attackEnd + 0.05 * SR), L1 = Math.round(Math.min(release, onset + HEAD * SR) - 0.04 * SR)
  let loop = null
  if (L1 - L0 > 0.2 * SR) {
    const W = Math.round(Math.max(3 * period, 0.012 * SR))
    const corr = (a, b) => {
      let s = 0, ea = 0, eb = 0
      for (let i = -W; i < W; i++) { const u = x[a + i], v = x[b + i]; s += u * v; ea += u * u; eb += v * v }
      return s / Math.sqrt(ea * eb + 1e-20)
    }
    let best = -2
    const q = Math.max(1, Math.round(period / 4))
    const minLen = Math.min(0.6 * SR, 0.6 * (L1 - L0))
    for (let a = L0; a < L1 - minLen; a += Math.round(0.02 * SR)) {
      for (let b = L1; b > a + minLen && b > L1 - 0.3 * SR; b -= q) {
        const c = corr(a, b) + 0.03 * (b - a) / SR     // prefer long loops a little
        if (c > best) { best = c; loop = [a, b] }
      }
    }
    if (loop) {
      const [a, b0] = loop
      let bc = corr(a, b0)
      for (let d = -q; d <= q; d++) { const c = corr(a, b0 + d); if (c > bc) { bc = c; loop = [a, b0 + d] } }
      loop.push(bc)
    }
  }
  return { f0: fm, onset, attackEnd, release, rms, vib, cents, loop }
}

// ── 4. pack ──
// Per note: the head (start → the release, at most HEAD s after the onset)
// then the tail (from TAIL_PRE before the release, TAIL s of the bow leaving
// and the string ringing), so a long sample costs no more than a short one.
const manifest = { instrument: INSTRUMENT, source: 'University of Iowa Musical Instrument Samples (2012, arco, non-vibrato), ' + BASE + PAGE, license: 'Free to use for any project without restrictions (Lawrence Fritts, University of Iowa Electronic Music Studios, https://theremin.music.uiowa.edu/MIS.html)', sampleRate: SR, strings: STRINGS, open: OPEN, dynamics: DYNS, packs: {} }
const report = []
for (let s = 0; s < STRINGS.length; s++) for (const dyn of DYNS) {
  const list = [...byKey.values()].filter(n => n.string === s && n.dyn === dyn).sort((a, b) => a.midi - b.midi)
  if (!list.length) continue
  const gap = Math.round(0.05 * SR)
  const parts = [], meta = []
  let off = 0
  for (const n of list) {
    const A = analyse(n)
    // a recording without at least 0.25 s of steady bowing is not usable
    if (Math.min(A.release, A.onset + HEAD * SR) - A.attackEnd < 0.25 * SR || !(A.rms > 1e-5)) { console.warn(`  ${STRINGS[s]} ${dyn} ${n.midi}: no steady part, dropped`); continue }
    const headEnd = Math.min(A.release, A.onset + Math.round(HEAD * SR))
    const t0 = Math.max(0, A.release - Math.round(TAIL_PRE * SR)), t1 = Math.min(n.x.length, A.release + Math.round(TAIL * SR))
    const head = n.x.subarray(0, headEnd), tail = Float32Array.from(n.x.subarray(t0, t1))
    for (let i = 0; i < 2400 && i < tail.length; i++) tail[tail.length - 1 - i] *= i / 2400
    const y = new Float32Array(head.length + tail.length)
    y.set(head); y.set(tail, head.length)
    parts.push(y, new Float32Array(gap))
    const cents = A.cents.slice(0, Math.ceil((headEnd - A.onset) / 480) + 1)
    // the tail's pitch: the track around the release
    const tc = A.cents.slice(Math.max(0, Math.floor((t0 - A.onset) / 480)))
    meta.push({
      midi: n.midi, offset: off, length: y.length, f0: +A.f0.toFixed(3), onset: A.onset, attackEnd: A.attackEnd, headEnd,
      tail: head.length, tailCents: +(tc.length ? median(tc.slice(0, 10)) : 0).toFixed(1),
      rms: +A.rms.toExponential(4), vibrato: +A.vib.toFixed(1),
      loop: A.loop ? [A.loop[0], A.loop[1], +A.loop[2].toFixed(3)] : null,
      cents: cents.map(c => Math.round(c * 10) / 10),
    })
    report.push(`${STRINGS[s]} ${dyn} ${n.midi} ${(1200 * Math.log2(A.f0 / (440 * 2 ** ((n.midi - 69) / 12)))).toFixed(0)}c ±${A.vib.toFixed(1)}c bowed ${((A.release - A.onset) / SR).toFixed(2)}s attack ${((A.attackEnd - A.onset) / SR).toFixed(2)}s loop ${A.loop ? ((A.loop[1] - A.loop[0]) / SR).toFixed(2) + 's r=' + A.loop[2].toFixed(3) : '-'}`)
    off += y.length + gap
  }
  const pcm = new Float32Array(off)
  let o = 0; for (const p of parts) { pcm.set(p, o); o += p.length }
  const name = `${STRINGS[s]}_${dyn}.ogg`
  const raw = `/tmp/iowa_${INSTRUMENT}_${name}.f32`
  writeFileSync(raw, Buffer.from(pcm.buffer))
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'f32le', '-ar', String(SR), '-ac', '1', '-i', raw, '-c:a', 'libopus', '-b:a', `${KBPS}k`, '-application', 'audio', OUT + name])
  manifest.packs[`${s}_${dyn}`] = { file: name, samples: off, notes: meta }
  console.log(`${name}: ${list.length} notes, ${(off / SR).toFixed(1)} s, ${(statSync(OUT + name).size / 1024).toFixed(0)} KB`)
}
writeFileSync(OUT + 'manifest.json', JSON.stringify(manifest))
writeFileSync(SRC + 'report.txt', report.join('\n') + '\n')
console.log(`manifest: ${Object.keys(manifest.packs).length} packs; report in ${SRC}report.txt`)
