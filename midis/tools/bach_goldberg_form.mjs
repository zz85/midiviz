// The repeats of the complete Goldberg Variations: two files from one.
//
//   node midis/tools/bach_goldberg_form.mjs --input <as printed>.mid [--dry]
//
// Every movement is in two halves, each marked to be repeated, and five (Var. 2,
// 4, 6, 16 and 25) have a first and a second ending to each half. Mutopia's MIDI,
// which midis/bach_goldberg.mid is made from, is LilyPond's: it plays each half
// once and both of its endings, as printed. This writes
//
//   midis/bach_goldberg.mid          each half once, and of two endings the second
//                                    alone (as a performance without repeats plays it)
//   midis/bach_goldberg_repeats.mid  each half twice, the first ending the first time
//                                    and the second the second; the Aria da capo
//                                    without its repeats, as it is usually played
//
// The repeats and endings are the LilyPond sources' own (\repeat volta and
// \alternative, as strings/lilypond.js reads them, in quarters as printed). The
// movements keep their tempos and the silences between them. A note keeps its
// length, except where the music jumps (back to a repeat, or past a first
// ending): a note still sounding there ends with its bar.
//
// The input is the file as the pipeline writes it, as printed: bach_ornaments.mjs
// (which bach_goldberg_voicing.mjs runs) ends with this, so a rerun of that
// rebuilds both files. A file whose movements are not as printed is refused.
//
// goldbergForms() gives, for each file, each movement's played order of the
// printed music, which sheet/tools/goldberg.mjs reads to follow the score.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { readLilyPondFiles, mainLyFile } from '../../strings/lilypond.js'
import { readSource } from './bach_ornaments.mjs'

const here = fileURLToPath(new URL('.', import.meta.url))
const root = here + '../../'
const { Midi } = createRequire(import.meta.url)(root + 'tonejs-midi.js')
const SRC = here + 'mutopia/BWV988/'
export const IDS = ['aria', ...Array.from({ length: 30 }, (_, i) => 'v' + String(i + 1).padStart(2, '0'))]
// the order the file plays them: the Aria again at the end
export const SEQUENCE = [...IDS, 'aria']
export const FILES = { plain: 'bach_goldberg', repeats: 'bach_goldberg_repeats' }
const GAP = 1.5   // a silence this long or longer is between two movements

// ── each movement as printed ─────────────────────────────────────────────────
const sources = new Map()
export function movementSource(id) {
  if (sources.has(id)) return sources.get(id)
  const dir = `${SRC}bwv-988-${id}/`
  const files = new Map(readdirSync(dir).filter(n => /\.(ly|ily|lyi)$/i.test(n)).map(n => [n, readFileSync(dir + n, 'utf8')]))
  const { notes } = readSource(dir)
  // (the parts agree on the repeats; the first part's are taken)
  const repeats = readLilyPondFiles(files, { main: mainLyFile(files), part: 0 }).repeats
  const r = v => Math.round(v * 1e6) / 1e6
  const ref = notes.find(n => n.q > 1), spq = ref.on / ref.q
  const first = Math.min(...notes.map(n => n.q))
  const endQ = r(Math.max(...notes.map(n => n.q + n.len), ...repeats.map(x => Math.max(x.to, ...(x.alts || []).map(a => a[1])))))
  const s = { id, spq, first, endQ, last: Math.max(...notes.map(n => n.off)), repeats: repeats.map(x => ({ from: r(x.from), to: r(x.to), alts: (x.alts || []).map(a => a.map(r)), times: x.times })) }
  sources.set(id, s)
  return s
}

/**
 * The printed music of a movement in the order a file plays it, as ranges of
 * quarters [[a, b]], neighbours joined. `mode`: 'printed' (the body and every
 * ending once, as LilyPond's MIDI), 'plain' (the body and the last ending once)
 * or 'repeats' (the body `times` times, with the ending of each pass).
 */
export function formOf(src, mode) {
  const out = [], add = (a, b) => { if (b <= a) return; const p = out.at(-1); if (p && Math.abs(p[1] - a) < 1e-6) p[1] = b; else out.push([a, b]) }
  let at = 0
  for (const x of src.repeats) {
    add(at, x.from)
    const passes = mode === 'repeats' ? x.times : 1
    for (let p = 0; p < passes; p++) {
      add(x.from, x.to)
      if (!x.alts.length) continue
      if (mode === 'printed') { for (const a of x.alts) add(...a); break }
      add(...x.alts[mode === 'repeats' ? Math.min(p, x.alts.length - 1) : x.alts.length - 1])
    }
    at = Math.max(x.to, ...x.alts.map(a => a[1]))
  }
  add(at, src.endQ)
  return out
}

/**
 * For each file, by place in SEQUENCE, the movement's played order as ranges of
 * its printed time in seconds, each with where it starts in the file's movement:
 * [{ id, chunks: [{ a, b, t }], end }] (`end`: the movement's length as played).
 */
export function goldbergForms() {
  const forms = {}
  for (const [key, file] of Object.entries(FILES)) forms[`midis/${file}.mid`] = SEQUENCE.map((id, k) => {
    const src = movementSource(id), mode = key === 'repeats' && k < SEQUENCE.length - 1 ? 'repeats' : 'plain'
    let t = 0
    const chunks = formOf(src, mode).map(([a, b]) => { const c = { a: a * src.spq, b: b * src.spq, t }; t += c.b - c.a; return c })
    // (to the last note's end: past the printed end where it rings on, before it where the
    // last ending's bar is longer than its notes)
    return { id, mode, chunks, end: t + src.last - src.endQ * src.spq }
  })
  return forms
}

// ── the file ─────────────────────────────────────────────────────────────────
// the movements of a file as printed: where each starts (its time 0, the start of
// its first bar) and its notes, checked against the sources
function movementsOf(midi) {
  const notes = midi.tracks.flatMap((tr, ti) => tr.notes.map(n => ({ ti, midi: n.midi, time: n.time, duration: n.duration, velocity: n.velocity }))).sort((a, b) => a.time - b.time || a.midi - b.midi)
  const segs = []
  let end = -Infinity
  for (const n of notes) {
    if (!segs.length || n.time - end >= GAP) segs.push([])
    segs.at(-1).push(n)
    end = Math.max(end, n.time + n.duration)
  }
  if (segs.length !== SEQUENCE.length) throw new Error(`the file has ${segs.length} movements, not ${SEQUENCE.length}`)
  return segs.map((ns, k) => {
    const src = movementSource(SEQUENCE[k]), origin = ns[0].time - src.first * src.spq
    const len = Math.max(...ns.map(n => n.time + n.duration)) - origin
    // as printed, it lasts as long as its source (the notes lengthened for an ornament end by then too)
    if (Math.abs(len - src.last) > 0.3) throw new Error(`${SEQUENCE[k]}: ${len.toFixed(2)} s, not ${src.last.toFixed(2)} s as printed: is the input as printed (bach_ornaments.mjs writes it so)?`)
    return { id: SEQUENCE[k], origin, len, notes: ns, src }
  })
}

/** Write midis/bach_goldberg.mid and midis/bach_goldberg_repeats.mid from the file as printed. */
export function writeForms(input, { dry = false, outDir = root + 'midis/' } = {}) {
  const midi = new Midi(readFileSync(input))
  const moves = movementsOf(midi)
  const forms = goldbergForms()
  const report = []
  for (const [key, file] of Object.entries(FILES)) {
    const out = new Midi()
    out.header.fromJSON({ ...midi.header.toJSON(), name: midi.header.name })
    const tracks = midi.tracks.map(tr => { const t = out.addTrack(); t.name = tr.name; t.channel = tr.channel; t.instrument.number = tr.instrument.number; return t })
    const placed = []
    let t0 = moves[0].origin, clamped = 0
    moves.forEach((mv, k) => {
      const form = forms[`midis/${file}.mid`][k]
      // the silence before it, as in the input
      if (k) { const prev = moves[k - 1]; t0 += mv.origin - prev.origin - prev.len }
      form.chunks.forEach((c, ci) => {
        const next = form.chunks[ci + 1], jump = next && Math.abs(next.a - c.b) > 1e-6
        for (const n of mv.notes) {
          const at = n.time - mv.origin
          if (at < c.a - 1e-3 || at >= c.b - 1e-3) continue
          let dur = n.duration
          // a note still sounding where the music jumps ends with its bar
          if (jump && at + dur > c.b + 1e-3) { dur = Math.max(0.02, c.b - at - 0.004); clamped++ }
          placed.push({ ti: n.ti, midi: n.midi, time: t0 + c.t + at - c.a, duration: dur, velocity: n.velocity })
        }
      })
      t0 += form.end
    })
    // the same key struck again: the earlier note lets go just before (as bach_ornaments.mjs does)
    placed.sort((a, b) => a.time - b.time || a.midi - b.midi)
    const lastBy = new Map()
    for (const n of placed) {
      const p = lastBy.get(n.midi)
      if (p && p.time + p.duration > n.time - 0.004) p.duration = Math.max(0.01, n.time - 0.004 - p.time)
      lastBy.set(n.midi, n)
    }
    for (const n of placed) tracks[n.ti].addNote({ midi: n.midi, time: n.time, duration: n.duration, velocity: n.velocity })
    const length = Math.max(...placed.map(n => n.time + n.duration))
    report.push(`${file}: ${placed.length} notes (as printed ${moves.reduce((s, m) => s + m.notes.length, 0)}), ${(length / 60).toFixed(1)} min, ${clamped} notes ended at a jump${dry ? ' (dry run)' : ''}`)
    if (!dry) writeFileSync(outDir + file + '.mid', Buffer.from(out.toArray()))
  }
  for (const l of report) console.log(l)
  return report
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const args = process.argv.slice(2), i = args.indexOf('--input')
  if (i < 0) { console.error('give the file as printed with --input; bach_goldberg_voicing.mjs writes it and ends with this'); process.exit(1) }
  writeForms(args[i + 1], { dry: args.includes('--dry') })
}
