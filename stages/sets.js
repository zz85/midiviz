// The stage sets that take over the picture (the park, the lake) for the solo pianist
// pages, written once: #032 and, through pathtrace/app.js, #045, #049, #050 and #054.
// A takeover set draws the page's scene itself, in place of the page's composer, and
// hides the hall's floor, lights and dust while it is on (park/stage.js, lake/stage.js).
// The in-scene sets (black stage, candlelit chamber, hall of water) stay the page's
// own setStage() for now; choose() hands any name it doesn't hold to it.
//
//   const sets = createStageSets({ renderer, scene, camera, piano, stageParts, foreground, hair,
//     progress, playing, setStatus, select: $('stageSet'), dim: ['dof', 'bloom', ...], gpu })
//   setStageSet = async name => { await sets.choose(name, setStage); applyFx() }
//   await sets.readUrl(params, 'stage', setStageSet)   // ?stage=lake&sky=2 (pathtrace: 'scene')
//   STATE: [...sets.state]                             // tod, tree, ppaint, birds, sky
//   each frame: sets.update(dt); sets.draw() || composer.render()
//   resize: sets.setSize(); play/pause: sets.setPlaying(on); a still: sets.shot(T, notes)
//
// Each set is a descriptor: its controls (markup put after the Stage menu, shown while
// it is on), the URL keys they keep, and how it builds and drives its stage.
import { createParkStage, PARK_TIMES, PARK_TREES } from '../park/stage.js'
import { createLakeStage, LAKE_TIMES } from '../lake/stage.js'

const opt = (list, def) => list.map(([v, n]) => `<option value="${v}"${String(v) === String(def) ? ' selected' : ''}>${n}</option>`).join('')

export const SETS = [
  {
    id: 'park',
    make: h => createParkStage({ renderer: h.renderer, scene: h.scene, camera: h.camera, onStatus: h.setStatus,
      stageParts: h.stageParts, foreground: h.foreground, hair: h.hair }),
    controls: `
    <div class="field"><label>Time of day</label><select id="parkTod">${opt(PARK_TIMES.map(([i, n]) => [i, '' + n]), 1)}</select></div>
    <div class="field"><label>Tree</label><select id="parkTree">${opt(PARK_TREES, 'summer')}</select></div>
    <label class="chk" title="Wind, songbirds and insects while she plays (Sorairo's ambience; not in exported videos)"><input type="checkbox" id="parkAmb" checked>Birds and wind</label>
    <label class="chk" title="Draw her into the painting: she goes through the park's light shafts, grade and painterly brush with the piano, so her outlines soften into strokes. Off: she is graded apart and laid sharp over the painted park"><input type="checkbox" id="parkPaint">Paint her with the park</label>`,
    state: [['tod', 'parkTod'], ['tree', 'parkTree'], ['ppaint', 'parkPaint'], ['birds', 'parkAmb']],
    wire(s, $, h) {
      $('parkTod').onchange = () => s.setTime($('parkTod').value)
      $('parkTree').onchange = () => s.setStyle($('parkTree').value)
      $('parkPaint').onchange = () => s.setPainted($('parkPaint').checked)
      $('parkAmb').onchange = () => this.playing(s, $, h.playing())
    },
    fromUrl(s, $, params) {
      for (const [k, id] of [['tod', 'parkTod'], ['tree', 'parkTree']]) if ([...$(id).options].some(o => o.value === params.get(k))) $(id).value = params.get(k)
      s.opts.time = +$('parkTod').value; s.opts.style = $('parkTree').value
      if (params.get('ppaint') === '1') $('parkPaint').checked = true
      s.opts.painted = $('parkPaint').checked
      { const k = +params.get('pscale'); if (k >= 0.02 && k <= 4) s.opts.scale = k }
      if (params.has('pturn') && Number.isFinite(+params.get('pturn'))) s.opts.turn = +params.get('pturn')
    },
    playing(s, $, on) { s.setSound(on && s.on && $('parkAmb').checked) },
  },
  {
    id: 'lake',
    make: h => createLakeStage({ renderer: h.renderer, scene: h.scene, camera: h.camera, onStatus: h.setStatus,
      stageParts: h.stageParts, foreground: h.foreground, hair: h.hair, progress: h.progress }),
    controls: `
    <div class="field" title="The sun below the horizon, as in Afterglow: from just after sunset to the blue hour, or set along the song from start to end"><label>Sky</label><select id="lakeTod">${opt(LAKE_TIMES, 0)}</select></div>`,
    state: [['sky', 'lakeTod']],
    wire(s, $) { $('lakeTod').onchange = () => s.setTime($('lakeTod').value) },
    fromUrl(s, $, params) {
      if ([...$('lakeTod').options].some(o => o.value === params.get('sky'))) $('lakeTod').value = params.get('sky')
      s.setTime($('lakeTod').value)
      for (const k of ['keyGain', 'fillGain', 'envGain', 'exposure']) if (params.has(k)) s.opts[k] = +params.get(k)
    },
    // a still: the rings of the last 12 s already spreading
    shot(s, T, notes) { for (const n of notes) if (n.time <= T && n.time > T - 12) s.noteOn(n.midi, n.velocity ?? 0.7, T - n.time) },
  },
]

export function createStageSets(host) {
  const { select, piano, dim = [], gpu = false } = host
  const $ = id => document.getElementById(id)
  const sets = new Map(), boxes = new Map()
  // the controls, after the Stage menu, each set's in a box shown while it is on
  let at = select.closest('.field')
  for (const d of SETS) {
    const box = document.createElement('div')
    box.className = 'stageCtl'; box.dataset.set = d.id; box.style.display = 'none'
    box.innerHTML = d.controls
    at.after(box); at = box; boxes.set(d.id, box)
    const s = d.make(host)
    sets.set(d.id, s)
    d.wire(s, $, host)
    if (gpu) { const o = select.querySelector(`option[value=${d.id}]`); if (o) { o.disabled = true; o.text += ' - WebGL only' } }
  }
  const desc = id => SETS.find(d => d.id === id)
  const active = () => { for (const s of sets.values()) if (s.on) return s; return null }
  const activeId = () => { for (const [id, s] of sets) if (s.on) return id; return null }

  // the piano's keys and sustain pedal to the sets that listen (the lake's rings)
  if (piano) {
    const on = piano.noteOn.bind(piano), sus = piano.setSustain.bind(piano)
    piano.noteOn = (m, v, ...a) => { for (const s of sets.values()) s.noteOn?.(m, v); return on(m, v, ...a) }
    piano.setSustain = (d, ...a) => { for (const s of sets.values()) s.pedal?.(d); return sus(d, ...a) }
  }

  const api = {
    get: id => sets.get(id),
    active, activeId,
    has: id => sets.has(id) && !gpu,
    state: SETS.flatMap(d => d.state),
    /** Switch to `name`: a set of these, or the page's own (`inscene(name)`). */
    async choose(name, inscene) {
      const want = gpu ? null : sets.has(name) ? name : null
      for (const [id, b] of boxes) b.style.display = id === want ? '' : 'none'
      for (const id of dim) { const l = $(id)?.closest('label'); if (l) l.style.opacity = want ? 0.4 : '' }
      select.disabled = true
      try {
        for (const [id, s] of sets) if (id !== want && s.on) await s.set(false)
        if (want) await sets.get(want).set(true); else inscene(name)
      } catch (e) {
        console.error(e); host.setStatus?.('Could not set the stage: ' + e.message, true, 6000)
        for (const [id, s] of sets) if (s.on) await s.set(false).catch(() => {})
        for (const b of boxes.values()) b.style.display = 'none'
        for (const id of dim) { const l = $(id)?.closest('label'); if (l) l.style.opacity = '' }
        inscene('stage')
      } finally { select.disabled = false }
      if (activeId()) select.value = activeId()
      api.setPlaying(host.playing?.() ?? false)
    },
    /** The set the address asks for (?stage= or ?scene=), with its own keys, before the page's STATE loop. */
    async readUrl(params, key, choose) {
      const id = params.get(key)
      if (!api.has(id)) return false
      desc(id).fromUrl(sets.get(id), $, params)
      select.value = id
      await choose(id)
      return true
    },
    update(dt) { for (const s of sets.values()) s.update(dt) },
    /** Draw the frame if a set is on; false leaves it to the page. */
    draw() { const s = active(); if (!s) return false; s.draw(); return true },
    setSize() { for (const s of sets.values()) s.setSize() },
    setPlaying(on) { for (const d of SETS) d.playing?.(sets.get(d.id), $, on) },
    shows: o => [...sets.values()].every(s => s.shows(o)),
    /** A still at T (?shot): what the active set seeds from the song's notes. */
    shot(T, notes = []) { const id = activeId(); if (id) desc(id).shot?.(sets.get(id), T, notes) },
  }
  globalThis.__stageSets = api
  globalThis.__lake = sets.get('lake')
  return api
}
