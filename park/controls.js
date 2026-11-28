// The park's controls (#051), declared once for every page that puts a stage in it: a
// section for ui/settings.js, with the hour, the tree, the ambience, the painted
// performers and (where the page takes it) the park's size. The pages bind it to their
// own markup: #038's toolbar names the controls tod, tstyle, amb, ppaint, pscale and keeps
// the birds as ?amb=; #032 and #045 (stages/sets.js) name them parkTod, parkTree, parkAmb,
// parkPaint and keep the birds as ?birds=. Both read the same links as before.
//
//   const S = createSettings([parkSettings({ ids: { tod: 'tod', ... }, birdsKey: 'amb', scale: true, when: s => ... })])
//   fillParkOptions(S, { timeLabel: n => 'Time: ' + n.toLowerCase() })   // the hours and trees into the selects
//   wirePark(S, park)   // the store drives the park: setTime, setStyle, the sound, the painted performers
import { TIMES } from './park.js'

export const PARK_TIMES = TIMES
export const PARK_TREES = [['summer', 'Summer'], ['sakura', 'Cherry blossom'], ['autumn', 'Autumn'], ['maple', 'Maple']]
export const PARK_SCALES = [['0.45', '0.45 size'], ['0.5', '1/2 size'], ['0.75', '3/4 size'], ['1', 'full size']]
export const PARK_DEFAULTS = { tod: 1, tree: 'summer', amb: true, paint: false, scale: 0.45, azimuth: 55, ambience: 0.7 }

const IDS = { tod: 'parkTod', tree: 'parkTree', amb: 'parkAmb', paint: 'parkPaint', scale: 'parkScale' }
// (the studio's own, with no control in the menus: no element, a range of their own)
const STUDIO = { parkSun: { label: 'Sun bearing', min: 0, max: 360, step: 1 }, parkAmbience: { label: 'Birds and wind level', min: 0, max: 2, step: 0.05 }, parkScale: { label: 'Park size', min: 0.1, max: 2, step: 0.05 } }

// `who`: the performers in the labels, 'them' (the duo) or 'her' (the pianist alone). `scale`: a select of
// the park's size in the menus (#038); where it's false the size is a slider of the studio's alone (the
// pianist pages), as the sun's bearing (?psun=, degrees along the horizon) and the ambience's level
// (?pamb=, 0-2) are everywhere: all three with no control in the menus, so only the studio shows them.
// A change of the size reloads the page: the park is built at a size.
export function parkSettings({ ids = {}, birdsKey = 'birds', scale = false, when = null, timeOffset = 0, who = 'them' } = {}) {
  const id = k => ids[k] ?? IDS[k]
  const her = who === 'her', they = her ? 'she plays' : 'they play', them = her ? 'her' : 'them', their = her ? 'her' : 'their'
  const items = [
    { key: 'parkTod', el: id('tod'), type: 'select', default: String(PARK_DEFAULTS.tod), url: 'tod', label: 'Time of day', options: PARK_TIMES.map(([i, n]) => [String(i), '' + n]) },
    { key: 'parkTree', el: id('tree'), type: 'select', default: PARK_DEFAULTS.tree, url: 'tree', label: 'Tree', options: PARK_TREES },
    { key: 'parkAmb', el: id('amb'), type: 'bool', default: PARK_DEFAULTS.amb, url: birdsKey, label: 'Birds and wind', title: `Wind, songbirds and insects while ${they} (Sorairo's ambience; not in exported videos)` },
    { key: 'parkPaint', el: id('paint'), type: 'bool', default: PARK_DEFAULTS.paint, url: 'ppaint', label: `Paint ${them} with the park`, title: `Draw ${them} into the painting: through the park's light shafts, grade and painterly brush with the piano, so ${their} outlines soften into strokes. Off: graded apart and laid sharp over the painted park` },
  ]
  // the park's size (#038): any value from 0.02 to 4 in a link, the menu's four by default; a change reloads
  if (scale) items.push({ key: 'parkScale', el: id('scale'), type: 'select', default: String(PARK_DEFAULTS.scale), url: 'pscale', label: 'Park size', reload: true, options: PARK_SCALES,
    parse: t => { const k = +t; return k >= 0.02 && k <= 4 ? String(k) : undefined } })
  else items.push({ key: 'parkScale', el: null, type: 'range', default: PARK_DEFAULTS.scale, url: 'pscale', reload: true, studio: true, ...STUDIO.parkScale,
    parse: t => { const k = +t; return k >= 0.02 && k <= 4 ? k : undefined }, title: 'The park around her and the piano, who stay as they are: 1 is life size. Changing it reloads the page' })
  items.push(
    { key: 'parkSun', el: null, type: 'range', default: PARK_DEFAULTS.azimuth, url: 'psun', studio: true, ...STUDIO.parkSun, title: 'Where along the horizon the sun stands, in degrees; the hour sets its height. 55 as made' },
    { key: 'parkAmbience', el: null, type: 'range', default: PARK_DEFAULTS.ambience, url: 'pamb', studio: true, ...STUDIO.parkAmbience, title: 'How loud the wind, songbirds and insects play; 0.7 as made, 0 silent' },
  )
  return { id: 'park', label: 'The park', when, timeOffset, items }
}

// the hours and the trees into the page's selects (the markup leaves them empty)
// (`search`: the address bar, for a size from a link that isn't one of the menu's: it is
// added to the select, so S.read(search) can take it)
export function fillParkOptions(S, { timeLabel = n => '' + n, treeLabel = n => n, scaleLabel = n => 'Park: ' + n, search = null } = {}) {
  const fill = (key, list, lab) => {
    const e = S.element(key); if (!e || e.options.length) return
    for (const [v, n] of list) e.add(new Option(lab(n), String(v)))
    S.sync(key)
  }
  fill('parkTod', PARK_TIMES, timeLabel)
  fill('parkTree', PARK_TREES, treeLabel)
  if (S.item('parkScale')) {
    fill('parkScale', PARK_SCALES, scaleLabel)
    const e = S.element('parkScale'), v = search && S.item('parkScale').parse(new URLSearchParams(search).get('pscale') || '')
    if (e && v && ![...e.options].some(o => o.value === v)) e.add(new Option(scaleLabel(v + ' size'), v))
  }
}

// the store drives a park: `park` is park/park.js's (setTime, setStyle, sound.setOn, S.paintPerformers),
// or park/stage.js's host of one (setTime, setStyle, setSound, setPainted, which add the stage's own
// offset to the hour). `playing()` says whether the song plays, for the sound.
export function wirePark(S, park, { playing = () => true, timeOffset = 0, onChange = () => {} } = {}) {
  const sound = () => { const on = S.get('parkAmb') && playing(); if (park.sound) park.sound.setOn(on); else park.setSound?.(on) }
  S.subscribe('parkTod', v => { park.setTime(+v + timeOffset); onChange() })
  S.subscribe('parkTree', v => { park.setStyle(v); onChange() })
  S.subscribe('parkAmb', () => { sound(); onChange() })
  S.subscribe('parkPaint', v => { if (park.S) park.S.paintPerformers = v; else park.setPainted?.(v); onChange() })
  S.subscribe('parkSun', v => { park.setAzimuth(v); onChange() })
  S.subscribe('parkAmbience', v => { park.setAmbience(v); onChange() })
  // (the values a link brought, before any change)
  park.setAzimuth(S.get('parkSun')); park.setAmbience(S.get('parkAmbience'))
  return { sound }
}
