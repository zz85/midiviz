// A small drum machine for #040's demo source and browser test: a few bars of
// a style rendered to a mono buffer (synthesised kick, snare, hats, rim and a
// bass that changes note every bar), looped by the page. No soundfont, so it starts instantly.
//
// renderLoop(style, bpm, sr, bars) → { samples, beats (s), downbeats (s), seconds, meter }

const STYLES = {
  rock:    { meter: 4, steps: 4, kick: 'x.......x.o.....', snare: '....x.......x...', hat: 'o.o.o.o.o.o.o.o.', bass: [0, 2.5] },
  house:   { meter: 4, steps: 4, kick: 'x...x...x...x...', snare: '....x.......x...', hat: '..o...o...o...o.', bass: [0.5, 1.5, 2.5, 3.5] },
  funk:    { meter: 4, steps: 4, kick: 'x..o..o...x..o..', snare: '....x..o.o..x...', hat: 'oooooooooooooooo', bass: [0, 0.75, 1.5, 2.5, 3.5] },
  shuffle: { meter: 4, steps: 4, swing: 2, kick: 'x.......x.......', snare: '....x.......x...', hat: 'o.o.o.o.o.o.o.o.', bass: [0, 1, 2, 3] },
  waltz:   { meter: 3, steps: 4, kick: 'x...........', snare: '....o...o...', hat: 'o...o...o...', bass: [0] },
  sixeight:{ meter: 2, steps: 3, kick: 'x.....', snare: '...x..', hat: 'oooooo', bass: [0, 1] },
  bossa:   { meter: 4, steps: 4, kick: 'x..ox..ox..ox..o', rim: 'x..x..x...x..x..', hat: 'oooooooooooooooo', bass: [0, 1.5, 2, 3.5] },
}
export const DEMO_STYLES = Object.keys(STYLES)

function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296 } }

export function renderLoop(style = 'rock', bpm = 120, sr = 48000, bars = 4) {
  const st = STYLES[style] || STYLES.rock
  const R = rng(bpm * 7 + style.length)
  const beat = 60 / bpm, meter = st.meter, steps = st.steps
  const seconds = bars * meter * beat
  const n = Math.round(seconds * sr), out = new Float32Array(n)
  const swing = st.swing || 1, q = swing / (1 + swing)
  const stepPos = s => steps === 4 ? [0, q / 2, q, q + (1 - q) / 2][s] : s / steps
  const add = (t, fn, len) => { const i0 = Math.round(t * sr), L = Math.round(len * sr); for (let i = 0; i < L; i++) { const j = (i0 + i) % n; out[j] += fn(i / sr) } }
  const kick = v => t => v * Math.sin(2 * Math.PI * (45 * t + 90 * (1 - Math.exp(-t * 30)) / 30)) * Math.exp(-t * 9)
  const noise = () => R() * 2 - 1
  const snare = v => { let lp = 0; return t => { const w = noise(); lp += 0.5 * (w - lp); return v * (0.55 * (w - lp) * Math.exp(-t * 18) + 0.4 * Math.sin(2 * Math.PI * 190 * t) * Math.exp(-t * 25)) } }
  const hat = v => { let p = 0; return t => { const w = noise(); const h = w - p; p = w; return v * 0.35 * h * Math.exp(-t * 60) } }
  const rim = v => t => v * 0.5 * Math.sin(2 * Math.PI * 1700 * t) * Math.exp(-t * 90)
  // a bass with harmonics (as a real one has), so its notes reach the chroma range
  const bass = (f, v, len) => t => {
    let y = 0; for (let h = 1; h <= 4; h++) y += Math.sin(2 * Math.PI * h * f * t) / (h * h)
    return v * 0.3 * y * Math.min(1, t * 60) * Math.exp(-t * 2.5) * (t < len ? 1 : Math.exp(-(t - len) * 60))
  }
  const roots = [55, 55 * 2 ** (8 / 12), 55 * 2 ** (3 / 12), 55 * 2 ** (10 / 12)]
  const beats = [], downbeats = []
  for (let bar = 0; bar < bars; bar++) {
    for (let k = 0; k < meter; k++) { beats.push((bar * meter + k) * beat); if (!k) downbeats.push(bar * meter * beat) }
    const t0 = bar * meter * beat
    for (const [name, fn, len] of [['kick', kick, 0.4], ['snare', snare, 0.25], ['hat', hat, 0.08], ['rim', rim, 0.05]]) {
      const pat = st[name]; if (!pat) continue
      for (let i = 0; i < pat.length; i++) {
        if (pat[i] === '.') continue
        const t = t0 + (Math.floor(i / steps) + stepPos(i % steps)) * beat + (R() - 0.5) * 0.006
        add(Math.max(0, t), fn((pat[i] === 'x' ? 0.9 : 0.55) * (0.9 + 0.2 * R())), len)
      }
    }
    for (const p of st.bass) add(t0 + p * beat, bass(roots[bar % 4], 0.8, beat * 0.8), beat * 1.2)
  }
  let m = 0; for (let i = 0; i < n; i++) m = Math.max(m, Math.abs(out[i]))
  for (let i = 0; i < n; i++) out[i] *= 0.7 / m
  return { samples: out, beats, downbeats, seconds, meter, sub: steps === 3 ? 3 : 2, swing }
}
