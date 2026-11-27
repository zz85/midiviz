// The hands' baked tracks as graphs in the studio panel (ui/studio.js): what pianist/hand-driver.js
// bakes over the song ahead of time (bakeTrack: each hand's placement along the keys, its depth
// and the wrist's height, at 60 Hz, smoothed) against what the hand does now, and the strokes
// and presses on top. One folder, "Hands", with Tweakpane graph monitors fed each frame:
//
//   addHandsMonitor(studio, { rig: () => rig, ahead: 0.5 })
//
// For each hand: along the keys (the wrist's x in cm, with the baked track AHEAD seconds on as a
// second line), above the keys (the wrist's height over the key tops, cm), depth (z toward the
// fallboard), lift (the stroke's rise) and press (how many fingers are down, 0-5). A line reads
// "baked" or "live" from whether the driver has a track at this moment (wristAt). The graphs
// run while the folder is open and stop with it, so a closed folder costs nothing. The values
// are read, never written: tweaking a track is the next step.

const KEY_TOP = 73   // (pianist/hand-driver.js KEY_TOP: the key tops' height, cm)
const RATE = 1000 / 30

export function addHandsMonitor(studio, { rig, ahead = 0.5, title = 'Hands', expanded = false } = {}) {
  const folder = studio.pane.addFolder({ title, expanded })
  const v = { bakedL: '', bakedR: '', time: 0 }
  const hands = { L: {}, R: {} }
  const graphs = []
  const graph = (obj, key, label, min, max) => {
    const b = folder.addBinding(obj, key, { readonly: true, view: 'graph', min, max, interval: RATE, label, rows: 2 })
    graphs.push(b); return b
  }
  folder.addBinding(v, 'time', { readonly: true, label: 'song time (s)', format: x => x.toFixed(2), interval: RATE })
  for (const side of ['L', 'R']) {
    const h = hands[side]
    Object.assign(h, { x: 0, xAhead: 0, y: 0, z: 0, lift: 0, press: 0 })
    folder.addBlade({ view: 'separator' })
    folder.addBinding(v, 'baked' + side, { readonly: true, label: `${side} track`, interval: RATE })
    graph(h, 'x', `${side} along the keys`, -70, 70)
    graph(h, 'xAhead', `${side} baked, +${ahead} s`, -70, 70)
    graph(h, 'y', `${side} above the keys`, -3, 25)
    graph(h, 'z', `${side} depth`, -20, 20)
    graph(h, 'lift', `${side} lift`, 0, 8)
    graph(h, 'press', `${side} fingers down`, 0, 5)
  }
  const out = { x: 0, y: 0, z: 0, set(x, y, z) { this.x = x; this.y = y; this.z = z; return this } }
  // (a timer, as Tweakpane's monitors read on one: a page's requestAnimationFrame may be throttled or its own)
  let timer = 0, on = false
  function tick() {
    let r = null
    try { r = rig?.() } catch { r = null }   // (a page still loading: the rig isn't made yet)
    if (!on || !r) return
    const t = r.state?.songT ?? 0
    v.time = t
    for (const side of ['L', 'R']) {
      const d = r.hands?.[side], h = hands[side]
      if (!d) continue
      const W = d.joints?.W
      if (W) { h.x = W.x; h.y = W.y - KEY_TOP; h.z = W.z }
      h.lift = d.strokeLift ?? 0
      h.press = d.diag?.press ? d.diag.press.reduce((n, p) => n + (p > 0.2 ? 1 : 0), 0) : 0
      const a = d.wristAt?.(t + (r.hands.lead || 0) + ahead, out)
      h.xAhead = a ? a.x : h.x
      v['baked' + side] = d.visible === false ? 'resting' : d.wristAt?.(t + (r.hands.lead || 0), out) ? 'baked' : 'live'
    }
  }
  function run(want) {
    on = want && !folder.hidden
    if (on && !timer) timer = setInterval(tick, RATE)
    if (!on && timer) { clearInterval(timer); timer = 0 }
  }
  folder.on('fold', ev => run(ev.expanded))
  run(expanded)
  return { folder, graphs, hands, values: v, get running() { return on }, start: () => run(true), stop: () => run(false), dispose() { run(false); folder.dispose() } }
}
