// LilyPond input for the strings experiments (#033 / #034 / #037): read .ly
// files directly, as Mutopia publishes them, without running LilyPond.
//
// readLilyPond(text, opts) → { notes, meter, tempo, title, parts, part } — the
// same shape as readMusicXML (strings/score.js), with the score's slurs,
// articulation marks, bowings, ties, glissandi, tempo and time signatures.
//   opts: { part: index into parts (default: the first violin part, else the
//           first with notes), include: name → text | null (for \include;
//           the including file's folder is tried first), tempo: bpm when the
//           score has none (default 60, as LilyPond's MIDI) }
//   parts: one entry per staff of each \score that LilyPond would write as
//          MIDI (the scores with a \midi block, or every score when none has
//          one), named from instrumentName / midiInstrument / the context id.
//
// It interprets the subset of the language that engraved music uses, not
// Scheme: note entry in every \language LilyPond 2.6–2.24 ships with the
// common names (nederlands, english, deutsch, italiano, français, español),
// \relative (with and without a start pitch, octave checks, chords, the same
// order through << >> as LilyPond), \absolute, \fixed, \transpose, durations
// with dots and multipliers (the last duration carries over, as in the
// parser), chords and q, \times / \tuplet / \scaleDurations, \repeat (unfold,
// percent and tremolo play every time; volta once, as LilyPond's MIDI does,
// unless \unfoldRepeats), \alternative, \grace / \acciaccatura /
// \appoggiatura / \afterGrace (skipped, as the other readers skip grace
// notes, unless opts.graces: then kept, squeezed at the main note, with
// art.grace = the command, art.graceAt = the main note's onset and
// art.graceDur = the written length, both in quarters), ornaments
// (\trill, \prall, \mordent, \turn … kept as art.orn, not played), \partial, \time, \tempo, \midi tempos, variables, \include (as
// text), \new / \context Staff / Voice / groups, << \\ >> voices, \with,
// \header. Scheme expressions, markup, \override / \set / \tweak and layout
// blocks are skipped; lyrics, chord names and figured bass are ignored.
// Checked against the MIDI files LilyPond made from Mutopia's sources:
// strings/test/lilypond.js.

import { finishScore, strokeOf, accentGain, DYN } from './score.js'

// ── note names ───────────────────────────────────────────────────────────────
const SEMI = [0, 2, 4, 5, 7, 9, 11]
function langTable(lang) {
  const t = new Map()
  const add = (names, steps, sfx) => names.forEach((n, s) => { for (const [x, a] of sfx) t.set(n + x, [steps[s], a]) })
  const C7 = [0, 1, 2, 3, 4, 5, 6]
  const dutch = [['', 0], ['is', 1], ['isis', 2], ['es', -1], ['eses', -2], ['ih', 0.5], ['eh', -0.5], ['isih', 1.5], ['eseh', -1.5]]
  if (lang === 'english') {
    add(['c', 'd', 'e', 'f', 'g', 'a', 'b'], C7, [['', 0], ['s', 1], ['ss', 2], ['x', 2], ['f', -1], ['ff', -2], ['qs', 0.5], ['qf', -0.5], ['tqs', 1.5], ['tqf', -1.5],
      ['sharp', 1], ['sharpsharp', 2], ['flat', -1], ['flatflat', -2], ['-sharp', 1], ['-sharpsharp', 2], ['-flat', -1], ['-flatflat', -2]])
  } else if (lang === 'deutsch') {
    add(['c', 'd', 'e', 'f', 'g', 'a', 'h'], C7, dutch)
    for (const [k, v] of [['as', [5, -1]], ['ases', [5, -2]], ['es', [2, -1]], ['eses', [2, -2]], ['b', [6, -1]], ['bes', [6, -2]], ['heses', [6, -2]]]) t.set(k, v)
  } else if (/^(italiano|espanol|español|catalan|català|portugues|francais|français)$/.test(lang)) {
    const fr = /^fran/.test(lang), es = /^(espanol|español|catalan|català|portugues)$/.test(lang)
    const sharp = es ? 's' : 'd'
    add(['do', 're', 'mi', 'fa', 'sol', 'la', 'si'], C7, [['', 0], [sharp, 1], [sharp + sharp, 2], ['x', 2], ['b', -1], ['bb', -2], ['sd', 0.5], ['sb', -0.5], ['dsd', 1.5], ['bsb', -1.5]])
    if (fr) add(['do', 'ré', 're', 'mi', 'fa', 'sol', 'la', 'si'].slice(1, 2), [1], [['', 0], ['d', 1], ['b', -1]])
  } else {
    // nederlands (the default), with its contracted names
    add(['c', 'd', 'e', 'f', 'g', 'a', 'b'], C7, dutch)
    for (const [k, v] of [['as', [5, -1]], ['ases', [5, -2]], ['aes', [5, -1]], ['aeses', [5, -2]], ['es', [2, -1]], ['eses', [2, -2]], ['ees', [2, -1]], ['eeses', [2, -2]]]) t.set(k, v)
  }
  return t
}
const TABLES = new Map()
const table = lang => { if (!TABLES.has(lang)) TABLES.set(lang, langTable(lang)); return TABLES.get(lang) }

// ── postfix commands that attach to the preceding note ──────────────────────
const ARTIC = { staccato: ['staccato'], staccatissimo: ['staccatissimo'], tenuto: ['tenuto'], accent: ['accent'], marcato: ['strong-accent'], portato: ['detached-legato'] }
const SHORT_ARTIC = { '.': 'staccato', '-': 'tenuto', '>': 'accent', '^': 'strong-accent', '!': 'staccatissimo', '_': 'detached-legato' }
const POSTFIX = new Set(['espressivo', 'upbow', 'downbow', 'flageolet', 'open', 'stopped', 'thumb', 'snappizzicato', 'fermata', 'shortfermata', 'longfermata',
  'verylongfermata', 'veryshortfermata', 'henzeshortfermata', 'henzelongfermata', 'trill', 'prall', 'mordent', 'turn', 'reverseturn', 'prallprall', 'prallmordent',
  'upprall', 'downprall', 'upmordent', 'downmordent', 'lineprall', 'pralldown', 'prallup', 'signumcongruentiae', 'segno', 'coda', 'varcoda', 'lheel', 'rheel',
  'ltoe', 'rtoe', 'halfopen', 'harmonic', 'glissando', 'arpeggio', 'startTrillSpan', 'stopTrillSpan', 'startTextSpan', 'stopTextSpan', 'cresc', 'decresc',
  'dim', 'endcresc', 'enddecresc', 'enddim', 'crescTextCresc', 'laissezVibrer', 'repeatTie', 'noBeam', 'sustainOn', 'sustainOff', 'sostenutoOn', 'sostenutoOff',
  'unaCorda', 'treCorde', 'accentus', 'circulus', 'ictus', 'semicirculus', 'fermataMarkup', 'startGroup', 'stopGroup', 'rest', 'breathe', 'melisma',
  'melismaEnd', 'startStaff', 'stopStaff', 'startMeasureCount', 'stopMeasureCount', 'staccatissimo', 'staccato', 'tenuto', 'accent', 'marcato', 'portato',
  'p', 'pp', 'ppp', 'pppp', 'ppppp', 'f', 'ff', 'fff', 'ffff', 'fffff', 'mp', 'mf', 'fp', 'sf', 'sff', 'sp', 'spp', 'sfz', 'rfz', 'fz', 'n', 'sfp', 'sfpp',
  'cr', 'decr', 'mordent', 'tweak', 'markup', 'bendAfter', 'finger', 'rightHandFinger', 'footnote', 'parenthesize', 'breve', 'longa', 'maxima'])
// ornaments, kept on the note as art.orn (for realizing them: midis/tools/bach_ornaments.mjs)
const ORN = new Set(['trill', 'prall', 'mordent', 'turn', 'reverseturn', 'prallprall', 'prallmordent', 'upprall', 'downprall', 'upmordent', 'downmordent', 'lineprall', 'pralldown', 'prallup', 'startTrillSpan'])
const DYNS = { pppp: 0.15, ppppp: 0.12, ffff: 1, fffff: 1, fp: 0.8, sfp: 0.9, sfpp: 0.9, sp: 0.42, spp: 0.3, rfz: 0.9, sff: 0.95, ...DYN }
// hairpins and their text forms: crescendo, diminuendo, or the end of one (\! or a dynamic)
const HAIRPIN = { '<': 'cresc', '>': 'dim', '!': 'end', cresc: 'cresc', cr: 'cresc', crescTextCresc: 'cresc', decresc: 'dim', decr: 'dim', dim: 'dim', endcresc: 'end', enddecresc: 'end', enddim: 'end' }
const LYRIC = new Set(['Lyrics', 'ChordNames', 'FiguredBass', 'NoteNames', 'FretBoards', 'DrumStaff', 'DrumVoice', 'RhythmicStaff', 'Dynamics', 'Devnull', 'NullVoice', 'CueVoice'])
const STAFF = new Set(['Staff', 'TabStaff', 'VaticanaStaff', 'MensuralStaff', 'PetrucciStaff', 'KievanStaff', 'GregorianTranscriptionStaff'])
const VOICE = new Set(['Voice', 'TabVoice', 'VaticanaVoice', 'MensuralVoice', 'PetrucciVoice', 'KievanVoice'])
const SKIP_MODE = new Set(['lyricmode', 'lyrics', 'addlyrics', 'chordmode', 'chords', 'figuremode', 'figures', 'drummode', 'drums'])

// ── \include as text ─────────────────────────────────────────────────────────
function expandIncludes(text, file, include, depth = 0, missing = []) {
  if (depth > 12) return text
  include ??= () => null
  const dir = file.includes('/') ? file.slice(0, file.lastIndexOf('/') + 1) : ''
  return text.replace(/(%\{[\s\S]*?%\}|%[^\n]*)|\\include\s+"([^"]+)"/g, (m, cmt, name) => {
    if (cmt) return m
    // the old way to choose note names: \include "english.ly"
    const lang = /^(nederlands|english|deutsch|italiano|francais|français|espanol|español|catalan|portugues|norsk|svenska|suomi|vlaams)\.ly$/.exec(name.split('/').pop())
    if (lang) return `\\language "${lang[1]}"`
    const path = normPath(dir + name)
    let src = include(path, name)
    // LilyPond's own files (articulate.ly, gregorian.ly …) are not needed for the notes
    if (src == null) { if (!/^(articulate|gregorian|predefined-.*|event-listener|graphviz|lilypond-book-preamble|toc-init|bagpipe|makam|arabic|hel-arabic|turkish-makam|persian|kievan|ancient)\.ly$/.test(name.split('/').pop())) missing.push(name); return '' }
    if (typeof src === 'object') { const r = src; src = r.text; return '\n' + expandIncludes(src, r.name ?? path, include, depth + 1, missing) + '\n' }
    return '\n' + expandIncludes(src, path, include, depth + 1, missing) + '\n'
  })
}
const normPath = p => { const out = []; for (const s of p.split('/')) { if (s === '..') out.pop(); else if (s && s !== '.') out.push(s) } return out.join('/') }

// ── parser: text → definitions and scores of music trees ─────────────────────
class Parser {
  constructor(src) {
    this.s = src; this.i = 0
    this.lang = 'nederlands'; this.names = table(this.lang)
    this.dur = { q: 1 }                  // the last duration, in quarter notes
    this.vars = new Map()
    this.header = {}
    this.scores = []
    this.lastChord = null
  }
  // ── characters ──
  eof() { return this.i >= this.s.length }
  peek(k = 0) { return this.s[this.i + k] }
  at(str) { return this.s.startsWith(str, this.i) }
  ws() {
    const s = this.s
    for (;;) {
      const c = s[this.i]
      if (c === ' ' || c === '\t' || c === '\n' || c === '\r' || c === '\f') { this.i++; continue }
      if (c === '%') {
        if (s[this.i + 1] === '{') { const e = s.indexOf('%}', this.i + 2); this.i = e < 0 ? s.length : e + 2 }
        else { const e = s.indexOf('\n', this.i); this.i = e < 0 ? s.length : e + 1 }
        continue
      }
      return
    }
  }
  word() { const m = /^[A-Za-zÀ-ÿ]+/.exec(this.s.slice(this.i, this.i + 64)); if (!m) return ''; this.i += m[0].length; return m[0] }
  ident() { const m = /^[A-Za-zÀ-ÿ]+(?:[-_][A-Za-zÀ-ÿ]+)*/.exec(this.s.slice(this.i, this.i + 128)); if (!m) return ''; this.i += m[0].length; return m[0] }
  number() { const m = /^\d+(?:\.\d+)?/.exec(this.s.slice(this.i, this.i + 32)); if (!m) return null; this.i += m[0].length; return +m[0] }
  string() {
    // at '"'
    let out = ''; this.i++
    while (!this.eof()) {
      const c = this.s[this.i++]
      if (c === '\\') { const d = this.s[this.i++]; out += d === 'n' ? '\n' : d === 't' ? '\t' : d; continue }
      if (c === '"') break
      out += c
    }
    return out
  }
  // a Scheme value after # or $ (skipped; a string or number is returned)
  scheme() {
    this.i++                                  // # or $
    const c = this.peek()
    if (c === '#') { this.i++; const m = /^[\w\\-]+/.exec(this.s.slice(this.i, this.i + 32)); if (m) this.i += m[0].length; return null }  // ##t, ##f
    if (c === '"') return this.string()
    if (c === '{') { const e = this.s.indexOf('#}', this.i); this.i = e < 0 ? this.s.length : e + 2; return null }
    if (c === "'" || c === '`' || c === ',') { this.i++; if (this.peek() === '(') this.sexpr(); else this.atom(); return null }
    if (c === '(') { const st = this.i; this.sexpr(); return { sexpr: this.s.slice(st, this.i) } }
    const a = this.atom()
    return a !== '' && !isNaN(+a) ? +a : a
  }
  atom() { const m = /^[^\s(){}"<>#;]+/.exec(this.s.slice(this.i, this.i + 256)); if (!m) return ''; this.i += m[0].length; return m[0] }
  sexpr() {
    // at '(' : balanced, with strings, ; comments and #\x characters
    let depth = 0
    while (!this.eof()) {
      const c = this.s[this.i]
      if (c === '"') { this.string(); continue }
      if (c === ';') { const e = this.s.indexOf('\n', this.i); this.i = e < 0 ? this.s.length : e; continue }
      if (c === '#' && this.s[this.i + 1] === '\\') { this.i += 3; continue }
      this.i++
      if (c === '(') depth++
      else if (c === ')' && --depth === 0) return
    }
  }
  // skip a balanced { … } (strings, comments and Scheme inside are skipped whole)
  block() {
    this.ws()
    if (this.peek() !== '{') return ''
    const st = this.i; let depth = 0
    while (!this.eof()) {
      const c = this.s[this.i]
      if (c === '"') { this.string(); continue }
      if (c === '%') { this.ws(); continue }
      if (c === '#' || c === '$') { const n = this.s[this.i + 1]; if (n === '(' || n === '"' || n === "'" || n === '{' || n === '#') { this.scheme(); continue } }
      this.i++
      if (c === '{') depth++
      else if (c === '}' && --depth === 0) break
    }
    return this.s.slice(st, this.i)
  }
  // markup: commands with their Scheme arguments, then one word, string or { … }; returns its text
  markup() {
    for (let guard = 0; guard < 64; guard++) {
      this.ws()
      const c = this.peek()
      if (c === '\\') {
        this.i++; const name = this.ident()
        if (name === 'markup' || name === 'markuplist') continue
        continue
      }
      if (c === '#' || c === '$') { this.scheme(); continue }
      if (c === '"') return this.string()
      if (c === '{') {
        const b = this.block()
        return b.slice(1, -1).replace(/"((?:\\.|[^"\\])*)"/g, ' $1 ').replace(/\\[A-Za-z-]+/g, ' ').replace(/#'?\([^)]*\)|#[^\s{}]+/g, ' ').replace(/[{}]/g, ' ').replace(/\s+/g, ' ').trim()
      }
      if (/[A-Za-z0-9]/.test(c || '')) return this.atom()
      return ''
    }
    return ''
  }
  // a value after "name =": music, a string, a number, Scheme, markup, \with
  value() {
    this.ws()
    const c = this.peek()
    if (c === '"') return this.string()
    if (c === '#' || c === '$') return this.scheme()
    if (/[0-9]/.test(c)) { const n = this.number(); return n }
    if (this.at('\\markup')) { this.i += 7; return { markup: this.markup() } }
    if (this.at('\\with')) { this.i += 5; return { with: this.withBlock() } }
    if (this.at('\\layout') || this.at('\\midi') || this.at('\\paper') || this.at('\\header')) { this.i++; this.ident(); this.block(); return null }
    // a variable holding a string, a number or markup
    if (c === '\\') {
      const m = /^\\([A-Za-zÀ-ÿ]+(?:[-_][A-Za-zÀ-ÿ]+)*)/.exec(this.s.slice(this.i, this.i + 64))
      const v = m && this.vars.get(m[1])
      if (v != null && !(typeof v === 'object' && v.t)) { this.i += m[0].length; return v }
    }
    return this.music()
  }
  // \with { instrumentName = "…" … } → { instrumentName, midiInstrument, … }
  withBlock() {
    this.ws()
    const out = {}
    if (this.peek() !== '{') { if (this.peek() === '\\') { this.i++; const v = this.vars.get(this.ident()); if (v?.with) Object.assign(out, v.with) } return out }
    this.i++
    while (!this.eof()) {
      this.ws()
      const c = this.peek()
      if (c === '}') { this.i++; break }
      if (c === '\\') {
        this.i++; const cmd = this.ident()
        if (cmd === 'override' || cmd === 'set') { this.propertySet() }
        else if (cmd === 'revert' || cmd === 'unset') { this.ws(); this.atom(); this.ws(); if (this.peek() === '#') this.scheme() }
        else if (/^(consists|remove|accepts|denies|alias|defaultchild|name|type|description)$/.test(cmd)) { this.ws(); if (this.peek() === '"') this.string(); else if (this.peek() === '#') this.scheme(); else this.atom() }
        else if (this.vars.get(cmd)?.with) Object.assign(out, this.vars.get(cmd).with)
        continue
      }
      if (/[A-Za-z]/.test(c)) {
        const name = this.atom().replace(/=$/, '')
        this.ws(); if (this.peek() === '=') this.i++
        const v = this.value()
        const key = name.split('.').pop()
        out[key] = typeof v === 'string' ? v : v?.markup ?? v
        continue
      }
      if (c === '#' || c === '$') { this.scheme(); continue }
      if (c === '"') { this.string(); continue }
      this.i++
    }
    return out
  }
  // \set / \override path = value (old syntax: path #'prop = value) → [path, value]
  propertySet() {
    this.ws()
    let path = this.atom()
    for (;;) { this.ws(); if (this.peek() === '#') { this.scheme(); continue } break }
    this.ws()
    if (this.peek() !== '=') return [path, null]
    this.i++
    const v = this.value()
    return [path, v]
  }
  // \header { title = "…" … }
  headerBlock() {
    this.ws()
    const h = {}
    if (this.peek() !== '{') return h
    this.i++
    while (!this.eof()) {
      this.ws()
      const c = this.peek()
      if (c === '}') { this.i++; break }
      if (/[A-Za-z]/.test(c)) {
        const name = this.ident(); this.ws()
        if (this.peek() !== '=') continue
        this.i++
        const v = this.value()
        h[name] = typeof v === 'string' ? v : v?.markup ?? (typeof v === 'number' ? String(v) : '')
        continue
      }
      if (c === '#' || c === '$') { this.scheme(); continue }
      if (c === '\\') { this.i++; this.ident(); continue }
      if (c === '"') { this.string(); continue }
      this.i++
    }
    return h
  }

  // ── pitches and durations ──
  pitchWord(w) {
    const p = this.names.get(w)
    if (!p) return null
    let marks = 0
    while (this.peek() === "'" || this.peek() === ',') marks += this.s[this.i++] === "'" ? 1 : -1
    while (this.peek() === '!' || this.peek() === '?') this.i++
    let check = null
    if (this.peek() === '=') {
      // an octave check (c=''), not a following "="
      const m = /^=([',]*)/.exec(this.s.slice(this.i, this.i + 8))
      if (m && this.s[this.i + 1] !== '=') { this.i += m[0].length; check = [...m[1]].reduce((a, c) => a + (c === "'" ? 1 : -1), 0) }
    }
    return { step: p[0], alter: p[1], marks, check }
  }
  // a pitch argument (\relative c'', \transpose c d, \key g): letters then marks
  pitchArg() {
    this.ws()
    const st = this.i
    let w = this.word()
    if (this.lang === 'english' && this.peek() === '-' && /^-(sharp|flat)/.test(this.s.slice(this.i, this.i + 8))) { const m = /^-(sharpsharp|flatflat|sharp|flat)/.exec(this.s.slice(this.i)); this.i += m[0].length; w += m[0] }
    const p = w && this.pitchWord(w)
    if (!p) { this.i = st; return null }
    return p
  }
  duration(explicitOnly = false) {
    // 1 2 4 8 … with dots and *n/m, or \breve \longa \maxima; else the last one
    let base = null
    // the duration may be apart from its pitch ("cis 2")
    const st = this.i
    this.ws()
    if (!/[\d\\]/.test(this.peek() || '')) this.i = st
    const m = /^(\d+)/.exec(this.s.slice(this.i, this.i + 8))
    if (m && /^(1|2|4|8|16|32|64|128|256|512|1024)$/.test(m[1])) { base = 4 / +m[1]; this.i += m[1].length }
    else if (this.at('\\breve')) { base = 8; this.i += 6 }
    else if (this.at('\\longa')) { base = 16; this.i += 6 }
    else if (this.at('\\maxima')) { base = 32; this.i += 7 }
    if (base == null) { this.i = st; return explicitOnly ? null : this.dur.q }
    let dots = 0
    while (this.peek() === '.') { dots++; this.i++ }
    let q = base * (2 - Math.pow(0.5, dots))
    for (;;) {
      const k = /^\s*\*\s*(\d+)(?:\s*\/\s*(\d+))?/.exec(this.s.slice(this.i, this.i + 24))
      if (!k) break
      q *= +k[1] / (+k[2] || 1); this.i += k[0].length
    }
    this.dur = { q }
    return q
  }
  fraction() {
    this.ws()
    const m = /^(\d+)\s*\/\s*(\d+)/.exec(this.s.slice(this.i, this.i + 16))
    if (m) { this.i += m[0].length; return [+m[1], +m[2]] }
    // #(ly:make-moment 2 3), #'(2 . 3) (a pair, as \scaleDurations takes it)
    if (this.peek() === '#') { const st = this.i; this.scheme(); const k = /(\d+)\s*(?:\.\s*|\/\s*|\s+)(\d+)/.exec(this.s.slice(st, this.i)); return k ? [+k[1], +k[2]] : [1, 1] }
    return [1, 1]
  }

  // ── events ──
  newArt() { return { arts: [], techs: [], orns: [], slurStart: 0, slurEnd: 0, tie: false, dyn: null, gliss: false, hp: [] } }
  // postfix events after a note, chord or rest
  postfix(ev, art) {
    for (;;) {
      this.ws()
      const c = this.peek(), d = this.peek(1)
      if (c === '~') { this.i++; art.tie = true; continue }
      if (c === '(') { this.i++; art.slurStart++; continue }
      if (c === ')') { this.i++; art.slurEnd++; continue }
      if (c === '[' || c === ']') { this.i++; continue }
      if (c === ':') { this.i++; this.number(); continue }      // tremolo strokes
      if (c === '-' || c === '^' || c === '_') {
        this.i++
        const e = this.peek()
        if (SHORT_ARTIC[e] && !(e === '-' && /\d/.test(this.peek(1) || ''))) { this.i++; art.arts.push(SHORT_ARTIC[e]); continue }
        if (e === '+') { this.i++; continue }
        if (/\d/.test(e || '')) { this.number(); continue }       // fingering
        if (e === '"') { this.string(); continue }
        if (e === '#' || e === '$') { this.scheme(); continue }
        if (e === '\\') {
          const f = this.peek(1)
          if (f === '<' || f === '>' || f === '!') { this.i += 2; art.hp.push(HAIRPIN[f]); continue }
          if (f === '(' || f === ')' || f === '[' || f === ']') { this.i += 2; continue }
          if (/\d/.test(f || '')) { this.i++; this.number(); continue }
          if (!this.postCommand(ev, art, true)) break
          continue
        }
        if (e === '[' || e === ']' || e === '(' || e === ')' || e === '~') continue
        continue
      }
      if (c === '\\') {
        if (d === '<' || d === '>' || d === '!') { this.i += 2; art.hp.push(HAIRPIN[d]); continue }
        if (d === '(' || d === ')' || d === '[' || d === ']') { this.i += 2; continue }
        if (/\d/.test(d || '')) { this.i++; this.number(); continue }   // string number
        if (!this.postCommand(ev, art, false)) break
        continue
      }
      break
    }
  }
  // \command after a note: true when it was a postfix command (consumed)
  postCommand(ev, art, directed) {
    const st = this.i
    this.i++
    const name = this.ident()
    if (!directed && !POSTFIX.has(name) && !ARTIC[name]) { this.i = st; return false }
    if (ARTIC[name]) art.arts.push(...ARTIC[name])
    else if (name === 'upbow') art.techs.push('up-bow')
    else if (name === 'downbow') art.techs.push('down-bow')
    else if (name === 'glissando') art.gliss = true
    else if (ORN.has(name)) art.orns.push(name === 'startTrillSpan' ? 'trill' : name)
    else if (name === 'rest') { if (ev) ev.kind = 'rest' }
    else if (DYNS[name] != null) art.dyn = DYNS[name]
    else if (HAIRPIN[name]) art.hp.push(HAIRPIN[name])
    else if (name === 'markup') this.markup()
    else if (name === 'tweak') { this.ws(); if (this.peek() === '#') this.scheme(); else this.atom(); this.ws(); if (this.peek() === '#' || this.peek() === '$') this.scheme(); else if (this.peek() === '"') this.string(); else this.number() }
    else if (name === 'bendAfter') { this.ws(); if (this.peek() === '#') this.scheme(); else this.number() }
    else if (name === 'finger' || name === 'rightHandFinger') { this.ws(); if (this.peek() === '"') this.string(); else if (this.peek() === '#') this.scheme(); else this.number() }
    else if (name === 'footnote') { this.ws(); if (this.peek() === '"') this.string(); this.ws(); if (this.peek() === '#') this.scheme(); this.ws(); if (this.at('\\markup')) { this.i += 7; this.markup() } }
    else if (directed && !POSTFIX.has(name)) {
      // -\name: a variable holding an articulation, or an unknown script
      const v = this.vars.get(name)
      if (v?.t === 'post') { art.arts.push(...v.art.arts); art.techs.push(...v.art.techs); art.orns.push(...(v.art.orns || [])) }
    }
    return true
  }
  // a note, rest, spacer or q from its word
  event(w) {
    let kind = 'note', pitches = []
    if (w === 'r' || w === 'R' || w === 's') kind = w === 's' ? 'skip' : 'rest'
    else if (w === 'q') kind = 'q'
    else {
      if (this.lang === 'english' && /^-(sharp|flat)/.test(this.s.slice(this.i, this.i + 8))) { const m = /^-(sharpsharp|flatflat|sharp|flat)/.exec(this.s.slice(this.i)); this.i += m[0].length; w += m[0] }
      const p = this.pitchWord(w)
      if (!p) return null
      pitches = [p]
    }
    const q = this.duration()
    const art = this.newArt()
    const ev = { t: 'ev', kind, pitches, perNote: [null], dur: q, art }
    if (kind === 'q') { ev.ref = this.lastChord; ev.kind = 'chord' }
    this.postfix(ev, art)
    return ev
  }
  chord() {
    // at '<' (not '<<')
    this.i++
    const pitches = [], perNote = []
    while (!this.eof()) {
      this.ws()
      const c = this.peek()
      if (c === '>') { this.i++; break }
      if (/[A-Za-zÀ-ÿ]/.test(c)) {
        const w = this.word()
        let ww = w
        if (this.lang === 'english' && /^-(sharp|flat)/.test(this.s.slice(this.i, this.i + 8))) { const m = /^-(sharpsharp|flatflat|sharp|flat)/.exec(this.s.slice(this.i)); this.i += m[0].length; ww += m[0] }
        const p = this.pitchWord(ww)
        const art = this.newArt()
        this.postfix(null, art)
        if (p) { pitches.push(p); perNote.push(art) }
        continue
      }
      if (c === '\\') { this.i++; const n = this.ident(); if (n === 'tweak') { this.ws(); if (this.peek() === '#') this.scheme(); else this.atom(); this.ws(); if (this.peek() === '#') this.scheme(); else this.number() } continue }
      if (c === '#' || c === '$') { this.scheme(); continue }
      this.i++
    }
    const q = this.duration()
    const art = this.newArt()
    const ev = { t: 'ev', kind: 'chord', pitches, perNote, dur: q, art }
    this.lastChord = ev
    this.postfix(ev, art)
    return ev
  }

  // ── music ──
  // one music expression (or null when what was read is not music)
  music() {
    this.ws()
    const c = this.peek()
    if (c === '{') { this.i++; return { t: 'seq', items: this.items('}') } }
    if (c === '<' && this.peek(1) === '<') { this.i += 2; return this.simultaneous() }
    if (c === '<') return this.chord()
    if (c === '\\') return this.command()
    if (c === '#' || c === '$') { this.scheme(); return null }
    if (c === '"') { this.string(); return null }
    if (/[A-Za-zÀ-ÿ]/.test(c)) {
      const st = this.i
      const w = this.word()
      const ev = this.event(w)
      // not a note: an unknown word (a grob name after \shape, a stray word)
      if (!ev) { this.i = st; this.word(); return null }
      return ev
    }
    this.i++
    return null
  }
  items(close) {
    const out = []
    let last = null
    while (!this.eof()) {
      this.ws()
      if (this.at(close)) { this.i += close.length; break }
      const c = this.peek()
      // a postfix event separated from its note by something (a bar check, a comment)
      if (last && (c === '(' || c === ')' || c === '~' || c === '[' || c === ']' || ((c === '-' || c === '^' || c === '_') && !/\d/.test(this.peek(1) || '')))) { this.postfix(last, last.art); continue }
      if (c === '|' || c === '}' || (c === '>' && close === '>>')) { this.i++; continue }
      const m = this.music()
      if (!m) continue
      if (m.t === 'ev') last = m
      out.push(m)
    }
    return out
  }
  simultaneous() {
    // << a b \\ c >>: with \\ the parts are voices
    const parts = [[]]
    let last = null
    while (!this.eof()) {
      this.ws()
      if (this.at('>>')) { this.i += 2; break }
      if (this.at('\\\\')) { this.i += 2; parts.push([]); continue }
      const c = this.peek()
      if (last && (c === '(' || c === ')' || c === '~')) { this.postfix(last, last.art); continue }
      if (c === '|' || c === '}') { this.i++; continue }
      const m = this.music()
      if (!m) continue
      if (m.t === 'ev') last = m
      parts[parts.length - 1].push(m)
    }
    if (parts.length > 1) return { t: 'sim', voices: true, items: parts.map(p => ({ t: 'seq', items: p })) }
    return { t: 'sim', items: parts[0] }
  }
  command() {
    this.i++
    if (this.peek() === '\\') { this.i++; return null }       // a stray voice separator
    const c = this.peek()
    if (c === '(' || c === ')' || c === '[' || c === ']' || c === '<' || c === '>' || c === '!' || c === '~') { this.i++; return null }
    if (/\d/.test(c || '')) { this.number(); return null }
    const name = this.ident()
    switch (name) {
      case 'relative': { const ref = this.pitchArg(); return { t: 'rel', ref, music: this.music() } }
      case 'absolute': return { t: 'abs', music: this.music() }
      case 'fixed': { const ref = this.pitchArg(); return { t: 'fixed', ref, music: this.music() } }
      case 'transpose': { const from = this.pitchArg(), to = this.pitchArg(); return { t: 'tr', from, to, music: this.music() } }
      case 'times': { const [n, d] = this.fraction(); return { t: 'scale', k: n / d, music: this.music() } }
      case 'tuplet': { const [n, d] = this.fraction(); this.ws(); if (/\d/.test(this.peek() || '')) { const keep = this.dur; this.duration(); this.dur = keep } return { t: 'scale', k: d / n, music: this.music() } }
      case 'scaleDurations': { const [n, d] = this.fraction(); return { t: 'scale', k: n / d, music: this.music() } }
      case 'repeat': {
        this.ws(); const kind = this.peek() === '"' ? this.string() : this.word(); this.ws(); const n = this.number() || 2
        const body = this.music()
        this.ws()
        let alts = []
        if (this.at('\\alternative')) { this.i += 12; this.ws(); if (this.peek() === '{') { this.i++; alts = this.items('}') } }
        return { t: 'rep', kind, n, body, alts }
      }
      case 'alternative': { this.ws(); if (this.peek() === '{') { this.i++; return { t: 'seq', items: this.items('}') } } return null }
      case 'grace': case 'acciaccatura': case 'appoggiatura': case 'slashedGrace': return { t: 'grace', kind: name, music: this.music() }
      case 'afterGrace': {
        this.ws(); if (/\d/.test(this.peek() || '')) this.fraction()
        const main = this.music(), g = this.music()
        return { t: 'seq', items: [main, { t: 'grace', kind: 'afterGrace', music: g }] }
      }
      case 'new': case 'context': {
        this.ws(); const type = this.ident(); this.ws()
        let id = null, mods = {}
        if (this.peek() === '=') { this.i++; this.ws(); id = this.peek() === '"' ? this.string() : this.ident() }
        for (;;) { this.ws(); if (this.at('\\with')) { this.i += 5; Object.assign(mods, this.withBlock()) } else break }
        if (LYRIC.has(type) && type !== 'Dynamics' && type !== 'NullVoice' && type !== 'CueVoice') { this.ws(); if (this.peek() === '{') this.block(); else this.music(); return null }
        return { t: 'ctx', type, id, mods, isNew: name === 'new', music: this.music() }
      }
      case 'with': { this.withBlock(); return null }
      case 'change': { this.ws(); this.ident(); this.ws(); if (this.peek() === '=') { this.i++; this.ws(); if (this.peek() === '"') this.string(); else this.ident() } return null }
      case 'time': {
        this.ws()
        let m = /^[\d,]+/.exec(this.s.slice(this.i, this.i + 16))
        if (m && this.s[this.i + m[0].length] !== '/' && !/^\s*\//.test(this.s.slice(this.i + m[0].length, this.i + m[0].length + 4))) { this.i += m[0].length; this.ws() }
        const [n, d] = this.fraction()
        return { t: 'time', beats: n, type: d }
      }
      case 'tempo': {
        this.ws()
        if (this.peek() === '"') this.string()
        else if (this.at('\\markup')) { this.i += 7; this.markup() }
        this.ws()
        if (!/\d/.test(this.peek() || '')) return null
        const keep = this.dur
        const q = this.duration(true); this.dur = keep
        this.ws(); if (this.peek() !== '=') return null
        this.i++; this.ws()
        const a = this.number()
        const m = /^\s*[-~]\s*(\d+)/.exec(this.s.slice(this.i, this.i + 16)); if (m) this.i += m[0].length
        return a && q ? { t: 'tempo', bpm: a * q } : null
      }
      case 'partial': { const keep = this.dur; const q = this.duration(true); this.dur = keep; return q ? { t: 'partial', q } : null }
      case 'key': { this.pitchArg(); this.ws(); if (this.peek() === '\\') { this.i++; this.ident() } return null }
      case 'clef': { this.ws(); if (this.peek() === '"') this.string(); else { const m = /^[\w^]+/.exec(this.s.slice(this.i, this.i + 32)); if (m) this.i += m[0].length } return null }
      case 'bar': case 'version': case 'sourcefilename': case 'instrumentSwitch': case 'defineBarLine': { this.ws(); if (this.peek() === '"') this.string(); this.ws(); if (name === 'defineBarLine' && this.peek() === '#') this.scheme(); return null }
      case 'sourcefileline': { this.ws(); this.number(); return null }
      case 'mark': case 'jump': { this.ws(); if (this.at('\\default')) this.i += 8; else if (this.peek() === '"') this.string(); else if (this.at('\\markup')) { this.i += 7; this.markup() } else if (this.peek() === '#') this.scheme(); else if (/\d/.test(this.peek() || '')) this.number(); else if (this.peek() === '\\') { this.i++; this.ident() } return null }
      case 'set': {
        const [path, v] = this.propertySet()
        const key = path.split('.').pop()
        if (/^(instrumentName|instrument)$/.test(key)) return { t: 'name', name: typeof v === 'string' ? v : v?.markup ?? '' }
        if (key === 'midiInstrument' && typeof v === 'string') return { t: 'midi', name: v }
        if (key === 'tempoWholesPerMinute') { const k = /make-moment\s+(\d+)(?:\s*\/\s*|\s+)(\d+)/.exec(v?.sexpr || ''); if (k) return { t: 'tempo', bpm: 4 * +k[1] / +k[2] } }
        return null
      }
      case 'override': { this.propertySet(); return null }
      case 'unset': case 'revert': case 'omit': case 'hide': case 'undo': { this.ws(); this.atom(); this.ws(); if (this.peek() === '#') this.scheme(); return null }
      case 'tweak': { this.ws(); if (this.peek() === '#') this.scheme(); else this.atom(); this.ws(); if (this.peek() === '#' || this.peek() === '$') this.scheme(); else if (this.peek() === '"') this.string(); else this.number(); return null }
      case 'tag': case 'keepWithTag': case 'removeWithTag': case 'pushToTag': case 'appendToTag': { this.ws(); if (this.peek() === '#') this.scheme(); else if (this.peek() === '"') this.string(); else this.ident(); return this.music() }
      case 'unfoldRepeats': return { t: 'unfold', music: this.music() }
      case 'articulate': case 'displayMusic': case 'killCues': case 'notemode': case 'crossStaff': return this.music()
      case 'magnifyMusic': { this.ws(); if (this.peek() === '#') this.scheme(); return this.music() }
      case 'cueDuring': case 'quoteDuring': case 'cueDuringWithClef': { this.ws(); if (this.peek() === '"') this.string(); this.ws(); if (this.peek() === '#') this.scheme(); this.ws(); if (this.peek() === '"') this.string(); return this.music() }
      case 'addQuote': { this.ws(); if (this.peek() === '"') this.string(); this.music(); return null }
      case 'parallelMusic': { this.ws(); if (this.peek() === '#') this.scheme(); this.block(); return null }
      case 'lyricsto': { this.ws(); if (this.peek() === '"') this.string(); else this.ident(); this.ws(); if (this.peek() === '{') this.block(); else this.music(); return null }
      case 'markup': case 'markuplist': this.markup(); return null
      case 'header': this.headerBlock(); return null
      case 'layout': case 'midi': case 'paper': this.block(); return null
      case 'language': { this.ws(); if (this.peek() === '"') { this.lang = this.string(); this.names = table(this.lang) } return null }
      case 'skip': { const q = this.duration(); return { t: 'ev', kind: 'skip', pitches: [], perNote: [], dur: q, art: this.newArt() } }
      case 'transposition': case 'octaveCheck': this.pitchArg(); return null
      case 'shape': { this.ws(); if (this.peek() === '#') this.scheme(); this.ws(); this.ident(); return null }
      case 'accidentalStyle': { this.ws(); if (this.peek() === '"') this.string(); else this.atom(); return null }
      case 'barNumberCheck': case 'pointAndClickOff': { this.ws(); if (this.peek() === '#') this.scheme(); return null }
      case 'void': this.music(); return null
      case 'breve': case 'longa': case 'maxima': return null
      default: {
        if (SKIP_MODE.has(name)) { this.ws(); if (this.peek() === '{') this.block(); else this.music(); return null }
        const v = this.vars.get(name)
        if (v && typeof v === 'object' && v.t) return structuredClone(v)
        return null
      }
    }
  }

  // ── top level ──
  top() { while (!this.eof()) { this.ws(); if (this.eof()) break; this.topStep() } }
  topStep() {
      const c = this.peek()
      if (c === '\\') {
        const st = this.i
        this.i++
        const name = this.ident()
        if (name === 'score') { this.scores.push(this.score()); return }
        if (name === 'book' || name === 'bookpart') { this.book(); return }
        if (name === 'header') { Object.assign(this.header, this.headerBlock()); return }
        if (name === 'paper' || name === 'layout' || name === 'midi') { this.block(); return }
        if (name === 'markup' || name === 'markuplist') { this.markup(); return }
        this.i = st
        const m = this.music()
        if (m && m.t !== 'ev') this.scores.push({ music: m, header: {}, midi: false, implicit: true })
        return
      }
      if (/[A-Za-z]/.test(c)) {
        const st = this.i
        const name = this.ident()
        this.ws()
        if (this.peek() === '=' && this.peek(1) !== '=') {
          this.i++
          const v = this.value()
          if (v != null) this.vars.set(name, v)
          return
        }
        this.i = st
      }
      if (c === '#' || c === '$') { this.scheme(); return }
      if (c === '"') { this.string(); return }
      if (c === '{' || c === '<' || /[A-Za-z]/.test(c)) {
        const m = this.music()
        if (m) this.scores.push({ music: m, header: {}, midi: false, implicit: true })
        return
      }
      this.i++
  }
  book(outer = {}) {
    this.ws(); if (this.peek() !== '{') return
    this.i++
    // a book's or bookpart's \header belongs to its scores
    const hd = { ...outer }, first = this.scores.length
    const done = () => { for (const sc of this.scores.slice(first)) sc.header = { ...hd, ...sc.bookHeader, ...sc.header } }
    while (!this.eof()) {
      this.ws()
      if (this.peek() === '}') { this.i++; done(); return }
      if (this.peek() === '\\') {
        const st = this.i
        this.i++
        const name = this.ident()
        if (name === 'score') { this.scores.push(this.score()); continue }
        if (name === 'bookpart') { this.book(hd); continue }
        if (name === 'header') { Object.assign(hd, this.headerBlock()); continue }
        if (name === 'paper' || name === 'layout' || name === 'midi') { this.block(); continue }
        if (name === 'markup' || name === 'markuplist') { this.markup(); continue }
        this.i = st
      }
      if (this.peek() === '#' || this.peek() === '$') { this.scheme(); continue }
      const m = this.music()
      if (m && m.t !== 'ev') this.scores.push({ music: m, header: {}, midi: false, implicit: true })
    }
  }
  score() {
    const sc = { music: null, header: {}, midi: false, layout: false, midiTempo: null }
    this.ws(); if (this.peek() !== '{') return sc
    this.i++
    const musics = []
    while (!this.eof()) {
      this.ws()
      if (this.peek() === '}') { this.i++; break }
      if (this.peek() === '\\') {
        const st = this.i
        this.i++
        const name = this.ident()
        if (name === 'header') { Object.assign(sc.header, this.headerBlock()); continue }
        if (name === 'layout' || name === 'paper') { this.block(); sc.layout = true; continue }
        if (name === 'midi') {
          sc.midi = true
          const b = this.block()
          // the MIDI tempo: \tempo 4 = 72 (old) or tempoWholesPerMinute = #(ly:make-moment 72 4)
          const t = /\\tempo\s+(\d+)(\.*)\s*=\s*(\d+)/.exec(b), w = /tempoWholesPerMinute\s*=\s*#\(ly:make-moment\s+(\d+)(?:\s*\/\s*|\s+)(\d+)/.exec(b)
          if (t) sc.midiTempo = +t[3] * (4 / +t[1]) * (2 - Math.pow(0.5, t[2].length))
          else if (w) sc.midiTempo = 4 * +w[1] / +w[2]
          continue
        }
        this.i = st
      }
      if (this.peek() === '#' || this.peek() === '$') { this.scheme(); continue }
      const m = this.music()
      if (m) musics.push(m)
    }
    sc.music = musics.length === 1 ? musics[0] : { t: 'sim', items: musics }
    return sc
  }
}

// ── \relative: octaves, in LilyPond's order ──────────────────────────────────
// a pitch's diatonic index: c (C3) = 0, c' = 7; midi = 48 + 12·octave + semitones
const absIdx = p => p.step + 7 * p.marks
function resolve(p, mode, ref) {
  let idx
  if (p.check != null) idx = p.step + 7 * p.check
  else if (mode === 'rel') idx = p.step + 7 * Math.round((ref - p.step) / 7) + 7 * p.marks
  else if (mode === 'fixed') idx = 7 * Math.floor(ref / 7) + p.step + 7 * p.marks
  else idx = absIdx(p)
  const oct = Math.floor(idx / 7), st = ((idx % 7) + 7) % 7
  p.midi = 48 + 12 * oct + SEMI[st] + p.alter
  return idx
}
// returns the reference after node (mode 'abs' | 'rel' | 'fixed')
function toRelative(n, mode, ref) {
  if (!n) return ref
  switch (n.t) {
    case 'ev': {
      if (!n.pitches.length) return ref
      // a chord: each note from the one before, the first one is the new reference
      let r = ref, first = null
      for (const p of n.pitches) { r = resolve(p, mode, r); if (first == null) first = r }
      return mode === 'rel' ? first : ref
    }
    case 'rel': toRelative(n.music, 'rel', n.ref ? absIdx(n.ref) : 3); return ref
    case 'abs': toRelative(n.music, 'abs', ref); return ref
    case 'fixed': toRelative(n.music, 'fixed', n.ref ? absIdx(n.ref) : 7); return ref
    case 'seq': case 'sim': { let r = ref; for (const m of n.items) r = toRelative(m, mode, r); return r }
    case 'rep': { let r = toRelative(n.body, mode, ref); for (const a of n.alts) r = toRelative(a, mode, r); return r }
    case 'tr': {
      for (const p of [n.from, n.to]) if (p) resolve(p, 'abs', 0)
      return toRelative(n.music, mode, ref)
    }
    case 'scale': case 'grace': case 'ctx': case 'unfold': return toRelative(n.music, mode, ref)
    default: return ref
  }
}

// ── timing: music → staves of events ─────────────────────────────────────────
const GRACE_K = 1e-4
function perform(score, { graces = false } = {}) {
  const staves = [], tempo = [], meter = []
  let partial = null, voiceSeq = 0
  const repeats = []
  const staffById = new Map(), voiceStaff = new Map()
  const newStaff = (id, mods = {}, group = null) => {
    const s = { id, name: mods.instrumentName || null, midi: mods.midiInstrument || null, group, events: [], dyn: [], hp: [], progs: [] }
    staves.push(s); if (id != null) staffById.set(id, s)
    return s
  }
  const voices = new Map()              // voice key → { open slur, ties, gliss }
  let slurSeq = 0
  const voiceState = k => { if (!voices.has(k)) voices.set(k, { slur: null, ties: new Map(), gliss: false }); return voices.get(k) }
  const EPS = 1e-6
  const lastChordOf = new Map()

  function emit(ev, cx) {
    const dur = ev.dur * cx.scale
    if (cx.mute) return cx.t + dur
    let staff = cx.staff
    if (!staff) { staff = cx.top.implicit ??= newStaff(null, {}, cx.group); }
    // dynamics and hairpins count on rests and spacers too (r\p, s1\<)
    if (ev.art?.dyn != null) staff.dyn.push([cx.t, ev.art.dyn])
    for (const h of ev.art?.hp || []) staff.hp.push([cx.t, h])
    if (ev.kind === 'rest' || ev.kind === 'skip') return cx.t + dur
    const vk = (staves.indexOf(staff)) + ':' + cx.voice
    const vs = voiceState(vk)
    const art = ev.art
    // slurs on the voice: ( starts one on this note, ) ends the open one here
    let slur = null
    if (art.slurEnd) { slur = vs.slur; vs.slur = null }
    if (art.slurStart) { slur = ++slurSeq; vs.slur = slur }
    if (slur == null) slur = vs.slur
    const port = vs.gliss
    vs.gliss = art.gliss
    const src = ev.ref ?? ev
    const pitches = ev.ref ? (ev.ref.pitches || []) : ev.pitches
    const bow = art.techs.includes('up-bow') ? 'up' : art.techs.includes('down-bow') ? 'down' : null
    pitches.forEach((p, k) => {
      if (p.midi == null) return
      const pitch = Math.round(p.midi + cx.transpose)
      const own = (src === ev ? ev.perNote[k] : null)
      const arts = own ? [...art.arts, ...own.arts] : art.arts
      const orns = own ? [...art.orns, ...(own.orns || [])] : art.orns
      const tie = art.tie || own?.tie
      const prev = vs.ties.get(pitch)
      if (prev && Math.abs(prev.end - cx.t) < EPS) {
        prev.end = cx.t + dur
        if (!tie) vs.ties.delete(pitch)
        return
      }
      const e = { pitch, start: cx.t, end: cx.t + dur, voice: cx.voiceNo, accent: accentGain(arts),
        art: { slur, stroke: strokeOf(arts), bow, source: 'score', vk: vk, ...(port ? { port: true } : {}), ...(orns.length ? { orn: orns } : {}),
          ...(cx.grace ? { grace: cx.grace.kind, graceAt: cx.grace.at, graceDur: dur / GRACE_K } : {}) } }
      staff.events.push(e)
      if (tie) vs.ties.set(pitch, e); else vs.ties.delete(pitch)
    })
    lastChordOf.set(vk, src)
    return cx.t + dur
  }

  function run(n, cx) {
    if (!n) return cx.t
    switch (n.t) {
      case 'ev': return emit(n, cx)
      case 'seq': { let t = cx.t; for (const m of n.items) t = run(m, { ...cx, t }); return t }
      case 'sim': {
        let end = cx.t
        n.items.forEach((m, k) => {
          const v = n.voices ? { voice: cx.voice + '/' + (k + 1), voiceNo: k + 1 } : { voice: cx.voice + '|' + k }
          end = Math.max(end, run(m, { ...cx, ...v }))
        })
        return end
      }
      case 'scale': return run(n.music, { ...cx, scale: cx.scale * n.k })
      // grace notes take no time; with { graces: true } they are kept, squeezed (GRACE_K) at the main note
      case 'grace': if (graces && !cx.grace) run(n.music, { ...cx, scale: cx.scale * GRACE_K, grace: { kind: n.kind, at: cx.t } }); return cx.t
      case 'rel': case 'abs': case 'fixed': return run(n.music, cx)
      case 'tr': {
        const d = n.from && n.to && n.from.midi != null && n.to.midi != null ? n.to.midi - n.from.midi : 0
        return run(n.music, { ...cx, transpose: cx.transpose + d })
      }
      case 'unfold': return run(n.music, { ...cx, unfold: true })
      case 'rep': {
        const all = n.kind !== 'volta' || cx.unfold
        let t = cx.t
        if (!all) {
          // as printed: the body once, then each alternative once (LilyPond's MIDI without \unfoldRepeats)
          // where it repeats is kept (repeats), so a performance that takes the repeat can be aligned
          const t0 = t
          t = run(n.body, { ...cx, t })
          const body = t, alts = []
          for (const a of n.alts) { const a0 = t; t = run(a, { ...cx, t }); alts.push([a0, t]) }
          if (!repeats.some(r => Math.abs(r.from - t0) < 1e-6)) repeats.push({ from: t0, to: body, alts, times: Math.max(2, Math.round(n.n)) })
          return t
        }
        const N = Math.max(1, Math.round(n.n)), A = n.alts.length, t0 = t, keep = []
        for (let i = 0; i < N; i++) {
          const b0 = t
          t = run(n.body, { ...cx, t })
          if (i === 0) keep.push([b0, t])
          const a0 = t
          if (A) t = run(n.alts[Math.max(0, i - (N - A))], { ...cx, t })
          if (i === N - 1 && A) keep.push([a0, t])
        }
        // a volta written out (\unfoldRepeats, as Mutopia's MIDI is): kept too, with what
        // is played when the repeat is not taken (the body once, then the last alternative)
        if (n.kind === 'volta' && N > 1 && !repeats.some(r => Math.abs(r.from - t0) < 1e-6)) repeats.push({ from: t0, to: t, unfolded: true, keep, times: N })
        return t
      }
      case 'ctx': {
        const { type } = n
        if (STAFF.has(type)) {
          let s = !n.isNew && n.id != null ? staffById.get(n.id) : null
          if (!s && !n.isNew && cx.staff && (n.id == null || cx.staff.id === n.id)) s = cx.staff
          if (!s) s = newStaff(n.id, n.mods, cx.group)
          else if (n.mods.instrumentName) s.name = n.mods.instrumentName
          return run(n.music, { ...cx, staff: s, voice: 'v' + (++voiceSeq), voiceNo: 1 })
        }
        if (VOICE.has(type)) {
          // a voice outside any staff gets one of its own (LilyPond creates it), named from the voice
          let staff = cx.staff
          const key = n.id != null ? 'id:' + n.id : null
          if (!staff) {
            staff = (key && voiceStaff.get(key)) || newStaff(n.id, n.mods, cx.group)
            if (key) voiceStaff.set(key, staff)
          }
          return run(n.music, { ...cx, staff, voice: key ?? 'v' + (++voiceSeq) })
        }
        if (LYRIC.has(type)) return run(n.music, { ...cx, mute: true })
        // groups (PianoStaff, StaffGroup …) and Score: their name is the staves' group
        return run(n.music, { ...cx, group: n.mods.instrumentName || (/Piano|Grand/.test(type) ? 'Piano' : cx.group) })
      }
      case 'time': meter.push([cx.t, n.beats, n.type]); return cx.t
      case 'partial': if (partial == null) partial = { t: cx.t, q: n.q * cx.scale }; return cx.t
      case 'tempo': tempo.push([cx.t, n.bpm]); return cx.t
      // the first name a staff is given (later ones are changes along the way)
      case 'name': if (cx.staff) cx.staff.name ??= n.name; else cx.top.pendingName ??= n.name; return cx.t
      case 'midi': if (cx.staff) { cx.staff.progs.push([cx.t, n.name]); cx.staff.midi ??= n.name } return cx.t
      default: return cx.t
    }
  }
  const top = {}
  const end = run(score.music, { t: 0, scale: 1, staff: null, voice: 'v0', voiceNo: 1, transpose: 0, unfold: false, group: null, top, mute: false })
  if (top.implicit && top.pendingName && !top.implicit.name) top.implicit.name = top.pendingName
  return { staves, tempo, meter, partial, end, repeats: repeats.sort((a, b) => a.from - b.from) }
}

// bars from the time signatures and an upbeat → measure numbers and starts
function bars(meter, partial, end) {
  const ms = meter.slice().sort((a, b) => a[0] - b[0])
  const at = t => { let m = [0, 4, 4]; for (const x of ms) if (x[0] <= t + 1e-6) m = x; return m }
  const len = m => 4 * m[1] / m[2]
  const starts = []
  let s = 0, k = 1
  if (partial && partial.t < 1e-6 && partial.q > 1e-6 && partial.q < len(at(0)) - 1e-6) { starts.push([partial.q - len(at(0)), 0, at(0)]); s = partial.q }
  for (let guard = 0; s < end + 1e-6 && guard < 100000; guard++) {
    const m = at(s)
    starts.push([s, k++, m])
    let next = s + len(m)
    // a time signature in the middle of a bar starts a new one there
    const mid = ms.find(x => x[0] > s + 1e-6 && x[0] < next - 1e-6)
    if (mid) next = mid[0]
    s = next
  }
  return starts
}

// ── the reader ───────────────────────────────────────────────────────────────
export function readLilyPond(text, { part = null, include = null, file = '', tempo: tempoDefault = 60, graces = false, allParts = false } = {}) {
  const missing = []
  const src = expandIncludes(text, file, include, 0, missing)
  const P = new Parser(src)
  P.top()
  // a MIDI-only score usually follows its layout twin, which has the header
  P.scores.forEach((sc, k) => { const prev = P.scores[k - 1]; if (sc.midi && !sc.layout && !sc.header.piece && prev && !prev.midi && prev.header.piece) sc.header = { ...prev.header, ...sc.header } })
  // the scores LilyPond writes as MIDI, else all of them
  let scores = P.scores.filter(s => s.music)
  const midi = scores.filter(s => s.midi)
  if (midi.length) scores = midi
  const need = missing.length ? ` (it includes ${missing.slice(0, 3).join(', ')}${missing.length > 3 ? '…' : ''}: open the whole set, e.g. Mutopia's -lys.zip, or drop all the .ly files together)` : ''
  if (!scores.length) throw new Error('no music in the LilyPond file' + need)
  const many = scores.length > 1
  // parts: every staff with notes in every chosen score
  const parts = [], runs = []
  // a movement's name: its piece, else its subtitle when the movements' subtitles differ
  const subs = new Set(scores.map(sc => ({ ...P.header, ...sc.header }).subtitle))
  const movement = (hd, si) => hd.piece || (subs.size > 1 && hd.subtitle) || `Movement ${si + 1}`
  scores.forEach((sc, si) => {
    toRelative(sc.music, 'abs', 0)
    const r = perform(sc, { graces })
    runs.push(r)
    const hd = { ...P.header, ...sc.header }
    r.staves.forEach((st, k) => {
      if (!st.events.length) return
      let name = (st.name || '').replace(/\s+/g, ' ').trim() || (st.midi ? st.midi.replace(/^./, c => c.toUpperCase()) : '')
      // a staff known only by its id or its place: in a piano group, "Piano (upper)"
      if (!name) name = st.group ? `${st.group} (${st.id || r.staves.filter(x => x.group === st.group).indexOf(st) + 1})` : st.id || `Staff ${k + 1}`
      const label = many ? `${movement(hd, si)}: ${name}` : name
      parts.push({ id: `${si}:${k}`, name: label, si, k, header: hd, plain: name, midi: st.midi })
    })
  })
  if (!parts.length) throw new Error('no notes in the LilyPond file' + need)
  // the default part: a solo violin, else a violin, else the first
  const nm = p => p.plain + ' ' + (p.midi || '')
  const fit = p => /viola|cello|violoncell|bass|alto|piano|klavier|cembalo|organ/i.test(nm(p)) ? 0 : (/violin|violino|violine|violon|\bvl\.?\b/i.test(nm(p)) ? 1 : 0) + (/solo|principal/i.test(nm(p)) ? 2 : 0)
  let pi = typeof part === 'number' ? part : part != null ? parts.findIndex(p => p.id === part) : -1
  if (pi < 0 || pi >= parts.length) pi = parts.reduce((b, p, k) => fit(p) > fit(parts[b]) ? k : b, 0)
  const pk = parts[pi], r = runs[pk.si], sc = scores[pk.si], st = r.staves[pk.k]

  // tempo: the score's marks, else its \midi tempo, else LilyPond's 60
  const tempoMap = r.tempo.slice()
  if (!tempoMap.some(t => t[0] < 1e-6)) tempoMap.unshift([0, sc.midiTempo ?? tempoMap[0]?.[1] ?? tempoDefault])
  const B = bars(r.meter, r.partial, r.end)
  const meterMap = []
  for (const [s, k, m] of B) { const last = meterMap[meterMap.length - 1]; if (!last || last[1] !== m[1] || last[2] !== m[2]) meterMap.push([Math.max(0, s), m[1], m[2], k]) }
  const barAt = t => { let lo = 0, hi = B.length - 1; while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (B[mid][0] <= t + 1e-6) lo = mid; else hi = mid - 1 } return B[lo] }
  const events = partEvents(st, barAt)
  const hd = pk.header
  const piece = hd.piece || (subs.size > 1 ? hd.subtitle : '')
  const title = [hd.title || hd.mutopiatitle || (subs.size > 1 ? '' : hd.subtitle) || '', piece && piece !== hd.title ? piece : ''].filter(Boolean).join(': ').replace(/\s+/g, ' ').trim()
  // repeats as printed (quarters): { from, to (end of the body), alts: [[q0, q1]…], times };
  // written out (unfolded: true): { from, to (end of the last pass), keep: [[q0, q1]…] (not taken), times }
  const out = { ...finishScore(events, tempoMap, meterMap, tempoDefault, title, parts.map(p => ({ id: p.id, name: p.name }))), part: pi, missing, repeats: r.repeats }
  // { allParts: true }: every other staff of the same movement too, on the same timing
  // (an accompaniment), each { id, name, midi (LilyPond's midiInstrument), notes }
  if (allParts) out.others = parts.filter(p => p.si === pk.si && p !== pk).map(p => ({ id: p.id, name: p.name, midi: p.midi, notes: finishScore(partEvents(r.staves[p.k], barAt), tempoMap, meterMap, tempoDefault, '', []).notes }))
  return out
}

// A staff's events with their loudness: the latest dynamic at or before each note, moving
// along a hairpin (\< \> \cresc …) to the dynamic that ends it, or a step (0.12) up or down
// when it ends without one (\!); the level reached holds until the next dynamic, as
// LilyPond's MIDI plays it.
// A \set Staff.midiInstrument inside the music (pizzicato strings for a pizz. passage) is
// kept on each note after it as e.instrument, as LilyPond's MIDI changes program there.
function partEvents(st, barAt) {
  const level = loudness(st.dyn, st.hp), progs = st.progs.slice().sort((a, b) => a[0] - b[0])
  return st.events.map(e => {
    const b = barAt(e.start)
    const { accent, ...rest } = e
    let instrument = st.midi; for (const [t, nm] of progs) { if (t > e.start + 1e-6) break; instrument = nm }
    return { ...rest, velocity: Math.min(1, level(e.start) * accent), measure: b[1], mStart: b[0], ...(progs.length > 1 || (progs.length && instrument !== st.midi) ? { instrument } : {}) }
  }).sort((a, b) => a.start - b.start || a.pitch - b.pitch)
}
const HP_STEP = 0.12
export function loudness(dyn, hp = []) {
  const D = dyn.slice().sort((a, b) => a[0] - b[0]), H = hp.slice().sort((a, b) => a[0] - b[0])
  // segments [t0, t1, v0, v1] in time order: steps at dynamics, ramps along hairpins
  const segs = []
  let v = D.length && D[0][0] < 1e-6 ? D[0][1] : 0.7, t = 0
  const ev = [...D.map(([t, d]) => ({ t, d })), ...H.map(([t, h]) => ({ t, h }))].sort((a, b) => a.t - b.t || (a.d != null ? -1 : 1))
  for (let i = 0; i < ev.length; i++) {
    const e = ev[i]
    if (e.d != null) { segs.push([t, e.t, v, v]); v = e.d; t = e.t; continue }
    if (e.h === 'end') continue
    // a hairpin: it ends at the next \!, dynamic or hairpin after it
    const end = ev.slice(i + 1).find(x => x.t > e.t + 1e-6) || null
    if (!end) { segs.push([t, e.t, v, v]); const to = clamp01(v + (e.h === 'cresc' ? HP_STEP : -HP_STEP)); segs.push([e.t, e.t + 4, v, to]); v = to; t = e.t + 4; continue }
    // the target: the dynamic that ends it, or one just after its \! (within a quarter)
    const dyn = end.d != null ? end : end.h === 'end' ? ev.slice(i + 1).find(x => x.d != null && x.t >= end.t - 1e-6 && x.t <= end.t + 1 + 1e-6) : null
    let to = dyn ? dyn.d : clamp01(v + (e.h === 'cresc' ? HP_STEP : -HP_STEP))
    // (a "crescendo" to a softer dynamic is a misplaced mark: a step the written way)
    if ((e.h === 'cresc') !== (to > v)) to = clamp01(v + (e.h === 'cresc' ? HP_STEP : -HP_STEP))
    segs.push([t, e.t, v, v]); segs.push([e.t, end.t, v, to]); v = to; t = end.t
  }
  segs.push([t, Infinity, v, v])
  return q => {
    let lo = 0, hi = segs.length - 1
    while (lo < hi) { const m = (lo + hi + 1) >> 1; if (segs[m][0] <= q + 1e-6) lo = m; else hi = m - 1 }
    const [a, b, v0, v1] = segs[lo]
    return b === Infinity || b <= a ? v0 : v0 + (v1 - v0) * Math.min(1, Math.max(0, (q - a) / (b - a)))
  }
}
const clamp01 = x => Math.max(0.1, Math.min(1, x))

/**
 * The main file of a set of .ly files (a Mutopia -lys.zip): one with a \score
 * or \book, preferring a full score ("score" in its name), then the one that
 * includes the most others.
 */
export function mainLyFile(files) {
  const names = [...files.keys()].filter(n => /\.(ly|ily|lyi)$/i.test(n))
  const strip = t => t.replace(/%\{[\s\S]*?%\}|%[^\n]*/g, '')
  const cands = names.filter(n => /\\(score|book|bookpart)\b/.test(strip(files.get(n))))
  const pool = cands.length ? cands : names
  // .ily files are include files by convention; the main file sits highest in the folders
  const rank = n => (/\.ly$/i.test(n) ? 1000 : 0) + (/score|full|partitur/i.test(n.split('/').pop()) ? 100 : 0) + Math.min(30, (strip(files.get(n)).match(/\\include/g) || []).length) - n.split('/').length * 40
  return pool.sort((a, b) => rank(b) - rank(a) || a.length - b.length)[0]
}

/** A set of files (Map name → text; a Mutopia -lys.zip unpacked) → readLilyPond of its main file. */
export function readLilyPondFiles(files, opts = {}) {
  const main = opts.main || mainLyFile(files)
  if (!main) throw new Error('no .ly file')
  const byBase = new Map([...files.keys()].map(n => [n.split('/').pop(), n]))
  const include = (path, name) => {
    if (files.has(path)) return { text: files.get(path), name: path }
    const b = byBase.get(name.split('/').pop())
    return b ? { text: files.get(b), name: b } : null
  }
  return readLilyPond(files.get(main), { ...opts, include, file: main })
}

/** For tests: the parsed scores of a file (after \include). */
export function _debug(text, { include = null, file = '' } = {}) {
  const P = new Parser(expandIncludes(text, file, include))
  P.top()
  return { scores: P.scores, vars: P.vars, header: P.header }
}
export const _expand = (t, f, inc) => expandIncludes(t, f, inc)
export const _parser = t => new Parser(t)
