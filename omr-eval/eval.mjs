// #053: read every page of the Sibelius 2 viola part with ScoreShift's OMR and check each
// note head against the pawchestra MIDI (omr-eval/truth.mjs).
//   node omr-eval/eval.mjs [--pages 2-5] [--json omr-eval/results.json] [--quiet]
// Every detected head, in reading order (page, staff top to bottom, left to right, chords low
// to high), is aligned with the truth notes in score order by an edit-distance on MIDI pitch,
// so a missed or extra head costs locally and doesn't shift everything after it. Each head is
// then one of: match (right pitch), wrong (aligned to a note of another pitch: octave,
// semitone, step or other), extra (no counterpart); each truth note no head aligns with is
// missed, and is placed on the page between the heads around it. Clefs and keys are scored
// against the truth notes' spelling where the alignment holds.
import fs from 'node:fs'
import path from 'node:path'
import { decodeGray } from '../../random-sketches/vibes/scoreshift/png.js'
import { normalize, analyzeAfter, keyAt } from '../../random-sketches/vibes/scoreshift/omr.js'
import { midiOf, nameOf } from '../../random-sketches/vibes/scoreshift/theory.js'
import { violaTruth } from './truth.mjs'

const here = path.dirname(new URL(import.meta.url).pathname)
export const PAGES_DIR = path.join(here, 'pages')

const sel = s => s.split(',').flatMap(r => { const [a, z] = r.split('-').map(Number); return Array.from({ length: (z || a) - a + 1 }, (_, i) => a + i) })

/** Read one page: heads in reading order, in page pixels, with the staff they sit on. */
export function readPage(file, { fifths = null, analyzeOpts = {} } = {}) {
  const img = decodeGray(fs.readFileSync(file))
  const t0 = performance.now()
  const norm = normalize(img)
  const model = analyzeAfter(norm, fifths, analyzeOpts)
  const ms = performance.now() - t0
  const [a, b, c, d, e, f] = norm.A
  const toPage = (u, v) => [a * u + b * v + c, d * u + e * v + f]
  const staves = model.staves.map((st, i) => {
    const [x0, y0] = toPage(st.x0, (st.pts[0]?.ys[0] ?? 0)), [x1, y1] = toPage(st.x1, (st.pts[st.pts.length - 1]?.ys[4] ?? 0))
    return { i, clef: st.clef.type, clefDetected: st.clef.detected, fifths: st.key.fifths, keyDetected: st.key.detected ?? null, keyInferred: !!st.key.inferred, system: st.system, bars: st.bars.length, box: [x0, Math.min(y0, y1), x1, Math.max(y0, y1)], clefChanges: (st.clefChanges || []).map(k => ({ type: k.type, x: toPage(k.x0, 0)[0], box: [...toPage(k.box[0], k.box[1]), ...toPage(k.box[2], k.box[3])] })), heads: [] }
  })
  for (const st of model.staves) {
    // columns low to high, as the truth lists a chord's notes: heads within 0.9 space in x
    const byX = st.notes.filter(n => !n.grace).sort((p, q) => p.x - q.x), ns = []
    for (let i = 0; i < byX.length;) { let j = i + 1; while (j < byX.length && byX[j].x - byX[i].x < 0.9 * model.space) j++; ns.push(...byX.slice(i, j).sort((p, q) => midiOf(p.pitch) - midiOf(q.pitch))); i = j }
    for (const n of ns) {
      const [x, y] = toPage(n.x, n.y)
      staves[st.index].heads.push({ x, y, midi: midiOf(n.pitch), name: nameOf(n.pitch), p: n.p, kind: n.kind, keyFifths: keyAt(st, n.x), bar: n.bar ?? null, accid: n.accid?.type ?? null })
    }
  }
  return { w: img.w, h: img.h, ms, space: model.space / norm.scale, staves, endFifths: model.staves.length ? model.staves[model.staves.length - 1].key.fifths : fifths }
}

/**
 * The page's heads in reading order: system by system; within a system of one staff, left to
 * right; within a system of several staves (a divisi passage on two braced staves), the staves'
 * heads merged by x, since the truth lists the notes of one onset together, low to high.
 */
export function readingOrder(page) {
  const out = [], systems = new Map()
  for (const st of page.staves) { const k = st.system ?? st.i; if (!systems.has(k)) systems.set(k, []); systems.get(k).push(st) }
  for (const staves of systems.values()) {
    if (staves.length === 1) { for (const h of staves[0].heads) out.push([staves[0].i, h]); continue }
    const all = staves.flatMap(st => st.heads.map(h => [st.i, h])).sort((a, b) => a[1].x - b[1].x)
    for (let i = 0; i < all.length;) { let j = i + 1; while (j < all.length && all[j][1].x - all[i][1].x < 0.9 * page.space) j++; out.push(...all.slice(i, j).sort((a, b) => a[1].midi - b[1].midi)); i = j }
  }
  return out
}

/**
 * Edit-distance alignment of the truth notes `a` with the detected heads `b`: [[i, j]] with -1
 * for a gap. Costs (in quarters): a wrong pitch 1, or 1/2 where it is off by an octave, a
 * semitone or a step (the misreadings a head has: a clef, an accidental, a line), so that a
 * head pairs with the note it misread rather than with any other; a missed note 1, an extra head 1, and 1/4 for
 * a truth note that repeats the pitch before it within an eighth note (`a[i].repeat`): a
 * tremolo, which the MIDI writes out as repeated notes and the page prints as one head with
 * slashes on its stem, costs almost nothing to fold into that head, while a head that is there
 * still matches it for free.
 */
export function align(a, b) {
  const n = a.length, m = b.length, W = m + 1, D = new Uint32Array((n + 1) * W)
  const del = i => (a[i].repeat ? 1 : 4), pa = a.map(t => t.midi), pb = b
  const sub = (x, y) => { const d = Math.abs(x - y); return d === 0 ? 0 : d === 12 || d <= 2 ? 2 : 4 }
  for (let j = 0; j <= m; j++) D[j] = 4 * j
  for (let i = 1; i <= n; i++) {
    D[i * W] = D[(i - 1) * W] + del(i - 1); const ai = pa[i - 1], r = i * W, p = (i - 1) * W, di = del(i - 1)
    for (let j = 1; j <= m; j++) { const s = D[p + j - 1] + sub(ai, pb[j - 1]), u = D[p + j] + di, l = D[r + j - 1] + 4; D[r + j] = s < u ? (s < l ? s : l) : u < l ? u : l }
  }
  const pairs = []; let i = n, j = m
  while (i > 0 || j > 0) {
    const v = D[i * W + j]
    if (i > 0 && j > 0 && v === D[(i - 1) * W + j - 1] + sub(pa[i - 1], pb[j - 1])) { pairs.push([i - 1, j - 1]); i--; j-- }
    else if (i > 0 && v === D[(i - 1) * W + j] + del(i - 1)) { pairs.push([i - 1, -1]); i-- }
    else { pairs.push([-1, j - 1]); j-- }
  }
  return pairs.reverse()
}

/**
 * Mark each truth note the page prints no head of its own for: a note that repeats the pitch of
 * the onset before it within an eighth note (a tremolo on one note, written out in the MIDI as
 * repeated notes and printed as one head with slashes on its stem), or that repeats the pitch of
 * the onset two back while the one between differs, within an eighth (a tremolo between two
 * notes, printed as two heads joined by beams).
 */
export function markRepeats(truth, ppq = 240) {
  // onsets: groups of notes at one tick of one movement
  const onsets = []
  for (const t of truth) { const last = onsets[onsets.length - 1]; if (last && last.tick === t.tick && last.mvt === t.mvt) last.notes.push(t); else onsets.push({ tick: t.tick, mvt: t.mvt, notes: [t] }) }
  for (let i = 0; i < onsets.length; i++) {
    const o = onsets[i], p1 = onsets[i - 1], p2 = onsets[i - 2]
    const near = q => q && q.mvt === o.mvt && o.tick - q.tick > 0 && o.tick - q.tick <= ppq / 2
    for (const t of o.notes) {
      const in1 = near(p1) && p1.notes.some(n => n.midi === t.midi)
      const in2 = near(p2) && near(p1) && p2.notes.some(n => n.midi === t.midi) && !p1.notes.some(n => n.midi === t.midi) && o.tick - p2.tick <= ppq
      t.repeat = in1 || in2
    }
  }
  return truth
}

export const wrongKind = d => (Math.abs(d) === 12 ? 'octave' : Math.abs(d) === 1 ? 'semitone' : Math.abs(d) === 2 ? 'step' : 'other')

/** Run the whole part: pages read, aligned with the truth, and scored. */
export function evaluate({ pages, truth = violaTruth(), dir = PAGES_DIR, log = () => {}, analyzeOpts, cached = null } = {}) {
  const files = fs.readdirSync(dir).filter(f => /^p\d+\.png$/.test(f)).sort()
  const nums = pages || files.map(f => +f.slice(1, -4))
  const read = [], G = []
  let fifths = null
  for (const k of nums) {
    const file = path.join(dir, `p${String(k).padStart(3, '0')}.png`)
    let page = cached?.find(p => p.page === k)
    if (page) { for (const st of page.staves) for (const h of st.heads) { delete h.cat; delete h.wrong; delete h.truth } }
    else try { page = readPage(file, { fifths, analyzeOpts }) } catch (e) { page = { error: e.message, staves: [], w: 0, h: 0, ms: 0 } }
    page.page = k; fifths = page.endFifths ?? fifths
    read.push(page)
    for (const [staff, head] of readingOrder(page)) G.push({ page: k, staff, head })
    log(`p${k}: ${page.staves.length} staves, ${page.staves.reduce((s, st) => s + st.heads.length, 0)} heads, ${Math.round(page.ms)} ms${page.error ? ' ERROR ' + page.error : ''}`)
  }
  markRepeats(truth)
  const pairs = align(truth, G.map(g => g.head.midi))
  const total = { truth: truth.length, detected: G.length, match: 0, wrong: 0, extra: 0, missed: 0, folded: 0, wrongKinds: { octave: 0, semitone: 0, step: 0, other: 0 } }
  // category per head, and missed notes placed between the heads around them
  let lastG = -1
  const missedBuf = []
  const place = (gi) => { for (const t of missedBuf) { const a = G[lastG], b = G[gi]; const on = b || a; t.page = on.page; t.staff = on.staff; t.x = a && b && a.page === b.page && a.staff === b.staff ? (a.head.x + b.head.x) / 2 : (b ? b.head.x - 20 : a.head.x + 20); t.y = a && b && a.page === b.page && a.staff === b.staff ? (a.head.y + b.head.y) / 2 : on.head.y; read.find(p => p.page === on.page).staves[on.staff].missed.push(t) } missedBuf.length = 0 }
  for (const p of read) for (const st of p.staves) { st.missed = []; st.votes = new Map() }
  for (const [ti, gi] of pairs) {
    if (gi >= 0) place(gi)
    if (ti >= 0 && gi >= 0) {
      const t = truth[ti], g = G[gi], d = g.head.midi - t.midi
      g.head.truth = { midi: t.midi, mvt: t.mvt, bar: t.bar, beat: t.beat }
      if (d === 0) { g.head.cat = 'match'; total.match++ } else { g.head.cat = 'wrong'; g.head.wrong = wrongKind(d); total.wrong++; total.wrongKinds[g.head.wrong]++ }
      const st = read.find(p => p.page === g.page).staves[g.staff]
      st.votes.set(t.mvt + ':' + t.bar, (st.votes.get(t.mvt + ':' + t.bar) || 0) + 1)
      lastG = gi
    } else if (ti >= 0) { const t = truth[ti]; if (t.repeat) total.folded++; else { missedBuf.push({ midi: t.midi, mvt: t.mvt, bar: t.bar, beat: t.beat }); total.missed++ } }
    else { G[gi].head.cat = 'extra'; total.extra++; lastG = gi }
  }
  place(-1)
  // A staff most of whose heads read an octave above the truth is a passage the MIDI has an
  // octave low (the finale's theme, among others; the page is right, read by eye): those heads
  // count as matches of the printed pitch, and the staff is flagged `midiOctave`.
  total.midiOctave = 0
  for (const p of read) for (const st of p.staves) {
    const aligned = st.heads.filter(h => h.truth), up = aligned.filter(h => h.midi - h.truth.midi === 12), ok = aligned.filter(h => h.cat === 'match')
    // most of the staff an octave up, or a run of 8 among heads otherwise right (a passage that
    // changes octave within the staff)
    if (aligned.length >= 8 && (up.length >= 0.6 * aligned.length || (up.length >= 8 && up.length + ok.length >= 0.85 * aligned.length))) {
      st.midiOctave = true
      for (const h of up) { h.cat = 'match'; h.midiOctave = true; delete h.wrong; total.wrong--; total.wrongKinds.octave--; total.match++; total.midiOctave++ }
    }
  }
  // An extra head at the same onset as a matched head of its system (within 0.9 space in x) is
  // a note of a chord or a divisi line that the MIDI leaves out (p. 9 and p. 15: double stops
  // the sequencer played as one note), not a head the page doesn't print: counted apart.
  total.chordExtra = 0
  for (const p of read) {
    const bySys = new Map()
    for (const st of p.staves) { const k = st.system ?? st.i; if (!bySys.has(k)) bySys.set(k, []); bySys.get(k).push(...st.heads) }
    for (const heads of bySys.values()) for (const h of heads) if (h.cat === 'extra' && heads.some(o => o.cat === 'match' && Math.abs(o.x - h.x) < 0.9 * p.space)) { h.cat = 'chord'; total.extra--; total.chordExtra++ }
  }
  // per staff and per page summaries; which bars a staff covers
  const perPage = read.map(p => {
    const s = { page: p.page, ms: Math.round(p.ms), error: p.error, staves: p.staves.length, heads: 0, match: 0, wrong: 0, extra: 0, chord: 0, missed: 0 }
    for (const st of p.staves) {
      const bars = [...st.votes.keys()].map(k => k.split(':')), mvts = [...new Set(bars.map(b => b[0]))]
      st.covers = mvts.map(m => { const bs = bars.filter(b => b[0] === m).map(b => +b[1]); return `${m} ${Math.min(...bs)}-${Math.max(...bs)}` }).join(', ')
      delete st.votes
      st.count = { heads: st.heads.length, match: st.heads.filter(h => h.cat === 'match').length, wrong: st.heads.filter(h => h.cat === 'wrong').length, extra: st.heads.filter(h => h.cat === 'extra').length, chord: st.heads.filter(h => h.cat === 'chord').length, missed: st.missed.length }
      for (const k of ['heads', 'match', 'wrong', 'extra', 'chord', 'missed']) s[k] += st.count[k]
    }
    s.pitchCorrect = s.heads ? +(100 * s.match / (s.match + s.wrong + s.missed || 1)).toFixed(1) : 0
    return s
  })
  const pct = (x, d = total.truth - total.folded) => +((100 * x) / d).toFixed(2)
  const summary = { ...total, headsFound: pct(total.match + total.wrong), pitchCorrect: pct(total.match), pitchGivenHead: pct(total.match, total.match + total.wrong || 1), extraRate: pct(total.extra, total.detected || 1), ms: Math.round(read.reduce((s, p) => s + p.ms, 0)) }
  return { summary, pages: perPage, read }
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === new URL(import.meta.url).pathname
if (isMain) {
  const args = process.argv.slice(2), opt = {}
  for (let i = 0; i < args.length; i++) if (args[i].startsWith('--')) opt[args[i].slice(2)] = args[i + 1]?.startsWith('--') || args[i + 1] == null ? true : args[++i]
  // --reuse results.json re-aligns the heads read before, without reading the pages again
  const cached = opt.reuse ? JSON.parse(fs.readFileSync(opt.reuse)).read : null
  const r = evaluate({ pages: opt.pages ? sel(opt.pages) : undefined, log: opt.quiet ? () => {} : console.error, cached })
  console.log(JSON.stringify(r.summary))
  console.log('page   staves heads match wrong extra missed pitch%  ms')
  for (const p of r.pages) console.log(String(p.page).padStart(4), String(p.staves).padStart(7), String(p.heads).padStart(6), String(p.match).padStart(6), String(p.wrong).padStart(6), String(p.extra).padStart(6), String(p.missed).padStart(7), String(p.pitchCorrect).padStart(7), String(p.ms).padStart(5), p.error || '')
  if (opt.json) fs.writeFileSync(opt.json, JSON.stringify(r, (k, v) => typeof v === 'number' && !Number.isInteger(v) ? +v.toFixed(1) : v))
}
