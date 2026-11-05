// Approach 2 (#050): the score engraved in the page by nwc-viewer, the engine
// #025 uses (notation3d/nwc-bridge.js loads it from ../nwc-viewer/).
//
//   const build = engravedBuilder()       // for sheetPlugin({ build })
//
// The notes come from the score where sheet/scores/ has one for the song
// (the Goldberg Aria: Mutopia's LilyPond, as printed, by sheet/tools/score_midi.mjs),
// else from the song's own MIDI file, quantized by notation3d/midi-score.js as
// #025 does. nwc-viewer lays it out in wrap mode (systems broken to a width)
// and draws it onto a canvas, black on transparent; each staff, barline and
// note head it placed gives the systems, the bars and, for each onset, its
// heads, so the cursor moves from note to note and the heads light as they
// sound. Bars follow the score: bar n of the score is bar n of the file.

import { loadNotationEngine, engrave } from '../notation3d/nwc-bridge.js'
import { midiToScore } from '../notation3d/midi-score.js'
import { timelineOfMidi, timelineOfMovements } from './timeline.js'
import { manifestFor, performanceFor } from './scores.js'

let engine = null
const engineReady = () => engine ??= loadNotationEngine()

/**
 * Engrave a tonejs Midi and cut it into a layout (layout.js).
 * @returns {{ layout, barTicks, bars }}
 */
export async function engraveLayout(midi, { pageWidth = 1300, scale = 2, meter, keepPage = true } = {}) {
  const eng = await engineReady()
  // voices of one staff ("<staff> · voice <n>") share the clef their notes suggest together
  const tracks = midi.tracks.filter(t => t.notes.length && t.channel !== 9), group = tracks.map(t => (t.name || '').split(' · voice ')[0])
  const clefs = tracks.map((t, i) => {
    const all = tracks.filter((_, j) => group[j] === group[i]).flatMap(u => u.notes.map(n => n.midi)).sort((a, b) => a - b)
    return all[all.length >> 1] < 57 ? 'bass' : 'treble'
  })
  const { data } = midiToScore(midi, '', { clefs })
  if (data.info) data.info.title = ''
  // (no tempo mark over the first bar: the overlay is a slice of the page, and it would sit on the notes)
  for (const st of data.score.staves) st.tokens = st.tokens.filter(t => t.type !== 'Tempo')
  const perSystem = layerVoices(midi, data)
  const r = engrave(eng, data, { layout: 'wrap', pageWidth })
  const ppq = midi.header.ppq, ts = meter || midi.header.timeSignatures?.[0]?.timeSignature || [4, 4]
  const barTicks = Math.round(ppq * 4 * ts[0] / ts[1])
  const space = r.fontSize / 4
  // the systems: nwc-viewer's staves, perSystem at a time (a Stave's y is its bottom line)
  // (layered staves share one staff: one rect each)
  const rects = r.layout.staveRects.filter((s, i, a) => !a.slice(0, i).some(o => Math.abs(o.y - s.y) < 0.5 && Math.abs(o.x - s.x) < 0.5))
  const sys = []
  for (let i = 0; i + perSystem <= rects.length; i += perSystem) {
    const st = rects.slice(i, i + perSystem)
    sys.push({ x0: st[0].x, x1: st[0].x + st[0].width, top: st[0].y - st[0].size, bottom: st[st.length - 1].y, staffYs: st.map(s => s.y) })
  }
  const sysOf = y => { let best = 0, d = Infinity; sys.forEach((s, i) => { const e = y < s.top ? s.top - y : y > s.bottom ? y - s.bottom : 0; if (e < d) { d = e; best = i } }); return best }
  // the page: every element drawn as nwc-viewer draws it, onto a canvas `scale` px a unit
  // (drawPage draws it again, for a score of many movements that keeps only a few pages)
  const H = (sys.at(-1)?.bottom ?? 200) + space * 10, W = pageWidth + r.fontSize * 2
  const drawPage = () => {
    const page = Object.assign(document.createElement('canvas'), { width: Math.ceil(W * scale), height: Math.ceil(H * scale) })
    const g = page.getContext('2d')
    g.scale(scale, scale)
    g.font = `${r.fontSize}px BravuraText`; g.textBaseline = 'alphabetic'; g.fillStyle = g.strokeStyle = '#000'
    for (const el of r.elements) eng.drawing.Drawing._draw(g, el, 1e7, -1e6, 1e7, -1e6)
    return page
  }
  const page = keepPage ? drawPage() : null
  // barlines on each system's first staff, left to right
  const lines = sys.map(() => [])
  for (const el of r.elements) if (el.constructor?.name === 'Barline') {
    const si = sys.findIndex(s => Math.abs(el.y - s.staffYs[0]) < 1)
    if (si >= 0) lines[si].push(el.x + (el.offsetX || 0))
  }
  for (const l of lines) l.sort((a, b) => a - b)
  // onsets: every head of every staff at one tick, by bar
  const onsets = new Map()
  r.staves.forEach(st => {
    for (const tok of st.tokens) {
      if (!tok._onset) continue
      const els = tok.type === 'Chord' && tok.notes ? tok.notes.map(n => n.drawingNoteHead) : [tok.drawingNoteHead]
      const bar = Math.floor(tok._tick / barTicks) + 1, frac = (tok._tick % barTicks) / barTicks
      if (!onsets.has(bar)) onsets.set(bar, new Map())
      const m = onsets.get(bar)
      for (const el of els) {
        if (!el) continue
        const x = el.x + (el.offsetX || 0), y = el.y + (el.offsetY || 0)
        const k = frac.toFixed(5)
        if (!m.has(k)) m.set(k, { frac, x, heads: [] })
        const o = m.get(k)
        o.x = Math.min(o.x, x)
        o.heads.push({ x: x + space * 0.59, y, r: space * 0.6 })
      }
    }
  })
  const S = v => v * scale
  const bars = new Map(), systems = sys.map((s, i) => {
    const prev = sys[i - 1], next = sys[i + 1]
    const y0 = Math.max(prev ? (prev.bottom + s.top) / 2 : 0, s.top - space * 5), y1 = Math.min(next ? (s.bottom + next.top) / 2 : H, s.bottom + space * 5)
    return { x: S(s.x0 - space * 1.5), y: S(y0), w: S(s.x1 - s.x0 + space * 2.5), h: S(y1 - y0), staffTop: S(s.top), staffBottom: S(s.bottom), bars: [] }
  })
  for (const [bar, m] of [...onsets].sort((a, b) => a[0] - b[0])) {
    const list = [...m.values()].sort((a, b) => a.frac - b.frac)
    const si = sysOf(list[0].heads[0].y), s = sys[si], l = lines[si]
    const first = Math.min(...list.map(o => o.x)), last = Math.max(...list.map(o => o.x))
    const x0 = [...l].reverse().find(x => x < first) ?? s.x0, x1 = l.find(x => x > last) ?? s.x1
    bars.set(bar, {
      system: si, x0: S(x0), x1: S(x1), start: S(first - space * 0.4), end: S(x1 - space * 0.6),
      onsets: list.map(o => ({ frac: o.frac, x: S(o.x + space * 0.59), heads: o.heads.map(h => ({ x: S(h.x), y: S(h.y), r: S(h.r) })) })),
    })
    systems[si].bars.push(bar)
  }
  return { layout: { page, systems, bars, space: S(space) }, drawPage, barTicks, bars: Math.max(0, ...bars.keys()) }
}

/**
 * Tracks named "<staff> · voice <n>" (sheet/tools/score_midi.mjs) are voices of one
 * staff: lay them on it (nwc-viewer's layered staves), the highest voice's stems
 * up and the lowest's down, the later voices' rests hidden. Returns the staves a system shows.
 */
function layerVoices(midi, data) {
  const staves = data.score.staves
  const tracks = midi.tracks.filter(t => t.notes.length && t.channel !== 9)
  if (tracks.length !== staves.length) return staves.length
  const group = tracks.map(t => (t.name || '').split(' · voice ')[0])
  let shown = 0
  for (let i = 0; i < staves.length; i++) {
    const first = i === 0 || group[i] !== group[i - 1]
    if (first) shown++
    staves[i].layerWithNext = i + 1 < staves.length && group[i + 1] === group[i]
    // a later voice's rests would sit on the first voice's notes: hidden, as an engraver leaves them out
    if (!first) for (const t of staves[i].tokens) if (t.type === 'Rest') t.Visibility = 'Never'
  }
  if (shown === staves.length) return shown
  data.score.allowLayering = true
  // stems: by the voices' mean pitch on each staff
  for (let i = 0; i < staves.length;) {
    let j = i; while (j + 1 < staves.length && group[j + 1] === group[i]) j++
    if (j > i) {
      const mean = k => tracks[k].notes.reduce((s, n) => s + n.midi, 0) / tracks[k].notes.length
      const order = []; for (let k = i; k <= j; k++) order.push(k)
      order.sort((a, b) => mean(b) - mean(a))
      order.forEach((k, r) => { const stem = r === order.length - 1 ? 2 : 1; for (const t of staves[k].tokens) if (t.type === 'Note' || t.type === 'Chord' || t.type === 'Rest') t.stem = stem })
    }
    i = j + 1
  }
  return shown
}

export function engravedBuilder({ pageWidth = 1300 } = {}) {
  const cache = new Map()
  return async (song, midi, file) => {
    const m = await manifestFor(file)
    if (m?.movements) {
      if (!cache.has(m)) cache.set(m, movementsBuild(m, pageWidth))
      return cache.get(m)(midi, file)
    }
    const key = m?.engraved ? m.base + m.engraved.score : file || song.title
    if (!cache.has(key)) cache.set(key, (async () => {
      const score = m?.engraved ? new Midi(await (await fetch(m.base + m.engraved.score)).arrayBuffer()) : midi
      return engraveLayout(score, { pageWidth, meter: m?.meter })
    })())
    const e = await cache.get(key)
    const timeline = timelineOfMidi(midi, m ? { meter: m.meter, form: m.form, played: m.played || m.bars } : { meter: midi.header.timeSignatures?.[0]?.timeSignature || [4, 4] })
    return { layout: e.layout, timeline, inkFrom: 'alpha', note: `${e.layout.systems.length} systems, ${e.layout.bars.size} bars${m?.engraved ? ' (the score)' : ' (from the MIDI file)'}` }
  }
}

// a work of many movements (the complete Goldberg, sheet/tools/goldberg.mjs): each movement's
// score MIDI (`engrave`: [{ score, firstBar, bars }], Var. 16 in two, for its two meters)
// engraved as it is needed, the one played at the time asked for (`ready(t)`) first, then the
// others one at a time; the layout grows as they come. A bar's key is its place in the whole
// score, as createMovementTimeline numbers it. Each movement's page is drawn again when one
// of its systems first shows, and a few kept.
function movementsBuild(m, pageWidth) {
  const parts = []
  let key = 0
  for (const mv of m.movements) {
    for (const e of mv.engrave) parts.push({ id: mv.id, score: m.base + e.score, base: key + e.firstBar - 1, job: null, drawPage: null })
    key += mv.bars
  }
  const pages = new Map(), KEEP = 3
  const layout = { systems: [], bars: new Map(), space: 0, pageOf: si => {
    const pi = layout.systems[si]?.pageIndex, part = parts[pi]
    if (!part?.drawPage) return null
    if (!pages.has(pi)) { pages.set(pi, part.drawPage()); while (pages.size > KEEP) pages.delete(pages.keys().next().value) }
    const pg = pages.get(pi); pages.delete(pi); pages.set(pi, pg)
    return pg
  } }
  function engravePart(pi) {
    const part = parts[pi]
    return part.job ??= (async () => {
      const score = new Midi(await (await fetch(part.score)).arrayBuffer())
      const e = await engraveLayout(score, { pageWidth, keepPage: false })
      const off = layout.systems.length
      for (const s of e.layout.systems) layout.systems.push({ ...s, pageIndex: pi, space: e.layout.space, bars: s.bars.map(b => part.base + b) })
      for (const [b, entry] of e.layout.bars) layout.bars.set(part.base + b, { ...entry, system: off + entry.system })
      layout.space ||= e.layout.space
      // (the panel's size, from the first movement engraved: the width they all have, and a little
      // more than its tallest system, which a later movement's taller one is drawn in, cut)
      layout.size ??= { w: Math.max(...e.layout.systems.map(s => s.w)), h: Math.max(...e.layout.systems.map(s => s.h)) * 1.1 }
      part.drawPage = e.drawPage
    })()
  }
  let timeline = null, rest = null
  // the parts of the movement played at t (the next one, in a silence between two)
  const partsAt = t => {
    const sp = timeline.movements, k = Math.max(0, sp.findIndex(s => s.t1 > t))
    const id = sp[k]?.id ?? parts[0].id
    return parts.map((p, i) => p.id === id ? i : -1).filter(i => i >= 0)
  }
  const ready = async t => {
    const first = partsAt(t)
    await Promise.all(first.map(engravePart))
    // then the rest, from there on and then from the start
    rest ??= (async () => { for (const i of [...parts.keys()].sort((a, b) => (a < first[0]) - (b < first[0]) || a - b)) await engravePart(i) })()
  }
  return (midi, file) => {
    timeline = timelineOfMovements(midi, m, { performance: performanceFor(m, file) })
    return { layout, timeline, ready, inkFrom: 'alpha', note: `${m.movements.length} movements, ${parts.length} scores, engraved as they are needed (${m.movements.reduce((s, v) => s + v.bars, 0)} bars, ${timeline.bars.length} played)` }
  }
}
