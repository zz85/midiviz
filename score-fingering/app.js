import { buildScore } from '../../random-sketches/vibes/scoreshift/score.js'
import { Renderer } from '../../random-sketches/vibes/scoreshift/render.js'
import { interpret, yOfP, lineY } from '../../random-sketches/vibes/scoreshift/omr.js'
import { planFingering, annotationItems, hitAnnotation, sourceNoteId, detectViolinViola } from './adapter.js'
import { drawFingerings, drawRecognition, labelAt } from './overlay.js'
import { INSTRUMENTS, solveFingering } from '../strings/fingering.js'
import { createScoreDocument, pageState, cachePage, pageFileStem, trimPageRecords, precedingPageFifths, invalidatePageKeyEvidence } from './document.js'
import { measureStarts, measureAt, soundingHeads, annotationKey, loadAnnotations, saveAnnotations } from './reader.js'
import { toLocal, localRect, localDelta, wheelTurner } from './stand.js'

const $ = id => document.getElementById(id)
const page = $('page'), overlay = $('overlay'), pageCtx = page.getContext('2d'), overlayCtx = overlay.getContext('2d')
const ink = $('ink'), heads = $('heads'), inkCtx = ink.getContext('2d'), headsCtx = heads.getContext('2d')
// Playback and pen annotations come from ScoreShift / notation-ir, loaded on first use so a
// missing module only disables its feature
const inkModules = () => Promise.all([
  import('../../random-sketches/vibes/notation-ir/adapters/scoreshift.js'),
  import('../../random-sketches/vibes/scoreshift/surface.js'),
  import('../../random-sketches/vibes/notation-ir/annotations.js'),
]).then(([adapter, surface, annotations]) => ({ ...adapter, ...surface, ...annotations }))
const DEFAULT_OVERLAY_LABEL = 'Annotated score. Use the arrow keys to select a note and Enter to edit it, or use the Edit recognized notes list.'
const S = { document:null, activePageState:null, model:null, image:null, renderer:null, score:null, plan:null, items:[], locks:new Map(), part:0, suggestion:0, zoom:1, selectedId:null, keyboardIndex:0, popupOpener:null, planRevision:0, name:'score' }
// P: playback of the shown page. INK: pen annotations (notation-ir annotations.js) on it.
const P = { player:null, manual:false, turning:false, state:null, headsKey:'' }
const INK = { pending:null, pendingGroups:[], on:false, color:'#c2255c', width:0.2, erase:false, penSeen:false, undo:[], redo:[], sel:null, group:null, ptrs:new Map(), mods:null, failed:false, irc:null, items:[], surface:null, model:null }
let loadRequest = 0
const activeRecognitions = new Set(), backgroundRecognitions = new Set(), activePdfRenders = new Set(), busyOwners = new Set()
// Stand: the app drawn a quarter turn round (stand.js); dir 1 clockwise, -1 counter-clockwise, 0 off
const STAND = { dir:0, fullscreen:false }
/** An element's box in the app's own frame (the rotated frame in Stand). */
function appBox(el) { const r = el.getBoundingClientRect(); return STAND.dir ? localRect(r, STAND.dir, innerWidth, innerHeight) : r }
/** A pointer event's position on a canvas, in canvas pixels, whatever the rotation. */
function canvasPoint(event, canvas) {
  const box = appBox(canvas), p = toLocal(event.clientX, event.clientY, STAND.dir, innerWidth, innerHeight)
  return { x:(p.u - box.left) * canvas.width / box.width, y:(p.v - box.top) * canvas.height / box.height }
}

const escapeHtml = value => String(value).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]))
const setStatus = html => { $('status').innerHTML = html }
const setBusy = (on, text='Reading the music…', owner='default') => {
  if (on) { busyOwners.add(owner); $('busy').firstElementChild.textContent = text }
  else busyOwners.delete(owner)
  $('busy').style.display = busyOwners.size ? 'grid' : 'none'
}
const cancelRecognitions = () => { for (const cancel of [...activeRecognitions]) cancel() }
const cancelPdfRenders = () => { for (const controller of [...activePdfRenders]) controller.abort() }
const beginLoadRequest = () => {
  const request = ++loadRequest
  cancelRecognitions(); cancelPdfRenders(); busyOwners.clear(); $('busy').style.display = 'none'
  if (!P.turning) stopPlayback()
  if (P.picking) { P.picking = null; loopLabel() }
  return request
}
function showStage() {
  $('empty').hidden = true; $('stage').hidden = false; $('export').disabled = false; $('transport').hidden = false
  $('play').disabled = !S.model; $('rewind').disabled = !S.model; $('inkMode').disabled = !S.model
  if (!S.model) { setInkMode(false); drawInk() }
  loopLabel(); clearHeads()
  if (S.model) loadInkModules().catch(() => {}) // ready before the first stroke
}
function hideStage() { $('export').disabled = true; $('stage').hidden = true; $('empty').hidden = false; $('transport').hidden = true; stopPlayback(); setInkMode(false) }


function syncCurrentPage() {
  const state = S.activePageState
  if (!state) return
  Object.assign(state, {
    model:S.model, image:S.image, renderer:S.renderer, score:S.score, plan:S.plan, items:S.items,
    locks:S.locks, part:S.part, suggestion:S.suggestion, keyboardIndex:S.keyboardIndex, selectedId:S.selectedId,
  })
}
function recordCorrection(id, patch) {
  const state = S.activePageState
  if (!state) return
  state.corrections.set(id, { ...(state.corrections.get(id) || {}), ...patch })
}

function closeDocument() {
  cancelRecognitions(); cancelPdfRenders(); for (const cancel of [...backgroundRecognitions]) cancel()
  S.document?.thumbnailObserver?.disconnect()
  S.document?.pdfPool?.destroy()
  S.document = null; S.activePageState = null
  $('pages').hidden = true; $('exportPdf').hidden = true
}
const pdfModule = () => import('../../random-sketches/vibes/scoreshift/pdfsource.js')

const STRONG_AUTO_REASONS = new Set(['name', 'alto-clef', 'low-clef', 'range'])
function detectPageInstrument(state, score, part, { name = S.document?.name || S.name, fallback = null, remember = true } = {}) {
  const documentEvidence = S.document?.autoInstruments?.get(part)
  const pageEvidence = state?.autoInstruments?.get(part)
  const prior = documentEvidence?.instrument || pageEvidence?.instrument || fallback || null
  if (!score) return documentEvidence || pageEvidence || { instrument:prior || 'violin', reason:prior ? 'document' : 'default' }
  const detected = detectViolinViola(score, part, { name, fallback:prior })
  state?.autoInstruments?.set(part, detected)
  if (remember && STRONG_AUTO_REASONS.has(detected.reason)) S.document?.autoInstruments?.set(part, detected)
  return detected
}

function selectedInstrument(state = S.activePageState) {
  const mode = $('instrument').value
  if (mode !== 'auto') return { instrument:mode, reason:'manual' }
  const active = state === S.activePageState, part = active ? S.part : state?.part ?? 0
  const score = active ? S.score || state?.score : state?.score
  return detectPageInstrument(state, score, part)
}
const MAX_PDF_BYTES = 100 * 1024 * 1024, MAX_PDF_PAGES = 100, MAX_CACHED_PAGES = 2, MAX_EXPORT_JPEG_BYTES = 64 * 1024 * 1024
function resetPageGlobals() {
  S.activePageState = null; S.model = null; S.image = null; S.renderer = null; S.score = null; S.plan = null; S.items = []
  S.locks = new Map(); S.part = 0; S.suggestion = 0; S.keyboardIndex = 0; S.selectedId = null
}
function applyPageCorrections(model, state) {
  if (!state?.corrections?.size) return
  const touched = new Set()
  for (const note of [...model.notes]) {
    const correction = state.corrections.get(sourceNoteId(note))
    if (!correction) continue
    if (correction.deleted) {
      const staffIndex = note.st.notes.indexOf(note), modelIndex = model.notes.indexOf(note)
      if (staffIndex >= 0) note.st.notes.splice(staffIndex, 1)
      if (modelIndex >= 0) model.notes.splice(modelIndex, 1)
    } else {
      if (correction.p != null) { note.p = correction.p; note.y = yOfP(note.st, note.p, note.x) }
      if (Object.hasOwn(correction, 'acc')) note.accid = correction.acc == null ? null : { ...(note.accid || { ids:[], box:[note.box[0] - 12, note.y - 12, note.box[0] - 2, note.y + 12] }), type:correction.acc }
    }
    touched.add(note.st)
  }
  for (const staff of touched) interpret(staff)
}

function rememberPageFifths(state, score) {
  if (!state?.fifthsByPart || !score?.parts) return
  state.fifthsByPart.clear()
  for (const part of score.parts) {
    const staff = part.staves?.at(-1)
    if (!staff) continue
    const fifths = staff.keyChanges?.at(-1)?.fifths ?? staff.key?.fifths
    if (Number.isInteger(fifths)) state.fifthsByPart.set(part.index, fifths)
  }
}

function trimPageCache(doc, keepIndex) {
  if (doc.kind !== 'pdf') return
  trimPageRecords(doc, keepIndex, MAX_CACHED_PAGES, releasePageCanvases)
}

function releasePageCanvases(state) {
  for (const canvas of [state.image, state.renderer?.src, state.renderer?.small]) if (canvas) { canvas.width = 1; canvas.height = 1 }
}

function invalidatePagePayload(state) {
  releasePageCanvases(state)
  invalidatePageKeyEvidence(state)
  Object.assign(state, { status:'empty', image:null, model:null, renderer:null, score:null, plan:null, items:[], selectedId:null })
}


async function recognize(source, { probe=false, request=null, fifths=null, background=false } = {}) {
  const owners = background ? backgroundRecognitions : activeRecognitions
  const run = async () => {
    const bitmap = source instanceof Blob ? await createImageBitmap(source, { imageOrientation:'from-image' }) : source
    const displayScale = Math.min(1, 3600 / Math.max(bitmap.width, bitmap.height))
    const image = document.createElement('canvas')
    image.width = Math.round(bitmap.width * displayScale); image.height = Math.round(bitmap.height * displayScale)
    if (request != null && request !== loadRequest) { bitmap.close?.(); throw new Error('Recognition superseded by a newer image') }
    image.getContext('2d').drawImage(bitmap, 0, 0, image.width, image.height)
    bitmap.close?.()
    const f = Math.min(1, 2400 / Math.max(image.width, image.height))
    const w = Math.round(image.width * f), h = Math.round(image.height * f)
    const analysis = document.createElement('canvas'); analysis.width = w; analysis.height = h
    const context = analysis.getContext('2d', { willReadFrequently:true })
    context.drawImage(image, 0, 0, w, h)
    const rgba = context.getImageData(0, 0, w, h).data, gray = new Uint8Array(w * h)
    for (let i = 0; i < gray.length; i++) gray[i] = (rgba[i * 4] * 77 + rgba[i * 4 + 1] * 150 + rgba[i * 4 + 2] * 29) >> 8
    const response = await new Promise((resolve, reject) => {
      const recognizer = new Worker(new URL('./recognize-worker.js', import.meta.url), { type:'module' })
      let settled = false, timeout = null
      const finish = (callback, value) => {
        if (settled) return
        settled = true; clearTimeout(timeout); recognizer.terminate()
        owners.delete(cancel)
        callback(value)
      }
      const cancel = () => finish(reject, new Error('Recognition superseded by a newer image'))
      owners.add(cancel)
      timeout = setTimeout(() => finish(reject, new Error('Recognition timed out')), 30000)
      recognizer.onmessage = event => event.data.error ? finish(reject, new Error(event.data.error)) : finish(resolve, event.data)
      recognizer.onerror = event => finish(reject, new Error(event.message || 'Recognition worker failed to start'))
      recognizer.postMessage({ gray, w, h, f, probe, fifths }, [gray.buffer])
    })
    if (probe) return response
    for (const note of response.model.notes) note.st = response.model.staves[note.si]
    return { model:response.model, image }
  }
  return run()
}


async function renderPdf(pool, index, pixels, request=null) {
  if (request != null && request !== loadRequest) throw new Error('PDF render superseded by a newer request')
  const controller = new AbortController(); activePdfRenders.add(controller)
  try { return await pool.render(index, pixels, controller.signal) }
  finally { activePdfRenders.delete(controller) }
}
async function loadWithRequest(blob, name, request) {
  hidePopup(false)
  setBusy(true, 'Reading the music…', request)
  try {
    const { model, image } = await recognize(blob, { request })
    if (request !== loadRequest) return false
    if (!model.staves.length || !model.notes.length) throw new Error('No printed music was found')
    overlay.setAttribute('aria-label', DEFAULT_OVERLAY_LABEL)
    closeDocument()
    S.document = createScoreDocument({ kind:'image', name, pageCount:1 })
    S.document.sourceKey = `${name}:${blob.size}`
    const state = cachePage(S.document, 1, { status:'ready', model, image, renderer:new Renderer(image, model), locks:new Map() })
    S.activePageState = state
    S.model = state.model; S.image = state.image; S.renderer = state.renderer; S.name = pageFileStem(S.document)
    S.locks = state.locks; S.part = 0; S.suggestion = 0; S.selectedId = null; S.keyboardIndex = 0
    showStage()
    rebuildParts()
    if (!await replan(false)) return false
    fitPageZoom(); layoutPage()
    return true
  } catch (error) {
    if (request === loadRequest) setStatus(`<b>Could not read this image:</b> ${escapeHtml(error.message)}. Try a flatter, sharper photo with the full staff width in frame.`)
    return false
  } finally { setBusy(false, '', request) }
}

async function loadPdfWithRequest(blob, name, request) {
  hidePopup(false); setBusy(true, 'Opening PDF…', request)
  let pool = null
  try {
    if (blob.size > MAX_PDF_BYTES) throw new Error(`PDF is ${(blob.size / 1048576).toFixed(1)} MB; the prototype limit is 100 MB`)
    const { PdfPool } = await pdfModule()
    pool = await PdfPool.open(blob, Math.max(1, Math.min(4, (navigator.hardwareConcurrency || 2) - 1)))
    if (pool.numPages > MAX_PDF_PAGES) throw new Error(`PDF has ${pool.numPages} pages; the prototype limit is ${MAX_PDF_PAGES}`)
    if (request !== loadRequest) { pool.destroy(); return false }
    closeDocument(); resetPageGlobals()
    const doc = createScoreDocument({ kind:'pdf', name, pageCount:pool.numPages, pdfPool:pool })
    doc.sourceKey = `${name}:${blob.size}`
    S.document = doc
    $('pages').hidden = false; $('exportPdf').hidden = false; $('exportPdf').disabled = !!pdfExportPromise
    buildPageStrip()
    await openPage(1, { request, fit:true })
    if (S.document === doc && S.activePageState) return true
    if (S.document === doc) {
      closeDocument(); resetPageGlobals(); clearPlanUi(); hideStage()
    }
    if (request === loadRequest) throw new Error('The first PDF page could not be installed')
    return false
  } catch (error) {
    if (request !== loadRequest) { if (S.document?.pdfPool !== pool) pool?.destroy(); return false }
    if (S.document?.pdfPool === pool) { closeDocument(); resetPageGlobals(); clearPlanUi(); hideStage() }
    else pool?.destroy()
    if (request === loadRequest) setStatus(`<b>Could not open this PDF:</b> ${escapeHtml(error.message)}`)
    return false
  } finally { setBusy(false, '', request) }
}

function thumbOf(source) {
  const thumb = document.createElement('canvas'), scale = 160 / Math.max(source.width, source.height)
  thumb.width = Math.max(1, Math.round(source.width * scale)); thumb.height = Math.max(1, Math.round(source.height * scale))
  thumb.getContext('2d').drawImage(source, 0, 0, thumb.width, thumb.height)
  thumb.setAttribute('aria-hidden', 'true')
  return thumb
}

function pageUi() {
  const doc = S.document, pdf = doc?.kind === 'pdf'
  $('tPrev').hidden = $('tNext').hidden = $('turnPagesLabel').hidden = !pdf
  if (!pdf) return
  $('pageNo').textContent = `${doc.page} / ${doc.pageCount}`
  $('prevPage').disabled = $('tPrev').disabled = doc.page <= 1; $('nextPage').disabled = $('tNext').disabled = doc.page >= doc.pageCount
  document.querySelectorAll('#thumbs button').forEach(button => button.setAttribute('aria-current', +button.dataset.page === doc.page ? 'page' : 'false'))
  document.querySelector(`#thumbs button[data-page="${doc.page}"]`)?.scrollIntoView({ block:'nearest', inline:'nearest' })
}

function buildPageStrip() {
  const doc = S.document, strip = $('thumbs'); strip.innerHTML = ''
  if (!doc || doc.kind !== 'pdf') return
  const observer = new IntersectionObserver(entries => entries.forEach(entry => {
    if (!entry.isIntersecting) return
    observer.unobserve(entry.target)
    const button = entry.target, index = +button.dataset.page
    const put = thumb => { if (S.document === doc && button.isConnected) button.prepend(thumb) }
    if (doc.thumbs.has(index)) { put(doc.thumbs.get(index)); return }
    doc.thumbQueue ||= Promise.resolve()
    doc.thumbQueue = doc.thumbQueue.then(async () => {
      if (S.document !== doc) return
      const { canvas } = await doc.pdfPool.render(index, 160), thumb = thumbOf(canvas)
      doc.thumbs.set(index, thumb); put(thumb)
    }).catch(() => {})
  }), { root:strip, rootMargin:'180px' })
  doc.thumbnailObserver = observer
  for (let index = 1; index <= doc.pageCount; index++) {
    const button = document.createElement('button'); button.dataset.page = index; button.setAttribute('aria-label', `Page ${index}`)
    button.innerHTML = `<span>${index}</span>`
    button.onclick = () => openPage(index, { fit:true })
    strip.appendChild(button); observer.observe(button)
  }
  pageUi()
}

function clearPlanUi() {
  $('alternatives').innerHTML = ''; $('noteList').innerHTML = ''
  $('part').innerHTML = '<option>—</option>'; $('part').disabled = true
}

function showNonMusicPage(state) {
  S.activePageState = state; state.lastUsed = performance.now()
  S.model = null; S.image = state.image; S.renderer = null; S.score = null; S.plan = null; S.items = []
  overlay.setAttribute('aria-label', `PDF page ${state.index} of ${S.document.pageCount}, no recognized music.`)
  S.locks = state.locks; S.part = state.part; S.suggestion = state.suggestion; S.keyboardIndex = state.keyboardIndex; S.selectedId = null
  page.width = state.image.width; page.height = state.image.height; overlay.width = page.width; overlay.height = page.height
  pageCtx.drawImage(state.image, 0, 0); overlayCtx.clearRect(0, 0, overlay.width, overlay.height)
  S.name = pageFileStem(S.document, state.index)
  if (S.document?.kind === 'pdf') S.document.page = state.index
  showStage()
  clearPlanUi(); fitPageZoom(); layoutPage(); pageUi()
  setStatus(`Page ${state.index} of ${S.document.pageCount} · <b>no staves found</b> · kept unchanged.`)
  trimPageCache(S.document, state.index)
}

function showFailedPage(state) {
  S.activePageState = state; state.lastUsed = performance.now()
  S.model = null; S.image = state.image; S.renderer = null; S.score = null; S.plan = null; S.items = []
  S.locks = state.locks; S.part = state.part; S.suggestion = state.suggestion; S.keyboardIndex = state.keyboardIndex; S.selectedId = null
  page.width = state.image.width; page.height = state.image.height; overlay.width = page.width; overlay.height = page.height
  pageCtx.drawImage(state.image, 0, 0); overlayCtx.clearRect(0, 0, overlay.width, overlay.height)
  S.name = pageFileStem(S.document, state.index)
  if (S.document?.kind === 'pdf') S.document.page = state.index
  overlay.setAttribute('aria-label', `PDF page ${state.index} of ${S.document.pageCount}, recognition failed. Activate this page again to retry.`)
  showStage()
  clearPlanUi(); fitPageZoom(); layoutPage(); pageUi()
  setStatus(`Page ${state.index} of ${S.document.pageCount} · <b>recognition failed:</b> ${escapeHtml(state.error || 'unknown error')} · choose the page again to retry.`)
  trimPageCache(S.document, state.index)
}

async function installReadyPage(state, { fit=false } = {}) {
  S.activePageState = state; state.lastUsed = performance.now()
  S.model = state.model; S.image = state.image; S.renderer = state.renderer; S.score = state.score
  S.plan = state.plan; S.items = state.items; S.locks = state.locks; S.part = state.part; S.suggestion = state.suggestion
  S.keyboardIndex = state.keyboardIndex; S.selectedId = null; S.name = pageFileStem(S.document, state.index)
  overlay.setAttribute('aria-label', `${DEFAULT_OVERLAY_LABEL}${S.document?.kind === 'pdf' ? ` Page ${state.index} of ${S.document.pageCount}.` : ''}`)
  showStage()
  rebuildParts()
  if (!await replan(false)) return false
  if (S.document?.kind === 'pdf') S.document.page = state.index
  if (fit) { fitPageZoom(); layoutPage() }
  pageUi(); trimPageCache(S.document, state.index)
  setTimeout(prefetchNext, 400)
  return true
}

function restorePagePointer(doc, requestedIndex, request) {
  if (S.document === doc && doc.navigationRequest === request && doc.page === requestedIndex && S.activePageState) {
    doc.page = S.activePageState.index; pageUi()
  }
}

async function openPage(index, { request=null, fit=false } = {}) {
  const doc = S.document
  if (!doc || doc.kind !== 'pdf' || index < 1 || index > doc.pageCount) return false
  syncCurrentPage(); hidePopup(false)
  const ownRequest = request ?? beginLoadRequest(), owner = Symbol(`page-${index}`)
  doc.navigationRequest = ownRequest
  setBusy(true, `Reading page ${index}…`, owner)
  doc.page = index; pageUi()
  // the page being read in the background: wait for it rather than reading it twice
  if (doc.prefetch?.index === index) { await doc.prefetch.job; if (S.document !== doc || ownRequest !== loadRequest) { setBusy(false, '', owner); return false } }
  const state = pageState(doc, index), recognizedFifths = precedingPageFifths(doc, index)
  try {
    if (state.status === 'ready' && state.recognizedFifths === recognizedFifths) return await installReadyPage(state, { fit })
    if (state.status === 'ready') invalidatePagePayload(state)
    if (state.status === 'nonmusic') { showNonMusicPage(state); return false }
    let rendered
    try {
      rendered = state.status === 'failed' && state.image
        ? { canvas:state.image, widthPt:state.widthPt, heightPt:state.heightPt }
        : await renderPdf(doc.pdfPool, index, 3000, ownRequest)
    } catch (error) {
      if (S.document !== doc || ownRequest !== loadRequest) { restorePagePointer(doc, index, ownRequest); return false }
      if (request != null) throw error
      if (S.document === doc && ownRequest === loadRequest) {
        doc.page = S.activePageState?.index || index; pageUi()
        setStatus(`<b>Could not render PDF page ${index}:</b> ${escapeHtml(error.message)}`)
      }
      return false
    }
    if (S.document !== doc || ownRequest !== loadRequest) { restorePagePointer(doc, index, ownRequest); return false }
    let probe
    try { probe = await recognize(rendered.canvas, { probe:true, request:ownRequest }) }
    catch (error) {
      if (S.document !== doc || ownRequest !== loadRequest || /superseded/i.test(error.message)) { restorePagePointer(doc, index, ownRequest); return false }
      cachePage(doc, index, { status:'failed', image:rendered.canvas, error:error.message, widthPt:rendered.widthPt, heightPt:rendered.heightPt })
      showFailedPage(state); return false
    }
    if (S.document !== doc || ownRequest !== loadRequest) { restorePagePointer(doc, index, ownRequest); return false }
    if (!probe.staves) {
      cachePage(doc, index, { status:'nonmusic', image:rendered.canvas, error:null, widthPt:rendered.widthPt, heightPt:rendered.heightPt })
      showNonMusicPage(state); return false
    }
    try {
      const { model, image } = await recognize(rendered.canvas, { request:ownRequest, fifths:recognizedFifths })
      if (S.document !== doc || ownRequest !== loadRequest) { restorePagePointer(doc, index, ownRequest); return false }
      applyPageCorrections(model, state)
      if (!model.staves.length || !model.notes.length) throw new Error('No printed music was found after the staff probe')
      cachePage(doc, index, {
        status:'ready', model, image, renderer:new Renderer(image, model), score:buildScore(model), error:null, recognizedFifths,
        widthPt:rendered.widthPt, heightPt:rendered.heightPt,
      })
      return await installReadyPage(state, { fit:true })
    } catch (error) {
      if (S.document !== doc || ownRequest !== loadRequest || /superseded/i.test(error.message)) { restorePagePointer(doc, index, ownRequest); return false }
      cachePage(doc, index, { status:'failed', image:rendered.canvas, error:error.message, widthPt:rendered.widthPt, heightPt:rendered.heightPt })
      showFailedPage(state)
      return false
    }
  } finally { setBusy(false, '', owner) }
}

async function load(blob, name='score') {
  const request = beginLoadRequest()
  const { isPdf } = await pdfModule()
  if (request !== loadRequest) return false
  return await isPdf(blob) ? loadPdfWithRequest(blob, name, request) : loadWithRequest(blob, name, request)
}

async function loadSource(source, name) {
  const request = beginLoadRequest()
  hidePopup(false); setBusy(true, 'Loading score…', request)
  try {
    const blob = await source
    if (request !== loadRequest) return false
    const { isPdf } = await pdfModule()
    if (request !== loadRequest) return false
    return await isPdf(blob) ? loadPdfWithRequest(blob, name, request) : loadWithRequest(blob, name, request)
  } catch (error) {
    if (request === loadRequest) setStatus(`<b>Could not load this score:</b> ${escapeHtml(error.message)}`)
    return false
  } finally { setBusy(false, '', request) }
}

function rebuildParts() {
  S.score = buildScore(S.model)
  rememberPageFifths(S.activePageState, S.score)
  const select = $('part'); select.innerHTML = ''
  S.score.parts.forEach((part, index) => {
    const count = part.measures.flatMap(measure => measure.events).filter(event => event.kind === 'note').reduce((sum, event) => sum + event.notes.length, 0)
    select.add(new Option(`Part ${index + 1} · ${count} notes`, index))
  })
  S.part = Math.min(S.part, Math.max(0, S.score.parts.length - 1)); select.value = S.part; select.disabled = S.score.parts.length < 2
}

async function replan(showBusy=true) {
  if (!S.model || !S.activePageState) return false
  const activeState = S.activePageState, activeModel = S.model
  const busyOwner = Symbol('replan')
  if (showBusy) setBusy(true, 'Planning fingerings…', busyOwner)
  await new Promise(resolve => setTimeout(resolve, 0))
  if (S.activePageState !== activeState || S.model !== activeModel) { if (showBusy) setBusy(false, '', busyOwner); return false }
  try {
    S.score = buildScore(activeModel)
    const instrument = selectedInstrument(activeState).instrument
    S.plan = planFingering(S.score, S.part, {
      instrument,
      mode:$('mode').value,
      quarterSeconds:60 / Math.max(30, Math.min(260, +$('tempo').value || 120)),
      locks:S.locks,
      limit:4,
      minChanges:1,
      candidatePool:48,
    })
    S.planRevision++
    S.suggestion = Math.min(S.suggestion, Math.max(0, S.plan.suggestions.length - 1))
    renderAlternatives(); renderPage(); renderNoteList(); updateStatus(); refreshInk()
    return true
  } catch (error) {
    setStatus(`<b>Could not plan this part:</b> ${escapeHtml(error.message)}`)
    return false
  } finally { if (showBusy) setBusy(false, '', busyOwner) }
}

function renderAlternatives() {
  const box = $('alternatives'); box.innerHTML = ''
  for (const suggestion of S.plan.suggestions) {
    const button = document.createElement('button')
    button.className = suggestion.rank - 1 === S.suggestion ? 'active' : ''
    button.setAttribute('aria-pressed', suggestion.rank - 1 === S.suggestion)
    const changes = suggestion.rank === 1 ? 'recommended held-safe path' : `${suggestion.changes.notes} notes · ${suggestion.changes.strings} strings · ${suggestion.changes.positions} positions`
    button.innerHTML = `<b>${escapeHtml(suggestion.label)}</b><small>${changes}${suggestion.costDelta ? ` · +${suggestion.costDelta.toFixed(2)}` : ''}</small>`
    button.onclick = () => {
      hidePopup(false); S.suggestion = suggestion.rank - 1; renderAlternatives(); renderPage(); renderNoteList(); updateStatus()
      $('alternatives').querySelectorAll('button')[S.suggestion]?.focus()
    }
    box.appendChild(button)
  }
  if (S.plan.exhausted && S.plan.suggestions.length < 2) {
    const p = document.createElement('p'); p.textContent = 'No distinct alternative was found inside this passage.'; box.appendChild(p)
  }
}

function fitPageZoom() {
  if (!page.width) return
  const available = Math.max(260, $('wrap').clientWidth - (document.body.classList.contains('reader') ? 14 : 32))
  S.zoom = Math.max(0.1, Math.min(1, available / page.width))
  // Stand: the whole page in view, like a part on a stand
  if (STAND.dir) S.zoom = Math.max(0.1, Math.min(S.zoom, (Math.max(200, $('wrap').clientHeight - 12)) / page.height))
  $('zoom').value = S.zoom
}

function renderNoteList() {
  const list = $('noteList'); if (!list) return
  list.innerHTML = ''
  S.items.forEach((item, index) => {
    const button = document.createElement('button')
    const name = item.source.name || `note ${index + 1}`
    const choice = item.playable ? `${item.stringLabel} string, finger ${item.fingerLabel}${item.showPosition ? `, position ${item.positionLabel}` : ''}${item.divisi ? ', independent divisi fingering; the full chord does not fit one player' : ''}` : 'not playable'
    button.textContent = `${name} · ${item.playable ? item.stringLabel + item.fingerLabel : '×'}`
    button.setAttribute('aria-label', `${name}, ${choice}${item.locked ? ', manually locked' : ''}`)
    button.onclick = event => {
      S.keyboardIndex = index
      const rect = event.currentTarget.getBoundingClientRect()
      showPopup(item, { clientX:rect.right, clientY:rect.top }, event.currentTarget)
    }
    list.appendChild(button)
  })
}

function layoutPage() {
  if (!page.width) return
  const width = page.width * S.zoom, height = page.height * S.zoom
  $('stage').style.width = `${width}px`; $('stage').style.height = `${height}px`
  for (const canvas of [page, overlay, ink, heads]) { canvas.style.width = `${width}px`; canvas.style.height = `${height}px` }
}

function scrollAnnotationIntoView(item) {
  const wrap = $('wrap'), stage = $('stage')
  const label = labelAt(item, fingerSize())
  const x = stage.offsetLeft + label.x * S.renderer.r * S.zoom
  const y = stage.offsetTop + label.y * S.renderer.r * S.zoom
  const left = Math.max(0, x - wrap.clientWidth / 2), top = Math.max(0, y - wrap.clientHeight / 2)
  wrap.scrollTo({ left, top, behavior:'instant' })
}

function renderPage() {
  if (!S.renderer || !S.plan) return
  page.width = overlay.width = S.renderer.W; page.height = overlay.height = S.renderer.H
  pageCtx.drawImage(S.renderer.src, 0, 0)
  overlayCtx.clearRect(0, 0, overlay.width, overlay.height)
  S.items = annotationItems(S.plan, S.suggestion, { instrument:S.plan.instrument })
  S.keyboardIndex = Math.max(0, Math.min(S.keyboardIndex, Math.max(0, S.items.length - 1)))
  if ($('recognition').checked) drawRecognition(overlayCtx, S.model, S.renderer.r, S.score, S.items.find(item => item.id === S.selectedId)?.source)
  if ($('fingerings').checked) drawFingerings(overlayCtx, S.items, S.renderer.r, { selectedId:S.selectedId, showDetails:$('details').checked, size:fingerSize() })
  layoutPage(); syncCurrentPage()
}

function updateStatus() {
  const badBars = S.score.measures.filter(measure => measure.status === 'under' || measure.status === 'over').length
  const divisi = S.plan.diagnostics.filter(diagnostic => diagnostic.code === 'chord-capacity').length
  const rejected = S.plan.diagnostics.filter(diagnostic => diagnostic.code !== 'held-conflict' && diagnostic.code !== 'chord-capacity').length
  const conflicts = S.plan.diagnostics.filter(diagnostic => diagnostic.code === 'held-conflict').length
  const chosen = S.plan.suggestions[S.suggestion]
  const pagePrefix = S.document?.kind === 'pdf' ? `Page ${S.document.page} of ${S.document.pageCount} · ` : ''
  const auto = $('instrument').value === 'auto' ? ` · auto: <b>${escapeHtml(INSTRUMENTS[S.plan.instrument].name)}</b>` : ''
  setStatus(`${pagePrefix}<b>${S.model.staves.length}</b> staves · <b>${S.model.notes.length}</b> recognized notes · part ${S.part + 1}: <b>${S.plan.notes.length}</b> notes${auto} · <b>${S.plan.suggestions.length}</b> fingering paths · ${escapeHtml(chosen.label)}${badBars ? ` · <b>${badBars}</b> bars need checking` : ''}${rejected ? ` · <b>${rejected}</b> notes not playable` : ''}${divisi ? ` · <b>${divisi}</b> chord note${divisi > 1 ? 's' : ''} fingered independently for divisi` : ''}${conflicts ? ` · <b>${conflicts}</b> incompatible string lock${conflicts > 1 ? 's' : ''}` : ''} · read in ${Math.round(S.model.ms)} ms`)
}

function placePopup(event) {
  const pop = $('pop')
  pop.style.visibility = 'hidden'; pop.style.display = 'block'; pop.style.left = '8px'; pop.style.top = '8px'
  const at = toLocal(event.clientX, event.clientY, STAND.dir, innerWidth, innerHeight)
  const W = STAND.dir ? $('app').offsetWidth : innerWidth, H = STAND.dir ? $('app').offsetHeight : innerHeight
  const left = Math.max(8, Math.min(W - pop.offsetWidth - 8, at.u + 10))
  const top = Math.max(8, Math.min(H - pop.offsetHeight - 8, at.v + 10))
  pop.style.left = `${left}px`; pop.style.top = `${top}px`; pop.style.visibility = 'visible'
  pop.querySelector('button:not(:disabled)')?.focus()
}
function hidePopup(restoreFocus=true) {
  const opener = S.popupOpener
  $('pop').style.display = 'none'; S.selectedId = null; S.popupOpener = null
  if (S.plan) renderPage()
  if (restoreFocus && opener?.isConnected) queueMicrotask(() => opener.focus())
}
function showPopup(item, event, opener=event.currentTarget) {
  S.selectedId = item.id; S.popupOpener = opener || overlay; renderPage()
function focusAfterEdit(opener, id, fallbackIndex) {
  if (opener === overlay) { overlay.focus(); return }
  const found = S.items.findIndex(item => item.id === id)
  const index = found >= 0 ? found : Math.max(0, Math.min(fallbackIndex, S.items.length - 1))
  const target = $('noteList').querySelectorAll('button')[index]
  ;(target || overlay).focus()
}
  const instrument = S.plan?.instrument || selectedInstrument().instrument
  const profile = INSTRUMENTS[instrument], note = item.source, pop = $('pop')
  const lock = S.locks.get(item.id), input = S.plan.notes[item.index]
  const playableStrings = profile.strings.map((_, string) => solveFingering([{ pitch:input.pitch, on:0, off:0.5, lockString:string }], {
    instrument, mode:$('mode').value, preserveHeldNotes:false, templates:false,
  }).assignments[0].playable)
  pop.innerHTML = `<h3 id="popTitle">${escapeHtml(note.name || item.id)} · finger ${item.fingerLabel}${item.stringLabel ? ` on ${item.stringLabel}` : ''}</h3>
    <p>${item.warnings.length ? `<b>${escapeHtml(item.warnings.map(warning => warning.message).join(' '))}</b><br>` : ''}Choose a string to re-plan the whole passage around this note, or correct the recognized pitch.</p>
    <div class="row"><span>String</span><button data-string="auto" aria-pressed="${lock == null}">auto</button>${profile.strings.map((name, index) => `<button data-string="${index}" aria-pressed="${lock === index}" ${playableStrings[index] ? '' : 'disabled'}>${name}</button>`).join('')}</div>
    <div class="row"><span>Pitch</span><button id="down" aria-label="Move recognized pitch down one staff step">▼</button><button id="up" aria-label="Move recognized pitch up one staff step">▲</button><button data-acc="-1" aria-label="Set flat" aria-pressed="${note.accid?.type === -1}">♭</button><button data-acc="0" aria-label="Set natural" aria-pressed="${note.accid?.type === 0}">♮</button><button data-acc="1" aria-label="Set sharp" aria-pressed="${note.accid?.type === 1}">♯</button><button data-acc="none" aria-pressed="${!note.accid}">no accidental</button></div>
    <div class="row"><button id="playHere">▶ Play from this bar</button><button id="loopHere">⟳ Loop this bar…</button><button id="remove" class="danger">Not a note</button><button id="close">Close</button></div>`
  placePopup(event)
  pop.querySelectorAll('[data-string]').forEach(button => button.onclick = async () => {
    const opener = S.popupOpener
    if (button.dataset.string === 'auto') S.locks.delete(item.id); else S.locks.set(item.id, +button.dataset.string)
    hidePopup(false); await replan(); focusAfterEdit(opener, item.id, item.index)
  })
  const editPitch = async delta => {
    const opener = S.popupOpener
    S.locks.delete(item.id); note.p += delta; recordCorrection(item.id, { p:note.p, deleted:false }); note.y = yOfP(note.st, note.p, note.x); interpret(note.st); hidePopup(false); await replan(); focusAfterEdit(opener, item.id, item.index)
  }
  $('down').onclick = () => editPitch(-1); $('up').onclick = () => editPitch(1)
  pop.querySelectorAll('[data-acc]').forEach(button => button.onclick = async () => {
    const opener = S.popupOpener
    S.locks.delete(item.id)
    const value = button.dataset.acc, accidental = value === 'none' ? null : +value
    recordCorrection(item.id, { acc:accidental, deleted:false })
    note.accid = accidental == null ? null : { ...(note.accid || { ids:[], box:[note.box[0] - 12, note.y - 12, note.box[0] - 2, note.y + 12] }), type:accidental }
    interpret(note.st); hidePopup(false); await replan(); focusAfterEdit(opener, item.id, item.index)
  })
  $('remove').onclick = async () => {
    const opener = S.popupOpener
    const staffIndex = note.st?.notes?.indexOf(note) ?? -1, modelIndex = S.model?.notes?.indexOf(note) ?? -1
    if (staffIndex < 0 || modelIndex < 0) { hidePopup(false); focusAfterEdit(opener, item.id, item.index); return }
    S.locks.delete(item.id); recordCorrection(item.id, { deleted:true })
    note.st.notes.splice(staffIndex, 1); S.model.notes.splice(modelIndex, 1)
    S.keyboardIndex = Math.max(0, Math.min(item.index, S.items.length - 2))
    interpret(note.st); hidePopup(false); rebuildParts(); await replan(); focusAfterEdit(opener, item.id, item.index)
  }
  $('close').onclick = hidePopup
  $('playHere').onclick = () => { const tick = tickOfNote(note); hidePopup(false); if (P.loop && !P.loop.measures.includes(measureOfNote(note))) clearLoop(); startPlayback(tick) }
  $('loopHere').onclick = () => {
    const measure = measureOfNote(note); hidePopup(false); if (!measure) return
    stopPlayback(); P.loop = null; P.picking = { first:measure }; loopLabel(); clearHeads()
    hint(`Bar ${measure.number}: tap the last bar of the passage (or the same bar again).`, 0)
  }
}

function resetDocumentAlternatives() {
  for (const state of S.document?.pages.values() || []) { state.suggestion = 0; state.plan = null; state.items = [] }
  S.suggestion = 0
}

overlay.addEventListener('click', event => {
  const pt = canvasPoint(event, overlay)
  // Stand: a tap on the left third goes back a page, anywhere else forward
  if (STAND.dir && !P.picking) { turnPage(pt.x < overlay.width / 3 ? -1 : 1); return }
  if (!S.renderer) return
  const x = pt.x / S.renderer.r, y = pt.y / S.renderer.r
  if (pickLoopBar(x, y)) return
  // Reader: a tap plays from the bar under it (a bar outside the loop ends the loop)
  if (document.body.classList.contains('reader')) {
    const measure = S.score && measureAt(S.score, { x, y }); if (!measure) return
    if (P.loop && !P.loop.measures.includes(measure)) clearLoop()
    startPlayback(measureStarts(S.score).get(measure)); return
  }
  if (!S.items.length) return
  const size = fingerSize(), item = hitAnnotation(S.items, x, y, 18 * Math.max(1, size), it => labelAt(it, size))
  if (item) showPopup(item, event); else hidePopup()
})

document.addEventListener('keydown', event => { if (event.key === 'Escape') hidePopup() })

overlay.addEventListener('keydown', event => {
  if (!S.items.length || document.body.classList.contains('reader')) return
  if (event.key === 'ArrowRight' || event.key === 'ArrowDown') S.keyboardIndex = (S.keyboardIndex + 1) % S.items.length
  else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') S.keyboardIndex = (S.keyboardIndex - 1 + S.items.length) % S.items.length
  else if (event.key === 'Home') S.keyboardIndex = 0
  else if (event.key === 'End') S.keyboardIndex = S.items.length - 1
  else if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    const rect = overlay.getBoundingClientRect()
    showPopup(S.items[S.keyboardIndex], { clientX:rect.left + 12, clientY:rect.top + 12 }, overlay)
    return
  } else return
  event.preventDefault()
  S.selectedId = S.items[S.keyboardIndex].id
  overlay.setAttribute('aria-label', `Selected ${S.items[S.keyboardIndex].source.name || `note ${S.keyboardIndex + 1}`}, ${S.keyboardIndex + 1} of ${S.items.length}. Press Enter to edit.`)
  renderPage(); scrollAnnotationIntoView(S.items[S.keyboardIndex])
})
$('instrument').onchange = () => { hidePopup(false); resetDocumentAlternatives(); replan() }
$('mode').onchange = () => { hidePopup(false); resetDocumentAlternatives(); replan() }
$('part').onchange = () => { S.part = +$('part').value; S.suggestion = 0; hidePopup(false); replan() }
$('tempo').onchange = () => { if (P.player?.playing) P.player.setRate(currentTempo() * QUARTER / 60); resetDocumentAlternatives(); replan() }
$('recognition').onchange = renderPage
$('details').onchange = renderPage
$('fingerings').onchange = renderPage
// fingering size: 50-200% of the 24 px pencil numeral, remembered
const fingerSize = () => Math.max(0.5, Math.min(2, +$('fingerSize').value || 1))
function showFingerSize() { $('fingerSizeOut').textContent = `${Math.round(fingerSize() * 100)}%` }
try { const saved = +localStorage.getItem('score-fingering:size'); if (saved >= 0.5 && saved <= 2) $('fingerSize').value = saved } catch {}
showFingerSize()
$('fingerSize').oninput = () => { showFingerSize(); if (S.plan) renderPage() }
$('fingerSize').onchange = () => { try { localStorage.setItem('score-fingering:size', String(fingerSize())) } catch {} }
$('zoom').oninput = event => { S.zoom = +event.target.value; layoutPage() }
window.addEventListener('resize', () => { if (document.body.classList.contains('reader')) fitPageZoom(); layoutPage() })

for (const id of ['camera','camera2','file']) $(id).onchange = event => {
  const file = event.target.files[0]; if (file) load(file, file.name); event.target.value = ''
}
const sample = () => loadSource(fetch(new URL('./sample-sibelius-symphony-2-viola.pdf', import.meta.url)).then(response => {
  if (!response.ok) throw new Error(`sample request failed (${response.status})`)
  return response.blob()
}), 'Sibelius Symphony No. 2 Viola.pdf')
$('prevPage').onclick = () => S.document?.kind === 'pdf' && openPage(S.document.page - 1, { fit:true })
$('nextPage').onclick = () => S.document?.kind === 'pdf' && openPage(S.document.page + 1, { fit:true })
$('sample').onclick = sample; $('sample2').onclick = sample
window.addEventListener('paste', event => { const item = [...(event.clipboardData?.items || [])].find(entry => entry.kind === 'file'); if (item) { const file = item.getAsFile(); if (file) load(file, file.name || 'pasted-score') } })
document.addEventListener('dragover', event => event.preventDefault())
document.addEventListener('drop', event => { event.preventDefault(); const file = event.dataTransfer.files[0]; if (file) load(file, file.name || 'dropped-score') })


const canvasBlob = (canvas, type, quality) => new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error(`Could not encode ${type}`)), type, quality))
async function jpegPage(canvas) { return new Uint8Array(await (await canvasBlob(canvas, 'image/jpeg', 0.9)).arrayBuffer()) }

const currentPlanningSettings = () => {
  const instrumentMode = $('instrument').value
  return {
    instrumentMode,
    instrument:instrumentMode === 'auto' ? selectedInstrument().instrument : instrumentMode,
    documentName:S.document?.name || S.name,
    mode:$('mode').value,
    quarterSeconds:60 / Math.max(30, Math.min(260, +$('tempo').value || 120)),
    showDetails:$('details').checked,
    showFingerings:$('fingerings').checked,
    fingerSize:fingerSize(),
    autoInstruments:new Map(S.document?.autoInstruments || []),
    resolvedInstruments:new Set(),
  }
}

function resolvePlanningInstrument(state, settings) {
  let instrument = settings.instrument
  if (settings.instrumentMode === 'auto') {
    const retained = settings.autoInstruments?.get(state.part)
    const detected = detectViolinViola(state.score, state.part, { name:settings.documentName, fallback:retained?.instrument || null })
    state.autoInstruments?.set(state.part, detected)
    if (STRONG_AUTO_REASONS.has(detected.reason)) settings.autoInstruments?.set(state.part, detected)
    instrument = detected.instrument
  }
  settings.resolvedInstruments?.add(instrument)
  return instrument
}

function exportInstrumentLabel(settings) {
  const instruments = [...settings.resolvedInstruments]
  return instruments.length === 1 ? instruments[0] : instruments.length > 1 ? 'auto' : settings.instrument
}

function planPageState(state, settings = currentPlanningSettings()) {
  if (state.status !== 'ready') return state
  state.score = buildScore(state.model)
  rememberPageFifths(state, state.score)
  const instrument = resolvePlanningInstrument(state, settings)
  state.plan = planFingering(state.score, state.part, {
    instrument,
    mode:settings.mode,
    quarterSeconds:settings.quarterSeconds,
    locks:state.locks,
    limit:4, minChanges:1, candidatePool:48,
  })
  state.suggestion = Math.min(state.suggestion, Math.max(0, state.plan.suggestions.length - 1))
  state.items = annotationItems(state.plan, state.suggestion, { instrument })
  return state
}

function composePageState(state, settings, inkMods = null) {
  if (state.status !== 'ready') return state.image
  planPageState(state, settings)
  const canvas = document.createElement('canvas'); canvas.width = state.renderer.W; canvas.height = state.renderer.H
  const context = canvas.getContext('2d'); context.drawImage(state.renderer.src, 0, 0)
  if (settings.showFingerings !== false) drawFingerings(context, state.items, state.renderer.r, { showDetails:settings.showDetails, size:settings.fingerSize ?? 1 })
  const annotations = inkMods && pageInk(S.document, state.index)
  if (annotations?.length) {
    try {
      const { irc, items, surface } = inkSurface(inkMods, state.model, state.score, state.renderer.r)
      inkMods.drawAnnotations(context, surface, annotations, items)
    } catch (error) { console.warn('annotations not exported', error) }
  }
  return canvas
}

async function ensurePageForExport(doc, index, request) {
  const cached = doc.pages.get(index), recognizedFifths = precedingPageFifths(doc, index)
  if (cached?.status === 'failed') throw new Error(`Recognition failed on page ${index}: ${cached.error || 'unknown error'}`)
  if (cached?.status === 'nonmusic') return { state:cached, temporary:false, sourceCanvas:null }
  if (cached?.status === 'ready' && cached.recognizedFifths === recognizedFifths) return { state:cached, temporary:false, sourceCanvas:null }
  if (cached?.status === 'ready') invalidatePageKeyEvidence(cached)
  const rendered = await renderPdf(doc.pdfPool, index, 2400, request)
  try {
    let probe
    try { probe = await recognize(rendered.canvas, { probe:true, request }) }
    catch (error) { throw new Error(`Could not inspect page ${index}: ${error.message}`) }
    if (!probe.staves) return {
      state:{ ...pageState(doc, index), status:'nonmusic', image:rendered.canvas, widthPt:rendered.widthPt, heightPt:rendered.heightPt },
      temporary:true, sourceCanvas:rendered.canvas,
    }
    try {
      const { model, image } = await recognize(rendered.canvas, { request, fifths:recognizedFifths })
      applyPageCorrections(model, pageState(doc, index))
      if (!model.staves.length || !model.notes.length) throw new Error('no recognized notes after the staff probe')
      return {
        state:{ ...pageState(doc, index), status:'ready', model, image, renderer:new Renderer(image, model), score:buildScore(model), recognizedFifths, widthPt:rendered.widthPt, heightPt:rendered.heightPt },
        temporary:true, sourceCanvas:rendered.canvas,
      }
    } catch (error) { throw new Error(`Recognition failed on page ${index}: ${error.message}`) }
  } catch (error) {
    rendered.canvas.width = 1; rendered.canvas.height = 1
    throw error
  }
}

async function runAnnotatedPdfExport() {
  const doc = S.document
  if (!doc || doc.kind !== 'pdf') return null
  syncCurrentPage()
  const revision = loadRequest, settings = currentPlanningSettings()
  const owner = Symbol('pdf-export'); setBusy(true, 'Annotating PDF…', owner)
  try {
    const inkMods = await inkModulesOrNull()
    const pages = []; let jpegBytes = 0
    for (let index = 1; index <= doc.pageCount; index++) {
      if (S.document !== doc || loadRequest !== revision) throw new Error('Export stopped because another document or page was opened')
      $('busy').firstElementChild.textContent = `Annotating PDF… page ${index} of ${doc.pageCount}`
      const { state, temporary, sourceCanvas } = await ensurePageForExport(doc, index, revision)
      if (S.document !== doc || loadRequest !== revision) throw new Error('Export stopped because another document or page was opened')
      let canvas = null
      try {
        canvas = composePageState(state, settings, inkMods)
        const jpeg = await jpegPage(canvas); jpegBytes += jpeg.length
        if (jpegBytes > MAX_EXPORT_JPEG_BYTES) throw new Error('Encoded pages exceed the 64 MB whole-document export limit')
        pages.push({ jpeg, w:canvas.width, h:canvas.height, widthPt:state.widthPt, heightPt:state.heightPt })
      } finally {
        if (canvas && canvas !== state.image) { canvas.width = 1; canvas.height = 1 }
        if (temporary) for (const disposable of [sourceCanvas, state.image, state.renderer?.src, state.renderer?.small]) if (disposable) { disposable.width = 1; disposable.height = 1 }
      }
    }
    if (S.document !== doc || loadRequest !== revision) throw new Error('Export stopped because the document changed')
    const { writePdf } = await pdfModule(), bytes = writePdf(pages)
    const instrument = exportInstrumentLabel(settings)
    const filename = `${doc.name}-${instrument}-fingering.pdf`
    const anchor = document.createElement('a'); anchor.href = URL.createObjectURL(new Blob([bytes], { type:'application/pdf' })); anchor.download = filename; anchor.click()
    setTimeout(() => URL.revokeObjectURL(anchor.href), 10000)
    return { bytes, pages }
  } catch (error) {
    if (S.document === doc && loadRequest === revision) setStatus(`<b>Could not export this PDF:</b> ${escapeHtml(error.message)}`)
    return null
  } finally { setBusy(false, '', owner) }
}

let pdfExportPromise = null
function exportAnnotatedPdf() {
  if (pdfExportPromise) return pdfExportPromise
  $('exportPdf').disabled = true
  pdfExportPromise = runAnnotatedPdfExport().finally(() => {
    pdfExportPromise = null
    if (S.document?.kind === 'pdf') $('exportPdf').disabled = false
  })
  return pdfExportPromise
}

$('export').onclick = async () => {
  if (!page.width) return
  syncCurrentPage()
  const state = S.activePageState
  let output
  if (state?.status === 'ready') output = composePageState(state, currentPlanningSettings(), await inkModulesOrNull())
  else {
    output = document.createElement('canvas'); output.width = page.width; output.height = page.height
    output.getContext('2d').drawImage(page, 0, 0)
  }
  const instrument = state?.plan?.instrument || selectedInstrument(state).instrument
  const filename = `${S.name}-${instrument}-fingering.png`
  try {
    const blob = await canvasBlob(output, 'image/png')
    const anchor = document.createElement('a'); anchor.href = URL.createObjectURL(blob); anchor.download = filename; anchor.click()
    setTimeout(() => URL.revokeObjectURL(anchor.href), 5000)
  } catch (error) { setStatus(`<b>Could not export this PNG:</b> ${escapeHtml(error.message)}`) }
  finally { if (output !== state?.image) { output.width = 1; output.height = 1 } }
}
$('exportPdf').onclick = exportAnnotatedPdf


// ---------- playback: a violin / viola voice (sound.js) on notation-ir's scheduler ----------
// The notes come from ScoreShift's performance() (ties merged, slurs legato, staccato short,
// dynamics), every part of the page on one clock (a divisi staff sounds with the bars it stands
// under), the metronome from its bar-aware beats(). A loop repeats a passage of bars, optionally
// starting slower and speeding up each pass.
const currentTempo = () => Math.max(30, Math.min(260, +$('tempo').value || 120))
const readerOn = () => document.body.classList.contains('reader')
const QUARTER = 96 // ScoreShift ticks per quarter note
function playUi(on) {
  $('play').setAttribute('aria-pressed', on); $('play').textContent = on ? '■ Stop' : '▶ Play'; $('play').setAttribute('aria-label', on ? 'Stop' : 'Play')
}
let hintTimer = null
/** A short message in the transport, visible in Reader mode too (the status line is hidden there). */
function hint(text, ms = 4000) {
  $('hint').textContent = text; clearTimeout(hintTimer)
  if (ms) hintTimer = setTimeout(() => { $('hint').textContent = '' }, ms)
}
function clearHeads() { P.headsKey = ''; drawHeadsLayer([]) }
function stopPlayback() {
  if (!P.player?.playing) return
  P.manual = true; P.player.stop(); P.manual = false
}
const scoreModules = () => Promise.all([
  import('../../random-sketches/vibes/scoreshift/export.js'),
  import('../../random-sketches/vibes/scoreshift/player.js'),
  import('./sound.js'),
]).then(([exp, player, sound]) => ({ performance:exp.performance, beats:player.beats, StringPlayer:sound.StringPlayer }))
/** The string each sounding note was fingered on, by onset tick and pitch. */
function fingeredStrings() {
  const strings = new Map(), plan = S.plan, chosen = plan?.suggestions?.[S.suggestion]
  if (!chosen) return strings
  const quarterSeconds = 60 / currentTempo()
  plan.notes.forEach((input, i) => {
    const a = chosen.assignments[i]
    if (a?.playable) strings.set(`${Math.round(input.on / quarterSeconds * QUARTER)}:${input.pitch}`, a.string)
  })
  return strings
}
/** Play the shown page from `fromTick` (96 per quarter; bars from measureStarts). */
async function startPlayback(fromTick = 0) {
  if (!S.model || !S.score) return false
  let mods
  try { mods = await scoreModules() }
  catch (error) { hint(`Playback is unavailable: ${error.message}`); return false }
  if (!S.model || !S.score) return false
  P.player ||= new mods.StringPlayer()
  const player = P.player
  player.onStop = onPlaybackStop
  player.metronome = $('metronome').checked
  player.sound = $('sound').value
  const instrument = S.plan?.instrument === 'violin' ? 'violin' : 'viola'
  if (player.sound === 'strings' && player.bank?.instrument !== instrument) {
    $('play').textContent = '… loading'; hint(`Loading the ${instrument} recordings…`, 0)
    const ok = await player.prepare(instrument)
    hint(ok ? '' : `The ${instrument} recordings could not load, playing a piano sound instead.`, ok ? 1 : 6000)
    if (!S.model || !S.score) return false
  } else player.instrument = instrument
  const loop = P.loop && P.loop.state === S.activePageState ? P.loop : null
  if (loop) {
    if (fromTick < loop.from || fromTick >= loop.to) fromTick = loop.from
    const base = +$('speed').value || 1
    loop.speed = $('ramp').checked ? Math.min(base, base * (0.6 + 0.05 * loop.pass)) : base
    player.setSpeed(loop.speed)
    loopLabel()
  } else player.setSpeed(+$('speed').value || 1)
  const { notes, events, total } = mods.performance(S.model, S.score)
  const strings = fingeredStrings()
  const end = loop ? loop.to : total + QUARTER / 4
  P.state = S.activePageState; P.events = events
  P.manual = true // a run already going is stopped first: that is not the end of the page
  try {
    player.total = total
    player.schedule({
      notes:notes.filter(n => !loop || n.tick < loop.to).map(n => ({ at:n.tick, dur:loop ? Math.min(n.sound, loop.to - n.tick) : n.sound, midi:n.midi, vel:n.vel, string:strings.get(`${n.tick}:${n.midi}`) ?? null })),
      clicks:mods.beats(S.score).map(b => ({ at:b.tick, accent:b.accent })),
      rate:currentTempo() * QUARTER / 60, from:fromTick, end,
      onFrame:tick => drawPlayhead(events, tick),
    })
  } finally { P.manual = false }
  playUi(true)
  return true
}
function onPlaybackStop() {
  playUi(false); clearHeads()
  if (P.manual) return
  const loop = P.loop
  if (loop && loop.state === S.activePageState) { loop.pass++; startPlayback(loop.from); return }
  // the end of the page: carry on onto the next page with music
  const doc = S.document
  if ($('turnPages').checked && doc?.kind === 'pdf' && S.activePageState === P.state && doc.page < doc.pageCount) turnAndContinue(doc.page + 1)
}
async function turnAndContinue(index) {
  const doc = S.document
  P.turning = true
  try {
    for (; index <= doc.pageCount; index++) {
      if (S.document !== doc) return
      await openPage(index, { fit:readerOn() })
      if (S.document !== doc || S.activePageState?.index !== index) return
      if (S.model) { window.scrollTo({ top:0 }); $('wrap').scrollTo({ top:0, left:0 }); await startPlayback(0); return }
    }
  } finally { P.turning = false }
}
/** The playhead layer: the loop's bars, then the sounding noteheads with a cursor per staff. */
function drawHeadsLayer(notes) {
  if (heads.width !== page.width || heads.height !== page.height) { heads.width = page.width; heads.height = page.height }
  headsCtx.clearRect(0, 0, heads.width, heads.height)
  if (!S.renderer || !S.model) return
  const r = S.renderer.r, sp = S.model.space || 16, space = sp * r
  const loop = P.loop && P.loop.state === S.activePageState ? P.loop : null
  const marked = loop ? loop.measures : P.picking?.first ? [P.picking.first] : []
  if (marked.length) {
    headsCtx.save(); headsCtx.fillStyle = 'rgba(28,126,214,.10)'; headsCtx.strokeStyle = 'rgba(28,126,214,.75)'; headsCtx.lineWidth = Math.max(2, space * 0.12)
    for (const m of marked) {
      const x0 = m.x0, x1 = Math.min(m.x1, m.st.x1), y0 = lineY(m.st, 0, x0) - 1.6 * sp, y1 = lineY(m.st, 4, x0) + 1.6 * sp
      headsCtx.fillRect(x0 * r, y0 * r, (x1 - x0) * r, (y1 - y0) * r)
      headsCtx.beginPath(); headsCtx.moveTo(x0 * r, y0 * r); headsCtx.lineTo(x1 * r, y0 * r); headsCtx.moveTo(x0 * r, y1 * r); headsCtx.lineTo(x1 * r, y1 * r); headsCtx.stroke()
    }
    headsCtx.restore()
  }
  if (!notes.length) return
  headsCtx.save(); headsCtx.fillStyle = 'rgba(232,89,12,.22)'; headsCtx.strokeStyle = '#e8590c'; headsCtx.lineWidth = Math.max(2, space * 0.16)
  const staves = new Map()
  for (const note of notes) {
    headsCtx.beginPath(); headsCtx.ellipse(note.x * r, note.y * r, space * 0.95, space * 0.75, 0, 0, Math.PI * 2); headsCtx.fill(); headsCtx.stroke()
    if (note.st && !staves.has(note.st)) staves.set(note.st, note.x)
  }
  headsCtx.globalAlpha = 0.55
  for (const [staff, x] of staves) {
    headsCtx.beginPath(); headsCtx.moveTo(x * r, (lineY(staff, 0, x) - 1.5 * sp) * r); headsCtx.lineTo(x * r, (lineY(staff, 4, x) + 1.5 * sp) * r); headsCtx.stroke()
  }
  headsCtx.restore()
  return staves
}
function drawPlayhead(events, tick) {
  if (!S.renderer || S.activePageState !== P.state) return
  const notes = soundingHeads(events, tick), key = notes.map(note => `${note.si ?? note.st?.index}:${note.x}:${note.y}`).join()
  if (key === P.headsKey) return
  P.headsKey = key
  const staves = drawHeadsLayer(notes)
  if (staves && $('follow').checked) { const [staff, x] = staves.entries().next().value || []; if (staff) revealStaff(staff, x) }
}
/** Scroll so a staff stays in view (a third of the way down), whichever box scrolls. */
function revealStaff(staff, x) {
  const r = S.renderer.r * S.zoom, space = (S.model.space || 16) * r, rect = appBox($('stage'))
  const top = rect.top + lineY(staff, 0, x) * r - 2.5 * space, bottom = rect.top + lineY(staff, 4, x) * r + 2.5 * space
  const H = STAND.dir ? $('app').offsetHeight : innerHeight
  const viewTop = (document.querySelector('header') ? appBox(document.querySelector('header')).bottom : 0), viewBottom = Math.min(H, $('transport').hidden ? H : appBox($('transport')).top)
  const wrap = $('wrap')
  if (top < viewTop || bottom > viewBottom) {
    const delta = top - (viewTop + (viewBottom - viewTop) / 3)
    if (wrap.scrollHeight > wrap.clientHeight + 1) wrap.scrollBy({ top:delta, behavior:'smooth' }); else window.scrollBy({ top:delta, behavior:'smooth' })
  }
  const left = rect.left + x * r, wrapRect = appBox(wrap)
  if (wrap.scrollWidth > wrap.clientWidth + 1 && (left < wrapRect.left + 20 || left > wrapRect.right - 20)) wrap.scrollBy({ left:left - (wrapRect.left + wrapRect.width / 3), behavior:'smooth' })
}
/** The bar a recognized note is in. */
const measureOfNote = note => S.score?.measures.find(m => m.events.some(e => e.notes?.includes(note))) || null
function tickOfNote(note) {
  const measure = measureOfNote(note)
  return measure ? measureStarts(S.score).get(measure) ?? 0 : 0
}

// ---------- ⟳ loop: practise a passage of bars ----------
/** Loop bars a..b of the shown page (any order); they must be in one part. */
function setLoop(a, b) {
  const starts = measureStarts(S.score)
  if (starts.get(b) < starts.get(a)) [a, b] = [b, a]
  const part = S.score.parts[a.part], i = part.measures.indexOf(a), j = part.measures.indexOf(b)
  const measures = part.measures.slice(i, Math.max(i, j) + 1)
  const last = measures[measures.length - 1]
  P.loop = { state:S.activePageState, part:a.part, measures, from:starts.get(a), to:starts.get(last) + (last.status === 'rest' ? last.cap : last.ticks), pass:0, speed:+$('speed').value || 1 }
  P.picking = null; loopLabel(); clearHeads()
  startPlayback(P.loop.from)
}
function clearLoop() {
  const looping = P.loop && P.player?.playing
  P.loop = null; P.picking = null; loopLabel(); clearHeads()
  if (looping) { stopPlayback(); P.player?.setSpeed(+$('speed').value || 1) }
}
function loopLabel() {
  const loop = P.loop && P.loop.state === S.activePageState ? P.loop : null
  $('loop').setAttribute('aria-pressed', !!(loop || P.picking))
  $('loop').textContent = loop ? '⟳ Loop on' : P.picking ? '⟳ tap bars…' : '⟳ Loop'
  $('loopInfo').textContent = loop ? `bars ${loop.measures[0].number}–${loop.measures[loop.measures.length - 1].number}${loop.pass ? ` · pass ${loop.pass + 1}` : ''}${$('ramp').checked ? ` · ×${(loop.speed ?? 1).toFixed(2)}` : ''}` : ''
}
/** A tap on a bar while choosing a loop: the first bar, then the last. Returns true when used. */
function pickLoopBar(x, y) {
  if (!P.picking || !S.score) return false
  const measure = measureAt(S.score, { x, y })
  if (!measure) { hint('Tap inside a bar of the music.'); return true }
  if (!P.picking.first) { P.picking.first = measure; hint(`Bar ${measure.number}: now tap the last bar of the passage (or the same bar again).`, 0); clearHeads(); return true }
  if (measure.part !== P.picking.first.part) { hint('The last bar must be in the same part (the same staff line of a system).'); return true }
  hint('', 1); setLoop(P.picking.first, measure); return true
}
$('loop').onclick = () => {
  if (P.loop || P.picking) { clearLoop(); hint('Loop off.'); return }
  if (!S.score) return
  stopPlayback(); setInkMode(false)
  P.picking = { first:null }; loopLabel()
  hint('Tap the first bar of the passage to loop.', 0)
}
$('ramp').onchange = () => { if (P.loop) { P.loop.pass = 0; loopLabel(); if (P.player?.playing) startPlayback(P.loop.from) } }
document.addEventListener('keydown', event => { if (event.key === 'Escape' && P.picking) { P.picking = null; loopLabel(); clearHeads(); hint('Loop cancelled.') } })

$('play').onclick = () => { if (P.player?.playing) stopPlayback(); else startPlayback(P.loop?.state === S.activePageState ? P.loop.from : 0) }
$('rewind').onclick = () => startPlayback(P.loop?.state === S.activePageState ? P.loop.from : 0)
$('speed').onchange = () => { if (P.loop) { P.loop.pass = 0; if (P.player?.playing) { startPlayback(P.loop.from); return } } P.player?.setSpeed(+$('speed').value || 1) }
$('metronome').onchange = () => { if (P.player) P.player.metronome = $('metronome').checked }
$('sound').onchange = () => { if (P.player?.playing) startPlayback(Math.floor(P.player.pos)) }
/** The previous / next PDF page, shown from its top. */
async function turnPage(step) {
  const doc = S.document; if (doc?.kind !== 'pdf') return
  const index = doc.page + step
  if (index < 1 || index > doc.pageCount) { hint(index < 1 ? 'This is the first page.' : 'This is the last page.', 2000); return }
  await openPage(index, { fit:true })
  if (S.document === doc && S.activePageState?.index === index) { window.scrollTo({ top:0 }); $('wrap').scrollTo({ top:0, left:0 }) }
}
$('tPrev').onclick = () => turnPage(-1)
$('tNext').onclick = () => turnPage(1)

// ---------- reader: the page full width, the controls tucked away ----------
function setReader(on) {
  document.body.classList.toggle('reader', on); $('readerMode').setAttribute('aria-pressed', on)
  try { localStorage.setItem('score-fingering:reader', on ? '1' : '') } catch {}
  hidePopup(false)
  if (page.width) { fitPageZoom(); layoutPage() }
}
$('readerMode').onclick = () => setReader(!readerOn())

// ---------- 🎼 Stand: a laptop turned on its side as a music stand ----------
// The app is drawn a quarter turn round, so the page stands upright and fills the tall screen.
// A tap on the right two thirds of the page (or a scroll, or → / ↓ / Page Down, as a page-turner
// pedal sends) goes to the next page; the left third, ← / ↑ / Page Up go back. The next page is
// read in the background, so it is ready when it is needed. Ink, loops and playback work as usual.
const STAND_KEY = 'score-fingering:stand'
function setStand(dir) {
  const was = STAND.dir
  STAND.dir = dir
  document.body.classList.toggle('stand', !!dir); document.documentElement.classList.toggle('stand-root', !!dir)
  document.body.classList.toggle('cw', dir > 0); document.body.classList.toggle('ccw', dir < 0)
  $('standMode').setAttribute('aria-pressed', !!dir); $('standFlip').hidden = !dir
  if (dir) { try { localStorage.setItem(STAND_KEY, dir > 0 ? 'cw' : 'ccw') } catch {} }
  if (dir && !readerOn()) { STAND.reader = true; setReader(true) } else if (!dir && STAND.reader) { STAND.reader = false; setReader(false) }
  hidePopup(false)
  if (page.width) { fitPageZoom(); layoutPage(); $('wrap').scrollTo({ top:0, left:0 }) }
  if (dir && !was) {
    hint(`Tap the right of the page, scroll, or press → for the next page; the left of the page or ← to go back. Keyboard on the ${dir > 0 ? 'left' : 'right'}? Press ⟲ flip.`, 9000)
    prefetchNext()
  }
}
const storedStand = () => { try { return localStorage.getItem(STAND_KEY) === 'ccw' ? -1 : 1 } catch { return 1 } }
$('standMode').onclick = async () => {
  if (STAND.dir) {
    setStand(0)
    if (STAND.fullscreen && document.fullscreenElement) document.exitFullscreen?.().catch(() => {})
    STAND.fullscreen = false
    return
  }
  if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
    try { await document.documentElement.requestFullscreen(); STAND.fullscreen = true } catch {}
  }
  setStand(storedStand())
}
$('standFlip').onclick = () => setStand(-STAND.dir)
addEventListener('resize', () => { if (STAND.dir && page.width) { fitPageZoom(); layoutPage() } })
// a scroll that has nothing left to move turns the page (mapped to the rotated page's axes)
const standWheel = wheelTurner()
$('wrap').addEventListener('wheel', event => {
  if (!STAND.dir) return
  event.preventDefault()
  const k = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? innerHeight : 1
  const { du, dv } = localDelta(event.deltaX * k, event.deltaY * k, STAND.dir)
  const wrap = $('wrap'), before = wrap.scrollLeft + wrap.scrollTop
  wrap.scrollLeft += du; wrap.scrollTop += dv
  const moved = Math.abs(wrap.scrollLeft + wrap.scrollTop - before) > 0.5
  const step = standWheel(moved ? 0 : Math.abs(dv) >= Math.abs(du) ? dv : du, performance.now())
  if (step) turnPage(step)
}, { passive:false })
const standParam = new URLSearchParams(location.search).get('stand')
if (standParam) setStand(/^(right|ccw|-1)$/.test(standParam) ? -1 : 1)

// The next PDF page, read in the background while this one is shown (Reader and Stand), so a page
// turn does not wait for recognition.
function prefetchNext() {
  const doc = S.document
  if (doc?.kind !== 'pdf' || !(STAND.dir || readerOn()) || !S.activePageState) return
  const index = S.activePageState.index + 1
  if (index > doc.pageCount || doc.prefetch) return
  const state = pageState(doc, index)
  if (state.status !== 'empty') return
  const fifths = precedingPageFifths(doc, index)
  const job = (async () => {
    const rendered = await doc.pdfPool.render(index, 3000)
    if (S.document !== doc || state.status !== 'empty') return
    const probe = await recognize(rendered.canvas, { probe:true, background:true })
    if (S.document !== doc || state.status !== 'empty') return
    if (!probe.staves) { cachePage(doc, index, { status:'nonmusic', image:rendered.canvas, error:null, widthPt:rendered.widthPt, heightPt:rendered.heightPt, lastUsed:performance.now() }); return }
    const { model, image } = await recognize(rendered.canvas, { fifths, background:true })
    if (S.document !== doc || state.status !== 'empty' || precedingPageFifths(doc, index) !== fifths) return
    applyPageCorrections(model, state)
    if (!model.staves.length || !model.notes.length) return
    cachePage(doc, index, { status:'ready', model, image, renderer:new Renderer(image, model), score:buildScore(model), error:null, recognizedFifths:fifths, widthPt:rendered.widthPt, heightPt:rendered.heightPt, lastUsed:performance.now() })
  })().catch(() => {}).finally(() => { if (doc.prefetch?.index === index) doc.prefetch = null })
  doc.prefetch = { index, job }
}
$('fullscreen').onclick = () => document.fullscreenElement ? document.exitFullscreen?.() : document.documentElement.requestFullscreen?.().catch(() => {})
document.addEventListener('fullscreenchange', () => { if (page.width) { fitPageZoom(); layoutPage() } })
document.addEventListener('keydown', event => {
  if (!readerOn() || event.ctrlKey || event.metaKey || event.altKey || event.target.closest?.('input,select,textarea,#pop')) return
  if (event.key === ' ') { event.preventDefault(); $('play').click() }
  else if (event.key === 'ArrowRight' || event.key === 'PageDown' || (STAND.dir && event.key === 'ArrowDown')) { event.preventDefault(); turnPage(1) }
  else if (event.key === 'ArrowLeft' || event.key === 'PageUp' || (STAND.dir && event.key === 'ArrowUp')) { event.preventDefault(); turnPage(-1) }
  else if (event.key === 'm' || event.key === 'M') { $('metronome').click() }
})
try { if (localStorage.getItem('score-fingering:reader') || new URLSearchParams(location.search).has('reader')) setReader(true) } catch {}

// ---------- ✎ Ink: pen annotations that stick to the music (notation-ir annotations.js) ----------
// Ink is attached to the note, passage or moment under it, in staff spaces, so it stays with the
// notes through pitch corrections and page re-reads. A pen or mouse writes; a finger writes until
// a pen has been used, then fingers scroll. Strokes written together form one mark. Saved per
// file and page in this browser, and drawn into the PNG / PDF export.
const INK_GROUP_MS = 650
let inkModulePromise = null
const loadInkModules = () => (inkModulePromise ||= inkModules().catch(error => { inkModulePromise = null; throw error }))
const inkModulesOrNull = () => loadInkModules().catch(() => null)
const inkPage = () => S.activePageState?.index ?? 1
// undo and redo belong to one page
const inkStacks = () => { if (INK.undoPage !== inkPage()) { INK.undo = []; INK.redo = []; INK.undoPage = inkPage() } }
function pageInk(doc = S.document, index = inkPage()) {
  if (!doc) return []
  doc.ink ||= new Map()
  if (!doc.ink.has(index)) doc.ink.set(index, doc.sourceKey ? loadAnnotations(globalThis.localStorage, annotationKey(doc.sourceKey, index)) : [])
  return doc.ink.get(index)
}
function setPageInk(list) {
  const doc = S.document; if (!doc) return
  doc.ink ||= new Map(); doc.ink.set(inkPage(), list)
  if (doc.sourceKey && !saveAnnotations(globalThis.localStorage, annotationKey(doc.sourceKey, inkPage()), list)) hint('Ink is kept for this session only: browser storage is full or unavailable.', 8000)
}
function inkSurface(mods, model, score, r) {
  const irc = mods.fromScoreShift(model, score, { title:'Score' })
  const view = () => ({ X:x => x * r, Y:y => y * r, sp:(model.space || 16) * r })
  return { irc, items:mods.itemsOf(irc.score), surface:mods.photoSurface({ model, score, irc, view }) }
}
/** Rebuild the music the ink attaches to (after a page is read or corrected). */
function refreshInk() { return (INK.pending = buildInk().finally(() => { INK.pending = null })) }
async function buildInk() {
  const model = S.model, score = S.score, renderer = S.renderer
  if (!model || !score || !renderer || (!INK.on && !pageInk().length)) { INK.irc = null; INK.model = null; drawInk(); return }
  let mods
  try { mods = INK.mods = await loadInkModules() }
  catch (error) { hint(`Ink is unavailable: ${error.message}`, 8000); setInkMode(false); drawInk(); return }
  if (S.model !== model || S.score !== score) return
  try { Object.assign(INK, inkSurface(mods, model, score, renderer.r), { model }) }
  catch (error) { INK.irc = null; INK.model = null; console.warn('ink surface', error); hint(`Ink cannot attach to this page's music: ${error.message}`, 8000) }
  drawInk()
  const lost = INK.irc ? pageInk().filter(a => mods.resolveAnnotation(INK.surface, a, INK.items)?.lost).length : 0
  if (lost) hint(`${lost} ink mark${lost > 1 ? 's' : ''} lost ${lost > 1 ? 'their' : 'its'} note (dashed): tap it in ✎ Ink to re-attach.`, 8000)
}
function drawInk() {
  if (ink.width !== page.width || ink.height !== page.height) { ink.width = page.width; ink.height = page.height }
  inkCtx.clearRect(0, 0, ink.width, ink.height)
  if (!S.model || !S.renderer) return
  if (INK.irc && INK.model === S.model) INK.mods.drawAnnotations(inkCtx, INK.surface, pageInk(), INK.items, { selected:INK.sel })
  // ink still being written: plain strokes until it is attached
  const r = S.renderer.r, live = [...(INK.pendingGroups || []).flatMap(g => g.strokes), ...(INK.group?.strokes || []), ...[...INK.ptrs.values()].filter(p => p.ink).map(p => p.pts)]
  inkCtx.save(); inkCtx.lineCap = 'round'; inkCtx.lineJoin = 'round'; inkCtx.strokeStyle = inkCtx.fillStyle = INK.group?.color || INK.color; inkCtx.globalAlpha = 0.85
  const width = Math.max(1, INK.width * (S.model.space || 16) * r)
  for (const stroke of live) {
    if (stroke.length === 1) { inkCtx.beginPath(); inkCtx.arc(stroke[0].x * r, stroke[0].y * r, width / 2, 0, 7); inkCtx.fill(); continue }
    for (let i = 1; i < stroke.length; i++) { inkCtx.lineWidth = width * (0.6 + 0.8 * (stroke[i].p ?? 0.5)); inkCtx.beginPath(); inkCtx.moveTo(stroke[i - 1].x * r, stroke[i - 1].y * r); inkCtx.lineTo(stroke[i].x * r, stroke[i].y * r); inkCtx.stroke() }
  }
  inkCtx.restore()
}
function inkBar() {
  inkStacks()
  $('inkBar').hidden = !INK.on; $('inkMode').setAttribute('aria-pressed', INK.on)
  $('inkBar').querySelectorAll('[data-c]').forEach(b => b.setAttribute('aria-pressed', !INK.erase && b.dataset.c === INK.color))
  $('inkBar').querySelectorAll('[data-w]').forEach(b => b.setAttribute('aria-pressed', !INK.erase && +b.dataset.w === INK.width))
  $('inkErase').setAttribute('aria-pressed', INK.erase)
  $('inkUndo').disabled = !INK.undo.length; $('inkRedo').disabled = !INK.redo.length; $('inkClear').disabled = !pageInk().length
}
function inkChange(fn) {
  inkStacks()
  const before = JSON.stringify(pageInk()), list = JSON.parse(before); fn(list)
  if (JSON.stringify(list) === before) return
  INK.undo.push(before); if (INK.undo.length > 100) INK.undo.shift(); INK.redo = []
  setPageInk(list); drawInk(); inkBar()
}
function inkUndo(redo = false) {
  inkStacks()
  const from = redo ? INK.redo : INK.undo, to = redo ? INK.undo : INK.redo
  if (!from.length) return
  to.push(JSON.stringify(pageInk())); setPageInk(JSON.parse(from.pop())); INK.sel = null; drawInk(); inkBar()
}
function commitInkGroup(group = INK.group) {
  if (group === INK.group) INK.group = null
  if (!group) return
  clearTimeout(group.timer)
  if (!INK.irc || INK.model !== S.model) {
    // the music the ink attaches to is still being read (a slow first load): keep the strokes on
    // screen and attach them once it is ready, rather than dropping them
    if (S.model && !group.waited) {
      group.waited = true; (INK.pendingGroups ||= []).push(group); drawInk()
      const model = S.model
      ;(INK.pending || refreshInk()).then(() => {
        INK.pendingGroups = (INK.pendingGroups || []).filter(g => g !== group)
        if (S.model === model) commitInkGroup(group); else drawInk()
      })
      return
    }
    drawInk(); hint('That ink could not be attached to the music, so it was not kept.'); return
  }
  const mark = INK.mods.attachStrokes(INK.surface, INK.items, group.strokes, { id:`a${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`, color:group.color, width:group.width })
  if (!mark) { drawInk(); hint('That ink is not near any music on the page, so it was not kept. Write on or just above a staff.'); return }
  inkChange(list => list.push(mark))
}
function setInkMode(on) {
  if (on === INK.on) return
  commitInkGroup(); INK.on = on; INK.sel = null; INK.undo = []; INK.redo = []
  $('stage').classList.toggle('inking', on); inkBar()
  if (on) {
    stopPlayback(); if (P.picking) { P.picking = null; loopLabel(); clearHeads() }
    refreshInk(); hint('Write on or just above a staff: ink sticks to the notes under it. Tap a mark to recolour or delete it.', 6000)
  }
}
$('inkMode').onclick = () => setInkMode(!INK.on)
$('inkBar').addEventListener('click', event => {
  const button = event.target.closest('button'); if (!button) return
  if (button.dataset.c) { INK.color = button.dataset.c; INK.erase = false }
  else if (button.dataset.w) { INK.width = +button.dataset.w; INK.erase = false }
  else if (button.id === 'inkErase') INK.erase = !INK.erase
  else if (button.id === 'inkUndo') inkUndo(false)
  else if (button.id === 'inkRedo') inkUndo(true)
  else if (button.id === 'inkClear') { if (confirm('Remove all ink on this page? (Undo brings it back.)')) inkChange(list => { list.length = 0 }) }
  inkBar()
})
function inkPoint(event) {
  const p = canvasPoint(event, ink), r = S.renderer.r
  return { x:p.x / r, y:p.y / r }
}
function eraseInkAt(pt) {
  const hit = INK.irc && INK.mods.hitAnnotation(INK.surface, pageInk(), INK.items, pt, 0.9)
  if (hit) inkChange(list => { const i = list.findIndex(a => a.id === hit.id); if (i >= 0) list.splice(i, 1) })
}
function inkPopup(id, event) {
  const mark = pageInk().find(a => a.id === id); if (!mark) return
  INK.sel = id; drawInk()
  const lost = INK.mods.resolveAnnotation(INK.surface, mark, INK.items)?.lost
  const what = { event:'a note', span:'a passage', time:'a moment on the staff' }[mark.anchor.kind]
  const pop = $('pop')
  pop.innerHTML = `<h3 id="popTitle">Ink mark</h3><p>${lost ? '<b>Its note was removed by a correction.</b>' : `Attached to ${what}: it stays with the music.`}</p>
    ${lost ? '<div class="row"><button id="inkNear">Attach to the nearest note</button></div>' : ''}
    <div class="row">${['#c2255c', '#1c7ed6', '#2b8a3e', '#212529'].map(c => `<button data-ic="${c}" aria-label="Colour ${c}" aria-pressed="${c === mark.color}" style="background:${c};border-color:${c};border-radius:50%"></button>`).join('')}</div>
    <div class="row"><button id="inkDelete" class="danger">Delete</button><button id="inkClose">Close</button></div>`
  placePopup(event)
  pop.querySelectorAll('[data-ic]').forEach(b => b.onclick = () => { inkChange(list => { list.find(a => a.id === id).color = b.dataset.ic }); inkPopup(id, event) })
  $('inkDelete').onclick = () => { inkChange(list => { const i = list.findIndex(a => a.id === id); if (i >= 0) list.splice(i, 1) }); INK.sel = null; hidePopup(false); drawInk() }
  $('inkClose').onclick = () => { INK.sel = null; hidePopup(false); drawInk() }
  if (lost) $('inkNear').onclick = () => {
    const resolved = INK.mods.resolveAnnotation(INK.surface, mark, INK.items), at = resolved?.pieces[0]?.points[0], near = at && INK.surface.eventAt(at, 6)
    if (!near) { setStatus('No note near that mark.'); return }
    inkChange(list => INK.mods.reattachAnnotation(list.find(a => a.id === id), near, INK.items)); inkPopup(id, event)
  }
}
ink.addEventListener('pointerdown', event => {
  if (!INK.on || !S.model) return
  if (event.pointerType === 'pen') INK.penSeen = true
  const rec = { type:event.pointerType, x0:event.clientX, y0:event.clientY, pts:[], moved:0, ink:false,
    scroll:event.pointerType === 'touch' && INK.penSeen, erase:INK.erase || (event.pointerType === 'pen' && (event.buttons & 32)), sx:scrollX, sy:scrollY, wx:$('wrap').scrollLeft, wy:$('wrap').scrollTop }
  // a second finger: stop writing, scroll instead
  const touches = [...INK.ptrs.values()].filter(p => p.type === 'touch')
  if (event.pointerType === 'touch' && touches.length) { for (const t of touches) { t.ink = false; t.scroll = true; t.pts = [] } rec.scroll = true }
  INK.ptrs.set(event.pointerId, rec); ink.setPointerCapture(event.pointerId)
  if (rec.scroll) return
  event.preventDefault()
  const pt = inkPoint(event)
  if (rec.erase) { eraseInkAt(pt); return }
  // a new stroke far from the waiting group: that group is one mark, done
  if (INK.group) { clearTimeout(INK.group.timer); const space = S.model.space || 16; if (Math.min(...INK.group.strokes.flat().map(q => Math.hypot(q.x - pt.x, q.y - pt.y))) > 3 * space) commitInkGroup() }
  rec.ink = true; rec.pts.push({ x:pt.x, y:pt.y, p:event.pointerType === 'pen' ? event.pressure : 0.5 })
  drawInk()
})
ink.addEventListener('pointermove', event => {
  const rec = INK.ptrs.get(event.pointerId); if (!rec) return
  rec.moved = Math.max(rec.moved, Math.hypot(event.clientX - rec.x0, event.clientY - rec.y0))
  if (rec.scroll) {
    if (STAND.dir) { const d = localDelta(event.clientX - rec.x0, event.clientY - rec.y0, STAND.dir); $('wrap').scrollLeft = rec.wx - d.du; $('wrap').scrollTop = rec.wy - d.dv; return }
    window.scrollTo(scrollX, rec.sy - (event.clientY - rec.y0)); $('wrap').scrollLeft = rec.wx - (event.clientX - rec.x0); return
  }
  if (rec.erase) { eraseInkAt(inkPoint(event)); return }
  if (!rec.ink) return
  for (const sample of event.getCoalescedEvents ? event.getCoalescedEvents() : [event]) {
    const q = inkPoint(sample), last = rec.pts[rec.pts.length - 1]
    if (!last || Math.hypot(q.x - last.x, q.y - last.y) > 0.6) rec.pts.push({ x:q.x, y:q.y, p:event.pointerType === 'pen' ? sample.pressure : 0.5 })
  }
  drawInk()
})
function inkUp(event) {
  const rec = INK.ptrs.get(event.pointerId); if (!rec) return
  INK.ptrs.delete(event.pointerId)
  // (a cancelled pointer - the browser took the touch, a palm - keeps what it wrote)
  if (rec.scroll || rec.erase || (event.type === 'pointercancel' && rec.pts.length < 2)) { drawInk(); return }
  if (rec.moved < 6 && !INK.group && event.type !== 'pointercancel') { // a tap: select a mark, or keep a dot (a staccato, a breath mark)
    const hit = INK.irc && INK.mods.hitAnnotation(INK.surface, pageInk(), INK.items, inkPoint(event), 0.9)
    if (hit) { inkPopup(hit.id, event); return }
    if (INK.sel) { INK.sel = null; hidePopup(false); drawInk(); return }
  }
  INK.group ||= { strokes:[], color:INK.color, width:INK.width }
  INK.group.strokes.push(rec.pts)
  INK.group.timer = setTimeout(commitInkGroup, INK_GROUP_MS)
  drawInk()
}
ink.addEventListener('pointerup', inkUp)
ink.addEventListener('pointercancel', inkUp)

window.__scoreFingering = { S, P, INK, load, loadSource, recognize, replan, renderPage, openPage, exportAnnotatedPdf, sourceNoteId, resolvePlanningInstrument, exportInstrumentLabel, startPlayback, stopPlayback, setLoop, clearLoop, setReader, setStand, STAND, turnPage, setInkMode, refreshInk, pageInk, inkChange, inkUndo, commitInkGroup, measureStarts, measureAt, tickOfNote }
