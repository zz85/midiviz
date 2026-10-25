// Revoice the score-derived Goldberg MIDI so a listener can follow Bach's lines.
//
//   node midis/tools/bach_goldberg_voicing.mjs [--dry]
//
// The stable input is the pre-ornament dynamics commit (04b619f). Each movement
// is aligned with its Mutopia LilyPond source, whose staff/voice identities let
// us distinguish melody, canonic voices and bass. We raise important lines and
// slightly recess their accompaniment; this is balance, not a global volume
// increase. The existing ornament stage then realizes every written ornament
// at the newly voiced note's velocity, and bach_goldberg_hands.mjs writes each
// note's hand from the score as two tracks.
//
// Policy:
//   Aria / lyrical variations 7, 13, 19, 25: singing upper line +8–10 MIDI units
//   canons 3, 6 … 27: both canonic voices +7, independent bass -4
//   fughetta 10: each detected subject entry +9
//   quodlibet 30: its two upper song lines +7
//   other variations: principal upper line +4, accompaniment -2
//
// Onsets, durations, pitches and tempo are untouched. Output is deterministic.
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { PIECES, align, fetchSource, readSource, splitSegments } from './bach_ornaments.mjs'
import { writeHands } from './bach_goldberg_hands.mjs'

const here = fileURLToPath(new URL('.', import.meta.url))
const root = here + '../../'
const { Midi } = createRequire(import.meta.url)(root + 'tonejs-midi.js')
const BASE = '04b619f'
const TARGETS = ['bach_goldberg', 'bach_goldberg_aria']
const CANONS = new Set([3, 6, 9, 12, 15, 18, 21, 24, 27])
const LYRICAL = new Set([7, 13, 19, 25])

const keyOf = n => `${n.staff}:${n.art.vk ?? n.voice}`
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x))
const midiVelocity = n => Math.round(n.velocity * 127)

function streamsOf(notes) {
  const streams = new Map()
  for (const n of notes) {
    const k = keyOf(n)
    if (!streams.has(k)) streams.set(k, [])
    streams.get(k).push(n)
  }
  return [...streams].map(([key, ns]) => ({
    key,
    notes: ns.sort((a, b) => a.q - b.q || a.pitch - b.pitch),
    pitch: ns.reduce((s, n) => s + n.pitch, 0) / ns.length,
    count: ns.length,
    first: Math.min(...ns.map(n => n.q)),
  }))
}

// Find repetitions of the opening contrapuntal subject. Rhythm must match;
// intervals may differ by up to two semitones to admit a tonal answer.
function subjectNotes(streams) {
  const first = streams.slice().sort((a, b) => a.first - b.first || b.pitch - a.pitch)[0]
  const subject = first?.notes.slice(0, 6) ?? []
  const marked = new Set()
  if (subject.length < 4) return marked
  const rhythm = subject.slice(1).map((n, i) => n.q - subject[i].q)
  const intervals = subject.slice(1).map((n, i) => n.pitch - subject[i].pitch)
  for (const stream of streams) for (let s = 0; s + subject.length <= stream.notes.length; s++) {
    let changed = 0, ok = true
    for (let i = 1; i < subject.length; i++) {
      if (Math.abs((stream.notes[s + i].q - stream.notes[s + i - 1].q) - rhythm[i - 1]) > 1e-4) { ok = false; break }
      const a = ((stream.notes[s + i].pitch - stream.notes[s + i - 1].pitch) % 12 + 12) % 12
      const b = ((intervals[i - 1] % 12) + 12) % 12
      const d = Math.min((a - b + 12) % 12, (b - a + 12) % 12)
      if (d > 2 || (d && ++changed > 2)) { ok = false; break }
    }
    if (ok) { for (let i = 0; i < subject.length; i++) marked.add(stream.notes[s + i]); s += subject.length - 1 }
  }
  return marked
}

function movementNumber(dir) {
  const m = /-v(\d\d)$/.exec(dir)
  return m ? Number(m[1]) : 0 // Aria
}

export function policyFor(dir, notes) {
  const movement = movementNumber(dir)
  const streams = streamsOf(notes)
  const byPitch = streams.slice().sort((a, b) => b.pitch - a.pitch)
  const top = byPitch[0]?.key
  const principal = new Set()
  const entries = movement === 10 ? subjectNotes(streams) : new Set()

  if (movement === 0) {
    // The Aria's single upper stream is its ornamented melody.
    for (const s of streams.filter(s => s.key.startsWith('0:'))) principal.add(s.key)
  } else if (CANONS.has(movement)) {
    // In canons 3–24 the two highest streams are the canonic pair and the
    // lowest is the independent ground. No. 27 has only the two canon voices.
    for (const s of byPitch.slice(0, 2)) principal.add(s.key)
  } else if (LYRICAL.has(movement)) {
    // Prefer the most sustained/detailed upper voice, not merely every treble note.
    const upper = streams.filter(s => s.key.startsWith('0:')).sort((a, b) => b.count - a.count)
    if (upper[0]) principal.add(upper[0].key)
  } else if (movement === 30 || movement === 2) {
    for (const s of byPitch.slice(0, 2)) principal.add(s.key)
  } else if (top) principal.add(top)

  const firstInPrincipal = new Set()
  if (CANONS.has(movement)) for (const s of streams.filter(s => principal.has(s.key)))
    for (const n of s.notes.slice(0, 4)) firstInPrincipal.add(n)

  const delta = n => {
    const key = keyOf(n)
    if (movement === 0) return principal.has(key) ? 10 : -3
    if (CANONS.has(movement)) return (principal.has(key) ? 7 : -4) + (firstInPrincipal.has(n) ? 2 : 0)
    if (movement === 10) return entries.has(n) ? 9 : (key.startsWith('0:') ? 1 : -2)
    if (movement === 30) return principal.has(key) ? 7 : -2
    if (LYRICAL.has(movement)) return principal.has(key) ? 8 : (key.startsWith('0:') ? 1 : -3)
    if (movement === 2) return principal.has(key) ? 5 : -2
    return principal.has(key) ? 4 : -2
  }
  return { movement, principal, entries, delta }
}

async function voiceFile(file, outDir) {
  const buf = execFileSync('git', ['show', `${BASE}:midis/${file}.mid`], { cwd: root, maxBuffer: 1 << 28 })
  const midi = new Midi(buf)
  const track = midi.tracks.find(t => t.notes.length)
  const dirs = PIECES[file]
  const segments = splitSegments(track.notes, dirs.length)
  let matched = 0, scoreNotes = 0, raised = 0, recessed = 0
  const beforeRaised = [], afterRaised = [], beforeOther = [], afterOther = []

  for (const [index, dir] of dirs.entries()) {
    const source = readSource(await fetchSource(dir))
    const score = source.notes.filter(n => !n.art.grace)
    const pairs = align(score, segments[index])
    const policy = policyFor(dir, score)
    scoreNotes += score.length
    matched += pairs.length
    for (const [i, j] of pairs) {
      const note = segments[index][j]
      const before = midiVelocity(note)
      const d = policy.delta(score[i])
      const after = clamp(before + d, 24, 106)
      note.velocity = after / 127
      if (d > 0) { raised++; beforeRaised.push(before); afterRaised.push(after) }
      else { recessed++; beforeOther.push(before); afterOther.push(after) }
    }
  }
  if (matched < 0.97 * scoreNotes) throw new Error(`${file}: only ${matched}/${scoreNotes} score notes aligned`)
  writeFileSync(`${outDir}/${file}.mid`, Buffer.from(midi.toArray()))
  const mean = a => (a.reduce((s, x) => s + x, 0) / a.length).toFixed(1)
  console.log(`${file}: aligned ${matched}/${scoreNotes}; projected ${raised} notes ${mean(beforeRaised)}→${mean(afterRaised)}, accompaniment ${recessed} notes ${mean(beforeOther)}→${mean(afterOther)}`)
}

async function main() {
  const dry = process.argv.includes('--dry')
  const dir = mkdtempSync(tmpdir() + '/goldberg-voicing-')
  try {
    for (const file of TARGETS) await voiceFile(file, dir)
    for (const file of TARGETS) {
      const args = [here + 'bach_ornaments.mjs', '--only', file, '--input-dir', dir]
      if (dry) args.push('--dry')
      execFileSync(process.execPath, args, { cwd: root, stdio: 'inherit' })
    }
    // then each note's hand, from the score, as a right- and a left-hand track
    if (!dry) for (const file of TARGETS) await writeHands(file)
  } finally { rmSync(dir, { recursive: true, force: true }) }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await main()
