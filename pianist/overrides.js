// Hand-track overrides: sparse curves over the song that the studio draws (ui/track-editor.js)
// and the rig adds to what it bakes and plans. Each curve is a list of keyframes, [t, v] with t
// in seconds of song time and v in cm or in a unit of its own, read as a smooth line through
// them (monotone cubic) and 0 outside the first and last. The rig asks `at(name, t)` each frame:
//
//   const ov = createOverrides()               // pianist/rig.js and hand-driver.js read it
//   ov.at('liftL', t)   // cm added to the left wrist's height over the keys
//   ov.at('liftR', t)   // the right
//   ov.at('lean', t)    // added to her forward lean (the rig's unit: ~0.1 is a clear nod forward)
//   ov.set('liftL', [[12, 0], [14, 3], [16, 0]]); ov.clear('liftL')
//   ov.toText() / ov.fromText(text)   // the address bar's form: liftL:12,0;14,3;16,0|lean:...
//
// CURVES lists each with its label, unit and range for the editor. The text form keeps two
// decimals of t and v; a curve with no keyframes is left out.

export const CURVES = {
  liftL: { label: 'Left wrist lift', unit: 'cm', min: -4, max: 12 },
  liftR: { label: 'Right wrist lift', unit: 'cm', min: -4, max: 12 },
  lean: { label: 'Lean forward', unit: '', min: -0.4, max: 0.6 },
}

export function createOverrides() {
  const curves = {}        // name -> [[t, v], ...] sorted by t
  const slopes = {}        // name -> tangents, for the interpolation
  const subs = new Set()

  function prepare(name) {
    const k = curves[name]
    if (!k || k.length < 2) { slopes[name] = null; return }
    // Fritsch-Carlson monotone tangents: no overshoot between the keyframes
    const n = k.length, d = [], m = []
    for (let i = 0; i < n - 1; i++) d.push((k[i + 1][1] - k[i][1]) / Math.max(1e-6, k[i + 1][0] - k[i][0]))
    m[0] = d[0]; m[n - 1] = d[n - 2]
    for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2
    slopes[name] = m
  }
  function at(name, t) {
    const k = curves[name]
    if (!k || !k.length) return 0
    if (k.length === 1) return Math.abs(t - k[0][0]) < 1e-6 ? k[0][1] : 0
    if (t <= k[0][0] || t >= k[k.length - 1][0]) return 0
    let i = 0
    while (i < k.length - 2 && t > k[i + 1][0]) i++
    const [t0, v0] = k[i], [t1, v1] = k[i + 1], m = slopes[name]
    const h = t1 - t0, s = (t - t0) / h, s2 = s * s, s3 = s2 * s
    return (2 * s3 - 3 * s2 + 1) * v0 + (s3 - 2 * s2 + s) * h * m[i] + (-2 * s3 + 3 * s2) * v1 + (s3 - s2) * h * m[i + 1]
  }
  const notify = () => { for (const f of subs) f() }
  const api = {
    at,
    get(name) { return (curves[name] || []).map(p => [...p]) },
    set(name, keys) {
      const k = (keys || []).map(([t, v]) => [+t, +v]).filter(([t, v]) => Number.isFinite(t) && Number.isFinite(v)).sort((a, b) => a[0] - b[0])
      // (two keys at one time: the later given wins)
      const out = []; for (const p of k) { if (out.length && Math.abs(out[out.length - 1][0] - p[0]) < 1e-6) out[out.length - 1] = p; else out.push(p) }
      if (out.length) curves[name] = out; else delete curves[name]
      prepare(name); notify(); return api
    },
    clear(name) { if (name) delete curves[name]; else for (const n of Object.keys(curves)) delete curves[n]; notify(); return api },
    names: () => Object.keys(curves),
    empty: () => !Object.keys(curves).length,
    subscribe(f) { subs.add(f); return () => subs.delete(f) },
    toText() {
      const f = x => (+x.toFixed(2)).toString()
      return Object.entries(curves).filter(([, k]) => k.length).map(([n, k]) => `${n}:${k.map(([t, v]) => f(t) + ',' + f(v)).join(';')}`).join('|')
    },
    fromText(text) {
      for (const n of Object.keys(curves)) delete curves[n]
      for (const part of String(text || '').split('|')) {
        const i = part.indexOf(':'); if (i < 0) continue
        const name = part.slice(0, i); if (!CURVES[name]) continue
        curves[name] = []
        api.set(name, part.slice(i + 1).split(';').map(s => s.split(',').map(Number)).filter(p => p.length === 2))
      }
      notify(); return api
    },
  }
  return api
}
