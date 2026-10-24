import { buildScore } from '../../random-sketches/vibes/scoreshift/score.js'
import { Renderer } from '../../random-sketches/vibes/scoreshift/render.js'
import { interpret, yOfP } from '../../random-sketches/vibes/scoreshift/omr.js'
import { planFingering, annotationItems, hitAnnotation, sourceNoteId, detectViolinViola } from './adapter.js'
import { drawFingerings, drawRecognition } from './overlay.js'
import { INSTRUMENTS, solveFingering } from '../strings/fingering.js'
import { createScoreDocument, pageState, cachePage, pageFileStem, trimPageRecords, precedingPageFifths, invalidatePageKeyEvidence } from './document.js'

const $ = id => document.getElementById(id)
const page = $('page'), overlay = $('overlay'), pageCtx = page.getContext('2d'), overlayCtx = overlay.getContext('2d')
const DEFAULT_OVERLAY_LABEL = 'Annotated score. Use the arrow keys to select a note and Enter to edit it, or use the Edit recognized notes list.'
const S = { document:null, activePageState:null, model:null, image:null, renderer:null, score:null, plan:null, items:[], locks:new Map(), part:0, suggestion:0, zoom:1, selectedId:null, keyboardIndex:0, popupOpener:null, planRevision:0, name:'score' }
let loadRequest = 0
const activeRecognitions = new Set(), activePdfRenders = new Set(), busyOwners = new Set()

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
  return request
}


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
  cancelRecognitions(); cancelPdfRenders()
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


async function recognize(source, { probe=false, request=null, fifths=null } = {}) {
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
        activeRecognitions.delete(cancel)
        callback(value)
      }
      const cancel = () => finish(reject, new Error('Recognition superseded by a newer image'))
      activeRecognitions.add(cancel)
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
    const state = cachePage(S.document, 1, { status:'ready', model, image, renderer:new Renderer(image, model), locks:new Map() })
    S.activePageState = state
    S.model = state.model; S.image = state.image; S.renderer = state.renderer; S.name = pageFileStem(S.document)
    S.locks = state.locks; S.part = 0; S.suggestion = 0; S.selectedId = null; S.keyboardIndex = 0
    $('empty').hidden = true; $('stage').hidden = false; $('export').disabled = false
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
    S.document = doc
    $('pages').hidden = false; $('exportPdf').hidden = false; $('exportPdf').disabled = !!pdfExportPromise
    buildPageStrip()
    await openPage(1, { request, fit:true })
    if (S.document === doc && S.activePageState) return true
    if (S.document === doc) {
      closeDocument(); resetPageGlobals(); clearPlanUi(); $('export').disabled = true; $('stage').hidden = true; $('empty').hidden = false
    }
    if (request === loadRequest) throw new Error('The first PDF page could not be installed')
    return false
  } catch (error) {
    if (request !== loadRequest) { if (S.document?.pdfPool !== pool) pool?.destroy(); return false }
    if (S.document?.pdfPool === pool) { closeDocument(); resetPageGlobals(); clearPlanUi(); $('export').disabled = true; $('stage').hidden = true; $('empty').hidden = false }
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
  const doc = S.document
  if (!doc || doc.kind !== 'pdf') return
  $('pageNo').textContent = `${doc.page} / ${doc.pageCount}`
  $('prevPage').disabled = doc.page <= 1; $('nextPage').disabled = doc.page >= doc.pageCount
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
  $('empty').hidden = true; $('stage').hidden = false; $('export').disabled = false
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
  $('empty').hidden = true; $('stage').hidden = false; $('export').disabled = false
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
  $('empty').hidden = true; $('stage').hidden = false; $('export').disabled = false
  rebuildParts()
  if (!await replan(false)) return false
  if (S.document?.kind === 'pdf') S.document.page = state.index
  if (fit) { fitPageZoom(); layoutPage() }
  pageUi(); trimPageCache(S.document, state.index)
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
    renderAlternatives(); renderPage(); renderNoteList(); updateStatus()
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
  const available = Math.max(260, $('wrap').clientWidth - 32)
  S.zoom = Math.max(0.1, Math.min(1, available / page.width))
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
  for (const canvas of [page, overlay]) { canvas.style.width = `${width}px`; canvas.style.height = `${height}px` }
}

function scrollAnnotationIntoView(item) {
  const wrap = $('wrap'), stage = $('stage')
  const x = stage.offsetLeft + item.labelX * S.renderer.r * S.zoom
  const y = stage.offsetTop + item.labelY * S.renderer.r * S.zoom
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
  drawFingerings(overlayCtx, S.items, S.renderer.r, { selectedId:S.selectedId, showDetails:$('details').checked })
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
    <div class="row"><button id="remove" class="danger">Not a note</button><button id="close">Close</button></div>`
  pop.style.visibility = 'hidden'; pop.style.display = 'block'; pop.style.left = '8px'; pop.style.top = '8px'
  const box = pop.getBoundingClientRect()
  const left = Math.max(8, Math.min(innerWidth - box.width - 8, event.clientX + 10))
  const top = Math.max(8, Math.min(innerHeight - box.height - 8, event.clientY + 10))
  pop.style.left = `${left}px`; pop.style.top = `${top}px`; pop.style.visibility = 'visible'
  pop.querySelector('button:not(:disabled)')?.focus()
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
}

function resetDocumentAlternatives() {
  for (const state of S.document?.pages.values() || []) { state.suggestion = 0; state.plan = null; state.items = [] }
  S.suggestion = 0
}

overlay.addEventListener('click', event => {
  if (!S.renderer || !S.items.length) return
  const rect = overlay.getBoundingClientRect()
  const x = (event.clientX - rect.left) * overlay.width / rect.width / S.renderer.r
  const y = (event.clientY - rect.top) * overlay.height / rect.height / S.renderer.r
  const item = hitAnnotation(S.items, x, y, 18)
  if (item) showPopup(item, event); else hidePopup()
})

document.addEventListener('keydown', event => { if (event.key === 'Escape') hidePopup() })

overlay.addEventListener('keydown', event => {
  if (!S.items.length) return
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
$('tempo').onchange = () => { resetDocumentAlternatives(); replan() }
$('recognition').onchange = renderPage
$('details').onchange = renderPage
$('zoom').oninput = event => { S.zoom = +event.target.value; layoutPage() }
window.addEventListener('resize', layoutPage)

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

function composePageState(state, settings) {
  if (state.status !== 'ready') return state.image
  planPageState(state, settings)
  const canvas = document.createElement('canvas'); canvas.width = state.renderer.W; canvas.height = state.renderer.H
  const context = canvas.getContext('2d'); context.drawImage(state.renderer.src, 0, 0)
  drawFingerings(context, state.items, state.renderer.r, { showDetails:settings.showDetails })
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
    const pages = []; let jpegBytes = 0
    for (let index = 1; index <= doc.pageCount; index++) {
      if (S.document !== doc || loadRequest !== revision) throw new Error('Export stopped because another document or page was opened')
      $('busy').firstElementChild.textContent = `Annotating PDF… page ${index} of ${doc.pageCount}`
      const { state, temporary, sourceCanvas } = await ensurePageForExport(doc, index, revision)
      if (S.document !== doc || loadRequest !== revision) throw new Error('Export stopped because another document or page was opened')
      let canvas = null
      try {
        canvas = composePageState(state, settings)
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
  if (state?.status === 'ready') output = composePageState(state, currentPlanningSettings())
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

window.__scoreFingering = { S, load, loadSource, recognize, replan, renderPage, openPage, exportAnnotatedPdf, sourceNoteId, resolvePlanningInstrument, exportInstrumentLabel }
