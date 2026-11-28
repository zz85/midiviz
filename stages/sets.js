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
//   const settings = createSettings([..., ...sets.sections, ...])   // their controls' schema (ui/settings.js)
//   sets.attach(settings)                                            // the store drives the sets
//   await sets.readUrl(params, 'stage', setStageSet)   // ?stage=lake&sky=2 (pathtrace: 'scene')
//   each frame: sets.update(dt); sets.draw() || composer.render()
//   resize: sets.setSize(); play/pause: sets.setPlaying(on); a still: sets.shot(T, notes)
//
// A page with controls of its own (#038's toolbar, bound by its settings store and
// park/controls.js) passes controls: false: no boxes, no wiring, no URL reading; it calls
// choose() itself. host.park and host.lake are more options for those two stages (the duo's
// layout, centre and sun; the lake's centre, the piano's frame and more feet in the water).
//
// Each set is a descriptor: its controls as a section of the page's settings (the park's is
// park/controls.js's, once for every page; the markup put after the Stage menu is built from
// it, shown while the set is on), how the store drives it (`wire`), the URL keys outside the
// controls (`fromUrl`), and how it builds its stage.
import { createParkStage } from '../park/stage.js'
import { parkSettings, wirePark } from '../park/controls.js'
import { createLakeStage, LAKE_TIMES } from '../lake/stage.js'

const esc = t => String(t ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
// the markup of a section's items, as the pages' menus write a field: a select, or a checkbox
function markup(section) {
  return section.items.filter(it => it.el).map(it => {
    const title = it.title ? ` title="${esc(it.title)}"` : ''
    if (it.type === 'bool') return `<label class="chk"${title}><input type="checkbox" id="${it.el}"${it.default ? ' checked' : ''}>${esc(it.label)}</label>`
    const opts = (it.options || []).map(([v, n]) => `<option value="${esc(v)}"${String(v) === String(it.default) ? ' selected' : ''}>${esc(n)}</option>`).join('')
    return `<div class="field"${title}><label>${esc(it.label)}</label><select id="${it.el}">${opts}</select></div>`
  }).join('\n    ')
}

export const SETS = [
  {
    id: 'park', label: 'The park', webgpu: false, pathTraced: false,
    about: "#051: Sorairo's hillside, the tree, wind in the grass, the sky, birds and a painterly finish (park/)",
    make: h => createParkStage({ renderer: h.renderer, scene: h.scene, camera: h.camera, onStatus: h.setStatus,
      stageParts: h.stageParts, foreground: h.foreground, hair: h.hair, ...h.park }),
    // ?tod, ?tree, ?birds, ?ppaint: park/controls.js (the hours there are the park's own; park/stage.js adds its 0.4)
    section: parkSettings({ birdsKey: 'birds', who: 'her' }),
    wire(s, settings, h) { wirePark(settings, s, { playing: () => h.playing?.() ?? false }) },
    fromUrl(s, settings, params) {
      Object.assign(s.opts, { time: +settings.get('parkTod'), style: settings.get('parkTree'), painted: settings.get('parkPaint'), scale: +settings.get('parkScale'), azimuth: +settings.get('parkSun'), ambience: +settings.get('parkAmbience'), wind: +settings.get('parkWind'), clouds: +settings.get('parkClouds') })
      if (params.has('pturn') && Number.isFinite(+params.get('pturn'))) s.opts.turn = +params.get('pturn')
    },
    playing(s, settings, on) { s.setSound(on && s.on && settings.get('parkAmb')) },
  },
  {
    id: 'lake', label: 'The lake (Afterglow)', webgpu: false, pathTraced: false,
    about: "#054: Afterglow's mountain lake after sunset (lake/), the water ringing from the piano's legs as she plays and reflecting her",
    make: h => createLakeStage({ renderer: h.renderer, scene: h.scene, camera: h.camera, onStatus: h.setStatus,
      stageParts: h.stageParts, foreground: h.foreground, hair: h.hair, progress: h.progress, ...h.lake }),
    section: { id: 'lake', label: 'The lake', items: [
      { key: 'lakeTod', el: 'lakeTod', type: 'select', default: '0', url: 'sky', label: 'Sky', options: LAKE_TIMES.map(([v, n]) => [String(v), n]),
        title: 'The sun below the horizon, as in Afterglow: from just after sunset to the blue hour, or set along the song from start to end' },
    ] },
    wire(s, settings) { settings.subscribe('lakeTod', v => s.setTime(v)) },
    fromUrl(s, settings, params) {
      s.setTime(settings.get('lakeTod'))
      for (const k of ['keyGain', 'fillGain', 'envGain', 'exposure']) if (params.has(k)) s.opts[k] = +params.get(k)
    },
    // a still: the rings of the last 12 s already spreading
    shot(s, T, notes) { for (const n of notes) if (n.time <= T && n.time > T - 12) s.noteOn(n.midi, n.velocity ?? 0.7, T - n.time) },
  },
]

export function createStageSets(host) {
  const { select, piano, dim = [], gpu = false, controls = true } = host
  const $ = id => document.getElementById(id)
  const sets = new Map(), boxes = new Map()
  let settings = null   // the page's store, once attached
  // the controls, after the Stage menu, each set's in a box shown while it is on
  let at = controls ? select.closest('.field') : null
  for (const d of SETS) {
    const s = d.make(host)
    sets.set(d.id, s)
    // (on WebGPU: marked here too for a menu stages/menu.js didn't build)
    if (gpu) { const o = select.querySelector(`option[value=${d.id}]`); if (o && !o.disabled) { o.disabled = true; o.text += ' - WebGL only' } }
    if (controls) {
      const box = document.createElement('div')
      box.className = 'stageCtl'; box.dataset.set = d.id; box.style.display = 'none'
      box.innerHTML = markup(d.section)
      at.after(box); at = box; boxes.set(d.id, box)
    }
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
    /** The sets' controls as sections of the page's settings schema (ui/settings.js), where the page has the controls. */
    sections: controls ? SETS.map(d => d.section) : [],
    /** The page's store, bound: from here the store drives the sets (the park's hour, tree, birds, paint; the lake's sky). */
    attach(st) { settings = st; if (controls) for (const d of SETS) d.wire(sets.get(d.id), st, host); return api },
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
    /** The set the address asks for (?stage= or ?scene=), with its own keys, before the page reads the rest (after attach). */
    async readUrl(params, key, choose) {
      const id = params.get(key)
      if (!controls || !api.has(id) || !settings) return false
      settings.read(params, desc(id).section.items.map(it => it.key))
      desc(id).fromUrl(sets.get(id), settings, params)
      select.value = id
      await choose(id)
      return true
    },
    update(dt) { for (const s of sets.values()) s.update(dt) },
    /** Draw the frame if a set is on; false leaves it to the page. */
    draw() { const s = active(); if (!s) return false; s.draw(); return true },
    setSize() { for (const s of sets.values()) s.setSize() },
    setPlaying(on) { if (controls && settings) for (const d of SETS) d.playing?.(sets.get(d.id), settings, on) },
    shows: o => [...sets.values()].every(s => s.shows(o)),
    /** A still at T (?shot): what the active set seeds from the song's notes. */
    shot(T, notes = []) { const id = activeId(); if (id) desc(id).shot?.(sets.get(id), T, notes) },
  }
  globalThis.__stageSets = api
  globalThis.__lake = sets.get('lake')
  return api
}
