// Copy the LilyPond sources of the violin pieces (violinist/midis) into
// violinist/scores, keeping only the files each piece's score reads, and
// record in violinist/midis/index.json where each MIDI file's score is:
//   score: { main, files, part, matched, slurred, marked }
//   (paths relative to violinist/scores/; part: the staff that is the MIDI's
//   violin track; matched: the share of the MIDI's violin notes found in it)
// The pages (#034, #037, #038) read the score with strings/lilypond.js and put
// its slurs, marks and bowings on the MIDI's notes (violinist/score-art.js).
//
//   node strings/test/fetch_mutopia_ly.js      (the sources, git-ignored)
//   node violinist/tools/build_scores.js
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync, rmSync } from 'node:fs'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { readLilyPond } from '../../strings/lilypond.js'
import { matchScore } from '../score-art.js'

const here = fileURLToPath(new URL('.', import.meta.url))
const require = createRequire(import.meta.url)
const { Midi } = require('../../tonejs-midi.js')
const SRC = here + '../../strings/data/MutopiaLy/', OUT = here + '../scores/', IDX = here + '../midis/index.json'
if (!existsSync(SRC)) { console.error('Fetch the sources first: node strings/test/fetch_mutopia_ly.js'); process.exit(1) }
const index = JSON.parse(readFileSync(IDX, 'utf8'))

function walk(d, base = '') {
  const out = new Map()
  for (const f of readdirSync(d, { withFileTypes: true })) {
    if (f.isDirectory()) for (const [k, v] of walk(`${d}/${f.name}`, base + f.name + '/')) out.set(k, v)
    else if (/\.(ly|ily|lyi)$/i.test(f.name)) out.set(base + f.name, readFileSync(`${d}/${f.name}`, 'utf8'))
  }
  return out
}
const strip = t => t.replace(/%\{[\s\S]*?%\}|%[^\n]*/g, '')
// the MIDI's violin notes, as the pages read them (by note count, else the index's track)
function violinNotes(e) {
  const midi = new Midi(readFileSync(here + '../midis/' + e.file))
  let solo = midi.tracks.filter(t => t.notes.length === e.violinNotes)
  if (solo.length !== 1) {
    const ch = [...new Set(midi.tracks.map(t => t.channel))].find(c => midi.tracks.filter(t => t.channel === c).reduce((a, t) => a + t.notes.length, 0) === e.violinNotes)
    solo = ch != null ? midi.tracks.filter(t => t.channel === ch) : [midi.tracks[e.violinTrack]]
  }
  return solo.flatMap(t => t.notes).map(n => ({ pitch: n.midi, q: n.ticks / midi.header.ppq })).sort((a, b) => a.q - b.q || a.pitch - b.pitch)
}

rmSync(OUT, { recursive: true, force: true })
const copied = new Map()                  // dir → Set of files
for (const e of index) {
  const id = e.source.match(/id=(\d+)/)?.[1], dir = SRC + 'm' + id
  if (!id || !existsSync(dir)) { console.warn(e.file, ': no source'); delete e.score; continue }
  const files = walk(dir)
  const byBase = new Map([...files.keys()].map(n => [n.split('/').pop(), n]))
  const mains = [...files.keys()].filter(n => /\.ly$/i.test(n) && /\\(score|book|bookpart)\b/.test(strip(files.get(n))))
  const notes = violinNotes(e)
  let best = null
  for (const main of mains) {
    const used = new Set([main])
    const include = (path, name) => {
      const k = files.has(path) ? path : byBase.get(name.split('/').pop())
      if (!k) return null
      used.add(k); return { text: files.get(k), name: k }
    }
    let r
    try { r = readLilyPond(files.get(main), { include, file: main }) } catch { continue }
    for (let p = 0; p < r.parts.length; p++) {
      const s = p === r.part ? r : readLilyPond(files.get(main), { include, file: main, part: p })
      const m = matchScore(notes.map(n => ({ ...n })), s.notes)
      if (!best || m.matched > best.m.matched) best = { m, main, part: p, used: new Set(used), s }
    }
    if (best && best.m.matched > 0.97 * notes.length) break
  }
  if (!best) { console.warn(e.file, ': no score read'); delete e.score; continue }
  const folder = 'm' + id + '/'
  if (!copied.has(folder)) copied.set(folder, new Set())
  for (const f of best.used) copied.get(folder).add(f)
  const ns = best.s.notes
  e.score = {
    main: folder + best.main, files: [...best.used].sort().map(f => folder + f), part: best.part, partName: best.s.parts[best.part].name,
    matched: +(best.m.matched / notes.length).toFixed(4),
    slurred: +(ns.filter((n, i) => i && n.art.slur != null && n.art.slur === ns[i - 1].art.slur).length / ns.length).toFixed(3),
    marked: ns.filter(n => n.art.stroke).length, bowings: ns.filter(n => n.art.bow).length,
  }
  console.log(e.file.padEnd(34), `${(100 * e.score.matched).toFixed(1)} %`.padStart(8), `slurred ${(100 * e.score.slurred).toFixed(0)} %`.padStart(13), best.main, `"${e.score.partName}"`, best.used.size, 'files')
}
let bytes = 0
for (const [folder, set] of copied) for (const f of set) {
  const text = readFileSync(SRC + folder + f, 'utf8')
  mkdirSync((OUT + folder + f).replace(/\/[^/]*$/, ''), { recursive: true })
  writeFileSync(OUT + folder + f, text); bytes += Buffer.byteLength(text)
}
writeFileSync(IDX, JSON.stringify(index, null, 1) + '\n')
console.log(`${[...copied.values()].reduce((a, s) => a + s.size, 0)} files, ${(bytes / 1024).toFixed(0)} KB → violinist/scores; index.json updated`)
