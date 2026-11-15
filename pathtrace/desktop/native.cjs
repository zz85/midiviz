// #045 desktop app: the native renderers, run for the page (pathtrace/native-engines.js through preload.cjs).
// The page encodes the frame (native-scene.js); this writes it to a temporary folder, runs the renderer on it
// as a child process (no shell, nothing listening) and returns the PNG and the renderer's own timings.
//   mu-native  pathtrace/native/target/release/mu-trace             (cd pathtrace/native && ./build.sh)
//   rt-native  pathtrace/native/threert-src/…/threert-render       (cd pathtrace/native && ./threert.sh <export dir>)
//              with native/threert/midiviz-ir.ts, bundled here on first use (needs Node 24 or later as `node`)
// MIDIVIZ_NATIVE_BACKEND=software traces with the renderers' own BVH instead of ray queries;
// MIDIVIZ_NATIVE_KEEP=1 keeps each frame's folder (scene.json, scene.bin) and prints where.
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

function run(key, bin, args, env = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, { env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'pipe'] })
    running.set(key, child)
    let out = '', err = ''
    child.stdout.on('data', b => { out += b })
    child.stderr.on('data', b => { err += b })
    child.on('error', reject)
    child.on('close', (code, signal) => {
      running.delete(key)
      if (code === 0) resolve({ out, err })
      else reject(new Error(`${path.basename(bin)} ${signal ? 'stopped by ' + signal : 'exited ' + code}: ${(err || out).trim().split('\n').slice(-3).join(' | ')}`))
    })
  })
}
const lastJson = text => JSON.parse(text.trim().split('\n').filter(l => l.startsWith('{')).pop() || '{}')

async function muNative(dir, o) {
  const out = path.join(dir, 'out.png')
  const args = [dir, out, '--spp', o.samples, '--bounces', o.bounces, '--size', `${o.width}x${o.height}`, ...(o.denoise ? ['--denoise'] : []), ...(software ? ['--backend', 'software'] : [])]
  const r = lastJson((await run('mu-native', BIN['mu-native'], args.map(String))).out)
  const T = r.timings_ms
  return { png: fs.readFileSync(out), report: { engine: 'mu-native', adapter: r.adapter, hwrt: r.hwrt, samples: r.samples, leftOut: r.left_out,
    timings: { scene: T.scene, setup: T.setup, firstSample: T.first_sample, trace: T.trace, encode: T.encode } } }
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
async function rtNative(dir, manifest, buffer, o) {
  const script = path.join(dir, 'midiviz.js'), out = path.join(dir, 'out.png')
  const fd = fs.openSync(script, 'w')
  fs.writeSync(fd, 'globalThis.__MIDIVIZ_SCENE = '); fs.writeSync(fd, manifest); fs.writeSync(fd, ';\nglobalThis.__MIDIVIZ_BIN = "')
  const bytes = Buffer.from(buffer), step = 3 << 20
  for (let i = 0; i < bytes.length; i += step) fs.writeSync(fd, bytes.subarray(i, i + step).toString('base64'))
  fs.writeSync(fd, '";\n'); fs.writeSync(fd, threertBundle()); fs.closeSync(fd)
  const args = ['render', script, '--assets', dir, '-o', out, '--spp', o.samples, '--width', o.width, '--height', o.height,
    '--override', JSON.stringify({ native: { maxBounces: o.bounces } }), ...(o.denoise ? [] : ['--no-denoise'])]
  const { out: stdout, err } = await run('rt-native', BIN['rt-native'], args.map(String), { THREERT_HWRT: software ? '0' : '1' })
  const r = lastJson(stdout), T = r.timings_ms, n = k => T[k] || 0
  const said = (stdout + err).split('\n').find(l => l.includes('midiviz left out:'))
  return { png: fs.readFileSync(out), report: { engine: 'rt-native', adapter: r.adapter, hwrt: r.hwrt, samples: r.spp, leftOut: said ? said.split('midiviz left out:')[1].trim().split('; ') : [],
    timings: { scene: n('load_ms') + n('script_ms') + n('bvh_ms') + n('accel_build_ms') + n('texture_pages_ms') + n('upload_ms') + n('sky_ms'), setup: n('gpu_init_ms'),
      firstSample: null, trace: n('trace_ms'), ...(o.denoise ? { denoise: n('denoise_ms') } : {}), encode: n('post_ms') + n('readback_ms') + n('encode_ms') } } }
}

function install(ipcMain) {
  const fromApp = e => String(e.senderFrame?.url || '').startsWith('midiviz://app/')
  ipcMain.handle('native:engines', () => Object.fromEntries(Object.entries(BIN).map(([k, b]) => [k, fs.existsSync(b)])))
  ipcMain.handle('native:cancel', (e, key) => { if (fromApp(e)) running.get(key)?.kill() })
  ipcMain.handle('native:render', async (e, key, manifest, buffer, o) => {
    if (!fromApp(e)) throw new Error('native renderers answer the app\'s own page only')
    if (!BIN[key]) throw new Error('unknown native renderer ' + key)
    if (!fs.existsSync(BIN[key])) throw new Error(`${key} is not built: ${HOW[key]}`)
    const t0 = Date.now()
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'midiviz-native-'))
    try {
      fs.writeFileSync(path.join(dir, 'scene.json'), manifest)
      fs.writeFileSync(path.join(dir, 'scene.bin'), Buffer.from(buffer))
      const files = Date.now() - t0
      const r = key === 'mu-native' ? await muNative(dir, o) : await rtNative(dir, manifest, buffer, o)
      r.report.timings.files = files
      r.report.wall = Date.now() - t0
      if (process.env.MIDIVIZ_NATIVE_KEEP) { r.report.dir = dir; console.log(`  ${key}: kept ${dir}`) }
      return r
    } finally { if (!process.env.MIDIVIZ_NATIVE_KEEP) fs.rmSync(dir, { recursive: true, force: true }) }
  })
}

module.exports = { install, BIN }
