// Presets in the studio (ui/studio.js): a studio state saved under a name and recalled, as the
// settings off their default (ui/settings.js query), so a preset is a link. Kept in localStorage
// under the page's path (`midiviz.presets.<path>`), each { name, query, at }. The folder has a
// list of the saved presets, Recall, Save as... (the name asked for), Copy link (the preset's
// link to the clipboard), Delete, and Reset to defaults (every setting back to its default,
// the song and renderer kept). A preset recalled sets each of its keys through the store, so
// the page's handlers run; keys that reload the page (the piano, the renderer) reload it once
// with the whole preset in the address bar.
//
//   addPresets(studio, settings, { keep: ['q', 'song', 'at', 'gpu', 'studio'] })

const STORE = () => `midiviz.presets.${location.pathname.split('/').pop()}`

export function addPresets(studio, settings, { keep = ['q', 'song', 'at', 'gpu', 'studio', 'shot', 'start'], title = 'Presets' } = {}) {
  const f = studio.pane.addFolder({ title, expanded: false, index: 0 })
  let presets = load()
  const state = { pick: presets[0]?.name || '' }
  const list = f.addBinding(state, 'pick', { label: 'Preset', options: {} })
  const buttons = {}
  for (const [k, title] of [['recall', 'Recall'], ['save', 'Save as...'], ['link', 'Copy link'], ['del', 'Delete']]) buttons[k] = f.addButton({ title })
  const reset = f.addButton({ title: 'Reset to defaults' })
  const note = f.addBlade({ view: 'text', label: '', parse: v => v, value: presets.length ? `${presets.length} saved` : 'none saved yet' })
  note.element.querySelector('input').readOnly = true
  const say = t => { note.controller.value.rawValue = t }

  function load() { try { return JSON.parse(localStorage.getItem(STORE()) || '[]') } catch { return [] } }
  function save() { localStorage.setItem(STORE(), JSON.stringify(presets)); refreshList() }
  function refreshList() {
    const opts = presets.length ? Object.fromEntries(presets.map(p => [p.name, p.name])) : { '(none)': '' }
    list.controller.valueController.props.set('options', Object.entries(opts).map(([text, value]) => ({ text, value })))
    if (!presets.some(p => p.name === state.pick)) state.pick = presets[0]?.name || ''
    list.refresh()
  }
  // the preset's query: the settings off their default, without the page's own keys
  const current = () => { const q = settings.query(''); for (const k of keep) q.delete(k); return settings.queryString(q) }
  const linkOf = q => { const u = new URLSearchParams(location.search); const p = new URLSearchParams(q); for (const [k, v] of p) u.set(k, v); for (const k of settings.keys()) { const it = settings.item(k); if (it.url && !p.has(it.url) && !keep.includes(it.url)) u.delete(it.url) } return location.origin + location.pathname + '?' + settings.queryString(u) }
  function recall(p) {
    if (!p) return
    const q = new URLSearchParams(p.query)
    // the keys that reload: the page goes to the preset's link once
    const reloads = settings.keys().filter(k => { const it = settings.item(k); return it.reload && it.url && q.has(it.url) && settings.serialize(k) !== q.get(it.url) })
    if (reloads.length) { location.href = linkOf(p.query); return }
    // everything else back to its default, then the preset's values
    for (const k of settings.keys()) { const it = settings.item(k); if (it.url && !keep.includes(it.url) && !it.reload && !q.has(it.url)) settings.set(k, settings.defaultOf(k)) }
    settings.read(q)
    say(`recalled ${p.name}`)
  }
  const picked = () => presets.find(p => p.name === state.pick)
  buttons.recall.on('click', () => recall(picked()))
  buttons.save.on('click', () => {
    {
      const name = prompt('Save this studio state as:', state.pick || `preset ${presets.length + 1}`)?.trim()
      if (!name) return
      const q = current(), i = presets.findIndex(p => p.name === name)
      if (i >= 0) presets[i] = { name, query: q, at: Date.now() }; else presets.push({ name, query: q, at: Date.now() })
      state.pick = name; save(); say(`saved ${name}: ${q ? q.split('&').length : 0} settings`)
    }
  })
  buttons.link.on('click', async () => {
    const p = picked(); if (!p) return
    try { await navigator.clipboard.writeText(linkOf(p.query)); say(`link of ${p.name} copied`) } catch { prompt('Copy this link:', linkOf(p.query)) }
  })
  buttons.del.on('click', () => {
    const p = picked(); if (!p || !confirm(`Delete the preset ${p.name}?`)) return
    presets = presets.filter(x => x !== p); save(); say(`deleted ${p.name}`)
  })
  reset.on('click', () => {
    if (!confirm('Every setting back to its default? The song, its position and the renderer stay.')) return
    const u = new URLSearchParams(); for (const k of keep) if (new URLSearchParams(location.search).has(k)) u.set(k, new URLSearchParams(location.search).get(k))
    location.href = location.pathname + (u.toString() ? '?' + settings.queryString(u) : '')
  })
  refreshList()
  return { folder: f, buttons, recall, current, linkOf, get presets() { return presets } }
}
