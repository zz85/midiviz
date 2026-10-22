// Realize the ornaments of the Mutopia Bach files (Well-Tempered Clavier and
// Goldberg Variations) in midis/.
//
//   node midis/tools/bach_ornaments.mjs [--from <git rev>] [--only bach_wtc1_03] [--dry] [--no-kern] [--no-subjects] [--no-cadences]
//
// Mutopia's MIDI is LilyPond's: it plays no trills, mordents or turns, and its
// grace notes are 55 ms blips that steal time from the note before. This reads
// the LilyPond sources (fetched from mutopiaproject.org into midis/tools/mutopia/,
// git-ignored) with strings/lilypond.js, which keeps every ornament sign and grace
// note, lines the score up note by note with our file, and writes the ornaments
// out in the way Bach's own table of ornaments (the Explication in the
// Clavier-Büchlein for W. F. Bach, 1720) and C. P. E. Bach's Versuch describe:
//
//   \trill, \prallprall    trill from the upper note, in even notes of about 80 ms
//                          fitted to the beat, stopping on the main note for the last
//                          quarter of its length; started on the main note when the
//                          note before is the upper note already (a tied start)
//   \prall                 short trill: upper, main, upper, main, then the main note held
//   \mordent               main, lower, main
//   \prallmordent          trill ending with the lower note (trillo und mordant)
//   \upprall / \upmordent  trill from below (doppelt-cadence), ending plain / with the lower note
//   \downprall / \downmordent  trill from above with a turn first, ending plain / with the lower note
//   \turn / \reverseturn   upper, main, lower, main (or lower, main, upper, main), quick, on the beat
//   \appoggiatura          on the beat, taking half the main note (two thirds when dotted), or
//                          its written length when shorter; leaning on it, the main note softer
//   \grace, \acciaccatura  short notes (about 70 ms) on the beat, the main note after
//   \afterGrace            at the end of the main note
//
// Two more sources of signs, for the Well-Tempered Clavier (--no-kern, --no-subjects
// turn them off):
//   the Bach-Gesellschaft edition as CCARH encoded it (humdrum-tools/bach-wtc, read
//   by ./kern.mjs and lined up note by note): a sign it has and Mutopia lacks is
//   added, and its interval (T a tone, t a semitone) replaces the guess below
//   the fugue subject: a sign on one entry of the subject goes to every entry,
//   as players do (fugueEntries: the subject is the first voice until the next
//   voice brings in its first four notes; an entry is the same rhythm and, up to
//   two of them, the same intervals within 2 semitones, octaves aside)
//   cadences: a trill on the note before the close of the main cadences, where players
//   add one unwritten (cadenceTrills: the final cadence of every prelude and fugue, and
//   perfect authentic cadences on a downbeat away from Bach's own signs)
//
// Auxiliary notes are diatonic: of the two candidates a semitone or a tone away,
// the one heard more nearby (the same bar counts most) wins. Loudness comes from
// the note carrying the ornament, so the existing dynamics are kept. The input
// is the committed file at --from (default 04b619f, the dynamics commit), so a
// rerun gives the same files.
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { inflateRawSync } from 'node:zlib'
import { readLilyPondFiles, mainLyFile } from '../../strings/lilypond.js'
import { zipTexts } from '../../strings/score.js'
import { readKern } from './kern.mjs'

const here = fileURLToPath(new URL('.', import.meta.url))
const root = here + '../../'
const { Midi } = createRequire(import.meta.url)(root + 'tonejs-midi.js')
const CACHE = here + 'mutopia/'
const FTP = 'https://www.mutopiaproject.org/ftp/BachJS/'
// the second source: CCARH's encodings of the Bach-Gesellschaft edition (humdrum-tools/bach-wtc)
const KERN = 'https://raw.githubusercontent.com/humdrum-tools/bach-wtc/0b4f4d84b90b254615e7ac09730ec473c9611cb6/kern/'

// file → its parts in order, as Mutopia folders under BachJS/
const P = (bwv, ...dirs) => dirs.map(d => `BWV${bwv}/${d}`)
const GOLDBERG = ['aria', ...Array.from({ length: 30 }, (_, i) => 'v' + String(i + 1).padStart(2, '0')), 'aria'].map(v => `BWV988/bwv-988-${v}`)
export const PIECES = {
  bach_wtc1_03: P(848, 'bwv848a', 'bwv848b'),
  bach_wtc1_04: P(849, 'bwv849a', 'bwv849b'),
  bach_wtc1_06: P(851, 'bwv851a', 'bwv851_fugue06'),
  bach_wtc1_08: P(853, 'bwv853a', 'bwv853b'),
  bach_wtc1_10: P(855, 'bwv855a', 'bwv855b'),
  bach_wtc1_11: P(856, 'BWV856_Praeludium11', 'BWV856_Fugue11'),
  bach_wtc1_12: P(857, 'BWV857_Praeludium12', 'BWV857_Fuga12'),
  bach_wtc1_15: P(860, 'BWV860_Praeludium15', 'BWV860_Fuga15'),
  bach_wtc1_16: P(861, 'BWV861_Praeludium16', 'BWV861_Fuga16'),
  bach_wtc1_17: P(862, 'bach-prelude17', 'bach-fugue17'),
  bach_wtc1_20: P(865, 'BWV865_Praeludium20', 'BWV865_Fuga20'),
  bach_wtc1_24: P(869, 'BWV869_Praeludium24', 'bwv869b'),
  bach_wtc2_01: P(870, 'wtk2prelude1', 'wtk2fuga1'),
  bach_wtc2_02: P(871, 'wtk2-prelude2', 'wtk2-fugue2'),
  bach_wtc2_06p: P(875, 'bwv875a'),
  bach_goldberg_aria: GOLDBERG.slice(0, 1),
  bach_goldberg: GOLDBERG,
}

// the kern file of a WTC part: bach_wtc1_03, 0 → wtc1p03
const kernName = (file, s) => { const m = /^bach_wtc(\d)_(\d\d)/.exec(file); return m ? `wtc${m[1]}${s ? 'f' : 'p'}${m[2]}` : null }
// fugues: the second part of a WTC file
const isFugue = (file, s, dirs) => /^bach_wtc/.test(file) && dirs.length === 2 && s === 1

// ── sources ──────────────────────────────────────────────────────────────────
async function fetchSource(dir) {
  const out = CACHE + dir + '/'
  if (existsSync(out + '.done')) return out
  mkdirSync(out, { recursive: true })
  const html = await (await fetch(FTP + dir + '/')).text()
  const names = [...html.matchAll(/href="([^"?/][^"]*)"/g)].map(m => m[1]).filter(n => /(\.ly|-lys\.zip)$/.test(n))
  if (!names.length) throw new Error('no LilyPond source in ' + FTP + dir)
  for (const n of names) {
    const buf = new Uint8Array(await (await fetch(FTP + dir + '/' + n)).arrayBuffer())
    if (n.endsWith('.zip')) for (const [name, text] of await zipTexts(buf.buffer, b => inflateRawSync(b))) writeFileSync(out + name.split('/').pop(), text)
    else writeFileSync(out + n, buf)
  }
  writeFileSync(out + '.done', names.join('\n'))
  return out
}
async function fetchKern(name) {
  const f = CACHE + 'kern/' + name + '.krn'
  if (!existsSync(f)) {
    mkdirSync(CACHE + 'kern', { recursive: true })
    const r = await fetch(KERN + name + '.krn')
    if (!r.ok) throw new Error(`${KERN}${name}.krn: HTTP ${r.status}`)
    writeFileSync(f, await r.text())
  }
  return readKern(readFileSync(f, 'utf8')).notes
}
// the kern edition's signs on the Mutopia notes: added where Mutopia has none, and the
// interval each sign gives (T a tone, t a semitone …) kept as art.step
function mergeKern(src, kern, log) {
  const ly = src.notes.filter(n => !n.art.grace)
  const n = ly.length, m = kern.length, W = m + 1
  const L = new Uint16Array((n + 1) * W)
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--)
    L[i * W + j] = ly[i].pitch === kern[j].pitch ? L[(i + 1) * W + j + 1] + 1 : Math.max(L[(i + 1) * W + j], L[i * W + j + 1])
  let added = 0, agreed = 0, mOnly = 0
  const seen = new Set()
  for (let i = 0, j = 0; i < n && j < m;) {
    if (ly[i].pitch === kern[j].pitch && L[i * W + j] === L[(i + 1) * W + j + 1] + 1) {
      const a = ly[i], k = kern[j]
      // (an expanded repeat in the kern file maps a written note twice: the first pass decides)
      if (!seen.has(a)) {
        seen.add(a)
        if (k.orn && !a.art.orn) { a.art = { ...a.art, orn: k.orn, from: 'kern' }; added++ }
        else if (k.orn && a.art.orn) agreed++
        else if (a.art.orn) mOnly++
        if (k.step && a.art.orn) a.art = { ...a.art, step: k.step }
      }
      i++; j++
    } else if (L[(i + 1) * W + j] >= L[i * W + j + 1]) i++
    else j++
  }
  log.push(` kern: ${L[0]} of ${n} notes matched; ornaments in both ${agreed}, added from kern ${added}, Mutopia only ${mOnly}`)
  return { added }
}

// the fugue subject's ornaments on every entry: the subject is the first voice up to the
// second voice's entry; an entry is the same rhythm with the same intervals (up to two
// differing by at most 2 semitones, octaves aside, for tonal answers), through its last ornamented note.
// A sign on any entry goes to every entry that lacks it
// how far apart two intervals are, octaves aside (a tonal answer leaps a fourth for a fifth)
const ivDiff = (a, b) => { const d = (((a - b) % 12) + 12) % 12; return Math.min(d, 12 - d) }
function fugueEntries(src, log) {
  const ly = src.notes.filter(n => !n.art.grace)
  const streams = new Map()
  for (const n of ly) { const k = n.staff + ':' + (n.art.vk ?? n.voice); if (!streams.has(k)) streams.set(k, []); streams.get(k).push(n) }
  // one note per onset (the top one) in each stream
  for (const [k, ns] of streams) { const by = new Map(); for (const n of ns) { const o = by.get(n.q.toFixed(4)); if (!o || n.pitch > o.pitch) by.set(n.q.toFixed(4), n) } streams.set(k, [...by.values()].sort((a, b) => a.q - b.q)) }
  const all = [...streams.values()]
  const first = all.reduce((a, b) => a[0].q <= b[0].q ? a : b)
  // the second entry: the first place in another voice where the first four notes come
  // again (by rhythm and intervals); else where another voice first comes in
  let subj = first
  const head4 = first.slice(0, 4)
  let second = Infinity
  for (const ns of all) for (let s = 0; s + 3 < ns.length; s++) {
    if (ns === first || ns[s].q <= first[0].q + 1e-6 || ns[s].q >= second) continue
    let ok = true, off = 0
    for (let k = 1; k < 4 && ok; k++) {
      if (Math.abs((ns[s + k].q - ns[s + k - 1].q) - (head4[k].q - head4[k - 1].q)) > 1e-4) ok = false
      const d = ivDiff(ns[s + k].pitch - ns[s + k - 1].pitch, head4[k].pitch - head4[k - 1].pitch)
      if (d > 2 || (d && ++off > 2)) ok = false
    }
    if (ok) second = ns[s].q
  }
  if (!isFinite(second)) second = Math.min(...all.filter(s => s !== first).map(s => s[0].q))
  subj = first.filter(n => n.q < second - 1e-6)
  if (subj.length < 4) { log.push(' fugue: no subject found'); return 0 }
  const L = subj.length
  const matches = (ns, s, len) => {
    if (s + len > ns.length) return false
    let off = 0
    for (let k = 1; k < len; k++) {
      if (Math.abs((ns[s + k].q - ns[s + k - 1].q) - (subj[k].q - subj[k - 1].q)) > 1e-4) return false
      const d = ivDiff(ns[s + k].pitch - ns[s + k - 1].pitch, subj[k].pitch - subj[k - 1].pitch)
      if (d > 2 || (d && ++off > 2)) return false
    }
    return true
  }
  // entries of the head (the first 6 notes, or all of a shorter subject), then how far each goes
  const head = Math.min(L, 6), entries = []
  for (const ns of all) for (let s = 0; s < ns.length; s++) if (matches(ns, s, head)) {
    let len = head; while (len < L && matches(ns, s, len + 1)) len++
    entries.push({ ns, s, len }); s += head - 1
  }
  // the signs: per subject index, from any entry
  const signs = new Map()
  for (const e of entries) for (let k = 0; k < e.len; k++) { const o = e.ns[e.s + k].art.orn; if (o && !signs.has(k)) signs.set(k, o) }
  let added = 0
  for (const e of entries) for (const [k, o] of signs) {
    if (k >= e.len) continue
    const n = e.ns[e.s + k]
    if (!n.art.orn) { n.art = { ...n.art, orn: o, from: 'subject' }; added++ }
  }
  const nm = n => ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B'][n.pitch % 12]
  log.push(` fugue: subject ${L} notes (${subj.slice(0, 8).map(nm).join(' ')}${L > 8 ? ' …' : ''}), ${entries.length} entries, signs at notes ${[...signs.keys()].map(k => k + 1).join(', ') || 'none'}; added ${added}`)
  return added
}

// trills at the main cadences, where players add one though the score has no sign
// (C. P. E. Bach, Versuch I.2.3: the trill belongs above all on the note before a
// cadence's close). The note: in the top line over the dominant, on degree 2 or 7,
// resolving to the tonic, at least an eighth long, with no sign on it. The cadences:
//   the final one of each prelude and fugue: the last bass move from the dominant to
//   the last chord's root (within 4 bars), else the last beat before the final chord
//   others: a perfect authentic cadence on a downbeat (the bass leaping from the dominant,
//   held at least an eighth, the top line arriving on the root), at least two bars from
//   any sign in the score and eight from another added trill
function cadenceTrills(src, log) {
  const pc = p => ((p % 12) + 12) % 12
  const ns = src.notes.filter(n => !n.art.grace)
  const streams = new Map()
  for (const n of ns) { const k = n.staff + ':' + (n.art.vk ?? n.voice); if (!streams.has(k)) streams.set(k, []); streams.get(k).push(n) }
  const nextIn = new Map(); for (const st of streams.values()) st.forEach((n, i) => nextIn.set(n, st[i + 1]))
  const at = q => ns.filter(n => n.q <= q + 1e-6 && n.q + n.len > q + 1e-6)
  const lowest = q => at(q).reduce((a, b) => !a || b.pitch < a.pitch ? b : a, null)
  const highest = q => at(q).reduce((a, b) => !a || b.pitch > a.pitch ? b : a, null)
  const end = Math.max(...ns.map(n => n.q + n.len))
  const signs = ns.filter(n => n.art.orn).map(n => n.measure)
  const pick = (a, t, X, len) => {
    let best = null
    for (let q = a; q < t - 1e-6;) {
      const h = highest(q + 1e-4); if (!h) break
      const deg = pc(h.pitch - X)
      if ((deg === 2 || deg === 11) && h.len >= len - 1e-6 && !h.art.orn) {
        let nx = nextIn.get(h); if (nx && nx.pitch === h.pitch) nx = nextIn.get(nx)   // past an anticipation
        if (nx && pc(nx.pitch) === X && nx.q <= t + 2 + 1e-6) best = h
      }
      q = Math.max(q + 0.125, h.q + h.len)
    }
    return best
  }
  const found = []
  const fq = Math.max(...ns.filter(n => n.q + n.len > end - 1e-3).map(n => n.q))
  const X = pc(lowest(fq + 1e-4).pitch)
  let fin = null
  for (const t of [...new Set(ns.map(n => +n.q.toFixed(5)))].sort((a, b) => b - a)) {
    if (t > fq + 1e-6 || t < fq - 16) continue
    const b = lowest(t + 1e-4), pb = lowest(t - 1e-4)
    if (b && pb && pc(b.pitch) === X && pc(pb.pitch - X) === 7) { fin = pick(pb.q, t, X, 0.5); if (fin) break }
  }
  fin ??= pick(fq - 4, fq, X, 0.5)
  if (fin) found.push({ note: fin, final: true })
  const bars = [...new Set(ns.filter(n => Math.abs(n.beat) < 1e-6).map(n => +n.q.toFixed(5)))].sort((a, b) => a - b)
  for (const t of bars) {
    const b = lowest(t + 1e-4), pb = lowest(t - 1e-4), top = highest(t + 1e-4)
    if (!b || !pb || !top || Math.abs(b.q - t) > 1e-6) continue
    const Y = pc(b.pitch)
    if (pc(pb.pitch - Y) !== 7 || ![5, 7].includes(pc(pb.pitch - b.pitch)) || pb.len < 0.5 - 1e-6 || pc(top.pitch) !== Y) continue
    const n = pick(pb.q, t, Y, 0.5)
    if (!n || signs.some(m => Math.abs(m - n.measure) <= 2) || found.some(f => Math.abs(f.note.measure - n.measure) < 8)) continue
    found.push({ note: n, final: false })
  }
  for (const { note } of found) note.art = { ...note.art, orn: ['trill'], from: 'cadence' }
  const nm = n => ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B'][pc(n.pitch)]
  log.push(` cadences: ${found.length ? found.sort((a, b) => a.note.q - b.note.q).map(f => `bar ${f.note.measure}${f.final ? ' (final)' : ''} ${nm(f.note)}`).join(', ') : 'none'}`)
  return found.length
}

function readSource(dir) {
  const files = new Map(readdirSync(dir).filter(n => /\.(ly|ily|lyi)$/i.test(n)).map(n => [n, readFileSync(dir + n, 'utf8')]))
  const main = mainLyFile(files)
  const first = readLilyPondFiles(files, { main, graces: true })
  const bpmAt = t => { let b = first.tempo[0]?.bpm ?? 60; for (const x of first.tempo) if (x.t <= t + 1e-6) b = x.bpm; return b }
  const notes = []
  first.parts.forEach((_, p) => {
    for (const n of readLilyPondFiles(files, { main, part: p, graces: true }).notes)
      // len: the written length in quarters (off is shortened for staccato)
      notes.push({ ...n, staff: p, len: (n.off - n.on) * bpmAt(n.on) / 60 })
  })
  // onset order, with triplets' rounding errors ignored, so chords sort by pitch as in the file
  const r = q => Math.round(q * 1e5)
  return { notes: notes.sort((a, b) => r(a.q) - r(b.q) || a.pitch - b.pitch), main }
}

// ── lining the score up with the file: LCS on (onset order, pitch) ───────────
function align(ly, fn) {
  const n = ly.length, m = fn.length, W = m + 1
  const L = new Uint16Array((n + 1) * W)
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--)
    L[i * W + j] = ly[i].pitch === fn[j].midi ? L[(i + 1) * W + j + 1] + 1 : Math.max(L[(i + 1) * W + j], L[i * W + j + 1])
  const pairs = []
  for (let i = 0, j = 0; i < n && j < m;) {
    if (ly[i].pitch === fn[j].midi && L[i * W + j] === L[(i + 1) * W + j + 1] + 1) { pairs.push([i, j]); i++; j++ }
    else if (L[(i + 1) * W + j] >= L[i * W + j + 1]) i++
    else j++
  }
  return pairs
}

// ── ornaments ────────────────────────────────────────────────────────────────
const UNIT = 0.08           // target length of one trill note, seconds
const SHORT = 0.065         // prall, mordent, turn and short grace notes
// a metric subdivision of the beat near UNIT seconds
function unitFor(secPerQ, len) {
  let best = UNIT, err = Infinity
  for (const k of [2, 3, 4, 6, 8, 12, 16, 24, 32]) { const u = secPerQ / k; const e = Math.abs(Math.log(u / UNIT)); if (u >= 0.05 && e < err) { err = e; best = u } }
  return Math.min(best, len / 3)
}
// the diatonic neighbour: of p±1 and p±2, the pitch class heard more nearby
function neighbour(p, dir, ctx) {
  const a = p + dir, b = p + 2 * dir
  const score = q => ctx.get(((q % 12) + 12) % 12) || 0
  return score(b) > score(a) ? b : a
}
// note list for one ornament: [[pitch, on, off, velocityScale]]
function realize(kind, pitch, on, off, unit, ctx, tiedUpper, step = null) {
  const len = off - on
  // the sign's own interval (kern), else the key heard around it
  const lowerSign = kind === 'mordent' || kind === 'upmordent' || kind === 'downmordent'
  const up = step && !lowerSign ? pitch + step : neighbour(pitch, 1, ctx), lo = step && lowerSign ? pitch - step : neighbour(pitch, -1, ctx)
  const seq = (pitches, u, holdLast = true) => {
    const out = []; let t = on
    const k = Math.min(pitches.length, Math.max(1, Math.floor(len / u)))
    for (let i = 0; i < k; i++) {
      const last = i === k - 1
      const t1 = last && holdLast ? off : Math.min(off, t + u)
      out.push([last ? pitch : pitches[i], t, t1, i === 0 ? 1 : 0.84 - 0.02 * Math.min(4, i)])
      t = t1
      if (t >= off - 1e-4) break
    }
    if (out.length && out[out.length - 1][2] < off - 1e-4) out.push([pitch, out[out.length - 1][2], off, 0.82])
    return out
  }
  // a trill: [start pattern…], then upper/main alternations, [ending…], the main note for the last quarter
  // long trills (over 1.2 s) start a third slower and settle into speed over 0.6 s
  const trill = (start, ending = []) => {
    const u = unit, slow = len > 1.2
    const span = len < 6 * u ? len : len - Math.max(u, Math.min(len * 0.25, 0.5))
    const out = []
    let t = 0
    const push = p => {
      if (on + t >= off - 1e-3) return
      const d = slow ? u * (1.5 - 0.5 * Math.min(1, t / 0.6)) : u
      out.push([p, on + t, Math.min(off, on + t + d), !out.length ? 1 : p === pitch ? 0.84 : 0.8]); t += d
    }
    for (const p of start) push(p)
    while (on + t < off - 1e-3 && (t + (ending.length + 2) * u <= span + 1e-6 || out.length < start.length + 2)) push(out[out.length - 1][0] === up ? pitch : up)
    // land on the main note before the ending (or the end)
    if (out[out.length - 1][0] !== pitch) push(pitch)
    for (const p of ending) push(p)
    // the main note held to the end: the last main note of the trill, or struck again after an ending
    const last = out[out.length - 1]
    if (last[0] === pitch) last[2] = off
    else if (on + t < off - 1e-3) out.push([pitch, on + t, off, 0.8])
    return out.filter(x => x[2] - x[1] > 1e-3)
  }
  switch (kind) {
    case 'trill': case 'prallprall': case 'lineprall':
      return tiedUpper ? trill([pitch]) : trill([up])
    case 'prall': case 'pralldown': case 'prallup':
      return tiedUpper ? seq([pitch, up, pitch], Math.min(SHORT, len / 4)) : seq([up, pitch, up, pitch], Math.min(SHORT, len / 5))
    case 'mordent': return seq([pitch, lo, pitch], Math.min(SHORT, len / 4))
    case 'prallmordent': return trill(tiedUpper ? [pitch] : [up], [lo])
    case 'upprall': return trill([lo, pitch])
    case 'upmordent': return trill([lo, pitch], [lo])
    case 'downprall': return trill([up, pitch, lo, pitch])
    case 'downmordent': return trill([up, pitch, lo, pitch], [lo])
    case 'turn': return seq([up, pitch, lo, pitch], Math.min(SHORT, len / 5))
    case 'reverseturn': return seq([lo, pitch, up, pitch], Math.min(SHORT, len / 5))
  }
  return null
}

// ── one segment (a prelude, a fugue, a variation) ────────────────────────────
function segment(src, fn, log) {
  const ly = src.notes.filter(n => !n.art.grace)
  const graces = src.notes.filter(n => n.art.grace)
  const pairs = align(ly, fn)
  const lyToF = new Map(pairs), fUsed = new Set(pairs.map(p => p[1]))
  // seconds at a score position: piecewise linear through the matched onsets
  const anchors = []
  for (const [i, j] of pairs) if (!anchors.length || ly[i].q > anchors[anchors.length - 1][0] + 1e-6) anchors.push([ly[i].q, fn[j].time])
  const secAt = q => {
    let lo = 0, hi = anchors.length - 1
    if (q <= anchors[0][0]) return anchors[0][1] + (q - anchors[0][0]) * spq(0)
    if (q >= anchors[hi][0]) return anchors[hi][1] + (q - anchors[hi][0]) * spq(hi - 1)
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (anchors[mid][0] <= q) lo = mid; else hi = mid }
    const [q0, t0] = anchors[lo], [q1, t1] = anchors[hi]
    return t0 + (q - q0) / (q1 - q0) * (t1 - t0)
  }
  function spq(k) { const a = anchors[Math.max(0, Math.min(anchors.length - 2, k))], b = anchors[Math.max(1, Math.min(anchors.length - 1, k + 1))]; return (b[1] - a[1]) / Math.max(1e-6, b[0] - a[0]) }
  const secPerQAt = q => (secAt(q + 0.5) - secAt(q - 0.5))

  // pitch classes nearby: the same bar ×6, neighbouring bars ×2, the segment ×(1/50)
  const byMeasure = new Map()
  for (const n of ly) { if (!byMeasure.has(n.measure)) byMeasure.set(n.measure, []); byMeasure.get(n.measure).push(n.pitch % 12) }
  const global = new Map(); for (const n of ly) global.set(n.pitch % 12, (global.get(n.pitch % 12) || 0) + 1 / 50)
  const ctxFor = (measure, q) => {
    const c = new Map(global)
    const add = (m, w) => { for (const pc of byMeasure.get(m) || []) c.set(pc, (c.get(pc) || 0) + w) }
    add(measure - 1, 2); add(measure + 1, 1); add(measure, 6)
    return c
  }

  // LilyPond's own grace notes (and \articulate's ornaments) in the file: notes the score
  // does not have; the note before each got shorter to make room, so it gets its length back
  // only near a grace note or an ornament, or short: anything else stays (a misreading of the score)
  const marks = src.notes.filter(n => n.art.grace || n.art.orn).map(n => secAt(n.q))
  const nearMark = t => marks.some(m => Math.abs(m - t) < 0.8)
  const extra = fn.map((f, j) => j).filter(j => !fUsed.has(j) && (nearMark(fn[j].time) || fn[j].duration < 0.08))
  const strays = fn.length - pairs.length - extra.length
  if (strays) log.push(`  ${strays} notes of the file not in the score, kept`)
  // a file note shortened because \articulate turned the written note into an ornament
  const fUsedOnlyHere = j => !extra.some(k => Math.abs(fn[k].time - (fn[j].time + fn[j].duration)) < 0.006)
  for (const j of extra) {
    const g = fn[j]
    for (const [i, k] of pairs) {
      const f = fn[k]
      if (Math.abs(f.time + f.duration - g.time) < 0.006 && ly[i].off - ly[i].on > 0) {
        const want = secAt(ly[i].q + ly[i].len)
        if (want > f.time + f.duration) f.duration = Math.min(want, g.time + g.duration + 0.07) - f.time
      }
    }
  }
  const out = []           // new notes: { midi, time, duration, velocity }
  const drop = new Set(extra)   // file notes replaced
  let nOrn = 0, nGrace = 0
  const unknown = new Map()
  // previous note in the same staff and voice, ending where this one starts
  const prevOf = new Map()
  const byVoice = new Map()
  for (const [k, n] of ly.entries()) { const key = n.staff + ':' + n.voice; if (!byVoice.has(key)) byVoice.set(key, []); byVoice.get(key).push(k) }
  for (const list of byVoice.values()) list.forEach((k, i) => { if (i) prevOf.set(k, list[i - 1]) })

  // grace notes first: they decide where the main note (or its ornament) starts or ends.
  // Grouped by staff, voice and the main note's onset
  const around = new Map()   // file note → { start, end, lean, last } (seconds taken at either end)
  const groups = new Map()
  for (const g of graces) { const key = g.staff + ':' + g.voice + ':' + g.art.graceAt.toFixed(5) + ':' + (g.art.grace === 'afterGrace'); if (!groups.has(key)) groups.set(key, []); groups.get(key).push(g) }
  for (const gs of groups.values()) {
    gs.sort((a, b) => a.on - b.on || a.pitch - b.pitch)
    // chords inside a grace: same onset
    const steps = []; for (const g of gs) { const last = steps[steps.length - 1]; if (last && Math.abs(last[0].on - g.on) < 1e-7) last.push(g); else steps.push([g]) }
    const g0 = gs[0], after = g0.art.grace === 'afterGrace'
    // the main note: same staff and voice, starting at the grace (after a note: the one before)
    let mi = -1
    const sameVoice = n => n.staff === g0.staff && n.voice === g0.voice
    if (after) { for (const [k, n] of ly.entries()) if (sameVoice(n) && n.q < g0.art.graceAt - 1e-6) mi = k }
    else mi = ly.findIndex(n => sameVoice(n) && Math.abs(n.q - g0.art.graceAt) < 1e-6)
    // else any voice of the staff at that time (a grace written in another voice)
    if (mi < 0) mi = ly.findIndex(n => n.staff === g0.staff && Math.abs(n.q - g0.art.graceAt) < 1e-6)
    // else the nearest pitch at that time in either hand
    if (mi < 0) { let d = Infinity; ly.forEach((n, k) => { if (Math.abs(n.q - g0.art.graceAt) < 1e-6 && Math.abs(n.pitch - g0.pitch) < d) { d = Math.abs(n.pitch - g0.pitch); mi = k } }) }
    const j = mi >= 0 ? lyToF.get(mi) : null
    if (j == null) { log.push(`  unmatched grace at bar ${g0.measure} (${g0.pitch} ${g0.art.grace}, main ${mi >= 0 ? ly[mi].pitch : 'none'})`); continue }
    nGrace++
    const main = fn[j], v = main.velocity, mainLen = main.duration
    const a = around.get(j) || { start: 0, end: 0, lean: false, last: null }
    around.set(j, a)
    if (after) {
      // at the end of the note, quick, leading into the next
      const u = Math.min(SHORT, mainLen / (steps.length + 2))
      const t0 = main.time + main.duration - u * steps.length
      steps.forEach((st, s) => { for (const g of st) out.push({ midi: g.pitch, time: t0 + s * u, duration: u, velocity: Math.min(1, v * 0.78) }) })
      a.end = u * steps.length
      continue
    }
    const lean = g0.art.grace === 'appoggiatura' && steps.length === 1
    const writtenSec = g0.art.graceDur * secPerQAt(ly[mi].q)
    // an appoggiatura: half the note (two thirds of a dotted one), or as written when shorter;
    // short graces: about SHORT each, at most half the note
    const total = lean ? Math.min(mainLen * (isDotted(ly[mi].len) ? 2 / 3 : 1 / 2), Math.max(writtenSec, mainLen / 4))
      : Math.min(mainLen / 2, SHORT * steps.length)
    const u = total / steps.length
    steps.forEach((st, s) => { for (const g of st) out.push({ midi: g.pitch, time: main.time + s * u, duration: lean ? u : u - 0.005, velocity: Math.min(1, v * (lean ? 1.05 : 0.8)) }) })
    a.start = total; a.lean = lean; a.last = steps[steps.length - 1][0].pitch
  }
  // the main notes moved by a grace, without an ornament of their own
  const ornamented = new Set(); for (const [i, n] of ly.entries()) if (n.art.orn?.length && lyToF.has(i)) ornamented.add(lyToF.get(i))
  for (const [j, a] of around) {
    if (ornamented.has(j)) continue
    const f = fn[j]
    drop.add(j)
    out.push({ midi: f.midi, time: f.time + a.start, duration: Math.max(0.02, f.duration - a.start - a.end), velocity: Math.min(1, f.velocity * (a.lean ? 0.85 : 1)) })
  }

  // ornament signs
  for (const [i, n] of ly.entries()) {
    const kinds = n.art.orn
    if (!kinds?.length) continue
    let j = lyToF.get(i)
    // not found (\articulate played it as something else): the note from the score's timing,
    // as loud as the nearest note in the file
    let f = fn[j]
    if (j == null) {
      const t = secAt(n.q); let best = fn[0]
      for (const x of fn) if (Math.abs(x.time - t) < Math.abs(best.time - t)) best = x
      f = { midi: n.pitch, time: t, duration: secAt(n.q + n.len) - t, velocity: best.velocity }
      j = -1 - i
    }
    const kind = kinds[0]
    // where the note is: the file's, unless the file's note is a piece of \articulate's own
    // ornament (BWV 857), which starts late or stops short of the written note
    const on0 = secAt(n.q), off0 = secAt(n.q + n.len)
    let on = Math.abs(f.time - on0) < 0.02 ? f.time : on0
    let off = f.time + f.duration < on + 0.85 * (off0 - on0) && (j < 0 || !fUsedOnlyHere(j)) ? off0 : Math.max(on + 0.02, f.time + f.duration)
    const a = around.get(j)
    if (a) { on += a.start; off -= a.end }
    const unit = unitFor(secPerQAt(n.q), off - on)
    const p = prevOf.get(i), prev = p != null ? ly[p] : null
    const ctx = ctxFor(n.measure, n.q)
    const upper = n.art.step && !/mordent$/.test(kind) ? n.pitch + n.art.step : neighbour(n.pitch, 1, ctx)
    // the upper note just sounded (the note before, or an appoggiatura): the trill starts on the main note
    const tiedUpper = (a?.last != null ? a.last === upper : prev && prev.pitch === upper && Math.abs(prev.q + prev.len - n.q) < 1e-4)
    const notes = realize(kind, n.pitch, on, off, unit, ctx, tiedUpper, n.art.step)
    if (!notes) { unknown.set(kind, (unknown.get(kind) || 0) + 1); continue }
    drop.add(j); nOrn++
    const vk = a?.lean ? 0.85 : 1
    for (const [midi, t0, t1, v] of notes) out.push({ midi, time: t0, duration: t1 - t0, velocity: Math.min(1, f.velocity * v * vk) })
  }

  if (unknown.size) log.push('  not realized: ' + [...unknown].map(([k, c]) => `${k}×${c}`).join(' '))
  const kept = fn.filter((_, j) => !drop.has(j)).map(f => ({ midi: f.midi, time: f.time, duration: f.duration, velocity: f.velocity }))
  return { notes: [...kept, ...out], stats: { ly: ly.length, file: fn.length, matched: pairs.length, extra: extra.length, ornaments: nOrn, graces: nGrace } }
}
// dotted: a written length of 3 × a power of two (in quarters)
const isDotted = len => { for (let k = -6; k <= 3; k++) if (Math.abs(len - 1.5 * 2 ** k) < 1e-3) return true; return false }

// ── a file ───────────────────────────────────────────────────────────────────
function splitSegments(notes, count) {
  const ns = notes.slice().sort((a, b) => a.ticks - b.ticks || a.midi - b.midi)
  const gaps = []; let end = 0
  ns.forEach((n, k) => { if (k && n.time - end > 1) gaps.push([n.time - end, k]); end = Math.max(end, n.time + n.duration) })
  const cuts = gaps.sort((a, b) => b[0] - a[0]).slice(0, count - 1).map(g => g[1]).sort((a, b) => a - b)
  if (cuts.length !== count - 1) throw new Error(`found ${cuts.length + 1} parts, expected ${count}`)
  const segs = []; let a = 0
  for (const c of [...cuts, ns.length]) { segs.push(ns.slice(a, c)); a = c }
  return segs
}

async function main() {
  const args = process.argv.slice(2)
  const opt = k => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null }
  const from = opt('--from') ?? '04b619f', only = opt('--only'), dry = args.includes('--dry')
  const useKern = !args.includes('--no-kern'), useSubjects = !args.includes('--no-subjects'), useCadences = !args.includes('--no-cadences')
  const sources = new Map()
  for (const [file, dirs] of Object.entries(PIECES)) {
    if (only && only !== file) continue
    const log = []
    const buf = execFileSync('git', ['show', `${from}:midis/${file}.mid`], { cwd: root, maxBuffer: 1 << 28 })
    const midi = new Midi(buf)
    const track = midi.tracks.find(t => t.notes.length)
    const segs = splitSegments(track.notes, dirs.length)
    const all = []
    const total = { ly: 0, file: 0, matched: 0, extra: 0, ornaments: 0, graces: 0 }
    for (const [s, dir] of dirs.entries()) {
      const segLog = []
      if (!sources.has(dir)) {
        const src = readSource(await fetchSource(dir))
        const kn = useKern && kernName(file, s)
        if (kn) mergeKern(src, await fetchKern(kn), segLog)
        if (useSubjects && isFugue(file, s, dirs)) fugueEntries(src, segLog)
        if (useCadences && /^bach_wtc/.test(file)) cadenceTrills(src, segLog)
        sources.set(dir, src)
      }
      const r = segment(sources.get(dir), segs[s], segLog)
      for (const l of segLog) log.push(`  ${dir.split('/')[1]}:${l.slice(1)}`)
      all.push(...r.notes)
      for (const k in total) total[k] += r.stats[k]
      if (r.stats.matched < 0.97 * Math.min(r.stats.ly, r.stats.file)) log.push(`  ${dir}: only ${r.stats.matched} of ${r.stats.ly} score notes found in the file`)
    }
    // the same key struck again: the earlier note lets go just before
    all.sort((a, b) => a.time - b.time || a.midi - b.midi)
    const lastBy = new Map()
    for (const n of all) {
      const p = lastBy.get(n.midi)
      if (p && p.time + p.duration > n.time - 0.004) p.duration = Math.max(0.01, n.time - 0.004 - p.time)
      lastBy.set(n.midi, n)
    }
    track.notes = []
    for (const n of all) track.addNote({ midi: n.midi, time: n.time, duration: n.duration, velocity: n.velocity })
    console.log(`${file}: ${total.ornaments} ornaments, ${total.graces} grace groups; score ${total.ly} notes, file ${total.file}, matched ${total.matched}, LilyPond graces removed ${total.extra}; notes now ${all.length}`)
    for (const l of log) console.log(l)
    if (!dry) writeFileSync(root + `midis/${file}.mid`, Buffer.from(midi.toArray()))
  }
}
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await main()
