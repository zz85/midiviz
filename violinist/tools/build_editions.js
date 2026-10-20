// Bowings from printed violin editions on IMSLP, read by optical music
// recognition: ScoreShift (../random-sketches/vibes/scoreshift, or SCORESHIFT=
// <path>) reads each page's notes, slurs, staccato / tenuto / accent marks
// and up- and down-bow signs, and the marks are aligned onto the notes of the
// violin MIDI files (violinist/midis, Bach's Sonatas and Partitas) by pitch,
// so the MIDI keeps its timing and the bow follows the edition. Writes
// violinist/editions/<edition>.json, read by violinist/score-art.js
// (Bowing: Herrmann / Auer in #037).
//
//   node violinist/tools/build_editions.js [herrmann|auer …]
//
// The scans are not in the repo (strings/data/IMSLP, git-ignored). To fetch
// and render them (headless Chromium; please keep requests to IMSLP few):
//   cd ../random-sketches/vibes/scoreshift
//   node tools/imslp_fetch.mjs ~/test/midiviz/strings/data/IMSLP 335779 921334
//   node tools/imslp_fetch.mjs --render <pdf> ~/test/midiviz/strings/data/IMSLP/<edition> 2400
// Per note the output holds the slur group (0 = none), the stroke mark and
// the bow sign; notes the alignment could not find are marked '?' and take
// the slur of the notes around them when both sides are in the same slur.
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { readMusicXML } from '../../strings/score.js'

const here = fileURLToPath(new URL('.', import.meta.url))
const require = createRequire(import.meta.url)
const { Midi } = require('../../tonejs-midi.js')
const SS = (process.env.SCORESHIFT || here + '../../../random-sketches/vibes/scoreshift').replace(/\/?$/, '/')
const DATA = here + '../../strings/data/IMSLP/', OUT = here + '../editions/'

export const EDITIONS = {
  herrmann: { title: 'Eduard Herrmann (ed.), G. Schirmer, New York, 1900', imslp: 335779, url: 'https://imslp.org/wiki/Special:ImagefromIndex/335779', licence: 'Public domain' },
  auer: { title: 'Leopold Auer (ed.), Carl Fischer, New York, 1917', imslp: 921334, url: 'https://imslp.org/wiki/Special:ImagefromIndex/921334', licence: 'Public domain' },
}
const STROKE = { staccato: '.', tenuto: '-', accent: '>', marcato: '^', staccatissimo: '!', portato: '_', spiccato: '.' }

// ScoreShift: page images → MusicXML (cached next to the pages)
async function recognise(dir) {
  const { decodeGray } = await import(SS + 'png.js')
  const { normalize, analyze } = await import(SS + 'omr.js')
  const { buildScore } = await import(SS + 'score.js')
  const { toMusicXML } = await import(SS + 'export.js')
  mkdirSync(dir + 'xml', { recursive: true })
  const pages = readdirSync(dir).filter(f => /^p\d+\.png$/.test(f)).sort()
  const out = []
  let prevOpen = null
  for (const f of pages) {
    const x = dir + 'xml/' + f.replace('.png', '.musicxml')
    if (!existsSync(x)) {
      let res
      try { res = analyze(normalize(decodeGray(readFileSync(dir + f)))) } catch { writeFileSync(x, ''); continue }
      writeFileSync(x, toMusicXML(res, buildScore(res), { title: f }))
    }
    const xml = readFileSync(x, 'utf8')
    if (!xml) continue
    // a page's notes in reading order; slur ids made unique per page, and a slur still open at
    // the end of a page is the one the next page continues (its notes before its first stop)
    const s = readMusicXML(xml)
    const ns = s.notes.slice().sort((a, b) => a.on - b.on || a.pitch - b.pitch)
    const openAtEnd = prevOpen
    prevOpen = null
    for (const n of ns) {
      let id = n.art.slur != null ? f + ':' + n.art.slur : null
      if (n.art.slurCont && openAtEnd) id = openAtEnd
      if (n.art.slurOpen) prevOpen = id
      out.push({ pitch: n.pitch, art: n.art, slur: id })
    }
    if (!ns.some((n) => n.art.slurOpen)) prevOpen = null
  }
  return out
}

/**
 * Pair A (the MIDI's pitches) with a stretch of B (the edition's, every page in
 * order): find where A lies by 5-note fingerprints, then an edit-distance
 * alignment over that window (a near pitch, a semitone or an octave off, is a
 * cheaper substitution; the window's ends are free). Returns, per A, the index
 * in B of an equal pitch or -1.
 */
export function alignPitches(A, B) {
  const K = 5, key = (s, i) => s.slice(i, i + K).join(','), pos = new Map()
  for (let j = 0; j + K <= B.length; j++) { const k = key(B, j); if (!pos.has(k)) pos.set(k, []); pos.get(k).push(j) }
  const hits = []
  for (let i = 0; i + K <= A.length; i++) { const p = pos.get(key(A, i)); if (p && p.length < 6) for (const j of p) hits.push(j - i) }
  if (!hits.length) return null
  hits.sort((a, b) => a - b)
  let best = 0, bi = 0
  for (let a = 0, b = 0; b < hits.length; b++) { while (hits[b] - hits[a] > 200) a++; if (b - a > best) { best = b - a; bi = a } }
  const off = hits[bi + (best >> 1)]
  const j0 = Math.max(0, off - 300), j1 = Math.min(B.length, Math.round(off + A.length * 1.3 + 300))
  const Bw = B.slice(j0, j1), N = A.length, M = Bw.length, W = M + 1
  const D = new Float32Array((N + 1) * W)
  const sub = (a, b) => a === b ? 0 : (Math.abs(a - b) <= 2 || Math.abs(a - b) === 12) ? 0.9 : 2
  for (let i = 1; i <= N; i++) { D[i * W] = i; for (let j = 1; j <= M; j++) D[i * W + j] = Math.min(D[(i - 1) * W + j - 1] + sub(A[i - 1], Bw[j - 1]), D[(i - 1) * W + j] + 1, D[i * W + j - 1] + 0.8) }
  let jEnd = 0; for (let j = 1; j <= M; j++) if (D[N * W + j] < D[N * W + jEnd]) jEnd = j
  const pair = new Array(N).fill(-1)
  for (let i = N, j = jEnd; i > 0;) {
    if (j > 0 && Math.abs(D[i * W + j] - (D[(i - 1) * W + j - 1] + sub(A[i - 1], Bw[j - 1]))) < 1e-4) { if (A[i - 1] === Bw[j - 1]) pair[i - 1] = j0 + j - 1; i--; j-- }
    else if (Math.abs(D[i * W + j] - (D[(i - 1) * W + j] + 1)) < 1e-4) i--
    else j--
  }
  return pair
}

// the MIDI's violin notes, in the order the pages sort them (onset, then pitch)
export function violinNotes(e, midiBuf) {
  const midi = new Midi(midiBuf)
  let solo = midi.tracks.filter(t => t.notes.length === e.violinNotes)
  if (solo.length !== 1) solo = [midi.tracks[e.violinTrack]]
  return solo.flatMap(t => t.notes).map(n => ({ pitch: n.midi, q: n.ticks / midi.header.ppq })).sort((a, b) => a.q - b.q || a.pitch - b.pitch)
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const index = JSON.parse(readFileSync(here + '../midis/index.json', 'utf8'))
  const pieces = index.filter(e => e.group === 'bach-solo')
  mkdirSync(OUT, { recursive: true })
  for (const ed of process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(EDITIONS)) {
    const dir = DATA + ed + '/'
    if (!existsSync(dir)) { console.warn(ed, ': no pages in', dir); continue }
    const t0 = performance.now()
    const B = await recognise(dir)
    console.log(`${ed}: ${B.length} notes read from the pages (${((performance.now() - t0) / 1000).toFixed(0)} s)`)
    const res = { edition: { key: ed, ...EDITIONS[ed], reader: 'ScoreShift OMR, aligned by violinist/tools/build_editions.js' }, pieces: {} }
    for (const e of pieces) {
      const A = violinNotes(e, readFileSync(here + '../midis/' + e.file))
      const pair = alignPitches(A.map(n => n.pitch), B.map(n => n.pitch))
      if (!pair) continue
      // slur groups renumbered 1, 2, … per piece; strokes and bows one character per note
      const ids = new Map(), s = [], k = [], b = []
      for (let i = 0; i < A.length; i++) {
        const m = pair[i] >= 0 ? B[pair[i]] : null
        if (!m) { s.push(-1); k.push('?'); b.push(' '); continue }
        s.push(m.slur ? (ids.has(m.slur) ? ids.get(m.slur) : (ids.set(m.slur, ids.size + 1), ids.size)) : 0)
        k.push(STROKE[m.art.stroke] || ' ')
        b.push(m.art.bow === 'up' ? 'u' : m.art.bow === 'down' ? 'd' : ' ')
      }
      // an unfound note between two notes of one slur is in it
      for (let i = 0; i < s.length; i++) if (s[i] < 0) {
        let a = i - 1, z = i + 1
        while (z < s.length && s[z] < 0) z++
        s[i] = a >= 0 && z < s.length && s[a] > 0 && s[a] === s[z] ? s[a] : 0
      }
      const found = pair.filter(p => p >= 0).length
      res.pieces[e.file] = { notes: A.length, found: +(found / A.length).toFixed(3), slur: s, stroke: k.join(''), bow: b.join('') }
      const sl = s.filter((x, i) => i && x > 0 && x === s[i - 1]).length
      console.log(' ', e.file.padEnd(30), `${(100 * found / A.length).toFixed(0)} % found`.padStart(12), `slurred ${(100 * sl / A.length).toFixed(0)} %`.padStart(13), `bows ${(b.join('').match(/d/g) || []).length}⊓ ${(b.join('').match(/u/g) || []).length}V`)
    }
    writeFileSync(OUT + ed + '.json', JSON.stringify(res) + '\n')
    console.log('wrote', OUT + ed + '.json')
  }
}
