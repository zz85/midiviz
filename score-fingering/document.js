// Unified image/PDF document and stable per-page state for experiment #046.

const cleanName = name => String(name || 'score').replace(/\.(pdf|png|jpe?g|webp|gif|heic)$/i, '') || 'score'

export function createScoreDocument({ kind, name, pageCount = 1, pdfPool = null } = {}) {
  if (kind !== 'image' && kind !== 'pdf') throw new TypeError('document kind must be image or pdf')
  if (!Number.isInteger(pageCount) || pageCount < 1) throw new TypeError('pageCount must be a positive integer')
  return { kind, name:cleanName(name), pageCount, page:1, pdfPool, pages:new Map(), thumbs:new Map(), autoInstruments:new Map() }
}

export function pageState(document, index = document.page) {
  if (!document || !(document.pages instanceof Map)) throw new TypeError('invalid score document')
  if (!Number.isInteger(index) || index < 1 || index > document.pageCount) throw new RangeError(`document has no page ${index}`)
  if (!document.pages.has(index)) document.pages.set(index, {
    index,
    status:'empty',
    image:null,
    model:null,
    error:null,
    renderer:null,
    score:null,
    plan:null,
    items:[],
    locks:new Map(),
    corrections:new Map(),
    part:0,
    suggestion:0,
    keyboardIndex:0,
    selectedId:null,
    autoInstruments:new Map(),
    fifthsByPart:new Map(),
    recognizedFifths:null,
    widthPt:null,
    lastUsed:0,
    heightPt:null,
  })
  return document.pages.get(index)
}

export function cachePage(document, index, patch) {
  const state = pageState(document, index)
  Object.assign(state, patch)
  return state
}


/** Keep at most maxPages resident page payloads while preserving compact choices/corrections. */
export function trimPageRecords(document, keepIndex, maxPages = 8, onEvict = null) {
  if (!Number.isInteger(maxPages) || maxPages < 1) throw new TypeError('maxPages must be a positive integer')
  const resident = [...document.pages.values()].filter(state => state.status !== 'empty')
  if (resident.length <= maxPages) return []
  const candidates = resident.filter(state => state.index !== keepIndex).sort((a, b) => a.lastUsed - b.lastUsed)
  const evicted = []
  while (resident.length - evicted.length > maxPages && candidates.length) {
    const state = candidates.shift(); onEvict?.(state)
    Object.assign(state, { status:'empty', image:null, model:null, renderer:null, score:null, plan:null, items:[], selectedId:null })
    evicted.push(state.index)
  }
  return evicted
}
export function pageFileStem(document, index = document.page) {
  pageState(document, index)
  if (document.kind === 'image') return document.name
  const width = Math.max(2, String(document.pageCount).length)
  return `${document.name}-p${String(index).padStart(width, '0')}`
}

/** Invalidate derived carry context without discarding a page's display payload. */
export function invalidatePageKeyEvidence(state) {
  state?.fifthsByPart?.clear()
  if (state) state.recognizedFifths = undefined
}

/** Return a common ending key only from the immediately preceding recognized page. */
export function precedingPageFifths(document, index) {
  const state = document?.pages?.get(index - 1)
  if (!state?.fifthsByPart?.size) return null
  if (state.recognizedFifths !== precedingPageFifths(document, index - 1)) return null
  const values = [...new Set(state.fifthsByPart.values())]
  return values.length === 1 ? values[0] : null
}

/** Whether a page needs a prior-key recognition pass without contradicting printed evidence. */
export function needsPriorFifths(staves, fifths) {
  if (!Array.isArray(staves) || !Number.isInteger(fifths)) return false
  const printed = staves.filter(staff => staff.key?.cancellation || staff.key?.detected || staff.key?.glyphs?.length)
  const missing = staves.some(staff => staff.key && !staff.key.keylessSection && !staff.key.cancellation && !staff.key.detected && !staff.key.glyphs?.length)
  return missing && printed.every(staff => staff.key.fifths === fifths)
}

/** Apply a preceding page's key only where this page has no conflicting printed key evidence. */
export function applyPriorFifths(staves, fifths, interpret) {
  if (!Array.isArray(staves) || !Number.isInteger(fifths) || typeof interpret !== 'function') return 0
  const printed = staves.filter(staff => staff.key?.cancellation || staff.key?.detected || staff.key?.glyphs?.length)
  if (printed.some(staff => staff.key.fifths !== fifths)) return 0
  let changed = 0, firstChanged = staves.length
  for (let index = 0; index < staves.length; index++) {
    const staff = staves[index]
    if (!staff.key || staff.key.keylessSection || staff.key.cancellation || staff.key.detected || staff.key.glyphs?.length) continue
    staff.key.fifths = fifths; staff.key.documentInferred = true; changed++; firstChanged = Math.min(firstChanged, index)
  }
  for (let index = firstChanged; index < staves.length; index++) interpret(staves[index])
  return changed
}
