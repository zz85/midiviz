// The action of a grand piano, key by key: what the key, the hammer and the
// damper do between a note-on and the next one. No three.js: concert-grand.js
// draws the parts from the numbers kept here, and the tests drive it alone.
//
// A grand has a double-escapement (repetition) action:
//   - the key lifts the wippen; the jack on the wippen pushes the hammer's
//     knuckle, so the hammer rises with the key, about 4.8 times as far;
//   - a few millimetres short of the string the jack's toe meets the let-off
//     button and the jack slips out from under the knuckle (escapement). The
//     hammer flies the rest of the way on its own, strikes, and rebounds;
//   - with the key still down the backcheck on the key catches the falling
//     hammer, about 15 mm below the string;
//   - let the key rise a little and the backcheck lets go: the repetition lever
//     (sprung, on the wippen) lifts the hammer back up to just under let-off,
//     held there by the drop screw, so the jack can slip back under the knuckle.
//     The key can strike again from there, without rising all the way: this is
//     what lets a grand repeat a note faster than an upright;
//   - as the key goes down past about half its dip, its back end lifts the
//     damper off the strings through the underlever; the right pedal lifts every
//     damper on the tray, the middle pedal keeps up those that were up when it
//     went down; the left pedal (una corda) slides the keys and the action to
//     the treble, so each hammer strikes one string fewer.
//
// Numbers: regulation values a technician sets on a concert grand (key dip
// about 10 mm, blow distance 45-47 mm, let-off 1.5-3 mm graded from the bass to
// the treble, drop 1-2 mm below let-off, checking 12-16 mm from the string, the
// damper starting to lift halfway down the key), and hammer speeds at the
// string of about 1 m/s (pp) to 6-7 m/s (ff) as measured by Askenfelt and
// Jansson ("From touch to string vibrations", 1990-91).
//
// Timing: a page presses a key `lead` seconds before its note sounds (30 ms on
// the pages that use the grand). press() shapes that key stroke so that the
// hammer reaches the string exactly at the note, at the speed the velocity asks
// for: a loud note's key accelerates hard to the bottom, a soft one is pressed
// gently and slows. Everything after that is integrated in steps of half a
// millisecond, so the picture doesn't depend on the frame rate.
//
// Units: cm, seconds. Hammer height is measured at the crown, from where it
// rests, upward; the string is at `blow`.

export const REGULATION = {
  dip: 1.0,              // key dip at the front of the key (cm)
  blow: 4.6,             // hammer crown to string at rest (cm)
  letoffBass: 0.3,       // let-off distance from the string, bass ... treble (cm)
  letoffTreble: 0.15,
  letoffAt: 0.9,         // share of the dip where the jack lets off; the rest is aftertouch
  drop: 0.15,            // the repetition lever holds a released hammer this far below let-off (cm)
  lever: 0.3,            // how far the lever's top stands above the jack's line (cm)
  check: 1.5,            // the backcheck holds the hammer this far below the string (cm)
  checkHold: 0.8,        // key dip (share) above which the backcheck can hold it
  reset: 0.72,           // key dip (share) below which the jack is back under the knuckle
  damperStart: 0.45,     // key dip (share) where the key starts lifting its damper
  damperLift: 0.9,       // fully lifted damper, off the strings (cm)
  softShift: 0.22,       // una corda: the action slides this far to the treble (cm)
  g: 880,                // cm/s^2: gravity at the crown (most of the hammer's mass is in its head)
  gDamper: 420,          // cm/s^2: a falling damper, slowed by the lever it drags
  eString: 0.55,         // hammer rebound off the string (share of its speed)
  eRail: 0.3,            // ... off the hammer rest rail
  eDamper: 0.3,          // ... a damper off the strings
  keyReturn: 30,         // 1/s: a released key's rate back up
  leverRate: 90,         // 1/s: how fast the repetition spring lifts the hammer
  vMin: 100, vMax: 650,  // hammer speed at the string (cm/s) at velocity 0 and 1
  substep: 0.0005,       // s
}

const clamp01 = x => x < 0 ? 0 : x > 1 ? 1 : x
const smooth = (x, a, b) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t) }

// Hammer speed at the string (cm/s) for a MIDI velocity 0..1
export function hammerSpeed(velocity, R = REGULATION) {
  return R.vMin + (R.vMax - R.vMin) * Math.pow(clamp01(velocity), 1.4)
}

export function createGrandAction({ keys = 88, regulation = {}, hasDamper = k => k + 21 <= 88, onStrike = null } = {}) {
  const R = { ...REGULATION, ...regulation }
  const D = R.dip
  const blowOf = typeof R.blow === 'function' ? R.blow : () => R.blow
  const K = []
  for (let k = 0; k < keys; k++) {
    const blow = blowOf(k)
    const letoff = R.letoffBass + (R.letoffTreble - R.letoffBass) * k / Math.max(1, keys - 1)
    const letoffLift = blow - letoff
    K.push({
      k, blow, letoff, letoffLift,
      ratio: letoffLift / (R.letoffAt * D),   // hammer cm per key cm while the jack drives it
      cap: letoffLift - R.drop,               // the drop screw: highest the lever lifts the hammer
      damper: hasDamper(k),
      held: false, press: null, dip: 0,
      mode: 'jack', escaped: false, rep: false, h: 0, v: 0,
      dy: 0, dv: 0, sost: false,
      strikes: 0, lastStrike: -Infinity, strikeSpeed: 0,
      hMin: 0, hMax: 0,   // the hammer's range over the last step(), for motion blur
    })
  }
  const active = new Set()
  let now = 0, sustain = 0, soft = 0, sostenuto = false

  // the hammer's lift the jack gives at key dip d (cm), and the lever's
  const jackLine = (a, d) => a.ratio * d
  const leverLine = (a, d) => Math.min(a.ratio * d + R.lever * smooth(d / D, 0.1, 0.5), a.cap)
  const support = (a, d) => a.rep ? Math.max(jackLine(a, d), leverLine(a, d)) : jackLine(a, d)
  const checkTop = (a, d) => a.blow - R.check - a.ratio * (D - d)

  // Shape a key stroke from dip d0 (cm) so that the hammer leaves the jack at
  // the let-off dip and reaches the string after `lead` seconds at speed vT.
  // The key goes d(s) = d0 + (D - d0) s^p over T seconds, s = (t - t0) / T:
  // p > 1 accelerates into the key bed (a struck, loud note), p < 1 eases into
  // it (a pressed, soft one).
  function shape(a, d0, lead, vT) {
    const dl = R.letoffAt * D
    const flight = a.letoff
    const at = p => {
      const sl = Math.pow((dl - d0) / (D - d0), 1 / p)
      const c = a.ratio * (D - d0) * p * Math.pow(sl, p - 1)   // escape speed times T
      const T = lead / (sl + flight / c)
      return { p, T, v: c / T }
    }
    let lo = 0.35, hi = 14
    if (at(lo).v >= vT) return at(lo)
    if (at(hi).v <= vT) return at(hi)
    for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (at(m).v < vT) lo = m; else hi = m }
    return at((lo + hi) / 2)
  }

  const api = {
    regulation: R,
    keys: K,
    get now() { return now },
    get soft() { return soft * R.softShift },   // sideways shift of the hammers (cm)

    // A key goes down: its hammer strikes `lead` s from now.
    press(k, velocity = 0.7, lead = 0.03) {
      const a = K[k]; if (!a) return
      lead = Math.max(0.004, lead)
      const vT = hammerSpeed(velocity, R)
      let d0 = a.dip
      const dl = R.letoffAt * D
      if (d0 > dl - 0.15 * D) d0 = Math.max(0, dl - 0.35 * D)   // too far down to strike from: rises first
      if (a.escaped) {
        // struck again before the key rose far enough for the jack to reset by
        // itself (or straight from the backcheck): the file says the note
        // sounds, so the jack is taken as back under the knuckle
        a.escaped = false; a.rep = true
        a.mode = a.h > support(a, d0) + 1e-6 ? 'free' : 'jack'
      }
      const s = shape(a, d0, lead, vT)
      a.press = { t0: now, d0, ...s }
      a.held = true
      active.add(k)
    },
    // The key is let go (it rises from wherever it is).
    release(k) {
      const a = K[k]; if (!a) return
      a.held = false
      if (a.press) { a.dip = keyDipAt(a, now); a.press = null }
      active.add(k)
    },
    setSustain(v) { sustain = clamp01(+v) ; if (sustain > 0) for (const a of K) if (a.damper) active.add(a.k) },
    setSoft(v) { soft = clamp01(+v) },
    setSostenuto(on) {
      // its rod catches the dampers that keys hold up at this moment, not the pedal's
      if (on && !sostenuto) for (const a of K) a.sost = a.held && a.damper
      if (!on) for (const a of K) a.sost = false
      sostenuto = !!on
      for (const a of K) if (a.damper) active.add(a.k)
    },
    allUp() { for (const a of K) if (a.held) api.release(a.k) },

    step(dt) {
      dt = Math.max(0, Math.min(dt, 0.1))
      if (!dt) return
      for (const k of active) { const a = K[k]; a.hMin = a.hMax = a.h }
      let left = dt
      while (left > 1e-9) {
        const h = Math.min(R.substep, left)
        for (const k of active) stepKey(K[k], h)
        now += h; left -= h
      }
      for (const k of active) {
        const a = K[k]
        const idle = !a.held && !a.press && a.dip < 1e-5 && a.mode === 'jack' && !a.escaped && a.h < 1e-5 &&
          Math.abs(a.dy) < 1e-5 && !a.dv && !a.sost && (sustain === 0 || !a.damper)
        if (idle) { a.dip = 0; a.h = 0; a.v = 0; a.rep = false; a.dy = 0; active.delete(k) }
      }
    },

    // for the views: key dip as a share of the full dip
    dipShare: k => K[k].dip / D,
  }

  function keyDipAt(a, t) {
    const P = a.press
    const s = (t - P.t0) / P.T
    return s >= 1 ? D : s <= 0 ? P.d0 : P.d0 + (D - P.d0) * Math.pow(s, P.p)
  }

  function stepKey(a, dt) {
    const t1 = now + dt
    // the key
    let d
    if (a.press) {
      d = keyDipAt(a, t1)
      // a key struck from partway up rises to there at once (rare: a repeat
      // within a few ms); otherwise it is a continuous stroke
    } else {
      d = a.dip * Math.exp(-R.keyReturn * dt)
      if (d < 1e-6) d = 0
    }
    a.dip = d

    // the hammer
    const h0 = a.h
    switch (a.mode) {
      case 'jack': {
        const S = support(a, d)
        if (a.press || S >= a.h) a.h = S
        else a.h += (S - a.h) * (1 - Math.exp(-dt * 60))   // rides the jack and lever down with the key
        a.v = (a.h - h0) / dt
        if (a.rep && d < 0.02 * D) a.rep = false
        if (a.h >= a.letoffLift) { a.mode = 'free'; a.escaped = true }   // escapement
        break
      }
      case 'free': {
        a.v -= R.g * dt
        a.h += a.v * dt
        if (a.h >= a.blow) {
          // the string: interpolate when within the step it got there
          const f = a.v > 0 ? clamp01((a.blow - h0) / (a.h - h0)) : 0
          a.strikes++; a.lastStrike = now + f * dt; a.strikeSpeed = a.v
          if (onStrike) onStrike(a.k, a.lastStrike, a.v)
          a.h = a.blow; a.v = -R.eString * a.v
          a.hMax = a.blow
          break
        }
        if (!a.escaped) {
          // pressed again while it was in the air: the jack meets the knuckle
          const S = support(a, d)
          if (S >= a.h) { a.mode = 'jack'; a.h = S }
          break
        }
        if (a.v <= 0 && d >= R.checkHold * D && a.h <= checkTop(a, d)) {
          a.mode = 'check'; a.h = checkTop(a, d); a.v = 0   // caught in the backcheck's felt
          break
        }
        // the lever's spring is weak: with the key down it gives way under a
        // falling hammer, which the backcheck catches; it holds the hammer
        // only once the key has risen and the backcheck lets go
        const L = d < R.checkHold * D ? leverLine(a, d) : 0
        if (L > 0.01 && a.h <= L) {
          if (a.v < -5) { a.h = L; a.v = -0.1 * a.v }   // lands on the sprung lever
          else { a.mode = 'lever'; a.v = 0 }
        } else if (a.h <= 0) {
          a.h = 0
          a.v = a.v < -4 ? -R.eRail * a.v : 0             // the hammer rest rail's cushion
          if (!a.v) a.mode = 'lever'
        }
        break
      }
      case 'check': {
        a.h = checkTop(a, d); a.v = (a.h - h0) / dt
        if (d < R.checkHold * D) { a.mode = 'free'; a.v = 0 }   // released: the lever takes it
        break
      }
      case 'lever': {
        const L = Math.max(0, leverLine(a, d))
        a.h += (L - a.h) * (1 - Math.exp(-dt * R.leverRate))
        a.v = (a.h - h0) / dt
        if (d < R.reset * D) { a.escaped = false; a.rep = true; a.mode = 'jack' }   // the jack is back under
        break
      }
    }
    if (a.h < a.hMin) a.hMin = a.h
    if (a.h > a.hMax) a.hMax = a.h

    // the damper: carried up by the key's underlever, the pedal's tray, or the
    // sostenuto rod; otherwise it falls by its weight onto the strings
    if (a.damper) {
      const DL = R.damperLift
      const byKey = DL * smooth(d / D, R.damperStart, 1)
      const byTray = DL * smooth(sustain, 0.15, 1)
      const hold = Math.max(byKey, byTray, a.sost ? DL : 0)
      if (a.dy <= hold) { a.dy = hold; a.dv = 0 }
      else {
        a.dv -= R.gDamper * dt; a.dy += a.dv * dt
        if (a.dy <= hold) {
          if (hold > 0) { a.dy = hold; a.dv = 0 }
          else if (a.dv < -6) { a.dy = -a.dy * R.eDamper; a.dv = -a.dv * R.eDamper }
          else { a.dy = 0; a.dv = 0 }
        }
      }
    }
  }

  return api
}
