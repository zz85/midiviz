// Ground truth for #053: the viola notes of Sibelius's Symphony No. 2 from the pawchestra MIDI
// files, one list per movement, in reading order (onset, then low to high), each with its bar.
//   import { violaTruth } from './truth.mjs'   ->  [{ mvt, bar, beat, tick, midi, tracks }]
// The viola part's divisi lines are the Viola 2..4 tracks: their notes are merged with Viola 1's
// at the same onset, and a pitch two tracks share at one onset counts once (it is printed once).
import { readFileSync } from 'node:fs'

// Copies of pawchestra/demos/src/sibelius-2-*.mid (sequenced by Jack Gilbert), as of 7 Nov 2026.
export const MIDI_DIR = new URL('./midi/', import.meta.url)
// The second movement's file has its viola tracks an octave low (Viola 1 spans MIDI 32-68, below
// the instrument's C3 = 48 string, and its heads match the printed part only shifted up an
// octave: 709 of 955 against 0 as written), so its notes are moved up by `transpose`.
export const MOVEMENTS = [
  { mvt: 'I', file: 'sibelius-2-1.mid', transpose: 0, tracks: ['Viola 1', 'Viola 2', 'Viola 3', 'Viola 4'] },
  { mvt: 'II', file: 'sibelius-2-2.mid', transpose: 12, tracks: ['Viola 1', 'Viola 2'] },
  { mvt: 'III-IV', file: 'sibelius-2-3-4.mid', transpose: 0, tracks: ['Viola 1', 'Viola 2'] },
]

// a bare MIDI reader: note-ons, track names and time signatures. Plain loops with one index,
// no closures: node 26.7 once in about 20 runs misparsed the tracks after the 26th with a
// closure that advanced the index (names lost, a note short), which the check in violaTruth catches.
export function readMidi(b) {
  const nt = b.readUInt16BE(10), ppq = b.readUInt16BE(12)
  const tracks = [], sigs = []
  let p = 14
  for (let t = 0; t < nt; t++) {
    const len = b.readUInt32BE(p + 4), end = p + 8 + len
    p += 8
    let tick = 0, rs = 0, name = ''; const notes = []
    while (p < end) {
      let v = 0, c
      do { c = b[p++]; v = (v << 7) | (c & 127) } while (c & 128)
      tick += v
      let s = b[p]
      if (s & 128) { p++; if (s < 0xf0) rs = s } else s = rs
      if (s === 0xff) {
        const ty = b[p++]
        let l = 0; do { c = b[p++]; l = (l << 7) | (c & 127) } while (c & 128)
        if (ty === 3 && !name) name = b.toString('latin1', p, p + l)
        if (ty === 0x58) sigs.push({ tick, num: b[p], den: 1 << b[p + 1] })
        p += l
      } else if (s === 0xf0 || s === 0xf7) {
        let l = 0; do { c = b[p++]; l = (l << 7) | (c & 127) } while (c & 128)
        p += l
      } else {
        const h = s & 0xf0, d1 = b[p], d2 = h === 0xc0 || h === 0xd0 ? 0 : b[p + 1]
        p += h === 0xc0 || h === 0xd0 ? 1 : 2
        if (h === 0x90 && d2 > 0) notes.push({ tick, midi: d1 })
      }
    }
    p = end
    tracks.push({ name, notes })
  }
  sigs.sort((a, b) => a.tick - b.tick)
  return { ppq, tracks, sigs }
}

// bar numbers from the time signatures: bar 1 starts at tick 0
export function barOf(sigs, ppq) {
  const spans = []
  for (let i = 0; i < sigs.length; i++) {
    const s = sigs[i], len = (ppq * 4 * s.num) / s.den, end = sigs[i + 1]?.tick ?? Infinity
    const bar0 = i ? spans[i - 1].bar0 + Math.round((s.tick - spans[i - 1].tick) / spans[i - 1].len) : 1
    spans.push({ tick: s.tick, end, len, bar0, num: s.num, den: s.den })
  }
  return tick => {
    const sp = spans.find(s => tick >= s.tick && tick < s.end) || spans[spans.length - 1]
    const k = (tick - sp.tick) / sp.len
    return { bar: sp.bar0 + Math.floor(k), beat: (k - Math.floor(k)) * sp.num, sig: `${sp.num}/${sp.den}` }
  }
}

export function violaTruth({ dir = MIDI_DIR, instrument = /^viola/i } = {}) {
  const out = []
  for (const { mvt, file, transpose = 0, tracks: expected } of MOVEMENTS) {
    const { ppq, tracks, sigs } = readMidi(readFileSync(new URL(file, dir)))
    const found = tracks.filter(t => instrument.test(t.name)).map(t => t.name)
    if (expected && instrument.source === '^viola' && found.join() !== expected.join()) throw new Error(`${file}: viola tracks ${found.join(', ')}, expected ${expected.join(', ')}`)
    const bar = barOf(sigs, ppq)
    const byOnset = new Map()
    for (const t of tracks) if (instrument.test(t.name)) for (const n of t.notes) {
      let m = byOnset.get(n.tick); if (!m) byOnset.set(n.tick, m = new Map())
      const k = n.midi + transpose, e = m.get(k); if (e) e.tracks.push(t.name); else m.set(k, { tracks: [t.name] })
    }
    for (const tick of [...byOnset.keys()].sort((a, b) => a - b)) {
      const { bar: b, beat, sig } = bar(tick)
      for (const midi of [...byOnset.get(tick).keys()].sort((a, b) => a - b)) out.push({ mvt, bar: b, beat: +beat.toFixed(3), sig, tick, midi, tracks: byOnset.get(tick).get(midi).tracks })
    }
  }
  return out
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  const t = violaTruth()
  console.log('notes', t.length)
  for (const m of MOVEMENTS) { const n = t.filter(x => x.mvt === m.mvt); console.log(m.mvt, n.length, 'bars', n[0]?.bar, '-', n[n.length - 1]?.bar, 'divisi', n.filter(x => !x.tracks.includes('Viola 1')).length) }
  console.log(t.slice(0, 12).map(x => `${x.mvt} b${x.bar}+${x.beat} ${x.midi}`).join('\n'))
}
