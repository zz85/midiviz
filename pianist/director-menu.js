// Camera → Director's Preset, Still shots and Subjects menus (pianist/director.js
// DIRECTOR_PRESETS, STILL_SHARES, SUBJECT_MIXES), for the pages that have a director
// menu: #032 and pathtrace/app.js (#045, #049, #050).
//
//   wireDirectorMenu($, dirSet)   after the director's other controls are wired
//
// $: id → element. dirSet(key, value): sets a director option (and replans). A
// preset sets each control it names and fires its change, so each control's own
// handler applies it, and the link keeps each one (?dpreset=, ?dstill=, ?dmix=,
// with ?pace=, ?favour=, ?trans=, ?dfar= ...).
import { DIRECTOR_PRESETS, STILL_SHARES, SUBJECT_MIXES } from './director.js'

export function wireDirectorMenu($, dirSet) {
  const fill = (id, entries) => {
    const el = $(id)
    if (!el || el.options.length) return el
    for (const [k, label] of entries) el.add(new Option(label, k, k === 'auto', k === 'auto'))
    return el
  }
  const still = fill('dirStill', Object.entries(STILL_SHARES).map(([k, [l]]) => [k, l]))
  const mix = fill('dirMix', Object.entries(SUBJECT_MIXES).map(([k, [l]]) => [k, l]))
  const preset = fill('dirPreset', Object.entries(DIRECTOR_PRESETS).map(([k, p]) => [k, p.label]))
  if (still) still.onchange = () => dirSet('still', STILL_SHARES[still.value]?.[1] ?? null)
  if (mix) mix.onchange = () => dirSet('mix', SUBJECT_MIXES[mix.value]?.[1] ?? null)
  if (!preset) return
  preset.onchange = () => {
    const p = DIRECTOR_PRESETS[preset.value]
    if (!p) return
    const put = (id, v) => {
      const el = $(id)
      if (!el) return
      if (el.type === 'checkbox') { if (el.checked === v) return; el.checked = v }
      else { if (el.value === String(v)) return; el.value = String(v) }
      el.dispatchEvent(new Event('change'))
    }
    put('dirPace', p.pace); put('dirBias', p.bias); put('dirTrans', p.trans)
    // (sizes: switch the new ones on before the old ones off, so one stays on throughout)
    const sizeIds = [['dirClose', 0], ['dirMed', 1], ['dirFar', 2]]
    for (const [id, n] of sizeIds) if (p.sizes.includes(n)) put(id, true)
    for (const [id, n] of sizeIds) if (!p.sizes.includes(n)) put(id, false)
    put('dirStill', p.still); put('dirMix', p.mix)
  }
}
