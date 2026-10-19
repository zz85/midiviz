// Score input for the strings experiments (#033 / #034 / #037): MusicXML and
// compressed MusicXML (.mxl), as exported by MuseScore, Finale, Sibelius,
// Dorico and most notation tools (Mutopia's LilyPond sources convert with
// python-ly: `ly musicxml piece.ly`). Unlike MIDI, a score keeps the
// articulation: slurs, staccato / spiccato / tenuto / accent marks, up- and
// down-bow signs, and ties.
//
// readMusicXML(xmlText, opts) → { notes, meter, tempo, title, parts }
//   notes: { pitch, on, off (s), velocity, voice, measure, beat (in the bar,
//            0-based, in beats of the time signature), art } sorted by onset,
//   art:   { slur: id | null, stroke: 'staccato' | 'staccatissimo' |
//            'spiccato' | 'tenuto' | 'portato' (detached-legato) | 'accent' |
//            'marcato' | null, port: true after a slide / glissando mark,
//            bow: 'up' | 'down' | null, source: 'score' }
//   Staccato notes sound for half their value (staccatissimo a quarter),
//   ties are merged into one note, grace notes are skipped.
// readMXL(arrayBuffer, inflateRaw) → the same, from a .mxl zip (inflateRaw:
//   Uint8Array → Uint8Array; in the browser use inflateRawBrowser below).
//
// Plain JS with a small regex XML walker (no DOMParser, so it runs in Node,
// workers and the browser alike).

const STEP = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }
const DYN = { pppp: 0.15, ppp: 0.2, pp: 0.3, p: 0.42, mp: 0.55, mf: 0.68, f: 0.8, ff: 0.92, fff: 1, sf: 0.9, sfz: 0.92, fz: 0.9 }

/** Minimal XML walker: a tree of { tag, attrs, children, text }. */
function parseXML(src) {
  const root = { tag: '#root', attrs: {}, children: [], text: '' }, stack = [root]
  const re = /<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<!DOCTYPE[^>]*>|<!\[CDATA\[([\s\S]*?)\]\]>|<(\/?)([\w:.-]+)((?:\s+[\w:.-]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>|([^<]+)/g
  let m
  while ((m = re.exec(src))) {
    const top = stack[stack.length - 1]
    if (m[6] != null) { top.text += m[6]; continue }
    if (m[1] != null) { top.text += m[1]; continue }
    if (!m[3]) continue
    if (m[2]) { stack.pop(); continue }
    const attrs = {}
    m[4].replace(/([\w:.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g, (_, k, a, b) => { attrs[k] = a ?? b })
    const el = { tag: m[3], attrs, children: [], text: '' }
    top.children.push(el)
    if (!m[5]) stack.push(el)
  }
  return root
}
const kids = (el, tag) => el ? el.children.filter(c => c.tag === tag) : []
const kid = (el, tag) => el?.children.find(c => c.tag === tag)
const txt = (el, tag) => kid(el, tag)?.text.trim()
const find = (el, tag) => { if (!el) return null; if (el.tag === tag) return el; for (const c of el.children) { const r = find(c, tag); if (r) return r } return null }

/**
 * opts: { part: index or id (default: the first part with notes), tempo: bpm to
 *         use when the score has none (default 100) }
 */
export function readMusicXML(xml, { part = null, tempo: tempoDefault = 100 } = {}) {
  const doc = parseXML(xml)
  const score = find(doc, 'score-partwise')
  if (!score) throw new Error(find(doc, 'score-timewise') ? 'timewise MusicXML is not supported' : 'not a MusicXML score')
  const title = (txt(find(score, 'work'), 'work-title') || txt(score, 'movement-title') || '').trim()
  const parts = kids(score, 'part')
  const names = kids(find(score, 'part-list'), 'score-part').map(sp => ({ id: sp.attrs.id, name: txt(sp, 'part-name') || sp.attrs.id }))
  let P = typeof part === 'number' ? parts[part] : part ? parts.find(p => p.attrs.id === part) : null
  if (!P) P = parts.find(p => find(p, 'pitch')) || parts[0]
  if (!P) throw new Error('no parts')

  // time: divisions per quarter; tempo changes in quarter notes per minute
  let div = 1, beats = 4, beatType = 4, bpm = null
  const tempoMap = []                      // [quarterPos, bpm]
  const meterMap = []                      // [quarterPos, beats, beatType, measure]
  const events = []                        // raw notes in quarters
  let pos = 0, measureNo = 0
  let velocity = 0.7
  const openTies = new Map()               // pitch → raw note
  const slurOpen = new Map()               // slur number → id
  let slurSeq = 0
  for (const meas of kids(P, 'measure')) {
    measureNo++
    const mStart = pos
    let maxPos = pos, lastOn = pos
    for (const el of meas.children) {
      if (el.tag === 'attributes') {
        const d = txt(el, 'divisions'); if (d) div = +d
        const time = kid(el, 'time')
        if (time) { beats = +(txt(time, 'beats') || '4').split('+').reduce((a, b) => a + +b, 0); beatType = +(txt(time, 'beat-type') || 4) }
        if (time || !meterMap.length) meterMap.push([mStart, beats, beatType, measureNo])
      } else if (el.tag === 'direction' || el.tag === 'sound') {
        const snd = el.tag === 'sound' ? el : find(el, 'sound')
        if (snd?.attrs.tempo) { bpm = +snd.attrs.tempo; tempoMap.push([pos, bpm]) }
        else {
          const pm = find(el, 'per-minute'), bu = find(el, 'beat-unit')
          if (pm && !tempoMap.some(t => t[0] === pos)) { const q = { whole: 4, half: 2, quarter: 1, eighth: 0.5, '16th': 0.25 }[bu?.text.trim()] ?? 1; bpm = +pm.text * q; if (bpm > 0) tempoMap.push([pos, bpm]) }
        }
        const dyn = find(el, 'dynamics')
        if (dyn) for (const c of dyn.children) if (DYN[c.tag] != null) velocity = DYN[c.tag]
        if (snd?.attrs.dynamics) velocity = Math.min(1, +snd.attrs.dynamics / 127)
      } else if (el.tag === 'backup') { pos -= +txt(el, 'duration') / div }
      else if (el.tag === 'forward') { pos += +txt(el, 'duration') / div; maxPos = Math.max(maxPos, pos) }
      else if (el.tag === 'note') {
        if (kid(el, 'grace') || kid(el, 'cue')) continue
        const dur = +(txt(el, 'duration') || 0) / div
        const chord = !!kid(el, 'chord')
        const on = chord ? lastOn : pos
        if (!chord) { lastOn = pos; pos += dur; maxPos = Math.max(maxPos, pos) }
        const p = kid(el, 'pitch')
        const nots = kids(el, 'notations')
        const allN = nots.flatMap(n => n.children)
        // slurs: a note inside an open slur (or that opens / closes one) gets its id
        let slur = null
        for (const s of allN.filter(c => c.tag === 'slur')) {
          const num = s.attrs.number || '1'
          if (s.attrs.type === 'start') { const id = ++slurSeq; slurOpen.set(num, id); slur = id }
          else if (s.attrs.type === 'stop') { slur = slur ?? slurOpen.get(num) ?? null; slurOpen.delete(num) }
        }
        if (slur == null && slurOpen.size) slur = [...slurOpen.values()][slurOpen.size - 1]
        if (!p) continue                    // a rest
        const pitch = STEP[txt(p, 'step')] + +(txt(p, 'alter') || 0) + 12 * (+txt(p, 'octave') + 1)
        const arts = allN.filter(c => c.tag === 'articulations').flatMap(a => a.children.map(c => c.tag))
        const techs = allN.filter(c => c.tag === 'technical').flatMap(a => a.children.map(c => c.tag))
        const stroke = ['staccatissimo', 'spiccato', 'staccato', 'marcato', 'accent', 'strong-accent', 'tenuto', 'detached-legato'].find(a => arts.includes(a)) || null
        const bow = techs.includes('up-bow') ? 'up' : techs.includes('down-bow') ? 'down' : null
        // a slide or glissando ending on this note: an audible portamento into it
        const port = allN.some(c => (c.tag === 'slide' || c.tag === 'glissando') && c.attrs.type === 'stop')
        const ties = kids(el, 'tie').map(t => t.attrs.type)
        const prev = openTies.get(pitch)
        if (ties.includes('stop') && prev) {
          prev.end = on + dur
          if (!ties.includes('start')) openTies.delete(pitch)
          continue
        }
        const n = { pitch, start: on, end: on + dur, velocity: velocity * (stroke === 'accent' || stroke === 'marcato' || stroke === 'strong-accent' ? 1.15 : 1), voice: +(txt(el, 'voice') || 1), measure: measureNo, mStart,
          art: { slur, stroke: stroke === 'strong-accent' ? 'marcato' : stroke === 'detached-legato' ? 'portato' : stroke, bow, source: 'score', ...(port ? { port: true } : {}) } }
        events.push(n)
        if (ties.includes('start')) openTies.set(pitch, n)
      }
    }
    pos = Math.max(maxPos, pos)
  }
  if (!tempoMap.length || tempoMap[0][0] > 0) tempoMap.unshift([0, tempoMap[0]?.[1] ?? tempoDefault])
  // quarters → seconds
  const tsec = q => {
    let t = 0
    for (let i = 0; i < tempoMap.length; i++) {
      const [q0, b] = tempoMap[i], q1 = tempoMap[i + 1]?.[0] ?? Infinity
      if (q <= q0) break
      t += (Math.min(q, q1) - q0) * 60 / b
    }
    return t
  }
  const meterAt = q => { let m = meterMap[0] || [0, 4, 4, 1]; for (const x of meterMap) if (x[0] <= q) m = x; return m }
  const notes = events.map(e => {
    const [, mb, mt] = meterAt(e.start)
    const beatQ = 4 / mt                     // quarters per beat
    const len = e.end - e.start
    // dots under a slur are portato: the bow keeps going, the note nearly full
    const k = e.art.slur != null && ['staccatissimo', 'staccato', 'spiccato'].includes(e.art.stroke) ? 0.85
      : e.art.stroke === 'staccatissimo' ? 0.25 : e.art.stroke === 'staccato' || e.art.stroke === 'spiccato' ? 0.5 : 1
    return {
      pitch: e.pitch, on: tsec(e.start), off: tsec(e.start + Math.max(1 / 64, len * k)), velocity: Math.min(1, e.velocity), voice: e.voice,
      measure: e.measure, beat: (e.start - e.mStart) / beatQ, beatsPerBar: mb, art: e.art,
    }
  }).sort((a, b) => a.on - b.on || a.pitch - b.pitch)
  return { notes, meter: meterMap.map(([q, b, t, m]) => ({ t: tsec(q), beats: b, beatType: t, measure: m })), tempo: tempoMap.map(([q, b]) => ({ t: tsec(q), bpm: b })), title, parts: names }
}

/** A .mxl (zipped MusicXML): read the container's root file, or the first .xml / .musicxml. */
export function readMXL(buf, inflateRaw, opts) {
  const u8 = new Uint8Array(buf), dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength)
  // central directory via the end-of-central-directory record
  let e = u8.length - 22; while (e >= 0 && dv.getUint32(e, true) !== 0x06054b50) e--
  if (e < 0) throw new Error('not a zip (.mxl) file')
  const n = dv.getUint16(e + 10, true); let o = dv.getUint32(e + 16, true)
  const files = new Map(), dec = new TextDecoder()
  for (let i = 0; i < n; i++) {
    const method = dv.getUint16(o + 10, true), csize = dv.getUint32(o + 20, true)
    const nl = dv.getUint16(o + 28, true), xl = dv.getUint16(o + 30, true), cl = dv.getUint16(o + 32, true), lh = dv.getUint32(o + 42, true)
    const name = dec.decode(u8.subarray(o + 46, o + 46 + nl))
    files.set(name, { method, csize, lh })
    o += 46 + nl + xl + cl
  }
  const get = name => {
    const f = files.get(name); if (!f) return null
    const start = f.lh + 30 + dv.getUint16(f.lh + 26, true) + dv.getUint16(f.lh + 28, true)
    const raw = u8.subarray(start, start + f.csize)
    return dec.decode(f.method === 0 ? raw : inflateRaw(raw))
  }
  const container = get('META-INF/container.xml')
  const root = container?.match(/full-path\s*=\s*"([^"]+)"/)?.[1] || [...files.keys()].find(k => /\.(xml|musicxml)$/i.test(k) && !k.startsWith('META-INF'))
  const xml = root && get(root)
  if (!xml) throw new Error('no score inside the .mxl')
  return readMusicXML(xml, opts)
}

/** Browser inflateRaw for readMXL (sync wrapper is not possible: returns a Promise). */
export async function readMXLBrowser(buf, opts) {
  // inflate every entry asynchronously first, then hand readMXL a lookup
  const u8 = new Uint8Array(buf), dv = new DataView(u8.buffer)
  const cache = new Map()
  let e = u8.length - 22; while (e >= 0 && dv.getUint32(e, true) !== 0x06054b50) e--
  const n = dv.getUint16(e + 10, true); let o = dv.getUint32(e + 16, true)
  for (let i = 0; i < n; i++) {
    const method = dv.getUint16(o + 10, true), csize = dv.getUint32(o + 20, true)
    const nl = dv.getUint16(o + 28, true), xl = dv.getUint16(o + 30, true), cl = dv.getUint16(o + 32, true), lh = dv.getUint32(o + 42, true)
    if (method === 8) {
      const start = lh + 30 + dv.getUint16(lh + 26, true) + dv.getUint16(lh + 28, true), raw = u8.slice(start, start + csize)
      const out = await new Response(new Blob([raw]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer()
      cache.set(raw.length + ':' + raw[0] + ':' + raw[raw.length - 1], new Uint8Array(out))
    }
    o += 46 + nl + xl + cl
  }
  return readMXL(buf, raw => cache.get(raw.length + ':' + raw[0] + ':' + raw[raw.length - 1]), opts)
}
