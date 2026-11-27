// The Stage menu of a page, built from the sets' own descriptors (stages/inscene.js INSCENE,
// stages/sets.js SETS): each option's label, the menu's title from each set's `about`, and the
// marks a page needs: " (not path traced)" on a page with path tracers for a set they don't run,
// " - WebGL only" and disabled on WebGPU for a set that doesn't take it. A new set shows up in
// every page's menu by its descriptor alone.
//
//   fillStageMenu($('stageSet'), { traced: true, gpu: !!GPU, note: '...' })      // #045
//   fillStageMenu($('venue'), { sets: ['park', 'lake'], own: [['hall', 'concert hall', 'the concert hall']],
//     prefix: 'Venue: ', lower: true, gpu })                                       // #038
// Call it before the settings store binds the select (it reads the options and the default).
import { INSCENE } from './inscene.js'
import { SETS } from './sets.js'

/** The menu's order: the in-scene sets and the sets that take over the picture, by id. */
export const STAGE_ORDER = ['stage', 'candle', 'park', 'lake', 'hall']

export function stageDescriptor(id) {
  const t = SETS.find(d => d.id === id)
  if (t) return { id, kind: 'takeover', label: t.label, about: t.about, webgpu: t.webgpu !== false, pathTraced: t.pathTraced !== false }
  const d = INSCENE[id]
  if (d) return { id, kind: 'inscene', label: d.label, about: d.about, webgpu: d.webgpu !== false, pathTraced: d.pathTraced !== false }
  return null
}

export function fillStageMenu(select, { sets = STAGE_ORDER, own = [], prefix = '', lower = false, traced = false, gpu = false, note = '', intro = '', selected } = {}) {
  const entries = [
    ...own.map(([id, label, about]) => ({ id, label, about, webgpu: true, pathTraced: true })),
    ...sets.map(stageDescriptor).filter(Boolean),
  ]
  const first = selected ?? entries[0]?.id
  select.innerHTML = ''
  for (const e of entries) {
    let text = prefix + (lower ? e.label.replace(/^The /, 'the ') : e.label)
    if (traced && !e.pathTraced) text += ' (not path traced)'
    const o = new Option(text, e.id, e.id === first, e.id === first)
    if (gpu && !e.webgpu) { o.disabled = true; o.text += ' - WebGL only' }
    select.add(o)
  }
  const cap = s => s[0].toUpperCase() + s.slice(1)
  const title = entries.map(e => `${e.label.replace(/^The /, 'the ').replace(/^./, c => c.toUpperCase())}: ${e.about}`).map(cap).join('. ')
  const box = select.closest('.field') ?? select
  box.title = intro + title + (note ? '. ' + note : '')
  if (box !== select) select.removeAttribute('title')
  return entries
}
