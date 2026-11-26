// The score over the path-traced pianist: a plugin for pathtrace/app.js's
// boot(), shared by #049 (a scanned page, sliced) and #050 (engraved by
// nwc-viewer). Each gives `build`, which makes the layout (layout.js) for a
// song, or null where it has no score for it.
//
//   boot(sheetPlugin({ title, href, defaultSong, build: async (song, midi, file, app) => ({ layout, timeline, inkFrom, note }) }))
//
// It adds a Score section to Visuals (Show, Style, Position (automatic: sheet/placer.js), Rows, Size,
// Follow with, In videos), a section of the page's settings (ui/settings.js) kept in the
// address bar as sheet, smode, sstyle, spos, srows, ssize, shl, svideo; draws on a canvas
// over the picture each frame, and onto every frame of a video the Render menu exports.

import { createSheetOverlay, STYLES, POSITIONS, HIGHLIGHTS, MODES } from './overlay.js'
import { createPlacer } from './placer.js'

export function sheetPlugin({ title, href = 'sheet/README.md', defaultSong, build, about = '' }) {
  let app = null, ov = null, canvas = null, g = null, note = '', job = 0, placer = null, ready = null
  const newPlacer = o => createPlacer(o, { survey: r => app.surveyFrame(r), key: () => app.surveyKey(), reserve: r => app.reserve(r) })
  const opt = id => app.$(id)
  const S = () => app.settings
  const settings = () => ({ mode: S().get('sMode'), style: S().get('sStyle'), position: S().get('sPos'), rows: +S().get('sRows'), size: +S().get('sSize'), highlight: S().get('sHl') })
  function resize() {
    const k = Math.min(devicePixelRatio || 1, 2)
    canvas.width = Math.round(innerWidth * k); canvas.height = Math.round(innerHeight * k)
  }
  const shown = () => S().get('sOn') && ov
  function frame(t, fresh = false) {
    if (!g) return
    g.setTransform(1, 0, 0, 1, 0, 0)
    g.clearRect(0, 0, canvas.width, canvas.height)
    if (!shown()) { app.reserve(null); return }
    if (app.exporting) return
    // (not until the director's plan for the song is made: the place is chosen from it, once)
    if (!app.planReady) return
    // where a video would have it: the bar and buttons pass over it while they show, and it doesn't move for them
    ov.draw(g, canvas.width, canvas.height, t, { box: (fresh ? newPlacer(ov) : placer)(canvas.width, canvas.height) })
  }
  return {
    title, href, defaultSong,
    async onReady(a) {
      app = a
      canvas = Object.assign(document.createElement('canvas'), { id: 'sheetCanvas' })
      canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:1'
      app.renderer.domElement.after(canvas)
      g = canvas.getContext('2d')
      resize(); addEventListener('resize', resize)
      const sel = (id, map, v) => `<select id="${id}">${Object.entries(map).map(([k, l]) => `<option value="${k}"${k === v ? ' selected' : ''}>${typeof l === 'string' ? l : l.label}</option>`).join('')}</select>`
      app.addVisuals(`<div class="sect">Score <small id="sNote">${about}</small></div>
        <label class="chk" title="The score's system over the picture as it plays (S)"><input type="checkbox" id="sOn" checked> Show the score</label>
        <div class="field" title="Systems: the score as printed, a system at a time, the next coming up before it is reached. Scroll: the bars on one long line in the order they are played, moving under a cursor that stays put, with the clef and the key held at the left"><label>Layout</label>${sel('sMode', MODES, 'systems')}</div>
        <div class="field"><label>Style</label>${sel('sStyle', STYLES, 'glass')}</div>
        <div class="field" title="Automatic: one place for the whole song, the part of the frame the pianist and the piano fill least over the director's shots, leaving room for the liner notes (automatic intertitles keep off it; a fixed intertitle place or the captions keep it off theirs). It doesn't move while the song plays"><label>Position</label>${sel('sPos', POSITIONS, 'auto')}</div>
        <div class="field" id="sRowsF" title="Systems in view: the one being played, and the ones after it"><label>Systems shown</label><select id="sRows"><option value="1" selected>1</option><option value="2">2</option></select></div>
        <div class="field"><label>Size <span class="val" id="sSizeV"></span></label><input type="range" id="sSize" min="0.1" max="0.4" step="0.01" value="0.2"></div>
        <div class="field"><label>Follow with</label>${sel('sHl', HIGHLIGHTS, 'bar')}</div>
        <label class="chk" title="Draw the score into every frame of a video from Render, as it shows here (path-traced videos too)"><input type="checkbox" id="sVideo" checked> In videos</label>`, { first: true })
      // the section: bound to the markup above, read from the address bar, kept in it
      app.settings.add({ id: 'sheet', label: 'Score', items: [
        { key: 'sOn', url: 'sheet', label: 'Show the score' }, { key: 'sMode', url: 'smode', label: 'Layout' }, { key: 'sStyle', url: 'sstyle', label: 'Style' },
        { key: 'sPos', url: 'spos', label: 'Position' }, { key: 'sRows', url: 'srows', label: 'Systems shown', when: s => s.sMode !== 'scroll' },
        { key: 'sSize', url: 'ssize', label: 'Size', format: v => Math.round(v * 100) + '%' }, { key: 'sHl', url: 'shl', label: 'Follow with' }, { key: 'sVideo', url: 'svideo', label: 'In videos' },
      ] })
      app.settings.read(app.params, ['sOn', 'sMode', 'sStyle', 'sPos', 'sRows', 'sSize', 'sHl', 'sVideo'])
      const apply = () => {
        const was = ov?.opts.mode
        ov?.set(settings())
        // (the panel's shape changes with the layout: its place is chosen again)
        if (ov && was !== ov.opts.mode) placer = newPlacer(ov)
      }
      for (const k of ['sMode', 'sStyle', 'sPos', 'sRows', 'sSize', 'sHl']) app.settings.subscribe(k, apply)
      apply()
      addEventListener('keydown', e => { if ((e.key === 's' || e.key === 'S') && !e.metaKey && !e.ctrlKey && !/INPUT|SELECT|TEXTAREA/.test(document.activeElement?.tagName)) opt('sOn').click() })
    },
    async onSong(song, midi, a) {
      app ||= a
      const my = ++job
      ov = null
      const file = app.songFile || app.params.get('song') || ''
      try {
        const r = await build(song, midi, file, app)
        // (a score of many pages: the ones for the time it opens at, before the first frame)
        await r?.ready?.(+app.params.get('t') || 0)
        if (my !== job) return
        ready = r?.ready || null
        if (!r) { note = 'No score for this song'; ov = null }
        // (start: the first note, so a video's lead-in shows no score until the music begins)
        else { ov = createSheetOverlay(r.layout, r.timeline, { ...settings(), inkFrom: r.inkFrom || 'luma', start: song.notes.reduce((m, n) => Math.min(m, n.time), Infinity) || 0 }); placer = newPlacer(ov); note = r.note || '' }
      } catch (e) { console.error(e); note = 'Score: ' + e.message; app.setStatus(note, true, 5000) }
      const el = opt('sNote'); if (el) el.textContent = note || about
    },
    // (a ?shot still: placed for its own frame alone)
    onFrame(t, a, o) { frame(t, !!o?.shot) },
    overlay() {
      if (!ov || !S().get('sOn') || !S().get('sVideo')) return null
      // a placer of its own for the video's frame (its shape), chosen on its first frame
      const o = ov, pl = newPlacer(o)
      // (a score of many pages: the export starts here, or at the start)
      ready?.(app.songNow?.() ?? 0); ready?.(0)
      return (g2, w, h, t) => o.draw(g2, w, h, t, { box: pl(w, h) })
    },
  }
}
