// Browser smoke for #046. Uses the existing local Playwright/Chromium installation.
// node score-fingering/test/browser.mjs
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { fileURLToPath } from 'node:url'

// Serves the folder that holds both checkouts (midiviz and random-sketches), as GitHub Pages does.
const root = path.resolve(fileURLToPath(new URL('../../..', import.meta.url)))
const site = path.basename(path.resolve(fileURLToPath(new URL('../..', import.meta.url))))
const mime = { '.html':'text/html', '.js':'text/javascript', '.mjs':'text/javascript', '.wasm':'application/wasm', '.jpg':'image/jpeg', '.png':'image/png', '.pdf':'application/pdf', '.md':'text/markdown' }
const server = http.createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname)
  if (pathname === '/favicon.ico') { response.writeHead(204).end(); return }
  const file = path.resolve(root, '.' + pathname)
  if (!(file === root || file.startsWith(root + path.sep))) { response.writeHead(403).end('forbidden'); return }
  fs.stat(file, (error, stat) => {
    const target = !error && stat.isDirectory() ? path.join(file, 'index.html') : file
    fs.readFile(target, (readError, data) => {
      if (readError) { response.writeHead(404).end('not found'); return }
      response.writeHead(200, { 'content-type':mime[path.extname(target)] || 'application/octet-stream', 'cache-control':'no-store' }); response.end(data)
    })
  })
})
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
const address = server.address()
if (address.address !== '127.0.0.1') throw new Error(`test server exposed on ${address.address}`)
const base = `http://127.0.0.1:${address.port}/${site}`

const PW = process.env.PLAYWRIGHT || [
  '/tmp/pw/node_modules/playwright-core/index.mjs',
  `${process.env.HOME}/.toolbox/tools/kirocrew/0.9.0.4/browser/cli/node_modules/playwright-core/index.mjs`,
  `${process.env.HOME}/.toolbox/tools/kirocrew/0.8.0.9/browser/cli/node_modules/playwright-core/index.mjs`,
].find(candidate => fs.existsSync(candidate))
const CHROME = process.env.CHROME || [
  `${process.env.HOME}/.cache/ms-playwright/chromium_headless_shell-1232/chrome-linux/headless_shell`,
  `${process.env.HOME}/.cache/ms-playwright/chromium-1232/chrome-linux/chrome`,
  `${process.env.HOME}/.cache/ms-playwright/chromium-1134/chrome-linux/chrome`,
].find(candidate => fs.existsSync(candidate))
const { chromium } = await import(PW)
const browser = await chromium.launch({ executablePath:CHROME, headless:true, args:['--no-sandbox'] })
const context = await browser.newContext({ acceptDownloads:true, viewport:{ width:1280, height:900 } })
const page = await context.newPage(), errors = []
page.on('pageerror', error => errors.push(error.message))
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
const checks = []
const check = (condition, message) => { checks.push([condition, message]); console.log(`${condition ? 'ok  ' : 'FAIL'} ${message}`) }

try {
const loadImageSample = target => target.evaluate(async () => {
  const blob = await (await fetch('../random-sketches/vibes/scoreshift/sample.jpg')).blob()
  return __scoreFingering.load(blob, 'sample-score.jpg')
})
  await page.goto(`${base}/046_score_fingering.html`)
  await loadImageSample(page)
  try { await page.waitForFunction(() => window.__scoreFingering?.S?.plan?.suggestions?.length >= 2, null, { timeout:30000 }) }
  catch (error) { console.error('initial state', await page.evaluate(() => ({ status:document.getElementById('status')?.textContent, busy:getComputedStyle(document.getElementById('busy')).display, hook:!!window.__scoreFingering })), errors); throw error }
  const loaded = await page.evaluate(() => {
    const { S } = __scoreFingering
    return { staves:S.model.staves.length, notes:S.model.notes.length, partNotes:S.plan.notes.length, bars:S.score.measures.length, suggestions:S.plan.suggestions.length, annotations:S.items.length, canvas:[document.getElementById('page').width, document.getElementById('page').height] }
  })
  check(loaded.staves === 4, `sample recognized 4 staves (${loaded.staves})`)
  check(loaded.notes >= 90, `sample recognized at least 90 notes (${loaded.notes})`)
  check(loaded.bars >= 20, `sample assembled at least 20 bars (${loaded.bars})`)
  check(loaded.suggestions === 4, `four ranked alternatives available (${loaded.suggestions})`)
  check(loaded.annotations === loaded.partNotes, `one annotation per selected-part note (${loaded.annotations})`)
  check(loaded.canvas[0] > 500 && loaded.canvas[1] > 500, `page canvas rendered (${loaded.canvas.join('×')})`)


  const detailToggle = await page.evaluate(() => {
    const control = document.getElementById('details'), canvas = document.getElementById('overlay'), context = canvas.getContext('2d')
    const ink = () => { const data = context.getImageData(0, 0, canvas.width, canvas.height).data; let count = 0; for (let i = 3; i < data.length; i += 4) if (data[i]) count++; return count }
    const defaultHidden = !control.checked, before = ink()
    control.checked = true; control.dispatchEvent(new Event('change')); const shown = ink()
    control.checked = false; control.dispatchEvent(new Event('change')); const restored = ink()
    return { defaultHidden, extra:shown - before, restored:restored === before }
  })
  check(detailToggle.defaultHidden && detailToggle.extra > 100 && detailToggle.restored, `string/position details are opt-in and redraw beside notes (${detailToggle.extra} added pixels)`)
  await page.locator('#alternatives button').nth(1).focus(); await page.keyboard.press('Enter')
  check(await page.evaluate(() => __scoreFingering.S.suggestion === 1), 'whole-path alternative can be selected')
  check(await page.evaluate(() => document.activeElement?.closest('#alternatives') != null), 'alternative selection preserves keyboard focus')

  const clickItem = async (index, marker=true) => {
    const point = await page.evaluate(({ index, marker }) => {
      const { S } = __scoreFingering, item = S.items[index < 0 ? S.items.length + index : index], canvas = document.getElementById('overlay'), rect = canvas.getBoundingClientRect()
      const x = marker ? item.labelX : item.x, y = marker ? item.labelY : item.y
      return { x:rect.left + x * S.renderer.r * rect.width / canvas.width, y:rect.top + y * S.renderer.r * rect.height / canvas.height }
    }, { index, marker })
    await page.mouse.click(point.x, point.y)
    await page.waitForSelector('#pop', { state:'visible' })
  }
  const lockRevision = await page.evaluate(() => __scoreFingering.S.planRevision)
  await clickItem(0)
  check(await page.locator('#pop [data-string]:disabled').count() >= 1, 'impossible strings are disabled')
  await page.locator('#pop [data-string="0"]').click()
  await page.waitForFunction(revision => __scoreFingering.S.locks.size === 1 && __scoreFingering.S.planRevision > revision, lockRevision)
  check(await page.evaluate(() => __scoreFingering.S.locks.size === 1), 'tap-to-lock manual string choice re-plans the passage')
  check(await page.evaluate(() => document.activeElement?.id === 'overlay'), 'successful string choice restores editor focus')

  await page.check('#recognition')
  check(await page.evaluate(() => document.getElementById('recognition').checked), 'recognized pitches can be inspected')
  const pitchState = await page.evaluate(() => ({ name:__scoreFingering.S.items[0].source.name, revision:__scoreFingering.S.planRevision }))
  await clickItem(0); await page.click('#up')
  await page.waitForFunction(state => __scoreFingering.S.items[0].source.name !== state.name && __scoreFingering.S.planRevision > state.revision && document.getElementById('busy').style.display === 'none', pitchState)
  check(await page.evaluate(state => __scoreFingering.S.items[0].source.name !== state.name && __scoreFingering.S.planRevision > state.revision, pitchState), 'recognized pitch can be corrected and re-planned')

  const deleteState = await page.evaluate(() => ({ count:__scoreFingering.S.model.notes.length, revision:__scoreFingering.S.planRevision }))
  await clickItem(0)
  await page.click('#remove')
  await page.waitForFunction(state => __scoreFingering.S.model.notes.length === state.count - 1 && __scoreFingering.S.planRevision > state.revision && document.getElementById('busy').style.display === 'none', deleteState)
  check(await page.evaluate(state => __scoreFingering.S.model.notes.length === state.count - 1 && __scoreFingering.S.planRevision > state.revision, deleteState), 'false note can be removed and re-planned')

  const download = page.waitForEvent('download')
  await page.click('#export')
  const item = await download, output = path.join(os.tmpdir(), `score-fingering-${process.pid}.png`)

  const accessible = await page.evaluate(() => ({ buttons:document.querySelectorAll('#noteList button').length, notes:__scoreFingering.S.plan.notes.length, tabIndex:document.getElementById('overlay').tabIndex }))
  check(accessible.buttons === accessible.notes && accessible.tabIndex === 0, `keyboard note controls expose all ${accessible.notes} notes`)
  await page.focus('#overlay'); await page.keyboard.press('ArrowRight'); await page.keyboard.press('Enter')
  await page.waitForSelector('#pop', { state:'visible' })
  check(await page.evaluate(() => document.activeElement?.closest('#pop') != null), 'keyboard opens the labelled note editor and moves focus into it')
  await page.click('#close')
  check(await page.evaluate(() => document.activeElement?.id === 'overlay'), 'closing the editor restores keyboard focus')
  await item.saveAs(output)
  const bytes = fs.statSync(output).size; fs.unlinkSync(output)
  check(item.suggestedFilename().endsWith('-violin-fingering.png'), `annotated export filename (${item.suggestedFilename()})`)
  await page.locator('#noteEditor summary').click()
  await page.locator('#noteList button').first().focus(); await page.keyboard.press('Enter')
  const keyboardRevision = await page.evaluate(() => __scoreFingering.S.planRevision)
  await page.keyboard.press('Enter')
  await page.waitForFunction(revision => __scoreFingering.S.planRevision > revision, keyboardRevision)
  check(await page.evaluate(() => document.activeElement?.closest('#noteList') != null), 'successful keyboard note action restores focus to the rebuilt note list')
  check(bytes > 3000000, `flattened annotated PNG exported (${bytes} bytes)`)
  check(errors.length === 0, `no browser errors${errors.length ? ': ' + errors.join(' | ') : ''}`)
  await page.screenshot({ path:path.join(os.tmpdir(), 'score-fingering-smoke.png'), fullPage:true })


  const sampleContext = await browser.newContext({ viewport:{ width:1000, height:700 } })
  const samplePage = await sampleContext.newPage(), sampleErrors = []
  samplePage.on('pageerror', error => sampleErrors.push(error.message))
  await samplePage.goto(`${base}/046_score_fingering.html`)
  check(await samplePage.locator('#instrument').inputValue() === 'auto', 'auto violin/viola selection is the default')
  await samplePage.click('#sample')
  await samplePage.waitForFunction(() => __scoreFingering.S.document?.pageCount === 17 && __scoreFingering.S.activePageState?.status === 'ready' && __scoreFingering.S.plan?.instrument === 'viola', null, { timeout:30000 })
  const sampleAuto = await samplePage.evaluate(() => ({
    pages:__scoreFingering.S.document.pageCount,
    staves:__scoreFingering.S.model.staves.length,
    notes:__scoreFingering.S.model.notes.length,
    planNotes:__scoreFingering.S.plan.notes.length,
    clefs:__scoreFingering.S.model.staves.map(staff => staff.clef?.type),
    instrument:__scoreFingering.S.plan.instrument,
    reason:__scoreFingering.S.activePageState.autoInstruments.get(0)?.reason,
    rejected:__scoreFingering.S.plan.diagnostics.filter(diagnostic => !['chord-capacity', 'held-conflict'].includes(diagnostic.code)).length,
    status:document.getElementById('status').textContent,
  }))
  check(sampleAuto.pages === 17 && sampleAuto.staves === 9 && sampleAuto.clefs.every(clef => clef === 'alto') && sampleAuto.notes === 174 && sampleAuto.planNotes === 172 && sampleAuto.instrument === 'viola' && sampleAuto.rejected === 0 && /auto:\s*Viola/i.test(sampleAuto.status), `built-in Sibelius sample opens 17 pages and auto-detects viola (${sampleAuto.staves} alto staves, ${sampleAuto.notes}/${sampleAuto.planNotes} raw/planned notes, ${sampleAuto.reason})`)
  const manualRevision = await samplePage.evaluate(() => __scoreFingering.S.planRevision)
  await samplePage.selectOption('#instrument', 'violin'); await samplePage.waitForFunction(revision => __scoreFingering.S.planRevision > revision && __scoreFingering.S.plan.instrument === 'violin', manualRevision)
  const manualRejected = await samplePage.evaluate(() => __scoreFingering.S.plan.diagnostics.filter(diagnostic => !['chord-capacity', 'held-conflict'].includes(diagnostic.code)).length)
  const autoRevision = await samplePage.evaluate(() => __scoreFingering.S.planRevision)
  await samplePage.selectOption('#instrument', 'auto'); await samplePage.waitForFunction(revision => __scoreFingering.S.planRevision > revision && __scoreFingering.S.plan.instrument === 'viola', autoRevision)
  check(manualRejected === 84 && sampleAuto.rejected === 0, `manual violin override remains available and auto restores viola (${manualRejected} vs ${sampleAuto.rejected} rejected notes)`)
  const retainedEvidence = await samplePage.evaluate(async () => {
    const S = __scoreFingering.S, originalName = S.document.name
    S.document.name = 'untitled-score'
    S.activePageState.autoInstruments.set(0, { instrument:'violin', reason:'treble' })
    S.document.autoInstruments.set(0, { instrument:'viola', reason:'alto-clef' })
    await __scoreFingering.replan(false)
    const result = { plan:S.plan.instrument, retained:S.document.autoInstruments.get(0)?.instrument }
    S.document.name = originalName
    return result
  })
  check(retainedEvidence.plan === 'viola' && retainedEvidence.retained === 'viola', 'strong part evidence outranks a stale cached page detection')
  const crossPartExport = await samplePage.evaluate(() => {
    const part = clef => ({ measures:[{ clef, events:[], ticks:0 }], staves:[{ clef:{ type:clef } }] })
    const score = { parts:[part('alto'), part('treble')] }
    const settings = { instrumentMode:'auto', instrument:'viola', documentName:'untitled-score', autoInstruments:new Map(), resolvedInstruments:new Set() }
    const viola = __scoreFingering.resolvePlanningInstrument({ score, part:0, autoInstruments:new Map() }, settings)
    const violin = __scoreFingering.resolvePlanningInstrument({ score, part:1, autoInstruments:new Map() }, settings)
    return { viola, violin, filenameInstrument:__scoreFingering.exportInstrumentLabel(settings), evidence:[...settings.autoInstruments.keys()] }
  })
  check(crossPartExport.viola === 'viola' && crossPartExport.violin === 'violin' && crossPartExport.filenameInstrument === 'auto' && crossPartExport.evidence.join() === '0', 'auto PDF export isolates part evidence and labels mixed instruments as auto')
  await samplePage.evaluate(() => __scoreFingering.openPage(3, { fit:true }))
  await samplePage.waitForFunction(() => __scoreFingering.S.activePageState?.index === 3 && getComputedStyle(document.getElementById('busy')).display === 'none', null, { timeout:30000 })
  const directPage3 = await samplePage.evaluate(() => {
    window.__directPage3Model = __scoreFingering.S.model
    return { fifths:__scoreFingering.S.model.staves.map(staff => staff.key.fifths), recognized:__scoreFingering.S.activePageState.recognizedFifths }
  })
  check(directPage3.fifths.every(fifths => fifths === 0) && directPage3.recognized == null, 'direct page-3 navigation does not skip unresolved page 2 for key carry')
  await samplePage.evaluate(() => __scoreFingering.openPage(2, { fit:true }))
  await samplePage.waitForFunction(() => __scoreFingering.S.activePageState?.index === 2 && getComputedStyle(document.getElementById('busy')).display === 'none', null, { timeout:30000 })
  const chromaticApproach = await samplePage.evaluate(() => {
    const S = __scoreFingering.S
    const index = S.items.findIndex(item => item.source.st?.index === 0 && item.source.x > 1090 && item.source.x < 1110)
    return {
      index,
      names:S.items.slice(index, index + 3).map(item => item.source.name),
      pitches:S.plan.notes.slice(index, index + 3).map(note => note.pitch),
      fingers:S.items.slice(index, index + 3).map(item => item.assignment.finger),
      bases:S.items.slice(index, index + 3).map(item => item.assignment.base),
      fifths:S.model.staves.map(staff => staff.key.fifths),
      inferred:S.model.staves.every(staff => staff.key.detected === 2 || staff.key.documentInferred),
    }
  })
  check(chromaticApproach.index === 11 && chromaticApproach.names.join() === 'E♯3,F♯3,A3' && chromaticApproach.pitches.join() === '53,54,57' && chromaticApproach.fingers.join() === '2,3,1' && chromaticApproach.bases.every(base => base === 2) && chromaticApproach.fifths.every(fifths => fifths === 2) && chromaticApproach.inferred, `page 2 carries D major and fingers E♯-F♯-A as 2-3-1 (${chromaticApproach.names.join(' · ')} / ${chromaticApproach.fingers.join('-')})`)
  await samplePage.evaluate(() => __scoreFingering.openPage(3, { fit:true }))
  await samplePage.waitForFunction(() => __scoreFingering.S.activePageState?.index === 3 && __scoreFingering.S.model !== window.__directPage3Model && getComputedStyle(document.getElementById('busy')).display === 'none', null, { timeout:30000 })
  const refreshedPage3 = await samplePage.evaluate(() => ({ fifths:__scoreFingering.S.model.staves.map(staff => staff.key.fifths), keyless:__scoreFingering.S.model.staves.filter(staff => staff.key.keylessSection && staff.key.fifths === 0).length, recognized:__scoreFingering.S.activePageState.recognizedFifths }))
  // Page 3 prints no key signature (a C section, accidentals written out): recognized again with
  // page 2's D major as context, its keyless staves stay in C rather than inheriting D.
  check(refreshedPage3.recognized === 2 && refreshedPage3.keyless >= 10, `cached page 3 is re-recognized after page 2 establishes its key context, keeping its keyless section in C (keys ${refreshedPage3.fifths.join(',')}, carried ${refreshedPage3.recognized})`)
  check(sampleErrors.length === 0, `no built-in sample browser errors${sampleErrors.length ? ': ' + sampleErrors.join(' | ') : ''}`)
  await sampleContext.close()
  // Loading a replacement closes old note closures, and a delayed older request cannot win.
  await page.focus('#overlay'); await page.keyboard.press('Enter'); await page.waitForSelector('#pop', { state:'visible' })
  const reloadRevision = await page.evaluate(() => __scoreFingering.S.planRevision)
  await page.evaluate(async () => {
    const blob = await (await fetch('../random-sketches/vibes/scoreshift/sample.jpg')).blob()
    window.__testScoreBlob = blob
    __scoreFingering.load(blob, 'replacement.jpg')
  })
  await page.waitForFunction(revision => __scoreFingering.S.name === 'replacement' && __scoreFingering.S.planRevision > revision, reloadRevision, { timeout:30000 })
  check(await page.evaluate(() => getComputedStyle(document.getElementById('pop')).display === 'none' && __scoreFingering.S.model.notes.length === 97), 'replacement score closes stale note editors without deleting data')
  const raceRevision = await page.evaluate(() => __scoreFingering.S.planRevision)
  await page.evaluate(() => {
    const slow = new Promise(resolve => setTimeout(() => resolve(window.__testScoreBlob), 350))
    __scoreFingering.loadSource(slow, 'older.jpg')
    setTimeout(() => __scoreFingering.load(window.__testScoreBlob, 'latest.jpg'), 20)
  })
  await page.waitForFunction(revision => __scoreFingering.S.name === 'latest' && __scoreFingering.S.planRevision > revision && getComputedStyle(document.getElementById('busy')).display === 'none', raceRevision, { timeout:30000 })
  if (!(await page.locator('#noteEditor').evaluate(details => details.open))) await page.locator('#noteEditor summary').click()
  const lastButton = page.locator('#noteList button').last(); await lastButton.focus(); await page.keyboard.press('Enter')
  const lastDeleteRevision = await page.evaluate(() => __scoreFingering.S.planRevision)
  await page.locator('#remove').focus(); await page.keyboard.press('Enter')
  await page.waitForFunction(revision => __scoreFingering.S.planRevision > revision, lastDeleteRevision)
  await page.focus('#overlay'); await page.keyboard.press('End'); await page.keyboard.press('Enter')
  await page.waitForSelector('#pop', { state:'visible' })
  check(await page.evaluate(() => __scoreFingering.S.keyboardIndex === __scoreFingering.S.items.length - 1), 'deleting the final note clamps subsequent keyboard selection')
  await page.click('#close')
  check(await page.evaluate(() => __scoreFingering.S.name === 'latest'), 'latest image wins over a delayed older request')

  // Multi-page PDF: title page, cached music page state, unopened-page export, navigation and page-aware PNG.
  const pdfRevision = await page.evaluate(() => __scoreFingering.S.planRevision)
  await page.evaluate(() => { __scoreFingering.S.locks.set('old-document-sentinel', 2); window.__oldDocumentLocks = __scoreFingering.S.locks })
  await page.evaluate(async () => {
    const blob = await (await fetch('score-fingering/test/fixtures/parts.pdf')).blob()
    await __scoreFingering.load(new File([blob], 'parts.pdf', { type:'application/pdf' }), 'parts.pdf')
  })
  await page.waitForFunction(() => __scoreFingering.S.document?.kind === 'pdf' && __scoreFingering.S.document.page === 1 && __scoreFingering.S.document.pages.get(1)?.status === 'nonmusic', null, { timeout:30000 })
  const pdfStart = await page.evaluate(() => ({ count:__scoreFingering.S.document.pageCount, buttons:document.querySelectorAll('#thumbs button').length, status:document.getElementById('status').textContent }))
  check(await page.evaluate(() => __scoreFingering.S.locks.size === 0 && __scoreFingering.S.locks !== window.__oldDocumentLocks), 'new PDF page state does not inherit mutable state from the previous image')
  check(pdfStart.count === 3 && pdfStart.buttons === 3 && /no staves/.test(pdfStart.status), 'PDF opens title page unchanged with three-page navigation')
  await page.waitForFunction(() => document.querySelectorAll('#thumbs canvas').length === 3, null, { timeout:20000 })
  check(await page.locator('#thumbs canvas').count() === 3, 'PDF thumbnail strip renders all visible pages')
  await page.click('#nextPage')
  await page.waitForFunction(revision => __scoreFingering.S.document.page === 2 && __scoreFingering.S.document.pages.get(2)?.status === 'ready' && __scoreFingering.S.planRevision > revision && __scoreFingering.S.items.length > 0, pdfRevision, { timeout:30000 })
  await page.locator('#alternatives button').nth(1).click()
  await page.waitForFunction(() => __scoreFingering.S.items?.[0]?.assignment && __scoreFingering.S.document.page === 2)
  const pdfPitchState = await page.evaluate(() => ({ name:__scoreFingering.S.items[0].source.name, revision:__scoreFingering.S.planRevision }))
  await clickItem(0); await page.click('#up')
  await page.waitForFunction(state => __scoreFingering.S.items[0].source.name !== state.name && __scoreFingering.S.planRevision > state.revision, pdfPitchState)
  const pdfCorrectedName = await page.evaluate(() => __scoreFingering.S.items[0].source.name)
  const pdfPage2 = await page.evaluate(async () => {
    const S = __scoreFingering.S, item = S.items[0], string = item.assignment.string
    S.locks.set(item.id, string); const revision = S.planRevision; await __scoreFingering.replan()
    window.__pdfPage2Model = S.model; window.__pdfPage2State = S.activePageState; window.__pdfPage2Id = item.id
    return { revision, lock:string, suggestions:S.plan.suggestions.length, status:S.document.pages.get(3)?.status || 'empty' }
  })
  check(pdfPage2.suggestions >= 2 && pdfPage2.status === 'empty', 'page 2 is fingered while page 3 remains unopened')

  await page.evaluate(() => {
    const pool = __scoreFingering.S.document.pdfPool, original = pool.render.bind(pool)
    window.__restoreExportRender = () => { pool.render = original }
    pool.render = async (index, pixels) => { const result = await original(index, pixels); if (index === 3 && pixels === 2400) window.__temporaryPdfSource = result.canvas; return result }
  })
  const pdfDownload = page.waitForEvent('download')
  await page.click('#exportPdf')
  const pdfItem = await pdfDownload, pdfOutput = path.join(os.tmpdir(), `score-fingering-${process.pid}.pdf`)
  await pdfItem.saveAs(pdfOutput)
  const pdfBytes = fs.readFileSync(pdfOutput); fs.unlinkSync(pdfOutput)
  const pdfCheck = await page.evaluate(async bytes => {
    const { openPdf, renderPage } = await import('../random-sketches/vibes/scoreshift/pdfsource.js')
    const doc = await openPdf(new Blob([new Uint8Array(bytes)], { type:'application/pdf' }))
    const original = await openPdf(await (await fetch('score-fingering/test/fixtures/parts.pdf')).blob())
    const sizes = [], outputPixels = [], sourcePixels = []
    const pixels = async (pdf, index) => { const { canvas } = await renderPage(pdf, index, 360); return canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data }
    for (let index = 1; index <= doc.numPages; index++) {
      const p = await doc.getPage(index), v = p.getViewport({ scale:1 }); sizes.push([Math.round(v.width), Math.round(v.height)])
      outputPixels.push(await pixels(doc, index)); sourcePixels.push(await pixels(original, index))
    }
    const compare = (a, b) => { let sum = 0, changed = 0; for (let i = 0; i < a.length; i += 4) { const d = Math.abs(a[i]-b[i]) + Math.abs(a[i+1]-b[i+1]) + Math.abs(a[i+2]-b[i+2]); sum += d; if (d > 90) changed++ } return { mean:sum/(a.length/4*3), changed } }
    const matrix = outputPixels.map(out => sourcePixels.map(src => compare(out, src).mean))
    const changed = outputPixels.map((out, index) => compare(out, sourcePixels[index]).changed)
    return { pages:sizes.length, sizes, matrix, changed, cached:[...__scoreFingering.S.document.pages.values()].map(state => state.status) }
  }, [...pdfBytes])
  check(pdfCheck.matrix.every((row, index) => row[index] === Math.min(...row)), `exported visual page order matches the source (${JSON.stringify(pdfCheck.matrix.map(row => row.map(value => +value.toFixed(1))))})`)
  check(pdfCheck.changed[1] > 100 && pdfCheck.changed[2] > 100, `both music pages contain rendered annotation changes (${pdfCheck.changed.join(',')})`)
  check(pdfItem.suggestedFilename() === 'parts-violin-fingering.pdf', `whole-document PDF filename (${pdfItem.suggestedFilename()})`)
  check(pdfBytes.length > 100000 && pdfBytes.subarray(0, 5).toString() === '%PDF-', `annotated PDF exported (${pdfBytes.length} bytes)`)
  check(pdfCheck.pages === 3 && pdfCheck.sizes.every(([w, h]) => w === 612 && h === 792), `PDF preserves three Letter pages (${JSON.stringify(pdfCheck.sizes)})`)
  check(pdfCheck.cached.join() === 'nonmusic,ready,empty', `export recognizes unopened music pages without retaining heavy page caches (${pdfCheck.cached.join()})`)

  check(await page.evaluate(() => { window.__restoreExportRender(); return window.__temporaryPdfSource?.width === 1 && window.__temporaryPdfSource?.height === 1 }), 'unopened-page export releases its temporary source canvas deterministically')

  await page.evaluate(() => {
    const pool = __scoreFingering.S.document.pdfPool, original = pool.render.bind(pool)
    window.__restorePdfRender = () => { pool.render = original }
    pool.render = (index, pixels) => index === 3 ? new Promise(resolve => setTimeout(() => resolve(original(index, pixels)), 500)) : original(index, pixels)
    window.__pdfPage2Locks = __scoreFingering.S.locks
    __scoreFingering.openPage(3, { fit:true })
    setTimeout(() => __scoreFingering.openPage(1, { fit:true }), 20)
  })
  await page.waitForFunction(() => __scoreFingering.S.document.page === 1 && __scoreFingering.S.activePageState?.index === 1)
  check(await page.evaluate(() => {
    const state = __scoreFingering.S.document.pages.get(3)
    window.__restorePdfRender()
    return state.status === 'empty' && state.locks.size === 0 && state.locks !== window.__pdfPage2Locks
      && __scoreFingering.S.document.page === __scoreFingering.S.activePageState.index
      && getComputedStyle(document.getElementById('busy')).display === 'none'
  }), 'overlapping PDF navigation cancels stale busy ownership without aliasing state or page pointers')

  await page.locator('#thumbs button[data-page="3"]').click()
  await page.waitForFunction(() => __scoreFingering.S.document.page === 3 && __scoreFingering.S.model)
  await page.evaluate(() => { window.__pdfPage3Model = __scoreFingering.S.model })
  await page.locator('#thumbs button[data-page="2"]').click()
  await page.waitForFunction(() => __scoreFingering.S.document.page === 2 && __scoreFingering.S.model && __scoreFingering.S.activePageState === window.__pdfPage2State)
  const restored = await page.evaluate(() => ({ lock:__scoreFingering.S.locks.get(window.__pdfPage2Id), suggestion:__scoreFingering.S.suggestion, page:__scoreFingering.S.document.page, correctedName:__scoreFingering.S.items[0].source.name, page3Cached:__scoreFingering.S.document.pages.get(3).model != null, stateStable:__scoreFingering.S.activePageState === window.__pdfPage2State, corrections:__scoreFingering.S.activePageState.corrections.size, resident:[...__scoreFingering.S.document.pages.values()].filter(state => state.status !== 'empty').length }))
  check(restored.lock === pdfPage2.lock && restored.suggestion === 1 && restored.correctedName === pdfCorrectedName && restored.page3Cached && restored.stateStable && restored.corrections > 0, 'PDF navigation restores stable page state, correction, lock and selected alternative')
  check(restored.resident <= 2, `real PDF page cache retains at most two heavy page payloads (${restored.resident})`)

  const pagePngDownload = page.waitForEvent('download'); await page.click('#export')
  const pagePng = await pagePngDownload
  check(pagePng.suggestedFilename() === 'parts-p02-violin-fingering.png', `current-page PNG is page-aware (${pagePng.suggestedFilename()})`)
  const settingRevision = await page.evaluate(() => __scoreFingering.S.planRevision)
  await page.evaluate(() => { const tempo = document.getElementById('tempo'); tempo.value = '132'; tempo.dispatchEvent(new Event('change')) })
  await page.waitForFunction(revision => __scoreFingering.S.planRevision > revision, settingRevision)
  check(await page.evaluate(() => [...__scoreFingering.S.document.pages.values()].every(state => state.suggestion === 0) && __scoreFingering.S.locks.size === 1), 'global planning changes reset stale per-page alternative ranks while preserving edits')

  const stableExport = page.waitForEvent('download')
  const sameExport = await page.evaluate(() => { const first = __scoreFingering.exportAnnotatedPdf(); return first === __scoreFingering.exportAnnotatedPdf() })
  check(sameExport && await page.locator('#exportPdf').isDisabled(), 'repeated PDF export activation reuses one in-flight job')
  await page.evaluate(() => { const instrument = document.getElementById('instrument'); instrument.value = 'viola'; instrument.dispatchEvent(new Event('change')) })
  const stableItem = await stableExport
  check(stableItem.suggestedFilename() === 'parts-violin-fingering.pdf', 'whole-PDF export snapshots settings and filename before asynchronous page work')
  await page.waitForFunction(() => getComputedStyle(document.getElementById('busy')).display === 'none')
  const imageReturnRevision = await page.evaluate(() => { window.__oldPdfDocument = __scoreFingering.S.document; return __scoreFingering.S.planRevision })
  await loadImageSample(page)
  await page.waitForFunction(revision => __scoreFingering.S.document?.kind === 'image' && __scoreFingering.S.planRevision > revision, imageReturnRevision, { timeout:30000 })
  check(await page.evaluate(() => window.__oldPdfDocument.pdfPool.readers.length === 0 && document.getElementById('pages').hidden && document.getElementById('exportPdf').hidden), 'switching back to an image destroys PDF readers and hides PDF controls')

  const mobileContext = await browser.newContext({ viewport:{ width:320, height:568 }, deviceScaleFactor:2 })
  const mobile = await mobileContext.newPage(), mobileErrors = []
  mobile.on('pageerror', error => mobileErrors.push(error.message))
  await mobile.goto(`${base}/046_score_fingering.html`); await loadImageSample(mobile)
  await mobile.waitForFunction(() => __scoreFingering?.S?.plan?.suggestions?.length === 4, null, { timeout:30000 })
  await mobile.locator('#noteEditor summary').click(); await mobile.locator('#noteList button').first().click()
  const mobileLayout = await mobile.evaluate(() => {
    const pop = document.getElementById('pop').getBoundingClientRect(), canvas = document.getElementById('overlay').getBoundingClientRect(), S = __scoreFingering.S
    return { scrollWidth:document.documentElement.scrollWidth, viewport:innerWidth, popBottom:pop.bottom, height:innerHeight, canvasWidth:canvas.width, expected:S.renderer.W * S.zoom }
  })
  check(mobileLayout.scrollWidth <= mobileLayout.viewport + 1, `mobile layout stays inside ${mobileLayout.viewport}px viewport`)
  check(mobileLayout.popBottom <= mobileLayout.height + 1, 'wrapped mobile popup actions remain visible')
  check(Math.abs(mobileLayout.canvasWidth - mobileLayout.expected) < 1, 'score display scale is independent of device pixel ratio')
  await mobile.click('#close')
  await mobile.evaluate(() => { const zoom = document.getElementById('zoom'); zoom.value = '1'; zoom.dispatchEvent(new Event('input')) })
  await mobile.focus('#overlay'); await mobile.keyboard.press('End')
  const keyboardView = await mobile.evaluate(() => {
    const S = __scoreFingering.S, item = S.items[S.keyboardIndex], canvas = document.getElementById('overlay'), cr = canvas.getBoundingClientRect(), wr = document.getElementById('wrap').getBoundingClientRect()
    const x = cr.left + item.labelX * S.renderer.r * cr.width / canvas.width, y = cr.top + item.labelY * S.renderer.r * cr.height / canvas.height
    return { selected:S.keyboardIndex, last:S.items.length - 1, visible:x >= wr.left && x <= wr.right && y >= wr.top && y <= wr.bottom, top:document.getElementById('wrap').scrollTop, windowY:scrollY }
  })
  check(keyboardView.selected === keyboardView.last && keyboardView.visible && (keyboardView.top > 0 || keyboardView.windowY > 0), `keyboard navigation scrolls the selected annotation into view ${JSON.stringify(keyboardView)}`)
  check(mobileErrors.length === 0, `no mobile browser errors${mobileErrors.length ? ': ' + mobileErrors.join(' | ') : ''}`)
  await mobileContext.close()

  const preemptContext = await browser.newContext({ viewport:{ width:800, height:600 } })
  const preempt = await preemptContext.newPage(); await preempt.goto(`${base}/046_score_fingering.html`); await loadImageSample(preempt)
  await preempt.waitForFunction(() => __scoreFingering?.S?.planRevision > 0, null, { timeout:30000 })
  await preempt.evaluate(async () => { window.__preemptBlob = await (await fetch('../random-sketches/vibes/scoreshift/sample.jpg')).blob() })
  let workerRequests = 0
  await preempt.route('**/score-fingering/recognize-worker.js', route => {
    workerRequests++
    if (workerRequests === 1) route.fulfill({ status:200, contentType:'text/javascript', body:'await new Promise(() => {})' })
    else route.continue()
  })
  await preempt.evaluate(() => { __scoreFingering.load(window.__preemptBlob, 'hung.jpg') })
  await preempt.waitForTimeout(300)
  await preempt.evaluate(() => { const mode = document.getElementById('mode'); mode.value = 'expressive'; mode.dispatchEvent(new Event('change')) })
  await preempt.waitForTimeout(150)
  check(await preempt.evaluate(() => getComputedStyle(document.getElementById('busy')).display === 'grid'), 'replanning cannot clear an active load busy state')
  const preemptStart = Date.now(); await preempt.evaluate(() => __scoreFingering.load(window.__preemptBlob, 'preempted-by-latest.jpg'))
  await preempt.waitForFunction(() => __scoreFingering.S.name === 'preempted-by-latest' && getComputedStyle(document.getElementById('busy')).display === 'none', null, { timeout:10000 })
  const renderFailureContext = await browser.newContext({ viewport:{ width:800, height:600 } })
  const renderFailurePage = await renderFailureContext.newPage()
  const brokenPdfSource = fs.readFileSync(path.join(root, 'random-sketches/vibes/scoreshift/pdfsource.js'), 'utf8').replace('async render(k, px, signal = null) {', 'async render(k, px, signal = null) { throw new Error("pdf-render-test");')
  await renderFailurePage.route('**/random-sketches/vibes/scoreshift/pdfsource.js', route => route.fulfill({ status:200, contentType:'text/javascript', body:brokenPdfSource }))
  await renderFailurePage.goto(`${base}/046_score_fingering.html`)
  await renderFailurePage.evaluate(async () => {
    const blob = await (await fetch('score-fingering/test/fixtures/parts.pdf')).blob()
    await __scoreFingering.load(new File([blob], 'broken-render.pdf', { type:'application/pdf' }), 'broken-render.pdf')
  })
  await renderFailurePage.waitForFunction(() => /Could not open this PDF/.test(document.getElementById('status').textContent))
  check(await renderFailurePage.evaluate(() => __scoreFingering.S.document === null && document.getElementById('pages').hidden && document.getElementById('exportPdf').hidden), 'first-page render failure destroys the unusable PDF and hides its controls')
  await renderFailureContext.close()

  check(workerRequests >= 2 && Date.now() - preemptStart < 10000, 'latest image preempts an unresponsive stale recognition worker')
  await preemptContext.close()
  check(errors.length === 0, `no main-page errors after PDF workflow${errors.length ? ': ' + errors.join(' | ') : ''}`)

  const failureContext = await browser.newContext({ viewport:{ width:800, height:600 } })
  const failurePage = await failureContext.newPage()
  await failurePage.route('**/score-fingering/recognize-worker.js', route => route.fulfill({ status:200, contentType:'text/javascript', body:'throw new Error("worker-start-test")' }))
  await failurePage.goto(`${base}/046_score_fingering.html`); await loadImageSample(failurePage)
  await failurePage.waitForFunction(() => /Could not read/.test(document.getElementById('status').textContent), null, { timeout:10000 })
  check(await failurePage.evaluate(() => getComputedStyle(document.getElementById('busy')).display === 'none'), 'worker startup failure surfaces and clears the busy state')
  await failurePage.evaluate(async () => {
    const blob = await (await fetch('score-fingering/test/fixtures/parts.pdf')).blob()
    await __scoreFingering.load(new File([blob], 'failed-parts.pdf', { type:'application/pdf' }), 'failed-parts.pdf')
  })
  await failurePage.waitForFunction(() => __scoreFingering.S.document?.kind === 'pdf' && __scoreFingering.S.document.pages.get(1)?.status === 'failed')
  check(await failurePage.evaluate(() => /recognition failed/i.test(document.getElementById('status').textContent) && __scoreFingering.S.document.pages.get(1).status !== 'nonmusic'), 'PDF worker failures are distinct from non-music pages and offer retry')
  check(await failurePage.evaluate(() => __scoreFingering.exportAnnotatedPdf().then(result => result === null)), 'whole-PDF export aborts instead of silently dropping failed annotations')
  await failureContext.close()
} finally {
  await browser.close(); await new Promise(resolve => server.close(resolve))
}

if (checks.some(([ok]) => !ok)) process.exitCode = 1
