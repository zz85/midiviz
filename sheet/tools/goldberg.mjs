// The score of the complete Goldberg Variations (midis/bach_goldberg.mid) for
// #049 and #050: sheet/scores/bach_goldberg.json and, for the engraving, a
// score MIDI of each movement in sheet/scores/goldberg/.
//
//   node sheet/tools/goldberg.mjs [--detect] [--marked /tmp/marked] [--engrave-only]
//
// 1. The movements, from Mutopia's LilyPond (midis/tools/mutopia/BWV988/, fetched by
//    midis/tools/bach_ornaments.mjs): each one's title (its `piece`), its bars and
//    where each starts, in seconds from its own start. LilyPond's MIDI, which
//    midis/bach_goldberg.mid is made from, plays each movement without its repeats,
//    first and second endings both, so a bar's time in it is the bar's time in the
//    source. A bar starts at the first note of any staff in it; Var. 26, whose two
//    staves are in 18/16 and 3/4 at once, has bars read wrong by the reader, so
//    its bars are taken at its 3/4 grid instead.
// 2. The pages: the Bach-Gesellschaft edition, Band 3, pp. 263-308 (1853), the
//    Bayerische Staatsbibliothek's scan (bsb11131414, pages 285-330), in
//    sheet/scores/bga988/ (fetched where missing). With --detect, each page's
//    systems and bars are found again (sheet/tools/detect-pages.mjs); else the
//    manifest's are kept.
// 3. Which systems hold which movement: each movement begins a system, so the
//    systems are cut into the 31 movements where the bars found in each run come
//    nearest the movement's bars (a dynamic programme). Where a run has more
//    bars than the movement (a repeat sign or a pickup read as a bar), the
//    narrowest neighbours are joined; fewer, the widest bars are split.
//    The Aria da capo is played from the Aria's systems.
// 4. The score MIDI of each movement for the engraver: the notes as printed (no
//    ornaments realized, no grace notes), a track a voice, its time signature
//    (Var. 16: its two parts, the ouverture in 2/2 and the fugue in 3/8, as
//    two files), as sheet/tools/score_midi.mjs writes the Aria's.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { readSource } from '../../midis/tools/bach_ornaments.mjs'

const root = fileURLToPath(new URL('../../', import.meta.url))
const { Midi } = createRequire(import.meta.url)(root + 'tonejs-midi.js')
const args = process.argv.slice(2), has = k => args.includes(k), opt = k => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null }
const SRC = root + 'midis/tools/mutopia/BWV988/'
const PAGES = Array.from({ length: 46 }, (_, i) => 263 + i)
const MANIFEST = root + 'sheet/scores/bach_goldberg.json'
const IDS = ['aria', ...Array.from({ length: 30 }, (_, i) => 'v' + String(i + 1).padStart(2, '0'))]
// the movements' meters, as printed (Var. 16: 2/2, then 3/8 from bar 17, its second ending)
const METER = { aria: '3/4', v01: '3/4', v02: '2/4', v03: '12/8', v04: '3/8', v05: '3/4', v06: '3/8', v07: '6/8', v08: '3/4', v09: '4/4', v10: '2/2', v11: '12/16', v12: '3/4', v13: '3/4', v14: '3/4', v15: '2/4', v16: '2/2', v17: '3/4', v18: '2/2', v19: '3/8', v20: '3/4', v21: '4/4', v22: '2/2', v23: '3/4', v24: '9/8', v25: '3/4', v26: '3/4', v27: '6/8', v28: '3/4', v29: '3/4', v30: '4/4' }
const KEY = { v15: ['G', 'minor'], v21: ['G', 'minor'], v25: ['G', 'minor'] }

// ── 1. the movements ──
const movements = IDS.map(id => {
  const dir = `${SRC}bwv-988-${id}/`
  const ly = execFileSync('sh', ['-c', `cat "${dir}"*.ly`], { encoding: 'utf8' })
  const title = (/^\s*piece\s*=\s*"(.*)"\s*$/m.exec(ly)?.[1] || id).replace(/\\"/g, '"').replace(/\s+/g, ' ').replace(/\s*\.\s*a\s/, '. a ').trim()
  const { notes } = readSource(dir)
  // seconds a quarter here (one tempo a movement)
  const ref = notes.find(n => n.q > 1), spq = ref.on / ref.q
  const endQ = Math.max(...notes.map(n => n.q + n.len)), end = Math.max(...notes.map(n => n.off))
  let starts
  if (id === 'v26') {
    const [a, b] = METER[id].split('/').map(Number), bq = 4 * a / b
    starts = Array.from({ length: Math.round(endQ / bq) }, (_, i) => i * bq)
  } else {
    const first = new Map()
    for (const n of notes) first.set(n.measure, Math.min(first.get(n.measure) ?? Infinity, n.q))
    const ms = [...first.keys()].sort((x, y) => x - y)
    starts = ms.map(m => first.get(m))
    // (a measure whose staves both open on a tie or a rest starts later than it does: the bar before's length again)
    for (let i = 1; i < starts.length - 1; i++) if (starts[i + 1] - starts[i] < starts[i] - starts[i - 1] - 1e-6 && Math.abs((starts[i + 1] - starts[i - 1]) / 2 - (starts[i] - starts[i - 1])) > 1e-6) starts[i] = (starts[i - 1] + starts[i + 1]) / 2
  }
  const r3 = v => Math.round(v * 1000) / 1000
  return { id, title, meter: METER[id], key: KEY[id] || ['G', 'major'], bars: starts.length, starts: starts.map(q => r3(q * spq)), end: r3(Math.max(end, endQ * spq)), spq, notes }
})
console.error(movements.map(m => `${m.id} ${m.bars}`).join(', '), '·', movements.reduce((s, m) => s + m.bars, 0), 'bars')

// ── 2. the pages ──
const pagePath = p => `sheet/scores/bga988/p${p}.webp`
for (const p of PAGES) if (!existsSync(root + pagePath(p))) {
  mkdirSync(root + 'sheet/scores/bga988', { recursive: true })
  execFileSync('curl', ['-sS', '-m', '120', '-o', root + pagePath(p), `https://api.digitale-sammlungen.de/iiif/image/v2/bsb11131414_00${p + 22}/full/2000,/0/gray.webp`])
}
const old = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, 'utf8')) : null
let pages
if (has('--detect') || !old?.scan?.pages) {
  const { detectPages } = await import('./detect-pages.mjs')
  pages = (await detectPages(PAGES.map(pagePath), { marked: opt('--marked') })).map((d, i) => ({ image: pagePath(PAGES[i]), page: PAGES[i], ...d }))
} else pages = old.scan.pages
// barlines read by eye, where detection missed or added one
const FIXES = root + 'sheet/scores/bach_goldberg.fixes.json'
if (existsSync(FIXES)) for (const [key, xs] of Object.entries(JSON.parse(readFileSync(FIXES, 'utf8')).systems)) {
  const [pg, j] = key.split('.').map(Number), sy = pages.find(p => p.page === pg)?.systems[j]
  if (!sy) throw new Error(`fixes: no system ${key}`)
  const ends = [sy.x0, ...xs, sy.x1]
  sy.bars = ends.slice(1).map((x, i) => [i + 1, ends[i], x])
  sy.fixed = true
}

// ── 3. movements onto systems ──
const systems = pages.flatMap((p, pi) => p.systems.map((s, si) => ({ page: pi, index: si, s, n: s.bars.length })))
// a movement's first system is indented, under its heading ("Variatio 12. Canone alla Quarta."):
// its left end three spaces or more right of the page's other systems'
const median = a => { const b = [...a].sort((x, y) => x - y); return b[b.length >> 1] }
for (const p of pages) {
  const x = median(p.systems.map(s => s.x0))
  p.systems.forEach(s => { s.heading = (s.x0 - x) / p.space > 3 })
}
const startCost = sy => sy.s.heading ? 0 : 50
const M = movements.length, S = systems.length
// cost[i][k]: movements 0..i-1 over systems 0..k-1: the bars found against the bars, a
// movement begun on a system with a heading counts for it, one inside a page without one
// against it, and a heading no movement begins at, much against it
const cost = Array.from({ length: M + 1 }, () => new Float64Array(S + 1).fill(Infinity)), from = Array.from({ length: M + 1 }, () => new Int32Array(S + 1))
cost[0][0] = 0
const pre = [0], heads = [0]
for (const s of systems) { pre.push(pre.at(-1) + s.n); heads.push(heads.at(-1) + (s.s.heading ? 1 : 0)) }
for (let i = 1; i <= M; i++) for (let k = i; k <= S; k++) for (let j = i - 1; j < k; j++) {
  if (cost[i - 1][j] === Infinity) continue
  // (headings inside the run, past its first system: each a movement missed)
  const missed = heads[k] - heads[j + 1]
  const c = cost[i - 1][j] + Math.abs(pre[k] - pre[j] - movements[i - 1].bars) + startCost(systems[j]) + 50 * missed
  if (c < cost[i][k]) { cost[i][k] = c; from[i][k] = j }
}
const cut = [S]; for (let i = M; i > 0; i--) cut.unshift(from[i][cut[0]])
const report = []
movements.forEach((m, i) => {
  const run = systems.slice(cut[i], cut[i + 1])
  // the bars found, in order, each with its system
  let bars = run.flatMap((r, j) => r.s.bars.map(([, x0, x1]) => ({ sys: cut[i] + j, x0, x1 })))
  const found = bars.length
  // how many bars each system holds: the ones found, moved one at a time toward the movement's
  // count on the system whose bars are the farthest from the movement's mean width
  const width = run.map(r => r.s.x1 - r.s.x0), mean = width.reduce((x, y) => x + y, 0) / m.bars
  // (a bar under a third of the mean is a false one: a time signature, a repeat sign, stems
  // in line; it joins its narrower neighbour)
  const kept = run.map(r => {
    const b = r.s.bars.map(([, x0, x1]) => ({ x0, x1 })), w = q => b[q].x1 - b[q].x0
    if (r.s.fixed) return b
    for (let q; b.length > 1 && (q = b.findIndex((_, i) => w(i) < mean * 0.3)) >= 0;) {
      const n = q === 0 ? 1 : q === b.length - 1 ? q - 1 : w(q - 1) < w(q + 1) ? q - 1 : q + 1
      const [a, c] = [Math.min(q, n), Math.max(q, n)]
      b.splice(a, 2, { x0: b[a].x0, x1: b[c].x1 })
    }
    return b
  })
  // the count on each system: near the bars found there, nearer still to its width over the
  // movement's mean bar (an edition's bars are about as wide all through a movement), adding up
  // to the movement's bars
  // (v16 changes meter, from the Ouverture's wide 2/2 bars to the fugue's narrow 3/8: no mean
  // bar there, so the bars found decide)
  const wk = m.id === 'v16' ? 0 : 2
  const KMAX = 16, cst = (j, q) => 0.6 * Math.abs(q - kept[j].length) + wk * Math.abs(Math.log(width[j] / q / mean))
  let dp = new Map([[0, { c: 0, ks: [] }]])
  for (let j = 0; j < run.length; j++) {
    const next = new Map()
    for (const [sum, { c, ks }] of dp) for (let q = run[j].s.fixed ? kept[j].length : 1; q <= (run[j].s.fixed ? kept[j].length : KMAX) && sum + q <= m.bars; q++) {
      const v = c + cst(j, q), o = next.get(sum + q)
      if (!o || v < o.c) next.set(sum + q, { c: v, ks: [...ks, q] })
    }
    dp = next
  }
  const k = dp.get(m.bars)?.ks ?? kept.map(b => Math.max(1, b.length))
  // then on each system, too many: join the narrowest pair of neighbours; too few: split the widest
  bars = run.flatMap((r, j) => {
    const b = kept[j].length ? kept[j].map(q => ({ sys: cut[i] + j, ...q })) : [{ sys: cut[i] + j, x0: r.s.x0, x1: r.s.x1 }]
    while (b.length > k[j]) {
      let best = 0
      for (let q = 1; q + 1 < b.length; q++) if (Math.min(b[q].x1 - b[q].x0, b[q + 1].x1 - b[q + 1].x0) < Math.min(b[best].x1 - b[best].x0, b[best + 1].x1 - b[best + 1].x0)) best = q
      b.splice(best, 2, { ...b[best], x1: b[best + 1].x1 })
    }
    while (b.length < k[j]) {
      let best = 0
      for (let q = 1; q < b.length; q++) if (b[q].x1 - b[q].x0 > b[best].x1 - b[best].x0) best = q
      const c = b[best], mid = (c.x0 + c.x1) / 2
      b.splice(best, 1, { ...c, x1: mid }, { ...c, x0: mid })
    }
    return b
  })
  m.systems = run.map((r, j) => cut[i] + j)
  m.barAt = bars.map(b => [b.sys, b.x0, b.x1])
  report.push(`${m.id}: pp. ${pages[run[0].page].page}-${pages[run.at(-1).page].page}, ${run.length} systems, ${found} bars found for ${m.bars}${found !== m.bars ? ' (adjusted)' : ''}`)
})
console.error(report.join('\n'))

// ── 4. the score MIDI of each movement ──
mkdirSync(root + 'sheet/scores/goldberg', { recursive: true })
const PPQ = 480
function writeScore(file, notes, meter, key, q0 = 0) {
  const midi = new Midi()
  midi.header.setTempo(60)
  midi.header.timeSignatures.push({ ticks: 0, timeSignature: meter.split('/').map(Number), measures: 0 })
  midi.header.keySignatures.push({ ticks: 0, key: key[0], scale: key[1] })
  midi.header.update()
  const kept = notes.filter(n => n.len >= 0.1)
  for (const [staff, name] of [[0, 'Right hand'], [1, 'Left hand']]) {
    const voices = [...new Set(kept.filter(n => n.staff === staff).map(n => n.voice))].sort((a, b) => a - b)
    for (const v of voices) {
      const t = midi.addTrack(); t.name = voices.length > 1 ? `${name} · voice ${v}` : name; t.channel = staff
      for (const n of kept.filter(n => n.staff === staff && n.voice === v)) t.addNote({ midi: n.pitch, ticks: Math.round((n.q - q0) * PPQ), durationTicks: Math.max(1, Math.round(n.len * PPQ)), velocity: 0.7 })
    }
  }
  writeFileSync(root + file, Buffer.from(midi.toArray()))
}
for (const m of movements) {
  m.engrave = []
  if (m.id === 'v16') {
    // the ouverture's 16 bars in 2/2, then from the second ending on in 3/8, each its own file
    const q17 = m.starts[16] / m.spq
    writeScore(`sheet/scores/goldberg/${m.id}a.score.mid`, m.notes.filter(n => n.q < q17 - 1e-6), '2/2', m.key)
    // (the last bar, a held 2/2 chord, engraves as two 3/8 bars and a bit: the cursor still finds bar 50 by time)
    writeScore(`sheet/scores/goldberg/${m.id}b.score.mid`, m.notes.filter(n => n.q >= q17 - 1e-6), '3/8', m.key, q17)
    m.engrave.push({ score: `sheet/scores/goldberg/${m.id}a.score.mid`, firstBar: 1, bars: 16 }, { score: `sheet/scores/goldberg/${m.id}b.score.mid`, firstBar: 17, bars: m.bars - 16 })
  } else {
    writeScore(`sheet/scores/goldberg/${m.id}.score.mid`, m.notes, m.meter, m.key)
    m.engrave.push({ score: `sheet/scores/goldberg/${m.id}.score.mid`, firstBar: 1, bars: m.bars })
  }
}

// ── the manifest ──
const r3 = v => Math.round(v * 1000) / 1000
const manifest = {
  title: 'Bach - Goldberg Variations BWV 988 (complete)',
  midi: 'midis/bach_goldberg.mid',
  // the MIDI plays each movement in turn (the Aria, the 30 variations, the Aria again), 2.5 s apart
  sequence: [...IDS, 'aria'],
  movements: movements.map(m => ({ id: m.id, title: m.title, meter: m.meter, bars: m.bars, starts: m.starts, end: m.end, systems: m.systems, barAt: m.barAt.map(([s, a, b]) => [s, r3(a), r3(b)]), engrave: m.engrave })),
  scan: {
    edition: 'Bach-Gesellschaft Ausgabe, Band 3, pp. 263-308 (Leipzig: Breitkopf und Haertel, 1853), ed. Carl Ferdinand Becker',
    source: 'Bayerische Staatsbibliothek, bsb11131414, pages 285-330 (IIIF, grey, 2000 px wide); the same edition as IMSLP #00823',
    license: 'Public domain (published 1853)',
    header: 5, firstHeader: 7.5,
    pages: pages.map(p => ({ image: p.image, page: p.page, width: p.width, height: p.height, space: p.space, systems: p.systems })),
  },
  engraved: { source: "Mutopia Project, BachJS/BWV988 (LilyPond, typeset by JD Erickson and others from the Bach-Gesellschaft edition, CC BY-SA 3.0), notes as printed, written by sheet/tools/goldberg.mjs" },
}
writeFileSync(MANIFEST, JSON.stringify(manifest) + '\n')
console.error('wrote', MANIFEST, (JSON.stringify(manifest).length / 1024).toFixed(0), 'KB')
