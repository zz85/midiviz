// A focus puller for the pianist's camera: where the depth of field focuses,
// and how shallow it is (#045, after #030's).
//
//   const pull = createFocusPuller()
//   const { focus, aperture } = pull.update({ camera, dt, subject, hands, handsMid, eyes, target, snap, amount, shot })
//   bokeh.uniforms.focus.value = focus; bokeh.uniforms.aperture.value = aperture
//
// • Focus is a depth along the camera's view axis, as three's BokehShader
//   measures it (focus + viewZ), not the straight-line distance: an
//   off-centre subject is sharp, not a little in front of the focus plane.
// • subject 'head': her eyes (the eye bones sit at the cornea; the head
//   bone is low in the skull). 'hands': the hand a focus puller would pick
//   (the one nearer the middle of the frame, or the busier one), kept until
//   the other clearly wins for HOLD seconds, so a single note doesn't pull
//   focus; both hands at about the same depth: between them. 'target': the
//   shot's own aim point (the hammers, the pedals).
// • A pull eases over TAU seconds, the same at any frame rate (an export at
//   12 fps pulls as fast as the page at 60); a cut (snap) jumps.
// • The aperture: shallower the closer the subject, as a real lens at one
//   f-stop (×220 cm / focus, within 0.3–1.6), times the Blur slider and the
//   shot's own amount (SHOT_DOF).
// • Her face and her hands in one frame (the medium shots of her, over her
//   shoulder, from above), or both hands (the close shots of the keys): all
//   of them are kept sharp where the lens allows it. The
//   focus goes between the nearest and the farthest of them, and the aperture
//   closes just enough that each stays within SHARP (the blur a viewer reads
//   as sharp: a radius of about 1/2000 of the frame's width); the room behind,
//   a metre and more away, still blurs. Where that would close it below SPLIT_MIN
//   of the shot's own (the face and the hands far apart in depth, as over her
//   shoulder), the lens keeps its aperture and pulls focus instead: to the
//   shot's subject, and to her eyes while she looks up from the keys (glance),
//   back to the keys after, each pull over RACK seconds.
//   `split` (default on) turns this off: the shot's subject alone, as before.

import * as THREE from 'three'

const TAU = 0.16, HOLD = 1.5, BASE = 0.0001, REF = 220
// three's BokehShader blurs by |depth - focus| × aperture (a fraction of the frame), its
// taps reaching 0.4 of that: SHARP 0.00125 is a tap radius of 1/2000 of the frame's width
export const SHARP = 0.00125, SPLIT_MIN = 0.4, RACK = 0.6

/**
 * Each spot's depth of field against the others (pianist/director.js SPOTS):
 * shallower along the keys and on the mechanism, where the falloff is the
 * picture; deeper looking straight down on the keys (the keyboard lies in
 * the focus plane anyway) and from above the lid.
 */
export const SHOT_DOF = {
  keys: 1.4, bassKeys: 1.4, hammers: 1.3, pedalsClose: 1.2, feet: 1.1,
  face: 1.2, headside: 1.2, profile: 1.15, front: 1.15,
  keysTop: 0.5, keysUp: 0.5, top: 0.3, above: 0.7, overKeys: 0.8, high: 0.8,
  player: 0.6,
}

export function createFocusPuller({ tau = TAU, hold = HOLD } = {}) {
  let z = 0, hand = null, lead = 0, ap = 0, racked = null, pulling = false
  const fwd = new THREE.Vector3(), d = new THREE.Vector3(), q = new THREE.Vector3()
  const depth = (camera, p) => d.subVectors(p, camera.position).dot(fwd)

  // the hand to keep sharp: its depth, or null (none in the frame)
  function handDepth(camera, hands, dt, snap) {
    const cand = {}
    for (const side of ['L', 'R']) {
      const h = hands?.[side]
      if (!h?.visible) continue
      const p = h.joints.M, hz = depth(camera, p)
      if (hz < camera.near * 2) continue
      q.copy(p).project(camera)
      const off = Math.hypot(q.x, q.y)
      if (off > 1.2) continue   // out of the frame
      const busy = (h.diag?.press || []).reduce((a, v) => a + v, 0)
      cand[side] = { z: hz, w: (1.25 - off) * (0.5 + Math.min(1, busy)) }
    }
    const sides = Object.keys(cand)
    if (!sides.length) { hand = null; return null }
    // both at about the same depth: between them, both sharp
    if (sides.length === 2 && Math.abs(cand.L.z - cand.R.z) < 10) { lead = 0; return (cand.L.z + cand.R.z) / 2 }
    const best = sides.reduce((a, b) => cand[b].w > cand[a].w ? b : a)
    if (snap || !cand[hand]) { hand = best; lead = 0 }
    else {
      // (it must win for a while)
      const other = sides.find(s => s !== hand && cand[s].w > cand[hand].w * 1.25)
      lead = other ? lead + dt : 0
      if (lead > hold) { hand = other; lead = 0 }
    }
    return cand[hand].z
  }

  // what of her eyes and her hands the frame holds, by depth: { near, far, eyes (null where
  // they are out of it) }, or null where it holds fewer than two of them, or no hand
  function inFrame(camera, eyes, hands) {
    const visible = p => { q.copy(p).project(camera); return Math.abs(q.x) <= 0.95 && Math.abs(q.y) <= 0.95 && q.z < 1 }
    const ze = eyes && visible(eyes) ? depth(camera, eyes) : null, zs = ze != null ? [ze] : []
    let nh = 0
    for (const side of ['L', 'R']) { const h = hands?.[side]; if (h?.visible && visible(h.joints.M)) { zs.push(depth(camera, h.joints.M)); nh++ } }
    if (zs.length < 2 || !nh) return null
    return { near: Math.min(...zs), far: Math.max(...zs), eyes: ze }
  }

  return {
    get focus() { return z },
    get hand() { return hand },
    /**
     * camera (its place for this frame), dt (s), subject 'hands' | 'head' | 'target',
     * hands { L, R } (hand drivers: visible, joints.M, diag.press), handsMid / eyes / target
     * (Vector3 fallbacks), snap (a cut), amount (the Blur slider), shot (SHOT_DOF factor)
     */
    update({ camera, dt = 1 / 60, subject = 'head', hands = null, handsMid = null, eyes = null, target = null, snap = false, amount = 1, shot = 1, glance = false, split = true }) {
      camera.updateMatrixWorld()
      camera.getWorldDirection(fwd)
      let goal = null
      if (subject === 'hands') goal = handDepth(camera, hands, dt, snap) ?? (handsMid && depth(camera, handsMid))
      else if (subject === 'target') goal = target && depth(camera, target)
      else goal = (eyes || target) && depth(camera, eyes || target)
      if (!(goal > camera.near * 2)) goal = Math.max(camera.near * 2, goal || REF)
      const apOf = f => BASE * THREE.MathUtils.clamp(REF / f, 0.3, 1.6) * amount * shot
      let apGoal = null, mode = 'subject'
      // her face and a hand in the frame: both sharp, or a pull between them
      const both = split && subject !== 'target' ? inFrame(camera, eyes, hands) : null
      if (both) {
        const mid = (both.near + both.far) / 2, half = (both.far - both.near) / 2, want = apOf(mid)
        const fits = half > 0 ? SHARP / half : Infinity
        if (fits >= SPLIT_MIN * want) { goal = mid; apGoal = Math.min(want, fits); mode = 'both' }
        else {
          // too far apart for one focus: the subject, or her eyes while she looks up
          const to = glance && both.eyes != null ? 'eyes' : subject
          if (to === 'eyes') goal = both.eyes
          if (racked && racked !== to) pulling = true
          racked = to; mode = to === 'eyes' ? 'eyes' : 'subject'
        }
      } else racked = null
      // (a pull racked between the face and the keys takes about RACK s; one that follows a hand, TAU)
      if (snap || Math.abs(goal - z) < 0.5) pulling = false
      const k = 1 - Math.exp(-Math.max(0, dt) / (pulling ? RACK / 3 : tau))
      z = snap || !(z > 0) ? goal : z + (goal - z) * k
      const a = apGoal ?? apOf(z)
      ap = snap || !(ap > 0) ? a : ap + (a - ap) * (1 - Math.exp(-Math.max(0, dt) / TAU))
      return { focus: z, aperture: ap, mode }
    },
  }
}
