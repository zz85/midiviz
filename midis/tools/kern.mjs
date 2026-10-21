// A small Humdrum **kern reader: the notes of a score, in the order they are
// played (expansion lists applied), with their ornament signs. Enough for the
// Well-Tempered Clavier encodings of humdrum-tools/bach-wtc (CCARH, from the
// Bach-Gesellschaft edition), for midis/tools/bach_ornaments.mjs.
//
// readKern(text) → { notes: [{ q, pitch, len, staff, orn: [kind] | null, step: semitones | null }] }
//   q, len: quarters (q counts from the start of the expanded score)
//   orn: kinds as strings/lilypond.js names them: trill (T t), mordent (M m),
//        prall (W w, the inverted mordent), turn (S), reverseturn ($),
//        prallmordent (a trill ending with a turn: T R)
//   step: the ornament's interval when the sign gives it (T M W: a tone, t m w: a semitone)
//
// Spine splits and merges (*^ *v), ties ([ _ ]), chords, grace notes (q Q,
// skipped), rests, and strophes (*S/ossia: the ossia is skipped) are handled.
// Not handled: spine exchanges (*x), added spines (*+), tuplet durations other
// than the reciprocal numbers themselves (12, 24 … are read as they should be).

const STEP = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 }

function pitchOf(tok) {
  const m = /([a-gA-G])\1*/.exec(tok)
  if (!m) return null
  const letter = m[0][0], n = m[0].length
  const oct = letter === letter.toLowerCase() ? 4 + (n - 1) : 3 - (n - 1)
  let p = 12 * (oct + 1) + STEP[letter.toLowerCase()]
  const acc = tok.slice(m.index + n)
  for (const c of acc) { if (c === '#') p++; else if (c === '-') p--; else if (c !== 'n') break }
  return p
}
function durOf(tok) {
  const m = /^[^0-9a-gA-Gr]*(\d+)(%\d+)?(\.*)/.exec(tok)
  if (!m) return null
  let base = +m[1]
  if (m[2]) base = base / +m[2].slice(1)
  let d = base === 0 ? 8 : 4 / base
  let add = d / 2
  for (let i = 0; i < m[3].length; i++) { d += add; add /= 2 }
  return d
}
function ornOf(tok) {
  const o = []
  let step = null
  const hasR = tok.includes('R')
  if (/T/.test(tok)) { o.push(hasR ? 'prallmordent' : 'trill'); step = 2 }
  else if (/t/.test(tok)) { o.push(hasR ? 'prallmordent' : 'trill'); step = 1 }
  if (/M/.test(tok)) { o.push('mordent'); step ??= 2 } else if (/m/.test(tok)) { o.push('mordent'); step ??= 1 }
  if (/W/.test(tok)) { o.push('prall'); step ??= 2 } else if (/w/.test(tok)) { o.push('prall'); step ??= 1 }
  if (/S/.test(tok)) o.push('turn')
  if (/\$/.test(tok)) o.push('reverseturn')
  return o.length ? { orn: o, step } : { orn: null, step: null }
}

export function readKern(text) {
  const lines = text.split(/\r?\n/)
  let cols = null          // per column: { kern, staff, next (quarters), ossia }
  let t = 0                // the current line's time
  const notes = []         // written order: { q, pitch, len, staff, orn, step, section }
  let section = null
  const expansions = {}
  let staffNo = 0
  for (const line of lines) {
    if (!line || line.startsWith('!')) continue
    const f = line.split('\t')
    if (line.startsWith('**')) { cols = f.map(x => ({ kern: x === '**kern', staff: null, next: 0, ossia: false })); continue }
    if (!cols) continue
    if (line.startsWith('*')) {
      // section labels and expansion lists (the first column decides)
      const lab = /^\*>([A-Za-z0-9_]+)$/.exec(f[0])
      if (lab) section = lab[1]
      const ex = /^\*>([A-Za-z0-9_]*)\[([^\]]*)\]$/.exec(f[0])
      if (ex) expansions[ex[1]] = ex[2].split(',')
      const next = []
      for (let k = 0; k < f.length; k++) {
        const x = f[k], c = cols[k]
        if (!c) continue
        if (/^\*staff(\d+)/.test(x)) c.staff = +RegExp.$1
        if (x === '*S/ossia') c.ossia = true
        if (x === '*S/fin' || x === '*S-') c.ossia = false
        if (x === '*^') { next.push(c, { ...c }); continue }
        if (x === '*v') {
          // a run of *v merges into one column
          const prev = next[next.length - 1]
          if (prev && prev._merging) { prev.next = Math.max(prev.next, c.next); continue }
          next.push({ ...c, _merging: true }); continue
        }
        if (x === '*-') continue
        next.push(c)
      }
      for (const c of next) delete c._merging
      cols = next
      continue
    }
    if (line.startsWith('=')) continue
    // a data line: it starts at the earliest time a column is free
    const active = cols.filter((c, k) => f[k] != null && f[k] !== '.')
    if (!active.length) continue
    t = Math.min(...active.map(c => c.next))
    let grace = true
    for (let k = 0; k < f.length && k < cols.length; k++) {
      const c = cols[k], x = f[k]
      if (!c.kern || x === '.' || x == null) continue
      for (const tok of x.split(' ')) {
        if (/[qQ]/.test(tok)) continue                 // grace notes (the Mutopia source has its own)
        grace = false
        const d = durOf(tok)
        if (d == null) continue
        c.next = Math.max(c.next, t + d)
        if (tok.includes('r') || c.ossia) continue
        if (tok.includes('_') || tok.includes(']')) {
          // the rest of a tie: the note continues
          const p = pitchOf(tok)
          for (let i = notes.length - 1; i >= 0; i--) if (notes[i].pitch === p && notes[i].col === c.id) { notes[i].len = t + d - notes[i].q; break }
          continue
        }
        const p = pitchOf(tok)
        if (p == null) continue
        c.id ??= Symbol()
        notes.push({ q: t, pitch: p, len: d, staff: c.staff ?? staffNo, ...ornOf(tok), section, col: c.id })
      }
    }
    void grace
  }
  // expansion: the unnamed list, else none (written order)
  const order = expansions['']
  let out = notes
  if (order && notes.some(n => n.section)) {
    const bySec = new Map()
    for (const n of notes) { const s = n.section ?? order[0]; if (!bySec.has(s)) bySec.set(s, []); bySec.get(s).push(n) }
    const span = s => { const ns = bySec.get(s) || []; return ns.length ? [Math.min(...ns.map(n => n.q)), Math.max(...ns.map(n => n.q + n.len))] : [0, 0] }
    out = []
    let off = 0
    for (const s of order) {
      const [a, b] = span(s)
      for (const n of bySec.get(s) || []) out.push({ ...n, q: n.q - a + off })
      off += b - a
    }
  }
  return { notes: out.map(({ col, section, ...n }) => n).sort((a, b) => a.q - b.q || a.pitch - b.pitch) }
}
