// Check the LilyPond reader (strings/lilypond.js) against LilyPond itself: the
// Mutopia MIDI files in violinist/midis were written by LilyPond from the .ly
// sources Mutopia publishes, so reading those sources should give the same
// violin notes at the same places.
//
//   node strings/test/lilypond.js [folder] [--verbose] [--only=name]
//
// folder (default strings/data/MutopiaLy, git-ignored) holds one folder per
// Mutopia piece with its .ly files (unzipped -lys.zip) and midis.json naming
// the MIDI files of violinist/midis made from it. To fetch them, see
// strings/README.md (LilyPond input). For every MIDI file the part of the
// score that matches the MIDI's violin track best is compared: notes found by
// both (same pitch, onset within 1/64 of a quarter), onsets in seconds within
// 20 ms (which checks the tempo too), and the same length; slurs and marks
// have no ground truth in a MIDI file and are counted only.
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { readLilyPondFiles, mainLyFile } from '../lilypond.js'

const here = fileURLToPath(new URL('.', import.meta.url))
const require = createRequire(import.meta.url)
const { Midi } = require('../../tonejs-midi.js')
const args = process.argv.slice(2)
const dir = args.find(a => !a.startsWith('--')) || here + '../data/MutopiaLy'
const verbose = args.includes('--verbose')
const only = args.find(a => a.startsWith('--only='))?.slice(7)
if (!existsSync(dir)) { console.error(`No sources in ${dir} (see strings/README.md, LilyPond input)`); process.exit(1) }
const index = JSON.parse(readFileSync(here + '../../violinist/midis/index.json', 'utf8'))

function walk(d, base = '') {
  const out = new Map()
  for (const f of readdirSync(d, { withFileTypes: true })) {
    if (f.isDirectory()) for (const [k, v] of walk(`${d}/${f.name}`, base + f.name + '/')) out.set(k, v)
    else if (/\.(ly|ily|lyi)$/i.test(f.name)) out.set(base + f.name, readFileSync(`${d}/${f.name}`, 'utf8'))
  }
  return out
}
// MIDI violin notes in quarters and seconds
function midiNotes(file) {
  const e = index.find(x => x.file === file)
  const m = new Midi(readFileSync(here + '../../violinist/midis/' + file))
  // the violin track: index.json counts LilyPond's tempo track, which the MIDI reader may drop; match its note count
  const tr = m.tracks.slice().sort((a, b) => Math.abs(a.notes.length - (e?.violinNotes ?? 0)) - Math.abs(b.notes.length - (e?.violinNotes ?? 0)))[0]
  return tr.notes.map(n => ({ pitch: n.midi, q: n.ticks / m.header.ppq, qe: (n.ticks + n.durationTicks) / m.header.ppq, on: n.time, off: n.time + n.duration })).sort((a, b) => a.q - b.q || a.pitch - b.pitch)
}
function compare(ours, ref) {
  const key = (p, q) => `${p}@${Math.round(q * 64)}`
  const idx = new Map()
  for (const n of ref) { const k = key(n.pitch, n.q); if (!idx.has(k)) idx.set(k, []); idx.get(k).push(n) }
  let both = 0, secOk = 0, lenOk = 0
  for (const n of ours) {
    let m = idx.get(key(n.pitch, n.q))?.shift()
    if (!m) for (const d of [-1, 1]) { m = idx.get(`${n.pitch}@${Math.round(n.q * 64) + d}`)?.shift(); if (m) break }
    if (!m) continue
    both++
    if (Math.abs(m.on - n.on) < 0.02) secOk++
    // written length: ours before staccato shortening is (off - on) × 2 for staccato; compare in quarters where unmarked
    const ql = n.qe - n.q, mq = m.qe - m.q
    if (Math.abs(ql - mq) < 0.02 * mq + 1 / 32 || n.art.stroke) lenOk++
  }
  return { ours: ours.length, ref: ref.length, both, secOk, lenOk }
}
const pc = (a, b) => b ? (100 * a / b).toFixed(1) : '–'
const tot = { ours: 0, ref: 0, both: 0, secOk: 0, lenOk: 0, slurred: 0, marks: 0, files: 0, ok: 0 }
console.log('midi'.padEnd(34), 'notes ly/midi', ' both %', ' time %', ' len %', ' slurred %', ' part, ms')
for (const d of readdirSync(dir).filter(x => existsSync(`${dir}/${x}/midis.json`)).sort()) {
  const files = walk(`${dir}/${d}`)
  const midis = JSON.parse(readFileSync(`${dir}/${d}/midis.json`, 'utf8'))
  // every file with a \score is a candidate main file (a set of movements has one per movement)
  const strip = t => t.replace(/%\{[\s\S]*?%\}|%[^\n]*/g, '')
  const mains = [...files.keys()].filter(n => /\\(score|book|bookpart)\b/.test(strip(files.get(n))))
  const tried = new Map()
  for (const mid of midis) {
    if (only && !mid.includes(only)) continue
    const ref = midiNotes(mid)
    let best = null
    const t0 = performance.now()
    const order = [mainLyFile(files), ...mains.filter(x => x !== mainLyFile(files))]
    for (const main of order) {
      let r = tried.get(main)
      if (r === undefined) { try { r = readLilyPondFiles(files, { main }) } catch (e) { r = { error: e.message } } tried.set(main, r) }
      if (r.error) { if (!best) best = { error: r.error, main }; continue }
      for (let p = 0; p < r.parts.length; p++) {
        let s
        try { s = p === r.part ? r : readLilyPondFiles(files, { main, part: p }) } catch (e) { continue }
        // the MIDI's lengths in quarters: our qe from the written length
        for (const n of s.notes) n.qe = n.q + qLen(n, s)
        const c = compare(s.notes, ref)
        if (!best || best.error || c.both > best.c.both) best = { c, main, part: p, name: s.parts[p].name, s }
      }
      if (best?.c && best.c.both > 0.97 * ref.length) break
    }
    const ms = performance.now() - t0
    tot.files++
    if (best.error) { console.log(mid.padEnd(34), 'ERROR', best.error, best.main); continue }
    const { c, s } = best
    for (const k of ['ours', 'ref', 'both', 'secOk', 'lenOk']) tot[k] += c[k]
    const sl = s.notes.filter((n, i) => i && n.art.slur != null && n.art.slur === s.notes[i - 1].art.slur).length
    tot.slurred += sl; tot.marks += s.notes.filter(n => n.art.stroke).length
    if (c.both > 0.97 * Math.max(c.ours, c.ref)) tot.ok++
    console.log(mid.padEnd(34), `${c.ours}/${c.ref}`.padStart(13), pc(c.both, Math.max(c.ours, c.ref)).padStart(7), pc(c.secOk, c.both).padStart(7), pc(c.lenOk, c.both).padStart(6), pc(sl, c.ours).padStart(10), ` ${best.main.split('/').pop()} "${best.name}", ${ms.toFixed(0)} ms`)
  }
}
console.log(`\n${tot.files} MIDI files: ${tot.ok} with ≥ 97 % of notes found; notes ${tot.ours} (LilyPond source) / ${tot.ref} (LilyPond's MIDI), found by both ${pc(tot.both, Math.max(tot.ours, tot.ref))} %, onset in seconds within 20 ms ${pc(tot.secOk, tot.both)} %, same length ${pc(tot.lenOk, tot.both)} %; slurred pairs ${pc(tot.slurred, tot.ours)} %, marked notes ${pc(tot.marks, tot.ours)} %`)

// the written length in quarters (undo the staccato shortening of score.js)
function qLen(n, s) {
  const k = n.art.slur != null && /^stacc|spicc/.test(n.art.stroke || '') ? 0.85 : n.art.stroke === 'staccatissimo' ? 0.25 : /^(staccato|spiccato)$/.test(n.art.stroke || '') ? 0.5 : 1
  // seconds → quarters through the tempo map
  const qAt = t => { let q = 0, last = 0, bpm = s.tempo[0]?.bpm || 60; for (const x of s.tempo) { if (x.t > t) break; q += (x.t - last) * bpm / 60; last = x.t; bpm = x.bpm } return q + (t - last) * bpm / 60 }
  return (qAt(n.off) - qAt(n.on)) / k
}
