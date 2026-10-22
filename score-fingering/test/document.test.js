// node --test score-fingering/test/document.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createScoreDocument, pageState, cachePage, pageFileStem, trimPageRecords } from '../document.js'
import { writePdf } from '../scoreshift/pdfsource.js'

test('document creates stable isolated page records', () => {
  const doc = createScoreDocument({ kind:'pdf', name:'Quartet No. 1.pdf', pageCount:3 })
  const a = pageState(doc, 1), again = pageState(doc, 1), b = pageState(doc, 2)
  assert.equal(a, again)
  assert.notEqual(a, b)
  assert.equal(doc.page, 1)
  assert.deepEqual([a.index, a.status, a.part, a.suggestion, a.keyboardIndex], [1, 'empty', 0, 0, 0])
  a.locks.set('note-a', 2); a.corrections.set('note-a', { p:7 }); a.part = 1; a.suggestion = 3
  assert.equal(b.locks.size, 0); assert.equal(b.corrections.size, 0); assert.equal(b.part, 0); assert.equal(b.suggestion, 0)
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

test('bounded resident cache evicts old raster payloads but preserves compact page edits', () => {
  const doc = createScoreDocument({ kind:'pdf', name:'long.pdf', pageCount:10 })
  for (let index = 1; index <= 10; index++) {
    const state = cachePage(doc, index, { status:'ready', image:{ index }, model:{ index }, renderer:{ index }, lastUsed:index })
    state.locks.set(`n${index}`, index % 4); state.corrections.set(`n${index}`, { p:index }); state.suggestion = index % 3
  }
  const released = []
  const evicted = trimPageRecords(doc, 10, 2, state => released.push(state.index))
  assert.deepEqual(evicted, [1, 2, 3, 4, 5, 6, 7, 8])
  assert.deepEqual(released, evicted)
  assert.equal([...doc.pages.values()].filter(state => state.status !== 'empty').length, 2)
  const old = pageState(doc, 1)
  assert.equal(old.model, null); assert.equal(old.image, null)
  assert.equal(old.locks.get('n1'), 1); assert.deepEqual(old.corrections.get('n1'), { p:1 }); assert.equal(old.suggestion, 1)
})
