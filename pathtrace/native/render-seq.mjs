#!/usr/bin/env node
// Experiment #045: renders a recorded sequence (desktop: run.mjs --record) with a native renderer, no browser:
// the frames go straight to ffmpeg, as an MP4 with the recording's audio, and, if asked, as linear EXR frames
// for a grade of your own.
//   node pathtrace/native/render-seq.mjs <sequence dir> [--engine=mu|rt] [--spp=4] [--bounces=10] [--size=WxH]
//        [--from=0] [--to=last] [--out=file] [--codec=h264|hevc|prores] [--crf=16] [--hdr=dir] [--denoise]
//        [--backend=software]
//   mu  native MuTracer (mu-trace --serve): the page's own picture, its AgX
//   rt  ThreeRT (threert-render serve): faster, its own look (no environment map, its tone curve)
// --out  default <sequence dir>/<engine>_<spp>spp.mp4 (.mov for prores); --codec h264 is libx264 at --crf,
//        hevc and prores are VideoToolbox; the MP4 is AgX in sRGB (BT.709 primaries), with timeline.mp4's audio
// --hdr  a folder for half-float EXRs, one a frame (000123.exr): the linear radiance times each frame's exposure
//        (the director's fades included), before any tone curve
// --from / --to render a range (frames are numbered from 0, as in frames.jsonl), to resume or split a render.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'

const args = process.argv.slice(2)
const opt = Object.fromEntries(args.filter(a => a.startsWith('--')).map(a => { const [k, ...v] = a.slice(2).split('='); return [k, v.length ? v.join('=') : '1'] }))
const seqDir = path.resolve(args.find(a => !a.startsWith('--')) || '')
if (!fs.existsSync(path.join(seqDir, 'sequence.json'))) { console.error('usage: render-seq.mjs <sequence dir> (run.mjs --record writes one)'); process.exit(2) }
if (opt.backend === 'software') process.env.MIDIVIZ_NATIVE_BACKEND = 'software'
const N = createRequire(import.meta.url)('../desktop/native.cjs')

const seq = JSON.parse(fs.readFileSync(path.join(seqDir, 'sequence.json'), 'utf8'))
const frames = fs.readFileSync(path.join(seqDir, 'frames.jsonl'), 'utf8').trim().split('\n').map(l => JSON.parse(l))
const engine = opt.engine === 'rt' ? 'rt' : 'mu', key = engine + '-native'
const spp = +(opt.spp || 4), bounces = +(opt.bounces || 10), denoise = opt.denoise === '1'
const [W, H] = (opt.size || seq.res).split('x').map(Number)
const [rw, rh] = seq.res.split('x').map(Number)
if (Math.abs(W / H - rw / rh) > 1e-3) console.warn(`--size ${W}x${H} is not the recording's aspect (${seq.res}): the camera keeps its own`)
const from = Math.max(0, +(opt.from || 0)), to = Math.min(frames.length - 1, opt.to != null ? +opt.to : frames.length - 1)
const codec = opt.codec || 'h264'
const out = path.resolve(opt.out || path.join(seqDir, `${engine}_${spp}spp${from || to < frames.length - 1 ? `_${from}-${to}` : ''}.${codec === 'prores' ? 'mov' : 'mp4'}`))
const hdrDir = opt.hdr && path.resolve(opt.hdr)
if (!fs.existsSync(N.BIN[key])) { console.error(`${key} is not built: ${N.HOW[key]}`); process.exit(2) }
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'midiviz-seq-'))

// ── ffmpeg: the MP4 from raw frames (and the recording's audio); the EXRs from planar floats ──
const ffmpeg = (argv, name) => {
  const p = spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...argv], { stdio: ['pipe', 'inherit', 'pipe'] })
  // (raw video from a pipe: ffmpeg 8 says "Truncating packet … to 65536" once while it probes; the frames are whole)
  p.stderr.on('data', b => { const t = String(b).split('\n').filter(l => l && !/^Truncating packet/.test(l)).join('\n'); if (t) process.stderr.write(t + '\n') })
  p.done = new Promise((resolve, reject) => p.on('close', c => c === 0 ? resolve() : reject(new Error(`ffmpeg (${name}) exited ${c}`))))
  p.on('error', e => { console.error(`ffmpeg: ${e.message} (is it installed?)`); process.exit(2) })
  return p
}
// (the frames are sRGB, AgX's output: BT.709 primaries and matrix, the sRGB curve, TV range, as the page's own export tags them)
const yuv = ['-vf', 'scale=out_color_matrix=bt709:out_range=tv,setparams=color_primaries=bt709:color_trc=iec61966-2-1:colorspace=bt709']
const codecs = {
  h264: ['-c:v', 'libx264', '-preset', 'medium', '-crf', String(opt.crf || 16), '-pix_fmt', 'yuv420p', ...yuv, '-movflags', '+faststart'],
  hevc: ['-c:v', 'hevc_videotoolbox', '-q:v', '75', '-tag:v', 'hvc1', '-pix_fmt', 'yuv420p', ...yuv, '-movflags', '+faststart'],
  prores: ['-c:v', 'prores_videotoolbox', '-profile:v', '3', '-pix_fmt', 'yuv422p10le', ...yuv],
}
if (!codecs[codec]) { console.error('--codec: h264, hevc or prores'); process.exit(2) }
const timeline = seq.audio && seq.timeline && path.join(seqDir, seq.timeline)
const audio = timeline && fs.existsSync(timeline) ? [...(from ? ['-ss', String(from / seq.fps)] : []), '-i', timeline] : []
const video = ffmpeg(['-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${W}x${H}`, '-r', String(seq.fps), '-i', '-', ...audio,
  '-map', '0:v', ...(audio.length ? ['-map', '1:a?', '-c:a', 'copy', '-shortest'] : []), ...codecs[codec], out], 'video')
let exr = null
if (hdrDir) {
  fs.mkdirSync(hdrDir, { recursive: true })
  exr = ffmpeg(['-f', 'rawvideo', '-pix_fmt', engine === 'mu' ? 'gbrapf32le' : 'gbrpf32le', '-s', `${W}x${H}`, '-r', String(seq.fps), '-i', '-',
    '-c:v', 'exr', '-format', '1', '-compression', '3', '-start_number', String(from), path.join(hdrDir, '%06d.exr')], 'exr')
}
const write = (p, buf) => new Promise((resolve, reject) => p.stdin.write(buf, e => e ? reject(e) : resolve()))

// ── the renderers: a frame at a time, the sequence's runs and deltas as they are ──
const common = { spp, bounces, width: W, height: H, denoise }
async function muRender(f, outFile, hdrFile, state) {
  const s = N.muServer()
  if (state.run !== f.run) {
    // (a range that starts after a run's first frame: mu-trace takes that run in without rendering it)
    if (f.delta) { const r = await N.muFrame(s, { load: path.join(seqDir, f.run) }); if (r.error) throw new Error(r.error) }
    state.run = f.run
  }
  const r = await N.muFrame(s, { ...common, ...(f.delta ? { delta: path.join(seqDir, f.delta) } : { dir: path.join(seqDir, f.run) }),
    out: outFile, raw: true, backend: opt.backend === 'software' ? 'software' : 'hardware', ...(hdrFile ? { hdr: hdrFile } : {}) })
  if (r.error) throw new Error('mu-trace: ' + r.error)
  return { trace: r.timings_ms.trace, commit: r.commit }
}
const bundles = new Map()
async function rtRender(f, outFile, hdrFile, state) {
  const s = N.rtServer()
  await s.ready
  if (!bundles.has(f.run)) {
    const d = path.join(seqDir, f.run), file = path.join(s.dir, `seq-${path.basename(f.run)}.js`)
    N.writeBundle(file, fs.readFileSync(path.join(d, 'scene.json'), 'utf8'), fs.readFileSync(path.join(d, 'scene.bin')))
    bundles.set(f.run, file)
  }
  let st = null, exposure
  if (f.delta) {
    const d = JSON.parse(fs.readFileSync(path.join(seqDir, f.delta, 'delta.json'), 'utf8')), bin = fs.readFileSync(path.join(seqDir, f.delta, 'delta.bin'))
    const b64 = r => bin.subarray(r.o, r.o + r.n * 4).toString('base64')
    st = { geo: Object.fromEntries(Object.entries(d.geo).map(([i, g]) => [i, { p: b64(g.p), ...(g.n ? { n: b64(g.n) } : {}) }])), mesh: d.mesh, camera: d.camera, lights: d.lights, exposure: d.display.exposure }
    exposure = d.display.exposure
  } else exposure = (state.exposure ??= {})[f.run] ??= JSON.parse(fs.readFileSync(path.join(seqDir, f.run, 'scene.json'), 'utf8')).display.exposure
  const job = { game: bundles.get(f.run), assets: s.dir, room: 'midiviz', seed: 0, state: st, out: outFile, ...common, overrides: { native: { maxBounces: bounces } }, ...(hdrFile ? { hdr: hdrFile } : {}) }
  const send = () => { const id = ++s.seq; return new Promise((resolve, reject) => { s.waiting.push({ resolve, reject }); s.child.stdin.write(JSON.stringify({ ...job, id, seq: id }) + '\n') }) }
  let v = await send()
  // (a frame script has 50 ms; a stall can push applying a frame over it: the frame is sent once more)
  if (!v.ok && /interrupted/.test(v.error)) v = await send()
  if (!v.ok) throw new Error('threert-render: ' + v.error)
  return { trace: v.stats.timings_ms.trace_ms, exposure }
}
// ThreeRT's HDR is interleaved RGB radiance: planar G, B, R for the EXR, times the frame's exposure
function rtPlanes(raw, exposure) {
  const f = new Float32Array(raw.buffer, raw.byteOffset, raw.byteLength / 4), n = f.length / 3, p = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) { p[i] = f[i * 3 + 1] * exposure; p[n + i] = f[i * 3 + 2] * exposure; p[2 * n + i] = f[i * 3] * exposure }
  return Buffer.from(p.buffer)
}

console.log(`${seqDir}: ${seq.song}, ${frames.length} frames at ${seq.fps} fps (${seq.runs} run${seq.runs > 1 ? 's' : ''}) · ${key} · ${W}×${H} · ${spp} spp · ${bounces} bounces${denoise ? ' · denoised' : ''}` +
  ` · frames ${from}–${to} → ${out}${hdrDir ? ` and EXRs in ${hdrDir}` : ''}`)
const t0 = Date.now(), state = {}, traces = []
let pending = Promise.resolve()
try {
  for (let i = from; i <= to; i++) {
    const f = frames[i], ab = i % 2 ? 'b' : 'a', outFile = path.join(tmp, `${ab}.rgba`), hdrFile = hdrDir ? path.join(tmp, `${ab}.f32`) : null
    const r = await (engine === 'mu' ? muRender : rtRender)(f, outFile, hdrFile, state)
    traces.push(r.trace)
    // (read now, encode while the next frame traces)
    const rgba = fs.readFileSync(outFile), hdr = hdrFile && fs.readFileSync(hdrFile)
    if (rgba.length !== W * H * 4) throw new Error(`frame ${i}: ${rgba.length} bytes, not ${W}x${H} RGBA`)
    await pending
    pending = Promise.all([write(video, rgba), exr && write(exr, engine === 'mu' ? hdr : rtPlanes(hdr, r.exposure))])
    const done = i - from + 1, left = to - i, per = (Date.now() - t0) / done / 1000
    if (done === 1 || done % 24 === 0 || left === 0)
      console.log(`  frame ${i} (${done}/${to - from + 1}) · trace ${(r.trace / 1000).toFixed(2)} s${r.commit ? `, ${r.commit} commit` : ''} · ${per.toFixed(2)} s a frame · ${Math.round(left * per)} s left`)
  }
  await pending
  video.stdin.end(); exr?.stdin.end()
  await Promise.all([video.done, exr?.done])
} finally {
  N.muServer && engine === 'mu' && N.muServer().child.stdin.end()
  if (engine === 'rt') N.rtServer().child.stdin.end()
  fs.rmSync(tmp, { recursive: true, force: true })
}
const secs = (Date.now() - t0) / 1000, mean = traces.reduce((a, b) => a + b, 0) / traces.length
console.log(`done: ${to - from + 1} frames in ${secs.toFixed(0)} s, ${(secs / (to - from + 1)).toFixed(2)} s a frame (trace ${(mean / 1000).toFixed(2)} s) → ${out} (${(fs.statSync(out).size / 1e6).toFixed(1)} MB)`)
