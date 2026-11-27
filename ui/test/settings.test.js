// ui/settings.js on a small fake DOM: defaults from the markup, the address bar in and
// out (bools, colours, numbers, aliases, unknown select values, outfit bases), two-way
// binding with the page's own handlers, when (show / hide), value labels, reload items.
//   node --test ui/test/settings.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createSettings } from '../settings.js'

// just enough of the DOM: elements by id, options, checked / value, events, closest
class El {
  constructor(id, tag, attrs = {}) {
    Object.assign(this, { id, tagName: tag, type: attrs.type || '', style: {}, listeners: {}, parent: null, className: attrs.className || '' })
    if (tag === 'SELECT') { this.options = (attrs.options || []).map(([value, selected = false]) => ({ value, defaultSelected: selected })); this._value = this.options.find(o => o.defaultSelected)?.value ?? this.options[0]?.value ?? '' }
    else if (this.type === 'checkbox') { this.defaultChecked = !!attrs.checked; this.checked = this.defaultChecked }
    else { this.defaultValue = attrs.value ?? ''; this._value = this.defaultValue }
  }
  get value() { return this._value }
  set value(v) { this._value = String(v) }
  addEventListener(t, f) { (this.listeners[t] ||= []).push(f) }
  dispatchEvent(ev) { for (const f of this.listeners[ev.type] || []) f(ev); if (this['on' + ev.type]) this['on' + ev.type](ev); this.fired = (this.fired || []).concat(ev.type); return true }
  closest(sel) { for (let e = this; e; e = e.parent) if (sel.split(',').some(s => s.trim().startsWith('.') ? e.className.split(' ').includes(s.trim().slice(1)) : e.tagName === s.trim().toUpperCase())) return e; return null }
}
class Doc {
  constructor() { this.els = new Map() }
  add(el, parent = null) { el.parent = parent; this.els.set(el.id, el); return el }
  getElementById(id) { return this.els.get(id) || null }
}
globalThis.Event ??= class { constructor(type, init = {}) { this.type = type; this.bubbles = !!init.bubbles } }

function page() {
  const d = new Doc()
  const field = (id, cls = 'field') => d.add(new El(id + 'Box', 'DIV', { className: cls }))
  d.add(new El('light', 'INPUT', { type: 'range', value: '1' }), field('light'))
  d.add(new El('dof', 'INPUT', { type: 'checkbox', checked: false }), field('dof', 'chk'))
  d.add(new El('dofAmt', 'INPUT', { type: 'range', value: '1' }), field('dofAmt'))
  d.add(new El('dofAmtV', 'SPAN'))
  d.add(new El('hairColor', 'INPUT', { type: 'color', value: '#5a3e2a' }))
  d.add(new El('stageSet', 'SELECT', { options: [['stage', true], ['park'], ['lake']] }))
  d.add(new El('parkTod', 'SELECT', { options: [['0'], ['1', true], ['2']] }), field('parkTod'))
  d.add(new El('outfit', 'SELECT', { options: [['red', true], ['blue']] }))
  d.add(new El('dressColor', 'INPUT', { type: 'color', value: '#8e1d1b' }))
  d.add(new El('gpuSel', 'SELECT', { options: [['webgl', true], ['webgpu']] }))
  d.add(new El('ptEngine', 'SELECT', { options: [['gpt-webgpu'], ['mu-webgpu', true]] }))
  return d
}
const OUTFITS = { red: { color: '#8e1d1b' }, blue: { color: '#223355' } }
const schema = () => [
  { id: 'look', label: 'Visuals', items: [
    { key: 'light', type: 'range', url: 'light' },
    { key: 'dof', type: 'bool', url: 'dof' },
    { key: 'dofAmt', type: 'range', url: 'dofamt', format: v => v.toFixed(2).replace(/0$/, '') + 'x' },
    { key: 'hairColor', type: 'color', url: 'hcol' },
    { key: 'stageSet', type: 'select', url: 'scene' },
    { key: 'parkTod', type: 'select', url: 'tod', when: s => s.stageSet === 'park' },
    { key: 'outfit', type: 'select', url: 'outfit' },
    { key: 'dressColor', type: 'color', url: 'dcol', base: s => OUTFITS[s.outfit]?.color },
    { key: 'gpu', el: 'gpuSel', type: 'select', url: 'gpu', reload: true },
    { key: 'ptEngine', type: 'select', url: 'ptengine', urlAliases: ['expt'] },
    { key: 'loop', el: null, type: 'bool', default: false, url: 'loop' },
    { key: 'levels', el: null, type: 'text', default: '', url: 'vol', parse: t => /^\d+,\d+$/.test(t) ? t : undefined },
  ] },
]

test('defaults come from the markup, typed', () => {
  const S = createSettings(schema()).bind(page())
  assert.equal(S.get('light'), 1)
  assert.equal(S.get('dof'), false)
  assert.equal(S.get('hairColor'), '#5a3e2a')
  assert.equal(S.get('stageSet'), 'stage')
  assert.equal(S.get('parkTod'), '1')
  assert.equal(S.get('gpu'), 'webgl')
  assert.equal(S.get('loop'), false)
  assert.equal(S.query('').toString(), '')
})

test('the address bar in: bools, bare keys, colours, aliases, bad values', () => {
  const d = page()
  const S = createSettings(schema()).bind(d)
  const fired = []
  d.getElementById('light').onchange = () => fired.push('light-change')
  d.getElementById('light').addEventListener('input', () => fired.push('light-input'))
  S.read('?light=0.5&dof&hcol=FFAA00&scene=park&tod=2&expt=gpt-webgpu&loop=1&vol=3,4&nothing=1')
  assert.equal(S.get('light'), 0.5)
  assert.equal(S.get('dof'), true)
  assert.equal(S.get('hairColor'), '#ffaa00')
  assert.equal(S.get('stageSet'), 'park')
  assert.equal(S.get('parkTod'), '2')
  assert.equal(S.get('ptEngine'), 'gpt-webgpu')
  assert.equal(S.get('loop'), true)
  assert.equal(S.get('levels'), '3,4')
  assert.deepEqual(fired, ['light-input'], 'a range gets input, not change, and the page handler on it runs')
  assert.equal(d.getElementById('light').value, '0.5')
  // values the page can't take are left as they were
  S.read('?scene=moon&hcol=red&light=abc&tod=9&vol=x')
  assert.equal(S.get('stageSet'), 'park'); assert.equal(S.get('hairColor'), '#ffaa00'); assert.equal(S.get('light'), 0.5); assert.equal(S.get('parkTod'), '2'); assert.equal(S.get('levels'), '3,4')
  // the new key beside its alias wins
  S.read('?expt=gpt-webgpu&ptengine=mu-webgpu')
  assert.equal(S.get('ptEngine'), 'mu-webgpu')
})

test('the address bar out: only what differs, unknown keys kept, aliases dropped', () => {
  const S = createSettings(schema()).bind(page())
  S.set('light', 0.5); S.set('dof', true); S.set('hairColor', '#FFAA00'); S.set('loop', true)
  const q = S.query('?q=low&shot&expt=old')
  assert.equal(S.queryString(q), 'q=low&shot=&light=0.5&dof=1&hcol=ffaa00&loop=1')
  S.set('light', 1); S.set('dof', false)
  assert.equal(S.queryString(S.query('')), 'hcol=ffaa00&loop=1')
  S.set('light', '1.0')   // (the same number written another way is the default)
  assert.equal(S.isDefault('light'), true)
  assert.deepEqual(S.changed(), ['hairColor', 'loop'])
})

test('a base from another setting: the outfit colour counts as the default', () => {
  const S = createSettings(schema()).bind(page())
  assert.equal(S.queryString(S.query('')), '')
  S.set('outfit', 'blue')
  assert.equal(S.queryString(S.query('')), 'outfit=blue&dcol=8e1d1b', 'the red colour on the blue outfit is a change')
  S.set('dressColor', '#223355')
  assert.equal(S.queryString(S.query('')), 'outfit=blue')
})

test('two-way: the control changes the store without a second event; the store changes the control', () => {
  const d = page()
  const S = createSettings(schema()).bind(d)
  const seen = []
  S.subscribe('dof', (v, k, prev) => seen.push([k, v, prev]))
  S.subscribe('*', (v, k) => seen.push(['*', k]))
  const e = d.getElementById('dof')
  e.checked = true; e.dispatchEvent(new Event('change'))
  assert.equal(S.get('dof'), true)
  assert.deepEqual(seen, [['dof', true, false], ['*', 'dof']])
  assert.deepEqual(e.fired, ['change'], 'not dispatched again')
  assert.equal(S.set('dof', true), false, 'no change, no event')
  S.set('dof', false)
  assert.equal(e.checked, false)
  assert.deepEqual(e.fired, ['change', 'change'])
})

test('when hides the field; format fills the label', () => {
  const d = page()
  const S = createSettings(schema()).bind(d)
  assert.equal(d.getElementById('parkTodBox').style.display, 'none')
  S.set('stageSet', 'park')
  assert.equal(d.getElementById('parkTodBox').style.display, '')
  assert.equal(d.getElementById('dofAmtV').textContent, '1.0x')
  S.set('dofAmt', 2.25)
  assert.equal(d.getElementById('dofAmtV').textContent, '2.25x')
})

test('a reload item rewrites the address and reloads; reading it from the URL does not', () => {
  const d = page()
  const S = createSettings(schema()).bind(d)
  const gone = []
  globalThis.location = { pathname: '/x.html', search: '?q=low', hash: '', set href(v) { gone.push(v) } }
  S.read('?gpu=webgpu')
  assert.equal(S.get('gpu'), 'webgpu'); assert.deepEqual(gone, [])
  S.set('light', 0.7)
  S.set('gpu', 'webgl')
  assert.deepEqual(gone, ['/x.html?q=low&light=0.7'])
  delete globalThis.location
})

test('the type comes from the control where none is given', () => {
  const d = page()
  const S = createSettings([{ id: 'x', items: [{ key: 'light', url: 'light' }, { key: 'dof', url: 'dof' }, { key: 'hairColor', url: 'hcol' }, { key: 'stageSet', url: 'scene' }, { key: 'dofAmt', url: 'dofamt', default: '2' }] }]).bind(d)
  assert.equal(S.get('light'), 1); assert.equal(S.get('dof'), false); assert.equal(S.get('hairColor'), '#5a3e2a'); assert.equal(S.get('stageSet'), 'stage'); assert.equal(S.get('dofAmt'), 2)
  S.read('?dof&light=2')
  assert.equal(S.get('dof'), true); assert.equal(S.get('light'), 2)
  assert.equal(d.getElementById('dofAmt').value, '2', 'a given default is written to the control')
  assert.equal(S.queryString(S.query('')), 'light=2&dof=1')
})

test('a section added later binds and reads too', () => {
  const d = page()
  d.add(new El('sOn', 'INPUT', { type: 'checkbox', checked: true }))
  const S = createSettings(schema()).bind(d)
  S.add({ id: 'sheet', items: [{ key: 'sOn', type: 'bool', url: 'sheet' }] })
  assert.equal(S.get('sOn'), true)
  S.read('?sheet=0')
  assert.equal(S.get('sOn'), false); assert.equal(d.getElementById('sOn').checked, false)
  assert.throws(() => S.add({ key: 'sOn' }), /duplicate/)
})

test('a value the page writes into a control, and a value() getter, reach the address bar', () => {
  const d = page()
  let lv = { violin: 0, piano: 0 }
  const S = createSettings([{ id: 'x', items: [
    { key: 'light', type: 'range', url: 'light' },
    { key: 'levels', el: null, type: 'text', url: 'vol', default: '', value: () => lv.violin || lv.piano ? `${lv.violin},${lv.piano}` : '' },
  ] }]).bind(d)
  d.getElementById('light').value = '0.3'   // (no event)
  assert.equal(S.get('light'), 0.3)
  lv = { violin: -6, piano: 0 }
  assert.equal(S.queryString(S.query('')), 'light=0.3&vol=-6,0')
})

test('tail: marked in the schema or by element id, the field gets the class', () => {
  const d = page()
  for (const id of ['lightBox', 'dofBox', 'dofAmtBox']) d.getElementById(id).classList = { list: [], add(c) { this.list.push(c) }, contains(c) { return this.list.includes(c) } }
  const added = []
  const S = createSettings([{ id: 'x', items: [{ key: 'light', url: 'light' }, { key: 'dof', url: 'dof', tail: true }, { key: 'dofAmt', url: 'dofamt' }] }], { tail: ['dofAmt'] })
  S.subscribe('add', sec => added.push(sec.id))
  S.bind(d)
  assert.equal(d.getElementById('lightBox').classList.contains('tail'), false)
  assert.equal(d.getElementById('dofBox').classList.contains('tail'), true)
  assert.equal(d.getElementById('dofAmtBox').classList.contains('tail'), true)
  assert.equal(S.box('dof'), d.getElementById('dofBox'))
  S.add({ id: 'later', items: [{ key: 'loop', el: null, type: 'bool', default: false }] })
  assert.deepEqual(added, ['later'])
})
