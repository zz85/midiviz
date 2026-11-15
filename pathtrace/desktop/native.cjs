// #045 desktop app: the native renderers, run for the page (pathtrace/native-engines.js through preload.cjs).
// The page encodes the frame (native-scene.js); this writes it to a temporary folder, runs the renderer on it
// as a child process (no shell, nothing listening) and returns the PNG and the renderer's own timings.
//   mu-native  pathtrace/native/target/release/mu-trace             (cd pathtrace/native && ./build.sh)
//   rt-native  pathtrace/native/threert-src/…/threert-render       (cd pathtrace/native && ./threert.sh <export dir>)
//              with native/threert/midiviz-ir.ts, bundled here on first use (needs Node 24 or later as `node`)
// Both stay up for the app's life and take frame after frame (mu-trace --serve, threert-render serve).
// MIDIVIZ_NATIVE_BACKEND=software traces with the renderers' own BVH instead of ray queries;
// MIDIVIZ_NATIVE_KEEP=1 keeps each frame's folder (scene.json, scene.bin) and prints where;
// MIDIVIZ_NATIVE_LOG=1 prints a line a frame (mu-native: how MuTracer committed it).
'use strict'
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { spawn, spawnSync } = require('node:child_process')

const NATIVE = path.resolve(__dirname, '..', 'native')
const THREERT = path.join(NATIVE, 'threert-src')
const exe = process.platform === 'win32' ? '.exe' : ''
const BIN = {
  'mu-native': path.join(NATIVE, 'target', 'release', 'mu-trace' + exe),
  'rt-native': path.join(THREERT, 'renderer', 'target', 'release', 'threert-render' + exe),
}
const HOW = { 'mu-native': 'cd pathtrace/native && ./build.sh', 'rt-native': 'cd pathtrace/native && ./threert.sh <export dir>' }
const software = process.env.MIDIVIZ_NATIVE_BACKEND === 'software'
const running = new Map()

// mu-native: one `mu-trace --serve` for the app's life, a frame at a time. It keeps its engine, so a cold
// start (about 0.5 s: device, pipelines, full scene preparation) is paid once, and MuTracer commits each
// frame against the last (incremental when only vertices, transforms, lights or the camera moved). It ends
// when the app does (end of its stdin), and a new one starts if it dies.
let server = null
function muServer() {
  if (server) return server
  const child = spawn(BIN['mu-native'], ['--serve'], { stdio: ['pipe', 'pipe', 'pipe'] })
  const s = server = { child, waiting: [], buffer: '', err: '' }
  running.set('mu-native', child)
  child.stdout.setEncoding('utf8')
  child.stdout.on('data', chunk => {
    s.buffer += chunk
    for (let i; (i = s.buffer.indexOf('\n')) >= 0;) {
      const line = s.buffer.slice(0, i); s.buffer = s.buffer.slice(i + 1)
      if (line.trim()) s.waiting.shift()?.resolve(JSON.parse(line))
    }
  })
  child.stderr.on('data', b => { s.err = (s.err + b).slice(-4000) })
  const gone = why => {
    if (server === s) server = null
    running.delete('mu-native')
    for (const w of s.waiting.splice(0)) w.reject(new Error(`mu-trace ${why}: ${s.err.trim().split('\n').slice(-3).join(' | ')}`))
  }
  child.on('error', e => gone(e.message))
  child.on('close', (code, signal) => gone(signal ? 'stopped by ' + signal : 'exited ' + code))
  return s
}
function muFrame(s, request) {
  return new Promise((resolve, reject) => { s.waiting.push({ resolve, reject }); s.child.stdin.write(JSON.stringify(request) + '\n') })
}
/** what a frame changes against its run's first, as mu-trace reads it: delta.json (refs into delta.bin) + delta.bin */
function writeDelta(dir, c, display) {
  const parts = [], geo = {}
  let at = 0
  const put = b => { const r = { o: at, n: b.length / 4 }; parts.push(b); at += b.length; return r }
  for (const [i, g] of Object.entries(c.geo)) geo[i] = Object.fromEntries(Object.entries(g).map(([k, b]) => [k, put(b)]))
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, 'delta.json'), JSON.stringify({ geo, mesh: c.mesh, camera: c.camera, lights: c.lights, display }))
  fs.writeFileSync(path.join(dir, 'delta.bin'), Buffer.concat(parts))
  return at
}

// ── recording: a page export's frames, for a native render later (native/render-seq.mjs) ──
// run.mjs --record writes, instead of tracing:
//   sequence.json                what was recorded (song, size, fps, frames) and the export's timeline.mp4 (its audio)
//   frames.jsonl                 a line a frame: { frame, run, delta? }
//   runs/<n>/scene.json, .bin    a run's first frame in full (native-scene.js)
//   frames/<frame>/delta.*       what a frame after it changes against that first frame (mu-trace's delta format)
let rec = null
function startRecording(dir, info) {
  fs.mkdirSync(dir, { recursive: true })
  rec = { dir, info, frames: 0, runs: 0, base: null, bytes: 0, lines: fs.openSync(path.join(dir, 'frames.jsonl'), 'w'), started: Date.now() }
}
function recordFrame(manifest, buffer) {
  const m = JSON.parse(manifest), bin = Buffer.from(buffer), frame = rec.frames++
  let line
  if (rec.base && sameStructure(rec.base.m, rec.base.bin, m, bin)) {
    const rel = path.join('frames', String(frame).padStart(6, '0'))
    rec.bytes += writeDelta(path.join(rec.dir, rel), changes(rec.base.m, rec.base.bin, m, bin), m.display)
    line = { frame, run: rec.base.run, delta: rel }
  } else {
    const run = path.join('runs', String(rec.runs++).padStart(3, '0')), d = path.join(rec.dir, run)
    fs.mkdirSync(d, { recursive: true })
    fs.writeFileSync(path.join(d, 'scene.json'), manifest)
    fs.writeFileSync(path.join(d, 'scene.bin'), bin)
    rec.bytes += bin.length
    rec.base = { m, bin, run }
    line = { frame, run }
  }
  fs.writeSync(rec.lines, JSON.stringify(line) + '\n')
  return line
}
function finishRecording(extra) {
  if (!rec) return null
  fs.closeSync(rec.lines)
  const seq = { format: 'midiviz-native-sequence', version: 1, ...rec.info, frames: rec.frames, runs: rec.runs, megabytes: +(rec.bytes / 1e6).toFixed(1),
    recordedSeconds: Math.round((Date.now() - rec.started) / 1000), ...extra }
  fs.writeFileSync(path.join(rec.dir, 'sequence.json'), JSON.stringify(seq, null, 1))
  rec = null
  return seq
}

// A run, as for rt-native below: its first frame goes to mu-trace in full, the frames after it as what moved
// against that first frame (delta.json + delta.bin, under 1 MB), which mu-trace puts on the Scene it kept
// instead of writing, reading and building 60 MB a frame.
async function muNative(dir, manifest, buffer, o) {
  const s = muServer()
  const m = JSON.parse(manifest), bin = Buffer.from(buffer), out = path.join(dir, 'out.rgba')
  const request = { out, spp: o.samples, bounces: o.bounces, width: o.width, height: o.height, denoise: !!o.denoise, backend: software ? 'software' : 'hardware', raw: true }
  if (s.base && sameStructure(s.base.m, s.base.bin, m, bin)) {
    writeDelta(dir, changes(s.base.m, s.base.bin, m, bin), m.display)
    request.delta = dir
  } else {
    fs.writeFileSync(path.join(dir, 'scene.json'), manifest)
    fs.writeFileSync(path.join(dir, 'scene.bin'), bin)
    request.dir = dir
    s.base = { m, bin }
  }
  const r = await muFrame(s, request)
  // (a failed frame ends mu-trace's run too: the next frame starts a new one)
  if (r.error) { s.base = null; throw new Error('mu-trace: ' + r.error) }
  const T = r.timings_ms
  return { rgba: fs.readFileSync(out), width: r.width, height: r.height, report: { engine: 'mu-native', adapter: r.adapter, hwrt: r.hwrt, samples: r.samples, leftOut: r.left_out,
    commit: r.commit, warm: r.warm, run: r.run, firstBatch: r.first_batch, timings: { scene: T.scene, setup: T.setup, firstSample: null, trace: T.trace, encode: T.encode } } }
}

// ThreeRT's scripts can't read files, so the frame goes in front of the bundled script as two globals
let bundled = null
function threertBundle() {
  const src = path.join(NATIVE, 'threert', 'midiviz-ir.ts'), bundle = path.join(THREERT, 'out', 'bundles', 'midiviz-ir.js')
  if (bundled && fs.existsSync(bundle) && fs.statSync(bundle).mtimeMs >= fs.statSync(src).mtimeMs) return bundled
  if (!fs.existsSync(path.join(THREERT, 'node_modules'))) throw new Error(`rt-native: ThreeRT is not set up (${HOW['rt-native']})`)
  fs.copyFileSync(src, path.join(THREERT, 'scenes', 'midiviz-ir.ts'))
  const r = spawnSync('node', ['-e', "import('./tools/bundle-game.ts').then(m => m.bundleGame('scenes/midiviz-ir.ts', 'out/bundles/midiviz-ir.js'))"], { cwd: THREERT, encoding: 'utf8' })
  if (r.status !== 0) throw new Error('rt-native: bundling midiviz-ir.ts failed (needs Node 24 or later as `node`): ' + (r.stderr || r.error?.message || '').trim().slice(-400))
  bundled = fs.readFileSync(bundle)
  return bundled
}
function writeBundle(file, manifest, bin) {
  const fd = fs.openSync(file, 'w')
  fs.writeSync(fd, 'globalThis.__MIDIVIZ_SCENE = '); fs.writeSync(fd, manifest); fs.writeSync(fd, ';\nglobalThis.__MIDIVIZ_BIN = "')
  for (let i = 0, step = 3 << 20; i < bin.length; i += step) fs.writeSync(fd, bin.subarray(i, i + step).toString('base64'))
  fs.writeSync(fd, '";\n'); fs.writeSync(fd, threertBundle()); fs.closeSync(fd)
}

// A sequence for ThreeRT: what a frame changes against the first frame of its run. Between two frames of the
// Prelude, 9 of 774 geometries move (0.6 MB of positions and normals of 60 MB) and 32 transforms (the keys).
// Anything else that differs (counts, indices, UVs, materials, textures) starts a new run instead.
const span = (bin, r, size) => bin.subarray(r.o, r.o + r.n * size)
const sameJson = (a, b) => JSON.stringify(a) === JSON.stringify(b)
function sameStructure(a, A, b, B) {
  if (['geometries', 'meshes', 'materials', 'textures', 'lights'].some(k => a[k].length !== b[k].length)) return false
  if (!sameJson(a.materials, b.materials) || !sameJson(a.materialDefaults, b.materialDefaults)) return false
  for (let i = 0; i < a.textures.length; i++) {
    const x = a.textures[i], y = b.textures[i], size = x.storage === 'rgba32f' ? 4 : 1
    if (!sameJson({ ...x, data: 0 }, { ...y, data: 0 }) || !span(A, x.data, size).equals(span(B, y.data, size))) return false
  }
  for (let i = 0; i < a.geometries.length; i++) {
    const x = a.geometries[i], y = b.geometries[i]
    if (x.position.n !== y.position.n || !!x.normal !== !!y.normal) return false
    for (const k of ['indices', 'uv', 'uv1', 'color', 'materialIndex']) if (!!x[k] !== !!y[k] || (x[k] && !span(A, x[k], 4).equals(span(B, y[k], 4)))) return false
  }
  return a.meshes.every((m, i) => m.geometry === b.meshes[i].geometry && sameJson(m.materials, b.meshes[i].materials)) && a.lights.every((l, i) => l.type === b.lights[i].type)
}
/** { geo: { [geometry]: { p, n?, t? } } (positions, normals, tangents: Buffers), mesh: { [mesh]: transform }, camera, lights } */
function changes(a, A, b, B) {
  const geo = {}, mesh = {}
  b.geometries.forEach((y, i) => {
    const x = a.geometries[i], p = span(B, y.position, 4), n = y.normal && span(B, y.normal, 4), t = y.tangent && x.tangent && span(B, y.tangent, 4)
    const moved = !p.equals(span(A, x.position, 4)) || (n && !n.equals(span(A, x.normal, 4))) || (t && !t.equals(span(A, x.tangent, 4)))
    if (moved) geo[i] = { p, ...(n ? { n } : {}), ...(t ? { t } : {}) }
  })
  b.meshes.forEach((m, i) => { if (!sameJson(m.transform, a.meshes[i].transform)) mesh[i] = m.transform })
  return { geo, mesh, camera: b.camera, lights: b.lights }
}

// rt-native: `threert-render serve` for the app's life (its device and pipelines kept). A run's first frame becomes
// a bundle with that frame inline, whose setup builds the scene; the frames after it go as the game's state, what
// moved only, and its frame script applies them (threert/midiviz-ir.ts). ThreeRT's offline renderer still prepares
// its GPU scene for each frame; the script, the setup and the process start are what is saved.
let rt = null
function rtServer() {
  if (rt) return rt
  const child = spawn(BIN['rt-native'], ['serve'], { env: { ...process.env, THREERT_HWRT: software ? '0' : '1' }, stdio: ['pipe', 'pipe', 'pipe'] })
  const s = rt = { child, waiting: [], out: '', err: '', said: [], base: null, bases: 0, seq: 0, dir: fs.mkdtempSync(path.join(os.tmpdir(), 'midiviz-threert-')) }
  s.ready = new Promise((resolve, reject) => { s.onReady = resolve; s.onFail = reject })
  running.set('rt-native', child)
  child.stdout.setEncoding('utf8')
  child.stdout.on('data', chunk => {
    s.out += chunk
    for (let i; (i = s.out.indexOf('\n')) >= 0;) {
      const line = s.out.slice(0, i); s.out = s.out.slice(i + 1)
      if (!line.startsWith('{')) continue
      const v = JSON.parse(line)
      if (v.ready) s.onReady(v); else s.waiting.shift()?.resolve(v)
    }
  })
  child.stderr.setEncoding('utf8')
  child.stderr.on('data', b => {
    s.err = (s.err + b).slice(-4000)
    for (const l of b.split('\n')) if (l.includes('midiviz left out:')) s.said = l.split('midiviz left out:')[1].trim().split('; ')
  })
  const gone = why => {
    if (rt === s) rt = null
    running.delete('rt-native')
    const e = new Error(`threert-render serve ${why}: ${s.err.trim().split('\n').slice(-3).join(' | ')}`)
    s.onFail(e)
    for (const w of s.waiting.splice(0)) w.reject(e)
    fs.rmSync(s.dir, { recursive: true, force: true })
  }
  child.on('error', e => gone(e.message))
  child.on('close', (code, signal) => gone(signal ? 'stopped by ' + signal : 'exited ' + code))
  return s
}

async function rtNative(dir, manifest, buffer, o) {
  // (ThreeRT keeps 8 runtimes, then drops them all; a new server bounds what old runs hold)
  if (rt && rt.bases >= 6) { rt.child.stdin.end(); rt = null }
  const s = rtServer()
  await s.ready
  const m = JSON.parse(manifest), bin = Buffer.from(buffer)
  let state = null, run = 'continues'
  if (!s.base || !sameStructure(s.base.m, s.base.bin, m, bin)) {
    if (s.base) fs.rmSync(s.base.file, { force: true })
    const file = path.join(s.dir, `run-${++s.bases}.js`)
    writeBundle(file, manifest, bin)
    s.base = { file, m, bin, frames: 0 }
    s.said = []
    run = 'starts'
  } else {
    const c = changes(s.base.m, s.base.bin, m, bin), b64 = g => ({ p: g.p.toString('base64'), ...(g.n ? { n: g.n.toString('base64') } : {}) })
    state = { geo: Object.fromEntries(Object.entries(c.geo).map(([i, g]) => [i, b64(g)])), mesh: c.mesh, camera: c.camera, lights: c.lights, exposure: m.display.exposure }
  }
  // (raw RGBA8, top row first: threert/raw-output.patch; a 4K PNG took the page a third of a second to decode)
  const out = path.join(dir, 'out.rgba'), id = ++s.seq
  const job = { id, game: s.base.file, assets: s.dir, room: 'midiviz', seed: 0, seq: id, state, out, spp: o.samples, width: o.width, height: o.height,
    denoise: !!o.denoise, overrides: { native: { maxBounces: o.bounces } } }
  const send = j => new Promise((resolve, reject) => { s.waiting.push({ resolve, reject }); s.child.stdin.write(JSON.stringify(j) + '\n') })
  let v = await send(job)
  // A frame script has 50 ms (ThreeRT's FRAME_MS); applying a frame takes about 5, but a stall of the machine (a
  // garbage collection at 4K) can push it over, and ThreeRT stops it as "interrupted". The state says the whole
  // frame against the run's first, so it is sent again; failing twice, the frame starts a new run.
  if (!v.ok && /interrupted/.test(v.error) && state) v = await send({ ...job, id: ++s.seq, seq: s.seq })
  if (!v.ok && /interrupted/.test(v.error) && state) {
    fs.rmSync(s.base.file, { force: true })
    const file = path.join(s.dir, `run-${++s.bases}.js`)
    writeBundle(file, manifest, bin)
    s.base = { file, m, bin, frames: 0 }
    run = 'starts again'
    v = await send({ ...job, id: ++s.seq, seq: s.seq, game: file, state: null })
  }
  if (!v.ok) throw new Error('threert-render: ' + v.error)
  s.base.frames++
  const r = v.stats, T = r.timings_ms, n = k => T[k] || 0
  return { rgba: fs.readFileSync(out), width: o.width, height: o.height, report: { engine: 'rt-native', adapter: r.adapter, hwrt: r.hwrt, samples: r.spp, leftOut: s.said,
    run, moved: state ? { geometries: Object.keys(state.geo).length, transforms: Object.keys(state.mesh).length } : null,
    timings: { scene: n('load_ms') + n('script_ms') + n('bvh_ms') + n('accel_build_ms') + n('texture_pages_ms') + n('upload_ms') + n('sky_ms'), setup: n('gpu_init_ms'),
      firstSample: null, trace: n('trace_ms'), ...(o.denoise ? { denoise: n('denoise_ms') } : {}), encode: n('post_ms') + n('readback_ms') + n('encode_ms') } } }
}

function install(ipcMain) {
  const fromApp = e => String(e.senderFrame?.url || '').startsWith('midiviz://app/')
  ipcMain.handle('native:engines', () => Object.fromEntries(Object.entries(BIN).map(([k, b]) => [k, fs.existsSync(b)])))
  ipcMain.handle('native:cancel', (e, key) => { if (fromApp(e)) running.get(key)?.kill() })
  ipcMain.handle('native:record', (e, manifest, buffer) => {
    if (!fromApp(e)) throw new Error('native renderers answer the app\'s own page only')
    if (!rec) throw new Error('not recording: the record engine runs under run.mjs --record')
    return recordFrame(manifest, buffer)
  })
  ipcMain.handle('native:render', async (e, key, manifest, buffer, o) => {
    if (!fromApp(e)) throw new Error('native renderers answer the app\'s own page only')
    if (!BIN[key]) throw new Error('unknown native renderer ' + key)
    if (!fs.existsSync(BIN[key])) throw new Error(`${key} is not built: ${HOW[key]}`)
    const t0 = Date.now()
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'midiviz-native-'))
    try {
      // (a run's first frame goes in full, the frames after it as what moved: muNative and rtNative write what they need)
      if (process.env.MIDIVIZ_NATIVE_KEEP) {
        fs.writeFileSync(path.join(dir, 'scene.json'), manifest)
        fs.writeFileSync(path.join(dir, 'scene.bin'), Buffer.from(buffer))
      }
      const files = Date.now() - t0
      const r = key === 'mu-native' ? await muNative(dir, manifest, buffer, o) : await rtNative(dir, manifest, buffer, o)
      r.report.timings.files = files
      r.report.wall = Date.now() - t0
      if (process.env.MIDIVIZ_NATIVE_LOG) {
        const R = r.report, T = R.timings
        const how = (R.run === 'starts' ? 'run starts, ' : R.moved ? `${R.moved.geometries} geometries and ${R.moved.transforms} transforms moved, ` : R.run ? 'run continues, ' : '') +
          (R.commit ? `${R.commit} commit${R.warm ? '' : ' (cold engine)'}, ` : '')
        console.log(`  ${key}: ${how}scene ${Math.round(T.scene)} ms, trace ${Math.round(T.trace)} ms, out ${Math.round(T.encode)} ms, ${R.wall} ms in the app`)
      }
      if (process.env.MIDIVIZ_NATIVE_KEEP) { r.report.dir = dir; console.log(`  ${key}: kept ${dir}`) }
      return r
    } finally { if (!process.env.MIDIVIZ_NATIVE_KEEP) fs.rmSync(dir, { recursive: true, force: true }) }
  })
}

module.exports = { install, BIN, HOW, sameStructure, changes, startRecording, finishRecording, muServer, muFrame, rtServer, writeBundle }
