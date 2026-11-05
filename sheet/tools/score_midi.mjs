// Write the score of a Mutopia piece as a MIDI file for the engraver (#050):
// the notes as printed (each repeat once, no ornaments realized, no grace
// notes), the upper staff as "Right hand" and the lower as "Left hand" (a track
// a voice where a staff has more than one: "Left hand · voice 2"), its
// time and key signatures. midis/'s files are performances (repeats written
// out, trills played as notes), which would engrave as 64 bars of 32nds.
//   node sheet/tools/score_midi.mjs [mutopia dir] [out.mid] [--key G] [--meter 3/4]
// Defaults: the Goldberg Aria, midis/tools/mutopia/BWV988/bwv-988-aria/ (Mutopia's,
// kept in the repo), to sheet/scores/bach_goldberg_aria.score.mid.
import { writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { readSource, fetchSource } from '../../midis/tools/bach_ornaments.mjs'
const root = fileURLToPath(new URL('../../', import.meta.url))
const { Midi } = createRequire(import.meta.url)(root + 'tonejs-midi.js')
const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d }
const pos = args.filter((a, i) => !a.startsWith('--') && !args[i - 1]?.startsWith('--'))
const dir = pos[0] || 'BWV988/bwv-988-aria'
const out = pos[1] || root + 'sheet/scores/bach_goldberg_aria.score.mid'
const [num, den] = opt('--meter', '3/4').split('/').map(Number)
await fetchSource(dir).catch(() => {})
const { notes } = readSource(root + 'midis/tools/mutopia/' + dir + '/')
const PPQ = 480, midi = new Midi()
midi.header.setTempo(60)
midi.header.timeSignatures.push({ ticks: 0, timeSignature: [num, den], measures: 0 })
midi.header.keySignatures.push({ ticks: 0, key: opt('--key', 'G'), scale: 'major' })
midi.header.update()
const kept = notes.filter(n => n.len >= 0.1)
// a track for each voice of each staff, "<hand> · voice <n>" where a staff has more than one,
// so the engraver can lay the voices on one staff (sheet/engrave.js) and keep their lengths
for (const [staff, name] of [[0, 'Right hand'], [1, 'Left hand']]) {
  const voices = [...new Set(kept.filter(n => n.staff === staff).map(n => n.voice))].sort((a, b) => a - b)
  for (const v of voices) {
    const t = midi.addTrack(); t.name = voices.length > 1 ? `${name} · voice ${v}` : name; t.channel = staff
    for (const n of kept.filter(n => n.staff === staff && n.voice === v)) t.addNote({ midi: n.pitch, ticks: Math.round(n.q * PPQ), durationTicks: Math.round(n.len * PPQ), velocity: 0.7 })
  }
}
writeFileSync(out, Buffer.from(midi.toArray()))
const bars = Math.max(...kept.map(n => n.q + n.len)) / (num * 4 / den)
console.log(`${out}: ${kept.length} notes (${notes.length - kept.length} grace notes left out), ${bars} bars of ${num}/${den}`)
