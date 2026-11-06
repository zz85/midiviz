// #045 Path-traced Pianist as a local Electron app.
//
// Start it with the launcher, which sets up the renderer before Chromium starts:
//   node pathtrace/desktop/run.mjs [--backend=llvmpipe|lavapipe|swiftshader|gpu] [--headless] [--query=view=shoulder&song=…]
//   node pathtrace/desktop/run.mjs --info                                   which WebGL / WebGPU devices the page gets
//   node pathtrace/desktop/run.mjs --still [song] [t] [view] [out dir]      the raster frame + each tracer, PNGs and JSON
//        --engines=gpt-webgpu,mu-webgl --spp=64 --bounces=4 --size=640x360 --denoise=1 --fx=0 --hair=0.5 --extra=&outfit=…
//        --timeout=20 (minutes per tracer; stops the run when one hangs)
//        Default engines: mu-webgl on a CPU backend (MuTracer's WebGL 2 tracer), all four on a GPU.
//   node pathtrace/desktop/run.mjs --video [song] [out dir]                a path-traced MP4 through the page's Render menu
//        --engine=mu-webgl --spp=4 --bounces=10 --res=3840x2160 --fps=12 --len=5 --denoise=0 --fx=0 --hair=0.5
//        --recycle=24 (frames per tracer session; 0 keeps one) --extra=&outfit=…
//   node pathtrace/desktop/run.mjs --export [song] [t] [view] [out dir]    the frozen frame for a native renderer: scene.glb,
//        scene.json (camera and lights, world space) and env.f32 (the environment map, RGBA float32) --hair=0.5
//   --monitor[=file.csv]  sample CPU and memory of the app's processes (run.mjs; on by default for --video)
//
// No GPU is needed. Chromium's WebGL goes through ANGLE, which can sit on any of three CPU drivers:
//   lavapipe     Mesa's Vulkan, via ANGLE's Vulkan backend           (default without a GPU when installed; see setup-lavapipe.sh)
//   llvmpipe     Mesa's OpenGL, via ANGLE's GL/EGL backend           (default without a GPU otherwise)
//   swiftshader  Google's Vulkan, bundled with Electron
//   gpu          no forcing: the machine's own GPU                   (default when /dev/dri/renderD* exists)
// WebGPU (Dawn) is always SwiftShader when there is no GPU: Chromium does not offer other CPU Vulkan
// drivers to WebGPU (tested: lavapipe is ignored whatever the flags).
//
// The repo is served to the page through a private midiviz:// protocol, so nothing listens on a port.
'use strict'
const fs = require('node:fs')
const path = require('node:path')
const { pathToFileURL } = require('node:url')

const ROOT = path.resolve(__dirname, '..', '..')
const argv = process.argv.slice(process.defaultApp ? 2 : 1)
const opt = {}, pos = []
for (const a of argv) {
  const m = /^--([\w-]+)(?:=(.*))?$/.exec(a)
  if (m) opt[m[1]] = m[2] ?? '1'
  else if (a !== '.' && !a.endsWith('main.cjs')) pos.push(a)
}

const backend = opt.backend || 'gpu'      // run.mjs always passes both
const headless = opt.headless === '1'

const { app, BrowserWindow, protocol, net } = require('electron')
const sw = (k, v) => app.commandLine.appendSwitch(k, v)
sw('enable-unsafe-webgpu'); sw('ignore-gpu-blocklist'); sw('enable-features', 'Vulkan')
if (backend !== 'gpu') {
  sw('use-gl', 'angle'); sw('enable-unsafe-swiftshader'); sw('use-webgpu-adapter', 'swiftshader')
  // lavapipe rides ANGLE's SwiftShader path: that path is ANGLE-on-Vulkan with a CPU device, and with
  // VK_DRIVER_FILES pointing at lavapipe the Vulkan loader hands it lavapipe instead. Dawn keeps its own SwiftShader.
  sw('use-angle', { llvmpipe: 'gl-egl', lavapipe: 'swiftshader', swiftshader: 'swiftshader' }[backend])
}
app.commandLine.appendSwitch('disable-renderer-backgrounding')
sw('autoplay-policy', 'no-user-gesture-required')
// A software driver can spend many minutes compiling one tracer's shaders; keep Chromium's GPU watchdog out of the way.
sw('disable-gpu-watchdog')

protocol.registerSchemesAsPrivileged([{ scheme: 'midiviz', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true, codeCache: true } }])

function serveRepo() {
  protocol.handle('midiviz', req => {
    const { pathname } = new URL(req.url)
    const file = path.resolve(ROOT, '.' + decodeURIComponent(pathname))
    if (file !== ROOT && !file.startsWith(ROOT + path.sep)) return new Response('forbidden', { status: 403 })
    return net.fetch(pathToFileURL(file).toString())
  })
}

const PAGE = 'midiviz://app/045_pathtracer.html'
const [W, H] = (opt.size || '640x360').split('x').map(Number)

function makeWindow({ show, width, height }) {
  return new BrowserWindow({
    show, width, height, useContentSize: true, title: 'Path-traced Pianist',
    webPreferences: { backgroundThrottling: false, contextIsolation: true, sandbox: true },
  })
}

async function info() {
  const w = makeWindow({ show: false, width: 320, height: 200 })
  await w.loadURL('midiviz://app/README.md')
  const r = await w.webContents.executeJavaScript(`(async () => {
    const c = document.createElement('canvas').getContext('webgl2'), e = c && c.getExtension('WEBGL_debug_renderer_info')
    const a = navigator.gpu && await navigator.gpu.requestAdapter()
    return { webgl: c ? c.getParameter(e ? e.UNMASKED_RENDERER_WEBGL : c.RENDERER) : null,
             webgpu: a ? [a.info.vendor, a.info.architecture, a.info.description].filter(Boolean).join(' / ') : null,
             encoders: typeof VideoEncoder === 'undefined' ? [] : (await Promise.all(['avc1.640034', 'vp09.00.51.08', 'av01.0.13M.08'].map(async codec =>
               (await VideoEncoder.isConfigSupported({ codec, width: 3840, height: 2160, bitrate: 4e7, framerate: 12 }).catch(() => ({}))).supported ? codec : null))).filter(Boolean) } })()`)
  console.log(`backend ${backend}${headless ? ' (headless)' : ''}\nWebGL   ${r.webgl}\nWebGPU  ${r.webgpu}\n4K video encoders: ${r.encoders.join(', ') || 'none'}`)
}

async function still() {
  const [song = 'Prelude1.mid', t = '20', view = 'shoulder', out = '/tmp/pt_stills'] = pos
  fs.mkdirSync(out, { recursive: true })
  const w = makeWindow({ show: false, width: W, height: H })
  const log = []
  w.webContents.on('console-message', e => { if (e.level === 'error') log.push('console: ' + String(e.message).slice(0, 300)) })
  w.webContents.on('render-process-gone', (_, d) => { console.error('renderer gone:', d.reason); process.exit(3) })
  const q = `shot&q=low&hairsim=0&clothsim=0&view=${view}&song=${song}&t=${t}${opt.extra || ''}`
  await w.loadURL(`${PAGE}?${q}`)
  const js = s => w.webContents.executeJavaScript(s, true)
  const t0 = Date.now()
  while (!(await js('!!(window.__shot && window.__pianist?.pt)'))) {
    if (Date.now() - t0 > 300000) throw new Error('page did not get ready in 5 min')
    await new Promise(r => setTimeout(r, 250))
  }
  await js('window.__shot()')
  const gpu = await js('(async () => !!(navigator.gpu && await navigator.gpu.requestAdapter()))()')
  // On a CPU backend the default is MuTracer's WebGL 2 tracer alone: on lavapipe it is right and fast
  // (1080p, 64 spp in ~20 s). mu-webgpu crashes SwiftShader's GPU process (exit 133) after 9-19 min.
  const defaults = backend === 'gpu' && gpu ? 'gpt-webgpu,gpt-webgl,mu-webgpu,mu-webgl' : backend === 'gpu' ? 'gpt-webgl,mu-webgl' : 'mu-webgl'
  const keys = (opt.engines || defaults).split(',')
  const s = { samples: +(opt.spp || 64), bounces: +(opt.bounces || 4), denoise: opt.denoise !== '0', fx: opt.fx === '1', hairFraction: +(opt.hair || 0.5), size: [W, H] }
  console.log(`backend ${backend} · WebGPU ${gpu} · ${W}×${H} · ${s.samples} spp · engines ${keys.join(' ')}`)
  const tag = `${song.replace(/\W+/g, '_')}_${t}_${view}`
  // progress: the page's own status line, at most every 10 s unless the stage changes
  let last = '', lastStage = '', lastAt = 0
  const timer = setInterval(async () => {
    const msg = await js("document.getElementById('ptStatus')?.textContent || ''").catch(() => '')
    const stage = msg.replace(/[\d.]+ \/ \d+ spp · [\d.]+ s$/, '')
    if (msg && msg !== last && (stage !== lastStage || Date.now() - lastAt > 10000)) {
      last = msg; lastStage = stage; lastAt = Date.now(); process.stdout.write(`  ${msg}\n`)
    }
  }, 1000)
  // One tracer per run(), so each PNG is written as soon as that tracer is done (the scene is re-baked
  // each time, which takes a fraction of a second against minutes of tracing).
  const report = []
  // A GPU process crash leaves the page waiting forever (Chromium starts a new GPU process, the tracer
  // never hears back), so a crash ends the current tracer with an error instead.
  let gpuGone = null, onGone = () => {}
  app.on('child-process-gone', (_, d) => { if (d.type === 'GPU') { gpuGone = `${d.reason}, exit ${d.exitCode}`; onGone() } })
  for (const [i, key] of keys.entries()) {
    const started = Date.now()
    const crashed = new Promise(r => { onGone = () => r([{ engine: key, info: `Failed: GPU process gone (${gpuGone})` }]) })
    let timedOut = false
    const limit = +(opt.timeout || 0) * 60000
    const late = new Promise(r => { if (limit) setTimeout(() => { timedOut = true; r([{ engine: key, info: `Failed: no result after ${opt.timeout} min (--timeout)` }]) }, limit).unref() })
    const res = await Promise.race([crashed, late, js(`window.__pianist.pt.run(${JSON.stringify([key])}, ${JSON.stringify(s)}, { headless: true })
      .then(r => (r || []).map(x => ({ engine: x.engine, info: x.info, png: x.canvas?.toDataURL('image/png'), plain: x.plainCanvas?.toDataURL('image/png') })))`)
      .catch(e => [{ engine: key, info: 'Failed: ' + e.message }])])
    if (!res.length) res.push({ engine: key, info: gpuGone ? `Failed: GPU process gone (${gpuGone})` : 'no result' })
    for (const r of res) {
      if (r.engine === 'raster' && i > 0) continue
      for (const [k, suffix] of [['png', ''], ['plain', '_plain']]) {
        // (not the raster frame: its WebGL canvas reads back blank headless)
        if (r[k] && r.engine !== 'raster') fs.writeFileSync(`${out}/${tag}_${r.engine}${suffix}.png`, Buffer.from(r[k].split(',')[1], 'base64'))
      }
      const wall = r.engine === 'raster' ? '' : ` [${((Date.now() - started) / 1000).toFixed(0)} s wall]`
      console.log(r.engine.padEnd(11), r.info + wall)
      report.push({ engine: r.engine, info: r.info })
    }
    if (gpuGone || timedOut) { console.log(`stopping: ${gpuGone ? 'the page cannot trace again after the GPU process is gone' : 'the tracer is still running in the page'}`); break }
  }
  clearInterval(timer)
  fs.writeFileSync(`${out}/${tag}.json`, JSON.stringify({ backend, song, t, view, W, H, gpu, settings: s, report, log }, null, 1))
  if (log.length) console.log(log.join('\n'))
  console.log('wrote', out)
}

async function exportScene() {
  const [song = 'Prelude1.mid', t = '20', view = 'shoulder', out = '/tmp/pt_export'] = pos
  fs.mkdirSync(out, { recursive: true })
  const w = makeWindow({ show: false, width: 1280, height: 720 })
  w.webContents.on('console-message', e => { if (e.level === 'error') console.log('console:', String(e.message).slice(0, 300)) })
  await w.loadURL(`${PAGE}?shot&q=low&hairsim=0&clothsim=0&view=${view}&song=${song}&t=${t}${opt.extra || ''}`)
  const js = s => w.webContents.executeJavaScript(s, true)
  const t0 = Date.now()
  while (!(await js('!!(window.__shot && window.__pianist?.pt)'))) {
    if (Date.now() - t0 > 300000) throw new Error('page did not get ready in 5 min')
    await new Promise(r => setTimeout(r, 250))
  }
  await js('window.__shot()')
  const [W, H] = (opt.size || '1280x720').split('x').map(Number)
  // The same freeze the tracers get (snapshot.js), written out with three's GLTFExporter.
  const r = await js(`(async () => {
    const THREE = await import('three')
    const { GLTFExporter } = await import('three/addons/exporters/GLTFExporter.js')
    const S = await import('midiviz://app/pathtrace/snapshot.js')
    const stage = window.__pianist.pt.stage
    const cam = S.snapshotCamera(stage.camera, ${W} / ${H})
    const env = stage.envScene ? S.bakeEnvironment(stage.envScene, { intensity: stage.envIntensity }) : null
    const snap = S.snapshotScene(stage.scene, { camera: cam, hair: stage.hair(), envMap: env, hairFraction: ${+(opt.hair || 0.5)} })
    const lights = []
    const meshes = new THREE.Scene()
    snap.scene.updateMatrixWorld(true)
    snap.scene.traverse(o => {
      if (o.isLight) {
        const p = new THREE.Vector3().setFromMatrixPosition(o.matrixWorld)
        const L = { kind: o.isSpotLight ? 'spot' : o.isPointLight ? 'point' : o.isDirectionalLight ? 'directional' : o.isRectAreaLight ? 'rect' : o.type,
          color: o.color.toArray(), intensity: o.intensity, position: p.toArray(), radius: o.userData.mutracerRadius ?? o.radius ?? 0 }
        if (o.target) { o.target.updateMatrixWorld(true); L.target = new THREE.Vector3().setFromMatrixPosition(o.target.matrixWorld).toArray() }
        if (o.isSpotLight) { L.angle = o.angle; L.penumbra = o.penumbra }
        if (o.isRectAreaLight) { L.width = o.width; L.height = o.height; L.matrix = o.matrixWorld.toArray() }
        lights.push(L)
      }
    })
    // only meshes go into the GLB (the exporter's own light export is KHR_lights_punctual, which the native import ignores)
    for (const m of [...snap.scene.children]) if (m.isMesh) meshes.add(m)
    const glb = await new GLTFExporter().parseAsync(meshes, { binary: true, onlyVisible: true, maxTextureSize: 4096 })
    const b64 = buf => { const u = new Uint8Array(buf); let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s) }
    let envOut = null
    if (env?.image?.data) {
      const d = env.image.data, n = env.image.width * env.image.height
      const f = new Float32Array(n * 4)
      for (let i = 0; i < n; i++) for (let c = 0; c < 4; c++) f[i * 4 + c] = c < (d.length / n) ? d[i * (d.length / n) + c] : 1
      envOut = { width: env.image.width, height: env.image.height, flipY: !!env.flipY, data: b64(f.buffer) }
    }
    return { glb: b64(glb), env: envOut, stats: snap.stats,
      camera: { fov: cam.fov, near: cam.near, far: cam.far, aspect: ${W} / ${H}, matrixWorld: cam.matrixWorld.toArray() },
      lights, exposure: stage.exposure(), environmentIntensity: stage.envIntensity ?? 1, size: [${W}, ${H}] }
  })()`)
  fs.writeFileSync(path.join(out, 'scene.glb'), Buffer.from(r.glb, 'base64'))
  if (r.env) fs.writeFileSync(path.join(out, 'env.f32'), Buffer.from(r.env.data, 'base64'))
  const meta = { song, t, view, ...r, glb: 'scene.glb', env: r.env ? { file: 'env.f32', width: r.env.width, height: r.env.height, flipY: r.env.flipY } : null }
  fs.writeFileSync(path.join(out, 'scene.json'), JSON.stringify(meta, null, 1))
  console.log(`wrote ${out}: scene.glb ${(fs.statSync(path.join(out, 'scene.glb')).size / 1e6).toFixed(1)} MB, ${r.lights.length} lights, ${r.stats.triangles} triangles in ${r.stats.meshes} meshes`)
}

async function video() {
  const [song = 'Prelude1.mid', out = '/tmp/pt_video'] = pos
  fs.mkdirSync(out, { recursive: true })
  const o = {
    engine: opt.engine || (backend === 'gpu' ? 'mu-webgpu' : 'mu-webgl'), spp: opt.spp || '4', bounces: opt.bounces || '10',
    res: opt.res || '3840x2160', fps: opt.fps || '12', len: opt.len || '5', denoise: opt.denoise === '1', fx: opt.fx === '1', hair: opt.hair || '0.5',
  }
  const w = makeWindow({ show: false, width: 960, height: 540 })
  w.webContents.on('render-process-gone', (_, d) => { console.error('renderer gone:', d.reason); process.exit(3) })
  w.webContents.on('console-message', e => {
    const m = String(e.message)
    if (m.startsWith('[pt video]')) console.log(`  ${m.slice(11, 400)}`)   // the tracer's own line per frame
    else if (e.level === 'error') console.log('console:', m.slice(0, 300))
  })
  let gpuGone = null
  app.on('child-process-gone', (_, d) => { if (d.type === 'GPU') { gpuGone = `${d.reason}, exit ${d.exitCode}`; console.error('GPU process gone:', gpuGone) } })
  // the page saves the MP4 through a download (no file picker here)
  const saved = new Promise(resolve => w.webContents.session.on('will-download', (_, item) => {
    const file = path.join(out, item.getFilename())
    item.setSavePath(file)
    item.once('done', (__, state) => resolve(state === 'completed' ? file : null))
  }))
  const q = `q=low&hairsim=0&clothsim=0&sw=0&song=${song}&ptengine=${o.engine}${opt.recycle != null ? '&ptrecycle=' + opt.recycle : ''}${opt.extra || ''}`
  await w.loadURL(`${PAGE}?${q}`)
  const js = s => w.webContents.executeJavaScript(s, true)
  const t0 = Date.now()
  while (!(await js("!!(window.__pianist?.pt && document.getElementById('songTitle')?.textContent.trim())"))) {
    if (Date.now() - t0 > 300000) throw new Error('page did not get ready in 5 min')
    await new Promise(r => setTimeout(r, 500))
  }
  await new Promise(r => setTimeout(r, 3000))
  const picked = await js(`(o => {
    const set = (id, v) => { const el = document.getElementById(id); if (el.type === 'checkbox') el.checked = v; else el.value = v; el.dispatchEvent(new Event('change')); el.onchange?.() }
    set('exPt', 'pt'); set('ptEngine', o.engine); set('ptSpp', o.spp); set('ptBounces', o.bounces); set('ptHair', o.hair)
    set('exRes', o.res); set('exFps', o.fps); set('exLen', o.len); set('exAudio', false); set('exTitle', 'none')
    set('ptFx', o.fx); set('ptDenoise', o.denoise)
    window.showSaveFilePicker = undefined
    const v = id => document.getElementById(id).value
    return { engine: v('ptEngine'), spp: v('ptSpp'), bounces: v('ptBounces'), res: v('exRes'), fps: v('exFps'), len: v('exLen'), denoise: document.getElementById('ptDenoise').checked }
  })(${JSON.stringify(o)})`)
  for (const [k, want] of Object.entries({ engine: o.engine, spp: o.spp, bounces: o.bounces, res: o.res, fps: o.fps, len: o.len })) {
    if (String(picked[k]) !== String(want)) throw new Error(`the page has no ${k} ${want} (it kept ${picked[k]})`)
  }
  console.log(`backend ${backend} · ${picked.engine} · ${picked.res} · ${picked.fps} fps · ${picked.len} s · ${picked.spp} spp · ${picked.bounces} bounces · denoise ${picked.denoise}`)
  // The song loads when it first plays: press the start screen's Play, then Export until the page
  // stops saying it has no song or is still working out the fingering.
  await js("(() => { const s = document.getElementById('start'); if (s && !s.classList.contains('gone')) s.onclick(new MouseEvent('click')) })()")
  const started = Date.now()
  for (;;) {
    await js("document.getElementById('exStart').onclick()")
    await new Promise(r => setTimeout(r, 1500))
    const st = await js("document.getElementById('exStatus').textContent")
    if (!/^(Load a song first|Still working out the fingering)/.test(st)) break
    if (Date.now() - started > 300000) throw new Error('the page never got a song to export: ' + st)
    await new Promise(r => setTimeout(r, 3000))
  }
  let last = ''
  const elapsed = () => `${((Date.now() - started) / 1000).toFixed(0)} s`
  for (;;) {
    await new Promise(r => setTimeout(r, 2000))
    const st = await js("document.getElementById('exStatus').textContent").catch(() => '')
    if (st && st !== last) { last = st; console.log(`[${elapsed()}]`, st) }
    if (/^(Done|Failed|Cancelled)/.test(st)) break
    if (gpuGone) { console.log(`[${elapsed()}] stopping: the GPU process is gone (${gpuGone})`); process.exitCode = 3; return }
  }
  if (/^Done/.test(last)) {
    const file = await saved
    console.log('saved', file, file && fs.statSync(file).size, 'bytes', `(${elapsed()})`)
  } else process.exitCode = 1
}

async function interactive() {
  const w = makeWindow({ show: !headless, width: 1280, height: 720 })
  w.webContents.on('render-process-gone', (_, d) => console.error('renderer gone:', d.reason))
  await w.loadURL(PAGE + (opt.query ? '?' + opt.query : ''))
  console.log(`${PAGE} · backend ${backend}${headless ? ' · headless: no window (there is no display)' : ''}`)
}

app.whenReady().then(async () => {
  serveRepo()
  try {
    if ('info' in opt) await info()
    else if ('still' in opt) await still()
    else if ('video' in opt) await video()
    else if ('export' in opt) await exportScene()
    else return interactive()
  } catch (e) { console.error(e); process.exitCode = 1 }
  app.quit()
})
app.on('window-all-closed', () => app.quit())
