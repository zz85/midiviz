// The studio panel: every setting of a page's store (ui/settings.js), drawn with Tweakpane
// from the schema, a folder a section, a binding an item. It is a second view of the same
// store beside the page's own menus: a change in either shows in the other, and the address
// bar is the store's as before. For the person at the keyboard, not the audience: a page
// opens it on ?studio=1 or a key, and never on a phone.
//
//   import { createStudio } from './ui/studio.js'
//   const studio = await createStudio(settings, { title: 'Studio', container, expanded: ['visuals'] })
//   studio.pane            // the Tweakpane Pane
//   studio.show(false)     // hide / show; studio.dispose()
//   studio.addButton('render', { title: 'Render still', section: 'pathtrace', onClick })
//
// What each item becomes. A select: a list of its control's options (or item.options,
// [[value, label], ...], where it has no control); a range: a slider with the control's min,
// max and step (or item.min / max / step); a bool: a checkbox; a colour: a colour picker;
// text: a text field. Its label is item.label, else the text of the label beside its control
// (the value span left out), else its key. An item whose `when` is false is hidden, and
// shown again as the state changes. An item marked `studio: false` is left out, and so is a
// section marked so. `format` writes the value label into the binding's label, after the
// name, as the page's `${el}V` span shows it.
//
// Tweakpane is loaded from `tweakpane`, a module URL (jsdelivr by default), so a page that
// never opens the studio never loads it.

const TWEAKPANE = 'https://cdn.jsdelivr.net/npm/tweakpane@4.0.5/dist/tweakpane.min.js'

export async function createStudio(settings, { title = 'Studio', container = null, expanded = [], tweakpane = TWEAKPANE, Pane = null, doc = globalThis.document } = {}) {
  Pane ||= (await import(tweakpane)).Pane
  const pane = new Pane({ title, container: container || undefined, expanded: true })
  pane.element.classList.add('studio')
  const params = settings.snapshot()
  const bindings = new Map()     // key -> { binding, item, label }
  const folders = new Map()      // section id -> folder
  const unsub = []

  const labelOf = it => {
    if (it.label) return it.label
    const e = settings.element(it.key)
    if (e) {
      const box = e.closest('.field, .chk, label')
      const l = box?.tagName === 'LABEL' ? box : box?.querySelector('label')
      if (l) { const c = l.cloneNode(true); for (const v of c.querySelectorAll('.val, [id$="V"], input, select')) v.remove(); const t = c.textContent.trim(); if (t) return t }
    }
    return it.key
  }
  const optionsOf = it => {
    const e = settings.element(it.key)
    const list = e?.tagName === 'SELECT' ? [...e.options].filter(o => !o.hidden).map(o => [o.value, o.text]) : it.options || []
    return list.map(([value, text]) => ({ text: String(text), value: String(value) }))
  }
  const rangeOf = it => {
    const e = settings.element(it.key)
    const num = v => (v === '' || v == null ? undefined : +v)
    return { min: it.min ?? num(e?.min), max: it.max ?? num(e?.max), step: it.step ?? num(e?.step) }
  }
  const text = (it, v) => it.format ? `${labelOf(it)}  ${it.format(v, settings.state)}` : labelOf(it)

  for (const sec of settings.sections) {
    if (sec.studio === false) continue
    const items = sec.items.filter(it => it.studio !== false && (it.el || it.options || it.type !== 'text' || it.studio))
    if (!items.length) continue
    const folder = pane.addFolder({ title: sec.label || sec.id, expanded: expanded.includes(sec.id) })
    folders.set(sec.id, folder)
    for (const it of items) {
      const opts = { label: text(it, params[it.key]) }
      if (it.type === 'select') { const options = optionsOf(it); if (options.length) opts.options = options; params[it.key] = String(params[it.key]) }
      else if (it.type === 'range' || it.type === 'number') Object.assign(opts, rangeOf(it))
      else if (it.type === 'color') opts.view = 'color'
      if (it.title) opts.title = it.title
      const binding = folder.addBinding(params, it.key, opts)
      if (it.title) binding.element.title = it.title
      binding.on('change', ev => { if (ev.value !== settings.get(it.key)) settings.set(it.key, ev.value) })
      bindings.set(it.key, { binding, item: it })
    }
  }
  function refresh() {
    for (const [key, { binding, item }] of bindings) {
      const v = settings.get(key)
      const pv = item.type === 'select' ? String(v) : v
      if (params[key] !== pv) { params[key] = pv; binding.refresh() }
      if (item.format) binding.label = text(item, v)
      if (item.when) binding.hidden = !item.when(settings.state)
    }
  }
  refresh()
  unsub.push(settings.subscribe('*', refresh))

  const api = {
    pane, folders, bindings, refresh,
    show(on = true) { pane.hidden = !on; return api },
    addButton(id, { title, section = null, onClick }) {
      const where = section && folders.get(section) || pane
      const b = where.addButton({ title }); b.on('click', onClick); return b
    },
    dispose() { for (const u of unsub) u(); pane.dispose() },
  }
  return api
}
