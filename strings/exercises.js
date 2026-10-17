// Exercises with known fingerings (Experiment #033): the oracles of
// research/01_violinist_rules.md §6 and §11.3, and a few melodies for the page.
//
// Every exercise: { id, title, suite, instrument, mode?, notes, expect?: [tokens[]] }
// Tokens are string letter + finger ("A3"), optionally "@position" ("A1@4"),
// "X|Y" for either, "*" for any. expect lists every accepted fingering.

import { parseNote } from './fingering.js'

const P = p => (typeof p === 'string' ? parseNote(p) : p)

/** A line: pitches with one duration (s) or a list of durations. */
export function line(pitches, { dur = 0.3, legato = 0.95, start = 0 } = {}) {
  const out = []
  let t = start
  pitches.forEach((p, i) => {
    const d = Array.isArray(dur) ? dur[i] : dur
    if (p != null) for (const q of [].concat(p)) out.push({ pitch: P(q), on: t, off: t + d * legato, velocity: 0.75 })
    t += d
  })
  return out
}
/** "D5:1 G4:.5 …" with a beat length in seconds; "+" joins a chord, "r" is a rest. */
export function melody(text, beat = 0.5) {
  const ps = [], ds = []
  for (const tok of text.trim().split(/\s+/)) {
    const [body, len = '1'] = tok.split(':')
    ps.push(/^r$/i.test(body) ? null : body.split('+'))
    ds.push(+len * beat)
  }
  return line(ps, { dur: ds })
}
const T = s => s.trim().split(/\s+/)

const G_MAJOR_3 = [55, 57, 59, 60, 62, 64, 66, 67, 69, 71, 72, 74, 76, 78, 79, 81, 83, 84, 86, 88, 90, 91]
const A_MAJOR_3 = [57, 59, 61, 62, 64, 66, 68, 69, 71, 73, 74, 76, 78, 80, 81, 83, 85, 86, 88, 90, 92, 93]
const C_MAJOR_3 = [60, 62, 64, 65, 67, 69, 71, 72, 74, 76, 77, 79, 81, 83, 84, 86, 88, 89, 91, 93, 95, 96]
const D_MAJOR_3 = [62, 64, 66, 67, 69, 71, 73, 74, 76, 78, 79, 81, 83, 85, 86, 88, 90, 91, 93, 95, 97, 98]

export function exercises() {
  const ex = []
  const add = (id, title, notes, expect, extra = {}) => ex.push({ id, title, notes, expect: expect && expect.map(e => (typeof e === 'string' ? T(e) : e)), suite: 'core', instrument: 'violin', ...extra })

  // ── first position (research 01 §6.1, §6.2) ──
  add('g1-up', 'G major, 1 octave up', line([55, 57, 59, 60, 62, 64, 66, 67]), ['G0 G1 G2 G3 D0 D1 D2 D3'])
  add('g1-down', 'G major, 1 octave down (4 instead of open D)', line([67, 66, 64, 62, 60, 59, 57, 55]), ['D3 D2 D1 G4 G3 G2 G1 G0'])
  add('d1-updown', 'D major, 1 octave up and down', line([62, 64, 66, 67, 69, 71, 73, 74, 73, 71, 69, 67, 66, 64, 62]), ['D0 D1 D2 D3 A0 A1 A2 A3 A2 A1 D4 D3 D2 D1 D0|G4'])
  add('a1-up', 'A major, 1 octave up', line([69, 71, 73, 74, 76, 78, 80, 81]), ['A0 A1 A2 A3 E0 E1 E2 E3'])
  add('c-1st', 'C major in 1st position (low 2 on D and A)', line([60, 62, 64, 65, 67, 69, 71, 72, 74]), ['G3 D0 D1 D2 D3 A0 A1 A2 A3'])
  add('arp-g', 'G major arpeggio, 2 octaves', line([55, 59, 62, 67, 71, 74, 79], { dur: 0.35 }), ['G0 G2 D0 D3 A1 A3 E2'])
  add('ds-sharp', 'D♯ by 4 on the lower string (B C D♯)', line([59, 60, 63, 64], { dur: 0.3 }), ['G2 G3 G4 D1'])
  add('stay-a', 'Stay on the A string (no single-note crossing)', line([72, 74, 76, 74, 72], { dur: 0.5 }), ['A2 A3 A4 A3 A2'])
  add('fast-open', 'Fast notes take the open E', line([69, 71, 73, 74, 76, 78], { dur: 0.1, legato: 0.6 }), ['A0 A1 A2 A3 E0 E1'])
  add('climax', 'Long climax on E5: 4th finger, not open E', line([69, 71, 73, 74, 76, 74, 73], { dur: [0.5, 0.5, 0.5, 0.5, 2, 0.5, 1] }), ['* A1 A2 A3 A4 A3 A2'])
  add('twinkle', 'Twinkle (Suzuki, beginner: 1st position, open strings)', melody('A4 A4 E5 E5 F#5 F#5 E5:2 D5 D5 C#5 C#5 B4 B4 A4:2', 0.5),
    ['A0 A0 E0 E0 E1 E1 E0 A3 A3 A2 A2 A1 A1 A0'], { mode: 'beginner' })
  add('chrom-g', 'Chromatic G3–D4 (sliding or one finger per semitone)', line([55, 56, 57, 58, 59, 60, 61, 62], { dur: 0.3 }),
    ['G0 G1 G1 G2 G2 G3 G3 D0', 'G0 G1 G1 G2 G2 G3 G4 D0', 'G0 G1 G2 G1 G2 G3 G4 D0', 'G0 G1 G2 G3 G2 G3 G4 D0'])

  // ── double stops and chords (research 01 §7) ──
  add('ds-octave', 'Octave E4+E5 (1–4)', line([[64, 76]], { dur: 1 }), ['D1 A4'])
  add('ds-fifth', 'Fifth E4+B4 (one finger across)', line([[64, 71]], { dur: 1 }), ['D1 A1'])
  add('ds-third', 'Third E4+G4 (2nd or 3rd position)', line([[64, 67]], { dur: 1 }), ['G4 D2', 'G3 D1'])
  add('ds-thirds', 'Thirds C4/E4 → D4/F♯4 (3-1, 4-2)', line([[60, 64], [62, 66]], { dur: 0.6 }), ['G3 D1 G4 D2'])
  add('ds-sixth', 'Sixth A3+F♯4 (1–2)', line([[57, 66]], { dur: 1 }), ['G1 D2'])
  add('chord-g', 'G major chord (four strings)', line([[55, 62, 71, 79]], { dur: 1 }), ['G0 D0 A1 E2'])
  add('chord-d', 'D major chord D4 A4 F♯5', line([[62, 69, 78]], { dur: 1 }), ['D0 A0 E1'])

  // ── three-octave scales (research 01 §6.3 Galamian, §6.4 Cooper) ──
  const sc = { suite: 'scales' }
  add('g3-up', 'G major, 3 octaves up', line(G_MAJOR_3, { dur: 0.3 }), [
    'G0 G1 G2 G3 D0 D1 D2 D3 A0 A1 A2 A3@1 A1@4 A2@4 A3@4 A4@4 E1@4 E2@4 E1@6 E2@6 E3@6 E4@6',
    'G0 G1 G2 G3 G4 D1 D2 D1@3 D2 D3 D4 A1@3 A2 A3 A4 E1@3 E2 E1@5 E2 E3 E4 E4',
  ], sc)
  add('g3-down', 'G major, 3 octaves down', line([...G_MAJOR_3].reverse(), { dur: 0.3 }), [
    'E4@6 E3@6 E2@6 E1@6 E2@4 E1@4 A4@4 A3@4 A2@4 A1@4 A3@1 A2 A1 D4 D3 D2 D1 G4 G3 G2 G1 G0',
  ], sc)
  add('a3-up', 'A major, 3 octaves up', line(A_MAJOR_3, { dur: 0.3 }), [
    'G1@1 G2 G3 D0|G4 D1 D2 D3 D4|A0 A1 A2 A1@3 A2 A3 A4@3 E1@3 E2 E1@5 E2 E1@7 E2 E3 E4@7',
    'G1 G2 G3 G4 D1 D2 D3 D4 A1 A2 A1 A2 A3 A4 E1 E2 E3 E1 E2 E3 E4 E4',
  ], sc)
  add('c3-up', 'C major, 3 octaves up', line(C_MAJOR_3, { dur: 0.3 }), [
    'G1@3 G2 G3 G4 D1@3 D2 D3 D4 A1@3 A2 A3 A4 E1@3 E2 E1@5 E2 E1@7 E2 E1@9 E2 E3 E4',
  ], sc)
  add('d3-up', 'D major, 3 octaves up', line(D_MAJOR_3, { dur: 0.3 }), [
    'G2@3 G3 G4 D1@3 D2 D3 D4 A1@3 A2 A3 A4 E1@3 E2 E1@5 E2 E1@7 E2 E1@9 E2 E3 E4 E4',
    'D0 D1 D2 D3 D4 A1 A2 A1 A2 A3 A4 E1 E2 E3 E1 E2 E3 E1 E2 E3 E4 E4',
  ], sc)

  // ── viola and cello ──
  add('viola-c1', 'Viola: C major, 1 octave', line([48, 50, 52, 53, 55, 57, 59, 60]), ['C0 C1 C2 C3 G0 G1 G2 G3'], { instrument: 'viola' })
  add('viola-a2', 'Viola: A major, 2 octaves on G, D, A', line([57, 59, 61, 62, 64, 66, 68, 69, 71, 73, 74, 76, 78, 80, 81], { dur: 0.3 }),
    ['G1 G2 G3 G4 D1 D2 D3 D4|A0 A1 A2 A3 A1@4 A2 A3 A4', 'G1 G2 G3 G4 D1 D2 D3 D1 D2 D3 D4 A1 A2 A3 A1'], { instrument: 'viola' })
  add('viola-ds', 'Viola: octave A3+A4 (1–4)', line([[57, 69]], { dur: 1 }), ['G1 D4'], { instrument: 'viola' })
  add('cello-c1', 'Cello: C major, 1 octave (1-3-4 frame)', line([36, 38, 40, 41, 43, 45, 47, 48]), ['C0 C1 C3 C4 G0 G1 G3 G4'], { instrument: 'cello' })

  // ── double bass (research 04 §4, §7.4: Silliman's chart, Essential Elements, Freides, Petracchi) ──
  const bass = { instrument: 'bass' }
  add('bass-1st', 'Bass: 1st position on G (Simandl 1-2-4)', line([45, 46, 47], { dur: 0.4 }), ['G1@I G2@I G4@I'], bass)
  add('bass-half', 'Bass: half position on A (B♭ B C)', line([34, 35, 36], { dur: 0.4 }), ['A1@½ A2@½ A4@½'], bass)
  add('bass-3rd', 'Bass: 3rd position on G (C C♯ D)', line([48, 49, 50], { dur: 0.4 }), ['G1@III G2@III G4@III'], bass)
  add('bass-d', 'Bass: D major, 1 octave (shift to III)', line([38, 40, 42, 43, 45, 47, 49, 50], { dur: 0.4 }), ['D0 D1@I D4@I G0 G1@I G4@I G2@III G4@III'], bass)
  add('bass-d-beg', 'Bass: D major in 1st position (beginner, crossing to A)', line([38, 40, 42, 33, 35, 37, 38], { dur: 0.4 }), ['D0 D1 D4 A0 A1 A4 D0'], { ...bass, mode: 'beginner' })
  add('bass-g', 'Bass: G major, 1 octave from G1', line([31, 33, 35, 36, 38, 40, 42, 43], { dur: 0.4 }), ['E2 A0 A1 A2 D0 D1 D4 G0', 'E2 A0 A1 A2 D0 D1 D4 D4'], bass)
  add('bass-4th', 'Bass: 4th position at the neck heel (E♭ E)', line([51, 52], { dur: 0.4 }), ['G2@IV G4@IV'], bass)
  add('bass-crook', 'Bass: 1-2-3 at the crook of the neck (G A♭)', line([55, 56], { dur: 0.4 }), ['G2@VI½ G3@VI½', 'G1 G2', 'GT G1'], bass)
  add('bass-thumb', 'Bass: thumb position (G A B C)', line([55, 57, 59, 60], { dur: 0.4 }), ['GT G1 G2 G3', 'GT GT G2 G3'], bass)
  add('bass-thumb3', 'Bass: thumb position (G A B♭)', line([55, 57, 58], { dur: 0.4 }), ['GT G1 G2'], bass)

  // ── melodies (no fixed answer) ──
  const mel = { suite: 'melodies' }
  add('ode', 'Beethoven – Ode to Joy', melody('F#4 F#4 G4 A4 A4 G4 F#4 E4 D4 D4 E4 F#4 F#4:1.5 E4:.5 E4:2 F#4 F#4 G4 A4 A4 G4 F#4 E4 D4 D4 E4 F#4 E4:1.5 D4:.5 D4:2', 0.45), null, mel)
  add('minuet', 'Petzold – Minuet in G (Suzuki 1)', melody('D5 G4:.5 A4:.5 B4:.5 C5:.5 D5 G4 G4 E5 C5:.5 D5:.5 E5:.5 F#5:.5 G5 G4 G4 C5 D5:.5 C5:.5 B4:.5 A4:.5 B4 C5:.5 B4:.5 A4:.5 G4:.5 F#4 G4:.5 A4:.5 B4:.5 G4:.5 A4:3 D5 G4:.5 A4:.5 B4:.5 C5:.5 D5 G4 G4 E5 C5:.5 D5:.5 E5:.5 F#5:.5 G5 G4 G4 C5 D5:.5 C5:.5 B4:.5 A4:.5 B4 C5:.5 B4:.5 A4:.5 G4:.5 A4 B4:.5 A4:.5 G4:.5 F#4:.5 G4:3', 0.42), null, mel)
  add('lullaby', 'Brahms – Lullaby', melody('E5:.5 E5:.5 G5:2 E5:.5 E5:.5 G5:2 E5:.5 G5:.5 C6 B5:1.5 A5:.5 A5 G5 D5:.5 E5:.5 F5 D5 D5:.5 E5:.5 F5:2 D5:.5 F5:.5 B5:.5 A5:.5 G5 B5 C6:3', 0.5), null, mel)
  add('gsharp-etude', 'Étude: broken thirds across strings', line([55, 59, 57, 60, 59, 62, 60, 64, 62, 66, 64, 67, 66, 69, 67, 71, 69, 72, 71, 74, 72, 76, 74, 78, 76, 79], { dur: 0.16 }), null, mel)
  add('ds-scale', 'Double stops: thirds in G major', line([[59, 62], [60, 64], [62, 66], [64, 67], [66, 69], [67, 71], [69, 72], [71, 74], [72, 76], [74, 78]], { dur: 0.6 }), null, mel)
  add('bass-walk', 'Bass: walking line (blues in F)', melody('F2 A2 C3 D3 Bb2 D3 F3 Ab2 F2 A2 C3 Eb3 D3 C3 Bb2 A2 Bb2 D3 F3 G3 Ab3 G3 F3 D3 C3 E3 G3 Bb3 A3 F3 C3 A2', 0.42), null, { ...mel, instrument: 'bass' })
  add('bass-solo', 'Bass: up to thumb position on G', line([43, 45, 47, 48, 50, 52, 54, 55, 57, 59, 60, 62, 60, 59, 57, 55, 54, 52, 50, 48, 47, 45, 43], { dur: 0.32 }), null, { ...mel, instrument: 'bass' })
  add('bach-chords', 'Chords: G – C – D – G', line([[55, 62, 71, 79], [55, 64, 72, 79], [57, 66, 74, 78], [55, 62, 71, 79]], { dur: 1 }), null, mel)
  return ex
}

/** Fraction of the closest accepted fingering that matches (alternatives "X|Y", wildcard "*", "@pos"). */
export function bestMatch(got, accepted) {
  let best = 0, exact = false
  for (const want of accepted) {
    let m = 0
    for (let i = 0; i < want.length; i++) if (tokenOk(got[i], want[i])) m++
    if (m === want.length && got.length === want.length) exact = true
    best = Math.max(best, m / want.length)
  }
  return { agree: best, exact }
}
export function tokenOk(g, w) {
  if (w === '*') return true
  if (!g) return false
  return w.split('|').some(alt => {
    const [ws, wp] = alt.split('@'), [gs, gp] = g.split('@')
    return ws === gs && (!wp || wp === gp)
  })
}
