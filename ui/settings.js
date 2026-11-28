// The settings of a page, declared once: what each control is, its default, the
// key it keeps in the address bar, when it shows and how its value reads. One store
// holds the values; the page's existing markup is bound to it by element id, and
// later a studio panel (Tweakpane) can be drawn from the same schema.
//
//   import { createSettings } from './ui/settings.js'
//   const S = createSettings([
//     { id: 'look', label: 'Visuals', items: [
//       { key: 'light', type: 'range', default: 1, url: 'light' },
//       { key: 'dof', type: 'bool', default: false, url: 'dof', label: 'Depth of field' },
//       { key: 'dofAmt', type: 'range', default: 1, url: 'dofamt', format: v => v.toFixed(2) + 'x' },
//       { key: 'parkTod', type: 'select', default: 1, url: 'tod', when: s => s.stageSet === 'park' },
//       { key: 'gpu', el: 'gpuSel', type: 'select', default: 'webgl', url: 'gpu', reload: true },
//       { key: 'loop', type: 'bool', default: false, url: 'loop', el: null },   // no control: the page sets it
//     ] },
//   ])
//   S.bind(document)                    // the controls by id (item.el, else item.key); two-way
//   S.read(location.search)             // the address bar's values, each as if picked in the menu
//   S.get('light'); S.set('light', 0.8); S.subscribe('light', (v, key, prev) => ...)
//   S.subscribe('*', (v, key) => ...)   // every change
//   S.query(location.search)            // the address bar: the keys off their defaults, the rest kept
//   S.add(section)                      // a plugin's section, after the fact (bind and read it too)
//
// Items. `type`: select (string), bool, range or number (number), color ('#rrggbb'), text;
// left out, the bound control's own kind (a checkbox is a bool, a range a number...), text with none.
// `default`: the value the control starts at, else the markup's own (a checkbox's checked, a
// select's selected option). `url`: its query key; left out, the setting isn't kept in links.
// `urlAliases`: older query keys read for it. `base(state)`: the value that counts as the
// default for the address bar (an outfit's own dress colour), where that depends on another
// setting. `when(state)`: shown only while true (its .field or label is hidden otherwise).
// `format(value, state)`: the text of its value label, the element `${el}V` unless `valueEl`.
// `reload`: a change rewrites the address bar with it and reloads (the renderer, the piano).
// `urlIf(value, state)`: kept in the address bar only while true (a song opened from disk isn't);
// `urlWhenHidden: false`: a hidden setting (its `when` false) comes out of the address bar.
// `parse(text)` / `serialize(value)`: for a key of its own shape ('violin,piano' levels).
// `tail: true`: a setting for the studio (ui/menus.js) rather than the page's menus: its field gets the
// class `tail`, which the menus hide; `createSettings(sections, { tail: ids })` marks each item whose
// element id is in `ids` the same way, so a page keeps its list apart from the schema.
// `el: null`: no control; the page sets it (speed, loop) and it still goes in the address bar.
// `value()`: no control either, read from the page each time it is asked for (a mixer's levels).
// A select whose options the page fills later keeps its `default` until `sync(key)` writes it.
// `get` and `query` read a bound control itself, so a value the page writes into a control
// (`el.value = ...`) is what the address bar gets, store or not.
//
// The address bar. A bool is 1 / 0 (a bare key reads as 1), a colour its hex without the #,
// a number as written. A select's value not among its options, or a colour that isn't six hex
// digits, is left as the page chose it. Keys off their default go in the query, keys at it
// come out, and keys the schema doesn't know (q, shot, song...) stay as they are.
//
// Events. Setting a bound control writes the element and dispatches input (range, color) or
// change, so a handler the page still keeps on the element runs; a change made in the control
// updates the store without dispatching again. Subscribers run after both.

const CONTAINER = '.field, .chk, label, .stageCtl'

export function createSettings(sections = [], { tail = null } = {}) {
  const tailIds = new Set(tail || [])
  const items = new Map()          // key -> item
  const byUrl = new Map()          // url key (and aliases) -> item
  const order = []                 // keys, in schema order
  const secs = []
  const state = {}
  const subs = new Map()           // key or '*' -> Set of fn
  let doc = null

  const isBool = it => it.type === 'bool'
  const isNum = it => it.type === 'range' || it.type === 'number'
  const hex = v => String(v ?? '').replace(/^#/, '').toLowerCase()

  function coerce(it, v) {
    if (v == null) return v
    if (isBool(it)) return typeof v === 'string' ? v !== '0' && v !== 'false' : !!v
    if (isNum(it)) { const n = +v; if (!Number.isFinite(n)) return undefined; const st = it.step ?? (doc && it.el ? +doc.getElementById(it.el)?.step : 0); return st > 0 ? +(Math.round(n / st) * st).toFixed(10) : n }
    if (it.type === 'color') return /^#?[0-9a-f]{6}$/i.test(String(v)) ? '#' + hex(v) : undefined
    return String(v)
  }
  // the value as the address bar writes it
  function serialize(it, v) {
    if (it.serialize) return it.serialize(v)
    if (isBool(it)) return v ? '1' : '0'
    if (it.type === 'color') return hex(v)
    return String(v ?? '')
  }
  function parse(it, text) {
    if (it.parse) return it.parse(text)
    if (isBool(it) && text === '') return true
    return coerce(it, text)
  }
  // two serialized values that mean the same (a number written two ways, a colour's case)
  const same = (a, b) => a === b || (a !== '' && b !== '' && !isNaN(a) && !isNaN(b) && +a === +b) || a.toLowerCase() === b.toLowerCase()

  function add(section) {
    const sec = section.items ? section : { id: section.id || 'items', items: [section] }
    secs.push(sec)
    for (const it of sec.items) {
      if (items.has(it.key)) throw new Error(`settings: duplicate key ${it.key}`)
      it.section = sec
      if (it.el === undefined) it.el = it.key
      if (it.type == null) { it.type = 'text'; it._inferType = true }
      if (it.when == null && sec.when) it.when = sec.when
      if (it.el && tailIds.has(it.el)) it.tail = true
      items.set(it.key, it); order.push(it.key)
      if (it.url) { byUrl.set(it.url, it); for (const a of it.urlAliases || []) byUrl.set(a, it) }
      state[it.key] = it.default !== undefined ? coerce(it, it.default) : (isBool(it) ? false : isNum(it) ? 0 : '')
      it._default = state[it.key]
    }
    if (doc) { bindItems(sec.items); showHide() }
    for (const f of subs.get('add') || []) f(sec)
    return sec
  }

  // ── the DOM ──
  const el = it => it.el && doc ? doc.getElementById(it.el) : null
  const boxOf = (it, e) => (it.container && doc.getElementById(it.container)) || e.closest(CONTAINER) || e
  function domDefault(it, e) {
    if (e.type === 'checkbox') return e.defaultChecked
    if (e.tagName === 'SELECT') return ([...e.options].find(o => o.defaultSelected) || e.options[0])?.value ?? ''
    if (e.type === 'color') return e.defaultValue
    return e.defaultValue ?? e.value
  }
  function domGet(it, e) { return coerce(it, e.type === 'checkbox' ? e.checked : e.value) }
  function domSet(it, e, v) {
    if (e.type === 'checkbox') e.checked = !!v
    else if (e.tagName === 'SELECT') { const s = String(v); if (![...e.options].some(o => o.value === s)) return false; e.value = s }
    else e.value = String(v)
    return true
  }
  const eventOf = e => e.type === 'range' || e.type === 'color' ? 'input' : 'change'
  function bindItems(list) {
    for (const it of list) {
      const e = el(it)
      if (!e) continue
      if (it._inferType) { it.type = e.type === 'checkbox' ? 'bool' : e.type === 'range' || e.type === 'number' ? 'range' : e.type === 'color' ? 'color' : e.tagName === 'SELECT' ? 'select' : 'text'; it._inferType = false; if (it.default !== undefined) it._default = state[it.key] = coerce(it, it.default) }
      // (the control may hold a value already, set by the page before the bind: that is the value, the markup's the default)
      if (it.default === undefined) { it._default = coerce(it, domDefault(it, e)); state[it.key] = domGet(it, e) ?? it._default }
      else domSet(it, e, state[it.key])   // (a select not filled yet keeps the default; sync(key) once it is)
      if (!it.el) continue
      if (it.tail) boxOf(it, e).classList.add('tail')
      const onChange = () => { const v = domGet(it, e); if (v !== undefined) set(it.key, v, { fromDom: true }) }
      e.addEventListener('input', onChange)
      e.addEventListener('change', onChange)
      label(it)
    }
  }
  function label(it) {
    if (!it.format || !doc) return
    const l = doc.getElementById(it.valueEl || (it.el + 'V'))
    if (l) l.textContent = it.format(state[it.key], state)
  }
  function showHide() {
    if (!doc) return
    for (const it of items.values()) {
      if (!it.when) continue
      const e = el(it); if (!e) continue
      show(boxOf(it, e), it.when(state))
    }
    for (const sec of secs) if (sec.when && sec.el) { const b = doc.getElementById(sec.el); if (b) show(b, sec.when(state)) }
  }
  // (both ways a page hides a control: the hidden attribute, or display none on its box)
  const show = (box, on) => { box.hidden = !on; box.style.display = on ? '' : 'none' }
  function bind(d = globalThis.document) {
    doc = d
    bindItems([...items.values()])
    showHide()
    return api
  }

  // ── values ──
  // a bound control, or a value() getter, is read each time: the page may have written it itself
  function current(it) {
    if (it.value) { let v; try { v = coerce(it, it.value()) } catch { v = undefined }   // (a page still loading: the value isn't made yet)
      if (v !== undefined) state[it.key] = v }
    else { const e = el(it); if (e) { const v = domGet(it, e); if (v !== undefined) state[it.key] = v } }
    return state[it.key]
  }
  const get = key => { const it = items.get(key); if (!it) throw new Error(`settings: unknown key ${key}`); return current(it) }
  const sync = key => { const it = items.get(key), e = el(it); if (e) domSet(it, e, state[key]); label(it); return api }
  function set(key, value, { fromDom = false, silent = false } = {}) {
    const it = items.get(key)
    if (!it) throw new Error(`settings: unknown key ${key}`)
    const v = coerce(it, value)
    if (v === undefined) return false
    const prev = state[key]
    if (v === prev && !fromDom) return false
    state[key] = v
    const e = el(it)
    if (e && !fromDom) {
      if (!domSet(it, e, v)) { state[key] = prev; return false }
      if (!silent) e.dispatchEvent(new Event(eventOf(e), { bubbles: true }))
    }
    if (v === prev) return false
    label(it)
    showHide()
    for (const o of items.values()) if (o.format && o.format.length > 1 && o !== it) label(o)
    if (it.reload && !silent && doc) { reload(); return true }
    for (const f of subs.get(key) || []) f(v, key, prev)
    for (const f of subs.get('*') || []) f(v, key, prev)
    return true
  }
  function subscribe(key, fn) {
    if (!subs.has(key)) subs.set(key, new Set())
    subs.get(key).add(fn)
    return () => subs.get(key).delete(fn)
  }
  const baseOf = it => it.base ? (it.base(state) ?? it._default) : it._default
  const isDefault = key => { const it = items.get(key); return same(serialize(it, current(it)), serialize(it, coerce(it, baseOf(it)))) }

  // ── the address bar ──
  function read(search = globalThis.location?.search || '', keys = null) {
    const p = search instanceof URLSearchParams ? search : new URLSearchParams(String(search).replace(/^\?/, ''))
    const seen = new Set()
    for (const [k, text] of p) {
      const it = byUrl.get(k)
      if (!it || seen.has(it) || (keys && !keys.includes(it.key))) continue
      if (k !== it.url && p.has(it.url)) continue   // (an old alias beside the new key: the new one counts)
      seen.add(it)
      const v = parse(it, text)
      if (v === undefined) continue
      const e = el(it)
      if (e && e.tagName === 'SELECT' && ![...e.options].some(o => o.value === String(v))) continue
      // (a value() item isn't read here: the page's value may not exist yet at start-up)
      if (same(serialize(it, v), serialize(it, it.value ? state[it.key] : current(it)))) continue
      set(it.key, v, { silent: !!it.reload })
    }
    return api
  }
  function query(from = globalThis.location?.search || '') {
    const q = from instanceof URLSearchParams ? new URLSearchParams(from) : new URLSearchParams(String(from).replace(/^\?/, ''))
    for (const it of items.values()) current(it)
    for (const key of order) {
      const it = items.get(key)
      if (!it.url) continue
      for (const a of it.urlAliases || []) q.delete(a)
      if (isDefault(key) || (it.when && !it.when(state) && it.urlWhenHidden === false) || (it.urlIf && !it.urlIf(state[key], state))) q.delete(it.url)
      else q.set(it.url, serialize(it, state[key]))
    }
    return q
  }
  const queryString = q => q.toString().replace(/%2F/g, '/').replace(/%2C/g, ',')
  function reload(extra = q => q) {
    const q = extra(query()) || query()
    const s = queryString(q)
    globalThis.location.href = globalThis.location.pathname + (s ? '?' + s : '') + globalThis.location.hash
  }

  const api = {
    add, bind, read, query, queryString, reload, get, set, sync, subscribe, isDefault,
    sections: secs, items, state,
    box: key => { const it = items.get(key), e = el(it); return e ? boxOf(it, e) : null },
    keys: () => [...order],
    item: key => items.get(key),
    element: key => el(items.get(key)),
    defaultOf: key => items.get(key)._default,
    snapshot: () => { for (const it of items.values()) current(it); return { ...state } },
    changed: () => order.filter(k => items.get(k).url && !isDefault(k)),
    serialize: (key, v = state[key]) => serialize(items.get(key), v),
    refresh: () => { for (const it of items.values()) label(it); showHide() },
  }
  for (const s of sections) add(s)
  return api
}
