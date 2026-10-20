// Score input for the strings experiments (#033 / #034 / #037): MusicXML and
// compressed MusicXML (.mxl), as exported by MuseScore, Finale, Sibelius,
// Dorico and most notation tools, and MuseScore's own .mscz / .mscx (Mutopia's LilyPond sources convert with
// python-ly: `ly musicxml piece.ly`). Unlike MIDI, a score keeps the
// articulation: slurs, staccato / spiccato / tenuto / accent marks, up- and
// down-bow signs, and ties.
//
// readMusicXML(xmlText, opts) → { notes, meter, tempo, title, parts, part }
//   (parts: [{ id, name }] of the score; part: the index of the one read)
//   notes: { pitch, on, off (s), velocity, voice, measure, beat (in the bar,
//            0-based, in beats of the time signature), art } sorted by onset,
//   art:   { slur: id | null, stroke: 'staccato' | 'staccatissimo' |
//            'spiccato' | 'tenuto' | 'portato' (detached-legato) | 'accent' |
//            'marcato' | null, port: true after a slide / glissando mark,
//            bow: 'up' | 'down' | null, source: 'score' }
//   Staccato notes sound for half their value (staccatissimo a quarter),
//   ties are merged into one note, grace notes are skipped.
// readMXL(arrayBuffer, inflateRaw) → the same, from a .mxl zip (inflateRaw:
//   Uint8Array → Uint8Array, zlib.inflateRawSync in Node; readMXLBrowser in
//   the browser).
// readMSCX(text) / readMSCZ(arrayBuffer, inflateRaw) / readMSCZBrowser: the
//   same from MuseScore 3 and 4 files, read directly (no MusicXML export).
// readScoreFile(name, arrayBuffer, opts): any of them by the file's extension.
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

/** The stroke a note's marks (MusicXML articulation tag names) ask for, most specific first. */
function strokeOf(arts) {
  const k = ['staccatissimo', 'spiccato', 'staccato', 'marcato', 'accent', 'strong-accent', 'tenuto', 'detached-legato'].find(a => arts.includes(a)) || null
  return k === 'strong-accent' ? 'marcato' : k === 'detached-legato' ? 'portato' : k
}
const accentGain = arts => arts.some(a => a === 'accent' || a === 'marcato' || a === 'strong-accent') ? 1.15 : 1

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
  const r = readPartXML(P)
  // tempo marks are global, and exporters (MuseScore among them) write them in
  // the top part only: a part without any takes the first part's that has some
  if (!r.tempoMap.length) for (const Q of parts) { if (Q === P) continue; const t = readPartXML(Q, true).tempoMap; if (t.length) { r.tempoMap = t; break } }
  return { ...finish(r.events, r.tempoMap, r.meterMap, tempoDefault, title, names), part: parts.indexOf(P) }
}

/** One MusicXML <part>: raw notes, tempo and meter maps in quarters (tempoOnly: just the tempo map). */
function readPartXML(P, tempoOnly = false) {
  // time: divisions per quarter; tempo changes in quarter notes per minute
  let div = 1, beats = 4, beatType = 4, bpm = null
  const tempoMap = []                      // [quarterPos, bpm]
  const meterMap = []                      // [quarterPos, beats, beatType, measure]
  const events = []                        // raw notes in quarters
  let pos = 0, measureNo = 0
  let velocity = 0.7
  const openTies = new Map()               // pitch → raw note
  const octShift = new Map()               // staff → semitones (an 8va line in force)
  let chordMarks = null, chordNotes = []   // the current chord's marks and notes
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
        // 8va / 8vb lines: MusicXML writes the displayed pitch; type "down" (8va) sounds higher
        for (const os of el.tag === 'direction' ? kids(el, 'direction-type').flatMap(d => kids(d, 'octave-shift')) : []) {
          const st = txt(el, 'staff') || '1', k = { 8: 12, 15: 24, 22: 36 }[os.attrs.size || '8'] ?? 12
          octShift.set(st, os.attrs.type === 'down' ? k : os.attrs.type === 'up' ? -k : 0)
        }
        const dyn = find(el, 'dynamics')
        if (dyn) for (const c of dyn.children) if (DYN[c.tag] != null) velocity = DYN[c.tag]
        // <sound dynamics>: percent of the default forte, MIDI velocity 90 (MusicXML 4.0)
        if (snd?.attrs.dynamics) velocity = Math.min(1, +snd.attrs.dynamics * 0.9 / 127)
      } else if (el.tag === 'backup') { pos -= +txt(el, 'duration') / div }
      else if (el.tag === 'forward') { pos += +txt(el, 'duration') / div; maxPos = Math.max(maxPos, pos) }
      else if (el.tag === 'note') {
        if (kid(el, 'grace') || kid(el, 'cue')) continue
        if (tempoOnly) { if (!kid(el, 'chord')) { const d = +(txt(el, 'duration') || 0) / div; pos += d; maxPos = Math.max(maxPos, pos) } continue }
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
        const pitch = STEP[txt(p, 'step')] + +(txt(p, 'alter') || 0) + 12 * (+txt(p, 'octave') + 1) + (octShift.get(txt(el, 'staff') || '1') ?? 0)
        let arts = allN.filter(c => c.tag === 'articulations').flatMap(a => a.children.map(c => c.tag))
        let techs = allN.filter(c => c.tag === 'technical').flatMap(a => a.children.map(c => c.tag))
        // a chord's marks are written once, on one of its notes: they belong to all of them
        if (chord && chordMarks) { arts = [...new Set([...arts, ...chordMarks.arts])]; techs = [...new Set([...techs, ...chordMarks.techs])] }
        else chordMarks = { arts, techs }
        if (chord) for (const m of chordNotes) { m.art.stroke ??= strokeOf(arts); if (m.art.bow == null && techs.some(t => /-bow$/.test(t))) m.art.bow = techs.includes('up-bow') ? 'up' : 'down'; if (accentGain(arts) > 1 && m.accent !== true) { m.velocity *= accentGain(arts); m.accent = true } }
        const stroke = strokeOf(arts)
        const bow = techs.includes('up-bow') ? 'up' : techs.includes('down-bow') ? 'down' : null
        // a slide or glissando ending on this note: an audible portamento into it
        const port = allN.some(c => (c.tag === 'slide' || c.tag === 'glissando') && c.attrs.type === 'stop')
        if (!chord) chordNotes = []
        const ties = kids(el, 'tie').map(t => t.attrs.type)
        const prev = openTies.get(pitch)
        if (ties.includes('stop') && prev) {
          prev.end = on + dur
          if (!ties.includes('start')) openTies.delete(pitch)
          continue
        }
        const n = { pitch, start: on, end: on + dur, velocity: velocity * accentGain(arts), voice: +(txt(el, 'voice') || 1), measure: measureNo, mStart,
          art: { slur, stroke, bow, source: 'score', ...(port ? { port: true } : {}) } }
        if (accentGain(arts) > 1) n.accent = true
        events.push(n)
        chordNotes.push(n)
        if (ties.includes('start')) openTies.set(pitch, n)
      }
    }
    pos = Math.max(maxPos, pos)
  }
  return { events, tempoMap, meterMap }
}

/**
 * Raw notes in quarters → the result: seconds from the tempo map, beats from the
 * meter map, staccato lengths. events: { pitch, start, end (quarters), velocity,
 * voice, measure, mStart, art }; tempoMap: [[quarter, bpm]]; meterMap:
 * [[quarter, beats, beatType, measure]].
 */
function finish(events, tempoMap, meterMap, tempoDefault, title, names) {
  tempoMap = tempoMap.slice().sort((a, b) => a[0] - b[0])
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

// ── MuseScore (.mscx, and .mscz: a zip holding one) ─────────────────────────
// MuseScore 3 and 4 files (museScore version 3.01–4.x), read directly: the
// same result as readMusicXML on MuseScore's own MusicXML export of the score.
// Positions in a .mscx are durations (durationType + dots, inside tuplets),
// <location> moves inside a voice, and spanners (slurs, ties, glissandi) that
// name where they end as { measures, fractions } relative to where they start.
// Repeats are not unrolled (nor are they by readMusicXML).

const DUR = { long: 16, breve: 8, whole: 4, half: 2, quarter: 1, eighth: 0.5, '16th': 0.25, '32nd': 0.125, '64th': 0.0625, '128th': 1 / 32, '256th': 1 / 64, '512th': 1 / 128, '1024th': 1 / 256 }
// MuseScore articulation symbols → MusicXML articulation tag names (what its exporter writes)
const ARTIC = {
  articStaccato: ['staccato'], articStaccatissimo: ['staccatissimo'], articStaccatissimoWedge: ['staccatissimo'],
  articStaccatissimoStroke: ['staccatissimo'], articAccent: ['accent'], articMarcato: ['strong-accent'],
  articTenuto: ['tenuto'], articTenutoStaccato: ['detached-legato'], articAccentStaccato: ['accent', 'staccato'],
  articMarcatoStaccato: ['strong-accent', 'staccato'], articTenutoAccent: ['tenuto', 'accent'],
  articMarcatoTenuto: ['strong-accent', 'tenuto'], articSoftAccent: ['soft-accent'], articStress: ['stress'],
}
const GRACE = new Set(['acciaccatura', 'appoggiatura', 'grace4', 'grace16', 'grace32', 'grace8after', 'grace16after', 'grace32after'])
const frac = t => { if (!t) return 0; const [a, b] = t.trim().split('/'); return 4 * (+a) / (+b || 1) }   // whole notes → quarters

/**
 * opts: { part: index (default: the first part with notes), tempo: bpm when
 *         the score has none (default 100) }. Returns what readMusicXML returns.
 */
export function readMSCX(xml, { part = null, tempo: tempoDefault = 100 } = {}) {
  const doc = parseXML(xml)
  const ms = find(doc, 'museScore')
  if (!ms) throw new Error('not a MuseScore file')
  const version = +(ms.attrs.version || 0)
  if (version && version < 3) throw new Error(`MuseScore ${ms.attrs.version} file: save it again in MuseScore 3 or 4, or export MusicXML`)
  const score = kid(ms, 'Score')
  if (!score) throw new Error('no score in the MuseScore file')
  const meta = Object.fromEntries(kids(score, 'metaTag').map(m => [m.attrs.name, m.text.trim()]))
  const staves = new Map(kids(score, 'Staff').map((st, i) => [st.attrs.id ?? String(i + 1), st]))
  // staff ids: given in MuseScore 3 and 4.0–4.5, implicit (1, 2, … in part order) in 4.6
  let sid = 0
  const partEls = kids(score, 'Part').map((p, i) => ({ i, el: p, ids: kids(p, 'Staff').map(s => { sid++; return s.attrs.id ?? String(sid) }) }))
  // the part's name (MuseScore 4 often names both violin parts "Violin": then the long name, "Violin I")
  const long = p => (txt(kid(p.el, 'Instrument'), 'longName') || '').replace(/<[^>]+>/g, '').trim()
  let names = partEls.map(p => ({ id: String(p.i), name: (txt(p.el, 'trackName') || long(p) || `Part ${p.i + 1}`).trim() }))
  for (const nm of names) if (names.filter(x => x.name === nm.name).length > 1) nm.dup = true
  names = names.map((nm, i) => ({ id: nm.id, name: nm.dup ? (long(partEls[i]) && names.filter(x => long(partEls[+x.id]) === long(partEls[i])).length === 1 ? long(partEls[i]) : `${nm.name} ${names.slice(0, i + 1).filter(x => x.name === nm.name).length}`) : nm.name }))
  const hasNotes = p => p.ids.some(id => find(staves.get(id), 'Note'))
  let P = typeof part === 'number' ? partEls[part] : part != null ? partEls[+part] : null
  if (!P) P = partEls.find(hasNotes) || partEls[0]
  if (!P) throw new Error('no parts')
  let title = meta.workTitle || ''
  if (!title) for (const t of kids(find(staves.get(P.ids[0]) ?? score, 'VBox') ?? {}, 'Text')) if (/^title$/i.test(txt(t, 'style') || '')) title = txt(t, 'text') || ''
  title = title.replace(/<[^>]+>/g, '').trim()

  const tempoMap = [], meterMap = [], events = [], dyns = []   // dyns: [quarter, velocity, staff]
  // tempo marks are global: MuseScore writes them on the top staff (some files copy
  // them to every staff); read the part's own when it has them, else the top staff's
  const hasTempo = id => !!find(staves.get(id), 'Tempo')
  const tempoFrom = P.ids.some(hasTempo) ? 'own' : 'top'
  const top = [...staves.keys()].find(hasTempo)
  const ids = tempoFrom === 'top' && top ? [top, ...P.ids] : P.ids
  const slurs = [], tieStart = new Map(), glissEnds = new Set()
  let slurSeq = 0
  ids.forEach((id, k) => {
    const staff = staves.get(id)
    if (!staff) return
    // the top staff read only for its tempo marks
    const tempoOnly = ids.length > P.ids.length && k === 0
    const staffIdx = tempoOnly ? -1 : k - (ids.length - P.ids.length)
    // measure starts first: spanner ends are named relative to a measure
    const measures = kids(staff, 'Measure')
    let q = 0, sigN = 4, sigD = 4
    const mInfo = measures.map((m, k) => {
      const ts = find(m, 'TimeSig')
      if (ts) { sigN = +txt(ts, 'sigN') || sigN; sigD = +txt(ts, 'sigD') || sigD }
      const len = m.attrs.len ? frac(m.attrs.len) : 4 * sigN / sigD
      const r = { start: q, len, sigN, sigD, ts: !!ts || k === 0 }
      q += len
      return r
    })
    mInfo.push({ start: q })
    // a spanner's end from where it starts: measures ahead, then the same offset in the bar plus fractions
    const endOf = (mk, rel, loc) => {
      const m = mInfo[Math.max(0, Math.min(mInfo.length - 1, mk + (+(txt(loc, 'measures') || 0))))]
      return m.start + rel + frac(txt(loc, 'fractions'))
    }
    measures.forEach((meas, mk) => {
      const M = mInfo[mk]
      if (staffIdx === 0 && M.ts) meterMap.push([M.start, M.sigN, M.sigD, mk + 1])
      kids(meas, 'voice').forEach((voice, vi) => {
        let pos = 0
        const tup = []                         // tuplet ratios (normal / actual), nested
        const track = staffIdx * 4 + vi
        const slurStarts = el => {
          for (const sp of kids(el, 'Spanner')) {
            if (sp.attrs.type !== 'Slur' || !kid(sp, 'Slur')) continue
            const nx = kid(kid(sp, 'next'), 'location')
            slurs.push({ id: ++slurSeq, track, s: M.start + pos, e: nx ? endOf(mk, pos, nx) : M.start + pos })
          }
        }
        for (const el of voice.children) {
          if (el.tag === 'location') { pos += frac(txt(el, 'fractions')); continue }
          if (el.tag === 'Tuplet') { tup.push((+txt(el, 'normalNotes') || 1) / (+txt(el, 'actualNotes') || 1)); continue }
          if (el.tag === 'endTuplet') { tup.pop(); continue }
          if (el.tag === 'Tempo') {
            if (!tempoOnly && tempoFrom !== 'own') continue
            // "a tempo" / "tempo primo" (MuseScore 4) carry a placeholder <tempo> (2 = 120):
            // a tempo ends a rit. / accel. line and goes back to the marked tempo in force,
            // tempo primo to the first one
            const type = txt(el, 'type'), t = +txt(el, 'tempo'), at = M.start + pos
            const before = tempoMap.filter(x => x[0] < at - 1e-9)
            const bpm = type === 'tempoPrimo' ? tempoMap[0]?.[1] : type === 'aTempo' ? before[before.length - 1]?.[1] : t > 0 ? 60 * t : null
            if (bpm > 0) tempoMap.push([at, bpm])
            continue
          }
          if (tempoOnly && el.tag !== 'Chord' && el.tag !== 'Rest') continue
          if (el.tag === 'Dynamic') {
            const v = +txt(el, 'velocity'), sub = txt(el, 'subtype')
            const vel = v > 0 ? v / 127 : DYN[sub]
            if (vel) dyns.push([M.start + pos, Math.min(1, vel), staffIdx])
            continue
          }
          if (el.tag === 'Spanner') { slurStarts({ children: [el] }); continue }
          if (el.tag !== 'Chord' && el.tag !== 'Rest') continue
          if (el.tag === 'Chord' && el.children.some(c => GRACE.has(c.tag))) continue
          const dt = txt(el, 'durationType')
          let dur = dt === 'measure' || !DUR[dt] ? frac(txt(el, 'duration')) || M.len : DUR[dt] * (2 - Math.pow(0.5, +(txt(el, 'dots') || 0)))
          for (const r of tup) dur *= r
          const on = M.start + pos
          if (tempoOnly) { pos += dur; continue }
          if (el.tag === 'Chord') slurStarts(el)
          pos += dur
          if (el.tag === 'Rest') continue
          const arts = kids(el, 'Articulation').flatMap(a => ARTIC[(txt(a, 'subtype') || '').replace(/(Above|Below)$/, '')] ?? [])
          const subs = kids(el, 'Articulation').map(a => txt(a, 'subtype') || '')
          const bow = subs.some(x => /^stringsUpBow/.test(x)) ? 'up' : subs.some(x => /^stringsDownBow/.test(x)) ? 'down' : null
          const stroke = strokeOf(arts)
          for (const nEl of kids(el, 'Note')) {
            const pitch = +txt(nEl, 'pitch')
            if (!Number.isFinite(pitch)) continue
            const sp = kids(nEl, 'Spanner')
            const tieIn = sp.some(x => x.attrs.type === 'Tie' && kid(x, 'prev'))
            const tieOut = sp.some(x => x.attrs.type === 'Tie' && kid(x, 'next'))
            const glissIn = sp.some(x => x.attrs.type === 'Glissando' && kid(x, 'prev'))
            const key = track + ':' + pitch
            const prev = tieStart.get(key)
            if (tieIn && prev) { prev.end = on + dur; if (!tieOut) tieStart.delete(key); continue }
            const n = { pitch, start: on, end: on + dur, staff: staffIdx, track, accent: accentGain(arts), voice: vi + 1, measure: mk + 1, mStart: M.start,
              art: { slur: null, stroke, bow, source: 'score', ...(glissIn ? { port: true } : {}) } }
            events.push(n)
            if (tieOut) tieStart.set(key, n); else tieStart.delete(key)
          }
        }
      })
    })
  })
  // slurs: a note gets the latest slur on its track that covers its start (as readMusicXML)
  slurs.sort((a, b) => a.s - b.s)
  const eps = 1e-6
  for (const n of events) {
    for (const sl of slurs) { if (sl.s > n.start + eps) break; if (sl.track === n.track && n.start <= sl.e + eps) n.art.slur = sl.id }
  }
  // dynamics: the latest marking on the note's staff (or any staff, before the first of its own)
  dyns.sort((a, b) => a[0] - b[0])
  for (const n of events) {
    let v = 0.7, own = false
    for (const [t, vel, st] of dyns) { if (t > n.start + eps) break; if (st === n.staff) { v = vel; own = true } else if (!own) v = vel }
    n.velocity = v * n.accent
    delete n.accent; delete n.track; delete n.staff
  }
  events.sort((a, b) => a.start - b.start || a.pitch - b.pitch)
  return { ...finish(events, tempoMap, meterMap, tempoDefault, title, names), part: P.i }
}

// ── Zip containers: .mxl and .mscz ──────────────────────────────────────────
function zipEntries(buf) {
  const u8 = new Uint8Array(buf), dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength)
  let e = u8.length - 22; while (e >= 0 && dv.getUint32(e, true) !== 0x06054b50) e--
  if (e < 0) throw new Error('not a zip file')
  const n = dv.getUint16(e + 10, true); let o = dv.getUint32(e + 16, true)
  const out = [], dec = new TextDecoder()
  for (let i = 0; i < n; i++) {
    const method = dv.getUint16(o + 10, true), csize = dv.getUint32(o + 20, true)
    const nl = dv.getUint16(o + 28, true), xl = dv.getUint16(o + 30, true), cl = dv.getUint16(o + 32, true), lh = dv.getUint32(o + 42, true)
    const name = dec.decode(u8.subarray(o + 46, o + 46 + nl))
    const start = lh + 30 + dv.getUint16(lh + 26, true) + dv.getUint16(lh + 28, true)
    out.push({ name, method, raw: u8.subarray(start, start + csize) })
    o += 46 + nl + xl + cl
  }
  return out
}
// the score inside: the container's root file, else the first file of that kind
// (outside META-INF and, for .mscz, outside Excerpts/, which hold the part scores)
function zipRoot(names, read, re) {
  const container = names.includes('META-INF/container.xml') ? read('META-INF/container.xml') : null
  const roots = [...(container ?? '').matchAll(/full-path\s*=\s*"([^"]+)"/g)].map(m => m[1])
  return roots.find(r => re.test(r) && !r.startsWith('Excerpts/')) || names.find(k => re.test(k) && !k.startsWith('META-INF') && !k.startsWith('Excerpts/'))
}
function readZip(buf, inflateRaw, re, what) {
  const ents = zipEntries(buf), dec = new TextDecoder()
  const read = name => { const f = ents.find(x => x.name === name); return f ? dec.decode(f.method === 0 ? f.raw : inflateRaw(f.raw)) : null }
  const root = zipRoot(ents.map(x => x.name), read, re)
  const text = root && read(root)
  if (!text) throw new Error(`no score inside the ${what}`)
  return text
}
async function readZipBrowser(buf, re, what) {
  const ents = zipEntries(buf), dec = new TextDecoder()
  const inflate = async raw => new Uint8Array(await new Response(new Blob([raw]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer())
  const get = async name => { const f = ents.find(x => x.name === name); return f ? dec.decode(f.method === 0 ? f.raw : await inflate(f.raw)) : null }
  const container = await get('META-INF/container.xml')
  const root = zipRoot(ents.map(x => x.name), () => container, re)
  const text = root && await get(root)
  if (!text) throw new Error(`no score inside the ${what}`)
  return text
}
const MXL_RE = /\.(xml|musicxml)$/i, MSCZ_RE = /\.mscx$/i

/** A .mxl (zipped MusicXML). inflateRaw: Uint8Array → Uint8Array (Node: zlib.inflateRawSync). */
export const readMXL = (buf, inflateRaw, opts) => readMusicXML(readZip(buf, inflateRaw, MXL_RE, '.mxl'), opts)
/** A .mxl in the browser (DecompressionStream). */
export const readMXLBrowser = async (buf, opts) => readMusicXML(await readZipBrowser(buf, MXL_RE, '.mxl'), opts)
/** A .mscz (MuseScore 3 / 4). inflateRaw as for readMXL. */
export const readMSCZ = (buf, inflateRaw, opts) => readMSCX(readZip(buf, inflateRaw, MSCZ_RE, '.mscz'), opts)
/** A .mscz in the browser. */
export const readMSCZBrowser = async (buf, opts) => readMSCX(await readZipBrowser(buf, MSCZ_RE, '.mscz'), opts)

/** Any score file by its name: .musicxml / .xml, .mxl, .mscx, .mscz. In the browser unless inflateRaw is given. */
export const SCORE_FILE = /\.(musicxml|xml|mxl|mscx|mscz)$/i
export async function readScoreFile(name, buf, { inflateRaw = null, ...opts } = {}) {
  const ext = name.toLowerCase().match(/\.(\w+)$/)?.[1]
  const text = () => new TextDecoder().decode(buf)
  if (ext === 'mxl') return inflateRaw ? readMXL(buf, inflateRaw, opts) : readMXLBrowser(buf, opts)
  if (ext === 'mscz') return inflateRaw ? readMSCZ(buf, inflateRaw, opts) : readMSCZBrowser(buf, opts)
  if (ext === 'mscx') return readMSCX(text(), opts)
  return readMusicXML(text(), opts)
}
