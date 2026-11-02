// The score over the path-traced pianist: a plugin for pathtrace/app.js's
// boot(), shared by #049 (a scanned page, sliced) and #050 (engraved by
// nwc-viewer). Each gives `build`, which makes the layout (layout.js) for a
// song, or null where it has no score for it.
//
//   boot(sheetPlugin({ title, href, defaultSong, build: async (song, midi, file, app) => ({ layout, timeline, inkFrom, note }) }))
//
// It adds a Score section to Visuals (Show, Style, Position (automatic: sheet/placer.js), Rows, Size,
// Follow with, In videos), kept in the address bar as sheet, sstyle, spos,
// srows, ssize, shl, svideo; draws on a canvas over the picture each frame,
// and onto every frame of a video the Render menu exports.

import { createSheetOverlay, STYLES, POSITIONS, HIGHLIGHTS } from './overlay.js'
import { createPlacer } from './placer.js'

export function sheetPlugin({ title, href = 'sheet/README.md', defaultSong, build, about = '' }) {
  let app = null, ov = null, canvas = null, g = null, note = '', job = 0, placer = null
  const newPlacer = o => createPlacer(o, { survey: r => app.surveyFrame(r), key: () => app.surveyKey(), reserve: r => app.reserve(r) })
  const opt = id => app.$(id)
  const settings = () => ({ style: opt('sStyle').value, position: opt('sPos').value, rows: +opt('sRows').value, size: +opt('sSize').value, highlight: opt('sHl').value })
  function resize() {
    const k = Math.min(devicePixelRatio || 1, 2)
    canvas.width = Math.round(innerWidth * k); canvas.height = Math.round(innerHeight * k)
  }
  const shown = () => opt('sOn').checked && ov
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
        <div class="field"><label>Style</label>${sel('sStyle', STYLES, 'glass')}</div>
        <div class="field" title="Automatic: one place for the whole song, the part of the frame the pianist and the piano fill least over the director's shots, leaving room for the liner notes (automatic intertitles keep off it; a fixed intertitle place or the captions keep it off theirs). It doesn't move while the song plays"><label>Position</label>${sel('sPos', POSITIONS, 'auto')}</div>
        <div class="field" title="Systems in view: the one being played, and the ones after it"><label>Systems shown</label><select id="sRows"><option value="1" selected>1</option><option value="2">2</option></select></div>
        <div class="field"><label>Size <span class="val" id="sSizeV"></span></label><input type="range" id="sSize" min="0.1" max="0.4" step="0.01" value="0.2"></div>
        <div class="field"><label>Follow with</label>${sel('sHl', HIGHLIGHTS, 'bar')}</div>
        <label class="chk" title="Draw the score into every frame of a video from Render, as it shows here (path-traced videos too)"><input type="checkbox" id="sVideo" checked> In videos</label>`, { first: true })
      const p = app.params
      if (p.get('sheet') === '0') opt('sOn').checked = false
      for (const [k, id] of [['sstyle', 'sStyle'], ['spos', 'sPos'], ['srows', 'sRows'], ['ssize', 'sSize'], ['shl', 'sHl']]) if (p.has(k)) opt(id).value = p.get(k)
      if (p.get('svideo') === '0') opt('sVideo').checked = false
      app.addState(['sheet', 'sOn'], ['sstyle', 'sStyle'], ['spos', 'sPos'], ['srows', 'sRows'], ['ssize', 'sSize'], ['shl', 'sHl'], ['svideo', 'sVideo'])
      const apply = () => { opt('sSizeV').textContent = Math.round(+opt('sSize').value * 100) + '%'; ov?.set(settings()) }
      for (const id of ['sStyle', 'sPos', 'sRows', 'sHl']) opt(id).onchange = apply
      opt('sSize').oninput = apply
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
        if (my !== job) return
        if (!r) { note = 'No score for this song'; ov = null }
        // (start: the first note, so a video's lead-in shows no score until the music begins)
        else { ov = createSheetOverlay(r.layout, r.timeline, { ...settings(), inkFrom: r.inkFrom || 'luma', start: song.notes.reduce((m, n) => Math.min(m, n.time), Infinity) || 0 }); placer = newPlacer(ov); note = r.note || '' }
      } catch (e) { console.error(e); note = 'Score: ' + e.message; app.setStatus(note, true, 5000) }
      const el = opt('sNote'); if (el) el.textContent = note || about
    },
    // (a ?shot still: placed for its own frame alone)
    onFrame(t, a, o) { frame(t, !!o?.shot) },
    overlay() {
      if (!ov || !opt('sOn').checked || !opt('sVideo').checked) return null
      // a placer of its own for the video's frame (its shape), chosen on its first frame
      const o = ov, pl = newPlacer(o)
      return (g2, w, h, t) => o.draw(g2, w, h, t, { box: pl(w, h) })
    },
  }
}
