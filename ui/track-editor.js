// The track editor in the studio (ui/studio.js): the hands' override curves (pianist/overrides.js)
// drawn on a timeline over the song and edited with the pointer, in the Hands folder under the
// graphs. One curve at a time (a list picks it): its keyframes as dots on a line; behind it, in
// grey, what the rig does now at each second (the wrist's height over the keys for a lift, her
// lean for the lean), sampled as the song plays. A playhead marks the song's time.
//
//   addTrackEditor(studio, { rig: () => rig, overrides, songDuration: () => song?.duration, seek: t => ..., folder })
//
// Click on the canvas: a keyframe at that time and value. Drag a dot: move it. Double-click a
// dot: remove it. Shift-click: set the playhead (seek). Clear: every keyframe of this curve.
// The curves go in the address bar as ?curves= (ui/settings.js item `curves`, text), so a shared
// link carries them, and the keyframes are the store's: a change of the store redraws.
import { CURVES } from '../pianist/overrides.js'

const KEY_TOP = 73
const W = 268, H = 96, PAD = 6

export function addTrackEditor(studio, { rig, overrides, songDuration = () => 0, seek = null, folder = null, title = 'Track editor', expanded = false } = {}) {
  const f = folder || studio.pane.addFolder({ title, expanded })
  const state = { curve: 'liftL' }
  const pick = f.addBinding(state, 'curve', { label: 'Curve', options: Object.fromEntries(Object.entries(CURVES).map(([k, c]) => [c.label, k])) })
  pick.on('change', draw)
  const canvas = document.createElement('canvas')
  canvas.width = W * 2; canvas.height = H * 2; canvas.style.cssText = `width:${W}px;height:${H}px;display:block;margin:4px 8px;border-radius:4px;background:rgba(0,0,0,.35);cursor:crosshair;touch-action:none`
  canvas.title = 'Click: a keyframe at that time and value. Drag a dot: move it. Double-click a dot: remove it. Shift-click: seek the song there. Grey: what she does now, as the song plays; orange: the curve added to it'
  const g = canvas.getContext('2d'); g.scale(2, 2)
  const holder = document.createElement('div'); holder.className = 'tp-lblv'; holder.append(canvas)
  // (right under the list, before the buttons: the blade's row in the folder's container)
  let pickRow = pick.element; while (pickRow.parentElement && !pickRow.parentElement.classList.contains('tp-fldv_c') && !pickRow.parentElement.classList.contains('tp-brkv')) pickRow = pickRow.parentElement
  pickRow.after(holder)
  f.addButton({ title: 'Clear this curve' }).on('click', () => overrides.clear(state.curve))
  f.addButton({ title: 'Clear all curves' }).on('click', () => overrides.clear())

  // what the rig does now, sampled a value a second as the song plays (for the grey line behind)
  const live = {}
  const rigNow = () => { try { return rig?.() } catch { return null } }   // (a page still loading: the rig isn't made yet)
  function sample() {
    const r = rigNow(); if (!r) return
    const t = r.state?.songT ?? 0, i = Math.floor(t)
    const v = { liftL: (r.hands?.L?.joints?.W?.y ?? KEY_TOP) - KEY_TOP, liftR: (r.hands?.R?.joints?.W?.y ?? KEY_TOP) - KEY_TOP, lean: r.state?.lean ?? 0 }
    for (const k of Object.keys(CURVES)) { (live[k] ||= [])[i] = v[k] }
    draw()
  }
  // the timeline's length: the song's, or, where the page has none yet (a still, a page still loading),
  // past the last keyframe, 60 s at least
  const dur = () => { let d = 0; try { d = songDuration() || 0 } catch { d = 0 } if (d > 1) return d; const last = Math.max(0, ...Object.keys(CURVES).flatMap(k => overrides.get(k).map(p => p[0]))); return Math.max(60, last * 1.25) }
  const c = () => CURVES[state.curve]
  const x2t = x => (x - PAD) / (W - 2 * PAD) * dur(), t2x = t => PAD + t / dur() * (W - 2 * PAD)
  const y2v = y => c().max - (y - PAD) / (H - 2 * PAD) * (c().max - c().min), v2y = v => PAD + (c().max - v) / (c().max - c().min) * (H - 2 * PAD)
  function draw() {
    g.clearRect(0, 0, W, H)
    const cu = c(), keys = overrides.get(state.curve), d = dur()
    // the zero line and the range
    g.strokeStyle = 'rgba(255,255,255,.18)'; g.lineWidth = 1; g.beginPath(); g.moveTo(PAD, v2y(0)); g.lineTo(W - PAD, v2y(0)); g.stroke()
    g.fillStyle = 'rgba(255,255,255,.45)'; g.font = '9px sans-serif'; g.textBaseline = 'top'
    g.fillText(`${cu.max}${cu.unit}`, PAD + 2, PAD); g.textBaseline = 'bottom'; g.fillText(`${cu.min}${cu.unit}`, PAD + 2, H - PAD); g.textAlign = 'right'; g.fillText(fmt(d), W - PAD - 2, H - PAD); g.textAlign = 'left'
    // the rig now, in grey
    const lv = live[state.curve]
    if (lv) { g.strokeStyle = 'rgba(255,255,255,.3)'; g.beginPath(); let on = false; for (let i = 0; i <= d; i++) { if (lv[i] == null) { on = false; continue } const x = t2x(i), y = v2y(Math.max(cu.min, Math.min(cu.max, lv[i]))); on ? g.lineTo(x, y) : g.moveTo(x, y); on = true } g.stroke() }
    // the curve
    if (keys.length) {
      g.strokeStyle = '#f0b860'; g.lineWidth = 1.5; g.beginPath()
      for (let x = PAD; x <= W - PAD; x++) { const y = v2y(overrides.at(state.curve, x2t(x))); x === PAD ? g.moveTo(x, y) : g.lineTo(x, y) }
      g.stroke()
      g.fillStyle = '#ffd27a'
      for (const [t, v] of keys) { g.beginPath(); g.arc(t2x(t), v2y(v), 3.5, 0, Math.PI * 2); g.fill() }
    }
    // the playhead
    const t = rigNow()?.state?.songT ?? 0
    g.strokeStyle = 'rgba(120,200,255,.8)'; g.lineWidth = 1; g.beginPath(); g.moveTo(t2x(t), PAD); g.lineTo(t2x(t), H - PAD); g.stroke()
  }
  const fmt = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
  // the pointer: hit a dot, else a new key
  const pos = ev => { const r = canvas.getBoundingClientRect(); return [(ev.clientX - r.left) / r.width * W, (ev.clientY - r.top) / r.height * H] }
  const hit = (x, y) => { const keys = overrides.get(state.curve); let best = -1, bd = 64; keys.forEach(([t, v], i) => { const d = (t2x(t) - x) ** 2 + (v2y(v) - y) ** 2; if (d < bd) { bd = d; best = i } }); return best }
  let drag = null
  canvas.addEventListener('pointerdown', ev => {
    const [x, y] = pos(ev)
    if (ev.shiftKey) { seek?.(Math.max(0, Math.min(dur(), x2t(x)))); return }
    const keys = overrides.get(state.curve), i = hit(x, y)
    if (i >= 0) { drag = { i, keys } } else { keys.push([clampT(x2t(x)), clampV(y2v(y))]); overrides.set(state.curve, keys); drag = { i: keys.findIndex(k => k[0] === clampT(x2t(x))), keys: overrides.get(state.curve) } }
    canvas.setPointerCapture(ev.pointerId)
  })
  canvas.addEventListener('pointermove', ev => {
    if (!drag) return
    const [x, y] = pos(ev)
    drag.keys[drag.i] = [clampT(x2t(x)), clampV(y2v(y))]
    overrides.set(state.curve, drag.keys); drag.keys = overrides.get(state.curve); drag.i = drag.keys.findIndex(k => k[0] === clampT(x2t(x)))
  })
  canvas.addEventListener('pointerup', () => { drag = null })
  canvas.addEventListener('dblclick', ev => { const [x, y] = pos(ev); const keys = overrides.get(state.curve), i = hit(x, y); if (i >= 0) { keys.splice(i, 1); overrides.set(state.curve, keys) } })
  const clampT = t => +Math.max(0, Math.min(dur(), t)).toFixed(2), clampV = v => +Math.max(c().min, Math.min(c().max, v)).toFixed(2)

  let timer = 0
  const run = on => { if (on && !timer) timer = setInterval(sample, 250); if (!on && timer) { clearInterval(timer); timer = 0 } }
  f.on('fold', ev => run(ev.expanded)); run(f.expanded)
  const unsub = overrides.subscribe(draw)
  draw()
  return { folder: f, canvas, draw, dispose() { run(false); unsub(); if (!folder) f.dispose() } }
}
