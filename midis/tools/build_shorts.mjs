// Build the score-derived MIDI files of the Shorts season (shorts/README.md)
// from LilyPond sources, with a light, deterministic performance on top.
//
//   node midis/tools/build_shorts.mjs [id …]        (all pieces when none given)
//
// Sources: midis/shorts-src/*.ly (our own transcriptions of public-domain
// scores, CC0) and Knute Snortum's LilyPond edition of Scriabin's Op. 11
// (CC BY-SA 4.0, IMSLP #887473), unzipped into strings/data/IMSLP/shorts/
// scriabin (git-ignored; fetch it with ../random-sketches/vibes/scoreshift/
// tools/imslp_fetch.mjs strings/data/IMSLP/shorts 887473 and unzip).
//
// The notes and their written lengths come from the score through
// strings/lilypond.js. On top of that, per piece (PIECES below):
//   - tempo: the chosen beat, a final ritardando and holds (fermatas) as a
//     real tempo map, so bar lines in the MIDI file stay on the score's bars
//     (the liner notes and the Shorts clip picker count bars from it)
//   - loudness: the score's dynamics (or a per-bar map where the source keeps
//     them in a separate Dynamics staff), hairpins as linear ramps between
//     levels, the top of the right hand a little forward, the left hand back,
//     a slight lift on downbeats, a small seeded variation
//   - timing: a few milliseconds of seeded spread inside chords
//   - pedal: off, per bar, or per beat group (CC 64 lifted just after each
//     change and pressed again)
// Two tracks: Piano right / Piano left.
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { readLilyPond, readLilyPondFiles } from '../../strings/lilypond.js'

const here = fileURLToPath(new URL('.', import.meta.url))
const root = here + '../../'
const { Midi } = createRequire(import.meta.url)(root + 'tonejs-midi.js')
const SRC = root + 'midis/shorts-src/'
const DATA = root + 'strings/data/IMSLP/shorts/'
const PPQ = 480

export const PIECES = {
  'new-doll': {
    out: 'midis/tchai_op39_9_new_doll.mid',
    title: 'Tchaikovsky: The New Doll, Op. 39 No. 9',
    credit: 'Transcribed for midiviz from the public-domain score (G. Schirmer, 1904, ed. Ruthardt). CC0.',
    ly: 'tchaikovsky-new-doll.ly',
    bpm: 88, rit: { from: 3 * 54 / 2, to: 0.72 }, hold: { last: 1.2 },
    pedal: 'none', meter: [[0, 3, 8]],
  },
  'baba-yaga': {
    out: 'midis/tchai_op39_20_baba_yaga.mid',
    title: 'Tchaikovsky: Baba Yaga, Op. 39 No. 20',
    credit: 'Transcribed for midiviz from the public-domain score (G. Schirmer, 1904, ed. Ruthardt). CC0.',
    ly: 'tchaikovsky-baba-yaga.ly',
    bpm: 168, rit: null, hold: { last: 0.6 },
    pedal: 'none', pickup: 1.5, meter: [[0, 6, 8]],
  },
  'scriabin-11-14': {
    out: 'midis/scriabin_op11_14.mid',
    title: 'Scriabin: Prelude in E-flat minor, Op. 11 No. 14',
    credit: 'From the LilyPond edition by Knute Snortum (IMSLP #887473), CC BY-SA 4.0.',
    lyFiles: { dir: DATA + 'scriabin/', main: 'prelude-op11-no14-individual.ly', parts: [0, 1] },
    // Presto, a five-eighth group (4. + 4) = 69, so an eighth = 345 a minute
    bpm: 172.5, rit: { from: 0.5 + 7.5 * 21, to: 0.8 }, hold: { last: 2.5 },
    pedal: 'group', groups: [1.5, 1, 1.5, 1, 1.5, 1], pickup: 0.5, meter: [[0, 15, 8]],
    // the edition's Dynamics staff, by bar (pickup = bar 0): level, or [from, to] for a hairpin
    dyn: {
      1: 'mf', 2: ['mf', 'f'], 3: ['f', 'mf'], 4: 'mf', 5: ['mf', 'f'], 6: ['f', 'ff'], 7: 'ff', 8: ['ff', 'mf'],
      9: 'f', 10: ['f', 'ff'], 11: ['f', 'ff'], 12: ['ff', 'f'], 13: ['f', 'ff'], 14: ['ff', 'fff'], 15: 'ff', 16: ['ff', 'mf'],
      17: ['p', 'f'], 18: ['mf', 'ff'], 19: ['f', 'ff'], 20: ['ff', 'fff'], 21: 'fff', 22: 'fff', 23: 'fff', 24: 'fff',
    },
  },
  'scriabin-11-15': {
    out: 'midis/scriabin_op11_15.mid',
    title: 'Scriabin: Prelude in D-flat major, Op. 11 No. 15',
    credit: 'From the LilyPond edition by Knute Snortum (IMSLP #887473), CC BY-SA 4.0.',
    lyFiles: { dir: DATA + 'scriabin/', main: 'prelude-op11-no15-individual.ly', parts: [0, 1] },
    // The first edition prints eighth = 80-76; Henle identifies quarter = 80-76 as intended.
    bpm: 80, rit: { from: 4 * 26, to: 0.76 }, hold: { last: 2.4 },
    pedal: 'bar', meter: [[0, 4, 4]],
    dyn: { 1: 'pp', 6: ['pp', 'mf'], 7: ['mf', 'p'], 9: 'mf', 13: ['mf', 'f'], 15: ['f', 'mp'], 16: ['mp', 'pp'], 17: 'pp' },
  },
  'old-french-song': {
    out: 'midis/tchai_op39_16_old_french_song.mid',
    title: 'Tchaikovsky: Old French Song, Op. 39 No. 16',
    credit: 'From the Mutopia Project edition typeset by David McNamara (Mutopia 2015/11/27-2080), public domain.',
    midi: 'tchaikovsky-old-french-song-source.mid',
    bpm: 70, rit: { from: 0.5 + 2 * 30, to: 0.82 }, hold: { last: 1.8 },
    pedal: 'bar', pickup: 0.5, meter: [[0, 2, 4]],
    dyn: { 0: 'p', 1: 'p', 8: 'pp', 17: 'p', 20: ['p', 'mf'], 22: 'mf', 23: ['mf', 'p'], 24: 'p' },
  },
  'grieg-arietta': {
    out: 'midis/grieg_op12_1_arietta.mid',
    title: 'Grieg: Arietta, Op. 12 No. 1',
    credit: 'New CC0 transcription from the public-domain C. F. Peters/Ruthardt edition (Sibley 1802/22702; IMSLP #336077), cross-checked with the 1867 Horneman incipit.',
    ly: 'grieg-arietta.ly',
    bpm: 44, rit: { from: 44, to: 0.82 }, hold: { last: 2.2 },
    pedal: 'bar', meter: [[0, 2, 4]],
    dyn: { 1: 'p', 5: 'mp', 9: 'p', 13: 'mp', 18: 'p', 23: 'pp' },
  },
  'amy-beach-secrets': {
    out: 'midis/amy_beach_op25_5_secrets.mid',
    title: 'Amy Beach: Secrets, Op. 25 No. 5',
    credit: 'New CC0 transcription from the public-domain 1894 Arthur P. Schmidt first edition (IMSLP #888038), cross-checked with Beach’s Library of Congress manuscript.',
    ly: 'amy-beach-secrets.ly',
    // Do not take the repeat: skip the first ending and continue through the second.
    skipRanges: [[124, 128]],
    bpm: 84, rit: { from: 4 * 29, to: 0.76 }, hold: { last: 2 },
    pedal: 'none', meter: [[0, 4, 4]],
    dyn: { 1: 'p', 6: ['p', 'mf'], 8: ['mf', 'p'], 10: ['p', 'mf'], 13: 'pp', 17: 'p', 22: 'f', 24: ['f', 'pp'], 25: 'pp', 28: ['pp', 'mf'], 30: ['mf', 'pp'], 32: 'pp' },
  },
  'ravel-prelude-m65': {
    out: 'midis/ravel_m65_prelude.mid',
    title: 'Ravel: Prelude in A minor, M. 65',
    credit: 'New CC0 transcription from Ray Alston’s CC0 edition (IMSLP #568194), cross-checked with the public-domain Durand 1913 first edition (IMSLP #918894).',
    ly: 'ravel-prelude-m65.ly',
    bpm: 60, tempoMap: [[0, 60], [42, 48], [45, 60], [66, 48], [78, 40]],
    rit: null, hold: { last: 2.5 }, pedal: 'bar', meter: [[0, 3, 4]],
    dyn: { 1: 'p', 6: ['p', 'mf'], 8: ['mf', 'p'], 10: 'pp', 11: ['pp', 'mf'], 12: ['mf', 'p'], 13: ['p', 'mf'], 15: ['mf', 'p'], 16: 'p', 20: ['p', 'f'], 23: ['f', 'pp'], 27: 'pp' },
  },
  'chaminade-idylle': {
    out: 'midis/chaminade_op126_1_idylle.mid',
    title: 'Chaminade: Idylle, Op. 126 No. 1',
    credit: 'Transcription from Michael Rivers’s 2022 edition (IMSLP #764920, CC BY 4.0), cross-checked with the public-domain Enoch 1907 first edition; transcription contribution CC0.',
    ly: 'chaminade-idylle.ly', dedupe: true,
    bpm: 96, tempoMap: [[0, 96], [91.5, 78], [97.5, 96], [136.5, 78]],
    rit: null, hold: { last: 2 }, pedal: 'group', groups: [1.5, 1.5], pickup: 1.5, meter: [[0, 6, 8]],
    dyn: { 0: 'p', 1: 'p', 5: ['p', 'mf'], 8: 'p', 16: 'f', 23: 'mf', 31: 'p', 33: 'p', 37: 'mf', 44: 'p', 48: 'pp' },
  },
  'lyadov-prelude': {
    out: 'midis/lyadov_op11_1_prelude.mid',
    title: 'Lyadov: Prelude in B minor, Op. 11 No. 1',
    credit: 'New CC0 transcription of the public-domain 1947 Muzgiz edition (IMSLP #462489); editorial fingerings omitted.',
    ly: 'lyadov-prelude-op11-1.ly',
    bpm: 70, tempoMap: [[0, 70], [78, 50], [80, 70], [110, 50], [112, 70]],
    rit: null, hold: { last: 2.5 }, pedal: 'bar', meter: [[0, 2, 4]],
    dyn: { 1: 'p', 4: ['p', 'mf'], 9: 'mf', 11: 'p', 17: 'mf', 19: 'p', 25: 'f', 27: ['p', 'mf'], 31: 'p', 37: 'f', 41: 'p', 51: 'mf', 53: ['p', 'mf'], 63: 'f', 69: 'p', 75: ['f', 'p'], 78: 'p' },
  },
  'staccatissimo': {
    out: 'midis/alkan_op63_2_staccatissimo.mid',
    title: 'Alkan: Le Staccatissimo, Op. 63 No. 2',
    credit: 'Transcribed for midiviz from the public-domain score (Esquisses, Richault, plate 13476). CC0.',
    ly: 'alkan-staccatissimo.ly',
    bpm: 152, rit: null, hold: { last: 0.8 },
    pedal: 'none', meter: [[0, 3, 8]],
  },
  // alternates with ready LilyPond sources on Mutopia (fetched into strings/data/IMSLP/shorts)
  'toccatina': {
    out: 'midis/alkan_op75_toccatina.mid',
    title: 'Alkan: Toccatina, Op. 75',
    credit: 'From the Mutopia Project edition typeset by tanukiyarou (Mutopia 2017/01/17-2163), CC BY-SA 4.0.',
    lyFiles: { dir: DATA + 'toccatina/toccatina-lys/', main: 'toccatina.ly', parts: [0, 1] },
    bpm: 184, rit: null, hold: { last: 0.6 },
    pedal: 'none', pickup: 0.25, meter: [[0, 2, 4]],
    // "Toujours p, sans nuances aucunes", then "f, subito, e sempre", then "Sempre pp" (bars approximate)
    dyn: { 0: 'p', 106: 'f', 126: 'pp' },
  },
  'consolation-1': {
    out: 'midis/liszt_s172_1_consolation.mid',
    title: 'Liszt: Consolation No. 1 in E major, S. 172',
    credit: 'From the Mutopia Project edition typeset by Ryan Prince, CC BY 3.0.',
    lyFiles: { dir: DATA + 'consolation1/', main: 'liszt-consolation-no1.ly', parts: [0, 1] },
    bpm: 66, rit: { from: 4 * 22, to: 0.7 }, hold: { last: 2.5 },
    pedal: 'bar', meter: [[0, 4, 4]],
    dyn: { 1: 'p', 9: ['p', 'mp'], 13: ['mp', 'mf'], 17: ['mf', 'p'], 21: 'pp' },
  },
  'berlin-preludio': {
    out: 'midis/liszt_s164g_berlin_preludio.mid',
    title: 'Liszt: Album-Leaf "Berlin Preludio", S. 164g',
    credit: 'Transcribed for midiviz from the edition by Aidan Modica (IMSLP #710207, CC0). CC0.',
    ly: 'liszt-berlin-preludio.ly',
    bpm: 72, rit: { from: 4, to: 0.75 }, hold: { last: 2 },
    pedal: 'bar', meter: [[0, 4, 4]], roll: 0.022,
  },
}

const LEVEL = { ppp: 22, pp: 34, p: 48, mp: 62, mf: 76, f: 90, ff: 104, fff: 116 }

// a small deterministic generator, seeded per piece
function rng(seed) { let s = seed >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296) }
const hash = s => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7)

function readNotes(cfg) {
  const out = []
  if (cfg.midi) {
    const midi = new Midi(readFileSync(SRC + cfg.midi))
    const tracks = midi.tracks.filter(t => t.notes.length)
    tracks.slice(0, 2).forEach((t, hand) => {
      for (const n of t.notes) {
        const q = n.ticks / midi.header.ppq, dur = n.durationTicks / midi.header.ppq
        out.push({ pitch: n.midi, q, on: q, off: q + dur, velocity: n.velocity, hand, art: {} })
      }
    })
    return { notes: out, bpmAt: () => 60 }
  }
  if (cfg.ly) {
    const text = readFileSync(SRC + cfg.ly, 'utf8')
    for (const part of [0, 1]) for (const n of readLilyPond(text, { part, graces: true }).notes) out.push({ ...n, hand: part })
    return { notes: out, bpmAt: readerTempo(readLilyPond(text, { part: 0, graces: true })) }
  }
  const { dir, main, parts } = cfg.lyFiles
  if (!existsSync(dir)) throw new Error(`missing source ${dir} (see the header of this file)`)
  const files = new Map()
  for (const f of readdirSync(dir)) if (/\.i?ly$/.test(f)) files.set(f, readFileSync(dir + f, 'utf8'))
  if (existsSync(dir + 'includes')) for (const f of readdirSync(dir + 'includes')) files.set('includes/' + f, readFileSync(dir + 'includes/' + f, 'utf8'))
  let first
  parts.forEach((p, hand) => { const r = readLilyPondFiles(files, { main, part: p, graces: true }); first ??= r; for (const n of r.notes) out.push({ ...n, hand }) })
  return { notes: out, bpmAt: readerTempo(first) }
}
// the reader's tempo at a time, to turn its seconds back into quarters
function readerTempo(r) { const T = r.tempo.slice().sort((a, b) => a.t - b.t); return t => { let b = T[0]?.bpm ?? 60; for (const x of T) if (x.t <= t + 1e-9) b = x.bpm; return b } }

export function build(id) {
  const cfg = PIECES[id]
  const read = readNotes(cfg)
  const bpmAt = read.bpmAt
  const performed = cfg.skipRanges ? read.notes.flatMap(n => {
    if (cfg.skipRanges.some(([from, to]) => n.q >= from - 1e-7 && n.q < to - 1e-7)) return []
    const shift = cfg.skipRanges.reduce((sum, [from, to]) => sum + (n.q >= to - 1e-7 ? to - from : 0), 0)
    return [{ ...n, q: n.q - shift }]
  }) : read.notes
  const notes = cfg.dedupe ? [...performed.reduce((m, n) => {
    const key = `${n.hand}:${n.q.toFixed(6)}:${n.pitch}`
    const old = m.get(key)
    if (!old) m.set(key, { ...n })
    else { old.off = Math.max(old.off, n.off); old.velocity = Math.max(old.velocity, n.velocity) }
    return m
  }, new Map()).values()] : performed
  const rand = rng(hash(id))
  const end = Math.max(...notes.map(n => n.q + (n.off - n.on) * bpmAt(n.on) / 60))
  const midi = new Midi()
  midi.header.name = cfg.title
  midi.header.meta.push({ type: 'text', text: cfg.credit, ticks: 0 })
  midi.header.meta.push({ type: 'text', text: 'Built by midiviz midis/tools/build_shorts.mjs', ticks: 0 })

  // tempo map: steady, then a ritardando in steps of an eighth, then a hold on the last chord
  const tempos = cfg.tempoMap?.length ? cfg.tempoMap.map(x => [...x]) : [[0, cfg.bpm]]
  if (cfg.rit) for (let q = cfg.rit.from; q < end; q += 0.5) {
    const f = Math.min(1, (q - cfg.rit.from) / Math.max(0.5, end - cfg.rit.from))
    tempos.push([q, cfg.bpm * (1 - (1 - cfg.rit.to) * f * f)])
  }
  const lastOn = Math.max(...notes.map(n => n.q))
  midi.header.tempos = tempos.map(([q, bpm]) => ({ ticks: Math.round(q * PPQ), bpm }))
  // meter: an optional pickup bar first, so bar numbers match the score
  const ts = []
  if (cfg.pickup) ts.push({ ticks: 0, timeSignature: Number.isInteger(cfg.pickup * 2) ? [cfg.pickup * 2, 8] : [Math.round(cfg.pickup * 4), 16] })
  for (const [q, n, d] of cfg.meter) ts.push({ ticks: Math.round((q + (cfg.pickup || 0)) * PPQ), timeSignature: [n, d] })
  midi.header.timeSignatures = ts
  midi.header.update()

  // loudness per note
  const barLen = cfg.meter[0][1] * 4 / cfg.meter[0][2]
  const barOf = q => cfg.pickup ? (q < cfg.pickup ? 0 : 1 + Math.floor((q - cfg.pickup) / barLen + 1e-9)) : 1 + Math.floor(q / barLen + 1e-9)
  const barStart = b => cfg.pickup ? (b === 0 ? 0 : cfg.pickup + (b - 1) * barLen) : (b - 1) * barLen
  const level = q => {
    if (!cfg.dyn) return null
    const b = barOf(q), d = cfg.dyn[b] ?? cfg.dyn[Object.keys(cfg.dyn).map(Number).filter(k => k <= b).pop()]
    if (!d) return LEVEL.mf
    if (!Array.isArray(d)) return LEVEL[d]
    const f = (q - barStart(b)) / barLen
    return LEVEL[d[0]] + (LEVEL[d[1]] - LEVEL[d[0]]) * f
  }
  const chordTop = new Map()
  for (const n of notes) if (n.hand === 0) { const k = n.q.toFixed(4); chordTop.set(k, Math.max(chordTop.get(k) ?? 0, n.pitch)) }

  const tracks = [midi.addTrack(), midi.addTrack()]
  tracks[0].name = 'Piano right'; tracks[1].name = 'Piano left'
  notes.sort((a, b) => a.q - b.q || a.pitch - b.pitch)
  let rollIdx = new Map()
  for (const n of notes) {
    const dur = (n.off - n.on) * bpmAt(n.on) / 60
    let v = level(n.q) ?? Math.round(n.velocity * 110 + 10)
    if (n.art?.stroke === 'accent' && cfg.dyn) v += 10
    if (n.hand === 1) v *= 0.84
    if (n.hand === 0 && chordTop.get(n.q.toFixed(4)) === n.pitch) v += 6
    const inBar = (n.q - barStart(barOf(n.q)))
    if (Math.abs(inBar) < 1e-6) v += 4
    v += (rand() - 0.5) * 7
    v = Math.max(12, Math.min(124, Math.round(v)))
    // a few ms of spread inside chords, or a written roll (Liszt's arpeggios), low to high
    const key = n.hand + ':' + n.q.toFixed(4), k = rollIdx.get(key) ?? 0
    rollIdx.set(key, k + 1)
    const spreadQ = (cfg.roll ? cfg.roll * k : (rand() - 0.5) * 0.006) * cfg.bpm / 60
    let ticks = Math.max(0, Math.round((n.q + spreadQ) * PPQ))
    let dt = Math.max(30, Math.round(dur * PPQ * (dur > 0.4 ? 0.97 : 1)))
    if (Math.abs(n.q - lastOn) < 1e-6 && cfg.hold?.last) dt = Math.round(dt + cfg.hold.last * cfg.bpm / 60 * PPQ * (tempos.at(-1)[1] / cfg.bpm))
    tracks[n.hand].addNote({ midi: n.pitch, ticks, durationTicks: dt, velocity: v / 127 })
  }

  // pedal
  const pedal = (q, down) => tracks[1].addCC({ number: 64, ticks: Math.max(0, Math.round(q * PPQ)), value: down ? 1 : 0 })
  if (cfg.pedal !== 'none') {
    const changes = []
    if (cfg.pedal === 'bar') for (let b = cfg.pickup ? 0 : 1; barStart(b) < end; b++) changes.push(barStart(b))
    else for (let b = 1, q = cfg.pickup || 0; q < end; b++) for (const g of cfg.groups) { changes.push(q); q += g }
    changes.forEach((q, i) => { if (i) pedal(q + 0.02, false); pedal(q + 0.12, true) })
    pedal(end + 0.5, false)
  }
  writeFileSync(root + cfg.out, Buffer.from(midi.toArray()))
  const back = new Midi(readFileSync(root + cfg.out))
  return { id, out: cfg.out, notes: back.tracks.reduce((s, t) => s + t.notes.length, 0), seconds: +back.duration.toFixed(1), bars: Math.round(barOf(lastOn)) }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const ids = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(PIECES)
  for (const id of ids) {
    if (!PIECES[id]) { console.error('unknown piece', id); process.exitCode = 1; continue }
    const cfg = PIECES[id]
    if (cfg.ly && !existsSync(SRC + cfg.ly)) { console.log(id, 'skipped: no source', cfg.ly); continue }
    try { console.log(JSON.stringify(build(id))) } catch (e) { console.error(id, 'failed:', e.message); process.exitCode = 1 }
  }
}
