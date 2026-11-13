// The page while a video renders: nothing but Cancel answers the keyboard, the mouse or a
// touch, so a stray key (the outfit presets on 1-0, S for the score, Space, Escape), a
// click in a menu or a drag on the picture can't change what the render is drawing.
//
//   const lock = createRenderLock({ allow: ['#exCancel'], note: 'Rendering…' })
//   lock.on()   … the render …   lock.off()
//
// on(): every control of the page (inputs, selects, buttons, but those `allow` names) is
// disabled, and keyboard, pointer, wheel and clipboard events are stopped at the window
// before any of the page's own handlers see them (capture phase); closing or reloading the
// tab asks first. off() gives each control back the state it had. A call the page makes
// itself (the export setting a control, Resume pressing Export) still works: only the
// person's input is stopped.

const EVENTS = ['keydown', 'keyup', 'keypress', 'pointerdown', 'pointerup', 'pointermove', 'mousedown', 'mouseup', 'click', 'dblclick', 'contextmenu', 'wheel', 'touchstart', 'touchmove', 'input', 'change', 'paste', 'drop', 'dragover']

export function createRenderLock({ allow = [], note = 'Rendering: the page takes no input until it finishes or you cancel.' } = {}) {
  let on = false, saved = [], banner = null
  const allowed = t => t instanceof Element && allow.some(sel => t.closest(sel))
  const stop = ev => {
    if (!on || !ev.isTrusted || allowed(ev.target)) return
    // (moving the mouse is harmless, and stopping it would hide the cursor's hover only)
    if (ev.type === 'pointermove') return
    ev.stopImmediatePropagation()
    if (ev.cancelable && ev.type !== 'pointermove') ev.preventDefault()
    if (ev.type === 'keydown' || ev.type === 'pointerdown') flash()
  }
  const leave = ev => { if (on) { ev.preventDefault(); ev.returnValue = '' } }
  for (const type of EVENTS) addEventListener(type, stop, { capture: true, passive: false })
  addEventListener('beforeunload', leave)
  function flash() {
    if (!banner) return
    banner.classList.remove('flash'); void banner.offsetWidth; banner.classList.add('flash')
  }
  return {
    get on() { return on },
    on() {
      if (on) return
      on = true
      saved = []
      for (const el of document.querySelectorAll('input, select, button, textarea')) {
        if (allowed(el)) continue
        saved.push([el, el.disabled]); el.disabled = true
      }
      document.activeElement?.blur?.()
      document.body.classList.add('rendering')
      banner = Object.assign(document.createElement('div'), { id: 'renderLock', textContent: note })
      banner.style.cssText = 'position:fixed;left:50%;top:12px;transform:translateX(-50%);z-index:1000;padding:6px 14px;border-radius:8px;background:rgba(20,16,12,.82);color:#f3e9d6;font:13px/1.3 system-ui,sans-serif;pointer-events:none;transition:background .4s'
      const st = document.createElement('style')
      st.textContent = '#renderLock.flash{background:rgba(160,60,30,.9);transition:none}'
      banner.append(st)
      document.body.append(banner)
    },
    off() {
      if (!on) return
      on = false
      for (const [el, d] of saved) el.disabled = d
      saved = []
      document.body.classList.remove('rendering')
      banner?.remove(); banner = null
    },
  }
}
