// Experiment #045: path-traced stills of the #032 stage, and the viewer that
// compares them with the page's own (raster) picture.
//
// The page hands over a small adapter:
//   stage.begin(w, h)  stop the loop, size the picture to w × h, draw the
//                      current frame with the page's renderer; returns the
//                      raster picture as a canvas
//   stage.end()        back to the live loop at the window's size
//   stage.scene, stage.camera, stage.hair(), stage.envScene, stage.envIntensity,
//   stage.exposure(), stage.fx() (the page's bloom / grain settings, for post.js)
// and the menu (#ptPop) holds the settings. A still is: the raster frame,
// snapshotScene() of that same moment, then each chosen tracer in turn.

import * as THREE from 'three'
import { snapshotScene, snapshotCamera, bakeEnvironment, disposeSnapshot } from './snapshot.js'
import { ENGINES, traceStill, hasWebGPU } from './engines.js'
import { finishTrace, HDR_SCALE } from './post.js'

const $ = id => document.getElementById(id)

export function createPathTraceStills(stage) {
  const state = { results: [], show: 0, split: 0.5, busy: null, gpu: null }
  let envCache = null

  // ── menu ──
  hasWebGPU().then(ok => {
    state.gpu = ok
    for (const o of $('ptEngine').options) if (ENGINES[o.value]?.webgpu && !ok) { o.disabled = true; o.textContent += ' (no WebGPU here)' }
    if (!ok && ENGINES[$('ptEngine').value]?.webgpu) { $('ptEngine').value = 'mu-webgl'; $('ptEngine').dispatchEvent(new Event('change')) }
  })
  const status = (msg, frac) => { $('ptStatus').textContent = msg; if (frac != null) $('ptBar').firstElementChild.style.width = Math.round(frac * 100) + '%' }
  function size() {
    const v = $('ptSize').value
    if (v === 'screen') { const pr = Math.min(devicePixelRatio, 2); return [Math.round(innerWidth * pr), Math.round(innerHeight * pr)] }
    return v.split('x').map(Number)
  }
  const settings = () => ({ samples: +$('ptSpp').value, bounces: +$('ptBounces').value, denoise: $('ptDenoise').checked, hairFraction: +$('ptHair').value, fx: $('ptFx').checked, size: size() })

  /** the raster frame and one snapshot of it, then each engine in turn */
  async function run(keys, s = settings(), { headless = false } = {}) {
    if (state.busy) return
    const ac = new AbortController()
    state.busy = ac
    $('ptStart').disabled = $('ptAll').disabled = true
    const [w, h] = s.size
    const results = []
    let snap
    try {
      status('Freezing the frame…', 0)
      const raster = headless ? stage.current() : stage.begin(w, h)
      const cam = snapshotCamera(stage.camera, w / h)
      results.push({ engine: 'raster', label: 'Raster (the page, WebGL)', canvas: raster, info: 'three.js r' + THREE.REVISION + ', AgX' })
      // (re-baked when the page's environment intensity changed: #047's light presets)
      // (baked again for another stage's panels or strength)
      if (stage.envScene && (envCache?.userData.intensity !== stage.envIntensity || envCache?.userData.from !== stage.envScene)) { envCache?.dispose(); envCache = bakeEnvironment(stage.envScene, { intensity: stage.envIntensity }); Object.assign(envCache.userData, { intensity: stage.envIntensity, from: stage.envScene }) }
      snap = snapshotScene(stage.scene, { camera: cam, hair: stage.hair(), envMap: envCache, hairFraction: s.hairFraction })
      const st = snap.stats
      const sceneInfo = `${(st.triangles / 1e6).toFixed(2)} M triangles in ${st.meshes} meshes, ${st.lights} lights${st.strands ? `, ${st.strands.toLocaleString()} hair strands` : ''}; baked in ${st.ms} ms` + (st.skipped.length ? `; left out: ${st.skipped.join(', ')}` : '')
      for (const [i, key] of keys.entries()) {
        const E = ENGINES[key]
        const t0 = performance.now()
        try {
          const r = await traceStill(key, {
            scene: snap.scene, camera: cam, width: w, height: h, samples: s.samples, bounces: s.bounces, denoise: s.denoise && !!E.denoiser, signal: ac.signal,
            // (with the page's effects: linear light out, finished in post.js)
            ...(s.fx ? { toneMapping: 'linear', exposure: 1 / HDR_SCALE } : { exposure: stage.exposure() }),
            onProgress: p => status(`${E.label}: ${p.status} ${Math.floor(p.samples)} / ${p.of} spp · ${((performance.now() - t0) / 1000).toFixed(1)} s`, (i + Math.min(1, p.samples / p.of)) / keys.length),
          })
          if (s.fx) {
            const t1 = performance.now(), f = finishTrace(r.canvas, stage.fx())
            Object.assign(r, { canvas: f.fx, fxCanvas: f.fx, plainCanvas: f.plain, hdrStats: f.stats }); r.times.post = Math.round(performance.now() - t1)
          }
          const T = r.times
          r.label = E.label
          r.info = `${w}×${h}, ${Math.round(r.samples)} spp, ${s.bounces} bounces${s.denoise && E.denoiser ? ', ' + E.denoiser + ' denoised' : ''} · ${(T.total / 1000).toFixed(1)} s (scene ${(T.setup / 1000).toFixed(1)} s, first sample ${((T.firstSample ?? 0) / 1000).toFixed(1)} s, tracing ${(T.trace / 1000).toFixed(1)} s${T.denoise ? `, denoise ${(T.denoise / 1000).toFixed(1)} s` : ''}${T.init ? `, init ${(T.init / 1000).toFixed(1)} s` : ''}${T.readback ? `, readback ${(T.readback / 1000).toFixed(1)} s` : ''}${T.post != null ? `, effects ${(T.post / 1000).toFixed(1)} s` : ''})${r.hdrStats ? ` · the page's AgX and effects (linear light: mean ${r.hdrStats.mean.toFixed(2)}, ${(r.hdrStats.clipped * 100).toFixed(1)} % of pixels at the ${HDR_SCALE}× ceiling)` : ''} · ${sceneInfo}`
          results.push(r)
        } catch (e) {
          if (e.name === 'AbortError') throw e
          console.error(key, e)
          results.push({ engine: key, label: E.label, canvas: null, info: 'Failed: ' + (e.message || e), error: String(e.message || e) })
        }
      }
      status(`Done: ${results.length - 1} still${results.length > 2 ? 's' : ''}`, 1)
    } catch (e) {
      status(e.name === 'AbortError' ? 'Cancelled' : 'Failed: ' + e.message, 0)
      if (e.name !== 'AbortError') console.error(e)
    } finally {
      if (!headless) stage.end()
      state.busy = null
      $('ptStart').disabled = $('ptAll').disabled = false
      if (snap) disposeSnapshot(snap)
    }
    $('ptFxView').checked = true; $('ptFxView').parentElement.style.display = results.some(r => r.fxCanvas) ? '' : 'none'
    if (results.length > 1) { state.results = results; state.show = results.length > 2 ? 1 : 1; if (!headless) openViewer() }
    return results
  }

  $('ptStart').onclick = () => run([$('ptEngine').value])
  $('ptAll').onclick = () => run(Object.keys(ENGINES).filter(k => state.gpu || !ENGINES[k].webgpu))
  $('ptCancel').onclick = () => state.busy?.abort()

  // ── viewer: one result at a time, the raster under a split line ──
  const view = $('ptView'), cv = $('ptCanvas'), g = cv.getContext('2d')
  function openViewer() { view.classList.add('open'); tabs(); draw() }
  function closeViewer() { view.classList.remove('open') }
  function tabs() {
    const el = $('ptTabs'); el.innerHTML = ''
    state.results.forEach((r, i) => {
      const b = document.createElement('button')
      b.textContent = `${i + 1} · ${ENGINES[r.engine]?.short || 'Raster'}`
      b.className = i === state.show ? 'on' : ''
      b.disabled = !r.canvas
      b.onclick = () => { state.show = i; tabs(); draw() }
      el.appendChild(b)
    })
  }
  function draw() {
    const r = state.results[state.show], base = state.results[0]
    if (!r?.canvas) return
    const W = r.canvas.width, H = r.canvas.height
    const k = Math.min(innerWidth / W, (innerHeight - 90) / H)
    cv.width = Math.round(W * k * devicePixelRatio); cv.height = Math.round(H * k * devicePixelRatio)
    cv.style.width = Math.round(W * k) + 'px'; cv.style.height = Math.round(H * k) + 'px'
    g.drawImage(r.canvas, 0, 0, cv.width, cv.height)
    const split = $('ptSplit').checked && state.show > 0
    if (split) {
      const x = Math.round(cv.width * state.split)
      g.save(); g.beginPath(); g.rect(0, 0, x, cv.height); g.clip(); g.drawImage(base.canvas, 0, 0, cv.width, cv.height); g.restore()
      g.fillStyle = 'rgba(255,255,255,0.8)'; g.fillRect(x - 1, 0, 2, cv.height)
      g.font = `${12 * devicePixelRatio}px system-ui`; g.fillText('Raster', 10 * devicePixelRatio, 20 * devicePixelRatio)
      g.textAlign = 'right'; g.fillText(ENGINES[r.engine].short, cv.width - 10 * devicePixelRatio, 20 * devicePixelRatio); g.textAlign = 'left'
    }
    $('ptInfo').textContent = `${r.label}: ${r.info}`
  }
  $('ptSplit').onchange = draw
  // traced with the page's effects: show them, or the same trace with AgX only
  $('ptFxView').onchange = () => { for (const r of state.results) if (r.fxCanvas) r.canvas = $('ptFxView').checked ? r.fxCanvas : r.plainCanvas; draw() }
  const drag = ev => { if (!(ev.buttons & 1)) return; const b = cv.getBoundingClientRect(); state.split = Math.min(1, Math.max(0, (ev.clientX - b.left) / b.width)); draw() }
  cv.addEventListener('pointerdown', drag); cv.addEventListener('pointermove', drag)
  $('ptClose').onclick = closeViewer
  $('ptSave').onclick = () => {
    const r = state.results[state.show]
    r.canvas.toBlob(b => { const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = `pianist-${r.engine}-${r.canvas.width}x${r.canvas.height}.png`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 5000) }, 'image/png')
  }
  $('ptOpenLast').onclick = () => { if (state.results.length) openViewer() }
  addEventListener('keydown', ev => {
    if (!view.classList.contains('open')) return
    if (ev.key === 'Escape') { closeViewer(); ev.stopPropagation() }
    const n = +ev.key
    if (n >= 1 && n <= state.results.length && state.results[n - 1].canvas) { state.show = n - 1; tabs(); draw(); ev.stopPropagation() }
  }, true)
  addEventListener('resize', () => { if (view.classList.contains('open')) draw() })

  return { run, state, openViewer, stage }
}
