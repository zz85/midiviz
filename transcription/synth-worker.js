// Offline SoundFont rendering for #035 (module worker, OxiSynth WASM):
// renders a MIDI demo to audio for transcription, and re-synthesizes the
// transcribed notes so they can be played sample-synchronously with the source.
//   in  { type: 'init', vendor, fonts: [url…] }                       out { type: 'ready', ms }
//   in  { type: 'render', id, sr, duration, notes: [{ pitch, on, off, velocity, channel }],
//         programs: [[channel, program]], cc: [{ time, channel, controller, value }] }
//                                                                     out { type: 'audio', id, L, R, ms }
let synth = null, mod = null, fontData = []
let queue = Promise.resolve()
self.onmessage = e => { queue = queue.then(() => handle(e.data)).catch(err => self.postMessage({ type: 'error', id: e.data.id, message: err.message || String(err) })) }

async function handle(m) {
  if (m.type === 'init') {
    const t0 = performance.now()
    mod = await import(`${m.vendor}/oxisynth/oxisynth.js`)
    await mod.default()
    fontData = []
    for (const url of m.fonts) {
      const res = await fetch(url)
      if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`)
      fontData.push(new Uint8Array(await res.arrayBuffer()))
    }
    self.postMessage({ type: 'ready', ms: performance.now() - t0 })
  } else if (m.type === 'render') {
    const t0 = performance.now()
    const sr = m.sr
    // a fresh synth per render so no state (pedal, programs, tails) leaks between renders
    synth?.free?.()
    synth = new mod.OxiSynthRaw(sr)
    for (const d of fontData) synth.add_soundfont(d)
    for (let ch = 0; ch < 16; ch++) { synth.program_change(ch, 0); synth.control_change(ch, 7, 110) }
    for (const [ch, p] of m.programs || []) synth.program_change(ch, p)
    const ev = []
    for (const n of m.notes) {
      const ch = n.channel ?? 0
      ev.push({ f: Math.round(n.on * sr), k: 2, ch, a: n.pitch, b: Math.max(1, Math.min(127, Math.round(n.velocity * 127))) })
      ev.push({ f: Math.round(Math.max(n.on + 0.01, n.off) * sr), k: 0, ch, a: n.pitch })
    }
    for (const c of m.cc || []) ev.push({ f: Math.round(c.time * sr), k: 1, ch: c.channel, a: c.controller, b: c.value })
    ev.sort((p, q) => p.f - q.f || p.k - q.k) // note-off < cc < note-on at the same frame
    const total = Math.ceil(m.duration * sr)
    const L = new Float32Array(total), R = new Float32Array(total)
    let f = 0, i = 0
    while (f < total) {
      while (i < ev.length && ev[i].f <= f) {
        const e = ev[i++]
        if (e.k === 2) synth.note_on(e.ch, e.a, e.b)
        else if (e.k === 0) synth.note_off(e.ch, e.a)
        else synth.control_change(e.ch, e.a, e.b)
      }
      const next = i < ev.length ? ev[i].f : Infinity
      const n = Math.min(total, next, f + 4096) - f
      const buf = synth.render(n)
      for (let j = 0; j < n; j++) { L[f + j] = buf[2 * j]; R[f + j] = buf[2 * j + 1] }
      f += n
    }
    self.postMessage({ type: 'audio', id: m.id, L, R, ms: performance.now() - t0 }, [L.buffer, R.buffer])
  }
}
