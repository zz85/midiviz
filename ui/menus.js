// The page's menus trimmed to the audience's list: the settings marked `tail` (ui/settings.js)
// are hidden in the pop-up menus and live in the studio panel (ui/studio.js). Each menu that
// loses some gets a line at its end, "N more in the studio", which opens the panel. A heading
// (.sect) whose fields are all tail is hidden with them. ?menus=all shows everything as before.
//
//   trimMenus(settings, { menus: '.pop', open: () => studio.open() })
//
// PIANIST_TAIL: the element ids of the pianist pages' (#032, #045, #049, #050, #054) long tail,
// for createSettings(sections, { tail: PIANIST_TAIL }). What stays in each menu: Camera: the
// move, the director's preset and Follow; Outfit: the outfit, dress, fabric, shoes, hair and
// their colours, the look, the hands; Performance: gaze, body expression, touch, fingering and
// hands; Visuals: the stage and its sets, the piano, light, exposure, depth of field, bloom,
// grain and dust on and off, the liner notes mode, the renderer and grade; Hall: the sound,
// volume, room, seat, reverb and applause; Render: format, resolution, frame rate, length,
// camera, title and raster / path traced; Path trace: the tracer, samples, size and denoise;
// Score: show, layout and style.

export const PIANIST_TAIL = [
  // Outfit
  'slit', 'hairDensity', 'hairOn', 'hairSim', 'dressOn', 'clothSim', 'smooth', 'simplify', 'faceAsian', 'faceAfrican', 'skinTex',
  // Performance
  'restAfter', 'hips', 'posture', 'reach', 'rock', 'sway', 'nod', 'glances', 'armw', 'lifth', 'wflex', 'frot', 'elbowLead', 'liftoff', 'benchDist', 'benchH', 'replanOn', 'velSrc',
  // Camera
  'dirPace', 'dirBias', 'dirTrans', 'dirStill', 'dirMix', 'shotLbl', 'dirFar', 'dirMed', 'dirClose', 'dirStrings', 'dirPedals', 'dirOpen',
  // Visuals
  'dofAmt', 'dofBoth', 'motionBlur', 'shutter', 'bloomAmt', 'grainAmt', 'vig', 'gpuQual', 'dustAmt', 'itStyle', 'itStyleA', 'itTheme', 'itPos', 'itHeads', 'avsync',
  // Hall
  'rvDecay', 'rvTone', 'boost', 'amb',
  // Render
  'exSplit', 'exHandsHalf', 'exLessonView', 'exLaneTilt', 'exFont', 'exCard', 'exSub', 'exHold', 'exCaps', 'exVtt', 'exParts', 'exTail', 'exLead', 'exEnd', 'exFadeLen',
  // Path trace
  'ptBounces', 'ptHair', 'ptFx',
  // Score (sheet/plugin.js)
  'sPos', 'sRows', 'sSize', 'sHl', 'sVideo',
]

const CSS = `
.pop:not(.all) .tail { display: none !important; }
.pop .tailMore { padding: 6px 2px 2px; font-size: 11.5px; opacity: .75; }
.pop .tailMore button { background: none; border: 0; color: inherit; font: inherit; padding: 0; cursor: pointer; text-decoration: underline; text-underline-offset: 2px; }
.pop .tailMore button:hover { opacity: 1; }
`

export function trimMenus(settings, { menus = '.pop', open = null, doc = globalThis.document, all = new URLSearchParams(globalThis.location?.search || '').get('menus') === 'all' } = {}) {
  if (!doc) return { refresh() {}, counts: () => ({}) }
  if (!doc.getElementById('menusTailCss')) { const st = doc.createElement('style'); st.id = 'menusTailCss'; st.textContent = CSS; doc.head.append(st) }
  const counts = {}
  function refresh() {
    for (const pop of doc.querySelectorAll(menus)) {
      pop.classList.toggle('all', all)
      // a heading goes with its fields: hidden where every field under it is tail
      let sect = null, kept = 0, fields = 0
      const settle = () => { if (sect) sect.classList.toggle('tail', fields > 0 && kept === 0) }
      for (const el of pop.children) {
        if (el.classList.contains('sect')) { settle(); sect = el; kept = 0; fields = 0; continue }
        if (el.classList.contains('tailMore')) continue
        if (!(el.classList.contains('field') || el.classList.contains('chk') || el.tagName === 'LABEL' || el.classList.contains('stageCtl'))) continue
        fields++
        if (!el.classList.contains('tail')) kept++
      }
      settle()
      const n = [...pop.querySelectorAll('.tail')].filter(e => !e.classList.contains('sect') && !e.closest('.tail:not(.sect) .tail')).length
      counts[pop.id] = n
      let more = pop.querySelector('.tailMore')
      if (!n || all) { more?.remove(); continue }
      if (!more) {
        more = doc.createElement('div'); more.className = 'tailMore'
        const b = doc.createElement('button'); b.type = 'button'; b.title = 'Every setting of the page in one panel (also the ` key)'
        b.onclick = ev => { ev.stopPropagation(); open?.() }
        more.append(b); pop.append(more)
      }
      more.querySelector('button').textContent = `${n} more in the studio`
    }
  }
  refresh()
  settings.subscribe('add', refresh)
  return { refresh, counts: () => ({ ...counts }) }
}
