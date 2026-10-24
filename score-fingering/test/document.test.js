// node --test score-fingering/test/document.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createScoreDocument, pageState, cachePage, pageFileStem, trimPageRecords, precedingPageFifths, invalidatePageKeyEvidence } from '../document.js'
import { needsPriorKey, applyPriorKey } from '../../../random-sketches/vibes/scoreshift/omr.js'
import { writePdf } from '../../../random-sketches/vibes/scoreshift/pdfsource.js'

test('document creates stable isolated page records', () => {
  const doc = createScoreDocument({ kind:'pdf', name:'Quartet No. 1.pdf', pageCount:3 })
  const a = pageState(doc, 1), again = pageState(doc, 1), b = pageState(doc, 2)
  assert.equal(a, again)
  assert.notEqual(a, b)
  assert.equal(doc.page, 1)
  assert.ok(doc.autoInstruments instanceof Map)
  assert.ok(a.autoInstruments instanceof Map)
  assert.ok(a.fifthsByPart instanceof Map); assert.equal(a.recognizedFifths, null)
  assert.deepEqual([a.index, a.status, a.part, a.suggestion, a.keyboardIndex], [1, 'empty', 0, 0, 0])
  a.locks.set('note-a', 2); a.corrections.set('note-a', { p:7 }); a.part = 1; a.suggestion = 3
  a.autoInstruments.set(0, { instrument:'violin', reason:'treble' }); a.autoInstruments.set(1, { instrument:'viola', reason:'alto-clef' }); a.fifthsByPart.set(0, 2)
  assert.equal(b.locks.size, 0); assert.equal(b.corrections.size, 0); assert.equal(b.part, 0); assert.equal(b.suggestion, 0); assert.equal(b.autoInstruments.size, 0); assert.equal(b.fifthsByPart.size, 0)
  assert.throws(() => pageState(doc, 0), /page 0/)
  assert.throws(() => pageState(doc, 4), /page 4/)
})

test('cachePage retains per-page analysis and source metadata without replacing state', () => {
  const doc = createScoreDocument({ kind:'pdf', name:'score.pdf', pageCount:2 })
  const state = pageState(doc, 2), model = { notes:[1] }, image = { width:100 }, renderer = { W:100 }, score = { parts:[1] }
  const cached = cachePage(doc, 2, { status:'ready', model, image, renderer, score, widthPt:612, heightPt:792 })
  assert.equal(cached, state)
  assert.equal(cached.model, model); assert.equal(cached.image, image); assert.equal(cached.renderer, renderer); assert.equal(cached.score, score)
  assert.deepEqual([cached.widthPt, cached.heightPt], [612, 792])
  cachePage(doc, 1, { status:'nonmusic', image:{ width:80 }, widthPt:612, heightPt:792 })
  assert.equal(pageState(doc, 1).status, 'nonmusic')
  assert.equal(pageState(doc, 2).status, 'ready')
})

test('key carry never skips an unresolved intermediate page', () => {
  const doc = createScoreDocument({ kind:'pdf', name:'keys.pdf', pageCount:3 })
  pageState(doc, 1).fifthsByPart.set(0, 2)
  assert.equal(precedingPageFifths(doc, 2), 2)
  assert.equal(precedingPageFifths(doc, 3), null)
  const page2 = pageState(doc, 2)
  page2.fifthsByPart.set(0, 2); page2.recognizedFifths = 2
  assert.equal(precedingPageFifths(doc, 3), 2)
  page2.fifthsByPart.set(0, 0)
  assert.equal(precedingPageFifths(doc, 3), 0)
  page2.fifthsByPart.set(1, -1)
  assert.equal(precedingPageFifths(doc, 3), null)
})

test('key carry rejects a cached descendant of a stale predecessor', () => {
  const doc = createScoreDocument({ kind:'pdf', name:'keys.pdf', pageCount:4 })
  const page1 = pageState(doc, 1), page2 = pageState(doc, 2), page3 = pageState(doc, 3), page4 = pageState(doc, 4)
  page1.fifthsByPart.set(0, 2)
  page3.fifthsByPart.set(0, 0); page3.recognizedFifths = null
  page4.fifthsByPart.set(0, 0); page4.recognizedFifths = 0
  assert.equal(precedingPageFifths(doc, 4), 0, 'the descendant is initially valid while page 2 is unresolved')

  page2.fifthsByPart.set(0, 2); page2.recognizedFifths = 2

  assert.equal(precedingPageFifths(doc, 4), null, 'page 3 must be refreshed before its key can feed page 4')
})

test('key-evidence invalidation preserves display payload but blocks stale carry', () => {
  const doc = createScoreDocument({ kind:'pdf', name:'keys.pdf', pageCount:3 })
  const state = pageState(doc, 2), model = { notes:[1] }, image = { width:100 }
  Object.assign(state, { status:'ready', model, image, recognizedFifths:null })
  state.fifthsByPart.set(0, 0)
  assert.equal(precedingPageFifths(doc, 3), 0)

  invalidatePageKeyEvidence(state)

  assert.equal(precedingPageFifths(doc, 3), null)
  assert.equal(state.recognizedFifths, undefined)
  assert.equal(state.status, 'ready')
  assert.equal(state.model, model)
  assert.equal(state.image, image)
})

// The prior-page key step lives in ScoreShift (omr.js needsPriorKey / applyPriorKey / analyzeAfter,
// with raster fixtures in its own suite); these pin the behaviour #046 relies on.
test('preceding-page keys fill only staves without conflicting printed evidence', () => {
  const staff = key => ({ key, clef:{ type:'alto' }, notes:[] })
  const detected = staff({ fifths:2, detected:2, glyphs:[{}, {}] })
  const missing = staff({ fifths:0, detected:0, glyphs:[] })
  assert.equal(applyPriorKey([missing, detected], 2), 1)
  assert.equal(missing.key.fifths, 2); assert.equal(missing.key.documentInferred, true)

  const conflicting = staff({ fifths:1, detected:1, glyphs:[{}] }), untouched = staff({ fifths:0, detected:0, glyphs:[] })
  assert.equal(applyPriorKey([conflicting, untouched], 2), 0)
  assert.equal(untouched.key.fifths, 0)
  const cancellation = staff({ fifths:0, detected:0, cancellation:true, glyphs:[{ type:0 }] })
  assert.equal(applyPriorKey([cancellation, untouched], 2), 0)
  const replacement = staff({ fifths:1, detected:1, cancellation:false, glyphs:[{ type:0 }, { type:1 }] })
  assert.equal(applyPriorKey([replacement, untouched], 2), 0)
  assert.equal(untouched.key.fifths, 0)
})

test('authoritative keyless sections survive prior-page recognition and carry', () => {
  const staff = key => ({ key, clef:{ type:'alto' }, notes:[] })
  const missing = staff({ fifths:0, detected:0, glyphs:[] })
  const keyless = staff({ fifths:0, detected:0, glyphs:[], keylessSection:true })
  const printed = staff({ fifths:2, detected:2, glyphs:[{}, {}] })
  const cancellation = staff({ fifths:0, detected:0, cancellation:true, glyphs:[{ type:0 }] })

  assert.equal(needsPriorKey([keyless], 2), false)
  assert.equal(needsPriorKey([missing, keyless, printed], 2), true)
  assert.equal(needsPriorKey([missing, cancellation], 2), false)

  assert.equal(applyPriorKey([missing, keyless], 2), 1)
  assert.equal(missing.key.fifths, 2)
  assert.equal(keyless.key.fifths, 0)
})

test('page-aware filenames are stable for images and PDFs', () => {
  const image = createScoreDocument({ kind:'image', name:'practice photo.jpg', pageCount:1 })
  const pdf = createScoreDocument({ kind:'pdf', name:'Bach Partita.pdf', pageCount:12 })
  assert.equal(pageFileStem(image, 1), 'practice photo')
  assert.equal(pageFileStem(pdf, 2), 'Bach Partita-p02')
  assert.equal(pageFileStem(pdf, 12), 'Bach Partita-p12')
})

test('minimal PDF writer preserves page count, order, and MediaBox sizes', () => {
  const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xd9])
  const bytes = writePdf([
    { jpeg, w:10, h:10, widthPt:612, heightPt:792 },
    { jpeg, w:20, h:10, widthPt:842, heightPt:595 },
  ])
  const text = new TextDecoder('latin1').decode(bytes)
  assert.ok(text.startsWith('%PDF-1.4'))
  assert.match(text, /\/Count 2/)
  assert.ok(text.indexOf('/MediaBox [0 0 612 792]') < text.indexOf('/MediaBox [0 0 842 595]'))
})

test('page CSS uses the contrast-checked text and keyboard focus colors', () => {
  const html = fs.readFileSync(new URL('../../046_score_fingering.html', import.meta.url), 'utf8')
  const muted = html.match(/--muted:#([0-9a-f]{6})/i)?.[1], paper = html.match(/--paper:#([0-9a-f]{6})/i)?.[1]
  const focus = html.match(/#overlay:focus-visible[^\{]*\{[^}]*outline:3px solid #([0-9a-f]{3,6})[^}]*box-shadow:[^#]*#([0-9a-f]{6})/i)
  assert.ok(muted && paper && focus, 'expected CSS variables and visible canvas focus rule')
  const expand = hex => hex.length === 3 ? [...hex].map(char => char + char).join('') : hex
  const rgb = hex => expand(hex).match(/[0-9a-f]{2}/gi).map(v => parseInt(v, 16) / 255)
  const lum = hex => rgb(hex).map(v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4).reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0)
  const contrast = (a, b) => (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05)
  assert.ok(contrast(muted, paper) >= 4.5)
  assert.ok(contrast(focus[1], 'fffdf8') >= 3)
  assert.ok(contrast(focus[2], '172033') >= 3)
})

test('string and position detail badges have an unchecked opt-in control', () => {
  const html = fs.readFileSync(new URL('../../046_score_fingering.html', import.meta.url), 'utf8')
  const control = html.match(/<input id="details" type="checkbox"([^>]*)>/i)
  assert.ok(control, 'expected a string/position details checkbox')
  assert.doesNotMatch(control[1], /\bchecked\b/i, 'details must be hidden by default')
  assert.match(html, /string \/ position details/i)
})

test('bounded resident cache evicts old raster payloads but preserves compact page edits', () => {
  const doc = createScoreDocument({ kind:'pdf', name:'long.pdf', pageCount:10 })
  for (let index = 1; index <= 10; index++) {
    const state = cachePage(doc, index, { status:'ready', image:{ index }, model:{ index }, renderer:{ index }, lastUsed:index })
    state.locks.set(`n${index}`, index % 4); state.corrections.set(`n${index}`, { p:index }); state.suggestion = index % 3
    state.autoInstruments.set(0, { instrument:index % 2 ? 'viola' : 'violin', reason:'test' }); state.fifthsByPart.set(0, index % 3)
  }
  const released = []
  const evicted = trimPageRecords(doc, 10, 2, state => released.push(state.index))
  assert.deepEqual(evicted, [1, 2, 3, 4, 5, 6, 7, 8])
  assert.deepEqual(released, evicted)
  assert.equal([...doc.pages.values()].filter(state => state.status !== 'empty').length, 2)
  const old = pageState(doc, 1)
  assert.equal(old.model, null); assert.equal(old.image, null)
  assert.equal(old.locks.get('n1'), 1); assert.deepEqual(old.corrections.get('n1'), { p:1 }); assert.equal(old.suggestion, 1)
  assert.deepEqual(old.autoInstruments.get(0), { instrument:'viola', reason:'test' })
  assert.equal(old.fifthsByPart.get(0), 1)
})
