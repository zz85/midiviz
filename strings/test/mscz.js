// Check the MuseScore reader (strings/score.js readMSCX / readMSCZ) against the
// MusicXML reader on the same scores: OpenScore's String Quartets corpus
// (CC0, https://github.com/OpenScore/StringQuartets) ships each score as
// MuseScore (.mscx / .mscz) together with MuseScore's own MusicXML export
// (.mxl), so both readers should give the same notes, slurs and marks.
//
//   node strings/test/mscz.js [folder] [--parts=4] [--verbose]
//
// folder (default strings/data/OpenScoreSQ, git-ignored) holds <name>.mscx or
// <name>.mscz next to <name>.mxl. To fetch some, for example:
//   curl -sO "https://raw.githubusercontent.com/OpenScore/StringQuartets/main/scores/Brahms,_Johannes/String_Quartet_No.1,_Op.51_No.1/sq7108150.mscx"
//   curl -sO "https://raw.githubusercontent.com/OpenScore/StringQuartets/main/scores/Brahms,_Johannes/String_Quartet_No.1,_Op.51_No.1/sq7108150.mxl"
// Reports, per score and part, the notes found by both (same pitch, measure
// and beat), how far their ends differ, and agreement on slur pairs
// (consecutive notes in one slur), stroke marks, bowings and slides.
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { inflateRawSync } from 'node:zlib'
import { fileURLToPath } from 'node:url'
import { readMSCX, readMSCZ, readMXL } from '../score.js'

const here = fileURLToPath(new URL('.', import.meta.url))
const args = process.argv.slice(2)
const dir = args.find(a => !a.startsWith('--')) || here + '../data/OpenScoreSQ'
const nParts = +(args.find(a => a.startsWith('--parts='))?.slice(8) || 4)
const verbose = args.includes('--verbose')
if (!existsSync(dir)) { console.error(`No scores in ${dir} (see the top of this file)`); process.exit(1) }

const inflate = b => inflateRawSync(b)
const files = readdirSync(dir).filter(f => /\.msc[xz]$/.test(f) && existsSync(`${dir}/${f.replace(/\.msc[xz]$/, '.mxl')}`)).sort()
const tot = { a: 0, b: 0, both: 0, endOk: 0, pairs: 0, slurOk: 0, slurA: 0, slurB: 0, mk: 0, mkOk: 0, bow: 0, bowOk: 0, port: 0, portOk: 0, ms: 0, mx: 0 }
export function compare(A, B) {
  // A: MuseScore reader, B: MusicXML reader; notes matched by pitch and place
  // in the bar (measure and beat: seconds drift a few ms over a long movement,
  // because MusicXML rounds tempo marks)
  const key = n => `${n.pitch}@${n.measure}:${Math.round(n.beat * 960)}`
  const idx = new Map()
  for (const n of B) { const k = key(n); if (!idx.has(k)) idx.set(k, []); idx.get(k).push(n) }
  const pairs = []
  for (const n of A) {
    const m = idx.get(key(n))?.shift()
    if (m) pairs.push([n, m])
  }
  const r = { a: A.length, b: B.length, both: pairs.length, endOk: 0, pairs: 0, slurOk: 0, slurA: 0, slurB: 0, mk: 0, mkOk: 0, bow: 0, bowOk: 0, port: 0, portOk: 0 }
  for (const [x, y] of pairs) {
    if (Math.abs((x.off - x.on) - (y.off - y.on)) < 0.003 + 0.002 * (y.off - y.on)) r.endOk++
    if (x.art.stroke || y.art.stroke) { r.mk++; if (x.art.stroke === y.art.stroke) r.mkOk++ }
    if (x.art.bow || y.art.bow) { r.bow++; if (x.art.bow === y.art.bow) r.bowOk++ }
    if (x.art.port || y.art.port) { r.port++; if (!!x.art.port === !!y.art.port) r.portOk++ }
  }
  // slur pairs: consecutive matched notes of one voice, inside one slur or not
  const byVoice = new Map()
  for (const p of pairs) { const v = p[0].voice; if (!byVoice.has(v)) byVoice.set(v, []); byVoice.get(v).push(p) }
  for (const list of byVoice.values()) {
    list.sort((p, q) => p[0].on - q[0].on || p[0].pitch - q[0].pitch)
    for (let i = 1; i < list.length; i++) {
      const [a0, b0] = list[i - 1], [a1, b1] = list[i]
      if (a1.on === a0.on) continue
      const sa = a0.art.slur != null && a0.art.slur === a1.art.slur, sb = b0.art.slur != null && b0.art.slur === b1.art.slur
      r.pairs++; if (sa === sb) r.slurOk++; if (sa) r.slurA++; if (sb) r.slurB++
    }
  }
  return r
}
const pc = (a, b) => b ? (100 * a / b).toFixed(1) : '–'
console.log('score'.padEnd(34), 'part', 'notes ms/mxl', ' both %', ' ends %', ' slur pairs % (ms/mxl slurred)', ' marks %', ' bows %', ' ms read')
for (const f of files) {
  const path = `${dir}/${f}`
  let ms, mx
  for (let p = 0; p < nParts; p++) {
    try {
      const t0 = performance.now()
      ms = f.endsWith('.mscz') ? readMSCZ(readFileSync(path), inflate, { part: p }) : readMSCX(readFileSync(path, 'utf8'), { part: p })
      const t1 = performance.now()
      mx = readMXL(readFileSync(path.replace(/\.msc[xz]$/, '.mxl')), inflate, { part: p })
      tot.ms += t1 - t0
      const r = compare(ms.notes, mx.notes)
      for (const k in r) tot[k] += r[k]
      if (verbose || p === 0) console.log(f.slice(0, 34).padEnd(34), String(p).padStart(4), `${r.a}/${r.b}`.padStart(12), pc(r.both, Math.max(r.a, r.b)).padStart(7), pc(r.endOk, r.both).padStart(7), `${pc(r.slurOk, r.pairs)} (${r.slurA}/${r.slurB})`.padStart(30), pc(r.mkOk, r.mk).padStart(8), pc(r.bowOk, r.bow).padStart(7), `${(t1 - t0).toFixed(0)} ms`.padStart(9))
    } catch (e) { console.log(f, p, 'ERROR', e.message) }
  }
}
console.log(`\n${files.length} scores × ${nParts} parts: notes ${tot.a} (MuseScore) / ${tot.b} (MusicXML), matched ${pc(tot.both, Math.max(tot.a, tot.b))} %, same end ${pc(tot.endOk, tot.both)} %;`)
console.log(`slur pairs agree ${pc(tot.slurOk, tot.pairs)} % of ${tot.pairs} (slurred ${tot.slurA} / ${tot.slurB}); marks ${pc(tot.mkOk, tot.mk)} % of ${tot.mk}; bowings ${pc(tot.bowOk, tot.bow)} % of ${tot.bow}; slides ${pc(tot.portOk, tot.port)} % of ${tot.port}; MuseScore reading ${(tot.ms / 1000).toFixed(1)} s`)
