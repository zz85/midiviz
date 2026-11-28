// The studio panel: every setting of a page's store (ui/settings.js), drawn with Tweakpane
// from the schema, a folder a section, a binding an item. It is a second view of the same
// store beside the page's own menus: a change in either shows in the other, and the address
// bar is the store's as before. For the person at the keyboard, not the audience: a page
// opens it on ?studio=1 or a key, and never on a phone.
//
//   import { mountStudio, PIANIST_TAIL } from './ui/studio.js'
//   const settings = createSettings(schema, { tail: PIANIST_TAIL })
//   mountStudio(settings, { on: params.get('studio') === '1', trim: true, hands: () => rig })   // a page's whole hook
//
// mountStudio opens the panel where `on`, and on the ` key (`key`) from then on; the key
// toggles it. The panel, Tweakpane and ui/studio.css are loaded the first time it opens, so a
// page that never opens it loads nothing. It adds the setting `studio` to the store, kept in
// the address bar as ?studio=1 while the panel shows, so a reload keeps it and a link copied
// with it closed doesn't carry it; each open and close sets it, so a page that writes its
// address bar on changes alone subscribes to it (settings.subscribe('studio', saveUrl)). It
// answers { open(), close(), toggle(), studio (a promise of the panel once opened) }. With `trim`, the page's menus are trimmed to the settings not
// marked tail (ui/menus.js), each with a line that opens the panel (`trim` may be trimMenus's
// options, such as { menus: '#top', line: 'pill' }); with `presets`, a Presets folder of saved
// studio states, each a link (ui/presets.js); with `hands`, a getter of
// the pianist's rig, the panel has a Hands folder of the baked tracks (ui/hands-monitor.js) and,
// with `overrides` (pianist/overrides.js, which the page gives its rig with rig.setOverrides), a
// track editor of the lift and lean curves under them (ui/track-editor.js); the curves are the
// setting `curves`, kept in the address bar as ?curves=, so a link carries them. `song` gives the
// editor { duration: () => s, seek: t => ... }.
//
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
// A control the page hides (its field's `hidden`, or display none on it or a box above it,
// such as the WebGPU-only grade on WebGL, or a stage set's box while another set is on) is
// hidden in the panel too, and shown again as the page shows it.
//
// A select whose options the page rebuilds later (the export's resolutions change with the
// format) gets its list made again: each bound select is watched for changes to its options.
//
// Tweakpane is loaded from `tweakpane`, a module URL (jsdelivr by default), so a page that
// never opens the studio never loads it.

const TWEAKPANE = 'https://cdn.jsdelivr.net/npm/tweakpane@4.0.5/dist/tweakpane.min.js'

export async function createStudio(settings, { title = 'Studio', container = null, expanded = [], tweakpane = TWEAKPANE, Pane = null, doc = globalThis.document } = {}) {
  Pane ||= (await import(tweakpane)).Pane
  const pane = new Pane({ title, container: container || undefined, expanded: true })
  pane.element.classList.add('studio')
  const params = settings.snapshot()
  const bindings = new Map()     // key -> { binding, item, folder, opts }
  const folders = new Map()      // section id -> folder
  const observed = new Map()     // select element -> MutationObserver
  const unsub = []

  // a toolbar's select names itself in its options, "Piano: concert grand", "Piano: upright": that
  // prefix is the label, and the options read without it
  const prefixOf = e => {
    const opts = e?.tagName === 'SELECT' ? [...e.options].filter(o => !o.hidden) : []
    if (opts.length < 2) return null
    const m = opts[0].text.match(/^([^:]{1,40}): /)
    return m && opts.every(o => o.text.startsWith(m[1] + ': ')) ? m[1] : null
  }
  const labelOf = it => {
    if (it.label) return it.label
    const e = settings.element(it.key)
    if (e) {
      const box = e.closest('.field, .chk, label')
      const l = box?.tagName === 'LABEL' ? box : box?.querySelector('label')
      if (l) { const c = l.cloneNode(true); for (const v of c.querySelectorAll('.val, [id$="V"], input, select')) v.remove(); const t = c.textContent.trim(); if (t) return t }
      const pre = prefixOf(e); if (pre) return pre
    }
    return it.key
  }
  const optionsOf = it => {
    const e = settings.element(it.key), pre = prefixOf(e)
    const list = e?.tagName === 'SELECT' ? [...e.options].filter(o => !o.hidden).map(o => [o.value, pre ? o.text.slice(pre.length + 2) : o.text]) : it.options || []
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
      bind(folder, it, opts)
    }
  }
  function bind(folder, it, opts, index) {
    const binding = folder.addBinding(params, it.key, index == null ? opts : { ...opts, index })
    if (it.title) binding.element.title = it.title
    binding.on('change', ev => { if (ev.value !== settings.get(it.key)) settings.set(it.key, ev.value) })
    bindings.set(it.key, { binding, item: it, folder, opts })
    const e = settings.element(it.key)
    if (it.type === 'select' && e && globalThis.MutationObserver && !observed.has(e)) {
      const mo = new MutationObserver(() => rebuild(it.key))
      mo.observe(e, { childList: true, attributes: true, attributeFilter: ['hidden'], subtree: true })
      observed.set(e, mo)
    }
    return binding
  }
  // a select's list again, where the page changed its options
  function rebuild(key) {
    const b = bindings.get(key); if (!b) return
    const options = optionsOf(b.item); if (!options.length) return
    const index = b.folder.children.indexOf(b.binding)
    b.folder.remove(b.binding)
    params[key] = String(settings.get(key))
    bind(b.folder, b.item, { ...b.opts, options }, index)
    refresh()
  }
  // whether the page hides the control: its box, or one above it up to the menu, hidden or display none
  const pageHides = e => { for (let b = e; b && !b.classList?.contains('pop'); b = b.parentElement) if (b.hidden || b.style?.display === 'none') return true; return false }
  function refresh() {
    for (const [key, { binding, item }] of bindings) {
      const v = settings.get(key)
      const pv = item.type === 'select' ? String(v) : v
      if (params[key] !== pv) { params[key] = pv; binding.refresh() }
      if (item.format) binding.label = text(item, v)
      const e = settings.element(item.key)
      binding.hidden = (item.when && !item.when(settings.state)) || (e && pageHides(e)) || false
    }
  }
  refresh()
  unsub.push(settings.subscribe('*', refresh))
  // (the page's own show / hide of a field: refreshed a moment after any such change)
  if (globalThis.MutationObserver && doc.body) {
    let t = 0
    const mo = new MutationObserver(() => { clearTimeout(t); t = setTimeout(refresh, 50) })
    mo.observe(doc.body, { attributes: true, attributeFilter: ['hidden', 'style'], subtree: true })
    unsub.push(() => mo.disconnect())
  }

  const api = {
    pane, folders, bindings, refresh,
    show(on = true) { pane.hidden = !on; return api },
    addButton(id, { title, section = null, onClick }) {
      const where = section && folders.get(section) || pane
      const b = where.addButton({ title }); b.on('click', onClick); return b
    },
    dispose() { for (const u of unsub) u(); for (const mo of observed.values()) mo.disconnect(); pane.dispose() },
  }
  return api
}

const CSS = new URL('./studio.css', import.meta.url).href
export { PIANIST_TAIL } from './menus.js'

export function mountStudio(settings, { on = false, key = '`', title = 'Studio', expanded = ['visuals'], doc = globalThis.document, trim = false, hands = null, overrides = null, song = null, presets = true, ...rest } = {}) {
  let studio = null, opening = null, shown = false, menus = null
  if (!settings.item('studio')) settings.add({ id: 'studio', label: 'Studio', studio: false, items: [{ key: 'studio', el: null, type: 'bool', default: false, url: 'studio' }] })
  // the hands' override curves: a text setting the overrides read and write, in the link as ?curves=
  if (overrides && !settings.item('curves')) {
    settings.add({ id: 'curves', label: 'Curves', studio: false, items: [{ key: 'curves', el: null, type: 'text', default: '', url: 'curves', value: () => overrides.toText() }] })
    let fromStore = false
    settings.subscribe('curves', v => { if (!fromStore) overrides.fromText(v) })
    overrides.subscribe(() => { fromStore = true; settings.set('curves', overrides.toText()); fromStore = false })
    const q = new URLSearchParams(globalThis.location?.search || '')
    if (q.get('curves')) overrides.fromText(q.get('curves'))
  }
  const mark = () => { if (settings.get('studio') !== shown) settings.set('studio', shown) }
  async function open() {
    shown = true; mark()
    if (!opening) {
      opening = (async () => {
        if (!doc.querySelector(`link[href="${CSS}"]`)) { const l = doc.createElement('link'); l.rel = 'stylesheet'; l.href = CSS; doc.head.append(l) }
        studio = await createStudio(settings, { title, expanded, doc, ...rest })
        // (an add-on that fails leaves the panel standing: its error is logged)
        const addOn = async (name, f) => { try { studio[name] = await f() } catch (e) { console.error(`studio ${name}:`, e) } }
        if (presets) await addOn('presets', async () => (await import('./presets.js')).addPresets(studio, settings, presets === true ? {} : presets))
        if (hands) await addOn('hands', async () => (await import('./hands-monitor.js')).addHandsMonitor(studio, { rig: hands }))
        if (hands && overrides) await addOn('tracks', async () => (await import('./track-editor.js')).addTrackEditor(studio, { rig: hands, overrides, songDuration: song?.duration, seek: song?.seek }))
        globalThis.__studio = studio   // (for the tests)
        return studio
      })()
    }
    const s = await opening
    s.show(shown)
    return s
  }
  function close() { shown = false; mark(); studio?.show(false) }
  function toggle() { shown ? close() : open() }
  if (key) doc.addEventListener('keydown', ev => {
    if (ev.key !== key || ev.ctrlKey || ev.metaKey || ev.altKey || /INPUT|SELECT|TEXTAREA/.test(ev.target.tagName)) return
    ev.preventDefault(); toggle()
  })
  if (trim) import('./menus.js').then(m => { menus = m.trimMenus(settings, { open, doc, ...(trim === true ? {} : trim) }) })
  if (on) open()
  return { open, close, toggle, get studio() { return opening }, get shown() { return shown }, get menus() { return menus } }
}
